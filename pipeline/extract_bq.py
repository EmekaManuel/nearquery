"""Pull intents.near data from the BigQuery public NEAR dataset into a local per-chunk Parquet cache.

  python -m pipeline.extract_bq logs  --start 2026-04-01 --end 2026-10-29 --max-gb 400 [--workers 6]
  python -m pipeline.extract_bq flows --start 2026-10-01 --end 2026-10-29 --max-gb 20   (cross-check only)

Every chunk is dry-run first (free). A chunk already in the cache is never queried again, and the run
stops before exceeding --max-gb of estimated scan. Dry-run estimates for clustered tables are upper bounds.
"""
import argparse
import datetime as dt
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from google.cloud import bigquery

from pipeline import config
from pipeline.parse_events import parse_day

LOCK = threading.Lock()

FLOWS_SQL = f"""
SELECT block_date, block_timestamp_utc, contract_account_id, affected_account_id, involved_account_id,
       delta_amount, cause, status, event_memo, receipt_id
FROM `{config.BQ_DATASET}.ft_events`
WHERE affected_account_id = '{config.INTENTS_ACCOUNT}' AND block_date BETWEEN @a AND @b
"""

LOGS_SQL = f"""
SELECT block_date, block_timestamp_utc, receipt_id, logs, tokens_burnt, gas_burnt, status
FROM `{config.BQ_DATASET}.execution_outcomes`
WHERE executor_account_id = '{config.INTENTS_ACCOUNT}' AND block_date = @a
"""


def client() -> bigquery.Client:
    if not config.BQ_PROJECT:
        sys.exit("Set GOOGLE_CLOUD_PROJECT (see .env.example) and run `gcloud auth application-default login`.")
    return bigquery.Client(project=config.BQ_PROJECT)


def job_config(a: dt.date, b: dt.date | None, dry: bool) -> bigquery.QueryJobConfig:
    params = [bigquery.ScalarQueryParameter("a", "DATE", a)]
    if b is not None:
        params.append(bigquery.ScalarQueryParameter("b", "DATE", b))
    return bigquery.QueryJobConfig(query_parameters=params, dry_run=dry, use_query_cache=False)


def month_chunks(start: dt.date, end: dt.date):
    cur = start
    while cur <= end:
        nxt = (cur.replace(day=1) + dt.timedelta(days=32)).replace(day=1)
        yield cur, min(nxt - dt.timedelta(days=1), end)
        cur = nxt


def day_chunks(start: dt.date, end: dt.date):
    cur = start
    while cur <= end:
        yield cur
        cur += dt.timedelta(days=1)


def ledger(kind: str, chunk: str, est_gb: float, billed_gb: float, rows: int) -> None:
    path = config.RAW / "_ledger.csv"
    new = not path.exists()
    with open(path, "a") as f:
        if new:
            f.write("ts_utc,kind,chunk,est_gb,billed_gb,rows\n")
        f.write(f"{dt.datetime.now(dt.UTC).isoformat(timespec='seconds')},{kind},{chunk},{est_gb:.2f},{billed_gb:.2f},{rows}\n")


def pull_chunk(bq, kind: str, a: dt.date, b: dt.date | None, name: str, est: float) -> float:
    sql = FLOWS_SQL if kind == "flows" else LOGS_SQL
    t0 = time.time()
    job = bq.query(sql, job_config=job_config(a, b, False))
    df = job.to_dataframe()
    billed = (job.total_bytes_billed or 0) / 1e9
    df["block_date"] = df["block_date"].astype(str)
    if kind == "flows":
        df["block_timestamp_utc"] = df["block_timestamp_utc"].dt.tz_localize(None)
        done = config.RAW / "flows" / f"{name}.parquet"
        done.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(done)
    else:
        tables = parse_day(df)
        for t, tdf in tables.items():
            if t in ("swaps", "mt") and len(tdf):
                tdf["ts"] = tdf["ts"].dt.tz_localize(None)
            p = config.RAW / t / f"{name}.parquet"
            p.parent.mkdir(parents=True, exist_ok=True)
            if t != "outcomes":  # outcomes is written last and doubles as the done-marker
                tdf.to_parquet(p)
        tables["outcomes"].to_parquet(config.RAW / "outcomes" / f"{name}.parquet")
    with LOCK:
        ledger(kind, name, est, billed, len(df))
    print(f"{kind} {name}: rows={len(df):,} billed={billed:.2f} GB (est {est:.1f}) {time.time() - t0:.0f}s", flush=True)
    return billed


def run(kind: str, start: dt.date, end: dt.date, max_gb: float, workers: int) -> None:
    bq = client()
    chunks = list(month_chunks(start, end)) if kind == "flows" else [(d, None) for d in day_chunks(start, end)]
    reserved = 0.0  # estimated GB of chunks already submitted this run

    def task(a, b):
        nonlocal reserved
        name = f"{a:%Y-%m}" if kind == "flows" else f"{a}"
        done = config.RAW / ("flows" if kind == "flows" else "outcomes") / f"{name}.parquet"
        if done.exists():
            return 0.0
        sql = FLOWS_SQL if kind == "flows" else LOGS_SQL
        est = bq.query(sql, job_config=job_config(a, b, True)).total_bytes_processed / 1e9
        with LOCK:
            if reserved + est > max_gb:
                print(f"SKIP {name}: est {est:.1f} GB would exceed --max-gb {max_gb} (reserved {reserved:.1f})", flush=True)
                return 0.0
            reserved += est
        return pull_chunk(bq, kind, a, b, name, est)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        billed = sum(ex.map(lambda ab: task(*ab), chunks))
    print(f"done: billed {billed:.1f} GB this run", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["flows", "logs"])
    ap.add_argument("--start", type=dt.date.fromisoformat, required=True)
    ap.add_argument("--end", type=dt.date.fromisoformat, required=True)
    ap.add_argument("--max-gb", type=float, required=True)
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    run(a.kind, a.start, a.end, a.max_gb, a.workers)

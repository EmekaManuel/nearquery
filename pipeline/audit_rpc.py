"""Spot-audit the on-chain cache against a second, independent read of the chain.

  python -m pipeline.audit_rpc              (needs the raw swap cache and internet; about a minute; read-only)

Takes a seeded random sample of receipts from the cache, spread evenly over the months, re-reads each one from FastNEAR's
free transaction API (a different indexer from BigQuery), parses the `token_diff` logs of that receipt's execution outcome
with the same parser, and compares account, per-asset amounts, fees and success against what the cache holds.
Writes data/metrics/rpc_audit.csv: one row per receipt (public receipt ids and a match flag, nothing else).

What it shows: the extraction and parsing are faithful to the chain for the sampled receipts. What it does not show: that
the cache contains every receipt (completeness) or that DefiLlama's totals are right. It is a spot check, not a proof.
"""
import argparse
import json
import time

import pandas as pd
import requests

from pipeline import config
from pipeline.parse_events import PREFIX

URL = "https://tx.main.fastnear.com/v0/receipt"
OUT = config.ROOT / "data" / "metrics" / "rpc_audit.csv"


def chain_legs(payload: dict, receipt_id: str) -> tuple[list[tuple[str, dict, dict]], bool] | None:
    """(legs, failed) for one receipt from a FastNEAR transaction payload, or None if the receipt is not in it.

    legs: (account_id, diff, fees_collected) per token_diff entry, in log order."""
    for r in payload.get("transaction", {}).get("receipts", []):
        eo = r.get("execution_outcome", {})
        if eo.get("id") != receipt_id:
            continue
        out = eo.get("outcome", {})
        legs = []
        for line in out.get("logs", []):
            if not line.startswith(PREFIX):
                continue
            ev = json.loads(line[len(PREFIX):])
            if ev.get("event") == "token_diff":
                legs += [(d.get("account_id"), d.get("diff", {}), d.get("fees_collected", {})) for d in ev.get("data", [])]
        status = out.get("status", {})
        return legs, not (isinstance(status, dict) and ("SuccessValue" in status or "SuccessReceiptId" in status))
    return None


def compare(cache_rows: pd.DataFrame, found: tuple | None) -> str:
    """'match' or the reason it differs. cache_rows: the cached token_diff rows (account_id, diff, fees, failed) of one receipt."""
    if found is None:
        return "receipt not found on chain"
    legs, failed = found
    mine = sorted((r.account_id, json.dumps(json.loads(r.diff), sort_keys=True), json.dumps(json.loads(r.fees), sort_keys=True)) for r in cache_rows.itertuples())
    chain = sorted((a, json.dumps(d, sort_keys=True), json.dumps(f, sort_keys=True)) for a, d, f in legs)
    if len(mine) != len(chain):
        return f"leg count differs: cache {len(mine)}, chain {len(chain)}"
    if mine != chain:
        return "amounts, accounts or fees differ"
    if bool(cache_rows.failed.iloc[0]) != failed:
        return "success flag differs"
    return "match"


def sample(per_month: int, seed: int) -> pd.DataFrame:
    """Seeded sample of cached receipts, `per_month` from each month."""
    files = sorted((config.RAW / "swaps").glob("*.parquet"))
    rng = pd.Series(range(len(files))).sample(frac=1, random_state=seed).tolist()
    picked, seen = [], {}
    for i in rng:  # a random day per pick, month-balanced
        m = files[i].stem[:7]
        if seen.get(m, 0) >= per_month:
            continue
        d = pd.read_parquet(files[i])
        if d.empty:
            continue
        rid = d.receipt_id.drop_duplicates().sample(1, random_state=seed + i).iloc[0]
        picked.append((files[i].stem, rid))
        seen[m] = seen.get(m, 0) + 1
    return pd.DataFrame(picked, columns=["day", "receipt_id"]).sort_values("day").reset_index(drop=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-month", type=int, default=6)
    ap.add_argument("--seed", type=int, default=20261114)
    a = ap.parse_args()
    s = sample(a.per_month, a.seed)
    rows = []
    for day, rid in s.itertuples(index=False):
        cache = pd.read_parquet(config.RAW / "swaps" / f"{day}.parquet")
        cache = cache[cache.receipt_id == rid]
        try:
            payload = requests.post(URL, json={"receipt_id": rid}, timeout=30).json()
            res = compare(cache, chain_legs(payload, rid))
        except Exception as e:  # network or shape problems are reported, never hidden
            res = f"fetch error: {type(e).__name__}"
        rows.append({"day": day, "receipt_id": rid, "legs": len(cache), "result": res})
        print(f"{day} {rid[:10]}.. {res}", flush=True)
        time.sleep(0.4)
    out = pd.DataFrame(rows)
    out.to_csv(OUT, index=False)
    print(f"{(out.result == 'match').sum()} of {len(out)} match; wrote {OUT.name}")


if __name__ == "__main__":
    main()

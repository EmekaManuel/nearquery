"""The extraction path, offline: log parsing, chunking, the cost guards and the cache, with BigQuery mocked."""
import datetime as dt
import json

import pandas as pd
import pytest

from pipeline import config, extract_bq
from pipeline.parse_events import YOCTO, log_lines, parse_day

EV = "EVENT_JSON:"


def ev(std, name, data):
    return EV + json.dumps({"standard": std, "version": "1.0.0", "event": name, "data": data})


def outcomes(rows):
    """rows: (receipt_id, status, logs) -> a frame shaped like BigQuery execution_outcomes for one day."""
    n = len(rows)
    return pd.DataFrame({
        "block_date": ["2026-05-01"] * n,
        "block_timestamp_utc": pd.to_datetime(["2026-05-01T12:00:00Z"] * n, utc=True),
        "receipt_id": [r[0] for r in rows], "status": [r[1] for r in rows], "logs": [r[2] for r in rows],
        "tokens_burnt": [str(int(1e24))] * n, "gas_burnt": ["1000"] * n,
    })


SWAP = ev("intents", "token_diff", [
    {"account_id": "alice.near", "diff": {"nep141:usdc": "100"}, "intent_hash": "h1", "fees_collected": {}},
    {"account_id": "solver.near", "diff": {"nep141:usdc": "-100"}, "intent_hash": "h1", "fees_collected": {"nep141:usdc": "1"}},
])
MINT = ev("nep245", "mt_mint", [{"owner_id": "alice.near", "token_ids": ["nep141:usdc"], "amounts": ["100"], "memo": "deposit"}])


def test_log_lines_accepts_every_shape_bigquery_returns():
    assert log_lines(None) == [] and log_lines({"list": None}) == []
    assert log_lines({"list": [{"element": "a"}, {"element": "b"}]}) == ["a", "b"]
    assert log_lines(["a", "b"]) == ["a", "b"]


def test_parse_day_extracts_swaps_mints_counts_and_outcome_totals():
    df = outcomes([
        ("r1", "SUCCESS", {"list": [{"element": SWAP}, {"element": "not an event"}]}),
        ("r2", "FAILURE", {"list": [{"element": SWAP}]}),
        ("r3", "SUCCESS", {"list": [{"element": MINT}, {"element": EV + "{broken"}]}),
        ("r4", "SUCCESS", None),
    ])
    t = parse_day(df)
    assert len(t["swaps"]) == 4  # two legs in each of two token_diff events
    assert t["swaps"].groupby("receipt_id").failed.first().to_dict() == {"r1": False, "r2": True}
    assert set(t["swaps"].account_id) == {"alice.near", "solver.near"}
    assert json.loads(t["swaps"].fees.iloc[1]) == {"nep141:usdc": "1"}
    assert len(t["mt"]) == 1 and t["mt"].event.iloc[0] == "mt_mint" and t["mt"].memo.iloc[0] == "deposit"
    counts = {(r.standard, r.event, r.failed): r.n for r in t["events"].itertuples()}
    assert counts[("intents", "token_diff", False)] == 1 and counts[("intents", "token_diff", True)] == 1
    assert counts[("?", "BAD_JSON", False)] == 1, "malformed JSON is counted, not dropped silently or fatal"
    o = t["outcomes"].iloc[0]
    assert o.n_outcomes == 4 and o.n_failed == 1 and o.block_date == "2026-05-01"
    assert o.tokens_burnt_near == pytest.approx(4 * 1e24 / YOCTO)


def test_parse_day_ignores_other_standards_and_non_list_data():
    odd = [EV + json.dumps({"standard": "nep141", "event": "ft_transfer", "data": [{"x": 1}]}),
           EV + json.dumps({"standard": "intents", "event": "token_diff", "data": {"not": "a list"}})]
    t = parse_day(outcomes([("r1", "SUCCESS", {"list": [{"element": e} for e in odd]})]))
    assert t["swaps"].empty and t["mt"].empty


def test_parse_day_handles_an_empty_day():
    t = parse_day(outcomes([]))
    assert t["swaps"].empty and t["outcomes"].iloc[0].n_outcomes == 0


def test_chunking_covers_the_range_exactly_once():
    d = lambda s: dt.date.fromisoformat(s)
    assert list(extract_bq.day_chunks(d("2026-02-27"), d("2026-03-02"))) == [d("2026-02-27"), d("2026-02-28"), d("2026-03-01"), d("2026-03-02")]
    assert list(extract_bq.month_chunks(d("2026-01-15"), d("2026-03-10"))) == [
        (d("2026-01-15"), d("2026-01-31")), (d("2026-02-01"), d("2026-02-28")), (d("2026-03-01"), d("2026-03-10"))]
    assert list(extract_bq.month_chunks(d("2026-12-20"), d("2027-01-05"))) == [(d("2026-12-20"), d("2026-12-31")), (d("2027-01-01"), d("2027-01-05"))]


def test_the_dry_run_flag_and_cache_settings():
    live = extract_bq.job_config(dt.date(2026, 5, 1), None, False)
    dry = extract_bq.job_config(dt.date(2026, 5, 1), dt.date(2026, 5, 31), True)
    assert live.dry_run is False and dry.dry_run is True
    assert live.use_query_cache is False, "cache hits would hide the true cost"
    assert [p.name for p in live.query_parameters] == ["a"] and [p.name for p in dry.query_parameters] == ["a", "b"]


class FakeJob:
    def __init__(self, gb, df=None):
        self.total_bytes_processed = int(gb * 1e9)
        self.total_bytes_billed = int(gb * 1e9)
        self._df = df

    def to_dataframe(self):
        return self._df


class FakeBQ:
    """Records every query. Dry runs report `gb`; real runs return one day of outcomes."""
    def __init__(self, gb):
        self.gb, self.calls = gb, []

    def query(self, sql, job_config):
        self.calls.append("dry" if job_config.dry_run else "real")
        df = None if job_config.dry_run else outcomes([("r1", "SUCCESS", {"list": [{"element": SWAP}, {"element": MINT}]})])
        return FakeJob(self.gb, df)


@pytest.fixture
def cache(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "RAW", tmp_path)
    return tmp_path


def test_run_writes_the_cache_and_a_ledger_and_never_requeries_a_cached_day(cache, monkeypatch):
    bq = FakeBQ(gb=2.0)
    monkeypatch.setattr(extract_bq, "client", lambda: bq)
    extract_bq.run("logs", dt.date(2026, 5, 1), dt.date(2026, 5, 1), max_gb=10, workers=1)
    for t in ("swaps", "mt", "events", "outcomes"):
        assert (cache / t / "2026-05-01.parquet").exists(), t
    ledger = pd.read_csv(cache / "_ledger.csv")
    assert list(ledger.chunk) == ["2026-05-01"] and ledger.billed_gb.iloc[0] == 2.0
    assert len(pd.read_parquet(cache / "swaps" / "2026-05-01.parquet")) == 2
    assert bq.calls == ["dry", "real"]
    extract_bq.run("logs", dt.date(2026, 5, 1), dt.date(2026, 5, 1), max_gb=10, workers=1)
    assert bq.calls == ["dry", "real"], "a cached day must cost nothing"


def test_run_refuses_to_exceed_the_budget(cache, monkeypatch, capsys):
    bq = FakeBQ(gb=6.0)
    monkeypatch.setattr(extract_bq, "client", lambda: bq)
    extract_bq.run("logs", dt.date(2026, 5, 1), dt.date(2026, 5, 3), max_gb=10, workers=1)
    assert bq.calls.count("real") == 1, "only one 6 GB day fits in a 10 GB budget"
    assert capsys.readouterr().out.count("SKIP") == 2
    assert len(list((cache / "outcomes").glob("*.parquet"))) == 1


def test_a_missing_project_stops_before_any_query(monkeypatch):
    monkeypatch.setattr(config, "BQ_PROJECT", "")
    with pytest.raises(SystemExit):
        extract_bq.client()

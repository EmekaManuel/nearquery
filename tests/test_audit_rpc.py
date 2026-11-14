"""The RPC spot audit: its comparison logic on synthetic payloads, and the committed result file. Offline."""
import json

import pandas as pd

from pipeline import config
from pipeline.audit_rpc import chain_legs, compare

RID = "R1"
DIFF = {"nep141:a.near": "100", "nep141:b.near": "-90"}


def payload(logs, status=None, rid=RID):
    return {"transaction": {"receipts": [
        {"execution_outcome": {"id": "other", "outcome": {"logs": [], "status": {"SuccessValue": ""}}}},
        {"execution_outcome": {"id": rid, "outcome": {"logs": logs, "status": status or {"SuccessValue": ""}}}}]}}


def event(accounts):
    return "EVENT_JSON:" + json.dumps({"standard": "dip4", "event": "token_diff", "data": [
        {"intent_hash": "h", "account_id": a, "diff": d, "fees_collected": f} for a, d, f in accounts]})


def cache(rows, failed=False):
    return pd.DataFrame([{"account_id": a, "diff": json.dumps(d), "fees": json.dumps(f), "failed": failed} for a, d, f in rows])


LEGS = [("user.near", DIFF, {}), ("solver.near", {"nep141:a.near": "-100", "nep141:b.near": "91"}, {"nep141:b.near": "1"})]


def test_identical_receipt_matches_regardless_of_leg_order():
    p = payload([event(LEGS)])
    assert compare(cache(LEGS[::-1]), chain_legs(p, RID)) == "match"


def test_a_changed_amount_is_reported():
    p = payload([event(LEGS)])
    altered = [LEGS[0], ("solver.near", {"nep141:a.near": "-101", "nep141:b.near": "91"}, {"nep141:b.near": "1"})]
    assert compare(cache(altered), chain_legs(p, RID)) == "amounts, accounts or fees differ"


def test_a_missing_leg_is_reported():
    assert compare(cache(LEGS[:1]), chain_legs(payload([event(LEGS)]), RID)).startswith("leg count differs")


def test_a_receipt_absent_from_the_payload_is_reported():
    assert chain_legs(payload([event(LEGS)]), "nope") is None
    assert compare(cache(LEGS), None) == "receipt not found on chain"


def test_failure_status_is_compared():
    p = payload([event(LEGS)], status={"Failure": {}})
    assert compare(cache(LEGS, failed=False), chain_legs(p, RID)) == "success flag differs"
    assert compare(cache(LEGS, failed=True), chain_legs(p, RID)) == "match"


def test_committed_audit_matches_and_spans_the_year():
    a = pd.read_csv(config.ROOT / "data" / "metrics" / "rpc_audit.csv")
    assert list(a.columns) == ["day", "receipt_id", "legs", "result"]
    assert len(a) >= 30 and a.receipt_id.is_unique
    assert a.day.str[:7].nunique() >= 9, "sample should cover the months"
    assert (a.result == "match").all(), a[a.result != "match"].to_string()

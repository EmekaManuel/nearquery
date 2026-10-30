"""Parse intents.near execution-outcome logs (NEP-297 EVENT_JSON lines) into flat tables.

One outcome row from BigQuery `execution_outcomes` has a `logs` struct ({"list": [...]}) of strings.
We keep only what the metrics need: token_diff legs (swaps), mt_mint/mt_burn (NEP-245 deposits and
withdrawals), per-day event counts, and per-day outcome and burn totals.
"""
import json
from collections import Counter

import pandas as pd

PREFIX = "EVENT_JSON:"
YOCTO = 1e24


def log_lines(logs) -> list[str]:
    if logs is None:
        return []
    inner = logs.get("list") if isinstance(logs, dict) else logs
    if inner is None:
        return []
    return [e.get("element") if isinstance(e, dict) else e for e in inner]


def parse_day(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """df: one day of execution_outcomes rows (block_date, block_timestamp_utc, receipt_id, logs,
    tokens_burnt, gas_burnt, status)."""
    swaps, mt, counts = [], [], Counter()
    for ts, rid, status, logs in zip(df.block_timestamp_utc, df.receipt_id, df.status, df.logs):
        failed = status == "FAILURE"
        for line in log_lines(logs):
            if not line or not line.startswith(PREFIX):
                continue
            try:
                ev = json.loads(line[len(PREFIX):])
            except json.JSONDecodeError:
                counts[("?", "BAD_JSON", failed)] += 1
                continue
            std, name = ev.get("standard"), ev.get("event")
            counts[(std, name, failed)] += 1
            data = ev.get("data")
            if not isinstance(data, list):
                continue
            if name == "token_diff":
                for d in data:
                    swaps.append((ts, rid, failed, d.get("intent_hash"), d.get("account_id"),
                                  json.dumps(d.get("diff", {})), json.dumps(d.get("fees_collected", {}))))
            elif name in ("mt_mint", "mt_burn") and std == "nep245":
                for d in data:
                    mt.append((ts, rid, failed, name, d.get("owner_id"),
                               json.dumps(d.get("token_ids", [])), json.dumps(d.get("amounts", [])), d.get("memo")))

    day = str(df.block_date.iloc[0]) if len(df) else None
    return {
        "swaps": pd.DataFrame(swaps, columns=["ts", "receipt_id", "failed", "intent_hash", "account_id", "diff", "fees"]),
        "mt": pd.DataFrame(mt, columns=["ts", "receipt_id", "failed", "event", "owner_id", "token_ids", "amounts", "memo"]),
        "events": pd.DataFrame(
            [(day, s, n, f, c) for (s, n, f), c in counts.items()],
            columns=["block_date", "standard", "event", "failed", "n"]),
        "outcomes": pd.DataFrame([{
            "block_date": day,
            "n_outcomes": len(df),
            "n_failed": int((df.status == "FAILURE").sum()),
            "tokens_burnt_near": float(df.tokens_burnt.astype(float).sum()) / YOCTO,
            "gas_burnt": float(df.gas_burnt.astype(float).sum()),
        }]),
    }

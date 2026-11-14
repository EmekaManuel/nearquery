"""Runs the real DuckDB SQL (00_setup, daily volume, wash screen) on a tiny synthetic cache with known answers."""
import json
import sys

import pandas as pd
import pytest

from pipeline import config, metrics

USDC, ETH = "nep141:usdc", "nep141:eth"
SOLVER = "solver.near"
TS = pd.Timestamp("2026-05-01 12:00:00")


def swap_rows(rid, user, usdc_out, eth_in):
    """One user<->solver swap: the user pays `usdc_out` USD of USDC for `eth_in` USD of ETH (or the reverse if negative)."""
    u_usdc, u_eth = int(-usdc_out * 1e6), int(eth_in / 2000 * 1e18)
    mk = lambda acct, a, b: dict(ts=TS, receipt_id=rid, failed=False, intent_hash=f"h{rid}", account_id=acct,
                                 diff=json.dumps({USDC: str(a), ETH: str(b)}), fees="{}")
    return [mk(user, u_usdc, u_eth), mk(SOLVER, -u_usdc, -u_eth)]


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("sql")
    raw, ref, mets = tmp / "raw", tmp / "ref", tmp / "metrics"
    (raw / "swaps").mkdir(parents=True), (raw / "mt").mkdir(), ref.mkdir()
    rows, n = [], 0

    def swap(user, usdc_out, eth_in):
        nonlocal n
        n += 1
        rows.extend(swap_rows(f"r{n}", user, usdc_out, eth_in))

    swap("roundtrip.near", 100, 100)    # USDC -> ETH ...
    swap("roundtrip.near", -100, -100)  # ... and back, the same day: churn 1
    swap("oneway.near", 100, 100)       # a single one-way swap: churn 0
    for _ in range(50):
        swap("bot.near", 10, 10)        # 50 swaps in a day: bot-like cadence
    for i in range(100):
        swap(f"user{i:03d}.near", 10, 10)  # 100 distinct counterparties make SOLVER a solver
    pd.DataFrame(rows).to_parquet(raw / "swaps" / "2026-05-01.parquet")
    pd.DataFrame({"ts": [TS], "receipt_id": ["m1"], "failed": [False], "event": ["mt_mint"], "owner_id": ["x.near"],
                  "token_ids": ['["nep141:usdc"]'], "amounts": ['["1"]'], "memo": ["deposit"]}).to_parquet(raw / "mt" / "2026-05-01.parquet")
    meta = {USDC: dict(symbol="USDC", decimals=6, origin_chain="near", price_key="USD"),
            ETH: dict(symbol="ETH", decimals=18, origin_chain="ethereum", price_key="eth")}
    (ref / "meta.json").write_text(json.dumps(meta))
    pd.DataFrame({"price_key": ["eth"], "date": ["2025-01-01"], "price": [2000.0]}).to_csv(ref / "prices.csv", index=False)

    mp = pytest.MonkeyPatch()
    mp.setattr(config, "RAW", raw)
    mp.setattr(metrics, "OUT", mets)
    mp.setattr(metrics, "META_PATH", ref / "meta.json")
    mp.setattr(metrics, "PRICES_PATH", ref / "prices.csv")
    mp.setattr(sys, "argv", ["metrics", "daily_volume", "wash_screen"])
    metrics.main()
    mp.undo()
    return {"vol": pd.read_csv(mets / "daily_volume.csv").iloc[0], "wash": pd.read_csv(mets / "wash_screen.csv").iloc[0]}


def test_daily_volume_matches_the_hand_computed_answer(out):
    swaps_usd = 100 + 100 + 100 + 50 * 10 + 100 * 10  # 1800 USD changes hands
    assert out["vol"].leg_sum_usd == pytest.approx(2 * swaps_usd)
    assert out["vol"].net_swap_usd == pytest.approx(swaps_usd)
    assert out["vol"].intents == 2 + 1 + 50 + 100  # one intent hash per swap
    assert out["vol"].swap_receipts == 153


def test_wash_screen_finds_the_bot_and_the_round_trip(out):
    w = out["wash"]
    assert w.user_volume_usd == pytest.approx(1800)       # the solver is excluded as a solver
    assert w.high_frequency_usd == pytest.approx(500)     # bot.near: 50 swaps in a day
    assert w.round_trip_usd == pytest.approx(200, rel=1e-6)  # roundtrip.near: churn 1 on 200 USD
    assert w.filtered_volume_usd == pytest.approx(1100)
    assert w.kept_share == pytest.approx(1100 / 1800)
    assert w.bot_like_account_days == 1

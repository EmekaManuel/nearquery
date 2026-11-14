"""Invariants of the committed metric snapshots (offline, no network, no BigQuery)."""
import pandas as pd
import pytest

from pipeline import config

M = config.ROOT / "data" / "metrics"
rd = lambda n, **kw: pd.read_csv(M / f"{n}.csv", **kw)


def test_daily_volume_is_sane():
    v = rd("daily_volume", parse_dates=["date"])
    assert v.date.is_unique and v.date.is_monotonic_increasing
    assert (v.leg_sum_usd > 0).all() and (v.intents > 0).all()
    assert ((v.net_swap_usd / v.leg_sum_usd - 0.5).abs() < 0.02).all(), "net swap volume should be half the leg-sum"
    full = pd.date_range(v.date.min(), v.date.max())
    assert len(full) == v.date.nunique(), "cache has missing days"


def test_solver_shares_are_ordered_probabilities():
    s = rd("solver_concentration")
    assert ((s.top1_share <= s.top3_share) & (s.top3_share <= s.top5_share) & (s.top5_share <= 1)).all()


def test_wash_screen_parts_add_up():
    w = rd("wash_screen")
    assert ((w.kept_share + w.high_frequency_share + w.round_trip_share - 1).abs() < 1e-6).all()
    assert (w[["high_frequency_share", "round_trip_share", "kept_share"]].ge(0).all()).all()
    assert ((w.filtered_volume_usd / (w.user_volume_usd - w.high_frequency_usd - w.round_trip_usd) - 1).abs() < 1e-6).all()
    assert (w.high_frequency_share < 0.1).all(), "a screen that removes 10%+ of volume needs a closer look"


def test_reconciliation_supports_the_documented_claim():
    r = rd("reconciliation", index_col=0)["value"]
    assert r["window_end"] < "2026-07-07", "reconciliation must stop before Confidential Intents launched"
    assert abs(1 - float(r["public_over_reported"])) < 0.02
    assert float(r["daily_correlation"]) > 0.99
    assert float(r["priced_only_over_reported"]) < float(r["public_over_reported"]), "imputation should add volume"


def test_confidential_residual_is_near_zero_before_the_break_and_not_after():
    brk = rd("confidential_break", index_col=0)["value"]
    w = rd("confidential_weekly", parse_dates=["week_start"])
    assert (w.days == 7).all()
    before = w[w.week_start < pd.Timestamp(brk["break_date"]) - pd.Timedelta(days=7)]
    after = w[w.week_start >= pd.Timestamp(brk["break_date"])]
    assert before.implied_confidential_share.abs().max() < 0.1
    assert after.implied_confidential_share.min() > 0.1
    assert float(brk["share_14d_before"]) < 0.02 < 0.05 < float(brk["share_14d_after"])


def test_peer_fees_publish_only_derived_ratios():
    p = rd("peer_fees")
    assert list(p.columns) == ["protocol", "category", "fees_per_1m_usd"], "only the ratio may be published (DefiLlama terms)"
    assert "NEAR Intents" in set(p.protocol) and len(p) >= 3 and (p.fees_per_1m_usd > 0).all()


def test_raw_third_party_series_are_never_tracked():
    ignore = (config.ROOT / ".gitignore").read_text()
    for f in ("data/reference/prices.csv", "data/reference/defillama_near_intents.csv", ".env", "data/raw/"):
        assert f in ignore, f"{f} must be gitignored"


def test_account_counts_are_flagged_as_not_users():
    a = rd("account_quality", index_col=0)
    assert float(a.loc["implicit_hex", "share_one_day"]) > 0.9

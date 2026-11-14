"""The value-capture model: the formula the dashboard sliders reuse."""
import pandas as pd
import pytest

from pipeline import config

M = config.ROOT / "data" / "metrics"


@pytest.fixture(scope="module")
def obs():
    return pd.read_csv(M / "model_observed.csv", index_col=0)["value"]


@pytest.fixture(scope="module")
def scen():
    return pd.read_csv(M / "model_scenarios.csv")


def test_one_x_current_row_equals_the_observed_yield(obs, scen):
    r = scen[(scen.take_rate_case == "current_observed") & (scen.volume_multiple == 1) & (scen.near_price_multiple == 1)].iloc[0]
    assert r.annual_buyback_usd == pytest.approx(float(obs["annualized_revenue_usd"]), rel=1e-6)
    assert r.buyback_pct_of_mcap == pytest.approx(float(obs["annualized_buyback_yield_on_mcap"]), rel=1e-6)


def test_buyback_scales_linearly_with_volume(scen):
    cur = scen[(scen.take_rate_case == "current_observed") & (scen.near_price_multiple == 1)].set_index("volume_multiple")
    base = cur.loc[1, "annual_buyback_usd"]
    for x, row in cur.iterrows():
        assert row.annual_buyback_usd == pytest.approx(base * x, rel=1e-6)


def test_dashboard_sliders_use_the_same_formula():
    ts = (config.ROOT / "dashboard" / "components" / "ScenarioExplorer.tsx").read_text()
    assert "const buyback = o.revenueAnnual * v.vol * v.take" in ts
    assert "const yld = buyback / (o.marketCap * v.px)" in ts


def test_captured_revenue_cannot_exceed_gross_fees(obs):
    assert 0 < float(obs["captured_share_of_gross_fees"]) <= 1
    assert float(obs["captured_revenue_usd"]) <= float(obs["gross_fees_usd"]) + 1e-6

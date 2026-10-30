"""Emit the dashboard data contract (dashboard/data/dashboard.json) from committed metric snapshots.

  python -m dashboard.build      (then `npm run build` in dashboard/ renders the static site)

Cache gaps are emitted as nulls so charts show gaps, not zeros. No raw DefiLlama series is included
(ToS 8(7)); only derived aggregates.
"""
import json
import shutil

import pandas as pd

from pipeline import config

M = config.ROOT / "data" / "metrics"
REF = config.ROOT / "data" / "reference"
OUT = config.ROOT / "dashboard" / "data"
PUBLIC = config.ROOT / "dashboard" / "public" / "data"
BRAND = config.ROOT / "brand"
PUBLIC_BRAND = config.ROOT / "dashboard" / "public" / "brand"
# derived metric CSVs offered for download on chart pages (never raw third-party series)
DOWNLOADS = ["daily_volume", "solver_concentration", "user_stickiness", "account_quality", "near_touch", "chain_pairs", "model_scenarios", "model_observed"]


def main() -> None:
    vol = pd.read_csv(M / "daily_volume.csv", parse_dates=["date"])
    cutoff = vol["date"].max() - pd.Timedelta(days=1)  # newest cache day is partial
    vol = vol[vol["date"] <= cutoff].set_index("date")
    days = pd.date_range(vol.index.min(), cutoff)
    nn = lambda x: None if pd.isna(x) else float(x)
    daily = [{"date": d.date().isoformat(),
              "legSum": nn(vol["leg_sum_usd"].get(d)), "netSwap": nn(vol["net_swap_usd"].get(d)),
              "intents": nn(vol["intents"].get(d)),
              "usdPerIntent": nn(vol["leg_sum_usd"].get(d) / vol["intents"].get(d)) if d in vol.index else None}
             for d in days]
    months = [d.date().isoformat() for d in pd.date_range(vol.index.min().replace(day=1), cutoff, freq="MS")]

    def full(name):  # every month on the axis; months with < 28 covered days become gaps, not interpolated lines
        t = pd.read_csv(M / f"{name}.csv")
        return t[t.days_covered >= 28].set_index("month").reindex(months)

    sol, stick, touch = full("solver_concentration"), full("user_stickiness"), full("near_touch")
    monthly = [{"month": m, "top1": nn(sol.top1_share[m]), "top5": nn(sol.top5_share[m]),
                "solvers": nn(sol.active_solvers[m]), "users": nn(stick.users[m]),
                "repeatPct": nn(stick.share_2plus_days[m] * 100), "nearTouchPct": nn(touch.near_touching_share[m] * 100)}
               for m in months]
    pairs = pd.read_csv(M / "chain_pairs.csv")
    last_m = pairs[pairs.days_covered >= 28].month.max()
    top = (pairs[pairs.month == last_m].assign(pair=lambda d: d.sold_chain + " → " + d.bought_chain)
           .nlargest(10, "usd")[["pair", "usd"]])
    obs = pd.read_csv(M / "model_observed.csv", index_col=0)["value"]
    scen = pd.read_csv(M / "model_scenarios.csv")
    acct = pd.read_csv(M / "account_quality.csv").set_index("fmt")
    f = lambda k: float(obs[k])
    data = {
        "meta": {"cutoff": cutoff.date().isoformat(), "cacheStart": days[0].date().isoformat(),
                 "windowStart": str(obs["window_start"]), "windowEnd": str(obs["window_end"]),
                 "generated": pd.Timestamp.now("UTC").strftime("%Y-%m-%d")},
        "daily": daily, "monthly": monthly,
        "flows": {"month": str(last_m), "rows": [{"pair": r.pair, "usd": float(r.usd)} for r in top.itertuples()]},
        "obs": {"netSwap30d": f("pipeline_public_net_swap_usd"), "legSum30d": f("pipeline_public_legsum_usd"),
                "confidentialShare": f("implied_confidential_share"), "grossBps": f("gross_fee_bps_of_reported_volume"),
                "capturedBps": f("captured_bps_of_reported_volume"), "capturedShare": f("captured_share_of_gross_fees"),
                "revenueAnnual": f("annualized_revenue_usd"), "buybackYield": f("annualized_buyback_yield_on_mcap"),
                "gasBurnAnnual": f("annualized_gas_burn_usd"), "nearPrice": f("near_price_usd"), "marketCap": f("near_mcap_usd")},
        "scenarios": [{"case": r.take_rate_case, "volumeMultiple": float(r.volume_multiple), "annualBuyback": float(r.annual_buyback_usd),
                       "pctOfMarketCap": float(r.buyback_pct_of_mcap), "takeBps": float(r.take_bps)} for r in scen.itertuples()],
        "accounts": {"implicitOneDayShare": float(acct.loc["implicit_hex", "share_one_day"]),
                     "implicitAccounts": int(acct.loc["implicit_hex", "accounts"])},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "dashboard.json").write_text(json.dumps(data))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    PUBLIC_BRAND.mkdir(parents=True, exist_ok=True)
    for f in [*(BRAND / "logos").glob("*.svg"), *(BRAND / "social").glob("*.png")]:
        shutil.copy(f, PUBLIC_BRAND / f.name)
    for name in DOWNLOADS:
        shutil.copy(M / f"{name}.csv", PUBLIC / f"{name}.csv")
    print(f"wrote dashboard/data/dashboard.json, data through {data['meta']['cutoff']}")


if __name__ == "__main__":
    main()

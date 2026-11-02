"""Render THESIS.md from THESIS.template.md. Every {{key}} is computed here from data/metrics + data/reference.

  python -m pipeline.thesis
"""
import re

import pandas as pd

from pipeline import config

M = config.ROOT / "data" / "metrics"


def usd(v):
    return f"${v / 1e9:.2f}B" if abs(v) >= 1e9 else f"${v / 1e6:.1f}M" if abs(v) >= 1e6 else f"${v / 1e3:.0f}k"


def month_mean(df, col, m):
    return df[df.date.dt.strftime("%Y-%m") == m][col].mean()


def main() -> None:
    vol = pd.read_csv(M / "daily_volume.csv", parse_dates=["date"])
    vol = vol[vol.date < vol.date.max()]  # newest cache day is partial
    obs = pd.read_csv(M / "model_observed.csv", index_col=0)["value"]
    scen = pd.read_csv(M / "model_scenarios.csv")
    sol = pd.read_csv(M / "solver_concentration.csv").set_index("month")
    stick = pd.read_csv(M / "user_stickiness.csv").set_index("month")
    touch = pd.read_csv(M / "near_touch.csv").set_index("month")
    vol["usd_per_intent"] = vol.leg_sum_usd / vol.intents
    f = lambda c, m: month_mean(vol, c, m)
    int_aug, int_oct = f("intents", "2026-08"), f("intents", "2026-10")
    sz_aug = vol[vol.date.dt.strftime("%Y-%m") == "2026-08"].eval("leg_sum_usd.sum()/intents.sum()")
    sz_oct = vol[vol.date.dt.strftime("%Y-%m") == "2026-10"].eval("leg_sum_usd.sum()/intents.sum()")
    s5 = scen[(scen.take_rate_case == "current_observed") & (scen.volume_multiple == 5)].iloc[0]
    ints_30d = vol.tail(30)["intents"].mean()
    yld = float(obs["annualized_buyback_yield_on_mcap"])
    touch_oct, touch_sep = touch.loc["2026-10-01", "near_touching_share"], touch.loc["2026-09-01", "near_touching_share"]
    s10 = scen[(scen.take_rate_case == "current_observed") & (scen.volume_multiple == 10)].iloc[0]
    k = {
        "window": f"{obs['window_start']} to {obs['window_end']}",
        "cache_start": vol.date.min().date().isoformat(), "cache_end": vol.date.max().date().isoformat(),
        "cache_days": str(vol.date.nunique()),
        "cache_missing": str((vol.date.max() - vol.date.min()).days + 1 - vol.date.nunique()),
        "net_vol_30d": usd(float(obs["pipeline_public_net_swap_usd"])),
        "legsum_30d": usd(float(obs["pipeline_public_legsum_usd"])),
        "conf_share": f"{float(obs['implied_confidential_share']) * 100:.0f}%",
        "ints_aug": f"{int_aug:,.0f}", "ints_oct": f"{int_oct:,.0f}", "ints_chg": f"{(int_oct / int_aug - 1) * 100:.0f}%",
        "size_aug": f"${sz_aug:,.0f}", "size_oct": f"${sz_oct:,.0f}", "size_x": f"{sz_oct / sz_aug:.1f}x",
        "rep_oct": f"{stick.loc['2026-10-01', 'share_2plus_days'] * 100:.2f}%",
        "rep_sep": f"{stick.loc['2026-09-01', 'share_2plus_days'] * 100:.2f}%",
        "users_oct": f"{stick.loc['2026-10-01', 'users']:,.0f}",
        "top1_jan": f"{sol.loc['2026-01-01', 'top1_share'] * 100:.0f}%", "top1_oct": f"{sol.loc['2026-10-01', 'top1_share'] * 100:.0f}%",
        "top5_jul": f"{sol.loc['2026-07-01', 'top5_share'] * 100:.0f}%", "top5_oct": f"{sol.loc['2026-10-01', 'top5_share'] * 100:.0f}%",
        "solvers_jan": f"{sol.loc['2026-01-01', 'active_solvers']:.0f}", "solvers_oct": f"{sol.loc['2026-10-01', 'active_solvers']:.0f}",
        "near_touch_oct": f"{touch.loc['2026-10-01', 'near_touching_share'] * 100:.1f}%",
        "gross_bps": f"{float(obs['gross_fee_bps_of_reported_volume']):.1f}",
        "cap_bps": f"{float(obs['captured_bps_of_reported_volume']):.1f}",
        "cap_share": f"{float(obs['captured_share_of_gross_fees']) * 100:.0f}%",
        "rev_ann": usd(float(obs["annualized_revenue_usd"])),
        "yield": f"{float(obs['annualized_buyback_yield_on_mcap']) * 100:.2f}%",
        "mcap": usd(float(obs["near_mcap_usd"])), "near_px": f"${float(obs['near_price_usd']):.2f}",
        "gas_ann": usd(float(obs["annualized_gas_burn_usd"])),
        "yield_5x": f"{s5.buyback_pct_of_mcap * 100:.1f}%", "yield_gap": f"{0.02 / yld:.1f}x", "touch_gap": f"{0.10 / touch_oct:.0f}x",
        "near_touch_sep": f"{touch_sep * 100:.1f}%", "ints_30d": f"{ints_30d:,.0f}", "ints_below": f"{(1 - 30000 / ints_30d) * 100:.0f}%",
        "top5_jan": f"{sol.loc['2026-01-01', 'top5_share'] * 100:.0f}%", "top5_sep": f"{sol.loc['2026-09-01', 'top5_share'] * 100:.0f}%",
        "yield_10x": f"{s10.buyback_pct_of_mcap * 100:.1f}%", "rev_10x": usd(s10.annual_buyback_usd),
    }
    txt = (config.ROOT / "THESIS.template.md").read_text()
    missing = set(re.findall(r"\{\{(\w+)\}\}", txt)) - set(k)
    assert not missing, missing
    (config.ROOT / "THESIS.md").write_text(re.sub(r"\{\{(\w+)\}\}", lambda m: k[m.group(1)], txt))
    print("wrote THESIS.md")


if __name__ == "__main__":
    main()

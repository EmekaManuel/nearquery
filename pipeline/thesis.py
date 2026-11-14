"""Render THESIS.md from THESIS.template.md. Every {{key}} is computed here from data/metrics + data/reference.

  python -m pipeline.thesis
"""
import re

import pandas as pd

from pipeline import config

M = config.ROOT / "data" / "metrics"
# The falsifiers in THESIS.md ("What would change our mind"). Our stated choices, used by the text, the dashboard and the demo video.
THRESH = {"yield": 0.02, "touch": 0.10, "ints": 30000, "top5": 0.95}


def usd(v):
    return f"${v / 1e9:.2f}B" if abs(v) >= 1e9 else f"${v / 1e6:.1f}M" if abs(v) >= 1e6 else f"${v / 1e3:.0f}k"


def month_mean(df, col, m):
    return df[df.date.dt.strftime("%Y-%m") == m][col].mean()


def keys() -> dict:
    """Every figure the thesis (and the demo video) quotes, computed from the committed snapshots."""
    vol = pd.read_csv(M / "daily_volume.csv", parse_dates=["date"])
    vol = vol[vol.date < vol.date.max()]  # newest cache day is partial
    obs = pd.read_csv(M / "model_observed.csv", index_col=0)["value"]
    scen = pd.read_csv(M / "model_scenarios.csv")
    sol = pd.read_csv(M / "solver_concentration.csv").set_index("month")
    stick = pd.read_csv(M / "user_stickiness.csv").set_index("month")
    brk = pd.read_csv(M / "confidential_break.csv", index_col=0)["value"]
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
        "yield_5x": f"{s5.buyback_pct_of_mcap * 100:.1f}%", "yield_gap": f"{THRESH['yield'] / yld:.1f}x", "touch_gap": f"{THRESH['touch'] / touch_oct:.0f}x",
        "near_touch_sep": f"{touch_sep * 100:.1f}%", "ints_30d": f"{ints_30d:,.0f}", "ints_below": f"{(1 - THRESH['ints'] / ints_30d) * 100:.0f}%",
        "top5_jan": f"{sol.loc['2026-01-01', 'top5_share'] * 100:.0f}%", "top5_sep": f"{sol.loc['2026-09-01', 'top5_share'] * 100:.0f}%",
        "break_date": brk["break_date"], "conf_before": f"{float(brk['share_14d_before']) * 100:.1f}%", "conf_after": f"{float(brk['share_14d_after']) * 100:.0f}%",
        "pub_chg": f"{float(brk['public_per_day_change']) * 100:+.0f}%", "rep_chg": f"{float(brk['reported_per_day_change']) * 100:+.0f}%",
        "break_note": (" The step falls on the first day of a month and public volume did not drop with it, so it is as consistent with DefiLlama adding volume to its series from that date as with users moving to Confidential Intents; this analysis cannot tell which."
                       if brk["break_date"].endswith("-01") and float(brk["public_per_day_change"]) > -0.2 else ""),
        "ints_pre": f"{float(brk['intents_per_day_14d_before']):,.0f}", "ints_post": f"{float(brk['intents_per_day_14d_after']):,.0f}", "ints_later": f"{float(brk['intents_per_day_days_15_to_42']):,.0f}",
        "yield_10x": f"{s10.buyback_pct_of_mcap * 100:.1f}%", "rev_10x": usd(s10.annual_buyback_usd),
    }
    rec = pd.read_csv(M / "reconciliation.csv", index_col=0)["value"]
    k |= {"recon_start": rec["window_start"], "recon_end": rec["window_end"], "recon_days": rec["days"],
          "recon_ratio": f"{float(rec['public_over_reported']) * 100:.1f}%", "recon_priced": f"{float(rec['priced_only_over_reported']) * 100:.1f}%",
          "recon_gap": f"{abs(1 - float(rec['public_over_reported'])) * 100:.1f}%", "recon_corr": f"{float(rec['daily_correlation']):.3f}",
          "recon_median": f"{float(rec['median_abs_daily_gap']) * 100:.1f}%"}
    wash = pd.read_csv(M / "wash_screen.csv")
    wash = wash[wash.days_covered >= 28].iloc[-1]
    peers = pd.read_csv(M / "peer_fees.csv").sort_values("fees_per_1m_usd", ascending=False).reset_index(drop=True)
    near_row = peers[peers.protocol == "NEAR Intents"].index[0]
    k |= {"wash_month": str(wash["month"])[:7], "wash_total": f"{(1 - float(wash['kept_share'])) * 100:.1f}%",
          "wash_hf": f"{float(wash['high_frequency_share']) * 100:.1f}%", "wash_rt": f"{float(wash['round_trip_share']) * 100:.2f}%",
          "near_fee_1m": f"${int(peers.fees_per_1m_usd[near_row]):,}", "near_fee_rank": str(near_row + 1), "n_peers": str(len(peers)),
          "peer_median": f"${peers.fees_per_1m_usd.median():,.0f}", "near_kept_1m": f"${int(peers.fees_per_1m_usd[near_row] * float(obs['captured_share_of_gross_fees'])):,}"}
    top5_oct, top5_sep = sol.loc["2026-10-01", "top5_share"], sol.loc["2026-09-01", "top5_share"]
    fired = [yld >= THRESH["yield"], touch_oct >= THRESH["touch"] and touch_sep >= THRESH["touch"], ints_30d < THRESH["ints"],
             top5_oct >= THRESH["top5"] and top5_sep >= THRESH["top5"]]
    k |= {"t_yield": f"{THRESH['yield'] * 100:.0f}%", "t_touch": f"{THRESH['touch'] * 100:.0f}%", "t_ints": f"{THRESH['ints']:,}", "t_top5": f"{THRESH['top5'] * 100:.0f}%",
          "triggers_today": "none of the four" if not any(fired) else f"{sum(fired)} of the four"}
    return k


def main() -> None:
    k = keys()
    txt = (config.ROOT / "THESIS.template.md").read_text()
    missing = set(re.findall(r"\{\{(\w+)\}\}", txt)) - set(k)
    assert not missing, missing
    (config.ROOT / "THESIS.md").write_text(re.sub(r"\{\{(\w+)\}\}", lambda m: k[m.group(1)], txt))
    print("wrote THESIS.md")


if __name__ == "__main__":
    main()

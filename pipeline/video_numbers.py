"""Numbers shown in the demo video, derived from the dashboard's data contract (never typed by hand).

  python -m pipeline.video_numbers      ->  demo/out/numbers.json

Formats mirror dashboard/lib/format.ts, so a string here is the string the hosted site renders. The recording
script asserts that each string is actually visible on the hosted page before the video is built.
"""
import datetime as dt
import json

import pandas as pd

from pipeline import config
from pipeline.thesis import THRESH, keys

SRC = config.ROOT / "dashboard" / "data" / "dashboard.json"
OUT = config.ROOT / "demo" / "out" / "numbers.json"


def usd(v: float, digits: int = 1) -> str:
    a = abs(v)
    if a >= 1e9:
        return f"${v / 1e9:.2f}B"
    if a >= 1e6:
        return f"${v / 1e6:.{digits}f}M"
    if a >= 1e3:
        return f"${v / 1e3:.{1 if a < 1e4 else 0}f}k"
    return f"${v:.0f}"


def num(v: float) -> str:
    a = abs(v)
    return f"{v / 1e6:.1f}M" if a >= 1e6 else f"{v / 1e3:.1f}k" if a >= 1e3 else f"{v:.0f}"


def pct(v: float, digits: int = 0) -> str:
    return f"{v * 100:.{digits}f}%"


def main() -> None:
    d = json.loads(SRC.read_text())
    o, m = d["obs"], d["meta"]
    ten = next(s for s in d["scenarios"] if s["case"] == "current_observed" and s["volumeMultiple"] == 10)
    one = next(s for s in d["scenarios"] if s["case"] == "current_observed" and s["volumeMultiple"] == 1)
    rep = [r["repeatPct"] for r in d["monthly"] if r["repeatPct"] is not None][-1]
    nums = {
        "window": f"{m['windowStart']} → {m['windowEnd']}",
        "cutoff": m["cutoff"],
        "net_swap": usd(o["netSwap30d"]),
        "confidential": pct(o["confidentialShare"]),
        "revenue_year": usd(o["revenueAnnual"]),
        "buyback_yield": pct(o["buybackYield"], 2),
        "yield_1x": pct(one["pctOfMarketCap"], 2),
        "yield_10x": pct(ten["pctOfMarketCap"], 2),
        "buyback_10x": usd(ten["annualBuyback"]),
        "one_day_share": pct(d["accounts"]["implicitOneDayShare"], 2),
        "implicit_accounts": num(d["accounts"]["implicitAccounts"]),
        "repeat_pct_latest": f"{rep:.2f}%",
    }
    k = keys()  # the thesis's own computed values: the video quotes exactly what THESIS.md quotes
    wk = pd.read_csv(config.ROOT / "data" / "metrics" / "confidential_weekly.csv", parse_dates=["week_start"])
    bd = pd.Timestamp(k["break_date"])
    step = wk[(wk.week_start <= bd) & (bd < wk.week_start + pd.Timedelta(days=7))].iloc[0]
    ws = pd.read_csv(config.ROOT / "data" / "metrics" / "wash_screen.csv")
    wash_hf = float(ws[ws.days_covered >= 28].iloc[-1]["high_frequency_share"])
    ordinal = lambda n: f"{n}{'th' if 11 <= n % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"
    need = THRESH["yield"] * o["marketCap"] / o["revenueAnnual"]  # same arithmetic as the dashboard's ScenarioExplorer
    nums |= {
        "need_vol_trigger": f"{need:.1f}\u00d7" if need < 10 else f"{need:.0f}\u00d7",  # as the explorer prints it
        "t_yield": k["t_yield"], "t_touch": k["t_touch"], "t_ints": k["t_ints"], "t_top5": k["t_top5"],
        "break_date": k["break_date"], "conf_before": k["conf_before"], "conf_after": k["conf_after"], "pub_chg": k["pub_chg"], "rep_chg": k["rep_chg"],
        "step_week": step.week_start.date().isoformat(), "step_week_share": f"{step.implied_confidential_share * 100:.1f}%",
        "today_yield": k["yield"], "today_touch": k["near_touch_oct"], "today_ints": k["ints_30d"], "today_top5": k["top5_oct"],
        "triggers_today": k["triggers_today"],
        "wash_total": k["wash_total"], "wash_hf": k["wash_hf"], "wash_rt": k["wash_rt"], "wash_month": k["wash_month"],
        "wash_hf_2dp": f"{wash_hf * 100:.2f}%",  # as the wash chart's latest tile prints it
        "near_fee_1m": k["near_fee_1m"], "near_fee_1m_tip": usd(float(k["near_fee_1m"].replace("$", "").replace(",", ""))),  # as the bar tooltip rounds it
        "near_fee_rank": k["near_fee_rank"], "near_fee_rank_ord": ordinal(int(k["near_fee_rank"])),
        "n_peers": k["n_peers"], "peer_median": k["peer_median"], "near_kept_1m": k["near_kept_1m"],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(nums, indent=1, ensure_ascii=False))
    print(json.dumps(nums, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()

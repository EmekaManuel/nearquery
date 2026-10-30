"""Numbers shown in the demo video, derived from the dashboard's data contract (never typed by hand).

  python -m pipeline.video_numbers      ->  demo/out/numbers.json

Formats mirror dashboard/lib/format.ts, so a string here is the string the hosted site renders. The recording
script asserts that each string is actually visible on the hosted page before the video is built.
"""
import json

from pipeline import config

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
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(nums, indent=1, ensure_ascii=False))
    print(json.dumps(nums, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()

"""Build the static dashboard from committed metric snapshots (no network, no accounts).

  python -m dashboard.build      ->  dashboard/dist/index.html (self-contained; charts via Chart.js 4.4.1 from cdnjs)

Every chart carries its date range and source; coverage gaps in the cache render as gaps, not zeros.
"""
import json

import pandas as pd

from pipeline import config

M = config.ROOT / "data" / "metrics"
REF = config.ROOT / "data" / "reference"
OUT = config.ROOT / "dashboard" / "dist"


def main() -> None:
    vol = pd.read_csv(M / "daily_volume.csv", parse_dates=["date"])
    dl = pd.read_csv(REF / "defillama_near_intents.csv", parse_dates=["date"])
    cutoff = vol["date"].max() - pd.Timedelta(days=1)  # newest cache day is partial
    vol = vol[vol["date"] <= cutoff].set_index("date")
    dl = dl[dl["date"] <= cutoff].set_index("date")
    days = pd.date_range(vol.index.min(), cutoff)
    ser = lambda s: [None if pd.isna(x) else round(float(x), 4) for x in s.reindex(days)]
    daily = {
        "dates": [d.date().isoformat() for d in days],
        "leg_sum": ser(vol["leg_sum_usd"]), "dl_volume": ser(dl["volume_usd"].where(vol["leg_sum_usd"].reindex(dl.index).notna())),
        "intents": ser(vol["intents"]), "usd_per_intent": ser(vol["leg_sum_usd"] / vol["intents"]),
    }
    months = [d.date().isoformat() for d in pd.date_range(vol.index.min().replace(day=1), cutoff, freq="MS")]

    def full(name):  # every month on the axis; months with < 28 covered days become gaps, not interpolated lines
        t = pd.read_csv(M / f"{name}.csv")
        return t[t.days_covered >= 28].set_index("month").reindex(months)

    cl = lambda s: [None if pd.isna(x) else x for x in s]
    solver, stick, touch = full("solver_concentration"), full("user_stickiness"), full("near_touch")
    pairs = pd.read_csv(M / "chain_pairs.csv")
    last_m = pairs[pairs.days_covered >= 28].month.max()
    top = (pairs[pairs.month == last_m].assign(pair=lambda d: d.sold_chain + " → " + d.bought_chain)
           .nlargest(10, "usd")[["pair", "usd"]])
    obs = pd.read_csv(M / "model_observed.csv", index_col=0)["value"]
    scen = pd.read_csv(M / "model_scenarios.csv")
    data = {
        "daily": daily, "cutoff": cutoff.date().isoformat(),
        "months": months,
        "solver": {"top1": cl(solver.top1_share.round(4)), "top5": cl(solver.top5_share.round(4))},
        "stick": {"rep": cl((stick.share_2plus_days * 100).round(3))},
        "touch": {"share": cl((touch.near_touching_share * 100).round(3))},
        "pairs": {"month": str(last_m), "labels": top.pair.tolist(), "usd": top.usd.round(0).tolist()},
        "obs": {k: (v if k.startswith("window") else float(v)) for k, v in obs.items()},
        "scen": scen[scen.take_rate_case == "current_observed"][["volume_multiple", "annual_buyback_usd", "buyback_pct_of_mcap"]].to_dict("records"),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    html = (config.ROOT / "dashboard" / "template.html").read_text().replace("__DATA__", json.dumps(data))
    (OUT / "index.html").write_text(html)
    print(f"wrote dashboard/dist/index.html ({len(html) / 1e3:.0f} kB), data through {data['cutoff']}")


if __name__ == "__main__":
    main()

"""Fees per $1M of volume for NEAR Intents and other cross-chain protocols, from DefiLlama's 30-day totals.

  python -m pipeline.peers

Selection rule (fixed, not hand-picked): every protocol that DefiLlama lists as a bridge, cross-chain bridge or bridge
aggregator, has a reported 30-day volume of at least $100M and reported 30-day fees above zero. Writes only the derived
ratio per protocol to data/metrics/peer_fees.csv. DefiLlama's volume and fee series are never stored (their terms forbid
republishing them). If the API is unreachable the committed snapshot is kept.

Fees are DefiLlama's own definition per protocol, and the definitions differ (some count what users pay, some what the
protocol keeps), so the ratio is a rough benchmark, not like for like.
"""
import sys
import time

import pandas as pd
import requests

from pipeline import config

OUT = config.ROOT / "data" / "metrics" / "peer_fees.csv"
BASE = "https://api.llama.fi/overview"
CATS = {"Bridge", "Cross Chain Bridge", "Bridge Aggregator"}
MIN_VOLUME = 100e6
OPTS = "excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true"


def overview(path: str) -> dict:
    for attempt in range(3):
        try:
            r = requests.get(f"{BASE}/{path}?{OPTS}", timeout=120)
            r.raise_for_status()
            return {p["name"]: p for p in r.json()["protocols"]}
        except requests.RequestException:
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"DefiLlama {path} unreachable")


def select(fees: dict, dexs: dict, aggs: dict) -> pd.DataFrame:
    """The fixed selection rule: pure, so it can be tested without the network."""
    rows = []
    for name, f in fees.items():
        v = dexs.get(name) or aggs.get(name)
        if not v or not f.get("total30d") or not v.get("total30d"):
            continue
        cat = "Bridge Aggregator" if name in aggs and name not in dexs else f.get("category")
        if cat not in CATS or v["total30d"] < MIN_VOLUME:
            continue
        rows.append({"protocol": name, "category": cat, "fees_per_1m_usd": round(f["total30d"] / v["total30d"] * 1e6)})
    return pd.DataFrame(rows, columns=["protocol", "category", "fees_per_1m_usd"]).sort_values("fees_per_1m_usd", ascending=False)


def main() -> None:
    try:
        fees, dexs, aggs = overview("fees"), overview("dexs"), overview("bridge-aggregators")
    except RuntimeError as e:
        print(f"{e}; keeping the committed {OUT.relative_to(config.ROOT)}", file=sys.stderr)
        return
    df = select(fees, dexs, aggs)
    df.to_csv(OUT, index=False)
    print(f"peers: {len(df)} protocols -> {OUT.relative_to(config.ROOT)}")
    print(df.to_string(index=False))


if __name__ == "__main__":
    main()

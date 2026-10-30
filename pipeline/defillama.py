"""Aggregate cross-check series for NEAR Intents from DefiLlama, plus NEAR total supply from chain state.

  python -m pipeline.defillama

Writes data/reference/defillama_near_intents.csv (date, volume_usd, fees_usd, revenue_usd; gitignored, because
DefiLlama ToS 8(7) forbids republishing their data) and data/reference/near_supply.json (supply + one spot price). DefiLlama's volume derives from Dune's NEAR Intents tables, so it is a
transcription cross-check of NEAR's own reporting, NOT an independent source. Fees/revenue are used as the
revenue inputs of the value-capture model because protocol fees are not visible in on-chain events.
"""
import datetime as dt
import json
import sys

import pandas as pd
import requests

from pipeline import config
from pipeline.assets import REF, RPC

OUT = REF / "defillama_near_intents.csv"
SUPPLY = REF / "near_supply.json"


def series(url: str) -> pd.Series:
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    pts = r.json()["totalDataChart"]
    return pd.Series({dt.datetime.fromtimestamp(t, dt.UTC).date(): v for t, v in pts})


def main() -> None:
    REF.mkdir(parents=True, exist_ok=True)
    base = "https://api.llama.fi/summary"
    df = pd.DataFrame({
        "volume_usd": series(f"{base}/dexs/near-intents"),
        "fees_usd": series(f"{base}/fees/near-intents?dataType=dailyFees"),
        "revenue_usd": series(f"{base}/fees/near-intents?dataType=dailyRevenue"),
    }).rename_axis("date").reset_index()
    df.to_csv(OUT, index=False)
    print(f"wrote {OUT.relative_to(config.ROOT)}: {len(df)} rows {df.date.min()}..{df.date.max()}")

    # NEAR price is pinned to the end of the pipeline window (not live spot) so the model re-runs to the same numbers.
    end = pd.read_csv(config.ROOT / "data" / "metrics" / "daily_volume.csv", parse_dates=["date"])["date"].max() - pd.Timedelta(days=1)
    ts = int(dt.datetime(end.year, end.month, end.day, 12, tzinfo=dt.timezone.utc).timestamp())
    px = requests.get(f"https://coins.llama.fi/prices/historical/{ts}/coingecko:near", timeout=30).json()["coins"]["coingecko:near"]["price"]
    # Total supply is a committed chain-state snapshot; it is only re-read when missing or with --refresh-supply.
    if not SUPPLY.exists() or "--refresh-supply" in sys.argv:
        r = requests.post(RPC, json={"jsonrpc": "2.0", "id": 1, "method": "block", "params": {"finality": "final"}}, timeout=30)
        h = r.json()["result"]["header"]
        snap = {"total_supply_near": int(h["total_supply"]) / 1e24, "block_height": h["height"],
                "block_time_utc": dt.datetime.fromtimestamp(h["timestamp"] / 1e9, dt.UTC).isoformat(),
                "source": f"block header via {RPC}"}
    else:
        snap = json.loads(SUPPLY.read_text())
    snap |= {"near_price_usd": px, "near_price_date": end.date().isoformat(), "near_price_source": "DefiLlama coins API, historical at 12:00 UTC"}
    snap.pop("near_price_fetched_utc", None)
    SUPPLY.write_text(json.dumps(snap, indent=1))
    print("wrote", SUPPLY.relative_to(config.ROOT), f"supply={snap['total_supply_near']:.0f} NEAR, price {px:.4f} on {end.date()}")


if __name__ == "__main__":
    main()

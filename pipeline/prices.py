"""Daily USD prices for intents.near assets from DefiLlama's free coins API (coins.llama.fi).

  python -m pipeline.prices --start 2025-01-01

Writes data/reference/prices.csv (price_key,date,price) and adds `price_key` to asset_metadata.json.
Stablecoins are NOT fetched: they are valued at exactly $1.00 (documented assumption; see METHODOLOGY).
Assets with no price key are left unpriced and reported as a coverage gap, never silently valued at 0.
"""
import argparse
import datetime as dt
import json
import re
import time

import pandas as pd
import requests

from pipeline import config
from pipeline.assets import META_PATH, REF

PRICES_PATH = REF / "prices.csv"
STABLE = {"USDC", "USDT", "USDt", "DAI", "USDG", "USDCx", "PYUSD", "USD1", "FRAX", "USDe", "USDS", "USDD", "TUSD", "FDUSD"}
# symbol -> coingecko id, for assets whose price tracks a major
CG = {"ETH": "ethereum", "WETH": "ethereum", "wNEAR": "near", "NEAR": "near", "SOL": "solana", "BTC": "bitcoin",
      "NBTC": "bitcoin", "cbBTC": "bitcoin", "WBTC": "bitcoin", "XRP": "ripple", "ZEC": "zcash", "LTC": "litecoin",
      "TRX": "tron", "SUI": "sui", "DOGE": "dogecoin", "ADA": "cardano", "BCH": "bitcoin-cash", "ARB": "arbitrum",
      "PEPE": "pepe", "SHIB": "shiba-inu", "XAUT": "tether-gold", "TON": "the-open-network", "AVAX": "avalanche-2",
      "BNB": "binancecoin", "POL": "polygon-ecosystem-token", "OP": "optimism", "APT": "aptos", "XLM": "stellar",
      "DASH": "dash", "STNEAR": "near", "LINK": "chainlink", "UNI": "uniswap", "AAVE": "aave"}
LLAMA_CHAIN = {"ethereum": "ethereum", "base": "base", "arbitrum": "arbitrum", "optimism": "optimism",
               "polygon": "polygon", "bnb": "bsc", "avalanche": "avax", "gnosis": "xdai"}
_EVM_OMFT = re.compile(r"^nep141:[a-z]+-(0x[0-9a-fA-F]{40})\.omft\.near$")


def price_key(asset: str, m: dict) -> str | None:
    sym = m.get("symbol")
    if sym in STABLE:
        return "USD"
    if sym in CG:
        return f"coingecko:{CG[sym]}"
    if (mm := _EVM_OMFT.match(asset)) and m.get("origin_chain") in LLAMA_CHAIN:
        return f"{LLAMA_CHAIN[m['origin_chain']]}:{mm.group(1).lower()}"
    if asset.startswith("nep141:") and m.get("origin_chain") == "near" and "." in asset[7:]:
        return f"near:{asset[7:]}"
    return None


def fetch_chart(keys: list[str], start: dt.date, days: int) -> dict[str, list]:
    ts = int(dt.datetime(start.year, start.month, start.day, tzinfo=dt.timezone.utc).timestamp())
    url = "https://coins.llama.fi/chart/" + ",".join(keys)
    for attempt in range(4):
        r = requests.get(url, params={"start": ts, "span": days, "period": "1d"}, timeout=60)
        if r.status_code == 429:
            time.sleep(3 * (attempt + 1))
            continue
        r.raise_for_status()
        return {k: v.get("prices", []) for k, v in r.json().get("coins", {}).items()}
    raise RuntimeError("rate limited")


def main(start: dt.date) -> None:
    meta = json.loads(META_PATH.read_text())
    for a, m in meta.items():
        m["price_key"] = price_key(a, m)
    keys = sorted({m["price_key"] for m in meta.values() if m.get("price_key") not in (None, "USD")})
    days = (dt.date.today() - start).days + 1
    rows, got = [], set()
    for i in range(0, len(keys)):
        for w in range(0, days, 480):  # the API caps a request at 500 points in total, so one key per call
            for k, series in fetch_chart([keys[i]], start + dt.timedelta(days=w), min(480, days - w)).items():
                if series:
                    got.add(k)
                for p in series:
                    rows.append((k, dt.datetime.fromtimestamp(p["timestamp"], dt.UTC).date().isoformat(), p["price"]))
            time.sleep(0.4)
    for m in meta.values():  # a key that returned no history is unpriced, not $0
        if m.get("price_key") not in (None, "USD") and m["price_key"] not in got:
            m["price_key"] = None
    df = pd.DataFrame(rows, columns=["price_key", "date", "price"]).drop_duplicates(["price_key", "date"]).sort_values(["price_key", "date"])
    df.to_csv(PRICES_PATH, index=False)
    META_PATH.write_text(json.dumps(meta, indent=1))
    n141 = [a for a in meta if a.startswith("nep141:")]
    priced = [a for a in n141 if meta[a].get("price_key")]
    print(f"{len(got)}/{len(keys)} price keys returned history; {len(priced)}/{len(n141)} nep141 assets priced; "
          f"{sum(1 for a in meta if a.startswith('nep245:'))} nep245 assets unpriced")
    print(f"wrote {PRICES_PATH.relative_to(config.ROOT)} ({len(df):,} rows, {df.date.min()}..{df.date.max()})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=dt.date.fromisoformat, default=dt.date(2025, 1, 1))
    main(ap.parse_args().start)

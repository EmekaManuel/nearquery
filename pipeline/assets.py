"""Asset reference data: which assets appear in intents.near events, their decimals/symbols, and origin chain.

  python -m pipeline.assets            # collect asset ids from the raw cache, fetch missing metadata

Metadata comes from `ft_metadata` on public chain state via FastNEAR's free RPC (the public NEAR RPC is
deprecated). Result is committed as data/reference/asset_metadata.json so nobody needs RPC to reproduce.
"""
import datetime as dt
import json
import re
import time

import duckdb
import requests

from pipeline import config

REF = config.ROOT / "data" / "reference"
META_PATH = REF / "asset_metadata.json"
RPC = "https://free.rpc.fastnear.com"

# omft prefix -> origin chain. Prefix is the chain code NEAR Intents uses in `<chain>[-<address>].omft.near`.
OMFT_CHAIN = {
    "eth": "ethereum", "base": "base", "arb": "arbitrum", "op": "optimism", "pol": "polygon", "bsc": "bnb",
    "avax": "avalanche", "gnosis": "gnosis", "bera": "berachain", "sol": "solana", "tron": "tron",
    "btc": "bitcoin", "xrp": "xrp", "zec": "zcash", "ltc": "litecoin", "doge": "dogecoin", "sui": "sui",
    "ton": "ton", "aptos": "aptos", "cardano": "cardano", "stellar": "stellar", "bch": "bitcoin-cash",
    "starknet": "starknet", "monad": "monad", "xlayer": "xlayer", "plasma": "plasma", "scroll": "scroll",
    "aleo": "aleo", "dash": "dash", "adi": "adi", "hood": "hood", "qtc": "qtc", "prl": "prl",
    "abs": "abstract", "hypercore": "hyperliquid", "movement": "movement", "fogo": "fogo",
}
# HOT Omni (nep245 v2_1.omni.hot.tg) token ids are `<chain id>_<hash>`; map the EVM ids we can be sure of.
HOT_CHAIN_ID = {"1": "ethereum", "10": "optimism", "56": "bnb", "137": "polygon", "8453": "base",
                "42161": "arbitrum", "43114": "avalanche", "100": "gnosis"}

_OMFT = re.compile(r"^nep141:([a-z0-9]+)(?:-[0-9a-zA-Z]+)?\.omft\.near$")
_HOT = re.compile(r"^nep245:v2_1\.omni\.hot\.tg:(\d+)_")


def origin_chain(asset_id: str) -> str:
    if (m := _OMFT.match(asset_id)):
        return OMFT_CHAIN.get(m.group(1), f"other:{m.group(1)}")
    if (m := _HOT.match(asset_id)):
        return HOT_CHAIN_ID.get(m.group(1), f"hot:{m.group(1)}")
    if asset_id == "nep141:nbtc.bridge.near":
        return "bitcoin"
    if asset_id.endswith(".factory.bridge.near"):
        return "ethereum"  # Rainbow bridge wrapped ERC-20s
    return "near"


def collect_asset_ids() -> list[str]:
    con = duckdb.connect()
    ids: set[str] = set()
    for sql in (
        f"SELECT DISTINCT unnest(json_keys(diff::JSON)) FROM read_parquet('{config.RAW}/swaps/*.parquet')",
        f"SELECT DISTINCT unnest(from_json(token_ids::JSON, '[\"VARCHAR\"]')) FROM read_parquet('{config.RAW}/mt/*.parquet')",
    ):
        ids |= {r[0] for r in con.execute(sql).fetchall()}
    return sorted(ids)


def fetch_ft_metadata(contract: str) -> dict:
    payload = {"jsonrpc": "2.0", "id": 1, "method": "query", "params": {
        "request_type": "call_function", "finality": "final", "account_id": contract,
        "method_name": "ft_metadata", "args_base64": ""}}
    for attempt in range(4):
        r = requests.post(RPC, json=payload, timeout=30)
        j = r.json()
        if "result" in j and "result" in j["result"]:
            m = json.loads(bytes(j["result"]["result"]))
            return {"symbol": m.get("symbol"), "decimals": m.get("decimals")}
        if r.status_code == 429:
            time.sleep(2 * (attempt + 1))
            continue
        return {"error": str(j.get("error") or j)[:120]}
    return {"error": "rate limited"}


def main() -> None:
    REF.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META_PATH.read_text()) if META_PATH.exists() else {}
    all_ids = collect_asset_ids()
    ids = [a for a in all_ids if a.startswith(("nep141:", "nep245:"))]  # nep171 NFTs are not swap assets
    meta = {a: v for a, v in meta.items() if a in set(ids)}
    print(f"{len(all_ids) - len(ids)} nep171 NFT ids excluded")
    todo = [a for a in ids if a.startswith("nep141:") and (a not in meta or "error" in meta[a])]
    print(f"{len(ids)} assets seen, {len(todo)} nep141 to fetch")
    for a in todo:
        meta[a] = fetch_ft_metadata(a[len("nep141:"):]) | {"fetched": dt.date.today().isoformat()}
        time.sleep(0.4)
    for a in ids:
        meta.setdefault(a, {})
        meta[a]["origin_chain"] = origin_chain(a)
    META_PATH.write_text(json.dumps(dict(sorted(meta.items())), indent=1))
    bad = [a for a, v in meta.items() if a.startswith("nep141:") and "error" in v]
    print(f"wrote {META_PATH.relative_to(config.ROOT)}: {len(meta)} assets; {len(bad)} nep141 without metadata")


if __name__ == "__main__":
    main()

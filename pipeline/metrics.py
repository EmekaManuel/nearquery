"""Build the metric snapshots from the raw cache + reference data.

  python -m pipeline.metrics

Runs pipeline/sql/00_setup.sql, then every other NN_name.sql in order; each is one SELECT whose result is
written to data/metrics/<name>.csv. These CSVs (and the SQL) are what gets committed.
"""
import json
import sys

import duckdb
import pandas as pd

from pipeline import config
from pipeline.assets import META_PATH
from pipeline.prices import PRICES_PATH

SQL_DIR = config.ROOT / "pipeline" / "sql"
OUT = config.ROOT / "data" / "metrics"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META_PATH.read_text())
    assets = pd.DataFrame(
        [{"asset": a, "symbol": m.get("symbol"), "decimals": m.get("decimals"),
          "origin_chain": m.get("origin_chain"), "price_key": m.get("price_key")} for a, m in meta.items()])
    prices = pd.read_csv(PRICES_PATH, parse_dates=["date"])
    prices["date"] = prices["date"].dt.date

    con = duckdb.connect()
    con.register("assets", assets)
    con.register("prices", prices)

    def sql(path):
        return path.read_text().replace("{RAW}", str(config.RAW))

    for stmt in sql(SQL_DIR / "00_setup.sql").split(";\n\n"):
        if stmt.strip():
            con.execute(stmt)
    only = set(sys.argv[1:])  # optional: python -m pipeline.metrics account_quality
    for path in sorted(SQL_DIR.glob("[1-9]*_*.sql")):
        if only and path.stem.split("_", 1)[1] not in only:
            continue
        name = path.stem.split("_", 1)[1]
        df = con.execute(sql(path)).df()
        df.to_csv(OUT / f"{name}.csv", index=False, float_format="%.8g")
        print(f"{name}: {len(df):,} rows -> data/metrics/{name}.csv")


if __name__ == "__main__":
    main()

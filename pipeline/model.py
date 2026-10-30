"""Simple value-capture model: Intents volume -> NEAR captured revenue (buyback) -> yield on NEAR market cap.

  python -m pipeline.model

Observed side (computed): trailing-window public volume from the pipeline, total volume / fees / captured revenue
from the DefiLlama snapshot, gas burned by intents.near, NEAR price and total supply.
Scenario side: data/reference/model_assumptions.json (volume multiples, take-rate multiples).
Writes data/metrics/model_observed.csv and data/metrics/model_scenarios.csv.
"""
import json

import pandas as pd

from pipeline import config
from pipeline.assets import REF

M = config.ROOT / "data" / "metrics"


def main() -> None:
    a = json.loads((REF / "model_assumptions.json").read_text())
    vol = pd.read_csv(M / "daily_volume.csv", parse_dates=["date"])
    gas = pd.read_csv(M / "fees_and_gas.csv", parse_dates=["date"])
    dl = pd.read_csv(REF / "defillama_near_intents.csv", parse_dates=["date"])
    sup = json.loads((REF / "near_supply.json").read_text())
    supply = sup["total_supply_near"]

    end = vol["date"].max() - pd.Timedelta(days=1)  # last cache day is partial; drop it
    start = end - pd.Timedelta(days=a["window_days"] - 1)
    win = lambda d: d[(d["date"] >= start) & (d["date"] <= end)]
    v, g, d = win(vol), win(gas), win(dl)
    n = a["window_days"]
    near_px = sup["near_price_usd"]  # spot at snapshot time (see near_price_fetched_utc)
    mcap = near_px * supply

    pipe_public_legsum = v["leg_sum_priced_usd"].sum() + v["leg_sum_imputed_usd"].fillna(0).sum()
    dl_total = d["volume_usd"].sum()
    fees, rev = d["fees_usd"].sum(), d["revenue_usd"].sum()
    obs = {
        "window_start": start.date(), "window_end": end.date(), "days": n,
        "pipeline_public_legsum_usd": pipe_public_legsum,
        "pipeline_public_net_swap_usd": pipe_public_legsum / 2,
        "defillama_total_volume_usd": dl_total,
        "implied_confidential_share": 1 - pipe_public_legsum / dl_total,
        "gross_fees_usd": fees, "captured_revenue_usd": rev,
        "gross_fee_bps_of_reported_volume": 1e4 * fees / dl_total,
        "captured_share_of_gross_fees": rev / fees,
        "captured_bps_of_reported_volume": 1e4 * rev / dl_total,
        "gas_burned_near": g["tokens_burnt_near"].sum(), "gas_burned_usd": g["tokens_burnt_usd"].sum(),
        "near_price_usd": near_px, "near_total_supply": supply, "near_mcap_usd": mcap,
        "annualized_revenue_usd": rev * 365 / n,
        "annualized_buyback_yield_on_mcap": rev * 365 / n / mcap,
        "annualized_gas_burn_usd": g["tokens_burnt_usd"].sum() * 365 / n,
    }
    pd.DataFrame([obs]).T.rename(columns={0: "value"}).to_csv(M / "model_observed.csv", float_format="%.8g")

    rows = []
    base_vol = dl_total * 365 / n
    base_take = rev / dl_total
    for name, mult in a["revenue_take_rate_scenarios"].items():
        take = base_take * (1.0 if mult is None else mult)
        for vm in a["volume_multiples"]:
            for pm in a["near_price_multiples"]:
                annual_rev = base_vol * vm * take
                rows.append({"take_rate_case": name, "volume_multiple": vm, "near_price_multiple": pm,
                             "annual_volume_usd": base_vol * vm, "take_bps": 1e4 * take,
                             "annual_buyback_usd": annual_rev,
                             "buyback_pct_of_mcap": annual_rev / (mcap * pm)})
    pd.DataFrame(rows).to_csv(M / "model_scenarios.csv", index=False, float_format="%.8g")
    print(pd.DataFrame([obs]).T.to_string(header=False))


if __name__ == "__main__":
    main()

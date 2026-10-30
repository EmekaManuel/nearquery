# Methodology

Draft. Numbers live in `THESIS.md` (rendered from the pipeline); this file defines how they are produced and where they can be wrong.

## Sources

| Source | Used for | Access | Notes |
|---|---|---|---|
| BigQuery public dataset `bigquery-public-data.crypto_near_mainnet_us` (`execution_outcomes`) | Every on-chain figure: `intents.near` event logs, gas burned | Free sandbox, user's own project, ADC login | **Primary.** Provided by NEAR via Google's community-managed public datasets. No terms found restricting publication of derived results (the lakehouse repo's GPL-3.0 covers code, not data). Google's general public-dataset terms still apply. |
| DefiLlama coins API (`coins.llama.fi`) | Daily USD prices, one spot NEAR price | Free, keyless | ToS 8(7) forbids republishing their data without permission, so **raw DefiLlama series are not committed** (`prices.csv`, `defillama_near_intents.csv` are gitignored). `make reference` / `make rebuild` re-fetch them. Committed metric CSVs are derived aggregates. Written permission has not been requested. |
| DefiLlama dimensions API (volume, fees, revenue) | Reported-volume cross-check, fee/revenue inputs of the value-capture model | Free, keyless | Same terms. Its volume derives from Dune, so it checks our reading of NEAR's reporting but is **not independent**. |
| Dune dashboard (NEAR Intents) | Spot cross-checks of public/confidential volume | Read by eye from the public dashboard on 2026-10-30 | Free tier has no API; figures were transcribed from screenshots and cannot be re-pulled without a paid plan. Not used in any pipeline number. |
| FastNEAR free RPC (`free.rpc.fastnear.com`) | `ft_metadata` (symbol, decimals), NEAR total supply | Free, keyless | Public `rpc.mainnet.near.org` is deprecated. |

**Excluded: the NEAR Explorer API.** Its terms (§4.1(e)) do not permit this use, so it is deliberately not a source. Everything is from public chain data and aggregate series cross-checked against each other.

Not used: NEAR Lake S3 (deprecated 2026-03-24), neardata.xyz (recent blocks only, needs a key). No wallets, keys, contracts or transactions; everything is read-only.

## Event model

`intents.near` emits NEP-297 `EVENT_JSON` logs. Parsed: `token_diff` (per-account signed amounts and `fees_collected`), `mt_mint`/`mt_burn` (deposit, withdraw, refund), plus event counts. A swap is a receipt with two accounts' `token_diff` entries (user + solver). NFT (`nep171`) assets are excluded.

## Metric definitions

- **Leg-sum volume** = sum of positive `token_diff` legs in USD, both sides of every swap. This reproduces the "volume" NEAR/DefiLlama report. **Net swap volume = leg-sum / 2.**
- **Pricing**: stablecoins at exactly $1.00 (assumption); other assets from DefiLlama daily prices, forward-filled. Unpriced assets (notably most HOT Omni `nep245` tokens) are left unpriced, never valued at zero.
- **Imputation**: for a swap entry with exactly one unpriced asset, its value is minus the sum of the priced legs, only if the sign matches. Reported in separate columns (`*_imputed_*`) and combined only where stated ("with imputation").
- **Solver**: an account facing >= 100 distinct counterparties across two-account swap receipts. A heuristic, not an on-chain label; it is the basis of user/solver splits and concentration. Users face a handful of solvers.
- **Active accounts / users**: distinct accounts with a successful entry. **Not a user count**: ~99.96% of implicit-hex accounts are active on one day only, which is consistent with per-swap deposit accounts (mechanism not yet confirmed against the Intents docs). See `account_quality.csv`.
- **Implied confidential share** = 1 - (pipeline public leg-sum / DefiLlama total reported volume) over the same 30 days. An inference, not an observation.
- **Value-capture model**: annual volume x (captured revenue / reported volume) / market cap. Observed inputs computed; scenario multiples are assumptions in `data/reference/model_assumptions.json`. Market cap = spot price x total supply (not circulating, so yields are conservative). Since 2026-02-23 captured revenue funds a buyback, not a burn (DefiLlama methodology).

## Known gaps and biases

- **Confidential Intents (GA 2026-07-07) are invisible on-chain** and are 35-40% of reported volume recently. Every on-chain trend here covers the public side only, so a shift to confidential reads as a decline.
- **Cache coverage**: Jan 1-Feb 8, four days in late March, and Apr 1 onward (Feb 9-Mar 20 awaiting the next BigQuery quota window). Monthly tables carry `days_covered`; charts show gaps. Cohorts use only the contiguous window.
- **Newest day is partial** and dropped from every snapshot.
- **Reconciliation** (pre-confidential, Apr 1-Jul 6): leg-sum with imputation is within about 1% of DefiLlama's daily volume (daily correlation 0.998); priced-only is about 8% lower. Against Dune's public figures read on 2026-10-30, recent windows differ by about 0 to +17% depending on the window definition (unresolved; likely rolling-window and public/confidential classification differences). Because DefiLlama and Dune share a source, agreement is a check on definition, not independent verification.
- **Fees**: the on-chain protocol fee is ~0.0001% (negligible); reported fees are mostly affiliate/distribution fees that are not visible in these events, so fee inputs to the model come from DefiLlama, not from on-chain data.
- **BigQuery data in `ft_events`** was not used (cost); deposits/withdrawals come from `mt_mint`/`mt_burn` logs.
- **Average swap size rose ~1.9x from Aug to Oct while intents/day fell ~half**: not explained here.

## Reproducing

1. `make setup rebuild`: regenerates the model outputs and dashboard from committed `data/metrics/*.csv` (re-fetches DefiLlama series; no account needed).
2. Full rebuild from raw: own Google Cloud project with BigQuery sandbox, `gcloud auth application-default login`, `.env` from `.env.example`, `make extract-logs reference metrics model dashboard thesis`. Each BigQuery chunk is dry-run first and guarded by `--max-gb`.

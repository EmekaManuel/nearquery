# Methodology

Numbers live in `THESIS.md` (rendered from the pipeline); this file defines how they are produced and where they can be wrong.

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

- **Implied confidential share is a residual.** It is one minus public leg-sum over DefiLlama's reported volume. Day by day it is within about 1% of zero until 2026-08-31 and jumps on 2026-09-01 (a month boundary) with no matching fall in public volume. That is as consistent with a change in DefiLlama's coverage as with users moving to Confidential Intents (GA 2026-07-07). `data/metrics/confidential_weekly.csv` and `confidential_break.csv` hold only derived ratios, never DefiLlama's series.
- **Confidential Intents (GA 2026-07-07) are invisible on-chain** and are 35-40% of reported volume recently. Every on-chain trend here covers the public side only, so a shift to confidential reads as a decline.
- **Cache coverage**: every day from Jan 1, 2026 to the cutoff (no missing days; THESIS.md prints the count). Nothing before 2026-01-01 is pulled. Monthly tables carry `days_covered`; a month under 28 covered days would be drawn as a gap, not zero.
- **Newest day is partial** and dropped from every snapshot.
- **Reconciliation** (pre-confidential, 2026-04-01 to 2026-07-06): recomputed on every build into `data/metrics/reconciliation.csv` and printed in THESIS.md (public leg-sum over DefiLlama's reported volume with and without imputation, daily correlation, median daily gap). **Dune comparison**: figures read by eye from Dune's public dashboard on 2026-10-30 differed from our recent windows by roughly 0 to +17% depending on the window definition. They were transcribed from screenshots, cannot be re-pulled without a paid plan, are unresolved (likely rolling-window and public/confidential classification differences) and are not used in any figure.
- **Fees**: the on-chain protocol fee is ~0.0001% (negligible); reported fees are mostly affiliate/distribution fees that are not visible in these events, so fee inputs to the model come from DefiLlama, not from on-chain data.
- **BigQuery data in `ft_events`** was not used (cost); deposits/withdrawals come from `mt_mint`/`mt_burn` logs.
- **Average swap size rose ~1.9x from Aug to Oct while intents/day fell ~half**: not explained here.

## Reproducing

1. `make setup rebuild`: regenerates the model outputs and dashboard from committed `data/metrics/*.csv` (re-fetches DefiLlama series; no account needed).
2. Full rebuild from raw: own Google Cloud project with BigQuery sandbox, `gcloud auth application-default login`, `.env` from `.env.example`, `make extract-logs reference metrics model dashboard thesis`. Each BigQuery chunk is dry-run first and guarded by `--max-gb`.

## Wash and bot screen, and the fee benchmark

- **Wash and bot screen** (`pipeline/sql/90_wash_screen.sql`, chart "Wash and bot screen"). Two stated rules on user volume: an account-day with at least 50 swaps is bot-like and all its received volume is set aside; for the rest, round-trip volume is received volume times churn, where churn = 1 - (sum over assets of net value change) / (sum over assets of gross value moved) within the account-day. Filtered volume is user volume minus both parts. The 50-swap threshold is a choice. It is a screen, not a wash-trading detector: it cannot see cycling across several accounts or across days, and it uses the same solver/user heuristic as the other user metrics.
- **Fee benchmark** (`pipeline/peers.py`, chart "Fees per $1M"). DefiLlama's 30-day fees divided by its 30-day volume for every protocol it lists as a bridge, cross-chain bridge or bridge aggregator with at least $100M of 30-day volume and fees above zero. The selection rule is fixed in code. Fee definitions differ by protocol (what users pay, what the protocol keeps), so the ratio is a rough benchmark; the set is incomplete because not every protocol is in DefiLlama's volume tables. Only the derived ratio is stored (their terms forbid republishing the series); if the API is unreachable the committed snapshot is kept.
- **Open notebook** (`notebooks/nearquery.ipynb`): reads the committed snapshots and reproduces these figures; no accounts or keys.

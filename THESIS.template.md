# NearQuery: a data-backed thesis on NEAR Intents

> DRAFT. Rendered by `python -m pipeline.thesis` from `THESIS.template.md`; every number below is computed from the committed snapshots in `data/metrics/` and `data/reference/`. Cache: {{cache_start}} to {{cache_end}} ({{cache_days}} days, {{cache_missing}} missing). Public on-chain activity only.

## Claim

NEAR Intents is real settlement infrastructure (about {{net_vol_30d}} of public net swap volume in the 30-day window {{window}}, spread across a solver market that is less concentrated than in January), but the data does not yet show it creating material value for the NEAR token: captured revenue annualizes to {{rev_ann}} ({{yield}} of market cap), gas burned on `intents.near` is negligible ({{gas_ann}} a year), and only {{near_touch_oct}} of user volume involves NEAR itself. The verdict is **positive on infrastructure, neutral-to-weak on token value capture**, and even 10x current volume would yield only {{yield_10x}} of market cap per year.

## Findings

1. **Scale is real, and a third of it is invisible to us.** Public on-chain leg-sum was {{legsum_30d}} over {{window}}; net swap volume is half that ({{net_vol_30d}}). Comparing with DefiLlama's reported total implies about {{conf_share}} of volume is Confidential Intents, which events on-chain do not show. (Chart: daily volume. Figure: `model_observed.csv`.)
2. **Activity is falling while ticket size rises.** Intents per day went from {{ints_aug}} (Aug) to {{ints_oct}} (Oct), {{ints_chg}}, while leg-sum per intent rose from {{size_aug}} to {{size_oct}} ({{size_x}}). Cause untested: migration of small flows to Confidential Intents, larger trades, or fewer bot-like swaps. (Charts: intents per day, USD per intent.)
3. **Account counts are not users.** In Oct {{users_oct}} distinct accounts swapped, but only {{rep_oct}} were active on 2+ days (Sep {{rep_sep}}). Most accounts are single-use, so active-accounts and account-level retention cannot be used as adoption evidence. (Chart: active accounts are not users.)
4. **The solver market is more distributed than in January, but re-concentrated in October.** Top-1 solver share of solver-side volume fell from {{top1_jan}} (Jan) to {{top1_oct}} (Oct), active solvers rose from {{solvers_jan}} to {{solvers_oct}}; top-5 share was {{top5_jul}} in Jul and {{top5_oct}} in Oct. Solver = account facing >= 100 distinct counterparties (heuristic). (Chart: solver concentration.)
5. **Value capture is thin.** Gross fees run {{gross_bps}} bps of reported volume; NEAR captures {{cap_share}} of that ({{cap_bps}} bps), and since 2026-02-23 spends it on buybacks, not burns. At {{near_px}} and total supply the market cap is {{mcap}}, so annualized captured revenue is {{yield}} of market cap. Even at 10x current volume it would be {{rev_10x}}, {{yield_10x}} of market cap. (Table: value-capture scenarios.)

## Strongest bear case

Volume is not user growth: intents/day moved {{ints_chg}} since August, accounts are single-use so adoption cannot be demonstrated, and the largest part of the growth story (Confidential Intents) cannot be audited on-chain. Fees are small relative to the token ({{yield}} yield), NEAR keeps only {{cap_share}} of gross fees (solvers and frontends keep the rest), the token is rarely a party to swaps ({{near_touch_oct}}), and gas demand is a rounding error ({{gas_ann}}). Solver concentration rebounded in October.

## What would change our mind (falsifiable)

These thresholds are our stated choices, evaluated on the pipeline's own series.
- More bullish on token value: captured revenue annualized above 2% of market cap for 90 days, **or** NEAR-touching volume above 10% for two consecutive months.
- More bearish on infrastructure: intents/day below 30,000 for 30 days **without** a matching rise in the implied confidential share, **or** top-5 solver share above 95% for two months.
- Adoption cannot be called until a user-level measure exists that is not per-swap accounts (repeat EVM/named accounts are the only retention signal available).

## Value-capture model

`pipeline/model.py`: annual volume x captured take rate / market cap, scenarios in `data/reference/model_assumptions.json` (volume multiples, take-rate multiples; edit and run `make model`). Observed inputs are computed; scenario multiples are assumptions. Market cap uses total supply (circulating would be lower, so the yields shown are conservative).

## Limits

Public events only; Confidential Intents volume is inferred as the gap to DefiLlama's total, and DefiLlama's volume derives from Dune, so it cross-checks our transcription but is not an independent source. Pipeline leg-sum matched DefiLlama within about 1% over the pre-confidential period (Apr 1 to Jul 6) when unpriced assets were imputed, and within 0 to 9% on recent Dune windows. See METHODOLOGY.md (pending).

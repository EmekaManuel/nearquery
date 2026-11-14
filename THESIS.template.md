# NearQuery: a data-backed thesis on NEAR Intents

> Rendered by `python -m pipeline.thesis` from `THESIS.template.md`; every number below is computed from the committed snapshots in `data/metrics/` and `data/reference/`. Cache: {{cache_start}} to {{cache_end}} ({{cache_days}} days, {{cache_missing}} missing). Public on-chain activity only.

## Claim

**Verdict: infrastructure yes, token value capture not yet.** It would flip if captured revenue held above {{t_yield}} of market cap for 90 days (today {{yield}}, so {{yield_gap}} the current level); the full list of triggers, with today's readings, is under "What would change our mind".

NEAR Intents is real settlement infrastructure (about {{net_vol_30d}} of public net swap volume in the 30-day window {{window}}, spread across a solver market that is less concentrated than in January), but the data does not yet show it creating material value for the NEAR token: captured revenue annualizes to {{rev_ann}} ({{yield}} of market cap), gas burned on `intents.near` is negligible ({{gas_ann}} a year), and only {{near_touch_oct}} of user volume involves NEAR itself. The verdict is **positive on infrastructure, neutral-to-weak on token value capture**, and even 10x current volume would yield only {{yield_10x}} of market cap per year.

## Findings

1. **Scale is real, and a third of it is invisible to us.** Public on-chain leg-sum was {{legsum_30d}} over {{window}}; net swap volume is half that ({{net_vol_30d}}). Comparing with DefiLlama's reported total implies about {{conf_share}} of volume is Confidential Intents, which events on-chain do not show. It is a residual, so read it as a rough share: before Confidential Intents launched, our public total matched DefiLlama's within {{recon_gap}} ({{recon_start}} to {{recon_end}}, daily correlation {{recon_corr}}; see Limits). **The residual is not smooth.** It was {{conf_before}} in the 14 days before {{break_date}} and {{conf_after}} in the 14 days after, and across that date public volume per day moved {{pub_chg}} while reported volume moved {{rep_chg}}.{{break_note}} (Charts: implied confidential share, daily volume. Figure: `model_observed.csv`.)
2. **Activity is falling while ticket size rises.** Intents per day went from {{ints_aug}} (Aug) to {{ints_oct}} (Oct), {{ints_chg}}, while leg-sum per intent rose from {{size_aug}} to {{size_oct}} ({{size_x}}). Cause only partly tested: intents per day were {{ints_pre}} in the 14 days before {{break_date}}, {{ints_post}} in the 14 days after, and {{ints_later}} over the following four weeks, so the fall continued after the implied confidential share appeared. That fits some migration of small flows to Confidential Intents, but it does not rule out larger trades or fewer bot-like swaps, and public volume per day fell by less than intents did. (Charts: intents per day, USD per intent.)
3. **Account counts are not users.** In Oct {{users_oct}} distinct accounts swapped, but only {{rep_oct}} were active on 2+ days (Sep {{rep_sep}}). Most accounts are single-use, so active-accounts and account-level retention cannot be used as adoption evidence. (Chart: active accounts are not users.)
4. **The solver market is more distributed than in January, but re-concentrated in October.** Top-1 solver share of solver-side volume fell from {{top1_jan}} (Jan) to {{top1_oct}} (Oct), active solvers rose from {{solvers_jan}} to {{solvers_oct}}; top-5 share was {{top5_jul}} in Jul and {{top5_oct}} in Oct. Solver = account facing >= 100 distinct counterparties (heuristic). (Chart: solver concentration.)
5. **Value capture is thin.** Gross fees run {{gross_bps}} bps of reported volume; NEAR captures {{cap_share}} of that ({{cap_bps}} bps), and since 2026-02-23 spends it on buybacks, not burns. At {{near_px}} and total supply the market cap is {{mcap}}, so annualized captured revenue is {{yield}} of market cap. Even at 10x current volume it would be {{rev_10x}}, {{yield_10x}} of market cap. (Table: value-capture scenarios.)

## Two cross-checks

- **Wash and bot screen.** Two stated rules (accounts with 50 or more swaps in a day, and volume swapped out and back in the same assets within a day) set aside {{wash_total}} of user volume in {{wash_month}}: {{wash_hf}} high-frequency and {{wash_rt}} round trips. So these two kinds do not materially inflate the headline volume. It is a screen, not a detector: it cannot see cycling across several accounts or across days. (Chart: wash and bot screen.)
- **Fee benchmark.** NEAR Intents' gross fees are {{near_fee_1m}} per $1M of volume, rank {{near_fee_rank}} of {{n_peers}} cross-chain protocols that DefiLlama lists with at least $100M of 30-day volume (median {{peer_median}}). NEAR keeps {{cap_share}} of that, about {{near_kept_1m}} per $1M. Fee definitions differ by protocol, so this is a rough guide, not like for like. (Chart: fees per $1M.)

## Strongest bear case

Volume is not user growth: intents/day moved {{ints_chg}} since August, accounts are single-use so adoption cannot be demonstrated, and the largest part of the growth story (Confidential Intents) cannot be audited on-chain; the step in the implied confidential share may even be a change in DefiLlama's series, not user behaviour. Fees are small relative to the token ({{yield}} yield), NEAR keeps only {{cap_share}} of gross fees (solvers and frontends keep the rest), the token is rarely a party to swaps ({{near_touch_oct}}), and gas demand is a rounding error ({{gas_ann}}). Solver concentration rebounded in October.

## Strongest bull case

- **Bigger tickets.** Leg-sum per intent rose {{size_x}} (from {{size_aug}} to {{size_oct}}) while intents per day fell, so fewer, larger trades may be replacing many small ones.
- **A less concentrated solver market.** Top-5 solver share fell from {{top5_jan}} in January to {{top5_oct}} in October, and active solvers rose from {{solvers_jan}} to {{solvers_oct}}.
- **Revenue is not read from public events.** Captured revenue is DefiLlama's reported figure, not a sum of the on-chain events we can see, so a fall in public activity does not by itself mean a fall in revenue. We cannot verify how fully it includes Confidential Intents.
- **A direct link from fees to token demand.** Since 2026-02-23 captured revenue funds buybacks, so every dollar of volume feeds the yield: 5x current volume gives {{yield_5x}} of market cap, 10x gives {{yield_10x}} (the dashboard's sliders let you test other values).

None of this shows the volume will arrive: the first point is a ratio and the fourth is a scenario, not evidence of growth.

## What would change our mind (falsifiable)

These thresholds are our stated choices, evaluated on the pipeline's own series. Today's readings are computed from the same data.

| Signal | Trigger | Today | Why this line |
| --- | --- | --- | --- |
| Captured revenue / market cap | above {{t_yield}} for 90 days (more bullish on token value) | {{yield}} | {{yield_gap}} today's level, i.e. {{yield_gap}} current volume at today's take rate and price: large enough to matter against market cap |
| NEAR-touching volume share | above {{t_touch}} for two consecutive months (more bullish on token value) | {{near_touch_oct}} (Oct), {{near_touch_sep}} (Sep) | about {{touch_gap}} today's level: NEAR would be a routine leg, not an edge case |
| Intents per day | below {{t_ints}} for 30 days, without a matching rise in the implied confidential share (more bearish on infrastructure) | {{ints_30d}} (last 30 days) | {{ints_below}} below the last 30 days: a clear break from the recent range |
| Top-5 solver share | above {{t_top5}} for two months (more bearish on infrastructure) | {{top5_oct}} (Oct), {{top5_sep}} (Sep) | close to January's {{top5_jan}}: the diversification since then would have reversed |

Any one trigger moves the verdict in the direction shown.

- Adoption cannot be called until a user-level measure exists that is not per-swap accounts (repeat EVM/named accounts are the only retention signal available).

## Value-capture model

`pipeline/model.py`: annual volume x captured take rate / market cap, scenarios in `data/reference/model_assumptions.json` (volume multiples, take-rate multiples; edit and run `make model`). Observed inputs are computed; scenario multiples are assumptions. Market cap uses total supply (circulating would be lower, so the yields shown are conservative).

## Limits

Public events only; Confidential Intents volume is inferred as the gap to DefiLlama's total, and DefiLlama's volume derives from Dune, so it cross-checks our transcription but is not an independent source. Reconciliation, recomputed on every build (`data/metrics/reconciliation.csv`): over {{recon_start}} to {{recon_end}} ({{recon_days}} days, before Confidential Intents launched) public leg-sum was {{recon_ratio}} of DefiLlama's reported volume with unpriced assets imputed and {{recon_priced}} without imputation, with a daily correlation of {{recon_corr}} and a median daily gap of {{recon_median}}. Comparisons with Dune's dashboard were transcribed by hand and are not used in any figure. See [METHODOLOGY.md](METHODOLOGY.md).

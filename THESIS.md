# NearQuery: a data-backed thesis on NEAR Intents

> Rendered by `python -m pipeline.thesis` from `THESIS.template.md`; every number below is computed from the committed snapshots in `data/metrics/` and `data/reference/`. Cache: 2026-01-01 to 2026-10-28 (301 days, 0 missing). Public on-chain activity only.

## Claim

**Verdict: infrastructure yes, token value capture not yet.** It would flip if captured revenue held above 2% of market cap for 90 days (today 0.43%, so 4.7x the current level); the full list of triggers, with today's readings, is under "What would change our mind".

NEAR Intents is real settlement infrastructure (about $1.30B of public net swap volume in the 30-day window 2026-09-29 to 2026-10-28, spread across a solver market that is less concentrated than in January), but the data does not yet show it creating material value for the NEAR token: captured revenue annualizes to $26.2M (0.43% of market cap), gas burned on `intents.near` is negligible ($118k a year), and only 1.9% of user volume involves NEAR itself. The verdict is **positive on infrastructure, neutral-to-weak on token value capture**, and even 10x current volume would yield only 4.3% of market cap per year.

## Findings

1. **Scale is real, and a third of it is invisible to us.** Public on-chain leg-sum was $2.59B over 2026-09-29 to 2026-10-28; net swap volume is half that ($1.30B). Comparing with DefiLlama's reported total implies about 35% of volume is Confidential Intents, which events on-chain do not show. It is a residual, so read it as a rough share: our public total matched DefiLlama within 0 to 9% on recent windows (see Limits). (Chart: daily volume. Figure: `model_observed.csv`.)
2. **Activity is falling while ticket size rises.** Intents per day went from 108,590 (Aug) to 52,004 (Oct), -52%, while leg-sum per intent rose from $821 to $1,573 (1.9x). Cause untested: migration of small flows to Confidential Intents, larger trades, or fewer bot-like swaps. (Charts: intents per day, USD per intent.)
3. **Account counts are not users.** In Oct 328,309 distinct accounts swapped, but only 0.22% were active on 2+ days (Sep 0.05%). Most accounts are single-use, so active-accounts and account-level retention cannot be used as adoption evidence. (Chart: active accounts are not users.)
4. **The solver market is more distributed than in January, but re-concentrated in October.** Top-1 solver share of solver-side volume fell from 66% (Jan) to 32% (Oct), active solvers rose from 24 to 34; top-5 share was 74% in Jul and 90% in Oct. Solver = account facing >= 100 distinct counterparties (heuristic). (Chart: solver concentration.)
5. **Value capture is thin.** Gross fees run 15.9 bps of reported volume; NEAR captures 34% of that (5.4 bps), and since 2026-02-23 spends it on buybacks, not burns. At $4.66 and total supply the market cap is $6.11B, so annualized captured revenue is 0.43% of market cap. Even at 10x current volume it would be $261.6M, 4.3% of market cap. (Table: value-capture scenarios.)

## Strongest bear case

Volume is not user growth: intents/day moved -52% since August, accounts are single-use so adoption cannot be demonstrated, and the largest part of the growth story (Confidential Intents) cannot be audited on-chain. Fees are small relative to the token (0.43% yield), NEAR keeps only 34% of gross fees (solvers and frontends keep the rest), the token is rarely a party to swaps (1.9%), and gas demand is a rounding error ($118k). Solver concentration rebounded in October.

## Strongest bull case

- **Bigger tickets.** Leg-sum per intent rose 1.9x (from $821 to $1,573) while intents per day fell, so fewer, larger trades may be replacing many small ones.
- **A less concentrated solver market.** Top-5 solver share fell from 97% in January to 90% in October, and active solvers rose from 24 to 34.
- **Revenue is not read from public events.** Captured revenue is DefiLlama's reported figure, not a sum of the on-chain events we can see, so a fall in public activity does not by itself mean a fall in revenue. We cannot verify how fully it includes Confidential Intents.
- **A direct link from fees to token demand.** Since 2026-02-23 captured revenue funds buybacks, so every dollar of volume feeds the yield: 5x current volume gives 2.1% of market cap, 10x gives 4.3% (the dashboard's sliders let you test other values).

None of this shows the volume will arrive: the first point is a ratio and the fourth is a scenario, not evidence of growth.

## What would change our mind (falsifiable)

These thresholds are our stated choices, evaluated on the pipeline's own series. Today's readings are computed from the same data.

| Signal | Trigger | Today | Why this line |
| --- | --- | --- | --- |
| Captured revenue / market cap | above 2% for 90 days (more bullish on token value) | 0.43% | 4.7x today's level, i.e. 4.7x current volume at today's take rate and price: large enough to matter against market cap |
| NEAR-touching volume share | above 10% for two consecutive months (more bullish on token value) | 1.9% (Oct), 2.0% (Sep) | about 5x today's level: NEAR would be a routine leg, not an edge case |
| Intents per day | below 30,000 for 30 days, without a matching rise in the implied confidential share (more bearish on infrastructure) | 54,647 (last 30 days) | 45% below the last 30 days: a clear break from the recent range |
| Top-5 solver share | above 95% for two months (more bearish on infrastructure) | 90% (Oct), 80% (Sep) | close to January's 97%: the diversification since then would have reversed |

Any one trigger moves the verdict in the direction shown.

- Adoption cannot be called until a user-level measure exists that is not per-swap accounts (repeat EVM/named accounts are the only retention signal available).

## Value-capture model

`pipeline/model.py`: annual volume x captured take rate / market cap, scenarios in `data/reference/model_assumptions.json` (volume multiples, take-rate multiples; edit and run `make model`). Observed inputs are computed; scenario multiples are assumptions. Market cap uses total supply (circulating would be lower, so the yields shown are conservative).

## Limits

Public events only; Confidential Intents volume is inferred as the gap to DefiLlama's total, and DefiLlama's volume derives from Dune, so it cross-checks our transcription but is not an independent source. Pipeline leg-sum matched DefiLlama within about 1% over the pre-confidential period (Apr 1 to Jul 6) when unpriced assets were imputed, and within 0 to 9% on recent Dune windows. See [METHODOLOGY.md](METHODOLOGY.md).

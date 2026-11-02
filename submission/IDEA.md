# Submission "idea" field (20 to 2000 characters; 1380 used; draft, not submitted)

The problem: the investment case for NEAR leans on NEAR Intents becoming real cross-chain settlement, but most claims about it are conviction, not evidence.

What I built: NearQuery, a data-backed thesis anyone can re-run. A pipeline reads the NEAR mainnet event logs of intents.near (NEP-297 token_diff events) and computes volume, intents, accounts, solver concentration and how often NEAR itself is traded, with committed DuckDB SQL. A value-capture model turns Intents revenue into a buyback yield on NEAR's market cap. A static dashboard shows each chart with its date range, source and the code behind it, plus sliders to stress-test the model. THESIS.md is rendered from the pipeline output, so every number is computed, and it lists what evidence would change the verdict.

What it finds: Intents looks like real settlement infrastructure, but captured revenue is small against NEAR's market cap and the token is rarely a leg of the swaps. It also states its limits: Confidential Intents are invisible on-chain, and the implied confidential share is a residual that may partly reflect a change in a third-party data series.

How NEAR fits: the whole analysis is of NEAR's own chain: intents.near settlement, NEP-141 and NEP-245 assets, and the revenue buyback that links fees to demand for NEAR. Reproduce it with make setup rebuild thesis; no accounts or keys are needed.

// Chart registry: one entry per chart. Plain data only, so server pages can hand it to client components.
export type FmtKind = "usd" | "usd0" | "num" | "frac0" | "pu1" | "pu2"
export type Dataset = "daily" | "weekly" | "monthly" | "flows" | "scenarios"

export interface SeriesDef { key: string; label: string; color: string }
export interface ChartDef {
  id: string
  group: "activity" | "market" | "value"
  title: string
  /** One short line for the index card; no figures (those come from the data). */
  blurb: string
  note?: string
  kind: "line" | "bar" | "table"
  dataset: Dataset
  xKey?: string
  xFmt?: "month"
  series?: SeriesDef[]
  fmt: FmtKind
  ranged?: boolean
  markers?: boolean
  warn?: boolean
  source: string
  /** Files in pipeline/sql shown on the chart's page; the first is the metric query. */
  sql: string[]
  /** Extra source files (relative to repo root) shown after the SQL. */
  extraFiles?: string[]
  csv?: string
  definition: string
  method: string[]
  caveats: string[]
}

const CHAIN = "BigQuery public NEAR dataset (execution_outcomes, intents.near logs); prices from DefiLlama coins API."

export const CHARTS: ChartDef[] = [
  {
    id: "daily-volume", blurb: "Both sides of every public swap, in USD, per day.", group: "activity", title: "Daily volume, public on-chain", kind: "line", dataset: "daily", xKey: "date", ranged: true,
    note: "Leg-sum: both sides of every swap, the definition NEAR reports. Net swap volume is about half. Confidential Intents are not visible here.",
    series: [{ key: "legSum", label: "Leg-sum (USD)", color: "var(--chart-1)" }], fmt: "usd", source: CHAIN,
    sql: ["10_daily_volume.sql", "00_setup.sql"], csv: "daily_volume",
    definition: "The sum, in USD, of every positive token_diff leg on successful intents settled through intents.near. A swap has a user entry and a solver entry, so both sides are counted. This reproduces the volume figure NEAR and DefiLlama publish for public intents. Net swap volume, the value that actually changed hands, is half of it.",
    method: [
      "Parse NEP-297 EVENT_JSON logs emitted by intents.near and keep token_diff events from successful receipts.",
      "Unnest each entry's signed diff map into one row per account and asset (table legs).",
      "Convert amounts with the asset's decimals and the daily DefiLlama price; stablecoins are fixed at $1.00.",
      "For an entry with exactly one unpriced asset, impute its value as minus the sum of the priced legs, only when the sign matches. Imputed value is stored in its own column and not mixed silently.",
      "Sum positive legs per UTC day.",
    ],
    caveats: ["Confidential Intents (GA 2026-07-07) are invisible on-chain, so a fall here can be migration, not a decline in total use.", "History starts 2026-01-01; nothing earlier is pulled.", "The newest day is partial and dropped.", "Legs still without a value after imputation make this a lower bound (see unvalued_pos_legs in the CSV)."],
  },
  {
    id: "intents-per-day", blurb: "How many distinct intents settle each day.", group: "activity", title: "Intents per day", kind: "line", dataset: "daily", xKey: "date", ranged: true,
    series: [{ key: "intents", label: "Intents", color: "var(--chart-2)" }], fmt: "num", source: "BigQuery public NEAR dataset (token_diff events).",
    sql: ["10_daily_volume.sql", "00_setup.sql"], csv: "daily_volume",
    definition: "Distinct intent hashes on successful token_diff events per UTC day. One intent is one signed user instruction; a swap settles when a solver's intent matches it.",
    method: ["Same legs table as daily volume.", "count(DISTINCT intent_hash) over non-failed entries, grouped by date."],
    caveats: ["Public intents only.", "Mean intents per day moved {{intentsChg}} from August to October while average size rose; the cause is untested."],
  },
  {
    id: "usd-per-intent", blurb: "Average ticket size: volume divided by intents.", group: "activity", title: "Average leg-sum per intent", kind: "line", dataset: "daily", xKey: "date", ranged: true,
    note: "Rises while intent count falls; cause untested.",
    series: [{ key: "usdPerIntent", label: "USD per intent", color: "var(--chart-2)" }], fmt: "usd0", source: CHAIN,
    sql: ["10_daily_volume.sql", "00_setup.sql"], csv: "daily_volume",
    definition: "Daily leg-sum divided by daily intents. A rough measure of ticket size; it counts both sides of the swap, so the value a user actually swaps is about half.",
    method: ["leg_sum_usd / intents from the daily volume query, computed in dashboard/build.py."],
    caveats: ["Ratio of two public-only series; a shift of small flows to Confidential Intents would raise it with no change in behaviour.", "Imputed legs are included in the numerator."],
  },
  {
    id: "accounts-not-users", blurb: "How many swapping accounts come back on a second day.", group: "activity", title: "Accounts are not users", kind: "line", dataset: "monthly", xKey: "month", xFmt: "month", markers: true, warn: true,
    note: "{{oneDay}} of {{implicit}} implicit accounts are active on exactly one day. Below: the share of accounts active on 2 or more days within a month.",
    series: [{ key: "repeatPct", label: "Active 2+ days (%)", color: "var(--chart-2)" }], fmt: "pu2", source: "pipeline/sql/76_user_stickiness.sql and 77_account_quality.sql. Months under 28 cached days are gaps.",
    sql: ["76_user_stickiness.sql", "77_account_quality.sql", "00_setup.sql"], csv: "user_stickiness",
    definition: "Among user accounts (non-solver) that swapped in a month, the share that transacted on at least two distinct days. Since April, {{oneDay}} of {{implicit}} 64-hex implicit accounts are active on exactly one day and {{singleEntry}} have a single entry, consistent with per-swap deposit accounts. Account counts and account-level retention therefore cannot measure adoption.",
    method: ["Classify accounts as solver or user (>= 100 distinct counterparties = solver).", "For each user account count distinct active days within the month.", "Report the share with 2+ days, 5+ days, and the top-100 volume share."],
    caveats: ["Mechanism (single-use deposit accounts) is inferred from behaviour and not yet confirmed against the Intents documentation.", "Repeat EVM and named accounts are the only retention signal available."],
  },
  {
    id: "solver-concentration", blurb: "How much volume the largest solvers handle.", group: "market", title: "Solver concentration", kind: "line", dataset: "monthly", xKey: "month", xFmt: "month", markers: true,
    note: "Share of solver-side volume. Solver = account facing 100+ distinct counterparties (heuristic).",
    series: [{ key: "top1", label: "Top 1", color: "var(--chart-1)" }, { key: "top5", label: "Top 5", color: "var(--chart-2)" }], fmt: "frac0",
    source: "pipeline/sql/71_solver_concentration.sql. Months under 28 cached days are gaps.", sql: ["71_solver_concentration.sql", "00_setup.sql"], csv: "solver_concentration",
    definition: "For each month, the share of positive-leg volume held by solver accounts that belongs to the largest solver (Top 1) and to the five largest (Top 5). The CSV also carries an HHI.",
    method: ["Pair receipts with exactly two accounts (one user, one solver).", "Mark an account as solver if it faced at least 100 distinct counterparties over the cache.", "Rank solvers by monthly positive-leg volume and take the share of the total."],
    caveats: ["The solver label is a heuristic, not an on-chain flag.", "Volume attribution counts every positive leg, so the same swap contributes to both its user and solver."],
  },
  {
    id: "active-solvers", blurb: "How many solver accounts are active each month.", group: "market", title: "Active solvers", kind: "line", dataset: "monthly", xKey: "month", xFmt: "month", markers: true,
    series: [{ key: "solvers", label: "Solvers", color: "var(--chart-2)" }], fmt: "num", source: "pipeline/sql/71_solver_concentration.sql.",
    sql: ["71_solver_concentration.sql", "00_setup.sql"], csv: "solver_concentration",
    definition: "Distinct solver accounts with at least one positive leg in the month.",
    method: ["Same solver classification as the concentration chart.", "count(*) of solver accounts per month."],
    caveats: ["An operator running several accounts counts several times.", "Months under 28 cached days are gaps."],
  },
  {
    id: "near-touch", blurb: "How much user volume has NEAR on one side.", group: "market", title: "User volume touching NEAR itself", kind: "line", dataset: "monthly", xKey: "month", xFmt: "month", markers: true,
    note: "Share of user-received volume where NEAR, wNEAR or stNEAR is sold or bought.",
    series: [{ key: "nearTouchPct", label: "NEAR-touching (%)", color: "var(--chart-3)" }], fmt: "pu1", source: "pipeline/sql/85_near_touch.sql.",
    sql: ["85_near_touch.sql", "00_setup.sql"], csv: "near_touch",
    definition: "The share of user-received volume in swaps where either side is NEAR, wNEAR or stNEAR. It indicates how much of Intents activity creates direct demand for the NEAR token.",
    method: ["Take user-side entries of two-account swaps.", "Flag entries whose legs include a NEAR-family symbol.", "Divide the flagged bought-leg USD by the total."],
    caveats: ["Only public swaps; confidential swaps are not visible.", "Does not include indirect demand such as users funding gas."],
  },
  {
    id: "confidential-residual", blurb: "Volume that public events cannot account for, by week.", group: "market", title: "Implied confidential share, weekly", kind: "line", dataset: "weekly", xKey: "week", warn: true,
    note: "Share of DefiLlama's reported volume that public on-chain events do not account for. A residual, not a measurement.",
    series: [{ key: "confidentialPct", label: "Implied confidential (%)", color: "var(--chart-1)" }], fmt: "pu1",
    source: "pipeline/model.py (confidential_residual), from public leg-sum and DefiLlama's reported volume.",
    sql: ["10_daily_volume.sql", "00_setup.sql"], extraFiles: ["pipeline/model.py"], csv: "confidential_weekly",
    definition: "One minus public on-chain leg-sum divided by DefiLlama's reported volume, by week. It is near zero until the end of August, then steps up around {{breakDate}} and keeps rising. Only this derived ratio is published, never DefiLlama's own series.",
    method: ["Take public leg-sum per day from the pipeline (priced plus imputed legs).", "Divide by DefiLlama's reported volume for the same days and take one minus the ratio.", "Aggregate by Monday-start week and keep full weeks only."],
    caveats: ["The step lands on {{breakDate}}, a month boundary, while public volume does not fall at the same time, so it can reflect DefiLlama adding volume to its series, not only users moving to Confidential Intents. This chart cannot separate the two.", "Small negative values before September are noise around zero: the two sources agree within about 1% there.", "Confidential Intents reached general availability on 2026-07-07, two months before this series moves."],
  },
  {
    id: "top-flows", blurb: "Which chain pairs carry the most volume.", group: "market", title: "Top flows, latest full month", kind: "bar", dataset: "flows",
    note: "Origin chain of asset sold → asset bought, USD of bought leg.", fmt: "usd0", source: "pipeline/sql/80_chain_pairs.sql.",
    sql: ["80_chain_pairs.sql", "00_setup.sql"], csv: "chain_pairs",
    definition: "Monthly user-side volume grouped by the origin chain of the asset sold and of the asset bought. Shows which chain pairs dominate settlement.",
    method: ["Take user-side entries of two-account swaps.", "Origin chain comes from the asset id (omft prefix or bridge), see pipeline/assets.py.", "Sum the bought leg's USD value per month and pair."],
    caveats: ["HOT Omni assets are mapped only for the EVM chain ids we can be sure of.", "Swaps whose bought leg is unpriced are counted separately (unvalued_swaps)."],
  },
  {
    id: "value-scenarios", blurb: "What volume a buyback would need to matter.", group: "value", title: "What volume would it take?", kind: "table", dataset: "scenarios", fmt: "usd",
    source: "pipeline/model.py. Observed inputs are computed; multiples are assumptions.", sql: [], extraFiles: ["pipeline/model.py", "data/reference/model_assumptions.json"], csv: "model_scenarios",
    definition: "Annual buyback if volume and the captured take rate scale from today's observed values, against a market cap held at today's. NEAR's captured revenue funds a buyback of $NEAR (not a burn) since 2026-02-23.",
    method: ["Observed: 30-day window of reported volume, gross fees and captured revenue from DefiLlama (fetched at build, not stored), gas burned from the pipeline, spot price and total supply from chain state.", "Scenarios multiply annualized volume and take rate by the multiples in model_assumptions.json.", "Market cap uses total supply, so yields are conservative."],
    caveats: ["Fees and revenue come from DefiLlama; they cannot be derived from on-chain events (the protocol fee is about 0.0001%).", "Scenario multiples are assumptions, not forecasts."],
  },
]

export const byId = (id: string): ChartDef => {
  const c = CHARTS.find((x) => x.id === id)
  if (!c) throw new Error(`unknown chart ${id}`)
  return c
}
export const inGroup = (g: ChartDef["group"]): ChartDef[] => CHARTS.filter((c) => c.group === g)

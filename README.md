<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/logos/nearquery-lockup-dark.svg">
    <img src="brand/logos/nearquery-lockup.svg" alt="NearQuery" width="320">
  </picture>
</p>

# NearQuery

**Ask the chain. Show the work.**

NearQuery is a data-backed, re-runnable investment thesis on NEAR, built for the NEAR Hackathon thesis track. It asks one question of on-chain data: is NEAR Intents becoming real cross-chain settlement, and does that create value for the NEAR token? The answer follows the data, including where it is negative.

- **Thesis:** [THESIS.md](THESIS.md) has the claim, five findings each tied to a chart and a number, the strongest bear case, falsifiable "what would change our mind" thresholds, and a value-capture model with editable assumptions. Every number in it is rendered by code from the committed snapshots.
- **Dashboard:** a static Next.js site. Every chart has its own page with its definition, caveats, the exact SQL that produced it, and a CSV download.
- **Method and limits:** [METHODOLOGY.md](METHODOLOGY.md) lists sources, metric definitions, known gaps and cross-checks.

Public on-chain data only. Read-only: no wallets, keys, contracts or transactions. Not financial advice.

## Try it (about 10 minutes, no accounts or keys)

Needs: `make`, [uv](https://docs.astral.sh/uv/), Python 3.12, Node 20+, internet access (DefiLlama API and Google Fonts at build time).

| # | Do | See |
| --- | --- | --- |
| 1 | `make setup` | Pinned Python dependencies install into `.venv` (uv, frozen lockfile). |
| 2 | `make rebuild` | Re-fetches DefiLlama volume, fees and revenue, reruns the value-capture model (a table of observed inputs prints), emits `dashboard/data/dashboard.json`, then builds the site: `Generating static pages (15/15)`. |
| 3 | `make thesis`, then `git diff THESIS.md` (or `diff` against the file you started with) | The thesis is re-rendered from the metrics. The diff is empty: every number is reproducible. |
| 4 | `npx serve dashboard/out`, open the printed URL | The overview: verdict, five headline figures (each with its date range), and the daily volume chart. |
| 5 | On any chart click **Open ↗** | The chart's page: definition, how it is computed, caveats, the SQL (with a Copy button) and a CSV link. |
| 6 | Edit `volume_multiples` in `data/reference/model_assumptions.json`, then `make model thesis dashboard` | The scenario table on the **Value capture** page and in THESIS.md changes. Assumptions are inputs, not hidden constants. |

Optional, full rebuild from raw chain data (needs your own Google Cloud project on the free BigQuery sandbox, no billing):

```bash
cp .env.example .env            # set GOOGLE_CLOUD_PROJECT
gcloud auth application-default login
make extract-logs reference metrics model thesis dashboard
```

Each BigQuery chunk is dry-run first and refuses to exceed `--max-gb`; cached days are never re-queried. The raw cache (`data/raw/`) is not committed; the derived metric CSVs in `data/metrics/` and the SQL in `pipeline/sql/` are.

## What is in the repository

| Path | What it is |
| --- | --- |
| `pipeline/` | Extraction (`extract_bq.py`), event parsing, asset metadata, prices, metrics runner, value-capture model, thesis renderer. |
| `pipeline/sql/` | DuckDB SQL: base tables (`00_setup.sql`) and one file per metric. These are the queries shown on the chart pages. |
| `data/metrics/` | Committed daily and monthly metric snapshots (CSV). |
| `data/reference/` | Asset metadata, model assumptions and a NEAR supply snapshot. DefiLlama series are not committed (see below). |
| `dashboard/` | Next.js + TypeScript + Radix + Recharts static site. `dashboard/lib/charts.ts` is the chart registry. |
| `THESIS.template.md` | Thesis text with `{{placeholders}}`; `pipeline/thesis.py` fills them from the metrics. |
| `brand/` | NearQuery brand package (tokens, logos, social card). |
| `.github/workflows/dashboard.yml` | Daily rebuild of the site from committed snapshots plus a fresh DefiLlama pull. |

## Data sources and terms

On-chain figures come from the public BigQuery dataset of NEAR mainnet, parsed from `intents.near` event logs. Prices, reported volume, fees and revenue come from DefiLlama's free API. DefiLlama's terms forbid republishing their data, so those series are **fetched at build time and never committed or displayed raw**; the repository holds only derived aggregates. The NEAR Explorer API is deliberately not used (its terms do not allow this use). Full details, including the reconciliation against reported volume, are in METHODOLOGY.md.

## Known limits

- Confidential Intents (generally available since 2026-07-07) are not visible in on-chain events. The dashboard shows public activity only, and the implied confidential share is an inference.
- The on-chain cache covers every day from 2026-01-01 to the cutoff shown on each chart (no missing days); earlier history is not pulled.
- Account counts are not user counts: nearly every account is used on a single day. The thesis treats this as a measurement limit.

## Hackathon disclosures

- **Window:** all code, SQL and prose in this repository was written on or after 2026-10-19. There is no pre-window baseline. Releases are marked with the tags `pre-hackathon` (the repository's first commit) and `hackathon-submission`; the diff between them is `https://github.com/EmekaManuel/nearquery/compare/pre-hackathon...hackathon-submission`.
- **AI-generated code:** most of the code, SQL, tests-by-reproduction and prose was written with Claude Code (Anthropic) and reviewed by the author.
- **Libraries and tools:** see [LIBRARIES.md](LIBRARIES.md) (generated from the lockfiles).
- **Other project:** [Wucant](https://github.com/EmekaManuel/wucant) is the author's other NEAR Hackathon entry. The two projects are independent. This repository was built from scratch and does not import or vendor Wucant code.
- **License:** MIT, see [LICENSE](LICENSE).

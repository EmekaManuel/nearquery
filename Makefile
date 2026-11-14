UV ?= uv
RUN = $(UV) run --frozen python -m

.PHONY: all test video thesis setup extract-logs extract-flows reference metrics model dashboard rebuild

setup:
	$(UV) sync --frozen

# Re-pull raw data from BigQuery (optional, needs your own project + ADC; see .env.example).
# Dry-runs every chunk first and refuses to exceed --max-gb. Cached chunks are never re-scanned.
# Logs are the primary source (swaps, deposits and withdrawals all come from intents.near event logs).
extract-logs:
	$(RUN) pipeline.extract_bq logs --start 2026-01-01 --end 2026-10-29 --max-gb 400

# Cross-check only: ft_events deposit/withdraw flows for one month (costs far more for early-2025 months).
extract-flows:
	$(RUN) pipeline.extract_bq flows --start 2026-10-01 --end 2026-10-29 --max-gb 20

# --- Rebuild everything from committed snapshots; no accounts or keys needed (raw cache optional) ---
# Reference data (asset metadata/prices/DefiLlama series) is committed; these targets refresh it from public APIs.
reference:
	$(RUN) pipeline.assets
	$(RUN) pipeline.prices --start 2025-01-01
	$(RUN) pipeline.defillama

# Needs the raw cache (make extract-logs). Writes data/metrics/*.csv
metrics:
	$(RUN) pipeline.metrics

model:
	$(RUN) pipeline.model

# Emit dashboard/data/dashboard.json, then render the static Next.js site to dashboard/out (needs Node 20+)
dashboard:
	$(RUN) dashboard.build
	cd dashboard && npm ci --no-audit --no-fund && npm run build

# Judges: `make setup rebuild` regenerates the model outputs and dashboard from the committed data/metrics CSVs.
rebuild:
	$(RUN) pipeline.defillama   # re-fetch the DefiLlama series (not committed, see METHODOLOGY)
	$(RUN) pipeline.peers       # fees per $1M against other cross-chain protocols (derived ratios only)
	$(MAKE) model dashboard

test:
	$(UV) run --frozen pytest -q

thesis:
	$(RUN) pipeline.thesis

# One command: install pinned deps, rebuild model + dashboard from committed snapshots, re-render the thesis.
all: setup rebuild thesis

# Demo video (needs ffmpeg, vhs, and `npm i` in demo/). Rebuilds numbers, footage and renders to demo/out/.
video:
	$(MAKE) rebuild
	$(RUN) pipeline.video_numbers
	bash demo/scripts/make_video.sh

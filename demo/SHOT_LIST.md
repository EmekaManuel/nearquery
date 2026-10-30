# NearQuery demo video: shot list (draft, awaiting OK)

Target: 84 s, 1920x1080, 30 fps, MP4 (H.264, yuv420p), no voiceover. Paper theme. Three outputs: captioned MP4, caption-free MP4, `.srt`.

## Rules for every number on screen
Numbers are never typed. `pipeline/video_numbers.py` (new) writes `demo/out/numbers.json` from the same code that renders THESIS.md. Remotion cards and captions read that file. Before recording, a check script opens the hosted dashboard and asserts each number string appears on the page; if the hosted site and the pipeline disagree (for example the daily Action pulled newer DefiLlama fees), it stops and tells me, instead of shipping a mismatch.

## Timeline

| # | Time | Visual | Caption (text from numbers.json where in `{braces}`) | Source of footage |
| --- | --- | --- | --- | --- |
| 1 | 0:00 to 0:07 | Hook card, Paper ground, Space Grotesk. Lens mark draws in. | "Is NEAR Intents real settlement?" then "And does it create value for NEAR?" | Remotion |
| 2 | 0:07 to 0:15 | Hosted overview: verdict box, then the figure tiles. Slow pause on each. | "The data's answer, up front: real infrastructure, thin value for the token." | Playwright (hosted site) |
| 3 | 0:15 to 0:32 | **Finding 1.** Overview chart "Daily volume". Click 90d, then All; hover a peak; pause on the Feb to Mar gap. | "{net_vol_30d} net swap volume, {window}. About {conf_share} of reported volume is invisible on-chain (confidential). The gap is days not yet pulled." | Playwright |
| 4 | 0:32 to 0:49 | **Finding 2.** Activity, "Accounts are not users" chart, hover the last point. Click **Open ↗**, scroll to the SQL, click Copy. | "Only {rep_oct} of {users_oct} accounts were active on 2+ days in October. Account counts can't prove adoption. Every chart ships its SQL." | Playwright |
| 5 | 0:49 to 1:04 | **Finding 3.** Value capture page: scenario table, pause on the 1x row, then 10x. | "Captured revenue: {rev_ann} a year, {yield} of market cap. Even 10x today's volume: {yield_10x}." | Playwright |
| 6 | 1:04 to 1:16 | Terminal (VHS, Terminal theme): the single re-run command, build output scrolling, then `git diff --stat THESIS.md` printing nothing. Real `make all` run, idle time trimmed, speed-up measured and labelled (currently 1.6x). | "One command re-runs the whole thesis. No accounts, no keys. The numbers don't move." | VHS |
| 7 | 1:16 to 1:24 | Outro: lockup, tagline, repo URL `github.com/EmekaManuel/nearquery`. | "Ask the chain. Show the work." | Remotion |

Captions: Plex Sans, ink on a Paper strip at the bottom, at most two lines, each on screen at least 3 s and no faster than 17 characters per second. The `.srt` uses the same timing data.

## How it is built
1. `demo/` is its own folder with its own `package.json` (Playwright, Remotion), separate from the dashboard's dependencies.
2. `record_site.ts`: Playwright, 1920x1080 video context, scripted scrolls and hovers with deliberate pauses, against `https://emekamanuel.github.io/nearquery/`. Output: `.webm`.
3. `rerun.tape`: VHS script for the terminal segment (Terminal theme colours from `tokens.json`).
4. Remotion composition `NearQueryDemo`: hook card, clips via `OffthreadVideo`, captions, outro. Fonts: Space Grotesk, IBM Plex Sans and Mono through `@remotion/google-fonts`. Colours read from `brand/tokens.json`. Logos from `brand/logos/`. Two renders: with and without captions.
5. ffmpeg: normalise the Playwright and VHS clips to 1080p30, speed up the terminal clip, final encode (H.264, yuv420p, CRF 18, faststart, silent), then verify duration under 90 s, size and codec with ffprobe.
6. Outputs in `demo/out/`: `nearquery-demo.mp4`, `nearquery-demo-nocaptions.mp4`, `nearquery-demo.srt`, `numbers.json`. `demo/out/` and `node_modules` get gitignored; the scripts and this file can be committed.
7. `make video` rebuilds everything, so the video can be regenerated when the data changes.

## Needs your OK or a decision
1. **Install tools:** `brew install ffmpeg vhs` (pulls `ttyd`), plus `npm i` for Playwright, Chromium and Remotion inside `demo/` (about 300 MB of downloads).
2. **`make all` does not exist.** The Makefile has `make setup rebuild thesis`. I would add `all: setup rebuild thesis` (one line). Or tell me to show the three-target form on screen instead.
3. **Terminal segment is sped up** (the real run takes about 55 s) and labelled as such. Say if you would rather show it real-time and cut the outro shorter.
4. **When to record.** The Feb 9 to Mar 20 gap is still visible in the charts, and a refill after Nov 1 may shift monthly numbers. Recording after the refill avoids a re-record; recording now is fine since `make video` regenerates it. Your call.
5. **Theme:** Paper for the site footage and Terminal for the terminal clip. Say if you want one theme throughout.
6. Nothing is posted or uploaded, and nothing is committed without your OK.

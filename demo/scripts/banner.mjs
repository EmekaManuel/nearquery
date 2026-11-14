// Renders docs/img/banner.png for the README from the same numbers the video uses (demo/out/numbers.json) and the
// weekly implied-confidential-share snapshot, so the banner cannot drift from the data.
//   python -m pipeline.video_numbers && node demo/scripts/banner.mjs      (run from the repo root; needs `npm ci` in demo/)
import { chromium } from "playwright"
import { readFileSync, mkdirSync } from "node:fs"

const N = JSON.parse(readFileSync("demo/out/numbers.json", "utf8"))
const rows = readFileSync("data/metrics/confidential_weekly.csv", "utf8").trim().split("\n").slice(1).map((l) => l.split(","))
const xs = rows.map((r) => r[0]), ys = rows.map((r) => parseFloat(r[2]) * 100)
const fired = N.triggers_today.startsWith("none") ? "0" : N.triggers_today.split(" ")[0] // from thesis.keys(), not typed
const mark = readFileSync("brand/logos/nearquery-mark.svg", "utf8")

const W = 560, H = 200, pad = 8, top = Math.max(...ys) * 1.1, lo = Math.min(0, ...ys)
const px = (i) => pad + (i / (ys.length - 1)) * (W - 2 * pad)
const py = (v) => H - pad - ((v - lo) / (top - lo)) * (H - 2 * pad)
const line = ys.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ")
const bi = xs.findIndex((d) => d >= N.step_week)
const last = ys.length - 1

const html = `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3efe6;--card:#fbf9f4;--rule:#cfc7b5;--ink:#17160f;--muted:#5b5648;--signal:#d9461a;--signal-text:#a8320f}
*{box-sizing:border-box;margin:0}
body{width:1600px;height:560px;background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;position:relative;overflow:hidden}
.mono{font-family:'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
.left{position:absolute;left:72px;top:40px;width:820px}
.eyebrow{display:flex;align-items:center;gap:18px;font-size:19px;color:var(--muted)}
.eyebrow svg{width:46px;height:46px}
h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:82px;line-height:1;letter-spacing:-.035em;margin:22px 0 16px}
.sub{font-size:23px;line-height:1.35;color:var(--muted);max-width:780px}
.verdict{margin-top:22px;background:var(--card);border:1px solid var(--rule);border-left:6px solid var(--signal);padding:14px 24px;width:780px}
.verdict .mono{font-size:15px;color:var(--signal-text)}
.verdict b{display:block;font-family:'Space Grotesk',sans-serif;font-size:32px;line-height:1.15;letter-spacing:-.015em;margin-top:4px}
.right{position:absolute;right:72px;top:44px;width:560px}
.chart{background:var(--card);border:1px solid var(--rule);padding:18px 20px 12px}
.chart .mono{font-size:14px;color:var(--muted)}
.chart svg{display:block;margin-top:6px}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
.tile{background:var(--card);border:1px solid var(--rule);padding:14px 16px}
.tile b{display:block;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:40px;letter-spacing:-.03em}
.tile span{display:block;font-size:15px;line-height:1.25;color:var(--muted);margin-top:4px}
.foot{position:absolute;left:0;right:0;bottom:0;height:56px;background:var(--ink);color:#eeeae0;display:flex;align-items:center;justify-content:space-between;padding:0 72px;font-size:16px}
.foot i{font-style:normal;color:#ff8a63}
</style>
<div class="left">
  <div class="eyebrow mono">${mark}<span>NearQuery · NEAR HACKATHON · Investment Thesis track</span></div>
  <h1>Ask the chain.<br>Show the work.</h1>
  <p class="sub">A re-runnable investment thesis on NEAR Intents. Every number is computed by code, with the four signals that would prove it wrong.</p>
  <div class="verdict"><span class="mono">Verdict, cutoff ${N.cutoff}</span><b>Real infrastructure, thin value for the token.</b></div>
</div>
<div class="right">
  <div class="chart">
    <div class="mono">Implied confidential share, weekly</div>
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="${pad}" x2="${W - pad}" y1="${py(0)}" y2="${py(0)}" stroke="#cfc7b5"/>
      <line x1="${px(bi)}" x2="${px(bi)}" y1="14" y2="${H - pad}" stroke="#17160f" stroke-dasharray="4 4"/>
      <polyline points="${line}" fill="none" stroke="#d9461a" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="${px(last)}" cy="${py(ys[last])}" r="6" fill="#d9461a"/>
      <text x="${px(bi) - 10}" y="34" text-anchor="end" font-family="IBM Plex Mono" font-size="15" fill="#17160f">${N.break_date}: ${N.conf_before} → ${N.conf_after}</text>
    </svg>
  </div>
  <div class="tiles">
    <div class="tile"><b>${N.net_swap}</b><span>net swap volume, 30 days</span></div>
    <div class="tile"><b>${N.buyback_yield}</b><span>buyback yield on market cap; ${N.need_vol_trigger} volume for ${N.t_yield}</span></div>
    <div class="tile"><b>${fired} of 4</b><span>falsifier triggers hit today</span></div>
  </div>
</div>
<div class="foot mono"><span>Built at NEAR HACKATHON · public on-chain data + DefiLlama API</span><span>Re-run it: <i>make all</i></span></div>`

mkdirSync("docs/img", { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 560 }, deviceScaleFactor: 2 })
await p.setContent(html, { waitUntil: "networkidle" })
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(400)
await p.screenshot({ path: "docs/img/banner.png" })
await b.close()
console.log("wrote docs/img/banner.png")

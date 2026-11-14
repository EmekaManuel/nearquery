// Renders docs/img/track-card.png: what the Investment Thesis brief asked for, answered with computed numbers.
// Reads demo/out/numbers.json and data/metrics/peer_fees.csv, so it cannot drift from the data.
//   python -m pipeline.video_numbers && node demo/scripts/track_card.mjs      (repo root; needs `npm ci` in demo/)
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
const { chromium } = createRequire(process.cwd() + "/demo/")("playwright")
const N = JSON.parse(readFileSync("demo/out/numbers.json", "utf8"))
const peers = readFileSync("data/metrics/peer_fees.csv", "utf8").trim().split("\n").slice(1).map(l => { const [p,c,v]=l.split(","); return {p: p.replace(" Bridge Aggregator","").replace(" Protocol",""), v:+v} })
const max = Math.max(...peers.map(x=>x.v))
const mark = readFileSync("brand/logos/nearquery-mark.svg","utf8")
const bars = peers.map(x=>{const me=x.p==="NEAR Intents";return `<div class="row"><span class="nm${me?" me":""}">${x.p}</span><div class="track"><i style="width:${Math.max(x.v/max*100,1.2)}%;background:${me?"#d9461a":"#b9b09b"}"></i></div><b class="${me?"me":""}">$${x.v.toLocaleString("en-US")}</b></div>`}).join("")
const html = `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3efe6;--card:#fbf9f4;--rule:#cfc7b5;--ink:#17160f;--muted:#5b5648;--signal:#d9461a;--st:#a8320f}
*{box-sizing:border-box;margin:0}
body{width:1600px;height:900px;background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;position:relative;overflow:hidden}
.mono{font-family:'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
.head{position:absolute;left:72px;top:36px;right:72px}
.eyebrow{display:flex;align-items:center;gap:16px;font-size:18px;color:var(--muted)}.eyebrow svg{width:42px;height:42px}
h1{font-family:'Space Grotesk';font-size:54px;letter-spacing:-.03em;line-height:1.05;margin-top:12px}
.grid{position:absolute;left:72px;right:72px;top:160px;bottom:84px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.card{background:var(--card);border:1px solid var(--rule);padding:18px 28px}
.card .mono{font-size:15px;color:var(--st)}
.big{font-family:'IBM Plex Mono';font-weight:500;font-size:52px;letter-spacing:-.04em;margin-top:4px}
.big small{font-size:30px;color:var(--muted);letter-spacing:0}
.note{font-size:19px;color:var(--muted);line-height:1.3;margin-top:4px}
.left{display:grid;gap:16px;grid-template-rows:1fr 1fr 1fr}
.right{display:flex;flex-direction:column}
.row{display:grid;grid-template-columns:170px 1fr 100px;align-items:center;gap:14px;margin-top:22px;font-size:21px}
.track{height:24px;background:#ece6d8}.track i{display:block;height:100%}
.row b{font-family:'IBM Plex Mono';font-weight:500;text-align:right}.me{color:var(--signal);font-weight:600}
.foot{position:absolute;left:0;right:0;bottom:0;height:60px;background:var(--ink);color:#eeeae0;display:flex;align-items:center;justify-content:space-between;padding:0 72px;font-size:17px}.foot i{font-style:normal;color:#ff8a63}
</style>
<div class="head"><div class="eyebrow mono">${mark}<span>NearQuery · Investment Thesis track</span></div><h1>The brief asked. Here is what it computes.</h1></div>
<div class="grid">
 <div class="left">
  <div class="card"><span class="mono">Model what happens at 10x volume</span><div class="big">${N.yield_1x} <small>→</small> ${N.yield_10x}</div><div class="note">Token buyback yield on market cap, 1x to 10x. A slider on the dashboard.</div></div>
  <div class="card"><span class="mono">Filter out wash and bot volume</span><div class="big">${N.wash_total} <small>set aside</small></div><div class="note">Of user volume in ${N.wash_month}: high-frequency accounts and round-trip churn.</div></div>
  <div class="card"><span class="mono">Ship it as a dashboard plus an open notebook</span><div class="big" style="font-size:38px;margin-top:6px">Live site + notebook</div><div class="note">Rebuilt daily. One command, <b>make all</b>, re-runs it all.</div></div>
 </div>
 <div class="card right"><span class="mono">Fees per $1M of volume vs other cross-chain protocols</span>
  <div class="big">${N.near_fee_1m} <small>rank ${N.near_fee_rank} of ${N.n_peers}</small></div>
  <div class="note">Median of the seven: ${N.peer_median}.</div>${bars}
  <div class="note" style="margin-top:auto">Derived from DefiLlama fee and volume overviews, 30 days.</div></div>
</div>
<div class="foot mono"><span>Built at NEAR HACKATHON · public on-chain data + DefiLlama API</span><span>github.com/EmekaManuel/nearquery</span></div>`
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:2})
await p.setContent(html,{waitUntil:"networkidle"}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400)
await p.screenshot({path:"docs/img/track-card.png"}); await b.close()

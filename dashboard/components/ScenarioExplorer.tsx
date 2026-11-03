"use client"
import { useEffect, useId, useState } from "react"
import type { Dashboard } from "@/lib/types"
import { pct, usd } from "@/lib/format"

type Key = "vol" | "take" | "px"
const SPEC: Record<Key, { label: string; min: number; max: number; step: number; hint: string }> = {
  vol: { label: "Volume vs now", min: 0.5, max: 20, step: 0.5, hint: "annual Intents volume, as a multiple of the trailing window annualized" },
  take: { label: "Take rate vs now", min: 0.25, max: 4, step: 0.25, hint: "share of volume NEAR captures as revenue" },
  px: { label: "NEAR price vs now", min: 0.25, max: 4, step: 0.25, hint: "scales the market cap the buyback is measured against" },
}
const DEFAULT: Record<Key, number> = { vol: 1, take: 1, px: 1 }

function fromHash(): Record<Key, number> {
  const out = { ...DEFAULT }
  try {
    const p = new URLSearchParams(window.location.hash.slice(1))
    for (const k of Object.keys(SPEC) as Key[]) {
      const v = Number(p.get(k))
      if (p.has(k) && Number.isFinite(v)) out[k] = Math.min(SPEC[k].max, Math.max(SPEC[k].min, v))
    }
  } catch { /* hash is a convenience only */ }
  return out
}

export function ScenarioExplorer({ d }: { d: Dashboard }) {
  const id = useId()
  const [v, setV] = useState(DEFAULT)
  const o = d.obs
  useEffect(() => setV(fromHash()), [])
  const set = (k: Key, x: number) => {
    const next = { ...v, [k]: x }
    setV(next)
    try { window.history.replaceState(null, "", `#${new URLSearchParams(Object.entries(next).map(([a, b]) => [a, String(b)]))}`) } catch { /* ignore */ }
  }
  const reset = () => { setV(DEFAULT); try { window.history.replaceState(null, "", window.location.pathname) } catch { /* ignore */ } }
  // Same arithmetic as pipeline/model.py: buyback = annualized captured revenue x volume multiple x take multiple; yield = buyback / (market cap x price multiple).
  const buyback = o.revenueAnnual * v.vol * v.take
  const yld = buyback / (o.marketCap * v.px)
  const TARGETS = [d.facts.yieldTrigger, 0.05] // the thesis's own bullish trigger, then a stretch case
  const needVol = (t: number) => (t * o.marketCap * v.px) / (o.revenueAnnual * v.take)
  const changed = (Object.keys(v) as Key[]).some((k) => v[k] !== DEFAULT[k])
  return (
    <section className="card explorer" aria-labelledby={id}>
      <div className="card-head"><h2 id={id}>Try your own assumptions</h2>{changed && <button className="open" onClick={reset}>Reset</button>}</div>
      <p className="note">Starts at what the data shows today. Move a slider to stress-test the conclusion; the link in your address bar keeps your settings.</p>
      <div className="sliders">
        {(Object.keys(SPEC) as Key[]).map((k) => (
          <label key={k} className="slider">
            <span className="s-top"><span>{SPEC[k].label}</span><b>{v[k].toFixed(2).replace(/\.?0+$/, "")}×</b></span>
            <input type="range" min={SPEC[k].min} max={SPEC[k].max} step={SPEC[k].step} value={v[k]} onChange={(e) => set(k, Number(e.target.value))} aria-describedby={`${id}-${k}`} />
            <span className="s-hint" id={`${id}-${k}`}>{SPEC[k].hint}</span>
          </label>
        ))}
      </div>
      <div className="result" aria-live="polite">
        <div><span className="l">Annual buyback</span><b>{usd(buyback)}</b></div>
        <div><span className="l">% of market cap</span><b className="sig">{pct(yld, 2)}</b></div>
        {TARGETS.map((t) => (
          <div key={t}><span className="l">Volume for {pct(t)} of mcap</span><b>{needVol(t).toFixed(needVol(t) < 10 ? 1 : 0)}×</b></div>
        ))}
      </div>
      <p className="src">Source: same formula as pipeline/model.py. Today’s values: {usd(o.revenueAnnual)} annualized captured revenue, market cap {usd(o.marketCap)} at {`$${o.nearPrice.toFixed(2)}`}. Multiples are assumptions, not forecasts.</p>
    </section>
  )
}

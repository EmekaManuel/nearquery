import type { Dashboard } from "@/lib/types"
import { pct, usd } from "@/lib/format"

export function ScenarioTable({ d }: { d: Dashboard }) {
  const cases = Array.from(new Set(d.scenarios.map((s) => s.case)))
  const o = d.obs
  return (
    <section className="card">
      <div className="card-head"><h2>What volume would it take?</h2></div>
      <p className="note">Window {d.meta.windowStart} → {d.meta.windowEnd}. Gross fees {o.grossBps.toFixed(1)} bps of reported volume; NEAR captures {pct(o.capturedShare)} ({o.capturedBps.toFixed(1)} bps). Annual buyback if volume and take rate scale as shown, with market cap held at today’s.</p>
      <div className="tbl"><table>
        <thead><tr><th>Take rate case</th><th>Volume vs now</th><th>Take (bps)</th><th>Annual buyback</th><th>% of mcap</th></tr></thead>
        <tbody>{cases.flatMap((c) => d.scenarios.filter((s) => s.case === c).map((s) => (
          <tr key={c + s.volumeMultiple}><td>{c.replaceAll("_", " ")}</td><td>{s.volumeMultiple}×</td><td>{s.takeBps.toFixed(1)}</td><td>{usd(s.annualBuyback)}</td><td>{pct(s.pctOfMarketCap, 2)}</td></tr>)))}</tbody>
      </table></div>
      <p className="src">Source: pipeline/model.py. Observed inputs are computed; multiples are assumptions in data/reference/model_assumptions.json.</p>
    </section>
  )
}

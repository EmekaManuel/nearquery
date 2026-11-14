import Link from "next/link"
import { CHARTS, type ChartDef } from "@/lib/charts"
import { fmtBy } from "@/lib/format"
import { monthLabel } from "@/lib/format"
import type { Dashboard } from "@/lib/types"
import { rowsFor } from "./ChartGrid"

const GROUPS: { id: ChartDef["group"]; label: string; sub: string }[] = [
  { id: "activity", label: "Activity", sub: "Volume, intents, accounts" },
  { id: "market", label: "Market structure", sub: "Solvers, flows, NEAR demand" },
  { id: "value", label: "Value capture", sub: "Revenue and buyback scenarios" },
]
const CADENCE: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", flows: "Latest month", peers: "30 days", scenarios: "Model" }

type Pt = { x: string; y: number }

function points(c: ChartDef, d: Dashboard): (Pt | null)[] | null {
  if (c.kind !== "line" || !c.series) return null
  const k = c.series[0].key
  const rows = rowsFor(c, d) as unknown as Record<string, string | number | null>[]
  return rows.map((r) => (r[k] == null ? null : { x: String(r[c.xKey!]), y: r[k] as number }))
}

function Spark({ pts }: { pts: (Pt | null)[] }) {
  const ys = pts.filter(Boolean).map((p) => (p as Pt).y)
  if (ys.length < 2) return null
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1
  const W = 120, H = 32, n = pts.length - 1
  const xy = (i: number, y: number) => `${((i / n) * W).toFixed(1)},${(H - 3 - ((y - lo) / span) * (H - 6)).toFixed(1)}`
  const segs: string[][] = [[]]
  pts.forEach((p, i) => { if (p) segs[segs.length - 1].push(xy(i, p.y)); else if (segs[segs.length - 1].length) segs.push([]) })
  const last = [...pts].map((p, i) => ({ p, i })).reverse().find((q) => q.p)!
  const [lx, ly] = xy(last.i, (last.p as Pt).y).split(",")
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {segs.filter((s) => s.length > 1).map((s, i) => <polyline key={i} points={s.join(" ")} fill="none" vectorEffect="non-scaling-stroke" />)}
      <circle cx={lx} cy={ly} r="2.2" />
    </svg>
  )
}

function Latest({ c, pts }: { c: ChartDef; pts: (Pt | null)[] | null }) {
  const last = pts && [...pts].reverse().find(Boolean)
  if (!last) return <span className="idx-latest idx-none">{c.kind === "bar" ? "Bar chart" : "Table"}</span>
  const when = c.dataset === "monthly" ? monthLabel(last.x) : last.x
  return <span className="idx-latest"><b>{fmtBy(c.fmt, last.y)}</b><i>{when}</i></span>
}

export function ChartIndex({ d }: { d: Dashboard }) {
  return (
    <div className="idx">
      {GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={`idx-${g.id}`}>
          <div className="idx-head"><h3 id={`idx-${g.id}`}>{g.label}</h3><span>{g.sub}</span></div>
          <ul className="index">
            {CHARTS.filter((c) => c.group === g.id).map((c) => {
              const pts = points(c, d)
              return (
                <li key={c.id}>
                  <Link href={`/charts/${c.id}/`}>
                    <span className="idx-top"><span className="idx-kind">{CADENCE[c.dataset]}</span><span className="idx-open">Open ↗</span></span>
                    <b>{c.title.replace(/leg-sum/g, "leg\u2011sum")}</b>
                    <span className="idx-blurb">{c.blurb}</span>
                    <span className="idx-foot">{pts && <Spark pts={pts} />}<Latest c={c} pts={pts} /></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

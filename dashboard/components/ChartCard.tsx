"use client"
import * as Switch from "@radix-ui/react-switch"
import * as ToggleGroup from "@radix-ui/react-toggle-group"
import Link from "next/link"
import { useId, useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { FmtKind, SeriesDef } from "@/lib/charts"
import { fmtBy, monthLabel } from "@/lib/format"

type Row = Record<string, string | number | null>
type Range = "30" | "90" | "all"

interface Props {
  title: string
  note?: string
  rows: Row[]
  xKey: string
  xFmt?: "month"
  series: SeriesDef[]
  fmt: FmtKind
  ranged?: boolean
  markers?: boolean
  warn?: boolean
  source: string
  href?: string
  height?: number
}

export function ChartCard({ title, note, rows, xKey, xFmt, series, fmt, ranged, markers, warn, source, href, height = 250 }: Props) {
  const [range, setRange] = useState<Range>("all")
  const [table, setTable] = useState(false)
  const id = useId()
  const f = (v: unknown) => fmtBy(fmt, v as number | null)
  const xf = (x: string) => (xFmt === "month" ? monthLabel(x) : x)
  const shown = ranged && range !== "all" ? rows.slice(-Number(range)) : rows
  const have = shown.filter((r) => series.some((s) => r[s.key] != null))
  const s0 = series[0]
  const lastRow = [...shown].reverse().find((r) => r[s0.key] != null)
  const last = lastRow ? { x: lastRow[xKey] as string, y: lastRow[s0.key] as number } : null
  const span = have.length ? `${have[0][xKey]} → ${have[have.length - 1][xKey]}` : "no data"
  return (
    <section className={`card${warn ? " warn" : ""}`} aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id}>{title}</h2>
        <div className="ctl">
          {ranged && (
            <ToggleGroup.Root className="seg" type="single" value={range} onValueChange={(v) => v && setRange(v as Range)} aria-label="Date range">
              {(["30", "90", "all"] as Range[]).map((r) => <ToggleGroup.Item key={r} value={r}>{r === "all" ? "All" : `${r}d`}</ToggleGroup.Item>)}
            </ToggleGroup.Root>
          )}
          <label className="sw-row">
            <Switch.Root className="sw" checked={table} onCheckedChange={setTable} aria-label="Show table"><Switch.Thumb asChild><span /></Switch.Thumb></Switch.Root>
            Table
          </label>
          {href && <Link className="open" href={href}>Open ↗</Link>}
        </div>
      </div>
      {note && <p className="note">{note}</p>}
      {series.length > 1 && <div className="legend">{series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>}
      {table ? (
        <div className="tbl" tabIndex={0} style={{ maxHeight: height }}>
          <table>
            <thead><tr><th>{xKey}</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
            <tbody>{[...shown].reverse().map((r) => <tr key={String(r[xKey])}><td>{String(r[xKey])}</td>{series.map((s) => <td key={s.key}>{f(r[s.key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="chart" style={{ height }} role="img" aria-label={`${title}, ${span}`}>
          <ResponsiveContainer>
            <LineChart data={shown} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey={xKey} tickFormatter={xf} tick={{ fill: "var(--ink-3)", fontSize: 11 }} stroke="var(--line)" minTickGap={36} interval={markers ? 0 : "preserveEnd"} />
              <YAxis tickFormatter={f} tick={{ fill: "var(--ink-3)", fontSize: 11 }} stroke="var(--line)" width={56} domain={[0, "auto"]} />
              <Tooltip cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }} content={({ active, payload, label }) => active && payload?.length ? (
                <div className="tt"><div className="d">{String(label)}</div>
                  {payload.map((p) => <div className="r" key={String(p.dataKey)}><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />{p.name}</span><span>{f(p.value)}</span></div>)}
                </div>) : null} />
              {series.map((s) => (
                <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={markers ? { r: 3, fill: s.color, stroke: "var(--card)", strokeWidth: 2 } : false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} connectNulls={false} />
              ))}
              {last && series[0].color === "var(--chart-1)" && <ReferenceDot x={last.x} y={last.y} r={5} fill="var(--signal)" stroke="var(--card)" strokeWidth={2} ifOverflow="visible" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="src">Source · {source} · <span className="nw">{span}</span></p>
    </section>
  )
}

export function BarCard({ title, note, rows, fmt, source, href, height = 300 }: { title: string; note?: string; rows: { pair: string; usd: number }[]; fmt: FmtKind; source: string; href?: string; height?: number }) {
  const id = useId()
  const f = (v: unknown) => fmtBy(fmt, v as number | null)
  return (
    <section className="card" aria-labelledby={id}>
      <div className="card-head"><h2 id={id}>{title}</h2>{href && <Link className="open" href={href}>Open ↗</Link>}</div>
      {note && <p className="note">{note}</p>}
      <div className="chart" style={{ height }} role="img" aria-label={title}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tickFormatter={f} tick={{ fill: "var(--ink-3)", fontSize: 11 }} stroke="var(--line)" />
            <YAxis type="category" dataKey="pair" width={150} tick={{ fill: "var(--ink-2)", fontSize: 12 }} stroke="var(--line)" />
            <Tooltip cursor={{ fill: "var(--line)", opacity: 0.4 }} formatter={(v) => f(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--ink)", borderRadius: 0, fontSize: 13 }} labelStyle={{ color: "var(--ink-3)" }} />
            <Bar dataKey="usd" name="USD" fill="var(--chart-2)" radius={0} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="src">Source · {source}</p>
    </section>
  )
}

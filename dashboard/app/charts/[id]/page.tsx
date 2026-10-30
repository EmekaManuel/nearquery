import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Chart, rowsFor } from "@/components/ChartGrid"
import { CodeBlock } from "@/components/CodeBlock"
import { ScenarioTable } from "@/components/ScenarioTable"
import { CHARTS, inGroup } from "@/lib/charts"
import type { ChartDef } from "@/lib/charts"
import { asset } from "@/lib/asset"
import { loadDashboard } from "@/lib/data"
import { fmtBy } from "@/lib/format"
import { readRepoFile, readSql } from "@/lib/sql"

export const dynamicParams = false
export const generateStaticParams = () => CHARTS.map((c) => ({ id: c.id }))

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: CHARTS.find((c) => c.id === id)?.title }
}

const GROUP_LABEL = { activity: "Activity", market: "Market structure", value: "Value capture" } as const

function stats(c: ChartDef, rows: Record<string, string | number | null>[]) {
  const s = c.series?.[0]
  if (!s) return []
  const vals = rows.map((r) => ({ x: String(r[c.xKey!]), v: r[s.key] as number | null })).filter((r) => r.v != null) as { x: string; v: number }[]
  if (!vals.length) return []
  const max = vals.reduce((a, b) => (b.v > a.v ? b : a))
  const min = vals.reduce((a, b) => (b.v < a.v ? b : a))
  const mean = vals.reduce((a, b) => a + b.v, 0) / vals.length
  const last = vals[vals.length - 1]
  const f = (v: number) => fmtBy(c.fmt, v)
  return [
    { l: `Latest (${last.x})`, v: f(last.v) }, { l: `Peak (${max.x})`, v: f(max.v) },
    { l: `Low (${min.x})`, v: f(min.v) }, { l: "Mean of shown points", v: f(mean) }, { l: "Points", v: String(vals.length) },
  ]
}

export default async function ChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = CHARTS.find((x) => x.id === id)
  if (!c) notFound()
  const d = loadDashboard()
  const st = c.kind === "line" ? stats(c, rowsFor(c, d)) : []
  const related = inGroup(c.group).filter((x) => x.id !== c.id)
  const stem = c.sql[0]?.replace(/^\d+_/, "").replace(/\.sql$/, "")
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href={`/${c.group}/`}>{GROUP_LABEL[c.group]}</Link><span>/</span><span>{c.title}</span>
      </nav>
      <header className="page-head"><h1>{c.title}</h1><p className="lede">{c.definition}</p></header>

      {c.kind === "table" ? <ScenarioTable d={d} /> : <Chart c={c} d={d} big />}

      {st.length > 0 && (
        <div className="stats">{st.map((s) => <div key={s.l}><div className="v">{s.v}</div><div className="l">{s.l}</div></div>)}</div>
      )}

      <div className="cols">
        <section className="card">
          <h2>How it is computed</h2>
          <ol className="steps">{c.method.map((m) => <li key={m}>{m}</li>)}</ol>
        </section>
        <section className="card">
          <h2>Read this before quoting it</h2>
          <ul className="steps">{c.caveats.map((m) => <li key={m}>{m}</li>)}</ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>The query</h2>{c.csv && <a className="open" href={asset(`/data/${c.csv}.csv`)} download>Download {c.csv}.csv</a>}</div>
        <p className="note">
          Runs in DuckDB over the local cache of BigQuery logs. {stem && <>Re-run with <code>make metrics</code> or <code>python -m pipeline.metrics {stem}</code>.</>}
          {" "}Metric queries read the base tables built by <code>00_setup.sql</code>.
        </p>
        {c.sql.map((f, i) => (
          i === 0 ? <CodeBlock key={f} code={readSql(f)} name={`pipeline/sql/${f}`} /> :
          <details key={f} className="more"><summary>pipeline/sql/{f}{f === "00_setup.sql" ? " (base tables: legs, prices, roles)" : ""}</summary><CodeBlock code={readSql(f)} name={`pipeline/sql/${f}`} /></details>
        ))}
        {c.extraFiles?.map((f) => (
          <details key={f} className="more" open={f.endsWith(".py")}><summary>{f}</summary><CodeBlock code={readRepoFile(f).trimEnd()} name={f} sql={false} /></details>
        ))}
      </section>

      {related.length > 0 && (
        <section className="card">
          <h2>More in {GROUP_LABEL[c.group]}</h2>
          <ul className="index tight">{related.map((r) => <li key={r.id}><Link href={`/charts/${r.id}/`}><b>{r.title}</b></Link></li>)}</ul>
        </section>
      )}
    </>
  )
}

import type { ChartDef } from "@/lib/charts"
import type { Dashboard } from "@/lib/types"
import { BarCard, ChartCard } from "./ChartCard"

type Row = Record<string, string | number | null>

export function rowsFor(c: ChartDef, d: Dashboard): Row[] {
  return (c.dataset === "daily" ? d.daily : d.monthly) as unknown as Row[]
}

export function Chart({ c, d, big }: { c: ChartDef; d: Dashboard; big?: boolean }) {
  const href = `/charts/${c.id}/`
  if (c.kind === "bar") return <BarCard title={c.title} note={c.note} rows={d.flows.rows} fmt={c.fmt} source={c.source} href={big ? undefined : href} height={big ? 420 : 300} />
  return (
    <ChartCard title={c.title} note={c.note} rows={rowsFor(c, d)} xKey={c.xKey!} xFmt={c.xFmt} series={c.series!} fmt={c.fmt}
      ranged={c.ranged} markers={c.markers} warn={c.warn} source={c.source} href={big ? undefined : href} height={big ? 400 : 250} />
  )
}

export function ChartGrid({ charts, d }: { charts: ChartDef[]; d: Dashboard }) {
  return <div className="grid2">{charts.map((c) => <Chart key={c.id} c={c} d={d} />)}</div>
}

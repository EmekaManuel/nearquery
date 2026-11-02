import { num, pct } from "./format"
import type { ChartDef } from "./charts"
import type { Dashboard } from "./types"

/** Replaces {{key}} placeholders in registry text with figures computed from the pipeline output. */
export function fillText(text: string, d: Dashboard): string {
  const v: Record<string, string> = {
    oneDay: pct(d.accounts.implicitOneDayShare, 2),
    singleEntry: pct(d.accounts.implicitSingleEntryShare, 0),
    implicit: num(d.accounts.implicitAccounts),
    breakDate: d.facts.confidentialBreakDate,
    intentsChg: `${d.facts.intentsAugToOctChange >= 0 ? "+" : ""}${(d.facts.intentsAugToOctChange * 100).toFixed(0)}%`,
  }
  return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in v)) throw new Error(`unknown placeholder {{${k}}}`)
    return v[k]
  })
}

export function fillChart(c: ChartDef, d: Dashboard): ChartDef {
  const f = (t: string) => fillText(t, d)
  return { ...c, note: c.note && f(c.note), definition: f(c.definition), method: c.method.map(f), caveats: c.caveats.map(f) }
}

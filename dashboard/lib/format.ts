export const usd = (v: number | null | undefined, digits = 1): string => {
  if (v == null) return "–"
  const a = Math.abs(v)
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `$${(v / 1e6).toFixed(digits)}M`
  if (a >= 1e3) return `$${(v / 1e3).toFixed(a < 1e4 ? 1 : 0)}k`
  return `$${v.toFixed(0)}`
}
export const num = (v: number | null | undefined): string => {
  if (v == null) return "–"
  const a = Math.abs(v)
  return a >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : v.toFixed(0)
}
export const pct = (v: number | null | undefined, digits = 0): string => (v == null ? "–" : `${(v * 100).toFixed(digits)}%`)
export const monthLabel = (iso: string): string => new Date(iso + "T00:00:00Z").toLocaleDateString("en", { month: "short", timeZone: "UTC" })

export type FmtKind = import("./charts").FmtKind
/** One place that maps a format kind to a formatter, so charts can be configured with plain data. */
export function fmtBy(kind: FmtKind, v: number | null | undefined): string {
  if (v == null) return "–"
  switch (kind) {
    case "usd": return usd(v)
    case "usd0": return usd(v, 0)
    case "num": return num(v)
    case "frac0": return `${(v * 100).toFixed(0)}%`
    case "pu1": return `${v.toFixed(1)}%`
    case "pu2": return `${v.toFixed(2)}%`
  }
}

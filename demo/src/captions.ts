// Single source of truth for every caption in the video. Numbers come from demo/out/numbers.json
// (pipeline output); nothing here is a hand-typed figure. Times are seconds on the final timeline.
export type Numbers = Record<string, string>
export interface Caption { start: number; end: number; text: string; burned: boolean }

export const FPS = 30
/** Seconds each shot is on screen. */
export const SHOTS = { hook: 7, overview: 8, volume: 17, accounts: 17, value: 15, terminal: 12, outro: 8 } as const
export type ShotName = keyof typeof SHOTS
const order = Object.keys(SHOTS) as ShotName[]
export const shotStart = (name: ShotName): number => order.slice(0, order.indexOf(name)).reduce((a, n) => a + SHOTS[n], 0)
export const TOTAL_SECONDS = order.reduce((a, n) => a + SHOTS[n], 0)

export function buildCaptions(n: Numbers, speed: number): Caption[] {
  const at = (shot: ShotName, a: number, b: number, text: string, burned = true): Caption => ({ start: shotStart(shot) + a, end: shotStart(shot) + b, text, burned })
  return [
    at("hook", 0.4, 3.6, "Is NEAR Intents real settlement?", false),
    at("hook", 3.6, 6.8, "And does it create value for NEAR?", false),
    at("overview", 0.2, 4.2, "Up front: real infrastructure, thin value for the token."),
    at("overview", 4.2, 7.8, "Every figure carries its date range."),
    at("volume", 0.2, 8.0, `${n.net_swap} net swap volume, ${n.window}, read straight from intents.near event logs.`),
    at("volume", 8.0, 16.8, `About ${n.confidential} of reported volume is not in public events: implied confidential, inferred, not measured.`),
    at("accounts", 0.2, 8.0, `${n.one_day_share} of ${n.implicit_accounts} implicit accounts are used on one day only. In October, just ${n.repeat_pct_latest} were active twice or more.`),
    at("accounts", 8.0, 16.8, "So account counts can't prove adoption. Every chart ships the SQL behind it."),
    at("value", 0.4, 6.0, `Captured revenue: ${n.revenue_year} a year, ${n.buyback_yield} of NEAR's market cap.`),
    at("value", 6.0, 14.8, `Even at 10x today's volume it would be ${n.yield_10x} of market cap.`),
    at("terminal", 0.2, 5.8, "One command re-runs the whole thesis: no accounts, no keys."),
    at("terminal", 5.8, 11.8, `The numbers don't move. (Terminal sped up ${speed.toFixed(1)}x.)`),
    at("outro", 0.5, 7.5, "Ask the chain. Show the work.", false),
  ]
}

/** Readability rules: at least 3 s on screen, at most 17 characters per second, at most 2 lines of ~65 chars. */
export function checkCaptions(caps: Caption[]): string[] {
  const problems: string[] = []
  for (const c of caps) {
    const dur = c.end - c.start
    if (dur < 3) problems.push(`"${c.text}" is on screen ${dur.toFixed(1)}s (min 3s)`)
    const cps = c.text.length / dur
    if (cps > 17) problems.push(`"${c.text}" reads at ${cps.toFixed(1)} chars/s (max 17)`)
    if (c.text.length > 130) problems.push(`"${c.text}" is ${c.text.length} chars (max 130 for two lines)`)
  }
  return problems
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0")
const ts = (s: number) => { const ms = Math.round(s * 1000); return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}` }
export const toSrt = (caps: Caption[]): string => caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n")

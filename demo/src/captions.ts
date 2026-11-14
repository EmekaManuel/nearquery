// Single source of truth for every caption in the video. Numbers come from demo/out/numbers.json
// (pipeline output); nothing here is a hand-typed figure. Times are seconds on the final timeline.
export type Numbers = Record<string, string>
export interface Caption { start: number; end: number; text: string; burned: boolean }

export const FPS = 30
/** Seconds each shot is on screen. Keep demo/scripts/voiceover.py and record_site.ts PLAN in step. */
export const SHOTS = { hook: 8, method: 10, moment: 18, surprise: 22, checks: 14, falsify: 12, rerun: 16, outro: 8 } as const
export type ShotName = keyof typeof SHOTS
const order = Object.keys(SHOTS) as ShotName[]
export const shotStart = (name: ShotName): number => order.slice(0, order.indexOf(name)).reduce((a, n) => a + SHOTS[n], 0)
export const TOTAL_SECONDS = order.reduce((a, n) => a + SHOTS[n], 0)

export function buildCaptions(n: Numbers, speed: number): Caption[] {
  const at = (shot: ShotName, a: number, b: number, text: string, burned = true): Caption => ({ start: shotStart(shot) + a, end: shotStart(shot) + b, text, burned })
  return [
    // hook: the card carries these words itself, so they are subtitles only
    at("hook", 0.2, 4.0, `NEAR Intents settled ${n.net_swap} in the last 30 days.`, false),
    at("hook", 4.0, 7.8, "Does any of it reach the NEAR token?", false),
    at("method", 0.2, 5.2, "We read the chain: every swap, straight from intents.near's event logs."),
    at("method", 5.2, 9.8, "Every chart is one click from the query behind it."),
    at("moment", 0.2, 6.0, `Captured revenue is ${n.revenue_year} a year: ${n.buyback_yield} of NEAR's market cap.`),
    at("moment", 6.0, 11.6, "Now stress-test it: drag the volume up."),
    at("moment", 11.6, 17.8, `It takes ${n.need_vol_trigger} today's volume to reach ${n.t_yield} of market cap. Real infrastructure, thin value.`),
    at("surprise", 0.2, 5.8, `About ${n.confidential} of reported volume isn't in public events.`),
    at("surprise", 5.8, 11.4, `The obvious story: Confidential Intents. But it sits near zero until ${n.break_date}.`),
    at("surprise", 11.4, 16.9, `That day: ${n.conf_before} before, ${n.conf_after} after. Public volume moved ${n.pub_chg}.`),
    at("surprise", 16.9, 21.8, "Users moving, or a data change? We can't tell, so we say so."),
    at("checks", 0.2, 6.6, `A screen for wash and bot volume sets aside only ${n.wash_total} of user volume. The headline isn't inflated.`),
    at("checks", 7.0, 13.8, `And NEAR Intents' fees, ${n.near_fee_1m} per $1M, rank ${n.near_fee_rank_ord} of ${n.n_peers} cross-chain protocols.`),
    at("falsify", 0.2, 6.0, "We also say what would change our mind: four triggers, with today's readings."),
    at("falsify", 6.0, 11.8, `Today, ${n.triggers_today} have triggered.`, false), // the card shows this line itself
    at("rerun", 0.2, 4.4, "One command re-runs it all: no accounts, no keys."),
    at("rerun", 4.4, 9.4, "It refetches market data, rebuilds every metric, then rewrites the thesis."),
    at("rerun", 9.4, 14.0, `Same inputs, same output: the thesis comes out identical.${speed > 1.15 ? ` (Sped up ${speed.toFixed(1)}x.)` : ""}`),
    at("outro", 0.5, 7.5, "Ask the chain. Show the work. What would change your mind?", false),
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

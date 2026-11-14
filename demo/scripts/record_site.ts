// Records the NearQuery dashboard at 1920x1080 with scripted scrolls, a slider drag and deliberate holds.
// The headline numbers the video shows (the ones read from numbers.json) are asserted to be visible on the page first; a mismatch aborts the run.
import { chromium, type Locator, type Page } from "playwright"
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const BASE = (process.env.SITE_URL ?? "https://emekamanuel.github.io/nearquery").replace(/\/$/, "")
const WORK = join(process.cwd(), "work")
const OUT = join(process.cwd(), "out")
const N = JSON.parse(readFileSync(join(OUT, "numbers.json"), "utf8")) as Record<string, string>
// planned (shown) seconds per shot; the recording keeps 0.6 s extra so cuts never land on a transition.
// Keep in step with SHOTS in src/captions.ts.
const PLAN = { method: 10, moment: 18, surprise: 22, checks: 14 } as const
type Shot = keyof typeof PLAN
const PAD = 600
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const CURSOR = `
(() => {
  const ring = document.createElement("div")
  ring.style.cssText = "position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border:3px solid #17160f;border-radius:50%;background:rgba(251,249,244,.55);box-shadow:0 0 0 2px rgba(251,249,244,.9);pointer-events:none;z-index:2147483647;transition:transform .08s,background .1s"
  const add = () => document.documentElement.appendChild(ring)
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", add) : add()
  addEventListener("mousemove", (e) => { ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px" }, true)
  addEventListener("mousedown", () => { ring.style.transform = "scale(.7)"; ring.style.background = "rgba(217,70,26,.55)" }, true)
  addEventListener("mouseup", () => { ring.style.transform = ""; ring.style.background = "rgba(251,249,244,.55)" }, true)
})()`

async function expectVisible(page: Page, keys: string[], where: string) {
  const text = await page.evaluate(() => document.body.innerText)
  const missing = keys.filter((k) => !text.includes(N[k]))
  if (missing.length) throw new Error(`NUMBER MISMATCH on ${where}: ${missing.map((k) => `${k}="${N[k]}"`).join(", ")} not found on the page. Rebuild/redeploy the site or rerun the pipeline, then retry.`)
  console.log(`ok  ${where}: ${keys.map((k) => N[k]).join("  ")}`)
}

async function scrollToEl(page: Page, el: Locator, offset = 90) {
  const y = await el.evaluate((e) => e.getBoundingClientRect().top + window.scrollY)
  await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), Math.max(0, y - offset))
  await sleep(1100)
}

async function glide(page: Page, x: number, y: number, steps = 24) {
  await page.mouse.move(x, y, { steps })
}

const center = async (l: Locator) => { const b = (await l.boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
const click = async (page: Page, l: Locator, steps = 26) => { const c = await center(l); await glide(page, c.x, c.y, steps); await sleep(350); await page.mouse.down(); await page.mouse.up() }

async function main() {
  mkdirSync(WORK, { recursive: true })
  rmSync(join(WORK, "raw"), { recursive: true, force: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "light",
    recordVideo: { dir: join(WORK, "raw"), size: { width: 1920, height: 1080 } },
    permissions: ["clipboard-read", "clipboard-write"],
  })
  await ctx.addInitScript(CURSOR)
  const page = await ctx.newPage()
  const t0 = Date.now()
  type Mark = { startMs: number; shownMs: number; events?: Record<string, number>; point?: { x: number; y: number } }
  const marks: Record<string, Mark> = {}
  let seg = 0
  const begin = (name: Shot) => { seg = Date.now(); marks[name] = { startMs: seg - t0 + PAD, shownMs: PLAN[name] * 1000, events: {} }; return name }
  /** seconds on the shot's own timeline (0 = first frame the video shows) */
  const shown = () => (Date.now() - seg - PAD) / 1000
  const waitShown = async (sec: number, name: Shot) => {
    const left = seg + PAD + sec * 1000 - Date.now()
    if (left < -150) throw new Error(`shot "${name}" is ${(-left / 1000).toFixed(1)}s late for its ${sec}s cue; shorten the script`)
    if (left > 0) await sleep(left)
  }
  const holdTo = (name: Shot) => waitShown(PLAN[name], name)

  // ---- shot: method (the chart, then the query behind it) ------------------------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await sleep(500)
  await expectVisible(page, ["net_swap", "confidential", "revenue_year", "buyback_yield"], "overview tiles")
  const volCard = page.locator("section.card", { hasText: "Daily volume, public on-chain" }).first()
  await scrollToEl(page, volCard, 70)
  let m = begin("method")
  await sleep(500)
  const cb = (await volCard.locator(".chart").boundingBox())!
  const plotL = cb.x + 60, plotW = cb.width - 70
  const at = (frac: number) => plotL + plotW * frac
  await glide(page, at(0.08), cb.y + cb.height * 0.5, 14)
  for (const fr of [0.2, 0.36, 0.52, 0.68, 0.84]) { await glide(page, at(fr), cb.y + cb.height * 0.5, 14); await sleep(380) }
  await waitShown(4.2, m)
  await click(page, volCard.getByRole("link", { name: /Open/ }))
  await page.waitForURL(/\/charts\/daily-volume\/?$/)
  await sleep(500)
  const q = page.locator("section.card", { hasText: "The query" }).first()
  await scrollToEl(page, q, 80)
  await waitShown(7.8, m)
  const kb = q.getByRole("button", { name: "Copy" }).first()
  await click(page, kb, 30)
  await holdTo(m)

  // ---- shot: moment (drag the volume slider until the buyback reaches the trigger) ----------------------------
  await page.goto(`${BASE}/value/`, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await sleep(500)
  await expectVisible(page, ["revenue_year", "buyback_yield", "need_vol_trigger"], "value capture")
  const explorer = page.locator("section.explorer")
  await scrollToEl(page, explorer, 90)
  m = begin("moment")
  const slider = explorer.locator('input[type="range"]').first()
  const sb = (await slider.boundingBox())!
  const [min, max] = await slider.evaluate((e) => [Number((e as HTMLInputElement).min), Number((e as HTMLInputElement).max)])
  const thumbX = (v: number) => sb.x + 8 + ((v - min) / (max - min)) * (sb.width - 16)
  const y = sb.y + sb.height / 2
  const need = parseFloat(N.need_vol_trigger) // the multiple the trigger needs, as printed on the page
  const target = Math.ceil(need * 2) / 2 // the slider moves in steps of 0.5: the first step at or past the trigger
  await glide(page, 1400, 640, 12)
  await waitShown(6.0, m)
  await glide(page, thumbX(1), y, 28)
  await sleep(400)
  await page.mouse.down()
  const x0 = thumbX(1), x1 = thumbX(target), steps = 46
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y); await sleep(85) }
  await page.mouse.up()
  marks.moment.events!.dragEnd = shown()
  const result = await explorer.locator(".result b.sig").innerText()
  const reached = parseFloat(result)
  if (!(reached >= parseFloat(N.t_yield))) throw new Error(`slider ended at ${await slider.inputValue()}x giving ${result}; expected at least ${N.t_yield}`)
  console.log(`ok  slider drag: ${await slider.inputValue()}x -> ${result} of market cap (trigger ${N.t_yield}, needs ${N.need_vol_trigger})`)
  await glide(page, 1300, 640, 18)
  await holdTo(m)

  // ---- shot: surprise (the implied confidential share, and the day it breaks) -------------------------------------
  await page.goto(`${BASE}/charts/confidential-residual/`, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await sleep(600)
  const card = page.locator("section.card", { hasText: "Implied confidential share, weekly" }).first()
  await scrollToEl(page, card, 70)
  m = begin("surprise")
  const c = (await card.locator(".chart").boundingBox())!
  const my = c.y + c.height * 0.5
  await glide(page, c.x + 90, my, 10)
  for (let x = c.x + 90; x < c.x + c.width * 0.66; x += 24) { await page.mouse.move(x, my, { steps: 2 }); await sleep(45) }
  await waitShown(4.4, m)
  let tip = ""
  let hit = false
  for (let x = c.x + c.width * 0.66; x < c.x + c.width - 10; x += 8) {
    await page.mouse.move(x, my, { steps: 2 })
    await sleep(40)
    tip = (await page.locator(".tt").first().innerText().catch(() => "")) ?? ""
    if (tip.includes(N.step_week)) { hit = true; break }
  }
  if (!hit || !tip.includes(N.step_week_share)) throw new Error(`NUMBER MISMATCH: tooltip says "${tip.replace(/\n/g, " ")}", expected ${N.step_week} and ${N.step_week_share}`)
  console.log(`ok  step tooltip: ${tip.replace(/\n/g, " ")}`)
  const dot = page.locator(".recharts-active-dot circle").first()
  const pt = (await dot.count()) ? await center(dot) : { x: 0, y: my }
  marks.surprise.point = pt.x ? pt : { x: c.x + c.width * 0.8, y: my }
  marks.surprise.events!.zoomIn = shown()
  await waitShown(marks.surprise.events!.zoomIn + 7.9, m) // zoom in, read the step, zoom back out
  await glide(page, 1500, 200, 16) // clear of the chart before scrolling
  const caveats = page.locator("section.card", { hasText: "Read this before quoting it" }).first()
  await scrollToEl(page, caveats, 90)
  await expectVisible(page, ["break_date"], "chart caveat")
  await holdTo(m)

  // ---- shot: checks (the wash and bot screen, then fees per $1M against other cross-chain protocols) -----------------
  await page.goto(`${BASE}/charts/wash-screen/`, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await sleep(600)
  const wcard = page.locator("section.card", { hasText: "Wash and bot screen" }).first()
  await scrollToEl(page, wcard, 70)
  m = begin("checks")
  const wc = (await wcard.locator(".chart").boundingBox())!
  const wy = wc.y + wc.height * 0.45
  await glide(page, wc.x + 90, wy, 10)
  for (let x = wc.x + 90; x < wc.x + wc.width - 20; x += 22) { await page.mouse.move(x, wy, { steps: 2 }); await sleep(55) }
  await expectVisible(page, ["wash_hf_2dp"], "wash screen")
  await waitShown(6.4, m)
  await page.goto(`${BASE}/charts/peer-fees/`, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await sleep(500)
  const pcard = page.locator("section.card", { hasText: "Fees per $1M" }).first()
  await scrollToEl(page, pcard, 70)
  const bar = pcard.locator(".recharts-bar-rectangle").nth(Number(N.near_fee_rank) - 1)
  const bb = (await bar.boundingBox())!
  await glide(page, bb.x + bb.width * 0.6, bb.y + bb.height / 2, 24)
  await sleep(300)
  const ptip = (await page.locator(".recharts-tooltip-wrapper").first().innerText().catch(() => "")) ?? ""
  if (!ptip.includes("NEAR Intents") || !ptip.includes(N.near_fee_1m_tip)) throw new Error(`NUMBER MISMATCH: peer tooltip says "${ptip.replace(/\n/g, " ")}", expected NEAR Intents and ${N.near_fee_1m_tip}`)
  console.log(`ok  peer tooltip: ${ptip.replace(/\n/g, " ")}`)
  await holdTo(m)

  await ctx.close()
  const vid = readdirSync(join(WORK, "raw")).find((f) => f.endsWith(".webm"))!
  renameSync(join(WORK, "raw", vid), join(WORK, "site.webm"))
  writeFileSync(join(WORK, "site_marks.json"), JSON.stringify(marks, null, 1))
  await browser.close()
  console.log("recorded", JSON.stringify(marks))
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1) })

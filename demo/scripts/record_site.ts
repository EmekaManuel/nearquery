// Records the hosted NearQuery dashboard at 1920x1080 with scripted scrolls, hovers and deliberate holds.
// Every number the video will show is asserted to be visible on the page first; a mismatch aborts the run.
import { chromium, type Locator, type Page } from "playwright"
import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const BASE = (process.env.SITE_URL ?? "https://emekamanuel.github.io/nearquery").replace(/\/$/, "")
const WORK = join(process.cwd(), "work")
const OUT = join(process.cwd(), "out")
const N = JSON.parse(readFileSync(join(OUT, "numbers.json"), "utf8")) as Record<string, string>
// planned (shown) seconds per shot; the recording keeps 0.6 s extra so cuts never land on a transition
const PLAN = { overview: 8, volume: 17, accounts: 17, value: 15 } as const
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
  if (missing.length) throw new Error(`NUMBER MISMATCH on ${where}: ${missing.map((k) => `${k}="${N[k]}"`).join(", ")} not found on the hosted page. Rebuild/redeploy the site or rerun the pipeline, then retry.`)
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
  const marks: Record<string, { startMs: number; shownMs: number }> = {}
  const begin = (name: keyof typeof PLAN) => { marks[name] = { startMs: Date.now() - t0 + PAD, shownMs: PLAN[name] * 1000 }; return Date.now() }
  const holdTo = async (segStart: number, name: keyof typeof PLAN) => {
    const left = segStart + PLAN[name] * 1000 + PAD - Date.now()
    if (left < 0) throw new Error(`shot "${name}" overran its ${PLAN[name]}s budget by ${(-left / 1000).toFixed(1)}s; shorten the script`)
    await sleep(left)
  }

  // ---- shot 2: overview ---------------------------------------------------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await sleep(500)
  await expectVisible(page, ["net_swap", "confidential", "revenue_year", "buyback_yield"], "overview tiles")
  let s = begin("overview")
  await glide(page, 1500, 700, 1)
  await sleep(2600)
  const info = page.locator(".tile .info").first()
  const ib = (await info.boundingBox())!
  await glide(page, ib.x + ib.width / 2, ib.y + ib.height / 2, 30)
  await sleep(2200)
  await glide(page, 1500, 760, 20)
  await holdTo(s, "overview")

  // ---- shot 3: daily volume (finding 1) -------------------------------------------------------------------
  const volCard = page.locator("section.card", { hasText: "Daily volume, public on-chain" }).first()
  await scrollToEl(page, volCard, 70)
  s = begin("volume")
  const seg = (label: string) => volCard.getByRole("radio", { name: label })
  await sleep(1200)
  let b = (await seg("90d").boundingBox())!
  await glide(page, b.x + b.width / 2, b.y + b.height / 2, 28)
  await page.mouse.down(); await page.mouse.up()
  await sleep(2800)
  b = (await seg("All").boundingBox())!
  await glide(page, b.x + b.width / 2, b.y + b.height / 2, 24)
  await page.mouse.down(); await page.mouse.up()
  await sleep(1600)
  const cb = (await volCard.locator(".chart").boundingBox())!
  const plotL = cb.x + 60, plotW = cb.width - 70
  const at = (frac: number) => plotL + plotW * frac
  await glide(page, at(0.1), cb.y + cb.height * 0.5, 20)
  for (const f of [0.14, 0.3, 0.55, 0.72, 0.8]) { await glide(page, at(f), cb.y + cb.height * 0.5, 16); await sleep(520) }
  await glide(page, at(0.2), cb.y + cb.height * 0.5, 30) // rests in the early-year stretch
  await holdTo(s, "volume")

  // ---- shot 4: accounts are not users (finding 2) -----------------------------------------------------------
  await page.getByRole("link", { name: /^Activity/ }).first().click()
  await page.waitForURL(/\/activity\/?$/)
  const accCard = page.locator("section.card", { hasText: "Accounts are not users" }).first()
  await scrollToEl(page, accCard, 70)
  await expectVisible(page, ["one_day_share", "implicit_accounts"], "activity accounts note")
  s = begin("accounts")
  await sleep(1500)
  const ab = (await accCard.locator(".chart").boundingBox())!
  await glide(page, ab.x + ab.width * 0.5, ab.y + ab.height * 0.6, 24)
  await sleep(800)
  await glide(page, ab.x + ab.width - 160, ab.y + ab.height * 0.4, 30)
  let tip = ""
  for (let x = ab.x + ab.width - 160; x <= ab.x + ab.width - 4; x += 14) { // walk right until the tooltip shows the latest month
    await page.mouse.move(x, ab.y + ab.height * 0.4, { steps: 3 })
    tip = (await page.locator(".tt").first().innerText().catch(() => "")) ?? ""
    if (tip.includes(N.repeat_pct_latest)) break
    await sleep(60)
  }
  await sleep(500)
  if (!tip.includes(N.repeat_pct_latest)) throw new Error(`NUMBER MISMATCH: tooltip says "${tip.replace(/\n/g, " ")}", expected ${N.repeat_pct_latest}`)
  console.log(`ok  accounts tooltip: ${N.repeat_pct_latest}`)
  await sleep(2200)
  const open = accCard.getByRole("link", { name: /Open/ })
  const ob = (await open.boundingBox())!
  await glide(page, ob.x + ob.width / 2, ob.y + ob.height / 2, 24)
  await sleep(500)
  await page.mouse.down(); await page.mouse.up()
  await page.waitForURL(/\/charts\/accounts-not-users\/?$/)
  await sleep(1400)
  const q = page.locator("section.card", { hasText: "The query" }).first()
  await scrollToEl(page, q, 80)
  await sleep(1800)
  const copy = q.getByRole("button", { name: "Copy" }).first()
  const kb = (await copy.boundingBox())!
  await glide(page, kb.x + kb.width / 2, kb.y + kb.height / 2, 30)
  await page.mouse.down(); await page.mouse.up()
  await sleep(1500)
  await holdTo(s, "accounts")

  // ---- shot 5: value capture (finding 3) ---------------------------------------------------------------------
  await page.getByRole("link", { name: /^Value capture/ }).first().click()
  await page.waitForURL(/\/value\/?$/)
  await sleep(800)
  await expectVisible(page, ["revenue_year", "buyback_yield", "yield_1x", "yield_10x"], "value capture")
  const table = page.locator("section.card table").first()
  await scrollToEl(page, table.locator("xpath=ancestor::section[1]"), 70)
  s = begin("value")
  await sleep(1800)
  const hi = async (mult: string) => {
    await page.evaluate((m) => {
      document.querySelectorAll("tbody tr").forEach((r) => { (r as HTMLElement).style.outline = "" ; r.querySelectorAll("td").forEach((c) => ((c as HTMLElement).style.background = "")) })
      const row = Array.from(document.querySelectorAll("tbody tr")).find((r) => r.children[0].textContent?.includes("current observed") && r.children[1].textContent?.trim() === m)
      row?.querySelectorAll("td").forEach((c) => ((c as HTMLElement).style.background = "var(--signal-soft)"))
    }, mult)
  }
  await hi("1×")
  await sleep(3800)
  await hi("10×")
  await sleep(3800)
  await holdTo(s, "value")

  await ctx.close()
  const vid = readdirSync(join(WORK, "raw")).find((f) => f.endsWith(".webm"))!
  renameSync(join(WORK, "raw", vid), join(WORK, "site.webm"))
  writeFileSync(join(WORK, "site_marks.json"), JSON.stringify(marks, null, 1))
  await browser.close()
  console.log("recorded", marks)
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1) })

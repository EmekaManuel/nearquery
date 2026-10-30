// Renders the Remotion composition twice (with and without burned-in captions) and writes the .srt.
// Caption readability rules are enforced here; a violation aborts the render.
import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { buildCaptions, checkCaptions, SHOTS, toSrt } from "../src/captions"

const root = process.cwd()
// Remotion's own headless shell crashes on some macOS versions; Playwright's Chromium (installed for the recorder) works.
const browserExecutable = process.env.BROWSER_EXECUTABLE ?? null
const read = <T,>(p: string): T => JSON.parse(readFileSync(join(root, p), "utf8")) as T

type Tok = { name: string; value: { light: string; dark: string } }
function palettes() {
  const toks = read<{ color: { tokens: Tok[] } }>("../brand/tokens.json").color.tokens
  const pick = (theme: "light" | "dark") => {
    const base: Record<string, string> = Object.fromEntries(toks.map((t) => [t.name, t.value[theme]]))
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v.startsWith("{") ? base[v.slice(1, -1)] : v]))
  }
  return { light: pick("light"), dark: pick("dark") }
}

async function main() {
  const numbers = read<Record<string, string>>("out/numbers.json")
  const marks = read<Record<string, { startMs: number; shownMs: number }>>("work/site_marks.json")
  const { durationSec } = read<{ durationSec: number }>("work/rerun_meta.json")
  const speed = durationSec / SHOTS.terminal
  const captionList = buildCaptions(numbers, speed)
  const problems = checkCaptions(captionList)
  if (problems.length) throw new Error("Caption rules violated:\n  " + problems.join("\n  "))
  mkdirSync(join(root, "out"), { recursive: true })
  writeFileSync(join(root, "out", "nearquery-demo.srt"), toSrt(captionList))

  const serveUrl = await bundle({ entryPoint: resolve(root, "src/index.ts"), publicDir: resolve(root, "public") })
  for (const [name, captions] of [["captions", true], ["plain", false]] as const) {
    const inputProps = { captions, numbers, marks, speed, tokens: palettes(), captionList, repoUrl: "github.com/EmekaManuel/nearquery" }
    const composition = await selectComposition({ serveUrl, id: "NearQueryDemo", inputProps, port: 3891, browserExecutable })
    let last = -1
    await renderMedia({
      composition, serveUrl, inputProps, port: 3891, browserExecutable, codec: "h264", crf: 16, pixelFormat: "yuv420p", muted: true,
      outputLocation: join(root, "work", `render-${name}.mp4`),
      onProgress: ({ progress }) => { const pct = Math.floor(progress * 10); if (pct !== last) { last = pct; console.log(`${name}: ${pct * 10}%`) } },
    })
  }
  console.log(`speed ${speed.toFixed(2)}x; captions ok; srt written`)
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1) })

import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk"
import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans"
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono"
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { FPS, SHOTS, shotStart, type Caption, type Numbers, type ShotName } from "./captions"

const display = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily
const sans = loadSans("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily

type Palette = Record<string, string>
export type Mark = { startMs: number; shownMs: number; events?: Record<string, number>; point?: { x: number; y: number } }
export type DemoProps = {
  captions: boolean
  numbers: Numbers
  marks: Record<string, Mark>
  speed: number
  tokens: { light: Palette; dark: Palette }
  captionList: Caption[]
  repoUrl: string
}

const f = (s: number) => Math.round(s * FPS)
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const

// ---- brand mark, drawn in (ring, tail, dot) ------------------------------------------------------------------
const Mark: React.FC<{ size: number; ink: string; signal: string; progress: number }> = ({ size, ink, signal, progress }) => {
  const ring = interpolate(progress, [0, 0.55], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const tail = interpolate(progress, [0.5, 0.8], [0, 1], clamp)
  const dot = interpolate(progress, [0.78, 1], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) })
  const C = 2 * Math.PI * 18
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="NearQuery mark">
      <circle cx="28" cy="28" r="18" fill="none" stroke={ink} strokeWidth="7" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} transform="rotate(-90 28 28)" />
      <line x1="35" y1="35" x2={35 + 11.5 * tail} y2={35 + 11.5 * tail} stroke={signal} strokeWidth="7" strokeLinecap="round" />
      <circle cx="55.5" cy="55.5" r={5.5 * dot} fill={signal} />
    </svg>
  )
}

const Fade: React.FC<{ children: React.ReactNode; inF?: number; outF?: number; dur: number }> = ({ children, inF = 8, outF = 8, dur }) => {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [0, inF, dur - outF, dur], [0, 1, 1, 0], clamp)
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

const Rise: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 22 })
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 28}px)`, ...style }}>{children}</div>
}

// ---- hook: the number first, then the question ---------------------------------------------------------------------
/** Counts up to exactly the string the pipeline produced (e.g. "$1.30B"), so the final frame matches the data. */
function countTo(target: string, t: number): string {
  const m = target.match(/^(\D*)([\d.]+)(\D*)$/)
  if (!m) return target
  const dec = (m[2].split(".")[1] ?? "").length
  return `${m[1]}${(parseFloat(m[2]) * t).toFixed(dec)}${m[3]}`
}

const Hook: React.FC<{ p: Palette; n: Numbers }> = ({ p, n }) => {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [f(0.3), f(2.6)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  return (
    <AbsoluteFill style={{ background: p["surface-100"], padding: "0 160px", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 70, left: 160, display: "flex", alignItems: "center", gap: 24 }}>
        <Mark size={72} ink={p.ink} signal={p.signal} progress={interpolate(frame, [0, 28], [0, 1], clamp)} />
        <Rise delay={6} style={{ fontFamily: mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.06em", textTransform: "uppercase", color: p["ink-muted"] }}>NearQuery · NEAR hackathon · thesis track</Rise>
      </div>
      <Rise delay={4} style={{ fontFamily: mono, fontWeight: 500, fontSize: 28, letterSpacing: "0.06em", textTransform: "uppercase", color: p["ink-muted"], marginBottom: 6 }}>NEAR Intents, NEAR&rsquo;s cross-chain settlement layer, settled</Rise>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 330, lineHeight: 1, letterSpacing: "-0.04em", color: p.ink, fontVariantNumeric: "tabular-nums" }}>{countTo(n.net_swap, t)}</div>
      <Rise delay={f(1.1)} style={{ fontFamily: mono, fontWeight: 400, fontSize: 30, color: p["ink-muted"], marginTop: 6 }}>net swap volume, 30 days to {n.cutoff}</Rise>
      <Rise delay={f(4.0)} style={{ fontFamily: display, fontWeight: 700, fontSize: 88, lineHeight: 1.08, letterSpacing: "-0.02em", color: p.ink, marginTop: 54 }}>Does any of it reach the NEAR token?</Rise>
    </AbsoluteFill>
  )
}

// ---- callouts over footage -------------------------------------------------------------------------------------------------
const Callout: React.FC<{ p: Palette; from: number; to: number; label: string; text?: string; style: React.CSSProperties }> = ({ p, from, to, label, text, style }) => {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [f(from), f(from + 0.4), f(to - 0.4), f(to)], [0, 1, 1, 0], clamp)
  const y = interpolate(frame, [f(from), f(from + 0.4)], [14, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
  return (
    <div style={{ position: "absolute", opacity: o, transform: `translateY(${y}px)`, background: p["surface-0"], border: `1px solid ${p.ink}`, padding: "16px 24px", maxWidth: 760, ...style }}>
      <div style={{ fontFamily: mono, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", color: p["ink-muted"] }}>{label}</div>
      {text && <div style={{ fontFamily: display, fontWeight: 700, fontSize: 44, lineHeight: 1.12, letterSpacing: "-0.01em", color: p.ink, marginTop: 6 }}>{text}</div>}
    </div>
  )
}

// ---- footage, with an optional push-in on one point --------------------------------------------------------------------------
type Zoom = { x: number; y: number; scale: number; t: [number, number, number, number] } // seconds from shot start: in start, in end, out start, out end
const Clip: React.FC<{ src: string; fromSec: number; rate?: number; badge?: string; p: Palette; zoom?: Zoom; children?: React.ReactNode }> = ({ src, fromSec, rate = 1, badge, p, zoom, children }) => {
  const frame = useCurrentFrame()
  const s = zoom ? interpolate(frame, [f(zoom.t[0]), f(zoom.t[1]), f(zoom.t[2]), f(zoom.t[3])], [1, zoom.scale, zoom.scale, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 1
  return (
    <AbsoluteFill style={{ background: p["surface-100"] }}>
      <AbsoluteFill style={zoom ? { transform: `scale(${s})`, transformOrigin: `${zoom.x}px ${zoom.y}px` } : undefined}>
        <OffthreadVideo src={staticFile(src)} startFrom={f(fromSec)} playbackRate={rate} muted style={{ width: 1920, height: 1080 }} />
      </AbsoluteFill>
      {children}
      {badge && (
        <div style={{ position: "absolute", top: 44, right: 56, fontFamily: mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.06em", textTransform: "uppercase", color: p.ink, background: p["surface-0"], border: `1px solid ${p.rule}`, padding: "8px 16px" }}>{badge}</div>
      )}
    </AbsoluteFill>
  )
}

/** A ring and date label pinned to the point the zoom is centred on (the point stays fixed on screen while the footage scales). */
const Pin: React.FC<{ p: Palette; x: number; y: number; from: number; to: number; label: string }> = ({ p, x, y, from, to, label }) => {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [f(from), f(from + 0.5), f(to - 0.4), f(to)], [0, 1, 1, 0], clamp)
  const r = interpolate(frame, [f(from), f(from + 0.6)], [90, 34], { ...clamp, easing: Easing.out(Easing.cubic) })
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={x} cy={y} r={r} fill="none" stroke={p.signal} strokeWidth={5} />
      </svg>
      <div style={{ position: "absolute", left: x + 56, top: y - 118, background: p["surface-0"], border: `1px solid ${p.ink}`, padding: "10px 18px", fontFamily: mono, fontWeight: 500, fontSize: 30, color: p.ink }}>{label}</div>
    </AbsoluteFill>
  )
}

// ---- falsifiers, drawn from pipeline output ------------------------------------------------------------------------------------------
const Falsify: React.FC<{ p: Palette; n: Numbers }> = ({ p, n }) => {
  if (!n.triggers_today.startsWith("none")) throw new Error(`falsifier card shows "Not triggered" for every row, but triggers_today is "${n.triggers_today}"; add per-row status before rendering`)
  const rows = [
    { side: "Bullish if", signal: "Captured revenue / market cap", trigger: `above ${n.t_yield} for 90 days`, today: n.today_yield },
    { side: "Bullish if", signal: "NEAR in the volume", trigger: `above ${n.t_touch}, two months running`, today: n.today_touch },
    { side: "Bearish if", signal: "Intents per day", trigger: `below ${n.t_ints} for 30 days`, today: n.today_ints },
    { side: "Bearish if", signal: "Top-5 solver share", trigger: `above ${n.t_top5}, two months running`, today: n.today_top5 },
  ]
  const frame = useCurrentFrame()
  const final = interpolate(frame, [f(6), f(6.5)], [0, 1], clamp)
  const col = { display: "grid", gridTemplateColumns: "190px 1fr 520px 190px 230px", alignItems: "center", columnGap: 24 } as const
  const head: React.CSSProperties = { fontFamily: mono, fontWeight: 500, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", color: p["ink-muted"] }
  return (
    <AbsoluteFill style={{ background: p["surface-100"], padding: "0 140px", justifyContent: "center" }}>
      <Rise delay={2} style={{ fontFamily: display, fontWeight: 700, fontSize: 84, letterSpacing: "-0.02em", color: p.ink, marginBottom: 44 }}>What would change our mind</Rise>
      <div style={{ background: p["surface-0"], border: `1px solid ${p.rule}` }}>
        <div style={{ ...col, ...head, padding: "18px 32px", borderBottom: `1px solid ${p.rule}` }}><span /><span>Signal</span><span>Trigger</span><span style={{ textAlign: "right" }}>Today</span><span style={{ textAlign: "right" }}>Status</span></div>
        {rows.map((r, i) => (
          <Rise key={r.signal} delay={f(1.2 + i * 0.75)} style={{ ...col, padding: "26px 32px", borderBottom: i < rows.length - 1 ? `1px solid ${p.rule}` : undefined }}>
            <span style={{ ...head, fontSize: 20 }}>{r.side}</span>
            <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 36, color: p.ink }}>{r.signal}</span>
            <span style={{ fontFamily: sans, fontSize: 34, color: p["ink-muted"] }}>{r.trigger}</span>
            <span style={{ fontFamily: mono, fontWeight: 500, fontSize: 38, color: p.ink, textAlign: "right" }}>{r.today}</span>
            <span style={{ ...head, fontSize: 21, textAlign: "right" }}>Not triggered</span>
          </Rise>
        ))}
      </div>
      <div style={{ opacity: final, transform: `translateY(${(1 - final) * 16}px)`, fontFamily: display, fontWeight: 700, fontSize: 64, letterSpacing: "-0.02em", color: p["signal-text"], marginTop: 44 }}>
        Today, {n.triggers_today} have triggered.
      </div>
    </AbsoluteFill>
  )
}

const Outro: React.FC<{ p: Palette; repoUrl: string }> = ({ p, repoUrl }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: p["surface-100"], alignItems: "center", justifyContent: "center", gap: 30 }}>
      <Rise delay={4}><Img src={staticFile("brand/nearquery-lockup.svg")} style={{ width: 800, height: "auto" }} /></Rise>
      <Rise delay={f(0.7)} style={{ fontFamily: display, fontWeight: 700, fontSize: 84, letterSpacing: "-0.02em", color: p.ink }}>Ask the chain. Show the work.</Rise>
      <Rise delay={f(1.8)} style={{ fontFamily: sans, fontWeight: 400, fontSize: 52, color: p["ink-muted"] }}>What would change your mind?</Rise>
      <Rise delay={f(2.6)} style={{ fontFamily: mono, fontWeight: 400, fontSize: 34, color: p.ink }}>{repoUrl}</Rise>
      <div style={{ position: "absolute", bottom: 56, fontFamily: mono, fontSize: 22, letterSpacing: "0.06em", textTransform: "uppercase", color: p["ink-muted"], opacity: interpolate(frame, [f(3.2), f(3.8)], [0, 1], clamp) }}>
        Built at NEAR HACKATHON · public on-chain data · MIT
      </div>
    </AbsoluteFill>
  )
}

const CaptionBar: React.FC<{ c: Caption; p: Palette }> = ({ c, p }) => {
  const frame = useCurrentFrame()
  const dur = f(c.end - c.start)
  const o = interpolate(frame, [0, 6, dur - 6, dur], [0, 1, 1, 0], clamp)
  return (
    <div style={{ position: "absolute", left: 140, right: 140, bottom: 52, opacity: o, background: p["surface-0"], border: `1px solid ${p.rule}`, padding: "22px 36px", fontFamily: sans, fontWeight: 400, fontSize: 40, lineHeight: 1.32, color: p.ink, textWrap: "balance" as never }}>
      {c.text.split(/(\d{4}-\d{2}-\d{2})/).map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: "nowrap" }}>{part}</span> : part))}
    </div>
  )
}

export const Demo: React.FC<DemoProps> = ({ captions, numbers: n, marks, speed, tokens, captionList, repoUrl }) => {
  const light = tokens.light
  const dark = tokens.dark
  const seq = (name: ShotName, node: React.ReactNode) => (
    <Sequence from={f(shotStart(name))} durationInFrames={f(SHOTS[name])} name={name}>
      <Fade dur={f(SHOTS[name])} inF={name === "hook" ? 1 : 6} outF={name === "outro" ? 1 : 6}>{node}</Fade>
    </Sequence>
  )
  const start = (name: string) => marks[name].startMs / 1000
  const dragEnd = marks.moment.events?.dragEnd ?? 11
  const pin = marks.surprise.point ?? { x: 1200, y: 500 }
  const zoomT = marks.surprise.events?.zoomIn ?? 6.2
  return (
    <AbsoluteFill style={{ background: light["surface-100"] }}>
      {seq("hook", <Hook p={light} n={n} />)}
      {seq("method", (
        <Clip src="clips/site.mp4" fromSec={start("method")} p={light}>
          <Callout p={light} from={0.8} to={4.8} label="Source" text="intents.near event logs" style={{ right: 70, top: 120 }} />
        </Clip>
      ))}
      {seq("moment", (
        <Clip src="clips/site.mp4" fromSec={start("moment")} p={light}>
          <Callout p={light} from={dragEnd + 0.2} to={17.6} label={`${n.t_yield} of market cap`} text={`= ${n.need_vol_trigger} today's volume`} style={{ right: 70, bottom: 170 }} />
        </Clip>
      ))}
      {seq("surprise", (
        <Clip src="clips/site.mp4" fromSec={start("surprise")} p={light} zoom={{ x: pin.x, y: pin.y, scale: 2.1, t: [zoomT, zoomT + 1.1, zoomT + 6.6, zoomT + 7.7] }}>
          <Pin p={light} x={pin.x} y={pin.y} from={zoomT + 0.9} to={zoomT + 6.6} label={n.break_date} />
        </Clip>
      ))}
      {seq("falsify", <Falsify p={light} n={n} />)}
      {seq("rerun", <Clip src="clips/rerun_hold.mp4" fromSec={0} rate={speed} badge={speed > 1.15 ? `Sped up ${speed.toFixed(1)}x` : "Real time"} p={dark} />)}
      {seq("outro", <Outro p={light} repoUrl={repoUrl} />)}
      {captions && captionList.filter((c) => c.burned).map((c) => {
        const inTerminal = c.start >= shotStart("rerun") && c.start < shotStart("outro")
        return (
          <Sequence key={c.start} from={f(c.start)} durationInFrames={f(c.end - c.start)}>
            <CaptionBar c={c} p={inTerminal ? dark : light} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

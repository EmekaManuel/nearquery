import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk"
import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans"
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono"
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { FPS, SHOTS, shotStart, type Caption, type Numbers, type ShotName } from "./captions"

const display = loadDisplay("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily
const sans = loadSans("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily

type Palette = Record<string, string>
export type DemoProps = {
  captions: boolean
  numbers: Numbers
  marks: Record<string, { startMs: number; shownMs: number }>
  speed: number
  tokens: { light: Palette; dark: Palette }
  captionList: Caption[]
  repoUrl: string
}

const f = (s: number) => Math.round(s * FPS)

// ---- brand mark, drawn in (ring, tail, dot) ------------------------------------------------------------------
const Mark: React.FC<{ size: number; ink: string; signal: string; progress: number }> = ({ size, ink, signal, progress }) => {
  const ring = interpolate(progress, [0, 0.55], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })
  const tail = interpolate(progress, [0.5, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  const dot = interpolate(progress, [0.78, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) })
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
  const o = interpolate(frame, [0, inF, dur - outF, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

const Rise: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 22 })
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 28}px)`, ...style }}>{children}</div>
}

// ---- cards --------------------------------------------------------------------------------------------------
const Hook: React.FC<{ p: Palette }> = ({ p }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: p["surface-100"], justifyContent: "center", padding: "0 180px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 72 }}>
        <Mark size={260} ink={p.ink} signal={p.signal} progress={interpolate(frame, [4, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        <div>
          <Rise delay={12} style={{ fontFamily: mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.06em", textTransform: "uppercase", color: p["ink-muted"], marginBottom: 22 }}>NearQuery · NEAR hackathon · thesis track</Rise>
          <Rise delay={18} style={{ fontFamily: display, fontWeight: 700, fontSize: 112, lineHeight: 1.04, letterSpacing: "-0.02em", color: p.ink }}>Is NEAR Intents real settlement?</Rise>
          <Rise delay={f(3.6)} style={{ fontFamily: sans, fontWeight: 400, fontSize: 58, lineHeight: 1.25, color: p["ink-muted"], marginTop: 28 }}>And does it create value for NEAR?</Rise>
        </div>
      </div>
    </AbsoluteFill>
  )
}

const Outro: React.FC<{ p: Palette; repoUrl: string }> = ({ p, repoUrl }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: p["surface-100"], alignItems: "center", justifyContent: "center", gap: 36 }}>
      <Rise delay={4}><Img src={staticFile("brand/nearquery-lockup.svg")} style={{ width: 880, height: "auto" }} /></Rise>
      <Rise delay={f(0.7)} style={{ fontFamily: display, fontWeight: 700, fontSize: 84, letterSpacing: "-0.02em", color: p.ink }}>Ask the chain. Show the work.</Rise>
      <Rise delay={f(1.4)} style={{ fontFamily: mono, fontWeight: 400, fontSize: 34, color: p["ink-muted"] }}>{repoUrl}</Rise>
      <div style={{ position: "absolute", bottom: 56, fontFamily: mono, fontSize: 22, letterSpacing: "0.06em", textTransform: "uppercase", color: p["ink-muted"], opacity: interpolate(frame, [f(2), f(2.6)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        Built at NEAR HACKATHON · public on-chain data · MIT
      </div>
    </AbsoluteFill>
  )
}

// ---- footage ----------------------------------------------------------------------------------------------------
const Clip: React.FC<{ src: string; fromSec: number; rate?: number; badge?: string; p: Palette }> = ({ src, fromSec, rate = 1, badge, p }) => (
  <AbsoluteFill style={{ background: p["surface-100"] }}>
    <OffthreadVideo src={staticFile(src)} startFrom={f(fromSec)} playbackRate={rate} muted style={{ width: 1920, height: 1080 }} />
    {badge && (
      <div style={{ position: "absolute", top: 44, right: 56, fontFamily: mono, fontWeight: 500, fontSize: 24, letterSpacing: "0.06em", textTransform: "uppercase", color: p.ink, background: p["surface-0"], border: `1px solid ${p.rule}`, padding: "8px 16px" }}>{badge}</div>
    )}
  </AbsoluteFill>
)

const CaptionBar: React.FC<{ c: Caption; p: Palette }> = ({ c, p }) => {
  const frame = useCurrentFrame()
  const dur = f(c.end - c.start)
  const o = interpolate(frame, [0, 6, dur - 6, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  return (
    <div style={{ position: "absolute", left: 140, right: 140, bottom: 52, opacity: o, background: p["surface-0"], border: `1px solid ${p.rule}`, padding: "22px 36px", fontFamily: sans, fontWeight: 400, fontSize: 40, lineHeight: 1.32, color: p.ink, textWrap: "balance" as never }}>
      {c.text.split(/(\d{4}-\d{2}-\d{2})/).map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: "nowrap" }}>{part}</span> : part))}
    </div>
  )
}

export const Demo: React.FC<DemoProps> = ({ captions, numbers, marks, speed, tokens, captionList, repoUrl }) => {
  const light = tokens.light
  const dark = tokens.dark
  const seq = (name: ShotName, node: React.ReactNode) => (
    <Sequence from={f(shotStart(name))} durationInFrames={f(SHOTS[name])} name={name}>
      <Fade dur={f(SHOTS[name])} inF={name === "hook" ? 1 : 6} outF={name === "outro" ? 1 : 6}>{node}</Fade>
    </Sequence>
  )
  const site = (name: "overview" | "volume" | "accounts" | "value") => seq(name, <Clip src="clips/site.mp4" fromSec={marks[name].startMs / 1000} p={light} />)
  return (
    <AbsoluteFill style={{ background: light["surface-100"] }}>
      {seq("hook", <Hook p={light} />)}
      {site("overview")}
      {site("volume")}
      {site("accounts")}
      {site("value")}
      {seq("terminal", <Clip src="clips/rerun.mp4" fromSec={0} rate={speed} badge={`Sped up ${speed.toFixed(1)}x`} p={dark} />)}
      {seq("outro", <Outro p={light} repoUrl={repoUrl} />)}
      {captions && captionList.filter((c) => c.burned).map((c) => {
        const inTerminal = c.start >= shotStart("terminal") && c.start < shotStart("outro")
        return (
          <Sequence key={c.start} from={f(c.start)} durationInFrames={f(c.end - c.start)}>
            <CaptionBar c={c} p={inTerminal ? dark : light} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

# NearQuery

**Ask the chain. Show the work.**

NearQuery is a re-runnable investment thesis for NEAR, built for the NEAR Hackathon (thesis track). It asks one question of on-chain data (is NEAR Intents becoming real cross-chain settlement, and does that create value for NEAR?) and shows every step of the answer. The brand exists to make that evidence easy to read and hard to misread.

## Brand principles

1. **Evidence over conviction.** The track is judged on the evidence, so the brand never cheerleads. No "to the moon", no rocket imagery, no bull-and-bear colors.
2. **Every number carries its receipt.** A figure without a source and a date range is not finished.
3. **One answer per view.** The signal color marks the single thing a page is about: the series the claim rests on, or the latest data point. Everything else is ink and gray.
4. **Paper, not a trading terminal.** Warm paper ground, ink text, hairline rules, square data surfaces. It should read like a well-made research note.

## Voice and content

- Write findings as plain claims with a number: "62% of volume came from 4% of users (2025-11-01 → 2026-10-29)."
- Lead with what the data shows; put the caveat in the next sentence, not a footnote.
- Say "we couldn't measure this" when that's true. A stated gap is evidence too.
- Numbers: thousands separators, units always (`$`, `NEAR`, `txs`), dates as `YYYY-MM-DD`, ranges with `→`.
- Name the product **NearQuery**: one word, capital N and Q. Refer to the protocol as **NEAR** and the product as **NEAR Intents**.
- Casing: sentence case for headings and buttons; uppercase only for `label` text (source lines, tags).

## Logo

The mark is a **Q drawn as a lens**: an ink ring (the query) with a signal-colored tail that ends in a separate dot (the answer, a single data point). It never changes color except between the light and dark versions.

| Asset | Use |
| --- | --- |
| `nearquery-lockup.svg` / `-dark.svg` | Default. README header, dashboard top bar, slides. |
| `nearquery-mark.svg` / `-dark.svg` | Square spaces: avatars, app icon, small headers. |
| `nearquery-wordmark.svg` / `-dark.svg` | When the mark already appears nearby. |
| `nearquery-favicon.svg` | Browser tab: the mark on a paper tile. |

- **Clear space:** keep the width of the ring's stroke × 2 (about 14px at 64px) empty on every side.
- **Minimum size:** mark 16px; lockup 120px wide.
- Use the `-dark` files on `surface-100` dark or any ground darker than `#5b5648`.
- Don't recolor, outline, rotate, add effects, or put the mark on photos or busy backgrounds. Don't separate the dot from the tail or move it.
- The wordmark is outlined Space Grotesk Bold, so it renders identically without the font installed.

## Color

Two themes: **Paper** (light, default) and **Terminal** (dark). Every token has both.

- **Grounds:** `surface-100` for the page, `surface-0` for raised panels, `surface-200` for recessed areas.
- **Text:** `ink` for everything readable, `ink-muted` for captions, axis labels and source lines. Both pass 4.5:1 on every surface in both themes.
- **Signal:** `signal` for graphics and text 24px and up; `signal-text` for body-size signal text (key figures, links). Use the signal color once per view.
- **Highlight:** `signal-soft` behind a figure or chart range under discussion, with `ink` text on it.
- **Rules:** `rule` for gridlines, dividers and borders. Separate things with hairlines, not shadows.

### Charts

- Series order: `chart-1` (the claim, same as signal) → `chart-2` blue → `chart-3` teal → `chart-4` ochre → `chart-5` gray for "other" and context.
- Series differ in lightness as well as hue, so they survive grayscale and color blindness. Still label lines directly; never rely on color alone.
- No red/green for up/down. If direction needs encoding, use `chart-2` for down and `chart-1` for up, plus an arrow or sign.
- Gridlines: `rule`, 1px, horizontal only. Axes and ticks: `ink-muted`, `data` style.
- Every chart has a `label`-style source line under it: `SOURCE · <dataset> · <start> → <end>`.
- Data surfaces are square (`radius-0`).

## Typography

Three Google Fonts families, each with one job:

| Family | Token | Job |
| --- | --- | --- |
| Space Grotesk 700 | `display` | Headlines, the thesis claim, findings titles. |
| IBM Plex Sans 400 | `sans` | Prose: the thesis, README, explanations. |
| IBM Plex Mono 400/500 | `mono` | Numbers, tables, queries, account IDs, labels. |

Load them from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
```

Headline figures (`figure` style) are always mono so digits line up, and always sit with a `label` naming the metric and date range.

## Spacing and shape

- A 4px base: `space-1` 4, `space-2` 8, `space-4` 16, `space-6` 24, `space-8` 32, `space-12` 48.
- Shapes are mostly square. Charts and tables use `radius-0`, controls `radius-sm`, cards `radius-md`. Nothing is pill-shaped except the mark's dot.

## Iconography

NearQuery has no icon set, on purpose: labels are words. If an interface truly needs icons, use outline icons at 1.5px stroke in `ink-muted`, never filled, never in the signal color.

## Social and launch

- `nearquery-social-card.png` (1200 × 675) is the image for the hackathon demo post on X and the link preview (`og:image`).
- `nearquery-avatar.png` (400 × 400) is the X profile picture.
- Tagline: **Ask the chain. Show the work.**

## Using this system in the code

- Copy the color, type, spacing and radius values from `tokens.json` into the dashboard's CSS variables, using the same names (`--ink`, `--signal`, `--space-4`…) so the README and the code agree.
- Both themes are required: switch on `prefers-color-scheme` and allow a manual toggle.
- Download the SVGs from the Logos group into the repo's `brand/` folder and reference them from the README and the dashboard.

#!/usr/bin/env bash
# Builds the demo video end to end. Run from the repo root (make video). Nothing is uploaded or posted.
#   SITE_URL=...   site to record (default: the hosted GitHub Pages site)
#   SKIP_SITE=1    reuse demo/work/site.webm instead of re-recording the site
#   SKIP_VHS=1     reuse demo/work/rerun.mp4 instead of re-running `make all` in the terminal clip
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work out public/clips public/brand

[ -d node_modules ] || npm ci --no-audit --no-fund
cp ../brand/logos/*.svg public/brand/

echo "== 1/5 record the site (numbers are asserted on the page first)"
if [ "${SKIP_SITE:-0}" != "1" ]; then npx tsx scripts/record_site.ts; fi

echo "== 2/5 record the terminal re-run"
if [ "${SKIP_VHS:-0}" != "1" ]; then vhs rerun.tape; fi

echo "== 3/5 normalise clips to 1920x1080 / 30 fps"
ffmpeg -v error -y -i work/site.webm -vf "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" -c:v libx264 -crf 14 -preset medium -an public/clips/site.mp4
python3 scripts/trim_idle.py work/rerun.mp4 work/rerun_trim.mp4
ffmpeg -v error -y -i work/rerun_trim.mp4 -vf "fps=30,pad=1920:1080:0:0:color=0x121210,format=yuv420p" -c:v libx264 -crf 14 -preset medium -an public/clips/rerun.mp4
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 public/clips/rerun.mp4)
echo "{\"durationSec\": $DUR}" > work/rerun_meta.json
ffmpeg -v error -y -i public/clips/rerun.mp4 -vf "tpad=stop_mode=clone:stop_duration=4" -c:v libx264 -crf 14 -preset medium -an public/clips/rerun_hold.mp4

echo "== 4/5 render with Remotion (captioned + plain) and write the .srt"
BROWSER_EXECUTABLE="${BROWSER_EXECUTABLE:-$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | head -1)}" npx tsx scripts/render.ts

echo "== 5/5 final encode with ffmpeg and verification"
for v in captions plain; do
  name=$([ "$v" = captions ] && echo nearquery-demo || echo nearquery-demo-nocaptions)
  # Remotion writes full-range yuvj420p/BT.470BG; convert to limited-range BT.709 yuv420p for players and X.
  ffmpeg -v error -y -i "work/render-$v.mp4" \
    -vf "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd,format=yuv420p" \
    -c:v libx264 -preset slow -crf 18 -r 30 -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -movflags +faststart -an "out/$name.mp4"
  eval "$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -of default=nw=1 "out/$name.mp4")"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$name.mp4")
  echo "$name.mp4: ${dur}s $codec_name ${width}x${height} $r_frame_rate $pix_fmt $(du -h "out/$name.mp4" | cut -f1)"
  [ "$codec_name" = h264 ] && [ "$width" = 1920 ] && [ "$height" = 1080 ] && [ "$r_frame_rate" = "30/1" ] && [ "$pix_fmt" = yuv420p ] || { echo "FAIL: unexpected stream format"; exit 1; }
  awk -v d="$dur" 'BEGIN{exit !(d>=60 && d<90)}' || { echo "FAIL: duration ${dur}s outside 60-90 s"; exit 1; }
done
echo "done: demo/out/nearquery-demo.mp4, nearquery-demo-nocaptions.mp4, nearquery-demo.srt"

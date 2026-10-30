"""Cut dead time out of the VHS terminal clip.

Finds frozen stretches with ffmpeg's freezedetect, drops the head (before the prompt is shown) and the
long idle stretch after `make all` finishes (keeping a beat before and after), and writes the trimmed clip.
Usage: python3 trim_idle.py work/rerun.mp4 work/rerun_trim.mp4
"""
import re
import subprocess
import sys

src, dst = sys.argv[1:3]
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-vf", "freezedetect=n=-55dB:d=2", "-an", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", log)]
freezes = list(zip(starts, ends))
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True).stdout)
cuts = [(0.0, 1.4)]  # blank head before the prompt appears
long = [f for f in freezes if f[1] - f[0] > 8]
if long:
    a, b = max(long, key=lambda f: f[1] - f[0])
    cuts.append((a + 1.2, b - 0.8))  # keep a beat of the finished output and the moment before typing
keep = "+".join(f"between(t,{a},{b})" for a, b in cuts)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"select='not({keep})',setpts=N/(30*TB)", "-r", "30", "-an", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", dst], check=True)
out = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dst], capture_output=True, text=True).stdout)
print(f"terminal clip {dur:.1f}s -> {out:.1f}s (cut {[(round(a, 1), round(b, 1)) for a, b in cuts]})")

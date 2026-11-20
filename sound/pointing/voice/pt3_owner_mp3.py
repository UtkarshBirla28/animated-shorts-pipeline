"""The owner's listening copy of the v3 voice: an mp3 at -16 LUFS (written, never played).
  python pt3_owner_mp3.py [--dir _v3] [--out "<repo>/pointing_preview/voice_5_FULL_VOICE_v3 (final script).mp3"]
The voice file itself stays at -17.5 LUFS with its peaks under -1 dBFS and no limiter. This COPY is turned up by the
difference; the few peaks that would pass -1 dBFS are caught by a look-ahead limiter (ffmpeg alimiter), and the result is
measured again (BS.1770, own + ffmpeg ebur128) until it reads -16.0 +- 0.1 LUFS."""
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

import pt_lib as L

sys.stdout.reconfigure(encoding="utf-8")
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
D = L.HERE / arg("--dir", "_v3")
OUT = Path(arg("--out", str(L.ROOT / "pointing_preview" / "voice_5_FULL_VOICE_v3 (final script).mp3")))
TARGET = -16.0
src = D / "voice.wav"
I0 = L.lufs(L.read(src, ch=2))
g = TARGET - I0
tmp = OUT.with_suffix(".tmp.wav")
for k in range(5):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"volume={g:.3f}dB,alimiter=limit=0.891:attack=2:release=40:level=disabled",
                    "-c:a", "pcm_s24le", str(tmp)], check=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # 2026-11-20: measure the MP3 itself (the encode moved the level by -0.27 LU when the wav was measured instead)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-c:a", "libmp3lame", "-b:a", "192k", str(OUT)], check=True)
    y = L.read(OUT, ch=2)
    I = L.lufs(y)
    print(f"  pass {k + 1}: gain {g:+.2f} dB -> mp3 {I:.2f} LUFS, peak {np.max(np.abs(y)):.3f}")
    if abs(I - TARGET) <= 0.05:
        break
    g += TARGET - I
tmp.unlink()
y = L.read(OUT, ch=2)
eb = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(OUT), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
mI = re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)
tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", eb)
print(f"written (not played): {OUT}\n  {len(y) / L.SR:.2f} s, {L.lufs(y):.2f} LUFS (ffmpeg ebur128 {mI[-1] if mI else '?'} LUFS, true peak {tp[-1] if tp else '?'} dBFS), gain {g:+.2f} dB over the voice file ({I0:.2f} LUFS)")

"""Speech rate (words/s inside the spoken span, pauses > 0.25 s removed), F0 median and per-word timing of short takes.
Usage: python -s pace_probe.py <file.mp3> [...]"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent)); from short_cfg import SHORT; sys.path.insert(0, str(Path(__file__).parent.parent / "sound" / SHORT / "voice"))
import voice_build as vb  # noqa
from voice_audit import load, f0_track, SR  # noqa
sys.stdout.reconfigure(encoding="utf-8")
for p in sys.argv[1:]:
    x = load(p); ww = vb.whisper(x.astype(np.float32))
    if not ww: print(p, "no words"); continue
    s0, e1 = ww[0]["s"], ww[-1]["e"]
    gaps = sum(max(0.0, ww[k + 1]["s"] - ww[k]["e"] - 0.25) for k in range(len(ww) - 1))
    f0 = f0_track(x, s0, e1)
    print(f"{Path(p).name:12} span {e1 - s0:5.2f}s  {len(ww) / max(0.3, e1 - s0 - gaps):4.2f} w/s  F0 {np.median(f0) if len(f0) else 0:5.0f} Hz  p_min {min(w['p'] for w in ww):.2f} | "
          + " ".join(f"{w['w']}({w['e'] - w['s']:.2f})" for w in ww[:6]))

"""Voiced-frame spectral tilt (2-5 kHz vs 150-500 Hz, dB) of takes vs a set of reference beats (one-take consistency).
Usage: python -s tilt_check.py <ref dir with bNN.mp3> <candidate.mp3> [...]"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from voice_audit import load, SR
from voice_pitch import yin_f0
sys.stdout.reconfigure(encoding="utf-8")
def tilt(p):
    x = load(p); n = 1024; win, hop = n, int(0.02 * SR)
    S = np.zeros(n // 2 + 1); c = 0
    for k in range(0, len(x) - win, hop):
        fr = x[k:k + win]
        if np.sqrt(np.mean(fr ** 2)) < 0.01: continue
        v, q = yin_f0(fr, SR)
        if not v or q > 0.2: continue
        S += np.abs(np.fft.rfft(fr[:n] * np.hanning(n))) ** 2; c += 1
    f = np.fft.rfftfreq(n, 1 / SR); b = lambda lo, hi: 10 * np.log10(S[(f >= lo) & (f < hi)].mean() + 1e-20)
    return b(2000, 5000) - b(150, 500)
ref = Path(sys.argv[1]); refs = {p.name: tilt(p) for p in sorted(ref.glob("b*.mp3")) if p.name != "b10.mp3"}
med = float(np.median(list(refs.values())))
print("reference beats tilt median %.1f dB (range %.1f .. %.1f)" % (med, min(refs.values()), max(refs.values())))
for p in sys.argv[2:]:
    t = tilt(p); print(f"{p:60} tilt {t:6.1f} dB  ({t - med:+.1f} vs median)")

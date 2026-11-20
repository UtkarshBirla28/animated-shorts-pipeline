"""Measure the boss 'Cancel it!' takes (P2): speech span, level, peak, voiced F0 (autocorrelation, 70-400 Hz, gruff
voices give few voiced frames), shout energy (1-4 kHz share), roughness (frame-to-frame F0 jitter) and Whisper p.
Usage: python -s boss_probe.py <mp3> ..."""
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
import voice_build as vb  # noqa: E402
from voice_audit import load, SR  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")


def f0_frames(x, a, b):
    hop, win = int(0.01 * SR), int(0.04 * SR)
    out = []
    for i in range(int(a * SR), int(b * SR) - win, hop):
        s = x[i:i + win] * np.hanning(win)
        if np.sqrt(np.mean(s ** 2)) < 10 ** (-38 / 20):
            continue
        ac = np.correlate(s, s, "full")[win - 1:]
        lo, hi = int(SR / 400), int(SR / 70)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] / (ac[0] + 1e-12) > 0.45:
            out.append(SR / k)
    return np.array(out)


for p in sys.argv[1:]:
    x = load(Path(p))
    hop = int(0.01 * SR)
    n = len(x) // hop
    db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    on = np.where(db > -40)[0]
    a, b = on[0] * 0.01, (on[-1] + 1) * 0.01
    seg = x[int(a * SR):int(b * SR)]
    rms = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
    pk = 20 * np.log10(np.max(np.abs(seg)) + 1e-9)
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    fr = np.fft.rfftfreq(len(seg), 1 / SR)
    shout = sp[(fr > 1000) & (fr < 4000)].sum() / sp[(fr > 80) & (fr < 8000)].sum()
    f = f0_frames(x, a, b)
    jit = np.median(np.abs(np.diff(12 * np.log2(f)))) if len(f) > 3 else float("nan")
    ww = vb.whisper(x.astype(np.float32))
    print(f"{Path(p).name}: span {a:.2f}-{b:.2f} ({b - a:.2f}s) rms {rms:5.1f} dB peak {pk:5.1f} dB  F0 med {np.median(f) if len(f) else 0:4.0f} Hz "
          f"(n {len(f)}, p10 {np.percentile(f, 10) if len(f) else 0:.0f} p90 {np.percentile(f, 90) if len(f) else 0:.0f})  jitter {jit:.2f} st  1-4k {shout:.2f}  "
          f"heard: {' '.join(w['w'] + '(%.2f)' % w['p'] for w in ww)}")

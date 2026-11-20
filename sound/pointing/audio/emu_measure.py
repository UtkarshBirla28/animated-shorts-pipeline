# Measures train-departure candidates (nothing is played): per 0.25 s the level and the strongest tones of 300-5000 Hz,
# then a summary: how much of the time a clear tone stands out (prominence >= 10 dB), whether that whine RISES
# (a ridge tracked from frame to frame: its pitch change, first to last), the onset (the level of the first 0.3 s
# against the loudest second) and the steadiness of the noise floor.
# usage: python -s emu_measure.py file.wav [...]   |   python -s emu_measure.py --current   (renders foley.depart)
import os
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import SR, read_wav


def tones(seg, sr, lo=300, hi=5000, n=3):
    f, P = signal.welch(seg, sr, nperseg=4096, noverlap=2048)
    m = (f >= lo) & (f <= hi)
    f, db = f[m], 10 * np.log10(P[m] + 1e-20)
    base = signal.medfilt(db, 61)
    pr = db - base
    pk, _ = signal.find_peaks(pr, distance=8)
    pk = sorted(pk, key=lambda i: -pr[i])[:n]
    return [(float(f[i]), float(pr[i])) for i in pk]


def measure(name, x, sr=SR, step=0.25, show=True):
    m = x.mean(0) if x.ndim > 1 else x
    out = []
    hop = int(step * sr)
    for k in range(0, len(m) - hop, hop):
        seg = m[k:k + hop * 2] if k + hop * 2 <= len(m) else m[k:]
        lvl = 20 * np.log10(np.sqrt(np.mean(m[k:k + hop] ** 2)) + 1e-12)
        out.append((k / sr, lvl, tones(seg, sr)))
    # the ridge: follow the strongest tone with prominence >= 8 dB, allowing 12 % pitch moves per step
    ridges, cur = [], []
    for t, lvl, tn in out:
        cand = [(f, p) for f, p in tn if p >= 8]
        nxt = None
        if cur:
            fl = cur[-1][1]
            near = [(f, p) for f, p in cand if abs(f - fl) / fl < 0.12]
            if near:
                nxt = max(near, key=lambda q: q[1])
        if nxt is None:
            if len(cur) >= 4:
                ridges.append(cur)
            cur = [(t, cand[0][0], cand[0][1])] if cand else []
        else:
            cur.append((t, nxt[0], nxt[1]))
    if len(cur) >= 4:
        ridges.append(cur)
    tonal = np.mean([any(p >= 10 for _, p in tn) for _, _, tn in out]) if out else 0
    lv = np.array([o[1] for o in out])
    loud = np.max(lv) if len(lv) else -99
    on = lv[0] if len(lv) else -99
    if show:
        print(f"== {name}: {len(m) / sr:.2f} s, loudest 0.25 s {loud:.1f} dBFS, first 0.25 s {on:.1f} dBFS, tonal (>=10 dB) {tonal * 100:.0f} % of the time")
        for t, lvl, tn in out:
            print(f"   {t:5.2f} {lvl:6.1f}  " + "  ".join(f"{f:6.0f}({p:4.1f})" for f, p in tn))
        for r in sorted(ridges, key=lambda r: -len(r))[:4]:
            f0, f1 = r[0][1], r[-1][1]
            print(f"   ridge {r[0][0]:.2f}-{r[-1][0]:.2f} s: {f0:.0f} -> {f1:.0f} Hz ({(f1 / f0 - 1) * 100:+.0f} %), mean prominence {np.mean([q[2] for q in r]):.1f} dB")
    return dict(tonal=tonal, ridges=ridges, loud=loud, on=on)


if __name__ == "__main__":
    if "--current" in sys.argv:
        import foley
        y, lead = foley.depart(7.0, seed=1)
        measure("CURRENT foley.depart(7.0) (Australian EMU + motor model)", y)
    for p in [a for a in sys.argv[1:] if not a.startswith("--")]:
        x, sr = read_wav(p)
        measure(os.path.basename(p), x, sr)

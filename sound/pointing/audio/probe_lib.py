# Measures the library files (nothing is played): per-file level, and a time map of level / brightness, so that cuts are
# chosen from numbers.  usage: python -s probe_lib.py [name ...] [--step 0.5] [--from a --to b]
import os, sys, json
import numpy as np
from scipy import signal
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from dsp import SR, read_wav, integrated, true_peak, st
LIB = os.path.join(HERE, "_lib")
BARS = " .:-=+*#%@"


def load(name):
    x, sr = read_wav(os.path.join(LIB, name + ".wav"))
    assert sr == SR, (name, sr)
    return x


def tmap(x, step):
    m = x.mean(0)
    n = int(step * SR)
    rows = []
    for i in range(0, len(m) - n + 1, n):
        s = m[i:i + n]
        rms = 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)
        S = np.abs(np.fft.rfft(s * np.hanning(n))) ** 2
        f = np.fft.rfftfreq(n, 1 / SR)
        cen = float((S * f).sum() / (S.sum() + 1e-20))
        pk = f[np.argmax(S[(f > 150)]) + np.searchsorted(f, 150)]
        flat = float(np.exp(np.mean(np.log(S[(f > 200) & (f < 6000)] + 1e-20))) / (np.mean(S[(f > 200) & (f < 6000)]) + 1e-20))
        rows.append((i / SR, rms, cen, pk, flat))
    return rows


if __name__ == "__main__":
    a = sys.argv[1:]
    step = float(a[a.index("--step") + 1]) if "--step" in a else None
    t0 = float(a[a.index("--from") + 1]) if "--from" in a else 0.0
    t1 = float(a[a.index("--to") + 1]) if "--to" in a else 1e9
    names = [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or a[i - 1] not in ("--step", "--from", "--to"))]
    if not names:
        names = sorted(f[:-4] for f in os.listdir(LIB) if f.endswith(".wav"))
    for nm in names:
        x = load(nm)
        d = x.shape[1] / SR
        L = integrated(st(x.mean(0)))
        print(f"== {nm}: {d:.2f} s, {x.shape[0]} ch, peak {20*np.log10(np.abs(x).max()+1e-9):.1f} dBFS, {L:.1f} LUFS")
        stp = step or (0.1 if d < 6 else 0.25 if d < 20 else 0.5 if d < 70 else 2.0)
        rows = [r for r in tmap(x, stp) if t0 <= r[0] < t1]
        if step or len(names) <= 3:
            for t, rms, cen, pk, flat in rows:
                print(f"  {t:7.2f}  {rms:6.1f} dB  cen {cen:6.0f} Hz  peak {pk:6.0f} Hz  flat {flat:.3f}  " + "#" * max(0, int((rms + 70) / 2)))
        else:
            lv = np.array([r[1] for r in rows]); cen = np.array([r[2] for r in rows])
            print(f"   step {stp}s  level " + "".join(BARS[int(np.clip((v + 66) / 6, 0, 9))] for v in lv))
            print(f"   cen kHz    " + "".join(str(int(min(9, c / 500))) for c in cen) + "   (digit = centroid / 500 Hz)")

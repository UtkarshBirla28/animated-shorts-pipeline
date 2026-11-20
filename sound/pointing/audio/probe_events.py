# lists the separate sound events of a library file (start, length, peak, brightness): python -s probe_events.py name [thr_db_over_floor] [min_gap]
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from dsp import SR, read_wav


def events(m, thr_over=12.0, min_gap=0.08, hop=0.005, abs_floor=-70.0):
    h = int(hop * SR)
    e = np.sqrt((m[: len(m) // h * h] ** 2).reshape(-1, h).mean(1) + 1e-14)
    db = 20 * np.log10(e)
    floor = max(np.percentile(db, 15), abs_floor)
    on = db > floor + thr_over
    ev, i, n = [], 0, len(on)
    while i < n:
        if on[i]:
            j = i
            last = i
            while j < n and (on[j] or (j - last) * hop < min_gap):
                if on[j]:
                    last = j
                j += 1
            ev.append((i * hop, (last + 1) * hop))
            i = j
        else:
            i += 1
    return ev, floor, db


if __name__ == "__main__":
    nm = sys.argv[1]
    thr = float(sys.argv[2]) if len(sys.argv) > 2 else 12.0
    gap = float(sys.argv[3]) if len(sys.argv) > 3 else 0.08
    x, sr = read_wav(os.path.join(HERE, "_lib", nm + ".wav")); m = x.mean(0)
    ev, floor, db = events(m, thr, gap)
    print(f"== {nm}: {len(m)/SR:.2f} s, floor {floor:.1f} dBFS, {len(ev)} events (thr +{thr} dB, gap {gap} s)")
    for a, b in ev[:80]:
        s = m[int(a * SR): int(b * SR)]
        if len(s) < 64:
            continue
        S = np.abs(np.fft.rfft(s * np.hanning(len(s)))) ** 2
        f = np.fft.rfftfreq(len(s), 1 / SR)
        cen = (S * f).sum() / (S.sum() + 1e-20)
        pkf = f[np.argmax(S)]
        lo = 10 * np.log10(S[f < 300].sum() / (S.sum() + 1e-20) + 1e-9)
        print(f"  {a:7.3f}-{b:7.3f} ({b-a:5.3f} s) peak {20*np.log10(np.abs(s).max()+1e-9):6.1f} dBFS rms {20*np.log10(np.sqrt(np.mean(s**2))+1e-9):6.1f}  cen {cen:6.0f} Hz  top {pkf:6.0f} Hz  <300Hz {lo:5.1f} dB")

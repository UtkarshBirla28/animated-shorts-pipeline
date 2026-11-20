"""Level + pitch contour of a take's line (every 30 ms), with whisper word starts: the picture an ear would get.
  python v6b_contour.py <folder/take>:<line> ..."""
import sys

import numpy as np

import v6_lib as L
import v6b_lib as B

sys.stdout.reconfigure(encoding="utf-8")
for a in sys.argv[1:]:
    src, lid = a.split(":")
    tk = B.load_take(src)
    pr = tk["probe"]
    m = tk["m"] * 10 ** (pr["gain_db"] / 20)
    ss = [o for o in pr["sent"] if o["line"] == lid]
    on, off = ss[0]["on"], ss[-1]["off"]
    T, F = L.f0_track(m)
    m24 = L.read(tk["mp3"], sr=24000)
    hw = L.whisper(m24[int(max(0, on - 0.06) * 24000):int((off + 0.06) * 24000)])
    wl = [(w["w"], round(w["s"] + max(0, on - 0.06), 2), round(w["p"], 2)) for w in hw]
    print(f"\n{src}:{lid}  {tk['meta']['text']}   span {on:.2f}-{off:.2f}  sentences {[(o['on'], o['off']) for o in ss]}")
    print("  whisper:", wl)
    row = []
    for t in np.arange(on, off, 0.03):
        seg = m[int(t * L.SR):int((t + 0.03) * L.SR)]
        lv = 10 * np.log10(np.mean(seg ** 2) + 1e-12)
        k = np.where((T >= t) & (T < t + 0.03) & ~np.isnan(F))[0]
        f = int(round(float(np.median(F[k])))) if len(k) else 0
        row.append(f"{t - on:.2f}:{lv:.0f}/{f if f else '-'}")
    for i in range(0, len(row), 14):
        print("   " + "  ".join(row[i:i + 14]))

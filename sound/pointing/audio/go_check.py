# THE GO RUN, by measurement (never played): for each "Go" of the opening mix, how its tail ends (cut by the grid or a
# natural decay), what the beep does at that moment, and how far the voice stands over the beep in the voice's band.
#   python -s go_check.py [--tag opening_v4] [--words <voice words json>]
import json
import os
import sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
tag = "_" + (sys.argv[sys.argv.index("--tag") + 1] if "--tag" in sys.argv else "opening_v4")
wp = sys.argv[sys.argv.index("--words") + 1] if "--words" in sys.argv else os.path.join(ROOT, "sound", "pointing", "voice_v4_opening", "words.json")
SR = 48000
rd = lambda k: sf.read(os.path.join(HERE, f"stem_{k}{tag}.wav"))[0].mean(1)
v, fx = rd("voice"), rd("sfx")
mix = sf.read(os.path.join(HERE, f"mix{tag}.wav"))[0].mean(1)
W = json.load(open(wp, encoding="utf-8"))
go = [w for w in W if "".join(c for c in w["w"].lower() if c.isalpha()) == "go"]
band = lambda x, lo, hi: sosfiltfilt(butter(4, [lo, hi], "bandpass", fs=SR, output="sos"), x)
db = lambda x: 10 * np.log10(np.mean(x ** 2) + 1e-20)


def env(x, ms=5):
    k = int(ms / 1000 * SR)
    return 10 * np.log10(np.convolve(x ** 2, np.ones(k) / k, "same") + 1e-20)


ev, efx, em = env(v), env(fx), env(mix)
vb, fb = band(v, 300, 1200), band(fx, 300, 1200)
rows = []
for i, w in enumerate(go):
    a, e = int(w["s"] * SR), int(w["e"] * SR)
    nxt = int(go[i + 1]["s"] * SR) if i + 1 < len(go) else None
    pk = ev[a:e].max()
    end_lvl = ev[e - int(0.01 * SR):e].mean() - pk                    # the last 10 ms of the word vs its peak
    fall = ev[e - int(0.005 * SR)] - ev[min(len(ev) - 1, e + int(0.005 * SR))]   # the step across the end, 10 ms
    cut = end_lvl > -25                                                   # still loud at its end: the grid cut it
    mask = None
    if nxt is not None:
        mask = efx[nxt:nxt + int(0.02 * SR)].max() - ev[e - int(0.01 * SR):e].mean()   # the beep onset vs the voice tail it replaces
    vvb = db(vb[a:e]) - db(fb[a:e])
    rows.append(dict(go=i + 1, s=w["s"], e=w["e"], len=round(w["e"] - w["s"], 3), tail_vs_peak_db=round(float(end_lvl), 1),
                     step_10ms_db=round(float(fall), 1), cut_by_grid=bool(cut), next_beep_over_tail_db=None if mask is None else round(float(mask), 1),
                     voice_over_beep_300_1200=round(float(vvb), 1)))
for r in rows:
    print(r)
json.dump(rows, open(os.path.join(HERE, f"go_check{tag}.json"), "w"), indent=1)

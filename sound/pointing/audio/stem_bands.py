# Band balance of each stem and the mix (dB relative to the MIX's 400-2000 Hz, like the benchmark's LTAS) + centroid.
#   python -s stem_bands.py [tag] [seconds]      (also the raw voice file with --raw <wav>)
import sys
import numpy as np
import soundfile as sf
from scipy import signal
import os

HERE = os.path.dirname(os.path.abspath(__file__))
tag = "_" + sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "_opening_v4"
dur = float(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
B = {"<120": (30, 120), "120-400": (120, 400), "400-2k": (400, 2000), "2-5k": (2000, 5000), "5-10k": (5000, 10000), "10-16k": (10000, 16000)}


def P(x):
    m = x.mean(1) if x.ndim > 1 else x
    if dur:
        m = m[:int(dur * 48000)]
    f, p = signal.welch(m, 48000, nperseg=8192)
    return f, p


files = {k: os.path.join(HERE, f"stem_{k}{tag}.wav") for k in ("voice", "music", "sfx", "amb")}
files["MIX"] = os.path.join(HERE, f"mix{tag}.wav")
if "--raw" in sys.argv:
    files["raw"] = sys.argv[sys.argv.index("--raw") + 1]
f, pm = P(sf.read(files["MIX"])[0])
ref = 10 * np.log10(pm[(f >= 400) & (f < 2000)].sum())
print("stem      " + "  ".join(f"{k:>8s}" for k in B) + "  centroid")
for k, p in files.items():
    f, pp = P(sf.read(p)[0])
    row = [10 * np.log10(pp[(f >= lo) & (f < hi)].sum() + 1e-30) - ref for lo, hi in B.values()]
    cen = (pp * f).sum() / pp.sum()
    print(f"{k:8s}  " + "  ".join(f"{v:8.1f}" for v in row) + f"  {cen:7.0f}")

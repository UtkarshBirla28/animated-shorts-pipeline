# The shouts against the narrator, by measurement: 10-16 kHz and 5-10 kHz relative to each line's own 400-2000 Hz, on the
# raw voice file and on the mixed voice stem.   python -s shout_bands.py [tag]
import json
import os
import sys
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
tag = "_" + (sys.argv[1] if len(sys.argv) > 1 else "v4")
ph = json.load(open(os.path.join(HERE, f"phrases{tag}.json"), encoding="utf-8"))
raw = sf.read(os.path.join(HERE, "..", "voice_v4", "voice.wav"))[0]
stem = sf.read(os.path.join(HERE, f"stem_voice{tag}.wav"))[0]


def rel(x, a, b):
    m = x[int(a * 48000):int(b * 48000)]
    m = m.mean(1) if m.ndim > 1 else m
    f, p = signal.welch(m, 48000, nperseg=4096)
    B = lambda lo, hi: 10 * np.log10(p[(f >= lo) & (f < hi)].sum() + 1e-30)
    r = B(400, 2000)
    return round(B(5000, 10000) - r, 1), round(B(10000, 16000) - r, 1)


nar = [p for p in ph if p["speaker"] == "N"]
print("line speaker  raw 5-10k / 10-16k   mixed 5-10k / 10-16k")
for p in [p for p in ph if p["speaker"] != "N"] + nar[3:5]:
    print(p["id"], p["speaker"], rel(raw, p["s"], p["e"]), rel(stem, p["s"], p["e"]))

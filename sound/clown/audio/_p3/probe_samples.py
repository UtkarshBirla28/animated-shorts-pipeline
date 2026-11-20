# p3: measure the band balance of candidate samples (nothing is played): share of energy below 90 Hz, 500-6000 Hz,
# 2-5 kHz, and the -40 dB top edge, per take.  usage: ... -s sound/clown/audio/_p3/probe_samples.py <logical sound> ...
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import samples as SM  # noqa: E402
from dsp import SR  # noqa: E402


def bands(x):
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)), n=max(4096, 1 << int(np.ceil(np.log2(len(x))))))) ** 2
    f = np.fft.rfftfreq(2 * (len(X) - 1), 1 / SR)
    tot = X.sum() + 1e-20
    sh = lambda a, b: 10 * np.log10(X[(f >= a) & (f < b)].sum() / tot + 1e-12)
    Xs = 10 * np.log10(X + 1e-20)
    pk = Xs.max()
    above = f[Xs >= pk - 40]
    c = float((f * X).sum() / tot)
    return sh(0, 90), sh(500, 6000), sh(2000, 5000), float(above.max()) if len(above) else 0.0, c


for snd in sys.argv[1:]:
    for label, x in SM.takes(snd):
        lo, mid, sc, top, cen = bands(x)
        print(f"{snd:<12} {label:<28} {len(x) / SR:5.2f} s  <90 Hz {lo:6.1f} dB  0.5-6k {mid:6.1f} dB  2-5k {sc:6.1f} dB  top {top:7.0f} Hz  centroid {cen:6.0f} Hz")

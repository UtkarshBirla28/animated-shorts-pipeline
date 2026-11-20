# tonal peaks over time (the motor whine's pitch track): python -s probe_tones.py name [step] [t0 t1]
import os, sys
import numpy as np
from scipy import signal
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from dsp import SR, read_wav
nm = sys.argv[1]; step = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
x, sr = read_wav(os.path.join(HERE, "_lib", nm + ".wav")); m = x.mean(0)
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0; t1 = float(sys.argv[4]) if len(sys.argv) > 4 else len(m) / SR
f, t, Z = signal.stft(m, fs=SR, nperseg=8192, noverlap=8192 - 2048)
P = np.abs(Z) ** 2
bands = [(20, 120), (120, 400), (400, 1200), (1200, 3500), (3500, 9000), (9000, 20000)]
print("t | level | band dB: " + " ".join(f"{a}-{b}" for a, b in bands) + " | top tones Hz(prominence dB)")
for a in np.arange(t0, t1 - step + 1e-6, step):
    k = (t >= a) & (t < a + step)
    if not k.any():
        continue
    S = P[:, k].mean(1)
    lev = 10 * np.log10(S.sum() + 1e-20)
    bl = [10 * np.log10(S[(f >= lo) & (f < hi)].sum() + 1e-20) for lo, hi in bands]
    band = (f > 150) & (f < 4000)
    Sb, fb = S[band], f[band]
    ratio = 10 * np.log10(Sb / (signal.medfilt(Sb, 41) + 1e-20))
    pk, _ = signal.find_peaks(ratio, height=8, distance=6)
    pk = sorted(pk, key=lambda i: -ratio[i])[:4]
    print(f"{a:6.1f} {lev:6.1f} | " + " ".join(f"{b:5.0f}" for b in bl) + " | " + " ".join(f"{fb[i]:.0f}({ratio[i]:.0f})" for i in sorted(pk)))

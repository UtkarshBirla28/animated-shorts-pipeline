# time map of a long field recording: level, a speech-likeness index (syllable-rate modulation of the 400-3500 Hz band
# plus harmonic voicing), and the strongest steady tone (the motor / inverter whine).  usage: python -s probe_ride.py name [step]
import os, sys
import numpy as np
from scipy import signal
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from dsp import SR, read_wav
nm = sys.argv[1]; step = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
x, sr = read_wav(os.path.join(HERE, "_lib", nm + ".wav")); m = x.mean(0)
# speech band envelope at 100 Hz
sos = signal.butter(4, [400, 3500], btype="bandpass", fs=SR, output="sos")
b = signal.sosfiltfilt(sos, m)
hop = SR // 100
env = np.sqrt((b[: len(b) // hop * hop] ** 2).reshape(-1, hop).mean(1) + 1e-12)
full = np.sqrt((m[: len(m) // hop * hop] ** 2).reshape(-1, hop).mean(1) + 1e-12)
f, t, Z = signal.stft(m, fs=SR, nperseg=4096, noverlap=4096 - 1024)
P = np.abs(Z) ** 2
out = []
for a in np.arange(0, len(m) / SR - step + 1e-6, step):
    e = env[int(a * 100): int((a + step) * 100)]
    lev = 20 * np.log10(np.sqrt(np.mean(full[int(a * 100): int((a + step) * 100)] ** 2)))
    sp = 20 * np.log10(np.sqrt(np.mean(e ** 2)))
    le = 20 * np.log10(e)
    mod = float(np.percentile(le, 95) - np.percentile(le, 10))          # dB swing of the speech band inside the window
    k = (t >= a) & (t < a + step)
    S = P[:, k].mean(1)
    band = (f > 180) & (f < 2600)
    Sb = S[band]; fb = f[band]
    sm = signal.medfilt(Sb, 31)
    ratio = Sb / (sm + 1e-20)
    i = int(np.argmax(ratio))
    out.append((a, lev, sp, mod, fb[i], 10 * np.log10(ratio[i])))
print(f"{nm}: {len(m)/SR:.1f} s; columns: t, level dBFS, speech-band dBFS, speech-band swing dB (speech > ~14), strongest tone Hz, its prominence dB")
for r in out:
    print(f"{r[0]:6.1f} {r[1]:6.1f} {r[2]:6.1f} {r[3]:5.1f} {r[4]:6.0f} {r[5]:5.1f}  " + ("S" if r[3] > 14 else "." ) + " " + "#" * int(max(0, (r[1] + 60) / 2)))

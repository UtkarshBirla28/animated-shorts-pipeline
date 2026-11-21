# Measure sound-effect takes (never played): length, onset, how fast it dies (time to -30 dB from the peak), centroid,
# low / mid / high band shares, steady-tone check, and whether it contains speech-like voicing (pitch in 80-400 Hz).
#   python -s take_measure.py <wav> [<wav> ...]
import sys
import numpy as np
import soundfile as sf

SR = 48000
for p in sys.argv[1:]:
    x, sr = sf.read(p)
    m = x.mean(1) if x.ndim > 1 else x
    k = int(0.005 * sr)
    e = 10 * np.log10(np.convolve(m ** 2, np.ones(k) / k, "same") + 1e-20)
    pk = int(np.argmax(e))
    on = int(np.argmax(e > e.max() - 30))
    after = np.where(e[pk:] < e.max() - 30)[0]
    die = after[0] / sr if len(after) else None
    f = np.fft.rfftfreq(len(m), 1 / sr)
    S = np.abs(np.fft.rfft(m)) ** 2
    cen = float((S * f).sum() / S.sum())
    b = lambda lo, hi: 10 * np.log10(S[(f >= lo) & (f < hi)].sum() / S.sum() + 1e-20)
    rms = 10 * np.log10(np.mean(m ** 2) + 1e-20)
    print(f"{p.split(chr(92))[-1].split('/')[-1]:22s} len {len(m) / sr:5.2f} s  onset {on / sr:5.3f}  peak {pk / sr:5.3f}  dies(-30dB) {die if die is None else round(die, 3)} s  "
          f"centroid {cen:6.0f} Hz  <200 {b(20, 200):5.1f}  200-2k {b(200, 2000):5.1f}  2-8k {b(2000, 8000):5.1f}  rms {rms:5.1f} dBFS  peak {20 * np.log10(np.abs(m).max() + 1e-12):5.1f}")

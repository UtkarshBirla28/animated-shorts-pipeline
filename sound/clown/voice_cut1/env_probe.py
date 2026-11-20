"""10 ms level profile (dBFS, and > 3 kHz level) of an audio file between a and b s.
Usage: python -s env_probe.py <file> <a> <b> [step_ms=20]"""
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt

sys.stdout.reconfigure(encoding="utf-8")
SR = 24000
p, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
step = int(sys.argv[4]) if len(sys.argv) > 4 else 20
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
hi = sosfilt(butter(4, 3000, "highpass", fs=SR, output="sos"), x)
hop = SR * step // 1000
row = []
for t in np.arange(a, b, step / 1000):
    s = x[int(t * SR):int(t * SR) + hop]
    h = hi[int(t * SR):int(t * SR) + hop]
    if len(s) == 0:
        break
    d = 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)
    dh = 20 * np.log10(np.sqrt(np.mean(h ** 2)) + 1e-9)
    row.append(f"{t:5.2f}:{d:4.0f}/{dh:4.0f}")
for i in range(0, len(row), 8):
    print("  ".join(row[i:i + 8]))

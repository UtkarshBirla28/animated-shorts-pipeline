"""Find dropouts: short runs (<= 150 ms) of near-digital silence (< -70 dBFS, 5 ms frames) with loud speech (> -32 dBFS)
within 40 ms on BOTH sides = a gate or cut that landed inside a word. Usage: python -s dropout_scan.py <wav or mp3>"""
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
SR = 24000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
hop = SR // 200
n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-12)
found = 0
j = 0
while j < n:
    if db[j] < -70:
        k = j
        while k < n and db[k] < -70:
            k += 1
        if k - j <= 30 and j > 8 and k < n - 8 and db[j - 8:j].max() > -32 and db[k:k + 8].max() > -32:
            print(f"  dropout {j * 0.005:7.3f}-{k * 0.005:7.3f} s ({(k - j) * 5} ms)")
            found += 1
        j = k
    else:
        j += 1
print(f"{found} dropouts")

"""Every word gap of an assembled voice dir: word-edge gap (words.json) and TRUE silence (longest -45 dBFS run between the
two words' middles). Usage: python -s gap_report.py <dir> [min_s=0.3]"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
mn = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
SR = 24000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(d / "voice.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
hop = SR // 100
n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
w = json.loads((d / "words.json").read_text(encoding="utf-8"))


def true_sil(a, b):
    q = db[int(a * 100):int(b * 100)] < -45
    best = run = 0
    for v in q:
        run = run + 1 if v else 0
        best = max(best, run)
    return best * 0.01


rows = []
for i in range(len(w) - 1):
    a, b = w[i], w[i + 1]
    g = b["s"] - a["e"]
    ts = true_sil(a["s"] + 0.5 * (a["e"] - a["s"]), b["s"] + 0.5 * (b["e"] - b["s"]))
    if g >= mn or ts >= mn:
        rows.append((a["e"], a["w"], b["w"], g, ts))
for t, a, b, g, ts in rows:
    print(f"{t:6.2f}  {a:>14} | {b:<14} edge gap {g:4.2f}  true silence {ts:4.2f}")
dur = len(x) / SR
print(f"duration {dur:.2f} s, words {len(w)}, words/s {len(w) / (w[-1]['e'] - w[0]['s']):.2f}")

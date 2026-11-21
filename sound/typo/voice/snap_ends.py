"""Pull word edges in <dir>/words.json out of the pauses that Whisper folded into a word (LESSONS 6 / 39).
eleven_build --breath gates every pause middle to digital silence, so a word edge that sits inside a gated run is wrong:
  ends:   walk back from the end through quiet frames (< 5 % of the word's peak); if that crossed >= 60 ms of gated
          silence (< -60 dBFS), walk forward again over any non-gated audio (the real coda) and end there + 20 ms;
  starts: the mirror image (forward through the gated pause, then back over the real onset) - 20 ms.
Words never shrink below 80 ms. phrases.json edges follow their first / last word.  Usage: python -s snap_ends.py <dir>"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
SR = 24000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(d / "voice.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
hop = SR // 100
n = len(x) // hop
env = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
G = 10 ** (-60 / 20)
G0 = 10 ** (-50 / 20)   # pass 0: a quiet (not gated) breath-free pause between two touching words
words = json.loads((d / "words.json").read_text(encoding="utf-8"))

moved_e, moved_s = [], []
# pass 0: two words that touch (gap < 50 ms) with a quiet pause (>= 80 ms < -50 dBFS) within 0.2 s of their shared
# edge: the pause IS the boundary (searched only near the edge: a long number token like 'six hundred | thousand yen'
# has its own micro-pauses inside)
for a, b in zip(words, words[1:]):
    if b["s"] - a["e"] >= 0.05:
        continue
    lo_, hi_ = int((a["s"] + a["e"]) / 2 * 100), int((b["s"] + b["e"]) / 2 * 100)
    i0, i1 = max(lo_, int((a["e"] - 0.2) * 100)), min(hi_, int((b["s"] + 0.2) * 100))
    best, run, end = 0, 0, 0
    for j in range(i0, min(i1, n)):
        run = run + 1 if env[j] < G0 else 0
        if run > best:
            best, end = run, j
    if best >= 8:
        r0, r1 = end - best + 1, end + 1
        while r0 > lo_ and env[r0 - 1] < G0:
            r0 -= 1
        while r1 < min(hi_, n) and env[r1] < G0:
            r1 += 1
        moved_e.append((a["w"], a["e"], round(r0 * 0.01 + 0.02, 3)))
        moved_s.append((b["w"], b["s"], round(r1 * 0.01 - 0.02, 3)))
        a["e"], b["s"] = moved_e[-1][2], moved_s[-1][2]
for w in words:
    s, e = int(w["s"] * 100), min(n, int(w["e"] * 100))
    if e - s < 10:
        continue
    peak = env[s:e].max()
    k = e
    while k - 1 > s + 8 and env[k - 1] < 0.05 * peak:
        k -= 1
    if (env[k:e] < G).sum() >= 6:
        while k < e and env[k] >= G:
            k += 1
        if (e - k) * 0.01 > 0.06:
            ne = round(k * 0.01 + 0.02, 3)
            moved_e.append((w["w"], w["e"], ne))
            w["e"] = ne
for w in words:
    s, e = int(w["s"] * 100), min(n, int(w["e"] * 100))
    if e - s < 10:
        continue
    peak = env[s:e].max()
    k = s
    while k < e - 8 and env[k] < 0.05 * peak:
        k += 1
    if (env[s:k] < G).sum() >= 6:
        while k > s and env[k - 1] >= G:
            k -= 1
        if (k - s) * 0.01 > 0.06:
            ns = round(k * 0.01 - 0.02, 3)
            moved_s.append((w["w"], w["s"], ns))
            w["s"] = ns
(d / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=0), encoding="utf-8")
ph = json.loads((d / "phrases.json").read_text(encoding="utf-8"))
new_e = {round(o, 3): v for _, o, v in moved_e}
new_s = {round(o, 3): v for _, o, v in moved_s}
for p in ph:
    p["e"] = new_e.get(round(p["e"], 3), p["e"])
    p["s"] = new_s.get(round(p["s"], 3), p["s"])
(d / "phrases.json").write_text(json.dumps(ph, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(moved_e)} word ends moved earlier, {len(moved_s)} starts moved later:")
for m in moved_e:
    print(f"  end   {m[0]:<14} {m[1]:7.3f} -> {m[2]:7.3f}")
for m in moved_s:
    print(f"  start {m[0]:<14} {m[1]:7.3f} -> {m[2]:7.3f}")

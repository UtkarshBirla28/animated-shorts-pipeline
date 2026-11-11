"""Snap word start times in words.json to the real voice onsets (Whisper's word starts can be 100-200 ms late).
For each word, look back from its start (never before the previous word's end) for where the 10 ms energy envelope
first rises above 25 % of the word's own peak; move the start there if it is > 30 ms earlier. Writes words.json
(backup words_whisper.json). Usage: python -s refine_onsets.py"""
import json
import os
import shutil

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
import sys
sys.path.insert(0, os.path.join(HERE, "..", "audio"))
from dsp import read_wav  # noqa: E402

x, sr = read_wav(os.path.join(HERE, "voice.wav"))
if x.ndim > 1:
    x = x.mean(axis=0) if x.shape[0] < x.shape[1] else x.mean(axis=1)
hop = int(0.01 * sr)
env = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same"))[::hop]
src = os.path.join(HERE, "words.json")
bak = os.path.join(HERE, "words_whisper.json")
if not os.path.exists(bak):
    shutil.copy(src, bak)
words = json.load(open(bak, encoding="utf-8"))
moved = []
for i, w in enumerate(words):
    s, e = int(w["s"] / 0.01), int(w["e"] / 0.01)
    if e <= s:
        continue
    peak = env[s:e].max()
    lo = int(words[i - 1]["e"] / 0.01) if i else 0
    lo = max(lo, s - 25)
    k = s
    while k - 1 >= lo and env[k - 1] > 0.25 * peak:
        k -= 1
    if (s - k) * 0.01 > 0.03:
        moved.append((w["w"], round(w["s"], 3), round(k * 0.01, 3)))
        w["s"] = round(k * 0.01, 3)
    else:
        # A5: Whisper sometimes folds the preceding pause into the word: move the start FORWARD to the first 10 ms frame
        # that is speech (> 3 % of the word's peak and > -45 dBFS), at most 0.4 s and never past the word's middle
        j, hi = s, min(e - 1, s + 40, (s + e) // 2)
        while j < hi and (env[j] < 0.03 * peak or env[j] < 10 ** (-45 / 20)):
            j += 1
        if (j - s) * 0.01 > 0.03:
            moved.append((w["w"], round(w["s"], 3), round(j * 0.01, 3)))
            w["s"] = round(j * 0.01, 3)
json.dump(words, open(src, "w", encoding="utf-8"), indent=0)
print(f"{len(moved)} word starts moved (earlier = positive ms, later = negative):")
for m in moved:
    print(f"  {m[0]:<14} {m[1]:7.3f} -> {m[2]:7.3f}  ({(m[1] - m[2]) * 1000:.0f} ms)")

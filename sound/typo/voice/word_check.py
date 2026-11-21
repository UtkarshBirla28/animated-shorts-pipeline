"""Whisper word check of an assembled voice, phrase by phrase (no 20 s window edges): each phrase of phrases.json is cut
out with 0.12 s margins and transcribed alone; the heard words are aligned to the phrase's display tokens
(voice_build.align). Prints every phrase with its heard text, every token Whisper did not match, and every heard word
with p < 0.6. Usage: python -s word_check.py <dir>"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import voice_build as vb  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
SR = 24000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(d / "voice.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
ph = json.loads((d / "phrases.json").read_text(encoding="utf-8"))
bad_total, low_total = 0, 0
for p in ph:
    a, b = max(0.0, p["s"] - 0.12), min(len(x) / SR, p["e"] + 0.12)
    ww = vb.whisper(x[int(a * SR):int(b * SR)])
    toks, spoken = vb.parse(p["markup"])
    al, miss = vb.align(toks, spoken, ww, b - a)
    low = [(w["w"], round(w["p"], 2)) for w in ww if w["p"] < 0.6]
    bad_total += len(miss)
    low_total += len(low)
    flag = ("  MISS " + str(miss) if miss else "") + ("  LOWP " + str(low) if low else "")
    print(f"P{p['i']:<2} {p['s']:6.2f}  {' '.join(w['w'] for w in ww)}{flag}")
print(f"unmatched tokens {bad_total}, low-p words {low_total}")

"""Acceptance check of an ASSEMBLED narration (voice.wav + words.json): Whisper hears every flagged word clearly,
no word is badly clipped, and the pauses hold no breath (audible frames > 0.18 s away from both neighbouring words).
Usage: python -s voice_accept.py <dir with voice.wav + words.json>"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent)); from short_cfg import SHORT  # noqa: E402
sys.path.insert(0, str(Path(__file__).parent.parent / "sound" / SHORT / "voice"))
import voice_build as vb  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(d / "voice.wav"), "-ac", "1", "-ar", "24000", "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
heard = []
for a in range(0, len(x), 24000 * 20):
    for w in vb.whisper(x[a:a + 24000 * 20 + 24000 // 2]):
        w["s"] += a / 24000; w["e"] += a / 24000
        if not heard or w["s"] > heard[-1]["s"] + 0.05:
            heard.append(w)
keys = [vb.key(w["w"]) for w in heard]
FLAG = ["fourteen", "14", "psychologist", "tested", "please", "visitors", "twice", "permission", "gave", "steal"]
print("flagged words (Whisper p):")
for f in FLAG:
    ps = [round(w["p"], 2) for w, k in zip(heard, keys) if k.startswith(f)]
    print(f"  {f:13} {ps}")
low = [(w["w"], round(w["p"], 2), round(w["s"], 2)) for w in heard if w["p"] < 0.6]
print(f"{len(heard)} words heard; {len(low)} with p < 0.6: {low[:15]}")
# breath check: audible 10 ms frames in the middle of pauses (> 0.18 s from both words)
ww = json.load(open(d / "words.json", encoding="utf-8"))
SR, hop = 24000, 240
br = 0.0
for i in range(len(ww) - 1):
    a, b = ww[i]["e"] + 0.18, ww[i + 1]["s"] - 0.18
    if b - a < 0.03:
        continue
    seg = x[int(a * SR):int(b * SR)].astype(np.float64)
    n = len(seg) // hop
    if n:
        e = 20 * np.log10(np.sqrt(np.mean(seg[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
        br += float((e > -50).sum()) * 0.01
print(f"audible (> -50 dBFS) inside pause middles: {br:.2f} s   (0 = no breaths)")
print(f"length {len(x) / SR:.2f} s")

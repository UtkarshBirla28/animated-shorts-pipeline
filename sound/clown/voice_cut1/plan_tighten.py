"""Turn TRUE-silence pause targets into "a|b|edge target" overrides for tools/tighten_pauses.py (which works on the
words.json edge gaps; Whisper edges often hide 0.1-0.3 s, so cutting by edge gap alone eats real pauses).
Default true target = max(FLOOR, FACTOR x true silence) (never longer than now); SPECIAL pairs get their own true target;
KEEP pairs are left as they are (lengthened later by insert_pause.py). Prints one override per line.
Usage: python -s plan_tighten.py <dir>"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
FACTOR, FLOOR, MIN = float(__import__("os").environ.get("FACTOR", "0.65")), 0.22, 0.25
k = lambda w: re.sub(r"[^a-z0-9%']", "", w.lower())
SPECIAL = {   # comic / dramatic silences (true silence, s)
    ("1", "easy"): 0.46, ("mistake", "that's"): 0.46,
    ("exist", "cancel"): 0.50, ("it", "they"): 0.38,
    ("cancel", "nothing"): 0.62, ("nothing", "again"): 0.62, ("again", "nothing"): 0.62, ("nothing", "the"): 0.64,
    ("billion", "you"): 0.36, ("billion", "years"): 0.32, ("second", "the"): 0.30,
}
KEEP = {("shares", "that"), ("types", "610000"), ("shares", "for")}
SR = 24000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(d / "voice.wav"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
hop = SR // 100
n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
w = json.loads((d / "words.json").read_text(encoding="utf-8"))


def true_sil(a, b):
    best = run = 0
    for v in db[int(a * 100):int(b * 100)] < -45:
        run = run + 1 if v else 0
        best = max(best, run)
    return best * 0.01


out = {}
for a, b in zip(w, w[1:]):
    g = b["s"] - a["e"]
    if g <= MIN:
        continue
    key = (k(a["w"]), k(b["w"]))
    ts = true_sil(a["s"] + 0.5 * (a["e"] - a["s"]), b["s"] + 0.5 * (b["e"] - b["s"]))
    extra = max(0.0, g - ts)
    if key in KEEP:
        tgt = g
    elif key in SPECIAL:
        tgt = SPECIAL[key] + extra
    else:
        tgt = min(g, max(FLOOR, FACTOR * ts) + extra)
    if key in out and abs(out[key] - tgt) > 0.02:
        print(f"# WARNING duplicate pair {key}: {out[key]:.2f} vs {tgt:.2f}", file=sys.stderr)
    out[key] = round(tgt, 3)
for (a, b), t in out.items():
    print(f"{a}|{b}|{t}")

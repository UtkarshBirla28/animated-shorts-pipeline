"""RETAKE pass: per-word F0 / level contour of every retake and the installed line (word times from retake_probe.json, no
Whisper). Each word: its F0 every 30 ms (Hz, '.' = unvoiced) and its level; pauses (true silence >= 0.08 s) are listed.
Usage: python -s retake_contour.py <line> [take ...]"""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
from voice_audit import load, SR  # noqa: E402
from voice_pitch import yin_f0  # noqa: E402
from retake_probe import LINES, env_db  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
line = sys.argv[1]
only = set(sys.argv[2:])
res = json.loads((HERE / "takes" / "james_retake" / "retake_probe.json").read_text(encoding="utf-8"))[line]
bak = HERE / "_prev_retake"
vd = bak if bak.exists() else HERE
phr = {p["i"]: p for p in json.loads((vd / "phrases.json").read_text(encoding="utf-8"))}
vw = None


def f0_at(x, t):
    win = int(0.04 * SR)
    k = int(t * SR) - win // 2
    if k < 0 or k + win > len(x):
        return 0
    fr = x[k:k + win]
    if np.sqrt(np.mean(fr ** 2)) < 0.004:
        return 0
    v, c = yin_f0(fr, SR)
    return round(v) if v and 60 <= v <= 420 and c < 0.2 else 0


for r in res:
    tk = r["label"][1]
    if only and tk not in only:
        continue
    if tk == "OLD":
        if vw is None:
            vw = load(vd / "voice.wav")
        idxs = LINES[line]
        a, b = phr[idxs[0]]["s"], phr[idxs[-1]]["e"]
        x = vw[int((a - min(0.2, a)) * SR):int((b + 0.2) * SR)]
    else:
        x = load(HERE / "takes" / "james_retake" / line / f"{tk}.mp3")
    d = env_db(x)
    print(f"\n== {line} {tk}  span {r['span'][0]:.2f}-{r['span'][1]:.2f}")
    # pauses
    runs, st_ = [], None
    for j, v in enumerate(d < -45):
        if v and st_ is None:
            st_ = j
        if not v and st_ is not None:
            if j - st_ >= 8:
                runs.append((st_ / 100, j / 100))
            st_ = None
    print("   pauses: " + ", ".join(f"{a:.2f}-{b:.2f} ({b - a:.2f})" for a, b in runs if a > r["span"][0] and b < r["span"][1]))
    W = r["words"]
    for k, (w, s, e) in enumerate(W):
        e2 = W[k + 1][1] if k + 1 < len(W) else r["span"][1]
        e2 = max(e, min(e2, e + 0.4))
        ts = np.arange(s, e2, 0.03)
        f = [f0_at(x, t) for t in ts]
        lv = 20 * np.log10(np.sqrt(np.mean(x[int(s * SR):int(e2 * SR)] ** 2)) + 1e-9)
        pkl = float(np.max(d[int(s * 100):max(int(s * 100) + 1, int(e2 * 100))]))
        print(f"   {w:>12} {s:5.2f}-{e2:5.2f} {lv:6.1f} dB pk {pkl:6.1f} | " + " ".join(str(v) if v else "." for v in f))

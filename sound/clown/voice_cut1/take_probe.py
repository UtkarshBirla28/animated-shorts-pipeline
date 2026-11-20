"""Per-take detail for chosen beats: per phrase F0 median / p10-p90 range (st) / level, word times + Whisper p, and the
true-silence pauses (-45 dBFS runs) between words.  Usage: python -s take_probe.py <set> <beat,beat,...> [t1,t2,...]"""
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
import voice_build as vb  # noqa: E402
from eleven_build import BEATS  # noqa: E402
from voice_audit import load, f0_track, rms_db, st, SR  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
src = HERE / "takes" / sys.argv[1]
want = {int(v) for v in sys.argv[2].split(",")}
sets = sys.argv[3].split(",") if len(sys.argv) > 3 else ["t1", "t2", "t3", "t4"]


def silence_runs(x, a, b):
    hop = int(0.01 * SR)
    seg = x[int(a * SR):int(b * SR)]
    n = len(seg) // hop
    if n < 1:
        return 0.0
    db = 20 * np.log10(np.sqrt(np.mean(seg[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    best = run = 0
    for q in db < -45:
        run = run + 1 if q else 0
        best = max(best, run)
    return best * 0.01


for bn, idxs in BEATS:
    if bn not in want:
        continue
    toks, owner = [], []
    for i in idxs:
        t, _ = vb.parse(vb.P[i][0])
        toks += t
        owner += [i] * len(t)
    for s in sets:
        p = (src if s == "t1" else src / s) / f"b{bn:02d}.mp3"
        if not p.exists():
            continue
        x = load(p)
        ww = vb.whisper(x.astype(np.float32))
        al, miss = vb.align(toks, "", ww, len(x) / SR)
        print(f"== b{bn:02d} {s}  dur {len(x) / SR:.2f}s  heard: {' '.join(w['w'] + '(%.2f)' % w['p'] for w in ww)}")
        for i in idxs:
            ks = [k for k in range(len(al)) if owner[k] == i]
            a, b = al[ks[0]][1], al[ks[-1]][2]
            f = f0_track(x, a, b)
            rg = st(np.percentile(f, 90), np.percentile(f, 10)) if len(f) > 5 else float("nan")
            print(f"   P{i:<2} {a:5.2f}-{b:5.2f}  f0 {np.median(f) if len(f) else 0:5.0f}  range {rg:4.1f}st  {rms_db(x, a, b):6.1f} dB  n{len(f)}  | {vb.P[i][0]}")
        gaps = [(al[k][0], al[k + 1][0], silence_runs(x, al[k][2] - 0.1, al[k + 1][1] + 0.1)) for k in range(len(al) - 1)]
        mn = float(__import__("os").environ.get("MINP", "0.15"))
        print(f"   pauses (true silence >= {mn} s): " + ", ".join(f"{a}|{b} {g:.2f}" for a, b, g in gaps if g >= mn))
        if __import__("os").environ.get("WORDS"):
            print("   words: " + " ".join(f"{d}[{s:.2f}-{e:.2f}]" for d, s, e in al))

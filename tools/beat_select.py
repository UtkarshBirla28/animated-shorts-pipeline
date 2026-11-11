"""Pick the best of N ElevenLabs takes per beat for the antitheft narration (measured; nobody listens).
takes/<dir>/bNN.mp3 (take 1), takes/<dir>/t2/bNN.mp3, takes/<dir>/t3/bNN.mp3 ...
Per take: Whisper accuracy on the beat's script (+ leaked tag words, extra words), natural pace, pitch + level vs the
narrator's median over ALL takes (one consistent narrator), beat-specific acting checks, clipping. Writes the winners
to takes/<out>/bNN.mp3 and a report (select.json / select.md).
Usage: python -s beat_select.py <dir> <out_dir>
"""
import json
import shutil
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE)); from short_cfg import SHORT  # noqa: E402
VOICE = HERE.parent / "sound" / SHORT / "voice"
sys.path.insert(0, str(VOICE))
import voice_build as vb  # noqa: E402
from eleven_build import BEATS, markup  # noqa: E402
from voice_audit import load, f0_track, rms_db, voiced_ratio, st, band, TAGS, SR  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
src = VOICE / "takes" / sys.argv[1]
dst = VOICE / "takes" / sys.argv[2]
dst.mkdir(parents=True, exist_ok=True)
take_dirs = [src] + sorted(p for p in src.iterdir() if p.is_dir() and p.name.startswith("t"))

ONLY = {int(a.split("=", 1)[1]) for a in sys.argv if a.startswith("--only=")}
rows = {}
for bn, idxs in BEATS:
    if ONLY and bn not in ONLY:
        continue
    toks, owner = [], []
    for i in idxs:
        t, _ = vb.parse(markup(i))
        toks += t
        owner += [i] * len(t)
    exp = [vb.key(d) for d, _ in toks]
    for td in take_dirs:
        p = td / f"b{bn:02d}.mp3"
        if not p.exists():
            continue
        x = load(p)
        ww = vb.whisper(x.astype(np.float32))
        heard = [vb.key(w["w"]) for w in ww]
        sm = SequenceMatcher(None, exp, heard)
        acc = sum(b.size for b in sm.get_matching_blocks()) / len(exp)
        al, _ = vb.align(toks, "", ww, len(x) / SR)
        ph = {}
        for i in idxs:
            ks = [k for k in range(len(al)) if owner[k] == i]
            ph[i] = (al[ks[0]][1], al[ks[-1]][2])
        s0, e1 = al[0][1], al[-1][2]
        gaps = sum(max(0.0, al[k + 1][1] - al[k][2] - 0.25) for k in range(len(al) - 1))
        wps = len(al) / max(0.3, (e1 - s0) - gaps)
        f0 = f0_track(x, s0, e1)
        rows.setdefault(bn, []).append({
            "take": td.name if td != src else "t1", "path": str(p), "acc": acc,
            "leaked": [h for h in heard if h in TAGS], "extra": max(0, len(heard) - len(exp)),
            "wps": wps, "dur": e1 - s0, "f0": float(np.median(f0)) if len(f0) else 0.0,
            "rng": float(st(np.percentile(f0, 90), np.percentile(f0, 10))) if len(f0) > 20 else 0.0,
            "db": rms_db(x, s0, e1), "peak": float(np.max(np.abs(x))), "ph": ph, "x": x,
            "heard": " ".join(w["w"] for w in ww)})
        print(f"b{bn:02d} {rows[bn][-1]['take']}: acc {acc:.2f} wps {wps:.2f} f0 {rows[bn][-1]['f0']:.0f}", flush=True)

# the narrator's reference pitch / level: medians over every take of every beat
F0 = float(np.median([r["f0"] for rs in rows.values() for r in rs if r["f0"]]))
DB = float(np.median([r["db"] for rs in rows.values() for r in rs]))
if ONLY and (dst / "select.json").exists():   # single-beat re-run: keep the narrator reference of the full run
    _prev = json.load(open(dst / "select.json", encoding="utf-8"))
    F0, DB = _prev["narrator_f0"], _prev["narrator_db"]


def acting(bn, r):
    x, ph = r["x"], r["ph"]
    f = lambda i: f0_track(x, *ph[i])
    med = lambda a: float(np.median(a)) if len(a) > 3 else 0.0
    if bn == 3:   # serious, slightly lower reading of the sign
        return band(st(r["f0"], F0), -3.5, 0.5, 3)
    if bn == 4:   # the whisper (P10) vs the narration (P9)
        d = rms_db(x, *ph[10]) - rms_db(x, *ph[9])
        return 0.6 * band(d, -16, -5, 6) + 0.4 * band(voiced_ratio(x, *ph[10]), 0, 0.45, 0.4)
    if bn in (5, 12):  # question rise at the end of "...steal?" / "And the bait wood?"
        i = 11 if bn == 5 else 28
        a, b = ph[i]
        body, end = f0_track(x, a, max(a + 0.1, b - 0.35)), f0_track(x, b - 0.35, b + 0.05)
        return band(st(med(end), med(body)) if med(end) and med(body) else 0, 2, 9, 4)
    if bn == 8:   # "almost eight percent!" up vs the rest of the beat
        return 0.6 * band(st(med(f(18)), med(f(16))), 1.5, 7, 4) + 0.4 * band(rms_db(x, *ph[18]) - rms_db(x, *ph[16]), -1, 6, 4)
    if bn == 10:  # "everybody cheats." playful: higher than the set-up
        return band(st(med(f(25)), med(f(24))), 0, 6, 4)
    if bn == 11:  # "It gave them permission." firm: lower than "The sign didn't stop thieves."
        return band(st(med(f(27)), med(f(26))), -6, -0.5, 4)
    return band(r["rng"], 10, 18, 6)  # otherwise: lively range


report = []
for bn, rs in rows.items():
    for r in rs:
        sc = {
            "clarity": max(0.0, 10 * (r["acc"] - 0.8) / 0.2) - 4 * len(r["leaked"]) - 1.5 * max(0, r["extra"] - 1),
            "acting": acting(bn, r),
            "consistency": 0.6 * band(abs(st(r["f0"], F0)) if r["f0"] else 9, 0, 1.5, 3) + 0.4 * band(abs(r["db"] - DB), 0, 2, 4),
            "pace": band(r["wps"], 3.3, 4.4, 1.2),
            "range": band(r["rng"], 10, 18, 6),
            "clean": 10.0 if r["peak"] < 0.99 else 4.0,
        }
        sc = {k: round(max(0.0, min(10.0, v)), 1) for k, v in sc.items()}
        W = {"clarity": 3, "acting": 3, "consistency": 2, "pace": 1, "range": 1, "clean": 1}
        r["scores"] = sc
        r["score"] = round(sum(sc[k] * w for k, w in W.items()) / sum(W.values()), 2)
    best = max(rs, key=lambda r: r["score"])
    shutil.copy(best["path"], dst / f"b{bn:02d}.mp3")
    report.append({"beat": bn, "chosen": best["take"], "takes": [{k: (round(v, 3) if isinstance(v, float) else v)
                   for k, v in r.items() if k not in ("x", "ph", "path")} for r in rs]})
    print(f"b{bn:02d}: " + "  ".join(f"{r['take']} {r['score']:.2f}" for r in rs) + f"  -> {best['take']}   ({best['heard'][:90]})")
json.dump({"narrator_f0": F0, "narrator_db": DB, "beats": report}, open(dst / ("select_only.json" if ONLY else "select.json"), "w", encoding="utf-8"), indent=1)
print(f"narrator median F0 {F0:.0f} Hz, level {DB:.1f} dBFS; winners copied to {dst}")

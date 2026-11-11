"""Best-of-N take selection v2 (audit A4 VOICE list): per beat, score every take on
  clarity   Whisper accuracy on the script + every word p >= 0.7 (min-p penalty) + no leaked tags / extra words
  narrator  median F0 within 3 st of the TARGET narrator pitch (default 180 Hz; b03 grave -5 st, b08 allowed high),
            level within 2 dB of the median take level (one continuous take)
  contour   statements end falling, questions end rising (last ~0.3 s of the beat / of the question phrase)
  tail      unvoiced (breathy) tail after the last voiced frame <= 80 ms
  pace      brisk beats (2, 6, 7, 8) 2.9-4.2 w/s, the others 2.5-3.8
  acting    beat-specific (b01 'steal' rises over the line, b04 stage whisper, b05 question rise, b08 excitement,
            b10 'everybody cheats' up, b11 deadpan flat 'permission', b12 'bait wood?' rise, others lively range)
Winners -> takes/<out>/bNN.mp3 + select.json. Usage: python -s beat_select2.py <src dir> <out dir> [--f0=180] [--only=3,5]
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
arg = lambda n, d: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(f"--{n}=")), d)
TARGET = float(arg("f0", "180"))
ONLY = {int(v) for v in arg("only", "").split(",") if v}
src, dst = VOICE / "takes" / sys.argv[1], VOICE / "takes" / sys.argv[2]
dst.mkdir(parents=True, exist_ok=True)
take_dirs = [src] + sorted(p for p in src.iterdir() if p.is_dir() and p.name.startswith("t"))
BRISK = {2, 6, 7, 8}
QUESTION_END = {5}


def med(a):
    return float(np.median(a)) if len(a) > 3 else 0.0


def tail_unvoiced(x, a, b):
    """seconds of audible but unvoiced sound after the last voiced 10 ms frame of [a, b + 0.4]"""
    win, hop = int(0.04 * SR), int(0.01 * SR)
    seg = x[int(a * SR):int(min(len(x) / SR, b + 0.4) * SR)]
    if len(seg) < win * 2:
        return 0.0
    from voice_pitch import yin_f0
    last_v, last_a = 0, 0
    pk = np.percentile(np.abs(seg), 99) + 1e-9
    for k in range(0, len(seg) - win, hop):
        fr = seg[k:k + win]
        if np.sqrt(np.mean(fr ** 2)) > 0.03 * pk:
            last_a = k
            v, c = yin_f0(fr, SR)
            if v and 60 <= v <= 420 and c < 0.2:
                last_v = k
    return max(0.0, (last_a - last_v) / SR)


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
        acc = sum(b.size for b in SequenceMatcher(None, exp, heard).get_matching_blocks()) / len(exp)
        lowp = [w["w"] for w in ww if w["p"] < 0.7 and vb.key(w["w"]) not in ("%",)]
        al, _ = vb.align(toks, "", ww, len(x) / SR)
        ph = {i: (al[[k for k in range(len(al)) if owner[k] == i][0]][1], al[[k for k in range(len(al)) if owner[k] == i][-1]][2]) for i in idxs}
        s0, e1 = al[0][1], al[-1][2]
        gaps = sum(max(0.0, al[k + 1][1] - al[k][2] - 0.25) for k in range(len(al) - 1))
        f0 = f0_track(x, s0, e1)
        end_body, end_tail = f0_track(x, max(s0, e1 - 0.9), e1 - 0.3), f0_track(x, e1 - 0.3, e1 + 0.05)
        rows.setdefault(bn, []).append({
            "take": td.name if td != src else "t1", "path": str(p), "acc": acc, "lowp": lowp,
            "leaked": [h for h in heard if h in TAGS], "extra": max(0, len(heard) - len(exp)),
            "wps": len(al) / max(0.3, (e1 - s0) - gaps), "f0": med(f0),
            "rng": float(st(np.percentile(f0, 90), np.percentile(f0, 10))) if len(f0) > 20 else 0.0,
            "db": rms_db(x, s0, e1), "end_st": st(med(end_tail), med(end_body)) if med(end_tail) and med(end_body) else 0.0,
            "tail": tail_unvoiced(x, *ph[idxs[-1]]), "ph": ph, "x": x, "heard": " ".join(w["w"] for w in ww)})
        r = rows[bn][-1]
        print(f"b{bn:02d} {r['take']}: acc {acc:.2f} lowp {len(lowp)} wps {r['wps']:.2f} f0 {r['f0']:.0f} end {r['end_st']:+.1f}st tail {r['tail']:.2f}s", flush=True)

DB = float(np.median([r["db"] for rs in rows.values() for r in rs]))


def acting(bn, r):
    x, ph = r["x"], r["ph"]
    fz = lambda i: f0_track(x, *ph[i])
    if bn == 1:   # 'steal' (end of P2) rises over 'and wanted to'
        a, b = ph[2]
        return band(st(med(f0_track(x, b - 0.35, b)), med(f0_track(x, a, b - 0.35))), 3, 7, 4)
    if bn == 3:
        return band(st(r["f0"], TARGET), -6, -3.5, 3)
    if bn == 4:   # stage whisper: 3-10 dB under the narration, 25-50 % voiced
        d = rms_db(x, *ph[10]) - rms_db(x, *ph[9])
        return 0.6 * band(d, -10, -3, 5) + 0.4 * band(voiced_ratio(x, *ph[10]), 0.2, 0.5, 0.3)
    if bn in (5, 12):
        i = 11 if bn == 5 else 28
        a, b = ph[i]
        return band(st(med(f0_track(x, b - 0.35, b + 0.05)), med(f0_track(x, a, max(a + 0.1, b - 0.35)))), 2, 9, 4)
    if bn == 8:
        return 0.6 * band(st(med(fz(18)), med(fz(16))), 1.5, 7, 4) + 0.4 * band(rms_db(x, *ph[18]) - rms_db(x, *ph[16]), -1, 6, 4)
    if bn == 10:
        return band(st(med(fz(25)), med(fz(24))), 2, 7, 4)
    if bn == 11:  # deadpan: P27 flat (p10-p90 <= 5 st), not louder than the set-up, long 'permission'
        f = fz(27)
        rg = float(st(np.percentile(f, 90), np.percentile(f, 10))) if len(f) > 10 else 9
        return 0.6 * band(rg, 0, 5, 4) + 0.4 * band(rms_db(x, *ph[27]) - rms_db(x, *ph[26]), -4, 1, 4)
    return band(r["rng"], 10, 18, 6)


report = []
for bn, rs in rows.items():
    tgt = TARGET * (2 ** (-5 / 12)) if bn == 3 else TARGET
    for r in rs:
        dev = abs(st(r["f0"], tgt)) if r["f0"] else 9
        sc = {
            "clarity": max(0.0, 10 * (r["acc"] - 0.8) / 0.2) - 2.5 * len(r["lowp"]) - 4 * len(r["leaked"]) - 1.5 * max(0, r["extra"] - 1),
            "narrator": 0.65 * (10.0 if bn == 8 and st(r["f0"], tgt) > 0 else band(dev, 0, 3, 3)) + 0.35 * band(abs(r["db"] - DB), 0, 2, 4),
            "contour": band(r["end_st"], 1, 9, 4) if bn in QUESTION_END else band(r["end_st"], -9, -0.5, 3),
            "tail": band(r["tail"], 0, 0.08, 0.2),
            "pace": band(r["wps"], 2.9, 4.2, 1.0) if bn in BRISK else band(r["wps"], 2.5, 3.8, 1.0),
            "acting": acting(bn, r),
        }
        sc = {k: round(max(0.0, min(10.0, v)), 1) for k, v in sc.items()}
        W = {"clarity": 3, "narrator": 2, "contour": 1, "tail": 1, "pace": 1, "acting": 3}
        r["scores"], r["score"] = sc, round(sum(sc[k] * w for k, w in W.items()) / sum(W.values()), 2)
    best = max(rs, key=lambda r: r["score"])
    shutil.copy(best["path"], dst / f"b{bn:02d}.mp3")
    report.append({"beat": bn, "chosen": best["take"], "takes": [{k: (round(v, 3) if isinstance(v, float) else v)
                   for k, v in r.items() if k not in ("x", "ph", "path")} for r in rs]})
    print(f"b{bn:02d}: " + "  ".join(f"{r['take']} {r['score']:.2f}" for r in rs) + f"  -> {best['take']} {best['scores']}")
json.dump({"target_f0": TARGET, "median_db": DB, "beats": report}, open(dst / ("select_only.json" if ONLY else "select.json"), "w", encoding="utf-8"), indent=1)
print(f"target F0 {TARGET:.0f} Hz; winners copied to {dst}")

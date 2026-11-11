"""Audit narrator auditions (same text, same model) against what the antitheft short needs and the reference channel's
measured voice profile (study/CHANNEL_STYLE_BIBLE.md section 9). Never plays audio: Whisper + pitch/level maths only.

Per file: Whisper words -> accuracy vs the script (and leaked tag words / extra words), DP-aligned segments, then
  pace (natural words/s inside phrases, pauses), pitch (median, p10-p90 range), and the ACTING checks:
  question rise (last 0.35 s of "...steal?" vs that phrase), excitement ("almost eight percent!" F0 + level vs the
  narration), whisper (level drop + low voicing on "We'd better get ours now."), firm punch ("It gave them
  permission." lower F0), hook energy, spectral tilt. Scores 0-10 per criterion + a weighted total.
Usage: python -s voice_audit.py <folder with v3_*.mp3> [popularity.json]
"""
import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "sound" / __import__("short_cfg").SHORT / "voice"))
from voice_pitch import yin_f0  # noqa: E402
import voice_build as vb  # noqa: E402

SR = 24000
SEGS = [  # (name, text)
    ("hook", "She'd never even kept a borrowed paperclip."),
    ("sign", "Then she read one sign..."),
    ("steal", "and wanted to steal."),
    ("leaned", "She leaned over to her fiancé and whispered:"),
    ("whisper", "\"We'd better get ours now.\""),
    ("question", "But why would a warning make an honest person want to steal?"),
    ("visitors", "With \"many past visitors\"..."),
    ("excited", "almost eight percent!"),
    ("thieves", "The sign didn't stop thieves."),
    ("punch", "It gave them permission."),
]
NARR = ["hook", "sign", "leaned", "visitors", "thieves"]
TAGS = {"whispers", "whisper", "curious", "excited", "firmly", "pause"}


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def f0_track(x, a, b):
    win, hop = int(0.04 * SR), int(0.01 * SR)
    seg = x[int(a * SR):int(b * SR)]
    if len(seg) < win:
        return np.array([])
    e = np.sqrt(np.convolve(seg ** 2, np.ones(hop) / hop, "same"))
    thr = 0.1 * np.percentile(np.abs(seg), 99)
    out = []
    for k in range(0, len(seg) - win, hop):
        if e[k + win // 2] < thr * 0.3:
            continue
        v, c = yin_f0(seg[k:k + win], SR)
        if v and 60 <= v <= 420 and c < 0.2:
            out.append(v)
    return np.array(out)


def rms_db(x, a, b):
    s = x[int(a * SR):int(b * SR)]
    return 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)


def voiced_ratio(x, a, b):
    n = max(1, int((b - a) / 0.01) - 4)
    return len(f0_track(x, a, b)) / n


def st(a, b):
    return 12 * np.log2(a / b) if a > 0 and b > 0 else 0.0


def tilt(x):
    n = 4096
    spec = np.zeros(n // 2 + 1)
    for i in range(0, len(x) - n, n // 2):
        spec += np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))) ** 2
    fr = np.fft.rfftfreq(n, 1 / SR)
    b = lambda lo, hi: 10 * np.log10(spec[(fr >= lo) & (fr < hi)].mean() + 1e-20)
    return b(3000, 8000) - b(120, 500)


def band(v, lo, hi, soft):
    """10 inside [lo, hi], falling linearly to 0 at `soft` outside"""
    if lo <= v <= hi:
        return 10.0
    d = lo - v if v < lo else v - hi
    return max(0.0, 10.0 * (1 - d / soft))


def audit(p, pop):
    x = load(p)
    ww = vb.whisper(x.astype(np.float32))
    heard = [vb.key(w["w"]) for w in ww]
    toks, owner = [], []
    for name, t in SEGS:
        tt, _ = vb.parse(t)
        toks += tt
        owner += [name] * len(tt)
    exp = [vb.key(d) for d, _ in toks]
    sm = SequenceMatcher(None, exp, heard)
    acc = sum(b.size for b in sm.get_matching_blocks()) / len(exp)
    leaked = [h for h in heard if h in TAGS]
    extra = max(0, len(heard) - len(exp))
    al, miss = vb.align(toks, "", ww, len(x) / SR)
    seg = {}
    for name, _ in SEGS:
        ks = [k for k in range(len(al)) if owner[k] == name]
        seg[name] = (al[ks[0]][1], al[ks[-1]][2], len(ks))
    speech = sum(e - s for s, e, _ in seg.values())
    nwords = sum(n for *_, n in seg.values())
    wps = nwords / speech
    total = len(x) / SR
    narr_f0 = np.concatenate([f0_track(x, *seg[n][:2]) for n in NARR])
    allf0 = np.concatenate([f0_track(x, s, e) for s, e, _ in seg.values()])
    med = float(np.median(narr_f0)) if len(narr_f0) else 0.0
    rng = float(st(np.percentile(allf0, 90), np.percentile(allf0, 10))) if len(allf0) > 20 else 0.0
    narr_db = np.mean([rms_db(x, *seg[n][:2]) for n in NARR])
    qs, qe, _ = seg["question"]
    q_body, q_end = f0_track(x, qs, qe - 0.35), f0_track(x, qe - 0.35, qe + 0.05)
    q_rise = st(np.median(q_end), np.median(q_body)) if len(q_end) > 3 and len(q_body) > 3 else 0.0
    ex = f0_track(x, *seg["excited"][:2])
    ex_st = st(np.median(ex), med) if len(ex) > 3 else 0.0
    ex_db = rms_db(x, *seg["excited"][:2]) - narr_db
    wh_db = rms_db(x, *seg["whisper"][:2]) - narr_db
    wh_voiced = voiced_ratio(x, *seg["whisper"][:2])
    pu = f0_track(x, *seg["punch"][:2])
    pu_st = st(np.median(pu), med) if len(pu) > 3 else 0.0
    hook_db = rms_db(x, *seg["hook"][:2]) - narr_db
    tl = tilt(x)
    # the full script is 205 words: its natural length at this pace + the channel's tight gaps (~6.5 s total)
    full_est = 205 / wps + 6.5
    sc = {
        "clarity": max(0.0, 10 * (acc - 0.80) / 0.20) - 3 * len(leaked) - 1.0 * max(0, extra - 1),
        "pace": band(wps, 3.4, 4.3, 1.2),
        "pitch": band(med, 170, 215, 50),
        "range": band(rng, 12, 18, 7),
        "question_rise": band(q_rise, 2, 9, 4),
        "excitement": 0.6 * band(ex_st, 1.5, 7, 4) + 0.4 * band(ex_db, -1, 6, 4),
        "whisper": 0.6 * band(wh_db, -16, -5, 6) + 0.4 * band(wh_voiced, 0, 0.45, 0.4),
        "punch": band(pu_st, -6, -0.5, 4),
        "hook_energy": band(hook_db, -1.5, 4, 4),
        "tone": band(tl, -30, -16, 8),
        "distinct": 10.0 if pop < 2e8 else (7.0 if pop < 1e9 else 4.0),
    }
    sc = {k: round(max(0.0, min(10.0, v)), 1) for k, v in sc.items()}
    W = {"clarity": 3, "pace": 2, "pitch": 1.5, "range": 1.5, "question_rise": 1, "excitement": 1.5, "whisper": 1,
         "punch": 1, "hook_energy": 1, "tone": 0.5, "distinct": 1}
    total_score = round(sum(sc[k] * w for k, w in W.items()) / sum(W.values()), 2)
    return {"file": p.name, "score": total_score, "scores": sc,
            "m": {"dur": round(total, 1), "wps": round(wps, 2), "full_script_est_s": round(full_est, 1), "f0_med": round(med),
                  "range_st": round(rng, 1), "q_rise_st": round(q_rise, 1), "excited_st": round(ex_st, 1), "excited_db": round(ex_db, 1),
                  "whisper_db": round(wh_db, 1), "whisper_voiced": round(wh_voiced, 2), "punch_st": round(pu_st, 1),
                  "hook_db": round(hook_db, 1), "tilt_db": round(tl, 1), "acc": round(acc, 3), "leaked": leaked, "extra": extra,
                  "heard": " ".join(w["w"] for w in ww)}}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    folder = Path(sys.argv[1])
    pop = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else {}
    rows = []
    for p in sorted(folder.glob("v*_*.mp3")):
        name = p.stem.split("_", 1)[1]
        rows.append(audit(p, pop.get(name.split("_")[0], 0)))
        r = rows[-1]
        print(f"{r['file']:28} {r['score']:5.2f}  {r['m']['wps']} w/s full~{r['m']['full_script_est_s']}s F0 {r['m']['f0_med']} rng {r['m']['range_st']} "
              f"q {r['m']['q_rise_st']:+} ex {r['m']['excited_st']:+}/{r['m']['excited_db']:+}dB wh {r['m']['whisper_db']}dB/{r['m']['whisper_voiced']} "
              f"pu {r['m']['punch_st']:+} acc {r['m']['acc']} leak {r['m']['leaked']}", flush=True)
    rows.sort(key=lambda r: -r["score"])
    json.dump(rows, open(folder / "audit.json", "w", encoding="utf-8"), indent=1)
    print("\nRANKING")
    keys = list(rows[0]["scores"])
    print(f"{'voice':26} {'TOTAL':>5} " + " ".join(f"{k[:7]:>7}" for k in keys))
    for r in rows:
        print(f"{r['file'][3:-4]:26} {r['score']:5.2f} " + " ".join(f"{r['scores'][k]:7.1f}" for k in keys))


if __name__ == "__main__":
    main()

"""RETAKE pass: objective numbers for every retake (takes/james_retake/<line>/tN.mp3) AND the installed line (cut from
voice.wav: _prev_retake/ if it exists, else the installed one), same meter for both.
Whisper word check, speech duration, F0 (median / p10-p90 range / end rise of the last 300 ms), level, voiced ratio, peak,
true-silence pauses, plus per-line goal numbers.  Usage: python -s retake_probe.py [line ...]   -> prints + retake_probe.json"""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent.parent / "tools"))
import voice_build as vb  # noqa: E402
from voice_audit import load, f0_track, rms_db, st, voiced_ratio, SR  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
LINES = {"hook": [0, 1], "question": [11], "easy": [9], "cancelbtn": [22, 23], "last": [28, 29]}
med = lambda f: float(np.median(f)) if len(f) else 0.0


def env_db(x):
    hop = SR // 100
    n = len(x) // hop
    return 20 * np.log10(np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)


def span(x):
    d = env_db(x)
    on = np.where(d > -40)[0]
    return on[0] / 100, (on[-1] + 1) / 100


def sil(x, a, b):
    """longest true-silence (-45 dBFS) run inside [a, b] -> (start, end)"""
    d = env_db(x)
    a, b = max(0, int(a * 100)), min(len(d), int(b * 100))
    best, run, end = 0, 0, a
    for j in range(a, b):
        run = run + 1 if d[j] < -45 else 0
        if run > best:
            best, end = run, j
    return (end - best + 1) / 100, (end + 1) / 100


def rise(x, a, b):
    """last 300 ms of the voiced end vs the body before it (st), and the slope inside the last 300 ms (st)"""
    tail = f0_track(x, b - 0.32, b + 0.02)
    body = f0_track(x, a, b - 0.30)
    h = len(tail) // 2
    slope = st(med(tail[h:]), med(tail[:h])) if len(tail) >= 6 else float("nan")
    return (st(med(tail), med(body)) if len(tail) >= 3 and len(body) >= 3 else float("nan")), slope, len(tail)


def rng(x, a, b):
    f = f0_track(x, a, b)
    return float(st(np.percentile(f, 90), np.percentile(f, 10))) if len(f) > 5 else float("nan")


def probe(x, idxs, label):
    toks, owner = [], []
    for i in idxs:
        t, _ = vb.parse(vb.P[i][0])
        toks += t
        owner += [i] * len(t)
    ww = vb.whisper(x.astype(np.float32))
    al, miss = vb.align(toks, "", ww, len(x) / SR)
    a0, b0 = span(x)
    T = [(d, round(s, 3), round(e, 3)) for d, s, e in al]
    r = {"label": label, "dur": round(b0 - a0, 3), "span": (a0, b0), "heard": " ".join(w["w"] for w in ww),
         "minp": round(min(w["p"] for w in ww), 2) if ww else 0, "miss": miss, "n_heard": len(ww), "n_tok": len(toks),
         "words": T, "peak": round(float(np.max(np.abs(x))), 3), "f0": round(med(f0_track(x, a0, b0))),
         "range_st": round(rng(x, a0, b0), 1), "level": round(rms_db(x, a0, b0), 1), "voiced": round(voiced_ratio(x, a0, b0), 2)}
    ph = {}
    for i in idxs:
        ks = [k for k in range(len(al)) if owner[k] == i]
        ph[i] = (al[ks[0]][1], al[ks[-1]][2])
    g = {}
    ws = lambda k: al[k][1]
    we = lambda k: al[k][2]
    n = len(al)
    if label[0] == "hook":
        # 'forty billion yen' = tokens 6,7 ; sentence-1 body = tokens 0..5 ; tail = "that didn't even exist." tokens 12..15
        pa, pb = ws(6), min(we(7), b0)
        g["punch_dB"] = round(rms_db(x, pa, pb) - rms_db(x, ws(0), we(5)), 1)
        g["punch_st"] = round(st(med(f0_track(x, pa, pb)), med(f0_track(x, ws(0), we(5)))), 1)
        g["punch_p90_st"] = round(st(float(np.percentile(f0_track(x, pa, pb), 90)), med(f0_track(x, a0, b0))), 1)
        q = sil(x, we(11) - 0.25, ws(12) + 0.15)
        g["beat_before_that_s"] = round(q[1] - q[0], 2)
        g["beat_at"] = q
        q2 = sil(x, we(7) - 0.3, ws(8) + 0.15)
        g["yen_And_s"] = round(q2[1] - q2[0], 2)
        g["yen_And_at"] = q2
        g["tail_drop_st"] = round(st(med(f0_track(x, ws(12), b0)), med(f0_track(x, a0, we(11)))), 1)
        g["tail_dB"] = round(rms_db(x, ws(12), b0) - rms_db(x, a0, we(11)), 1)
        g["exist_f0"] = round(med(f0_track(x, ws(15), b0)))
        g["s1_range_st"] = round(rng(x, a0, we(7)), 1)
        g["s1_f0"] = round(med(f0_track(x, a0, we(7))))
    if label[0] == "question":
        rr = rise(x, a0, b0)
        g["end_rise_st"], g["end_slope_st"], g["n_tail"] = round(rr[0], 1), round(rr[1], 1), rr[2]
        fe = f0_track(x, ws(n - 1), b0)
        k3 = max(1, len(fe) // 3)
        g["exist_f0_first_last"] = (round(med(fe[:k3])), round(med(fe[-k3:]))) if len(fe) > 3 else None
        g["exist_vs_body_st"] = round(st(med(fe), med(f0_track(x, a0, ws(n - 1)))), 1)
    if label[0] == "easy":
        f = f0_track(x, a0, b0)
        k4 = max(1, len(f) // 4)
        g["end_st"] = round(st(med(f[-k4:]), med(f[:k4])), 1) if len(f) > 4 else None
        g["f0_sd_st"] = round(float(np.std(12 * np.log2(f / np.median(f)))), 2) if len(f) > 4 else None
        g["n_f0"] = len(f)
    if label[0] == "cancelbtn":
        q = sil(x, ph[22][1] - 0.2, ph[23][0] + 0.15)
        a, b = ph[22][0], q[0]
        rr = rise(x, a, b)
        g["button_rise_st"], g["button_slope_st"], g["n_tail"] = round(rr[0], 1), round(rr[1], 1), rr[2]
        g["button_The_s"] = round(q[1] - q[0], 2)
        g["gap_at"] = q
        g["reveal_range_st"] = round(rng(x, q[1], b0), 1)
        g["reveal_end_st"] = round(rise(x, q[1], b0)[0], 1)
        g["bug_f0"] = round(med(f0_track(x, ws(n - 1), b0)))
        g["reveal_f0"] = round(med(f0_track(x, q[1], b0)))
        g["q_f0"] = round(med(f0_track(x, a, b)))
        g["reveal_dB"] = round(rms_db(x, q[1], b0) - rms_db(x, a, b), 1)
    if label[0] == "last":
        q = sil(x, ph[28][1] - 0.2, ph[29][0] + 0.15)
        g["second_The_s"] = round(q[1] - q[0], 2)
        g["gap_at"] = q
        ea, eb = ws(n - 2), b0
        g["eight_years_dur"] = round(eb - ea, 2)
        g["eight_years_dB"] = round(rms_db(x, ea, eb) - rms_db(x, a0, ea), 1)
        g["eight_f0"] = round(med(f0_track(x, ws(n - 2), we(n - 2))))
        g["years_f0"] = round(med(f0_track(x, ws(n - 1), b0)))
        g["end_fall_st"] = round(st(med(f0_track(x, ws(n - 1), b0)), med(f0_track(x, a0, ea))), 1)
        g["rate_wps"] = round(12 / (b0 - a0 - (q[1] - q[0])), 2)
        q3 = sil(x, we(n - 3) - 0.1, ws(n - 2) + 0.1)
        g["took_eight_s"] = round(q3[1] - q3[0], 2)
    r["goal"] = g
    return r


def main():
    want = sys.argv[1:] or list(LINES)
    bak = HERE / "_prev_retake" / "voice.wav"
    vw = load(bak if bak.exists() else HERE / "voice.wav")
    pj = HERE / "_prev_retake" / "phrases.json"
    phr = {p["i"]: p for p in json.loads((pj if pj.exists() else HERE / "phrases.json").read_text(encoding="utf-8"))}
    out = {}
    for line in want:
        idxs = LINES[line]
        a, b = phr[idxs[0]]["s"], phr[idxs[-1]]["e"]
        pad0 = min(0.2, a)
        res = [probe(vw[int((a - pad0) * SR):int((b + 0.2) * SR)], idxs, (line, "OLD"))]
        for p in sorted((HERE / "takes" / "james_retake" / line).glob("t*.mp3")):
            res.append(probe(load(p), idxs, (line, p.stem)))
        out[line] = res
        print(f"\n===== {line}")
        for r in res:
            print(f"-- {r['label'][1]:4} dur {r['dur']:.2f}  f0 {r['f0']}  range {r['range_st']} st  lvl {r['level']} dB  voiced {r['voiced']}  peak {r['peak']}  "
                  f"minp {r['minp']}  miss {r['miss']}  heard({r['n_heard']}): {r['heard']}")
            print("        " + "  ".join(f"{k}={v}" for k, v in r["goal"].items() if not k.endswith("_at")))
    (HERE / "takes" / "james_retake" / "retake_probe.json").write_text(json.dumps(out, indent=1, ensure_ascii=False, default=float), encoding="utf-8")


if __name__ == "__main__":
    main()

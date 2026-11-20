"""SCRIPT v4 (one narrator, PARAGRAPH takes): shared measuring code for the pt4_* tools. Nothing is ever played.

The unit of measurement is the SENTENCE (the benchmark's "line"): its pitch median, its pace inside speech, its loudness,
its end contour, and the gap to the next sentence. A film / a chain of takes is judged on the STEPS between neighbouring
sentences, never on one sentence's own score (sound/pointing/audio/NOTES.md, THE RECORDING RULE; BENCHMARK_sound.md 6)."""
import json
import re
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pt_lib as L  # noqa: E402

# numbers Whisper writes as digits in this script (compared as words; pt_lib.NUM has 1-6, 100, 1000)
L.NUM.update({"10": "ten", "12": "twelve", "0": "zero"})

SR, H = L.SR, L.H
ROOT = L.ROOT

# the lead's binding targets for the v4 narrator (2026-11-20)
TARGET = {
    "step_median_st_max": 3.5,      # median line-to-line pitch step
    "step_max_st": 6.0,             # no single step over this
    "centre_hz": (175.0, 200.0),    # median of the sentence medians
    "line_median_hz_max": 240.0,    # no sentence median over this
    "wps_inside": (3.4, 3.7),       # words / s inside speech (sentence median)
    "wps_sd_max": 0.6,              # pace swing between sentences
    "gap_s": (0.15, 0.30),          # between sentences
    "beat_max_s": 0.8,              # ONE planned held beat
    "tail_s": (0.04, 0.09),         # natural tail after a sentence's last word
}
SENT_END = re.compile(r"[.!?]+[\"')\]]*$")


def st(a, b):
    """semitones from a to b"""
    return 12 * np.log2(b / a)


def split_sentences(text):
    """the sentences of a paragraph text (tags in [brackets] removed; '...' inside a sentence does not end it)"""
    t = re.sub(r"\[[^\]]*\]", " ", text)
    t = re.sub(r"\s+", " ", t).strip()
    out, cur = [], []
    for w in t.split(" "):
        cur.append(w)
        if SENT_END.search(w) and not w.endswith("..."):
            out.append(" ".join(cur))
            cur = []
    if cur:
        out.append(" ".join(cur))
    return out


def sentences_from_words(words, phrases=None, speakers=("N",)):
    """sentences of a finished voice: words.json-style [{w, s, e}] cut at sentence punctuation; with phrases.json, only
    words inside phrases of the given speakers (a phrase without a speaker field counts as the narrator)"""
    keep = None
    if phrases is not None:
        spans = [(p["s"] - 0.02, p["e"] + 0.02) for p in phrases if p.get("speaker", "N") in speakers]
        keep = lambda w: any(a <= (w["s"] + w["e"]) / 2 <= b for a, b in spans)
    out, cur = [], []
    for w in words:
        if w.get("from_phone"):
            continue
        if keep is not None and not keep(w):
            if cur:
                out.append(cur)
                cur = []
            continue
        cur.append(w)
        if SENT_END.search(w["w"]) and not w["w"].endswith("..."):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [{"text": " ".join(x["w"] for x in c), "s": c[0]["s"], "e": c[-1]["e"], "nw": len(c)} for c in out if c]


class Track:
    """one mono 48 kHz signal with its f0 track and 5 ms level frames, measured once"""

    def __init__(self, m):
        self.m = m
        self.T, self.F = L.f0_track(m)
        self.d = L.db_frames(m)

    def sentence(self, s, e, nw):
        a, b = max(0.0, s), min(len(self.m) / SR, e)
        fs = L.f0_stats(self.T, self.F, a, b)
        seg = self.m[int(a * SR):int(b * SR)]
        dur = max(1e-3, b - a)
        return {"s": round(a, 3), "e": round(b, 3), "dur": round(dur, 3), "nw": nw, "wps": round(nw / dur, 2),
                "f0": fs.get("med"), "f0_range_st": fs.get("range_st"), "lufs": round(L.lufs(seg), 2) if len(seg) > SR * 0.4 else None,
                "end": L.end_contour(self.T, self.F, a, b)}

    def true_silence(self, a, b):
        """seconds of true silence (-45 dBFS, 10 ms windows every 5 ms) inside [a, b]"""
        return sum((r[1] - r[0]) * H for r in L.runs_below(self.d, int(a / H), int(b / H)))

    def tail(self, e, look=0.25):
        """natural tail after a sentence end e: time until the level stays 30 dB under the last 50 ms before e"""
        j = int(e / H)
        ref = float(np.max(self.d[max(0, j - 10):j + 1])) if j < len(self.d) else -120
        k = j
        while k < min(len(self.d), j + int(look / H)) and self.d[k] > ref - 30:
            k += 1
        return round((k - j) * H, 3)


def summary(S, gaps=None):
    """film / chain numbers from a list of measured sentences (in order)"""
    f = [x["f0"] for x in S if x.get("f0")]
    steps = [abs(st(a, b)) for a, b in zip(f, f[1:])]
    w = [x["wps"] for x in S if x["nw"] >= 3]
    words = sum(x["nw"] for x in S)
    speak = sum(x["dur"] for x in S)
    g = gaps if gaps is not None else [round(b["s"] - a["e"], 3) for a, b in zip(S, S[1:])]
    return {"sentences": len(S), "words": words, "speaking_s": round(speak, 2),
            "wps_over_speech": round(words / speak, 2) if speak else None,
            "wps_median": round(float(np.median(w)), 2) if w else None, "wps_sd": round(float(np.std(w)), 2) if w else None,
            "centre_hz": round(float(np.median(f)), 1) if f else None, "line_median_max_hz": round(max(f), 1) if f else None,
            "line_median_min_hz": round(min(f), 1) if f else None,
            "step_median_st": round(float(np.median(steps)), 2) if steps else None, "step_max_st": round(float(max(steps)), 2) if steps else None,
            "steps_over_6": sum(1 for x in steps if x > 6), "steps": [round(float(x), 2) for x in steps],
            "gap_median_s": round(float(np.median(g)), 3) if g else None, "gap_max_s": round(max(g), 3) if g else None,
            "gaps_over_0.3": sum(1 for x in g if x > 0.3), "lufs_sd": round(float(np.std([x["lufs"] for x in S if x.get("lufs") is not None])), 2),
            "ends": {"rise": sum(1 for x in S if (x.get("end") or {}).get("rise_st", 0) > 1.5),
                     "fall": sum(1 for x in S if (x.get("end") or {}).get("rise_st", 0) < -1.5)}}


def check(sm):
    """the lead's v4 gates on a summary -> {rule: (ok, value)}"""
    T = TARGET
    return {
        "step median <= 3.5 st": (sm["step_median_st"] is not None and sm["step_median_st"] <= T["step_median_st_max"], sm["step_median_st"]),
        "no step > 6 st": (sm["steps_over_6"] == 0, sm["step_max_st"]),
        "centre 175-200 Hz": (sm["centre_hz"] is not None and T["centre_hz"][0] <= sm["centre_hz"] <= T["centre_hz"][1], sm["centre_hz"]),
        "no line > 240 Hz": (sm["line_median_max_hz"] is not None and sm["line_median_max_hz"] <= T["line_median_hz_max"], sm["line_median_max_hz"]),
        "pace 3.4-3.7 w/s": (sm["wps_median"] is not None and T["wps_inside"][0] <= sm["wps_median"] <= T["wps_inside"][1], sm["wps_median"]),
        "pace sd <= 0.6": (sm["wps_sd"] is not None and sm["wps_sd"] <= T["wps_sd_max"], sm["wps_sd"]),
    }


def jload(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def jsave(p, obj):
    Path(p).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")

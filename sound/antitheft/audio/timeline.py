# Picture clock for "The Anti-Theft Sign That Made People Steal". NOTHING here is hard-coded: every shot, dissolve and
# story beat is read at run time from audio/timeline.json (exported from studio/src/videos/antitheft/story.ts by
# `node scripts/export_timeline.mjs`) and every word from voice/words.json. A later voice or picture change only needs
# a re-export + `python mix.py` (mix.py keys its cache on these files, so nothing stale is ever reused).
import os
import re
import json
import math
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TL_PATH = os.path.join(HERE, "timeline.json")
WORDS_PATH = os.path.join(ROOT, "voice", "words.json")
VOICE_PATH = os.path.join(ROOT, "voice", "voice.wav")
VOICE_INFO = os.path.join(ROOT, "voice", "voice_info.json")

with open(TL_PATH, encoding="utf-8") as _f:
    _J = json.load(_f)
with open(WORDS_PATH, encoding="utf-8") as _f:
    WORDS = json.load(_f)

FPS = int(_J["fps"])
TOTAL = int(_J["total"])
DUR = TOTAL / FPS                      # exact length of the picture (s); mix.wav has exactly TOTAL * 48000 / FPS samples

# ---- voice time-map (LEAD, ElevenLabs re-time): the picture keeps its old-voice clock (story.ts BEAT / SHOTS / every
# probe frame stay in OLD frames) and studio/src/videos/antitheft/voicewarp.ts renders it at WARP[new frame]. When
# audio/warp.json matches this timeline and the voice is the new take, every OLD picture frame is turned into NEW-voice
# seconds here (fr / bt / shot_t / xfade all go through fr), DUR becomes the new length, and sec_to_old() maps a word
# time back onto the picture clock. Without warp.json everything is exactly as before.
import numpy as _np
WARP = INV = None
try:
    with open(os.path.join(HERE, "warp.json"), encoding="utf-8") as _f:
        _W = json.load(_f)
    with open(VOICE_INFO, encoding="utf-8") as _f:
        _take = str(json.load(_f).get("take", ""))
    if int(_W["old_total"]) == TOTAL and _take.startswith("eleven"):
        WARP, INV = _np.asarray(_W["warp"], float), _np.asarray(_W["inv"], float)
        DUR = int(_W["new_total"]) / FPS
except FileNotFoundError:
    pass
NEW_TOTAL = int(round(DUR * FPS))
SHOTS = {int(s["id"]): s for s in _J["shots"]}
BEAT = {k: int(v["f"]) for k, v in _J["beat"].items()}
LAST = max(SHOTS)
EXTERIOR = {"trailhead", "vista", "trails"}


def voice_take():
    try:
        with open(VOICE_INFO, encoding="utf-8") as f:
            return str(json.load(f).get("take", "?"))
    except Exception:  # noqa
        return "?"


def fr(f):
    """picture frame (old clock) -> seconds of the narration (new clock when the voice time-map is active)"""
    if INV is None:
        return f / FPS
    return float(_np.interp(float(f), _np.arange(len(INV), dtype=float), INV)) / FPS


def sec_to_old(t):
    """narration seconds -> picture frame (old clock): for cue frames derived from word times"""
    if WARP is None:
        return t * FPS
    return float(_np.interp(float(t) * FPS, _np.arange(len(WARP), dtype=float), WARP))


def bt(name, df=0.0):
    """time (s) of story beat `name` (+ df frames)"""
    return fr(BEAT[name] + df)


def bf(name, df=0):
    """frame of story beat `name` (+ df)"""
    return BEAT[name] + df


def shot_t(i):
    s = SHOTS[i]
    return fr(s["a"]), fr(s["b"])


def clause_t(i):
    """time of the first word of shot i's clause (story.ts puts the boundary 3 f after it)"""
    return fr(SHOTS[i]["a"] - 3) if i > 1 else 0.0


def shot_at(t):
    f = sec_to_old(t)
    for i, s in SHOTS.items():
        if s["a"] <= f < s["b"]:
            return i
    return LAST


def xfade(i):
    """the picture dissolve INTO shot i, in seconds (start, end); story.ts layersAt(): frames [a - x//2, a - x//2 + x)"""
    s = SHOTS[i]
    x = int(s.get("xfade") or 0)
    if i == 1 or x <= 0:
        return fr(s["a"]), fr(s["a"])
    a = s["a"] - x // 2
    return fr(a), fr(a + x)


def exterior(i):
    return SHOTS[i]["set"] in EXTERIOR


def lights_of(i):
    """[(t, light)] for shot i: its base light plus in-shot relights (start times)"""
    s = SHOTS[i]
    out = [(fr(s["a"]), s["light"])]
    for r in s.get("relight") or []:
        out.append((fr(r["f"]), r["to"]))
    return out


# ---------------------------------------------------------------- ambience beds per shot
def bed_key(i):
    """which ambience bed plays under shot i (by set + light, so a re-cut picture still maps)"""
    s = SHOTS[i]
    st_, li = s["set"], s["light"]
    if st_ == "trailhead":
        return "dusk" if li == "dusk" else "th_noon"
    if st_ == "vista":
        return "vista"
    if st_ == "trails":
        return {"morning": "morning", "sunset": "sunset"}.get(li, "tt_noon")
    if st_ == "classroom":
        return "classroom"
    if st_ == "storeroom":
        return "storeroom"
    if st_ == "blueprint":
        return "blueprint"                          # A4 ADD: a soft cool room tone + the paper-grid shimmer (sfx.py)
    return None


def shot_weights(t, pad_f=4):
    """linear weight of every shot at times t (they sum to 1): each picture dissolve widened by pad_f frames a side.
    t is narration time (s); the shots live on the picture clock, so t goes through the voice time-map (WARP) first."""
    f = np.asarray(t, float) * FPS
    if WARP is not None:
        f = np.interp(f, np.arange(len(WARP), dtype=float), WARP)
    rise = {}
    for i, s in SHOTS.items():
        if i == 1:
            rise[i] = np.ones_like(f)
            continue
        x = int(s.get("xfade") or 0)
        a0 = s["a"] - x // 2 - pad_f
        L = max(1, x + 2 * pad_f)
        rise[i] = np.clip((f - a0) / L, 0, 1)
    w = {}
    for i in SHOTS:
        nxt = rise.get(i + 1)
        w[i] = rise[i] * (1 - nxt) if nxt is not None else rise[i]
    return w


def bed_weights(t, pad_f=4):
    """equal-power weight of every ambience bed at times t"""
    w = shot_weights(t, pad_f)
    lin = {}
    for i, wi in w.items():
        k = bed_key(i)
        if k is None:
            continue
        lin[k] = lin.get(k, 0) + wi
    return {k: np.sin(0.5 * np.pi * np.clip(v, 0, 1)) for k, v in lin.items()}


# ---------------------------------------------------------------- wind (shared with the picture)
# One gust curve for the whole short, periodic over the full length so the loop (last frame -> frame 0) is seamless.
# The picture can use the same curve for sagebrush / hat-brim / dress sway amplitude (see cues.md):
#   gust(t) = 0.62 + 0.20 sin(2pi 7 t/D + 0.6) + 0.11 sin(2pi 2 t/D + 2.0) + 0.07 sin(2pi 17 t/D + 4.1),  D = TOTAL/FPS
GUST_TERMS = [(0.20, 7, 0.6), (0.11, 2, 2.0), (0.07, 17, 4.1)]


def gust(t):
    t = np.asarray(t, float)
    g = 0.62 + sum(a * np.sin(2 * np.pi * k * t / DUR + ph) for a, k, ph in GUST_TERMS)
    return g


# ---------------------------------------------------------------- words
def _clean(w):
    return re.sub(r"[^a-z0-9%]", "", w.lower())


def word(text, after=0.0):
    """first word matching `text` (case/punctuation-insensitive) starting at or after `after` s -> dict(w, s, e)"""
    key = _clean(text)
    for w in WORDS:
        if float(w["s"]) >= after - 1e-6 and _clean(w["w"]).startswith(key):
            return w
    raise KeyError(f"word {text!r} after {after}")


def word_at(t):
    """the word being spoken at t (or None)"""
    for w in WORDS:
        if float(w["s"]) <= t < float(w["e"]):
            return w
    return None


def word_end_after(t):
    """end time of the word that starts at or just after t (for 'leave the word on top' rides)"""
    for w in WORDS:
        if float(w["s"]) >= t - 0.05:
            return float(w["e"])
    return float(WORDS[-1]["e"])


def gaps(min_gap=0.08):
    """silences between words: [(end_of_prev, start_of_next)], plus the tail after the last word"""
    out = []
    for a, b in zip(WORDS, WORDS[1:]):
        if float(b["s"]) - float(a["e"]) >= min_gap:
            out.append((float(a["e"]), float(b["s"])))
    out.append((float(WORDS[-1]["e"]), DUR))
    return out


def gap_after(t, min_gap=0.12):
    """first silence (>= min_gap) that ends after t: (start, end)"""
    for a, b in gaps(min_gap):
        if b > t:
            return max(a, t), b
    return t, t


def speech_spans(merge=0.3):
    sp = []
    for w in WORDS:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp


LAST_WORD_END = float(WORDS[-1]["e"])
END_T = bt("end") if "end" in BEAT else LAST_WORD_END


# ---------------------------------------------------------------- small helpers
def hh(i, s=0):
    """deterministic hash in [0, 1) (same formula as the TS side's hash helpers)"""
    v = math.sin(i * 127.1 + s * 311.7) * 43758.5453
    return v - math.floor(v)


def summary():
    rows = [f"timeline.json: {TOTAL} frames = {DUR:.3f} s @ {FPS} fps, {len(SHOTS)} shots, {len(BEAT)} beats, {len(WORDS)} words, voice take {voice_take()}"]
    for i, s in SHOTS.items():
        rows.append(f"  shot {i:2d} {s['a']:5d}-{s['b']:5d} {s['set']:10s} {s['light']:10s} xfade {s.get('xfade', 0)} bed {bed_key(i)}")
    return "\n".join(rows)


if __name__ == "__main__":
    print(summary())
    print({k: round(bt(k), 3) for k in BEAT})

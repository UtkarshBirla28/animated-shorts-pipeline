# Picture clock for "The Oil Tanks That Were Mostly Water" (saladoil). NOTHING here is hard-coded: every shot, dissolve
# and story beat is read at run time from audio/timeline.json (exported from studio/src/videos/saladoil/story.ts by
# `node scripts/export_timeline.mjs`) and every word from voice/words.json. A later voice or picture change only needs
# a re-export + `python mix.py` (mix.py keys its cache on these files, so nothing stale is ever reused).
# The voice was made FIRST for this short, so audio/warp.json is the identity map (fr(f) = f / 30); the warp code stays
# so a later re-voice works the same way as in antitheft.
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
    WORDS_JSON = json.load(_f)


# ---- round 7 (A6 P2): the ACOUSTIC word onsets. words.json (Whisper + refine_onsets.py) is 4-11 f late on words that
# follow a pause ('fourteen' 16.81 vs 16.44, 'tested', 'Visitors', 'almost', 'conscience', 'twice', 'leaned', 'honest')
# and 9-10 f early where it put the start on the previous word's tail ('"Half' 63.83 vs 64.15, 'and (wanted)' 4.36 vs
# 4.67). Every word-keyed sound system (the speech-band ducks, key ducks, rides, word carves, gap placement) reads
# WORDS = these acoustic times; WORDS_JSON (the picture's / captions' clock) stays available. Pure function of
# voice.wav + words.json, so a voice re-assembly needs nothing but `python mix.py`. Silence = 10 ms RMS below
# p99 - 40 dB for >= 50 ms (the audit's definition); a start moves EARLIER to the end of the latest silence within 0.45 s
# before it (never into the previous word: >= its start + 0.12 s), or LATER to the end of a silence that begins within
# 0.15 s after the json start while the json start sits on a decaying tail (>= 6 dB under the word's own peak); a
# phrase-final end moves to the start of the next silence.
def _acoustic_words(words):
    try:
        import wave
        with wave.open(VOICE_PATH, "rb") as wf:
            sr, ch, sw, n = wf.getframerate(), wf.getnchannels(), wf.getsampwidth(), wf.getnframes()
            raw = wf.readframes(n)
    except Exception:  # noqa
        return [dict(w) for w in words], []
    if sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3)
        x = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        x = np.where(x >= 1 << 23, x - (1 << 24), x).astype(np.float64) / (1 << 23)
    elif sw == 2:
        x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768.0
    else:
        x = np.frombuffer(raw, np.int32).astype(np.float64) / 2.0 ** 31
    x = x.reshape(-1, ch).mean(1)
    hop = sr // 100
    nb = len(x) // hop
    lev = 10 * np.log10((x[: nb * hop] ** 2).reshape(nb, hop).mean(1) + 1e-14)
    thr = float(np.percentile(lev, 99)) - 40.0
    sil = lev < thr
    d = np.diff(np.concatenate([[0], sil.astype(np.int8), [0]]))
    runs = [(a / 100.0, b / 100.0) for a, b in zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)) if b - a >= 5]
    pk = lambda a, b: float(lev[max(0, int(a * 100)): max(int(a * 100) + 1, int(b * 100))].max())
    out, moved = [], []
    prev_s = -1.0
    for i, w in enumerate(words):
        s, e = float(w["s"]), float(w["e"])
        ns_ = s
        early = [(a, b) for a, b in runs if s - 0.02 <= a <= s + 0.15 and b <= e - 0.08 and b - s <= 0.4]
        if early and pk(s + 0.01, max(early[0][0], s + 0.02)) <= pk(early[0][1], e) - 6.0:
            ns_ = early[0][1]                                      # the json start sat on the previous word's tail
        else:
            inside = [(a, b) for a, b in runs if a <= s < b]
            lo = max(s - 0.45, prev_s + 0.12)
            if inside:
                a_in, b_in = inside[0]
                cand = [b for a, b in runs if lo <= b <= a_in - 0.03]
                if cand:
                    ns_ = cand[-1]                                 # a sound before the stop closure belongs to this word ('It gave')
                elif b_in - s <= 0.2 and e - b_in >= 0.12:
                    ns_ = b_in                                     # the word starts as the silence ends
            else:
                cand = [b for a, b in runs if lo <= b <= s + 0.005]
                if cand and cand[-1] < s - 0.03:
                    ns_ = cand[-1]                                 # json late: the end of the silence before it
        out.append(dict(w, s=round(ns_, 3)))
        if abs(ns_ - s) >= 0.03:
            moved.append((w["w"], s, round(ns_, 3)))
        prev_s = ns_
    for i, w in enumerate(out):                                    # ends: never past the next start; a phrase-final word
        nxt = out[i + 1]["s"] if i + 1 < len(out) else len(x) / sr   # ends where the silence nearest its json end begins
        je = float(w["e"])
        e = min(je, nxt)
        if nxt - je > 0.05:
            sl = [a for a, b in runs if max(w["s"] + 0.08, je - 0.25) <= a <= nxt]
            if sl:
                e = min(sl, key=lambda a: abs(a - je))
        else:
            sl = [a for a, b in runs if a <= je < b and a >= w["s"] + 0.08]
            if sl:
                e = sl[0]
        w["e"] = round(max(e, w["s"] + 0.05), 3)
    return out, moved


WORDS, ONSET_MOVES = _acoustic_words(WORDS_JSON)


def _voice_silences(min_len=0.10):
    """TRUE silences of the narration (10 ms RMS below p99 - 40 dB for >= min_len s): [(a, b)] in seconds. The json word
    edges hide pauses inside 'words' (e.g. the '...' after '$150 million' sits inside 'against'), so gap-seeking cues
    (trumpet fills, the plip, the bell, gull calls) read these."""
    try:
        import wave
        with wave.open(VOICE_PATH, "rb") as wf:
            sr, ch, sw, n = wf.getframerate(), wf.getnchannels(), wf.getsampwidth(), wf.getnframes()
            raw = wf.readframes(n)
    except Exception:  # noqa
        return []
    if sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3)
        x = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        x = np.where(x >= 1 << 23, x - (1 << 24), x).astype(np.float64) / (1 << 23)
    elif sw == 2:
        x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768.0
    else:
        x = np.frombuffer(raw, np.int32).astype(np.float64) / 2.0 ** 31
    x = x.reshape(-1, ch).mean(1)
    hop = sr // 100
    nb = len(x) // hop
    lev = 10 * np.log10((x[: nb * hop] ** 2).reshape(nb, hop).mean(1) + 1e-14)
    sil = lev < float(np.percentile(lev, 99)) - 40.0
    d = np.diff(np.concatenate([[0], sil.astype(np.int8), [0]]))
    out = [(a / 100.0, b / 100.0) for a, b in zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)) if (b - a) / 100.0 >= min_len]
    if out and out[-1][1] >= nb / 100.0 - 0.02:
        out[-1] = (out[-1][0], float(_J["total"]) / float(_J["fps"]))   # the tail runs to the end of the picture
    return out


SILENCES = _voice_silences()

FPS = int(_J["fps"])
TOTAL = int(_J["total"])
DUR = TOTAL / FPS                      # exact length of the picture (s); mix.wav has exactly TOTAL * 48000 / FPS samples

# ---- voice time-map (LEAD, ElevenLabs re-time): the picture keeps its old-voice clock (story.ts BEAT / SHOTS / every
# probe frame stay in OLD frames) and studio/src/videos/saladoil/voicewarp.ts renders it at WARP[new frame]. When
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
EXTERIOR = {"tanktop", "tankfarm", "street"}


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
    if st_ == "tanktop":
        return "tk_dawn" if li == "dawn_gold" else "tk_noon"   # the dawn bed (shots 1 / 16) is ONE loop-folded signal
    if st_ == "tankfarm":
        return "farm_storm" if li == "storm" else "farm_noon"
    if st_ in ("bank", "trading", "cutaway", "kitchen", "street", "office"):
        return st_
    if st_ == "pumproom":
        return "pump"
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
# One harbour-wind gust curve for the whole short, periodic over the full length so the loop (last frame -> frame 0) is
# seamless. The picture can use the same curve for tie / cap-brim / tape / flag sway amplitude (see cues.md):
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

# Every sound effect and the ambience of "The Clown Nobody Saw" as a cue list timed to the picture (timeline.py reads
# shots, dissolves and story beats from timeline.json at run time), rendered into two stereo stems: EVENTS and BEDS.
# Levels are relative to the voice: an EVENT's level = its max momentary loudness (LU vs the voice stem's integrated
# loudness); a BED layer's level = its integrated loudness in the open square.
#
# THE TEST'S HARD RULE (SCRIPT.md, BUILD_PLAN.md): during shot 1 NOTHING may point at the money branch. So in shot 1:
# no paper sound, no leaf brush, no whoosh, no chime; no event within +-HARD_PAD_F frames of the two duck frames
# (plan.DUCK_F); nothing panned further left than HARD_PAN_MIN; the bed's birds skip the duck moments too. The first
# bill sound of the film is in shot 7 (the peg + the flutter on "with money"). hard_rule() checks all of this at every
# run and stops the mix if a cue breaks it; its table goes into cues.md.
#
# Every event is keyed to a named PICTURE EVENT with a BEAT expression ('suitEnd-1', 'S9.a+8': never a literal frame)
# and says what picture action it expects (SOUND_EVENTS.md is written from this list at every run).
#
# FIX ROUND 1 (engine only; the cue list below is the FIRST cut's and is being re-written with the new script):
#   - SAMPLE PLAYBACK: smp() / honk_gen() / mix_parts() make cue generators from real recorded or generated sounds
#     (samples.py: _lib/ CC0 recordings, _el/ ElevenLabs sound effects; trim, fade, gain, pan, pitch variation of up to
#     +-1 semitone for repeats, rotation of takes, distance filtering; a missing file falls back to the synthesized
#     version). samples.step_track() lays one walker's recorded footsteps on the picture's own foot-down frames.
#   - SYNC DIRECTION: every picture-synced cue is measured as it is placed (its onset, or its peak for a whoosh) and
#     the mix FAILS if that point is more than 1 frame BEFORE its picture frame or more than 2 frames after it
#     (sync_check(); ITU-R BT.1359: sound that leads the picture is noticed far sooner than sound that lags). The character
# actions are being built in parallel from the same BEAT names: if one lands somewhere else, put its frame in
# audio/picture_events.json ({"name": frame | [frames] | "beat+n" | null}; null drops the cue) and re-run `python mix.py`.
import os
import re
import json
import numpy as np
from scipy import signal as _sig
from scipy import ndimage as _nd
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, shelf)
import sfx_gen as G
import sfx_gen_r1 as G2
import sfx_gen_r2 as G3
import sfx_gen_r3 as G4
import sfx_clown as X
import samples as SM
import instruments as I
import timeline as T
import plan as PL

N = ns(T.DUR)
FR = 1.0 / T.FPS
PE_PATH = os.path.join(T.HERE, "picture_events.json")
PE_USED = os.path.join(T.HERE, "picture_events_used.json")

# ================================================================ THE UNICYCLE (edit these to nudge it)
# How near the clown is to the lens decides the level of his tyre roll + pedal squeak.
# UNI_FOLLOW_PICTURE = True: the nearness comes from the picture itself (picture_plan.json = plan.ts clownAt(f), his real
#   distance from the opening lens, frame by frame): 1 inside UNI_NEAR_M metres, 0 beyond UNI_FAR_M. With the route of
#   2026-11-17 that gives the LEAD's envelope: near at f 0-100, back on the far lap by ~f 175, far until ~f 1700, near
#   again from ~f 1790 and held to the seam (frame TOTAL = frame 0).
# UNI_FOLLOW_PICTURE = False: the hand envelope UNICYCLE_ENV below (frame | BEAT expression | "END", nearness 0 .. 1).
UNI_FOLLOW_PICTURE = True
UNI_NEAR_M = 15.0                 # nearer than this = "near" (full level)
UNI_FAR_M = 21.0                  # farther than this = "far" (the lap)
UNI_NEAR_HOLD = "square-1"        # ~f 60: near the lens until here
UNI_FAR_BY = "people+3"           # ~f 170: on the far lap from here
UNI_RISE_FROM = "twoPeople+5"     # ~f 1700: he starts riding back up to the lens
UNI_NEAR_BY = "clown32End-5"      # ~f 1790: at the lens again, held to the seam
UNICYCLE_ENV = [(0, 1.0), (UNI_NEAR_HOLD, 1.0), (UNI_FAR_BY, 0.0), (UNI_RISE_FROM, 0.0), (UNI_NEAR_BY, 1.0), ("END", 1.0)]
UNI_NEAR_DB = -25.0               # the roll + squeak near the lens (integrated, LU vs the voice)
UNI_FAR_DB = -35.0                # ... on the far lap
UNI_NEAR_PAN = 0.25               # near the lens he is right of centre (the frame-0 honk sits here too)
UNI_SQUEAK_DB = 0.0               # the pedal squeak vs the tyre roll
UNI_WHEEL_R = 0.25                # m: only used when the picture's wheel radius is not in picture_plan.json
# what the far lap sounds like in each shot (dB on top of UNI_FAR_DB; None = he is not in the shot): 2 / 3 he circles
# small in the background, 4 he rides alongside but she does not hear him (muffled), 5 he is two metres behind her after
# the turn-around, 7 / 8 the square is out of frame, 9 he comes in with the pull-back
UNI_SHOT_DB = {1: 0.0, 2: -3.0, 3: -3.0, 4: -3.0, 5: -2.0, 6: -12.0, 7: None, 8: None, 9: 0.0}
UNI_SHOT_PAN = {2: -0.3, 3: -0.3, 4: -0.25, 5: 0.35, 6: 0.0}

# ================================================================ THE HARD RULE (shot 1)
HARD_PAD_F = 12                   # no event starts or peaks within this many frames of a duck frame of the count
HARD_PAN_MIN = -0.20              # nothing in shot 1 sits further left than this (the bills are upper-left)
WALKER_PAN_MIN = -0.10            # the count's walkers are kept near the centre (their pass-bys run through the duck moments)
HARD_FORBIDDEN = {"peg", "bill_flutter", "bills", "leaf", "duck", "chime", "note", "whoosh", "brush", "shimmer", "ghost_duck", "glint"}

# picture_events.json values may be BEAT expressions: "bust-2", "S9.a+4" (shot 9 start + 4), or lists of them
_EXPR = re.compile(r"^\s*(?:S(\d+)\.(a|b)|([A-Za-z_]\w*))\s*(?:([+-])\s*(\d+(?:\.\d+)?))?\s*$")


def resolve(v):
    if isinstance(v, str):
        if v.strip() == "END":
            return float(T.TOTAL)
        m = _EXPR.match(v)
        if not m:
            raise ValueError(f"cannot read frame expression {v!r} (use 'beat+n', 'beat-n' or 'S<id>.a+n')")
        base = T.SHOTS[int(m.group(1))][m.group(2)] if m.group(1) else T.BEAT[m.group(3)]
        d = float(m.group(5)) * (-1 if m.group(4) == "-" else 1) if m.group(5) else 0.0
        return float(base) + d
    if isinstance(v, list):
        return [resolve(x) for x in v]
    if isinstance(v, dict):
        return {k: (resolve(x) if isinstance(x, (str, list)) else x) for k, x in v.items()}
    return v


class Cue:
    def __init__(self, t, name, desc, gen, level, p=0.0, lpf=None, space="out", send=0.08, pe=None, wcarve=None, post=None,
                 key=None, expects="", dur_f=0.0, kind="sync", sync=None, pic=None):
        self.t, self.name, self.desc, self.gen, self.level = t, name, desc, gen, level
        self.p, self.lpf, self.space, self.send, self.pe, self.wcarve, self.post = p, lpf, space, send, pe, wcarve, post
        self.key, self.expects, self.dur_f, self.kind = key, expects, dur_f, kind
        # sync: which point of the sound must sit on the picture frame: "onset" (a hit), "peak" (a whoosh), "anchor"
        # (trust the generator's own anchor, e.g. a clock whirr that ends on its tock) or None = decide from the attack.
        # pic: the picture frame of the action (default: the cue's own frame; picture_truth.json overrides it)
        self.sync, self.pic = sync, pic
        self.measured = self.sync_err = self.sync_mode = self.start_f = None

    @property
    def frame(self):
        return self.t * T.FPS


# ================================================================ speech mask (true voice silences)
def speaking(t):
    """is narration time t inside speech (not inside a true voice silence)?"""
    t = np.atleast_1d(np.asarray(t, float))
    s = np.ones(len(t), bool)
    for a, b in T.SILENCES:
        s &= ~((t >= a) & (t < b))
    return s


def carve_words(x, t0, depth_db, lo=1000.0, hi=4000.0, broad_db=0.0, pre=0.02, post=0.03):
    """dip the lo..hi band of an event placed at narration time t0 while the voice speaks (edges 15 ms), plus an optional
    broadband trim; the low body and the top sparkle stay"""
    n = x.shape[-1]
    t = t0 + np.arange(n) / SR
    e = speaking(t).astype(float)
    if pre or post:                       # widen the speech windows a little (a word's attack / tail)
        k = max(1, ns(max(pre, post)))
        e = _nd.maximum_filter1d(e, 2 * k + 1, mode="nearest")     # (a convolution here broke on events shorter than the window)
    if not np.any(e):
        return x
    k = max(1, ns(0.015))
    e = _nd.uniform_filter1d(e, k, mode="nearest")
    low = lp(x, lo, 4)
    rest = x - low
    high = hp(rest, hi, 4)
    midb = rest - high
    return (low + high) * dbg(broad_db * e) + midb * dbg((depth_db + broad_db) * e)


def word_env(t, pre=0.06, post=0.08, tau=0.06):
    """0..1 'the narrator is speaking' envelope at times t (s), smoothed"""
    t = np.asarray(t, float)
    ctrl = 200
    tc = np.arange(int(np.floor(t[0] * ctrl)) - 4, int(np.ceil(t[-1] * ctrl)) + 5) / ctrl
    v = np.zeros(len(tc))
    for w in T.WORDS:
        v[(tc >= float(w["s"]) - pre) & (tc <= float(w["e"]) + post)] = 1.0
    k = max(1, int(tau * ctrl))
    v = np.convolve(v, np.ones(k) / k, mode="same")
    return np.interp(t, tc, v)


def ring_cut(after, tau=0.12):
    """post: let a bell ring `after` s, then die away fast (so it never hangs under the next words)"""
    def f(x):
        n = x.shape[-1]
        t = np.arange(n) / SR
        return x * np.where(t < after, 1.0, np.exp(-(t - after) / tau))[None, :]
    return f


def lowpass_post(f0, order=2):
    def f(x):
        return lp(x, f0, order)
    return f


# the 1-4 kHz band of these cues dips under the words (dB, or a dict with db / lo / hi / broad)
_WCARVE = {"honk": dict(db=-10.0, lo=700.0, hi=4500.0, broad=-4.0), "pop": -4.0, "chip": -4.0, "ding": dict(db=-6.0, lo=1200.0, hi=5000.0),
           "tick": -4.0, "cross": -4.0, "board": -4.0, "squeak": -6.0, "clock": -6.0, "boing": -4.0, "murmur": dict(db=-6.0, lo=700.0, hi=4000.0),
           "leak": -6.0, "peg": -3.0, "bill_flutter": -5.0, "bills": -6.0, "duck": dict(db=-5.0, lo=1000.0, hi=5000.0), "chime": -5.0,
           "note": -6.0, "scratch": -4.0, "wah": dict(db=-6.0, lo=800.0, hi=4000.0), "whoosh": -4.0, "brush": -5.0,
           "shimmer": dict(db=-11.0, lo=900.0, hi=4500.0, broad=0.0), "glint": -5.0, "ghost_duck": -5.0, "pigeon": -5.0, "laugh": -7.0,
           "blip": -4.0, "mind": -5.0, "bubble": -4.0, "steps": -4.0}


# ================================================================ picture events
_PE = None


def picture_events():
    """picture_events.json overrides (frames, lists, 'beat+n' expressions or null); cues() adds its defaults"""
    global _PE
    if _PE is not None:
        return _PE
    D, SRC = {}, {}
    if os.path.exists(PE_PATH):
        for k, v in json.load(open(PE_PATH, encoding="utf-8")).items():
            if k.startswith("_"):
                continue
            D[k], SRC[k] = (resolve(v) if v is not None else None), "picture_events.json"
    _PE = (D, SRC)
    return _PE


def _P(key, default, src="default (BEAT-keyed)"):
    D, SRC = picture_events()
    if key not in D:
        D[key], SRC[key] = default, src
    return D[key]


# the Overlays.tsx formulas the tally / text cues copy: if one of these strings is gone, the picture changed its formula
_OVERLAY_FORMULAS = ["BEAT.count - 3", "Math.max(BEAT.jobEnd + 14, T_IN + 54)", "BEAT.five - 2", "every(BEAT.pairs, 7, 3, true)",
                     "every(BEAT.pairs + 23, 3, 2, false)", "every(BEAT.soDid + 8, 6, 3, true)", "every(BEAT.music, 4, 2, false)",
                     "at: BEAT.one19 - 1", "at: BEAT.in19 + 1", "at: BEAT.four", "at: BEAT.saw19", "at: BEAT.six - 2", "BEAT.pairs - 10",
                     "BEAT.onAPhoneQ - 6", "BEAT.youSaw - 2"]


def picture_probes():
    """read the merged Overlays.tsx and report every tally / text formula this file copies that is no longer there"""
    p = os.path.normpath(os.path.join(T.HERE, "..", "..", "..", "studio", "src", "videos", "clown", "Overlays.tsx"))
    try:
        src = open(p, encoding="utf-8").read()
    except OSError:
        return ({}, ["Overlays.tsx not found: the tally / text frames are this file's copies of its formulas"])
    miss = [f for f in _OVERLAY_FORMULAS if f not in src]
    if miss:
        return ({}, ["WARNING: Overlays.tsx no longer has: " + "; ".join(miss) + " (re-check the tally / text cues)"])
    return ({}, [f"Overlays.tsx: all {len(_OVERLAY_FORMULAS)} tally / text formulas match this file's copies"])


# ================================================================ small helpers
def _mono_sum(*xs):
    n = max(len(x) for x in xs)
    y = np.zeros(n)
    for x in xs:
        y[: len(x)] += x
    return y


def _at(x, t):
    return np.concatenate([np.zeros(ns(t)), x])


def _smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def _dyn_pan(x, p):
    """mono x with a per-sample pan curve p (-1..1), constant power"""
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)


def walker_pass(r, w, f0, f1, base=190.0, rate=4.4, murmur=True):
    """one phone-walker of the count crossing the OPENING frame between frames f0 and f1 (w = a plan.walkers() track from
    cast_plan.ts): the soft, muffled, wordless phone 'blah-blah' and the walker's own steps, level and pan following the
    walker (distance from the lens, screen x). The level curve is smooth (no accent anywhere: nothing marks a duck) and
    the pan stays near the centre (>= WALKER_PAN_MIN). Stereo (2, n), starts at f0."""
    n = ns(T.fr(f1) - T.fr(f0))
    fs = np.arange(f0, f1 + 1.0)
    d = np.interp(fs, w["tau"], w["d"])
    sx = np.interp(fs, w["tau"], w["sx"])
    on = np.clip((1.25 - np.abs(sx)) / 0.35, 0, 1)                      # fades as the walker leaves the frame
    g = (7.0 / np.maximum(d, 5.0)) ** 1.25 * on
    g = np.convolve(np.pad(g, 12, mode="edge"), np.ones(25) / 25, "valid")   # 0.8 s smoothing: no steps in the level
    edge = np.clip(np.minimum((fs - f0) / 20.0, (f1 - fs) / 20.0), 0, 1)
    t = np.arange(n) / SR
    tf = (fs - f0) / T.FPS
    gs = np.interp(t, tf, g * edge)
    ps = np.interp(t, tf, np.clip(0.55 * sx, WALKER_PAN_MIN, 0.5))
    y = np.zeros(n)
    if murmur:
        m = X.phone_murmur(r, n / SR, base=base, rate=rate)
        y[: min(n, len(m))] += m[:n]
    stp = np.zeros(n)
    tm, k, f_step = r.uniform(0, 0.5), 0, r.uniform(110.0, 165.0)
    while tm < n / SR - 0.25:
        G._place_mono(stp, X.brick_step(r, r.uniform(0.85, 1.0), 0.45, f_step * r.uniform(0.97, 1.03)), tm)
        tm += 0.52 * r.uniform(0.96, 1.04)
        k += 1
    if murmur:
        stp *= 10 ** (-8.0 / 20) * np.sqrt(np.mean(y ** 2) + 1e-12) / (np.sqrt(np.mean(stp ** 2)) + 1e-12)   # mostly the smooth murmur
    return _dyn_pan((y + stp) * gs, ps)


# ================================================================ SAMPLE PLAYBACK (cue generators from real sounds)
_SMP_SEED = [91000]


def _smp_rng():
    _SMP_SEED[0] += 1
    return rng(_SMP_SEED[0])


def _sync_point(x, sync):
    x = np.asarray(x, float)
    x = x.mean(0) if x.ndim == 2 else x
    return SM.peak_t(x) if sync == "peak" else SM.onset(x)


def smp(sound, i=0, semis=0.0, vary=0.0, sync="onset", fallback=None, max_len=None, fade=None, lpf=None, hpf=None, d=None, gain_db=0.0):
    """A cue generator that plays a REAL sound: take number i (rotating) of the logical sound `sound` (samples.REG),
    pitched by `semis` plus a random +-`vary` (keep within 1 semitone for repeats), optionally cut to max_len seconds,
    faded (fade = (in s, out s)), low / high-passed, and filtered as a source d metres away (far = quieter and duller).
    Returns what a Cue wants: () -> (mono array, anchor s), where the anchor is the sound's SYNC POINT (its onset, or its
    peak with sync="peak"), so the engine lands that point on the picture frame. When the sound has no usable file the
    synthesized `fallback(r)` is used instead, synced the same way."""
    def g():
        r = _smp_rng()
        got = SM.get(sound, i, semis + (float(r.uniform(-vary, vary)) if vary else 0.0), sync=sync, fade=fade, max_len=max_len)
        if got is None:
            if fallback is None:
                raise SystemExit(f"sound '{sound}' has no file in _lib/ or _el/ and no synthesized fallback")
            x = np.asarray(fallback(r), float)
        else:
            x = got[0]
        if lpf:
            x = lp(x, lpf, 2)
        if hpf:
            x = hp(x, hpf, 2)
        if d is not None:
            x = SM.distance(x, d)
        return x * dbg(gain_db), _sync_point(x, sync)
    g.sound, g.take, g.sync = sound, i, sync
    return g


def mix_parts(*parts):
    """Several generators as ONE event: parts = (generator, seconds after the FIRST part's sync point, dB). Each part's
    own sync point is placed at its offset (a leaf brush on the frame, the body of the whoosh 2 frames later). The
    event's anchor is the first part's sync point. Parts are level-matched by peak before their dB is applied."""
    def g():
        got = [(gen(), off, db_) for gen, off, db_ in parts]
        a0 = got[0][0][1]
        t_min = min(a0 + off - an for (x, an), off, db_ in got)
        n = max(ns(a0 + off - an - t_min) + len(x) for (x, an), off, db_ in got)
        y = np.zeros(n)
        for (x, an), off, db_ in got:
            i0 = ns(a0 + off - an - t_min)
            y[i0:i0 + len(x)] += x / (np.max(np.abs(x)) + 1e-12) * dbg(db_)
        return y, a0 - t_min
    g.sync = "anchor"                      # a layered event is synced on its FIRST part's own sync point
    return g


def honk_gen(notes=(67, 67), i=0, single=False, gap=0.035, fallback=None):
    """A cue generator for the clown's horn, tuned: notes = MIDI pitch classes of the two squeezes (67, 67 = G G, the head
    of a tune in C; (64,) with single=True = one squeeze on E). The squeezes come from different takes in rotation
    (samples.honk()), each re-pitched by at most ~2.5 semitones. Falls back to the first cut's horn (sfx_clown)."""
    def g():
        got = SM.honk(notes[0], i) if single else SM.honk_honk(notes, i, gap=gap)
        if got is None:
            x = (fallback or (lambda r: X.honk_one(r) if single else X.honk_honk(r)))(_smp_rng())
            return x, SM.onset(x)
        return got[0], got[1]
    g.sync = "onset"
    return g


# ================================================================ SYNC DIRECTION (sound may be a little late, never early)
SYNC_TOL = (-1.0, 2.0)            # frames: the measured sync point minus the picture frame must stay inside this
SYNC_SLOW_ATTACK = 0.012          # s: with no sync given, a sound that takes longer than this to climb its last 12 dB to the
#                                   onset level (a whoosh, a swell) is synced on its PEAK; a hit (even heel-then-toe) on its ONSET
SYNC_MODE = os.environ.get("SYNC_CHECK", "fail")     # "fail" (default) stops the mix on a violation; "warn" only reports
SYNC_REPORT = os.path.join(T.HERE, "sync_report.json")
PT_PATH = os.path.join(T.HERE, "picture_truth.json")  # optional {picture event: frame | 'beat+n'}: the frame the ACTION is on in
#                                                       the rendered picture (the fixers' lists); the check measures against it
_PT = None


def picture_truth():
    global _PT
    if _PT is None:
        _PT = {}
        if os.path.exists(PT_PATH):
            for k, v in json.load(open(PT_PATH, encoding="utf-8")).items():
                if not k.startswith("_") and v is not None:
                    _PT[k] = float(resolve(v))
    return _PT


def _attack(x):
    """how sharply the sound STARTS: seconds its 20 ms envelope takes from 26 dB under the peak to 14 dB under it (the
    onset level), on the first rise. A hit takes a millisecond or two, a whoosh tens of milliseconds."""
    e = SM.env(x, 0.02)                    # (a smooth envelope: a noisy whoosh must not look like a hit)
    k14 = int(np.argmax(e >= e.max() * 10 ** (-14 / 20.0)))
    lo = np.flatnonzero(e[: k14 + 1] < e.max() * 10 ** (-26 / 20.0))
    k26 = int(lo[-1]) if len(lo) else 0
    return (k14 - k26) / SR


def measure_sync(c, x, t0):
    """the sync point of event x placed at t0 (s), against the cue's picture frame: fills c.sync_mode / c.sync_err (frames,
    + = the sound is late) / c.start_f"""
    m = x.mean(0) if x.ndim == 2 else x
    mode = c.sync or getattr(c.gen, "sync", None) or ("peak" if _attack(m) > SYNC_SLOW_ATTACK else "onset")
    pic = picture_truth().get(c.pe, c.pic if c.pic is not None else c.frame)
    if mode == "anchor":
        sp = c.t - t0
    else:
        sp = SM.peak_t(m) if mode == "peak" else SM.onset(m)
    c.sync_mode, c.start_f = mode, t0 * T.FPS
    c.sync_err = (t0 + sp) * T.FPS - float(pic)
    return c.sync_err


def sync_rows(C):
    return [dict(pe=c.pe, name=c.name, kind=c.kind, frame=round(float(c.frame), 2), mode=c.sync_mode,
                 err=None if c.sync_err is None else round(float(c.sync_err), 2),
                 ok=bool(c.kind != "sync" or c.sync_err is None or SYNC_TOL[0] <= c.sync_err <= SYNC_TOL[1])) for c in C]


def sync_check(rows, mode=None):
    """FAIL the mix when a picture-synced cue starts more than 1 frame before its picture frame or more than 2 frames
    after it. rows = sync_rows(C) or the saved sync_report.json. Returns the offenders (after printing them)."""
    mode = mode or SYNC_MODE
    bad = [r for r in rows if not r["ok"]]
    if bad:
        msg = "SYNC DIRECTION check: " + "; ".join(f"{r['pe']} ({r['name']}, {r['mode']}) {r['err']:+.1f} f" for r in bad) + \
              f"  (allowed {SYNC_TOL[0]:+.0f} .. {SYNC_TOL[1]:+.0f} f: sound may be up to 2 frames late, never more than 1 early). " \
              "Re-key the cue, give it sync='peak' / 'onset' / 'anchor', or put the action's real frame in picture_truth.json."
        if mode == "fail":
            raise SystemExit(msg)
        print("WARNING " + msg, flush=True)
    return bad


def sync_gate():
    """for mix.py after a CACHED events stem: re-apply the check from the report the render saved"""
    try:
        rows = json.load(open(SYNC_REPORT, encoding="utf-8"))["rows"]
    except (OSError, ValueError, KeyError):
        return []
    return sync_check(rows)


def shimmer(r, D):
    """THE REVEAL: a rising shimmer over D seconds (the biggest sound of the film): a glass pad swelling on G7sus, a
    celesta / glockenspiel arpeggio climbing three octaves and speeding up, a soft vibes roll, a breath of rising air,
    and a bell on the arrival. Stereo; the arrival (peak) is D seconds in."""
    n = ns(D + 1.2)
    out = np.zeros((2, n))
    notes = [55, 62, 65, 67, 72]
    padx = I.glass_pad([I.m2f(m) for m in notes], D, 0.6, r, att=D * 0.92, rel=0.45, bright=0.5, swell=lambda t: 0.15 + 0.85 * np.clip(t / D, 0, 1) ** 1.6)
    place(out, padx, 0.0, 0.8)
    arp = [67, 72, 74, 77, 79, 84, 86, 89, 91, 96, 98, 101, 103, 108]
    K = 22
    for k in range(K):
        u = (k / (K - 1)) ** 0.72
        m = arp[min(len(arp) - 1, int(u * (len(arp) - 1) + 0.5))]
        tk = u * (D - 0.05)
        v = 0.25 + 0.6 * u
        x = I.celesta(I.m2f(m), v, r, dur=0.9) if k % 2 == 0 else I.glock(I.m2f(m), v * 0.8, r, dur=0.9)
        place(out, pan(x, 0.55 * np.sin(k * 1.9)), tk, 1.0)
    vr = I.vibes_roll([I.m2f(m) for m in (74, 77, 79, 84)], D, 0.4, r, rate=12.0, swell=(0.05, 1.0))
    place(out, vr, 0.0, 0.7)
    airx = G.whoosh(D + 0.35, r, peak=D, f_lo=1200, f_hi=6500, width=1.0, tail=0.14, air=0.25)
    place(out, widen(airx, r, 9, 0.9), 0.0, 0.9)
    bell = G.ding(r, f0=2093.0, tau=0.5, sparkle=1.2)
    place(out, pan(bell, 0.0), D, 1.3)
    t = np.arange(n) / SR
    out *= np.where(t < D + 0.06, 1.0, np.exp(-(t - D - 0.06) / 0.16))[None, :]    # it clears quickly for "You saw the clown."
    return out


# ================================================================ the events
def cues():
    C = []
    seed = [7000]
    B = T.BEAT
    S = T.SHOTS

    def one(fn, anchor=0.0):
        def g():
            seed[0] += 1
            return fn(rng(seed[0])), anchor
        return g

    def ev(name, key, desc, expects, gen, level, pe=None, dur=None, kind="sync", **kw):
        """key = a BEAT expression ('suitEnd-1', 'S9.a+8'); pe = the picture-event name (override in picture_events.json);
        dur = BEAT expression of the END of a long cue; kind: sync (a picture action) | long (follows an action) | life"""
        pe = pe or name
        f = _P(pe, resolve(key))
        if f is None:
            return None
        f = float(f)
        df = (resolve(dur) - f) if dur else 0.0
        c = Cue(T.fr(f), name, desc, gen, level, pe=pe, key=key + (f" .. {dur}" if dur else ""), expects=expects, dur_f=df, kind=kind, **kw)
        C.append(c)
        return c

    def secs(a, b):
        return T.fr(resolve(b)) - T.fr(resolve(a))

    # ================= SHOT 1: THE SQUARE (hook + the count). See THE HARD RULE at the top of this file.
    ev("honk", "a0-3", "the clown's bulb horn: 'honk-honk' (0.27 s), the film's first sound, ~9 m from the lens, right of centre",
       "frame 0: the clown squeezes the bulb horn twice (two quick squeezes inside the first 8 frames)",
       one(lambda r: X.honk_honk(r), -0.008), -7, pe="honk_0", p=UNI_NEAR_PAN, send=0.1)
    ev("pop", "count-3", "'COUNT THE PHONES' pops in (a soft rising bloop + a wooden tick)", "Overlays.tsx: the count text scales in (T_IN = BEAT.count - 3)",
       one(lambda r: X.text_pop(r)), -17, pe="count_text", p=0.3, send=0.03)
    t_out = max(B["jobEnd"] + 14, B["count"] - 3 + 54)
    ev("chip", f"jobEnd+{t_out - B['jobEnd'] + 2}", "the chip 'PHONES: ?' pops in (tiny)", "Overlays.tsx: the chip scales in at T_OUT + 2",
       one(lambda r: G.pop(r, f0=760.0, up=True, dur=0.07) * 0.8), -25, pe="chip_in", p=0.3, send=0.02)
    ev("squeak", "unicycle2", "the clown pats the saddle and pops a tiny wheelie (a small rubbery tyre squeak)",
       "'owned a unicycle.': the clown pats the saddle / pops a tiny wheelie",
       one(lambda r: G3.rubber_squeak(r, True)), -25, pe="wheelie_1", p=0.3)
    ev("honk", "suitEnd-1", "ta-da: 'honk-honk' in the breath after 'And a clown suit.'",
       "'And a clown suit.': arms spread in a ta-da from BEAT.clownSuit; he squeezes the horn as 'suit.' ends",
       one(lambda r: X.honk_honk(r, d=(0.085, 0.11), gap=0.028, vary=0.2)), -11, pe="honk_suit", p=0.3, send=0.1)
    # the clock starts to spin at BEAT.soFor - 4, 3 f before the second duck of the count: its whirr comes in ON 'hour'
    # (a soft swell, no onset near the duck) and runs to the hand's landing
    ev("clock", "hour-2", "the facade clock spins through an hour (a fast, soft ratchet whirr swelling in on 'hour', the hand's tock as it lands)",
       "the clock on the library tower spins one hour (BEAT.soFor - 4 .. BEAT.sculptureEnd + 6); the whirr is heard from 'hour'",
       one(lambda r, d=secs("hour-2", "sculptureEnd+6"): X.clock_whirr(r, d)), -23, pe="clock_spin", dur="sculptureEnd+6", kind="long",
       p=0.2, lpf=4200.0, send=0.14)
    ev("chip", "five-2", "the chip flips to 'PHONES: 5' (a card flap)", "Overlays.tsx: the chip flips (BEAT.five - 2, 8 f)",
       one(lambda r: G.flap(r, True)), -19, pe="chip_flip", p=0.3, send=0.03)
    ev("ding", "five-2", "... and a ding ON 'Five.' (its ring dips under the word and blooms in the breath after it)",
       "Overlays.tsx: the chip turns green and shows 5",
       one(lambda r: G.ding(r, f0=2093.0, tau=0.4, sparkle=0.9)), -13, pe="five_ding", p=0.3, send=0.12, post=ring_cut(0.75, 0.15))
    ev("honk", "youSawEnd+1", "the clown waves at the lens: a quick 'honk-honk' in the breath before 'Easy.' (with the score's ta-da)",
       "'You saw him.': the clown looks at the lens and waves (horn hand squeezes as 'him.' ends)",
       one(lambda r: X.honk_honk(r, d=(0.06, 0.075), gap=0.02, vary=0.2, tight=0.9)), -13, pe="honk_wave_1", p=0.25, send=0.1)
    # the five phone-walkers of the count (cast_plan.ts WALKERS, kind "phone", read frame by frame from picture_plan.json):
    # a soft muffled murmur + steps as each one passes. Nothing here marks a duck.
    voices = {1: (165.0, 4.2), 2: (118.0, 3.9), 3: (215.0, 4.6), 4: (200.0, 4.3), 5: (135.0, 4.0)}
    s1b = S[1]["b"]
    for w in PL.walkers("phone"):
        if _P(f"phone_walker_{w['n']}", True, "cast_plan.ts WALKERS (picture_plan.json)") is None:
            continue
        k = w["on"] & (np.abs(w["sx"]) < 1.25) & (w["d"] < 26.0) & (w["tau"] >= 0) & (w["tau"] <= s1b + 4)
        if k.sum() < 30:
            continue
        f0, f1 = float(w["tau"][k][0]), float(w["tau"][k][-1])
        px = float(np.clip(0.55 * np.mean(w["sx"][k]), WALKER_PAN_MIN, 0.5))
        v = voices.get(w["n"], (170.0, 4.2))
        c = Cue(T.fr(f0), "murmur", f"phone-walker no. {w['n']} ({w['id']}) passes: a soft, muffled, wordless phone murmur + steps on brick",
                one(lambda r, w=w, f0=f0, f1=f1, v=v: walker_pass(r, w, f0, f1, v[0], v[1])),
                -28, p=px, pe=f"phone_walker_{w['n']}", key=f"cast_plan.ts WALKERS '{w['id']}' (in frame f {f0:.0f} .. {f1:.0f})",
                expects=f"phone-walker no. {w['n']} ({w['id']}) crosses the opening frame, phone at the ear, mouth moving",
                dur_f=f1 - f0, kind="long", send=0.05)
        C.append(c)

    # ================= SHOT 2: WHO DIDN'T? (the study corner)
    ev("board", "stopped-2", "the interviewer steps up: her pencil taps the clipboard once", "'The team stopped people leaving': an interviewer raises her clipboard to the pair",
       one(lambda r: G4.clipboard_tap(r)), -24, pe="clip_tap_2", p=-0.15, send=0.04)

    # ================= SHOT 3: THE TALLY (Overlays.tsx PAGES[0])
    ev("board", "pairs-10", "the clipboard page drops in (a soft board thup)", "Overlays.tsx: the PAIRS / MUSIC page slides in (BEAT.pairs - 10)",
       one(lambda r: _mono_sum(G4.paper_thup(r), _at(G4.clipboard_tap(r) * 0.5, 0.05))), -23, pe="page_3", p=0.2, send=0.03)
    for i in range(7):
        ev("tick", f"pairs+{3 * i}", f"PAIRS: pencil tick {i + 1} of 7", "Overlays.tsx: every(BEAT.pairs, 7, 3, true)",
           one(lambda r: X.pencil_tick(r)), -21 + 0.3 * i, pe=f"pairs_tick_{i + 1}", p=0.2, send=0.02)
    for i in range(3):
        ev("cross", f"pairs+{23 + 2 * i}", f"PAIRS: cross {i + 1} of 3", "Overlays.tsx: every(BEAT.pairs + 23, 3, 2, false)",
           one(lambda r, i=i: X.pencil_cross(r) if i == 0 else G.pen_scratch(r, 0.06, 14.0)), -21, pe=f"pairs_cross_{i + 1}", p=0.2, send=0.02)
    ev("laugh", "mostly+2", "the two friends laugh as they point back at the clown (far under the line)", "'mostly said yes.': the friends point back at the clown, laughing",
       one(lambda r: G2.laugh(r, voices=2, dur=0.8)), -30, pe="laugh_3", p=-0.1, lpf=3000.0)
    for i in range(6):
        ev("tick", f"soDid+{8 + 3 * i}", f"MUSIC: pencil tick {i + 1} of 6", "Overlays.tsx: every(BEAT.soDid + 8, 6, 3, true)",
           one(lambda r: X.pencil_tick(r)), -21 + 0.3 * i, pe=f"music_tick_{i + 1}", p=0.2, send=0.02)
    for i in range(4):
        ev("cross", f"music+{2 * i}", f"MUSIC: cross {i + 1} of 4", "Overlays.tsx: every(BEAT.music, 4, 2, false)",
           one(lambda r, i=i: X.pencil_cross(r) if i == 0 else G.pen_scratch(r, 0.06, 14.0)), -21, pe=f"music_cross_{i + 1}", p=0.2, send=0.02)
    try:
        import music as MU
        bl = MU.sync_points()["bl_light"]
    except Exception:  # noqa
        bl = 0.545
    ev("leak", "withMusic-2", "the music listener's big headphones leak a tinny beat (in the score's tempo)",
       "'So did people with music.': the music listener bops up, big headphones, nodding",
       one(lambda r, d=secs("withMusic-2", "musicEnd+2"): X.headphone_leak(r, d, bl)), -27, pe="headphones_3", dur="musicEnd+2", kind="long", p=-0.25, send=0.0)

    # ================= SHOT 4: INVISIBLE (we are inside her call: the clown rides alongside honking and she hears none of it)
    ev("murmur", "S4.a-4", "THE HERO on her call, close: her soft wordless murmur (it stops when she lowers the phone on 'spun')",
       "shots 4-5: the hero talks on the yellow phone (mouth moving) until she lowers it on 'Many spun around'",
       one(lambda r, d=secs("S4.a-4", "spun+2"): X.phone_murmur(r, d, base=215.0, rate=4.6, bright=1.15)), -25, pe="hero_call_4", dur="spun+2",
       kind="long", p=0.15, send=0.02)
    ev("honk", "oneGroup-2", "the outlined clown honks beside her: MUFFLED (how she hears it: she doesn't)",
       "'But to one group': the dotted-outline clown rides alongside, waving, squeezing the horn",
       one(lambda r: X.honk_one(r, 392.0, 0.12)), -19, pe="honk_muffled_4a", p=-0.25, send=0.0, post=lowpass_post(650.0, 4), wcarve=0)
    ev("honk", "theOnes-4", "... and again, 'honk-honk', still muffled", "'invisible.' -> 'The ones you counted': he honks twice more right beside her; she walks on",
       one(lambda r: X.honk_honk(r, vary=0.2)), -17, pe="honk_muffled_4b", p=-0.25, send=0.0, post=lowpass_post(650.0, 4), wcarve=0)

    # ================= SHOT 5: ONE IN FOUR (Overlays.tsx PAGES[1]) + the turn-around
    ev("board", "S5.a+1", "the 'ON A CALL' page is there on the hard cut (a board thup)", "Overlays.tsx: the ON A CALL page (S[4].a + 1) on the straight cut",
       one(lambda r: G4.paper_thup(r)), -22, pe="page_5", p=0.0, send=0.03)
    ev("tick", "one19-1", "ON A CALL: ONE tick, on '1'", "Overlays.tsx: tick at BEAT.one19 - 1", one(lambda r: G3.graphite_tick(r, 0.2)), -15,
       pe="call_tick", p=-0.15, send=0.03)
    for i, k_ in enumerate(("in19+1", "four", "saw19")):
        ev("cross", k_, f"ON A CALL: cross {i + 1} of 3, on its word", f"Overlays.tsx: cross at BEAT.{k_.replace('+', ' + ')}",
           one(lambda r: X.pencil_cross(r)), -14.5, pe=f"call_cross_{i + 1}", p=-0.05 + 0.1 * i, send=0.03)
    ev("boing", "spun-1", "she spins round: a soft comic 'boing'", "'Many spun around': the hero lowers the phone and spins round (a 14 f turn from BEAT.spun)",
       one(lambda r: G.boing(r, 210.0, 0.5, 0.4)), -16, pe="spin_5", p=0.0, send=0.08)
    ev("honk", "lookEnd-1", "... and sees him: the clown, solid again, waves and honks once", "'to look.': the clown two metres behind her waves; her jaw drops",
       one(lambda r: X.honk_one(r, 392.0, 0.15)), -11, pe="honk_seen_5", p=0.35, send=0.1)

    # ================= SHOT 6: THE REASON
    for i in range(2):
        ev("blip", f"eyes+{4 * i}", "a dotted sight-line draws from her eye to the path (a tiny blip)", "'Your eyes stay on the path.': two dotted sight-lines draw (BEAT.eyes, +4)",
           one(lambda r: G.pop(r, f0=1050.0 + 120 * i, up=False, dur=0.05) * 0.7), -26, pe=f"sightline_{i + 1}", p=-0.1 + 0.2 * i, send=0.02)
    ev("murmur", "S6.a-4", "the hero's call goes on (her body keeps walking)", "shot 6: the hero walks with the phone at her ear",
       one(lambda r, d=secs("S6.a-4", "S7.a+2"): X.phone_murmur(r, d, base=215.0, rate=4.6)), -27, pe="hero_call_6", dur="S7.a+2", kind="long", p=0.0, send=0.02)
    ev("mind", "mind-2", "her mind lifts out and slides down the phone line: a soft rising whoosh with a glassy shimmer",
       "'Your mind takes the call.': a see-through copy of her lifts out of her head (BEAT.mind) and slides into the call bubble",
       one(lambda r: _mono_sum(X.soft_whoosh(r, 0.6, 500.0, 2600.0, 0.4), _at(G.tiny_ting(r, 3800.0, 0.2) * 0.35, 0.3)), 0.0), -15, pe="mind_leaves_6",
       p=0.0, send=0.14)
    ev("bubble", "call22", "... and lands in the call bubble (a soft pop); the bubble's cosy chatter comes up, clearer than the square",
       "'call.': her mind arrives in the floating call bubble (the kitchen, her mum) and chats",
       one(lambda r, d=secs("call22", "S7.a+2"): _mono_sum(G.pop(r, f0=640.0, up=True, dur=0.1),
                                                           _at(bp(G.babble(d, r, 250.0, 1.0, rate=4.8, active=0.9, fmax=3200), 300.0, 2200.0, 2) * 0.5, 0.06))),
       -21, pe="bubble_6", dur="S7.a+2", kind="long", p=0.3, send=0.0)

    # ================= SHOT 7: THE MONEY (the first bill sounds of the film)
    ev("peg", "withMoney-3", "the professor clips the bill: a wooden clothes peg snaps shut (in the comma before 'with money')",
       "'tried again, with money.': the professor's hands clip the lowest bill with the peg; the peg closes 3 f before 'with'",
       one(lambda r: X.peg_click(r)), -13, pe="peg_clip_7", p=0.0, send=0.06)
    ev("bill_flutter", "withMoney-1", "the clipped bill swings on its peg: the FIRST paper flutter of the film", "the bill swings from the peg as he lets go",
       one(lambda r: G.paper_flutter(r, np.interp(np.arange(ns(0.7)) / SR, [0, 0.08, 0.35, 0.7], [0.2, 1.0, 0.5, 0.0]))), -19, pe="bill_swing_7", p=0.05)
    d_b = secs("three-16", "twoPeople")

    def _bills(r, d=d_b):
        t = np.arange(ns(d)) / SR
        a0, a1 = secs("three-16", "three-2"), secs("three-16", "onABranch")
        e = 0.3 + 0.12 * np.sin(2 * np.pi * 0.9 * t) + 0.1 * np.sin(2 * np.pi * 2.3 * t + 1.0)
        e += 0.45 * np.clip((t - a0) / 0.15, 0, 1) * np.clip((a1 + 0.3 - t) / 0.4, 0, 1)         # up on "Three dollar bills"
        e *= np.clip(t / 0.3, 0, 1) * np.clip((d - t) / max(0.5, secs("S9.a+20", "twoPeople")), 0, 1)   # away with the pull-back
        return G.paper_flutter(r, np.clip(e, 0, 1))
    ev("bills", "three-16", "three bills on their pegs flutter in the breeze (up on 'Three dollar bills', then low under the shot, away with the pull-back)",
       "from the pull to the branch angle (BEAT.three - 16): three bills sway on their pegs, close", one(_bills), -24, pe="bills_7", dur="twoPeople",
       kind="long", p=-0.05, send=0.03)
    for i, k_ in enumerate(_P("ducks_7", [float(B["nearly"]), float(B["everyone"]), float(B["ducked"])]) or []):
        C.append(Cue(T.fr(k_), "duck", f"walker {i + 1} dips under the branch: leaves brushed + a soft whoosh (the limbo rhythm)",
                     one(lambda r, i=i: _mono_sum(X.soft_whoosh(r, 0.32, 280.0, 1300.0 + 150 * i, 0.4) * 0.8, _at(X.leaf_brush(r, 0.26), 0.02)), 0.12),
                     -16, p=0.2 - 0.2 * i, pe=f"duck_7_{i + 1}", key=("nearly", "everyone", "ducked")[i] if i < 3 else "ducks_7",
                     expects="'Nearly everyone ducked.': walkers pass one after another, each head at its lowest on its word (nearly / everyone / ducked)",
                     send=0.06))
    ev("chime", "stoppedFor-1", "the one walker stops, delighted: a happy three-note 'ooh' chime", "'Few stopped for the cash.': a walker with no phone stops under the bills, delighted",
       one(lambda r: X.happy_chime(r)), -13, pe="stop_7", p=0.0, send=0.14, post=ring_cut(0.55, 0.14))
    ev("note", "cash-3", "she turns the little taped note to read it (a small paper rustle)", "'the cash.': she lifts the note taped to the middle bill and reads it",
       one(lambda r: G.paper_rustle(r, 0.3, 1.5)), -24, pe="note_7", p=0.0)
    ev("board", "onAPhoneQ-6", "the 'ON A CALL' page drops in (a soft board thup)", "Overlays.tsx: the ON A CALL page slides in (BEAT.onAPhoneQ - 6)",
       one(lambda r: _mono_sum(G4.paper_thup(r), _at(G4.clipboard_tap(r) * 0.5, 0.05))), -23, pe="page_7", p=0.0, send=0.03)
    ev("murmur", "onAPhoneQ-10", "phone-walkers pass under the branch, chatting (the muffled murmur again)", "'On a phone? 6 in 100.': phone-walkers duck under the bills and walk on, still chatting",
       one(lambda r, d=secs("onAPhoneQ-10", "they+4"): _mono_sum(X.phone_murmur(r, d, 150.0, 4.1), X.phone_murmur(r, d, 205.0, 4.5) * 0.8)), -27,
       pe="callers_7", dur="they+4", kind="long", p=0.1, send=0.03)
    for i, k_ in enumerate(_P("ducks_7b", [float(B["phoneQ"]), float(B["hundred"]) + 2]) or []):
        C.append(Cue(T.fr(k_), "duck", f"phone-walker {i + 1} dips under the bills without a glance: leaves + a soft whoosh",
                     one(lambda r, i=i: _mono_sum(X.soft_whoosh(r, 0.32, 280.0, 1250.0, 0.4) * 0.8, _at(X.leaf_brush(r, 0.26), 0.02)), 0.12),
                     -18, p=0.15 - 0.3 * i, pe=f"duck_7b_{i + 1}", key=("phoneQ", "hundred+2")[i] if i < 2 else "ducks_7b",
                     expects="'On a phone? 6 in 100.': two phone-walkers dip under the bills (lowest on 'phone?' and just after '100.' starts)", send=0.06))
    ev("scratch", "six-2", "'6 in 100' is pencilled in (a quick scratch)", "Overlays.tsx: the big '6 in 100' pops (BEAT.six - 2)",
       one(lambda r: G.scribble(r, letters=3, dur=0.42)), -14, pe="six_scratch", p=0.0, send=0.03)
    ev("wah", "sixEnd-2", "... and a flat little muted-trumpet 'wah' as '100.' ends", "(no action: the comic button on the number)",
       one(lambda r: X.flat_wah(r)), -13, pe="six_wah", p=-0.1, send=0.1)

    # ================= SHOT 8: THE DUCK (slow motion: everything is slower and lower)
    rate8 = 0.8
    ev("murmur", "S8.a-2", "the hero, slowed: her murmur drops in pitch (slow motion)", "shot 8, slow motion: the hero ducks under, still chatting, eyes straight ahead",
       one(lambda r, d=secs("S8.a-2", "S9.a+2"): X.slow(X.phone_murmur(r, d * rate8 + 0.1, base=215.0, rate=4.6), rate8)[: ns(d)]), -26, pe="hero_call_8",
       dur="S9.a+2", kind="long", p=0.0, send=0.03)
    ev("whoosh", "under29", "the bill brushes her ponytail: a deep, soft, slow whoosh (peak ON 'under')",
       "shot 8: she is exactly under the lowest bill on BEAT.under29 (hero8); the bill drags over her ponytail",
       one(lambda r: G.whoosh(1.25, r, peak=0.5, f_lo=85, f_hi=420, width=1.1, tail=0.42, air=0.03), 0.5), -13, pe="brush_8", p=0.0, send=0.12)
    ev("brush", "under29", "... and the paper dragging through her hair, slowed", "the bill's lower edge drags through the ponytail and springs back",
       one(lambda r: X.slow(G.paper_rustle(r, 0.4, 1.2), 0.55), 0.1), -19, pe="bill_hair_8", p=0.05, send=0.05, lpf=4500.0)

    # ================= SHOT 9: THE REVEAL + LOOP
    ev("glint", "S9.a+8", "the bills light up gold: a soft glint", "square_tree.ts reveal(): the gold outline + arrow come in over S9.a + 8 .. + 22",
       one(lambda r: G.ding(r, f0=1568.0, tau=0.35, sparkle=1.0)), -18, pe="reveal_on", p=-0.1, send=0.14, post=ring_cut(0.5, 0.14))
    d_sh = secs("S9.a+6", "counted31End-2")
    ev("shimmer", "S9.a+6", "THE REVEAL: a rising shimmer through the whole pull-back (the biggest sound of the film, under the voice); it arrives as "
       "the camera lands on the opening framing and clears for 'You saw the clown.'",
       "the pull-back from the branch to the OPENING framing (it lands ~BEAT.counted31End .. BEAT.youSawThe + 2); the bills pulse gold",
       one(lambda r, d=d_sh: shimmer(r, d)), -7.5, pe="reveal_shimmer", dur="counted31End-2", kind="long", p=0.0, send=0.16)
    for i, k_ in enumerate(("ducked31-1", "underIt+2")):
        ev("ghost_duck", k_, f"after-image {i + 1}: the duck replays (a ghostly leaf brush + a glassy ting)",
           "'Two people ducked under it': see-through after-images of the two phone-walkers replay their ducks (lowest on 'ducked' / just after 'under')",
           one(lambda r: _mono_sum(X.leaf_brush(r, 0.24) * 0.8, _at(G.tiny_ting(r, 3400.0, 0.18) * 0.5, 0.03)), 0.08), -20, pe=f"afterimage_{i + 1}",
           p=-0.15 + 0.1 * i, send=0.14)
    ev("honk", "counted31End+0.5", "he rides up and waves: a quick 'honk-honk' in the breath before 'You saw the clown.'",
       "'You saw the clown.': the clown, near the lens again, waves and squeezes the horn twice (as 'counted.' ends, ~5 f before 'You')",
       one(lambda r: X.honk_honk(r, d=(0.065, 0.08), gap=0.022, tight=0.9)), -11, pe="honk_wave_9", p=UNI_NEAR_PAN, send=0.1)

    # ================= pigeons (life: wing flutters in the breaths between sentences; none near a duck frame, none on the left)
    for k_, p_, sh in (("himEnd+1", 0.45, 1), ("unicycle2End+1", 0.5, 1), ("soWhoEnd+1", -0.2, 2), ("yesEnd+1", 0.3, 3), ("secondEnd+1", 0.4, 9)):
        ev("pigeon", k_, "a pigeon flutters up off the bricks", "(life: a pigeon hops / takes off somewhere on the right of the square)",
           one(lambda r: G2.wing_flaps(r, n_flaps=int(r.integers(4, 7)), rate=11.0, weight=0.5)), -27, pe=f"pigeon_{k_.split('+')[0]}", kind="life", p=p_, send=0.1,
           lpf=5000.0)
    return C


# ================================================================ THE HARD RULE check
def hard_rule(C):
    """every cue that sounds during shot 1, with its pan and its distance to the two duck frames; raises if one breaks
    the rule. Returns the rows for cues.md / the report."""
    b1 = T.SHOTS[1]["b"]
    rows, bad = [], []
    for c in sorted(C, key=lambda c: c.t):
        f0, f1 = c.frame, c.frame + c.dur_f
        if f0 >= b1:
            continue
        dist = min(abs(d - f0) for d in PL.DUCK_F)
        spans = [d for d in PL.DUCK_F if c.kind == "long" and f0 < d < f1]
        rows.append(dict(name=c.name, pe=c.pe, f0=f0, f1=f1, pan=c.p, kind=c.kind, dist=dist, spans=spans, level=c.level))
        if c.name in HARD_FORBIDDEN:
            bad.append(f"{c.pe}: a '{c.name}' sound in shot 1")
        if dist <= HARD_PAD_F:
            bad.append(f"{c.pe}: starts {dist:.0f} f from a duck frame")
        if c.p < HARD_PAN_MIN - 1e-6:
            bad.append(f"{c.pe}: pan {c.p:+.2f} is left of {HARD_PAN_MIN}")
        if spans and c.name != "murmur":          # only the walkers' own smooth pass-bys may run through a duck moment
            bad.append(f"{c.pe}: a long '{c.name}' cue runs across duck frame {spans}")
    if bad:
        raise SystemExit("THE HARD RULE is broken (shot 1 must not point at the money branch):\n  " + "\n  ".join(bad))
    return rows


# ================================================================ the bed: ONE loop-safe sunny campus square
# layer: level (LU vs the voice in the open square), then dB per shot on top (shots not listed = 0). Shot 9 glides from
# shot 8's values back to shot 1's as the camera pulls back (the square "opens up"), so the end equals frame 0.
BED_LAYERS = {
    "air": dict(level=-37.0, shots={7: 2.0, 8: 2.0}, desc="open-air tone: a soft low breath of moving air"),
    "leaves": dict(level=-31.5, shots={2: -3.0, 3: -3.0, 4: -1.0, 5: -3.0, 6: 1.0, 7: 4.0, 8: 4.0},
                   desc="fresh leaves in a light breeze (the tree is close in shots 6-8), swelling on the shared gust curve"),
    "birds": dict(level=-31.0, shots={7: 2.0, 8: 2.0}, desc="spring songbirds (robin phrases, a chickadee's fee-bee, finch warbles, sparrows), spread wide"),
    "steps": dict(level=-30.5, shots={2: -1.0, 3: -1.0, 4: -3.0, 6: -4.0, 7: -5.0, 8: -9.0},
                  desc="footsteps on brick: several walkers passing, each with its own shoe, pace and path"),
    "chatter": dict(level=-31.5, shots={2: 2.0, 3: 2.0, 4: -4.0, 5: 2.0, 6: -4.0, 7: -8.0, 8: -9.0},
                    desc="far student chatter, wordless (louder at the study corner, shut out behind the hedge)"),
    "fountain": dict(level=-36.0, shots={2: -6.0, 3: -6.0, 4: -3.0, 5: -6.0, 6: -3.0, 7: -12.0, 8: -12.0},
                     desc="the far fountain, soft, a little left (a steady wash, never an event)"),
}
BED_LEVEL = {k: v["level"] for k, v in BED_LAYERS.items()}
BED_DESC = {k: v["desc"] for k, v in BED_LAYERS.items()}
BED_LEVEL["unicycle"] = UNI_NEAR_DB
BED_DESC["unicycle"] = ("the unicycle: tyre on brick + a gentle pedal squeak on every wheel turn, level and pan following the clown "
                        f"(near {UNI_NEAR_DB:.0f} LU / far lap {UNI_FAR_DB:.0f} LU; see UNICYCLE_ENV at the top of sfx.py)")
BED_WIDTH = {7: 0.5, 8: 0.5}          # stereo width under the tree (the hedge shuts the square out); 1 elsewhere
BED_MUFFLE_HZ = 1100.0                # inside her call the square is dulled
BIRD_RATE = 0.42                      # phrases per second
FOUNTAIN_PAN = -0.3


def _place_wrap(buf, x, t):
    """add mono / stereo x into the loop buffer buf (2, N) at time t, wrapping round the end (a seamless loop)"""
    x = st(x) if np.ndim(x) == 1 else x
    i = ns(t) % N
    m = x.shape[1]
    a = min(m, N - i)
    buf[:, i:i + a] += x[:, :a]
    if m > a:
        r_ = min(m - a, N)
        buf[:, :r_] += x[:, a:a + r_]


def _fold(x):
    """x (2, N + L) -> (2, N) whose end runs into its start"""
    return G.loop_xfade(x, N, x.shape[1] - N)


def _lvl(x, db):
    L = integrated(x)
    return x * dbg(db - L) if np.isfinite(L) else x


def landing_f():
    """the frame the reveal's pull-back lands on the opening framing"""
    return float(_P("pullback_lands", T.BEAT["youSawThe"] + 2.0))


_W = {}


def _weights(t, pad_f=4):
    k = (len(t), pad_f)
    if k not in _W:
        _W[k] = T.shot_weights(t, pad_f)
    return _W[k]


def shot_curve(table, t, default=0.0, pad_f=4):
    """a per-shot value -> a per-sample curve: crossfaded over the picture dissolves; shot 9 glides from shot 8's value
    to shot 1's while the camera pulls back (S9.a .. landing_f())"""
    w = _weights(t, pad_f)
    f = np.asarray(t, float) * T.FPS
    s9 = T.SHOTS[T.LAST]
    u = _smoothstep((f - s9["a"]) / max(1.0, landing_f() - s9["a"]))
    out = np.zeros(len(t))
    for i, wi in w.items():
        v = table.get(i, default)
        if i == T.LAST:
            v8, v1 = table.get(i - 1, default), table.get(1, default)
            out += wi * (v8 + (v1 - v8) * u)
        else:
            out += wi * v
    return out


def unicycle_curves(t):
    """(nearness 0..1, level dB re the voice, pan, on 0..1) of the unicycle at times t"""
    f = np.asarray(t, float) * T.FPS
    fk = np.arange(0, T.TOTAL + 1, 2.0)
    if UNI_FOLLOW_PICTURE and PL.HAS_CLOWN:
        d = np.interp(f, fk, PL.clown_dist(fk))
        near = _smoothstep((UNI_FAR_M - d) / max(0.1, UNI_FAR_M - UNI_NEAR_M))
    else:
        xs = [resolve(a) if isinstance(a, str) else float(a) for a, _ in UNICYCLE_ENV]
        near = _smoothstep(np.interp(f, xs, [v for _, v in UNICYCLE_ENV]))
    if PL.HAS_CLOWN:
        cx, cz = PL.clown_xz(fk)
        sx = np.interp(f, fk, PL.screen_x(cx, cz))
        front = np.interp(f, fk, np.clip((cz - (-6.4)) / 2.3, -1, 1))        # +1 = across the front of the sculpture
    else:
        sx, front = np.full(len(f), 0.3), np.zeros(len(f))
    w = _weights(t, 4)
    far_db = np.zeros(len(t))
    lin = np.zeros(len(t))
    pan_far = np.zeros(len(t))
    s9 = T.SHOTS[T.LAST]
    u9 = _smoothstep((f - s9["a"] - 20) / max(1.0, landing_f() - s9["a"] - 20))
    for i, wi in w.items():
        v = UNI_SHOT_DB.get(i)
        on = 0.0 if v is None else 1.0
        if i == T.LAST:
            lin += wi * u9                                  # he comes in with the pull-back
        else:
            lin += wi * on
        far_db += wi * (v or 0.0)
        pan_far += wi * (np.clip(0.5 * sx, 0.0, 0.45) if i in (1, T.LAST) else UNI_SHOT_PAN.get(i, 0.0))
    if "around" in T.BEAT:                                  # shot 5: he is solid and two metres away after the turn-around
        far_db += 6.0 * np.clip((f - T.BEAT["around"]) / 8.0, 0, 1) * w[5]
    far_db += 1.5 * front * (w[1] + w[T.LAST])              # a touch louder across the front of the sculpture
    near = near * (w[1] + w[T.LAST])                        # the lens he rides up to is the opening lens (shots 1 and 9)
    db = UNI_FAR_DB + far_db + (UNI_NEAR_DB - UNI_FAR_DB - far_db) * near
    return near, db, pan_far + (np.clip(0.5 * sx, 0.1, UNI_NEAR_PAN + 0.1) - pan_far) * near, lin


def unicycle_signal(r):
    """the unicycle over the whole loop at unit level: the tyre's roll on the brick (from his real ground speed) and a
    gentle squeak pair on every wheel turn ('eek', and a softer 'ook' half a turn later), timed from the metres he has
    ridden over the picture's own wheel radius (plan.ts: spin = s / WHEEL_R), so the squeak turns with the pictured
    crank. Mono (N,), loop-safe: the wheel makes a whole number of turns over the loop."""
    L = ns(1.0)
    fs = np.arange(0, T.TOTAL + 31.0)
    tq = np.arange(N + L) / SR * T.FPS
    if PL.HAS_CLOWN:
        spd = np.interp(tq, fs, PL.clown_speed(fs))
        total, wheel = PL.ROUTE_LEN, PL.WHEEL_R
        dist = np.interp(np.arange(N) / SR * T.FPS, fs, PL.clown_metres(fs))
    else:
        spd = np.full(N + L, 2.0)
        total, wheel = 2.0 * T.DUR, UNI_WHEEL_R
        dist = 2.0 * np.arange(N) / SR
    roll = X.tyre_roll(spd, r)
    roll = G.loop_xfade(np.stack([roll, roll]), N, L)[0]
    turns = max(1, int(round(total / (2 * np.pi * wheel))))
    ph = dist / total * turns
    sq = np.zeros((2, N))
    for off, up, g in ((0.0, True, 1.0), (0.5, False, 0.6)):
        idx = np.flatnonzero(np.diff(np.floor(ph - off)) > 0)
        for i in idx:
            x = X.pedal_squeak(r, 1380.0 * r.uniform(0.96, 1.04) * (1.0 if up else 0.84), r.uniform(0.07, 0.1), up) * g * r.uniform(0.8, 1.0)
            _place_wrap(sq, x, i / SR)
    sq = sq[0]
    act = np.abs(sq) > 1e-4 * np.max(np.abs(sq))
    k = dbg(UNI_SQUEAK_DB) * np.sqrt(np.mean(roll ** 2)) / (np.sqrt(np.mean(sq[act] ** 2)) + 1e-12)   # vs the roll, while a squeak sounds
    return roll + sq * k, turns


def bed_layers(r):
    """the raw loop-safe layers of the square, each (2, N)"""
    L = ns(1.0)
    t = np.arange(N + L) / SR
    g = np.clip(T.gust(t % T.DUR), 0.1, 1.5)
    out = {}
    out["air"] = _fold(hp(X.air(N + L, r), 28, 2))
    out["leaves"] = _fold(X.leaves(N + L, r, g))
    ch = G.crowd_murmur(N + L, r, voices=7, lo=180.0, hi=1100.0, density=0.8)
    out["chatter"] = _fold(ch)
    fo = X.fountain(N + L, r)
    out["fountain"] = _fold(pan(fo, FOUNTAIN_PAN) * 0.8 + widen(fo, r, 13, 0.6) * 0.3)
    # birds: phrases at Poisson times, each at its own place and distance; none in the first 0.6 s (the honk) and none
    # within HARD_PAD_F frames of a duck frame of the count (THE HARD RULE), none left of HARD_PAN_MIN during shot 1
    birds = np.zeros((2, N))
    s1b = T.fr(T.SHOTS[1]["b"])
    tm = 0.7
    bird_log = []
    while tm < T.DUR - 0.2:
        x = X.bird(r)
        far = r.uniform(0.0, 1.0)
        x = lp(x, 9000.0 - 4500.0 * far, 1) * (1.0 - 0.6 * far)
        p_ = float(r.uniform(-0.7, 0.75))
        if tm < s1b + 1.0:
            p_ = max(p_, HARD_PAN_MIN + 0.05) if p_ < 0 else p_
        d_ = len(x) / SR
        clash = any(T.fr(df - HARD_PAD_F) - d_ <= tm <= T.fr(df + HARD_PAD_F) for df in PL.DUCK_F)
        if not clash:
            _place_wrap(birds, pan(x, p_), tm)
            bird_log.append((tm, d_, p_))
        tm += r.exponential(1.0 / BIRD_RATE) + 0.35
    out["birds"] = birds
    # steps: walkers passing (a new one every ~2.3 s), each a bell-shaped pass with its own shoe, pace and pan path
    steps = np.zeros((2, N))
    tm = r.uniform(0.0, 1.5)
    while tm < T.DUR:
        w = r.uniform(2.2, 3.6)
        n_ = ns(4.4 * w + 0.5)
        x = X.walk_by(n_, r, 2.2 * w, rate=r.uniform(1.7, 2.05), weight=r.uniform(0.6, 1.0), hard=r.uniform(0.25, 0.7), width=w)
        p0, p1 = r.uniform(-0.25, 0.6), r.uniform(-0.25, 0.6)
        _place_wrap(steps, _dyn_pan(x, np.linspace(p0, p1, n_)), (tm - 2.2 * w) % T.DUR)
        tm += r.uniform(1.6, 3.0)
    out["steps"] = steps
    return out, bird_log


BIRD_LOG = []


def render_beds(v_ref, seed=2010):
    """stereo bed stem (2, N) + per-layer report rows. One continuous, loop-safe square (the last sample runs into the
    first), the layers re-balanced per shot, dulled while we are inside her call, slowed in shot 8, and the unicycle."""
    global BIRD_LOG
    r = rng(seed)
    t = np.arange(N) / SR
    B = T.BEAT
    layers, BIRD_LOG = bed_layers(r)
    out = np.zeros((2, N))
    rows = []
    for k, cfg in BED_LAYERS.items():
        x = _lvl(layers[k], v_ref + cfg["level"])
        cv = shot_curve(cfg["shots"], t)
        out += x * dbg(cv)[None, :]
        rows.append((k, cfg["level"], [], cfg["desc"] + (" [per shot dB: " + ", ".join(f"{i}: {v:+.0f}" for i, v in sorted(cfg["shots"].items())) + "]"
                                                         if cfg["shots"] else "")))
    # width: narrow under the tree, opening with the pull-back
    wd = shot_curve(BED_WIDTH, t, default=1.0)
    mid, side = out.mean(0), 0.5 * (out[0] - out[1])
    out = np.stack([mid + wd * side, mid - wd * side])
    # inside her call (shot 4, and shot 6 once her mind has left) the square is dulled
    m = np.zeros(N)
    for t0, t1, depth in ((T.bt("but") - 0.13, T.fr(T.SHOTS[5]["a"]), 0.7), (T.bt("yourMind") - 0.07, T.bt("soThe") + 0.1, 0.6)):
        m = np.maximum(m, depth * np.clip(np.minimum((t - t0) / 0.25, (t1 - t) / 0.03), 0, 1))
    out = out * (1 - m)[None, :] + lp(out, BED_MUFFLE_HZ, 2) * dbg(-1.5) * m[None, :]
    # the unicycle
    uni, turns = unicycle_signal(r)
    near, db, pn, lin = unicycle_curves(t)
    L_u = integrated(st(uni))
    uni = uni * dbg(v_ref - L_u) * dbg(db) * lin
    hole = np.clip(np.minimum((T.bt("clown32End") + 0.02 + 0.03 - t) / 0.03, 1.0), 0, 1) + np.clip((t - (T.bt("didYou") - 0.012)) / 0.008, 0, 1)
    uni = uni * np.clip(hole, 0, 1)                           # the beat before "Did you see the money?": he holds too
    um = np.maximum(m, 0.0)                                   # inside her call the unicycle is dulled with the square
    uni_st = _dyn_pan(uni, pn)
    uni_st = uni_st * (1 - um)[None, :] + lp(uni_st, 700.0, 2) * um[None, :]
    out += uni_st
    rows.append(("unicycle", UNI_NEAR_DB, [], BED_DESC["unicycle"] + f"; {turns} wheel turns over the loop"))
    # shot 8: slow motion (the same tape slow-down as the score)
    try:
        import music as MU
        rate = MU.SLOW_RATE
    except Exception:  # noqa
        rate = 0.84
    out = X.tape_warp(out, T.bt("they") - 0.02, T.bt("thatBranch") - 0.03, rate)
    return hp(out, 28, 2), rows


# ================================================================ render
SPACES = {"out": dict(rt60=0.55, seed=77, pre=0.012, hf=1.9, early=[(0.06, 0.3, -0.5), (0.11, 0.2, 0.6)]),
          "room": dict(rt60=0.45, seed=78, pre=0.006, hf=1.4, early=[(0.011, 0.4, -0.3), (0.019, 0.3, 0.4)]),
          "hall": dict(rt60=1.1, seed=79, pre=0.015, hf=1.3, early=[(0.023, 0.35, 0.3), (0.041, 0.25, -0.4)])}


def write_used():
    D, SRC = picture_events()
    out = {"_doc": "frames (30 fps) every SFX used in the last mix.py run; copy a key into picture_events.json to override it "
                   "(a frame, a list of frames, a 'beat+n' expression, or null to drop the cue)",
           "_probes": picture_probes()[1]}
    for k, v in D.items():
        out[k] = {"value": v, "source": SRC[k]}
    with open(PE_USED, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)


def _render_set(C, v_ref, on_event=None):
    out = np.zeros((2, N))
    sends = {k: np.zeros(N) for k in SPACES}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        cur = momentary_max(x)
        if np.isfinite(cur):
            x = x * dbg(v_ref + c.level - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        if c.post:
            x = c.post(x)
        t0 = c.t - anchor
        measure_sync(c, x, t0)                   # before the word carve (the carve must not move the measured point)
        wc = c.wcarve if c.wcarve is not None else _WCARVE.get(c.name)
        if isinstance(wc, dict):
            x = carve_words(x, t0, wc.get("db", -6.0), wc.get("lo", 1000.0), wc.get("hi", 4000.0), broad_db=wc.get("broad", 0.0))
        elif wc:
            x = carve_words(x, t0, wc)
        c.measured = momentary_max(x) - v_ref
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(sends[c.space], c.send * x.mean(0), max(0.0, t0))
    for k, s in sends.items():
        if np.any(s):
            sp = SPACES[k]
            ir = make_ir(sp["rt60"], sp["seed"], pre=sp["pre"], hf=sp["hf"], early=sp["early"])
            out += 0.6 * convolve_st(s, ir)
    return hp(out, 30, 2)


def render_events(v_ref, on_event=None):
    C = cues()
    hard_rule(C)
    out = _render_set(C, v_ref, on_event)
    rows = sync_rows(C)
    json.dump({"_doc": "sync point of every cue as placed in the last render, frames after its picture frame (+ = late); "
                       f"picture-synced cues must stay within {SYNC_TOL[0]:+.0f} .. {SYNC_TOL[1]:+.0f} f", "rows": rows,
               "samples_played": SM.USED}, open(SYNC_REPORT, "w", encoding="utf-8"), indent=1)
    sync_check(rows)
    # the beat before "Did you see the money?": every event (and its reverb) is out, only the square's bed is left
    a, z = ns(T.bt("clown32End") + 0.02), ns(T.bt("didYou") - 0.012)
    if z > a:
        f = min(ns(0.03), z - a)
        out[:, a:a + f] *= np.linspace(1, 0, f)[None, :]
        out[:, a + f:z] = 0.0
    # no event crosses the loop point: the events stem is silent by the last 2 frames
    a, z = ns(T.DUR - 0.25), ns(T.DUR - 2 * FR)
    out[:, a:z] *= np.linspace(1, 0, z - a)[None, :] ** 2
    out[:, z:] = 0.0
    return out, C


def render(v_ref):
    ev, C = render_events(v_ref)
    beds, rows = render_beds(v_ref)
    return ev, beds, C, rows

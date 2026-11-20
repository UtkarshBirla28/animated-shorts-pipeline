# SOUND v2 (phase B): the effects of the REBUILT film "The Clown Nobody Saw" (script v6, 26 shots, 2117 f).
# The cue list is DATA-DRIVEN: the three animators keep one cue file each
#     studio/out/clown/anim_quiz/sound_cues.json, anim_story1/sound_cues.json, anim_story2/sound_cues.json
#     [{frame, name, what, pan, near, dur?, who?}]   (film frames)
# and this module reads them at mix time. MAP (below) turns each cue NAME into a real sound of the library (samples.py:
# CC0 recordings + ElevenLabs sound-effect generations), with take rotation across repeats. A name that MAP does not
# know is REPORTED (printed, in cue_report.json and in SOUND_EVENTS_V2.md), never silently dropped; so is every cue
# that was thinned, held back by the quiz rule, or left silent on purpose, each with its reason.
# On top of the animators' cues come the film's own moments, keyed to the timeline (never a literal frame): the chip
# and the ding on "Five.", the clock's hour, the five count pips of E1, the tape rewind / freeze / glint of E3.
#
# THE QUIZ HARD RULE (all of Q1, steps included): nothing may accent the two ducks of the count (EDIT_V2 section 5:
# DUCKS at 1/3 and 2/3 of the count window, film frames 133 and 209 on this voice). In Q1 there is no rustle, whoosh,
# chime, cloth, leaf or paper sound at all. Round each duck frame lies a WINDOW of +-HARD_PAD_F frames. THE LEAD'S RULE
# (2026-11-18): inside a window no sound may come from the DUCKER or from anyone else on the square (no cloth, no step,
# no rustle, no paper, no chime, no laugh, no murmur): such a sound never starts in a window, one that starts before it
# is cut so that it has ended before it (or is not sounded when there is no room), and that whole bus is gated to
# digital silence inside the window. The ONLY sounds allowed there are the clown's, the pigeons' and the dog's
# (WINDOW_OK), and only when they are panned at WINDOW_PAN_MIN (+0.10) or further RIGHT: they happen on the right of the
# frame, away from the money (upper-left), so they are fair misdirection AWAY from the bills. They keep their normal
# level (set by `near`, never boosted). Nothing in Q1 sits further left than HARD_PAN_MIN. hard_rule() stops the mix if
# any of this is broken; mix.py then measures the same thing in the rendered stems (the proof in SOUND_EVENTS_V2.md).
#
# The engine (sample playback, layered events, the SYNC-DIRECTION check: no cue more than 1 frame early or 2 late)
# is fix round 1's, imported from sfx_cut1.py; cut 1's own cue list in that file is not used.
import json
import os
import re
import sys
import numpy as np
from dsp import SR, ns, rng, dbg, lp, hp, bp, pan, st, place, fades, make_ir, convolve_st, integrated, momentary_max
import samples as SM
import sfx_gen as G
import instruments as I
import timeline as T
import sfx_cut1 as E

N = ns(T.DUR)
FPS = T.FPS
STUDIO_OUT = os.path.normpath(os.path.join(T.HERE, "..", "..", "..", "studio", "out", "clown"))
CUE_FILES = [("quiz", os.path.join(STUDIO_OUT, "anim_quiz", "sound_cues.json")),
             ("story1", os.path.join(STUDIO_OUT, "anim_story1", "sound_cues.json")),
             ("story2", os.path.join(STUDIO_OUT, "anim_story2", "sound_cues.json"))]
REPORT = os.path.join(T.HERE, "cue_report.json")
SK = {s["key"]: s for s in T.SHOTS.values()}                    # shot by key (Q1, S7, E3 ...)
B = T.BEAT

# ---------------------------------------------------------------- knobs
MAX_EVENTS = 150                   # the event budget. p4: 110 -> 150 (the final acting round added ~60 cues; the owner: keep everything p3 had). p3: 67 -> 110: the polish round added ~45 planned effects (D9) and the
#                                    audit asked for EVEN density (claps / foley back in S8-S9, S2's gags); S18 is thinned
#                                    by the animator (two steps per walker). Steps, loops and beds do not count
DENSITY_GAP_F = 4                  # two events closer than this: the lower priority one is held back (unless it may stack)
SFX_HP = 80.0                      # p3 (audit M5): 30 % of the effects stem was rumble under 90 Hz: a 12 dB/oct high-pass on the
LOW_OK = {"freeze_hit", "jaw_drop", "bill_brush_slow"}   # bus, except the freeze hit, the jaw-drop impact and the slow whoosh
STEP_HP = 120.0                    # p3: every footstep high-passed here (the soft / slow takes were thumps under 90 Hz)
FEATURED_STEP_DB = 9.0             # p3 (audit M5): the FEATURED walkers' steps (S1 phone guy, S14 dude, S15 hero, S16 Hyman) +9 dB (first run +6: still ~0 dB in their best band)
FEATURED_SHOTS = {"S1", "S14", "S15", "S16"}
SCUFF_DB = -7.0                    # p3: a heel-scuff layer (2-5 kHz, its own takes) under every step, this far under the step
HONK_SINGLE_F = 14                 # p3: a honk with another honk cue within this many frames is ONE squeeze (S1's four squeezes)
OPEN_HONK_DB = -6.0                # p3 (audit B1, FIX2 D11): the frame-0 honk-honk in the 0.34 s lead-in, a real readable honk
# p3 (audit M4): S1's gag ("he tries everything, the phone guy sees nothing") runs under the narration, whose word carve
# takes ~7.5 dB off a honk; the audit's targets are MEASURED levels (honks -16, the bell -15, the sad honk -13 LU)
SHOT_DB = {("honk", "S1"): 6.5, ("bell_ring", "S1"): 2.7, ("unicycle_brake", "S1"): 4.0,
           ("jaw_drop", "S5"): -5.0, ("sparkle", "S8"): -3.0}   # p4: the S8 twinkle sits on the friend's "The clown?"     # p4: Hyman's jaw drop in S5 sits on the word "suit.", 6 f after the score's hit
HONK_WORD_S = (0.12, 0.45)         # p3: a honk-honk whose second squeeze would land on the START of a word is one squeeze
HORN_NOTE = 69                     # the clown's horn motif: both squeezes on A, the score's dominant (D minor); takes rotate
PAN_SCALE = 0.85                   # the animators' pan (-1 .. 1) is narrowed a little (mono safety)
HARD_PAD_F = 6                     # Q1: the silent window is the duck frame +- this many frames (0.2 s each side)
ROOM_MIN_F = {"step": 4, "event": 8, "loop": 20, "roll": 8}   # Q1: least frames a sound needs before a window to be worth sounding
HARD_PAN_MIN = -0.20               # Q1: nothing further left than this
WINDOW_OK = {"honk", "clown_wobble", "clown_yelp", "pigeon_flush", "dog_yap", "bell_ring", "brake_skid",   # the clown, the pigeons, the dog
             "pigeon_scatter", "pigeon_land", "pigeon_leave", "tyre_land"}                                # (p3: the new pigeon / clown bits)
WINDOW_PAN_MIN = 0.10              # ... may sound inside a duck window when panned here or further right
REPLAY_DB = -3.0                   # a cue marked 'replay' (E2 shows Q3 again) sits a little under its first time
HARD_FORBIDDEN = {"rustle", "whoosh", "chime", "cloth", "leaf", "bill", "peg", "duck", "shimmer", "glint", "swish", "ding",
                  "ting", "sparkle", "ping"}   # p4: the hook wink's sparkle ting (f 30) is a chime too: not in Q1
MONEY_CLS = {"bill", "peg"}        # the money's own sounds: none before MONEY_FROM (the peg's snap in S17 is the film's first)
MONEY_FROM = "S16"
SLOW_LPF = 1700.0                  # S20: every event is slowed with the picture and low-passed here
STEP_NEAR_M, STEP_FAR_M = 3.0, 19.0     # a footstep's distance from the lens: near = 1 .. near = 0
PIP_NOTES = (86, 88, 89, 91, 93)   # E1's five count pips: D6 E6 F6 G6 A6 (rising in the score's key)
E3_WHIRR_DB = -19.0                # the VCR whirr under "Did you see the money?" (LU under the voice; the line stays on top)

# the 1-4 kHz band of a cue dips while the voice speaks (dB, or db / lo / hi / broad). Kept light: mix.py's margin check
# then dips the beds under any single word that still reads under 7 dB.
WCARVE = {"honk": dict(db=-5.0, lo=900.0, hi=4200.0, broad=-1.5), "vocal": dict(db=-6.0, lo=600.0, hi=4500.0, broad=-2.0),
          "murmur": dict(db=-7.0, lo=600.0, hi=4000.0, broad=-2.0), "bell": dict(db=-3.0, lo=1200.0, hi=3500.0),
          "whistle": dict(db=-8.0, lo=900.0, hi=3600.0, broad=-2.0), "ping": dict(db=-5.0, lo=1200.0, hi=4000.0),
          "sparkle": dict(db=-4.0, lo=1200.0, hi=4500.0), "clap": dict(db=-4.0, lo=900.0, hi=4000.0), "pop": -4.0,
          "pip": dict(db=-6.0, lo=900.0, hi=4000.0),
          "ding": dict(db=-4.0, lo=1200.0, hi=5000.0), "tape": dict(db=-6.0, lo=800.0, hi=4500.0, broad=-2.0),
          "animal": dict(db=-5.0, lo=800.0, hi=4500.0, broad=-1.5), "leak": -5.0, "roll": -4.0, "step": -2.0}
WCARVE_DEFAULT = -3.0


# ---------------------------------------------------------------- the picture's clock (all from timeline.json)
def shot_of(f):
    for s in T.SHOTS.values():
        if s["a"] <= f < s["b"]:
            return s
    return T.SHOTS[T.LAST] if f >= T.SHOTS[T.LAST]["a"] else T.SHOTS[1]


def _remap():
    return T._J.get("remap", {})


def duck_frames():
    """the two duck frames of the count: EDIT's contract (plan.ts DUCKS: cw(0.33), cw(0.69) of jobEnd .. howMany)"""
    a, z = B["jobEnd"], B["howMany"]
    return [int(round(a + u * (z - a))) for u in (0.33, 0.69)]


DUCK_F = duck_frames()


def q1_windows():
    return [(d - HARD_PAD_F, d + HARD_PAD_F) for d in DUCK_F]


def q1_room(f):
    """Q1: how many frames a sound starting at frame f may last before the next duck window (None = no window after it;
    -1 = it starts inside a window)"""
    for a, z in q1_windows():
        if a <= f <= z:
            return -1
        if f < a:
            return a - 1 - f
    return None


def slow_rate(key):
    """picture speed of a slowed shot (S20 ~0.45), 1.0 for the others"""
    for v in _remap().values():
        if v.get("key") == key and key not in ("E1", "E2", "E3"):
            t = np.array([x[1] for x in v["frames"]], float)
            return float(np.clip(np.median(np.diff(t)), 0.2, 1.0)) if len(t) > 4 else 1.0
    return 1.0


def e1_pops():
    """film frames where E1's gold number pops over each held phone person. p3: EDIT exports them (timeline.json
    e1.holds[k].pop; the audit's m1: the pips were 1 f early when read off the remap); the remap's slow runs are the fallback."""
    hl = (T._J.get("e1") or {}).get("holds") or []
    if len(hl) >= 5 and all("pop" in h for h in hl):
        return [int(h["pop"]) for h in hl]
    for v in _remap().values():
        if v.get("key") == "E1":
            t = np.array([x[1] for x in v["frames"]], float)
            slow = np.diff(t) < 0.6
            out, k = [], 0
            while k < len(slow):
                if slow[k]:
                    j = k
                    while j < len(slow) and slow[j]:
                        j += 1
                    if j - k >= 3:
                        out.append(int(v["a"]) + k)
                    k = j
                else:
                    k += 1
            return out
    return []


def e3_rewind():
    """E3's segments (remap.ts REW): dict(a, r1, hold, r2) in film frames, or None. p3: + ring_full (timeline.json e3:
    the gold ring is complete there, the glint lands on it)"""
    for v in _remap().values():
        if v.get("rewind"):
            rw = dict(v["rewind"])
            e3 = T._J.get("e3") or {}
            rw["ring_full"] = int(e3.get("ring_full", rw["a"] + rw["r1"] + 8))
            return rw
    return None


def money_q():
    """(start s, end s) of the last word "money?" (the acoustic word times): nothing but the score's swell may sound over it"""
    try:
        w = T.word("money", T.bt("didYou") - 0.1)
        return float(w["s"]), float(w["e"])
    except (KeyError, ValueError):
        return None


def mind_hush():
    """(start s, end s) of the breath before "Their bodies dodged it.": from the end of "...stopped for the money." to
    "Their" (p3: 0.5 s in the new voice; FIX2 D1). No effect or reverb tail sounds in it; the bed dips."""
    try:
        a = float(T.word("money", T.bt("stoppedFor") - 0.1)["e"])
        z = float(T.word("their", a)["s"])
        return (a + 0.02, z - 0.02) if z - a > 0.1 else None
    except (KeyError, ValueError):
        return None


def char_lines():
    """[(start s, end s, speaker)] of the CHARACTER lines (not the narrator)"""
    try:
        P = json.load(open(os.path.join(T.ROOT, "voice", "phrases.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [(float(p["s"]), float(p["e"]), p.get("speaker")) for p in P if p.get("speaker") not in (None, "N")]


CHAR = char_lines()


# ---------------------------------------------------------------- reading the animators' cue files
def load_cues():
    out, problems = [], []
    for src, p in CUE_FILES:
        try:
            rows = json.load(open(p, encoding="utf-8"))
        except (OSError, ValueError) as e:
            problems.append(f"{src}: cannot read {p} ({e})")
            continue
        for k, c in enumerate(rows):
            if not isinstance(c, dict) or "frame" not in c or "name" not in c:
                problems.append(f"{src}: entry {k} has no frame / name")
                continue
            c = dict(c)
            c["src"], c["n"], c["frame"] = src, k, float(c["frame"])
            c.setdefault("what", "")
            pk = re.search(r"peaks on f\s*(\d+)", c["what"]) if c["name"] == "whip_pan" else None
            if pk:                                  # p4: a whip-pan's whoosh is synced on its PEAK, on the cut frame
                c["frame"] = float(pk.group(1))
            out.append(c)
    out.sort(key=lambda c: (c["frame"], c["src"], c["n"]))
    return out, problems


def near_of(c):
    try:
        return float(c.get("near", 0.5))
    except (TypeError, ValueError):
        return 0.5


def pan_of(c):
    try:
        p = float(c.get("pan", 0.0))
    except (TypeError, ValueError):
        p = 0.0
    p = float(np.clip(p * PAN_SCALE, -PAN_SCALE, PAN_SCALE))
    if shot_of(c["frame"])["key"] == "Q1":
        p = max(p, HARD_PAN_MIN)
    return p


def end_frame(c):
    """where a long cue ends: its 'dur', a '(to f 513)' / '0..104' note in its text, else the end of its shot"""
    if c.get("dur") is not None:
        return c["frame"] + float(c["dur"])
    m = re.search(r"to f\s*(\d+)", c["what"]) or re.search(r"\b\d+\.\.(\d+)\b", c["what"])
    if m:
        return float(m.group(1))
    return float(shot_of(c["frame"])["b"])


def lvl(base, slope=12.0, ref=0.8, lo=-36.0, hi=-6.0):
    """level (LU under the voice) from the cue's 'near': base at near = ref, slope dB per unit of near"""
    return lambda c: float(np.clip(base + slope * (near_of(c) - ref), lo, hi))


def take_label(sound, i=0):
    tk = SM.takes(sound)
    return tk[int(i) % len(tk)][0] if tk else f"({sound}: no file)"


# ---------------------------------------------------------------- generators
def S(sound, i_off=0, **kw):
    """one real sound of the library; the take rotates with the cue's repeat number"""
    def f(c, k):
        return E.smp(sound, i=k + i_off, **kw), take_label(sound, k + i_off)
    return f


def LAY(*parts):
    """layers of one event: (sound, seconds after the first layer's sync point, dB, take offset, smp() options)"""
    def f(c, k):
        gens, labs = [], []
        for sound, off, db_, i_off, kw in parts:
            gens.append((E.smp(sound, i=k + i_off, **kw), off, db_))
            labs.append(take_label(sound, k + i_off))
        return E.mix_parts(*gens), " + ".join(labs)
    return f


def _honk_label(i):
    H = SM.horn_squeezes()
    cand = [(abs((HORN_NOTE - q["midi"] + 6) % 12 - 6), q["label"]) for q in H]
    ok = sorted([c for c in cand if c[0] <= 2.5], key=lambda c: c[0]) or sorted(cand, key=lambda c: c[0])[:1]
    return ok[int(i) % len(ok)][1] if ok else "(synth honk)"


def varied(gen, seed, semis=0.2, shorten=0.08):
    """p3 (audit m6: honks f 1129 / f 1352 correlated 1.00): every repeat a little different: +-`semis` semitones and up to
    `shorten` of its tail trimmed (faded), from a seed per cue"""
    def g():
        x, an = gen()
        r = rng(7700 + int(seed))
        x = SM.pitch(np.asarray(x, float), float(r.uniform(-semis, semis)))
        cut_ = int(len(x) * (1.0 - float(r.uniform(0.0, shorten))))
        x = fades(x[:max(cut_, ns(0.05))].copy(), 0.0, 0.025)
        return x, SM.onset(x)
    g.sync = "onset"
    return g


def B_honk(c, k):
    """the clown's horn: 'honk-honk' on A (one squeeze when he is far, in the E2 replay, or when another honk cue is
    within HONK_SINGLE_F frames: each visible squeeze gets its own single honk), squeezes from rotating takes"""
    if near_of(c) < 0.2 or c.get("replay") or c.get("single"):
        return (varied(E.honk_gen((HORN_NOTE,), i=3 * k + 1, single=True), c["frame"]),
                _honk_label(3 * k + 1) + " (one squeeze, tuned to A)")
    return (varied(E.honk_gen((HORN_NOTE, HORN_NOTE), i=3 * k, gap=0.04), c["frame"]),
            f"{_honk_label(3 * k)} + {_honk_label(3 * k + 1)} (two squeezes, tuned to A)")


def B_open_honk(c, k):
    """p3 (audit B1, FIX2 D11): THE FRAME-0 HONK, the hook and the loop's answer. The picture pumps the horn twice in the
    0.34 s lead-in before "Quick test." (GAG.honk0 on frame 0, GAG.honk0b ~f 5.6, honk rings on both): squeeze 1 on
    sample 0 (the longer, louder one), squeeze 2 on the second pump, both over before the first word (no word carve)."""
    q_on = T.fr(T.BEAT.get("quick", 10)) - 0.012                 # "Quick" starts here (the voice's lead-in is 0.34 s)
    f2 = float(c.get("second", 6.0))

    def g():
        a, b = SM.honk(HORN_NOTE, 0), SM.honk(HORN_NOTE, 1)
        if a is None or b is None:
            x = E.honk_gen((HORN_NOTE, HORN_NOTE), i=0, gap=0.04)()[0]
            return x, SM.onset(x)
        t2 = f2 / FPS
        x1 = a[0][max(0, ns(a[1]) - ns(0.002)):]                   # squeeze 1 starts ON sample 0 (its onset, 2 ms of air)
        x1 = fades(x1[: ns(min(len(x1) / SR, t2 - 0.012))].copy(), 0.001, 0.02)
        x2 = b[0][max(0, ns(b[1]) - ns(0.002)):]
        x2 = fades(x2[: max(ns(0.06), ns(q_on - t2))].copy(), 0.001, 0.03)
        y = np.zeros(ns(q_on) + 10)
        y[: len(x1)] += x1
        i2 = ns(t2)
        m = min(len(x2), len(y) - i2)
        y[i2:i2 + m] += 0.88 * x2[:m]
        return y, SM.onset(y)
    g.sync = "onset"
    return g, f"{_honk_label(0)} (frame 0) + {_honk_label(1)} (f {f2:.0f}), two squeezes tuned to A, over by the first word"


# ---------------------------------------------------------------- p3: the polish effects (synthesized where the library
# has no usable take; every one in the score's key, short, and measured in the mix)
def _env(n, att, tau):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(att, 1e-4)) * np.exp(-np.maximum(t - att, 0.0) / tau)


def pat_gen(k, bright=1.0):
    """a soft palm catch (a juggling ball landing in a hand): a short 350-2500 Hz noise slap + a tiny low knock"""
    def g():
        r = rng(8100 + k)
        n = ns(0.09)
        y = bp(r.standard_normal(n), 350.0 * bright, 2500.0 * bright, 2) * _env(n, 0.0012, 0.012)
        t = np.arange(n) / SR
        y = y / (np.max(np.abs(y)) + 1e-12) + 0.35 * np.sin(2 * np.pi * r.uniform(170, 220) * t) * _env(n, 0.001, 0.018)
        return fades(y, 0.0003, 0.02), 0.0012
    g.sync = "onset"
    return g


def juggle_gen(dur_s, every_f=8, k=0):
    """the juggle: a soft pat on every catch (one every `every_f` frames) over dur_s, a little uneven and varied"""
    def g():
        r = rng(8200 + k)
        n = ns(dur_s + 0.15)
        y = np.zeros(n)
        tm, j = 0.0, 0
        while tm < dur_s:
            x, _ = pat_gen(31 * k + j, bright=float(r.uniform(0.9, 1.15)))()
            G._place_mono(y, x * float(r.uniform(0.7, 1.0)), tm)
            tm += every_f / FPS * float(r.uniform(0.94, 1.06))
            j += 1
        return y, 0.0012
    g.sync = "anchor"
    return g


def twinkle_gen(k, notes=(93, 98, 100), gap=0.045, vel=0.42):
    """a sparkle: three quick high glockenspiel / celesta notes (in the score's key: A6 D7 E7) + a breath of air"""
    def g():
        r = rng(8300 + k)
        parts = []
        for j, m in enumerate(notes):
            x = (I.glock if j % 2 == 0 else I.celesta)(I.m2f(m), vel * float(r.uniform(0.85, 1.0)), r, 0.45)
            parts.append((x / (np.max(np.abs(x)) + 1e-12) * (1.0 - 0.15 * j), gap * j))
        n = ns(gap * len(notes) + 0.5)
        y = np.zeros(n)
        for x, t0 in parts:
            G._place_mono(y, x, t0)
        air = hp(r.standard_normal(n), 6500.0, 2) * _env(n, 0.01, 0.12) * 0.06
        return fades(y + air, 0.0005, 0.12), 0.0
    g.sync = "onset"
    return g


def ping_gen(k):
    """the light bulb's 'idea': a tiny switch click, then a bright ding (glockenspiel A6 + E7)"""
    def g():
        r = rng(8400 + k)
        got = SM.get("tick", 1)
        click = got[0] if got is not None else bp(r.standard_normal(ns(0.01)), 2000, 8000, 2)
        a = I.glock(I.m2f(93), 0.75, r, 0.9)
        b = I.glock(I.m2f(100), 0.5, r, 0.7)
        n = ns(1.0)
        y = np.zeros(n)
        G._place_mono(y, 0.35 * click / (np.max(np.abs(click)) + 1e-12), 0.0)
        G._place_mono(y, a / (np.max(np.abs(a)) + 1e-12), 0.035)
        G._place_mono(y, 0.6 * b / (np.max(np.abs(b)) + 1e-12), 0.037)
        return fades(y, 0.0003, 0.25), 0.0
    g.sync = "onset"
    return g


def qpop_gen(k, f0=520.0, f1=900.0, dur=0.12):
    """the '?' pop: a short rising 'bwoop?' (a sine glide with its 2nd harmonic)"""
    def g():
        n = ns(dur)
        u = np.linspace(0, 1, n)
        f = f0 * (f1 / f0) ** (u ** 1.3)
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * _env(n, 0.006, dur * 0.6)
        return fades(y, 0.002, 0.03), 0.004
    g.sync = "onset"
    return g


def xpop_gen(k):
    """the '!' pop: a small real pop + a quick bright blip"""
    def g():
        got = SM.get("pop", 2 + k, semis=3.0)
        p = got[0] if got is not None else np.zeros(ns(0.05))
        n = ns(0.06)
        t = np.arange(n) / SR
        blip = np.sin(2 * np.pi * 1480.0 * t) * _env(n, 0.002, 0.018)
        m = max(len(p), n + ns(0.012))
        y = np.zeros(m)
        y[: len(p)] += p / (np.max(np.abs(p)) + 1e-12)
        G._place_mono(y, 0.5 * blip, 0.012)
        return fades(y, 0.0003, 0.02), SM.onset(y)
    g.sync = "onset"
    return g


def whistle_gen(k, notes=(89, 86), lens=(0.2, 0.34)):
    """an innocent two-note whistle (F6 -> D6, a falling minor third in the score's key): near-pure tones with a scoop
    into each note, a slow vibrato and a little breath"""
    def g():
        r = rng(8500 + k)
        segs = []
        for m, L_ in zip(notes, lens):
            n = ns(L_)
            u = np.arange(n) / SR
            f = I.m2f(m) * (1 - 0.03 * np.exp(-u / 0.03)) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * u))
            ph = 2 * np.pi * np.cumsum(f) / SR
            env = np.minimum(1, u / 0.025) * np.minimum(1, (L_ - u) / 0.05)
            tone = np.sin(ph) * env
            br = bp(r.standard_normal(n), I.m2f(m) * 0.8, I.m2f(m) * 1.3, 2) * env * 0.05
            segs.append(tone + br)
        gap = ns(0.06)
        y = np.concatenate([segs[0], np.zeros(gap), segs[1]])
        return fades(y, 0.002, 0.03), 0.01
    g.sync = "onset"
    return g


def poof_gen(k):
    """a soft dust puff at a tyre (low-passed noise, 5 ms attack, 80 ms decay)"""
    def g():
        r = rng(8600 + k)
        n = ns(0.22)
        y = bp(r.standard_normal(n), 220.0, 1600.0, 2) * _env(n, 0.005, 0.08)
        return fades(y, 0.001, 0.05), 0.003
    g.sync = "onset"
    return g


def B_jogger(c, k):
    """a jogger running past right behind him: four quick hard-soled steps 0.3 s apart, swelling and fading, the pan
    gliding right to left"""
    def g():
        r = rng(8700 + k)
        n = ns(1.3)
        y = np.zeros(n)
        for j in range(4):
            got = SM.get("step_hard", 5 + 3 * j + k, semis=float(r.uniform(-0.5, 0.8)))
            if got is None:
                continue
            x = hp(got[0], STEP_HP, 2)
            G._place_mono(y, x / (np.max(np.abs(x)) + 1e-12) * np.sin(np.pi * (j + 0.5) / 4.0) ** 0.8, 0.3 * j)
        return y, SM.onset(y)
    g.sync = "onset"
    p0 = float(np.clip(pan_of(c) + 0.25, -PAN_SCALE, PAN_SCALE))
    return swept(g, p0, p0 - 0.6), "step_hard x 4 (a jogger passing, right to left)"


def B_give_up(c, k):
    """S15 'isn't there': he gives up: the '?' pop over his hat, then a sad little half honk (one low squeeze, cut short)"""
    def sad():
        x = E.honk_gen((62,), i=k + 2, single=True)()[0]
        x = SM.pitch(np.asarray(x, float), -1.0)
        x = fades(x[: ns(0.2)].copy(), 0.0, 0.08)
        return x, SM.onset(x)
    return E.mix_parts((qpop_gen(k, 600.0, 820.0), 0.0, -3.0), (sad, 0.12, 0.0)), "a '?' pop (synth) + one low horn squeeze cut short (D, -1 st)"


def B_land(c, k):
    """S19: she lands from her hop: two soft sneaker steps 60 ms apart"""
    return (E.mix_parts((E.smp("sneaker", 2 + k, hpf=STEP_HP, vary=0.5), 0.0, 0.0), (E.smp("sneaker", 4 + k, hpf=STEP_HP, vary=0.5), 0.06, -2.0)),
            f"{take_label('sneaker', 2 + k)} + {take_label('sneaker', 4 + k)}")


def B_laugh(c, k):
    w = c["what"].lower()
    if "clown" in w or "phone guy" in w:
        return E.smp("laugh_m", i=k), take_label("laugh_m", k)
    if "pair" in w or "far" in c["name"]:
        return E.smp("crowd_laugh", i=k), take_label("crowd_laugh", k)
    return E.smp("laugh_f", i=k), take_label("laugh_f", k)


def B_comic_hit(c, k):
    """S13's take: a small comic hit in the score's own colours (a woodblock 'tok' on a low pizzicato D + a soft thump)"""
    def g():
        r = rng(5100 + k)
        wb = I.woodblock(0.8, r, 880.0, 0.2)
        pz = I.bass_pizz(I.m2f(38), 0.8, r, 0.32)
        n = max(len(wb), len(pz))
        y = np.zeros(n)
        y[: len(wb)] += wb / (np.max(np.abs(wb)) + 1e-12) * 0.8
        y[: len(pz)] += pz / (np.max(np.abs(pz)) + 1e-12)
        got = SM.get("impact", k)
        if got is not None:
            x = lp(got[0], 900.0, 2)
            m = min(n, len(x))
            y[:m] += 0.6 * x[:m] / (np.max(np.abs(x)) + 1e-12)
        bo = SM.get("boing", 1 + k, semis=2.0)            # p3 (audit m7: faint, its body at 125 Hz): a comic boing in 1-3 kHz on top
        if bo is not None:
            x = bo[0][max(0, ns(bo[1]) - ns(0.002)):]
            y = np.concatenate([y, np.zeros(max(0, len(x) - len(y)))])
            y[: len(x)] += 0.55 * x / (np.max(np.abs(x)) + 1e-12)
        return fades(y, 0.0003, 0.05), SM.onset(y)
    g.sync = "onset"
    return g, f"woodblock + bass pizzicato D2 (own instruments) + {take_label('impact', k)} + {take_label('boing', 1 + k)}"


def loop_gen(sound, dur_s, i=0, band=None, lpf=None, hpf=None, fin=0.25, fout=0.3, squeaks=None):
    """a continuous sound dur_s long from the whole takes of `sound` (crossfaded end to end, starting at take i), faded
    in / out; band = (lo, hi) band-pass (the wordless phone murmur); squeaks = [(seconds, gain)] pedal squeaks laid in"""
    def g():
        tk = SM.takes(sound)
        n = max(ns(dur_s), ns(0.3))
        if not tk:
            raise SystemExit(f"loop '{sound}' has no file")
        X_ = ns(0.35)
        y = np.zeros(n + X_)
        pos, k = 0, int(i)
        while pos < n:
            label, x = tk[k % len(tk)]
            x = x[ns(0.05):].copy()
            if len(x) < 3 * X_:
                x = np.tile(x, int(np.ceil(3 * X_ / len(x))) + 1)
            x[:X_] *= np.sin(0.5 * np.pi * np.linspace(0, 1, X_))
            x[-X_:] *= np.cos(0.5 * np.pi * np.linspace(0, 1, X_))
            m = min(len(x), n + X_ - pos)
            y[pos:pos + m] += x[:m]
            SM.USED[label] = SM.USED.get(label, 0) + 1
            pos += len(x) - X_
            k += 1
        y = y[:n]
        if band:
            y = bp(y, band[0], band[1], 2)
        if lpf:
            y = lp(y, lpf, 2)
        if hpf:
            y = hp(y, hpf, 2)
        y = fades(y, min(fin, dur_s / 3), min(fout, dur_s / 3))
        if squeaks:
            ref = np.sqrt(np.mean(y ** 2)) + 1e-12
            for j, (ts, gq) in enumerate(squeaks):
                got = SM.get("squeak", j, semis=float(rng(900 + j).uniform(-0.6, 0.6)))
                if got is None:
                    continue
                x, on, _ = got
                x = x / (np.sqrt(np.mean(x ** 2)) + 1e-12) * ref * 2.2 * gq
                G._place_mono(y, x, ts - on)
        return y, 0.0
    g.sync = "anchor"
    return g


def cut(gen, seconds, fade=0.03):
    """the sound cut to `seconds` (faded): Q1 sounds end before the next duck window"""
    def g():
        x, an = gen()
        x = np.asarray(x, float)
        n = max(ns(seconds), ns(0.02))
        if x.shape[-1] > n:
            x = x[..., :n].copy()
            k = min(ns(fade), n)
            x[..., -k:] *= np.linspace(1, 0, k)
        return x, an
    g.sync = getattr(gen, "sync", None)
    return g


def cut_at(seconds, fade=0.02):
    """post (on the placed sound): silent from `seconds` after its first sample, with a `fade` before that (E3: over
    before "money?")"""
    def f(x):
        x = np.array(x, float)
        n = max(ns(max(seconds, 0.0)), ns(0.01))
        if x.shape[-1] > n:
            k = min(ns(fade), n)
            x[..., n - k:n] *= np.linspace(1, 0, k)
            x[..., n:] = 0.0
        return x
    return f


def clap_gen(k):
    """a light hand clap (synthesized: a 1-3 kHz noise burst with three micro-onsets)"""
    def g():
        r = rng(6100 + k)
        n = ns(0.16)
        t = np.arange(n) / SR
        e = sum(a * np.exp(-np.maximum(t - t0, 0) / tau) * (t >= t0) for a, t0, tau in ((0.5, 0.0, 0.004), (0.7, 0.007, 0.005), (1.0, 0.014, 0.03)))
        y = bp(r.standard_normal(n), r.uniform(900, 1200), r.uniform(2800, 3600), 2) * e
        return fades(y, 0.0003, 0.03), 0.014
    g.sync = "onset"
    return g


def B_sad_honk(c, k):
    """S1: the clown gives up: the tyre scuffs to a stop + ONE low, sad squeeze of the horn"""
    return (E.mix_parts((E.smp("skid", 1, max_len=0.35), 0.0, -3.0), (E.honk_gen((62,), i=k, single=True), 0.3, 0.0)),
            f"{take_label('skid', 1)} + one low horn squeeze tuned to D")


def B_bike(c, k):
    """a cyclist passing: the freewheel's fast tick (a real click take, 14 a second) swelling and fading"""
    def g():
        tk = SM.takes("tick")
        _, x = tk[4 % len(tk)]
        n = ns(1.1)
        y = np.zeros(n)
        tm = 0.0
        while tm < 1.0:
            G._place_mono(y, x * np.sin(np.pi * tm / 1.0) ** 1.5, tm)
            tm += 1 / 14.0
        return lp(y, 5000.0, 2), 0.5
    g.sync = "anchor"
    return g, f"{take_label('tick', 4)} x 14 / s (a freewheel)"


def resync(gen, post=None):
    """apply `post` inside the generator and take the sync point again on the FINAL sound (slowed, filtered, cut), so the
    engine lands what is heard on the picture frame (a layered event keeps its first layer's own point)"""
    mode = getattr(gen, "sync", None)

    def g():
        x, an = gen()
        x = np.asarray(x, float)
        if post:
            x = post(x)
        if mode in ("onset", "peak"):
            m = x.mean(0) if x.ndim == 2 else x
            an = SM.peak_t(m) if mode == "peak" else SM.onset(m)
        return x, an
    g.sync = mode
    return g


def swept(gen, p0, p1):
    """a mono generator -> stereo with the pan gliding from p0 to p1 over its length"""
    def g():
        x, an = gen()
        x = np.asarray(x, float)
        return E._dyn_pan(x, np.linspace(p0, p1, len(x))), an
    g.sync = getattr(gen, "sync", None)
    return g


def slowed(gen, rate, lpf_hz):
    """S20: the event at the picture's speed (lower and longer) and low-passed"""
    def g():
        x, an = gen()
        x = SM.pitch(np.asarray(x, float), 12.0 * np.log2(rate))
        return lp(x, lpf_hz, 2), an / rate
    g.sync = getattr(gen, "sync", None)
    return g


def whirr_gen(f0, f1, rates, take=0, to_end=False):
    """the VCR's rewind whirr from film frame f0 to f1: a real tape-rewind take read at a changing speed (rates = the
    speed at the start, middle and end: the picture's rewind eases), 12 ms in; with to_end it runs to the LAST SAMPLE of
    the film and stops there (3 ms)"""
    def g():
        tk = SM.takes("tape_rewind")
        if not tk:
            raise SystemExit("no tape_rewind take")
        label, x = tk[take % len(tk)]
        n = (N - ns(T.fr(f0))) if to_end else ns(T.fr(f1) - T.fr(f0))
        u = np.linspace(0, 1, n)
        rate = np.interp(u, [0.0, 0.5, 1.0], rates)
        pos = ns(0.25) + np.cumsum(rate)
        pos = pos % (len(x) - ns(0.3))
        y = np.interp(pos, np.arange(len(x)), x)
        y = fades(y, 0.012, 0.003 if to_end else 0.02)
        SM.USED[label] = SM.USED.get(label, 0) + 1
        return y, 0.0
    g.sync = "onset"
    return g


def pip_gen(k):
    """one count pip of E1: a glockenspiel note of the rising line + a small real pop under it"""
    def bell():
        r = rng(4300 + k)
        x = I.glock(I.m2f(PIP_NOTES[k % len(PIP_NOTES)]), 0.7, r, 0.5)
        return x, SM.onset(x)
    return E.mix_parts((bell, 0.0, 0.0), (E.smp("pop", 1, semis=float((0, 2, 3, 5, 7)[k % 5])), 0.0, -4.0))


# ---------------------------------------------------------------- THE TABLE: cue name -> sound
def R(kind="event", **kw):
    d = dict(kind=kind, cls="foley", prio=4, gap=0, cap=None, min_near=0.0, send=0.06, stack=False, slow=True)
    d.update(kw)
    return d


MAP = {
    # ---- the clown
    "honk": R(cls="honk", prio=6, gap=6, cap=4, cap_far=1, level=lvl(-10.0, 13.0, 0.8, -21.0, -8.5), build=B_honk, send=0.10,
              sound="the bulb horn"),
    # p3 (audit M4): the bell was buried (-27.7 LU): -15 LU, its 3.5-7 kHz kept (a lighter carve, WCARVE['bell'])
    "bell_ring": R(cls="bell", prio=7, level=lvl(-12.5, 6.0, 0.8), build=S("hand_bell"), send=0.10, sound="a small brass hand bell"),
    "wheel_squeak": R(kind="roll"),
    "unicycle_wheel_loop": R(kind="loop", cls="roll", level=lvl(-31.0, 10.0, 0.5), loop=("tyre_roll", dict(lpf=6000.0)), sound="the tyre rolling on brick"),
    "unicycle_roll": R(kind="loop", cls="roll", level=lvl(-28.0, 10.0, 0.5), loop=("tyre_roll", dict(lpf=2600.0)), sound="the tyre rolling in on floorboards"),
    "unicycle_rock": R(cls="squeak", prio=5, level=lvl(-24.0, 10.0, 0.5), build=S("squeak", 2, vary=0.5), sound="a saddle squeak"),
    "brake_skid": R(cls="skid", prio=6, level=lvl(-14.0), build=LAY(("skid", 0.0, 0.0, 0, {}), ("squeak", 0.13, -8.0, 4, {})),
                    sound="a tyre skid + the saddle's creak"),
    "clown_wobble": R(cls="gag", prio=5, level=lvl(-17.0), send=0.08,
                      build=LAY(("skid", 0.0, -2.0, 1, dict(max_len=0.4)), ("yelp", 1 / 30.0, 0.0, 0, {}), ("laugh_m", 22 / 30.0, -3.0, 0, {})),
                      sound="wheel scuff, a yelp, a relieved laugh"),
    "clown_yelp": R(cls="vocal", prio=4, level=lvl(-17.0), build=S("yelp", 1), sound="a startled yelp"),
    # ---- voices without words
    "laugh": R(cls="vocal", prio=3, gap=30, cap=1, level=lvl(-20.0, 10.0), build=B_laugh, sound="a short laugh"),
    "laugh_far": R(cls="vocal", prio=1, level=lvl(-24.0, 10.0), build=B_laugh, sound="a far laugh"),
    "sigh": R(cls="vocal", prio=4, stack=True, level=-23.0, build=S("man_sigh"), sound="a man's sigh"),
    "brows_up": R(cls="vocal", prio=3, level=-23.0, build=S("hm_f"), sound="a soft 'hm'"),
    "double_take": R(cls="vocal", prio=5, level=-20.0, build=S("gasp_f"), sound="a small gasp"),
    "bubble_laugh": R(cls="vocal", prio=4, gap=30, level=-25.0, build=S("laugh_f", 1), post=lambda x: bp(x, 400.0, 2400.0, 2),
                      sound="a tiny muffled laugh (phone-speaker band)"),
    "phone_chatter_bed": R(kind="loop", cls="murmur", min_near=0.3, level=lvl(-29.0, 10.0, 0.6), loop=("murmur", dict(band=(250.0, 1500.0))),
                           sound="one side of a phone call, muffled and wordless"),
    # ---- animals
    # p3 (audit M5): the three old pigeon takes were sub-bass thumps: new bright wing-clap takes (pigeon_b), about -18 LU
    "pigeon_flush": R(cls="pigeon", prio=2, prio_near=5, gap=24, cap=1, cap_exempt_near=0.8, min_near=0.2, level=lvl(-18.0, 8.0, 0.5, -30.0, -14.0),
                      build=S("pigeon_b", vary=0.7), sound="a pigeon's burst of bright wing claps"),
    "pigeon_scatter": R(cls="pigeon", prio=5, gap=20, level=lvl(-19.0, 8.0, 0.5, -30.0, -17.0), build=S("pigeon_b", 1, vary=0.6),
                        sound="pigeons scattering low: a flurry of wing claps"),
    "pigeon_land": R(cls="pigeon", prio=4, level=-25.0, sound="a pigeon landing on his hat: a short flutter, then two tiny pecks",
                     build=LAY(("pigeon_b", 0.0, 0.0, 2, dict(max_len=0.3, fade=(0.03, 0.15))), ("tick", 10 / 30.0, -9.0, 0, {}),
                               ("tick", 17 / 30.0, -11.0, 3, {}))),
    "pigeon_leave": R(cls="pigeon", prio=3, level=-27.0, build=S("pigeon_b", 0, max_len=0.3, fade=(0.02, 0.15), semis=1.0),
                      sound="the pigeon flutters off his hat"),
    "pigeon_scurry": R(kind="silent", why="far and quiet (tiny claws on brick, near 0.30): it is in the bed"),
    "dog_paws": R(cls="animal", prio=4, level=lvl(-21.0, 10.0, 1.0), sweep=True, build=None, sound="a small dog's claws on brick"),
    "dog_yap": R(cls="animal", prio=5, level=lvl(-17.5, 10.0, 1.0), build=S("dog_yap"), sound="two happy yaps"),
    "dog_bark_far": R(cls="animal", prio=2, level=-31.0, build=S("dog_yap", 1, lpf=2500.0, max_len=0.35), sound="one far, quiet bark"),
    # ---- feet (one track per walker, a recorded step on every listed frame). p3: the soft / slow takes were thumps under
    # 90 Hz (gone after the high-pass): crisp sneaker takes for soft soles, the hard takes for leather; a heel-scuff layer
    "footstep": R(kind="step"), "footstep_bop": R(kind="step", shoe="sneaker"), "footstep_phone": R(kind="step", shoe="sneaker"),
    "tiptoe_step": R(kind="step", shoe="sneaker", step_db=-2.0),
    # ---- the office
    "marker_tap": R(cls="tap", prio=4, level=-22.0, build=S("page_land", semis=4.0, vary=0.8), sound="a finger tap on the whiteboard"),
    "door_latch": R(cls="door", prio=6, level=-19.0, build=S("door_open"), send=0.10, sound="the door: latch click, then the swing's soft creak"),
    "door_swing": R(kind="merged", why="inside door_latch's take (the latch, then the creak of the swing)"),
    "door_stop": R(cls="knock", prio=2, level=-23.0, build=S("page_land", semis=-3.0), sound="the door bumps its stop"),
    "garment_rustle": R(cls="cloth", prio=4, level=-21.0, build=S("bag_rustle"), sound="the garment bag's crinkle"),
    "zip_rip": R(cls="zip", prio=5, stack=True, level=-18.0, build=S("zip"), sound="the zip ripped open"),
    # ---- p3: the office gags (S2-S5) and the reveal's effects kit (D9)
    "marker_jab": R(cls="swish", prio=2, level=-27.0, build=S("whoosh_body", 0, max_len=0.25, sync="peak"), sound="a small air whoosh of the marker"),
    "paper_rustle": R(cls="paper", prio=3, level=-25.0, build=S("page_slide", 1), sound="a note pulled out of a pocket"),
    "paper_crumple": R(cls="paper", prio=5, level=-21.0, build=S("paper_crumple"), sound="the note crumpled in his fist"),
    "paper_throw": R(cls="swish", prio=3, level=-26.0, build=S("whoosh_body", 5, max_len=0.3, sync="peak"), sound="a light whoosh of the lob"),
    "paper_hit": R(cls="knock", prio=5, level=-21.0, build=S("page_land", semis=5.0), sound="the paper ball's soft tock on the whiteboard"),
    "paper_flutter": R(kind="loop", cls="paper", level=-32.0, loop=("bills_bed", dict(lpf=7000.0, hpf=600.0)),
                       sound="a few sheets fluttering down off the pin board"),
    "sparkle": R(cls="sparkle", prio=4, stack=True, level=-24.0, build=lambda c, k: (twinkle_gen(k), "glockenspiel + celesta A6 D7 E7 (own instruments)"),
                 sound="a sparkle twinkle"),
    "flash_snap": R(kind="merged", why="carried by the score's comic hit, which now lands on this frame (FIX2 D11: the hit on the bag opening)"),
    "confetti_pop": R(cls="confetti", prio=6, stack=True, level=-20.0, build=S("confetti"), sound="a confetti popper: a pop and a papery shower"),
    "suit_spring": R(cls="boing", prio=6, stack=True, level=-21.0, build=S("boing", 0), sound="the suit springs out: a comic boing"),
    "nose_pop": R(kind="merged", why="inside the confetti burst and the sparkle (it would be the fifth effect in 6 frames under the student's 'clown')"),
    "bulb_ping": R(cls="ping", prio=7, stack=True, level=-19.0, build=lambda c, k: (ping_gen(k), "a switch click + glockenspiel A6 / E7 (own instrument)"),
                   sound="the light bulb's 'idea' ping"),
    "hop_land": R(cls="knock", prio=3, level=-25.0, build=S("page_land", semis=-4.0, lpf=3000.0), sound="his little hop lands (a soft knock)"),
    "garment_fling": R(cls="whoosh", prio=7, level=-14.5, build=LAY(("whoosh_body", 0.0, 0.0, 1, dict(sync="peak")), ("bag_rustle", 0.02, -6.0, 1, {})),
                       sound="the bag flung open: a body whoosh + crinkle"),
    "hands_rub": R(cls="rub", prio=1, level=-28.0, build=S("bill_hair", max_len=0.7, lpf=3000.0), sound="a dry rub"),
    # ---- the study corner
    "pencil_scribble": R(cls="pencil", prio=3, gap=20, cap=2, level=lvl(-25.0, 10.0),
                         build=LAY(("pencil_cross", 0.0, 0.0, 0, {}), ("pencil_cross", 0.09, -1.0, 1, {}), ("pencil_cross", 0.2, -2.0, 2, {})),
                         sound="pencil strokes on the clipboard"),
    "pencil_tick": R(cls="pencil", prio=6, level=lvl(-17.0, 10.0, 0.9), build=S("pencil_one"), sound="one pencil check mark"),
    "pencil_cross": R(cls="pencil", prio=6, level=lvl(-17.5, 10.0, 0.9),
                      build=lambda c, k: (E.mix_parts((E.smp("pencil_cross", 2 * k), 0.0, 0.0), (E.smp("pencil_cross", 2 * k + 1), 0.085, -1.0)),
                                          f"{take_label('pencil_cross', 2 * k)} + {take_label('pencil_cross', 2 * k + 1)}"),
                      sound="the two strokes of a pencil cross"),
    "headphone_off": R(kind="loop", cls="leak", level=-29.0, loop=("headphones", dict(hpf=1500.0)), sound="tinny music leaking from the lifted headphone cup"),
    "headphone_music": R(kind="loop", cls="leak", level=-31.0, loop=("headphones", dict(hpf=1500.0)), sound="tinny music leaking from his headphones (the floating notes)"),
    "tap_cup": R(cls="tap", prio=4, level=-24.0, build=LAY(("tick", 0.0, 0.0, 3, {}), ("tick", 0.14, -3.0, 4, {})), sound="two taps on the headphone cup"),
    # p3 (audit m7: faint, its body at 125 Hz): a brighter chop whoosh layered in
    "spin_whoosh": R(cls="whoosh", prio=6, level=-17.0, build=LAY(("spin_scuff", 0.0, 0.0, 0, {}), ("whoosh_body", 0.05, -4.0, 3, dict(sync="peak")),
                                                                    ("whoosh_body", 0.03, -6.0, 0, dict(sync="peak", max_len=0.3))),
                     sound="a shoe scuff + a short body whoosh + a bright chop"),
    "jaw_drop": R(cls="hit", prio=6, level=-15.0, build=B_comic_hit, sound="a small comic hit"),
    "stop": R(cls="scuff", prio=5, level=-19.0, build=S("spin_scuff", 1, max_len=0.35), sound="a shoe scuff"),
    # ---- the mind and the call
    "mind_lift": R(cls="whoosh", prio=7, level=-17.0, build=S("whoosh_mind", fade=(0.05, 0.3), max_len=1.3), send=0.12, sound="a soft rising sweep"),
    "bubble_pop": R(cls="pop", prio=7, level=-17.0, build=LAY(("mouth_pop", 0.0, 0.0, 0, {}), ("plop", 0.0, -4.0, 0, {})),
                    after_loop=dict(sound="murmur_f", level=-33.0, band=(400.0, 2000.0), what="tiny muffled chatter inside the call bubble"),
                    sound="a warm pop"),
    # ---- the money (nothing of this before S16)
    "peg_squeeze": R(cls="creak", prio=4, level=-27.0, build=S("squeak", 5, semis=-5.0, lpf=3500.0), sound="a small wooden creak"),
    "peg_snap": R(cls="peg", prio=8, level=-12.5, build=S("peg"), sound="the wooden peg snapping shut"),
    "bill_flutter": R(cls="bill", prio=5, gap=12, stack=True, level=lvl(-18.0, 10.0, 0.9), build=S("bill_flick", vary=0.6), sound="a paper bill's flick"),
    "bill_touch": R(cls="bill", prio=5, level=-18.0, build=S("bill_flick", 2), sound="a paper flick"),
    "pat_head": R(cls="pat", prio=3, level=-24.0, build=LAY(("page_land", 0.0, 0.0, 0, dict(semis=-2.0)), ("page_land", 0.16, -2.0, 0, dict(semis=-1.0))),
                  sound="two soft pats"),
    "duck": R(cls="duck", prio=7, gap=10, level=lvl(-15.5, 10.0, 0.7),
              build=LAY(("duck_cloth", 0.0, 0.0, 0, dict(sync="peak")), ("leaf_brush", 0.03, -2.0, 0, {})), sound="a cloth swish + leaves brushed"),
    "duck_slow": R(cls="duck", prio=5, level=-22.0, build=S("duck_cloth", 3, sync="peak"), sound="a cloth swish, slowed"),
    "bill_brush_slow": R(cls="whoosh", prio=8, slow=False, level=-13.0, send=0.12,
                         build=LAY(("whoosh_slow", 0.0, 0.0, 0, dict(sync="peak", semis=-4.0, lpf=2200.0)),
                                   ("bill_hair", -0.1, -6.0, 0, dict(semis=-10.0, lpf=2500.0))),
                         sound="ONE deep soft whoosh + paper dragging through hair, slowed"),
    "rise_slow": R(cls="cloth", prio=2, level=-26.0, build=S("duck_cloth", 1, sync="peak"), sound="a cloth rustle, slowed"),
    "whoosh_small": R(cls="swish", prio=2, level=lvl(-23.0), build=S("duck_cloth", 2, sync="peak"), sound="a soft cloth swish"),
    # p3 (audit M4): the sad honk to -13 LU
    "unicycle_brake": R(cls="honk", prio=6, level=lvl(-11.5, 10.0, 0.5), build=B_sad_honk, send=0.10, sound="a tyre scuff + one low, sad honk"),
    # p3 (audit M6): the claps are back in S9 (they had been cut by the budget: an 11 s hole), light, carved under her line
    "hand_clap": R(cls="clap", prio=4, level=lvl(-22.0, 8.0, 0.45), build=lambda c, k: (clap_gen(k), "(synthesized hand clap)"),
                   sound="a light hand clap"),
    # ---- p3: the polish effects kit (D9) and the new gags
    "dust_puff": R(cls="puff", prio=5, stack=True, level=-25.0, build=lambda c, k: (poof_gen(k), "(synthesized dust puff)"), sound="a soft dust puff"),
    "tyre_land": R(cls="boing", prio=3, level=lvl(-24.0, 8.0, 0.5), build=S("boing", 2, semis=-2.0, max_len=0.3), sound="a small rubbery boing (his hop lands)"),
    "surprise_ping": R(kind="silent", why="THE QUIZ RULE: no chime or ping anywhere in Q1; his yelp and the wobble's scuff carry the take"),
    "juggle": R(cls="pat", prio=4, level=lvl(-25.0, 8.0, 0.5),
                build=lambda c, k: (juggle_gen(float(c.get("dur") or 48) / FPS, 8, k), "(synthesized palm pats, one a catch)"), sound="the juggle: a soft pat on every catch"),
    "juggle_loop": R(cls="pat", prio=4, level=lvl(-28.0, 10.0, 0.3),
                     build=lambda c, k: (juggle_gen((end_frame(c) - c["frame"]) / FPS, 8, 10 + k), "(synthesized palm pats, one a catch)"),
                     sound="the juggle as he laps: soft pats"),
    "catch": R(cls="pat", prio=3, level=-24.0, sound="he catches the horn: a slap + a tiny brass ting",
               build=lambda c, k: (E.mix_parts((pat_gen(40 + k), 0.0, 0.0), (twinkle_gen(40 + k, notes=(105,), vel=0.3), 0.01, -8.0)),
                                   "(synthesized pat + a glockenspiel A7)")),
    "bystander_laugh": R(cls="vocal", prio=4, level=-27.0, build=S("crowd_laugh", 0), sound="a bystander's far, light laugh"),
    "wobble": R(cls="gag", prio=4, level=-22.0, build=LAY(("yelp", 0.0, 0.0, 1, {}), ("squeak", 0.1, -6.0, 3, {})), sound="a wobble: a yelp + a squeak"),
    "thumb_jab": R(cls="swish", prio=2, level=-27.0, build=S("whoosh_body", 2, max_len=0.25, sync="peak"), sound="a small whoosh of the thumb"),
    "question_pop": R(cls="pop", prio=5, stack=True, level=-22.0, build=lambda c, k: (qpop_gen(k), "(synthesized rising 'bwoop?')"), sound="a '?' pop"),
    "surprise_pop": R(cls="pop", prio=5, stack=True, level=-23.0, build=lambda c, k: (xpop_gen(k), "pop_3 + a bright blip (synth)"), sound="a '!' pop"),
    "one_in_four": R(cls="thump", prio=6, level=-18.0, build=S("stamp"), sound="the big red '1 in 4' lands on the page (a soft thump)"),
    "pencil_tap": R(cls="tap", prio=4, gap=4, level=-24.0, build=S("tick", 2, semis=-3.0), sound="a pencil tap on the page"),
    "unicycle_in": R(kind="loop", cls="roll", level=lvl(-28.0, 10.0, 0.5), loop=("tyre_roll", dict(lpf=6000.0)), max_f=36,
                     sound="the unseen clown's wheel rolling in behind her"),
    "twinkle": R(cls="sparkle", prio=4, stack=True, level=-25.0, build=lambda c, k: (twinkle_gen(20 + k, notes=(98, 101, 105)), "glockenspiel + celesta D7 F7 A7"),
                 sound="twinkles round the bubble"),
    "give_up": R(cls="honk", prio=6, level=-18.0, build=B_give_up, sound="a '?' pop + a sad half honk"),
    "jogger_pass": R(cls="jog", prio=4, level=-24.0, build=B_jogger, sound="a jogger's quick steps passing behind him"),
    "freeze": R(cls="bill", prio=5, level=-20.0, sound="he freezes and whips the bills behind his back: a swish + a paper flick",
                build=LAY(("duck_cloth", 0.0, 0.0, 2, dict(sync="peak", max_len=0.3)), ("bill_flick", 0.02, -3.0, 1, {}))),
    "sweat_drop": R(cls="pop", prio=3, level=-26.0, build=S("plop", semis=6.0), sound="a tiny 'plip' of the sweat drop"),
    "whistle": R(cls="whistle", prio=5, level=-24.0, build=lambda c, k: (whistle_gen(k), "(synthesized two-note whistle, F6 D6)"),
                 sound="an innocent two-note whistle"),
    "bills_twinkle": R(cls="glint", prio=5, level=-23.0, build=S("glint"), sound="the bills' glassy 'ting'"),
    "brow_waggle": R(kind="silent", why="a look: no sound"),
    "wink_ting": R(cls="ting", prio=4, level=-24.0, build=lambda c, k: (twinkle_gen(30 + k, notes=(100,), vel=0.45), "(glockenspiel E7, own instrument)"),
                   sound="a tiny 'ting' on his wink"),
    "gasp": R(cls="vocal", prio=5, stack=True, level=-21.0, build=S("gasp_f"), sound="a small delighted gasp"),
    "hop": R(cls="swish", prio=2, level=-26.0, sound="a small jump swish (the unicycle's hop: a small springy boing)",
             build=lambda c, k: (E.smp("boing", 1 + k, semis=3.0, max_len=0.3), take_label("boing", 1 + k) + " (small, +3 st)") if "unicycle" in c["what"].lower()
             else (E.smp("duck_cloth", 1, sync="peak", max_len=0.35), take_label("duck_cloth", 1))),
    "bill_swat": R(cls="bill", prio=6, level=-17.0, build=S("bill_flick", 0, vary=0.4), sound="her fingers swat the bill (a paper slap)"),
    "land": R(cls="land", prio=3, level=-24.0, sound="a landing: two soft shoes (the unicycle: a tyre thump + a squeak)",
              build=lambda c, k: (E.mix_parts((E.smp("page_land", 0, semis=-6.0, lpf=2500.0), 0.0, 0.0), (E.smp("squeak", 3 + k, vary=0.5), 0.05, -6.0)),
                                  "fs745291 (-6 st) + a squeak") if "unicycle" in c["what"].lower() else B_land(c, k)),
    "petal_land": R(cls="tick", prio=2, level=-31.0, build=S("tick", 4, semis=2.0), sound="a tiny soft tick of the petal"),
    # ---- p4: the final acting round (quiet, tasteful; no new generations)
    "cheek_puff": R(kind="silent", why="a look (his puffed cheeks): the 'phew' 5 frames later carries it"),
    "phew_blow": R(cls="vocal", prio=3, level=-28.0, build=S("man_sigh", 1, max_len=0.45, fade=(0.02, 0.15)), sound="his relieved 'phew' (a short breath out)"),
    "sly_hmm": R(kind="silent", why="'a tiny heh or nothing': nothing (it sits 8 frames before duck 2's window)"),
    "take_gasp": R(cls="tick", prio=3, level=-26.0, build=S("tick", 0, semis=4.0), sound="a tiny tick of his glasses jumping (no male gasp take; a female one would be wrong on Hyman)"),
    "take_boing": R(cls="boing", prio=4, level=-25.0, build=S("boing", 2, semis=2.0, max_len=0.3), sound="a small comic boing (his take)"),
    "cloth_grab": R(cls="cloth", prio=3, level=-25.0, build=S("bag_rustle", 0, max_len=0.3, fade=(0.005, 0.1)), sound="his hand grabs the bag's flap (a short crinkle)"),
    "timelapse_whoosh": R(cls="whoosh", prio=3, level=-28.0, build=S("cam_whoosh_m", 1, lpf=6000.0), sound="a soft whoosh of the time-lapse trails"),
    "phone_laugh": R(cls="vocal", prio=5, stack=True, level=-25.0, build=S("laugh_f", 0), post=lambda x: bp(x, 400.0, 2400.0, 2),
                     sound="a short laugh into her phone (muffled, phone band)"),
    "pen_tap": R(cls="tap", prio=3, gap=4, level=-27.0, build=S("tick", 2, semis=-2.0), sound="a pen tap on the clipboard"),
    "whip_pan": R(cls="swish", prio=3, level=-28.0, build=S("whoosh_body", 5, max_len=0.3, sync="peak", lpf=7000.0),
                  sound="a short soft air-swish on the whip-pan (its peak on the cut)"),
    "snap_zoom": R(kind="silent", why="the 4 f punch-in lands ON a character's word ('amazing!', 'guy!'): no sound over it"),
    "squint": R(kind="merged", why="carried by the '?' pop one frame later"),
    "glance": R(kind="silent", why="'a tiny chair creak / nothing': nothing"),
    "eye_pop": R(cls="boing", prio=5, level=-23.0, build=S("boing", 0, semis=4.0, max_len=0.25), sound="a cartoon eye-pop boing (small, high)"),
    "cheer": R(kind="silent", why="his silent cheer, 'under the voice': the hop's boing and the two honks carry his joy"),
    "phone_chatter": R(kind="loop", cls="murmur", min_near=0.3, level=-32.0, loop=("murmur", dict(band=(250.0, 1500.0))),
                       sound="muffled, wordless phone chatter"),
    "unicycle_off": R(cls="squeak", prio=4, level=-26.0, build=S("squeak", 1, semis=-2.0, vary=0.4), sound="a slow, dejected wheel creak"),
    "pigeon_strut": R(kind="silent", why="tiny claw taps under 'So Hyman tried something sneakier.': too small to hear; his own tiptoes carry the rhythm"),
    "reach": R(cls="swish", prio=3, level=-26.0, build=S("duck_cloth", 2, sync="peak", max_len=0.3), sound="a cloth swish as she reaches up"),
    "bill_pinch": R(cls="bill", prio=6, level=-18.0, sound="her fingers pinch the bill: a crisp paper snap + a small glint",
                    build=LAY(("bill_flick", 0.0, 0.0, 0, {}), ("glint", 0.01, -10.0, 0, {}))),
    "bill_tug": R(cls="bill", prio=5, level=-21.0, sound="a tug: a paper flap + the peg's creak",
                  build=LAY(("bill_flick", 0.0, 0.0, 1, {}), ("squeak", 0.03, -9.0, 5, dict(semis=-5.0, lpf=3500.0)))),
    "giggle": R(cls="vocal", prio=4, level=-24.0, build=S("laugh_f", 1, max_len=0.5), sound="a tiny delighted giggle"),
    "bubble_swell": R(cls="whoosh", prio=3, level=-29.0, build=S("whoosh_mind", max_len=1.0, fade=(0.1, 0.3)), send=0.12,
                      sound="a soft warm swell of the call bubble (slowed)"),
    "bill_flutter_slow": R(cls="bill", prio=4, level=-25.0, build=S("bill_flick", 2, vary=0.4), sound="a slowed paper flap in the gust"),
    "bike_pass": R(cls="bike", prio=2, cap=1, min_near=0.3, level=lvl(-26.0, 10.0, 0.6), build=B_bike, kind_sync="long", sound="a cyclist's freewheel tick"),
    "skateboard_pass": R(cls="roll", prio=2, cap=1, min_near=0.3, level=lvl(-27.0, 10.0, 0.6),
                         build=S("tyre_roll", semis=5.0, max_len=1.2, fade=(0.4, 0.5)), kind_sync="long", sound="hard wheels rolling by"),
    # ---- no sound by design / carried by another cue
    "duck_SILENT": R(kind="silent", why="THE QUIZ RULE: the two ducks of the count are silent"),
    "notice": R(kind="silent", why="a look: no sound"), "sly_look": R(kind="silent", why="a look: no sound"),
    "wave": R(kind="silent", why="a wave: no sound"), "wave_back": R(kind="silent", why="a wave: no sound"),
    "signal_on": R(kind="merged", why="carried by the mind's rising sweep 6 frames later"),
    "frisbee_throw": R(kind="silent", why="about 40 m away in the high wide (near 0.05): under the bed's level"),
}
MIND_HUSH = mind_hush()            # p4: (start s, end s) of the breath before the mind-blow line
STEP_DB = -27.0                    # a footstep at near = 0.8 (LU under the voice); 12 dB per unit of near
SHOES = ("sneaker", "step_hard")   # p3: step_soft / step_slow measured as thumps under 90 Hz (the audit's M5): not used


def shoe_of(c):
    """p3: the shoe the animator names ('(leather shoe)', '(sneaker shoe)', '(soft shoe)', 'floorboards'), else None"""
    w = c["what"].lower()
    if "leather" in w or "floorboard" in w:
        return "step_hard"
    if "sneaker" in w or "soft shoe" in w or "rubber" in w:
        return "sneaker"
    return None


def walker_of(c):
    """who a footstep belongs to: its 'who', else the name at the head of its text"""
    if c.get("who"):
        return str(c["who"])
    w = re.sub(r"^S\d+\s+", "", c["what"])
    m = re.match(r"(.+?)(?:'s|:)?\s+(?:slow |tiptoe |phone-walk )*(?:step|footstep)", w)
    return (m.group(1) if m else w[:24]).strip().lower()


# ---------------------------------------------------------------- choosing what sounds
def _char_overlap(f, length_f=24.0):
    a, z = T.fr(f), T.fr(f + length_f)
    return any(min(z, e) - max(a, s) > 0.15 for s, e, _ in CHAR)


def select():
    """every cue of the three files -> a row with a status: play / step / loop / roll, or the reason it is not sounded.
    Order of the rules: unknown name; silent by design; too far; the quiz hard rule; a second voice under a character
    line; thinning (gap, cap per shot); density (priority); the event budget."""
    cues, problems = load_cues()
    # p3: every visible squeeze gets its own honk: a honk cue with another honk cue within HONK_SINGLE_F frames is ONE
    # squeeze (S1's four squeezes, the two pumps at the pigeons). The frame-0 honk and the second pump in the lead-in are
    # one event (B_open_honk), over before the first word.
    honks = [c for c in cues if c["name"] == "honk"]
    for c in honks:
        if any(o is not c and abs(o["frame"] - c["frame"]) < HONK_SINGLE_F for o in honks):
            c["single"] = True
        t_ = T.fr(c["frame"])
        if c["frame"] > 0.5 and any(t_ + HONK_WORD_S[0] < float(w["s"]) < t_ + HONK_WORD_S[1] for w in T.WORDS):
            c["single"] = True
    op = [c for c in honks if c["frame"] <= 0.5]
    if op:
        op[0]["open"] = True
        q_on = T.BEAT.get("quick", 10)
        for c in honks:
            if 0.5 < c["frame"] < q_on - 2:
                op[0]["second"] = c["frame"]
                c["merged_open"] = True
                break
    rows = []
    last_kept, count = {}, {}
    q1 = SK["Q1"]
    for c in cues:
        f, name = c["frame"], c["name"]
        sh = shot_of(f)
        row = dict(c=c, f=f, name=name, shot=sh["key"], rule=MAP.get(name), status=None, why="")
        rows.append(row)
        rule = row["rule"]
        if f < 0 or f >= T.TOTAL:
            row["status"], row["why"] = "off", f"frame {f:.0f} is outside the film"
            continue
        if rule is None:
            row["status"], row["why"] = "UNMAPPED", "no entry in sfx.py MAP for this cue name"
            continue
        if c.get("merged_open"):
            row["status"], row["why"] = "merged", "the second squeeze of the frame-0 honk-honk (one event in the lead-in, over before 'Quick')"
            continue
        if MIND_HUSH and rule["kind"] not in ("silent", "merged") and MIND_HUSH[0] - 0.15 <= T.fr(f) < MIND_HUSH[1]:
            row["status"], row["why"] = "rule", "the breath before 'Their bodies dodged it.' stays silent (it would start in it or be cut by it)"
            continue
        kind = rule["kind"]
        if kind in ("silent", "merged"):
            row["status"], row["why"] = kind, rule["why"]
            continue
        if kind == "loop" and end_frame(c) - f < 3:
            row["status"], row["why"] = "off", "zero length"
            continue
        if near_of(c) < rule["min_near"]:
            row["status"], row["why"] = "far", f"too far to hear on its own (near {near_of(c):.2f} < {rule['min_near']}): it is in the crowd bed"
            continue
        if rule["cls"] in MONEY_CLS and MONEY_FROM in SK and f < SK[MONEY_FROM]["a"]:
            row["status"], row["why"] = "rule", f"no money sound before {MONEY_FROM}: the peg's snap in S17 is the first one of the film"
            continue
        in_q1 = q1["a"] <= f < q1["b"]
        if in_q1:
            if rule["cls"] in HARD_FORBIDDEN:
                row["status"], row["why"] = "rule", f"THE QUIZ RULE: no '{rule['cls']}' sound anywhere in Q1"
                continue
            # the count's own gags (the clown, the pigeons, the dog) are the picture's featured action: a visible honk squeeze
            # or a flock taking off with no sound looks broken, so they are never thinned by a cap or by a neighbour
            row["feat"] = name in WINDOW_OK or name == "dog_paws"
            if kind == "event" and name in WINDOW_OK and pan_of(c) >= WINDOW_PAN_MIN and not rule.get("sweep"):
                row["win_ok"] = True               # the clown / the pigeons / the dog, on the right: never cut, may sound at a duck
            else:
                room = q1_room(f)
                nxt = [d for d in DUCK_F if d + HARD_PAD_F >= f]
                only = f"only the clown, the pigeons or the dog, panned at {WINDOW_PAN_MIN:+.2f} or further right, may sound there"
                if room == -1:
                    row["status"], row["why"] = "rule", f"THE QUIZ RULE: inside the window (+-{HARD_PAD_F} f) of the duck at f {nxt[0]}: {only}"
                    continue
                if room is not None and room < ROOM_MIN_F.get(kind, 8):
                    row["status"], row["why"] = "rule", (f"THE QUIZ RULE: it would still sound in the window of the duck at f {nxt[0]} "
                                                          f"(only {room:.0f} f of room): {only}")
                    continue
                row["room"] = room
        if kind in ("step", "roll", "loop"):
            row["status"] = kind
            continue
        if (rule["cls"] == "vocal" or rule.get("no_char")) and _char_overlap(f, 24.0 if rule["cls"] == "vocal" else 4.0):
            row["status"] = "thin"
            row["why"] = ("a second voice" if rule["cls"] == "vocal" else "a sound in the consonant band") + " under a character's line (the dialogue stays clean)"
            continue
        key = (name, sh["key"])
        gap = rule["gap"]
        if gap and name in last_kept and f - last_kept[name] < gap:
            row["status"], row["why"] = "thin", f"thinned: under {gap} f after the last kept '{name}'"
            continue
        cap = rule["cap"]
        if cap:
            cap = cap * max(1, int(round((sh["b"] - sh["a"]) / 140.0)))      # a cap is per ~4.7 s of shot (the count is 9 s long)
        if rule.get("cap_far") and near_of(c) < 0.2:
            cap = rule["cap_far"]
        if cap and not row.get("feat") and count.get(key, 0) >= cap and near_of(c) < rule.get("cap_exempt_near", 9.0):
            row["status"], row["why"] = "thin", f"thinned: at most {cap} '{name}' in a shot"
            continue
        row["status"] = "play"
        row["prio"] = rule.get("prio_near", rule["prio"]) if (near_of(c) >= 0.8 or c.get("dur")) else rule["prio"]
        last_kept[name] = f
        count[key] = count.get(key, 0) + 1
    # density: of two events closer than DENSITY_GAP_F frames the lower priority one is held back (stacking cues excepted)
    play = sorted([r for r in rows if r["status"] == "play"], key=lambda r: (-r["prio"], r["f"]))
    kept = []
    for r in play:
        if r["rule"]["stack"] or r.get("feat"):
            kept.append(r)
            continue
        hit = [k for k in kept if not k["rule"]["stack"] and not k.get("feat") and abs(k["f"] - r["f"]) < DENSITY_GAP_F]
        if hit:
            r["status"], r["why"] = "thin", f"held back: {abs(hit[0]['f'] - r['f']):.0f} f from '{hit[0]['name']}' (higher priority)"
        else:
            kept.append(r)
    return rows, problems


# ---------------------------------------------------------------- building the cues
Q1_WORD_DB = -4.0                  # p3 (audit M6: 'lose' had the film's lowest margin, the honk sat on 'count.')


def _on_word(f):
    t = T.fr(f)
    return any(float(w["s"]) - 0.05 <= t <= float(w["e"]) for w in T.WORDS)


def _new(f, name, cls, desc, expects, gen, level, label, p=0.0, kind="sync", **kw):
    wc = kw.pop("wcarve", None)
    if wc is None:
        wc = WCARVE.get(cls, WCARVE_DEFAULT)
    c = E.Cue(T.fr(f), name, desc, gen, level, p=p, pe=f"{name}@{f:.0f}", wcarve=wc, key=f"f {f:.0f}", expects=expects, kind=kind, **kw)
    c.cls, c.label, c.shot, c.f0 = cls, label, shot_of(f)["key"], float(f)
    c.prio, c.own = 9, True
    return c


def special():
    """the film's own moments (not in the animators' files), keyed to the timeline"""
    C = []
    # p3 (audit m1 / m2 / m5): each on the first frame the picture shows it, never before. Overlays.tsx: the chip is first
    # drawn at CHIP_IN + 1; the flip squashes the card from FLIP + 1; the big 5 is a sliver at FLIP + 4 (6 % of its height),
    # 38 % at FLIP + 5, 71 % at FLIP + 6 (popping): the ding lands there, the first frame the 5 reads
    C.append(_new(B["jobEnd"] - 1, "chip_in", "pop", "the chip 'PHONES: ?' pops in (a small pop, on the right)",
                  "Overlays.tsx: CHIP_IN = BEAT.jobEnd - 2 (drawn from + 1)", E.smp("pop", 0), -23.0, take_label("pop", 0), p=0.35, send=0.03))
    C.append(_new(B["five"] - 1, "chip_flip", "flip", "the chip flips (a card flick)", "Overlays.tsx: FLIP = BEAT.five - 2 (8 f; it moves from + 1)",
                  E.smp("flick", 0), -20.0, take_label("flick", 0), p=0.35, send=0.03))
    C.append(_new(B["five"] + 4, "five_ding", "ding", "the BIG 5 shows: a bright triangle ding (on top of the score's sting on 'Five.')",
                  "Overlays.tsx: the big gold 5 reads from FLIP + 6 (71 % of its height, popping)", E.smp("triangle", 0), -12.5, take_label("triangle", 0),
                  p=0.35, send=0.12, post=E.ring_cut(0.7, 0.15)))
    s6 = SK.get("S6")
    if s6:
        d = (s6["b"] - s6["a"] - 6) / FPS
        C.append(_new(s6["a"] + 3, "clock_hour", "clock", "the tower clock spins through the hour (a soft ratchet whirr, top right)",
                      "sets: the clock's hands spin one hour over 'So for one hour' (BEAT.soFor - 4 .. hourEnd + 6)",
                      E.smp("clock", 0, max_len=d, fade=(0.15, 0.35), lpf=4200.0), -25.0, take_label("clock", 0), p=0.5, send=0.14, kind="long"))
    pops = e1_pops()
    for k, f in enumerate(pops[:5]):
        C.append(_new(f, "count_pip", "pip", f"E1: count pip {k + 1} of {len(pops[:5])} (a glockenspiel note of a rising line + a small pop)",
                      f"Overlays.tsx: the gold number {k + 1} pops over the held phone person (story.ts e1Pop)", pip_gen(k), -17.5 + 0.25 * k,
                      f"glockenspiel note {('D6', 'E6', 'F6', 'G6', 'A6')[k % 5]} (own instrument) + pop_2", p=-0.15 + 0.08 * k, send=0.08))
    rw = e3_rewind()
    if rw:
        a, h0 = rw["a"], rw["a"] + rw["r1"]
        h1 = h0 + rw["hold"]
        mq = money_q()
        until = (mq[0] - 0.012) if mq else T.fr(h0 + 10)
        C.append(_new(a, "tape_rewind", "tape", "E3: the tape REWINDS from the hard cut in the hush (a real VCR whirr scrubbing under 'Did you "
                      "see the', slowing into the hold; the score's own reversed quiz music runs with it)", "timeline e3: rewind1 (cut .. hold)",
                      whirr_gen(a, h0, (1.55, 1.15, 0.8), 0), E3_WHIRR_DB, take_label("tape_rewind", 0), p=0.0, send=0.0))
        # p3: the HOLD (40 f, clean colour, the slow pass on the first duck): a SOFT freeze hit as it starts, a glint as the
        # gold ring completes (e3.ring_full); both are over before "money?" (nothing but the score's swell over that word)
        C.append(_new(h0, "freeze_hit", "hit", "E3: the hold begins on the first duck: a soft muted thump + the VCR's clunk (no record scratch)",
                      "timeline e3: hold start",
                      E.mix_parts((E.smp("freeze_hit", 2), 0.0, 0.0), (E.smp("tape_stop", 0), 0.0, -5.0), (E.smp("freeze_hit", 1), 0.0, -8.0)),
                      -17.0, f"{take_label('freeze_hit', 2)} + {take_label('tape_stop', 0)} + {take_label('freeze_hit', 1)}", p=0.0, send=0.06,
                      post=cut_at(until - T.fr(h0), 0.06), wcarve=dict(db=-8.0, lo=900.0, hi=4500.0, broad=-1.0)))
        rf = int(rw.get("ring_full", h0 + 8))
        C.append(_new(rf, "ring_glint", "glint", "E3: the gold double ring completes round the bills: a short glassy glint",
                      "timeline e3: ring_full", E.smp("glint", 0), -19.0, take_label("glint", 0), p=-0.25, send=0.0,
                      post=cut_at(max(0.04, until - T.fr(rf)), 0.015)))
        C.append(_new(h1, "tape_rewind_on", "tape", "E3: the tape rewinds ON to frame 0 and stops on the LAST SAMPLE of the film (the loop seam)",
                      "remap.ts REW: the second rewind, landing on frame 0 at TOTAL", whirr_gen(h1, T.TOTAL, (0.75, 1.5, 1.05), 1, to_end=True),
                      E3_WHIRR_DB, take_label("tape_rewind", 1), p=0.0, send=0.0))
    return C


def cues():
    """-> (C: every Cue to render, rows: the selection report)"""
    rows, problems = select()
    C = special()
    q1 = SK["Q1"]
    rep = {}                                    # repeat counter per cue name (take rotation)
    # ---- events (within the budget: the lowest priority, then the farthest, go first)
    play = [r for r in rows if r["status"] == "play"]
    over = len(play) + len({c.name for c in C if c.name != "count_pip"}) + 1 - MAX_EVENTS
    if over > 0:
        for r in sorted([r for r in play if not r.get("feat")], key=lambda r: (r["prio"], near_of(r["c"])))[:over]:   # (never the count's gags)
            r["status"], r["why"] = "thin", f"over the budget of {MAX_EVENTS} events (lowest priority first)"
    for r in rows:
        if r["status"] != "play":
            continue
        c, rule = r["c"], r["rule"]
        k = rep.get(r["name"], 0)
        rep[r["name"]] = k + 1
        sh = SK[r["shot"]]
        p = pan_of(c)
        if rule.get("sweep"):                   # the dog: a real paw patter crossing the frame
            d = (end_frame(c) - r["f"]) / FPS
            p1 = float(np.clip(-p if abs(p) > 0.3 else p + 0.8, HARD_PAN_MIN if r["shot"] == "Q1" else -PAN_SCALE, PAN_SCALE))
            gen, label = swept(E.smp("dog_paws", 0, max_len=d, fade=(0.03, 0.2)), p, p1), take_label("dog_paws", 0)
        elif c.get("open"):                     # p3: the frame-0 honk-honk in the lead-in
            gen, label = B_open_honk(c, k)
        else:
            gen, label = rule["build"](c, k)
        rate = slow_rate(r["shot"])
        if rate < 0.8 and rule["slow"]:
            gen = slowed(gen, rate, SLOW_LPF)
            label += f" (slowed to {rate:.2f}x, low-passed {SLOW_LPF:.0f} Hz)"
        if r.get("room") is not None:           # Q1: over before the next duck window
            gen = cut(gen, r["room"] / FPS)
        gen = resync(gen, rule.get("post"))
        level = rule["level"](c) if callable(rule["level"]) else float(rule["level"])
        if c.get("replay"):
            level += REPLAY_DB
        if c.get("open"):
            level = OPEN_HONK_DB
        elif r["shot"] == "Q1" and _on_word(r["f"]):
            level += Q1_WORD_DB                 # p3: in the count an event that starts on a word sits lower
        level += SHOT_DB.get((r["name"], r["shot"]), 0.0)
        cu = E.Cue(T.fr(r["f"]), r["name"], rule.get("sound", r["name"]), gen, level, p=p, pe=f"{r['name']}@{r['f']:.0f}",
                   space="room" if sh["set"] == "office" else "out", send=rule["send"],
                   wcarve=0.0 if c.get("open") else WCARVE.get(rule["cls"], WCARVE_DEFAULT),
                   key=f"f {r['f']:.0f} ({c['src']})", expects=c["what"], kind=rule.get("kind_sync", "sync"))
        cu.cls, cu.label, cu.shot, cu.f0, cu.prio, cu.own, cu.room = rule["cls"], label, r["shot"], r["f"], r["prio"], False, r.get("room")
        cu.win_ok = bool(r.get("win_ok"))
        C.append(cu)
        r["cue"] = cu
        al = rule.get("after_loop")
        if al:                                  # e.g. the chatter inside the call bubble, from its pop to the end of the shot
            d = (sh["b"] - r["f"] - 2) / FPS
            if d > 0.5:
                lc = E.Cue(T.fr(r["f"] + 2), r["name"] + "_bed", al["what"], loop_gen(al["sound"], d, 0, band=al.get("band")), al["level"], p=p,
                           pe=f"{r['name']}_bed@{r['f']:.0f}", send=0.0, wcarve=WCARVE["murmur"], key=f"f {r['f'] + 2:.0f} .. {sh['b']}",
                           expects=al["what"], kind="long", dur_f=sh["b"] - r["f"] - 2)
                lc.cls, lc.label, lc.shot, lc.f0, lc.prio, lc.own = "murmur", take_label(al["sound"], 0), r["shot"], r["f"] + 2, 0, False
                C.append(lc)
    # ---- loops (a continuous sound from the cue's frame to its end)
    for r in rows:
        if r["status"] != "loop":
            continue
        c, rule = r["c"], r["rule"]
        k = rep.get(r["name"], 0)
        rep[r["name"]] = k + 1
        f1 = min(end_frame(c), T.TOTAL - 1)
        if rule.get("max_f"):                   # p3: e.g. the unseen clown's wheel keeps pace only until he peels off
            f1 = min(f1, r["f"] + float(rule["max_f"]))
        if r.get("room") is not None:           # Q1: the loop has faded out before the next duck window
            f1 = min(f1, r["f"] + r["room"])
        d = (f1 - r["f"]) / FPS
        snd, opt = rule["loop"]
        if snd == "murmur":
            snd = "murmur_m" if re.search(r"\bp[14]\b|guy|man|\bhis\b|\bhe\b", c["what"].lower()) else "murmur_f"
        gen = loop_gen(snd, d, k, **opt)
        level = rule["level"](c) if callable(rule["level"]) else float(rule["level"])
        sh = SK[r["shot"]]
        cu = E.Cue(T.fr(r["f"]), r["name"], rule.get("sound", r["name"]), gen, level, p=pan_of(c), pe=f"{r['name']}@{r['f']:.0f}",
                   space="room" if sh["set"] == "office" else "out", send=0.0 if rule["cls"] in ("murmur", "leak") else 0.04,
                   wcarve=WCARVE.get(rule["cls"], WCARVE_DEFAULT), key=f"f {r['f']:.0f} .. {f1:.0f} ({c['src']})", expects=c["what"], kind="long",
                   dur_f=f1 - r["f"])
        cu.cls, cu.label, cu.shot, cu.f0, cu.prio, cu.own, cu.room = rule["cls"], take_label(snd, k), r["shot"], r["f"], 0, False, r.get("room")
        C.append(cu)
        r["cue"] = cu
    # ---- the unicycle when he is near: one roll per run of the animators' pedal squeaks (the squeaks sit on their frames)
    sq = [r for r in rows if r["status"] == "roll"]
    runs = []
    for r in sq:
        if runs and r["f"] - runs[-1][-1]["f"] <= 40:
            runs[-1].append(r)
        else:
            runs.append([r])
    skids = [r["f"] for r in rows if r["name"] == "brake_skid" and r["status"] == "play"]
    for run in runs:
        f0 = 0.0 if run[0]["f"] < 16 else run[0]["f"] - 6
        f1 = run[-1]["f"] + 10
        stop = [s for s in skids if 0 <= s - run[-1]["f"] <= 14]
        if stop:
            f1 = stop[0]
        if q1["a"] <= f0 < q1["b"] and q1_room(f0) is not None:      # the quiz rule: the roll is over before the next duck window
            f1 = min(f1, f0 + q1_room(f0))
        near = float(np.mean([near_of(r["c"]) for r in run]))
        p = float(np.mean([pan_of(r["c"]) for r in run]))
        gen = loop_gen("tyre_roll", (f1 - f0) / FPS, len(runs), lpf=7000.0, fin=0.02 if f0 == 0 else 0.2, fout=0.12 if stop else 0.3,
                       squeaks=[((r["f"] - f0) / FPS, 0.6 + 0.5 * near_of(r["c"])) for r in run])
        cu = E.Cue(T.fr(f0), "unicycle_near", "the unicycle near the lens: the tyre rolling on brick + a pedal squeak on each listed half turn",
                   gen, float(np.clip(-25.0 + 10.0 * (near - 0.8), -34.0, -22.0)), p=p, pe=f"unicycle_near@{f0:.0f}", send=0.04,
                   wcarve=WCARVE["roll"], key=f"f {f0:.0f} .. {f1:.0f} (quiz: {len(run)} wheel_squeak cues)",
                   expects="; ".join(sorted({r['c']['what'] for r in run})), kind="long", dur_f=f1 - f0)
        cu.cls, cu.label, cu.shot, cu.f0, cu.prio, cu.own = "roll", f"{take_label('tyre_roll', len(runs))} + squeak takes", run[0]["shot"], f0, 0, False
        cu.squeak_f = [r["f"] for r in run]
        C.append(cu)
        for r in run:
            r["cue"] = cu
    # ---- footsteps: one walker = one shoe; a recorded step on every listed frame, takes rotating, level by distance only
    walkers = {}
    for r in rows:
        if r["status"] == "step":
            walkers.setdefault((r["shot"], walker_of(r["c"])), []).append(r)
    for wi, ((shot, who), steps) in enumerate(sorted(walkers.items(), key=lambda kv: kv[1][0]["f"])):
        rule = steps[0]["rule"]
        shoe = shoe_of(steps[0]["c"]) or rule.get("shoe") or SHOES[sum(map(ord, who)) % len(SHOES)]
        soft = "soft shoe" in steps[0]["c"]["what"].lower() or rule.get("step_db", 0.0) < 0
        order = rng(3300 + wi).permutation(max(1, SM.count(shoe)))
        sc_order = rng(3400 + wi).permutation(max(1, SM.count("scuff")))
        feat = shot in FEATURED_SHOTS
        sh = SK[shot]
        for j, r in enumerate(steps):
            c = r["c"]
            d = STEP_NEAR_M + (1.0 - near_of(c)) * (STEP_FAR_M - STEP_NEAR_M)
            top = float(np.interp(d, [STEP_NEAR_M, STEP_FAR_M], [11000.0, 3200.0])) * (0.6 if soft else 1.0)
            # p3: the step high-passed at STEP_HP + a heel-scuff layer (2-5 kHz, its own takes) SCUFF_DB under it, a hair after
            # the contact: the step is heard as a step through the voice and on a phone, its contact frame unchanged
            gen = E.mix_parts((E.smp(shoe, i=int(order[j % len(order)]), vary=0.7, lpf=top, hpf=STEP_HP), 0.0, 0.0),
                              (E.smp("scuff", i=int(sc_order[j % len(sc_order)]), vary=0.8, hpf=1500.0, lpf=min(top, 9000.0), max_len=0.22,
                                     fade=(0.002, 0.08)), 0.012, SCUFF_DB + (2.5 if feat else 0.0) - (3.0 if soft else 0.0)))
            rate = slow_rate(shot)
            if rate < 0.8:
                gen = slowed(gen, rate, SLOW_LPF)
            if r.get("room") is not None:
                gen = cut(gen, r["room"] / FPS, 0.01)
            gen = resync(gen)
            level = float(np.clip(STEP_DB + rule.get("step_db", 0.0) + 12.0 * (near_of(c) - 0.8) - (0.6 if j % 2 else 0.0)
                                  + (FEATURED_STEP_DB if feat else 0.0), -40.0, -16.0 if feat else -22.0))
            cu = E.Cue(T.fr(r["f"]), "step", f"footstep: {who}", gen, level, p=pan_of(c), pe=f"step:{shot}:{who}@{r['f']:.0f}",
                       space="room" if sh["set"] == "office" else "out", send=0.05, wcarve=WCARVE["step"], key=f"f {r['f']:.0f} ({c['src']})",
                       expects=c["what"], kind="sync")
            cu.cls, cu.label, cu.shot, cu.f0, cu.prio, cu.own = "step", take_label(shoe, int(order[j % len(order)])), shot, r["f"], 0, False
            cu.walker, cu.shoe, cu.room = who, shoe, r.get("room")
            C.append(cu)
            r["cue"] = cu
    C.sort(key=lambda c: c.t)
    return C, rows, problems


# ---------------------------------------------------------------- THE QUIZ HARD RULE (stops the mix)
def hard_rule(C):
    q1 = SK["Q1"]
    bad = []
    for c in C:
        if not (q1["a"] <= c.f0 < q1["b"]):
            continue
        if c.cls in HARD_FORBIDDEN:
            bad.append(f"{c.name} @ f {c.f0:.0f}: class '{c.cls}' is not allowed in Q1")
        if getattr(c, "win_ok", False):            # the clown / the pigeons / the dog: allowed at a duck, but only on the right
            if c.name not in WINDOW_OK or c.p < WINDOW_PAN_MIN - 1e-6:
                bad.append(f"{c.name} @ f {c.f0:.0f}: may sound at a duck only as a clown / pigeon / dog sound at pan >= {WINDOW_PAN_MIN:+.2f} (it is {c.p:+.2f})")
            continue
        room = q1_room(c.f0)
        if room == -1:
            bad.append(f"{c.name} @ f {c.f0:.0f}: starts inside a duck's silent window")
        elif room is not None:
            if c.kind == "long" and c.dur_f and c.dur_f > room + 1e-6:
                bad.append(f"{c.name} @ f {c.f0:.0f}: runs {c.dur_f:.0f} f, into the duck window {room:.0f} f later")
            if c.kind != "long" and getattr(c, "room", None) is None and not getattr(c, "own", False):
                bad.append(f"{c.name} @ f {c.f0:.0f}: not cut to its {room:.0f} f of room before the duck window")
        for fs in getattr(c, "squeak_f", []):
            if q1_room(fs) == -1:
                bad.append(f"{c.name}: a pedal squeak at f {fs:.0f} inside a duck's silent window")
        if c.p < HARD_PAN_MIN - 1e-6:
            bad.append(f"{c.name} @ f {c.f0:.0f}: pan {c.p:+.2f} is left of {HARD_PAN_MIN}")
    if bad:
        raise SystemExit("THE QUIZ HARD RULE is broken:\n  " + "\n  ".join(bad))
    return True


# ---------------------------------------------------------------- render: events
QUIZ_BUS = []                       # filled by render_events(): what sounds in each duck window, per bus


def render_events(v_ref):
    """the events stem (2, N) at voice reference v_ref, + the cues (with measured level and sync) + the selection rows.
    Two buses: the clown's / pigeons' / dog's sounds that may be heard at a duck (win_ok), and EVERYTHING ELSE, which is
    gated to digital silence inside each duck window."""
    global QUIZ_BUS
    C, rows, problems = cues()
    hard_rule(C)

    def note(c, x, t0):
        c.len_f, c.start_f = x.shape[-1] / SR * FPS, t0 * FPS
    C_ok = [c for c in C if getattr(c, "win_ok", False)]
    C_rest = [c for c in C if not getattr(c, "win_ok", False)]
    # p3 (audit M5): the effects bus is high-passed at SFX_HP (12 dB/oct), except the three weight hits (LOW_OK)
    C_low = [c for c in C_rest if c.name in LOW_OK]
    rest = hp(E._render_set([c for c in C_rest if c.name not in LOW_OK], v_ref, note), SFX_HP, 2)
    if C_low:
        rest = rest + E._render_set(C_low, v_ref, note)
    ok = hp(E._render_set(C_ok, v_ref, note), SFX_HP, 2) if C_ok else np.zeros((2, N))
    srows = E.sync_rows(C)
    for c, sr_ in zip(C, srows):
        sr_["cls"], sr_["shot"] = c.cls, c.shot
    json.dump({"_doc": "sync point of every cue as placed in the last render, frames after its picture frame (+ = late); picture-synced "
                       f"cues must stay within {E.SYNC_TOL[0]:+.0f} .. {E.SYNC_TOL[1]:+.0f} f", "rows": srows, "samples_played": SM.USED},
              open(E.SYNC_REPORT, "w", encoding="utf-8"), indent=1)
    E.sync_check(srows)
    QUIZ_BUS = []
    for d, (a_f, z_f) in zip(DUCK_F, q1_windows()):     # THE QUIZ RULE: everything but the clown / pigeons / dog is digital silence in
        a, z = ns(T.fr(a_f)), ns(T.fr(z_f))             # each duck window (only decaying reverb tails could be left: gated out over 2 f)
        f = ns(2 / FPS)
        rest[:, a - f:a] *= np.linspace(1, 0, f)[None, :]
        rest[:, a:z] = 0.0
        g = ns(1 / FPS)
        rest[:, z:z + g] *= np.linspace(0, 1, g)[None, :]
        seg = ok[:, a:z]
        pk = float(np.max(np.abs(seg)))
        inside = [dict(name=c.name, frame=float(c.f0), ends=float(c.start_f + c.len_f), pan=float(c.p), level=float(c.level)) for c in C_ok
                  if c.start_f <= z_f and c.start_f + c.len_f >= a_f]
        QUIZ_BUS.append(dict(duck=int(d), window=[int(a_f), int(z_f)], rest_peak=float(np.max(np.abs(rest[:, a:z]))), ok_peak=pk,
                             ok_balance=(float(10 * np.log10((np.mean(seg[0] ** 2) + 1e-20) / (np.mean(seg[1] ** 2) + 1e-20))) if pk > 1e-7 else None),
                             ok_level_re_voice=(float(10 * np.log10(np.mean(seg ** 2) + 1e-20) - v_ref) if pk > 1e-7 else None), cues=inside))
    out = rest + ok
    # the hush before "Did you see the money?": no event or reverb tail in it (the tape starts at E3's cut). A replayed
    # sound of E2 that starts just before it (the wave's one honk) is allowed to finish (0.17 s) first.
    rw = e3_rewind()
    hush_a = T.bt("sawClownEnd") + 0.02 if "sawClownEnd" in B else None
    if rw and hush_a is not None:
        late = [c.t for c in C if c.kind == "sync" and hush_a - 0.25 <= c.t < hush_a + 0.05]
        if late:
            hush_a = min(max(hush_a, max(late) + 0.17), T.fr(rw["a"]) - 0.08)
        a, z = ns(hush_a), ns(T.fr(rw["a"]))
        if z > a:
            f = min(ns(0.03), z - a)
            out[:, a:a + f] *= np.linspace(1, 0, f)[None, :]
            out[:, a + f:z] = 0.0
    # p3: "money?": nothing but the score's swell over the last word, and through the rest of the hold (the tape rewinds on
    # from the hold's end); the freeze hit and the glint are cut before it already
    mq = money_q()
    if rw and mq:
        a, z = ns(mq[0] - 0.012), ns(T.fr(rw["a"] + rw["r1"] + rw["hold"]))
        if z > a:
            f = ns(0.015)
            out[:, a - f:a] *= np.linspace(1, 0, f)[None, :]
            out[:, a:z] = 0.0
    # p3 (audit M1, FIX2 D1): the breath before "Their bodies dodged it.": no effect or reverb tail in it
    mh = mind_hush()
    if mh:
        a, z = ns(mh[0]), ns(mh[1])
        f = ns(0.03)
        out[:, a:a + f] *= np.linspace(1, 0, f)[None, :]
        out[:, a + f:z] = 0.0
        out[:, z:z + ns(0.02)] *= np.linspace(0, 1, ns(0.02))[None, :]
    k = ns(0.003)                              # everything stops on the last sample (no fade-out before it)
    out[:, -k:] *= np.linspace(1, 0, k)[None, :]
    write_report(C, rows, problems, srows)
    return out, C, rows, problems


def write_report(C, rows, problems, srows=None):
    st_ = {}
    for r in rows:
        st_[r["status"]] = st_.get(r["status"], 0) + 1
    rep = dict(_doc="what became of every cue of the animators' three files in the last render (status: play / step / loop / roll = sounded; "
                    "UNMAPPED = no sound known for that name; thin / rule / far / silent / merged / off = not sounded, with the reason)",
               files=[p for _, p in CUE_FILES], problems=problems, counts=st_, duck_frames=DUCK_F,
               unmapped=sorted({r["name"] for r in rows if r["status"] == "UNMAPPED"}),
               rows=[dict(frame=r["f"], name=r["name"], src=r["c"]["src"], shot=r["shot"], status=r["status"], why=r["why"], what=r["c"]["what"])
                     for r in rows])
    json.dump(rep, open(REPORT, "w", encoding="utf-8"), indent=1)
    return rep


# ---------------------------------------------------------------- render: the living bed
BED = {"square": -27.5, "crowd": -31.0, "room": -37.0, "tick": -32.0}       # LU under the voice (integrated, where each one plays)
BED_SHOT_DB = {"Q1": 1.5, "Q2": 1.0, "Q3": 0.5, "S6": 2.0, "S12": -2.0, "S16": -1.0, "S17": -2.0, "S18": -1.0, "S19": -1.0, "S20": -3.0,
               "E1": -1.0, "E2": -1.0, "E3": -4.0}
CROWD_SHOT_DB = {"Q1": 2.0, "Q2": 1.5, "S6": 2.5, "S7": 1.0, "S15": -3.0, "S16": -5.0, "S17": -6.0, "S18": -4.0, "S19": -4.0, "S20": -6.0}
BED_CALL_HZ, BED_SLOW_HZ = 1100.0, 900.0     # the square dulled once her mind is in the call (S15) / in the slow motion (S20)
BED_TAPE = (300.0, 3600.0)                   # E3: the square heard "on tape"
BED_HUSH_DB = -8.0                           # the breath before "Did you see the money?"
CLOCK_PERIOD = 1.0                           # s: the office wall clock (tick, tock)


_CT = None


def _ctrl():
    """the shots' crossfade weights at a 200 Hz control rate (26 shots at audio rate would not fit in memory)"""
    global _CT
    if _CT is None:
        tc = np.arange(int(T.DUR * 200) + 2) / 200.0
        _CT = (tc, T.shot_weights(tc))
    return _CT


def _shot_curve(table, t, default=0.0):
    tc, w = _ctrl()
    cv = np.zeros(len(tc))
    for i, wi in w.items():
        cv += wi * table.get(T.SHOTS[i]["key"], default)
    return np.interp(t, tc, cv)


def calm_shift(x, step=0.05, guard=0.1):
    """THE QUIZ RULE for the bed: the real ambience has bird calls in it. The bed is a seamless loop, so it can be ROTATED:
    this finds the rotation (in steps of `step` s) that puts both duck windows (+ `guard` s each side) on the stretches
    with the smallest level rises (no call starts there). Returns (samples to roll by, the largest 30 ms rise left in a
    window, the same before rolling)."""
    from scipy import ndimage
    m = x.mean(0)
    e = 10 * np.log10(ndimage.uniform_filter1d(m ** 2, ns(0.03), mode="wrap") + 1e-14)      # 30 ms level (a bird call is 50-150 ms)
    rise = e - np.roll(e, ns(0.06))
    wins = [(ns(T.fr(a) - guard), ns(T.fr(z) + guard)) for a, z in q1_windows()]
    Lw = max(z - a for a, z in wins)
    M = ndimage.maximum_filter1d(rise, Lw, origin=-(Lw // 2), mode="wrap")       # M[i] = the largest rise in [i, i + Lw)
    shifts = np.arange(0, N, ns(step))
    cost = np.max(np.stack([M[(a - shifts) % N] for a, _ in wins]), axis=0)
    k = int(np.argmin(cost))
    return int(shifts[k]), float(cost[k]), float(cost[0])


def _stereo_bed(sound, r, semis=-0.8, side=0.6):
    """a loop-safe stereo layer from mono takes: the same takes a little lower as the side signal (wide, mono-safe)"""
    a = SM.bed(sound, N, r, xf=1.5)
    b = SM.bed(sound, N, r, xf=1.5, semis=(semis,))
    if a is None:
        return None
    return np.stack([a + side * b, a - side * b])


def render_beds(v_ref, seed=2026):
    """the bed stem (2, N): the SQUARE (real ambience: breeze in leaves, birds, a far fountain; + a far wordless crowd) under
    every square shot, a warm quiet ROOM with a wall clock's tick under the office shots S2-S5; crossfaded on the
    picture's dissolves, re-balanced per shot, dulled inside her call and in the slow motion, 'on tape' in E3, and
    loop-safe (the last sample runs into the first)."""
    r = rng(seed)
    t = np.arange(N) / SR
    tc, w = _ctrl()
    w_sq = np.interp(t, tc, sum(wi for i, wi in w.items() if T.SHOTS[i]["set"] == "square"))
    g_sq, g_of = np.sin(0.5 * np.pi * np.clip(w_sq, 0, 1)), np.sin(0.5 * np.pi * np.clip(1.0 - w_sq, 0, 1))
    rows = []
    sq = _stereo_bed("square_amb", r)
    cr = _stereo_bed("crowd", r, semis=-1.1, side=0.5)
    on = g_sq > 0.5

    def lv(x, db):
        L = integrated(x[:, on])
        return x * dbg(v_ref + db - L) if np.isfinite(L) else x
    out = np.zeros((2, N))
    if sq is not None and cr is not None:      # the two layers at their levels, rotated together (the loop stays seamless)
        sq, cr = lv(sq, BED["square"]), lv(cr, BED["crowd"])
        sh, c1, c0 = calm_shift(sq + cr)
        sq, cr = np.roll(sq, sh, axis=1), np.roll(cr, sh, axis=1)
        rows.append(("(rotation)", 0.0, f"THE QUIZ RULE: the bed loop is rotated by {sh / SR:.2f} s so both duck windows fall on its calmest "
                     f"stretches (largest level rise over 60 ms in a window {c0:.1f} dB before, {c1:.1f} dB after)"))
    if sq is not None:
        out += lv(sq, BED["square"]) * dbg(_shot_curve(BED_SHOT_DB, t))[None, :]
        rows.append(("square", BED["square"], "the campus square: a light breeze in leaves, songbirds, a far fountain (real ambience takes, looped "
                     "with long crossfades); per shot dB: " + ", ".join(f"{k} {v:+.1f}" for k, v in BED_SHOT_DB.items())))
    if cr is not None:
        out += lv(cr, BED["crowd"]) * dbg(_shot_curve(CROWD_SHOT_DB, t))[None, :]
        rows.append(("crowd", BED["crowd"], "a far, friendly, wordless crowd murmur (livelier in the count and the high wide, shut out under "
                     "the tree); per shot dB: " + ", ".join(f"{k} {v:+.1f}" for k, v in CROWD_SHOT_DB.items())))
    # dulled: inside her call (S15 from its relight to its end), in the slow motion (S20); "on tape" in E3
    m_call, m_slow, m_tape = np.zeros(N), np.zeros(N), np.zeros(N)
    s15, s20, e3 = SK.get("S15"), SK.get("S20"), SK.get("E3")
    if s15:
        f0 = (s15.get("relight") or [{"f": s15["a"] + 20}])[0]["f"]
        m_call = 0.75 * np.clip(np.minimum((t - T.fr(f0)) / 0.6, (T.fr(s15["b"]) + 0.12 - t) / 0.24), 0, 1)
    if s20:
        m_slow = 0.85 * np.clip(np.minimum((t - T.fr(s20["a"]) + 0.1) / 0.3, (T.fr(s20["b"]) + 0.1 - t) / 0.25), 0, 1)
    if e3:
        m_tape = 0.85 * np.clip((t - T.fr(e3["a"])) / 0.02, 0, 1)
    out = (out * (1 - m_call - m_slow - m_tape)[None, :] + lp(out, BED_CALL_HZ, 2) * dbg(-1.5) * m_call[None, :]
           + lp(out, BED_SLOW_HZ, 2) * dbg(-1.0) * m_slow[None, :] + bp(out, BED_TAPE[0], BED_TAPE[1], 2) * m_tape[None, :])
    hush_a = T.bt("sawClownEnd") + 0.02 if "sawClownEnd" in B else None
    if hush_a is not None and e3:
        h = np.clip(np.minimum((t - hush_a) / 0.05, (T.fr(e3["a"]) + 0.03 - t) / 0.03), 0, 1)
        out *= dbg(BED_HUSH_DB * h)[None, :]
    mh = mind_hush()                             # p3: the breath before "Their bodies dodged it." (the score is silent there too)
    if mh:
        h = np.clip(np.minimum((t - mh[0]) / 0.06, (mh[1] + 0.25 - t) / 0.25), 0, 1)
        out *= dbg(BED_HUSH_DB * h)[None, :]
    rw = e3_rewind()                             # p3: the HOLD of E3: the bed fades out as it starts and stays out under "money?";
    if rw:                                       # the tape's rewind to the seam brings it back ("on tape") for the loop
        h0, h1 = T.fr(rw["a"] + rw["r1"]), T.fr(rw["a"] + rw["r1"] + rw["hold"])
        g_h = 1.0 - np.clip(np.minimum((t - h0) / 0.12, (h1 + 0.04 - t) / 0.04), 0, 1)
        out *= g_h[None, :]
    out *= g_sq[None, :]
    # the office: room tone + the wall clock (tick, tock), only where the office plays
    room = G.room_tone(N, r, hum=0.02, air=1.0)
    L = integrated(room)
    office = room * dbg(v_ref + BED["room"] - L)
    of = [s for s in T.SHOTS.values() if s["set"] != "square"]
    ticks = np.zeros(N)
    n_t = 0
    if of:
        a, z = T.fr(min(s["a"] for s in of)), T.fr(max(s["b"] for s in of))
        tk = SM.takes("tick")
        tm = a + 0.35
        while tm < z - 0.1 and tk:
            _, x = tk[(1 if n_t % 2 else 3) % len(tk)]
            x = lp(SM.pitch(x, -2.0 if n_t % 2 else 0.0), 6500.0, 2)
            G._place_mono(ticks, x / (np.max(np.abs(x)) + 1e-12) * (0.8 if n_t % 2 else 1.0), tm - SM.onset(x))
            tm += CLOCK_PERIOD
            n_t += 1
        on_o = np.abs(ticks) > 1e-5
        if on_o.any():
            pk = momentary_max(st(ticks))
            ticks = ticks * dbg(v_ref + BED["tick"] - pk) if np.isfinite(pk) else ticks
        ir = make_ir(0.4, 78, pre=0.006, hf=1.4, early=[(0.011, 0.4, -0.3), (0.019, 0.3, 0.4)])
        i0, i1 = max(0, ns(a) - ns(0.5)), min(N, ns(z) + ns(1.0))
        office[:, i0:i1] += pan(ticks[i0:i1], 0.3) + 0.5 * convolve_st(0.25 * ticks[i0:i1], ir)
    out += office * g_of[None, :]
    rows.append(("room", BED["room"], "the office (S2-S5): a warm quiet room tone"))
    rows.append(("tick", BED["tick"], f"the office wall clock: {n_t} soft ticks, one every {CLOCK_PERIOD:.1f} s (two real click takes: tick, tock), "
                 "a little right, in the room's own reverb"))
    return hp(out, 28, 2), rows


if __name__ == "__main__":
    # python -s sfx.py : the selection only (no audio): what every cue of the three files becomes
    C, rows, problems = cues()
    hard_rule(C)
    rep = write_report(C, rows, problems)
    for p in problems:
        print("PROBLEM", p)
    print("counts", rep["counts"], "| duck frames", DUCK_F, "| E1 pops", e1_pops(), "| E3", e3_rewind())
    if rep["unmapped"]:
        print("UNMAPPED NAMES:", ", ".join(rep["unmapped"]))
    ev = [c for c in C if c.kind == "sync" and c.cls != "step"]
    print(f"{len(ev)} events, {len([c for c in C if c.cls == 'step'])} footsteps of {len({(c.shot, c.walker) for c in C if c.cls == 'step'})} walkers, "
          f"{len([c for c in C if c.kind == 'long'])} loops")
    for c in C:
        if c.cls == "step" and "--steps" not in sys.argv:
            continue
        print(f"  f {c.f0:7.1f} {c.shot:<4} {c.name:<18} {c.level:6.1f} LU pan {c.p:+.2f} prio {c.prio} | {c.label[:70]}")
    print("NOT SOUNDED:")
    for r in rows:
        if r["status"] not in ("play", "step", "loop", "roll"):
            print(f"  f {r['f']:7.1f} {r['shot']:<4} {r['name']:<18} {r['status']:<8} {r['why']}")

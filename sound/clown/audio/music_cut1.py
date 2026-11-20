# Original score for "The Clown Nobody Saw": a light, bouncy TOY-CIRCUS TWO-STEP, composed and synthesized here
# (instruments.py). No drums, no known tune: the theme is our own (a "honk-honk" head, two repeated staccato notes and a
# skip down: G G E C | D E G). The band: pizzicato bass on every beat (root, fifth: the "oom"), a small tuba doubling it
# in the full sections, marimba chords on the off-beats (the "pah") with a celesta on top, a muted trumpet (full
# sections) or a clarinet (light sections) carrying the tune, a tick-tock woodblock for the count, plucked strings for the
# sly money variation. C major; A minor for the "invisible" call and the money.
#
# Timing: TEMPO REGIONS anchored to the narration (timeline.py reads the BEAT names at run time): every region starts on
# the first word of its clause and holds a whole number of beats near 110 bpm, so a new voice take only needs
# `python mix.py`. The arrangement by section, all keyed to BEAT names:
#   hook    0 .. count          full and cheeky from frame 0 (the bulb horn plays the head's two notes, the trumpet answers);
#                               a "dum-DUM" button under "Your turn."
#   count   count .. howMany    thins to a bar-line bass + a tick-tock woodblock + a celesta "thinking" chime; three tune
#                               FRAGMENTS on the clarinet; a celesta run up while the facade clock spins its hour
#   tada    howMany .. soWho    a held question, a stab ON "Five.", a little ta-da on "You saw him." -> "Easy."
#   light   soWho .. but        the tune returns, light (clarinet + celesta, no tuba) under the interviews and the tally
#   call    but .. callEnd      MUFFLED (low-passed, dry, narrow: we are inside her phone call), the tune in A minor, low
#   hole    callEnd .. one19    music OUT: a real hole in the beat before "Just 1 in 4"
#   turn    one19 .. yourEyes   a small soft STING on "1 in 4" (vibes + a low pizz), nothing under "saw the clown.", then
#                               a three-beat scurry and a stab as she spins round
#   reason  yourEyes .. soThe   muffled again (deeper once her mind takes the call); a music-box figure floats up with her
#                               mind, un-muffled (the call bubble is the bright place)
#   money   soThe .. they       a new, sly TIP-TOE variation (staccato bass, plucked off-beats, the theme bent to A minor);
#                               a falling two-note dip on each duck; a dead stop for "6 in 100."
#   duck    they .. thatBranch  slow motion: the tip-toe on a slowing tape (render() warps this window: pitch and tempo
#                               drop together)
#   reveal  thatBranch .. clown32End   a dominant build (pedal bass, a marimba roll, the count's tick-tock back under "while
#                               you counted"), then the theme's head returns under "You saw the clown."
#   final   clown32End .. end   everything stops for the beat before "Did you see the money?"; then a tick-tock pickup
#                               that climbs G A B and swells into the CUT at the last frame: the loop restarts on the
#                               frame-0 honk and the C major downbeat it was reaching for. No fade, no tail past the end.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, shelf
import instruments as I
import timeline as T

N = ns(T.DUR)
F = I.m2f
BPM0 = 110.0
SWING = 0.0             # a straight two-step
MUFFLE_HZ = 760.0       # "heard through a phone call": the low-pass of the muffled sections
MUFFLE_SIDE = 0.25      # ... and how much stereo width is left
MUFFLE_GAIN = 2.0       # dB make-up on the muffled bus
SLOW_RATE = 0.84        # shot 8: the tape slows to this (about -3 semitones)

# ---------------------------------------------------------------- harmony: (bass root, bass fifth, off-beat chord)
CH = {
    "C": (36, 43, [64, 67, 72]), "C6": (36, 43, [64, 67, 69, 72]), "G7": (43, 38, [62, 65, 71]), "G7sus": (43, 38, [62, 65, 72]),
    "F": (41, 36, [65, 69, 72]), "Dm7": (38, 45, [62, 65, 69, 72]), "Dm": (38, 45, [62, 65, 69]), "A7": (45, 40, [61, 64, 67]),
    "Am": (45, 40, [60, 64, 69]), "E7": (40, 47, [62, 64, 68]), "Fmaj7": (41, 36, [57, 60, 64]),
}

# THE THEME (our own): (beat, midi, length in beats, velocity), 16 beats over C | F G7 | C A7 | Dm7 G7 C
TUNE = [(0, 79, .4, .9), (.5, 79, .4, .8), (1, 76, .5, .75), (1.5, 72, .5, .7), (2, 74, .5, .75), (2.5, 76, .5, .8), (3, 67, .9, .8),
        (4, 69, .4, .85), (4.5, 69, .4, .75), (5, 72, .5, .7), (5.5, 77, .5, .8), (6, 76, .5, .75), (6.5, 74, .5, .7), (7, 71, .9, .8),
        (8, 79, .4, .9), (8.5, 79, .4, .8), (9, 76, .5, .75), (9.5, 72, .5, .7), (10, 81, .75, .9), (10.75, 79, .25, .7), (11, 76, .9, .8),
        (12, 77, .5, .8), (12.5, 74, .5, .7), (13, 71, .5, .7), (13.5, 74, .5, .75), (14, 72, 1.2, .9)]
PROG = [(0, "C"), (4, "F"), (6, "G7"), (8, "C"), (10, "A7"), (12, "Dm7"), (13, "G7"), (14, "C")]
# the theme bent to A minor (the call), over Am | F E7 | Am
MINOR = [(0, 76, .4, .85), (.5, 76, .4, .75), (1, 72, .5, .7), (1.5, 69, .5, .7), (2, 71, .5, .7), (2.5, 72, .5, .75), (3, 64, .9, .75),
         (4, 65, .4, .8), (4.5, 65, .4, .7), (5, 69, .5, .7), (5.5, 72, .5, .75), (6, 71, .5, .7), (6.5, 68, .5, .7), (7, 64, .9, .75),
         (8, 76, .4, .8), (8.5, 76, .4, .7), (9, 72, .5, .7), (9.5, 69, .5, .7), (10, 69, .5, .7)]
# the sly tip-toe (the money): staccato, a sneaking G#
SLY = [(0, 76, .3, .8), (.5, 76, .3, .7), (1, 72, .3, .7), (1.5, 69, .3, .7), (2, 68, .3, .75), (2.5, 69, .3, .7), (3, 64, .6, .75),
       (4, 65, .3, .8), (4.5, 65, .3, .7), (5, 69, .3, .7), (5.5, 74, .3, .75), (6, 72, .3, .7), (6.5, 71, .3, .7), (7, 68, .6, .75),
       (8, 76, .3, .8), (8.5, 76, .3, .7), (9, 72, .3, .7), (9.5, 69, .3, .7),
       (12, 77, .3, .75), (12.5, 72, .3, .7), (13, 69, .3, .7), (13.5, 72, .3, .7), (14, 76, .4, .8), (14.5, 79, .4, .8),
       (16, 71, .3, .7), (16.5, 74, .3, .7), (17, 76, .3, .75), (17.5, 80, .6, .8)]


class Grid:
    """a tempo region: t0..t1 holds a whole number of beats near BPM0"""

    def __init__(self, name, t0, t1, bpm=BPM0, nb=None):
        self.name, self.t0, self.t1 = name, float(t0), float(t1)
        d = max(1e-3, self.t1 - self.t0)
        self.nb = nb or max(1, int(round(d / (60.0 / bpm))))
        self.bl = d / self.nb

    def t(self, b, swing=True):
        fl = np.floor(b + 1e-9)
        f = b - fl
        if swing and abs(f - 0.5) < 1e-6:
            f += SWING
        return self.t0 + (fl + f) * self.bl

    def b(self, t):
        return (t - self.t0) / self.bl

    def bpm(self):
        return 60.0 / self.bl


class Band:
    def __init__(self):
        self.tr, self.send, self.cues, self.mutes = {}, {}, [], []
        self.muffle = []                # (t0, t1, depth 0..1): the muffled windows (tracks named x_* stay clear)
        self.warps = []                 # (t0, t1, rate): tape slow-down windows
        self.end_fade = None            # None = the score is CUT at the last sample (the loop restarts on the honk)

    def track(self, name, send=0.15):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        if t >= T.DUR or t < 0:
            return
        buf = self.track(name)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(2010)


def _r():
    return rng(int(R.integers(1 << 30)))


def hum(t, ms=4.0):
    """humanized onset; never before 4 ms so nothing starts mid-waveform at the loop point (frame 0)"""
    return max(0.004, t + R.normal(0, ms / 1000.0))


def vj(v):
    return v * R.uniform(0.92, 1.05)


def anchors():
    A = {k: T.bt(k) for k in T.BEAT}
    A["last"] = T.LAST_WORD_END
    return A


def grids(A=None):
    A = A or anchors()
    money = Grid("money", A["soThe"], A["they"])
    return {
        "hook": Grid("hook", 0.0, A["count"], nb=10),
        "count": Grid("count", A["count"], A["howMany"]),
        "tada": Grid("tada", A["five"], A["soWho"]),
        "light": Grid("light", A["soWho"], A["but"]),
        "call": Grid("call", A["but"], A["just"]),
        "turn": Grid("turn", A["many"], A["yourEyes"]),
        "reason": Grid("reason", A["yourEyes"], A["soThe"]),
        "money": money,
        "duck": Grid("duck", A["they"], A["they"] + 3 * money.bl, nb=3),      # SOURCE time: render() slows this window
        "reveal": Grid("reveal", A["thatBranch"], A["youSawThe"], bpm=118.0),
        "tag": Grid("tag", A["youSawThe"], A["clown32End"], nb=2),
        "final": Grid("final", A["didYou"], T.DUR, nb=4),
    }


def sync_points():
    """what the SFX borrow from the score: the beat length under the music listener (the headphones leak in tempo)"""
    g = grids()
    return {"bl_light": g["light"].bl, "bl_money": g["money"].bl}


def sections():
    A = anchors()
    return [("hook", 0.0, A["count"]), ("count", A["count"], A["howMany"]), ("tada", A["howMany"], A["soWho"]),
            ("light", A["soWho"], A["but"]), ("call", A["but"], A["callEnd"]), ("hole", A["callEnd"], A["one19"]),
            ("turn", A["one19"], A["yourEyes"]), ("reason", A["yourEyes"], A["soThe"]), ("money", A["soThe"], A["they"]),
            ("duck", A["they"], A["thatBranch"]), ("reveal", A["thatBranch"], A["clown32End"]), ("final", A["clown32End"], T.DUR)]


SECTIONS = sections()


# ---------------------------------------------------------------- players
def chord_at(prog, beat):
    cur = prog[0][1]
    for b0, name in prog:
        if beat + 1e-6 >= b0:
            cur = name
    return cur


def _ok(t, until, from_t):
    return t < T.DUR and (until is None or t < until) and (from_t is None or t >= from_t)


def oom(b, g, prog, b0, b1, vel=0.6, tuba=0.0, until=None, from_t=None, stacc=0.3, every=1):
    """the 'oom': pizzicato bass on every beat (root on the even beats, the fifth on the odd ones), a tuba on top in
    the full sections"""
    for k in range(int(b0), int(np.ceil(b1)), every):
        t = g.t(k)
        if not _ok(t, until, from_t):
            continue
        root, fifth, _ = CH[chord_at(prog, k)]
        m = root if (k - int(b0)) % 2 == 0 or every > 1 else fifth
        acc = 1.0 if (k - int(b0)) % 2 == 0 else 0.86
        b.add("bass", I.bass_pizz(F(m), vj(vel * acc), _r(), length=min(stacc, g.bl * 0.7)), hum(t, 3), 0.0)
        if tuba > 0:
            b.add("tuba", I.tuba(F(m + 12), min(0.2, g.bl * 0.42), vj(vel * tuba * acc), _r()), hum(t, 3), -0.08)


def pah(b, g, prog, b0, b1, vel=0.4, cel=0.0, until=None, from_t=None, low=0):
    """the 'pah': a short marimba chord on every off-beat, a celesta note on top when cel > 0"""
    for k in range(int(b0), int(np.ceil(b1))):
        t = g.t(k + 0.5)
        if not _ok(t, until, from_t):
            continue
        tones = CH[chord_at(prog, k + 0.5)][2]
        t_ = hum(t, 3)
        for j, m in enumerate(tones):
            b.add("pah", I.marimba(F(m + low), vj(vel), _r(), dur=0.3, damp=0.13, mallet=0.6), t_ + 0.004 * j, 0.32 - 0.14 * j)
        if cel > 0:
            b.add("keys", I.celesta(F(tones[-1] + 12), vj(vel * cel), _r(), dur=0.45), t_, 0.38)


def note(b, inst, t, m, vel, dur, p=None):
    """one note of a named instrument at time t (s), dur in seconds"""
    if inst == "trumpet":
        b.add("tune", I.muted_trumpet(F(m), max(0.07, dur * 0.88), vj(vel), _r(), vib=0.5), hum(t, 3), -0.16 if p is None else p)
    elif inst == "clarinet":
        b.add("reed", I.clarinet(F(m), max(0.07, dur * 0.9), vj(vel), _r()), hum(t, 3), 0.16 if p is None else p)
    elif inst == "celesta":
        b.add("keys", I.celesta(F(m), vj(vel), _r(), dur=max(0.4, dur * 1.6)), hum(t, 2), 0.3 if p is None else p)
    elif inst == "glock":
        b.add("keys", I.glock(F(m), vj(vel), _r(), dur=max(0.6, dur * 2.0)), hum(t, 2), 0.22 if p is None else p)
    elif inst == "pluck":
        b.add("pluck", I.pluck(F(m), vj(vel), _r(), dur=min(0.55, max(0.18, dur * 1.3)), bright=0.6), hum(t, 2), -0.2 if p is None else p)
    elif inst == "marimba":
        b.add("pah", I.marimba(F(m), vj(vel), _r(), dur=max(0.3, dur * 1.4)), hum(t, 2), 0.2 if p is None else p)
    elif inst == "vibes":
        b.add("keys", I.vibes(F(m), vj(vel), _r(), dur=max(0.8, dur), trem_depth=0.12), hum(t, 3), 0.1 if p is None else p)
    elif inst == "musicbox":
        b.add("x_box", I.musicbox(F(m), vj(vel), _r(), dur=max(0.7, dur)), hum(t, 2), 0.25 if p is None else p)
    else:
        raise KeyError(inst)


def line(b, inst, g, notes, b0=0.0, vel=1.0, tr=0, until=None, from_t=None, p=None):
    for bt_, m, ln, v in notes:
        t = g.t(b0 + bt_)
        if _ok(t, until, from_t):
            note(b, inst, t, m + tr, v * vel, ln * g.bl, p)


def ticktock(b, g, b0, b1, vel=0.32, until=None, from_t=None, v1=None):
    """the count's clock: a woodblock 'tick' on the even beats, a lower 'tock' on the odd ones"""
    ks = list(range(int(b0), int(np.ceil(b1))))
    for i, k in enumerate(ks):
        t = g.t(k)
        if not _ok(t, until, from_t):
            continue
        v = vel if v1 is None else vel + (v1 - vel) * i / max(1, len(ks) - 1)
        b.add("tick", I.woodblock(vj(v), _r(), f=1480.0 if k % 2 == 0 else 1040.0, dur=0.13), hum(t, 2), -0.3)


def stab(b, t, name, vel=0.6, tuba=False, glock=None, bass=True, low=0):
    """a short tutti chord"""
    root, _, tones = CH[name]
    t_ = hum(t, 2)
    if bass:
        b.add("bass", I.bass_pizz(F(root), vj(vel), _r(), length=0.34), t_, 0.0)
    if tuba:
        b.add("tuba", I.tuba(F(root + 12), 0.2, vj(vel * 0.6), _r()), t_, -0.08)
    for j, m in enumerate(tones):
        b.add("pah", I.marimba(F(m + low), vj(vel * 0.75), _r(), dur=0.45, damp=0.2, mallet=0.7), t_ + 0.004 * j, 0.3 - 0.14 * j)
    if glock:
        b.add("keys", I.glock(F(glock), vj(vel * 0.5), _r(), dur=1.1), t_, 0.2)


def silence(b, a, z):
    if z > a:
        b.mutes.append((a, z))


# ---------------------------------------------------------------- the score
def build():
    b = Band()
    for name, send in [("bass", 0.04), ("tuba", 0.06), ("pah", 0.14), ("keys", 0.2), ("tune", 0.14), ("reed", 0.14), ("pluck", 0.12),
                       ("tick", 0.08), ("roll", 0.16), ("x_box", 0.2), ("tri", 0.18)]:
        b.track(name, send)
    A = anchors()
    g = grids(A)
    ce = lambda t, d: b.cues.append((t, d))

    # ---------------- HOOK (0 .. "Count"): full and cheeky, in with the honk. The bulb horn plays the head's two repeated
    # notes at frame 0 (sfx.py), the muted trumpet answers from beat 1; "Your turn." gets a dum-DUM button
    H = g["hook"]
    pH = PROG[:3]
    oom(b, H, pH, 0, 8, 0.62, tuba=0.55)
    pah(b, H, pH, 0, 8, 0.42, cel=0.5)
    head = [n for n in TUNE if 1 <= n[0] < 8]
    line(b, "trumpet", H, head)
    line(b, "celesta", H, head, vel=0.42, tr=12)
    note(b, "glock", 0.004, 96, 0.3, 0.6)
    for k in (1, 3, 5, 7):                                    # a soft triangle on the back half of each bar (air, no drums)
        b.add("tri", I.triangle(vj(0.3), _r(), dur=0.5), hum(H.t(k + 0.5), 3), 0.42)
    stab(b, H.t(8), "G7", 0.6, tuba=True)
    stab(b, H.t(9), "C", 0.7, tuba=True, glock=96)
    ce(0.0, f"HOOK ({H.bpm():.0f} bpm): the full two-step from frame 0 (pizz bass + tuba, marimba off-beats, celesta); the horn's "
            "honk-honk is the head, the muted trumpet answers; a dum-DUM button under 'Your turn.'")

    # ---------------- THE COUNT ("Count" .. "How many phones?"): bass on the bar lines, the tick-tock, a thinking chime,
    # tune FRAGMENTS only; a celesta run up while the clock spins
    Ct = g["count"]
    pC = [(0, "C"), (4, "Am"), (8, "F"), (12, "G7"), (16, "C"), (20, "G7sus")]
    t_ask = A["howMany"] - 0.04
    oom(b, Ct, pC, 0, Ct.nb, 0.46, until=t_ask, every=2, stacc=0.42)
    ticktock(b, Ct, 0, Ct.nb, 0.3, until=t_ask)
    for k in range(0, Ct.nb, 4):                              # (bar lines: >= 20 f from both duck frames of the count)
        if Ct.t(k) < t_ask:
            note(b, "celesta", Ct.t(k), CH[chord_at(pC, k)][2][-1] + 12, 0.22, 0.6)
    line(b, "clarinet", Ct, [(0, 67, .4, .6), (.5, 67, .4, .55), (1, 64, .9, .55)], b0=3, until=t_ask)
    line(b, "clarinet", Ct, [(0, 69, .4, .6), (.5, 69, .4, .55), (1, 72, .9, .55)], b0=11, until=t_ask)
    line(b, "clarinet", Ct, [(0, 62, .4, .55), (.5, 64, .4, .55), (1, 67, .9, .6)], b0=19, until=t_ask)
    run = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91]
    for k, m in enumerate(run):
        note(b, "celesta", A["hour"] + (A["sculpture"] - A["hour"]) * k / len(run), m, 0.15 + 0.008 * k, 0.3, p=0.0 + 0.04 * k)
    ce(A["count"], f"THE COUNT ({Ct.bpm():.0f} bpm): thins to a bar-line bass + tick-tock woodblock + a celesta chime; three clarinet "
                   "fragments of the tune; a celesta run up from 'hour' (the clock spins)")

    # ---------------- "How many phones?" a held question -> a stab ON "Five." -> the little ta-da
    b.add("bass", I.bass_pizz(F(43), 0.5, _r(), length=0.5), A["howMany"] + 0.01, 0.0)
    note(b, "celesta", A["howMany"] + 0.02, 86, 0.3, 0.7)
    note(b, "clarinet", A["phonesQ"], 74, 0.45, 0.35)
    stab(b, A["five"], "C", 0.7, tuba=True, glock=96)
    Td = g["tada"]
    ticktock(b, Td, 1, 3, 0.3, until=A["youSaw"] - 0.05)
    note(b, "clarinet", A["andTheClown"] + 0.05, 76, 0.5, 0.22)
    note(b, "clarinet", A["clownQ"], 79, 0.55, 0.4)
    t_land = T.word("him", A["youSaw"])["e"] + 0.015         # the breath after 'You saw him.' (the clown's honk is there too)
    t_ta = t_land - 0.42
    for k, m in enumerate((67, 72, 76)):
        note(b, "clarinet", t_ta + 0.13 * k, m, 0.5 + 0.05 * k, 0.12)
    note(b, "trumpet", t_land, 79, 0.85, 0.2)
    stab(b, t_land, "C", 0.7, tuba=True)
    b.add("tri", I.triangle(0.35, _r(), dur=0.6), t_land, 0.42)
    t_da = T.word("Easy", A["easy"] - 0.1)["e"] + 0.02           # ... and the button in the breath after 'Easy.'
    stab(b, t_da, "C6", 0.56, tuba=True)
    for k, m in enumerate((84, 88, 91)):                        # short: 'So who didn't?' follows at once
        note(b, "celesta", t_da + 0.028 * k, m, 0.3, 0.2)
    ce(A["howMany"], "'How many phones?': the tick-tock stops on a held question; a C stab ON 'Five.' (with the chip's ding); the "
                     "ta-da: a clarinet run up under 'You saw him.', the landing (with the clown's honk) in the breath after it, the button after 'Easy.'")

    # ---------------- LIGHT (the interviews, the tally): the tune returns on clarinet + celesta, no tuba
    L = g["light"]
    pL = PROG[:5] + [(12, "Dm7")]
    t_lz = A["but"] - 0.02
    oom(b, L, pL, 0, L.nb, 0.5, until=t_lz)
    pah(b, L, pL, 0, L.nb, 0.3, until=t_lz)
    body = [n for n in TUNE if n[0] < min(12, L.nb - 0.5)]
    line(b, "clarinet", L, body, vel=0.64, until=t_lz)
    line(b, "celesta", L, body, vel=0.33, tr=12, until=t_lz)
    ce(A["soWho"], f"LIGHT ({L.bpm():.0f} bpm): the tune returns on the clarinet with a celesta an octave up, pizz bass + marimba only")

    # ---------------- THE CALL ("But to one group ..." .. "a phone call."): muffled, A minor, the tune an octave down
    Cl = g["call"]
    pM = [(0, "Am"), (4, "F"), (6, "E7"), (8, "Am")]
    t_cut = A["callEnd"] + 0.03
    oom(b, Cl, pM, 0, Cl.nb, 0.56, until=t_cut)
    pah(b, Cl, pM, 0, Cl.nb, 0.36, until=t_cut, low=-12)
    line(b, "clarinet", Cl, MINOR, vel=0.85, tr=-12, until=t_cut)
    b.muffle.append((A["but"] - 0.13, t_cut + 0.2, 1.0))
    silence(b, t_cut, A["one19"] - 0.03)
    ce(A["but"], f"THE CALL ({Cl.bpm():.0f} bpm): MUFFLED (low-pass {MUFFLE_HZ:.0f} Hz, dry, narrow), the tune in A minor an octave down")
    ce(A["callEnd"], "music OUT: a real hole through the beat before 'Just 1 in 4'")

    # ---------------- the STING on "1 in 4" (soft), nothing under "saw the clown.", then the turn-around scurry
    ts = A["one19"]
    b.add("bass", I.bass_pizz(F(41), 0.5, _r(), length=1.0), ts + 0.004, 0.0)
    for j, m in enumerate(CH["Fmaj7"][2] + [69]):
        note(b, "vibes", ts + 0.014 * j, m, 0.3, 1.3, p=-0.2 + 0.12 * j)
    note(b, "glock", ts + 0.05, 88, 0.16, 0.9)
    Tu = g["turn"]
    for k, m in enumerate((64, 65, 66, 67)):
        t = Tu.t(k * 0.5)
        if t < A["toLook"] - 0.05:
            note(b, "pluck", t, m, 0.6, 0.2)
            b.add("tick", I.woodblock(0.26, _r(), f=1250.0 + 90 * k, dur=0.1), hum(t, 2), -0.3)
    b.add("bass", I.bass_pizz(F(40), 0.5, _r(), length=0.3), hum(A["many"], 2), 0.0)
    stab(b, A["toLook"], "G7", 0.62, tuba=True)
    note(b, "trumpet", A["toLook"], 77, 0.7, 0.16)
    silence(b, A["lookEnd"] + 0.02, A["yourEyes"] - 0.02)
    ce(ts, "a small soft STING on '1 in 4' (a low pizz + a rolled vibes chord, Fmaj7), then nothing under 'saw the clown.'")
    ce(A["many"], "the turn-around: a three-beat pizzicato scurry, a G7 stab as she sees him")

    # ---------------- THE REASON: muffled again, deeper when her mind takes the call; the music box floats up clear
    Rs = g["reason"]
    walk = [36, 43, 45, 40, 41, 43, 43, 43]
    for k in range(Rs.nb):
        b.add("bass", I.bass_pizz(F(walk[k % len(walk)]), vj(0.5), _r(), length=0.3), hum(Rs.t(k), 3), 0.0)
    pah(b, Rs, [(0, "C"), (2, "Am"), (4, "F"), (5, "G7")], 0, Rs.nb, 0.26, low=-12)
    line(b, "clarinet", Rs, [(0, 64, 2, .6), (2, 60, 1.6, .55), (4, 57, 1, .5), (5, 59, .9, .5)], vel=0.9)
    b.muffle.append((A["yourEyes"] - 0.13, A["yourMind"], 0.65))
    b.muffle.append((A["yourMind"] - 0.07, A["soThe"] + 0.1, 1.0))
    for k, m in enumerate((72, 76, 79, 84)):
        note(b, "musicbox", A["mind"] + 0.085 * k, m, 0.3 + 0.03 * k, 0.9, p=0.1 + 0.08 * k)
    for k, m in enumerate((88, 91)):
        note(b, "musicbox", A["call22"] + 0.06 * k, m, 0.36, 1.0, p=0.3)
    ce(A["yourEyes"], f"THE REASON ({Rs.bpm():.0f} bpm): muffled again, deeper from 'Your mind'; a clear music-box figure rises with her "
                      "mind and plinks in the call bubble on 'call.'")

    # ---------------- THE MONEY: the sly tip-toe (A minor): staccato bass, plucked off-beats, the bent theme
    M = g["money"]
    pT = [(0, "Am"), (4, "Dm"), (6, "E7"), (8, "Am"), (12, "F"), (14, "C"), (16, "E7"), (18, "Am")]
    nbm = min(18, M.nb - 2)
    oom(b, M, pT, 0, nbm, 0.5, stacc=0.16)
    for k in range(nbm):
        tones = CH[chord_at(pT, k + 0.5)][2]
        note(b, "pluck", M.t(k + 0.5), tones[(k * 2 + 1) % len(tones)] + 12, 0.3, 0.2, p=0.25)
        b.add("tick", I.woodblock(vj(0.16), _r(), f=1900.0, dur=0.07), hum(M.t(k), 2), -0.3)
    sly = [n for n in SLY if n[0] < nbm]
    line(b, "pluck", M, sly, vel=0.72)
    line(b, "clarinet", M, sly, vel=0.4, tr=-12)
    for nm in ("nearly", "everyone", "ducked"):                # a falling two-note dip on each duck (the limbo)
        note(b, "pluck", A[nm] + 0.01, 84, 0.5, 0.15, p=0.1)
        note(b, "pluck", A[nm] + 0.085, 72, 0.44, 0.2, p=0.1)
    for k, m in enumerate((84, 88, 91)):                        # the one who stops: a major glint
        note(b, "celesta", A["stoppedFor"] + 0.07 * k, m, 0.3, 0.6)
    t_stop = M.t(nbm)
    b.add("bass", I.bass_pizz(F(45), 0.62, _r(), length=0.3), hum(t_stop, 2), 0.0)
    note(b, "pluck", t_stop, 57, 0.6, 0.3, p=0.0)
    silence(b, t_stop + 0.34, A["they"] - 0.02)
    ce(A["soThe"], f"THE MONEY ({M.bpm():.0f} bpm): a sly tip-toe variation in A minor (staccato pizz bass, plucked off-beats, the theme "
                   "with a sneaking G#); a falling two-note dip on each duck; a major glint for the one who stops; a dead stop for '6 in 100.'")

    # ---------------- THE DUCK (slow motion): three tip-toe beats on a slowing tape (render() warps this window)
    Dk = g["duck"]
    for k, (mb, mp_) in enumerate(((45, 76), (40, 72), (45, 69))):
        b.add("bass", I.bass_pizz(F(mb), vj(0.55), _r(), length=0.3), hum(Dk.t(k), 2), 0.0)
        note(b, "pluck", Dk.t(k + 0.5), mp_, 0.5, 0.3, p=0.2)
        note(b, "clarinet", Dk.t(k), mp_ - 12, 0.4, Dk.bl * 0.9)
    b.warps.append((A["they"] - 0.02, A["thatBranch"] - 0.03, SLOW_RATE))
    ce(A["they"], f"THE DUCK: slow motion - the tip-toe on a tape slowing to x{SLOW_RATE:.2f} (pitch and tempo drop together)")

    # ---------------- THE REVEAL: a dominant build under the shimmer (sfx.py), the count's tick-tock back under
    # "while you counted", then the theme's head under "You saw the clown."
    Rv = g["reveal"]
    for k in range(Rv.nb):
        u = k / max(1, Rv.nb - 1)
        m = 41 if k < 2 else 43
        b.add("bass", I.bass_pizz(F(m), vj(0.4 + 0.4 * u), _r(), length=0.34), hum(Rv.t(k), 3), 0.0)
        if u > 0.5:
            b.add("tuba", I.tuba(F(m + 12), 0.2, vj(0.2 + 0.4 * u), _r()), hum(Rv.t(k), 3), -0.08)
    ticktock(b, Rv, 0, Rv.nb, 0.26, from_t=A["twoPeople"] - 0.05, v1=0.42)
    t_r0 = A["hung"]
    b.add("roll", I.marimba_roll([F(m) for m in (62, 65, 67, 72)], A["youSawThe"] - t_r0 - 0.03, 0.5, _r(), swell=(0.15, 1.0)), t_r0, 0.0)
    for k, m in enumerate((62, 65, 67, 71)):
        t = Rv.t(2 + 2 * k)
        if t < A["youSawThe"] - 0.3:
            note(b, "clarinet", t, m, 0.45 + 0.08 * k, min(2 * Rv.bl, A["youSawThe"] - t - 0.05))
    Tg = g["tag"]
    oom(b, Tg, [(0, "C")], 0, Tg.nb, 0.7, tuba=0.6)
    pah(b, Tg, [(0, "C")], 0, Tg.nb, 0.45, cel=0.5)
    line(b, "trumpet", Tg, TUNE[:4])
    line(b, "celesta", Tg, TUNE[:4], vel=0.42, tr=12)
    note(b, "glock", Tg.t(0), 96, 0.4, 0.6)
    b.add("tri", I.triangle(0.3, _r(), dur=0.5), hum(Tg.t(1.5), 3), 0.42)
    ce(A["thatBranch"], f"THE REVEAL ({Rv.bpm():.0f} bpm): a dominant build (pedal bass F -> G, a marimba roll swelling, clarinet climbing), "
                        "the count's tick-tock back from 'Two people'")
    ce(A["youSawThe"], "the theme's head (G G E C, full band) under 'You saw the clown.'")

    # ---------------- the BEAT before "Did you see the money?": everything stops; then the pickup that swells into the cut
    silence(b, A["clown32End"] + 0.02, A["didYou"] - 0.012)
    Fn = g["final"]
    ticktock(b, Fn, 0, Fn.nb, 0.32)
    for k, m in enumerate((43, 45, 47, 43)):
        b.add("bass", I.bass_pizz(F(m), vj(0.55 + 0.06 * k), _r(), length=0.32), hum(Fn.t(k), 3), 0.0)
        if k >= 2:
            b.add("tuba", I.tuba(F(m + 12), 0.2, vj(0.4), _r()), hum(Fn.t(k), 3), -0.08)
    b.add("bass", I.bass_pizz(F(47), 0.6, _r(), length=0.2), hum(Fn.t(3.5), 3), 0.0)
    pah(b, Fn, [(0, "G7")], 0, 3, 0.28)
    line(b, "clarinet", Fn, [(0, 74, .9, .55), (1, 77, .9, .6), (2, 79, .9, .65)])
    t_sw = max(A["last"] + 0.03, Fn.t(3) - 0.1)
    d_sw = T.DUR - t_sw
    b.add("roll", I.marimba_roll([F(m) for m in (62, 65, 67, 71)], d_sw, 0.42, _r(), swell=(0.3, 1.0)), t_sw, 0.0)
    b.add("tune", I.muted_trumpet(F(79), d_sw + 0.2, 0.55, _r(), vib=0.0, doit=0.6), t_sw, -0.16)
    b.add("reed", I.clarinet(F(71), d_sw + 0.2, 0.45, _r(), vib=0.0), t_sw, 0.16)
    ce(A["clown32End"], "everything stops for the beat before 'Did you see the money?'")
    ce(A["didYou"], f"the pickup ({Fn.bpm():.0f} bpm): tick-tock, the bass climbing G A B, a clarinet question; after 'money?' a marimba "
                    "roll + a held trumpet G swell into the CUT at the last frame (no fade): frame 0's honk and C major answer it")
    return b


TARGET = {"bass": -3.0, "tuba": -8.0, "pah": -7.0, "keys": -7.5, "tune": -5.5, "reed": -6.0, "pluck": -6.0, "tick": -12.0,
          "roll": -8.0, "x_box": -9.0, "tri": -15.0}
BASS_LOW_SHELF = (100.0, 0.0)


def _window(t0, t1, ramp=0.09):
    t = np.arange(N) / SR
    return np.clip(np.minimum((t - t0) / ramp, (t1 - t) / ramp), 0, 1)


def render(b, ref=-20.0):
    import sfx_clown as X
    room = make_ir(0.85, 11, pre=0.012, hf=1.6, early=[(0.017, 0.35, -0.4), (0.029, 0.25, 0.5)])
    dry = np.zeros((2, N))
    clear = np.zeros((2, N))
    wet = np.zeros(N)
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g
        if k == "bass" and BASS_LOW_SHELF:
            x = shelf(x, BASS_LOW_SHELF[0], BASS_LOW_SHELF[1], "low")
        b.tr[k] = x
        if k.startswith("x_"):
            clear += x
            wet += b.send[k] * x.mean(0)
        else:
            dry += x
            wet += b.send[k] * x.mean(0)
    wet_st = 0.8 * convolve_st(wet, room)
    # the muffled windows: the band heard through her phone call (low-passed, DRY, narrow); x_* tracks stay clear
    m = np.zeros(N)
    for t0, t1, depth in b.muffle:
        m = np.maximum(m, depth * _window(t0, t1))
    if np.any(m > 0):
        mid, side = dry.mean(0), 0.5 * (dry[0] - dry[1])
        muf = lp(np.stack([mid + MUFFLE_SIDE * side, mid - MUFFLE_SIDE * side]), MUFFLE_HZ, 4) * dbg(MUFFLE_GAIN)
        out = (dry + wet_st) * (1 - m)[None, :] + muf * m[None, :] + clear
    else:
        out = dry + wet_st + clear
    out = hp(out, 35, 2)
    for t0, t1, rate in b.warps:                                  # shot 8: the tape slows
        out = X.tape_warp(out, t0, t1, rate)
    # stop-time holes (after the reverb, so the cuts are clean)
    gcur = np.ones(N)
    for a, z in b.mutes:
        ia, iz = ns(a), min(N, ns(z))
        f_out = ns(0.03)
        e = min(N, ia + f_out)
        gcur[ia:e] = np.minimum(gcur[ia:e], np.linspace(1, 0, f_out)[: e - ia])
        gcur[e:iz] = 0.0
        f_in = ns(0.006)
        e2 = min(N, iz + f_in)
        gcur[iz:e2] = np.minimum(gcur[iz:e2], np.linspace(0, 1, f_in)[: e2 - iz])
    if b.end_fade:
        a, z = b.end_fade
        ia, iz = ns(a), min(N, ns(z))
        gcur[ia:iz] *= 10 ** (-60.0 / 20.0 * np.linspace(0, 1, iz - ia))
        gcur[iz:] = 0.0
    else:                                                          # CUT at the seam: only a 3 ms de-click, no musical fade
        k = ns(0.003)
        gcur[-k:] *= np.linspace(1, 0, k)
    out *= gcur[None, :]
    return out, levels

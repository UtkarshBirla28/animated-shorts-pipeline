# Original score for "The Oil Tanks That Were Mostly Water": a sly 1960s CAPER combo, composed and synthesized here
# (instruments.py): a walking upright bass, brushes on a snare (swish circles + taps on 2 and 4) with a hi-hat foot
# chick, finger snaps in the hook and the pipes, light vibes comping, a soft jazz piano in the warm sections, and a
# Harmon-MUTED TRUMPET carrying Tino's sly theme (G-Ab-G, the blue Gb) and the comic buttons. C minor (Cm6 / Fm7 /
# Ab7 / G7b9) for the con; Eb major (its relative major) for the explainer and the Warren Buffett warmth.
#
# Timing: TEMPO REGIONS anchored to the narration (timeline.py reads the words / beats at run time): every region
# starts on the first word of its clause and holds a whole number of beats near 118 bpm, so a region's downbeat lands on
# its word and a new voice take only needs `python mix.py`. Story moves, all keyed to BEAT names:
#   - 'oil.' (shot 2): the band stops on the word; the valve's drip 'plip' lands in the silence
#   - 'climb up,': the bass walks up chromatically C -> G in swung 8ths (the tank man's steps land on its beats:
#     sync_points()['climb'] -> sfx.py ladder clangs), 'drop a tape inside,': a vibes run falls with the tape
#   - 'shout down:' ... "Ninety percent full!": STOP-TIME (the shout and its tank echo play alone)
#   - 'on the ground...' -> 'believed them.': the real silence, then a muted-trumpet 'doo-dwah' shrug after 'them.'
#   - 'So the banks lent more. And more.': the groove; the banker's stamps land on its beats (sync_points()['stamps'])
#   - 'had.' a stop hit; the MYSTERY ('But what if someone did look inside?'): no drums, an arco pedal, motor-vibes
#     chords, a curious vibes question in the gap after 'inside?'
#   - 'crashed.': a trumpet rip down + the bass falling; the storm: a low hit on 'bust.', suspense roll on 'Lenders
#     finally checked the tanks.' -> the music CUTS TO SILENCE on 'Inside...' (and stays silent through 'water.')
#   - 'You see,': the music returns WARM (Eb major, vibes + piano); the vibes climb with the rising oil to 'top.'
#   - 'The hardest-working oil in America.': the band gets tired (a slowing bass, falling) under the blob's sigh
#   - 'Warren Buffett.': the warm swell (vibes roll, piano, the trumpet singing Eb -> G)
#   - 'The trust was real.': Ab -> Eb6/9 ON 'real.' and the score dies with the word (no sting); only the tank-top
#     ambience carries the loop tail into frame 0.
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp, shelf
import instruments as I
import timeline as T

N = ns(T.DUR)
F = I.m2f
BPM0 = 118.0
SWING = 0.15            # off-beat 8ths sit 15 % of a beat late: a real jazz lilt (2/3 triplet = 0.167)

# ---------------------------------------------------------------- harmony
# r = bass root (2nd octave), t = other bass chord tones, v = vibes voicing (rootless, mid register)
CH = {
    "Cm6": dict(r=36, t=[39, 43, 45], v=[60, 63, 67, 69]),
    "Cm7": dict(r=36, t=[39, 43, 46], v=[58, 63, 67, 70]),
    "Cm9": dict(r=36, t=[39, 43, 46], v=[62, 63, 67, 70]),
    "Fm7": dict(r=41, t=[44, 36, 39], v=[60, 63, 65, 68]),
    "Fm9": dict(r=41, t=[44, 36, 39], v=[63, 67, 68, 72]),
    "Ab7": dict(r=32, t=[36, 39, 42], v=[60, 63, 66, 68]),
    "G7": dict(r=31, t=[35, 38, 41], v=[59, 62, 65, 67]),
    "G7b9": dict(r=31, t=[35, 38, 41], v=[59, 62, 65, 68]),
    "Ebmaj7": dict(r=39, t=[43, 34, 38], v=[62, 63, 67, 70]),
    "Ebmaj9": dict(r=39, t=[43, 34, 38], v=[62, 65, 67, 70]),
    "Eb69": dict(r=39, t=[43, 34, 36], v=[60, 62, 65, 67, 70]),
    "Abmaj7": dict(r=32, t=[36, 39, 43], v=[60, 63, 67, 68]),
    "Abmaj9": dict(r=32, t=[36, 39, 43], v=[58, 60, 63, 67]),
    "Bb7": dict(r=34, t=[38, 41, 44], v=[62, 65, 68, 70]),
    "Bb7sus": dict(r=34, t=[39, 41, 44], v=[63, 65, 68, 70]),
    "Abmaj7#11": dict(r=32, t=[36, 39, 43], v=[60, 62, 67]),
    "G7sus": dict(r=31, t=[36, 38, 41], v=[60, 65, 68]),
    "Fmmaj7": dict(r=41, t=[44, 36, 40], v=[60, 64, 65, 68]),
}

# Tino's theme (muted trumpet), 2 bars over Cm6: the sly G-Ab-G turn, a chromatic sneak Eb-F-Gb-G, a wink up to Bb
# (beat, midi, length in beats, velocity)
MOTIF_A = [(0, 67, .5, .85), (.5, 68, .5, .55), (1, 67, .75, .8), (2, 63, .5, .65), (2.5, 65, .5, .6), (3, 66, .5, .7),
           (3.5, 67, 1.5, .85), (5.5, 70, .5, .6), (6, 67, .5, .7), (7, 63, .75, .65)]
# the answer (Ab7 | G7b9): down the blues from C to Gb, landing on the leading tone B
MOTIF_B = [(0, 72, .5, .8), (.5, 70, .5, .65), (1, 68, .5, .7), (1.5, 66, .5, .6), (2, 67, 1.0, .8), (3.5, 68, .5, .6),
           (4, 71, .75, .8), (5, 74, .5, .65), (5.5, 72, .5, .6), (6, 71, 1.5, .75)]
# the warm theme (Eb major)
WARM = [(0, 70, 1.0, .7), (1, 72, .5, .6), (1.5, 74, .5, .65), (2, 75, 1.5, .75), (4, 74, .5, .6), (4.5, 72, .5, .55),
        (5, 70, 2.5, .7)]


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
        self.end_fade = None

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


R = rng(1963)


def _r():
    return rng(int(R.integers(1 << 30)))


def hum(t, ms=4.0):
    """humanized onset; never before 4 ms so nothing starts mid-waveform at the loop point (frame 0)"""
    return max(0.004, t + R.normal(0, ms / 1000.0))


def vj(v):
    return v * R.uniform(0.92, 1.05)


# ---------------------------------------------------------------- anchors and tempo regions
def anchors():
    A = {k: T.bt(k) for k in T.BEAT}
    A["end"] = T.END_T
    A["real_end"] = T.LAST_WORD_END
    try:
        A["down_end"] = float(T.word("down", A["down"] - 0.1)["e"])
    except KeyError:
        A["down_end"] = A["ninety"] - 0.3
    try:
        A["ground_end"] = float(T.word("ground", A["ground"] - 0.1)["e"])
        A["them_end"] = float(T.word("them", A["believed"])["e"])
        A["had_end"] = float(T.word("had", A["had"] - 0.1)["e"])
        A["inside_q_end"] = float(T.word("inside", A["insideQ"] - 0.1)["e"])
        A["america_end"] = float(T.word("America", A["america"] - 0.1)["e"])
        A["buffett_end"] = float(T.word("Buffett", A["buffett"] - 0.1)["e"])
        A["fake_end"] = float(T.word("fake", A["fake"] - 0.1)["e"])
        A["oil1_end"] = float(T.word("oil", A["oil1"] - 0.1)["e"])
        A["crashed2_end"] = float(T.word("crashed", A["crashed2"] - 0.1)["e"])
        A["crashed1_end"] = float(T.word("crashed", A["crashed1"] - 0.1)["e"])
        A["up_end"] = float(T.word("up", A["up"] - 0.1)["e"])
        A["top_end"] = float(T.word("top", A["top"] - 0.1)["e"])
        A["name_end"] = float(T.word("name", A["hisName"])["e"])
    except KeyError:
        pass
    return A


def grids(A=None):
    A = A or anchors()
    return {
        "hook": Grid("hook", 0.0, A["meet"]),
        "setting": Grid("setting", A["meet"], A["oil1"]),
        "bank": Grid("bank", A["banks"], A["butTinos"]),
        "climb": Grid("climb", A["butTinos"], A["up"], nb=4),
        "tape": Grid("tape", A["up"], A["shout"], nb=4),
        "deadpan": Grid("deadpan", A["andInspector"], A["believed"], nb=5),
        "more": Grid("more", A["soBanks"], A["soHow"]),
        "crash": Grid("crash", A["then"], A["company"], nb=10),
        "storm": Grid("storm", A["company"], A["inside"], nb=8),
        "pivot": Grid("pivot", A["youSee"], A["fill"], bpm=112.0),
        "explain": Grid("explain", A["fill"], A["realOil"]),
        "pipes": Grid("pipes", A["realOil"], A["hardest"]),
        "fallout": Grid("fallout", A["whenOut"], A["but"]),
        "investor": Grid("investor", A["but"], A["warren"]),
    }


def sync_points():
    """times (s) the PICTURE should land on, so the actions groove with the score (sfx.py places its cues there and
    cues.md lists the frames for CHAR): the tank man's climb steps (the climb's beats 1-3, the rim on beat 4 = 'up'),
    the banker's happy stamps in shot 5 (the 'more' groove's beats 1, 3, 5)."""
    A = anchors()
    g = grids(A)
    c, m = g["climb"], g["more"]
    return {"climb": [c.t(k, False) for k in (1, 2, 3)], "rim": A["up"],
            "stamps": [m.t(k, False) for k in (1, 3, 5)]}


# ---------------------------------------------------------------- sections (mix.py: level automation)
def sections():
    A = anchors()
    S = [("hook", 0.0, A["meet"]), ("setting", A["meet"], A["banks"]), ("bank", A["banks"], A["butTinos"]),
         ("climb", A["butTinos"], A["ninety"]), ("shout", A["ninety"], A["andInspector"]),
         ("deadpan", A["andInspector"], A["soBanks"]), ("more", A["soBanks"], A["soHow"]), ("mystery", A["soHow"], A["then"]),
         ("crash", A["then"], A["company"]), ("storm", A["company"], A["inside"]), ("reveal", A["inside"], A["youSee"]),
         ("pivot", A["youSee"], A["fill"]), ("explain", A["fill"], A["realOil"]), ("pipes", A["realOil"], A["hardest"]),
         ("tired", A["hardest"], A["whenOut"]), ("fallout", A["whenOut"], A["but"]), ("investor", A["but"], A["warren"]),
         ("swell", A["warren"], A["theOil"]), ("payoff", A["theOil"], A["end"]), ("tail", A["end"], T.DUR)]
    return S


SECTIONS = sections()


# ---------------------------------------------------------------- players
def chord_at(prog, beat):
    c = prog[0][1]
    for b0, ch in prog:
        if beat + 1e-6 >= b0:
            c = ch
    return c


def next_change(prog, beat):
    for b0, ch in prog:
        if b0 > beat + 1e-6:
            return b0, ch
    return None, None


def bass(b, t, m, vel, length=0.4, slide=0.0):
    if t < 0.05:                     # the loop seam: frame 0's first note enters soft
        vel *= 10 ** (-5.0 / 20.0)
    b.add("bass", I.bass_pizz(F(m), vj(vel), _r(), length=length, slide=slide), hum(t, 3), -0.06)


def _near(m, prev, lo=28, hi=46):
    """the octave of pitch class m closest to the previous note, inside the bass range"""
    cands = [m + 12 * k for k in range(-3, 4) if lo <= m + 12 * k <= hi]
    return min(cands, key=lambda x: abs(x - prev)) if cands else m


def walk(b, g, prog, b0, b1, vel=0.7, seed=0, until=None, ghost=True, length=0.85):
    """walking bass: chord root on its first beat, chord tones between, a chromatic approach on the beat before a
    change; a ghosted triplet pickup now and then"""
    r = rng(seed + 77)
    prev = CH[chord_at(prog, b0)]["r"]
    for k in range(int(b0), int(b1)):
        t = g.t(k, False)
        if until is not None and t >= until:
            break
        ch = chord_at(prog, k)
        nb, nch = next_change(prog, k)
        first = any(abs(k - p0) < 1e-6 for p0, _ in prog) or k == int(b0)
        if first:
            m = _near(CH[ch]["r"], prev)
        elif nb is not None and abs(nb - (k + 1)) < 1e-6:
            tgt = _near(CH[nch]["r"], prev)
            m = tgt + (1 if prev > tgt else -1) * (1 if r.random() < 0.8 else -1)
        else:
            opts = [_near(x, prev) for x in CH[ch]["t"]]
            opts = [x for x in opts if x != prev] or [_near(CH[ch]["r"] + 7, prev)]
            m = opts[int(r.integers(len(opts)))]
        accent = 1.0 if k % 2 == 1 else 0.93
        bass(b, t, m, vel * accent, length=g.bl * length)
        if ghost and k % 4 == 3 and r.random() < 0.45:
            tg = t + g.bl * 0.667
            if until is None or tg < until:
                bass(b, tg, m, vel * 0.35, length=g.bl * 0.25)
        prev = m


def twofeel(b, g, prog, b0, b1, vel=0.65, until=None):
    """half-note bass: root, then the fifth / a chord tone"""
    prev = CH[chord_at(prog, b0)]["r"]
    for k in range(int(b0), int(b1), 2):
        t = g.t(k, False)
        if until is not None and t >= until:
            break
        ch = chord_at(prog, k)
        m = _near(CH[ch]["r"] if (k - int(b0)) % 4 == 0 or any(abs(k - p0) < 1e-6 for p0, _ in prog) else CH[ch]["t"][1], prev)
        bass(b, t, m, vel, length=g.bl * 1.8)
        prev = m


def brushes(b, g, b0, b1, vel=0.4, taps=True, hat=True, sweep=True, until=None, cresc=None):
    for k in range(int(b0), int(b1)):
        t = g.t(k, False)
        if until is not None and t >= until:
            break
        u = (k - b0) / max(1, b1 - b0)
        v = vel * (1.0 if cresc is None else cresc[0] + (cresc[1] - cresc[0]) * u)
        if sweep and (k - int(b0)) % 2 == 0:
            L = min(2 * g.bl, (until - t) if until else 9.0)
            if L > 0.1:
                b.add("brush", I.brush_sweep(L * 1.12, vj(v * 0.7), _r(), shape_pow=0.55), t + 0.004, 0.25)   # overlapping circles
        if taps and k % 2 == 1:
            b.add("brush", I.brush_tap(vj(v), _r(), accent=(k % 4 == 3)), hum(t, 2), 0.18)
            ts = g.t(k + 0.5)               # the swung 'and' of 2 / 4: a ghost tap
            if (until is None or ts < until) and k % 4 == 3:
                b.add("brush", I.brush_tap(vj(v * 0.4), _r()), hum(ts, 2), 0.2)
        if hat and k % 2 == 1:
            b.add("hat", I.hat_chick(vj(v * 0.9), _r()), hum(t, 2), -0.3)


def snaps(b, g, b0, b1, vel=0.4, until=None):
    for k in range(int(b0), int(b1)):
        t = g.t(k, False)
        if until is not None and t >= until:
            break
        if k % 2 == 1:
            b.add("snap", I.snap(vj(vel), _r()), hum(t, 3), 0.42)


def vchord(b, t, ch, vel, dur=1.3, damp=None, p=0.12, trem=5.0, depth=0.0, voicing=None):
    for j, m in enumerate(voicing or CH[ch]["v"]):
        b.add("vibes", I.vibes(F(m), vj(vel), _r(), dur=dur + 0.3, damp=damp, trem=trem, trem_depth=depth), hum(t + 0.004 * j, 2),
              p + 0.12 * (j - 1.5))


def comp(b, g, prog, b0, b1, vel=0.35, pattern="charleston", until=None, skip=()):
    """vibes comping: per bar (from b0) the Charleston (1, the 'and' of 2) or a lazy 2-and-4"""
    pat = {"charleston": [(0, 0.55, 1.0), (1.5, 0.45, 0.8)], "two4": [(1, 0.35, 0.9), (3, 0.35, 0.8)],
           "one": [(0, 1.6, 1.0)], "push": [(-0.5, 0.6, 0.9), (2, 0.4, 0.7)]}[pattern]
    for bar in range(int(b0), int(b1), 4):
        for off, L, a in pat:
            k = bar + off
            if k < b0 or k >= b1 or int(np.floor(k)) in skip:
                continue
            t = g.t(k)
            if until is not None and t >= until:
                continue
            vchord(b, t, chord_at(prog, max(k, b0)), vel * a, dur=g.bl * L * 2 + 0.2, damp=g.bl * L * 2)


def vib(b, t, m, vel, dur=1.0, damp=None, p=0.15, trem=5.2, depth=0.0):
    b.add("vibes", I.vibes(F(m), vj(vel), _r(), dur=dur + 0.3, damp=damp, trem=trem, trem_depth=depth), hum(t, 2), p)


def tr(b, t, m, dur, vel, p=-0.18, **kw):
    b.add("trumpet", I.muted_trumpet(F(m), dur, vj(vel), _r(), **kw), hum(t, 5), p)


def line(b, inst, g, notes, b0, vel=1.0, until=None, tr_kw=None):
    for bt_, m, L, v in notes:
        t = g.t(b0 + bt_)
        if until is not None and t >= until:
            break
        d = g.bl * L
        if inst == "trumpet":
            tr(b, t, m, d * 0.92, v * vel, **(tr_kw or {}))
        else:
            vib(b, t, m, v * vel, dur=d + 0.4, damp=d)


def pchord(b, t, ms, vel, dur=2.0, damp=None, p=-0.25):
    for j, m in enumerate(ms):
        b.add("piano", I.piano(F(m), vj(vel), _r(), dur=dur + 0.4, damp=damp), hum(t + 0.006 * j, 3), p + 0.08 * j)


def arco(b, t, m, dur, vel):
    b.add("arco", I.arco(F(m), dur, vel, _r()), t, -0.1)


def silence(b, a, z):
    """a stop-time hole in the whole score (cut after the reverb, so the hole is clean)"""
    if z > a:
        b.mutes.append((a, z))


def gap_near(t, min_len=0.15, win=0.8):
    """the true voice silence (>= min_len) nearest t (within win s): (a, b) or None"""
    best = None
    for a, z in T.SILENCES:
        if z - a < min_len:
            continue
        d = 0.0 if a <= t <= z else min(abs(a - t), abs(z - t))
        if d <= win and (best is None or d < best[0]):
            best = (d, a, z)
    return None if best is None else (best[1], best[2])


# ---------------------------------------------------------------- the score
def build():
    b = Band()
    for name, send in [("bass", 0.06), ("brush", 0.12), ("hat", 0.08), ("snap", 0.16), ("vibes", 0.24), ("piano", 0.2),
                       ("trumpet", 0.22), ("arco", 0.2)]:
        b.track(name, send)
    A = anchors()
    g = grids(A)
    ce = lambda t, d: b.cues.append((t, d))

    # ============ 1 HOOK  "By 1963, a man had borrowed over $150 million... against tanks that were mostly water."
    H = g["hook"]
    pH = [(0, "Cm6"), (8, "Ab7"), (12, "G7b9")]
    walk(b, H, pH, 0, H.nb, 0.68, seed=1)
    brushes(b, H, 0, H.nb, 0.34)
    snaps(b, H, 0, H.nb, 0.42)
    comp(b, H, pH, 4, H.nb, 0.3)
    ce(0.0, f"HOOK ({H.bpm():.0f} bpm): the caper groove from frame 0 - walking bass (Cm6 | Cm6 | Ab7 | G7b9), brushes, "
            "finger snaps on 2 and 4; vibes comp from bar 2")
    gp = gap_near(A["million"] + 2.4, 0.4, 1.2)            # the '...' after '$150 million'
    if gp:
        t0 = gp[0] + 0.05
        for dt, m, L, v in [(0.0, 67, 0.11, 0.7), (0.12, 68, 0.1, 0.5), (0.24, 67, 0.3, 0.75)]:
            tr(b, t0 + dt, m, L, v, fall=(-0.6 if dt > 0.2 else 0.0))
        ce(t0, "the muted trumpet's first sly G-Ab-G in the pause after '$150 million...'")
    gp = gap_near(A["meet"] - 0.2, 0.25, 0.5)               # pickup into Tino's theme
    if gp:
        t0 = max(gp[0] + 0.02, A["meet"] - 0.33)
        for dt, m in [(0.0, 63), (0.11, 65), (0.22, 66)]:
            tr(b, t0 + dt, m, 0.1, 0.5)
        ce(t0, "trumpet pickup Eb-F-Gb into 'Meet Tino'")

    # ============ 2 SETTING  "Meet Tino De Angelis, New Jersey's salad oil king. His giant tanks were full of cooking oil."
    S = g["setting"]
    pS = [(0, "Cm6"), (4, "Fm7"), (6, "Ab7"), (8, "Cm6"), (10, "G7b9")]
    walk(b, S, pS, 0, S.nb, 0.7, seed=2)
    brushes(b, S, 0, S.nb, 0.36)
    line(b, "trumpet", S, MOTIF_A, 0, 0.62)
    line(b, "vibes", S, [(x[0], x[1] + 12, x[2], x[3]) for x in MOTIF_B[:6]], 8, 0.3)
    comp(b, S, pS, 0, S.nb, 0.26, pattern="two4")
    ce(A["meet"], f"SETTING ({S.bpm():.0f} bpm): Tino's theme on the muted trumpet (the sly G-Ab-G, the blue Gb), walking bass")
    # A2 P1: the band stops ON 'oil.' (the word lands in a clean pocket) and the stop-time BUTTON hits at the END of the word, short
    # enough to be gone before the drip's plip (oil1End + 6) lands in the silence
    t_oe = A.get("oil1_end", A["oil1"] + 0.3)
    t_hit = t_oe + 0.01
    bass(b, t_hit, 36, 0.85, length=0.14)
    vchord(b, t_hit, "Cm9", 0.25, dur=0.3, damp=0.13)
    b.add("brush", I.brush_tap(0.55, _r(), accent=True), t_hit, 0.18)
    tr(b, t_hit + 0.005, 72, 0.1, 0.45)                          # ... the trumpet's staccato C with it
    silence(b, t_hit + 0.15, A["banks"] - 0.02)
    ce(t_hit, "the band stops ON 'oil.' and the stop-time button hits at the word's END (bass C, a brush accent, a soft vibes Cm9, "
              "the trumpet's staccato C) -> silence for the drip's plip")

    # ============ 3 BANK  "Banks lent him money against it. American Express sent inspectors to check."
    K = g["bank"]
    pK = [(0, "Fm7"), (2, "Bb7"), (4, "Ebmaj7"), (6, "Ab7"), (8, "G7b9")]
    walk(b, K, pK, 0, K.nb, 0.62, seed=3)
    brushes(b, K, 0, K.nb, 0.3)
    comp(b, K, pK, 0, K.nb, 0.26)
    line(b, "vibes", K, [(0, 75, .5, .6), (.5, 74, .5, .5), (1, 72, 1.0, .6), (2.5, 70, .5, .5), (3, 67, 1.5, .55)],
         K.b(A["amex"]) // 1 + 0.5, 0.42)
    ce(A["banks"], f"BANK ({K.bpm():.0f} bpm): lighter walk Fm7-Bb7-Ebmaj7-Ab7-G7b9, vibes line under 'American Express sent inspectors'")

    # ============ 4 THE CLIMB  "But Tino's own men would climb up, drop a tape inside, and shout down:"
    C = g["climb"]
    for k, m in enumerate([36, 37, 38, 39, 40, 41, 42]):
        t = C.t(k * 0.5)
        bass(b, t, m, 0.5 + 0.04 * k, length=C.bl * 0.32)
        vib(b, t + 0.003, m + 24, 0.18 + 0.03 * k, dur=0.4, damp=C.bl * 0.4, p=0.3)
    try:                                                       # A1: the hat = his hands: on CHAR's climb pulls (cast.ts S4)
        import probe
        pulls = probe.probes(T.BEAT, T.SHOTS)[0].get("s4", {}).get("pulls") or []
    except Exception:  # noqa
        pulls = []
    hats = [T.fr(p) for p in pulls] if pulls else [C.t(k, False) for k in range(4)]
    for th in hats:
        b.add("hat", I.hat_chick(0.35, _r()), hum(th, 2), -0.3)
    ce(A["butTinos"], f"CLIMB ({C.bpm():.0f} bpm): the bass tiptoes up chromatically C-C#-D-Eb-E-F-F# in swung 8ths (vibes 2 octaves "
                      "up), the hi-hat on every beat = his steps -> lands G on 'up,'")
    P = g["tape"]
    t_ul = max(P.t(0, False), A.get("up_end", P.t(0, False)) + 2.0 / T.FPS)   # A2 P2: the landing AFTER the word 'up,' (+2 f)
    bass(b, t_ul, 43, 0.85, length=P.bl * 0.9)
    vchord(b, t_ul, "G7", 0.38, dur=0.8, damp=0.5)
    run = [79, 77, 75, 74, 72, 71, 67, 63]
    t_run = max(P.t(0.75), t_ul + 0.08)
    for k, m in enumerate(run):
        t = t_run + k * (P.bl * 1.75 / len(run))
        vib(b, t, m, 0.42 - 0.025 * k, dur=0.5, damp=0.22, p=0.2 - 0.05 * k)
    bass(b, P.t(1, False), 43, 0.45, length=P.bl * 0.5)
    bass(b, P.t(3, False), 43, 0.55, length=P.bl * 0.5)
    for k in (1, 2, 3):
        b.add("hat", I.hat_chick(0.3, _r()), hum(P.t(k, False), 2), -0.3)
    ce(t_ul, "over the rim, just after 'up,': bass G + a G7 chord; 'drop a tape inside,': a vibes run falls G-F-Eb-D-C-B-G-Eb with the tape")
    t_su = A["shout"]
    t_cut = A["down_end"] + 0.02
    L = max(0.2, t_cut - t_su)
    b.add("brush", I.brush_sweep(L, 0.55, _r(), shape_pow=0.6) * np.linspace(0.3, 1.0, ns(L)), t_su, 0.2)
    for k, m in enumerate([67, 71, 74]):
        vib(b, t_su + k * L / 3.2, m, 0.3 + 0.08 * k, dur=0.35, damp=L / 3.2, p=0.25)
    bass(b, t_su, 31, 0.5, length=L * 0.9, slide=1.0)
    silence(b, t_cut, A["andInspector"] - 0.03)
    ce(t_su, f"'shout down:' a brush swirl + vibes G-B-D climbing to the rail, then STOP-TIME at {t_cut:.2f}: the shout "
             "'Ninety percent full!' and its tank echo play alone")

    # ============ 5 DEADPAN  "And the inspector, on the ground... believed them."
    D = g["deadpan"]
    t_g = A.get("ground_end", A["believed"] - 0.4)
    bass(b, D.t(0, False), 36, 0.55, length=D.bl * 1.8)
    bass(b, D.t(2, False), 31, 0.5, length=min(D.bl * 1.8, t_g - D.t(2, False) - 0.02))
    b.add("brush", I.brush_sweep(D.bl * 1.9, 0.25, _r()), D.t(0, False), 0.25)
    b.add("brush", I.brush_sweep(min(D.bl * 1.9, t_g - D.t(2, False)), 0.22, _r()), D.t(2, False), 0.25)
    vchord(b, D.t(0, False), "Cm6", 0.22, dur=1.6, damp=min(1.6, t_g - D.t(0, False) - 0.05))
    silence(b, t_g + 0.01, A["believed"] + 0.0)
    ce(A["andInspector"], "DEADPAN: a soft two-feel (C, G) with brush swishes under 'And the inspector, on the ground...' -> "
                          f"the REAL SILENCE {t_g:.2f}-{A['believed']:.2f} (no music; the pencil tick lands on 'believed')")
    gp = gap_near(A.get("them_end", A["soBanks"] - 0.4) + 0.05, 0.3, 0.3)
    if gp:
        t0 = gp[0] + 0.03
        tr(b, t0, 67, 0.11, 0.6, wah=(0.1, 0.2))
        tr(b, t0 + 0.14, 66, 0.22, 0.62, wah=(0.0, 1.0), fall=-0.8)
        bass(b, t0 + 0.14, 31, 0.45, length=0.2)
        ce(t0, "the comic shrug after 'believed them.': a muted-trumpet 'doo-dwah' (G, then F# with the hand opening the mute)")

    # ============ 6 MORE  "So the banks lent more. And more. Soon, his papers showed more of that oil than the entire United States had."
    M = g["more"]
    t_had = A["had"]
    pM = [(0, "Cm6"), (4, "Fm7"), (6, "G7b9"), (8, "Fm7"), (10, "Ab7"), (12, "Bb7"), (14, "Cm9")]
    walk(b, M, pM, 0, M.nb, 0.7, seed=6, until=t_had - 0.05)
    brushes(b, M, 0, M.nb, 0.36, until=t_had - 0.03, cresc=(0.8, 1.25))
    comp(b, M, pM, 0, M.nb, 0.28, until=t_had - 0.05)
    gp = gap_near(A["more2"] + 0.45, 0.2, 0.4)                 # the 'more!' lick after 'And more.'
    if gp:
        t0 = gp[0] + 0.02
        tr(b, t0, 67, 0.09, 0.69)                              # A1 P2: 2 dB hotter (the topper)
        tr(b, t0 + 0.11, 72, 0.12, 0.78, doit=1.0)
        ce(t0, "trumpet 'bah-DAH!' after 'And more.' (2 dB hotter)")
    k0 = M.b(A["soon"])
    for j, (m, L) in enumerate([(72, 2.0), (74, 2.0), (75, 2.0), (77, 1.5)]):
        t = M.t(np.ceil(k0) + 2 * j, False)
        if t + 0.2 < t_had:
            tr(b, t, m, min(M.bl * L * 0.95, t_had - t - 0.05), 0.42 + 0.05 * j, vib=1.2)
    t_hh = A.get("had_end", t_had + 0.3) + 2.0 / T.FPS          # A2 P2: the stop hit lands AFTER the word 'had.' (+2 f)
    bass(b, t_hh, 36, 0.85, length=0.22)
    vchord(b, t_hh, "Cm9", 0.45, dur=0.4, damp=0.2)
    b.add("brush", I.brush_tap(0.6, _r(), accent=True), t_hh, 0.18)
    tr(b, t_hh + 0.01, 67, 0.1, 0.55)
    silence(b, max(t_hh + 0.24, A["soHow"] - 0.08), A["soHow"] - 0.02)
    ce(A["soBanks"], f"MORE ({M.bpm():.0f} bpm): the groove - the banker's stamps land on its beats 1, 3, 5; the trumpet climbs C-D-Eb-F "
                     "under 'Soon, his papers showed more...', brushes build")
    ce(t_hh, "the band drops out ON 'had.', the stop hit lands just after the word, then the mystery")

    # ============ 7 MYSTERY  "But what if someone did look inside?"
    t0, t1 = A["soHow"], A["then"]
    arco(b, t0, 32, (A["someone"] + 0.45) - t0, 0.55)
    arco(b, A["someone"] + 0.4, 31, t1 - (A["someone"] + 0.4) - 0.05, 0.5)
    vchord(b, t0, "Abmaj7#11", 0.3, dur=1.5, trem=3.8, depth=0.4)
    vchord(b, A["look"] - 0.05, "G7sus", 0.28, dur=1.3, trem=3.8, depth=0.4)
    vib(b, A["someone"], 75, 0.22, dur=0.5, damp=0.35, p=0.35)
    vib(b, A["someone"] + 0.33, 74, 0.2, dur=0.5, damp=0.35, p=0.35)
    gp = gap_near(A.get("inside_q_end", A["then"] - 0.4) + 0.05, 0.25, 0.3)
    if gp:
        tq = gp[0] + 0.2                                       # A1 P2: the bubble's 'bloop' first (insideQEnd + 2), then the question
        for k, m in enumerate([67, 68, 74]):
            vib(b, tq + k * 0.11, m, 0.34 + 0.04 * k, dur=0.6 if k == 2 else 0.3, damp=None if k == 2 else 0.12, p=0.3)
        ce(tq, "the curious vibes question G-Ab-D (unresolved) in the gap after 'inside?'")
    ce(t0, "MYSTERY: drums out, an arco bass pedal Ab -> G, motor-vibes chords Abmaj7#11 -> G7sus (slow tremolo), Eb-D on 'someone'")

    # ============ 8 THE CRASH  "Then, in November 1963, his big bet on oil prices crashed."
    Q = g["crash"]
    t_cr = A["crashed1"]
    ost = [36, 36, 39, 36, 41, 42, 43, 36]
    k = 0
    while True:
        t = Q.t(k * 0.5)
        if t >= t_cr - 0.03:
            break
        bass(b, t, ost[k % len(ost)], 0.62 if k % 2 == 0 else 0.45, length=Q.bl * 0.4)
        k += 1
    brushes(b, Q, 0, Q.nb, 0.38, until=t_cr - 0.02, cresc=(0.9, 1.3))
    for kk in range(1, Q.nb, 2):
        t = Q.t(kk, False)
        if t < t_cr - 0.05:
            vchord(b, t, "Fmmaj7" if kk % 4 == 3 else "Cm9", 0.24, dur=0.5, damp=0.22)
    for j, m in enumerate([67, 68, 71]):
        t = Q.t(2 + 2.5 * j, False)
        if t < t_cr - 0.2:
            tr(b, t, m, min(Q.bl * 2.2, t_cr - t - 0.08), 0.45 + 0.05 * j, vib=0.6)
    tr(b, t_cr, 79, 0.5, 0.72, fall=-12.0, scoop=0.0)
    for j, m in enumerate([43, 42, 41, 40, 39, 38, 37, 36]):
        bass(b, t_cr + 0.02 + j * 0.085, m, 0.72 - 0.03 * j, length=0.09 if j < 7 else 0.5)
    silence(b, A.get("crashed1_end", t_cr + 0.75) + 0.04, A["company"] - 0.02)
    ce(A["then"], f"CRASH ({Q.bpm():.0f} bpm): a driving spy ostinato C-C-Eb-C-F-Gb-G, busier brushes, the trumpet rising G-Ab-B")
    ce(t_cr, "'crashed.': the trumpet rips down an octave from G5, the bass falls chromatically G -> C")

    # ============ 9 THE STORM  "His company went bust. Lenders finally checked the tanks."
    W = g["storm"]
    t_in = A["inside"]
    t_bu = A["bust"]
    bass(b, A["company"], 36, 0.5, length=0.9)
    bass(b, t_bu, 31, 0.85, length=0.9)
    pchord(b, t_bu, [36, 43, 49], 0.5, dur=1.4)
    k0 = int(np.ceil(W.b(A["lenders"])))
    pat = [36, 36, 37, 36]
    for k in range(k0, W.nb):
        t = W.t(k, False)
        if t >= t_in - 0.05:
            break
        bass(b, t, pat[(k - k0) % 4], 0.5 + 0.05 * (k - k0), length=W.bl * 0.5)
    tl0 = A["lenders"]
    Lr = t_in - 0.04 - tl0
    if Lr > 0.3:
        b.add("vibes", I.vibes_roll([F(m) for m in (60, 65, 68, 76)], Lr, 0.32, _r(), rate=12.0, swell=(0.15, 1.0), trem=4.0), tl0, 0.0)
        sw = I.brush_sweep(Lr, 0.6, _r(), shape_pow=0.4) * np.linspace(0.15, 1.0, ns(Lr)) ** 1.5
        b.add("brush", sw, tl0, 0.2)
        arco(b, tl0, 36, Lr, 0.45)
    silence(b, t_in - 0.035, A["youSee"] - 0.02)
    ce(A["company"], "STORM: low C; on 'bust.' a low piano cluster C-G-Db + bass G")
    ce(tl0, "'Lenders finally checked the tanks.': a pulsing bass C-C-Db-C, a vibes roll + brush swirl crescendo, arco pedal ...")
    ce(t_in - 0.035, "... CUT TO SILENCE on 'Inside...' - no music through 'was mostly water.' (only the single slosh after 'water.')")

    # ============ 11 PIVOT  "You see, oil floats on water. Ever left salad dressing out? The oil always rises to the top."
    V = g["pivot"]
    pV = [(0, "Ebmaj9"), (4, "Abmaj7"), (8, "Fm9"), (10, "Bb7")]
    t_ys = A["youSee"]
    b.add("vibes", I.vibes_roll([F(m) for m in CH["Ebmaj9"]["v"]], 0.45, 0.35, _r(), rate=14.0, swell=(0.4, 0.8)), t_ys, 0.0)
    pchord(b, t_ys + 0.02, [51, 58, 62, 67], 0.34, dur=2.4)
    twofeel(b, V, pV, 0, V.nb, 0.6)
    brushes(b, V, 0, V.nb, 0.26, taps=False, hat=False)
    for bar in range(4, V.nb, 4):
        pchord(b, V.t(bar, False), [m - 12 for m in CH[chord_at(pV, bar)]["v"][:3]], 0.26, dur=2.0)
    comp(b, V, pV, 4, V.nb, 0.22, pattern="two4")
    t_ev = A["ever"]
    for k in range(6):
        vib(b, t_ev + 0.03 + k * 0.075, 70 if k % 2 == 0 else 72, 0.22, dur=0.25, damp=0.09, p=0.3)
    t_r0, t_top = A["theOilRises"], A.get("top_end", A["top"]) + 2.0 / T.FPS     # A2 P2: the top note AFTER 'top.' (+2 f)
    arp = [58, 63, 67, 70, 74, 75, 77, 79]
    try:                                       # A2: the climb's notes stay off the word 'top.' (the last one lands after it)
        t_ts = float(T.word("top", A["top"] - 0.1)["s"]) - 0.12
    except KeyError:
        t_ts = t_top - 0.4
    for k, m in enumerate(arp):
        t = (t_r0 + (t_ts - t_r0) * k / (len(arp) - 2)) if k < len(arp) - 1 else t_top
        vib(b, t, m, 0.26 + 0.03 * k, dur=0.9 if k == len(arp) - 1 else 0.5, damp=None if k == len(arp) - 1 else 0.35, p=-0.3 + 0.08 * k)
    ce(t_ys, f"PIVOT 'You see,' ({V.bpm():.0f} bpm): the music returns WARM - an Ebmaj9 vibes roll + piano, a two-feel bass, brush swishes")
    ce(t_ev, "a vibes trill Bb-C with the bottle's shake on 'Ever'")
    ce(t_r0, f"the vibes climb Bb-Eb-G-Bb-D-Eb-F-G with the rising oil, the top note just after 'top.' ({t_top:.2f})")

    # ============ 12 EXPLAIN  "Fill a tank with water, add a thin layer of oil, and from the hatch, it looks full."
    E = g["explain"]
    pE = [(0, "Ebmaj7"), (4, "Cm7"), (6, "Fm7"), (8, "Bb7"), (10, "Ebmaj9")]
    walk(b, E, pE, 0, E.nb, 0.58, seed=12)
    brushes(b, E, 0, E.nb, 0.28)
    comp(b, E, pE, 0, E.nb, 0.24)
    t_h = A["hatch"]
    for k, m in enumerate([75, 77, 79]):
        vib(b, t_h - 0.36 + k * 0.12, m, 0.3, dur=0.5, damp=0.15 if k < 2 else None, p=0.3)
    vchord(b, A["looksFull"] + 0.02, "Ebmaj9", 0.3, dur=1.0)
    ce(A["fill"], f"EXPLAIN ({E.bpm():.0f} bpm): light walk Ebmaj7-Cm7-Fm7-Bb7; vibes Eb-F-G up to 'hatch,'; an Ebmaj9 bloom on 'full.'")

    # ============ 13 THE PIPES  "And the real oil? He pumped it through pipes, tank to tank, so the same oil got counted again and again."
    Pp = g["pipes"]
    pP = [(0, "Cm6"), (4, "Fm7"), (8, "Ab7"), (10, "G7b9")]
    walk(b, Pp, pP, 0, Pp.nb, 0.66, seed=13)
    brushes(b, Pp, 0, Pp.nb, 0.34)
    snaps(b, Pp, 2, Pp.nb, 0.36)
    vchord(b, A["realOil"], "Cm6", 0.22, dur=0.4, damp=0.2)          # A2: 'the' (margin 7.8 LU) sat under this stab
    conv = [67, 68, 67, 63]
    for k in range(4, int(Pp.nb) * 2):
        t = Pp.t(k * 0.5)
        if t >= A["hardest"] - 0.1:
            break
        vib(b, t, conv[k % 4] + 12, 0.17 if k % 2 else 0.22, dur=0.3, damp=Pp.bl * 0.4, p=0.35)
    line(b, "trumpet", Pp, MOTIF_A, 4, 0.5, until=A["hardest"] - 0.15)
    ce(A["realOil"], f"PIPES ({Pp.bpm():.0f} bpm): the caper returns at night - walking bass, brushes, snaps, a vibes 'conveyor' "
                     "G-Ab-G-Eb in 8ths, Tino's theme softly on the trumpet")

    # ============ 14 TIRED  "The hardest-working oil in America."
    t_h0, t_am = A["hardest"], A.get("america_end", A["whenOut"] - 0.4)
    pts = [t_h0, t_h0 + 0.55, t_h0 + 1.2, t_h0 + 2.05]
    for j, (t, m) in enumerate(zip(pts, [43, 41, 39, 38])):
        bass(b, t, m, 0.55 - 0.06 * j, length=0.45 + 0.1 * j, slide=-0.0)
        b.add("brush", I.brush_sweep(0.5 + 0.12 * j, 0.22 - 0.03 * j, _r()), t, 0.25)
    vchord(b, t_h0, "Cm6", 0.22, dur=2.2, trem=2.5, depth=0.25)
    silence(b, A["whenOut"] - 0.06, A["whenOut"] - 0.02)
    ce(t_h0, "TIRED: the band runs out of breath - the bass slows and sinks G-F-Eb-D under 'The hardest-working oil in America.' "
             "(the blob's sigh in the gap after it)")

    # ============ 15 FALLOUT  "When it came out, American Express shares crashed."
    Fo = g["fallout"]
    t_c2 = A["crashed2"]
    for k in range(Fo.nb):
        t = Fo.t(k, False)
        if t >= t_c2 - 0.03:
            break
        bass(b, t, 36 if k % 2 == 0 else 31, 0.6, length=Fo.bl * 0.6)
        if k % 2 == 1:
            vchord(b, t, "Cm9", 0.22, dur=0.4, damp=0.18)
            b.add("brush", I.brush_tap(0.36, _r()), hum(t, 2), 0.18)
    for j, m in enumerate([43, 42, 41, 39, 38, 36]):
        bass(b, t_c2 + 0.02 + j * 0.11, m, 0.62 - 0.03 * j, length=0.11 if j < 5 else 0.45)
    silence(b, A.get("crashed2_end", t_c2 + 0.8) + 0.03, A["but"] - 0.02)
    ce(A["whenOut"], "FALLOUT: a tense C-G pump, Cm9 stabs; 'crashed.': the bass tumbles G-Gb-F-Eb-D-C (with the bwomp)")

    # ============ 16 THE INVESTOR  "But one young investor bought those shares cheap. He bet people still trusted the brand. His name?"
    Iv = g["investor"]
    t_nm = A["hisName"]
    pI = [(0, "Ebmaj7"), (4, "Cm7"), (6, "Fm7"), (8, "Bb7")]
    walk(b, Iv, pI, 0, Iv.nb, 0.6, seed=16, until=t_nm - 0.05)
    brushes(b, Iv, 0, Iv.nb, 0.28, until=t_nm - 0.05)
    comp(b, Iv, pI, 0, Iv.nb, 0.24, until=t_nm - 0.05)
    pchord(b, Iv.t(0, False), [51, 58, 62, 67], 0.26, dur=2.2)
    line(b, "trumpet", Iv, WARM, 4, 0.55, until=t_nm - 0.1, tr_kw=dict(scoop=-18.0, vib=1.3))
    bass(b, t_nm, 34, 0.55, length=A["warren"] - t_nm - 0.05)
    vchord(b, t_nm, "Bb7sus", 0.28, dur=A["warren"] - t_nm + 0.2, damp=A["warren"] - t_nm - 0.02)
    gp = gap_near(A["warren"] - 0.15, 0.25, 0.3)
    if gp:
        tp = max(gp[0] + 0.03, A["warren"] - 0.3)
        tr(b, tp, 70, 0.11, 0.5)
        tr(b, tp + 0.13, 72, 0.12, 0.55)
    ce(A["but"], f"INVESTOR ({Iv.bpm():.0f} bpm): warm Eb major walk, the WARM theme on the trumpet (Bb-C-D-Eb ...); "
                 "'His name?' holds on Bb7sus (a breath), trumpet pickup Bb-C into the swell")

    # ============ 17 THE SWELL  "Warren Buffett."
    # A1 P2 / P3: the swell must REGISTER on 'Warren' (mix.py lifts the whole score +3 dB from 6 f before the word) and BLOOM in
    # the breath after 'Buffett.' (+6.5 dB there), while the consonant band stays clear under the name: no trumpet under the
    # words - the warm low chord, the vibes roll from full strength, the bass Ab -> Eb carry the name; the trumpet's Eb5 -> G5
    # sings in the gap and everything is damped just before 'The oil' so the payoff's vibes enter clean
    t_w, t_bf = A["warren"], A["buffett"]
    t_o = A["theOil"]
    t_be = A.get("buffett_end", t_bf + 0.5)
    b.add("vibes", I.vibes_roll([F(m) for m in CH["Abmaj9"]["v"]], t_bf - t_w, 0.4, _r(), rate=13.0, swell=(0.8, 1.0)), t_w, 0.0)
    b.add("vibes", I.vibes_roll([F(m) for m in (62, 65, 67, 70, 74)], t_o - t_bf - 0.06, 0.44, _r(), rate=13.0, swell=(0.7, 1.0)), t_bf, 0.0)
    pchord(b, t_w, [44, 51, 55, 60, 63], 0.46, dur=t_bf - t_w + 0.3, damp=t_bf - t_w)
    pchord(b, t_bf, [39, 46, 50, 55, 58, 62], 0.46, dur=t_o - t_bf + 0.2, damp=t_o - t_bf - 0.04)
    bass(b, t_w, 32, 0.8, length=t_bf - t_w - 0.02)
    bass(b, t_bf, 39, 0.85, length=t_o - t_bf - 0.06)
    tg = t_be + 0.01
    if t_o - tg > 0.2:
        tr(b, tg, 75, 0.14, 0.62, scoop=-15.0, vib=1.2)
        tr(b, tg + 0.15, 79, max(0.12, t_o - tg - 0.2), 0.74, scoop=-12.0, vib=1.5)
        vchord(b, tg + 0.02, "Ebmaj9", 0.36, dur=t_o - tg + 0.1, damp=t_o - tg - 0.04)
    sw = I.brush_sweep(t_o - t_w - 0.05, 0.55, _r(), shape_pow=0.8) * np.linspace(0.6, 1.0, ns(t_o - t_w - 0.05)) ** 1.5
    b.add("brush", sw, t_w, 0.2)
    ce(t_w, "THE SWELL on 'Warren Buffett.': Abmaj9 -> Ebmaj9 - the vibes roll from full strength, a warm low piano chord, bass Ab -> Eb "
            "(no trumpet under the name); the whole score +3 dB from 6 f before 'Warren' (mix.py BEAT_BOOSTS)")
    ce(tg, "... the BLOOM in the breath after 'Buffett.': the trumpet sings Eb5 -> G5 over Ebmaj9 (+6.5 dB there), damped just before 'The oil'")

    # ============ 18 PAYOFF  "The oil was fake. The trust was real."
    t_tr, t_re = A["theTrust"], A["real"]
    t_end = A["real_end"]
    bass(b, t_o, 36, 0.5, length=1.2)
    for k, (dt, m) in enumerate([(0.0, 67), (0.15, 68), (0.3, 67)]):
        vib(b, t_o + 0.02 + dt, m, 0.22 - 0.03 * k, dur=0.4 if k < 2 else 0.8, damp=0.13 if k < 2 else None, p=0.3)   # A2: 'The' 10.3 LU
    vchord(b, A["fake"], "Cm6", 0.22, dur=1.0, damp=0.8)
    bass(b, A["fake"], 31, 0.45, length=0.6)
    bass(b, t_tr, 32, 0.5, length=t_re - t_tr - 0.04)
    vchord(b, t_tr, "Abmaj7", 0.24, dur=t_re - t_tr + 0.1, damp=t_re - t_tr - 0.03)
    pchord(b, t_tr + 0.02, [44, 51, 55, 60], 0.24, dur=t_re - t_tr + 0.1, damp=t_re - t_tr - 0.03)
    bass(b, t_re, 39, 0.55, length=t_end - t_re + 0.3)
    vchord(b, t_re, "Eb69", 0.28, dur=t_end - t_re + 0.6)
    pchord(b, t_re + 0.01, [39, 46, 50, 53, 55, 60], 0.28, dur=t_end - t_re + 0.6)
    t_off = min(t_end + 0.25, T.DUR - 0.3)
    b.end_fade = (t_end, t_off)
    ce(t_o, "PAYOFF: the hook's sly G-Ab-G on vibes over Cm6 ('The oil was fake.')")
    ce(t_tr, "'The trust was real.': Abmaj7 -> Eb6/9 ON 'real.' (no sting)")
    ce(t_end, f"the score dies with the word: a natural decay to -60 dB by {t_off:.2f} s (<= 0.25 s after 'real.'); "
              "then only the tank-top ambience carries the loop tail into frame 0")
    return b


TARGET = {  # relative balance inside the score (LU, each track's integrated loudness over its active span)
    "bass": -1.0, "trumpet": -2.5, "vibes": -3.5, "piano": -7.0, "brush": -9.5, "hat": -16.0, "snap": -13.5, "arco": -5.0,
}
BASS_LOW_SHELF = (100.0, -0.5)          # A1 P3: the mix lacked 3 dB at 20-120 Hz (was -2.0 at 110 Hz); A2 P3: now +5.6 dB OVER the refs
                                        # (the walking bass drives that band): +3.5 -> -0.5


def render(b, ref=-20.0):
    room = make_ir(1.05, 11, pre=0.014, hf=1.5, early=[(0.017, 0.35, -0.4), (0.029, 0.25, 0.5)])
    dry = np.zeros((2, N))
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
        dry += x
        wet += b.send[k] * x.mean(0)
    out = dry + 0.8 * convolve_st(wet, room)
    out = hp(out, 35, 2)
    # stop-time holes (after the reverb, so the cuts are clean) and the end
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
    a, z = b.end_fade
    ia, iz = ns(a), min(N, ns(z))
    gcur[ia:iz] *= 10 ** (-60.0 / 20.0 * np.linspace(0, 1, iz - ia))
    gcur[iz:] = 0.0
    out *= gcur[None, :]
    return out, levels

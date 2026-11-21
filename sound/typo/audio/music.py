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


# ================================================================ TYPO (short #3): an original soft office synth score
# a plucked 8th-note pulse, a woodblock "clock" tick on every beat, a quiet pizzicato bass and glass pads; A minor.
# It speeds up through the cancel beat, cuts to dead silence on each "Nothing.", plinks after "Easy mistake." and
# resolves ON the last word (then only the office bed carries the loop tail into frame 0).
CH = {"Am9": (45, [57, 60, 64, 67, 71]), "Fmaj7": (41, [53, 57, 60, 64]), "C": (48, [55, 60, 64, 67]), "G6": (43, [55, 59, 62, 64]),
      "Dm9": (38, [50, 53, 57, 60, 64]), "E7b9": (40, [52, 56, 59, 62, 65]), "Esus": (40, [52, 57, 59, 64]),
      "Bbmaj7": (46, [53, 57, 58, 62]), "Dm7": (38, [50, 53, 57, 60]), "Am": (45, [57, 60, 64, 69])}


def anchors():
    A = {k: T.bt(k) for k in T.BEAT}
    A["last"] = T.LAST_WORD_END
    return A


def grids(A=None):
    A = A or anchors()
    return {
        "hook": Grid("hook", 0.0, A["december"], bpm=100.0),
        "setting": Grid("setting", A["december"], A["at"], bpm=100.0),
        "trader": Grid("trader", A["at"], A["he"], bpm=100.0),
        "typing": Grid("typing", A["he"], A["easy"], bpm=100.0),
        "size": Grid("size", A["thats"], A["but"], bpm=104.0),
        "mystery": Grid("mystery", A["but"], A["cancelIt"], bpm=96.0),
        "cancel": Grid("cancel", A["cancelIt"], A["price"], bpm=128.0),
        "crash": Grid("crash", A["price"], A["andAll"], bpm=100.0),
        "buyers": Grid("buyers", A["andAll"], A["youSee"], bpm=112.0),
        "pivot": Grid("pivot", A["youSee"], A["andCancel"], bpm=92.0),
        "bug": Grid("bug", A["andCancel"], A["mizuho2"], bpm=100.0),
        "bill": Grid("bill", A["mizuho2"], A["years"], bpm=96.0),
        "court": Grid("court", A["years"], A["theTypo"], bpm=80.0),
        "payoff": Grid("payoff", A["theTypo"], A["last"] + 0.05, bpm=100.0),
    }


def sync_points():
    return {}


def sections():
    A = anchors()
    return [("hook", 0.0, A["december"]), ("setting", A["december"], A["at"]), ("trader", A["at"], A["he"]),
            ("typing", A["he"], A["easy"]), ("deadpan", A["easy"], A["thats"]), ("size", A["thats"], A["but"]),
            ("mystery", A["but"], A["cancelIt"]), ("cancel", A["cancelIt"], A["price"]), ("crash", A["price"], A["andAll"]),
            ("buyers", A["andAll"], A["youSee"]), ("pivot", A["youSee"], A["andCancel"]), ("bug", A["andCancel"], A["mizuho2"]),
            ("bill", A["mizuho2"], A["years"]), ("court", A["years"], A["theTypo"]), ("payoff", A["theTypo"], A["last"]),
            ("tail", A["last"], T.DUR)]


SECTIONS = sections()


# ---------------------------------------------------------------- players
def chord_at(prog, beat):
    cur = prog[0][1]
    for b0, name in prog:
        if beat + 1e-6 >= b0:
            cur = name
    return cur


def pulse(b, g, prog, b0, b1, vel=0.5, div=2, until=None, from_t=None, bright=0.35):
    """the plucked office pulse: chord tones in 8ths (div=2) or 16ths (div=4)"""
    pat = [0, 2, 1, 2, 3, 2, 1, 2]
    k = 0
    st_ = b0 * div
    while st_ < b1 * div:
        bt_ = st_ / div
        t = g.t(bt_, swing=False)
        if (until is not None and t >= until) or t >= T.DUR:
            break
        if from_t is None or t >= from_t:
            root, tones = CH[chord_at(prog, bt_)]
            m = tones[pat[k % len(pat)] % len(tones)]
            acc = 1.0 if (st_ % div) == 0 else 0.72
            b.add("pulse", I.pluck(F(m), vj(vel * acc), _r(), dur=g.bl / div * 1.6, bright=bright), hum(t, 2), 0.18 if k % 2 else -0.12)
        st_ += 1
        k += 1


def bassline(b, g, prog, b0, b1, vel=0.55, every=2, until=None, from_t=None):
    bt_ = float(b0)
    while bt_ < b1:
        t = g.t(bt_, swing=False)
        if (until is not None and t >= until) or t >= T.DUR:
            break
        if from_t is None or t >= from_t:
            root, _ = CH[chord_at(prog, bt_)]
            b.add("bass", I.bass_pizz(F(root), vj(vel), _r(), length=min(0.5, g.bl * every * 0.8)), hum(t, 3), 0.0)
        bt_ += every


def ticks(b, g, b0, b1, vel=0.3, until=None, from_t=None):
    """the clock: a woodblock tick-tock on every beat"""
    for k in range(int(b0), int(np.ceil(b1))):
        t = g.t(k, swing=False)
        if (until is not None and t >= until) or t >= T.DUR:
            break
        if from_t is None or t >= from_t:
            b.add("tick", I.woodblock(vj(vel), _r(), f=1600.0 if k % 2 == 0 else 1250.0, dur=0.12), hum(t, 2), -0.35)


def hats(b, g, b0, b1, vel=0.3, until=None):
    for k in range(int(b0), int(np.ceil(b1))):
        t = g.t(k + 0.5, swing=False)
        if (until is not None and t >= until) or t >= T.DUR:
            break
        b.add("hat", I.hat_chick(vj(vel), _r()), hum(t, 3), 0.3)


def padc(b, t0, t1, name, vel=0.35, glass=True):
    if t1 <= t0:
        return
    _, tones = CH[name]
    fr_ = [F(m) for m in tones]
    x = I.glass_pad(fr_, t1 - t0, vel, _r(), att=0.4, rel=0.7) if glass else I.pad(fr_, t1 - t0, vel, _r(), att=0.5, rel=0.8)
    b.add("pad", x, t0, 0.0)


def keys(b, inst, t, m, vel, dur=0.8, p=0.2):
    fn = {"marimba": lambda: I.marimba(F(m), vj(vel), _r(), dur=dur), "celesta": lambda: I.celesta(F(m), vj(vel), _r(), dur=dur),
          "glock": lambda: I.glock(F(m), vj(vel), _r(), dur=dur), "musicbox": lambda: I.musicbox(F(m), vj(vel), _r(), dur=dur),
          "piano": lambda: I.piano(F(m), vj(vel), _r(), dur=dur)}[inst]
    b.add("piano" if inst == "piano" else "keys", fn(), hum(t, 2), p)


def silence(b, a, z):
    if z > a:
        b.mutes.append((a, z))


# ---------------------------------------------------------------- the score
def build():
    b = Band()
    for name, send in [("bass", 0.05), ("pulse", 0.14), ("tick", 0.06), ("hat", 0.06), ("pad", 0.25), ("keys", 0.22), ("piano", 0.2)]:
        b.track(name, send)
    A = anchors()
    g = grids(A)
    ce = lambda t, d: b.cues.append((t, d))

    # 1 HOOK: the pad breathes from frame 0, the clock ticks; the pulse STARTS on the ENTER press ('typo')
    H = g["hook"]
    pH = [(0, "Am9"), (4, "Fmaj7"), (8, "Dm9"), (10, "E7b9")]
    padc(b, 0.004, A["december"] + 0.3, "Am9", 0.3)
    ticks(b, H, 0, H.nb, 0.28)
    t_typo = A["typo"] + 1 / 30
    for m in (57, 64, 69):
        b.add("pulse", I.pluck(F(m), 0.85, _r(), dur=0.9, bright=0.5), t_typo, 0.0)
    keys(b, "glock", t_typo, 81, 0.5, dur=1.4, p=0.1)
    pulse(b, H, pH, 0, H.nb, 0.42, from_t=t_typo + 0.05)
    bassline(b, H, pH, 0, H.nb, 0.5, from_t=A["cost"] - 0.05)
    t_cut = A["forty"] - 2 / 30                                  # the cut to the chaos: a pluck + glock stab, the pulse lifts
    for m in (45, 57, 64, 69, 72):
        b.add("pulse", I.pluck(F(m), 0.9, _r(), dur=1.0, bright=0.6), t_cut, 0.0)
    keys(b, "glock", t_cut, 84, 0.55, dur=1.2)
    keys(b, "celesta", A["billionEnd"] + 0.05, 88, 0.35, dur=0.9)
    keys(b, "celesta", A["billionEnd"] + 0.2, 84, 0.3, dur=1.2)
    silence(b, A["didnt"] - 0.05, A["exist1End"] + 0.05)          # 'didn't even exist': the floor drops out under the ghost shimmer
    padc(b, A["didnt"], A["december"] + 0.2, "Esus", 0.32)
    ce(0.0, "HOOK: glass pad + clock from frame 0; the pulse starts ON the ENTER press; a stop under 'didn't even exist'")

    # 2-4 SETTING / LOBBY / MUSEUM: the office pulse with a marimba ostinato and offbeat hats
    S_ = g["setting"]
    pS = [(0, "Am9"), (4, "Fmaj7"), (8, "C"), (12, "G6"), (16, "Am9"), (20, "Fmaj7"), (24, "Dm9"), (28, "E7b9")]
    pulse(b, S_, pS, 0, S_.nb, 0.4)
    bassline(b, S_, pS, 0, S_.nb, 0.5)
    ticks(b, S_, 0, S_.nb, 0.22)
    hats(b, S_, 4, S_.nb, 0.24, until=A["itHas"])
    for k, m in enumerate([69, 72, 76, 72, 74, 72, 69, 67]):
        keys(b, "marimba", S_.t(4 + k * 0.5, False), m, 0.36)
    keys(b, "glock", A["jcom"] + 0.15, 93, 0.3, dur=1.6)
    ce(A["december"], "SETTING: marimba ostinato, offbeat hats; a glock glint on 'J-Com'")

    # 5 TRADER
    Tr = g["trader"]
    pT = [(0, "Am9"), (4, "Fmaj7"), (8, "Dm9"), (12, "E7b9"), (16, "Am9")]
    pulse(b, Tr, pT, 0, Tr.nb, 0.36)
    bassline(b, Tr, pT, 0, Tr.nb, 0.48)
    ticks(b, Tr, 0, Tr.nb, 0.2)

    # 6 TYPING: staccato pulse; '610,000' climbs, 'one yen' drops; 'Easy mistake.' sits in a stop, then the comic plink
    Ty = g["typing"]
    pY = [(0, "Dm9"), (4, "E7b9")]
    pulse(b, Ty, pY, 0, Ty.nb, 0.33, bright=0.25)
    bassline(b, Ty, pY, 0, Ty.nb, 0.45)
    ticks(b, Ty, 0, Ty.nb, 0.2)
    for k, m in enumerate([69, 71, 72, 74, 76, 77]):
        keys(b, "marimba", A["n610k"] + 0.12 * k, m, 0.3, dur=0.4)
    keys(b, "marimba", A["yen1"], 57, 0.4, dur=0.6)
    silence(b, A["easy"] - 0.12, A["mistakeEnd"] + 0.06)
    keys(b, "celesta", A["mistakeEnd"] + 0.08, 88, 0.55, dur=0.6, p=0.0)       # the comic plink: E7 ...
    keys(b, "celesta", A["mistakeEnd"] + 0.24, 81, 0.5, dur=1.0, p=0.0)        # ... A6
    ce(A["easy"], "'Easy mistake.': dead stop under the words, then a two-note celesta plink")

    # 7 SIZE: 41 times - the pad climbs, the bass walks up
    Sz = g["size"]
    pZ = [(0, "Dm9"), (2, "E7b9"), (4, "Fmaj7"), (6, "E7b9")]
    pulse(b, Sz, pZ, 0, Sz.nb, 0.42)
    bassline(b, Sz, pZ, 0, Sz.nb, 0.55, every=1)
    ticks(b, Sz, 0, Sz.nb, 0.24)
    padc(b, A["thats"], A["but"], "E7b9", 0.32)

    # 8 MYSTERY: thinned - a low pad, the clock, one held bass; a celesta question on 'exist?'
    M_ = g["mystery"]
    padc(b, A["but"], A["cancelIt"], "Dm9", 0.26, glass=False)
    ticks(b, M_, 0, M_.nb, 0.3)
    b.add("bass", I.bass_pizz(F(38), 0.45, _r(), length=1.2), A["but"] + 0.01, 0.0)
    keys(b, "celesta", A["exist2End"] + 0.05, 81, 0.35, dur=0.6)
    keys(b, "celesta", A["exist2End"] + 0.2, 83, 0.35, dur=1.0)
    ce(A["but"], "MYSTERY: the music thins to pad + clock; a rising celesta question")

    # 8 CANCEL: faster (128 bpm), 16th pulse, the clock louder; dead silence on each 'Nothing.'
    Cn = g["cancel"]
    pC = [(0, "E7b9"), (4, "Am"), (8, "E7b9"), (12, "Am")]
    # FIX2 (audit 7): the cancel pulse is LOUDER (about +5 dB: vel 0.42 -> 0.72, bass 0.55 -> 0.9, clock 0.42 -> 0.7), so each cut
    # to dead silence on 'Nothing.' has something to cut from
    pulse(b, Cn, pC, 0, Cn.nb, 0.72, div=4, bright=0.5)
    bassline(b, Cn, pC, 0, Cn.nb, 0.9, every=1)
    ticks(b, Cn, 0, Cn.nb, 0.7)
    silence(b, A["nothing1"] - 0.06, A["again"] - 0.04)
    silence(b, A["nothing2"] - 0.06, A["price"] - 0.04)
    ce(A["cancelIt"], "CANCEL: 128 bpm, 16th pulse, louder clock; DEAD SILENCE on each 'Nothing.'")

    # 9 CRASH: the bass falls step by step, a falling pluck arpeggio, a low hit + bounce on 'floor'
    Cr = g["crash"]
    for k, m in enumerate([52, 50, 48, 47, 45, 43, 41, 40]):
        t = Cr.t(k * 0.5, False)
        if t < A["floor"]:
            b.add("bass", I.bass_pizz(F(m - 12), 0.55, _r(), length=0.25), t, 0.0)
            b.add("pulse", I.pluck(F(m + 12), 0.45, _r(), dur=0.3, bright=0.4), t + 0.02, 0.15)
    b.add("bass", I.bass_pizz(F(33), 0.7, _r(), length=0.8), A["floor"] + 0.05, 0.0)
    padc(b, A["floor"] + 0.05, A["andAll"], "Am", 0.3)
    ce(A["price"], "CRASH: the falling bass and pluck, a low A on 'floor'")

    # 10 BUYERS: busy marimba 8ths, hats, walking bass; a glock sparkle on '2 billion'
    By = g["buyers"]
    pB = [(0, "Am9"), (2, "C"), (4, "G6"), (6, "Fmaj7"), (8, "Am9"), (10, "C"), (12, "Dm9"), (14, "E7b9")]
    pulse(b, By, pB, 0, By.nb, 0.4)
    bassline(b, By, pB, 0, By.nb, 0.52, every=1)
    hats(b, By, 0, By.nb, 0.3)
    for k in range(int(By.nb * 2)):
        t = By.t(k * 0.5, False)
        if t >= A["youSee"] - 0.1:
            break
        _, tones = CH[chord_at(pB, k * 0.5)]
        keys(b, "marimba", t, tones[(k * 2) % len(tones)] + 12, 0.24 + 0.1 * (k / (By.nb * 2)), dur=0.35)
    for k, m in enumerate([93, 96, 100]):
        keys(b, "glock", A["billion2End"] + 0.04 * k, m, 0.35, dur=1.4)
    ce(A["andAll"], "BUYERS: busy marimba, walking bass; glock sparkle on '2 billion'")

    # 11 PIVOT: the warm community hall - piano + music box in F, slower, an explainer feel
    Pv = g["pivot"]
    pP = [(0, "Fmaj7"), (4, "C"), (8, "Dm7"), (12, "Bbmaj7")]
    for k in range(0, int(Pv.nb), 2):
        name = chord_at(pP, k)
        root, tones = CH[name]
        t = Pv.t(k, False)
        for j, m in enumerate(tones):
            keys(b, "piano", t + 0.008 * j, m, 0.3, dur=Pv.bl * 2.2, p=-0.15 + 0.08 * j)
        b.add("bass", I.bass_pizz(F(root), 0.42, _r(), length=0.6), hum(t, 3), 0.0)
    for k, m in enumerate([77, 76, 72, 74, 72, 69, 67, 69]):
        keys(b, "musicbox", Pv.t(2 + k, False), m, 0.28, dur=1.2, p=0.25)
    ce(A["youSee"], "PIVOT: piano + music box in F (the notice-board explainer)")

    # 11b BUG: playful staccato pizz + woodblock, a celesta 'bug' trill
    Bg = g["bug"]
    pG = [(0, "Dm7"), (2, "E7b9")]
    bassline(b, Bg, pG, 0, Bg.nb, 0.48, every=1)
    ticks(b, Bg, 0, Bg.nb, 0.22)
    for k in range(8):
        keys(b, "celesta", A["bug"] + 0.06 * k, 83 if k % 2 else 84, 0.28, dur=0.15, p=0.2)

    # 12 BILL: the evening office pulse, low; a low chord on '40 billion'
    Bl = g["bill"]
    pL = [(0, "Am9"), (4, "Fmaj7"), (8, "Dm9"), (12, "E7b9"), (16, "Am9"), (20, "Fmaj7")]
    pulse(b, Bl, pL, 0, Bl.nb, 0.3, bright=0.25)
    bassline(b, Bl, pL, 0, Bl.nb, 0.45)
    ticks(b, Bl, 0, Bl.nb, 0.18)
    padc(b, A["theBill"], A["years"], "Fmaj7", 0.3)
    b.add("bass", I.bass_pizz(F(33), 0.6, _r(), length=0.9), A["billion3"] + 0.02, 0.0)

    # 13 COURT: sparse calm piano
    Co = g["court"]
    pO = [(0, "Fmaj7"), (2, "C"), (4, "Dm7"), (6, "Esus")]
    for k in range(0, int(Co.nb), 2):
        root, tones = CH[chord_at(pO, k)]
        t = Co.t(k, False)
        for j, m in enumerate(tones):
            keys(b, "piano", t + 0.01 * j, m, 0.26, dur=Co.bl * 2.2, p=-0.1 + 0.06 * j)
    padc(b, A["years"], A["theTypo"], "Dm9", 0.22)

    # 14 PAYOFF: the hook's pulse returns and resolves ON the last word
    Po = g["payoff"]
    pO2 = [(0, "Am9"), (2, "Fmaj7"), (4, "Dm9"), (5, "E7b9")]
    pulse(b, Po, pO2, 0, Po.nb, 0.36, until=A["years2"] - 0.02)
    ticks(b, Po, 0, Po.nb, 0.22, until=A["years2"] - 0.02)
    bassline(b, Po, pO2, 0, Po.nb, 0.48, until=A["years2"] - 0.02)
    t_end = A["years2"]
    b.add("bass", I.bass_pizz(F(33), 0.6, _r(), length=1.0), t_end, 0.0)
    padc(b, t_end, t_end + 1.0, "Am9", 0.34)
    for m in (69, 76, 81):
        keys(b, "glock", t_end + 0.01, m, 0.3, dur=1.2)
    t_off = min(A["last"] + 0.25, T.DUR - 0.3)
    b.end_fade = (A["last"], t_off)
    ce(t_end, "PAYOFF: the pulse returns; Am9 + glock ON 'years'; the score dies with the word")
    return b


TARGET = {"bass": -2.0, "pulse": -4.0, "keys": -5.0, "pad": -8.0, "tick": -13.0, "hat": -16.0, "piano": -5.0}
BASS_LOW_SHELF = (100.0, 0.0)


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

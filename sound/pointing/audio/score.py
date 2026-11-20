# THE MUSIC of the pointing film: (1) OUR departure melody, heard from the platform's speakers, and (2) a light score
# that changes its colour with every emotional beat of the script (section 5.2) and always leaves the voice alone.
# Everything is written here and played by the studio's own synthesized instruments (instruments.py): no samples, no
# third-party music, and the melody is an original tune (D major, 3/4, twelve beats, written for this film; it quotes no
# station melody). Every note hangs on a voice line, a word or a shot (tl.py), so a new take re-times the music.
#
# The score's little idea: THE POINT (a rising arpeggio, degrees 3-5-6-5-3) and THE CALL (two notes, a rising fourth,
# 5 -> 8: 'ta-DA'), the rhythm of 'Signal... green!'. Each beat of the story plays them in its own colour:
#   glee (pizzicato + marimba) / a question (vibes, clarinet) / the call (marimba) / mockery (bassoon) / weight (low
#   strings, a slow bass) / charm (celesta, harp) / a held breath (one string harmonic) / alarm (tremolo, quickening
#   pizzicato) / relief (a run into a warm chord) / a fond 'aw' (clarinet) / the neat click (the call again) / cocky
#   (walking bass, muted trumpet) / bounce (marimba off-beats, a woodblock on the two pats) / dread (a tip-toe, a low
#   pad) / silly pride (a stiff trumpet fanfare) / hope (one held plucked note) / dead air / a warm 'aww' / insight (a
#   glass pad, slow vibes) / a dare (one plucked question mark) / bright proof (a counted pizzicato per ball) /
#   surprise (one glockenspiel note) / a firm warning (low strings, the point in unison) / a held breath (nothing) /
#   the blow (tremolo, a low hit ON the door thump, the call upside down) / delight (celesta + glockenspiel) / flat
#   defeat (two clarinet notes) and a DEAD STOP on 'gone.'.
import numpy as np
import tl
from dsp import SR, ns, dbg, rng, lp, hp, bp, peq, st, pan, fades, widen, integrated, momentary_max, convolve_st
import instruments as I
import foley
from cues import X, melody_grid, GLIDE_A, GLIDE_B, DOORS_A, DOORS_B, DOOR_T, SNAP_D01, SNAP_S08, SNAP_T05, SNAP_S14, SNAP_K01, CREEP, HOOK, BRAKE, BUMP, PATS

KEY = 62                                          # D4: the score and the melody are in D major
MAJ = [0, 2, 4, 5, 7, 9, 11]
SEC_LV = {}                                       # section -> LU under the voice (integrated over the section), filled below


def deg(d, octv=0, acc=0):
    """scale degree (1 = D) -> MIDI; 8 = the octave, 0 / -1 = below the tonic"""
    d0 = d - 1
    return KEY + 12 * (octv + d0 // 7) + MAJ[d0 % 7] + acc


def f(m):
    return I.m2f(m)


class Part:
    """one section of the score: notes go in at film times, the section is levelled as a whole"""

    def __init__(self, name, n_ext, lv, seed):
        self.name, self.buf, self.lv, self.r = name, np.zeros((2, n_ext)), lv, rng(3000 + seed)
        self.a, self.b = 1e9, -1e9

    def add(self, t, y, p=0.0, g=1.0):
        y = st(y) if np.ndim(y) == 2 else pan(np.asarray(y), p)
        i = ns(X(t))
        m = min(self.buf.shape[1] - i, y.shape[1])
        if m > 0 and i >= 0:
            self.buf[:, i:i + m] += g * y[:, :m]
            self.a, self.b = min(self.a, X(t)), max(self.b, X(t) + m / SR)

    # instruments (mono notes)
    def pizz(self, t, m, vel=0.6, dur=0.45, p=0.0, g=1.0):
        self.add(t, I.pizz_section(f(m), vel, self.r, dur=dur), p, g)

    def bass(self, t, m, vel=0.7, length=0.4, p=0.0, g=1.0):
        self.add(t, I.saturate(I.bass_pizz(f(m), vel, self.r, length=length), 2.5, 0.5), p, g)

    def mar(self, t, m, vel=0.65, p=0.1, g=1.0, dur=None):
        self.add(t, I.marimba(f(m), vel, self.r, dur=dur), p, g)

    def cel(self, t, m, vel=0.55, p=-0.1, g=1.0):
        self.add(t, I.celesta(f(m), vel, self.r), p, g)

    def glk(self, t, m, vel=0.6, p=0.15, g=1.0, dur=1.6):
        self.add(t, I.glock(f(m), vel, self.r, dur=dur), p, g)

    def vib(self, t, m, vel=0.5, p=-0.15, g=1.0, dur=1.6, damp=None):
        self.add(t, I.vibes(f(m), vel, self.r, dur=dur, damp=damp), p, g)

    def harp(self, t, m, vel=0.5, p=0.2, g=1.0, harmonic=False, dur=None):
        self.add(t, I.harp(f(m), vel, self.r, dur=dur, harmonic=harmonic), p, g)

    def clar(self, t, m, dur, vel=0.55, p=-0.2, g=1.0):
        self.add(t, I.clarinet(f(m), dur, vel, self.r), p, g)

    def bsn(self, t, m, dur, vel=0.6, p=0.2, g=1.0):
        self.add(t, I.bassoon(f(m), dur, vel, self.r), p, g)

    def tpt(self, t, m, dur, vel=0.65, p=0.15, g=1.0, **kw):
        self.add(t, I.muted_trumpet(f(m), dur, vel, self.r, **kw), p, g)

    def strs(self, t, ms, dur, vel=0.45, g=1.0, **kw):
        self.add(t, I.strings([f(m) for m in ms], dur, vel, self.r, **kw), 0.0, g)

    def gpad(self, t, ms, dur, vel=0.45, g=1.0, **kw):
        self.add(t, I.glass_pad([f(m) for m in ms], dur, vel, self.r, **kw), 0.0, g)

    def wb(self, t, vel=0.5, p=0.1, g=1.0, fq=1050.0):
        self.add(t, I.woodblock(vel, self.r, fq), p, g)

    def brush(self, t, vel=0.45, accent=False, p=-0.1, g=1.0):
        self.add(t, I.brush_tap(vel, self.r, accent), p, g)

    def tri(self, t, vel=0.35, p=0.3, g=1.0, dur=1.2):
        self.add(t, I.triangle(vel, self.r, dur), p, g)

    def call(self, t, kind="mar", up=True, g=1.0, octv=1):
        """THE CALL: two notes a fourth apart, a sixteenth apart, the second one ON t (the snap)"""
        a, b = (deg(5, octv), deg(8, octv)) if up else (deg(8, octv), deg(5, octv))
        if kind == "mar":
            self.mar(t - 0.11, a, 0.6, g=g)
            self.mar(t, b, 0.8, g=g)
            self.bass(t, deg(1, -1), 0.7, 0.3, g=0.8 * g)
        elif kind == "cel":
            self.cel(t - 0.10, a + 12, 0.55, g=g)
            self.cel(t, b + 12, 0.7, g=g)
            self.glk(t, b + 12, 0.45, g=0.6 * g)
        elif kind == "tpt":
            self.tpt(t - 0.13, a, 0.12, 0.7, g=g)
            self.tpt(t, b, 0.42, 0.85, g=g, fall=-2.0)
            self.mar(t, b, 0.8, g=0.8 * g)
            self.tri(t, 0.3, g=0.5 * g)

    def out(self, vref, cut=None):
        """level the section to its LU under the voice; cut = film time where it must be silent (a dead stop)"""
        if self.b <= self.a:
            return self.buf
        i0, i1 = ns(self.a), min(self.buf.shape[1], ns(self.b))
        seg = self.buf[:, i0:i1]
        if seg.shape[1] < ns(0.9):
            cur = momentary_max(np.concatenate([np.zeros((2, ns(0.4))), seg, np.zeros((2, ns(0.4)))], axis=1)) - 3.0
        else:
            cur = integrated(np.concatenate([seg, seg, seg], axis=1)) if seg.shape[1] < ns(3.0) else integrated(seg)
        if np.isfinite(cur):
            self.buf *= dbg(vref + self.lv - cur)
        if cut is not None:
            k = ns(X(cut))
            d = ns(0.006)
            self.buf[:, max(0, k - d):k] *= np.linspace(1, 0, min(d, k))[None, -min(d, k):]
            self.buf[:, k:] = 0.0
        return self.buf


# ================================================================ the departure melody (diegetic: the platform's speakers)
#  beat (quarter notes, 12 per phrase), degree, octave, length in beats
MELODY = [(0, 5, 1, 1.0), (1, 3, 1, 0.5), (1.5, 5, 1, 0.5), (2, 8, 1, 1.0),
          (3, 6, 1, 1.0), (4, 4, 1, 0.5), (4.5, 6, 1, 0.5), (5, 9, 1, 1.0),
          (6, 10, 1, 0.5), (6.5, 9, 1, 0.5), (7, 8, 1, 0.5), (7.5, 6, 1, 0.5), (8, 5, 1, 1.0),
          (9, 8, 1, 2.6)]
MEL_BASS = [(0, 1), (3, 4), (6, 4), (8, 5), (9, 1)]        # beat, degree (octave 0)
MEL_OFF = [(1, (3, 5)), (2, (3, 5)), (4, (4, 6)), (5, (4, 6)), (7, (2, 4)), (10, (3, 5)), (11, (5, 8))]


def melody_dry(pulse, second, r):
    """one pass of the melody, dry and mono: glockenspiel + celesta lead, vibes underneath"""
    n = ns(12 * pulse + 2.5)
    y = np.zeros(n)

    def put(t, x, g=1.0):
        i = ns(t)
        m = min(n - i, len(x))
        y[i:i + m] += g * x[:m]
    for b, d, o, ln in MELODY:
        m = deg(d, o)
        put(b * pulse, I.glock(f(m), 0.62, r, dur=min(1.8, ln * pulse + 0.9)), 0.9)
        put(b * pulse, I.celesta(f(m), 0.55, r), 0.7)
        if second:                                           # the second pass sparkles an octave up
            put(b * pulse + 0.004, I.glock(f(m + 12), 0.35, r, dur=0.9), 0.28)
    for b, d in MEL_BASS:
        put(b * pulse, I.vibes(f(deg(d, 0)), 0.5, r, dur=1.4, damp=2.4 * pulse), 0.8)
    for b, (d1, d2) in MEL_OFF:
        for d in (d1, d2):
            put(b * pulse, I.vibes(f(deg(d, 0)), 0.32, r, dur=0.8, damp=0.8 * pulse), 0.45)
    for k, d in enumerate((5, 8, 10) if not second else (5, 8, 10, 12)):     # the phrase ends on a small rising chord
        put((9 + 0.33 * k) * pulse, I.celesta(f(deg(d, 1)), 0.5, r), 0.5)
    if second:
        put(11 * pulse, I.glock(f(deg(8, 2)), 0.5, r, dur=2.0), 0.6)          # the last note: a clear high tonic
    return y


def melody(n_ext, vref, grid):
    """the melody as the film hears it. Returns (2, n_ext): through the platform's horn speakers and the open air
    (platform shots), duller from inside the doorway, and faint and nearly dry under the lab's jars (the script: 'faint
    under the jars, louder with platform sound in the cutaway'); it runs on ONE clock from 'Japan's' to its last note."""
    r = rng(3500)
    a, phrase, pulse = grid["start"], grid["phrase"], grid["pulse"]
    dry = np.zeros(ns(2 * phrase + 4.0))
    for k in (0, 1):
        y = melody_dry(pulse, k == 1, r)
        i = ns(k * phrase)
        m = min(len(dry) - i, len(y))
        dry[i:i + m] += y[:m]
    # the last note may ring, but the tune is over at grid['end']
    e = ns(2 * phrase)
    dry[e:] *= np.exp(-np.arange(len(dry) - e) / SR / 0.35)
    # the platform's speakers: band-limited horns a few metres apart, the open-air slap
    pa_ = bp(dry, 380, 5200, 2)
    pa_ = np.tanh(1.6 * pa_ / (np.abs(pa_).max() + 1e-9))
    pa_ = peq(pa_, 1900, 3.0, 1.0)
    z = pa_.copy()
    for d, g in ((0.043, 0.55), (0.097, 0.38), (0.171, 0.22)):
        k = ns(d)
        z[k:] += g * pa_[:-k]
    plat = foley.wet(pan(z, -0.2), "pa", 0.8, tail=0.0)
    plat = plat[:, :len(dry)]
    door = lp(plat, 3400, 1)
    lab_ = st(lp(dry, 6000, 1)) * 0.8 + 0.2 * plat
    ref = integrated(plat[:, : ns(phrase)])
    LV = {"platB": -16.0, "door": -9.0, "lab": -25.0, "cabstop": -40.0}
    out = np.zeros((2, n_ext))
    n = len(dry)
    k = max(2, ns(0.03))
    t0 = a
    for place, src in (("platB", plat), ("door", door), ("lab", lab_)):
        m = np.zeros(n)
        for sid in tl.ORDER:
            if tl.PLACE[sid] != place:
                continue
            sa, sb = tl.SHOT[sid]
            i0, i1 = ns(max(sa, t0) - t0), ns(min(sb, t0 + n / SR) - t0)
            if i1 > i0:
                lv = LV[place] + (-9.0 if sid == "s20" else 0.0)          # under 'A finger and a shout' it steps back
                m[i0:i1] = dbg(vref + lv - ref)
        m = np.convolve(m, np.ones(k) / k, "same")
        i = ns(t0)
        mm = min(n_ext - i, n)
        out[:, i:i + mm] += src[:, :mm] * m[None, :mm]
    return out


# ================================================================ the score
def score(n_ext, vref, grid):
    """every section of the underscore -> (2, n_ext), and the section table for the report"""
    S = tl.SHOT
    W = tl.W
    parts, table = [], []

    def P(name, lv, seed, feel, what):
        p = Part(name, n_ext, lv, seed)
        parts.append(p)
        table.append(dict(name=name, feel=feel, what=what, lv=lv, part=p))
        return p

    # ---- 1 glee: the pizzicato motif enters ON cut 1 (s02)
    a, b = S["s02"]
    bt = (b - a) / 4.0
    p = P("glee", -17.0, 1, "glee", "THE POINT enters on cut 1: pizzicato bass + marimba, bouncing")
    for k, d in enumerate((3, 5, 6, 5, 3)):
        p.mar(a + k * bt / 2, deg(d, 1), 0.7)
        p.pizz(a + k * bt / 2, deg(d, 0), 0.5, g=0.6)
    for k in range(4):
        p.bass(a + k * bt, deg(1 if k % 2 == 0 else 5, -1), 0.75, 0.3)
        p.mar(a + (k + 0.5) * bt, deg(3, 0), 0.4, p=-0.2, g=0.6)
        p.mar(a + (k + 0.5) * bt, deg(5, 0), 0.4, p=-0.2, g=0.6)
    p.mar(a + 3 * bt, deg(2, 1), 0.6)
    p.mar(a + 3.5 * bt, deg(4, 1), 0.55)
    # ---- 2 a question, then THE CALL (s03)
    a, b = S["s03"]
    p = P("question", -21.0, 2, "puzzlement -> crisp order", "the band stops on the cut: one held vibes chord and a clarinet question mark; room for 'Signal...'")
    for m in (deg(2, 0), deg(4, 0), deg(6, 0)):
        p.vib(a + 0.02, m, 0.42, dur=1.5, damp=tl.s("v3_d01") - a)
    q = W("v3_n03", "finger")[1]
    p.clar(q - 0.05, deg(6, 0), 0.16, 0.45)
    p.clar(q + 0.10, deg(7, 0), 0.30, 0.5)
    p = P("call1", -11.5, 3, "crisp order", "THE CALL (two marimba notes, a rising fourth) ON the glove's snap at 'green!'")
    p.call(tl.ev(SNAP_D01), "mar")                                     # ON the glove's snap as the cast plays it
    # ---- 3 mockery (s04)
    a, b = S["s04"]
    bt = (b - a) / 8.0
    p = P("mockery", -19.5, 4, "mockery", "a bassoon 'nyah-nyah' over off-beat pizzicato")
    for k, d in enumerate((5, 3, 5, 3, 6, 3, 5, 2)):
        p.bsn(a + k * bt, deg(d, 0), bt * 0.8, 0.6)
        if k % 2:
            p.pizz(a + k * bt, deg(1, 0), 0.5, g=0.7, p=-0.3)
            p.pizz(a + k * bt, deg(3, 0), 0.45, g=0.6, p=-0.3)
    # ---- 4 weight, with a tease (s05)
    a, b = S["s05"]
    p = P("weight", -21.0, 5, "weight, with a tease", "low strings and a slow pizzicato bass; a sneaking chromatic step as the suitcase creeps, a pluck up on the foot hook")
    p.strs(a + 0.05, [deg(1, -1), deg(5, -1)], b - a - 0.3, 0.4, att=0.5, rel=0.35)
    for k, d in enumerate((1, 6, 4, 5)):
        p.bass(a + 0.1 + k * (b - a - 0.3) / 4.0, deg(d, -1) - (12 if d > 4 else 0), 0.7, 0.5)
    c0 = tl.ev(CREEP)
    for k, acc in enumerate((0, -1, -2, -3)):
        p.pizz(c0 + 0.05 + k * 0.2, deg(3, 0) + acc, 0.4, g=0.7, p=0.2)
    h0 = tl.ev(HOOK)
    p.pizz(h0 + 0.05, deg(5, 0), 0.6, p=0.2)
    p.pizz(h0 + 0.17, deg(8, 0), 0.65, p=0.2)
    # ---- 5 charm (s06): the boy's version, celesta + harp
    a, b = S["s06"]
    bt = (tl.ev(BRAKE) - a - 0.1) / 6.0
    p = P("charm", -20.5, 6, "charm", "THE POINT on celesta over a harp (the boy copies); a woodblock 'tok' with the bump, three falling bells for the cap")
    for k, d in enumerate((3, 5, 6, 5, 3, 2)):
        p.cel(a + 0.1 + k * bt, deg(d, 2), 0.55)
    for k, d in enumerate((1, 5, 1)):
        p.harp(a + 0.1 + k * 2 * bt, deg(d, 0), 0.5)
    tk = tl.ev(BUMP)
    p.wb(tk, 0.45, fq=880.0)
    for k, d in enumerate((8, 6, 5)):
        p.glk(tk + 0.10 + k * 0.09, deg(d, 2), 0.4, dur=0.8)
    # ---- 6 a held breath, then alarm (s07)
    a, b = S["s07"]
    n7 = tl.s("v3_n07")
    p = P("breath", -27.0, 7, "a held breath", "the score waits: one high string harmonic over the stop, the chime and the doors")
    p.strs(tl.s("v3_n06") - 0.05, [deg(5, 2)], max(0.5, n7 - tl.s("v3_n06")), 0.3, att=0.3, rel=0.3, harmonics=True)
    p = P("alarm", -19.0, 8, "alarm", "tremolo strings climbing by half steps and a pizzicato that quickens as the suitcase trundles for the door")
    d = b - n7
    for k in range(4):
        p.strs(n7 + k * d / 4.0, [deg(7, -1) + k, deg(4, 0) + k], d / 4.0 + 0.12, 0.42 + 0.06 * k, att=0.06, rel=0.1, trem=11.0)
    tm, k = n7 + 0.1, 0
    while tm < b - 0.05:
        p.pizz(tm, deg(7, 0) + min(3, int(4 * (tm - n7) / d)), 0.45 + 0.1 * (tm - n7) / d, g=0.7, p=-0.2)
        tm += max(0.11, 0.3 - 0.11 * (tm - n7) / d * 1.6)
        k += 1
    # ---- 7 relief, then a fond laugh (s08)
    a, b = S["s08"]
    sv = W("v3_n08", "saves")[0]
    p = P("kidcall", -13.0, 9, "relief", "the boy's CALL (celesta + glockenspiel, an octave up) on his snap at the suitcase")
    p.call(tl.ev(SNAP_S08), "cel")
    p = P("relief", -17.5, 10, "relief", "a held tremolo, then a run up into a warm chord ON the catch ('saves'); a clarinet 'aw' and a two-note pizzicato button for 'Bad suitcase.'")
    p.strs(a + 0.5, [deg(7, -1) + 3, deg(4, 0) + 3], max(0.3, sv - a - 0.75), 0.4, att=0.05, rel=0.12, trem=11.0, g=0.7)
    for k, dd in enumerate((5, 6, 7, 8, 9)):
        p.harp(sv - 0.26 + k * 0.05, deg(dd, 0), 0.55)
        p.mar(sv - 0.26 + k * 0.05, deg(dd, 1), 0.5, g=0.6)
    p.strs(sv, [deg(1, 0), deg(3, 0), deg(5, 0)], max(0.6, tl.e("v3_n08") - sv + 0.15), 0.5, att=0.03, rel=0.4)
    for m in (deg(3, 1), deg(5, 1), deg(8, 1)):
        p.vib(sv, m, 0.5, dur=1.4)
    p.bass(sv, deg(1, -1), 0.8, 0.5)
    t2 = tl.s("v3_t02")
    p.clar(t2 - 0.02, deg(3, 1), 0.3, 0.5)
    p.clar(t2 + 0.34, deg(1, 1), 0.45, 0.5)
    p.bass(tl.e("v3_t02") - 0.22, deg(5, -1), 0.7, 0.2)
    p.bass(tl.e("v3_t02") - 0.04, deg(1, -1), 0.75, 0.3)
    # ---- 8 the neat click (s09): the score leaves the chime, the doors and the thump alone; THE CALL on 'closed!'
    p = P("call2", -11.5, 11, "a neat click", "THE CALL on 'closed!' (the plant: the same two notes as 'green!')")
    p.call(W("v3_d02", "closed")[0] + 0.03, "mar")
    ga = tl.ev(GLIDE_A)
    p = P("glideA", -18.0, 12, "a neat click", "the bass starts to chug as the train glides: it carries the cut into the car")
    tm, k = ga, 0
    while tm < S["s10"][0] - 0.05:
        p.bass(tm, deg(1 if k % 2 == 0 else 5, -1), 0.65, 0.14)
        tm += 0.16
        k += 1
    # ---- 9 cocky (s10)
    a, b = S["s10"]
    bt = (b - a) / 8.0
    p = P("cocky", -18.5, 13, "cocky", "a swaggering walking bass and a muted trumpet with a rising 'doit' on 'do?'")
    for k, (dd, acc) in enumerate(((1, 0), (3, 0), (5, 0), (6, 0), (7, -1), (6, 0), (5, 0), (3, 0))):
        p.bass(a + k * bt + (0.04 if k % 2 else 0.0), deg(dd, -1) + acc, 0.75, bt * 0.8)
        if k % 2:
            p.brush(a + k * bt, 0.4, accent=(k % 4 == 3))
    q0 = W("v3_t03", "do")[0]
    p.tpt(tl.s("v3_t03") + 0.05, deg(3, 1), 0.16, 0.55)
    p.tpt(tl.s("v3_t03") + 0.30, deg(5, 1), 0.2, 0.55)
    p.tpt(q0 + 0.02, deg(7, 1) - 1, 0.5, 0.75, doit=3.0)
    # ---- 10 bounce, then mischief (s11)
    a, b = S["s11"]
    t4 = tl.s("v3_t04")
    bt = max(0.24, (t4 - a) / 6.0)
    p = P("bounce", -19.5, 14, "bounce -> mischief", "marimba off-beats in the dominant; two woodblock taps WITH the two pats; a skip up as he hops out; it stops on an open chord")
    for k in range(6):
        if a + k * bt > t4 - 0.1:
            break
        p.bass(a + k * bt, deg(5, -1) if k % 2 == 0 else deg(2, 0) - 12, 0.65, 0.2)
        for dd in (7, 2):
            p.mar(a + (k + 0.5) * bt, deg(dd, 0) + (12 if dd == 2 else 0), 0.45, g=0.6, p=-0.15)
    pt = tl.ev(PATS)
    p.wb(pt + 0.02, 0.5, fq=980.0)
    p.wb(pt + 0.305, 0.55, fq=1180.0)
    hp_ = tl.ev("v3_t04:right.s - 0.02")
    for k, dd in enumerate((5, 7, 9)):
        p.mar(hp_ + k * 0.085, deg(dd, 1), 0.55)
    p.mar(tl.e("v3_t04") + 0.06, deg(5, 1), 0.6)
    p.vib(tl.e("v3_t04") + 0.06, deg(4, 1), 0.4, dur=1.2, damp=max(0.3, S["s12"][0] - tl.e("v3_t04") - 0.1))
    # ---- 11 dread (s12)
    a, b = S["s12"]
    p = P("dread", -22.0, 15, "dread", "a low tip-toe and a dark pad under the bag alone; a hole for 'It stays.'; one low marimba note after it")
    p.gpad(a + 0.05, [deg(4, -1), deg(6, -1) - 1, deg(1, 0)], b - a - 0.25, 0.4, att=0.3, rel=0.4)
    n10a, n10b = tl.SPAN["v3_n10"]
    tm = a + 0.08
    for k, m in enumerate((deg(1, 0), deg(6, -1) - 1, deg(4, -1))):
        if tm < n10a - 0.12:
            p.pizz(tm, m, 0.4, g=0.8, p=-0.2)
            p.pizz(tm, m + 12, 0.3, g=0.35, p=-0.2)
        tm += (n10a - a - 0.1) / 3.0
    p.mar(n10b + 0.16, deg(4, -1), 0.5, dur=1.2)
    # ---- 12 silly pride (s13)
    a, b = S["s13"]
    v0 = tl.s("v3_t05")
    ck = W("v3_t05", "check")[0]
    p = P("pride", -19.0, 16, "silly pride", "a stiff little muted-trumpet fanfare and brushes (a toy parade for his mock call)")
    for k, off in enumerate((0.0, 0.2, 0.4)):
        if a + 0.02 + off < v0 - 0.02:
            p.tpt(a + 0.02 + off, deg(5, 0), 0.13, 0.6)
            p.brush(a + 0.02 + off, 0.4)
    bt = max(0.2, (ck - v0) / 4.0)
    for k in range(4):
        p.brush(v0 + k * bt, 0.4, accent=(k == 3))
        p.bass(v0 + k * bt, deg(1 if k % 2 == 0 else 5, -1), 0.6, 0.15)
    p = P("call3", -11.0, 17, "silly pride", "THE CALL, as a trumpet fanfare with a triangle, ON 'check!' (too big for a vending machine)")
    p.call(tl.ev(SNAP_T05), "tpt")
    # ---- 13 hope (s14): one held plucked note
    a, b = S["s14"]
    p = P("hope", -13.0, 18, "hope", "ONE held plucked note on the boy's silent point (it rings into the next shot and is gone before the look)")
    p.harp(tl.ev(SNAP_S14), deg(5, 1), 0.6, harmonic=True, dur=1.6)
    p.pizz(tl.ev(SNAP_S14), deg(5, 0), 0.5, dur=0.9, g=0.8)
    # ---- 14 a groan and a laugh (s15): dead air for the look, then a warm 'aww'
    a, b = S["s15"]
    t6a, t6b = tl.SPAN["v3_t06"]
    p = P("aww", -19.0, 19, "a groan and a laugh", "nothing at all for the 0.7 s look; then a warm vibes chord under his grin and a comic two-note button after 'gets it!'")
    for m in (deg(1, 0), deg(3, 0), deg(5, 0), deg(7, 0)):
        p.vib(t6a - 0.14, m, 0.42, dur=1.5, damp=t6b - t6a + 0.2)
    p.bass(t6b + 0.10, deg(5, -1), 0.7, 0.16)
    p.bass(t6b + 0.27, deg(1, -1), 0.75, 0.3)
    # ---- 15 insight, with dread under it (s16a)
    a, b = S["s16a"]
    n11a, n11b = tl.SPAN["v3_n11"]
    p = P("insight", -23.0, 20, "insight, with dread under it", "a cool glass pad that turns from minor to a darker chord on 'His mind was on his phone', slow vibes notes; very low: this is the film's answer")
    mid = tl.W("v3_n11", "his", 2)[0]
    p.gpad(a + 0.05, [deg(6, -1), deg(1, 0), deg(3, 0)], mid - a + 0.2, 0.42, att=0.5, rel=0.6)
    p.gpad(mid - 0.1, [deg(4, -1), deg(6, -1), deg(1, 0)], max(0.8, tl.s("v3_n12") - mid + 0.4), 0.42, att=0.5, rel=0.9)
    tm, k = a + 0.35, 0
    seq = (deg(6, 0), deg(8, 0), deg(10, 0), deg(8, 0), deg(4, 0), deg(6, 0), deg(8, 0), deg(6, 0))
    while tm < S["s16b"][0] - 0.3 and k < len(seq):
        p.vib(tm, seq[k], 0.36, dur=1.4, g=0.8)
        tm += (S["s16b"][0] - a - 0.6) / 6.0
        k += 1
    # ---- 16 a cheeky dare (s16b): the phone has the floor
    p = P("dare", -18.0, 21, "a cheeky dare", "one plucked question mark after the phone's 'do?' (the narrator answers it)")
    r1 = tl.e("v3_r01")
    p.pizz(r1 - 0.30, deg(2, 1), 0.5, p=0.2)
    p.pizz(r1 - 0.15, deg(3, 1) + 0, 0.55, p=0.2)
    # ---- 17 bright proof (s17): a counted pizzicato per ball, rising
    p = P("count", -17.5, 22, "bright proof", "a pizzicato note and a soft woodblock WITH each of the six balls, one step higher each time (the count you can hear)")
    for i, tb in enumerate(grid["balls"]):
        p.pizz(tb, deg(1 + i, 0), 0.55, p=-0.25)
        p.wb(tb, 0.3, fq=900.0 + 40 * i, g=0.5)
    # ---- 19 surprise (s19): a soft pad, one glockenspiel note for the ONE
    a, b = S["s19"]
    p = P("surprise", -24.0, 23, "surprise", "a light pad under 'when they pointed and said it out loud'; it stops for the beat before 'about one'")
    p.gpad(a + 0.1, [deg(6, -1), deg(3, 0), deg(5, 0)], max(0.6, tl.W("v3_n13", "loud")[1] - a), 0.4, att=0.4, rel=0.25)
    p = P("one", -13.5, 24, "surprise", "ONE glockenspiel note (the high tonic) with the single ball")
    p.glk(grid["one"], deg(8, 2), 0.6, dur=1.6)
    p.cel(grid["one"], deg(8, 1), 0.5)
    # ---- 20 a firm warning (s20)
    a, b = S["s20"]
    dr = tl.W("v3_n14", "drag")[0]
    p = P("warning", -19.5, 25, "a firm warning", "low strings grow under 'A finger and a shout'; THE POINT in firm unison (pizzicato + marimba, low) on 'drag your mind', cut off by the cut on 'back.'")
    p.strs(a + 0.1, [deg(1, -1), deg(5, -1), deg(1, 0)], b - a - 0.12, 0.45, att=0.8, rel=0.06, swell=lambda t: 0.5 + 0.5 * np.clip(t / max(0.5, b - a - 0.2), 0, 1))
    step_ = max(0.14, (b - dr - 0.04) / 5.0)
    for k, d in enumerate((3, 5, 6, 5, 3)):
        p.pizz(dr + 0.02 + k * step_, deg(d, 0), 0.65)
        p.mar(dr + 0.02 + k * step_, deg(d, 0), 0.6, g=0.8)
    cut20 = b
    # ---- 22 the blow (s22)
    a, b = S["s22"]
    meet = tl.ev(DOORS_B) + DOOR_T
    gb = tl.ev(GLIDE_B)
    p = P("blow_trem", -22.0, 26, "the blow", "a low tremolo with a flat seventh in it from 'Doors...' (something is wrong)")
    p.strs(a + 0.05, [deg(1, -1), deg(7, -1) - 1], max(0.5, meet - a - 0.08), 0.42, att=0.25, rel=0.05, trem=10.0)
    p = P("blow_hit", -12.5, 27, "the blow", "a low pizzicato and bass hit ON the door thump (the doors meet on the bag): the downbeat of the last phrase")
    p.bass(meet, deg(1, -2) + 12, 0.95, 0.6)
    p.pizz(meet, deg(1, -1), 0.8, dur=0.7)
    p.mar(meet, deg(1, -1), 0.7, dur=1.0)
    p = P("call4", -12.0, 28, "the blow", "THE CALL upside down on '...closed!' (the same two notes, falling: the plant's answer)")
    p.call(W("v3_d03", "closed")[0] + 0.03, "mar", up=False)
    p = P("glideB", -20.0, 29, "the blow", "THE POINT in the minor, slow, on a clarinet over two plucked notes, as the train glides away with the bag")
    for k, (d, acc) in enumerate(((3, -1), (5, 0), (6, -1), (5, 0))):
        if gb + 0.05 + k * 0.15 < S["s23"][0] - 0.02:
            p.clar(gb + 0.05 + k * 0.15, deg(d, 0) + acc, 0.17, 0.5)
    p.bass(gb + 0.02, deg(1, -1), 0.6, 0.3)
    # ---- 23 delight (s23): the kid's call
    a, b = S["s23"]
    ck = W("v3_k01", "check")[0]
    p = P("delight", -18.5, 30, "delight", "THE POINT on celesta + glockenspiel, bright and quick, under 'Bag...'")
    k0 = tl.s("v3_k01")
    step_ = max(0.1, (ck - k0 - 0.05) / 5.0)
    for k, d in enumerate((3, 5, 6, 5, 3)):
        p.cel(k0 + 0.02 + k * step_, deg(d, 2), 0.5)
        p.glk(k0 + 0.02 + k * step_, deg(d, 2), 0.35, dur=0.7, g=0.6)
    p = P("call5", -12.5, 31, "delight", "the boy's CALL (celesta + glockenspiel) ON his 'check!'; under it a muted trumpet sinks as the tourist's grin drains")
    p.call(tl.ev(SNAP_K01), "cel")
    p.tpt(tl.e("v3_k01") + 0.04, deg(5, 0), max(0.25, S["s24"][0] - tl.e("v3_k01") - 0.06), 0.5, fall=-5.0, g=0.5)
    # ---- 24 flat defeat (s24): two clarinet notes, and a DEAD STOP on 'gone.'
    a, b = S["s24"]
    g0 = W("v3_t07", "gone")[0]
    b0, b1 = W("v3_t07", "bag")
    p = P("defeat", -19.0, 32, "flat defeat", "two low clarinet notes falling a minor third with 'Bag...', held into the beat; the music STOPS DEAD on 'gone.'")
    p.clar(b0 - 0.02, deg(3, 0) - 1, max(0.2, b1 - b0), 0.5)
    p.clar(b1 + 0.0, deg(1, 0), max(0.3, g0 - b1 + 0.3), 0.5)
    p.strs(b0, [deg(1, -1)], max(0.5, g0 - b0 + 0.3), 0.3, att=0.2, rel=0.05, g=0.6)

    out = np.zeros((2, n_ext))
    dead = W("v3_t07", "gone")[0]
    for row in table:
        p = row.pop("part")
        cut = None
        if p.name in ("defeat", "call5", "delight", "glideB"):
            cut = dead
        elif p.name == "warning":
            cut = cut20
        elif p.name == "hope":
            cut = S["s15"][0] + 0.36                 # dead air for the look
        elif p.name in ("glee",):
            cut = S["s03"][0] + 0.05
        elif p.name in ("mockery",):
            cut = S["s05"][0] + 0.06
        elif p.name == "alarm":
            cut = S["s08"][0] + 0.5
        elif p.name == "insight":
            cut = S["s17"][0]
        elif p.name == "surprise":
            cut = tl.W("v3_n13", "about")[0] - 0.02
        out += p.out(vref, cut)
        row.update(a=round(p.a - (tl.L if p.a >= tl.L else 0), 3), b=round(min(p.b, cut if cut else 1e9) - (tl.L if p.a >= tl.L else 0), 3))
    # the pad of 'insight' steps back 10 dB under the departure melody (script 2.3 / bible)
    return out, table, dead


def build(n_ext, vref, grid):
    sc, table, dead = score(n_ext, vref, grid)
    mel = melody(n_ext, vref, grid)
    return sc, mel, table, dead

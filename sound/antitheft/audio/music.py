# Original score for "The Anti-Theft Sign That Made People Steal": a light, mischievous "caper" in D dorian
# (the raised 6th, B natural, keeps it sly instead of sad), composed and synthesized here: upright-bass pizzicato,
# string pizzicato stabs, marimba tune, celesta answers, woodblock tick-tock, a cool glass pad for the explainer and the
# final swell. No drums, no march, no end sting.
#
# Timing: the music runs on TEMPO REGIONS anchored to the narration (timeline.py reads the words / beats at run time):
# each region starts on the first word of its clause and holds a whole number of beats at ~112 bpm, so every region
# downbeat lands on its word and a new voice take only needs a re-run. Inside a region the arrangement switches by the
# time of the words (quote, whisper, pen-scratch holes, counter rolls, ...).
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp, ramp, shelf
import instruments as I
import timeline as T

N = ns(T.DUR)
F = I.m2f
BPM0 = 112.0
SWING = 0.08            # off-beat 8ths sit 8 % of a beat late: a light, sly lilt

# ---------------------------------------------------------------- harmony (D dorian)
# root / fifth = bass (2nd octave), up = pizzicato voicing, arp = marimba ostinato tones, pad = glass-pad voicing
CH = {
    "Dm": dict(root=38, fifth=45, up=[57, 62, 65], arp=[62, 69, 65, 69], pad=[50, 57, 62, 65, 69]),
    "G": dict(root=43, fifth=38, up=[59, 62, 67], arp=[62, 67, 71, 67], pad=[43, 55, 59, 62, 67]),
    "C": dict(root=36, fifth=43, up=[55, 60, 64], arp=[60, 67, 64, 67], pad=[48, 55, 60, 64, 67]),
    "F": dict(root=41, fifth=36, up=[57, 60, 65], arp=[60, 65, 69, 65], pad=[41, 53, 60, 65, 69]),
    "A7": dict(root=45, fifth=40, up=[55, 61, 64], arp=[61, 64, 67, 64], pad=[45, 55, 61, 64, 69]),
    "Bbmaj7": dict(root=34, fifth=41, up=[57, 62, 65], arp=[62, 65, 69, 65], pad=[46, 53, 57, 62, 65]),
    "Gm": dict(root=43, fifth=38, up=[58, 62, 67], arp=[62, 67, 70, 67], pad=[43, 55, 58, 62, 67]),
    "Dm9": dict(root=38, fifth=45, up=[57, 64, 65], arp=[62, 64, 65, 69], pad=[50, 57, 64, 65, 72]),
    "Gm9": dict(root=43, fifth=38, up=[58, 62, 69], arp=[62, 69, 70, 69], pad=[43, 58, 62, 65, 69]),
    "A7sus": dict(root=45, fifth=40, up=[55, 62, 64], arp=[62, 64, 67, 64], pad=[45, 55, 62, 64, 69]),
    "Dsus2": dict(root=38, fifth=45, up=[57, 62, 64], arp=[62, 64, 69, 64], pad=[50, 57, 64, 69]),
    "Gadd9": dict(root=43, fifth=38, up=[57, 59, 62], arp=[59, 62, 69, 62], pad=[43, 55, 62, 69, 71]),
    "G7": dict(root=43, fifth=38, up=[59, 65, 67], arp=[59, 62, 65, 67], pad=[43, 55, 59, 65, 67]),
    "D": dict(root=38, fifth=45, up=[57, 62, 66], arp=[62, 66, 69, 66], pad=[50, 57, 62, 66, 69, 74]),
}

# the tune: (beat, midi, length in beats, velocity) - 2-bar phrases
MOTIF_A = [  # Dm | G  - "the tiptoe": a sly turn, a chromatic sneak up to A, the dorian B natural
    (0, 74, .5, .9), (1, 77, .5, .7), (1.5, 76, .5, .65), (2, 74, .5, .8), (3, 69, .5, .75), (3.5, 68, .25, .5), (3.75, 69, .25, .6),
    (4, 71, .5, .8), (4.5, 72, .5, .7), (5, 74, 1.0, .85), (6.5, 81, .25, .55), (7, 79, .5, .7), (7.5, 77, .5, .65),
]
MOTIF_B = [  # C A7 | Dm  - the answer, landing on a comic low "plonk"
    (0, 76, .5, .85), (.5, 77, .5, .7), (1, 79, .5, .8), (1.5, 77, .25, .6), (1.75, 76, .25, .6), (2, 73, .5, .8), (3, 76, .5, .7),
    (3.5, 73, .5, .6), (4, 74, 1.5, .85), (6, 69, .5, .7), (7, 62, .5, .8),
]
POLITE = [  # C | F  - "Please don't ...": prim, pinky-up major
    (0, 79, .5, .7), (.5, 76, .5, .55), (1, 72, .5, .6), (2, 74, .5, .6), (2.5, 76, .5, .55), (3, 77, 1.0, .65),
    (4, 81, .5, .65), (4.5, 77, .5, .5), (5, 72, .5, .55), (6, 76, 1.0, .6),
]


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
        self.tr, self.send, self.cues, self.holes, self.mutes = {}, {}, [], {}, []
        self.wood_q = []                 # round 5 (A4 P3): woodblock hits are queued and filtered against the words (wood_pass)

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        for a, b in self.holes.get(name, []):
            if a <= t < b:
                return
        buf = self.track(name, 0.15)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(2006)


def _r():
    return rng(int(R.integers(1 << 30)))


def hum(t, ms=4.0):
    """humanized onset; never before 4 ms so nothing starts mid-waveform at the loop point (frame 0)"""
    return max(0.004, t + R.normal(0, ms / 1000.0))


def vj(v):
    return v * R.uniform(0.93, 1.05)


# ---------------------------------------------------------------- players
def bass(b, t, m, vel, length=0.32, slide=0.0):
    b.add("bass", I.bass_pizz(F(m), vj(vel), _r(), length=length, slide=slide), hum(t, 3), -0.08)


def pizz_chord(b, t, ch, vel, octave=0, p=0.28):
    for k, m in enumerate(CH[ch]["up"]):
        b.add("pizz", I.pluck(F(m + octave), vj(vel), _r(), dur=0.45, bright=0.55, pos=0.2), hum(t + 0.006 * k, 3), p - 0.1 * k)


def wood(b, t, vel, hi=True, accent=False):
    """queue a woodblock hit; wood_pass() keeps it in a word gap, lets an ACCENT (the 'honest' tick) through, allows at most
    one hit per WOOD_UNDER_WORDS_S under the words, and hands every other pulse to a soft muted pizz tick (A4 P3: the score
    ran a clear woodblock beat under speech; the references' beds are soft and tonal)"""
    b.wood_q.append((float(t), float(vel), bool(hi), bool(accent)))


WOOD_UNDER_WORDS_S = 2.0
WOOD_NO_PULSE = []                       # (a, b) s windows where a dropped pulse is NOT replaced (filled in build())


def wood_pass(b):
    spans = [(float(w["s"]) - 0.03, float(w["e"]) + 0.02) for w in T.WORDS]
    under = lambda t: any(a <= t <= z for a, z in spans)
    last_under = -99.0
    kept = dropped = ticks_ = 0
    for t, vel, hi, acc in sorted(b.wood_q):
        if acc or not under(t):
            b.add("wood", I.woodblock(vj(vel), _r(), 1180.0 if hi else 860.0), hum(t, 2), 0.35 if hi else 0.2)
            kept += 1
            continue
        if t - last_under >= WOOD_UNDER_WORDS_S:
            last_under = t
            b.add("wood", I.woodblock(vj(vel * 0.8), _r(), 1180.0 if hi else 860.0), hum(t, 2), 0.35 if hi else 0.2)
            kept += 1
            continue
        dropped += 1
        if any(a <= t < z for a, z in WOOD_NO_PULSE):
            continue
        # the pulse carries on as a dead (palm-muted) low pizz tick: weight, no consonant-band click
        b.add("tick", I.pluck(F(57 if hi else 50), vj(vel * 0.9), _r(), dur=0.11, bright=0.12, pos=0.3), hum(t, 2), 0.25 if hi else 0.1)
        ticks_ += 1
    b.cues.append((0.0, f"woodblock pass (A4 P3): {kept} hits kept (gaps / accents / <= 1 per {WOOD_UNDER_WORDS_S:g} s under words), "
                        f"{dropped} under words dropped, {ticks_} of them carried by a soft muted pizz tick"))


def mel(b, track, g, notes, b0, vel=1.0, tr=0, until=None, start=None, p=None, damp=True):
    """play a motif in grid g starting at beat b0; notes between start/until (absolute s) only"""
    for (bb, m, L, v) in notes:
        t = g.t(b0 + bb)
        if until is not None and t >= until:
            continue
        if start is not None and t < start:
            continue
        d = g.bl * L
        if track == "marimba":
            x = I.marimba(F(m + tr), vj(v * vel), _r(), damp=(d + 0.12) if damp and L <= 0.5 else None)
            pp = -0.25 if p is None else p
        elif track == "celesta":
            x = I.celesta(F(m + tr), vj(v * vel), _r(), damp=(d + 0.25) if damp and L <= 0.5 else None)
            pp = 0.22 if p is None else p
        elif track == "musicbox":
            x = I.musicbox(F(m + tr), vj(v * vel), _r())
            pp = 0.3 if p is None else p
        else:
            x = I.pluck(F(m + tr), vj(v * vel), _r(), dur=0.5, bright=0.6)
            pp = 0.1 if p is None else p
        b.add(track, x, hum(t, 3), pp)


def bass_bar(b, g, b0, ch, nxt, style, vel=0.75, until=None):
    c, n = CH[ch], CH[nxt]
    appr = n["root"] - 1 if n["root"] - 1 != c["root"] else n["root"] + 1
    pats = {
        "bouncy": [(0, c["root"], .4, 1.0), (1.5, c["root"] + 12, .25, .62), (2, c["fifth"], .4, .8), (3, c["root"], .3, .7), (3.5, appr, .25, .62)],
        "light": [(0, c["root"], .5, 1.0), (2, c["fifth"], .5, .75)],
        "tiptoe": [(0, c["root"], .3, .9), (2, c["fifth"], .3, .7), (3.5, appr, .2, .55)],
        "walk8": [(0, c["root"], .3, 1.0), (.5, c["root"] + 12, .2, .6), (1, c["fifth"], .3, .8), (1.5, c["root"] + 12, .2, .6),
                  (2, c["root"], .3, .9), (2.5, c["fifth"], .2, .65), (3, c["fifth"] + 2 if c["fifth"] + 2 < 50 else c["fifth"] - 2, .3, .75), (3.5, appr, .2, .7)],
        "half": [(0, c["root"], .45, .9)],
    }
    for (bb, m, L, v) in pats[style]:
        t = g.t(b0 + bb)
        if until is not None and t >= until:
            continue
        bass(b, t, m, vel * v, length=L * g.bl + 0.05)


def stabs(b, g, b0, ch, vel, beats=(1, 3), until=None, start=None):
    for bb in beats:
        t = g.t(b0 + bb)
        if (until is not None and t >= until) or (start is not None and t < start):
            continue
        pizz_chord(b, t, ch, vel)


def ticks(b, g, b0, vel, pattern="tt", until=None, start=None):
    pats = {"tt": [(1, True), (3, False)], "q": [(0, True), (1, False), (2, True), (3, False)],
            "8": [(k * 0.5, k % 2 == 0) for k in range(8)], "one": [(1, True)]}
    for bb, hi in pats[pattern]:
        t = g.t(b0 + bb)
        if (until is not None and t >= until) or (start is not None and t < start):
            continue
        wood(b, t, vel * (1.0 if hi else 0.8) * (1.0 if bb == int(bb) else 0.7), hi)


def ostinato(b, g, b0, ch, vel, beats=4, until=None, start=None, tr=12):
    arp = CH[ch]["arp"]
    for k in range(int(beats * 2)):
        t = g.t(b0 + k * 0.5)
        if (until is not None and t >= until) or (start is not None and t < start):
            continue
        m = arp[k % 4] + tr - 12
        b.add("marimba", I.marimba(F(m), vj(vel * (1.0 if k % 2 == 0 else 0.75)), _r(), damp=g.bl * 0.5 + 0.08), hum(t, 3), -0.3)


def glass(b, t0, t1, ch, vel, att=0.4, rel=0.6, swell=None, p=0.0):
    b.add("glass", I.glass_pad([F(m) for m in CH[ch]["pad"]], t1 - t0, vel, _r(), att=att, rel=rel, swell=swell), t0, p)


def trem(b, t0, t1, m, vel0, vel1, rate=14.0, track="marimba", p=-0.2):
    n = max(1, int((t1 - t0) * rate))
    for k in range(n):
        u = k / max(1, n - 1)
        t = t0 + k / rate
        b.add(track, I.marimba(F(m), vj(vel0 + (vel1 - vel0) * u), _r(), damp=1.5 / rate + 0.05, mallet=0.35), hum(t, 2), p + 0.1 * (k % 2))


def word_env(n, pre=0.03, post=0.05, smooth=0.02):
    """0..1 per sample: 1 while a word is spoken (words.json), smoothed edges"""
    e = np.zeros(n)
    for w in T.WORDS:
        e[max(0, ns(float(w["s"]) - pre)): min(n, ns(float(w["e"]) + post))] = 1.0
    k = max(1, ns(smooth))
    return np.convolve(e, np.ones(k) / k, mode="same")


def merge_thinned(b, src, dst, fc=1000.0):
    """A5 P2: the permission crescendo's rising marimba tremolo masked 'It gave them': while words sound it is
    low-passed at fc (4th order) so only its body stays; it is merged into the dst track BEFORE the track normalization,
    so the score's balance is unchanged"""
    if src not in b.tr:
        return
    x = b.tr.pop(src)
    b.send.pop(src, None)
    e = word_env(x.shape[1])[None, :]
    y = x * (1 - e) + lp(x, fc, 4) * e
    b.tr[dst] = b.tr.get(dst, np.zeros_like(y)) + y


# ---------------------------------------------------------------- sections (also used by mix.py for level automation)
def anchors():
    A = {k: T.bt(k) for k in T.BEAT}
    A["her"] = T.clause_t(7)
    A["like"] = T.clause_t(12)
    A["end"] = T.END_T
    return A


def sections():
    A = anchors()
    S = [("hook", 0.0, A["arizona"]), ("setting", A["arizona"], A["your"]), ("quote", A["your"], A["sheRead"]),
         ("whisper", A["sheRead"], A["but"]), ("mystery", A["but"], A["her"]), ("professor", A["her"], A["team"]),
         ("team", A["team"], A["oneSaid"]), ("signs", A["oneSaid"], A["withA"]), ("results", A["withA"], A["youSee"]),
         ("blueprint", A["youSee"], A["like"]), ("classroom", A["like"], A["signDidnt"]), ("permission", A["signDidnt"], A["and"]),
         ("twist", A["and"], A["soSome"]), ("swell", A["soSome"], A["end"]), ("tail", A["end"], T.DUR)]
    return S


SECTIONS = sections()


def build():
    b = Band()
    for name, send in [("bass", 0.08), ("pizz", 0.2), ("marimba", 0.2), ("celesta", 0.3), ("wood", 0.12), ("glass", 0.3),
                       ("musicbox", 0.3), ("triangle", 0.3), ("tick", 0.1)]:
        b.track(name, send)
    A = anchors()
    ce = lambda t, d: b.cues.append((t, d))

    # ============ HOOK 0 -> "Arizona's": light. tiptoe bass + soft pizz + celesta sly turn; out of the way of the glint
    g = Grid("hook", 0.0, A["arizona"])
    for bar, (ch, nx) in enumerate([("Dm", "G"), ("G", "Dm")]):
        bass_bar(b, g, bar * 4, ch, nx, "tiptoe", 0.7)
    stabs(b, g, 0, "Dm", 0.28)
    stabs(b, g, 4, "G", 0.26, beats=(1,))
    stabs(b, g, 4, "A7", 0.26, beats=(3,), until=A["steal1"] - 0.15)
    ticks(b, g, 0, 0.32, "tt")
    ticks(b, g, 4, 0.28, "one")
    mel(b, "celesta", g, MOTIF_A, 0, vel=0.62, until=g.t(6.0))
    # the sly answer to "...wanted to steal.": chromatic grace into the downbeat on "Arizona's"
    tg = T.gap_after(A["steal1"] + 0.05)[0] + 0.02
    b.add("pizz", I.pluck(F(56), 0.42, _r(), dur=0.3, bright=0.6), min(tg, A["arizona"] - 0.12), 0.2)
    b.add("pizz", I.pluck(F(57), 0.5, _r(), dur=0.35, bright=0.6), min(tg, A["arizona"] - 0.12) + 0.07, 0.2)
    ce(0.0, f"hook ({g.bpm():.0f} bpm): tiptoe pizz bass, soft pizz stabs, celesta plays the tiptoe turn (motif A bar 1); clears the high band before the glint on 'steal'")
    ce(tg, "sly chromatic pizz grace G#-A into the downbeat on 'Arizona's'")

    # ============ STORY: "Arizona's" -> "But" (setting, the quote, the whisper) - one tempo region
    g = Grid("story", A["arizona"], A["but"])
    bars = int(np.ceil(g.nb / 4))
    # chords per bar (bar = 4 beats); the quote's harmony darkens on "vandalized" (light dims) and turns on "14"
    prog = ["Dm", "G", "C", "Dm", "Bbmaj7", "Gm", "A7", "Dm", "Dm", "G"]
    t_quote, t_wsp, t_now, t_nowE = A["your"], A["whispered"], A["now"], A["nowEnd"]
    vb, t14, tpc = A["vandalized"], A["tons14"], A["piece"]
    flap_hole = (t14 - 0.25, t14 + 0.45)
    for hb in range(0, bars * 4, 2):                 # half-bars: each picks its texture by its own start time
        th = g.t(hb)
        if th >= A["but"] - 0.05:
            break
        bar, second = hb // 4, hb % 4 == 2
        ch = prog[min(bar, len(prog) - 1)]
        nx = prog[min(bar + 1, len(prog) - 1)]
        c = CH[ch]
        if th < t_quote - 0.05:          # setting: the tune over a bouncy bass
            appr = CH[nx]["root"] - 1
            pat = [(0, c["fifth"], .4, .8), (1, c["root"], .3, .7), (1.5, appr, .25, .62)] if second else \
                  [(0, c["root"], .4, 1.0), (1.5, c["root"] + 12, .25, .62)]
            for bb, m, L, v in pat:
                if g.t(hb + bb) < t_quote - 0.02:
                    bass(b, g.t(hb + bb), m, 0.8 * v, length=L * g.bl + 0.05)
            if g.t(hb + 1) < t_quote - 0.02:
                pizz_chord(b, g.t(hb + 1), ch, 0.34)
                wood(b, g.t(hb + 1), 0.38, not second)
        elif th < A["sheRead"] - 0.1:    # under the sign text: bass + soft stabs + clock-like woodblock quarters
            chh = "Dm" if th < vb - 0.25 else ("Bbmaj7" if th < t14 - 0.4 else ("Gm" if th < tpc - 0.6 else "A7"))
            if not (flap_hole[0] <= th < flap_hole[1]):
                bass(b, th, CH[chh]["root"] if not second else CH[chh]["fifth"], 0.62, length=0.3)
            if not (flap_hole[0] <= g.t(hb + 1) < flap_hole[1]):
                pizz_chord(b, g.t(hb + 1), chh, 0.2)
            for k in range(2):                       # A4 P2: no woodblock under the sign text - a soft muted pizz tick keeps the clock
                tk = g.t(hb + k, swing=False)
                if tk < A["sheRead"] - 0.2 and not (flap_hole[0] <= tk < flap_hole[1]):
                    b.add("tick", I.pluck(F(57 if k == 0 else 50), vj(0.2 * (1.0 if k == 0 else 0.8)), _r(), dur=0.1, bright=0.1, pos=0.3), hum(tk, 2), 0.2)
        else:                            # the whisper: tiptoe, thinning to almost nothing under the whispered line
            pat = [(0, 45, .3, .6), (1.5, 37, .2, .45)] if second else [(0, 38, .3, .8)]
            for bb, m, L, v in pat:
                t = g.t(hb + bb)
                if t < t_wsp - 0.05:
                    bass(b, t, m, 0.6 * v, length=L * g.bl + 0.05)
            if g.t(hb + 1) < t_now - 0.1:
                wood(b, g.t(hb + 1), 0.2, not second)
    b.holes["wood"] = [(A["tons14"] - 0.25, A["tons14"] + 0.45)]
    # the tune over the setting: motif A on marimba ("Arizona's ... pieces."), the answer up to "warning:"
    mel(b, "marimba", g, MOTIF_A, 0, vel=0.85, until=t_quote - 0.05)
    mel(b, "marimba", g, MOTIF_B, 8, vel=0.75, until=t_quote - 0.05)
    mel(b, "celesta", g, [(5, 86, 1.0, .5), (7, 83, .5, .45)], 0, vel=0.7, until=t_quote)
    # "...mostly a small piece at a time.": three tiny descending celesta notes D-C-A. A5 P2: they sat ON 'small piece'
    # (1-4 kHz margin 2.8 dB): now a quick twinkle in the gap after 'time."' (before 'She read it'), ringing out under it
    try:
        ts = float(T.word("small", A["tons14"])["s"])
        te_ = float(T.word("time", ts)["e"])
        g0_, g1_ = T.gap_after(te_ - 0.01, 0.1)
    except KeyError:
        ts, g0_, g1_ = A["piece"] - 0.2, 0.0, 0.0
    if g1_ - g0_ >= 0.14:
        t_fig, sp_, v0, oct_ = g0_ + 0.015, min(0.075, (g1_ - g0_ - 0.04) / 2), 0.42, 0
    else:                                          # no gap: an octave up, -6 dB, still on 'small'
        t_fig, sp_, v0, oct_ = ts, 0.12, 0.21, 12
    for k, m in enumerate([86, 84, 81]):
        b.add("celesta", I.celesta(F(m + oct_), v0 - 0.06 * k * (v0 / 0.42), _r(), damp=0.16), float(t_fig) + sp_ * k, 0.3)
    ts = t_fig
    # the whisper: a sly celesta turn on "leaned over", then only ticks + a last low bass note; "now." gets the plonk
    mel(b, "celesta", Grid("lean", A["leaned"], A["leaned"] + 4 * g.bl, nb=4), [(0, 69, .25, .6), (.5, 68, .25, .45), (.75, 69, .25, .55), (1.5, 74, .5, .6), (2.5, 72, .25, .45), (3, 71, .5, .5)], 0, vel=0.62, until=t_wsp + 0.1)
    bass(b, t_now - 0.01, 38, 0.95, length=0.22)
    b.add("celesta", I.celesta(F(81), 0.4, _r(), damp=0.12), t_now + 0.02, 0.3)
    b.add("celesta", I.celesta(F(80), 0.3, _r(), damp=0.2), t_now + 0.13, 0.3)
    b.mutes.append((t_nowE + 0.18, A["but"] - 0.02))
    ce(A["arizona"], f"setting ({g.bpm():.0f} bpm): marimba tune (motif A Dm|G, answer B C-A7|Dm), bouncy pizz bass, pizz stabs, a tick-tock that is "
                     "woodblock only in the word gaps (muted pizz ticks under the words)")
    ce(t_quote, "the sign text: tune stops; bass + soft stabs + clock-like MUTED PIZZ quarters, no woodblock (A4 P2: out of the consonant band)")
    ce(A["vandalized"], "harmony darkens to Bbmaj7 as the light dims on 'vandalized'")
    ce(A["tons14"] - 0.25, "music steps aside (no bass/woodblock) for the flip-counter flaps on '14'")
    ce(float(ts), "three tiny celesta notes D-C-A, a quick twinkle in the gap after 'a small piece at a time.' (A5 P2: off the words)")
    ce(A["leaned"], "whisper: sly celesta turn on 'leaned over', tiptoe bass; almost nothing under the whispered line")
    ce(t_now, "comic low pizz 'plonk' + celesta G#-A grace on 'now.' (the fiance's shock), then silence")

    # ============ MYSTERY "But why would a warning ...": sparse, suspended, ONE woodblock tick on "honest"
    t0, t1, th = A["but"], A["her"], A["honest"]
    glass(b, t0 - 0.02, th, "Dsus2", 0.55, att=0.35, rel=0.5)
    glass(b, th, t1 + 0.15, "Gadd9", 0.5, att=0.3, rel=0.45)
    bass(b, t0, 38, 0.7, length=0.9)
    bass(b, th, 31, 0.6, length=0.8)
    for k, (dt, m, v) in enumerate([(0.12, 69, .55), (0.5, 74, .5), (0.88, 76, .5), (1.26, 81, .55)]):
        if t0 + dt < th - 0.1:
            b.add("celesta", I.celesta(F(m), v, _r()), t0 + dt, 0.2 - 0.1 * k)
    try:                                            # A5 P3: the lone tick masked the stressed word (6.4 dB margin)
        hw = T.word("honest", th - 0.3)
        nxt_ = [float(w["s"]) for w in T.WORDS if float(w["s"]) >= float(hw["e"]) - 1e-3]
        free = (nxt_[0] - float(hw["e"])) if nxt_ else 1.0
    except KeyError:
        hw, free = None, 0.0
    if hw is not None and free >= 0.06:             # a gap after the word: the tick goes there, full level
        wood(b, float(hw["e"]) + 0.01, 0.75, True, accent=True)
        th_tick = float(hw["e"]) + 0.01
    else:                                           # no gap: on the onset, -6 dB, 2 kHz low-pass (soft wooden 'tok', no click)
        b.add("wood", lp(I.woodblock(0.75 * 0.5, _r(), 1180.0), 2000, 2), hum(th, 2), 0.35)
        th_tick = th
    st2 = A["steal2"]
    b.add("celesta", I.celesta(F(79), 0.42, _r(), damp=0.3), st2 - 0.02, 0.25)
    b.add("celesta", I.celesta(F(81), 0.5, _r()), st2 + 0.16, 0.25)
    ce(t0, "mystery: glass pad Dsus2 -> Gadd9 (suspended), slow rising celesta A-D-E-A, low pizz D")
    ce(th_tick, "ONE woodblock tick on 'honest' (A5 P3: in the gap after the word, or on its onset at -6 dB with a 2 kHz low-pass)")
    ce(st2, "celesta G-A question on 'steal?' (left hanging)")

    # ============ TEST "Her fiance's professor ..." -> "You see,": busier
    g = Grid("test", A["her"], A["youSee"])
    pen_holes = [(A["professor"] + 0.30, A["professor"] + 0.70), (A["cialdini"] + 0.45, A["testedIt"] + 0.05)]
    for k in ("celesta", "wood", "pizz"):
        b.holes[k] = b.holes.get(k, []) + pen_holes
    bt_ = lambda name: g.b(A[name])
    b_team, b_one, b_withA, b_end = bt_("team"), bt_("oneSaid"), bt_("withA"), g.nb
    # harmony map (2 beats each) over the whole region
    p_start = np.ceil(g.b(A["please1"]) - 0.5)          # the POLITE tune's first beat (sign A text)
    m_start = np.ceil(g.b(A["many1"]) - 0.5)            # the sly tune's first beat (sign B text)

    def chord_at(beat):
        """the harmony follows the tunes and the story beats (evaluated per note, so changes may fall on odd beats)"""
        t = g.t(beat, swing=False)
        if beat < b_team:
            return ["Dm", "Dm", "G", "G"][int(beat // 2) % 4]
        if beat < b_one:
            return ["C", "A7", "Dm", "Dm"][int((beat - 8) // 2) % 4]
        if beat < b_withA:
            if t < A["another"] - 0.1:                   # "Please don't remove ...": prim C, the F5 lands on G7
                return "G7" if p_start + 2 <= beat < p_start + 4 else "C"
            return "Dm" if beat < m_start + 4 else "G"    # "Many past visitors ...": the sly Dm | G
        if t < A["pct2"] + 0.3:                          # results: Dm into "2%", Bb on "vanished", Gm, A7 for the build
            return "Dm"
        if t < A["vanished"] + 0.4:
            return "Bbmaj7"
        if t < A["withB"] - 0.05:
            return "Gm"
        return "A7"

    for beat in np.arange(0, b_end, 2.0):
        ch, nx = chord_at(beat), chord_at(beat + 2)
        t = g.t(beat)
        if t >= A["pct8"] - 0.05:
            break
        results = t >= A["withA"] - 0.05
        busy = results or (A["team"] - 0.05 <= t < A["oneSaid"])
        # bass: bouncy in the professor shot, walking 8ths in team/results, light under the two sign texts
        if results or busy:
            style = "walk8"
        elif t >= A["oneSaid"] - 0.05:
            style = "light"
        else:
            style = "bouncy"
        c = CH[ch]
        pat = {"bouncy": [(0, c["root"], .4, 1.0), (1.5, c["root"] + 12, .25, .62)],
               "light": [(0, c["root"], .45, .9)],
               "walk8": [(0, c["root"], .3, 1.0), (.5, c["root"] + 12, .2, .6), (1, c["fifth"], .3, .8), (1.5, CH[nx]["root"] - 1, .2, .62)]}[style]
        if style == "bouncy" and beat % 4 == 2:
            pat = [(0, c["fifth"], .4, .85), (1.5, CH[nx]["root"] - 1, .25, .6)]
        for bb, m, L, v in pat:
            tt_ = g.t(beat + bb)
            cb = chord_at(beat + bb)
            if cb != ch and bb >= 1:                      # a change on the odd beat: re-root the second half
                m = {CH[ch]["root"]: CH[cb]["root"], CH[ch]["root"] + 12: CH[cb]["root"] + 12, CH[ch]["fifth"]: CH[cb]["fifth"]}.get(m, m)
            if tt_ < A["pct8"] - 0.05 and not (A["withB"] + 0.9 <= tt_ < A["pct8"] - 0.36 and bb > 0):
                bass(b, tt_, m, 0.78 * v * (1.12 if results else 1.0), length=L * g.bl + 0.05)
        # pizz stabs on the off-beat quarter, woodblock clip-clop
        if t < A["pct8"] - 0.4:
            pizz_chord(b, g.t(beat + 1), chord_at(beat + 1), 0.3 if not results else 0.34)
            if busy and not (A["withB"] + 0.95 <= t < A["pct8"]):
                for k in range(4):
                    wood(b, g.t(beat + 0.5 * k), 0.3 * (1.0 if k % 2 == 0 else 0.7), k % 2 == 0)
            elif not busy:
                wood(b, g.t(beat + 1), 0.3, beat % 4 == 0)
        # marimba ostinato in the team shot and the results
        if busy and not (A["withB"] + 0.9 <= t < A["pct8"]):
            ostinato(b, g, beat, ch, 0.42 if results else 0.36, beats=1, until=A["pct8"] - 0.08)
            ostinato(b, g, beat + 1, chord_at(beat + 1), 0.42 if results else 0.36, beats=1, until=A["pct8"] - 0.08)
    # the tunes: professor = motif A on marimba + slow celesta counter-line (morning); team = answer on celesta;
    # sign A text = POLITE (prim C|F); sign B text = the sly motif A an octave down
    mel(b, "marimba", g, MOTIF_A, 0, vel=0.8, until=A["team"] - 0.1)
    for bb, m in [(0, 77), (2, 76), (4, 74), (6, 71)]:
        if g.t(bb) < A["team"] - 0.2:
            b.add("celesta", I.celesta(F(m + 12), 0.36, _r()), g.t(bb), 0.3)
    mel(b, "celesta", g, MOTIF_B, 8, vel=0.62, until=A["oneSaid"] - 0.05, start=A["team"] - 0.05)
    mel(b, "celesta", g, POLITE, p_start, vel=0.55, until=A["another"] - 0.05, start=A["oneSaid"])
    mel(b, "marimba", g, MOTIF_A, m_start, vel=0.62, tr=-12, until=A["withA"] - 0.05, start=A["another"])
    # results: celesta run up into "2%" (lands with a soft stab), a "vanished" marimba drop, the build, the hush, the stop
    p2, p8 = A["pct2"], A["pct8"]
    run = [74, 76, 77, 79, 81, 83, 84, 86]
    for k, m in enumerate(run):
        b.add("celesta", I.celesta(F(m), 0.3 + 0.03 * k, _r(), damp=0.12), p2 - 0.75 + k * 0.75 / len(run), 0.25)
    pizz_chord(b, p2, "Dm", 0.45)
    b.add("celesta", I.celesta(F(86), 0.5, _r()), p2, 0.3)
    tv = A["vanished"]
    try:
        tve = float(T.word("vanished", tv - 0.15)["e"]) + 0.01          # A4 P2: AFTER the word (it landed ON 'vanished')
    except KeyError:
        tve = tv + 0.45
    for k, m in enumerate([81, 77, 74, 69, 65]):
        b.add("marimba", I.marimba(F(m), (0.55 - 0.06 * k) * 0.7, _r(), damp=0.1), tve + k * 0.04, -0.2 + 0.1 * k)
    tw = A["withB"]
    t_hush = T.gap_after(tw + 0.5, 0.25)[0]
    for k, m in enumerate([62, 64, 65, 67, 69]):
        b.add("marimba", I.marimba(F(m + 12), 0.4 + 0.06 * k, _r(), damp=0.15), tw + 0.08 + k * (t_hush - tw - 0.1) / 5, -0.2)
    trem(b, t_hush, p8 - 0.06, 69, 0.18, 0.36, track="marimba")
    bass(b, t_hush, 45, 0.6, length=p8 - t_hush - 0.1)
    b.mutes.append((p8 - 0.03, A["youSee"] + 0.28))
    ce(A["her"], f"test ({g.bpm():.0f} bpm): the tune returns on marimba + a slow celesta counter-line (morning); holes for the pen scratches")
    ce(A["team"], "team: busier - walking pizz 8ths, marimba ostinato, the clip-clop on muted pizz ticks (woodblock only in the gaps), the answer on celesta")
    ce(A["please1"], "sign A text: prim 'polite' C|F tune on celesta, light bass")
    ce(A["many1"], "sign B text: the sly tiptoe tune an octave down on marimba (Dm|G)")
    ce(p2 - 0.75, "results: celesta run up into '2%' (lands with a soft pizz stab on the counter landing)")
    ce(tve, "'vanished': quick marimba drop A-F-D-A-F, in the gap AFTER the word (A4 P2)")
    ce(tw, "the build on 'many past visitors' ...")
    ce(t_hush, "... hush in the pause before 'almost': marimba tremolo on A + held low A")
    ce(p8 - 0.03, "STOP-TIME on '8%': the music cuts so the cha-ching rings alone; silent through 'You see,'")

    # ============ BLUEPRINT "You see, ...": cool and simple - glass pad + slow celesta arpeggio + soft bass on 1
    tin = A["youSee"] + 0.28
    seg = [(tin, A["eachOther"] - 0.45, "Dm9"), (A["eachOther"] - 0.45, A["manySteal"], "Bbmaj7"), (A["manySteal"], A["sounds"], "Gm9"),
           (A["sounds"], A["everyone"], "A7sus"), (A["everyone"], A["like"], "A7")]
    g = Grid("blue", tin, A["like"])
    for (a, z, ch) in seg:
        glass(b, a, z + 0.05, ch, 0.5, att=0.25 if a > tin else 0.5, rel=0.35)
        bass(b, a + 0.01, CH[ch]["root"], 0.5, length=min(0.9, z - a))
    for k in range(int(g.nb)):
        t = g.t(k, swing=False)
        ch = next(c for (a, z, c) in seg if a - 1e-6 <= t < z + 1e-6) if t < A["like"] else "A7"
        tones = CH[ch]["arp"]
        b.add("celesta", I.celesta(F(tones[k % 4] + 12), 0.3 + 0.04 * (k % 2 == 0), _r()), hum(t, 3), 0.35 - 0.15 * (k % 2))
    ce(tin, "blueprint (cool and simple): glass pad Dm9 - Bbmaj7 - Gm9 - A7sus - A7, slow celesta arpeggio, soft bass on each change; enters after 'You see,'")

    # ============ CLASSROOM "Like a teacher saying ...": tiptoe returns; chalk gets the high band; the hook figure mirrors
    g = Grid("class", A["like"], A["signDidnt"])
    chalk = (A["teacher"] - 0.1, A["cheated"] + 0.55)
    prog = ["Dm", "A7", "Dm", "G"]
    for bar in range(int(np.ceil(g.nb / 4))):
        for half in (0, 2):
            beat = bar * 4 + half
            if beat >= g.nb:
                break
            ch = prog[(beat // 2) % 4]
            bass(b, g.t(beat), CH[ch]["root"] if half == 0 else CH[ch]["fifth"], 0.62, length=0.28)
            t1_ = g.t(beat + 1)
            if not (chalk[0] <= t1_ < chalk[1]):
                pizz_chord(b, t1_, ch, 0.26)
            else:
                for m in CH[ch]["up"][:2]:
                    b.add("marimba", I.marimba(F(m), 0.4, _r(), damp=0.2), t1_, -0.2)
        ticks(b, g, bar * 4, 0.24, "tt", start=chalk[1])
    mel(b, "celesta", Grid("mirror", A["hears"], A["hears"] + 4 * g.bl, nb=4), MOTIF_A[:7], 0, vel=0.55, until=A["signDidnt"] - 0.1)
    ce(A["like"], f"classroom ({g.bpm():.0f} bpm): tiptoe bass + low marimba while the chalk writes (no highs), pizz after")
    ce(A["hears"], "the hook's tiptoe turn on celesta again on 'hears: everybody cheats.' (mirrors the hook)")

    # ============ PERMISSION "The sign didn't stop thieves. It gave them permission.": build, then the stamp in silence
    g = Grid("perm", A["signDidnt"], A["and"])
    tp = A["permission"]
    nb8 = int(np.floor(g.b(tp - 0.05) * 2))
    for k in range(nb8):
        t = g.t(k * 0.5, swing=False)
        u = k / max(1, nb8 - 1)
        bass(b, t, 38 if g.t(k * 0.5) < A["gave"] else 45, 0.35 + 0.5 * u, length=0.16)
    rise = [69, 70, 71, 72, 73]
    nq = int(np.floor(g.b(tp - 0.05)))
    for k in range(nq):
        t0_, t1_ = g.t(k, False), min(g.t(k + 1, False), tp - 0.06)
        trem(b, t0_, t1_, rise[min(k, 4)] + 12, 0.16 + 0.07 * k, 0.22 + 0.08 * k, rate=16.0, track="tremP")
        pizz_chord(b, t0_, ["Dm", "Bbmaj7", "G", "A7", "A7"][min(k, 4)], 0.24 + 0.05 * k)
    b.mutes.append((tp - 0.035, A["and"] - 0.02))
    merge_thinned(b, "tremP", "marimba")
    ce(A["signDidnt"], f"permission ({g.bpm():.0f} bpm): pizz bass 8ths crescendo + rising marimba tremolo A-Bb-B-C-C# (Dm-Bb-G-A7); the tremolo is "
                       "low-passed at 1 kHz while words sound (A5 P2) and the whole build sits -6 dB from 'thieves.' to the cut (mix.py BEAT_DUCKS)")
    ce(tp - 0.035, "CUT just before the stamp: it lands in silence; music returns on 'And'")

    # ============ TWIST "And the bait wood? ..." -> the last word: night celesta, then the small swell; ends ON 'twice.'
    g = Grid("twist", A["and"], A["twice"])
    glass(b, A["and"] - 0.02, A["came"], "Dsus2", 0.4, att=0.3, rel=0.4)
    for dt, m, v in [(0.1, 69, .5), (0.42, 74, .45), (0.74, 76, .45), (1.05, 81, .5)]:
        if A["and"] + dt < A["came"] - 0.1:
            b.add("celesta", I.celesta(F(m), v, _r()), A["and"] + dt, 0.25)
    b0 = np.ceil(g.b(A["came"]) - 0.25)
    mel(b, "celesta", g, MOTIF_A, b0, vel=0.6, until=A["pieces"] - 0.05)
    mel(b, "musicbox", g, MOTIF_A, b0, vel=0.32, tr=12, until=A["pieces"] - 0.05)
    b1 = np.ceil(g.b(A["pieces"]) - 0.25)
    mel(b, "celesta", g, MOTIF_B, b1, vel=0.62, until=A["soSome"] - 0.05)
    mel(b, "marimba", g, MOTIF_B, b1, vel=0.45, tr=-12, until=A["soSome"] - 0.05)
    tprog = [("Dsus2", A["came"]), ("Dm", A["came"]), ("G", g.t(b0 + 4)), ("C", g.t(b1)), ("A7", g.t(b1 + 2)), ("Dm", g.t(b1 + 4))]
    for beat in np.arange(np.floor(g.b(A["came"])), g.b(A["soSome"]) - 0.01, 2.0):
        t = g.t(beat)
        ch = [c for c, tc in tprog if tc <= t + 1e-6][-1] if t >= A["came"] else "Dsus2"
        if ch == "Dsus2":
            ch = "Dm"
        bass(b, t, CH[ch]["root"], 0.6, length=0.3)
        bass(b, g.t(beat + 1.5), CH[ch]["root"] + 12, 0.38, length=0.18)
        pizz_chord(b, g.t(beat + 1), ch, 0.22)
        wood(b, g.t(beat + 1), 0.2, True)
    # the small swell: glass pad from "mailed" to the last word, bass climbs D-E-F#-G to A on "stolen", D major on "twice"
    tm, ts_, tst, tt2, te = A["mailed"], A["soSome"], A["stolen"], A["twice"], A["end"]
    sw = lambda t, a=tm, z=tt2: 0.35 + 0.65 * np.clip((t) / max(0.1, z - a), 0, 1) ** 1.6
    glass(b, tm, ts_, "Dm", 0.42, att=0.6, rel=0.3, swell=lambda t: 0.4 + 0.6 * np.clip(t / max(0.1, ts_ - tm), 0, 1))
    glass(b, ts_, tst, "G", 0.6, att=0.12, rel=0.25)
    glass(b, tst, tt2, "A7", 0.7, att=0.12, rel=0.2)
    climb = [(ts_, 38), (ts_ + (tst - ts_) * 0.33, 40), (ts_ + (tst - ts_) * 0.66, 42), (tst, 45)]
    for t, m in climb:
        bass(b, t, m, 0.75, length=0.3)
    for k, m in enumerate([62, 66, 69, 74, 78]):
        b.add("celesta", I.celesta(F(m + 12 if m < 70 else m), 0.38 + 0.05 * k, _r(), damp=0.3), ts_ + 0.1 + k * (tst - ts_ - 0.15) / 5, 0.3 - 0.12 * k)
    trem(b, tst, tt2 - 0.03, 69, 0.2, 0.42, rate=16.0)
    trem(b, tst, tt2 - 0.03, 73, 0.16, 0.36, rate=15.0, p=0.25)
    # the final chord: on "twice." - D major (the warning that worked twice), dies with the word
    # A5 P3: the final chord read +5 dB over the bed (almost a sting) and rang through the loop button: -2 dB, and it is
    # gone (-60 dB) by the end of the 15 -> 16 dissolve, at most 0.4 s after the last word, so only wind crosses into frame 0
    s16 = T.SHOTS[T.LAST]
    x16 = int(s16.get("xfade") or 0)
    t_off = min(T.fr(s16["a"] - x16 // 2 + x16), te + 0.4) if T.LAST > 15 else te + 0.4
    t_off = float(np.clip(t_off, te + 0.15, T.DUR - 0.05))
    vchord = 10 ** (-2.0 / 20)
    glass(b, tt2, t_off + 0.1, "D", 0.75 * vchord, att=0.04, rel=0.08)
    bass(b, tt2, 38, 0.9 * vchord, length=t_off - tt2)
    for m in [62, 66, 69]:
        b.add("marimba", I.marimba(F(m), 0.5 * vchord, _r()), tt2 + 0.005, -0.2)
    b.add("celesta", I.celesta(F(78), 0.45 * vchord, _r()), tt2 + 0.01, 0.3)
    ce(A["and"], "twist: night - celesta question (Dsus2 pad) on 'And the bait wood?'")
    ce(A["came"], "the tune returns softly on celesta + music box an octave up (night), tiptoe bass")
    ce(A["pieces"], "the answer on celesta + low marimba ('pieces people stole, then mailed back ...')")
    ce(tm, "small swell begins: glass pad crescendo from 'mailed'")
    ce(ts_, "peak: 'So some of it got stolen twice.' - bass climbs D-E-F#-A, celesta arpeggio up, pad G -> A7, marimba tremolo")
    ce(tt2, "final D-major chord ON 'twice.' (no sting): pad + marimba + celesta, dies with the word")
    ce(te, f"after the last word the D-major chord (-2 dB) fades out exponentially to -60 dB by {t_off:.2f} s (the end of the 15 -> 16 dissolve, <= 0.4 s after "
           "the word); silence to the last sample (exactly 0), so only the noon wind crosses into frame 0's pizz (A5 P3)")
    b.end_fade = (te, t_off)
    wood_pass(b)
    return b


TARGET = {  # relative balance inside the score (LU, each track's integrated loudness over its active span)
    "bass": -1.0, "pizz": -6.5, "marimba": 0.0, "celesta": -1.5, "wood": -8.0, "glass": -4.0, "musicbox": -9.0, "triangle": -16.0,
    "tick": -13.0,
}
BASS_LOW_SHELF = (110.0, -3.0)          # A4 P2 (tonal balance: the sub band ran ~5 dB over the references)


def render(b, ref=-20.0):
    room = make_ir(1.25, 7, pre=0.016, hf=1.5, early=[(0.021, 0.35, -0.5), (0.034, 0.25, 0.5)])
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
    # stop-time mutes (after the reverb, so the cuts are clean) and the end
    gcur = np.ones(N)
    for a, z in b.mutes:
        ia, iz = ns(a), ns(z)
        f_out = ns(0.035)
        gcur[ia: ia + f_out] = np.minimum(gcur[ia: ia + f_out], np.linspace(1, 0, f_out)[: max(0, min(f_out, N - ia))])
        gcur[ia + f_out: iz] = 0.0
        f_in = ns(0.012)
        gcur[iz: iz + f_in] = np.minimum(gcur[iz: iz + f_in], np.linspace(0, 1, f_in)[: max(0, min(f_in, N - iz))])
    a, z = b.end_fade
    ia, iz = ns(a), min(N, ns(z))
    if z - a > 0.05:                               # A5: a dB-linear fade to -60 dB (a natural decay), then digital silence
        gcur[ia:iz] *= 10 ** (-60.0 / 20.0 * np.linspace(0, 1, iz - ia))
    else:
        gcur[ia:iz] *= np.linspace(1, 0, iz - ia) ** 1.5
    gcur[iz:] = 0.0
    out *= gcur[None, :]
    return out, levels

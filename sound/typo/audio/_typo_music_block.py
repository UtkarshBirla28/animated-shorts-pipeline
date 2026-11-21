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
    pulse(b, Cn, pC, 0, Cn.nb, 0.42, div=4, bright=0.45)
    bassline(b, Cn, pC, 0, Cn.nb, 0.55, every=1)
    ticks(b, Cn, 0, Cn.nb, 0.42)
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

# ================================================================ TYPO (short #3) picture events: BEAT-keyed, no probes
def picture_probes():
    return ({}, ["typo: no picture probes (every cue is keyed to BEAT names from words.json / story.ts)"])


def picture_events():
    """picture_events.json overrides (frames, lists, dicts, 'beat+n' expressions or null); cues() adds its defaults"""
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


# ---------------------------------------------------------------- small synth sources the generators lack
def _mono_sum(*xs):
    n = max(len(x) for x in xs)
    y = np.zeros(n)
    for x in xs:
        y[: len(x)] += x
    return y


def _noise_burst(r, dur, lo, hi, tau):
    n = ns(dur)
    x = bp(r.standard_normal(n), lo, hi, 2) * np.exp(-np.arange(n) / (tau * SR))
    return x / (np.max(np.abs(x)) + 1e-9)


def key_click(r, big=False):
    """a 2005 office keyboard key: a plastic click on the way down + the bottom-out thock"""
    clk = _noise_burst(r, 0.012, 2200.0, 7500.0, 0.0025) * 0.7
    th = G.wood_knock(r, f0=(150.0 if big else 230.0) * r.uniform(0.95, 1.05), tau=0.04 if big else 0.022, hard=1.0)
    th = th / (np.max(np.abs(th)) + 1e-9) * (1.0 if big else 0.75)
    y = _mono_sum(clk, np.concatenate([np.zeros(ns(0.004)), th]))
    if big:                                   # the big ENTER / CANCEL key: a second, lower bottom-out + the return click
        y = _mono_sum(y, np.concatenate([np.zeros(ns(0.11)), _noise_burst(r, 0.01, 1800.0, 6000.0, 0.002) * 0.35]))
    return y


def mouse_click(r):
    a = _noise_burst(r, 0.008, 1500.0, 6500.0, 0.0015)
    b = _noise_burst(r, 0.008, 1200.0, 5000.0, 0.0015) * 0.5
    return _mono_sum(a, np.concatenate([np.zeros(ns(r.uniform(0.05, 0.08))), b]))


def beeps(r, f0=1050.0, n=3, on=0.16, off=0.12):
    t = np.arange(ns(n * (on + off))) / SR
    g = ((t % (on + off)) < on).astype(float)
    g = np.convolve(g, np.ones(ns(0.006)) / ns(0.006), "same")
    return np.sin(2 * np.pi * f0 * t) * g * 0.6 + np.sin(2 * np.pi * 2 * f0 * t) * g * 0.1


def bug_buzz(r, dur=0.8):
    t = np.arange(ns(dur)) / SR
    f = 175.0 + 12.0 * np.sin(2 * np.pi * 3.1 * t) + r.normal(0, 1.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 27.0 * t)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.15)
    return bp(saw * am * env, 300.0, 3200.0, 2)


def ghost_shimmer(r, dur=1.2, rise=True):
    y = np.zeros(ns(dur + 0.6))
    for k in range(6):
        f0 = (2400.0 if rise else 3600.0) * (1.12 ** (k if rise else -k))
        G._place_mono(y, G.tiny_ting(r, f0=f0, tau=0.25) * (0.55 + 0.08 * k), k * dur / 6)
    return y


def _ramp(x, a, b):
    return x * np.linspace(a, b, x.shape[-1])


def _counter_spin(r, dur, rate=24.0):
    """a fast digital / mechanical counter: a dense tick clatter that speeds up"""
    y = np.zeros(ns(dur + 0.1))
    tm, k = 0.0, 0
    while tm < dur:
        G._place_mono(y, G.flap(r, False) * r.uniform(0.35, 0.6), tm)
        k += 1
        tm += 1.0 / (rate * (0.6 + 0.8 * min(1.0, tm / max(0.2, dur))))
    return y


# ================================================================ the events (frames from BEAT names; see SCRIPT.md beats)
def cues():
    D, _ = picture_events()
    C = []
    seed = [5000]
    B = T.BEAT

    def one(fn, anchor=0.0):
        def g():
            seed[0] += 1
            return fn(rng(seed[0])), anchor
        return g

    def ev(name, f, desc, gen, level, pe=None, **kw):
        if f is None:
            return
        C.append(Cue(T.fr(f), name, desc, gen, level, pe=pe, **kw))

    def ev_t(name, t, desc, gen, level, pe=None, **kw):
        C.append(Cue(float(t), name, desc, gen, level, pe=pe, **kw))

    # ---------------- 1 HOOK: the ENTER key, certificates puff out like toast, the SHARES SOLD counter races
    ev("hook", _P("hook_whoosh_1", 2), "a quick whoosh under the hook title popping in (frame 2; frame 0 stays clean)",
       one(lambda r: G4.spin_whoosh(r, 0.3)), -24, p=0.0, send=0.0)
    ev("key", _P("enter_1", B["typo"] + 1), "the finger lands on the big glowing ENTER key (desk_beats PRESS1.contact)",
       one(lambda r: key_click(r, True)), -17, p=0.05, space="room", send=0.05)
    t0 = B["typo"] + 3
    K, RM = 16.0, 2.0
    XB = np.log(RM * K)
    for i in range(0, 24):                     # desk_cert.ts launchAt(i) = T0 + K ln(1 + i): the first 24 pops one by one
        f = t0 + K * np.log(1 + i)
        if f > B["exist1"]:
            break
        ev("puff", f, f"certificate {i + 1} puffs out of the keyboard like toast",
           one(lambda r, i=i: _mono_sum(G.pop(r, f0=420.0 + 18 * (i % 5), up=True, dur=0.09) * 0.8,
                                        np.concatenate([np.zeros(ns(0.02)), G.paper_rustle(r, 0.16, 1.3) * 0.6]))),
           -27 - min(6, i * 0.35), p=0.25 * np.sin(i * 1.7), space="room", send=0.04)
    fa = t0 + K * XB - 6
    fz = B["exist1End"] - 2
    ev("flutter", fa, "then the certificates stream out (2 per frame): a continuous paper flutter that thins on 'didn't even exist'",
       one(lambda r, d=T.fr(fz) - T.fr(fa): G.paper_flutter(r, np.interp(np.arange(ns(d)) / SR, [0, 0.3, d * 0.7, d],
                                                                          [0.3, 1.0, 0.8, 0.0]))), -28, p=0.0, space="room")
    ev("counter", B["typo"] + 6, "the SHARES SOLD counter races up (a dense digit clatter speeding up)",
       one(lambda r, d=T.fr(B["exist1End"]) - T.fr(B["typo"] + 6): _counter_spin(r, d)), -31, p=-0.15, space="room")
    ev("alarm", _P("over14500_1", B["billion"]), "the counter flashes red as it passes 14,500 (a small electronic warning blip)",
       one(lambda r: beeps(r, 1480.0, 2, 0.07, 0.06)), -29, p=-0.15, space="room")
    ev("ghost", B["didnt"], "'didn't even exist': the newest certificates go see-through (a soft rising glass shimmer)",
       one(lambda r: ghost_shimmer(r, 0.9, True)), -30, p=0.1, space="room", send=0.12)

    # ---------------- 2 SETTING: the Tokyo street, the exchange building
    ev("horn", _P("taxi_2", B["december"] + 40), "a far taxi horn, short, in the street", one(lambda r: G.car_horn(r, 1.6)), -34, p=0.4)
    # ---------------- 3 the lobby: the mascot rings the little debut bell
    for k, df in enumerate((0, 14)):
        ev("bell", _P(f"debut_bell_3_{k}", B["jcom"] + 4 + df), "the J-Com mascot rings the little debut bell",
           one(lambda r: G.ding(r, f0=1760.0, tau=0.5, sparkle=0.8)), -25 - 3 * k, p=0.15, space="hall", send=0.12)
    ev("crowd", B["trading"] + 6, "a light ripple of applause in the lobby as trading starts",
       one(lambda r: G.crowd_murmur(ns(1.4), r, voices=10, lo=300.0, hi=2400.0, density=1.4)),
       -33, p=0.0, space="hall")
    # ---------------- 4 the museum stack: a spotlight clunk
    ev("spot", _P("spot_4", B["only"] - 6), "the pedestal's spotlight clunks on over the one tidy stack",
       one(lambda r: G.ka_thunk(r)), -30, p=0.0, space="hall", send=0.1)

    # ---------------- 6 typing: each QTY digit lands (desk_beats qtyDigitAt), the PRICE '1', 'Easy mistake.' tea
    for k in range(6):
        f = B["n610k"] + 2 + (k * (B["n610kEnd"] - B["n610k"] - 4)) / 5
        ev("key", f, f"QTY digit {k + 1} typed", one(lambda r: key_click(r, False)), -27, p=0.1, space="room")
    ev("key", _P("price_key_6", B["yen1"] - 2), "the '1' typed into PRICE", one(lambda r: key_click(r, False)), -25, p=0.1, space="room")
    ev("cup", _P("tea_6", B["mistakeEnd"] + 6), "he sets his tea cup down, calm (after 'Easy mistake.')",
       one(lambda r: G2.cup_clink(r)), -30, p=0.2, space="room")

    # ---------------- 7 41 TIMES: the tower of stacks wobbles up past the ceiling
    d7 = T.fr(B["hasEnd"]) - T.fr(B["n41"])
    ev("rumble", B["n41"] - 4, "a low rising rumble as the 41-stack tower grows",
       one(lambda r, d=d7: _ramp(G3.tank_drone(r, d + 0.6, 52.0, 55.5), 0.3, 1.0)),
       -24, p=0.0, space="hall")
    ev("creak", B["whole"], "the tower sways (a dry paper-stack creak)", one(lambda r: G.creak(0.7, r, 90, 140)), -30, p=-0.2, space="hall")

    # ---------------- 8 MYSTERY -> CANCEL: the clock ticks louder; the boss bursts in; two dead presses
    ta, tz = T.fr(B["but"]), T.fr(B["nothing2End"] + 18)
    tm, k = ta, 0
    while tm < tz:                              # the wall clock, every second, louder through the cancel beat
        u = np.clip((tm - ta) / max(0.1, tz - ta), 0, 1)
        ev_t("tick", tm, "the trading-room wall clock (louder and louder through the cancel beat)",
             one(lambda r, k=k: G.clock_tick(r, tock=bool(k % 2))), -34 + 12 * u, p=-0.3, space="room", send=0.06)
        tm += 1.0
        k += 1
    ev("door", _P("boss_in_8", B["cancelIt"] - 7), "the boss bursts in (a door bangs open)",
       one(lambda r: G.wood_knock(r, f0=120.0, tau=0.09, hard=1.4)), -22, p=0.35, space="room", send=0.1)
    ev("thunk", _P("cancel_press_8a", B["cancel3"] + 6), "the big red CANCEL key: a heavy thunk",
       one(lambda r: key_click(r, True)), -16, p=0.0, space="room")
    ev("dots", _P("dots_8a", B["nothing1"] - 3), "a tiny grey '...' pops up and does nothing",
       one(lambda r: G.pop(r, f0=900.0, up=False, dur=0.06) * 0.5), -33, p=0.0, space="room", send=0.0)
    ev("thunk", _P("cancel_press_8b", B["again"] + 4), "he presses harder: a heavier thunk",
       one(lambda r: _mono_sum(key_click(r, True), G.wood_knock(r, f0=95.0, tau=0.07, hard=1.2) * 0.6)), -14, p=0.0, space="room")
    ev("dots", _P("dots_8b", B["nothing2"] - 3), "the same tiny '...' again", one(lambda r: G.pop(r, f0=860.0, up=False, dur=0.06) * 0.5),
       -33, p=0.0, space="room", send=0.0)

    # ---------------- 9 CRASH: the price line plunges and bounces off the red FLOOR bar
    ev("plunge", B["crashes"] - 2, "the price line plunges down the ticker wall", one(lambda r: G.bwomp(r, 260.0, 60.0, 0.9)), -21, p=0.0,
       space="hall")
    ev("floor", B["floor"] + 2, "it bounces off the red FLOOR bar", one(lambda r: _mono_sum(G.crash_thud(r) * 0.8, G.boing(r, 110.0, 0.45, 0.3) * 0.6)),
       -20, p=0.0, space="hall")

    # ---------------- 10 BUYERS: clicks all over Japan layering into a clatter; the 27-year-old's counter, the register ding
    fa, fz = B["andAll"], B["cheap"] + 10
    rr = rng(4242)
    f, k = fa, 0
    while f < fz:
        u = (f - fa) / (fz - fa)
        ev("click", f, "a buyer clicks BUY", one(lambda r: mouse_click(r)), -31 + 3 * u, p=float(rr.uniform(-0.6, 0.6)), space="room",
           send=0.03)
        f += max(1.5, 9.0 * (1 - u) ** 1.5)
        k += 1
    d10 = T.fr(B["billion2End"]) - T.fr(B["makes"])
    ev("counter", B["makes"], "his profit counter spins up to +¥2,000,000,000", one(lambda r, d=d10: _counter_spin(r, d, 30.0)), -29,
       p=0.1, space="room")
    ev("ding", _P("ding_10", B["billion2End"] - 1), "a cash-register ding on the 2 billion", one(lambda r: G2.register_bell(r)), -22,
       p=0.1, space="room", send=0.1)

    # ---------------- 11 PIVOT: the notice board (pins, tear-off tabs, moths from empty pockets, the CANCEL button, the bug)
    for k, df in enumerate((0, 5)):
        ev("pin", B["pin"] + df, "a pin taps the note into the cork", one(lambda r: G.wood_knock(r, f0=820.0, tau=0.012, hard=0.8)),
           -27, p=-0.1, space="hall")
    for k in range(5):
        ev("tab", B["selling"] + 14 + 5 * k, "the crowd snatches a tear-off tab", one(lambda r: G.paper_rustle(r, 0.12, 1.9)),
           -29, p=float(np.sin(k * 2.1)) * 0.5, space="hall")
    ev("moths", B["really"] - 4, "the seller's empty pockets: moths flutter out", one(lambda r: G2.wing_flaps(r, n_flaps=7, rate=15.0, weight=0.25)),
       -30, p=0.2, space="hall")
    ev("boop", B["cancelBtn"] + 2, "the big CANCEL button appears on the board", one(lambda r: G.pop(r, f0=300.0, up=True, dur=0.12)), -27,
       p=0.0, space="hall")
    ev("bug", B["bug"] - 3, "a little bug crawls out of the button: a tiny buzz", one(lambda r: bug_buzz(r, 0.75)), -27, p=0.15, space="hall")

    # ---------------- 12 THE BILL: buyback trucks, 96,000 ghost certificates, cash envelopes, the receipt that never ends
    ev("beep", B["bought"] + 2, "the buyback truck reverses in (beep beep beep)", one(lambda r: beeps(r, 1040.0, 3)), -31, p=0.45,
       space="out", lpf=5000.0)
    ev("ghost", B["n96k"] + 4, "96,000 ghost certificates float up, see-through", one(lambda r: ghost_shimmer(r, 1.4, True)), -28, p=0.0,
       space="room", send=0.14)
    for k in range(3):
        ev("cash", B["cash"] + 4 * k, "they turn into cash envelopes, handed out", one(lambda r: G4.paper_thup(r)), -28, p=0.3 - 0.3 * k,
           space="room")
    d12 = T.fr(B["billion3End"] + 25) - T.fr(B["theBill"] - 4)
    ev("printer", B["theBill"] - 4, "a long receipt unrolls out of the printer (a whir that keeps going and going)",
       one(lambda r, d=d12: G.reel_whirr(r, d, 30.0, 34.0)), -27, p=-0.2, space="room")

    # ---------------- 13 THE COURT: the calendar flips 2005 -> 2013, the receipt slice is torn off
    for k in range(8):
        ev("flip", B["years"] + 3 * k, "the calendar flips a year (2005 -> 2013)", one(lambda r: G.flap(r, k == 7)), -29 + (2 if k == 7 else 0),
           p=-0.25, space="hall")
    ev("tear", B["part"] - 2, "a slice of the receipt is torn off and handed to the exchange's lawyer",
       one(lambda r: G.paper_rustle(r, 0.35, 2.0)), -25, p=0.15, space="hall")

    # ---------------- 14 PAYOFF: the typo took one second (a single key click on 'second'), back to the hover
    ev("key", _P("key_14", B["second"] + 2), "'The typo took one second.': one quiet key click", one(lambda r: key_click(r, False)), -28,
       p=0.05, space="room")
    return C


def life_cues():
    return []


BED_LEVEL = {"office": -26.0, "office_eve": -29.0, "street": -23.0, "lobby": -25.0, "museum": -33.0, "homes": -29.0, "hall": -28.0,
             "court": -32.0}
BED_DESC = {
    "office": "the Mizuho trading room (one loop-folded signal across the whole short): room air, far keyboards, a far phone, murmur",
    "office_eve": "the trading room in the evening: quieter air, a few keys, the city through the window",
    "street": "a Tokyo street in December: traffic, a passing car, a far crossing chirp",
    "lobby": "the exchange lobby: big room air, a crowd murmur, the glass ticker wall's soft ticking",
    "museum": "the museum hush around the 14,500 pedestal",
    "homes": "the buyers' homes: PC fans, a far city",
    "hall": "the warm community hall: room air, sparrows outside",
    "court": "the courtroom: still air, a rare paper rustle",
}

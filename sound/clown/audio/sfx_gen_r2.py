# FIX ROUND 2 (audit A2): more small life, every one a pure function of its rng (own numpy synthesis, no samples):
# the inspector's graphite check mark, a leather desk chair creak, a sun-warmed steel roof 'tink', a harbour bell
# buoy, the empty tank's hollow drone, a ticker-machine bell, a phone handset slammed onto its cradle, a soft glass
# 'clunk' on a kitchen table, a sparrow's chirp, a tube radio's faint warm hiss + crackle, a rubber 'squeak' of the
# blob squeezing through a pipe mouth, a small steam puff, a pencil tap on a desk, a far tram bell, an oily 'glop',
# sweat flecks flicked off a brow. Mono unless noted.
import numpy as np
from dsp import SR, TAU, ns, tt, lp, hp, bp, colored, smooth_noise, fades, phase, modal, reson
from sfx_gen import _place_mono, creak, WOOD, bubbles


def graphite_tick(r, dur=0.27):
    """a pencil check mark on a clipboard: the lead touches (a tiny tap on the board), a short graphite down-stroke, the
    turn, and a faster up-flick that lifts off (graphite = a dry, slightly toothy scratch, mostly 2-7 kHz, plus the
    board's dull 300 Hz body). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    # the touch: a soft tap of the pencil on the board
    tap = modal(0.08, [(r.uniform(300, 340), 1.0, 0.018), (r.uniform(900, 1000), 0.4, 0.008), (r.uniform(2400, 2800), 0.25, 0.003)], r)
    tap += hp(r.standard_normal(ns(0.08)), 2500) * np.exp(-tt(0.08) / 0.0007) * 0.5
    _place_mono(y, tap * 0.9, 0.0)
    # the two strokes: a grainy friction band, rough (tooth of the paper) and brightest on the faster flick
    a1, b1, a2, b2 = 0.01, 0.075, 0.095, dur - 0.03
    e1 = np.clip((t - a1) / 0.01, 0, 1) * np.clip((b1 - t) / 0.015, 0, 1)
    e2 = np.clip((t - a2) / 0.006, 0, 1) * np.clip((b2 - t) / (b2 - a2), 0, 1) ** 0.6
    tooth = 0.55 + 0.45 * np.abs(np.sin(TAU * np.cumsum(np.where(t < a2, 140.0, 260.0)) / SR + 1.7 * smooth_noise(n, r, 30.0)))
    g = colored(n, r, 0.15)
    s1 = bp(g, 1800, 6500, 2) * e1 * tooth * 0.8
    s2 = bp(g, 2600, 8000, 2) * e2 * tooth * 1.0
    body = reson(s1 + s2, 310, 4) * 0.35
    y += s1 + s2 + body
    # the turn at the bottom of the check: a small click of the lead
    _place_mono(y, hp(r.standard_normal(ns(0.01)), 3000) * np.exp(-tt(0.01) / 0.0012) * 0.5, a2 - 0.004)
    return fades(lp(y, 9000, 1), 0.0005, 0.02)


def chair_creak(r, dur=0.32):
    """a leather desk chair taking a man's lean: a short wooden-spring creak and the leather's soft squeak. Mono."""
    y = creak(dur, r, 120, 190, WOOD, [(0, 0), (0.3, 1), (0.8, 0.6), (1.0, 0)], 0.1, 0.04, 0.8)
    n = len(y)
    t = np.arange(n) / SR
    sq = bp(colored(n, r, 0.4), 700, 2400, 2) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * 0.35
    return fades(lp(y + sq, 4500, 2), 0.004, 0.05)


def roof_tink(r, f0=None):
    """the sun-warmed steel roof expanding: one small dry metallic 'tink' (a plate edge slipping under a rivet). Mono."""
    f0 = f0 or r.uniform(1900, 2600)
    d = 0.35
    t = tt(d)
    y = modal(d, [(f0, 1.0, 0.05), (f0 * 1.63, 0.5, 0.03), (f0 * 2.41, 0.3, 0.018), (f0 * 0.47, 0.25, 0.08)], r)
    y *= 1 - np.exp(-t / 0.0004)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0006) * 0.4
    return fades(y, 0.0002, 0.05)


def bell_buoy(r, strokes=2):
    """a harbour bell buoy far out on the swell: two soft irregular clangs (the clapper swung by a wave), deep bronze
    partials, dulled by distance. Mono."""
    f0 = r.uniform(420, 470)
    y = np.zeros(ns(3.0))
    tm = 0.0
    for j in range(strokes):
        b = modal(2.2, [(f0 * 0.5, 0.4, 1.2), (f0, 1.0, 0.9), (f0 * 1.2, 0.5, 0.7), (f0 * 1.5, 0.3, 0.5), (f0 * 2.0, 0.25, 0.35),
                        (f0 * 2.63, 0.12, 0.2)], r)
        b *= 1 - np.exp(-tt(2.2) / 0.002)
        _place_mono(y, b * (1.0 - 0.3 * j) * r.uniform(0.8, 1.0), tm)
        tm += r.uniform(0.55, 0.8)
    y = lp(y, 1800, 2)
    return fades(y, 0.003, 0.4)


def tank_drone(r, dur, f1=62.0, f2=66.5):
    """the inside of a huge, mostly empty steel tank: a low hollow drone - two close low tones beating slowly (a 'breathing'
    4-5 Hz), their 2nd-4th harmonics (so it reads on a phone), and a filtered air rush through the hatch with the
    tank's own resonances. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.55), (3, 0.35), (4, 0.2)):
        y += a * (np.sin(TAU * f1 * k * t + r.uniform(0, TAU)) + 0.8 * np.sin(TAU * f2 * k * t + r.uniform(0, TAU)))
    air = colored(n, r, 1.2)
    air = sum(bp(air, fc, fc * 1.12, 2) * g for fc, g in ((118, 1.0), (176, 0.7), (241, 0.5), (305, 0.35)))
    y = y / (np.std(y) + 1e-12) + 0.6 * air / (np.std(air) + 1e-12)
    y *= 0.85 + 0.15 * smooth_noise(n, r, 0.4)
    return fades(lp(y, 900, 2), 0.25, 0.04)


def ticker_bell(r):
    """the stock ticker's little bell (a quote line coming in): a small bright bell strike with a short ring. Mono."""
    f0 = r.uniform(3300, 3500)
    d = 0.5
    t = tt(d)
    y = modal(d, [(f0, 1.0, 0.12), (f0 * 2.02, 0.4, 0.06), (f0 * 2.9, 0.2, 0.03)], r) * (1 - np.exp(-t / 0.0003))
    y += hp(r.standard_normal(len(t)), 4000) * np.exp(-t / 0.0006) * 0.3
    return fades(y, 0.0002, 0.06)


def handset_slam(r):
    """a 1960s phone handset slammed down onto its cradle: a bakelite clack, the hook switch, and the bells inside
    tinkling once from the knock. Mono."""
    d = 0.5
    t = tt(d)
    y = modal(d, [(r.uniform(520, 600), 1.0, 0.02), (r.uniform(1300, 1500), 0.6, 0.012), (r.uniform(2900, 3300), 0.35, 0.006)], r)
    y += bp(r.standard_normal(len(t)), 800, 5000, 2) * np.exp(-t / 0.003) * 0.9
    sw = modal(0.06, [(r.uniform(3800, 4200), 1.0, 0.004)], r) * 0.5
    _place_mono(y, sw, 0.018)
    bell = modal(0.4, [(1310, 1.0, 0.12), (1310 * 2.7, 0.4, 0.05)], r) * 0.18
    _place_mono(y, bell * (1 - np.exp(-tt(0.4) / 0.001)), 0.01)
    return fades(y, 0.0002, 0.08)


def glass_clunk(r):
    """a glass dressing bottle set down on a wooden kitchen table: a dull glass knock, a short bright ring, the liquid's
    tiny settle. Mono."""
    d = 0.45
    t = tt(d)
    y = modal(d, [(r.uniform(180, 220), 1.0, 0.03), (r.uniform(480, 540), 0.6, 0.02)], r)
    y += modal(d, [(r.uniform(2600, 2900), 0.35, 0.05), (r.uniform(4300, 4700), 0.2, 0.03)], r)
    y += lp(r.standard_normal(len(t)), 1500, 2) * np.exp(-t / 0.004) * 0.6
    bb = bubbles(0.3, r, 18, 500, 1400, (0.006, 0.02), np.exp(-np.linspace(0, 3, ns(0.3))))
    _place_mono(y, bb * 0.15, 0.02)
    return fades(y, 0.0003, 0.08)


def sparrow_chirp(r, notes=None):
    """a house sparrow's 'chirrup': 2-3 quick bright down-slurred notes. Mono."""
    k = int(notes or r.integers(2, 4))
    y = np.zeros(ns(0.35))
    tm = 0.0
    for j in range(k):
        L = r.uniform(0.04, 0.065)
        tl = tt(L)
        f = r.uniform(3600, 4600) * (1.15 - 0.35 * tl / L) * (1 + 0.04 * np.sin(TAU * 60 * tl))
        x = np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 1.5 + 0.25 * np.sin(phase(2 * f)) * np.sin(np.pi * tl / L) ** 3
        _place_mono(y, x * (1.0 - 0.15 * j), tm)
        tm += L + r.uniform(0.02, 0.04)
    return fades(y[: ns(tm + 0.02)], 0.001, 0.01)


def radio_hiss(n, r):
    """a 1960s tube radio on the counter, tuned between songs and turned right down: a warm band-limited hiss, the mains
    hum's faint 120 Hz, and the odd soft crackle. Mono (n,)."""
    t = np.arange(n) / SR
    y = bp(colored(n, r, 0.5), 400, 3200, 2) * (0.8 + 0.2 * smooth_noise(n, r, 0.3))
    y = y / (np.std(y) + 1e-12) + 0.25 * np.sin(TAU * 120 * t)
    tm = r.uniform(0.2, 0.9)
    while tm < n / SR - 0.05:
        L = ns(r.uniform(0.002, 0.006))
        i = ns(tm)
        y[i: i + L] += bp(r.standard_normal(L), 800, 5000, 1)[: max(0, n - i)] * r.uniform(1.5, 3.0)
        tm += r.exponential(0.6) + 0.15
    return y


def rubber_squeak(r, up=True):
    """the soft oil blob squeezing out of a pipe mouth: a short rubbery squeak (a pitched glide with a wet edge). Mono."""
    d = 0.16
    t = tt(d)
    f0 = r.uniform(700, 820)
    f = f0 * (1 + (0.6 if up else -0.3) * np.sin(0.5 * np.pi * np.clip(t / d, 0, 1)))
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    y = (np.sin(phase(f)) + 0.35 * np.sin(phase(2 * f)) + 0.15 * np.sin(phase(3 * f))) * e
    y *= 1 + 0.25 * np.sin(TAU * 38 * t)
    y += bp(colored(len(t), r, 0.3), 1500, 4000, 1) * e * 0.15
    return fades(y, 0.002, 0.02)


def steam_puff(r, dur=0.45):
    """a small steam puff from a pipe valve: a short soft hiss swelling and dying. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / 0.03, 0, 1) * np.exp(-np.maximum(0, t - 0.03) / 0.14)
    y = bp(colored(n, r, 0.1), 2500, 9000, 2) * e
    return fades(y, 0.002, 0.05)


def pencil_tap(r):
    """a pencil's end tapped once on a wooden desk: a small dry wooden tick. Mono."""
    d = 0.12
    t = tt(d)
    y = modal(d, [(r.uniform(900, 1100), 1.0, 0.012), (r.uniform(2300, 2700), 0.5, 0.006), (r.uniform(420, 480), 0.5, 0.02)], r)
    y += hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.0006) * 0.5
    return fades(y, 0.0002, 0.03)


def tram_bell(r):
    """a far streetcar / bus bell two streets away: two quick 'clang-clang' strikes, dulled by distance. Mono."""
    f0 = r.uniform(1150, 1250)
    y = np.zeros(ns(1.0))
    for j in range(2):
        b = modal(0.8, [(f0, 1.0, 0.25), (f0 * 2.4, 0.4, 0.1), (f0 * 3.1, 0.2, 0.06)], r) * (1 - np.exp(-tt(0.8) / 0.001))
        _place_mono(y, b * (1.0 - 0.2 * j), j * 0.14)
    return fades(lp(y, 3200, 2), 0.001, 0.15)


def oil_glop(r):
    """the gold closing over the water: one soft round oily 'glop' (a low liquid pop with a short slurp). Mono."""
    d = 0.35
    t = tt(d)
    y = np.sin(phase(170 * (1 + 0.9 * (1 - np.exp(-t / 0.05))))) * np.exp(-t / 0.07) * (1 - np.exp(-t / 0.006))
    y += bp(colored(len(t), r, 0.8), 300, 1500, 1) * np.exp(-t / 0.05) * 0.25
    return fades(y, 0.002, 0.06)


def sweat_flick(r, n=3):
    """sweat flecks flicked off a brow: 2-3 tiny wet ticks spraying away. Mono."""
    y = np.zeros(ns(0.2))
    tm = 0.0
    for j in range(n):
        d = 0.03
        tl = tt(d)
        x = np.sin(phase(r.uniform(1800, 2600) * (1 + 1.2 * tl / d))) * np.exp(-tl / 0.006)
        _place_mono(y, x * (1.0 - 0.25 * j), tm)
        tm += r.uniform(0.025, 0.045)
    return fades(y, 0.0002, 0.02)

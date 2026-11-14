# FIX ROUND 1 (audit A1): more world, more life. New procedural sounds for "The Oil Tanks That Were Mostly Water" on
# top of sfx_gen.py (own numpy synthesis, no samples; every one a pure function of its rng): wing flaps, a cloth flag
# fluttering on the shared gust curve, a far ship's bell, a single wave slap, wet footsteps, rain on umbrellas, a gutter
# spilling, the trading floor's shouting walla and its dismayed groan, oil-drum tonks, a steel hinge creak, bubble
# blips, a pipe drip, a pipe knock, a car passing, a cup on a saucer, a laugh through the window, a bicycle bell, a
# typewriter's carriage bell, a register bell, a lightning crack, a chain-link rattle, a kettle simmer.
# Mono unless noted.
import numpy as np
from dsp import SR, TAU, ns, tt, lp, hp, bp, resbank, colored, smooth_noise, fades, phase, modal, pan
from sfx_gen import (_place_mono, creak, rattle, bubbles, drop_plip, thunder, vox, vowel_track, babble, STEEL)


def wing_flaps(r, n_flaps=4, rate=9.0, weight=1.0):
    """a gull / pigeon taking off: soft feathered 'whup' strokes (a low air thump + a fluttery top), slowing as it
    climbs away"""
    y = np.zeros(ns(n_flaps / rate * 1.6 + 0.3))
    tm = 0.0
    for j in range(n_flaps):
        L = 0.07
        tl = tt(L)
        e = np.sin(np.pi * np.clip(tl / L, 0, 1)) ** 1.4
        x = bp(colored(len(tl), r, 0.7), 250, 2200, 1) * e * 0.8 + bp(colored(len(tl), r, 0.2), 1800, 6000, 1) * e * 0.25
        x += np.sin(TAU * r.uniform(90, 130) * tl) * e * 0.35 * weight
        _place_mono(y, x * (1.0 - 0.13 * j), tm)
        tm += (1.0 / rate) * (1 + 0.12 * j) * r.uniform(0.9, 1.1)
    return fades(y[: ns(tm + 0.1)], 0.003, 0.05)


def flag_flutter(n, r, g):
    """a cloth flag / windsock flapping in the gusts g (per-sample, the SHARED harbour gust curve the picture sways its
    flags with): a continuous fabric flutter whose rate and level follow the gust, the odd snap on strong gusts.
    Mono (n,)."""
    g = np.clip(np.asarray(g, float), 0.05, 1.5)
    rate = 6.0 + 10.0 * g
    p = np.cumsum(rate) / SR
    flap_ = 0.5 + 0.5 * np.sin(TAU * p) ** 2
    y = bp(colored(n, r, 0.4), 500, 4200, 1) * flap_ * g ** 2.0 * 0.5
    hits = np.flatnonzero(np.diff(np.floor(p)) > 0)
    for i in hits:
        gi = g[min(i, n - 1)]
        if gi < 0.72 or r.random() > 0.35:
            continue
        L = ns(r.uniform(0.012, 0.022))
        c = bp(r.standard_normal(L), 800, 5000, 1) * np.exp(-np.arange(L) / (L * 0.3)) * (gi - 0.6)
        j = min(n - 1, int(i))
        y[j: j + len(c)] += c[: n - j] * 1.2
    return y


def ship_bell(r, strokes=2):
    """a far ship's bell across the harbour: bronze strokes ('ding-ding'), inharmonic partials, dulled by distance, the
    water's slap echo"""
    f0 = r.uniform(640, 720)
    y = np.zeros(ns(2.2))
    for j in range(strokes):
        b = modal(1.6, [(f0 * 0.5, 0.35, 0.9), (f0, 1.0, 0.7), (f0 * 1.19, 0.45, 0.5), (f0 * 1.5, 0.35, 0.4), (f0 * 2.0, 0.3, 0.3),
                        (f0 * 2.51, 0.18, 0.2), (f0 * 3.01, 0.1, 0.12)], r)
        b *= 1 - np.exp(-tt(1.6) / 0.001)
        _place_mono(y, b * (1.0 - 0.15 * j), j * 0.32)
    y = lp(y, 2600, 2)
    d = ns(0.38)
    y[d:] += 0.3 * lp(y[:-d], 1200, 1)
    return fades(y, 0.002, 0.3)


def water_slap(r, big=1.0):
    """one soft wave lapping against the pilings: a low water slap, a short gurgle and a trickle running off"""
    d = 0.9
    n = ns(d)
    t = np.arange(n) / SR
    env = np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.22)
    y = bp(colored(n, r, 0.8), 180, 1600, 1) * env * 1.2 * big
    y += bp(r.standard_normal(n), 400, 2500, 1) * np.exp(-((t - 0.05) / 0.018) ** 2) * 0.6 * big
    y += bubbles(d, r, 40, 250, 1200, (0.008, 0.03), np.clip(t / 0.08, 0, 1) * np.exp(-t / 0.35))[:n] * 0.6
    return fades(y, 0.004, 0.15)


def wet_step(r, weight=1.0):
    """a shoe on wet pavement / in a shallow puddle: a soft heel tap and a short watery splash"""
    d = 0.3
    n = ns(d)
    t = np.arange(n) / SR
    y = np.sin(phase(r.uniform(80, 110) * (1 + 0.3 * np.exp(-t / 0.006)))) * np.exp(-t / 0.02) * 0.6 * weight
    y += bp(r.standard_normal(n), 900, 6000, 1) * np.exp(-t / 0.018) * (0.7 + 0.3 * r.random())
    b = bubbles(d, r, 70, 500, 2500, (0.003, 0.01), np.exp(-t / 0.06), rise=(10, 25))[:n]
    y += b * 0.5
    return fades(y, 0.001, 0.05)


def umbrella_patter(n, r, density=1.0):
    """rain drumming on taut umbrella fabric: dense soft 'tup' hits with the canopy's membrane ring (~300-700 Hz).
    Mono (n,)."""
    x = np.zeros(n)
    k = r.random(n) < 260 * density / SR
    x[k] = r.uniform(0.2, 1.0, k.sum()) ** 1.5
    y = resbank(x, [(r.uniform(320, 380), 9, 1.0), (r.uniform(610, 690), 11, 0.6), (r.uniform(1150, 1300), 12, 0.3)])
    y = y / (np.std(y) + 1e-12)
    tick = bp(np.convolve(x, np.exp(-np.arange(40) / 8.0))[:n], 1200, 5000, 1)
    y += tick / (np.std(tick) + 1e-12) * 0.5
    return y


def gutter_spill(n, r):
    """an overflowing gutter pouring a thin sheet of water into a puddle: a steady splashing roar with bubbles. Mono."""
    y = bp(colored(n, r, 0.6), 300, 5000, 1) * (0.8 + 0.2 * smooth_noise(n, r, 5.0))
    y = y / (np.std(y) + 1e-12)
    b = bubbles(n / SR, r, 90, 300, 2000, (0.004, 0.02))[:n]
    return y + b / (np.std(b) + 1e-12) * 0.6


def crowd_groan(r, dur=0.9, voices=8):
    """a trading-floor crowd's dismayed 'ohhhh': several male voices, a falling pitch, 'o' -> 'u', staggered entries.
    Stereo (2, n)."""
    n = ns(dur + 0.3)
    out = np.zeros((2, n))
    for v in range(voices):
        dl = r.uniform(0.0, 0.18)
        L = dur * r.uniform(0.75, 1.0)
        m = ns(L)
        t = np.arange(m) / SR
        f0 = r.uniform(125, 190) * (1.08 - 0.28 * np.clip(t / L, 0, 1) ** 0.9)
        forms = vowel_track(m, [(0, "o"), (L * 0.6, "U"), (L, "u")])
        amp = np.clip(t / 0.08, 0, 1) * np.clip((L - t) / 0.25, 0, 1) ** 1.3
        y = vox(f0, forms, amp, r, scale=r.uniform(0.95, 1.05), tilt=1.3, breath=0.35, fmax=4000.0, jitter=0.02)
        buf = np.zeros(n)
        _place_mono(buf, y * r.uniform(0.6, 1.0), dl)
        out += pan(buf, -0.8 + 1.6 * (v + 0.5) / voices)
    return lp(out, 3200, 2)


def trader_walla(n, r, voices=12):
    """a busy 1963 trading floor: many men shouting orders at once (unintelligible babble, high and pushed), overlapping
    and panned across the room, with crowd swells. Stereo (2, n)."""
    out = np.zeros((2, n))
    for v in range(voices):
        x = babble(n / SR, r, r.uniform(165, 290), r.uniform(0.95, 1.12), rate=r.uniform(5.5, 7.5), active=r.uniform(0.7, 0.92),
                   fmax=4200, breath=0.35)
        x = x[:n] * (0.55 + 0.45 * np.clip(0.5 + smooth_noise(n, r, 0.5), 0, 1))
        out += pan(x, float(np.clip(-0.9 + 1.8 * (v + r.uniform(0, 1)) / voices, -0.9, 0.9)))
    swell = 0.75 + 0.25 * smooth_noise(n, r, 0.35)
    return out * swell[None, :]


def drum_tonk(r, f0=None):
    """an empty steel oil drum set down: a hollow cartoon 'tonk' (a few inharmonic shell modes, a short ring)"""
    f0 = f0 or r.uniform(260, 320)
    d = 0.35
    t = tt(d)
    y = modal(d, [(f0, 1.0, 0.09), (f0 * 1.71, 0.6, 0.06), (f0 * 2.63, 0.45, 0.04), (f0 * 4.1, 0.3, 0.025), (f0 * 6.3, 0.18, 0.015)], r)
    y += bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.002) * 0.5
    return fades(y, 0.0002, 0.06)


def hinge_creak(r, dur=0.55):
    """a heavy steel hatch hinge / roof plate creaking under a leaning man: a slow stick-slip groan in steel modes"""
    y = creak(dur, r, 60, 95, STEEL, [(0, 0), (0.25, 1), (0.7, 0.8), (1.0, 0)], 0.15, 0.03, 0.55)
    return fades(lp(y, 5000, 2), 0.01, 0.06)


def bubble_blip(r, f0=None):
    """a tiny underwater bubble 'blip' (rising Minnaert ping)"""
    f0 = f0 or r.uniform(600, 900)
    d = 0.09
    t = tt(d)
    y = np.sin(phase(f0 * (1 + 2.2 * t / d))) * np.exp(-t / 0.018) * (1 - np.exp(-t / 0.001))
    return fades(y, 0.0002, 0.02)


def pipe_plink(r):
    """a slow drip off a pipe flange into a tin drip tray: a small bright plink with a short metal ring"""
    d = 0.4
    t = tt(d)
    out = np.zeros(ns(d))
    _place_mono(out, drop_plip(r, r.uniform(900, 1100)), 0.0)
    out += modal(d, [(r.uniform(2400, 2700), 0.35, 0.08), (r.uniform(4100, 4500), 0.2, 0.04)], r)[: len(out)] * (1 - np.exp(-t / 0.001))[: len(out)]
    return fades(out, 0.0003, 0.05)


def pump_knock(r):
    """a distant pipe knock (water hammer down the line): a dull clunk with a short pipe ring"""
    f0 = r.uniform(160, 210)
    d = 0.6
    t = tt(d)
    y = modal(d, [(f0, 1.0, 0.1), (f0 * 2.7, 0.5, 0.05), (f0 * 4.9, 0.25, 0.03)], r)
    y += lp(r.standard_normal(len(t)), 600, 2) * np.exp(-t / 0.01) * 0.6
    return fades(lp(y, 1800, 2), 0.001, 0.1)


def car_pass(r, dur=2.2, peak=0.5):
    """a 1960s sedan passing close: a V8 burble and tyre hiss swelling to its peak (fraction of dur) and away, a
    slight Doppler drop. Mono (pan it with the picture)."""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    prox = 1.0 / (1.0 + ((u - peak) / 0.16) ** 2)
    dop = 1.0 + 0.05 * np.tanh(-(u - peak) / 0.06)
    f0 = r.uniform(42, 52) * dop
    ph = phase(f0)
    eng = sum((1 / k) * np.sin(k * ph + r.uniform(0, TAU)) for k in range(1, 9))
    eng = lp(eng * (1 + 0.25 * np.sin(phase(f0 * 0.5))), 900, 2)
    tyre = bp(colored(n, r, 0.6), 500, 5000, 1) * prox ** 1.2
    tyre = tyre / (np.std(tyre) + 1e-12) * 0.35
    eng = eng / (np.std(eng) + 1e-12)
    y = eng * prox * 0.8 + tyre
    return fades(y, 0.05, 0.2)


def cup_clink(r):
    """a cup set down on its saucer (two quick porcelain touches)"""
    y = np.zeros(ns(0.35))
    f0 = r.uniform(2600, 3400)
    for tm, a in ((0.0, 1.0), (0.045, 0.5)):
        c = modal(0.25, [(f0 * r.uniform(0.98, 1.02), 1.0, 0.05), (f0 * 2.41, 0.4, 0.02), (f0 * 0.62, 0.3, 0.03)], r)
        c *= 1 - np.exp(-tt(0.25) / 0.0004)
        _place_mono(y, c * a, tm)
    return fades(y, 0.0002, 0.05)


def laugh(r, voices=3, dur=1.0):
    """a small table of people laughing across the street (through the window): 'ha-ha-ha' pulses at ~5 Hz, mixed
    voices, dulled"""
    n = ns(dur)
    y = np.zeros(n)
    for v in range(voices):
        dl = r.uniform(0, 0.15)
        m = ns(dur * r.uniform(0.6, 0.9))
        t = np.arange(m) / SR
        f0 = r.uniform(180, 300) * (1.1 - 0.2 * t / (m / SR))
        rate = r.uniform(4.5, 6.0)
        pulse = np.clip(np.sin(TAU * rate * t), 0, 1) ** 1.5 * np.clip((m / SR - t) / 0.3, 0, 1) * np.clip(t / 0.03, 0, 1)
        forms = vowel_track(m, [(0, "a"), (m / SR, "A")])
        x = vox(f0, forms, pulse, r, scale=1.05 + 0.1 * r.random(), tilt=1.2, breath=0.6, fmax=4000.0)
        _place_mono(y, x * r.uniform(0.6, 1.0), dl)
    return fades(lp(y, 3000, 2), 0.005, 0.1)


def bike_bell(r, rings=2):
    """a bicycle bell's 'ring-ring' down the street: a small steel dome struck fast, two quick bursts"""
    f0 = r.uniform(2900, 3300)
    y = np.zeros(ns(1.0))
    for j in range(rings):
        for k in range(3):
            b = modal(0.6, [(f0, 1.0, 0.25), (f0 * 1.47, 0.6, 0.15), (f0 * 2.09, 0.3, 0.08)], r)
            _place_mono(y, b * (0.6 + 0.4 * (k == 0)), j * 0.22 + k * 0.035)
    return fades(lp(y, 6000, 2), 0.0003, 0.2)


def carriage_bell(r):
    """a typewriter's end-of-line bell far off in the next office, then the carriage zip"""
    y = np.zeros(ns(0.9))
    _place_mono(y, modal(0.8, [(2780, 1.0, 0.3), (2780 * 2.4, 0.3, 0.08)], r), 0.0)
    ret = bp(colored(ns(0.35), r, 0.6), 500, 4000, 1) * np.linspace(1, 0.3, ns(0.35)) * 0.45
    _place_mono(y, ret, 0.22)
    _place_mono(y, modal(0.12, [(330, 1.0, 0.03), (1200, 0.4, 0.01)], r) * 0.8, 0.58)
    return fades(y, 0.0003, 0.05)


def register_bell(r, f0=2093.0, tau=0.35):
    """a cash register's bright little bell (the 'ka-ching' arpeggio): a small steel bell with strong 2.0 / 2.76 / 4.1
    partials (its 4-8 kHz ring cuts past the voice)"""
    d = min(1.6, tau * 4)
    t = tt(d)
    y = modal(d, [(f0, 1.0, tau), (f0 * 2.0, 0.55, tau * 0.6), (f0 * 2.76, 0.45, tau * 0.4), (f0 * 4.1, 0.3, tau * 0.2)], r)
    y *= 1 - np.exp(-t / 0.0004)
    y += hp(r.standard_normal(len(t)), 4000) * np.exp(-t / 0.0008) * 0.3
    return fades(y, 0.0002, 0.08)


def lightning_crack(r, dur=2.6, dist=1.0):
    """a lightning strike (synced to the picture's flash): a ripping crackle (sharp snaps over ~0.15 s), the
    split-second boom, then a rolling rumble; dist > 1 = farther (duller, less crackle). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    tm = 0.0
    while tm < 0.16:
        L = max(8, ns(r.uniform(0.002, 0.008)))
        c = bp(r.standard_normal(L), 700, 7000, 1) * np.exp(-np.arange(L) / (L * 0.3))
        _place_mono(y, c * r.uniform(0.5, 1.0) * (1 - tm / 0.2) * 1.8 / dist, tm)
        tm += r.exponential(0.008)
    boom = lp(colored(n, r, 1.6), 220, 2)
    boom = boom / (np.std(boom) + 1e-12) * np.exp(-t / 0.35) * np.clip(t / 0.01, 0, 1) * 0.5
    roll = thunder(r, dur, 0.0, 1.0 + 0.4 * dist)[:n]
    roll = roll / (np.std(roll) + 1e-12) * 0.35
    y = y + boom + roll
    return fades(lp(y, 6500 / dist, 2), 0.0005, 0.4)


def fence_rattle(r, dur=0.8):
    """a chain-link gate shivering in a gust: a soft cloud of wire ticks on a light metal buzz"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    y = rattle(dur, r, 55, env, lo=1800, hi=5200, tau=(0.004, 0.012)) * 0.6
    y += bp(colored(n, r, 0.3), 2000, 6000, 1) * env * 0.08
    return fades(y, 0.005, 0.05)


def kettle_simmer(n, r):
    """a kettle just off the boil on the stove: a soft rushing hiss and tiny bubble ticks. Mono (n,)."""
    y = bp(colored(n, r, 0.3), 2500, 8000, 1) * (0.6 + 0.4 * smooth_noise(n, r, 0.4))
    y = y / (np.std(y) + 1e-12)
    b = bubbles(n / SR, r, 25, 900, 3000, (0.002, 0.006))[:n]
    return y + b / (np.std(b) + 1e-12) * 0.6


def gravel_yard(n, r):
    """the ground at the foot of the tank: wind low over gravel (a fine grit hiss), a distant idling forklift, a far
    tug's engine across the water. Stereo (2, n)."""
    out = np.zeros((2, n))
    for ch in range(2):
        grit = hp(colored(n, r, 0.1), 3500, 2) * (0.5 + 0.5 * np.clip(smooth_noise(n, r, 0.6), 0, 1)) * 0.25
        out[ch] = grit
    t = np.arange(n) / SR
    f0 = r.uniform(28, 34) * (1 + 0.02 * smooth_noise(n, r, 0.3))
    ph = phase(f0)
    idle = sum((1 / k) * np.sin(k * ph + r.uniform(0, TAU)) for k in range(1, 7))
    idle = lp(idle * (1 + 0.3 * np.sin(phase(f0 * 0.5))), 600, 2)
    idle = idle / (np.std(idle) + 1e-12) * 0.35
    out += pan(idle, -0.45)
    return out

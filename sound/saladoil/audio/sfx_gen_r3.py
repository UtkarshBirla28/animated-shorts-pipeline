# FIX ROUND 3 (audit A3): the new small life sounds, every one a pure function of its rng (own numpy synthesis, no
# samples): a chalk squeal on the diving board line, a single hollow drip inside the empty tank (its own 1.2 s steel
# reverb), a felt-marker squeak on the easel chart, a wet squelch of the oil blob, a gutter splash, a flag halyard's
# clink on its steel pole, a cafe espresso wand's hiss, a pencil tapped on a clipboard, a soft paper 'thup', the
# spinning newspaper's whoosh WITHOUT its slap and a separate low-mid paper slap, umbrella fabric flutter on the gusts.
# Mono unless noted.
import numpy as np
from dsp import SR, TAU, ns, tt, lp, hp, bp, peq, colored, smooth_noise, fades, phase, modal, reson, make_ir
from sfx_gen import _place_mono, bubbles, paper_flutter


def chalk_squeal(r, dur=0.12):
    """chalk dragged fast down a slate: a stick-slip squeal (a wavering 3-4 kHz tone with its octave), the chalk's grit
    and a dull board knock at the touch. Mostly 2.5-5 kHz. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = r.uniform(3200, 3600) * (1 - 0.08 * t / dur) * (1 + 0.025 * np.sin(TAU * r.uniform(32, 40) * t) + 0.01 * smooth_noise(n, r, 60.0))
    ph = np.cumsum(f) / SR * TAU
    sq = np.sin(ph) + 0.35 * np.sin(2 * ph + 0.7) + 0.15 * np.sin(0.5 * ph)
    slip = 0.6 + 0.4 * np.abs(np.sin(TAU * np.cumsum(np.full(n, r.uniform(180, 230))) / SR))
    env = np.clip(t / 0.012, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) ** 0.8
    y = bp(sq * slip, 2500, 5200, 2) * env * 0.8
    y += bp(colored(n, r, 0.1), 2200, 7000, 1) * env * (0.5 + 0.5 * smooth_noise(n, r, 80.0)) * 0.35
    _place_mono(y, modal(0.06, [(r.uniform(240, 280), 1.0, 0.012), (r.uniform(700, 780), 0.4, 0.006)], r) * 0.4, 0.0)
    return fades(y, 0.001, 0.015)


def drip_echo(r, ring=1.2):
    """one droplet falling from the hatch rim into the near-empty tank far below: a small clear plink, and the huge
    steel cavity answering it (a 1.2 s metallic reverb with slap-back early reflections, the tail darker). Mono."""
    d = 0.12
    t = tt(d)
    f0 = r.uniform(1150, 1350)
    pl = np.sin(phase(f0 * (1 + 0.5 * (1 - np.exp(-t / 0.02))))) * np.exp(-t / 0.025) * (1 - np.exp(-t / 0.0015))
    dry = np.zeros(ns(ring + 0.2))
    _place_mono(dry, pl * 0.9, 0.0)
    ir = make_ir(ring, int(r.integers(1, 10_000)), pre=0.02, hf=0.7,
                 early=[(0.048, 0.55, -0.2), (0.097, 0.42, 0.25), (0.146, 0.3, 0.0), (0.21, 0.2, 0.1)])
    irm = ir.mean(0) if ir.ndim == 2 else ir
    wet = np.convolve(dry, irm)[: len(dry)]
    wet = bp(wet, 250, 4500, 1)
    wet = wet / (np.max(np.abs(wet)) + 1e-12) * np.max(np.abs(pl)) * 0.75
    y = dry * 0.55 + wet
    return fades(y, 0.0005, 0.25)


def marker_squeak(r, strokes=2, stroke=0.13):
    """a felt-tip marker drawn quickly across the chart paper: a squeaky stick-slip (1.5-2.6 kHz, rough) per stroke, a
    soft fibre hiss under it. Mono."""
    y = np.zeros(ns(strokes * (stroke + 0.05) + 0.05))
    tm = 0.0
    for k in range(strokes):
        L = stroke * r.uniform(0.8, 1.15)
        n = ns(L)
        t = np.arange(n) / SR
        f = r.uniform(1700, 2300) * (1 + 0.12 * (t / L - 0.5) * (1 if k % 2 == 0 else -1)) * (1 + 0.02 * smooth_noise(n, r, 45.0))
        ph = np.cumsum(f) / SR * TAU
        am = 0.55 + 0.45 * np.abs(np.sin(TAU * np.cumsum(np.full(n, r.uniform(45, 70))) / SR))
        env = np.clip(t / 0.015, 0, 1) * np.clip((L - t) / 0.03, 0, 1)
        s = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * am * env * 0.6
        s += bp(colored(n, r, 0.2), 1500, 6000, 1) * env * 0.35
        _place_mono(y, bp(s, 1200, 6500, 1), tm)
        tm += L + r.uniform(0.03, 0.06)
    return fades(y, 0.001, 0.02)


def squelch(r, dur=0.16):
    """the oil blob plopping out of a pipe mouth onto its plate: a short wet squelch (a low-mid suction burst with a
    downward glide and two tiny bubble pops). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.006, 0, 1) * np.exp(-t / 0.045)
    nz = bp(colored(n, r, 0.8), 220, 1800, 2) * env
    gl = np.sin(phase(r.uniform(420, 520) * np.exp(-t / 0.05) + 140)) * env * 0.6
    y = nz * 0.8 + gl
    for k in range(2):
        b = np.sin(phase(r.uniform(700, 1100) * (1 + 0.6 * tt(0.03) / 0.03))) * np.exp(-tt(0.03) / 0.007) * 0.25
        _place_mono(y, b, 0.03 + 0.04 * k + r.uniform(0, 0.01))
    return fades(y, 0.0005, 0.03)


def splash(r, dur=0.4):
    """water thrown off a gutter lip as the notice is slapped onto the sign: a short spray burst and a scatter of
    droplets onto the wet ground. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(colored(n, r, 0.4), 500, 7000, 1) * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.07) * 0.9
    tm = 0.04
    while tm < dur - 0.06:
        dd = ns(0.03)
        dt = np.arange(dd) / SR
        dr = np.sin(phase(r.uniform(900, 2400) * (1 + 0.4 * dt / 0.03))) * np.exp(-dt / 0.006) * r.uniform(0.15, 0.4)
        _place_mono(y, dr, tm)
        tm += r.exponential(0.035)
    return fades(y, 0.0005, 0.05)


def halyard_clink(r, hits=2):
    """the gate flagpole's halyard and its snap hook slapping the steel pole in the gust: two small hollow 'tink-tink'
    knocks (a tube's ring, 1.4-3.6 kHz, short). Mono."""
    y = np.zeros(ns(0.4))
    f0 = r.uniform(1400, 1700)
    for k in range(hits):
        d = 0.22
        t = tt(d)
        c = modal(d, [(f0, 1.0, 0.05), (f0 * 2.76, 0.45, 0.025), (f0 * 5.4, 0.2, 0.01), (f0 * 0.62, 0.3, 0.03)], r)
        c *= 1 - np.exp(-t / 0.0004)
        c += hp(r.standard_normal(len(t)), 3500) * np.exp(-t / 0.0005) * 0.3
        _place_mono(y, c * (1.0 if k == 0 else 0.6), 0.075 * k + r.uniform(0, 0.01))
    return fades(y, 0.0002, 0.05)


def espresso_hiss(r, dur=0.9):
    """across the street: the cafe's espresso machine steam wand (a bright hiss swelling and easing, the milk's low
    gurgle under it). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.12, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)
    hs = bp(colored(n, r, 0.0), 2500, 9000, 1) * (0.85 + 0.15 * smooth_noise(n, r, 12.0))
    gg = bubbles(dur, r, 40, 250, 900, (0.006, 0.02))[:n] * 0.35
    return fades((hs + gg) * env, 0.01, 0.06)


def clipboard_tap(r):
    """the pencil's end tapped once on the clipboard's hardboard: a small dull tock with the board's 300 Hz body. Mono."""
    d = 0.1
    t = tt(d)
    y = modal(d, [(r.uniform(310, 350), 1.0, 0.016), (r.uniform(950, 1100), 0.45, 0.007), (r.uniform(2300, 2700), 0.25, 0.003)], r)
    y += hp(r.standard_normal(len(t)), 2200) * np.exp(-t / 0.0006) * 0.45
    return fades(y, 0.0002, 0.03)


def paper_thup(r):
    """a rubber stamp's pad landing on a bundle of paper bills: a soft, dull paper 'thup' (150-1200 Hz). Mono."""
    d = 0.12
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 150, 1200, 2) * np.exp(-t / 0.018) * (1 - np.exp(-t / 0.002))
    y += modal(d, [(r.uniform(180, 220), 0.6, 0.02)], r)
    return fades(y, 0.0005, 0.03)


def spin_whoosh(r, dur=0.45):
    """the spinning newspaper's flight alone (no landing): an air whoosh fluttering at the spin rate (fast -> slowing)
    and the pages rattling, building to the landing. Mono."""
    n = ns(dur + 0.03)
    t = np.arange(n) / SR
    u = np.clip(t / dur, 0, 1)
    spin = np.cumsum(14.0 - 8.0 * u) / SR
    flut = 0.55 + 0.45 * np.abs(np.sin(np.pi * spin))
    env = np.clip(t / (dur * 0.35), 0, 1) ** 1.5 * np.clip((dur + 0.02 - t) / 0.03, 0, 1)
    y = bp(colored(n, r, 0.6), 500, 5000, 1) * env * flut
    y += paper_flutter(r, env * flut) * 0.6
    return fades(y, 0.004, 0.02)


def paper_slap_low(r):
    """the folded newspaper landing flat on the stand's stack: a dull low-mid slap (its energy at 0.2-1 kHz, the
    stack's thump under it) with a tiny crisp edge. Mono."""
    d = 0.3
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 180, 1100, 2) * np.exp(-t / 0.016) * 2.0
    y += modal(d, [(r.uniform(150, 175), 0.8, 0.035), (r.uniform(380, 440), 0.5, 0.02)], r)
    y += bp(r.standard_normal(len(t)), 1500, 5000, 1) * np.exp(-t / 0.004) * 0.25
    return fades(peq(y, 450.0, 3.0, 0.9), 0.0003, 0.05)


def umbrella_flutter(n, r, g):
    """wind gusts catching the lenders' umbrella canopies: soft fabric flaps (300-2500 Hz noise bursts) whose rate and
    level follow the gust curve g (0..1.5) - nearly silent in the lulls. Mono."""
    t = np.arange(n) / SR
    rate = 5.0 + 9.0 * np.clip(g - 0.5, 0, 1)
    p = np.cumsum(rate) / SR
    flap = np.abs(np.sin(np.pi * p)) ** 6
    y = bp(colored(n, r, 0.4), 300, 2500, 1) * flap * np.clip((g - 0.55) / 0.4, 0, 1) ** 1.5
    return y * (0.8 + 0.2 * smooth_noise(n, r, 3.0))

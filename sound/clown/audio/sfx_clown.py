# Sound sources made for "The Clown Nobody Saw" (own synthesis, numpy + scipy only; the engine's generators stay in
# sfx_gen*.py): the rubber-bulb horn, the unicycle (tyre on brick + pedal squeak), shoes on brick, leaves in a breeze,
# the far fountain, spring songbirds, the muffled phone "blah-blah", the clothes peg, a leaf brush, the happy chime,
# the flat "wah", the reveal's shimmer parts, and a tape-style slow-down (shot 8).
import os
import numpy as np
from scipy import signal
from dsp import SR, TAU, ns, rng, lp, hp, bp, peq, reson, colored, smooth_noise, fades, phase, modal, pan, st
import sfx_gen as G
import instruments as I


def _mono_sum(*xs):
    n = max(len(x) for x in xs)
    y = np.zeros(n)
    for x in xs:
        y[: len(x)] += x
    return y


def _at(x, t):
    """x delayed by t seconds (mono)"""
    return np.concatenate([np.zeros(ns(t)), x])


def _peak1(x):
    return x / (np.max(np.abs(x)) + 1e-9)


# ---------------------------------------------------------------- the bulb horn
def bulb_honk(r, f0=392.0, dur=0.11, sag=1.0, bright=1.0, rough=0.16):
    """ONE squeeze of a rubber-bulb horn: a beating brass reed (a pulse-like buzz, rich in harmonics), the pressure
    jumping up as the bulb is squeezed and the pitch sagging as it empties, through the small brass bell (it cannot
    radiate lows: nothing under ~300 Hz; nasal formants near 1.0 and 2.1 kHz), a little reed chatter and a puff of air.
    Bright and funny, rolled off above 6 kHz so it is never harsh. Mono."""
    n = ns(dur + 0.07)
    t = np.arange(n) / SR
    env = (1 - np.exp(-t / 0.005)) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.016))
    env *= 0.86 + 0.14 * np.exp(-t / 0.04)
    cents = -70.0 * np.exp(-t / 0.007) - sag * 110.0 * np.clip((t - 0.45 * dur) / (0.55 * dur + 0.04), 0, 1) ** 1.6
    cents = cents + 6.0 * smooth_noise(n, r, 30.0)
    ph = phase(f0 * 2 ** (cents / 1200))
    K = max(1, int(min(40, 9000 / f0)))
    y = np.zeros(n)
    for k in range(1, K + 1):                         # a reed is a pulse train: coherent phases, slow roll-off
        y += k ** -0.75 / (1 + (k * f0 / 5200.0) ** 4) * np.sin(k * ph + 0.35 * k)
    y *= 1 + rough * np.sin(TAU * 71.0 * t + r.uniform(0, TAU)) * (0.6 + 0.4 * smooth_noise(n, r, 40.0))
    y *= env
    y += bp(r.standard_normal(n), 900, 5000, 1) * env * 0.035                   # air through the reed
    y += lp(r.standard_normal(n), 500, 2) * np.exp(-t / 0.012) * 0.10           # the bulb's rubbery thup
    y = hp(y, 300.0, 2)
    y = peq(y, 1000.0, 8.0, 2.4)
    y = peq(y, 2100.0, 5.0 * bright, 3.0)
    y = peq(y, 3300.0, 2.0 * bright, 3.0)
    y = lp(y, 6200.0, 2)
    return fades(y, 0.0015, 0.02)


# THE HORN OF THE FILM. The synthesized reed above measured dull and too pure against real bulb-horn takes (centroid
# 1.2 kHz vs 1.9-4.2 kHz, harmonicity 0.99 vs 0.8-0.95, the two honks not separated), so the film's horn is ONE
# ElevenLabs sound-effect take (`_el/horn_b.wav`, made by el_sfx.py: "Two very short quick honks from a small rubber bulb
# bicycle horn ..."; SFX only, never voice): two clean squeezes, 76 ms and 114 ms, a 585 -> 545 Hz reed. It is played two
# semitones down (C5, the key of the score; that also takes a little edge off) and every honk of the film is cut from
# it, so the horn is the same horn every time. If the file is missing the synthesized reed is used (same timing).
HORN_TAKE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_el", "horn_b.wav")
HORN_SEMIS = -2.0                 # the take's reed is ~D5: two semitones down = C5
HORN_CUT = (0.105, 0.40)          # the take: squeeze 1 = 0 .. 0.105 s, squeeze 2 = 0.105 .. 0.40 s (then an mp3 end click)
HORN_TOP = (5200.0, -3.0)         # a gentle high shelf: bright and funny, never harsh
_HORN = None


def _horn():
    global _HORN
    if _HORN is None:
        if os.path.exists(HORN_TAKE):
            from dsp import read_wav, shelf
            x = read_wav(HORN_TAKE)[0].mean(0)
            x = x / (np.max(np.abs(x)) + 1e-9)
            x = shelf(x, HORN_TOP[0], HORN_TOP[1], "high")
            i, j = ns(HORN_CUT[0]), ns(HORN_CUT[1])
            _HORN = (fades(x[:i], 0.0005, 0.006), fades(x[i:j], 0.002, 0.04))
        else:
            _HORN = False
    return _HORN


def _horn_pitch(x, semis):
    """play a squeeze at `semis` semitones (resampled: a little lower = a little longer)"""
    return slow(x, 2 ** (semis / 12.0))


def honk_honk(r, f=(392.0, 330.0), d=(0.095, 0.125), gap=0.03, second=0.85, vary=0.0, tight=1.0):
    """the clown's 'honk-honk': two quick squeezes of the film's horn. vary = random detune (semitones, +-) so repeats
    are not carbon copies; tight < 1 pulls the second squeeze closer. Mono; the first honk starts at sample 0 and the
    whole thing is ~0.27 s + a short tail. (f, d, gap, second only drive the synthesized fallback.)"""
    h = _horn()
    if h:
        s_ = HORN_SEMIS + (r.uniform(-vary, vary) if vary else 0.0)
        a, b = _horn_pitch(h[0], s_), _horn_pitch(h[1], s_ - (r.uniform(0.0, vary) if vary else 0.0))
        return _mono_sum(a, _at(b * second / 0.85, len(a) / SR * tight))
    a = bulb_honk(r, f[0], d[0], sag=0.7)
    b = bulb_honk(r, f[1], d[1], sag=1.3) * second
    return _mono_sum(a, _at(b, d[0] + gap))


def honk_one(r, f0=370.0, dur=0.15):
    """one squeeze (the longer second one of the take)"""
    h = _horn()
    if h:
        return _horn_pitch(h[1], HORN_SEMIS)
    return bulb_honk(r, f0, dur, sag=1.2)


# ---------------------------------------------------------------- the unicycle
def pedal_squeak(r, f0=1380.0, dur=0.085, up=True, soft=1.0):
    """one gentle pedal-bearing squeak (dry metal stick-slip): a narrow tone that slides up on the down-stroke ('eek')
    or down on the other pedal ('ook'), a strong octave, a little roughness. Calibrated on an ElevenLabs reference take
    (`_el/squeak_a.wav`: squeaks of 60-150 ms, a ~1.3 kHz fundamental with its octave at 2.6 kHz as strong); the take
    itself is not used. Mono."""
    n = ns(dur)
    u = np.linspace(0, 1, n)
    gl = (0.92 + 0.16 * u) if up else (1.06 - 0.14 * u)
    f = f0 * gl * (1 + 0.012 * smooth_noise(n, r, 60.0))
    ph = phase(f)
    y = np.sin(ph) + 0.8 * np.sin(2 * ph + 0.6) + 0.15 * np.sin(3 * ph + 1.1)
    y *= np.sin(np.pi * u) ** 1.4 * (1 + 0.25 * np.sin(TAU * 48.0 * u * dur + r.uniform(0, TAU)))
    y += bp(r.standard_normal(n), 1500, 5000, 1) * np.sin(np.pi * u) * 0.05
    return fades(lp(y, 5500.0, 2) * soft, 0.003, 0.012)


def tyre_roll(speed, r, joint=0.21):
    """a small rubber tyre rolling on herringbone brick at `speed` (m/s, per sample): the soft low-mid roll of the
    rubber and a light patter as it crosses the brick joints (every `joint` m, jittered). Mono (len(speed),)."""
    n = len(speed)
    v = np.clip(speed / 2.1, 0.0, 1.6)
    roll = bp(colored(n, r, 0.8), 160.0, 950.0, 1) * (0.25 + 0.75 * v) * (0.85 + 0.15 * smooth_noise(n, r, 7.0))
    y = roll * 0.7
    dist = np.cumsum(speed) / SR
    k = np.floor(dist / joint)
    idx = np.flatnonzero(np.diff(k) > 0)
    tick = np.zeros(n)
    for i in idx:
        j = i + int(r.normal(0, 0.004) * SR)
        if 0 <= j < n:
            tick[j] += r.uniform(0.45, 1.0)
    tn = ns(0.03)
    tt_ = np.arange(tn) / SR
    ker = (np.sin(TAU * 420.0 * tt_) * np.exp(-tt_ / 0.006) + 0.5 * np.sin(TAU * 980.0 * tt_ + 0.4) * np.exp(-tt_ / 0.003))
    y += signal.fftconvolve(tick, ker)[:n] * 0.55 * np.sqrt(np.clip(v, 0, 1.5))
    return y


# ---------------------------------------------------------------- shoes on brick
def brick_step(r, weight=1.0, hard=0.5, f0=None):
    """one shoe on brick paving: the heel (a short low knock + a small hard click + a breath of grit), then the sole
    rolling down 60-90 ms later (softer, a little brighter). Mono, ~0.2 s."""
    f0 = f0 or r.uniform(105.0, 170.0)
    n = ns(0.2)
    t = np.arange(n) / SR
    heel = np.sin(TAU * f0 * t * (1 + 0.25 * np.exp(-t / 0.008))) * np.exp(-t / 0.018) * 0.9
    heel += lp(r.standard_normal(n), 520.0, 2) * np.exp(-t / 0.012) * 0.6
    heel += bp(r.standard_normal(n), 1200.0, 4200.0, 2) * np.exp(-t / 0.0035) * (0.25 + 0.6 * hard)
    grit = bp(r.standard_normal(n), 2200.0, 6500.0, 1) * np.exp(-t / 0.03) * 0.06
    d = ns(r.uniform(0.06, 0.09))
    sole = np.zeros(n)
    m = n - d
    sole[d:] = (lp(r.standard_normal(m), 900.0, 2) * np.exp(-t[:m] / 0.016) * 0.35
                + bp(r.standard_normal(m), 900.0, 3200.0, 1) * np.exp(-t[:m] / 0.01) * 0.14)
    return fades((heel + grit + sole) * weight, 0.0005, 0.02)


def walk_by(n, r, t_pass, rate=1.9, weight=1.0, hard=0.5, width=3.0):
    """one walker crossing: steps at `rate` per second with a bell-shaped level around t_pass (s), `width` s wide. Mono."""
    y = np.zeros(n)
    f0 = r.uniform(105.0, 170.0)
    tm = t_pass - 2.2 * width + r.uniform(0, 1.0 / rate)
    k = 0
    while tm < t_pass + 2.2 * width:
        g = np.exp(-0.5 * ((tm - t_pass) / width) ** 2)
        if g > 0.03 and 0 <= tm < n / SR - 0.25:
            x = brick_step(r, weight * g * r.uniform(0.8, 1.05), hard * (1.0 if k % 2 == 0 else 0.85), f0 * r.uniform(0.96, 1.04))
            G._place_mono(y, x, tm)
        tm += 1.0 / rate * r.uniform(0.95, 1.05)
        k += 1
    return y


# ---------------------------------------------------------------- air, leaves, water, birds
def leaves(n, r, g):
    """fresh spring leaves in a light breeze: a soft, bright hiss that swells with the gust curve g (per sample, about
    0.3 .. 1.2), flickering at a few Hz, with a scatter of tiny dry leaf ticks on the stronger gusts. Stereo (2, n)."""
    out = np.zeros((2, n))
    for ch in range(2):
        fl = 1 + 0.35 * smooth_noise(n, r, 5.0) + 0.2 * smooth_noise(n, r, 13.0)
        hi = bp(colored(n, r, 0.5), 2200.0, 9000.0, 1) * np.clip(g, 0.05, 1.5) ** 1.6 * fl
        body = bp(colored(n, r, 0.9), 500.0, 1800.0, 1) * np.clip(g, 0.05, 1.5) * 0.35
        out[ch] = hi + body
    ticks = G.rattle(n / SR, r, density=7.0, env=None, lo=2600, hi=7500, tau=(0.002, 0.006))[:n]
    ticks = np.pad(ticks, (0, max(0, n - len(ticks)))) * np.clip(g - 0.45, 0, 1) * 0.35
    out += pan(ticks, r.uniform(-0.3, 0.3)) * 0.5
    return out


def air(n, r):
    """open-air tone of a sunny square: a soft low breath of moving air (no hum). Stereo."""
    out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = lp(colored(n, r, 1.6), 420.0, 1) * (0.8 + 0.2 * smooth_noise(n, r, 0.4)) + bp(colored(n, r, 1.0), 400.0, 1400.0, 1) * 0.12
    return out


def fountain(n, r):
    """a small fountain far across the square: falling water (a broad splash hiss around 2 kHz with fast roughness)
    and its basin's bubbling, softened by the distance. Mono (n,)."""
    y = bp(colored(n, r, 0.4), 700.0, 5200.0, 1) * (0.8 + 0.25 * smooth_noise(n, r, 26.0)) * (0.9 + 0.1 * smooth_noise(n, r, 0.5))
    b = G.bubbles(n / SR, r, 34.0, f_lo=380, f_hi=2300)
    y[: min(n, len(b))] += b[:n] * 0.5
    y += bp(colored(n, r, 1.0), 180.0, 600.0, 1) * 0.3
    return lp(y, 3400.0, 1)


def _whistle(r, f, env):
    """a bird's whistle: f (Hz, per sample), env (per sample)"""
    ph = phase(f)
    return (np.sin(ph) + 0.12 * np.sin(2 * ph + 0.5)) * env


def robin(r):
    """an American robin's 'cheerily, cheer-up' phrase: 4-7 liquid whistled notes, each a quick up-down slur at
    2.2-3.8 kHz. Mono."""
    out = []
    for _ in range(int(r.integers(4, 8))):
        d = r.uniform(0.09, 0.17)
        n = ns(d)
        u = np.linspace(0, 1, n)
        f0 = r.uniform(2200.0, 3300.0)
        f = f0 * (1 + r.uniform(0.08, 0.3) * np.sin(np.pi * u * r.uniform(0.8, 1.6)) + 0.02 * np.sin(TAU * r.uniform(25, 45) * u * d))
        out.append(_whistle(r, f, np.sin(np.pi * u) ** 0.8) * r.uniform(0.6, 1.0))
        out.append(np.zeros(ns(r.uniform(0.05, 0.13))))
    return fades(np.concatenate(out), 0.003, 0.01)


def chickadee(r):
    """a chickadee's two-note 'fee-bee': two clear whistles, the second a whole tone lower. Mono."""
    f1 = r.uniform(3500.0, 3900.0)
    out = []
    for k, d in enumerate((0.34, 0.38)):
        n = ns(d)
        u = np.linspace(0, 1, n)
        f = f1 * (1.0 if k == 0 else 0.86) * (1 - 0.015 * u)
        out.append(_whistle(r, f, np.minimum(1, u / 0.12) * np.minimum(1, (1 - u) / 0.2)) * (1.0 if k == 0 else 0.85))
        out.append(np.zeros(ns(0.09)))
    return fades(np.concatenate(out), 0.003, 0.01)


def finch(r):
    """a house finch's quick warble: 8-14 very short chips running up and down. Mono."""
    out = []
    f0 = r.uniform(2800.0, 3600.0)
    for k in range(int(r.integers(8, 15))):
        d = r.uniform(0.035, 0.07)
        n = ns(d)
        u = np.linspace(0, 1, n)
        f = f0 * 2 ** (r.uniform(-0.35, 0.45)) * (1 + r.uniform(-0.2, 0.25) * u)
        out.append(_whistle(r, f, np.sin(np.pi * u)) * r.uniform(0.5, 1.0))
        out.append(np.zeros(ns(r.uniform(0.015, 0.05))))
    return fades(np.concatenate(out), 0.002, 0.01)


def bird(r):
    k = r.uniform()
    if k < 0.3:
        return robin(r)
    if k < 0.5:
        return chickadee(r)
    if k < 0.75:
        return finch(r)
    if k < 0.9:
        import sfx_gen_r2 as G3
        return G3.sparrow_chirp(r)
    return np.concatenate([G.bird_chip(r), np.zeros(ns(0.08)), G.bird_chip(r)])


# ---------------------------------------------------------------- the phone-walkers' wordless "blah-blah"
def phone_murmur(r, dur, base=190.0, rate=4.4, bright=1.0):
    """one side of a phone call heard from outside it: a soft, MUFFLED, wordless 'blah-blah' (the engine's syllable
    babble, kept to 250-1500 Hz so it can never read as words). Mono."""
    y = G.babble(dur, r, base, 1.0, rate=rate, active=0.8, fmax=2600, breath=0.12)
    y = bp(y, 250.0, 1500.0 * bright, 2)
    return fades(y, 0.05, 0.08)


# ---------------------------------------------------------------- small props
def peg_click(r):
    """a wooden clothes peg snapping shut on a branch: the two beech jaws clack (a dry, high wooden click) and the
    little wire spring pings. Mono."""
    a = _peak1(G.wood_knock(r, f0=1250.0, tau=0.008, hard=1.3))
    b = _peak1(G.wood_knock(r, f0=1700.0, tau=0.005, hard=1.0)) * 0.5
    sp = modal(0.09, [(3350.0, 0.22, 0.03), (5100.0, 0.1, 0.018)], r)
    return fades(_mono_sum(a, _at(b, 0.011), _at(sp, 0.004)), 0.0003, 0.02)


def leaf_brush(r, dur=0.3):
    """a head dipping under a leafy branch: the leaves brushed aside (a quick bright swish with dry leaf ticks). Mono."""
    n = ns(dur)
    u = np.linspace(0, 1, n)
    e = np.sin(np.pi * u ** 0.7) ** 1.5
    y = bp(colored(n, r, 0.4), 2400.0, 8500.0, 1) * e * (1 + 0.4 * smooth_noise(n, r, 30.0))
    tk = G.rattle(dur, r, density=45.0, env=None, lo=2800, hi=7000, tau=(0.002, 0.005))[:n]
    y[: len(tk)] += tk * e[: len(tk)] * 0.6
    return fades(y, 0.004, 0.03)


def soft_whoosh(r, dur=0.32, lo=300.0, hi=1500.0, peak=0.45):
    return G.whoosh(dur, r, peak=peak, f_lo=lo, f_hi=hi, width=0.9, tail=0.3, air=0.1)


def happy_chime(r):
    """a happy little 'ooh!': three quick rising bell notes (G6 C7 E7) with a breath of sparkle. Mono."""
    y = np.zeros(ns(1.3))
    for k, m in enumerate((91, 96, 100)):
        G._place_mono(y, I.glock(I.m2f(m), 0.55 + 0.1 * k, r, dur=1.0) * (0.8 + 0.1 * k), 0.07 * k)
    G._place_mono(y, G.tiny_ting(r, f0=5200.0, tau=0.2) * 0.25, 0.2)
    return y


def flat_wah(r, m=58, dur=0.42):
    """the deadpan 'wah': one muted-trumpet note that opens ('w-ah') while its pitch sags a tone. Mono."""
    return I.muted_trumpet(I.m2f(m), dur, 0.62, r, scoop=-20.0, fall=-1.6, vib=0.0, wah=(0.05, 0.95))


def text_pop(r, f0=470.0):
    """a title popping onto the screen: a soft rising 'bloop' and a small wooden tick"""
    return _mono_sum(G.pop(r, f0=f0, up=True, dur=0.1), _at(I.woodblock(0.35, r, f=1500.0, dur=0.1), 0.012))


def pencil_cross(r):
    """a cross drawn in a tally box: two quick pencil strokes"""
    a = G.pen_scratch(r, dur=0.07, rate=14.0, check=False)
    b = G.pen_scratch(r, dur=0.08, rate=14.0, check=False)
    return _mono_sum(a, _at(b, 0.085))


def pencil_tick(r):
    return G.pen_scratch(r, dur=0.09, rate=12.0, check=True)


def clock_whirr(r, dur):
    """a tower clock's hands spinning through an hour: a fast soft ratchet that winds up and eases off, and the
    minute hand's 'tock' as it lands. Mono."""
    n = ns(dur)
    u = np.linspace(0, 1, n)
    y = G.reel_whirr(r, dur, 26.0, 46.0)[:n]
    y = np.pad(y, (0, n - len(y))) * np.sin(np.pi * np.clip(u, 0, 1) ** 0.8) ** 0.6
    tock = I.woodblock(0.6, r, f=780.0, dur=0.16)
    return _mono_sum(y, _at(tock, max(0.0, dur - 0.02)))


def headphone_leak(r, dur, bl):
    """music leaking from big headphones: a tinny 'tss-tss-ts-tss' at twice the score's beat (bl = seconds per beat)"""
    y = np.zeros(ns(dur + 0.1))
    k = 0
    tm = 0.0
    while tm < dur:
        x = I.hat_chick(0.6 if k % 2 == 0 else 0.4, r)
        G._place_mono(y, x, tm)
        if k % 4 == 2:
            G._place_mono(y, I.celesta(I.m2f(84 + (k % 3) * 4), 0.3, r, dur=0.2), tm)
        tm += bl / 2
        k += 1
    return hp(y, 2600.0, 2)


def slow(x, rate):
    """varispeed: play x at `rate` (< 1 = slower and lower, like a slowed tape). Mono or stereo."""
    x = np.asarray(x, float)
    n = x.shape[-1]
    m = int(n / rate)
    pos = np.arange(m) * rate
    if x.ndim == 1:
        return np.interp(pos, np.arange(n), x)
    return np.stack([np.interp(pos, np.arange(n), c) for c in x])


def tape_warp(x, t0, t1, rate=0.84, ramp_in=0.22, ramp_out=0.12, xf=0.04):
    """slow motion for one window of a continuous stem (shot 8): between t0 and t1 the stem is played like a tape that
    slows to `rate` (pitch and tempo drop together) and comes back up at the end; it then jumps back onto the live
    signal with a short crossfade (the jump sits on the picture cut). x is (2, N); returns a copy."""
    i0, i1 = ns(t0), ns(t1)
    if i1 - i0 < ns(0.3):
        return x
    n = i1 - i0
    t = np.arange(n) / SR
    d = n / SR
    r_ = 1 - (1 - rate) * np.clip(t / ramp_in, 0, 1) * np.clip((d - t) / ramp_out, 0, 1)
    pos = i0 + np.cumsum(r_) - r_[0]
    y = x.copy()
    for c in range(x.shape[0]):
        y[c, i0:i1] = np.interp(pos, np.arange(x.shape[1]), x[c])
    k = min(ns(xf), n // 4)                                # back onto the live signal at t1
    w = np.linspace(0, 1, k)
    y[:, i1 - k:i1] = y[:, i1 - k:i1] * (1 - w) + x[:, i1 - k:i1] * w
    return y

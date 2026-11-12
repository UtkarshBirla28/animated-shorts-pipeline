# Procedural sound effects for the anti-theft short (own numpy synthesis, no samples):
# desert wind (body, gust-driven brightness, sign/rail whistle, blowing sand, sagebrush rustle) with a seamless loop,
# canyon-wren calls, crickets, room tones, glint and bright dings, thought-bubble pops, gravel footsteps, camera shutter,
# cloth / pocket rustle, stone clinks, split-flap flaps, pen scratches, stopwatch click, wooden sign knocks, LED counter
# ticks, cash-register cha-ching, chalk lines / chalk writing with squeaks, cartoon pops, the giant rubber stamp,
# chip scoops into a metal bucket, paper rustle, mailbox clunk, whooshes (fly-through / fly-in only).
import numpy as np
from scipy import signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, ramp, fades, shape,
                 phase, modal, pan, st, widen)


def _place_mono(buf, x, t):
    i = ns(t)
    a, b = max(0, i), min(len(buf), i + len(x))
    if b > a:
        buf[a:b] += x[a - i: b - i]


def _env(n, pts):
    """pts = [(time_s, value)] -> per-sample envelope"""
    t = np.arange(n) / SR
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


# ================================================================ creak engine (stick-slip friction)
def stick_slip(dur, rate, r, jitter=0.12, amp=None):
    """impulse train whose instantaneous rate follows `rate` (array or float, Hz)"""
    n = ns(dur)
    rt = np.full(n, rate, float) if np.isscalar(rate) else np.interp(np.arange(n), np.linspace(0, n - 1, len(rate)), rate)
    x = np.zeros(n)
    t = r.uniform(0, 1.0 / max(rt[0], 1))
    while t < dur:
        k = ns(t)
        if k >= n:
            break
        a = 1.0 if amp is None else amp[min(k, len(amp) - 1)]
        x[k] += a * r.uniform(0.55, 1.0)
        t += (1.0 / max(rt[k], 1.0)) * (1 + r.normal(0, jitter))
    return x


WOOD = [(230, 9, 1.0), (520, 12, 0.8), (940, 14, 0.55), (1650, 16, 0.35), (2800, 18, 0.18)]
SMALLMETAL = [(1850, 40, 1.0), (3100, 45, 0.8), (4600, 50, 0.6), (6900, 55, 0.35)]


def creak(dur, r, rate0=110, rate1=180, modes=WOOD, shape_pts=None, rough=0.12, noise=0.05, scale=1.0):
    n = ns(dur)
    u = np.linspace(0, 1, 64)
    rate = rate0 + (rate1 - rate0) * u + 0.15 * (rate0 + rate1) / 2 * np.sin(np.pi * u) * r.uniform(-1, 1)
    env_pts = shape_pts or [(0, 0), (0.15, 1), (0.7, 0.85), (1.0, 0)]
    env = np.interp(np.linspace(0, 1, n), [p[0] for p in env_pts], [p[1] for p in env_pts])
    x = stick_slip(dur, rate, r, rough, env)
    md = [(f * scale * r.uniform(0.94, 1.06), q, g) for f, q, g in modes]
    y = resbank(x, md)
    y += noise * bp(r.standard_normal(n), 400, 4000, 1) * env
    return fades(y, 0.004, 0.03)


def clink(r, f0=None, dur=0.12, bright=1.0):
    """one small hard clink (stone on stone, coin, buckle)"""
    f0 = f0 or np.exp(r.uniform(np.log(1800), np.log(5200)))
    modes = [(f0, 1.0, r.uniform(0.006, 0.02)), (f0 * r.uniform(2.3, 2.9), 0.5 * bright, 0.006), (f0 * r.uniform(3.9, 5.1), 0.25 * bright, 0.004)]
    y = modal(dur, modes, r)
    t = tt(dur)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0006) * 0.4
    return y


def rattle(dur, r, density=30.0, env=None, lo=1600, hi=5500, tau=(0.006, 0.02)):
    """a cloud of small clinks (pebbles, chips, coins)"""
    n = ns(dur)
    y = np.zeros(n)
    times = np.sort(r.uniform(0, dur, int(density * dur) + 1))
    for tm in times:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        if a < 0.02:
            continue
        f0 = np.exp(r.uniform(np.log(lo), np.log(hi)))
        c = modal(0.08, [(f0, 1.0, r.uniform(*tau)), (f0 * r.uniform(2.2, 2.8), 0.45, 0.004)], r)
        c += hp(r.standard_normal(len(c)), 2500) * np.exp(-tt(0.08) / 0.0005) * 0.3
        _place_mono(y, c * a * r.uniform(0.3, 1.0), tm)
    return y


# ================================================================ desert wind
def loop_xfade(x, n, L):
    """x has n + L samples; returns n samples whose end runs seamlessly into its own start (equal-power fold)"""
    w = np.linspace(0, 1, L)
    x = np.array(x, copy=True)
    head = x[..., :L]
    tail = x[..., n:n + L]
    x[..., :L] = head * np.sin(0.5 * np.pi * w) + tail * np.cos(0.5 * np.pi * w)
    return x[..., :n]


def desert_wind(n, r, g, level=1.0, whistle=0.3, sand=0.22, rustle=0.25, low=0.18, f_whistle=(640, 980), bright=1.0, width=1.0, f_mul=None):
    """open desert wind. g = per-sample gust curve (~0.3 .. 1.0). Stereo (2, n).
    body: broadband air whose brightness follows the gusts; whistle: the wind singing in the sign posts / rail on strong
    gusts; sand: dry grains hissing along the ground; rustle: sagebrush / dry grass fluttering; low: soft buffeting."""
    out = np.zeros((2, n))
    g = np.clip(g, 0.05, 1.5)
    # local gusts on top of the shared (picture) curve: swells every 2-5 s, so the air breathes instead of hissing flat
    gl = np.clip(g * (0.66 + 0.6 * smooth_noise(n, r, 0.3)), 0.05, 1.6)
    for ch in range(2):
        c = colored(n, r, 1.0)
        dark = lp(c, 380 * bright, 2)
        light = bp(c, 500 * bright, 2400 * bright, 1)
        body = dark * (0.16 + 0.84 * gl ** 1.6) + light * 0.6 * gl ** 2.4
        w = colored(n, r, 0.0)
        grains = np.zeros(n)
        k = r.random(n) < (0.0003 + 0.003 * gl ** 3)
        grains[k] = r.uniform(0.3, 1.0, k.sum())
        sandy = hp(w, 4200) * 0.35 * gl ** 2.8 + bp(grains, 2500, 9000, 1) * 2.0
        flutter = 0.55 + 0.45 * smooth_noise(n, r, 6.0)
        rust = bp(colored(n, r, 0.3), 1300, 5200, 1) * flutter * gl ** 1.8
        rum = lp(colored(n, r, 2.0), 90, 2) * gl
        y = body + sand * sandy + rustle * rust + low * rum
        out[ch] = y
    # the whistle: the wind singing in the sign posts / rail - two breathy resonances that only open on the strong
    # local gusts (a few seconds at a time), their pitch rising and falling with the gust
    if whistle > 0:
        lo_, hi_ = f_whistle
        T_ = np.arange(n) / SR
        gate = np.clip((gl - 0.78) / 0.3, 0, 1) ** 2
        for j, (mul, pn, wd) in enumerate([(1.0, 0.25, 0.07), (1.37, -0.3, 0.09)]):
            nz = colored(n, r, 0.5)
            drift = smooth_noise(n, r, 0.2)
            fc_s = (lo_ + (hi_ - lo_) * np.clip((gl - 0.6) / 0.7 + 0.2 * drift, 0, 1)) * mul
            if f_mul is not None:                        # round 8 (A7 ADD): a time-varying pitch of the post singing
                fc_s = fc_s * np.asarray(f_mul, float)[:n]
            wl = shape(nz, lambda Tq, Fq: np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / np.interp(Tq, T_, fc_s)[None, :]) / wd) ** 2), 4096, 1024)
            wl = wl / (np.std(wl) + 1e-12) * gate * (0.5 if j == 0 else 0.3)
            out += pan(wl * whistle, pn)
    if width < 1.0:
        m = out.mean(0)
        out = out * width + (1 - width) * np.stack([m, m])
    return out * level


def canyon_wren(r, notes=None):
    """canyon wren: a cascade of clear whistled notes falling and slowing (the classic desert-canyon song)"""
    k = notes or int(r.integers(8, 12))
    f_hi, f_lo = r.uniform(3300, 3900), r.uniform(1400, 1700)
    y = np.zeros(ns(2.4))
    t0 = 0.0
    for i in range(k):
        u = i / max(1, k - 1)
        f = f_hi * (f_lo / f_hi) ** (u ** 0.8)
        L = 0.05 + 0.04 * u
        tl = tt(L)
        fi = f * (1.06 - 0.12 * tl / L)
        c = np.sin(phase(fi)) * np.sin(np.pi * tl / L) ** 1.6 * (0.6 + 0.4 * (1 - u))
        _place_mono(y, c, t0)
        t0 += 0.085 + 0.06 * u + r.normal(0, 0.006)
    return fades(y[: ns(t0 + 0.15)], 0.002, 0.05)


def bird_chip(r):
    L = r.uniform(0.025, 0.045)
    tl = tt(L)
    f = r.uniform(4200, 5600) * (1 - 0.3 * tl / L)
    return np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 2


def crickets(dur, r, voices=3, f_lo=4200, f_hi=4900):
    n = ns(dur)
    y = np.zeros(n)
    t = np.arange(n) / SR
    for v in range(voices):
        f = r.uniform(f_lo, f_hi)
        pulse = (np.sin(TAU * r.uniform(28, 34) * t) > 0.2).astype(float)
        chirp = (np.sin(TAU * r.uniform(1.4, 2.6) * t + r.uniform(0, TAU)) > 0.55).astype(float)
        e = lp(pulse * chirp, 200, 1)
        y += np.sin(TAU * f * t) * e * r.uniform(0.4, 1.0)
    return y


def room_tone(n, r, hum=0.0, air=1.0, hum_f=120.0):
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    for ch in range(2):
        a = lp(colored(n, r, 1.2), 420, 2) * air + bp(colored(n, r, 0.5), 600, 3000, 1) * 0.06 * air
        out[ch] = a
    if hum:
        hm = sum(np.sin(TAU * hum_f * k * t + r.uniform(0, TAU)) / k ** 1.5 for k in range(1, 6)) * hum
        out += st(hm * (0.85 + 0.15 * smooth_noise(n, r, 0.2)))
    return out


def clock_tick(r, tock=False):
    d = 0.08
    f0 = 2600 if not tock else 2100
    y = modal(d, [(f0, 1.0, 0.004), (f0 * 2.3, 0.5, 0.002), (f0 * 0.35, 0.3, 0.01)], r)
    y += hp(r.standard_normal(ns(d)), 3000) * np.exp(-tt(d) / 0.0004) * 0.3
    return y


# ================================================================ dings, pops, whooshes
def ding(r, f0=1760.0, tau=0.45, sparkle=1.0, dur=None, shimmer=True):
    """glint / magic 'ding': a pure bell (soft 2.76 and 5.4 partials) + a twinkle of tiny high pings + a breath of shine"""
    dur = dur or min(2.0, tau * 5)
    t = tt(dur)
    y = modal(dur, [(f0, 1.0, tau), (f0 * 2.0, 0.25, tau * 0.5), (f0 * 2.76, 0.18, tau * 0.25), (f0 * 5.4, 0.06, tau * 0.08)], r)
    y *= 1 - np.exp(-t / 0.0008)
    if shimmer:
        y *= 1 + 0.12 * np.sin(TAU * 7.5 * t)
    if sparkle:
        for k in range(5):
            tk = 0.02 + k * r.uniform(0.025, 0.045)
            pk = modal(0.15, [(r.uniform(5200, 8600), 1.0, r.uniform(0.02, 0.05))], r) * r.uniform(0.2, 0.45) * sparkle
            _place_mono(y, pk, tk)
        shine = hp(r.standard_normal(len(t)), 6500) * np.exp(-((t - 0.04) / 0.035) ** 2) * 0.06 * sparkle
        y = y + shine
    return fades(y, 0.0003, 0.08)


def pop(r, f0=380.0, up=True, dur=0.11, wet=0.6):
    """cartoon bubble pop: a fast pitch sweep 'bloop' + a tiny lip click"""
    t = tt(dur)
    sweep = (1 + 1.4 * (1 - np.exp(-t / 0.018))) if up else (1.6 - 0.75 * (1 - np.exp(-t / 0.03)))
    y = np.sin(phase(f0 * sweep)) * np.exp(-t / 0.022) * (1 - np.exp(-t / 0.002))
    y += np.sin(phase(f0 * 2 * sweep)) * np.exp(-t / 0.012) * 0.25 * wet
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0007) * 0.25
    return fades(y, 0.0002, 0.02)


def whoosh(dur, r, peak=0.3, f_lo=350, f_hi=2200, width=0.8, tail=0.25, air=0.15):
    """noise whoosh: band centre and level rise to `peak` then fall (ease-out burst when peak is early)"""
    n = ns(dur)
    nz = colored(n, r, 0.6)
    t = np.arange(n) / SR
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / tail))
    fc = lambda T: f_lo + (f_hi - f_lo) * np.interp(T, t, np.where(t < peak, t / peak, np.exp(-(t - peak) / (tail * 1.3))))
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / width) ** 2), 1024, 256)
    y = y * env + air * hp(nz, 4000) * env ** 2
    return fades(y, 0.005, 0.04)


# ================================================================ people + small objects
def gravel_step(r, weight=1.0, scuff=0.4):
    """a sneaker on the grit-covered paved trail: soft heel thump + gravel crunch + a smaller toe roll"""
    d = 0.32
    n = ns(d)
    t = np.arange(n) / SR
    heel = np.exp(-t / 0.022) * np.sin(phase(r.uniform(75, 115) * (1 + 0.2 * np.exp(-t / 0.008)))) * 0.8 * weight
    y = heel
    for (t0, dens, L, a) in [(0.0, 900, 0.06, 1.0), (r.uniform(0.07, 0.11), 600, 0.05, 0.55)]:
        g = np.zeros(ns(L))
        k = r.random(len(g)) < dens / SR
        g[k] = r.uniform(0.2, 1.0, k.sum()) * np.exp(-np.flatnonzero(k) / SR / (L * 0.45))
        kern = r.standard_normal(ns(0.0015)) * np.exp(-tt(0.0015) / 0.0004)
        cr = np.convolve(g, kern)[: len(g)]
        cr = bp(cr, 900, 7500, 1) * 3.0
        _place_mono(y, cr * a * weight, t0)
    sc = bp(r.standard_normal(n), 500, 4000, 1) * np.clip(t / 0.02, 0, 1) * np.exp(-t / 0.06) * 0.12 * scuff
    return fades(y + sc, 0.0005, 0.03)


def shutter(r):
    """compact camera: shutter 'click' + mirror/curtain 'clack' ~75 ms later + a tiny spring ring"""
    d = 0.3
    y = np.zeros(ns(d))
    for t0, f0, a in [(0.0, 3300, 1.0), (r.uniform(0.065, 0.085), 2500, 0.8)]:
        c = modal(0.06, [(f0, 1.0, 0.004), (f0 * 1.7, 0.6, 0.003), (f0 * 0.32, 0.5, 0.008), (f0 * 2.9, 0.3, 0.002)], r)
        c += hp(r.standard_normal(ns(0.06)), 2000) * np.exp(-tt(0.06) / 0.0008) * 0.6
        _place_mono(y, c * a, t0)
    ring = modal(0.2, [(5100, 1.0, 0.025)], r) * 0.08
    _place_mono(y, ring, 0.002)
    return y


def rustle(r, dur=0.4, moves=2, bright=1.0, centers=None):
    """fabric rustle (pocket, sleeve, lean): smooth friction swishes + a few crinkle grains; centers = explicit swish
    times (s) so the rustle sits on the picture's motion instead of a random spot"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for k in range(moves if centers is None else len(centers)):
        c = r.uniform(0.15, 0.85) * dur if centers is None else centers[k]
        w = r.uniform(0.04, 0.09)
        env += r.uniform(0.6, 1.0) * np.exp(-0.5 * ((t - c) / w) ** 2)
    env *= 0.7 + 0.3 * smooth_noise(n, r, 20.0)
    y = bp(colored(n, r, 0.4), 700 * bright, 5500 * bright, 1) * env
    gr = np.zeros(n)
    k = r.random(n) < 120 / SR
    gr[k] = r.uniform(0.2, 1.0, k.sum())
    y += bp(gr * env, 2500, 8000, 1) * 1.5
    return fades(y, 0.005, 0.03)


def pocket(r):
    """a stone chip slipped into a hip pocket: rustle + a muffled tick of stone on stone"""
    y = rustle(r, 0.45, 2, 0.9)
    tick = lp(clink(r, r.uniform(2200, 3200), 0.06), 1800, 1) * 0.35
    _place_mono(y, tick, 0.22)
    return y


def chip_place(r):
    """a small stone set down on gravel: a soft tock + a little crunch"""
    y = lp(clink(r, r.uniform(1600, 2400), 0.08), 3500, 1) * 0.7
    g = np.zeros(ns(0.05))
    k = r.random(len(g)) < 500 / SR
    g[k] = r.uniform(0.2, 1.0, k.sum())
    cr = bp(np.convolve(g, r.standard_normal(60) * np.exp(-np.arange(60) / 15))[: len(g)], 1200, 7000, 1) * 1.6
    y = np.concatenate([y, np.zeros(ns(0.05))])
    _place_mono(y, cr, 0.004)
    return y


def flap(r, last=False):
    """one split-flap card falling: a sharp plastic slap with a tiny rattle; the landing card double-taps"""
    d = 0.12
    y = np.zeros(ns(d))
    hits = [(0.0, 1.0)] + ([(0.018, 0.45)] if last else [])
    for t0, a in hits:
        c = modal(0.08, [(r.uniform(2000, 2400), 1.0, 0.005), (r.uniform(3600, 4200), 0.7, 0.003), (r.uniform(850, 1000), 0.6, 0.009)], r)
        c += hp(r.standard_normal(ns(0.08)), 2500) * np.exp(-tt(0.08) / 0.0006) * 0.7
        _place_mono(y, c * a, t0)
    return y


def pen_scratch(r, dur=0.3, rate=8.0, check=False):
    """ballpoint on paper over a clipboard: friction strokes + the board's dull resonance; check = a tick mark"""
    n = ns(dur)
    t = np.arange(n) / SR
    if check:
        env = _env(n, [(0, 0), (0.01, 1), (0.06, 0.8), (0.08, 0.15), (0.1, 0.9), (dur * 0.9, 0.7), (dur, 0)])
    else:
        ph = TAU * rate * t + r.uniform(0, TAU) + 1.5 * smooth_noise(n, r, 3.0)
        env = (0.25 + 0.75 * np.maximum(0, np.sin(ph)) ** 1.5) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.03, 0, 1)
    fr = bp(colored(n, r, 0.2), 1800, 8000, 1) * env
    fr += bp(colored(n, r, 0.6), 700, 2200, 1) * env * 0.4
    board = reson(fr, 320, 4) * 0.5
    return fades(fr + board, 0.003, 0.02)


def stopwatch(r):
    """stopwatch crown pressed: crisp metal click + a lighter release click + a tiny spring ring"""
    d = 0.25
    y = np.zeros(ns(d))
    for t0, f0, a in [(0.0, 4200, 1.0), (0.07, 3400, 0.5)]:
        c = modal(0.05, [(f0, 1.0, 0.003), (f0 * 1.45, 0.7, 0.002), (f0 * 0.42, 0.4, 0.006)], r)
        c += hp(r.standard_normal(ns(0.05)), 3500) * np.exp(-tt(0.05) / 0.0004) * 0.6
        _place_mono(y, c * a, t0)
    _place_mono(y, modal(0.15, [(6400, 1.0, 0.03), (8900, 0.4, 0.015)], r) * 0.12, 0.001)
    return y


def wood_knock(r, f0=190.0, tau=0.06, hard=1.0):
    """a wooden sign panel knocked / set down: board modes + click + low thump"""
    d = max(0.25, tau * 5)
    t = tt(d)
    y = modal(d, [(f0, 1.0, tau), (f0 * 2.31, 0.7, tau * 0.6), (f0 * 3.9, 0.45, tau * 0.4), (f0 * 6.1, 0.25, tau * 0.25)], r)
    y += hp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.001) * 0.5 * hard
    y += np.sin(phase(85 * (1 + 0.3 * np.exp(-t / 0.01)))) * np.exp(-t / 0.03) * 0.6 * hard
    return fades(y, 0.0003, 0.03)


def panel_lift(r):
    """the sign panel lifted off its posts: a knock, a short wooden scrape, a light rattle"""
    y = np.zeros(ns(0.55))
    _place_mono(y, wood_knock(r, 210, 0.04, 0.6) * 0.8, 0.0)
    _place_mono(y, creak(0.26, r, 160, 260, WOOD, [(0, 0), (0.3, 1), (1, 0)], 0.2, 0.08) * 0.5, 0.05)
    return y


def counter_tick(r, lock=False):
    """LED counter step: a small relay click + a faint electronic blip; the landing value 'locks' with a double click"""
    d = 0.06
    t = tt(d)
    f0 = r.uniform(2700, 3000)
    y = modal(d, [(f0, 1.0, 0.0025), (f0 * 1.9, 0.5, 0.0015)], r)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0004) * 0.5
    y += np.sign(np.sin(TAU * 1975 * t)) * np.exp(-t / 0.006) * 0.06
    if lock:
        y2 = np.zeros(ns(0.12))
        _place_mono(y2, y * 1.2, 0.0)
        _place_mono(y2, modal(0.08, [(1900, 1.0, 0.006), (3800, 0.5, 0.003)], r) * 0.9, 0.022)
        _place_mono(y2, np.sin(TAU * 1975 * tt(0.09)) * np.exp(-tt(0.09) / 0.03) * 0.1, 0.0)
        return y2
    return y


def cha_ching(r):
    """cash register: 'ka' (key lever + drawer clunk + coin jingle) then 'CHING' (bright two-tone bell)"""
    d = 1.4
    y = np.zeros(ns(d))
    ka = modal(0.25, [(170, 1.0, 0.05), (410, 0.8, 0.035), (930, 0.5, 0.02), (1700, 0.3, 0.01)], r)
    ka += lp(r.standard_normal(ns(0.25)), 1500) * np.exp(-tt(0.25) / 0.012) * 0.8
    _place_mono(y, ka, 0.0)
    coins = rattle(0.35, r, 70, np.exp(-np.linspace(0, 1, ns(0.35)) * 3), lo=2800, hi=7000, tau=(0.01, 0.04)) * 0.5
    _place_mono(y, coins, 0.03)
    tb = 0.09
    bell = modal(d - tb, [(2349.3, 1.0, 0.55), (2349.3 * 2.0, 0.3, 0.25), (2349.3 * 2.76, 0.35, 0.16), (2793.8, 0.6, 0.45),
                          (2793.8 * 2.76, 0.2, 0.12), (2349.3 * 5.4, 0.08, 0.05)], r)
    bell *= 1 - np.exp(-tt(d - tb) / 0.0006)
    bell *= 1 + 0.08 * np.sin(TAU * 6.5 * tt(d - tb))
    _place_mono(y, bell * 0.9, tb)
    return fades(y, 0.0003, 0.12)


def chalk_line(r, dur=0.5):
    """a chalk line drawn on the blueprint: soft gritty 'shhh' with tiny catches"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.04, 0, 1) * np.clip((dur - t) / 0.06, 0, 1) * (0.7 + 0.3 * smooth_noise(n, r, 9.0))
    y = bp(colored(n, r, 0.3), 1500, 6500, 1) * env
    gr = np.zeros(n)
    k = r.random(n) < 260 / SR
    gr[k] = r.uniform(0.2, 1.0, k.sum())
    y += bp(gr, 2000, 7000, 1) * env * 2.0
    return fades(y, 0.004, 0.02)


def chalk_write(r, dur, squeaks=3, dot_at=None):
    """chalk on a green board, fast writing: gritty strokes at ~14/s, a few squeals, a final 'tok' for the full stop"""
    n = ns(dur + 0.3)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur - 0.04:
        L = r.uniform(0.035, 0.075)
        s = chalk_line(r, L) * r.uniform(0.5, 1.0)
        _place_mono(y, s, tm)
        tm += L + r.uniform(0.005, 0.03)
    for k in range(squeaks):
        t0 = r.uniform(0.1, max(0.15, dur - 0.15))
        L = r.uniform(0.06, 0.11)
        tl = tt(L)
        f = r.uniform(2300, 3300) * (1 + 0.04 * np.sin(TAU * 38 * tl)) * (1 + r.uniform(-0.06, 0.06) * tl / L)
        sq = np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 0.7 * (0.7 + 0.3 * np.sign(np.sin(TAU * 90 * tl)))
        sq = bp(sq + 0.3 * np.sin(2 * phase(f)), 1800, 8000, 1)
        _place_mono(y, sq * 0.35, t0)
    if dot_at is not None:
        tok = modal(0.08, [(1700, 1.0, 0.006), (3100, 0.5, 0.003), (240, 0.6, 0.02)], r)
        tok += hp(r.standard_normal(ns(0.08)), 2000) * np.exp(-tt(0.08) / 0.0007) * 0.5
        _place_mono(y, tok * 1.3, dot_at)
    return y


def pops(r, times, f_lo=520, f_hi=1500):
    """the thief figures popping out: a spray of tiny cartoon pops"""
    span = max(times) + 0.15
    y = np.zeros((2, ns(span)))
    for i, tm in enumerate(times):
        p = pop(r, np.exp(r.uniform(np.log(f_lo), np.log(f_hi))), True, 0.07, 0.4) * r.uniform(0.45, 1.0)
        seg = pan(p, r.uniform(-0.75, 0.75))
        k = ns(tm)
        m = min(seg.shape[1], y.shape[1] - k)
        y[:, k:k + m] += seg[:, :m]
    return y


# ================================================================ the stamp
def stamp_fall(r, dur=0.14):
    """the giant stamp dropping the last few frames: a fast air swish that peaks on the impact"""
    return whoosh(dur + 0.02, r, dur, 260, 1500, 0.9, 0.012, 0.18)


def stamp_hit(r):
    """GIANT rubber stamp slams the sign: deep 'THOOM' + wooden block knock + rubber/ink 'thwap' + the panel and its
    posts ringing + grit shaken off"""
    d = 1.3
    n = ns(d)
    t = np.arange(n) / SR
    boom = np.sin(phase(58 * (1 + 0.55 * np.exp(-t / 0.03)))) * np.exp(-t / 0.2) * 2.2
    boom += np.sin(phase(116 * (1 + 0.4 * np.exp(-t / 0.02)))) * np.exp(-t / 0.08) * 0.6
    block = modal(d, [(165, 1.0, 0.07), (390, 0.8, 0.05), (720, 0.55, 0.035), (1180, 0.35, 0.02), (1900, 0.2, 0.012)], r) * 1.2
    nz = r.standard_normal(n)
    thwap = bp(nz, 250, 3200, 2) * np.exp(-t / 0.018) * 1.6
    smack = hp(nz, 1500) * np.exp(-t / 0.002) * 0.9
    panel = modal(d, [(132, 0.7, 0.18), (287, 0.5, 0.14), (515, 0.35, 0.1), (860, 0.2, 0.07)], r, glide=0.02)
    grit = rattle(0.4, r, 45, np.exp(-np.linspace(0, 1, ns(0.4)) * 3), lo=1500, hi=6000) * 0.35
    y = boom + block + thwap + smack + panel * 0.8
    _place_mono(y, grit, 0.03)
    return fades(y, 0.0, 0.2)


def stamp_lift(r):
    """the stamp pulled off the sign face: a sticky rubber 'thup' with a rising pitch"""
    d = 0.18
    t = tt(d)
    y = np.sin(phase(190 * (1 + 1.6 * (1 - np.exp(-t / 0.04))))) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.004))
    y += bp(r.standard_normal(len(t)), 400, 2500, 1) * np.exp(-t / 0.02) * 0.4
    return fades(y, 0.001, 0.03)


# ================================================================ storeroom
def bucket_ring(r, a=1.0):
    d = 0.6
    return modal(d, [(r.uniform(420, 470), 1.0, 0.14), (r.uniform(980, 1060), 0.7, 0.1), (r.uniform(1680, 1800), 0.45, 0.07),
                     (r.uniform(2700, 2900), 0.3, 0.05)], r) * a


def scoop(r, dur=0.55):
    """hands scooping rainbow chips off the pile and pouring them into the metal BAIT bucket"""
    n = ns(dur + 0.6)
    y = np.zeros(n)
    env = _env(ns(dur), [(0, 0), (0.06, 1), (0.25, 0.7), (dur, 0)])
    pile = rattle(dur, r, 110, env, lo=1300, hi=4800, tau=(0.004, 0.012)) * 0.8
    pile += bp(r.standard_normal(ns(dur)), 600, 4000, 1) * env * 0.12
    _place_mono(y, pile, 0.0)
    tp = dur * 0.55
    pour_env = _env(ns(0.35), [(0, 0), (0.03, 1), (0.35, 0)])
    pour = rattle(0.35, r, 140, pour_env, lo=1800, hi=5200, tau=(0.006, 0.02)) * 0.9
    _place_mono(y, pour, tp)
    hits = np.zeros(ns(0.35))
    k = r.random(len(hits)) < 60 / SR
    hits[k] = r.uniform(0.1, 1.0, k.sum()) * pour_env[k]
    ring = signal.fftconvolve(hits, bucket_ring(r, 1.0))[: ns(0.95)] * 0.25
    _place_mono(y, ring, tp)
    return y


def paper_rustle(r, dur=0.6, crisp=1.0):
    """letters and envelopes handled: crinkle crackles + soft paper body"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = _env(n, [(0, 0), (0.05, 1), (dur * 0.5, 0.6), (dur * 0.7, 0.9), (dur, 0)]) * (0.6 + 0.4 * smooth_noise(n, r, 12.0))
    gr = np.zeros(n)
    k = r.random(n) < 900 / SR
    gr[k] = r.uniform(0.1, 1.0, k.sum()) ** 2
    cr = bp(np.convolve(gr, r.standard_normal(40) * np.exp(-np.arange(40) / 8))[:n], 1800, 9500, 1) * env * 2.2 * crisp
    body = bp(colored(n, r, 0.6), 350, 2500, 1) * env * 0.45
    return fades(cr + body, 0.005, 0.03)


def mailbox_clunk(r):
    """metal mailbox flap snapping shut on a parcel: a sheet-metal clunk + a latch click + a low thud"""
    d = 0.7
    t = tt(d)
    y = modal(d, [(215, 1.0, 0.11), (470, 0.75, 0.08), (905, 0.5, 0.05), (1480, 0.35, 0.035), (2330, 0.2, 0.02)], r, glide=0.015)
    y += np.sin(phase(92 * (1 + 0.3 * np.exp(-t / 0.01)))) * np.exp(-t / 0.04) * 0.9
    y += hp(r.standard_normal(len(t)), 1500) * np.exp(-t / 0.0012) * 0.6
    latch = modal(0.06, [(3300, 1.0, 0.004), (5100, 0.5, 0.002)], r) * 0.6
    _place_mono(y, latch, 0.035)
    return fades(y, 0.0, 0.08)


# ================================================================ round 2: more life (feathers, whistles, tumbleweed, pats ...)
def wing_ruffle(r, flaps=2, dur_flap=0.07, gap=0.075, bright=1.0):
    """a raven shaking out / flapping its wings: soft feathery 'fwup' bursts with a little quill crackle"""
    n = ns(flaps * (dur_flap + gap) + 0.15)
    y = np.zeros(n)
    for k in range(flaps):
        L = dur_flap * r.uniform(0.85, 1.15)
        t = tt(L)
        env = np.sin(np.pi * np.clip(t / L, 0, 1)) ** 1.4 * np.exp(-t / (L * 0.8))
        body = bp(colored(len(t), r, 0.8), 180 * bright, 2400 * bright, 2) * env
        quill = np.zeros(len(t))
        q = r.random(len(t)) < 900 / SR
        quill[q] = r.uniform(0.2, 1.0, q.sum())
        quill = bp(quill, 2500, 8000, 1) * env * 1.2
        thump = np.sin(phase(np.full(len(t), r.uniform(90, 130)))) * env * 0.35
        _place_mono(y, (body + 0.35 * quill + thump) * (1.0 - 0.25 * k / max(1, flaps)), k * (dur_flap + gap) + r.uniform(0, 0.008))
    return fades(y, 0.002, 0.04)


def whistle(r, notes, breath=0.1, vib=5.5):
    """a short human whistle: notes = [(t, dur, f_start, f_end)] (each a pitch glide), breathy, light vibrato"""
    dur = max(t + d for t, d, _, _ in notes)
    y = np.zeros(ns(dur + 0.08))
    for (t0, d, fa, fb) in notes:
        tl = tt(d)
        u = tl / d
        f = fa * (fb / fa) ** (0.5 - 0.5 * np.cos(np.pi * np.clip(u * 1.25, 0, 1)))
        f = f * (1 + 0.006 * np.sin(TAU * vib * tl + r.uniform(0, TAU)))
        env = np.clip(u / 0.12, 0, 1) ** 1.5 * np.clip((1 - u) / 0.25, 0, 1) ** 1.2
        tone = np.sin(phase(f)) + 0.04 * np.sin(2 * phase(f))
        air = bp(r.standard_normal(len(tl)), 1200, 6000, 1) * breath
        _place_mono(y, (tone + air) * env, t0)
    return fades(y, 0.002, 0.03)


def twig_crackle(dur, r, density=180.0, env=None, lo=1500, hi=7500):
    """dry tumbleweed twigs scratching the ground: sparse crackles + a scratchy brush noise"""
    n = ns(dur)
    e = np.ones(n) if env is None else env[:n]
    g = np.zeros(n)
    k = r.random(n) < density / SR
    g[k] = r.uniform(0.1, 1.0, k.sum()) ** 2
    cr = bp(np.convolve(g, r.standard_normal(30) * np.exp(-np.arange(30) / 6))[:n], lo, hi, 1) * 2.0
    brush = bp(colored(n, r, 0.4), 900, 5000, 1) * (0.55 + 0.45 * smooth_noise(n, r, 14.0)) * 0.35
    return (cr + brush) * e


def tumble_roll(r, dur, contacts, fade=0.12):
    """a tumbleweed rolling past: continuous dry scratch (louder in the middle) + a soft twiggy bounce on each contact.
    contacts = times (s, relative to the start) where it touches down after a hop"""
    n = ns(dur + 0.3)
    t = np.arange(n) / SR
    env = np.clip(t / fade, 0, 1) * np.clip((dur - t) / fade, 0, 1)
    env = env * (0.35 + 0.65 * np.sin(np.pi * np.clip(t / max(dur, 1e-3), 0, 1)))
    y = twig_crackle(n / SR, r, 120.0, env)
    for tc in contacts:
        if -0.05 <= tc <= dur + 0.1:
            L = 0.12
            e2 = np.exp(-tt(L) / 0.03)
            b = twig_crackle(L, r, 1400.0, e2, 1200, 8000) * 1.6
            b += np.sin(phase(np.full(ns(L), r.uniform(110, 160)))) * np.exp(-tt(L) / 0.018) * 0.4
            sand = hp(r.standard_normal(ns(0.25)), 3500) * np.exp(-tt(0.25) / 0.07) * 0.35
            _place_mono(y, b, max(0.0, tc))
            _place_mono(y, sand, max(0.0, tc) + 0.01)
    return fades(y, 0.01, 0.06)


def woodblock_tick(r, f0=1250.0, vel=1.0):
    """a small dry woodblock tick (eye-dart accents)"""
    d = 0.14
    t = tt(d)
    y = modal(d, [(f0, 1.0, 0.03), (f0 * 1.58, 0.4, 0.016), (f0 * 2.29, 0.22, 0.009)], r)
    y *= 1 - np.exp(-t / 0.0004)
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0005) * 0.3
    return fades(y * vel, 0.0002, 0.03)


def drop_plip(r, f0=700.0):
    """cartoon sweat drop 'plip': a water-drop blip with a fast upward pitch sweep"""
    d = 0.09
    t = tt(d)
    f = f0 * (1 + 1.6 * (1 - np.exp(-t / 0.012)))
    y = np.sin(phase(f)) * np.exp(-t / 0.022) * (1 - np.exp(-t / 0.0015))
    return fades(y, 0.0002, 0.02)


def cloth_pat(r, weight=1.0):
    """a palm patting a pocket: muffled cloth thump + a little fabric swish"""
    d = 0.16
    t = tt(d)
    y = np.sin(phase(r.uniform(140, 190) * (1 + 0.3 * np.exp(-t / 0.006)))) * np.exp(-t / 0.018) * 0.9 * weight
    y += bp(r.standard_normal(len(t)), 300, 2500, 2) * np.exp(-t / 0.012) * 0.7
    y += bp(colored(len(t), r, 0.4), 1500, 6000, 1) * np.exp(-t / 0.03) * 0.25
    return fades(y, 0.0003, 0.03)


def chip_pocket(r, tick_at=0.12, dur=0.36, moves=2):
    """a small stone chip slipped into a shirt / hip pocket: cloth rustle, the chip ticks once against a coin inside"""
    y = rustle(r, dur, moves, 0.9, centers=[max(0.03, tick_at - 0.04), tick_at + 0.07][:moves])
    tick = lp(clink(r, r.uniform(2300, 3300), 0.06), 2200, 1) * 0.4
    _place_mono(y, tick, tick_at)
    return y


def stone_pick(r):
    """a chip lifted off the gravel: a tiny scrape and a light click"""
    y = np.zeros(ns(0.16))
    g = np.zeros(ns(0.05))
    k = r.random(len(g)) < 700 / SR
    g[k] = r.uniform(0.2, 1.0, k.sum())
    cr = bp(np.convolve(g, r.standard_normal(40) * np.exp(-np.arange(40) / 10))[: len(g)], 1500, 7500, 1) * 1.4
    _place_mono(y, cr * np.exp(-tt(0.05) / 0.02), 0.0)
    _place_mono(y, lp(clink(r, r.uniform(2600, 3600), 0.06), 5000, 1) * 0.45, 0.02)
    return fades(y, 0.001, 0.03)


def chip_putback(r):
    """a chip set back down on the gravel: a stone tick + a gravel crunch under it"""
    y = chip_place(r)
    g = np.zeros(ns(0.09))
    k = r.random(len(g)) < 900 / SR
    g[k] = r.uniform(0.2, 1.0, k.sum()) * np.exp(-np.flatnonzero(k) / SR / 0.035)
    cr = bp(np.convolve(g, r.standard_normal(50) * np.exp(-np.arange(50) / 12))[: len(g)], 900, 7000, 1) * 1.3
    _place_mono(y, cr, 0.006)
    return y


def gravel_scuff(r, dur=0.22, weight=1.0):
    """a sneaker scuffing / squatting on the gritty paving: a dragged crunch"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / 0.02, 0, 1) * np.exp(-t / (dur * 0.45))
    g = np.zeros(n)
    k = r.random(n) < 1100 / SR
    g[k] = r.uniform(0.1, 1.0, k.sum())
    cr = bp(np.convolve(g, r.standard_normal(40) * np.exp(-np.arange(40) / 9))[:n], 800, 7000, 1) * env * 2.2
    body = bp(colored(n, r, 0.5), 300, 2500, 1) * env * 0.25
    thud = np.sin(phase(np.full(n, r.uniform(80, 110)))) * np.exp(-t / 0.03) * 0.5
    return fades((cr + body + thud) * weight, 0.001, 0.03)


def chalk_tap(r, f0=None, soft=1.0):
    """a soft chalky 'puk' (a chalk figure's step on the blueprint floor / a chalk dot)"""
    d = 0.08
    t = tt(d)
    f0 = f0 or r.uniform(700, 900)
    y = modal(d, [(f0, 1.0, 0.008), (f0 * 2.4, 0.4, 0.004)], r) * 0.6
    y += bp(r.standard_normal(len(t)), 1500, 7000, 1) * np.exp(-t / 0.006) * 0.8 * soft
    y += np.sin(phase(np.full(len(t), 150.0))) * np.exp(-t / 0.012) * 0.25
    return fades(y, 0.0002, 0.02)


def chalk_stroke(r, L):
    """one quick chalk stroke (any length, even 15 ms): gritty band noise + catches, fast attack, soft lift"""
    n = max(ns(L), 32)
    t = np.arange(n) / SR
    env = np.clip(t / 0.005, 0, 1) * np.clip((L - t) / 0.008, 0, 1) * (0.75 + 0.25 * np.sin(TAU * r.uniform(30, 60) * t + r.uniform(0, TAU)))
    y = bp(colored(n, r, 0.3), 1500, 6500, 1) * env
    gr = np.zeros(n)
    k = r.random(n) < 300 / SR
    gr[k] = r.uniform(0.2, 1.0, k.sum())
    y += bp(gr, 2000, 7000, 1) * env * 2.0
    return fades(y, 0.002, 0.006)


def chalk_glyph_strokes(r, glyphs, squeak_on=()):
    """chalk writing synced per letter: glyphs = [(t0, t1, ch)] (relative s); each letter is drawn as 1-4 quick
    strokes (by the letter's shape) with tiny lifts; squeaks on the letters listed in squeak_on; a 'tok' for a full stop"""
    STROKES = {"H": 3, "A": 3, "L": 2, "F": 3, "T": 2, "I": 1, "S": 1, "C": 1, "E": 4, "D": 2, ".": 0}
    end = max(g[1] for g in glyphs) + 0.4
    y = np.zeros(ns(end))
    for i, (t0, t1, ch) in enumerate(glyphs):
        k = STROKES.get(ch, 2)
        if ch == ".":
            t0 = 0.5 * (t0 + t1)              # the dot is drawn over its glyph window: it shows (and taps) mid-window
            tok = modal(0.08, [(1700, 1.0, 0.006), (3100, 0.5, 0.003), (240, 0.6, 0.02)], r)
            tok += hp(r.standard_normal(ns(0.08)), 2000) * np.exp(-tt(0.08) / 0.0007) * 0.5
            _place_mono(y, tok * 1.3, t0)
            continue
        span = max(0.03, t1 - t0)
        for s in range(k):
            a = t0 + span * s / k
            L = max(0.018, span / k - r.uniform(0.004, 0.012))
            _place_mono(y, chalk_stroke(r, L) * r.uniform(0.6, 1.0), a)
        if i in squeak_on:
            L = min(0.11, max(0.05, span * 0.9))
            tl = tt(L)
            f = r.uniform(2300, 3200) * (1 + 0.04 * np.sin(TAU * 38 * tl)) * (1 + r.uniform(-0.06, 0.06) * tl / L)
            sq = np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 0.7 * (0.7 + 0.3 * np.sign(np.sin(TAU * 90 * tl)))
            sq = bp(sq + 0.3 * np.sin(2 * phase(f)), 1800, 8000, 1)
            _place_mono(y, sq * 0.3, t0 + 0.005)
    return y


def parcel_thump(r):
    """a taped parcel landing on the heap of rocks: hollow cardboard thud + rocks shifting under it + paper"""
    d = 0.9
    n = ns(d)
    t = np.arange(n) / SR
    box = modal(d, [(128, 1.0, 0.05), (265, 0.7, 0.035), (430, 0.45, 0.025), (720, 0.25, 0.015)], r, glide=0.04)
    box += lp(r.standard_normal(n), 1200) * np.exp(-t / 0.01) * 0.9
    box += np.sin(phase(70 * (1 + 0.4 * np.exp(-t / 0.01)))) * np.exp(-t / 0.05) * 0.8
    rocks = rattle(0.45, r, 60, np.exp(-np.linspace(0, 1, ns(0.45)) * 4), lo=900, hi=4200, tau=(0.006, 0.018)) * 0.55
    y = box
    _place_mono(y, rocks, 0.008)
    _place_mono(y, paper_rustle(r, 0.22, 0.8) * 0.35, 0.02)
    return fades(y, 0.0, 0.08)


def envelope_slap(r):
    """an envelope flopping onto the pile: a papery slap + crinkle"""
    d = 0.3
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 500, 5000, 2) * np.exp(-t / 0.012) * 1.2
    y += paper_rustle(r, d, 0.9)[: len(t)] * np.exp(-t / 0.08) * 0.6
    return fades(y, 0.0003, 0.04)


def brass_flap(r):
    """a brass mail-slot flap snapping open: bright metal clack + a tiny spring buzz"""
    d = 0.4
    t = tt(d)
    y = modal(d, [(1180, 1.0, 0.03), (2050, 0.7, 0.022), (3350, 0.5, 0.016), (4900, 0.3, 0.01), (620, 0.5, 0.04)], r)
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0008) * 0.7
    spring = np.sin(phase(np.full(len(t), 95.0)) + 2.0 * np.sin(TAU * 31 * t)) * np.exp(-t / 0.06) * 0.12
    return fades(y + spring, 0.0002, 0.04)


def air_swish(r, dur=0.6, lo=250, hi=1400):
    """the breeze passing the lens on a camera truck: soft broadband air swell (no tonal sweep, not a dissolve whoosh)"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    y = bp(colored(n, r, 0.9), lo, hi, 1) * env
    y += hp(colored(n, r, 0.2), 3500) * env ** 2 * 0.15
    return fades(y, 0.01, 0.05)


def hand_dust(r, n=2):
    """hands dusting off: quick palm-on-palm brushes"""
    y = np.zeros(ns(0.12 * n + 0.15))
    for k in range(n):
        L = 0.07
        tl = tt(L)
        e = np.sin(np.pi * tl / L) ** 1.2
        b = bp(colored(len(tl), r, 0.3), 900, 7000, 1) * e
        b += bp(r.standard_normal(len(tl)), 200, 1200, 1) * np.exp(-tl / 0.01) * 0.6
        _place_mono(y, b * (1.0 - 0.2 * k), k * 0.12)
    return fades(y, 0.001, 0.03)


def pen_tap(r):
    """a ballpoint tapped on a hardboard clipboard: a small hollow click"""
    d = 0.12
    t = tt(d)
    y = modal(d, [(1450, 1.0, 0.008), (3200, 0.5, 0.004), (320, 0.5, 0.02)], r)
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0005) * 0.5
    return fades(y, 0.0002, 0.02)


def brush_dab(r):
    """a tiny paint dab (the white dot on a marked chip): a wet soft 'tsk'"""
    d = 0.09
    t = tt(d)
    y = bp(colored(len(t), r, 0.2), 1800, 9000, 1) * np.exp(-t / 0.018) * (1 - np.exp(-t / 0.003))
    y += np.sin(phase(np.full(len(t), 420.0))) * np.exp(-t / 0.01) * 0.2
    return fades(y, 0.0005, 0.02)


def tiny_ting(r, f0=4200.0, tau=0.12):
    """the smallest glint 'ting' (a chip catching the sun)"""
    return ding(r, f0, tau, 0.35, dur=0.45, shimmer=False)


# ================================================================ round 3 (A2 audit): park life + small creatures
def crowd_murmur(n, r, voices=6, lo=170.0, hi=1150.0, density=1.0):
    """distant adult chatter (indistinct): `voices` talkers, each a breathy buzz source shaped by moving vowel formants
    and a syllable / phrase envelope, band-limited to `lo`..`hi` Hz so nothing is intelligible. Stereo (2, n)."""
    out = np.zeros((2, n))
    vowels = [(730, 1090), (530, 1840), (270, 2290), (570, 840), (440, 1020), (660, 1720), (300, 870)]
    T_ = np.arange(n) / SR
    for v in range(voices):
        f0 = r.uniform(105, 205) * (1 + 0.08 * smooth_noise(n, r, 0.6))
        ph = np.cumsum(f0) / SR
        src = (2 * (ph % 1.0) - 1) * 0.6 + 0.4 * colored(n, r, 0.5) * 0.3
        # syllables (0.11-0.24 s) in phrases of 0.8-2.6 s, pauses of 0.25-1.3 s
        env = np.zeros(n)
        f1 = np.zeros(n)
        f2 = np.zeros(n)
        t = r.uniform(0, 1.0)
        while t < n / SR:
            ph_end = t + r.uniform(0.8, 2.6) / density
            while t < ph_end and t < n / SR:
                d = r.uniform(0.11, 0.24)
                a, b = ns(t), min(n, ns(t + d))
                if b > a:
                    k = np.arange(b - a) / max(1, b - a)
                    env[a:b] = np.maximum(env[a:b], np.sin(np.pi * k) ** 0.8 * r.uniform(0.5, 1.0))
                    fv = vowels[int(r.integers(len(vowels)))]
                    f1[a:b], f2[a:b] = fv
                t += d + r.uniform(0.0, 0.05)
            t += r.uniform(0.25, 1.3)
        # hold the formants through the gaps (no jumps), then smooth them so they glide like speech
        for arr in (f1, f2):
            nz = np.flatnonzero(arr)
            if len(nz):
                arr[:] = np.interp(np.arange(n), nz, arr[nz])
            else:
                arr[:] = 600.0
        k = max(1, ns(0.03))
        f1s = np.convolve(f1, np.ones(k) / k, "same")
        f2s = np.convolve(f2, np.ones(k) / k, "same")
        y = shape(src, lambda Tq, Fq: (np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / np.interp(Tq, T_, f1s)[None, :]) / 0.28) ** 2)
                                       + 0.6 * np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / np.interp(Tq, T_, f2s)[None, :]) / 0.3) ** 2)), 2048, 512)
        y = y * np.convolve(env, np.ones(ns(0.01)) / ns(0.01), "same")
        y = y / (np.std(y) + 1e-12)
        out += pan(y, float(np.clip(-0.8 + 1.6 * (v + r.uniform(0, 1)) / voices, -0.85, 0.85)))
    out = bp(out, lo, hi, 2)
    # distance: a soft slap off the buildings / the parked cars
    d = ns(0.085)
    out[:, d:] += 0.25 * lp(out[:, :-d], 700, 1)
    return out


def car_door(r, far=1.0):
    """a car door closing far off in the parking lot: latch click, a heavy hollow thunk, a slap back off the buildings"""
    d = 0.7
    y = np.zeros(ns(d))
    t = tt(0.25)
    thunk = np.sin(phase(r.uniform(62, 78) * (1 + 0.35 * np.exp(-t / 0.012)))) * np.exp(-t / 0.05)
    body = bp(colored(len(t), r, 1.2), 120, 700, 2) * np.exp(-t / 0.035) * 0.8
    _place_mono(y, thunk + body, 0.012)
    latch = modal(0.05, [(2100, 1.0, 0.006), (3500, 0.5, 0.004)], r) * 0.25
    _place_mono(y, latch, 0.0)
    y = lp(y, 1800 / far, 2)
    echo = np.zeros_like(y)
    _place_mono(echo, lp(y, 900, 1) * 0.3, 0.16)
    return fades(y + echo, 0.001, 0.08)


def led_hum(n, r, mains=60.0):
    """a small outdoor LED display: rectifier buzz (2x mains harmonics, a little gritty), the multiplex whine, a faint
    flicker of the driver. Mono (n,)."""
    t = np.arange(n) / SR
    f = 2 * mains
    buzz = sum(np.sin(TAU * f * k * t + r.uniform(0, TAU)) / k ** 1.1 for k in range(1, 9))
    buzz = np.tanh(1.6 * buzz) * 0.7
    whine = np.sin(TAU * 1000.0 * t + 0.002 * np.cumsum(smooth_noise(n, r, 0.5))) * 0.08
    fl = 0.9 + 0.1 * smooth_noise(n, r, 3.0)
    y = bp(buzz, 100, 2600, 2) * fl + whine
    return y


def feather_flutter(r, n_puffs=3, dur=0.6):
    """loose feathers drifting down: a few airy swishes, each softer and longer than the last"""
    y = np.zeros(ns(dur + 0.2))
    tm = 0.0
    for k in range(n_puffs):
        L = r.uniform(0.07, 0.11) * (1 + 0.3 * k)
        t = tt(L)
        env = np.sin(np.pi * np.clip(t / L, 0, 1)) ** 1.6
        s = bp(colored(len(t), r, 0.6), 700 + 300 * r.random(), 3600, 1) * env * (1.0 - 0.25 * k)
        _place_mono(y, s, tm)
        tm += L + r.uniform(0.05, 0.12)
    return fades(y, 0.002, 0.05)


def engine_start(r, crank=0.42, idle=0.55, away=1.1, far=1.0):
    """a car starting far off in the parking lot (round 4 / A3 ADD): the starter motor grinds (gear whine, chugging on
    the compression strokes), the engine catches with a short rev, idles, then pulls away (rpm up, level down, the
    lowpass closing with the distance). Mono; t = 0 is the first starter chug."""
    d = crank + idle + away + 0.3
    n = ns(d)
    t = np.arange(n) / SR
    y = np.zeros(n)
    nc = ns(crank)
    tc = t[:nc]
    fw = 205 + 55 * tc / crank                                   # the starter's gear whine rises as it spins up
    whine = sum(np.sin(TAU * np.cumsum(fw * k) / SR + r.uniform(0, TAU)) / k ** 1.3 for k in range(1, 6))
    chug = np.maximum(0, np.sin(TAU * (9.0 + 3.0 * tc / crank) * tc)) ** 3       # compression strokes
    grind = bp(r.standard_normal(nc), 300, 2400, 1) * 0.35
    y[:nc] += (whine * 0.3 + grind) * (0.35 + 0.65 * chug) * np.sin(np.pi * np.clip(tc / 0.03, 0, 0.5))
    # firing frequency (4-cylinder: rpm / 30): catch -> a short rev -> idle -> pulling away
    k0 = crank
    rate = np.interp(t, [0, k0 - 0.01, k0 + 0.02, k0 + 0.16, k0 + 0.45, k0 + idle, k0 + idle + 0.5, d],
                     [0, 0, 22, 52, 27, 27, 46, 40])
    ph = TAU * np.cumsum(rate) / SR
    eng = sum(np.sin(k * ph + r.uniform(0, TAU)) * (1.0 / k ** 0.9) for k in range(1, 9))
    puffs = bp(r.standard_normal(n), 120, 1500, 1) * (0.5 + 0.5 * np.cos(ph)) ** 6 * 1.4
    lvl = np.interp(t, [0, k0 - 0.005, k0 + 0.03, k0 + 0.16, k0 + 0.45, k0 + idle, k0 + idle + away, d],
                    [0, 0, 0.9, 1.0, 0.55, 0.55, 0.0, 0.0])
    y += (eng * 0.5 + puffs) * lvl
    # distance: the farther it drives, the darker (a time-varying 1-pole lowpass, cutoff 1500 -> 450 Hz)
    fc = np.interp(t, [0, k0 + idle, k0 + idle + away], [1500 / far, 1500 / far, 450 / far])
    a = np.exp(-TAU * fc / SR)
    out = np.empty(n)
    s = 0.0
    for i in range(n):
        s = a[i] * s + (1 - a[i]) * y[i]
        out[i] = s
    return fades(hp(out, 35, 2), 0.004, 0.2)


def paper_flutter(r, env):
    """a small paper / card tag fluttering on its twine (round 4 / A3 ADD): sparse soft card ticks + a breath of air,
    both following env (0..1 at audio rate: the tag's swing speed). Mono, same length as env."""
    n = len(env)
    e = np.clip(np.asarray(env, float), 0, 1)
    air = bp(colored(n, r, 0.4), 900, 5200, 1) * e ** 1.5 * 0.22
    y = air
    dens = 70.0 * e                                               # ticks per second at full swing
    p = np.cumsum(dens) / SR
    hits = np.flatnonzero(np.diff(np.floor(p + r.uniform(0, 1))) > 0)
    for i in hits:
        L = ns(r.uniform(0.004, 0.009))
        c = bp(r.standard_normal(L), r.uniform(1800, 3000), r.uniform(5000, 7500), 1) * np.exp(-np.arange(L) / (L * 0.25))
        j = min(n - 1, i)
        seg = c[: n - j] * (0.35 + 0.65 * e[j]) * r.uniform(0.5, 1.0)
        y[j: j + len(seg)] += seg
    return fades(y, 0.004, 0.02)


# ================================================================ round 5 (A4 ADD): park life, animals, small props
def raven_kraa(r, dur=None, f0=None):
    """a raven's far 'kraa' (only for the vista ravens circling high; the sign raven stays silent): a rough, nasal,
    harmonic-rich call with a falling pitch, a throaty 60-80 Hz roughness and two broad formants. Mono."""
    d = dur or r.uniform(0.26, 0.34)
    n = ns(d)
    t = np.arange(n) / SR
    f = (f0 or r.uniform(330, 400)) * (1.04 - 0.12 * t / d) * (1 + 0.015 * smooth_noise(n, r, 25.0))
    ph = np.cumsum(f) / SR
    src = sum(np.sin(TAU * k * ph + r.uniform(0, TAU)) / k ** 0.75 for k in range(1, 22))
    rough = 1.0 + 0.55 * np.sin(TAU * r.uniform(58, 76) * t + r.uniform(0, TAU))
    y = src * rough + 0.5 * bp(colored(n, r, 0.3), 900, 3200, 1)
    y = resbank(y, [(r.uniform(1050, 1250), 2.5, 1.0), (r.uniform(1700, 1950), 3.5, 0.7), (2700, 5, 0.25)]) + 0.08 * y
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.55 * np.clip(t / 0.018, 0, 1)
    return fades(y * env, 0.004, 0.04)


def nighthawk_peent(r):
    """a common nighthawk's buzzy, nasal 'peent' at dusk (far): a ~75 Hz buzz on a nasal carrier near 2.6 kHz plus a
    3.6 kHz formant, 0.2 s, a slight downward bend. Mono."""
    d = r.uniform(0.18, 0.23)
    n = ns(d)
    t = np.arange(n) / SR
    fb = r.uniform(70, 85) * (1 - 0.06 * t / d)
    pulse = (np.sin(TAU * np.cumsum(fb) / SR) > 0.6).astype(float)
    car = np.sin(TAU * np.cumsum(r.uniform(2550, 2750) * (1.03 - 0.06 * t / d)) / SR)
    y = car * (0.35 + 0.65 * lp(pulse, 900, 1)) + 0.25 * resbank(bp(colored(n, r, 0.0), 2000, 5000, 1), [(3600, 6, 1.0)])
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7 * np.clip(t / 0.012, 0, 1)
    return fades(y * env, 0.003, 0.03)


def cicada_drone(n, r, voices=2, f_lo=4300, f_hi=5900):
    """Arizona-noon cicadas far off: narrow buzzing noise bands (4.3-5.9 kHz) with a fast ~38 Hz pulse, each voice
    swelling in and out over 5-11 s phrases. Stereo (2, n)."""
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    for v in range(voices):
        fc = r.uniform(f_lo, f_hi)
        nz = bp(colored(n, r, 0.0), fc * 0.92, fc * 1.08, 2)
        pulse = 0.55 + 0.45 * np.sin(TAU * r.uniform(34, 42) * t + r.uniform(0, TAU))
        ph_len = r.uniform(5.0, 11.0)
        sw = np.clip(0.5 + 0.8 * np.sin(TAU * t / ph_len + r.uniform(0, TAU)), 0, 1) ** 1.5
        y = nz * pulse * (0.15 + 0.85 * sw)
        out += pan(y / (np.std(y) + 1e-12), r.uniform(-0.7, 0.7))
    return out


def flag_snap(r, n_snaps=None):
    """a nylon flag snapping in a strong gust: 2-3 quick 'fwap' cracks (a 15-30 ms fabric slap with a soft 300 Hz
    body) and a flutter between them. Mono."""
    k = n_snaps or int(r.integers(2, 4))
    y = np.zeros(ns(0.8))
    tm = 0.0
    for j in range(k):
        L = r.uniform(0.016, 0.03)
        tl = tt(L)
        crack = bp(colored(len(tl), r, 0.2), 700, 4800, 1) * np.exp(-tl / (L * 0.35))
        body = np.sin(TAU * r.uniform(260, 340) * tl) * np.exp(-tl / 0.012) * 0.4
        _place_mono(y, (crack + body) * (1.0 - 0.2 * j), tm)
        nf = ns(0.09)
        fl = bp(colored(nf, r, 0.5), 400, 2500, 1) * np.sin(np.pi * np.linspace(0, 1, nf)) ** 2 * 0.18
        _place_mono(y, fl, tm + L)
        tm += r.uniform(0.11, 0.2)
    return fades(y[: ns(tm + 0.12)], 0.002, 0.04)


def ooh_crowd(r, dur=0.55, voices=5, vowel=((310, 870), (450, 820))):
    """a soft, non-verbal multi-voice 'ooh' (impressed / amused murmur) from a few adults, no words: each voice a breathy
    buzz gliding up then down, 'oo' -> 'oh' formants, staggered 0-60 ms. Stereo (2, n)."""
    n = ns(dur + 0.1)
    out = np.zeros((2, n))
    for v in range(voices):
        d = dur * r.uniform(0.75, 1.0)
        m = ns(d)
        t = np.arange(m) / SR
        f0 = r.uniform(115, 215) * (1 + 0.07 * np.sin(np.pi * np.clip(t / d, 0, 1)) - 0.05 * t / d)
        ph = np.cumsum(f0) / SR
        src = (2 * (ph % 1.0) - 1) * 0.7 + 0.5 * colored(m, r, 0.4) * 0.25
        a = resbank(src, [(vowel[0][0], 5, 1.0), (vowel[0][1], 7, 0.5), (2500, 8, 0.08)])
        b = resbank(src, [(vowel[1][0], 5, 1.0), (vowel[1][1], 7, 0.5), (2500, 8, 0.08)])
        u = np.clip(t / d, 0, 1)
        y = a * (1 - u) + b * u
        env = np.sin(np.pi * u) ** 0.9 * r.uniform(0.6, 1.0)
        y = y * env / (np.std(y) + 1e-12)
        seg = np.zeros(n)
        _place_mono(seg, y, r.uniform(0.0, 0.06))
        out += pan(seg, float(np.clip(-0.7 + 1.4 * (v + r.uniform(0, 1)) / voices, -0.8, 0.8)))
    return fades(lp(out, 2400, 2), 0.01, 0.06)


def strap_jingle(r, n_hits=None, dur=0.35):
    """camera-strap buckles / a lanyard jingling as tourists squat: a few tiny bright clinks. Mono."""
    k = n_hits or int(r.integers(3, 6))
    y = np.zeros(ns(dur + 0.15))
    for j in range(k):
        c = clink(r, r.uniform(3600, 6200), 0.05, 0.9) * r.uniform(0.35, 1.0)
        _place_mono(y, c, r.uniform(0, dur))
    return fades(y, 0.002, 0.03)


def flash_whine(r, dur=0.42):
    """a compact camera flash recharging after the shot: a thin rising whine 3.4 -> 7.8 kHz, fading in and out. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 3400 + 4400 * (t / dur) ** 0.7
    y = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    y += 0.25 * np.sin(TAU * np.cumsum(2 * f) / SR) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return fades(y, 0.01, 0.06)


def card_flick(r):
    """a small card tag flicking over (2 frames): a crisp paper snap + a breath of air. Mono."""
    L = 0.07
    t = tt(L)
    snap = bp(colored(len(t), r, 0.1), 1500, 7500, 1) * np.exp(-t / 0.006)
    air = bp(colored(len(t), r, 0.6), 600, 3000, 1) * np.sin(np.pi * np.clip(t / L, 0, 1)) ** 2 * 0.2
    return fades(snap + air, 0.001, 0.02)


def chair_creak(r, dur=0.32):
    """a pupil shifting on a wooden school chair: a short creak + a soft seat knock. Mono."""
    y = creak(dur, r, r.uniform(140, 190), r.uniform(220, 300), WOOD, [(0, 0), (0.2, 1), (0.75, 0.6), (1, 0)], 0.2, 0.06, r.uniform(0.9, 1.15))
    k = wood_knock(r, r.uniform(200, 260), 0.03, 0.25) * 0.35
    out = np.zeros(max(len(y), len(k)))
    out[: len(y)] += y
    out[: len(k)] += k
    return out


def pencil_scratch(r, dur=0.3):
    """a pupil's pencil on paper (softer and grainier than the ballpoint): graphite friction strokes. Mono."""
    return lp(pen_scratch(r, dur, r.uniform(6.0, 9.0)), 6500, 1)


def lamp_hum(n, r, mains=60.0):
    """a desk lamp's filament / dimmer hum: 120 Hz + harmonics with a faint 3 kHz singing. Mono (n,)."""
    t = np.arange(n) / SR
    f = 2 * mains
    y = sum(np.sin(TAU * f * k * t + r.uniform(0, TAU)) / k ** 1.4 for k in range(1, 7))
    y = bp(y, 100, 1500, 1) + 0.025 * np.sin(TAU * 3000.0 * t + 0.003 * np.cumsum(smooth_noise(n, r, 0.4)))
    return y * (0.92 + 0.08 * smooth_noise(n, r, 0.7))


def lantern_hiss(n, r):
    """a camping lantern's soft burner hiss / roar (the lantern on the storeroom floor). Mono (n,)."""
    h = bp(colored(n, r, 0.3), 1800, 7000, 1) * 0.5 + lp(colored(n, r, 1.5), 260, 2) * 0.6
    return h * (0.85 + 0.15 * smooth_noise(n, r, 1.5))


def rock_settle(r, dur=0.22):
    """a few petrified-wood chips sliding / settling on the pile after a scoop bites it. Mono."""
    env = np.exp(-np.linspace(0, 1, ns(dur)) * 3.0)
    return rattle(dur, r, 45, env, lo=1100, hi=4200, tau=(0.004, 0.01))


def dust_puff(r, dur=0.14):
    """a tiny chalk-dust puff: a soft breathy burst. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(colored(n, r, 0.5), 900, 5200, 1) * np.clip(t / 0.006, 0, 1) * np.exp(-t / 0.045)
    return fades(y, 0.002, 0.03)


def grid_shimmer(n, r, env):
    """the blueprint's paper-grid shimmer while lines draw: a soft band of airy noise (2.5-7 kHz) with slow sparkle.
    env = per-sample 0..1 (draw activity). Mono (n,)."""
    e = np.clip(np.asarray(env, float), 0, 1)
    sp = 0.6 + 0.4 * smooth_noise(n, r, 5.0)
    return bp(colored(n, r, 0.2), 2500, 7000, 1) * sp * e


# ================================================================ round 6 (A5): new voices
def reveal_shimmer(r):
    """A5 P2: the thought bubble is REVEALED full-size by the camera tilt (no on-screen pop): a soft airy 'bloop' + a tiny
    high twinkle, gentler than a pop. Mono."""
    y = pop(r, 360.0, True, 0.15, 0.8) * 0.55
    tw = ding(r, 2637.0, 0.12, 0.5, dur=0.32, shimmer=False) * 0.4
    out = np.zeros(max(len(y), len(tw) + ns(0.02)))
    out[: len(y)] += y
    _place_mono(out, tw, 0.02)
    return fades(out, 0.001, 0.05)


def chuckle(r, n=2, f0=None, gap=0.15):
    """a dry, short wordless adult 'heh-heh' (the red-cap tourist's laugh): each syllable an /h/ breath into a short
    voiced /e/ (formants ~530 / 1840 / 2480 Hz) with a falling pitch, the second softer and lower. Mono."""
    f0 = f0 or r.uniform(128, 148)
    out = np.zeros(ns(n * gap + 0.2))
    for k in range(n):
        d = r.uniform(0.075, 0.09)
        m = ns(d)
        t = np.arange(m) / SR
        f = f0 * (1.06 - 0.12 * t / d) * (1 - 0.05 * k)
        ph = np.cumsum(f) / SR
        voiced = sum(np.sin(TAU * j * ph) / j ** 1.1 for j in range(1, 30))
        u = np.clip(t / d, 0, 1)
        breath = bp(colored(m, r, 0.2), 900, 4000, 1) * np.exp(-t / 0.018) * 1.2
        src = voiced * np.clip((t - 0.012) / 0.012, 0, 1) + breath
        y = resbank(src, [(530, 6, 1.0), (1840, 9, 0.45), (2480, 11, 0.25)])
        env = np.sin(np.pi * u) ** 0.6 * np.exp(-t / 0.08)
        y = y * env / (np.max(np.abs(y)) + 1e-12) * (1.0 - 0.35 * k)
        _place_mono(out, y, k * gap + r.uniform(0, 0.01))
    return fades(lp(out, 3400, 2), 0.002, 0.04)


def owl_hoot(r, n=2, f0=None):
    """a far great-horned-owl style 'hoo-hoo' heard through the night window: soft low hooted sines (~330-360 Hz) with
    a breathy edge, a slight downward bend, the second note shorter. Mono."""
    f0 = f0 or r.uniform(320, 360)
    out = np.zeros(ns(0.7))
    tm = 0.0
    for k in range(n):
        d = 0.2 if k == 0 else 0.13
        m = ns(d)
        t = np.arange(m) / SR
        f = f0 * (1.0 - 0.06 * t / d) * (1 - 0.03 * k)
        y = np.sin(phase(f)) + 0.12 * np.sin(2 * phase(f)) + 0.08 * bp(colored(m, r, 0.4), 250, 1200, 1)
        env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
        _place_mono(out, y * env * (1.0 if k == 0 else 0.7), tm)
        tm += d + 0.06
    return fades(out, 0.005, 0.08)


def sand_gust(r, dur, peak, hiss=0.5):
    """A5 P3: the whip pan as a light wind gust + blowing sand hiss (no tonal whoosh): broadband air swelling to
    `peak` s and dying at `dur`, sand grains riding the top of the swell. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    pk = max(0.02, min(peak, dur - 0.02))
    env = np.where(t < pk, (t / pk) ** 1.6, np.clip((dur - t) / max(1e-3, dur - pk), 0, 1) ** 1.3)
    air = lp(hp(colored(n, r, 1.0), 150, 2), 1600, 2) * env
    gr = np.zeros(n)
    k = r.random(n) < 2200 / SR
    gr[k] = r.uniform(0.2, 1.0, k.sum())
    sand = bp(gr, 3000, 9000, 1) * env ** 2 * hiss * 3.0
    sand += hp(colored(n, r, 0.1), 4000) * env ** 2.5 * hiss * 0.3
    return fades(air + sand, 0.006, 0.02)


def chalk_crowd(n, r, rate=11.0):
    """A5 ADD: the EVERYONE ELSE chalk crowd walking: many soft chalk-foot taps blurred into a papery shuffle (dense,
    random, low-passed), stereo (2, n), unit-ish level."""
    out = np.zeros((2, n))
    tm = r.uniform(0, 0.05)
    while tm < n / SR - 0.05:
        seg = chalk_tap(r, r.uniform(650, 1100), 0.5) * r.uniform(0.3, 1.0)
        p_ = r.uniform(-0.8, 0.8)
        i = ns(tm)
        b = min(n, i + len(seg))
        out[0, i:b] += seg[: b - i] * np.cos((p_ + 1) * np.pi / 4)
        out[1, i:b] += seg[: b - i] * np.sin((p_ + 1) * np.pi / 4)
        tm += r.exponential(1.0 / rate)
    out = lp(out, 4500, 2)
    sh = bp(colored(n, r, 0.4), 1200, 5000, 1) * (0.5 + 0.5 * smooth_noise(n, r, 6.0)) * 0.04
    return out + np.stack([sh, sh[::-1]])


def chalk_snap(r):
    """a tiny chalk snap / crumble on a hard full stop: a dry high click + a few grains. Mono."""
    c = modal(0.05, [(r.uniform(3800, 4400), 1.0, 0.002), (r.uniform(2200, 2600), 0.6, 0.004)], r)
    c += hp(r.standard_normal(ns(0.05)), 3000) * np.exp(-tt(0.05) / 0.0005) * 0.6
    y = np.zeros(ns(0.12))
    _place_mono(y, c, 0.0)
    for k in range(3):
        _place_mono(y, chalk_tap(r, r.uniform(1500, 2200), 0.4) * 0.18, 0.015 + 0.012 * k)
    return fades(y, 0.0003, 0.03)


def spring_rattle(r, dur=0.06):
    """the split-flap box's tiny spring / card rattle right after the lock card. Mono."""
    env = np.exp(-np.linspace(0, 1, ns(dur)) * 4.0)
    return rattle(dur, r, 260, env, lo=2200, hi=6000, tau=(0.002, 0.005))


def bulb_swing(r, dur=1.5, mains=60.0):
    """the hanging bulb swinging after the parcel lands: a short mains-hum swell that waxes and wanes with the swing
    (~1.3 Hz) and decays over `dur`. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    h = lamp_hum(n, r, mains)
    env = (0.35 + 0.65 * np.abs(np.sin(np.pi * 1.3 * t))) * np.exp(-t / (dur * 0.4)) * np.clip(t / 0.05, 0, 1)
    return fades(h * env, 0.01, 0.15)


# ================================================================ round 7 (A6): new voices
def heap_thump(r, dur=0.9):
    """A6 LEAD P2: the cartoon heap of petrified chips lands - a big comic BOOMF: a deep pitched thump gliding 62 -> 38 Hz,
    a squashy mid 'whump' (body 140-260 Hz), a low rumble tail and a soft dust 'poof'. Mono, unit-ish."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 38.0 + 24.0 * np.exp(-t / 0.05)
    y = np.sin(phase(f)) * np.exp(-t / 0.2) * (1 - np.exp(-t / 0.003))
    y += np.sin(phase(150.0 + 110.0 * np.exp(-t / 0.02))) * np.exp(-t / 0.06) * 0.55
    y += lp(colored(n, r, 1.8), 160, 2) * np.exp(-t / 0.28) * 1.4 * np.clip(t / 0.01, 0, 1)
    y += bp(r.standard_normal(n), 300, 2000, 1) * np.exp(-((t - 0.035) / 0.05) ** 2) * 0.25
    return fades(y, 0.0005, 0.12)


def heap_clatter(r, dur=0.75, n_hits=46):
    """...the chips spill and clatter off the heap: a dense burst of small stone clinks thinning out. Mono."""
    y = np.zeros(ns(dur + 0.1))
    for k in range(n_hits):
        u = (k / n_hits) ** 1.7
        tm = 0.004 + u * dur * 0.92 + r.uniform(0, 0.012)
        c = clink(r, np.exp(r.uniform(np.log(1400), np.log(4600))), 0.07, 0.8) * (1.0 - 0.75 * u) * r.uniform(0.35, 1.0)
        _place_mono(y, c, tm)
    y += lp(bp(colored(len(y), r, 0.6), 700, 3000, 1), 3500, 1) * np.exp(-np.arange(len(y)) / SR / 0.12) * 0.08
    return fades(y, 0.0005, 0.05)


def ka_thunk(r):
    """A6 P1: the cash register's 'ka-' - the drawer / relay clunk ON the counter landing, kept BELOW 800 Hz (it lands on
    'eight'). Mono."""
    d = 0.3
    t = tt(d)
    y = modal(d, [(120, 1.0, 0.05), (210, 0.8, 0.04), (390, 0.55, 0.03), (640, 0.25, 0.018)], r)
    y += lp(r.standard_normal(len(t)), 700, 2) * np.exp(-t / 0.014) * 0.7
    y += np.sin(phase(72.0 * (1 + 0.3 * np.exp(-t / 0.01)))) * np.exp(-t / 0.05) * 0.5
    return lp(fades(y, 0.0003, 0.05), 800, 4)


def ching(r, d=1.6):
    """A6 P1: the register bell alone ('CHING'), natural two-tone ring + a few coins settling. Mono."""
    bell = modal(d, [(2349.3, 1.0, 0.6), (2349.3 * 2.0, 0.3, 0.27), (2349.3 * 2.76, 0.32, 0.17), (2793.8, 0.6, 0.5),
                     (2793.8 * 2.76, 0.18, 0.13), (2349.3 * 5.4, 0.07, 0.05)], r)
    t = tt(d)
    bell *= (1 - np.exp(-t / 0.0006)) * (1 + 0.08 * np.sin(TAU * 6.5 * t))
    coins = rattle(0.3, r, 50, np.exp(-np.linspace(0, 1, ns(0.3)) * 3), lo=2800, hi=7000, tau=(0.008, 0.03)) * 0.25
    _place_mono(bell, coins, 0.012)
    return fades(bell, 0.0003, 0.15)


def tag_ding(r, f0=4698.6, body=1174.7, body_db=-13.0, tau=0.24, dur=0.8):
    """A6 P1: the tag's bright ding moved up an octave (D8 4699 Hz, above the consonant band of 'twice') with a soft
    D6 body at body_db and a little sparkle. Mono."""
    t = tt(dur)
    y = modal(dur, [(f0, 1.0, tau), (f0 * 2.0, 0.12, tau * 0.4), (body, 10 ** (body_db / 20), tau * 0.9)], r)
    y *= (1 - np.exp(-t / 0.0006)) * (1 + 0.1 * np.sin(TAU * 7.5 * t))
    for k in range(3):
        _place_mono(y, modal(0.12, [(r.uniform(6500, 9000), 1.0, 0.03)], r) * r.uniform(0.12, 0.25), 0.02 + 0.03 * k)
    return fades(y, 0.0003, 0.1)


def chirp(r, f0, f1, dur=0.085, vib=0.0):
    """A6 P2: an innocent whistle chirp as a nearly pure tone gliding f0 -> f1 (1.8-2.6 kHz, above the voice formants).
    Mono."""
    t = tt(dur)
    u = t / dur
    f = f0 * (f1 / f0) ** (0.5 - 0.5 * np.cos(np.pi * np.clip(u * 1.15, 0, 1)))
    f = f * (1 + vib * np.sin(TAU * 6.0 * t))
    env = np.clip(u / 0.15, 0, 1) ** 1.5 * np.clip((1 - u) / 0.3, 0, 1)
    y = (np.sin(phase(f)) + 0.03 * np.sin(2 * phase(f))) * env
    y += bp(r.standard_normal(len(t)), 1500, 4000, 1) * env * 0.04
    return fades(y, 0.002, 0.01)


def pip(r, f0=1320.0):
    """A6 ADD: a tiny cartoon 'pip!' sting for a '!' card: a quick up-flick + a glassy tick. Mono."""
    d = 0.16
    t = tt(d)
    f = f0 * (1 + 0.65 * (1 - np.exp(-t / 0.012)))
    y = np.sin(phase(f)) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.001))
    y += modal(d, [(f0 * 3.02, 0.25, 0.02)], r)
    return fades(y, 0.0003, 0.03)


def gasp(r, dur=0.24, f_sh=1.0):
    """A6 ADD: a wordless sharp inhale ('hh-UH') - breath noise through rising vowel formants, a quick stop. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    src = colored(n, r, 0.6)
    y = np.zeros(n)
    for fa, fb, g in ((620, 820, 1.0), (1150, 1350, 0.7), (2500, 2700, 0.35)):
        seg = np.zeros(n)
        for k in range(8):                                     # piecewise resonance (a slow formant glide)
            a, b = k * n // 8, (k + 1) * n // 8
            fc = (fa + (fb - fa) * (k + 0.5) / 8) * f_sh
            seg[a:b] = reson(src, float(fc), 6.0)[a:b]
        y += seg * g
    env = np.clip(u / 0.55, 0, 1) ** 1.6 * np.clip((1 - u) / 0.12, 0, 1)
    return fades(hp(y * env, 250, 2), 0.004, 0.02)


def paper_sigh(r, dur=0.35):
    """A6 ADD: a soft paper 'sigh' - one sheet sliding / lifting (slow, airy, no crackle). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    y = bp(colored(n, r, 0.5), 900, 6500, 1) * env
    y += bp(r.standard_normal(n), 2500, 7000, 1) * env ** 3 * 0.25
    return fades(y, 0.005, 0.03)


def rubber_snap(r):
    """A6 ADD: a rubber band snapping on a parcel: a tight 'thwip' twang dropping in pitch + a slap. Mono."""
    d = 0.18
    t = tt(d)
    y = np.sin(phase(260 * (1 + 0.6 * np.exp(-t / 0.01)))) * np.exp(-t / 0.035) * 0.8
    y += bp(r.standard_normal(len(t)), 1200, 6000, 1) * np.exp(-t / 0.003) * 0.9
    y += np.sin(phase(130 * np.ones(len(t)))) * np.exp(-t / 0.02) * 0.3
    return fades(y, 0.0002, 0.03)


def relay_click(r, buzz=0.06, mains=60.0):
    """A6 P3: a soft relay click + a short filament buzz (a lamp switching on). Mono."""
    d = 0.05 + buzz + 0.03
    t = tt(d)
    y = modal(d, [(2400, 0.6, 0.004), (5200, 0.3, 0.002), (900, 0.5, 0.006)], r)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0005) * 0.5
    hz = np.sign(np.sin(TAU * 2 * mains * t)) * 0.3 + np.sin(TAU * 2 * mains * t) * 0.5
    hz = lp(hz, 2500, 2) * np.clip((t - 0.008) / 0.01, 0, 1) * np.clip((0.008 + buzz - t) / 0.025, 0, 1) * 0.35
    return fades(y + hz, 0.0002, 0.02)


def glass_tink(r, f0=4500.0, dur=0.08):
    """A6 P3: a tiny high glassy 'tink' (4-5 kHz, 80 ms). Mono."""
    y = modal(dur, [(f0, 1.0, 0.018), (f0 * 2.31, 0.3, 0.008)], r)
    y += hp(r.standard_normal(len(y)), 5000) * np.exp(-tt(dur) / 0.0004) * 0.3
    return fades(y, 0.0002, 0.015)


def slot_knock(r, f0=330.0, hard=1.0):
    """A6 (WORLD-INT mail slot): the brass flap jolted from outside - a dull knock with a little metal rattle. Mono."""
    d = 0.14
    t = tt(d)
    y = modal(d, [(f0, 1.0, 0.03), (f0 * 2.7, 0.45 * hard, 0.012), (f0 * 6.1, 0.25 * hard, 0.006)], r)
    y += lp(r.standard_normal(len(t)), 1800, 2) * np.exp(-t / 0.006) * 0.5
    y += np.pad(rattle(0.05, r, 200, np.exp(-np.linspace(0, 1, ns(0.05)) * 4), lo=2000, hi=5000, tau=(0.002, 0.005)), (0, len(t) - ns(0.05)))[: len(t)] * 0.12 * hard
    return fades(y, 0.0003, 0.03)


def pencil_drop(r):
    """A6 ADD: a pencil dropped on a wooden desk: a hollow tick + two small bounces + a short roll. Mono."""
    y = np.zeros(ns(0.45))
    for k, (tm, a) in enumerate(((0.0, 1.0), (0.11, 0.45), (0.19, 0.22))):
        c = modal(0.08, [(r.uniform(1700, 2100), 1.0, 0.012), (r.uniform(3800, 4400), 0.5, 0.006), (420, 0.4, 0.02)], r)
        c += hp(r.standard_normal(len(c)), 3000) * np.exp(-tt(0.08) / 0.0004) * 0.4
        _place_mono(y, c * a, tm)
    roll = bp(colored(ns(0.18), r, 0.4), 600, 3000, 1) * np.linspace(0.12, 0, ns(0.18)) * (0.7 + 0.3 * np.sin(TAU * 24 * tt(0.18)))
    _place_mono(y, roll, 0.24)
    return fades(y, 0.0003, 0.03)


def desk_scrape(r, dur=0.2):
    """A6 ADD: a desk / chair leg scraping the wooden floor a little. Mono."""
    return lp(creak(dur, r, 140, 210, WOOD, None, 0.25, 0.08, 0.8), 3000, 2)


def paper_boil(n, r, rate=60.0):
    """A6 ADD: the 'boiling' chalk crowd - a faint papery crackle texture (sparse soft crackles, 1-4 kHz). Stereo."""
    out = np.zeros((2, n))
    for ch in range(2):
        g = np.zeros(n)
        k = r.random(n) < rate / SR
        g[k] = r.uniform(0.1, 1.0, k.sum()) ** 2
        c = bp(np.convolve(g, r.standard_normal(40) * np.exp(-np.arange(40) / 9))[:n], 900, 4200, 1)
        out[ch] = c + bp(colored(n, r, 0.5), 700, 3000, 1) * 0.04
    return out


def far_vehicle(r, dur, far=1.0):
    """A6 (WORLD-EXT shot 2): a far pickup driving on a gravel road: a low engine drone with a gentle gear swell,
    tyre-on-gravel hiss, all distant (low-passed). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 46.0 * (1 + 0.12 * np.clip(t / dur, 0, 1)) * (1 + 0.01 * smooth_noise(n, r, 2.0))
    eng = np.sin(phase(f)) + 0.6 * np.sin(2 * phase(f) + 0.3) + 0.35 * np.sin(3 * phase(f) + 1.1) + 0.2 * np.sin(5 * phase(f))
    eng *= 0.8 + 0.2 * smooth_noise(n, r, 6.0)
    grav = bp(colored(n, r, 0.6), 500, 2500, 1) * (0.6 + 0.4 * smooth_noise(n, r, 9.0)) * 0.35
    y = lp(eng * 0.5 + grav, 1600 / far, 2)
    env = np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
    return fades(y * env, 0.01, 0.05)


def chain_creak(r):
    """A6 ADD: the TRAIL OPEN plate's little chain on its biggest swing - a soft metal squeak + two link clinks. Mono."""
    y = np.zeros(ns(0.4))
    sq = creak(0.22, r, 520, 700, WOOD, None, 0.08, 0.02, 1.4)
    _place_mono(y, lp(sq, 6000, 1) * 0.6, 0.0)
    for k, tm in enumerate((0.05, 0.19)):
        _place_mono(y, clink(r, r.uniform(2600, 3600), 0.06, 0.6) * (0.5 - 0.15 * k), tm)
    return fades(y, 0.001, 0.04)


def pocket_snap(r):
    """A6 ADD: a pocket snap / short zip accent (the shot-10 group pocketing): a tiny zip burr then a press-stud click.
    Mono."""
    y = np.zeros(ns(0.2))
    z = bp(r.standard_normal(ns(0.07)), 1800, 6000, 1) * (0.6 + 0.4 * np.sign(np.sin(TAU * 140 * tt(0.07)))) * np.linspace(0.3, 1, ns(0.07)) * 0.5
    _place_mono(y, z, 0.0)
    _place_mono(y, modal(0.05, [(3100, 1.0, 0.006), (1250, 0.5, 0.01)], r), 0.08)
    return fades(y, 0.0005, 0.02)


# ================================================================ round 8 (A7 ADD)
def hawk_scream(r, dur=None):
    """a far red-tailed hawk 'kee-eeeer' (the Southwest park call): a hoarse, harmonic-rich scream that rises briefly and
    falls ~3.2 -> 2.1 kHz, rough (~90 Hz AM) with breathy noise, a soft attack and a long fading tail. Mono."""
    d = dur or r.uniform(1.05, 1.3)
    n = ns(d)
    t = np.arange(n) / SR
    u = t / d
    f = r.uniform(2900, 3150) * (1.0 + 0.06 * np.sin(np.pi * np.clip(u / 0.18, 0, 1)) - 0.34 * np.clip((u - 0.12) / 0.88, 0, 1) ** 1.3)
    f *= 1 + 0.012 * smooth_noise(n, r, 18.0)
    ph = np.cumsum(f) / SR
    src = np.sin(TAU * ph) + 0.45 * np.sin(2 * TAU * ph + 0.4) + 0.18 * np.sin(3 * TAU * ph + 1.3)
    rough = 1.0 + 0.6 * np.sin(TAU * r.uniform(82, 98) * t + r.uniform(0, TAU))
    hiss = bp(colored(n, r, 0.2), 1800, 5200, 1) * 0.55
    y = src * rough * 0.7 + hiss * (0.6 + 0.4 * rough)
    env = np.clip(t / 0.07, 0, 1) ** 1.5 * np.exp(-np.clip(u - 0.25, 0, None) * 2.6) * (1 - np.clip((u - 0.9) / 0.1, 0, 1))
    return fades(y * env, 0.005, 0.08)


def coyote_yip(r, n_yips=2):
    """a far coyote: two short rising yips then a thin falling howl-let. Mono."""
    y = np.zeros(ns(1.2))
    tm = 0.0
    for k in range(n_yips):
        d = r.uniform(0.08, 0.11)
        n = ns(d)
        t = np.arange(n) / SR
        f = r.uniform(620, 720) * (1 + 0.5 * (t / d))
        s = np.sin(TAU * np.cumsum(f) / SR) + 0.3 * np.sin(2 * TAU * np.cumsum(f) / SR)
        _place_mono(y, s * np.sin(np.pi * t / d) ** 0.6, tm)
        tm += d + r.uniform(0.07, 0.11)
    d = r.uniform(0.42, 0.55)
    n = ns(d)
    t = np.arange(n) / SR
    f = r.uniform(880, 980) * (1 + 0.05 * np.sin(np.pi * np.clip(t / (0.3 * d), 0, 1)) - 0.22 * t / d) * (1 + 0.006 * np.sin(TAU * 5.5 * t))
    s = np.sin(TAU * np.cumsum(f) / SR) + 0.25 * np.sin(2 * TAU * np.cumsum(f) / SR)
    _place_mono(y, s * np.sin(np.pi * t / d) ** 0.8 * 0.8, tm + 0.03)
    return fades(lp(y, 2600, 2), 0.004, 0.06)


def tape_peel(r, dur=0.32):
    """parcel tape peeling off cardboard: a fast sticky crackle that speeds up, a little tearing hiss. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 260 + 900 * (t / dur)
    k = r.random(n) < rate / SR
    imp = np.zeros(n)
    imp[k] = r.uniform(0.3, 1.0, k.sum())
    y = bp(imp, 1500, 7000, 1) * 2.2 + bp(colored(n, r, 0.4), 2000, 6500, 1) * 0.25 * (t / dur)
    env = np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
    return fades(y * env, 0.002, 0.02)


def envelope_tear(r, dur=0.26):
    """a soft envelope tear: fibrous paper ripping (dense crackle, darker than tape), one sigh at the end. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    k = r.random(n) < 1800 / SR
    imp = np.zeros(n)
    imp[k] = r.uniform(0.2, 1.0, k.sum())
    y = bp(imp, 900, 4500, 1) * 1.6 + bp(colored(n, r, 0.6), 700, 3500, 1) * 0.35
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return fades(y * env, 0.002, 0.03)


def school_bell(r, dur=1.4):
    """a far school-corridor bell / chime tone through walls: a soft two-partial ring, low-passed. Mono."""
    y = modal(dur, [(880.0, 1.0, 0.55), (880.0 * 2.0, 0.25, 0.3), (1318.5, 0.45, 0.45)], r)
    return fades(lp(y, 2200, 2), 0.004, 0.2)


def page_turn(r, dur=0.3):
    """one notebook page turned: a soft flap swish with a crisp edge flick at the end. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    sw = bp(colored(n, r, 0.5), 600, 4000, 1) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.4
    y = sw
    _place_mono(y, bp(r.standard_normal(ns(0.02)), 2000, 6000, 1) * np.exp(-np.arange(ns(0.02)) / SR / 0.004) * 1.4, dur * 0.78)
    return fades(y, 0.003, 0.03)


def mail_truck(r, dur=2.2):
    """a mail truck pulling away outside at night (through the window): a low diesel idle that revs and recedes,
    tyres hissing, all muffled. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = 38.0 * (1 + 0.35 * np.clip((u - 0.15) / 0.4, 0, 1) - 0.1 * np.clip((u - 0.6) / 0.4, 0, 1))
    ph = np.cumsum(f) / SR
    eng = np.sin(TAU * ph) + 0.6 * np.sin(2 * TAU * ph + 0.2) + 0.4 * np.sin(3 * TAU * ph + 0.9) + 0.25 * np.sin(4 * TAU * ph + 2.0)
    eng *= 1 + 0.25 * np.sin(TAU * 4 * f * t / 38.0)
    tyre = bp(colored(n, r, 0.8), 250, 1500, 1) * 0.4 * np.clip((u - 0.2) / 0.3, 0, 1)
    y = lp(eng * 0.6 + tyre, 900, 2)
    env = np.clip(t / 0.25, 0, 1) * (1 - np.clip((u - 0.35) / 0.65, 0, 1)) ** 1.5
    return fades(y * env, 0.01, 0.1)

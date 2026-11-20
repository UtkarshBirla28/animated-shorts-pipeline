# Procedural sound effects for "The Oil Tanks That Were Mostly Water" (own numpy synthesis, no samples):
# the harbour (wind, gulls, water lapping at the pilings, a far ship horn, steam wisps, far clanks), the tape reel's
# ratchet whirr and the plumb's plunk in the oil, steel stair steps / tank-roof steps / the rail, the split-flap LOANS
# counter, the bank (desk stamp, cash slide, cash register, typewriter, murmur, clock), the pencil tick, the chart's
# ratchet + boing, the trading floor (ticker machines, 1960s phones, shouting traders), the crash thud, thunder and rain,
# the BANKRUPT paper slap, the tank slosh, the dressing bottle shake + glug, water pour + oil trickle, the mystery bloop,
# the pump room (motor hum, valve squeaks, COUNTED plate ticks, the blob's gurgle and tired sigh), the 1963 street
# (traffic, horns, pigeons, the spinning newspaper, the CLOSED sign, the shares' bwomp), the office (pencil scribble,
# cha-ching, the cafe through the window) and the oil parting / settling in the loop shot.
# Kept from the engine (antitheft / bridge): creak (stick-slip), clink, rattle, loop_xfade, desert_wind (here: harbour
# wind), room_tone, clock_tick, ding, pop, whoosh, paper_rustle, pen_scratch, wood_knock, cha_ching, ka_thunk, ching,
# drop_plip, crowd_murmur, flag_snap, flap, far_vehicle, lamp_hum, paper_flutter, tiny_ting, the formant voice (vox,
# babble) and Minnaert bubbles.
import numpy as np
from scipy import signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, ramp, fades, shape,
                 phase, modal, pan, st, widen)

WOOD = [(230, 9, 1.0), (520, 12, 0.8), (940, 14, 0.55), (1650, 16, 0.35), (2800, 18, 0.18)]
SMALLMETAL = [(1850, 40, 1.0), (3100, 45, 0.8), (4600, 50, 0.6), (6900, 55, 0.35)]


def _place_mono(buf, x, t):
    i = ns(t)
    a, b = max(0, i), min(len(buf), i + len(x))
    if b > a:
        buf[a:b] += x[a - i: b - i]


def _env(n, pts):
    """pts = [(time_s, value)] -> per-sample envelope"""
    t = np.arange(n) / SR
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


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


def wood_knock(r, f0=190.0, tau=0.06, hard=1.0):
    """a wooden sign panel knocked / set down: board modes + click + low thump"""
    d = max(0.25, tau * 5)
    t = tt(d)
    y = modal(d, [(f0, 1.0, tau), (f0 * 2.31, 0.7, tau * 0.6), (f0 * 3.9, 0.45, tau * 0.4), (f0 * 6.1, 0.25, tau * 0.25)], r)
    y += hp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.001) * 0.5 * hard
    y += np.sin(phase(85 * (1 + 0.3 * np.exp(-t / 0.01)))) * np.exp(-t / 0.03) * 0.6 * hard
    return fades(y, 0.0003, 0.03)


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


def drop_plip(r, f0=700.0):
    """cartoon sweat drop 'plip': a water-drop blip with a fast upward pitch sweep"""
    d = 0.09
    t = tt(d)
    f = f0 * (1 + 1.6 * (1 - np.exp(-t / 0.012)))
    y = np.sin(phase(f)) * np.exp(-t / 0.022) * (1 - np.exp(-t / 0.0015))
    return fades(y, 0.0002, 0.02)


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


def lamp_hum(n, r, mains=60.0):
    """a desk lamp's filament / dimmer hum: 120 Hz + harmonics with a faint 3 kHz singing. Mono (n,)."""
    t = np.arange(n) / SR
    f = 2 * mains
    y = sum(np.sin(TAU * f * k * t + r.uniform(0, TAU)) / k ** 1.4 for k in range(1, 7))
    y = bp(y, 100, 1500, 1) + 0.025 * np.sin(TAU * 3000.0 * t + 0.003 * np.cumsum(smooth_noise(n, r, 0.4)))
    return y * (0.92 + 0.08 * smooth_noise(n, r, 0.7))


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


def tiny_ting(r, f0=4200.0, tau=0.12):
    """the smallest glint 'ting' (a chip catching the sun)"""
    return ding(r, f0, tau, 0.35, dur=0.45, shimmer=False)




# ================================================================ formant voice (from the bridge engine): traders, the blob's sigh
VOW = {"a": (730, 1090, 2440, 3400), "o": (570, 840, 2410, 3400), "u": (300, 870, 2240, 3300), "U": (440, 1020, 2240, 3300),
       "A": (640, 1190, 2390, 3400), "e": (530, 1840, 2480, 3500), "i": (270, 2290, 3010, 3600), "ae": (660, 1720, 2410, 3400),
       "er": (490, 1350, 1690, 3300), "E": (580, 1700, 2500, 3500), "ei": (400, 2000, 2550, 3500)}
BWS = np.array([85.0, 110.0, 160.0, 220.0])


def vox(f0, forms, amp, r, scale=1.0, tilt=1.15, breath=0.12, fmax=5500.0, jitter=0.012):
    """additive source-filter voice: f0 (n,), forms (n, 4) formant tracks, amp (n,) -> mono"""
    n = len(f0)
    jit = 1 + jitter * smooth_noise(n, r, 18.0)
    ph = phase(f0 * jit)
    y = np.zeros(n)
    K = int(fmax / max(f0.min(), 60))
    Fm = forms * scale
    for k in range(1, K + 1):
        fk = k * f0
        H = np.ones(n)
        for i in range(4):
            Fi = Fm[:, i]
            H *= Fi ** 2 / np.sqrt((Fi ** 2 - fk ** 2) ** 2 + (fk * BWS[i] * (1 + 0.3 * (scale - 1))) ** 2)
        y += H * k ** (-tilt) * np.sin(k * ph + r.uniform(0, TAU)) * (fk < fmax)
    asp = peq(bp(r.standard_normal(n), 500, 5000, 1), float(np.mean(Fm[:, 1])), 8, 1.5)
    y = y / (np.std(y) + 1e-9) + breath * asp / (np.std(asp) + 1e-9)
    return y * amp


def _track(n, pts, t_rel):
    return np.interp(t_rel, [p[0] for p in pts], [p[1] for p in pts])


def vowel_track(n, segs):
    t = np.arange(n) / SR
    out = np.zeros((n, 4))
    for i in range(4):
        out[:, i] = np.interp(t, [s[0] for s in segs], [VOW[s[1]][i] for s in segs])
    return out


def babble(dur, r, base, scale, rate=4.2, active=0.75, fmax=3600, breath=0.2):
    """one person talking (or shouting, with a high base f0 and a fast rate) far off: random syllables, pauses"""
    n = ns(dur)
    t = np.arange(n) / SR
    segs, fp, ap = [], [], []
    tm = r.uniform(0, 0.4)
    vs = list(VOW)
    while tm < dur:
        if r.uniform() > active:
            tm += r.uniform(0.25, 0.8)
            ap += [(tm - 0.01, 0.0)]
            continue
        L = r.uniform(0.6, 1.4) / rate
        v = vs[r.integers(len(vs))]
        segs.append((tm + L * 0.5, v))
        fp += [(tm, r.uniform(0.9, 1.2)), (tm + L, r.uniform(0.8, 1.1))]
        ap += [(tm, 0.05), (tm + L * 0.25, r.uniform(0.6, 1.0)), (tm + L * 0.8, r.uniform(0.4, 0.8)), (tm + L, 0.05)]
        tm += L
    if len(segs) < 2:
        return np.zeros(n)
    forms = vowel_track(n, [(0, segs[0][1])] + segs)
    f0 = base * _track(n, [(0, 1.0)] + sorted(fp), t) * (1 - 0.08 * t / dur)
    amp = _track(n, [(0, 0.0)] + sorted(ap) + [(dur, 0.0)], t)
    y = vox(f0, forms, amp, r, scale, tilt=1.25, breath=breath, fmax=fmax)
    cons = hp(r.standard_normal(n), 2500) * np.clip(np.abs(np.gradient(amp)) * SR * 0.02, 0, 1) * 0.3
    return y + cons


def bubbles(dur, r, rate, f_lo=300, f_hi=2500, tau=(0.008, 0.035), env=None, rise=(4, 12)):
    """Minnaert-style bubble 'plinks': damped sines gliding up (rate = bubbles / s, scalar or per-sample)"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        rr = rate if np.isscalar(rate) else rate[min(k, n - 1)]
        if a > 0.01:
            f0 = np.exp(r.uniform(np.log(f_lo), np.log(f_hi)))
            ta = r.uniform(*tau)
            L = min(int(ta * 6 * SR), n - k)
            if L > 8:
                tl = np.arange(L) / SR
                b = np.exp(-tl / ta) * np.sin(phase(f0 * (1 + r.uniform(*rise) * tl)))
                y[k:k + L] += b * a * r.uniform(0.2, 1.0) * (600 / f0) ** 0.3
        tm += r.exponential(1.0 / max(rr, 0.1))
    return y


# ================================================================ the harbour (tank top + tank farm)
STEEL = [(410, 30, 1.0), (980, 38, 0.7), (1630, 45, 0.55), (2470, 50, 0.4), (3550, 55, 0.25)]


def water_lap(n, r, level=1.0):
    """harbour water lapping at the pilings far below: a slow swell (every 2.5-5 s) of low gurgle and soft slaps.
    Stereo (2, n)."""
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    for ch in range(2):
        sw = np.clip(0.55 + 0.45 * smooth_noise(n, r, 0.28), 0, 1)
        flow = bp(colored(n, r, 0.9), 150, 1100, 1) * sw ** 1.5 * 0.6
        bab = bubbles(n / SR, r, 22, 220, 1300, (0.008, 0.03)) * 0.6
        out[ch] = flow + bab * sw
    return out * level


def gull(r, n_calls=None, f0=None, far=1.0):
    """a herring gull: a run of 'kyow' / 'keow' calls - a raspy harmonic tone that leaps up and falls back, each call
    0.12-0.32 s with a short gap, the first longer; far = distance (dulls and softens). Mono."""
    k = n_calls or int(r.integers(2, 6))
    base = f0 or r.uniform(560, 820)
    y = np.zeros(ns(3.2))
    tm = 0.0
    for j in range(k):
        L = (r.uniform(0.24, 0.34) if j == 0 else r.uniform(0.12, 0.22))
        n = ns(L)
        u = np.linspace(0, 1, n)
        cont = base * (1.0 + 0.55 * np.sin(np.pi * np.clip(u * 1.6, 0, 1)) ** 0.7 - 0.25 * u) * r.uniform(0.95, 1.05)
        ph = phase(cont * (1 + 0.012 * np.sin(TAU * 75 * u * L)))
        rasp = 1 + 0.5 * np.sin(TAU * r.uniform(55, 85) * np.arange(n) / SR)
        x = sum((0.9 / kk ** 0.8) * np.sin(kk * ph + r.uniform(0, TAU)) for kk in range(1, 9))
        x = x * rasp + 0.25 * bp(r.standard_normal(n), 1500, 5000, 1)
        x = peq(x, 2200, 6, 1.0)
        e = np.sin(np.pi * u) ** 0.6 * (0.7 + 0.3 * (1 - j / max(1, k)))
        _place_mono(y, x * e, tm)
        tm += L + r.uniform(0.05, 0.12)
    y = y[: ns(tm + 0.05)]
    y = lp(y, 6500 / far, 2)
    return fades(y, 0.003, 0.03)


def ship_horn(r, dur=2.4, f0=None):
    """a far ship's steam horn across the harbour: a low two-tone chord, slow breathy onset, steam roar, a slight
    pitch sag at the start, the harbour's slap echo. Mono (dur + echo)."""
    f0 = f0 or r.uniform(118, 132)
    n = ns(dur + 1.2)
    t = np.arange(n) / SR
    env = np.clip(t / 0.35, 0, 1) ** 1.5 * np.clip((dur - t) / 0.45, 0, 1) ** 1.2
    y = np.zeros(n)
    for ratio, a in ((1.0, 1.0), (1.26, 0.7)):
        cents = -40 * np.exp(-t / 0.25) + 6 * smooth_noise(n, r, 1.5)
        ph = phase(f0 * ratio * 2 ** (cents / 1200))
        y += a * sum((1 / kk) * np.sin(kk * ph + r.uniform(0, TAU)) for kk in range(1, 14))
    y += bp(colored(n, r, 0.5), 300, 2200, 1) * 0.2
    y = lp(y * env, 1100, 2)
    d = ns(0.42)
    y[d:] += 0.35 * lp(y[:-d], 700, 1)
    return fades(y, 0.01, 0.2)


def steam_hiss(n, r, level=1.0):
    """a vent's soft steam wisp: a breathing hiss (swells every few s) with a faint whistle. Mono (n,)."""
    sw = np.clip(0.45 + 0.55 * smooth_noise(n, r, 0.35), 0, 1) ** 2
    y = hp(colored(n, r, 0.2), 2500, 2) * sw
    t = np.arange(n) / SR
    y += 0.08 * np.sin(phase(2900 + 120 * smooth_noise(n, r, 0.5))) * sw
    return y * level


def far_clank(r, f0=None):
    """a far metal clank across the tank farm (a hatch dropped, a pipe knocked): steel modes, dulled by distance. Mono."""
    f0 = f0 or r.uniform(300, 520)
    d = 1.0
    y = modal(d, [(f0, 1.0, 0.25), (f0 * 2.43, 0.6, 0.15), (f0 * 3.71, 0.4, 0.1), (f0 * 5.3, 0.25, 0.06)], r)
    y += lp(r.standard_normal(ns(d)), 900, 1) * np.exp(-tt(d) / 0.01) * 0.4
    y = lp(y, 2200, 2)
    k = ns(0.18)
    y[k:] += 0.3 * y[:-k]
    return fades(y, 0.001, 0.2)


# ================================================================ the tape and the counter
def reel_whirr(r, dur, rate0=26.0, rate1=34.0, level_env=None):
    """the weighted tape paying out of its reel: the pawl ratchet clicking (rate0 -> rate1 / s), the spool's dry body
    rattle and the tape hissing over the reel lip. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    rate = np.linspace(rate0, rate1, n) * (1 + 0.05 * smooth_noise(n, r, 3.0))
    p = np.cumsum(rate) / SR
    hits = np.flatnonzero(np.diff(np.floor(p)) > 0)
    y = np.zeros(n)
    for i in hits:
        c = modal(0.03, [(r.uniform(2600, 3100), 1.0, 0.003), (r.uniform(5200, 6000), 0.5, 0.0015), (r.uniform(900, 1100), 0.4, 0.005)], r)
        _place_mono(y, c * r.uniform(0.6, 1.0), i / SR)
    y += bp(colored(n, r, 0.4), 700, 2400, 1) * 0.12 * (0.7 + 0.3 * np.sin(TAU * rate / 4.0 * t))
    y += bp(colored(n, r, 0.2), 3000, 8000, 1) * 0.07
    env = np.clip(t / 0.06, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
    if level_env is not None:
        env = env * level_env[:n]
    return fades(y * env, 0.003, 0.02)


def plumb_plunk(r):
    """the tape's plumb weight dropping into the oil: a thick, low 'plunk' (a big slow bubble, viscous: little spray)
    and a short gloop after it. Mono."""
    d = 0.6
    n = ns(d)
    t = np.arange(n) / SR
    y = np.sin(phase(210 * (1 + 0.9 * (1 - np.exp(-t / 0.05))))) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.003))
    y += lp(r.standard_normal(n), 1400, 2) * np.exp(-t / 0.012) * 0.5
    g = np.sin(phase(330 * (1 + 0.6 * np.clip((t - 0.12) / 0.1, 0, 1)))) * np.exp(-np.maximum(t - 0.12, 0) / 0.05) * (t > 0.12) * 0.4
    y += g
    y += bubbles(d, r, 18, 250, 900, (0.01, 0.04), np.exp(-t / 0.2)) * 0.5
    return fades(y, 0.0005, 0.08)


# ================================================================ steel: the ladder, the roof, the rail
def steel_step(r, weight=1.0, ring=1.0):
    """a work boot on a steel stair tread: a dull heel thud, the tread's clank (inharmonic steel modes) and a short
    grating rattle; ring = how long the steel sings. Mono."""
    d = 0.7
    n = ns(d)
    t = np.arange(n) / SR
    f0 = r.uniform(420, 560)
    y = modal(d, [(f0, 1.0, 0.09 * ring), (f0 * 2.31, 0.75, 0.06 * ring), (f0 * 3.63, 0.5, 0.04 * ring),
                  (f0 * 5.12, 0.35, 0.025 * ring), (f0 * 7.4, 0.2, 0.015 * ring)], r)
    y += np.sin(phase(r.uniform(70, 95) * (1 + 0.3 * np.exp(-t / 0.008)))) * np.exp(-t / 0.025) * 1.1 * weight
    y += bp(r.standard_normal(n), 1500, 7000, 1) * np.exp(-t / 0.004) * 0.6
    _place_mono(y, rattle(0.12, r, 70, np.exp(-np.linspace(0, 1, ns(0.12)) * 3), lo=1800, hi=5000) * 0.25, 0.0)
    return fades(y * weight, 0.0003, 0.08)


def roof_step(r, weight=1.0):
    """a boot on the tank's flat steel roof: the hollow tank answers with a low boom under the heel, a little grit. Mono."""
    d = 0.9
    n = ns(d)
    t = np.arange(n) / SR
    boom = modal(d, [(r.uniform(62, 78), 1.0, 0.22), (r.uniform(118, 140), 0.5, 0.15), (r.uniform(205, 240), 0.3, 0.08)], r)
    heel = bp(r.standard_normal(n), 300, 3000, 1) * np.exp(-t / 0.01) * 0.7
    tap = modal(0.2, [(r.uniform(900, 1200), 0.35, 0.02), (r.uniform(2100, 2600), 0.2, 0.01)], r)
    y = boom * 0.9 + heel
    _place_mono(y, tap, 0.0)
    y += bp(r.standard_normal(n), 2000, 7000, 1) * np.exp(-t / 0.03) * 0.08
    return fades(y * weight, 0.0005, 0.12)


def rail_grab(r):
    """a hand slapping onto the steel rail and gripping it: a short ring of the pipe rail. Mono."""
    d = 0.8
    t = tt(d)
    f0 = r.uniform(780, 900)
    y = modal(d, [(f0, 1.0, 0.25), (f0 * 2.76, 0.5, 0.12), (f0 * 5.4, 0.3, 0.06), (f0 * 8.9, 0.15, 0.03)], r)
    y += bp(r.standard_normal(len(t)), 600, 4000, 1) * np.exp(-t / 0.006) * 0.8
    return fades(y * 0.6, 0.0003, 0.15)


def knee_down(r):
    """kneeling on the steel roof: cloth + a soft hollow knock. Mono."""
    d = 0.5
    t = tt(d)
    y = modal(d, [(r.uniform(70, 85), 0.8, 0.15), (r.uniform(150, 170), 0.3, 0.08)], r)
    y += bp(colored(len(t), r, 0.5), 400, 3000, 1) * np.exp(-t / 0.05) * 0.35
    return fades(y, 0.002, 0.08)


# ================================================================ the bank
def desk_stamp(r, hard=1.0):
    """a rubber stamp brought down on a receipt on a wooden desk: the hand's swish into a woody knock, the rubber's
    soft 'thwack', the desk's low body. Mono."""
    d = 0.6
    n = ns(d)
    t = np.arange(n) / SR
    y = modal(d, [(r.uniform(170, 190), 1.0, 0.06), (410, 0.7, 0.04), (760, 0.45, 0.03), (1320, 0.25, 0.015)], r) * 0.9
    y += np.sin(phase(78 * (1 + 0.3 * np.exp(-t / 0.01)))) * np.exp(-t / 0.05) * 1.1 * hard
    y += bp(r.standard_normal(n), 300, 2500, 2) * np.exp(-t / 0.012) * 0.9
    y += hp(r.standard_normal(n), 2000) * np.exp(-t / 0.0015) * 0.35
    pre = bp(colored(ns(0.07), r, 0.5), 500, 3000, 1) * np.linspace(0, 1, ns(0.07)) ** 2 * 0.15
    out = np.zeros(n + len(pre))
    out[: len(pre)] += pre
    out[len(pre):] += y
    return fades(out * hard, 0.003, 0.08), len(pre) / SR


def cash_slide(r, dur=0.5):
    """a banded stack of notes pushed across the leather desk top: paper friction swelling and stopping. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7 * (0.75 + 0.25 * smooth_noise(n, r, 25.0))
    y = bp(colored(n, r, 0.4), 600, 5500, 1) * env
    y += bp(colored(n, r, 1.0), 150, 700, 1) * env * 0.4
    stop = np.zeros(n)
    k = ns(dur * 0.88)
    stop[k:] = np.exp(-np.arange(n - k) / SR / 0.01)
    y += bp(r.standard_normal(n), 200, 1500, 1) * stop * 0.6
    return fades(y, 0.005, 0.03)


def typewriter(dur, r, rate=7.0, bell=True):
    """an office typewriter in the next room: key strikes in word bursts (type bar slap + platen thunk), the odd space
    bar, and at the end of a line the bell and the carriage return. Mono."""
    n = ns(dur)
    y = np.zeros(n)
    tm = r.uniform(0.0, 0.5)
    count = 0
    while tm < dur - 0.3:
        word = int(r.integers(3, 8))
        for _ in range(word):
            c = modal(0.06, [(r.uniform(1800, 2600), 1.0, 0.006), (r.uniform(3800, 4600), 0.5, 0.003), (r.uniform(380, 460), 0.7, 0.012)], r)
            c += hp(r.standard_normal(len(c)), 2500) * np.exp(-tt(0.06) / 0.0008) * 0.6
            _place_mono(y, c * r.uniform(0.6, 1.0), tm)
            tm += 1.0 / rate * r.uniform(0.6, 1.4)
            count += 1
        sp = modal(0.08, [(r.uniform(250, 320), 1.0, 0.02), (900, 0.4, 0.008)], r)
        _place_mono(y, sp * 0.6, tm)
        tm += r.uniform(0.15, 0.45)
        if bell and count > 30 and tm < dur - 1.2:
            b = modal(1.0, [(2780, 1.0, 0.35), (2780 * 2.4, 0.3, 0.1)], r) * 0.5
            _place_mono(y, b, tm)
            ret = bp(colored(ns(0.45), r, 0.6), 500, 4000, 1) * np.linspace(1, 0.3, ns(0.45)) * 0.5
            _place_mono(y, ret, tm + 0.25)
            _place_mono(y, modal(0.15, [(330, 1.0, 0.03), (1200, 0.4, 0.01)], r), tm + 0.7)
            tm += 1.2
            count = 0
    return y


def pencil_tick(r):
    """a check mark ticked onto a clipboard: a short down-stroke and the long up-flick of a pencil. Mono."""
    y = np.zeros(ns(0.26))
    a = pen_scratch(r, 0.05, 20.0)
    b = pen_scratch(r, 0.11, 30.0)
    _place_mono(y, a * 0.8, 0.0)
    _place_mono(y, b, 0.065)
    return fades(lp(y, 7000, 1), 0.002, 0.02)


def ratchet(r, dur=0.45, rate0=14.0, rate1=26.0):
    """a crank ratchet cranking up: hard pawl clicks speeding up, a small wooden body (the chart pile growing). Mono."""
    n = ns(dur + 0.1)
    rate = np.interp(np.arange(n), [0, ns(dur)], [rate0, rate1])
    p = np.cumsum(rate) / SR
    hits = np.flatnonzero(np.diff(np.floor(p)) > 0)
    y = np.zeros(n)
    for j, i in enumerate(hits):
        if i > ns(dur):
            break
        c = modal(0.05, [(r.uniform(1500, 1800), 1.0, 0.006), (r.uniform(3300, 3700), 0.6, 0.003), (r.uniform(420, 500), 0.6, 0.01)], r)
        c += hp(r.standard_normal(len(c)), 3000) * np.exp(-tt(0.05) / 0.0006) * 0.5
        _place_mono(y, c * (0.6 + 0.4 * j / max(1, len(hits))), i / SR)
    return fades(y, 0.001, 0.03)


def boing(r, f0=180.0, dur=0.55, depth=0.35):
    """a soft comic spring 'boing' (the pile popping taller): a sine with a wobbling, decaying vibrato. Mono."""
    t = tt(dur)
    fm = f0 * (1 + depth * np.exp(-t / 0.18) * np.sin(TAU * 16 * t)) * (1 + 0.25 * (1 - np.exp(-t / 0.05)))
    y = np.sin(phase(fm)) * np.exp(-t / 0.18) * (1 - np.exp(-t / 0.004))
    y += 0.3 * np.sin(2 * phase(fm)) * np.exp(-t / 0.1)
    return fades(y, 0.0005, 0.05)


# ================================================================ the trading floor and the storm
def phone_ring(r, dur=1.0, far=1.0):
    """a 1960s desk phone ringing: two small bells hammered alternately at 20 Hz (rich inharmonic ring), ring 0.9 s.
    Mono."""
    n = ns(dur + 0.4)
    y = np.zeros(n)
    tm = 0.0
    k = 0
    fA, fB = r.uniform(1050, 1150), r.uniform(1330, 1430)
    while tm < dur:
        f0 = fA if k % 2 == 0 else fB
        c = modal(0.3, [(f0, 1.0, 0.12), (f0 * 2.72, 0.5, 0.05), (f0 * 5.1, 0.25, 0.02)], r)
        _place_mono(y, c * 0.5, tm)
        tm += 1.0 / 20.0
        k += 1
    y = lp(y, 5000 / far, 2)
    return fades(y, 0.002, 0.1)


def ticker(n, r, rate=11.0, level=1.0):
    """ticker-tape machines chattering: the type-wheel solenoid clicks in irregular bursts, paper hiss. Mono (n,)."""
    y = np.zeros(n)
    t = np.arange(n) / SR
    burst = (smooth_noise(n, r, 0.8) > -0.2).astype(float)
    tm = 0.0
    while tm < n / SR:
        k = ns(tm)
        if burst[min(k, n - 1)] > 0.5:
            c = modal(0.04, [(r.uniform(2900, 3300), 1.0, 0.003), (r.uniform(1100, 1300), 0.6, 0.005), (r.uniform(5800, 6400), 0.3, 0.002)], r)
            _place_mono(y, c * r.uniform(0.5, 1.0), tm)
        tm += 1.0 / rate * r.uniform(0.6, 1.3)
    y += bp(colored(n, r, 0.3), 2000, 7000, 1) * 0.04 * burst
    return y * level


def crash_thud(r):
    """the crash: a heavy low THOOM (the market falling through the floor), a chalk board's wooden knock and a dusty
    rattle. Mono."""
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    y = np.sin(phase(52 * (1 + 0.7 * np.exp(-t / 0.05)))) * np.exp(-t / 0.35) * 2.0
    y += np.sin(phase(104 * (1 + 0.4 * np.exp(-t / 0.03)))) * np.exp(-t / 0.12) * 0.6
    y += modal(d, [(150, 0.9, 0.08), (340, 0.6, 0.05), (690, 0.35, 0.03)], r)
    y += bp(r.standard_normal(n), 200, 2500, 2) * np.exp(-t / 0.02) * 1.2
    _place_mono(y, rattle(0.5, r, 40, np.exp(-np.linspace(0, 1, ns(0.5)) * 3), lo=1200, hi=4000) * 0.25, 0.0)
    return fades(y, 0.0, 0.3)


def thunder(r, dur=3.5, crack=0.6, dist=1.0):
    """a thunder roll: an optional crack, then a rumbling low roll whose bursts come and go and slowly die. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    rumble = lp(colored(n, r, 2.0), 180, 2)
    bursts = np.clip(0.35 + 0.65 * smooth_noise(n, r, 3.0), 0, 1) ** 2
    env = np.clip(t / 0.25, 0, 1) * np.exp(-t / (dur * 0.42))
    y = rumble * bursts * env * 1.4
    y += bp(colored(n, r, 1.0), 120, 900, 1) * bursts ** 2 * env * 0.5
    if crack > 0:
        c = bp(r.standard_normal(n), 400, 6000, 1) * np.exp(-t / 0.05) * (1 - np.exp(-t / 0.003)) * crack
        c += lp(r.standard_normal(n), 300, 2) * np.exp(-t / 0.15) * crack
        y += c
    y = lp(y, 3500 / dist, 2)
    return fades(y, 0.01, 0.4)


def rain(n, r, level=1.0, heavy=1.0):
    """rain on the tank farm: dense fine drops (2-9 kHz), heavier drops on puddles and steel (bubbles + pings), a soft
    wash underneath and the gutter / drum run-off. Stereo (2, n)."""
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    for ch in range(2):
        wash = bp(colored(n, r, 0.6), 600, 9000, 1) * 0.35 * heavy
        fine = np.zeros(n)
        k = r.random(n) < 2600 * heavy / SR
        fine[k] = r.uniform(0.1, 1.0, k.sum()) ** 2
        fine = bp(np.convolve(fine, np.exp(-np.arange(60) / 12.0))[:n], 2000, 9500, 1) * 2.5
        drops = bubbles(n / SR, r, 35 * heavy, 700, 3500, (0.003, 0.012), rise=(8, 22)) * 0.6
        pings = np.zeros(n)
        tm = r.uniform(0, 0.3)
        while tm < n / SR - 0.1:
            c = modal(0.1, [(r.uniform(2400, 4200), 1.0, 0.01), (r.uniform(5000, 7000), 0.4, 0.005)], r)
            _place_mono(pings, c * r.uniform(0.1, 0.4), tm)
            tm += r.exponential(0.12)
        run = bp(colored(n, r, 0.8), 300, 1500, 1) * (0.6 + 0.4 * smooth_noise(n, r, 0.6)) * 0.25
        out[ch] = wash + fine + drops + pings * 0.5 + run
    return out * level


def paper_slap(r):
    """the BANKRUPT notice slapped onto the wet sign: a flat wet 'thwap' of paper on board + a short crinkle. Mono."""
    d = 0.35
    n = ns(d)
    t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 250, 3500, 2) * np.exp(-t / 0.014) * 1.5
    y += modal(d, [(210, 0.6, 0.04), (480, 0.4, 0.025)], r)
    _place_mono(y, paper_rustle(r, 0.18, 0.7) * 0.35, 0.03)
    return fades(y, 0.0003, 0.05)


# ================================================================ water and oil
def tank_slosh(r, dur=1.3, pk=0.2):
    """ONE big slosh of water inside a huge steel tank (the reveal): a heavy body of water rolling over and slapping
    the wall (peak at pk s), a bubble cloud, then the hollow tank ringing it out. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.clip(t / (pk * 0.9), 0, 1) ** 1.5 * np.exp(-np.maximum(t - pk * 0.9, 0) / (0.28 * pk / 0.2))
    body = shape(colored(n, r, 0.6), lambda Tq, Fq: np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) /
                 (380 + 520 * np.exp(-((Tq[None, :] - pk) / 0.18) ** 2))) / 1.1) ** 2), 1024, 256) * env * 1.5
    slap = bp(r.standard_normal(n), 300, 3000, 1) * np.exp(-((t - pk * 1.1) / 0.03) ** 2) * 0.9
    bub = bubbles(dur, r, 260 * np.exp(-np.maximum(t - pk * 0.75, 0) / 0.25) + 3, 180, 1500, (0.008, 0.035), np.clip(t / 0.12, 0, 1) * np.exp(-t / 0.5))
    low = lp(colored(n, r, 2.0), 140, 2) * env * 0.8
    y = body + slap + bub * 0.8 + low
    tank = modal(dur, [(88, 0.4, 0.5), (143, 0.3, 0.35), (231, 0.2, 0.25)], r) * 0.15
    y = y + np.convolve(y, tank[: ns(0.6)] / (np.abs(tank).sum() + 1e-9) * 40, mode="full")[:n] * 0.3
    return fades(y, 0.004, 0.25)


def bottle_shake(r, shakes=4, period=0.16):
    """a glass dressing bottle shaken in a hand: a liquid slosh on every stroke (small, bright, glassy), the cap
    knocking the glass once. Mono."""
    d = shakes * period + 0.35
    y = np.zeros(ns(d))
    for j in range(shakes):
        L = period * 0.95
        n = ns(L)
        tl = np.arange(n) / SR
        e = np.sin(np.pi * np.clip(tl / L, 0, 1)) ** 1.2
        s = bp(colored(n, r, 0.5), 700, 4500, 1) * e * 0.7
        s += bubbles(L, r, 120, 900, 3500, (0.003, 0.012), e, rise=(10, 30)) * 0.8
        _place_mono(y, s * (0.8 + 0.2 * (j % 2)), j * period)
    _place_mono(y, modal(0.2, [(3400, 1.0, 0.03), (5200, 0.5, 0.015)], r) * 0.3, period * 1.5)
    return fades(y, 0.003, 0.08)


def glug(r, dur=1.8, n_glugs=3):
    """the oil rising and settling in the bottle: a few soft, slow, low 'glug' bubbles and a faint fizz. Mono."""
    n = ns(dur)
    y = np.zeros(n)
    t = np.arange(n) / SR
    for j in range(n_glugs):
        tm = (j + 0.3) * dur / n_glugs + r.uniform(-0.08, 0.08)
        L = 0.22
        tl = tt(L)
        g = np.sin(phase(r.uniform(160, 230) * (1 + 0.8 * (1 - np.exp(-tl / 0.06))))) * np.exp(-tl / 0.06) * (1 - np.exp(-tl / 0.004))
        _place_mono(y, g * (1.0 - 0.15 * j), tm)
    y += bubbles(dur, r, 14, 900, 2600, (0.003, 0.01)) * 0.15 * np.clip(t / 0.3, 0, 1)
    return fades(y, 0.003, 0.15)


def water_pour(r, dur, fill=(0.0, 1.0)):
    """a hose of water pouring into a deep tank: the stream's splash roar, a bubble cloud, and the cavity resonance
    rising as the tank fills (fill = start, end 0..1). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    u = np.clip(t / dur, 0, 1)
    fr = 600 + 900 * (fill[0] + (fill[1] - fill[0]) * u)
    nz = colored(n, r, 0.5)
    y = shape(nz, lambda Tq, Fq: 0.4 + np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / np.interp(Tq, t, fr)[None, :]) / 0.45) ** 2), 1024, 256)
    y = bp(y, 200, 9000, 1) * (0.85 + 0.15 * smooth_noise(n, r, 9.0))
    y += bubbles(dur, r, 160, 300, 2200, (0.005, 0.02)) * 0.6
    env = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
    return fades(y * env, 0.005, 0.05)


def oil_trickle(r, dur):
    """a thin pour of oil onto the water: a soft, smooth, low trickle (viscous: few bubbles) with the odd fat drop. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(colored(n, r, 0.9), 250, 1800, 1) * (0.7 + 0.3 * smooth_noise(n, r, 4.0)) * 0.6
    y += bubbles(dur, r, 9, 250, 700, (0.015, 0.05)) * 0.9
    env = np.clip(t / 0.12, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)
    return fades(y * env, 0.005, 0.05)


def bloop(r, f0=190.0):
    """the mystery's single soft 'bloop' (a bubble rising through the golden oil and popping): a slow round upward
    glide with a soft pop on the end. Mono."""
    d = 0.4
    t = tt(d)
    y = np.sin(phase(f0 * (1 + 1.1 * (1 - np.exp(-t / 0.09))))) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.012))
    pk = np.sin(phase(f0 * 4.2 * (1 + 0.3 * tt(0.05) / 0.05))) * np.exp(-tt(0.05) / 0.01) * 0.2
    _place_mono(y, pk, 0.15)
    return fades(y, 0.002, 0.06)


def liquid_part(r, dur=0.6):
    """the golden layer parting over the water: a soft 'shlup' swirl (a smooth low sweep up), tiny bubbles. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    fc = 300 + 700 * np.clip(t / dur, 0, 1) ** 0.7
    y = shape(colored(n, r, 0.8), lambda Tq, Fq: np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / np.interp(Tq, t, fc)[None, :]) / 0.5) ** 2), 1024, 256)
    y *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    y += bubbles(dur, r, 25, 500, 1800, (0.004, 0.015), np.sin(np.pi * np.clip(t / dur, 0, 1))) * 0.3
    return fades(y, 0.005, 0.05)


def settle(r, dur=0.8):
    """the oil closing back over the water: a soft low 'gloop' and a smooth fading swirl. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.sin(phase(150 * (1 + 0.5 * (1 - np.exp(-t / 0.08))))) * np.exp(-t / 0.1) * (1 - np.exp(-t / 0.01)) * 0.7
    fc = 900 - 600 * np.clip(t / dur, 0, 1)
    sw = shape(colored(n, r, 0.8), lambda Tq, Fq: np.exp(-0.5 * (np.log2(np.maximum(Fq[:, None], 20) / np.interp(Tq, t, fc)[None, :]) / 0.5) ** 2), 1024, 256)
    y += sw * np.exp(-t / 0.3) * 0.6
    return fades(y, 0.005, 0.1)


def underwater(n, r, level=1.0):
    """inside the tank (the cutaway): a deep hollow water tone, slow movement and a few tiny rising bubbles. Stereo."""
    out = np.zeros((2, n))
    for ch in range(2):
        body = lp(colored(n, r, 1.6), 260, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.25))
        hollow = bp(colored(n, r, 1.0), 140, 600, 2) * 0.3
        bub = bubbles(n / SR, r, 2.5, 600, 2400, (0.004, 0.012), rise=(10, 25)) * 0.35
        out[ch] = body + hollow + bub
    return out * level


# ================================================================ the pump room
def pump_hum(n, r, level=1.0):
    """the Saturday-night pump room: a 60 Hz motor hum (120 Hz + harmonics), the pump's slow piston chug, oil moving
    in the pipes, the room's cold air. Stereo (2, n)."""
    t = np.arange(n) / SR
    hum = sum(np.sin(TAU * 60.0 * k * t + r.uniform(0, TAU)) / k ** 1.2 for k in (1, 2, 3, 4, 6))
    hum = lp(hum, 700, 2) * (0.9 + 0.1 * smooth_noise(n, r, 0.5))
    chug_r = 1.6
    ph = (chug_r * t + r.uniform(0, 1)) % 1.0
    chug = np.exp(-ph / 0.08) * lp(colored(n, r, 1.5), 220, 2) * 1.2
    flow = bp(colored(n, r, 0.9), 200, 1400, 1) * (0.6 + 0.4 * smooth_noise(n, r, 1.2)) * 0.35
    gurg = bubbles(n / SR, r, 6, 200, 800, (0.01, 0.04)) * 0.4
    m = hum * 0.5 + chug + flow + gurg
    out = np.stack([m, m]) + room_tone(n, r, air=0.6) * 0.4
    return out * level


def valve_squeak(r, dur=0.5):
    """a red valve wheel turned against old packing: a metal stick-slip squeal + the stem's grind. Mono."""
    y = creak(dur, r, 280, 420, SMALLMETAL, [(0, 0), (0.2, 1), (0.6, 0.7), (0.8, 0.9), (1.0, 0)], 0.1, 0.03, 0.55)
    y += creak(dur, r, 90, 140, STEEL, None, 0.15, 0.02, 0.7) * 0.5
    return fades(lp(y, 7000, 1), 0.005, 0.05)


def plate_tick(r):
    """a COUNTED plate flipping to its next number: a hinged tin plate's tick-clack. Mono."""
    y = np.zeros(ns(0.2))
    _place_mono(y, flap(r, True), 0.0)
    _place_mono(y, modal(0.15, [(r.uniform(1200, 1400), 0.6, 0.02), (r.uniform(2900, 3200), 0.3, 0.01)], r), 0.004)
    return fades(y, 0.0005, 0.03)


def blob_gurgle(r, dur):
    """the oil blob riding through the glass pipe: a travelling soft gurgle (gloops every ~0.2 s) with a hollow pipe
    resonance. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    tm = 0.05
    while tm < dur - 0.1:
        L = 0.12
        tl = tt(L)
        g = np.sin(phase(r.uniform(240, 360) * (1 + 0.7 * (1 - np.exp(-tl / 0.04))))) * np.exp(-tl / 0.035) * (1 - np.exp(-tl / 0.004))
        _place_mono(y, g * r.uniform(0.5, 1.0), tm)
        tm += r.uniform(0.16, 0.28)
    y += reson(colored(n, r, 0.8), 520, 5) * 0.08 * (0.6 + 0.4 * smooth_noise(n, r, 3.0))
    env = np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.15, 0, 1)
    return fades(y * env, 0.003, 0.05)


def sigh(r, f0=230.0, dur=0.62):
    """the oil blob's tired cartoon sigh ('hhhh-ooo'): breathy onset, a falling, slightly creaky voiced 'uh-oo'. Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = f0 * (1.05 - 0.35 * np.clip(t / dur, 0, 1) ** 0.8)
    forms = vowel_track(n, [(0, "a"), (dur * 0.45, "U"), (dur, "u")])
    amp = np.clip((t - 0.08) / 0.08, 0, 1) * np.clip((dur - t) / 0.2, 0, 1) ** 1.2
    y = vox(f, forms, amp, r, scale=1.12, tilt=1.4, breath=0.9, fmax=4500.0, jitter=0.03)
    br = bp(r.standard_normal(n), 600, 4500, 1) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.25) * 0.5
    return fades(y * 0.6 + br, 0.005, 0.08)


# ================================================================ the street, the office
def city(n, r, level=1.0):
    """a grey 1963 city street: traffic rumble with cars passing (slow swells), far honks, footsteps on the pavement,
    a pigeon or two. Stereo (2, n)."""
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        rum = lp(colored(n, r, 1.6), 300, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.3))
        hiss = bp(colored(n, r, 0.7), 400, 3500, 1) * 0.25 * np.clip(0.5 + 0.5 * smooth_noise(n, r, 0.4), 0, 1) ** 2
        out[ch] = rum + hiss
    tm = r.uniform(0.3, 1.0)
    while tm < n / SR - 1.0:
        L = r.uniform(1.6, 2.6)
        car = far_vehicle(r, L, far=r.uniform(1.0, 1.6)) * 0.5
        p0 = r.uniform(-0.8, 0.8)
        th = (np.clip(np.linspace(p0, -p0, len(car)), -1, 1) + 1) * np.pi / 4
        i = ns(tm)
        m = min(len(car), n - i)
        out[0, i:i + m] += car[:m] * np.cos(th[:m])
        out[1, i:i + m] += car[:m] * np.sin(th[:m])
        tm += r.uniform(1.4, 3.0)
    return out * level


def car_horn(r, far=1.0):
    """a 1960s car horn honked twice, a block away: two buzzy tones (a major third) through a little street echo. Mono."""
    d = 0.75
    y = np.zeros(ns(d))
    for k, (t0, L) in enumerate(((0.0, 0.16), (0.24, 0.28))):
        tl = tt(L)
        x = sum(np.sign(np.sin(TAU * f * tl)) * a for f, a in ((r.uniform(345, 360), 0.6), (r.uniform(435, 450), 0.5)))
        x = bp(x, 300, 3000, 1) * np.clip(tl / 0.01, 0, 1) * np.clip((L - tl) / 0.02, 0, 1)
        _place_mono(y, x, t0)
    y = lp(y, 2500 / far, 2)
    k = ns(0.11)
    y[k:] += 0.25 * y[:-k]
    return fades(y, 0.002, 0.05)


def pigeon_coo(r):
    """a pigeon's soft 'oo-OO-oo' coo (three low hollow notes). Mono."""
    y = np.zeros(ns(1.0))
    tm = 0.0
    for j, (f0, L) in enumerate(((r.uniform(330, 360), 0.16), (r.uniform(400, 430), 0.28), (r.uniform(320, 350), 0.2))):
        tl = tt(L)
        x = np.sin(phase(f0 * (1 + 0.08 * np.sin(np.pi * tl / L)))) + 0.2 * np.sin(2 * phase(np.full(len(tl), f0)))
        x *= np.sin(np.pi * tl / L) ** 1.5 * (1 + 0.3 * np.sin(TAU * 30 * tl))
        _place_mono(y, x * (0.7 if j != 1 else 1.0), tm)
        tm += L + 0.04
    return fades(lp(y[: ns(tm + 0.05)], 2000, 2), 0.004, 0.04)


def newspaper_spin(r, dur=0.55):
    """the classic spinning newspaper: an air whoosh fluttering at the spin rate (fast -> slowing), the paper rattling,
    then the flat SLAP of it landing on the stand. Mono (the slap at the end)."""
    n = ns(dur + 0.3)
    t = np.arange(n) / SR
    u = np.clip(t / dur, 0, 1)
    spin = np.cumsum(14.0 - 8.0 * u) / SR
    flut = 0.55 + 0.45 * np.abs(np.sin(np.pi * spin))
    env = np.clip(t / (dur * 0.35), 0, 1) ** 1.5 * (t < dur)
    y = bp(colored(n, r, 0.6), 500, 5000, 1) * env * flut
    y += paper_flutter(r, env * flut) * 0.6
    slap = np.zeros(n)
    k = ns(dur)
    L = n - k
    tl = np.arange(L) / SR
    slap[k:] = bp(r.standard_normal(L), 300, 4000, 2) * np.exp(-tl / 0.012) * 2.2
    y += slap
    return fades(y, 0.004, 0.05), dur


def sign_clack(r):
    """a wooden CLOSED sign hung on the door hook: a woody clack against the door and the hook chain's jingle. Mono."""
    y = np.zeros(ns(0.6))
    _place_mono(y, wood_knock(r, r.uniform(320, 380), 0.03, 0.8), 0.0)
    _place_mono(y, wood_knock(r, r.uniform(300, 340), 0.025, 0.4) * 0.5, 0.09)
    for k, tm in enumerate((0.02, 0.07, 0.15)):
        _place_mono(y, clink(r, r.uniform(2600, 3800), 0.06, 0.6) * (0.35 - 0.08 * k), tm)
    return fades(y, 0.0005, 0.05)


def bwomp(r, f0=200.0, f1=70.0, dur=0.7):
    """the shares falling: a downward cartoon 'bwomp' (a soft square-ish tone sliding down, a closing wah). Mono."""
    n = ns(dur)
    t = np.arange(n) / SR
    u = np.clip(t / dur, 0, 1)
    f = f0 * (f1 / f0) ** (u ** 0.8)
    ph = phase(f)
    x = sum(np.sin(k * ph) / k for k in (1, 2, 3, 4, 5, 6, 7))
    cut = 2200 - 1700 * u
    x = shape(x, lambda Tq, Fq: 1 / (1 + (np.maximum(Fq[:, None], 1) / np.interp(Tq, t, cut)[None, :]) ** 3), 1024, 256)
    env = np.clip(t / 0.02, 0, 1) * (1 - u) ** 0.8
    return fades(x * env, 0.002, 0.06)


def scribble(r, letters=3, dur=0.65):
    """a pencil writing a short word (BUY): one quick scratchy burst per letter, a tiny lift between. Mono."""
    y = np.zeros(ns(dur + 0.1))
    L = dur / letters
    for j in range(letters):
        _place_mono(y, pen_scratch(r, L * 0.8, r.uniform(9, 14)) * r.uniform(0.75, 1.0), j * L)
    return fades(lp(y, 7500, 1), 0.003, 0.03)


def cafe(n, r, level=1.0):
    """the cafe across the street, heard through the office window: warm chatter, cups and spoons, the odd laugh;
    dulled by the glass. Stereo (2, n)."""
    out = crowd_murmur(n, r, voices=7, lo=180.0, hi=1400.0, density=1.0) * 0.8
    cl = np.zeros(n)
    tm = r.uniform(0.1, 0.6)
    while tm < n / SR - 0.2:
        c = modal(0.25, [(r.uniform(2400, 3600), 1.0, r.uniform(0.04, 0.09)), (r.uniform(5200, 6800), 0.4, 0.02)], r)
        _place_mono(cl, c * r.uniform(0.1, 0.35), tm)
        tm += r.exponential(0.6)
    out += widen(cl, r, 9, 0.8)
    out = lp(out, 3500, 2)
    return out * level

def bird_chip(r):
    L = r.uniform(0.025, 0.045)
    tl = tt(L)
    f = r.uniform(4200, 5600) * (1 - 0.3 * tl / L)
    return np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 2




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



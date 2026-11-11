# Synthesized instruments for the original "caper" score of the anti-theft short (own additive / modal synthesis,
# numpy + scipy only): marimba, celesta, woodblock, upright-bass pizzicato, string pizzicato, glass pad (cool, sine-based),
# warm pad, vibraphone, glockenspiel, music box, triangle.
import numpy as np
from scipy import signal
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, reson, peq, colored, smooth_noise, ramp, fades, shape, phase, modal


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def _env(n, att, dur_n, rel, curve=1.5):
    e = np.ones(n)
    a = max(1, ns(att))
    e[:a] = np.linspace(0, 1, a) ** curve
    if dur_n < n:
        e[dur_n:] *= np.linspace(1, 0, n - dur_n) ** 2
    return e


def _damp(y, at, tau=0.05):
    """felt damper / finger mute at `at` s: exponential release from there on"""
    k = ns(at)
    if 0 < k < len(y):
        y[k:] *= np.exp(-np.arange(len(y) - k) / SR / tau)
    return y


# ---------------------------------------------------------------- mallets / bells
def marimba(f, vel=0.7, r=None, dur=None, damp=None, mallet=0.5):
    """rosewood bar over a tuned tube: modes 1 : 4 : 9.9 (bar tuned two octaves), soft yarn mallet, low notes ring longer"""
    r = r or rng(0)
    tau1 = float(np.clip(0.75 * (220.0 / f) ** 0.55, 0.12, 1.1))
    dur = dur or min(2.2, tau1 * 5 + 0.05)
    t = tt(dur)
    hard = 0.25 + 0.75 * mallet
    y = modal(dur, [(f, 1.0, tau1), (f * 3.99, 0.22 * hard * vel, tau1 * 0.18), (f * 9.85, 0.06 * hard * vel, tau1 * 0.05),
                    (f * 2.0, 0.035, tau1 * 0.5)], r)
    y *= 1 - np.exp(-t / 0.0012)
    knock = lp(r.standard_normal(len(t)), 1200 + 2800 * hard, 2) * np.exp(-t / 0.0025) * 0.22 * hard
    y = y + knock
    if damp is not None:
        y = _damp(y, damp, 0.04)
    return fades(y * vel, 0.0005, 0.04)


def celesta(f, vel=0.6, r=None, dur=None, damp=None):
    """celesta: felt hammer on steel plates over wooden resonators - almost pure, a soft octave partial, gentle shimmer"""
    r = r or rng(0)
    tau1 = float(np.clip(0.95 * (880.0 / f) ** 0.35, 0.35, 1.6))
    dur = dur or min(2.4, tau1 * 3.5)
    t = tt(dur)
    y = modal(dur, [(f, 1.0, tau1), (f * 2.003, 0.16 * vel, tau1 * 0.4), (f * 4.07, 0.045 * vel, tau1 * 0.12),
                    (f * 5.93, 0.018, 0.03)], r)
    y *= 1 - np.exp(-t / 0.0015)
    y *= 1 + 0.025 * np.sin(TAU * 4.6 * t + r.uniform(0, TAU))
    felt = lp(r.standard_normal(len(t)), 2500, 2) * np.exp(-t / 0.002) * 0.1
    y = y + felt
    if damp is not None:
        y = _damp(y, damp, 0.08)
    return fades(y * vel, 0.0005, 0.06)


def woodblock(vel=0.6, r=None, f=1050.0, dur=0.22):
    """temple/wood block: hollow body modes, very short ring, stick click"""
    r = r or rng(0)
    t = tt(dur)
    y = modal(dur, [(f, 1.0, 0.045), (f * 1.58, 0.42, 0.024), (f * 2.29, 0.26, 0.014), (f * 3.41, 0.12, 0.007)], r)
    y += reson(r.standard_normal(len(t)), f * 0.52, 6) * np.exp(-t / 0.012) * 0.08
    y *= 1 - np.exp(-t / 0.0004)
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0006) * 0.35
    return fades(y * vel, 0.0002, 0.03)


def vibes(f, vel=0.6, r=None, dur=1.6, damp=None, trem=5.2, trem_depth=0.25):
    """vibraphone: bars tuned 1 : 4 : 10, soft mallet, motor tremolo, damper at `damp` s"""
    r = r or rng(0)
    t = tt(dur)
    y = modal(dur, [(f, 1.0, 2.2), (f * 3.98, 0.16 * vel, 0.32), (f * 9.9, 0.04 * vel, 0.06)], r)
    y += hp(r.standard_normal(len(t)), 1500) * np.exp(-t / 0.0015) * 0.05 * vel
    y *= 1 - trem_depth * (0.5 + 0.5 * np.sin(TAU * trem * t + r.uniform(0, TAU)))
    if damp is not None and damp < dur:
        y = _damp(y, damp, 0.06)
    return fades(y * vel, 0.002, 0.05)


def glock(f, vel=0.7, r=None, dur=1.8):
    r = r or rng(0)
    t = tt(dur)
    k = (880.0 / f) ** 0.35
    y = modal(dur, [(f, 1.0, 1.25 * k), (f * 2.756, 0.30 * vel, 0.22 * k), (f * 5.404, 0.12 * vel, 0.07), (f * 8.933, 0.05 * vel, 0.025)], r)
    click = hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0007) * 0.25 * vel
    return fades((y + click) * vel, 0.0005, 0.05)


def musicbox(f, vel=0.6, r=None, dur=1.6):
    """music-box tine (cantilever partials 1 : 6.27 : 17.55) with a tiny pluck click"""
    r = r or rng(0)
    t = tt(dur)
    y = modal(dur, [(f, 1.0, 1.1), (f * 2.0, 0.04, 0.4), (f * 6.27, 0.13 * vel, 0.08), (f * 17.55, 0.05 * vel, 0.02)], r)
    y += hp(r.standard_normal(len(t)), 4000) * np.exp(-t / 0.0006) * 0.12 * vel
    return fades(y * vel, 0.0005, 0.05)


def triangle(vel=0.5, r=None, dur=1.6, f=1320.0):
    r = r or rng(0)
    modes = [(f, 1.0, 1.4), (f * 2.71, 0.6, 0.9), (f * 4.63, 0.45, 0.7), (f * 6.02, 0.3, 0.5), (f * 7.75, 0.2, 0.35), (f * 9.4, 0.12, 0.25)]
    y = modal(dur, modes, r)
    t = tt(dur)
    y += hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.001) * 0.3
    return fades(y * vel * 0.4, 0.0003, 0.08)


# ---------------------------------------------------------------- strings
def pluck(f, vel=0.7, r=None, dur=0.9, bright=0.5, pos=0.17):
    """plucked string (pizzicato) by additive partials with frequency-dependent decay"""
    r = r or rng(0)
    t = tt(dur)
    K = max(1, int(min(28, 7000 / f)))
    tau0 = 0.55 * (110 / f) ** 0.35
    y = np.zeros_like(t)
    for k in range(1, K + 1):
        ak = abs(np.sin(np.pi * k * pos)) / k ** (1.3 - 0.6 * bright)
        tau = tau0 / (1 + 0.45 * (k - 1) * (f / 150) ** 0.4)
        fk = k * f * np.sqrt(1 + 2e-5 * k * k)
        y += ak * np.exp(-t / tau) * np.sin(TAU * fk * t + r.uniform(0, TAU))
    y += lp(r.standard_normal(len(t)), 700) * np.exp(-t / 0.008) * 0.15
    return fades(y * vel * (1 - np.exp(-t / 0.0015)), 0.0005, 0.06)


SUB_OCT = 0.22                     # sub-octave level vs the harmonic series (k = 1 sits at ~0.66): ~ -9.5 dB under the fundamental


def bass_pizz(f, vel=0.7, r=None, length=0.45, slide=0.0):
    """upright-bass pizzicato: round fundamental, finger thump, tiny pitch blip on the attack, muted after `length` s;
    slide = semitones the note bends into its pitch from below (sly scoop)"""
    r = r or rng(0)
    dur = length + 0.25
    n = ns(dur)
    t = np.arange(n) / SR
    cents = 14 * np.exp(-t / 0.025) + (slide * 100 * -np.exp(-t / 0.06) if slide else 0.0)
    ph = phase(f * 2 ** (cents / 1200))
    tau0 = float(np.clip(0.9 * (55.0 / f) ** 0.3, 0.35, 1.0))
    y = np.zeros(n)
    K = max(1, int(min(16, 2400 / f)))
    for k in range(1, K + 1):
        ak = abs(np.sin(np.pi * k * 0.23)) / k ** 1.25
        tau = tau0 / (1 + 0.6 * (k - 1))
        y += ak * np.exp(-t / tau) * np.sin(k * ph * (1 + 1.2e-4 * k * k) + r.uniform(0, TAU))
    # A3 P3 (spectral balance): a soft sub octave under the fundamental (a sine one octave down, slower attack, decays
    # with the note), so the score has weight under the voice in the 35-60 Hz bins without muddying the pluck
    if SUB_OCT > 0:
        y += SUB_OCT * (1 - np.exp(-t / 0.012)) * np.exp(-t / (tau0 * 0.85)) * np.sin(0.5 * ph + r.uniform(0, TAU))
    y *= 1 - np.exp(-t / 0.003)
    thump = lp(r.standard_normal(n), 260, 2) * np.exp(-t / 0.012) * 0.55
    y = y + thump
    y = _damp(y, length, 0.045)
    y = peq(y, 110, 2.5, 0.9)
    return fades(y * vel, 0.0005, 0.03)


# ---------------------------------------------------------------- pads
def pad(freqs, dur, vel=0.5, r=None, att=0.6, rel=0.9, warm=900.0, detune=7.0, trem=None):
    """warm pad: three detuned saw voices per note through a gentle roll-off; stereo"""
    r = r or rng(0)
    n = ns(dur + rel)
    t = np.arange(n) / SR
    env = np.ones(n)
    a = ns(att)
    env[:a] = ramp(a)
    d = ns(dur)
    env[d:] *= ramp(n - d)[::-1]
    out = np.zeros((2, n))
    for f in freqs:
        for vi, (dc, pn) in enumerate([(-detune, -0.6), (0.0, 0.0), (detune, 0.6)]):
            cents = dc + 3 * np.sin(TAU * r.uniform(0.15, 0.4) * t + r.uniform(0, TAU))
            ph = phase(f * 2 ** (cents / 1200))
            K = max(1, int(min(30, 4000 / f)))
            y = np.zeros(n)
            for k in range(1, K + 1):
                y += (1 / k) / (1 + (k * f / warm) ** 2) * np.sin(k * ph + r.uniform(0, TAU))
            th = (pn + 1) * np.pi / 4
            out[0] += y * np.cos(th)
            out[1] += y * np.sin(th)
    if trem is not None:
        out *= trem(t)[None, :]
    return out * env[None, :] * vel / np.sqrt(len(freqs) * 3)


def glass_pad(freqs, dur, vel=0.5, r=None, att=0.5, rel=0.8, bright=0.25, swell=None):
    """cool glassy pad: near-sine voices (soft 2nd/3rd partials), slow chorus, wide; swell(t) = optional gain curve"""
    r = r or rng(0)
    n = ns(dur + rel)
    t = np.arange(n) / SR
    env = np.ones(n)
    a = max(1, ns(att))
    env[:a] = ramp(a)
    d = min(n, ns(dur))
    env[d:] *= ramp(n - d)[::-1]
    out = np.zeros((2, n))
    for f in freqs:
        for dc, pn in [(-5.0, -0.7), (4.0, 0.7), (0.0, 0.0)]:
            cents = dc + 4 * np.sin(TAU * r.uniform(0.12, 0.3) * t + r.uniform(0, TAU))
            ph = phase(f * 2 ** (cents / 1200))
            y = np.sin(ph) + 0.22 * bright * 4 * np.sin(2 * ph + 0.3) / 4 + 0.07 * bright * np.sin(3 * ph + 1.1)
            th = (pn + 1) * np.pi / 4
            out[0] += y * np.cos(th)
            out[1] += y * np.sin(th)
    if swell is not None:
        out *= swell(t)[None, :]
    return out * env[None, :] * vel / np.sqrt(len(freqs) * 3)

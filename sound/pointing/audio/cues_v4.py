# THE v4 CUE SHEET (SCRIPT_v4.md after the length cut): every effect and bed on the CLOCK (clock_v4.Clock: the DIRECTOR's
# shots + the voice's words): an effect on every [cue] of SHOT_TABLE_v4.md, anchored on a shot's cut or a word. Light and bright: small
# details on visible actions, 12-25 onsets per 10 s, machines only on story events; no laughs anywhere.
#   anchor  ("L", 5, "s")  start of line 5 / ("L", 5, "e") its end / ("W", 5, "five") the word "five" of line 5 (first)
#   lv      LU under the voice (mix_targets then trims the stems: ambience 28 LU under, effects 21 LU under)
# Places: the LAB (lines 1-9, 11a, 22: room, the lamp's beeps, buttons, a counter, red X pops, a clipboard, chairs),
# a KITCHEN (10: the fridge's hum, its door, a cereal box), today's sunny PLATFORM + modern CAB (11b-12), the STEAM
# engine around 1910 and its cab (13-18: chuffs, a whistle, the firebox), a NEW YORK subway station (19-21: rumble,
# brakes on the arrival, the door chime after the point, the cardboard sign).
import numpy as np
from dsp import SR, ns, tt, rng, pan, place, dbg, lp, hp, bp, fades, st, colored, smooth_noise
import foley as Fo
import lib
import hook_v4 as HK

TAU = 2 * np.pi


# ---------------------------------------------------------------- new sounds (synthesized here; recordings where named)
def lab_room(dur, seed=1):
    """the lab: a bright quiet room, air handling and a faint ballast hum (no tone in 0.8-1.5 kHz)"""
    r = rng(3000 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    air = np.stack([lp(hp(colored(n, r, 1.0), 120, 1), 7000, 1) for _ in range(2)])
    hum = 0.06 * sum(np.sin(TAU * 100 * k * t) / k for k in (1, 2, 3))
    return fades(air + st(hum), 0.2, 0.2)


def counter_tick(seed=1):
    """a small mechanical counter flicking on (a dry plastic tick with a tiny spring)"""
    r = rng(3010 + seed)
    t = tt(0.05)
    y = hp(r.standard_normal(len(t)), 3000, 2) * np.exp(-t / 0.0009) + 0.4 * np.sin(TAU * 2900 * t) * np.exp(-t / 0.004)
    return st(fades(y, 0.0002, 0.01)), 0.0


def red_x(seed=1):
    """a red X popping up on a screen: a short bright downward 'bwip' (cartoon UI)"""
    t = tt(0.11)
    f = 1500 - 700 * (t / 0.11)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.002))
    return st(fades(y, 0.0005, 0.02)), 0.0


def clipboard(seed=1):
    """a clipboard landing flat on a desk: a light hollow slap"""
    r = rng(3020 + seed)
    t = tt(0.25)
    y = bp(r.standard_normal(len(t)), 300, 3500, 2) * np.exp(-t / 0.018) + 0.5 * np.sin(TAU * 210 * t) * np.exp(-t / 0.03)
    return st(fades(y, 0.0003, 0.05)), 0.0


def chair(seed=1):
    """a chair shifting: a short soft creak (a recorded leather creak, cut short)"""
    x = lib.cut("leather_a" if seed % 2 else "leather_b", 0.01, 0.05, b=0.35)
    return hp(x, 300, 1), 0.0


def fridge(dur, seed=1):
    """a kitchen fridge: compressor hum 50 Hz family + a soft fan (low, no tone in the voice's band)"""
    r = rng(3030 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    y = 0.5 * sum(np.sin(TAU * 50 * k * t + r.uniform(0, TAU)) / k ** 1.3 for k in (1, 2, 3, 4)) + 0.4 * lp(colored(n, r, 0.5), 600, 1)
    return st(fades(y, 0.15, 0.2)), 0.0


def fridge_door(seed=1):
    """the fridge door: the seal's soft suck and a glass jar's clink"""
    r = rng(3040 + seed)
    t = tt(0.4)
    suck = lp(r.standard_normal(len(t)), 900, 2) * np.exp(-((t - 0.05) / 0.04) ** 2)
    clink = 0.6 * (np.sin(TAU * 2650 * t) + 0.5 * np.sin(TAU * 4100 * t)) * np.exp(-np.clip(t - 0.22, 0, None) / 0.05) * (t > 0.22)
    return st(fades(suck + clink, 0.002, 0.05)), 0.05


def cereal(seed=1):
    """a cereal box shaken once: a dry rattle"""
    r = rng(3050 + seed)
    t = tt(0.45)
    env = np.exp(-((t - 0.15) / 0.09) ** 2)
    y = bp(r.standard_normal(len(t)) * (r.random(len(t)) > 0.92), 1500, 7000, 2) * env
    return st(fades(y, 0.005, 0.05)), 0.12


def platform_air(dur, seed=1):
    """today's sunny platform: open air, far city, Japanese crows + a few sparrows (recordings), very low"""
    r = rng(3060 + seed)
    n = ns(dur)
    air = np.stack([lp(colored(n, r, 1.3), 700, 2) for _ in range(2)])
    cr = lib.cut("crows_far", 0.5, 0.5)
    o = int(r.integers(0, max(1, cr.shape[1] - n)))
    air = air / (np.sqrt(np.mean(air ** 2)) + 1e-12) + 0.35 * Fo._loop(lp(cr[:, o:], 3200, 1), n, 0.5) / (np.sqrt(np.mean(cr ** 2)) + 1e-12)
    return fades(air, 0.15, 0.15), 0.0


def chuff(seed=1, big=1.0):
    """ONE steam chuff: a burst of exhaust (band noise with a fast attack, a soft boom under it)"""
    r = rng(3070 + seed)
    t = tt(0.34)
    burst = bp(r.standard_normal(len(t)), 500, 6500, 2) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.003))
    boom = 0.35 * np.sin(TAU * (70 + 30 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.08)
    return st(fades(big * (burst + boom), 0.0005, 0.05)), 0.0


def wheel_tick(seed=1):
    """a rail joint under a wheel: a small bright metallic tick (two partials, 4 ms) with a dull thump"""
    r = rng(3075 + seed)
    t = tt(0.06)
    y = (np.sin(TAU * 2350 * t) + 0.6 * np.sin(TAU * 3720 * t)) * np.exp(-t / 0.004) + 0.5 * bp(r.standard_normal(len(t)), 150, 900, 2) * np.exp(-t / 0.012)
    return st(fades(y, 0.0002, 0.01))


def steam_run(dur, rate=3.2, seed=1, dull=0, wheels=0.0):
    """the engine thundering past: chuffs at `rate` per second with the wheel rhythm, a firebox roar, rods' clank;
    wheels > 0: the rail joints' clickety-clack (pairs of light bright ticks, about 1.7 pairs a second) at that weight"""
    r = rng(3080 + seed)
    n = ns(dur)
    y = np.zeros((2, n))
    t0 = 0.0
    k = 0
    while t0 < dur:
        c, _ = chuff(seed * 100 + k, big=1.0 if k % 2 == 0 else 0.7)
        place(y, c, t0)
        t0 += 1.0 / rate
        k += 1
    if wheels:
        ref = np.sqrt(np.mean(y ** 2)) + 1e-12
        wk = np.zeros((2, n))
        t0, k = 0.13, 0
        while t0 < dur:
            for j, dt in enumerate((0.0, 0.11)):
                place(wk, wheel_tick(seed * 50 + 2 * k + j) * (1.0 if j == 0 else 0.8), t0 + dt)
            t0 += 0.58
            k += 1
        y = y + wheels * wk * ref / (np.sqrt(np.mean(wk ** 2)) + 1e-12)
    roar = np.stack([lp(colored(n, r, 1.0), 400, 2) for _ in range(2)])
    roar *= 0.35 * np.sqrt(np.mean(y ** 2)) / (np.sqrt(np.mean(roar ** 2)) + 1e-12)
    y = y + roar
    if dull:
        y = lp(y, 1400, 2)
    return fades(y, 0.08, 0.25), 0.0


def whistle(dur=0.9, seed=1):
    """a steam whistle: a breathy chord (no bell, no melody), a quick rise and a tail"""
    r = rng(3090 + seed)
    t = tt(dur)
    env = np.clip(t / 0.06, 0, 1) * np.exp(-np.clip(t - dur * 0.6, 0, None) / 0.12)
    y = sum(a * np.sin(TAU * f * (1 + 0.004 * np.sin(TAU * 5.5 * t)) * t) for f, a in ((622, 1.0), (740, 0.8), (932, 0.6)))
    y = y * env + 0.25 * bp(r.standard_normal(len(t)), 600, 3000, 2) * env
    return st(fades(y, 0.005, 0.08)), 0.0


def shovel(seed=1):
    """the coal man's shovel: a scrape into coal and a throw (a short gritty scrape + rattle)"""
    r = rng(3100 + seed)
    t = tt(0.5)
    scrape = bp(r.standard_normal(len(t)), 1800, 6500, 2) * np.exp(-((t - 0.12) / 0.07) ** 2)
    rattle = bp(r.standard_normal(len(t)) * (r.random(len(t)) > 0.85), 900, 5000, 2) * np.exp(-((t - 0.33) / 0.06) ** 2)
    return st(fades(scrape + 0.7 * rattle, 0.003, 0.05)), 0.1


def subway(dur, seed=1):
    """a New York station: the tunnel's low rumble and a train arriving (wheel roar rising, then easing)"""
    r = rng(3110 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    rum = np.stack([lp(colored(n, r, 1.2), 300, 2) for _ in range(2)])
    rum *= (0.4 + 0.6 * np.clip(t / max(0.5, dur * 0.4), 0, 1))[None, :]
    return fades(rum, 0.2, 0.3), 0.0


def brakes(dur=1.2, seed=1):
    """subway brakes on the arrival: a soft rising-then-fading squeal pair (high, short: a story event)"""
    t = tt(dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    y = (np.sin(TAU * np.cumsum(2700 + 250 * t) / SR) + 0.5 * np.sin(TAU * np.cumsum(3900 - 200 * t) / SR)) * env
    return st(fades(0.6 * y, 0.02, 0.1)), 0.0


def ny_chime(seed=1):
    """the doors' chime after the point (our own two soft tones, falling: not the MTA's announcement)"""
    t = tt(0.9)
    y = np.zeros(len(t))
    for k, (f, a) in enumerate(((1175, 0.0), (880, 0.32))):
        m = t >= a
        u = t[m] - a
        y[m] += (np.sin(TAU * f * u) + 0.2 * np.sin(TAU * 2 * f * u)) * np.exp(-u / 0.35) * (1 - np.exp(-u / 0.004))
    return st(fades(y, 0.001, 0.05)), 0.0


def sign(seed=1):
    """a big cardboard sign lifted: a hollow flap + a crinkle"""
    r = rng(3120 + seed)
    t = tt(0.4)
    flap = lp(r.standard_normal(len(t)), 1200, 2) * np.exp(-((t - 0.08) / 0.05) ** 2)
    crink = bp(r.standard_normal(len(t)) * (r.random(len(t)) > 0.9), 2000, 8000, 2) * np.exp(-((t - 0.2) / 0.08) ** 2)
    return st(fades(flap + 0.6 * crink, 0.003, 0.05)), 0.05


def beep_click(seed=1):
    """the hook's lamp beep + button click, the same on every 'Go' (hook_v4)"""
    r = rng(3130 + seed)
    y = np.zeros((2, ns(0.2)))
    place(y, pan(HK.beep(), 0.0), 0.0)
    place(y, pan(0.12 * HK.click(r), 0.05), 0.004)
    return y, 0.0


# ---------------------------------------------------------------- more small sounds (v4, on the shot table's [cues])
def pen(seed=1):
    """a researcher's pen scratching two quick strokes (behind the glass: soft)"""
    r = rng(3200 + seed)
    t = tt(0.32)
    env = np.exp(-((t - 0.07) / 0.035) ** 2) + 0.7 * np.exp(-((t - 0.2) / 0.04) ** 2)
    y = bp(r.standard_normal(len(t)), 2500, 8000, 2) * env * (0.6 + 0.4 * np.sin(TAU * 38 * t))
    return st(fades(y, 0.003, 0.04)), 0.0


def clock_tick(seed=1):
    """a wall clock's tick (the recorded tick, a little dulled)"""
    x = lib.cut("ui_tick", 0.001, 0.02)
    return lp(x, 6000, 1), 0.0


def switch_clunk(seed=1):
    """the researcher's big switch: a chunky lever clunk (a plastic bonk + a metal snap)"""
    r = rng(3210 + seed)
    t = tt(0.25)
    snap = hp(r.standard_normal(len(t)), 1800, 2) * np.exp(-t / 0.004)
    body = 0.8 * np.sin(TAU * (180 + 60 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.05)
    b = lib.cut("bonk_low", 0.001, 0.05)
    y = st(fades(snap + body, 0.0003, 0.05))
    m = min(y.shape[1], b.shape[1])
    y[:, :m] += 0.6 * b[:, :m] / (np.abs(b).max() + 1e-9)
    return y, 0.0


def flap(seed=1, n=3, gap=0.045):
    """a split-flap board flipping (n quick plastic clacks)"""
    r = rng(3220 + seed)
    y = np.zeros((2, ns(0.1 + n * gap)))
    for k in range(n):
        t = tt(0.03)
        c = bp(r.standard_normal(len(t)), 1500, 7000, 2) * np.exp(-t / 0.003) + 0.4 * np.sin(TAU * 1100 * t) * np.exp(-t / 0.004)
        place(y, st(fades(c, 0.0002, 0.005)) * (0.7 + 0.3 * r.random()), k * gap)
    return y, 0.0


def tick_good(seed=1):
    """the green tick popping: a bright two-note 'ding-ding' going up (E6 -> A6), soft"""
    t = tt(0.45)
    y = np.zeros(len(t))
    for f, a in ((1319, 0.0), (1760, 0.09)):
        m = t >= a
        u = t[m] - a
        y[m] += (np.sin(TAU * f * u) + 0.15 * np.sin(TAU * 3 * f * u)) * np.exp(-u / 0.12) * (1 - np.exp(-u / 0.003))
    return st(fades(y, 0.001, 0.05)), 0.0


def boing(seed=1):
    """'...for your brain': a tiny comic boing (a short sine whose pitch wobbles down)"""
    t = tt(0.35)
    f = 420 * (1 + 0.25 * np.sin(TAU * 14 * t) * np.exp(-t / 0.15)) * (1 - 0.3 * t)
    y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.12) * (1 - np.exp(-t / 0.003))
    return st(fades(y, 0.001, 0.04)), 0.0


def kettle(dur, seed=1):
    """a kettle's soft steam hiss (high, airy, no tone)"""
    r = rng(3230 + seed)
    n = ns(dur)
    y = np.stack([bp(r.standard_normal(n), 3000, 9000, 2) for _ in range(2)]) * smooth_noise(n, r, 3.0)[None, :] ** 2
    return fades(y, 0.3, 0.3), 0.0


def wings(seed=1, n=4):
    """a pigeon / birds lifting off: quick wing flaps (cloth whooshes cut short)"""
    y = np.zeros((2, ns(0.15 * n + 0.3)))
    for k in range(n):
        x = Fo.cloth("abcd"[(seed + k) % 4], seed=seed * 10 + k, dur=0.12, bright=0.6)
        place(y, st(x) * (0.9 - 0.12 * k), 0.11 * k)
    return y, 0.0


def crackle(dur, seed=1):
    """the firebox: sparse bright crackles"""
    r = rng(3250 + seed)
    n = ns(dur)
    y = np.zeros(n)
    t = tt(0.012)
    for t0 in np.cumsum(r.exponential(0.09, int(dur / 0.09) + 5)):
        i = ns(t0)
        if i + len(t) >= n:
            break
        y[i:i + len(t)] += r.uniform(0.3, 1.0) * hp(r.standard_normal(len(t)), 2500, 2) * np.exp(-t / 0.002)
    return st(fades(y, 0.05, 0.1)), 0.0


def pencil(seed=1):
    """a pencil writing a word and underlining it with a flourish"""
    r = rng(3260 + seed)
    t = tt(0.7)
    env = sum(np.exp(-((t - c) / 0.03) ** 2) for c in (0.05, 0.14, 0.22, 0.3)) + 1.3 * np.exp(-((t - 0.52) / 0.07) ** 2)
    y = bp(r.standard_normal(len(t)), 2000, 7500, 2) * env
    return st(fades(y, 0.003, 0.05)), 0.0


def door_slide(seed=1):
    """the subway doors sliding open (foley.door_slide, opening)"""
    x = Fo.door_slide(1.0, closing=False, seed=seed)
    x = x[0] if isinstance(x, tuple) else x
    return st(x), 0.0


def steps(seed=1, n=4, gap=0.42, kind="shoe"):
    y = np.zeros((2, ns(gap * n + 0.4)))
    for k in range(n):
        x, _ = Fo.step(kind, seed=seed + k, hard=0.8)
        place(y, st(x), gap * k)
    return y, 0.0


def glide_in(seed=1, dur=1.8):
    """today's train gliding in: a smooth rolling wash easing to the stop (no motor tone)"""
    r = rng(3270 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    roll = np.stack([lp(colored(n, r, 1.0), 900, 2) for _ in range(2)]) * (1 - np.clip(t / dur, 0, 1) ** 1.5)[None, :]
    return fades(roll / (np.abs(roll).max() + 1e-9), 0.2, 0.2), 0.0


def tap_click(seed=1, big=1.0):
    """a BRIGHT plastic button click (audit r2: the v16 auto-taps had nothing above 1 kHz): a hard tick at 2-7 kHz, a small
    2.8 kHz ring of the plastic and a short low body; big > 1 = a slam (more body and a second rattle)"""
    r = rng(3290 + seed)
    t = tt(0.09)
    tick = 0.6 * bp(r.standard_normal(len(t)), 2000, 7000, 2) * np.exp(-t / 0.0018) * (1 - np.exp(-t / 0.0002))
    ring = 0.6 * (np.sin(TAU * (2800 + 120 * r.random()) * t) + 0.5 * np.sin(TAU * 4300 * t)) * np.exp(-t / 0.012) * (1 - np.exp(-t / 0.0005))
    body = (0.35 + 0.35 * (big - 1)) * np.sin(TAU * (330 - 60 * (big - 1)) * t) * np.exp(-t / 0.012)
    y = tick + ring + body
    if big > 1:
        y += 0.5 * bp(r.standard_normal(len(t)), 1500, 6000, 2) * np.exp(-np.clip(t - 0.018, 0, None) / 0.004) * (t > 0.018)
    return st(fades(y, 0.0002, 0.02)), 0.0


def red_small(seed=1):
    """v09's red flood: the hook's thud, alone (the music keeps going)"""
    y = HK.thud(rng(3300 + seed))
    return st(y), 0.0


FN = dict(lab_room=lab_room, counter_tick=counter_tick, red_x=red_x, clipboard=clipboard, chair=chair, fridge=fridge, fridge_door=fridge_door,
          cereal=cereal, platform_air=platform_air, chuff=chuff, steam_run=steam_run, whistle=whistle, shovel=shovel, subway=subway, brakes=brakes,
          ny_chime=ny_chime, sign=sign, beep_click=beep_click, pen=pen, clock_tick=clock_tick, switch_clunk=switch_clunk, flap=flap,
          tick_good=tick_good, boing=boing, kettle=kettle, wings=wings, crackle=crackle, pencil=pencil, door_slide=door_slide, steps=steps,
          glide_in=glide_in, red_small=red_small, tap_click=tap_click, fwip=Fo.fwip, cloth=Fo.cloth, step=Fo.step, button=Fo.button, bubble_pop=Fo.bubble_pop)


# ---------------------------------------------------------------- generated recordings (ElevenLabs SFX batch 2, 2026-11-20 16:52;
# prompts in _eleven/credits_log.jsonl; chosen by measurement with take_measure.py, never by ear). A cue listed here plays the
# recording instead of its synthesized sound (the synthesized one stays as the fallback when the file is missing).
# id: (take, start s, length s or None, high-pass Hz or 0, loop to the span: bool)
REC_FOR = {
    "lab.switch": ("switch_t1", 0.0, 0.5, 120, False),
    "lab.ctr98": ("counter_t2", 0.0, 0.12, 300, False), "lab.ctr99": ("counter_t2", 0.0, 0.12, 300, False), "lab.ctr100": ("counter_t2", 0.0, 0.12, 300, False),
    "lab.ctr101": ("flapboard_t1", 0.05, 0.45, 300, False),
    "lab.board0": ("flapboard_t2", 0.0, 0.6, 300, False), "tdy.board": ("flapboard_t2", 0.0, 0.5, 300, False),
    "kit.door": ("fridge_t2", 0.0, 1.0, 150, False), "kit.cereal": ("cereal_t1", 0.0, 0.7, 200, False),
    "tdy.glide": ("glide_in_t2", 0.0, 1.6, 60, False),
    "steam.thunder": ("steam_pass_t2", 0.0, None, 60, False), "bed.steam_cab": ("steam_cab_t1", 0.0, None, 70, True),
    "bed.steam_dry": ("steam_cab_t1", 2.0, None, 70, True),
    "steam.whistle": ("whistle_t1", 0.0, 0.9, 300, False),
    "steam.shovel": ("shovel_t1", 0.0, 0.8, 200, False), "steam.shovel2": ("shovel_t2", 0.0, 0.8, 200, False),
    "ny.brakes": ("subway_in_t2", 0.0, 2.0, 60, False), "ny.doors": ("doors_open_t1", 0.0, 1.0, 150, False),
    "lab.card": ("cardboard_t2", 0.0, 0.6, 200, False), "ny.sign": ("cardboard_t1", 0.0, 0.7, 200, False),
}
REJECTED = {"lab_room_t1": "near-silent (-75 dBFS)", "lab_room2_t1": "near-silent (-71 dBFS)", "subway_in_t1": "centroid 979 Hz: a brake squeal near 1 kHz (the steady-tone rule)",
            "cereal_t2": "spare", "fridge_t1": "a low thump, no clink (centroid 389 Hz)", "switch_t2": "spare (longer)", "counter_t1": "spare",
            "glide_in_t1": "hiss only (<200 Hz -15.6)", "steam_pass_t1": "thinner (<200 Hz -23)", "whistle_t2": "longer, duller", "doors_open_t2": "a thump only (centroid 147 Hz)"}


def rec_take(name, a=0.0, length=None, hpf=0, loop_to=None):
    """a generated take as (2, n) and its lead (the onset inside the cut, so the onset lands on the cue time)"""
    import os, soundfile as sf
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_eleven", "v4", name + ".wav")
    if not os.path.exists(p):
        return None
    x, sr = sf.read(p, dtype="float64")
    x = x.T if x.ndim > 1 else np.stack([x, x])
    x = x[:, ns(a):]
    if loop_to:
        x = Fo._loop(x, ns(loop_to), 0.4) if x.shape[1] < ns(loop_to) else x[:, :ns(loop_to)]
    elif length:
        x = x[:, :ns(length)]
    if hpf:
        x = hp(x, hpf, 2)
    x = fades(x, 0.002, 0.08 if not loop_to else 0.3)
    m = x.mean(0)
    k = ns(0.005)
    e = 10 * np.log10(np.convolve(m ** 2, np.ones(k) / k, "same") + 1e-20)
    lead = float(np.argmax(e > e.max() - 30) / SR) if not loop_to else 0.0
    return x, lead


# ---------------------------------------------------------------- the sheet (on the CLOCK: clock_v4.Clock)
# anchors: ("L", 5, "s"|"e") line 5's start / end; ("W", 5, "five"[, n]) the n-th word "five" of line 5; ("K", "go#3") a clock
# key; ("S", "v10", "a"|"b") a shot's cut; ("+", anchor, dt); "END". A cue on something the clock does not have is dropped.
def C(id, t, snd, lv, what, bus="sfx", pan_=0.0, **kw):
    return dict(id=id, t=t, snd=snd, lv=lv, what=what, bus=bus, pan=pan_, kw=kw)


def sheet():
    L = lambda k, se="s": ("L", k, se)
    W = lambda k, w, i=1: ("W", k, w, i)
    S = lambda s, e="a": ("S", s, e)
    K = lambda k: ("K", k)
    P = lambda a, d: ("+", a, d)
    E = lambda name, i, fb, dt=0.0: ("E", name, i, fb, dt)
    X = []
    # ---- beds (ambience): one per place. The opening's room (lines 1-3, with the held beat) is hook_v4's; this lab bed
    # takes over after "She did."
    X += [C("bed.lab", (P(L(3, "e"), 0.05), S("v17")), "lab_room", -30, "the lab's room: the 1994 trap, the rows, the counter", bus="amb"),
          C("bed.kitchen", (S("v17"), S("v18")), "fridge", -30, "the kitchen fridge's hum", bus="amb"),
          C("bed.kettle", (S("v17"), S("v18")), "kettle", -34, "a kettle's soft steam", bus="amb"),
          C("bed.lab2", (S("v18"), S("v19")), "lab_room", -31, "back in the lab: she points and says it", bus="amb"),
          C("bed.platform", (S("v19"), S("v22")), "platform_air", -32, "today's sunny platform + the cab: open air, far crows", bus="amb"),
          # AUDIT r1 (2026-11-21): the engine went silent on screen (v22 heard ~1 s of 2.9; every bus under -55 dBFS at 37.5 s).
          # Now: the recorded pass on the hard cut + the engine's own run (chuffs, rods, the rail joints) for ALL of v22, then a
          # 0.2 s cross-fade into the cab (v23..v30: chuff, wheels, the fire), then v30 from outside the window, to v31's cut
          C("steam.thunder", (S("v22"), P(S("v23"), 0.1)), "steam_run", -25, "THE HARD CUT: the black steam engine thunders through the fields (a story event)", bus="sfx"),
          C("bed.fields", (P(S("v22"), -0.1), P(S("v23"), 0.2)), "platform_air", -31, "v22: the open fields under the engine (air, far birds): the ambience never drops to zero in a running-engine shot", bus="amb", seed=9),
          C("steam.run", (S("v22"), P(S("v23"), 0.2)), "steam_run", -18, "v22: the engine running past, the whole shot (chuffs, rods, rail joints): light and bright", bus="sfx", rate=3.3, wheels=0.55, seed=5),
          C("bed.steam_cab", (P(S("v23"), -0.2), S("v30")), "steam_run", -29, "inside the cab: the engine's chuff and the wheels under the shouts", bus="amb", rate=2.4, dull=1),
          C("bed.cab_wheels", (P(S("v23"), -0.2), P(S("v31"), 0.1)), "steam_run", -30, "the cab: the rail joints' clickety-clack + light chuffs (bright, so the engine reads on a phone)", bus="amb", rate=2.4, wheels=1.2, seed=7),
          C("bed.fire", (S("v23"), S("v31")), "crackle", -33, "the firebox crackling (every cab shot)", bus="amb"),
          C("bed.steam_dry", (P(S("v30"), -0.2), P(S("v31"), 0.1)), "steam_run", -33, "line 18 (from outside the round window): the engine running, softer", bus="amb", rate=2.6, dull=1),
          C("bed.subway", (S("v31"), S("v36a")), "subway", -31, "a New York station: the tunnel's low rumble", bus="amb"),
          C("bed.lab3", (S("v36a"), "END"), "lab_room", -30, "the lab again: the loop's room into frame 0", bus="amb")]
    # ---- the opening's small details (the hook's beeps, red hit, held beat and sting are hook_v4's)
    X += [C("lab.pen1", P(S("v01"), 0.55), "pen", -33, "v01: the researcher behind the glass writes", pan_=0.35),
          C("lab.pen3", P(K("go#2"), 0.2), "pen", -34, "v03: the researcher's pen ticking along with the run", pan_=0.35, seed=3)]
    # ---- the 1994 lab (lines 4-8)
    X += [C("lab.steps", P(S("v06"), 0.25), "steps", -29, "v06: a second researcher walks the aisle", pan_=-0.3, n=4, gap=0.4),
          C("lab.switch", P(S("v07"), 0.30), "switch_clunk", -22, "v07: the grinning researcher flips the big switch (the trap)", pan_=0.15),
          C("lab.ctr98", P(S("v08"), 0.12), "counter_tick", -24, "v08: the counter flips to 98", pan_=0.25),
          C("lab.ctr99", P(S("v08"), 0.42), "counter_tick", -24, "v08: 99", pan_=0.25, seed=2),
          C("lab.ctr100", W(4, "hundred"), "counter_tick", -22, "v08: 100", pan_=0.25, seed=3),
          C("lab.red", S("v09"), "red_small", -22, "v09: one big RED floods the room (a soft thud; the music keeps going)"),
          C("lab.ctr101", P(S("v09"), 0.05), "flap", -27, "v09: the counter jumps to 101", pan_=0.25, n=2)]
    # AUDIT r2: v10b's five X's pop ONE BY ONE on the picture (f470/475/481/487/493 on the 08:01 draft) and the board flips
    # 2..5 OF 12 with X 2..5: an X pop on each, its slam 1.5 f before, a flap on each flip. The times come from the DIRECTOR's
    # EV.xPops / EV.boardFlips when exported; until then the 08:01 picture's offsets from v10b's cut stand in (provisional)
    XO = [10, 15, 21, 27, 33]
    X += [C("lab.press%d" % i, E("xPops", i, P(S("v10b"), XO[i] / 30.0), -1.5 / 30.0), "tap_click", -21, "v10b: a hand slams its button (1.5 f before its X)", pan_=-0.4 + 0.2 * i, seed=40 + i, big=1.6) for i in range(5)]
    X += [C("lab.x%d" % i, E("xPops", i, P(S("v10b"), XO[i] / 30.0)), "red_x", -23, "v10b: red X %d pops (on its picture frame)" % (i + 1), pan_=-0.4 + 0.2 * i, seed=i) for i in range(5)]
    X += [C("lab.flip%d" % i, E("boardFlips", i, P(S("v10b"), XO[i + 1] / 30.0)), "flap", -25 + (2 if i == 3 else 0), "v10b: the board flips to %d OF 12" % (i + 2), pan_=0.3, n=2 + (i == 3), seed=60 + i) for i in range(4)]
    X += [
          C("lab.card", P(S("v12"), 0.4), "sign", -27, "v12: the researcher raises the card with the pointing hand", pan_=0.2)]
    X += [C("lab.point%d" % i, P(S("v13"), 0.1 + 0.16 * i), "fwip", -27, "v13: twelve point at their lamps, one after another (a wave)", pan_=-0.5 + 0.15 * i, who="lab", seed=i, soft=0.5) for i in range(7)]
    X += [C("lab.board0", P(S("v14"), 0.15), "flap", -24, "v14: RED, nobody presses; the board flips to 0 OF 12", pan_=0.2, n=4),
          C("lab.clip", P(L(8, "e"), 0.05), "clipboard", -22, "after 'Not one pressed.': the researcher's clipboard down on the desk (with the music's hit)", pan_=0.2)]
    # ---- line 9: the bored volunteer's hand taps by itself
    # AUDIT r2: the auto-taps are BRIGHT plastic clicks (were a low thump, nothing above 1 kHz); the boing is cut (no face in v16)
    X += [C("lab.tap1", E("autoTaps", 0, W(9, "hand")), "tap_click", -22, "v16: his hand taps the button by itself", pan_=0.15, seed=20),
          C("lab.tap2", E("autoTaps", 1, P(W(9, "hand"), 0.45)), "tap_click", -22, "v16: ... taps again", pan_=0.15, seed=21)]
    # ---- the kitchen (10)
    X += [C("kit.door", P(S("v17"), 0.15), "fridge_door", -23, "v17: the fridge door, a jar clinks", pan_=-0.2),
          C("kit.cereal", W(10, "cereal"), "cereal", -23, "v17: the cereal box in the fridge rattles", pan_=0.1),
          C("kit.cat", W(10, "ends"), "steps", -33, "v17: the cat pads past", pan_=0.4, n=3, gap=0.18, kind="kid"),
          C("kit.cupboard", P(W(10, "fridge"), 0.1), "chair", -30, "v17: a cupboard door swings (a soft creak)", pan_=-0.4, seed=3)]
    # ---- back in the lab, then today's platform and the cab (11-12)
    X += [C("lab.her_point", W(11, "pointing"), "fwip", -22, "v18: she points at the red lamp and says it", who="lab", seed=40),
          C("lab.tick", W(11, "wait"), "tick_good", -24, "v18: the green tick pops", pan_=0.15),
          C("tdy.glide", S("v19"), "glide_in", -17, "v19: today's bright train glides in and stops (audit r2: about -36 dBFS under the line)", pan_=-0.2),
          C("tdy.steps", P(S("v19"), 0.3), "steps", -31, "v19: commuters walking on the platform", pan_=-0.5, n=2, gap=0.45, kind="sneaker"),
          C("tdy.pigeon", P(S("v19"), 1.0), "wings", -31, "v19: a pigeon flutters up", pan_=0.5, n=2),
          C("tdy.board", P(S("v19"), 0.6), "flap", -31, "v19: the departure board ticks", pan_=0.4, n=3),
          C("cab.glove", W(11, "point"), "fwip", -19, "v20: today's driver snaps a crisp side-on point (white glove)", who="driver", seed=2, crisp=1.0, pan_=0.1),
          C("car.kid", P(S("v21"), 0.02), "fwip", -24, "v21: the kid at the front window copies the point", who="kid", seed=3, pan_=-0.15)]
    # ---- the steam engine (13-18)
    # AUDIT r2: the hard cut gets WEIGHT: the whistle as a peak + three big first chuffs at about -28 dBFS for 0.5 s (the
    # tiptoe's first bar steps back 3 dB in mix_v4), then the run under the line; the birds on their lift-off frame
    X += [C("steam.whistle", E("engineIn", 0, P(S("v22"), 0.02)), "whistle", -11, "v22: the HARD cut: the steam whistle (a peak)", pan_=0.2),
          C("steam.chuff1", E("engineIn", 0, S("v22")), "chuff", -13, "v22: the engine's first big chuff on the cut", pan_=-0.1, seed=71, big=1.0),
          C("steam.chuff2", P(E("engineIn", 0, S("v22")), 0.17), "chuff", -15, "v22: second chuff", pan_=0.05, seed=72, big=0.9),
          C("steam.chuff3", P(E("engineIn", 0, S("v22")), 0.34), "chuff", -17, "v22: third chuff", pan_=0.1, seed=73, big=0.8),
          C("steam.birds", E("birdsLift", 0, P(S("v22"), 0.17)), "wings", -27, "v22: birds lift off the paddies (on the lift-off frame)", pan_=-0.4, n=3, seed=4),
          C("steam.turn", P(L(14), -0.12), "cloth", -26, "v24: he turns and shouts across the cab", kind="b", seed=4, pan_=0.2),
          C("steam.shovel", S("v25"), "shovel", -22, "v25: the coal man mid-shovel", pan_=-0.3),
          C("steam.shovel2", P(S("v25"), 0.8), "shovel", -24, "v25: ... another shovel of coal", pan_=-0.3, seed=2),
          C("steam.lean", P(S("v26"), 0.05), "cloth", -26, "v26: the coal man leans out to look", kind="c", seed=5, pan_=-0.3),
          C("steam.boss", P(S("v28"), 0.1), "chair", -28, "v28: the boss squeezed into the corner (a creak)", seed=6, pan_=0.4),
          C("steam.nod", W(17, "loved"), "cloth", -28, "v28: the boss nods, delighted", kind="d", seed=7, pan_=0.4),
          C("steam.pencil", S("v29"), "pencil", -25, "v29: he writes RULE and underlines it with a flourish", pan_=0.3)]
    # ---- New York (19-21)
    X += [C("ny.brakes", (P(S("v31"), 0.05), P(K("pointing#2"), 0.25)), "brakes", -26, "v31: the train in the station: its brakes ease (gone before the pause after 'pointing:': audit r1, whisper heard a word in the squeal there)", pan_=-0.3),
          C("ny.point", W(19, "point"), "fwip", -21, "v32: the conductor points at the striped board", who="lab", seed=50, pan_=0.2),
          C("ny.chime", P(E("doorsOpen", 0, P(W(19, "point"), 0.75)), -0.2), "ny_chime", -18, "v32: the doors' chime just before they open", pan_=-0.2),
          C("ny.doors", E("doorsOpen", 0, P(W(19, "point"), 0.75)), "door_slide", -18, "v32: only then the doors slide open (EV.doorsOpen when STATION shows it)", pan_=-0.2),
          C("ny.steps", P(S("v33"), 0.1), "steps", -29, "v33: the two step in under the board", pan_=0.1, n=2, gap=0.3, kind="sneaker"),
          C("ny.sign", W(20, "sign"), "sign", -22, "v33: the cardboard sign goes up", pan_=0.1),
          C("ny.sign2", P(W(20, "sign"), 0.3), "sign", -27, "v33-v34: the sign held up big (a crinkle, in the pause before the quote: off the word 'Point')", seed=2),
          C("ny.point2", W(21, "point"), "fwip", -20, "v35: ...and the conductor points at it (deadpan)", who="lab", seed=51, pan_=0.2)]
    # ---- the loop (22): she points, the lamp's room
    X += [C("loop.lamp", S("v36a"), "switch_clunk", -30, "v36a: the lamp dark again, her finger ready (a soft relay tick)", pan_=0.0),
          C("loop.point", W(22, "point"), "fwip", -22, "v36: she points (the arm up of frame 0)", who="lab", seed=60),
          C("loop.pen", P(S("v36"), 0.6), "pen", -31, "v36: the researcher writing (as in frame 0)", pan_=0.35, seed=4)]
    return X


def norm_w(w):
    return "".join(c for c in str(w).lower() if c.isalnum())


def resolve(a, C_, L):
    """an anchor -> seconds (None when it rests on something the clock does not have)"""
    if a == "END":
        return L
    k = a[0]
    if k == "E":                                                  # ("E", name, i, fallback, dt): the DIRECTOR's EV[name][i] + dt
        ev = getattr(C_, "EV", {}) or {}
        v = ev.get(a[1])
        v = v[a[2]] if isinstance(v, list) and len(v) > a[2] else (v if isinstance(v, (int, float)) and a[2] == 0 else None)
        b = float(v) if v is not None else resolve(a[3], C_, L)
        if v is None:
            EV_MISSING.add(a[1])
        return None if b is None else b + (a[4] if len(a) > 4 else 0.0)
    if k == "+":
        b = resolve(a[1], C_, L)
        return None if b is None else b + a[2]
    if k == "K":
        return C_.w(a[1])
    if k == "S":
        return C_.shot(a[1], a[2])
    lid = "L%02d" % a[1]
    if lid not in C_.lines:
        return None
    if k == "L":
        return C_.line(lid, a[2])
    w, i = norm_w(a[2]), (a[3] if len(a) > 3 else 1)
    hits = [t for t in C_.toks if t["line"] == lid and norm_w(t["w"]) == w]
    if len(hits) >= i:
        return float(hits[i - 1]["s"])
    FALLBACK.append(f"{lid}:{a[2]}#{i}")                       # the word is not in the line any more: reported, line start used
    return C_.line(lid, "s")


FALLBACK = []
EV_MISSING = set()


def render(C_, L, vref, n=None):
    """the sheet on the clock -> {sfx, amb} (2, n), the rows (time, frame, anchor, what), the dropped cue ids"""
    from dsp import momentary_max
    n = n or ns(L)
    bus = {"sfx": np.zeros((2, n)), "amb": np.zeros((2, n))}
    rows, dropped = [], []
    for c in sheet():
        span = isinstance(c["t"], tuple) and len(c["t"]) == 2 and (isinstance(c["t"][0], tuple) or c["t"][0] == "END")
        if span:
            a, b = resolve(c["t"][0], C_, L), resolve(c["t"][1], C_, L)
            if a is None or b is None or b <= a + 0.05:
                dropped.append(c["id"])
                continue
            rf = REC_FOR.get(c["id"])
            res = rec_take(rf[0], rf[1], None, rf[3], loop_to=max(0.3, b - a)) if rf and rf[4] else (rec_take(rf[0], rf[1], max(0.3, b - a), rf[3]) if rf else None)
            if res is None:
                dur_ = max(0.3, b - a) + (0.4 if c["t"][1] == "END" else 0.0)    # an END bed: rendered past L, its own fade cut off
                res = FN[c["snd"]](dur_, **{k: v for k, v in c["kw"].items() if k in ("seed", "rate", "dull", "wheels")})
            else:
                c = dict(c, what=c["what"] + f" [recorded: {rf[0]}]")
            t0 = a
        else:
            t0 = resolve(c["t"], C_, L)
            if t0 is None:
                dropped.append(c["id"])
                continue
            rf = REC_FOR.get(c["id"])
            res = rec_take(rf[0], rf[1], rf[2], rf[3]) if rf else None
            if res is None:
                res = FN[c["snd"]](**c["kw"])
            else:
                c = dict(c, what=c["what"] + f" [recorded: {rf[0]}]")
        x, lead = res if isinstance(res, tuple) else (res, 0.0)
        x = st(x)
        if span:                                                   # a bed that runs to the END is not faded out: it rings on
            x = fades(x[:, :ns(b - a)], 0.15, 0.0 if c["t"][1] == "END" else 0.15)   # into frame 0 (the loop; audit r1)
        mm = momentary_max(np.concatenate([np.zeros((2, ns(0.4))), x, np.zeros((2, ns(0.4)))], axis=1))
        g = dbg(vref + c["lv"] - mm)
        pk = 20 * np.log10(np.abs(x).max() * g + 1e-12)
        if pk > vref + c["lv"] + 14.0:                            # a click's level is its peak (as v3's cues.CREST)
            g *= dbg(vref + c["lv"] + 14.0 - pk)
        x = x * g
        if c["pan"]:
            p = float(c["pan"])
            x = np.stack([x[0] * min(1.0, 1 - p), x[1] * min(1.0, 1 + p)])
        place(bus[c["bus"]], x, t0 - lead)
        rows.append(dict(id=c["id"], t=round(t0, 3), frame=int(round(t0 * 30)), snd=c["snd"], lv=c["lv"], bus=c["bus"], what=c["what"],
                         anchor=str(c["t"]), end=round(b, 3) if span else None))
    dropped = dropped + ["(word not found, line start used) " + f for f in sorted(set(FALLBACK))] + \
        ["(EV.%s not exported: provisional fallback used)" % m for m in sorted(EV_MISSING)]
    return bus, sorted(rows, key=lambda r: r["t"]), dropped


if __name__ == "__main__":
    import clock_v4
    from dsp import integrated
    Ck = clock_v4.Clock()
    bus, rows, dropped = render(Ck, Ck.L, -13.7)
    ev = [r for r in rows if r["bus"] == "sfx"]
    print(f"{len(rows)} cues on the clock ({len(ev)} effect events + the hook's 10; {10 * (len(ev) + 10) / Ck.L:.1f} per 10 s), dropped {dropped}; "
          f"sfx {integrated(bus['sfx']):.1f}, amb {integrated(bus['amb']):.1f} LUFS")

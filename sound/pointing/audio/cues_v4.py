# THE v4 CUE SHEET (SCRIPT_v4.md, 22 lines): every effect and bed on a LINE / WORD anchor of the voice (and, once the
# director's v4 clock exists, on its shots / CAST beats through tl.EVT / tl.CAST like v3). Light and bright: small
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


def steam_run(dur, rate=3.2, seed=1, dull=0):
    """the engine thundering past: chuffs at `rate` per second with the wheel rhythm, a firebox roar, rods' clank"""
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


def brakes(seed=1, dur=1.2):
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


FN = dict(lab_room=lab_room, counter_tick=counter_tick, red_x=red_x, clipboard=clipboard, chair=chair, fridge=fridge, fridge_door=fridge_door,
          cereal=cereal, platform_air=platform_air, chuff=chuff, steam_run=steam_run, whistle=whistle, shovel=shovel, subway=subway, brakes=brakes,
          ny_chime=ny_chime, sign=sign, beep_click=beep_click,
          fwip=Fo.fwip, cloth=Fo.cloth, step=Fo.step, button=Fo.button, bubble_pop=Fo.bubble_pop)


# ---------------------------------------------------------------- the sheet
def C(id, t, snd, lv, what, bus="sfx", pan_=0.0, **kw):
    return dict(id=id, t=t, snd=snd, lv=lv, what=what, bus=bus, pan=pan_, kw=kw)


def sheet():
    """the cue list on line / word anchors; durations of beds are anchor pairs (start, end)"""
    L, W = lambda k, se="s": ("L", k, se), lambda k, w: ("W", k, w)
    S = []
    # beds (ambience bus): one per place, start -> end anchors
    S += [C("bed.lab", (L(1), L(9, "e")), "lab_room", -30, "the lab's room, under the test and the study", bus="amb"),
          C("bed.kitchen", (L(10), L(10, "e")), "fridge", -30, "the kitchen fridge's hum", bus="amb"),
          C("bed.lab2", (L(11), W(11, "which")), "lab_room", -31, "back in the lab: she points and says it", bus="amb"),
          C("bed.platform", (W(11, "which"), L(12, "e")), "platform_air", -32, "today's sunny platform: open air, far crows", bus="amb"),
          C("steam.thunder", (L(13), ("+", L(13), 4.0)), "steam_run", -24, "THE HARD CUT: the steam engine around 1910 thunders through the fields (a story event, 4 s)", bus="sfx"),
          C("bed.steam_cab", (("+", L(13), 3.6), L(17, "e")), "steam_run", -33, "inside the cab: the engine's chuff under the shouts, softer and duller", bus="amb", rate=2.4, dull=1),
          C("bed.steam_dry", (L(18), L(18, "e")), "steam_run", -34, "line 18, dry: the engine only, far and soft", bus="amb", rate=2.6),
          C("bed.subway", (L(19), L(21, "e")), "subway", -31, "a New York station: the tunnel's rumble, a train arriving", bus="amb"),
          C("bed.lab3", (L(22), "END"), "lab_room", -30, "the lab again: the loop's room into frame 0", bus="amb")]
    # the lab: the trap (lines 4-8)
    S += [C("lab.tick%d" % i, ("+", W(4, "hundred"), 0.08 * i), "counter_tick", -24, "the counter flicking through the hundred lights", pan_=0.3) for i in range(8)]
    S += [C("lab.press%d" % i, ("+", W(5, "pressed"), 0.11 * i), "button", -20, "five hands slam the buttons", pan_=-0.4 + 0.2 * i, seed=i) for i in range(5)]
    S += [C("lab.x%d" % i, ("+", W(5, "pressed"), 0.11 * i + 0.05), "red_x", -22, "five red X's pop up", pan_=-0.4 + 0.2 * i, seed=i) for i in range(5)]
    S += [C("lab.chair1", L(5, "e"), "chair", -27, "a chair shifts as they flinch", pan_=-0.5)]
    S += [C("lab.press2_%d" % i, ("+", W(6, "again"), 0.12 * i), "button", -20, "three hands down again", pan_=-0.2 + 0.2 * i, seed=10 + i) for i in range(3)]
    S += [C("lab.x2_%d" % i, ("+", W(6, "again"), 0.12 * i + 0.05), "red_x", -22, "three red X's", pan_=-0.2 + 0.2 * i, seed=10 + i) for i in range(3)]
    S += [C("lab.point%d" % i, ("+", W(7, "point"), 0.07 * i), "fwip", -26, "twelve point at their lamps, one after another", pan_=-0.5 + 0.09 * i, who="lab", seed=i, soft=0.5) for i in range(12)]
    S += [C("lab.clip", L(8, "e"), "clipboard", -18, "'Not one pressed.': the researcher's clipboard drops on the desk (the hit)", pan_=0.2)]
    # line 9: the bored volunteer's hand taps by itself
    S += [C("lab.tap%d" % i, ("+", L(9), 0.42 * i + 0.2), "button", -27, "his hand taps the button by itself", pan_=0.15, seed=20 + i) for i in range(5)]
    # the kitchen (10)
    S += [C("kit.door", L(10), "fridge_door", -22, "the fridge door, a jar clinks", pan_=-0.2),
          C("kit.cereal", W(10, "cereal"), "cereal", -22, "the cereal box rattles into the fridge", pan_=0.1)]
    # back in the lab, then the platform and the cab (11-12)
    S += [C("lab.her_point", W(11, "pointing"), "fwip", -20, "she points at the red lamp and says it", who="lab", seed=40),
          C("cab.glove", ("+", L(12), -0.12), "fwip", -16, "today's driver's white glove snaps out on 'Signal clear!'", who="driver", seed=2, crisp=1.0, pan_=0.1),
          C("cab.step", W(11, "which"), "step", -27, "a commuter's step on the sunny platform", kind="shoe", seed=4, pan_=-0.5)]
    # the steam engine (13-18): the HARD cut, the whistle, the coal man, the boss
    S += [C("steam.whistle", ("+", L(13), 0.05), "whistle", -16, "the HARD cut: the steam whistle", pan_=0.2),
          C("steam.shovel", L(15), "shovel", -21, "the coal man mid-shovel", pan_=-0.3),
          C("steam.shovel2", ("+", L(15), 0.9), "shovel", -23, "another shovel of coal", pan_=-0.3, seed=2),
          C("steam.lean", ("+", L(16), -0.15), "cloth", -26, "he leans out to look", kind="c", seed=5, pan_=-0.3),
          C("steam.boss", W(17, "boss"), "cloth", -27, "the boss squeezed into the corner, bowler hat", kind="a", seed=6, pan_=0.4),
          C("steam.nod", W(17, "rule"), "cloth", -27, "the boss beams and nods", kind="d", seed=7, pan_=0.4)]
    # New York (19-21)
    S += [C("ny.brakes", L(19), "brakes", -24, "the train pulls in (a story event): its brakes", pan_=-0.3),
          C("ny.point", W(19, "point"), "fwip", -20, "the conductor points at the board", who="lab", seed=50, pan_=0.2),
          C("ny.chime", ("+", W(19, "point"), 0.55), "ny_chime", -22, "the doors' chime after the point", pan_=-0.2),
          C("ny.sign", W(20, "sign"), "sign", -21, "the cardboard sign goes up", pan_=0.1),
          C("ny.point2", W(21, "point"), "fwip", -18, "...and the conductor points at it (deadpan)", who="lab", seed=51, pan_=0.2)]
    # the loop (22): she points, the lamp's room
    S += [C("loop.point", W(22, "point"), "fwip", -20, "she points (the arm up of frame 0)", who="lab", seed=60)]
    return S


def resolve(a, lines, words, L):
    """an anchor -> seconds"""
    if a == "END":
        return L
    if a[0] == "+":
        return resolve(a[1], lines, words, L) + a[2]
    k = a[1]
    ln = lines[k - 1]
    if a[0] == "L":
        return float(ln["s"] if a[2] == "s" else ln["e"])
    w = "".join(c for c in a[2].lower() if c.isalpha())
    hit = [x for x in words if float(ln["s"]) - 0.02 <= x["s"] <= float(ln["e"]) + 0.02 and "".join(c for c in x["w"].lower() if c.isalpha()) == w]
    return float(hit[0]["s"]) if hit else float(ln["s"])


def render(lines, words, L, vref):
    """the sheet -> {sfx, amb} (2, ns(L)) and the rows (time, frame, what) for the cue sheet document"""
    from dsp import momentary_max
    n = ns(L)
    bus = {"sfx": np.zeros((2, n)), "amb": np.zeros((2, n))}
    rows = []
    for c in sheet():
        if isinstance(c["t"], tuple) and len(c["t"]) == 2 and isinstance(c["t"][0], tuple) and c["t"][0][0] in ("L", "W", "+"):
            a, b = resolve(c["t"][0], lines, words, L), resolve(c["t"][1], lines, words, L)
            res = FN[c["snd"]](max(0.3, b - a), **{k: v for k, v in c["kw"].items() if k in ("seed", "rate", "dull")})
            t0 = a
        else:
            t0 = resolve(c["t"], lines, words, L)
            res = FN[c["snd"]](**c["kw"])
        x, lead = res if isinstance(res, tuple) else (res, 0.0)
        x = st(x)
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
        rows.append(dict(id=c["id"], t=round(t0, 3), frame=int(round(t0 * 30)), snd=c["snd"], lv=c["lv"], bus=c["bus"], what=c["what"]))
    return bus, sorted(rows, key=lambda r: r["t"])


if __name__ == "__main__":
    # a test on PLAN times, no voice: the cue sheet + the hook's beeps over the plan score -> _v4_plan_bed.wav
    import json, os
    import score_v4 as S4
    from dsp import write_wav, read_wav, integrated
    HERE = os.path.dirname(os.path.abspath(__file__))
    vref = -13.7
    lines, words, L = S4.plan_lines()
    bus, rows = render(lines, words, L, vref)
    n = ns(L)
    mus_p = os.path.join(HERE, "_score_v4_film_plan.wav")
    mus = read_wav(mus_p)[0][:, :n] if os.path.exists(mus_p) else np.zeros((2, n))
    _, fx_h, _, _ = HK.render_hook(dict(S4.v4_map(lines, words, L)[4], line1=(lines[0]["s"], lines[0]["e"])), 12.0, vref)
    fx = bus["sfx"].copy()
    fx[:, :fx_h.shape[1]] += fx_h[:, :min(n, fx_h.shape[1])]
    y = mus + fx + bus["amb"]
    write_wav(os.path.join(HERE, "_v4_plan_bed.wav"), y)
    for k, x in (("sfx", fx), ("amb", bus["amb"]), ("music", mus)):
        write_wav(os.path.join(HERE, f"_v4_plan_bed_{k}.wav"), x)
    onsets = len([r for r in rows if r["bus"] == "sfx"]) + 7
    json.dump(dict(rows=rows, L=L), open(os.path.join(HERE, "_v4_plan_bed.json"), "w"), indent=1)
    print(f"{len(rows)} cues ({onsets} effect events + the 7 beeps, {10 * onsets / L:.1f} per 10 s); L {L:.2f} s; "
          f"sfx {integrated(fx):.1f}, amb {integrated(bus['amb']):.1f}, music {integrated(mus):.1f} LUFS (the voice would be {vref})")

# THE AMBIENCE BEDS: one continuous bed per SCENE (a stretch of story time without a jump), heard through the
# perspective of each shot, so a cut-in never restarts the air and a cut to another place always changes it.
#   ride 1   s02-s06  the moving train: the packed CAR (rumble, the motor through the floor, strap creaks, a polite
#                     murmur, air-con) and the CAB (the motor whine bright and close, wind at the seals, rattle, joints)
#   plat A   s07-s09  station A, busier: more feet and voices, sparrows
#   ride 2   s10      the train pulling out again, heard inside
#   plat B   s11-end + shot 1 (through the loop seam): golden evening: thinner crowd, far crows, the guide chirp;
#                     heard from INSIDE the doorway in s15 / s18 / s20 (duller, with the standing train's hum),
#                     through the cab in s21, and not at all in the lab
#   lab      s17, s19 a bright quiet room: air handling, a ballast hum, birds outside the window
# Levels are LU under the voice (BED_LV). Everything is recorded (CC0) except the air, the hums and the motor model.
import numpy as np
import tl
from dsp import SR, TAU, ns, dbg, rng, lp, hp, bp, colored, smooth_noise, st, fades, widen, integrated, pan
import sfx_gen as G
import lib
import foley

BED_LV = {"car": -19.5, "cab": -18.5, "platA": -22.5, "platB": -23.5, "door": -25.0, "cabstop": -32.0, "lab": -30.0}
XF = 0.012                                       # the bed's own crossfade at a picture cut


def _norm(x, lufs):
    v = integrated(x)
    return x * dbg(lufs - v) if np.isfinite(v) else x


def _rms(x):
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-12)


def platform(n, seed, kind):
    """the open-air island platform. kind 'A' = the first stop (busier, earlier), 'B' = the second stop (golden evening)"""
    r = rng(2000 + seed)
    t = np.arange(n) / SR
    air = np.stack([lp(colored(n, r, 1.3), 650, 2) + 0.10 * bp(colored(n, r, 0.6), 700, 4200, 1) * (0.7 + 0.3 * smooth_noise(n, r, 0.25)) for _ in range(2)])
    out = 1.0 * _rms(air)
    out += 0.55 * _rms(lp(G.city(n, r, 1.0), 1400, 1))                               # the city beyond the tracks
    hum = sum(np.sin(TAU * 50.0 * k * t + r.uniform(0, TAU)) / k ** 1.2 for k in (2, 3, 4, 6))    # Tokyo runs on 50 Hz
    out += 0.10 * st(_rms(hum))
    sp = lib.cut("sparrows", 0.5, 0.5)
    o = int(r.integers(0, max(1, sp.shape[1] - n)))
    out += (0.34 if kind == "A" else 0.16) * _rms(foley._loop(sp[:, o:], n, 0.5))
    wl = lib.cut("walla", 0.5, 0.5)
    o = int(r.integers(0, max(1, wl.shape[1] - n))) if wl.shape[1] > n else 0
    out += (0.50 if kind == "A" else 0.26) * _rms(foley._loop(wl[:, o:], n, 0.5))
    if kind == "B":
        cr = lib.cut("crows_far", 0.5, 0.5)
        o = int(r.integers(0, max(1, cr.shape[1] - n))) if cr.shape[1] > n else 0
        out += 0.20 * _rms(lp(foley._loop(cr[:, o:], n, 0.5), 3200, 1))     # Japanese crows, far back (a close park recording: duller)
    idle = lib.cut("train_idle", 0.3, 0.3)                                           # the standing train
    out += 0.30 * _rms(foley._loop(idle, n, 0.4))
    return out


def lab(n, seed):
    r = rng(2100 + seed)
    out = _rms(G.room_tone(n, r, hum=0.0, air=1.0))
    t = np.arange(n) / SR
    out += 0.12 * st(_rms(sum(np.sin(TAU * 100.0 * k * t + r.uniform(0, TAU)) / k ** 1.5 for k in range(1, 5))))
    out += 0.35 * _rms(st(bp(colored(n, r, 0.3), 1800, 6500, 1)))                    # the air handling
    sp = lib.cut("sparrows", 0.5, 0.5)
    o = int(r.integers(0, max(1, sp.shape[1] - n)))
    out += 0.10 * _rms(lp(foley._loop(sp[:, o:], n, 0.5), 2400, 2))                  # birds outside the window
    return out


def speed_ride1(t, T):
    """km/h and effort over ride 1 (film seconds): steady, power on under 'a thousand people' (the suitcase creeps),
    coasting, then the brake under 'a finger and a shout' (the suitcase rolls forward)"""
    on, off, br, end = T["on"], T["off"], T["brake"], T["end"]
    sp = np.interp(t, [0, on, off, br, end], [55.0, 56.5, 70.0, 70.5, 36.0])
    pw = np.interp(t, [0, on - 0.05, on + 0.3, off, off + 0.3, br - 0.05, br + 0.25, end], [0.38, 0.38, 1.0, 1.0, 0.22, 0.22, 0.85, 0.85])
    return sp, pw


def ride(n, a, seed, mode, T=None):
    """the moving train from inside, film time a .. a + n. Returns (body, car layer, cab layer, motor mono, speed)"""
    r = rng(2200 + seed)
    t = a + np.arange(n) / SR
    if mode == 1:
        sp, pw = speed_ride1(t, T)
        src = lib.cut("ride_cruise", 0.3, 0.3)
    else:                                                                           # pulling out: 0.43 s after the first movement
        sp = np.clip(3.1 * (t - T["glide"]), 0, 60)
        pw = np.ones(n)
        src = lib.cut("ride_accel", 0.3, 0.3)
    body = foley._loop(src, n, 0.6)
    if mode == 1:
        body *= dbg(np.interp(t, [a, T["brake"], T["end"]], [0, 0, -3.0]))[None, :]
    mo = foley.motor(sp, pw, seed)
    # the car: murmur, strap creaks on the sway, air-con
    car = np.zeros((2, n))
    mu = lib.cut("murmur", 0.5, 0.5)
    o = int(r.integers(0, max(1, mu.shape[1] - n)))
    car += 0.30 * _rms(foley._loop(mu[:, o:], n, 0.5))
    car += 0.22 * _rms(st(bp(colored(n, r, 0.2), 2200, 7000, 1)))
    tm = 0.35
    k = 0
    while tm < n / SR - 0.5:
        c = lib.cut("leather_a" if k % 2 else "leather_b", 0.03, 0.2)
        d = ns(r.uniform(0.35, 0.7))
        o2 = int(r.integers(0, max(1, c.shape[1] - d)))
        seg = fades(c[:, o2:o2 + d], 0.04, 0.12)
        i = ns(tm)
        m = min(n - i, seg.shape[1])
        car[:, i:i + m] += 1.1 * _rms(seg)[:, :m] * pan(np.ones(1), r.uniform(-0.7, 0.7))
        tm += r.uniform(1.0, 1.7)
        k += 1
    # the cab: wind at the seals, a small rattle
    cab = np.zeros((2, n))
    w = np.stack([bp(colored(n, r, 0.8), 500, 2800, 1) * (0.75 + 0.25 * smooth_noise(n, r, 0.5)) for _ in range(2)])
    cab += 0.55 * _rms(w)
    rt = G.rattle(n / SR, r, density=5.0, lo=1200, hi=3200, tau=(0.004, 0.012))
    cab += 0.10 * st(_rms(rt))
    # rail joints through the floor: one pair per joint, the spacing follows the speed (about every 1.1 s at 58 km/h)
    jt = np.zeros((2, n))
    tm = 0.55 if mode == 1 else 0.5
    k = 0
    while tm < n / SR - 0.3:
        v = max(4.0, float(sp[min(n - 1, ns(tm))]))
        c, _ = foley.rail_click(seed + k, 1.0, pair=float(np.clip(2.1 / (v / 3.6), 0.06, 0.45)), inside=True)
        i = ns(tm)
        m = min(n - i, c.shape[1])
        jt[:, i:i + m] += c[:, :m]
        tm += float(np.clip(1.1 * 58.0 / v, 0.8, 2.2)) * r.uniform(0.95, 1.05)
        k += 1
    return body, car, cab, mo, jt


def build(n_ext, vref):
    """the ambience stem in the mix's extended time (see cues.X): (2, n_ext), and a table of what plays where"""
    S, L, CUT1 = tl.SHOT, tl.L, tl.CUT1
    amb = np.zeros((2, n_ext))
    rows = []

    def put(x, a, gain=1.0):
        i = ns(a)
        m = min(n_ext - i, x.shape[1])
        if m > 0:
            amb[:, i:i + m] += gain * x[:, :m]

    def masks(a0, n, spans):
        """{variant: [(a, b)]} -> {variant: gain per sample}: 1 inside its shots, crossfading over XF where the variant changes
        (and no dip at all where two neighbouring shots hear the same variant)"""
        k = max(2, ns(XF))
        out = {}
        for v, sp in spans.items():
            m = np.zeros(n)
            for a_, b_ in sp:
                m[max(0, ns(a_ - a0)):max(0, ns(b_ - a0))] = 1.0
            out[v] = np.convolve(m, np.ones(k) / k, "same")
        return out

    # ---------------------------------------------------------------- ride 1 (s02-s06)
    a0, b0 = S["s02"][0], S["s06"][1]
    n = ns(b0 - a0)
    T = dict(on=tl.s("v3_n04") + 1.15, off=S["s06"][0] + 0.5, brake=tl.s("v3_n05") + 1.40, end=b0)
    body, car, cab, mo, jt = ride(n, a0, 1, 1, T)
    r = rng(31)
    mo_car = st(lp(mo, 2300, 2))
    mo_cab = widen(mo, r, 9.0, 0.4)
    rb = np.sqrt(np.mean(body ** 2))
    jn = jt / (np.abs(jt).max() + 1e-12) * rb                       # joints: their peak 11-13 dB over the body's RMS
    carbed = _norm(body + 0.8 * _rms(car) * rb + 0.42 * _rms(mo_car) * rb + 2.2 * jn, vref + BED_LV["car"])
    cabbed = _norm(0.8 * hp(body, 110, 1) + 0.6 * _rms(cab) * rb + 0.95 * _rms(mo_cab) * rb + 2.8 * hp(jn, 60, 1), vref + BED_LV["cab"])
    mk = masks(a0, n, {"car": [S[x] for x in ("s02", "s04", "s05")], "cab": [S[x] for x in ("s03", "s03b", "s06") if x in S]})      # s03 + s03b: ONE cab bed through their cut
    put(carbed * mk["car"][None, :] + cabbed * mk["cab"][None, :], a0)
    for sid in [x for x in ("s02", "s03", "s03b", "s04", "s05", "s06") if x in S]:
        a, b = S[sid]
        rows.append((sid, a, b, "the moving train: " + ("packed car (rumble, motor through the floor, strap creaks, murmur, air-con, joints)" if tl.PLACE[sid] == "car"
                                                         else "driver's cab (motor whine close, wind at the seals, rattle, joints)")))
    # ---------------------------------------------------------------- platform A (s07-s09)
    a0, b0 = S["s07"][0], S["s09"][1]
    pa_ = _norm(platform(ns(b0 - a0), 1, "A"), vref + BED_LV["platA"])
    put(fades(pa_, XF, XF), a0)
    rows.append(("s07-s09", a0, b0, "platform A: open air, the city beyond the tracks, sparrows, people, the standing train's hum"))
    # ---------------------------------------------------------------- ride 2 (s10)
    a0, b0 = S["s10"]
    n = ns(b0 - a0)
    body, car, cab, mo, jt = ride(n, a0, 2, 2, dict(glide=tl.ev("v3_d02.e + 0.075")))
    mo_car = st(lp(mo, 2600, 2))
    rb = np.sqrt(np.mean(body ** 2))
    jn = jt / (np.abs(jt).max() + 1e-12) * rb
    bed2 = _norm(body + 0.8 * _rms(car) * rb + 0.7 * _rms(mo_car) * rb + 2.2 * jn, vref + BED_LV["car"])
    put(fades(bed2, XF, XF), a0)
    rows.append(("s10", a0, b0, "the train pulling out, inside: the motor's rising start notes, slow joints, straps"))
    # ---------------------------------------------------------------- platform B (s11 .. the end .. shot 1 through the seam)
    a0, b0 = S["s11"][0], L + CUT1
    n = ns(b0 - a0)
    pb = _norm(platform(n, 2, "B"), vref + BED_LV["platB"])
    pb_door = lp(pb, 3600, 1) * dbg(BED_LV["door"] - BED_LV["platB"])
    idle = _norm(foley._loop(lib.cut("train_idle", 0.3, 0.3), n, 0.4), vref + BED_LV["door"] - 3.0)       # inside the doorway the standing train hums
    pb_cab = lp(pb, 650, 2) * dbg(BED_LV["cabstop"] - BED_LV["platB"]) + idle * dbg(-4.0)
    spans = {"platB": [], "door": [], "cabstop": []}
    for sid in tl.ORDER[tl.ORDER.index("s11"):] + ["s01"]:
        a, b = (L, L + CUT1) if sid == "s01" else S[sid]
        if tl.PLACE[sid] in spans:
            spans[tl.PLACE[sid]].append((a, b))
    mk = masks(a0, n, spans)                       # s24 and shot 1 are neighbours here: the bed runs through the loop seam untouched
    put(pb * mk["platB"][None, :] + (pb_door + idle) * mk["door"][None, :] + pb_cab * mk["cabstop"][None, :], a0)
    rows.append(("s11-s16b, s22-s24, s01", S["s11"][0], L + CUT1, "platform B: golden evening air, the far city, a few people, far crows; one bed through the loop seam"))
    rows.append(("s15, s18, s20", S["s15"][0], S["s20"][1], "the same platform heard from inside the doorway (duller) + the standing train's hum"))
    rows.append(("s21", S["s21"][0], S["s21"][1], "the cab at station B: the platform through the glass, the fan's hum; quiet"))
    # ---------------------------------------------------------------- the lab (s17, s19)
    for sid in ("s17", "s19"):
        a, b = S[sid]
        lb = _norm(lab(ns(b - a), 3 if sid == "s17" else 4), vref + BED_LV["lab"])
        put(fades(lb, XF, XF), a)
        rows.append((sid, a, b, "the lab: a bright quiet room (air handling, a ballast hum, birds outside the window)"))
    return amb, rows

# THE SOUNDS of the pointing film: every sound a cue can name. Each function returns stereo (2, n), or (stereo, lead)
# where lead = the moment inside the sound (s) that must land ON the cue's time (the lock of an arm, the meeting of the
# doors, the first touch of a ball). Levels are set by the cue (LU under the voice), never here.
# Real things are RECORDINGS (CC0, lib.py); synthesis gives them an exact shape and timing (the pitch of the motor, the
# rhythm of the rail joints, the ring of a jar) and stands alone only where no recording exists (our own chimes).
import numpy as np
from scipy import signal
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, peq, shelf, reson, resbank, colored, smooth_noise, ramp, fades, curve, shape,
                 phase, modal, pan, st, widen, make_ir, convolve_st)
import sfx_gen as G
import lib

_IR = {}


def ir(kind):
    if kind not in _IR:
        _IR[kind] = {
            "plat": lambda: make_ir(0.55, 11, pre=0.018, hf=1.6, early=[(0.035, 0.5, -0.4), (0.07, 0.35, 0.5), (0.12, 0.2, -0.2)]),
            "car": lambda: make_ir(0.24, 12, pre=0.004, hf=1.2, early=[(0.006, 0.6, 0.3), (0.011, 0.5, -0.3)]),
            "cab": lambda: make_ir(0.16, 15, pre=0.003, hf=1.0, early=[(0.004, 0.6, 0.2)]),
            "lab": lambda: make_ir(0.42, 13, pre=0.008, hf=0.9),
            "pa": lambda: make_ir(1.25, 14, pre=0.045, hf=2.0, early=[(0.09, 0.6, -0.7), (0.17, 0.5, 0.7), (0.26, 0.35, -0.3), (0.38, 0.25, 0.4)]),
            "far": lambda: make_ir(0.9, 16, pre=0.06, hf=2.6, early=[(0.11, 0.5, 0.5), (0.21, 0.4, -0.5)]),
        }[kind]()
    return _IR[kind]


def wet(x, kind, amt, tail=None):
    """x (mono or stereo) + amt * its reverb in the named space; the tail is kept"""
    x = st(x)
    I = ir(kind)
    tl = ns(tail) if tail is not None else I.shape[1]
    xp = np.concatenate([x, np.zeros((2, tl))], axis=1)
    return xp + amt * convolve_st(xp, I)


def _fit(x, n):
    x = st(x)
    if x.shape[1] >= n:
        return x[:, :n]
    return np.concatenate([x, np.zeros((2, n - x.shape[1]))], axis=1)


def _loop(x, n, xf=0.25):
    """repeat a recording to n samples with equal-power crossfades (a bed longer than its source)"""
    x = st(x)
    m = x.shape[1]
    if m >= n:
        return x[:, :n].copy()
    L = min(ns(xf), m // 3)
    out = np.zeros((2, n + m))
    w = np.sin(0.5 * np.pi * np.linspace(0, 1, L))
    seg = x.copy()
    seg[:, :L] *= w
    seg[:, -L:] *= w[::-1]
    i = 0
    first = True
    while i < n:
        s = x.copy() if first else seg
        if first:
            s[:, -L:] *= w[::-1]
            first = False
        out[:, i:i + m] += s
        i += m - L
    return out[:, :n]


def _peak_at(x, win=0.01):
    m = np.abs(st(x)).max(0)
    k = max(1, ns(win))
    return int(np.argmax(np.convolve(m, np.ones(k) / k, "same")))


def _pn(x):
    return x / (np.abs(x).max() + 1e-12)


# ================================================================ cloth: the point-and-call snap
FW = {"driver": (0.13, 1500, 6800, 1.0, "cloth_w4", 0.35), "kid": (0.09, 2600, 8500, 0.6, "shirt_w1", 0.2),
      "tourist": (0.20, 900, 4800, 1.2, "cloth_w2", 0.5), "lab": (0.11, 1900, 6200, 0.7, "shirt_w1", 0.25)}


def fwip(who="driver", seed=1, soft=0.0, crisp=0.0):
    """the snap of a pointing arm: a crisp cotton air whoosh that ends in the small 'thup' of the sleeve / glove locking.
    lead = the lock. who: driver (white cotton glove, tight), kid (small, higher), tourist (a floppy jacket sleeve), lab."""
    dur, flo, fhi, body, smp, realg = FW[who]
    r = rng(100 + seed)
    w = G.whoosh(dur + 0.10, r, peak=dur * 0.78, f_lo=flo, f_hi=fhi, width=0.75, tail=0.03, air=0.35)
    n = ns(dur + 0.42)
    y = np.zeros(n)
    y[:len(w)] += _pn(w)
    lock = ns(dur * 0.78)
    t = tt(0.07)
    thup = bp(r.standard_normal(len(t)), 260, 1500, 2) * np.exp(-t / 0.007) + 0.55 * np.sin(TAU * (170 if who != "kid" else 260) * t) * np.exp(-t / 0.011)
    y[lock:lock + len(thup)] += 0.75 * body * _pn(thup) * (1 - 0.6 * soft)
    real = lib.mono(smp)                                    # a real cloth move under it, its loudest instant on the lock
    real = hp(real, 350 if who != "kid" else 700, 2)
    pk = _peak_at(real)
    a = max(0, pk - lock)
    seg = real[a:a + n - max(0, lock - pk)]
    off = max(0, lock - pk)
    y[off:off + len(seg)] += realg * _pn(seg) * (1 - 0.3 * soft)
    if soft:
        y = lp(y, 5200 - 2200 * soft, 1)
    if crisp:                                                # the close-up snap: a tight cotton 'tk' on the lock (a short bright
        k = tt(0.012)                                        # noise burst) and a shorter tail, so it reads as the sharpest hit
        tk = hp(r.standard_normal(len(k)), 2500, 2) * np.exp(-k / 0.0018)
        y[lock:lock + len(tk)] += crisp * 0.9 * _pn(tk) * (np.abs(y).max() + 1e-9)
        y[lock + ns(0.06):] *= np.exp(-np.arange(len(y) - lock - ns(0.06)) / SR / (0.05 / max(crisp, 0.2)))
    return widen(fades(y, 0.002, 0.05), r, 7.0, 0.4), lock / SR


def cloth(kind="a", seed=1, dur=None, bright=0.0):
    """a small real cloth move (an arm rising, a hand going to the ear, a head turning): a cut of the fabric recordings"""
    x = lib.mono({"a": "rustle_a", "b": "rustle_b", "c": "rustle_c", "d": "rustle_d"}[kind])
    r = rng(200 + seed)
    d = dur or 0.4
    a = int(r.integers(0, max(1, len(x) - ns(d) - 1)))
    env = np.abs(signal.hilbert(x))
    k = ns(0.05)
    sm = np.convolve(env, np.ones(k) / k, "same")
    a = int(np.clip(np.argmax(sm) - ns(d) // 2, 0, max(0, len(x) - ns(d))))      # the busiest part of the cut
    y = x[a:a + ns(d)]
    if bright:
        y = shelf(y, 3500, 3 * bright, "high")
    return widen(fades(y, 0.02, 0.06), r, 9.0, 0.5)


def cap_drop(seed=1):
    """the boy's too-big cap dropping over his eyes: a soft felt 'pup' + a breath of cloth"""
    r = rng(300 + seed)
    t = tt(0.16)
    y = 0.8 * np.sin(phase(210 * (1 + 0.35 * np.exp(-t / 0.012)))) * np.exp(-t / 0.022) + 0.5 * bp(r.standard_normal(len(t)), 500, 2600, 1) * np.exp(-t / 0.016)
    c = cloth("d", seed, 0.22)
    out = _fit(st(fades(y, 0.001, 0.03)), c.shape[1])
    out += 0.5 * _pn(c)
    return out, 0.0


# ================================================================ rails, motor, the train
def rail_click(seed=1, hard=1.0, pair=0.0, inside=False):
    """one wheel on a rail joint: a 4 ms steel impulse through the rail's modes + the thump of the wheel + a pinch of
    ballast; pair = seconds to the second axle of the bogie (0 = single). inside = heard through the car floor."""
    r = rng(400 + seed)
    d = 0.3 + pair
    t = tt(d)
    x = np.zeros(len(t))
    e = r.standard_normal(ns(0.004)) * np.hanning(ns(0.004))
    x[:len(e)] = e
    if pair:
        k = ns(pair)
        x[k:k + len(e)] += 0.8 * r.standard_normal(len(e)) * np.hanning(len(e))
    md = [(610 * r.uniform(0.95, 1.05), 14, 1.0), (1180, 18, 0.9), (1740 * r.uniform(0.96, 1.04), 22, 0.75), (2620, 26, 0.55), (3900, 30, 0.3)]
    y = resbank(x, md)
    th = np.sin(TAU * 92 * t) * np.exp(-t / 0.035)
    if pair:
        th += 0.8 * np.concatenate([np.zeros(ns(pair)), (np.sin(TAU * 88 * t) * np.exp(-t / 0.035))[: len(t) - ns(pair)]])
    y = _pn(y) + 0.8 * hard * th + 0.12 * bp(r.standard_normal(len(t)), 300, 2500, 1) * np.exp(-t / 0.03)
    if inside:
        y = lp(y, 420, 2) * 2.2 + 0.08 * y
    return widen(fades(y, 0.0003, 0.05), r, 5.0, 0.3), 0.0


def motor(speed, power, seed=7, carrier=1102.0, bright=1.0, async_until=24.0):
    """the VVVF drive of a commuter train from its speed (km/h per sample) and its effort (0..1 per sample):
    - below ~24 km/h the inverter runs asynchronously: a steady carrier (1102 Hz, the pitch of the departure recording,
      so the two never beat) whose side tones spread apart as the motor speeds up: the 'singing' start;
    - above it the pulse modes step (15, 9, 5, 3 pulses): each rises with the speed, then drops to the next;
    - under both, the gear mesh and the rotor slots: tones that rise with the speed all the way. Mono."""
    n = len(speed)
    r = rng(500 + seed)
    t = np.arange(n) / SR
    f_out = 1.25 * speed
    y = np.zeros(n)
    # gear mesh (10 Hz per km/h) and rotor slots (28 Hz per km/h)
    g = phase(10.0 * speed)
    gear = np.sin(g) + 0.45 * np.sin(2 * g + 0.4) + 0.2 * np.sin(3 * g + 1.0)
    sl = phase(28.0 * speed)
    slot = np.sin(sl) + 0.35 * np.sin(2 * sl + 0.8)
    rough = 1 + 0.10 * smooth_noise(n, r, 14.0)
    y += (0.55 * gear + 0.5 * slot * np.clip(speed / 6.0, 0, 1)) * (0.3 + 0.7 * power) * np.clip(speed / 3.0, 0, 1) * rough
    # asynchronous carrier with spreading side tones
    a_as = np.clip((async_until - speed) / 5.0, 0, 1) * (0.25 + 0.75 * power) * np.clip(speed / 0.6, 0, 1)
    car = 0.25 * np.sin(TAU * carrier * t)
    for k, a in ((2, 1.0), (4, 0.55)):
        car += a * (np.sin(phase(carrier + k * f_out)) + np.sin(phase(carrier - k * f_out)))
    car += 0.3 * (np.sin(phase(2 * carrier + f_out)) + np.sin(phase(2 * carrier - f_out))) + 0.12 * np.sin(TAU * 3 * carrier * t)
    y += 0.42 * car * a_as
    # synchronous pulse modes
    edges = [(async_until, 34.0, 15), (34.0, 46.0, 9), (46.0, 62.0, 5), (62.0, 200.0, 3)]
    for lo_, hi_, k in edges:
        w = np.clip((speed - lo_) / 1.5, 0, 1) * np.clip((hi_ - speed) / 1.5, 0, 1)
        if not w.any():
            continue
        ph = phase(k * 3 * f_out)
        y += 0.5 * w * (0.3 + 0.7 * power) * (np.sin(ph) + 0.5 * np.sin(phase((k * 3 + 2) * f_out)) + 0.5 * np.sin(phase((k * 3 - 2) * f_out)) + 0.25 * np.sin(2 * ph))
    y = np.tanh(1.4 * y) / 1.4
    y = peq(bp(y, 180, 5200, 1), 1100, 3.0 * bright, 0.8)
    return y


# THE WHINE of the departing train (2026-11-20): "emu_jp" = an ElevenLabs sound effect of a Japanese commuter EMU pulling
# out (take 2 of 4, chosen by measurement: a clean tone from its first frame, rising 891 -> 1137 Hz over 4.75 s once
# stretched to 0.76x tempo with ffmpeg rubberband; no speech by the recogniser). None = the old Australian EMU recording
# + its lift. MOTOR_DB = our motor model under it (None = off); MOTOR_CARRIER = its asynchronous carrier.
DEPART_WHINE = "emu_jp"
MOTOR_DB = -8.0                 # measured: the blend keeps the rising ridge longest (902 -> 1043 Hz, +16 %, over 5 s)
MOTOR_CARRIER = 1000.0


def depart(total, seed=1, release=0.28, roar_at=4.6, roar_full=6.4, fall_at=6.35, fall_end=7.45, far=False, whine=None, motor_db="cfg"):
    """THE TRAIN PULLING AWAY, one continuous sound (lead = the first movement of the train):
    the brake release 'pssh'; the recorded EMU departure from its own first second (real inverter tones at 1102 Hz and
    its harmonics); our motor model on the same carrier, so the rising side tones read on a phone speaker; from
    roar_at the cars streaming past (the roar of the same recording); from fall_at the whine falls away while the
    cars keep coming. The plant uses its first half second, the payoff runs it through the loop seam into frame 0."""
    r = rng(600 + seed)
    n = ns(total + release)
    out = np.zeros((2, n))
    g0 = ns(release)                                           # the glide starts here
    h = lib.cut("air_hiss", 0.004, 0.4, b=min(2.2, total))
    m = min(n, h.shape[1])
    out[:, :m] += 0.5 * h[:, :m]
    whine = DEPART_WHINE if whine is None else (whine or None)
    motor_db = MOTOR_DB if motor_db == "cfg" else motor_db
    if whine:                                                  # the Japanese EMU: at level from its first frame, no lift
        emu = lib.cut(whine, 0.01, 0.3)
        L_ = min(n - g0, emu.shape[1])
        tt_ = np.arange(L_) / SR
        wh = emu[:, :L_]
    else:
        emu = lib.cut("emu_depart", 0.02, 0.3, a=0.25)             # the recording, its motion from 0.25 s
        L_ = min(n - g0, emu.shape[1])
        # the recording is quiet in its first seconds (the train is far from the microphone): lift its start so the whine
        # is 'at level' as soon as the train moves, then ease the lift out as the recording itself swells
        tt_ = np.arange(L_) / SR
        lift = dbg(np.interp(tt_, [0, 1.0, 3.0, 6.0, 9.0, 14.0], [16, 13, 9, 6, 2, 0]))
        wh = emu[:, :L_] * lift
    whb = bp(wh, 420, 4200, 2)                                  # the tonal band of the recording
    fall = dbg(np.interp(tt_, [0, fall_at, fall_end, fall_end + 3], [0, 0, -7, -14]))
    out[:, g0:g0 + L_] += 0.55 * wh * fall + 0.75 * whb * fall
    # our motor: 0 -> 3.1 km/h per second
    sp = np.clip(3.1 * tt_, 0, 90)
    pw = np.clip(tt_ / 0.25, 0, 1)
    mo = motor(sp, pw, seed, carrier=MOTOR_CARRIER if whine else 1102.0)
    mo *= np.interp(tt_, [0, 0.15, 1.0, fall_at, fall_end, fall_end + 3], [0, 0.6, 1.0, 1.0, 0.45, 0.2])
    k1, k6 = min(L_, ns(1.0)), min(L_, ns(6.0))                    # the model sits 5 dB under the recording's own tonal band
    ref = np.sqrt(np.mean((whb * fall)[:, k1:k6] ** 2)) if k6 > k1 + ns(0.2) else np.sqrt(np.mean((whb * fall) ** 2))
    cur = np.sqrt(np.mean(mo[k1:k6] ** 2)) if k6 > k1 + ns(0.2) else np.sqrt(np.mean(mo ** 2))
    mdb = -5.0 if not whine else motor_db
    if mdb is not None:
        out[:, g0:g0 + L_] += dbg(mdb) * widen(mo, r, 13.0, 0.5) * ref / (cur + 1e-12)
    # the cars streaming past
    ps = lib.cut("emu_pass", 0.3, 0.5)
    a = g0 + ns(roar_at)
    if a < n:
        m = min(n - a, ps.shape[1])
        gp = np.interp(np.arange(m) / SR, [0, max(0.2, roar_full - roar_at), 99], [0, 1, 1]) ** 1.5
        k_ps = np.sqrt(np.mean(out[:, g0 + ns(1.0):g0 + ns(4.0)] ** 2)) / (np.sqrt(np.mean(ps[:, : ns(4.0)] ** 2)) + 1e-12)
        out[:, a:a + m] += 1.6 * k_ps * ps[:, :m] * gp       # the streaming cars end up a little over the whine they take over from
        cb = lib.cut("clack_bed", 0.2, 0.3)
        m2 = min(m, cb.shape[1])
        k_cb = np.sqrt(np.mean(ps[:, : ns(4.0)] ** 2)) / (np.sqrt(np.mean(cb[:, : ns(4.0)] ** 2)) + 1e-12)
        out[:, a:a + m2] += 0.5 * 1.6 * k_ps * k_cb * bp(cb[:, :m2], 250, 3500, 1) * gp[:m2]
    if far:
        out = lp(out, 2400, 1)
    return fades(out, 0.003, 0.05), release


def arrive_stop(seed=1):
    """the last second of a train stopping, heard on the platform: the motor's falling tone, a soft clunk of the
    couplers on the jerk, the air letting go. lead = the jerk."""
    r = rng(650 + seed)
    d = 0.55
    tt_ = np.arange(ns(d)) / SR
    sp = np.clip(9.0 * (1 - tt_ / d) ** 1.3, 0, 30)
    mo = motor(sp, np.full(len(sp), 0.8), seed) * np.interp(tt_, [0, 0.05, d * 0.8, d], [0, 1, 0.8, 0])
    n = ns(d + 1.9)
    out = np.zeros((2, n))
    out[:, :len(mo)] += 0.5 * widen(mo, r, 11.0, 0.5)
    t2 = tt(0.3)
    cl = np.sin(phase(74 * (1 + 0.5 * np.exp(-t2 / 0.02)))) * np.exp(-t2 / 0.05) + 0.35 * resbank(np.concatenate([[1.0], np.zeros(len(t2) - 1)]), [(240, 9, 1.0), (530, 12, 0.6), (1300, 16, 0.3)])
    k = ns(d)
    out[:, k:k + len(cl)] += st(0.9 * _pn(cl))
    h = lib.cut("air_hiss", 0.01, 0.5, b=1.5)
    out[:, k + ns(0.06):k + ns(0.06) + h.shape[1]] += 0.35 * h[:, : n - k - ns(0.06)]
    return out, d


def brake_onset(seed=1, dur=1.3):
    """the driver braking, heard inside: the brake valve's breath and a low groan of the bogies"""
    r = rng(660 + seed)
    h = lib.cut("air_hiss", 0.03, 0.5, b=dur)
    n = h.shape[1]
    t = np.arange(n) / SR
    gr = bp(colored(n, r, 1.4), 70, 260, 2) * np.interp(t, [0, 0.2, dur * 0.7, dur], [0, 1, 0.6, 0]) * (1 + 0.3 * np.sin(TAU * 11 * t))
    return lp(0.5 * h, 5200, 1) + st(0.9 * gr / (np.abs(gr).max() + 1e-9) * np.abs(h).max()), 0.0


# ================================================================ doors
def door_chime(seed=1, n_rep=2, gap=0.56, muffled=False):
    """OUR door chime: two soft bell tones (G5 then D6, a rising fifth), played twice while the doors move. Written for
    this film: it is not the chime of any railway."""
    r = rng(700 + seed)
    d = gap * n_rep + 1.0
    y = np.zeros(ns(d))
    for i in range(n_rep):
        for j, (f, a) in enumerate(((783.99, 1.0), (1174.66, 0.85))):
            t0 = i * gap + j * 0.2
            tone = modal(0.9, [(f, 1.0, 0.22), (f * 2.0, 0.22, 0.12), (f * 3.01, 0.08, 0.06), (f * 4.2, 0.03, 0.03)], r)
            tone *= 1 - np.exp(-tt(0.9) / 0.004)
            k = ns(t0)
            y[k:k + len(tone)] += a * tone[: len(y) - k]
    if muffled:
        y = lp(y, 900, 2)
    return wet(fades(y, 0.001, 0.1), "cab" if muffled else "plat", 0.35 if not muffled else 0.2), 0.0


# the CLOSING doors (2026-11-20): "door_jp" = an ElevenLabs sound effect (take 3 of 3, chosen by measurement: one 1.3 s
# slide from the cut's start, ONE padded thud as the leaves meet at 1.30 s, no tone over 7 dB prominence, no chime, no
# speech by the recogniser), with our synthesized slide SYNTH_UNDER_DB under it. None = the synthesis alone.
DOOR_CLOSE = "door_jp"
SYNTH_UNDER_DB = -12.0
DOOR_JP_MEET = 1.30


def door_slide(dur=1.3, closing=True, seed=1, started=0.0, src="cfg"):
    """one pair of train door leaves sliding: the rollers' rumble, the drive's small whirr, a breath of air, and at the
    end either the rubber edges meeting (closing: a soft thump, a real door thud under it) or the open stop.
    lead = the END of the travel (the meeting). started = seconds of the travel already done when the sound begins."""
    src = DOOR_CLOSE if src == "cfg" else src
    if closing and src and abs(dur - DOOR_JP_MEET) < 0.05 and started == 0.0:
        x = lib.cut(src, 0.005, 0.15)
        syn, ld = door_slide(dur, True, seed, 0.0, src=None)
        k = ns(DOOR_JP_MEET - ld)
        syn = syn if syn.ndim > 1 else np.stack([syn, syn])
        m = min(x.shape[1] - max(0, k), syn.shape[1])
        if SYNTH_UNDER_DB is not None and m > 0:
            pk_x = np.sqrt(np.mean(x ** 2)); pk_s = np.sqrt(np.mean(syn ** 2)) + 1e-12
            x = x.copy()
            x[:, max(0, k):max(0, k) + m] += dbg(SYNTH_UNDER_DB) * (pk_x / pk_s) * syn[:, :m]
        return x, DOOR_JP_MEET
    r = rng(720 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    v = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.6                       # leaf speed: ease in, ease out
    roll = bp(colored(n, r, 0.9), 140, 900, 2) * (1 + 0.5 * np.sin(phase(22 + 14 * v))) + 0.35 * bp(colored(n, r, 0.4), 900, 3200, 1)
    whirr = 0.25 * np.sin(phase(260 + 240 * v)) + 0.12 * np.sin(phase(2 * (260 + 240 * v)))
    y = (0.9 * _pn(roll) + whirr) * v
    air = lib.mono("door_hiss", b=min(dur, 2.0))
    m = min(n, len(air))
    y[:m] += 0.22 * _pn(air[:m]) * np.interp(np.arange(m) / SR, [0, 0.1, dur * 0.8, dur], [0, 1, 0.5, 0])[:m]
    tail = ns(0.7)
    out = np.zeros((2, n + tail))
    out[:, :n] += widen(y, r, 15.0, 0.6)
    k = n
    if closing:
        t2 = tt(0.4)
        th = np.sin(phase(78 * (1 + 0.6 * np.exp(-t2 / 0.015)))) * np.exp(-t2 / 0.06)
        rub = bp(r.standard_normal(len(t2)), 280, 1100, 2) * np.exp(-t2 / 0.018)
        gl = resbank(np.concatenate([[1.0], np.zeros(len(t2) - 1)]), [(1650, 30, 1.0), (2900, 35, 0.6)]) * 0.12
        thud = lib.cut("door_thud", 0.002, 0.1)
        pk = _peak_at(thud)
        seg = thud[:, max(0, pk - ns(0.02)):]
        out[:, k - ns(0.02) + 0:k - ns(0.02) + min(tail, seg.shape[1])] += 0.9 * _pn(seg)[:, :tail + 0]
        mm = min(tail, len(th))
        out[:, k:k + mm] += st(1.0 * _pn(th)[:mm] + 0.6 * _pn(rub)[:mm] + gl[:mm])
    else:
        t2 = tt(0.2)
        stp = np.sin(TAU * 120 * t2) * np.exp(-t2 / 0.03) + 0.5 * bp(r.standard_normal(len(t2)), 400, 1800, 1) * np.exp(-t2 / 0.01)
        out[:, k:k + len(t2)] += st(0.5 * _pn(stp))
    a = ns(started)
    return fades(out[:, a:], 0.004 if not started else 0.012, 0.08), dur - started


def relay_click(seed=1):
    """the car-side lamps going out: one small relay 'tik'"""
    r = rng(740 + seed)
    t = tt(0.09)
    y = hp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.0012) + 0.5 * np.sin(TAU * 2350 * t) * np.exp(-t / 0.006) + 0.4 * np.sin(TAU * 640 * t) * np.exp(-t / 0.01)
    return st(fades(y, 0.0002, 0.02)), 0.0


# ================================================================ the suitcase
def _roll_src(kind):
    return {"floor": "suit_roll_a", "floor2": "suit_roll_b", "creep": "suit_roll_c", "tile": "suit_tokyo"}[kind]


def suit_roll(dur, kind="floor", env=(0.3, 1.0, 0.6), seed=1, ticks=18.0, bright=0.0):
    """the yellow suitcase rolling on its spinner wheels: a recorded suitcase roll shaped by env (start, middle, end
    speed 0..1) + the casters' own small ticking, whose rate follows the speed"""
    r = rng(800 + seed)
    n = ns(dur)
    src = lib.cut(_roll_src(kind), 0.01, 0.05)
    off = int(r.integers(0, max(1, src.shape[1] - n))) if src.shape[1] > n else 0
    x = _loop(src[:, off:], n, 0.15)
    x = hp(x, 240, 2) + 0.25 * x                                 # the body of the recordings sits under 300 Hz: lean it for a phone
    if bright:
        x = shelf(x, 2500, 4 * bright, "high")
    t = np.arange(n) / SR
    e = np.interp(t / dur, [0, 0.5, 1.0], env)
    tk = G.rattle(dur, r, density=ticks, env=e, lo=1500, hi=4200, tau=(0.003, 0.009))
    tk += 0.5 * G.stick_slip(dur, 9 + 16 * e, r, 0.2, e)[:n] * 0.0
    y = x * e + 0.10 * st(tk) * (np.abs(x).max() + 1e-9)
    return fades(y, 0.02, 0.06), 0.0


def suit_stop(seed=1):
    """the wheels settling: two small caster ticks and the shell's quiet knock"""
    r = rng(820 + seed)
    y = np.zeros((2, ns(0.3)))
    c = lib.cut("comb_click", 0.001, 0.02)
    y[:, :c.shape[1]] += 0.8 * _pn(c)
    b = lib.cut("bonk_c", 0.002, 0.04)
    k = ns(0.05)
    m = min(y.shape[1] - k, b.shape[1])
    y[:, k:k + m] += 0.45 * _pn(b)[:, :m]
    return y, 0.0


def suit_bump(seed=1, hard=0.6):
    """the suitcase bumping a wall: a soft plastic 'tok'"""
    b = _pn(lib.cut("bonk_b", 0.001, 0.05))
    t = _pn(lib.cut("thud_plastic", 0.002, 0.1))
    n = max(b.shape[1], t.shape[1])
    return _fit(b, n) * (0.5 + 0.5 * hard) + 0.7 * _fit(t, n), 0.0


def suit_nudge(seed=1):
    """a passing briefcase nudging the suitcase: leather on plastic"""
    b = _pn(lib.cut("bonk_low", 0.002, 0.08))
    c = _pn(cloth("c", seed, 0.2))
    n = max(b.shape[1], c.shape[1])
    return 0.8 * _fit(b, n) + 0.4 * _fit(c, n), 0.0


def threshold(dur=1.0, seed=1, back=False):
    """spinner wheels over the metal door threshold: the recorded luggage wheels on a metal plate"""
    x = lib.cut("comb_plate", 0.01, 0.08)
    x = x[:, : ns(dur)]
    if back:
        x = x[:, ::-1].copy()
        x = fades(x, 0.01, 0.05)
    return x, 0.0


def suit_catch(seed=1):
    """the lunge and catch: a hand slapping onto the plastic handle, the telescopic handle's rattle, two wheels dropping
    back onto the plate. lead = the hand."""
    r = rng(840 + seed)
    n = ns(0.75)
    y = np.zeros((2, n))
    a = _pn(lib.cut("bonk_a", 0.001, 0.05))
    y[:, :a.shape[1]] += a
    rt = G.rattle(0.3, r, density=55, lo=1300, hi=3800, tau=(0.004, 0.012)) * np.exp(-tt(0.3) / 0.09)
    y[:, ns(0.01):ns(0.01) + len(rt)] += st(0.35 * _pn(rt))
    c = _pn(lib.cut("comb_click", 0.001, 0.02))
    for k, g in ((0.16, 0.7), (0.24, 0.5)):
        y[:, ns(k):ns(k) + c.shape[1]] += g * c
    th = _pn(lib.cut("thud_plastic", 0.002, 0.1))
    m = min(n - ns(0.2), th.shape[1])
    y[:, ns(0.2):ns(0.2) + m] += 0.6 * th[:, :m]
    return y, 0.0


def pats(seed=1):
    """two pats on the suitcase handle, like patting a dog: the recorded pair of plastic knocks (0.285 s apart)"""
    x = _pn(lib.cut("bonk_pair", 0.002, 0.05))
    return hp(x, 150, 1), 0.01


def tag_flutter(seed=1):
    """the red tag on the handle ticking in the platform air"""
    r = rng(860 + seed)
    y = G.rattle(0.5, r, density=10, lo=2200, hi=5000, tau=(0.002, 0.006)) * np.interp(tt(0.5), [0, 0.1, 0.5], [0, 1, 0])
    return widen(y, r, 6.0, 0.3), 0.0


# ================================================================ feet
def step(kind="sneaker", seed=1, hard=1.0):
    """one footstep: sneaker (a short rubber chirp on tile + the foot's thud), shoe (a leather shoe on concrete), kid"""
    r = rng(900 + seed)
    if kind == "shoe":
        x = _pn(lib.cut(["step_a", "step_b", "step_c", "step_d"][seed % 4], 0.001, 0.04))
        return x * hard, 0.0
    if kind == "kid":
        x = _pn(lib.cut("step_e", 0.001, 0.03))
        return hp(x, 300, 1) * 0.8, 0.0
    sq = _pn(lib.cut(["squeak_step_a", "squeak_step_b", "squeak_step_c", "squeak_step_d"][seed % 4], 0.002, 0.03))
    th = _pn(lib.cut(["step_b", "step_d", "step_a"][seed % 3], 0.001, 0.04))
    n = max(sq.shape[1], th.shape[1])
    return 0.32 * lp(_fit(sq, n), 5200, 1) + 0.9 * hard * _fit(th, n), 0.0      # the chirp of the sole stays under the foot's own thud (never a squeal)


def sneaker_hook(seed=1):
    """a sneaker hooking a suitcase wheel without a look: a short rubber squeak, the 'tok' of rubber on the wheel housing"""
    sq = _pn(lib.cut("squeak_short", 0.003, 0.04))
    b = _pn(lib.cut("bonk_c", 0.001, 0.04))
    n = sq.shape[1] + ns(0.05)
    y = np.zeros((2, n))
    y[:, :sq.shape[1]] += 0.4 * lp(sq, 5500, 1)
    k = ns(0.06)
    m = min(n - k, b.shape[1])
    y[:, k:k + m] += 0.9 * b[:, :m]
    return y, 0.06


def steps_off(dur=2.6, seed=1):
    """commuters stepping off: the recorded group of three walking, with more feet joining"""
    r = rng(920 + seed)
    x = lib.cut("steps_group", 0.05, 0.4)
    n = ns(dur)
    off = int(r.integers(0, max(1, x.shape[1] - n - ns(1.2))))
    y = x[:, off:off + n].copy()
    y2 = x[:, off + ns(1.1):off + ns(1.1) + n]
    y[:, :y2.shape[1]] += 0.6 * y2[::-1]
    return fades(y, 0.08, 0.5), 0.0


def run_stop(seed=1):
    """the late salaryman: four quick leather steps that slow and stop short, a last scuff. lead = the last step."""
    r = rng(940 + seed)
    gaps = [0.0, 0.22, 0.47, 0.76]
    n = ns(1.25)
    y = np.zeros((2, n))
    for i, g in enumerate(gaps):
        s, _ = step("shoe", seed + i, 1.0 - 0.12 * i)
        y[:, ns(g):ns(g) + s.shape[1]] += pan(s.mean(0), -0.5 + 0.2 * i)[:, : n - ns(g)]
    sc = bp(colored(ns(0.16), r, 0.5), 700, 3800, 1) * np.interp(tt(0.16), [0, 0.03, 0.16], [0, 1, 0])
    y[:, ns(0.8):ns(0.8) + len(sc)] += st(0.25 * _pn(sc))
    return y, 0.76


# ================================================================ the place: birds, PA, vending machine, guide chirp
def giggle(piece="a", far=1.0):
    """the tourist giggling at his phone ACROSS the platform (his own unused voice take): band-limited (no consonant band:
    low-passed at 2.6 kHz), set back with the platform's far air. Quiet on purpose: it sits under the narrator's line."""
    x = lib.mono("giggle_" + piece, fin=0.03, fout=0.12)
    x = lp(hp(x, 220, 2), 2600, 2)
    return wet(pan(x, -0.35), "far", 0.6 * far), 0.0


def cab_hum(dur=1.6, seed=1):
    """the driver's instrument panel, close: a soft electrical hum (the 50 Hz family, a little buzz) and the displays'
    faint high whine. Synthesized (no recording); a quiet bed for the face close-up"""
    r = rng(1080 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    y = sum(np.sin(TAU * 50.0 * k * t + r.uniform(0, TAU)) / k ** 0.9 for k in (2, 4, 6, 8))
    y = y * (1 + 0.15 * smooth_noise(n, r, 3.0)) + 0.18 * np.sin(TAU * 7830.0 * t) * (0.6 + 0.4 * smooth_noise(n, r, 0.7))
    y = bp(y, 90, 9000, 1) + 0.25 * bp(colored(n, r, 0.5), 300, 3000, 1) * np.abs(y).max()
    return st(fades(y, 0.12, 0.06)), 0.0


def crow(seed=1, far=1.0, n_caws=2):
    """a crow over the platform: recorded caws, set back with distance"""
    r = rng(1000 + seed)
    c = lib.mono(("crow_1", "crow_2", "crow_3")[seed % 3])
    gap = r.uniform(0.42, 0.55)
    y = np.zeros(ns(gap * n_caws + 0.3))
    for i in range(n_caws):
        k = ns(i * gap)
        y[k:k + len(c)] += c * (1.0 - 0.15 * i)
    y = lp(hp(y, 600, 1), 5200 - 2000 * min(far, 1.0), 1)
    return wet(pan(y, r.uniform(-0.7, 0.7)), "far", 0.5 + 0.5 * far), 0.0


def guide_chirp(seed=1, n_rep=1):
    """the platform's stair-guide signal far away: our own short electronic two-chirp bird call (a signal, not a tune)"""
    r = rng(1020 + seed)
    y = np.zeros(ns(0.6 * n_rep + 0.2))
    for i in range(n_rep):
        for j, (f0, f1, d) in enumerate(((2950, 2350, 0.11), (2400, 2050, 0.16))):
            t = tt(d)
            c = np.sin(phase(f0 + (f1 - f0) * (t / d) ** 0.7)) * np.sin(np.pi * t / d) ** 1.2
            k = ns(i * 0.6 + j * 0.17)
            y[k:k + len(c)] += c
    return wet(pan(lp(y, 4200, 1), 0.5), "far", 1.1), 0.0


def pa_murmur(dur=2.4, seed=1):
    """a soft WORDLESS station announcement far down the platform: a synthetic voice of vowels only (no language, no
    words, band 450-2600 Hz) through a horn speaker and the open air"""
    r = rng(1040 + seed)
    y = G.babble(dur, r, base=205.0, scale=1.12, rate=5.2, active=0.86, fmax=3000, breath=0.1)
    y = bp(y, 450, 2600, 2)
    y = np.tanh(2.5 * y / (np.abs(y).max() + 1e-9))
    y = peq(y, 1400, 5.0, 1.2)
    d1, d2 = ns(0.047), ns(0.121)                                # the next speakers along the platform
    z = y.copy()
    z[d1:] += 0.5 * y[:-d1]
    z[d2:] += 0.3 * y[:-d2]
    return wet(pan(fades(z, 0.05, 0.25), -0.35), "pa", 0.9), 0.0


def vending(dur, seed=1, near=1.0):
    """the drinks machine: its recorded compressor hum (near = at the machine; far = down the platform)"""
    r = rng(1060 + seed)
    x = lib.cut("vending_hum", 0.2, 0.3)
    n = ns(dur)
    off = int(r.integers(0, max(1, x.shape[1] - n)))
    y = _loop(x[:, off:], n, 0.4)
    if near < 1.0:
        y = lp(y, 500 + 1500 * near, 1)
    return fades(y, 0.05, 0.12), 0.0


def phone_swing(seed=1):
    """a phone swung round at arm's length: one quick thin whoosh (recorded)"""
    x = _pn(lib.cut("quick_woosh", 0.003, 0.05))
    return hp(x, 500, 1), 0.12


# ================================================================ the lab: jars, balls, buttons
JAR = [(1480, 0.14), (2390, 0.11), (3560, 0.08), (4870, 0.05), (6420, 0.035)]


def jar_ball(i=0, seed=1, bright=False, fill=0):
    """a red ball dropping into a big glass jar: the first 'tink' on glass (a recorded marble impact + the jar's own
    ring), two or three small bounces, a short settle on the balls already there (fill = how many). bright = the single
    ball in the empty FINGER jar: a higher, longer, cleaner ring."""
    r = rng(1100 + seed + 7 * i)
    d = 0.95 if bright else 0.7
    y = np.zeros(ns(d))
    hit = lib.mono("marble_hit")
    hit = _pn(hit)
    k_pitch = (1.18 if bright else 1.0) * (1 + 0.012 * i) * r.uniform(0.985, 1.015)
    ring_t = 2.2 if bright else max(0.45, 1.0 - 0.1 * fill)       # a fuller jar rings less
    modes = [(f * k_pitch, a_ * (1.0 if j else 1.2), tau * ring_t) for j, (f, tau) in enumerate(JAR) for a_ in [1.0 / (1 + 0.5 * j)]]
    bounces = [(0.0, 1.0), (0.105, 0.42), (0.175, 0.2)] + ([(0.225, 0.1)] if bright else [])
    for t0, a in bounces:
        k = ns(t0)
        rg = modal(0.6, [(f * r.uniform(0.995, 1.005), g, tau) for f, g, tau in modes], r) * (1 - np.exp(-tt(0.6) / 0.0006))
        m = min(len(y) - k, len(rg))
        y[k:k + m] += a * 0.8 * rg[:m]
        h = hit[: ns(0.09)] * a
        m = min(len(y) - k, len(h))
        y[k:k + m] += (0.55 if bright else 0.75) * h[:m]
    if fill and not bright:                                       # landing on the balls already in the jar
        g = lib.mono("glass_b" if i % 2 else "glass_a")
        g = _pn(g)[: ns(0.3)]
        k = ns(0.04)
        y[k:k + len(g)] += 0.3 * min(1.0, fill / 3.0) * g[: len(y) - k]
    if bright:
        y = shelf(y, 4000, 3.0, "high")
    return wet(pan(fades(y, 0.0003, 0.1), -0.25 if not bright else 0.25), "lab", 0.35), 0.0


def button(seed=1, soft=True):
    """one press of a plastic button on the test box (recorded)"""
    nm = ["click_c", "click_d", "click_c", "click_b"][seed % 4] if soft else "click_a"
    x = _pn(lib.cut(nm, 0.001, 0.03))
    return x[:, : ns(0.14)], _peak_at(x[:, : ns(0.14)]) / SR


def lamp_bip(seed=1):
    """the test box's lamp: a soft round 'bip'"""
    t = tt(0.12)
    y = (np.sin(TAU * 988 * t) + 0.3 * np.sin(TAU * 1976 * t)) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.003))
    return wet(st(fades(y, 0.001, 0.03)), "lab", 0.25), 0.0


def bubble_pop(seed=1):
    """the speech bubble popping up on her snap (recorded pop)"""
    x = _pn(lib.cut("ui_pop", 0.001, 0.05))
    return x, _peak_at(x) / SR


def bar_fill(dur=2.6, seed=1):
    """a TRIES bar filling: a faint rising glassy slide (so the two bars sound the same)"""
    r = rng(1140 + seed)
    n = ns(dur)
    t = np.arange(n) / SR
    f = 520 * 2 ** (t / dur * 0.9)
    y = (np.sin(phase(f)) + 0.4 * np.sin(phase(2 * f))) * np.interp(t, [0, 0.08, dur - 0.08, dur], [0, 1, 1, 0]) * (0.7 + 0.3 * np.sin(TAU * 9 * t))
    y += 0.3 * bp(colored(n, r, 0.3), 2500, 6000, 1) * np.interp(t, [0, 0.1, dur], [0, 1, 0.6])
    return widen(lp(y, 3800, 1), r, 9.0, 0.4), 0.0


# ================================================================ the phone's tiny speaker
def phone_speaker(x):
    """what a phone's own speaker does to a voice: 500-3800 Hz, a resonant peak at 2.6 kHz, a little clipping, mono"""
    m = st(x).mean(0)
    m = bp(m, 520, 3800, 3)
    m = peq(m, 2600, 6.0, 1.4)
    pk = np.abs(m).max() + 1e-9
    m = np.tanh(2.2 * m / pk) * pk / np.tanh(2.2)
    return st(m)


FN = {k: v for k, v in list(globals().items()) if callable(v) and not k.startswith("_") and getattr(v, "__module__", "") == __name__}

if __name__ == "__main__":                                        # self-test: render every sound once, print its shape (nothing is played)
    import time
    from dsp import integrated, momentary_max
    tests = [("fwip", dict(who="driver")), ("fwip", dict(who="kid")), ("fwip", dict(who="tourist")), ("fwip", dict(who="lab")), ("cloth", {}), ("cap_drop", {}),
             ("rail_click", {}), ("rail_click", dict(pair=0.16)), ("rail_click", dict(inside=True, pair=0.1)), ("depart", dict(total=8.0)), ("arrive_stop", {}), ("brake_onset", {}),
             ("door_chime", {}), ("door_slide", {}), ("door_slide", dict(closing=False)), ("door_slide", dict(started=0.4)), ("relay_click", {}),
             ("suit_roll", dict(dur=1.2)), ("suit_roll", dict(dur=1.0, kind="creep")), ("suit_roll", dict(dur=1.4, kind="tile")), ("suit_stop", {}), ("suit_bump", {}),
             ("suit_nudge", {}), ("threshold", {}), ("suit_catch", {}), ("pats", {}), ("tag_flutter", {}), ("step", {}), ("step", dict(kind="shoe")), ("step", dict(kind="kid")),
             ("sneaker_hook", {}), ("steps_off", {}), ("run_stop", {}), ("crow", {}), ("guide_chirp", {}), ("pa_murmur", {}), ("vending", dict(dur=2.4)), ("phone_swing", {}),
             ("jar_ball", {}), ("jar_ball", dict(bright=True)), ("button", {}), ("lamp_bip", {}), ("bubble_pop", {}), ("bar_fill", {})]
    for name, kw in tests:
        t0 = time.time()
        res = FN[name](**kw)
        x, lead = res if isinstance(res, tuple) else (res, 0.0)
        x = st(x)
        assert np.isfinite(x).all(), name
        print(f"{name:12s} {str(kw):34s} {x.shape[1] / SR:6.2f} s  lead {lead:5.2f}  peak {20 * np.log10(np.abs(x).max() + 1e-12):6.1f} dBFS  "
              f"mom {momentary_max(x):6.1f} LUFS  ({time.time() - t0:.2f} s)")

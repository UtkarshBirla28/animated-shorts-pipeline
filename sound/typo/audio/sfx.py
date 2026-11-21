# Every sound effect and ambience bed of "The Oil Tanks That Were Mostly Water" as a cue list timed to the picture
# (timeline.py reads shots, dissolves and story beats from timeline.json at run time), rendered into two stereo stems:
# EVENTS and BEDS. Levels are relative to the voice: an EVENT's level = its max momentary loudness (LU vs the voice
# stem's integrated loudness); a BED's level = its integrated loudness over the shots it plays under. Beds follow the
# picture dissolves (equal-power, each dissolve widened by 4 f a side). The dawn tank-top bed (shots 1 + 16) is ONE
# continuous signal folded into a seamless loop, so the last frame's harbour runs straight into frame 0's.
#
# Every event is keyed to a named PICTURE EVENT (picture_events(), below): its default frame is derived from timeline.json
# BEAT / shot frames with the same formula the picture uses (sets_ext.ts / sets_int.ts / cast.ts, quoted next to it; the
# formulas that moved most often are READ from the merged picture code by probe.py at every run) or, for the two
# music-synced actions, the score's own beats (music.sync_points(): the tank man's climb steps and the banker's happy
# stamps - cues.md lists the frames for CHAR). If a picture action lands somewhere else after the merge, put the frame in
# audio/picture_events.json ({"name": frame | [frames] | {...} | "beat+n" | null}; null drops the cue) and re-run
# `python mix.py`. Every run writes picture_events_used.json with the frames actually used.
#
# FIX ROUND 1 (audit A1, new 2748 f clock): the harbour lives (gull cries in the true word gaps, flag snaps and a flag /
# windsock flutter on the SHARED gust curve, a far horn in the '$150 million...' pause, a wave slap + a far gull in the
# loop tail, carried by the loop-folded dawn bed); the trading floor shouts (a 12-voice walla, phones, a dismayed groan
# under the THOOM's tail); the storm is heavier (rain on umbrellas, a gutter spilling, wet footsteps for the lenders
# walking in, lightning cracks keyed to the picture's flashes); the reveal is a held breath, not a dropout (the tank's
# hollow water + bubble blips under 'Inside... was mostly water.', a fish 'blub' after the slosh); every buried sync
# SFX the audit measured is up (dings, shake, glug, pour, trickle, the tag ding, plates, scribble, cha-ching) and the
# small hits on words moved into the gaps beside them; new life in every interior (drum tonks + a rising xylophone as
# Tino's pile grows, the shot-6 clock, a hatch creak on 'someone', pipe drips, a far pipe knock, the pump's motor whine
# dipping on each valve heave, a car passing, pigeons taking off, the vendor's papers, the cafe's cups / laugh / register
# / a bicycle bell, a far typewriter bell).
#
# FIX ROUND 2 (audit A2, the 2761 f clock with the two new voice silences): every cue the audit found off its picture is
# re-keyed to the picture code's own formula (probe.py: the inspector's check-mark stroke, the blob's brow wipe, the shot-6
# papers fan; the shot-14 car on WORLD-EXT's visible pass), the register's ka-CHING moves out of 'it.' into the breath,
# the sounds with no on-screen source are dropped or pushed down to bed level (the shot-2 gate fence, the shot-12 fish
# blip, the shot-7 gull, the street horn), the buried sync SFX come up (the cash slide, the plunk, the check mark, the
# scribble, the cha-ching, the parting), the THOOM's low body steps aside under 'crashed.' and blooms in the breath after
# it, the storm steps sit under the line, and new life: a chair creak, the roof's steel 'tinks', a bell buoy, the empty
# tank's drone under the mystery, a ticker bell, a slammed handset, the bottle set down, sparrow chirps on the visible
# sparrow's hops, a tube radio's hiss, the blob's squeaks at the pipe mouths, a steam puff, sweat flecks, a far tram bell,
# the pigeons' flutter, the investor's pencil taps, an oily glop as the gold re-seals.
#
# FIX ROUND 3 (audit A3): the shot-12 pour was only ~0.5 s long (its lambda read `Lw` LATE, after the shot-13 brow wipe
# had reused the name): every generator lambda now binds its length when the cue is made, and the pour is a sustained
# filling stream 1842-1893 (ducked 3 dB under 'Fill a tank with water,') with the fish's 'blub' as it drops in; the
# shot-4 yard bed swaps ON the hard cut (the roof tinks, the rail gull's squawk and wings stop at it); the shot-3 register
# keeps only a soft bell (no visible drawer); the stamps sit on cast.ts STAMPS5.R with a paper 'thup'; the shot-6 rustle
# swells to the top of the probed raise; the ticker bell drops to bed level (no machine in frame); the storm and the
# cutaway beds come up in the breaths; the newspaper's whoosh starts on the paper's entry and its slap is its own low-mid
# transient; the scribble +4 dB; the cafe register ding on the probed card take, in the 'brand.' breath. New life: a
# second far ship horn and a halyard clink at the gate (shot 2), the inspector's pencil tap-tap in the deadpan silence,
# a felt-marker squeak on the chart, a hollow drip echo in the empty tank, a chalk squeal on the diving line, a gutter
# splash under the BANKRUPT slap and the umbrellas' fabric flutter on the gusts, the blob's wet squelch on each COUNTED
# plate and the pump-room clock, a far tyre hiss on the grey street, the cafe's espresso wand on 'trusted'.
#
# Rules kept from the engine: SFX only on physical actions whose source is on screen, synced 0-3 f to the picture; small
# actions that land ON words get their 1-4 kHz band carved under the words; no whoosh on any plain dissolve (the only
# whoosh is the spinning newspaper, a real on-screen fly-in); nothing but the dawn bed crosses the loop point.
import os
import re
import json
import numpy as np
from scipy import signal as _sig
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, shelf)
import sfx_gen as G
import sfx_gen_r1 as G2
import sfx_gen_r2 as G3
import sfx_gen_r3 as G4
import instruments as I
import timeline as T
import probe as PR

N = ns(T.DUR)
FR = 1.0 / T.FPS
PE_PATH = os.path.join(T.HERE, "picture_events.json")
PE_USED = os.path.join(T.HERE, "picture_events_used.json")

# picture_events.json values may be BEAT expressions: "bust-2", "S9.a+4" (shot 9 start + 4), or lists of them
_EXPR = re.compile(r"^\s*(?:S(\d+)\.(a|b)|([A-Za-z_]\w*))\s*(?:([+-])\s*(\d+(?:\.\d+)?))?\s*$")


def resolve(v):
    if isinstance(v, str):
        m = _EXPR.match(v)
        if not m:
            raise ValueError(f"picture_events.json: cannot read frame expression {v!r} (use 'beat+n', 'beat-n' or 'S<id>.a+n')")
        base = T.SHOTS[int(m.group(1))][m.group(2)] if m.group(1) else T.BEAT[m.group(3)]
        d = float(m.group(5)) * (-1 if m.group(4) == "-" else 1) if m.group(5) else 0.0
        return float(base) + d
    if isinstance(v, list):
        return [resolve(x) for x in v]
    if isinstance(v, dict):
        return {k: (resolve(x) if isinstance(x, (str, list)) else x) for k, x in v.items()}
    return v


class Cue:
    def __init__(self, t, name, desc, gen, level, p=0.0, lpf=None, space="out", send=0.08, pe=None, wcarve=None, post=None):
        self.t, self.name, self.desc, self.gen, self.level = t, name, desc, gen, level
        self.p, self.lpf, self.space, self.send, self.pe, self.wcarve, self.post = p, lpf, space, send, pe, wcarve, post
        self.measured = None

    @property
    def frame(self):
        return self.t * T.FPS


# ================================================================ speech mask (true voice silences)
def speaking(t):
    """is narration time t inside speech (not inside a true voice silence)?"""
    t = np.atleast_1d(np.asarray(t, float))
    s = np.ones(len(t), bool)
    for a, b in T.SILENCES:
        s &= ~((t >= a) & (t < b))
    return s


def gap_at(t, min_len=0.15, win=0.6):
    """the true voice silence (>= min_len) containing or nearest t (within win): (a, b) or None"""
    best = None
    for a, b in T.SILENCES:
        if b - a < min_len:
            continue
        d = 0.0 if a <= t <= b else min(abs(a - t), abs(b - t))
        if d <= win and (best is None or d < best[0]):
            best = (d, a, b)
    return None if best is None else (best[1], best[2])


def in_gap(f, pad=0.02):
    t = T.fr(f)
    return any(a + pad <= t <= b - pad for a, b in T.SILENCES)


def carve_words(x, t0, depth_db, lo=1000.0, hi=4000.0, broad_db=0.0, pre=0.02, post=0.03):
    """dip the lo..hi band of an event placed at narration time t0 while the voice speaks (edges 15 ms), plus an optional
    broadband trim; the low body and the top sparkle stay"""
    n = x.shape[-1]
    t = t0 + np.arange(n) / SR
    e = speaking(t).astype(float)
    if pre or post:                       # widen the speech windows a little (a word's attack / tail)
        k = max(1, ns(max(pre, post)))
        e = np.minimum(1.0, np.convolve(e, np.ones(2 * k + 1), mode="same"))
    if not np.any(e):
        return x
    k = max(1, ns(0.015))
    e = np.convolve(e, np.ones(k) / k, mode="same")
    low = lp(x, lo, 4)
    rest = x - low
    high = hp(rest, hi, 4)
    midb = rest - high
    return (low + high) * dbg(broad_db * e) + midb * dbg((depth_db + broad_db) * e)


def word_env(t, pre=0.06, post=0.08, tau=0.06):
    """0..1 'the narrator is speaking' envelope at times t (s), smoothed: beds duck under it"""
    t = np.asarray(t, float)
    ctrl = 200
    tc = np.arange(int(np.floor(t[0] * ctrl)) - 4, int(np.ceil(t[-1] * ctrl)) + 5) / ctrl
    v = np.zeros(len(tc))
    for w in T.WORDS:
        v[(tc >= float(w["s"]) - pre) & (tc <= float(w["e"]) + post)] = 1.0
    k = max(1, int(tau * ctrl))
    v = np.convolve(v, np.ones(k) / k, mode="same")
    return np.interp(t, tc, v)


# ================================================================ picture events (the frames every SFX is keyed to)
def _music_sync():
    try:
        import music
        return music.sync_points()
    except Exception:  # noqa
        return {}


_PE = None

def ring_cut(after, tau=0.12):
    """post: let a bell ring `after` s, then die away fast (so it never hangs under the next words)"""
    def f(x):
        n = x.shape[-1]
        t = np.arange(n) / SR
        return x * np.where(t < after, 1.0, np.exp(-(t - after) / tau))[None, :]
    return f


def hishelf(f0, db):
    def f(x):
        return shelf(x, f0, db, "high")
    return f


def bandpass_post(lo, hi, mix=0.75):
    """keep mostly the lo..hi band (so a small sound sits BESIDE the voice's formants)"""
    def f(x):
        return x * (1 - mix) + bp(x, lo, hi, 2) * mix * 1.6
    return f


def _frames(v):
    if v is None:
        return []
    return [float(x) for x in (v if isinstance(v, (list, tuple)) else [v])]


# ================================================================ the cue list
THUNDER_FIRST = -14.0            # A3 P3: the storm's first crack (was -11 LU); back to -11 if POST makes the 1406 flash read strongly
_WCARVE = {"flap": -5.0, "reel": -6.0, "steel_step": -5.0, "roof_step": -5.0, "knee": -6.0, "plunk": -5.0, "rail": -6.0,
           "cash_slide": -6.0, "ka": -4.0, "stamp": dict(db=-6.0, lo=700.0, hi=4000.0), "stamp5": dict(db=-6.0, lo=700.0, hi=4000.0),
           "ding5": -6.0, "ratchet": -4.0, "boing": -4.0, "bloop": -4.0, "phone": -1.0, "slap": -5.0, "ladder_far": -4.0,
           "shake": -2.0, "glug": -2.0, "pour": dict(db=-4.0, lo=900.0, hi=5000.0), "trickle": -3.0, "ding12": -3.0,
           "valve": -6.0, "plate": -3.0, "gurgle": -5.0, "sweat": -8.0, "wipe": -9.0, "spin": dict(db=-6.0, lo=800.0, hi=5000.0),
           "clack": -5.0, "bwomp": -3.0, "scribble": -4.0, "cha_ching": dict(db=-4.0, lo=900.0, hi=4000.0), "part": -4.0, "settle": -4.0,
           "gull": -6.0, "horn": -2.0, "slosh": dict(db=-8.0, lo=300.0, hi=4000.0, broad=-4.0), "car_horn": -6.0, "coo": -5.0, "clank": -4.0,
           "flag": -5.0, "thunder": dict(db=-6.0, lo=600.0, hi=4000.0, broad=-5.0), "crash": dict(db=-4.0, lo=500.0, hi=3000.0), "tick": -3.0,
           "wings": -4.0, "fence": -5.0, "tank_ring": -4.0, "xylo": -2.0, "tonk": -3.0, "paper": -6.0, "clock": -4.0, "creak": -5.0,
           "groan": dict(db=-7.0, lo=700.0, hi=4000.0), "wet_step": -5.0, "umbrella": dict(db=-5.0, lo=900.0, hi=4000.0),
           "blip": 0.0, "blub": 0.0, "drip": -4.0, "knock": -3.0, "car": dict(db=-5.0, lo=800.0, hi=4000.0), "pigeon_wings": -4.0,
           "laugh": -6.0, "cup": -4.0, "reg_ding": -3.0, "bike": -4.0, "carriage": -6.0}


# ================================================================ TYPO (short #3) picture events: BEAT-keyed, no probes
def picture_probes():
    return ({}, ["typo: no picture probes (every cue is keyed to BEAT names from words.json / story.ts)"])


def picture_events():
    """picture_events.json overrides (frames, lists, dicts, 'beat+n' expressions or null); cues() adds its defaults"""
    global _PE
    if _PE is not None:
        return _PE
    D, SRC = {}, {}
    if os.path.exists(PE_PATH):
        for k, v in json.load(open(PE_PATH, encoding="utf-8")).items():
            if k.startswith("_"):
                continue
            D[k], SRC[k] = (resolve(v) if v is not None else None), "picture_events.json"
    _PE = (D, SRC)
    return _PE


def _P(key, default, src="default (BEAT-keyed)"):
    D, SRC = picture_events()
    if key not in D:
        D[key], SRC[key] = default, src
    return D[key]


# ---------------------------------------------------------------- small synth sources the generators lack
def _mono_sum(*xs):
    n = max(len(x) for x in xs)
    y = np.zeros(n)
    for x in xs:
        y[: len(x)] += x
    return y


def _noise_burst(r, dur, lo, hi, tau):
    n = ns(dur)
    x = bp(r.standard_normal(n), lo, hi, 2) * np.exp(-np.arange(n) / (tau * SR))
    return x / (np.max(np.abs(x)) + 1e-9)


def key_click(r, big=False):
    """a 2005 office keyboard key: a plastic click on the way down + the bottom-out thock"""
    clk = _noise_burst(r, 0.012, 2200.0, 7500.0, 0.0025) * 0.7
    th = G.wood_knock(r, f0=(150.0 if big else 230.0) * r.uniform(0.95, 1.05), tau=0.04 if big else 0.022, hard=1.0)
    th = th / (np.max(np.abs(th)) + 1e-9) * (1.0 if big else 0.75)
    y = _mono_sum(clk, np.concatenate([np.zeros(ns(0.004)), th]))
    if big:                                   # the big ENTER / CANCEL key: a second, lower bottom-out + the return click
        y = _mono_sum(y, np.concatenate([np.zeros(ns(0.11)), _noise_burst(r, 0.01, 1800.0, 6000.0, 0.002) * 0.35]))
    return y


def mouse_click(r):
    a = _noise_burst(r, 0.008, 1500.0, 6500.0, 0.0015)
    b = _noise_burst(r, 0.008, 1200.0, 5000.0, 0.0015) * 0.5
    return _mono_sum(a, np.concatenate([np.zeros(ns(r.uniform(0.05, 0.08))), b]))


def beeps(r, f0=1050.0, n=3, on=0.16, off=0.12):
    t = np.arange(ns(n * (on + off))) / SR
    g = ((t % (on + off)) < on).astype(float)
    g = np.convolve(g, np.ones(ns(0.006)) / ns(0.006), "same")
    return np.sin(2 * np.pi * f0 * t) * g * 0.6 + np.sin(2 * np.pi * 2 * f0 * t) * g * 0.1


def bug_buzz(r, dur=0.8):
    t = np.arange(ns(dur)) / SR
    f = 175.0 + 12.0 * np.sin(2 * np.pi * 3.1 * t) + r.normal(0, 1.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 27.0 * t)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.15)
    return bp(saw * am * env, 300.0, 3200.0, 2)


def ghost_shimmer(r, dur=1.2, rise=True):
    y = np.zeros(ns(dur + 0.6))
    for k in range(6):
        f0 = (2400.0 if rise else 3600.0) * (1.12 ** (k if rise else -k))
        G._place_mono(y, G.tiny_ting(r, f0=f0, tau=0.25) * (0.55 + 0.08 * k), k * dur / 6)
    return y


def _ramp(x, a, b):
    return x * np.linspace(a, b, x.shape[-1])


def _counter_spin(r, dur, rate=24.0):
    """a fast digital / mechanical counter: a dense tick clatter that speeds up"""
    y = np.zeros(ns(dur + 0.1))
    tm, k = 0.0, 0
    while tm < dur:
        G._place_mono(y, G.flap(r, False) * r.uniform(0.35, 0.6), tm)
        k += 1
        tm += 1.0 / (rate * (0.6 + 0.8 * min(1.0, tm / max(0.2, dur))))
    return y


# ================================================================ the events (frames from BEAT names; see SCRIPT.md beats)
def cues():
    D, _ = picture_events()
    C = []
    seed = [5000]
    B = T.BEAT

    def one(fn, anchor=0.0):
        def g():
            seed[0] += 1
            return fn(rng(seed[0])), anchor
        return g

    def ev(name, f, desc, gen, level, pe=None, **kw):
        if f is None:
            return
        C.append(Cue(T.fr(f), name, desc, gen, level, pe=pe, **kw))

    def ev_t(name, t, desc, gen, level, pe=None, **kw):
        C.append(Cue(float(t), name, desc, gen, level, pe=pe, **kw))

    # ---------------- 1 HOOK: the ENTER key, certificates puff out like toast, the SHARES SOLD counter races
    # FIX2: the hook title is gone (owner) and the opening is the calm man under the board: no whoosh without a source on
    # screen; the first sound event is the ENTER key on "typo"
    ev("key", _P("enter_1", B["typo"] + 1), "the finger lands on the big glowing ENTER key (desk_beats PRESS1.contact)",
       one(lambda r: key_click(r, True)), -17, p=0.05, space="room", send=0.05)
    t0 = B["typo"] + 3
    K, RM = 16.0, 2.0
    XB = np.log(RM * K)
    for i in range(0, 24):                     # desk_cert.ts launchAt(i) = T0 + K ln(1 + i): the first 24 pops one by one
        f = t0 + K * np.log(1 + i)
        if f > B["exist1"]:
            break
        ev("puff", f, f"certificate {i + 1} puffs out of the keyboard like toast",
           one(lambda r, i=i: _mono_sum(G.pop(r, f0=420.0 + 18 * (i % 5), up=True, dur=0.09) * 0.8,
                                        np.concatenate([np.zeros(ns(0.02)), G.paper_rustle(r, 0.16, 1.3) * 0.6]))),
           -27 - min(6, i * 0.35), p=0.25 * np.sin(i * 1.7), space="room", send=0.04)
    fa = t0 + K * XB - 6
    fz = B["exist1End"] - 2
    ev("flutter", fa, "then the certificates stream out (2 per frame): a continuous paper flutter that thins on 'didn't even exist'",
       one(lambda r, d=T.fr(fz) - T.fr(fa): G.paper_flutter(r, np.interp(np.arange(ns(d)) / SR, [0, 0.3, d * 0.7, d],
                                                                          [0.3, 1.0, 0.8, 0.0]))), -28, p=0.0, space="room")
    # FIX2 (Design A: one unbroken front shot, no cut on 'forty billion'): certificate no. 1 slaps flat onto his forehead
    # (hook.ts HK.stick), he peels it off (HK.grip), lays it on his papers (HK.rest), snatches one from the air (HK.caught)
    ev("slap", B["typo"] + 16, "certificate no. 1 lands flat on his forehead (a soft paper slap)",
       one(lambda r: G.paper_slap(r)), -21, p=-0.05, space="room", send=0.05)
    ev("peel", B["cost"] + 24, "he peels the certificate off his forehead (a dry paper peel)",
       one(lambda r: G.paper_rustle(r, 0.32, 1.8)), -26, p=-0.15, space="room")
    ev("laydown", B["billion"] + 8, "he lays it on his paper stack (a light paper pat)",
       one(lambda r: G.paper_rustle(r, 0.14, 1.2)), -31, p=-0.25, space="room")
    ev("snatch", B["sold"] + 1, "he snatches a flying certificate out of the air (a quick paper snap)",
       one(lambda r: _mono_sum(G.paper_rustle(r, 0.16, 2.0), G.pop(r, f0=520.0, up=True, dur=0.06) * 0.5)), -23, p=-0.2, space="room")
    ev("counter", B["typo"] + 6, "the SHARES SOLD counter races up (a dense digit clatter speeding up)",
       one(lambda r, d=T.fr(B["exist1End"]) - T.fr(B["typo"] + 6): _counter_spin(r, d)), -31, p=-0.15, space="room")
    ev("alarm", _P("over14500_1", B["billion"]), "the counter flashes red as it passes 14,500 (a small electronic warning blip)",
       one(lambda r: beeps(r, 1480.0, 2, 0.07, 0.06)), -29, p=-0.15, space="room")
    ev("ghost", B["didnt"] - 1, "'didn't even exist': the certificate in his hand (and the newest ones) go see-through (a soft rising glass shimmer)",
       one(lambda r: ghost_shimmer(r, 0.9, True)), -30, p=0.1, space="room", send=0.12)

    # ---------------- 2 SETTING: the Tokyo street, the exchange building
    ev("horn", _P("taxi_2", B["december"] + 40), "a far taxi horn, short, in the street", one(lambda r: G.car_horn(r, 1.6)), -34, p=0.4)
    # ---------------- 3 the lobby: the mascot rings the little debut bell
    for k, df in enumerate((0, 14)):
        ev("bell", _P(f"debut_bell_3_{k}", B["jcom"] + 4 + df), "the J-Com mascot rings the little debut bell",
           one(lambda r: G.ding(r, f0=1760.0, tau=0.5, sparkle=0.8)), -25 - 3 * k, p=0.15, space="hall", send=0.12)
    ev("crowd", B["trading"] + 6, "a light ripple of applause in the lobby as trading starts",
       one(lambda r: G.crowd_murmur(ns(1.4), r, voices=10, lo=300.0, hi=2400.0, density=1.4)),
       -33, p=0.0, space="hall")
    # ---------------- 4 the museum stack: a spotlight clunk
    # FIX2 (audit 2): the plaque's number counts up to 14,500 (tokyo_lobby: itHas - 2 .. n14500 + 26): a soft digit roll far under
    ev("plaque", B["itHas"] - 2, "the brass plaque's number rolls up to 14,500 (a soft, quick digit clatter)",
       one(lambda r, d=T.fr(B["n14500"] + 26) - T.fr(B["itHas"] - 2): _counter_spin(r, d)), -37, p=0.1, space="hall")
    ev("spot", _P("spot_4", B["only"] - 6), "the pedestal's spotlight clunks on over the one tidy stack",
       one(lambda r: G.ka_thunk(r)), -30, p=0.0, space="hall", send=0.1)

    # ---------------- 6 typing: each QTY digit lands (desk_beats qtyDigitAt), the PRICE '1', 'Easy mistake.' tea
    for k in range(6):
        f = B["n610k"] + 2 + (k * (B["n610kEnd"] - B["n610k"] - 4)) / 5
        ev("key", f, f"QTY digit {k + 1} typed", one(lambda r: key_click(r, False)), -27, p=0.1, space="room")
    ev("key", B["n610kEnd"] + 7, "fix4: he TABs to the PRICE box (desk TYPE6: STRIP6 + 4)", one(lambda r: key_click(r, False)), -29, p=0.1, space="room")
    ev("key", _P("price_key_6", B["yen1"] - 2), "the '1' typed into PRICE", one(lambda r: key_click(r, False)), -25, p=0.1, space="room")
    ev("cup", _P("tea_6", B["mistakeEnd"] + 9), "he sets his tea cup down after the sip, calm (fix3: the cup is down 12 f after mistakeEnd - 3)",
       one(lambda r: G2.cup_clink(r)), -30, p=0.2, space="room")

    # ---------------- 7 41 TIMES: the tower of stacks wobbles up past the ceiling
    d7 = T.fr(B["hasEnd"]) - T.fr(B["n41"])
    ev("rumble", B["n41"] - 4, "a low rising rumble as the 41-stack tower grows",
       one(lambda r, d=d7: _ramp(G3.tank_drone(r, d + 0.6, 52.0, 55.5), 0.3, 1.0)),
       -24, p=0.0, space="hall")
    ev("creak", B["whole"], "the tower sways (a dry paper-stack creak)", one(lambda r: G.creak(0.7, r, 90, 140)), -30, p=-0.2, space="hall")

    # ---------------- 8 MYSTERY -> CANCEL: the clock ticks louder; the boss bursts in; two dead presses
    # FIX2 (audit 11): he lifts one see-through certificate and looks through it on "doesn't exist" (hook.ts certMyst)
    ev("ghost8", B["something"] - 6, "the mystery: he lifts a see-through certificate (the hook's glass shimmer again, softer)",
       one(lambda r: ghost_shimmer(r, 0.9, True)), -33, p=0.0, space="room", send=0.12)
    ta, tz = T.fr(B["but"]), T.fr(B["nothing2End"] + 18)
    tm, k = ta, 0
    while tm < tz:                              # the wall clock, every second, louder through the cancel beat
        u = np.clip((tm - ta) / max(0.1, tz - ta), 0, 1)
        ev_t("tick", tm, "the trading-room wall clock (louder and louder through the cancel beat)",
             one(lambda r, k=k: G.clock_tick(r, tock=bool(k % 2))), -34 + 12 * u, p=-0.3, space="room", send=0.06)
        tm += 1.0
        k += 1
    ev("door", _P("boss_in_8", B["cancelIt"] - 7), "the boss bursts in (a door bangs open)",
       one(lambda r: G.wood_knock(r, f0=120.0, tau=0.09, hard=1.4)), -22, p=0.35, space="room", send=0.1)
    ev("thunk", _P("cancel_press_8a", B["cancel3"] + 6), "the big red CANCEL key: a heavy thunk",
       one(lambda r: key_click(r, True)), -16, p=0.0, space="room")
    ev("dots", _P("dots_8a", B["nothing1"] - 3), "a tiny grey '...' pops up and does nothing",
       one(lambda r: G.pop(r, f0=900.0, up=False, dur=0.06) * 0.5), -33, p=0.0, space="room", send=0.0)
    ev("thunk", _P("cancel_press_8b", B["again"] + 4), "he presses harder: a heavier thunk",
       one(lambda r: _mono_sum(key_click(r, True), G.wood_knock(r, f0=95.0, tau=0.07, hard=1.2) * 0.6)), -14, p=0.0, space="room")
    ev("dots", _P("dots_8b", B["nothing2"] - 3), "the same tiny '...' again", one(lambda r: G.pop(r, f0=860.0, up=False, dur=0.06) * 0.5),
       -33, p=0.0, space="room", send=0.0)

    # ---------------- 9 CRASH: the price line plunges and bounces off the red FLOOR bar
    ev("plunge", B["crashes"] - 2, "the price line plunges down the ticker wall", one(lambda r: G.bwomp(r, 260.0, 60.0, 0.9)), -21, p=0.0,
       space="hall")
    ev("floor", B["floor"] + 2, "it bounces off the red FLOOR bar", one(lambda r: _mono_sum(G.crash_thud(r) * 0.8, G.boing(r, 110.0, 0.45, 0.3) * 0.6)),
       -20, p=0.0, space="hall")

    # ---------------- 10 BUYERS: clicks all over Japan layering into a clatter; the 27-year-old's counter, the register ding
    fa, fz = B["andAll"], B["cheap"] + 10
    rr = rng(4242)
    f, k = fa, 0
    while f < fz:
        u = (f - fa) / (fz - fa)
        ev("click", f, "a buyer clicks BUY", one(lambda r: mouse_click(r)), -31 + 3 * u, p=float(rr.uniform(-0.6, 0.6)), space="room",
           send=0.03)
        f += max(1.5, 9.0 * (1 - u) ** 1.5)
        k += 1
    d10 = T.fr(B["billion2End"]) - T.fr(B["makes"])
    ev("counter", B["makes"], "his profit counter spins up to +¥2,000,000,000", one(lambda r, d=d10: _counter_spin(r, d, 30.0)), -29,
       p=0.1, space="room")
    ev("ding", _P("ding_10", B["billion2End"] - 1), "a cash-register ding on the 2 billion", one(lambda r: G2.register_bell(r)), -22,
       p=0.1, space="room", send=0.1)

    # ---------------- 11 PIVOT: the notice board (pins, tear-off tabs, moths from empty pockets, the CANCEL button, the bug)
    for k, df in enumerate((0, 5)):
        ev("pin", B["pin"] + df, "a pin taps the note into the cork", one(lambda r: G.wood_knock(r, f0=820.0, tau=0.012, hard=0.8)),
           -27, p=-0.1, space="hall")
    for k in range(5):
        ev("tab", B["selling"] + 14 + 5 * k, "the crowd snatches a tear-off tab", one(lambda r: G.paper_rustle(r, 0.12, 1.9)),
           -29, p=float(np.sin(k * 2.1)) * 0.5, space="hall")
    ev("moths", B["really"] - 4, "the seller's empty pockets: moths flutter out", one(lambda r: G2.wing_flaps(r, n_flaps=7, rate=15.0, weight=0.25)),
       -30, p=0.2, space="hall")
    ev("boop", B["cancelBtn"] + 2, "the big CANCEL button appears on the board", one(lambda r: G.pop(r, f0=300.0, up=True, dur=0.12)), -27,
       p=0.0, space="hall")
    ev("bug", B["bug"] - 3, "a little bug crawls out of the button: a tiny buzz", one(lambda r: bug_buzz(r, 0.75)), -27, p=0.15, space="hall")

    # ---------------- 12 THE BILL: buyback trucks, 96,000 ghost certificates, cash envelopes, the receipt that never ends
    ev("beep", B["bought"] + 2, "the buyback truck reverses in (beep beep beep)", one(lambda r: beeps(r, 1040.0, 3)), -31, p=0.45,
       space="out", lpf=5000.0)
    ev("ghost", B["n96k"] + 4, "96,000 ghost certificates float up, see-through", one(lambda r: ghost_shimmer(r, 1.4, True)), -28, p=0.0,
       space="room", send=0.14)
    for k in range(3):
        ev("cash", B["cash"] + 4 * k, "they turn into cash envelopes, handed out", one(lambda r: G4.paper_thup(r)), -28, p=0.3 - 0.3 * k,
           space="room")
    d12 = T.fr(B["billion3End"] + 25) - T.fr(B["theBill"] - 4)
    ev("printer", B["theBill"] - 4, "a long receipt unrolls out of the printer (a whir that keeps going and going)",
       one(lambda r, d=d12: G.reel_whirr(r, d, 30.0, 34.0)), -27, p=-0.2, space="room")

    # ---------------- 13 THE COURT: the calendar flips 2005 -> 2013, the receipt slice is torn off
    for k in range(8):
        ev("flip", B["years"] + 3 * k, "the calendar flips a year (2005 -> 2013)", one(lambda r: G.flap(r, k == 7)), -29 + (2 if k == 7 else 0),
           p=-0.25, space="hall")
    ev("tear", B["part"] - 2, "a slice of the receipt is torn off and handed to the exchange's lawyer",
       one(lambda r: G.paper_rustle(r, 0.35, 2.0)), -25, p=0.15, space="hall")

    # ---------------- 14 PAYOFF (FIX2): "one second" = the big clock's second hand ticks once (hook.ts TICK14);
    # "eight years" = eight calendar pages flutter past behind him (hook.ts pageAt), back to the hover
    ev("tick14", _P("tick_14", B["oneSec"] + 4), "'The typo took one second.': the clock over the board ticks once (large in frame)",
       one(lambda r: G.clock_tick(r, tock=False)), -19, p=0.0, space="room", send=0.08)
    for k in range(8):
        ev("page", B["theFight"] + 4 + k * 6.5, f"calendar page {2006 + k} flutters past behind him",
           one(lambda r, k=k: G.paper_rustle(r, 0.2, 1.5 + 0.1 * (k % 3))), -31, p=0.5 - 0.14 * k, space="room")
    return C


def life_cues():
    return []


BED_LEVEL = {"office": -26.0, "office_eve": -29.0, "street": -23.0, "lobby": -25.0, "museum": -33.0, "homes": -29.0, "hall": -28.0,
             "court": -32.0}
BED_DESC = {
    "office": "the Mizuho trading room (one loop-folded signal across the whole short): room air, far keyboards, a far phone, murmur",
    "office_eve": "the trading room in the evening: quieter air, a few keys, the city through the window",
    "street": "a Tokyo street in December: traffic, a passing car, a far crossing chirp",
    "lobby": "the exchange lobby: big room air, a crowd murmur, the glass ticker wall's soft ticking",
    "museum": "the museum hush around the 14,500 pedestal",
    "homes": "the buyers' homes: PC fans, a far city",
    "hall": "the warm community hall: room air, sparrows outside",
    "court": "the courtroom: still air, a rare paper rustle",
}


def _gaps_in(f0, f1, min_len=0.25):
    a0, a1 = T.fr(f0), T.fr(f1)
    return [(max(a, a0), min(b, a1)) for a, b in T.SILENCES if b - a >= min_len and min(b, a1) - max(a, a0) >= min_len * 0.8]


def _gust(n, t0, scale=1.0, bias=0.0):
    t = t0 + np.arange(n) / SR
    return np.clip(T.gust(t) * scale + bias, 0.05, 1.5)


def _mix(parts):
    """[(stereo/mono x, rel dB)] -> sum, each part at its integrated loudness rel dB"""
    out = None
    for x, db in parts:
        x = st(x) if np.ndim(x) == 1 else x
        L = integrated(x)
        y = x * dbg(db - L) if np.isfinite(L) else x
        out = y if out is None else out + y
    return out


def _lvl(x, db):
    x = st(x) if np.ndim(x) == 1 else x
    L = integrated(x)
    return x * dbg(db - L) if np.isfinite(L) else x


def _gull_layer(n, r, rate=0.12, far=2.0):
    y = np.zeros(n)
    tm = r.uniform(0.5, 3.0)
    while tm < n / SR - 1.0:
        x = G.gull(r, int(r.integers(1, 4)), None, far) * r.uniform(0.4, 1.0)
        G._place_mono(y, x, tm)
        tm += r.exponential(1.0 / rate) + 1.5
    return widen(y, r, 12, 0.9)


def _smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def _S(x):
    return st(x) if np.ndim(x) == 1 else x


def _sparse(n, r, rate, fn, t0=0.3):
    """mono layer: fn(r) placed at Poisson times (rate per s), deterministic for the seed"""
    y = np.zeros(n)
    tm = t0 + r.exponential(1.0 / rate)
    while tm < n / SR - 0.3:
        x = np.asarray(fn(r), float)
        x = x.mean(0) if x.ndim > 1 else x
        G._place_mono(y, x * r.uniform(0.4, 1.0), tm)
        tm += r.exponential(1.0 / rate)
    return y


def bed_signal(key, t0, t1, r):
    n = ns(t1 - t0)
    if key in ("office", "office_eve"):
        eve = key == "office_eve"
        air = _S(G.room_tone(n, r, hum=0.25, air=0.9 if eve else 1.0))
        keys = widen(lp(_sparse(n, r, 1.2 if eve else 6.0, lambda q: key_click(q, False)), 3500.0, 1), r, 10, 0.8)
        murmur = _S(G.crowd_murmur(n, r, voices=3 if eve else 6, lo=170.0, hi=1100.0, density=0.5 if eve else 0.9))
        phone = _S(lp(_sparse(n, r, 0.0 if eve else 0.07, lambda q: G.phone_ring(q, 1.2, far=2.5)), 2600.0, 1)) if not eve else 0 * air
        hum = _S(G.lamp_hum(n, r, mains=50.0))
        city = _S(lp(G.city(n, r, 0.6), 1200.0, 1)) if eve else 0 * air
        return _mix([(air, 0.0), (keys, -9.0 if not eve else -14.0), (murmur, -8.0 if not eve else -15.0), (phone, -14.0),
                     (hum, -18.0), (city, -8.0)])
    if key == "street":
        city = _S(G.city(n, r, 1.0))
        cars = _S(lp(_sparse(n, r, 0.25, lambda q: G2.car_pass(q, 2.2, 0.5)), 5000.0, 1))
        birds = _S(_sparse(n, r, 0.3, lambda q: G.bird_chip(q)))
        return _mix([(city, 0.0), (cars, -5.0), (birds, -16.0)])
    if key in ("lobby", "museum"):
        mus = key == "museum"
        air = _S(G.room_tone(n, r, hum=0.1, air=1.4))
        crowd = _S(G.crowd_murmur(n, r, voices=4 if mus else 11, lo=200.0, hi=1500.0, density=0.5 if mus else 1.2))
        tick = _S(G.ticker(n, r, rate=7.0, level=0.6)) if not mus else 0 * air
        return _mix([(air, 0.0), (crowd, -6.0 if not mus else -16.0), (tick, -16.0)])
    if key == "homes":
        air = _S(G.room_tone(n, r, hum=0.5, air=0.8))
        fan = _S(G.lamp_hum(n, r, mains=50.0))
        city = _S(lp(G.city(n, r, 0.5), 1500.0, 1))
        return _mix([(air, 0.0), (fan, -10.0), (city, -10.0)])
    if key == "hall":
        air = _S(G.room_tone(n, r, hum=0.0, air=1.0))
        birds = _S(_sparse(n, r, 0.5, lambda q: G3.sparrow_chirp(q)))
        return _mix([(air, 0.0), (birds, -12.0)])
    if key == "court":
        air = _S(G.room_tone(n, r, hum=0.0, air=0.8))
        paper = _S(_sparse(n, r, 0.12, lambda q: G.paper_rustle(q, 0.3, 0.7)))
        return _mix([(air, 0.0), (paper, -16.0)])
    return np.zeros((2, n))


def bed_mod_db(key, t):
    """per-sample level automation of a bed (dB) on top of its level"""
    g = np.zeros(len(t))
    B = T.BEAT
    if key == "office":
        # the mystery: the room thins; the cancel beat: the room leans in; each 'Nothing.': near-dead silence (the clock stays)
        g += np.interp(t, [T.fr(B["but"]) - 0.2, T.fr(B["but"]), T.fr(B["cancelIt"]) - 0.1, T.fr(B["cancelIt"])], [0, -4, -4, 0], left=0, right=0)
        for a, z in ((B["nothing1"], B["again"]), (B["nothing2"], B["nothing2End"] + 18)):
            ta, tz = T.fr(a) - 0.04, T.fr(z) - 0.05
            g += np.interp(t, [ta - 0.05, ta, tz, tz + 0.15], [0, -20, -20, 0], left=0, right=0)
    return g


def render_beds(v_ref, seed=1963):
    """stereo bed stem (2, N) + per-bed report rows"""
    t = np.arange(N) / SR
    W = T.bed_weights(t)
    out = np.zeros((2, N))
    rows = []
    for k, w in sorted(W.items()):
        act = np.flatnonzero(w > 1e-4)
        if not len(act):
            continue
        r = rng(seed + sum(map(ord, k)))
        if k == "office":                       # ONE loop-folded signal across the whole short (frame 0 == the last frame)
            L = ns(1.0)
            raw = bed_signal(k, 0.0, T.DUR + L / SR, r)[:, : N + L]
            raw = hp(raw, 28, 2)
            x = G.loop_xfade(raw, N, L)
            a, z = 0, N
        else:
            a, z = max(0, act[0] - ns(0.05)), min(N, act[-1] + ns(0.05))
            x = hp(bed_signal(k, a / SR, z / SR, r)[:, : z - a], 28, 2)
            if x.shape[1] < z - a:
                x = np.pad(x, ((0, 0), (0, z - a - x.shape[1])))
        full = w[a:z] > 0.999
        ref = integrated(x[:, full]) if full.sum() > ns(0.5) else integrated(x)
        g = dbg(v_ref + BED_LEVEL[k] - ref)
        md = bed_mod_db(k, t[a:z])
        x = x * g * w[None, a:z] * dbg(md)[None, :]
        if k == "farm_storm":                    # A3 P3: the louder rain keeps the consonant band clear: 1-4 kHz -4 dB more under the words
            we_s = word_env(t[a:z], pre=0.1, post=0.08, tau=0.08)
            band = _sig.sosfiltfilt(_sig.butter(2, [1000.0, 4000.0], btype="bandpass", fs=SR, output="sos"), x, axis=-1)   # zero-phase
            x = x - band * (1 - dbg(-4.0 * we_s))[None, :]
        out[:, a:z] += x
        spans = []
        on = np.flatnonzero(np.diff(np.concatenate([[0], (w > 0.5).astype(int), [0]])))
        for i0, i1 in zip(on[::2], on[1::2]):
            spans.append((i0 / SR, i1 / SR))
        rows.append((k, BED_LEVEL[k], spans, BED_DESC[k]))
    return out, rows


# ================================================================ render
SPACES = {"out": dict(rt60=0.6, seed=77, pre=0.012, hf=1.8, early=[(0.06, 0.3, -0.5), (0.11, 0.2, 0.6)]),
          "room": dict(rt60=0.45, seed=78, pre=0.006, hf=1.4, early=[(0.011, 0.4, -0.3), (0.019, 0.3, 0.4)]),
          "hall": dict(rt60=1.1, seed=79, pre=0.015, hf=1.3, early=[(0.023, 0.35, 0.3), (0.041, 0.25, -0.4)]),
          "tank": dict(rt60=1.6, seed=80, pre=0.01, hf=0.9, early=[(0.018, 0.5, -0.2), (0.037, 0.4, 0.3), (0.055, 0.3, 0.0)]),
          "pump": dict(rt60=0.8, seed=81, pre=0.008, hf=1.2, early=[(0.014, 0.4, 0.3), (0.027, 0.3, -0.3)])}


def write_used():
    D, SRC = picture_events()
    out = {"_doc": "frames (30 fps) every SFX used in the last mix.py run; copy a key into picture_events.json to override it "
                   "(a frame, a list of frames, the same dict shape, a 'beat+n' expression, or null to drop the cue)",
           "_probes": picture_probes()[1]}
    for k, v in D.items():
        out[k] = {"value": v, "source": SRC[k]}
    with open(PE_USED, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)


def _render_set(C, v_ref, on_event=None):
    out = np.zeros((2, N))
    sends = {k: np.zeros(N) for k in SPACES}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        cur = momentary_max(x)
        if np.isfinite(cur):
            x = x * dbg(v_ref + c.level - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        if c.post:
            x = c.post(x)
        t0 = c.t - anchor
        wc = c.wcarve if c.wcarve is not None else _WCARVE.get(c.name)
        if isinstance(wc, dict):
            x = carve_words(x, t0, wc.get("db", -6.0), wc.get("lo", 1000.0), wc.get("hi", 4000.0), broad_db=wc.get("broad", 0.0))
        elif wc:
            x = carve_words(x, t0, wc)
        c.measured = momentary_max(x) - v_ref
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(sends[c.space], c.send * x.mean(0), max(0.0, t0))
    for k, s in sends.items():
        if np.any(s):
            sp = SPACES[k]
            ir = make_ir(sp["rt60"], sp["seed"], pre=sp["pre"], hf=sp["hf"], early=sp["early"])
            out += 0.6 * convolve_st(s, ir)
    return hp(out, 30, 2)


def render_events(v_ref, on_event=None):
    C = cues()
    # THE REVEAL: every event that started BEFORE 'Inside...' (the storm's thunder, the far ladder, the lenders) is cut on
    # 'Inside...' (40 ms fade, like the score) together with its reverb and stays cut through the reveal; the reveal's own
    # sounds (the bubble blips in the held breath, the single slosh after 'water.', the fish's blub) play on their own
    h0 = T.bt("inside") - 0.04 if "inside" in T.BEAT else None
    pre = [c for c in C if h0 is None or c.t < h0]
    post = [c for c in C if h0 is not None and c.t >= h0]
    out = _render_set(pre, v_ref, on_event)
    if h0 is not None:
        h1 = T.bt("youSee") - 0.02
        i0, i1 = ns(h0), ns(h1)
        if i1 > i0:
            f = ns(0.04)
            out[:, i0:i0 + f] *= np.linspace(1, 0, f)[None, :]
            out[:, i0 + f:i1] = 0.0
        out += _render_set(post, v_ref, on_event)
    # only the dawn bed may cross the loop point: the events stem is silent by the last 2 frames
    a, z = ns(T.DUR - 0.25), ns(T.DUR - 2 * FR)
    out[:, a:z] *= np.linspace(1, 0, z - a)[None, :] ** 2
    out[:, z:] = 0.0
    return out, C


def render(v_ref):
    ev, C = render_events(v_ref)
    beds, rows = render_beds(v_ref)
    return ev, beds, C, rows

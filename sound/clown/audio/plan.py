# The picture's CONTRACT for the sound. Nothing is re-typed here: audio/picture_plan.json is EXPORTED from the picture's
# own code (studio/src/videos/clown/plan.ts clownAt / DUCK_F / COUNT and cast_plan.ts WALKERS / walkerAt) by
# `node out/clown/export_plan.mjs` (run from studio/; mix.py runs it at every mix), so the walkers' pass-bys, the two
# duck frames of the count, the clown's route (where he is, how fast, how far he has ridden: the wheel's turn) and the
# opening lens agree with the picture frame by frame. Only the opening lens is a constant (cams_square.ts OPEN(0)).
import json
import math
import os
import numpy as np
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN_PATH = os.path.join(HERE, "picture_plan.json")
if not os.path.exists(PLAN_PATH):
    raise SystemExit("picture_plan.json is missing: run `node out/clown/export_plan.mjs` from studio/ (or `python mix.py`, which runs it)")
with open(PLAN_PATH, encoding="utf-8") as _f:
    J = json.load(_f)

B = T.BEAT
TOTAL = T.TOTAL
FPS = T.FPS
STALE = int(J.get("total", TOTAL)) != TOTAL          # the picture clock moved since the export (mix.py re-exports; a warning otherwise)

LENS0 = (0.0, 17.0)                            # cams_square.ts OPEN(0): lens [0, 1.25, 17] looking along -z, 44 deg (vertical)
HALF_W = math.tan(math.radians(22.0)) * 9.0 / 16.0   # half-width of the opening frame per metre of depth

# ---------------- the count (shot 1) ----------------
COUNT_A, COUNT_B = int(J["COUNT"]["a"]), int(J["COUNT"]["b"])   # plan.ts COUNT = { a: BEAT.jobEnd, b: BEAT.howMany }
DUCK_F = [int(x) for x in J["DUCK_F"]]         # plan.ts DUCK_F: the two duck moments of the count. NOTHING may sound on them
MID_F = int(J["MID_F"])


def screen_x(x, z, lens=LENS0):
    """-1 .. +1 across the OPENING frame (0 = centre) for a ground point; outside +-1 = off screen (array ok)"""
    d = np.maximum(0.5, lens[1] - np.asarray(z, float))
    return (np.asarray(x, float) - lens[0]) / d / HALF_W


def lens_dist(x, z, lens=LENS0):
    return np.hypot(np.asarray(x, float) - lens[0], np.asarray(z, float) - lens[1])


# ---------------- the walkers of the opening set-up (cast_plan.ts) ----------------
_W = J.get("walkers") or {"tau0": 0, "tau1": 0, "list": []}
TAU0, TAU1 = int(_W["tau0"]), int(_W["tau1"])


def walkers(kind=None):
    """[dict(id, kind, n, tau (frames of shot 1; negative = shot 9), x, z, on, duck, d (m from the lens), sx)]"""
    out = []
    tau = np.arange(TAU0, TAU1 + 1, dtype=float)
    for w in _W["list"]:
        if kind and w["kind"] != kind:
            continue
        x, z = np.asarray(w["x"], float), np.asarray(w["z"], float)
        out.append(dict(id=w["id"], kind=w["kind"], n=w.get("n"), tau=tau, x=x, z=z, on=np.asarray(w["on"], bool),
                        duck=np.asarray(w["duck"], float), d=lens_dist(x, z), sx=screen_x(x, z),
                        # s = metres along the route (the picture's walk phase is s / STRIDE cycles; a foot lands every
                        # STRIDE / 2: samples.step_frames / step_track), v = walking speed in m/s
                        s=np.asarray(w["s"], float) if "s" in w else None, v=float(w.get("v", 1.25))))
    return sorted(out, key=lambda w: (w["n"] is None, w["n"] or 0))


STRIDE = float(J.get("STRIDE", 1.04))          # cast_people.ts STRIDE: metres per walk cycle (two steps)


def hero_tracks():
    """{shot: dict(a = first frame, frames, s = metres walked per frame)} of the hero's own walk in shots 4, 6 and 8
    (plan.ts hero4 / hero6, mid_plan.ts hero8x), for her recorded footsteps (samples.step_track)"""
    out = {}
    for k, v in (J.get("hero") or {}).items():
        s_ = np.asarray(v["s"], float)
        out[int(k[1:])] = dict(a=int(v["a"]), frames=int(v["a"]) + np.arange(len(s_), dtype=float), s=s_)
    return out


# ---------------- the clown's route (plan.ts clownAt) ----------------
_C = J.get("clown")
HAS_CLOWN = _C is not None
if HAS_CLOWN:
    _CX, _CZ, _CS = (np.asarray(_C[k], float) for k in ("x", "z", "s"))
    WHEEL_R = float(_C["WHEEL_R"])             # the picture's wheel radius (a loop is a whole number of wheel turns)
    ROUTE_LEN = float(_C["ROUTE_LEN"])         # metres ridden per loop
    CLOWN_ON_LAP, CLOWN_OFF_LAP = int(_C["ON_LAP"]), int(_C["OFF_LAP"])
    _F = np.arange(len(_CX), dtype=float)


def clown_xz(f):
    f = np.asarray(f, float) % TOTAL
    return np.interp(f, _F, _CX), np.interp(f, _F, _CZ)


def clown_metres(f):
    """metres ridden since frame 0 (monotone, + ROUTE_LEN per loop): the wheel angle is this / WHEEL_R"""
    f = np.asarray(f, float)
    k = np.floor(f / TOTAL)
    return k * ROUTE_LEN + np.interp(f - k * TOTAL, _F, _CS)


def clown_speed(f):
    """ground speed (m / s) at frame f"""
    f = np.asarray(f, float)
    return (clown_metres(f + 0.5) - clown_metres(f - 0.5)) * FPS


def clown_dist(f):
    """metres from the OPENING lens"""
    return lens_dist(*clown_xz(f))


if __name__ == "__main__":
    print(f"TOTAL {TOTAL} (export {J.get('total')}{', STALE' if STALE else ''}), count {COUNT_A}..{COUNT_B}, DUCK_F {DUCK_F}, MID_F {MID_F}")
    for w in walkers("phone"):
        k = w["on"] & (np.abs(w["sx"]) < 1.25) & (w["tau"] >= 0)
        if not k.any():
            continue
        t = w["tau"][k]
        row = " | ".join(f"tau {int(a)}: sx {w['sx'][w['tau'] == a][0]:+.2f} d {w['d'][w['tau'] == a][0]:4.1f}" for a in (t[0], *[d for d in DUCK_F if t[0] <= d <= t[-1]], t[-1]))
        print(f"phone-walker {w['n']} {w['id']:<6} in frame tau {int(t[0])}..{int(t[-1])}: {row}; max duck {w['duck'].max():.2f} at tau {int(w['tau'][np.argmax(w['duck'])])}")
    if HAS_CLOWN:
        print(f"clown: wheel r {WHEEL_R:.4f} m, route {ROUTE_LEN:.1f} m = {ROUTE_LEN / (2 * math.pi * WHEEL_R):.2f} wheel turns per loop, on the lap f {CLOWN_ON_LAP}..{CLOWN_OFF_LAP}")
        for f in (0, 20, 40, 60, 100, 150, 208, 400, 1600, 1656, 1700, 1750, 1790, 1830, TOTAL):
            x, z = clown_xz(f)
            print(f"  f {f:4d}: x {float(x):+.2f} z {float(z):+.2f}  {float(clown_dist(f)):5.1f} m from the lens, sx {float(screen_x(x, z)):+.2f}, {float(clown_speed(f)):.2f} m/s")

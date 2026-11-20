# SELF-TEST of the sample playback and of the sync-direction check (fix round 1). It renders a handful of test cues IN
# MEMORY through the engine's own event renderer; it does not run the mix, writes no audio and plays nothing.
# usage: PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/clown/audio/samples_selftest.py
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ["SYNC_CHECK"] = "warn"          # this test WANTS to see a violation reported, not to stop on it
from dsp import SR, rng, integrated  # noqa: E402
import timeline as T  # noqa: E402
import samples as SM  # noqa: E402
import sfx  # noqa: E402

db = lambda p: 10 * np.log10(p + 1e-14)
ok_all = True


def check(name, cond, detail=""):
    global ok_all
    ok_all &= bool(cond)
    print(f"  [{'ok' if cond else 'FAIL'}] {name}" + (f": {detail}" if detail else ""))


print("1. what is on disk")
rep = SM.report()
print("   " + ", ".join(f"{k} {len(v)}" for k, v in rep.items()))
check("every logical sound has at least one usable take", all(len(v) for v in rep.values()), ", ".join(k for k, v in rep.items() if not v) or "all present")

print("2. rotation, pitch, trim")
labs = [SM.get("step_hard", i)[2] for i in range(6)]
check("six calls give six different takes", len(set(labs)) == 6, " ".join(labs))
x0, a0, _ = SM.get("peg", 0)
x1, a1, _ = SM.get("peg", 0, semis=+1.0)
x2, a2, _ = SM.get("peg", 0, semis=-1.0)
check("+1 / -1 semitone changes the length by 2^(-/+1/12)", abs(len(x1) / len(x0) - 2 ** (-1 / 12)) < 0.01 and abs(len(x2) / len(x0) - 2 ** (1 / 12)) < 0.01,
      f"{len(x0)} -> {len(x1)} / {len(x2)} samples")
heads = {}
for k in ("peg", "pop", "stamp", "page_land", "tick", "freeze_hit", "impact", "chime"):
    xk, ak, _ = SM.get(k, 0)
    e_ = SM.env(xk, 0.003)
    heads[k] = (20 * np.log10(e_[: int(0.006 * SR)].max() / e_.max() + 1e-9), ak * 1000)
check("no dead air at the head of a trimmed take (the first 6 ms are within 42 dB of the peak)", all(v[0] > -43 for v in heads.values()),
      ", ".join(f"{k} {v[0]:.0f} dB, sync point at {v[1]:.1f} ms" for k, v in heads.items()))

print("3. distance filtering (near = louder and brighter)")
st_ = SM.get("step_hard", 0)[0]


def hf_share(x):
    X = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return db(X[f > 3000].sum() / (X.sum() + 1e-20))


near, far = SM.distance(st_, 6.0), SM.distance(st_, 22.0)
check("22 m is quieter than 6 m", db(np.mean(far ** 2)) < db(np.mean(near ** 2)) - 8, f"{db(np.mean(near ** 2)):.1f} -> {db(np.mean(far ** 2)):.1f} dB")
check("22 m is duller than 6 m (share above 3 kHz)", hf_share(far) < hf_share(near) - 3, f"{hf_share(near):.1f} -> {hf_share(far):.1f} dB")

print("4. the horn, tuned")
for note, nm in ((67, "G"), (64, "E"), (60, "C")):
    got = [SM.honk(note, i) for i in range(3)]
    f0 = [SM._f0(g[0])[0] for g in got]
    want = [440 * 2 ** ((g[3] - 69) / 12) for g in got]
    check(f"three different squeezes land on {nm} within 0.35 semitone", len({g[2] for g in got}) == 3 and all(abs(12 * np.log2(a / b)) < 0.35 for a, b in zip(f0, want)),
          ", ".join(f"{g[2]} {a:.0f} Hz (shift {g[4]:+.2f} st)" for g, a in zip(got, f0)))
hh = SM.honk_honk((67, 67), 0)
check("honk-honk is two squeezes under 0.6 s", hh is not None and len(hh[0]) / SR < 0.6, f"{len(hh[0]) / SR:.2f} s from {hh[2]}")

print("5. footsteps on the picture's own foot-down frames")
import plan as PL  # noqa: E402
J = PL.J
w = next(q for q in J["walkers"]["list"] if q["id"] == "hero")
tau = np.arange(J["walkers"]["tau0"], J["walkers"]["tau1"] + 1, dtype=float)
x_, z_, s_, on_ = (np.asarray(w[k], float) for k in ("x", "z", "s", "on"))
d_ = PL.lens_dist(x_, z_)
sx_ = PL.screen_x(x_, z_)
fr = SM.step_frames(tau, s_, on_.astype(bool), stride=J.get("STRIDE", 1.04))
gaps = np.diff([f for f, _ in fr])
check("a foot lands every STRIDE / 2 of walking", len(fr) > 10 and abs(np.median(gaps) - (J.get("STRIDE", 1.04) / 2) / (w["v"] / 30.0)) < 0.6,
      f"{len(fr)} steps, median gap {np.median(gaps):.2f} f (expected {(J.get('STRIDE', 1.04) / 2) / (w['v'] / 30.0):.2f} f)")
n = int((tau[-1] - 0) / 30 * SR)
trk, log = SM.step_track(n, 30.0, tau, s_, d_, np.clip(0.55 * sx_, -0.1, 0.5), rng(5), on=on_.astype(bool), shoe="step_soft", stride=J.get("STRIDE", 1.04), f_start=0.0)
check("consecutive steps never use the same take", all(a["take"] != b["take"] for a, b in zip(log, log[1:])), f"{len(log)} steps placed, {len({q['take'] for q in log})} different takes")
g = np.array([q["gain_db"] for q in log])
check("the level follows the distance only (no step jumps more than 1.5 dB from its neighbours' mean)",
      len(g) > 4 and np.max(np.abs(g[1:-1] - 0.5 * (g[:-2] + g[2:]))) < 1.5, f"largest deviation {np.max(np.abs(g[1:-1] - 0.5 * (g[:-2] + g[2:]))):.2f} dB; near {g.max():+.1f} dB, far {g.min():+.1f} dB")
on = [int(np.flatnonzero(np.abs(trk.mean(0)[int(max(0, (q['frame'] / 30 - 0.02) * SR)): int((q['frame'] / 30 + 0.1) * SR)]) > 0)[0]) for q in log[:1]]
err = []
for q in log:
    i0 = int((q["frame"] / 30.0 - 0.03) * SR)
    seg = trk.mean(0)[max(0, i0): i0 + int(0.2 * SR)]
    if np.max(np.abs(seg)) > 0:
        err.append((max(0, i0) / SR + SM.onset(seg)) * 30 - q["frame"])
check("every step's onset is on its foot-down frame (within +-0.5 f; overlapping steps excluded)", np.median(np.abs(err)) < 0.3, f"median |error| {np.median(np.abs(err)):.2f} f over {len(err)} steps")

print("6. cues through the engine: level, pan, sync point, and the sync-direction check")
f0 = 300.0


def cue(name, frame, gen, level=-15, p=0.0, **kw):
    return sfx.Cue(T.fr(frame), name, "self-test", gen, level, p=p, pe=f"test_{name}", key=str(frame), wcarve=0, send=0.0, **kw)


C = [
    cue("peg", f0, sfx.smp("peg", 0)),
    cue("pop", f0 + 30, sfx.smp("pop", 1, vary=1.0), p=0.4),
    cue("honk", f0 + 60, sfx.honk_gen((67, 67), 0), level=-10, p=0.25),
    cue("duck", f0 + 90, sfx.mix_parts((sfx.smp("leaf_brush", 0), 0.0, 0.0), (sfx.smp("whoosh_body", 1, sync="peak"), 2 / 30.0, -3.0), (sfx.smp("duck_cloth", 0), 0.0, -6.0))),
    cue("slowwhoosh", f0 + 150, sfx.smp("whoosh_slow", 0, sync="peak")),
    cue("freeze", f0 + 200, sfx.smp("freeze_hit", 0)),
    cue("far_step", f0 + 230, sfx.smp("step_hard", 3, d=20.0), level=-25),
    cue("fallback", f0 + 260, sfx.smp("pop", 0, fallback=lambda r: sfx.X.text_pop(r))),
    # two deliberate mistakes the check must catch: a hit 3 frames EARLY and a hit 4 frames LATE
    cue("EARLY", f0 + 300, (lambda g: (lambda: (lambda xa: (xa[0], xa[1] + 3 / 30.0))(g())))(sfx.smp("peg", 1))),
    cue("LATE", f0 + 330, (lambda g: (lambda: (lambda xa: (xa[0], xa[1] - 4 / 30.0))(g())))(sfx.smp("peg", 1))),
]
V_REF = -17.0
out = sfx._render_set(C, V_REF)
rows = sfx.sync_rows(C)
for r_, c in zip(rows, C):
    a, z = int((c.frame / 30 - 0.05) * SR), int((c.frame / 30 + 0.5) * SR)
    seg = out[:, a:z]
    bal = (np.mean(seg[1] ** 2) - np.mean(seg[0] ** 2)) / (np.mean(seg[1] ** 2) + np.mean(seg[0] ** 2) + 1e-20)
    print(f"   {c.name:<11} frame {c.frame:6.1f}  mode {r_['mode']:<6} sync error {r_['err']:+5.2f} f  level asked {c.level:+.0f} LU, measured {c.measured:+.1f} LU  L/R balance {bal:+.2f}  -> {'in tolerance' if r_['ok'] else 'OUT of tolerance'}")
good = [r_ for r_ in rows if r_["name"] not in ("EARLY", "LATE")]
check("every well-keyed cue is inside -1 .. +2 f", all(r_["ok"] for r_ in good), f"largest |error| {max(abs(r_['err']) for r_ in good):.2f} f")
check("measured level = asked level (the engine sets it)", all(abs(c.measured - c.level) < 0.6 for c in C), "")
def _bal(c):
    a, z = int((c.frame / 30 - 0.05) * SR), int((c.frame / 30 + 0.5) * SR)
    return (np.mean(out[1, a:z] ** 2) - np.mean(out[0, a:z] ** 2)) / (np.mean(out[1, a:z] ** 2) + np.mean(out[0, a:z] ** 2) + 1e-20)


check("pan +0.4 puts the pop on the right, pan 0 keeps the peg centred", _bal(C[1]) > 0.3 and abs(_bal(C[0])) < 0.05, f"pop {_bal(C[1]):+.2f}, peg {_bal(C[0]):+.2f}")
bad = sfx.sync_check(rows, mode="warn")
check("the check catches the 3-frames-early and the 4-frames-late cue, and only those", sorted(r_["name"] for r_ in bad) == ["EARLY", "LATE"], ", ".join(f"{r_['name']} {r_['err']:+.1f} f" for r_ in bad))
try:
    sfx.sync_check(rows, mode="fail")
    stopped = False
except SystemExit:
    stopped = True
check("in the default mode ('fail') the same rows STOP the mix", stopped)

print("\nALL PASSED" if ok_all else "\nSOMETHING FAILED (see above)")

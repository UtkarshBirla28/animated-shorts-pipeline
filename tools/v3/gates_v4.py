# GATES v4 (DIRECTOR, pointing v4, 2026-11-20): numbers that measure what the OWNER SAW in v1 ("glitchy, arms going
# somewhere, focusing on one thing, no fun"), next to qa_gates.py (which stays for loudness / peak / LRA / captions / seam /
# chroma). For a v4 film, qa_gates' old "on-screen camera >= 0.6 %/f" gate is REPLACED by "moves, then rests" below:
# it pushed v1 into constant creep (83 % of frames with whole-frame motion, 0 % holds).
#   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/gates_v4.py <video.mp4> --shots=<shots json> [--cast=<cast log json>] [--out=<dir>]
# --shots: [{id, from, to, closeUp?}] (briefs/v3/pointing/director/probe_v4.mjs json writes {shots: [...]}: both accepted)
# --cast:  CAST's per-frame card log (see CAST_LOG below); without it the four card gates say "NO DATA" (never PASS).
# Motion numbers are the benchmark's (studio/out/pointing/benchmark/animation/tools/motion.py): 108x192 grey, the picture
# region = the top 58 % (above the captions), a pixel "moves" when it changes by > 14 levels, 24 cells (4 x 6).
#   hold frame          = under 1 % of the picture moves              FILM 8-20 % (refs median 11.5, anti-theft 15.6, v1 0.0)
#   whole-frame motion  = 12+ of 24 cells move at once                FILM < 60 % (refs ~55, anti-theft 34.5, v1 83.4)
#   one-thing frame     = something moves but only in <= 3 cells      a shot over 2 s with > 70 % one-thing frames FAILS
#   camera rest         = a run of >= 15 frames with <= 6 of 24 cells moving, ending in the last 45 % of the shot: EVERY shot
# CAST_LOG (json list, one row per drawn card per frame; CAST writes it with inputProps kit.dbg / its own probe):
#   {"f": 120, "who": "hori", "op": 1.0, "head": [x0, y0, x1, y1], "hands": [[x, y], ...], "armOut": false}
#   coordinates = fractions of the 1080x1920 frame (0..1, y down). Gates: arm-out frames < 10 % of the film (any card);
#   no hand inside any head box (padded by 5 % of its height); no card with 0 < op < 1; a head over 25 % of the frame
#   height only in a shot marked closeUp.
import json, os, subprocess, sys
import numpy as np

arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)
VID = sys.argv[1]
SH = json.load(open(arg("--shots"), encoding="utf-8")); SH = SH["shots"] if isinstance(SH, dict) else SH
OUT = arg("--out"); CAST = arg("--cast")
W, H, TOP = 108, 192, int(192 * 0.58)

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", VID, "-vf", f"fps=30,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
N = len(a)
mov = np.abs(np.diff(a, axis=0)) > 14                      # frame pair i -> i+1
pic = mov[:, :TOP, :]
area = pic.mean(axis=(1, 2))
cells = np.zeros(len(pic)); ch, cw = TOP // 6, W // 4
for i in range(6):
    for j in range(4): cells += pic[:, i * ch:(i + 1) * ch, j * cw:(j + 1) * cw].mean(axis=(1, 2)) > 0.04
# cut pairs are not motion: a pair across a shot boundary is skipped
cutpair = np.zeros(len(pic), bool)
for s in SH:
    if 0 < s["from"] <= len(pic): cutpair[s["from"] - 1] = True
ok = ~cutpair
hold = (area < 0.01) & ok; wide = (cells >= 12) & ok; one = (area >= 0.01) & (cells <= 3) & ok
rows, fails = [], []
def gate(name, passed, val, want, warn=False):
    st = "PASS" if passed else ("WARN" if warn else "FAIL"); rows.append((st, name, val, want))
    if st == "FAIL": fails.append(name)
gate("film hold frames (still beats)", 8 <= hold.sum() / ok.sum() * 100 <= 20, f"{hold.sum() / ok.sum() * 100:.1f} %", "8-20 % (refs 11.5, anti-theft 15.6)")
gate("film whole-frame motion", wide.sum() / ok.sum() * 100 < 60, f"{wide.sum() / ok.sum() * 100:.1f} %", "< 60 % (refs ~55, anti-theft 34.5)")

# per shot: the camera rest, one-thing shots
per = []
for s in SH:
    f0, f1 = s["from"], min(s["to"], N) - 1                 # pairs f0 .. f1-1
    if f1 - f0 < 4: continue
    c = cells[f0:f1]; n = len(c)
    still = c <= 6; best, run, end_ok = 0, 0, False
    for k in range(n):
        run = run + 1 if still[k] else 0
        if run >= 15 and k >= n * 0.55: end_ok = True
        best = max(best, run)
    dur = (s["to"] - s["from"]) / 30
    one_share = float(one[f0:f1].mean()) if n else 0
    r = {"id": s["id"], "dur_s": round(dur, 2), "rest_run_f": int(best), "rest_at_end": bool(end_ok), "one_thing": round(one_share * 100, 1),
         "hold": round(float(hold[f0:f1].mean()) * 100, 1), "wide": round(float(wide[f0:f1].mean()) * 100, 1), "mean_cells": round(float(c.mean()), 1)}
    bad = []
    if not end_ok: bad.append(f"no camera rest (longest still run {best} f, want >= 15 f in its last 45 %)")
    if dur > 2.0 and one_share > 0.70: bad.append(f"only one small thing moves in {one_share * 100:.0f} % of its frames")
    if dur > 3.5: bad.append(f"{dur:.1f} s long (want <= 3.5 s)")
    r["fail"] = bad; per.append(r)
nb = [r for r in per if r["fail"]]
gate("every shot moves, then RESTS", not any("rest" in x for r in nb for x in r["fail"]), f"{sum(1 for r in per if not r['rest_at_end'])} of {len(per)} shots without a rest", "0")
gate("no shot > 2 s where one small thing moves", not any("one small" in x for r in nb for x in r["fail"]), f"{sum(1 for r in per if any('one small' in x for x in r['fail']))} shots", "0")
gate("no shot over 3.5 s", not any("s long" in x for r in nb for x in r["fail"]), f"{sum(1 for r in per if any('s long' in x for x in r['fail']))} shots", "0")

# the card gates (CAST's per-frame log)
if CAST and os.path.exists(CAST):
    log = json.load(open(CAST, encoding="utf-8"))
    close = {s["id"] for s in SH if s.get("closeUp")}
    shot_of = lambda f: next((s["id"] for s in SH if s["from"] <= f < s["to"]), None)
    frames_arm = {r["f"] for r in log if r.get("armOut")}
    gate("arm out from the body", len(frames_arm) / N * 100 < 10, f"{len(frames_arm) / N * 100:.1f} % of frames", "< 10 % (refs ~4 %, v1 34 %)")
    byf = {}
    for r in log: byf.setdefault(r["f"], []).append(r)
    over = []
    for f, rs in byf.items():
        for r in rs:
            for o in rs:
                if not o.get("head"): continue
                x0, y0, x1, y1 = o["head"]; p = 0.05 * (y1 - y0)
                for hx, hy in r.get("hands", []):
                    if x0 - p <= hx <= x1 + p and y0 - p <= hy <= y1 + p: over.append((f, r["who"], o["who"]))
    gate("no hand inside a face", not over, f"{len(over)} hand-frames" + (f" (first f{over[0][0]} {over[0][1]} on {over[0][2]})" if over else ""), "0")
    ghost = [(r["f"], r["who"]) for r in log if 0.001 < r.get("op", 1) < 0.999]
    gate("no see-through character card", not ghost, f"{len(ghost)} card-frames" + (f" (first f{ghost[0][0]} {ghost[0][1]})" if ghost else ""), "0")
    big = [(r["f"], r["who"]) for r in log if r.get("head") and r["head"][3] - r["head"][1] > 0.25 and shot_of(r["f"]) not in close]
    gate("faces at most 1/4 of the height (outside close-ups)", not big, f"{len(big)} card-frames" + (f" (first f{big[0][0]} {big[0][1]})" if big else ""), "0")
else:
    for g in ("arm out from the body", "no hand inside a face", "no see-through character card", "faces at most 1/4 of the height (outside close-ups)"):
        rows.append(("NO DATA", g, "CAST log missing", "--cast=<log>"))

lines = [f"GATES v4  {os.path.basename(VID)}  ({N} frames, {len(SH)} shots)", ""]
lines += [f"  {st:<8} {name:<52} {val:<34} want {want}" for st, name, val, want in rows]
lines += ["", f"  {'shot':<6}{'s':>6}{'rest':>6}{'end':>5}{'one%':>7}{'hold%':>7}{'wide%':>7}{'cells':>7}  failing"]
lines += [f"  {r['id']:<6}{r['dur_s']:>6}{r['rest_run_f']:>6}{('yes' if r['rest_at_end'] else 'NO'):>5}{r['one_thing']:>7}{r['hold']:>7}{r['wide']:>7}{r['mean_cells']:>7}  {'; '.join(r['fail'])}" for r in per]
lines += ["", "GATES v4: " + ("PASS" if not fails else "FAIL (" + ", ".join(fails) + ")")]
print("\n".join(lines))
if OUT:
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, "gates_v4.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    json.dump({"film": rows, "shots": per, "fails": fails}, open(os.path.join(OUT, "gates_v4.json"), "w"), indent=1)

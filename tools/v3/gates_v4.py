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
#   coordinates = fractions of the 1080x1920 frame (0..1, y down). Gates: arm-out frames <= 16 % of the film, WARN over 12 % (the lead's exception: this film is about pointing);
#   no hand inside any head ELLIPSE (inscribed in the head box, +5 %); no card with 0 < op < 1; a head over 25 % of the frame
#   height only in a shot marked closeUp.
import json, os, subprocess, sys
import numpy as np

ARM_WARN, ARM_MAX = 16.0, 18.0        # % of the film's frames with an arm out. Lead 2026-11-21 (pass 3): FAIL over 18 %, WARN over 16 %: pointing IS this film's subject and every point is now a clean sleeve arm held on purpose (refs ~4 %, v1 34 %)
HEAD_PAD = 0.05                        # the face = the head box's inscribed ellipse, 5 % bigger
FW, FH = 1080, 1920
def head_dist(head, hands):
    """the smallest distance of any hand from the head centre, in head radii (ellipse inscribed in the head box)"""
    x0, y0, x1, y1 = head; a, b = (x1 - x0) * FW / 2, (y1 - y0) * FH / 2
    if a <= 0 or b <= 0 or not hands: return None
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return min(((((hx - cx) * FW) / a) ** 2 + (((hy - cy) * FH) / b) ** 2) ** 0.5 for hx, hy in hands)

arg = lambda k, d=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(k + "=")), d)
VID = sys.argv[1]
SH = json.load(open(arg("--shots"), encoding="utf-8")); SH = SH["shots"] if isinstance(SH, dict) else SH
OUT = arg("--out"); CAST = arg("--cast")
# --cams: briefs/v3/pointing/director/probe_cams_v4.mjs json (the camera itself, per shot: travel, trailing rest frames).
# With it, "every shot RESTS" is judged on the CAMERA (a cab window full of streaming fields is not a moving camera);
# the picture-settles test stays as information.
CAMS = {r["id"]: r for r in json.load(open(arg("--cams"), encoding="utf-8"))} if arg("--cams") and os.path.exists(arg("--cams")) else None
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
# lead r2 (2026-11-21): PASS 7-20 %, WARN 5-7 % (the three references hold on 4.9, 7.1 and 11.8 %); reach it by HOLDING the
# key poses (the X, 5 OF 12, the driver's point, the conductor's point, her last point), never by freezing a shot
hp = hold.sum() / ok.sum() * 100
gate("film hold frames (still beats)", 7 <= hp <= 20, f"{hp:.1f} %", "7-20 % (WARN 5-7; refs 4.9 / 7.1 / 11.8, anti-theft 15.6)", warn=5 <= hp < 7)
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
    if CAMS and s["id"] in CAMS:
        cr, need = CAMS[s["id"]]["rest"], (6 if s["to"] - s["from"] < 36 else 10)   # camkit.restFrames round 1: 6-8 / 10-14
        if CAMS[s["id"]].get("planRest") == 0: need = 0                              # shot plan rest: 0 = a deliberate continuous move
        r["cam_rest_f"] = cr; r["picture_settles"] = bool(end_ok)
        if cr < need: bad.append(f"no camera rest (camera still for its last {cr} f, want >= {need} f)")
    elif not end_ok: bad.append(f"no camera rest (longest still run {best} f, want >= 15 f in its last 45 %)")
    if dur > 2.0 and one_share > 0.70: bad.append(f"only one small thing moves in {one_share * 100:.0f} % of its frames")
    if dur > 3.5: bad.append(f"{dur:.1f} s long (want <= 3.5 s)")
    r["fail"] = bad; per.append(r)
nb = [r for r in per if r["fail"]]
gate("every shot moves, then RESTS" + (" (camera probe)" if CAMS else " (picture cells)"), not any("rest" in x for r in nb for x in r["fail"]),
     f"{sum(1 for r in per if any('rest' in x for x in r['fail']))} of {len(per)} shots without a rest", "0")
if CAMS: rows.append(("INFO", "shots whose PICTURE never settles (moving world)", str(sum(1 for r in per if not r.get("picture_settles", True))) + " shots: " + " ".join(r["id"] for r in per if not r.get("picture_settles", True)), "cab / train windows may stream"))
gate("no shot > 2 s where one small thing moves", not any("one small" in x for r in nb for x in r["fail"]), f"{sum(1 for r in per if any('one small' in x for x in r['fail']))} shots", "0")
gate("no shot over 3.5 s", not any("s long" in x for r in nb for x in r["fail"]), f"{sum(1 for r in per if any('s long' in x for x in r['fail']))} shots", "0")

# THE LOOP SEAM (lead 2026-11-21, option B): on the whole film, the last frame -> frame 0 must be no bigger a change
# than two neighbouring frames of the film (the p75 of the non-cut frame steps); the caption band (y 0.64-0.78) is
# left out (the last caption has cleared, frame 0 brings "Tap your foot")
if SH and SH[0]["from"] == 0 and abs(SH[-1]["to"] - N) <= 1 and N > 60:
    keep = np.ones((H, W), bool); keep[int(H * 0.64):int(H * 0.78), :] = False
    stepm = lambda x, y: float(np.abs(x - y)[keep].mean())
    steps = np.array([stepm(a[i + 1], a[i]) for i in range(N - 1) if ok[i]])
    seam, p75 = stepm(a[N - 1], a[0]), float(np.percentile(steps, 75))
    gate("loop seam (last frame -> frame 0)", seam <= p75, f"{seam:.2f} (film step median {np.median(steps):.2f}, p75 {p75:.2f})", "<= the p75 frame step (a match, no jump)")

# NO FROZEN RUNS (audit r1: the shock beat was 8 pixel-still frames): no run of more than 3 identical frames (mean step
# < 0.35 grey levels of 255 on the whole 108x192 picture) inside a shot, anywhere in the film
fz = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2)) < 0.35
runs, k = [], 0
while k < len(fz):
    if fz[k] and ok[k]:
        j = k
        while j < len(fz) and fz[j] and ok[j]: j += 1
        if j - k + 1 > 3: runs.append((k, j))            # frames k..j are all the same picture
        k = j
    else: k += 1
gate("no frozen run over 3 frames", not runs, f"{len(runs)} runs" + (": " + ", ".join(f"f{x}-{y} ({next((s['id'] for s in SH if s['from'] <= x < s['to']), '?')})" for x, y in runs[:10]) if runs else ""), "0 (a still picture is never pixel-frozen)")

# CAPTIONS OVER FACES / HANDS (audit r1): the caption rectangles (probe_captions_v4.mjs json -> --caps) against CAST's log
CAPS_J = arg("--caps")
if CAPS_J and os.path.exists(CAPS_J) and CAST and os.path.exists(CAST):
    capr = json.load(open(CAPS_J, encoding="utf-8")); clog = json.load(open(CAST, encoding="utf-8"))
    byf = {}
    for r in clog: byf.setdefault(r["f"], []).append(r)
    hitf, hith = {}, {}
    for c in capr:
        x0, y0, x1, y1 = c["box"]
        for f in range(c["f0"], c["f1"]):
            for r in byf.get(f, []):
                h = r.get("head")
                if h:
                    hx0, hy0, hx1, hy1 = h[0] + (h[2] - h[0]) * 0.1, h[1] + (h[3] - h[1]) * 0.1, h[2] - (h[2] - h[0]) * 0.1, h[3] - (h[3] - h[1]) * 0.1
                    if hx0 < x1 and hx1 > x0 and hy0 < y1 and hy1 > y0: hitf.setdefault(c["shot"], set()).add(f)
                for hd in r.get("hands", []):
                    if x0 - 0.01 <= hd[0] <= x1 + 0.01 and y0 - 0.01 <= hd[1] <= y1 + 0.01: hith.setdefault(c["shot"], set()).add(f)
    nf, nh = sum(len(v) for v in hitf.values()), sum(len(v) for v in hith.values())
    gate("no caption over a face", nf == 0, f"{nf} frames" + (": " + ", ".join(f"{k} {len(v)} f" for k, v in sorted(hitf.items(), key=lambda x: -len(x[1]))) if nf else ""), "0 (move the caption in 62-78 % or the action)")
    gate("no caption over a hand", nh == 0, f"{nh} frames" + (": " + ", ".join(f"{k} {len(v)} f" for k, v in sorted(hith.items(), key=lambda x: -len(x[1]))) if nh else ""), "0", warn=True)
    # SAFE AREA (lead 08:50): nothing that matters below y 0.80 or right of x 0.90 (the Shorts app's overlays): the
    # captions / GO! / X boxes, and every acting hand of the cast log
    bad_c = sorted({c["shot"] for c in capr if c["box"][3] > 0.80 or c["box"][2] > 0.90})
    bad_h = {}
    for r in clog:
        for hd in r.get("hands", []):
            if hd[1] > 0.80 or hd[0] > 0.90:
                sh = next((s["id"] for s in SH if s["from"] <= r["f"] < s["to"]), "?"); bad_h.setdefault(sh, set()).add(r["f"])
    gate("captions / graphics inside the safe area", not bad_c, ", ".join(bad_c) or "all inside", "y <= 0.80, x <= 0.90")
    gate("hands inside the safe area", not bad_h, ", ".join(f"{k} {len(v)} f" for k, v in sorted(bad_h.items(), key=lambda x: -len(x[1]))) or "all inside", "y <= 0.80, x <= 0.90 (check: an extra's hand may be fine)", warn=True)

# the card gates (CAST's per-frame log)
if CAST and os.path.exists(CAST):
    log = json.load(open(CAST, encoding="utf-8"))
    close = {s["id"] for s in SH if s.get("closeUp")}
    shot_of = lambda f: next((s["id"] for s in SH if s["from"] <= f < s["to"]), None)
    frames_arm = {r["f"] for r in log if r.get("armOut")}
    # ARM OUT: the lead's reasoned exception for THIS film (its subject is pointing; clean sleeve arms held on purpose): PASS <= 16 %, WARN 16-18 %, FAIL > 18 %
    arm_pct = len(frames_arm) / N * 100
    st = "PASS" if arm_pct <= ARM_WARN else ("WARN" if arm_pct <= ARM_MAX else "FAIL")
    rows.append((st, "arm out from the body", f"{arm_pct:.1f} % of frames", f"<= {ARM_MAX:.0f} % (WARN over {ARM_WARN:.0f} %; refs ~4 %, v1 34 %)"))
    if st == "FAIL": fails.append("arm out from the body")
    byw, bys = {}, {}
    for r in log:
        if r.get("armOut"): byw.setdefault(r["who"], set()).add(r["f"])
    for f in frames_arm: bys[shot_of(f)] = bys.get(shot_of(f), 0) + 1
    arm_who = ", ".join(f"{w} {len(v) / N * 100:.1f} %" for w, v in sorted(byw.items(), key=lambda x: -len(x[1])))
    arm_shot = ", ".join(f"{sid} {n} f ({n / max(1, next((x['to'] - x['from'] for x in SH if x['id'] == sid), 1)) * 100:.0f} %)" for sid, n in sorted(bys.items(), key=lambda x: -x[1]))
    byf = {}
    for r in log: byf.setdefault(r["f"], []).append(r)
    # HAND IN A FACE: the ellipse INSCRIBED in the head box (in pixels of the 1080x1920 frame), padded HEAD_PAD; the box's
    # corners under the chin are NOT the face. d = the hand's distance from the head centre in head radii (1.0 = the edge).
    # CAST's cast/bench/castgate.py must use the same test (inscribed ellipse, pad 5 %).
    over, near = [], []
    for f, rs in byf.items():
        for r in rs:
            for o in rs:
                if not o.get("head"): continue
                d_min = head_dist(o["head"], r.get("hands", []))
                if d_min is None: continue
                if d_min <= 1 + HEAD_PAD: over.append((f, r["who"], o["who"], round(d_min, 2), o is r))
                elif d_min <= 1.25: near.append((f, r["who"], o["who"], round(d_min, 2)))
    own = [x for x in over if x[4]]; other = [x for x in over if not x[4]]   # own = the same card (a crowd shares names)
    gate("no hand inside its OWN face (head ellipse +5 %)", not own, f"{len(own)} hand-frames" + (f" (first f{own[0][0]} {own[0][1]}, {own[0][3]} radii)" if own else ""), "0")
    # another person's hand over a face: the log has no depth, so a hand BEHIND a nearer head counts too: WARN, look at it
    oshots = {}
    for x in other: oshots[shot_of(x[0])] = oshots.get(shot_of(x[0]), 0) + 1
    rows.append(("PASS" if not other else "WARN", "no hand over ANOTHER person's face (2D, no depth)", f"{len(other)} hand-frames" + (" in " + ", ".join(f"{k} {v}" for k, v in sorted(oshots.items(), key=lambda kv: -kv[1])[:6]) if other else ""), "0 (check each on the frames: behind a head is fine)"))
    ghost = [(r["f"], r["who"]) for r in log if 0.001 < r.get("op", 1) < 0.999]
    gate("no see-through character card", not ghost, f"{len(ghost)} card-frames" + (f" (first f{ghost[0][0]} {ghost[0][1]})" if ghost else ""), "0")
    big = [(r["f"], r["who"]) for r in log if r.get("head") and r["head"][3] - r["head"][1] > 0.25 and shot_of(r["f"]) not in close]
    gate("faces at most 1/4 of the height (outside close-ups)", not big, f"{len(big)} card-frames" + (f" (first f{big[0][0]} {big[0][1]})" if big else ""), "0")
else:
    for g in ("arm out from the body", "no hand inside a face", "no see-through character card", "faces at most 1/4 of the height (outside close-ups)"):
        rows.append(("NO DATA", g, "CAST log missing", "--cast=<log>"))

lines = [f"GATES v4  {os.path.basename(VID)}  ({N} frames, {len(SH)} shots)", ""]
lines += [f"  {st:<8} {name:<52} {val:<34} want {want}" for st, name, val, want in rows]
if CAST and os.path.exists(CAST):
    lines += ["", "  arm-out share per character: " + (arm_who or "none"), "  arm-out frames per shot: " + (arm_shot or "none")]
    if near: lines += [f"  near misses (a hand 1.05-1.25 head radii from a head centre): {len(near)} hand-frames, e.g. {near[:4]}"]
lines += ["", f"  {'shot':<6}{'s':>6}{'rest':>6}{'end':>5}{'one%':>7}{'hold%':>7}{'wide%':>7}{'cells':>7}  failing"]
lines += [f"  {r['id']:<6}{r['dur_s']:>6}{r['rest_run_f']:>6}{('yes' if r['rest_at_end'] else 'NO'):>5}{r['one_thing']:>7}{r['hold']:>7}{r['wide']:>7}{r['mean_cells']:>7}  {'; '.join(r['fail'])}" for r in per]
lines += ["", "GATES v4: " + ("PASS" if not fails else "FAIL (" + ", ".join(fails) + ")")]
print("\n".join(lines))
if OUT:
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, "gates_v4.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    json.dump({"film": rows, "shots": per, "fails": fails}, open(os.path.join(OUT, "gates_v4.json"), "w"), indent=1)

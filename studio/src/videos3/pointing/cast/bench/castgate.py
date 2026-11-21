# THE CARD GATES of tools/v3/gates_v4.py, on a CAST LOG alone (no video needed; owner CAST, 2026-11-20). Same tests as
# the DIRECTOR's gates_v4.py (19:20 version):
#   hands: the ellipse inscribed in each head box, + 5 % (distance in head radii, 1.0 = the head's edge): a hand inside
#          its OWN card's face = FAIL, over ANOTHER person's face = WARN (the log has no depth), 1.05-1.25 = near misses;
#   arm out: PASS up to 12 % of the film's frames, WARN 12-16 %, FAIL over 16 % (per character and per shot printed);
#   no card with 0 < op < 1; a head over 25 % of the frame height only in a closeUp shot.
#   python castgate.py <cast_log.json> <shots.json> [total_frames]
# shots.json: briefs/v3/pointing/director/probe_v4.mjs json <out> ({shots: [{id, from, to, closeUp?}]}) or a plain list.
# With a log from STILLS only (a few frames), the arm-out share is over the logged frames, not the film.
import collections, json, sys

log = json.load(open(sys.argv[1], encoding="utf-8"))
SH = json.load(open(sys.argv[2], encoding="utf-8")); SH = SH["shots"] if isinstance(SH, dict) else SH
total = int(sys.argv[3]) if len(sys.argv) > 3 else None
close = {s["id"] for s in SH if s.get("closeUp")}
shot_of = lambda f: next((s["id"] for s in SH if s["from"] <= f < s["to"]), None)
frames = sorted({r["f"] for r in log}); N = total or len(frames)
arm = {r["f"] for r in log if r.get("armOut")}
byf = collections.defaultdict(list)
for r in log: byf[r["f"]].append(r)
def radii(hx, hy, head):
    x0, y0, x1, y1 = head; cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 * 1.05, (y1 - y0) / 2 * 1.05
    return (((hx - cx) / rx) ** 2 + ((hy - cy) / ry) ** 2) ** 0.5
own, other, near = collections.Counter(), collections.Counter(), collections.Counter()
ex = {}
for f, rs in byf.items():
    for r in rs:
        for o in rs:
            for hx, hy in r.get("hands", []):
                d = radii(hx, hy, o["head"]); k = (shot_of(f), r["who"], o["who"])
                if d < 1.0: (own if r is o else other)[k] += 1; ex.setdefault(k, (f, round(d, 2)))
                elif d < 1.25 / 1.05: near[k] += 1; ex.setdefault(("near",) + k, (f, round(d * 1.05, 2)))
ghost = [(r["f"], r["who"]) for r in log if 0.001 < r.get("op", 1) < 0.999]
big = collections.defaultdict(float)
for r in log:
    h = r["head"][3] - r["head"][1]
    if h > 0.25 and shot_of(r["f"]) not in close: big[(shot_of(r["f"]), r["who"])] = max(big[(shot_of(r["f"]), r["who"])], round(h, 3))
share = len(arm) / N * 100
print(f"cast log: {len(log)} rows, {len(frames)} frames ({frames[0] if frames else '-'}..{frames[-1] if frames else '-'}), film {N} f")
print(f"  {'PASS' if share <= 12 else 'WARN' if share <= 16 else 'FAIL'}  arm out: {len(arm)} f = {share:.1f} % (PASS <= 12, WARN <= 16)")
byw = collections.defaultdict(set)
for r in log:
    if r.get("armOut"): byw[r["who"]].add(r["f"])
print("        per character: " + ", ".join(f"{w} {len(v)} f {len(v) / N * 100:.1f} %" for w, v in sorted(byw.items(), key=lambda x: -len(x[1]))))
bys = collections.Counter(shot_of(f) for f in arm)
lens = {s["id"]: s["to"] - s["from"] for s in SH}
print("        per shot: " + ", ".join(f"{s} {n} f ({n / max(1, lens.get(s, n)) * 100:.0f} % of it)" for s, n in bys.most_common()))
print(f"  {'PASS' if not own else 'FAIL'}  a hand inside its OWN face: {sum(own.values())} hand-frames" + ("".join(f"\n        {k} {n} e.g. f{ex[k][0]} at {ex[k][1]} r" for k, n in own.most_common(8))))
print(f"  {'PASS' if not other else 'WARN'}  a hand over ANOTHER face (no depth in the log): {sum(other.values())} hand-frames" + ("".join(f"\n        {k} {n} e.g. f{ex[k][0]} at {ex[k][1]} r" for k, n in other.most_common(8))))
if near: print("  NOTE  near misses (1.05-1.25 radii): " + ", ".join(f"{k} {n}" for k, n in near.most_common(8)))
print(f"  {'PASS' if not ghost else 'FAIL'}  see-through cards: {len(ghost)}")
print(f"  {'PASS' if not big else 'FAIL'}  heads > 25 % outside close-ups: " + (", ".join(f"{s} {w} {h}" for (s, w), h in sorted(big.items())) or "none"))
heads = collections.defaultdict(list)
for r in log: heads[r["who"]].append(round(r["head"][3] - r["head"][1], 3))
print("  head heights (fraction of the frame): " + ", ".join(f"{w} {min(v)}..{max(v)}" for w, v in heads.items()))

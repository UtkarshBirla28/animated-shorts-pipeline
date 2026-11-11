"""Digest an audit workflow journal: score table + per-owner fix lists (markdown).
Usage: python audit_digest.py <journal.jsonl> <out_dir>"""
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
shots = []
for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    d = json.loads(line)
    if d.get("type") != "result":
        continue
    v = d.get("result") or d.get("value")
    if isinstance(v, dict) and "shots" in v and isinstance(v["shots"], list):
        shots += v["shots"]
seen = {}
for s in shots:
    seen[s["id"]] = s  # one entry per shot id
shots = [seen[k] for k in sorted(seen)]
(out / "audit.json").write_text(json.dumps(shots, indent=1), encoding="utf-8")
K = ["framing", "camera", "lighting", "colour", "place_detail", "character_design", "acting", "life", "readability", "intrigue", "overall"]
L = ["| shot | " + " | ".join(K) + " |", "|" + "---|" * (len(K) + 1)]
for s in shots:
    L.append(f"| {('SOUND' if s['id'] == 99 else s['id']) or 'FILM'} | " + " | ".join(str(s["scores"].get(k, "")) for k in K) + " |")
SH = [s for s in shots if s["id"] and s["id"] != 99]  # the 16 shots only (0 = whole film, 99 = sound)
avg = {k: round(sum(s["scores"][k] for s in SH) / max(1, len(SH)), 1) for k in K}
L.append("| mean | " + " | ".join(str(avg[k]) for k in K) + " |")
(out / "SCORES.md").write_text("\n".join(L) + "\n\n" + "\n\n".join(f"**Shot {('SOUND' if s['id'] == 99 else s['id']) or 'FILM'}:** {s['verdict']}" for s in shots), encoding="utf-8")
print("\n".join(L))
by = defaultdict(list)
for s in shots:
    for i in s["issues"]:
        by[i["owner"]].append((i["priority"], s["id"], i))
    for a in s.get("add_detail", []):
        by[a["owner"].split()[0].upper().replace("WORLD_EXT", "WORLD-EXT").replace("WORLD_INT", "WORLD-INT")].append(("ADD", s["id"], {"frames": "", "problem": "ADD DETAIL/LIFE", "fix": a["idea"]}))
for owner, items in by.items():
    items.sort(key=lambda x: ({"P1": 0, "P2": 1, "P3": 2, "ADD": 3}.get(x[0], 4), x[1]))
    md = [f"- [{p}] shot {sid or 'FILM'} frames {i['frames']}: {i['problem']} -> FIX: {i['fix']}" for p, sid, i in items]
    (out / f"fixes_{owner}.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    c = defaultdict(int)
    for p, _, _ in items:
        c[p] += 1
    print(f"{owner:10} {dict(c)}")

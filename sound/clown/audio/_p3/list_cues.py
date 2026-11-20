# p3: list every cue of the three (regenerated) animator files, and the names sfx.py MAP does not know yet.
# usage (repo root): PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/clown/audio/_p3/list_cues.py [name ...]
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.dirname(HERE)
sys.path.insert(0, AUD)
import sfx  # noqa: E402

want = set(sys.argv[1:])
allc = []
for src, p in sfx.CUE_FILES:
    for c in json.load(open(p, encoding="utf-8")):
        c["src"] = src
        allc.append(c)
allc.sort(key=lambda c: c["frame"])
names = {}
for c in allc:
    names.setdefault(c["name"], []).append(c)
print(f"{len(allc)} cues, {len(names)} names")
unk = sorted(n for n in names if n not in sfx.MAP)
print("NOT IN MAP:", ", ".join(f"{n} x{len(names[n])}" for n in unk))
for c in allc:
    if want and c["name"] not in want and not ("NEW" in want and c["name"] in unk) and not ("ALL" in want):
        continue
    ex = {k: v for k, v in c.items() if k not in ("frame", "name", "what", "pan", "near", "src")}
    print(f"f {c['frame']:5} {sfx.shot_of(c['frame'])['key']:<4} {c['src']:<6} {c['name']:<18} pan {c.get('pan', 0):+.2f} near {c.get('near', 0):.2f} {ex if ex else ''} | {c['what'][:150]}")

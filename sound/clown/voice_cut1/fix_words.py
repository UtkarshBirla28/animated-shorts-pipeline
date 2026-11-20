"""Hand fixes of word times that the energy profile proves wrong (LESSONS 32 / 39). Each fix: (display word, the word's
current start +-0.15 s, new start, new end); the next word's start is never overlapped. Usage: python -s fix_words.py <dir>"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
d = Path(sys.argv[1])
FIX = [
    # 'back. | But over' (b13 take t1): Whisper put 'But' at 71.26-71.36 (100 ms, over the start of 'over'); energy:
    # 'But' onset 71.14, burst to 71.24, 'over' from 71.26 (times in the final _tight clock)
    ("But", 71.256, 71.13, 71.25),
    ("over", 71.356, 71.25, 71.676),
]
w = json.loads((d / "words.json").read_text(encoding="utf-8"))
ph = json.loads((d / "phrases.json").read_text(encoding="utf-8"))
for name, near, s, e in FIX:
    hit = [i for i, x in enumerate(w) if x["w"] == name and abs(x["s"] - near) < 0.15]
    if len(hit) != 1:
        print(f"skip {name}@{near}: {len(hit)} matches")
        continue
    i = hit[0]
    if i + 1 < len(w):
        e = min(e, w[i + 1]["s"])
    print(f"{name}: {w[i]['s']:.3f}-{w[i]['e']:.3f} -> {s:.3f}-{e:.3f}")
    for p in ph:   # a phrase that starts / ends on this word follows it
        if abs(p["s"] - w[i]["s"]) < 0.002:
            p["s"] = round(s, 3)
        if abs(p["e"] - w[i]["e"]) < 0.002:
            p["e"] = round(e, 3)
    w[i]["s"], w[i]["e"] = round(s, 3), round(e, 3)
(d / "words.json").write_text(json.dumps(w, ensure_ascii=False, indent=0), encoding="utf-8")
(d / "phrases.json").write_text(json.dumps(ph, ensure_ascii=False, indent=1), encoding="utf-8")

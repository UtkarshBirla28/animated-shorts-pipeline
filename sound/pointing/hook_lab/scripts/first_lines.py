import json, re
from pathlib import Path
R = Path(r"C:\Users\utkar\research_notes\ricksclips\transcripts")
D = Path(r"C:\Users\utkar\Desktop\animated-shorts-studio\study\videos\_data")
man = json.loads(Path("data/manifest.json").read_text())
out = {}
for it in man:
    if it["owner"] != "his":
        continue
    s = it["slug"]
    src = None
    if (R / f"{s}.json").exists():
        src = R / f"{s}.json"
    elif (D / s / "transcript.json").exists():
        src = D / s / "transcript.json"
    d = json.loads(src.read_text(encoding="utf-8"))
    segs = d["segments"]
    lines = []
    for sg in segs:
        if sg["s"] > 9: break
        w = sg.get("words")
        lines.append({"s": sg["s"], "e": sg["e"], "text": sg["text"].strip(),
                      "words": [(x["w"].strip(), x["s"], x["e"]) for x in w] if w else None})
    out[s] = {"src": str(src), "lines": lines}
    print(f"\n== {s} ({it['views']:,})  [{src.parent.name}]")
    for l in lines:
        print(f"  {l['s']:5.2f}-{l['e']:5.2f} {l['text']}")
        if l["words"] and l["s"] < 1:
            print("     words:", " ".join(f"{w}@{a:.2f}" for w, a, b in l["words"][:6]))
Path("data/his_first_lines.json").write_text(json.dumps(out, indent=1))

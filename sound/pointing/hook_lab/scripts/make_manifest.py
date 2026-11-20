import json, re, sys
from pathlib import Path
V = Path(r"C:\Users\utkar\Desktop\yt short videos")
S = Path(r"C:\Users\utkar\Desktop\animated-shorts-studio")
views = {}
for line in open(r"C:\Users\utkar\research_notes\ricksclips\inventory_flat.txt", encoding="utf-8"):
    p = line.strip().split("|")
    if len(p) >= 3 and p[2].isdigit():
        views[p[1].strip().rstrip("?").lower()] = int(p[2])
def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
items = []
for f in sorted(list(V.glob("*.mp4")) + list((V / "new_2026-11-19").glob("*.mp4"))):
    if "(1)" in f.name:
        continue
    t = re.sub(r"\s*\[[^\]]+\]$", "", f.stem)
    v = views.get(t.lower().rstrip("?"))
    if v is None:
        v = next((vv for k, vv in views.items() if k.startswith(t.lower()[:25])), -1)
    items.append({"slug": slug(t), "title": t, "path": str(f), "views": v, "owner": "his",
                  "batch": "new" if "new_2026" in str(f) else "old"})
ours = [("ours-antitheft", "anti-theft sign", S / "studio/out/antitheft/antitheft_FINAL_1080x1920.mp4", 24600),
        ("ours-saladoil", "salad oil", S / "studio/out/saladoil/saladoil_FINAL_v2_1080x1920.mp4", 7400),
        ("ours-typo", "typo", S / "studio/out/typo/upload/typo_FINAL_1080x1920.mp4", 1500),
        ("ours-clown", "clown", S / "studio/out/clown/upload/clown_FINAL_1080x1920.mp4", 1400),
        ("ours-hanoirats-preview2", "Hanoi rat tails (preview2 540x960 proxy; final file not on this PC)",
         Path(r"C:\Users\utkar\Desktop\hanoirats\preview2.mp4"), 1300)]
for s, t, p, v in ours:
    items.append({"slug": s, "title": t, "path": str(p), "views": v, "owner": "ours", "batch": "ours"})
for it in items:
    print(f"{it['views']:>10} {it['slug']}")
Path(sys.argv[1]).write_text(json.dumps(items, indent=1))

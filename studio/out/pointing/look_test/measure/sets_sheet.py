"""usage: sets_sheet.py <stills_dir> <out_jpg> [--refs]
One tile per lookdev view (12) with its numbers; --refs appends two reference frames. Prints a table + writes <out>.json"""
import os, sys, json
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from measure import frame_stats

M = os.path.dirname(__file__)
VIEWS = [(1211, "platform wide A"), (981, "platform wide B"), (303, "car A"), (744, "car B"), (152, "cab A"), (1690, "cab B"),
         (1411, "lab A"), (1549, "lab B"), (822, "kitchen A"), (908, "kitchen B"), (1036, "NY station A"), (1101, "NY station B")]
REFS = [(r"ref_drivers\f003.png", "REFERENCE drivers"), (r"ref_railroads\f040.png", "REFERENCE railroads")]
d, out = sys.argv[1], sys.argv[2]
TW, TH = 300, 533
tiles, rows = [], {}
for f, name in VIEWS:
    p = os.path.join(d, f"f{f}.jpg")
    if not os.path.exists(p):
        im = np.zeros((TH, TW, 3), np.uint8); cv2.putText(im, "missing " + name, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1); tiles.append(im); continue
    tmp = os.path.join(M, "_tmp_sets.png"); cv2.imwrite(tmp, cv2.resize(cv2.imread(p), (540, 960), interpolation=cv2.INTER_AREA))
    s = frame_stats(tmp); rows[name] = {k: v for k, v in s.items() if k != "sky"}
    ok = s["beige_grey"] < 0.15 and s["vivid"] > 0.25 and s["chroma"] > 27
    im = cv2.resize(cv2.imread(p), (TW, TH), interpolation=cv2.INTER_AREA)
    cv2.rectangle(im, (0, 0), (TW, 44), (18, 18, 18), -1)
    cv2.putText(im, f"{name}  f{f}", (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(im, f"C {s['chroma']:.0f}  beige {100*s['beige_grey']:.0f}%  vivid {100*s['vivid']:.0f}%", (6, 37), cv2.FONT_HERSHEY_SIMPLEX, 0.46,
                (120, 240, 120) if ok else (120, 200, 255), 1, cv2.LINE_AA)
    tiles.append(im)
if "--refs" in sys.argv:
    for r, name in REFS:
        tmp = os.path.join(M, "frames", r); s = frame_stats(tmp)
        im = cv2.resize(cv2.imread(tmp), (TW, TH), interpolation=cv2.INTER_AREA)
        cv2.rectangle(im, (0, 0), (TW, 44), (18, 18, 18), -1)
        cv2.putText(im, name, (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 220, 140), 1, cv2.LINE_AA)
        cv2.putText(im, f"C {s['chroma']:.0f}  beige {100*s['beige_grey']:.0f}%  vivid {100*s['vivid']:.0f}%", (6, 37), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 220, 140), 1, cv2.LINE_AA)
        tiles.append(im)
while len(tiles) % 7: tiles.append(np.full((TH, TW, 3), 24, np.uint8))
sheet = np.vstack([np.hstack(tiles[i:i + 7]) for i in range(0, len(tiles), 7)])
cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
json.dump(rows, open(out + ".json", "w"), indent=1)
for k, v in rows.items(): print(f"{k:16s} C {v['chroma']:5.1f}  beige {100*v['beige_grey']:4.0f}%  vivid {100*v['vivid']:4.0f}%  L {v['L_mean']:4.0f}  Lsd {v['L_std']:4.1f}")

"""COMPARE_ours_vs_reference.jpg: rows = 3 reference videos, our clown, our pointing final; 7 frames each (evenly spaced),
each tile labelled with its mean chroma / beige-grey share."""
import os, json, glob
import numpy as np, cv2

OUT = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\out\pointing\look_test"
M = os.path.join(OUT, "measure")
ROWS = [("ref_drivers", "REFERENCE: why drivers started filming the road"), ("ref_coasters", "REFERENCE: this shape saved roller coasters"),
        ("ref_railroads", "REFERENCE: why perfect railroads don't work"), ("ours_clown", "OURS: clown (our better earlier film)"),
        ("ours_pointing", "OURS: pointing FINAL (the owner: 'looks very bad')")]
summ = json.load(open(os.path.join(M, "summary.json")))
N, TW, TH = 7, 240, 427
rows = []
for key, title in ROWS:
    fr = sorted(glob.glob(os.path.join(M, "frames", key, "*.png")))
    st = json.load(open(os.path.join(M, key + "_frames.json")))
    idx = [int(round(x)) for x in np.linspace(2, len(fr) - 3, N)]
    tiles = []
    for i in idx:
        im = cv2.resize(cv2.imread(fr[i]), (TW, TH), interpolation=cv2.INTER_AREA)
        s = st[i]
        cv2.rectangle(im, (0, TH - 26), (TW, TH), (20, 20, 20), -1)
        cv2.putText(im, f"C {s['chroma']:.0f}  beige/grey {100*s['beige_grey']:.0f}%", (6, TH - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        tiles.append(im)
    strip = np.hstack(tiles)
    a = summ[key]
    head = np.full((34, strip.shape[1], 3), 24, np.uint8)
    txt = f"{title}   |  median chroma {a['chroma']:.1f}  beige/grey {100*a['beige_grey']:.0f}%  vivid {100*a['vivid']:.0f}%  contrast(L sd) {a['L_std']:.1f}  sky {a.get('sky_hex','-')} C {a.get('sky_C',0):.0f}"
    col = (120, 200, 255) if key.startswith("ref") else ((140, 230, 140) if key == "ours_clown" else (110, 110, 255))
    cv2.putText(head, txt, (8, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.58, col, 1, cv2.LINE_AA)
    rows.append(np.vstack([head, strip]))
sheet = np.vstack(rows)
cv2.imwrite(os.path.join(OUT, "COMPARE_ours_vs_reference.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
print(sheet.shape)

"""usage: pairs.py <after_dir> <out_jpg> [tile_w] [--final]
Rows: f0, f200, f595, f1242: BEFORE (the final film's frame) | AFTER (look test) + numbers; with --final also writes
full-size before|after pairs and the 4 new stills into pointing_preview and appends a reference column."""
import os, sys, glob, json
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from measure import frame_stats

LT = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\out\pointing\look_test"
PP = r"C:\Users\utkar\Desktop\animated-shorts-studio\pointing_preview"
FR = [0, 200, 595, 1242]
NAMES = {0: "frame0 (tourist points at the suitcase behind the door glass)", 200: "f200 driver close-up (s03b)",
         595: "f595 the doorway: BAD SUITCASE. (s08)", 1242: "f1242 platform wide with the train (s16a)"}
after, out = sys.argv[1], sys.argv[2]
TW = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 360
final = "--final" in sys.argv
TH = TW * 16 // 9
REFS = [r"ref_coasters\f012.png", r"ref_drivers\f030.png", r"ref_railroads\f006.png", r"ref_drivers\f002.png"]


def load(p, w, h):
    im = cv2.imread(p)
    return cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)


def label(im, txt, sub=""):
    cv2.rectangle(im, (0, 0), (im.shape[1], 46 if sub else 26), (18, 18, 18), -1)
    cv2.putText(im, txt, (6, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    if sub: cv2.putText(im, sub, (6, 39), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (170, 230, 255), 1, cv2.LINE_AA)
    return im


def stat_line(p):
    tmp = os.path.join(LT, "_tmp_stat.png")
    cv2.imwrite(tmp, cv2.resize(cv2.imread(p), (540, 960), interpolation=cv2.INTER_AREA))
    s = frame_stats(tmp)
    return s, f"chroma {s['chroma']:.0f}  beige/grey {100*s['beige_grey']:.0f}%  vivid {100*s['vivid']:.0f}%  Lsd {s['L_std']:.0f}"


rows, numbers = [], {}
for i, f in enumerate(FR):
    b = os.path.join(LT, "before", f"f{f}.jpg")
    a = glob.glob(os.path.join(after, f"f{f}.jpg"))[0]
    sb, lb = stat_line(b); sa, la = stat_line(a)
    numbers[f] = {"before": sb, "after": sa}
    tiles = [label(load(b, TW, TH), "BEFORE  " + NAMES[f][:34], lb), label(load(a, TW, TH), "AFTER (look test)", la)]
    if final:
        ref = os.path.join(LT, "measure", "frames", REFS[i])
        tiles.append(label(load(ref, TW, TH), "REFERENCE (his new look)", "for scale of ambition"))
        os.makedirs(PP, exist_ok=True)
        A = cv2.imread(a); B = cv2.resize(cv2.imread(b), (A.shape[1], A.shape[0]))
        cv2.imwrite(os.path.join(LT, f"pair_f{f}_before_after.jpg"), np.hstack([B, A]), [cv2.IMWRITE_JPEG_QUALITY, 92])
        cv2.imwrite(os.path.join(PP, f"LOOK_TEST_new_{i+1}_frame{f}.jpg"), A, [cv2.IMWRITE_JPEG_QUALITY, 94])
    rows.append(np.hstack(tiles))
sheet = np.vstack(rows) if not final else np.vstack([np.hstack(rows[:2]), np.hstack(rows[2:])])
cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
json.dump(numbers, open(out + ".json", "w"), indent=1)
for f in FR: print(f, "before", {k: round(v, 3) for k, v in numbers[f]["before"].items() if k != "sky"}, "\n   after", {k: round(v, 3) for k, v in numbers[f]["after"].items() if k != "sky"})

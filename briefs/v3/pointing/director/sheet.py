# DIRECTOR tool (pointing v3): tile storyboard stills into one labelled sheet (shot id, film time, frame, the shot's line).
#   tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/sheet.py <out.jpg> <cols> <tile_w> <dir1> [<dir2> ...] [--frames 0,42,...]
# Stills are f<frame>.jpg in the given folders (a folder as <dir>@<shift> = rendered on an older timeline)
# Stills are f<frame>.jpg in the given folders (the LAST folder that has a frame wins: newer runs override older ones).
# Shot ids and times come from briefs/v3/pointing/director/timeline_v3.json (the film's own clock).
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, "timeline_v3.json"), encoding="utf-8"))
args = [a for a in sys.argv[1:]]
only = None
if "--frames" in args:
    i = args.index("--frames"); only = [int(x) for x in args[i + 1].split(",")]; del args[i:i + 2]
out, cols, tw, dirs = args[0], int(args[1]), int(args[2]), args[3:]
# a folder may be given as <dir>@<shift>: its stills were rendered on an older timeline; frame f there is frame f + shift now
stills = {}
for d in dirs:
    shift = 0
    if "@" in d and d.rsplit("@", 1)[1].lstrip("-").isdigit(): d, sh = d.rsplit("@", 1); shift = int(sh)
    if not os.path.isdir(d): continue
    for n in os.listdir(d):
        if n.startswith("f") and n.endswith(".jpg") and n[1:-4].isdigit():
            stills[int(n[1:-4]) + shift] = os.path.join(d, n)
frames = sorted(f for f in stills if only is None or f in only)
def shot_of(f):
    cur = TL["shots"][0]
    for s in TL["shots"]:
        if f >= s["from"]: cur = s
    return cur
def font(sz, bold=False):
    for p in (("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"), "C:/Windows/Fonts/segoeui.ttf"):
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()
th = int(tw * 16 / 9); lab = max(46, int(tw * 0.2)); pad = 6
rows = (len(frames) + cols - 1) // cols
W, H = cols * (tw + pad) + pad, rows * (th + lab + pad) + pad + 40
sheet = Image.new("RGB", (W, H), (24, 24, 28)); dr = ImageDraw.Draw(sheet)
f1, f2 = font(max(13, int(tw * 0.075)), True), font(max(10, int(tw * 0.05)))
dr.text((pad, 8), "POINTING v3 storyboard (draft stills)   %d f = %.2f s   %s" % (TL["total"], TL["total"] / 30.0, TL["source"][:90]), fill=(235, 235, 235), font=f1)
for k, f in enumerate(frames):
    s = shot_of(f); x = pad + (k % cols) * (tw + pad); y = 40 + pad + (k // cols) * (th + lab + pad)
    try: im = Image.open(stills[f]).convert("RGB").resize((tw, th), Image.LANCZOS)
    except Exception: im = Image.new("RGB", (tw, th), (60, 20, 20))
    sheet.paste(im, (x, y))
    dr.text((x + 2, y + th + 2), "%s  %.2f s  f%d" % (s["id"], f / 30.0, f), fill=(255, 214, 80), font=f1)
    line = s["line"] or "(no words)"
    # wrap the line to the tile width
    words, cur, yy = line.split(), "", y + th + 4 + f1.size
    for w in words:
        if dr.textlength(cur + " " + w, font=f2) > tw - 4 and cur:
            dr.text((x + 2, yy), cur, fill=(200, 200, 205), font=f2); yy += f2.size + 1; cur = w
            if yy > y + th + lab - f2.size: cur = ""; break
        else: cur = (cur + " " + w).strip()
    if cur: dr.text((x + 2, yy), cur, fill=(200, 200, 205), font=f2)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
sheet.save(out, quality=88)
print("sheet: %s (%d stills, %d x %d)" % (out, len(frames), W, H))

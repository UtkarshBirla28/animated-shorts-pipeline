# CAST v4 RIG SHEET (owner CAST, 2026-11-20): one JPG for the owner: the young woman (lab_woman) in the film's own frames,
# the rest of the v4 cast on the rig bench, and two of our earlier films' frames for scale and style, side by side.
#   PYTHONNOUSERSITE=1 <ROOT>/tools/.venv/Scripts/python.exe -s studio/src/videos3/pointing/cast/bench/rig_sheet_v4.py <out.jpg> \
#       --row "TITLE" img1.jpg "label 1" img2.jpg "label 2" ... [--row ...]
# Every row is scaled to the same tile height; labels are drawn under each tile.
import sys
from PIL import Image, ImageDraw, ImageFont

TILE_H, PAD, LABEL_H, ROW_TITLE_H, W_MAX = 620, 14, 44, 46, 4200
try:
    FONT = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)
    FONT_T = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 30)
except OSError:
    FONT = FONT_T = ImageFont.load_default()

out, args = sys.argv[1], sys.argv[2:]
rows, cur = [], None
i = 0
while i < len(args):
    if args[i] == "--row":
        cur = {"title": args[i + 1], "tiles": []}; rows.append(cur); i += 2
    else:
        cur["tiles"].append((args[i], args[i + 1])); i += 2

def tile(path):
    im = Image.open(path).convert("RGB")
    return im.resize((round(im.width * TILE_H / im.height), TILE_H), Image.LANCZOS)

built = []
for r in rows:
    ims = [(tile(p), lab) for p, lab in r["tiles"]]
    w = sum(im.width for im, _ in ims) + PAD * (len(ims) + 1)
    built.append((r["title"], ims, w))
W = min(W_MAX, max(w for _, _, w in built))
H = sum(ROW_TITLE_H + TILE_H + LABEL_H + PAD for _ in built) + PAD
sheet = Image.new("RGB", (W, H), (34, 30, 42))
d = ImageDraw.Draw(sheet)
y = PAD
for title, ims, w in built:
    d.text((PAD, y + 6), title, font=FONT_T, fill=(255, 238, 170)); y += ROW_TITLE_H
    x = PAD
    for im, lab in ims:
        if x + im.width > W: break
        sheet.paste(im, (x, y)); d.text((x + 4, y + TILE_H + 8), lab, font=FONT, fill=(240, 240, 240)); x += im.width + PAD
    y += TILE_H + LABEL_H + PAD
sheet.save(out, quality=88)
print(f"rig sheet: {W}x{H} -> {out}")

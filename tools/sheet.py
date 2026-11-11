"""Tile stills into one contact sheet with frame labels.  python -s sheet.py out.jpg cols w a.jpg b.jpg ..."""
import sys, re
from PIL import Image, ImageDraw, ImageFont
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert("RGB") for p in sys.argv[4:]]
h = int(w * 16 / 9)
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (cols * (w + 4), rows * (h + 26)), (12, 12, 12))
d = ImageDraw.Draw(S)
try: font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 18)
except OSError: font = ImageFont.load_default()
for i, (p, im) in enumerate(zip(sys.argv[4:], ims)):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 26)
    S.paste(im.resize((w, h)), (x, y + 24))
    d.text((x + 4, y + 2), re.sub(r".*[\/]", "", p), fill=(255, 230, 0), font=font)
S.save(out, quality=85)
print(out, S.size)

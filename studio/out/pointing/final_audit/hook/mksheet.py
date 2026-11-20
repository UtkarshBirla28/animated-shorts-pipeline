import sys
from PIL import Image, ImageDraw, ImageFont
src, out, start, end, cols, w = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
pat = sys.argv[7] if len(sys.argv) > 7 else "f%04d.jpg"
h = int(w * 16 / 9)
idx = list(range(start, end + 1))
rows = (len(idx) + cols - 1) // cols
img = Image.new("RGB", (cols * (w + 4), rows * (h + 22)), (20, 20, 20))
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("arial.ttf", 16)
except Exception:
    font = ImageFont.load_default()
for k, i in enumerate(idx):
    im = Image.open(f"{src}/{pat % i}").convert("RGB").resize((w, h), Image.LANCZOS)
    x, y = (k % cols) * (w + 4), (k // cols) * (h + 22)
    img.paste(im, (x, y + 22))
    d.text((x + 4, y + 3), f"f{i}  {i/30:.2f}s", fill=(255, 220, 120), font=font)
img.save(out, quality=88)

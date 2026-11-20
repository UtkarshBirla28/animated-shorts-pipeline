# texture prep: python -I tex_convert.py <src png/jpg> <dst .jpg|.png> <size px> [L]
# (resizes with Lanczos; ".png" + "L" writes 8-bit grey, e.g. an alpha mask; ".jpg" q 90)
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src)
if len(sys.argv) > 4 and sys.argv[4] == "L": im = im.convert("L")
elif dst.endswith(".jpg"): im = im.convert("RGB")
if im.size[0] != size: im = im.resize((size, size), Image.LANCZOS)
im.save(dst, quality=90) if dst.endswith(".jpg") else im.save(dst, optimize=True)
print(dst, im.size, im.mode)

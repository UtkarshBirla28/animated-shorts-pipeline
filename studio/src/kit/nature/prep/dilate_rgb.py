# edge padding for alpha-tested foliage: push the leaf colour out into the transparent texels so mipmaps never pull in
# the black background (dark fringes at distance). python -E dilate_rgb.py <diff.jpg> <alpha.png> <out.jpg>
import sys, numpy as np
from PIL import Image, ImageFilter
d = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
a = np.asarray(Image.open(sys.argv[2]).convert("L").resize(Image.open(sys.argv[1]).size)).astype(np.float32) / 255.0
m = (a > 0.35).astype(np.float32)
out = d.copy(); filled = m.copy()
c = d * m[..., None]
H, W = m.shape
ci = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)); mi = Image.fromarray((m * 255).astype(np.uint8))
for r in (2, 4, 8, 16, 32, 64, 128):
    sz = (max(1, W // r), max(1, H // r))
    cb = np.asarray(ci.resize(sz, Image.BOX).resize((W, H), Image.BILINEAR)).astype(np.float32)
    mb = np.asarray(mi.resize(sz, Image.BOX).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255.0
    col = cb / np.maximum(mb[..., None], 1e-4)
    take = (filled < 0.5) & (mb > 0.02)
    out[take] = col[take]; filled[take] = 1
out[filled < 0.5] = (d * m[..., None]).sum((0, 1)) / max(m.sum(), 1)
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(sys.argv[3], quality=90)
print("dilated", sys.argv[3])

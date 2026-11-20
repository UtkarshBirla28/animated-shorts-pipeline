# Per-cell centroid offsets (<name>_cen_1k.png): R,G = (pixel - its brick's centroid) / 256 px * 0.5 + 0.5 (u, v), from the
# cell map (wrap-aware: a brick across the texture border is unwrapped with its wrap code first). The shader uses it for
# per-brick TILT and for cracks through the middle of a brick.
import os, sys, numpy as np
from PIL import Image
D = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\public\kit\surfaces"
names = sys.argv[1:] or [n for n in os.listdir(D) if os.path.exists(os.path.join(D, n, f"{n}_cell_1k.png"))]
for n in names:
    c = np.asarray(Image.open(os.path.join(D, n, f"{n}_cell_1k.png")).convert("RGBA")).astype(np.int64)[::-1]   # row 0 = v 0
    H, W = c.shape[:2]
    lab = c[..., 0] + 256 * c[..., 1]
    code = np.round(c[..., 2] / 10.0).astype(np.int64)
    dx = code % 3 - 1; dy = (code // 3) % 3 - 1; joint = code >= 9
    ys, xs = np.mgrid[0:H, 0:W]
    ux = xs - dx * W; uy = ys - dy * H            # unwrapped into the brick's home tile
    m = ~joint
    cnt = np.bincount(lab[m], minlength=lab.max() + 1).astype(np.float64)
    sx = np.bincount(lab[m], weights=ux[m], minlength=lab.max() + 1); sy = np.bincount(lab[m], weights=uy[m], minlength=lab.max() + 1)
    cx = np.where(cnt > 0, sx / np.maximum(cnt, 1), 0); cy = np.where(cnt > 0, sy / np.maximum(cnt, 1), 0)
    ox = ux - cx[lab]; oy = uy - cy[lab]
    out = np.zeros((H, W, 3), np.uint8)
    out[..., 0] = np.clip((ox / 256.0 * 0.5 + 0.5) * 255 + 0.5, 0, 255); out[..., 1] = np.clip((oy / 256.0 * 0.5 + 0.5) * 255 + 0.5, 0, 255)
    Image.fromarray(out[::-1], "RGB").save(os.path.join(D, n, f"{n}_cen_1k.png"), optimize=True)
    print(n, "cells", int((cnt > 0).sum()), "max off px", int(max(abs(ox).max(), abs(oy).max())), flush=True)

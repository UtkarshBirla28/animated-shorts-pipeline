# Kit height maps (<name>_hgt_1k.png, linear 8-bit) for the CELL sets: a rounded bevel profile from the distance to the
# nearest joint (so joints are real, deep and crisp, like the Blender pavers) + 15-25 % of the scan's own height detail.
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
D = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\public\kit\surfaces"
# name: (bevel px at 1K, detail share, profile exponent)
SETS = {"brick_pavers": (5, 0.2, 0.55), "herringbone_pavers": (4, 0.2, 0.6), "cobbles": (14, 0.25, 0.5),
        "concrete_sidewalk": (3, 0.15, 0.6), "floor_tiles": (2, 0.1, 0.7), "marble": (2, 0.1, 0.7), "brick_wall": (4, 0.25, 0.55),
        "painted_brick": (4, 0.25, 0.55), "stone_wall": (10, 0.3, 0.5), "stone_trim": (3, 0.15, 0.6), "roof_tiles": (5, 0.25, 0.6),
        "roof_slates": (2, 0.25, 0.7), "planks": (2, 0.25, 0.6), "wood_floor": (2, 0.15, 0.7)}
only = set(sys.argv[1:])
for n, (bev, det, ex) in SETS.items():
    if only and n not in only: continue
    d = os.path.join(D, n)
    c = np.asarray(Image.open(os.path.join(d, f"{n}_cell_1k.png")).convert("RGBA"))
    code = np.round(c[..., 2] / 10.0).astype(int)
    joint = code >= 9
    H, W = joint.shape
    if n in ("cobbles", "stone_wall", "herringbone_pavers", "roof_tiles"):
        jl, jn = ndi.label(joint); area = np.bincount(jl.ravel())
        joint = joint & (area[jl] >= 400)                     # drop speckles inside stones
        joint = ndi.binary_closing(ndi.binary_opening(joint, iterations=2), iterations=2)
    edt = ndi.distance_transform_edt(~np.tile(joint, (3, 3)))[H:2 * H, W:2 * W]
    prof = np.clip(edt / bev, 0, 1) ** ex
    h = np.asarray(Image.open(os.path.join(d, f"{n}_disp_1k.jpg")).convert("L"), dtype=np.float32) / 255
    lo, hi = np.percentile(h, [0.5, 99.5]); hn = np.clip((h - lo) / (hi - lo), 0, 1)
    hp = hn - ndi.gaussian_filter(hn, 24, mode="wrap") + 0.5
    hgt = (1 - det) * prof + det * np.clip(hp, 0, 1) * (0.35 + 0.65 * prof)
    hgt = ndi.gaussian_filter(hgt, 0.6, mode="wrap")
    Image.fromarray(np.clip(hgt * 255 + 0.5, 0, 255).astype(np.uint8), "L").save(os.path.join(d, f"{n}_hgt_1k.png"), optimize=True)
    print(n, "joint share", round(float(joint.mean()), 3), "mean", round(float(hgt.mean()), 3), flush=True)

# Build per-cell ID maps (<name>_cell_1k.png) for STRUCTURED sets: each brick / stone / tile / plank gets a stable 16-bit
# label (R, G), a wrap code + joint flag (B = code*10, code = (dx+1) + 3(dy+1) + 9 joint) so a brick crossing the tile
# border keeps one identity, and A = distance to the nearest joint (px at 1K x 16, clamped). Rows are processed in
# v order (bottom row first) and saved flipped back, because three flips images on load.
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
D = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\public\kit\surfaces"
DBG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# name: (closing size px, threshold (0..1 of p99 valley depth), AO weight, min cell area px, dilate iterations)
# BOND sets: name -> (orientation of the courses "h" | "v", min course px, min head px, joint half-width px)
BOND = {"brick_pavers": ("v", 40, 60, 2), "brick_wall": ("h", 18, 40, 2), "painted_brick": ("h", 18, 40, 2),
        "planks": ("v", 60, 300, 2), "wood_floor": ("h", 60, 250, 2), "concrete_sidewalk": ("h", 120, 150, 3),
        "floor_tiles": ("h", 200, 200, 2), "marble": ("h", 150, 150, 2), "stone_trim": ("h", 120, 150, 3),
        "roof_tiles": ("h", 25, 30, 2), "roof_slates": ("h", 16, 18, 1)}
from scipy.signal import find_peaks
def peaks_circ(p, dist, rel):
    n = len(p); q = np.concatenate([p, p, p])
    base = np.median(p); prom = (np.percentile(p, 98) - base) * rel
    pk, _ = find_peaks(q, distance=dist, prominence=max(prom, 1e-6))
    pk = pk[(pk >= n) & (pk < 2 * n)] - n
    return np.sort(pk)
def bond_labels(score, orient, minC, minH, jw):
    S = score if orient == "h" else score.T
    H, W = S.shape
    rows = peaks_circ(ndi.gaussian_filter1d(S.mean(1), 1.0, mode="wrap"), minC, 0.35)
    lab = np.zeros((H, W), np.int64); joint = np.zeros((H, W), bool)
    nid = 0
    if len(rows) == 0: rows = np.array([0])
    for i, y0 in enumerate(rows):
        y1 = rows[(i + 1) % len(rows)] + (H if i + 1 == len(rows) else 0)
        ys = np.arange(y0, y1) % H
        inner = np.arange(y0 + jw + 1, max(y0 + jw + 2, y1 - jw)) % H
        cols = peaks_circ(ndi.gaussian_filter1d(S[inner].mean(0), 1.0, mode="wrap"), minH, 0.45)
        if len(cols) == 0: cols = np.array([0])
        for j, x0 in enumerate(cols):
            x1 = cols[(j + 1) % len(cols)] + (W if j + 1 == len(cols) else 0)
            xs = np.arange(x0, x1) % W
            nid += 1
            lab[np.ix_(ys, xs)] = nid
            for dxj in range(-jw, jw + 1): joint[np.ix_(ys, [(x0 + dxj) % W])] = True
        for dyj in range(-jw, jw + 1): joint[(y0 + dyj) % H, :] = True
    lab[joint] = 0
    return (lab, joint) if orient == "h" else (lab.T.copy(), joint.T.copy())
SETS = {
 "brick_pavers": (9, 0.32, 0.5, 300, 1), "herringbone_pavers": (9, 0.3, 0.5, 200, 2), "cobbles": (15, 0.3, 0.6, 150, 1),
 "concrete_sidewalk": (13, 0.35, 0.6, 1500, 1), "floor_tiles": (11, 0.35, 0.7, 2000, 1), "marble": (11, 0.35, 0.7, 2000, 1),
 "brick_wall": (9, 0.3, 0.6, 150, 1), "painted_brick": (9, 0.3, 0.6, 150, 1), "stone_wall": (15, 0.24, 0.6, 300, 3),
 "stone_trim": (11, 0.35, 0.7, 1500, 1), "roof_tiles": (9, 0.32, 0.5, 150, 1), "roof_slates": (7, 0.3, 0.5, 100, 2),
 "planks": (11, 0.35, 0.5, 2000, 1), "wood_floor": (9, 0.3, 0.6, 2000, 1),
}
def load(p):
    return np.asarray(Image.open(p).convert("L"), dtype=np.float32)[::-1] / 255.0   # row 0 = v 0
only = set(sys.argv[1:])
rp = os.path.join(D, "_cells_report.json")
report = json.load(open(rp)) if os.path.exists(rp) else {}
for name, (sz, k, aow, minA, dil) in SETS.items():
    if only and name not in only: continue
    d = os.path.join(D, name)
    h = load(os.path.join(d, f"{name}_disp_1k.jpg"))
    arm = np.asarray(Image.open(os.path.join(d, f"{name}_arm_1k.jpg")).convert("RGB"), dtype=np.float32)[::-1] / 255.0
    ao = arm[..., 0]
    H, W = h.shape
    # thin dark lines (joints) = black top-hat of height and AO (local valleys), normalised; thickened to bridge gaps
    th1 = ndi.grey_closing(h, size=(sz, sz), mode="wrap") - h
    th2 = ndi.grey_closing(ao, size=(sz, sz), mode="wrap") - ao
    s1 = th1 / (np.percentile(th1, 99) + 1e-6); s2 = th2 / (np.percentile(th2, 99) + 1e-6)
    score = (1 - aow) * s1 + aow * s2
    joint = score > k
    if name in BOND:
        lab, joint = bond_labels(ndi.gaussian_filter(score, 0.7, mode="wrap"), *BOND[name])
        n = int(lab.max())
    else:
        if dil: joint = ndi.binary_dilation(joint, iterations=dil)
        lab, n = ndi.label(~joint)
    # union across the wrap borders
    par = np.arange(n + 1)
    def f(a):
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    def u(a, b):
        if a and b:
            ra, rb = f(a), f(b)
            if ra != rb: par[rb] = ra
    for y in range(H): u(lab[y, 0], lab[y, W - 1])
    for x in range(W): u(lab[0, x], lab[H - 1, x])
    root = np.array([f(i) for i in range(n + 1)])
    lab = root[lab]
    ids, cnt = np.unique(lab, return_counts=True)
    small = ids[(cnt < minA) & (ids > 0)]
    lab[np.isin(lab, small)] = 0
    ids = np.unique(lab); ids = ids[ids > 0]
    remap = np.zeros(lab.max() + 1, np.int64); remap[ids] = np.arange(1, len(ids) + 1)
    lab = remap[lab]; m = len(ids)
    # wrap offsets per component: the bigger part is home; pixels on the other side point at the neighbour tile's copy
    dx = np.zeros((H, W), np.int64); dy = np.zeros((H, W), np.int64)
    ys, xs = np.nonzero(lab)
    L = lab[ys, xs]
    for axis, coord, size, out in ((1, xs, W, dx), (0, ys, H, dy)):
        lo = np.bincount(L[coord < size // 2], minlength=m + 1)
        hi = np.bincount(L[coord >= size // 2], minlength=m + 1)
        tl = np.zeros(m + 1, bool); th = np.zeros(m + 1, bool)
        if axis == 1: tl[np.unique(lab[:, 0])] = True; th[np.unique(lab[:, W - 1])] = True
        else: tl[np.unique(lab[0, :])] = True; th[np.unique(lab[H - 1, :])] = True
        wraps = tl & th; wraps[0] = False
        lowSide = coord < size // 2
        mask = (wraps & (hi >= lo))[L] & lowSide; out[ys[mask], xs[mask]] = -1
        mask = (wraps & (lo > hi))[L] & ~lowSide; out[ys[mask], xs[mask]] = 1
    # fill joints with the nearest cell (colour variation then covers the bevels); on a 3x3 tiling for the wrap
    T = np.tile(lab, (3, 3))
    _, (iy, ix) = ndi.distance_transform_edt(T == 0, return_indices=True)
    iy = iy[H:2 * H, W:2 * W]; ix = ix[H:2 * H, W:2 * W]
    full = T[iy, ix]
    jflag = (lab == 0)
    dxT = np.tile(dx, (3, 3))[iy, ix] + (ix // W - 1); dyT = np.tile(dy, (3, 3))[iy, ix] + (iy // H - 1)
    dxT = np.clip(dxT, -1, 1); dyT = np.clip(dyT, -1, 1)
    dj = ndi.distance_transform_edt(np.tile(lab, (3, 3)) > 0)[H:2 * H, W:2 * W]
    code = (dxT + 1) + 3 * (dyT + 1) + 9 * jflag.astype(np.int64)
    out = np.zeros((H, W, 4), np.uint8)
    out[..., 0] = full & 255; out[..., 1] = (full >> 8) & 255
    out[..., 2] = (code * 10).astype(np.uint8); out[..., 3] = np.clip(dj * 16, 0, 255).astype(np.uint8)
    Image.fromarray(out[::-1], "RGBA").save(os.path.join(d, f"{name}_cell_1k.png"), optimize=True)
    rng = np.random.default_rng(1); pal = rng.integers(60, 255, (m + 1, 3)).astype(np.uint8)
    dbg = pal[full].copy(); dbg[jflag] = (dbg[jflag] * 0.3).astype(np.uint8)
    Image.fromarray(dbg[::-1], "RGB").resize((384, 384), Image.NEAREST).save(os.path.join(DBG, f"cells_{name}.png"))
    jf = float(jflag.mean())
    report[name] = {"cells": int(m), "jointShare": round(jf, 3), "hJoint50": round(float(np.median(h[jflag])), 3) if jf > 0 else None,
                    "hCell10": round(float(np.percentile(h[~jflag], 10)), 3), "hCell50": round(float(np.median(h[~jflag])), 3)}
    print(name, report[name], flush=True)
json.dump(report, open(rp, "w"), indent=1)

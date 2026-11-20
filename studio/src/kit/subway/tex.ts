// KIT / SUBWAY: procedural CC0 textures (ours, generated at build time on the CPU / a canvas; no downloads). Each is a
// full PBR set in the SURFACES naming (albedo sRGB, OpenGL normal, arm = AO / roughness / metal, height) so it can be
// swapped into a kit `surface()` material (`swapSurf`) and keep SURFACES' macro variation, dirt, grime, streaks, decals
// and POM. Pure functions of their seed; cached per key.
//   subwayTile(): NYC 3 x 6 in glazed wall tile, running bond, 3 mm grout, cushion edges, replaced / cracked tiles
//   domeStrip():  US detectable-warning tile (truncated domes, 61 mm grid, 610 mm panels), safety yellow, worn tops
//   boardForm():  board-formed tunnel concrete (plank marks + tie holes) as a height / albedo overlay
import * as THREE from "three";
import { rng } from "../surfaces/ground";
import type { SurfMaterial } from "../surfaces/materials";

export type PbrTex = { alb: THREE.Texture; nor: THREE.Texture; arm: THREE.Texture; hgt: THREE.Texture; tileM: number };
const cache = new Map<string, PbrTex>();

const mk = (data: Uint8Array, w: number, h: number, srgb: boolean) => {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; t.flipY = false;
  t.needsUpdate = true;
  return t;
};
/** value noise on a wrapped grid (period p cells) */
const vnoise = (seed: number, p: number) => {
  const R = rng(seed), g = new Float32Array(p * p); for (let i = 0; i < g.length; i++) g[i] = R();
  return (x: number, y: number) => {
    const fx = x * p, fy = y * p, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = (i: number, j: number) => g[(((j % p) + p) % p) * p + (((i % p) + p) % p)];
    return (a(ix, iy) * (1 - sx) + a(ix + 1, iy) * sx) * (1 - sy) + (a(ix, iy + 1) * (1 - sx) + a(ix + 1, iy + 1) * sx) * sy;
  };
};
/** build the 4 textures from per-pixel fields: height 0..1, albedo sRGB 0..255, ao, rough, metal */
const fromFields = (W: number, H: number, hgt: Float32Array, alb: Float32Array, ao: Float32Array, rough: Float32Array, bumpPxPerUnit: number, tileM: number): PbrTex => {
  const A = new Uint8Array(W * H * 4), N = new Uint8Array(W * H * 4), M = new Uint8Array(W * H * 4), D = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const hx = hgt[y * W + ((x + 1) % W)] - hgt[y * W + ((x - 1 + W) % W)];
    const hy = hgt[((y + 1) % H) * W + x] - hgt[((y - 1 + H) % H) * W + x];
    // OpenGL normal: +x right, +y up (texture v grows with y here = up in uv space since flipY is false)
    let nx = -hx * bumpPxPerUnit, ny = -hy * bumpPxPerUnit, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    N[i * 4] = (nx * 0.5 + 0.5) * 255; N[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; N[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; N[i * 4 + 3] = 255;
    A[i * 4] = alb[i * 3]; A[i * 4 + 1] = alb[i * 3 + 1]; A[i * 4 + 2] = alb[i * 3 + 2]; A[i * 4 + 3] = 255;
    M[i * 4] = ao[i] * 255; M[i * 4 + 1] = rough[i] * 255; M[i * 4 + 2] = 0; M[i * 4 + 3] = 255;
    const d = Math.max(0, Math.min(255, hgt[i] * 255)); D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = d; D[i * 4 + 3] = 255;
  }
  return { alb: mk(A, W, H, true), nor: mk(N, W, H, false), arm: mk(M, W, H, false), hgt: mk(D, W, H, false), tileM };
};
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** NYC 3 x 6 in (76 x 152 mm) white glazed wall tile, running bond, 8 tiles x 16 rows per repeat (1.219 m square).
 *  Per tile: value / warm-cool jitter, ~3 % replaced tiles of another white, ~1.5 % cracked, glaze waviness. */
export const subwayTile = (seed = 1, res = 1024): PbrTex => {
  const key = `tile:${seed}:${res}`; if (cache.has(key)) return cache.get(key)!;
  const W = res, H = res, tileM = 1.2192, mm = res / 1219.2, grout = 1.6 * mm, cush = 3.8 * mm;
  const R = rng(seed * 31 + 7), nW = vnoise(seed * 3 + 1, 24), nG = vnoise(seed * 5 + 2, 64);
  const cols = 8, rows = 16, tw = W / cols, th = H / rows;
  type T = { v: number; warm: number; odd: number; crack: number; ca: number; cb: number; rough: number; tilt: number };
  const tiles: T[] = [];
  for (let k = 0; k < cols * rows; k++) {
    const odd = R() < 0.035 ? (R() < 0.5 ? 1 : 2) : 0;
    tiles.push({ v: 0.955 + 0.045 * R(), warm: (R() - 0.5) * 0.03, odd, crack: R() < 0.016 ? 1 : 0, ca: R(), cb: R(), rough: 0.08 + 0.08 * R(), tilt: (R() - 0.5) * 0.06 });
  }
  const hgt = new Float32Array(W * H), alb = new Float32Array(W * H * 3), ao = new Float32Array(W * H), rough = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = Math.floor(y / th), off = (r % 2) * tw * 0.5, xx = (x + off) % W, c = Math.floor(xx / tw);
    const lx = xx - c * tw, ly = y - r * th, T0 = tiles[r * cols + c];
    const de = Math.min(lx, tw - lx, ly, th - ly);                   // px to the tile edge
    const inT = sm(grout * 0.5, grout * 0.5 + 0.8, de);              // 0 grout, 1 tile
    const cushion = Math.sqrt(Math.max(0, Math.min(1, (de - grout * 0.5) / cush)));
    const i = y * W + x, u = x / W, v = y / H;
    let h = inT * (0.55 + 0.42 * cushion) + 0.012 * (nW(u, v) - 0.5) + T0.tilt * (lx / tw - 0.5) * inT;
    // the crack: a thin dark polyline across the tile
    let crack = 0;
    if (T0.crack) { const ax = T0.ca * tw, bx = T0.cb * tw, px = ax + (bx - ax) * (ly / th) + 2.5 * Math.sin(ly * 0.7 + T0.ca * 9); crack = Math.max(0, 1 - Math.abs(lx - px) / 1.1) * inT; h -= crack * 0.25; }
    hgt[i] = Math.max(0, Math.min(1, h));
    // albedo: glaze white (replaced tiles: a cooler blue-white or a creamier one), grout grey with grime
    let cr = 236, cg = 233, cb = 224;
    if (T0.odd === 1) { cr = 222; cg = 228; cb = 230; } else if (T0.odd === 2) { cr = 240; cg = 230; cb = 205; }
    const vv = T0.v * (0.985 + 0.03 * nW(u * 3, v * 3)) * (0.94 + 0.06 * cushion);
    const gr = 0.62 + 0.18 * nG(u, v);
    const tr = cr * vv * (1 + T0.warm), tg = cg * vv, tb = cb * vv * (1 - T0.warm);
    const k = inT * (1 - crack * 0.85);
    alb[i * 3] = tr * k + 148 * gr * (1 - k); alb[i * 3 + 1] = tg * k + 142 * gr * (1 - k); alb[i * 3 + 2] = tb * k + 132 * gr * (1 - k);
    ao[i] = 0.55 + 0.45 * inT;
    rough[i] = inT * (T0.rough + 0.05 * (1 - cushion)) + (1 - inT) * 0.92;
  }
  const out = fromFields(W, H, hgt, alb, ao, rough, 6, tileM);
  cache.set(key, out); return out;
};

/** US detectable-warning surface (ADA truncated domes): one 610 mm square panel per repeat, 10 x 10 domes on a 61 mm
 *  square grid (base 23 mm, top 12 mm, 5 mm high), safety yellow, dirt in the valleys, worn tops, a joint at the border */
export const domeStrip = (seed = 1, res = 1024): PbrTex => {
  const key = `domes:${seed}:${res}`; if (cache.has(key)) return cache.get(key)!;
  const W = res, H = res, tileM = 0.61, pxmm = res / 610;
  const R = rng(seed * 17 + 3), nD = vnoise(seed * 7 + 5, 32), nF = vnoise(seed * 11 + 9, 128);
  const wear: number[] = []; for (let i = 0; i < 100; i++) wear.push(R());
  const hgt = new Float32Array(W * H), alb = new Float32Array(W * H * 3), ao = new Float32Array(W * H), rough = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const mmx = x / pxmm, mmy = y / pxmm, ix = Math.floor(mmx / 61), iy = Math.floor(mmy / 61);
    const cx = (ix + 0.5) * 61, cy = (iy + 0.5) * 61, r = Math.hypot(mmx - cx, mmy - cy);
    const dome = sm(11.5, 6.2, r);                                      // 0 at the base edge (r 11.5) -> 1 at the flat top (r 6)
    const top = sm(6.4, 5.2, r);
    const edgeD = Math.min(mmx, 610 - mmx, mmy, 610 - mmy);            // the panel joint
    const joint = 1 - sm(0.6, 1.8, edgeD);
    const i = y * W + x, u = x / W, v = y / H;
    const f = nF(u, v);
    hgt[i] = Math.max(0, Math.min(1, 0.18 + 0.78 * dome * (0.92 + 0.08 * Math.cos(r * 0.7)) + 0.02 * (f - 0.5) - joint * 0.16));
    // valleys collect black grime; tops are scuffed paler / greyer by shoes; base ring darker
    const w = wear[(iy % 10) * 10 + (ix % 10)];
    const valley = (1 - dome) * (0.35 + 0.65 * nD(u * 2, v * 2));
    const ring = Math.exp(-Math.pow((r - 11.8) / 1.6, 2)) * 0.5;
    const scuff = top * (0.35 + 0.65 * w);
    let cr = 226, cg = 178, cb = 38;
    cr = cr * (1 - 0.55 * valley - ring * 0.4) + 40 * scuff; cg = cg * (1 - 0.5 * valley - ring * 0.4) + 38 * scuff; cb = cb * (1 - 0.3 * valley) + 70 * scuff;
    const dk = 0.86 + 0.14 * f;
    alb[i * 3] = cr * dk * (1 - joint * 0.7); alb[i * 3 + 1] = cg * dk * (1 - joint * 0.7); alb[i * 3 + 2] = cb * dk * (1 - joint * 0.6);
    ao[i] = 1 - 0.35 * (1 - dome) - 0.3 * joint;
    rough[i] = 0.62 + 0.18 * valley - 0.22 * scuff;
  }
  const out = fromFields(W, H, hgt, alb, ao, rough, 9, tileM);
  cache.set(key, out); return out;
};

/** board-formed concrete: horizontal plank marks (150 mm), plank-to-plank value steps, a form tie hole grid (0.6 x
 *  0.9 m) with rust bleed, as a 1.8 m repeat */
export const boardForm = (seed = 1, res = 1024): PbrTex => {
  const key = `board:${seed}:${res}`; if (cache.has(key)) return cache.get(key)!;
  const W = res, H = res, tileM = 1.8, pxm = res / 1.8;
  const R = rng(seed * 13 + 1), nG = vnoise(seed * 3 + 4, 48), nW = vnoise(seed * 9 + 2, 12);
  const planks: number[] = []; for (let i = 0; i < 12; i++) planks.push(R());
  const hgt = new Float32Array(W * H), alb = new Float32Array(W * H * 3), ao = new Float32Array(W * H), rough = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const my = y / pxm, mx = x / pxm, pk = Math.floor(my / 0.15), ly = my - pk * 0.15, p = planks[pk % 12];
    const seam = 1 - sm(0.0, 0.004, Math.min(ly, 0.15 - ly));
    const grain = 0.5 + 0.5 * Math.sin(mx * 60 * (0.8 + 0.4 * p) + Math.sin(mx * 3 + p * 9) * 3 + p * 20);
    // tie holes on a 0.6 x 0.9 grid
    const tx = mx - (Math.round(mx / 0.6 - 0.5) + 0.5) * 0.6, ty = my - (Math.round(my / 0.9 - 0.5) + 0.5) * 0.9, tr = Math.hypot(tx, ty);
    const hole = 1 - sm(0.011, 0.016, tr), bleed = Math.max(0, 1 - Math.hypot(tx * 3, Math.max(0, -ty) * 0.6 + Math.max(0, ty) * 4) / 0.1) * (1 - hole);
    const i = y * W + x, u = x / W, v = y / H, g = nG(u, v);
    hgt[i] = Math.max(0, Math.min(1, 0.6 + 0.08 * (p - 0.5) + 0.04 * grain - seam * 0.3 - hole * 0.55 + 0.05 * (g - 0.5)));
    const val = (0.78 + 0.16 * p + 0.06 * (nW(u, v) - 0.5)) * (1 - seam * 0.35) * (1 - hole * 0.75) * (0.95 + 0.05 * grain);
    alb[i * 3] = 128 * val + 50 * bleed; alb[i * 3 + 1] = 124 * val + 18 * bleed; alb[i * 3 + 2] = 116 * val;
    ao[i] = 1 - 0.4 * seam - 0.6 * hole;
    rough[i] = 0.86 + 0.1 * g;
  }
  const out = fromFields(W, H, hgt, alb, ao, rough, 5, tileM);
  cache.set(key, out); return out;
};

/** put a generated PBR set into a kit surface material (keeps SURFACES' shader: macro, dirt, decals, POM) */
export const swapSurf = (m: SurfMaterial, t: PbrTex) => {
  const U = m.userData.surf.U;
  U.sAlb.value = t.alb; U.sNor.value = t.nor; U.sArm.value = t.arm; U.sHgt.value = t.hgt;
  // height normalisation: our height maps are already 0..1
  (U.sDispV.value as THREE.Vector4).z = 0; (U.sDispV.value as THREE.Vector4).w = 1;
  return m;
};

// ---------------------------------------------------------------- canvas textures (sRGB)
const cvCache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, key: string, srgb = true) => {
  const hit = cvCache.get(key); if (hit) return hit;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d")!; draw(g);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; cvCache.set(key, t); return t;
};
/** the zebra board face: vertical black / white stripes (10 cm on a 0.9 m board), brush marks, worn edges, grime */
export const zebraFace = () => canvasTex(900, 450, (g) => {
  const R = rng(77);
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? "#ece8de" : "#16161a"; g.fillRect(i * 100, 0, 100, 450); }
  // brush strokes (horizontal), chips at the edges showing wood, grime toward the bottom
  for (let k = 0; k < 900; k++) { const x = R() * 900, y = R() * 450; g.fillStyle = `rgba(${R() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + 0.04 * R()})`; g.fillRect(x, y, 20 + 80 * R(), 1 + 2 * R()); }
  for (let k = 0; k < 60; k++) { const e = R(); const x = e < 0.5 ? R() * 900 : (R() < 0.5 ? R() * 10 : 890 + R() * 10), y = e < 0.5 ? (R() < 0.5 ? R() * 9 : 441 + R() * 9) : R() * 450; g.fillStyle = `rgba(120,92,62,${0.5 + 0.4 * R()})`; g.beginPath(); g.ellipse(x, y, 3 + 6 * R(), 2 + 4 * R(), R() * 3, 0, 7); g.fill(); }
  const gr = g.createLinearGradient(0, 0, 0, 450); gr.addColorStop(0, "rgba(40,32,24,0.12)"); gr.addColorStop(0.5, "rgba(40,32,24,0.0)"); gr.addColorStop(1, "rgba(40,32,24,0.22)");
  g.fillStyle = gr; g.fillRect(0, 0, 900, 450);
}, "zebra");
/** soft round alpha blob (gum spots, stains, ripple base), white on transparent */
export const blobTex = () => canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,0.95)"); gr.addColorStop(0.85, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}, "blob", false);
/** a ripple ring (alpha) */
export const ringTex = () => canvasTex(256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 90, 128, 128, 126); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
}, "ring", false);
/** a plain pastel ad poster: big soft shapes, a colour block, NO text, NO logos */
export const posterTex = (seed: number) => canvasTex(300, 400, (g) => {
  const R = rng(seed * 101 + 3);
  const pal = [["#f2c9b8", "#e8846a", "#5a7fa8"], ["#cfe3d4", "#6aa889", "#f0d27a"], ["#e6dcf2", "#8f7ac9", "#f2a7b0"], ["#f6e7c1", "#e0a43c", "#3f6a8a"], ["#d6e6f2", "#5d9ccf", "#f0efe8"]][seed % 5];
  g.fillStyle = pal[0]; g.fillRect(0, 0, 300, 400);
  g.fillStyle = pal[1]; g.beginPath(); g.arc(80 + 140 * R(), 150 + 80 * R(), 70 + 40 * R(), 0, 7); g.fill();
  g.fillStyle = pal[2]; g.fillRect(0, 300 + 30 * R(), 300, 100);
  g.globalAlpha = 0.5; g.fillStyle = "#ffffff"; g.fillRect(30, 330, 120 + 80 * R(), 14); g.fillRect(30, 356, 80 + 60 * R(), 10); g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, 0, 300, 400); gr.addColorStop(0, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0.08)"); g.fillStyle = gr; g.fillRect(0, 0, 300, 400);
}, "poster" + seed);
/** a white spray-stencil number (digits only) with overspray */
export const stencilTex = (digits: string) => canvasTex(512, 256, (g) => {
  const R = rng(digits.length * 7 + 1);
  g.clearRect(0, 0, 512, 256); g.font = "bold 190px 'Arial Black', Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(240,238,230,0.22)"; for (let k = 0; k < 6; k++) g.fillText(digits, 256 + (R() - 0.5) * 10, 132 + (R() - 0.5) * 10);
  g.fillStyle = "rgba(242,240,232,0.92)"; g.fillText(digits, 256, 132);
  // stencil bridges: thin vertical gaps
  g.globalCompositeOperation = "destination-out"; for (let k = 0; k < digits.length; k++) g.fillRect(256 + (k - (digits.length - 1) / 2) * 120 - 4, 40, 8, 26);
  g.fillStyle = "rgba(0,0,0,0.35)"; for (let k = 0; k < 400; k++) g.fillRect(R() * 512, R() * 256, 2 + 6 * R(), 1 + 2 * R());
  g.globalCompositeOperation = "source-over";
}, "stencil" + digits);

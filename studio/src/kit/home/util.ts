// KIT / HOME (owner HOME_LAB): shared helpers for the home + lab props: seeded rng, rounded boxes with metre UVs, lathes,
// tubes, procedural micro maps (orange-peel paint, brushed / scuffed roughness, fingerprints) generated once per tab and
// cached, and small material makers that always set a customProgramCacheKey (kit/core NOTES: onBeforeCompile hazard).
// Everything is a pure function of its seed (no Math.random, no Date).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { boxUVsAndWear } from "../surfaces/ground";
import type { KitCtx } from "../core/ctx";
import { pmremOf } from "../core/rigs";

export type V3 = [number, number, number];
export type C3 = [number, number, number];

export const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export const hash1 = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const sstep = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- geometry
/** a rounded box from min / max corners: metre box UVs + wear on the arrises (kit SURFACES attributes) */
export const rboxG = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r = 0.004, seg = 2) => {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.max(0.0005, Math.min(r, w / 2.2, h / 2.2, d / 2.2)));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return boxUVsAndWear(g);
};
/** centred rounded box (size, centre) */
export const rboxC = (sx: number, sy: number, sz: number, cx = 0, cy = 0, cz = 0, r = 0.004, seg = 2) =>
  rboxG(cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2, r, seg);
/** a lathe from [radius, y] pairs (metres), UV v = arc length in metres, u = around (0..2 pi r) */
export const latheG = (pts: [number, number][], seg = 40, phi0 = 0, phiLen = Math.PI * 2) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), seg, phi0, phiLen);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute, rMax = Math.max(...pts.map((p) => p[0]));
  let L = 0; const arc = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); arc.push(L); }
  for (let i = 0; i < uv.count; i++) { const k = Math.round(uv.getY(i) * (pts.length - 1)); uv.setXY(i, uv.getX(i) * phiLen * rMax, arc[Math.min(arc.length - 1, k)]); }
  return g;
};
/** a tube along points (metres) */
export const tubeG = (pts: V3[], r: number, seg = 48, radial = 8, closed = false) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, "catmullrom", 0.5), seg, r, radial, closed);
export const cylG = (r0: number, r1: number, h: number, seg = 24, open = false) => new THREE.CylinderGeometry(r1, r0, h, seg, 1, open);
/** translate / rotate helpers that return the geometry (chainable in arrays) */
export const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z); return g;
};
/** merge (non-indexed safe) */
export const merge = (gs: THREE.BufferGeometry[]) => {
  const norm = gs.map((g) => {
    let h = g.index ? g.toNonIndexed() : g;
    if (!h.getAttribute("uv")) { const n = h.getAttribute("position").count; h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2)); }
    for (const k of Object.keys(h.attributes)) if (!["position", "normal", "uv"].includes(k)) h.deleteAttribute(k);
    if (!h.getAttribute("normal")) h.computeVertexNormals();
    return h;
  });
  const m = mergeGeometries(norm, false);
  if (!m) throw new Error("kit/home: merge failed");
  return m;
};
/** a mesh that casts + receives */
export const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true, name?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; if (name) o.name = name; return o;
};

// ---------------------------------------------------------------- procedural micro maps (cached per tab)
const texCache = new Map<string, THREE.Texture>();
const vnoise2 = (seed: number) => {
  const R = rng(seed), N = 256, tab = new Float32Array(N * N);
  for (let i = 0; i < tab.length; i++) tab[i] = R();
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const a = tab[((yi & 255) * N) + (xi & 255)], b = tab[((yi & 255) * N) + ((xi + 1) & 255)];
    const c = tab[(((yi + 1) & 255) * N) + (xi & 255)], d = tab[(((yi + 1) & 255) * N) + ((xi + 1) & 255)];
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
};
/** a tiling height field (periodic by sampling a torus of the noise lattice) */
const heightField = (size: number, seed: number, octaves: [number, number][]) => {
  const H = new Float32Array(size * size);
  const n = vnoise2(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const [f, a] of octaves) {
      // periodic: blend 4 lattice samples (simple wrap by modulo of an integer frequency)
      const fx = (x / size) * f, fy = (y / size) * f;
      const w = (xx: number, yy: number) => n(((xx % f) + f) % f + 17 * a, ((yy % f) + f) % f + 31 * a);
      const xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
      const s00 = w(xi, yi), s10 = w(xi + 1, yi), s01 = w(xi, yi + 1), s11 = w(xi + 1, yi + 1);
      const u = tx * tx * (3 - 2 * tx), q = ty * ty * (3 - 2 * ty);
      v += a * (s00 + (s10 - s00) * u + (s01 - s00) * q + (s00 - s10 - s01 + s11) * u * q);
    }
    H[y * size + x] = v;
  }
  return H;
};
const toNormalTex = (H: Float32Array, size: number, k: number, key: string) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = size; const g = cv.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = H[y * size + ((x + 1) % size)] - H[y * size + ((x - 1 + size) % size)];
    const hy = H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x];
    let nx = -hx * k, ny = hy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4; img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.name = key;
  return t;
};
/** orange-peel paint / enamel micro normal (1 repeat = `tileM` metres via texture.repeat set by the caller) */
export const peelNormal = (seed = 1, strength = 1.6) => {
  const key = `peel:${seed}:${strength}`;
  let t = texCache.get(key);
  if (!t) { const S = 256; t = toNormalTex(heightField(S, seed, [[24, 0.6], [48, 0.3], [96, 0.15]]), S, strength, key); texCache.set(key, t); }
  return t;
};
/** brushed metal micro normal: fine streaks along u */
export const brushedNormal = (seed = 2, strength = 2.2) => {
  const key = `brush:${seed}:${strength}`;
  let t = texCache.get(key);
  if (!t) {
    const S = 256, H = new Float32Array(S * S), R = rng(seed);
    const rows = Array.from({ length: S }, () => R());
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) H[y * S + x] = rows[y] * 0.7 + 0.3 * rows[(y + Math.floor(x / 64)) % S];
    t = toNormalTex(H, S, strength, key); texCache.set(key, t);
  }
  return t;
};
/** a roughness / grime map (linear, G channel = roughness factor, like an ARM): base value, blotches, fingerprints, edge
 *  scuffs. `prints` = count of oval fingerprint smudges (shinier, smeared). Values multiply material.roughness. */
export const roughMap = (seed = 3, o: { base?: number; var?: number; prints?: number; scratches?: number } = {}) => {
  const key = `rough:${seed}:${JSON.stringify(o)}`;
  let t = texCache.get(key);
  if (!t) {
    const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d")!, R = rng(seed);
    const base = Math.round((o.base ?? 0.75) * 255);
    g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, S, S);
    // blotches (macro variation)
    for (let i = 0; i < 40; i++) {
      const x = R() * S, y = R() * S, r = 20 + R() * 90, v = (R() - 0.5) * (o.var ?? 0.35) * 255;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = Math.max(0, Math.min(255, base + v));
      gr.addColorStop(0, `rgba(${c},${c},${c},0.55)`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // fingerprints: smooth ovals (lower roughness = smudged grease)
    for (let i = 0; i < (o.prints ?? 0); i++) {
      const x = R() * S, y = R() * S, a = R() * Math.PI;
      g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = "rgba(60,60,60,0.35)"; g.lineWidth = 1.2;
      for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(0, 0, 4 + k * 2.2, 6 + k * 2.8, 0, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    }
    // fine scratches (higher roughness lines)
    g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 0.7;
    for (let i = 0; i < (o.scratches ?? 30); i++) { const x = R() * S, y = R() * S, a = R() * Math.PI, l = 8 + R() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.name = key;
    texCache.set(key, t);
  }
  return t;
};
/** clone a cached texture with its own repeat */
export const rep = (t: THREE.Texture, rx: number, ry = rx) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

// ---------------------------------------------------------------- materials (all with their own program cache key)
let matN = 0;
export type MatOpts = { color: THREE.ColorRepresentation | C3; rough?: number; metal?: number; peel?: number; brushed?: boolean; tile?: number;
  prints?: number; roughVar?: number; clearcoat?: number; ccRough?: number; emissive?: THREE.ColorRepresentation | C3; emissiveI?: number; side?: THREE.Side;
  envK?: number; map?: THREE.Texture | null; normalScale?: number; name?: string };
const col = (c: THREE.ColorRepresentation | C3) => (Array.isArray(c) ? new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace) : new THREE.Color(c));
/** a PBR material with micro detail: orange-peel or brushed normal + a roughness / fingerprint map. `tile` = UV units per
 *  texture repeat (geometry UVs are in metres: tile 0.25 = a 25 cm repeat) */
export const pbr = (o: MatOpts) => {
  const physical = (o.clearcoat ?? 0) > 0;
  const m = physical ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
  m.color = col(o.color); m.roughness = o.rough ?? 0.55; m.metalness = o.metal ?? 0;
  const tile = o.tile ?? 0.3;
  if (o.brushed) { m.normalMap = rep(brushedNormal(), 1 / tile, 1 / tile); m.normalScale.set(o.normalScale ?? 0.35, o.normalScale ?? 0.35); }
  else if ((o.peel ?? 0.6) > 0) { m.normalMap = rep(peelNormal(), 1 / tile, 1 / tile); const s = (o.peel ?? 0.6) * (o.normalScale ?? 0.5); m.normalScale.set(s, s); }
  m.roughnessMap = rep(roughMap(5, { base: 0.8, var: o.roughVar ?? 0.3, prints: o.prints ?? 0 }), 1 / (tile * 2), 1 / (tile * 2));
  if (o.map) m.map = o.map;
  if (physical) { const p = m as THREE.MeshPhysicalMaterial; p.clearcoat = o.clearcoat!; p.clearcoatRoughness = o.ccRough ?? 0.08; }
  if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.emissiveI ?? 1; }
  if (o.side !== undefined) m.side = o.side;
  if (o.envK !== undefined) m.envMapIntensity = o.envK;
  m.name = o.name ?? `home:${++matN}`;
  const key = `home:pbr:${physical ? "p" : "s"}:${o.emissive ? "e" : ""}`;
  m.customProgramCacheKey = () => key;
  return m;
};
/** an unlit emissive (HDR, blooms) */
export const glow = (c: THREE.ColorRepresentation | C3, k = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(k), toneMapped: false, fog: false });
  m.customProgramCacheKey = () => "home:glow"; return m;
};
/** a canvas-texture material (labels, clock faces, magnets): sRGB map, satin */
export const canvasMat = (cv: HTMLCanvasElement, o: { rough?: number; metal?: number; transparent?: boolean; alphaTest?: number; side?: THREE.Side; emissiveK?: number } = {}) => {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, transparent: o.transparent ?? false, alphaTest: o.alphaTest ?? 0, side: o.side ?? THREE.FrontSide });
  if (o.emissiveK) { m.emissiveMap = t; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = o.emissiveK; }
  m.customProgramCacheKey = () => "home:canvas"; return m;
};
export const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return { cv: c, g: c.getContext("2d")! }; };

/** a soft multiply contact / AO blob (footprint w x d), y offset above the surface it lies on */
let blob: THREE.Texture | null = null;
export const contactBlob = (w: number, d: number, strength = 0.55, y = 0.0015) => {
  if (!blob) {
    const { cv, g } = canvas(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,0.8)"); gr.addColorStop(0.55, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    blob = new THREE.CanvasTexture(cv);
  }
  const m = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: strength, polygonOffset: true, polygonOffsetFactor: -2,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor, color: 0x000000 });
  m.customProgramCacheKey = () => "home:blob";
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); o.rotation.x = -Math.PI / 2; o.position.y = y; o.renderOrder = 0.5; o.name = "contact";
  return o;
};

/** damped spring response to a kick at t0 (0 before): amp * e^(-z w dt) sin(w dt) */
export const kick = (t: number, t0: number, amp: number, hz: number, damp = 3) => {
  const dt = t - t0; if (dt < 0) return 0;
  return amp * Math.exp(-damp * dt) * Math.sin(2 * Math.PI * hz * dt);
};

// ---------------------------------------------------------------- a material's OWN environment (glass, glossy balls)
export type EnvFace = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
export type BoxEnvSpec = {
  key: string;
  /** metres from the eye point to each wall of the box room (world axes) */
  xp: number; xn: number; up: number; down: number; zp: number; zn: number;
  /** scene-linear radiance of a wall point: the face + the hit point relative to the eye (metres, world axes) */
  shade: (face: EnvFace, p: V3) => C3;
  /** equirect width in px (default 512; 1024 keeps window bars crisp in a near-mirror reflection) */
  size?: number;
};
const envCache = new Map<string, THREE.Texture>();
/** a box room seen from one eye point as a PMREM environment (cached by key): every direction takes the radiance of the
 *  wall point it hits. What a glass jar or a glossy ball REFLECTS: a bright window with its bars, ceiling panels, the
 *  sunlit table. three's scene IBL is a soft gradient here (rig env "proc:*"): no shapes, so glass reads as milk. */
export const boxEnv = (ctx: KitCtx, s: BoxEnvSpec): THREE.Texture => {
  const have = envCache.get(s.key); if (have) return have;
  const W = s.size ?? 512, H = W / 2, d = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const el = ((y + 0.5) / H - 0.5) * Math.PI, ce = Math.cos(el), se = Math.sin(el);     // row 0 = nadir (flipY off)
    for (let x = 0; x < W; x++) {
      const ph = ((x + 0.5) / W - 0.5) * Math.PI * 2, dx = ce * Math.cos(ph), dy = se, dz = ce * Math.sin(ph);
      const tx = dx > 1e-6 ? s.xp / dx : dx < -1e-6 ? -s.xn / dx : 1e9, ty = dy > 1e-6 ? s.up / dy : dy < -1e-6 ? -s.down / dy : 1e9, tz = dz > 1e-6 ? s.zp / dz : dz < -1e-6 ? -s.zn / dz : 1e9;
      const t = Math.min(tx, ty, tz);
      const face: EnvFace = t === tx ? (dx > 0 ? "+x" : "-x") : t === ty ? (dy > 0 ? "+y" : "-y") : dz > 0 ? "+z" : "-z";
      const c = s.shade(face, [dx * t, dy * t, dz * t]);
      d.set([c[0], c[1], c[2], 1], (y * W + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.flipY = false; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.LinearSRGBColorSpace; tex.name = `home-env:${s.key}`; tex.needsUpdate = true;
  const pm = pmremOf(ctx.gl, tex);
  envCache.set(s.key, pm);
  return pm;
};
/** give a material its own environment map. Its strength drops to 0 while CORE bakes the GI cube (the bake sets
 *  scene.environmentIntensity = 0 for a first-bounce-only render), so the bake does not count this light twice. */
export const ownEnv = <M extends THREE.MeshStandardMaterial>(m: M, env: THREE.Texture, k = 1): M => {
  m.envMap = env; m.envMapIntensity = k; m.userData.envK = k;
  m.onBeforeRender = (_r, scene) => { m.envMapIntensity = (scene as THREE.Scene).environmentIntensity === 0 ? 0 : (m.userData.envK as number); };
  return m;
};

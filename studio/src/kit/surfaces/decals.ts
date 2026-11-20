// SURFACES decals. Two kinds:
// 1. PROJECTED decals inside a kit surface material (`addDecals(mat, specs)`): up to 16 per material, evaluated in the
//    surface shader BEFORE lighting, so they follow the displacement, get the sun / shadows / AO / IBL like the surface,
//    and feed its masks (a crack collects dirt + moss, a puddle is real water, a wear patch cleans the joints).
//    Types: stain, oil, puddle, crack, paint, leaves (leaf-stain prints), wear, streak (drips under sills), moss.
// 2. FLOATING-QUAD decals for road paint (`paintLines`) and real geometry for manhole covers / drain grates.
// The atlas (16 cells, 512 px) is drawn once in code from a fixed seed (no assets, no randomness per frame).
import * as THREE from "three";
import type { KitCtx } from "../core/ctx";
import { SURF_DECAL_TEX, MAX_DECALS, type SurfMaterial } from "./materials";

const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export type DecalType = "stain" | "oil" | "puddle" | "crack" | "paint" | "leaves" | "wear" | "streak" | "moss";
const TYPE: Record<DecalType, number> = { stain: 0, oil: 1, puddle: 2, crack: 3, paint: 4, leaves: 5, wear: 6, streak: 7, moss: 8 };
/** atlas cells per type (several variants each) */
const CELLS: Record<DecalType, number[]> = { crack: [0, 1, 2], stain: [3, 4], oil: [5], puddle: [6, 7], leaves: [8], wear: [9], streak: [10, 11], paint: [12], moss: [13, 14], };

// ---------------------------------------------------------------- the atlas (A = coverage, R = detail)
let ATLAS: THREE.DataTexture | null = null;
export const decalAtlas = () => {
  if (ATLAS) return ATLAS;
  const N = 2048, C = 512;
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = "lighter";
  // red = coverage, green = detail
  const blob = (cx: number, cy: number, r: number, a: number, ch: "r" | "g" = "r") => {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    const c = ch === "r" ? `rgba(255,0,0,${a})` : `rgba(0,255,0,${a})`;
    gr.addColorStop(0, c); gr.addColorStop(1, ch === "r" ? "rgba(255,0,0,0)" : "rgba(0,255,0,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  };
  const cell = (k: number, fn: (ox: number, oy: number, R: () => number) => void) => {
    const ox = (k % 4) * C, oy = (3 - Math.floor(k / 4)) * C;   // three flips canvas rows: cell row 0 is the BOTTOM row
    g.save(); g.beginPath(); g.rect(ox + 6, oy + 6, C - 12, C - 12); g.clip(); fn(ox, oy, rng(1000 + k * 77)); g.restore();
  };
  const crack = (ox: number, oy: number, R: () => number, branches: number) => {
    const walk = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
      g.lineCap = "round";
      for (let i = 0; i < len; i++) {
        const nx = x + Math.cos(a) * 9, ny = y + Math.sin(a) * 9;
        g.strokeStyle = `rgba(255,0,0,0.9)`; g.lineWidth = w * 2.6; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        g.strokeStyle = `rgba(0,255,0,0.95)`; g.lineWidth = Math.max(0.8, w); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        x = nx; y = ny; a += (R() - 0.5) * 0.7; w *= 0.985;
        if (depth < 2 && R() < 0.06) walk(x, y, a + (R() < 0.5 ? 1 : -1) * (0.5 + R()), Math.floor(len * 0.4), w * 0.7, depth + 1);
      }
    };
    for (let b = 0; b < branches; b++) walk(ox + 60 + R() * 60, oy + 120 + R() * 280, -0.2 + (R() - 0.5) * 0.6, 44 + Math.floor(R() * 10), 3.2, 0);
  };
  cell(0, (ox, oy, R) => crack(ox, oy, R, 1));
  cell(1, (ox, oy, R) => crack(ox, oy, R, 2));
  cell(2, (ox, oy, R) => { // crazing: a net of short cracks
    for (let i = 0; i < 26; i++) { const x = ox + 60 + R() * 390, y = oy + 60 + R() * 390; g.strokeStyle = "rgba(255,0,0,0.7)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y);
      let a = R() * 6.28, px = x, py = y; for (let j = 0; j < 8; j++) { px += Math.cos(a) * 12; py += Math.sin(a) * 12; a += (R() - 0.5) * 0.9; g.lineTo(px, py); } g.stroke();
      g.strokeStyle = "rgba(0,255,0,0.9)"; g.lineWidth = 1.5; g.stroke(); }
  });
  const stain = (ox: number, oy: number, R: () => number, n: number, a: number) => { for (let i = 0; i < n; i++) blob(ox + 256 + (R() - 0.5) * 260, oy + 256 + (R() - 0.5) * 260, 40 + R() * 120, a * (0.3 + 0.7 * R())); for (let i = 0; i < n * 2; i++) blob(ox + 256 + (R() - 0.5) * 340, oy + 256 + (R() - 0.5) * 340, 10 + R() * 40, 0.6, "g"); };
  cell(3, (ox, oy, R) => stain(ox, oy, R, 9, 0.35));
  cell(4, (ox, oy, R) => stain(ox, oy, R, 5, 0.5));
  cell(5, (ox, oy, R) => { // oil: dark core, rainbow-ish ring in detail, drips
    for (let i = 0; i < 7; i++) blob(ox + 256 + (R() - 0.5) * 120, oy + 256 + (R() - 0.5) * 120, 60 + R() * 110, 0.5);
    g.strokeStyle = "rgba(0,255,0,0.5)"; g.lineWidth = 14; g.beginPath(); g.ellipse(ox + 256, oy + 256, 170, 140, 0.3, 0, 6.28); g.stroke();
    for (let i = 0; i < 14; i++) blob(ox + 256 + (R() - 0.5) * 380, oy + 256 + (R() - 0.5) * 380, 6 + R() * 18, 0.8);
  });
  const puddle = (ox: number, oy: number, R: () => number) => {
    for (let i = 0; i < 10; i++) { const x = ox + 256 + (R() - 0.5) * 250, y = oy + 256 + (R() - 0.5) * 160; g.fillStyle = "rgba(255,0,0,0.55)"; g.beginPath(); g.ellipse(x, y, 60 + R() * 90, 40 + R() * 60, R() * 3, 0, 6.28); g.fill(); }
  };
  cell(6, puddle); cell(7, puddle);
  cell(8, (ox, oy, R) => { // leaf prints: tannin stains in leaf shapes
    for (let i = 0; i < 16; i++) { const x = ox + 60 + R() * 390, y = oy + 60 + R() * 390, s = 18 + R() * 26, a = R() * 6.28;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgba(255,0,0,${0.35 + R() * 0.45})`; g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.7, 0, 0, s); g.quadraticCurveTo(-s * 0.7, 0, 0, -s); g.fill();
      g.strokeStyle = "rgba(0,255,0,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -s); g.lineTo(0, s * 1.3); g.stroke(); g.restore(); }
  });
  cell(9, (ox, oy, R) => { for (let i = 0; i < 30; i++) blob(ox + 256 + (R() - 0.5) * 300, oy + 256 + (R() - 0.5) * 300, 30 + R() * 70, 0.18); });
  const streak = (ox: number, oy: number, R: () => number) => { // drips: thin vertical streaks fading downward (top of cell = source)
    for (let i = 0; i < 22; i++) { const x = ox + 70 + R() * 370, L = 150 + R() * 330, w = 4 + R() * 16;
      const gr = g.createLinearGradient(0, oy + 20, 0, oy + 20 + L); gr.addColorStop(0, `rgba(255,${Math.floor(R() * 200)},0,${0.35 + R() * 0.4})`); gr.addColorStop(1, "rgba(255,0,0,0)");
      g.fillStyle = gr; g.fillRect(x, oy + 20, w, L); }
  };
  cell(10, streak); cell(11, streak);
  cell(12, (ox, oy, R) => { // worn paint: coverage full, detail = wear noise (low = worn through)
    g.fillStyle = "rgba(255,0,0,1)"; g.fillRect(ox, oy, C, C);
    for (let i = 0; i < 400; i++) blob(ox + R() * C, oy + R() * C, 6 + R() * 30, 0.25 + R() * 0.5, "g");
  });
  const moss = (ox: number, oy: number, R: () => number) => { for (let i = 0; i < 60; i++) blob(ox + 256 + (R() - 0.5) * 360, oy + 256 + (R() - 0.5) * 360, 8 + R() * 50, 0.35 + R() * 0.4); };
  cell(13, moss); cell(14, moss);
  cell(15, (ox, oy, R) => { for (let i = 0; i < 40; i++) blob(ox + R() * C, oy + C - R() * 120, 30 + R() * 80, 0.3); });
  const img = g.getImageData(0, 0, N, N).data, data = new Uint8Array(N * N * 4);
  // canvas rows are top-down; DataTexture rows are bottom-up (no flip): copy rows reversed
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = ((N - 1 - y) * N + x) * 4, o = (y * N + x) * 4;
    data[o] = img[i + 1]; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = img[i];
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true;
  ATLAS = t; SURF_DECAL_TEX.value = t;
  return t;
};

export type DecalSpec = {
  type: DecalType;
  /** centre: WORLD x,z for ground materials ("xz"), x,y for "xy" walls, metre-UV for "uv" materials */
  at: [number, number];
  /** full size in metres (along, across) */
  size: [number, number];
  rot?: number; opacity?: number; variant?: number;
  /** tint for stain / leaves / streak / paint (linear RGB); param: stain roughness add, paint wear threshold */
  tint?: [number, number, number]; param?: number;
};
const DEF_TINT: Partial<Record<DecalType, [number, number, number]>> = { stain: [0.55, 0.5, 0.45], leaves: [0.45, 0.33, 0.2], streak: [0.5, 0.47, 0.42], paint: [0.9, 0.88, 0.82] };
/** add projected decals to a kit surface material (max 16; extra ones are dropped with a warning) */
export const addDecals = (mat: SurfMaterial, specs: DecalSpec[]) => {
  decalAtlas();
  const st = mat.userData.surf;
  for (const d of specs) {
    if (st.decals.length >= MAX_DECALS) { console.warn("surfaces: decal limit reached on", mat.name); break; }
    let [u, v] = d.at;
    if (st.uvMode === "xz") v = -v;
    const cells = CELLS[d.type], cellI = cells[(d.variant ?? 0) % cells.length];
    const tint = d.tint ?? DEF_TINT[d.type] ?? [1, 1, 1];
    st.decals.push({ a: new THREE.Vector4(u, v, -(d.rot ?? 0), d.opacity ?? 1), b: new THREE.Vector4(d.size[0] / 2, d.size[1] / 2, cellI, TYPE[d.type]), c: new THREE.Vector4(tint[0], tint[1], tint[2], d.param ?? (d.type === "paint" ? 0.1 : 0.08)) });
  }
  st.syncDecals();
  return mat;
};
/** sprinkle a seeded mix of everyday wear decals over a ground rect (world x0,x1,z0,z1) */
export const scatterWear = (mat: SurfMaterial, rect: [number, number, number, number], mix: Partial<Record<DecalType, number>>, seed = 1) => {
  const R = rng(seed), [x0, x1, z0, z1] = rect, specs: DecalSpec[] = [];
  for (const [type, n] of Object.entries(mix) as [DecalType, number][]) for (let i = 0; i < n; i++) {
    const s = type === "crack" ? 0.8 + R() * 1.4 : type === "puddle" ? 0.8 + R() * 1.6 : type === "oil" ? 0.4 + R() * 0.6 : 0.5 + R() * 1.2;
    specs.push({ type, at: [x0 + (x1 - x0) * R(), z0 + (z1 - z0) * R()], size: [s, s * (0.6 + 0.5 * R())], rot: R() * 6.28, opacity: 0.6 + 0.4 * R(), variant: Math.floor(R() * 3) });
  }
  return addDecals(mat, specs);
};

// ---------------------------------------------------------------- floating paint (road markings)
export type PaintLine = { a: [number, number]; b: [number, number]; w: number; color?: [number, number, number] };
let paintTex: THREE.CanvasTexture | null = null;
const paintTexture = () => {
  if (paintTex) return paintTex;
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 1024; const g = cv.getContext("2d")!, R = rng(77);
  g.fillStyle = "rgba(255,255,255,1)"; g.fillRect(0, 0, 256, 1024);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) { const x = R() * 256, y = R() * 1024, r = 1 + R() * (R() < 0.08 ? 22 : 6); g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.7})`; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); }
  for (let i = 0; i < 40; i++) { const y = R() * 1024; g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(0, y, 256, 1 + R() * 4); }   // tyre-worn bands
  g.fillRect(0, 0, 5, 1024); g.fillRect(251, 0, 5, 1024);
  paintTex = new THREE.CanvasTexture(cv); paintTex.colorSpace = THREE.SRGBColorSpace; paintTex.wrapT = THREE.RepeatWrapping; paintTex.anisotropy = 8;
  return paintTex;
};
/** painted road lines as lit floating quads that follow the road height y(x) (camber), worn and slightly glossy */
export const paintLines = async (_ctx: KitCtx, lines: PaintLine[], o: { y?: (x: number, z: number) => number; seed?: number; wet?: number } = {}) => {
  const grp = new THREE.Group(); grp.name = "paint"; grp.userData.kitModule = "decals";
  const tex = paintTexture(), y = o.y ?? (() => 0);
  const byCol = new Map<string, THREE.BufferGeometry[]>();
  for (const L of lines) {
    const dx = L.b[0] - L.a[0], dz = L.b[1] - L.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, px = -uz, pz = ux;
    const nA = 4, nL = Math.max(2, Math.ceil(len / 0.5)), pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= nL; j++) for (let i = 0; i <= nA; i++) {
      const s = j / nL * len, t = (i / nA - 0.5) * L.w, x = L.a[0] + ux * s + px * t, z = L.a[1] + uz * s + pz * t;
      pos.push(x, y(x, z) + 0.003, z); uv.push(i / nA, s / 2.0);
    }
    for (let j = 0; j < nL; j++) for (let i = 0; i < nA; i++) { const a = j * (nA + 1) + i, b = a + 1, c = a + nA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const k = (L.color ?? [0.92, 0.9, 0.84]).join(",");
    if (!byCol.has(k)) byCol.set(k, []); byCol.get(k)!.push(g);
  }
  const { mergeGeometries } = await import("three/examples/jsm/utils/BufferGeometryUtils.js");
  for (const [k, gs] of byCol) {
    const c = k.split(",").map(Number);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0], c[1], c[2]), map: tex, transparent: true, depthWrite: false, roughness: 0.5 - 0.35 * (o.wet ?? 0), metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    m.customProgramCacheKey = () => "surfaces:paint";
    const mesh = new THREE.Mesh(mergeGeometries(gs)!, m); mesh.receiveShadow = true; mesh.renderOrder = 1; grp.add(mesh);
  }
  return grp;
};

// ---------------------------------------------------------------- manhole covers + drain grates (real geometry)
const heightToNormal = (h: Float32Array, N: number, k: number) => {
  const d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hx = h[y * N + Math.min(N - 1, x + 1)] - h[y * N + Math.max(0, x - 1)], hy = h[Math.min(N - 1, y + 1) * N + x] - h[Math.max(0, y - 1) * N + x];
    const nx = -hx * k, ny = -hy * k, l = Math.hypot(nx, ny, 1), o = (y * N + x) * 4;
    d[o] = (nx / l * 0.5 + 0.5) * 255; d[o + 1] = (ny / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
};
let ironMats: { cover: THREE.MeshStandardMaterial; grate: THREE.MeshStandardMaterial; frame: THREE.MeshStandardMaterial; pit: THREE.MeshStandardMaterial } | null = null;
const iron = () => {
  if (ironMats) return ironMats;
  const N = 512, h = new Float32Array(N * N), col = new Uint8Array(N * N * 4), R = rng(5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N - 0.5, v = y / N - 0.5, r = Math.hypot(u, v);
    // raised rings + a cross-hatched diamond tread (classic cast-iron cover)
    const ring = (r > 0.44 && r < 0.47) || (r > 0.3 && r < 0.315) ? 1 : 0;
    const a = (u + v) * 26, b = (u - v) * 26, tread = (Math.abs(a - Math.round(a)) < 0.12 || Math.abs(b - Math.round(b)) < 0.12) && r < 0.43 && r > 0.04 ? 0.7 : 0;
    const hh = Math.max(ring, tread);
    h[y * N + x] = hh;
    const wear = hh > 0 ? 0.55 : 0.0, n = R() * 0.15, rust = Math.max(0, Math.sin(u * 9 + v * 4) * 0.5 + R() * 0.3) * (1 - hh);
    const o = (y * N + x) * 4;
    col[o] = Math.min(255, (0.09 + wear * 0.25 + n * 0.3 + rust * 0.25) * 255); col[o + 1] = Math.min(255, (0.085 + wear * 0.22 + n * 0.3 + rust * 0.12) * 255); col[o + 2] = Math.min(255, (0.08 + wear * 0.2 + n * 0.3) * 255); col[o + 3] = 255;
  }
  const map = new THREE.DataTexture(col, N, N); map.colorSpace = THREE.SRGBColorSpace; map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter; map.needsUpdate = true;
  const nor = heightToNormal(h, N, 6);
  const cover = new THREE.MeshStandardMaterial({ map, normalMap: nor, roughness: 0.55, metalness: 0.55 });
  // grate: slots cut by alpha
  const G = 256, gd = new Uint8Array(G * G * 4);
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const slot = (x % 32) > 7 && (x % 32) < 26 && y > 14 && y < G - 14; const o = (y * G + x) * 4; gd[o] = 40; gd[o + 1] = 38; gd[o + 2] = 36; gd[o + 3] = slot ? 0 : 255; }
  const gmap = new THREE.DataTexture(gd, G, G); gmap.colorSpace = THREE.SRGBColorSpace; gmap.needsUpdate = true; gmap.generateMipmaps = true; gmap.minFilter = THREE.LinearMipmapLinearFilter;
  const grate = new THREE.MeshStandardMaterial({ map: gmap, alphaTest: 0.5, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide });
  const frame = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.095, 0.09), roughness: 0.6, metalness: 0.5 });
  const pit = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.02, 0.02, 0.018), roughness: 0.3, metalness: 0 });
  [cover, grate, frame, pit].forEach((m, i) => { m.customProgramCacheKey = () => "surfaces:iron" + i; });
  ironMats = { cover, grate, frame, pit };
  return ironMats;
};
/** a round cast-iron manhole cover with a frame ring, flush with the road at (x, y, z) */
export const manhole = (o: { at: [number, number, number]; r?: number; rot?: number }) => {
  const M = iron(), r = o.r ?? 0.32, g = new THREE.Group(); g.name = "manhole"; g.userData.kitModule = "decals";
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), M.cover); disc.position.y = 0.002; disc.rotation.y = o.rot ?? 0;
  const ringG = new THREE.RingGeometry(r, r + 0.05, 48).rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringG, M.frame); ring.position.y = 0.004;
  for (const m of [disc, ring]) { m.receiveShadow = true; g.add(m); }
  g.position.set(...o.at);
  return g;
};
/** a gutter drain: a slotted grate over a dark recessed pit (real depth), at (x, y, z), long side along z */
export const drainGrate = (o: { at: [number, number, number]; w?: number; l?: number; rot?: number }) => {
  const M = iron(), w = o.w ?? 0.3, l = o.l ?? 0.5, g = new THREE.Group(); g.name = "drain"; g.userData.kitModule = "decals";
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), M.grate); top.position.y = 0.003; top.castShadow = true; top.receiveShadow = true;
  const pit = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.25, l * 0.96), M.pit); pit.position.y = -0.125; pit.receiveShadow = true;
  (pit.material as THREE.Material).side = THREE.BackSide;
  const fr = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 4, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), M.frame); fr.scale.set(w * 1.27, 1, l * 1.27); fr.position.y = 0.004;
  g.add(pit, top, fr); g.position.set(...o.at); g.rotation.y = o.rot ?? 0;
  return g;
};

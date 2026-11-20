// NATURE / ground scatter: a DETERMINISTIC scatter API for any set (stratified jitter + seeded clumping noise, areas as
// rects / polygons / strips along lines, avoid zones, density falling off from a focus point) and the litter it places:
// fallen leaves (dry / green, curled), petals, pebbles, twigs, paper scraps, wrappers, bottle caps (no cigarettes).
//   const pts = scatterPoints({ area: { rect: [-1.2, -30, 1.2, 6] }, density: 6, seed: 3, avoid: [{ c: [0.3, -2], r: 0.5 }] })
//   const litter = await scatter(ctx, { area: ..., kinds: ["leaf", "pebble", "twig"], density: 8, seed: 4 }); set.add(litter.object)
import * as THREE from "three";
import type { KitCtx, Built } from "../core/ctx";
import { keyed } from "./wind";

export type XZ = [number, number];
/** rect = [x0, z0, x1, z1]; poly = xz polygon; strip = a band of `width` m along a polyline (kerbs, joints, wall feet) */
export type Area = { rect: [number, number, number, number] } | { poly: XZ[] } | { strip: XZ[]; width: number };
export type Avoid = { c: XZ; r: number } | { rect: [number, number, number, number] } | { poly: XZ[] };
export type ScatterOpts = {
  area: Area | Area[];
  /** items per m2 at full density */
  density: number;
  seed?: number;
  avoid?: Avoid[];
  /** 0 = even, 1 = strongly clumped (seeded value noise, ~`clumpM` m blobs) */
  clump?: number; clumpM?: number;
  /** density x (near / max(d, near))^pow from this ground point (keeps the count near the lens) */
  falloff?: { from: XZ; near: number; pow?: number; min?: number };
  /** hard cap on the number of points */
  max?: number;
};

const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const hash2 = (x: number, z: number, s: number) => { const h = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
/** smooth seeded value noise in [0, 1] */
export const vnoise = (x: number, z: number, s = 0) => {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const inPoly = (p: XZ, poly: XZ[]) => {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
};
const segDist = (p: XZ, a: XZ, b: XZ) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
};
const bounds = (a: Area): [number, number, number, number] => {
  if ("rect" in a) return a.rect;
  const pts = "poly" in a ? a.poly : a.strip, w = "strip" in a ? a.width / 2 : 0;
  return [Math.min(...pts.map((p) => p[0])) - w, Math.min(...pts.map((p) => p[1])) - w, Math.max(...pts.map((p) => p[0])) + w, Math.max(...pts.map((p) => p[1])) + w];
};
const inside = (a: Area, p: XZ) => {
  if ("rect" in a) return p[0] >= a.rect[0] && p[0] <= a.rect[2] && p[1] >= a.rect[1] && p[1] <= a.rect[3];
  if ("poly" in a) return inPoly(p, a.poly);
  for (let i = 0; i + 1 < a.strip.length; i++) if (segDist(p, a.strip[i], a.strip[i + 1]) <= a.width / 2) return true;
  return false;
};
const avoided = (av: Avoid[] | undefined, p: XZ) => !!av && av.some((a) => ("c" in a ? Math.hypot(p[0] - a.c[0], p[1] - a.c[1]) < a.r : "rect" in a ? inside(a, p) : inPoly(p, a.poly)));

/** deterministic points (stratified jitter on a density grid, then clump / falloff / avoid thinning) */
export const scatterPoints = (o: ScatterOpts): { x: number; z: number; r: number }[] => {
  const areas = Array.isArray(o.area) ? o.area : [o.area];
  const R = rng((o.seed ?? 1) + 17), out: { x: number; z: number; r: number }[] = [];
  const cell = 1 / Math.sqrt(Math.max(o.density, 1e-4));
  for (const a of areas) {
    const [x0, z0, x1, z1] = bounds(a);
    for (let z = z0; z < z1; z += cell) for (let x = x0; x < x1; x += cell) {
      const p: XZ = [x + R() * cell, z + R() * cell];
      const keepR = R(), rr = R();
      if (!inside(a, p) || avoided(o.avoid, p)) continue;
      let k = 1;
      if (o.clump) k *= Math.max(0, 1 - o.clump + o.clump * 2.2 * Math.pow(vnoise(p[0] / (o.clumpM ?? 1.5), p[1] / (o.clumpM ?? 1.5), o.seed ?? 1), 2));
      if (o.falloff) { const d = Math.hypot(p[0] - o.falloff.from[0], p[1] - o.falloff.from[1]); k *= Math.max(o.falloff.min ?? 0, Math.pow(o.falloff.near / Math.max(d, o.falloff.near), o.falloff.pow ?? 1.5)); }
      if (keepR < k) out.push({ x: p[0], z: p[1], r: rr });
      if (o.max && out.length >= o.max) return out;
    }
  }
  return out;
};

// ------------------------------------------------------------------ litter
export type LitterKind = "leaf" | "leafGreen" | "petal" | "pebble" | "twig" | "paper" | "wrapper" | "cap";
export type ScatterKitOpts = ScatterOpts & { kinds: (LitterKind | { kind: LitterKind; weight: number })[]; y?: number; scale?: number; shadow?: boolean };

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
let leafTexP: Promise<{ map: THREE.Texture; alpha: THREE.Texture }> | null = null;
export const leafAtlas = (ctx: KitCtx) => {
  if (!leafTexP) leafTexP = Promise.all([ctx.assets.tex("kit/nature/litter/leafset024_color.jpg", { srgb: true }), ctx.assets.tex("kit/nature/litter/leafset024_opacity.jpg", { srgb: false })])
    .then(([map, alpha]) => ({ map, alpha }));
  return leafTexP;
};
/** a curled leaf card (2 x 3 segments, bent along its length and across), pivot at the leaf centre */
export const curledLeafGeo = (curl = 0.25) => {
  const g = new THREE.PlaneGeometry(1, 1, 3, 4); const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, curl * (x * x * 1.6 + y * y * 0.8)); }
  g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g;
};
const pebbleGeo = () => {
  const g = new THREE.IcosahedronGeometry(1, 1); const p = g.getAttribute("position") as THREE.BufferAttribute, R = rng(5);
  const m = new Map<string, number>();
  for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!m.has(k)) m.set(k, 0.8 + 0.35 * R()); const s = m.get(k)!; p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.55, p.getZ(i) * s); }
  g.computeVertexNormals(); g.translate(0, 0.35, 0); return g;
};
const twigGeo = () => { const g = new THREE.CylinderGeometry(0.5, 0.7, 1, 5, 4); const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + 1.2 * Math.sin(y * 2.2) * 0.8); } g.rotateZ(Math.PI / 2); g.computeVertexNormals(); return g; };

type KindDef = { geo: THREE.BufferGeometry; mat: THREE.Material; size: [number, number]; lift: number; tilt: number; cast: boolean; atlas?: boolean; sx?: [number, number] };
const kindDefs = new Map<string, Promise<KindDef>>();
const makeKind = (ctx: KitCtx, k: LitterKind): Promise<KindDef> => {
  let p = kindDefs.get(k);
  if (p) return p;
  p = (async () => {
    if (k === "leaf" || k === "leafGreen") {
      const { map, alpha } = await leafAtlas(ctx);
      const m = new THREE.MeshStandardMaterial({ map, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 });
      const dry = k === "leaf";
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aCell;\nvarying vec2 vCell;")
          .replace("#include <uv_vertex>", "#include <uv_vertex>\nvCell = aCell;\n#ifdef USE_MAP\n vMapUv = ( uv + floor( aCell * 3.0 ) ) / 3.0;\n#endif\n#ifdef USE_ALPHAMAP\n vAlphaMapUv = ( uv + floor( aCell * 3.0 ) ) / 3.0;\n#endif");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vCell;")
          .replace("#include <color_fragment>", dry ? /* glsl */ `#include <color_fragment>
  { float l = dot( diffuseColor.rgb, vec3( 0.3, 0.6, 0.1 ) ) * 2.1; float h = fract( vCell.x * 7.31 + vCell.y * 3.17 );
    vec3 c = h < 0.35 ? vec3( 0.55, 0.32, 0.12 ) : h < 0.65 ? vec3( 0.72, 0.52, 0.18 ) : h < 0.85 ? vec3( 0.42, 0.26, 0.13 ) : vec3( 0.5, 0.48, 0.2 );
    diffuseColor.rgb = c * l; }` : "#include <color_fragment>\n diffuseColor.rgb *= vec3( 0.9, 0.95, 0.7 );");
      };
      keyed(m, "litter-leaf-" + k);
      return { geo: curledLeafGeo(0.22), mat: m, size: [0.045, 0.08], lift: 0.004, tilt: 0.25, cast: false, atlas: true };
    }
    if (k === "petal") {
      const t = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 40, 2, 32, 32, 30); gr.addColorStop(0, "#fff4f6"); gr.addColorStop(1, "#f3b8c8"); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 32, 18, 28, 0, 0, Math.PI * 2); g.fill(); });
      const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
      return { geo: curledLeafGeo(0.3), mat: m, size: [0.012, 0.022], lift: 0.003, tilt: 0.3, cast: false };
    }
    if (k === "pebble") return { geo: pebbleGeo(), mat: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.42, 0.39, 0.35), roughness: 0.85 }), size: [0.008, 0.028], lift: -0.002, tilt: 0.4, cast: true };
    if (k === "twig") return { geo: twigGeo(), mat: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.24, 0.17, 0.11), roughness: 0.9 }), size: [0.006, 0.01], lift: 0.004, tilt: 0.1, cast: true, sx: [12, 30] };
    if (k === "paper") {
      const t = canvasTex(128, 128, (g) => { g.fillStyle = "#ece7dc"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(120,140,170,0.35)"; g.lineWidth = 2; for (let y = 18; y < 128; y += 14) { g.beginPath(); g.moveTo(8, y); g.lineTo(120, y); g.stroke(); } g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(64, 0, 3, 128); });
      const geo = new THREE.PlaneGeometry(1, 1, 4, 4); const pp = geo.getAttribute("position") as THREE.BufferAttribute, R = rng(9);
      for (let i = 0; i < pp.count; i++) pp.setZ(i, (R() - 0.5) * 0.12 + 0.08 * Math.abs(pp.getX(i)));
      geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
      return { geo, mat: new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 }), size: [0.06, 0.12], lift: 0.006, tilt: 0.15, cast: true };
    }
    if (k === "wrapper") {
      const geo = new THREE.PlaneGeometry(1, 0.6, 3, 2); const pp = geo.getAttribute("position") as THREE.BufferAttribute, R = rng(3);
      for (let i = 0; i < pp.count; i++) pp.setZ(i, (R() - 0.5) * 0.25); geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
      return { geo, mat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }), size: [0.04, 0.07], lift: 0.006, tilt: 0.2, cast: false };
    }
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 12, 1); geo.translate(0, 0.125, 0);
    return { geo, mat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.7 }), size: [0.026, 0.03], lift: 0, tilt: 0.05, cast: false };
  })();
  kindDefs.set(k, p);
  return p;
};
const WRAP_COLS = [[0.7, 0.12, 0.1], [0.12, 0.3, 0.65], [0.85, 0.7, 0.15], [0.2, 0.55, 0.25], [0.85, 0.85, 0.85]];

/** litter on the ground: deterministic, instanced per kind */
export const scatter = async (ctx: KitCtx, o: ScatterKitOpts): Promise<Built> => {
  const pts = scatterPoints(o), R = rng((o.seed ?? 1) * 7 + 3);
  const kinds = o.kinds.map((k) => (typeof k === "string" ? { kind: k, weight: 1 } : k));
  const tot = kinds.reduce((s, k) => s + k.weight, 0);
  const buckets: { x: number; z: number; r: number }[][] = kinds.map(() => []);
  for (const p of pts) { let u = p.r * tot, i = 0; while (i < kinds.length - 1 && u > kinds[i].weight) { u -= kinds[i].weight; i++; } buckets[i].push(p); }
  const root = new THREE.Group(); root.name = "kit-scatter";
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = o.scale ?? 1;
  for (let ki = 0; ki < kinds.length; ki++) {
    const list = buckets[ki]; if (!list.length) continue;
    const K = await makeKind(ctx, kinds[ki].kind);
    const im = new THREE.InstancedMesh(K.geo, K.mat, list.length);
    const cell = new Float32Array(list.length * 2), col = new Float32Array(list.length * 3);
    list.forEach((p, j) => {
      const s = (K.size[0] + (K.size[1] - K.size[0]) * R()) * sc;
      const sx = K.sx ? K.sx[0] + (K.sx[1] - K.sx[0]) * R() : 1;
      q.setFromEuler(e.set((R() - 0.5) * K.tilt, R() * Math.PI * 2, (R() - 0.5) * K.tilt, "YXZ"));
      m4.compose(new THREE.Vector3(p.x, (o.y ?? 0) + K.lift + 0.002 * R(), p.z), q, new THREE.Vector3(s * sx, s, s));
      im.setMatrixAt(j, m4);
      cell[j * 2] = R(); cell[j * 2 + 1] = R();
      const k = kinds[ki].kind;
      const c = k === "wrapper" || k === "cap" ? WRAP_COLS[Math.floor(R() * WRAP_COLS.length)] : k === "pebble" ? [0.8 + 0.4 * R(), 0.78 + 0.35 * R(), 0.74 + 0.3 * R()] : [0.85 + 0.3 * R(), 0.85 + 0.3 * R(), 0.85 + 0.3 * R()];
      col.set(c, j * 3);
    });
    im.geometry = K.geo.clone(); im.geometry.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2));
    im.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
    im.castShadow = (o.shadow ?? true) && K.cast; im.receiveShadow = true; im.frustumCulled = false;
    root.add(im);
  }
  root.userData.count = pts.length;
  return { object: root };
};

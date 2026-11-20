// kit/vehicles (TRAIN owner): geometry helpers. Every part is pushed into a Parts bag under a material key and merged
// once per key (one draw call per material). All geometry is NON-indexed with the same attributes (position, normal,
// uv in METRES, aDirt 0..1), so anything merges with anything. Units: metres, Y up.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../core/ctx";

export type Parts = Map<string, THREE.BufferGeometry[]>;
export const parts = (): Parts => new Map();

/** normalise a geometry: non-indexed, only position / normal / uv / aDirt (uv in metres: box-projected if missing) */
export const norm = (g0: THREE.BufferGeometry, boxUV = true): THREE.BufferGeometry => {
  const g = g0.index ? g0.toNonIndexed() : g0;
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "aDirt"].includes(k)) g.deleteAttribute(k);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  if (boxUV || !g.getAttribute("uv")) metreUV(g);
  if (!g.getAttribute("aDirt")) g.setAttribute("aDirt", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
  return g;
};
/** box-projected UVs in metres from the (already transformed) positions */
export const metreUV = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = z; uv[i * 2 + 1] = x; } else if (nx >= nz) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};
/** add a geometry to a key; returns the NORMALISED geometry (the one that is merged: tint / dirt it) */
export const put = (P: Parts, k: string, g: THREE.BufferGeometry, boxUV = true) => {
  if (!P.has(k)) P.set(k, []);
  const n = norm(g, boxUV);
  P.get(k)!.push(n);
  return n;
};
/** merge every key (returns key -> geometry); empty keys are skipped */
export const mergeParts = (P: Parts): Map<string, THREE.BufferGeometry> => {
  const out = new Map<string, THREE.BufferGeometry>();
  for (const [k, list] of P) if (list.length) { const m = mergeGeometries(list, false); if (m) { m.computeBoundingSphere(); m.computeBoundingBox(); out.set(k, m); } }
  return out;
};
/** meshes for every merged key that has a material (cast / receive shadows by default) */
export const meshes = (P: Parts, mats: Record<string, THREE.Material>, o: { cast?: boolean; noCast?: string[]; name?: string } = {}) => {
  const g = new THREE.Group(); g.name = o.name ?? "vparts";
  for (const [k, geo] of mergeParts(P)) {
    const m = mats[k];
    if (!m) { console.warn(`kit/vehicles: no material for part key "${k}"`); continue; }
    const me = new THREE.Mesh(geo, m); me.name = k;
    me.castShadow = o.cast !== false && !(o.noCast ?? []).includes(k) && !(m as THREE.Material).transparent;
    me.receiveShadow = true;
    g.add(me);
  }
  return g;
};

// ---------------------------------------------------------------- primitives (all positioned in the caller's frame)
/** rounded box from min / max corners */
export const rbox = (P: Parts, k: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r = 0.006, seg = 2) => {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  const rr = Math.max(0.0005, Math.min(r, w / 2.05, h / 2.05, d / 2.05));
  const g = new RoundedBoxGeometry(Math.max(w, 1e-4), Math.max(h, 1e-4), Math.max(d, 1e-4), seg, rr);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return put(P, k, g);
};
/** rounded box by centre + size, rotated (Euler XYZ, rad) */
export const rboxC = (P: Parts, k: string, c: V3, s: V3, r = 0.006, rot: V3 = [0, 0, 0], seg = 2) => {
  const rr = Math.max(0.0005, Math.min(r, s[0] / 2.05, s[1] / 2.05, s[2] / 2.05));
  const g = new RoundedBoxGeometry(s[0], s[1], s[2], seg, rr);
  g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]);
  g.translate(c[0], c[1], c[2]);
  return put(P, k, g);
};
/** plain box (sharp) */
export const box = (P: Parts, k: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return put(P, k, g);
};
const Y = new THREE.Vector3(0, 1, 0);
/** a cylinder (or cone) between two points */
export const cyl = (P: Parts, k: string, a: V3, b: V3, r: number, seg = 16, r2?: number, open = false) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r2 ?? r, r, L, seg, 1, open);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, B.clone().sub(A).normalize());
  g.applyQuaternion(q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return put(P, k, g);
};
/** a disc / short cylinder facing `n` (thickness t) */
export const disc = (P: Parts, k: string, c: V3, n: V3, r: number, t: number, seg = 32) => {
  const N = new THREE.Vector3(...n).normalize();
  return cyl(P, k, [c[0] - N.x * t / 2, c[1] - N.y * t / 2, c[2] - N.z * t / 2], [c[0] + N.x * t / 2, c[1] + N.y * t / 2, c[2] + N.z * t / 2], r, seg);
};
/** a torus ring of radius R (tube r) facing `n` */
export const ring = (P: Parts, k: string, c: V3, n: V3, R: number, r: number, seg = 40, tseg = 10) => {
  const g = new THREE.TorusGeometry(R, r, tseg, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...n).normalize()));
  g.translate(...c);
  return put(P, k, g);
};
/** a tube along a polyline / curve of points (radius r) */
export const tube = (P: Parts, k: string, pts: V3[], r: number, seg = 10, curve = true, tSeg?: number) => {
  const vs = pts.map((p) => new THREE.Vector3(...p));
  const c = curve ? new THREE.CatmullRomCurve3(vs, false, "centripetal", 0.5) : new THREE.CurvePath<THREE.Vector3>();
  if (!curve) for (let i = 0; i < vs.length - 1; i++) (c as THREE.CurvePath<THREE.Vector3>).add(new THREE.LineCurve3(vs[i], vs[i + 1]));
  const g = new THREE.TubeGeometry(c as THREE.Curve<THREE.Vector3>, tSeg ?? Math.max(4, pts.length * (curve ? 8 : 1)), r, seg, false);
  return put(P, k, g);
};
/** a flat quad given 4 corners (counter-clockwise seen from the front) */
export const quad = (P: Parts, k: string, a: V3, b: V3, c: V3, d: V3) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  return put(P, k, g);
};
/** a quad visible from both sides (two faces): for parts whose winding is awkward */
export const quadB = (P: Parts, k: string, a: V3, b: V3, c: V3, d: V3) => { quad(P, k, a, b, c, d); return quad(P, k, d, c, b, a); };
/** a flat quad whose front face looks toward `n` (the winding is fixed for you) */
export const quadN = (P: Parts, k: string, a: V3, b: V3, c: V3, d: V3, n: V3) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return nx * n[0] + ny * n[1] + nz * n[2] >= 0 ? quad(P, k, a, b, c, d) : quad(P, k, d, c, b, a);
};
/** a vertical arc wall in plan (centre cx, cz, radius r, angles a0..a1 measured from +X toward +Z), y0..y1; faces
 *  outward (or inward with `inward`); smooth normals */
export const arcWall = (P: Parts, k: string, cx: number, cz: number, r: number, a0: number, a1: number, y0: number, y1: number, seg = 10, inward = false) => {
  const pos: number[] = [], nor: number[] = [];
  for (let i = 0; i < seg; i++) {
    const A = a0 + ((a1 - a0) * i) / seg, B = a0 + ((a1 - a0) * (i + 1)) / seg, s = inward ? -1 : 1;
    const pa: V3 = [cx + Math.cos(A) * r, 0, cz + Math.sin(A) * r], pb: V3 = [cx + Math.cos(B) * r, 0, cz + Math.sin(B) * r];
    const na: V3 = [Math.cos(A) * s, 0, Math.sin(A) * s], nb: V3 = [Math.cos(B) * s, 0, Math.sin(B) * s];
    // outward winding for increasing angle seen from outside: (a,y0) (a,y1) (b,y1) / (a,y0) (b,y1) (b,y0); flipped when needed
    const tri = [[pa, y0, na], [pa, y1, na], [pb, y1, nb], [pa, y0, na], [pb, y1, nb], [pb, y0, nb]] as [V3, number, V3][];
    // geometric normal of the first triangle vs the wanted one
    const ex = pb[0] - pa[0], ez = pb[2] - pa[2], gx = (y1 - y0) * ez, gz = -(y1 - y0) * ex;   // (0, h, 0) x (ex, h, ez)
    const flip = gx * na[0] + gz * na[2] < 0;
    const order = flip ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5];
    for (const j of order) { const [p, y, n] = tri[j]; pos.push(p[0], y, p[2]); nor.push(n[0], 0, n[2]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return put(P, k, g);
};
/** a flat quad with its own UVs 0..1 (screens, dials, posters, labels) */
export const quadUV = (P: Parts, k: string, a: V3, b: V3, c: V3, d: V3) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  g.computeVertexNormals();
  return put(P, k, g, false);
};
/** a lathe (profile [r, y] around Y) placed at c, axis along `n` */
export const lathe = (P: Parts, k: string, prof: [number, number][], c: V3, n: V3 = [0, 1, 0], seg = 32) => {
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(...n).normalize()));
  g.translate(...c);
  return put(P, k, g);
};
/** an extruded 2D shape (points in the XY plane, extruded along +Z by depth, with a small bevel), then transformed */
export const extrude = (P: Parts, k: string, pts: [number, number][], depth: number, m: THREE.Matrix4, bevel = 0.003, holes: [number, number][][] = []) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  g.applyMatrix4(m);
  return put(P, k, g);
};
/** a sphere (squashed by s) */
export const sphere = (P: Parts, k: string, c: V3, r: number, s: V3 = [1, 1, 1], seg = 12) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg / 2 | 0));
  g.scale(...s); g.translate(...c);
  return put(P, k, g);
};

/** the side wall plane of a rect (x0..x1 along u, y0..y1) minus rect holes, emitted through `emit(u0, y0, u1, y1)` cells */
export const gridHoles = (U0: number, U1: number, Y0: number, Y1: number, holes: { u0: number; u1: number; y0: number; y1: number }[],
  emit: (u0: number, y0: number, u1: number, y1: number) => void) => {
  const us = [...new Set([U0, U1, ...holes.flatMap((h) => [h.u0, h.u1]).filter((u) => u > U0 && u < U1)])].sort((a, b) => a - b);
  const ys = [...new Set([Y0, Y1, ...holes.flatMap((h) => [h.y0, h.y1]).filter((y) => y > Y0 && y < Y1)])].sort((a, b) => a - b);
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const cu = (us[i] + us[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    if (holes.some((h) => cu > h.u0 && cu < h.u1 && cy > h.y0 && cy < h.y1)) continue;
    emit(us[i], ys[j], us[i + 1], ys[j + 1]);
  }
};

/** write per-vertex dirt (0..1; aDirt.x) on a geometry from its positions + normals. aDirt is a vec2: x = dirt
 *  (toward the material's dirt colour, rougher, less metal), y = tint (-1..1: a small value / sheen offset per panel) */
export const dirt = (g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
  const a = (g.getAttribute("aDirt") as THREE.BufferAttribute) ?? new THREE.BufferAttribute(new Float32Array(p.count * 2), 2);
  for (let i = 0; i < p.count; i++) a.setX(i, Math.max(0, Math.min(1, fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)))));
  g.setAttribute("aDirt", a); a.needsUpdate = true;
  return g;
};
/** one tint (-1..1; aDirt.y) for a whole geometry (a panel): value / sheen variation between panels */
export const tint = (g: THREE.BufferGeometry, v: number | ((x: number, y: number, z: number) => number)) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, a = g.getAttribute("aDirt") as THREE.BufferAttribute;
  if (!a) return g;
  for (let i = 0; i < p.count; i++) a.setY(i, typeof v === "number" ? v : v(p.getX(i), p.getY(i), p.getZ(i)));
  a.needsUpdate = true;
  return g;
};
export const tintKey = (P: Parts, k: string, v: Parameters<typeof tint>[1]) => { for (const g of P.get(k) ?? []) tint(g, v); };
/** apply a dirt function to every geometry currently in a Parts key (before merging) */
export const dirtKey = (P: Parts, k: string, fn: Parameters<typeof dirt>[1]) => { for (const g of P.get(k) ?? []) dirt(g, fn); };

// ---------------------------------------------------------------- deterministic noise
export const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export const hash1 = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
export const vnoise = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f);
  return (hash1(i + seed * 57.31) * (1 - k) + hash1(i + 1 + seed * 57.31) * k) * 2 - 1;
};
export const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

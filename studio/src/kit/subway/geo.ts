// KIT / SUBWAY: geometry helpers. `Parts` collects pieces per material key (rounded boxes with metre UVs, quads,
// cylinders between two points, sagging cables, extruded profiles) and merges them into one mesh per key.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../core/ctx";

/** box-projected UVs in metres (world-size) */
export const metreUVs = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = x; uv[i * 2 + 1] = -z; } else if (nx >= nz) { uv[i * 2] = -z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};
const clean = (g: THREE.BufferGeometry) => {
  let h = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(h.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") h.deleteAttribute(k);
  if (!h.getAttribute("normal")) h.computeVertexNormals();
  if (!h.getAttribute("uv")) h = metreUVs(h);
  return h;
};

export class Parts {
  P = new Map<string, THREE.BufferGeometry[]>();
  add(k: string, g: THREE.BufferGeometry, m?: THREE.Matrix4) { if (m) g.applyMatrix4(m); if (!this.P.has(k)) this.P.set(k, []); this.P.get(k)!.push(g); return g; }
  /** rounded box from min / max corners, metre UVs (the world-size box projection after the transform) */
  box(k: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r = 0.006, m?: THREE.Matrix4, seg = 2) {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.2, h / 2.2, d / 2.2)) : new THREE.BoxGeometry(w, h, d);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (m) g.applyMatrix4(m);
    return this.add(k, metreUVs(g));
  }
  /** quad with corners a (0,0), b (1,0), c (1,1), d (0,1); UV in metres along ab / ad */
  quad(k: string, a: V3, b: V3, c: V3, d: V3) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), H = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, L, 0, L, H, 0, H], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
    return this.add(k, g);
  }
  /** a cylinder between two points */
  cyl(k: string, a: V3, b: V3, r: number, seg = 10, caps = true) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1, !caps);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    g.applyQuaternion(q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * r, uv.getY(i) * L);
    return this.add(k, g);
  }
  /** a tube along a polyline (cables) */
  tube(k: string, pts: V3[], r: number, seg = 6) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(c, Math.max(8, pts.length * 6), r, seg, false);
    return this.add(k, g);
  }
  /** a sagging cable from a to b (catenary-ish parabola, sag m) */
  cable(k: string, a: V3, b: V3, sag: number, r: number, n = 10) {
    const pts: V3[] = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]); }
    return this.tube(k, pts, r, 5);
  }
  /** merge every key into one mesh with its material; missing materials are skipped */
  build(mats: Record<string, THREE.Material>, opts: { cast?: (k: string) => boolean; receive?: boolean; name?: string } = {}) {
    const G = new THREE.Group(); G.name = opts.name ?? "parts";
    for (const [k, list] of this.P) {
      const m = mats[k]; if (!m || !list.length) continue;
      const g = mergeGeometries(list.map(clean), false); if (!g) { console.warn(`subway parts: merge failed for ${k}`); continue; }
      const mesh = new THREE.Mesh(g, m); mesh.name = k;
      mesh.castShadow = opts.cast ? opts.cast(k) : true; mesh.receiveShadow = opts.receive ?? true;
      G.add(mesh);
    }
    return G;
  }
}

/** an H / I section along Y (flanges parallel to X, web along Z): bf flange width, d depth, tf / tw thicknesses */
export const iSection = (P: Parts, k: string, cx: number, cz: number, y0: number, y1: number, bf = 0.26, d = 0.3, tf = 0.018, tw = 0.012) => {
  for (const s of [-1, 1]) P.box(k, cx - bf / 2, y0, cz + s * (d / 2) - tf / 2, cx + bf / 2, y1, cz + s * (d / 2) + tf / 2, 0.004);
  P.box(k, cx - tw / 2, y0, cz - d / 2 + tf / 2, cx + tw / 2, y1, cz + d / 2 - tf / 2, 0.002);
};
/** an I-beam along X (flanges horizontal) or along Z */
export const iBeam = (P: Parts, k: string, along: "x" | "z", a0: number, a1: number, c: number, yTop: number, h = 0.36, bf = 0.2, tf = 0.016, tw = 0.011) => {
  const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => along === "x" ? P.box(k, x0, y0, z0, x1, y1, z1, 0.003) : P.box(k, z0, y0, x0, z1, y1, x1, 0.003);
  B(a0, yTop - tf, c - bf / 2, a1, yTop, c + bf / 2);
  B(a0, yTop - h, c - bf / 2, a1, yTop - h + tf, c + bf / 2);
  B(a0, yTop - h + tf, c - tw / 2, a1, yTop - tf, c + tw / 2);
};
/** rivet heads (instanced half-spheres) */
export const rivets = (pts: { p: V3; n: V3 }[], mat: THREE.Material, r = 0.009) => {
  const g = new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const im = new THREE.InstancedMesh(g, mat, Math.max(1, pts.length)); im.count = pts.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(1, 0.55, 1);
  pts.forEach((pt, i) => { q.setFromUnitVectors(up, new THREE.Vector3(...pt.n)); m.compose(new THREE.Vector3(...pt.p), q, s); im.setMatrixAt(i, m); });
  im.castShadow = false; im.receiveShadow = true; im.name = "rivets";
  return im;
};

// SURFACES ground kit: tessellated near-lens patches with real displacement (graded grid: ~1.6 cm at the lens, coarse
// far away), cheap far ground, built borders (segmented bevelled kerb / edging stones with worn arrises), and the
// composite builders: path, street (asphalt with camber + gutter + kerbs + sidewalk + markings), plaza, lawn-with-soil,
// dirt track, interior floor. Units m, Y up. Grounds never cast shadows (nothing below them); kerbs / stones do.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { surface, setSurfAttrs, type SurfaceOpts, type SurfName, type SurfMaterial } from "./materials";
import { paintLines, type PaintLine } from "./decals";

export const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** the lens track of a shot (camera ground positions); the near patch is fine where the lens is close */
export type Lens = { points: [number, number][] };
const lensDist = (L: Lens | undefined, x: number, z: number) => {
  if (!L || !L.points.length) return 50;
  let d = 1e9; for (const [px, pz] of L.points) d = Math.min(d, Math.hypot(px - x, pz - z)); return d;
};
/** graded 1D stations: spacing = clamp(fine + k * distance, fine, coarse) */
const stations = (a: number, b: number, dist: (v: number) => number, fine: number, k: number, coarse: number) => {
  const out = [a]; let v = a;
  while (v < b - 1e-6) { const s = Math.min(coarse, Math.max(fine, fine + k * Math.max(0, dist(v) - 0.6))); v = Math.min(b, v + s); out.push(v); }
  return out;
};

export type PatchOpts = {
  rect: [number, number, number, number];   // x0, x1, z0, z1 (world)
  y?: number | ((x: number, z: number) => number);
  lens?: Lens;
  /** grid spacing at the lens (m), growth per m of distance, max spacing */
  fine?: number; k?: number; coarse?: number;
  /** per-vertex (edge, centre) for moss / dirt at borders and wear on the walking line; default from the rect */
  edges?: (x: number, z: number) => [number, number];
  blend?: (x: number, z: number) => number;
  /** displacement on (aSurf.z where the grid is fine enough) */
  displace?: boolean;
};
/** a tessellated ground patch (world coordinates baked in; mesh at the origin) */
export const patchGeometry = (o: PatchOpts) => {
  const [x0, x1, z0, z1] = o.rect;
  const fine = o.fine ?? 0.016, k = o.k ?? 0.0075, coarse = o.coarse ?? 0.4;
  const lp = o.lens?.points ?? [];
  const dX = (x: number) => lp.length ? Math.min(...lp.map((p) => Math.abs(p[0] - x))) * 0.35 + Math.min(...lp.map((p) => Math.abs(p[1] - (z0 + z1) / 2))) * 0 : 50;
  const dZ = (z: number) => lp.length ? Math.min(...lp.map((p) => Math.abs(p[1] - z))) : 50;
  const xs = stations(x0, x1, (x) => (lp.length ? dX(x) : 50), fine, k, coarse);
  const zs = stations(z0, z1, dZ, fine, k, coarse);
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), nrm = new Float32Array(nx * nz * 3), idx: number[] = [];
  const yf = typeof o.y === "function" ? o.y : () => (o.y as number) ?? 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const q = (j * nx + i) * 3; pos[q] = xs[i]; pos[q + 1] = yf(xs[i], zs[j]); pos[q + 2] = zs[j]; nrm[q + 1] = 1;
  }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(nx * nz * 2), 2));
  g.setIndex(nx * nz > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  if (typeof o.y === "function") g.computeVertexNormals();
  const hw = (x1 - x0) / 2, cx = (x0 + x1) / 2;
  const edges = o.edges ?? ((x: number) => [1 - sstep(0, 0.35, Math.min(x - x0, x1 - x)), 1 - sstep(0, hw * 0.7, Math.abs(x - cx))] as [number, number]);
  // displacement weight from the local spacing (no relief on coarse rows: it would alias)
  const sp = (arr: number[], i: number) => Math.max(arr[Math.min(arr.length - 1, i + 1)] - arr[i], arr[i] - arr[Math.max(0, i - 1)]);
  setSurfAttrs(g, (x, _y, z, vi) => {
    const i = vi % nx, j = Math.floor(vi / nx), s = Math.max(sp(xs, i), sp(zs, j));
    const [e, c] = edges(x, z);
    return [e, c, o.displace === false ? 0 : 1 - sstep(0.024, 0.05, s), 0];
  }, o.blend ? (x, _y, z) => o.blend!(x, z) : undefined);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return { geometry: g, verts: nx * nz };
};
export const groundMesh = (mat: THREE.Material, o: PatchOpts) => {
  const { geometry, verts } = patchGeometry(o);
  const m = new THREE.Mesh(geometry, mat); m.receiveShadow = true; m.castShadow = false;
  m.userData.kitModule = "ground"; m.userData.verts = verts;
  return m;
};

// ---------------------------------------------------------------- built borders: kerb / edging stones
/** box-projected UVs in metres (world), so a "uv"-mode surface keeps its real scale on every face; wear on rounded arrises */
export const boxUVsAndWear = (g: THREE.BufferGeometry, wearK = 1) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2), w = new Float32Array(p.count), s = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = x; uv[i * 2 + 1] = -z; } else if (nx >= nz) { uv[i * 2] = -z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    w[i] = wearK * sstep(0.03, 0.25, 1 - Math.max(nx, ny, nz));
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("aWear", new THREE.BufferAttribute(w, 1)); g.setAttribute("aSurf", new THREE.BufferAttribute(s, 3));
  return g;
};
export type KerbOpts = {
  from: [number, number]; to: [number, number];
  /** section: width (across), height (above y0), how deep it is sunk below y0 */
  w: number; h: number; sink?: number; y0?: number;
  /** stone length, joint gap, arris radius, seed; jitter = tiny random lift / yaw per stone (laid by hand) */
  len?: number; gap?: number; r?: number; seed?: number; jitter?: number;
};
/** one run of segmented, bevelled kerb / edging stones (merged geometry, world coords) */
export const kerbGeometry = (o: KerbOpts) => {
  const R = rng(o.seed ?? 3);
  const [ax, az] = o.from, [bx, bz] = o.to, L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
  const len = o.len ?? 0.9, gap = o.gap ?? 0.006, r = o.r ?? 0.012, sink = o.sink ?? 0.05, y0 = o.y0 ?? 0, jit = o.jitter ?? 1;
  const n = Math.max(1, Math.round(L / len)), sl = L / n;
  const parts: THREE.BufferGeometry[] = [];
  const base = new RoundedBoxGeometry(1, 1, 1, 2, 0.5);
  for (let i = 0; i < n; i++) {
    const g = new RoundedBoxGeometry(sl - gap, o.h + sink, o.w, 2, r);
    const u = (i + 0.5) / n, cx = ax + (bx - ax) * u, cz = az + (bz - az) * u;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, y0 + (o.h - sink) / 2 + (R() - 0.5) * 0.004 * jit, cz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 0.006 * jit, yaw + (R() - 0.5) * 0.006 * jit, (R() - 0.5) * 0.008 * jit)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m); parts.push(g);
  }
  base.dispose();
  const g = boxUVsAndWear(mergeGeometries(parts, false)!);
  parts.forEach((p) => p.dispose());
  return g;
};
export const kerbMesh = (mat: THREE.Material, o: KerbOpts) => {
  const m = new THREE.Mesh(kerbGeometry(o), mat); m.castShadow = true; m.receiveShadow = true; m.userData.kitModule = "ground"; return m;
};

// ---------------------------------------------------------------- composite builders
const group = (name: string) => { const g = new THREE.Group(); g.name = name; g.userData.kitModule = "ground"; return g; };

export type PathOpts = {
  /** centre line x, width, z range (the path runs along Z) */
  x?: number; width: number; z0: number; z1: number;
  surface?: SurfName; surfaceOpts?: SurfaceOpts;
  lens?: Lens;
  /** edging stones each side (null = none); their surface */
  edging?: { w?: number; h?: number; surface?: SurfName; surfaceOpts?: SurfaceOpts } | null;
  /** gaps in the edging (e.g. a cross path): z ranges */
  edgingGaps?: [number, number][];
  seed?: number;
};
/** a paved path (default brick pavers) with a displaced near patch, moss / dirt toward the borders, worn walking line, and
 *  segmented bevelled edging stones. Returns the materials so decals can be added (decals.ts `addDecals`). */
export const path = async (ctx: KitCtx, o: PathOpts): Promise<Built & { mats: { paving: SurfMaterial; edging?: SurfMaterial } }> => {
  const G = group("path"), x = o.x ?? 0, hw = o.width / 2;
  const paving = await surface(ctx, o.surface ?? "brick_pavers", { displace: true, wear: { polish: 0.3, centre: 0.6 }, ...o.surfaceOpts });
  G.add(groundMesh(paving, { rect: [x - hw, x + hw, o.z0, o.z1], lens: o.lens, edges: (px) => [1 - sstep(0, 0.4, hw - Math.abs(px - x)), 1 - sstep(0, hw * 0.75, Math.abs(px - x))] }));
  let edging: SurfMaterial | undefined;
  if (o.edging !== null) {
    const e = o.edging ?? {}, w = e.w ?? 0.1, h = e.h ?? 0.035;
    edging = await surface(ctx, e.surface ?? "concrete_floor", { uv: "uv", dirt: { bottom: 0.5, heightM: 0.05, baseY: 0, joints: 0.4, grime: 0.15 }, moss: { amount: 0.35, edge: 0.5 }, wear: { edges: 0.9 }, tint: [0.92, 0.9, 0.86], ...e.surfaceOpts });
    const gaps = [...(o.edgingGaps ?? [])].sort((a, b) => b[1] - a[1]);
    for (const side of [-1, 1]) {
      // z runs from z1 (near) down to z0 (far), cut at the gaps
      let runs: [number, number][] = [[o.z1, o.z0]];
      for (const [ga, gb] of gaps) runs = runs.flatMap(([a, b]) => (ga < a && gb > b ? [[a, Math.max(ga, gb)], [Math.min(ga, gb), b]] as [number, number][] : [[a, b]]));
      runs.forEach(([a, b], ri) => G.add(kerbMesh(edging!, { from: [x + side * (hw + w / 2), a], to: [x + side * (hw + w / 2), b], w, h, len: 0.92, seed: (o.seed ?? 1) * 31 + ri + (side > 0 ? 7 : 0) })));
    }
  }
  return { object: G, mats: { paving, edging } };
};

export type StreetOpts = {
  /** road between the kerb faces x0 .. x1, running along Z from z0 to z1 */
  x0: number; x1: number; z0: number; z1: number;
  lens?: Lens;
  kerbH?: number; kerbW?: number; gutterW?: number; camber?: number;
  /** sidewalk widths (left, right; 0 = none) */
  sidewalk?: [number, number];
  road?: SurfName; roadOpts?: SurfaceOpts; walk?: SurfName; walkOpts?: SurfaceOpts; kerb?: SurfName; kerbOpts?: SurfaceOpts; gutter?: SurfName;
  /** painted markings: centre dashes, edge lines, a zebra crossing at z */
  markings?: { centre?: boolean; edges?: boolean; zebraZ?: number; color?: [number, number, number] };
  wet?: number;
  seed?: number;
  /** z ranges where a kerb run is cut (junctions), per side */
  kerbGaps?: { left?: [number, number][]; right?: [number, number][] };
};
/** a street: cambered asphalt, sett gutters, segmented kerbs with worn arrises, slab sidewalks (raised by the kerb),
 *  painted markings (floating-quad decals that follow the camber). Returns materials for decals. */
export const street = async (ctx: KitCtx, o: StreetOpts): Promise<Built & { mats: Record<string, SurfMaterial>; roadY: (x: number) => number }> => {
  const G = group("street");
  const kH = o.kerbH ?? 0.12, kW = o.kerbW ?? 0.16, gW = o.gutterW ?? 0.3, cam = o.camber ?? 0.06, wet = o.wet ?? 0;
  const [sl, sr] = o.sidewalk ?? [2.4, 2.4];
  const rx0 = o.x0 + gW, rx1 = o.x1 - gW, mid = (rx0 + rx1) / 2, hw = (rx1 - rx0) / 2;
  const roadY = (x: number) => { const u = Math.max(-1, Math.min(1, (x - mid) / hw)); return 0.02 + cam * (1 - u * u); };
  const road = await surface(ctx, o.road ?? "asphalt", { wet: { wetness: wet * 0.7, puddles: wet * 0.8, scaleM: 3, level: 0.6 }, dirt: { edge: 0.6, joints: 0.4, grime: 0.12 }, ...o.roadOpts });
  G.add(groundMesh(road, { rect: [rx0, rx1, o.z0, o.z1], y: (x) => roadY(x), lens: o.lens, fine: 0.04, k: 0.02, coarse: 0.6, displace: false,
    edges: (x) => [1 - sstep(0, 0.6, Math.min(x - rx0, rx1 - x)), 0] }));
  const gut = await surface(ctx, o.gutter ?? "cobbles", { displace: true, tileM: 1.4, wet: { wetness: wet, puddles: wet * 0.6 }, dirt: { joints: 0.7, grime: 0.25 }, moss: { amount: 0.4 }, tint: [0.85, 0.85, 0.85] });
  for (const [a, b] of [[o.x0, rx0], [rx1, o.x1]] as [number, number][]) {
    const kerbSide = a === o.x0 ? a : b;
    G.add(groundMesh(gut, { rect: [a, b, o.z0, o.z1], y: (x) => 0.0 + 0.02 * sstep(0, 1, Math.abs(x - kerbSide) / gW), lens: o.lens, fine: 0.016, k: 0.008, coarse: 0.3,
      edges: (x) => [1 - sstep(0, 0.12, Math.abs(x - kerbSide)), 0] }));
  }
  const kerb = await surface(ctx, o.kerb ?? "stone_trim", { uv: "uv", tint: [0.78, 0.77, 0.75], dirt: { bottom: 0.7, heightM: 0.06, baseY: 0, joints: 0.5, grime: 0.25 }, wear: { edges: 1 }, moss: { amount: 0.2 }, wet: { wetness: wet * 0.6 }, ...o.kerbOpts });
  const cut = (gaps: [number, number][] | undefined) => {
    let runs: [number, number][] = [[o.z1, o.z0]];
    for (const [ga, gb] of [...(gaps ?? [])]) runs = runs.flatMap(([a, b]) => { const lo = Math.min(ga, gb), hi = Math.max(ga, gb); return lo < a && hi > b ? [[a, hi], [lo, b]] as [number, number][] : [[a, b]]; });
    return runs.filter(([a, b]) => a - b > 0.2);
  };
  cut(o.kerbGaps?.left).forEach(([a, b], i) => G.add(kerbMesh(kerb, { from: [o.x0 - kW / 2, a], to: [o.x0 - kW / 2, b], w: kW, h: kH, len: 1.0, r: 0.018, seed: (o.seed ?? 1) * 5 + i * 11 })));
  cut(o.kerbGaps?.right).forEach(([a, b], i) => G.add(kerbMesh(kerb, { from: [o.x1 + kW / 2, a], to: [o.x1 + kW / 2, b], w: kW, h: kH, len: 1.0, r: 0.018, seed: (o.seed ?? 1) * 5 + 3 + i * 13 })));
  const walk = await surface(ctx, o.walk ?? "concrete_sidewalk", { displace: true, dirt: { joints: 0.5, edge: 0.3, grime: 0.12 }, moss: { amount: 0.3, edge: 0.6 }, wet: { wetness: wet * 0.6, puddles: wet * 0.3 }, ...o.walkOpts });
  if (sl > 0) G.add(groundMesh(walk, { rect: [o.x0 - kW - sl, o.x0 - kW, o.z0, o.z1], y: kH - 0.004, lens: o.lens, edges: (x) => [1 - sstep(0, 0.3, Math.min(x - (o.x0 - kW - sl), o.x0 - kW - x)), 0] }));
  if (sr > 0) G.add(groundMesh(walk, { rect: [o.x1 + kW, o.x1 + kW + sr, o.z0, o.z1], y: kH - 0.004, lens: o.lens, edges: (x) => [1 - sstep(0, 0.3, Math.min(x - (o.x1 + kW), o.x1 + kW + sr - x)), 0] }));
  // markings
  const mk = o.markings ?? { centre: true, edges: true };
  const lines: PaintLine[] = [];
  const col = mk.color ?? [0.92, 0.9, 0.84];
  if (mk.centre) for (let z = o.z1 - 1; z > o.z0 + 1.5; z -= 9) lines.push({ a: [mid, z], b: [mid, Math.max(o.z0, z - 3)], w: 0.12, color: col });
  if (mk.edges) { lines.push({ a: [rx0 + 0.25, o.z1], b: [rx0 + 0.25, o.z0], w: 0.1, color: col }); lines.push({ a: [rx1 - 0.25, o.z1], b: [rx1 - 0.25, o.z0], w: 0.1, color: col }); }
  if (mk.zebraZ !== undefined) for (let x = rx0 + 0.3; x < rx1 - 0.4; x += 1.0) lines.push({ a: [x + 0.25, mk.zebraZ + 1.5], b: [x + 0.25, mk.zebraZ - 1.5], w: 0.5, color: [0.93, 0.92, 0.88] });
  if (lines.length) G.add(await paintLines(ctx, lines, { y: roadY, seed: o.seed ?? 1, wet }));
  return { object: G, mats: { road, gutter: gut, kerb, walk }, roadY };
};

/** a plaza: a field set + a border band of another set (e.g. cobbles field, granite trim band), displaced near the lens */
export const plaza = async (ctx: KitCtx, o: { rect: [number, number, number, number]; field?: SurfName; band?: SurfName; bandW?: number; lens?: Lens; fieldOpts?: SurfaceOpts }) => {
  const G = group("plaza"), [x0, x1, z0, z1] = o.rect, bw = o.bandW ?? 0.45;
  const field = await surface(ctx, o.field ?? "cobbles", { displace: true, ...o.fieldOpts });
  const band = await surface(ctx, o.band ?? "concrete_sidewalk", { displace: true, rot: Math.PI / 2 });
  G.add(groundMesh(field, { rect: [x0 + bw, x1 - bw, z0 + bw, z1 - bw], lens: o.lens }));
  for (const r of [[x0, x1, z1 - bw, z1], [x0, x1, z0, z0 + bw], [x0, x0 + bw, z0 + bw, z1 - bw], [x1 - bw, x1, z0 + bw, z1 - bw]] as [number, number, number, number][])
    G.add(groundMesh(band, { rect: r, lens: o.lens, edges: () => [0.5, 0] }));
  return { object: G, mats: { field, band } } as Built & { mats: Record<string, SurfMaterial> };
};

/** lawn ground (soil + sparse green; NATURE puts the blades on it) with a gentle undulation; flat far */
export const lawn = async (ctx: KitCtx, o: { rect: [number, number, number, number]; lens?: Lens; undulate?: number; y?: number }) => {
  const soil = await surface(ctx, "lawn_soil", { tint: [0.86, 0.94, 0.78], macro: { amount: 0.2, scaleM: 6 } });
  const u = o.undulate ?? 0.025, y0 = o.y ?? -0.005;
  const m = groundMesh(soil, { rect: o.rect, lens: o.lens, fine: 0.08, k: 0.03, coarse: 1.5, displace: false,
    y: (x, z) => y0 + u * (Math.sin(x * 0.9 + Math.sin(z * 0.4) * 2) * Math.sin(z * 0.7 + 1.3) * 0.6 + Math.sin(x * 2.3 + z * 1.7) * 0.25) - u });
  return { object: m, mats: { soil } } as Built & { mats: Record<string, SurfMaterial> };
};

/** a dirt track: packed earth with two wheel ruts of gravel, puddles in the ruts when wet */
export const dirtTrack = async (ctx: KitCtx, o: { x?: number; width?: number; z0: number; z1: number; lens?: Lens; wet?: number }) => {
  const x = o.x ?? 0, hw = (o.width ?? 3) / 2, wet = o.wet ?? 0;
  const rut = (px: number) => Math.max(0, 1 - Math.min(Math.abs(px - x - 0.75), Math.abs(px - x + 0.75)) / 0.28);
  const mat = await surface(ctx, "dirt_path", { blend: { with: "gravel", mask: "both", bias: -0.25, scaleM: 2 }, wet: { wetness: wet * 0.6, puddles: wet, level: 0.55 } });
  const m = groundMesh(mat, { rect: [x - hw, x + hw, o.z0, o.z1], lens: o.lens, fine: 0.03, k: 0.015, coarse: 0.5, displace: false,
    y: (px) => -0.035 * rut(px) ** 1.5, blend: (px) => rut(px) * 0.9, edges: (px) => [1 - sstep(0, 0.5, hw - Math.abs(px - x)), 0] });
  return { object: m, mats: { track: mat } } as Built & { mats: Record<string, SurfMaterial> };
};

/** an interior floor (boards / tiles / carpet) over a room rectangle; displaced boards near the lens */
export const interiorFloor = async (ctx: KitCtx, o: { rect: [number, number, number, number]; surface?: SurfName; opts?: SurfaceOpts; lens?: Lens; y?: number }) => {
  const mat = await surface(ctx, o.surface ?? "wood_floor", { displace: true, wear: { polish: 0.35, centre: 0.4, chips: 0.3 }, dirt: { edge: 0.35, joints: 0.25, grime: 0.05 }, ...o.opts });
  const [x0, x1, z0, z1] = o.rect;
  const m = groundMesh(mat, { rect: o.rect, y: o.y ?? 0, lens: o.lens, fine: 0.02, k: 0.01, coarse: 0.3,
    edges: (x, z) => [1 - sstep(0, 0.35, Math.min(x - x0, x1 - x, z - z0, z1 - z)), 1 - sstep(0, 1.2, Math.hypot(x - (x0 + x1) / 2, z - (z0 + z1) / 2))] });
  return { object: m, mats: { floor: mat } } as Built & { mats: Record<string, SurfMaterial> };
};

/** cheap far ground (flat plane, 1k textures, no displacement) */
export const farGround = async (ctx: KitCtx, name: SurfName, rect: [number, number, number, number], opts: SurfaceOpts = {}, y = -0.01) => {
  const mat = await surface(ctx, name, { res: "1k", ...opts });
  const [x0, x1, z0, z1] = rect;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  setSurfAttrs(g, () => [0, 0, 0, 0]);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.kitModule = "ground";
  return { object: m, mats: { far: mat } } as Built & { mats: Record<string, SurfMaterial> };
};
export type { V3 };

// ---------------------------------------------------------------- railway + station platform (train film, 2026-11-19)
/** a railway track along Z: a ballast bed with sloped shoulders, bevelled concrete sleepers every 0.6 m (grimy, worn
 *  arrises, slightly irregular), two steel rails (rusty foot + web, polished running head) with clip plates.
 *  gauge 1.067 m = Japanese narrow gauge (JR lines), 1.435 m = standard (Shinkansen). Top of rail = y + 0.25 + 0.2 + 0.15. */
export const railTrack = async (ctx: KitCtx, o: { x?: number; z0: number; z1: number; gauge?: number; y?: number; lens?: Lens; seed?: number }) => {
  const G = group("railTrack"), x = o.x ?? 0, gauge = o.gauge ?? 1.067, y = o.y ?? 0, R = rng(o.seed ?? 3);
  const bedTop = 1.45, bedW = 2.5, H = 0.25;
  const ballast = await surface(ctx, "ballast", { dirt: { grime: 0.25, edge: 0.3 } });
  G.add(groundMesh(ballast, { rect: [x - bedW, x + bedW, o.z0, o.z1], lens: o.lens, fine: 0.03, k: 0.015, coarse: 0.4, displace: false,
    y: (px) => y + H * Math.min(1, Math.max(0, (bedW - Math.abs(px - x)) / (bedW - bedTop))), edges: (px) => [Math.max(0, (Math.abs(px - x) - bedTop) / (bedW - bedTop)), 0] }));
  const conc = await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.78, 0.77, 0.74], dirt: { grime: 0.35, bottom: 0.7, heightM: 0.12, baseY: y + H }, wear: { edges: 0.9 } });
  const parts: THREE.BufferGeometry[] = [], clips: THREE.BufferGeometry[] = [];
  const sTop = y + H + 0.17;
  for (let z = o.z1 - 0.3; z > o.z0 + 0.15; z -= 0.6) {
    const g = new RoundedBoxGeometry(2.0, 0.2, 0.24, 2, 0.018); g.rotateY((R() - 0.5) * 0.02); g.translate(x + (R() - 0.5) * 0.02, sTop - 0.1 + (R() - 0.5) * 0.006, z); parts.push(g);
    for (const s of [-1, 1]) { const c = new THREE.BoxGeometry(0.2, 0.018, 0.16); c.translate(x + s * gauge / 2, sTop + 0.009, z); clips.push(c); }
  }
  const sl = new THREE.Mesh(boxUVsAndWear(mergeGeometries(parts)!), conc); sl.castShadow = true; sl.receiveShadow = true; G.add(sl);
  const clipM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.08, 0.075, 0.07), roughness: 0.6, metalness: 0.5 }); clipM.customProgramCacheKey = () => "surfaces:clip";
  const cm = new THREE.Mesh(mergeGeometries(clips)!, clipM); cm.castShadow = true; cm.receiveShadow = true; G.add(cm);
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.22, 0.11, 0.06), roughness: 0.75, metalness: 0.35 });
  const head = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.62, 0.64), roughness: 0.22, metalness: 1.0 });
  body.customProgramCacheKey = () => "surfaces:railbody"; head.customProgramCacheKey = () => "surfaces:railhead";
  const L = o.z1 - o.z0, zc = (o.z0 + o.z1) / 2, rb: THREE.BufferGeometry[] = [], rh: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const rx = x + s * gauge / 2, y0 = sTop + 0.018;
    const foot = new THREE.BoxGeometry(0.13, 0.012, L); foot.translate(rx, y0 + 0.006, zc); rb.push(foot);
    const web = new THREE.BoxGeometry(0.017, 0.1, L); web.translate(rx, y0 + 0.062, zc); rb.push(web);
    const hd = new RoundedBoxGeometry(0.065, 0.04, L, 2, 0.008); hd.translate(rx, y0 + 0.132, zc); rh.push(hd);
  }
  const m1 = new THREE.Mesh(mergeGeometries(rb)!, body), m2 = new THREE.Mesh(mergeGeometries(rh.map((g) => (g.index ? g.toNonIndexed() : g)))!, head);
  for (const m of [m1, m2]) { m.castShadow = true; m.receiveShadow = true; G.add(m); }
  return { object: G, mats: { ballast, sleepers: conc }, railTopY: sTop + 0.018 + 0.152 } as Built & { mats: Record<string, SurfMaterial>; railTopY: number };
};

/** a station platform along Z (x0..x1, the track on the x0 side): slab paving on top at height h, a bevelled concrete
 *  coping with a painted white edge line, the yellow tactile strip 0.8 m back from the edge (bars along the platform),
 *  a grimy recessed front wall under the coping. Japanese platforms: h ~ 1.1 m above the rail. */
export const platform = async (ctx: KitCtx, o: { x0: number; x1: number; z0: number; z1: number; y?: number; h?: number; lens?: Lens; seed?: number }) => {
  const G = group("platform"), y = o.y ?? 0, h = o.h ?? 1.1, top = y + h;
  const slab = await surface(ctx, "concrete_sidewalk", { displace: true, tint: [0.82, 0.82, 0.8], dirt: { joints: 0.5, grime: 0.12, edge: 0.2 }, moss: { amount: 0 } });
  const tact = await surface(ctx, "tactile_paving", { rot: Math.PI / 2, dirt: { grime: 0.2, edge: 0.3 }, wear: { polish: 0.4 } });
  const cope = await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.8, 0.8, 0.78], dirt: { grime: 0.25, bottom: 0.4, heightM: 0.3, baseY: top - 0.3 }, wear: { edges: 1 } });
  const wall = await surface(ctx, "tunnel_concrete", { uv: "uv", dirt: { grime: 0.45, streaks: 0.5, bottom: 0.8, heightM: 0.5, baseY: y } });
  const tx0 = o.x0 + 0.8, tx1 = tx0 + 0.3;
  G.add(groundMesh(slab, { rect: [o.x0 + 0.35, tx0, o.z0, o.z1], y: top, lens: o.lens }));
  G.add(groundMesh(tact, { rect: [tx0, tx1, o.z0, o.z1], y: top + 0.004, lens: o.lens, displace: false }));
  G.add(groundMesh(slab, { rect: [tx1, o.x1, o.z0, o.z1], y: top, lens: o.lens }));
  G.add(kerbMesh(cope, { from: [o.x0 + 0.175, o.z1], to: [o.x0 + 0.175, o.z0], w: 0.35, h: 0.0, sink: 0.25, y0: top, len: 1.5, gap: 0.008, r: 0.015, seed: (o.seed ?? 1) * 3 }));
  // the recessed front wall under the coping (dark, grimy, streaked)
  const fw = new THREE.PlaneGeometry(o.z1 - o.z0, h - 0.25); fw.rotateY(-Math.PI / 2); fw.translate(o.x0 + 0.22, y + (h - 0.25) / 2, (o.z0 + o.z1) / 2);
  const uv = fw.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (o.z1 - o.z0), uv.getY(i) * (h - 0.25));
  setSurfAttrs(fw, () => [0, 0, 0, 0]);
  const fm = new THREE.Mesh(fw, wall); fm.receiveShadow = true; fm.castShadow = true; G.add(fm);
  G.add(await paintLines(ctx, [{ a: [o.x0 + 0.27, o.z1], b: [o.x0 + 0.27, o.z0], w: 0.1, color: [0.93, 0.93, 0.9] }], { y: () => top + 0.0 }));
  return { object: G, mats: { slab, tactile: tact, coping: cope, wall } } as Built & { mats: Record<string, SurfMaterial> };
};

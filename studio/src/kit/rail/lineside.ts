// K-K2 THE TREADMILL (STATION owner): the train stays fixed at the origin heading -Z and the lineside world scrolls past
// it toward +Z by the train's odometer dist(t) (a pure function of t). Periodic things (track, masts + catenary, troughs,
// fence, embankments, grass, poles + wires, houses) live in 200 m tiles that wrap; signals, stations and km posts sit at
// absolute odometer positions. API + frame: NOTES.md. Everything is a pure function of t; no Math.random.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { kerbMesh } from "../surfaces/ground";
import { surface } from "../surfaces/materials";
import { grass } from "../nature/grass";
import { buildTrees } from "../nature/trees";
import { bushes } from "../nature/hedge";
import { prop } from "../props/catalog";
import { treadTrack, farTrack, groundStrip, RAIL_H } from "./track";
import { ocsTile } from "./ocs";
import { signalJP, type Aspect } from "./signal";
import { poleRow } from "./poles";
import { houseRow } from "./houses";
import { tokyoPlatform, TP } from "./tokyo_platform";
import { canvasTex, flush, hash, mat, rod, syncWireU, type Parts } from "./util";

// ---------------------------------------------------------------- odometer (pure)
export type RunKnot = { t: number; v: number };
/** the train's odometer from a piecewise-linear speed profile (film s, m/s). Before the first knot / after the last the
 *  speed is held constant. dist(knots[0].t) = 0. Exact trapezoid integral: pure, monotonic while v >= 0. */
export const odometer = (knots: RunKnot[]) => {
  const K = [...knots].sort((a, b) => a.t - b.t);
  const acc: number[] = [0];
  for (let i = 1; i < K.length; i++) acc.push(acc[i - 1] + ((K[i - 1].v + K[i].v) / 2) * (K[i].t - K[i - 1].t));
  return (t: number) => {
    if (!K.length) return 0;
    if (t <= K[0].t) return K[0].v * (t - K[0].t);
    for (let i = 1; i < K.length; i++) if (t <= K[i].t) {
      const a = K[i - 1], b = K[i], u = t - a.t, dv = (b.v - a.v) / Math.max(1e-6, b.t - a.t);
      return acc[i - 1] + a.v * u + 0.5 * dv * u * u;
    }
    const L = K[K.length - 1]; return acc[K.length - 1] + L.v * (t - L.t);
  };
};

export type LinesideOpts = {
  dist: (t: number) => number;
  railTop?: number;
  tracks?: number[];
  /** `glow` = the lit lamp's minimum size as a share of the frame height (signal.ts; default HERE 0.052 = the film's
   *  hero lamp from the cab: core ~18 px, halo ~40 px at 1920, on its own dark backing), `backing` 0..1 */
  signals?: { at: number; aspect?: Aspect; num?: string; glow?: number; backing?: number }[];
  /** island platforms on our LEFT = the film's Tokyo platform (tokyo_platform.ts, lite). `noseAt` = the odometer where
   *  the train's NOSE stands when it is stopped there (the platform then runs from 14 m AHEAD of the nose to
   *  length - 14 m behind it: the cab at the far end, as in the hero set). `at` (older form) = the odometer of the
   *  platform's FRONT tip (the cab end) = noseAt + 14; the platform lies alongside and behind. */
  stations?: { noseAt?: number; at?: number; length?: number }[];
  ahead?: number; behind?: number;
  /** left bank: a grassy cutting slope rising to `bankH` m above the formation (default 2.2); right side flat */
  bankH?: number;
  /** extra house setback beyond the roads [left, right] (m) and max apartment floors [left, right] (a low sun from the
   *  side: tall blocks close to a platform shade all of it) */
  houses?: { setback?: [number, number]; maxFloors?: [number, number] };
  /** real trees per 200 m tile (0-3, default 3; they are 17 M triangles of the world before their LOD) and their LOD
   *  (NATURE buildTrees `lod`; default here near 10 m, far 30 m, minKeep 0.1: nothing stands closer than 8 m to the track) */
  trees?: number; treeLod?: { near?: number; far?: number; minKeep?: number };
  /** turn off parts (cost tests / other sets): "grass" | "trees" | "houses" | "poles" | "ocs" | "fence" */
  off?: string[];
  seed?: number;
};
export type Lineside = Built & { railTop: number; formation: number; period: number; z: (at: number, t: number) => number; mastPhase: (t: number) => number };

const PERIOD = 200, TRACK_TILE = 60;

let meshTex: THREE.Texture | null = null;
/** chain-link fence mesh (diamond wire, alpha-tested), tiles every 1 m x 1 m in metre UVs */
const meshTexture = () => (meshTex ??= (() => {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,1)"; g.lineWidth = 3;
    for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + 128, h); g.stroke(); g.beginPath(); g.moveTo(k * 32 + 128, 0); g.lineTo(k * 32, h); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); return t;
})());

/** the periodic 200 m tile (local z 0 .. -200, rail top y = 0). `far` = the cheap LOD */
const buildTile = async (ctx: KitCtx, o: { tracks: number[]; bankH: number; far: boolean; off: Set<string>; seed: number; houses?: LinesideOpts["houses"] }) => {
  const G = new THREE.Group(); G.name = o.far ? "tile-far" : "tile-near";
  const fy = -RAIL_H, xs = o.tracks, xl = Math.min(...xs), xr = Math.max(...xs), z1 = 0, z0 = -PERIOD;
  // ground: the left cutting bank (rises), the right strip (flat), gravel cess between the ballast toes
  const bankX0 = xl - 3.4, bankX1 = bankX0 - o.bankH * 2.3, topY = fy + o.bankH;
  const bankY = (x: number) => (x > bankX0 ? fy : x < bankX1 ? topY : fy + (bankX0 - x) / (bankX0 - bankX1) * o.bankH);
  const sbk = o.houses?.setback ?? [0, 0];
  G.add(await groundStrip(ctx, "lawn_soil", { rect: [bankX1 - 8, bankX0 + 0.2, z0, z1], y: (x) => bankY(x) - 0.02, coarse: o.far ? 4 : 1.0, opts: { tint: [0.3, 0.72, 0.22], sat: 1.25, res: "1k",   /* LOOK v2: a green bank (was tint [0.45, 0.66, 0.34]) */ macro: { amount: 0.25, scaleM: 7 } }, seed: o.seed }));
  // no holes: the yards under and behind both house rows (out to where the haze takes over), and the "six-foot" between
  // tracks that stand far apart (an island platform between them: seen beyond the platform ends)
  G.add(await groundStrip(ctx, "lawn_soil", { rect: [bankX1 - 46 - sbk[0], bankX1 - 7.9, z0, z1], y: topY - 0.03, coarse: 8, opts: { tint: [0.32, 0.7, 0.24], sat: 1.25, res: "1k",   /* LOOK v2 (was [0.48, 0.64, 0.38]) */ macro: { amount: 0.3, scaleM: 9 } }, seed: o.seed + 7 }));
  G.add(await groundStrip(ctx, "lawn_soil", { rect: [xr + 17.9, xr + 56 + sbk[1], z0, z1], y: fy - 0.03, coarse: 8, opts: { tint: [0.32, 0.7, 0.24], sat: 1.25, res: "1k",   /* LOOK v2 (was [0.5, 0.64, 0.38]) */ macro: { amount: 0.3, scaleM: 9 } }, seed: o.seed + 8 }));
  { const sx = [...xs].sort((a, b) => a - b);
    for (let i = 0; i < sx.length - 1; i++) if (sx[i + 1] - sx[i] > 4.4)
      G.add(await groundStrip(ctx, "gravel", { rect: [sx[i] + 1.9, sx[i + 1] - 1.9, z0, z1], y: fy - 0.012, coarse: o.far ? 5 : 1.5, opts: { tint: [0.68, 0.66, 0.63], res: "1k" }, seed: o.seed + 6 })); }
  G.add(await groundStrip(ctx, "gravel", { rect: [xl - 3.6, xl - 2.2, z0, z1], y: fy - 0.01, coarse: o.far ? 4 : 1.0, opts: { tint: [0.72, 0.7, 0.67], res: "1k" }, seed: o.seed + 1 }));
  G.add(await groundStrip(ctx, "gravel", { rect: [xr + 2.2, xr + 3.4, z0, z1], y: fy - 0.01, coarse: o.far ? 4 : 1.0, opts: { tint: [0.72, 0.7, 0.67], res: "1k" }, seed: o.seed + 2 }));
  G.add(await groundStrip(ctx, "lawn_soil", { rect: [xr + 3.4, xr + 18, z0, z1], y: fy - 0.02, coarse: o.far ? 4 : 1.2, opts: { tint: [0.47, 0.66, 0.36], res: "1k" }, seed: o.seed + 3 }));
  // a road beyond the right fence + one along the bank top (asphalt, uv-mapped so it moves)
  G.add(await groundStrip(ctx, "asphalt", { rect: [xr + 5.6, xr + 9.4, z0, z1], y: fy + 0.0, coarse: o.far ? 5 : 2, opts: { res: "1k", tint: [0.8, 0.8, 0.8] }, seed: o.seed + 4 }));
  G.add(await groundStrip(ctx, "asphalt", { rect: [bankX1 - 5.2, bankX1 - 1.2, z0, z1], y: topY + 0.005, coarse: o.far ? 5 : 2, opts: { res: "1k", tint: [0.8, 0.8, 0.8] }, seed: o.seed + 5 }));
  // overhead line
  if (!o.off.has("ocs")) G.add(await ocsTile(ctx, { tracks: xs, period: PERIOD, far: o.far, seed: o.seed, formationY: fy }));
  const P: Parts = new Map();
  if (!o.far) {
    // cable troughs (segmented concrete lids) both sides, a relay cabinet + km post per tile
    const tro = await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.74, 0.73, 0.7], wear: { edges: 1 }, dirt: { grime: 0.3, bottom: 0.6, heightM: 0.15, baseY: fy } });
    G.add(kerbMesh(tro, { from: [xl - 2.75, z1], to: [xl - 2.75, z0], w: 0.34, h: 0.16, y0: fy, len: 1.0, gap: 0.01, seed: o.seed * 3 }));
    G.add(kerbMesh(tro, { from: [xr + 2.75, z1], to: [xr + 2.75, z0], w: 0.34, h: 0.16, y0: fy, len: 1.0, gap: 0.01, seed: o.seed * 5 }));
    // fence: posts every 2.5 m + top rail + diamond mesh (both sides)
    if (!o.off.has("fence")) for (const [fx, fyy] of [[bankX1 - 0.6, topY], [xr + 5.0, fy]] as [number, number][]) {
      for (let z = z1; z > z0; z -= 2.5) rod(P, "fpost", [fx, fyy - 0.2, z], [fx, fyy + 1.8, z], 0.03, 6);
      rod(P, "fpost", [fx, fyy + 1.8, z1], [fx, fyy + 1.8, z0], 0.022, 6);
      const q = new THREE.PlaneGeometry(z1 - z0, 1.75); q.rotateY(Math.PI / 2); q.translate(fx, fyy + 0.92, (z0 + z1) / 2);
      const uv = q.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (z1 - z0) / 16, uv.getY(i) * 1.75 / 16);
      const fm = new THREE.Mesh(q, fenceMat()); fm.castShadow = true; fm.receiveShadow = true; G.add(fm);
    }
    const cab = await prop(ctx, "utility_box", { pos: [xr + 4.15, fy, -112], rotY: -Math.PI / 2 }); G.add(cab.object);
    const cab2 = await prop(ctx, "utility_box", { pos: [xl - 4.0, fy + 0.35, -31], rotY: Math.PI / 2 }); G.add(cab2.object);
  }
  if (P.size) G.add(flush(P, { fpost: mat([0.42, 0.48, 0.44], 0.55, 0.5) }, { name: "fence" }));
  // poles + wires along both roads, houses beyond
  if (!o.off.has("poles")) {
    G.add(await poleRow(ctx, { x: xr + 9.9, y: fy, z1: z1 - 7, z0: z0 - 7, side: 1, dropX: 5, far: o.far, seed: o.seed * 11 }));
    G.add(await poleRow(ctx, { x: bankX1 - 5.6, y: topY, z1: z1 - 19, z0: z0 - 19, side: -1, dropX: 5, far: o.far, seed: o.seed * 17 }));
  }
  if (!o.off.has("houses")) {
    const sb = o.houses?.setback ?? [0, 0], mf = o.houses?.maxFloors ?? [5, 5];
    G.add(await houseRow(ctx, { x: xr + 11.0 + sb[1], y: fy, z1, z0, face: -1, seed: o.seed * 23, far: o.far, blocks: 0.4, maxFloors: mf[1] }));
    G.add(await houseRow(ctx, { x: bankX1 - 6.6 - sb[0], y: topY, z1, z0, face: 1, seed: o.seed * 29, far: o.far, blocks: mf[0] > 2 ? 0.3 : 0, maxFloors: mf[0] }));
  }
  return { object: G };
};
/** per-copy vegetation (NATURE objects carry their own per-sub-frame LOD / wind updates: never cloned) */
const buildNature = async (ctx: KitCtx, o: { tracks: number[]; bankH: number; off: Set<string>; seed: number; copy: number; trees?: number; treeLod?: LinesideOpts["treeLod"] }) => {
  const G = new THREE.Group(); G.name = "tile-nature";
  const fy = -RAIL_H, xs = o.tracks, xl = Math.min(...xs), xr = Math.max(...xs), z1 = 0, z0 = -PERIOD;
  const Ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const bankX0 = xl - 3.4, bankX1 = bankX0 - o.bankH * 2.3, topY = fy + o.bankH;
  {
    // vegetation: the bank grass (on the slope: a grass field in a tilted frame), the right strip, weedy cess, shrubs, trees
    if (!o.off.has("grass")) {
      const slope = Math.atan2(o.bankH, bankX0 - bankX1), Lb = Math.hypot(o.bankH, bankX0 - bankX1);
      const gb = new THREE.Group(); gb.position.set(bankX0, fy, 0); gb.rotation.z = -slope;
      const g1 = await grass(ctx, { area: { rect: [-Lb, z0, 0, z1] }, density: 70, height: [0.06, 0.2], dry: 0.03, tint: [0.78, 1.18, 0.66], seed: o.seed + 31 });   // LOOK v2: greener (was dry 0.12, no tint)
      gb.add(g1.object); G.add(gb); if (g1.update) Ups.push(g1.update);
      const gr = new THREE.Group(); gr.position.set(0, fy - 0.02, 0);
      const g2 = await grass(ctx, { area: { rect: [xr + 3.4, z0, xr + 5.4, z1] }, density: 60, height: [0.05, 0.18], dry: 0.03, tint: [0.78, 1.18, 0.66], seed: o.seed + 37 });
      gr.add(g2.object); G.add(gr); if (g2.update) Ups.push(g2.update);
      const gt = new THREE.Group(); gt.position.set(0, topY - 0.02, 0);
      const g3 = await grass(ctx, { area: { rect: [bankX1 - 1.1, z0, bankX1, z1] }, density: 50, height: [0.06, 0.22], dry: 0.03, tint: [0.78, 1.18, 0.66], seed: o.seed + 41 });
      gt.add(g3.object); G.add(gt); if (g3.update) Ups.push(g3.update);
    }
    if (!o.off.has("trees")) {
      const pts: { pos: V3; scale?: number }[] = [];
      for (let k = 0; k < 14; k++) { const z = -7 - k * 14 - hash(o.seed + k) * 6; pts.push({ pos: [bankX1 - 0.25 + hash(k + 3) * 0.3, topY, z], scale: 0.55 + hash(k + 9) * 0.35 }); }
      for (let k = 0; k < 8; k++) { const z = -11 - k * 24 - hash(o.seed + k + 50) * 8; pts.push({ pos: [xr + 4.6, fy, z], scale: 0.5 + hash(k + 19) * 0.3 }); }
      const b = await bushes(ctx, pts, o.seed + 3); G.add(b.object); if (b.update) Ups.push(b.update);
      const lod = { near: 10, far: 30, minKeep: 0.1, ...(o.treeLod ?? {}) };
      const list = [
        { species: "small02" as const, pos: [bankX1 - 2.6, topY, -38 - o.copy * 7] as V3, height: 5.4, seed: o.seed + 1, tint: [0.92, 0.9, 0.72] as V3, lod },
        { species: "small02" as const, pos: [xr + 12.5, fy, -96 + o.copy * 5] as V3, height: 6.2, seed: o.seed + 2, tint: [0.95, 0.88, 0.7] as V3, lod },
        { species: "small02" as const, pos: [bankX1 - 3.1, topY, -151] as V3, height: 4.8, seed: o.seed + 3, lod },
      ].slice(0, Math.max(0, Math.min(3, o.trees ?? 3)));
      if (list.length) { const t = await buildTrees(ctx, list); G.add(t.object); if (t.update) Ups.push(t.update); }
    }
  }
  return { object: G, update: (t: number, cam: THREE.Camera) => Ups.forEach((f) => f(t, cam)) };
};
let fenceM: THREE.MeshStandardMaterial | null = null;
const fenceMat = () => (fenceM ??= new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.5, 0.58, 0.54, THREE.SRGBColorSpace), metalness: 0.5, roughness: 0.5, alphaMap: meshTexture(), alphaTest: 0.5, side: THREE.DoubleSide, map: null }));

const kmTex = new Map<string, THREE.Texture>();
const kmPlate = (txt: string) => { if (!kmTex.has(txt)) kmTex.set(txt, canvasTex(96, 192, (g, w, h) => {
  g.fillStyle = "#f2f1ec"; g.fillRect(0, 0, w, h); g.fillStyle = "#151517"; g.font = "bold 58px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const [a, b] = txt.split("."); g.fillText(a, w / 2, h * 0.32); g.fillText(b, w / 2, h * 0.72);
})); return kmTex.get(txt)!; };

/** the treadmill world (see NOTES.md) */
export const lineside = async (ctx: KitCtx, o: LinesideOpts): Promise<Lineside> => {
  const W = new THREE.Group(); W.name = "lineside";
  const railTop = o.railTop ?? 0, xs = o.tracks ?? [0, 3.8], ahead = o.ahead ?? 1600, behind = o.behind ?? 140, seed = o.seed ?? 1;
  const off = new Set(o.off ?? []), bankH = o.bankH ?? 2.2;
  W.position.y = railTop;
  const Ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  // 1) near track tiles (60 m, detailed, scroll mod 60) + the far track (scroll mod 0.6)
  const trackTile = new THREE.Group(); trackTile.name = "track-tile";
  for (const [i, x] of xs.entries()) trackTile.add((await treadTrack(ctx, { x, z0: -TRACK_TILE, z1: 0, seed: seed * 7 + i })).object);
  const nNear = Math.ceil(240 / TRACK_TILE), nBack = Math.max(1, Math.ceil(behind / TRACK_TILE));
  const trackCopies: { g: THREE.Object3D; k: number }[] = [];
  for (let k = -nBack; k < nNear; k++) { const c = k === 0 ? trackTile : trackTile.clone(); W.add(c); trackCopies.push({ g: c, k }); }
  // the far track hangs off the end of the near tile chain and scrolls WITH it (mod 60; 60 m = 100 sleepers): no gap, no overlap
  const farT = new THREE.Group(); for (const x of xs) farT.add(await farTrack(ctx, { x, z0: -ahead - TRACK_TILE, z1: -nNear * TRACK_TILE })); W.add(farT);
  // 2) the periodic 200 m tiles: near copies k = -1 (behind), 0, 1; far copies beyond
  const tiles: { g: THREE.Object3D; k: number; up?: (t: number, cam: THREE.Camera) => void }[] = [];
  const nFar = Math.ceil(ahead / PERIOD) + 1, nb = Math.max(1, Math.ceil(behind / PERIOD));
  const nearTile = (await buildTile(ctx, { tracks: xs, bankH, far: false, off, seed: seed * 3, houses: o.houses })).object;
  let farTile: THREE.Object3D | null = null;
  for (let k = -nb; k < nFar; k++) {
    if (k <= 1) {
      const c = k === -nb ? nearTile : nearTile.clone(); W.add(c); tiles.push({ g: c, k });
      if (k >= -1) { const n = await buildNature(ctx, { tracks: xs, bankH, off, seed: seed * 3 + (k + 2), copy: k + 2, trees: o.trees, treeLod: o.treeLod }); W.add(n.object); tiles.push({ g: n.object, k, up: n.update }); }
    } else { if (!farTile) farTile = (await buildTile(ctx, { tracks: xs, bankH, far: true, off, seed: seed * 3 + 9, houses: o.houses })).object; const c = k === 2 ? farTile : farTile.clone(); W.add(c); tiles.push({ g: c, k }); }
  }
  // 3) signals (on the LEFT of our track) and km posts at absolute odometer positions
  const sigs: { obj: THREE.Object3D; at: number; up: (t: number, cam: THREE.Camera) => void }[] = [];
  for (const [i, s] of (o.signals ?? ([{ at: 700, aspect: "G" }] as NonNullable<LinesideOpts["signals"]>)).entries()) {      // default: ONE signal 700 m out (two in line read as a double dot)
    const sg = await signalJP(ctx, { aspect: s.aspect ?? "G", num: s.num ?? String(14 + i * 2), footY: -RAIL_H, glow: s.glow ?? 0.052, backing: s.backing });
    sg.object.position.set(xs[0] - 3.0, 0, -s.at); W.add(sg.object); sigs.push({ obj: sg.object, at: s.at, up: sg.update });
  }
  const kmMat = new Map<string, THREE.MeshStandardMaterial>();
  const kmPosts: { g: THREE.Group; face: THREE.Mesh; slot: number }[] = [];
  const kmBase = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.9, 0.9, 0.86, THREE.SRGBColorSpace), roughness: 0.6 });
  const nKm = Math.ceil((ahead * 0.4 + behind) / 100) + 1;
  for (let i = 0; i < nKm; i++) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), kmBase); post.position.y = -RAIL_H + 0.45; post.castShadow = true; g.add(post);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.22), kmBase); face.position.set(0, -RAIL_H + 0.72, 0.061); g.add(face);
    g.position.x = Math.max(...xs) + 2.7; W.add(g); kmPosts.push({ g, face, slot: i });
  }
  // 4) stations: a lite island on our LEFT (canopy, benches, a vending machine, a clock), the parallel track beyond
  const stations: { g: THREE.Object3D; nose: number; len: number; up: (t: number) => void }[] = [];
  for (const st of o.stations ?? []) {
    const len = st.length ?? 220, nose = st.noseAt ?? (st.at ?? 0) - 14, g = new THREE.Group(); g.name = "station";
    // the hero frame inside our frame: platform top 1.1 m above our rail head, its track-1 edge 1.55 m left of our track
    g.position.set(xs[0] - TP.track1X, -TP.railTopY, 0);
    const tp = await tokyoPlatform(ctx, { hero: false, len, seed: seed + 5 }); g.add(tp.object);
    g.add((await treadTrack(ctx, { x: TP.track2X, z0: tp.z0 - 60, z1: tp.z1 + 60, base: tp.base, seed: seed + 77 })).object);   // track 2 beyond the island
    W.add(g); stations.push({ g, nose, len, up: tp.update });
  }
  // the scroll
  const zOf = (at: number, t: number) => -(at - o.dist(t));
  const mod = (a: number, m: number) => ((a % m) + m) % m;
  const update = (t: number, cam: THREE.Camera) => {
    syncWireU(ctx);
    const d = o.dist(t);
    const offT = mod(d, TRACK_TILE); for (const c of trackCopies) c.g.position.z = offT - c.k * TRACK_TILE;
    farT.position.z = offT;
    const off2 = mod(d, PERIOD); for (const c of tiles) c.g.position.z = off2 - c.k * PERIOD;
    for (const s of sigs) { s.obj.position.z = zOf(s.at, t); s.obj.visible = s.obj.position.z < behind && s.obj.position.z > -ahead - 50; if (s.obj.visible) s.up(t, cam); }
    for (const s of stations) { const z = zOf(s.nose, t); s.g.position.z = z; s.g.visible = z - 14 < behind + 40 && z + s.len > -ahead; if (s.g.visible) s.up(t); }
    // km posts every 100 m from the odometer: slot i shows post number floor(d/100) - 1 + i
    const k0 = Math.floor((d - behind) / 100);
    for (const p of kmPosts) {
      const n = k0 + p.slot, at = n * 100; p.g.position.z = zOf(at, t);
      const txt = `${Math.floor((12300 + at) / 1000)}.${Math.floor(((12300 + at) % 1000) / 100)}`;
      let m = kmMat.get(txt); if (!m) { m = new THREE.MeshStandardMaterial({ map: kmPlate(txt), roughness: 0.6 }); kmMat.set(txt, m); }
      p.face.material = m;
    }
    for (const c of tiles) c.up?.(t, cam);
    Ups.forEach((f) => f(t, cam));
  };
  const mastPhase = (t: number) => mod(o.dist(t), 50) / 50;
  return { object: W, update, railTop, formation: railTop - RAIL_H, period: PERIOD, z: zOf, mastPhase,
    hints: { groundAlbedo: [0.3, 0.29, 0.24] } };
};

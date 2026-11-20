// KIT / SUBWAY: a New York underground station (one side platform + two tracks), generic (no names, no logos).
// World frame: the tracks run along X; the platform top is y 0, its edge at z 0, the platform on +z (to z = depth), the
// near track (track 1) centre at z = trainZ(), a column row between the tracks, track 2, and the far track wall.
// Built from the kit: SURFACES `surface()` (concrete floor, tunnel concrete, ballast, steel) with OUR procedural
// 3 x 6 in running-bond tile and US truncated-dome textures swapped in (tex.ts), plus geometry here:
//   platform slab (saw-cut joints every 2 m, hundreds of black gum spots, stains, cracks, puddles, litter, grit),
//   0.61 m yellow detectable-warning strip (domes: POM near the lens) behind a concrete nosing, the platform front wall,
//   tile walls (dark base course, a plain coloured band at 2.3 m: NO letters), riveted dark-green I-beam columns
//   (gloss paint chipped at knee height, grime ring at the base), transverse I-beams + girders under a dark concrete
//   ceiling with conduits, clamps and junction boxes, warm lamp fixtures (rect practicals near the action, emissive
//   beyond), benches + bins (kit props), track beds (ballast, timber ties, rails, third rail + its cover board).
import * as THREE from "three";
import type { KitCtx, Practical, V3 } from "../core/ctx";
import { surface, setSurfAttrs, type SurfMaterial } from "../surfaces/materials";
import { groundMesh, farGround, rng, type Lens } from "../surfaces/ground";
import { addDecals, type DecalSpec } from "../surfaces/decals";
import { prop } from "../props/catalog";
import { kelvin } from "../core/rigs";
import { Parts, iSection, iBeam, rivets } from "./geo";
import { paintedSteel, plain, metal, emissive } from "./mats";
import { subwayTile, domeStrip, swapSurf, blobTex, zebraFace } from "./tex";

export type StationOpts = {
  /** platform extent along x, depth (z) and ceiling height above the platform */
  x0?: number; x1?: number; depth?: number; ceilY?: number;
  /** the x range near the cameras: real lights, rivets, fine meshes, decals */
  focus?: [number, number];
  colPitch?: number; colZ?: number; lens?: Lens; seed?: number;
  /** the zebra board (x, z of its centre; null = none built) */
  board?: { x: number; z?: number; y?: number } | null;
  /** lumens of the ceiling strips, kelvin */
  lumens?: number; kelvin?: number;
  /** index (in the edge row, from focus[0]) of the failing tube */
  flickerX?: number;
};
export const NY = { trackZ: -1.63, trackY: -1.32, railY: -1.1, colZB: -3.55, track2Z: -5.45, farZ: -7.4, gauge: 1.435 };

/** a wall of tiles in the plane z = const facing dir (+1 = +z), x0..x1, y0..y1, metre UVs from (x0, y0) */
const wallQuad = (x0: number, x1: number, y0: number, y1: number, z: number, dir: 1 | -1) => {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0, Math.max(1, Math.round((x1 - x0) / 4)), 1);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, x0 + uv.getX(i) * (x1 - x0), y0 + uv.getY(i) * (y1 - y0));
  if (dir < 0) { g.rotateY(Math.PI); const u2 = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < u2.count; i++) u2.setX(i, -u2.getX(i)); }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return setSurfAttrs(g, () => [0, 0, 0, 0]);
};

export const nyStation = async (ctx: KitCtx, o: StationOpts = {}) => {
  const x0 = o.x0 ?? -60, x1 = o.x1 ?? 60, D = o.depth ?? 5.6, CY = o.ceilY ?? 3.4, pitch = o.colPitch ?? 4.57, colZ = o.colZ ?? 1.75;
  const [f0, f1] = o.focus ?? [-14, 10], seed = o.seed ?? 1, R = rng(seed * 101 + 5), lens = o.lens;
  const root = new THREE.Group(); root.name = "ny-station";
  const hi = ctx.quality === "final" || ctx.quality === "final4";
  const tileRes = hi ? 1024 : 512;

  // ======================= platform floor
  const floor = await surface(ctx, "concrete_floor", { tint: [0.72, 0.7, 0.67], dirt: { grime: 0.3, edge: 0.2, joints: 0.3 }, wear: { polish: 0.35, centre: 0.4 }, macro: { amount: 0.16, scaleM: 3 }, seed });
  const fl = groundMesh(floor, { rect: [x0, x1, 0.66, D], y: 0, lens, fine: 0.25, k: 0.06, coarse: 2.0 });
  fl.receiveShadow = true; root.add(fl);
  const fDecals: DecalSpec[] = [
    { type: "puddle", at: [-pitch / 2 + 0.25, colZ + 0.55], size: [0.9, 0.55], rot: 0.3, opacity: 0.95 },
    { type: "puddle", at: [2.6, 3.0], size: [0.75, 0.5], rot: -0.4, opacity: 0.9 },
    { type: "stain", at: [-pitch / 2 + 0.1, colZ + 0.15], size: [1.0, 0.8], opacity: 0.7 },
    { type: "stain", at: [3.8, 1.2], size: [1.3, 0.7], rot: 0.8, opacity: 0.45 },
    { type: "stain", at: [-2.2, 4.6], size: [1.6, 0.9], rot: 0.2, opacity: 0.5 },
    { type: "oil", at: [-6.5, 2.6], size: [0.5, 0.35], opacity: 0.5 },
    { type: "crack", at: [1.2, 2.2], size: [1.4, 0.06], rot: 0.7, opacity: 0.8 },
    { type: "crack", at: [-4.9, 3.4], size: [1.1, 0.05], rot: -0.5, opacity: 0.8 },
    { type: "wear", at: [0, 1.6], size: [16, 1.4], opacity: 0.35 },
    { type: "stain", at: [pitch / 2, colZ], size: [0.8, 0.8], opacity: 0.6 },
    { type: "stain", at: [pitch * 1.5, colZ], size: [0.75, 0.75], opacity: 0.55 },
  ];
  addDecals(floor, fDecals);
  // the yellow detectable-warning strip (domes) + the concrete nosing at the edge
  const domes = swapSurf(await surface(ctx, "tactile_paving", { uv: "xz", tileM: 0.61, pom: { scale: 1.0, steps: 16, fadeM: 9 }, sat: 0.95, rough: 1.0, dirt: { grime: 0.3, edge: 0.2 }, wear: { polish: 0.2 }, seed: seed + 2 }), domeStrip(seed, hi ? 1024 : 512));
  domes.userData.surf.U.sDispV.value.x = 0.006; domes.userData.surf.U.sPom.value.x = 0.006 / 0.61;
  const ds = groundMesh(domes, { rect: [x0, x1, 0.05, 0.66], y: 0.003, lens, fine: 0.5, k: 0.1, coarse: 3, displace: false });
  ds.receiveShadow = true; root.add(ds);
  const nosing = await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.62, 0.6, 0.57], dirt: { grime: 0.45, edge: 0.4 }, wear: { edges: 1 }, seed: seed + 3 });
  const P0 = new Parts();
  for (let x = x0; x < x1 - 0.01; x += 1.5) P0.box("nose", x + 0.004, -0.22, -0.02, Math.min(x1, x + 1.5) - 0.004, 0.004, 0.05, 0.012);
  P0.box("edgeface", x0, -0.2, -0.03, x1, -0.02, -0.02, 0);
  const rubbing = plain([0.06, 0.05, 0.045], 0.8, 0, "rubbing");
  root.add(P0.build({ nose: nosing, edgeface: rubbing }, { name: "nosing" }));
  // saw-cut joints (dark hairlines) + gum spots + grit + litter
  const jm = plain([0.07, 0.065, 0.06], 0.9, 0, "joint", { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const PJ = new Parts();
  for (let x = Math.ceil(x0 / 2) * 2; x <= x1; x += 2) PJ.quad("j", [x - 0.003, 0.001, D - 0.02], [x + 0.003, 0.001, D - 0.02], [x + 0.003, 0.001, 0.68], [x - 0.003, 0.001, 0.68]);
  PJ.quad("j", [x0, 0.001, 3.104], [x1, 0.001, 3.104], [x1, 0.001, 3.098], [x0, 0.001, 3.098]);
  const joints = PJ.build({ j: jm }, { cast: () => false, name: "sawcuts" }); root.add(joints);
  {
    const gm = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.55, alphaMap: blobTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    gm.customProgramCacheKey = () => "subway:gum";
    const N = 2200, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), gm, N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cnt = { n: 0 };
    for (let i = 0; i < N; i++) {
      const x = f0 - 8 + (f1 - f0 + 16) * R();
      // denser near the edge (people wait there) and in front of the benches
      const zr = R(), z = zr < 0.5 ? 0.7 + 1.9 * Math.pow(R(), 1.5) : 0.7 + (D - 0.9) * R();
      const s = 0.009 + 0.017 * Math.pow(R(), 2), e = 0.75 + 0.5 * R();
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28);
      m4.compose(new THREE.Vector3(x, 0.0015, z), q, new THREE.Vector3(s * e, 1, s / e)); im.setMatrixAt(cnt.n++, m4);
    }
    im.count = cnt.n; im.receiveShadow = true; im.castShadow = false; im.renderOrder = 1; im.name = "gum"; root.add(im);
    // litter: receipts / a cup lid / wrappers (flat quads), lit
    const lit = new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
    lit.customProgramCacheKey = () => "subway:litter";
    const LP = new Parts();
    const bits: [number, number, number, number, number][] = [[1.9, 4.9, 0.07, 0.15, 0.4], [-3.2, 5.3, 0.05, 0.09, 1.1], [5.1, 2.6, 0.1, 0.06, -0.3], [-1.1, 0.95, 0.06, 0.12, 0.9], [-7.2, 4.1, 0.08, 0.08, 0.1], [3.1, 5.35, 0.21, 0.28, 0.25]];
    for (const [bx, bz, w, d, r] of bits) { const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).rotateY(r); g.translate(bx, 0.004, bz); LP.add("lit", g); }
    const lid = new THREE.CylinderGeometry(0.045, 0.047, 0.008, 18); lid.translate(-0.6, 0.004, 4.1); LP.add("lit", lid);
    root.add(LP.build({ lit }, { cast: () => false, name: "litter" }));
  }

  // ======================= walls (tiles), base course, coloured band, platform front wall
  const tileT = subwayTile(seed, tileRes);
  const tileOpts = (baseY: number) => ({ uv: "uv" as const, tileM: 1.2192, pom: { scale: 1.0, steps: 12, fadeM: 6 }, dirt: { bottom: 0.75, heightM: 0.45, baseY, grime: 0.16, streaks: 0.35 }, macro: { amount: 0.08, scaleM: 2.5 }, seed: seed + 11 });
  const tiles = swapSurf(await surface(ctx, "subway_tiles", tileOpts(0)), tileT);
  const tilesFar = swapSurf(await surface(ctx, "subway_tiles", { ...tileOpts(NY.trackY), pom: false }), tileT);
  // LOOK v2 (2026-11-20, look director): rich tile colour: a deep teal lower wall (both walls), a vivid red band, the
  // white glazed tile kept above the band (was: white everywhere, the band tint [0.62, 0.24, 0.18])
  const band = swapSurf(await surface(ctx, "subway_tiles", { ...tileOpts(0), tint: [0.85, 0.2, 0.14], pom: false, dirt: { grime: 0.1 } }), tileT);
  const tilesLow = swapSurf(await surface(ctx, "subway_tiles", { ...tileOpts(0), tint: [0.06, 0.5, 0.46], sat: 1.4 }), tileT);
  const tilesLowFar = swapSurf(await surface(ctx, "subway_tiles", { ...tileOpts(NY.trackY), tint: [0.06, 0.5, 0.46], sat: 1.4, pom: false }), tileT);
  const baseC = swapSurf(await surface(ctx, "subway_tiles", { ...tileOpts(0), tint: [0.2, 0.14, 0.11], pom: false, dirt: { grime: 0.3, bottom: 0.8, heightM: 0.2, baseY: 0 } }), tileT);
  for (const m of [tiles, tilesFar, band, baseC, tilesLow, tilesLowFar]) { m.userData.surf.U.sDispV.value.x = 0.004; m.userData.surf.U.sPom.value.x = 0.004 / 1.2192; }
  const wallMesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const w = new THREE.Mesh(g, m); w.receiveShadow = true; w.castShadow = true; w.userData.kitModule = "walls"; root.add(w); return w; };
  // back wall (behind the platform, facing -z)
  wallMesh(wallQuad(x0, x1, 0.16, 2.3, D, -1), tilesLow);
  wallMesh(wallQuad(x0, x1, 2.58, CY, D, -1), tiles);
  wallMesh(wallQuad(x0, x1, 2.3, 2.58, D - 0.004, -1), band);
  wallMesh(wallQuad(x0, x1, 0, 0.16, D - 0.006, -1), baseC);
  // far track wall (facing +z)
  wallMesh(wallQuad(x0, x1, NY.trackY, 2.3, NY.farZ, 1), tilesLowFar);
  wallMesh(wallQuad(x0, x1, 2.58, CY, NY.farZ, 1), tilesFar);
  wallMesh(wallQuad(x0, x1, 2.3, 2.58, NY.farZ + 0.004, 1), band);
  // thin dark trim lines above / below the band
  const trim = plain([0.06, 0.12, 0.09], 0.35, 0, "trim");
  const PT = new Parts();
  for (const [z, s] of [[D - 0.008, -1], [NY.farZ + 0.008, 1]] as [number, number][]) for (const y of [2.29, 2.58]) PT.box("trim", x0, y - 0.012, Math.min(z, z + s * 0.012), x1, y + 0.012, Math.max(z, z + s * 0.012), 0.003);
  root.add(PT.build({ trim }, { cast: () => false, name: "band-trim" }));
  // the platform front wall under the edge + the platform underside lip
  const tun = await surface(ctx, "tunnel_concrete", { uv: "uv", dirt: { grime: 0.6, streaks: 0.6, bottom: 0.9, heightM: 0.5, baseY: NY.trackY }, seed: seed + 4 });
  const fw = new THREE.Mesh(wallQuad(x0, x1, NY.trackY, -0.2, 0.28, -1), tun); fw.receiveShadow = true; root.add(fw);
  const lip = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 0.3).rotateX(Math.PI / 2).translate((x0 + x1) / 2, -0.2, 0.13), tun); root.add(lip);

  // ======================= track beds (rarely seen: under the train) - ballast, ties, rails, third rail + cover board
  root.add((await farGround(ctx, "ballast", [x0, x1, NY.farZ, 0.3], { tint: [0.42, 0.4, 0.38], dirt: { grime: 0.5 } }, NY.trackY)).object);
  {
    const tie = plain([0.12, 0.085, 0.06], 0.85, 0, "tie"), rail = metal([0.24, 0.17, 0.12], 0.6), head = metal([0.6, 0.6, 0.62], 0.25), board = plain([0.2, 0.17, 0.13], 0.8, 0, "coverboard");
    const PR = new Parts();
    for (const tz of [NY.trackZ, NY.track2Z]) {
      for (let x = Math.max(x0, f0 - 25); x < Math.min(x1, f1 + 25); x += 0.62) PR.box("tie", x - 0.09, NY.trackY, tz - 1.3, x + 0.09, NY.trackY + 0.16, tz + 1.3, 0.01);
      for (const s of [-1, 1]) { const rz = tz + s * NY.gauge / 2; PR.box("rail", x0, NY.trackY + 0.16, rz - 0.07, x1, NY.trackY + 0.18, rz + 0.07, 0); PR.box("rail", x0, NY.trackY + 0.18, rz - 0.01, x1, NY.railY - 0.035, rz + 0.01, 0); PR.box("head", x0, NY.railY - 0.035, rz - 0.035, x1, NY.railY, rz + 0.035, 0.006); }
      // third rail on the side away from the platform, with its cover board on brackets
      const tr = tz - NY.gauge / 2 - 0.78;
      PR.box("rail", x0, NY.railY - 0.02, tr - 0.04, x1, NY.railY + 0.08, tr + 0.04, 0.006);
      PR.box("coverboard", x0, NY.railY + 0.17, tr - 0.2, x1, NY.railY + 0.21, tr + 0.14, 0.006);
      for (let x = Math.max(x0, f0 - 25); x < Math.min(x1, f1 + 25); x += 3.0) PR.box("rail", x - 0.03, NY.trackY + 0.16, tr - 0.22, x + 0.03, NY.railY + 0.17, tr - 0.18, 0.004);
    }
    root.add(PR.build({ tie, rail, head, coverboard: board }, { name: "tracks" }));
  }

  // ======================= columns (platform row + between the tracks), beams, girders, ceiling
  const green = paintedSteel({ color: [0.11, 0.2, 0.15], rough: 0.3, chips: 0.1, band: [0.25, 0.95], bandK: 3.2, baseY: 0, grimeH: 0.22, grime: 0.75, dirt: 0.3, rust: 0.6, freq: 24, seed, key: "colA" });
  const greenB = paintedSteel({ color: [0.1, 0.18, 0.14], rough: 0.4, chips: 0.08, band: [0.3, 1.0], bandK: 1.5, baseY: NY.trackY, grimeH: 0.5, grime: 0.85, dirt: 0.5, rust: 0.7, freq: 24, seed: seed + 1, key: "colB" });
  const beamM = paintedSteel({ color: [0.1, 0.16, 0.13], rough: 0.5, chips: 0.05, baseY: 10, grimeH: 0, grime: 0, dirt: 0.75, rust: 0.6, freq: 18, seed: seed + 2, key: "beam" });
  const PC = new Parts(), rv: { p: V3; n: V3 }[] = [];
  // column lines at half a bay off x 0 (x 0 = mid-bay: the conductor's window and the board are never behind a column)
  const colXs: number[] = []; for (let x = Math.ceil((x0 - pitch / 2) / pitch) * pitch + pitch / 2; x <= x1; x += pitch) colXs.push(Math.round(x * 1000) / 1000);
  for (const cx of colXs) {
    iSection(PC, "colA", cx, colZ, 0, CY - 0.36);
    PC.box("colA", cx - 0.2, 0, colZ - 0.22, cx + 0.2, 0.025, colZ + 0.22, 0.004);                      // base plate
    iSection(PC, "colB", cx, NY.colZB, NY.trackY, CY - 0.36);
    PC.box("colB", cx - 0.22, NY.trackY, NY.colZB - 0.24, cx + 0.22, NY.trackY + 0.3, NY.colZB + 0.24, 0.01);
    // a bracket at the top of each platform column (gusset under the transverse beam)
    PC.box("colA", cx - 0.14, CY - 0.62, colZ - 0.17, cx + 0.14, CY - 0.36, colZ + 0.17, 0.004);
    if (cx >= f0 - 2 && cx <= f1 + 2) for (let y = 0.1; y < CY - 0.4; y += 0.115) for (const s of [-1, 1]) for (const ex of [-0.1, 0.1]) {
      rv.push({ p: [cx + ex, y, colZ + s * (0.15 + 0.009)], n: [0, 0, s] });
    }
    for (const bx of [-0.15, 0.15]) for (const bz of [-0.18, 0.18]) PC.cyl("colA", [cx + bx, 0.02, colZ + bz], [cx + bx, 0.05, colZ + bz], 0.018, 6);
  }
  for (const cx of colXs) iBeam(PC, "beam", "z", NY.farZ, D, cx, CY, 0.36, 0.2);
  for (const gz of [colZ, NY.colZB]) iBeam(PC, "beam", "x", x0, x1, gz, CY - 0.36, 0.3, 0.22);
  root.add(PC.build({ colA: green, colB: greenB, beam: beamM }, { name: "steel" }));
  if (rv.length) root.add(rivets(rv, green, 0.0095));
  // ceiling slab (dark concrete, soot + water stains), conduits with clamps, junction boxes
  const ceilM = await surface(ctx, "concrete_wall", { uv: "xz", tint: [0.34, 0.32, 0.3], dirt: { grime: 0.5 }, macro: { amount: 0.2, scaleM: 3 }, side: THREE.DoubleSide, seed: seed + 9 });
  addDecals(ceilM, [{ type: "stain", at: [2.6, 3.0], size: [1.1, 0.9], opacity: 0.8 }, { type: "stain", at: [-pitch, 2.3], size: [1.6, 1.0], opacity: 0.7 }, { type: "streak", at: [1.0, 4.4], size: [2.0, 0.6], opacity: 0.6 }]);
  const cg = new THREE.PlaneGeometry(x1 - x0, D - NY.farZ, 40, 4).rotateX(Math.PI / 2).translate((x0 + x1) / 2, CY, (D + NY.farZ) / 2);
  setSurfAttrs(cg, () => [0, 0, 0, 0]);
  const ceiling = new THREE.Mesh(cg, ceilM); ceiling.castShadow = true; ceiling.receiveShadow = true; root.add(ceiling);
  {
    const pipe = paintedSteel({ color: [0.36, 0.35, 0.32], rough: 0.55, chips: 0.04, baseY: 10, grimeH: 0, grime: 0, dirt: 0.8, freq: 30, seed: seed + 5, key: "pipe" });
    const PP = new Parts();
    for (const [pz, r] of [[3.05, 0.03], [3.16, 0.022], [3.25, 0.022], [-0.6, 0.045]] as [number, number][]) {
      PP.cyl("pipe", [x0, CY - 0.06 - r, pz], [x1, CY - 0.06 - r, pz], r, 10, false);
      for (let x = Math.ceil(x0 / 1.5) * 1.5; x < x1; x += 1.5) PP.box("pipe", x - 0.012, CY - 0.07 - 2 * r, pz - r - 0.01, x + 0.012, CY, pz + r + 0.01, 0.003);
    }
    for (let x = f0; x < f1; x += pitch) PP.box("pipe", x + 1.0, CY - 0.26, 2.95, x + 1.22, CY - 0.06, 3.32, 0.01);
    root.add(PP.build({ pipe }, { name: "conduits" }));
  }

  // ======================= lamp fixtures: edge row (z 0.8) + middle row (z 3.6); rect practicals near the focus
  const K = o.kelvin ?? 3200, lm = o.lumens ?? 2000;
  const housing = paintedSteel({ color: [0.78, 0.76, 0.7], rough: 0.45, chips: 0.03, baseY: 10, grimeH: 0, grime: 0, dirt: 0.55, freq: 30, seed: seed + 7, key: "lamphousing" });
  const diffOff = emissive(kelvin(K), 6.6);
  const PL = new Parts(), lamps: Practical[] = [], lampPos: V3[] = [];
  let flicker: Practical | null = null;
  const lampY = CY - 0.34;
  const rows: { z: number; xs: number[]; near: [number, number] }[] = [];
  const edge: number[] = []; for (let x = Math.ceil(x0 / 2.285) * 2.285 + 1.1425; x < x1; x += 2.285) edge.push(x);
  const mid: number[] = []; for (let x = Math.ceil(x0 / pitch) * pitch; x < x1; x += pitch) mid.push(x);
  rows.push({ z: 0.85, xs: edge, near: [f0 + 2, f1] }, { z: 3.7, xs: mid, near: [f0 + 4, f1 - 2] });
  const flickX = o.flickerX ?? -3.4275;
  const rowNear = new Map<number, number[]>();
  for (const row of rows) for (const x of row.xs) {
    PL.box("housing", x - 0.64, lampY + 0.04, row.z - 0.12, x + 0.64, lampY + 0.12, row.z + 0.12, 0.01);
    PL.box("housing", x - 0.64, lampY, row.z - 0.12, x + 0.64, lampY + 0.04, row.z - 0.1, 0.004);
    PL.box("housing", x - 0.64, lampY, row.z + 0.1, x + 0.64, lampY + 0.04, row.z + 0.12, 0.004);
    for (const rx of [-0.45, 0.45]) PL.cyl("housing", [x + rx, lampY + 0.12, row.z], [x + rx, CY, row.z], 0.008, 6);
    const isNear = x >= row.near[0] && x <= row.near[1];
    if (isNear && ctx.practical) {
      const isFlick = Math.abs(x - flickX) < 0.2 && row.z < 1;
      // LOOK v2 (2026-11-20, look director): the LIGHT BUDGET (kit/core NOTES): every fixture is glow-only; one long rect per
      // row lights the row (below). Was: a rect light per near fixture (16-18 lights: the shader compile hung)
      const p = ctx.practical({ kind: "rect", pos: [x, lampY + 0.005, row.z], target: [x, 0, row.z], size: [1.2, 0.18], kelvin: K, lumens: lm, seed: Math.round(x * 10), light: false });
      rowNear.set(row.z, [...(rowNear.get(row.z) ?? []), x]);
      root.add(p.object); lamps.push(p); lampPos.push([x, lampY - 0.05, row.z]);
      if (isFlick) flicker = p;
    } else {
      const g = new THREE.PlaneGeometry(1.2, 0.18).rotateX(Math.PI / 2); g.translate(x, lampY - 0.001, row.z); PL.add("diff", g);
    }
  }
  root.add(PL.build({ housing, diff: diffOff }, { cast: (k) => k === "housing", name: "lamps" }));
  // LOOK v2: ONE long rect light per fixture row (the length of its near fixtures, their lumens summed, no bulb)
  if (ctx.practical) for (const [z, xs] of rowNear) { const a = Math.min(...xs) - 0.6, b = Math.max(...xs) + 0.6;
    const p = ctx.practical({ kind: "rect", pos: [(a + b) / 2, lampY - 0.01, z], target: [(a + b) / 2, 0, z], size: [b - a, 0.3], kelvin: K, lumens: lm * xs.length, bulb: false, seed: 40 + Math.round(z * 10) });
    root.add(p.object); }
  // the key spot over the mark (soft shadows of people / the board / columns): hidden in the fixture nearest x 0
  const keyX = edge.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a), 1e9);
  let keySpot: Practical | null = null;
  if (ctx.practical) {
    keySpot = ctx.practical({ kind: "spot", pos: [keyX, lampY - 0.02, 0.95], target: [keyX - 0.3, 0, 1.6], kelvin: K, lumens: 1600, angle: 1.05, penumbra: 0.9, shadow: true, shadowNear: 0.15, bulb: false, seed: 5 });
    root.add(keySpot.object);
  }
  const keySpot2 = ctx.practical ? ctx.practical({ kind: "spot", pos: [keyX + 4.57, lampY - 0.02, 3.7], target: [keyX + 4.3, 0, 3.2], kelvin: K, lumens: 1500, angle: 1.1, penumbra: 0.9, shadow: true, shadowNear: 0.15, bulb: false, seed: 6 }) : null;
  if (keySpot2) root.add(keySpot2.object);

  // ======================= the zebra board (hung on two rods from the transverse beam)
  let board: THREE.Group | null = null;
  if (o.board) {
    const bx = o.board.x, bz = o.board.z ?? 0.95, by = o.board.y ?? 2.35;
    board = new THREE.Group(); board.name = "zebra-board";
    const pivotY = CY - 0.06;
    board.position.set(bx, pivotY, bz);
    const faceM = new THREE.MeshStandardMaterial({ map: zebraFace(), roughness: 0.55 }); faceM.customProgramCacheKey = () => "subway:zebra";
    const woodM = plain([0.12, 0.11, 0.1], 0.7, 0, "boardedge");
    const bg = new THREE.BoxGeometry(0.9, 0.45, 0.032);
    const bm = new THREE.Mesh(bg, [woodM, woodM, woodM, woodM, faceM, faceM]); bm.position.set(0, by - pivotY, 0); bm.castShadow = true; bm.receiveShadow = true;
    board.add(bm);
    const PB = new Parts();
    for (const rx of [-0.34, 0.34]) {
      PB.cyl("rod", [rx, 0, 0], [rx, by - pivotY + 0.225, 0], 0.007, 8);
      PB.box("rod", rx - 0.03, by - pivotY + 0.205, -0.03, rx + 0.03, by - pivotY + 0.235, 0.03, 0.003);       // the clamp on the board top
      PB.box("rod", rx - 0.04, -0.012, -0.05, rx + 0.04, 0.0, 0.05, 0.003);                                     // the hanger clamp
    }
    // the steel channel bolted to the ceiling that carries it (+ 4 anchor bolts)
    PB.box("rod", -0.55, 0.0, -0.05, 0.55, 0.06, 0.05, 0.004);
    for (const ax of [-0.5, 0.5]) for (const az of [-0.03, 0.03]) PB.cyl("rod", [ax, 0.06, az], [ax, 0.075, az], 0.009, 6);
    board.add(PB.build({ rod: metal([0.2, 0.2, 0.21], 0.45) }, { name: "board-rods" }));
    root.add(board);
  }

  // ======================= benches + bins (kit props) against the back wall / at a column
  const props: THREE.Object3D[] = [];
  for (const [bx, rot] of [[3.4, Math.PI], [5.0, Math.PI], [-6.8, Math.PI], [-8.4, Math.PI]] as [number, number][]) {
    try { const b = await prop(ctx, "bench_slats", { pos: [bx, 0, D - 0.45], rotY: rot }); root.add(b.object); props.push(b.object); } catch (e) { console.warn("subway: bench prop", e); }
  }
  for (const [bx, bz] of [[pitch / 2 + 0.42, colZ + 0.25], [-1.5 * pitch - 0.42, colZ + 0.2]] as [number, number][]) {
    try { const b = await prop(ctx, "bin", { pos: [bx, 0, bz], rotY: R() * 6 }); root.add(b.object); props.push(b.object); } catch (e) { console.warn("subway: bin prop", e); }
  }

  // ======================= the ends: dark tunnel mouths
  const dark = plain([0.015, 0.014, 0.013], 0.9, 0, "dark");
  for (const ex of [x0, x1]) { const g = new THREE.PlaneGeometry(D - NY.farZ, CY - NY.trackY).rotateY(ex < 0 ? Math.PI / 2 : -Math.PI / 2).translate(ex, (CY + NY.trackY) / 2, (D + NY.farZ) / 2); root.add(new THREE.Mesh(g, dark)); }

  root.traverse((ob) => { const m = ob as THREE.Mesh; if (m.isMesh && !m.userData.kitModule) m.userData.kitModule = "station"; });
  return {
    object: root, lamps, lampPos, flicker, keySpot, keySpot2, board, props, colXs, colZ, D, CY, keyX,
    mats: { floor, domes, tiles, tilesFar, band, ceil: ceilM, green, greenB } as Record<string, SurfMaterial | THREE.Material>,
    /** materials worth the local env reflection (gloss paint, metal) */
    envMats: [green, greenB, beamM, housing] as THREE.Material[],
  };
};
export type NyStation = Awaited<ReturnType<typeof nyStation>>;

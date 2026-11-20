// K-P5 overhead contact system for a Japanese 1,500 V DC commuter line (STATION owner): portal structures every 50 m
// (two 300 mm H-beam masts outside the outer tracks + a lattice beam across), a drop pipe + insulators + registration
// arm per track, a simple catenary per track (sagging messenger 6.1 m -> 5.55 m mid-span, LEVEL contact wire at 5.1 m
// above the rail head, zig-zag stagger +-0.2 m, droppers every 5 m), and the feeder / earth wires along the mast tops.
// Local frame: rail top y = 0 of the tracks, track centres `tracks` (x), portals at z = 0, -50, ... -(n-1)*50 inside one
// period. Pure geometry; the only motion (contact-wire bounce, feeder sway) is in the wire materials (uniforms).
import * as THREE from "three";
import type { KitCtx, V3 } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { box, boxMM, flush, hbeam, rod, cyl, mat, put, sagPts, wireGeometry, wireMaterial, wireMesh, hash, type Parts } from "./util";

export type OcsOpts = {
  tracks: number[];            // track centre x's (rail top y = 0)
  period: number;              // tile length (m), multiple of `span`
  span?: number;               // portal spacing (50 m)
  /** x of the two masts (default: outer track +- 3.35 m, outside the troughs) */
  mastX?: [number, number];
  formationY?: number;         // mast foot (default -0.59)
  far?: boolean;               // far LOD: masts + beam + 2 wires per track, no droppers / insulators
  seed?: number;
  /** skip portals whose local z is in these ranges (e.g. inside a station canopy) */
  skip?: [number, number][];
};

let paintP: Promise<THREE.Material> | null = null;
/** the shared galvanised / grey-painted steel of masts and beams (kit surface, metre UVs) */
export const mastSteel = (ctx: KitCtx) => (paintP ??= surface(ctx, "plaster", { uv: "uv", tint: [0.62, 0.63, 0.6], rough: 0.9, dirt: { bottom: 0.6, heightM: 0.8, baseY: -0.59, grime: 0.25, streaks: 0.3 }, wear: { edges: 0.6 }, metal: 0.4 }) as Promise<THREE.Material>);

export const ocsTile = async (ctx: KitCtx, o: OcsOpts) => {
  const span = o.span ?? 50, n = Math.round(o.period / span), fy = o.formationY ?? -0.59;
  const xs = [...o.tracks].sort((a, b) => a - b), x0 = o.mastX?.[0] ?? xs[0] - 3.35, x1 = o.mastX?.[1] ?? xs[xs.length - 1] + 3.35;
  const P: Parts = new Map(), W: Record<string, THREE.BufferGeometry[]> = { msg: [], cw: [], drop: [], feed: [] };
  const beamY = 7.35, top = 8.5;
  const skipped = (z: number) => (o.skip ?? []).some(([a, b]) => z >= Math.min(a, b) && z <= Math.max(a, b));
  const zs: number[] = []; for (let i = 0; i < n; i++) zs.push(-i * span);
  for (let i = 0; i < n; i++) {
    const z = zs[i]; if (skipped(z)) continue;
    // masts: H-beams on concrete footings, the flanges facing along the track
    for (const [mx, s] of [[x0, -1], [x1, 1]] as [number, number][]) {
      hbeam(P, "steel", [mx, fy + 0.25, z], top - fy - 0.25, 0.3, 0.3, 0.016, Math.PI / 2);
      boxMM(P, "conc", mx - 0.42, fy - 0.2, z - 0.42, mx + 0.42, fy + 0.25, z + 0.42, 0.03);            // footing
      box(P, "steel", [mx, fy + 0.27, z], [0.5, 0.025, 0.5], 0.004);                                     // base plate
      if (!o.far) {
        for (const [bx, bz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) cyl(P, "bolt", [mx + bx, fy + 0.28, z + bz], 0.018, 0.018, 0.07, 6);
        box(P, "steel", [mx, top + 0.02, z], [0.36, 0.03, 0.36], 0.004);                                  // cap
        // feeder brackets on the outer face, insulators
        for (const fh of [top - 0.25, top - 0.85]) {
          box(P, "steel", [mx + s * 0.45, fh, z], [0.9, 0.07, 0.07], 0.004);
          for (const ex of [0.55, 0.82]) cyl(P, "ins", [mx + s * ex, fh + 0.035, z], 0.045, 0.035, 0.16, 8);
        }
        // a numbered plate (digits only) at eye height of a track walker
        box(P, "plate", [mx - s * 0.16, fy + 2.1, z], [0.01, 0.16, 0.12], 0.002);
      }
    }
    // the lattice beam: two chords + verticals + diagonals (V-truss look), 0.55 m deep
    const L = x1 - x0;
    for (const yy of [beamY, beamY + 0.55]) for (const dz of [-0.16, 0.16]) box(P, "steel", [(x0 + x1) / 2, yy, z + dz], [L + 0.3, 0.07, 0.07], 0.004);
    const bays = Math.max(4, Math.round(L / 0.9));
    if (!o.far) for (let b = 0; b <= bays; b++) {
      const bx = x0 + (L * b) / bays;
      for (const dz of [-0.16, 0.16]) {
        rod(P, "steel", [bx, beamY, z + dz], [bx, beamY + 0.55, z + dz], 0.018, 5);
        if (b < bays) rod(P, "steel", [bx, beamY, z + dz], [x0 + (L * (b + 1)) / bays, beamY + 0.55, z + dz], 0.016, 5);
      }
    }
    // per track: drop pipe, messenger insulator, registration (pull-off) arm to the contact wire
    xs.forEach((tx, ti) => {
      const stag = ((i + ti) % 2 ? 1 : -1) * 0.2;
      rod(P, "steel", [tx + 0.35, beamY, z], [tx + 0.35, 5.55, z], 0.03, 8);
      if (!o.far) {
        cyl(P, "ins", [tx, 6.12, z], 0.05, 0.05, 0.38, 8);            // suspension insulator under the beam
        rod(P, "steel", [tx, beamY, z], [tx, 6.5, z], 0.012, 5);
        rod(P, "steel", [tx + 0.35, 5.6, z], [tx + stag, 5.13, z], 0.014, 5);   // the registration arm
        cyl(P, "ins", [tx + 0.35, 5.9, z], 0.04, 0.04, 0.25, 8);
        box(P, "clamp", [tx + stag, 5.12, z], [0.08, 0.04, 0.05], 0.004);
      }
    });
  }
  // wires: per track per span (messenger sags, contact wire level with stagger), droppers every 5 m
  const wr = (a: number) => a;
  for (let i = 0; i < n; i++) {
    const za = zs[i], zb = za - span;
    xs.forEach((tx, ti) => {
      const sa = ((i + ti) % 2 ? 1 : -1) * 0.2, sb = ((i + 1 + ti) % 2 ? 1 : -1) * 0.2;
      W.msg.push(wireGeometry(sagPts([tx, 6.1, za], [tx, 6.1, zb], 0.55, 16), 0.009, 4, 0.5));
      const cwp: V3[] = []; for (let q = 0; q <= 8; q++) { const u = q / 8; cwp.push([tx + sa + (sb - sa) * u, 5.1, za - span * u]); }
      W.cw.push(wireGeometry(cwp, 0.0065, 4, 1));
      if (!o.far) for (let d = 5; d < span; d += 5) {
        const u = d / span, my = 6.1 - 0.55 * 4 * u * (1 - u), cx = tx + sa + (sb - sa) * u;
        W.drop.push(wireGeometry([[cx, my, za - d], [cx, 5.1, za - d]], 0.0025, 3, 0));
      }
    });
    // feeders along the mast tops (both sides): long sagging spans
    for (const [mx, s] of [[x0, -1], [x1, 1]] as [number, number][]) for (const [fh, ex] of [[top - 0.25 + 0.2, 0.68], [top - 0.85 + 0.2, 0.68], [top + 0.05, 0]] as [number, number][]) {
      if (o.far && ex === 0) continue;
      W.feed.push(wireGeometry(sagPts([mx + s * ex, fh, za], [mx + s * ex, fh, zb], 0.7 + 0.2 * hash(i + fh), 14), ex === 0 ? 0.006 : 0.011, 4, 1));
    }
  }
  void wr;
  const M = {
    steel: await mastSteel(ctx), conc: await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.72, 0.71, 0.68], dirt: { grime: 0.3, bottom: 0.5, heightM: 0.3, baseY: fy } }) as THREE.Material,
    bolt: mat([0.2, 0.19, 0.17], 0.5, 0.8), ins: mat([0.42, 0.24, 0.16], 0.25, 0, { envMapIntensity: 1.3 }), clamp: mat([0.5, 0.45, 0.35], 0.4, 0.8),
    plate: mat([0.86, 0.86, 0.82], 0.5),
  };
  const G = flush(P, M, { name: "ocs", module: "rail-ocs" });
  const cwM = contactWireMaterial(), msgM = wireMaterial([0.2, 0.2, 0.2], 0.45, 0.8, "msg"), feedM = wireMaterial([0.13, 0.12, 0.11], 0.6, 0.3, "feed");
  if (W.msg.length) G.add(wireMesh(W.msg, msgM));
  if (W.cw.length) G.add(wireMesh(W.cw, cwM));
  if (W.drop.length) G.add(wireMesh(W.drop, msgM));
  if (W.feed.length) G.add(wireMesh(W.feed, feedM));
  void put;
  return G;
};

// ---------------------------------------------------------------- the contact wire: copper, with a pantograph bounce
/** shared uniforms: the bounce (s22: the wire rings gently after the pantograph has gone). Set from a set's update. */
export const BOUNCE_U = { uBA: { value: 0 }, uBT: { value: 0 }, uBZ: { value: 0 } };
let cwMat: THREE.MeshStandardMaterial | null = null;
export const contactWireMaterial = () => {
  if (cwMat) return cwMat;
  const m = wireMaterial([0.36, 0.22, 0.14], 0.35, 1.0, "cw").clone() as THREE.MeshStandardMaterial;
  const base = wireMaterial([0.36, 0.22, 0.14], 0.35, 1.0, "cw");
  const inner = base.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    inner.call(base, sh, r);
    Object.assign(sh.uniforms, BOUNCE_U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uBA;\nuniform float uBT;\nuniform float uBZ;\n")
      .replace("#include <project_vertex>", `{
        vec4 wq = modelMatrix * vec4( transformed, 1.0 );
        float dz = wq.z - uBZ;                        // distance behind the pantograph (travelling wave)
        float env = exp( -abs( dz ) * 0.025 ) * step( 0.0, uBA );
        transformed.y += uBA * env * sin( dz * 0.55 - uBT * 9.0 ) * aSway;
      }
      #include <project_vertex>`);
  };
  m.customProgramCacheKey = () => "rail:wire:contact";
  cwMat = m;
  return m;
};

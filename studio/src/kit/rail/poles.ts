// K-P26 Japanese concrete utility poles + the famous tangle of wires (STATION owner). Each pole: a tapered spun-concrete
// shaft (12 m), a cap, an HV crossarm with 3 pin insulators, an LV crossarm, every third pole a pole-mounted transformer
// can on a bracket, two black telecom cables with a closure, step bolts, a yellow-black base guard, a digit plate. Wires
// sag between poles (catenary-ish parabolas) and sway slowly (shared wire material). Rows run along Z inside one tile.
import * as THREE from "three";
import type { KitCtx } from "../core/ctx";
import { surface } from "../surfaces/materials";
import { box, canvasTex, cyl, flush, hash, mat, rod, sagPts, wireGeometry, wireMaterial, wireMesh, type Parts } from "./util";

export type PoleRowOpts = {
  /** row x, ground y at the pole feet, tile z range [z1 (near, larger) .. z0], pole spacing */
  x: number; y: number; z1: number; z0: number; spacing?: number;
  /** which way the crossarms / drops lean: +1 = toward +x */
  side?: 1 | -1;
  /** service drops toward x = side * dropX (houses) */
  dropX?: number;
  far?: boolean;
  seed?: number;
};
let guardTex: THREE.Texture | null = null;
const guard = () => (guardTex ??= canvasTex(64, 256, (g, w, h) => {
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#1d1b19" : "#b39a4a"; g.beginPath(); g.moveTo(0, i * 32 - 32); g.lineTo(w, i * 32); g.lineTo(w, i * 32 + 32); g.lineTo(0, i * 32); g.fill(); }
  g.fillStyle = "rgba(60,50,30,0.25)"; for (let i = 0; i < 400; i++) g.fillRect((i * 37) % w, (i * 91) % h, 2, 2);
}));

export const poleRow = async (ctx: KitCtx, o: PoleRowOpts) => {
  const P: Parts = new Map(), sp = o.spacing ?? 33.333, s = o.side ?? 1, y = o.y, H = 12;
  const n = Math.max(1, Math.round((o.z1 - o.z0) / sp));
  const zs: number[] = []; for (let i = 0; i < n; i++) zs.push(o.z1 - i * ((o.z1 - o.z0) / n));
  const WH: THREE.BufferGeometry[] = [], WL: THREE.BufferGeometry[] = [], WT: THREE.BufferGeometry[] = [];
  const guards: THREE.Mesh[] = [];
  const gm = new THREE.MeshStandardMaterial({ map: guard(), roughness: 0.7 });
  zs.forEach((z, i) => {
    const R = (k: number) => hash((o.seed ?? 1) * 131 + i * 17 + k);
    const x = o.x + (R(1) - 0.5) * 0.4;
    cyl(P, "conc", [x, y - 0.3, z], 0.2, 0.125, H + 0.3, 14);
    cyl(P, "cap", [x, y + H, z], 0.13, 0.11, 0.08, 12);
    if (o.far) { box(P, "steel", [x, y + H - 0.5, z], [2.0, 0.09, 0.09], 0.004); return; }
    // HV crossarm + 3 insulators, LV crossarm + 4 insulators (arms across the line = along x)
    box(P, "steel", [x, y + H - 0.55, z], [2.1, 0.09, 0.09], 0.004);
    for (const dx of [-0.9, 0, 0.9]) { cyl(P, "ins", [x + dx, y + H - 0.5, z], 0.05, 0.04, 0.17, 8); }
    rod(P, "steel", [x - 0.7, y + H - 0.55, z], [x, y + H - 1.15, z], 0.02, 4); rod(P, "steel", [x + 0.7, y + H - 0.55, z], [x, y + H - 1.15, z], 0.02, 4);
    box(P, "steel", [x, y + H - 1.7, z], [1.5, 0.08, 0.08], 0.004);
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) cyl(P, "ins2", [x + dx, y + H - 1.66, z], 0.035, 0.03, 0.1, 8);
    if (i % 3 === 1) {   // pole-mounted transformer can on its bracket + fused cutouts
      box(P, "steel", [x + s * 0.3, y + H - 3.1, z], [0.55, 0.08, 0.25], 0.004);
      cyl(P, "tx", [x + s * 0.52, y + H - 3.55, z], 0.27, 0.27, 0.95, 16);
      cyl(P, "tx", [x + s * 0.52, y + H - 2.6, z], 0.29, 0.2, 0.06, 16);
      for (const dz of [-0.12, 0.12]) cyl(P, "ins", [x + s * 0.52 + 0.08, y + H - 2.55, z + dz], 0.025, 0.02, 0.12, 6);
    }
    // telecom cables on a small bracket + a closure box on one span
    box(P, "steel", [x - s * 0.18, y + 6.9, z], [0.36, 0.05, 0.05], 0.003);
    box(P, "steel", [x - s * 0.18, y + 6.3, z], [0.36, 0.05, 0.05], 0.003);
    // step bolts (alternating from 2.4 m), a plate, the base guard sleeve
    for (let k = 0; k < 14; k++) { const a = (k % 2 ? 1 : -1) * 0.6 + Math.PI / 2; const hy = y + 2.4 + k * 0.45; rod(P, "steel", [x + Math.cos(a) * 0.15, hy, z + Math.sin(a) * 0.15], [x + Math.cos(a) * 0.32, hy, z + Math.sin(a) * 0.32], 0.012, 4); }
    box(P, "plate", [x, y + 1.9, z + 0.16], [0.14, 0.2, 0.01], 0.002);
    if (R(5) > 0.4) {
      const gg = new THREE.CylinderGeometry(0.205, 0.205, 1.6, 16, 1, true); gg.translate(x, y + 0.8, z);
      const g = new THREE.Mesh(gg, gm); g.castShadow = true; g.receiveShadow = true; guards.push(g);
    }
  });
  // wires: spans to the next pole (the last span ends at the next tile's first pole z0)
  const all = [...zs, o.z0];
  for (let i = 0; i < n; i++) {
    const za = all[i], zb = all[i + 1], R = (k: number) => hash((o.seed ?? 1) * 7 + i * 13 + k);
    for (const dx of [-0.9, 0, 0.9]) WH.push(wireGeometry(sagPts([o.x + dx, y + H - 0.42, za], [o.x + dx, y + H - 0.42, zb], 0.45 + 0.1 * R(1), 12), 0.008, 4, o.far ? 0 : 1));
    if (o.far) continue;
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) WL.push(wireGeometry(sagPts([o.x + dx, y + H - 1.6, za], [o.x + dx, y + H - 1.6, zb], 0.6 + 0.15 * R(2), 12), 0.007, 4, 1.2));
    WT.push(wireGeometry(sagPts([o.x - s * 0.3, y + 6.95, za], [o.x - s * 0.3, y + 6.95, zb], 0.9 + 0.3 * R(3), 14), 0.016, 5, 0.6));
    WT.push(wireGeometry(sagPts([o.x - s * 0.3, y + 6.35, za], [o.x - s * 0.3, y + 6.35, zb], 1.1 + 0.3 * R(4), 14), 0.022, 5, 0.5));
    // service drops toward the houses (x = side * dropX) from every other pole
    if (o.dropX && i % 2 === 0) for (const k of [0, 1]) {
      const zz = za - 4 - k * 9 * R(6);
      WL.push(wireGeometry(sagPts([o.x, y + H - 1.6, za], [o.x + s * o.dropX, y + 5.6 + k * 0.6, zz], 0.5, 10), 0.006, 3, 0.8));
    }
  }
  const M = {
    conc: await surface(ctx, "concrete_floor", { uv: "uv", tint: [0.86, 0.85, 0.82], dirt: { bottom: 0.7, heightM: 1.0, baseY: y, grime: 0.3, streaks: 0.35 } }) as THREE.Material,
    cap: mat([0.5, 0.5, 0.48], 0.7), steel: mat([0.45, 0.45, 0.43], 0.55, 0.6), ins: mat([0.82, 0.8, 0.76], 0.2), ins2: mat([0.46, 0.27, 0.18], 0.3),
    tx: mat([0.6, 0.62, 0.62], 0.45, 0.4), plate: mat([0.85, 0.85, 0.8], 0.6),
  };
  const G = flush(P, M, { name: "poles", module: "rail-poles" });
  guards.forEach((g) => G.add(g));
  G.add(wireMesh(WH, wireMaterial([0.16, 0.16, 0.16], 0.5, 0.5, "hv")));
  if (WL.length) G.add(wireMesh(WL, wireMaterial([0.09, 0.09, 0.09], 0.6, 0.2, "lv")));
  if (WT.length) G.add(wireMesh(WT, wireMaterial([0.035, 0.035, 0.04], 0.7, 0.0, "tel")));
  return G;
};

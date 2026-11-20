// THE TOKYO ISLAND PLATFORM as one reusable part (STATION owner): the layout of the film's station lives HERE, once.
// `tokyoPlatform(ctx, { hero: true })` = the film's hero set (SURFACES platform() slabs with displacement: must stand
// still); `{ hero: false }` = the same place with metre-UV surfaces that can scroll (the station the cab / car sets stop
// at on the lineside treadmill: lineside `stations: [{ noseAt }]`).
//
// FRAME ("hero frame", metres): platform top y = 0; the track-1 edge at x = 0 (our train on +x, its centre at x = 1.55,
// rail top y = -1.1); the island runs to x = -9 (the track-2 edge); the STOPPED TRAIN'S NOSE at z = 0, the train toward
// +Z, heading -Z; the platform from z = -14 (the cab end) to z = len - 14. The cab end (z < 9.5) is OPEN to the sky:
// full golden sun on car 1's front door (z = 3.6) and on the vending corner; the canopy covers z = 9.5 .. 146.
import * as THREE from "three";
import type { KitCtx, V3 } from "../core/ctx";
import { islandPlatform, islandLite, canopy, itvMonitor, poleClock, boardTex, bench, bins, benchMats, binMats, stairWell, stairMats } from "./station";
import { kiosk, ledBoard, doorMarks, stopMarker, columnKit, posterStand, lightPole } from "./furniture";
import { vendingMachine } from "./vending";
import { box, flush, mat, type Parts } from "./util";
import { DOORS_CAB, DOORS_MID } from "../vehicles/dims";
/** the door-position marks' line colour: a worn, dull green (2026-11-20; the old #2c8a62 sat under his feet in the
 *  film's frame 0 and competed with the yellow suitcase, the one focal colour) */
export const DOOR_MARK_COL = "#4a6458";

/** the layout marks (hero frame): cameras, CAST marks and the sets read these */
export const TP = {
  edgeX: 0, farEdgeX: -9, zCabEnd: -14, track1X: 1.55, track2X: -10.55, railTopY: -1.1,
  canopyZ0: 9.5, canopyZ1: 146, canopyX: [-8.4, -0.6] as [number, number], colX: -4.5,
  tactileX: [-1.1, -0.8] as [number, number],
  kiosk: { x0: -5.3, x1: -3.18, z0: 8.1, z1: 12.3 },
  /** the white vending machine under the kiosk awning (front faces -Z, toward the cab end); the red one at x - 1.04 */
  vend: [-3.72, 0, 7.69] as V3,
  /** where a customer stands (facing +Z: his back to car 1's front door) */
  vendFront: [-4.1, 0, 6.55] as V3,
  itv: [-1.7, 0, -9.0] as V3,
  stopMarker: [-0.42, 0, -0.35] as V3,
  lightPoles: [[-4.5, 0, 0.6], [-4.5, 0, -8.2]] as V3[],
  /** the starting signal stands 48 m ahead of the nose, left of track 1 (lineside `signals: [{ at: noseAt + 48 }]`) */
  signalAhead: 48,
  /** the pale neutral concrete of the slabs + the worn ochre of the tactile rows (linear tint, saturation) */
  slab: { tint: [0.92, 0.64, 0.5] as [number, number, number], sat: 1.0 },   // LOOK TEST 2026-11-20: rich warm tiles (was [0.87, 0.88, 0.89], sat 0.28)
  tactile: { tint: [0.72, 0.7, 0.66] as [number, number, number], sat: 0.42 },
};
/** every door of an n-car train standing with its nose at z = 0 (car 1 = the cab car at the -Z end) */
export const trainDoorsZ = (cars = 10) => {
  const out: { z: number; car: number; door: number }[] = [];
  for (let k = 0; k < cars; k++) (k === 0 ? DOORS_CAB : k === cars - 1 ? DOORS_CAB.map((d) => 20 - d).reverse() : DOORS_MID).forEach((d, i) => out.push({ z: 20 * k + d, car: k + 1, door: i + 1 }));
  return out;
};

export type TokyoPlatformOpts = {
  /** the film's hero set (displaced world-space slabs, every prop) or the lite scrolling copy */
  hero?: boolean;
  /** platform length (default 220: z = -14 .. 206) */
  len?: number;
  lens?: { points: [number, number][] };
  cars?: number;
  seed?: number;
};
export const tokyoPlatform = async (ctx: KitCtx, o: TokyoPlatformOpts = {}) => {
  const hero = o.hero !== false, len = o.len ?? 220, z0 = TP.zCabEnd, z1 = z0 + len, base = TP.railTopY - 0.59;
  const G = new THREE.Group(); G.name = hero ? "tokyo-platform" : "tokyo-platform-lite";
  const ups: ((t: number) => void)[] = [];
  // 1) the island: slabs, tactile rows, coping, white lines, the walls down to the track
  if (hero) {
    const isl = await islandPlatform(ctx, { xA: TP.edgeX, xB: TP.farEdgeX, z0, z1, top: 0, base, lens: o.lens, seed: o.seed ?? 3, marks: false });
    G.add(isl.object);
    for (const side of [isl.mats.A, isl.mats.B]) {
      const U = side.tactile.userData.surf.U; (U.sCol.value as THREE.Vector4).set(...TP.tactile.tint, (U.sCol.value as THREE.Vector4).w); if (U.sSat) U.sSat.value = TP.tactile.sat;
      const S = side.slab.userData.surf.U; (S.sCol.value as THREE.Vector4).set(...TP.slab.tint, (S.sCol.value as THREE.Vector4).w); if (S.sSat) S.sSat.value = TP.slab.sat;
    }
  } else G.add((await islandLite(ctx, { xA: TP.edgeX, xB: TP.farEdgeX, z0, z1, top: 0, base, slab: TP.slab, tactile: TP.tactile })).object);
  // 2) the canopy from z = 9.5 (clear polycarbonate bays = the sun stripes)
  const cz1 = Math.min(TP.canopyZ1, z1 - 20);
  const cn = await canopy(ctx, { xc: TP.colX, halfW: 3.9, top: 0, z0: TP.canopyZ0, z1: cz1, colZ: cz1 - 4, clear: (b) => b % 2 === 0, seed: 4 });
  G.add(cn.object);
  // 3) door marks at every door (digits + arrows), the driver's stop marker, light poles on the open cab end, the ITV
  G.add(doorMarks(trainDoorsZ(o.cars ?? 10).filter((d) => d.z < (hero ? 150 : 62)), { x: TP.edgeX, top: 0, color: DOOR_MARK_COL }));
  G.add(stopMarker({ pos: TP.stopMarker, num: String(o.cars ?? 10) }));
  G.add(lightPole({ pos: TP.lightPoles[0], board: boardTex("num1") })); G.add(lightPole({ pos: TP.lightPoles[1] }));
  const itv = itvMonitor({ pos: TP.itv, yaw: 0 }); G.add(itv.object); ups.push(itv.update);
  // 4) the kiosk + the two vending machines under its awning (K-P7), the recycling bins (K-P9) on its train side
  const K = TP.kiosk;
  G.add((await kiosk(ctx, { ...K, top: 0 })).object);
  const vend = await vendingMachine(ctx, { pos: TP.vend, yaw: Math.PI }), vend2 = await vendingMachine(ctx, { pos: [TP.vend[0] - 1.04, 0, TP.vend[2]], yaw: Math.PI, body: [0.72, 0.13, 0.11], seed: 2 });
  G.add(vend.object, vend2.object); ups.push(vend.update);
  // 5) benches (K-P8), the stair well, hanging pictogram boards, clocks, LED departure boards, column kit, posters
  const P: Parts = new Map();
  bins(P, [K.x1 + 0.23, 0, 10.6], 0);
  const benches: [number, number][] = hero ? [[-4.2, 0], [22.0, 0], [38.0, 0], [86.0, 0], [-4.2, Math.PI], [30.0, Math.PI], [70.0, Math.PI]] : [[-4.2, 0], [22.0, 0], [38.0, 0], [30.0, Math.PI]];
  for (const [z, yaw] of benches) bench(P, [yaw ? -5.15 : -3.85, 0, z], 4, yaw, Math.round(z));
  if (z1 > 70) stairWell(P, { x: TP.colX, z0: 50, z1: 61, top: 0 });
  const boards: { z: number; kind: "num1" | "stairs" | "exit" | "wc" }[] = hero ? [{ z: 15.3, kind: "num1" }, { z: 29.5, kind: "exit" }, { z: 45.5, kind: "stairs" }, { z: 73.5, kind: "num1" }] : [{ z: 15.3, kind: "num1" }, { z: 45.5, kind: "stairs" }];
  const bmat = new Map<string, THREE.Material>(), bm: THREE.Mesh[] = [];
  for (const b of boards) {
    box(P, "rodB", [TP.colX, 3.15, b.z - 0.55], [0.03, 0.62, 0.03], 0.005); box(P, "rodB", [TP.colX, 3.15, b.z + 0.55], [0.03, 0.62, 0.03], 0.005);
    box(P, "boardCase", [TP.colX, 2.62, b.z], [0.09, 0.46, 1.32], 0.01);
    if (!bmat.has(b.kind)) bmat.set(b.kind, new THREE.MeshStandardMaterial({ map: boardTex(b.kind), emissive: new THREE.Color(1, 1, 1), emissiveMap: boardTex(b.kind), emissiveIntensity: 0.35, roughness: 0.4 }));
    for (const s of [1, -1]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.42), bmat.get(b.kind)!); q.position.set(TP.colX + s * 0.047, 2.62, b.z); q.rotation.y = s * Math.PI / 2; q.castShadow = true; bm.push(q); }
  }
  G.add(flush(P, { rodB: mat([0.5, 0.5, 0.5], 0.4, 0.8), boardCase: mat([0.22, 0.23, 0.25], 0.4, 0.5), ...benchMats(), ...binMats(), ...stairMats() }, { name: "platform-props", module: "rail-props" }));
  bm.forEach((q) => G.add(q));
  const clocks = (hero ? [16.5, 64.5] : [16.5]).map((z) => poleClock({ pos: [TP.colX, 2.72, z], yaw: Math.PI / 2, hangTo: 3.75 }));
  clocks.forEach((c) => { G.add(c.object); ups.push(c.update); });
  const leds = [ledBoard({ pos: [-2.2, 2.78, 19.5], yaw: 0, hangTo: 3.6, seed: 1 }), ...(hero ? [ledBoard({ pos: [-6.8, 2.78, 19.5], yaw: 0, hangTo: 3.6, seed: 2 })] : [])];
  leds.forEach((c) => { G.add(c.object); ups.push(c.update); });
  G.add(columnKit(cn.cols.filter((z) => z < (hero ? 100 : 40)), { x: TP.colX, top: 0 }));
  if (hero) for (const [k, z] of [18.0, 26.0, 42.0].entries()) G.add(posterStand({ pos: [TP.colX, 0, z], yaw: Math.PI / 2, seed: k + 1 }));
  return { object: G as THREE.Object3D, update: (t: number) => { for (const u of ups) u(t); }, cols: cn.cols, z0, z1, base };
};

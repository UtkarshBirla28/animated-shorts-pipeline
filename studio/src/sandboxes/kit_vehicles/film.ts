// TRAIN sandbox film (one frame per framing): every angle a story could need of K-P1 / K-P2 / K-P3 / K-P27.
//   set "ext": the train at a plain kit platform (SURFACES platform() + railTrack, NOT the STATION set), platform on the
//              train's RIGHT (x 1.55..8), the right doors run a cycle by frame (open / closing / closed).
//   set "run": the same train as the film's cab / car sets (2 cars, car 1 = hero cab + hero interior, FLOOR at y = 0,
//              nose at z = 0) on STATION's lineside treadmill at 80 km/h (a light lineside: no houses / trees / grass).
// Render: ENTRY=src/sandboxes/kit_vehicles/index.ts COMP=KitVehicles PROPS='{"kit":{"quality":"draft"}}'
//         bash scripts/stills_locked.sh out/kit_vehicles/d_ 0,1,2 0.5      (frame ids: SHOT list at the bottom)
import * as THREE from "three";
import type { Film, KitCtx, Built, CamState, V3, ShotDef } from "../../kit/core/ctx";
import { platform, railTrack, farGround } from "../../kit/surfaces/ground";
import { trainJP } from "../../kit/vehicles/train_jp";
import { suitcase } from "../../kit/vehicles/suitcase";
import { D, DOORS_CAB } from "../../kit/vehicles/dims";
import { lineside, odometer } from "../../kit/rail/lineside";
import * as fx from "../../kit/fx";

const RT = 0.59, PT = RT + 1.1, NOSE = -30, FL = RT + D.floor;
const d1 = NOSE + DOORS_CAB[0], d2 = NOSE + DOORS_CAB[1];
// door state per frame of the "ext" set (frames 0..)
const OPEN: Record<number, number> = { 7: 0.45, 8: 0, 10: 0, 21: 0, 22: 0 };
const ext = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group();
  const lens = { points: [[2.2, d2 + 3], [3.4, d1 + 2]] as [number, number][] };
  g.add((await platform(ctx, { x0: 1.55, x1: 8, z0: -80, z1: 60, h: PT, lens })).object);
  g.add((await railTrack(ctx, { x: 0, z0: -80, z1: 60, lens })).object);
  g.add((await railTrack(ctx, { x: -3.8, z0: -80, z1: 60 })).object);
  g.add((await farGround(ctx, "ballast", [-40, 40, -300, 200], {}, -0.02)).object);
  const train = await trainJP(ctx, { cars: 3, pantographs: [2], doors: (t) => ({ side: "right", open: t * 30 >= 27.5 ? 0 : OPEN[Math.round(t * 30)] ?? 1 }), heroCars: [1] });
  train.object.position.set(0, RT, NOSE); g.add(train.object);
  const bag = await suitcase(ctx, { pos: [2.55, PT, d1 + 2.2], yaw: -0.5, handle: 1 });
  // the bag alone on the threshold of door 1 (rides with car 1: car-local, floor y = 0)
  const bag2 = await suitcase(ctx, { pos: [D.hw - 0.42, 0, DOORS_CAB[0] - 0.12], yaw: Math.PI / 2 + 0.25, handle: 1, interior: true });
  // the bag behind the closed door 2 (frame 0 of the film: it leaves with the train)
  const bag3 = await suitcase(ctx, { pos: [D.hw - 0.3, 0, DOORS_CAB[1] + 0.31], yaw: Math.PI / 2, handle: 1, interior: true });
  train.carFloor(0).add(bag2.object, bag3.object);
  g.add(bag.object);
  return { object: g, hints: { shadowCenter: [1, 0, d1], shadowExt: 18, probe: [3, PT + 1.4, d1] }, update: (t, cam) => { train.update?.(t, cam); bag.update?.(t, cam); bag2.update?.(t, cam); bag3.update?.(t, cam); } };
};
const run = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group();
  const dist = odometer([{ t: 0, v: 22 }, { t: 999, v: 22 }]);
  const world = await lineside(ctx, { dist: (t) => dist(t) + 130, railTop: -D.floor, off: ["houses", "trees", "grass", "poles"], seed: 1 });
  g.add(world.object);
  const train = await trainJP(ctx, { cars: 2, pantographs: [2], lod: "near", heroCars: [1],
    cab: { speed: () => 79, pilot: () => 1, fog: () => 0.6, brake: () => [0.05, 0.62] } });
  train.object.position.y = -D.floor; g.add(train.object);
  // the bag rolling by itself across the car toward the left door 1 (it creeps 0.5 m/s)
  const bag = await suitcase(ctx, { pos: (t) => [0.4 - 0.5 * Math.min(2.4, t), 0, DOORS_CAB[0] + 0.2], yaw: 1.2, handle: 1, interior: true });
  g.add(bag.object);
  const motes = fx.motes(ctx, { box: [[-1.35, 0.4, 0.15], [1.35, 2.15, 9]], count: 900 });
  g.add(motes.object);
  return { object: g, hints: { shadowCenter: [0.5, 0, 4], shadowExt: 14, probe: [0, 1.4, 3.5], groundAlbedo: [0.3, 0.29, 0.27] },
    update: (t, cam) => { world.update?.(t, cam); train.update?.(t, cam); bag.update?.(t, cam); motes.update?.(t, cam); } };
};
const fix = (pos: V3, look: V3, fov = 58): ((t: number) => CamState) => () => ({ pos, look, fov });
type Row = { id: string; set: "ext" | "run"; az: number; el: number; cam: (t: number) => CamState };
const E = (id: string, az: number, el: number, pos: V3, look: V3, fov?: number): Row => ({ id, set: "ext", az, el, cam: fix(pos, look, fov) });
const R = (id: string, pos: V3, look: V3, fov?: number, az = -35, el = 20): Row => ({ id, set: "run", az, el, cam: fix(pos, look, fov) });
const ROWS: Row[] = [
  /* 0 */ E("side", -60, 18, [2.15, PT + 0.55, d2 + 3.4], [1.0, PT + 1.4, d2 - 2.5], 58),
  /* 1 */ E("door", -70, 18, [4.2, PT + 1.3, d1 + 0.9], [1.2, PT + 0.95, d1 - 0.1], 52),
  /* 2 */ E("face34", -35, 20, [3.6, PT + 1.4, NOSE - 6.5], [0, RT + 2.3, NOSE + 1.5], 50),
  /* 3 */ E("bag", -70, 18, [3.5, PT + 0.8, d1 + 3.4], [2.55, PT + 0.42, d1 + 2.2], 40),
  /* 4 */ E("roof", 60, 25, [6.5, 7.5, NOSE + 14], [0, 3.8, NOSE + 24], 55),
  /* 5 */ E("faceFront", -20, 20, [-0.6, RT + 2.3, NOSE - 5.2], [0, RT + 2.25, NOSE], 46),
  /* 6 */ E("bogie", -100, 22, [-3.6, 0.95, NOSE + 6.6], [-1.3, 0.75, NOSE + 3.6], 50),
  /* 7 */ E("doorClosing", -70, 18, [3.3, PT + 1.45, d2 + 1.5], [1.45, PT + 1.3, d2], 55),
  /* 8 */ E("doorClosed", -70, 18, [3.3, PT + 1.45, d2 + 1.5], [1.45, PT + 1.3, d2], 55),
  /* 9 */ E("lamp", -70, 18, [3.4, PT + 1.6, NOSE + 13.2], [1.48, FL + D.lampY, NOSE + 11.5], 36),
  /* 10 */ E("sideFar", -60, 22, [-9.5, 2.4, NOSE - 5], [0, 2.2, NOSE + 14], 55),
  // ---- the cab + the car on the treadmill (floor y = 0, nose z = 0)
  /* 11 */ R("cabBack", [-0.28, 1.55, 2.02], [-0.72, 1.02, 0.2], 62),
  /* 12 */ R("cabDesk", [-0.78, 1.34, 1.28], [-0.8, 0.88, 0.55], 50),
  /* 13 */ R("cabWide", [1.12, 1.62, 2.0], [-0.95, 1.0, 0.45], 70),
  /* 14 */ R("cabFront", [-0.35, 1.55, -1.7], [-0.75, 1.15, 1.5], 50),
  /* 15 */ R("cabPartition", [-0.5, 1.38, 3.2], [-0.82, 1.1, 0.4], 55),
  /* 16 */ R("carAisle", [0.12, 1.5, 2.9], [0, 1.25, 12], 62, -80, 18),
  /* 17 */ R("carAisleFwd", [0.2, 1.45, 12.6], [-0.1, 1.2, 2.2], 62, -80, 18),
  /* 18 */ R("carDoor", [0.4, 1.35, 5.25], [-1.3, 0.85, 3.65], 58, -80, 18),
  /* 19 */ R("carSeat", [0.5, 1.2, 7.6], [-1.25, 0.7, 6.0], 55, -80, 18),
  /* 20 */ R("carUp", [0, 1.05, 5.6], [0.7, 2.25, 9], 68, -80, 18),
  // ---- the lead's v3 priorities
  /* 21 */ E("frame0", -70, 18, [4.6, PT + 1.25, d2 + 2.6], [1.45, PT + 0.75, d2 + 0.25], 44),            // the bag behind the closed door, from the platform
  /* 22 */ E("frame0Close", -70, 18, [3.0, PT + 1.0, d2 + 1.0], [1.45, PT + 0.6, d2 + 0.3], 44),
  /* 23 */ E("doorFromInside", -70, 18, [-0.7, FL + 1.25, d1 + 0.75], [2.6, FL + 0.55, d1 - 0.15], 60),  // the doorway from inside, out to the platform
  /* 24 */ R("wheelClose", [-0.6, 0.09, DOORS_CAB[0] + 0.65], [-0.05, 0.05, DOORS_CAB[0] + 0.25], 42, -80, 18),
  /* 25 */ R("cabThreeQ", [0.3, 1.36, 0.45], [-0.85, 1.18, 1.5], 62),                                  // the front three-quarter of the driver's seat
  /* 26 */ R("cabSignal", [-0.55, 1.52, 2.0], [-0.95, 1.38, -20], 50),                                 // behind the driver, down the track
  /* 27 */ E("rear34", -150, 20, [3.9, PT + 1.4, NOSE + 66.5], [0, RT + 2.3, NOSE + 58.5], 50),          // the rear cab face (tail lights)
  // the door order (frames 28..47 are ONE shot: the leaves met at frame 28): still 28 = the red car-side lamp still lit,
  // still 46 = the lamp out (0.35 s later)
  /* 28 */ E("lampOrder", -70, 18, [3.4, PT + 1.6, NOSE + 13.2], [1.48, FL + D.lampY - 0.5, NOSE + 11.0], 46),
];
const TAIL = 19;   // the last row runs 20 frames
const shots: ShotDef[] = ROWS.map((r, i) => ({ id: r.id, from: i, to: i + 1 + (i === ROWS.length - 1 ? TAIL : 0), set: r.set, rig: "golden", rigOpts: { sunAz: r.az, sunEl: r.el }, cam: r.cam }));
export const FILM: Film = { slug: "kit_vehicles", fps: 30, total: ROWS.length + TAIL, sets: { ext, run }, shots };

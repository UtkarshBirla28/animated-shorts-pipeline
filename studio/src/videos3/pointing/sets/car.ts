// SET 'car' of 'pointing' (TRAIN owner): inside the packed front car at evening rush. The same fixed train as the cab
// set (kit/vehicles trainJP: car 1 = the hero interior K-P3 behind the hero cab K-P2; car 2 through the gangway door),
// floor at y = 0, STATION's lineside treadmill streaming past the windows by the timetable in ./train_plan.ts, then
// standing at STATION B with the LEFT doors open (the island platform outside, people on it).
// CAST: the tourist (phone up) and the boy at the cab glass (the RIGHT partition window) with his mum, the driver
// beyond the glass, the packed car (crowdJP with the shared train rock). The yellow suitcase (K-P27) ROLLS BY ITSELF:
// it stands at his knee, creeps back when the train picks up speed (a sneaker hooks a wheel and drags it home), rolls
// forward and bumps the wall beside the boy when the train brakes, and at the second stop it is parked alone on the
// ochre strip of the left front doorway (the boy beside it, the tourist out on the platform). Life: the crowd's sway + the straps swinging with the same rock, sun stripes + mast shadows sliding
// along the car, the LCD route highlight stepping, motes in the sun stripes, the boy's breath fog, the bag's wheels.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { trainJP } from "../../../kit/vehicles/train_jp";
import { suitcase } from "../../../kit/vehicles/suitcase";
import { D } from "../../../kit/vehicles/dims";
import { CAB } from "../../../kit/vehicles/cab_jp";
import { lineside } from "../../../kit/rail/lineside";
import * as fx from "../../../kit/fx";
import { lampBeacon } from "../../../kit/vehicles/beacon";
import { PLAN, trainRun, trainDoors, swayK, greenLampAt } from "./train_plan";
import { STAGE, BAG_BEATS, BAG_YAW, bagAt, kidAt, mumAt, touristAt, setHookDrag, touristYawAt } from "./train_stage";
import { EV, cutS } from "../timeline";
// NOTE: no top-level import of ../cast, ../shots, ../film or ../words (the shots.ts -> cams.ts -> sets cycle): the cast
// is loaded inside the builder.

const Z = CAB.partitionZ, PY = STAGE.platformY;
/** marks (train frame, floor y = 0) for the cameras + the cast: the staging shared with the cab set (./train_stage.ts) */
export const CAR_MARKS = STAGE;
export { BAG_BEATS, bagAt };

export const build_car = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:car";
  const { castMember, crowdJP, rockLag, hookAt, footReach } = await import("../cast");
  // the suitcase is dragged home by the foot that hooks it (CAST's own curve)
  setHookDrag((t) => hookAt(t).drag);
  const R = trainRun();
  const world = await lineside(ctx, { dist: R.dist, railTop: -D.floor, stations: R.stations, signals: R.signals, seed: 1 });
  g.add(world.object);
  const train = await trainJP(ctx, {
    cars: 2, pantographs: [2], lod: "far", heroCars: [1], doors: trainDoors, lampDelay: PLAN.lampDelay,
    cab: { speed: (t) => R.speed(t) * 3.6, fog: (t) => 0.5 + 0.5 * Math.sin((t / 2.5) * Math.PI * 2) },
    interiorOpts: { sway: (t, lag) => rockLag(t, lag).roll / 2.2, swayK: swayK(R), blinds: 0.2 },
  });
  train.object.position.y = -D.floor;
  g.add(train.object);
  // the green lamp (seen small through the cab glass in s04): the same kit beacon as in the cab set
  const lampAt = greenLampAt(world.z, D.floor, R.signalAt);
  const beacon = lampBeacon(ctx, { pos: lampAt, corePx: 18, haloPx: 40, board: [1.7, 2.6] });
  g.add(beacon.object);
  const signalAim = (t: number): V3 => { const p = lampAt(t); return [p[0], p[1], Math.min(-30, p[2])]; };
  let yawHook = 0.68;
  // the tourist skips out on "Be right back." (EV.hopOut); the boy + mum are by the doorway once the bag is parked
  const aboard = (t: number) => t < EV.hopOut, atGlass = (t: number) => t < BAG_BEATS.toDoor1;
  const inS04 = (t: number) => t >= cutS("s04") && t < cutS("s05");
  // ---- the leads (CAST's API): at the cab glass while running; at the second stop the tourist is out on the platform
  const driver = await castMember(ctx, "driver", { pos: () => [CAB.driverSeat[0], CAB.driverSeat[1], 1.46], yaw: () => Math.PI, seated: 0.5, aim: signalAim,
    restL: () => [CAB.controller[0], CAB.controller[1] + 0.01, CAB.controller[2]], px: 900 });
  const kid = await castMember(ctx, "kid", { pos: (t) => (atGlass(t) ? kidAt(t) : CAR_MARKS.kidDoor), yaw: (t) => (atGlass(t) ? (t >= cutS("s10") ? 0.64 : Math.PI) : -Math.PI / 2 + 0.5),   // s10: turned from the glass to frown up at the tourist (three-quarter to the s10 lens)
    // s04: his ONE finger on the partition glass right in front of him (a point ON the glass), his eyes up at the
    // laughing tourist (the beats' look "to: look" in s04 / s10)
    aim: (t) => (inS04(t) ? [kidAt(t)[0], 1.04, Z + 0.005] : atGlass(t) ? signalAim(t) : [CAR_MARKS.bagDoor[0], 0.6, CAR_MARKS.bagDoor[2]]),
    look: (t) => { const p = touristAt(t); return [p[0], 1.5, p[2]]; }, glassPress: 1, px: 1300 });
  const mum = await castMember(ctx, "kid_mum", { pos: (t) => (atGlass(t) ? mumAt(t) : CAR_MARKS.mumDoor), yaw: (t) => (atGlass(t) ? Math.PI - 0.2 : -Math.PI / 2 + 0.9),
    aim: (t) => (atGlass(t) ? [STAGE.kid[0], 1.05, Z + 0.15] : [-0.4, 1.2, 9]), px: 1100 });
  const tourist = await castMember(ctx, "tourist", { pos: (t) => (aboard(t) ? touristAt(t) : CAR_MARKS.touristPlatform),
    // his heading per shot (./train_stage.ts): back to the glass for the selfie, swinging round to it, turned to his
    // phone with his right foot beside the suitcase (s05, yawHook), three-quarter to the glass, to his phone again
    yaw: (t) => (aboard(t) ? touristYawAt(t, yawHook) : Math.PI),
    // s10: his free hand on the suitcase's handle (the outline); s04: his jab stops SHORT of the glass, high, right above the boy's cap (in the profile two-shot it reads against
    // the glass instead of vanishing behind the boy's head)
    aim: (t) => (inS04(t) ? [touristAt(t)[0] + 0.05, 1.3, Z + 0.22] : t >= cutS("s10") && aboard(t) ? (() => { const b = bagAt(t); return [b[0], 1.02, b[2]] as V3; })() : aboard(t) ? [-0.75, 1.4, 1.45] : [CAR_MARKS.bagDoor[0], 0.6, CAR_MARKS.bagDoor[2]]), px: 1500 });
  for (const c of [driver, kid, mum, tourist]) g.add(c.object);
  // ---- the suitcase: it rolls on its own wheels along bagAt(t) (the casters trail, the wheels turn by the path)
  // (its wide ribbed face looks at the aisle / the left doorway the whole time: yaw -90 deg)
  const bag = await suitcase(ctx, { pos: bagAt, yaw: BAG_YAW, handle: 1, interior: true, tMax: 90 });
  g.add(bag.object);
  // s05: CAST's hook beat reaches with his RIGHT foot to a point 0.3 m to his right, 6 cm behind (his frame). Turn him
  // so that point is the suitcase's nearest wheel at the moment the foot arrives (the creep is over at EV.footHook);
  // only headings that keep his face to the s05 lens (he faces the cab end, yaw ~PI) are tried.
  // STAGE puts that wheel level with him, so his card (flat, facing the lens) can really reach it: he ends up
  // three-quarter to the aisle lens, face in view
  {
    let err = 1e9;
    for (let i = 0; i < 4; i++) { const w = bag.wheelWorld(i, EV.footHook); for (let a = Math.PI - 0.9; a < Math.PI + 0.9; a += 0.01) { const r = footReach(STAGE.touristS05, a, [w[0], 0, w[2]], "R"), e = Math.hypot(r[0] + 0.06, r[1] - 0.3); if (e < err) { err = e; yawHook = a; } } }
    if (err > 0.08) console.warn(`[car] the hook: the nearest wheel is ${(err * 100).toFixed(0)} cm from where CAST's foot reaches (yaw ${yawHook.toFixed(2)})`);
  }
  // ---- the packed car (one atlas): standing at straps along the aisle, seated on the benches. A lane stays clear from
  //      the cab glass to the left front doorway (the bag's way out)
  const S = Math.PI / 2;
  const seatL = (z: number, id: "suitA" | "suitB" | "officeMask" | "officeRead" | "salaryRead" | "grandma", seed?: number) => ({ id, pos: [-0.86, 0, z] as V3, yaw: S, seated: 0.43, seed });
  const seatR = (z: number, id: "suitA" | "suitB" | "officeMask" | "officeRead" | "salaryRead", seed?: number) => ({ id, pos: [0.86, 0, z] as V3, yaw: -S, seated: 0.43, seed });
  const crowd = await crowdJP(ctx, [
    { id: "salarySleep", pos: [-0.62, 0, 6.3], yaw: -S, strap: true },
    { id: "studentA", pos: [0.55, 0, 9.7], yaw: -S + 0.4 }, { id: "studentB", pos: [0.72, 0, 10.15], yaw: -S - 0.3 },
    { id: "mumStroller", pos: [1.05, 0, 8.3], yaw: -S - 0.6 },
    { id: "officePhone", pos: [-0.55, 0, 11.6], yaw: S, strap: true }, { id: "suitA", pos: [0.76, 0, 7.2], yaw: S, strap: true, seed: 21 },
    { id: "officeMask", pos: [0.62, 0, 12.6], yaw: S, strap: true, seed: 22 }, { id: "suitB", pos: [-0.6, 0, 13.9], yaw: -S, strap: true, seed: 23 },
    { id: "salaryRead", pos: [0.55, 0, 15.2], yaw: -S, strap: true, seed: 24 }, { id: "officeRead", pos: [-0.58, 0, 16.4], yaw: S, strap: true, seed: 25 },
    // (the lane from the aisle to the cab glass stays clear for the s02 / s10 lens at x 0.1-0.65, z 4.4-5.4; the first
    // right-hand seat stays empty: a head there filled a quarter of the s02 frame)
    { id: "officeRead", pos: [-1.0, 0, 4.05], yaw: -S + 0.4, seed: 26 }, { id: "suitB", pos: [-0.45, 0, 8.1], yaw: 0.2, strap: true, seed: 27 },
    seatL(10.6, "grandma"), seatL(5.0, "officeMask", 31), seatL(5.5, "suitB", 32), seatL(6.9, "salaryRead", 33), seatL(9.7, "suitA", 34), seatL(11.6, "officeRead", 35),
    seatL(14.6, "suitB", 36), seatL(15.6, "officeMask", 37), seatL(16.6, "suitA", 38),
    seatR(5.9, "suitA", 42), seatR(6.8, "officeMask", 43), seatR(10.4, "suitB", 44), seatR(11.4, "salaryRead", 45), seatR(12.3, "suitA", 46),
    seatR(14.7, "officeMask", 47), seatR(16.0, "suitB", 48), seatR(16.9, "officeRead", 49),
  ], { sway: true });
  g.add(crowd.object);
  // ---- people on the platform at station B (seen through the open doors + the windows)
  const walk = (x: number, z0: number, v: number) => (t: number): V3 => [x, PY, z0 + v * Math.max(0, t - PLAN.stopB)];
  const plat = await crowdJP(ctx, [
    { id: "waitA", pos: [-2.7, PY, 7.6], yaw: S }, { id: "waitB", pos: [-4.6, PY, 5.2], yaw: S + 0.3 },
    { id: "suitA", pos: walk(-4.9, 14.0, -0.3), yaw: Math.PI, seed: 61 }, { id: "officeRead", pos: walk(-5.4, -4.0, 0.28), yaw: 0, seed: 62 },
    { id: "waitC", pos: [-6.2, PY, 2.4], yaw: S * 0.75 },
  ]);
  g.add(plat.object);
  // ---- dust in the sun stripes
  const motes = fx.motes(ctx, { box: [[-1.3, 0.3, 2.3], [1.3, 2.1, 17]], count: 350 });   // LOOK v2: 1400 -> 350 (specks read as snow or lens dirt)
  g.add(motes.object); motes.object.visible = false;   // LOOK v2: no floating specks (V4_STRUCTURE rule 3)
  return {
    object: g,
    // fog 0.0035 (the lead's number) + less sun haze: the low sun is ahead, its in-scatter washed the far line out
    hints: { shadowCenter: [0.5, 0, 6], shadowExt: 14, probe: [0, 1.5, 5.5], groundAlbedo: [0.32, 0.31, 0.3], rigOpts: { fog: 0.0025, haze: 0.0002, warmth: 0.2, exposure: 0.97, contrast: 0.34, sat: 1.8, shadowSat: 1.5, hiTint: [1.015, 1.0, 0.975], loTint: [0.95, 0.99, 1.07] } },   // LOOK v2 2026-11-20 (was { fog: 0.0035, haze: 0.0005, warmth: 1.0, exposure: 0.97 })   // warmth (Block 14: grey interiors, chroma 13-16; 1.2 took the close s04 to chroma 30.4 + L* 60.5 on the gate)
    update: (t, cam) => {
      world.update?.(t, cam); train.update?.(t, cam); beacon.update?.(t, cam);
      for (const c of [driver, kid, mum, tourist]) c.update?.(t, cam);
      bag.update?.(t, cam); crowd.update?.(t, cam);
      // the platform people belong to station B's ground: they slide in with the platform on the run-in (s10) and
      // fall behind when the train leaves
      const off = R.dist(t) - R.stopAt;
      plat.object.visible = Math.abs(off) < 70;
      if (plat.object.visible) { plat.object.position.z = off; plat.update?.(t, cam); }
      motes.update?.(t, cam);
    },
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_car, MARKS_car } from "./car.cams";

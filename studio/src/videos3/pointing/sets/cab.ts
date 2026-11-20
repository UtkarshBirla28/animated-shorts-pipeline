// SET 'cab' of 'pointing' (TRAIN owner): the driver's cab of the emerald-stripe Tokyo commuter EMU at golden hour.
// The train is FIXED (kit/vehicles trainJP: car 1 with the hero cab K-P2 + the hero interior K-P3, car 2 simple) with
// its CAR FLOOR at y = 0 (rail top at -D.floor); STATION's lineside treadmill (kit/rail/lineside) scrolls the world
// past by the timetable in ./train_plan.ts (all of it from the DIRECTOR's clock ../timeline.ts) (cruise, the slow-down, the stand at station B with the left doors open,
// the doors closing in the true order: leaves meet -> car-side lamps out -> the desk's door-closed pilot lamp lights).
// CAST plays the driver (seated, left glove on the T-handle) and, beyond the partition glass on the car side, the boy
// at the RIGHT partition window with the tourist and his mum (script v3: the glove soft in front, the boy sharp behind
// the glass). The far GREEN SIGNAL carries a kit lampBeacon so it reads at phone size. Life: the track streaming, mast shadows sweeping the cab, the speedometer needle, the pocket watch's
// second hand, the LCD bars stepping, the boy's breath fog, dust motes in the windscreen sun, the platform people.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { trainJP } from "../../../kit/vehicles/train_jp";
import { D } from "../../../kit/vehicles/dims";
import { CAB } from "../../../kit/vehicles/cab_jp";
import { lineside } from "../../../kit/rail/lineside";
import * as fx from "../../../kit/fx";
import { lampBeacon } from "../../../kit/vehicles/beacon";
import { PLAN, trainRun, trainDoors, swayK, greenLampAt } from "./train_plan";
import { STAGE, BAG_YAW, bagAt, kidAt, lifted, touristAt, setHookDrag, touristYawAt } from "./train_stage";
import { FRAMES_cab } from "./cab.cams";
import { suitcase } from "../../../kit/vehicles/suitcase";
import { EV, FRAMES, cutS, S } from "../timeline";
// NOTE: no top-level import of ../cast, ../shots, ../film or ../words (the shots.ts -> cams.ts -> sets cycle): the cast
// is loaded inside the builder.

/** marks (train frame, floor y = 0) for the cameras + the cast: the staging shared with the car set (./train_stage.ts) */
export const CAB_MARKS = {
  // the driver card stands IN the seat (mid-cushion): at the seat's front edge a 3/4 lens shows an empty seat beside him
  driver: [CAB.driverSeat[0], CAB.driverSeat[1], 1.46] as V3,
  kid: STAGE.kid, tourist: STAGE.tourist, mum: STAGE.mum,
  platformY: STAGE.platformY,
};

export const build_cab = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:cab";
  const { castMember, castLiftPair, crowdJP, hookAt, lensGlove, callKAt } = await import("../cast");
  setHookDrag((t) => hookAt(t).drag);
  const R = trainRun();
  // ---- the world (STATION's treadmill): our track at x = 0, rails at -D.floor; station B where we stand
  const world = await lineside(ctx, { dist: R.dist, railTop: -D.floor, stations: R.stations, signals: R.signals, seed: 1 });
  g.add(world.object);
  // ---- the train: 2 cars (car 1 hero cab + hero interior), floor at y = 0. The pilot lamp follows the doors by itself
  const tSlow = PLAN.slow0, tStop = PLAN.slow1;
  const train = await trainJP(ctx, {
    cars: 2, pantographs: [2], lod: "near", heroCars: [1], doors: trainDoors, lampDelay: PLAN.lampDelay,
    cab: {
      speed: (t) => R.speed(t) * 3.6 + (t > tSlow && t < tStop ? 0.6 * Math.sin(t * 23) * Math.exp(-(t - tSlow) * 1.2) : 0),
      fog: (t) => 0.5 + 0.5 * Math.sin((t / 2.5) * Math.PI * 2),
      brake: (t) => (R.speed(t) < 0.05 ? [0.42, 0.62] : t > tSlow && t < tStop ? [0.16, 0.6] : [0.0, 0.62]),
      lever: (t) => (R.speed(t) < 0.05 ? -0.35 : t > tSlow && t < tStop ? -0.2 : 0.3),
    },
    interiorOpts: { swayK: swayK(R) },
  });
  train.object.position.y = -D.floor;
  g.add(train.object);
  // ---- the cast (CAST's API). The driver aims at the far signal while running, at the pilot lamp while standing
  // the green lamp he points at: a kit beacon on STATION's signal (a core of >= 18 px and a halo of >= 40 px of a
  // 1920-high frame, on a black board the haze does not lift), so it reads at phone size
  const lampAt = greenLampAt(world.z, D.floor, R.signalAt);
  const beacon = lampBeacon(ctx, { pos: lampAt, corePx: 18, haloPx: 40, board: [1.7, 2.6] });
  g.add(beacon.object);
  // CAST lands the hand ON the aim's place on screen (cast/NOTES.md): the driver's aim is a point just under and left
  // of the lamp (2 % / 4.5 % of its distance), so the glove comes up BESIDE the lamp and never covers it
  const signalAim = (t: number): V3 => { const p = lampAt(t), d = Math.max(20, -p[2]); return [p[0] - 0.02 * d, p[1] - 0.045 * d, Math.min(-20, p[2])]; };
  const tS06 = cutS("s06");
  const aimOf = (t: number): V3 => {
    // standing: the door lamp on the desk. The hand lands just beside it (his side), so the dark lens stays in view
    if (R.speed(t) < 0.05) return [CAB.pilotLamp[0] - 0.045, CAB.pilotLamp[1] - 0.03, CAB.pilotLamp[2] + 0.05];   // the tip just below-left of the lens (s21: the lamp at his fingertip, not covered)
    // s06: the glove points at the speedometer (the boy copies him), through the braking to the stop
    if (t >= tS06 && t < tStop) return [CAB.speedo[0], CAB.speedo[1], CAB.speedo[2]];
    return signalAim(t);
  };
  const driver = await castMember(ctx, "driver", {
    pos: () => CAB_MARKS.driver, yaw: () => Math.PI, seated: 0.5, aim: aimOf,
    restL: () => [CAB.controller[0], CAB.controller[1] + 0.01, CAB.controller[2]], px: 1500,
  });
  const tourist = await castMember(ctx, "tourist", { pos: touristAt, yaw: (t) => touristYawAt(t, 0.25), aim: () => [-0.75, 1.4, 1.45], px: 1100 });
  // the yellow suitcase behind the glass (the same path as in the car set): in s06 its top rolls in along the sill of
  // the right partition window and bumps the wall beside the boy
  const bag = await suitcase(ctx, { pos: bagAt, yaw: BAG_YAW, handle: 1, interior: true, tMax: 90 });
  g.add(bag.object);
  // THE LIFT (CAST's castLiftPair, T-9): in s06 mum holds the boy up at the right partition window (he is raised
  // LIFT.liftM by the call itself: KID_LIFT is 0), her head on the pair's own right (+x, the wall side = screen LEFT
  // from the cab), away from the suitcase that rolls in at the aisle half. Outside s06 he stands at the glass, she waits
  // by the left door. His card's contact shadow is off (it would float with the raised card)
  const { kid, mum } = await castLiftPair(ctx, {
    pos: kidAt, yaw: () => Math.PI, aim: aimOf, k: (t) => (lifted(t) ? 1 : 0), side: 1,
    mumPos: () => STAGE.mum, mumYaw: () => Math.PI - 0.2, mumAim: () => [STAGE.kid[0], 1.05, STAGE.kid[2]],
    kid: { glassPress: 1, px: 1200, shadow: false }, mum: { px: 900 },
  });
  // s06: THE DRIVER'S WHITE GLOVE, SOFT IN A NEAR CORNER (the lens looks back past his raised arm at the boy who copies
  // him). CAST's foreground glove card rides the arm's own curve (his second call: point, ear, snap) half a metre in
  // front of the shot's lens, low in the corner on his side; the depth of field softens it at final quality
  const s06cam = FRAMES_cab.partition(FRAMES.s06[0], FRAMES.s06[1]);
  const glove = await lensGlove(ctx, { who: "driver", k: (t) => callKAt("driver", t, 1), sizeM: 0.24, from: 0.5, pos: (t) => {
    const c = s06cam(t), f = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(f[0], f[1], f[2]) || 1;
    const fx = f[0] / n, fy = f[1] / n, fz = f[2] / n, rl = Math.hypot(fx, fz) || 1, rx = -fz / rl, rz = fx / rl;     // right = fwd x up
    const ux = -fy * rz * 1, uy = rl, uz = fy * rx;                                                                   // up = right x fwd (close enough for a small tilt)
    const a = 0.12, b = -0.29;
    return [c.pos[0] + fx * 0.5 + rx * a + ux * b, c.pos[1] + fy * 0.5 + uy * b, c.pos[2] + fz * 0.5 + rz * a + uz * b];
  } });
  g.add(glove.object);
  const riders = [kid, tourist, mum];
  for (const c of [driver, ...riders]) g.add(c.object);
  // ---- platform people at station B (through the side window / windscreen)
  const py = CAB_MARKS.platformY, walk = (x: number, z0: number, v: number) => (t: number): V3 => [x, py, z0 + v * Math.max(0, t - PLAN.stopB)];
  const plat = await crowdJP(ctx, [
    { id: "waitA", pos: [-2.6, py, 4.5], yaw: Math.PI / 2 },
    { id: "waitB", pos: [-3.4, py, 7.2], yaw: Math.PI / 2 + 0.3 },
    { id: "officeRead", pos: walk(-2.9, 1.0, 0.35), yaw: 0 },
    { id: "suitA", pos: walk(-3.8, 12.0, -0.3), yaw: Math.PI },
    { id: "waitC", pos: [-4.4, py, 2.6], yaw: Math.PI * 0.75 },
  ]);
  g.add(plat.object);
  // ---- dust motes in the windscreen sun
  const motes = fx.motes(ctx, { box: [[-1.35, 0.6, 0.15], [1.35, 2.15, 2.1]], count: 900 });
  g.add(motes.object); motes.object.visible = false;   // LOOK v2 2026-11-20: no dust motes in the cab (the audit: out-of-focus specks read as dirt on the lens)
  return {
    object: g,
    // fog 0.0035: the far line + the small green signal must read (golden's default fog hides everything past ~150 m)
    // + less sun haze: the low sun is ahead, its in-scatter washed the lamp's dark board and the far masts out
    hints: { shadowCenter: [0.5, 0, -1], shadowExt: 13, probe: [-0.3, 1.4, 1.0], groundAlbedo: [0.3, 0.29, 0.27], rigOpts: { fog: 0.0025, haze: 0.0002, warmth: 0.25, contrast: 0.34, sat: 1.8, shadowSat: 1.5, hiTint: [1.015, 1.0, 0.975], loTint: [0.95, 0.99, 1.07] } },   // LOOK v2 2026-11-20 (was { fog: 0.0035, haze: 0.0005, warmth: 1.2 })   // warmth (Block 14: the interiors read grey, chroma 12-16)
    update: (t, cam) => {
      world.update?.(t, cam);
      train.update?.(t, cam);
      beacon.update?.(t, cam);
      driver.update?.(t, cam);
      // the riders stand at the cab glass until the second stop (after it the tourist is out on the platform)
      // (s03b is HIS shot alone: the riders behind the partition glass are hidden for it)
      const inS03b = t >= S("signal") - 0.04 && t < cutS("s04");
      const aboard = t < PLAN.stopB && !inS03b;
      for (const c of riders) { c.object.visible = aboard; if (aboard) c.update?.(t, cam); }
      bag.object.visible = aboard; if (aboard) bag.update?.(t, cam);
      const inS06 = t >= cutS("s06") - 0.1 && t < cutS("s07") + 0.1;
      glove.object.visible = inS06; if (inS06) glove.update?.(t, cam);
      // the platform people belong to station B's ground: they slide in with the platform and fall behind on leaving
      const off = R.dist(t) - R.stopAt;
      plat.object.visible = Math.abs(off) < 70;
      if (plat.object.visible) { plat.object.position.z = off; plat.update?.(t, cam); }
      // no dust in s03b (his face close to the lens: near motes become big soft blobs on his face)
      motes.object.visible = false; void inS03b;   // LOOK v2 2026-11-20: no motes in any cab shot (was visible = !inS03b + motes.update: the audit read the specks as lens dirt)
    },
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_cab, MARKS_cab } from "./cab.cams";

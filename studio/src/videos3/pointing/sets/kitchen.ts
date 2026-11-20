// SET 'kitchen' of 'pointing' (owner HOME_LAB): a small flat at night (s15). Built from the SURFACES room kit + kit/home.
// Layout (metres, Y up): the flat is 3.0 (x -1.5..1.5) x 4.6 (z -2.3..2.3) x 2.5. The front door is in the front wall
// (z = 2.3) at x 0.55, hinged on its -X jamb and standing OPEN 60 deg into the hall (the POV hand holds its lever); the
// keys hang in its lock. A partition (x -0.4, z -0.5..2.3) makes the 1.85 m hall; the galley counter runs along the right
// wall (x 1.5) from z 0.7 to -1.7 with the 2-burner hob centred 2.95 m from the door (z -0.65), the sink beyond it, the
// small fridge in the far right corner, the window in the back wall (z -2.3) with the city at night outside.
// Light (rig nightPractical): the range-hood lamp (2700 K, 400 lm, shadowed: the key on the hob + knobs), the building
// corridor's light through the open door (3000 K, 600 lm, shadowed: a warm wedge across the floor), the sodium street
// lamp outside the window (2100 K glow on the curtains + ceiling), a car's headlights sweeping the ceiling once.
// Life: the keys + train charm swing (kicked when the hand lets go), the curtains breathe, the clock ticks, a moth circles
// the hood lamp (its shadow flickers on the tiles), the headlight sweep, the blinking far roof light.
/* THE BIBLE'S SPEC: briefs/v3/pointing/bible.json -> sets[kitchen] (place, ground, surfaces, props, practicals). */
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { room } from "../../../kit/surfaces/interior";
import { addDecals } from "../../../kit/surfaces/decals";
import { prop } from "../../../kit/props/catalog";
import { apartmentDoor, counterRun, gasHob, rangeHood, kettle, fridge, dishRack, coirMat, coatHook, hoodLamp, wallClock, nightCity, curtain,
  headlightSweep, moth, pbr, mesh, rboxG, merge, rng } from "../../../kit/home";
import { KITCHEN, KT, povKitchen } from "./kitchen.cams";
import { shotCam } from "../../../kit/core/camera";
/** the s15 camera on film time (the same function the shot uses) */
const CAMS_kitchen_s15 = () => shotCam(Math.round(KITCHEN.t0 * 30), Math.round((KITCHEN.t0 + KITCHEN.dur) * 30), povKitchen);

export const build_kitchen = async (ctx: KitCtx): Promise<Built> => {
  const t0 = performance.now();
  const g = new THREE.Group(); g.name = "set:kitchen";
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const add = (b: { object: THREE.Object3D; update?: (t: number, cam: THREE.Camera) => void }) => { g.add(b.object); if (b.update) ups.push(b.update); return b; };
  const K = KITCHEN;
  // ---- the room shell (SURFACES): floorboards (displaced near the POV path), plaster walls, skirting, cornice, the
  // window (frames, glazing bar, sill board), the front door opening (its own leaf hidden: ours is the steel door)
  const Rm = await room(ctx, {
    origin: [-1.5, 0, -2.3], w: 3.0, d: 4.6, h: 2.5, thick: 0.2, seed: 15,
    floor: "wood_floor", floorOpts: { tint: [0.8, 0.52, 0.32], sat: 1.0, rough: 1.15 },   // LOOK v2 (was tint [0.78, 0.7, 0.62], sat 0.6)
    wall: "plaster", wallTint: [0.55, 0.78, 0.74],   // LOOK v2: a teal wall (was cream [0.92, 0.88, 0.8])
    windows: [{ wall: "back", at: 1.65, w: 1.2, h: 1.15, sill: 1.0, curtains: false }],
    doors: [{ wall: "front", at: 0.95, w: 0.85, h: 2.0 }],
    radiator: false, bounce: 0, trimColor: [0.9, 0.87, 0.8],
    lens: { points: [[0.6, 2.2], [0.45, 1.2], [0.3, 0.3], [0.25, -0.2]] },
  });
  g.add(Rm.object);
  // hide the room kit's own (closed, panelled) front door leaf + its handle: the steel door below replaces them
  {
    const wf = Rm.object.getObjectByName("wall_front");
    // the kit merges the leaf into one "door" mesh (plain material, not the wall surface) and the handle into "metal":
    // find them by bounding box: inside the door hole (local x 0.525..1.375, y < 2.0) and in the wall body
    wf?.children.forEach((c) => {
      const m = c as THREE.Mesh; if (!m.isMesh) return;
      m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox!;
      if (bb.min.x > 0.5 && bb.max.x < 1.4 && bb.max.y <= 2.01 && bb.min.z < -0.05) m.visible = false;
    });
  }
  addDecals(Rm.mats.floor, [
    { type: "wear", at: [0.55, 1.6], size: [0.7, 1.6], opacity: 0.55 },              // the worn path from the door...
    { type: "wear", at: [0.45, 0.2], size: [0.6, 1.6], opacity: 0.5 },               // ...to the counter
    { type: "stain", at: [0.75, 2.0], size: [0.35, 0.25], opacity: 0.35 },           // scuffs by the mat
    { type: "wear", at: [0.62, -0.65], size: [0.5, 0.7], opacity: 0.45 },            // standing at the hob
  ]);
  // ---- the partition wall (the hall's left side), plastered both sides, with skirting
  {
    const wallM = Rm.mats.wall, trim = pbr({ color: [0.9, 0.87, 0.8], rough: 0.4, peel: 0.4, tile: 0.3 });
    g.add(mesh(rboxG(-0.45, 0, -0.5, -0.35, 2.5, 2.3, 0.004), wallM, true, "partition"));
    g.add(mesh(merge([rboxG(-0.35, 0, -0.5, -0.332, 0.12, 2.3, 0.003), rboxG(-0.468, 0, -0.5, -0.45, 0.12, 2.3, 0.003), rboxG(-0.468, 0, -0.518, -0.332, 0.12, -0.5, 0.003)]), trim, true, "partitionSkirting"));
    // a light switch by the door (hall side) + the entry-light switch plate
    g.add(mesh(rboxG(-0.35, 1.15, 1.95, -0.338, 1.27, 2.03, 0.003), trim, true, "switch"));
  }
  // ---- the steel front door, open 60 deg, keys in the lock
  // CAST's word clock (lazy import: module-cycle rule): the hand grips on "Ever", lets go on "check" (#3)
  let castMod: typeof import("../cast") | null = null;
  try { castMod = await import("../cast"); K.everAt = castMod.wordT("ever"); K.letGoAt = castMod.wordT("check#3"); } catch (e) { console.warn("kitchen: CAST not available", e); }
  const door = await apartmentDoor(ctx, { origin: [1.5, 0, 2.3], yaw: Math.PI, at: 0.95, w: 0.85, h: 2.0, thick: 0.2, hinge: "right",
    open: (t) => K.doorOpen(t), keys: true, keyKicks: KT.keyKicks(), seed: 5 });
  add(door);
  // YOUR hand (CAST's povHand card, loaded lazily: module-cycle rule): on the lever until it lets go, then it travels
  // with you (camera-relative, lower left) and drops out of frame as you walk
  try {
    if (!castMod) throw new Error("no CAST");
    const { povHand } = castMod;
    const camOf = CAMS_kitchen_s15();
    const lever = door.leverWorld(K.t0);
    const tmpF = new THREE.Vector3(), tmpR = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const handPos = (t: number): V3 => {
      // the card stands 0.15 m in front of the lever toward the lens (else it cuts into the leaf)
      const c0 = camOf(K.t0), tl = new THREE.Vector3(c0.pos[0] - lever.x, 0, c0.pos[2] - lever.z).normalize().multiplyScalar(0.15);
      const onLever: V3 = [lever.x + tl.x, lever.y - 0.17, lever.z + tl.z];
      const c = camOf(t), k = Math.min(1, Math.max(0, (t - K.letGo()) / 0.45)), drop = Math.min(1, Math.max(0, (t - K.letGo() - 0.5) / 0.7));
      if (k <= 0) return onLever;
      tmpF.set(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize(); tmpR.crossVectors(tmpF, up).normalize();
      const rel: V3 = [c.pos[0] + tmpF.x * 0.5 - tmpR.x * 0.2, c.pos[1] - 0.42 - 2.0 * drop * drop, c.pos[2] + tmpF.z * 0.5 - tmpR.z * 0.2];
      const e = k * k * (3 - 2 * k);
      return [onLever[0] + (rel[0] - onLever[0]) * e, onLever[1] + (rel[1] - onLever[1]) * e, onLever[2] + (rel[2] - onLever[2]) * e];
    };
    add(await povHand(ctx, { pos: handPos }));
  } catch (e) { console.warn("kitchen: CAST povHand not available", e); }
  // the building corridor outside the door: floor, far wall, ceiling, a bulkhead lamp (its light wedges into the hall)
  {
    const conc = pbr({ color: [0.55, 0.53, 0.5], rough: 0.85, peel: 0.8, tile: 0.4 });
    const paint = pbr({ color: [0.78, 0.76, 0.72], rough: 0.8, peel: 0.5, tile: 0.4 });
    g.add(mesh(rboxG(-1.5, -0.05, 2.5, 2.5, 0.0, 4.0, 0.002), conc, false, "corridorFloor"));
    g.add(mesh(rboxG(-1.5, 0, 3.9, 2.5, 2.7, 4.0, 0.002), paint, true, "corridorWall"));
    g.add(mesh(rboxG(-1.5, 2.6, 2.5, 2.5, 2.7, 4.0, 0.002), paint, true, "corridorCeiling"));
    g.add(mesh(rboxG(0.35, 2.52, 3.1, 0.75, 2.6, 3.3, 0.02), pbr({ color: [1.0, 0.95, 0.85], rough: 0.3, peel: 0, emissive: [1.0, 0.82, 0.6], emissiveI: 1.2 }), false, "bulkhead"));
    if (ctx.practical) { const p = ctx.practical({ kind: "spot", pos: [0.55, 2.48, 3.2], target: [0.45, 0, 1.0], kelvin: 3000, lumens: 600, angle: 0.95, penumbra: 0.7, shadow: true, shadowNear: 0.15, bulb: false, range: 7 }); g.add(p.object); }
  }
  g.add(coirMat().translateX(0.55).translateZ(2.02));
  { const ch = coatHook({ coat: [0.18, 0.2, 0.28], scarf: [0.8, 0.56, 0.18] }); ch.position.set(-0.335, 1.72, 1.65); ch.rotation.y = Math.PI / 2; g.add(ch); }
  // ---- the galley: counter run along the right wall (local +x -> world +z, front -> world -x)
  const run = new THREE.Group(); run.position.set(1.5, 0, -1.7); run.rotation.y = -Math.PI / 2; g.add(run);
  const C = await counterRun(ctx, { len: 2.4, hob: { x: K.hobX, w: 0.6, d: 0.5 }, sink: { x: 0.45, w: 0.5, d: 0.4 }, splashTo: 1.5,
    wallCabs: { y0: 1.5, y1: 2.2, depth: 0.33, skip: [[K.hobX - 0.36, K.hobX + 0.36]] }, doorColor: [0.78, 0.22, 0.18], seed: 9 });   // LOOK v2: red cabinet doors (was [0.83, 0.79, 0.72])
  run.add(C.object);
  const hob = await gasHob(ctx, { frontZ: 0.31, knob: (i, t) => K.knob(i, t) });
  hob.object.position.set(K.hobX, C.H, 0.31); run.add(hob.object); ups.push((t) => hob.update(t));
  const kt = kettle(); kt.position.set(K.hobX + hob.tops[1][0], C.H + hob.tops[1][1], 0.31 + hob.tops[1][2]); kt.rotation.y = 0.6; run.add(kt);
  const hood = await rangeHood(ctx, { w: 0.6, d: 0.5, chimneyTo: 0.95 });
  hood.object.position.set(K.hobX, 1.55, 0); run.add(hood.object);
  const lampW = new THREE.Vector3(...hood.lamp).add(new THREE.Vector3(K.hobX, 1.55, 0));
  run.updateMatrixWorld(true); const lampWorld = run.localToWorld(lampW.clone());
  const hobWorld = run.localToWorld(new THREE.Vector3(K.hobX, C.H, 0.32));
  const hl = hoodLamp(ctx, [lampWorld.x, lampWorld.y, lampWorld.z], [hobWorld.x - 0.05, hobWorld.y, hobWorld.z], { lumens: 400, kelvin: 2700, shadow: true });
  if (hl) g.add(hl.object);
  add(moth(ctx, { center: [lampWorld.x - 0.06, lampWorld.y - 0.16, lampWorld.z], r: 0.09, seed: 3 }));
  { const dr = dishRack(); dr.position.set(1.62, C.H, 0.33); dr.rotation.y = 0.05; run.add(dr); }
  run.add((await prop(ctx, "tea_set", { pos: [2.1, C.H, 0.3], rotY: 0.4 })).object);
  // crumbs by the hob (tiny irregular bits on the worktop)
  {
    const R = rng(77), cg = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.0025, 0), pbr({ color: [0.75, 0.6, 0.38], rough: 0.9, peel: 0 }), 26);
    for (let i = 0; i < 26; i++) { const m = new THREE.Matrix4().compose(new THREE.Vector3(K.hobX + 0.36 + R() * 0.2, C.H + 0.0015, 0.45 + R() * 0.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)), new THREE.Vector3(1, 0.5 + R() * 0.6, 0.6 + R())); cg.setMatrixAt(i, m); }
    cg.castShadow = false; run.add(cg);
  }
  // ---- the fridge in the far corner (front to the hall) + the wall clock above it (on the back wall: visible down the hall)
  { const fr = fridge({ h: 1.28, seed: 23 }); fr.position.set(1.2, 0, -2.0); fr.rotation.y = -Math.PI / 2; g.add(fr); }
  add(await wallClock(ctx, { pos: [1.18, 1.82, -2.3 + 0.005], yaw: 0, radius: 0.15, rim: [0.2, 0.2, 0.22] }));
  // ---- the window: animated curtains (one fabric panel drawn to the left, a sheer over the right half), a herb pot on
  // the sill, the city at night outside + the street lamp's glow, a car's headlight sweep across the ceiling
  add(curtain(ctx, { top: [-0.48, 2.3, -2.19], yaw: 0, w: 0.55, h: 1.6, color: [0.55, 0.42, 0.3], pleats: 6, amp: 0.02, hz: 0.2, gusts: [K.t0 + 1.0], seed: 2 }));
  add(curtain(ctx, { top: [0.48, 2.3, -2.2], yaw: 0, w: 0.75, h: 1.45, sheer: true, color: [0.96, 0.94, 0.9], pleats: 9, amp: 0.026, hz: 0.24, gusts: [K.t0 + 1.0], seed: 5 }));
  g.add((await prop(ctx, "potted", { pos: [-0.2, 1.0, -2.31], scale: 0.3, contact: 0.3 })).object);
  add(nightCity(ctx, { window: [0.15, 1.575, -2.5], out: [0, 0, -1], lamp: { out: 3.0, down: 1.1, side: 1.2 }, seed: 52 }));
  if (ctx.practical) {
    const sl = ctx.practical({ kind: "spot", pos: [1.0, 0.4, -4.2], target: [0.1, 2.5, -1.95], kelvin: 2100, lumens: 1100, angle: 0.32, penumbra: 0.9, shadow: false, bulb: false, range: 7 });
    g.add(sl.object);
  }
  add(headlightSweep(ctx, { from: [0.4, 0.6, -5.5], ceilingY: 2.5, path: [[-1.2, 2.5, -2.0], [1.0, 2.5, 0.6]], passes: [{ t: K.t0 + 1.7, dur: 1.4 }], kelvin: 4300, lumens: 7000 }));
  const ms = performance.now() - t0;
  console.warn(`kit set "kitchen" (HOME_LAB) built in ${ms.toFixed(0)} ms`);
  console.warn(`kitchen cues ${JSON.stringify({ t0: +K.t0.toFixed(3), dur: +K.dur.toFixed(3), ever: +K.everAt.toFixed(3), letGo: +K.letGo().toFixed(3), sweep: +(K.t0 + 1.7).toFixed(3) })}`);
  return {
    object: g,
    hints: { shadowCenter: [0.5, 0, 0.2], shadowExt: 4, probe: [0.4, 1.3, 0.4], groundAlbedo: [0.3, 0.24, 0.18] },
    update: (t, cam) => { Rm.update?.(t, cam); for (const u of ups) u(t, cam); },
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_kitchen, MARKS_kitchen } from "./kitchen.cams";
/** world points other owners need (CAST's pov hand on the lever, SOUND cues) */
export const KITCHEN_POINTS: Record<string, V3> = { lever: [0.52, 1.0, 1.62], knobs: [0.85, 0.77, -0.65], hoodLamp: [1.11, 1.52, -0.65], clock: [1.18, 1.82, -2.29] };

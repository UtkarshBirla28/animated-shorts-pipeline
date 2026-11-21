// TODAY'S TRAIN for the v4 film (owner TRAIN): the shared build of the 'cab' (v20) and 'car' (v21) v4 entries. The
// emerald-stripe commuter EMU (kit/vehicles trainJP: car 1 = the hero cab + the hero interior) runs at a steady
// cruise through STATION's lineside treadmill (kit/rail/lineside); ONE green signal stands ahead of the nose so that it
// is in view through the windscreen from the v20 cut to past the v21 shout (its place is computed from the v4 clock: a
// re-timed voice moves it by itself). The driver (cap, white gloves) and the kid act CAST's v4 beats (cast/beats_v4.ts).
// Frame: the car floor at y = 0, rail top at -D.floor, the train runs toward -Z, the driver on the LEFT.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../../kit/core/ctx";
import { trainJP } from "../../../../kit/vehicles/train_jp";
import { D } from "../../../../kit/vehicles/dims";
import { CAB } from "../../../../kit/vehicles/cab_jp";
import { lineside, odometer } from "../../../../kit/rail/lineside";
import { lampBeacon } from "../../../../kit/vehicles/beacon";
import type { Beat } from "../../cast/moves";
import { R_V4 } from "../resolver";
import { FRAMES, cutS, cutE } from "../timeline";

/** the run: a steady 68 km/h; the green signal stands LEAD m ahead of the nose on the v20 cut (it passes ~1 s after v21) */
export const TODAY = { speed: 19, lead: 70 };   // (r2b: at 48 m the right-hand signal grew out of the frame's top-right corner by mid-shot: it ends ~45 m away now)   // (audit r1: the signal ahead must read as a real signal head: 82 -> 48 m)
const t20 = () => (FRAMES.v20 ? cutS("v20") : 0);
export const todayRun = () => {
  const dist = odometer([{ t: 0, v: TODAY.speed }, { t: 999, v: TODAY.speed }]);
  const signalAt = dist(t20()) + TODAY.lead;
  return { dist, signalAt, speed: () => TODAY.speed };
};
/** the green lamp of the signal (STATION's signalJP: mast 3.0 m left, head 0.78 m in, green = the top lamp 5.04 m up) */
/** (R2b, 09:30) the signal ahead stands on the RIGHT of the track for the inside v20: the lens behind-right of the driver
 *  sees his face in profile (he turns toward it) with the signal beyond his glove on the right third. +1 = right */
export const SIGNAL_SIDE = 1;
export const lampOf = (R: ReturnType<typeof todayRun>) => (t: number): V3 => [SIGNAL_SIDE * 2.22, -D.floor + 5.04, -(R.signalAt - R.dist(t)) + 0.1];
/** where a hand points: just under-left of the lamp (CAST lands the hand on the aim's place on screen: never covers it) */
export const aimOf = (R: ReturnType<typeof todayRun>) => (t: number): V3 => { const p = lampOf(R)(t), d = Math.max(20, -p[2]); return [p[0] - SIGNAL_SIDE * 0.02 * d, p[1] + (SIGNAL_SIDE > 0 ? 0.035 : -0.045) * d, Math.min(-20, p[2])]; };   // (r2b: right-hand signal: the arm a touch UP, the glove on the bright windscreen above the desk)
/** (R2b) inside: turned toward the right-hand signal: his face in profile to the lens behind-right of him */
export const DRIVER_YAW = Math.PI - 1.1;
export const DRIVER_AT: V3 = [CAB.driverSeat[0], CAB.driverSeat[1], 1.46];
/** the kid at the LEFT partition window, right behind the driver (the classic picture: a small fan copying him) */
export const KID_AT: V3 = [-1.06, 0, CAB.partitionZ + 0.22];   // (pass 3: 11 cm further left, clear of the driver's raised glove)   // the left part of the window: his hand clear of the door post, the driver beyond him to the right
/** (lead round 4: "a brown blob of hair from behind"): the kid turned three-quarter toward the v21 lens (behind-right
 *  of him in the car), so his FACE reads, while his raised arm goes up-right toward the glass + the driver beyond it */
export const KID_YAW = 1.2;
/** v20 inside (audit r1): from behind his right shoulder the world aim ran into the picture (the arm hid in his back):
 *  his RIGHT arm out across the bright windscreen, up-right toward the signal head in the right pane */
export const INSIDE_AIM: [number, number] = [1.25, -1.25];   // (pass 14: at [1.55, -0.7] the glove stopped over the desk + under the caption band: up into the windscreen glass)
/** v21's screen directions (head heights from the chest, - y = up): the driver's point over the kid's window, the kid's
 *  raised copy toward him */
export const CAR_AIM = { driver: [-0.85, -1.0] as [number, number], /** CAST's `fwd` [ahead, down] */ kid: [1.05, -0.6] as [number, number] };   // (cold f1040 / f1056: up-left his glove met the kid's hand over the kid's head: the driver's arm now goes UP over his own shoulder, the kid's copy lower)

/** THE CAR'S COLOURS (v21; LOOK's cold check 18h: the car read pale mint-grey). Values for LOOK to tune (or move into
 *  v4/look.ts): warm walls, red seats, orange rings on blue straps, an orange partition face, a teal cab door */
export const CAR_COLORS = {
  interior: { lam: "#ffd166", seat: "#e4472b", seatP: "#2f8fff", ringW: "#ff9f1c", ringO: "#ffd23a", belt: "#2b6fd6" },
  carFace: "#ff8c42", doorPanel: "#1fa38c",
};
type Opts = { lod: "near" | "far"; kid: boolean; crowd: boolean; name: string;
  /** the cab partition cut away in this shot (a lens just behind the driver in the car: v20) */ cutaway?: string;
  /** THE SIDE-ON EXTERIOR v20 (the lead's comparison): a station-approach glide (SIDE.speed), the driver moved into the
   *  crew window (seated, profile from outside), a short lineside signal a metre ahead of the nose whose lit GREEN
   *  face is turned toward the trackside lens, gliding toward us at the train's speed */ sideOn?: boolean };
/** the side-on version's numbers (train frame: car floor y 0, the nose at z 0, our LEFT side x < 0) */
export const SIDE = {
  speed: 0.05,                        // m/s: a creeping glide (lead 02:15: the lamp must stay a gap ahead of his glove: it moves ~9 cm in the shot)
  driver: [-1.12, CAB.driverSeat[1], 1.12] as V3,  // (lead 02:15) close to the glass (his card was 0.65 m inside the body: small + dark), toward the rear of the pane
  /** the crew window widened into one clear pane for this shot (train + cab kit option) */
  crewWindow: [0.5, 1.42, 0.72] as [number, number, number],   // (FIX R1: the sill 26 cm lower: the glove sat on the old sill line)
  /** FIX R1 ("the world must move"): the world behind him slides at this speed while the lamp creeps at `speed` (the
   *  lamp's post foot is below the frame: no slip shows) */
  worldSpeed: 2.5,
  /** the signal's mast foot (rail level) and the green lamp height above the car floor, on the v20 cut */
  post: [-2.0, -D.floor, 0.3] as V3, lampY: 1.5,   // (lead 02:15: a long lens, head ~1/7: the lamp 0.23 m off the body just ahead of his pane, level with the glove; it was half off the left edge)
        // a LOW one-lamp signal (cheat) right by the cab's front corner, its lamp level with his glove
  /** the lamp head turned toward the lens (rad about +Y from facing the train) */
  faceYaw: -1.2,
  /** CAST's call DIRECTION MODE for the side-on point: a screen direction from his chest in head heights (he faces
   *  screen LEFT; - y = up): the arm out level with the shoulder, the glove clear beyond his face */
  dirAim: [-1.45, -0.95] as [number, number],   // (FIX R1: the glove up against the light far-side window, off the desk clutter)
  /** the signal head's scale (a small lineside head: on the long lens a full-size one filled a fifth of the frame) */
  headScale: 0.75,
};
export const buildToday = (o: Opts) => async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = o.name;
  const R0 = todayRun();
  const R = o.sideOn ? { ...R0, dist: odometer([{ t: 0, v: SIDE.worldSpeed }, { t: 999, v: SIDE.worldSpeed }]), speed: () => SIDE.worldSpeed } : R0;
  // side-on: the short signal glides toward us with the ground; its green lamp is what he points at
  const sideZ = (t: number) => SIDE.post[2] + SIDE.speed * (t - t20());
  const sideLamp = (t: number): V3 => [SIDE.post[0] + 0.3, SIDE.lampY, sideZ(t)];
  // (the glove lands just short of the lamp on screen: CAST's point stops a hand's gap before the aim)
  // side-on: he points STRAIGHT FORWARD along the cab side at the lamp's height (a pure side-on point: the lamp itself
  // stands toward the lens, and an aim toward the lens is turned away by the rig); on screen the glove lands short of it
  const sideAim = (t: number): V3 => [SIDE.driver[0] - 0.05, SIDE.lampY, sideZ(t) - 0.4];
  const lamp = o.sideOn ? sideLamp : lampOf(R), aim = o.sideOn ? sideAim : aimOf(R);
  const lateUps: ((t: number, cam: THREE.Camera) => void)[] = [];
  const world = await lineside(ctx, { dist: R.dist, railTop: -D.floor, signals: o.sideOn || SIGNAL_SIDE > 0 ? [] : [{ at: R.signalAt, aspect: "G" }], seed: 4,
    // side-on: no overhead wires (seen edge-on from the trackside they alias into streaks across the sky)
    ...(o.sideOn ? { off: ["ocs", "poles"] } : {}) });
  g.add(world.object);
  // (R2b) the signal on the RIGHT of the track (STATION's lineside puts its signals on the left): the same signal head,
  // mirrored so its bracket reaches toward the track, riding the ground like the lineside
  if (!o.sideOn && SIGNAL_SIDE > 0) {
    const { signalJP } = await import("../../../../kit/rail/signal");
    const sg = await signalJP(ctx, { aspect: "G", num: "14", glow: 0.052 });
    sg.object.scale.x = -1; g.add(sg.object);
    lateUps.push((t, cam) => { sg.object.position.set(3.0, -D.floor, -(R.signalAt - R.dist(t))); sg.update?.(t, cam); });
  }
  const [{ castCardOf }, MV, { BEATS_V4 }, { crowdJP, rockLag }] = await Promise.all([import("../../cast/member"), import("../../cast/moves"), import("../../cast/beats_v4"), import("../../cast/crowd")]);
  const train = await trainJP(ctx, {
    cars: 2, pantographs: [2], lod: o.lod, ...(o.sideOn ? { crewWindow: SIDE.crewWindow } : {}), heroCars: [1], doors: () => ({ side: "none", open: 0 }),
    // (v21: from the car the seat back + headrest hid the driver's body + arm: in the car build they are hidden)
    cab: { ...(o.crowd ? { carFace: CAR_COLORS.carFace, doorPanel: CAR_COLORS.doorPanel, passengerRails: false } : {}), seatBack: () => false, handset: false, partition: (t) => !(o.cutaway && FRAMES[o.cutaway] && t >= cutS(o.cutaway) - 0.05 && t < cutE(o.cutaway) + 0.05), speed: (t) => TODAY.speed * 3.6 + 0.4 * Math.sin(t * 3.1), fog: (t) => 0.5 + 0.5 * Math.sin((t / 2.5) * Math.PI * 2), brake: () => [0.0, 0.62], lever: () => 0.3 },
    interiorOpts: { sway: (t, lag) => rockLag(t, lag).roll / 2.2, swayK: () => 1, blinds: 0.2, ...(o.crowd ? { colors: CAR_COLORS.interior, frontRails: false } : {}) },
  });
  train.object.position.y = -D.floor; g.add(train.object);
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  for (const u of lateUps) ups.push(u);
  const fy = o.sideOn ? SIDE.faceYaw : 0;
  const beacon = lampBeacon(ctx, { pos: lamp, corePx: o.sideOn ? 16 : 18, haloPx: o.sideOn ? 30 : 40, board: o.sideOn ? false : [1.7, 2.6], ...(o.sideOn ? { face: [Math.sin(fy), 0, Math.cos(fy)] as V3 } : {}) });
  g.add(beacon.object);
  if (o.sideOn) {
    // the short signal: a grey mast from the ballast, a black 3-lamp head (red, yellow dark; GREEN lit) with a visor
    // over each lamp, turned toward the lens; it rides the ground (sideZ)
    const post = new THREE.Group(); post.name = "v20_signal";
    const grey = new THREE.MeshStandardMaterial({ color: "#9aa3ad", roughness: 0.5, metalness: 0.4 }), black = new THREE.MeshStandardMaterial({ color: "#121416", roughness: 0.6 });
    const mastH = SIDE.lampY - 0.1 - SIDE.post[1];
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, mastH, 16), grey); mast.position.y = SIDE.post[1] + mastH / 2; post.add(mast);
    const head = new THREE.Group(); head.position.set(0.3, SIDE.lampY, 0); head.rotation.y = fy; head.scale.setScalar(SIDE.headScale); post.add(head);
    // (lead 06:10: "a real, readable railway signal head on its mast"): a tall black backplate with a white rim (it reads
    // as a signal against anything), two lenses under hoods (the upper one dark, the lower one lit GREEN), the mast
    // bracket; no red lens (the film's trap is a red light)
    const white = new THREE.MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.5 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.02, 0.05), white); rim.position.set(0, 0.2, -0.16); head.add(rim);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.94, 0.08), black); plate.position.set(0, 0.2, -0.12); head.add(plate);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), grey); arm.position.set(-0.17, -0.18, -0.2); head.add(arm);
    const lens = (dy: number, col: string, lit: boolean) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), new THREE.MeshStandardMaterial({ color: col, emissive: lit ? col : "#000000", emissiveIntensity: lit ? 4 : 0, roughness: 0.3 }));
      m.position.set(0, dy, -0.07); head.add(m);
      const vis = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 24, 1, true, -Math.PI / 2, Math.PI), black); vis.material.side = THREE.DoubleSide; vis.rotation.x = Math.PI / 2; vis.position.set(0, dy + 0.005, 0.03); head.add(vis);
    };
    lens(0.42, "#24302a", false);   // the upper lens: dark
    lens(0, "#22ff7a", true);       // the lower lens: GREEN, lit (the beacon's glow sits on it)
    g.add(post);
    ups.push((t) => { post.position.set(SIDE.post[0], 0, sideZ(t)); });
  }
  // the people: CAST's v4 beats (the driver's point on "point", the call on "Signal clear!"; the kid copies him)
  // side-on: the lens is on his LEFT, so CAST's point + call play on his LEFT arm (the near arm; the right one is
  // behind his body from this side). Same beats, same cues, only the arm
  // (05:20: CAST now plays the driver as two `point` rows with `fwd` (point#2-2 .. shout#1-2, then clear#1-3 ..): TRAIN
  // stages them for its lenses: ONE held point from "point" to the end of v21 (no gap, the kid copies it), in
  // DIRECTION MODE (`fwd` cleared: it overrides `dir`): inside v20 his RIGHT arm up-right across the windscreen toward
  // the signal (INSIDE_AIM); in the car (v21) up-left over the kid's window (CAR_AIM.driver, his left arm); the kid's
  // copy a raised `fwd` (CAR_AIM.kid)
  const firstPoint = BEATS_V4.find((b) => b.who === "driver" && b.m === "point");
  const mine: Beat[] = BEATS_V4.filter((b) => b.who === "kid" || (b.who === "driver" && (b.m !== "point" || b === firstPoint)))
    .map((b) => (b.who === "driver" && b.m === "point"
      // (fix round 2: inside v20 + the car v21 use the WORLD aim: the 2D sleeve goes from his shoulder to the signal's
      // place on screen, on the arm on the signal's side (auto))
      ? ({ ...b, until: "@v21.end", fwd: undefined, ...(o.sideOn ? { dir: SIDE.dirAim, left: true } : { auto: true, gap: 0.25 }) } as Beat)
      : o.crowd && b.who === "kid" && b.m === "point" ? ({ ...b, fwd: CAR_AIM.kid } as Beat) : b));
  const timed = MV.timeBeats(mine, R_V4);
  for (const t of timed) if (!t.ok || t.why) console.warn(`[today] beat ${t.b.who} ${t.b.m}: ${t.ok ? "" : "NOT PLAYED "}${t.why ?? ""} (f ${t.f0}-${t.f1})`);
  const add = (c: Built) => { g.add(c.object); if (c.update) ups.push(c.update); };
  add(await castCardOf(ctx, "driver", { pos: () => (o.sideOn ? SIDE.driver : DRIVER_AT), yaw: () => (o.sideOn ? Math.PI : DRIVER_YAW), seated: 0.5, aim, look: lamp,
    restL: () => [CAB.controller[0], CAB.controller[1] + 0.01, CAB.controller[2]], px: o.lod === "near" ? 1500 : 900, name: "today_driver" }, (e) => MV.actBeats("driver", timed, e)));
  if (o.kid) add(await castCardOf(ctx, "kid", { pos: () => KID_AT, yaw: () => KID_YAW, aim, look: lamp, px: 1300, name: "today_kid" }, (e) => MV.actBeats("kid", timed, e)));
  if (o.crowd) {
    const S = Math.PI / 2, Z = CAB.partitionZ;
    // the packed car behind the kid: standing at the straps (they sway with the train), seated on the benches
    const seat = (x: number, z: number, id: "suitA" | "suitB" | "officeMask" | "officeRead" | "salaryRead" | "grandma", seed: number) => ({ id, pos: [x, 0, z] as V3, yaw: x < 0 ? S : -S, seated: 0.43, seed });
    const crowd = await crowdJP(ctx, [
      { id: "officePhone", pos: [-0.2, 0, Z + 3.4], yaw: Math.PI - 0.5, strap: true, seed: 3 },   // (at Z + 1.35 his face filled the v21 lens)
      { id: "studentA", pos: [0.62, 0, Z + 2.4], yaw: -S + 0.3, strap: true, seed: 4 },
      { id: "salarySleep", pos: [-0.35, 0, Z + 3.1], yaw: S, strap: true, seed: 5 },
      { id: "suitA", pos: [0.55, 0, Z + 4.2], yaw: -S, strap: true, seed: 6 },
      { id: "officeMask", pos: [-0.5, 0, Z + 5.3], yaw: S - 0.3, strap: true, seed: 7 },
      seat(-0.86, Z + 2.0, "grandma", 11), seat(0.86, Z + 2.9, "suitB", 12), seat(-0.86, Z + 3.8, "officeRead", 13), seat(0.86, Z + 4.9, "salaryRead", 14),
    ], { sway: true });
    add(crowd);
  }
  return {
    object: g,
    hints: { shadowCenter: [0.0, 0, 2.5], shadowExt: 12, probe: [-0.3, 1.4, 2.0], groundAlbedo: [0.3, 0.29, 0.27], rigOpts: { fog: 0.0022, haze: 0.0002, warmth: 0.25, contrast: 0.34, sat: 1.8, shadowSat: 1.5, hiTint: [1.015, 1.0, 0.975], loTint: [0.95, 0.99, 1.07] } },
    update: (t, cam) => { world.update?.(t, cam); train.update?.(t, cam); beacon.update?.(t, cam); for (const u of ups) u(t, cam); },
  };
};

// SET 'jp_platform' of 'pointing' (STATION owner): an open-air Tokyo island platform at evening-rush golden hour.
// = kit/rail `tokyoPlatform` (the island, the canopy, the kiosk + vending machines, door marks, stop marker, LED boards,
// clocks, benches, bins, posters, light poles, ITV: the LAYOUT lives in kit/rail/tokyo_platform.ts `TP`) + kit/rail
// `lineside` (tracks, masts + catenary, the green starting signal, utility poles + wires, embankment, houses) + TRAIN's
// trainJP + the yellow suitcase + CAST (castMember / crowdJP) + NATURE fx (crows, dust motes, leaves) + CARDS pigeons.
// Pure function of t.
//
// FRAME (metres): platform top y = 0. Track 1 (our emerald train) centre x = +1.55, rail top y = -1.1; the island runs
// from x = -9 (track-2 edge) to x = 0 (track-1 edge), z = -14 .. +206. The train heads -Z with its nose (car 1, the cab)
// at z = 0 and car k (0-based) from z = 20k to 20k + 20; the platform is on the train's LEFT (driver side). The cab end
// of the platform (z < 9.5) is OPEN to the sky; the canopy covers z = 9.5 .. 146. Sun from the west / track-2 side
// (rig sunAz 60-75, sunEl 14-18): it lights the car side, the doorway and whoever stands at the edge.
//
// THE SCRIPT CAN CHANGE WITHOUT TOUCHING THE BUILDER: what happens on the platform in each shot is the table
// PLATFORM_PLAN below (by shot id). A shot that is NOT in the table gets the DWELL state: the train stands at the
// platform with its left doors open, the bag in car 1's front doorway, the boy beside it, the tourist at his default mark.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { SCRIPT, V3M, payoffAccel, payoffRun } from "./jp_platform.cams";
import { cutS, cutE, EV, S as wordS, E as wordE, DOOR_CLOSE_S, type ShotId } from "../timeline";      // THE CLOCK (imports only words: safe at top level)
import { lineside } from "../../../kit/rail/lineside";
import { tokyoPlatform, TP } from "../../../kit/rail/tokyo_platform";
import { BOUNCE_U } from "../../../kit/rail/ocs";
import { syncWireU, hash } from "../../../kit/rail/util";
// (straight from the modules, not the kit index: an index mid-edit must not break this set)
import { trainJP, doorCycle, departRun, arriveRun, type TrainDoors } from "../../../kit/vehicles/train_jp";
import { suitcase } from "../../../kit/vehicles/suitcase";
import { DOORS_CAB } from "../../../kit/vehicles/dims";
import { PAL } from "../../../kit/vehicles/mats";
import { CAB } from "../../../kit/vehicles/cab_jp";
import { castCard } from "../../../kit/cards/adapters";
import * as fx from "../../../kit/fx";
import { scatter, weeds } from "../../../kit/nature";

// ---------------------------------------------------------------- marks (CAST / cameras / other sets read these)
export const JP = {
  edgeX: TP.edgeX, track1X: TP.track1X, track2X: TP.track2X, railTopY: TP.railTopY, floorY: 0.03,          // car floor 1.13 above the rail
  door1Z: DOORS_CAB[0], door2Z: DOORS_CAB[1], door3Z: DOORS_CAB[2],
  /** car 1's front doorway: the threshold point on the platform edge, and the bag inside it */
  doorway: [0.075, 0, DOORS_CAB[0]] as V3,
  /** the bag stands in the TRAILING half of the doorway: with the doors open it is in the doorway, with the doors shut
   *  it is behind the trailing leaf's tall window (never split by the centre joint). The boy stands in the LEADING half
   *  (at the leading window = the window's leading edge as the train leaves), his mum half a step behind him. */
  bag: V3M.bag,                                   // [0.32, 0.03, 3.9] = DOORS_CAB[0] + 0.3, close behind the glass
  kid: [0.6, 0.03, DOORS_CAB[0] - 0.26] as V3,
  /** his mum stands BEHIND his shoulder (deeper in the car, a little toward the cab end): from the platform her
   *  head shows above his cap, in the same door window when the doors are shut */
  mumOff: [0.32, 0, -0.22] as V3,
  /** the white vending machine under the kiosk awning (front faces -Z, toward the cab end; the red one at x - 1.04) */
  vend: TP.vend,
  /** where a customer stands (facing +Z: his back to car 1's front door, 5 m behind his right shoulder) */
  vendFront: TP.vendFront,
  driverSeat: [TP.track1X + CAB.driverSeat[0], 0.03 + CAB.driverSeat[1], CAB.driverSeat[2]] as V3,
  cabWindow: [0.07, 1.55, 1.3] as V3,           // the driver's side window (platform side) at eye height
  itv: TP.itv,
  /** the lit GREEN lamp of the starting signal, 48 m beyond the nose */
  signal: [TP.track1X - 3.0 + 0.78, TP.railTopY + 4.6, -TP.signalAhead] as V3,
  tactileX: TP.tactileX, canopyX: TP.canopyX, canopyZ0: TP.canopyZ0,
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const L3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------------------------------------------------------- THE PLAN: what happens in each shot (edit this table)
export type Row = { id: string; from: number; to: number };
/** dwell = standing, doors open | arrive = rolls in, stops with the nose at z = 0, then the doors open | depart = the
 *  doors shut, then it pulls out | roll = keeps going from the depart shot before it (THE LOOP: a roll shot with no
 *  depart shot before it continues the film's LAST depart shot, one film length earlier: shot 1 = the payoff train
 *  at film time + L) | gone = already far down the line (the tail near the vanishing point) */
export type TrainMode = "dwell" | "arrive" | "depart" | "roll" | "gone";
/** a mark: u = seconds since the shot started. `ride` = the mark is ON THE TRAIN (it moves with it: someone behind
 *  the door glass); positions are still written in platform coordinates for the train standing at the platform. */
export type Mark = { pos: V3 | ((u: number) => V3); yaw?: number | ((u: number) => number);
  /** what he points at: a world point, a function of u, or "bag" (the suitcase's handle, wherever the train has taken it) */
  aim?: V3 | null | "bag" | "bagNear" | ((u: number) => V3); ride?: boolean;
  /** the suitcase only: lean (rad) about its car-side wheel line; NEGATIVE = its platform-side wheels drop (it tips out over the gap) */
  tilt?: number | ((u: number) => number) };
export type PlanRow = {
  /** THE LOOP SEAM: this shot IS another shot's set-up, earlier: its last frame is followed by that shot's first frame.
   *  Everything here (train, doors, marks) then runs the other row at time (t - this shot's END): the film's last shot
   *  is `{ seamOf: "s01" }`, so the picture runs straight through the loop whatever the film length is. */
  seamOf?: string;
  train?: TrainMode;
  /** depart: seconds after the shot start when the train starts to roll (default 1.0; NEGATIVE = it is already rolling
   *  when the shot starts, e.g. -1.0 for a film that opens on the departing train: 0.4 m gone, 0.8 m/s). The doors
   *  finish closing ~0.1 s before it rolls. */
  departAt?: number;
  /** depart: acceleration m/s^2 (default 0.8 = a real commuter EMU; lower = the door window stays in frame longer) */
  accel?: number;
  /** depart: seconds between the door leaves meeting and the first roll (default 0.12; the real order is doors shut ->
   *  car-side lamps out -> the driver's call -> it glides: ~1.4-1.8 s). The leaves take DOOR_CLOSE_S (1.3 s, the
   *  film's ONE door speed, ../timeline.ts) to shut. */
  hold?: number;
  /** arrive: seconds after the shot start when the train comes to rest (default 1.0); the doors start to open at
   *  `doorsAt` s after the shot start (default 0.5 s after the stop) and take 1.5 s */
  arriveAt?: number; doorsAt?: number;
  /** the orange train passes on track 2; passAt = seconds after the shot start when its nose reaches z = +25 (default 2.1) */
  pass?: boolean; passAt?: number;
  /** where the tourist stands (false = not on the platform); default TOURIST_DEFAULT */
  tourist?: Mark | false;
  /** the suitcase in car 1's front doorway / the boy beside it: true (default) = their marks JP.bag / JP.kid, false =
   *  not there, or a Mark of their own (always riding the train), e.g. the bag rolling from the aisle to the threshold */
  bag?: boolean | Mark; kid?: boolean | Mark;
  /** the boy's mum: with him by default (JP.mumOff from the boy), false = not there, or her own Mark (riding) */
  mum?: boolean | Mark;
  /** the late salaryman is on the platform in this shot (CAST's crowd card: he half-jogs in from the cab end and stops
   *  short of car 1's front door on the first "closed!"; THE PLANT). Hidden in every other shot. */
  late?: boolean;
  /** commuters who STEP OFF the train in this shot (a stop): each stands inside car 1 at `from` (platform coordinates,
   *  riding until the train stops), walks out toward the platform at `at` s after the shot start (`v` m/s, default
   *  1.3) and, once over the edge, turns toward `turn` (+1 = the canopy / +Z, -1 = the cab end) and walks on. `who` =
   *  a CAST crowd id (they walk with the walker cards' real cycle). */
  leavers?: { who: string; from: V3; at: number; v?: number; turn?: 1 | -1 }[];
  /** LIFE (Block 14): passers-by who walk a straight line `from` -> `to` (platform coordinates) at `v` m/s (default
   *  1.25), starting `at` s after the shot start (negative = already walking); they stop at `to`. `ride` = inside the
   *  standing train. `who` = a CAST crowd id (walker cards' real cycle). */
  passers?: { who: string; from: V3; to: V3; at: number; v?: number; ride?: boolean }[];
};
export const TOURIST_DEFAULT: Mark = { pos: [-2.0, 0, 3.45], yaw: -Math.PI / 2 };       // 2 m from the doorway, his back to the bag
/** THE PLAN FOR THE v2 SHOT TABLE (shots.ts of 2026-11-19 16:12, the bible's 22 shots) */
export const PLATFORM_PLAN_V2: Record<string, PlanRow> = {
  s07: { train: "depart", tourist: false, bag: false, kid: false },                // station A: the plant
  s08: { tourist: { pos: (u) => L3([0.55, 0.03, 3.95], [-1.55, 0, 3.35], ss(1.25, 1.9, u)), yaw: (u) => (u < 1.3 ? -Math.PI / 2 : -Math.PI / 2 - 0.3) } },   // parks the bag, hops out
  s09: { tourist: { pos: [-1.6, 0, 1.15], yaw: (u) => (u < 1.4 ? Math.PI / 2 : -0.6), aim: [0.07, 1.55, 1.3] } },            // films the cab's side window
  s14: { pass: true, tourist: { pos: TP.vendFront, yaw: 0.2, aim: [TP.vend[0], 1.4, TP.vend[2] - 0.4] } },                   // at the vending machines, his back to the bag
  s18: { tourist: TOURIST_DEFAULT },
  s20: { train: "depart", tourist: { pos: [-1.0, 0, 5.9], yaw: -0.4 } },           // the payoff (= s07's camera)
  s21: { train: "roll", tourist: { pos: [-1.55, 0, 2.6], yaw: Math.PI / 2 + 0.3 } },
  s22: { train: "gone", tourist: false },                                          // his phone POV down the empty line
};
/** THE PLAN FOR SCRIPT v3 (LOCKED; sound/pointing/script_v3/shot_outline_v3.json: 25 shots, 16 on this set). Station A
 *  = shots 7-9, station B = 11-24 and 1. Keys exist as "s07" and "v3_s07". EVERY TIME comes from THE CLOCK
 *  (../timeline.ts: cuts, words, the shared events EV), so the plan follows the voice by itself.
 *  THE PAYOFF TRAIN is ONE motion through s22 -> s23 -> s24 -> (the loop) -> s01: it starts to glide at EV.glideB with
 *  a gentle constant acceleration (`payoffAccel`, jp_platform.cams.ts) chosen so that it has run exactly
 *  V3M.frame0.run0 metres when the film loops: the suitcase is at his fingertip on frame 0 for any voice timing.
 *  s24 = `seamOf: "s01"` and s01 = `roll` with no depart shot before it = the payoff train at film time + L. */
const inCar = (x: number, z: number): V3 => [x, 0.03, z];
/** THE PLANT / THE PAYOFF (s09, s22): the boy close behind the LEADING door glass (S-9 / 2026-11-20). From the
 *  three-quarter knee-high lens a boy 0.5 m deep in the car is seen through the leaves' centre frame (the old
 *  half-hidden boy); 0.22 m behind the glass and 0.24 m toward the cab end he stays inside the leading window for
 *  the whole truck (his mum behind him, the suitcase in the trailing window) */
const KID_GLASS: Mark = { pos: [0.3, 0.03, 3.1] };
/** film seconds -> seconds into shot `id` */
const into = (id: ShotId, t: number) => t - cutS(id);
/** a word's start (or end) as seconds into shot `id`; `fb` if the script has no such word */
const wordIn = (id: ShotId, key: string, fb: number, end = false) => { try { return (end ? wordE(key) : wordS(key)) - cutS(id); } catch { return fb; } };
const F0 = V3M.frame0, VEND = V3M.vend, BZ = V3M.bag[2];
/** at his spot by the drinks machines, his back to the bag (s12 - s20) */
const atVend = (aim?: Mark["aim"]): Mark => ({ pos: VEND.tourist, yaw: VEND.yaw, aim });
/** his own phone, held up in front of his face at his spot (what the finger wiggles at in s16b) */
const PHONE_AT_VEND: V3 = [VEND.tourist[0] + Math.sin(VEND.yaw) * 0.4, 1.3, VEND.tourist[2] + Math.cos(VEND.yaw) * 0.4];
/** for the lenses INSIDE the car (s15, s18, s20): mum stands beside the boy on the cab-end side, out of the lens's way */
const MUM_ASIDE: Mark = { pos: [0.7, 0.03, 2.42], yaw: -Math.PI / 2 + 0.6 };
/** ... and the boy stands a step to the cab-end side: only his cap brim / his pointing arm reach into the frame's near right corner */
// (2026-11-20: 0.28 m further than before: at z 3.0 his cap brim + the back of his head filled ~40 % of the frame
//  at the end of the s15 slide; now only his pointing arm reaches into the near right corner: S-11 / S-13)
const KID_ASIDE: Mark = { pos: [0.78, 0.03, 2.72] };
/** the boy for the inside lenses that SLIDE toward the cab end (s15, s20): he keeps the same place at the frame's right
 *  edge (his pointing arm in the near right corner, his cap out) by shuffling with the slide (0.3 m in 3 s) */
const kidEdge = (id: ShotId, z0: number, z1: number): Mark => ({ pos: (u) => [0.78, 0.03, lerp(z0, z1, Math.max(0, Math.min(1, u / (cutE(id) - cutS(id)))))] });
/** s15: he turns round to the lens (= the suitcase) in the first 0.4 s (EV.look0), and back to his phone over the last 0.45 s */
// S-11 (2026-11-20): THREE-QUARTER FRONT to the lens from the first frame (the lens is at yaw ~1.98 from him: 1.42 =
// 32 deg off it), so his face and his eyes going to the suitcase read from the cut; he turns back to his phone in the
// last 0.45 s
const TURN15 = (u: number) => { const d = cutE("s15") - cutS("s15"), k = 1 - ss(d - 0.45, d, u); return lerp(VEND.yaw, 1.42, k); };
/** s18 (S-12): he faces the doorway three-quarter, giggling into the phone held up in front of his face */
const YAW18 = 1.3;
const PHONE18: V3 = [VEND.tourist[0] + Math.sin(YAW18) * 0.4, 1.32, VEND.tourist[2] + Math.cos(YAW18) * 0.4];
const SAVES = wordIn("s08", "saves", 1.0), HAUL = wordIn("s08", "it#1", 1.6, true), STAY = wordIn("s11", "stay", 1.6), HOP = wordIn("s11", "right#1", 2.6);
const V3_PLAN: Record<string, PlanRow> = {
  // FRAME 0 (s01) + THE LAST SHOT (s24) = ONE set-up across the loop seam: the door window with the bag passes behind
  // him during s24, is at his fingertip on frame 0 and has left the frame ~1.4 s later. He points at the bag itself:
  // his arm and his head follow it away.
  s01: { train: "roll", tourist: { pos: F0.tourist, yaw: -2.0, aim: "bag" } },     // ("bagNear" was tried for S-15: the card arm then BENDS at his chest: the arm is too short to stop short of the bag)
  s24: { seamOf: "s01" },
  // station A: the stop, the doors open, the suitcase trundles from the aisle to the threshold on "His suitcase tries
  // to get off..." (he stands inside, his back to us)
  // Two commuters step off first (the doors are half open), the suitcase trundles after them; the boy + his mum stand
  // a step deeper on the cab-end side (out of the leavers' lane) and watch it go (s08: he steps up to the doorway).
  s07: { train: "arrive", arriveAt: into("s07", EV.stopA), tourist: { pos: inCar(1.15, 4.2), yaw: Math.PI / 2, ride: true },
    kid: { pos: inCar(1.0, 3.02) }, mum: { pos: inCar(1.34, 2.78), yaw: -Math.PI / 2 + 0.35 },
    leavers: [{ who: "suitB", from: inCar(0.75, 3.2), at: into("s07", EV.stopA) + 0.9, v: 1.25, turn: -1 },
      { who: "studentB", from: inCar(1.45, 3.26), at: into("s07", EV.stopA) + 1.3, v: 1.25, turn: -1 }],
    bag: { pos: (u) => L3(inCar(1.2, BZ), inCar(0.2, BZ), ss(wordIn("s07", "suitcase#1", 1.3), wordIn("s07", "off", 3.0, true), u)), yaw: -Math.PI / 2 } },
  // the boy points; on "saves" he lunges, catches the handle with two wheels over the gap, hauls it in after "it"
  // (CAST: he must be within 0.5 m of it)
  s08: { tourist: { pos: (u) => L3(inCar(1.15, 4.2), inCar(0.72, 4.15), ss(SAVES - 0.17, SAVES + 0.33, u)), yaw: -Math.PI / 2 - 0.5, ride: true, aim: "bag" },
    // T-16 (2026-11-20): THE DANGER, unmistakable: in the 0.6 s before "saves" it rolls on out of the door, its
    // platform-side wheels drop over the gap and it LEANS OUT (14 deg); on "saves" he lunges and grabs (CAST) and it
    // is yanked back upright onto the car floor (a small rebound), then hauled in after "it" as before
    bag: { pos: (u) => (u < HAUL ? L3(L3(inCar(0.2, BZ), inCar(0.0, BZ), ss(SAVES - 0.6, SAVES - 0.1, u)), inCar(0.26, BZ), ss(SAVES + 5 / 30, SAVES + 14 / 30, u)) : L3(inCar(0.26, BZ), V3M.bag, ss(HAUL, HAUL + 0.8, u))),
      tilt: (u) => -0.3 * ss(SAVES - 0.4, SAVES, u) * (1 - ss(SAVES + 5 / 30, SAVES + 12 / 30, u)) + 0.07 * ss(SAVES + 11 / 30, SAVES + 15 / 30, u) * (1 - ss(SAVES + 15 / 30, SAVES + 0.7, u)),     // lean peaks ON "saves" (CAST's grip), back from saves+5 f to saves+14 f
      // it swivels as it rolls out (a spinner), so from the doorway lens its lean shows SIDEWAYS (toward screen right), not only toward the lens
      yaw: (u) => -Math.PI / 2 + 0.85 * ss(SAVES - 0.6, SAVES - 0.2, u) * (1 - ss(SAVES + 5 / 30, SAVES + 14 / 30, u)) } },
  // THE PLANT: the doors start on the chime (EV.chimeA), meet (EV.doorsMeetA), the lamps go out, the call, it glides
  // (EV.glideA); the late salaryman stops short; behind car 1's door glass: the boy + mum, the bag, him above the bag
  s09: { train: "depart", departAt: into("s09", EV.glideA), hold: EV.glideA - EV.doorsMeetA, late: true, tourist: { pos: inCar(0.62, 3.62), yaw: -Math.PI / 2, ride: true }, kid: KID_GLASS,
    passers: [{ who: "waitC", from: [-2.25, 0, -1.5], to: [-2.45, 0, 8.5], at: -0.6, v: 1.3 }] },     // LIFE: a commuter walks toward the knee-high lens
  // station B: the train has just stopped (EV.arriveB), the doors open (EV.doorsOpenB); he wheels the bag to the
  // doorway, "Stay." (two pats), hops out on "right" and walks off to the drinks machines
  s11: { train: "arrive", arriveAt: into("s11", EV.arriveB), doorsAt: into("s11", EV.doorsOpenB),
    tourist: { pos: (u) => (u < HOP + 0.5 ? L3(inCar(0.78, 4.28), [-1.2, 0, 4.25], ss(HOP, HOP + 0.5, u)) : L3([-1.2, 0, 4.25], VEND.tourist, ss(HOP + 0.5, HOP + 1.6, u))),
      yaw: (u) => (u < HOP ? -Math.PI / 2 - 0.5 : -1.4), aim: "bag" },
    bag: { pos: (u) => L3(inCar(1.1, BZ), V3M.bag, ss(0.5, Math.max(0.9, STAY - 0.25), u)), yaw: -Math.PI / 2 - 0.12 } },
  // the bag alone, the boy, mum; he is at the machines, his back to it. LIFE: a passenger walks the aisle inside car 1
  s12: { tourist: atVend(), passers: [{ who: "suitA", from: [1.75, 0.03, 6.2], to: [1.7, 0.03, 0.8], at: -0.4, v: 1.15, ride: true }] },
  // the mock call at the machines. LIFE: one commuter walks away along the platform edge behind him, one comes up the
  // far side toward the lens
  s13: { tourist: atVend(VEND.machine), passers: [{ who: "suitA", from: [-0.75, 0, 7.6], to: [-0.85, 0, -3], at: -0.3, v: 1.3 },
    { who: "studentA", from: [-4.3, 0, -1.5], to: [-4.1, 0, 6.6], at: 0.0, v: 1.2 }] },
  s14: { tourist: atVend() },
  s15: { tourist: { pos: VEND.tourist, yaw: TURN15, aim: "bag" }, mum: MUM_ASIDE, kid: kidEdge("s15", 3.0, 2.7) },     // (3.12 -> 2.84 tried 02:05: his arm came in, but so did a cap brim ~25 % of the frame, and the arm sat under the caption band: his FACE is this shot's beat)
  // LIFE (s16a, Block 14): two commuters on the far (left) side of him, one walking away, one coming toward the lens;
  // neither crosses the doorway (the focus pull to the bag)
  s16a: { tourist: atVend(PHONE_AT_VEND), passers: [{ who: "suitB", from: [-2.45, 0, 3.9], to: [-2.65, 0, -4.5], at: 0.2, v: 1.25 },
    { who: "waitC", from: [-3.1, 0, -4.2], to: [-3.0, 0, 3.4], at: 0.0, v: 1.15 }] },
  s16b: { tourist: atVend(PHONE_AT_VEND) },
  // s18 (S-12): NOT his back: the lens low in the car beside the suitcase, he beyond the doorway in three-quarter at his
  // phone, the boy beside the bag looking up at him
  s18: { tourist: { pos: VEND.tourist, yaw: YAW18, aim: PHONE18 }, mum: MUM_ASIDE, kid: { pos: inCar(0.2, 3.22), yaw: 0.6 } }, s20: { tourist: atVend(), mum: MUM_ASIDE, kid: kidEdge("s20", 3.1, 2.55) },
  // THE PAYOFF: he stands where frame 0 will find him, his back to the train; the doors start on the chime
  // (EV.chimeB), meet with the bag behind the glass (EV.doorsMeetB), the lamps go out, "...closed!", it glides (EV.glideB)
  s22: { train: "depart", departAt: into("s22", EV.glideB), hold: EV.glideB - EV.doorsMeetB, accel: payoffAccel(), tourist: { pos: F0.tourist, yaw: -0.9 }, kid: KID_GLASS },
  // the boy's shot (square on the door glass, pulling back): the door window is still coming toward him (V3M.s23Lead)
  s23: { train: "roll", tourist: { pos: [F0.tourist[0], 0, 3.26 - payoffRun(cutE("s23")) - V3M.s23Lead], yaw: -1.2, aim: "bag" },
    kid: { pos: inCar(0.4, 3.26) } },     // S-9: the boy close behind the leading glass (bright, nearer the lens)
};
export const PLATFORM_PLAN_V3: Record<string, PlanRow> = Object.fromEntries(Object.entries(V3_PLAN).flatMap(([k, v]) => [[k, v], ["v3_" + k, v]]));
/** the plan in use = the script switch in sets/jp_platform.cams.ts (SCRIPT) */
export const PLATFORM_PLAN: Record<string, PlanRow> = SCRIPT === "v3" ? PLATFORM_PLAN_V3 : PLATFORM_PLAN_V2;

/** THE LIGHT of this place (rigOpts over `golden`; CORE: RIGS -> the set's hints.rigOpts -> the shot's rigOpts).
 *  `wide` is the set's own default (hints.rigOpts). For shots where the yellow suitcase is the focal point give the shot
 *  `rigOpts: JP_RIG.bag` (near-neutral: the yellow stays the only colour of its kind); for the film's frame 0 / last shot
 *  (the lens looks EAST at the tourist and the car side: jp_platform.cams.ts V3M.frame0) `JP_RIG.frame0`: the sun over
 *  the lens's left shoulder = a three-quarter FRONT sun on his face and on the car side, high contrast, no haze veil
 *  (a sun north of west, sunAz > 95, leaves the stainless car side grey: it mirrors empty sky). `west` = lenses that look
 *  across track 2 into the low sun. */
// LOOK TEST (2026-11-20, look director): VIVID SUNNY. The old presets (warmth 0.6-1.3 + haze + fog over a white car)
//  turned golden into beige. Now: neutral white balance (warmth 0.1: the sun itself is golden, the shadows stay sky-blue),
//  a stronger sun against a lower fill (deeper shadows), no haze veil, more contrast, golden highlights / cool shadows in
//  the grade, a darker, more saturated drawn sky. Old values: out/pointing/look_test/_backup/src/videos3/pointing/sets/jp_platform.ts
const VIVID = { fog: 0.0012, haze: 0.0001, warmth: 0.1, sunIntensity: 9.0, sunRGB: [1.0, 0.9, 0.76] as [number, number, number], skyLevel: 0.2, bgK: 0.68,
  sat: 1.75, shadowSat: 1.5, contrast: 0.36, gradeExpo: 1.18, hiTint: [1.015, 1.0, 0.975] as [number, number, number], loTint: [0.95, 0.99, 1.07] as [number, number, number], bloom: 0.32, bloomThreshold: 1.2 };
export const JP_RIG = {
  wide: { ...VIVID, sunAz: 66, sunEl: 20, exposure: 0.72 },
  bag: { ...VIVID, sunAz: 66, sunEl: 20, exposure: 0.7 },
  frame0: { ...VIVID, sunAz: 68, sunEl: 19, exposure: 0.66 },
  west: { ...VIVID, sunAz: 66, sunEl: 20, exposure: 0.76 },
};

/** the train's life + who is where, from a shot table and a plan (pure in film time) */
export const platformLife = (TABLE: Row[], PLAN: Record<string, PlanRow> = PLATFORM_PLAN) => {
  const rows = TABLE.map((r, i) => ({ id: r.id, i, t0: r.from / 30, t1: r.to / 30, dt: 0, plan: PLAN[r.id] ?? {} })).sort((a, b) => a.t0 - b.t0);
  const none = { id: "", i: -1, t0: 0, t1: 1e9, dt: 0, plan: {} as PlanRow };
  // the loop seam: a `seamOf` row plays its target row, shifted so that its END is the target's START (t0 = the seam,
  // dt = the shift to the target's own clock: run / doors are evaluated at t + dt, marks at u = t - t0 < 0)
  const seam = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (r.plan.seamOf) { const tg = rows.find((x) => x.id === r.plan.seamOf || x.id === "v3_" + r.plan.seamOf); if (tg) seam.set(r.id, { ...tg, t0: r.t1, t1: r.t1, dt: tg.t0 - r.t1 }); }
  /** the shot row of the FRAME that film time t belongs to (before the first shot: the first row). By frame, not by
   *  raw time: the pipeline's shutter is centred on the frame, so on the first frame of a shot half of the sub-frames
   *  sample times just BEFORE the cut; switching state by raw time ghosts the old state into that frame. */
  const at = (t: number) => { const tq = Math.round(t * 30) / 30; let cur = rows[0] ?? none; for (const r of rows) { if (tq >= r.t0 - 1e-6) cur = r; else break; } return seam.get(cur.id) ?? cur; };
  const dep = new Map<string, (t: number) => number>(), close = new Map<string, TrainDoors>();
  /** the film's length in seconds (the loop length) */
  const LEN = rows.reduce((m, r) => Math.max(m, r.t1), 0), later: (() => void)[] = [];
  rows.forEach((r, k) => {
    if (r.plan.train === "arrive") {
      const stop = r.t0 + (r.plan.arriveAt ?? 1.0);
      dep.set(r.id, arriveRun(stop, 0.9, 14));
      close.set(r.id, doorCycle({ side: "left", openAt: r.plan.doorsAt !== undefined ? r.t0 + r.plan.doorsAt : stop + 0.5, closeAt: 1e9, dur: 1.5 }));
    } else if (r.plan.train === "depart") {
      const go = r.plan.departAt !== undefined ? r.t0 + r.plan.departAt : Math.min(r.t0 + 1.0, r.t1 - 0.3);
      dep.set(r.id, departRun(go, r.plan.accel ?? 0.8, 22));
      close.set(r.id, doorCycle({ side: "left", openAt: -1e9, closeAt: go - (r.plan.hold ?? 0.12) - DOOR_CLOSE_S, closeDur: DOOR_CLOSE_S, startOpen: true }));   // the leaves meet `hold` s before it rolls
    } else if (r.plan.train === "roll") {
      let src: (typeof rows)[number] | null = null;
      for (let q = k - 1; q >= 0; q--) if (rows[q].plan.train === "depart") { src = rows[q]; break; }
      if (src) later.push(() => { dep.set(r.id, dep.get(src!.id)!); close.set(r.id, close.get(src!.id)!); });
      else {      // THE LOOP: the film's last depart shot, one film length earlier (shot 1 after the payoff)
        const last = [...rows].reverse().find((x) => x.plan.train === "depart");
        if (last) later.push(() => { const f = dep.get(last.id)!, c = close.get(last.id)!; dep.set(r.id, (t) => f(t + LEN)); close.set(r.id, (t) => c(t + LEN)); });
      }
    }
  });
  for (const f of later) f();
  /** metres the train has moved toward -Z (0 = nose at z 0) */
  const trainRun = (t: number) => { const r = at(t); return r.plan.train === "gone" ? 300 + 13 * (t - r.t0) : dep.get(r.id)?.(t + r.dt) ?? 0; };
  const trainDoors: TrainDoors = (t) => { const r = at(t), m = r.plan.train ?? "dwell"; return m === "dwell" ? { side: "left", open: 1 } : close.get(r.id)?.(t + r.dt) ?? { side: "left", open: 0 }; };
  /** the orange train on track 2: metres run toward -Z, or null when it is not in this shot */
  const passRun = (t: number) => { const r = at(t); return r.plan.pass ? 11 * (t - (r.t0 + (r.plan.passAt ?? 2.1))) - 25 : null; };
  /** first shot of a mode, or null */
  const first = (m: TrainMode) => rows.find((r) => r.plan.train === m) ?? null;
  return { rows, at, trainRun, trainDoors, passRun, first };
};

export type PlatformOpts = { table: Row[]; plan?: Record<string, PlanRow> };
/** THE BUILDER (the film's SetBuilder is `build_jp_platform` below; sandboxes call this with their own table + plan) */
export const buildPlatform = async (ctx: KitCtx, o: PlatformOpts): Promise<Built> => {
  const tStart = performance.now();
  // the cast loads lazily (a top-level import would close the cycle shots -> cams -> sets -> cast -> shots)
  const [{ castMember, crowdJP }, PPL] = await Promise.all([import("../cast"), import("../../../videos/clown/cast_people")]);
  const { rows, at, trainRun, trainDoors, passRun, first } = platformLife(o.table, o.plan ?? PLATFORM_PLAN);
  const g = new THREE.Group(); g.name = "set:jp_platform";
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  // every update hook carries the name of its part (`tag`): the first 96 sub-frames are timed per part and logged once
  const tags: string[] = []; let tag = "lineside";
  { const push0 = ups.push.bind(ups); ups.push = (...f) => { for (let i = 0; i < f.length; i++) tags.push(tag); return push0(...f); }; }
  // build log: seconds + triangles per part (one line at the end: the cost table in kit/rail/NOTES.md comes from it)
  const trisOf = (o: THREE.Object3D) => { let n = 0; o.traverse((m) => { const me = m as THREE.Mesh & { count?: number }; if (!me.isMesh || !me.geometry) return; const ge = me.geometry; n += ((ge.index ? ge.index.count : ge.getAttribute("position")?.count ?? 0) / 3) * (me.count ?? 1); }); return n; };
  const parts: string[] = []; let tMark = performance.now();
  const meshesOf = (o: THREE.Object3D) => { let n = 0; o.traverse((m) => { if ((m as THREE.Mesh).isMesh) n++; }); return n; };
  const logPart = (name: string, ...objs: THREE.Object3D[]) => { const now = performance.now(); parts.push(`${name} ${((now - tMark) / 1000).toFixed(1)} s ${(objs.reduce((a, o2) => a + trisOf(o2), 0) / 1e6).toFixed(2)} M ${objs.reduce((a, o2) => a + meshesOf(o2), 0)} meshes`); tMark = now; };
  // where lenses come close to the slabs (finer tessellation + displacement there): the door, the edge, the vending corner
  const lens = { points: [[-1.6, 3.6], [-2.4, 3.6], [-1.4, -2.0], [-3.8, 6.4], [-2.6, 3.0], [-1.4, 5.5], [-3.4, 7.0]] as [number, number][] };

  // 1) the lineside world, standing still: tracks 1 + 2, masts + catenary, the starting signal beyond the platform end,
  //    poles, houses (low and far back on the sun side: the low sun reaches the platform)
  //    The world is shifted 25 m along the line (PHASE): the overhead-line portals then stand at z = +25 / -25, so no
  //    mast shadow crosses the hero corner for any sunAz 60-75 (a portal abeam the nose laid its mast shadow on door 1).
  const PHASE = 25;
  const world = await lineside(ctx, { dist: () => PHASE, railTop: JP.railTopY, tracks: [JP.track1X, JP.track2X], ahead: 900, behind: 260,
    signals: [{ at: TP.signalAhead + PHASE, aspect: "G", num: "2", glow: 0.013 }], bankH: 1.2, seed: 5,      // ONE green dot down the line (a second signal behind it read as a double dot)
    houses: { setback: [16, 0], maxFloors: [2, 4] }, trees: 1 });      // one real tree per 200 m (they stand 20+ m from the platform)
  g.add(world.object); if (world.update) ups.push(world.update);
  logPart("lineside", world.object); tag = "platform props";

  // 2) the platform itself (kit/rail tokyoPlatform, hero)
  const tp = await tokyoPlatform(ctx, { hero: true, lens, seed: 3 });
  g.add(tp.object); ups.push((t) => tp.update(t));
  logPart("platform", tp.object); tag = "train";

  // 3) the train (TRAIN's trainJP) on track 1 + the orange consist passing on track 2 in a `pass` shot
  const train = await trainJP(ctx, { cars: 10, run: trainRun, doors: trainDoors, doorDelay: 0.12, heroCars: [1], seed: 3 });
  train.object.position.set(JP.track1X, JP.railTopY, 0); g.add(train.object); if (train.update) ups.push(train.update);
  logPart("train", train.object);
  if (rows.some((r) => r.plan.pass)) {      // built only when the plan has a `pass` shot (3 M triangles, 1 s)
    const other = await trainJP(ctx, { cars: 10, band: PAL.orange, bandDark: PAL.orangeDark, run: (t) => passRun(t) ?? -400, interior: "simple", heroCab: false, lod: "auto", seed: 8 });
    other.object.position.set(JP.track2X, JP.railTopY, 0); g.add(other.object);
    ups.push((t, cam) => { other.object.visible = passRun(t) !== null; if (other.object.visible) other.update?.(t, cam); });
    logPart("orange train", other.object);
  }

  tag = "suitcase";
  // 4) the yellow suitcase (TRAIN's K-P27) in car 1's front doorway; it leaves with the train
  const res = <T,>(v: T | ((u: number) => T), u: number): T => (typeof v === "function" ? (v as (u: number) => T)(u) : v);
  /** a rider's mark (bag / boy): its own Mark if the plan gives one, else the default point; always moves with the train */
  const rider = (key: "bag" | "kid", def: V3) => (t: number): V3 => { const r = at(t), m = r.plan[key]; const p = typeof m === "object" ? res(m.pos, t - r.t0) : def; return [p[0], p[1], p[2] - trainRun(t)]; };
  const riderYaw = (key: "bag" | "kid", def: number) => (t: number) => { const r = at(t), m = r.plan[key]; return typeof m === "object" && m.yaw !== undefined ? res(m.yaw, t - r.t0) : def; };
  const bagAt = rider("bag", JP.bag);
  const bagTilt = (t: number) => { const r = at(t), m = r.plan.bag; return typeof m === "object" && m.tilt !== undefined ? res(m.tilt, t - r.t0) : 0; };
  const bag = await suitcase(ctx, { pos: bagAt, yaw: riderYaw("bag", -Math.PI / 2 - 0.12), handle: 1, interior: true, tilt: bagTilt });     // it stands inside car 1: reflects the car, not the sky (TRAIN, 2026-11-20)
  g.add(bag.object); if (bag.update) ups.push(bag.update);
  ups.push((t) => { bag.object.visible = at(t).plan.bag !== false; });

  tag = "cards: tourist + kid + driver";
  // 5) the cast (CAST's castMember: they act the bible's beats on the words by themselves)
  const markAt = (t: number) => { const r = at(t), m = r.plan.tourist; return { m: m === false ? null : m ?? TOURIST_DEFAULT, u: t - r.t0 }; };
  const tourist = await castMember(ctx, "tourist", {
    pos: (t) => { const { m, u } = markAt(t), k = m ?? TOURIST_DEFAULT, p = res(k.pos, u); return k.ride ? [p[0], p[1], p[2] - trainRun(t)] : p; },
    yaw: (t) => { const { m, u } = markAt(t); return res((m ?? TOURIST_DEFAULT).yaw ?? 0, u); },
    aim: (t) => { const { m, u } = markAt(t), a = m?.aim; if (!a) return null; if (a === "bag") { const b = bagAt(t); return [b[0], b[1] + 0.86, b[2]]; }
      if (a === "bagNear") { const b = bagAt(t); return [b[0] - 0.1, b[1] + 0.8, b[2] + 0.34]; }     // just short of its near top corner (frame 0: the tip LEADS to the bag)
      return typeof a === "function" ? a(u) : a; } });
  g.add(tourist.object); ups.push((t, cam) => { tourist.object.visible = markAt(t).m !== null; tourist.update?.(t, cam); });
  const kidAt = rider("kid", JP.kid);
  // the boy: at the leading window, turned to the bag; he POINTS at the bag and LOOKS at the tourist (the grown-up)
  const kid = await castMember(ctx, "kid", { pos: kidAt, yaw: riderYaw("kid", -Math.PI / 2 + 0.55), aim: (t) => { const b = bagAt(t); return [b[0], b[1] + 0.6, b[2]]; },
    look: (t) => { const { m, u } = markAt(t); if (!m) return null; const q = res(m.pos, u); return [q[0], q[1] + 1.3, m.ride ? q[2] - trainRun(t) : q[2]]; } });
  g.add(kid.object); ups.push((t, cam) => { kid.object.visible = at(t).plan.kid !== false; kid.update?.(t, cam); });
  // his mum: beside him in every shot he is in (CAST's kid_mum card: legacy acting, a living hold)
  const mumAt = (t: number): V3 => { const r = at(t), m = r.plan.mum; if (typeof m === "object") { const q = res(m.pos, t - r.t0); return [q[0], q[1], q[2] - trainRun(t)]; } const k = kidAt(t); return [k[0] + JP.mumOff[0], k[1], k[2] + JP.mumOff[2]]; };
  const mum = await castMember(ctx, "kid_mum", { pos: mumAt, yaw: (t) => { const m = at(t).plan.mum; return typeof m === "object" && m.yaw !== undefined ? res(m.yaw, t - at(t).t0) : -Math.PI / 2 + 0.25; },
    aim: (t) => { const b = bagAt(t); return [b[0], b[1] + 0.6, b[2]]; }, px: 1100 });
  g.add(mum.object); ups.push((t, cam) => { const pl = at(t).plan; mum.object.visible = pl.kid !== false && pl.mum !== false; mum.update?.(t, cam); });
  const driver = await castMember(ctx, "driver", { pos: (t) => [JP.driverSeat[0], JP.driverSeat[1], JP.driverSeat[2] - trainRun(t)], yaw: () => Math.PI, seated: true, aim: () => JP.signal, px: 900 });
  g.add(driver.object); if (driver.update) ups.push(driver.update);
  tag = "crowd (9, one atlas)";
  // the platform crowd (one atlas, one draw): commuters waiting for the orange line on the track-2 side, two students
  // chatting, a mum with a stroller and a grandma on the bench on our side. All face their track; none near door 1.
  const W2 = -Math.PI / 2, E1 = Math.PI / 2;
  const crowd = await crowdJP(ctx, [
    { id: "waitA", pos: [-7.25, 0, 5.4], yaw: W2 }, { id: "waitB", pos: [-7.35, 0, 13.1], yaw: W2 - 0.2 }, { id: "waitC", pos: [-7.2, 0, 21.4], yaw: W2 + 0.15 },
    { id: "studentA", pos: [-6.9, 0, 28.2], yaw: W2 + 0.5 }, { id: "studentB", pos: [-6.45, 0, 28.9], yaw: W2 - 0.6 },
    { id: "salaryRead", pos: [-7.3, 0, 36.5], yaw: W2 }, { id: "suitB", pos: [-7.2, 0, 44.8], yaw: W2 + 0.1 },
    { id: "mumStroller", pos: [-3.0, 0, 17.2], yaw: E1 - 0.25 }, { id: "grandma", pos: [-3.62, 0, 21.6], yaw: E1, seated: 0.43 },
  ]);
  g.add(crowd.object); if (crowd.update) ups.push(crowd.update);
  // the late salaryman (his own little crowd, so he can be hidden): he comes from the cab end along the edge and stops
  // just short of car 1's front door as the doors meet; only in shots whose plan says `late`
  const late = await crowdJP(ctx, [{ id: "lateSalary", pos: [-0.95, 0, DOORS_CAB[0] - 0.85], yaw: 0 }]);
  g.add(late.object); ups.push((t, cam) => { late.object.visible = !!at(t).plan.late; if (late.object.visible) late.update?.(t, cam); });
  tag = "cards: leavers";
  // commuters who step off at a stop (plan `leavers`): card k plays leaver k of whatever row is on screen. Inside car 1
  // they ride with the train; at `at` they walk out across the threshold (-X) and, 0.55 m over the edge, curve away
  // along the platform. Built only when a row has them.
  const nLeave = rows.reduce((m, r) => Math.max(m, r.plan.leavers?.length ?? 0), 0);
  const leaveIds = [...new Set(rows.flatMap((r) => (r.plan.leavers ?? []).map((l) => l.who)))];
  for (let k = 0; k < nLeave; k++) {
    /** where leaver k of the row on screen is: [pos, yaw, metres walked] or null */
    const lv = (t: number): [V3, number, number] | null => {
      const r = at(t), L = r.plan.leavers?.[k]; if (!L) return null;
      const v = L.v ?? 1.3, m = Math.max(0, (t - r.t0 - L.at) * v), dA = L.from[0] + 0.05, turn = L.turn ?? 1;
      if (m <= dA) { const x = L.from[0] - m; return [[x, x > JP.edgeX + 0.02 ? 0.03 : 0, L.from[2] - trainRun(t)], -Math.PI / 2, m]; }
      const m2 = m - dA, bend = Math.min(1, m2 / 0.6);                   // a 0.6 m curve, then on along the platform (out of the doorway lens fast)
      const dir = lerp(0, turn * 1.15, bend), x = -0.3 - m2 * (1 - 0.6 * bend), z = L.from[2] - trainRun(t) + turn * m2 * (0.3 + 0.65 * bend);
      return [[x, 0, z], -Math.PI / 2 + dir, m];
    };
    for (const who of leaveIds) {
      const mine = (t: number) => at(t).plan.leavers?.[k]?.who === who;
      const card = await castMember(ctx, who as Parameters<typeof castMember>[1], { pos: (t) => lv(t)?.[0] ?? [0, -50, 0], yaw: (t) => lv(t)?.[1] ?? 0, px: 760, name: `leaver${k}_${who}`,
        act: (t, Pz) => { const q = lv(t); const walking = !!q && q[2] > 0; return { ...Pz, walk: PPL.walkPhase(q?.[2] ?? 0, "walk"), go: walking ? 1 : 0 }; } });
      g.add(card.object); ups.push((t, cam) => { card.object.visible = mine(t); if (card.object.visible) card.update?.(t, cam); });
    }
  }
  tag = "cards: passers";
  // passers-by (plan `passers`): card k plays passer k of the row on screen (straight line, real walk cycle)
  const nPass = rows.reduce((m, r) => Math.max(m, r.plan.passers?.length ?? 0), 0);
  const passIds = [...new Set(rows.flatMap((r) => (r.plan.passers ?? []).map((l) => l.who)))];
  for (let k = 0; k < nPass; k++) {
    const pv = (t: number): [V3, number, number] | null => {
      const r = at(t), P = r.plan.passers?.[k]; if (!P) return null;
      const dx = P.to[0] - P.from[0], dz = P.to[2] - P.from[2], len = Math.max(1e-3, Math.hypot(dx, dz));
      const m = Math.max(0, Math.min(len, (t - r.t0 - P.at) * (P.v ?? 1.25))), k2 = m / len, run = P.ride ? trainRun(t) : 0;
      return [[lerp(P.from[0], P.to[0], k2), lerp(P.from[1], P.to[1], k2), lerp(P.from[2], P.to[2], k2) - run], Math.atan2(dx, dz), m];
    };
    for (const who of passIds) {
      const mine = (t: number) => at(t).plan.passers?.[k]?.who === who;
      const card = await castMember(ctx, who as Parameters<typeof castMember>[1], { pos: (t) => pv(t)?.[0] ?? [0, -50, 0], yaw: (t) => pv(t)?.[1] ?? 0, px: 760, name: `passer${k}_${who}`,
        act: (t, Pz) => { const q = pv(t); return { ...Pz, walk: PPL.walkPhase(q?.[2] ?? 0, "walk"), go: q && q[2] > 0 ? 1 : 0 }; } });
      g.add(card.object); ups.push((t, cam) => { card.object.visible = mine(t); if (card.object.visible) card.update?.(t, cam); });
    }
  }
  tag = "cards: 4 walkers";
  // walkers (their own cards: a real walk cycle from the metres walked). Each SHOT re-deals where they are (a cut hides
  // it): the west aisle carries people both ways, the east aisle only beyond the kiosk (the hero corner stays clear).
  const walkers: { who: "suitA" | "officeMask" | "studentA" | "waitC"; lane: number; dir: 1 | -1; zA: number; zB: number; v: number }[] = [
    { who: "suitA", lane: -6.55, dir: 1, zA: 2, zB: 30, v: 1.3 }, { who: "officeMask", lane: -6.1, dir: -1, zA: 16, zB: 46, v: 1.18 },
    { who: "studentA", lane: -1.95, dir: 1, zA: 17, zB: 40, v: 1.24 }, { who: "waitC", lane: -2.3, dir: -1, zA: 30, zB: 62, v: 1.1 },
  ];
  for (const [i, w] of walkers.entries()) {
    const z = (t: number) => { const r = at(t); return lerp(w.zA, w.zB, hash(r.i * 17.3 + i * 7.1 + 2)) + w.dir * w.v * (t - r.t0 + 4); };
    const wk = await castMember(ctx, w.who, { pos: (t) => [w.lane + 0.12 * Math.sin(t * 0.4 + i * 2), 0, z(t)], yaw: () => (w.dir > 0 ? 0 : Math.PI), px: 640, name: "walker" + i,
      act: (t, Pz) => ({ ...Pz, walk: PPL.walkPhase(w.v * t + i * 0.37, "walk"), go: 1 }) });
    g.add(wk.object); if (wk.update) ups.push(wk.update);
  }
  tag = "cards: 3 pigeons";
  // pigeons (cartoon cards like the clown film's): on the track-2 side and under the canopy edge, never in the hero corner
  for (const [i, p] of ([[-6.8, 0, 2.5], [-1.4, 0, 13.4], [-2.9, 0, 15.2]] as V3[]).entries()) {
    const hopZ = (t: number) => p[2] - 0.12 * Math.floor(Math.max(0, (t * 0.9 + i * 0.37) % 7) / 1.2);
    const pg = await castCard(ctx, { who: "pigeon", pos: (t) => [p[0] + 0.03 * Math.sin(t * 0.7 + i), 0, hopZ(t)], yaw: (t) => Math.PI + 0.6 * Math.sin(t * 0.4 + i * 2),
      pose: (t) => { const ph = (t * 1.7 + i * 0.31) % 1; return { run: ph, flap: 0, wing: 0, peck: Math.max(0, Math.sin((t + i) * 5.0)) ** 6, lift: 0 }; }, px: 260 });
    g.add(pg.object); if (pg.update) ups.push(pg.update);
  }
  logPart("bag + cast + crowd + walkers + pigeons"); tag = "fx: crows + motes + leaves";
  // 6) fx: crows (three wheel over the houses all film long; one leaves the canopy edge every ~7 s; one off the mast when
  //    the train has gone), dust motes in the sun, a leaf skitter on the slabs
  const singles: fx.BirdPath[] = [{ center: [-30, 14, -40], radius: 16, period: 13, bob: 0.6 }, { center: [22, 17, 30], radius: 21, period: 17, phase: 2.1, bob: 0.8 }, { center: [-18, 21, 70], radius: 26, period: 21, phase: 4.0, bob: 1.0 }];
  for (let k = 0; k < 12; k++) {
    const t0 = k * 7.1 + 1.3 + 2 * hash(k + 4), zz = 12 + 26 * hash(k * 3 + 1), s = hash(k + 9) > 0.5 ? 1 : -1;
    singles.push({ from: [s > 0 ? -0.9 : -8.2, 3.95, zz], to: [s * (14 + 10 * hash(k)), 9 + 3 * hash(k + 2), zz - 26 + 20 * hash(k + 5)], t0, t1: t0 + 3.4, arc: 1.2 });
  }
  const gone = first("gone"); if (gone) singles.push({ from: [4.4, 7.9, -48], to: [-20, 12, -90], t0: gone.t0 + 0.6, t1: gone.t0 + 3.6, arc: 1.5 });
  const crows = fx.birds(ctx, { singles, size: 0.42, color: 0x1a1a1e, seed: 11 });
  g.add(crows.object); if (crows.update) ups.push(crows.update);
  const motes = fx.motes(ctx, { box: [[-8.8, 0.2, -10], [0.3, 3.4, 30]], count: 1800, seed: 3 }); g.add(motes.object); if (motes.update) ups.push(motes.update);
  const leaves = await fx.debris(ctx, "blowing", { box: [[-3.5, 0, 2], [-0.3, 0.6, 14]], count: 14, seed: 5, groundY: 0 }); g.add(leaves.object); if (leaves.update) ups.push(leaves.update);

  tag = "litter + weeds";
  // ground truth: blown plane-tree leaves, pebbles, a ticket stub / wrapper on the slabs; weeds at the platform-wall feet
  const K = TP.kiosk;
  const litter = await scatter(ctx, { area: { rect: [-8.6, -13.5, -0.45, 70] }, kinds: [{ kind: "leaf", weight: 6 }, { kind: "pebble", weight: 2 }, { kind: "paper", weight: 0.4 }, { kind: "wrapper", weight: 0.15 }],
    density: 0.55, clump: 0.7, seed: 8, avoid: [{ c: [TP.vend[0], TP.vend[2]], r: 0.75 }, { c: [TP.vend[0] - 1.04, TP.vend[2]], r: 0.75 }, { c: [(K.x0 + K.x1) / 2, K.z0 + 1.1], r: 1.4 }, { c: [(K.x0 + K.x1) / 2, K.z1 - 1.1], r: 1.4 }, { c: [K.x1 + 0.23, 10.6], r: 0.8 }] });
  g.add(litter.object); if (litter.update) ups.push(litter.update);
  const wg = new THREE.Group(); wg.position.y = JP.railTopY - 0.59 + 0.17;
  const wd = await weeds(ctx, { strips: [[[-0.12, -14], [-0.12, 70]], [[JP.track1X + 2.35, -14], [JP.track1X + 2.35, 70]], [[-8.88, -14], [-8.88, 60]]], width: 0.1, perM: 40, seed: 6 });
  wg.add(wd.object); g.add(wg); if (wd.update) ups.push(wd.update);

  tag = "misc";
  // the contact wire rings gently after the pantographs have passed (a `gone` shot)
  ups.push((t) => { BOUNCE_U.uBT.value = t; BOUNCE_U.uBA.value = at(t).plan.train === "gone" ? 0.018 : 0; BOUNCE_U.uBZ.value = 120 - trainRun(t); });
  const buildMs = performance.now() - tStart;
  let nProf = 0; const acc = new Map<string, number>();
  g.userData.buildMs = buildMs;
  logPart("fx + litter + weeds");
  let meshes = 0; g.traverse((m) => { if ((m as THREE.Mesh).isMesh) meshes++; });
  console.warn(`[jp_platform] built in ${(buildMs / 1000).toFixed(1)} s: ${meshes} meshes, ${(trisOf(g) / 1e6).toFixed(2)} M triangles | ${parts.join(" | ")}`);
  return {
    object: g,
    update: (t, cam) => {
      syncWireU(ctx);
      if (nProf >= 96) { for (const u of ups) u(t, cam); return; }
      for (let i = 0; i < ups.length; i++) { const t0 = performance.now(); ups[i](t, cam); if (nProf >= 16) acc.set(tags[i], (acc.get(tags[i]) ?? 0) + performance.now() - t0); }
      if (++nProf === 96) console.warn("[jp_platform] update CPU ms per sub-frame (mean of 80): " + [...acc].map(([k, v]) => `${k} ${(v / 80).toFixed(2)}`).join(" | ") + ` | TOTAL ${([...acc.values()].reduce((a, b) => a + b, 0) / 80).toFixed(1)}`);
    },
    // the look of THIS place under any rig (CORE round 3): clear air for the long line (golden's fog hides a signal at
    // 50 m), and the owner's warm golden trim for platform wides. Shots where the yellow suitcase is the focal point
    // (frame 0, the doorway, the plant) take `rigOpts: JP_RIG.bag` / `JP_RIG.frame0` in the shot table instead.
    hints: { groundAlbedo: [0.42, 0.42, 0.4], probe: [-2.5, 1.4, 4.5], rigOpts: JP_RIG.wide },
  };
};
/** the film's SetBuilder: the plan above on the film's shot table (loaded lazily: no top-level ../shots import) */
export const build_jp_platform = async (ctx: KitCtx): Promise<Built> => {
  const table = (await import("../shots")).SHOT_TABLE as (Row & { set?: string })[];
  const looksV3 = table.find((r) => r.id === "s01" || r.id === "v3_s01")?.set === "jp_platform";
  if (looksV3 !== (SCRIPT === "v3")) console.warn(`[jp_platform] shots.ts looks like script ${looksV3 ? "v3" : "v2"} but this set runs the ${SCRIPT} plan + cameras (SCRIPT in sets/jp_platform.cams.ts): fine while the v3 shot table is being generated, wrong after it`);
  return buildPlatform(ctx, { table });
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_jp_platform, MARKS_jp_platform } from "./jp_platform.cams";

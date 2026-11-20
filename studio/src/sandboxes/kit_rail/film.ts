// STATION sandbox film = the LOCATION SCOUT of the Tokyo platform (the film's own set builder with a scout table + plan).
// THREE FRAMES PER FRAMING: SCOUT[k] = frames 3k .. 3k + 2, the still = frame 3k + 1. Draft sheet of all of them in one
// page (the set builds once, ~1 min):
//   node scripts/kit_render.mjs --entry src/sandboxes/kit_rail/index.ts --comp KitRail --quality draft --frames 0-<3n-1> --conc 1 --out out/kit_rail/
// then keep every 3rd frame (ffmpeg select). Hero stills: stills_locked.sh, PROPS '{"kit":{"quality":"final"}}', scale 1.
// The last entry ("run") is a real 24-frame shot (the train pulling out past a creeping lens): the cost probe.
import * as THREE from "three";
import type { Film, CamState, V3, ShotDef, Built, KitCtx } from "../../kit/core/ctx";
import { lineside } from "../../kit/rail/lineside";
import { buildPlatform, JP, JP_RIG, type PlanRow } from "../../videos3/pointing/sets/jp_platform";
import { V3M, frame0Cam, payoffAccel } from "../../videos3/pointing/sets/jp_platform.cams";
import { EV, L as LOOP } from "../../videos3/pointing/timeline";
/** seconds between the payoff train starting to glide and the loop point (frame 0) */
const DT = LOOP - EV.glideB;

type Scout = { id: string; plan: PlanRow; pos: V3; look: V3; fov: number; sun?: [number, number]; fnum?: number; rig?: Record<string, number> };
const D1 = JP.door1Z;                                   // car 1's front door (the bag's door), z = 3.6
const NOBODY: PlanRow = { tourist: false, kid: false };
export const SCOUT: Scout[] = [
  // (1) FRAME 0 / the last shot: the tourist points after the departing train; the door window + the bag slide away behind him
  { id: "hero0", plan: { train: "depart", departAt: -DT, accel: payoffAccel(), tourist: { pos: V3M.frame0.tourist, yaw: -2.0, aim: "bag" } }, pos: frame0Cam(0).pos, look: frame0Cam(0).look, fov: V3M.frame0.fov, rig: JP_RIG.frame0 },
  // (2) the suitcase ALONE in the open doorway (phone-size readable): knee height, then square on
  { id: "door_knee", plan: NOBODY, pos: [-2.3, 0.72, D1 + 1.15], look: [0.42, 0.52, D1 - 0.1], fov: 38, rig: JP_RIG.bag },
  { id: "door_square", plan: NOBODY, pos: [-3.9, 1.25, D1], look: [0.3, 1.02, D1], fov: 44, rig: JP_RIG.bag },
  { id: "door_people", plan: {}, pos: [-4.4, 1.3, D1 + 1.6], look: [0.2, 1.0, D1 - 0.2], fov: 50, rig: JP_RIG.bag },
  // (3) the vending corner: from the cab end (he walks to it, his back to the bag), then the two-shot back to the door
  { id: "vend", plan: { tourist: { pos: JP.vendFront, yaw: 0.15, aim: [JP.vend[0], 1.4, JP.vend[2] - 0.4] } }, pos: [-2.6, 1.4, 2.9], look: [-4.3, 1.15, 7.7], fov: 50 },
  { id: "vend_gag", plan: { tourist: { pos: V3M.vend.tourist, yaw: V3M.vend.yaw, aim: V3M.vend.machine } }, pos: [-3.04, 1.4, 6.94], look: [-0.93, 1.15, 4.14], fov: 56, rig: JP_RIG.bag },
  // (4) from inside car 1 through the open door onto the platform (the bag in the doorway, the corner beyond)
  { id: "inside", plan: { tourist: { pos: V3M.vend.tourist, yaw: V3M.vend.yaw } }, pos: V3M.inside.cam, look: V3M.inside.look, fov: V3M.inside.fov, rig: JP_RIG.west },
  // (5) along the track to the green starting signal: beside the cab, then the empty line after the train has gone
  { id: "signal_cab", plan: NOBODY, pos: [-0.55, 1.6, 2.4], look: [-0.25, 1.45, -48], fov: 50 },
  { id: "line_gone", plan: { train: "gone", tourist: false }, pos: [-0.95, 1.5, 3.2], look: [0.5, 1.25, -60], fov: 50 },
  // the place from every side
  { id: "wide_from_cab_end", plan: {}, pos: [-6.7, 1.6, -9.5], look: [-3.4, 1.35, 20], fov: 62 },
  { id: "wide_to_cab_end", plan: {}, pos: [-2.7, 1.55, 25], look: [-2.2, 1.3, 0], fov: 58 },
  { id: "west_side", plan: {}, pos: [-1.0, 1.5, 6.4], look: [-22, 1.6, 1.5], fov: 58 },
  { id: "edge_low", plan: NOBODY, pos: [-1.55, 0.3, 10.5], look: [-0.25, 0.55, -8], fov: 55 },
  { id: "pass_orange", plan: { pass: true, passAt: -4 }, pos: [-5.2, 1.5, 2.2], look: [-10.4, 1.3, 15], fov: 58 },
  { id: "high", plan: {}, pos: [-19, 11.5, -13], look: [-3, 0, 12], fov: 55 },
  { id: "under_canopy", plan: {}, pos: [-6.4, 1.5, 15.5], look: [-3.6, 1.6, 44], fov: 60 },
  // the train's other states: rolling in (0.65 m to go, doors shut), the PLANT (knee-high along the car side as the doors
  // meet and it starts to glide; the tourist rides behind the door glass)
  { id: "arrive", plan: { train: "arrive", arriveAt: 1.2, tourist: false }, pos: [-3.9, 1.25, D1 + 0.4], look: [0.3, 1.02, D1 + 0.4], fov: 50, rig: JP_RIG.bag },
  { id: "plant", plan: { train: "depart", departAt: -0.6, tourist: { pos: [0.6, 0.03, D1 + 0.35], yaw: -Math.PI / 2, ride: true } }, pos: [-1.35, 0.55, D1 + 3.0], look: [0.1, 1.25, D1 - 0.6], fov: 58, rig: JP_RIG.bag },
  // rig trials: a clearer air for the long line / for lenses that look west into the low sun
  { id: "west_soft", plan: {}, pos: [-1.0, 1.5, 6.4], look: [-22, 1.6, 1.5], fov: 58, rig: JP_RIG.west },
  { id: "signal_clear", plan: NOBODY, pos: [-0.55, 1.6, 2.4], look: [-0.25, 1.45, -48], fov: 50, rig: { warmth: 0.8 } },
];
export const PER = 3, RUN = 24;
const TABLE = [...SCOUT.map((s, k) => ({ id: s.id, from: k * PER, to: k * PER + PER })), { id: "run", from: SCOUT.length * PER, to: SCOUT.length * PER + RUN }];
const PLAN: Record<string, PlanRow> = { ...Object.fromEntries(SCOUT.map((s) => [s.id, s.plan])), run: { train: "depart", departAt: -(DT - 1.9), accel: payoffAccel(), tourist: { pos: V3M.frame0.tourist, yaw: -2.0, aim: "bag" } } };
const T0 = (SCOUT.length * PER) / 30;
const runCam = (t: number): CamState => frame0Cam(t - T0 - 1.9);      // = the film's last shot (24 frames of it)
const fix = (s: Scout): ((t: number) => CamState) => () => ({ pos: s.pos, look: s.look, fov: s.fov, ...(s.fnum ? { fnum: s.fnum } : {}) });
// the TREADMILL's station (what the cab / car sets stop at): the lite Tokyo platform seen from a stopped cab's eye, no
// train (frames 84-86 looking ahead-left over the platform tip to the signal, 87-89 back along the platform)
const LITE0 = SCOUT.length * PER + RUN;
const buildLite = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group();
  const world = await lineside(ctx, { dist: () => 400, railTop: -1.13, stations: [{ noseAt: 400 }], signals: [{ at: 448, aspect: "G" }], seed: 1 });
  g.add(world.object);
  return { object: g, update: (t, cam) => world.update?.(t, cam), hints: { rigOpts: { fog: 0.0035 } } };
};
const LITE: { id: string; pos: V3; look: V3; fov: number }[] = [
  { id: "lite_ahead", pos: [-0.55, 1.3, 1.3], look: [-1.6, 1.0, -30], fov: 62 },
  { id: "lite_back", pos: [-0.9, 1.35, 0.6], look: [-5.2, 0.9, 9.5], fov: 62 },
];
export const FILM: Film = {
  slug: "kit_rail", fps: 30, total: LITE0 + LITE.length * PER, sets: { p: (ctx) => buildPlatform(ctx, { table: TABLE, plan: PLAN }), lite: buildLite },
  shots: [...SCOUT.map((s, k): ShotDef => ({ id: s.id, from: k * PER, to: k * PER + PER, set: "p", rig: "golden", rigOpts: { sunAz: s.sun?.[0] ?? 66, sunEl: s.sun?.[1] ?? 16, ...(s.rig ?? {}) } as ShotDef["rigOpts"], cam: fix(s) })),
    { id: "run", from: SCOUT.length * PER, to: SCOUT.length * PER + RUN, set: "p", rig: "golden", rigOpts: JP_RIG.frame0 as ShotDef["rigOpts"], cam: runCam },
    ...LITE.map((q, k): ShotDef => ({ id: q.id, from: LITE0 + k * PER, to: LITE0 + k * PER + PER, set: "lite", rig: "golden", rigOpts: { sunAz: -35, sunEl: 18 }, cam: () => ({ pos: q.pos, look: q.look, fov: q.fov }) }))],
};

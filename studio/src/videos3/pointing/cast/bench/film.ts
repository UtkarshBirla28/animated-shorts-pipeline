// CAST BENCH FILM (not part of "pointing"): the driver, the tourist and the kid as LIT cards (CARDS kit) on a Tokyo-style
// platform built from the kit (SURFACES platform() + railTrack(); STATION's vending machine and TRAIN's yellow suitcase
// when they load), under the golden rig. The acting is the REAL beat runner (moves.ts) on demo beats whose cues are
// plain bench frames: exactly what the film does with word cues.
//   trio (0-60)        the driver's call in a 3/4 front view, the kid's copy 6 f late, the tourist films, laughs, jabs
//   drvProfile (60-120) the driver's TRUE profile close: pointing on the cut, back by the ear, the snap
//   tourKid (120-180)  finger guns at the kid; the kid's cap drops over his eyes and he pushes it up
//   frame0 (240-300)   the film's FRAME 0: the driver 3/4 front, his white glove coming at the lens (the on-card lens
//                      hand + the big foreground glove card, hands.ts lensGlove, on the arm's own curve)
//   hook (180-240)     the tourist hooks the suitcase wheel with his foot without looking (the bag follows hookK); the
//                      kid's URGENT point at the bag
// This file never imports shots.ts (another owner's broken set file cannot break the bench).
import * as THREE from "three";
import type { Film, KitCtx, Built, SetBuilder, V3 } from "../../../../kit/core/ctx";
import { lockedWithDrift } from "../../../../kit/core/camera";
import { platform, railTrack } from "../../../../kit/surfaces/ground";
import { castCardOf } from "../member";
import { actBeats, timeBeats, hookK, pointK, type Beat, type Resolver } from "../moves";
import { lensGlove } from "../hands";
import type { Who } from "../people";

const SIGNAL: V3 = [-3.6, 3.2, -60], AIM_L: V3 = [-5, 2.4, -1];
// marks per shot (a 9:16 frame is narrow: three across in the trio, two close together in the two-shots)
const DRVS: V3[] = [[0.15, 0, -3.3], [0.15, 0, -3.3], [-1.5, 0, -5.4], [-1.5, 0, -5.4], [0.15, 0, -3.3]], TOURS: V3[] = [[0.82, 0, -2.6], [0.82, 0, -2.6], [0.55, 0, -2.5], [0.55, 0, -2.5], [-0.75, 0, -4.4]];
const KIDS: V3[] = [[-0.5, 0, -2.7], [-0.5, 0, -2.7], [-0.32, 0, -2.6], [-0.45, 0, -2.55], [-0.3, 0, -4.2]];
const DRV = DRVS[0], TOUR = TOURS[2], KID = KIDS[2];
const HOOK0 = 190, BAG0: V3 = [0.13, 0, -2.9], BAGD: V3 = [0.133, 0, 0.171];
const shotOf = (t: number) => (t < 2 ? 0 : t < 4 ? 1 : t < 6 ? 2 : t < 8 ? 3 : 4);
// frame 0 of the film, rebuilt on the bench: the lens looks back at the driver (3/4 front); his glove comes at it
const F0 = 240, CAM0: V3 = [0.78, 1.22, -1.75], LOOK0: V3 = [0.17, 1.2, -3.3];
const bagAt = (t: number): V3 => { if (shotOf(t) < 2) return [0.5, 0, -3.05]; const d = hookK(t * 30, HOOK0).drag; return [BAG0[0] + BAGD[0] * d, 0, BAG0[2] + BAGD[2] * d]; };

const R: Resolver = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: (f) => 60 * (Math.floor(f / 60) + 1) };
export const BENCH_BEATS: Beat[] = [
  // trio
  { who: "driver", m: "call", name: 8, status: 36, rise: 0, until: 56 },
  { who: "kid", m: "call", name: 8, status: 36, rise: 0, until: 56, style: "kid" },
  { who: "tourist", m: "film", at: -30, until: 116 }, { who: "tourist", m: "laugh", at: 0, until: 28, hand: false }, { who: "tourist", m: "jab", at: 30, until: 58 },
  // drvProfile
  { who: "driver", m: "call", name: 62, status: 92, out: 60, until: 118 },
  // tourKid
  { who: "tourist", m: "guns", at: 126, until: 174 },
  { who: "kid", m: "capDrop", at: 124, hold: 16 },
  // hook
  { who: "tourist", m: "film", at: 176, until: 300 }, { who: "tourist", m: "look", at: 176, until: 300, to: "phone" }, { who: "tourist", m: "hook", at: HOOK0, leg: "R", reach: [-0.04, 0.3] },
  { who: "kid", m: "urgent", at: 196, until: 236 },
  // frame0: the arm is ~60 % out on the cut and lands 4 f later (overshoot, settle); the tourist laughs behind; the kid copies late
  { who: "driver", m: "point", at: F0 - 2, until: 400, move: 6 }, { who: "driver", m: "face", at: F0 - 10, until: 400, expr: "bright", browUp: -1.5, mouth: "dash" },
  { who: "tourist", m: "film", at: 236, until: 400 }, { who: "tourist", m: "laugh", at: 236, until: 400, hand: false },
  { who: "kid", m: "point", at: F0 + 4, until: 400, move: 5, hs: 1.3 }, { who: "kid", m: "tongue", at: F0 + 4, until: 400 },
];
const TIMED = timeBeats(BENCH_BEATS, R);
const actor = (who: Who) => (e: Parameters<typeof actBeats>[2]) => actBeats(who, TIMED, e);

const buildBench: SetBuilder = async (ctx: KitCtx): Promise<Built> => {
  const root = new THREE.Group(); root.name = "castBench";
  const kids: Built[] = [];
  const pf = await platform(ctx, { x0: -2.0, x1: 7, z0: -46, z1: 10, y: -1.1, h: 1.1, seed: 3 }); root.add(pf.object); kids.push(pf);
  const tr = await railTrack(ctx, { x: -3.6, z0: -80, z1: 12, y: 0, seed: 4 });
  tr.object.position.y = -1.1 - (tr as unknown as { railTopY: number }).railTopY; root.add(tr.object); kids.push(tr);
  try { // STATION's vending machine (in progress elsewhere: optional)
    const st = await import("../../../../kit/rail/station");
    const vm = await st.vendingMachine(ctx, { pos: [3.4, 0, -6.5], yaw: -Math.PI / 2 }); root.add(vm.object); kids.push(vm as Built);
  } catch (e) { console.warn("bench: vending machine skipped", String(e).slice(0, 120)); }
  try { // TRAIN's yellow suitcase (optional): beside the tourist; in the last shot his foot drags it in
    const { suitcase } = await import("../../../../kit/vehicles/suitcase");
    const bag = await suitcase(ctx, { pos: bagAt, yaw: 0.5, handle: 0.6, tMax: 9 }); root.add(bag.object); kids.push(bag);
  } catch (e) { console.warn("bench: suitcase skipped", String(e).slice(0, 120)); }
  // a far backdrop wall so the frame is not empty sky behind the platform
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 9), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.6, 0.56), roughness: 0.9 }));
  wall.position.set(9, 3.4, -20); wall.rotation.y = -Math.PI / 2; wall.receiveShadow = true; root.add(wall);
  // ---- the three heroes: the beat runner, an aim / a look per shot (as a set gives them)
  const kidHead: V3 = [KID[0], 0.98, KID[2]], drvHead: V3 = [DRV[0], 1.35, DRV[2]], tourHead: V3 = [TOUR[0], 1.42, TOUR[2]];
  const at = (M: V3[]) => (t: number) => M[shotOf(t)];
  const drv = await castCardOf(ctx, "driver", { lensHand: false, pos: at(DRVS), yaw: (t) => (shotOf(t) === 1 ? Math.PI : shotOf(t) === 4 ? -0.12 : -0.6435), aim: (t) => (shotOf(t) === 1 ? SIGNAL : shotOf(t) === 4 ? [CAM0[0] + 0.25, CAM0[1] - 0.02, CAM0[2] + 0.5] : AIM_L) }, actor("driver"));
  // the glove that comes at the lens: a foreground card 0.5 m from the camera (the real depth of field softens it), on the
  // arm's own curve (pointK of the driver's beat)
  const vd = new THREE.Vector3(LOOK0[0] - CAM0[0], LOOK0[1] - CAM0[1], LOOK0[2] - CAM0[2]).normalize(), vr = new THREE.Vector3().crossVectors(vd, new THREE.Vector3(0, 1, 0)).normalize();
  const gk = (t: number) => pointK(t * 30, F0 - 2, 400, { move: 6 });
  const glove = await lensGlove(ctx, { who: "driver", sizeM: 0.22, from: -0.5, side: -1, k: gk,
    pos: (t) => { if (shotOf(t) !== 4) return [-40, 0, -40]; const d = 0.62 - 0.1 * Math.min(1.2, Math.max(0, gk(t))); return [CAM0[0] + vd.x * d - vr.x * 0.035, CAM0[1] + vd.y * d - 0.215, CAM0[2] + vd.z * d - vr.z * 0.035]; } });
  root.add(glove.object); kids.push(glove);
  const tour = await castCardOf(ctx, "tourist", { pos: at(TOURS), aim: () => [drvHead[0], 1.0, drvHead[2]], look: (t) => (shotOf(t) === 2 ? kidHead : null), yaw: (t) => (shotOf(t) === 4 ? 0.35 : -0.78) }, actor("tourist"));
  const kid = await castCardOf(ctx, "kid", { pos: at(KIDS), yaw: (t) => (shotOf(t) === 0 ? -Math.PI / 2 : shotOf(t) === 3 ? 1.25 : 0.9),
    aim: (t) => (shotOf(t) === 3 ? [bagAt(t)[0], 0.4, bagAt(t)[2]] : AIM_L), look: (t) => (shotOf(t) === 3 ? tourHead : null) }, actor("kid"));
  for (const b of [drv, tour, kid]) { root.add(b.object); kids.push(b); }
  return { object: root, update: (t, cam) => { for (const b of kids) b.update?.(t, cam); }, hints: { probe: [0.4, 1.2, -3] } };
};

const cam = (pos: V3, look: V3, fov: number, from: number, drift: V3 = [0.05, 0, -0.04]) => (t: number) => lockedWithDrift({ pos, look, fov, drift, shake: 0.05 }, 2)(t - from / 30);
export const BENCH: Film = {
  slug: "pointing_cast_bench", fps: 30, total: 300,
  sets: { bench: buildBench },
  shots: [
    { id: "trio", from: 0, to: 60, set: "bench", rig: "golden", rigOpts: { sunAz: 150, sunEl: 24 }, cam: cam([0.16, 1.05, 1.75], [0.16, 0.8, -3.0], 50, 0) },
    { id: "drvProfile", from: 60, to: 120, set: "bench", rig: "golden", rigOpts: { sunAz: 40, sunEl: 20 }, cam: cam([2.25, 1.28, -3.75], [0.15, 1.2, -3.5], 40, 60) },
    { id: "tourKid", from: 120, to: 180, set: "bench", rig: "golden", rigOpts: { sunAz: 95, sunEl: 22 }, cam: cam([0.12, 1.0, 0.95], [0.12, 0.78, -2.6], 46, 120) },
    { id: "hook", from: 180, to: 240, set: "bench", rig: "golden", rigOpts: { sunAz: 150, sunEl: 24 }, cam: cam([0.1, 0.95, 1.0], [0.1, 0.7, -2.6], 46, 180) },
    { id: "frame0", from: 240, to: 300, set: "bench", rig: "golden", rigOpts: { sunAz: 160, sunEl: 20 }, cam: cam(CAM0, LOOK0, 40, 240, [-0.06, 0, -0.1]) },
  ],
};

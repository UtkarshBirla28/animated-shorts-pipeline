// CAMERAS of the shots on set 'cab' (TRAIN owner). Set frame = the train frame of kit/vehicles with the CAR FLOOR at
// y = 0: the nose at z = 0, the cab partition at z = 2.15 (D.cabDepth), the driver's desk on the LEFT (x < 0, he sits
// at x = -0.83, z ~1.4, eyes ~1.3 m), the world scrolls past toward +Z (kit/rail lineside). Every framing is ONE calm
// move that never stops (a slide with a push, or a small orbit; CORE's camSpeedStats: 0.3-0.9 % of the frame per
// frame, nothing under 0.15, no peak over 4.2) + a little handheld. Framings are NAMED (FRAMES_cab) and mapped to the
// locked outline's shot ids in BY_SHOT. Moves run over the whole shot (frames from the DIRECTOR's clock).
import type { CamState, V3 } from "../../../kit/core/ctx";
import { EASE, withShake } from "../../../kit/core/camera";
import { D } from "../../../kit/vehicles/dims";
import type { ShotCam } from "../camkit";
import { trainRun, greenLampOf } from "./train_plan";

export type Pose = { p: V3; l: V3; fov?: number };
const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const c01 = (x: number) => Math.max(0, Math.min(1, x));
/** eases: CORE's + `soft` (mostly linear, soft ends: a move that is still travelling at both cuts) + `outQuad` (fastest
 *  first, peak = 2 x the average) */
export const EZ: Record<string, (x: number) => number> = { ...EASE,
  soft: (x) => { const u = c01(x); return 0.65 * u + 0.35 * u * u * (3 - 2 * u); },
  outQuad: (x) => { const u = 1 - c01(x); return 1 - u * u; } };
const lerpPose = (a: Pose, b: Pose, k: number): CamState => ({ pos: mix(a.p, b.p, k), look: mix(a.l, b.l, k), fov: (a.fov ?? 55) + ((b.fov ?? a.fov ?? 55) - (a.fov ?? 55)) * k });
type Opt = { ease?: string; shake?: number; seed?: number; focus?: number; fnum?: number };
const fin = (c: CamState, u: number, o: Opt): CamState => withShake({ ...c, ...(o.focus ? { focus: o.focus } : {}), ...(o.fnum ? { fnum: o.fnum } : {}) }, u, o.shake ?? 0.15, o.seed ?? 3);
/** one move from pose a to pose b over the shot (frames from..to), with a seeded handheld */
export const glide = (a: Pose, b: Pose, o: Opt = {}): ShotCam => (from, to) => (t) => {
  const u = t - from / 30, k = EZ[o.ease ?? "soft"](u / Math.max(1e-3, (to - from) / 30));
  return fin(lerpPose(a, b, k), u, o);
};
/** several moves in a row: knots = [frame after the shot's start (a number <= 1 = that share of the shot), pose, the
 *  ease INTO this knot]; the first knot is the pose on the cut */
export const path = (knots: [at: number, pose: Pose, ease?: string][], o: Opt = {}): ShotCam => (from, to) => {
  const n = to - from, F = knots.map(([at]) => (at <= 1 ? at * n : at));
  return (t) => {
    const f = t * 30 - from, u = t - from / 30;
    let i = 1; while (i < knots.length - 1 && f > F[i]) i++;
    const k = EZ[knots[i][2] ?? "soft"]((f - F[i - 1]) / Math.max(1e-3, F[i] - F[i - 1]));
    return fin(lerpPose(knots[i - 1][1], knots[i][1], k), u, o);
  };
};

export const MARKS_cab: Record<string, V3> = {
  glove: [-0.62, 1.32, 0.75],     // where the driver's right glove points from (over the desk)
  speedo: [-0.83, 0.93, 0.555],
  pilot: [-0.415, 0.985, 0.532],
  head: [-0.83, 1.3, 1.4],
  kidAtGlass: [0.6, 1.0, 2.28],   // the boy's face at the RIGHT partition window (car side)
};
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** [s03] THE GLOVE AND THE GREEN LAMP: a slow orbit from behind his right shoulder toward his right side with a push
 *  (the lens rises a little and comes in over the desk, the view narrows 56 -> 50). The frame is AIMED BY THE LAMP: the
 *  green lamp is in frame from the first frame (a little right of centre, 36 % down) and drifts to the middle while
 *  the glove comes up beside it from the lower left (CAST lands the hand on the aim's place on screen; sets/cab.ts aims
 *  him just under the lamp). Focus far (the lamp and the track sharp, the sleeve a little soft). */
const behindCam: ShotCam = (from, to) => {
  const R = trainRun(), lamp = greenLampOf(R, D.floor), dur = Math.max(1e-3, (to - from) / 30);
  const C0: V3 = [-0.5, 1.53, 2.06], C1: V3 = [-0.36, 1.47, 1.9];
  return (t) => {
    const u = t - from / 30, k = EZ.soft(u / dur), pos = mix(C0, C1, k), fov = 56 - 6 * k;
    const d = nrm(sub(lamp(t), pos)), right = nrm(cross(d, [0, 1, 0])), up = cross(right, d), th = Math.tan((fov * Math.PI) / 360);
    // where the lamp sits on screen (-1..1 from the centre; +x right, +y up)
    // (T-11: the lamp starts HIGH, 22 % down, so the rising glove is above the caption band from the cut)
    const nx = 0.16 - 0.2 * k, ny = 0.66 - 0.42 * k;
    const v = nrm([d[0] - right[0] * nx * th * (9 / 16) - up[0] * ny * th, d[1] - right[1] * nx * th * (9 / 16) - up[1] * ny * th, d[2] - right[2] * nx * th * (9 / 16) - up[2] * ny * th]);
    // the look point is the glove's distance (what fills the frame: the arm, the desk, the window posts)
    return withShake({ pos, look: [pos[0] + v[0] * 1.1, pos[1] + v[1] * 1.1, pos[2] + v[2] * 1.1], fov, focus: 30, fnum: 5.6 }, u, 0.12, 11);
  };
};
/** [s03, T-11] THE GLOVE AND THE GREEN LAMP, from his right shoulder at SHOULDER height (lower than the old `behind`: the
 *  near glove and the far lamp sit closer together vertically, both above the caption keep-out 65.6-75 %), the lamp high
 *  on the cut (15 % down) drifting toward the middle, a small orbit toward his right side with a push (fov 56 -> 50).
 *  T-13 (his FACE in s03) is NOT solvable by this lens: any lens that sees the lamp straight ahead is behind his face
 *  plane, and a vertical frame cannot hold a profile and the far lamp together. The full orbit to his profile was tried
 *  (02:10-02:20): peak 9.9 %/f, and inside the budget it only reaches a three-quarter BACK view (no eye) while losing the
 *  lamp: `w` (the turn to his face) is left in the code at 0. His face needs its own picture (a cut-in: the DIRECTOR's). */
const faceCam: ShotCam = (from, to) => {
  const R = trainRun(), lamp = greenLampOf(R, D.floor), dur = Math.max(1e-3, (to - from) / 30);
  const C0: V3 = [-0.5, 1.4, 2.06], Cm: V3 = [-0.46, 1.4, 2.05], C1: V3 = [-0.42, 1.4, 2.03];   // (0.8 s since s03b: a calmer, shorter move)
  const F: V3 = [-0.66, 1.34, 1.12];          // the end frame's centre: the glove ahead, his cap + cheek at the left edge
  const ss = (a: number, b: number, x: number) => { const q = c01((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  return (t) => {
    const u = t - from / 30, k = EZ.soft(u / dur), k2 = 1 - k;
    const pos: V3 = [k2 * k2 * C0[0] + 2 * k * k2 * Cm[0] + k * k * C1[0], k2 * k2 * C0[1] + 2 * k * k2 * Cm[1] + k * k * C1[1], k2 * k2 * C0[2] + 2 * k * k2 * Cm[2] + k * k * C1[2]];
    const fov = 56 - 6 * k;
    const d = nrm(sub(lamp(t), pos)), right = nrm(cross(d, [0, 1, 0])), up = cross(right, d), th = Math.tan((fov * Math.PI) / 360);
    // the lamp's place on screen (-1..1 from the centre; +x right, +y up): high and a little right on the cut
    const nx = 0.2 - 0.06 * k, ny = 0.7 - 0.14 * k;   // (T-11: the lamp ~19 % down on the cut, the rising glove above the keep-out band)
    const vL = nrm([d[0] - right[0] * nx * th * (9 / 16) - up[0] * ny * th, d[1] - right[1] * nx * th * (9 / 16) - up[1] * ny * th, d[2] - right[2] * nx * th * (9 / 16) - up[2] * ny * th]);
    const vF = nrm(sub(F, pos)), w = 0 * ss(0.35, 0.85, k);   // the turn to his face is OFF: see the note above
    const v = nrm([vL[0] * (1 - w) + vF[0] * w, vL[1] * (1 - w) + vF[1] * w, vL[2] * (1 - w) + vF[2] * w]);
    return withShake({ pos, look: [pos[0] + v[0] * 1.1, pos[1] + v[1] * 1.1, pos[2] + v[2] * 1.1], fov, focus: 30 * (1 - w) + 1.0 * w, fnum: 5.6 }, u, 0.12, 11);
  };
};
/** the cab's framings (the locked outline's shot in brackets) */
export const FRAMES_cab = {
  behind: behindCam,
  face: faceCam,
  // an orbit to his right profile over the desk (it loses the track: for a beat on the instruments)
  profile: glide({ p: [-0.22, 1.52, 2.04], l: [-0.6, 1.33, 0.0], fov: 58 }, { p: [0.22, 1.4, 1.42], l: [-0.84, 1.28, 0.72], fov: 58 }, { shake: 0.15, seed: 13 }),
  // the cab from behind the driver, straight down the track, THROUGH the partition window behind him (the lens stands in
  // the car, 0.8 m behind the glass: a cartoon head is ~0.5 m wide, any closer and his cap fills the frame)
  behindWide: glide({ p: [-0.5, 1.56, 3.05], l: [-0.92, 1.38, -20], fov: 50 }, { p: [-0.68, 1.5, 2.86], l: [-0.92, 1.38, -20], fov: 50 }, { shake: 0.2, seed: 7 }),
  // the front three-quarter of the driver pointing (from over the right-hand cabinet): a small orbit with a push
  threeQ: glide({ p: [0.46, 1.42, 0.36], l: [-0.86, 1.2, 1.5], fov: 60 }, { p: [0.16, 1.34, 0.56], l: [-0.86, 1.2, 1.5], fov: 58 }, { shake: 0.12, seed: 25 }),
  // [s06] from the cab, looking back through the RIGHT partition window, which fills the frame (train forward = behind
  // the lens; the car's right wall at screen left): the boy held up at the glass by his mum at screen left (his
  // chest and both arms over the sill: his copy of the point, the cap that drops; his face ~14 -> 16 % of the frame
  // height), the suitcase's yellow top rolling in along the window's bottom edge at screen right and bumping the wall
  // (EV.bagBump); the driver's white glove soft in the near bottom-right corner (sets/cab.ts, CAST's lensGlove). A
  // slide across the cab to the window's axis with a push, the lens sinking a little
  // (Block 14b: a PUSH THROUGH the window frame: it starts back with the frame's edges in the picture and slides them out;
  // the look travels with the lens; the old re-aim measured 0.25 %/f on screen)
  partition: glide({ p: [0.62, 1.44, 0.3], l: [0.84, 1.2, 2.3], fov: 56 }, { p: [0.95, 1.3, 1.0], l: [0.98, 1.12, 2.3], fov: 54 }, { shake: 0.12, seed: 12 }),
  // [s03b] THE DRIVER'S FACE (the lead's decision, Block 13): inside the cab, ahead of him and to his right (the
  // windscreen side), a FRONT THREE-QUARTER ~35 deg off his nose line; his face ~27 % of the frame height, eyes ~35 %
  // down, cap brim whole; the low sun through the windscreen keys his cheek, badge and white glove; behind him the cab
  // (the right side window with the lineside streaming, the partition). A slow straight push, no orbit. His snap on
  // "green!" goes out past the lens's LEFT side (screen right is his left... the lamp is ahead: off the lens's side)
  faceFront: glide({ p: [-0.1, 1.42, 0.34], l: [-0.83, 1.25, 1.42], fov: 64 }, { p: [-0.24, 1.41, 0.56], l: [-0.83, 1.25, 1.42], fov: 56 }, { shake: 0.1, seed: 31, focus: 1.1, fnum: 6.3 }),   // (f/6.3: the cab behind him readable, the blur gate at final) 0.52 / 0.58 %/f (own camSpeedStats on frames 164-212)
  // [s21] at the station, from behind and above his right shoulder (0.75 m back: closer, his cartoon head fills the
  // frame), down at the sloped desk: his cap + head in the left third, his arm down to the lamp (T-10 / T-13: the driver must be in it) (the panel faces him, so it
  // faces this lens: from beside him it is edge-on): the small DARK door lamp with its pale door pictogram (the
  // bezel ~15 % of the frame width; the outline asks >= 6 %), the white glove coming in from the left, already
  // straight at it. A HOLD in the script: only a breath of push. (His profile and the lamp's face cannot be in one
  // frame: from across the cab the sloped panel is seen edge-on, see `lamp` below)
  // (T-10 / T-17 / Block 14: behind and above his right shoulder, but the lens stays INSIDE the cab the whole shot (the
  // preview's lens started at z 2.2, behind the partition: a black mass for 0.4 s); a longer lens (fov 40) so the door
  // lamp + its icon are big; a gentle push. "From above the desk in front of him" was tried at 03:10: the panel and
  // his face cannot share that frame either)
  lampOver: glide({ p: [-0.4, 1.66, 2.02], l: [-0.6, 0.97, 0.6], fov: 46 }, { p: [-0.41, 1.63, 1.87], l: [-0.6, 0.97, 0.6], fov: 45 }, { shake: 0.08, seed: 19 }),
  // from across the cab (the lens over the right-hand cabinet): his right profile at frame left, his arm out to the
  // desk; the instrument panel is edge-on from here (no lamp face)
  lamp: glide({ p: [1.2, 1.31, 1.04], l: [-0.63, 1.1, 0.97], fov: 52 }, { p: [1.13, 1.29, 0.98], l: [-0.63, 1.09, 0.96], fov: 51.6 }, { shake: 0.1, seed: 19 }),
  // the pilot lamp + the speedometer close, from his right
  lampClose: glide({ p: [0.18, 1.3, 1.12], l: [-0.5, 1.0, 0.58], fov: 46 }, { p: [-0.02, 1.18, 0.93], l: [-0.48, 0.99, 0.56], fov: 46 }, { shake: 0.1, seed: 21 }),
  // the instruments from the driver's eyes (the speedometer, the pilot lamp, the watch)
  desk: glide({ p: [-0.84, 1.4, 1.36], l: [-0.74, 0.9, 0.55], fov: 50 }, { p: [-0.68, 1.28, 1.16], l: [-0.58, 0.93, 0.55], fov: 50 }, { shake: 0.1, seed: 5 }),
};
/** shot id -> framing, with EXACTLY the locked outline's ids: s03 the cab + the green lamp, s06 looking back through
 *  the partition glass, s21 the hold on the dark door lamp. The DIRECTOR's cams.ts looks a shot up in the table of its
 *  OWN set, "v3_<id>" first, then the plain id: both forms are keyed, to the same camera. */
const BY_SHOT: Record<string, keyof typeof FRAMES_cab> = { s03: "face", s03b: "faceFront", s06: "partition", s21: "lampOver" };
export const CAMS_cab: Record<string, ShotCam> = Object.fromEntries(Object.entries(BY_SHOT).flatMap(([id, k]) => [[id, FRAMES_cab[k]], ["v3_" + id, FRAMES_cab[k]]]));
export type { CamState };

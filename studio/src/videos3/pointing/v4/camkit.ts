// v4 CAMERA RULES (DIRECTOR): every v4 shot GLIDES, then RESTS. The rest is the owner's rule from the benchmark (our best
// film holds 15.6 % of its frames, the references ~11.5 %; v1 held 0 % and crept for 83 %). A shot's camera:
//   1) the owner's camera for the shot (v4/sets/<set>.cams via CAMS[id]), else the director's default view of the set;
//   2) wrapped by `withRest`: the camera is FROZEN for the last `rest` frames (restFrames: 10-14 f, 6-8 f under
//      1.2 s; round 1): no creep, no shake, no focus breathing while the picture lands.
//   3) a shot plan `drift` adds the director's slow push (or pull) on top of a STILL owner camera (cams.ts).
// Owners write ONE clean move (a glide: ease in-out, 0.3-1.2 %/frame on screen) and nothing else; the rest is added here.
import type { CamState, V3 } from "../../../kit/core/ctx";

export type ShotCam = (from: number, to: number) => (t: number) => CamState;
const FPS = 30;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/** ease in-out (one smoothstep: starts and lands softly; 2026-11-20 evening: was smoothstep of smoothstep, whose long
 *  near-zero ends read as standing still: the film held 46 % of its frames) */
/** the glide's ease (lead 2026-11-21, round 1: "more of the picture moving"): half smoothstep, half ease-out, so the move
 *  starts ON the cut at half speed (no dead first frames) and still lands softly into the rest */
export const easeGlide = (u: number) => { const s = Math.max(0, Math.min(1, u)); return 0.5 * s * s * (3 - 2 * s) + 0.5 * s * (2 - s); };

/** the REST of a shot, in frames (2026-11-20 evening, the hold-frame fix: the film held 46 %, target 12-20 %):
 *  shots under 36 f (1.2 s): 8-10 f; longer shots: 15-20 f (an asked `rest` is clamped into that band); never more than
 *  40 % of the shot. Shots whose stillness IS the picture are FREEZE shots (cams.ts FREEZE), not long rests. */
export const restFrames = (from: number, to: number, rest?: number) => {
  // round 1 (lead 2026-11-21: moving area 6.9 % vs 13-17 % for the references, hold 18.0 %): shorter rests, longer glides:
  // under 36 f: 6-8 f; longer shots: 10-14 f (was 8-10 / 15-20); never more than 35 % of the shot
  if (rest === 0) return 0;   // rest: 0 = NO rest: the move never stops (audit r1: the shock beat v04 / v05 must not freeze)
  const n = to - from, want = rest ?? 12;
  const r = n < 36 ? Math.min(8, Math.max(6, want)) : Math.min(14, Math.max(10, want));
  return Math.max(1, Math.min(r, Math.round(n * 0.35)));
};
/** FREEZE a camera for the last `rest` frames of [from, to): the picture lands and holds */
export const withRest = (cam: (t: number) => CamState, from: number, to: number, rest?: number) => {
  const tStop = (to - restFrames(from, to, rest)) / FPS;
  const still = cam(tStop);
  return (t: number): CamState => (t >= tStop ? still : cam(t));
};

export type View = { pos: V3; look: V3; fov: number; fnum?: number };
/** ONE glide from view A to view B over the moving part of the shot, then still. The template camera of every v4 shot */
export const glideRest = (a: View, b: View, rest?: number): ShotCam => (from, to) => {
  const t0 = from / FPS, t1 = (to - restFrames(from, to, rest)) / FPS;
  return (t: number): CamState => {
    const u = easeGlide((t - t0) / Math.max(1e-3, t1 - t0));
    const pos = lerp3(a.pos, b.pos, u), look = lerp3(a.look, b.look, u);
    return { pos, look, fov: lerp(a.fov, b.fov, u), fnum: b.fnum ?? 8, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) };
  };
};
/** a small push toward the look point (`push` metres) from one view: the simplest glide-then-rest */
export const pushRest = (v: View, push = 0.35, rest?: number): ShotCam => {
  const d = [v.look[0] - v.pos[0], v.look[1] - v.pos[1], v.look[2] - v.pos[2]], l = Math.hypot(d[0], d[1], d[2]) || 1;
  const b: View = { ...v, pos: [v.pos[0] + (d[0] / l) * push, v.pos[1] + (d[1] / l) * push, v.pos[2] + (d[2] / l) * push] };
  return glideRest(v, b, rest);
};
/** a sideways slide (`slide` metres, + = to the lens's right), look point fixed: parallax, then rest */
export const slideRest = (v: View, slide = 0.4, rest?: number): ShotCam => {
  const f = [v.look[0] - v.pos[0], 0, v.look[2] - v.pos[2]], l = Math.hypot(f[0], f[2]) || 1, r: V3 = [-f[2] / l, 0, f[0] / l];
  const a: View = { ...v, pos: [v.pos[0] - (r[0] * slide) / 2, v.pos[1], v.pos[2] - (r[2] * slide) / 2] };
  const b: View = { ...v, pos: [v.pos[0] + (r[0] * slide) / 2, v.pos[1], v.pos[2] + (r[2] * slide) / 2] };
  return glideRest(a, b, rest);
};

/** the DIRECTOR'S DEFAULT VIEW per set (wide, crisp, people small / medium): used until the owner has a camera for the
 *  shot, so every v4 shot renders from day one (lookdev's wide lenses; the steam set: TRAIN's event framing's start) */
export const DEFAULT_VIEW: Record<string, View> = {
  cab: { pos: [0.55, 1.7, 2.0], look: [-0.45, 1.5, -0.6], fov: 72 },
  car: { pos: [0.15, 1.6, 12.5], look: [0.0, 1.2, 2.5], fov: 64 },
  jp_platform: { pos: [-6.2, 1.3, 1.2], look: [-0.4, 2.05, 6.5], fov: 62 },
  lab: { pos: [1.6, 1.7, 2.6], look: [-0.5, 0.95, -0.6], fov: 64 },
  kitchen: { pos: [1.6, 1.45, 1.6], look: [0.4, 0.95, -0.7], fov: 70 },
  ny_station: { pos: [-6.5, 2.1, 1.2], look: [2.0, 1.2, 3.2], fov: 66 },
  steam: { pos: [-9.5, 1.0, -20.0], look: [0.0, 2.6, 5.0], fov: 40 },
};

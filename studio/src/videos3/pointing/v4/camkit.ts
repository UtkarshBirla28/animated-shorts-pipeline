// v4 CAMERA RULES (DIRECTOR): every v4 shot GLIDES, then RESTS. The rest is the owner's rule from the benchmark (our best
// film holds 15.6 % of its frames, the references ~11.5 %; v1 held 0 % and crept for 83 %). A shot's camera:
//   1) the owner's camera for the shot (v4/sets/<set>.cams via CAMS[id]), else the director's default view of the set;
//   2) wrapped by `withRest`: the camera is FROZEN for the last `rest` frames (default 20; short shots 30 % of their
//      length, at least 15): no creep, no shake, no focus breathing while the picture lands.
// Owners write ONE clean move (a glide: ease in-out, 0.3-1.2 %/frame on screen) and nothing else; the rest is added here.
import type { CamState, V3 } from "../../../kit/core/ctx";

export type ShotCam = (from: number, to: number) => (t: number) => CamState;
const FPS = 30;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/** ease in-out (smoothstep of smoothstep: starts and lands softly, no creep at the ends) */
export const easeGlide = (u: number) => { const s = Math.max(0, Math.min(1, u)); const a = s * s * (3 - 2 * s); return a * a * (3 - 2 * a); };

/** the rest of a shot, in frames: `rest` if given, else 20, never more than 40 % of the shot, at least 15 (or the shot) */
export const restFrames = (from: number, to: number, rest?: number) => {
  const n = to - from; const want = rest ?? 20;
  return Math.max(Math.min(15, n), Math.min(want, Math.round(n * 0.4)));
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

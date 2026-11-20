// CAMERAS of the shots on set 'kitchen' (owner HOME_LAB) + the set's timing constants. Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/pointing/film.ts (targets: tools/v3/targets.json).
// s15 POV (bible: povHandheld, fov 68, eye height 1.6, 4.2 -> 1.3 m from the knobs, shake 1.0): standing in the open
// doorway already looking back down the hall at the hob, the hand on the lever (CAST's povHand); it lets go ~30 % into the
// shot ("check"), walks ~2.1 m back down the hall with a step bob, then leans in over the knobs (~1.05 m away).
// NOTE: no import of ../cast here (cams.ts is evaluated inside shots.ts: a cast import would be a module cycle).
import type { CamState, V3 } from "../../../kit/core/ctx";
import { shotCam, withShake, EASE } from "../../../kit/core/camera";
import type { ShotCam } from "../camkit";
import { kick } from "../../../kit/home/util";

/** layout + time functions of the set (t = film seconds). t0 is the s15 start, set when shots.ts builds the camera */
export const KITCHEN = {
  t0: 1139 / 30, dur: 131 / 30,
  hobX: 1.05,                                  // hob centre along the counter run (counter-local x; world z = hobX - 1.7)
  /** the door: open 66 deg; when the hand lets go it drifts 3 deg further and settles */
  doorOpen: (t: number) => (66 * Math.PI) / 180 + (3 * Math.PI / 180) * Math.min(1, Math.max(0, (t - KITCHEN.letGo()) / 0.6)) + kick(t, KITCHEN.letGo(), 0.012, 1.6, 3.2),
  /** both knobs straight UP = OFF the whole shot */
  knob: (_i: number, _t: number) => 0,
  /** the hand lets go of the lever: CAST's word "check" (#3) when the set has read it (build time), else 29 % into the shot */
  letGoAt: NaN as number, everAt: NaN as number,
  letGo: () => (Number.isFinite(KITCHEN.letGoAt) ? KITCHEN.letGoAt : KITCHEN.t0 + 0.29 * KITCHEN.dur),
};
export const KT = {
  /** key-ring kicks: the hand closing on the lever (small), letting go (big) */
  keyKicks: () => [{ t: (Number.isFinite(KITCHEN.everAt) ? KITCHEN.everAt : KITCHEN.t0) + 0.12, amp: 0.12 }, { t: KITCHEN.letGo(), amp: 0.38 }, { t: KITCHEN.letGo() + 0.55, amp: -0.12 }],
};

export const MARKS_kitchen: Record<string, V3> = {
  "s15": [0.85, 0.77, -0.65],  // the hob knobs (look target); the POV starts in the front doorway
};
const P0: V3 = [0.72, 1.62, 2.42], P1: V3 = [0.32, 1.6, 0.42], P2: V3 = [0.32, 1.5, -0.22];
const L0: V3 = [0.78, 0.9, -0.72], L1: V3 = [0.86, 0.8, -0.66];
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const povKitchen = (dur: number) => (u: number): CamState => {
  const tw0 = 0.3 * dur, tw1 = 0.78 * dur;
  const kw = EASE.inOut((u - tw0) / (tw1 - tw0)), kl = EASE.out((u - tw1) / (dur - tw1));
  // walking envelope (0 standing .. 1 striding) for the step bob
  const walk = Math.max(0, Math.min(1, (u - tw0) / 0.35)) * Math.max(0, Math.min(1, (tw1 + 0.1 - u) / 0.4));
  const base = kl > 0 ? lerp3(P1, P2, kl) : lerp3(P0, P1, kw);
  // a slight sideways arc on the walk (people do not walk the straight line)
  base[0] += 0.06 * Math.sin(Math.PI * kw) * (1 - kl);
  const ph = (u - tw0) * 1.85 * Math.PI;
  const pos: V3 = [base[0] + 0.012 * walk * Math.sin(ph), base[1] + walk * (0.022 * Math.abs(Math.cos(ph)) - 0.011), base[2]];
  const look = lerp3(L0, L1, EASE.inOut(u / dur));
  const c: CamState = { pos, look, fov: 68, roll: 0.008 * walk * Math.sin(ph) };
  const s = withShake(c, u, 0.55, 21);
  s.focus = Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]);
  s.fnum = 2.8;
  return s;
};
export const CAMS_kitchen: Record<string, ShotCam> = {
  "s15": (from, to) => { KITCHEN.t0 = from / 30; KITCHEN.dur = (to - from) / 30; return shotCam(from, to, povKitchen); },
};

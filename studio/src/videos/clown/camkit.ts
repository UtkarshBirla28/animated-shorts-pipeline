// CAMERA KIT (clown; from typo): the saladoil camera grammar as pure helpers, shared by the per-owner camera files (cams_*.ts) and
// story.ts. The camera runs on the VIDEO clock (V / PV, an identity map today): key START frames are picture frames
// keyed to BEAT words; creeps / glides / ramps are measured in video frames. Craft rules (binding): framings hold
// 2.5-4 s with a gentle creep (0.1-0.3 %/f), slow bell glides (peak <= 45 px/f at 1080), distance / zoom interpolated so
// the scale change is even (logGlide / orbitLog), never through geometry.
import type { V3 } from "./plan";
import { toNew, WARP } from "./voicewarp";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 3;

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** a camera key: starts at PICTURE frame f; its glide lasts `dur` picture frames or, with vd, exactly vd VIDEO frames */
export type Key = { f: number; dur?: number; vd?: number; cut?: boolean; ease?: (u: number) => number; s: (f: number) => Shot };
export type Frame = { pos: V3; look: V3; fov: number };

/** the video frame of picture time f (linear past the ends) */
export const V = (f: number) => {
  const n = WARP.length - 1;
  if (f <= WARP[0]) return (f - WARP[0]) / Math.max(1e-6, WARP[1] - WARP[0]);
  if (f >= WARP[n]) return n + (f - WARP[n]) / Math.max(1e-6, WARP[n] - WARP[n - 1]);
  return toNew(f);
};
/** the picture time of video frame v (inverse of V) */
export const PV = (v: number) => {
  const n = WARP.length - 1;
  if (v <= 0) return WARP[0] + v * (WARP[1] - WARP[0]);
  if (v >= n) return WARP[n] + (v - n) * (WARP[n] - WARP[n - 1]);
  const lo = Math.floor(v);
  return WARP[lo] + (v - lo) * (WARP[lo + 1] - WARP[lo]);
};
/** how far (0 at f0, 1 at f0 + dur; unclamped) picture time f is through [f0, f0 + dur], on the video clock */
export const vt = (f: number, f0: number, dur: number) => (V(f) - V(f0)) / Math.max(1e-6, V(f0 + dur) - V(f0));
/** reference camera ease: symmetric smootherstep */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const norm3 = (a: V3): V3 => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
export const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
export const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const keyU = (k: Key, f: number) => (k.vd ? (V(f) - V(k.f)) / k.vd : vt(f, k.f, k.dur ?? 30));
/** run a shot's key list at frame f (a cut key replaces, a glide key mixes from the running camera) */
export const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), (k.ease ?? glide)(keyU(k, f)));
  }
  return cur;
};
/** a key that starts at VIDEO frame v0 and glides for vd video frames */
export const VK = (v0: number, vd: number, s: (f: number) => Shot, ease?: (u: number) => number): Key => ({ f: PV(v0), vd, s, ...(ease ? { ease } : {}) });
/** push factor since f0 (rate per VIDEO frame: 0.002-0.003 = 0.2-0.3 %/f; negative = a slow pull) */
export const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, V(f) - V(f0)));
/** the same steady push, also running BEFORE f0 (k = 1 exactly at f0) */
export const pushL = (f: number, f0: number, rate: number) => Math.exp(-rate * (V(f) - V(f0)));
/** dolly: the camera slides toward the look point by factor k */
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** a framing + its creep starting at f0 */
export const hold = (pos: V3, look: V3, fov: number, f0: number, rate = 0.003, roll = 0) => (f: number): Shot => dolly(pos, look, pushK(f, f0, rate), { fov, roll });
/** a framing that also slides at a constant velocity d (m per VIDEO frame) from f0 */
export const slide = (s: (f: number) => Shot, f0: number, d: V3) => (f: number): Shot => {
  const c = s(f), t = Math.max(0, V(f) - V(f0));
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] };
};
/** 0 with zero velocity at both ends, 1 in the middle */
export const bell = (t: number) => { const u = clamp01(t); return 16 * u * u * (1 - u) * (1 - u); };
/** a bank of a rad that rises and settles level over [f0, f0 + dur] */
export const bank = (s: (f: number) => Shot, f0: number, dur: number, a: number) => (f: number): Shot => { const c = s(f); return { ...c, roll: (c.roll ?? 0) + a * bell(vt(f, f0, dur)) }; };
/** a crane arc: the camera rises by h at the middle of [f0, f0 + dur] and settles back */
export const lift = (s: (f: number) => Shot, f0: number, dur: number, h: number) => (f: number): Shot => {
  const c = s(f), k = h * bell(vt(f, f0, dur));
  return { ...c, pos: [c.pos[0], c.pos[1] + k, c.pos[2]], look: [c.look[0], c.look[1] + 0.5 * k, c.look[2]] };
};
/** the look point that puts world point t at screen fractions (xs, ys) (0..1, y DOWN) for a camera at pos */
export const aimY = (pos: V3, t: V3, fov: number, xs: number, ys: number): V3 => {
  const dx = t[0] - pos[0], dz = t[2] - pos[2], dh = Math.hypot(dx, dz), el = Math.atan2(t[1] - pos[1], dh), tv = Math.tan((fov * Math.PI) / 360);
  const pitch = el - Math.atan((0.5 - ys) * 2 * tv), b = Math.atan2(dx, -dz), bb = b - Math.atan((xs - 0.5) * 2 * tv * 0.5625);
  return [pos[0] + dh * Math.sin(bb), pos[1] + dh * Math.tan(pitch), pos[2] - dh * Math.cos(bb)];
};
/** a framing from a camera position and a world point placed at screen fractions (xs, ys) */
export const fr = (pos: V3, t: V3, fov: number, xs = 0.5, ys = 0.5): Frame => ({ pos, look: aimY(pos, t, fov, xs, ys), fov });
export const holdF = (F: Frame, f0: number, rate = 0.003, roll = 0) => hold(F.pos, F.look, F.fov, f0, rate, roll);
/** framing F EXACTLY at its landing frame fL, with a steady creep that also runs before fL (a glide target) */
export const holdL = (F: Frame, fL: number, rate = 0.003) => (f: number): Shot => dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov });
/** a framing with a steady push (rate) and a constant drift d (m per VIDEO frame), both running before and after fL */
export const creepL = (F: Frame, fL: number, rate: number, d: V3) => (f: number): Shot => {
  const c = dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov }), t = V(f) - V(fL);
  return { ...c, pos: [c.pos[0] + d[0] * t, c.pos[1] + d[1] * t, c.pos[2] + d[2] * t], look: [c.look[0] + d[0] * t, c.look[1] + d[1] * t, c.look[2] + d[2] * t] };
};
/** framing F exactly at fL with a push (rate) and a drift of the LENS only (dp, m per VIDEO frame): a slow parallax arc */
export const arcL = (F: Frame, fL: number, rate: number, dp: V3) => (f: number): Shot => {
  const c = dolly(F.pos, F.look, pushL(f, fL, rate), { fov: F.fov }), t = V(f) - V(fL);
  return { ...c, pos: [c.pos[0] + dp[0] * t, c.pos[1] + dp[1] * t, c.pos[2] + dp[2] * t] };
};
/** the plain smootherstep glide from framing a to framing b over [f0, f0 + dur] as ONE framing function */
export const glideTo = (a: (f: number) => Shot, b: (f: number) => Shot, f0: number, dur: number, e: (u: number) => number = glide) =>
  (f: number): Shot => mixCam(full(a(f)), full(b(f)), e(vt(f, f0, dur)));
/** a glide from a to b over [f0, f0 + dur] whose lens travels a quadratic curve bent through waypoint w; the look turns
 *  on its own smoothstep over [lk0, lk1] (fractions of dur). Use as a cut key at f0. */
export const via = (a: (f: number) => Shot, w: V3, b: (f: number) => Shot, f0: number, dur: number, lk0 = 0, lk1 = 1, pe: (u: number) => number = glide) => (f: number): Shot => {
  const t = clamp01(vt(f, f0, dur)), u = pe(t), A = full(a(f)), Bf = full(b(f));
  if (t >= 1) return Bf;
  const p: V3 = [0, 1, 2].map((i) => (1 - u) * (1 - u) * A.pos[i] + 2 * u * (1 - u) * w[i] + u * u * Bf.pos[i]) as V3;
  const k = smooth((t - lk0) / Math.max(1e-3, lk1 - lk0));
  return { pos: p, look: lerp3(A.look, Bf.look, k), fov: A.fov + (Bf.fov - A.fov) * u, roll: A.roll + (Bf.roll - A.roll) * u };
};
/** a straight cut key on the integer picture frame of video frame v */
export const CUT = (v: number, s: (f: number) => Shot): Key => ({ f: Math.round(PV(v)), cut: true, s });
/** "cruise" ease: sine ramps in over a and out over b, constant speed between (peaks at 1 / (1 - a/2 - b/2) x the mean) */
export const cruise = (a: number, b: number) => (t: number) => {
  const u = clamp01(t), Vm = 1 / (1 - a / 2 - b / 2);
  if (u < a) return (Vm / 2) * (u - (a / Math.PI) * Math.sin((Math.PI * u) / a));
  if (u > 1 - b) { const r = 1 - u; return 1 - (Vm / 2) * (r - (b / Math.PI) * Math.sin((Math.PI * r) / b)); }
  return (Vm * a) / 2 + Vm * (u - a);
};
/** a pull-out (or push) from framing a to framing b whose IMAGE SCALE changes at an even rate: the distance to the plane
 *  z = zp is interpolated on a log scale (a 5x reveal reads as one calm, steady zoom) */
export const logGlide = (a: Frame, b: Frame, zp: number, f0: number, dur: number, ease: (u: number) => number) => (f: number): Shot => {
  const s = ease(vt(f, f0, dur)), za = a.pos[2] - zp, zb = b.pos[2] - zp, w = (za * Math.pow(zb / za, s) - za) / (zb - za);
  return { pos: lerp3(a.pos, b.pos, w), look: lerp3(a.look, b.look, w), fov: a.fov + (b.fov - a.fov) * w };
};
/** a framing as a lens ORBITING its look point: distance d, elevation el (deg), bearing b (deg; 0 = lens on +z side) */
export type Orb = { t: V3; d: number; el: number; b: number; fov: number };
export const orbPos = (t: V3, d: number, el: number, b: number): V3 => {
  const E = (el * Math.PI) / 180, Bb = (b * Math.PI) / 180;
  return [t[0] + d * Math.sin(Bb) * Math.cos(E), t[1] + d * Math.sin(E), t[2] + d * Math.cos(Bb) * Math.cos(E)];
};
export const orbFrame = (o: Orb): Frame => ({ pos: orbPos(o.t, o.d, o.el, o.b), look: o.t, fov: o.fov });
export const toOrb = (c: Shot): Orb => {
  const dx = c.pos[0] - c.look[0], dy = c.pos[1] - c.look[1], dz = c.pos[2] - c.look[2], d = Math.hypot(dx, dy, dz) || 1e-6;
  return { t: c.look, d, el: (Math.asin(dy / d) * 180) / Math.PI, b: (Math.atan2(dx, dz) * 180) / Math.PI, fov: c.fov ?? 40 };
};
/** a reveal / crane between two framings (functions of f) read as orbits round their look points, the lens distance on a
 *  LOG scale (one even bell of screen-scale change), the target, fov and angles on their own eases. Use as a cut key. */
export const orbitLog = (a: (f: number) => Shot, bF: (f: number) => Shot, f0: number, dur: number, ease: (u: number) => number,
  ang: (u: number) => number = ease, tgt: (u: number) => number = ease, fovE?: (u: number) => number) => (f: number): Shot => {
  const t = clamp01(vt(f, f0, dur));
  if (t <= 0) return full(a(f));
  if (t >= 1) return full(bF(f));
  const A = toOrb(a(f)), Bo = toOrb(bF(f)), s = ease(t), sa = ang(t), st = tgt(t);
  let db = Bo.b - A.b; if (db > 180) db -= 360; if (db < -180) db += 360;
  const d = A.d * Math.pow(Bo.d / A.d, s), el = A.el + (Bo.el - A.el) * sa, b = A.b + db * sa, T = lerp3(A.t, Bo.t, st);
  return { pos: orbPos(T, d, el, b), look: T, fov: A.fov + (Bo.fov - A.fov) * (fovE ? fovE(t) : s), roll: 0 };
};
/** a framing scaled about world point c by k (k < 1 = closer) */
export const scaleAbout = (F: Frame, c: V3, k: number): Frame => ({ pos: lerp3(c, F.pos, k), look: lerp3(c, F.look, k), fov: F.fov });
/** the punch ease: front-loaded but not a 1-frame jump (at most 1-2 comic snaps per film) */
export const punch = (u: number) => 1 - (1 - clamp01(u)) ** 2.2;

// ---------------- lens: depth of field ----------------
/** cInf = blur-disc radius in px at 1080x1920 for things at infinity (0 = all sharp; CU 12-16, MS 8-12, wides 0-3,
 *  board shots almost sharp). Entries switch at f, or ramp over dur (a ramp RACKS: cInf and the focus point glide). */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
/** a DOF ramp over a VIDEO window (v0, vd) */
export const DV = (v0: number, vd: number, cInf: number, focus?: (f: number) => V3): Dof => ({ f: PV(v0), dur: PV(v0 + vd) - PV(v0), cInf, ...(focus ? { focus } : {}) });
/** a constant focus point */
export const at = (p: V3) => () => p;

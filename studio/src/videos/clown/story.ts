// Timeline of "The Clown Nobody Saw" (clown), REBUILD v2 (owner EDIT): the ASSEMBLY of beats.ts (BEAT words, SHOTS,
// XFADE, relights) + camkit.ts (the camera grammar) + cams_v2.ts (CAMS + DOFS of all 26 shots) + remap.ts (the
// picture-time remaps: S20 slow motion, E1 / E2 replays, E3 tape rewind).
// THE LOOP: E3 rewinds to picture time 0 of Q1 exactly at TOTAL, so frame TOTAL = frame 0 (camera, world, cast, life),
// with no periodicity needed anywhere (remap.ts).
import { WORDS, W, WE, wi, PW, PWE } from "./words";
import type { V3 } from "./plan";
import { PHONES, DUCKS, SQ, clownQ } from "./plan";
import { blendLight, LightState } from "./lights";
import { FPS, BEAT, TAIL, TOTAL, XPAD, SHOTS, LAST, XFADE, shotAt, END, SID, TALKS, talking } from "./beats";
import type { ShotDef, Relight } from "./beats";
import { V, PV, glide, run, smooth, clamp01, easeIn, easeOut, vt, lerp3 } from "./camkit";
import type { Cam, Key, Dof } from "./camkit";
import * as CV from "./cams_v2";
import { remapAt, pt, filmFrameOf, e1Hold, e1Punch, tapeAt, isRewind, FILM, setFilm, REW, E1T, e3Hold, e3Punch } from "./remap";
import type { Remap } from "./remap";

export { FPS, BEAT, TAIL, TOTAL, XPAD, SHOTS, LAST, XFADE, shotAt, END, SID, TALKS, talking, V, PV, glide, smooth, clamp01, easeIn, easeOut };
export { remapAt, pt, filmFrameOf, e1Hold, tapeAt, isRewind, FILM, setFilm, REW, E1T, e3Hold, e3Punch };
export type { V3, ShotDef, Relight, Cam, Dof, Remap };
void W; void WE;

/** layers to draw at picture frame f: base shot, plus the next shot fading in during its dissolve (picture clock) */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - Math.floor(x / 2) && f < s.a - Math.floor(x / 2) + x)
      return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - Math.floor(x / 2)) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** the relight blend of shot `id` at frame f (its own picture clock): light a -> b at k (0..1) */
export const lightMixAt = (id: number, f: number) => {
  const s = SHOTS[id - 1];
  let a = s.light, b = s.light, k = 0;
  for (const r of s.relight ?? []) {
    if (f < r.f) break;
    const kk = smooth((f - r.f) / r.dur);
    b = r.to; k = kk;
    if (kk >= 1) { a = r.to; k = 0; }
  }
  return { a, b, k };
};
/** the blended light state of shot `id` at frame f */
export const lightAt = (id: number, f: number): LightState => {
  const s = SHOTS[id - 1];
  let cur = s.light, st0 = blendLight(cur, cur, 0);
  for (const r of s.relight ?? []) {
    if (f < r.f) break;
    const k = smooth((f - r.f) / r.dur);
    st0 = blendLight(cur, r.to, k);
    if (k >= 1) cur = r.to;
  }
  return st0;
};

// ---------------- cameras ----------------
const CAMS: Record<number, Key[]> = { ...CV.CAMS };
const DOFS: Record<number, Dof[]> = { ...CV.DOFS };
for (const s of SHOTS) if (!CAMS[s.id]) throw new Error(`story.ts: no camera for shot ${s.id} (${s.key})`);
/** the camera of shot id at ITS picture time f (for E1-E3 this is the source camera at the remapped time) */
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);
/** the opening framing (frame 0 = frame TOTAL) */
export const P0 = camAt(SID.Q1, 0);
/** the quiz world's camera at its picture time t (Q1 / Q2 / Q3 by t) */
export const quizCamAt = (t: number): Cam => ({ roll: 0, fov: 40, ...CV.quizCam(t) }) as Cam;

/** world point -> screen px (1080 x 1920) through camera c (null = behind) */
export const project = (c: Cam, p: V3): [number, number] | null => {
  const F: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(...F), f: V3 = [F[0] / n, F[1] / n, F[2] / n];
  const rh = Math.hypot(f[0], f[2]) || 1, R0: V3 = [-f[2] / rh, 0, f[0] / rh];
  const U0: V3 = [R0[1] * f[2] - R0[2] * f[1], R0[2] * f[0] - R0[0] * f[2], R0[0] * f[1] - R0[1] * f[0]];
  const cs = Math.cos(c.roll), sn = Math.sin(c.roll), R = R0.map((v, i) => v * cs + U0[i] * sn), U = U0.map((v, i) => -R0[i] * sn + v * cs);
  const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  if (z <= 0.01) return null;
  const t = Math.tan((c.fov * Math.PI) / 360);
  return [540 + (540 * (d[0] * R[0] + d[1] * R[1] + d[2] * R[2])) / (z * t * 0.5625), 960 - (960 * (d[0] * U[0] + d[1] * U[1] + d[2] * U[2])) / (z * t)];
};
/** the three bills' corners (world) */
const BILL_PTS: V3[] = SQ.bills.flatMap((b) => { const w = SQ.bill.w / 2, h = SQ.bill.h, c = Math.cos(b.yaw), sn = Math.sin(b.yaw), q = b.peg;
  return [[q[0] - w * c, q[1], q[2] + w * sn], [q[0] + w * c, q[1], q[2] - w * sn], [q[0] - w * c, q[1] - h, q[2] + w * sn], [q[0] + w * c, q[1] - h, q[2] - w * sn]] as V3[]; });
/** the duckers are drawn 12 % larger (cast_quiz_plan.ts DUCK_SCALE): their head tops are higher */
const headTop = (k: number) => 1.72 * (DUCKS.some((d) => d.who === k) ? 1.12 : 1);
/** E3's PUNCH-IN (p3, FIX2 D2): during the hold the picture scales to E3Z.k (1.5, less only if the group would not fit)
 *  about E3Z.x / y, a fixed pivot chosen so that the group "three bills + the first ducker's head" (seen through Q1's
 *  camera at the duck) glides from where it sits to the middle of the safe area (x 60-888, y 330-1250) */
export const E3Z = (() => {
  const cam = camAt(SID.Q1, REW.duck), d = DUCKS[0].at;
  const pts = [...BILL_PTS, [d[0], 1.0, d[2]] as V3, [d[0], 1.5, d[2]] as V3, [d[0] - 0.44, 1.0, d[2] - 0.47] as V3, [d[0] - 0.44, 1.9, d[2] - 0.47] as V3, [d[0] + 0.35, 1.2, d[2]] as V3]
    .map((q) => project(cam, q)).filter((q): q is [number, number] => !!q);
  const x0 = Math.min(...pts.map((q) => q[0])), x1 = Math.max(...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1])), y1 = Math.max(...pts.map((q) => q[1]));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 + 24, hh = (y1 - y0) / 2 + 24;
  const k = Math.max(1.2, Math.min(1.5, 828 / (2 * hw), 920 / (2 * hh)));
  const dx = Math.max(60 + hw * k, Math.min(888 - hw * k, 474)), dy = Math.max(330 + hh * k, Math.min(1250 - hh * k, 780));
  /* p4 (QUIZ, audit R7): the pivot is clamped INSIDE the frame, so the scaled picture always covers x 0..1080 and
   * y 0..1920 (a pivot at x -37 exposed an 18 px strip of canvas down the left edge for the whole hold) */
  return { k, x: Math.max(0, Math.min(1080, (k * cx - dx) / (k - 1))), y: Math.max(0, Math.min(1920, (k * cy - dy) / (k - 1))), from: [cx, cy] as [number, number], to: [dx, dy] as [number, number], box: [x0, y0, x1, y1] };
})();
/** the 2D punch-ins: a scale k about screen px (x, y) for film shot id at film frame f (k = 1 elsewhere). Clown.tsx applies
 *  it to the picture layers only (not to overlays / captions; LOOK's ring follows it through this function).
 *  E1: the replay punch-in on the held phone person (the pivot is their head, PHONES[k].at + 1.55 m, through Q1's camera
 *  at their moment). E3: the punch-in of the hold (E3Z) */
export const zoomAt = (id: number, f: number): { k: number; x: number; y: number } => {
  if (id === SID.E3) { const b = e3Punch(f); return b <= 0 ? { k: 1, x: 540, y: 960 } : { k: 1 + (E3Z.k - 1) * b, x: E3Z.x, y: E3Z.y }; }
  if (id !== SID.E1) return { k: 1, x: 540, y: 960 };
  const p = e1Punch(f);
  if (p.k < 0 || p.b <= 0) return { k: 1, x: 540, y: 960 };
  const ph = PHONES[p.k], s = project(camAt(SID.Q1, ph.t), [ph.at[0], 1.55, ph.at[2]]) ?? [540, 960];
  return { k: 1 + 0.07 * p.b, x: Math.max(120, Math.min(960, s[0])), y: Math.max(300, Math.min(1250, s[1])) };
};
/** where phone person k's number badge goes (screen px, BEFORE E1's zoom): [x, y] = the point Overlays.tsx hangs the
 *  170 px badge over (its bottom edge sits 40 px above y, centred on x). Rule (FIX2 D2): right above their own head; the
 *  whole badge inside x 60-888 and y >= 300; never on a bill (it slides beside the head, away from the bills, when the
 *  spot above is taken). `avoid` = more screen boxes [x0, y0, x1, y1] the badge must stay off (the cast knows where the
 *  OTHER figures stand at PHONES[k].t: pass their head + torso boxes, so a number never lands on a neighbour's face).
 *  The quiz animator may override per person through Overlays.setCountPopHook (and can call this from the hook). */
export const e1PopSpot = (k: number, avoid: [number, number, number, number][] = []): [number, number] => {
  const ph = PHONES[k], cam = camAt(SID.Q1, ph.t), top = project(cam, [ph.at[0], headTop(k), ph.at[2]]) ?? [540, 900];
  /* each bill's own box (+ 10 px) and the clock face (a gold disc beside a clock reads as a second clock) */
  const boxes: [number, number, number, number][] = SQ.bills.map((_, i) => { const q = BILL_PTS.slice(4 * i, 4 * i + 4).map((v) => project(cam, v)).filter((v): v is [number, number] => !!v);
    return [Math.min(...q.map((v) => v[0])) - 10, Math.min(...q.map((v) => v[1])) - 10, Math.max(...q.map((v) => v[0])) + 10, Math.max(...q.map((v) => v[1])) + 10]; });
  { const cc = project(cam, SQ.clock.c), ce = project(cam, [SQ.clock.c[0] + SQ.clock.r, SQ.clock.c[1], SQ.clock.c[2]]);
    if (cc && ce) { const r = Math.abs(ce[0] - cc[0]) + 30; boxes.push([cc[0] - r, cc[1] - r, cc[0] + r, cc[1] + r]); } }
  for (const q of avoid) boxes.push(q);
  /* a candidate = the badge's centre x and bottom y; ok = the whole badge inside the safe box, off every bill / the clock,
   * and NEARER to its own head than to any bill (a badge in a gap between the bills would read as a label on the money) */
  const NB = SQ.bills.length, hc: [number, number] = [top[0], top[1] + 60];
  const ok = (cx: number, b: number) => cx >= 145 && cx <= 803 && b - 170 >= 300 && b <= 1240 && boxes.every((q) => cx + 85 <= q[0] || cx - 85 >= q[2] || b <= q[1] || b - 170 >= q[3])
    && boxes.slice(0, NB).every((q) => Math.hypot(cx - hc[0], b - 85 - hc[1]) * 1.1 <= Math.hypot(cx - (q[0] + q[2]) / 2, b - 85 - (q[1] + q[3]) / 2));
  /* the nearest clean spot to "right above the head": a grid of offsets (sideways 0 .. 220 px, down 0 .. 360 px from the
   * spot above the head), cheapest first; if nothing is clean the badge goes beside the hip, away from the bills (right) */
  let best: [number, number] | null = null, bc = 1e9;
  for (let dy = 0; dy <= 360; dy += 30) for (let dx = -220; dx <= 220; dx += 20) {
    /* beside the body (dy > 60) the badge must clear the figure itself: at least 135 px sideways */
    if (dy > 60 && Math.abs(dx) < 135) continue;
    const cx = top[0] + dx, bb = top[1] - 40 + dy, cost = Math.abs(dx) + 0.8 * dy;
    if (cost < bc && ok(cx, bb)) { bc = cost; best = [cx, bb]; }
  }
  const c = best ?? [Math.max(145, Math.min(803, top[0] + 175)), Math.max(470, top[1] + 310)];
  return [Math.max(145, Math.min(803, c[0])), c[1] + 40];
};
/** E1's number pop (EDIT's default; Overlays.tsx draws it): which number, its grow 0..1 and the badge's anchor in screen
 *  px (already through E1's zoom) */
export const e1Pop = (f: number): { n: number; k: number; x: number; y: number } | null => {
  const h = e1Hold(f);
  if (h.k < 0) return null;
  const s = e1PopSpot(h.k), z = zoomAt(SID.E1, f);
  return { n: h.k + 1, k: clamp01(h.u * 4), x: z.x + (s[0] - z.x) * z.k, y: z.y + (s[1] - z.y) * z.k };
};
/** the first film frame (from "Five." on) at which the clown's head comes under the chip's plate (the big "5": x 380-900,
 *  y 290-520 at 1080 x 1920) in Q2 / Q3: the big 5 must be gone by then (LOOK's CHIP_OUT; its fade takes ~9 f) */
export const chipFreeUntil = (): number => {
  for (let f = Math.round(BEAT.five); f <= BEAT.youSawEnd; f++) {
    const cams = [quizCamAt(f)]; if (Math.abs(f - SHOTS[SID.Q3 - 1].a) <= 4) cams.push(camAt(SID.Q2, f), camAt(SID.Q3, f));
    const c = clownQ(f).p;
    for (const cam of cams) { const a = project(cam, [c[0], 2.12, c[2]]), b = project(cam, [c[0], 1.45, c[2]]);
      if (a && b) { const r = Math.abs(b[1] - a[1]) * 0.55; if (a[0] + r > 380 && a[0] - r < 900 && b[1] > 290 && a[1] < 520) return f; } }
  }
  return Math.round(BEAT.youSaw);
};

/** the same for the clown's FACE (chin 1.5 m .. hat brim 1.85 m; the plate with the big 5 is about x 350-888, y 300-515):
 *  the first frame from "Five." on at which the plate would sit on his face. The chip's fade (CHIP_OUT .. + 9) must be over
 *  by then; before it only the tip of his hat goes under the plate. */
export const chipFaceUntil = (): number => {
  for (let f = Math.round(BEAT.five); f <= BEAT.youSawEnd; f++) {
    const cams = [quizCamAt(f)]; if (Math.abs(f - SHOTS[SID.Q3 - 1].a) <= 4) cams.push(camAt(SID.Q2, f), camAt(SID.Q3, f));
    const c = clownQ(f).p;
    for (const cam of cams) { const a = project(cam, [c[0], 1.85, c[2]]), b = project(cam, [c[0], 1.5, c[2]]);
      if (a && b) { const r = Math.abs(b[1] - a[1]) * 0.6; if (a[0] + r > 350 && a[0] - r < 888 && b[1] > 300 && a[1] < 515) return f; } }
  }
  return Math.round(BEAT.youSawEnd);
};

// impact kicks (none in this film so far)
const KICKS: [number, number, number][] = [];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g, n0] of KICKS) {
    const n = Math.floor(V(t * FPS) - V(t0 * FPS) + 1e-6);
    if (n >= 0 && n < n0) a += g * (n % 2 ? -1 : 1) * (1 - n / n0) ** 1.5;
  }
  return a;
};

/** screen motion of the camera between f and f+1 (POST's motion blur): dx, dy px at 1080x1920, zoom per frame */
export const camMotion = (id: number, f: number): { dx: number; dy: number; zoom: number } => {
  const c0 = camAt(id, f), c1 = camAt(id, f + 1);
  const basis = (c: Cam) => {
    const fw: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(...fw);
    const F: V3 = [fw[0] / n, fw[1] / n, fw[2] / n], rh = Math.hypot(F[2], F[0]) || 1, R0: V3 = [-F[2] / rh, 0, F[0] / rh];
    const U0: V3 = [R0[1] * F[2] - R0[2] * F[1], R0[2] * F[0] - R0[0] * F[2], R0[0] * F[1] - R0[1] * F[0]];
    const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
    return { F, R: R0.map((v, i) => v * cs + U0[i] * sn) as V3, U: U0.map((v, i) => -R0[i] * sn + v * cs) as V3, t: Math.tan((c.fov * Math.PI) / 360), n };
  };
  const b0 = basis(c0), b1 = basis(c1), dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const px = (c: Cam, b: ReturnType<typeof basis>, p: V3): [number, number] => {
    const d: V3 = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = Math.max(1e-3, dot(d, b.F));
    return [540 + (540 * dot(d, b.R)) / (z * b.t * 0.5625), 960 - (960 * dot(d, b.U)) / (z * b.t)];
  };
  let best = { dx: 0, dy: 0, zoom: 0 }, bm = -1;
  for (const k of [1, 2.5]) {
    let sx = 0, sy = 0, r0 = 0, r1 = 0;
    const P: [number, number][] = [], Q: [number, number][] = [];
    for (const gx of [-0.5, 0, 0.5]) for (const gy of [-0.5, 0, 0.5]) {
      const z = b0.n * k, x = gx * z * b0.t * 0.5625 * 2, y = gy * z * b0.t * 2;
      const w: V3 = [0, 1, 2].map((i) => c0.pos[i] + b0.F[i] * z + b0.R[i] * x + b0.U[i] * y) as V3;
      const p = px(c0, b0, w), q = px(c1, b1, w); P.push(p); Q.push(q); sx += q[0] - p[0]; sy += q[1] - p[1];
    }
    const mx = sx / 9, my = sy / 9;
    for (let i = 0; i < 9; i++) { r0 += Math.hypot(P[i][0] - 540, P[i][1] - 960); r1 += Math.hypot(Q[i][0] - 540 - mx, Q[i][1] - 960 - my); }
    const zoom = r1 / r0 - 1, m = Math.max(Math.abs(mx) / 1080, Math.abs(my) / 1920, Math.abs(zoom));
    if (m > bm) { bm = m; best = { dx: mx, dy: my, zoom }; }
  }
  return best;
};

/** the lens of shot id at frame f (its own picture clock): the active entry, ramping (cInf AND focus point, smootherstep)
 *  from the previous entry's settled values; entries without a focus inherit the last one (none = the look point) */
export const dofAt = (id: number, f: number) => {
  const L = DOFS[id] ?? [{ f: 0, cInf: 0 }];
  const a = SHOTS[id - 1].a;
  let i = 0; while (i + 1 < L.length && f >= (L[i + 1].f || a)) i++;
  const fo = (j: number): ((f: number) => V3) | undefined => { for (let k = j; k >= 0; k--) if (L[k].focus) return L[k].focus; return undefined; };
  const d = L[i], p = L[Math.max(0, i - 1)], fb = fo(i), fa = i > 0 ? fo(i - 1) : fb;
  const k = d.dur ? glide(clamp01(vt(f, d.f, d.dur))) : 1;
  const focus = fa && fb && fa !== fb && k < 1 ? (ff: number): V3 => lerp3(fa(ff), fb(ff), k) : fb;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
export { wi, WORDS, PW, PWE };

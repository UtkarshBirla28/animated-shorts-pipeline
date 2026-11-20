// Timeline of "The Typo That Sold More Shares Than Existed" (typo): the ASSEMBLY of beats.ts (BEAT words, SHOTS,
// XFADE, lights / relights) + camkit.ts (the camera grammar) + the per-owner camera files (cams_desk / cams_trading /
// cams_tokyo / cams_homes / cams_hall: CAMS + DOFS per shot). Everything is keyed to the FINAL voice (words.ts) through
// BEAT; the picture runs on it directly (voicewarp.ts is an IDENTITY map).
// FRAME 0 = THE LAST FRAME (the loop): cams_desk.ts P0 = the finger over the glowing ENTER key; camAt(1, 0) ===
// camAt(LAST, TOTAL - 1) exactly.
import { WORDS, W, WE, wi, PW, PWE } from "./words";
import type { V3 } from "./plan";
import { blendLight, LightState } from "./lights";
import { FPS, BEAT, TAIL, TOTAL, XPAD, SHOTS, LAST, XFADE, shotAt, END } from "./beats";
import type { ShotDef, Relight } from "./beats";
import { V, PV, glide, run, smooth, clamp01, easeIn, easeOut, vt, lerp3 } from "./camkit";
import type { Cam, Key, Dof } from "./camkit";
import * as CD from "./cams_desk";
import * as CTR from "./cams_trading";
import * as CTK from "./cams_tokyo";
import * as CHM from "./cams_homes";
import * as CHL from "./cams_hall";

export { FPS, BEAT, TAIL, TOTAL, XPAD, SHOTS, LAST, XFADE, shotAt, END, V, PV, glide, smooth, clamp01, easeIn, easeOut };
export type { V3, ShotDef, Relight, Cam, Dof };
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
/** the relight blend of shot `id` at frame f: light a -> b at k (0..1) */
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

// ---------------- cameras (one owner file per group of shots) ----------------
const CAMS: Record<number, Key[]> = { ...CD.CAMS, ...CTR.CAMS, ...CTK.CAMS, ...CHM.CAMS, ...CHL.CAMS };
const DOFS: Record<number, Dof[]> = { ...CD.DOFS, ...CTR.DOFS, ...CTK.DOFS, ...CHM.DOFS, ...CHL.DOFS };
export const P0 = CD.P0;
for (const s of SHOTS) if (!CAMS[s.id]) throw new Error(`story.ts: no camera for shot ${s.id}`);

// impact kicks: the image offset flips sign every VIDEO frame and decays over n frames (t0 s, gain, n f): the heavy
// CANCEL key thunks; never near frame 0 / the last frame
const KICKS: [number, number, number][] = [[(BEAT.cancel3 + 6) / FPS, 0.5, 6], [(BEAT.again + 4) / FPS, 0.6, 6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g, n0] of KICKS) {
    const n = Math.floor(V(t * FPS) - V(t0 * FPS) + 1e-6);
    if (n >= 0 && n < n0) a += g * (n % 2 ? -1 : 1) * (1 - n / n0) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- the sun pins: one world sun per exterior place ----------------
// world.ts turns the sun from each shot's MEAN view direction by sunAz; these are WORLD headings (deg, atan2(z, x) of the
// direction TOWARD the sun) per exterior shot. The street: a low December sun from the south-west, raking across the
// facades from screen left (the camera looks -z).
const SUN_WORLD: Record<number, number> = { 2: -150 };
const meanAxis = (id: number) => {
  const s = SHOTS[id - 1];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  return (Math.atan2(fz, fx) * 180) / Math.PI;
};
for (const [id, w] of Object.entries(SUN_WORLD)) SHOTS[+id - 1].sunAz = w - meanAxis(+id);

/** screen motion of the camera between f and f+1 (POST's motion blur): dx, dy px at 1080x1920, zoom per frame */
export const camMotion = (id: number, f: number): { dx: number; dy: number; zoom: number } => {
  const cutIn = (CAMS[id] ?? []).some((k) => k.cut && k.f > f && k.f <= f + 1) && !(CAMS[id] ?? []).some((k) => k.cut && k.f > f - 1 && k.f <= f);
  const c0 = camAt(id, cutIn ? f - 1 : f), c1 = camAt(id, cutIn ? f : f + 1);
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

/** the lens of shot id at frame f: the active entry, ramping (cInf AND focus point, smootherstep on the video clock)
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

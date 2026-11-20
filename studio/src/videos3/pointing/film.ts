// FILM of 'pointing', script v3 (DIRECTOR): what CORE's <KitFilm film={FILM} /> and scripts/kit_render.mjs render.
//   timeline.ts  the film's clock: words -> cuts, events, the loop length L (re-times itself to the voice)
//   shots.ts     the 25 shots of the locked outline (ids s01 .. s24 with s16a / s16b), place + light per shot
//   cams.ts      the set owners' cameras (sets/<set>.cams.ts)
//   this file    the assembly: owner camera -> the director's fallback / override -> THE HOOK EXPORT -> ShotDef
// kit_render.mjs leaves THIS file out of the shared source hash (its effect on a shot is in the shot's camera + rig
// signature), so a camera decision made here re-renders only the shots it changes.
//
// THE TWO HOOK EXPORTS (a film prop; SCRIPT_v3 1.2, lead decision 2026-11-19 22:35 no. 2):
//   A (default)  shot 1 is ONE shot to the first cut (~3.05 s)
//   B            the same set-up with one same-axis punch-in (1.25x, his eyes at the same place on screen) on "He is not."
//   render B with   --props '{"hook":"B"}'   (inputProps.kit.hook; only s01's camera differs, so only s01 re-renders;
//   use its own --out folder: kit_render deletes a shot's other chunks when it renders that shot)
import { getInputProps } from "remotion";
import type { CamState, Film, RigSpec, ShotDef, V3 } from "../../kit/core/ctx";
import { EASE, camSpeedStats, withShake } from "../../kit/core/camera";
import type { ShotCam } from "./camkit";
import { SHOT_TABLE, TOTAL } from "./shots";
import { EV, FPS, FRAMES, TIMELINE_NOTES, WORD_SOURCE } from "./timeline";
import { ownerCamV3, ownerCamPlain } from "./cams";
import { build_cab } from "./sets/cab";
import { build_car, MARKS_car } from "./sets/car";
import { build_jp_platform, JP_RIG, MARKS_jp_platform } from "./sets/jp_platform";
import { build_lab, CAMS_lab } from "./sets/lab";

// ---------------------------------------------------------------- the hook export (film prop)
export type Hook = "A" | "B";
const readHook = (): Hook => {
  if (typeof window === "undefined") return "A";
  try { return (getInputProps() as { kit?: { hook?: string } }).kit?.hook === "B" ? "B" : "A"; } catch { return "A"; }
};
export const HOOK: Hook = readHook();
export const HOOK_B_ZOOM = 1.25;
/** the tourist's eyes in shot 1 (his mark + eye height: the card faces the lens, so x / z are the mark's) */
/** his face in shot 2 (TRAIN's mark, sets/car.cams.ts MARKS_car.touristFace), for hook B's matched punch */
const FACE_S02: V3 | null = MARKS_car.touristFace ?? null;
const EYES_S01: V3 = (() => { const m = MARKS_jp_platform.s01 ?? MARKS_jp_platform.v3_s01 ?? [-1.3, 0, 3.48]; return [m[0], 1.27, m[2]]; })();

const D2R = Math.PI / 180;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sm01 = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const L3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** a SAME-AXIS PUNCH-IN: the lens does not move, the view narrows by `zoom(frame)` and is re-aimed so the world point
 *  `anchor` keeps its place on screen. The zoom is read per FRAME (the pipeline's shutter is centred on the frame: a
 *  switch by raw time would blend both views on the cut frame at final quality). zoom 1 = the camera as it is. */
export const punchIn = (cam: (t: number) => CamState, zoom: (frame: number) => number, anchor: V3) => (t: number): CamState => {
  const c0 = cam(t), z = zoom(Math.round(t * FPS));
  if (Math.abs(z - 1) < 1e-4) return c0;
  const fwd0 = nrm(sub(c0.look, c0.pos)), dist = Math.hypot(...sub(c0.look, c0.pos));
  const basis = (f: V3) => { const r = nrm(cross(f, [0, 1, 0])); return { f, r, u: cross(r, f) }; };
  const tanOf = (b: { f: V3; r: V3; u: V3 }) => { const d = sub(anchor, c0.pos), zz = dot(d, b.f); return [dot(d, b.r) / zz, dot(d, b.u) / zz]; };
  const B0 = basis(fwd0), [x0, y0] = tanOf(B0), xT = x0 / z, yT = y0 / z;
  let a = 0, b = 0, B = B0;
  for (let k = 0; k < 6; k++) { B = basis(nrm(add(add(B0.f, mul(B0.r, a)), mul(B0.u, b)))); const [x, y] = tanOf(B); a += x - xT; b += y - yT; }
  const fov = (2 * Math.atan(Math.tan((c0.fov * D2R) / 2) / z)) / D2R;
  return { ...c0, look: add(c0.pos, mul(B.f, dist)), fov, focus: c0.focus ?? dist };
};

// ---------------------------------------------------------------- the director's cameras
// FALLBACK = used only while the set owner has no "v3_<id>" camera for the shot (each one is a line in
// briefs/v3/pointing/SHOT_REQUESTS_v3.md). OVERRIDE = the director's decision over the owner's camera (also listed
// there, for the owner to adopt). Keep both lists SHORT: cameras belong to the set owners.
/** the lab (s17 + s19): ONE slow arc across both halves, the two jars near square to the lens from the first frame
 *  (both TRIES bars must read at the cut) and exactly square at the end of s19. Jar pair centre + table height as in
 *  sets/lab.cams.ts LAB (copied: importing lab.cams here would put it in every shot's source hash). */
const LAB_J: V3 = [-0.5, 0.75, -0.6];
const labArc = (p0: number, p1: number): ShotCam => (from, to) => (t) => {
  const u = t - from / FPS, d = (to - from) / FPS, p = lerp(p0, p1, EASE.inOut(Math.max(0, Math.min(1, u / d))));
  const a = lerp(-24, 0, p) * D2R, r = lerp(1.26, 1.05, p), h = lerp(1.13, 1.08, p);
  const c: CamState = { pos: [LAB_J[0] + Math.sin(a) * r, h, LAB_J[2] + Math.cos(a) * r], look: [LAB_J[0], lerp(0.94, 0.9, p), LAB_J[2]], fov: 48, focus: r, fnum: 5.6 };
  return withShake(c, u, 0.1, 23);
};
const DIR_FALLBACK: Record<string, ShotCam> = {
  s17: labArc(0, 0.58),
  s19: labArc(0.58, 1),
};
// s03b (LEAD 02:35, SHOT_REQUESTS Block 13): until TRAIN's "v3_s03b" exists, s03 AND s03b both run TRAIN's s03 lens over
// the old whole span (s03's start to s03b's end), so the picture is exactly the pre-split s03 and the cut is invisible.
// The moment "v3_s03b" is in cab.cams.ts this steps aside and each shot takes its own camera.
const S03_WHOLE: ShotCam | null = (() => { const c = ownerCamV3("s03", "cab") ?? ownerCamPlain("s03", "cab");
  return c && !ownerCamV3("s03b", "cab") ? (() => c(FRAMES.s03[0], FRAMES.s03b[1])) : null; })();
if (S03_WHOLE) DIR_FALLBACK.s03b = S03_WHOLE;
const DIR_OVERRIDE: Record<string, ShotCam> = {};
if (S03_WHOLE) DIR_OVERRIDE.s03 = S03_WHOLE;   // the interim whole-span s03 lens (S03_WHOLE above)
void L3;
/** RE-AIM an owner's camera: the look point moves by `d` (m), the lens stays. For a framing fix that keeps the
 *  owner's set-up and move (each use is a line in SHOT_REQUESTS_v3.md for the owner to adopt) */
const reAim = (cam: (t: number) => CamState, d: V3 | ((t: number) => V3)) => (t: number): CamState => { const c = cam(t), o = typeof d === "function" ? d(t) : d; return { ...c, look: add(c.look, o) }; };
/** per-shot re-aims of the owners' cameras (film seconds in, metres out) */
const DIR_REAIM: Record<string, (from: number, to: number) => (t: number) => V3> = {
  // (empty since 23:55: STATION re-built the frame-0 lens itself: a long lens that looks a little down, the fingertip
  //  and the yellow top in the middle of the frame, above the caption band. The director's 0.26 m tilt of 23:20 is gone.)
};

// THE DIRECTOR'S MOTION LAYER. The owner's rule: a calm but ALWAYS-MOVING camera (tools/v3/targets.json: no shot under
// 0.15 %/f unless it is a planned freeze, film median >= 0.7, peak <= 4.2). The owners' v3 cameras are first-pass
// set-ups that are almost still (0.01-0.1 %/f measured with CORE's camSpeedStats). This layer keeps each owner's
// framing as the MIDDLE of a slow designed move: an arc round the look point, a truck, a push, a rise. Every row is
// measured (briefs/v3/pointing/director/probe.mjs cams) and listed in SHOT_REQUESTS_v3.md for the owner to adopt.
type Move = {
  /** deg: the lens travels round the look point, + = toward its own right (the background slides left) */
  orbit?: number;
  /** m: lens + look slide sideways together, + = right */
  truck?: number;
  /** m: the lens rises (the look point stays: a slight crane) */
  rise?: number;
  /** fraction of the lens-to-look distance, + = in */
  push?: number;
  /** deg: the view turns, + = to the right */
  pan?: number;
  ease?: "linear" | "inOut" | "out" | "in";
  /** where the owner's own framing sits in the move: 0 = at its start, 0.5 = the middle (default), 1 = at its end */
  at?: number;
  /** m: measure / pivot at this depth instead of the owner's look point (same view ray, same focus): for lenses whose
   *  look point is far beyond what fills the frame (the cab: the lamp is 40+ m away, the cab around the lens 1-2 m) */
  ref?: number;
};
const rotY = (v: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
export const withMove = (cam: (t: number) => CamState, from: number, to: number, m: Move) => (t: number): CamState => {
  const c = cam(t), u = Math.max(0, Math.min(1, (t - from / FPS) / Math.max(1e-3, (to - from) / FPS)));
  const e = EASE[m.ease ?? "linear"](u) - (m.at ?? 0.5);
  const d0 = Math.hypot(...sub(c.look, c.pos)), fwd = nrm(sub(c.look, c.pos)), focus = c.focus ?? d0;
  let look: V3 = m.ref ? add(c.pos, mul(fwd, m.ref)) : c.look, pos: V3 = c.pos;
  const right = nrm(cross(fwd, [0, 1, 0]));
  if (m.orbit) pos = add(look, rotY(sub(pos, look), -e * m.orbit * D2R));
  if (m.truck) { const s = mul(right, e * m.truck); pos = add(pos, s); look = add(look, s); }
  if (m.rise) pos = [pos[0], pos[1] + e * m.rise, pos[2]];
  if (m.push) pos = add(look, mul(sub(pos, look), 1 - e * m.push));
  if (m.pan) look = add(pos, rotY(sub(look, pos), -e * m.pan * D2R));
  return { ...c, pos, look, focus };
};
/** the moves (deg / m / fractions over the whole shot) */
const DIR_MOVE: Record<string, Move> = {
  s03: { ref: 2.0, orbit: 12 },
  s04: { orbit: 11, push: 0.06 },
  s06: { orbit: -9, push: 0.08 },
  s07: { orbit: 16, push: 0.08, ease: "inOut" },
  s08: { orbit: -12, push: 0.06 },
  s09: { truck: -0.9 },
  s10: { orbit: 11, push: 0.05 },
  s11: { orbit: -19, push: -0.06 },
  s12: { orbit: 4, push: 0.06 },
  s13: { orbit: -9, push: 0.05 },
  s14: { orbit: 6, push: 0.12 },
  s15: { orbit: 7, push: 0.14, at: 0.35 },
  s18: { orbit: -3, push: 0.04 },
  s20: { orbit: -5, push: 0.14 },
  s22: { truck: -0.9 },
  s24: { pan: -3, at: 1 },
};

// the lab set reads LAB.t17 / LAB.dur17 (sets/lab.cams.ts), which its own "s17" camera builder sets as a side effect:
// keep that alive while the director's fallback is the camera (the set then schedules on the v3 s17 start)
const labSideEffect = () => { const a = SHOT_TABLE.find((r) => r.id === "s17"), b = SHOT_TABLE.find((r) => r.id === "s19"); if (a && b && !ownerCamV3("s17", "lab")) try { CAMS_lab.s17?.(a.from, b.to); } catch { /* the owner is mid-edit */ } };
labSideEffect();

const missing: string[] = [], layered: string[] = [];
const STEP_ASIDE = 0.25;
const camFor = (id: string, set: string, from: number, to: number): ((t: number) => CamState) => {
  const pick = DIR_OVERRIDE[id] ?? ownerCamV3(id, set) ?? DIR_FALLBACK[id] ?? ownerCamPlain(id, set);
  if (!pick) { missing.push(id); return () => ({ pos: [0, 1.4, 4], look: [0, 1.2, 0], fov: 50 }); }
  let cam = pick(from, to);
  // the director's move only where the owner's own camera is (almost) still: once an owner gives a shot its own
  // designed move (>= STEP_ASIDE %/f by CORE's camSpeedStats), this layer steps aside by itself
  if (DIR_MOVE[id] && camSpeedStats(cam, from, to).median < STEP_ASIDE) { cam = withMove(cam, from, to, DIR_MOVE[id]); layered.push(id); }
  if (DIR_REAIM[id]) cam = reAim(cam, DIR_REAIM[id](from, to));
  // HOOK B: the punch-in on "He" holds to the cut; so that the face still MATCHES across cut 1 (same size, same screen
  // place), shot 2 opens with the same 1.25x on his face for its 10-frame hold and gives it back during its own move
  if (HOOK === "B" && id === "s01") { const f0 = Math.round(EV.punchIn * FPS); cam = punchIn(cam, (f) => (f >= f0 ? HOOK_B_ZOOM : 1), EYES_S01); }
  if (HOOK === "B" && id === "s02" && FACE_S02) cam = punchIn(cam, (f) => 1 + (HOOK_B_ZOOM - 1) * (1 - sm01((f - from - 10) / 30)), FACE_S02);
  return cam;
};

// ---------------------------------------------------------------- the light per shot
const rigOf = (r: (typeof SHOT_TABLE)[number]): Partial<RigSpec> | undefined =>
  r.look ? (JP_RIG[r.look] as Partial<RigSpec>) : (r.rigOpts as Partial<RigSpec> | undefined);

export const SHOTS: ShotDef[] = SHOT_TABLE.map((r) => {
  const rigOpts = rigOf(r);
  return { id: r.id, from: r.from, to: r.to, set: r.set, rig: r.rig, ...(rigOpts ? { rigOpts } : {}), cam: camFor(r.id, r.set, r.from, r.to) };
});
if (missing.length) console.error(`[pointing] no camera for shot(s) ${missing.join(", ")}: a placeholder lens is used`);
if (TIMELINE_NOTES.length) console.warn("[pointing] timeline: " + TIMELINE_NOTES.join(" | "));
if (typeof window !== "undefined") console.warn(`[pointing] script v3, hook ${HOOK}, ${TOTAL} f = ${(TOTAL / FPS).toFixed(2)} s, words from ${WORD_SOURCE}; director's camera layer on ${layered.join(" ") || "no shot"}`);
/** the shots that carry the director's motion layer right now (the probe prints it) */
export const DIR_LAYERED = layered;

export const FILM: Film = {
  slug: "pointing", fps: 30, total: TOTAL, shots: SHOTS,
  sets: { cab: build_cab, car: build_car, jp_platform: build_jp_platform, lab: build_lab },
};

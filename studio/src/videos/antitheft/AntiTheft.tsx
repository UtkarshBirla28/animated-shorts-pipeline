// "The Anti-Theft Sign That Made People Steal": flat cartoon characters in a painted 3D world.
// One three.js world (world.ts) posed per frame from the timeline (story.ts). Post chain per canvas (round 2):
//   InkPass (world ink + coloured contact shadows) -> Atmos (dehaze / heat shimmer / blueprint paper, per shot) ->
//   lens blur pre + main (thin-lens DOF from dofAt) -> camera motion blur (fast moves only) -> bloom (colour-aware
//   key, per-light threshold / strength, beat pulses) -> lens glows (glint twinkles + streak, LED / stamp / lamp / moon /
//   dusk horizon) -> NEUTRAL tone mapping -> colour grade (per light state + per-shot trim). MSAA 4.
// Every shot change is a cross-dissolve (story.ts XFADE / layersAt: a second canvas fades in over the first). Each
// layer is its own canvas with its own World and its own copy of every pass, and every per-light / per-shot post
// setting (ink tint, contact shade, atmosphere, motion blur camera, bloom, glows, grade, DOF) is set from THAT layer's
// shot (lightMix(id, f) = lightAt's relight blend), so nothing leaks between the two layers of a dissolve. No white
// flash anywhere (bible 13.C-19). Everything is a pure function of (shot id, frame): the motion-blur camera is
// camAt(id, f + 0.5), the shimmer clock is f / FPS, glows follow BEAT frames.
// Round 3 (audit A2): the shutter follows the lateral camera speed (camMotion: ~180 deg on whips, light on glides and
// zoom snaps); lens glows learned bokeh discs (dusk practicals), per-pixel occlusion (nothing paints over a nearer
// character), god rays (shot 13 sunset), a golden morning sun-side warmth (7-9) and steady LED halos (8-10, 13);
// atmosphere adds far aerial haze (vista) and a morning sky saturation; the grade adds exposure, a hue band (shot 8's
// pumpkin floor), tinted vignettes (golden / amber / violet / plum) and a warm ground grad (shot 10).
// Round 4 (audit A3): LED counters are drawn as a FACE (lens kind 5: the halo only outside the box, the face held near
// black, the digits' temperature split calm crimson A / hot red-orange B in shot 10) instead of a glow over the box;
// god rays (lensblur "far" mode: near posts / boards / people cut shadow shafts) from the low morning sun (7-9) and the
// late sun (6), moonlight shafts through the storeroom window panes (14: only the night backdrop behind the wall lets
// light through), and the
// sunset (13, + hexagon ghosts); a warm light leak + warm far haze that ramp with shot 6's relight; a heat shimmer behind
// the hook's MCU and a longer shutter on the dive (1); a deeper sky band over the vista horizon (2); a dehaze on shot
// 10's far band; a swell on the dusk tag flip (15). Every timed event is keyed to BEAT / SHOTS names, no frame numbers.
// Captions are one HTML layer above both canvases (Captions.tsx), so they never fade with the picture.
// QA toggles (inputProps.post): ink, lens, pre, bloom, grade, grain, captions, world (false = flat card behind the
// captions, for fast caption pixel / timing checks), dpr, layer ("base" | "over": draw only that layer of a dissolve at
// full opacity, to prove the composite = (1 - a) base + a over), inkDebug (1 = ink mask, 2 = world normals, 3 = contact
// shadow), ao (contact-shadow multiplier, 0 = off), atmos, mblur, lensfx (false = off), hot (true = show what the bloom
// key lets through in magenta, instead of the picture), frames (number[]: composition frame i renders film frame
// frames[i], so one clip render samples scattered frames with a warm page instead of one cold still per frame).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect, AtmosEffect, MotionBlurEffect, LensFxEffect, LensSrc, GodRays, brightPass, HotEffect } from "./lensblur";
import { GradeEffect, GRADES, gradeFor } from "./grade";
import { Kit } from "./build";
import { VOICE_TOTAL, WARP, toNew } from "./voicewarp";
import { SHOTS, FPS, BEAT, XFADE, shotAt, dofAt, camAt, camMotion, lightAt, smooth } from "./story";
import { stage } from "./cast";
import { TH, TT, SR, CL, type LightName, type V3 } from "./plan";
import { Captions } from "./Captions";

// ElevenLabs re-time (LEAD): the video is as long as the new narration; the scene runs on the old picture clock WARP[f]
export const ANTITHEFT_FRAMES = VOICE_TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean; captions: boolean; world: boolean;
  layer: "" | "base" | "over"; inkDebug: number; ao: number; atmos: boolean; mblur: boolean; lensfx: boolean; hot: boolean; frames?: number[]; rays: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, captions: true, world: true, layer: "", inkDebug: 0,
  ao: 1, atmos: true, mblur: true, lensfx: true, hot: false, rays: true,
  ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** the relight blend of shot `id` at frame f, exactly as lightAt (story.ts) blends it: light a -> b at k (0..1) */
export const lightMix = (id: number, f: number): { a: LightName; b: LightName; k: number } => {
  const s = SHOTS[id - 1];
  let cur: LightName = s.light, out = { a: cur, b: cur, k: 0 };
  for (const r of s.relight ?? []) {
    if (f < r.f) break;
    const k = smooth((f - r.f) / r.dur);
    out = { a: cur, b: r.to, k };
    if (k >= 1) cur = r.to;
  }
  return out;
};

// ---------------- bloom per light (bible 6.4: emissives only) ----------------
// th = key threshold (linear HDR), maxK = how much the key follows the max channel instead of luminance (1 = coloured
// emissives such as the red LED digits bloom), i = strength. Every value here keeps white faces / cream sign faces /
// clouds (<= 1.0 in every channel) out of the bloom; checked with post.hot on real frames of each light.
type BloomLook = { th: number; maxK: number; i: number };
const BLOOM: Record<LightName, BloomLook> = {
  // max-channel key at 1.7: only true emissives pass (LED digits 2.4, sun disc / halo, lamp bulbs 3-5.5, moon 2.0);
  // checked with post.hot on 13 frames of every light: at 1.0 the clouds (1.1), lamp-lit notes / crate letters
  // (~1.5), sunlit paper and face rims (~1.05-1.3) would all have bloomed
  noon: { th: 1.7, maxK: 1, i: 0.5 }, dim: { th: 1.7, maxK: 1, i: 0.5 }, late: { th: 1.7, maxK: 1, i: 0.5 },
  morning: { th: 1.7, maxK: 1, i: 0.55 }, sunset: { th: 1.7, maxK: 1, i: 0.6 }, dusk: { th: 1.6, maxK: 1, i: 0.65 },
  night_int: { th: 1.7, maxK: 1, i: 0.8 }, classroom: { th: 1.7, maxK: 1, i: 0.6 },
  // blueprint: the chalk lines and labels are the only things over 1.0 in luminance (unlit white on blue)
  blueprint: { th: 1.0, maxK: 0, i: 0.6 },
};
/** beat pulses on the bloom strength: LED counters locking (shot 10), the stamp impact (shot 13) */
const bloomPulse = (id: number, f: number) => {
  let k = 1;
  // round 4 (audit A3 P2: the "8%" punch washed the whole LED box orange): the lock pulse is small now (+30 %, no 2 f
  // punch); the cha-ching punch moved into the LED face itself (digit gain + the halo OUTSIDE the box, lensSources)
  if (id === 10) for (const F of [BEAT.pct2, BEAT.pct8]) { const n = f - F; if (n >= -1 && n < 12) k += 0.3 * (n < 0 ? 0.35 : Math.exp(-n / 2.6)); }
  // round 4 (ADD): the dusk tag flip on "twice" swells the bloom for 4 f (the lens glow on the tag does the visible part)
  if (id === 15) { const n = f - BEAT.twice; if (n >= 0 && n < 5) k += 0.35 * Math.sin((Math.PI * (n + 0.5)) / 5); }
  if (id === 13) { const n = f - BEAT.permission; if (n >= 0 && n < 5) k += 0.4 * Math.exp(-n / 1.4); }
  return k;
};

// ---------------- atmosphere per shot ----------------
// shimmer: heat haze on the far band of the noon exteriors (1-2 px @1080, 0.5 Hz); dehaze: the vista's 100-400 m
// haze down ~30 % (audit A1, shot 2: contrast sd 13.7 vs reference ~21); paper: blueprint fibres (shot 11).
// Shots 1 and 16 carry nothing here (frame 0 = last frame).
// round 3: dehazeFar = the dehaze fades back out beyond ~260-420 m, so the far domes and mesas keep their aerial haze
// (audit A2 shot 2 ADD: far domes ~40 % toward the horizon colour) while the 60-250 m mid-ground keeps its contrast;
// haze = extra aerial haze toward the fog colour on the far band; skySat = +10 % saturation on the morning sky only
// (WORLD-INT's grade ask with its new #3F86D8 -> peach morning sky).
// round 4: hazeCol = a warm haze colour (linear) instead of the fog colour; skyDeep = the pale band right above the
// horizon gets +sat / -value (shot 2: audit A3 P3 "a pale milky haze" behind the horizon); shimAmp = an amplitude
// envelope by frame (shot 1: the far horizon behind her MCU only, never on frame 0 / the loop)
type ShotPost = { dehaze?: [number, number, number, number]; dehazeFar?: [number, number]; haze?: [number, number, number];
  hazeCol?: [number, number, number]; skySat?: number; skyDeep?: [number, number, number];
  shimmer?: { amp: number; d0: number; d1: number; band: number }; shimAmp?: (f: number) => number; paper?: number;
  lineGlow?: [number, number, number] };
const SHIM = { amp: 1.5, d0: 120, d1: 300, band: 0.05 };
const MORNING_AIR: ShotPost = { dehaze: [0.3, 100, 420, 0.9], dehazeFar: [600, 900], skyDeep: [0.45, 0.08, 0.1] };
const SHOT_POST: Record<number, ShotPost> = {
  // shot 1 (round 4 ADD): heat haze on the far horizon behind the full-body / MCU beat ("one sign... and wanted to
  // steal"), fading in after "sign" and out as the dive starts; frame 0 and the loop end never carry it
  1: { shimmer: { amp: 1.6, d0: 90, d1: 240, band: 0.05 }, shimAmp: (f) => smooth((f - (BEAT.sign1 + 10)) / 10) * (1 - smooth((f - (BEAT.steal1 + 4)) / 8)) },
  // shot 2 (round 4, audit A3 P3): +8 % sky saturation, the extra far aerial haze 0.14 -> 0.05 (the milky mesa band ~-25 %
  // of its total whiteness, with the fog itself) and the milky band
  // above the horizon up to +60 % saturation / -12 % value at the horizon line (it is nearly white: x1.6 of a small chroma)
  2: { dehaze: [0.3, 60, 200, 0.9], dehazeFar: [260, 420], haze: [0.05, 320, 700], skySat: 1.08, skyDeep: [0.8, 0.12, 0.14], shimmer: { amp: 1.7, d0: 180, d1: 350, band: 0.35 } }, // the crane looks down: horizon above frame, so a wide band gated by distance
  3: { dehaze: [0.3, 60, 200, 0.9], dehazeFar: [260, 420], haze: [0.1, 320, 700] },
  4: { shimmer: SHIM },
  // shot 6 (round 4 ADD): a slight warm haze on the far badlands, ramping with the late relight (AntiTheft scales it)
  6: { shimmer: SHIM, haze: [0.13, 160, 520], hazeCol: [0.98, 0.62, 0.36] },
  // shot 10 (round 4, audit A3 P3): the horizon haze -15 % (dehaze on the 80-260 m band; the far mesas keep theirs)
  10: { shimmer: SHIM, dehaze: [0.15, 80, 260, 0.6], dehazeFar: [300, 480] },
  // shots 7-9 (round 5, audit A4 P2 shot 8: "a bright haze band flattens the mesas"): the 100-450 m band dehazed (the far
  // horizon keeps some aerial haze) and the pale band right above the horizon deepened, the same on all three shots
  7: { skySat: 1.1, ...MORNING_AIR }, 8: { skySat: 1.1, ...MORNING_AIR }, 9: { skySat: 1.1, ...MORNING_AIR },
  // shot 11 (round 5, audit A4 P2: flat white chalk lines, no bloom): the chalk lines / white labels lifted to 1.35 so
  // the blueprint bloom (threshold 1.0) gives them the reference's glow
  11: { paper: 0.15, lineGlow: [1.4, 0.55, 0.42] },
};

/** Bloom for emissive sources only; MIP chain always starts at 540x960 so the glow scales with the frame. */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

// ---------------- projection helpers ----------------
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), tv = new THREE.Vector3(), tw = new THREE.Vector3();
type Proj = { uv: [number, number]; dist: number; on: boolean };
const project = (cam: THREE.PerspectiveCamera, p: V3 | THREE.Vector3): Proj => {
  if (Array.isArray(p)) tv.set(p[0], p[1], p[2]); else tv.copy(p);
  const dist = -tw.copy(tv).applyMatrix4(cam.matrixWorldInverse).z;
  tv.project(cam);
  return { uv: [(tv.x + 1) / 2, (tv.y + 1) / 2], dist, on: dist > 0.05 && Math.abs(tv.x) < 1.4 && Math.abs(tv.y) < 1.4 };
};
/** screen uv.y of the horizon straight ahead (a point 1000 m out along the camera's horizontal heading) */
const horizonY = (cam: THREE.PerspectiveCamera) => {
  cam.getWorldDirection(tw); tw.y = 0; if (tw.lengthSq() < 1e-6) tw.set(0, 0, -1); tw.normalize();
  const p = project(cam, cam.position.clone().addScaledVector(tw, 1000));
  return p.uv[1];
};
/** px @1080 of a world length L seen at distance d */
const pxOf = (cam: THREE.PerspectiveCamera, L: number, d: number) => (L / Math.max(d, 0.05)) * cam.projectionMatrix.elements[5] * 960;
/** the camera-relative sun direction world.ts uses (mean view heading of the shot, turned by az, lifted by el); round 3:
 *  az / el come from lightAt(id, f) like world.ts (in-shot relights and any lights.ts / story.ts sun change follow) */
const headCache = new Map<number, [number, number]>();
const sunDirAt = (id: number, f: number) => {
  const s = SHOTS[id - 1], L = lightAt(id, f);
  let h = headCache.get(id);
  if (!h) {
    let fx = 0, fz = 0;
    for (let g = s.a; g < s.b; g += 3) { const c = camAt(id, g), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; h = [fx / n, fz / n]; headCache.set(id, h);
  }
  const [fx, fz] = h, A = THREE.MathUtils.degToRad(s.sunAz ?? L.az), E = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
  const hx = fx * Math.cos(A) - fz * Math.sin(A), hz = fz * Math.cos(A) + fx * Math.sin(A);
  return new THREE.Vector3(hx * Math.cos(E), Math.sin(E), hz * Math.cos(E)).normalize();
};
/** round 5 (found this round: the shot 13 streak, hexagon ghosts and god rays sat ~300 px @1080 BELOW the visible sunset
 *  disc, the streak crossing the stamp): the VISIBLE sunset sun is WORLD-INT's own (sets_int.ts sunsetDir: a point 8 m
 *  behind the gap between Sign B's top edge and its LED box, seen from the shot's opening camera, so the disc peeks over
 *  the panel as the camera pushes in), not world.ts's camera-relative sun. Same pure construction here, so every lens
 *  effect of shot 13 is anchored to the disc the viewer sees. */
let SUN13P: THREE.Vector3 | null = null;
const sun13Dir = (cam: THREE.PerspectiveCamera) => {
  if (!SUN13P) {
    const c = camAt(13, SHOTS[12].a), gap = new THREE.Vector3(TT.base[0] + TT.signB.dx - 0.02, 2.1, TT.base[2]);
    const d = gap.clone().sub(new THREE.Vector3(...c.pos)).normalize();
    SUN13P = gap.addScaledVector(d, 8);
  }
  return SUN13P.clone().sub(cam.position).normalize();
};
/** where the sun sits on screen: its projected uv (front hemisphere) or, when it is off to a side / behind, a point just
 *  outside the frame edge in its screen direction; facing = how much it faces the lens (0 behind .. 1 dead ahead) */
const cR = new THREE.Vector3(), cU = new THREE.Vector3(), cF = new THREE.Vector3();
/** round 4: the sun's TRUE screen uv (front hemisphere only, kept within a few frames of the screen), or null */
const sunRaw = (cam: THREE.PerspectiveCamera, sd: THREE.Vector3): [number, number] | null => {
  cR.setFromMatrixColumn(cam.matrixWorld, 0); cU.setFromMatrixColumn(cam.matrixWorld, 1); cF.setFromMatrixColumn(cam.matrixWorld, 2).negate();
  const z = sd.dot(cF), P = cam.projectionMatrix.elements;
  if (z < 0.08) return null;
  const u = Math.max(-4, Math.min(4, (sd.dot(cR) / z) * P[0])), v = Math.max(-4, Math.min(4, (sd.dot(cU) / z) * P[5]));
  return [(u + 1) / 2, (v + 1) / 2];
};
const sunScreen = (cam: THREE.PerspectiveCamera, sd: THREE.Vector3) => {
  cR.setFromMatrixColumn(cam.matrixWorld, 0); cU.setFromMatrixColumn(cam.matrixWorld, 1); cF.setFromMatrixColumn(cam.matrixWorld, 2).negate();
  const x = sd.dot(cR), y = sd.dot(cU), z = sd.dot(cF), P = cam.projectionMatrix.elements;
  let u = 0, v = 0;
  if (z > 0.05) { u = (x / z) * P[0]; v = (y / z) * P[5]; } else { u = x * 1e3; v = y * 1e3; }
  const m = Math.max(Math.abs(u), Math.abs(v));
  if (m > 1.15) { u = (u / m) * 1.15; v = (v / m) * 1.15; }
  return { uv: [(u + 1) / 2, (v + 1) / 2] as [number, number], facing: Math.max(0, z), inFrame: z > 0.05 && m <= 1.0 };
};

// ---------------- lens glows per shot (LensFxEffect) ----------------
const ledCentre = (s: { dx: number; cy: number; z: number }): V3 => [TT.base[0] + s.dx, s.cy + TT.led.dy, TT.base[2] + s.z + 0.07];
/** round 4: an LED face as a lens kind 5 source: its projected centre, half size (px @1080) and screen rotation, plus the
 *  halo colour / e-fold and the face settings (strength, digit temperature, digit gain) */
const ledFace = (cam: THREE.PerspectiveCamera, s: { dx: number; cy: number; z: number }, col: [number, number, number], efold: number,
  led: [number, number, number]): LensSrc | null => {
  const c = ledCentre(s), p = project(cam, c);
  if (!p.on) return null;
  const px = (q: Proj) => [q.uv[0] * 1080, q.uv[1] * 1920];
  const o = px(p), ex = px(project(cam, [c[0] + TT.led.w / 2, c[1], c[2]])), ey = px(project(cam, [c[0], c[1] + TT.led.h / 2, c[2]]));
  const vx = [ex[0] - o[0], ex[1] - o[1]], vy = [ey[0] - o[0], ey[1] - o[1]];
  const hw = Math.hypot(vx[0], vx[1]), hh = Math.hypot(vy[0], vy[1]);
  if (hw < 2) return null;
  return { uv: p.uv, dist: p.dist, kind: 5, col, rot: Math.atan2(vx[1], vx[0]), p: [hw, hh, Math.max(3, efold * hh)], led, occ: 0.3 };
};
// shot 2's opening log (story.ts V2LOG.west): rainbow cut-face centre and its normal toward the lens
const LOG2F: V3 = [-22 - Math.cos(0.2) * 4.5, 0.55, -30 - Math.sin(0.2) * 4.5], LOG2N: V3 = [-Math.cos(0.2), 0, -Math.sin(0.2)];
const LOG2T: V3 = [-LOG2N[2], 0, LOG2N[0]]; // along the face, horizontal
const onFace = (t: number, y: number): V3 => [LOG2F[0] + LOG2T[0] * t + LOG2N[0] * 0.03, LOG2F[1] + y, LOG2F[2] + LOG2T[2] * t + LOG2N[2] * 0.03];
// dusk practicals (sets_ext.ts, lit at dusk only): lamp-post bulb, kiosk lamp, the two gooseneck sign lights
const DUSK_LAMPS: { p: V3; k: number }[] = [
  { p: [TH.base[0] + 3.18, 3.97, TH.base[2] - 6], k: 1 }, { p: [-3.22, 2.28, -9.09], k: 0.7 },
  { p: [-0.4, TH.board.cy + TH.board.h / 2 + 0.31, 0.235], k: 0.55 }, { p: [0.4, TH.board.cy + TH.board.h / 2 + 0.31, 0.235], k: 0.55 },
  // the distant visitor centre's front windows (sets_ext: centre [26, 0, -86], yaw -0.25, front wall at local z 5)
  ...[-8, -4, 4, 8].map((lx) => ({ p: [24.75 + 0.969 * lx, 2.3, -81.1 + 0.247 * lx] as V3, k: 0.45 })),
];
const GLINT_CORE = false; // CHAR's bold 4-point star card (0.6 m, steal1-3, peaking 122-123) is the core star now
/** round 5: the LED roll of sets_ext.ts poseLed (shot 10: an ease-out 0.00 -> target over the 25 f before the beat,
 *  the true figure first ON the beat), as the string the counter shows: used to flicker the digits when they change */
const LED_ROLL = 25;
const ledShown = (target: number, land: number, f: number) => {
  const u = Math.max(0, Math.min(1, (f - (land - LED_ROLL)) / LED_ROLL));
  const v = u >= 1 ? target : Math.min(target - 0.01, target * (1 - (1 - u) ** 3));
  return (Math.round(Math.max(0, v) * 100) / 100).toFixed(2);
};
/** digit-change pop of one counter at picture time f (fp = the picture times of the 2 previous video frames): a units
 *  change pops 1.0 then 0.45 the next frame, a tenths change 0.7-0.85 (odd / even new digit), a hundredths change 0.45:
 *  the roll visibly TICKS as it slows into the beat (and holds still between changes) */
const ledPop = (target: number, land: number, f: number, fp: [number, number]) => {
  const s0 = ledShown(target, land, f), s1 = ledShown(target, land, fp[0]), s2 = ledShown(target, land, fp[1]);
  if (s0 !== s1) return s0[0] !== s1[0] ? 1 : s0[2] !== s1[2] ? (Number(s0[2]) % 2 ? 0.85 : 0.7) : 0.45;
  if (s1 !== s2 && s1[0] !== s2[0]) return 0.45;
  return 0;
};
/** fixed hash 0..1 (no Math.random: the lens-dust specks of shot 13) */
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lensSources = (id: number, f: number, cam: THREE.PerspectiveCamera, fp: [number, number] = [f - 1, f - 2]): LensSrc[] => {
  const out: LensSrc[] = [];
  const glow = (p: Proj, rx: number, ry: number, col: [number, number, number], occl = true, minVis = 0, occ = 0) =>
    p.on && out.push({ uv: p.uv, dist: occl ? p.dist : 0, kind: 0, col, p: [rx, ry], minVis, occ });
  const star = (W: V3, e: number, s: number, rot: number, warm = 1) => {
    const p = project(cam, W);
    if (p.on && e > 0) out.push({ uv: p.uv, dist: p.dist - 0.1, kind: 1, col: [1.5 * e * s, 1.42 * e * s, (1.22 - 0.2 * (1 - warm)) * e * s], rot, p: [16 * s, 3.2 * s, 1.6 * s], occ: 0.4 });
  };
  if (id === 1) {
    // the glint on the sparkly rainbow rock ("steal", ding at BEAT.steal1): round 3 (audit A2): a warm bloom SWELLS on
    // the rock 3 f before it; the main 4-point star peaks ON the ding (it used to peak 5-7 f late), two delayed
    // twinkles follow; the anamorphic streak is short (e-fold 45 px), soft (2.5 px) and at 0.7, and nothing of the
    // glint is ever painted over her card (per-pixel occlusion: she stands ~1 m nearer than the rock)
    const g = f - BEAT.steal1; // 0 = the ding
    const W0: V3 = [TH.glintRock[0], 0.14, TH.glintRock[2] + 0.06];
    const p0 = project(cam, W0);
    if (g >= -3 && g < 0) glow(project(cam, [TH.glintRock[0], 0.08, TH.glintRock[2]]), 54, 40, [0.1 * (g + 4), 0.055 * (g + 4), 0.02 * (g + 4)].map((v) => v / 4) as [number, number, number], true, 0.3, 0.4);
    if (g >= 0 && g < 12) {
      const env = g < 1 ? 0.8 : g < 5 ? 1 : Math.max(0, 1 - (g - 5) / 6);
      if (p0.on) {
        out.push({ uv: p0.uv, dist: p0.dist - 0.1, kind: 2, col: [0.7 * env, 0.62 * env, 0.48 * env], p: [45, 2.5], occ: 0.4 });
        glow(project(cam, [TH.glintRock[0], 0.08, TH.glintRock[2]]), 64, 46, [0.32 * env, 0.17 * env, 0.06 * env], true, 0.3, 0.4);
      }
      // the core star ON the ding (CHAR may add a bold 4-point star card at 124-134: if it lands, GLINT_CORE = false)
      if (GLINT_CORE) star(W0, g < 6 ? Math.sin((Math.PI * (g + 1)) / 7) : 0, 1.6, 0.12);
      const tw1 = g + 2, tw2 = g; // twinkles follow CHAR's star (it starts at steal1-3)
      if (tw1 >= 0 && tw1 < 6) star([W0[0] - 0.11, W0[1] + 0.05, W0[2] + 0.03], Math.sin((Math.PI * (tw1 + 0.5)) / 6), 1, 0.3);
      if (tw2 >= 0 && tw2 < 6) star([W0[0] + 0.09, W0[1] + 0.1, W0[2] + 0.01], 0.9 * Math.sin((Math.PI * (tw2 + 0.5)) / 6), 0.82, -0.2);
    }
  }
  if (id === 2) {
    // round 3 (audit A2 ADD): the crystal flecks on the opening cut face twinkle (141-150), so the hook's glint carries
    // across the match dissolve; three small stars, staggered 2-3 f, on the face while it is in frame
    const A2 = SHOTS[1].a; // round 4: keyed to the shot start (was 140 / 142 / 145)
    for (const [f0, t, y, s, r] of [[A2 - 1, 0.2, 0.12, 0.85, 0.2], [A2 + 1, -0.24, -0.08, 0.7, -0.3], [A2 + 4, -0.04, 0.27, 0.6, 0.5]] as const) {
      const n = f - f0;
      if (n >= 0 && n < 6) star(onFace(t, y), Math.sin((Math.PI * (n + 0.5)) / 6), s, r);
    }
  }
  if (id === 6) {
    // round 4 (audit A3 ADD): a soft warm light leak from screen right that ramps with the late relight (5-8 %): a wide
    // glow just outside the right edge where the late sun sits (story relight noon -> late), plus a faint warm streak
    const lk = lightMix(6, f), k = lk.b === "late" ? (lk.a === "late" ? 1 : lk.k) : 0;
    if (k > 0) {
      const sc = sunScreen(cam, sunDirAt(6, f)), e = k * (0.4 + 0.6 * sc.facing);
      out.push({ uv: [Math.max(1.02, sc.uv[0]), Math.min(0.85, Math.max(0.45, sc.uv[1]))], dist: 0, kind: 0, col: [0.1 * e, 0.054 * e, 0.02 * e], p: [480, 860] });
      out.push({ uv: [1.0, Math.min(0.85, Math.max(0.45, sc.uv[1]))], dist: 0, kind: 2, col: [0.035 * e, 0.019 * e, 0.007 * e], p: [380, 10] });
    }
  }
  if (id >= 7 && id <= 9) {
    // round 3 (audit A2 ADD, shots 7 / 9): golden morning sun-side warmth: a very wide, faint warm glow just outside the
    // frame edge on the sun's side (the low sun is camera-right, as the long violet shadows say), stronger when the
    // sun faces the lens; it wraps the sun-side rims, LED boxes and posts without ever blooming a face or a cloud
    // round 5 (audit A4 P2 shot 8: milky, low-chroma, L* sd ~17): this veil and the god rays below lifted the darks from
    // ~(27,8,30) to ~(73,31,36) in shot 8 (measured with post.lensfx off): 45 % of the strength, and it keeps 70 % off
    // the dark pixels (the long violet shadows and the ink stay deep, the lit floor keeps the warmth)
    const sc = sunScreen(cam, sunDirAt(id, f));
    const k = 0.45 * (0.35 + 0.65 * sc.facing);
    out.push({ uv: sc.uv, dist: 0, kind: 0, col: [0.075 * k, 0.045 * k, 0.017 * k], p: [620, 900], dark: 0.7 });
  }
  if (id === 8 || id === 9 || id === 13) {
    // round 3 (audit A2 FILM ADD): the lit LED counters keep a weak red halo (Sign B's is tarped and dark in shot 8);
    // round 4: as an LED face (the halo only outside the box, the face a little darker so the digits read)
    for (const s of id === 8 ? [TT.signA] : [TT.signA, TT.signB]) {
      const L = ledFace(cam, s, id === 13 ? [0.05, 0.012, 0.005] : [0.035, 0.007, 0.003], 0.7, [0.5, 0, 1]);
      if (L) out.push(L);
    }
  }
  if (id === 10) {
    // round 4 (audit A3 P2: the "8%" glow / bloom punch turned the whole box orange, digits pale pink on orange): each
    // counter is an LED FACE: the halo only OUTSIDE the box, the face held near black #140C0A (it also clears the bloom
    // haze the digits spread over it), the lock punch goes into the digits (gain) and the outside halo. ADD: a warm / cool
    // split on the payoff: Sign A's counter turns a calmer crimson after its landing, Sign B's a hot red-orange after "8%"
    // (calm vs alarm in the closing comparison frame)
    for (const [s, F, hot] of [[TT.signA, BEAT.pct2, false], [TT.signB, BEAT.pct8, true]] as const) {
      const n = f - F, cmp = smooth((f - (BEAT.pct8 + 6)) / 8);
      const lock = n >= -1 && n < 12 ? (n < 0 ? 0.35 : Math.exp(-n / 2.6)) * (hot && n >= 0 && n < 2 ? 1.5 : 1) : 0;
      const temp = (hot ? 0.75 : -0.55) * smooth((n + 2) / 8);
      const b = (f >= F - 30 ? 0.04 + 0.025 * cmp : 0.022) * (1 + 2.2 * lock);
      const col: [number, number, number] = hot ? [b, b * (0.22 + 0.2 * smooth((n + 2) / 8)), b * 0.05] : [b, b * 0.16, b * (0.07 + 0.25 * smooth((n + 2) / 8))];
      // round 5 (audit A4 ADD): the digits flicker brighter for 1-2 f on each change during both rolls, and a soft red
      // bloom sits on the digit row (the face otherwise clears the bloom the digits spread over it)
      const pop = ledPop(hot ? 7.92 : 1.67, F, f, fp), lit = f >= F - LED_ROLL - 1 ? 1 : 0.45;
      const L = ledFace(cam, s, col, 0.55 + 0.35 * lock, [0.85, temp, (1 + 0.3 * lock) * (1 + 0.45 * pop)]);
      if (L) {
        out.push(L);
        const c = ledCentre(s), dg = project(cam, [c[0], c[1] - 0.15 * TT.led.h, c[2] + 0.01]);
        const e = lit * (1 + 1.6 * pop + 1.4 * lock) * (hot ? 1 : 0.85);
        if (dg.on) out.push({ uv: dg.uv, dist: dg.dist, kind: 0, col: [0.05 * e, hot ? 0.009 * e : 0.004 * e, 0.003 * e], p: [0.95 * L.p[0], 0.62 * L.p[1]], occ: 0.3, minVis: 0.5 });
      }
    }
  }
  if (id === 12) {
    // classroom: a soft warm bloom on the four bright window panes (south wall, behind the student in the close-up);
    // half of it survives when a head covers a pane centre (minVis), so the glow never pops
    for (const x of [-3.35, -1.85, -0.35, 1.15]) {
      const p = project(cam, [CL.base[0] + x, CL.base[1] + 1.65, CL.base[2] + CL.room.d / 2 - 0.02]);
      if (p.on) glow(p, 0.55 * pxOf(cam, 1.5, p.dist), 0.55 * pxOf(cam, 1.5, p.dist), [0.075, 0.066, 0.05], true, 0.5);
    }
  }
  if (id === 13) {
    // the stamp impact: a short warm flare streak + soft flash
    const n = f - BEAT.permission;
    const c: V3 = [TT.base[0] + TT.signB.dx, TT.signB.cy, TT.base[2] + TT.signB.z + 0.06];
    if (n >= 0 && n < 7) {
      const e = Math.exp(-n / 1.8), p = project(cam, c);
      if (p.on) { out.push({ uv: p.uv, dist: 0, kind: 2, col: [0.5 * e, 0.3 * e, 0.15 * e], p: [210, 6] }); glow(p, 150, 120, [0.13 * e, 0.075 * e, 0.035 * e], false); }
    }
    // round 3 (audit A2 ADD): the low sun gets a SOFT warm anamorphic streak (~10 %, 7 px thick: never a scanline); a
    // third of it leaks round the sign when the disc hides behind it (minVis). No extra glow: sets_int.ts draws the halo.
    const sd13 = sun13Dir(cam), sc = sunScreen(cam, sd13), sp = project(cam, cam.position.clone().addScaledVector(sd13, 900));
    if (sp.on) out.push({ uv: sp.uv, dist: 899, kind: 2, col: [0.15, 0.085, 0.035], p: [320, 7], minVis: 0.35 });
    else if (sc.facing > 0.3) out.push({ uv: sc.uv, dist: 0, kind: 0, col: [0.07, 0.04, 0.016], p: [520, 620] });
    // round 5 (audit A4 ADD): faint warm lens-dust specks in the backlight: 10 soft discs on the GLASS (a ring round the disc,
    // a slow drift up and out), lit by the sun's nearness on screen (e-fold 560 px); never on anything nearer than ~6 m
    // (the faces, the sign: per-pixel occlusion), so they live on the sky and the far land round the sun disc
    const dv = smooth((sc.facing - 0.55) / 0.3), su = sp.on ? sp.uv : sc.uv, t13 = f - SHOTS[12].a;
    if (dv > 0) for (let i = 0; i < 10; i++) {
      const a = hsh(i), b = hsh(i + 17.3), r = hsh(i + 41.9), w = hsh(i + 73.1);
      // (first pass: a square scatter over the frame put most specks on the sign / LED box, where the occlusion hides
      // them) -> a loose ring 70-420 px round the disc, golden-angle spaced, drifting slowly up and out
      const ang = 2.39996 * i + 0.6 * a + 0.0015 * t13 * (b - 0.5), rad = 70 + 350 * Math.pow(b, 0.8) + 0.25 * t13 * (0.3 + r);
      const x = su[0] + (Math.cos(ang) * rad) / 1080 + 0.004 * Math.sin(0.05 * t13 + 6.3 * w);
      const y = su[1] + (Math.sin(ang) * rad) / 1920 + 0.00018 * t13 + 0.003 * Math.cos(0.043 * t13 + 5.1 * a);
      const dpx = Math.hypot((x - su[0]) * 1080, (y - su[1]) * 1920), R = 13 + 22 * r;
      const e = dv * Math.exp(-dpx / 520) * (0.55 + 0.45 * w) * (0.85 + 0.15 * Math.sin(0.11 * t13 + 9 * r));
      if (x > -0.05 && x < 1.05 && y > -0.05 && y < 1.05 && e > 0.02)
        out.push({ uv: [x, y], dist: 18, kind: 4, col: [0.9 * e, 0.6 * e, 0.3 * e], p: [R, 0.35 * R, 0.7], occ: 6, minVis: 1 });
    }
    // round 4 (audit A3 ADD): 3 faint hexagonal lens ghosts on the line from the sun through the frame centre (additive
    // ~10-15 % where they cross dark shade), warm amber / rose / pale gold; they live and die with the sun's visibility
    if (sp.on) {
      const du = sp.uv[0] - 0.5, dv = sp.uv[1] - 0.5;
      for (const [t, R, c] of [[-0.7, 40, [0.055, 0.032, 0.014]], [-1.45, 70, [0.04, 0.025, 0.028]], [-2.3, 28, [0.05, 0.038, 0.016]]] as [number, number, [number, number, number]][]) {
        const g: [number, number] = [0.5 + du * t, 0.5 + dv * t * 1.0];
        const off = Math.hypot((g[0] - sp.uv[0]) * 1080, (g[1] - sp.uv[1]) * 1920), R2 = Math.max(R, 0.06 * off);
        out.push({ uv: g, dist: 899, kind: 6, col: c, rot: 0.26, p: [R2, 2.5, 0.5], minVis: 0.3, probe: sp.uv });
      }
    }
  }
  if (id === 14) {
    // desk-lamp bulb glow (spills even when the bulb hides in its shade), cool moon glow, warm haze in the beam
    const head: V3 = [SR.base[0] + SR.lamp[0] + 0.33, SR.base[1] + SR.lamp[1] + 0.43, SR.base[2] + SR.lamp[2] + 0.11];
    const crate: V3 = [SR.base[0] + SR.crate[0] + 0.1, SR.base[1] + 0.65, SR.base[2] + SR.crate[2]];
    const aim = new THREE.Vector3(crate[0] - head[0], crate[1] - head[1], crate[2] - head[2]).normalize();
    const bulb = new THREE.Vector3(...head).addScaledVector(aim, 0.05);
    glow(project(cam, bulb), 58, 58, [0.2, 0.12, 0.05], true, 0.45);
    glow(project(cam, new THREE.Vector3(...head).lerp(new THREE.Vector3(...crate), 0.55)), 190, 150, [0.03, 0.019, 0.008], false);
    glow(project(cam, [SR.base[0] - 2.3, SR.base[1] + 2.2, SR.base[2] - SR.room.d / 2 - 1.5]), 46, 46, [0.07, 0.085, 0.12], true, 0);
  }
  if (id === 15) {
    // blue hour: a warm glow band along the horizon (far world and sky; only a trace over the near tourist)
    // round 4 (audit A3 WORLD-INT P2: the dusk reads as a flat pink haze; POST: ~30 % less pink haze): 0.16 -> 0.11
    out.push({ uv: [0.5, horizonY(cam)], dist: 0, kind: 3, col: [0.11, 0.056, 0.03], p: [170, 0.08, 60] });
    // round 4 (audit A3 ADD): a 4-5 f swell on the tag as it flips to "2" on "twice", so the final 2 pops: a soft warm
    // glow over the tag card (CHAR's tag fx from cast.stage, the same pure function world.ts just posed) + a tiny twinkle
    const n = f - BEAT.twice;
    if (n >= -1 && n < 6) {
      const tag = tagAt(f, cam);
      if (tag) {
        const p = project(cam, tag.p), e = n < 0 ? 0.25 : Math.sin((Math.PI * (n + 1)) / 7);
        const R = pxOf(cam, tag.w, p.dist);
        // (first pass 0.11 peak at 0.75 R: invisible on the cream card) -> a tighter, brighter swell + a twinkle on the "2"
        const r = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), two: V3 = [tag.p[0] + r.x * 0.36 * tag.w, tag.p[1] + 0.02, tag.p[2] + r.z * 0.36 * tag.w];
        if (p.on) { glow(p, 0.62 * R, 0.42 * R, [0.22 * e, 0.16 * e, 0.085 * e], false); glow(project(cam, two), 0.22 * R, 0.22 * R, [0.2 * e, 0.12 * e, 0.07 * e], false); if (n >= 0 && n < 5) star(two, e, 1.0, 0.2); }
      }
    }
    // round 3 (audit A2 ADD): soft warm BOKEH discs from the dusk practicals in the blurred background, sized from this
    // frame's lens (CoC at the lamp's depth, x2.2, 12-32 px), with a faint bright rim; occluded by the tourist (occ) and
    // hidden when the bulb itself is behind something (lfVis)
    const d = dofAt(15, f), fw15 = cam.getWorldDirection(new THREE.Vector3());
    const focus = d.focus ? Math.max(0.3, new THREE.Vector3(...d.focus(f)).sub(cam.position).dot(fw15)) : 3;
    for (const L of DUSK_LAMPS) {
      const p = project(cam, L.p);
      if (!p.on || p.uv[0] < -0.05 || p.uv[0] > 1.05 || p.uv[1] < -0.05 || p.uv[1] > 1.05) continue;
      const coc = d.cInf * Math.abs(1 - focus / Math.max(p.dist, 0.1)), R = Math.min(32, Math.max(12, 2.2 * coc));
      const e = L.k * Math.min(1, 220 / (R * R));
      out.push({ uv: p.uv, dist: p.dist, kind: 4, col: [0.55 * e, 0.3 * e, 0.09 * e], p: [R, 1.8, 0.55], occ: 1.0 });
      glow(p, 2.2 * R, 2.2 * R, [0.05 * L.k, 0.028 * L.k, 0.01 * L.k], true, 0, 1.0);
    }
  }
  return out;
};
/** the dusk tag card (shot 15): CHAR's own fx placement from cast.stage (pure: the same call world.update made) */
const tagAt = (f: number, cam: THREE.PerspectiveCamera): { p: V3; w: number } | null => {
  const L = lightAt(15, f), right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const sun = L.key ? new THREE.Vector3(...L.key).normalize() : sunDirAt(15, f);
  const st = stage(15, f, { pos: cam.position, right, sun }, L);
  const t = st.fx.find((x) => /^tag[12]$/.test(x.key)) ?? st.fx.find((x) => /^chiptag[12]$/.test(x.key));
  return t ? { p: [t.x, t.y, t.z], w: t.w } : null;
};
/** god rays (round 3, audit A2 ADD shot 13): thin warm shafts round Sign B from the low backlit sun; round 4 (audit A3
 *  ADD): faint warm shafts from the low morning sun off the right edge through the post gaps (7-9, 10-15 %), and cool
 *  moonlight shafts through the storeroom window (14, bright mode: the lit panes let the light through) */
const godRays = (id: number, f: number, cam: THREE.PerspectiveCamera): GodRays | null => {
  if (id === 13) {
    const sc = sunScreen(cam, sun13Dir(cam));
    if (sc.facing < 0.5) return null;
    const k = smooth((sc.facing - 0.5) / 0.3);
    return { uv: sc.uv, col: [0.2 * k, 0.11 * k, 0.042 * k], fall: 320, len: 0.92 };
  }
  // the low sun sits OFF the frame (far right, just above the horizon): rays march toward its true screen point (not
  // the clamped edge point, which lands on the ground), capped at 1500 px, with a falloff scaled to its distance
  // (first pass, sky mode: no shafts at all, since no post crosses the sky near an off-screen sun, just a +20-level warm
  // veil) -> "far" mode: everything beyond D0 m lets the light through, so the near posts, boards and people cut
  // slanting shadow shafts out of a faint warm scatter (march capped at 650 px: a board / a post / a head then covers a
  // readable share of the taps, so its shadow shaft shows)
  const far = (sd: THREE.Vector3, k: number, col: [number, number, number], skyW: number, D0: number, dark = 0): GodRays | null => {
    const r = sunRaw(cam, sd);
    if (!r || k <= 0) return null;
    const D = Math.hypot((r[0] - 0.5) * 1080, (r[1] - 0.5) * 1920);
    return { uv: r, col: [col[0] * k, col[1] * k, col[2] * k], fall: Math.max(420, 0.8 * D), len: 0.95, skyW, maxPx: 650, mode: "far", th: D0, dark };
  };
  // round 5 (audit A4 P2 shot 8 milky): the far-mode scatter is mostly a uniform veil (most taps see far land): 55 % of
  // it, kept 75 % off the dark pixels, so the post shadow shafts stay and the frame keeps its contrast
  if (id >= 7 && id <= 9) { const sd = sunDirAt(id, f), sc = sunScreen(cam, sd); return far(sd, 0.55 * smooth((sc.facing - 0.25) / 0.3), [0.1, 0.06, 0.023], 0.05, 14, 0.75); }
  if (id === 6) {
    // shot 6 (round 4 ADD, with the light leak): the late sun off the right edge throws faint warm shafts past the
    // posts and her hat, only as the relight turns late
    const lk = lightMix(6, f), kl = lk.b === "late" ? (lk.a === "late" ? 1 : lk.k) : 0, sd = sunDirAt(6, f), sc = sunScreen(cam, sd);
    return far(sd, kl * smooth((sc.facing - 0.3) / 0.3), [0.075, 0.041, 0.015], 0.05, 14, 0.5);
  }
  if (id === 14) {
    // (first pass, bright mode: the lavender moonbeam on the wall is as bright as the panes, so no shafts) -> far mode
    // with a narrow step just behind the back wall: only the night backdrop seen THROUGH the panes (sets_int: 0.92 m
    // behind the wall) lets the moonlight through, so the frame and the cross mullion cut shafts into the room. The
    // source is sets_int's moon (o + [-1.95, 2.15, -D - 0.7]); the wall's view depth comes from the window centre.
    const moon = project(cam, [SR.base[0] - 1.95, SR.base[1] + 2.15, SR.base[2] - SR.room.d / 2 - 0.7]);
    const wall = project(cam, [SR.base[0] - 1.85, SR.base[1] + 1.9, SR.base[2] - SR.room.d / 2]);
    if (!moon.on || !wall.on) return null;
    // (at 540 the shafts read as a soft cool glow round the panes, not crisp beams: kept low so the night stays deep)
    return { uv: moon.uv, col: [0.032, 0.045, 0.085], fall: 520, len: 0.9, mode: "far", th: -(wall.dist + 0.4), skyW: 1 };
  }
  return null;
};

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("antitheft kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const PROBES: [number, number][] = [[0, 0], [-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8], [0, -0.8], [0, 0.8], [-0.8, 0], [0.8, 0]];
/** largest screen displacement (px @1080) of 9 probe rays at the focus distance and at 1 km between cam and next */
const maxShift = (cam: THREE.PerspectiveCamera, next: THREE.PerspectiveCamera, dist: number) => {
  let m = 0;
  for (const d of [dist, 1000]) for (const [x, y] of PROBES) {
    tv.set(x, y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(d).add(cam.position);
    tv.project(next);
    m = Math.max(m, Math.hypot((tv.x - x) * 540, (tv.y - y) * 960));
  }
  return m;
};

/** round 5: per-frame motion-blur caps (px @1080) [everything, character cards], on the picture clock, keyed to BEAT:
 *  the shot 10 punch into the 7.92 % counter (~31 %/f zoom on its first frame), the shot 12 crane-swing (audit A4 P2:
 *  27 px = 2.5 % of the width at its peak, faces <= 6 px once the student is in frame), the shot 13 snap (blur on <= 2 f,
 *  none through the kick), the shot 15 snap + pull onto frame 0 (~24 px) */
const MB_MAX = 48;
const mbCaps = (id: number, f: number): [number, number] => {
  if (id === 10) { const n = f - BEAT.pct8; if (n >= -1.5 && n < 5) return [20, 20]; }
  if (id === 12) { const a = BEAT.cheated - 4; if (f >= a - 1 && f < a + 60) return [27, f >= BEAT.hears - 1.5 ? 6 : 27]; }
  if (id === 13) { const n = f - BEAT.permission; if (n >= -1.5 && n < 0.5) return [16, 16]; if (n >= 0.5 && n < 12) return [0, 0]; }
  if (id === 15 && f >= BEAT.twice - 1.5) return [24, 24];
  return [MB_MAX, MB_MAX];
};

const Inner: React.FC<{ id: number; kit: Kit; f: number; vf: number; rate: number; fp: [number, number] }> = ({ id, kit, f, vf, rate, fp }) => {
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const next = useMemo(() => new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 1500), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => {
    const bloom = makeBloom();
    return {
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
      atmos: new AtmosEffect(),
      // round 3: nearScale 1.2 -> 1.5 (audit A2 P3 shot 5: the near-field ground and framers blur a little more than
      // the thin-lens rule alone gives, so the sharp band at the bottom of the MS stops pulling the eye)
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.5 }),
      mblur: new MotionBlurEffect({ shutter: 0.22, knee: 3, maxLen: 48 }),
      bloom, bright: brightPass(bloom),
      lensfx: new LensFxEffect(),
      hot: new HotEffect(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADES.noon, 1),
      grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
    };
  }, [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  fx.ink.debug = on.inkDebug;
  fx.ink.aoScale = on.ao;
  const post = useMemo(() => {
    const list: React.ReactElement[] = [];
    const add = (k: string, o: object) => list.push(<primitive key={k} object={o} dispose={null} />);
    if (on.ink) add("ink", fx.ink);
    if (on.atmos) add("atmos", fx.atmos);
    if (on.lens && on.pre) add("pre", fx.lens.pre);
    if (on.lens) add("lens", fx.lens.main);
    if (on.mblur) add("mblur", fx.mblur);
    if (on.hot) add("hot", fx.hot);
    else {
      if (on.bloom) add("bloom", fx.bloom);
      if (on.lensfx) add("lensfx", fx.lensfx);
      add("tone", fx.tone);
      if (on.grade) add("grade", fx.grade);
      if (on.grain) add("grain", fx.grain);
    }
    // autoClear off: R3F's composer otherwise renders every pass with renderer.autoClear on, so an effect pass that
    // writes into the MSAA buffer owning the depth texture clears its depth renderbuffer, and the resolve after the
    // draw overwrites the depth texture with 1.0 for every LATER depth pass (lens blur, motion blur, glows saw "all
    // far" = a uniform 10 px blur). The RenderPass clears on its own (ClearPass); every other pass draws full-screen.
    return <EffectComposer multisampling={4} autoClear={false}>{list}</EffectComposer>;
  }, [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene, vf)); // vf = the VIDEO frame (narration clock) for idle life
  noInkFallback(world.root);
  // ---- lens blur ----
  const d = dofAt(id, f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  const focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.focus = focus;
  fx.lens.cInf = on.lens ? d.cInf : 0;
  // ---- per-layer light: ink tint + contact shade + bloom + grade follow this shot's light, never the other layer's ----
  const m = lightMix(id, f);
  fx.ink.look(m.a, m.b, m.k);
  fx.ink.lens(focus, on.lens ? d.cInf : 0);
  const BA = BLOOM[m.a], BB = BLOOM[m.b], L = (x: number, y: number) => x + (y - x) * m.k;
  fx.bright(L(BA.th, BB.th), 0.3, L(BA.maxK, BB.maxK));
  fx.bloom.intensity = L(BA.i, BB.i) * bloomPulse(id, f);
  fx.hot.set(L(BA.th, BB.th), L(BA.maxK, BB.maxK));
  gradeFor(fx.grade, m.a, m.b, m.k, id, f);
  fx.grain.seed = f;
  // ---- atmosphere (this layer's own fog + camera) ----
  const sp = SHOT_POST[id] ?? {};
  const proj: [number, number] = [cam.projectionMatrix.elements[0], cam.projectionMatrix.elements[5]];
  const fog = scene.fog && (scene.fog as THREE.Fog).isFog ? (scene.fog as THREE.Fog) : null;
  const shimK = sp.shimAmp ? sp.shimAmp(f) : 1;
  // shot 6: the warm far haze follows the late relight (0 at noon -> full once the light is "late")
  const late6 = id === 6 ? (m.b === "late" ? (m.a === "late" ? 1 : m.k) : 0) : 1;
  const haze = sp.haze && late6 > 0 ? ([sp.haze[0] * late6, sp.haze[1], sp.haze[2]] as [number, number, number]) : id === 6 ? undefined : sp.haze;
  const hor = horizonY(cam);
  fx.atmos.set({ dehaze: sp.dehaze, dehazeFar: sp.dehazeFar, haze, hazeCol: sp.hazeCol, skySat: sp.skySat, paper: sp.paper, lineGlow: sp.lineGlow,
    skyDeep: sp.skyDeep, skyHorizon: hor,
    shimmer: sp.shimmer && shimK > 0.001 ? { ...sp.shimmer, amp: sp.shimmer.amp * shimK, horizon: hor, t: f / FPS } : undefined },
    fog, cam.matrixWorld, proj, on.ink ? fx.ink.worldDepth ?? null : null);
  // ---- camera motion blur: a camera sampled inside the SAME integer frame as f (the impact kicks flip on integer frames
  // and the picture clock is fractional since the re-time: f + 0.5 could land in the next kick bucket), half a frame
  // ahead when there is room, else behind; its step is scaled to one VIDEO frame of motion (x the warp rate) ----
  if (on.mblur) {
    const fl = Math.floor(f + 1e-6), up = fl + 0.999 - f, dn = f - fl;
    const step = up >= 0.25 ? Math.min(0.5, up) : -Math.min(0.5, Math.max(dn, 0.05));
    const c = camAt(id, f + step);
    next.position.set(...c.pos); next.up.set(0, 1, 0); next.lookAt(...c.look); next.rotateZ(c.roll);
    next.fov = c.fov; next.aspect = cam.aspect; next.near = cam.near; next.far = cam.far; next.updateProjectionMatrix(); next.updateMatrixWorld();
    // round 3 (audit A2 P3, shot 9 truck at 6-7 %w/f nearly sharp; shot 1 dive): the shutter follows the LATERAL image
    // speed (story.ts camMotion: pan / truck / tilt, not zoom): 0.22 f (light) up to 2 %/f, ~180 deg (0.5 f = half the
    // per-frame shift) from 5.5 %/f. Zoom snaps ("8%", "permission", "twice") keep the light 0.22 f so the payoff frame
    // stays legible; the 3 px knee keeps creeps and slow glides crisp, so sign text only softens while the camera whips
    const mo = camMotion(id, f), lat = Math.max(Math.abs(mo.dx) / 1080, Math.abs(mo.dy) / 1920) * 100 * rate; // %w per VIDEO frame
    fx.mblur.shutter = 0.22 + 0.28 * smooth((lat - 2) / 3.5);
    // round 4 (audit A3 ADD shot 1): the dive into the glinting rock is a push (radial motion, not lateral), so it kept
    // the light shutter; its fastest frames (from ~8 f after "steal" to the vista dissolve) get ~150 deg of directional
    // (radial) blur, ramped so the ding frame itself stays crisp
    if (id === 1) fx.mblur.shutter = Math.max(fx.mblur.shutter, 0.22 + 0.2 * smooth((f - (BEAT.steal1 + 3)) / 6));
    const amt = rate / (2 * step); // sampled step -> one video frame (signed: the kernel is centred, a backward step is fine)
    const shift = maxShift(cam, next, Math.min(focus, 60)) * 2 * fx.mblur.shutter * Math.abs(amt); // blur length (px @1080) of the fastest probe
    const [cap, capCard] = mbCaps(id, f);
    fx.mblur.caps(cap, capCard, on.ink ? fx.ink.worldDepth ?? null : null);
    const vp = new THREE.Matrix4().multiplyMatrices(next.projectionMatrix, next.matrixWorldInverse);
    fx.mblur.set(shift > fx.mblur.knee + 0.5 && cap > 0.5 ? amt : 0, cam.matrixWorld, vp, proj);
  }
  // ---- lens glows ----
  fx.lensfx.set(on.lensfx ? lensSources(id, f, cam, fp) : [], on.lensfx && on.rays ? godRays(id, f, cam) : null);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

// ---------------- dissolves on the VIDEO clock (round 5) ----------------
// Audit A4 P3 shot 7: the 6 -> 7 dissolve popped in at ~35 % (first step 2x every later one): story.ts layersAt steps
// in whole PICTURE frames, and the re-time samples the picture clock at fractional, uneven times, so the first sampled
// frame of a dissolve could land a whole step in, and a slow passage stretched a 7 f dissolve to 10-12 video frames.
// Now every dissolve runs in equal steps on the VIDEO clock: XFADE + 1 steps (7 f dissolve = alpha 1/8 .. 7/8 on 7
// video frames, the first <= 12.5 %), centred on the video frame where the picture reaches the shot boundary, and
// clamped so both layers stay inside the shots' lifetimes (s.a - 4 .. s.a + 4 picture frames).
const XFV = SHOTS.slice(1).filter((s) => XFADE[s.id]).map((s) => {
  const vc = toNew(s.a), half = (XFADE[s.id] + 1) / 2;
  return { id: s.id, lo: Math.max(vc - half, toNew(s.a - 3.95)), hi: Math.min(vc + half, toNew(s.a + 3.95)) };
});
const layersV = (vf: number, f: number): { id: number; alpha: number }[] => {
  for (const x of XFV) if (vf > x.lo && vf < x.hi) return [{ id: x.id - 1, alpha: 1 }, { id: x.id, alpha: (vf - x.lo) / (x.hi - x.lo) }];
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** the dissolve layers of video frame vf (picture time f) (QA: only one of them, opaque) */
const pickLayers = (vf: number, f: number, which: PostToggles["layer"]) => {
  const ls = layersV(vf, f);
  if (!which) return ls;
  const l = which === "base" ? ls[0] : ls[ls.length - 1];
  return [{ id: l.id, alpha: 1 }];
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number; f: number; vf: number; rate: number; fp: [number, number] }> = ({ id, kit, alpha, f, vf, rate, fp }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.1, far: 1500 }}>
      <Inner id={id} kit={kit} f={f} vf={vf} rate={rate} fp={fp} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const AntiTheftShort: React.FC = () => {
  const on = useMemo(toggles, []);
  const cf = useCurrentFrame();
  const vf = on.frames && on.frames.length ? on.frames[Math.min(cf, on.frames.length - 1)] : cf; // video frame (new voice clock)
  const W = (v: number) => WARP[Math.max(0, Math.min(WARP.length - 1, Math.round(v)))];
  const f = W(vf);                                                                                    // picture clock (old, fractional)
  // round 5: picture frames per video frame here (motion blur on the real on-screen speed) and the picture times of the
  // two previous video frames (the LED digit flicker)
  const rate = Math.max(0.05, (W(vf + 1) - W(vf - 1)) / (vf > 0 && vf < WARP.length - 1 ? 2 : 1));
  const fp: [number, number] = [vf >= 1 ? W(vf - 1) : f - 1, vf >= 2 ? W(vf - 2) : f - 2];
  const kit = useKit();
  if (!kit) return null;
  return (
    <AbsoluteFill style={{ background: on.world ? "#bcd3ee" : "#b9a58c" }}>
      {on.world ? pickLayers(vf, f, on.layer).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} f={f} vf={vf} rate={rate} fp={fp} />) : null}
      {on.captions ? <Captions frame={vf} /> : null}
    </AbsoluteFill>
  );
};

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
// Round 6 (audit A5): idle loops (heat shimmer, lens dust, motes, LED scanlines) on the VIDEO clock; a speed gate on the
// motion blur (off below 2.2 %W/f) with a tent kernel (no ghost outlines); a cartoon impact burst + dust puffs on the stamp
// (13); warm motes + a soft shaft in the morning (7-8), a horizon dust band + low-sun bloom (7-9); LED scanlines + a 6 f
// cha-ching shake (10); chalk-line heads (11); glow dissolves 11 -> 12 and 15 -> 16 (a CSS filter on the canvas group).
// Round 7 (audit A6): the 10 -> 11 pivot dissolve runs 7 video f as a COOL glow dissolve with chalk-dust specks drifting
// through it; the morning sky (7-9) is re-graded by elevation onto a peach-horizon -> deep-blue ramp (AtmosEffect skyGrad,
// relative to the world's live sky stops); shot 6's late light: a sun-side warm corner glow + lamp-bulb blooms, the warm
// far haze halved; shot 7: the low sun's glow + soft beams behind the professor at the orbit's end; shot 8: a backlight
// bloom behind the far mesas + a faint lens streak in the wide, the crane-swing landing de-blurred; shot 9: a right-edge
// morning flare; shot 10: the LED roll re-ported onto the video clock, a one-frame dot-matrix flicker on each final digit
// step, a red LED spill on the panel tops; shot 12: chalk-dust glints; shot 13: display-space god rays (grade.ts) + a warm
// top vignette in the payoff framing and a 3 f warm impact pulse. Keyed to BEAT / SHOTS / the warp only.
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
import { SHOTS, FPS, BEAT, XFADE, shotAt, dofAt, camAt, camMotion, lightAt, smooth, V, PV } from "./story";
import { ledShownAt, LED_LANDS } from "./sets_ext";
import { sunsetPoint } from "./sets_int";
import { stage } from "./cast";
import { TH, TT, SR, CL, BP, type LightName, type V3 } from "./plan";
import { Captions } from "./Captions";
import { untone } from "./shade";

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
  morning: { th: 1.7, maxK: 1, i: 0.55 }, sunset: { th: 1.7, maxK: 1, i: 0.5 } /* round 8 (A7 P3 shot 13 sky bloom): .6 -> .5 */, dusk: { th: 1.6, maxK: 1, i: 0.65 },
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
  if (id === 13) { const n = f - STAMP13; if (n >= 0 && n < 5) k += 0.4 * Math.exp(-n / 1.4); } // round 8: on the stamp's contact
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
// round 7 (audit A6 P3 shot 9, matched in 7 / 8: the morning sky reads flat pale grey-blue ~#B8C4D8): AtmosEffect re-grades
// the sky by elevation onto this ramp (the PRE-grade colours: solved through the morning grade with scratch gradesim.py so
// they land on the audit's targets after it: horizon peach ~#F3C9A6 at 0 deg, ~#EEC4AC at 3, a lilac turn ~#C9C4D8 at 7,
// ~#9BB4DE at 12, deep morning blue ~#80A6DA from 18 deg up = the frame top in the morning MSs / wides)
const MORNING_SKY = { hex: ["#e2b59d", "#d7b1a4", "#b2b1cb", "#91a7d6", "#7f9fd9"], deg: [3, 7, 12, 18] as [number, number, number, number], k: 0.92 };
const MORNING_SKY_LIN = { c: MORNING_SKY.hex.map((h) => untone(h)), e: MORNING_SKY.deg.map((d) => THREE.MathUtils.degToRad(d)) as [number, number, number, number] };
/** the world's live sky stops (world.ts sky shader uniforms, set by world.update this frame) */
const skyStops = (world: World): { c: THREE.Color[]; e: [number, number, number, number] } | null => {
  const m = (world as unknown as { skyMat?: THREE.ShaderMaterial }).skyMat;
  if (!m) return null;
  const u = m.uniforms, e = u.e.value as THREE.Vector4;
  return { c: [0, 1, 2, 3, 4].map((i) => u["c" + i].value as THREE.Color), e: [e.x, e.y, e.z, e.w] };
};
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
  // round 7 (audit A6 P3 shot 6: the lower frame ends as a low-contrast pink-lavender haze): the warm haze 0.13 -> 0.07
  6: { shimmer: SHIM, haze: [0.07, 160, 520], hazeCol: [0.98, 0.62, 0.36] },
  // shot 10 (round 4, audit A3 P3): the horizon haze -15 % (dehaze on the 80-260 m band; the far mesas keep theirs)
  // round 6 (audit A5 WORLD-INT P2 shot 10: the cobalt sky and the land read as two pictures): sky saturation -8 %
  10: { shimmer: SHIM, dehaze: [0.15, 80, 260, 0.6], dehazeFar: [300, 480], skySat: 0.92 },
  // shots 7-9 (round 5, audit A4 P2 shot 8: "a bright haze band flattens the mesas"): the 100-450 m band dehazed (the far
  // horizon keeps some aerial haze) and the pale band right above the horizon deepened, the same on all three shots
  7: { skySat: 1.1, ...MORNING_AIR }, 8: { skySat: 1.1, ...MORNING_AIR }, 9: { skySat: 1.1, ...MORNING_AIR },
  // shot 11 (round 5, audit A4 P2: flat white chalk lines, no bloom): the chalk lines / white labels lifted to 1.35 so
  // the blueprint bloom (threshold 1.0) gives them the reference's glow
  11: { paper: 0.15, lineGlow: [1.4, 0.55, 0.42] },
  // shot 13 (round 8, audit A7 P3: "cut aerial haze on the far mesas by ~30 % so the purple / grey / rust bands show"): the
  // 80-400 m band dehazed (the horizon beyond ~650 m keeps its haze, so the backlit depth stays)
  13: { dehaze: [0.3, 80, 400, 0.9], dehazeFar: [650, 950] },
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
// round 8 (carry-over): the point itself now comes from WORLD-INT's exported sunsetPoint (no duplicated copy to drift)
let SUN13P: THREE.Vector3 | null = null;
const sun13Dir = (cam: THREE.PerspectiveCamera) => {
  if (!SUN13P) SUN13P = sunsetPoint(13);
  return SUN13P.clone().sub(cam.position).normalize();
};
/** round 8: the stamp's contact on the PICTURE clock (sets_ext STAMP_F: 2.5 video f before "per-"; the LEAD's kick fires
 *  there too): every impact effect of shot 13 starts on it (they used to start on the word, 2.5 video f late) */
const STAMP13 = PV(V(BEAT.permission) - 2.5), STAMP13V = V(STAMP13);
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
/** round 7: the LED roll of sets_ext.ts poseLed, ported verbatim (WORLD-EXT A5 moved it onto the VIDEO clock: an ease-out
 *  to target - 0.05 over ~25 video f, then one hundredth per video frame for the last 5, the true figure ON the beat's
 *  video frame), as the string the counter shows (the round-5 picture-clock copy had drifted off the real roll) */
// round 8 (carry-over): the string is WORLD-EXT's own exported ledShownAt (and its LED_LANDS: counter B lands half a frame
// before floor(BEAT.pct8)), so the pops / flickers can never drift off the drawn digits again
const LED_ROLL_V = 30;
const ledShown = (target: number, land: number, vf: number) => ledShownAt(target, land, 0, vf, 10).replace("%", "");
/** digit-change pop of one counter at video frame vf: a units change pops 1.0 then 0.45 the next frame, a tenths change
 *  0.7-0.85 (odd / even new digit), a hundredths change 0.45: the roll visibly TICKS as it slows into the beat; flick = 1
 *  on the frame of each of the last one-hundredth steps (7.88 -> 7.89 -> 7.90 -> 7.91; audit A6 ADD shot 10: "a one-frame
 *  dot-matrix flicker on each final digit step"), 0 on the landing frame itself (that one only pops) */
const ledPop = (target: number, land: number, vf: number): { pop: number; flick: number } => {
  const s0 = ledShown(target, land, vf), s1 = ledShown(target, land, vf - 1), s2 = ledShown(target, land, vf - 2);
  const T = target.toFixed(2), d0 = Math.round(Number(s0) * 100) - Math.round(Number(s1) * 100);
  const flick = s0 !== s1 && s0 !== T && d0 === 1 && Number(s0) >= target - 0.045 ? 1 : 0;
  if (s0 !== s1) return { pop: s0[0] !== s1[0] ? 1 : s0[2] !== s1[2] ? (Number(s0[2]) % 2 ? 0.85 : 0.7) : s0 === T ? 1 : 0.45, flick };
  if (s1 !== s2 && (s1[0] !== s2[0] || s1 === T)) return { pop: 0.45, flick: 0 };
  return { pop: 0, flick: 0 };
};
/** round 7: the strongest final-step flicker of either shot-10 counter at video frame vf */
const ledFlick = (vf: number) => Math.max(ledPop(1.67, LED_LANDS.A, vf).flick, ledPop(7.92, LED_LANDS.B, vf).flick);
/** fixed hash 0..1 (no Math.random: the lens-dust specks of shot 13) */
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fr1 = (x: number) => ((x % 1) + 1) % 1;
/** round 6 (audit A5 ADD shots 7 / 8): warm backlit dust motes in the low morning sun: n motes in a WORLD box (they
 *  parallax with the truck / push), drifting on a slow breeze on the VIDEO clock (idle life: the warp never freezes
 *  them), wrapped inside the box with an edge fade (no pops), brighter near the sun's side of the frame, twinkling as they
 *  turn; sized by distance and by this frame's lens blur (a defocused mote is a bigger, dimmer disc); never on anything
 *  nearer (per-pixel occlusion) and hidden behind posts / people (centre visibility) */
const motes = (out: LensSrc[], cam: THREE.PerspectiveCamera, vf: number, c: V3, h: V3, n: number, seed: number, k: number,
  sun: THREE.Vector3, lens: { focus: number; cInf: number }) => {
  const t = vf / FPS, sc = sunScreen(cam, sun), sl = Math.hypot(sc.uv[0] - 0.5, sc.uv[1] - 0.5) || 1;
  const sdx = (sc.uv[0] - 0.5) / sl, sdy = (sc.uv[1] - 0.5) / sl;
  for (let i = 0; i < n; i++) {
    const a = hsh(seed + i * 3.1), b = hsh(seed + i * 5.7 + 1.3), q = hsh(seed + i * 7.9 + 2.9), w = hsh(seed + i * 11.3 + 4.1);
    const ux = fr1(a + ((0.05 + 0.06 * w) * t) / (2 * h[0]) + 0.025 * Math.sin(0.6 * t + 6.3 * q));
    const uy = fr1(b + ((0.012 + 0.02 * q) * t) / (2 * h[1]) + 0.03 * Math.sin(0.4 * t + 6.3 * w));
    const P: V3 = [c[0] + h[0] * (2 * ux - 1), c[1] + h[1] * (2 * uy - 1), c[2] + h[2] * (2 * q - 1)];
    const edge = smooth(ux / 0.12) * smooth((1 - ux) / 0.12) * smooth(uy / 0.12) * smooth((1 - uy) / 0.12);
    const p = project(cam, P);
    if (!p.on || p.dist < 0.9 || p.dist > 9 || edge < 0.02) continue;
    const coc = lens.cInf * Math.abs(1 - lens.focus / p.dist), R = Math.min(16, Math.max(3.5, pxOf(cam, 0.012, p.dist), 0.75 * coc));
    // (first pass: a falloff by the distance to the sun's clamped screen point: the low sun sits ~5 frames off to the
    // right, so every mote came out at ~4 % and none showed) -> brightness by the SIDE of the frame the sun is on
    const side = ((p.uv[0] - 0.5) * sdx + (p.uv[1] - 0.5) * sdy) / 0.5, near = 0.45 + 0.55 * smooth((side + 0.6) / 1.6);
    const tw = 0.55 + 0.45 * Math.sin(2 * Math.PI * (0.25 + 0.35 * w) * t + 6.3 * a);
    const e = k * edge * near * tw * Math.min(1, 64 / (R * R));
    if (e > 0.008) out.push({ uv: p.uv, dist: p.dist, kind: 0, col: [1.0 * e, 0.7 * e, 0.38 * e], p: [R, R], occ: 0.15 });
  }
};
/** round 6 (audit A5 ADD shot 11): the travelling heads of the self-drawing chalk lines, read from WORLD-INT's own posed
 *  blueprint (the same pure state world.update just set: each floor line's progress uProg from its a..b frames and its
 *  polyline), so a head is exactly where the line ends this frame */
type BPLine = { a: number; b: number; pts: [number, number][]; L: number[]; stick: boolean };
const chalkHeads = (world: World | null, f: number): { p: THREE.Vector3; k: number; main: boolean }[] => {
  const I = world ? (world as unknown as { int?: { lines?: BPLine[]; bp?: THREE.Object3D } }).int : undefined;
  if (!I || !I.lines || !I.bp) return [];
  const out: { p: THREE.Vector3; k: number; main: boolean }[] = [];
  I.bp.updateWorldMatrix(true, false); // (static at the origin today; never trust a matrix from the previous render)
  for (const L of I.lines) {
    if (L.pts.length < 2 || L.b - L.a < 4) continue;
    const prog = Math.max(0, Math.min(1, (f - L.a) / (L.b - L.a)));
    if (prog <= 0 || prog >= 1) continue;
    const tot = L.L[L.L.length - 1], s = prog * tot;
    let i = 1; while (i < L.L.length - 1 && L.L[i] < s) i++;
    const u = (s - L.L[i - 1]) / Math.max(1e-6, L.L[i] - L.L[i - 1]), A = L.pts[i - 1], B = L.pts[i];
    const p = I.bp.localToWorld(new THREE.Vector3(A[0] + (B[0] - A[0]) * u, BP.base[1] + 0.012, A[1] + (B[1] - A[1]) * u));
    out.push({ p, k: smooth(prog / 0.06) * (1 - smooth((prog - 0.94) / 0.06)), main: L.stick });
  }
  return out.slice(0, 10);
};
const lensSources = (id: number, f: number, cam: THREE.PerspectiveCamera, fp: [number, number] = [f - 1, f - 2], vf = f,
  world: World | null = null, lens: { focus: number; cInf: number } = { focus: 5, cInf: 0 }): LensSrc[] => {
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
      out.push({ uv: [Math.max(1.02, sc.uv[0]), Math.min(0.85, Math.max(0.45, sc.uv[1]))], dist: 0, kind: 0, col: [0.1 * e, 0.054 * e, 0.02 * e], p: [480, 860], dark: 0.6 });
      out.push({ uv: [1.0, Math.min(0.85, Math.max(0.45, sc.uv[1]))], dist: 0, kind: 2, col: [0.035 * e, 0.019 * e, 0.007 * e], p: [380, 10] });
      // round 7 (audit A6 ADD shot 6: "a soft warm glow from the low sun on the frame's top edge as the light turns late"):
      // the late sun sits ~70 deg right of the view at the frame-top height (sunScreen uv ~(6.3, 1.0): the posts' rims and
      // the long shadows say screen RIGHT, so the glow blooms in the top-RIGHT corner, not the top-left), rising with the
      // relight over video ~810-870; kept off the darks (the shade stays deep: the P3 above) and off the board face side
      const kc = smooth((k - 0.15) / 0.7);
      if (kc > 0) out.push({ uv: [1.04, 0.95], dist: 0, kind: 0, col: [0.26 * kc, 0.14 * kc, 0.045 * kc], p: [430, 620], dark: 0.7 });
      // round 8 (USER direction: shot 6 is the MYSTERY beat, "a slow push, the light dropping a little"): slow warm dust motes
      // hang in the low late sun between the lens and the board as the question is asked (idle drift on the VIDEO clock,
      // brightest on the sun's side, never on a nearer card: per-pixel occlusion), so the held, dimmer frame still breathes
      if (k > 0.05) motes(out, cam, vf, [TH.board.cx + 0.2, 2.1, TH.woman[2] - 0.7], [2.0, 1.15, 1.1], 11, 31.7, 1.15 * smooth((k - 0.05) / 0.5), sunDirAt(6, f), lens);
    }
    // ... and a faint lens bloom on the two gooseneck lamp bulbs once they flick on (WORLD-INT LightFx.lampK, the same pure
    // state world.update just posed: 0 before picture 622, a 2 f flicker, then ramps to .62): a tight warm halo (never
    // over the raven: per-pixel occlusion + a radius kept inside the lamp's own glow sprite)
    const LF = world ? (world as unknown as { int?: { fx?: { lampK?: number; boardLamps?: { bulb: THREE.Vector3 }[] } } }).int?.fx : undefined;
    const lk2 = LF?.lampK ?? 0;
    if (LF && lk2 > 0.01) for (const B of LF.boardLamps ?? []) {
      const p = project(cam, B.bulb);
      if (!p.on) continue;
      const R = Math.min(26, Math.max(9, pxOf(cam, 0.07, p.dist))), e = lk2 / 0.62;
      out.push({ uv: p.uv, dist: p.dist, kind: 0, col: [0.34 * e, 0.2 * e, 0.07 * e], p: [R, R], occ: 0.12, minVis: 0.25 });
    }
  }
  if (id >= 7 && id <= 9) {
    // round 3 (audit A2 ADD, shots 7 / 9): golden morning sun-side warmth: a very wide, faint warm glow just outside the
    // frame edge on the sun's side (the low sun is camera-right, as the long violet shadows say), stronger when the
    // sun faces the lens; it wraps the sun-side rims, LED boxes and posts without ever blooming a face or a cloud
    // round 5 (audit A4 P2 shot 8: milky, low-chroma, L* sd ~17): this veil and the god rays below lifted the darks from
    // ~(27,8,30) to ~(73,31,36) in shot 8 (measured with post.lensfx off): 45 % of the strength, and it keeps 70 % off
    // the dark pixels (the long violet shadows and the ink stay deep, the lit floor keeps the warmth)
    const sd = sunDirAt(id, f), sc = sunScreen(cam, sd);
    const k = 0.45 * (0.35 + 0.65 * sc.facing);
    out.push({ uv: sc.uv, dist: 0, kind: 0, col: [0.075 * k, 0.045 * k, 0.017 * k], p: [620, 900], dark: 0.7 });
    // round 6 (audit A5 ADD shot 9, at 60 % in 7 / 8 so the three morning shots match): a faint warm dust-haze band along
    // the horizon (the far world only: near posts / people take 15 %), and the low sun's soft bloom where it sits, just off
    // the frame's sun-side edge above the horizon (the disc itself is off frame: the long violet shadows put it there)
    const hy = horizonY(cam), kb = id === 9 ? 1 : 0.6;
    if (hy > -0.05 && hy < 1.05) {
      out.push({ uv: [0.5, hy + 0.01], dist: 0, kind: 3, col: [0.05 * kb, 0.033 * kb, 0.017 * kb], p: [70, 0.15, 160] });
      const sx = Math.min(1.1, Math.max(-0.1, sc.uv[0])), kf = kb * (0.4 + 0.6 * sc.facing);
      out.push({ uv: [sx, hy + 0.03], dist: 0, kind: 0, col: [0.09 * kf, 0.052 * kf, 0.018 * kf], p: [380, 150], dark: 0.6 });
    }
    // round 6 (audit A5 ADD shots 7 / 8: "god-ray shafts through the post gaps / the rail posts behind the pair, 8-10 %"):
    // the far-mode god rays below only add a warm scatter here (the sun sits ~5 frames off to the right and the near sign
    // at the right edge blocks every march), so the visible shafts are soft warm beams from the sun's side of the frame
    // (anamorphic streak kind), drawn only on what lies BEYOND the action (per-pixel occlusion: the pair, the professor
    // and the near ground stay clean; the log, the posts, the far floor and the air take the light), swaying a hair with the dust on the video clock
    if ((id === 7 && f < BEAT.testedIt - 3) || (id === 8 && f < BEAT.trails - 12)) {
      const fade = id === 7 ? 1 - smooth((f - (BEAT.testedIt - 12)) / 8) : 1 - smooth((f - (BEAT.trails - 20)) / 7);
      const su: [number, number] = [Math.min(1.12, Math.max(-0.12, sc.uv[0])), Math.min(1.1, Math.max(0.55, sc.uv[1]))];
      const base = Math.atan2((0.45 - su[1]) * 1920, (0.4 - su[0]) * 1080), kk = fade * (0.35 + 0.65 * smooth((sc.facing - 0.05) / 0.3));
      const D = id === 7 ? 7.5 : 5.6;
      // (first pass: a fan of 4 beams at 6.5 m, 26-74 px: the low sun is ~5 frames off to the right, so its shafts run
      // nearly level, ~20 deg down-left, right through the floor band behind the pair, where 6.5 m hid most of them; a
      // lensfx-off diff showed no beam at all) -> ONE soft main shaft (70 px half width) past the pair's waist through the
      // log, the rail posts and the far floor, with two thin companions; occluded nearer than ~5.1 m (the pair stays clean)
      // (measured vs a lensfx-off render at video 1025: +15-26 % in the band behind the pair at 0.13 -> 0.095: ~+10-18 %)
      for (const [da, w, s] of [[-0.05, 70, 1], [0.035, 22, 0.55], [-0.13, 26, 0.45]] as const) {
        const e = kk * s * (0.85 + 0.15 * Math.sin(0.5 * (vf / FPS) + 9 * da));
        out.push({ uv: su, dist: D, kind: 2, col: [0.095 * e, 0.057 * e, 0.022 * e], rot: base + da + 0.008 * Math.sin(0.3 * (vf / FPS) + 4 * da), p: [1600, w], occ: 0.25, minVis: 1, dark: 0.45 });
      }
    }
    // round 7 (audit A6 ADD shot 7: "a low sun glow and soft god-ray quads (10-15 %, warm #FCD5A0) behind his right shoulder
    // at the az-216 end of the orbit, so the golden rim has a visible source"): as the orbit lands (from ~24 picture f
    // before its end, "Cialdini" - 19) the low sun's glow blooms just off the top-right edge (its true screen point is
    // uv ~(1.1-1.7, 0.9-1.05) there) and three broad soft beams fan from it past his right shoulder; the beams are painted
    // only BEYOND him (per-pixel occlusion at his distance + 0.6 m), so his card stays clean and the light reads as behind
    // him; out with the dive into the clipboard
    if (id === 7) {
      const k7 = smooth((f - (BEAT.cialdini - 43)) / 14) * (1 - smooth((f - (BEAT.testedIt + 2)) / 8));
      if (k7 > 0) {
        const su: [number, number] = [Math.min(1.08, Math.max(0.7, sc.uv[0])), Math.min(1.03, Math.max(0.7, sc.uv[1]))];
        const PR: V3 = [TT.base[0] + 1.8, 1.35, TT.base[2] + 2.4], pp = project(cam, PR);
        // (first pass 0.17 / beams 0.125 x 48-96 px: invisible over the bright morning sky at phone size) -> x1.6 / x1.8
        // round 8 (audit A7 P2 shot 7: the MCU's top ~30 % is pale mauve glare plus this additive light): glow and beams -40 %
        const k7g = 0.6 * k7;
        out.push({ uv: su, dist: 0, kind: 0, col: [0.28 * k7g, 0.18 * k7g, 0.08 * k7g], p: [300, 360], dark: 0.65 });
        if (pp.on) {
          const tx = pp.uv[0] + 0.12, ty = pp.uv[1] + 0.06, base = Math.atan2((ty - su[1]) * 1920, (tx - su[0]) * 1080);
          for (const [da, w, sk] of [[-0.16, 50, 0.8], [0, 72, 1], [0.13, 40, 0.7]] as const) {
            const e = k7g * sk * (0.9 + 0.1 * Math.sin(0.4 * (vf / FPS) + 7 * da));
            // (occlusion window = [dist - 2 occ, dist - occ] = his distance + 0.3 .. + 0.65 m: his card gets none of it)
            out.push({ uv: su, dist: pp.dist + 1.0, kind: 2, col: [0.3 * e, 0.2 * e, 0.105 * e], rot: base + da, p: [1150, w], occ: 0.35, minVis: 1, dark: 0.4 });
          }
        }
      }
    }
    // round 7 (audit A6 ADD shot 8: "a warm low-sun bloom behind Sign B and the far mesas in the wide (backlight source) with
    // a faint lens streak, so the long violet shadows toward the lens have a visible cause"): from the crane-swing landing on
    // "the trails" the backlighting sun sits just past the top-right corner (uv ~(1.04, 0.95), facing .84-.89): a wide warm
    // bloom there that lands only on the far world and the sky (per-pixel occlusion: the signs, posts and people stay
    // clean), plus a faint horizontal lens streak across the frame (a glass artefact: over everything); both follow the
    // sun's facing, so they fade as the camera turns onto Sign A
    if (id === 8) {
      const kw = smooth((f - (BEAT.trails - 8)) / 10) * smooth((sc.facing - 0.6) / 0.22);
      if (kw > 0) {
        const r8 = sunRaw(cam, sd), su: [number, number] = r8 ? [Math.min(1.12, Math.max(-0.12, r8[0])), Math.min(1.1, Math.max(0.5, r8[1]))] : sc.uv;
        // (occlusion window [16, 28] m: the signs / posts / people at 4-12 m take none, the mesas and the sky all of it)
        // (first pass 460 x 560 px: a warm veil over the whole upper frame that greyed the new morning blue) -> 330 x 400
        out.push({ uv: su, dist: 40, kind: 0, col: [0.24 * kw, 0.14 * kw, 0.055 * kw], p: [330, 400], occ: 12, minVis: 1, dark: 0.5 });
        out.push({ uv: [su[0], Math.min(0.97, su[1])], dist: 0, kind: 2, col: [0.05 * kw, 0.03 * kw, 0.012 * kw], rot: 0.02, p: [700, 4] });
      }
    }
    // round 7 (audit A6 ADD shot 9: "a soft warm low-sun flare from the right edge in the morning MSs, very low strength"):
    // the sun is ~3-6 frames off to the right at the frame-top height: a tall soft warm flare hugging the right edge and a
    // faint level streak at the sun's height (dark-protected: the violet shade stays)
    if (id === 9) {
      const y9 = Math.min(0.9, Math.max(0.62, sc.uv[1] - 0.12)), k9 = 0.6 + 0.4 * smooth((sc.facing - 0.25) / 0.3);
      out.push({ uv: [1.06, y9], dist: 0, kind: 0, col: [0.075 * k9, 0.042 * k9, 0.015 * k9], p: [240, 640], dark: 0.65 });
      out.push({ uv: [1.0, y9 + 0.04], dist: 0, kind: 2, col: [0.022 * k9, 0.013 * k9, 0.005 * k9], rot: 0.015, p: [520, 5] });
    }
    // round 6 (audit A5 ADD shots 7 / 8): warm dust motes drifting in the low sun: shot 7 round the professor's yard, the
    // camera-right (sun) side brightest; shot 8 round the kneeling pair, past the brown bucket hat (asst1 at TEAM1)
    if (id === 7 && f < BEAT.testedIt - 3) motes(out, cam, vf, [TT.base[0] + 1.4, 1.35, TT.base[2] + 2.8], [3.0, 1.0, 2.6], 13, 7.7, 1.2 * (1 - smooth((f - (BEAT.testedIt - 12)) / 8)), sd, lens); // out before the dive
    // (shot 8: out before the whip off the MS, which starts ~13 picture f before "trails": glows never take motion blur)
    if (id === 8 && f < BEAT.trails - 12) motes(out, cam, vf, [TT.base[0] + 0.6, 1.1, TT.base[2] - 2.3], [1.7, 0.75, 1.7], 12, 19.3, 1.5 * (1 - smooth((f - (BEAT.trails - 20)) / 7)), sd, lens);
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
    for (const [s, F, LND, hot] of [[TT.signA, BEAT.pct2, LED_LANDS.A, false], [TT.signB, BEAT.pct8, LED_LANDS.B, true]] as const) {
      const n = f - F, cmp = smooth((f - (BEAT.pct8 + 6)) / 8);
      // round 8 (audit A7 ADD shot 10: "on the bell the 7.92 % digits double-flash brighter", a cash-register gag): counter B's
      // digits flash TWICE on the video clock from its landing: 2 f bright, 2 f back, 2 f bright again, then the decay
      const nv = vf - toNew(LND), dbl = hot && nv >= 0 && nv < 7 ? (nv < 2 ? 1 : nv >= 4 && nv < 6 ? 0.85 : 0) : 0;
      const lock = n >= -1 && n < 12 ? (n < 0 ? 0.35 : Math.exp(-n / 2.6)) * (hot && n >= 0 && n < 2 ? 1.5 : 1) : 0;
      const temp = (hot ? 0.75 : -0.55) * smooth((n + 2) / 8);
      const b = (f >= F - 30 ? 0.04 + 0.025 * cmp : 0.022) * (1 + 2.2 * lock);
      const col: [number, number, number] = hot ? [b, b * (0.22 + 0.2 * smooth((n + 2) / 8)), b * 0.05] : [b, b * 0.16, b * (0.07 + 0.25 * smooth((n + 2) / 8))];
      // round 5 (audit A4 ADD): the digits flicker brighter for 1-2 f on each change during both rolls, and a soft red
      // bloom sits on the digit row (the face otherwise clears the bloom the digits spread over it)
      const lp = ledPop(hot ? 7.92 : 1.67, LND, vf), pop = lp.pop, lit = vf >= toNew(LND) - LED_ROLL_V - 1 ? 1 : 0.45;
      // (round 7: on a final-step flicker frame the digits dip to x.72 under the strong dot-matrix scan set in Inner)
      // (the double flash lives in the DIGITS and the digit-row bloom, not the outside halo: an orange box was audit A3's P2)
      const L = ledFace(cam, s, col, 0.55 + 0.35 * lock, [0.85, temp, (1 + 0.3 * lock) * (1 + 0.45 * pop) * (1 + 0.6 * dbl) * (lp.flick ? 0.72 : 1)]);
      if (L) {
        out.push(L);
        const c = ledCentre(s), dg = project(cam, [c[0], c[1] - 0.15 * TT.led.h, c[2] + 0.01]);
        // round 6 (audit A5 ADD: "in the 7.92 % insert a subtle LED bloom"): the glow grows with the face's size on screen
        const big = smooth((L.p[0] - 130) / 170);
        const e = lit * (1 + 1.6 * pop + 1.4 * lock + 1.3 * dbl) * (hot ? 1 : 0.85) * (1 + 0.7 * big);
        if (dg.on) out.push({ uv: dg.uv, dist: dg.dist, kind: 0, col: [0.05 * e, hot ? 0.009 * e : 0.004 * e, 0.003 * e], p: [0.95 * L.p[0], (0.62 + 0.2 * big) * L.p[1]], occ: 0.3, minVis: 0.5 });
        // round 7 (audit A6 ADD shot 10: "a faint red LED glow spilling onto the sign panel top"): a flat red wash along the
        // cream panel's top edge under the box (0.19 m below it), brighter on the pops; never on a head in front (occlusion)
        const tp = project(cam, [TT.base[0] + s.dx, s.cy + TT.signB.h / 2 - 0.04, TT.base[2] + s.z + 0.075]);
        if (tp.on) {
          const es = lit * (0.75 + 0.6 * pop + 0.5 * lock) * (hot ? 1 : 0.8) * (lp.flick ? 0.75 : 1);
          // (first pass 0.055 x 0.075 m: lost on the cream face) -> 0.09, 0.1 m tall
          out.push({ uv: tp.uv, dist: tp.dist, kind: 0, col: [0.09 * es, hot ? 0.014 * es : 0.009 * es, 0.008 * es], p: [pxOf(cam, 0.4, tp.dist), pxOf(cam, 0.1, tp.dist)], occ: 0.25, minVis: 0.4 });
        }
      }
    }
  }
  if (id === 11) {
    // round 6 (audit A5 ADD): a bright travelling head on every self-drawing chalk line: a small cyan bloom with a white
    // core, riding the line's growing end (it fades in over the first 6 % of the line and out over the last 6 %), so the
    // drawing reads at a glance; the main lines (the ones a chalk stick leads) glow a little bigger
    for (const H of chalkHeads(world, f)) {
      const p = project(cam, H.p);
      if (!p.on || H.k <= 0.01) continue;
      // (first pass 11-30 px at ~0.7: a faint dot nobody would see at phone size) -> 16-40 px, brighter, plus a small
      // cool 4-point twinkle on the main lines
      const R = Math.min(40, Math.max(16, pxOf(cam, H.main ? 0.16 : 0.12, p.dist))), e = H.k * (H.main ? 1 : 0.75);
      out.push({ uv: p.uv, dist: p.dist, kind: 0, col: [0.3 * e, 0.75 * e, 1.25 * e], p: [R, R], occ: 0.25 });
      out.push({ uv: p.uv, dist: p.dist, kind: 0, col: [0.9 * e, 1.1 * e, 1.25 * e], p: [0.32 * R, 0.32 * R], occ: 0.25 });
      if (H.main) out.push({ uv: p.uv, dist: p.dist, kind: 1, col: [0.55 * e, 0.85 * e, 1.15 * e], rot: 0.3 + 0.002 * vf, p: [0.7 * R, 2.4, 1.3], occ: 0.25 });
    }
  }
  if (id === 12) {
    // classroom: a soft warm bloom on the four bright window panes (south wall, behind the student in the close-up);
    // half of it survives when a head covers a pane centre (minVis), so the glow never pops
    for (const x of [-3.35, -1.85, -0.35, 1.15]) {
      const p = project(cam, [CL.base[0] + x, CL.base[1] + 1.65, CL.base[2] + CL.room.d / 2 - 0.02]);
      if (p.on) glow(p, 0.55 * pxOf(cam, 1.5, p.dist), 0.55 * pxOf(cam, 1.5, p.dist), [0.075, 0.066, 0.05], true, 0.5);
    }
    // round 7 (audit A6 ADD shot 12: "chalk dust from the board picks up a faint bloom where the window light hits it"): the
    // chalk dust WORLD-INT drifts at the writing tip (Interiors.chalkDust, 22 points) and the specks that puff off each
    // finished letter (letterPuffs sprites), read from the posed world: every other dust point and every live puff gets a
    // tiny warm-white glint that twinkles on the video clock (window-lit dust), never over a nearer head (occlusion)
    const I = world ? (world as unknown as { int?: { chalkDust?: { pts: THREE.Points }; letterPuffs?: THREE.Sprite[] } }).int : undefined;
    const cd = I?.chalkDust?.pts, cdo = cd ? ((cd.material as THREE.PointsMaterial).opacity ?? 0) : 0;
    let nG = 0;
    if (cd && cd.visible !== false && cdo > 0.02) {
      cd.updateWorldMatrix(true, false);
      const a = cd.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < a.count && nG < 7; i += 3) {
        const P = new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix4(cd.matrixWorld), q = project(cam, P);
        if (!q.on) continue;
        const tw = 0.55 + 0.45 * Math.sin(0.7 * vf + 2.3 * i), e = cdo * tw, R = Math.min(12, Math.max(4, pxOf(cam, 0.03, q.dist)));
        out.push({ uv: q.uv, dist: q.dist, kind: 0, col: [0.16 * e, 0.145 * e, 0.11 * e], p: [R, R], occ: 0.2 }); nG++;
      }
    }
    for (const sp of I?.letterPuffs ?? []) {
      if (nG >= 12) break;
      const op = (sp.material as THREE.SpriteMaterial).opacity;
      if (!sp.visible || op < 0.05) continue;
      sp.updateWorldMatrix(true, false);
      const q = project(cam, new THREE.Vector3().setFromMatrixPosition(sp.matrixWorld));
      if (!q.on) continue;
      const R = Math.min(14, Math.max(5, pxOf(cam, 0.035, q.dist)));
      out.push({ uv: q.uv, dist: q.dist, kind: 0, col: [0.2 * op, 0.18 * op, 0.13 * op], p: [R, R], occ: 0.2 }); nG++;
    }
  }
  if (id === 13) {
    // the stamp impact: a short warm flare streak + soft flash
    // round 8: every impact effect starts on the stamp's CONTACT (STAMP13, 2.5 video f before "per-", where the LEAD's
    // kick and WORLD-EXT's stamp land) and runs on the VIDEO clock (the picture runs at ~0.5x here: the 8 f ring took 16
    // video f, a slow-motion slam); n = video frames since the contact
    const n = vf - STAMP13V;
    const c: V3 = [TT.base[0] + TT.signB.dx, TT.signB.cy, TT.base[2] + TT.signB.z + 0.06];
    if (n >= 0 && n < 7) {
      const e = Math.exp(-n / 1.8), p = project(cam, c);
      if (p.on) { out.push({ uv: p.uv, dist: 0, kind: 2, col: [0.5 * e, 0.3 * e, 0.15 * e], p: [210, 6] }); glow(p, 150, 120, [0.13 * e, 0.075 * e, 0.035 * e], false); }
    }
    // round 6 (audit A5 P3: "the climax hit has no impact FX"; bible 8: impact ring 6-10 f + dust puffs): a white cartoon
    // IMPACT BURST round the stamp block (sets_ext poseStamp: 0.86 x 0.48 m sole at Sign B cy - 0.13, turned -0.14 rad):
    // an elliptical ring that springs out from the block edge 1.0 -> 1.7 x and thins 10 -> 3 px, plus 14 tapered radial
    // streaks that fly outward, 8 picture f from the contact frame; the faces in front keep clean (per-pixel occlusion)
    if (n >= 0 && n < 9) {
      const u = n / 9, e = (1 - u) ** 1.25, bc: V3 = [TT.base[0] + TT.signB.dx, TT.signB.cy - 0.13, TT.base[2] + TT.signB.z + 0.04];
      const p = project(cam, bc);
      if (p.on) {
        const px = (q: Proj) => [q.uv[0] * 1080, q.uv[1] * 1920], o = px(p), rz = -0.14;
        const ex = px(project(cam, [bc[0] + 0.43 * Math.cos(rz), bc[1] + 0.43 * Math.sin(rz), bc[2]]));
        const ey = px(project(cam, [bc[0] - 0.24 * Math.sin(rz), bc[1] + 0.24 * Math.cos(rz), bc[2]]));
        const hw = Math.hypot(ex[0] - o[0], ex[1] - o[1]), hh = Math.hypot(ey[0] - o[0], ey[1] - o[1]);
        const s = 1.0 + 0.7 * (1 - (1 - u) ** 3), th = 10 - 7 * u;
        out.push({ uv: p.uv, dist: p.dist, kind: 7, col: [1.6 * e, 1.5 * e, 1.36 * e], rot: Math.atan2(ex[1] - o[1], ex[0] - o[0]),
          p: [1.18 * hw * s, 1.45 * hh * s, th], burst: [14, 1.06 + 0.25 * u, 1.42 + 0.55 * u], occ: 0.12, minVis: 1 }); // (occ .45 let it cross the two tourists: they stand only ~0.5 m in front of the panel) // (the stamp's own knob covers the centre: no centre test)
      }
    }
    // round 7 (audit A6 ADD shot 13: "a +8 luma warm bloom pulse for 3 f on the impact frame"): a near-flat warm wash over
    // the whole frame for 3 picture f from the contact (1, .6, .3), on top of the bloom pulse
    if (n >= 0 && n < 3) {
      const e = [1, 0.6, 0.3][Math.floor(n)], p = project(cam, c);
      out.push({ uv: p.on ? p.uv : [0.5, 0.55], dist: 0, kind: 0, col: [0.034 * e, 0.023 * e, 0.012 * e], p: [1500, 2300] });
    }
    // round 8 (audit A7 ADD shot 13: "a 2-3 f bloom flash off the LED glass on the slam frame"): the jolt flashes the
    // counter's glass: a warm-white glow over Sign B's LED box + a short level glint streak across its glass for 3 video f
    // (1, .65, .3), never over a head in front (per-pixel occlusion)
    if (n >= 0 && n < 3) {
      const e = [1, 0.65, 0.3][Math.floor(n)], lc = ledCentre(TT.signB), lp = project(cam, [lc[0], lc[1], lc[2] + 0.02]);
      if (lp.on) {
        const R = pxOf(cam, TT.led.w * 0.5, lp.dist);
        out.push({ uv: lp.uv, dist: lp.dist, kind: 0, col: [0.5 * e, 0.36 * e, 0.24 * e], p: [0.85 * R, 0.5 * R], occ: 0.3, minVis: 0.5 });
        out.push({ uv: [lp.uv[0] - 0.12 * R / 1080, lp.uv[1] + 0.25 * pxOf(cam, TT.led.h * 0.5, lp.dist) / 1920], dist: lp.dist, kind: 2, col: [0.7 * e, 0.55 * e, 0.4 * e], rot: 0.04, p: [0.9 * R, 2.2], occ: 0.3 });
      }
    }
    // ... and two beige dust puffs kick off the gravel at Sign B's post bases (backlit: warm and pale), one small one
    // beside each, boiling as they grow and fade over 11 f
    if (n >= 0 && n < 11) {
      const u = n / 11, x0 = TT.base[0] + TT.signB.dx, z0 = TT.base[2] + TT.signB.z + 0.14;
      for (const [sx, o, big, sd] of [[-1, -0.1, 1, 3.1], [1, 0.1, 1, 5.7], [-1, 0.2, 0.55, 8.3], [1, -0.22, 0.55, 2.2]] as const) {
        const P: V3 = [x0 + sx * 0.38 + sx * 0.25 * u * big + o * 0.5, 0.1 + 0.2 * u * big, z0 + (big < 1 ? 0.12 : 0)];
        const q = project(cam, P);
        if (!q.on) continue;
        const R = pxOf(cam, (0.14 + 0.34 * (1 - (1 - u) ** 2)) * big, q.dist), op = 0.78 * (1 - u) ** 1.3 * (big < 1 ? 0.8 : 1);
        out.push({ uv: q.uv, dist: q.dist, kind: 8, col: [0.78, 0.55, 0.36], p: [R, 0.8 * R, Math.max(6, 0.28 * R)], puff: [op, sd + 1.3 * u], occ: 0.35 });
      }
    }
    // round 3 (audit A2 ADD): the low sun gets a SOFT warm anamorphic streak (~10 %, 7 px thick: never a scanline); a
    // third of it leaks round the sign when the disc hides behind it (minVis). No extra glow: sets_int.ts draws the halo.
    const sd13 = sun13Dir(cam), sc = sunScreen(cam, sd13), sp = project(cam, cam.position.clone().addScaledVector(sd13, 900));
    if (sp.on) out.push({ uv: sp.uv, dist: 899, kind: 2, col: [0.15, 0.085, 0.035], p: [320, 7], minVis: 0.35 });
    else if (sc.facing > 0.3) out.push({ uv: sc.uv, dist: 0, kind: 0, col: [0.07, 0.04, 0.016], p: [520, 620] });
    // round 5 (audit A4 ADD): faint warm lens-dust specks in the backlight: 10 soft discs on the GLASS (a ring round the disc,
    // a slow drift up and out), lit by the sun's nearness on screen (e-fold 560 px); never on anything nearer than ~6 m
    // (the faces, the sign: per-pixel occlusion), so they live on the sky and the far land round the sun disc
    // (round 6: the drift is idle life, so it runs on the VIDEO clock: the warp's slow passages no longer freeze it)
    const dv = smooth((sc.facing - 0.55) / 0.3), su = sp.on ? sp.uv : sc.uv, t13 = vf - toNew(SHOTS[12].a);
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
    // round 8 (audit A7 ADD shot 13: "a soft sun flare (2-3 ghost discs along the sun-centre axis) that slides during the
    // 'gave' push"): three soft round warm discs on the sun -> centre axis (a lens flare chain), rising with the push on
    // "gave" (from 18 video f before it) and held through the payoff; they slide as the push moves the disc on screen,
    // live only while the sun is visible (dist 899 = sky-depth test round the sun) and stay faint over the faces (dark /
    // occlusion: the glass flare is painted over everything, so it is kept small and low)
    if (sp.on) {
      const kg = smooth((vf - (V(BEAT.gave) - 18)) / 16), du = sp.uv[0] - 0.5, dvv = sp.uv[1] - 0.5;
      if (kg > 0) for (const [t, R, c] of [[0.42, 34, [0.07, 0.045, 0.022]], [-0.25, 22, [0.06, 0.04, 0.03]], [-1.05, 54, [0.045, 0.03, 0.026]]] as [number, number, [number, number, number]][]) {
        const g: [number, number] = [0.5 + du * t, 0.5 + dvv * t];
        if (g[0] < -0.05 || g[0] > 1.05 || g[1] < -0.05 || g[1] > 1.05) continue;
        // (kind 6 with a very soft edge = a round ghost whose visibility is probed at the SUN's uv, so it dies with the sun)
        out.push({ uv: g, dist: 899, kind: 6, col: [c[0] * kg, c[1] * kg, c[2] * kg], rot: 0, p: [R, 0.7 * R, 0.25], minVis: 0.3, probe: sp.uv });
      }
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
      const tag = tagAt(f, cam, vf);
      if (tag) {
        const p = project(cam, tag.p), e = n < 0 ? 0.25 : Math.sin((Math.PI * (n + 1)) / 7);
        const R = pxOf(cam, tag.w, p.dist);
        // (first pass 0.11 peak at 0.75 R: invisible on the cream card) -> a tighter, brighter swell + a twinkle on the "2"
        const r = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), two: V3 = [tag.p[0] + r.x * 0.36 * tag.w, tag.p[1] + 0.02, tag.p[2] + r.z * 0.36 * tag.w];
        if (p.on) { glow(p, 0.62 * R, 0.42 * R, [0.22 * e, 0.16 * e, 0.085 * e], false); glow(project(cam, two), 0.22 * R, 0.22 * R, [0.2 * e, 0.12 * e, 0.07 * e], false); if (n >= 0 && n < 5) star(two, e, 1.0, 0.2); }
        // round 8 (audit A7 ADD shot 15: "a 2-3 f soft warm bloom on the tag's '2' card under the star glint, so the reveal
        // pops in the violet frame"): 3 VIDEO frames from the flip (1, .7, .4): a warm bloom round the red '2' card
        const nv = vf - toNew(BEAT.twice);
        if (p.on && nv >= 0 && nv < 3) { const b = [1, 0.7, 0.4][Math.floor(nv)]; glow(project(cam, two), 0.42 * R, 0.42 * R, [0.42 * b, 0.25 * b, 0.12 * b], false); }
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
const tagAt = (f: number, cam: THREE.PerspectiveCamera, vf = f): { p: V3; w: number } | null => {
  const L = lightAt(15, f), right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const sun = L.key ? new THREE.Vector3(...L.key).normalize() : sunDirAt(15, f);
  const st = stage(15, f, { pos: cam.position, right, sun }, L, vf); // round 6: the video clock too (cast.ts VF stays this frame's)
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
  // round 6 (audit A5 ADD shots 7 / 8: carry the morning shafts into the shot-7 wide and the shot-8 MS behind the pair,
  // 8-10 %): there the sun sits far off the right edge (facing .3-.45), which the old gate (.25 -> .55) kept near zero;
  // shots 7 and 8 open the gate from facing .05 (full by .3), shot 9 keeps its own
  if (id >= 7 && id <= 9) {
    const sd = sunDirAt(id, f), sc = sunScreen(cam, sd), g0 = id === 9 ? 0.25 : 0.05;
    // (first pass at the old strength: the scatter was ~+3 levels) -> x1.45 in shots 7 / 8 (the dark protection keeps the
    // long violet shadows deep; the visible shafts are lensSources' beam fan)
    return far(sd, (id === 9 ? 0.55 : 0.8) * smooth((sc.facing - g0) / (id === 9 ? 0.3 : 0.25)), [0.1, 0.06, 0.023], 0.05, 14, 0.75);
  }
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
    // round 6 (audit A5 P2: a milky lavender veil; WORLD-INT raises its own in-world moonbeam this round): -25 %, bluer
    return { uv: moon.uv, col: [0.022, 0.034, 0.068], fall: 520, len: 0.9, mode: "far", th: -(wall.dist + 0.4), skyW: 1 };
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
  // round 7 (audit A6 shot 8: "the crane swing is still smeared on 'the trails,' (1096) and settles about 6 f late, after
  // 20 f of heavy motion blur"): the cap eases 48 -> 12 px over the swing's deceleration (from 14 picture f before
  // "trails" to 3 before it) and 12 -> 6 on the landing, so the payoff wide is already crisp when the caption lands
  if (id === 8) { const n = f - BEAT.trails; if (n > -16 && n < 14) { const c = n < -3 ? 48 - 36 * smooth((n + 14) / 11) : 12 - 6 * smooth((n + 3) / 5); return [c, Math.min(c, 0.7 * c + 2)]; } }
  if (id === 12) { const a = BEAT.cheated - 4; if (f >= a - 1 && f < a + 60) return [27, f >= BEAT.hears - 1.5 ? 6 : 27]; }
  if (id === 13) { const n = f - STAMP13; if (n >= -1.5 && n < 0.5) return [16, 16]; if (n >= 0.5 && n < 12) return [0, 0]; } // round 8: on the stamp's contact
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
  // round 8 (audit A7 P3 shot 16: the 9 f dusk -> noon loop dissolve double-exposes his orange shirt over her teal dress, a
  // muddy olive): the dusk layer eases 45 % of the way toward the noon grade over the 6 video f before the 15 -> 16 dissolve
  // and its first half, so the two pictures meet closer in colour (the glow dissolve GLOW_DIS[16] lifts the midpoint)
  const x16 = id === 15 ? XFV.find((x) => x.id === 16) : undefined;
  const kq = x16 ? 0.45 * smooth((vf - (x16.lo - 6)) / ((x16.lo + x16.hi) / 2 - (x16.lo - 6))) : 0;
  if (kq > 0.001) gradeFor(fx.grade, m.b, "noon", kq, id, f); else gradeFor(fx.grade, m.a, m.b, m.k, id, f);
  // round 7 (audit A6 P3 shot 13 2186-2216: "in the final framing the top ~22 % is a flat peach glare with nothing in it"):
  // display-space god rays from the sunset disc (grade.ts gradeRay: the lens pass's HDR glows died in the tone curve's
  // shoulder over the glare), 12-15 % at the root, rising as the camera settles on the payoff framing and kept to the cut
  if (id === 13) {
    const sd13 = sun13Dir(cam), sc13 = sunScreen(cam, sd13), sp13 = project(cam, cam.position.clone().addScaledVector(sd13, 900));
    const ro: [number, number] = sp13.on ? sp13.uv : sc13.uv;
    const kr = smooth((sc13.facing - 0.55) / 0.25) * (0.4 + 0.6 * smooth((f - (BEAT.permission - 14)) / 10));
    fx.grade.rays(ro[1] > 0.25 && ro[1] < 1.0 ? ro : null, 0.15 * kr, 0.42, 0.35 * (vf / FPS));
  } else fx.grade.rays(null);
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
  const ss = id >= 7 && id <= 9 && m.a === "morning" ? skyStops(world) : null;
  fx.atmos.set({ dehaze: sp.dehaze, dehazeFar: sp.dehazeFar, haze, hazeCol: sp.hazeCol, skySat: sp.skySat, paper: sp.paper, lineGlow: sp.lineGlow,
    skyDeep: sp.skyDeep, skyHorizon: hor, skyGrad: ss ? { k: MORNING_SKY.k, src: ss, dst: MORNING_SKY_LIN } : undefined,
    // round 6: the heat-haze drift is idle motion: it runs on the VIDEO clock (the warp no longer slows it to 0.42x)
    shimmer: sp.shimmer && shimK > 0.001 ? { ...sp.shimmer, amp: sp.shimmer.amp * shimK, horizon: hor, t: vf / FPS } : undefined },
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
    // round 8 (audit A7 P3 shot 9: the A -> B truck smeared the followed raven into a dark streak for ~38 f): half the
    // shutter on shot 9 (its only fast move is that truck), so the raven's wing shapes stay readable
    if (id === 9) fx.mblur.shutter *= 0.5;
    const amt = rate / (2 * step); // sampled step -> one video frame (signed: the kernel is centred, a backward step is fine)
    const ms = maxShift(cam, next, Math.min(focus, 60));
    // round 6 (audit A5 P2 shot 12: "below 3 %W/f turn the blur fully off so the settle frames are clean"): the fastest
    // probe's image speed per VIDEO frame (pan, truck, tilt, push and zoom alike) gates the blur: none below 2.2 %W/f,
    // full from 3.4 %W/f (a smooth ramp, so a decelerating whip never pops from blurred to sharp)
    const spd = (ms * 2 * Math.abs(amt) * 100) / 1080, gate = smooth((spd - 2.2) / 1.2);
    const shift = ms * 2 * fx.mblur.shutter * Math.abs(amt) * gate; // blur length (px @1080) of the fastest probe
    const [cap, capCard] = mbCaps(id, f);
    fx.mblur.caps(cap, capCard, on.ink ? fx.ink.worldDepth ?? null : null);
    const vp = new THREE.Matrix4().multiplyMatrices(next.projectionMatrix, next.matrixWorldInverse);
    fx.mblur.set(shift > fx.mblur.knee + 0.5 && cap > 0.5 ? amt * gate : 0, cam.matrixWorld, vp, proj);
  }
  // ---- lens glows ----
  const srcs = on.lensfx ? lensSources(id, f, cam, fp, vf, world, { focus, cInf: on.lens ? d.cInf : 0 }) : [];
  fx.lensfx.set(srcs, on.lensfx && on.rays ? godRays(id, f, cam) : null);
  // round 6 (audit A5 ADD shot 10: "a subtle LED bloom and scanline shimmer in the 7.92 % insert"): dot-matrix scanlines
  // on the LED faces (period = 1/10 of the face's half height, so the lines scale with the face) and a slow bright band
  // rolling down them, on the VIDEO clock; they fade in with the face's size on screen (the insert), never on the wides
  let big = 0, hh = 0;
  for (const s of srcs) if (s.kind === 5 && s.p[0] > big) { big = s.p[0]; hh = s.p[1]; }
  const sk = id >= 9 && id <= 13 ? smooth((big - 130) / 170) : 0;
  // (first pass 0.16 / hh/14 / band 0.14: lost in the dot matrix at phone size) -> coarser lines and a brighter band
  // round 7 (audit A6 ADD shot 10): a one-frame dot-matrix flicker on each final digit step: the scan jumps to .55 (and
  // a half-period phase skip) on that frame, the digits dip (lensSources), then back
  const flk = id === 10 ? ledFlick(vf) : 0;
  fx.lensfx.scan(Math.max(0.2 * sk, 0.55 * flk), Math.max(3, hh / 10), vf * 0.9 + Math.PI * flk, Math.max(0.25 * sk, 0.4 * flk));
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
// round 7 (audit A6 P3 FILM 1605-1609: the 10 -> 11 pivot dissolve on "You see," ran only 5 video f, the one dissolve
// under the 7-9 f spec; story.ts XFADE[11] = 5 dates from the picture-clock dissolves): on the video clock it runs 7 f
// like every other plain dissolve (the s.a +- 3.95 picture-frame clamp still holds: the picture runs at ~0.5x there)
// round 8 (USER direction after preview 7: "it goes from one framing / scene to the next too fast"; LEAD: "dissolves 9-12
// video f where they can be"): every dissolve runs 10 video f (the pivot on "You see," and the same-set 8 -> 9 match 12,
// the 14 -> 15 night -> dusk 11), still centred where the picture reaches the boundary and still clamped to the shots'
// lifetimes (s.a +- 3.95 picture frames), so the 6 -> 7 (picture at ~1.1x there) stays at its 7 f limit and the 15 -> 16
// loop dissolve at ~7.8; the 7 -> 8 fly-through keeps story.ts's short value (it rides the dive's all-paper frames)
const XLEN_V: Record<number, number> = { 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 9: 12, 10: 10, 11: 12, 12: 10, 13: 10, 14: 10, 15: 11, 16: 10 };
const XLEN = (id: number) => (XFADE[id] ? Math.max(XFADE[id], XLEN_V[id] ?? 0) : 0);
const XFV = SHOTS.slice(1).filter((s) => XLEN(s.id)).map((s) => {
  const vc = toNew(s.a), half = (XLEN(s.id) + 1) / 2;
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

// ---------------- round 6: glow dissolves + the cha-ching shake (compositing, on the VIDEO clock) ----------------
// Audit A5 P3 (11 -> 12): the blue blueprint and the orange classroom cancel to grey mid-dissolve (saturation 34 -> 14 for
// 3 f, a muddy blink on the pivot to the analogy); P3 (15 -> 16, optional): the dusk -> noon blend is a plain jump. Both
// dissolves become GLOW dissolves (bible 3.3): over the blended pair (a CSS filter on the group of both canvases, never
// on the captions) a bell (sin(pi alpha), peaking at the midpoint) lifts brightness and saturation, and a soft warm light
// (a screen-blended radial bloom, the classroom window light leading in / the "next noon" flash) blooms through it. The
// rest of the film is untouched (filter none), and so are the clean loop frames after the 15 -> 16 dissolve.
type Glow = { lift: number; sat: number; warm: number; col: string; at: [number, number]; r: number; chalk?: number };
const GLOW_DIS: Record<number, Glow> = {
  // round 7 (audit A6 P3 + ADD FILM: the orange desert and the blue blueprint cancel to grey mid-blend, chroma dips 16):
  // the pivot on "You see," is a COOL glow dissolve: lift .08, saturation x1.9 at the midpoint, a pale blue light
  // (190,215,255) blooming from the frame centre, and chalk-dust specks drifting up through the blend (chalk = count)
  11: { lift: 0.08, sat: 0.9, warm: 0.14, col: "190,215,255", at: [0.5, 0.42], r: 1.05, chalk: 34 },
  12: { lift: 0.09, sat: 0.95, warm: 0.12, col: "255,206,150", at: [0.78, 0.3], r: 0.9 },
  // round 8 (audit A7 P3: still a plain muddy mix at the midpoint): a brighter, warmer bloom through the middle (+14 %
  // brightness, a warm-white light from her hat / his cap height) so the mid-mix brightens into the next noon instead of
  // going olive; saturation is held back (it would only saturate the olive)
  16: { lift: 0.14, sat: 0.08, warm: 0.26, col: "255,238,208", at: [0.5, 0.42], r: 1.1 },
};
/** round 7 (audit A6 ADD FILM): chalk-dust specks drifting through the 10 -> 11 glow dissolve: n soft pale-blue dots
 *  (px @1080, the composite's CSS px) at hashed spots, rising and swaying on the VIDEO clock (continuous, no pops: each
 *  fades with the dissolve's bell), a few larger and softer (out-of-focus chalk), never in the caption band */
const chalkSpecks = (vf: number, n: number, b: number, v0: number): React.ReactElement[] => {
  const out: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const a = hsh(i * 3.7 + 0.9), c = hsh(i * 5.3 + 2.1), r = hsh(i * 7.1 + 4.4), w = hsh(i * 9.7 + 6.6);
    const big = r > 0.8, R = big ? 16 + 14 * w : 4.5 + 5 * w; // (first pass 2-6 px: invisible at phone size)
    const x = 1080 * (0.06 + 0.88 * a) + 14 * Math.sin(0.11 * vf + 6.3 * w);
    let y = 1920 * (0.1 + 0.8 * c) - (1.6 + 2.2 * r) * (vf - v0); // v0 = the dissolve's own start (never a literal frame)
    if (y > 1290 && y < 1410) y += y < 1350 ? -130 : 130; // keep the caption band clear
    const o = b * (big ? 0.32 : 0.9) * (0.6 + 0.4 * Math.sin(0.5 * vf + 9 * a));
    out.push(<div key={`ck${i}`} style={{ position: "absolute", left: x - R, top: y - R, width: 2 * R, height: 2 * R, borderRadius: "50%", opacity: o,
      background: "radial-gradient(circle, rgba(236,244,255,1) 0%, rgba(214,230,255,0.7) 45%, rgba(200,220,255,0) 100%)" }} />);
  }
  return out;
};
const glowAt = (vf: number): { g: Glow; b: number; lo: number } | null => {
  // (the bell ends half a frame early: the dissolve's last sliver frame, e.g. 2407 at alpha .99, stays untouched)
  for (const x of XFV) if (GLOW_DIS[x.id] && vf > x.lo + 0.5 && vf < x.hi - 0.5) return { g: GLOW_DIS[x.id], b: Math.sin((Math.PI * (vf - x.lo - 0.5)) / (x.hi - x.lo - 1)), lo: x.lo };
  return null;
};
// Audit A5 ADD shot 10: a 2-3 px camera shake for 6 video frames on the cha-ching ("8%"): hashed offsets decaying over
// the 6 frames, the layer scaled 0.8 % so no edge shows (only shot 10's layer moves; the captions never shake)
// round 8 (USER direction: "make the jokes land ... the heap drop on '14 tons'" with a held beat and a clear reaction): the
// same comic impact shake on the heap's landing in shot 4 (sets_ext poseHeap14: it lands FALL = 6 video f after
// toNew(BEAT.tons14 + 12) - 6, i.e. ON toNew(BEAT.tons14 + 12)), mostly vertical (a heavy thud), 7 video frames, 3.5 px
const SHAKES: { id: number; v: number; A: number; n: number; vy: number }[] = [
  { id: 10, v: Math.round(toNew(BEAT.pct8)), A: 3, n: 6, vy: 1 },
  { id: 4, v: Math.ceil(toNew(BEAT.tons14 + 12)), A: 3.5, n: 7, vy: 1.6 }, // the first frame the heap sits on the ground
];
/** the heap shake fires only when the heap is actually on screen at its landing (CAM may re-stage shot 4): its middle
 *  (TH.heap14, 1.1 m up) projected through shot 4's camera at the landing video frame lies inside the frame (pure) */
let HEAP_SEEN: boolean | null = null;
const heapSeen = () => {
  if (HEAP_SEEN === null) {
    const v = SHAKES[1].v, c = camAt(4, WARP[Math.max(0, Math.min(WARP.length - 1, v))]), k = new THREE.PerspectiveCamera(c.fov, 1080 / 1920, 0.1, 1500);
    k.position.set(...c.pos); k.up.set(0, 1, 0); k.lookAt(...c.look); k.rotateZ(c.roll); k.updateMatrixWorld(); k.updateProjectionMatrix();
    const q = new THREE.Vector3(TH.heap14[0], 1.1, TH.heap14[2]).project(k), d = new THREE.Vector3(TH.heap14[0], 1.1, TH.heap14[2]).applyMatrix4(k.matrixWorldInverse).z;
    HEAP_SEEN = d < 0 && Math.abs(q.x) < 0.9 && Math.abs(q.y) < 0.9;
  }
  return HEAP_SEEN;
};
const shakeAt = (id: number, vf: number): string => {
  for (const S of SHAKES) {
    const n = Math.round(vf) - S.v;
    if (id !== S.id || n < 0 || n >= S.n) continue;
    if (S.id === 4 && !heapSeen()) continue;
    const A = S.A * (1 - n / S.n) ** 1.1, dx = (A / Math.sqrt(S.vy)) * (2 * hsh(n * 1.7 + 0.3 + S.id) - 1), dy = A * Math.sqrt(S.vy) * (n % 2 ? -1 : 1) * (0.6 + 0.4 * hsh(n * 2.9 + 5.1 + S.id));
    return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(1.012)`;
  }
  return "none";
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number; f: number; vf: number; rate: number; fp: [number, number] }> = ({ id, kit, alpha, f, vf, rate, fp }) => (
  <AbsoluteFill style={{ opacity: alpha, transform: shakeAt(id, vf) }}>
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
  const gl = on.world && !on.layer ? glowAt(vf) : null, b = gl ? gl.b : 0;
  const filter = gl ? `brightness(${(1 + gl.g.lift * b).toFixed(4)}) saturate(${(1 + gl.g.sat * b * b).toFixed(4)})` : "none";
  return (
    <AbsoluteFill style={{ background: on.world ? "#bcd3ee" : "#b9a58c" }}>
      <AbsoluteFill style={{ filter }}>
        {on.world ? pickLayers(vf, f, on.layer).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} f={f} vf={vf} rate={rate} fp={fp} />) : null}
        {gl ? <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: gl.g.warm * b,
          background: `radial-gradient(ellipse ${gl.g.r * 100}% ${gl.g.r * 70}% at ${gl.g.at[0] * 100}% ${gl.g.at[1] * 100}%, rgba(${gl.g.col},1) 0%, rgba(${gl.g.col},0.55) 45%, rgba(${gl.g.col},0) 100%)` }} /> : null}
        {gl && gl.g.chalk ? <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>{chalkSpecks(vf, gl.g.chalk, b, gl.lo)}</AbsoluteFill> : null}
      </AbsoluteFill>
      {on.captions ? <Captions frame={vf} /> : null}
    </AbsoluteFill>
  );
};

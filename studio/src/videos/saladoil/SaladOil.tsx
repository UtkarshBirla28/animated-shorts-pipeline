// "The Oil Tanks That Were Mostly Water": flat cartoon characters in a painted 3D world (owner POST).
// One three.js world (world.ts) posed per frame from the timeline (story.ts). Post chain per canvas (the antitheft engine):
//   InkPass (world ink + coloured contact shadows) -> Atmos (dehaze / haze / sky saturation, per shot) -> lens blur pre +
//   main (thin-lens DOF from dofAt) -> camera motion blur (fast moves only, speed-gated) -> bloom (colour-aware key, per
//   light threshold / strength, beat pulses) -> lens glows (practical bulbs) -> NEUTRAL tone mapping -> colour grade (per
//   light state + per-shot trim) -> grain (off by default). MSAA 4.
// Every shot change is a cross-dissolve on the VIDEO clock (story.ts XFADE; a second canvas fades in over the first,
// centred on the video frame where the picture reaches the boundary, clamped to s.a +- XPAD). Each layer is its own canvas
// with its own World and its own copy of every pass, and every per-light / per-shot post setting (ink tint, contact shade,
// atmosphere, motion blur camera, bloom, glows, grade, DOF) is set from THAT layer's shot, so nothing leaks between the
// two layers of a dissolve. No white flash anywhere. Everything is a pure function of (shot id, frame).
// saladoil POST (2026-11-14), keyed to BEAT / SHOTS names only: the golden-oil glints on the tank top (loop-safe) and the
// "ding" sparkle on "it looks full."; a halo / bokeh disc on every practical bulb (found by a scan, so the set owners can
// move them); per-light ink, contact shade, bloom and grade (grade.ts / ink.ts); the rain veil on the storm and a grey
// veil on the street; the pivot's warm glow dissolve into the kitchen ("You see,"); character cards never smear more than
// 14 px of motion blur. FIX ROUND 1 (audit A1): cool lightning flashes on the storm's sound events (never a white-out),
// a GOLD-keyed bloom on the lit hero gold (shots 10-13), dust motes in the office window light (shot 15), and a
// focus-jump smoother (no 1-frame focus pops, whatever dofAt does). FIX ROUND 2 (audit A2): a thud shake on the trading
// floor's THOOM ("crashed", shot 8), the lightning's cool bounce on the wet ground and three raindrops sliding down the lens
// in the storm (shot 9), a fine grain on the navy blueprint + a cool underwater edge on the reveal cutaway (shot 10), a front-loaded
// dissolve 13 -> 14 (the gold blob never muddies olive over the green kiosk), the office_glow bloom eased (0.7 -> 0.6).
// FIX ROUND 3 (audit A3): the trading-floor lightning at the crack (1406) is a real +~12 L* strike (3 f + a 6 f decay);
// per-frame grade adjustments (gradeAdjust: shot 7's late vignette closes on the hatch, the loop's warm vignette tightens on
// 'real.' and lets go on frame 0+, a lamp dip on the THOOM); the pump room's work lamps breathe (bloom); a rain streak on
// the lens catches the far flash (shot 9); the gold glows harder on the thin layer (shot 12) and the settled bottle oil
// (shot 11); grade.ts re-measured on preview3 (late / trading / kitchen / office / office_glow).
// QA toggles (inputProps.post): ink, lens, pre, bloom, grade, grain, captions, world (false = flat card behind the
// captions), dpr, layer ("base" | "over": draw only that layer of a dissolve at full opacity), inkDebug (1 = ink mask,
// 2 = world normals, 3 = contact shadow), ao (contact-shadow multiplier, 0 = off), atmos, mblur, lensfx (false = off),
// hot (true = show what the bloom key lets through in magenta), frames (number[]: composition frame i renders film frame
// frames[i]), rays.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect, AtmosEffect, MotionBlurEffect, LensFxEffect, LensSrc, GodRays, brightPass, HotEffect, type GoldKey } from "./lensblur";
import { GradeEffect, GRADES, gradeFor } from "./grade";
import { Kit } from "./build";
import { VOICE_TOTAL, WARP, toNew } from "./voicewarp";
import { SHOTS, FPS, LAST, XFADE, XPAD, BEAT, V, shotAt, dofAt, camAt, camMotion, lightAt, smooth } from "./story";
import { TK, CU, KI, BK, type LightName, type V3 } from "./plan";
import { Captions } from "./Captions";

// the video is as long as the final narration + the loop tail (voicewarp.ts VOICE_TOTAL = story.ts TOTAL)
export const SALADOIL_FRAMES = VOICE_TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean; captions: boolean; world: boolean;
  layer: "" | "base" | "over"; inkDebug: number; ao: number; atmos: boolean; mblur: boolean; lensfx: boolean; hot: boolean; frames?: number[]; rays: boolean;
  /** fix r1 QA: gain multiplier on the GOLD bloom key (0 = off) */
  gold: number };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, captions: true, world: true, layer: "", inkDebug: 0,
  ao: 1, atmos: true, mblur: true, lensfx: true, hot: false, rays: true, gold: 1,
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
// th = key threshold (linear HDR), maxK = how much the key follows the max channel instead of luminance, i = strength.
// A max-channel key at 1.7 lets only true emissives through (bulbs 2.6-4, the sun disc), never white faces, cream boards
// or clouds (<= ~1.3 in every channel). The POST owner re-checks every light with post.hot on real frames.
type BloomLook = { th: number; maxK: number; i: number };
// saladoil (hot-checked 2026-11-14): the dawn rim light pushes the backlit skyline's red channel past 1.7, so dawn keys on
// a luminance / max mix at 2.2 (bulbs ~3, the sun disc ~6 still bloom); interiors key at 1.5 so a practical bulb that
// WORLD-INT drives to ~1.6-2 still blooms (white faces / cream boards / paper stay <= ~1.3 under every light).
const BLOOM: Record<LightName, BloomLook> = {
  dawn_gold: { th: 2.2, maxK: 0.6, i: 0.55 }, noon: { th: 1.7, maxK: 1, i: 0.5 }, late: { th: 1.9, maxK: 0.8, i: 0.5 }, storm: { th: 1.7, maxK: 1, i: 0.45 },
  bank_warm: { th: 1.5, maxK: 1, i: 0.6 }, trading: { th: 1.28, maxK: 1, i: 0.55 }, cutaway: { th: 1.6, maxK: 1, i: 0.55 }, kitchen: { th: 1.6, maxK: 1, i: 0.6 },
  pump_night: { th: 1.5, maxK: 1, i: 0.8 }, street_grey: { th: 1.7, maxK: 1, i: 0.45 }, office_sun: { th: 1.5, maxK: 1, i: 0.6 }, office_glow: { th: 1.45, maxK: 1, i: 0.6 },   // fix r2: glow 0.7 -> 0.6 (WORLD-INT P1: the milky swell)
};
/** a one-shot pulse: 0 before t0, up over `up` f, back down with an e-fold of `fall` f */
const pulseAt = (f: number, t0: number, up: number, fall: number) => { const t = f - t0; return t < 0 ? 0 : Math.min(1, t / up) * Math.exp(-Math.max(0, t - up) / fall); };
/** beat pulses on the bloom strength: fix r1 (audit A1 ADD shot 12): the gold disc blooms +25 % with the "ding" sparkle on
 *  "it looks FULL." (a 4 f rise, a 22 f fall) */
const bloomPulse = (id: number, f: number) => (id === 12 ? 1 + 0.25 * pulseAt(f, BEAT.looksFull - 1, 4, 22) : 1);
// ---- fix r1: the GOLD key (lensblur.ts brightPass: the lit hero gold blooms softly, nothing else) ----
// [gain, max-channel threshold (linear), linear hue lo / hi (deg), saturation gate]: gold #F2B62E is linear hue ~31,
// the orange fish ~19, the red cut edges ~0-10, sunny wall yellows ~40-48 at a lower saturation
const GOLD_CUT = (): [number, number, number, number, number] => [0.6, 0.45, 24, 47, 0.7];
const kiPts: V3[] = [-0.11, 0.11].flatMap((dx) => [0.02, 0.36].map((dy) => [KI.base[0] + KI.bottle.c[0] + dx, KI.base[1] + KI.bottle.c[1] + dy, KI.base[2] + KI.bottle.c[2]] as V3));
const goldKeyAt = (id: number, f: number, cam: THREE.PerspectiveCamera, vf = f): GoldKey | null => {
  // shot 10: the thin gold band over the huge blue body glows a little, so the eye goes to it ("Inside...")
  // fix r3 (ADD life: "the final diagram 1622-1637 is frozen apart from the fish"): the thin gold band's glow breathes
  // +-22 % on a slow 48-frame swell (video clock), so the hold lives and the eye keeps going back to the gold
  if (id === 10) { const k = GOLD_CUT(); k[0] *= 1 + 0.22 * Math.sin((2 * Math.PI * vf) / 48); return { k }; }
  // shot 12: the poured gold and the hatch disc, with a swell on the "ding" (the sparkle) of "it looks FULL."
  // fix r3 (audit A3 shot 12: "the THIN OIL LAYER is a ~10 px line pressed against the red roof eave, it reads as part of
  // the roof"): while the oil goes in and the crane rises past the cut face ('oil in' .. 'the hatch'), the gold glows
  // harder (0.4 -> 0.62): the thin layer separates from the red eave (red lies outside the gold key's hue window)
  if (id === 12) return { k: [0.4 + 0.22 * smooth((f - (BEAT.oilIn - 16)) / 14) * (1 - smooth((f - (BEAT.hatch - 4)) / 16)) + 0.5 * pulseAt(f, BEAT.looksFull - 1, 4, 22), 0.45, 24, 47, 0.7] };
  // shot 11: once the oil has risen and settles ("...to the top."), the gold layer glints like the tank oil; confined to
  // the bottle (the sunny yellow walls never key)
  if (id === 11) {
    // fix r2 (audit A2 P3: keep the bottle's gold vivid against the calmer kitchen grade): a soft glow already from "The oil
    // always rises" (x0.35), swelling to the full glint as it settles at the top
    // fix r3 (audit A3 shot 11: "the gold oil never glows, even at its 'aha' moment ('top')"): 0.35 + 0.4 -> 0.42 + 0.55
    const g = 0.42 * smooth((f - BEAT.theOilRises) / 24) + 0.55 * smooth((f - (BEAT.top - 24)) / 30);
    if (g <= 0.005) return null;
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of kiPts) { const q = project(cam, p); x0 = Math.min(x0, q.uv[0]); x1 = Math.max(x1, q.uv[0]); y0 = Math.min(y0, q.uv[1]); y1 = Math.max(y1, q.uv[1]); }
    return { k: [g, 0.4, 22, 50, 0.4], rect: [x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02] };
  }
  // shot 13: the blob and the gold glass pipe sections glow in the night (the amber lamp pools on the walls are less
  // saturated and stay out; the bulbs bloom through the HDR key as before)
  if (id === 13) return { k: [0.55, 0.5, 26, 46, 0.82] };
  return null;
};
/** the bloom's mip-blur radius: the gold shots get a wider, softer halo (a lit gold surface glows, it does not sparkle) */
const bloomRadius = (id: number) => (id >= 10 && id <= 13 ? 0.82 : 0.6);

// ---------------- lightning (fix r1, audit A1 P2 shot 9 + WORLD-EXT / WORLD-INT: thunder with no lightning) ----------------
// cool-white #DFE6FF display-space flashes through the grade (grade.ts flash()), keyed to the sound's own events:
//   thunder_8 = shot 9's a - 7 (the crack in the gap after "crashed.", seen in the trading floor and into the dissolve),
//   the BANKRUPT slap = BEAT.bust - 2 (the notice lands), thunder_9 = BEAT.checked - 8 (a far flash).
// Each: 1 f of sky-only pre-glow, a 1 f peak, a 2-3 f decay (never a white-out: +15 L* at most on the mids).
const FLASH_COL: [number, number, number] = [0.875, 0.902, 1.0];
const FLASH_PEAK = 0.1;     // display units added on bright mids at k = 1 (~ +15 luma on 0..255 over the frame)
type Flash = { ids: number[]; f: number; k: number; far?: boolean; sky?: number; env?: Record<number, [number, number]> };
// fix r3 (audit A3 P3 FILM 1403-1412: "the first lightning flash at 1406 is barely visible, +3.6 L* during the dissolve,
// while its thunder crack is one of the loudest hits in the film"): the trading-floor strike is now a real flash, about
// +12 L* on the frame for 3 f (n 0..2) with a 6 f decay (n 3..8), the upper frame (the tall rain windows, the ceiling)
// leading by 1 f and lingering as it fades; same frame as the crack (shot 9's a - 7), carried by both dissolve layers
const ENV_BIG: Record<number, [number, number]> = { [-1]: [0.25, 1], 0: [1, 0.25], 1: [1, 0.2], 2: [0.92, 0.2], 3: [0.66, 0.3], 4: [0.44, 0.4],
  5: [0.27, 0.5], 6: [0.14, 0.6], 7: [0.06, 0.7], 8: [0.02, 0.8] };
const FLASHES: Flash[] = [
  { ids: [8, 9], f: SHOTS[8].a - 7, k: 2.5, sky: 0.2, env: ENV_BIG },   // indoors: the tall windows and the ceiling light first
  { ids: [9], f: BEAT.bust - 2, k: 1.0 },
  { ids: [9], f: BEAT.checked - 8, k: 0.47, far: true },
];
const ENV_NEAR: Record<number, [number, number]> = { [-1]: [0.35, 1], 0: [1, 0], 1: [0.6, 0], 2: [0.28, 0.3], 3: [0.08, 0.5] };
const ENV_FAR: Record<number, [number, number]> = { [-1]: [0.3, 1], 0: [1, 0.5], 1: [0.4, 0.7] };
// fix r2 (audit A2 ADD shot 9): the flash BOUNCES off the wet ground (grade.ts flashGround: the lower 42 % of the frame, its
// brighter wet reflections only): a cool #CFE0FF glint that peaks 1 f after the sky (the eye reads the ground answering the
// strike), on the BANKRUPT strike and, weaker, on the far flash; outdoors only (shot 9)
const GROUND_COL: [number, number, number] = [0.81, 0.88, 1.0];
const GROUND_PEAK = 0.1;
const ENV_G: Record<number, number> = { 0: 0.55, 1: 1, 2: 0.5, 3: 0.2 };
const groundAt = (id: number, vf: number): number => {
  if (id !== 9) return 0;
  let k = 0;
  for (const F of FLASHES) {
    if (!F.ids.includes(9)) continue;
    const e = ENV_G[Math.round(vf) - Math.round(V(F.f))];
    if (e) k = Math.max(k, e * Math.min(1, F.k) * (F.far ? 0.5 : 1));   // (fix r3: the bounce keeps its A2 level)
  }
  return k * GROUND_PEAK;
};
/** this layer's lightning at video frame vf: [strength (display units), sky-only weight] */
const flashAt = (id: number, vf: number): [number, number] => {
  let k = 0, sky = 0;
  for (const F of FLASHES) {
    if (!F.ids.includes(id)) continue;
    const n = Math.round(vf) - Math.round(V(F.f)), e = (F.env ?? (F.far ? ENV_FAR : ENV_NEAR))[n];
    if (e && e[0] * F.k > k) { k = e[0] * F.k; sky = Math.max(e[1], F.sky ?? 0); }
  }
  return [k * FLASH_PEAK, sky];
};

// ---------------- dust motes (fix r1, audit A1 ADD shot 15; + life in the long holds of shots 3 / 6 / 11) ----------------
// soft specks turning in the window light, drifting ~0.3 px per video frame (grade.ts motes(), display space, on the
// VIDEO clock): the investor's office (shot 15, ~28, brightening with the office_glow relight on "Warren Buffett"), and
// fewer, fainter ones in the bank's window light (shot 3), in front of the chart (shot 6, whose holds read frozen in A1)
// and in the kitchen's sunny window light (shot 11). Never in the loop shots.
type Motes = { k: number; n: number; size: number; region: [number, number, number, number]; col: [number, number, number] };
const motesAt = (id: number, f: number): Motes | null => {
  if (id === 15) {
    const m = lightMix(id, f), glow = m.a === "office_glow" ? 1 : m.b === "office_glow" ? m.k : 0;
    return { k: 0.45 + 0.35 * glow, n: 28, size: 1.4, region: [0.04, 0.3, 0.96, 0.97], col: [1.0, 0.91, 0.74] };
  }
  if (id === 3) return { k: 0.34, n: 18, size: 1.3, region: [0.4, 0.38, 1.0, 0.97], col: [1.0, 0.9, 0.72] };
  if (id === 6) return { k: 0.3, n: 20, size: 1.25, region: [0.02, 0.3, 0.98, 0.97], col: [1.0, 0.9, 0.74] };
  if (id === 11) return { k: 0.34, n: 22, size: 1.3, region: [0.02, 0.4, 0.98, 0.98], col: [1.0, 0.94, 0.78] };
  return null;
};

// ---------------- per-frame grade adjustments (fix r3; grade.ts GradeEffect.adjust, called on EVERY frame) ----------------
// 1. shot 7 (audit A3 ADD: "a soft vignette that tightens toward the hatch as the light turns late, framing the reflected
//    face as the mystery image"): the late preset's warm vignette (grade.ts: .15 / r .42 at noon -> .30 / r .30 late) moves
//    its centre onto the hatch (the oil disc, projected) with the relight, 70 % of the way, so the frame closes in on the
//    face in the gold while the lender's face at the top stays lit.
// 2. shots 16 + 1, the LOOP (audit A3 ADD shot 16: "a very soft warm vignette, corner / centre ~0.78, that tightens on
//    'real.', drawing the eye into the gold for the loop"): +.06 strength and a .06 smaller start radius ease in over 24 f
//    from 'real.' - 6 and hold to the last frame; shot 1 starts from exactly that state on frame 0 and lets it out over its
//    first 40 video frames (loop clock), so frame 0 = the last frame bit for bit (the factor is exactly 1 on both).
// 3. shot 8 (ADD: the THOOM jolts the room): the pendant-lit floor flickers on the crash: a 2-step lamp dip (-0.26 stop on
//    the first frame after the hit, a second -0.17 dip 3 f later; measured -2.5 / -1.7 L*), like the wiring took the shock.
const LOOP_VIG = 0.06;
const loopVig = (id: number, f: number, vf: number) =>
  id === LAST ? smooth((f - (BEAT.real - 6)) / 24) : id === 1 ? 1 - smooth(vf / 40) : 0;
const DIP8: Record<number, number> = { 1: -0.26, 2: -0.12, 3: -0.02, 4: -0.17, 5: -0.05 };
const gradeAdjust = (id: number, f: number, vf: number, cam: THREE.PerspectiveCamera): [number, number, number, [number, number] | null, number] => {
  if (id === 7) {
    const m = lightMix(7, f), k = m.b === "late" ? m.k : m.a === "late" ? 1 : 0;
    const p = project(cam, OILC);
    return [0, 0, 0, p.on ? [p.uv[0], p.uv[1]] : null, 0.7 * k];
  }
  if (id === 1 || id === LAST) { const e = loopVig(id, f, vf); return [0, LOOP_VIG * e, -LOOP_VIG * e, null, 0]; }
  if (id === 8) return [DIP8[Math.round(vf) - Math.round(V(BEAT.crashed1))] ?? 0, 0, 0, null, 0];
  return [0, 0, 0, null, 0];
};
/** fix r3 (ADD shot 13, audit A3 "the punch-line hold is close to locked"): the pump room's bare work lamps buzz: the bloom
 *  on the bulbs breathes +-6 % with a rare quick dip (an old filament on a night shift), on the video clock; shot 13 only */
const lampFlicker = (id: number, vf: number) => {
  if (id !== 13) return 1;
  const t = vf, d = (n: number) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
  const slow = 0.04 * Math.sin(t * 0.21 + 0.6) + 0.025 * Math.sin(t * 0.53 + 2.1);
  const c = Math.floor(t / 37), u = t - c * 37, dip = d(c) > 0.55 && u >= 11 && u < 15 ? [0, -0.16, -0.08, -0.03][u - 11] : 0;
  return 1 + slow + dip;
};

// ---------------- focus-jump smoothing (fix r1, audit A1 P1 shots 3 / 15: 1-frame focus snaps) ----------------
// story.ts dofAt switches the focus POINT at an entry's start (only cInf ramps), so a rack is a 1-frame pop. The composer
// now watches a +-FW frame window: if the focus point jumps > 0.6 m between two neighbouring frames there, it takes a
// Hann-weighted average of the focus points over the window, so every jump becomes a ~2 FW frame ease (a designed rack
// that moves < 0.6 m per frame is left exactly as written). Pure function of (shot, frame).
const FW = 11;
const focusPt = (id: number, f: number): V3 | null => { const d = dofAt(id, f); return d.focus ? d.focus(f) : null; };
const smoothFocus = (id: number, f: number): V3 | null => {
  const p0 = focusPt(id, f);
  if (!p0) return null;
  const pts: V3[] = [];
  let jump = false;
  for (let k = -FW; k <= FW; k++) {
    const q = k === 0 ? p0 : focusPt(id, f + k);
    if (!q) return p0;
    if (pts.length && Math.hypot(q[0] - pts[pts.length - 1][0], q[1] - pts[pts.length - 1][1], q[2] - pts[pts.length - 1][2]) > 0.6) jump = true;
    pts.push(q);
  }
  if (!jump) return p0;
  let sw = 0; const acc: V3 = [0, 0, 0];
  pts.forEach((q, i) => { const w = 0.5 + 0.5 * Math.cos((Math.PI * (i - FW)) / (FW + 1)); sw += w; acc[0] += w * q[0]; acc[1] += w * q[1]; acc[2] += w * q[2]; });
  return [acc[0] / sw, acc[1] / sw, acc[2] / sw];
};

// ---------------- atmosphere per shot ----------------
// dehaze: the mid band's haze down (wides keep contrast); haze: extra aerial haze toward the fog colour on the far band;
// skySat: saturation x on the sky only. Shots 1 and LAST carry nothing here (frame 0 = last frame).
type ShotPost = { dehaze?: [number, number, number, number]; dehazeFar?: [number, number]; haze?: [number, number, number];
  hazeCol?: [number, number, number]; skySat?: number; skyDeep?: [number, number, number];
  /** fix r2: blueprint paper fibres + mottling on WORLD surfaces (world-anchored, never on character cards) */
  paper?: number;
  /** fix r3: heat shimmer over the far band at the horizon [amp px @1080, distance ramp start m, end m, band half height uv] */
  shimmer?: [number, number, number, number] };
// the dawn tank top (shot 1 AND the loop shot 16: identical, the seam): the pale peach band over the harbour gets a
// little richer and deeper, the far tanks a little less milky (both are no-ops on the near hatch view of frame 0)
const DAWN_POST: ShotPost = { dehaze: [0.2, 60, 260, 0.8], dehazeFar: [480, 760], skyDeep: [0.45, 0.1, 0.22] };
const SHOT_POST: Record<number, ShotPost> = {
  1: DAWN_POST, 16: DAWN_POST,
  // fix r3 (ADD life, audit A3 shot 2 life 6.5: the noon landing "nearly frozen"): a faint noon HEAT SHIMMER over the far
  // band at the horizon (the far tank rows, the harbour, the skyline; 1.2-1.4 px @1080, depth-gated so nothing near ever
  // wobbles, on the video clock): the summer air over the waterfront moves while the characters hold
  2: { dehaze: [0.25, 60, 240, 0.9], dehazeFar: [300, 500], skySat: 1.05, shimmer: [1.3, 70, 180, 0.07] },   // the tank-farm noon wide keeps its contrast
  4: { dehaze: [0.18, 60, 260, 0.8], dehazeFar: [480, 760], skySat: 1.04, shimmer: [1.2, 90, 220, 0.06] },   // the noon tank top: the harbour rows less milky
  9: { haze: [0.12, 40, 260] },                                                // the rain: a little more grey veil far out
  14: { haze: [0.08, 40, 300] },                                               // the grey street
};
// fix r2 (audit A2 ADD shot 10): a faint grain on the navy blueprint world. (The atmosphere's world-anchored paper cannot
// reach it: the navy is the scene background behind a transparent grid plane, i.e. sky depth.) A fine film grain "on twos"
// (a new pattern every 2nd video frame, so it never fizzes), gated to the dark navy only (display luma < ~0.3; the clear
// water, the gold band and the fish stay clean). Every other shot: amount 0, an exact bypass (lensblur.ts).
const GRAIN: Record<number, { a: number; gate: [number, number] }> = { 10: { a: 0.024, gate: [0.26, 0.46] } };

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

// ---------------- lens glows per shot (LensFxEffect) ----------------
// 1. THE OIL GLINT (the film's hero colour, bible 6.4: bloom on emissives only): two small 4-point star glints twinkle
//    on the golden oil in the open hatch wherever the tank top is on screen (shots 1, 4, 7, 16), and a single "ding"
//    sparkle pops on the cutaway's golden top on "it looks FULL." (shot 12). The twinkle runs on the LOOP clock tau
//    (0 on frame 0 of shot 1 AND on the last frame of the loop shot), so frame 0 and the last frame stay identical. The
//    glints hide while the oil parts in shot 16 ("fake." .. "real.") and while a character's card is in front (depth).
// 2. PRACTICAL BULBS: every small visible emissive bulb in the set (MeshBasic colour > 1.6 in a channel, radius < 0.3 m:
//    the pump-room work lamps, the banker's lamp, desk lamps ...; colour > 1.4) gets a soft warm halo, or a bokeh disc when the lens
//    blur dissolves it (bible 6.5: bokeh discs from point lights). Found by a scan, so WORLD-INT can move or add bulbs.
const OILC: V3 = [TK.base[0] + TK.hatch.c[0], TK.hatch.oil + 0.002, TK.base[2] + TK.hatch.c[2]];
/** glint spots on the oil (offsets from the hatch centre, m): clear of the tape (x -0.12) and of the shot-7 face card */
const GLINTS: { o: [number, number]; ph: number; s: number }[] = [{ o: [0.19, -0.13], ph: 0, s: 1 }, { o: [-0.04, 0.22], ph: 2.1, s: 0.7 }];
const GLINT7: { o: [number, number]; ph: number; s: number }[] = [{ o: [0.25, -0.16], ph: 0.7, s: 0.8 }];
/** fix r2: the shot-12 hatch hold (the far half of the cutaway disc, CU.hatch r 0.45) */
const GLINT12: { o: [number, number]; ph: number; s: number }[] = [{ o: [0.14, -0.2], ph: 0, s: 1 }, { o: [-0.13, -0.09], ph: 2.1, s: 0.75 }];
/** loop clock (video frames): 0 on frame 0 and on the last frame (the loop shot counts up to 0) */
const loopTau = (id: number, vf: number) => (id === LAST ? vf - (VOICE_TOTAL - 1) : vf);
/** shot 16: the oil parts on "fake." (16 f) and settles back by "real.": the glints dim out while it is open */
const partHide = (f: number) => smooth((f - (BEAT.fake - 4)) / 8) * (1 - smooth((f - (BEAT.real - 8)) / 12));
/** one glint = a 4-point star (thin arms, a hot core) over a small warm halo */
const glintSrc = (cam: THREE.PerspectiveCamera, w: V3, k: number, rot: number, size = 0.05): LensSrc[] => {
  const p = project(cam, w);
  if (!p.on || k <= 0.01) return [];
  const R = Math.min(46, Math.max(5, pxOf(cam, size, p.dist)));
  return [{ uv: p.uv, dist: p.dist, kind: 0, col: [0.5 * k, 0.32 * k, 0.08 * k], p: [R * 0.42, R * 0.42], minVis: 0, occ: 0.12 },
    { uv: p.uv, dist: p.dist, kind: 1, col: [1.5 * k, 1.15 * k, 0.55 * k], rot, p: [R * 0.85, R * 0.2, Math.max(0.9, R * 0.055)], minVis: 0, occ: 0.12 }];
};
const bulbSph = new THREE.Sphere();
/** fix r1: the halo scan's colour threshold per light (WORLD-INT drives the trading-floor globe pendants to ~1.3) */
const SCAN_TH: Partial<Record<LightName, number>> = { trading: 1.2 };
const lensSources = (id: number, f: number, vf: number, cam: THREE.PerspectiveCamera, root: THREE.Object3D, focus: number, cInf: number): LensSrc[] => {
  const out: LensSrc[] = [];
  const s = SHOTS[id - 1];
  // ---- 1. the oil glints ----
  if (s.set === "tanktop") {
    const tau = loopTau(id, vf), hide = id === LAST ? 1 - partHide(f) : 1;
    for (const [i, g] of (id === 7 ? GLINT7 : GLINTS).entries()) {
      // a slow breathing twinkle (whole cycles are not needed: tau is 0 on both seam frames) + a slow turn of the star
      const tw = 0.62 + 0.38 * (0.5 + 0.5 * Math.cos((2 * Math.PI * tau) / 64 + g.ph)) * (0.7 + 0.3 * Math.cos((2 * Math.PI * tau) / 151 + 1.3 * i));
      const src = glintSrc(cam, [OILC[0] + g.o[0], OILC[1], OILC[2] + g.o[1]], g.s * tw * hide, 0.35 + 0.0035 * tau + 0.6 * i);
      out.push(...src);
    }
  }
  if (id === 12) {   // the "ding" on "it looks FULL.": a sparkle pops on the golden top seen from the hatch
    const t = f - (BEAT.looksFull - 1);
    const k = t < 0 ? 0 : Math.min(1, t / 4) * Math.exp(-Math.max(0, t - 4) / 22);
    out.push(...glintSrc(cam, [CU.base[0] + 0.12, CU.oil + 0.002, CU.base[2] + CU.hatch.c[2] - 0.1], 1.6 * k, 0.4 + 0.02 * t));
    // fix r2 (audit A2 P2 shot 12: "the hatch hold ... is nearly still apart from the sparkle"): from the crane's landing on
    // "the hatch" the golden disc carries the same two slow breathing glints as the real tank's oil (shots 1 / 4 / 16), so
    // the hold lives and the hatch view rhymes with frame 0 (the "ding" sparkle still tops them on "full.")
    const hk = smooth((f - (BEAT.hatch - 6)) / 16);
    // (on the FAR half of the disc: the near collar wall hides the near half from the hatch camera)
    if (hk > 0.01) for (const [i, g] of GLINT12.entries()) {
      const tw = 0.62 + 0.38 * (0.5 + 0.5 * Math.cos((2 * Math.PI * vf) / 64 + g.ph)) * (0.7 + 0.3 * Math.cos((2 * Math.PI * vf) / 151 + 1.3 * i));
      out.push(...glintSrc(cam, [CU.base[0] + CU.hatch.c[0] + g.o[0], CU.oil + 0.002, CU.base[2] + CU.hatch.c[2] + g.o[1]], 1.3 * g.s * tw * hk, 0.35 + 0.0035 * vf + 0.6 * i));
    }
  }
  // fix r3 (ADD life, audit A3 shot 10: "the holds are frozen: the hatch frames 1544-1552 differ only by codec noise"): the
  // opening golden hatch ('Inside...') carries the same two slow breathing glints as the real tank's oil (shots 1 / 4 / 16,
  // the far half of the disc), fading out as the camera pulls away to show the dark body under it
  if (id === 10) {
    const hk = 1 - smooth((f - (BEAT.inside + 22)) / 16);
    if (hk > 0.01) for (const [i, g] of GLINT12.entries()) {
      const tw = 0.62 + 0.38 * (0.5 + 0.5 * Math.cos((2 * Math.PI * vf) / 64 + g.ph)) * (0.7 + 0.3 * Math.cos((2 * Math.PI * vf) / 151 + 1.3 * i));
      out.push(...glintSrc(cam, [CU.base[0] + CU.hatch.c[0] + g.o[0], CU.oil + 0.002, CU.base[2] + CU.hatch.c[2] + g.o[1]], 1.4 * g.s * tw * hk, 0.35 + 0.0035 * vf + 0.6 * i, 0.085));
    }
  }
  // fix r3 (audit A3 shot 3: "the 'ka-ching' at 525-527 has no visible source"): the cash bundles land at 'against it' + 16
  // (register_3) and the top bill's paper band catches the light: a sparkle pops as they settle and a second, smaller one
  // on the bell's 'CHING' ~9 f later (the same 4-point star as the shot-12 'ding')
  if (id === 3) {
    const t0 = BEAT.againstIt + 17, k = pulseAt(f, t0, 3, 12) + 0.75 * pulseAt(f, t0 + 9, 3, 14);
    if (k > 0.01) out.push(...glintSrc(cam, [BK.base[0] + BK.cashTo[0] + 0.035, BK.base[1] + BK.cashTo[1] + 0.106, BK.base[2] + BK.cashTo[2] + 0.012], 1.5 * k, 0.5 + 0.03 * (f - t0)));
  }
  // ---- 2. practical bulbs: halo in focus, bokeh disc when the lens dissolves them ----
  const found: { p: Proj; c: THREE.Color; r: number }[] = [];
  root.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    if (!mat || !mat.isMeshBasicMaterial || mat.transparent) return;
    const c = mat.color;
    if (Math.max(c.r, c.g, c.b) < (SCAN_TH[s.light] ?? 1.4)) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    m.updateWorldMatrix(true, false);
    bulbSph.copy(g.boundingSphere!).applyMatrix4(m.matrixWorld);
    if (bulbSph.radius > 0.3) return;
    const p = project(cam, bulbSph.center);
    if (!p.on || Math.abs(p.uv[0] - 0.5) > 0.6 || Math.abs(p.uv[1] - 0.5) > 0.6) return;
    found.push({ p, c, r: bulbSph.radius });
  });
  found.sort((x, y) => x.p.dist - y.p.dist);
  for (const b of found.slice(0, 10)) {
    const coc = cInf * Math.abs(1 - focus / Math.max(b.p.dist, 0.05)), bk = smooth((coc - 4) / 6);
    const n = 1 / Math.max(b.c.r, b.c.g, b.c.b), col: [number, number, number] = [b.c.r * n, b.c.g * n, b.c.b * n];
    const R = Math.min(80, Math.max(16, pxOf(cam, 0.42, b.p.dist)));
    if (bk < 0.99) out.push({ uv: b.p.uv, dist: b.p.dist, kind: 0, col: [0.24 * col[0] * (1 - bk), 0.24 * col[1] * (1 - bk), 0.24 * col[2] * (1 - bk)],
      p: [R, R], occ: 0.25, minVis: 0.25, dark: 0.3 });
    if (bk > 0.01) out.push({ uv: b.p.uv, dist: b.p.dist, kind: 4, col: [0.09 * col[0] * bk, 0.08 * col[1] * bk, 0.07 * col[2] * bk],
      p: [Math.min(26, coc), 1.6, 0.45], occ: 0.25, minVis: 0.4 });
  }
  return out;
};
/** god rays: none (the dawn sun sits off-frame behind the camera's shoulder in shot 1; WORLD-EXT paints the sky glow) */
const godRays = (_id: number, _f: number, _cam: THREE.PerspectiveCamera): GodRays | null => null;

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("saladoil kit"));
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
/** per-frame motion-blur caps (px @1080) [everything, character cards]: the world may streak on the few fast glides
 *  (shot 12's crane, shot 13's follow, shot 4's crane down), the character cards never smear more than 14 px, so faces
 *  and the clipboard / boards on them stay readable */
// fix r1 (the user's pacing: slow bells, no smears; A1 called the fast cranes a smear): the world streak is capped at 32 px
const MB_MAX = 32, MB_CARD = 14;
const mbCaps = (_id: number, _f: number): [number, number] => [MB_MAX, MB_CARD];

const Inner: React.FC<{ id: number; kit: Kit; f: number; vf: number; rate: number }> = ({ id, kit, f, vf, rate }) => {
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
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.5 }),
      mblur: new MotionBlurEffect({ shutter: 0.22, knee: 3, maxLen: 48 }),
      bloom, bright: brightPass(bloom),
      lensfx: new LensFxEffect(),
      hot: new HotEffect(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADES.noon, 1),
      grain: new GrainEffect({ amount: 0, cellPx: 1.6 }),
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
      add("grain", fx.grain);   // fix r2: always in the chain (amount 0 = exact bypass), the per-shot GRAIN or the QA toggle
    }
    // autoClear off: R3F's composer otherwise renders every pass with renderer.autoClear on, which clears the depth
    // renderbuffer of the MSAA target that owns the depth texture (lens blur / motion blur / glows then read "all far")
    return <EffectComposer multisampling={4} autoClear={false}>{list}</EffectComposer>;
  }, [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene, vf)); // vf = the VIDEO frame (narration clock) for idle life
  noInkFallback(world.root);
  // ---- lens blur ----
  const d = dofAt(id, f);
  cam.getWorldDirection(fwd);
  const sf = smoothFocus(id, f);
  if (sf) fpt.set(...sf); else fpt.copy(target);
  const focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.focus = focus;
  fx.lens.cInf = on.lens ? d.cInf : 0;
  // ---- per-layer light: ink tint + contact shade + bloom + grade follow this shot's light, never the other layer's ----
  const m = lightMix(id, f);
  fx.ink.look(m.a, m.b, m.k);
  fx.ink.lens(focus, on.lens ? d.cInf : 0);
  const BA = BLOOM[m.a], BB = BLOOM[m.b], L = (x: number, y: number) => x + (y - x) * m.k;
  const gk = on.bloom && on.gold > 0 ? goldKeyAt(id, f, cam, vf) : null;
  if (gk) gk.k[0] *= on.gold;
  fx.bright(L(BA.th, BB.th), 0.3, L(BA.maxK, BB.maxK), gk);
  fx.bloom.intensity = L(BA.i, BB.i) * bloomPulse(id, f);
  fx.bloom.mipmapBlurPass.radius = bloomRadius(id);
  fx.hot.set(L(BA.th, BB.th), L(BA.maxK, BB.maxK));
  gradeFor(fx.grade, m.a, m.b, m.k, id, f);
  fx.grade.adjust(...gradeAdjust(id, f, vf, cam));   // fix r3: every frame (zeros = the preset as cached)
  fx.bloom.intensity *= lampFlicker(id, vf);
  fx.grade.rays(null);
  const fl = flashAt(id, vf);
  fx.grade.flash(FLASH_COL, fl[0], fl[1]);
  fx.grade.flashGround(GROUND_COL, groundAt(id, vf), 0.42);
  // the motes drift in the window light (shots 3, 6, 11, 15; off elsewhere)
  const mo = motesAt(id, f);
  fx.grade.motes(mo ? mo.k : 0, vf, mo?.n ?? 0, mo?.size ?? 1, mo?.region ?? [0, 0, 1, 1], mo?.col ?? [1, 0.9, 0.72]);
  const gr = GRAIN[id];
  fx.grain.amount = on.grain ? 0.025 : gr ? gr.a : 0;
  fx.grain.gate(!on.grain && gr ? gr.gate : null);
  fx.grain.seed = gr && !on.grain ? Math.floor(vf / 2) : Math.round(vf);
  // ---- atmosphere (this layer's own fog + camera) ----
  const sp = SHOT_POST[id] ?? {};
  const proj: [number, number] = [cam.projectionMatrix.elements[0], cam.projectionMatrix.elements[5]];
  const fog = scene.fog && (scene.fog as THREE.Fog).isFog ? (scene.fog as THREE.Fog) : null;
  const hz = horizonY(cam), shm = sp.shimmer;
  fx.atmos.set({ dehaze: sp.dehaze, dehazeFar: sp.dehazeFar, haze: sp.haze, hazeCol: sp.hazeCol, skySat: sp.skySat, skyDeep: sp.skyDeep, skyHorizon: hz, paper: sp.paper,
    shimmer: shm ? { amp: shm[0], d0: shm[1], d1: shm[2], band: shm[3], horizon: hz, t: vf / 30 } : undefined },
    fog, cam.matrixWorld, proj, on.ink ? fx.ink.worldDepth ?? null : null);
  // ---- camera motion blur: a camera sampled inside the SAME integer frame as f (the impact kicks flip on integer
  // frames), half a frame ahead when there is room, else behind; its step is scaled to one VIDEO frame of motion ----
  if (on.mblur) {
    const fl = Math.floor(f + 1e-6), up = fl + 0.999 - f, dn = f - fl;
    const step = up >= 0.25 ? Math.min(0.5, up) : -Math.min(0.5, Math.max(dn, 0.05));
    const c = camAt(id, f + step);
    next.position.set(...c.pos); next.up.set(0, 1, 0); next.lookAt(...c.look); next.rotateZ(c.roll);
    next.fov = c.fov; next.aspect = cam.aspect; next.near = cam.near; next.far = cam.far; next.updateProjectionMatrix(); next.updateMatrixWorld();
    // the shutter follows the LATERAL image speed (pan / truck / tilt, not zoom): 0.22 f (light) up to 2 %/f, ~180 deg
    // from 5.5 %/f; creeps and slow glides stay crisp (3 px knee + the speed gate below)
    const mo = camMotion(id, f), lat = Math.max(Math.abs(mo.dx) / 1080, Math.abs(mo.dy) / 1920) * 100 * rate;
    fx.mblur.shutter = 0.22 + 0.18 * smooth((lat - 2) / 3.5);   // fix r1: at most ~145 deg (was 180)
    const amt = rate / (2 * step);
    const ms = maxShift(cam, next, Math.min(focus, 60));
    // the fastest probe's image speed per VIDEO frame gates the blur: none below 2.2 %W/f, full from 3.4 %W/f
    const spd = (ms * 2 * Math.abs(amt) * 100) / 1080, gate = smooth((spd - 2.2) / 1.2);
    const shift = ms * 2 * fx.mblur.shutter * Math.abs(amt) * gate;
    const [cap, capCard] = mbCaps(id, f);
    fx.mblur.caps(cap, capCard, on.ink ? fx.ink.worldDepth ?? null : null);
    const vp = new THREE.Matrix4().multiplyMatrices(next.projectionMatrix, next.matrixWorldInverse);
    fx.mblur.set(shift > fx.mblur.knee + 0.5 && cap > 0.5 ? amt * gate : 0, cam.matrixWorld, vp, proj);
  }
  // ---- lens glows ----
  const srcs = on.lensfx ? lensSources(id, f, vf, cam, world.root, focus, on.lens ? d.cInf : 0) : [];
  fx.lensfx.set(srcs, on.lensfx && on.rays ? godRays(id, f, cam) : null);
  fx.lensfx.scan(0, 3, 0, 0);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

// ---------------- dissolves on the VIDEO clock ----------------
// Every dissolve runs in XFADE + 1 equal steps on the VIDEO clock, centred on the video frame where the picture reaches
// the shot boundary, clamped so both layers stay inside the shots' lifetimes (s.a +- XPAD picture frames).
const XFV = SHOTS.slice(1).filter((s) => XFADE[s.id]).map((s) => {
  const vc = toNew(s.a), half = (XFADE[s.id] + 1) / 2;
  return { id: s.id, lo: Math.max(vc - half, toNew(s.a - XPAD)), hi: Math.min(vc + half, toNew(s.a + XPAD)) };
});
/** fix r2 (audit A2 P3 shot 13 -> 14: the gold blob dissolved over the green kiosk and turned olive for ~6 f): a FRONT-LOADED
 *  curve for that dissolve (same 10 f): the street takes over fast (0.22 / 0.40 / 0.56 / 0.69 / 0.79 on the first five
 *  steps), so the gold-over-green mix passes in ~2 f instead of ~4, and the pump room's last glow lingers as a faint ghost */
const XCURVE: Record<number, (t: number) => number> = { 14: (t) => 1 - (1 - t) ** 2.6 };
const layersV = (vf: number, f: number): { id: number; alpha: number }[] => {
  for (const x of XFV) if (vf > x.lo && vf < x.hi) {
    const t = (vf - x.lo) / (x.hi - x.lo);
    return [{ id: x.id - 1, alpha: 1 }, { id: x.id, alpha: XCURVE[x.id] ? XCURVE[x.id](t) : t }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** the dissolve layers of video frame vf (picture time f) (QA: only one of them, opaque) */
const pickLayers = (vf: number, f: number, which: PostToggles["layer"]) => {
  const ls = layersV(vf, f);
  if (!which) return ls;
  const l = which === "base" ? ls[0] : ls[ls.length - 1];
  return [{ id: l.id, alpha: 1 }];
};

// ---------------- glow dissolves + impact shakes (compositing, on the VIDEO clock) ----------------
// A glow dissolve (bible 3.3): over the blended pair (a CSS filter on the group of both canvases, never on the captions)
// a bell (sin(pi alpha)) lifts brightness and saturation, and a soft coloured light blooms through it. The pivot on
// "You see," (into the warm kitchen, shot 11) is one; the rest of the film is untouched.
type Glow = { lift: number; sat: number; warm: number; col: string; at: [number, number]; r: number };
const GLOW_DIS: Record<number, Glow> = {
  11: { lift: 0.1, sat: 0.6, warm: 0.16, col: "255,214,150", at: [0.5, 0.45], r: 1.0 },
};
const glowAt = (vf: number): { g: Glow; b: number; lo: number } | null => {
  for (const x of XFV) if (GLOW_DIS[x.id] && vf > x.lo + 0.5 && vf < x.hi - 0.5) return { g: GLOW_DIS[x.id], b: Math.sin((Math.PI * (vf - x.lo - 0.5)) / (x.hi - x.lo - 1)), lo: x.lo };
  return null;
};
/** fixed hash 0..1 (no Math.random) */
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** comic impact shakes of one layer (video frame v, amplitude px @1080, n frames, vertical bias). The story.ts KICKS carry
 *  the stamp and the crash's sideways kick (from crashed + 1); fix r2 (audit A2 ADD shot 8) adds a 2.5 px, 6 f VERTICAL
 *  thud on the THOOM itself ("crashed", the chalk line's dive): the floor jolts, the board stays readable */
const SHAKES: { id: number; v: number; A: number; n: number; vy: number }[] = [{ id: 8, v: Math.round(V(BEAT.crashed1)), A: 2.5, n: 6, vy: 2.2 }];
const shakeAt = (id: number, vf: number): string => {
  for (const S of SHAKES) {
    const n = Math.round(vf) - S.v;
    if (id !== S.id || n < 0 || n >= S.n) continue;
    const A = S.A * (1 - n / S.n) ** 1.1, dx = (A / Math.sqrt(S.vy)) * (2 * hsh(n * 1.7 + 0.3 + S.id) - 1), dy = A * Math.sqrt(S.vy) * (n % 2 ? -1 : 1) * (0.6 + 0.4 * hsh(n * 2.9 + 5.1 + S.id));
    // (fix r2: the cover-scale follows the amplitude, so the shake never pops a fixed 1.2 % zoom on and off)
    return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${(1 + (1.15 * A * Math.max(1, Math.sqrt(S.vy))) / 960).toFixed(5)})`;
  }
  return "none";
};

// ---------------- raindrops on the lens (fix r2, audit A2 ADD shot 9) ----------------
// Three soft drops sit on the lens through the storm and, one after another on the story's beats, slide down 30-40 f
// (a stick-slip run: a slow creep, the run, easing to a stop) leaving a fading wet trail. Each is a CSS backdrop blur of its
// own layer (an out-of-focus water lens) with a cool rim and a small specular glint. Placed clear of the faces, the boards
// and the caption band (y 1280-1440 @1080): the top-left corner over the tank roof, the left edge beside "No. 7", the wet
// ground at lower right. Pure function of the video frame; they fade with their layer in its dissolves.
type LensDrop = { x: number; y0: number; y1: number; r: number; t0: number; dur: number; ph: number };
const DROPS: Record<number, LensDrop[]> = {
  9: [
    { x: 0.085, y0: 0.03, y1: 0.118, r: 30, t0: V(BEAT.bust) + 12, dur: 34, ph: 0.3 },
    { x: 0.055, y0: 0.35, y1: 0.44, r: 23, t0: V(BEAT.lenders) - 2, dur: 38, ph: 1.7 },
    { x: 0.81, y0: 0.78, y1: 0.895, r: 34, t0: V(BEAT.checked) - 12, dur: 32, ph: 2.9 },
    // two tiny beads that never move (a lens out in the rain is never clean)
    { x: 0.93, y0: 0.06, y1: 0.06, r: 11, t0: 1e9, dur: 1, ph: 0 },
    { x: 0.16, y0: 0.86, y1: 0.86, r: 13, t0: 1e9, dur: 1, ph: 0 },
  ],
};
/** stick-slip slide 0..1: a slow 30 % creep, then the run, easing to a stop */
const slideAt = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.3 ? 0.12 * smooth(u / 0.3) : 0.12 + 0.88 * smooth((u - 0.3) / 0.7));
const LensDrops: React.FC<{ id: number; vf: number }> = ({ id, vf }) => {
  const ds = DROPS[id];
  if (!ds) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {ds.map((d, i) => {
        const u = (vf - d.t0) / d.dur, k = slideAt(u), run = smooth(u * 4) * (1 - smooth((u - 0.85) / 0.15));
        const yTop = d.y0 * 1920, y = (d.y0 + (d.y1 - d.y0) * k) * 1920;
        const x = d.x * 1080 + 1.6 * Math.sin(d.ph + 0.21 * (y - yTop)) * smooth(u * 3);
        // the drop stretches a little while it runs (narrower, taller) and rounds up again when it stops
        const w = 2 * d.r * (1 - 0.1 * run), h = 2 * d.r * (1.08 + 0.18 * run);
        const trail = Math.max(0, y - yTop - 0.4 * d.r), tk = u <= 0 ? 0 : 1 - smooth((vf - d.t0 - d.dur) / 44);
        const bf = `blur(${(d.r > 15 ? 6.5 : 3.5).toFixed(1)}px) brightness(1.14) saturate(0.8)`, bt = "blur(2px) brightness(1.07)";
        return (
          <React.Fragment key={i}>
            {trail > 2 && tk > 0.01 ? <div style={{ position: "absolute", left: x - 0.22 * d.r, top: yTop, width: 0.44 * d.r, height: trail, borderRadius: 0.22 * d.r,
              backdropFilter: bt, WebkitBackdropFilter: bt, opacity: 0.85 * tk }} /> : null}
            <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: "50% 50% 47% 47% / 46% 46% 54% 54%",
              backdropFilter: bf, WebkitBackdropFilter: bf, border: "1px solid rgba(16,24,66,0.28)",
              // a water lens: a dark upper rim, a bright refracted crescent at the bottom, a soft shadow on the glass
              boxShadow: "inset 0 3px 4px rgba(12,18,52,0.4), inset 0 -4px 6px rgba(210,226,255,0.45), 0 1.5px 2.5px rgba(10,14,40,0.25)" }}>
              <div style={{ position: "absolute", left: "20%", top: "14%", width: "32%", height: "22%", borderRadius: "50%",
                background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)" }} />
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- a rain streak lit by the far flash (fix r3, audit A3 ADD shot 9) ----------------
// "A faint diagonal rain-streak run down one lens edge during the 1488 flash only, 6 f": on the far flash before 'checked'
// (FLASHES[2], the same video frame) a water run on the glass at the RIGHT edge (over the tanker / tank wall, clear of the
// lenders, the BANKRUPT plate and the caption band) catches the light: its bright head runs down ~0.27 H in 6 f, a
// fading cool-white trail behind it, then it is dark glass again. Pure function of the video frame.
const STREAK9 = { x0: 1040, y0: 470, x1: 996, y1: 980, op: [0.8, 1, 0.78, 0.52, 0.3, 0.12] };
const RainStreak: React.FC<{ id: number; vf: number }> = ({ id, vf }) => {
  if (id !== 9) return null;
  const n = Math.round(vf) - Math.round(V(BEAT.checked - 8));
  if (n < 0 || n > 5) return null;
  const S = STREAK9, u = smooth((n + 1.5) / 6.5), hx = S.x0 + (S.x1 - S.x0) * u, hy = S.y0 + (S.y1 - S.y0) * u;
  const len = Math.hypot(hx - S.x0, hy - S.y0), ang = (Math.atan2(S.x0 - hx, hy - S.y0) * 180) / Math.PI, o = S.op[n];
  const g = (w: number, a: number, blur: number) => (
    <div style={{ position: "absolute", left: S.x0 - w / 2, top: S.y0, width: w, height: len, transformOrigin: "50% 0%", transform: `rotate(${ang.toFixed(3)}deg)`,
      borderRadius: w / 2, filter: blur > 0 ? `blur(${blur}px)` : undefined, opacity: o,
      background: `linear-gradient(to bottom, rgba(214,228,255,0) 0%, rgba(214,228,255,${(0.35 * a).toFixed(3)}) 55%, rgba(236,244,255,${a.toFixed(3)}) 96%, rgba(236,244,255,0) 100%)` }} />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {g(16, 0.36, 4)}{g(4, 0.8, 0.6)}
    </AbsoluteFill>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number; f: number; vf: number; rate: number }> = ({ id, kit, alpha, f, vf, rate }) => (
  <AbsoluteFill style={{ opacity: alpha, transform: shakeAt(id, vf) }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.1, far: 1500 }}>
      <Inner id={id} kit={kit} f={f} vf={vf} rate={rate} />
    </ThreeCanvas>
    <LensDrops id={id} vf={vf} />
    <RainStreak id={id} vf={vf} />
  </AbsoluteFill>
);

export const SaladOilShort: React.FC = () => {
  const on = useMemo(toggles, []);
  const cf = useCurrentFrame();
  const vf = on.frames && on.frames.length ? on.frames[Math.min(cf, on.frames.length - 1)] : cf; // video frame (voice clock)
  const W = (v: number) => WARP[Math.max(0, Math.min(WARP.length - 1, Math.round(v)))];
  const f = W(vf);                                                                                    // picture clock (identity today)
  // picture frames per video frame here (motion blur on the real on-screen speed)
  const rate = Math.max(0.05, (W(vf + 1) - W(vf - 1)) / (vf > 0 && vf < WARP.length - 1 ? 2 : 1));
  const kit = useKit();
  if (!kit) return null;
  const gl = on.world && !on.layer ? glowAt(vf) : null, b = gl ? gl.b : 0;
  const filter = gl ? `brightness(${(1 + gl.g.lift * b).toFixed(4)}) saturate(${(1 + gl.g.sat * b * b).toFixed(4)})` : "none";
  return (
    <AbsoluteFill style={{ background: on.world ? "#bcd3ee" : "#b9a58c" }}>
      <AbsoluteFill style={{ filter }}>
        {on.world ? pickLayers(vf, f, on.layer).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} f={f} vf={vf} rate={rate} />) : null}
        {gl ? <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: gl.g.warm * b,
          background: `radial-gradient(ellipse ${gl.g.r * 100}% ${gl.g.r * 70}% at ${gl.g.at[0] * 100}% ${gl.g.at[1] * 100}%, rgba(${gl.g.col},1) 0%, rgba(${gl.g.col},0.55) 45%, rgba(${gl.g.col},0) 100%)` }} /> : null}
      </AbsoluteFill>
      {on.captions ? <Captions frame={vf} /> : null}
    </AbsoluteFill>
  );
};
void lightAt; void FPS;

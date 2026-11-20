// "The Typo That Sold More Shares Than Existed": flat cartoon characters in a painted 3D world (owner POST).
// One three.js world (world.ts) posed per frame from the timeline (story.ts). Post chain per canvas (the saladoil engine):
//   InkPass (world ink + coloured contact shadows) -> Atmos -> lens blur pre + main (thin-lens DOF from dofAt) -> camera
//   motion blur (fast moves only) -> bloom (per-light key, look_*.ts) -> lens glows (practical bulbs) -> NEUTRAL tone
//   mapping -> colour grade (per light state, look_*.ts) -> grain (off). MSAA 4. Every shot change is a cross-dissolve on the
//   VIDEO clock (story.ts XFADE); each layer is its own canvas with its own World and post settings.
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
import { type LightName, type V3 } from "./plan";
import type { BloomLook } from "./lightbase";
import * as LT from "./look_trading";
import * as LK from "./look_tokyo";
import * as LH from "./look_homes";
import * as LL from "./look_hall";
import { Captions } from "./Captions";
import { HookTitle } from "./HookTitle";

// the video is as long as the final narration + the loop tail (voicewarp.ts VOICE_TOTAL = story.ts TOTAL)
export const TYPO_FRAMES = VOICE_TOTAL;

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

// ---------------- bloom per light (bible 6.4: emissives only; the owners' look_*.ts BLOOM tables) ----------------
// th = key threshold (linear HDR), maxK = how much the key follows the max channel instead of luminance, i = strength.
const BLOOM = Object.assign({}, LT.BLOOM, LK.BLOOM, LH.BLOOM, LL.BLOOM) as Record<LightName, BloomLook>;
/** a one-shot pulse: 0 before t0, up over `up` f, back down with an e-fold of `fall` f */
const pulseAt = (f: number, t0: number, up: number, fall: number) => { const t = f - t0; return t < 0 ? 0 : Math.min(1, t / up) * Math.exp(-Math.max(0, t - up) / fall); };
/** beat pulses on the bloom strength: the ENTER key's glow swells as it is pressed on "typo" (shot 1) */
const bloomPulse = (id: number, f: number) => (id === 1 ? 1 + 0.35 * pulseAt(f, BEAT.typo, 3, 18) : 1);
/** no hue-keyed gold bloom in this film (lensblur.ts brightPass: null = off) */
const goldKeyAt = (_id: number, _f: number, _cam: THREE.PerspectiveCamera, _vf = 0): GoldKey | null => null;
const bloomRadius = (_id: number) => 0.6;

// ---------------- flashes (none in this film; the grade's flash hooks stay at 0) ----------------
const FLASH_COL: [number, number, number] = [0.875, 0.902, 1.0];
const GROUND_COL: [number, number, number] = [0.81, 0.88, 1.0];
const groundAt = (_id: number, _vf: number): number => 0;
const flashAt = (_id: number, _vf: number): [number, number] => [0, 0];

// ---------------- dust motes in the light (grade.ts motes(), display space, video clock) ----------------
type Motes = { k: number; n: number; size: number; region: [number, number, number, number]; col: [number, number, number] };
/** soft specks in the museum spotlight (shots 4 / 7) and the hall's sunny air (shot 11); never in the loop shots */
const motesAt = (id: number, _f: number): Motes | null => {
  if (id === 4 || id === 7) return { k: 0.32, n: 18, size: 1.3, region: [0.15, 0.1, 0.85, 0.9], col: [1.0, 0.92, 0.76] };
  if (id === 11) return { k: 0.3, n: 20, size: 1.25, region: [0.02, 0.3, 0.98, 0.97], col: [1.0, 0.92, 0.76] };
  return null;
};

// ---------------- per-frame grade adjustments (grade.ts GradeEffect.adjust, called on EVERY frame) ----------------
const gradeAdjust = (_id: number, _f: number, _vf: number, _cam: THREE.PerspectiveCamera): [number, number, number, [number, number] | null, number] => [0, 0, 0, null, 0];
const lampFlicker = (_id: number, _vf: number) => 1;

// ---------------- focus-jump smoothing (a focus point that jumps > 0.6 m between frames is eased over a window) ----------------
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
type ShotPost = { dehaze?: [number, number, number, number]; dehazeFar?: [number, number]; haze?: [number, number, number];
  hazeCol?: [number, number, number]; skySat?: number; skyDeep?: [number, number, number]; paper?: number; shimmer?: [number, number, number, number] };
/** the street (shot 2): the far towers a little less milky, a richer winter sky */
const SHOT_POST: Record<number, ShotPost> = { 2: { dehaze: [0.2, 40, 220, 0.8], dehazeFar: [300, 600], skySat: 1.05 } };
const GRAIN: Record<number, { a: number; gate: [number, number] }> = {};

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
/** screen uv.y of the horizon straight ahead */
const horizonY = (cam: THREE.PerspectiveCamera) => {
  cam.getWorldDirection(tw); tw.y = 0; if (tw.lengthSq() < 1e-6) tw.set(0, 0, -1); tw.normalize();
  const p = project(cam, cam.position.clone().addScaledVector(tw, 1000));
  return p.uv[1];
};
/** px @1080 of a world length L seen at distance d */
const pxOf = (cam: THREE.PerspectiveCamera, L: number, d: number) => (L / Math.max(d, 0.05)) * cam.projectionMatrix.elements[5] * 960;

// ---------------- lens glows per shot (LensFxEffect) ----------------
// PRACTICAL BULBS: every small visible emissive (MeshBasic colour > 1.4 in a channel, radius < 0.3 m: desk lamps, the
// glowing ENTER key, alarm lights, the museum spot ...) gets a soft halo, or a bokeh disc when the lens blur dissolves it.
// Found by a scan, so the set owners can move or add them.
const bulbSph = new THREE.Sphere();
const SCAN_TH: Partial<Record<LightName, number>> = {};
const lensSources = (id: number, _f: number, _vf: number, cam: THREE.PerspectiveCamera, root: THREE.Object3D, focus: number, cInf: number): LensSrc[] => {
  const out: LensSrc[] = [];
  const s = SHOTS[id - 1];
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
const godRays = (_id: number, _f: number, _cam: THREE.PerspectiveCamera): GodRays | null => null;

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("typo kit"));
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
      grade: new GradeEffect(GRADES.desk_am, 1),
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
const XCURVE: Record<number, (t: number) => number> = {};
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
const SHAKES: { id: number; v: number; A: number; n: number; vy: number }[] = [];
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
const DROPS: Record<number, LensDrop[]> = {};
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
const RainStreak: React.FC<{ id: number; vf: number }> = () => null;

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

export const TypoShort: React.FC = () => {
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
      {/* hook title removed (user, 2026-11-15) */}
      {on.captions ? <Captions frame={vf} /> : null}
    </AbsoluteFill>
  );
};
void lightAt; void FPS;

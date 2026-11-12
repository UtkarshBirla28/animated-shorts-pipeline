// The cast of "The Anti-Theft Sign That Made People Steal" as lit flat cards in the 3D world, plus their effect cards.
// Each frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, lavender far side toward the sun,
// pale key-side rim); standing ones get a soft multiply contact blob + (outdoors) a sun-aligned shadow tail. Effects are
// unlit cards. Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
//
// LIFE (BUILD_PLAN QUALITY BAR v2 + audit A1): every visible character breathes (~0.25 Hz, 1.5 %), sways (1.5-2 deg,
// ~0.3 Hz, own phase), shifts its weight every ~1.5 s (one knee bends), bobs its head, blinks every 1.2-3.8 s (+ one
// across each swap); outdoors hat brims, ribbons, hair, hems and camera straps move with the WORLD's loop-safe wind
// (sets_ext windAt). Gaze follows the beat (sign lines in saccades, partner, chip, counter, stamp); expressions swap in
// 1 f, 0-3 f before the word, held >= 6 f; actions get 2-4 f anticipation and a small overshoot.
// Shot 1 frame 0 == shot 16 last frame: the woman, the raven, the lizard and the background walkers are posed from a
// loop clock tau (tau = 0 on both); her gaze holds one fixation for the 9 frames either side of the seam.
import * as THREE from "three";
import {
  Pen, drawPerson, drawRaven, handAt, headAt, rig, fxShadow, fxSquiggle, fxContact, fxBubbleClip, fxBubbleCheat, fxGlint, fxSweat, fxTag, fxChipTag, fxChip, fxTagFlap, fxTailDot, fxStopwatch, fxQuestion, fxSoftBlob,
  fxChalkMan, fxChalkWeed, fxFlyRaven, fxFlash, fxTally, fxNote, fxPuff, fxBreath, fxBang, fxFeather, fxLizard, tintCard, tintFit, mix as mixHex,
  Outfit, PersonOpts, Expr, Hand, P2, RavenOpts, FaceX, swapPath, PanelPose, SWAP_T, SWAP_LEAN, fxRabbit, fxHandScoop, fxHandChip,
  WOMAN_FIT, FIANCE_FIT, PROF_FIT, ASST1_FIT, ASST2_FIT, ASST3_FIT, RANGER_FIT, TEACHER_FIT, STUDENT_FIT, BP_FIT, tourist, pupil,
} from "./toon";
import { FPS, SHOTS, BEAT, TOTAL, clamp01, smooth, easeOut, camAt, PW, PV } from "./story";
import type { LightState } from "./lights";
import { TH, TT, VISTA, CL, SR, BP, add, V3 } from "./plan";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, cardU, setCardMode } from "./cardshade";
import { VOICE_TOTAL, toNew } from "./voicewarp";
import { chalkTip } from "./sets_int";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        g.globalCompositeOperation = "source-over"; g.filter = "none"; g.globalAlpha = 1;
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows, casts its silhouette when world.ts says so */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() {
    const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; }
    // per-card light mode from the draw key (|LXbd: b = backlit, d = lamp duotone), so dissolving shots never share it
    const m = this.r?.key.match(/\|LX(\d)(\d)(\d)(\d)?/), U = cardU(this.mat);
    U.uBack.value = m ? +m[1] : 0; U.uDuo.value = m ? +m[2] : 0; U.uFlat.value = m ? +m[3] : 0;
    setCardMode(U, m && m[4] ? +m[4] : 0); // A4: per-light card grade (morning / dusk / sunset / blueprint)
  }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (glints) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = this.mesh.material === this.soft ? 2 : 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; yaw?: number };
/** sun = world direction TOWARD the sun (world.ts passes it) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const TAU = Math.PI * 2;
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 1.7 ? [2400, 4000, 4.0] : d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps */
const light2D = (cam: CamInfo) => {
  const sx = SUN.dot(cam.right), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- ground shadows ----------------
/** ground FX height: above the paving ribbons (0.03-0.036) and the sand drifts (<= 0.041) so blobs are never buried */
const GY = 0.05;
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.15, 0.16, 0.29], golden: [0.24, 0.19, 0.38] }; // A5: a firmer noon contact (lavender)
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
let EXT = false, LOW = 0, BLOBC: [number, number, number] = [0.6, 0.58, 0.66], LX = "000";
/** low-sun silhouette tail (A2: #5A4A8A at ~40 % multiply, linear) */
const LOWTAIL: [number, number, number] = [0.5, 0.46, 0.64];
const CAMR = new THREE.Vector3(1, 0, 0);
/** contact ellipse under the feet (aligned to the lens) + outdoors a soft silhouette tail along the sun azimuth
 *  (stretched long in low sun so it lines up with the post shadows) */
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1, wide = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  const el = Math.asin(clamp(SUN.y, 0.05, 0.99));
  if (EXT) {
    // LOW (0..1) blends the noon tail into the long scene-shade tail of low sun, so a relight never pops
    const len = clamp(1.6 / Math.tan(el), 0.5, 2.4 + 0.6 * LOW) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tcol = TAIL.map((v, j) => v + (Math.min(BLOBC[j], LOWTAIL[j]) - v) * LOW) as [number, number, number];
    const tc = hexOf(tcol, (1 - 0.05 * LOW) * k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + GY - 0.004, z: z + oz * c,
      w: (0.72 - 0.1 * LOW) * sc * wide, h, flat: true, rot });
  }
  const cc = LX[2] === "1" ? hexOf([0.004, 0.013, 0.067], 0.38 * k) : hexOf(CONTACT[LNAME], k); // A6 P3: a navy contact blob on the blueprint paper (35-40 %)
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + GY, z,
    w: 0.78 * sc * wide, h: 0.36 * sc * wide, flat: true, rot: Math.atan2(-CAMR.z, CAMR.x) });
};

/** A6 P2 (shot 7: the posts cast 2-3 m lavender shadows, the cards only a blob): a long soft silhouette shadow along the
 *  world sun heading (multiply #61719D at ~35 %), `len` metres, lifted 2 cm so the terrain never buries it */
const longShadow = (out: Stage, x: number, z: number, len: number, wid: number, k = 0.35) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz), c = 0.42 * len;
  const tc = hexOf([0.121, 0.165, 0.337], k);
  out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: GY + 0.016, z: z + oz * c, w: wid, h: len, flat: true, rot });
};
// ---------------- life helpers ----------------
/** A5 P1: idle life runs on the VIDEO clock (the narration frame), never on the warped picture clock, so the voice
 *  time-map can not stretch a blink to 10 f or freeze a hold. vt() maps a picture frame (or the hook's loop clock tau,
 *  negative in shot 16) to its video frame: vt(current f) == VF, vt(tau) == 0 on frame 0 AND on the last frame (the loop
 *  seam is exact for everything posed from tau). Story actions, expression swaps and gestures stay on the picture clock. */
const vt = (x: number) => (x >= 0 ? toNew(x) : toNew(x + TOTAL - 1) - (VOICE_TOTAL - 1));
/** a frequency (Hz) rounded to a whole number of cycles over the film's VIDEO length (loop seam rule) */
const hz = (v: number) => (Math.max(1, Math.round((v * VOICE_TOTAL) / FPS)) * FPS) / VOICE_TOTAL;
const HZ = { b: hz(0.25), s1: hz(0.3), s2: hz(0.73), h1: hz(0.2), h2: hz(0.55), sh: hz(1 / 3), f1: hz(1.15), f2: hz(1.9) };
const LID = [0.5, 1, 1, 0.5];
/** no hashed (random) blink in the first / last 6 video frames: the loop seam frames stay identical */
const seamQuiet = () => VF < 6 || VF > VOICE_TOTAL - 7;
/** eyelid 0 open .. 1 shut: a 4-VIDEO-frame blink every 1.2-3.8 s (seeded, works for negative frames) + one across each
 *  swap (the swap frame is converted to its video frame, so the blink lasts 4 video frames whatever the warp) */
const blinkAt = (f: number, i: number, swaps: number[] = [], quiet: number[] = []) => {
  const v = vt(f);
  for (const s of swaps) { const k = v - vt(s) + 1; if (k >= 0 && k < 4) return LID[Math.floor(k)]; }
  for (const q0 of quiet) { const vq = vt(q0); if (v >= vq - 1 && v < vq + 8) return 0; } // a shock pops with the eyes OPEN: no random blink for 8 f
  if (seamQuiet()) return 0;
  const P = 75, n0 = Math.floor(v / P);
  for (let n = n0 - 1; n <= n0 + 1; n++) {
    const st = n * P + Math.round((hh(i * 13 + n * 7, 5) - 0.5) * 40);
    const k = v - st; if (k >= 0 && k < 4) return LID[Math.floor(k)];
  }
  return 0;
};
/** blinks only at listed (picture / loop-clock) frames, each 4 VIDEO frames long (loop-critical characters) */
const blinkList = (f: number, list: number[]) => { const v = vt(f); for (const s of list) { const k = v - vt(s); if (k >= 0 && k < 4) return LID[Math.floor(k)]; } return 0; };
/** idle life on the video clock: breathing (-1..1), weight-shift sway (deg), head bob (deg), weight shift (-1..1, sides
 *  every ~1.5 s); every term makes whole cycles over the film */
const life = (f: number, i: number) => {
  const t = vt(f) / FPS, ph = (k: number) => TAU * hh(i, k);
  return {
    breath: Math.sin(TAU * HZ.b * t + ph(1)),
    sway: 1.4 * Math.sin(TAU * HZ.s1 * t + ph(2)) + 0.5 * Math.sin(TAU * HZ.s2 * t + ph(3)),
    head: 1.6 * Math.sin(TAU * HZ.h1 * t + ph(4)) + 0.7 * Math.sin(TAU * HZ.h2 * t + ph(5)),
    shift: clamp(2.2 * Math.sin(TAU * HZ.sh * t + ph(6)), -1, 1),
  };
};
/** the shared wind on the VIDEO clock: the same gust x travelling-wave shape as sets_ext windAt (5 / 13 / 19 / 41 whole
 *  cycles), counted over VOICE_TOTAL video frames (WORLD-EXT: use the same constants on ctx.vf to stay in phase) */
const cycV = (n: number, v: number, ph = 0) => Math.sin((TAU * n * v) / VOICE_TOTAL + ph);
const windV = (x: number, z: number, v: number) => {
  const gust = 0.62 + 0.24 * cycV(5, v, 0.7) + 0.14 * cycV(13, v, 2.1);
  const wave = 0.55 + 0.45 * Math.sin((TAU * 19 * v) / VOICE_TOTAL - 0.21 * x - 0.13 * z);
  return clamp01(gust * wave + 0.08 * cycV(41, v, x * 0.9 + z * 0.4));
};
/** the wind (0..1) mapped to a signed flutter -1..1 for cards; f = picture frame or the hook's loop clock */
const wnd = (f: number, x: number, z: number) => clamp((windV(x, z, vt(f)) - 0.45) * 2.2, -1, 1);
/** fast secondary flutter (-1..1) for brims, ribbons, hems and straps: two beating waves, stronger on the gusts; on the
 *  video clock (the hook passes its loop clock), own phase per character */
const flutAt = (f: number, i: number, x = 0, z = 0) => {
  const t = vt(f) / FPS, g = 0.45 + 0.55 * Math.abs(wnd(f, x, z));
  return clamp((0.6 * Math.sin(TAU * HZ.f1 * t + hh(i, 41) * TAU) + 0.4 * Math.sin(TAU * HZ.f2 * t + hh(i, 42) * TAU)) * g, -1, 1);
};
/** outdoor wind (-1..1) at a place (kept for other modules; = the world's vegetation wind) */
export const windAt = (f: number, x: number, z: number) => wnd(f, x, z);
type K<T> = [number, T];
const at = <T,>(f: number, keys: K<T>[]): T => { let v = keys[0][1]; for (const [k, x] of keys) if (f >= k) v = x; return v; };
/** A7 (user: "the movement is too fast"; the voice warp squeezes the picture clock up to 1.6x): story actions keyed
 *  on the VIDEO clock. dvf(f, f0) = video frames from picture beat f0 to picture frame f; atV = `at` with the keys
 *  in video frames after picture beat f0 */
const dvf = (f: number, f0: number) => vt(f) - vt(f0);
const atV = <T,>(f: number, f0: number, keys: K<T>[]): T => at(dvf(f, f0), keys);
/** the picture frame that is `d` video frames after picture beat f0 (for blink lists / swaps keyed in video frames) */
const pAt = (f0: number, d: number) => PV(vt(f0) + d);
/** smooth 0 -> 1 over d VIDEO frames from video frame v0 (u = the current video frame) */
const rampV = (u: number, v0: number, d: number) => smooth((u - v0) / d);
const bumpV = (u: number, v0: number, d: number) => bump(u, v0, d);
const swapsOf = (keys: K<unknown>[]) => keys.slice(1).map((k) => k[0]);
const backOut = (x: number) => { const u = clamp01(x) - 1, c = 1.9; return 1 + (c + 1) * u * u * u + c * u * u; };
/** 0 before f0, then an eased rise to 1 over d frames with a small overshoot */
const settle = (f: number, f0: number, d: number) => (f < f0 ? 0 : backOut((f - f0) / d));
const ramp = (f: number, f0: number, d: number) => smooth((f - f0) / d);
/** 0 -> 1 -> 0 bump over [f0, f0 + d] */
const bump = (f: number, f0: number, d: number) => (f < f0 || f > f0 + d ? 0 : Math.sin((Math.PI * (f - f0)) / d));
/** a hand moving through targets: at frame f_i it starts blending to target_i over d_i frames */
type Step = [number, Hand["a"], number];
const seq = (f: number, steps: Step[], extra: Partial<Hand> = {}): Hand => {
  let a = steps[0][1], b = steps[0][1], k = 1;
  for (let n = 1; n < steps.length; n++) {
    const [f0, t, d] = steps[n];
    if (f < f0) break;
    a = b; b = t; k = smooth((f - f0) / d);
    if (k >= 1) a = b;
  }
  return { a, b, k, ...extra };
};
/** how low a hand following `seq` is (1 = at the ground target) */
const lowOf = (h: Hand) => (h.a === "ground" ? 1 - (h.k ?? 0) : 0) + (h.b === "ground" ? h.k ?? 0 : 0);
/** reading saccades: the eyes step across a line in 4 fixations (5 f each), then snap back (2 f) */
const scan = (f: number, period = 22) => { const m = mod(vt(f), period); return m >= period - 2 ? -0.6 : -0.9 + Math.min(3, Math.floor(m / 5)) * 0.6; };
/** the hook's loop-safe reading gaze [look, lookY]: the pupils sit at the TOP of the eye (the board is above and
 *  behind her), one fixation held for |tau| <= 2 across the seam, then saccades of 5-7 f along each line */
const readGaze = (tau: number): [number, number] => {
  // A3: the pupils sit ~4 px (full res) higher than round 2: the reading look points at the board above her
  // A5: on the VIDEO loop clock (v = 0 on frame 0 and on the last frame) with 2x wider saccades (-0.9 .. +0.9)
  // A6 P3 (the loop frame read as a stare at the lens): the seam fixation sits higher on board line 2 (pupils at the top
  // of the eye) and holds |v| <= 5, so the first saccade lands on video frame 6 of shot 1 (frame 0 == the last frame)
  const v = vt(tau);
  if (Math.abs(v) <= 5) return [-0.45, -1.75]; // A7 P3: higher on the face (dot eyes read 'up at the board' only by their place)
  const P = 23, m = mod(v - 6, P), k = m < 6 ? 0 : m < 11 ? 1 : m < 17 ? 2 : 3, line = mod(Math.floor((v - 6) / P), 3);
  return [m >= P - 2 ? -0.45 : -0.9 + 0.6 * k, [-1.75, -1.6, -1.45][line]];
};

// ---------------- card <-> world ----------------
/** the card's local +x axis in world xz (cards are yaw billboards toward the camera) */
const axisX = (cam: CamInfo, p: V3): [number, number] => { const dx = cam.pos.x - p[0], dz = cam.pos.z - p[2], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };
const toward = (cam: CamInfo, p: V3): [number, number] => { const dx = cam.pos.x - p[0], dz = cam.pos.z - p[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
/** design point of a card at p (scale sc) -> world point, pushed `fwd` metres toward the camera */
const toWorld = (cam: CamInfo, p: V3, sc: number, d: P2, fwd = 0): V3 => {
  const [ax, az] = axisX(cam, p), [tx, tz] = toward(cam, p), lx = (d[0] - 300) * SU * sc;
  return [p[0] + ax * lx + tx * fwd, p[1] + (975 - d[1]) * SU * sc, p[2] + az * lx + tz * fwd];
};
/** world point -> design point on the card at p */
const toDesign = (cam: CamInfo, p: V3, sc: number, w: V3): P2 => {
  const [ax, az] = axisX(cam, p), lx = (w[0] - p[0]) * ax + (w[2] - p[2]) * az;
  return [300 + lx / (SU * sc), 975 - (w[1] - p[1]) / (SU * sc)];
};
/** world point -> the design point that LOOKS like it on screen (projected along the view ray onto the card plane) */
const toDesignRay = (cam: CamInfo, p: V3, sc: number, w: V3): P2 => {
  const [tx, tz] = toward(cam, p), c = cam.pos;
  const dn = (w[0] - c.x) * tx + (w[2] - c.z) * tz, pn = (p[0] - c.x) * tx + (p[2] - c.z) * tz;
  const t = Math.abs(dn) > 1e-4 ? pn / dn : 1;
  return toDesign(cam, p, sc, [c.x + (w[0] - c.x) * t, c.y + (w[1] - c.y) * t, c.z + (w[2] - c.z) * t]);
};
/** A5: the shot camera's basis (story camAt = the camera world.ts renders with) for screen-anchored effect cards */
type Basis = { pos: THREE.Vector3; fw: THREE.Vector3; rt: THREE.Vector3; up: THREE.Vector3; th: number };
const ASPECT = 1080 / 1920;
const basisOf = (id: number, f: number): Basis => {
  const c = camAt(id, f), pos = new THREE.Vector3(...c.pos), fw = new THREE.Vector3(...c.look).sub(pos).normalize();
  const rt0 = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize(), up0 = new THREE.Vector3().crossVectors(rt0, fw);
  const cr = Math.cos(c.roll ?? 0), sn = Math.sin(c.roll ?? 0);
  return { pos, fw, rt: rt0.clone().multiplyScalar(cr).addScaledVector(up0, sn), up: up0.clone().multiplyScalar(cr).addScaledVector(rt0, -sn), th: Math.tan((c.fov * Math.PI) / 360) };
};
/** world point -> screen [x, y] (0..1, top-left origin) and its depth along the view axis */
const toScr = (B: Basis, w: V3): [number, number, number] => {
  const v = new THREE.Vector3(...w).sub(B.pos), z = v.dot(B.fw);
  return [0.5 + (0.5 * v.dot(B.rt)) / (z * B.th * ASPECT), 0.5 - (0.5 * v.dot(B.up)) / (z * B.th), z];
};
/** screen [x, y] (0..1) at depth d -> world point */
const fromScr = (B: Basis, sx: number, sy: number, d: number): V3 => {
  const nx = (2 * sx - 1) * B.th * ASPECT * d, ny = (1 - 2 * sy) * B.th * d;
  return [B.pos.x + B.fw.x * d + B.rt.x * nx + B.up.x * ny, B.pos.y + B.fw.y * d + B.rt.y * nx + B.up.y * ny, B.pos.z + B.fw.z * d + B.rt.z * nx + B.up.z * ny];
};
/** world width of the whole frame at depth d */
const frameW = (B: Basis, d: number) => 2 * B.th * ASPECT * d;
/** -1 / +1: is world point b on the screen-left or screen-right of a? */
const sideOf = (cam: CamInfo, a: V3, b: V3): -1 | 1 => ((b[0] - a[0]) * cam.right.x + (b[2] - a[2]) * cam.right.z < 0 ? -1 : 1);
/** is the camera in front of someone facing direction (dx, dz)? */
const seesFront = (cam: CamInfo, p: V3, dx: number, dz: number) => (cam.pos.x - p[0]) * dx + (cam.pos.z - p[2]) * dz > 0;

// ---------------- people ----------------
type Act = { i: number; o: Outfit; key: string };
const A = {
  woman: { i: 1, o: WOMAN_FIT, key: "woman" }, fiance: { i: 2, o: FIANCE_FIT, key: "fiance" }, prof: { i: 3, o: PROF_FIT, key: "prof" },
  asst1: { i: 4, o: ASST1_FIT, key: "asst1" }, asst2: { i: 5, o: { ...ASST2_FIT, pencil: true }, key: "asst2" },
  asst3: { i: 6, o: ASST3_FIT, key: "asst3" },
  ranger: { i: 7, o: RANGER_FIT, key: "ranger" }, teacher: { i: 8, o: TEACHER_FIT, key: "teacher" }, student: { i: 9, o: STUDENT_FIT, key: "student" },
  bp: { i: 10, o: BP_FIT, key: "bp" }, hiker: { i: 11, o: { ...tourist(7), shirt: "#c8523a", print: null, backpack: "#4a6a8a", hat: "cap", hatCol: "#3e5a7a", fanny: undefined }, key: "hiker" },
} satisfies Record<string, Act>;
const TOUR = (v: number, o: Partial<Outfit> = {}, tag = ""): Act => ({ i: 20 + v, o: { ...tourist(v), ...o }, key: `tour${v}${tag}` });
const PUP = (v: number): Act => ({ i: 40 + v, o: pupil(v), key: `pup${v}` });
/** head-shape seed per character (constant, so the loop frame matches) */
const seedOf = (i: number) => ((i * 5 + 3) % 9) + 1;

/** yawOff (A7): the card turns about its vertical axis by this many radians off the billboard (the "paper spin" of a
 *  real turn: the back drawing narrows to the edge, the front drawing opens out of it with an overshoot) */
type PutX = { scale?: number; noBlob?: boolean; blobK?: number; rise?: number; yawOff?: number };
/** the trailhead plaza curb (sets_ext: x -2.85..2.85, z 1.8..1.95, 6 cm tall): blobs on it ride its top, never buried */
const curbY = (p: V3) => (Math.abs(p[0]) < 2.95 && p[2] > 1.55 && p[2] < 2.2 ? 0.032 : 0);
const put = (out: Stage, cam: CamInfo, a: Act, pos: V3, o: PersonOpts, x: PutX = {}) => {
  const sc = x.scale ?? 1, rise = x.rise ?? 0;
  const d = cam.pos.distanceTo(tmp.set(pos[0], pos[1] + 1.1 * sc, pos[2])) / sc;
  const [w, h, k] = tier(d);
  const opts: PersonOpts = { ...o, light: light2D(cam), seed: seedOf(a.i) };
  out.places.push({ key: `P|${a.key}|${fkey(opts)}|LX${LX}`, x: pos[0], y: pos[1] + rise, z: pos[2], scale: sc, draw: (p) => drawPerson(p, a.o, opts), size: [w, h, k],
    ...(x.yawOff ? { yaw: Math.atan2(cam.pos.x - pos[0], cam.pos.z - pos[2]) + x.yawOff } : {}) });
  if (!x.noBlob) blob(out, pos[0], pos[1] + curbY(pos), pos[2], sc * (1 - clamp(rise * 1.5, 0, 0.4)), x.blobK ?? 1, o.mode === "kneel" || o.mode === "squat" || (o.crouch ?? 0) > 0.5 ? 1.3 : 1);
  return opts;
};
const fx = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, ...extra });
/** standard idle opts for character i at frame f (breath, sway + weight shift, head bob, wind) */
const idle = (f: number, i: number, P?: V3): PersonOpts => {
  const L = life(f, i);
  return { breath: L.breath, tilt: L.sway + 0.8 * L.shift, headTilt: L.head, wind: P ? wnd(f, P[0], P[2]) : 0, shift: L.shift };
};
/** a world point of a design point on a card (for FX at heads / hands) */
const headTop = (cam: CamInfo, P: V3, dx = 0, dy = 0): V3 => toWorld(cam, P, 1, [300 + dx, 300 + dy], 0.06);

// ---------------- small effects ----------------
/** sweat drop: pops on at f0, slides `slide` design units down over 12 f */
const sweat = (out: Stage, cam: CamInfo, P: V3, side: number, f: number, f0: number, f1 = 1e9, slide = 26, y0 = 300, xo = 78) => {
  if (f < f0 || f > f1) return;
  const dk = Math.min(1, (f - f0) / 12);
  fx(out, "sweat", 128, 192, (p) => fxSweat(p), toWorld(cam, P, 1, [300 + side * xo, y0 + slide * dk], 0.07), 0.075, 0.112);
};
/** A3: a sweat drop PARENTED to the head (it follows crouches / nods): offset (+0.45 head widths, -0.15 head heights
 *  from the head centre, outside the outline), sliding ~0.5 px/f with a 1 f wobble */
const sweatHead = (out: Stage, cam: CamInfo, a: Act, P: V3, opts: PersonOpts, side: number, f: number, f0: number, f1 = 1e9, sc = 1) => {
  if (f < f0 || f > f1) return;
  const [hx, hy, ha] = headAt(a.o, opts), t = f - f0, wob = Math.floor(t) === 1 ? 2 : 0;
  fx(out, "sweat", 128, 192, (p) => fxSweat(p), toWorld(cam, P, sc, [hx + side * (1.12 * ha + wob), hy - 0.32 * ha + Math.min(14, 0.7 * t)], 0.08), 0.075 * sc, 0.112 * sc);
};
/** A3 crouch arc around a hand-on-the-ground contact frame c: a 2 f rise (anticipation), `down` f ease-in down (knees
 *  bend, torso tips), `hold` f, 4 f up with a small overshoot, 3 f settle. k = PersonOpts.crouch, reach = hand blend */
const crouchAt = (f: number, c: number, hold = 5, down = 5) => {
  const a0 = c - down - 2, d0 = c - down, u0 = c + hold, u1 = u0 + 4;
  if (f < a0 || f >= u1 + 3) return { k: 0, reach: 0 };
  if (f < d0) return { k: -0.2 * smooth((f - a0) / 2), reach: 0 };
  if (f < c) { const t = (f - d0) / down; return { k: -0.2 + 1.2 * smooth(t), reach: smooth((f - d0 - 1) / (down - 1)) }; }
  if (f < u0) return { k: 1, reach: 1 };
  if (f < u1) { const t = (f - u0) / 4; return { k: 1 - 1.15 * smooth(t), reach: 1 - smooth(t / 0.75) }; }
  return { k: -0.15 * (1 - (f - u1) / 3), reach: 0 };
};
/** whistle notes (A4): each spawns OUTSIDE the head (0.65 head widths beside the mouth, 0.1 head heights up), drifts
 *  up-and-away at ~0.02 head widths per frame with a 4-6 deg wobble, 0.22 head widths big, 14 f life (fading over the
 *  last 4 f); a note whose card would touch the head disc (< 1.08 r) is pushed out; head = headAt() of the whistler */
const notes = (out: Stage, cam: CamInfo, P: V3, head: [number, number, number], f: number, starts: number[], side = 1, sc = 1, big = 1, col = "#f8f3ee") => {
  const [hx, hy, ha] = head, sz = 0.44 * ha * big;
  let live = 0;
  starts.forEach((s, n) => {
    const t = f - s; if (t < 0 || t >= 14 || live >= 2) return;
    live++;
    let x = hx + side * (1.3 * ha + 0.05 * ha * t), y = hy + 0.24 * ha - 0.055 * ha * t + 3 * Math.sin(t * 0.8 + n);
    const d = Math.hypot(x - hx, y - hy), need = 1.08 * ha + 0.5 * sz;
    if (d < need) { x = hx + ((x - hx) * need) / d; y = hy + ((y - hy) * need) / d; }
    const g = Math.min(1, 0.5 + t / 3) * (t < 10 ? 1 : (14 - t) / 4) + 1e-4;
    fx(out, `note${col}`, 128, 128, (p) => fxNote(p, col), toWorld(cam, P, sc, [x, y], 0.08), sz * SU * sc * g, sz * SU * sc * g, { rot: rad5(t, n) });
  });
};
const rad5 = (t: number, n: number) => (5 * Math.PI / 180) * Math.sin(t * 0.7 + n);
/** white 4-point camera flash at a world point for dur frames from f0 */
const flash = (out: Stage, w: V3, f: number, f0: number, dur = 2, size = 0.45) => {
  const t = f - f0; if (t < 0 || t >= dur) return;
  fx(out, "flash", 256, 256, (p) => fxFlash(p), w, size * (Math.floor(t) === 0 ? 1.1 : 0.8), size * (Math.floor(t) === 0 ? 1.1 : 0.8), { soft: true });
};
const bang = (out: Stage, w: V3, f: number, f0: number, dur = 6) => {
  const t = f - f0; if (t < 0 || t >= dur) return;
  const k = Math.floor(t) === 0 ? 0.7 : Math.floor(t) === 1 ? 1.15 : 1;
  fx(out, "bang", 128, 256, (p) => fxBang(p), w, 0.07 * k, 0.14 * k, { rot: -0.15 });
};
const puff = (out: Stage, w: V3, f: number, f0: number, dur = 9, chalk = false) => {
  const t = f - f0; if (t < 0 || t >= dur) return;
  const u = q(t / dur, 10);
  fx(out, `puff${u}${chalk ? "c" : ""}`, 256, 128, (p) => fxPuff(p, u, chalk), [w[0], w[1] + 0.06, w[2]], 0.34, 0.17, { soft: true });
};

// ---------------- the raven ----------------
const RAVEN_SC = 0.42;
type RavenX = Partial<RavenOpts> & { lift?: number; roll?: number };
/** the raven at pos: idle head snaps every 0.7-1.6 s (1-frame turns), a hop and a wing ruffle now and then; ctl overrides */
const raven = (out: Stage, cam: CamInfo, f: number, pos: V3, ctl: RavenX = {}, id = 0) => {
  const v = vt(f), P = 34, n = Math.floor(v / P), m = v - n * P; // A5: idle snaps / hops / ruffles on the video clock
  const ang = (k: number) => [-1, 0, 1, 0, -1, 1][Math.floor(hh(k + id * 17, 21) * 6)];
  const head = m < Math.round(14 * hh(n, 22)) ? ang(n - 1) : ang(n);
  const hm = mod(v, 97), hop = hm < 8 ? Math.sin((Math.PI * hm) / 8) : 0;
  const rm = mod(v + 50, 131), ruffle = rm < 10 ? Math.sin((Math.PI * rm) / 10) : 0;
  const o: RavenOpts = { head, hop: q(hop, 12), ruffle: q(ruffle, 12), blink: blinkAt(f, 99 + id), light: light2D(cam), ...ctl };
  o.hop = q(o.hop, 12); o.ruffle = q(o.ruffle, 12); if (o.wing !== undefined) o.wing = q(o.wing, 12);
  const [x, y, z] = pos, d = cam.pos.distanceTo(tmp.set(x, y + 0.3, z)) / RAVEN_SC;
  const [w, h, k] = tier(d);
  out.places.push({ key: `R|${fkey(o)}`, x, y: y + (ctl.lift ?? 0), z, scale: RAVEN_SC, draw: (p) => drawRaven(p, o), size: [w, h, k], ...(ctl.roll ? { roll: ctl.roll } : {}) });
};

// ---------------- shot staging ----------------
const S = (id: number) => SHOTS[id - 1];

/** shot 1 / 16 woman: the pose as a pure function of the loop clock tau (so the hat lag can look 2 f back).
 *  A3 acting: proud (smiling at the paperclip memory) -> back to READING the board on "Then" with 3 saccades per line ->
 *  a scheming "think" with a finger-tapping chin rub on "and wanted" -> a FRESH shifty side-eye 2 f before "steal" with
 *  a 6 deg head snap (1 f overshoot) and one "anyone watching?" dart */
const R1 = PW(1) + 1;               // "Then": back to the sign
const W_EX1: K<Expr>[] = [[-999, "read"], [BEAT.paperclip - 2, "proud"], [R1, "read"], [PW(2), "plot"], [BEAT.steal1 - 2, "shifty"]];
/** A4: on "Then she read one sign" her head turns 3/4 over her shoulder toward the board (a 1 f facing swap behind a
 *  blink at R1 + 2, held), eyes up-left on the lines; she turns back to the lens 3 f before "wanted" */
const TURN1: [number, number] = [R1 + 0.8, BEAT.wanted - 3]; // A5: the facing swap sits inside the one blink on "Then"
const hookPose = (cam: CamInfo, id: number, tau: number) => {
  const P = TH.woman, L = life(tau, A.woman.i);
  const e: Expr = id === 16 ? "read" : at(tau, W_EX1);
  let look = 0, lookY = 0, fdx = 0, fdy = 0, head = L.head * 0.7, facing: -1 | 0 | 1 = 0;
  let browUp: [number, number] | undefined;
  // "read one sign": a 4 f head turn of ~10 deg up toward the board's first line, held, then back
  const turnRead = id === 1 ? ramp(tau, R1 + 2, 4) * (1 - ramp(tau, BEAT.wanted - 9, 5)) : 0;
  if (e === "read") {
    let [gx, gy] = readGaze(tau);
    if (id === 1 && tau >= R1) { // 3 fixations left -> right along a line (8 VIDEO f each, A5: ~5 % of the head width
      // apart), a 2 f return sweep, next line lower
      const dv = vt(tau) - vt(R1), m = mod(dv, 26), k = Math.min(2, Math.floor(m / 8));
      gx = m >= 24 ? -0.2 : -0.95 + 0.95 * k; gy = -1.25 + 0.15 * Math.min(2, Math.floor(dv / 26));
    }
    look = gx; lookY = gy; fdy = -8.5; fdx = gx * 2.6; head -= 3 + 10 * turnRead; browUp = [2.8, 2.8]; // A6 P3: a curious read (brows up)
    if (id === 1 && tau >= TURN1[0] && tau < TURN1[1]) { // A4: 3/4 over the shoulder, eyes up-left along the lines
      facing = -1; look = gx - 0.55; lookY = gy - 0.1; fdx = -5 + gx * 2; fdy = -7.5; browUp = [2.5, 1.5];
    }
  }
  else if (e === "proud") { lookY = 0.1; head += 3; }
  else if (e === "plot" || e === "think") { look = 0.55; lookY = -0.45; fdy = -2; facing = 1; head -= 1; browUp = [0, 4]; // A4: a scheming one-sided smirk, the right brow up
    // A6 ADD: two quick flicks DOWN to the sparkly rock (2 f each, ~8 video f apart) before the full side-eye, the head
    // leaning 3 deg toward it
    const rr = sideOf(cam, P, TH.glintRock), fl1 = (tau >= BEAT.steal1 - 13 && tau < BEAT.steal1 - 11) || (tau >= BEAT.steal1 - 7 && tau < BEAT.steal1 - 5);
    if (fl1) { look = rr * 1.15; lookY = 0.6; head += rr * 3; } }
  else { // shifty: the side-eye DOWN onto the sparkly rock at her lower right, a 6 deg head snap toward it (2 f, 1 f
    // overshoot), then one dart the other way ("anyone watching?") and back
    const r = sideOf(cam, P, TH.glintRock), S1 = BEAT.steal1 - 2, k = ramp(tau, S1, 2);
    const dart = dvf(tau, BEAT.steal1) >= 7 && dvf(tau, BEAT.steal1) < 16; // A7: the 'anyone watching?' dart held 9 video f (was 3 picture f)
    look = (dart ? -r : r) * 1.25; lookY = dart ? 0.1 : 0.45 + 0.45 * k; fdx = r * 2.5 * k; fdy = 2 * k;
    head += r * 6 * (tau < S1 + 2 ? smooth((tau - S1) / 2) * 1.18 : 1 + 0.18 * (1 - clamp01((tau - S1 - 2) / 2)));
    browUp = r > 0 ? [0, 5] : [5, 0];
  }
  return { e, look, lookY, fdx, fdy, head, facing, browUp, L };
};
const womanHook = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = A.woman, P = TH.woman;
  const tau = id === 16 ? f - (TOTAL - 1) : f;
  const W0 = hookPose(cam, id, tau), Wb = hookPose(cam, id, tau - 2), Wc = hookPose(cam, id, tau - 3);
  const chest = id === 1 ? ramp(tau, BEAT.paperclip - 3, 6) * (1 - ramp(tau, R1 - 4, 6)) : 0;
  const chin = id === 1 ? clamp01(settle(tau, PW(2) - 1, 7)) : 0; // A7: a small overshoot at the chin
  // the chin rub: the ball hand at the JAW'S SIDE (30 % of the head width toward screen right), elbow bent out, a
  // 2 px finger-tap bob every 8 f
  // A4: the ball hand sits IN FRONT of the face at the jaw corner (+32 % / +38 % of the head width from the face
  // centre, on skin, never on the dark bob), drawn on the top layer, with a 2 px finger tap every 8 f
  const tap = chin > 0.9 ? 2.2 * (mod(Math.floor((vt(tau) - vt(PW(2) + 4)) / 4), 2) ? 1 : 0) : 0;
  const hands: [Hand, Hand] = [{ a: "strap", dy: id === 1 ? 1.2 * Math.sin(TAU * vt(tau) / 24) : 0 },
    chin > 0 ? { a: "hang", b: "chin", k: chin, dx: 26 * chin, dy: (-7 - tap) * chin + 5 * bump(tau, PW(2) - 2, 3), bend: 1.7, over: true } : { a: "hang", b: "chest", k: chest }]; // A7 P3: on top of the hair from its first frame, a 3 f dip before the rise
  // blinks: one across each expression swap (2 f before it, so every new face is open ON its word) + idle ones
  // A5: each blink is 4 VIDEO frames; ONE blink on "Then" covers both the read swap (R1) and the 3/4 turn (TURN1[0]);
  // the "steal" blink straddles the shifty swap (eyes reopen shifty), so no closed lid sits on the pre-snap hold
  const blink = id === 16 ? 0 : blinkList(tau, [20, BEAT.paperclip - 4, R1 - 1, TURN1[1] - 1, PW(2) - 2, BEAT.steal1 - 3, 136]);
  const w = wnd(tau, P[0], P[2]), fl = flutAt(tau, 1);
  put(out, cam, a, P, {
    expr: W0.e, look: W0.look, lookY: W0.lookY, blink, facing: W0.facing,
    breath: W0.L.breath * 1.45, tilt: W0.L.sway * 1.25 + 0.7 * W0.L.shift, shift: W0.L.shift, headTilt: W0.head,
    face: { fdx: W0.fdx, fdy: W0.fdy, browUp: W0.browUp }, hatLag: 1.0 * (Wb.head - W0.head) + 1.6 * flutAt(tau - 2, 1), hairSwing: 1.2 * (Wc.head - W0.head) + 2.4 * w + 1.2 * fl,
    wind: w * 1.25, flutter: fl * 1.5, hands, // A5 ADD: stronger wind on the hook (ribbon / brim / hem +50 %)
  });
};

/** back-view reading head: saccades along a line (5-6 deg jumps every ~9 f, left -> right), then a return sweep */
const scanHead = (f: number, i: number) => { const m = mod(vt(f) + Math.floor(hh(i, 7) * 30), 38), k = Math.min(3, Math.floor(m / 9)); return m >= 36 ? -4 : -8 + 5.5 * k; };
/** A3 back-view reading head for shot 4: +-3 deg left -> right once per sign line (22 f, the same clock as `scan`) */
const lineHead = (f: number, f0: number) => { const m = mod(vt(f) - vt(f0), 22); return m >= 20 ? 3 - 6 * ((m - 20) / 2) : -3 + 6 * (m / 20); };
/** A5: her reading saccades up on the board in shots 4 (end) / 5 (start): 3 fixations left -> right, 7 VIDEO f each */
const read5 = (f: number) => { const m = mod(vt(f), 23); return m >= 21 ? -1.3 : -1.55 + 0.5 * Math.min(2, Math.floor(m / 7)); };
/** shot 5: he stands beside her, A3: 0.12 m further right so their face outlines keep a 30-50 px gap (the whisper
 *  paddle sits in it; LEAD: CAMS[5] look x +0.09, pos x +0.06); shot 6: 0.25 m right so the rock is not under him */
const FI5: V3 = [TH.fiance[0] + 0.26, 0, TH.fiance[2]], FI6: V3 = [TH.fiance[0] + 0.25, 0, TH.fiance[2]];
/** glasses pop on a shock: up 3 f (u), a 2 f overshoot below, settled */
const gPop = (f: number, f0: number) => { const t = Math.floor(f - f0); return t < 0 ? 0 : t < 3 ? [2, 3.2, 3][t] : t < 5 ? [-1, -0.5][t - 3] : 0; };
/** shot 4 turn windows (A3): [front start, front end); a 3 f back-3/4 drawing before and after each; after the last
 *  one they stay 3/4 toward the board (faces partly readable on "piece at a time"). He turns 3 f after her */
/** A7 P1 (the turn on "Warning!" was a 1 f back -> front swap, then a second 180 pop back): ONE real turn on the VIDEO
 *  clock, then they stay turned toward each other for the rest of shot 4. T4V(who) = the video frame the spin starts:
 *  a 4 f anticipation dip before it, 4 f of the BACK drawing spinning to the card's edge (ease-in), the FRONT drawing
 *  opening out of the edge over 6 f with a ~7 deg overshoot (backOut), the hat brim lagging 3 f. Her front lands
 *  ~3 f before "Warning!"; he follows 4 f later. */
const T4V = (who: 0 | 1) => vt(BEAT.vandalized) - 7 + 4 * who;
const SPIN = 1.25; // rad at the card edge (cos = 0.32: a thin silhouette for one frame, never a vanished card)
const turn4 = (f: number, who: 0 | 1, s: number) => spinAt(f, T4V(who), s);
/** the card spin from back to front starting at VIDEO frame v0 (see T4V): view, yaw offset, anticipation dip, u */
const spinAt = (f: number, v0: number, s: number) => {
  const u = vt(f) - v0;
  const view: "front" | "back" = u < 4 ? "back" : "front";
  const yaw = u < 0 ? 0 : u < 4 ? s * SPIN * ((u + 1) / 4) ** 1.5 : u < 11 ? -s * SPIN * (1 - backOut((u - 4) / 7)) : 0; // the back reaches the edge on its last frame
  const dip = u >= -4 && u < 0 ? bump(u, -4, 4) : 0;
  return { view, yaw, dip, u };
};
/** A7 P2: the idea beat at the pull-out landing (video): eyes drop to the glinting chip (5 f), the plotting smirk
 *  (13 f), then shot 5's opening read from the dissolve on (so the 4 -> 5 match shows one pose) */
const IDEA4 = () => vt(BEAT.sheRead) - 9; // A7: at the landing (the chip on the post footing is in frame); shot 5 opens on the same smirk
/** the glinting chip left of her feet on "a small piece at a time" (clear of both of them, below the caption) */
const PIECE4: V3 = [-0.98, 0.35, 0.2]; // A5: on the concrete footing of the LEFT post (S4B screen y ~1360, out of the UI band)
/** the woman + fiance in shots 4-6 (the sign, the whisper, the mystery) */
const woman = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = A.woman, P = TH.woman, i = a.i, F = id === 5 ? FI5 : id === 6 ? FI6 : TH.fiance, w = wnd(f, P[0], P[2]), fl = flutAt(f, i, P[0], P[2]);
  if (id === 4) {
    // A7 (user: slower, readable; audit P1/P2): the reading back view (head scans +-6 deg per line with a chin dip on each
    // line return, weight shifts, brim / hem / hair in the wind), ONE deliberate point at the WARNING title on "warning:"
    // (2 f dip, 6 f rise with overshoot, two jabs, held to "It said", 6 f down); on "Warning!" ONE real spin (turn4) to a
    // 3/4 front TOWARD HIM, eyes on his face: "alert" 10 f, a small "o" 14 f, brows up, a hand flying to her chest; no
    // turn-back. Off-screen on "14" she worries (hands on cheeks). At the pull-out landing (IDEA4, video) the hands come
    // down, her eyes DROP to the glinting chip (5 f), the plotting smirk (13 f), then shot 5's opening read.
    const L = life(f, i), side = sideOf(cam, P, F), V = BEAT.vandalized;
    const tw = turn4(f, 0, side), v = tw.view, dv = vt(f) - vt(V), I0 = IDEA4(), dI = vt(f) - I0;
    if (v === "front") {
      const turn1 = f < BEAT.tons14 - 2;
      const idea = dI >= 0 && dI < 15, afterIdea = dI >= 15;
      const e: Expr = turn1 ? (dv < 12 ? "wide" : dv < 26 ? "gasp" : "browsUp")
        : afterIdea ? "read" : idea ? (dI < 4 ? "shifty" : "plot") : f < BEAT.tons14 + 26 ? "wide" : "worry";
      const mk = turn1 || afterIdea ? 0 : idea ? 1 - rampV(dI, 0, 7) : clamp01(settle(f, BEAT.tons14 + 18, 6)) - 0.15 * bump(f, BEAT.tons14 + 16, 2);
      const cheek = (s: number): Hand => ({ a: "hang", b: "temple", k: clamp01(mk), dx: -s * 3 * clamp01(mk), dy: 22 * clamp01(mk), bend: 1.3, maxLen: 1.3 });
      const h5 = rampV(dI, 4, 8); // the hands settle into shot 5's opening (strap on the screen-left hand) before the dissolve
      // the "Warning!" hand to her chest: a 2 f dip, a 7 f rise with a small overshoot, down again before the counter push
      const uv = vt(f) - vt(V), ch = turn1 ? clamp01(settle(uv, -2, 7)) * (1 - rampV(uv, 26, 8)) - 0.12 * bumpV(uv, -4, 2) : 0;
      const free: Hand = { a: "hang", b: "chest", k: clamp01(ch), dx: 4 * clamp01(ch), dy: -6 * clamp01(ch), bend: 1.2 };
      const hands: [Hand, Hand] = mk > 0.02 ? [cheek(-1), cheek(1)]
        : side > 0 ? [ch > 0.02 ? free : { a: "hang", b: "strap", k: h5 }, { a: "strap", b: "hang", k: h5 }] : [{ a: "strap" }, ch > 0.02 ? free : { a: "hang" }];
      let look = side * 1.25, lookY = 0.05, fdy = 0, fdx = 0, head = 0;
      let browUp: [number, number] | undefined;
      if (turn1) { look = side * 1.3; lookY = 0.1; head = side * (4 + 4 * bumpV(tw.u, 5, 9)); browUp = dv < 24 ? [5, 5] : [3, 3]; } // eyes on HIS face, the head tips toward him (a 4 deg overshoot)
      if (!turn1 && f >= BEAT.tons14 + 21 && f < BEAT.tons14 + 30) { look = sideOf(cam, P, [TH.flip.x, TH.flip.y, TH.flip.z]) * 1.3; lookY = -0.2; } // snap to the counter
      if (idea) { const cs = sideOf(cam, P, PIECE4); look = cs * (dI < 4 ? 1.25 : 0.9); lookY = 0.75; fdy = 2; browUp = cs > 0 ? [0, 5] : [5, 0]; head = cs * 3; } // down at the glinting chip on the footing
      let fc: -1 | 0 | 1 = side;
      if (afterIdea) { fc = 0; look = read5(f); lookY = -1.15; fdy = -6; fdx = -3; browUp = [3, 3]; head = -5; } // = shot 5's opening read
      put(out, cam, a, P, { ...idle(f, i, P), tilt: L.sway * 1.2 + 0.8 * L.shift - (turn1 ? 0 : 2.2 * side * ramp(f, BEAT.tons14, 6)), expr: e, facing: fc, look, lookY, face: { fdy, fdx, browUp },
        headTilt: L.head * 0.6 + head, squash: -0.3 * bumpV(tw.u, 4, 4),
        blink: blinkAt(f, i, [PV(T4V(0) + 3), BEAT.tons14 + 25, PV(I0 - 1), PV(I0 + 3), PV(I0 + 14)], [PV(T4V(0) + 5), BEAT.tons14 + 18]),
        hatLag: -side * 8 * bumpV(tw.u, 3, 8) + 2.4 * fl, hairSwing: -side * 7 * bumpV(tw.u, 3, 9) + 3 * w + 2 * fl, wind: w, flutter: fl, hands }, { yawOff: tw.yaw });
    } else {
      // back view: reading scans; the point on "warning:" (on the VIDEO clock so the warp never squeezes it)
      const uW = dvf(f, BEAT.warning), uY = dvf(f, BEAT.your);
      const pt = uW < -2 ? 0 : uW < 0 ? -0.12 * bump(uW, -2, 2) : uY < 2 ? clamp01(settle(uW, 0, 6)) : 1 - rampV(uY, 2, 6);
      const jab = uW >= 9 && uW < 21 ? bump(mod(uW - 9, 6), 0, 3) : 0;
      const out_ = side > 0 ? 0 : 1, so4 = out_ ? 1 : -1, [bx4, bz4] = axisX(cam, P);
      const tgt4 = toDesignRay(cam, P, 1, [P[0] + bx4 * so4 * 0.5, TH.board.cy + 0.55, TH.board.z + bz4 * so4 * 0.5]);
      const ptH: Hand = { a: "hang", b: tgt4, k: clamp01(pt), dy: -4 * jab, over: true, shape: "f1", sz: 0.34, maxLen: 1.15, bend: 1.25, ang: -so4 * 20 };
      const lineN = clamp(Math.floor(uY / 22), 0, 5), lm = mod(uY, 22);
      put(out, cam, a, P, { view: "back", facing: 0, breath: L.breath * 1.4, tilt: L.sway * 1.4 + 1.1 * L.shift, shift: L.shift, squash: 0.4 * tw.dip,
        nod: -0.7 * bump(f, BEAT.your - 2, 14) + 0.3 * tw.dip + (uY >= 0 && f < V ? 0.1 * lineN + 0.3 * bump(lm, 18, 5) : 0) - 0.25 * clamp01(pt),
        headTilt: L.head * 0.5 + (uY >= 0 ? 2 * lineHead(f, BEAT.your) : 0) + 2 * so4 * clamp01(pt), wind: w * 1.3, flutter: clamp(fl * 1.6, -1, 1),
        hatLag: 5 * fl + side * 7 * bumpV(tw.u, 0, 6), hairSwing: 6 * w + 4 * fl, lookY: 0.4,
        hands: pt > 0.02 ? (out_ ? [{ a: "strap" }, ptH] : [ptH, { a: "strap" }]) : [{ a: "strap" }, { a: "hang", dy: pt < 0 ? 8 * pt : 0 }] }, { yawOff: tw.yaw });
    }
    // the chip that glints at the pull-out landing (A7: re-timed from "piece" to the idea beat, on the video clock)
    fx(out, "chip4", 128, 128, (p) => fxChip(p, 12, true), [PIECE4[0], PIECE4[1] + 0.06, PIECE4[2] + 0.06], 0.16, 0.135);
    glintAt(out, [PIECE4[0], PIECE4[1] + 0.13, PIECE4[2] + 0.09], vt(f), I0 - 1, 0.46, 11);
    return;
  }
  if (id === 5) {
    // A4: reads with her eyes up over her shoulder at the board ("She read it", two saccades, brows up), then a REAL lean
    // on "leaned": 3 f anticipation back (-2 deg), out to 12 deg, settling at 10 deg over 6 f, her hips and feet slide
    // 0.12 m toward him and her head tips +6 deg to his ear; two shifty glances for witnesses before "whispered" (5 f
    // each), then the dark mitten paddle in the gap by his ear (she leans 2 deg further), the sly 3/4 side-eye, lip flaps
    // ONLY on the quoted line, brows up on "ours", then a grin and the lean back with an overshoot
    const WS = BEAT.whispered, OURS = PW(10, "ours");
    const ex: K<Expr>[] = [[0, "read"], [BEAT.leaned - 2, "scheme"], [WS - 6, "shifty"], [WS + 5, "smug"], [BEAT.whisper - 1, "hush"], [BEAT.nowEnd + 2, "grin"]];
    const e = at(f, ex), side = sideOf(cam, P, F), L = life(f, i);
    const back0 = BEAT.nowEnd + 2;
    const leanAt = (g: number) => {
      const away = -0.17 * bump(g, BEAT.leaned - 3, 3);                    // 3 f leaning away first (-2 deg)
      const lean = g < BEAT.leaned ? 0 : g < BEAT.leaned + 6 ? smooth((g - BEAT.leaned) / 6) : 1.0 - 0.17 * ramp(g, BEAT.leaned + 6, 6);
      const more = 0.17 * ramp(g, WS, 5);                                  // +2 deg as the hand comes to her mouth
      const lb = g < back0 ? 0 : backOut((g - back0) / 10);                // the lean-back eases over 10 f, a small overshoot past upright
      return (away + lean + more) * (1 - lb) - 0.12 * bump(g, back0 + 6, 6);
    };
    const lean = leanAt(f), lean2 = leanAt(f - 2);
    const slide = 0.07 * smooth((f - BEAT.leaned) / 7) * (1 - smooth((f - back0) / 10));
    const dl = Math.hypot(F[0] - P[0], F[2] - P[2]) || 1, Pw: V3 = [P[0] + ((F[0] - P[0]) / dl) * slide, 0, P[2] + ((F[2] - P[2]) / dl) * slide];
    const down0 = BEAT.nowEnd + 4;
    const hm = settle(f, WS - 1, 5) * (1 - ramp(f, down0 + 2, 9)) - 0.12 * bump(f, WS - 3, 2);
    const hDy = -4 * bump(f, down0, 2) + (f >= down0 + 9 && f < down0 + 13 ? 3 * bump(f, down0 + 9, 4) : 0);
    let talk = -1;
    if (f >= BEAT.whisper && f < BEAT.nowEnd) { // 3 shapes, 2-5 f each, seeded
      let t0 = BEAT.whisper, n = 0;
      while (t0 + 2 + Math.floor(hh(n, 31) * 4) <= f) { t0 += 2 + Math.floor(hh(n, 31) * 4); n++; }
      talk = [1, 2, 0, 1, 0, 2, 1][n % 7];
    }
    const reading = e === "read";
    let look = reading ? read5(f) : side * (0.5 + 0.8 * ramp(f, BEAT.leaned + 14, 3)); // A5: saccades along the board lines, then to him on "to her"
    let lookY = reading ? -1.15 : 0.1;
    const whis = f >= WS + 5 && f < BEAT.nowEnd + 2;
    if (whis) { look = side * 1.3; lookY = 0.2; }
    if (e === "shifty") { look = f < WS - 1 ? -side * 1.35 : side * 1.35; lookY = f < WS - 1 ? 0 : -0.25; }  // anyone watching? left, then over his shoulder
    const turn = whis ? ramp(f, WS + 5, 3) : 0;
    const bob = 0.6 * bump(f, PW(10, "better"), 3);
    const headT = L.head * 0.5 - (reading ? 5 : 0) + side * 3.2 * lean + side * (4 + 3 * turn) * ramp(f, BEAT.leaned + 14, 4) * (1 - ramp(f, BEAT.nowEnd, 6))
      + (e === "shifty" ? (f < WS - 1 ? -side * 4 : side * 3) : 0);
    const tug = -2.5 * bump(mod(vt(f), 12), 0, 4) - 3 * bump(f, BEAT.leaned, 3) + 1.2 * bump(f, BEAT.leaned + 3, 2); // strap tug every 12 f + a swing on the lean (2 f overshoot)
    const brows: [number, number] | undefined = reading ? [3, 3] : f >= OURS - 1 && f < OURS + 7 ? [4, 4] : undefined;
    const opts: PersonOpts = {
      expr: e, look, lookY, blink: blinkAt(f, i, [...swapsOf(ex), BEAT.sheRead + 11, PW(9, "fiancé,") + 3, PW(10, "get"), BEAT.leaned + 21, BEAT.whisper + 13], [OURS - 1]), talk, nod: bob,
      facing: reading ? 0 : side, breath: L.breath * 1.3, tilt: L.sway * 1.35 + side * 8 * lean, headTilt: headT, shift: L.shift,
      face: reading ? { fdy: -6, fdx: -3, browUp: brows } : { fdx: side * 6 * turn, browUp: brows }, hatLag: side * 9 * (lean2 - lean) - side * 18 * clamp01(lean) + 2.6 * fl,
      hairSwing: side * 7 * (lean2 - lean) + 2.5 * w + 2.5 * fl, wind: w, flutter: fl + 0.8 * (lean2 - lean),
      hands: [{ a: "strap", dy: tug }, hm > 0.02 ? { a: "hang", b: "whisper", k: clamp01(hm), dx: side * 20 * clamp01(hm), dy: hDy - 4 * clamp01(hm), shape: "mitten", split: true, ang: side * 18, sz: 0.32 } : { a: "hang", dy: hDy }], // A7 P2: the cupped paddle 20 u further toward him (in the gap between the heads, outside her hair), tilted 18 deg, 0.32
    };
    // A7: the 4 -> 5 match: shot 5 opens on shot 4's plotting smirk at the glinting chip (IDEA4), then reads
    { const dI = vt(f) - IDEA4(); if (dI < 15) { const cs = sideOf(cam, P, PIECE4);
      Object.assign(opts, { expr: dI < 4 ? "shifty" : "plot", facing: side, look: cs * (dI < 4 ? 1.25 : 0.9), lookY: 0.75, headTilt: L.head * 0.6 + cs * 3, face: { fdy: 2, browUp: cs > 0 ? [0, 5] : [5, 0] }, talk: -1 }); }
      // (render check: the dissolve ghosted her head ~10 px): shot 4's exact body pose through the dissolve, blended out over 8 f
      if (dI < 23) { const k = rampV(dI, 15, 8), t4 = L.sway * 1.2 + 0.8 * L.shift - 2.2 * side;
        Object.assign(opts, { tilt: t4 + ((opts.tilt ?? 0) - t4) * k, breath: L.breath + ((opts.breath ?? 0) - L.breath) * k, hatLag: 2.4 * fl + ((opts.hatLag ?? 0) - 2.4 * fl) * k,
          hairSwing: 3 * w + 2 * fl + ((opts.hairSwing ?? 0) - 3 * w - 2 * fl) * k, flutter: fl + ((opts.flutter ?? 0) - fl) * k }); } }
    put(out, cam, a, Pw, opts);
    // whisper squiggles drifting from the paddle toward his ear on the quoted line (on 2s)
    if (f >= BEAT.whisper && f < BEAT.nowEnd) {
      const hp = handAt(a.o, { ...opts, seed: seedOf(i), light: light2D(cam) }, 1), m0 = toWorld(cam, Pw, 1, [hp[0] + side * 20, hp[1] - 60], 0.12);
      const ear = toWorld(cam, F, 1, [300 - side * 125, 372], 0.12);
      for (let j = 0; j < 3; j++) {
        const t = q(mod(Math.floor((f - BEAT.whisper) / 2) * 2 + j * 6, 18) / 18, 9), u2 = 0.15 + 0.75 * t;
        const c: V3 = [m0[0] + (ear[0] - m0[0]) * u2, m0[1] + (ear[1] - m0[1]) * u2 + 0.03 * Math.sin(t * 6 + j), m0[2] + (ear[2] - m0[2]) * u2];
        fx(out, `squig${t}`, 128, 128, (p) => fxSquiggle(p, t), [c[0], c[1] + 0.06, c[2]], 0.1, 0.1, { rot: side < 0 ? Math.PI : 0 });
      }
    }
    return;
  }
  if (id === 6) {
    // A7 MYSTERY BEAT (user: "a real mystery beat ... the woman's face turning thoughtful"; audit P2s), on the VIDEO clock:
    // "But why ...": she reads on, her head cocking slowly (puzzled, 6 deg); "warning": ONE deliberate point up-right at
    // the board's lower lines (a 3 f dip, a 6 f reach with a bent elbow and an overshoot, two jabs, lowered over 6 f);
    // then she TURNS (a real card spin) over her right shoulder to a 3/4 front, "think": the finger to her chin, eyes up,
    // brows knitted, held through "honest person want to"; on "steal?" her eyes slide DOWN to the glinting rock and one
    // brow rises (the honest woman tempted), the hat brim tipping; the raven snatches its chip above her.
    const L = life(f, i), side = sideOf(cam, P, F), front = cam.pos.z < P[2] - 0.3, rk = sideOf(cam, P, TH.glintRock);
    const W6 = PW(11, "warning"), uP = dvf(f, W6) - 6, late = clamp01((f - (BEAT.but + 6)) / 50); // (the old "warning" maps 8 f before the new one)
    const T6 = vt(BEAT.honest) - 4, sp = spinAt(f, T6, rk), uH = vt(f) - T6;
    const pt = uP < -3 ? 0 : uP < 0 ? -0.15 * bump(uP, -3, 3) : clamp01(settle(uP, 0, 6)) * (1 - rampV(uP, 11, 6));
    const jab = uP >= 6 && uP < 12 ? bump(mod(uP - 6, 3), 0, 3) : 0;
    let ptT: P2 | null = null;
    if (pt > 0.02 && !front) { const B6 = basisOf(6, f), dB = toScr(B6, [0, TH.board.cy - TH.board.h / 2, TH.board.z])[2];
      const d0 = toDesignRay(cam, P, 1, fromScr(B6, 0.66, 0.4, dB)), sh0 = handAt(a.o, { view: "back", seed: seedOf(i), hands: [null, { a: "up" }] }, 1);
      ptT = [sh0[0] + (d0[0] - sh0[0]) * clamp01(pt) + 3 * jab, sh0[1] + (d0[1] - sh0[1]) * clamp01(pt) - 4 * jab]; }
    if (sp.view === "back" && !front) {
      const hand: Hand = ptT ? { a: "hang", b: ptT, k: clamp01(pt * 1.15), dy: pt < 0 ? -10 * pt : 0, maxLen: 1.6, bend: 1.3, over: true, shape: "f1", sz: 0.42, ang: 25 } : { a: "hang" };
      const cock = 6 * rampV(vt(f), vt(PW(11, "why")) - 2, 10);
      put(out, cam, a, P, { view: "back", facing: 0, lookY: 0, nod: -0.35 * clamp01(pt) + 0.3 * sp.dip, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * L.shift, shift: L.shift, squash: 0.35 * sp.dip,
        headTilt: L.head - side * cock * (1 - clamp01(pt)) - 4 * clamp01(pt) * side + scanHead(f, i) * 0.4 * (1 - clamp01(pt)),
        hatLag: 2 * fl + rk * 6 * bumpV(uH, 0, 6), wind: w, flutter: fl, hairSwing: 3.5 * w + 2 * fl,
        rim: late > 0.2 ? "#ffb070" : undefined, rimK: q(late, 5), hands: [{ a: "strap" }, hand] }, { yawOff: sp.yaw });
      return;
    }
    // the thoughtful 3/4 front (from the spin on; also if the lens ever comes round to her face)
    const uS = dvf(f, BEAT.steal2), tempt = uS >= -4;
    const e: Expr = tempt ? (uS < 0 ? "ponder" : "shifty") : uH < 6 ? "browsUp" : "think";
    const chin = clamp01(settle(uH, 4, 8)) * (1 - rampV(uS, 6, 8));
    const slide = rampV(uS, -4, 3);                                              // the eyes slide down to the rock over 3 f
    put(out, cam, a, P, { ...idle(f, i, P), expr: e, facing: rk, look: tempt ? rk * (0.5 + 0.8 * slide) : -rk * 0.35, lookY: tempt ? -0.9 + 1.8 * slide : -1.25,
      face: { fdy: tempt ? 2 * slide - 4 * (1 - slide) : -5, browUp: tempt ? (rk > 0 ? [0, 5] : [5, 0]) : [1, 3] }, blink: blinkAt(f, i, [PV(T6 + 3), pAt(BEAT.steal2, -5)], [pAt(BEAT.steal2, 0)]),
      headTilt: L.head * 0.6 + rk * (3 + 3 * bumpV(uH, 5, 9)) - (tempt ? rk * 4 * slide : 2), squash: -0.3 * bumpV(uH, 4, 4),
      wind: w, flutter: fl, hatLag: 2 * fl - rk * 7 * bumpV(uH, 3, 8) + rk * 4 * bumpV(uS, 0, 8), hairSwing: -rk * 6 * bumpV(uH, 3, 9) + 3 * w,
      rim: late > 0.2 ? "#ffb070" : undefined, rimK: q(late, 5),
      hands: [{ a: "strap" }, chin > 0.02 ? { a: "hang", b: "chin", k: chin, dx: 20 * chin, dy: -2 * Math.sin(TAU * vt(f) / 16) * chin, over: true, bend: 1.4 } : { a: "hang" }] }, { yawOff: sp.yaw });
  }
};

const fiance = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = A.fiance, i = a.i, W = TH.woman;
  const P: V3 = id === 5 || (id === 4 && vt(f) >= vt(BEAT.tons14)) ? FI5 : id === 6 ? FI6 : TH.fiance; // A7 P1: in shot 4 he side-steps onto shot 5's mark while the lens is on the counter (the 4 -> 5 match)
  const w = wnd(f, P[0], P[2]);
  const straps = (dy = 0, fid = 0): [Hand, Hand] => [{ a: "strap", dx: -14, dy: dy + 1.5 * w }, { a: "strap", dx: 30 + fid, dy: dy - 1.5 * w - Math.abs(fid) * 0.4 }];
  if (id === 4) {
    // A7: the same spin as hers, 4 f later (turn4), then he STAYS turned to her (no turn-back): "listen" with his eyes on
    // her face (14 f, a glint on the glasses), brows up at the board; a gasp on "14" (off-screen), pushes his glasses up,
    // worried on her; shot 5's read for the dissolve. From behind: line scans (head only: a PURE back view, no cheek
    // crescent), a backpack hitch on "warning:", a 2 deg lean toward her, a peek at her by a head tilt only.
    const L = life(f, i), side = sideOf(cam, P, W), tw = turn4(f, 1, side), v = tw.view, dv = vt(f) - vt(BEAT.vandalized);
    if (v === "front") {
      const turn1 = f < BEAT.tons14 - 2;
      const gulp = bump(f, BEAT.tons14 + 2, 5), push = !turn1 && f >= BEAT.tons14 + 1 && f < BEAT.tons14 + 7;
      const hands: [Hand, Hand] = push ? [{ a: "eye", dx: -side * 10, dy: -8, bend: 1.4 }, straps()[1]] : straps();
      let look = side, lookY = 0, fdy = 0, hT = 0;
      if (turn1 && dv < 18) { look = side * 1.5; lookY = 0.05; hT = side * (4 + 3 * bumpV(tw.u, 5, 9)); }   // his eyes on HER face, head tipped toward her
      else if (turn1) { look = -side * 0.3; lookY = -0.8; fdy = -3; }
      else if (f < BEAT.tons14 + 33) { look = sideOf(cam, P, [TH.flip.x, TH.flip.y, TH.flip.z]) * 1.2; lookY = 0.1; }
      else { look = side * 1.25; lookY = 0; }                                                              // to her (worried)
      const s5 = vt(f) >= vt(BEAT.sheRead) - 4;                                                                    // shot 5's opening read for the dissolve
      if (s5) { look = scan(f + 9) * 0.6; lookY = -1; fdy = -5; }
      put(out, cam, a, P, { ...idle(f, i, P), expr: s5 ? "read" : turn1 ? (dv < 17 ? "listen" : "browsUp") : f < BEAT.tons14 + 33 ? "gasp" : "worry", facing: s5 ? 0 : side, look, lookY, squash: gulp * 0.6 - 0.3 * bumpV(tw.u, 4, 4),
        headTilt: life(f, i).head * 0.6 + hT,
        blink: blinkAt(f, i, [PV(T4V(1) + 3), BEAT.tons14 + 32, pAt(BEAT.sheRead, -5)], [PV(T4V(1) + 5)]),
        face: { fdy, glint: dv >= 2 && dv < 4 ? 1 : 0, glassDy: !turn1 ? gPop(f, BEAT.tons14 - 2) + (push ? 2 : 0) : 0 }, hands }, { yawOff: tw.yaw });
    } else {
      const uW = dvf(f, BEAT.warning), hitch = bumpV(uW, -2, 7), shiftK = f >= BEAT.your + 16 && f < BEAT.vandalized ? -1 : L.shift;
      const leanH = 2 * ramp(f, BEAT.your + 4, 6) * (1 - rampV(tw.u, -6, 4));
      const peek = dv >= -22 && dv < -12;                                                                   // a glance over to her mid-read (head only)
      put(out, cam, a, P, { view: "back", facing: 0, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * shiftK + side * leanH, shift: shiftK,
        headTilt: L.head * 0.5 + 2 * lineHead(f + 5, BEAT.your) - 2 + side * 2 * leanH + (peek ? side * 6 * rampV(dv, -22, 3) : 0), squash: -0.5 * hitch + 0.25 * L.breath + 0.4 * tw.dip, wind: w, lookY: 0.3,
        hands: [{ a: "hang", dy: -4 * hitch }, { a: "hang", dy: -4 * hitch }] }, { rise: 0.014 * hitch, yawOff: tw.yaw });
    }
    return;
  }
  if (id === 5) {
    // read -> listen -> a QUIET unease (half-lids, knitted brows) -> on "now" the goggle-shock jump (eyes 1.4x, brows up,
    // glasses pop 3 f and settle, grid-teeth) + sweat drop; his eyes dart down to the rock between them before "ours";
    // A3: his thumbs tap the straps from the start of the lean, blinks, a carabiner and a water bottle on the pack
    const OURS = PW(10, "ours");
    const FIA0 = PW(9, "fiancé,");
    const ex: K<Expr>[] = [[0, "read"], [BEAT.leaned + 2, "listen"], [FIA0 - 1, "skeptic"], [FIA0 + 12, "listen"], [BEAT.whisper + 4, "uneasy"], [BEAT.now - 1, "goggle"], [S(5).b + 8, "worry"]]; // A6 P3: the shock lands 2 f before "now" and HOLDS through the 5 -> 6 dissolve
    const e = at(f, ex), side = sideOf(cam, P, W), L = life(f, i);
    // A7 P2: a full body take on the VIDEO clock: a 2 f anticipation squash, a 6 % stretch, the head jolting away from
    // her with a 5 deg lean-away, settling over 6 f with a 1 f overshoot
    const un = dvf(f, BEAT.now), jolt = un >= -2 ? clamp01(settle(un, -2, 7)) * 1.25 : 0, sq = 0.7 * bumpV(un, -4, 2) - 1.5 * bumpV(un, -2, 6), gulp = bumpV(un, 8, 6);
    const lean = ramp(f, BEAT.whispered, 8) * (1 - jolt);
    const FIA = PW(9, "fiancé,");
    let look = e === "read" ? scan(f + 9) * 0.6 : side * (f >= BEAT.leaned + 4 ? 1.2 : 0.5), lookY = e === "read" ? -1 : 0; // A4: his eyes slide to her as she leans in
    if (e === "skeptic") { look = side * 1.4; lookY = 0.1; }                         // A5: a suspicious side-eye at her on "fiance," (one brow up)
    if (f >= OURS - 6 && f < OURS - 2) { look = side * 0.6; lookY = 1; }               // down at the rock between them
    if (e === "goggle") { const tl = f - BEAT.now; look = tl < 10 ? side * 1.1 : tl < 16 ? 0 : side * 0.9; lookY = tl < 10 ? 0.45 : 0; } // her mouth, then the lens
    const fid = f >= BEAT.leaned + 10 && f < BEAT.now - 2 ? 5 * Math.sin(VF * 1.3) : 0;
    const tip = f >= BEAT.leaned + 4 ? side * 4 * ramp(f, BEAT.leaned + 4, 4) : 0, away = -side * 1.8 * ramp(f, BEAT.whisper + 7, 5) * (1 - jolt); // A4: tips toward her, ear in, then a small lean-away
    put(out, cam, a, P, {
      expr: e, look, lookY, blink: e === "goggle" ? 0 : blinkAt(f, i, [...swapsOf(ex).filter((x) => x !== BEAT.now - 1), FIA + 3, PW(10, "get"), BEAT.whispered + 2], [BEAT.now - 1]),
      facing: e === "read" ? 0 : side, breath: L.breath * 1.5, squash: sq + 0.5 * gulp, shift: L.shift,
      tilt: L.sway * 1.3 + 0.6 * L.shift - side * 3 * lean - side * 4 * jolt + away, headTilt: L.head * 0.6 + tip + side * 6 * lean - side * 4 * jolt + 2 * away, // A5: leans AWAY, ear toward her
      face: { fdy: e === "read" ? -5 : 0, glint: f >= BEAT.now - 2 && f < BEAT.now ? 1 : 0.35 * jolt, glassDy: e === "goggle" ? gPop(f, BEAT.now - 2) - 3 * rampV(dvf(f, BEAT.now), 8, 24) : 0, /* A7 ADD: the glasses slide down his nose over the hold */ browUp: e === "skeptic" ? (side > 0 ? [0, 4] : [4, 0]) : undefined },
      wind: w, flutter: clamp(flutAt(f, i, P[0], P[2]) + 1.6 * bump(f, BEAT.now - 2, 10) * Math.sin((f - BEAT.now) * 1.3), -1, 1), hands: straps(-6 * jolt, fid), // A4: straps / bottle / carabiner jolt on the shock
    }, { rise: 0.022 * bumpV(un, -2, 6) }); // the jump
    sweat(out, cam, P, side, vt(f), vt(BEAT.now) - 1, 1e9, 30, 290, 92); // on the temple toward her; A7: slides ~10 px down over 12 VIDEO f
    return;
  }
  if (id === 6) {
    // back view; on "honest" he turns to a 3/4 REAR profile toward her (glasses temple + lens edge, a white-rimmed
    // side-eye, a 25 % cheek crescent) for 18 f
    // A5 P2: a 3/4 glance at her (568-580), then a purposeful walk off to the right (toward the bin) with a real walk cycle,
    // out of frame by ~video 820
    // A6 P1/P3: a PURE back view throughout (no white cheek crescent): the glance at her is a 6 deg head tilt; the walk
    // starts on "would" (video ~821): a visible stride (10 f steps, 2 % bob, arms swinging, the pack bouncing), off
    // the right edge ~30 video f later
    const L = life(f, i), side = sideOf(cam, P, W), G0 = BEAT.but + 2, X0 = PW(11, "would");
    const glance = f >= G0 && f < X0, walking = f >= X0;
    const sx = walking ? 1.55 * ((vt(f) - vt(X0)) / FPS) * smooth((vt(f) - vt(X0)) / 4 + 0.35) : 0, Pw: V3 = [P[0] + sx, 0, P[2] - 0.15 * sx];
    if (sx > 1.8) return;
    const late = clamp01((f - (BEAT.but + 6)) / 50), ph = (vt(f) - vt(X0)) / 20, sw = walking ? Math.sin(TAU * ph) : 0;
    put(out, cam, a, Pw, { view: "back", facing: 0, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * L.shift + (walking ? 3 : 0), shift: walking ? 0 : L.shift, lookY: glance ? -0.2 : 0.2,
      mode: walking ? "walk" : "stand", phase: walking ? ph : 0, lift: 1.25, squash: walking ? 0.25 * Math.abs(sw) : 0,
      headTilt: L.head + (glance ? side * 6 * ramp(f, G0, 2) : walking ? 2 * sw : scanHead(f, i) * 0.6), wind: wnd(f, P[0], P[2]), hands: [{ a: "hang", dy: walking ? -5 * sw : 0 }, { a: "hang", dy: walking ? 5 * sw : 0 }],
      rim: late > 0.2 ? "#ffb070" : undefined, rimK: q(late, 5) });
  }
};

/** shot 1 effects: the paperclip thought bubble and the glint on the sparkly rock.
 *  A5 P1/P2: the bubble is BIG (the cloud ~40 % of the frame width, the paperclip ~70 px at 1080) and anchored to HER
 *  on screen: it sits at her upper right, its bottom clear of the hat brim, its top >= 6 % under the frame edge, from
 *  the pop on "paperclip" (video ~52, already in frame) to its exit on "Then" (R1 - 1, video ~80) so the board reads
 *  whole while she reads it. Its tail is 3 dots from the cloud's lower-left to her hat crown. */
const hookFx = (out: Stage, cam: CamInfo, f: number) => {
  // A7: the pop on the VIDEO clock (0.55 -> 1.12 -> 0.96 -> 1, a 3 f wobble), held a beat longer (to 8 video f after "Then")
  const vf1 = vt(f), pop = (t0: number, t1: number) => { const a0 = vf1 - vt(t0), a1 = vt(t1) - vf1; return a0 < 0 || a1 < 0 ? 0 : a0 < 4 ? [0.55, 1.12, 0.96, 1.02][Math.floor(a0)] : a1 < 2 ? [0.5, 0.85][Math.floor(a1)] : 1; };
  const T0 = BEAT.paperclip - 1, T1 = Math.min(pAt(R1, 8), BEAT.sign1 - 8), k = pop(T0, T1);
  // the bubble animates on 2s (her arm pushes the big bowed paperclip, his arms bob, a twinkle every 6 f)
  const st = Math.max(0, Math.floor((vt(f) - vt(BEAT.paperclip)) / 2) * 2);
  if (k > 0) {
    const B = basisOf(1, f), hd = headAt(A.woman.o, { seed: seedOf(A.woman.i) });
    const hc = toScr(B, toWorld(cam, TH.woman, 1, [hd[0], hd[1]])), he = toScr(B, toWorld(cam, TH.woman, 1, [hd[0], hd[1] - hd[2]]));
    const r = Math.max(0.03, hc[1] - he[1]);                              // head radius as a share of the frame height
    // A6 P2/P3: 1.05x bigger (the cloud 42 % of W) and parked in the SKY GAP right of her, between the board's bottom
    // rail and the TRAIL OPEN sign (x 0.55-0.97 W, y ~0.37-0.51 H), so no sign line is ever covered
    const CWF = 0.42, CANW = CWF / 0.92, chF = CANW * 0.8 * 0.735 * ASPECT;  // cloud width (of W); cloud height (of H)
    // A7 P2 (the bubble sat on her hat crown): its cloud bottom >= 20 px (1080) above the crown top, scaled 0.9 if the
    // top would leave the frame
    const crownTop = hc[1] - 1.62 * r, sz1 = crownTop - 0.0104 - 0.06 < chF ? 0.9 : 1;
    const sx = 1 - 0.03 - (CWF * sz1) / 2, sy = Math.min(0.432, crownTop - 0.0104 - (chF * sz1) / 2);
    const d = Math.max(0.6, hc[2] - 0.35), fw = frameW(B, d);
    // the cloud's centre sits 0.075 canvas-heights above the canvas centre: shift the card down by that much
    const cyCard = sy + 0.075 * CANW * sz1 * 0.8 * ASPECT;
    fx(out, `bubbleClip${st}`, 1000, 800, (p) => fxBubbleClip(p, st, false), fromScr(B, sx, cyCard, d), CANW * fw * k * sz1, CANW * 0.8 * fw * k * sz1);
    // the tail: 3 dots from the cloud's lower-left rim down to just right of her hat crown
    const t0: P2 = [sx - 0.3 * CWF * sz1, sy + 0.36 * chF * sz1], t1: P2 = [hc[0] + 0.9 * r / ASPECT, hc[1] - 1.3 * r]; // A7: the tail starts from the brim's right tip
    ([[0.15, 0.034], [0.5, 0.024], [0.85, 0.016]] as [number, number][]).forEach(([u, dd], j) => {
      const kj = clamp01((vt(f) - vt(T0) - 1 - j) / 1.5) * (k < 1 ? k : 1); // they pop in one per VIDEO frame after the cloud
      if (kj > 0) fx(out, "tailDot", 128, 128, (p) => fxTailDot(p), fromScr(B, t0[0] + (t1[0] - t0[0]) * u, t0[1] + (t1[1] - t0[1]) * u, d), dd * fw * kj, dd * fw * kj * 0.88);
    });
  }
  glintAt(out, [TH.glintRock[0], 0.16, TH.glintRock[2] + 0.06], f, BEAT.steal1 - 3, 0.6, 12);
};
/** the BOLD 4-point glint (A2): pops 0 -> 1.15 -> 1 over 2 f from f0, holds, fades by life; turns +-0.15 rad */
const glintAt = (out: Stage, w: V3, f: number, f0: number, size: number, life = 12) => {
  const g = f - f0; if (g < 0 || g >= life) return;
  const gi = Math.floor(g), sc = gi === 0 ? 0.55 : gi === 1 ? 1.15 : g > life - 4 ? (life - g) / 4 : 1, t = q(g / (life - 1), 12); // floor: fractional clock
  fx(out, `glint${t}`, 256, 256, (p) => fxGlint(p, t), w, size * sc, size * sc, { soft: true, rot: -0.15 + 0.3 * (g / (life - 1)) });
};
/** trailhead raven on the board's top-right edge (TH.ravenPerch) in shots 1 / 16 (loop clock), 4 and 6 */
/** the raven stands ON the board's top rail (feet and tail on top of it, not half hidden behind it) */
const PERCH: V3 = [TH.ravenPerch[0], TH.ravenPerch[1] + 0.08, TH.ravenPerch[2]];
const thRaven = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const R = PERCH;
  if (id === 1 || id === 16) {
    const tau = id === 16 ? f - (TOTAL - 1) : f, c: RavenX = {};
    // the ruffle on the AUDIO cue (28): body puffs 1.15x, wings spread ~35 % for 7 f, settle with a 2 f overshoot
    // A5 P3: the ruffle moved into the P0 framing (picture 4-15, the raven is in view; AUDIO raven_ruffle_1 -> video ~5)
    if (tau >= 4 && tau < 15) { const k = tau - 4; c.ruffle = k < 7 ? 1.5 * Math.sin((Math.PI * Math.min(k, 3.5)) / 7) : k < 9 ? -0.25 : 0; c.wing = k < 7 ? 0.35 * Math.sin((Math.PI * k) / 7) : 0; }
    if (tau >= -8 && tau < -3) c.ruffle = Math.sin((Math.PI * (tau + 8)) / 5);       // shot 16: one ruffle, settled by 1854
    const toHer = sideOf(cam, R, TH.woman), toBub = sideOf(cam, R, [TH.woman[0] + 0.06, 2.44, TH.woman[2]]);
    if (tau >= BEAT.paperclip + 1 && tau < BEAT.sign1 - 4) { c.head = toBub; c.cock = -16 * toBub; }  // A3: snaps UP at the thought bubble when it pops
    if (tau >= BEAT.sign1 - 4 && tau < BEAT.sign1 + 4) c.head = toHer;               // ... and back to her as it pops out
    if (tau >= -7 && tau < -2) c.head = toHer;                                       // shot 16: a 1 f snap toward her and back before the seam
    if (tau >= 93 && tau < 101) c.hop = Math.sin((Math.PI * (tau - 93)) / 8);         // a small hop on the rail
    if (tau >= 112 && tau < 120) c.head = toHer;
    if (tau >= 120) { c.head = toHer; c.dip = 1; c.cock = toHer * 10; }              // peers down at the rock as she does
    raven(out, cam, tau, R, c);
    return;
  }
  const c: RavenX = {};
  if (id === 4) {
    // a BIG hop on "warning" (8 f), a ruffle on "vandalized", peers down at the flip counter on "14", then snaps its head
    // to the couple with a ruffle during the crane-back (BEAT.piece + 6)
    if (f < BEAT.warning - 2) { const pk = mod(vt(f), 9); c.head = 0; c.dip = pk < 3 ? 1 : pk < 5 ? 0.4 : 0; } // A3: pecks at a chip on the rail
    if (f >= BEAT.warning && f < BEAT.warning + 9) c.hop = 1.6 * Math.sin((Math.PI * (f - BEAT.warning)) / 9);
    if (f >= BEAT.vandalized && f < BEAT.vandalized + 10) c.ruffle = Math.sin((Math.PI * (f - BEAT.vandalized)) / 10);
    if (f >= BEAT.tons14 - 8 && f < BEAT.tons14 - 1) { c.hop = 1.1 * Math.sin((Math.PI * (f - BEAT.tons14 + 8)) / 7); c.head = sideOf(cam, R, [TH.flip.x, TH.flip.y, TH.flip.z]); } // A6 ADD: a hop on "tons" ...
    if (f >= BEAT.tons14 - 1 && f < BEAT.tons14 + 22) { c.head = sideOf(cam, R, [TH.flip.x, TH.flip.y, TH.flip.z]); c.dip = 1; c.cock = f < BEAT.tons14 + 5 ? -14 * c.head : 0; } // ... then the head cocks DOWN at the counter as it lands on 14 (1 f snap, 6 f)
    else if (f >= BEAT.tons14 + 22 && f < BEAT.piece + 6) c.head = 0;
    else if (f >= BEAT.piece + 6) { c.head = sideOf(cam, R, TH.woman); c.dip = 0.6; c.cock = 14 * c.head; }
    if (f >= BEAT.piece + 6 && f < BEAT.piece + 16) c.ruffle = Math.sin((Math.PI * (f - BEAT.piece - 6)) / 10);
  }
  if (id === 6) {
    // mirrors her: cocks its head when she tilts on "steal?" (3 f later), then peers down at the text; ruffles as the
    // tumbleweed rolls past
    if (f >= BEAT.honest + 12 && f < BEAT.honest + 22) c.ruffle = Math.sin((Math.PI * (f - BEAT.honest - 12)) / 10); // carryover: after the woodblock tick
    if (f >= 567 && f < 580) { c.cock = 20; c.head = 0; }
    if (f >= BEAT.steal2 + 1) { c.cock = -sideOf(cam, R, TH.woman) * 22 * clamp01(settle(f, BEAT.steal2 + 1, 6)); c.head = 0; }
    if (f >= BEAT.steal2 + 9) { c.dip = 1; c.head = sideOf(cam, R, TH.woman); }
    if (f >= BEAT.but + 14 && f < BEAT.honest - 6) { c.dip = 0.7; c.head = sideOf(cam, R, TH.woman); }
  }
  // A3: in shot 6 the raven sidesteps ~0.2 m along the top rail toward the couple (two hops)
  // A6 (LEAD P2 "the mystery line has no picture of its own"): the paradox in the bird. A rainbow chip lies on the top
  // rail; the raven sidesteps toward it, eyes it on "honest person", pecks and SNATCHES it on "steal?" (a glint), then
  // holds it in its beak with shifty head snaps (left / right, like the tourists) and hops off right with it
  // A6 LEAD P2: the snatch reads at phone size (chip 1.8x, a 12 f ~80 px star) and the raven EXITS with it before the
  // dissolve: shifty snaps every 2 f, then a take-off (flight card) up-right out of frame by ~video 906
  const ST6 = BEAT.steal2, CH6: V3 = [R[0] - 0.33, R[1] + 0.035, R[2] + 0.03], TO6 = ST6 + 5;
  if (id === 6 && f >= TO6) {
    const k = clamp01((f - TO6) / 7), wv = mod(Math.floor(vt(f)), 4) < 2 ? 1 : -0.6, R0: V3 = [R[0] - 0.1 * 2, R[1], R[2]];
    const pos: V3 = [R0[0] + 2.6 * k ** 1.3, R0[1] + 0.25 + 1.3 * k, R0[2] + 0.15 * k];
    if (k < 1) { const dir = sideOf(cam, R0, [R0[0] + 1, R0[1], R0[2]]);
      fx(out, `fly${wv}d${dir}`, 256, 128, (p) => fxFlyRaven(p, wv, "#1e2233", dir), pos, 0.78, 0.39, { rot: 0.12 });
      fx(out, "chip6r", 96, 96, (p) => fxChip(p, 7), [pos[0] + dir * cam.right.x * 0.3, pos[1] - 0.02, pos[2] + dir * cam.right.z * 0.3 + 0.02], 0.15, 0.13); }
    const t = f - TO6; if (t >= 0 && t < 18) fx(out, "feather", 128, 128, (p) => fxFeather(p), [R0[0] + 0.05 * Math.sin(t * 0.55), R0[1] + 0.12 - 0.035 * t, R0[2] + 0.1], 0.07, 0.07, { rot: 0.7 * Math.sin(t * 0.45) });
    return;
  }
  const hopOff = 0;
  const R6: V3 = id === 6 ? [R[0] - 0.1 * (smooth((f - BEAT.but - 10) / 4) + smooth((f - BEAT.but - 18) / 4)) + hopOff, R[1], R[2]] : R;
  if (id === 6 && ((f >= BEAT.but + 10 && f < BEAT.but + 14) || (f >= BEAT.but + 18 && f < BEAT.but + 22))) c.hop = 0.3 * bump(mod(f - BEAT.but - 10, 8), 0, 4);
  let held6: number | null = null;
  if (id === 6 && f >= ST6 - 13) {
    const hc = sideOf(cam, R6, CH6);
    c.ruffle = 0; c.cock = 0;
    if (f < ST6 - 3) { c.head = hc; c.dip = 0.85; }                                         // eyes the chip
    else if (f < ST6 - 1) { c.head = hc; c.dip = 1; c.hop = 0.12; }                         // the peck (anticipation hop)
    else {                                                                                  // snatched: shifty snaps with it in the beak
      const k = Math.floor((f - (ST6 - 1)) / 2);
      c.dip = 0; c.head = k === 0 ? hc : k === 1 ? -hc : k === 2 ? hc : 0; c.blink = k === 3 ? 0.6 : 0; // shifty snaps, a smug 1 f squint
      if (f >= TO6 - 2) { c.hop = 0.35 * Math.sin((Math.PI * (f - TO6 + 2)) / 4); c.wing = 0.6; }
      held6 = c.head;
    }
  }
  raven(out, cam, f, R6, c);
  if (id === 6) {
    if (held6 === null) fx(out, "chip6r", 96, 96, (p) => fxChip(p, 7), CH6, 0.18, 0.158);
    else { const h = held6, lift = (c.hop ?? 0) * 70, bx = h === 0 ? 300 : 300 + h * 118, by = h === 0 ? 672 - lift : 628 - lift;
      fx(out, "chip6r", 96, 96, (p) => fxChip(p, 7), toWorld(cam, R6, RAVEN_SC, [bx, by], 0.04), 0.16, 0.14); }
    glintAt(out, [CH6[0], CH6[1] + 0.08, CH6[2] + 0.04], f, ST6 - 1, 0.42, 12);
  }
};
/** shot 5 raven: drops from the board top to the right post at 1.8 m (in frame, between the couple, above their
 *  heads), flapping; a 2 f head snap + 12 deg cock toward them on the whisper, a ruffle on "now" */
const whisperRaven = (out: Stage, cam: CamInfo, f: number) => {
  const top = PERCH, low: V3 = [TH.posts[1] + 0.06, 1.95, 0.1], d0 = 464, k = clamp01((f - d0) / 7); // A5: 0.15 m higher, never standing on his hair
  const pos: V3 = f < d0 ? top : [top[0] + (low[0] - top[0]) * k, top[1] + (low[1] - top[1]) * (k * k), top[2] + (low[2] - top[2]) * k];
  // A3: two little sidesteps along the bracket toward the couple on "whispered" (eavesdropping)
  const st = 0.06 * (smooth((f - BEAT.whispered) / 3) + smooth((f - BEAT.whispered - 6) / 3)), toC = sideOf(cam, low, TH.woman) < 0 ? -1 : 1;
  if (f >= d0 + 7) pos[0] -= st * (toC < 0 ? 1 : 0.6);
  const c: RavenX = {};
  if (f >= BEAT.whispered && f < BEAT.whispered + 10) c.hop = 0.25 * bump(mod(f - BEAT.whispered, 6), 0, 3);
  if (f >= d0 - 2 && f < d0 + 9) { c.wing = 0.5 + 0.5 * Math.sin((f - d0) * 2.4); c.head = 0; }
  if (f >= BEAT.whisper - 2) c.head = sideOf(cam, low, TH.woman);
  if (f >= BEAT.whisper - 3 && f < BEAT.whisper - 2) c.head = 0;                     // the 2 f snap: front, then to them
  if (f >= BEAT.now && f < BEAT.now + 10) c.ruffle = Math.sin((Math.PI * (f - BEAT.now)) / 10);
  if (f >= BEAT.now && f < BEAT.now + 2) { c.wing = 0.7; c.hop = 0.35; }                         // A4: a 2 f startled wing flare on "now"
  if (f >= BEAT.whisper - 2 && f < BEAT.now + 12) c.cock = -15 * (c.head || 1);
  // A7 ADD (mirror gag): the raven LEANS in with her toward his ear through the whisper, then snaps upright on "now" (2 f, a 1 f overshoot)
  { const un = dvf(f, BEAT.now), lk = rampV(vt(f), vt(BEAT.whispered) + 4, 10) * (un < 0 ? 1 : 0) - (un >= 0 && un < 3 ? 0.25 * bumpV(un, 0, 3) : 0); if (Math.abs(lk) > 0.01) c.roll = -toC * 0.2 * lk; }
  raven(out, cam, f, pos, c, 1);
  { const t = f - (BEAT.now + 6); if (t >= 0 && t < 22) { // one feather spirals down past his head
    const fw: V3 = [pos[0] - 0.12 - 0.012 * t + 0.07 * Math.sin(t * 0.6), pos[1] + 0.25 - 0.035 * t, pos[2] + 0.15 + 0.05 * Math.cos(t * 0.6)];
    fx(out, "feather", 128, 128, (p) => fxFeather(p), fw, 0.06, 0.06, { rot: 0.8 * Math.sin(t * 0.5) }); } }
};
/** a desert lizard clinging to the right sign post: two push-ups on the paperclip line, a head turn on "steal" */
const lizard = (out: Stage, f: number, tau: number) => {
  const pu = (t0: number) => bump(tau, t0, 5);
  const push = q(Math.max(pu(48), pu(55), pu(80)), 6), head = tau >= BEAT.steal1 - 1 ? -1 : q(0.3 * Math.sin(TAU * tau / 70), 6);
  fx(out, `liz${push}${head}`, 128, 256, (p) => fxLizard(p, push, head), [TH.posts[1] + 0.01, 1.05, 0.012], 0.13, 0.26, { yaw: 0, rot: 0.12 });
  void f;
};
/** blurred trailhead life behind the woman in shots 1 / 16 (loop clock): a couple strolls the trail (one photographs
 *  the logs, flash), a ranger crosses far right */
const thBack = (out: Stage, cam: CamInfo, tau: number) => {
  // A4: the photographer stands 1.5 m right in the clear gap (camera up on the loop clock, flash ~tau 30); the other
  // strolls slowly right -> left across the parking side
  const cpl: [Act, number, number][] = [[TOUR(5, {}, "b"), 1.35, -9.4], [TOUR(6, {}, "b"), 2.3, -9.7]];
  cpl.forEach(([a, x0, z], n) => {
    // A6 P2: on the VIDEO clock (0.5 m/s: ~1.5 m across in 3 s, 10 f steps); the near stroller stops at video ~102 to
    // photograph the logs (camera up, a 4 f flash at video 110), then strolls on
    const P1a = PV(100), P1b = PV(120), stopK = n ? 0 : clamp01((vt(tau) - 100) / 20), walkV = n ? vt(tau) : vt(tau) - 20 * stopK;
    const x = x0 + (n ? 0.25 : -0.5) * (walkV / FPS), p: V3 = [x, 0, z], photo = n === 1 ? ((tau >= 22 && tau < 44) || (tau >= 68 && tau < 82)) : tau >= P1a && tau < P1b; // A6 ADD: a 2nd shot, of the warning board (flash tau 75 = video ~98)
    // they chat as they stroll: head turns toward each other every ~0.8 s (loop clock), then back to the logs
    const chat = mod(Math.floor((tau + 300 + n * 11) / 24), 2) === 1, toward = n ? 1 : -1;
    put(out, cam, a, p, { ...idle(tau, a.i, p), mode: photo ? "stand" : "walk", phase: walkV / 20 + n * 0.3, lift: 1.2, facing: chat ? (toward as -1 | 1) : (n ? 1 : -1), expr: photo ? "focus" : chat ? "grin" : n ? "smile" : "calm",
      look: chat ? toward * 1.2 : 0.7, headTilt: (chat ? toward * 5 : 0) + life(tau, a.i).head, blink: blinkAt(tau, a.i), flutter: flutAt(tau, a.i),
      hands: photo ? [{ a: "eye", hold: "camera" }, { a: "eye", dx: 4 }] : [{ a: "hang" }, n ? (tau >= 86 && tau < 102 ? { a: "point", dy: -14 + 3 * Math.sin(vt(tau) * 0.5) } : { a: "hang" }) : { a: "point", dy: -8 }] }, { rise: 0 });
    if (photo && n === 1) { flash(out, toWorld(cam, p, 1, [300, 300], 0.2), tau, 30, 2, 0.4); flash(out, toWorld(cam, p, 1, [300, 300], 0.2), tau, 75, 2, 0.4); }
    if (photo && n === 0) flash(out, toWorld(cam, p, 1, [300, 300], 0.2), vt(tau), 110, 4, 0.42);
  });
  walker(out, cam, A.ranger, tau, 0, [3.0, 0, -22], 1, 0, 0.55);
};
/** background gaze: cycles through targets [look, lookY, facing] every 40-60 f (own phase), never the lens */
const gazeCycle = (f: number, i: number, tg: [number, number, -1 | 0 | 1][]) =>
  tg[mod(Math.floor((vt(f) + hh(i, 8) * 50) / (40 + 20 * hh(i, 9))), tg.length)];

/** shot 15 (A4): the dusk thief (A4: a red cap + camera, a NEW signature: never the honest headband tourist of shot 10)
 *  stands ON the plaza curb (his shoes show), tosses the tagged bait chip and catches it (a glint at the top), schemes
 *  (shifty glances, hip pops), pockets it; the tag stands out of the pocket corner at chest height ABOVE the caption
 *  band; on "twice" ONLY its number card flips like a split-flap (1 -> squash -> 2 -> open 1.12 -> 1, the tag, chip and
 *  twine stay on screen every frame), a white star pops on the card corner and the tag swings like a pendulum (7 deg,
 *  decaying over ~12 f). His eyes go DOWN-RIGHT to the tag, a double take (shock, brows 1.5x), back to the lens, a
 *  sheepish guilty grin with a shrug (2 f anticipation, 1 f overshoot), then a calm closed smirk with dot eyes that
 *  dissolves cleanly into her reading face */
const T15_RISE = 0.055;
const tagShot = (out: Stage, cam: CamInfo, f: number) => {
  const a = TOUR(4, { camera: "cross", printPale: true, hat: "cap", hatCol: "#d8342c", sunUp: false, glasses: null }, "15");
  const P = TH.tourist, Pr: V3 = [P[0], T15_RISE, P[2]], i = a.i, w = wnd(f, P[0], P[2]);
  const ST = BEAT.stolen, TW2 = BEAT.twice, IN0 = ST + 3, IN1 = ST + 7, SH0 = ST - 12, FL0 = TW2 - 4;
  const lift = ramp(f, ST - 7, 10), inK = clamp01((f - IN0) / (IN1 - IN0)), inside = f >= IN1;
  // A6 P3: the gag buttons: with the grin he TUCKS the tag down into the shirt pocket (video ~2496-2500) and pats it
  // twice (AUDIO: reuse pocket_pats), so no tag ghost crosses her chest in the 15 -> 16 dissolve
  // A7 P2: the tuck on the VIDEO clock: a 2 f lift, then the tag slides ~0.11 m DOWN into the pocket over 7 f (scale >= 0.85,
  // the red '2' stays peeking out through the dissolve)
  const uTk = vt(f) - vt(TW2 + 10), tuck = clamp01(settle(uTk, 2, 7)) - 0.15 * bumpV(uTk, 0, 2);
  const pat = (f >= TW2 + 2 && f < TW2 + 7 ? 5 * Math.abs(Math.sin(((f - TW2 - 2) / 5) * Math.PI)) : 0) + (f >= TW2 + 14 && f < TW2 + 19 ? 5 * Math.abs(Math.sin(((f - TW2 - 14) / 2.5) * Math.PI)) : 0);
  const drop = ramp(f, TW2 + 19, 6);
  // A5 P1: shock 8 f, sheepish 10 f (the shrug peaks inside it), the dot-smirk from TW2 + 16 (just before the dissolve)
  // A6 LEAD P3: the shock reads ~12 f on "twice." (the sheepish grin at ~video 2495)
  const ex: K<Expr>[] = [[-999, "calm"], [SH0, "shifty"], [ST - 2, "smirk"], [TW2 - 2, "shock"], [TW2 + 9, "sheepish"], [TW2 + 17, "dotSmirk"]];
  const e = at(f, ex), L = life(f, i);
  // the toss: the chip hops ~5 cm off his fingers and is caught (a 3 f catch dip)
  // A7 P2: a real toss on the VIDEO clock (0.16 m up, 12 f airtime), his eyes riding it, a glint at the apex
  const T0 = BEAT.soSome + 6, uT0 = vt(f) - vt(T0), tu = clamp01(uT0 / 12), toss = uT0 >= 0 && uT0 < 12 ? 0.16 * 4 * tu * (1 - tu) : 0, catchDip = 4 * bumpV(uT0, 12, 4);
  let look = 0, lookY = 0.7, head = L.head * 0.6;
  if (e === "calm") { look = -0.8; lookY = 0.6 - 1.2 * (toss / 0.16); head -= 3 * (toss / 0.16); } // his eyes (and head) ride the toss
  if (e === "shifty") { const dl = Math.floor((vt(f) - vt(SH0)) / 8) % 2 ? 1.25 : -1.25; look = dl; lookY = 0.1; head += dl * 9; } // A7 P3: 8 video f per look, a 9 deg head turn over his shoulder
  if (e === "smirk") { if (f < ST + 2) { look = -0.8; lookY = 0.6; head -= 5; } else { look = 0.9; lookY = 0.85; head += 5; } } // the pocket, then DOWN-RIGHT at the tag
  if (e === "shock") { const back = f >= TW2 + 3; look = back ? 0 : 0.9; lookY = back ? 0 : 0.85; head += back ? 0 : 5; } // the double take on the flip, then the lens
  if (e === "sheepish") { look = 0.1; lookY = 0.1; head -= 2; }
  if (e === "dotSmirk") { look = 0; lookY = -0.1; }
  // the shrug: 2 f anticipation stretch, the shoulders up (the head sinks) with a 1 f overshoot, settle
  const s0 = TW2 + 3, shrug = f < s0 ? 0 : f < s0 + 2 ? -0.35 * smooth((f - s0) / 2) : f < s0 + 4 ? -0.35 + 1.45 * smooth((f - s0 - 2) / 2) : f < s0 + 5 ? 1.1 : f < s0 + 7 ? 1.0 : f < s0 + 10 ? 1 - smooth((f - s0 - 7) / 3) : 0;
  // the chip hand (index 0 = the chest-pocket side): out beside the body (toss) -> 3 f dip -> chest pocket -> pats
  const dip = 6 * bump(f, ST - 10, 3);
  const hand: Hand = f < IN0
    ? { a: "show", b: "chestPocket", k: lift, dx: -8 * (1 - lift), dy: (24 + catchDip) * (1 - lift) + dip - 6 * lift, hold: null }
    : inside ? { a: "chestPocket", b: "hang", k: drop, dy: -4 + pat - 3 * bump(f, IN1, 2) }
      : { a: "chestPocket", dy: -6 + 6 * inK };
  const hipPop = 4 * (bump(f, SH0, 6) - bump(f, ST - 7, 6));
  // A7 P3: during the shifty look-round the free hand scratches the back of his neck (guilty), then back to the hip
  const scr = e === "shifty" ? clamp01(settle(vt(f) - vt(SH0), 2, 6)) : 0;
  const free: Hand = shrug > 0.05 ? { a: "hip", b: "raise", k: clamp01(shrug), dy: 16, dx: 6, shape: "palm", sz: 0.22 } : scr > 0.02 ? { a: "hip", b: "head", k: scr, dx: 6, dy: 16 + 3 * Math.sin(vt(f) * 1.3), bend: 1.3 } : { a: "hip" };
  // one short 2-video-frame blink on the sheepish swap (no blink eats the payoff holds)
  const bk = vt(f) - vt(TW2 + 9), b2 = bk >= -1 && bk < 1 ? 0.75 : 0;
  const opts = put(out, cam, a, P, { expr: e, look, lookY, blink: Math.max(b2, blinkAt(f, i, [T0 - 6, SH0 - 1, ST - 3, TW2 - 5], [TW2 - 2, TW2 + 10])), nod: 0.45 * bump(f, TW2 - 6.5, 4), // LEAD P3: a blink + a small head dip just before the flip (anticipation)
    breath: L.breath * 1.4, tilt: L.sway * 1.7 + 1.3 * L.shift + hipPop, shift: clamp(L.shift * 1.5 + hipPop / 4, -1, 1),
    headTilt: head, wind: w, flutter: flutAt(f, i, P[0], P[2]), bulge: ramp(f, IN1, 4), squash: 0.35 * bump(f, ST - 10, 3) + 0.45 * shrug,
    face: { browUp: e === "shock" ? [6, 6] : e === "sheepish" ? [2, 0] : undefined, blush: e === "sheepish" ? 0.9 : 0 }, hands: [hand, free],
    hatLag: 2.2 * flutAt(f - 2, i, P[0], P[2]), hairSwing: 2 * w }, { rise: T15_RISE });
  // the chip + tag (one card while in the hand; then the chip slides into the pocket while the tag stands out of it)
  const n = vt(f) >= vt(FL0) + 2 ? 2 : 1;
  // A6 P2: the tag 1.35x (TIMES STOLEN >= 40 px cap, RETURNED >= 30 px at the snap)
  const tint = "rgba(70,30,80,0.12)", r = cam.right, CW = 0.86, TWd = 0.48, TH2 = TWd / 2; // A7 P2: the chip card 1.2x (+ a 1.3x chip in it)
  const hd = handAt(a.o, { ...opts, hands: [{ ...hand }, null] }, 0);
  const wp = toWorld(cam, Pr, 1, [hd[0] + 95 * (CW / 0.56), hd[1] - 30], 0.06);
  wp[1] += toss;
  if (f < IN0) {
    fx(out, `chiptag${n}`, 1024, 512, (p) => { fxChipTag(p, n, true); tintCard(p, 1024, 512, tint); }, wp, CW, CW / 2);
    glintAt(out, [wp[0] - r.x * 0.19 * (CW / 0.56), wp[1] + 0.05, wp[2] - r.z * 0.19 * (CW / 0.56)], vt(f), vt(T0) + 5, 0.26, 8); // at the toss apex
  } else {
    // the pocket's top-right corner (the eyelet's anchor): the tag sticks out sideways from it (its centre at the
    // eyelet's height, so its top clears his chin and its bottom clears the caption band), wobbling about the eyelet
    const R0 = rig(a.o, { ...opts, hands: [{ a: "chestPocket" }, null] }), px = R0.tcx - 0.45 * R0.T.a, py = R0.chin + 0.3 * R0.HH, u = R0.u;
    const piv = toWorld(cam, Pr, 1, R0.fin([px + 11 * u, py - 9 * u]), 0.07);
    // A6 P2: it HANGS from the twine: rest ~12 deg below horizontal, a +-5 deg pendulum at ~1.2 Hz on the gust, and on
    // the flip a 3 f kick + a 10 f damped +-12 deg swing
    const tk = vt(f) - vt(FL0) - 3, kick = tk >= 0 && tk < 3 ? 0.2 * Math.sin((Math.PI * tk) / 3) : 0, swing = tk >= 3 ? 0.21 * Math.exp(-(tk - 3) / 4) * Math.cos((TAU * (tk - 3)) / 8) : 0;
    const ang = (-0.15 + (0.087 * (0.6 + 0.4 * Math.abs(w))) * Math.sin(TAU * 1.2 * (VF / FPS))) * smooth(inK) + kick + swing + 0.02 * (pat / 5);
    const up0 = 1 - smooth(inK), ox = (TWd * 0.5 + 0.02) * (1 - 0.8 * tuck), oy = 0.028 - 0.04 * up0 - 0.05 * tuck;
    const rot2 = (x: number, y: number): [number, number] => [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)];
    const [cx, cy] = rot2(ox, oy);
    const c: V3 = [piv[0] + r.x * cx, piv[1] + cy, piv[2] + r.z * cx];
    const ts = 1 - 0.15 * clamp01(tuck);
    c[1] -= 0.11 * tuck;
    fx(out, `tag${n}`, 768, 384, (p) => { fxTag(p, n, true, true); tintCard(p, 768, 384, tint); }, c, TWd * ts, TH2 * ts, { rot: ang - 0.3 * tuck });
    // the split-flap number card over the slot: it squashes shut on "1", swaps, and opens on "2" with an overshoot
    const fk = Math.floor(vt(f) - vt(FL0)), sy = fk === 0 ? 0.55 : fk === 1 ? 0.12 : fk === 2 ? 0.35 : fk === 3 ? 1.12 : 1; // A7 P2: one VIDEO frame per flap stage
    const [fxo, fyo] = rot2(0.3333 * TWd, 0), tw = toward(cam, c);
    const fc: V3 = [c[0] + r.x * fxo + tw[0] * 0.004, c[1] + fyo, c[2] + r.z * fxo + tw[1] * 0.004];
    fc[1] -= 0.11 * tuck;
    fx(out, `tagflap${n}`, 192, 288, (p) => { fxTagFlap(p, n); tintCard(p, 192, 288, tint); }, fc, 0.229 * TWd * ts, 0.698 * TH2 * sy * ts, { rot: ang - 0.3 * tuck });
    { const [sx, sy2] = rot2(0.3333 * TWd + 0.1 * TWd, 0.3 * TH2); glintAt(out, [c[0] + r.x * sx + tw[0] * 0.01, c[1] + sy2, c[2] + r.z * sx + tw[1] * 0.01], f, FL0 + 3, 0.16, 8); }
    if (!inside) { // the chip slides down into the pocket (its bottom anchored at the pocket's top edge)
      const ch = 0.11 * (1 - inK), top = piv[1] - 0.01;
      fx(out, "chipQ", 128, 128, (p) => { fxChip(p, 21, true, false, 1.3); tintCard(p, 128, 128, tint); }, [piv[0] - r.x * 0.07, top + ch / 2, piv[2] - r.z * 0.07], 0.12, Math.max(0.005, ch));
    }
  }
  // running-gag witness: the raven on top of the flip counter fluffs to roost, snaps toward him on "stolen", ruffles on "twice"
  { const R: V3 = [TH.flip.x - 0.25, TH.flip.y + TH.flip.h / 2 + 0.01, TH.flip.z], c: RavenX = {}; // A5: far-left end of the counter
    if (f >= ST - 8 && f < ST - 5) c.ruffle = 1.2 * Math.sin((Math.PI * (f - ST + 8)) / 3);
    if (f >= ST - 2) { c.head = sideOf(cam, R, P); c.cock = 10 * c.head; }
    if (f >= TW2 && f < TW2 + 6) { const k = (f - TW2) / 6; c.ruffle = Math.sin(Math.PI * k); c.hop = 0.6 * Math.sin(Math.PI * Math.min(1, 1.5 * k)); c.wing = k < 0.5 ? 0.5 : 0; } // A7 ADD: a startled hop + wing flick on the ding
    // A6 P3 (two ravens in the 15 -> 16 match dissolve): in the pull-back it flaps up from the counter to the board-top
    // perch (TH.ravenPerch) and settles there in the frame-0 pose, so ONE bird sits on ONE perch through the dissolve
    const FY0 = TW2 + 6, FY1 = TW2 + 14;
    if (f < FY0) raven(out, cam, f, R, c, 6);
    else if (f < FY1) { const k = smooth((f - FY0) / (FY1 - FY0)), wv = mod(Math.floor(vt(f)), 4) < 2 ? 1 : -0.6, dir = sideOf(cam, R, PERCH);
      fx(out, `fly${wv}d${dir}`, 256, 128, (p) => fxFlyRaven(p, wv, "#1e2233", dir), [R[0] + (PERCH[0] - R[0]) * k, R[1] + (PERCH[1] + 0.3 - R[1]) * k + 0.35 * Math.sin(Math.PI * k), R[2] + (PERCH[2] - R[2]) * k], 0.72, 0.36, { rot: 0.1 * dir }); }
    else raven(out, cam, f, PERCH, { head: 0, hop: f < FY1 + 3 ? 0.4 * Math.sin((Math.PI * (f - FY1)) / 3) : 0, wing: f < FY1 + 2 ? 0.5 : 0 }, 6); }
  // A5 ADD: three small bats flit across the dusk sky over the MS (2 wing drawings on 2s, erratic little loops)
  for (let k = 0; k < 3; k++) { const v = vt(f), a0 = (TAU * v) / (46 + 9 * k) + k * 2.1, c: V3 = [P[0] - 1.6 + 1.3 * k + 0.9 * Math.cos(a0), 3.6 + 0.35 * k + 0.25 * Math.sin(a0 * 2.3), P[2] - 5.5 - 0.8 * k + 0.6 * Math.sin(a0)];
    const w = Math.floor(v / 2 + k) % 2 ? 1 : -0.7, dir = Math.cos(a0) > 0 ? -1 : 1;
    fx(out, `bat${w}d${dir}`, 256, 128, (p) => { p.g.filter = "blur(4px)"; fxFlyRaven(p, w, "#2a1f3a", dir); p.g.filter = "none"; }, c, 0.26, 0.13, { rot: 0.4 * Math.sin(a0 * 3) }); }
  // dusk life behind him: a stroller heads for the parking lot; far back right a bucket-hat tourist lifts his camera to
  // the sunset (a small white flash); A4: a chatting pair packing up (alternating head turns, one holds a map)
  // A5 R5 (P3: in the MCU he was half cut by the right edge, x 900-1080): 1.7 m further left, so he crosses the MS
  // whole and walks on BEHIND the tourist's body through the MCU (never at the frame edge)
  walker(out, cam, TOUR(2, { glasses: null }, "d"), f, 1807, [0.7, 0, -5.0], -1, 0, 1.2);
  { const a2 = TOUR(7, { hat: "bucket", hatCol: "#f2c230", printPale: true }, "d"), p2: V3 = [-1.35, 0, -6.3], FL = ST - 6, up = ramp(f, FL - 8, 5) * (1 - ramp(f, FL + 10, 6));
    const sd2 = sideOf(cam, p2, [-6, 0, -30]);
    const o2: PersonOpts = { ...idle(f, a2.i, p2), facing: sd2, expr: up > 0.5 ? "focus" : "smile", look: sd2, lookY: -0.3, blink: blinkAt(f, a2.i), noCam: up > 0.3,
      hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] };
    put(out, cam, a2, p2, o2);
    flash(out, toWorld(cam, p2, 1, handAt(a2.o, { ...o2, seed: seedOf(a2.i), light: light2D(cam) }, 0), 0.25), f, FL, 3, 0.35); }
  ([[5, [2.65, 0, -7.6]], [0, [3.25, 0, -7.35]]] as [number, V3][]).forEach(([v, p3], k) => {
    const a3 = TOUR(v, { glasses: null }, "dp"), other: V3 = k ? [2.65, 0, -7.6] : [3.25, 0, -7.35];
    const talk = mod(Math.floor((vt(f) + k * 13) / 24), 2) === k, so = sideOf(cam, p3, other);
    put(out, cam, a3, p3, { ...idle(f, a3.i, p3), facing: talk ? so : (-so as -1 | 1), expr: talk ? "grin" : "smile", look: talk ? so * 1.2 : -so * 0.6, headTilt: (talk ? so * 5 : 0) + life(f, a3.i).head,
      blink: blinkAt(f, a3.i), hands: k ? [{ a: "show", hold: "map" }, { a: talk ? "point" : "hang", dy: -6 }] : [{ a: "strap" }, { a: "hip" }] });
  });
};

/** A6 LEAD P2 (shot 4 gag inserts, "mostly a small piece at a time"): three tourists at TH.pock[0..2] each pocket a chip
 *  with a sideways glance, one after the other, 14 VIDEO f apart from "mostly" + 2 (CAM cuts a quick hand-to-pocket CU
 *  on each). POCK4_V[k] = the video frame the hand reaches the pocket. Before their turn they read the sign / chat /
 *  look round (idle life on the video clock); the gag (video frames from the contact v): -18 the chip comes up to the
 *  chest (big, a glint at -15), -10 a 1 f glance LEFT, -6 RIGHT, -3 a 2 f lift, -3..+1 the hand slides into the hip
 *  pocket, +1..+4 a pat (dust puff) + the pocket bulge, then a smug innocent look and the hand back to the hip */
// A7 P2 (in the pair MS pock[0] had already pocketed off-screen): pock[1] pockets in the CU on "mostly"; in the pair MS
// pock[0] goes first (a back-pocket slip ~v0 + 32) and pock[2] admires his chip at eye level, then pockets it ON "piece"
const POCK4_V = () => { const v0 = Math.round(vt(PW(8, "mostly"))) + 2; return [v0 + 32, v0 + 14, Math.round(vt(PW(8, "piece")))]; };
const pock4 = (out: Stage, cam: CamInfo, f: number) => {
  const V4 = POCK4_V(), vf = Math.round(vt(f));
  const fits: [number, Partial<Outfit>][] = [[2, { glasses: null, hat: "visor", hatCol: "#f4f1ea", shirt: "#e8664a" }], [5, { hat: "cap", hatCol: "#d8342c", camera: "neck" }], [7, { hat: "bucket", hatCol: "#f2c230", print: "palm", shirt: "#c8551e" }]];
  TH.pock.forEach((P, k) => {
    const a = TOUR(fits[k][0], fits[k][1], "pk"), i = a.i, L = life(f, i), v = vf - V4[k];
    const sb = sideOf(cam, P, [TH.board.cx, TH.board.cy, TH.board.z]);
    const back = k === 0, admire = k === 2 && v >= -22 && v < -12; // pock[0]: the BACK pocket; pock[2]: the chip up at eye level first
    const show = v >= (k === 2 ? -24 : -18) && v < -3, into = v >= -3 && v < 2, pat = v >= 1 && v < 7, after = v >= 2;
    const kIn = into ? smooth((v + 3) / 4) : 0, rest = after ? clamp01((v - 11) / 6) : 0, PKT: Hand["a"] = back ? "behind" : "pocket";
    const hand: Hand = show ? { a: "hang", b: admire ? "show" : "chest", k: clamp01((v + (k === 2 ? 24 : 18)) / 4), dx: 6, dy: (admire ? -34 : -4) - 5 * bump(v, -4, 2), hold: "chip", n: 4 | 2 * (v >= -17 && v < -12 ? 1 : 0) }
      : into ? { a: "chest", b: PKT, k: kIn, dx: 6 * (1 - kIn), dy: -4 * (1 - kIn), hold: kIn < 0.75 ? "chip" : null, n: 4 }
        : after ? { a: PKT, b: "hip", k: rest, dy: pat ? -6 * bump(v, 1, 3) - 6 * bump(v, 4, 3) : 0 } : { a: "hang", dy: 1.5 * Math.sin(TAU * (vf + 9 * k) / 40) };
    // gaze: reading the board (saccades) -> the chip -> left -> right -> down at the pocket -> smug at nobody
    let look = sb * (0.8 + 0.25 * (Math.floor(mod(vf + 7 * k, 27) / 9) - 1)), lookY = -0.9, head = L.head * 0.8 + sb * 3, facing: -1 | 0 | 1 = sb;
    let expr: Expr = mod(Math.floor((vf + 31 * k) / 50), 3) === 1 ? "smile" : "read";
    if (show) { expr = "grin"; look = 0.4; lookY = admire ? -0.4 : 0.75; head = L.head * 0.6 - (admire ? 0 : 3); }
    if (v >= -12 && v < -7) { expr = "shifty"; look = -1.35; lookY = 0; head -= 6; facing = -1; }
    else if (v >= -7 && v < -3) { expr = "shifty"; look = 1.35; lookY = 0; head += 6; facing = 1; }
    else if (into) { expr = "shifty"; look = 0.7; lookY = 0.95; head += 2; }
    else if (after && v < 22) { expr = "smug"; look = v < 12 ? 0 : sb * 0.8; lookY = v < 12 ? 0 : -0.5; head += v < 12 ? 2 : 0; }
    const po = put(out, cam, a, P, { ...idle(f, i, P), expr, look, lookY, facing, headTilt: head, breath: L.breath * 1.4, tilt: L.sway * 1.4 + 0.9 * L.shift + (into ? 3 : 0),
      squash: pat ? 0.35 * bump(v, 1, 3) : 0, bulge: after ? clamp01((v - 1) / 2) : 0, flutter: flutAt(f, i, P[0], P[2]),
      blink: v >= -13 && v < -12 ? 0.6 : blinkAt(f, i, [], [PV(V4[k] - 12)]), hands: [{ a: "hip", dy: 1.5 * Math.sin(TAU * (vf + 13 * k) / 46) }, hand] });
    const hp = () => toWorld(cam, P, 1, handAt(a.o, { ...po, hands: [null, hand] }, 1), 0.1);
    if (v >= -17 && v < -11) glintAt(out, (() => { const w = hp(); return [w[0], w[1] + 0.06, w[2]] as V3; })(), vf, V4[k] - 17, 0.24, 6);
    if (pat) puff(out, (() => { const w = hp(); return [w[0], w[1] - 0.05, w[2]] as V3; })(), vf, V4[k] + 1, 6);
  });
};
/** A7 P1 (the red cap at the right of the 4 -> 5 dissolve vanished into a different figure): shot 4's photographer
 *  (flashes on "warning:" / "Warning!", pockets a chip on "a small piece", whistles) strolls off right on the VIDEO
 *  clock from picture 445, still whistling; shot 5 draws the same stroll, so both sides of the match dissolve agree */
const redcap4 = (out: Stage, cam: CamInfo, f: number) => {
  const ph = TOUR(0, { camera: "neck" }, "4"), st = 0.55 * Math.max(0, vt(f) - vt(445)) / FPS, pp: V3 = [1.95 + 0.08 * clamp01((f - S(4).a) / 60) + st, 0, -3.7], strolling = st > 0;
  const up = ramp(f, BEAT.warning - 8, 5) * (1 - ramp(f, BEAT.warning + 10, 6)) + ramp(f, BEAT.vandalized + 10, 5) * (1 - ramp(f, BEAT.vandalized + 28, 6));
  const stoop = bump(f, 418, 12), pk = ramp(f, 424, 5);
  const g4 = gazeCycle(f, ph.i, [[0.6, 1, 1], [-1.2, 0, -1], [0.8, -0.5, 1]]);
  const phHands: [Hand, Hand] = f >= 416 && f < 440 ? [{ a: "hang", b: stoop > 0.4 ? "ground" : "pocket", k: stoop > 0.4 ? stoop : pk, hold: f >= 420 && f < 427 ? "chip" : null }, { a: "hip" }]
    : [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }];
  const phO = put(out, cam, ph, pp, { ...idle(f, ph.i, pp), mode: stoop > 0.55 ? "squat" : strolling ? "walk" : "stand", phase: st / 0.55 * 1.5, lift: 0.8, expr: up > 0.5 ? "focus" : f >= 427 && (f < 445 || strolling) ? "whistle" : f >= 416 ? "shifty" : "smile",
    facing: up > 0.5 ? 1 : strolling ? sideOf(cam, pp, [pp[0] + 1, 0, pp[2]]) : g4[2], look: up > 0.5 ? 0.4 : f >= 416 && f < 427 ? (Math.floor(vt(f) / 9) % 2 ? 1.3 : -1.3) : g4[0], lookY: up > 0.5 ? -0.6 : g4[1], blink: blinkAt(f, ph.i),
    tilt: life(f, ph.i).sway + 8 * stoop, hands: phHands });
  flash(out, toWorld(cam, pp, 1, [300, 310], 0.2), f, BEAT.warning + 2, 3);
  flash(out, toWorld(cam, pp, 1, [300, 310], 0.2), f, BEAT.vandalized + 18, 3);
  notes(out, cam, pp, headAt(ph.o, phO), f, [428, 436], 1);
};
const trailhead = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (id === 1 || id === 16) {
    const tau = id === 16 ? f - (TOTAL - 1) : f;
    womanHook(out, cam, id, f); thBack(out, cam, tau); void lizard; // the trailhead lizard is the 3D one in sets_ext
    if (id === 1) hookFx(out, cam, f);
  }
  if (id === 4 || id === 5 || id === 6) { woman(out, cam, id, f); fiance(out, cam, id, f); }
  if (id === 15) tagShot(out, cam, f);
  if (id === 5) whisperRaven(out, cam, f);
  else if (id !== 15) thRaven(out, cam, id, f);
  if (id === 4) {
    // behind the sign (z -4.5): a red-cap tourist photographs it (flash on "warning" and on "vandalized"), checks his
    // camera screen, chats; on "a small piece at a time" he stoops, pockets a chip and whistles two notes; a visor tourist
    // with a fold-out map points up at it and checks the map; a ranger pins a flyer on the kiosk; a hiker drinks at the
    // fountain. Nobody stares at the lens.
    // A5 P2: his mark is the open ground between the right post and the bin (S4B x ~780 at 1080), >= 200 px clear of both
    // A5 R5 (render check: at video 575 his head still sat on the black bin's rim, the bins stand between him and the
    // lens): he stands IN FRONT of the bins (z -3.7, bins at -4.4), searched clear of the right post (>= 50 px), both of
    // the couple and the fountain hiker in BOTH wides (picture 248-276 and 414-445; tools/grid4.mjs)
    redcap4(out, cam, f);
    { const mapT = gazeCycle(f + 17, 21, [[-0.5, -0.8, -1], [0.3, 1, -1]]);
      walker(out, cam, TOUR(1, {}, "4"), f, S(4).a + 120, [1.4, 0, -4.7], -1, 0, 0.5, { hands: [{ a: "show", hold: "map" }, { a: "point", dy: -14 + 4 * Math.sin(VF * 0.25) }], expr: mapT[1] > 0 ? "focus" : "smile", look: mapT[0], lookY: mapT[1] }); }
    { const rp: V3 = [-3.25, 0, -8.85], L = life(f, A.ranger.i), pin = Math.sin(VF * 0.9) * 2, tr = f >= BEAT.vandalized + 2 && f < BEAT.vandalized + 22, sr4 = sideOf(cam, rp, TH.woman);
      put(out, cam, A.ranger, rp, { view: tr ? "front" : "back", facing: tr ? sr4 : 0, expr: "skeptic", look: sr4 * 1.3, breath: L.breath, tilt: L.sway, shift: L.shift, headTilt: L.head + (tr ? sr4 * 4 : 0), wind: wnd(f, rp[0], rp[2]),
        blink: blinkAt(f, A.ranger.i, [BEAT.vandalized + 2]), hands: tr ? [{ a: "hang", hold: "clipboard" }, { a: "hip" }] : [{ a: "board", dy: pin }, { a: "board", dx: 10, dy: -pin }] }); }
    { const hp: V3 = [3.1, 0, -5.75], bend = 0.5 + 0.5 * Math.sin(VF * 0.08), sdh = sideOf(cam, hp, [2.0, 0, -5.9]);
      put(out, cam, A.hiker, hp, { ...idle(f, A.hiker.i, hp), facing: sdh, expr: bend > 0.6 ? "focus" : "calm", tilt: 14 * bend * sdh, look: sdh * 1.2, lookY: 1, blink: blinkAt(f, A.hiker.i),
        hands: [{ a: "hang" }, { a: "reach", dy: -10 }] }); }
    pock4(out, cam, f);
  }
  if (id === 5) {
    // blurred life far behind the couple (kept to the frame edges, out of the gap between their heads): a stroller, a
    // photographer (flash), a ranger who turns his head toward them on "now" (paranoia), and far left a tourist pair
    // that copies the whisper (one leans in, hand at mouth: a rewatch clue)
    walker(out, cam, TOUR(3, {}, "5"), f, S(5).a + 60, [-2.0, 0, -10], 1, 0, 0.7);
    redcap4(out, cam, f); // A7 P1: shot 4's red cap continues his whistling stroll through the match dissolve
    { // A3: the photographer in the right gap under the lamp (screen x ~950 at 1080), camera up 6 f before the shutter
      const a2 = TOUR(1, {}, "5"), p2: V3 = [1.15, 0, -6.5], /* A6 P3: 0.7 m right, out of the whisper gap */ SH = BEAT.whisper - 1 /* A4: in the LEFT gap (x ~0.08 W), never behind his head */, up = ramp(f, SH - 12, 5) * (1 - ramp(f, SH + 14, 6)), sd2 = sideOf(cam, p2, TH.woman);
      const ho: PersonOpts = { ...idle(f, a2.i, p2), facing: sd2, expr: up > 0.5 ? "focus" : "smile", blink: blinkAt(f, a2.i), noCam: up > 0.3,
        hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] };
      put(out, cam, a2, p2, ho);
      flash(out, toWorld(cam, p2, 1, handAt(a2.o, { ...ho, seed: seedOf(a2.i) }, 0), 0.3), f, SH, 3, 0.55); }
    { const rp: V3 = [4.5, 0, -12.5], Lr = life(f, A.ranger.i), turn = f >= BEAT.now - 1; // A4: visible between her hat and the post
      put(out, cam, A.ranger, rp, { breath: Lr.breath, tilt: Lr.sway, shift: Lr.shift, headTilt: Lr.head + (turn ? 5 : 0), expr: turn ? "skeptic" : "calm",
        facing: turn ? (sideOf(cam, rp, TH.woman)) : -1, look: turn ? sideOf(cam, rp, TH.woman) * 1.3 : -0.8, blink: blinkAt(f, A.ranger.i), hands: [{ a: "hip" }, { a: "hip" }] }); }
    { const c1 = TOUR(7, {}, "5c"), c2 = TOUR(2, { glasses: null }, "5c"), q1: V3 = [3.6, 0, -6.5], q2: V3 = [4.05, 0, -6.75]; // A4: in the gap between the post and him (x 0.58-0.68 W)
      const ws = f >= BEAT.whispered + 10 && f < BEAT.nowEnd + 6, s1 = sideOf(cam, q1, q2), wk = ramp(f, BEAT.whispered + 10, 4) * (1 - ramp(f, BEAT.nowEnd + 6, 4));
      put(out, cam, c1, q1, { ...idle(f, c1.i, q1), expr: ws ? "scheme" : "smile", facing: s1, look: s1 * 1.3, tilt: 9 * wk * s1, headTilt: 6 * wk * s1, blink: blinkAt(f, c1.i),
        hands: s1 < 0 ? [ws ? { a: "whisper", shape: "mitten", split: true } : { a: "hang" }, { a: "hang" }] : [{ a: "hang" }, ws ? { a: "whisper", shape: "mitten", split: true } : { a: "hang" }] });
      const GT = PW(10, "get"), pk5 = ramp(f, GT, 4) * (1 - ramp(f, BEAT.nowEnd + 8, 6)), sn5 = f >= GT - 4 && f < GT + 2;
      put(out, cam, c2, q2, { ...idle(f, c2.i, q2), expr: sn5 || pk5 > 0.05 ? "shifty" : ws ? "listen" : "calm", facing: sn5 ? (Math.floor(vt(f) / 3) % 2 ? 1 : -1) : (-s1 as -1 | 1), look: sn5 ? (Math.floor(vt(f) / 3) % 2 ? 1.3 : -1.3) : -s1 * 0.9, blink: blinkAt(f, c2.i),
        hands: [{ a: "hang" }, { a: "hang", b: "pocket", k: pk5, hold: f >= GT - 6 && f < GT + 3 ? "chip" : null }], bulge: ramp(f, GT + 3, 3) }); } // A5 ADD: pockets one ON "get ours now"
  }
  if (id === 6) {
    // two tourists read the kiosk map (one points off toward the logs); on "honest" both turn their heads toward the
    // couple as if overhearing, then back; on "steal?" one slips a chip into his pocket behind their backs (side glance);
    // a ranger crosses far left
    // A3: they amble right through the gap left of the board's left post (0.65 m/s, so they stay in it as the arc pans)
    // A4: they stand at the kiosk map in the clear gap left of her (x ~0.1-0.2 W from "honest" to "steal?"), never
    // behind her dress; a slow drift keeps them in the gap as the camera arcs
    const gx = -2.25 + 0.12 * ((f - BEAT.honest) / FPS);
    const k1 = TOUR(6, {}, "6"), k2 = TOUR(7, {}, "6"), p1: V3 = [gx - 0.75, 0, -7.6], p2: V3 = [gx, 0, -6.4];
    const L1 = life(f, k1.i), L2 = life(f, k2.i), hear = f >= BEAT.honest + 1 && f < BEAT.honest + 19;
    const tw = sideOf(cam, p1, TH.woman), pkt = ramp(f, BEAT.steal2 - 2, 5) * (1 - ramp(f, BEAT.steal2 + 14, 5)), sneak = pkt > 0.05;
    const ph6 = gx / 0.7;
    put(out, cam, k1, p1, { view: hear ? "front" : "back", facing: hear ? tw : 1, expr: hear ? "skeptic" : "smile", look: tw * 1.3, breath: L1.breath, tilt: L1.sway + 2, shift: L1.shift, headTilt: L1.head + (hear ? tw * 5 : 0),
      mode: hear ? "stand" : "walk", phase: ph6, lift: 0.7, wind: wnd(f, p1[0], p1[2]), blink: blinkAt(f, k1.i, [BEAT.honest + 1]), hands: [{ a: "hang" }, hear ? { a: "hang" } : { a: "show", hold: "map" }] });
    put(out, cam, k2, p2, { view: hear || sneak ? "front" : "back", facing: hear ? tw : sneak ? (Math.floor(vt(f) / 4) % 2 ? 1 : -1) : 1, expr: sneak ? "shifty" : hear ? "listen" : "smile",
      look: sneak ? (Math.floor(vt(f) / 4) % 2 ? 1.3 : -1.3) : tw * 1.2, breath: L2.breath, tilt: L2.sway + 2, shift: L2.shift, headTilt: L2.head + 4, wind: wnd(f, p2[0], p2[2]), blink: blinkAt(f, k2.i, [BEAT.honest + 1]),
      mode: hear || sneak ? "stand" : "walk", phase: ph6 + 0.4, lift: 0.7,
      hands: [{ a: "hang" }, sneak ? { a: "chest", b: "pocket", k: pkt, hold: pkt < 0.8 ? "chip" : null } : f > BEAT.honest - 3 ? { a: "point", dy: -6 } : { a: "hang" }] });
    walker(out, cam, A.ranger, f, S(6).a + 40, [-7.5, 0, -19], 1, 0.15, 0.9, f >= BEAT.steal2 - 4 ? { expr: "skeptic", look: 1.3, headTilt: 5 } : {}); // A4: eyes the couple on "steal?"
    glintAt(out, [TH.glintRock[0], 0.16, TH.glintRock[2] + 0.06], f, BEAT.steal2, 0.42, 9);
    // the "?" bubble pops on "why" (2 f), wobbles +-3 deg at 0.5 Hz, pops out before the dissolve
    { const W0 = PW(11, "why"), W1 = S(6).b - 4, tv = vt(f) - vt(W0); // A5 P2: the pop lands in view (video ~787), 0 -> 1.15 -> 1 in 4 f
      if (tv >= 0 && f < W1 + 2) { const k = tv < 1 ? 0.35 : tv < 2 ? 0.8 : tv < 3 ? 1.15 : f >= W1 ? 0.5 : 1;
        // A6 P3: a visible +-3 px bob at 0.5 Hz, a 5 f 1.15x pulse on "honest" and "steal?", a 4 deg wobble toward the raven on the snatch
        const pulse = 1 + 0.15 * Math.max(bump(f, BEAT.honest - 1, 5), bump(f, BEAT.steal2 - 1, 5)), bob = 0.018 * Math.sin((TAU * 0.5 * vt(f)) / FPS);
        const wob = 0.07 * sideOf(cam, [TH.base[0] - 0.45, 1.92, 1.82], PERCH) * bump(f, BEAT.steal2, 10);
        // A7 P2 / mystery beat: 1.45x bigger (~230 px at 1080), +-4 deg wobble; a second, smaller "?" pops on "honest"
        fx(out, "qmark", 256, 256, (p) => fxQuestion(p), [TH.base[0] - 0.5, 2.0 + bob, 1.82], 0.44 * k * pulse, 0.44 * k * pulse, { rot: 0.07 * Math.sin((TAU * 0.5 * tv) / FPS) - wob });
        const t2 = vt(f) - vt(BEAT.honest) + 1;
        if (t2 >= 0) { const k2 = t2 < 1 ? 0.35 : t2 < 2 ? 0.8 : t2 < 3 ? 1.15 : f >= W1 ? 0.5 : 1;
          fx(out, "qmark", 256, 256, (p) => fxQuestion(p), [TH.base[0] + 0.42, 2.12 - bob, 1.78], 0.27 * k2, 0.27 * k2, { rot: -0.07 * Math.sin((TAU * 0.5 * t2) / FPS + 1) + 0.12 }); } } }
  }
};
/** someone walking along a straight line through `mid` (passed at frame f0) in direction (dx, dz) */
const walker = (out: Stage, cam: CamInfo, a: Act, f: number, f0: number, mid: V3, dx: number, dz: number, v = 1.25, extra: PersonOpts = {}) => {
  const s = v * ((vt(f) - vt(f0)) / FPS), p: V3 = [mid[0] + dx * s, 0, mid[2] + dz * s]; // A5: real speed on the video clock
  const front = seesFront(cam, p, dx, dz), fs = sideOf(cam, p, [p[0] + dx, 0, p[2] + dz]);
  put(out, cam, a, p, { ...idle(f, a.i, p), mode: "walk", phase: s / 1.0 + hh(a.i, 9), view: front ? "front" : "back", tilt: fs * 3 + life(f, a.i).sway * 0.5,
    facing: fs, expr: "calm", look: 0.6 * fs, blink: blinkAt(f, a.i), ...extra });
};

const vista = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const mid = Math.round((S(id).a + S(id).b) / 2);
  // strollers along the paved trail (direction from the local trail segment), 1.2-1.4 m/s with a step bob
  const tr = VISTA.trail;
  const dirAt = (p: V3) => {
    let best = 0, bd = Infinity;
    for (let k = 0; k + 1 < tr.length; k++) { const c = [(tr[k][0] + tr[k + 1][0]) / 2, (tr[k][2] + tr[k + 1][2]) / 2]; const d = Math.hypot(c[0] - p[0], c[1] - p[2]); if (d < bd) { bd = d; best = k; } }
    const d = [tr[best + 1][0] - tr[best][0], tr[best + 1][2] - tr[best][2]], l = Math.hypot(d[0], d[1]);
    return [d[0] / l, d[1] / l];
  };
  VISTA.walkers.forEach((w, k) => {
    const [dx, dz] = dirAt(w), sgn = k % 2 ? -1 : 1, a = TOUR(k + 1, {}, "v");
    // two of them chat as they walk (head turns toward each other)
    const chat = k === 1 || k === 2 ? (Math.floor((vt(f) + k * 11) / 20) % 2 ? 1 : -1) : 0;
    walker(out, cam, a, f, mid, w, dx * sgn, dz * sgn, 1.2 + 0.07 * k, k === 3 ? { hands: [{ a: "hang" }, { a: "point", dy: -6 }], expr: "smile" }
      : chat ? { expr: "smile", look: chat * 1.2, headTilt: chat * 5 } : {});
  });
  // a companion pair: one points at the big log, the other photographs it (flash)
  const ph: V3 = [-13.4, 0, -38.6], pt: V3 = [-14.4, 0, -37.2], log: V3 = [-15.5, 0, -40];
  {
    // A6 P2 (shot 2 read as a posed line-up): he takes TWO shots (camera up, flashes ~video 236 / 256), checks the
    // screen between them and turns to his friend; she points at the log, then turns to chat (head turns every ~20 f)
    const F1 = id === 2 ? 165 : mid - 6, F2 = id === 2 ? 178 : mid + 30;
    const a = TOUR(5, {}, "v"), up = Math.max(ramp(f, F1 - 5, 4) * (1 - ramp(f, F1 + 3, 4)), ramp(f, F2 - 5, 4) * (1 - ramp(f, F2 + 3, 4))), sd = sideOf(cam, ph, log), so = sideOf(cam, ph, pt);
    const chk = up < 0.1 && f > F1 + 6 && f < F2 - 5;
    put(out, cam, a, ph, { ...idle(f, a.i, ph), expr: up > 0.5 ? "focus" : chk ? "grin" : "smile", facing: chk ? so : sd, look: chk ? so * 1.2 : sd, lookY: up < 0.1 && !chk ? 0.6 : 0, blink: blinkAt(f, a.i), noCam: up > 0.3,
      hands: [{ a: "hang", b: up > 0.02 ? "eye" : "show", k: up > 0.02 ? up : 0.8, hold: "camera" }, { a: "hang", b: "eye", k: up, dx: 6 }] });
    for (const F0 of [F1, F2]) flash(out, toWorld(cam, ph, 1, handAt(a.o, { hands: [{ a: "eye" }, null], facing: sd }, 0), 0.1), f, F0, 3, 0.5);
    const b = TOUR(0, {}, "v"), sb = sideOf(cam, pt, log), sp = sideOf(cam, pt, ph), talk = Math.floor((vt(f) + 9) / 20) % 2 === 1;
    put(out, cam, b, pt, { ...idle(f, b.i, pt), expr: talk ? "smile" : "grin", facing: talk ? sp : sb, look: talk ? sp * 1.2 : sb, headTilt: life(f, b.i).head + (talk ? sp * 5 : 0), blink: blinkAt(f, b.i),
      hands: [sb < 0 && !talk ? { a: "point", dy: 4 * Math.sin(VF * 0.3) } : { a: "hip" }, sb > 0 && !talk ? { a: "point", dy: 4 * Math.sin(VF * 0.3) } : { a: "hip" }] });
  }
  // a tourist poses by a log while another frames the shot (camera up, flash)
  {
    const pose: V3 = [-5.2, 0, -45.2], cam2: V3 = [-6.6, 0, -43.0];
    const a = TOUR(6, {}, "v"), b = TOUR(3, {}, "v"), sd = sideOf(cam, cam2, pose);
    put(out, cam, a, pose, { ...idle(f, a.i, pose), expr: "grin", facing: -sd as -1 | 1, blink: blinkAt(f, a.i), hands: [{ a: "hip" }, { a: "raise", shape: "thumb" }] });
    put(out, cam, b, cam2, { ...idle(f, b.i, cam2), expr: "focus", facing: sd, blink: blinkAt(f, b.i), hands: [{ a: "eye", hold: "camera" }, { a: "eye", dx: 4 }] });
    flash(out, toWorld(cam, cam2, 1, [300 + sd * 40, 300], 0.15), f, mid + 8, 2, 0.5);
  }
  // a hiker with a backpack on the far trail; a ranger patrols further down (no patch, no logo)
  walker(out, cam, A.hiker, f, mid, [-10.8, 0, -47], -0.28, 0.96, 1.15, { hands: [{ a: "hang", dy: -16, hold: "pole", ang: 12 + 10 * Math.sin(VF * 0.5) }, { a: "hang", dy: -16, hold: "pole", ang: -12 + 10 * Math.sin(VF * 0.5 + 3) }] });
  walker(out, cam, A.ranger, f, mid, [-15.5, 0, -56], 0.92, -0.39, 1.0);
  // three adults admire the third log (one points at its rainbow cut face, one turns to chat with the others)
  if (id === 2) [[4, -2.5, -43.6], [7, -1.9, -43.9], [2, -3.1, -43.9]].forEach(([v, x, z], n) => {
    const a = TOUR(v, n === 2 ? { glasses: null } : {}, "pl"), p: V3 = [x, 0, z], talk = n === 1 && Math.floor(vt(f) / 18) % 2 === 1;
    put(out, cam, a, p, { view: talk ? "front" : "back", facing: talk ? -1 : 0, expr: "smile", breath: life(f, a.i).breath, tilt: life(f, a.i).sway, shift: life(f, a.i).shift,
      headTilt: life(f, a.i).head, wind: wnd(f, x, z), blink: blinkAt(f, a.i), hands: [{ a: "hang" }, n === 0 ? { a: "point", dy: -10 } : { a: "hang" }] });
  });
  if (id === 2) {
    // two ravens circle high in the upper-right sky (25-30 m out, 90 f period), gliding with a 3 f flap every 12 f
    for (const k of [0, 1]) {
      // A4: in the crane's sky (upper ~18 % of the frame at the top of the move), ~40 m out over the badlands
      const v = vt(f), a = (TAU * v) / 120 + k * Math.PI, c: V3 = [-2 + 3.2 * Math.cos(a), 14 + 0.9 * k + 0.5 * Math.sin(a * 2), -50 + 3.2 * Math.sin(a)];
      const fm = mod(Math.floor(v) + k * 10, 20), w = fm < 6 ? [1, 0.15, -0.7][Math.floor(fm / 2)] : 0.3, dir = Math.sin(a) > 0 ? -1 : 1; // A5: glides with a slight dihedral, one flap every 20 f
      fx(out, `fly${w}d${dir}`, 256, 128, (p) => fxFlyRaven(p, w, "#1e2233", dir), c, 2.6, 1.3, { rot: 0.15 * Math.cos(a) });
    }
    // the trail life IN FRAME (the crane looks ENE over the flats): a group of three strolls toward the trailhead
    // (one points out at the badlands, two chat with head turns), a tourist photographs the view (flash), a lone
    // tourist points, a far couple chats
    const grp: [number, V3, Partial<PersonOpts>][] = [
      [1, [-15.9, 0, -25.7], { hands: [{ a: "hang" }, { a: "point", dy: -10 + 3 * Math.sin(VF * 0.4) }], expr: "grin", look: 1 }],
      [4, [-15.3, 0, -25.25], {}],
      [7, [-16.45, 0, -25.1], {}],
    ];
    grp.forEach(([v, p0, ex], n) => {
      const a = TOUR(v, n === 1 ? { hat: "visor", hatCol: "#f4f1ea" } : n === 2 ? { hat: "bucket", hatCol: "#f2c230", backpack: "#4a6a8a", print: "palm" } : {}, "v2"), chat = n > 0 ? (Math.floor((vt(f) + n * 13) / 16) % 2 ? 1 : -1) : 0;
      walker(out, cam, a, f, 165, p0, 0.38, 0.92, 1.05 + 0.05 * n, { flutter: flutAt(f, a.i), ...(chat ? { expr: "smile", look: chat * 1.2, headTilt: chat * 5 } : {}), ...ex });
    });
    { const a = TOUR(6, {}, "v2"), p: V3 = [-14.7, 0, -23.9], up = ramp(f, 160, 5) * (1 - ramp(f, 182, 5)), sd = sideOf(cam, p, [-6, 0, -12]);
      put(out, cam, a, p, { ...idle(f, a.i, p), expr: up > 0.5 ? "focus" : "smile", facing: sd, look: sd, blink: blinkAt(f, a.i), flutter: flutAt(f, a.i),
        hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] });
      flash(out, toWorld(cam, p, 1, [300 + sd * 30, 300], 0.15), f, 171, 2, 0.55); }
    // A7 P2 (the foreground tourist read as a wave at the lens): he lifts his camera to a log slice (6 f up, held, a
    // flash), checks the screen, and lowers it
    { const a = TOUR(0, {}, "v2"), p: V3 = [-14.2, 0, -25.6], sd = sideOf(cam, p, [-6, 0, -30]), uC = vt(f) - vt(162), up = rampV(uC, 0, 6) * (1 - rampV(uC, 26, 6));
      const o2: PersonOpts = { ...idle(f, a.i, p), expr: up > 0.5 ? "focus" : "grin", facing: sd, look: sd * 1.2, lookY: up > 0.5 ? 0 : uC > 32 ? 0.8 : -0.3, blink: blinkAt(f, a.i), flutter: flutAt(f, a.i), noCam: up > 0.3,
        hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] };
      put(out, cam, a, p, o2);
      flash(out, toWorld(cam, p, 1, handAt(a.o, { ...o2, seed: seedOf(a.i), light: light2D(cam) }, 0), 0.25), uC, 14, 3, 0.5); }
    // A5 P1/P2: the visitors in the crane's landing frame are BUSY and turned away from the lens:
    // (1) two strollers walk the flats toward the PETRIFIED FOREST sign at 0.95 m/s (side / 3-4 back walk views, 4 %
    // bob, staggered phases); the front one points at the sign, the other chats;
    // (2) a photographer on the left raises his camera at the big log (flash on video ~245 = picture 176);
    // (3) the red-cap tourist of shot 3 stands in the clear sand LEFT of the foreground log slice in a 3/4 front view
    // (face + orange shirt readable), admiring the slice, a chip glints by his shoe, he side-eyes it (plants shot 3)
    { const dirW: [number, number] = [0.89, 0.46], sign: V3 = [-13.4, 2.0, -36.5];
      ([[4, [-19.9, 0, -37.9], 0], [7, [-20.7, 0, -38.45], 1]] as [number, V3, number][]).forEach(([v, m0, n]) => {
        const a = TOUR(v, n ? { hat: "bucket", hatCol: "#f2c230", print: "palm" } : { hat: "visor", hatCol: "#f4f1ea" }, "vw"), chat = n === 1 && Math.floor((vt(f) + 7) / 20) % 2 ? 1 : 0;
        const ss = sideOf(cam, m0, sign), pointK = n === 0 ? ramp(f, 168, 4) * (1 - ramp(f, 182, 5)) : 0;
        walker(out, cam, a, f, 176, m0, dirW[0], dirW[1], 0.95, { flutter: flutAt(f, a.i), lift: 1.1, expr: pointK > 0.5 ? "grin" : chat ? "smile" : "calm",
          look: pointK > 0.5 ? ss * 1.2 : chat ? -ss * 1.2 : ss * 0.6, lookY: pointK > 0.5 ? -0.5 : 0, headTilt: (chat ? -ss * 5 : 0) + life(f, a.i).head,
          hands: pointK > 0.02 ? (ss > 0 ? [{ a: "hang" }, { a: "hang", b: "point", k: pointK, dy: -16 }] : [{ a: "hang", b: "point", k: pointK, dy: -16 }, { a: "hang" }]) : [{ a: "hang" }, { a: "hang" }] });
      });
      const c = TOUR(6, { hat: "visor", hatCol: "#e9f1f4" }, "vp"), cp: V3 = [-23.72, 0, -37.77], logC: V3 = [-15.5, 0, -40], sc = sideOf(cam, cp, logC);
      const up = ramp(f, 169, 4) * (1 - ramp(f, 183, 5));
      const co: PersonOpts = { ...idle(f, c.i, cp), expr: up > 0.5 ? "focus" : "smile", facing: sc, look: sc * 1.1, blink: blinkAt(f, c.i), noCam: up > 0.3, flutter: flutAt(f, c.i),
        hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] };
      put(out, cam, c, cp, co);
      flash(out, toWorld(cam, cp, 1, handAt(c.o, { ...co, seed: seedOf(c.i), light: light2D(cam) }, 0), 0.25), f, 176, 3, 0.55);
      const r = TOUR(0, { camera: "neck" }, "v2r"), rp: V3 = [-24.77, 0, -32.51], logF = sideOf(cam, rp, [-23.4, 0, -31.2]);
      const peek = f >= 178 && f < 186, chipW: V3 = [rp[0] + 0.32 * cam.right.x, GY + 0.03, rp[2] + 0.32 * cam.right.z];
      put(out, cam, r, rp, { ...idle(f, r.i, rp), expr: peek ? "shifty" : "smile", facing: logF, look: peek ? logF * 0.9 : logF * 1.2, lookY: peek ? 1.0 : -0.2, headTilt: life(f, r.i).head + (peek ? logF * 4 : 0),
        blink: blinkAt(f, r.i, [178]), flutter: flutAt(f, r.i), hands: logF > 0 ? [{ a: "hip" }, { a: "point", dy: -4 + 2 * Math.sin(VF * 0.35) }] : [{ a: "point", dy: -4 + 2 * Math.sin(VF * 0.35) }, { a: "hip" }] });
      fx(out, "chipV2", 96, 96, (pp) => fxChip(pp, 14, true), chipW, 0.09, 0.08);
      glintAt(out, [chipW[0], chipW[1] + 0.08, chipW[2]], f, 177, 0.2, 8); }
    // A3: a tourist kneels at a chip beside the trail (it glints): the pocketing to come
    { const a = TOUR(2, { glasses: null, hat: "visor", hatCol: "#e9f1f4", print: "pine", shirt: "#f2665a" }, "v2k"), p: V3 = [-15.0, 0, -24.4], sd = sideOf(cam, p, [-15.4, 0, -24.3]);
      put(out, cam, a, p, { ...idle(f, a.i, p), mode: "kneel", facing: sd, expr: "focus", look: sd * 0.8, lookY: 1, blink: blinkAt(f, a.i), hands: sd < 0 ? [{ a: "ground", dy: -4 * Math.abs(Math.sin(VF * 0.3)) }, { a: "lap" }] : [{ a: "lap" }, { a: "ground", dy: -4 * Math.abs(Math.sin(VF * 0.3)) }] });
      glintAt(out, [-15.45, 0.12, -24.2], f, 168, 0.22, 8); }
    // A7 P2: the chatting pair now STROLLS the trail side by side (0.55 m/s, 11 f steps), heads turning to each other
    [[5, -7.4, -19.2], [3, -6.8, -19.6]].forEach(([v, x, z], n) => {
      const a = TOUR(v, {}, "v2c"), tk = Math.floor((vt(f) + n * 9) / 18) % 2 === 1;
      walker(out, cam, a, f, 166, [x, 0, z], -0.62, -0.78, 0.55, { expr: tk ? "grin" : "smile", look: (n ? -1 : 1) * (tk ? 1.3 : 0.6), headTilt: (tk ? 5 : 0) * (n ? -1 : 1), lift: 0.8 });
    });
    // A6 ADD: a jackrabbit bounds across the mid ground (9-video-frame hops, ~3 m/s), FREEZES upright as the crane
    // passes over it (ears up, one ear twitch), then bolts off with two last hops
    { const v = vt(f), v0 = vt(150), v1 = vt(166), v2 = vt(181), A0: V3 = [-20.4, 0, -30.5], A1: V3 = [-21.3, 0, -33.2], A2: V3 = [-20.9, 0, -35.6]; // (render check: clear sand right of the red cap, never behind him)
      const mv = v < v1 ? clamp01((v - v0) / (v1 - v0)) : v < v2 ? 1 : 1 + clamp01((v - v2) / (v1 - v0) * 2.2) * 0.999;
      const P = mv <= 1 ? [A0[0] + (A1[0] - A0[0]) * mv, 0, A0[2] + (A1[2] - A0[2]) * mv] : [A1[0] + (A2[0] - A1[0]) * (mv - 1), 0, A1[2] + (A2[2] - A1[2]) * (mv - 1)];
      const moving = (v >= v0 && v < v1) || (v >= v2 && mv < 1.999), hp = moving ? mod(v - v0, 9) / 9 : 0, y = 0.13 + (moving ? 0.3 * Math.sin(Math.PI * hp) : 0);
      const tw = !moving && v >= v1 && mod(Math.floor(v - v1), 24) < 2 ? 1 : 0;
      if (v >= v0) fx(out, `rabbitV${q(hp, 4)}${tw}`, 128, 96, (p) => { fxRabbit(p, q(hp, 4)); if (tw) p.stroke([[86, 6], [80, -2]], 3); }, [P[0], y, P[2]], 0.5, 0.375,
        { yaw: Math.atan2(cam.pos.x - P[0], cam.pos.z - P[2]) + Math.PI, rot: moving ? 0.25 * Math.cos(Math.PI * hp) : 0 }); }
  }
  if (id === 3) {
    pocketing(out, cam, f);
    // A6 ADD: far off down the trail a ranger walks AWAY from us, oblivious (DOF-soft, screen-left of the hero)
    walker(out, cam, A.ranger, f, 215, [0.6, 0, -47], 0, -1, 0.8);
    for (const k of [0, 1]) { // A5: two ravens circling HIGH in the sky band above the clouds' lower edge (~90 px wide at
      // 1080), lens-soft like the far badlands, 3 wing drawings on 2s (up / mid / down) every ~20 f, gliding between
      const v = vt(f), a = (TAU * v) / 110 + k * Math.PI, c: V3 = [-1.8 + 1.8 * Math.cos(a), 5.75 + 0.3 * k, -32 + 1.6 * Math.sin(a)];
      const fm = mod(Math.floor(v) + k * 9, 20), w = fm < 6 ? [1, 0.15, -0.7][Math.floor(fm / 2)] : 0.15, dir = Math.sin(a) > 0 ? -1 : 1;
      fx(out, `flyS${w}d${dir}`, 256, 128, (p) => { p.g.filter = "blur(9px)"; fxFlyRaven(p, w, "#1e2233", dir); p.g.filter = "none"; }, c, 0.5, 0.25, { rot: 0.18 * Math.cos(a) });
    }
  }
};

/** shot 3: he admires the chip IN FRONT of his chest (screen-left of the plaque, glint), guilty side-eye checks left /
 *  right, a 3 f anticipation lift, the chip slides into his FRONT CHEST POCKET (its top peeks out), two pats ON the
 *  pocket, then the innocent closed-eye whistle with a heel-rock bounce, a smug side check, the free hand on his hip */
const pocketing = (out: Stage, cam: CamInfo, f: number) => {
  const a = TOUR(0, { camera: "neck" }), P = VISTA.pocketTourist, i = a.i, log = VISTA.logs[0].c, sd = sideOf(cam, P, log);
  const B = BEAT.pocketing, L = life(f, i), u = dvf(f, B);
  // A7 P1 (user: "too fast"; audit: the pocketing never read): a 3-BEAT SNEAK on the VIDEO clock (u = video frames from
  // "pocketing"): he admires the big rainbow chip at his chest (its face to the lens, a glint) -> BEAT 1 (u -13..0) a 3 f
  // head turn 6 deg LEFT, eyes left, held -> BEAT 2 (u 0..10) a 1 f snap RIGHT, held -> BEAT 3 a 2 f anticipation lift,
  // the hand slides the chip into the hip-pocket slit over 8 f (torso leaning 4 deg toward it, shoulders hunched), the
  // pocket bulges, two pats (u 23 / 29) -> a smug grin straight at us (16 f) -> hands behind his back, an innocent
  // whistle with a heel rock and two big notes
  const ex: K<Expr>[] = [[-999, "grin"], [-13, "shifty"], [21, "smug"], [37, "whistle"]];
  const e = atV(f, B, ex), whistling = u >= 37;
  let look = 0, lookY = 0, head = L.head * 0.8, facing: -1 | 0 | 1 = 0;
  if (u < -13) { look = -0.35; lookY = 0.95; head -= 5; }                                       // admiring the chip
  else if (u < 0) { look = -1.4; lookY = 0.1; head -= 6 * rampV(u, -13, 3); facing = -1; }   // BEAT 1: anyone LEFT?
  else if (u < 10) { look = 1.4; lookY = 0.1; head += 6; facing = 1; }                         // BEAT 2: a snap RIGHT
  else if (u < 21) { look = -0.6; lookY = 0.85; head -= 3; }                                    // BEAT 3: eyes on the pocket
  else if (u < 37) { look = 0; lookY = 0; head += 2 + 2 * bumpV(u, 21, 6); }                  // the smug grin at us
  // the chip hand (index 0, screen-left, the pocket side)
  const lift = -6 * bumpV(u, 10, 2), M0 = 12, M1 = 20, slipK = rampV(u, M0, M1 - M0);
  const pats = -8 * bumpV(u, 23, 3) - 8 * bumpV(u, 29, 3);
  let hand: Hand;
  if (u < M0) hand = { a: "chest", dx: -16, dy: 8 + 1.5 * Math.sin(VF * 0.4) + lift, hold: "chip", n: 4 | (u >= -20 && u < -12 ? 2 : 0) };
  else if (u < M1) hand = { a: "chest", b: "hipPocket", k: slipK, dx: -16 * (1 - slipK), dy: 8 * (1 - slipK), hold: slipK < 0.85 ? "chip" : null, n: 4 };
  else if (u < 36) hand = { a: "hipPocket", dy: 5 * bumpV(u, M1, 3) + pats };
  else hand = { a: "hipPocket", b: "behind", k: rampV(u, 36, 6) };
  const free: Hand = whistling ? { a: "hang", b: "behind", k: rampV(u, 36, 6) } : { a: "hang", dy: 2 * Math.sin(VF * 0.2) };
  const notesV = [vt(B) + 39, vt(B) + 47];
  const nb = notesV.reduce((m, s) => m + 4 * bump(vt(f), s, 6), 0), nbLag = notesV.reduce((m, s0) => m + 4 * bump(vt(f) - 2, s0, 6), 0);
  // idle life x1.5: sway ~2 deg at 0.3 Hz, breathing 2 %; the heel-toe rock rises on each note (2.5 %)
  const rock = notesV.reduce((m, s) => m + 0.025 * bump(vt(f), s - 1, 7), 0) + (whistling ? 0.008 * Math.abs(Math.sin(TAU * 0.55 * (VF / FPS))) : 0);
  const lean = -4 * slipK * (1 - rampV(u, M1 + 2, 6));
  const heroO = put(out, cam, a, P, {
    ...idle(f, i, P), tilt: L.sway * 1.6 + 1.4 * L.shift + 1.5 * Math.sin(TAU * HZ.s1 * (VF / FPS) + 1.3) + lean + (whistling ? 2.2 * Math.sin(TAU * 0.45 * (VF / FPS)) : 0), expr: e, look, lookY, facing, breath: L.breath * 1.9,
    blink: whistling ? 1 : blinkAt(f, i, [pAt(B, -13), pAt(B, 21)]), headTilt: head + (whistling ? nb : 0), squash: 0.35 * slipK * (1 - rampV(u, M1 + 2, 6)),
    face: { blush: e === "shifty" ? 1 : 0, fdy: e === "whistle" ? 2 * Math.sin(VF * 0.5) : 0 },
    bulge: rampV(u, M1, 3), flutter: flutAt(f, i, P[0], P[2]), wind: wnd(f, P[0], P[2]) * 1.4, hatLag: 1.1 * (nbLag - nb) + 3 * bumpV(u, 0, 4) * 1 - 3 * bumpV(u, -13, 4),
    hipSlit: [-1, q(rampV(u, M1, 3) * (1 + 0.08 * bumpV(u, 23, 3) + 0.08 * bumpV(u, 29, 3)), 12), u >= M1 + 1 ? 0.55 : u >= M1 - 1 ? 0.9 : 0],
    hands: [hand, free],
  }, { rise: rock });
  // glints: on the chip while he admires it (video), as it slips down, and the rainbow corner in the pocket after the pats
  const hp = handAt(a.o, { ...idle(f, i, P), facing, seed: seedOf(i), hands: [hand, { a: "hip" }] }, 0);
  glintAt(out, toWorld(cam, P, 1, [hp[0] - 6, hp[1] - 56], 0.12), vt(f), vt(B) - 20, 0.3, 9);
  glintAt(out, toWorld(cam, P, 1, [hp[0] - 4, hp[1] - 40], 0.12), vt(f), vt(B) + 14, 0.2, 5);
  notes(out, cam, P, headAt(a.o, heroO), vt(f), notesV, -1, 1, 1.45);
  if (u >= 22 && u < 34) { const pw = handAt(a.o, { facing, seed: seedOf(i), hands: [{ a: "hipPocket" }, null] }, 0); puff(out, toWorld(cam, P, 1, [pw[0], pw[1] + 8], 0.1), vt(f), vt(B) + (u < 29 ? 23 : 29), 6); }
  { const pw = handAt(a.o, { facing: sd, seed: seedOf(i), hands: [{ a: "hipPocket" }, null] }, 0);
    glintAt(out, toWorld(cam, P, 1, [pw[0] + 2, pw[1] - 8], 0.1), vt(f), vt(B) + 31, 0.16, 7);
    glintAt(out, toWorld(cam, P, 1, [pw[0] + 2, pw[1] - 8], 0.1), f, 238, 0.17, 7); } // and once more into the dissolve
  // "visitors KEPT pocketing": soft-focus at screen right behind the slice, a tourist glances LEFT (7 f), RIGHT (7 f),
  // pockets a chip (6 f) and pats it; the photographer behind does his own pocketing, then the shutter
  { const b = TOUR(2, { glasses: null }, "3"), bp: V3 = [-3.0, 0, -37.0], pk2 = rampV(u, 28, 6), sb = sideOf(cam, bp, [-1, 0, -31]);
    const gl = u >= 14 && u < 21 ? -1 : u >= 21 && u < 28 ? 1 : 0, pat = -5 * bumpV(u, 36, 3);
    put(out, cam, b, bp, { ...idle(f, b.i, bp), expr: u >= 14 && u < 42 ? "shifty" : "smile", look: gl ? gl * 1.35 : u >= 28 && u < 42 ? 0.3 : sb, facing: (gl || sb) as -1 | 1, headTilt: gl * 5, blink: blinkAt(f, b.i),
      hands: [{ a: "chest", b: "pocket", k: pk2, dy: pat, hold: pk2 < 0.8 ? "chip" : null }, { a: "hang" }], bulge: rampV(u, 33, 3) }); }
  { // A4: the photographer first does his OWN pocketing (the plural "visitors KEPT pocketing"): crouches, picks a chip
    // off the ground, side-glances left, slips it into his hip pocket and pats it, THEN lifts his camera for the shutter
    const c = TOUR(6, {}, "3"), cp: V3 = [-1.45, 0, -31.2], SH = PW(5, "pieces.") + 10, up = ramp(f, SH - 10, 5), sdc = sideOf(cam, cp, [-1.8, 0, -33.5]);
    const PK0 = B - 4, cr = crouchAt(f, PK0, 3, 4), held = f >= PK0 && f < B + 13, POK = B + 11, PAT = B + 17;
    const pocketK = ramp(f, POK - 2, 4), patDy = -3 * bump(f, PAT, 3);
    const glance = u >= 6 && u < 18; // A7: a slower look round (6 f left, 6 f right)
    const pickH: Hand = f < B + 9 ? { a: "hang", b: "ground", k: cr.reach, hold: held ? "chip" : null } : { a: "chest", b: "pocket", k: pocketK, dy: patDy, hold: f < POK ? "chip" : null };
    const co: PersonOpts = { ...idle(f, c.i, cp), crouch: cr.k, expr: up > 0.5 ? "focus" : glance || (f >= POK - 2 && f < PAT) ? "shifty" : "smile", facing: glance ? -1 : sdc,
      look: glance ? (u < 12 ? -1.3 : 1.2) : f < PK0 + 2 && f >= PK0 - 8 ? sdc * 0.6 : sdc, lookY: f >= PK0 - 8 && f < PK0 + 3 ? 1 : 0, blink: blinkAt(f, c.i, [B + 3]), noCam: up > 0.3,
      hands: up > 0.02 ? [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] : [pickH, { a: "hang" }] };
    put(out, cam, c, cp, co);
    if (f < PK0) fx(out, "chip3c", 96, 96, (p) => fxChip(p, 18), groundAt(cam, c, cp, sdc, 0), 0.08, 0.07);
    flash(out, toWorld(cam, cp, 1, handAt(c.o, { ...co, seed: seedOf(c.i) }, 0), 0.4), f, SH, 3, 0.16); } // A5: at the lens, ~45 px
};

// ---------------- the trails (test, signs, results, permission) ----------------
const tt = (d: V3) => add(TT.base, d);
const SIGN_A: V3 = tt([TT.signA.dx, TT.signA.cy, TT.signA.z]), SIGN_B: V3 = tt([TT.signB.dx, TT.signB.cy, TT.signB.z]);
const LED_TOP = (s: V3): V3 => [s[0], TT.signA.cy + TT.led.dy + TT.led.h / 2 + 0.07, s[2] - 0.07]; // A5: higher + back, the label stays clear
const trails = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (id === 7) professor(out, cam, f);
  if (id === 7 || id === 8) team(out, cam, id, f);
  if (id === 8 || id === 9) swapper(out, cam, id, f);
  if (id === 7 || id === 8) {
    // early hikers far down the CRYSTAL trail (in shot 8 one stops and stares curiously at the kneeling team), a ranger
    walker(out, cam, TOUR(6, {}, "m"), f, S(id).a, tt([4.6, 0, -11]), 0.25, -0.97, 0.9);
    if (id === 8 && f >= 806) { const hp = tt([5.6, 0, -11.4]), a = TOUR(7, {}, "m"), sdh = sideOf(cam, hp, tt([0.85, 0, -3.4])); // A3: 0.6 m into the wide (was cut by the left edge)
      put(out, cam, a, hp, { ...idle(f, a.i, hp), expr: "skeptic", facing: sdh, look: sdh * 1.3, blink: blinkAt(f, a.i), hands: [{ a: "hip" }, { a: "chin" }] }); }
    else walker(out, cam, TOUR(7, {}, "m"), f, S(id).a, tt([5.0, 0, -12.2]), 0.25, -0.97, 0.9);
    walker(out, cam, A.ranger, f, S(id).a + 30, tt([-6.5, 0, -16]), 1, 0, 0.8);
  }
  if (id === 7) {
    // A3 background life in the professor's wide: asst3 crosses the midground right -> left with the tarped Sign B panel;
    // a tourist pair strolls up the CRYSTAL path chatting; a jackrabbit hops across the far flats on "psychologist"
    walker(out, cam, A.asst3, f, S(7).a + 34, tt([4.3, 0, -3.6]), -1, 0, 1.05, { hands: [{ a: "hang" }, { a: "waist", dx: 6, hold: "tarp", n: Math.floor(vt(f) / 2) }], expr: "focus", look: -0.8 });
    // A5 P3: the far tourist pair is busy: one points out at the logs (arm up ~20 f), the other turns her head (2 f) and
    // lifts a camera to them (flash ~video 940), then they chat
    ([[5, tt([3.7, 0, -8.6])], [2, tt([4.25, 0, -8.9])]] as [number, V3][]).forEach(([v, p0], n) => {
      const a = TOUR(v, { glasses: null }, "7p"), Lp = life(f, a.i), logs = tt([6.5, 0, -14]), sl = sideOf(cam, p0, logs), oth = sideOf(cam, p0, n ? tt([3.7, 0, -8.6]) : tt([4.25, 0, -8.9]));
      const ptK = n === 0 ? ramp(f, 688, 3) * (1 - ramp(f, 704, 4)) : 0, FL7 = 708, up = n === 1 ? ramp(f, FL7 - 8, 3) * (1 - ramp(f, FL7 + 8, 4)) : 0;
      const turnH = n === 1 && f >= 690 && f < FL7 - 8, chat = f >= FL7 + 10 && Math.floor((vt(f) + n * 9) / 20) % 2 === 1;
      const ho: PersonOpts = { ...idle(f, a.i, p0), view: ptK > 0.02 || up > 0.02 || turnH || chat ? "front" : "back", facing: chat ? oth : (sl as -1 | 1), expr: up > 0.5 ? "focus" : ptK > 0.5 ? "grin" : chat ? "smile" : "calm",
        look: chat ? oth * 1.2 : sl * 1.1, lookY: -0.2, headTilt: Lp.head + (turnH ? sl * 5 : 0), blink: blinkAt(f, a.i), noCam: up > 0.3,
        hands: n === 0 ? (sl > 0 ? [{ a: "hang" }, { a: "hang", b: "point", k: ptK, dy: -18 }] : [{ a: "hang", b: "point", k: ptK, dy: -18 }, { a: "hang" }])
          : [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] };
      put(out, cam, a, p0, ho);
      if (n === 1) flash(out, toWorld(cam, p0, 1, handAt(a.o, { ...ho, seed: seedOf(a.i), light: light2D(cam) }, 0), 0.25), f, FL7, 3, 0.3);
    });
    { const R0 = PW(12, "psychologist") - 4, t = f - R0; if (t >= 0 && t < 36) {
      const hop = mod(t, 9) / 9, x = 6.6 - 0.11 * t, y = 0.12 + 0.28 * Math.sin(Math.PI * hop);
      fx(out, `rabbit${q(hop, 4)}`, 128, 96, (p) => fxRabbit(p, q(hop, 4)), tt([x, y, -12.5]), 0.36, 0.27, { rot: 0.25 * Math.cos(Math.PI * hop) }); } }
  }
  if (id === 9) signReaders(out, cam, f);
  if (id === 10) results(out, cam, f);
  if (id === 13) permission(out, cam, f);
};

/** shot 7 (A4): the professor (calm, confident, respectful: never a V brow). He writes tallies with his eyes DOWN on
 *  the clipboard (head tipped 5 deg down, level brows); on "professor" he glances UP to the lens with one brow arched
 *  (held 14 f), back to the board on "psychologist"; a smug little smile on "Cialdini"; on "tested it" a real nod
 *  (A4: 6 f earlier, so it plays before the fly-in) with ^^ closed eyes, a pen flourish at the trails and two taps on
 *  the board, then the pen hand rests at the clipboard's lower-right corner (outside the paper) for the dive */
const professor = (out: Stage, cam: CamInfo, f: number) => {
  const a = A.prof, P = tt([1.8, 0, 2.4]), i = a.i, sd = sideOf(cam, P, tt([0, 0, 0]));
  const T = BEAT.testedIt, ps = PW(12, "psychologist"), G = BEAT.professor, C = BEAT.cialdini, N0 = T - 11;
  // A5 P2: calm and busy, never grumpy: he WRITES with dot eyes down on the clipboard (brows level and lifted, a soft flat
  // mouth, small saccades along the tally rows); a glance up on "professor,"; on "psychologist" he looks UP into the lens
  // with a knowing half-smile, one brow up (held to "Cialdini"); "fair" smile + the readers pushed down by his ball hand
  const ex: K<Expr>[] = [[-999, "read"], [G - 2, "knowing"], [G + 12, "read"], [ps - 2, "knowing"], [C - 2, "fair"], [N0, "content"], [N0 + 16, "knowing"]]; // ("fair": a smug little smile with LEVEL brows, never a V)
  const e = at(f, ex), L = life(f, i), t = vt(f) / FPS;
  const writing = e === "read";
  // the nod: down ~5 % of the head height over 5 f, back up over 7 f with a ~1 f overshoot
  const nod = f < N0 ? 0 : f < N0 + 5 ? 1.0 * smooth((f - N0) / 5) : f < N0 + 12 ? 1.0 * (1 - backOut((f - N0 - 5) / 7)) : 0;
  const ticks = clamp(Math.floor((f - 652) / 2.4), 0, 10) + clamp(Math.floor((f - ps - 2) / 3), 0, 6);
  // A6 P2: the clipboard at CHEST height (>= 20 px under his mouth at 1080), lifted a little only for the writing strokes
  // A7 P2 (the board jumped ~60 px on the smile swap): one constant chest height through every swap, a slow 2 u bob
  const bdy = 3.5 + 2 * Math.sin(TAU * 0.4 * t);
  const board: Hand = { a: "chest", dx: 10, dy: bdy, hold: "testboard", ang: 10 + 2 * Math.sin(TAU * 0.8 * t) + 1.2 * wnd(f, P[0], P[2]), n: ticks };
  const shiftT = -3 * settle(f, C + 2, 8) * (1 - ramp(f, T, 10)), tiltP = L.sway * 1.8 + 0.6 * L.shift + shiftT;
  const wNod = writing ? 0.35 : 0;
  const bd = handAt(a.o, { hands: [board, null], facing: sd, seed: seedOf(i), tilt: tiltP, breath: L.breath * 1.4, nod: nod * 0.9 + wNod }, 0);
  // pen hand: ticks (a 6 Hz jiggle, a lift between gates) while writing; on "tested" a flourish toward the trails
  // (N0 + 1 .. N0 + 6), two taps on the board (contacts at T - 2 and T + 1), then it rests at the board's lower-right
  // corner (off the paper) and holds through the dive
  const FL = N0 + 1, TP = T - 4, RS = T + 3;
  let pen: Hand;
  if (writing && f < C - 2) { const tk = Math.max(0, ticks - 1), k = tk % 2 ? 10 : -10, j = Math.floor(tk / 2) % 5; pen = { a: [bd[0] + (k - 6 + j * 3) * 2.4, bd[1] + 10 + 1.6 * Math.sin(VF * 2.1) - 4 * (mod(vt(f), 12) < 2 ? 1 : 0)], hold: "pen", ang: -22 }; }
  else if (f >= FL && f < TP) { const k = settle(f, FL, 4); pen = { a: "waist", b: "point", k: clamp01(k), dy: -10 * k, hold: "pen", ang: sd * (45 + 10 * Math.sin((f - FL) * 0.9)) }; }
  else if (f >= TP && f < RS) { const tp = Math.abs(Math.sin(((f - TP) / 3) * Math.PI)); pen = { a: [bd[0] + 4, bd[1] + 6 - 10 * tp], hold: "pen", ang: -30 }; }
  else if (f >= RS) pen = { a: [bd[0] + 31 * 2.44, bd[1] + 31 * 2.44], hold: "pen", ang: -35 };
  else pen = { a: "chest", b: "waist", k: ramp(f, G - 2, 6), dx: -8 + 1.5 * Math.sin(VF * 0.7), hold: "pen", ang: -25 };
  // A5 P2: on "Cialdini" the pen hand pushes the readers down his nose (3 f anticipation dip, up to the bridge, the push)
  if (f >= C - 6 && f < C + 7 && !(f >= FL && f < RS)) {
    const up = smooth((f - (C - 4)) / 3) * (1 - smooth((f - (C + 3)) / 4)), ant = 5 * bump(f, C - 6, 2);
    pen = { a: "chest", b: "eye", k: up, dx: -6 * up, dy: ant + (4 + 5 * clamp01((f - C + 1) / 3)) * up, hold: "pen", ang: -25 - 30 * up };
  }
  // gaze: down at the board while writing; the lens on "professor" (one brow arched) and from "Cialdini"; the trails on the flourish
  const sac = writing ? [-0.35, 0, 0.35][Math.floor(mod(vt(f), 30) / 10)] : 0;   // a saccade every 10 f along the tally rows
  let look = writing ? sd * 0.3 + sac : 0, lookY = writing ? 1.25 : nod * 0.5, head = L.head * 0.9 + 1.5 * Math.sin(VF * 0.31) + (writing ? -5 * sd : 0);
  let browUp: [number, number] | undefined = writing ? [1, 1] : undefined;
  if (e === "knowing" && f < G + 12) { look = 0.15 * sd; lookY = -0.15; head += 3; browUp = sd > 0 ? [0, 5] : [5, 0]; }
  if (e === "knowing" && f >= ps - 2 && f < C - 2) { look = 0; lookY = -0.05; head += 2; browUp = sd > 0 ? [0, 4] : [4, 0]; } // up into the lens
  if (e === "fair") { look = 0.2 * sd; lookY = 0; }
  if (f >= FL && f < TP) { look = sd * 1.1; lookY = -0.2; }
  if (e === "knowing" && f >= G + 14) head += 3;
  const gd = f < C - 1 ? 0 : f < C + 2 ? 1.15 * smooth((f - C + 1) / 3) : f < C + 4 ? 1.15 - 0.15 * smooth((f - C - 2) / 2) : 1; // A4: the readers drop onto his nose on "Cialdini"
  longShadow(out, P[0], P[2], 3.4, 0.62);
  const po = put(out, cam, a, P, { expr: e, look, lookY, nod: nod * 0.9 + wNod, facing: sd, face: { browUp }, glassesDrop: gd,
    blink: blinkAt(f, i, [...swapsOf(ex).filter((x) => x !== N0), PW(12, "tested") + 14]), breath: L.breath * 1.4, shift: f >= C && f < T ? -1 : L.shift,
    tilt: tiltP, headTilt: head, wind: wnd(f, P[0], P[2]) * 0.6, flutter: 0.6 * flutAt(f, i), hairSwing: 1.5 * wnd(f, P[0], P[2]), hands: [board, pen] });
  // A6 ADD: a cold-morning breath wisp (video clock, 26 f each, at video 924 and 966 = while the camera is on him) drifting out of his mouth on the facing
  // side (not while the pen hand is up at his readers)
  { const v = vt(f), st = [924, 966].find((s0) => v >= s0 && v < s0 + 26), t = st === undefined ? -1 : v - st; // (video frames: the MS on him)
    if (t >= 0 && t < 26 && !(f >= C - 6 && f < C + 7)) {
      const [hx, hy, ha] = headAt(a.o, po), u2 = q(t / 26, 13), dir = sd < 0 ? -1 : 1;
      fx(out, `breath${u2}${dir}`, 256, 128, (p) => fxBreath(p, u2, dir), toWorld(cam, P, 1, [hx + dir * (1.28 * ha + 70), hy + 0.5 * ha], 0.12), 0.46, 0.23, { soft: true }); } } // A6 P3: 0.15 head widths further out // (lobes start at the face edge: white on white was invisible)
};

/** shot 8's insert staging: asst1 kneels on the LONG LOGS path with the chip; A4: asst2 kneels to his screen-LEFT (in
 *  the insert, ~0.3 W, 5 m out) so the stopwatch beat is ON screen; both kneel together on the path in shots 7-8 */
const TEAM1 = tt([0.85, 0, -3.4]), TEAM2 = tt([-0.15, 0, -4.6]); // A6 P2: asst2 0.25 m left + 0.5 m deeper, so the two kneeling heads never merge in the MS
/** the research team: asst2 waits with the stopwatch, asst1 carries the chip bucket and kneels beside him (shot 7);
 *  shot 8 (A4): asst1 KNEELS low (one knee on the path, torso ~25 % lower, leaning in 8 deg), holds the chip at CHEST
 *  height on his near side (never across his face), a 2 f lift, sets it on the path on "hid" (1 f settle, a dust puff),
 *  dabs the white dot on "marked" with a brush, blows on it ("o"); asst2 tucks a second chip under a bush on "hid"
 *  (sly glance), then thrusts a BIG stopwatch up toward the lens (3 f dip, rise, hold), clicks it with his thumb (2 f
 *  squash, 1 f digit flicker) and gives the lens a sly look; then both tick tallies */
const team = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const p1 = TEAM1, p2 = TEAM2, p0 = tt([0.75, 0, -5.2]);
  // A5 P2: the stopwatch comes up on "team" and clicks at ~video 1010 (CLK, picture 772), held big to ~video 1030
  // A6 P1: the watch comes DOWN at 777 (video ~1054), before the chip CU, so the click plays with both faces whole
  const M = BEAT.marked, HID = 776, CLK = 772, UP0 = 765, DOWN0 = 777;
  {
    const a = A.asst1, i = a.i, L = life(f, i);
    if (id === 7) {
      // carries the chip bucket 3 steps along the path and kneels beside asst2; on "Cialdini" glances at the stopwatch
      // then at the professor and nods
      const walkK = clamp01((f - 715) / 30), P: V3 = [p0[0] + (p1[0] - p0[0]) * walkK, 0, p0[2] + (p1[2] - p0[2]) * walkK];
      const kneel = f < 712 || f >= 748, sd = sideOf(cam, P, p2);
      const cia = f >= BEAT.cialdini && f < BEAT.cialdini + 20, nd = bump(f, BEAT.cialdini + 12, 8), sp = sideOf(cam, P, tt([1.8, 0, 2.4]));
      put(out, cam, a, P, { ...idle(f, i, P), mode: kneel ? "kneel" : "walk", phase: walkK * 1.5, facing: sd, expr: cia ? "nod" : f >= 688 && f < 700 ? "focus" : "calm",
        look: cia ? (f < BEAT.cialdini + 8 ? sd * 0.8 : sp * 1.3) : 0.2, lookY: cia && f < BEAT.cialdini + 8 ? 0.6 : 0.3, nod: nd, blink: blinkAt(f, i, [692, 748]),
        hands: [{ a: "hang", hold: "bucket" }, { a: "hang", b: "waist", k: 0.5 }] });
    } else {
      const sd: -1 | 1 = sideOf(cam, p1, p2);
      const base: PersonOpts = { mode: "kneel", facing: sd, seed: seedOf(i), tilt: L.sway * 0.5 + sd * 8, breath: L.breath };
      // the chip hand (toward asst2): chest height beside the body until HID - 5, a 2 f lift, down to the path by HID
      const dn = f < HID - 5 ? 0 : f < HID - 3 ? -0.18 * smooth((f - (HID - 5)) / 2) : f < HID ? -0.18 + 1.18 * smooth((f - (HID - 3)) / 3) : f < HID + 3 ? 1 : 1 - smooth((f - HID - 3) / 5);
      const chipH: Hand = { a: "show", b: "ground", k: clamp01(dn), dx: -2, dy: (36 + 1.5 * Math.sin(VF * 0.5)) * (1 - clamp01(dn)) - (dn < 0 ? 18 * -dn : 0), hold: f < HID ? "chip" : null, n: 4 };
      const gw = handAt(a.o, { ...base, hands: [{ a: "ground" }, { a: "ground" }] }, sd < 0 ? 0 : 1);
      const chipW: V3 = tt([0.52, GY + 0.05, -3.0]); void gw; // carryover: pinned on the LEAD's CHIP8 (the CU frames it; the brush tip lands on it at marked - 1)
      // the brush: poised over the chip on the ground, dabs the dot on M - 2 .. M, lifts away
      const cd = toDesignRay(cam, p1, 1, [chipW[0], chipW[1] + 0.05, chipW[2]]), ba = sd < 0 ? -40 : 40, u = 2.44;
      const tip: P2 = [cd[0] - 15 * u * Math.sin((ba * Math.PI) / 180), cd[1] + 15 * u * Math.cos((ba * Math.PI) / 180)];
      const reach = f < M - 6 ? 0 : f < M - 1 ? 0.55 + 0.45 * smooth((f - (M - 6)) / 5) * (f < M - 1 ? 0.9 : 1) : f < M + 1 ? 1 : 1 - smooth((f - M - 1) / 4);
      const brushH: Hand = reach > 0.02 ? { a: [tip[0] - sd * 30 * (1 - reach), tip[1] - 34 * (1 - reach)], hold: "brush", ang: ba, maxLen: 1.5 } : { a: "waist", hold: "brush", ang: sd * -40 };
      const blow = f >= M + 1 && f < M + 6;
      let look = sd * 0.45, lookY = 0.45, head = L.head * 0.5 + sd * 3;
      if (f >= HID - 3 && f < M + 7) { look = sd * 0.5; lookY = 1.1; head += sd * 3; }           // eyes on the chip on the path
      if (f >= CLK - 2 && f < CLK + 8) { look = sd * 1.3; lookY = 0; head += sd * 4; }           // to the stopwatch click
      if (f >= CLK + 8) { look = sd * 0.6; lookY = 1; }
      put(out, cam, a, p1, { ...base, expr: blow ? "blow" : f >= CLK - 2 && f < CLK + 8 ? "smile" : "focus", look, lookY,
        blink: blinkAt(f, i, [M + 9, HID + 1], [M - 1]), headTilt: head, tilt: L.sway * 0.5 + sd * (8 + 6 * clamp01(dn)),
        hands: sd < 0 ? [chipH, brushH] : [brushH, chipH] });
      // FX: the chip on the path from HID (the white dot pops on the dab), a dust puff on the set-down, a small glint
      // beside the fresh dot, the blow-off puff
      if (f >= HID) {
        fx(out, "gravel8", 128, 128, (p) => fxSoftBlob(p, "58,44,40", 0.75), [chipW[0], GY - 0.035, chipW[2]], 0.36, 0.26, { flat: true, soft: true, rot: Math.atan2(-CAMR.z, CAMR.x) }); // a dark gravel patch: contrast
        fx(out, f >= M ? "chipHeroD" : "chipHero", 128, 128, (p) => fxChip(p, 3, f >= M, false, 1.7), [chipW[0], chipW[1] + 0.012 * bump(f, HID, 2), chipW[2]], 0.17, 0.15);
        puff(out, [chipW[0], GY - 0.02, chipW[2]], f, HID, 8);
        glintAt(out, [chipW[0] + cam.right.x * 0.03, chipW[1] + 0.05, chipW[2] + cam.right.z * 0.03], f, M, 0.16, 5); // the fresh dot sparkles (4 f)
        if (blow) puff(out, [chipW[0] - cam.right.x * 0.04, chipW[1] + 0.06, chipW[2]], f, M + 1, 5);
      }
    }
    fx(out, "tally", 256, 320, (p) => fxTally(p), [p1[0] + 0.45, GY - 0.03, p1[2] + 0.45], 0.24, 0.3, { flat: true, rot: -0.35 + 0.03 * wnd(f, p1[0], p1[2]) });
    fx(out, "rockpw", 96, 96, (p) => fxChip(p, 9), [p1[0] + 0.5, GY + 0.02, p1[2] + 0.36], 0.08, 0.07);
  }
  {
    // asst2 kneels beside him: tucks a second chip under a sage bush on "hid" with a sly glance; A4: then thrusts the
    // BIG 2:00:00 stopwatch up toward the lens (a 3 f dip, a 4 f rise, held), clicks it on CLK (thumb squash, 1 f digit
    // flicker), a sly look straight at us, lowers it; then ticks the tally, counting on his fingers
    const a = A.asst2, i = a.i, L = life(f, i), sd: -1 | 1 = sideOf(cam, p2, p1);
    const tuck = id === 8 && f >= HID - 2 && f < HID + 6;
    const R0 = UP0, up = id === 8 ? (f < R0 ? 0 : f < R0 + 2 ? -0.25 * smooth((f - R0) / 2) : f < R0 + 5 ? -0.25 + 1.3 * smooth((f - R0 - 2) / 3) : f < R0 + 6 ? 1.05 : f < DOWN0 ? 1 : 1 - smooth((f - DOWN0) / 5)) : 0;
    // A7 P1: the watch is only up while his face is in the frame (never in the chip insert: the long lens there)
    const lens = id === 8 && up > 0.02 && camAt(8, f).fov >= 26;
    // (A4: when raised it goes up BESIDE his head, outward, so the sly look stays visible)
    // A5 R5 (render check: raised OUTWARD it sat at the left frame edge, x 0-60 at 1080, and the click was lost): he
    // thrusts it up in the hand NEAREST his partner, out toward the frame centre at chin height (between the two heads,
    // ~x 0.2-0.3 W), so the whole 2:00:00 face reads; the sly look stays clear above it
    // A6 (render check: thrust toward his partner at chin height the big watch covered asst1's FACE): he holds it UP
    // over the heads, so the readout sits in the clear band above both hats
    const watchH: Hand = lens ? { a: "show", b: "raise", k: clamp01(up), dx: sd * 18 * clamp01(up), dy: -3 * bump(f, CLK, 3) - 24 * Math.min(0, up), hold: null, maxLen: 1.6 }
      : id === 8 && f >= CLK ? { a: "chestPocket", b: "hang", k: ramp(f, DOWN0 + 2, 6) } // A7 P1: after the click the watch goes into his vest pocket
      : { a: "show", dx: -sd * 6, dy: -22, hold: "stopwatch", n: Math.floor(vt(f) / 30) };
    const tally = id === 8 ? f >= DOWN0 + 5 : f < 700; // A5 R5: the tally only once the watch is down (one prop per hand)
    const wr = Math.sin(VF * 1.7) * 2;
    const other: Hand = tuck ? { a: "hang", b: "ground", k: bump(f, HID - 2, 8), dx: -sd * 4, hold: f < HID + 2 ? "chip" : null }
      : tally ? { a: "show", dx: -14 + wr, dy: 10 + wr * 0.5, hold: "pencil", ang: -30 } : { a: "hip" };
    const first: Hand = tally ? { a: "show", dy: 6, hold: "tally", ang: 10 } : lens ? watchH : { ...watchH, dx: sd * 12 };
    const count = tally && mod(Math.floor(vt(f) / 20), 3) === 2;
    const otherC: Hand = count ? { a: "raise", shape: (["f1", "f2", "f3"] as const)[mod(Math.floor(vt(f) / 6), 3)], dy: 8 } : other;
    const sw = id === 8 && f >= BEAT.swapping - 7, s3 = sideOf(cam, p2, [SIGN_A[0] + 0.95, 0, SIGN_A[2] + 0.5]);
    const sly = id === 8 && f >= CLK + 2 && f < CLK + 12;
    const opts2: PersonOpts = { mode: "kneel", expr: tuck ? "shifty" : sly ? "smug" : lens ? "focus" : sw ? "smile" : tally ? "focus" : "calm",
      look: tuck ? -sd * 1.3 : sly ? 0 : lens ? sd * 0.4 : sw ? s3 * 1.2 : tally ? sd * 0.6 : 0.3, lookY: sly ? 0 : lens ? -0.3 : sw ? -0.1 : tally ? 1 : tuck ? 0 : -0.2,
      blink: blinkAt(f, i, [HID + 7, CLK + 9], [CLK]), facing: sly ? 0 : sw ? s3 : sd, breath: L.breath * 1.3, squash: 0.4 * bump(f, CLK, 2),
      tilt: L.sway * 0.8 + sd * 6, headTilt: L.head * 0.6 + (sly ? 4 * sd : 0), face: { browUp: sly ? (sd > 0 ? [0, 4] : [4, 0]) : undefined },
      hands: lens ? (sd < 0 ? [first, otherC] : [otherC, first]) : sd < 0 ? [otherC, first] : [first, otherC] };
    if (lens) {
      // A6 (render check video 1010: the card sat BEHIND asst1's body, so the 2:00:00 never showed; then, chin-high, it
      // covered asst1's FACE): the big stopwatch is screen-anchored ABOVE both hats (centre <= 0.205 H, face whole in
      // frame, 0.24 W wide = digits ~42 px at 1080), drawn just in front of the nearer assistant (near the focus plane);
      // his raised arm is then re-aimed so his ball hand lands EXACTLY on the card's drawn hand (one continuous arm);
      // a 2-3 f thumb press + 1 f readout flicker on the click
      const wi = sd < 0 ? 0 : 1, B8 = basisOf(8, f), o0 = { ...opts2, light: light2D(cam), seed: seedOf(i) };
      const hs = toScr(B8, toWorld(cam, p2, 1, handAt(a.o, o0, wi), 0.05)), dA = toScr(B8, [p1[0], 1.0, p1[2]])[2];
      const k = clamp01(up), Wf = 0.12 + 0.03 * k, Hf = Wf * 1.25 * ASPECT; // A7 P2: ~150 px at 1080 (no longer a giant card over the hats)
      const press = vt(f) >= vt(CLK) - 1 && vt(f) < vt(CLK) + 2 ? 1 : 0, tick = vt(f) >= vt(CLK) && vt(f) < vt(CLK) + 1;
      // A6 P1 (the watch sat on asst2's brim / over his eye once the cu8 push lifted the heads): anchored ABOVE the
      // higher head top (hat included) when there is room; otherwise beside the heads, >= 0.04 W clear of both circles
      const headS = (o: Outfit, po: PersonOpts, p: V3) => { const [hx, hy, ha] = headAt(o, po), c = toScr(B8, toWorld(cam, p, 1, [hx, hy])), t = toScr(B8, toWorld(cam, p, 1, [hx, hy - 1.55 * ha])), s = toScr(B8, toWorld(cam, p, 1, [hx + 1.25 * ha, hy]));
        return { x: c[0], y: c[1], top: t[1], rx: Math.abs(s[0] - c[0]), ry: Math.abs(c[1] - t[1]) }; };
      const sd1 = sideOf(cam, p1, p2), heads = [headS(a.o, o0, p2), headS(A.asst1.o, { mode: "kneel", facing: sd1, seed: seedOf(A.asst1.i), tilt: sd1 * 8 }, p1)];
      // A7 P2 (the arm was a noodle up over the hats): held at HEAD height beside his OWN head on the inner side (the
      // clear gap between the two heads), >= 0.035 W clear of both faces; a 2 f dip, then a 10-15 cm thrust up with a
      // 2 f overshoot on the click
      const uc = vt(f) - vt(CLK), thrust = uc < -3 ? 0 : uc < -1 ? -0.4 * bump(uc, -3, 2) : clamp01(settle(uc, -1, 4)) * (1 - rampV(uc, 4, 4));
      let sx = heads[0].x + sd * (heads[0].rx + 0.055 + Wf / 2), sy = heads[0].y - 0.6 * heads[0].ry - 0.03 * thrust * k + 0.005 * press; // (render check: at eye level it read as a monocle: up at the brim, further out)
      if (sd > 0) sx = Math.min(sx, heads[1].x - heads[1].rx - 0.035 - Wf / 2); else sx = Math.max(sx, heads[1].x + heads[1].rx + 0.035 + Wf / 2);
      void hs;
      if (sy < 0.04 + Hf / 2) {
        sy = 0.04 + Hf / 2 + 0.006 * press;
        for (const h of heads) if (Math.abs(sy - h.y) < Hf / 2 + h.ry && Math.abs(sx - h.x) < Wf / 2 + h.rx + 0.04) sx = h.x + (sx >= h.x ? 1 : -1) * (Wf / 2 + h.rx + 0.04);
        sx = clamp(sx, 0.03 + Wf / 2, 0.97 - Wf / 2);
      }
      const d = Math.max(0.6, Math.min(hs[2], dA) - 0.3), fw = frameW(B8, d);
      const chD = toDesignRay(cam, p2, 1, fromScr(B8, sx - 0.29 * Wf, sy + 0.265 * Hf, hs[2]));
      const hh2 = [...opts2.hands!] as [Hand | null, Hand | null]; hh2[wi] = { a: chD, hold: null, maxLen: 1.45, bend: 1.2 }; opts2.hands = hh2;
      fx(out, `stopw${press}${tick ? "f" : ""}`, 320, 400, (p) => fxStopwatch(p, press, tick), fromScr(B8, sx, sy, d), Wf * fw, Wf * 1.25 * fw, { rot: 0.06 * sd * (1 - k) });
    }
    put(out, cam, a, p2, opts2);
    fx(out, "tally", 256, 320, (p) => fxTally(p), [p2[0] - 0.5, GY - 0.03, p2[2] + 0.3], 0.24, 0.3, { flat: true, rot: 0.4 + 0.04 * wnd(f, p2[0], p2[2]) });
  }
};

/** the sign-swap assistant. A4: a readable, physical swap (toon.ts swapPath / SWAP_T, the shared panel motion): he
 *  glances up at the LED, lays a hand on the panel edge, a 3 f squat, BOTH hands pinned to the panel's near side edge,
 *  lifts + unhooks it (8 f), carries it down (he CROUCHES so his hands stay on it) and leans it on the post (a dust
 *  puff), crouches to lift the new panel out of the stack, hangs it (2 f overshoot), steps back, looks up, nods, dusts
 *  off his hands, picks the old panel up and walks off RIGHT with it under his arm (A4: the same in shots 8 and 9, so
 *  the 8 -> 9 match dissolve never ghosts him into tourist A) */
const swapper = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = A.asst3, i = a.i, L = life(f, i), t = f - BEAT.swapping, hook = SIGN_A, T = SWAP_T;
  const P0: V3 = [hook[0] + 0.95, 0, hook[2] + 0.5]; // 0.95 m right of the hook: his hands reach the panel edge BESIDE his shoulder
  // A5 P2: in shot 8's last frames (and its dissolve) the Sign A raven is shot 9's opening raven (same id / perch /
  // controls), so the 8 -> 9 dissolve shows ONE solid bird and it never vanishes when he walks off
  if (id === 8 && f >= S(8).b - 9) raven(out, cam, f, LED_TOP(SIGN_A), {}, 2);
  if (t >= T.gone9) {
    const W0 = BEAT.swapping + T.gone9, s = 3.4 * Math.max(0, (vt(f) - vt(W0)) / FPS) * smooth((f - W0) / 3 + 0.5), P: V3 = [P0[0] + 0.12 + s, 0, P0[2]]; // A6: a brisk exit right (3.4 m/s)
    if (s > 3.2) return;
    put(out, cam, a, P, { ...idle(f, i, P), mode: "walk", phase: s / 1.0, lift: 1.3, facing: 1, expr: f < W0 + 10 ? "smile" : "calm",
      look: f < W0 + 8 ? -1.0 : 0.8, blink: blinkAt(f, i, [W0 + 9]), hands: [{ a: "hang", dy: -4 * Math.sin(s * 3) }, { a: "hang", dy: 4 * Math.sin(s * 3) }] });
    return;
  }
  const { old, neu } = swapPath(8, t);
  const step = 0.12 * smooth((t - T.hung) / 4), P: V3 = [P0[0] + step, 0, P0[2]];
  const pw = (pose: PanelPose, ex: number, ey: number): P2 => { // a point on a panel (local, m) -> design point that looks right
    const c = Math.cos(pose[3]), s2 = Math.sin(pose[3]), x = hook[0] + pose[0] + ex * c - ey * s2, y = hook[1] + pose[1] + ex * s2 + ey * c;
    return toDesignRay(cam, P, 1, [x, y, hook[2] + pose[2]]);
  };
  const ns = sideOf(cam, hook, P), ex0 = ns * 0.45;
  let h0: Hand = { a: "hang" }, h1: Hand = { a: "hip" }, expr: Expr = "calm", squash = 0, look = -0.6, lookY = -0.3, facing: -1 | 0 | 1 = -1, nod = 0, held: PanelPose | null = null;
  const grip = (pose: PanelPose, k = 1): [Hand, Hand] => { held = pose; return [{ a: "hip", b: pw(pose, ex0, 0.12), k, maxLen: 1.5 }, { a: "hip", b: pw(pose, ex0, -0.3), k, maxLen: 1.5 }]; };
  let headAdd = 0;
  // A7 P2 (a frozen frontal lead in the busiest wide): he rubs his hands (ready to work), looks UP at the LED on
  // "the trails," (head tipped 6 deg, 10 f), then at the panel he will swap, before the existing glance + grip
  if (t < -26) { const rub = 4 * Math.sin(vt(f) * 0.9); facing = 0; look = 0.3; lookY = 0.2; expr = "calm"; h0 = { a: "chest", dx: 4 + rub }; h1 = { a: "chest", dx: -4 - rub }; }
  else if (t < -14) { facing = -1; expr = "focus"; look = t < -20 ? -0.6 : -0.9; lookY = t < -20 ? -1.2 : -0.5; headAdd = t < -20 ? 6 : 2; h0 = { a: "hang" }; h1 = { a: "hip" }; }
  else if (t < -8) { facing = 0; expr = "focus"; look = -0.7; lookY = -1; }                                  // glances up at the LED
  else if (t < -4) { expr = "focus"; h1 = { a: "hip", b: pw(old!, ex0, -0.1), k: smooth((t + 8) / 3), maxLen: 1.5 }; squash = 0.45 * bump(t, -7, 3); lookY = -0.4; } // a hand on the edge, the 3 f dip
  else if (t < T.grip) { [h0, h1] = grip(old!, smooth((t + 4) / 3)); expr = "effort"; lookY = -0.5; squash = 0.5 * bump(t, -4, 3); } // both hands to the near edge, a 3 f squat
  else if (t < T.leaned) { [h0, h1] = grip(old!); expr = "effort"; lookY = t < T.lifted ? -0.7 : 0.4; look = -0.9; squash = 0.3 * bump(t, T.lifted - 1, 3); }
  else if (t < T.hung) { [h0, h1] = grip(neu); expr = "effort"; look = t < T.up ? 0.4 : -0.8; lookY = t < T.up ? 0.6 : -0.6; squash = 0.6 * bump(t, T.up + 4, 3); }
  else if (t < T.hung + 3) { expr = "smile"; look = -0.8; lookY = -1; facing = -1; nod = 0.8 * bump(t, T.hung, 3); }  // steps back, looks up at it, nods
  else { const rub = 5 * Math.sin((t - T.hung - 3) * 2.4); h0 = { a: "chest", dx: 4 + rub }; h1 = { a: "chest", dx: -4 - rub }; expr = "grin"; look = 0.6; lookY = 0; facing = 1; } // dusts his hands, turns to go
  // A4: he crouches whenever the panel he holds is low (the leaning spot, the stack), so his hands stay ON it
  const hy = held ? hook[1] + (held as PanelPose)[1] : 2, crouch = clamp01((1.05 - hy) / 0.5);
  put(out, cam, a, P, { ...idle(f, i, P), breath: L.breath * 1.6, tilt: L.sway * 1.5 + 1.2 * L.shift - 3 * squash + (t >= T.hung && t < T.hung + 4 ? 3 * bump(t, T.hung, 4) : 0), shift: L.shift, headTilt: L.head + headAdd,
    expr, look, lookY, nod, squash, facing, crouch, blink: blinkAt(f, i, [BEAT.swapping - 9, BEAT.swapping + T.hung, BEAT.swapping + T.hung + 5]), hands: [h0, h1] });
  puff(out, [hook[0] + SWAP_LEAN[0], GY, hook[2] + SWAP_LEAN[2] + 0.05], f, BEAT.swapping + T.leaned, 8);     // the old panel lands on the post foot
  // a raven on Sign A's LED housing watches the swap: snaps to the panel on the grip, ruffles on the clack (hung)
  { const c: RavenX = {}, R = LED_TOP(SIGN_A), tc = BEAT.swapping + T.hung;
    if (f >= BEAT.swapping - 5 && f < tc) { c.head = sideOf(cam, R, P); c.dip = 1; } else if (f >= tc && f < tc + 10) c.head = 0;
    if (f >= tc && f < tc + 8) { c.ruffle = Math.sin((Math.PI * (f - tc)) / 8); c.wing = f < tc + 3 ? 0.5 : 0; c.hop = f < tc + 4 ? 0.4 * Math.sin((Math.PI * (f - tc)) / 4) : 0; } // A4: a startled hop + wing flick on the clack
    if (id === 8 && f < S(8).b - 9) raven(out, cam, f, R, c, 5); }
};

/** shot 9: A3 acting. Reader A at Sign A: brows up on "Please", then reads with 3 left -> right eye sweeps per line
 *  (7 f each, 1 f snap back), a blink, the hand-to-chin until he nods a satisfied "fair enough" on "wood." (hands to
 *  hips), looks up as the raven's shadow sweeps over him. Reader B (red cap, sunglasses up) right of Sign B (0.15 m
 *  further right, clear of the pictogram): UP at the panel on "Many", a smug side-eye to the lens on "visitors", eyes
 *  DOWN at a white-dotted chip by his foot on "removed", then shifty glances + a hip-pocket pat; asst2 far back ticks the
 *  tally ON the beats; the raven glides low from A's LED to B's with a 4 f wing cycle and a ground shadow */
const signReaders = (out: Stage, cam: CamInfo, f: number) => {
  const fo = 934, L0 = 958; // the raven's take-off / landing (also read by reader A's look-up)
  {
    // A4: real brows on skin (the fringe lifted), the "o" only 6 f on "Please", then the pupils UP-LEFT on the sign text
    // (features slide toward it, head tipped 5 deg) with 3 left -> right saccades per line every 8 f, brows up on
    // "remove", a blink, a finger tracing the line, the knowing half-lid smirk 3 f before "wood." and a nod
    const a = TOUR(2, { glasses: null, fringeUp: 0.09, hat: "bucket", hatCol: "#8fb8d8", sunUp: false }, "r"), i = a.i, P = tt([-2.45 + 0.4 * ramp(f, 950, 20), 0, 0.9]), L = life(f, i), sd = sideOf(cam, P, SIGN_A); // A5: whole in the MS, 0.4 m right for the closing wide
    const PL = BEAT.please1, DN = PW(14, "don't"), WD = PW(14, "wood."), RM = PW(14, "remove");
    // A5 P2: "o" on "Please" (8+ f), GUILTY on "don't" (brows down, 12 f), then reading (up-left on the text, saccades
    // every ~15 video f), the knowing "fair" + nod on "wood.", then his head + eyes follow the raven's take-off right
    // A6 P3: a closed-mouth "hm?" (brows up) on "Please" (never an "o" mouthing the narration)
    const ex: K<Expr>[] = [[0, "listen"], [PL - 2, "skeptic"], [DN - 1, "guilty"], [DN + 11, "read"], [WD - 3, "fair"], [BEAT.another + 1, "smile"]];
    const e = at(f, ex), nodK = bumpV(dvf(f, WD), -1, 9) * 1.15 - 0.15 * bumpV(dvf(f, WD), 8, 3); // A7: the nod over 9 video f + a small overshoot
    // A6 P2: a clear up-left read: saccades every 9 video f (3 per line, 1 f snap back), features well onto the sign
    const reading = f >= PL - 2 && f < WD - 3, dv = vt(f) - vt(PL), line = clamp(Math.floor(dv / 28), 0, 5), k3 = mod(dv, 28) >= 27 ? 0 : Math.min(2, Math.floor(mod(dv, 28) / 9));
    let look = reading ? sd * (1.1 + 0.5 * (k3 - 1)) : sd * 0.7, lookY = reading ? -1.25 + line * 0.08 : -0.3;
    const follow = f >= WD + 1 && f < fo + 16, rv = sideOf(cam, P, LED_TOP(SIGN_B));   // follows the raven's take-off to the right
    if (follow) { look = rv * 1.3; lookY = -0.9; }
    const browA: [number, number] | undefined = (f >= RM - 1 && f < RM + 8) || (f >= PL - 2 && f < DN - 1) ? [5, 5] : undefined;
    const scratch = f >= 914 && f < WD - 1 ? 1.6 * Math.sin(vt(f) * 1.9) : 0;              // a chin scratch while he reads on (video ~1176-1196)
    const shiftA = f >= 914 && f < 932 ? -1 : L.shift;                                   // a weight shift at ~video 1176
    put(out, cam, a, P, { ...idle(f, i, P), tilt: L.sway * 1.9 + 0.9 * shiftA, shift: shiftA, expr: e, facing: follow ? rv : sd, look, lookY, breath: L.breath * 1.8,
      // A6: a clearer read: the features slide further up-left onto the text and the head tips back (dot eyes read as
      // "at the lens" unless the whole face turns to the sign)
      headTilt: L.head * 0.9 + (reading ? sd * 9 : sd * 2) + (follow ? rv * 6 : 0), nod: nodK * 0.9 + (reading ? -0.5 : 0), face: { fdy: reading ? -12 : follow ? -8 : 0, fdx: reading ? sd * (13 + 2 * (k3 - 1)) : 0, browUp: browA ?? (reading ? [2, 2] : undefined) },
      blink: blinkAt(f, i, [...swapsOf(ex), PL + 25]), flutter: flutAt(f, i), wind: wnd(f, P[0], P[2]), hairSwing: 3 * wnd(f, P[0], P[2]),
      // A7 P2: on "wood." a respectful nod + a touch of the hat brim (near hand, 6 f up, held, 6 f down), then hands on hips
      hands: f >= WD - 1 ? (() => { const uw = dvf(f, WD), tip = rampV(uw, 0, 6) * (1 - rampV(uw, 16, 6)), hipK = ramp(f, WD - 1, 5);
        const brimH: Hand = tip > 0.02 ? { a: "hip", b: "head", k: tip, dx: 4, dy: -10 * tip, bend: 1.3 } : { a: "hang", b: "hip", k: hipK };
        return sd < 0 ? [{ a: "hang", b: "hip", k: hipK }, brimH] : [brimH, { a: "hang", b: "hip", k: hipK }]; })() as [Hand, Hand]
        : sd < 0 ? [{ a: "chin", dx: -sd * 4, dy: scratch }, { a: "hang" }] : [{ a: "hang" }, { a: "chin", dx: sd * 4, dy: scratch }] });
  }
  {
    const a = TOUR(3, {}, "r"), i = a.i, P = tt([0.6, 0, 0.8]), L = life(f, i), sd = sideOf(cam, P, SIGN_B);
    const MANY = BEAT.many1, VIS = PW(15, "visitors"), REM = PW(15, "removed"), chipP = tt([0.36, GY + 0.03, 1.02]);
    // A7 P1 (the chip sat glued to his chest with no hand, then slid off by itself): on the VIDEO clock (u = video frames
    // from the old "removed" = the new "take"): his near hand HOLDS the big chip out beside his chest from the start
    // (the arm and ball hand read clear of the shirt); "hm?" up at the panel on "Many", a smug side-eye at us on
    // "visitors", then the sneak: eyes LEFT (6 f), RIGHT (6 f), a 2 f anticipation lift, 4 f down into the hip-pocket slit,
    // a 2 f tuck, two pats (u 18 / 24, 3 f, 8 px), and a scheming grin at us through "the wood."
    const u = dvf(f, REM), hi = sd < 0 ? 1 : 0, hs = hi ? 1 : -1;
    const ex: K<Expr>[] = [[-999, "listen"], [vt(MANY) - 2 - vt(REM), "skeptic"], [-11, "shifty"], [9, "scheme"]];
    const e = atV(f, REM, ex);
    let look = sd * 0.9, lookY = -0.3, head = L.head * 0.7, facing: -1 | 0 | 1 = sd;
    if (f < VIS - 2) { if (f >= MANY - 2) { look = sd * 1.1; lookY = -1.1; head += sd * 6; } }   // UP at the panel text
    if (e === "shifty") { const g = u < -5 ? -1 : u < 1 ? 1 : 0; look = g ? g * 1.35 : hs * 0.8; lookY = g ? 0.05 : 0.9; head += g * 5; facing = g ? (g as -1 | 1) : sd; } // left, right, then down at the pocket
    if (e === "scheme") { look = 0; lookY = 0; head += 2; }
    const lift = -6 * bumpV(u, 0, 2), kIn = rampV(u, 2, 4), pats = -8 * bumpV(u, 10, 3) - 8 * bumpV(u, 16, 3);
    const hipH: Hand = u < 2 ? { a: "show", dx: -hs * 4, dy: 20 + lift + 1.2 * Math.sin(VF * 0.35), hold: "chip", n: 4, bend: 1.2 }
      : u < 8 ? { a: "show", b: "hipPocket", k: kIn, dx: -hs * 4 * (1 - kIn), dy: 20 * (1 - kIn) + 3 * bumpV(u, 6, 2), hold: kIn < 0.85 ? "chip" : null, n: 4 }
        : { a: "hipPocket", dy: pats };
    const opts9: PersonOpts = { ...idle(f, i, P), tilt: L.sway * 1.3 + 0.7 * L.shift - hs * 3 * kIn * (1 - rampV(u, 10, 6)), expr: e, facing, look, lookY, headTilt: head, breath: L.breath * 1.3,
      face: { fdy: e === "skeptic" ? -4 : 0, browUp: e === "skeptic" ? [6, 6] : undefined }, blink: blinkAt(f, i, [MANY - 2, pAt(REM, -11), pAt(REM, 9)], [MANY - 2]), flutter: flutAt(f, i),
      squash: 0.3 * kIn * (1 - rampV(u, 10, 6)), bulge: rampV(u, 8, 3), hipSlit: [hs, q(rampV(u, 8, 3) * (1 + 0.1 * bumpV(u, 10, 3) + 0.1 * bumpV(u, 16, 3)), 12), u >= 8 ? 0.5 : 0],
      hands: hi ? [{ a: "hang", dy: 1.5 * Math.sin(VF * 0.2) }, hipH] : [hipH, { a: "hang", dy: 1.5 * Math.sin(VF * 0.2) }] };
    put(out, cam, a, P, opts9);
    fx(out, "chip9", 96, 96, (p) => fxChip(p, 14, true, false, 1.5), chipP, 0.09, 0.08);
    { const hp = handAt(a.o, { ...opts9, seed: seedOf(i) }, hi as 0 | 1); void VIS;
      glintAt(out, toWorld(cam, P, 1, [hp[0], hp[1] - 52], 0.12), vt(f), vt(REM) - 14, 0.24, 7);  // the chip twinkles before it goes in
      if (u >= 10 && u < 22) puff(out, toWorld(cam, P, 1, [hp[0], hp[1] + 8], 0.12), vt(f), vt(REM) + (u < 16 ? 10 : 16), 6); }
  }
  // asst2 kneels far back on the LONG LOGS path: a pencil tick ON each beat ("Please", "Another", "Many"), the stopwatch
  // up once (click), glances at the readers between ticks
  { const a = A.asst2, i = a.i, p = tt([-0.3, 0, -6.2]), L = life(f, i), sB = sideOf(cam, p, tt([0.8, 0, 0.8])), sA = sideOf(cam, p, tt([-2.45, 0, 0.9]));
    const beats = [BEAT.please1, BEAT.another, BEAT.many1, PW(15, "removed")], tick = beats.some((b) => f >= b && f < b + 3);
    const gl = mod(Math.floor(vt(f) / 26), 3), turn = f >= 1040 || gl === 1, lookAt = f >= BEAT.another ? sB : sA;
    put(out, cam, a, p, { mode: "kneel", expr: turn ? "smile" : "focus", facing: turn ? lookAt : 1, look: turn ? lookAt * 1.3 : 0.6, lookY: turn ? 0 : 1, blink: blinkAt(f, i), breath: L.breath * 1.3, tilt: 6 + L.sway * 0.8,
      headTilt: L.head * 0.6, hands: [{ a: "show", dy: 6, hold: "tally", ang: 10 }, f >= 960 && f < 974 ? { a: "show", dx: -10, dy: -18, hold: "stopwatch", n: Math.floor(vt(f) / 30) + (f >= 965 && f < 968 ? 1000 : 0) } : { a: "show", dx: -14, dy: 10 - (tick ? 6 : 0), hold: "pencil", ang: -30 }] }); }
  // a distant couple strolls the JASPER path behind Sign A: one points at a log, one lifts a camera (flash ~905)
  { const c1 = TOUR(5, {}, "9c"), c2 = TOUR(1, {}, "9c"), q1 = tt([-4.2 + 0.4 * ((f - 872) / FPS), 0, -17]), q2 = tt([-3.5 + 0.4 * ((f - 872) / FPS), 0, -17.4]);
    const up = ramp(f, 898, 4) * (1 - ramp(f, 912, 4));
    put(out, cam, c1, q1, { ...idle(f, c1.i, q1), facing: 1, expr: "grin", blink: blinkAt(f, c1.i), hands: [{ a: "hang" }, { a: "point", dy: -6 }] });
    put(out, cam, c2, q2, { ...idle(f, c2.i, q2), facing: -1, expr: up > 0.5 ? "focus" : "smile", blink: blinkAt(f, c2.i), hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] });
    flash(out, toWorld(cam, q2, 1, [300, 300], 0.2), f, 905, 2, 0.45); }
  // a tourist far up the LONG LOGS path pockets one of the marked chips in the closing wide (1033-1038)
  { const a = TOUR(4, {}, "9b"), p = tt([0.9, 0, -4.4]), cr = crouchAt(f, 1033, 3, 4), sd2 = sideOf(cam, p, tt([0, 0, 0]));
    put(out, cam, a, p, { ...idle(f, a.i, p), crouch: cr.k, facing: sd2, expr: f >= 1031 ? "shifty" : "smile", look: f >= 1031 ? (Math.floor(vt(f) / 3) % 2 ? 1.3 : -1.3) : sd2, blink: blinkAt(f, a.i),
      hands: [{ a: f < 1036 ? "hang" : "pocket", b: "ground", k: cr.reach, hold: f >= 1033 && f < 1040 ? "chip" : null }, { a: "hip" }] }); }
  // A3: a ranger strolls far right in the closing two-sign wide (staff present while people pocket chips)
  if (f >= 990) walker(out, cam, A.ranger, f, 1030, tt([2.6, 0, -9.5]), -1, 0.1, 0.6, { expr: "calm", look: -0.8 });
  // ravens: A's snaps to the lens on "Please", toward Sign B as the truck starts, takes off at fo and GLIDES LOW with the
  // truck (apex 0.3 m, a 4 f flap cycle, a soft shadow sweeping the ground) to land on B's LED at L0 (3 f wing settle +
  // a hop), then snaps toward the tourist on "Many"
  {
    const pA = LED_TOP(SIGN_A), pB = LED_TOP(SIGN_B), c: RavenX = {};
    if (f < fo) { if (f >= 886 && f < 900) c.head = 0; if (f >= 928) c.head = 1; raven(out, cam, f, pA, c, 2); }
    else if (f < L0 + 12) {
      const u = clamp01((f - fo) / (L0 - fo)), arc = Math.sin(Math.PI * u) * 0.3;
      const pos: V3 = [pA[0] + (pB[0] - pA[0]) * smooth(u), pA[1] + arc, pA[2] + (pB[2] - pA[2]) * u];
      if (f < L0) { c.wing = mod(f - fo, 4) < 2 ? 1 : 0.25; c.head = 1; }
      else { const h = f - L0; c.hop = h < 4 ? 0.6 * Math.sin((Math.PI * h) / 4) : h < 8 ? 0.35 * Math.sin((Math.PI * (h - 4)) / 4) : 0; c.wing = h < 3 ? 0.6 * (1 - h / 3) : 0; c.head = 1; }
      if (f < L0) { const w = mod(f - fo, 4) < 2 ? 1 : -0.6, dir = sideOf(cam, pA, pB); fx(out, `fly${w}d${dir}`, 256, 128, (p) => fxFlyRaven(p, w, "#1e2233", dir), [pos[0], pos[1] + 0.1, pos[2]], 0.62, 0.31, { rot: 0.05 }); } // A4: the flight card while gliding
      else raven(out, cam, f, pos, c, 2);
      if (f < L0) { const g: V3 = [pos[0] - 0.5 + 0.8 * u, GY, pos[2] + 0.9]; fx(out, "blob|contact|#9a92b4", 128, 128, (p) => fxContact(p, "#9a92b4"), g, 0.42, 0.2, { flat: true, rot: 0 }); }
    } else { const tb = tt([0.6, 0, 0.8]), RMB = PW(15, "removed");
      if (f >= BEAT.many1 - 1 && f < BEAT.many1 + 20) c.head = sideOf(cam, pB, tb);
      if (dvf(f, RMB) >= 2 && dvf(f, RMB) < 20) { c.head = sideOf(cam, pB, tb); c.cock = 16 * c.head; c.dip = 0.7; } // A7: the head snap DOWN at the theft, held 16 video f
      raven(out, cam, f, pB, c, 3); }
  }
};

/** where a squatting character's hand i touches the ground (world), for the chips they pick up */
const groundAt = (cam: CamInfo, a: Act, P: V3, facing: -1 | 1, i: 0 | 1, tilt = 0): V3 => {
  const d = handAt(a.o, { mode: "squat", facing, seed: seedOf(a.i), tilt, hands: [{ a: "ground" }, { a: "ground" }] }, i), w = toWorld(cam, P, 1, [d[0], 972], 0.14);
  return [w[0], GY + 0.03, w[2]];
};
/** shot 10 results (A3). At Sign A one tourist crouches (a real knee-bend arc, never a 1 f pop) and picks a chip up
 *  after the camera settles, rises, SEES the red bar (head 6 deg toward it, eyes up on it, "!" held 9 f, a 2 f
 *  startle), worries (the sweat drop rides his head), crouches again and puts it back ON "2%" (dust puff), then
 *  whistles with a side-eye back at the sign. At Sign B a CLUSTER of five (3 in front, 2 behind, <= 2.6 m wide, none
 *  over the panel) swap sly glances, then all in unison: crouch, pick, rise, hold the chips up (a glint each), into
 *  the hip pocket with a pat + dust puff, eyes snap left, then right, and grin on the cha-ching */
/** the Sign B crowd [variant, position, outfit tweaks, scale]: adults only, varied shirts (orange, coral, mango,
 *  peach), prints (flowers / palms / pineapples) and hats (red cap, visor, bucket); WORLD-EXT's CROWD_B chips match */
/** A5 P1: a TIGHT arc of five in front of Sign B (x -0.78..+0.78, z 0.42..1.3 TT-local): the two ends back by the posts,
 *  two in the middle, the shortest one front-centre, so all five fit the Sign B hold (CAM: see lead_requests) */
const CROWD10: [number, V3, Partial<Outfit>, number][] = [
  [0, tt([0.02, 0, 1.05]), { glasses: "sun", shirt: "#f07a2a" }, 0.96],
  [6, tt([-0.78, 0, 0.22]), { hairStyle: "none", hat: "cap", hatCol: "#3e6ab8", shirt: "#f2665a", moustache: "#b8b8c2", print: "palm" }, 1.0], // A7 P2: never the honest tourist A's white visor
  [5, tt([1.05, 0, 0.2]), { hat: "bucket", hatCol: "#f2c230", shirt: "#f59b2e", print: "pine" }, 1.02], // A6 P2: 0.25 m right (her face whole)
  [3, tt([-0.5, 0, 0.7]), { hat: "bucket", hatCol: "#f4f1ea", shirt: "#f4a26b", sunUp: false, glasses: null, print: "palm" }, 1.04],
  [7, tt([0.52, 0, 0.66]), { hat: "visor", hatCol: "#f2a03a", shirt: "#e8582e", print: "pine" }, 0.99],
];
/** the crowd's per-member stagger (picture frames, 0-2 video f) */
const OFF10 = [0, 0.8, 0, 1.4, 0.6];
const results = (out: Stage, cam: CamInfo, f: number) => {
  {
    const a = TOUR(1, {}, "A"), P = tt([-2.2, 0, 0.6]), i = a.i, sd = sideOf(cam, P, SIGN_A), L = life(f, i);
    const chip0: V3 = tt([-2.58, GY + 0.04, 0.42]), PUT = BEAT.pct2, PICK = PUT - 16, SEE = PICK + 5;
    const c1 = crouchAt(f, PICK, 4, 5), c2 = crouchAt(f, PUT, 5, 4), cr = f < PUT - 6 ? c1 : c2;
    const holding = f >= PICK && f < PUT;
    // A5 P2: the chip held OUT in front of the shirt (clear of the strap, 1.45x), then after the put-back a 3-step
    // innocent stroll to the right with his hands behind his back, head tilting on each whistle note
    // A6 P2: while held the chip sits at CHEST height out beside him (below the chin), so the '!' face reads whole
    const hand: Hand = { a: holding ? "show" : f >= PUT + 9 ? "behind" : "hang", b: "ground", k: cr.reach, dx: holding ? 14 * sd : 4, dy: holding ? 40 * (1 - cr.reach) : 0, hold: holding ? "chip" : null, n: 4 };
    const ex: K<Expr>[] = [[0, "smile"], [PICK + 1, "grin"], [SEE, "browsUp"], [PUT - 4, "worry"], [PUT + 2, "guilty"], [PUT + 6, "whistle"]];
    const e = at(f, ex);
    let look = sd * 0.7, lookY = 1, head = L.head * 0.6;
    if (f < PICK - 8) { look = sd * 0.3; lookY = 0.9; }                         // eyeing the chip on the ground
    if (f >= PICK + 1 && f < SEE) { look = sd * 0.3; lookY = 0.6; }            // admiring it in his hand
    if (f >= SEE && f < PUT - 4) { look = sd * 1.9; lookY = -1.3; head += sd * 9 * clamp01(settle(f, SEE, 1.5)); } // A5: a 1-2 f head SNAP up-left onto Sign A's red bar
    if (f >= PUT - 4 && f < PUT - 2) { look = 0; lookY = 0; }                  // the worried look to the lens
    if (f >= PUT - 2 && f < PUT + 4) { look = sd * 0.6; lookY = 1; }
    if (f >= PUT + 6) { const wk = Math.floor((vt(f) - vt(PUT + 6)) / 10) % 2; look = wk ? sd * 1.3 : -sd * 0.7; lookY = wk ? -0.7 : -0.4; } // side-eye back at the sign
    const NT = [PUT + 12, PUT + 20, PUT + 28], tiltN = NT.reduce((m, s0, k) => m + (k % 2 ? -4 : 4) * bump(f, s0, 6), 0); // head tilts on the notes
    head += tiltN;
    const ST0 = PUT + 8, stroll = f >= ST0 ? Math.min(0.42, 0.5 * ((vt(f) - vt(ST0)) / FPS)) : 0, strolling = f >= ST0 && stroll < 0.42; // 3 steps, ~0.42 m
    const startle = bump(f, SEE, 2);
    const free: Hand = f >= PUT + 10 ? { a: "behind" } : f >= PUT + 6 ? { a: "chest", dx: 4 * Math.sin(VF * 1.6) } : { a: "hang" };
    // (he strolls toward screen CENTRE: the right edge is close in this framing)
    const Pa: V3 = [P[0] - cam.right.x * stroll, 0, P[2] - cam.right.z * stroll], fr = sideOf(cam, P, [P[0] - cam.right.x, 0, P[2] - cam.right.z]);
    const po: PersonOpts = { ...idle(f, i, Pa), crouch: cr.k, expr: e, facing: strolling ? fr : sd, look, lookY, squash: -0.5 * startle, headTilt: head, breath: L.breath * 1.3,
      blink: f >= PUT + 6 ? (Math.floor((vt(f) - vt(PUT + 6)) / 10) % 2 ? 0 : 1) : blinkAt(f, i, [PUT - 5, PUT + 2], [SEE]), tilt: L.sway * 1.1 + (strolling ? 4 * fr : 0),
      face: { blush: e === "guilty" ? 1 : 0, fdy: lookY < 0 ? -6 : 0, fdx: e === "browsUp" ? sd * 9 : 0 }, flutter: flutAt(f, i),
      ...(strolling ? { mode: "walk" as const, phase: stroll / 0.28, lift: 0.5 } : {}),
      hands: strolling ? [{ a: "behind" }, { a: "behind" }] : sd < 0 ? [hand, free] : [free, hand] };
    const poA = put(out, cam, a, Pa, po, { rise: 0.02 * startle });
    if (f < PICK) fx(out, "chipA", 128, 128, (p) => fxChip(p, 5, true), chip0, 0.13, 0.11);
    else if (f >= PUT) fx(out, "chipA", 128, 128, (p) => fxChip(p, 5, true), chip0, 0.13, 0.11);
    { const [hx, hy] = headAt(a.o, { ...po, seed: seedOf(i), light: light2D(cam) }), t = f - SEE; // the "!" rides his head, held 9 f
      if (t >= 0 && t < 12) { const k = Math.floor(t) === 0 ? 0.6 : Math.floor(t) === 1 ? 1.12 : 1; // A7 P3: 2x (~60 px at 1080), held 12 f
        fx(out, "bang", 128, 256, (p) => fxBang(p), toWorld(cam, P, 1, [hx + sd * 80, hy - 250], 0.1), 0.16 * k, 0.32 * k, { rot: -0.15 * sd }); } }
    sweatHead(out, cam, a, P, { ...po, seed: seedOf(i), light: light2D(cam) }, -sd, f, PUT - 4, PUT + 6);
    puff(out, [chip0[0], GY, chip0[2]], f, PUT, 6);
    glintAt(out, [chip0[0], chip0[1] + 0.1, chip0[2] + 0.03], f, PUT + 1, 0.2, 8); // A6 ADD: a tiny 'good citizen' sparkle on the returned chip
    if (f >= PUT + 6) notes(out, cam, Pa, headAt(a.o, poA), f, NT, -sd, 1, 1.6, "#ffd84a"); // A5: 1.6x, warm yellow with the plum ink
    // a ranger far back sees the put-back: a slow approving nod and a hat tip
    if (f < BEAT.withB - 2) { const rp = tt([-6.2, 0, -9]), Lr = life(f, A.ranger.i), nd = bump(f, PUT + 8, 10), tip = bump(f, PUT + 16, 10), sr2 = sideOf(cam, rp, P);
      put(out, cam, A.ranger, rp, { breath: Lr.breath, tilt: Lr.sway, shift: Lr.shift, headTilt: Lr.head, expr: nd > 0.2 || tip > 0.2 ? "nod" : "calm", nod: nd, facing: sr2, look: sr2, blink: blinkAt(f, A.ranger.i),
        hatLift: 10 * tip, hands: [{ a: "hip" }, tip > 0.05 ? { a: "hip", b: "head", k: tip } : { a: "hip" }] }); }
  }
  // A7 P1 (the unison pocketing never read; the punch came before any pat): the whole gag on the VIDEO clock (u = video
  // frames from "8%"; off = 0-1 f stagger): sly glances at each other (6 f each) -> a smug nod -> the squat (contact
  // u -38) -> the chips held up proudly, a glint (12 f) -> a guilty glance at each other -> ALL TOGETHER: a 2 f
  // anticipation lift, 4 f down into the hip pockets -> two unison pats (u -12 / -6, 8 px, a dust puff at each hip)
  // -> on u -3 every head snaps to the SAME side, an innocent look-away held through "8%" (+8 f) -> the grin
  const B = BEAT.pct8, G = B - 29, vB = vt(B); // (G stays the picture anchor of the ground chips for WORLD-EXT's CROWD_B)
  void G;
  CROWD10.forEach(([v, PB, tw, scl], n) => {
    const u = vt(f) - vB, off = n === 1 || n === 3 ? 1 : 0;
    const lv = n === 1 || n === 3 ? smooth((f - (B + 2)) / 12) : 0, sideStep = n === 0 ? 0.55 * smooth((f - (B - 1)) / 6) : 0;
    const P: V3 = [PB[0] - 1.2 * lv + sideStep, 0, PB[2] + 0.1 * lv];
    // the gang ducks under the counter insert (A5 R5) only AFTER the look-away has held (LEAD: the punch starts >= u +4)
    const duck = rampV(u, 5, 3) * (1 - ramp(f, B + 14, 5)), ACT = B + 16;
    const a = TOUR(v, tw, "B"), i = a.i, sd = sideOf(cam, P, tt([0, 0, 0])), out_ = -sd as -1 | 1, L = life(f, i);
    const cr = crouchAt(u, -38 + off, 4, 5);
    const CHU = -32 + off, LIFTU = -20 + off, PKU = -18 + off, INU = -14 + off;
    const hiDy = n === 0 ? 8 : 14 + 3 * (n % 3);
    let hand: Hand;
    if (u >= -45 + off && u < CHU) hand = { a: "show", b: "ground", k: cr.reach, dy: hiDy * (1 - cr.reach) };
    else if (u >= CHU && u < PKU) hand = { a: "show", dy: hiDy - 4 * bumpV(u, CHU, 3) - 7 * bumpV(u, LIFTU, 2) };       // held up proudly, then the lift
    else if (u >= PKU && u < INU) { const k = rampV(u, PKU, 4); hand = { a: "show", b: "pocket", k, dy: hiDy * (1 - k) }; } // down into the pocket (4 f)
    else if (u >= INU && u < 8) hand = { a: "pocket", dy: -8 * bumpV(u, -12, 3) - 8 * bumpV(u, -6, 3) };                 // two unison pats
    else hand = { a: n % 2 ? "hip" : "hang" };
    const held = u >= -38 + off && u < INU;
    hand.hold = held ? "chip" : null; hand.n = 4;
    const ex: K<Expr>[] = [[-999, "smug"], [-56, "shifty"], [-44, "smug"], [-42, "focus"], [CHU - 1, "grin"], [-26, "shifty"], [INU, "smug"], [-3, "calm"], [9, "grin"]];
    const e = at(u, ex);
    let look = 0, lookY = 0, head = L.head * 0.7;
    const nb = n === 0 ? CROWD10[1][1] : CROWD10[n - 1][1], toNb = sideOf(cam, P, nb);
    if (u < -56) { const g = gazeCycle(f, i, [[toNb * 1.3, 0, toNb], [sd * 0.8, -0.6, sd], [sd * 0.6, 1, sd]]); look = g[0]; lookY = g[1]; }
    else if (u < -44) { const sn = Math.floor((u + 56) / 6) % 2 ? 1 : -1; look = sn * 1.35; head += sn * 4; }      // sly glances, 6 f each
    else if (u < -42) { look = 0; lookY = 0.4; }
    else if (u < CHU) { look = sd * 0.5; lookY = 1; }                                                               // down at the chips
    else if (u < -26) { look = out_ * 0.4; lookY = -0.7; head += out_ * 3; }                                       // admiring the chip held up
    else if (u < PKU) { look = toNb * 1.35; lookY = 0; head += toNb * 6; }                                         // a guilty glance at each other
    else if (u < -3) { look = 0; lookY = 0.6; }                                                                      // the pocket + pats, eyes down-front
    else if (u < 9) { look = 1.4; lookY = -0.2; head += 6 * rampV(u, -3, 1); }                                     // the UNISON innocent look-away (same side)
    const nod = bumpV(u, -44, 6);
    let other: Hand = n % 2 ? { a: "hip" } : { a: "hang" };
    if (n === 0 && u >= -62 && u < -50) other = { a: "raise", shape: u < -58 ? "f1" : u < -54 ? "f2" : "f3", dy: -4 * bumpV(u, u < -58 ? -62 : u < -54 ? -58 : -54, 3) };
    const photo = n === 3 && u >= -64 && u < -50;
    if (photo) other = { a: "eye", hold: "camera" };
    if (f >= ACT) {
      if (n === 2 || n === 4) other = { a: "raise", dx: (n === 2 ? 1 : -1) * sd * 18, dy: -6 * bump(f, ACT + 2, 4), shape: "palm" };  // high five
      if (n === 1) other = { a: "head", dy: -4 * bump(f, ACT + 1, 8) };                                                                 // visor tip
      if (n === 0) other = { a: "selfie", hold: "camera", ang: -20 };                                                                   // group selfie
    }
    const hands: [Hand, Hand] = out_ < 0 ? [hand, other] : [other, hand];
    const walkOff = lv > 0.02 && lv < 0.99;
    const po: PersonOpts = { ...idle(f, i, P), crouch: Math.max(cr.k, duck), expr: photo ? "focus" : walkOff ? "smug" : e, facing: walkOff ? -1 : u >= -3 && u < 9 ? 1 : sd, look: walkOff ? 1.2 : look, lookY, headTilt: head, nod, breath: L.breath * 1.3,
      ...(walkOff ? { mode: "walk" as const, phase: lv * 4, lift: 1.2 } : {}),
      blink: blinkAt(f, i, [pAt(B, -56), pAt(B, -44), pAt(B, CHU - 1), pAt(B, -26), pAt(B, INU), pAt(B, 9)], [pAt(B, -3)]), tilt: L.sway * 1.1, face: { blush: e === "grin" ? 0.5 : 0 }, flutter: flutAt(f, i), noCam: photo, hands,
      bulge: rampV(u, INU, 3), squash: 0.3 * bumpV(u, -12, 3) + 0.3 * bumpV(u, -6, 3) };
    // never a posed group photo: idle x2, and every ~20 video f an elbow nudge toward a neighbour (before the gag / after it)
    const nud = bump(mod(vt(f) + 7 * n, 20), 0, 5) * (u < -46 || f >= ACT ? 1 : 0);
    po.tilt = L.sway * 2.2 + 1.2 * L.shift + toNb * 6 * nud; po.breath = L.breath * 2; po.headTilt = (po.headTilt ?? 0) + toNb * 3 * nud;
    put(out, cam, a, P, po, { scale: scl, rise: -0.5 * duck });
    if (u < -38 + off) fx(out, `chipB${n}`, 128, 128, (p) => fxChip(p, 10 + n, true), groundAt(cam, a, P, sd, out_ < 0 ? 0 : 1, out_ * 7), 0.12, 0.1);
    const ho = { ...po, seed: seedOf(i), light: light2D(cam) }, hp = () => handAt(a.o, ho, out_ < 0 ? 0 : 1);
    if (u >= CHU && u < CHU + 9) { const h = hp(); glintAt(out, toWorld(cam, P, scl, [h[0], h[1] - 52], 0.15), u, CHU + (n === 0 ? 0.6 : 0), n === 0 ? 0.24 : 0.14, n === 0 ? 9 : 6); }
    for (const pu of [-12, -6]) if (u >= pu && u < pu + 6) { const h = hp(); puff(out, toWorld(cam, P, scl, [h[0], h[1] + 10], 0.12), u, pu, 6); }
    if (u >= LIFTU - 2 && u < LIFTU + 2) { const h = hp(); glintAt(out, toWorld(cam, P, scl, [h[0], h[1] - 52], 0.15), u, LIFTU - 2, 0.15, 4); }
    if (u >= INU + 1 && u < INU + 8) { const h = hp(); glintAt(out, toWorld(cam, P, scl, [h[0] + 4, h[1] - 12], 0.14), u, INU + 1, 0.1, 7); }
    if (n === 0) flash(out, toWorld(cam, P, scl, handAt(a.o, { ...ho, hands: [{ a: "selfie" }, { a: "selfie" }] }, out_ < 0 ? 1 : 0), 0.2), f, ACT + 2, 3, 0.3);
    if (photo) flash(out, toWorld(cam, P, scl, handAt(a.o, ho, out_ < 0 ? 1 : 0), 0.25), u, -58, 2, 0.27);
  });
  // A5 P3: during the counter insert hold three hands rise into the bottom of the frame holding their chips up (the
  // crowd shows off its loot), bobbing out of phase, one chip twinkling
  if (f >= B + 4 && f < S(10).b + 2) { const Bs = basisOf(10, f);
    ([[0.2, "#f07a2a", 0], [0.52, "#f59b2e", 1], [0.83, "#ee7330", 2]] as [number, string, number][]).forEach(([x, col, k]) => {
      const up = smooth((f - (B + 4 + k * 2.5)) / 5) * (1 - smooth((f - (B + 13)) / 4)), bob = 0.012 * Math.sin((TAU * (vt(f) + k * 7)) / 18) - 0.03 * bump(mod(vt(f) + 2 * k, 6), 0, 4), y = 1.12 - 0.3 * up + bob, d = 1.6; // A7: a celebratory pump every 6 video f
      const lit = Math.floor((vt(f) + k * 11) / 9) % 4 === 0 ? 1 : 0, W = 0.16 * frameW(Bs, d); // A6 P2: 1.8x, two show-off bobs
      if (up > 0.01) fx(out, `hchip${col}${lit}`, 256, 512, (pp) => fxHandChip(pp, col, 11 + k, lit), fromScr(Bs, x, y, d), W, 2 * W, { rot: (k - 1) * 0.12 });
    }); }
  // a ranger far back (z -10) snaps his head toward the crowd on the cha-ching (a double take)
  if (f >= BEAT.withB - 8) { const rp = tt([1.6, 0, -10]), Lr = life(f, A.ranger.i), snap = f >= B, dbl = f >= B && f < B + 3;
    put(out, cam, A.ranger, rp, { breath: Lr.breath, tilt: Lr.sway, shift: Lr.shift, headTilt: Lr.head + (snap ? -6 : 0), expr: snap ? (dbl ? "calm" : "browsUp") : "calm",
      facing: snap && !dbl ? -1 : 1, look: snap && !dbl ? -1.3 : 0.5, blink: blinkAt(f, A.ranger.i, [B]), hands: [{ a: "hip" }, { a: "hip" }] }); }
  // A3: asst2 at the LONG LOGS head clicks a hand counter on each pocketing and raises an eyebrow at the crowd
  { const a = A.asst2, i = a.i, p = tt([1.95, 0, -1.7]), L = life(f, i), sc2 = sideOf(cam, p, tt([0.3, 0, 0.8]));
    const uc = vt(f) - vB, clk = uc >= -18 && uc < -6 && mod(Math.floor(uc + 18), 3) === 0, n = clamp(Math.floor((uc + 20) / 3), 0, 5); // A7: on the video clock
    put(out, cam, a, p, { ...idle(f, i, p), expr: uc >= -18 ? "skeptic" : "focus", facing: sc2, look: sc2 * 1.2, lookY: uc >= -18 ? 0 : 0.6, blink: blinkAt(f, i), breath: L.breath * 1.3,
      hands: [{ a: "show", dy: -6 - (clk ? 2 : 0), hold: "counter", n: 12 + n + (clk ? 1000 : 0) }, { a: "show", dx: -10, dy: 8, hold: "tally", ang: 12 }] }); }
  // A3: the raven on Sign B's LED watches the crowd (head snaps on the chips-up and the eye snaps), startles on the
  // cha-ching (a 2 f jump) and flaps off screen right, one feather falling for 20 f
  { const pB = LED_TOP(SIGN_B), c: RavenX = {}, toC = sideOf(cam, pB, tt([0.3, 0, 0.9]));
    const ur = vt(f) - vB; if (ur >= -32 && ur < -18) { c.head = toC; c.dip = 1; } else if (ur >= -18 && ur < -3) c.head = ur < -10 ? -1 : 1; else if (ur >= -3 && ur < 0) c.head = 1; // A7: video clock; looks away WITH the gang
    if (f < B) raven(out, cam, f, pB, c, 3);
    else if (f < B + 2) { const t = f - B; c.wing = 1; c.head = 1; c.hop = 0.5 * t; raven(out, cam, f, [pB[0], pB[1] + 0.12 * t, pB[2]], c, 3); } // the startle jump
    else if (f < B + 11) { // A4: a real wing-spread flight card (fingered primaries, 2 f up / down strokes) that leaves the frame by B + 10
      const t = f - B - 2, k = clamp01(t / 8), w = mod(t, 4) < 2 ? 1 : -0.7, dir = cam.right.x >= 0 ? 1 : -1;
      fx(out, `fly${w}d${dir}`, 256, 128, (p) => fxFlyRaven(p, w, "#1e2233", dir), [pB[0] + 3.2 * k ** 1.4, pB[1] + 0.3 + 0.7 * k, pB[2] + 0.2 * k], 0.8, 0.4, { rot: 0.08 }); }
    { const t = f - B - 2; if (t >= 0 && t < 20) fx(out, "feather", 128, 128, (p) => fxFeather(p), [pB[0] + 0.1 + 0.06 * Math.sin(t * 0.5), pB[1] + 0.3 - 0.045 * t, pB[2] + 0.1], 0.06, 0.06, { rot: 0.7 * Math.sin(t * 0.4) }); } }
};

/** shot 13 (backlit sunset): the tourists pocket chips on "thieves" (hand at the WAIST, below the caption, into the hip
 *  pocket, with side-eye saccades), swap scheming smug looks (the red cap winks), flinch at the slam (his cap pops),
 *  grin; she leans out right to photograph the stamped sign (her strap camera hides while the hand camera is up);
 *  far behind Sign B small silhouettes keep pocketing; the raven bolts at the slam and circles once overhead */
const PLUM = (c: string) => mixHex(c, "#4a2e4a", 0.42);
const SKIN_C = "#f8f3ee";
const permission = (out: Stage, cam: CamInfo, f: number) => {
  const F = BEAT.permission, T = BEAT.thieves;
  // A3: the two near thieves FLANK Sign B (red cap beside the left post, the pigtail tourist beside the right post), so
  // neither head ever sits in the line of sight to the stamp mark (checked with LEAD's centred final key: >= 60 px clear)
  // A6 LEAD P2: both flankers 0.12 / 0.10 m in toward the posts, so both faces stay inside 0.14-0.86 W in the slam snap
  const people: [number, V3][] = [[0, tt([-0.61, 0, 0.7])], [5, tt([0.52, 0, 0.62])], [7, tt([1.9, 0, 0.2])]];
  // A6 ADD: far behind Sign B a tiny backlit ranger watches the slam: a slow head shake, then a resigned hat tip
  { const rp = tt([1.5, 0, -11.5]), ra: Act = { ...A.ranger, o: tintFit(A.ranger.o, PLUM), key: "rangerplum" }, Lr = life(f, ra.i), sh = f >= F + 2 && f < F + 16 ? 6 * Math.sin(TAU * (f - F - 2) / 7) : 0, tipK = bump(f, F + 17, 10);
    put(out, cam, ra, rp, { breath: Lr.breath, tilt: Lr.sway, shift: Lr.shift, headTilt: Lr.head + sh, expr: f >= F + 2 ? "skeptic" : "calm", facing: sideOf(cam, rp, SIGN_B), look: sideOf(cam, rp, SIGN_B), blink: blinkAt(f, ra.i),
      rim: "#ffb070", rimK: 1.2, lowShade: 0.7, hatLift: 9 * tipK, hands: [{ a: "hip" }, tipK > 0.05 ? { a: "hip", b: "head", k: tipK } : { a: "hip" }] }); }
  const lands = [1547, 1550, 1554];
  people.forEach(([v, P], n) => {
    const base = TOUR(v, {}, "S"), a: Act = { ...base, o: tintFit(base.o, PLUM), key: `${base.key}plum` }, i = a.i, L = life(f, i);
    const sd = sideOf(cam, P, SIGN_B), t0 = lands[n] - 5;
    const pk = ramp(f, t0, 5);
    // A3: the wince is only 3 f (F-2..F), the grin + thumbs-up from F+2 after a 2 f anticipation dip (a gleeful beat)
    const ex: K<Expr>[] = [[0, "scheme"], [t0 - 3, "shifty"], [T - 2 + 6, "smirk"], [pAt(F, -8), "shock"], [F - 2, "wince"], [F + 1, n === 0 ? "laugh" : "grin"], [F + 18, "grin"]];
    const e = at(f, ex);
    const other = people[n === 0 ? 1 : 0][1], so = sideOf(cam, P, other);
    // A5 P2: on "thieves" the red cap elbow-nudges her (3 f anticipation, a 6 deg lean, 8 f back) and she side-eyes him;
    // on "gave" both look UP at the sign (head tilt 5 deg), so the wince on the slam reads as a reaction to it
    const nudge = n === 0 ? -0.3 * bump(f, T - 3, 3) + settle(f, T, 4) * (1 - ramp(f, T + 8, 8)) : 0;
    const crouch = bump(f, F - 3, 3) + 0.8 * bump(f, F, 2), hop = f >= F + 2 && f < F + 7 ? Math.sin((Math.PI * (f - F - 2)) / 5) : 0;
    const PH = F + 13, photo = n === 1 && f >= PH - 6 && f < PH + 10;      // she raises the camera 6 f before the shot
    // A4: the red cap's belly laugh: a 5.5 Hz head + torso bob decaying over 15 f, a point at the stamp mark on F + 6
    const lb = n === 0 && f >= F + 1 && f < F + 17 ? Math.abs(Math.sin(TAU * 5.5 * ((f - F - 1) / FPS))) * (1 - (f - F - 1) / 16) : 0;
    const ptM = n === 0 && f >= F + 5 && f < F + 10;
    const lean = n === 1 ? 6 * settle(f, F - 2, 6) : 0;
    const pump = n === 0 && f >= F + 10 && f < F + 22 ? 6 * Math.abs(Math.sin(((f - F - 10) / 4) * Math.PI)) : 0;
    const thumb: Hand = ptM ? { a: "point", dy: -10 } : n === 0 && f >= F + 10 ? { a: "raise", dy: 8 - pump } : { a: "thumb", shape: "thumb", dy: -3 * bump(f, F + 2, 4) };
    // the chip: held at the waist (lifted 3 f, elbow out), into the hip pocket on the pocket SFX
    // A6 LEAD P3: a 1.5x bigger pocket move (the chip out at arm's length first, a 4 f glint on it)
    const h0: Hand = f < t0 + 6 ? { a: "show", b: "pocket", k: pk, dx: -10 * (1 - pk), dy: 14 * (1 - pk) - 9 * bump(f, t0 - 3, 3), hold: pk < 0.8 ? "chip" : null, n: 4, bend: 1.5 }
      : photo ? { a: "eye", hold: "camera", dy: 5 * bump(f, PH - 8, 2), bend: 2.4 } : f >= F + 2 ? thumb : { a: "hang" }; // A5: elbows OUT (never a chin strap)
    const h1: Hand = photo ? { a: "eye", dx: 4, bend: 2.4 } : f >= F + 2 && n === 2 ? thumb : n === 0 ? (nudge > 0.05 ? { a: "hip", dx: so * 14 * nudge, bend: 1.6 } : { a: "hip" }) : { a: "hang" };
    // gaze: side-eye saccades while pocketing, then scheming looks at each other, a wink from the red cap
    let look = sd * 0.5, lookY = 0, headX = 0;
    if (e === "shifty") look = Math.floor((vt(f) - vt(t0)) / 3) % 2 ? 1.2 : -1.2;
    if (e === "smirk") look = so * 1.25;
    const upS = f >= BEAT.gave && f < F - 2 && n < 2;
    // A6 P3: an unmistakable look UP on "gave" (head back 8 deg, pupils at the top, brows up), the eyes then ride the
    // stamp's growing shadow down the sign face before the hit
    if (upS) { look = sd * 0.5; lookY = -1.35 + 0.75 * ramp(f, F - 8, 5); headX = sd * 8 * (1 - 0.5 * ramp(f, F - 8, 5)); }
    const R = sideOf(cam, P, SIGN_B);
    if (photo) { look = R * 1.1; lookY = -0.2; }
    const sway13 = 1.5 * Math.sin(TAU * HZ.s1 * (VF / FPS) + n * 2.1);
    // A5 R5: the look UP on "gave" reads with OPEN eyes ("alert": brows up, mouth shut; the half-lid smirk hid the pupils)
    const po: PersonOpts = { ...idle(f, i, P), expr: photo ? "focus" : upS ? "alert" : e, facing: photo ? R : n === 1 && f >= T + 2 && f < BEAT.gave ? so : sd, look: n === 1 && f >= T + 2 && f < BEAT.gave ? so * 1.35 : look, lookY,
      blink: blinkAt(f, i, [...swapsOf(ex), BEAT.gave - 1]), squash: 0.5 * crouch + 0.5 * lb, rim: "#ffb070", rimK: 1.3, lowShade: 0.6,
      tilt: life(f, i).sway * 1.4 + life(f, i).shift + sway13 + (n === 1 ? -R * lean : 0) - 3 * lb + so * 6 * nudge, headTilt: life(f, i).head + 4 * lb + headX,
      flutter: flutAt(f, i, P[0], P[2]), hairSwing: 2.5 * wnd(f, P[0], P[2]) + 1.5 * flutAt(f, i, P[0], P[2]),
      nod: upS ? -0.7 : 0, face: { wink: n === 0 && f >= T + 6 && f < T + 14 ? 1 : 0, browUp: e === "smirk" ? [5, 0] : upS ? [5, 5] : undefined, fdy: upS ? -8 : 0 }, hatLift: n === 0 ? 14 * bump(f, F, 4) : 0,
      noCam: photo, hands: sd < 0 ? [h0, h1] : [h1, h0] };
    put(out, cam, a, P, po, { rise: 0.1 * hop });
    if (f >= t0 - 4 && f < t0) { const hp = handAt(a.o, { ...po, seed: seedOf(i), light: light2D(cam) }, sd < 0 ? 0 : 1); glintAt(out, toWorld(cam, P, 1, [hp[0], hp[1] - 40], 0.12), f, t0 - 4, 0.14, 4); }
    // A6 ADD: the slam's jolt pops the red cap's pocketed chip up out of his hip pocket (a glint at the top of its hop),
    // and it drops straight back in (he is laughing too hard to notice)
    if (n === 0) { const t = f - F; if (t >= 0 && t < 11) {
      const pk0 = handAt(a.o, { ...po, seed: seedOf(i), light: light2D(cam), hands: [{ a: "pocket" }, { a: "pocket" }] }, sd < 0 ? 0 : 1), u = t / 10;
      const pw = toWorld(cam, P, 1, [pk0[0], pk0[1] - 14], 0.12), up = 0.34 * 4 * u * (1 - u);
      fx(out, "chip13pop", 96, 96, (p) => fxChip(p, 23, false, true), [pw[0], pw[1] + up + 0.1 * hop, pw[2]], 0.075, 0.065, { rot: 1.8 * u });
      glintAt(out, [pw[0], pw[1] + 0.34 + 0.06, pw[2]], f, F + 4, 0.16, 5); } }
    if (photo) { const hp = handAt(a.o, { ...po, seed: seedOf(i), light: light2D(cam) }, sd < 0 ? 0 : 1); // at the lens, off her face (toward the sign)
      flash(out, toWorld(cam, P, 1, [hp[0] + R * 70, hp[1] - 6], 0.3), f, PH, 4, 0.25); }
  });
  // far behind Sign B on the trail: small backlit silhouettes keep pocketing chips (one gives the stamp a thumbs-up)
  [[2, 0.6, -6.5], [4, -0.5, -8.2], [6, 1.6, -9.4]].forEach(([v, x, z], n) => {
    const base = TOUR(v, {}, "S2"), a: Act = { ...base, o: tintFit(base.o, (c) => mixHex(c, "#3a2440", 0.6)), key: `${base.key}sil` }, P = tt([x, 0, z]);
    const cyc = mod(vt(f) + n * 17, 46), dn = n === 1 ? bump(cyc, 6, 16) : 0, sd = sideOf(cam, P, tt([0, 0, 0]));
    // A4: each has a job: n 0 photographs the LED (a flash ~1572), n 1 keeps pocketing (thumbs-up after the slam), n 2
    // points at the sign and startle-hops 3 f when the stamp lands
    const ph0 = n === 0 && f >= 1564 && f < 1578, hop = n === 2 && f >= F && f < F + 3 ? Math.sin((Math.PI * (f - F)) / 3) : 0;
    const h0: Hand = n === 0 ? (ph0 ? { a: "eye", hold: "camera" } : { a: "hang" }) : n === 2 ? (f < F + 10 ? { a: "point", dy: -12 + 3 * Math.sin(VF * 0.4) } : { a: "hip" })
      : f >= F + 8 ? { a: "thumb", shape: "thumb" } : { a: "hang", b: cyc < 14 ? "ground" : "pocket", k: cyc < 14 ? dn : ramp(cyc, 14, 6), hold: cyc >= 10 && cyc < 18 ? "chip" : null };
    const so = put(out, cam, a, P, { ...idle(f, a.i, P), mode: dn > 0.5 ? "squat" : "stand", facing: sd, expr: n === 0 ? (ph0 ? "focus" : "smile") : n === 2 ? (hop > 0 ? "shock" : "grin") : "shifty",
      look: n === 1 ? (Math.floor(vt(f) / 5) % 2 ? 1.2 : -1.2) : sd, lookY: n === 0 && ph0 ? -0.5 : 0, blink: blinkAt(f, a.i), rim: "#ffb070", noCam: ph0, squash: -0.4 * hop,
      hands: [h0, n === 0 && ph0 ? { a: "eye", dx: 4 } : { a: "hang" }] }, { rise: 0.08 * hop });
    if (n === 0) flash(out, toWorld(cam, P, 1, handAt(a.o, so, 0), 0.2), f, 1572, 3, 0.3);
  });
  // the raven: snaps up at the falling stamp, flaps off at the slam with two loose feathers, circles once overhead
  {
    const pB = LED_TOP(SIGN_B), c: RavenX = {}, fo = F;
    if (f >= F - 4) { c.head = 0; c.cock = -25; }
    // A3: startled hop at the slam, then it flaps ACROSS the sky inside the frame (F+4..F+20, y ~2.0-2.4 m, wings on 2s)
    // and exits right
    if (f >= fo) { c.wing = mod(f - fo, 4) < 2 ? 1 : 0.2; c.cock = 0; c.head = 1; }
    if (f < fo + 22) { const k = clamp01((f - fo - 4) / 16), pos: V3 = f < fo + 4 ? [pB[0], pB[1] + 0.06 * (f - fo), pB[2]] : [pB[0] + 1.5 * k, pB[1] + 0.24 - 0.2 * Math.sin(Math.PI * k), pB[2] + 0.3 * k];
      if (f >= fo + 3) { const w = mod(f - fo, 4) < 2 ? 1 : -0.6, dir = cam.right.x >= 0 ? 1 : -1; fx(out, `fly${w}d${dir}p`, 256, 128, (p) => fxFlyRaven(p, w, "#2a2236", dir), [pos[0], pos[1] + 0.12, pos[2]], 0.7, 0.35, { rot: 0.06 }); } // A4: the flight card
      else raven(out, cam, f, f >= fo ? pos : pB, c, 4); }
    for (const k of [0, 1]) { const t = f - fo - 1; if (t >= 0 && t < 26) {
      const w: V3 = [pB[0] + (k ? 0.25 : -0.2) + 0.12 * Math.sin(t * 0.35 + k), pB[1] + 0.25 - 0.06 * t, pB[2] + 0.1];
      fx(out, "feather", 128, 128, (p) => fxFeather(p), w, 0.07, 0.07, { rot: 0.6 * Math.sin(t * 0.4 + k * 2) });
    } }
    // a second raven circles far up in the sunset sky (in frame, small)
    { const ang = (TAU * vt(f)) / 70, w = q(Math.sin(VF * 0.8), 6);
      fx(out, `fly${w}`, 256, 128, (p) => fxFlyRaven(p, w, "#3a2440"), [pB[0] - 0.4 + 0.9 * Math.cos(ang), pB[1] + 1.3 + 0.15 * Math.sin(ang * 2), pB[2] - 6 + 1.2 * Math.sin(ang)], 0.5, 0.25, { rot: 0.3 * Math.cos(ang) }); }
  }
};

// ---------------- blueprint (pivot) ----------------
const bp = (d: V3) => add(BP.base, d);
/** shot 11: his 7 walk contacts (picture frames after BEAT.copyEach) = AUDIO's chalk footsteps (video 1618 ... 1645) */
const WALK11 = [5.4, 9.1, 12.7, 15.8, 19.3, 22.8, 26.3];
/** A5 R5: the visitor of shot 11 as last posed (the chalk crowd keeps a clear gap round his head + cap) */
let MAN11: { a: Act; P: V3; f: number; o?: PersonOpts } | null = null;
const blueprint = (out: Stage, cam: CamInfo, f: number) => {
  // the visitor at the fork: one continuous FRONT view from "rules" (3/4 to THE RULE, skeptic, hand to chin) to the
  // crowd (a facing swap with a blink on copyEach - 2, grin), a 2 f dip, then 6-8 visible steps after the crowd (bob,
  // lean, strap + brim swing); on "Many people steal" he stops and gapes UP at the floating sign, scratches his neck,
  // weight shift, hand to chin on "warning", eyes to the crowd on "sounds", wide-eyed darting + a hop back on "everyone"
  {
    const a = A.bp, i = a.i, L = life(f, i);
    // A5 P1: a REAL walk after the crowd on "We copy each other": 1.92 m toward the EVERYONE ELSE branch in 7 steps whose
    // contacts land on AUDIO's chalk footsteps (picture copyEach + WALK11[k]), a 4 % bob, a 5 deg lean, arms swinging;
    // he stops between the floating sign's posts on manySteal - 2 (video ~1650) with a 3 f settle overshoot
    const C0 = BEAT.copyEach, w0 = C0 + 1.8, stop = BEAT.manySteal - 2;
    const cts = [w0, ...WALK11.map((d) => C0 + d), stop];               // 0 = lift-off, 1..7 = contacts, 8 = feet together
    let ph = 0;
    if (f >= stop) ph = 7.5;
    else if (f > w0) { let k = 0; while (k + 1 < cts.length && f >= cts[k + 1]) k++; const u = (f - cts[k]) / (cts[k + 1] - cts[k]); ph = k + u * (k === 7 ? 0.5 : 1); }
    // ph = k on contact k (toon walk phase = ph / 2), 7.5 = feet together; one step length per contact
    const s = (1.92 * ph) / 7.5;
    const dir = [0.416, -0.909];
    const P: V3 = bp([BP.person[0] + dir[0] * s, 0, BP.person[2] + dir[1] * s]);
    const walking = f >= w0 && f < stop;
    const sgn = sideOf(cam, P, bp(BP.signFloat)), crowdS = sideOf(cam, P, bp(BP.crowd));
    let view: "front" | "back" = "back", facing: -1 | 0 | 1 = walking ? sideOf(cam, P, [P[0] + dir[0], 0, P[2] + dir[1]]) : 0, expr: Expr = "think", look = 0, lookY = 0, hands: [Hand, Hand] = [{ a: "hang" }, { a: "hang" }];
    let head = L.head, fdy = 0, hop = 0, squash = 0, nodU = 0;
    // A7 (no 1 f back -> front pop): the turn to the lens on "rules." is a real card spin toward THE RULE side
    const sp11 = spinAt(f, vt(BEAT.copyRules) - 8, sideOf(cam, P, bp(BP.ruleFigure))), front11 = PV(vt(BEAT.copyRules) - 4);
    if (f < front11) { // A4: from behind he is alive: hands on hips, then his head turns 3/4 toward THE RULE as it draws
      const rs = sideOf(cam, P, bp(BP.ruleFigure)), hip = ramp(f, BEAT.youSee + 6, 4) * (1 - ramp(f, BEAT.copyRules - 8, 4));
      if (f >= BEAT.copyRules - 14) { facing = rs; head += rs * 7; lookY = 0.1; }
      if (hip > 0.02) hands = [{ a: "hang", b: "hip", k: hip }, { a: "hang", b: "hip", k: hip }];
    }
    if (f >= front11 && f < BEAT.copyEach - 2) { // A5 P2: eyes UP-LEFT on THE RULE label as it pops, then to the lens
      const atRule = f < BEAT.copyRules + 9;
      view = "front"; facing = -1; expr = "skeptic"; look = atRule ? -1.35 : 0; lookY = atRule ? -0.9 : 0; head += atRule ? -6 : 0; fdy = atRule ? -4 : 0; hands = [{ a: "chin" }, { a: "hang" }]; }
    else if (f >= BEAT.copyEach - 2 && f < w0 + 2) { view = "front"; facing = 1; expr = "smile"; look = 1.2; }
    else if (f >= stop) {
      view = f < stop + 2 ? "back" : "front"; facing = sgn; // A4: a 2 f back-3/4 in-between before the front view
      const E = BEAT.everyone - 2, W2 = BEAT.warning2 - 2, SD = BEAT.sounds - 2;
      const ST = PW(22, "steal"), gulpK = bump(f, ST, 2);
      const DN = PW(22, "doesn't");
      if (f < ST) { expr = "goggle"; look = sgn * 0.6; lookY = -1.35; head += sgn * 6; fdy = -9; nodU = -0.8; }   // A5: gapes UP at the panel above him (head back)
      else if (f < W2) {
        const lens = f >= DN - 1;                                                                                // A5 P2: to the lens on "doesn't" for the grimace
        expr = lens ? "grimace" : "goggle"; look = lens ? 0 : sgn * 1.0; lookY = lens ? 0 : -1.2; head += lens ? 0 : sgn * 6; fdy = lens ? 0 : -8; nodU = lens ? 0 : -0.6; squash = 0.5 * gulpK;
        const nk = settle(f, 1318, 6) * (1 - ramp(f, 1334, 6)) - 0.15 * bump(f, 1310, 8);   // a hand to the back of his neck
        hands = [{ a: "hang" }, nk > 0.02 ? { a: "hang", b: "head", k: clamp01(nk), dx: 6, dy: 14 + 3 * Math.sin(VF * 1.2), maxLen: 1.25 } : { a: "hang" }];
      } else if (f < SD) { expr = "skeptic"; look = 0.15 * sgn; lookY = 0.05; head += sgn * 2; fdy = 0; hands = [{ a: "chin" }, { a: "hang" }]; } // A4: "warning." a skeptical glance down to the lens
      else if (f < E) { expr = "think"; facing = crowdS; look = crowdS * 1.3; lookY = 0.1; head += crowdS * 5; hands = [{ a: "chin", b: "hang", k: ramp(f, SD, 5) }, { a: "hang" }]; }
      else {
        // A7 P2: eyes dart LEFT, RIGHT (6 f each, a 5 deg head turn on each), then UP at the sign above him
        const dE = vt(f) - vt(E), dd = dE < 6 ? -1 : dE < 12 ? 1 : 0;
        expr = "wide"; facing = dd ? (dd as -1 | 1) : crowdS; look = dd ? dd * 1.3 : 0.3 * crowdS; lookY = dd ? 0.2 : -1.2; head += dd * 5;
        squash = 0.45 * bump(f, E + 1, 3); hop = f >= E + 3 && f < E + 9 ? Math.sin((Math.PI * (f - E - 3)) / 6) : 0;
        hands = [{ a: "hang", dy: -10 * hop }, { a: "hang", dy: -10 * hop }];
      }
    }
    const dip = 0.4 * bump(f, BEAT.copyEach - 1, 3);
    const phase = ph / 2, shiftK = f >= 1325 && f < 1342 ? -1 : L.shift;  // toon walk: contacts at phase k / 2
    const back0 = stop + 1 + 0.06 * hop;
    const settleK = f >= stop && f < stop + 4 ? [0.5, 0.25, -0.12, 0][Math.floor(f - stop)] : 0; // the stop: a 3 f settle overshoot
    MAN11 = { a, P, f };
    MAN11.o = put(out, cam, a, P, { view, mode: walking ? "walk" : "stand", phase, lift: 1.85, // A6 P3: a wider stride + 4 % bob (was a shuffle) breath: L.breath * 1.6, tilt: (walking ? 5 * (facing || 1) : 0) + 4 * settleK * (facing || 1) + L.sway * 1.5 + 0.9 * shiftK, shift: walking ? 0 : shiftK,
      headTilt: head, facing, expr, look, lookY, nod: nodU, squash: dip + squash + 0.35 * Math.abs(settleK), face: { fdy }, flutter: walking ? Math.sin(TAU * phase) : 0.4 * flutAt(f, i),
      blink: blinkAt(f, i, [front11, BEAT.copyEach - 2, PW(22, "steal") - 2, PW(22, "doesn't") - 1, BEAT.warning2 - 2, BEAT.sounds - 2, BEAT.everyone + 7, BEAT.everyone + 15, BEAT.everyone + 23], [stop, BEAT.everyone - 2]), hands }, { rise: 0.1 * hop, yawOff: sp11.u >= 0 && sp11.u < 11 ? sp11.yaw : 0 });
    void back0;
    // A7 P2: the sweat drop ON the upper-left temple (overlapping the outline), sliding ~10 px over 6 f, gone ~26 video f later
    { const vs = vt(f) - vt(stop) - 1; if (vs >= 0 && vs < 26) { const [hx, hy, ha] = headAt(a.o, { ...MAN11.o!, seed: seedOf(i), light: light2D(cam) });
      fx(out, "sweat", 128, 192, (p) => fxSweat(p), toWorld(cam, P, 1, [hx - 0.93 * ha, hy - 0.42 * ha + Math.min(12, 2 * vs)], 0.08), 0.075, 0.112); } }
    fx(out, "bpShadow", 128, 128, (p) => fxSoftBlob(p, "11,31,92", 0.85), [P[0], 0.015, P[2]], 0.95, 0.42, { flat: true, soft: true, rot: Math.atan2(-CAMR.z, CAMR.x) }); // A4: a navy contact pool on the blueprint floor
  }
  // THE RULE: one lonely chalk figure looking left / right, tapping a foot; checks a wristwatch and shrugs on "We copy
  // each other". EVERYONE ELSE: a crowd that pops in 3 per frame and streams along the wide arrow (1.0 m/s with a walk
  // bob and arm swing, wrapping); one waves the visitor over, two snap photos (flash sparkles); 8 of them do the
  // pocketing gesture on "Many people steal", placed to the RIGHT of the floating sign
  const man = (key: string, p: V3, h: number, swing: number, chip: boolean, pocket = 0, look = 0, tap = 0, pose = 0) =>
    fx(out, `chalk${key}${q(swing, 4)}${chip ? "c" : ""}${q(pocket, 4)}${look}${q(tap, 2)}p${pose}`, 128, 256, (pp) => fxChalkMan(pp, q(swing, 4), chip, "#f4f8ff", q(pocket, 4), look, q(tap, 2), pose), [p[0], p[1] + h / 2, p[2]], h / 2, h);
  if (f >= BEAT.copyRules - 2) {
    const rp = BEAT.copyEach - 2, rpose = f >= rp && f < rp + 12 ? 1 : f >= rp + 12 && f < rp + 22 ? 2 : 0;
    // A5 ADD: in the last ~14 f even the rule figure tiptoes off toward the crowd (it defects too)
    const tt11 = clamp01((f - (S(11).b - 16)) / 16), rf = bp(BP.ruleFigure), cr11 = bp(BP.crowd), rfp: V3 = [rf[0] + (cr11[0] - rf[0]) * 0.1 * tt11, 0, rf[2] + (cr11[2] - rf[2]) * 0.1 * tt11];
    man("r", rfp, 1.05, tt11 > 0 ? 0.5 * Math.sin(VF * 1.2) : 0.15, false, 0, rpose ? 0 : tt11 > 0 ? 1 : Math.floor(vt(f) / 36) % 2 ? 1 : -1, rpose || tt11 > 0 ? 0 : mod(vt(f), 8) < 4 ? 1 : 0, rpose);
  }
  const n = clamp(Math.floor((f - (BEAT.eachOther - 4)) * 3), 0, 27);
  const ad = [Math.sin(BP.crowdArrow.dir), -Math.cos(BP.crowdArrow.dir)], an = [-ad[1], ad[0]];
  // A5 R5 (P2 silhouette tangle: the chalk crowd stood right behind his head and cap, the outlines merged): his head
  // + cap on screen (px at 1080 x 1920); any crowd figure BEHIND him whose body overlaps the head band shrinks away
  // smoothly as it comes within 30-50 px of his outline (a clean blue gap round the main figure, never a pop)
  const B11 = basisOf(11, f);
  let MS: { x: number; y: number; r: number; d: number } | null = null;
  if (MAN11 && MAN11.f === f && MAN11.o) {
    const hd = headAt(MAN11.a.o, MAN11.o), hw = toWorld(cam, MAN11.P, 1, [hd[0], hd[1]]), s = toScr(B11, hw), s2 = toScr(B11, toWorld(cam, MAN11.P, 1, [hd[0] + 1.3 * hd[2], hd[1]]));
    MS = { x: s[0] * 1080, y: s[1] * 1920, r: Math.abs(s2[0] - s[0]) * 1080, d: s[2] };
  }
  for (let k = 0; k < n; k++) {
    const sL = 1.9 + mod(3.4 * hh(k, 61) + 1.0 * ((f - BEAT.eachOther) / FPS), 3.4), lat = k < 8 ? 0.55 + 0.35 * hh(k, 62) : (hh(k, 62) - 0.5) * 1.8;
    const edge = Math.min(1, (sL - 1.9) / 0.4, (5.3 - sL) / 0.4);                  // shrink in / out at the stream's ends
    const p = bp([ad[0] * sL + an[0] * lat, 0, ad[1] * sL + an[1] * lat]);
    const sw = Math.sin(VF * 0.7 + k * 1.7), pocket = k < 8 ? bump(f, BEAT.manySteal + k * 2, 10) : 0;
    const wave = (k === 3 || k === 9 || k === 14 || k === 20) && f >= BEAT.copyEach + 2 && f < BEAT.manySteal && mod(vt(f) + k * 5, 24) < 12; // A3: they wave the visitor over
    const pose = wave ? 3 : (k === 12 || k === 17) && mod(vt(f) + k * 7, 40) < 8 ? 4 : 0;
    let hgt = (0.62 + 0.12 * hh(k, 63)) * clamp01(edge);
    if (MS && hgt > 0.02) {
      const st = toScr(B11, [p[0], hgt, p[2]]), sb = toScr(B11, [p[0], 0, p[2]]);
      if (st[2] > MS.d) {
        const top = st[1] * 1920, bot = sb[1] * 1920, half = (0.25 * hgt * 1080) / frameW(B11, st[2]);
        const vOver = top < MS.y + 1.15 * MS.r && bot > MS.y - 1.25 * MS.r;     // the figure reaches the head / cap band
        const gap = Math.abs(st[0] * 1080 - MS.x) - half - MS.r;
        if (vOver) hgt *= clamp01((gap - 30) / 22);
      }
    }
    if (hgt < 0.03) continue;
    const chip = k % 3 === 1 && pocket < 0.6 && !pose;                      // A3: tiny rainbow chips in hand (a 1 f sparkle)
    man("c", [p[0], 0.05 * Math.abs(sw), p[2]], hgt, pose ? 0 : sw, chip, pocket, pocket > 0.3 ? (k % 2 ? 1 : -1) : pose === 3 ? -1 : 0, 0, pose);
    if (chip && mod(Math.floor(f) + k * 11, 30) < 2) glintAt(out, [p[0] + 0.15 * hgt, hgt * 0.62, p[2] + 0.04], f, Math.floor(f) - mod(Math.floor(f) + k * 11, 30), 0.12, 2); // (floor: fractional clock)
    { const vv = Math.floor(vt(f)), mm = mod(vv + k * 7, 40); if (pose === 4 && mm >= 4 && mm < 6) flash(out, [p[0], hgt * 0.85, p[2] + 0.05], vt(f), vv - mm + 4, 2, 0.22); } // (video clock, like the pose)
  }
  // a chalk tumbleweed rolls past the lonely rule figure on "We copy each other"
  { const t = f - BEAT.copyEach; if (t >= 0 && t < 60) { const rf = bp(BP.ruleFigure), x = rf[0] - 1.6 + 0.8 * (t / FPS), rot = Math.floor(t / 2) * 0.6;
    fx(out, `weed${q(rot % TAU, 5)}`, 128, 128, (p) => fxChalkWeed(p, q(rot % TAU, 5)), [x, 0.4 + 0.12 * Math.abs(Math.sin(t * 0.3)), rf[2] + 0.4], 0.8, 0.8); } }
  // a chalk raven flaps across above the crowd during the hold (a callback to the trailhead raven)
  // A4: a chalk LINE raven (unfilled strokes, 3 wing drawings on 2s) flying HIGH, above the FIG. 1 title
  { const t = f - PW(22, "sound"); if (t >= 0 && t < 40) { const w = [1, 0, -0.7][Math.floor(t / 2) % 3], c = bp([-2.6 + 0.24 * t, 6.1 + 0.12 * Math.sin(t * 0.2), -4.2]); /* WORLD-INT A5: clear of the FIG. 1 cartouche */
    fx(out, `flyc${w}`, 256, 128, (p) => fxFlyRaven(p, w, "#f4f8ff", 1, true), c, 1.5, 0.75, { rot: -0.06 }); } }
};

// ---------------- classroom (analogy) ----------------
/** A6 P1 (the teacher's hand never met the chalk): her yaw card faces the back-right lens, so its right half runs INTO
 *  the board wall 0.85 m behind her and the reaching forearm was depth-clipped by the board (the hand "stopped" in the
 *  air while the letters wrote themselves). The writing arm is now a screen-anchored limb card just in front of her:
 *  shoulder -> a bent elbow -> the ball hand gripping a white chalk stick whose TIP sits on the chalk write head. S / T
 *  are toScr() points (x in W, y in H, depth); wW = the arm stroke width in W units */
const limbCard = (out: Stage, B: Basis, S: [number, number, number], T: [number, number, number], wW: number, key: string) => {
  const X0 = S[0], Y0 = S[1] / ASPECT, X1 = T[0], Y1 = T[1] / ASPECT, dx = X1 - X0, dy = Y1 - Y0, len = Math.hypot(dx, dy) || 1e-3;
  const MX = (X0 + X1) / 2, MY = (Y0 + Y1) / 2, L = 1.3 * Math.max(Math.abs(dx), Math.abs(dy)) + 10 * wW;
  const cv = (X: number, Y: number): P2 => [256 + ((X - MX) / L) * 512, 256 + ((Y - MY) / L) * 512];
  const ux = dx / len, uy = dy / len, cl = 2.3 * wW, hr = 1.75 * wW;                      // chalk length, ball-hand radius
  const Hx = X1 - ux * (cl + 0.6 * hr), Hy = Y1 - uy * (cl + 0.6 * hr);                // the hand sits back along the chalk
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }                           // the elbow bends DOWN (out)
  const bl = 0.12 * Math.hypot(Hx - X0, Hy - Y0), Ex = (X0 + Hx) / 2 + nx * bl, Ey = (Y0 + Hy) / 2 + ny * bl;
  const k2 = q(MX, 300) + "," + q(MY, 300) + "," + q(L, 300);
  const d = Math.max(0.5, S[2] - 0.3), fw = frameW(B, d);
  fx(out, `limb|${key}|${k2}|${q(Hx, 400)},${q(Hy, 400)}`, 512, 512, (p) => {
    const lw = (wW / L) * 512, a = cv(X0, Y0), e = cv(Ex, Ey), h = cv(Hx, Hy), t = cv(X1, Y1), pts: P2[] = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12, v = 1 - u; pts.push([v * v * a[0] + 2 * u * v * e[0] + u * u * h[0], v * v * a[1] + 2 * u * v * e[1] + u * u * h[1]]); }
    p.stroke(pts, lw, "#2c1e2a");
    p.stroke([h, t], 0.62 * lw, "#2c1e2a"); p.stroke([h, t], 0.42 * lw, "#fbfaf4");          // the chalk stick (inked)
    p.ell(h[0], h[1], (hr / L) * 512, (hr / L) * 512 * 0.94, "#3a2836", 0.22 * lw);
    p.stroke([[h[0] - 0.35 * lw, h[1] - 0.2 * lw], [h[0] + 0.1 * lw, h[1] - 0.45 * lw]], 0.18 * lw, "#8a7590");
  }, fromScr(B, MX, MY * ASPECT, d), L * fw, L * fw);
};
const cl = (d: V3) => add(CL.base, d);
/** the first frame WORLD-INT's chalk tip exists (the teacher's first letter): her arm rises to it before (A4) */
let T0C: number | null = null;
const firstTip = () => { if (T0C === null) { T0C = BEAT.teacher; for (let g = BEAT.teacher - 30; g < BEAT.teacher + 60; g++) if (chalkTip(g)) { T0C = g; break; } } return T0C; };
const classroom = (out: Stage, cam: CamInfo, f: number) => {
  {
    // the teacher writes: her chalk hand is ON the newest letter every frame (WORLD-INT's chalk tip, a 6 Hz writing
    // jiggle, a 2 f lift between words); she slides right with the writing only as far as her reach needs, never so far
    // that her head covers the text from the back-right lens; she turns her head to glare over her shoulder on "Half"
    // (a 3/4 front view, stern), taps the full stop (chalk dust), side-steps left so CHEATED. reads, then turns
    const a = A.teacher, i = a.i, L = life(f, i), C = BEAT.cheated, endW = C + 10;
    const step = -0.55 * settle(f, endW + 3, 6), P = cl([CL.teacher[0] - 0.25 + step, 0, CL.teacher[2]]);
    const base = cl([CL.teacher[0] - 0.55 + 0.3 * clamp01((f - BEAT.teacher) / (endW - BEAT.teacher)), 0, CL.teacher[2]]);
    const turned = f >= endW + 10;
    if (!turned) {
      // the newest letter (or the last one, lifted, between words)
      let tip = chalkTip(f + 1.5) ?? chalkTip(f), lifted = 0; // A6 P1: the hand LEADS the chalk line by ~1.5 f
      if (!tip) for (let k = 1; k <= 6 && !tip; k++) { tip = chalkTip(f - k); lifted = tip ? 1 : 0; }
      // A4: the arm RISES to the first letter (2 f shoulder dip, 5 f ease-out, a 1-2 f overshoot), never a 1 f pop, and
      // the body's reach-slide eases in with it
      const T0 = firstTip(), rising = !tip && f >= T0 - 7 && f < T0;
      if (rising) tip = chalkTip(T0);
      const rk = f < T0 - 5 ? -0.25 * smooth((f - (T0 - 7)) / 2) : f < T0 ? -0.25 + 1.33 * easeOut((f - (T0 - 5)) / 5) : f < T0 + 2 ? 1.08 - 0.08 * smooth((f - T0) / 2) : 1;
      const glance = f >= BEAT.half - 1 && f < BEAT.half + 11;
      const tapK = f >= endW && f < endW + 8 ? Math.abs(Math.sin(((f - endW) / 4) * Math.PI)) : 0; // two taps on the full stop
      const last = chalkTip(endW - 1) ?? cl([0, 1.6, CL.board.z]);
      // reach: slide her toward the tip by what the arm (<= 1.35 head heights) cannot cover, capped at +0.42 m
      let Pw: V3 = f <= endW + 3 ? base : P;
      if (tip && f <= endW + 3) {
        const R0 = handAt(a.o, { view: "back", seed: seedOf(i), hands: [null, { a: "board" }] }, 1), sh: P2 = [R0[0] - 40, R0[1] - 90];
        const d = toDesignRay(cam, Pw, 1, tip), ex = Math.hypot(d[0] - sh[0], d[1] - sh[1]) - 1.8 * 232;
        if (ex > 0) { const [ax, az] = axisX(cam, Pw), mv = Math.min(0.42, ex * SU * 1.1) * Math.sign(d[0] - sh[0]) * clamp01(smooth((f - (T0 - 6)) / 7)); Pw = [Pw[0] + ax * mv, 0, Pw[2] + az * mv]; }
      }
      // A4: on line 3 ("CHEATED.") she steps 0.35 m left and leans away, so her head and bun never cover the punch word
      // A6 P2: 0.65 m (was 0.35) so her bun clears the C of CHEATED.; the rubber arm reaches over to the writing
      const k3 = ramp(f, C - 9, 5) * (1 - ramp(f, endW + 3, 5));
      // A7 P2 (the arm card stretched ~2.4 head widths): a shorter step (0.28 m) + a bigger lean away (11 deg) + a tiptoe
      if (k3 > 0) { const [ax, az] = axisX(cam, Pw); Pw = [Pw[0] - ax * 0.28 * k3, 0, Pw[2] - az * 0.28 * k3]; }
      const jig = 4 * Math.sin(TAU * 8 * (VF / FPS)), jigY = 3 * Math.cos(TAU * 8 * (VF / FPS) + 0.7); // A6 P1: a +-0.02 m 8 Hz stroke jitter
      // A3: lines 1-2 sit high on the board: a tiptoe rise (+5 cm) and a 4 deg up-lean
      const hi = tip ? clamp01((tip[1] - 1.75) / 0.25) : 0, toe = 0.05 * Math.max(smooth(hi), k3);
      const lean = (tip ? clamp((toDesignRay(cam, Pw, 1, tip)[0] - 300) / 40, -1, 1) * 5 : 0) + 4 * smooth(hi) - 11 * k3;
      const tiltT = L.sway * 0.5 + 3 + lean, u = 2.4;
      // A4: the chalk's TIP (not the hand) sits on the glyph's stroke end: the hand is offset back along the chalk
      const onTip = (w: V3, y0 = 0): P2 => { const d = toDesignRay(cam, [Pw[0], y0, Pw[2]], 1, w), ar = ((20 + tiltT) * Math.PI) / 180; return [d[0] - 15 * u * Math.sin(ar), d[1] + 15 * u * Math.cos(ar)]; };
      const hd: Hand = rising ? { a: "board", b: onTip(tip!, toe), k: clamp01(rk), dy: rk < 0 ? -24 * rk : -8 * Math.max(0, rk - 1) * 10, hold: "chalk", ang: 20, maxLen: 3.6 }
        : tip && f < endW - 1 ? { a: onTip(tip, toe), dx: lifted ? 0 : jig, dy: (lifted ? 0 : jigY) - 12 * lifted, hold: "chalk", ang: 20, maxLen: 3.6 }
          : f >= endW - 4 && f < endW + 9 ? { a: onTip(last), dy: (f < endW ? -8 * bump(f, endW - 4, 3) : 0) + 10 * bump(f, endW - 1, 2) - 5 * tapK, hold: "chalk", ang: 20, maxLen: 3.6 } // a 3 f lift before the tap
            : { a: "board", hold: "chalk", ang: 20 };
      // A5 P2: the glare on "Half" is a 3/4 OVER-THE-SHOULDER look (her writing arm stays on the board), stern brow
      // tick down; after the full-stop taps she peers over her shoulder again (endW + 2 .. endW + 10) before she turns
      const peer2 = f >= endW + 2 && f < endW + 10, over = glance || peer2, bobL = tip && !lifted ? 1.2 * Math.sin(VF * 0.9) : 0;
      // A6 P2: on "cheated." a stern look round at the class (a 1 f swap to her 3/4 FRONT face, 13 video f: glasses glint,
      // brows hard down, one brow up at the full stop), still writing, then back to the board
      const vC = vt(f) - vt(C + 0.5), stern = vC >= 0 && vC < 13;
      // the chalk write head in the world (the limb card's chalk tip): the writing (8 Hz +-1 cm jitter, a lift between
      // words) or the full stop (a lift, two taps)
      const j8 = TAU * 8 * (VF / FPS);
      const wt: V3 | null = !rising && tip && f < endW - 1 ? [tip[0] + 0.011 * Math.sin(j8) * (1 - lifted), tip[1] + 0.009 * Math.cos(j8 + 0.7) * (1 - lifted) + 0.03 * lifted, tip[2] + 0.015 + 0.04 * lifted]
        : f >= endW - 4 && f < endW + 9 ? [last[0], last[1] + 0.0022 * (8 * (f < endW ? bump(f, endW - 4, 3) : 0) - 10 * bump(f, endW - 1, 2) + 5 * tapK) + 0.008, last[2] + 0.015] : null;
      const tO: PersonOpts = { view: stern ? "front" : "back", facing: stern || over ? 1 : 0, expr: "stern", look: stern ? 0 : 1.3, lookY: stern ? 0 : over ? 0.25 : 0.1,
        blink: blinkAt(f, i, [BEAT.half - 1, BEAT.half + 11, endW + 2]),
        breath: L.breath, tilt: tiltT, shift: L.shift, headTilt: L.head * 0.5 + 3 + (over ? 7 : 0) - 4 * k3 + bobL,
        squash: 0.3 * bump(f, endW + 2, 3) - 0.6 * smooth(hi) + 0.25 * bump(f, T0 - 7, 2), face: stern ? { browUp: vC >= 9 ? [-5, 2] : [-5, -5], glint: vC < 3 ? 1 : 0 } : over ? { browUp: [0, -4] } : {}, hands: [{ a: "hang" }, hd] };
      if (wt) {
        const R = rig(a.o, { ...tO, seed: seedOf(i), light: light2D(cam) }), Sd = R.fin(R.hands[1].S), B12 = basisOf(12, f), Pc: V3 = [Pw[0], toe, Pw[2]];
        tO.hands = [{ a: "hang" }, { a: Sd, hold: null }];                                   // the card's own arm collapses into the shoulder
        const Ss = toScr(B12, toWorld(cam, Pc, 1, Sd)), Ts = toScr(B12, wt), wW = (5.6 * R.u * SU) / frameW(B12, Ss[2]);
        limbCard(out, B12, Ss, Ts, wW, "teach");
      }
      put(out, cam, a, Pw, tO, { rise: toe });
      puff(out, [last[0], last[1] - 0.06, last[2] + 0.05], f, endW + 1, 8, true);
      puff(out, [last[0], last[1] - 0.06, last[2] + 0.05], f, endW + 5, 8, true);
      { const t = f - endW; if (t >= 0 && t < 12) { // the chalk snaps on the full-stop tap: a tiny piece flies off
        fx(out, "chalkbit", 96, 96, (p) => { p.poly([[30, 40], [66, 36], [70, 56], [34, 60]], "#fbfaf4", 6); }, [last[0] + 0.03 * t, last[1] - 0.004 * t * t + 0.02, last[2] + 0.08], 0.035, 0.035, { rot: t * 0.7 }); } }
      if (tip && !lifted && !rising && mod(Math.floor(f), 3) === 0) puff(out, [tip[0], tip[1] - 0.03, tip[2] + 0.04], f, Math.floor(f), 3, true);
    } else {
      // turned to the class: peers over her glasses on "other half" (a 1 f brow drop), smug on "everybody"
      const ex: K<Expr>[] = [[0, "stern"], [BEAT.everybody, "smug"]];
      const peer = f >= BEAT.otherHalf && f < BEAT.otherHalf + 10;
      put(out, cam, a, P, { expr: at(f, ex), look: 0.4, lookY: peer ? -0.4 : 0, blink: blinkAt(f, i, [endW + 10]), facing: 1, breath: L.breath, tilt: L.sway * 0.5, shift: L.shift,
        headTilt: L.head * 0.5 + (peer ? -4 : 0), nod: peer ? 0.5 : 0, face: { fdy: peer ? -3 : 0, browUp: Math.abs(f - BEAT.otherHalf) < 0.7 ? [-3, -3] : undefined },
        hands: f >= BEAT.everybody - 4 ? [{ a: "chest", dx: 16, dy: 4 }, { a: "chest", dx: -16, dy: -2, hold: "chalk", ang: 60 }] : [{ a: "hip" }, { a: "waist", hold: "chalk", ang: 30 }] }); // A4: arms fold for the glare
    }
  }
  // pupils at their desks (seen from behind first, then from the board side): one doodles, one whispers behind a
  // cupped hand on "cheated", one copies his neighbour's paper (eyes sliding sideways), one sinks in his chair, one
  // raises a hand on "hears"; on "everybody" the one behind the honest student leans in and side-eyes her
  CL.desks.forEach(([x, z], n) => {
    if (n === 1) return;
    const a = PUP(n), P = cl([x, 0, z + 0.3]), i = a.i, L = life(f, i), front = seesFront(cam, P, 0, -1);
    const whisper = n === 3 && f >= BEAT.cheated && f < BEAT.cheated + 14, sink = n === 0 ? 0.6 * ramp(f, BEAT.cheated, 6) * (1 - ramp(f, BEAT.cheated + 30, 10)) : 0;
    const peek = n === 4 && f >= BEAT.everybody - 2 ? ramp(f, BEAT.everybody - 2, 6) : 0, lateLean = n === 4 && f >= 1510 ? ramp(f, 1510, 6) : 0;
    const copy = n === 5 && f >= BEAT.cheated - 2 && f < BEAT.cheated + 26, chew = n === 5 && !copy, raise = n === 2 && f >= BEAT.hears, doodle = n === 0 && f < BEAT.cheated;
    const yawn = n === 0 && f >= BEAT.everybody + 6 && f < BEAT.everybody + 20; // A4: a big bored yawn + stretch
    const side = n === 3 ? -1 : 1;
    const dz = Math.sin(VF * 0.9) * 3, OH = BEAT.otherHalf;
    // A5 P3: varied reactions as the camera passes on "The other half hears:"
    const gasp = n === 0 && f >= OH + 4 && f < OH + 16, grinN = n === 3 && f >= OH + 8 && f < OH + 22, crib = n === 4 && f >= OH + 2 && f < BEAT.everybody - 2, sinkS = n === 5 && f >= OH + 12 && f < OH + 30;
    put(out, cam, a, P, { view: front ? "front" : "back", facing: whisper ? side : copy ? -1 : peek > 0 ? 1 : 0, mode: "chair",
      expr: yawn ? "wide" : gasp ? "gasp" : grinN ? (f < OH + 18 ? "laugh" : "grin") : crib ? "shifty" : sinkS ? "worry" : peek > 0 ? "shifty" : copy ? "shifty" : whisper ? "scheme" : chew ? "focus" : n % 2 ? "listen" : "calm",
      look: grinN ? 1.3 : crib ? -1.2 : peek > 0 ? 1.3 : copy ? -1.3 : hh(n, 3) - 0.5, lookY: crib ? 0.9 : peek > 0 ? 0.8 : copy ? 0.9 : doodle ? 1 : -0.2, squash: sink + (sinkS ? 0.55 * ramp(f, OH + 12, 4) : 0) - (yawn ? 0.3 * bump(f, BEAT.everybody + 6, 14) : 0) + (grinN && f < OH + 18 ? 0.35 * Math.abs(Math.sin(TAU * 5 * (vt(f) - vt(OH + 8)) / FPS)) : 0), // carryover: a back-row laugh bob (~10 f) under "The other half" blink: yawn ? 1 : blinkAt(f, i, [OH + 4, OH + 8]), breath: L.breath * 1.2, shift: L.shift,
      tilt: L.sway * 0.6 + (peek + lateLean) * 10 + (whisper ? side * 6 : 0) + (copy ? -8 : 0), headTilt: L.head + (n % 2 ? 3 : -3),
      hands: yawn ? [{ a: "lap", b: "up", k: bump(f, BEAT.everybody + 6, 14), dy: 10 }, { a: "lap", b: "up", k: bump(f, BEAT.everybody + 6, 14), dy: 10 }] : [chew ? { a: "mouth", hold: "gum", n: Math.round(5 + 5 * Math.sin(VF * 0.25)) } : crib ? { a: "lap", dx: -10 + 6 * ramp(f, OH + 2, 6), dy: 6, hold: "note" } : whisper && side < 0 ? { a: "whisper", shape: "mitten", split: true } : doodle ? { a: "lap", dx: dz, dy: -6 + dz * 0.5, hold: "pencil", ang: -50 } : { a: "lap" },
        raise ? { a: "raise", dy: 10, shape: "palm" } : whisper && side > 0 ? { a: "whisper", shape: "mitten", split: true } : { a: "lap", dy: -4 }] });
    if (sinkS) sweat(out, cam, P, 1, f, OH + 14, OH + 30, 14, 430);
  });
  // A4: the aisle is alive during the swing (HALF THIS CLASS reads as a full class): a pupil hands her test in at the
  // teacher's desk, one passes a folded note to another, one chews his pencil; on "hears" the note pair snap their heads
  // to the board with wide eyes (a 1 f swap)
  ([[5, [0.1, 0, -1.75], 0], [6, [1.5, 0, -1.2], 1], [7, [2.2, 0, -1.45], 2], [8, [-0.15, 0, -1.3], 3]] as [number, V3, number][]).forEach(([v, d, act]) => {
    const a = PUP(v), P = cl(d), i = a.i, L = life(f, i), H = BEAT.hears;
    const sb = sideOf(cam, P, cl([0, 1.6, CL.board.z])), sdk = sideOf(cam, P, cl([0.75, 0.8, -2.45]));
    const mate = act === 1 ? cl([2.2, 0, -1.45]) : cl([1.5, 0, -1.2]), sm = sideOf(cam, P, mate);
    const turn = (act === 1 || act === 2) && f >= H - 1 && f < H + 14;
    let facing: -1 | 1 = act === 0 ? sdk : act === 3 ? sb : sm, expr: Expr = act === 3 ? "focus" : act === 0 ? "smile" : "scheme", look = facing * 1.2, lookY = act === 3 ? -0.3 : 0;
    if (turn) { facing = sb; expr = f < H ? "browsUp" : "wide"; look = sb * 1.3; lookY = -0.4; }
    const give = act === 1 && f < 1473, got = act === 2 && f >= 1473;
    const reach: Hand = act === 0 ? { a: "show", dy: -2 + 2 * Math.sin(VF * 0.4), hold: "paper", ang: 75 * sdk }
      : act === 1 ? { a: "show", dy: 2, hold: give ? "envelope" : null } : act === 2 ? { a: "hang", b: "show", k: ramp(f, 1466, 5), dy: 2, hold: got ? "envelope" : null }
        : { a: "show", hold: "ruler", ang: 55 + 8 * Math.sin(VF * 0.6), dy: 2 * Math.sin(VF * 1.1) }; // A5: a ruler (the pencil is the honest student's)
    const side = act === 0 ? sdk : act === 3 ? 1 : sm;
    const hands: [Hand, Hand] = side < 0 ? [reach, { a: act === 1 ? "hip" : "hang" }] : [{ a: act === 1 ? "hip" : "hang" }, reach];
    put(out, cam, a, P, { ...idle(f, i, P), facing, expr, look, lookY, breath: L.breath * 1.3, blink: blinkAt(f, i, turn ? [H] : []), headTilt: L.head + (turn ? sb * 5 : 0), hands });
  });
  {
    // the honest student: listens, brows up on "hears", shifty saccades + sweat + thought bubble on "everybody", then
    // smug; her hands rest in her LAP (arms visible) and she taps her pencil on "cheats." and again at the end, with a
    // breath and a head bob so the last frames never freeze; a blink covers the frame her card turns to face the lens
    const a = A.student, i = a.i, P0 = cl([CL.student[0], 0, CL.student[2] + 0.3]), front = seesFront(cam, P0, 0, -1), L = life(f, i);
    const sf = (g: number) => { const c = camAt(12, g).pos; return (c[2] - P0[2]) * -1 > 0; };
    const flip = [0, 1, 2].some((k) => sf(f - k) !== sf(f - k - 1));
    // seen from the front, her card sits 0.18 m toward the lens so the chair back never draws over her
    const tw = toward(cam, P0), P: V3 = front ? [P0[0] + tw[0] * 0.18, 0, P0[2] + tw[1] * 0.18] : P0;
    const E = BEAT.everybody, end = E + 17, CH = PW(25, "cheats.");
    const ex: K<Expr>[] = [[0, "listen"], [BEAT.hears - 1, "browsUp"], [E + 1, "shifty"], [end, "smug"]]; // A4: the "o" lands 0-1 f before "hears" (a blink across it)
    const e = at(f, ex);
    const dl = f >= E + 1 && f < end ? (Math.floor((vt(f) - vt(E + 1)) / 6) % 2 ? 1 : -1) : 0;
    const tapK = (f >= CH - 1 && f < CH + 9 ? Math.abs(Math.sin(((f - CH + 1) / 5) * Math.PI)) : 0) + (f >= end - 4 ? Math.abs(Math.sin(((f - end + 4) / 6) * Math.PI)) : 0);
    const rub = ramp(f, E, 4) * (1 - ramp(f, end + 8, 5));
    put(out, cam, a, P, { view: front ? "front" : "back", mode: "chair", expr: e, look: dl ? dl * 1.4 : 0.3, lookY: e === "shifty" ? 0.2 : -0.2,
      blink: flip ? LID[1] : blinkAt(f, i, [...swapsOf(ex), 1510]), breath: L.breath * 1.6, tilt: L.sway * 0.6, shift: L.shift, face: { blush: dl ? clamp01((f - E - 8) / 4) : 0 },
      headTilt: L.head * 0.6 + dl * 4 + (f >= end ? 4 * ramp(f, end, 12) + 3 * Math.sin(VF * 0.35) : 0)
        + (front ? 0 : 6 * sideOf(cam, P, cl([0, 1.6, CL.board.z])) * ramp(f, BEAT.cheated - 2, 4) * (1 - ramp(f, BEAT.cheated + 14, 6))), // LEAD P3: the OTS foreground head tips toward the board on "cheated."
      squash: front ? 0 : 0.18 * Math.sin(TAU * HZ.b * vt(f) / FPS),
      // A6 P2: both arms read (the ball hands on her lap OUTSIDE the torso); on "everybody" one hand rubs her chin with the
      // side-eye (4 f anticipation dip, held, a 2 px rub every 6 f), the pencil taps her knee on "cheats."
      hands: front ? [rub > 0.02 ? { a: "lap", b: "chin", k: rub, dx: -10 * (1 - rub) + 6 * rub, dy: 6 * bump(f, E - 3, 3) + 2 * Math.sin(TAU * vt(f) / 12) * rub, bend: 1.4 } : { a: "lap", dx: -22 },
        { a: "lap", dx: 22, dy: -8 * tapK, hold: "pencil", ang: -70 }] : [{ a: "lap", dx: -18 }, { a: "lap", dx: 18, dy: -4 }] });
    if (dl) sweat(out, cam, P, 1, f, E + 10, end + 6, 18, 480);
    const dvE = vt(f) - vt(E - 1), pop = dvE < 0 ? 0 : dvE < 3 ? [0.55, 1.12, 0.97][Math.floor(dvE)] : 1 + 0.015 * Math.sin((TAU * dvE) / 30), ph = mod(Math.floor((vt(f) - vt(E)) / 6), 4); // A7: 4 poses every 6 video f, a 1.5 % wobble
    { const [bx, bz] = axisX(cam, P0); // A4: +20 % and ~60 px right, so the HONESTY poster stays readable beside it
      // A5 P3: 0.25 m further right + 0.1 m up and 8 % smaller, so HONESTY IS THE BEST POLICY reads whole beside it
      if (pop > 0) fx(out, `bubbleCheat${ph}`, 1000, 800, (p) => fxBubbleCheat(p, ph), [P0[0] + 0.02 + bx * 0.35, 1.76, P0[2] - 0.05 + bz * 0.35], 0.95 * pop, 0.76 * pop); }
  }
};

// ---------------- storeroom (twist) ----------------
const sr = (d: V3) => add(SR.base, d);
const storeroom = (out: Stage, cam: CamInfo, f: number) => {
  // local staging: he stands just behind the BAIT bucket, ~0.5 m screen-right of the crate so CONSCIENCE PILE reads
  const a = A.asst1, i = a.i, P = sr([SR.bucket[0] + 0.2, 0, SR.bucket[2] - 0.5]), L = life(f, i);
  // A3: the scoop dips on the pile's FRONT-RIGHT corner nearest the bucket, in front of the letter cards (never behind them)
  // A4: the scoop digs into the pile's FRONT-LEFT surface (screen-left of and above the BAIT bucket in the insert and the
  // wide), so it reads as "from the conscience pile INTO the bait bucket", never out of the bucket
  // A6 P3: the dip 0.08 m lower and 0.05 m left, below the I'M RETURNING THIS note (it reads whole through each dip)
  const pile = sr([SR.crate[0] + 0.25, 0.9, SR.crate[2] + 0.2]), dipP = sr([SR.crate[0] + 0.13 - 0.14 * cam.right.x, 0.6, SR.crate[2] + 0.32 - 0.14 * cam.right.z]) /* A7 P3: 0.09 m lower + 0.05 m left: under the I'M RETURNING THIS note */, bucket = sr([SR.bucket[0], 0.71, SR.bucket[2]]);
  const sd = sideOf(cam, P, pile);
  // three scoops: the first ON "the bait wood?" (its chips are drawn here), then on "pieces" and "stole" (WORLD-INT's
  // chip arcs at BEAT.pieces + 4 + k * gap, k = 0, 1): lift (2 f anticipation), dip, swing, tip (overshoot); the blade
  // visibly carries 4 chips from the lift until the tip and spills them one per frame
  const s0 = BEAT.pieces + 4, gap = (BEAT.apology - s0) / 3, FS = [BEAT.bait + 1, BEAT.conscience + 10, s0, s0 + gap]; // A4: + one scoop inside the reveal wide
  const pD = toDesignRay(cam, P, 1, pile), dD = toDesignRay(cam, P, 1, dipP), bD = toDesignRay(cam, P, 1, bucket);
  // A3 scoop cycle (24 f): 2 f anticipation lift, 5 f reach to the pile corner, 5 f dig + load (a 1 f sparkle), 5 f arc
  // over to the bucket, the tip (4..9, WORLD-INT's chips leave the scoop at FS + 4 + k), 2 f back
  let toPile = 0, tip = 0, scoopOn = false, load = 0, tk = -99, arcUp = 0, dig = 0;
  // A5 P2: the first scoop ("the bait wood?") is the BAIT insert's own close-up hand + trowel (insertScoop below): his
  // card keeps its scoop hand at the waist while the insert runs, so no arm arcs into it
  const INS0 = FS[0] - 8, INS1 = FS[0] + 24, insertWin = f >= INS0 && f < INS1;
  for (let k = 1; k < FS.length; k++) {
    const t = f - FS[k];
    if (t >= -13 && t < 11) {
      scoopOn = true; tk = t;
      toPile = t < -11 ? -0.15 * bump(t, -13, 2) : t < -6 ? smooth((t + 11) / 5) : t < -1 ? 1 : t < 4 ? 1 - smooth((t + 1) / 5) : 0;
      arcUp = t >= -1 && t < 4 ? Math.sin(Math.PI * (t + 1) / 5) : 0;
      tip = t >= 4 && t < 9 ? smooth((t - 4) / 3) * (1 - smooth((t - 7) / 2)) + (t >= 7 && t < 9 ? 0.15 * bump(t, 7, 2) : 0) : 0;
      load = t < -4 ? 0 : t < 4 ? Math.min(4, t + 4) : clamp(8 - t, 0, 4);
      dig = t >= -9 && t < 0 ? smooth((t + 9) / 3) * (1 - smooth((t + 2) / 2)) : 0; // A7 P3: the blade tilts DOWN into the pile (under the notes)
    }
  }
  // A3 acting: a glance down at the bucket on "bait" (+ a blink), a knowing smirk with one brow up and a guilty
  // side-glance at the pile on "conscience", the "o" on the parcel, reads the letter, the sweat-grimace on "letters"
  const AP = BEAT.apology, LT = PW(30, "letters.");
  const ex: K<Expr>[] = [[0, "calm"], [BEAT.bait - 2, "focus"], [BEAT.bait + 10, "calm"], [BEAT.conscience - 2, "smirk"], [BEAT.conscience + 12, "calm"], [s0 - 14, "focus"], [BEAT.conscience + 15, "smug"], [BEAT.conscience + 23, "focus"], [PW(30, "people") - 1, "stern"], [pAt(PW(30, "people"), 22), "focus"], [BEAT.mailed - 2, "browsUp"], [BEAT.mailed + 8, "focus"],
    [AP - 6, "listen"], [AP + 2, "browsUp"], [AP + 8, "grimace"], [LT + 6, "shifty"], [LT + 17, "grimace"]];
  const e = at(f, ex);
  const scoopIdle: P2 = [bD[0] - sd * 10, bD[1] - 60];
  // to the pile's front-right corner (in front of the letters), the loaded scoop arcs up over to the bucket
  const tgt: P2 = [scoopIdle[0] + (dD[0] - scoopIdle[0]) * toPile, scoopIdle[1] + (dD[1] + 20 - scoopIdle[1]) * toPile - 40 * arcUp];
  const scoop: Hand = { a: f < BEAT.bait - 12 || insertWin ? "waist" : tgt, hold: "scoop", ang: sd * (30 + 80 * dig + 90 * tip), n: Math.round(load) };
  // the free hand lifts a letter off the pile and holds it up beside his face (reads it: 2 saccades, then brows up)
  const LA = AP - 10, LB = AP - 6, LC = AP - 4; // reach for a letter, pick it, hold it up to the lens beside his face
  const trem = f >= LC ? Math.sin(TAU * 4 * (VF / FPS)) : 0; // A5 ADD: the letter trembles ~1 deg at 4 Hz in his hand
  const letterH: Hand = seq(f, [[0, tgt, 1], [LA, [pD[0] + sd * 20, pD[1] + 10], 4], [LB, [pD[0] + sd * 20, pD[1] + 24], 2], [LC, "show", 6]],
    { dx: f >= LC ? sd * 14 * ramp(f, LC, 6) : 0, dy: f >= LC ? -30 * ramp(f, LC, 6) : 0, hold: f >= LB ? "letter" : null, ang: sd * 4 + trem });
  let look = sd * 0.8, lookY = 0.7, head = L.head * 0.6;
  // A5 P2: during every scoop his eyes stay DOWN on the trowel and the bucket (head tipped 4-5 deg), never the lens
  if (scoopOn && f < BEAT.mailed - 2) { const bsd = sideOf(cam, P, bucket); look = (tip > 0.2 ? bsd : sd) * 0.95; lookY = 1.0 - 0.3 * tip; head += sd * 5; }
  if (f >= BEAT.bait - 2 && f < BEAT.bait + 8) { const bs = sideOf(cam, P, bucket); look = bs * 0.8; lookY = 1; head += bs * 4; }   // down at the bucket
  if (f >= BEAT.conscience && f < BEAT.conscience + 8) { look = sd * 1.4; lookY = 0.3; head += sd * 3; }                         // the guilty side-glance
  if (f >= BEAT.mailed - 2 && f < BEAT.mailed + 8) { const ms = sideOf(cam, P, sr([-0.2, 1.5, -2.75])) || -1; look = ms * 1.2; lookY = -0.9; head += ms * 7; } // snap toward the mail slot (behind-left, up)
  if (f >= LB && f < AP + 2) { const m = mod(vt(f) - vt(LB), 21); look = sd * (m >= 19 ? 0.6 : 0.55 + 0.4 * Math.min(2, Math.floor(m / 7))); lookY = 0.1; head += sd * 3 + 3 * Math.sin((TAU * (vt(f) - vt(LB))) / 34); } // A5 ADD: reading saccades + one slow head shake
  else if (f >= AP + 2) { look = -sd * 0.6; lookY = -0.3; head -= sd * 3; }
  if (e === "shifty") { look = -sd * 1.4; lookY = 0; }
  if (f >= FS[1] + 11 && f < FS[1] + 17) { look = 0; lookY = 0; head -= sd * 2; } // the chips are in: THEN a sly look straight at us
  { const ST14 = PW(30, "stole,"), us = dvf(f, ST14); if (us >= -1 && us < 16) { look = 0; lookY = 0; head -= sd * 2 - 4 * Math.sin((TAU * us) / 10) * bumpV(us, -1, 17); } } // A7 P3: a disapproving look at us + a slow head shake on "people stole,"
  const late = f >= LA, pileH = late ? letterH : scoop, farH: Hand = late ? { a: "waist", hold: "scoop", ang: -sd * 20 } : { a: "hip" };
  put(out, cam, a, P, { expr: e, facing: sd, look, lookY, blink: blinkAt(f, i, [...swapsOf(ex), BEAT.bait + 8], [BEAT.mailed - 2, AP + 2]), breath: L.breath * 1.3, shift: L.shift,
    face: e === "smirk" ? { browUp: sd > 0 ? [0, 5] : [5, 0] } : {},
    tilt: L.sway * 1.3 + sd * 6 * toPile + 4 * (tk >= -8 && tk < -6 ? -1 : 0) * sd, headTilt: head, squash: 0.3 * bump(tk, -8, 2), hands: sd < 0 ? [pileH, farH] : [farH, pileH] });
  if (f >= BEAT.apology) sweat(out, cam, P, -sd, f, BEAT.apology, 1e9, 20, 300);
  // A5 P2: in the wide his scoop hand dips BEHIND the note cards on the pile: redraw the ball hand + trowel as a card in
  // front of the notes at the same screen spot (so the arm ends in a hand and a trowel, never a blunt "hose")
  // A6 P2: never while the lens is still long (the insert scale): the insert trowel owns the frame until the pull-back
  if (scoopOn && !insertWin && toPile > 0.2 && f < BEAT.mailed - 2 && camAt(14, f).fov >= 45) {
    const B = basisOf(14, f), po = { facing: sd, seed: seedOf(i), tilt: L.sway * 1.3 + sd * 6 * toPile + 4 * (tk >= -8 && tk < -6 ? -1 : 0) * sd, squash: 0.3 * bump(tk, -8, 2), breath: L.breath * 1.3, hands: (sd < 0 ? [scoop, null] : [null, scoop]) as [Hand | null, Hand | null] }; // A7: = the card's own body pose (the shoulder matches)
    const hp = handAt(a.o, po, sd < 0 ? 0 : 1), hw = toScr(B, toWorld(cam, P, 1, hp)), hd2 = headAt(a.o, po), hs = toScr(B, toWorld(cam, P, 1, [hd2[0], hd2[1] + 1.2 * hd2[2]]));
    const d = Math.max(0.5, Math.min(hw[2], toScr(B, pile)[2]) - 0.35), W = 0.274 * 2.81 * (d / hw[2]);
    const th = -90 + (scoop.ang ?? 0), sl = (Math.atan2((hs[1] - hw[1]) / ASPECT, hs[0] - hw[0]) * 180) / Math.PI;
    // A7 P1: the overlay forearm follows the card arm's own curve (toon drawArm: through the elbow at its midpoint),
    // sampled from the hand back past the elbow, in the overlay canvas' pixels (512 px = W of the frame at depth d)
    const R14 = rig(a.o, { ...po, light: light2D(cam) }), hr = R14.hands[sd < 0 ? 0 : 1], S0 = hr.S, Hd = hr.H;
    const ddx = Hd[0] - S0[0], ddy = Hd[1] - S0[1], ll = Math.hypot(ddx, ddy) || 1, bul = (0.16 + 0.22 * clamp(1 - ll / (1.05 * R14.HH), 0, 1)) * ll * hr.bend;
    let nx = -ddy / ll, ny = ddx / ll; if (nx * hr.side < 0) { nx = -nx; ny = -ny; }
    const Ek: P2 = [(S0[0] + Hd[0]) / 2 + nx * bul, (S0[1] + Hd[1]) / 2 + ny * bul], cc: P2 = [2 * Ek[0] - (S0[0] + Hd[0]) / 2, 2 * Ek[1] - (S0[1] + Hd[1]) / 2];
    const pxs = 512 / ((W / frameW(B, d)) * 1080), limbPts: P2[] = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map((t) => {
      const s1 = 1 - t, bq = R14.fin([s1 * s1 * S0[0] + 2 * s1 * t * cc[0] + t * t * Hd[0], s1 * s1 * S0[1] + 2 * s1 * t * cc[1] + t * t * Hd[1]]), sc = toScr(B, toWorld(cam, P, 1, bq));
      return [q((sc[0] - hw[0]) * 1080 * pxs, 1), q((sc[1] - hw[1]) * 1920 * pxs, 1)] as P2; });
    fx(out, `hscoopW${q(th, 2)}s${q(sl, 0.2)}n${Math.round(load)}L${limbPts.join(";")}`, 512, 512, (pp) => fxHandScoop(pp, q(th, 2), q(sl, 0.2), Math.round(load), a.o.shirt, SKIN_C, limbPts), fromScr(B, hw[0], hw[1], d), W, W);
  }
  // the loading sparkle on the blade (1 f)
  for (const fs0 of FS) if (Math.abs(f - (fs0 - 3)) < 0.7) { const hp = handAt(a.o, { facing: sd, seed: seedOf(i), tilt: L.sway * 1.3 + sd * 6 * toPile, breath: L.breath * 1.3, hands: sd < 0 ? [scoop, null] : [null, scoop] }, sd < 0 ? 0 : 1);
    const ar = (scoop.ang ?? 0) * Math.PI / 180; glintAt(out, toWorld(cam, P, 1, [hp[0] + 90 * Math.sin(ar), hp[1] - 90 * Math.cos(ar)], 0.14), f, f, 0.16, 2); }
  // the bait-scoop's chips pour from the scoop tip into the BAIT bucket (6-9 f arcs), with a 1 f spill each
  for (const FSk of [FS[1]]) { const t = f - FSk, hp = handAt(a.o, { facing: sd, seed: seedOf(i), tilt: L.sway * 1.3 + sd * 6 * toPile, breath: L.breath * 1.3, hands: sd < 0 ? [scoop, null] : [null, scoop] }, sd < 0 ? 0 : 1);
    const ar = (scoop.ang ?? 0) * Math.PI / 180, tipW = toWorld(cam, P, 1, [hp[0] + 83 * Math.sin(ar), hp[1] - 83 * Math.cos(ar)], 0.1);
    for (let k = 0; k < 4; k++) { const u = (t - 4 - k) / 6; if (u >= 0 && u < 1) {
      const c: V3 = [tipW[0] + (bucket[0] - tipW[0]) * u, tipW[1] + (bucket[1] - 0.06 - tipW[1]) * u + 0.18 * Math.sin(Math.PI * u), tipW[2] + (bucket[2] - tipW[2]) * u];
      fx(out, `chipS${k}`, 96, 96, (p) => fxChip(p, 40 + k), c, 0.07, 0.06, { rot: 3 * u + k });
    } } }
  // A5 P2: the BAIT insert scoop (screen-anchored to the bucket rim): it digs blade-DOWN into the conscience pile (a 2 f
  // rise, the plunge), lifts with 4 chips on the blade (6 f), swings over the bucket, tilts 40 deg so the chips tumble in
  // (landing ~video 2149-2153 = the clinks), a 2 f shake, then withdraws up-right out of frame by ~video 2165
  if (insertWin) {
    const B = basisOf(14, f), rc = toScr(B, bucket), rl = toScr(B, [bucket[0] - 0.16, bucket[1], bucket[2]]), r = Math.max(0.04, rc[0] - rl[0]);
    const F0 = FS[0], ky: [number, number, number, number, number][] = [ // [frame, HAND x, y (rim radii from the rim centre), blade deg, chips]
      // A6 (A5 P2 "keep the arm below the notes"): the hand comes in from screen-RIGHT at the pile's height (the sleeve runs
      // off the right edge under the I'M RETURNING THIS card), pulls back 2 f, plunges the blade tip into the pile front,
      // lifts the load, carries it over the bucket, tips 40 deg (the chips tumble), shakes, and withdraws right
      // (render check: the pile front at the old dip point is covered by the PLEASE FORGIVE ME card, so the blade dug
      // into a note: the blade tip now plunges into the chips just right of that card, below I'M RETURNING THIS)
      [INS0, 3.05, -1.34, 172, 0], [F0 - 5, 1.6, -1.47, 170, 0], [F0 - 3, 1.8, -1.54, 168, 0], [F0 - 1.5, 1.32, -1.47, 173, 0], [F0 + 1.5, 1.39, -1.87, 164, 4],
      [F0 + 5.5, 1.82, -1.9, 176, 4], [F0 + 6.5, 1.95, -1.8, 174, 4], [F0 + 8, 1.95, -1.8, 138, 4], [F0 + 13.4, 1.95, -1.77, 136, 0], [F0 + 14.6, 1.95, -1.77, 136, 0], [INS1, 3.8, -2.27, 165, 0]];
    let j = 0; while (j < ky.length - 2 && f >= ky[j + 1][0]) j++;
    const A0 = ky[j], A1 = ky[j + 1], u = smooth((f - A0[0]) / Math.max(0.01, A1[0] - A0[0]));
    const L1 = (a: number, b: number) => a + (b - a) * u;
    const shake = f >= F0 + 13.4 && f < F0 + 14.6 ? 0.08 * Math.sin((f - F0) * 9) : 0;
    const sx = rc[0] + (L1(A0[1], A1[1]) + shake) * r, sy = rc[1] + L1(A0[2], A1[2]) * r * ASPECT, th = L1(A0[3], A1[3]);
    const nChips = f >= F0 + 1 && f < F0 + 8 ? 4 : f >= F0 + 8 && f < F0 + 12 ? Math.max(0, 4 - Math.floor((f - F0 - 8) * 1.1)) : 0;
    const d = rc[2] - 0.3, fwc = frameW(B, d), W = 6.2 * r * fwc, cth = Math.cos((th * Math.PI) / 180), sth = Math.sin((th * Math.PI) / 180);
    fx(out, `hscoop${q(th, 2)}n${nChips}`, 512, 512, (p) => fxHandScoop(p, q(th, 2), -14, nChips, a.o.shirt), fromScr(B, sx, sy, d), W, W);
    if (Math.abs(f - (F0 + 1)) < 0.8) glintAt(out, fromScr(B, sx + cth * 0.25 * W / fwc, sy + sth * 0.25 * (W / fwc) * ASPECT, d - 0.02), f, f, 0.1, 2);
    // the chips tumble off the tilted blade tip into the bucket (one per ~1.2 f)
    const tipS: [number, number] = [sx + cth * (0.34 * W / fwc), sy + sth * (0.34 * W / fwc) * ASPECT];
    for (let k = 0; k < 4; k++) { const t0 = F0 + 8.3 + k * 1.15, uu = (f - t0) / 3.2; if (uu >= 0 && uu < 1) {
      const px = tipS[0] + (rc[0] + (k - 1.5) * 0.25 * r - tipS[0]) * uu, py = tipS[1] + (rc[1] + 0.1 * r * ASPECT - tipS[1]) * uu * uu;
      fx(out, `chipI${k}`, 96, 96, (pp) => fxChip(pp, 40 + k), fromScr(B, px, py, d + 0.05), 0.05, 0.045, { rot: 2.5 * uu + k }); } }
  }
  // the second assistant sorts envelopes at the desk, glances over at the scoop, shrugs on "apology"
  { const b = A.asst2, j = b.i, Q = sr([SR.desk[0] + 0.15, 0, SR.desk[2] + 0.62]), Lb = life(f, j), sq = sideOf(cam, Q, pile);
    const glance = mod(vt(f), 70) > 48 || (f >= BEAT.bait && f < BEAT.bait + 14), shrug = bump(f, BEAT.apology, 14), sortK = Math.sin(VF * 0.5);
    put(out, cam, b, Q, { expr: shrug > 0.2 ? "smug" : glance ? "listen" : "focus", facing: glance || shrug > 0 ? sq : -sq as -1 | 1, look: glance || shrug > 0 ? sq * 1.2 : -sq, lookY: glance ? 0 : 0.8,
      blink: blinkAt(f, j), breath: Lb.breath, tilt: Lb.sway, shift: Lb.shift, headTilt: Lb.head + 4 * shrug, squash: -0.4 * shrug,
      hands: shrug > 0.1 ? [{ a: "raise", dy: 16 - 10 * shrug, shape: "palm" }, { a: "raise", dy: 16 - 10 * shrug, shape: "palm" }]
        : [{ a: "chest", dx: 6 * sortK, hold: "envelope" }, { a: "waist", dx: -4 * sortK }] }); }
};

/** the VIDEO frame of the current stage() call (narration clock): idle life should run on it (A5 P1); 0 when unknown */
export let VF = 0;
export const stage = (id: number, f: number, cam: CamInfo, L: LightState, vf: number = f): Stage => {
  VF = vf;
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = L.actorShadow ? "golden" : "day";
  EXT = s.set === "trailhead" || s.set === "vista" || s.set === "trails";
  LOW = EXT ? clamp01((30 - L.el) / 12) : 0; BLOBC = L.blob;
  LX = `${L.name === "sunset" ? 1 : 0}${L.name === "night_int" ? 1 : 0}${s.set === "blueprint" ? 1 : 0}${({ morning: 1, dusk: 2, sunset: 3, blueprint: 4 } as Record<string, number>)[L.name] ?? 0}`;
  CAMR.copy(cam.right).setY(0).normalize();
  findSun(cam, SUN);
  switch (s.set) {
    case "trailhead": trailhead(out, cam, id, f); break;
    case "vista": vista(out, cam, id, f); break;
    case "trails": trails(out, cam, id, f); break;
    case "blueprint": blueprint(out, cam, f); break;
    case "classroom": classroom(out, cam, f); break;
    case "storeroom": storeroom(out, cam, f); break;
  }
  return out;
};
export { FPS, clamp01 };

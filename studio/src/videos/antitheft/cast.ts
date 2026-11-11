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
  fxChalkMan, fxChalkWeed, fxFlyRaven, fxFlash, fxTally, fxNote, fxPuff, fxBang, fxFeather, fxLizard, tintCard, tintFit, mix as mixHex,
  Outfit, PersonOpts, Expr, Hand, P2, RavenOpts, FaceX, swapPath, PanelPose, SWAP_T, SWAP_LEAN, fxRabbit,
  WOMAN_FIT, FIANCE_FIT, PROF_FIT, ASST1_FIT, ASST2_FIT, ASST3_FIT, RANGER_FIT, TEACHER_FIT, STUDENT_FIT, BP_FIT, tourist, pupil,
} from "./toon";
import { FPS, SHOTS, BEAT, TOTAL, clamp01, smooth, easeOut, camAt, PW } from "./story";
import type { LightState } from "./lights";
import { TH, TT, VISTA, CL, SR, BP, add, V3 } from "./plan";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, cardU, setCardMode } from "./cardshade";
import { windAt as windExt } from "./sets_ext";
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
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.26, 0.21, 0.4] };
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
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + GY, z,
    w: 0.62 * sc * wide, h: 0.3 * sc * wide, flat: true, rot: Math.atan2(-CAMR.z, CAMR.x) });
};

// ---------------- life helpers ----------------
const LID = [0.5, 1, 1, 0.5];
/** eyelid 0 open .. 1 shut: a 4-frame blink every 1.2-3.8 s (seeded, works for negative frames) + one across each swap */
const blinkAt = (f: number, i: number, swaps: number[] = [], quiet: number[] = []) => {
  for (const s of swaps) { const k = f - s + 1; if (k >= 0 && k < 4) return LID[Math.floor(k)]; } // floor: the picture clock is fractional (voice time-map)
  for (const q0 of quiet) if (f >= q0 - 1 && f < q0 + 8) return 0; // a shock pops with the eyes OPEN: no random blink for 8 f
  const P = 75, n0 = Math.floor(f / P);
  for (let n = n0 - 1; n <= n0 + 1; n++) {
    const st = n * P + Math.round((hh(i * 13 + n * 7, 5) - 0.5) * 40);
    const k = f - st; if (k >= 0 && k < 4) return LID[Math.floor(k)];
  }
  return 0;
};
/** blinks only at listed frames (loop-critical characters) */
const blinkList = (f: number, list: number[]) => { for (const s of list) { const k = f - s; if (k >= 0 && k < 4) return LID[Math.floor(k)]; } return 0; };
/** idle life: breathing (-1..1), weight-shift sway (deg), head bob (deg), weight shift (-1..1, sides every ~1.5 s) */
const life = (f: number, i: number) => {
  const t = f / FPS, ph = (k: number) => TAU * hh(i, k);
  return {
    breath: Math.sin(TAU * 0.25 * t + ph(1)),
    sway: 1.4 * Math.sin(TAU * 0.3 * t + ph(2)) + 0.5 * Math.sin(TAU * 0.73 * t + ph(3)),
    head: 1.6 * Math.sin(TAU * 0.2 * t + ph(4)) + 0.7 * Math.sin(TAU * 0.55 * t + ph(5)),
    shift: clamp(2.2 * Math.sin((TAU * t) / 3.0 + ph(6)), -1, 1),
  };
};
/** the world's loop-safe wind (sets_ext windAt, 0..1) mapped to a signed flutter -1..1 for cards */
const wnd = (f: number, x: number, z: number) => clamp((windExt(x, z, f) - 0.45) * 2.2, -1, 1);
/** fast secondary flutter (-1..1) for brims, ribbons, hems and straps: two beating waves, stronger on the gusts; pure
 *  in f (the hook passes its loop clock), own phase per character */
const flutAt = (f: number, i: number, x = 0, z = 0) => {
  const t = f / FPS, g = 0.45 + 0.55 * Math.abs(wnd(f, x, z));
  return clamp((0.6 * Math.sin(TAU * 1.15 * t + hh(i, 41) * TAU) + 0.4 * Math.sin(TAU * 1.9 * t + hh(i, 42) * TAU)) * g, -1, 1);
};
/** outdoor wind (-1..1) at a place (kept for other modules; = the world's vegetation wind) */
export const windAt = (f: number, x: number, z: number) => wnd(f, x, z);
type K<T> = [number, T];
const at = <T,>(f: number, keys: K<T>[]): T => { let v = keys[0][1]; for (const [k, x] of keys) if (f >= k) v = x; return v; };
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
const scan = (f: number, period = 22) => { const m = mod(f, period); return m >= period - 2 ? -0.6 : -0.9 + Math.min(3, Math.floor(m / 5)) * 0.6; };
/** the hook's loop-safe reading gaze [look, lookY]: the pupils sit at the TOP of the eye (the board is above and
 *  behind her), one fixation held for |tau| <= 2 across the seam, then saccades of 5-7 f along each line */
const readGaze = (tau: number): [number, number] => {
  // A3: the pupils sit ~4 px (full res) higher than round 2: the reading look points at the board above her
  if (Math.abs(tau) <= 2) return [-0.3, -1.25];
  const P = 23, m = mod(tau - 3, P), k = m < 6 ? 0 : m < 11 ? 1 : m < 17 ? 2 : 3, line = mod(Math.floor((tau - 3) / P), 3);
  return [m >= P - 2 ? -0.1 : -0.45 + 0.3 * k, [-1.25, -1.2, -1.15][line]];
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

type PutX = { scale?: number; noBlob?: boolean; blobK?: number; rise?: number };
/** the trailhead plaza curb (sets_ext: x -2.85..2.85, z 1.8..1.95, 6 cm tall): blobs on it ride its top, never buried */
const curbY = (p: V3) => (Math.abs(p[0]) < 2.95 && p[2] > 1.55 && p[2] < 2.2 ? 0.032 : 0);
const put = (out: Stage, cam: CamInfo, a: Act, pos: V3, o: PersonOpts, x: PutX = {}) => {
  const sc = x.scale ?? 1, rise = x.rise ?? 0;
  const d = cam.pos.distanceTo(tmp.set(pos[0], pos[1] + 1.1 * sc, pos[2])) / sc;
  const [w, h, k] = tier(d);
  const opts: PersonOpts = { ...o, light: light2D(cam), seed: seedOf(a.i) };
  out.places.push({ key: `P|${a.key}|${fkey(opts)}|LX${LX}`, x: pos[0], y: pos[1] + rise, z: pos[2], scale: sc, draw: (p) => drawPerson(p, a.o, opts), size: [w, h, k] });
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
const notes = (out: Stage, cam: CamInfo, P: V3, head: [number, number, number], f: number, starts: number[], side = 1, sc = 1) => {
  const [hx, hy, ha] = head, sz = 0.44 * ha;
  let live = 0;
  starts.forEach((s, n) => {
    const t = f - s; if (t < 0 || t >= 14 || live >= 2) return;
    live++;
    let x = hx + side * (1.3 * ha + 0.05 * ha * t), y = hy + 0.24 * ha - 0.055 * ha * t + 3 * Math.sin(t * 0.8 + n);
    const d = Math.hypot(x - hx, y - hy), need = 1.08 * ha + 0.5 * sz;
    if (d < need) { x = hx + ((x - hx) * need) / d; y = hy + ((y - hy) * need) / d; }
    const g = Math.min(1, 0.5 + t / 3) * (t < 10 ? 1 : (14 - t) / 4) + 1e-4;
    fx(out, "note", 128, 128, (p) => fxNote(p), toWorld(cam, P, sc, [x, y], 0.08), sz * SU * sc * g, sz * SU * sc * g, { rot: rad5(t, n) });
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
const puff = (out: Stage, w: V3, f: number, f0: number, dur = 9) => {
  const t = f - f0; if (t < 0 || t >= dur) return;
  const u = q(t / dur, 10);
  fx(out, `puff${u}`, 256, 128, (p) => fxPuff(p, u), [w[0], w[1] + 0.06, w[2]], 0.34, 0.17, { soft: true });
};

// ---------------- the raven ----------------
const RAVEN_SC = 0.42;
type RavenX = Partial<RavenOpts> & { lift?: number };
/** the raven at pos: idle head snaps every 0.7-1.6 s (1-frame turns), a hop and a wing ruffle now and then; ctl overrides */
const raven = (out: Stage, cam: CamInfo, f: number, pos: V3, ctl: RavenX = {}, id = 0) => {
  const P = 34, n = Math.floor(f / P), m = f - n * P;
  const ang = (k: number) => [-1, 0, 1, 0, -1, 1][Math.floor(hh(k + id * 17, 21) * 6)];
  const head = m < Math.round(14 * hh(n, 22)) ? ang(n - 1) : ang(n);
  const hm = mod(f, 97), hop = hm < 8 ? Math.sin((Math.PI * hm) / 8) : 0;
  const rm = mod(f + 50, 131), ruffle = rm < 10 ? Math.sin((Math.PI * rm) / 10) : 0;
  const o: RavenOpts = { head, hop: q(hop, 12), ruffle: q(ruffle, 12), blink: blinkAt(f, 99 + id), light: light2D(cam), ...ctl };
  o.hop = q(o.hop, 12); o.ruffle = q(o.ruffle, 12); if (o.wing !== undefined) o.wing = q(o.wing, 12);
  const [x, y, z] = pos, d = cam.pos.distanceTo(tmp.set(x, y + 0.3, z)) / RAVEN_SC;
  const [w, h, k] = tier(d);
  out.places.push({ key: `R|${fkey(o)}`, x, y: y + (ctl.lift ?? 0), z, scale: RAVEN_SC, draw: (p) => drawRaven(p, o), size: [w, h, k] });
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
const TURN1: [number, number] = [R1 + 2, BEAT.wanted - 3];
const hookPose = (cam: CamInfo, id: number, tau: number) => {
  const P = TH.woman, L = life(tau, A.woman.i);
  const e: Expr = id === 16 ? "read" : at(tau, W_EX1);
  let look = 0, lookY = 0, fdx = 0, fdy = 0, head = L.head * 0.7, facing: -1 | 0 | 1 = 0;
  let browUp: [number, number] | undefined;
  // "read one sign": a 4 f head turn of ~10 deg up toward the board's first line, held, then back
  const turnRead = id === 1 ? ramp(tau, R1 + 2, 4) * (1 - ramp(tau, BEAT.wanted - 9, 5)) : 0;
  if (e === "read") {
    let [gx, gy] = readGaze(tau);
    if (id === 1 && tau >= R1) { // 3 fixations left -> right along a line (9 f each), a 2 f return sweep, next line lower
      const m = mod(tau - R1, 29), k = Math.min(2, Math.floor(m / 9));
      gx = m >= 27 ? -0.1 : -0.6 + 0.55 * k; gy = -1.25 + 0.15 * Math.min(2, Math.floor((tau - R1) / 29));
    }
    look = gx; lookY = gy; fdy = -6.5; fdx = gx * 2.6; head -= 3 + 10 * turnRead; browUp = [0.6, 0.6];
    if (id === 1 && tau >= TURN1[0] && tau < TURN1[1]) { // A4: 3/4 over the shoulder, eyes up-left along the lines
      facing = -1; look = gx - 0.55; lookY = gy - 0.1; fdx = -5 + gx * 2; fdy = -7.5; browUp = [2.5, 1.5];
    }
  }
  else if (e === "proud") { lookY = 0.1; head += 3; }
  else if (e === "plot" || e === "think") { look = 0.55; lookY = -0.45; fdy = -2; facing = 1; head -= 1; browUp = [0, 4]; } // A4: a scheming one-sided smirk, the right brow up
  else { // shifty: the side-eye DOWN onto the sparkly rock at her lower right, a 6 deg head snap toward it (2 f, 1 f
    // overshoot), then one dart the other way ("anyone watching?") and back
    const r = sideOf(cam, P, TH.glintRock), S1 = BEAT.steal1 - 2, k = ramp(tau, S1, 2);
    const dart = tau >= BEAT.steal1 + 4 && tau < BEAT.steal1 + 7;
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
  const chin = id === 1 ? ramp(tau, PW(2) - 1, 6) : 0;
  // the chin rub: the ball hand at the JAW'S SIDE (30 % of the head width toward screen right), elbow bent out, a
  // 2 px finger-tap bob every 8 f
  // A4: the ball hand sits IN FRONT of the face at the jaw corner (+32 % / +38 % of the head width from the face
  // centre, on skin, never on the dark bob), drawn on the top layer, with a 2 px finger tap every 8 f
  const tap = chin > 0.9 ? 2.2 * (mod(Math.floor((tau - PW(2) - 4) / 4), 2) ? 1 : 0) : 0;
  const hands: [Hand, Hand] = [{ a: "strap", dy: id === 1 ? 1.2 * Math.sin(TAU * tau / 24) : 0 },
    chin > 0 ? { a: "hang", b: "chin", k: chin, dx: 26 * chin, dy: (-7 - tap) * chin, bend: 1.7, over: chin > 0.6 } : { a: "hang", b: "chest", k: chest }];
  // blinks: one across each expression swap (2 f before it, so every new face is open ON its word) + idle ones
  const blink = id === 16 ? 0 : blinkList(tau, [20, BEAT.paperclip - 4, R1 - 2, TURN1[0] - 1, TURN1[1] - 1, PW(2) - 2, BEAT.steal1 - 5, 136]);
  const w = wnd(tau, P[0], P[2]), fl = flutAt(tau, 1);
  put(out, cam, a, P, {
    expr: W0.e, look: W0.look, lookY: W0.lookY, blink, facing: W0.facing,
    breath: W0.L.breath * 1.45, tilt: W0.L.sway * 1.25 + 0.7 * W0.L.shift, shift: W0.L.shift, headTilt: W0.head,
    face: { fdx: W0.fdx, fdy: W0.fdy, browUp: W0.browUp }, hatLag: 1.0 * (Wb.head - W0.head) + 1.6 * flutAt(tau - 2, 1), hairSwing: 1.2 * (Wc.head - W0.head) + 2.4 * w + 1.2 * fl,
    wind: w, flutter: fl, hands,
  });
};

/** back-view reading head: saccades along a line (5-6 deg jumps every ~9 f, left -> right), then a return sweep */
const scanHead = (f: number, i: number) => { const m = mod(f + Math.floor(hh(i, 7) * 30), 38), k = Math.min(3, Math.floor(m / 9)); return m >= 36 ? -4 : -8 + 5.5 * k; };
/** A3 back-view reading head for shot 4: +-3 deg left -> right once per sign line (22 f, the same clock as `scan`) */
const lineHead = (f: number, f0: number) => { const m = mod(f - f0, 22); return m >= 20 ? 3 - 6 * ((m - 20) / 2) : -3 + 6 * (m / 20); };
/** shot 5: he stands beside her, A3: 0.12 m further right so their face outlines keep a 30-50 px gap (the whisper
 *  paddle sits in it; LEAD: CAMS[5] look x +0.09, pos x +0.06); shot 6: 0.25 m right so the rock is not under him */
const FI5: V3 = [TH.fiance[0] + 0.18, 0, TH.fiance[2]], FI6: V3 = [TH.fiance[0] + 0.25, 0, TH.fiance[2]];
/** glasses pop on a shock: up 3 f (u), a 2 f overshoot below, settled */
const gPop = (f: number, f0: number) => { const t = Math.floor(f - f0); return t < 0 ? 0 : t < 3 ? [2, 3.2, 3][t] : t < 5 ? [-1, -0.5][t - 3] : 0; };
/** shot 4 turn windows (A3): [front start, front end); a 3 f back-3/4 drawing before and after each; after the last
 *  one they stay 3/4 toward the board (faces partly readable on "piece at a time"). He turns 3 f after her */
const turns4 = (who: 0 | 1) => {
  const d = who ? 3 : 0;
  return [[BEAT.vandalized - 2 + d, BEAT.vandalized + 24 + d], [BEAT.tons14 - 2 + d, BEAT.piece + 16 + d]] as [number, number][]; // A4: faces stay on "a small piece"
};
/** the view state in shot 4: "front" (turned to the partner), "q" (back 3/4 in-between / after), "back" */
const view4 = (f: number, who: 0 | 1): "front" | "q" | "back" => {
  const T = turns4(who);
  for (const [a, b] of T) { if (f >= a && f < b) return "front"; if ((f >= a - 3 && f < a) || (f >= b && f < b + 3)) return "q"; }
  return f >= T[1][1] ? "q" : "back";
};
/** the glinting chip left of her feet on "a small piece at a time" (clear of both of them, below the caption) */
const PIECE4: V3 = [0.45, 0, 2.5]; // (projected: in front of them, right of the sage, below the caption band)
/** the woman + fiance in shots 4-6 (the sign, the whisper, the mystery) */
const woman = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = A.woman, P = TH.woman, i = a.i, F = id === 5 ? FI5 : id === 6 ? FI6 : TH.fiance, w = wnd(f, P[0], P[2]), fl = flutAt(f, i, P[0], P[2]);
  if (id === 4) {
    // A4: reading from behind (head scans +-4 deg per line with a small chin dip per line, a chin lift on "Your", points
    // at the board on "warning" AND on "VANDALIZED", brim / hem / hair in the wind); on "vandalized" she turns 3/4 to
    // him with her eyes UP-RIGHT on the board, head tipped back, brows up (closed mouth, 8 f), THEN the "o"; on "14"
    // wide -> worry with BOTH ball hands on her cheeks (classic worry: the arms stay outside the face), a snap to the
    // counter; on "piece" her eyes drop to the glinting chip and her mouth curls into a small one-sided smirk with one
    // brow up (the idea forming, 12 f) while he stays worried on her; both turn back to the board after it
    const [[A1]] = turns4(0), v = view4(f, 0), L = life(f, i), side = sideOf(cam, P, F), V = BEAT.vandalized;
    const T2a = BEAT.tons14 - 2;
    if (v === "front") {
      const turn1 = f < V + 24;
      const idea = !turn1 && f >= BEAT.piece - 1;
      const e: Expr = turn1 ? (f < V + 8 ? "read" : "browsUp") : f < BEAT.tons14 + 20 ? "wide" : idea ? "plot" : "worry";
      const mk = !turn1 && !idea ? clamp01(settle(f, BEAT.tons14 + 18, 6)) - 0.15 * bump(f, BEAT.tons14 + 16, 2) : idea ? 1 - ramp(f, BEAT.piece - 1, 5) : 0; // 2 f dip, then up to the cheeks
      const cheek = (s: number): Hand => ({ a: "hang", b: "temple", k: clamp01(mk), dx: -s * 3 * clamp01(mk), dy: 22 * clamp01(mk), bend: 1.3, maxLen: 1.3 });
      const hands: [Hand, Hand] = mk > 0.02 ? [cheek(-1), cheek(1)] : side > 0 ? [{ a: "hang", dy: 3 * bump(f, BEAT.tons14 + 16, 2) }, { a: "strap" }] : [{ a: "strap" }, { a: "hang", dy: 3 * bump(f, BEAT.tons14 + 16, 2) }];
      const t0 = turn1 ? A1 : T2a;
      let look = side * 1.25, lookY = 0.05, nod = 0, fdy = 0, head = 0;
      let browUp: [number, number] | undefined;
      if (turn1 && f < V + 14) { look = side * 0.75; lookY = -1.15; nod = -0.55; fdy = -5; head = -side * 6; browUp = [4, 4]; } // UP-RIGHT at the board, head back
      if (!turn1 && f >= BEAT.tons14 + 21 && f < BEAT.tons14 + 30) { look = sideOf(cam, P, [TH.flip.x, TH.flip.y, TH.flip.z]) * 1.3; lookY = -0.2; } // snap to the counter
      if (idea) { const cs = sideOf(cam, P, PIECE4); look = cs * 0.8; lookY = 1.0; fdy = 2; browUp = cs > 0 ? [0, 5] : [5, 0]; head = cs * 3; } // down at the glinting chip
      put(out, cam, a, P, { ...idle(f, i, P), tilt: L.sway * 1.2 + 0.8 * L.shift, expr: e, facing: side, look, lookY, nod, face: { fdy, browUp },
        headTilt: L.head * 0.6 + head + (turn1 && f < V + 14 ? side * 5 : 0),
        blink: blinkAt(f, i, [A1 - 1, T2a - 1, BEAT.piece - 2], [A1, T2a, BEAT.tons14 + 20]),
        hatLag: 6 * bump(f, t0, 5) + 2.4 * fl, hairSwing: 6 * bump(f, t0, 6) + 3 * w + 2 * fl, wind: w, flutter: fl, hands });
    } else {
      // back / back-3/4: the head scans the lines; chin lift on "Your"; the outer arm points at the board on "warning"
      // and again on "VANDALIZED" (A4)
      const q3 = v === "q", late = f >= BEAT.piece + 14;
      const dip = 6 * bump(f, BEAT.piece + 14, 14), pz = sideOf(cam, P, PIECE4);
      const pt = Math.max(ramp(f, BEAT.warning, 4) * (1 - ramp(f, BEAT.your + 2, 5)), ramp(f, V - 9, 3) * (1 - ramp(f, V - 4, 2)));
      const out_ = side > 0 ? 0 : 1;
      const ptH: Hand = { a: "hang", b: "up", k: pt, dx: (out_ ? 1 : -1) * 30 * pt, dy: 14 * pt, over: true, shape: "mitten", sz: 0.24, maxLen: 1.5, ang: (out_ ? 1 : -1) * 20 };
      const ant = -3 * bump(f, A1 - 4, 4) * (q3 ? 1 : 0);  // anticipation dip before the turn
      const lineN = clamp(Math.floor((f - BEAT.your) / 22), 0, 5);
      put(out, cam, a, P, { view: "back", facing: q3 ? side : 0, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * L.shift, shift: L.shift,
        nod: -0.7 * bump(f, BEAT.your - 2, 14) + 0.25 * bump(f, A1 - 4, 4) + (f >= BEAT.your && f < V ? 0.12 * lineN : 0),
        headTilt: L.head * 0.5 + (late ? 0 : 1.35 * lineHead(f, BEAT.your)) + pz * dip + ant, wind: w, flutter: fl,
        hatLag: 3.4 * fl + (q3 ? -3 * side : 0), hairSwing: 4 * w + 3 * fl, lookY: 0.4,
        hands: pt > 0.02 ? (out_ ? [{ a: "strap" }, ptH] : [ptH, { a: "strap" }]) : [{ a: "strap" }, { a: "hang" }] });
    }
    // the chip that glints on "a small piece at a time"
    fx(out, "chip4", 96, 96, (p) => fxChip(p, 12, false), [PIECE4[0], GY + 0.035, PIECE4[2]], 0.09, 0.08);
    glintAt(out, [PIECE4[0], GY + 0.1, PIECE4[2] + 0.02], f, BEAT.piece, 0.3, 10);
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
    let look = reading ? -1.2 + 0.45 * (Math.floor(f / 4) % 2) : side * (0.5 + 0.8 * ramp(f, BEAT.leaned + 14, 3)); // saccade to him on "to her"
    let lookY = reading ? -1.05 : 0.1;
    const whis = f >= WS + 5 && f < BEAT.nowEnd + 2;
    if (whis) { look = side * 1.3; lookY = 0.2; }
    if (e === "shifty") { look = f < WS - 1 ? -side * 1.35 : side * 1.35; lookY = f < WS - 1 ? 0 : -0.25; }  // anyone watching? left, then over his shoulder
    const turn = whis ? ramp(f, WS + 5, 3) : 0;
    const bob = 0.6 * bump(f, PW(10, "better"), 3);
    const headT = L.head * 0.5 - (reading ? 6 : 0) + side * 4 * lean + side * (4 + 3 * turn) * ramp(f, BEAT.leaned + 14, 4) * (1 - ramp(f, BEAT.nowEnd, 6))
      + (e === "shifty" ? (f < WS - 1 ? -side * 4 : side * 3) : 0);
    const tug = -2.5 * bump(mod(f, 12), 0, 4);                            // the free hand tugs the camera strap every 12 f
    const brows: [number, number] | undefined = reading ? [3, 3] : f >= OURS - 1 && f < OURS + 7 ? [4, 4] : undefined;
    const opts: PersonOpts = {
      expr: e, look, lookY, blink: blinkAt(f, i, [...swapsOf(ex), PW(9, "fiancé,") + 3, PW(10, "get"), BEAT.leaned + 21, BEAT.whisper + 13], [OURS - 1]), talk, nod: bob,
      facing: reading ? 0 : side, breath: L.breath * 1.3, tilt: L.sway * 1.35 + side * 10 * lean, headTilt: headT, shift: L.shift,
      face: reading ? { fdy: -5, fdx: -3, browUp: brows } : { fdx: side * 6 * turn, browUp: brows }, hatLag: side * 9 * (lean2 - lean) - side * 18 * clamp01(lean) + 2.6 * fl,
      hairSwing: side * 7 * (lean2 - lean) + 2.5 * w + 2.5 * fl, wind: w, flutter: fl + 0.8 * (lean2 - lean),
      hands: [{ a: "strap", dy: tug }, hm > 0.02 ? { a: "hang", b: "whisper", k: clamp01(hm), dy: hDy, shape: "mitten", split: true, ang: side * 5, sz: 0.36 } : { a: "hang", dy: hDy }],
    };
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
    // A3: from behind she POINTS up-right at the "EVERY DAY" line (the arm and a big mitten drawn OVER the hat, 3 jabs),
    // scratches the hat crown in 3 strokes (the hand outside the head silhouette, the hat tipping +-5 deg each), then
    // tilts her head hard on "steal?". If the lens comes round to her face (LEAD's front arc), she acts with it:
    // thoughtful brows-up on "honest", a guilty side-glance at the glint rock on "steal?"
    const L = life(f, i), side = sideOf(cam, P, F), front = cam.pos.z < P[2] - 0.3;
    const pt = ramp(f, BEAT.but + 12, 5) * (1 - ramp(f, BEAT.honest - 8, 6));
    const jab = pt > 0.5 ? 3.4 * bump(mod(f - (BEAT.but + 17), 10), 0, 4) : 0;
    const sc = ramp(f, BEAT.honest - 3, 3) * (1 - ramp(f, BEAT.honest + 15, 4));
    const stroke = sc > 0 ? Math.sin(((f - (BEAT.honest - 3)) / 5) * Math.PI) : 0;
    const t2 = settle(f, BEAT.steal2 - 2, 6), tilt2 = 13 * t2;
    const hand: Hand = pt > 0.02 ? { a: "hang", b: "up", k: pt, dx: (48 + 0.52 * jab) * pt, dy: (9 - 0.85 * jab) * pt, maxLen: 1.6, over: true, shape: "mitten", sz: 0.32, ang: 25 }
      : sc > 0.02 ? { a: "hang", b: "head", k: sc, dx: 2.5 * stroke * sc, dy: -25 * sc, maxLen: 1.4, over: true, shape: "mitten", sz: 0.22, ang: -60 } : { a: "hang" };
    const late = clamp01((f - (BEAT.but + 6)) / 50);
    if (front) {
      const ex: K<Expr>[] = [[0, "read"], [BEAT.honest - 2, "think"], [BEAT.steal2 - 2, "shifty"]], e = at(f, ex), rk = sideOf(cam, P, TH.glintRock);
      put(out, cam, a, P, { ...idle(f, i, P), expr: e, facing: e === "shifty" ? rk : 0, look: e === "shifty" ? rk * 1.25 : e === "read" ? -0.3 + 0.3 * (Math.floor(f / 7) % 3) : 0.5,
        lookY: e === "shifty" ? 0.8 : -1, face: { fdy: e === "shifty" ? 2 : -5 }, blink: blinkAt(f, i, swapsOf(ex)), wind: w, flutter: fl, hatLag: 2 * fl,
        rim: late > 0.2 ? "#ffb070" : undefined, rimK: q(late, 5), hands: [{ a: "strap" }, e === "think" ? { a: "hang", b: "chin", k: ramp(f, BEAT.honest - 2, 5), dx: 20 } : { a: "hang" }] });
      return;
    }
    // A4: on "steal?" her head turns 3/4 over her shoulder (one white side-eye) DOWN onto the rainbow rock by her feet,
    // held 14 f, then back (the honest woman is tempted too); a bold glint answers on the rock
    const rk6 = sideOf(cam, P, TH.glintRock), peek6 = f >= BEAT.steal2 - 3 && f < BEAT.steal2 + 11;
    put(out, cam, a, P, { view: "back", facing: peek6 ? rk6 : 0, lookY: peek6 ? 1.1 : 0, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * L.shift, shift: L.shift,
      headTilt: L.head - 4 * ramp(f, BEAT.honest, 10) * (1 - t2) + stroke * 3 * sc - side * tilt2 * 0.4 + (peek6 ? rk6 * 5 : 0) + scanHead(f, i) * 0.6 * (1 - pt) * (1 - sc) * (1 - t2),
      hatLag: -4 * bump(f, BEAT.steal2 - 2, 6) + stroke * 5 * sc + 2 * fl, wind: w, flutter: fl, hairSwing: 3.5 * w + 2 * fl,
      rim: late > 0.2 ? "#ffb070" : undefined, rimK: q(late, 5), hands: [{ a: "strap" }, hand] });
  }
};

const fiance = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const a = A.fiance, i = a.i, W = TH.woman;
  const P: V3 = id === 5 ? FI5 : id === 6 ? FI6 : TH.fiance;
  const w = wnd(f, P[0], P[2]);
  const straps = (dy = 0, fid = 0): [Hand, Hand] => [{ a: "strap", dx: -14, dy: dy + 1.5 * w }, { a: "strap", dx: 30 + fid, dy: dy - 1.5 * w - Math.abs(fid) * 0.4 }];
  if (id === 4) {
    // A3: turns 3 f after her (3/4 in-betweens), a GASP on "14" (wide dot eyes, brows up, a small "o": the goggles +
    // sweat stay exclusive to "now"), pushes his glasses up with one finger, looks to her; from behind: line scans, a
    // backpack hitch, a 2 deg lean toward her
    const [[A1], [T2a]] = turns4(1), v = view4(f, 1), L = life(f, i), side = sideOf(cam, P, W);
    if (v === "front") {
      const turn1 = f < BEAT.vandalized + 27;
      const gulp = bump(f, BEAT.tons14 + 2, 5), push = !turn1 && f >= BEAT.tons14 + 1 && f < BEAT.tons14 + 7;
      const hands: [Hand, Hand] = push ? [{ a: "eye", dx: -side * 10, dy: -8, bend: 1.4 }, straps()[1]] : straps();
      let look = side, lookY = 0, fdy = 0, hT = 0;
      if (turn1 && f < BEAT.vandalized + 12) { look = side * 1.25; lookY = 0.05; hT = side * 4; }          // A4: his eyes on HER face, head tipped toward her
      else if (turn1) { look = -side * 0.3; lookY = -0.8; fdy = -3; }
      else if (f < BEAT.tons14 + 33) { look = sideOf(cam, P, [TH.flip.x, TH.flip.y, TH.flip.z]) * 1.2; lookY = 0.1; }
      else { look = side * 1.1; lookY = 0; }                                                               // to her
      put(out, cam, a, P, { ...idle(f, i, P), expr: turn1 ? (f < BEAT.vandalized + 11 ? "listen" : "browsUp") : f < BEAT.tons14 + 33 ? "gasp" : "worry", facing: side, look, lookY, squash: gulp * 0.6,
        headTilt: life(f, i).head * 0.6 + hT,
        blink: blinkAt(f, i, [A1 - 1, T2a - 1, BEAT.tons14 + 32], [A1, T2a]),
        face: { fdy, glint: f >= BEAT.vandalized && f < BEAT.vandalized + 2 ? 1 : 0, glassDy: !turn1 ? gPop(f, T2a) + (push ? 2 : 0) : 0 }, hands });
    } else {
      const q3 = v === "q", hitch = bump(f, BEAT.warning - 8, 6), shiftK = f >= BEAT.your + 16 && f < BEAT.vandalized + 14 ? -1 : L.shift;
      const leanH = 2 * ramp(f, BEAT.your + 4, 6) * (1 - ramp(f, BEAT.vandalized - 2, 4));
      const peek = f >= BEAT.vandalized - 13 && f < BEAT.vandalized - 5;                                   // A4: a glance over to her mid-read
      put(out, cam, a, P, { view: "back", facing: q3 || peek ? side : 0, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * shiftK + side * leanH, shift: shiftK,
        headTilt: L.head * 0.5 + (f >= BEAT.piece - 2 ? 0 : 1.3 * lineHead(f + 5, BEAT.your)) - 2 + side * 2 * leanH + (peek ? side * 5 : 0), squash: -0.5 * hitch + 0.25 * L.breath, wind: w, lookY: 0.3,
        hands: [{ a: "hang", dy: -4 * hitch }, { a: "hang", dy: -4 * hitch }] }, { rise: 0.012 * hitch });
    }
    return;
  }
  if (id === 5) {
    // read -> listen -> a QUIET unease (half-lids, knitted brows) -> on "now" the goggle-shock jump (eyes 1.4x, brows up,
    // glasses pop 3 f and settle, grid-teeth) + sweat drop; his eyes dart down to the rock between them before "ours";
    // A3: his thumbs tap the straps from the start of the lean, blinks, a carabiner and a water bottle on the pack
    const OURS = PW(10, "ours");
    const ex: K<Expr>[] = [[0, "read"], [BEAT.leaned + 2, "listen"], [BEAT.whisper + 4, "uneasy"], [BEAT.now - 2, "goggle"], [BEAT.nowEnd + 10, "worry"]];
    const e = at(f, ex), side = sideOf(cam, P, W), L = life(f, i);
    const jolt = f >= BEAT.now - 2 ? settle(f, BEAT.now - 2, 6) : 0, sq = bump(f, BEAT.now - 3, 3), gulp = bump(f, BEAT.now + 4, 5);
    const lean = ramp(f, BEAT.whispered, 8) * (1 - jolt);
    const FIA = PW(9, "fiancé,");
    let look = e === "read" ? scan(f + 9) * 0.6 : side * (f >= BEAT.leaned + 4 ? 1.2 : 0.5), lookY = e === "read" ? -1 : 0; // A4: his eyes slide to her as she leans in
    if (e === "listen" && f >= FIA && f < FIA + 8) look = side * 1.3;                 // eyes flick to her on "fiance," and back
    if (f >= OURS - 6 && f < OURS - 2) { look = side * 0.6; lookY = 1; }               // down at the rock between them
    if (e === "goggle") { const tl = f - BEAT.now; look = tl < 10 ? side * 1.1 : tl < 16 ? 0 : side * 0.9; lookY = tl < 10 ? 0.45 : 0; } // her mouth, then the lens
    const fid = f >= BEAT.leaned + 10 && f < BEAT.now - 2 ? 5 * Math.sin(f * 1.3) : 0;
    const tip = f >= BEAT.leaned + 4 ? side * 4 * ramp(f, BEAT.leaned + 4, 4) : 0, away = -side * 1.8 * ramp(f, BEAT.whisper + 7, 5) * (1 - jolt); // A4: tips toward her, ear in, then a small lean-away
    put(out, cam, a, P, {
      expr: e, look, lookY, blink: e === "goggle" ? 0 : blinkAt(f, i, [...swapsOf(ex).filter((x) => x !== BEAT.now - 2), FIA + 3, PW(10, "get"), BEAT.whispered + 2], [BEAT.now - 2]),
      facing: e === "read" ? 0 : side, breath: L.breath * 1.5, squash: sq + 0.5 * gulp, shift: L.shift,
      tilt: L.sway * 1.3 + 0.6 * L.shift + side * 5 * lean - side * 4 * jolt + away, headTilt: L.head * 0.6 + tip + side * 5 * lean - side * 4 * jolt + 2 * away,
      face: { fdy: e === "read" ? -5 : 0, glint: f >= BEAT.now - 2 && f < BEAT.now ? 1 : 0.35 * jolt, glassDy: e === "goggle" ? gPop(f, BEAT.now - 2) : 0 },
      wind: w, flutter: clamp(flutAt(f, i, P[0], P[2]) + 1.6 * bump(f, BEAT.now - 2, 10) * Math.sin((f - BEAT.now) * 1.3), -1, 1), hands: straps(-6 * jolt, fid), // A4: straps / bottle / carabiner jolt on the shock
    });
    sweat(out, cam, P, side, f, BEAT.now - 1, 1e9, 26, 290, 92); // on the temple toward her, outside the head outline
    return;
  }
  if (id === 6) {
    // back view; on "honest" he turns to a 3/4 REAR profile toward her (glasses temple + lens edge, a white-rimmed
    // side-eye, a 25 % cheek crescent) for 18 f
    const L = life(f, i), side = sideOf(cam, P, W);
    const glance = f >= BEAT.honest - 2 && f < BEAT.honest + 18;
    const late = clamp01((f - (BEAT.but + 6)) / 50);
    put(out, cam, a, P, { view: "back", facing: glance ? side : 0, breath: L.breath * 1.3, tilt: L.sway * 1.3 + 0.8 * L.shift, shift: L.shift, lookY: 0.2,
      headTilt: L.head + (glance ? side * 7 : scanHead(f, i) * 0.6), wind: wnd(f, P[0], P[2]), hands: [{ a: "hang" }, { a: "hang" }],
      rim: late > 0.2 ? "#ffb070" : undefined, rimK: q(late, 5) });
  }
};

/** shot 1 effects: the paperclip thought bubble (out on "Then" so the sign reads) and the glint on the sparkly rock */
const hookFx = (out: Stage, f: number) => {
  const pop = (t0: number, t1: number) => (f < t0 || f > t1 ? 0 : f - t0 < 2 ? [0.55, 1.1][Math.floor(f - t0)] : t1 - f < 2 ? [0.5, 0.85][Math.floor(t1 - f)] : 1); // floor: the picture clock is fractional (voice time-map)
  const k = pop(BEAT.paperclip - 1, BEAT.sign1 - 4); // A3: ~38 f full hold, out 4 f before "sign..." (the clean board)
  // the bubble animates on 2s (her arm pushes the big bowed paperclip, his arms bob, a twinkle every 6 f)
  const st = Math.max(0, Math.floor((f - BEAT.paperclip) / 2) * 2);
  // over the board's top-right (it covers at most lines 1-2, never "14 TONS"), tail toward her head
  // A4: 15 % smaller and ~40 px up / right (lines 4-6 stay clear, the top clears the raven); its tail is 3 world dots
  // (r 16 / 11 / 7 px at 1080) from the cloud's lower-left down to just above her hat crown, so the memory is HERS
  const BC: V3 = [TH.woman[0] + 0.11, 2.5, TH.woman[2] + 0.02], BW = 0.757, BH = 0.607;
  if (k > 0) {
    fx(out, `bubbleClip${st}`, 1000, 800, (p) => fxBubbleClip(p, st, false), BC, BW * k, BH * k);
    const t0: V3 = [BC[0] - 0.16 * BW, BC[1] - 0.24 * BH, BC[2] + 0.01], t1: V3 = [TH.woman[0] + 0.05, 1.83, TH.woman[2] + 0.05];
    ([[0.22, 0.05], [0.55, 0.034], [0.85, 0.022]] as [number, number][]).forEach(([u, d], j) => {
      const kj = clamp01((f - (BEAT.paperclip - 1) - j) / 1.5) * (k < 1 ? k : 1); // they pop in one per frame after the cloud
      if (kj > 0) fx(out, "tailDot", 128, 128, (p) => fxTailDot(p), [t0[0] + (t1[0] - t0[0]) * u, t0[1] + (t1[1] - t0[1]) * u, t0[2] + (t1[2] - t0[2]) * u], d * kj, d * kj * 0.88);
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
    if (tau >= 28 && tau < 39) { const k = tau - 28; c.ruffle = k < 7 ? 1.5 * Math.sin((Math.PI * Math.min(k, 3.5)) / 7) : k < 9 ? -0.25 : 0; c.wing = k < 7 ? 0.35 * Math.sin((Math.PI * k) / 7) : 0; }
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
    if (f < BEAT.warning - 2) { const pk = mod(f, 9); c.head = 0; c.dip = pk < 3 ? 1 : pk < 5 ? 0.4 : 0; } // A3: pecks at a chip on the rail
    if (f >= BEAT.warning && f < BEAT.warning + 9) c.hop = 1.6 * Math.sin((Math.PI * (f - BEAT.warning)) / 9);
    if (f >= BEAT.vandalized && f < BEAT.vandalized + 10) c.ruffle = Math.sin((Math.PI * (f - BEAT.vandalized)) / 10);
    if (f >= BEAT.tons14 - 1 && f < BEAT.tons14 + 22) { c.head = sideOf(cam, R, [TH.flip.x, TH.flip.y, TH.flip.z]); c.dip = 1; }
    else if (f >= BEAT.tons14 + 22 && f < BEAT.piece + 6) c.head = 0;
    else if (f >= BEAT.piece + 6) { c.head = sideOf(cam, R, TH.woman); c.dip = 0.6; c.cock = 14 * c.head; }
    if (f >= BEAT.piece + 6 && f < BEAT.piece + 16) c.ruffle = Math.sin((Math.PI * (f - BEAT.piece - 6)) / 10);
  }
  if (id === 6) {
    // mirrors her: cocks its head when she tilts on "steal?" (3 f later), then peers down at the text; ruffles as the
    // tumbleweed rolls past
    if (f >= 604 && f < 614) c.ruffle = Math.sin((Math.PI * (f - 604)) / 10);
    if (f >= 567 && f < 580) { c.cock = 20; c.head = 0; }
    if (f >= BEAT.steal2 + 1) { c.cock = -sideOf(cam, R, TH.woman) * 22 * clamp01(settle(f, BEAT.steal2 + 1, 6)); c.head = 0; }
    if (f >= BEAT.steal2 + 9) { c.dip = 1; c.head = sideOf(cam, R, TH.woman); }
    if (f >= BEAT.but + 14 && f < BEAT.honest - 6) { c.dip = 0.7; c.head = sideOf(cam, R, TH.woman); }
  }
  // A3: in shot 6 the raven sidesteps ~0.2 m along the top rail toward the couple (two hops)
  const R6: V3 = id === 6 ? [R[0] - 0.1 * (smooth((f - BEAT.but - 10) / 4) + smooth((f - BEAT.but - 18) / 4)), R[1], R[2]] : R;
  if (id === 6 && ((f >= BEAT.but + 10 && f < BEAT.but + 14) || (f >= BEAT.but + 18 && f < BEAT.but + 22))) c.hop = 0.3 * bump(mod(f - BEAT.but - 10, 8), 0, 4);
  raven(out, cam, f, R6, c);
  if (id === 6) { const t = f - (BEAT.steal2 + 3); if (t >= 0 && t < 18) {
    fx(out, "feather", 128, 128, (p) => fxFeather(p), [R6[0] - 0.05 + 0.06 * Math.sin(t * 0.55), R6[1] + 0.2 - 0.04 * t, R6[2] + 0.1], 0.07, 0.07, { rot: 0.7 * Math.sin(t * 0.45) }); } }
};
/** shot 5 raven: drops from the board top to the right post at 1.8 m (in frame, between the couple, above their
 *  heads), flapping; a 2 f head snap + 12 deg cock toward them on the whisper, a ruffle on "now" */
const whisperRaven = (out: Stage, cam: CamInfo, f: number) => {
  const top = PERCH, low: V3 = [TH.posts[1], 1.8, 0.1], d0 = 464, k = clamp01((f - d0) / 7);
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
    const x = x0 + (n ? 0.25 : -0.5) * (tau / FPS), p: V3 = [x, 0, z], photo = n === 1 && tau >= 22 && tau < 44;
    // they chat as they stroll: head turns toward each other every ~0.8 s (loop clock), then back to the logs
    const chat = mod(Math.floor((tau + 300 + n * 11) / 24), 2) === 1, toward = n ? 1 : -1;
    put(out, cam, a, p, { ...idle(tau, a.i, p), mode: photo ? "stand" : "walk", phase: x / 1.0 + n * 0.3, facing: chat ? (toward as -1 | 1) : (n ? 1 : -1), expr: photo ? "focus" : chat ? "grin" : n ? "smile" : "calm",
      look: chat ? toward * 1.2 : 0.7, headTilt: (chat ? toward * 5 : 0) + life(tau, a.i).head, blink: blinkAt(tau, a.i), flutter: flutAt(tau, a.i),
      hands: photo ? [{ a: "eye", hold: "camera" }, { a: "eye", dx: 4 }] : [{ a: "hang" }, n ? (tau >= 68 && tau < 86 ? { a: "point", dy: -14 + 3 * Math.sin(tau * 0.5) } : { a: "hang" }) : { a: "point", dy: -8 }] }, { rise: 0 });
    if (photo) flash(out, toWorld(cam, p, 1, [300, 300], 0.2), tau, 30, 2, 0.4);
  });
  walker(out, cam, A.ranger, tau, 0, [3.0, 0, -22], 1, 0, 0.55);
};
/** background gaze: cycles through targets [look, lookY, facing] every 40-60 f (own phase), never the lens */
const gazeCycle = (f: number, i: number, tg: [number, number, -1 | 0 | 1][]) =>
  tg[mod(Math.floor((f + hh(i, 8) * 50) / (40 + 20 * hh(i, 9))), tg.length)];

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
  const pat = f >= TW2 + 2 && f < TW2 + 12 ? 5 * Math.abs(Math.sin(((f - TW2 - 2) / 5) * Math.PI)) : 0;
  const drop = ramp(f, TW2 + 14, 8);
  const ex: K<Expr>[] = [[-999, "calm"], [SH0, "shifty"], [ST - 2, "smirk"], [TW2 - 2, "shock"], [TW2 + 5, "sheepish"], [TW2 + 10, "dotSmirk"]];
  const e = at(f, ex), L = life(f, i);
  // the toss: the chip hops ~5 cm off his fingers and is caught (a 3 f catch dip)
  const T0 = BEAT.soSome + 6, tu = clamp01((f - T0) / 8), toss = f >= T0 && f < T0 + 8 ? 0.05 * 4 * tu * (1 - tu) : 0, catchDip = 3 * bump(f, T0 + 8, 3);
  let look = 0, lookY = 0.7, head = L.head * 0.6;
  if (e === "calm") { look = -0.8; lookY = 0.6 - 0.8 * (toss / 0.05); }                         // his eyes ride the toss
  if (e === "shifty") { const dl = Math.floor((f - SH0) / 5) % 2 ? 1.25 : -1.25; look = dl; lookY = 0.1; head += dl * 4; }
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
  const free: Hand = shrug > 0.05 ? { a: "hip", b: "raise", k: clamp01(shrug), dy: 16, dx: 6, shape: "palm", sz: 0.22 } : { a: "hip" };
  const opts = put(out, cam, a, P, { expr: e, look, lookY, blink: blinkAt(f, i, [T0 - 6, SH0 - 1, ST - 3, TW2 + 5, TW2 + 10], [TW2 - 2]),
    breath: L.breath * 1.4, tilt: L.sway * 1.7 + 1.3 * L.shift + hipPop, shift: clamp(L.shift * 1.5 + hipPop / 4, -1, 1),
    headTilt: head, wind: w, flutter: flutAt(f, i, P[0], P[2]), bulge: ramp(f, IN1, 4), squash: 0.35 * bump(f, ST - 10, 3) + 0.45 * shrug,
    face: { browUp: e === "shock" ? [6, 6] : e === "sheepish" ? [2, 0] : undefined, blush: e === "sheepish" ? 0.9 : 0 }, hands: [hand, free] }, { rise: T15_RISE });
  // the chip + tag (one card while in the hand; then the chip slides into the pocket while the tag stands out of it)
  const n = f >= FL0 + 2 ? 2 : 1;
  const tint = "rgba(70,30,80,0.12)", r = cam.right, CW = 0.56, TWd = 0.39, TH2 = TWd / 2;
  const hd = handAt(a.o, { ...opts, hands: [{ ...hand }, null] }, 0);
  const wp = toWorld(cam, Pr, 1, [hd[0] + 95, hd[1] - 30], 0.06);
  wp[1] += toss;
  if (f < IN0) {
    fx(out, `chiptag${n}`, 1024, 512, (p) => { fxChipTag(p, n, true); tintCard(p, 1024, 512, tint); }, wp, CW, CW / 2);
    glintAt(out, [wp[0] - r.x * 0.19, wp[1] + 0.05, wp[2] - r.z * 0.19], f, T0 + 3, 0.22, 8);
  } else {
    // the pocket's top-right corner (the eyelet's anchor): the tag sticks out sideways from it (its centre at the
    // eyelet's height, so its top clears his chin and its bottom clears the caption band), wobbling about the eyelet
    const R0 = rig(a.o, { ...opts, hands: [{ a: "chestPocket" }, null] }), px = R0.tcx - 0.45 * R0.T.a, py = R0.chin + 0.3 * R0.HH, u = R0.u;
    const piv = toWorld(cam, Pr, 1, R0.fin([px + 11 * u, py - 9 * u]), 0.07);
    const tk = f - (FL0 + 3), swing = tk >= 0 ? 0.13 * Math.exp(-tk / 5) * Math.sin((TAU * tk) / 10) : 0;
    const ang = (0.03 * w + 0.025 * Math.sin(TAU * 0.4 * (f / FPS))) * smooth(inK) + swing + 0.02 * (pat / 5);
    const up0 = 1 - smooth(inK), ox = TWd * 0.5 + 0.02, oy = 0.028 - 0.04 * up0;
    const rot2 = (x: number, y: number): [number, number] => [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)];
    const [cx, cy] = rot2(ox, oy);
    const c: V3 = [piv[0] + r.x * cx, piv[1] + cy, piv[2] + r.z * cx];
    fx(out, `tag${n}`, 768, 384, (p) => { fxTag(p, n, true, true); tintCard(p, 768, 384, tint); }, c, TWd, TH2, { rot: ang });
    // the split-flap number card over the slot: it squashes shut on "1", swaps, and opens on "2" with an overshoot
    const fk = Math.floor(f - FL0), sy = fk === 0 ? 0.55 : fk === 1 ? 0.12 : fk === 2 ? 0.35 : fk === 3 ? 1.12 : 1;
    const [fxo, fyo] = rot2(0.3333 * TWd, 0), tw = toward(cam, c);
    const fc: V3 = [c[0] + r.x * fxo + tw[0] * 0.004, c[1] + fyo, c[2] + r.z * fxo + tw[1] * 0.004];
    fx(out, `tagflap${n}`, 192, 288, (p) => { fxTagFlap(p, n); tintCard(p, 192, 288, tint); }, fc, 0.229 * TWd, 0.698 * TH2 * sy, { rot: ang });
    { const [sx, sy2] = rot2(0.3333 * TWd + 0.1 * TWd, 0.3 * TH2); glintAt(out, [c[0] + r.x * sx + tw[0] * 0.01, c[1] + sy2, c[2] + r.z * sx + tw[1] * 0.01], f, FL0 + 3, 0.16, 8); }
    if (!inside) { // the chip slides down into the pocket (its bottom anchored at the pocket's top edge)
      const ch = 0.11 * (1 - inK), top = piv[1] - 0.01;
      fx(out, "chipQ", 128, 128, (p) => { fxChip(p, 21, true, false, 1.3); tintCard(p, 128, 128, tint); }, [piv[0] - r.x * 0.07, top + ch / 2, piv[2] - r.z * 0.07], 0.12, Math.max(0.005, ch));
    }
  }
  // running-gag witness: the raven on top of the flip counter fluffs to roost, snaps toward him on "stolen", ruffles on "twice"
  { const R: V3 = [TH.flip.x, TH.flip.y + TH.flip.h / 2 + 0.01, TH.flip.z], c: RavenX = {};
    if (f >= ST - 8 && f < ST - 5) c.ruffle = 1.2 * Math.sin((Math.PI * (f - ST + 8)) / 3);
    if (f >= ST - 2) { c.head = sideOf(cam, R, P); c.cock = 10 * c.head; }
    if (f >= TW2 && f < TW2 + 10) c.ruffle = Math.sin((Math.PI * (f - TW2)) / 10);
    raven(out, cam, f, R, c, 6); }
  // dusk life behind him: a stroller heads for the parking lot; far back right a bucket-hat tourist lifts his camera to
  // the sunset (a small white flash); A4: a chatting pair packing up (alternating head turns, one holds a map)
  walker(out, cam, TOUR(2, { glasses: null }, "d"), f, 1807, [2.4, 0, -5.0], -1, 0, 1.2);
  { const a2 = TOUR(7, { hat: "bucket", hatCol: "#f2c230", printPale: true }, "d"), p2: V3 = [-1.35, 0, -6.3], FL = ST - 6, up = ramp(f, FL - 8, 5) * (1 - ramp(f, FL + 10, 6));
    const sd2 = sideOf(cam, p2, [-6, 0, -30]);
    const o2: PersonOpts = { ...idle(f, a2.i, p2), facing: sd2, expr: up > 0.5 ? "focus" : "smile", look: sd2, lookY: -0.3, blink: blinkAt(f, a2.i), noCam: up > 0.3,
      hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] };
    put(out, cam, a2, p2, o2);
    flash(out, toWorld(cam, p2, 1, handAt(a2.o, { ...o2, seed: seedOf(a2.i), light: light2D(cam) }, 0), 0.25), f, FL, 3, 0.35); }
  ([[5, [1.45, 0, -7.6]], [0, [2.05, 0, -7.35]]] as [number, V3][]).forEach(([v, p3], k) => {
    const a3 = TOUR(v, { glasses: null }, "dp"), other: V3 = k ? [1.45, 0, -7.6] : [2.05, 0, -7.35];
    const talk = mod(Math.floor((f + k * 13) / 24), 2) === k, so = sideOf(cam, p3, other);
    put(out, cam, a3, p3, { ...idle(f, a3.i, p3), facing: talk ? so : (-so as -1 | 1), expr: talk ? "grin" : "smile", look: talk ? so * 1.2 : -so * 0.6, headTilt: (talk ? so * 5 : 0) + life(f, a3.i).head,
      blink: blinkAt(f, a3.i), hands: k ? [{ a: "show", hold: "map" }, { a: talk ? "point" : "hang", dy: -6 }] : [{ a: "strap" }, { a: "hip" }] });
  });
};

const trailhead = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (id === 1 || id === 16) {
    const tau = id === 16 ? f - (TOTAL - 1) : f;
    womanHook(out, cam, id, f); thBack(out, cam, tau); void lizard; // the trailhead lizard is the 3D one in sets_ext
    if (id === 1) hookFx(out, f);
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
    const ph = TOUR(0, { camera: "neck" }, "4"), pp: V3 = [-1.7 + 0.35 * clamp01((f - S(4).a) / 60), 0, -4.5];
    const up = ramp(f, BEAT.warning - 8, 5) * (1 - ramp(f, BEAT.warning + 10, 6)) + ramp(f, BEAT.vandalized + 10, 5) * (1 - ramp(f, BEAT.vandalized + 28, 6));
    const stoop = bump(f, 418, 12), pk = ramp(f, 424, 5);
    const g4 = gazeCycle(f, ph.i, [[0.6, 1, 1], [-1.2, 0, -1], [0.8, -0.5, 1]]);
    const phHands: [Hand, Hand] = f >= 416 && f < 440 ? [{ a: "hang", b: stoop > 0.4 ? "ground" : "pocket", k: stoop > 0.4 ? stoop : pk, hold: f >= 420 && f < 427 ? "chip" : null }, { a: "hip" }]
      : [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }];
    const phO = put(out, cam, ph, pp, { ...idle(f, ph.i, pp), mode: stoop > 0.55 ? "squat" : "stand", expr: up > 0.5 ? "focus" : f >= 427 && f < 445 ? "whistle" : f >= 416 ? "shifty" : "smile",
      facing: up > 0.5 ? 1 : g4[2], look: up > 0.5 ? 0.4 : f >= 416 && f < 427 ? (Math.floor(f / 4) % 2 ? 1.3 : -1.3) : g4[0], lookY: up > 0.5 ? -0.6 : g4[1], blink: blinkAt(f, ph.i),
      tilt: life(f, ph.i).sway + 8 * stoop, hands: phHands });
    flash(out, toWorld(cam, pp, 1, [300, 310], 0.2), f, BEAT.warning + 2, 3);
    flash(out, toWorld(cam, pp, 1, [300, 310], 0.2), f, BEAT.vandalized + 18, 3);
    notes(out, cam, pp, headAt(ph.o, phO), f, [428, 436], 1);
    { const mapT = gazeCycle(f + 17, 21, [[-0.5, -0.8, -1], [0.3, 1, -1]]);
      walker(out, cam, TOUR(1, {}, "4"), f, S(4).a + 120, [1.4, 0, -4.7], -1, 0, 0.5, { hands: [{ a: "show", hold: "map" }, { a: "point", dy: -14 + 4 * Math.sin(f * 0.25) }], expr: mapT[1] > 0 ? "focus" : "smile", look: mapT[0], lookY: mapT[1] }); }
    { const rp: V3 = [-3.25, 0, -8.85], L = life(f, A.ranger.i), pin = Math.sin(f * 0.9) * 2, tr = f >= BEAT.vandalized + 2 && f < BEAT.vandalized + 22, sr4 = sideOf(cam, rp, TH.woman);
      put(out, cam, A.ranger, rp, { view: tr ? "front" : "back", facing: tr ? sr4 : 0, expr: "skeptic", look: sr4 * 1.3, breath: L.breath, tilt: L.sway, shift: L.shift, headTilt: L.head + (tr ? sr4 * 4 : 0), wind: wnd(f, rp[0], rp[2]),
        blink: blinkAt(f, A.ranger.i, [BEAT.vandalized + 2]), hands: tr ? [{ a: "hang", hold: "clipboard" }, { a: "hip" }] : [{ a: "board", dy: pin }, { a: "board", dx: 10, dy: -pin }] }); }
    { const hp: V3 = [2.3, 0, -5.75], bend = 0.5 + 0.5 * Math.sin(f * 0.08), sdh = sideOf(cam, hp, [2.0, 0, -5.9]);
      put(out, cam, A.hiker, hp, { ...idle(f, A.hiker.i, hp), facing: sdh, expr: bend > 0.6 ? "focus" : "calm", tilt: 14 * bend * sdh, look: sdh * 1.2, lookY: 1, blink: blinkAt(f, A.hiker.i),
        hands: [{ a: "hang" }, { a: "reach", dy: -10 }] }); }
  }
  if (id === 5) {
    // blurred life far behind the couple (kept to the frame edges, out of the gap between their heads): a stroller, a
    // photographer (flash), a ranger who turns his head toward them on "now" (paranoia), and far left a tourist pair
    // that copies the whisper (one leans in, hand at mouth: a rewatch clue)
    walker(out, cam, TOUR(3, {}, "5"), f, S(5).a + 60, [-2.0, 0, -10], 1, 0, 0.7);
    { // A3: the photographer in the right gap under the lamp (screen x ~950 at 1080), camera up 6 f before the shutter
      const a2 = TOUR(1, {}, "5"), p2: V3 = [0.45, 0, -6.5], SH = BEAT.whisper - 1 /* A4: in the LEFT gap (x ~0.08 W), never behind his head */, up = ramp(f, SH - 12, 5) * (1 - ramp(f, SH + 14, 6)), sd2 = sideOf(cam, p2, TH.woman);
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
      put(out, cam, c2, q2, { ...idle(f, c2.i, q2), expr: ws ? "listen" : "calm", facing: -s1 as -1 | 1, look: -s1 * 0.9, blink: blinkAt(f, c2.i), hands: [{ a: "hang" }, { a: "hang" }] }); }
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
    put(out, cam, k2, p2, { view: hear || sneak ? "front" : "back", facing: hear ? tw : sneak ? (Math.floor(f / 4) % 2 ? 1 : -1) : 1, expr: sneak ? "shifty" : hear ? "listen" : "smile",
      look: sneak ? (Math.floor(f / 4) % 2 ? 1.3 : -1.3) : tw * 1.2, breath: L2.breath, tilt: L2.sway + 2, shift: L2.shift, headTilt: L2.head + 4, wind: wnd(f, p2[0], p2[2]), blink: blinkAt(f, k2.i, [BEAT.honest + 1]),
      mode: hear || sneak ? "stand" : "walk", phase: ph6 + 0.4, lift: 0.7,
      hands: [{ a: "hang" }, sneak ? { a: "chest", b: "pocket", k: pkt, hold: pkt < 0.8 ? "chip" : null } : f > BEAT.honest - 3 ? { a: "point", dy: -6 } : { a: "hang" }] });
    walker(out, cam, A.ranger, f, S(6).a + 40, [-7.5, 0, -19], 1, 0.15, 0.9, f >= BEAT.steal2 - 4 ? { expr: "skeptic", look: 1.3, headTilt: 5 } : {}); // A4: eyes the couple on "steal?"
    glintAt(out, [TH.glintRock[0], 0.16, TH.glintRock[2] + 0.06], f, BEAT.steal2, 0.42, 9);
    // the "?" bubble pops on "why" (2 f), wobbles +-3 deg at 0.5 Hz, pops out before the dissolve
    { const W0 = PW(11, "why"), W1 = S(6).b - 4, t = f - W0;
      if (t >= 0 && f < W1 + 2) { const k = t < 1 ? 0.6 : t < 2 ? 1.12 : f >= W1 ? 0.5 : 1;
        fx(out, "qmark", 256, 256, (p) => fxQuestion(p), [TH.base[0] - 0.45, 1.92, 1.82], 0.3 * k, 0.3 * k, { rot: 0.052 * Math.sin((TAU * 0.5 * t) / FPS) }); } }
  }
};
/** someone walking along a straight line through `mid` (passed at frame f0) in direction (dx, dz) */
const walker = (out: Stage, cam: CamInfo, a: Act, f: number, f0: number, mid: V3, dx: number, dz: number, v = 1.25, extra: PersonOpts = {}) => {
  const s = v * ((f - f0) / FPS), p: V3 = [mid[0] + dx * s, 0, mid[2] + dz * s];
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
    const chat = k === 1 || k === 2 ? (Math.floor((f + k * 11) / 20) % 2 ? 1 : -1) : 0;
    walker(out, cam, a, f, mid, w, dx * sgn, dz * sgn, 1.2 + 0.07 * k, k === 3 ? { hands: [{ a: "hang" }, { a: "point", dy: -6 }], expr: "smile" }
      : chat ? { expr: "smile", look: chat * 1.2, headTilt: chat * 5 } : {});
  });
  // a companion pair: one points at the big log, the other photographs it (flash)
  const ph: V3 = [-13.4, 0, -38.6], pt: V3 = [-14.4, 0, -37.2], log: V3 = [-15.5, 0, -40];
  {
    const a = TOUR(5, {}, "v"), up = ramp(f, mid - 24, 6), sd = sideOf(cam, ph, log);
    put(out, cam, a, ph, { ...idle(f, a.i, ph), expr: up > 0.5 ? "focus" : "smile", facing: sd, blink: blinkAt(f, a.i),
      hands: [{ a: "hang", b: "eye", k: up, hold: "camera" }, { a: "hang", b: "eye", k: up, dx: 6 }] });
    flash(out, toWorld(cam, ph, 1, handAt(a.o, { hands: [{ a: "eye" }, null], facing: sd }, 0), 0.1), f, mid - 6, 2, 0.5);
    const b = TOUR(0, {}, "v"), sb = sideOf(cam, pt, log);
    put(out, cam, b, pt, { ...idle(f, b.i, pt), expr: "grin", facing: sb, look: sb, blink: blinkAt(f, b.i),
      hands: [sb < 0 ? { a: "point", dy: 4 * Math.sin(f * 0.3) } : { a: "hip" }, sb > 0 ? { a: "point", dy: 4 * Math.sin(f * 0.3) } : { a: "hip" }] });
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
  walker(out, cam, A.hiker, f, mid, [-10.8, 0, -47], -0.28, 0.96, 1.15, { hands: [{ a: "hang", dy: -16, hold: "pole", ang: 12 + 10 * Math.sin(f * 0.5) }, { a: "hang", dy: -16, hold: "pole", ang: -12 + 10 * Math.sin(f * 0.5 + 3) }] });
  walker(out, cam, A.ranger, f, mid, [-15.5, 0, -56], 0.92, -0.39, 1.0);
  // three adults admire the third log (one points at its rainbow cut face, one turns to chat with the others)
  if (id === 2) [[4, -2.5, -43.6], [7, -1.9, -43.9], [2, -3.1, -43.9]].forEach(([v, x, z], n) => {
    const a = TOUR(v, n === 2 ? { glasses: null } : {}, "pl"), p: V3 = [x, 0, z], talk = n === 1 && Math.floor(f / 18) % 2 === 1;
    put(out, cam, a, p, { view: talk ? "front" : "back", facing: talk ? -1 : 0, expr: "smile", breath: life(f, a.i).breath, tilt: life(f, a.i).sway, shift: life(f, a.i).shift,
      headTilt: life(f, a.i).head, wind: wnd(f, x, z), blink: blinkAt(f, a.i), hands: [{ a: "hang" }, n === 0 ? { a: "point", dy: -10 } : { a: "hang" }] });
  });
  if (id === 2) {
    // two ravens circle high in the upper-right sky (25-30 m out, 90 f period), gliding with a 3 f flap every 12 f
    for (const k of [0, 1]) {
      // A4: in the crane's sky (upper ~18 % of the frame at the top of the move), ~40 m out over the badlands
      const a = (TAU * f) / 90 + k * Math.PI, c: V3 = [-2 + 3.2 * Math.cos(a), 14 + 0.9 * k + 0.5 * Math.sin(a * 2), -50 + 3.2 * Math.sin(a)];
      const fm = mod(Math.floor(f) + k * 6, 12), w = fm < 4 ? [1, -0.7, 0.4, -0.3][fm] : 0.15, dir = Math.sin(a) > 0 ? -1 : 1;
      fx(out, `fly${w}d${dir}`, 256, 128, (p) => fxFlyRaven(p, w, "#1e2233", dir), c, 2.6, 1.3, { rot: 0.15 * Math.cos(a) });
    }
    // the trail life IN FRAME (the crane looks ENE over the flats): a group of three strolls toward the trailhead
    // (one points out at the badlands, two chat with head turns), a tourist photographs the view (flash), a lone
    // tourist points, a far couple chats
    const grp: [number, V3, Partial<PersonOpts>][] = [
      [1, [-15.9, 0, -25.7], { hands: [{ a: "hang" }, { a: "point", dy: -10 + 3 * Math.sin(f * 0.4) }], expr: "grin", look: 1 }],
      [4, [-15.3, 0, -25.25], {}],
      [7, [-16.45, 0, -25.1], {}],
    ];
    grp.forEach(([v, p0, ex], n) => {
      const a = TOUR(v, n === 1 ? { hat: "visor", hatCol: "#f4f1ea" } : n === 2 ? { hat: "bucket", hatCol: "#f2c230", backpack: "#4a6a8a", print: "palm" } : {}, "v2"), chat = n > 0 ? (Math.floor((f + n * 13) / 16) % 2 ? 1 : -1) : 0;
      walker(out, cam, a, f, 165, p0, 0.38, 0.92, 1.05 + 0.05 * n, { flutter: flutAt(f, a.i), ...(chat ? { expr: "smile", look: chat * 1.2, headTilt: chat * 5 } : {}), ...ex });
    });
    { const a = TOUR(6, {}, "v2"), p: V3 = [-14.7, 0, -23.9], up = ramp(f, 160, 5) * (1 - ramp(f, 182, 5)), sd = sideOf(cam, p, [-6, 0, -12]);
      put(out, cam, a, p, { ...idle(f, a.i, p), expr: up > 0.5 ? "focus" : "smile", facing: sd, look: sd, blink: blinkAt(f, a.i), flutter: flutAt(f, a.i),
        hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] });
      flash(out, toWorld(cam, p, 1, [300 + sd * 30, 300], 0.15), f, 171, 2, 0.55); }
    { const a = TOUR(0, {}, "v2"), p: V3 = [-14.2, 0, -25.6], sd = sideOf(cam, p, [-6, 0, -30]);
      put(out, cam, a, p, { ...idle(f, a.i, p), expr: "grin", facing: sd, look: sd * 1.2, lookY: -0.3, blink: blinkAt(f, a.i), flutter: flutAt(f, a.i),
        hands: sd < 0 ? [{ a: "point", dy: -8 + 3 * Math.sin(f * 0.35) }, { a: "hip" }] : [{ a: "hip" }, { a: "point", dy: -8 + 3 * Math.sin(f * 0.35) }] }); }
    // A4: a near couple (9-15 m from the crane, heads ~50-60 px) strolls across the flats toward the trail, chatting with
    // head turns and a pointing arm: the "visitors" read as people
    ([[3, [-24.1, 0, -31.2], 0], [1, [-25.0, 0, -30.4], 1]] as [number, V3, number][]).forEach(([v, m0, n]) => {
      const a = TOUR(v, n ? { hat: "visor", hatCol: "#f4f1ea" } : {}, "vn"), chat = Math.floor((f + n * 12) / 18) % 2 ? 1 : -1;
      walker(out, cam, a, f, 172, m0, 0.8, -0.6, 1.15 - 0.05 * n, { flutter: flutAt(f, a.i), expr: chat > 0 ? "grin" : "smile", look: chat * (n ? -1.2 : 1.2), headTilt: chat * 5 + life(f, a.i).head,
        hands: n ? [{ a: "hang" }, { a: "point", dy: -12 + 3 * Math.sin(f * 0.4) }] : [{ a: "hang" }, { a: "hang" }] });
    });
    // A3: a tourist kneels at a chip beside the trail (it glints): the pocketing to come
    { const a = TOUR(2, { glasses: null, hat: "visor", hatCol: "#e9f1f4", print: "pine", shirt: "#f2665a" }, "v2k"), p: V3 = [-15.0, 0, -24.4], sd = sideOf(cam, p, [-15.4, 0, -24.3]);
      put(out, cam, a, p, { ...idle(f, a.i, p), mode: "kneel", facing: sd, expr: "focus", look: sd * 0.8, lookY: 1, blink: blinkAt(f, a.i), hands: sd < 0 ? [{ a: "ground", dy: -4 * Math.abs(Math.sin(f * 0.3)) }, { a: "lap" }] : [{ a: "lap" }, { a: "ground", dy: -4 * Math.abs(Math.sin(f * 0.3)) }] });
      glintAt(out, [-15.45, 0.12, -24.2], f, 168, 0.22, 8); }
    [[5, -7.4, -19.2], [3, -6.8, -19.6]].forEach(([v, x, z], n) => {
      const a = TOUR(v, {}, "v2c"), p: V3 = [x, 0, z], tk = Math.floor((f + n * 9) / 18) % 2 === 1, sd = sideOf(cam, p, n ? [-7.4, 0, -19.2] : [-6.8, 0, -19.6]);
      put(out, cam, a, p, { ...idle(f, a.i, p), expr: tk ? "grin" : "smile", facing: sd, look: sd * (tk ? 1.3 : 0.6), headTilt: (tk ? 5 : 0) * sd, blink: blinkAt(f, a.i), hands: [{ a: "hang" }, n ? { a: "hip" } : { a: "hang" }] });
    });
  }
  if (id === 3) {
    pocketing(out, cam, f);
    for (const k of [0, 1]) { // A3: two ravens circling high in the top sky band
      const a = (TAU * f) / 80 + k * Math.PI, c: V3 = [-1.8 + 1.8 * Math.cos(a), 3.7 + 0.4 * k, -32 + 1.6 * Math.sin(a)];
      const fm = mod(f + k * 6, 12), w = fm < 3 ? q(Math.sin((fm / 3) * TAU), 6) : 0.15;
      fx(out, `fly${w}`, 256, 128, (p) => fxFlyRaven(p, w), c, 1.1, 0.55, { rot: 0.3 * Math.cos(a) });
    }
  }
};

/** shot 3: he admires the chip IN FRONT of his chest (screen-left of the plaque, glint), guilty side-eye checks left /
 *  right, a 3 f anticipation lift, the chip slides into his FRONT CHEST POCKET (its top peeks out), two pats ON the
 *  pocket, then the innocent closed-eye whistle with a heel-rock bounce, a smug side check, the free hand on his hip */
const pocketing = (out: Stage, cam: CamInfo, f: number) => {
  const a = TOUR(0, { camera: "neck" }), P = VISTA.pocketTourist, i = a.i, log = VISTA.logs[0].c, sd = sideOf(cam, P, log);
  const B = BEAT.pocketing, L = life(f, i);
  const ex: K<Expr>[] = [[0, "smile"], [B - 9, "shifty"], [B + 8, "whistle"], [B + 16, "smug"], [B + 26, "whistle"], [B + 41, "smug"]];
  const e = at(f, ex);
  const closedEyes = (f >= B + 8 && f < B + 16) || (f >= B + 26 && f < B + 41);
  // gaze: down at the chip; then two true side-eye glances (1 f snaps, 4 f holds); eyes open through the pocketing
  let look = 0, lookY = 0, head = L.head * 0.8;
  if (f < B - 9) { look = -0.35; lookY = 0.95; head -= 5; }
  else if (f < B - 4) { look = -1.4; lookY = 0.1; head -= 7; }
  else if (f < B) { look = 1.4; lookY = 0.1; head += 7; }
  else if (f < B + 5) { look = 1.35; lookY = 0.05; head += 6; }  // A4: one more glance RIGHT (anyone coming?) as the chip goes in
  else if (f < B + 8) { look = -0.6; lookY = 0.75; head -= 3; }   // watching the pocket go in
  else if (f >= B + 16 && f < B + 18) { look = 0.6; lookY = 0; head += 2; }  // A4: the eyes snap to the lens ...
  else if (f >= B + 18 && f < B + 26) { look = 0; lookY = 0; head += 1; }    // ... and hold a guilty look at us (8 f)
  // the chip hand (index 0, screen-left, the pocket side): chest -> 3 f lift -> chest pocket -> two pats -> the hip
  const lift = -5 * bump(f, B - 3, 3);
  let hand: Hand;
  if (f < B) hand = { a: "chest", dx: -4, dy: -16 + 1.5 * Math.sin(f * 0.4) + lift, hold: "chip", n: f >= B - 16 && f < B - 8 ? 2 : 0 };
  else if (f < B + 6) { const k = ramp(f, B, 6); hand = { a: "chest", b: "chestPocket", k, dx: -4 * (1 - k), dy: -16 * (1 - k) - 6 * k, hold: k < 0.7 ? "chip" : null }; }
  else if (f < B + 15) hand = { a: "chestPocket", dy: -6 + 3.5 * Math.abs(Math.sin(((f - B - 6) / 4.5) * Math.PI)) };
  else hand = { a: "chestPocket", b: "hip", k: ramp(f, B + 15, 6), dy: -6 * (1 - ramp(f, B + 15, 6)) };
  const facing: -1 | 0 | 1 = f < B - 9 ? -1 : f < B - 4 ? -1 : f < B + 5 ? 1 : f >= B + 18 && f < B + 26 ? 0 : f >= B + 8 ? sd : 0;
  const notesAt = [B + 9, B + 16, B + 30, B + 36];
  const nb = notesAt.reduce((m, s) => m + 4 * bump(f, s, 6), 0);
  const whistling = closedEyes;
  const rock = whistling ? 0.009 * Math.abs(Math.sin(TAU * 0.5 * (f / FPS))) : 0;
  const heroO = put(out, cam, a, P, {
    ...idle(f, i, P), tilt: L.sway * 1.6 + 1.4 * L.shift + (whistling ? 2.6 * Math.sin(TAU * 0.45 * (f / FPS)) : 0), expr: e, look, lookY, facing, breath: L.breath * 1.5,
    blink: closedEyes ? 1 : blinkAt(f, i, [B - 12, B + 16, B + 41]), headTilt: head + nb * (whistling ? 1 : 0),
    face: { blush: e === "shifty" ? 1 : 0, fdy: e === "whistle" ? 2 * Math.sin(f * 0.5) : 0 },
    pocketChip: f >= B + 4 ? 0.35 : 0, flutter: flutAt(f, i, P[0], P[2]),
    hands: [hand, { a: "hip", dy: 2 * Math.sin(f * 0.2) }],
  }, { rise: rock });
  // a BIG glint on the chip while he admires it (B-16, 8 f); whistle notes; a glint on the chip peeking from the pocket
  const hp = handAt(a.o, { ...idle(f, i, P), facing, seed: seedOf(i), hands: [hand, { a: "hip" }] }, 0);
  glintAt(out, toWorld(cam, P, 1, [hp[0] - 6, hp[1] - 44], 0.12), f, B - 16, 0.26, 8);
  notes(out, cam, P, headAt(a.o, heroO), f, notesAt, -1);
  if (whistling) { const ph = mod(f, FPS); if (ph < 4) puff(out, [P[0] + 0.05, GY, P[2] + 0.12], f, f - ph, 6); }
  { const pw = handAt(a.o, { facing: sd, seed: seedOf(i), hands: [{ a: "chestPocket" }, null] }, 0);
    glintAt(out, toWorld(cam, P, 1, [pw[0] + 2, pw[1] - 30], 0.1), f, B + 16, 0.15, 6);
    glintAt(out, toWorld(cam, P, 1, [pw[0] + 2, pw[1] - 30], 0.1), f, 238, 0.17, 7); } // and once more into the dissolve
  // "visitors KEPT pocketing": soft-focus at screen right behind the slice, a tourist glances round and pockets a chip
  // (B+8); another photographs the log (camera up from 224, flash on the 234 shutter)
  // A3 (projected at f233): the far pocketer stands right of the slice (screen x ~1000, ~28 % of the hero, DOF-soft):
  // a 1 f head-snap glance, then the chip into his pocket at B + 8; the photographer stands in the open gap between
  // the hero's head and the plaque (x ~600): camera up from "pieces" - 6, a 3 f flash on the shutter (B + 29)
  { const b = TOUR(2, { glasses: null }, "3"), bp: V3 = [1.0, 0, -32.0], pk2 = ramp(f, B + 8, 6), sb = sideOf(cam, bp, [-1, 0, -31]);
    const snap = (f >= B + 5 && f < B + 8 ? -sb : sb) as -1 | 1;
    put(out, cam, b, bp, { ...idle(f, b.i, bp), expr: f >= B + 5 && pk2 < 1 ? "shifty" : "smile", look: f >= B + 5 && pk2 < 1 ? (Math.floor(f / 4) % 2 ? 1.2 : -1.2) : sb, facing: snap, blink: blinkAt(f, b.i),
      hands: [{ a: "chest", b: "pocket", k: pk2, hold: pk2 < 0.8 ? "chip" : null }, { a: "hang" }] }); }
  { // A4: the photographer first does his OWN pocketing (the plural "visitors KEPT pocketing"): crouches, picks a chip
    // off the ground, side-glances left, slips it into his hip pocket and pats it, THEN lifts his camera for the shutter
    const c = TOUR(6, {}, "3"), cp: V3 = [-1.45, 0, -31.2], SH = PW(5, "pieces.") + 10, up = ramp(f, SH - 10, 5), sdc = sideOf(cam, cp, [-1.8, 0, -33.5]);
    const PK0 = B - 4, cr = crouchAt(f, PK0, 3, 4), held = f >= PK0 && f < B + 13, POK = B + 11, PAT = B + 17;
    const pocketK = ramp(f, POK - 2, 4), patDy = -3 * bump(f, PAT, 3);
    const glance = f >= B + 4 && f < B + 10;
    const pickH: Hand = f < B + 9 ? { a: "hang", b: "ground", k: cr.reach, hold: held ? "chip" : null } : { a: "chest", b: "pocket", k: pocketK, dy: patDy, hold: f < POK ? "chip" : null };
    const co: PersonOpts = { ...idle(f, c.i, cp), crouch: cr.k, expr: up > 0.5 ? "focus" : glance || (f >= POK - 2 && f < PAT) ? "shifty" : "smile", facing: glance ? -1 : sdc,
      look: glance ? (f < B + 7 ? -1.3 : 1.2) : f < PK0 + 2 && f >= PK0 - 8 ? sdc * 0.6 : sdc, lookY: f >= PK0 - 8 && f < PK0 + 3 ? 1 : 0, blink: blinkAt(f, c.i, [B + 3]), noCam: up > 0.3,
      hands: up > 0.02 ? [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] : [pickH, { a: "hang" }] };
    put(out, cam, c, cp, co);
    if (f < PK0) fx(out, "chip3c", 96, 96, (p) => fxChip(p, 18), groundAt(cam, c, cp, sdc, 0), 0.08, 0.07);
    flash(out, toWorld(cam, cp, 1, handAt(c.o, { ...co, seed: seedOf(c.i) }, 0), 0.25), f, SH, 3, 0.45); }
};

// ---------------- the trails (test, signs, results, permission) ----------------
const tt = (d: V3) => add(TT.base, d);
const SIGN_A: V3 = tt([TT.signA.dx, TT.signA.cy, TT.signA.z]), SIGN_B: V3 = tt([TT.signB.dx, TT.signB.cy, TT.signB.z]);
const LED_TOP = (s: V3): V3 => [s[0], TT.signA.cy + TT.led.dy + TT.led.h / 2 + 0.02, s[2] + 0.01];
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
    walker(out, cam, A.asst3, f, S(7).a + 34, tt([4.3, 0, -3.6]), -1, 0, 1.05, { hands: [{ a: "hang" }, { a: "waist", dx: 6, hold: "tarp", n: Math.floor(f / 2) }], expr: "focus", look: -0.8 });
    [[5, tt([3.7, 0, -8.6])], [2, tt([4.25, 0, -8.9])]].forEach(([v, p0], n) => {
      const a = TOUR(v as number, { glasses: null }, "7p"), chat = Math.floor((f + n * 9) / 20) % 2 ? 1 : -1;
      walker(out, cam, a, f, S(7).a + 50, p0 as V3, 0.2, -0.98, 0.55, { expr: chat > 0 ? "grin" : "smile", look: chat * (n ? -1.2 : 1.2), headTilt: chat * 4 });
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
  const ex: K<Expr>[] = [[-999, "ponder"], [G - 2, "knowing"], [G + 14, "ponder"], [C - 2, "fair"], [N0, "content"], [N0 + 16, "knowing"]]; // ("fair": a smug little smile with LEVEL brows, never a V)
  const e = at(f, ex), L = life(f, i), t = f / FPS;
  const writing = e === "ponder";
  // the nod: down ~5 % of the head height over 5 f, back up over 7 f with a ~1 f overshoot
  const nod = f < N0 ? 0 : f < N0 + 5 ? 1.0 * smooth((f - N0) / 5) : f < N0 + 12 ? 1.0 * (1 - backOut((f - N0 - 5) / 7)) : 0;
  const ticks = clamp(Math.floor((f - 652) / 2.4), 0, 10) + clamp(Math.floor((f - ps - 2) / 3), 0, 6);
  const board: Hand = { a: "chest", dx: 10, dy: -8, hold: "testboard", ang: 6 + 2 * Math.sin(TAU * 0.8 * t) + 1.2 * wnd(f, P[0], P[2]), n: ticks };
  const shiftT = -3 * settle(f, C + 2, 8) * (1 - ramp(f, T, 10)), tiltP = L.sway * 1.8 + 0.6 * L.shift + shiftT;
  const wNod = writing ? 0.35 : 0;
  const bd = handAt(a.o, { hands: [board, null], facing: sd, seed: seedOf(i), tilt: tiltP, breath: L.breath * 1.4, nod: nod * 0.9 + wNod }, 0);
  // pen hand: ticks (a 6 Hz jiggle, a lift between gates) while writing; on "tested" a flourish toward the trails
  // (N0 + 1 .. N0 + 6), two taps on the board (contacts at T - 2 and T + 1), then it rests at the board's lower-right
  // corner (off the paper) and holds through the dive
  const FL = N0 + 1, TP = T - 4, RS = T + 3;
  let pen: Hand;
  if (writing && f < C - 2) { const tk = Math.max(0, ticks - 1), k = tk < 4 ? (tk % 2 ? 10 : -10) : 10, j = (tk < 4 ? Math.floor(tk / 2) : tk - 2) % 5; pen = { a: [bd[0] + (k - 6 + j * 3) * 2.4, bd[1] + 10 + 1.6 * Math.sin(f * 2.1) - 4 * (mod(f, 12) < 2 ? 1 : 0)], hold: "pen", ang: -22 }; }
  else if (f >= FL && f < TP) { const k = settle(f, FL, 4); pen = { a: "waist", b: "point", k: clamp01(k), dy: -10 * k, hold: "pen", ang: sd * (45 + 10 * Math.sin((f - FL) * 0.9)) }; }
  else if (f >= TP && f < RS) { const tp = Math.abs(Math.sin(((f - TP) / 3) * Math.PI)); pen = { a: [bd[0] + 4, bd[1] + 6 - 10 * tp], hold: "pen", ang: -30 }; }
  else if (f >= RS) pen = { a: [bd[0] + 31 * 2.44, bd[1] + 31 * 2.44], hold: "pen", ang: -35 };
  else pen = { a: "chest", b: "waist", k: ramp(f, G - 2, 6), dx: -8 + 1.5 * Math.sin(f * 0.7), hold: "pen", ang: -25 };
  // gaze: down at the board while writing; the lens on "professor" (one brow arched) and from "Cialdini"; the trails on the flourish
  let look = writing ? sd * 0.3 : 0, lookY = writing ? 1.1 : nod * 0.5, head = L.head * 0.9 + 1.5 * Math.sin(f * 0.31) + (writing ? -5 * sd : 0);
  let browUp: [number, number] | undefined;
  if (e === "knowing" && f < G + 14) { look = 0.15 * sd; lookY = -0.15; head += 3; browUp = sd > 0 ? [0, 5] : [5, 0]; }
  if (e === "fair") { look = 0.2 * sd; lookY = 0; }
  if (f >= FL && f < TP) { look = sd * 1.1; lookY = -0.2; }
  if (e === "knowing" && f >= G + 14) head += 3;
  const gd = f < C - 1 ? 0 : f < C + 2 ? 1.15 * smooth((f - C + 1) / 3) : f < C + 4 ? 1.15 - 0.15 * smooth((f - C - 2) / 2) : 1; // A4: the readers drop onto his nose on "Cialdini"
  put(out, cam, a, P, { expr: e, look, lookY, nod: nod * 0.9 + wNod, facing: sd, face: { browUp }, glassesDrop: gd,
    blink: blinkAt(f, i, [...swapsOf(ex).filter((x) => x !== N0), ps - 3, PW(12, "tested") + 14]), breath: L.breath * 1.4, shift: f >= C && f < T ? -1 : L.shift,
    tilt: tiltP, headTilt: head, wind: wnd(f, P[0], P[2]) * 0.6, flutter: 0.6 * flutAt(f, i), hairSwing: 1.5 * wnd(f, P[0], P[2]), hands: [board, pen] });
};

/** shot 8's insert staging: asst1 kneels on the LONG LOGS path with the chip; A4: asst2 kneels to his screen-LEFT (in
 *  the insert, ~0.3 W, 5 m out) so the stopwatch beat is ON screen; both kneel together on the path in shots 7-8 */
const TEAM1 = tt([0.85, 0, -3.4]), TEAM2 = tt([0.1, 0, -4.1]);
/** the research team: asst2 waits with the stopwatch, asst1 carries the chip bucket and kneels beside him (shot 7);
 *  shot 8 (A4): asst1 KNEELS low (one knee on the path, torso ~25 % lower, leaning in 8 deg), holds the chip at CHEST
 *  height on his near side (never across his face), a 2 f lift, sets it on the path on "hid" (1 f settle, a dust puff),
 *  dabs the white dot on "marked" with a brush, blows on it ("o"); asst2 tucks a second chip under a bush on "hid"
 *  (sly glance), then thrusts a BIG stopwatch up toward the lens (3 f dip, rise, hold), clicks it with his thumb (2 f
 *  squash, 1 f digit flicker) and gives the lens a sly look; then both tick tallies */
const team = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const p1 = TEAM1, p2 = TEAM2, p0 = tt([0.75, 0, -5.2]);
  const M = BEAT.marked, HID = 776, CLK = M + 10;
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
      const chipH: Hand = { a: "show", b: "ground", k: clamp01(dn), dx: -2, dy: (36 + 1.5 * Math.sin(f * 0.5)) * (1 - clamp01(dn)) - (dn < 0 ? 18 * -dn : 0), hold: f < HID ? "chip" : null, n: 4 };
      const gw = handAt(a.o, { ...base, hands: [{ a: "ground" }, { a: "ground" }] }, sd < 0 ? 0 : 1);
      const chipW: V3 = (() => { const c = toWorld(cam, p1, 1, [gw[0] + sd * 4, 975], 0.42); return [c[0], GY + 0.07, c[2]]; })();
      // the brush: poised over the chip on the ground, dabs the dot on M - 2 .. M, lifts away
      const cd = toDesignRay(cam, p1, 1, [chipW[0], chipW[1] + 0.05, chipW[2]]), ba = sd < 0 ? -40 : 40, u = 2.44;
      const tip: P2 = [cd[0] - 15 * u * Math.sin((ba * Math.PI) / 180), cd[1] + 15 * u * Math.cos((ba * Math.PI) / 180)];
      const reach = f < M - 6 ? 0 : f < M - 2 ? 0.55 * smooth((f - (M - 6)) / 4) : f < M + 1 ? 1 : 1 - smooth((f - M - 1) / 4);
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
        fx(out, f >= M - 1 ? "chipHeroD" : "chipHero", 128, 128, (p) => fxChip(p, 3, f >= M - 1, false, 1.7), [chipW[0], chipW[1] + 0.012 * bump(f, HID, 2), chipW[2]], 0.17, 0.15);
        puff(out, [chipW[0], GY - 0.02, chipW[2]], f, HID, 8);
        glintAt(out, [chipW[0] + cam.right.x * 0.1, chipW[1] + 0.1, chipW[2] + cam.right.z * 0.1], f, M, 0.1, 7);
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
    const R0 = HID + 1, up = id === 8 ? (f < R0 ? 0 : f < R0 + 3 ? -0.25 * smooth((f - R0) / 3) : f < R0 + 7 ? -0.25 + 1.3 * smooth((f - R0 - 3) / 4) : f < R0 + 8 ? 1.05 : f < CLK + 7 ? 1 : 1 - smooth((f - CLK - 7) / 5)) : 0;
    const lens = id === 8 && up > 0.02;
    // (A4: when raised it goes up BESIDE his head, outward, so the sly look stays visible)
    const watchH: Hand = lens ? { a: "show", b: "raise", k: clamp01(up), dx: -sd * 40 * clamp01(up), dy: -3 * bump(f, CLK, 3) - 24 * Math.min(0, up), hold: null, maxLen: 1.5 }
      : { a: "show", dx: -sd * 6, dy: -22, hold: "stopwatch", n: Math.floor(f / 30) };
    const tally = id === 8 ? f >= CLK + 12 : f < 700;
    const wr = Math.sin(f * 1.7) * 2;
    const other: Hand = tuck ? { a: "hang", b: "ground", k: bump(f, HID - 2, 8), dx: -sd * 4, hold: f < HID + 2 ? "chip" : null }
      : tally ? { a: "show", dx: -14 + wr, dy: 10 + wr * 0.5, hold: "pencil", ang: -30 } : { a: "hip" };
    const first: Hand = tally ? { a: "show", dy: 6, hold: "tally", ang: 10 } : lens ? watchH : { ...watchH, dx: sd * 12 };
    const count = tally && mod(Math.floor(f / 20), 3) === 2;
    const otherC: Hand = count ? { a: "raise", shape: (["f1", "f2", "f3"] as const)[mod(Math.floor(f / 6), 3)], dy: 8 } : other;
    const sw = id === 8 && f >= BEAT.swapping - 7, s3 = sideOf(cam, p2, [SIGN_A[0] + 0.95, 0, SIGN_A[2] + 0.5]);
    const sly = id === 8 && f >= CLK && f < CLK + 8;
    const o2 = put(out, cam, a, p2, { mode: "kneel", expr: tuck ? "shifty" : sly ? "smug" : lens ? "focus" : sw ? "smile" : tally ? "focus" : "calm",
      look: tuck ? -sd * 1.3 : sly ? 0 : lens ? sd * 0.4 : sw ? s3 * 1.2 : tally ? sd * 0.6 : 0.3, lookY: sly ? 0 : lens ? -0.3 : sw ? -0.1 : tally ? 1 : tuck ? 0 : -0.2,
      blink: blinkAt(f, i, [HID + 7, CLK + 9], [CLK]), facing: sly ? 0 : sw ? s3 : sd, breath: L.breath * 1.3, squash: 0.4 * bump(f, CLK, 2),
      tilt: L.sway * 0.8 + sd * 6, headTilt: L.head * 0.6 + (sly ? 4 * sd : 0), face: { browUp: sly ? (sd > 0 ? [0, 4] : [4, 0]) : undefined }, hands: sd < 0 ? [otherC, first] : [first, otherC] });
    if (lens) { // the big stopwatch card, slid along the view ray from his hand toward the lens (it stays over his hand)
      const hw = toWorld(cam, p2, 1, handAt(a.o, o2, sd < 0 ? 1 : 0), 0.05), c = cam.pos, k = 0.13 * clamp01(up);
      const w: V3 = [hw[0] + (c.x - hw[0]) * k, hw[1] + (c.y - hw[1]) * k, hw[2] + (c.z - hw[2]) * k];
      const press = f >= CLK && f < CLK + 2 ? 1 : 0, sc = 0.7 + 0.3 * clamp01(up);
      fx(out, `stopw${press}${f >= CLK && f < CLK + 1 ? "f" : ""}`, 320, 400, (p) => fxStopwatch(p, press, f >= CLK && f < CLK + 1), [w[0], w[1] + 0.05, w[2]], 0.36 * sc, 0.45 * sc, { rot: 0.06 * sd * (1 - clamp01(up)) });
    }
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
  if (t >= T.gone9) {
    const W0 = BEAT.swapping + T.gone9, s = 2.1 * Math.max(0, (f - W0) / FPS) * smooth((f - W0) / 4 + 0.5), P: V3 = [P0[0] + 0.12 + s, 0, P0[2]];
    if (f > W0 + 40) return;
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
  if (t < -14) { facing = 0; look = 0.3; lookY = 0.2; expr = "calm"; h0 = { a: "hang" }; h1 = { a: "hip" }; }
  else if (t < -8) { facing = 0; expr = "focus"; look = -0.7; lookY = -1; }                                  // glances up at the LED
  else if (t < -4) { expr = "focus"; h1 = { a: "hip", b: pw(old!, ex0, -0.1), k: smooth((t + 8) / 3), maxLen: 1.5 }; squash = 0.45 * bump(t, -7, 3); lookY = -0.4; } // a hand on the edge, the 3 f dip
  else if (t < T.grip) { [h0, h1] = grip(old!, smooth((t + 4) / 3)); expr = "effort"; lookY = -0.5; squash = 0.5 * bump(t, -4, 3); } // both hands to the near edge, a 3 f squat
  else if (t < T.leaned) { [h0, h1] = grip(old!); expr = "effort"; lookY = t < T.lifted ? -0.7 : 0.4; look = -0.9; squash = 0.3 * bump(t, T.lifted - 1, 3); }
  else if (t < T.hung) { [h0, h1] = grip(neu); expr = "effort"; look = t < T.up ? 0.4 : -0.8; lookY = t < T.up ? 0.6 : -0.6; squash = 0.6 * bump(t, T.up + 4, 3); }
  else if (t < T.hung + 3) { expr = "smile"; look = -0.8; lookY = -1; facing = -1; nod = 0.8 * bump(t, T.hung, 3); }  // steps back, looks up at it, nods
  else { const rub = 5 * Math.sin((t - T.hung - 3) * 2.4); h0 = { a: "chest", dx: 4 + rub }; h1 = { a: "chest", dx: -4 - rub }; expr = "grin"; look = 0.6; lookY = 0; facing = 1; } // dusts his hands, turns to go
  // A4: he crouches whenever the panel he holds is low (the leaning spot, the stack), so his hands stay ON it
  const hy = held ? hook[1] + (held as PanelPose)[1] : 2, crouch = clamp01((1.05 - hy) / 0.5);
  put(out, cam, a, P, { ...idle(f, i, P), breath: L.breath * 1.4, tilt: L.sway * 1.5 + 1.2 * L.shift - 3 * squash + (t >= T.hung && t < T.hung + 4 ? 3 * bump(t, T.hung, 4) : 0), shift: L.shift,
    expr, look, lookY, nod, squash, facing, crouch, blink: blinkAt(f, i, [BEAT.swapping - 9, BEAT.swapping + T.hung, BEAT.swapping + T.hung + 5]), hands: [h0, h1] });
  puff(out, [hook[0] + SWAP_LEAN[0], GY, hook[2] + SWAP_LEAN[2] + 0.05], f, BEAT.swapping + T.leaned, 8);     // the old panel lands on the post foot
  // a raven on Sign A's LED housing watches the swap: snaps to the panel on the grip, ruffles on the clack (hung)
  { const c: RavenX = {}, R = LED_TOP(SIGN_A), tc = BEAT.swapping + T.hung;
    if (f >= BEAT.swapping - 5 && f < tc) { c.head = sideOf(cam, R, P); c.dip = 1; } else if (f >= tc && f < tc + 10) c.head = 0;
    if (f >= tc && f < tc + 8) { c.ruffle = Math.sin((Math.PI * (f - tc)) / 8); c.wing = f < tc + 3 ? 0.5 : 0; c.hop = f < tc + 4 ? 0.4 * Math.sin((Math.PI * (f - tc)) / 4) : 0; } // A4: a startled hop + wing flick on the clack
    if (id === 8) raven(out, cam, f, R, c, 5); }
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
    const a = TOUR(2, { glasses: null, fringeUp: 0.09 }, "r"), i = a.i, P = tt([-2.45, 0, 0.9]), L = life(f, i), sd = sideOf(cam, P, SIGN_A);
    const PL = BEAT.please1, RD0 = PL + 4, WD = PW(14, "wood."), RM = PW(14, "remove");
    const ex: K<Expr>[] = [[0, "listen"], [PL - 2, "browsUp"], [RD0, "read"], [WD - 3, "fair"], [BEAT.another + 1, "smile"]];
    const e = at(f, ex), nodK = bump(f, WD - 1, 8);
    const reading = f >= RD0 && f < WD - 3, line = clamp(Math.floor((f - RD0) / 24), 0, 3), k3 = Math.floor(mod(f - RD0, 24) / 8);
    let look = reading ? sd * (1.1 + 0.45 * (k3 - 1)) : sd * 0.7, lookY = reading ? -1.25 + line * 0.08 : e === "browsUp" ? -0.9 : -0.3;
    const up = f >= fo + 2 && f < fo + 8;                                    // the raven's shadow sweeps over: he looks up
    if (up) { look = sd * 0.4; lookY = -1.2; }
    const browA: [number, number] | undefined = f >= RM - 1 && f < RM + 8 ? [4, 4] : undefined;
    const trace = reading && f >= RD0 + 6 ? (k3 - 1) * 10 : 0;               // the finger follows the saccades along the line
    put(out, cam, a, P, { ...idle(f, i, P), tilt: L.sway * 1.3 + 0.6 * L.shift, expr: e, facing: sd, look, lookY, breath: L.breath * 1.3,
      headTilt: L.head * 0.7 + (reading ? sd * 5 : sd * 2) + (up ? -4 : 0), nod: nodK * 0.9, face: { fdy: reading || e === "browsUp" || up ? -5 : 0, fdx: reading ? sd * 5 : 0, browUp: browA },
      blink: blinkAt(f, i, [...swapsOf(ex), PL + 25]), flutter: flutAt(f, i),
      hands: f >= WD - 1 ? [{ a: "hang", b: "hip", k: ramp(f, WD - 1, 5) }, { a: "hang", b: "hip", k: ramp(f, WD, 5) }]
        : reading && f >= RD0 + 6 ? (sd < 0 ? [{ a: "point", dx: trace, dy: -16 - 4 * line, maxLen: 1.4 }, { a: "hang" }] : [{ a: "hang" }, { a: "point", dx: trace, dy: -16 - 4 * line, maxLen: 1.4 }])
          : [{ a: "hang" }, { a: "chin", dx: sd * 4, dy: f >= RD0 && mod(f, 10) < 2 ? -1.2 : 0 }] });
  }
  {
    const a = TOUR(3, {}, "r"), i = a.i, P = tt([0.8, 0, 0.8]), L = life(f, i), sd = sideOf(cam, P, SIGN_B);
    const MANY = BEAT.many1, VIS = PW(15, "visitors"), REM = PW(15, "removed"), chipP = tt([0.52, GY + 0.03, 1.02]);
    const ex: K<Expr>[] = [[0, "listen"], [MANY - 2, "browsUp"], [MANY + 4, "read"], [VIS - 2, "smug"], [REM - 2, "scheme"], [REM + 5, "shifty"], [REM + 28, "scheme"]]; // A4: the "o" is a 6 f reaction, never lip-sync
    const e = at(f, ex);
    let look = sd * 0.9, lookY = -0.3, head = L.head * 0.7;
    if (e === "browsUp" || e === "read") { look = sd * 1.1; lookY = -1.1; head += sd * 6; }        // UP at the panel text
    if (e === "smug") { look = -sd * 1.3; lookY = 0; head -= sd * 3; }                            // side-eye to the lens
    if (f >= REM - 2 && f < REM + 5) { look = sideOf(cam, P, chipP) * 1.1; lookY = 1; head += sideOf(cam, P, chipP) * 4; } // down at the dotted chip
    if (e === "shifty") { look = Math.floor((f - REM) / 3) % 2 ? 1.3 : -1.3; lookY = 0.1; }      // 2 f glances left-right
    // A4: the pocketing plays INSIDE the MS on "removed the petrified": the chip in his hand, a 3 f lift (anticipation),
    // a glint 2 f before it goes in, into the hip pocket at REM + 6, a pat at REM + 12; the other hand on his hip
    const pat = f >= REM + 10 && f < REM + 16 ? 3 * Math.abs(Math.sin(((f - REM - 10) / 3) * Math.PI)) : 0, pk = 0;
    const pin = ramp(f, REM + 3, 3);
    const hipH: Hand = f < REM ? { a: "chest", dx: 2, dy: 10, hold: "chip" } : f < REM + 3 ? { a: "chest", dx: 2, dy: 10 - 5 * smooth((f - REM) / 3), hold: "chip" }
      : { a: "chest", b: "pocket", k: pin, dy: 5 * (1 - pin) - pat, hold: f < REM + 6 ? "chip" : null };
    put(out, cam, a, P, { ...idle(f, i, P), tilt: L.sway * 1.3 + 0.7 * L.shift, expr: e, facing: e === "smug" ? (-sd as -1 | 1) : sd, look, lookY, headTilt: head, breath: L.breath * 1.3,
      face: { fdy: e === "browsUp" ? -4 : 0 }, blink: blinkAt(f, i, swapsOf(ex), [MANY - 2]), flutter: flutAt(f, i),
      hands: sd < 0 ? [{ a: "hang", b: "pocket", k: pk }, hipH] : [hipH, { a: "hang", b: "pocket", k: pk }] });
    fx(out, "chip9", 96, 96, (p) => fxChip(p, 14, true, false, 1.5), chipP, 0.09, 0.08);
    { const ho = { ...idle(f, i, P), facing: (e === "smug" ? -sd : sd) as -1 | 1, seed: seedOf(i), hands: (sd < 0 ? [{ a: "hang" }, hipH] : [hipH, { a: "hang" }]) as [Hand, Hand] };
      const hp = handAt(a.o, ho, sd < 0 ? 1 : 0); glintAt(out, toWorld(cam, P, 1, [hp[0], hp[1] - 40], 0.12), f, REM + 4, 0.16, 6); }
  }
  // asst2 kneels far back on the LONG LOGS path: a pencil tick ON each beat ("Please", "Another", "Many"), the stopwatch
  // up once (click), glances at the readers between ticks
  { const a = A.asst2, i = a.i, p = tt([-0.3, 0, -6.2]), L = life(f, i), sB = sideOf(cam, p, tt([0.8, 0, 0.8])), sA = sideOf(cam, p, tt([-2.45, 0, 0.9]));
    const beats = [BEAT.please1, BEAT.another, BEAT.many1, PW(15, "removed")], tick = beats.some((b) => f >= b && f < b + 3);
    const gl = mod(Math.floor(f / 26), 3), turn = f >= 1040 || gl === 1, lookAt = f >= BEAT.another ? sB : sA;
    put(out, cam, a, p, { mode: "kneel", expr: turn ? "smile" : "focus", facing: turn ? lookAt : 1, look: turn ? lookAt * 1.3 : 0.6, lookY: turn ? 0 : 1, blink: blinkAt(f, i), breath: L.breath * 1.3, tilt: 6 + L.sway * 0.8,
      headTilt: L.head * 0.6, hands: [{ a: "show", dy: 6, hold: "tally", ang: 10 }, f >= 960 && f < 974 ? { a: "show", dx: -10, dy: -18, hold: "stopwatch", n: Math.floor(f / 30) + (f >= 965 && f < 968 ? 1000 : 0) } : { a: "show", dx: -14, dy: 10 - (tick ? 6 : 0), hold: "pencil", ang: -30 }] }); }
  // a distant couple strolls the JASPER path behind Sign A: one points at a log, one lifts a camera (flash ~905)
  { const c1 = TOUR(5, {}, "9c"), c2 = TOUR(1, {}, "9c"), q1 = tt([-4.2 + 0.4 * ((f - 872) / FPS), 0, -17]), q2 = tt([-3.5 + 0.4 * ((f - 872) / FPS), 0, -17.4]);
    const up = ramp(f, 898, 4) * (1 - ramp(f, 912, 4));
    put(out, cam, c1, q1, { ...idle(f, c1.i, q1), facing: 1, expr: "grin", blink: blinkAt(f, c1.i), hands: [{ a: "hang" }, { a: "point", dy: -6 }] });
    put(out, cam, c2, q2, { ...idle(f, c2.i, q2), facing: -1, expr: up > 0.5 ? "focus" : "smile", blink: blinkAt(f, c2.i), hands: [{ a: "hang", b: "eye", k: up, hold: up > 0.3 ? "camera" : null }, { a: "hang", b: "eye", k: up, dx: 4 }] });
    flash(out, toWorld(cam, q2, 1, [300, 300], 0.2), f, 905, 2, 0.45); }
  // a tourist far up the LONG LOGS path pockets one of the marked chips in the closing wide (1033-1038)
  { const a = TOUR(4, {}, "9b"), p = tt([0.9, 0, -4.4]), cr = crouchAt(f, 1033, 3, 4), sd2 = sideOf(cam, p, tt([0, 0, 0]));
    put(out, cam, a, p, { ...idle(f, a.i, p), crouch: cr.k, facing: sd2, expr: f >= 1031 ? "shifty" : "smile", look: f >= 1031 ? (Math.floor(f / 3) % 2 ? 1.3 : -1.3) : sd2, blink: blinkAt(f, a.i),
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
    } else { if (f >= BEAT.many1 - 1 && f < BEAT.many1 + 20) c.head = sideOf(cam, pB, tt([0.8, 0, 0.8])); raven(out, cam, f, pB, c, 3); }
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
const CROWD10: [number, V3, Partial<Outfit>, number][] = [
  [0, tt([0.72, 0, 0.95]), { glasses: "sun", shirt: "#f07a2a" }, 1.0],
  [6, tt([-0.88, 0, 0.4]), { hairStyle: "none", hat: "visor", hatCol: "#f4f1ea", shirt: "#f2665a", moustache: "#b8b8c2", print: "palm" }, 0.97],
  [5, tt([1.08, 0, 0.35]), { hat: "bucket", hatCol: "#f2c230", shirt: "#f59b2e", print: "pine" }, 0.98],
  [3, tt([-0.62, 0, 0.95]), { hat: "bucket", hatCol: "#f4f1ea", shirt: "#f4a26b", sunUp: false, glasses: null, print: "palm" }, 1.04],
  [7, tt([1.45, 0, 1.0]), { hat: "visor", hatCol: "#f4f1ea", shirt: "#ee7330", print: "pine" }, 1.02],
];
const results = (out: Stage, cam: CamInfo, f: number) => {
  {
    const a = TOUR(1, {}, "A"), P = tt([-2.2, 0, 0.6]), i = a.i, sd = sideOf(cam, P, SIGN_A), L = life(f, i);
    const chip0: V3 = tt([-2.58, GY + 0.04, 0.42]), PUT = BEAT.pct2, PICK = PUT - 16, SEE = PICK + 5;
    const c1 = crouchAt(f, PICK, 4, 5), c2 = crouchAt(f, PUT, 5, 4), cr = f < PUT - 6 ? c1 : c2;
    const holding = f >= PICK && f < PUT;
    const hand: Hand = { a: holding ? "chest" : f >= PUT + 9 ? "behind" : "hang", b: "ground", k: cr.reach, dx: 4, dy: holding && cr.reach < 0.1 ? -4 : 0, hold: holding ? "chip" : null };
    const ex: K<Expr>[] = [[0, "smile"], [PICK + 1, "grin"], [SEE, "browsUp"], [PUT - 4, "worry"], [PUT + 2, "guilty"], [PUT + 6, "whistle"]];
    const e = at(f, ex);
    let look = sd * 0.7, lookY = 1, head = L.head * 0.6;
    if (f < PICK - 8) { look = sd * 0.3; lookY = 0.9; }                         // eyeing the chip on the ground
    if (f >= PICK + 1 && f < SEE) { look = sd * 0.3; lookY = 0.6; }            // admiring it in his hand
    if (f >= SEE && f < PUT - 4) { look = sd * 1.6; lookY = -1.25; head += sd * 7 * clamp01(settle(f, SEE, 1.5)); } // A4: a 1-2 f head SNAP up onto the red bar
    if (f >= PUT - 4 && f < PUT - 2) { look = 0; lookY = 0; }                  // the worried look to the lens
    if (f >= PUT - 2 && f < PUT + 4) { look = sd * 0.6; lookY = 1; }
    if (f >= PUT + 6) { look = Math.floor((f - PUT - 6) / 10) % 2 ? sd * 1.3 : -sd * 0.7; lookY = Math.floor((f - PUT - 6) / 10) % 2 ? -0.7 : -0.4; } // side-eye back at the sign
    const startle = bump(f, SEE, 2);
    const free: Hand = f >= PUT + 10 ? { a: "behind" } : f >= PUT + 6 ? { a: "chest", dx: 4 * Math.sin(f * 1.6) } : { a: "hang" };
    const po: PersonOpts = { ...idle(f, i, P), crouch: cr.k, expr: e, facing: sd, look, lookY, squash: -0.5 * startle, headTilt: head, breath: L.breath * 1.3,
      blink: f >= PUT + 6 ? (Math.floor((f - PUT - 6) / 10) % 2 ? 0 : 1) : blinkAt(f, i, [PUT - 5, PUT + 2], [SEE]), tilt: L.sway * 1.1,
      face: { blush: e === "guilty" ? 1 : 0, fdy: lookY < 0 ? -6 : 0, fdx: e === "browsUp" ? sd * 6 : 0 }, flutter: flutAt(f, i),
      hands: sd < 0 ? [hand, free] : [free, hand] };
    const poA = put(out, cam, a, P, po, { rise: 0.02 * startle });
    if (f < PICK) fx(out, "chipA", 128, 128, (p) => fxChip(p, 5, true), chip0, 0.13, 0.11);
    else if (f >= PUT) fx(out, "chipA", 128, 128, (p) => fxChip(p, 5, true), chip0, 0.13, 0.11);
    { const [hx, hy] = headAt(a.o, { ...po, seed: seedOf(i), light: light2D(cam) }), t = f - SEE; // the "!" rides his head, held 9 f
      if (t >= 0 && t < 9) { const k = Math.floor(t) === 0 ? 0.7 : Math.floor(t) === 1 ? 1.15 : 1;
        fx(out, "bang", 128, 256, (p) => fxBang(p), toWorld(cam, P, 1, [hx + sd * 60, hy - 205], 0.1), 0.08 * k, 0.16 * k, { rot: -0.15 * sd }); } }
    sweatHead(out, cam, a, P, { ...po, seed: seedOf(i), light: light2D(cam) }, -sd, f, PUT - 4, PUT + 6);
    puff(out, [chip0[0], GY, chip0[2]], f, PUT, 6);
    if (f >= PUT + 6) notes(out, cam, P, headAt(a.o, poA), f, [PUT + 12, PUT + 20, PUT + 28], -sd);
    // a ranger far back sees the put-back: a slow approving nod and a hat tip
    if (f < BEAT.withB - 2) { const rp = tt([-6.2, 0, -9]), Lr = life(f, A.ranger.i), nd = bump(f, PUT + 8, 10), tip = bump(f, PUT + 16, 10), sr2 = sideOf(cam, rp, P);
      put(out, cam, A.ranger, rp, { breath: Lr.breath, tilt: Lr.sway, shift: Lr.shift, headTilt: Lr.head, expr: nd > 0.2 || tip > 0.2 ? "nod" : "calm", nod: nd, facing: sr2, look: sr2, blink: blinkAt(f, A.ranger.i),
        hatLift: 10 * tip, hands: [{ a: "hip" }, tip > 0.05 ? { a: "hip", b: "head", k: tip } : { a: "hip" }] }); }
  }
  const B = BEAT.pct8, G = B - 27; // (A3: every crowd frame below is keyed to BEAT.pct8, so a voice re-time follows) // G: the crowd's hands touch the chips (in unison)
  CROWD10.forEach(([v, PB, tw, scl], n) => {
    // A4: after the cha-ching the white-hat pair scurries off screen-left with the loot (their faces never reach the
    // caption band in the 'You see,' pull-back)
    const lv = n === 1 || n === 3 ? smooth((f - (B + 10)) / 14) : 0, P: V3 = [PB[0] - 1.0 * lv, 0, PB[2] + 0.1 * lv];
    const a = TOUR(v, tw, "B"), i = a.i, off = 0, g0 = G + off; // A4: ONE synchronised group pocketing (no stagger)
    const sd = sideOf(cam, P, tt([0, 0, 0])), out_ = -sd as -1 | 1, L = life(f, i);
    // crouch arc: 2 f rise, 5 f down, 1 f contact, 4 f up (overshoot); the hand: ground -> chest (chip up, glint) ->
    // the hip pocket (2 f pat) -> rest
    const cr = crouchAt(f, g0, 1, 5);
    const CH = (B - 21) + off, PK = (B - 13) + off; // chips up on B - 21, into the pockets with a pat in unison on "almost" (B - 11)
    const base: Hand["a"] = f < CH ? "hang" : f < PK ? "chest" : f < B + 8 ? "pocket" : n % 2 ? "hip" : "hang";
    const hand: Hand = f >= g0 && f < CH ? { a: "chest", b: "ground", k: cr.reach, dy: -8 * (1 - cr.reach) } : f >= PK - 2 && f < PK + 2 ? { a: "chest", b: "pocket", k: smooth((f - PK + 2) / 4) } : { a: base, b: "ground", k: cr.reach, dy: base === "chest" ? -10 : 0 };
    if (f >= PK + 2 && f < PK + 4) hand.dy = (hand.dy ?? 0) - 3 * bump(f, PK + 2, 2);   // the pat
    const held = f >= g0 && f < PK + 1;
    hand.hold = held ? "chip" : null;
    const ex: K<Expr>[] = [[0, "smug"], [(B - 48), "shifty"], [(B - 32), "smug"], [G - 6, "focus"], [CH - 2, "grin"], [PK, "shifty"], [(B - 3), "smug"], [B - 2, "grin"]];
    const e = at(f, ex);
    let look = 0, lookY = 0, head = L.head * 0.7;
    const nb = n === 0 ? CROWD10[1][1] : CROWD10[n - 1][1], toNb = sideOf(cam, P, nb);
    if (f < (B - 48)) { const g = gazeCycle(f, i, [[toNb * 1.3, 0, toNb], [sd * 0.8, -0.6, sd], [sd * 0.6, 1, sd]]); look = g[0]; lookY = g[1]; }
    else if (f < (B - 32)) { const sn = Math.floor((f + n) / 4) % 2 ? 1 : -1; look = sn * 1.35; head += sn * 4; } // A4: every head shifty on "many past visitors"
    else if (f < G - 6) { look = 0; lookY = 0.4; }
    else if (f < CH) { look = sd * 0.5; lookY = 1; }
    else if (f < PK) { look = out_ * 0.3; lookY = 0.5; }
    else if (f < (B - 9)) { look = 0; lookY = 0.3; }
    else if (f < (B - 6)) { look = -1.35; lookY = 0; head -= 4; }                 // every head snaps eyes-left ...
    else if (f < (B - 3)) { look = 1.35; lookY = 0; head += 4; }                  // ... then right (mirrors shot 3)
    const nod = bump(f, (B - 32), 5);
    let other: Hand = n % 2 ? { a: "hip" } : { a: "hang" };
    if (n === 0 && f >= (B - 41) && f < (B - 29)) other = { a: "raise", shape: f < (B - 35) ? "f1" : f < (B - 31) ? "f2" : "f3", dy: -4 * bump(f, f < (B - 35) ? (B - 39) : f < (B - 31) ? (B - 35) : (B - 31), 3) };
    const photo = n === 3 && f >= (B - 45) && f < (B - 34);
    if (photo) other = { a: "eye", hold: "camera" };
    if (f >= B + 1) {
      if (n === 2 || n === 4) other = { a: "raise", dx: (n === 2 ? 1 : -1) * sd * 18, dy: -6 * bump(f, B + 3, 4), shape: "palm" };  // high five
      if (n === 1) other = { a: "head", dy: -4 * bump(f, B + 2, 8) };                                                                 // visor tip
      if (n === 0) other = { a: "selfie", hold: "camera", ang: -20 };                                                                 // group selfie
    }
    const hands: [Hand, Hand] = out_ < 0 ? [hand, other] : [other, hand];
    const walkOff = lv > 0.02 && lv < 0.99;
    const po: PersonOpts = { ...idle(f, i, P), crouch: cr.k, expr: photo ? "focus" : walkOff ? "smug" : e, facing: walkOff ? -1 : sd, look: walkOff ? 1.2 : look, lookY, headTilt: head, nod, breath: L.breath * 1.3,
      ...(walkOff ? { mode: "walk" as const, phase: lv * 4, lift: 1.2 } : {}),
      blink: blinkAt(f, i, swapsOf(ex), [B - 2]), tilt: L.sway * 1.1, face: { blush: e === "grin" ? 0.5 : 0 }, flutter: flutAt(f, i), noCam: photo, hands };
    put(out, cam, a, P, po, { scale: scl });
    if (f < g0) fx(out, `chipB${n}`, 128, 128, (p) => fxChip(p, 10 + n, true), groundAt(cam, a, P, sd, out_ < 0 ? 0 : 1, out_ * 7), 0.12, 0.1);
    const ho = { ...po, seed: seedOf(i), light: light2D(cam) };
    if (f >= CH && f < CH + 6) { const hp = handAt(a.o, ho, out_ < 0 ? 0 : 1); glintAt(out, toWorld(cam, P, scl, [hp[0], hp[1] - 40], 0.15), f, CH, 0.16, 6); }
    if (f >= PK + 2 && f < PK + 8) { const hp = handAt(a.o, ho, out_ < 0 ? 0 : 1); puff(out, toWorld(cam, P, scl, [hp[0], hp[1] + 10], 0.12), f, PK + 2, 6); }
    if (n === 0) flash(out, toWorld(cam, P, scl, handAt(a.o, { ...ho, hands: [{ a: "selfie" }, { a: "selfie" }] }, out_ < 0 ? 1 : 0), 0.2), f, B, 3, 0.3);
    if (photo) flash(out, toWorld(cam, P, scl, handAt(a.o, ho, out_ < 0 ? 1 : 0), 0.25), f, (B - 39), 2, 0.27);
  });
  // a ranger far back (z -10) snaps his head toward the crowd on the cha-ching (a double take)
  if (f >= BEAT.withB - 8) { const rp = tt([1.6, 0, -10]), Lr = life(f, A.ranger.i), snap = f >= B, dbl = f >= B && f < B + 3;
    put(out, cam, A.ranger, rp, { breath: Lr.breath, tilt: Lr.sway, shift: Lr.shift, headTilt: Lr.head + (snap ? -6 : 0), expr: snap ? (dbl ? "calm" : "browsUp") : "calm",
      facing: snap && !dbl ? -1 : 1, look: snap && !dbl ? -1.3 : 0.5, blink: blinkAt(f, A.ranger.i, [B]), hands: [{ a: "hip" }, { a: "hip" }] }); }
  // A3: asst2 at the LONG LOGS head clicks a hand counter on each pocketing and raises an eyebrow at the crowd
  { const a = A.asst2, i = a.i, p = tt([1.95, 0, -1.7]), L = life(f, i), sc2 = sideOf(cam, p, tt([0.3, 0, 0.8]));
    const clk = f >= (B - 17) && f < (B - 7) && mod(f - (B - 17), 2) === 0, n = clamp(Math.floor((f - (B - 19)) / 2), 0, 5);
    put(out, cam, a, p, { ...idle(f, i, p), expr: f >= (B - 17) ? "skeptic" : "focus", facing: sc2, look: sc2 * 1.2, lookY: f >= (B - 17) ? 0 : 0.6, blink: blinkAt(f, i), breath: L.breath * 1.3,
      hands: [{ a: "show", dy: -6 - (clk ? 2 : 0), hold: "counter", n: 12 + n + (clk ? 1000 : 0) }, { a: "show", dx: -10, dy: 8, hold: "tally", ang: 12 }] }); }
  // A3: the raven on Sign B's LED watches the crowd (head snaps on the chips-up and the eye snaps), startles on the
  // cha-ching (a 2 f jump) and flaps off screen right, one feather falling for 20 f
  { const pB = LED_TOP(SIGN_B), c: RavenX = {}, toC = sideOf(cam, pB, tt([0.3, 0, 0.9]));
    if (f >= (B - 21) && f < (B - 13)) { c.head = toC; c.dip = 1; } else if (f >= (B - 13) && f < B) c.head = f < (B - 9) ? -1 : 1;
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
const permission = (out: Stage, cam: CamInfo, f: number) => {
  const F = BEAT.permission, T = BEAT.thieves;
  // A3: the two near thieves FLANK Sign B (red cap beside the left post, the pigtail tourist beside the right post), so
  // neither head ever sits in the line of sight to the stamp mark (checked with LEAD's centred final key: >= 60 px clear)
  const people: [number, V3][] = [[0, tt([-0.58, 0, 0.7])], [5, tt([0.62, 0, 0.62])], [7, tt([1.9, 0, 0.2])]];
  const lands = [1547, 1550, 1554];
  people.forEach(([v, P], n) => {
    const base = TOUR(v, {}, "S"), a: Act = { ...base, o: tintFit(base.o, PLUM), key: `${base.key}plum` }, i = a.i, L = life(f, i);
    const sd = sideOf(cam, P, SIGN_B), t0 = lands[n] - 5;
    const pk = ramp(f, t0, 5);
    // A3: the wince is only 3 f (F-2..F), the grin + thumbs-up from F+2 after a 2 f anticipation dip (a gleeful beat)
    const ex: K<Expr>[] = [[0, "scheme"], [t0 - 3, "shifty"], [T - 2 + 6, "smirk"], [F - 2, "wince"], [F + 1, n === 0 ? "laugh" : "grin"], [F + 18, "grin"]];
    const e = at(f, ex);
    const crouch = bump(f, F - 3, 3) + 0.8 * bump(f, F, 2), hop = f >= F + 2 && f < F + 7 ? Math.sin((Math.PI * (f - F - 2)) / 5) : 0;
    const PH = F + 13, photo = n === 1 && f >= PH - 6 && f < PH + 10;      // she raises the camera 6 f before the shot
    // A4: the red cap's belly laugh: a 5.5 Hz head + torso bob decaying over 15 f, a point at the stamp mark on F + 6
    const lb = n === 0 && f >= F + 1 && f < F + 17 ? Math.abs(Math.sin(TAU * 5.5 * ((f - F - 1) / FPS))) * (1 - (f - F - 1) / 16) : 0;
    const ptM = n === 0 && f >= F + 5 && f < F + 10;
    const lean = n === 1 ? 6 * settle(f, F - 2, 6) : 0;
    const pump = n === 0 && f >= F + 10 && f < F + 22 ? 6 * Math.abs(Math.sin(((f - F - 10) / 4) * Math.PI)) : 0;
    const thumb: Hand = ptM ? { a: "point", dy: -10 } : n === 0 && f >= F + 10 ? { a: "raise", dy: 8 - pump } : { a: "thumb", shape: "thumb", dy: -3 * bump(f, F + 2, 4) };
    // the chip: held at the waist (lifted 3 f, elbow out), into the hip pocket on the pocket SFX
    const h0: Hand = f < t0 + 6 ? { a: "waist", b: "pocket", k: pk, dx: -6 * (1 - pk), dy: -5 * bump(f, t0 - 3, 3), hold: pk < 0.8 ? "chip" : null, bend: 1.5 }
      : photo ? { a: "eye", hold: "camera", dy: 5 * bump(f, PH - 8, 2) } : f >= F + 2 ? thumb : { a: "hang" };
    const h1: Hand = photo ? { a: "eye", dx: 4 } : f >= F + 2 && n === 2 ? thumb : n === 0 ? { a: "hip" } : { a: "hang" };
    // gaze: side-eye saccades while pocketing, then scheming looks at each other, a wink from the red cap
    let look = sd * 0.5, lookY = 0;
    if (e === "shifty") look = Math.floor((f - t0) / 3) % 2 ? 1.2 : -1.2;
    if (e === "smirk") { const other = people[n === 0 ? 1 : 0][1]; look = sideOf(cam, P, other) * 1.25; }
    const R = sideOf(cam, P, SIGN_B);
    if (photo) { look = R * 1.1; lookY = -0.2; }
    const po: PersonOpts = { ...idle(f, i, P), expr: photo ? "focus" : e, facing: photo ? R : sd, look, lookY,
      blink: blinkAt(f, i, swapsOf(ex)), squash: 0.5 * crouch + 0.5 * lb, rim: "#ffb070", rimK: 1.3, lowShade: 0.6, tilt: life(f, i).sway * 1.4 + life(f, i).shift + (n === 1 ? -R * lean : 0) - 3 * lb, headTilt: life(f, i).head + 4 * lb,
      face: { wink: n === 0 && f >= T + 6 && f < T + 14 ? 1 : 0, browUp: e === "smirk" ? [5, 0] : undefined }, hatLift: n === 0 ? 14 * bump(f, F, 4) : 0,
      noCam: photo, hands: sd < 0 ? [h0, h1] : [h1, h0] };
    put(out, cam, a, P, po, { rise: 0.1 * hop });
    if (photo) { const hp = handAt(a.o, { ...po, seed: seedOf(i), light: light2D(cam) }, sd < 0 ? 0 : 1); // at the lens, off her face (toward the sign)
      flash(out, toWorld(cam, P, 1, [hp[0] + R * 70, hp[1] - 6], 0.3), f, PH, 4, 0.25); }
  });
  // far behind Sign B on the trail: small backlit silhouettes keep pocketing chips (one gives the stamp a thumbs-up)
  [[2, 0.6, -6.5], [4, -0.5, -8.2], [6, 1.6, -9.4]].forEach(([v, x, z], n) => {
    const base = TOUR(v, {}, "S2"), a: Act = { ...base, o: tintFit(base.o, (c) => mixHex(c, "#3a2440", 0.6)), key: `${base.key}sil` }, P = tt([x, 0, z]);
    const cyc = mod(f + n * 17, 46), dn = n === 1 ? bump(cyc, 6, 16) : 0, sd = sideOf(cam, P, tt([0, 0, 0]));
    // A4: each has a job: n 0 photographs the LED (a flash ~1572), n 1 keeps pocketing (thumbs-up after the slam), n 2
    // points at the sign and startle-hops 3 f when the stamp lands
    const ph0 = n === 0 && f >= 1564 && f < 1578, hop = n === 2 && f >= F && f < F + 3 ? Math.sin((Math.PI * (f - F)) / 3) : 0;
    const h0: Hand = n === 0 ? (ph0 ? { a: "eye", hold: "camera" } : { a: "hang" }) : n === 2 ? (f < F + 10 ? { a: "point", dy: -12 + 3 * Math.sin(f * 0.4) } : { a: "hip" })
      : f >= F + 8 ? { a: "thumb", shape: "thumb" } : { a: "hang", b: cyc < 14 ? "ground" : "pocket", k: cyc < 14 ? dn : ramp(cyc, 14, 6), hold: cyc >= 10 && cyc < 18 ? "chip" : null };
    const so = put(out, cam, a, P, { ...idle(f, a.i, P), mode: dn > 0.5 ? "squat" : "stand", facing: sd, expr: n === 0 ? (ph0 ? "focus" : "smile") : n === 2 ? (hop > 0 ? "shock" : "grin") : "shifty",
      look: n === 1 ? (Math.floor(f / 5) % 2 ? 1.2 : -1.2) : sd, lookY: n === 0 && ph0 ? -0.5 : 0, blink: blinkAt(f, a.i), rim: "#ffb070", noCam: ph0, squash: -0.4 * hop,
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
    { const ang = (TAU * f) / 70, w = q(Math.sin(f * 0.8), 6);
      fx(out, `fly${w}`, 256, 128, (p) => fxFlyRaven(p, w, "#3a2440"), [pB[0] - 0.4 + 0.9 * Math.cos(ang), pB[1] + 1.3 + 0.15 * Math.sin(ang * 2), pB[2] - 6 + 1.2 * Math.sin(ang)], 0.5, 0.25, { rot: 0.3 * Math.cos(ang) }); }
  }
};

// ---------------- blueprint (pivot) ----------------
const bp = (d: V3) => add(BP.base, d);
const blueprint = (out: Stage, cam: CamInfo, f: number) => {
  // the visitor at the fork: one continuous FRONT view from "rules" (3/4 to THE RULE, skeptic, hand to chin) to the
  // crowd (a facing swap with a blink on copyEach - 2, grin), a 2 f dip, then 6-8 visible steps after the crowd (bob,
  // lean, strap + brim swing); on "Many people steal" he stops and gapes UP at the floating sign, scratches his neck,
  // weight shift, hand to chin on "warning", eyes to the crowd on "sounds", wide-eyed darting + a hop back on "everyone"
  {
    const a = A.bp, i = a.i, w0 = BEAT.copyEach + 2, stop = BEAT.manySteal - 2, L = life(f, i);
    // A3: he walks along the screen direction of the EVERYONE ELSE arrow (left -> right across the frame, >= 25 % of its
    // width before "Many"), 1.9 m/s, in a 3/4 back view, 4 % bob, a 6 deg lean into the walk
    const dir = [0.75, -0.66], s = Math.max(0, (Math.min(f, stop) - w0) / FPS) * 1.55; // A4: ~1.45 m, 8 contacts
    const P: V3 = bp([BP.person[0] + dir[0] * s, 0, BP.person[2] + dir[1] * s]);
    const walking = f >= w0 && f < stop;
    const sgn = sideOf(cam, P, bp(BP.signFloat)), crowdS = sideOf(cam, P, bp(BP.crowd));
    let view: "front" | "back" = "back", facing: -1 | 0 | 1 = walking ? sideOf(cam, P, [P[0] + dir[0], 0, P[2] + dir[1]]) : 0, expr: Expr = "think", look = 0, lookY = 0, hands: [Hand, Hand] = [{ a: "hang" }, { a: "hang" }];
    let head = L.head, fdy = 0, hop = 0, squash = 0, nodU = 0;
    if (f < BEAT.copyRules - 2) { // A4: from behind he is alive: hands on hips, then his head turns 3/4 toward THE RULE as it draws
      const rs = sideOf(cam, P, bp(BP.ruleFigure)), hip = ramp(f, BEAT.youSee + 6, 4) * (1 - ramp(f, BEAT.copyRules - 8, 4));
      if (f >= BEAT.copyRules - 14) { facing = rs; head += rs * 7; lookY = 0.1; }
      if (hip > 0.02) hands = [{ a: "hang", b: "hip", k: hip }, { a: "hang", b: "hip", k: hip }];
    }
    if (f >= BEAT.copyRules - 2 && f < BEAT.copyEach - 2) { view = "front"; facing = -1; expr = "skeptic"; look = -1.2; hands = [{ a: "chin" }, { a: "hang" }]; }
    else if (f >= BEAT.copyEach - 2 && f < w0 + 2) { view = "front"; facing = 1; expr = "smile"; look = 1.2; }
    else if (f >= stop) {
      view = f < stop + 2 ? "back" : "front"; facing = sgn; // A4: a 2 f back-3/4 in-between before the front view
      const E = BEAT.everyone - 2, W2 = BEAT.warning2 - 2, SD = BEAT.sounds - 2;
      const ST = PW(22, "steal"), gulpK = bump(f, ST, 2);
      if (f < ST) { expr = "goggle"; look = sgn * 0.5; lookY = -1.1; head += sgn * 3; fdy = -7; nodU = -0.6; }   // gapes UP at the floating sign (12 deg chin lift)
      else if (f < W2) {
        expr = "goggle"; look = sgn * 1.0; lookY = -0.9; head += sgn * 5; fdy = -4; squash = 0.5 * gulpK;           // A4: eyes stay UP-LEFT on the panel, a gulp
        const nk = settle(f, 1318, 6) * (1 - ramp(f, 1334, 6)) - 0.15 * bump(f, 1310, 8);   // a hand to the back of his neck
        hands = [{ a: "hang" }, nk > 0.02 ? { a: "hang", b: "head", k: clamp01(nk), dx: 6, dy: 14 + 3 * Math.sin(f * 1.2), maxLen: 1.25 } : { a: "hang" }];
      } else if (f < SD) { expr = "skeptic"; look = 0.15 * sgn; lookY = 0.05; head += sgn * 2; fdy = 0; hands = [{ a: "chin" }, { a: "hang" }]; } // A4: "warning." a skeptical glance down to the lens
      else if (f < E) { expr = "think"; facing = crowdS; look = crowdS * 1.3; lookY = 0.1; head += crowdS * 5; hands = [{ a: "chin", b: "hang", k: ramp(f, SD, 5) }, { a: "hang" }]; }
      else {
        expr = "wide"; facing = crowdS; look = Math.floor((f - E) / 8) % 2 ? 1.3 : -1.3; lookY = 0.2;
        squash = 0.45 * bump(f, E + 1, 3); hop = f >= E + 3 && f < E + 9 ? Math.sin((Math.PI * (f - E - 3)) / 6) : 0;
        hands = [{ a: "hang", dy: -10 * hop }, { a: "hang", dy: -10 * hop }];
      }
    }
    const dip = 0.4 * bump(f, BEAT.copyEach - 1, 3);
    const phase = s / 0.36, shiftK = f >= 1325 && f < 1342 ? -1 : L.shift;
    const back0 = stop + 1 + 0.06 * hop;
    put(out, cam, a, P, { view, mode: walking ? "walk" : "stand", phase, lift: 1.0, breath: L.breath * 1.6, tilt: (walking ? 4 * (facing || 1) : 0) + L.sway * 1.5 + 0.9 * shiftK, shift: walking ? 0 : shiftK,
      headTilt: head, facing, expr, look, lookY, nod: nodU, squash: dip + squash, face: { fdy }, flutter: walking ? Math.sin(TAU * phase) : 0.4 * flutAt(f, i),
      blink: blinkAt(f, i, [BEAT.copyRules - 2, BEAT.copyEach - 2, BEAT.warning2 - 2, BEAT.sounds - 2, BEAT.everyone + 7, BEAT.everyone + 15, BEAT.everyone + 23], [stop, BEAT.everyone - 2]), hands }, { rise: 0.1 * hop });
    void back0;
    if (f >= stop) sweat(out, cam, P, -1, f, stop + 1, 1e9, 18, 330, 150); // outside the head outline (never on the goggle eye)
    fx(out, "bpShadow", 128, 128, (p) => fxSoftBlob(p, "14,42,102", 0.55), [P[0], 0.015, P[2]], 0.8, 0.38, { flat: true, soft: true, rot: Math.atan2(-CAMR.z, CAMR.x) }); // A4: a navy contact pool on the blueprint floor
  }
  // THE RULE: one lonely chalk figure looking left / right, tapping a foot; checks a wristwatch and shrugs on "We copy
  // each other". EVERYONE ELSE: a crowd that pops in 3 per frame and streams along the wide arrow (1.0 m/s with a walk
  // bob and arm swing, wrapping); one waves the visitor over, two snap photos (flash sparkles); 8 of them do the
  // pocketing gesture on "Many people steal", placed to the RIGHT of the floating sign
  const man = (key: string, p: V3, h: number, swing: number, chip: boolean, pocket = 0, look = 0, tap = 0, pose = 0) =>
    fx(out, `chalk${key}${q(swing, 4)}${chip ? "c" : ""}${q(pocket, 4)}${look}${q(tap, 2)}p${pose}`, 128, 256, (pp) => fxChalkMan(pp, q(swing, 4), chip, "#f4f8ff", q(pocket, 4), look, q(tap, 2), pose), [p[0], p[1] + h / 2, p[2]], h / 2, h);
  if (f >= BEAT.copyRules - 2) {
    const rp = BEAT.copyEach - 2, rpose = f >= rp && f < rp + 12 ? 1 : f >= rp + 12 && f < rp + 22 ? 2 : 0;
    man("r", bp(BP.ruleFigure), 1.05, 0.15, false, 0, rpose ? 0 : Math.floor(f / 36) % 2 ? 1 : -1, rpose ? 0 : mod(f, 8) < 4 ? 1 : 0, rpose);
  }
  const n = clamp(Math.floor((f - (BEAT.eachOther - 4)) * 3), 0, 27);
  const ad = [Math.sin(BP.crowdArrow.dir), -Math.cos(BP.crowdArrow.dir)], an = [-ad[1], ad[0]];
  for (let k = 0; k < n; k++) {
    const sL = 1.9 + mod(3.4 * hh(k, 61) + 1.0 * ((f - BEAT.eachOther) / FPS), 3.4), lat = k < 8 ? 0.55 + 0.35 * hh(k, 62) : (hh(k, 62) - 0.5) * 1.8;
    const edge = Math.min(1, (sL - 1.9) / 0.4, (5.3 - sL) / 0.4);                  // shrink in / out at the stream's ends
    const p = bp([ad[0] * sL + an[0] * lat, 0, ad[1] * sL + an[1] * lat]);
    const sw = Math.sin(f * 0.7 + k * 1.7), pocket = k < 8 ? bump(f, BEAT.manySteal + k * 2, 10) : 0;
    const wave = (k === 3 || k === 9 || k === 14 || k === 20) && f >= BEAT.copyEach + 2 && f < BEAT.manySteal && mod(f + k * 5, 24) < 12; // A3: they wave the visitor over
    const pose = wave ? 3 : (k === 12 || k === 17) && mod(f + k * 7, 40) < 8 ? 4 : 0;
    const hgt = (0.62 + 0.12 * hh(k, 63)) * clamp01(edge);
    const chip = k % 3 === 1 && pocket < 0.6 && !pose;                      // A3: tiny rainbow chips in hand (a 1 f sparkle)
    man("c", [p[0], 0.05 * Math.abs(sw), p[2]], hgt, pose ? 0 : sw, chip, pocket, pocket > 0.3 ? (k % 2 ? 1 : -1) : pose === 3 ? -1 : 0, 0, pose);
    if (chip && mod(Math.floor(f) + k * 11, 30) < 2) glintAt(out, [p[0] + 0.15 * hgt, hgt * 0.62, p[2] + 0.04], f, Math.floor(f) - mod(Math.floor(f) + k * 11, 30), 0.12, 2); // (floor: fractional clock)
    if (pose === 4 && mod(Math.floor(f) + k * 7, 40) >= 4 && mod(Math.floor(f) + k * 7, 40) < 6) flash(out, [p[0], hgt * 0.85, p[2] + 0.05], f, Math.floor(f) - mod(Math.floor(f) + k * 7, 40) + 4, 2, 0.22);
  }
  // a chalk tumbleweed rolls past the lonely rule figure on "We copy each other"
  { const t = f - BEAT.copyEach; if (t >= 0 && t < 60) { const rf = bp(BP.ruleFigure), x = rf[0] - 1.6 + 0.8 * (t / FPS), rot = Math.floor(t / 2) * 0.6;
    fx(out, `weed${q(rot % TAU, 5)}`, 128, 128, (p) => fxChalkWeed(p, q(rot % TAU, 5)), [x, 0.4 + 0.12 * Math.abs(Math.sin(t * 0.3)), rf[2] + 0.4], 0.8, 0.8); } }
  // a chalk raven flaps across above the crowd during the hold (a callback to the trailhead raven)
  // A4: a chalk LINE raven (unfilled strokes, 3 wing drawings on 2s) flying HIGH, above the FIG. 1 title
  { const t = f - PW(22, "sound"); if (t >= 0 && t < 40) { const w = [1, 0, -0.7][Math.floor(t / 2) % 3], c = bp([-2.6 + 0.16 * t, 5.05 + 0.12 * Math.sin(t * 0.2), -4.2]);
    fx(out, `flyc${w}`, 256, 128, (p) => fxFlyRaven(p, w, "#f4f8ff", 1, true), c, 1.5, 0.75, { rot: -0.06 }); } }
};

// ---------------- classroom (analogy) ----------------
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
      let tip = chalkTip(f), lifted = 0;
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
      const k3 = ramp(f, C - 9, 5) * (1 - ramp(f, endW + 3, 5));
      if (k3 > 0) { const [ax, az] = axisX(cam, Pw); Pw = [Pw[0] - ax * 0.35 * k3, 0, Pw[2] - az * 0.35 * k3]; }
      const jig = 1.5 * Math.sin(TAU * 6 * (f / FPS));
      // A3: lines 1-2 sit high on the board: a tiptoe rise (+5 cm) and a 4 deg up-lean
      const hi = tip ? clamp01((tip[1] - 1.75) / 0.25) : 0, toe = 0.05 * smooth(hi);
      const lean = (tip ? clamp((toDesignRay(cam, Pw, 1, tip)[0] - 300) / 40, -1, 1) * 5 : 0) + 4 * smooth(hi) - 5 * k3;
      const tiltT = L.sway * 0.5 + 3 + lean, u = 2.4;
      // A4: the chalk's TIP (not the hand) sits on the glyph's stroke end: the hand is offset back along the chalk
      const onTip = (w: V3, y0 = 0): P2 => { const d = toDesignRay(cam, [Pw[0], y0, Pw[2]], 1, w), ar = ((20 + tiltT) * Math.PI) / 180; return [d[0] - 15 * u * Math.sin(ar), d[1] + 15 * u * Math.cos(ar)]; };
      const hd: Hand = rising ? { a: "board", b: onTip(tip!, toe), k: clamp01(rk), dy: rk < 0 ? -24 * rk : -8 * Math.max(0, rk - 1) * 10, hold: "chalk", ang: 20, maxLen: 2.1 }
        : tip && f < endW - 1 ? { a: onTip(tip, toe), dy: jig - 12 * lifted, hold: "chalk", ang: 20, maxLen: 2.1 }
          : f >= endW - 1 && f < endW + 9 ? { a: onTip(last), dy: 10 * bump(f, endW - 1, 2) - 5 * tapK, hold: "chalk", ang: 20, maxLen: 2.1 }
            : { a: "board", hold: "chalk", ang: 20 };
      put(out, cam, a, Pw, { view: glance ? "front" : "back", facing: glance ? 1 : 0, expr: "stern", look: 1.3, lookY: 0.1, blink: blinkAt(f, i, [BEAT.half - 1, BEAT.half + 11]),
        breath: L.breath, tilt: tiltT, shift: L.shift, headTilt: L.head * 0.5 + 3 + (glance ? 8 : 0) - 4 * k3,
        squash: 0.3 * bump(f, endW + 2, 3) - 0.6 * smooth(hi) + 0.25 * bump(f, T0 - 7, 2), face: glance ? { browUp: [0, -2] } : {}, hands: [{ a: "hang" }, hd] }, { rise: toe });
      puff(out, [last[0], last[1] - 0.06, last[2] + 0.05], f, endW + 1, 8);
      puff(out, [last[0], last[1] - 0.06, last[2] + 0.05], f, endW + 5, 8);
      { const t = f - endW; if (t >= 0 && t < 12) { // the chalk snaps on the full-stop tap: a tiny piece flies off
        fx(out, "chalkbit", 96, 96, (p) => { p.poly([[30, 40], [66, 36], [70, 56], [34, 60]], "#fbfaf4", 6); }, [last[0] + 0.03 * t, last[1] - 0.004 * t * t + 0.02, last[2] + 0.08], 0.035, 0.035, { rot: t * 0.7 }); } }
      if (tip && !lifted && !rising && mod(Math.floor(f), 3) === 0) puff(out, [tip[0], tip[1] - 0.03, tip[2] + 0.04], f, Math.floor(f), 3);
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
    const dz = Math.sin(f * 0.9) * 3;
    put(out, cam, a, P, { view: front ? "front" : "back", facing: whisper ? side : copy ? -1 : peek > 0 ? 1 : 0, mode: "chair",
      expr: yawn ? "wide" : peek > 0 ? "shifty" : copy ? "shifty" : whisper ? "scheme" : chew ? "focus" : n % 2 ? "listen" : "calm",
      look: peek > 0 ? 1.3 : copy ? -1.3 : hh(n, 3) - 0.5, lookY: peek > 0 ? 0.8 : copy ? 0.9 : doodle ? 1 : -0.2, squash: sink - (yawn ? 0.3 * bump(f, BEAT.everybody + 6, 14) : 0), blink: yawn ? 1 : blinkAt(f, i), breath: L.breath * 1.2, shift: L.shift,
      tilt: L.sway * 0.6 + (peek + lateLean) * 10 + (whisper ? side * 6 : 0) + (copy ? -8 : 0), headTilt: L.head + (n % 2 ? 3 : -3),
      hands: yawn ? [{ a: "lap", b: "up", k: bump(f, BEAT.everybody + 6, 14), dy: 10 }, { a: "lap", b: "up", k: bump(f, BEAT.everybody + 6, 14), dy: 10 }] : [chew ? { a: "mouth", hold: "pencil", ang: 70 } : whisper && side < 0 ? { a: "whisper", shape: "mitten", split: true } : doodle ? { a: "lap", dx: dz, dy: -6 + dz * 0.5, hold: "pencil", ang: -50 } : { a: "lap" },
        raise ? { a: "raise", dy: 10, shape: "palm" } : whisper && side > 0 ? { a: "whisper", shape: "mitten", split: true } : { a: "lap", dy: -4 }] });
  });
  // A4: the aisle is alive during the swing (HALF THIS CLASS reads as a full class): a pupil hands her test in at the
  // teacher's desk, one passes a folded note to another, one chews his pencil; on "hears" the note pair snap their heads
  // to the board with wide eyes (a 1 f swap)
  ([[5, [0.1, 0, -1.75], 0], [6, [1.5, 0, -1.2], 1], [7, [2.2, 0, -1.45], 2], [8, [-0.6, 0, -1.3], 3]] as [number, V3, number][]).forEach(([v, d, act]) => {
    const a = PUP(v), P = cl(d), i = a.i, L = life(f, i), H = BEAT.hears;
    const sb = sideOf(cam, P, cl([0, 1.6, CL.board.z])), sdk = sideOf(cam, P, cl([0.75, 0.8, -2.45]));
    const mate = act === 1 ? cl([2.2, 0, -1.45]) : cl([1.5, 0, -1.2]), sm = sideOf(cam, P, mate);
    const turn = (act === 1 || act === 2) && f >= H - 1 && f < H + 14;
    let facing: -1 | 1 = act === 0 ? sdk : act === 3 ? sb : sm, expr: Expr = act === 3 ? "focus" : act === 0 ? "smile" : "scheme", look = facing * 1.2, lookY = act === 3 ? -0.3 : 0;
    if (turn) { facing = sb; expr = f < H ? "browsUp" : "wide"; look = sb * 1.3; lookY = -0.4; }
    const give = act === 1 && f < 1473, got = act === 2 && f >= 1473;
    const reach: Hand = act === 0 ? { a: "show", dy: -2 + 2 * Math.sin(f * 0.4), hold: "paper", ang: 75 * sdk }
      : act === 1 ? { a: "show", dy: 2, hold: give ? "envelope" : null } : act === 2 ? { a: "hang", b: "show", k: ramp(f, 1466, 5), dy: 2, hold: got ? "envelope" : null }
        : { a: "mouth", hold: "pencil", ang: 70, dy: Math.sin(f * 1.1) };
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
    const dl = f >= E + 1 && f < end ? (Math.floor((f - E - 1) / 6) % 2 ? 1 : -1) : 0;
    const tapK = (f >= CH - 1 && f < CH + 9 ? Math.abs(Math.sin(((f - CH + 1) / 5) * Math.PI)) : 0) + (f >= end - 4 ? Math.abs(Math.sin(((f - end + 4) / 6) * Math.PI)) : 0);
    put(out, cam, a, P, { view: front ? "front" : "back", mode: "chair", expr: e, look: dl ? dl * 1.4 : 0.3, lookY: e === "shifty" ? 0.2 : -0.2,
      blink: flip ? LID[1] : blinkAt(f, i, [...swapsOf(ex), 1510]), breath: L.breath * 1.6, tilt: L.sway * 0.6, shift: L.shift, face: { blush: dl ? clamp01((f - E - 8) / 4) : 0 },
      headTilt: L.head * 0.6 + dl * 4 + (f >= end ? 4 * ramp(f, end, 12) + 3 * Math.sin(f * 0.35) : 0),
      hands: front ? [{ a: "lap", dx: -6 }, { a: "lap", dx: 6, dy: -8 * tapK, hold: "pencil", ang: -70 }] : [{ a: "lap" }, { a: "lap", dy: -4 }] });
    if (dl) sweat(out, cam, P, 1, f, E + 10, end + 6, 18, 480);
    const pop = f < E - 1 ? 0 : f - (E - 1) < 2 ? [0.55, 1.1][Math.floor(f - (E - 1))] : 1, ph = Math.floor((f - E) / 8) % 2 ? 1 : 0;
    { const [bx, bz] = axisX(cam, P0); // A4: +20 % and ~60 px right, so the HONESTY poster stays readable beside it
      if (pop > 0) fx(out, `bubbleCheat${ph}`, 1000, 800, (p) => fxBubbleCheat(p, ph), [P0[0] + 0.02 + bx * 0.1, 1.66, P0[2] - 0.05 + bz * 0.1], 1.03 * pop, 0.83 * pop); }
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
  const pile = sr([SR.crate[0] + 0.25, 0.9, SR.crate[2] + 0.2]), dipP = sr([SR.crate[0] + 0.13, 0.82, SR.crate[2] + 0.32]), bucket = sr([SR.bucket[0], 0.71, SR.bucket[2]]);
  const sd = sideOf(cam, P, pile);
  // three scoops: the first ON "the bait wood?" (its chips are drawn here), then on "pieces" and "stole" (WORLD-INT's
  // chip arcs at BEAT.pieces + 4 + k * gap, k = 0, 1): lift (2 f anticipation), dip, swing, tip (overshoot); the blade
  // visibly carries 4 chips from the lift until the tip and spills them one per frame
  const s0 = BEAT.pieces + 4, gap = (BEAT.apology - s0) / 3, FS = [BEAT.bait + 1, BEAT.conscience + 10, s0, s0 + gap]; // A4: + one scoop inside the reveal wide
  const pD = toDesignRay(cam, P, 1, pile), dD = toDesignRay(cam, P, 1, dipP), bD = toDesignRay(cam, P, 1, bucket);
  // A3 scoop cycle (24 f): 2 f anticipation lift, 5 f reach to the pile corner, 5 f dig + load (a 1 f sparkle), 5 f arc
  // over to the bucket, the tip (4..9, WORLD-INT's chips leave the scoop at FS + 4 + k), 2 f back
  let toPile = 0, tip = 0, scoopOn = false, load = 0, tk = -99, arcUp = 0;
  for (let k = 0; k < FS.length; k++) {
    const t = f - FS[k];
    if (t >= -13 && t < 11) {
      scoopOn = true; tk = t;
      toPile = t < -11 ? -0.15 * bump(t, -13, 2) : t < -6 ? smooth((t + 11) / 5) : t < -1 ? 1 : t < 4 ? 1 - smooth((t + 1) / 5) : 0;
      arcUp = t >= -1 && t < 4 ? Math.sin(Math.PI * (t + 1) / 5) : 0;
      tip = t >= 4 && t < 9 ? smooth((t - 4) / 3) * (1 - smooth((t - 7) / 2)) + (t >= 7 && t < 9 ? 0.15 * bump(t, 7, 2) : 0) : 0;
      load = t < -4 ? 0 : t < 4 ? Math.min(4, t + 4) : clamp(8 - t, 0, 4);
    }
  }
  // A3 acting: a glance down at the bucket on "bait" (+ a blink), a knowing smirk with one brow up and a guilty
  // side-glance at the pile on "conscience", the "o" on the parcel, reads the letter, the sweat-grimace on "letters"
  const AP = BEAT.apology, LT = PW(30, "letters.");
  const ex: K<Expr>[] = [[0, "calm"], [BEAT.bait - 2, "focus"], [BEAT.bait + 10, "calm"], [BEAT.conscience - 2, "smirk"], [BEAT.conscience + 12, "calm"], [s0 - 14, "focus"], [BEAT.conscience + 15, "smug"], [BEAT.conscience + 23, "focus"], [BEAT.mailed - 2, "browsUp"], [BEAT.mailed + 8, "focus"],
    [AP - 6, "listen"], [AP + 2, "browsUp"], [AP + 8, "grimace"], [LT + 6, "shifty"], [LT + 17, "grimace"]];
  const e = at(f, ex);
  const scoopIdle: P2 = [bD[0] - sd * 10, bD[1] - 60];
  // to the pile's front-right corner (in front of the letters), the loaded scoop arcs up over to the bucket
  const tgt: P2 = [scoopIdle[0] + (dD[0] - scoopIdle[0]) * toPile, scoopIdle[1] + (dD[1] + 20 - scoopIdle[1]) * toPile - 40 * arcUp];
  const scoop: Hand = { a: f < BEAT.bait - 12 ? "waist" : tgt, hold: "scoop", ang: sd * (30 + 90 * tip), n: Math.round(load) };
  // the free hand lifts a letter off the pile and holds it up beside his face (reads it: 2 saccades, then brows up)
  const LA = AP - 10, LB = AP - 6, LC = AP - 4; // reach for a letter, pick it, hold it up to the lens beside his face
  const letterH: Hand = seq(f, [[0, tgt, 1], [LA, [pD[0] + sd * 20, pD[1] + 10], 4], [LB, [pD[0] + sd * 20, pD[1] + 24], 2], [LC, "show", 6]],
    { dx: f >= LC ? sd * 14 * ramp(f, LC, 6) : 0, dy: f >= LC ? -30 * ramp(f, LC, 6) : 0, hold: f >= LB ? "letter" : null, ang: sd * 4 });
  let look = sd * 0.8, lookY = 0.7, head = L.head * 0.6;
  if (scoopOn && f < BEAT.mailed - 2) { look = sd * 1.0; lookY = 0.8 - 0.6 * tip; head += sd * 5; }
  if (f >= BEAT.bait - 2 && f < BEAT.bait + 8) { const bs = sideOf(cam, P, bucket); look = bs * 0.8; lookY = 1; head += bs * 4; }   // down at the bucket
  if (f >= BEAT.conscience && f < BEAT.conscience + 8) { look = sd * 1.4; lookY = 0.3; head += sd * 3; }                         // the guilty side-glance
  if (f >= BEAT.mailed - 2 && f < BEAT.mailed + 8) { const ms = sideOf(cam, P, sr([-0.2, 1.5, -2.75])) || -1; look = ms * 1.2; lookY = -0.9; head += ms * 7; } // snap toward the mail slot (behind-left, up)
  if (f >= LB && f < AP + 2) { look = sd * (Math.floor((f - LB) / 4) % 2 ? 1.3 : 0.7); lookY = 0.1; head += sd * 3; } // reading the letter
  else if (f >= AP + 2) { look = -sd * 0.6; lookY = -0.3; head -= sd * 3; }
  if (e === "shifty") { look = -sd * 1.4; lookY = 0; }
  if (f >= FS[1] + 5 && f < FS[1] + 13) { look = 0; lookY = 0; head -= sd * 2; } // A4: the chips tip in, then a sly look straight at us
  const late = f >= LA, pileH = late ? letterH : scoop, farH: Hand = late ? { a: "waist", hold: "scoop", ang: -sd * 20 } : { a: "hip" };
  put(out, cam, a, P, { expr: e, facing: sd, look, lookY, blink: blinkAt(f, i, [...swapsOf(ex), BEAT.bait + 8], [BEAT.mailed - 2, AP + 2]), breath: L.breath * 1.3, shift: L.shift,
    face: e === "smirk" ? { browUp: sd > 0 ? [0, 5] : [5, 0] } : {},
    tilt: L.sway * 1.3 + sd * 6 * toPile + 4 * (tk >= -8 && tk < -6 ? -1 : 0) * sd, headTilt: head, squash: 0.3 * bump(tk, -8, 2), hands: sd < 0 ? [pileH, farH] : [farH, pileH] });
  if (f >= BEAT.apology) sweat(out, cam, P, -sd, f, BEAT.apology, 1e9, 20, 300);
  // the loading sparkle on the blade (1 f)
  for (const fs0 of FS) if (Math.abs(f - (fs0 - 3)) < 0.7) { const hp = handAt(a.o, { facing: sd, seed: seedOf(i), tilt: L.sway * 1.3 + sd * 6 * toPile, breath: L.breath * 1.3, hands: sd < 0 ? [scoop, null] : [null, scoop] }, sd < 0 ? 0 : 1);
    const ar = (scoop.ang ?? 0) * Math.PI / 180; glintAt(out, toWorld(cam, P, 1, [hp[0] + 90 * Math.sin(ar), hp[1] - 90 * Math.cos(ar)], 0.14), f, f, 0.16, 2); }
  // the bait-scoop's chips pour from the scoop tip into the BAIT bucket (6-9 f arcs), with a 1 f spill each
  for (const FSk of [FS[0], FS[1]]) { const t = f - FSk, hp = handAt(a.o, { facing: sd, seed: seedOf(i), tilt: L.sway * 1.3 + sd * 6 * toPile, breath: L.breath * 1.3, hands: sd < 0 ? [scoop, null] : [null, scoop] }, sd < 0 ? 0 : 1);
    const ar = (scoop.ang ?? 0) * Math.PI / 180, tipW = toWorld(cam, P, 1, [hp[0] + 83 * Math.sin(ar), hp[1] - 83 * Math.cos(ar)], 0.1);
    for (let k = 0; k < 4; k++) { const u = (t - 4 - k) / 6; if (u >= 0 && u < 1) {
      const c: V3 = [tipW[0] + (bucket[0] - tipW[0]) * u, tipW[1] + (bucket[1] - 0.06 - tipW[1]) * u + 0.18 * Math.sin(Math.PI * u), tipW[2] + (bucket[2] - tipW[2]) * u];
      fx(out, `chipS${k}`, 96, 96, (p) => fxChip(p, 40 + k), c, 0.07, 0.06, { rot: 3 * u + k });
    } } }
  // the second assistant sorts envelopes at the desk, glances over at the scoop, shrugs on "apology"
  { const b = A.asst2, j = b.i, Q = sr([SR.desk[0] + 0.15, 0, SR.desk[2] + 0.62]), Lb = life(f, j), sq = sideOf(cam, Q, pile);
    const glance = mod(f, 70) > 48 || (f >= BEAT.bait && f < BEAT.bait + 14), shrug = bump(f, BEAT.apology, 14), sortK = Math.sin(f * 0.5);
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

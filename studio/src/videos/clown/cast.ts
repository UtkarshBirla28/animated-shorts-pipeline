// The cast of "The Clown Nobody Saw" (clown) as lit flat cards in the 3D world, plus their effect cards.
// ENGINE (kept from the typo / saladoil kit): the canvas pool, the Actor / Fx meshes, the placement API (put / reachArm /
// fx / blob / putCard), life on the VIDEO clock (breath, sway, blinks), gestures (gest / gestO / bump), staging helpers
// (orient, cardYaw, gaze, headW, onCard).
// STAGING (REBUILD v2, dispatch owner EDIT): `square()` at the bottom hands each shot to its stage module with the engine
// as ONE object (ENG) + the remap info (R):
//   cast_quiz.ts    Q1-Q3 (and E1-E3, which arrive here AS their source shot: remap.ts; R.film says which film shot)
//   cast_story1.ts  S1-S11 (the square S1, the office S2-S5, the square S6-S11)
//   cast_story2.ts  S12-S20 (S20 arrives on its own SLOW picture clock)
//   cast_sheet.ts   the design sheet (inputProps.post.sheet = page)
// The characters are cast_people.ts (draw functions) + cast_fits.ts (outfits) + cast_fx.ts (+ cast_crowd.ts): owner DESIGN.
// Marks and times are plan.ts (COUNT, DUCKS, PHONES, clownQ, STUDY, STORY, OFFICE) and beats.ts (BEAT, SHOTS, SID, TALKS).
import * as THREE from "three";
import { Pen, drawPerson, drawLoneArm, shoulderAt, handAt, headAt, bodyAt, fxShadow, fxContact, fxBeam, fxSweat,
  Outfit, PersonOpts, Expr, Hand, P2, Hold } from "./toon";
import { FPS, SHOTS, LAST, BEAT, TOTAL, clamp01, smooth, camAt, PW, PWE } from "./story";
import type { LightState } from "./lights";
import { SQ, EXTERIOR, add, V3 } from "./plan";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, cardU, setCardMode } from "./cardshade";
import { VOICE_TOTAL } from "./voicewarp";
import { getInputProps } from "remotion";
import { stageSheet } from "./cast_sheet";
import { stageQuiz } from "./cast_quiz";
import { stageStory1 } from "./cast_story1";
import { stageStory2 } from "./cast_story2";
import { stageMarks } from "./cast_marks";
import { SID } from "./beats";
import { FILM, remapAt } from "./remap";
void PW; void PWE; void handAt; void headAt; void bodyAt; void fxSweat; void SQ; void add; void LAST; void TOTAL; void BEAT;
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
    // per-card light mode from the draw key (|LXbdfm: b = backlit, d = lamp duotone, f = flat diagram, m = card mode)
    const m = this.r?.key.match(/\|LX(\d)(\d)(\d)(\d)?/), U = cardU(this.mat);
    U.uBack.value = m ? +m[1] : 0; U.uDuo.value = m ? +m[2] : 0; U.uFlat.value = m ? +m[3] : 0;
    setCardMode(U, m && m[4] ? +m[4] : 0);
  }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (glints) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; glow: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    // fix r2: an ADDITIVE soft card (flashlight cones, glints): light adds onto the rain / the wall instead of a flat patch
    this.glow = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean, glow = false) { this.mesh.material = glow ? this.glow : soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|glow|")) { this.glow.map = t; this.mesh.material = this.glow; this.mesh.renderOrder = 2.5; return; }
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.glow.map = t; this.mesh.renderOrder = this.mesh.material === this.mat ? 0 : 2; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; yaw?: number;
  /** fix r2: additive soft card (world.ts calls Fx.use(soft) only: cast.ts routes glow through the key, see Fx.bind) */
  glow?: boolean };
/** sun = world direction TOWARD the sun (world.ts passes it) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const lerp2 = (a: P2, b: P2, u: number): P2 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const dist3 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const TAU = Math.PI * 2;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 1.7 ? [2400, 4000, 4.0] : d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- card geometry (a yaw-only billboard at pos: design (300, 975) = pos, 1 unit = SU * scale) ----------------
const vec = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
/** the yaw world.ts gives a card at p facing the camera at c */
const yawFrom = (c: V3, p: V3) => Math.atan2(c[0] - p[0], c[2] - p[2]);
/** design point d of the card at p (yaw, scale) -> world */
const fromCard = (p: V3, yaw: number, sc: number, d: P2): V3 => {
  const k = SU * sc, r = (d[0] - 300) * k;
  return [p[0] + Math.cos(yaw) * r, p[1] + (975 - d[1]) * k, p[2] - Math.sin(yaw) * r];
};
/** world point w seen from c, projected onto the card at p (yaw, scale) along the camera ray -> design point (so a hand
 *  drawn there sits exactly over w on screen) */
const toCard = (c: V3, p: V3, yaw: number, sc: number, w: V3): P2 => {
  const nx = Math.sin(yaw), nz = Math.cos(yaw), dx = w[0] - c[0], dy = w[1] - c[1], dz = w[2] - c[2];
  const den = nx * dx + nz * dz, t = Math.abs(den) < 1e-6 ? 1 : (nx * (p[0] - c[0]) + nz * (p[2] - c[2])) / den;
  const qx = c[0] + t * dx, qy = c[1] + t * dy, qz = c[2] + t * dz, k = SU * sc;
  return [300 + ((qx - p[0]) * Math.cos(yaw) - (qz - p[2]) * Math.sin(yaw)) / k, 975 - (qy - p[1]) / k];
};
/** a world point moved toward the camera c by m metres (an effect card in front of a character card) */
const toward = (w: V3, c: V3, m: number): V3 => { const d = dist3(w, c) || 1; return [w[0] + ((c[0] - w[0]) * m) / d, w[1] + ((c[1] - w[1]) * m) / d, w[2] + ((c[2] - w[2]) * m) / d]; };
/** the camera position of shot id at frame f (a fixed reference for poses that must not swim with the camera) */
const camRef = (id: number, f: number): V3 => camAt(id, f).pos;

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps */
const light2D = (cam: CamInfo) => {
  const sx = SUN.dot(cam.right), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- ground shadows ----------------
const GY = 0.02;
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.15, 0.16, 0.29], golden: [0.24, 0.19, 0.38] };
const TAIL: [number, number, number] = [0.34, 0.36, 0.56]; // lead p4: a little denser sun tail (owner: shadows)
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
let EXT = false, LX = "0000";
const CAMR = new THREE.Vector3(1, 0, 0);
/** contact ellipse under the feet (aligned to the lens) + outdoors a soft silhouette tail along the sun azimuth */
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1, tail = true) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  const el = Math.asin(clamp(SUN.y, 0.05, 0.99));
  if (EXT && tail) {
    const len = clamp(1.6 / Math.tan(el), 0.5, 3.0) * sc, h = len + 0.55 * sc, c = 0.3 * h, tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + GY - 0.004, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + GY, z,
    w: 0.92 * sc, h: 0.42 * sc, flat: true, rot: Math.atan2(-CAMR.z, CAMR.x) }); // lead p4: larger contact shadow (was 0.78 x 0.36)
};

// ---------------- life (VIDEO clock, loop-safe) ----------------
/** the VIDEO frame of this render (world.ts passes it) */
export let VF = 0;
/** a frequency (Hz) rounded to a whole number of cycles over the film's VIDEO length (loop seam rule) */
const LOOPN = VOICE_TOTAL; // clown: the loop period is the FILM LENGTH (frame TOTAL === frame 0): idle cycles are whole over it
const hz = (v: number) => (Math.max(1, Math.round((v * LOOPN) / FPS)) * FPS) / LOOPN;
const HZ = { b: hz(0.25), s1: hz(0.3), s2: hz(0.73), h1: hz(0.2), h2: hz(0.55), w1: hz(0.13), w2: hz(0.41), fl: hz(1.3), ws: hz(0.09), rip: hz(0.64), bob: hz(0.9), ub: hz(0.6), cat: hz(0.4) };
const LID = [0.5, 1, 1, 0.5];
const wave = (v: number, f: number, ph = 0) => Math.sin(TAU * f * (v / FPS) + ph);
/** idle life at video frame v: breathing (-1..1), sway (deg), head bob (deg), weight shift (-1..1) */
const life = (v: number, i: number) => {
  const ph = (k: number) => TAU * hh(i, k);
  return {
    breath: wave(v, HZ.b, ph(1)),
    sway: 1.4 * wave(v, HZ.s1, ph(2)) + 0.5 * wave(v, HZ.s2, ph(3)),
    head: 1.6 * wave(v, HZ.h1, ph(4)) + 0.7 * wave(v, HZ.h2, ph(5)),
    shift: 0.7 * wave(v, HZ.ws, ph(6)),
  };
};
/** eyelid 0 open .. 1 shut: a 4-video-frame blink every ~2.5 s (seeded), never within 6 video f of the loop seam */
const blinkAt = (v: number, i: number) => {
  if (VF < 6 || VF > VOICE_TOTAL - 7) return 0;
  const Pd = 75, n0 = Math.floor(v / Pd);
  for (let n = n0 - 1; n <= n0 + 1; n++) {
    const s0 = n * Pd + Math.round((hh(i * 13 + n * 7, 5) - 0.5) * 40), k = v - s0;
    if (k >= 0 && k < 4) return LID[Math.floor(k)];
  }
  return 0;
};
const idle = (v: number, i: number): PersonOpts => { const L = life(v, i); return { breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift, blink: blinkAt(v, i) }; };
/** outdoor wind (0..1) and the fast flutter on top of it, per character phase */
const windAt = (v: number, i: number) => 0.45 + 0.3 * wave(v, HZ.w1, hh(i, 8) * TAU) + 0.15 * wave(v, HZ.w2, hh(i, 9) * TAU);
const flutAt = (v: number, i: number) => 0.7 * wave(v, HZ.fl, hh(i, 10) * TAU);
/** an expression from a [frame, expr] list (the last entry at or before f), swapping 2 f before each word */
const exprAt = (f: number, keys: [number, Expr][]): Expr => { let e = keys[0][1]; for (const [f0, x] of keys) if (f >= f0 - 2) e = x; return e; };
/** a 2-frame blink straddling every expression swap (the new face opens in) */
const swapLid = (f: number, keys: [number, Expr][]) => { for (let i = 1; i < keys.length; i++) { const s = keys[i][0] - 2; if (f >= s - 1 && f < s + 1) return 1; } return 0; };
/** a gesture 0 -> 1 from f0 over dur frames: a 3 f anticipation (dips to -0.08), the move, an overshoot to 1.08 that
 *  settles over 6 f */
const gest = (f: number, f0: number, dur: number) => {
  const a = (f - (f0 - 3)) / 3; if (a < 0) return 0;
  if (a < 1) return -0.08 * Math.sin((Math.PI / 2) * a);
  const u = (f - f0) / dur;
  if (u < 1) return -0.08 + 1.16 * smooth(u);
  const s = (f - f0 - dur) / 6; return s < 1 ? 1.08 - 0.08 * smooth(s) : 1;
};
/** a gesture up at f0 (dur) and back down at f1 (dur2) */
const gest2 = (f: number, f0: number, dur: number, f1: number, dur2 = dur) => gest(f, f0, dur) * (1 - gest(f, f1, dur2));
/** fix r3: an EASE-OUT sweep (a big arm sweep that launches and then glides into place): a 3 f anticipation dip, the move
 *  (half ease-out, half smoothstep, so it never snaps through the middle), a 2 f overshoot (1.06) and a 5 f settle */
const gestO = (f: number, f0: number, dur: number) => {
  const a = (f - (f0 - 3)) / 3; if (a < 0) return 0;
  if (a < 1) return -0.08 * Math.sin((Math.PI / 2) * a);
  const u = (f - f0) / dur;
  if (u < 1) return -0.08 + 1.14 * (0.5 * smooth(u) + 0.5 * (1 - (1 - u) ** 2.2));
  const s = (f - f0 - dur) / 5; return s < 1 ? 1.06 - 0.06 * smooth(s) : 1;
};
/** a soft bump 0 -> 1 -> 0: up over a frames from f0, down over b frames */
const bump = (f: number, f0: number, a: number, b: number) => { const t = f - f0; return t < 0 ? 0 : t < a ? smooth(t / a) : t < a + b ? 1 - smooth((t - a) / b) : 0; };
/** a forced blink of n frames from f0 (half, shut, ..., half) */
const blinkN = (f: number, f0: number, n = 3) => { const t = Math.floor(f - f0); return t < 0 || t >= n ? 0 : t === 0 || t === n - 1 ? 0.5 : 1; };

// ---------------- people ----------------

type Act = { i: number; o: Outfit; key: string };
const seedOf = (i: number) => ((i * 5 + 3) % 9) + 1;


/** noTail: no outdoor sun tail; blobAt: put the contact blob here instead of under the feet; yaw: a fixed card yaw;
 *  refCam: aim the card at this camera position instead of the live one (poses that must not swim) */
type PutX = { scale?: number; noBlob?: boolean; yaw?: number; noTail?: boolean; blobAt?: V3; blobK?: number };
const put = (out: Stage, cam: CamInfo, a: Act, pos: V3, o: PersonOpts, x: PutX = {}) => {
  const sc = x.scale ?? 1;
  const d = cam.pos.distanceTo(tmp.set(pos[0], pos[1] + 1.1 * sc, pos[2])) / sc;
  const [w, h, k] = tier(d);
  const opts: PersonOpts = { ...o, light: light2D(cam), seed: seedOf(a.i) };
  out.places.push({ key: `P|${a.key}|${fkey(opts)}|LX${LX}`, x: pos[0], y: pos[1], z: pos[2], scale: sc, draw: (p) => drawPerson(p, a.o, opts), size: [w, h, k],
    ...(x.yaw !== undefined ? { yaw: x.yaw } : {}) });
  if (!x.noBlob) { const bp = x.blobAt ?? pos; blob(out, bp[0], bp[1], bp[2], sc, x.blobK ?? 1, !x.noTail); }
  return opts;
};
const fx = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, p: V3, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x: p[0], y: p[1], z: p[2], w, h, ...extra });
/** an arm on its own lit card standing at the hand (it reaches across a desk in front of the body card): from the shoulder
 *  of arm i of the figure (body card at pos / yaw, posed with opts) to the world point hw */
const reachArm = (out: Stage, cam: CamInfo, a: Act, pos: V3, yaw: number, opts: PersonOpts, i: 0 | 1, hw: V3, hand: { hold?: Hold; ang?: number; n?: number; bend?: number; elbow?: number; up?: number }) => {
  const full: PersonOpts = { ...opts, seed: seedOf(a.i) };
  const [sx, sy, u] = shoulderAt(a.o, full, i);
  const c = vec(cam.pos), at: V3 = [hw[0], pos[1], hw[2]], ay = yawFrom(c, at);
  const S = toCard(c, at, ay, 1, fromCard(pos, yaw, 1, [sx, sy])), Hd = toCard(c, at, ay, 1, hw);
  const k = dist3(c, [at[0], hw[1], at[2]]) / dist3(c, [pos[0], hw[1], pos[2]]);
  const [w, h, kk] = tier(dist3(c, [at[0], hw[1], at[2]]));
  const light = light2D(cam);
  out.places.push({ key: `ARM|${a.key}|${i}|${fkey({ S, Hd, k, hand, light, u })}|LX${LX}`, x: at[0], y: at[1], z: at[2], yaw: ay, size: [w, h, kk],
    draw: (p) => drawLoneArm(p, a.o, S, Hd, i ? 1 : -1, u, k, hand, light) });
};

// ---------------- fix r1 helpers: camera basis, screen projection, light beams ----------------
const rad = (d: number) => (d * Math.PI) / 180;
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm3 = (a: V3): V3 => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
/** the camera basis of shot id at frame f (forward F, right R, up U, tan of the half fov) */
const camB = (id: number, f: number) => {
  const c = camAt(id, f), F = nrm3(sub3(c.look, c.pos)), rh = Math.hypot(F[0], F[2]) || 1, R: V3 = [-F[2] / rh, 0, F[0] / rh];
  const U: V3 = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  return { pos: c.pos, F, R, U, t: Math.tan((c.fov * Math.PI) / 360) };
};
/** world point -> screen [x, y] (-1..1, x right, y DOWN) and its depth, through shot id's camera at frame f */
const scr = (id: number, f: number, w: V3): [number, number, number] => {
  const b = camB(id, f), d = sub3(w, b.pos), z = Math.max(1e-3, dot3(d, b.F));
  return [dot3(d, b.R) / (z * b.t * 0.5625), -dot3(d, b.U) / (z * b.t), z];
};
/** a soft warm light cone from world point a (the lens) to world point b: one camera-facing card laid along the screen line */
const beam = (out: Stage, id: number, f: number, a: V3, b: V3, wA: number, wB: number, k: number, key: string) => {
  const B = camB(id, f), da = sub3(a, B.pos), db = sub3(b, B.pos), za = Math.max(0.2, dot3(da, B.F)), zb = Math.max(0.2, dot3(db, B.F)), zm = 0.5 * (za + zb);
  const pa = [(dot3(da, B.R) * zm) / za, (dot3(da, B.U) * zm) / za], pb = [(dot3(db, B.R) * zm) / zb, (dot3(db, B.U) * zm) / zb];
  const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), rot = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
  const c: V3 = [0, 1, 2].map((i) => B.pos[i] + B.F[i] * zm + B.R[i] * mx + B.U[i] * my) as V3;
  const wb = (wB * zm) / zb, r = clamp((wA * zm) / za / Math.max(1e-3, wb), 0.05, 1);
  fx(out, `glow|beam|${key}|${q(k, 12)}|${q(r, 10)}`, 256, 128, (p) => fxBeam(p, k, r), c, Math.max(0.05, L), wb, { soft: true, rot });
};

// ================================================================== STAGING (owner CHAR)
// ---------------- staging helpers ----------------
const HEADV = (yaw: number): V3 => [Math.sin(yaw), 0, Math.cos(yaw)];
/** view + screen facing of a figure whose body faces the world heading `heading` (atan2(x, z)), seen by the live lens:
 *  back when the lens is behind it (toward < backK; a lower backK cheats a 3/4 front), facing = the frame side its nose
 *  points to (camera-relative, so a figure turned toward someone reads that way from any angle) */
const orient = (cam: CamInfo, pos: V3, heading: number, backK = -0.15) => {
  const d = HEADV(heading), dx = cam.pos.x - pos[0], dz = cam.pos.z - pos[2], n = Math.hypot(dx, dz) || 1;
  const toward = (d[0] * dx + d[2] * dz) / n, s = d[0] * CAMR.x + d[2] * CAMR.z;
  return { view: (toward < backK ? "back" : "front") as "back" | "front", facing: (Math.abs(s) > 0.3 ? Math.sign(s) : 0) as -1 | 0 | 1, s, toward };
};
/** a figure's card yaw: a billboard toward the lens, but square to the view axis when the lens is very near (an
 *  over-the-shoulder lens would see a billboard edge-on) */
const cardYaw = (cam: CamInfo, P: V3) => {
  const dx = cam.pos.x - P[0], dz = cam.pos.z - P[2];
  return Math.hypot(dx, dz) < 0.75 ? Math.atan2(-CAMR.z, CAMR.x) : Math.atan2(dx, dz);
};
/** pupils toward a world point, screen-relative (look -1.3..1.3 = left / right, lookY - up / + down) */
const gaze = (from: V3, to: V3, kx = 1.8, ky = 2.2) => {
  const d = sub3(to, from), n = Math.hypot(d[0], d[1], d[2]) || 1;
  return { look: clamp(((d[0] * CAMR.x + d[2] * CAMR.z) / n) * kx, -1.3, 1.3), lookY: clamp((-d[1] / n) * ky, -1.3, 1.3) };
};
/** the head centre of a posed figure in the world */
const headW = (a: Act, o: PersonOpts, P: V3, yaw: number, sc = 1): V3 => { const [hx, hy] = headAt(a.o, { ...o, seed: seedOf(a.i) }); return fromCard(P, yaw, sc, [hx, hy]); };
/** a world point as a design point on the figure's card (a hand target that lands over it on screen) */
const onCard = (cam: CamInfo, P: V3, yaw: number, w: V3, sc = 1): P2 => toCard(vec(cam.pos), P, yaw, sc, w);
/** a lit card with its own drawing (the mascot, the pinning hand) */
const putCard = (out: Stage, cam: CamInfo, key: string, pos: V3, draw: (p: Pen) => void, x: { yaw?: number; scale?: number } = {}) => {
  const sc = x.scale ?? 1, d = cam.pos.distanceTo(tmp.set(pos[0], pos[1] + 1.1 * sc, pos[2])) / sc, [w, h, k] = tier(d);
  out.places.push({ key: `C|${key}|LX${LX}`, x: pos[0], y: pos[1], z: pos[2], scale: sc, draw, size: [w, h, k], ...(x.yaw !== undefined ? { yaw: x.yaw } : {}) });
};
/** the video frame on the loop clock as seen from shot 1 (shot 9 runs at negative time: frame TOTAL = 0) */
const toVid = (id: number) => (id === LAST ? VF - VOICE_TOTAL : VF);
/** a point along from a toward b at distance m (an arm's reach toward a target) */
const along = (a: V3, b: V3, m: number): V3 => { const d = sub3(b, a), n = Math.hypot(d[0], d[1], d[2]) || 1; return [a[0] + (d[0] * m) / n, a[1] + (d[1] * m) / n, a[2] + (d[2] * m) / n]; };

/** the figure's heading relative to the lens: s = the sideways part (+ = toward screen right), c = the toward-the-lens
 *  part (+ = approaching): what cast_people.ts poses take */
const orientSC = (cam: CamInfo, pos: V3, heading: number) => {
  const d = HEADV(heading), dx = cam.pos.x - pos[0], dz = cam.pos.z - pos[2], n = Math.hypot(dx, dz) || 1;
  return { s: d[0] * CAMR.x + d[2] * CAMR.z, c: (d[0] * dx + d[2] * dz) / n };
};
/** a lit card with its own drawing + the ground shadow under it (cast_people.ts figures) */
const putFig = (out: Stage, cam: CamInfo, key: string, pos: V3, draw: (p: Pen) => void, x: { scale?: number; blobK?: number; noBlob?: boolean; blobSc?: number; mirror?: boolean } = {}) => {
  const sc = x.scale ?? 1, d = cam.pos.distanceTo(tmp.set(pos[0], pos[1] + 1.1 * sc, pos[2])) / sc, [w, h, k] = tier(d);
  out.places.push({ key: `C|${key}|LX${LX}`, x: pos[0], y: pos[1], z: pos[2], scale: sc, draw, size: [w, h, k], ...(x.mirror ? { mirror: true } : {}) });
  if (!x.noBlob) blob(out, pos[0], 0, pos[2], x.blobSc ?? sc, x.blobK ?? 1, true);
};
/** a SEE-THROUGH card (unlit, soft): ghosts and outlines. `draw` paints the 600 x 1000 design; the card stands at pos
 *  like a figure card (design (300, 975) = pos), facing the lens */
const putGhost = (out: Stage, cam: CamInfo, key: string, pos: V3, draw: (p: Pen) => void, sc = 1) => {
  const d = cam.pos.distanceTo(tmp.set(pos[0], pos[1] + 1.1 * sc, pos[2])) / sc, [w, h, k] = tier(d);
  out.fx.push({ key: `ghost|${key}`, cw: w, ch: h, draw: (p) => { p.g.save(); p.g.scale(k, k); draw(p); p.g.restore(); }, x: pos[0], y: pos[1] + (975 - 500) * SU * sc, z: pos[2],
    w: 600 * SU * sc, h: 1000 * SU * sc, soft: true, yaw: Math.atan2(cam.pos.x - pos[0], cam.pos.z - pos[2]) });
};
/** THE ENGINE as one object: the staging modules get it as an argument, so they import nothing from this file but types */
const ENG = {
  SU, putFig, putGhost, putCard, blob, fx, light2D, fkey, orientSC, gaze, cardYaw, scr, camB, camRef, toward, onCard, along,
  idle, life, blinkAt, windAt, flutAt, exprAt, swapLid, gest, gest2, gestO, bump, blinkN, wave, hz, hh, q, clamp, lerp, lerp3, rad, vec, smooth, clamp01,
  /** the video frame (idle life; on the SOURCE shot's clock for remapped shots) and the camera's right vector on the ground */
  get vf() { return VF; }, get camR() { return CAMR; },
};
export type Eng = typeof ENG;

// ---------------- THE DISPATCH (owner EDIT) ----------------
/** what a stage module learns about the frame it draws: `film` = the FILM shot being shown (24-26 for the end replays,
 *  else = id), `ff` = the film frame, plus the remap (rewind / freeze / rate: picture frames per film frame) */
export type StageInfo = { film: number; ff: number; rewind: boolean; freeze: boolean; rate: number };
export type StageFn = (E: Eng, out: Stage, cam: CamInfo, id: number, f: number, R: StageInfo) => void;
/** inputProps.post.sheet = n renders page n of the design sheet instead (cast_sheet.ts; use it on frame 0) */
const SHEET = ((getInputProps() as { post?: { sheet?: number } }).post ?? {}).sheet ?? 0;
/** inputProps.post.marks = true: add EDIT's see-through stand-in cards at every shot's anchors (animatic / camera checks) */
const MARKS = !!((getInputProps() as { post?: { marks?: boolean } }).post ?? {}).marks;
/** id = the SOURCE shot (Clown.tsx already remapped it), f = its picture time */
const square = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (SHEET) { stageSheet(ENG, out, cam, SHEET); return; }
  const r = FILM.id !== id ? remapAt(FILM.id, FILM.f) : null;
  const R: StageInfo = { film: FILM.id, ff: FILM.f, rewind: r?.rewind ?? false, freeze: r?.freeze ?? false, rate: r?.rate ?? 1 };
  if (id <= SID.Q3 || id >= SID.E1) stageQuiz(ENG, out, cam, id, f, R);
  else if (id <= SID.S11) stageStory1(ENG, out, cam, id, f, R);
  else stageStory2(ENG, out, cam, id, f, R);
  if (MARKS) stageMarks(ENG, out, cam, id, f);
};

export const stage = (id: number, f: number, cam: CamInfo, L: LightState, vf: number = f): Stage => {
  VF = vf;
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = L.actorShadow ? "golden" : "day";
  EXT = EXTERIOR[s.set];
  LX = "0000";
  CAMR.copy(cam.right).setY(0).normalize();
  if (cam.sun) SUN.copy(cam.sun).normalize();
  square(out, cam, id, f);
  return out;
};
export { FPS, clamp01, fxSweat };
void put; void fx; void reachArm; void beam; void gest; void gest2; void gestO; void bump; void blinkN; void exprAt; void swapLid; void idle; void windAt; void flutAt;
void toward; void camRef; void scr; void lerp2; void rad; void orient; void cardYaw; void gaze; void headW; void onCard; void putCard; void toVid; void along; void lerp3; void lerp;
void drawLoneArm; void shoulderAt; void fxBeam; void life; void HEADV;

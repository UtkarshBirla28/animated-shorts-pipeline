// The cast of "The Typo That Sold More Shares Than Existed" (typo) as lit flat cards in the 3D world, plus their effect
// cards. ENGINE (kept from saladoil): the canvas pool, the Actor / Fx meshes, the placement API (put / reachArm / fx /
// blob), life on the VIDEO clock (breath, sway, blinks in whole cycles over VOICE_TOTAL), gestures (gest / gestO / bump).
// STAGING (owner CHAR): every shot's cast posed from the plan.ts anchors and the beats.ts BEAT words, drawn with toon.ts.
// Lip flaps ONLY on the boss's "Cancel it!" (BEAT.cancelIt .. BEAT.cancelItEnd). Faces never inside the caption band
// (y 1280-1440 at 1080x1920).
import * as THREE from "three";
import { Pen, drawPerson, drawLoneArm, shoulderAt, handAt, headAt, bodyAt, fxShadow, fxContact, fxBeam, fxSweat,
  Outfit, PersonOpts, Expr, Hand, P2, Hold } from "./toon";
import { FPS, SHOTS, LAST, BEAT, TOTAL, clamp01, smooth, camAt, PW, PWE } from "./story";
import type { LightState } from "./lights";
import { TR, ST, LB, HM, HL, CT, EXTERIOR, add, V3, tr, st, lb, hm, hl, ct } from "./plan";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, cardU, setCardMode } from "./cardshade";
import { VOICE_TOTAL } from "./voicewarp";
import { deskHand } from "./sets_desk";
import { MARKS, MICE, CLICK } from "./homes_layout";
import { CUT6 } from "./desk_beats";
import { HK, certA, certB, rightHand, clockGlance, mystHand } from "./hook";
import { BELL } from "./tokyo_lobby";
import { PIN_F, TABS, TAB_F, TAB_FLY, TAB_HAND, tabTarget, SLICE_F, SLICE_DUR, SLICE_HAND } from "./hall_time";
import { drawMascot, drawPinHand, fxPin, fxMoth, fxOrderSlip, fxBurst } from "./cast_fx";
import { TRADER_FIT, BOSS_FIT, staffFit, salaryFit, visitorFit, WORKER_FIT, GRANNY_FIT, STUDENT_FIT, BUYER_FIT, crowdFit, SELLER_FIT, judgeFit, LAWYER_FIT, GUARD_FIT } from "./cast_fits";
void PW; void PWE; void handAt; void headAt; void bodyAt; void fxSweat; void TR; void ST; void LB; void HM; void HL; void CT; void add; void LAST; void TOTAL;
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
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
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
    w: 0.78 * sc, h: 0.36 * sc, flat: true, rot: Math.atan2(-CAMR.z, CAMR.x) });
};

// ---------------- life (VIDEO clock, loop-safe) ----------------
/** the VIDEO frame of this render (world.ts passes it) */
export let VF = 0;
/** a frequency (Hz) rounded to a whole number of cycles over the film's VIDEO length (loop seam rule) */
const LOOPN = VOICE_TOTAL - 1; // frame 0 === frame LOOPN (the loop seam): idle cycles are whole over LOOPN
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
const toVid = (id: number) => (id === LAST ? VF - (VOICE_TOTAL - 1) : VF);
/** a point along from a toward b at distance m (an arm's reach toward a target) */
const along = (a: V3, b: V3, m: number): V3 => { const d = sub3(b, a), n = Math.hypot(d[0], d[1], d[2]) || 1; return [a[0] + (d[0] * m) / n, a[1] + (d[1] * m) / n, a[2] + (d[2] * m) / n]; };

// ---------------- the trading room: the trader, the boss, the staff ----------------
const TRD: Act = { i: 1, key: "trader", o: TRADER_FIT };
const BOSS: Act = { i: 2, key: "boss", o: BOSS_FIT };
const KB_L: V3 = [-0.1, 0.792, 1.37], KB_R: V3 = [0.12, 0.792, 1.36];
type HW = { w: V3; hold?: Hold; ang?: number; n?: number; bend?: number; elbow?: number; up?: number } | null;
/** a trader pose: heading (his body), the expression keys, where he looks (world), his hands as WORLD targets (his
 *  [left, right]; reach-across arm cards) or body targets, the hidden hand (the DESK's hero hand in close framings) */
type TSt = { f: number; tau: number; heading: number; expr: Expr; keys?: [number, Expr][]; lookW?: V3; hL?: HW; hR?: HW;
  body?: [Hand | null, Hand | null]; hide?: 0 | 1 | null; o?: PersonOpts; lean?: number; blinkOff?: boolean; blink?: number };
const traderAt = (lean: number, heading: number): V3 => { const d = HEADV(heading); return tr([TR.trader[0] + d[0] * 0.12 * lean, 0, TR.trader[2] + d[2] * 0.12 * lean]); };
/** the trader's head (world) for this frame's pose (other figures look at it) */
let TRADER_HEAD: V3 = tr([0, 1.18, 1.95]);
const stageTrader = (out: Stage, cam: CamInfo, st: TSt) => {
  const a = TRD, P = traderAt(st.lean ?? 0, st.heading), yaw = cardYaw(cam, P), ori = orient(cam, P, st.heading), L = life(st.tau, a.i);
  const d = HEADV(st.heading), rs = -d[2] * CAMR.x + d[0] * CAMR.z, rIdx: 0 | 1 = rs >= 0 ? 1 : 0;
  const ci = (his: 0 | 1): 0 | 1 => (his === 1 ? rIdx : ((1 - rIdx) as 0 | 1));
  const o: PersonOpts = { mode: "chair", view: ori.view, facing: ori.facing, breath: L.breath, tilt: 0.6 * L.sway, headTilt: 0.8 * L.head, expr: st.expr,
    blink: st.blinkOff ? st.blink ?? 0 : Math.max(blinkAt(st.tau, a.i), st.keys ? swapLid(st.f, st.keys) : 0, st.blink ?? 0), ...(st.o ?? {}) };
  if (st.o?.tilt !== undefined) o.tilt = 0.6 * L.sway + st.o.tilt;
  if (st.o?.headTilt !== undefined) o.headTilt = 0.8 * L.head + st.o.headTilt;
  const hands: [Hand | null, Hand | null] = [{ a: "lap" }, { a: "lap" }];
  for (const his of [0, 1] as const) {
    const hw = his ? st.hR : st.hL, bh = st.body?.[his];
    if (hw || st.hide === his) hands[ci(his)] = { a: "lap", hide: true };
    else if (bh) hands[ci(his)] = bh;
  }
  o.hands = hands;
  TRADER_HEAD = headW(a, o, P, yaw);
  if (st.lookW && ori.view === "front" && st.o?.look === undefined) { const g = gaze(TRADER_HEAD, st.lookW); o.look = g.look; o.lookY = g.lookY; }
  put(out, cam, a, P, o, { yaw, noBlob: true });
  for (const his of [0, 1] as const) {
    const hw = his ? st.hR : st.hL;
    if (hw && st.hide !== his) { const { w, ...hd } = hw; reachArm(out, cam, a, P, yaw, o, ci(his), w, hd); }
  }
  return { P, yaw, o, ci };
};
/** the boss on his mark (or walking in): a 3/4 front cheat toward the lens unless it is right behind him */
const stageBoss = (out: Stage, cam: CamInfo, f: number, P: V3, heading: number, o0: PersonOpts, lookW?: V3, keys?: [number, Expr][]) => {
  const a = BOSS, yaw = cardYaw(cam, P), ori = orient(cam, P, heading, -0.85), L = life(VF, a.i);
  const o: PersonOpts = { view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift,
    blink: Math.max(blinkAt(VF, a.i), keys ? swapLid(f, keys) : 0), ...o0 };
  if (o0.tilt !== undefined) o.tilt = L.sway + o0.tilt;
  if (lookW && o.look === undefined) { const g = gaze(headW(a, o, P, yaw), lookW); o.look = g.look; o.lookY = g.lookY; }
  put(out, cam, a, P, o, { yaw });
  return { yaw, o };
};
/** the boss's shout lip flaps: from 2 f before "Cancel" (the swap rule) to the end of "it!": fast big syllables on
 *  "Can-cel", the "it!" held wide open, closing over the last 3 f (y0 mid D, y1 wide open, y2 tall O) */
const FLAP0 = BEAT.cancelIt - 2;
const SHOUT_FLAPS: [number, number][] = [[3, 1], [2, 0], [3, 2], [2, 0], [3, 1], [2, 2]];
const shoutShape = (f: number): number => {
  const t = f - FLAP0;
  if (t < 0 || f >= BEAT.cancelItEnd) return -1;
  let a0 = 0; for (const [n, s] of SHOUT_FLAPS) { if (t < a0 + n) return s; a0 += n; }
  return BEAT.cancelItEnd - f <= 3 ? 0 : 1;
};
/** the trader's tea is in his hand (shot 6, "Easy mistake."): the DESK hides its own cup + steam meanwhile */
export const SIP_WINDOW: [number, number] = [BEAT.easy - 8, BEAT.mistakeEnd + 29];
/** fix3: the sip's beats: the lift starts on the cut, the held sip sits on "mistake.", the cup goes down at its end */
const SIP6 = { lift: BEAT.easy - 3, sip: BEAT.easy + 9, down: BEAT.mistakeEnd - 3 };
/** fix3: the sipping hand's offset from the head probe (world m: along the lens' right, up) */
const SIPX = -0.109, SIPY = 0.03;
export const teaInHand = (id: number, f: number) => id === 6 && f >= SIP_WINDOW[0] && f < SIP_WINDOW[1];

/** shots 1 / 14 (THE LOOP): the trader at his desk from behind, his right hand on ENTER (the DESK's hero hand: his own
 *  arm hidden), the left resting on the keys; the idle runs on the loop clock (tau 0 on frame 0 AND on the last frame).
 *  Shot 1: a small start as the certificates puff out of the keyboard */
const traderLoop = (out: Stage, cam: CamInfo, id: number, f: number) => {
  // FIX2 (audit 2, Design A): shots 1 / 14 are ONE front-right medium (cams_desk A0). He sits 3/4 toward his screen
  // (screen right), calm; his LEFT hand over ENTER is the DESK's 3D hero hand (his own left arm hidden), his RIGHT hand
  // (screen left) is a reach-arm card that follows hook.ts (the paper on his forehead, the snatch, the ghost sheet).
  const tau = toVid(id), one = id === 1;
  const SCREEN = tr([0.3, 0.98, 0.95]), BOARD = tr([-0.5, 2.6, 2.4]), CLOCK = tr([-0.9, 3.4, 2.6]);
  const A = certA(id, f), Bc = certB(id, f), hand = rightHand(id, f);
  // where he looks: his screen -> up at the paper on his forehead -> the paper in his hand -> up at the red board -> the
  // flying sheet -> the sheet in his hand -> at us, through the ghost (each target blends in over 6 f)
  const targets: [number, V3][] = one
    ? [[0, SCREEN], [HK.stick + 2, tr(add(A.on ? A.p : [0, 1.5, 1.9], [0, 0.25, 0]))], [HK.grip + 3, tr(A.on ? A.p : [0, 0, 0])], [HK.eyesUp, BOARD], [HK.grab + 4, tr(Bc.on ? Bc.p : [0, 0, 0])],
      [HK.ghost1 - 2, vec(cam.pos)]]
    : [[0, SCREEN]];
  let lookW = targets[0][1];
  for (const [f0, w] of targets) if (f >= f0) lookW = lerp3(lookW, w, smooth((f - f0) / 6));
  const cg = clockGlance(id, f); if (cg > 0) lookW = lerp3(lookW, CLOCK, cg);
  const keys: [number, Expr][] = one
    ? [[0, "gazeCalm"], [HK.stick + 3, "gazeMild"], [HK.off + 2, "gazeSmile"], [HK.eyesUp + 2, "gazeAlert"], [HK.oh + 2, "gazeO"], [HK.held, "gazeWorry"]]
    : [[0, "gazeCalm"]];
  // the slap knocks his head back a hair; the "O" jolts him (glasses pop); a gulp as the paper turns ghost
  const slap = one ? bump(f, HK.stick - 1, 2, 7) : 0, jolt = one ? gest2(f, HK.oh - 1, 5, HK.oh + 12, 14) : 0;
  const up = one ? smooth((f - HK.eyesUp) / 8) * (1 - smooth((f - (HK.grab + 2)) / 8)) : 0;
  const lean = one ? 0.5 * smooth((f - HK.bring) / 14) : 0;
  const turned = one && f >= HK.stick + 1;
  stageTrader(out, cam, { f, tau, heading: Math.PI - (turned ? 0.62 : 0.2), expr: exprAt(f, keys), keys, lookW, lean,
    hR: { w: tr(hand.p), bend: 0.75 }, hide: 0,
    o: { tilt: -2 * slap - 3 * jolt, headTilt: 2.5 * slap + 3 * jolt, nod: -0.3 * slap - 0.25 * up - 0.2 * jolt, face: { fdy: -3 * up - 2 * slap, glassDy: 2.2 * jolt + 1.2 * slap },
      sweat: one ? smooth((f - (HK.ghost0 + 4)) / 6) : 0,
      // fix3 (owner): no red rim on his body: the WHOLE ROOM relights to alarm_red on "billion." (beats.ts SHOTS[0].relight)
    } });
};

/** shot 5: the trader typing (seen from the room's end), swivels to his boss on "trader", the boss holds out the order
 *  slip on "sell one share", he takes it, reads "for ¥610,000" (the slip readable in his hand), a calm nod, and swivels back */
const HANDOFF: V3 = [0.42, 1.0, 2.1];
/** shot 5: the boss comes down the aisle beside the hero desk (enters from the frame's right edge in the room wide) */
const BOSS_FROM5: V3 = [1.7, 0, -0.2];
const shot5 = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT, sw = gest(f, B.trader - 2, 14) * (1 - gest(f, B.y610kEnd + 2, 14));
  const hB = Math.atan2(TR.boss[0] - TR.trader[0], TR.boss[2] - TR.trader[2]), heading = Math.PI + (hB - Math.PI) * sw;
  const give = gest2(f, B.sell1 - 6, 14, B.share + 16, 12), take = gest2(f, B.oneShare, 10, B.share + 6, 8), got = f >= B.share + 4;
  const read = gest2(f, B.share + 6, 12, B.y610kEnd - 2, 12), nod = gest2(f, B.y610kEnd - 6, 6, B.y610kEnd + 2, 8);
  const keys: [number, Expr][] = [[0, "focus"], [B.trader - 2, "listen"], [B.sell1, "browsUp"], [B.share + 8, "read"], [B.y610kEnd - 6, "calm"]];
  const ex = exprAt(f, keys), turned = sw > 0.5;
  // typing taps while he faces the screen (both hands), the slip hand once he has turned
  const tapL = (VF % 13) < 3 ? 0.02 : 0, tapR = ((VF + 6) % 11) < 3 ? 0.02 : 0;
  const hand = tr(HANDOFF), bossHead = tr([TR.boss[0], 1.45, TR.boss[2]]);
  let slipW: V3 | null = null;
  const tz = stageTrader(out, cam, { f, tau: VF, heading, expr: ex, keys,
    lookW: ex === "read" ? hand : ex === "focus" ? tr(TR.screen.c) : bossHead,
    hL: turned ? null : { w: tr(add(KB_L, [0, 0.03 - tapL, 0])), bend: 0.6 }, hR: turned ? null : { w: tr(add(KB_R, [0, 0.03 - tapR, 0])), bend: 0.6 },
    body: turned ? [{ a: "lap" }, null] : undefined, o: { nod: 0.5 * nod } });
  if (turned) {
    // his right hand: lap -> out to the slip (take) -> holding it up at the chest to read
    const ci = tz.ci(1), Ph = onCard(cam, tz.P, tz.yaw, hand);
    const h: Hand = got ? { a: "lap", b: "show", k: 0.4 + 0.6 * read, dy: -6 * read, hold: "orderslip", ang: -10, front: true } : { a: "lap", b: Ph, k: take, front: true };
    const o2: PersonOpts = { ...tz.o, hands: tz.o.hands!.map((x, i) => (i === ci ? h : x)) as [Hand | null, Hand | null] };
    // re-put the body with the slip hand (replace the card pushed by stageTrader)
    out.places.pop(); put(out, cam, TRD, tz.P, o2, { yaw: tz.yaw, noBlob: true });
    if (got) { const hd = handAt(TRD.o, { ...o2, seed: seedOf(TRD.i) }, ci); const w0 = toward(fromCard(tz.P, tz.yaw, 1, [hd[0], hd[1] - 40]), vec(cam.pos), 0.1);
      slipW = [w0[0] + CAMR.x * 0.3, w0[1], w0[2] + CAMR.z * 0.3] /* fix4 (6): further toward the boss (it covered his mouth) */; }
  }
  // the boss: walks over from the aisle as the camera glides in on "trader" (off the frame in the room wide), the slip at
  // his chest, then out to the trader on "sell one share"
  const arr = smooth((f - B.trader) / 20), walking = arr > 0.01 && arr < 0.99;
  const P = lerp3(tr(BOSS_FROM5), tr(TR.boss), 1 - (1 - arr) ** 1.5);
  const hdg = walking ? Math.atan2(TR.boss[0] - BOSS_FROM5[0], TR.boss[2] - BOSS_FROM5[2]) : Math.atan2(TR.trader[0] - TR.boss[0], TR.trader[2] - TR.boss[2]);
  const bkeys: [number, Expr][] = [[0, "stern"], [B.sell1 - 2, "neutral"], [B.y610k, "smug"]];
  const yawB = cardYaw(cam, P), ci = Math.sign(sub3(tr(TR.trader), P)[0] * CAMR.x + sub3(tr(TR.trader), P)[2] * CAMR.z) >= 0 ? 1 : 0;
  const hGive: Hand = { a: "chest", b: onCard(cam, P, yawB, hand), k: give, hold: got ? null : "orderslip", ang: -20, front: true };
  const hs: [Hand | null, Hand | null] = ci ? [{ a: "hip" }, hGive] : [hGive, { a: "hip" }];
  stageBoss(out, cam, f, P, hdg, { mode: walking ? "walk" : "stand", phase: (f - B.trader) / 10, expr: exprAt(f, bkeys), hands: hs, nod: 0.3 * give }, TRADER_HEAD, bkeys);
  // fix2 (audit 8): the slip is what makes the typo understandable later: as he reads it the readable copy GROWS to 1.6x
  // (about 320 px wide at 1080) from his hand toward the boss (its left edge stays at his hand), above the caption band
  if (slipW && read > 0.25) { const k = smooth((read - 0.25) / 0.6), sz = 1 + 0.6 * k, d = 0.13 * (sz - 1);
    fx(out, "slip610x2", 512, 320, (p) => { p.g.save(); p.g.scale(2, 2); fxOrderSlip(p); p.g.restore(); }, [slipW[0] + CAMR.x * d, slipW[1] - 0.06 * k, slipW[2] + CAMR.z * d], 0.26 * sz, 0.163 * sz); }
};

/** shot 6: over his shoulder he types the order (taps on the digits), then, round at his calm face: "Easy mistake." =
 *  a held deadpan (half-lids, a flat mouth) while he sips his tea (reach, lift with an anticipation dip, a 16 f sip, down,
 *  settle) */
const shot6 = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT;
  const taps = [0, 1, 2, 3, 4, 5].map((k) => B.n610k + 3 + (k * (B.n610kEnd - B.n610k - 8)) / 5).concat([B.yen1 + 1]);
  const dipR = Math.max(0, ...taps.map((t) => bump(f, t - 2, 2, 3)));
  const pre = f >= B.types - 2 && f < B.n610k - 4, dipL = pre && (f % 6) < 2 ? 1 : 0, dipR2 = pre && ((f + 3) % 6) < 2 ? 1 : 0;
  const k = taps.filter((t) => f >= t - 2).length, numX = [0.15, 0.12, 0.17, 0.13, 0.13, 0.13, 0.15][Math.min(6, k)];
  const kbR = tr([numX, KB_R[1] + 0.035 - 0.03 * Math.max(dipR, dipR2), KB_R[2] - 0.01]);
  // fix3 (owner): a REAL sip. Deadpan from the cut; the cup (already in his hand at the cut) comes up to his mouth (12 f),
  // the rim AT the lips, tilted toward him, more as he drinks; head tips back, lids half-close; a 16 f held sip; the cup
  // goes down (12 f) and the calm half-smile arrives as it clears his mouth, held to the cut on "41"
  const keys: [number, Expr][] = [[0, "focus"], [B.yen1End + 2, "calm"], [CUT6 + 1, "deadpan"], [SIP6.down + 7, "calm"]];
  const ex = exprAt(f, keys), dead = f >= B.easy - 3, ots = f < CUT6;
  const grab = smooth((f - (CUT6 - 12)) / 8), lift = gest(f, SIP6.lift, 12), down = gest(f, SIP6.down, 12), up = clamp(lift, -0.1, 1.06) * (1 - clamp(down, 0, 1));
  const sipK = smooth((f - (SIP6.sip - 3)) / 6) * (1 - smooth((f - (SIP6.down - 2)) / 6));
  const cup = tr(add(TR.tea, [0, -0.005, 0]));
  // the hand: from the posed head (computed on a first pass) to beside-below his mouth (screen left), pulled toward the
  // lens so the cup covers the mouth; the cup's rim (holdProp "yunomi": 16.5 u up its tilted axis) lands on his lips
  const base = stageTraderProbe(cam, f, ex);
  const lips = toward(add(base.head, [SIPX * CAMR.x, -0.2 + SIPY + 0.012 * sipK, SIPX * CAMR.z]), vec(cam.pos), 0.14);
  void kbR; const hw = lerp3(lerp3(tr([0.3, 0.77, 1.5]), cup, grab), lips, up);
  const holding = f >= CUT6 - 4;
  stageTrader(out, cam, { f, tau: VF, heading: Math.PI, expr: ex, keys, lookW: dead ? undefined : tr(TR.screen.c), blinkOff: dead, blink: Math.max(0.22 * sipK, bump(f, SIP6.down + 6, 2, 3)),
    // over the shoulder (before the cut) his hands sit right under the lens: ball hands that big read as blots, so the
    // arms stay down (the keys move on the DESK's screen); from the cut his right hand holds the tea
    hL: null, hR: ots ? null : { w: hw, hold: holding ? "yunomi" : undefined, n: VF, ang: (24 + 20 * sipK) * clamp(up, 0, 1), elbow: 0.2, up: 4 },
    hide: deskHand(6, f) ? 1 : null, o: { ...(dead ? { look: 0, lookY: 0 } : {}), headTilt: -2.5 * sipK, nod: -0.5 * sipK, face: { fdy: -2.5 * sipK } } });
};
/** the trader's head position for a basic pose (no hands), for targets that depend on it */
const stageTraderProbe = (cam: CamInfo, f: number, ex: Expr) => {
  const P = traderAt(0, Math.PI), yaw = cardYaw(cam, P), ori = orient(cam, P, Math.PI), L = life(VF, TRD.i);
  const o: PersonOpts = { mode: "chair", view: ori.view, facing: ori.facing, breath: L.breath, tilt: 0.6 * L.sway, headTilt: 0.8 * L.head, expr: ex };
  void f; return { head: headW(TRD, o, P, yaw), P, yaw };
};

/** shot 8 (MYSTERY + CANCEL): his face in the screen glow, a "?" in his glasses (how .. exist?), calm -> uneasy; the boss
 *  bursts in and SHOUTS "Cancel it!" (lip flaps, pointing at the screen); he slams the CANCEL key ("Nothing." = a frozen
 *  blank stare, held), "Again." = harder (a lean, a grimace), "Nothing." = the same stare + a sweat drop */
const cancelHand = (f: number) => {
  const B = BEAT, s1 = B.cancel3 + 6, s2 = B.again + 4;
  const rise = smooth((f - (B.they + 2)) / 10);
  let y = 0.07;
  if (f >= s1 - 5 && f < s1 - 2) y = 0.07 + 0.03 * smooth((f - s1 + 5) / 3);
  else if (f >= s1 - 2 && f < s1) y = lerp(0.1, 0.012, ((f - s1 + 2) / 2) ** 2);
  else if (f >= s1 && f < s1 + 8) y = 0.012;
  else if (f >= s1 + 8 && f < s1 + 16) y = lerp(0.012, 0.05, smooth((f - s1 - 8) / 8));
  else if (f >= s1 + 16 && f < s2 - 6) y = 0.05;
  else if (f >= s2 - 6 && f < s2 - 2) y = lerp(0.05, 0.15, smooth((f - s2 + 6) / 4));
  else if (f >= s2 - 2 && f < s2) y = lerp(0.15, 0.008, ((f - s2 + 2) / 2) ** 2);
  else if (f >= s2 && f < s2 + 10) y = 0.008;
  else if (f >= s2 + 10) y = lerp(0.008, 0.04, smooth((f - s2 - 10) / 10));
  return { rise, y };
};
const shot8 = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT;
  const keys: [number, Expr][] = [[0, "calm"], [B.how - 2, "ponder"], [B.doesnt - 2, "uneasy"], [B.cancelIt - 2, "shock"], [B.cancelItEnd + 2, "worry"], [B.press - 2, "peer"],
    [B.cancel3 + 4, "wince"], [B.nothing1 - 2, "stare"], [B.again - 2, "grimace"], [B.nothing2 - 2, "stare"]];
  const ex = exprAt(f, keys), held = ex === "stare";
  const qk = smooth((f - (B.how - 4)) / 8) * (1 - smooth((f - B.exist2End) / 8));
  const jolt = gest2(f, B.cancelIt - 2, 4, B.cancelIt + 8, 10), lean = gest2(f, B.again - 6, 6, B.nothing2 + 12, 16);
  const { rise, y } = cancelHand(f), key = tr(TR.cancelKey);
  const hov = lerp3(tr(add(KB_L, [0, 0.03, 0])), add(key, [0, y, 0.02]), rise);
  const bossHead = tr([TR.boss[0], 1.45, TR.boss[2]]);
  const lookW = f >= B.cancelIt - 2 && f < B.cancelItEnd + 6 ? bossHead : f >= B.press - 4 && f < B.cancel3 + 12 ? key : tr(TR.screen.c);
  const sweat = f >= B.nothing2 - 1 ? smooth((f - (B.nothing2 - 1)) / 3) : 0, mh = mystHand(f), myst = f < B.cancelIt - 6;   // fix2 (audit 11): his right hand lifts the ghost sheet
  // fix2 (audit 7): the first "Nothing." = the frozen close-up with ONE slow blink (6 f); the second is the two-shot
  stageTrader(out, cam, { f, tau: VF, heading: Math.PI, expr: ex, keys, lookW, lean: 0.8 * lean, blinkOff: held, blink: held && f < B.again - 8 ? blinkN(f, B.nothing1 + 16, 6) : 0,
    // (fix2, audit 11: through the mystery his hands rest in his lap, never two stubs reaching for the keys; one lifts the ghost sheet)
    hL: myst ? null : { w: hov, bend: 0.7 }, hR: mh ? { w: tr(mh), bend: 0.7 } : myst ? null : { w: tr(add(KB_R, [0, 0.03, 0])), bend: 0.6 }, hide: deskHand(8, f) ? (f >= B.they ? 0 : 1) : null,
    body: myst ? [{ a: "lap" }, { a: "lap" }] : undefined,
    o: { tilt: -4 * jolt + 3 * lean, headTilt: 3 * jolt, crouch: 0, sweat, face: { qmark: qk, glassDy: 2 * jolt } } });
  // the boss: off at bossFrom, bursts in over 14 f just before "Cancel it!", shouts pointing at the screen, then stands tense
  const arr = smooth((f - (B.cancelIt - 16)) / 14), walking = arr > 0.01 && arr < 0.99;
  const P = lerp3(tr(TR.bossFrom), tr(TR.boss), 1 - (1 - arr) ** 1.6);
  const scr0 = tr(TR.screen.c), hdg = walking ? Math.atan2(TR.boss[0] - TR.bossFrom[0], TR.boss[2] - TR.bossFrom[2]) : Math.atan2(scr0[0] - P[0], scr0[2] - P[2]);
  const bkeys: [number, Expr][] = [[0, "stern"], [B.cancelIt - 2, "shout"], [B.cancelItEnd + 1, "worry"], [B.nothing1 - 2, "stare"], [B.again - 2, "grimace"], [B.nothing2 - 2, "stare"]];
  const point = gestO(f, B.cancelIt - 3, 8) * (1 - gest(f, B.cancelItEnd + 6, 12)), chin = smooth((f - (B.cancelItEnd + 14)) / 12);
  // fix2 (audit 4): he points DOWN past the trader at the CANCEL key (the old aim, the screen top, put his hand on the
  // trader's head: it read as a pat)
  const yawB = cardYaw(cam, P), sh = add(P, [0, 1.3, 0]), tip = along(sh, tr([0.15, 0.62, 1.6]), 0.5);
  const ci = (sub3(scr0, P)[0] * CAMR.x + sub3(scr0, P)[2] * CAMR.z) >= 0 ? 1 : 0;
  const hP: Hand = { a: "hip", b: onCard(cam, P, yawB, tip), k: point, shape: point > 0.6 ? "f1" : "ball", front: true, maxLen: 1.3 };
  const hO: Hand = { a: "hip", b: "chin", k: chin * 0.85, front: true };
  const talk = shoutShape(f), sw2 = f >= B.nothing2 - 1 ? 1 : 0, lean2 = gest(f, B.nothing2 - 12, 14);   // fix2: he leans in beside the trader for the second "Nothing."
  stageBoss(out, cam, f, P, hdg, { mode: walking ? "walk" : "stand", phase: (f - (B.cancelIt - 16)) / 9, expr: exprAt(f, bkeys), talk, yell: true,
    tilt: (talk >= 0 ? -3 : 0) + 5 * lean2, crouch: (talk >= 0 ? -0.06 : 0) + 0.1 * lean2, sweat: sw2, hands: ci ? [hO, hP] : [hP, hO] }, scr0, bkeys);
  if (talk >= 0) { const hw = add(P, [0, 1.62, 0]), k = 0.6 + 0.4 * (talk === 1 ? 1 : 0.5);
    fx(out, `burst|${q(k, 8)}|${ci}`, 128, 128, (p) => fxBurst(p, k), toward(along(hw, add(scr0, [0, 0.6, 0]), 0.32), vec(cam.pos), 0.1), 0.32, 0.32, { rot: ci ? 0 : Math.PI }); }
};

/** shot 12 (evening): the trader slumped at his desk, cheek on his hand, a long sigh */
const shot12 = (out: Stage, cam: CamInfo, f: number) => {
  const sigh = 0.5 + 0.5 * Math.sin((TAU * VF) / 90);
  // fix2 (audit 5): the closer, lower lens sits behind his left shoulder: he is turned a little toward it in his chair (a 3/4
  // front: the tired face reads), never the back of a head
  // fix4 (4): four beats instead of one deadpan: cheek on hand (tired) -> he RUBS HIS EYES on "back." -> looks UP at the
  // rising ghost shares, worried ("96,000") -> a WINCE on "never existed" -> the SLUMP on "so it paid cash" (head down, arms drop)
  const B = BEAT, rub = gest2(f, B.back - 3, 14, B.but2 + 12, 14), up = gest2(f, B.n96k - 4, 16, B.so - 6, 16), slump = gest(f, B.so - 4, 18);
  const keys: [number, Expr][] = [[0, "tired"], [B.n96k, "worry"], [B.never, "wince"], [B.so + 4, "tired"]];
  const rk = clamp(rub, 0, 1), uk = clamp(up, 0, 1), sk = clamp(slump, 0, 1), scrub = rk * Math.sin((TAU * (f - B.back)) / 9);
  stageTrader(out, cam, { f, tau: VF, heading: Math.PI + 0.55, expr: exprAt(f, keys), keys, lookW: uk > 0.5 ? tr([-0.8, 2.3, 2.9]) : tr([0, 0.8, 1.3]), blink: rk > 0.4 ? 1 : 0,
    body: [sk > 0.5 ? { a: "lap" } : { a: "chin", b: "eye", k: rk, dx: 6 + 3 * scrub, dy: 4 * (1 - rk) + 2 * scrub }, { a: "lap" }],
    o: { tilt: -5 + 3 * uk - 6 * sk, headTilt: 9 - 7 * uk + 6 * sk + 1.5 * scrub, nod: 0.6 - 0.9 * uk + 0.7 * sk, breath: 1.8 * sigh - 0.6 - 1.2 * sk } });
};

/** the office staff at their rows: typing (backs to the room's +z end), one standing on the phone, one reading a report;
 *  the evening: three left, tired (a yawn + a stretch, a cheek on the hand, one packing up) */
/** more seated staff at the other desks' seats (seat = desk centre + 0.75 m; CHAR-local marks, they fill the room wide)
 *  and the evening's two late workers far down the hero row (the TR.staff seats near the lens put faces in the
 *  caption band in shot 12) */
const EXTRA: V3[] = [[-2.6, 0, -3.95], [0, 0, -3.95], [2.7, 0, -3.95], [-5.3, 0, -3.95], [-5.3, 0, -1.2], [5.3, 0, -3.95]];
const SEATS: V3[] = [...TR.staff, ...EXTRA];
const EVE_STAFF = [1, 13];
const EVE_EXTRA: V3 = [5.3, 0, 1.9];
const staff = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const tau = toVid(id), eve = id === 12;
  [...SEATS, EVE_EXTRA].forEach((p0, k) => {
    if (eve ? !EVE_STAFF.includes(k) : k === 13) return;
    const A: Act = { i: 10 + k, key: `staff${k}`, o: staffFit(k) }, P = tr(p0), L = life(tau, A.i);
    // in the desk shots (1 / 6 / 8 / 14) the seated staff behind the hero desk are turned in their chairs, chatting with a
    // neighbour (3/4 faces, never a row of back-of-head balls); in the room wides (5 / 12) they work at their screens
    const chat = id !== 5 && id !== 12 && k !== 1 && k !== 4;
    let heading = chat ? (k % 2 ? -1 : 1) * 1.95 : Math.PI, mode: PersonOpts["mode"] = "chair", expr: Expr = chat ? (["smile", "listen", "laugh"] as Expr[])[(k + Math.floor((tau + 29 * k) / 70)) % 3] : "focus";
    let hands: [Hand | null, Hand | null] = chat ? [{ a: "lap" }, { a: "chest", dx: 6, dy: -4 }] : [{ a: "chest", dx: -8 }, { a: "chest", dx: 8 }];
    let extra: PersonOpts = {};
    const cyc = Math.floor((tau + 37 * k) / 48) % 3;
    if (!eve && k === 1) { heading = 0.5; mode = "stand"; expr = (["smile", "listen", "nod"] as Expr[])[cyc]; hands = [{ a: "hip", dx: -6, dy: 10, hold: "phone" }, { a: "ear", hold: "handset", n: 0.3 * Math.sin(tau * 0.2) }]; }
    else if (!eve && k === 4) { heading = 2.7; mode = "stand"; expr = "readLow"; hands = [{ a: "chest", dx: -10, dy: -10, hold: "newspaper" }, { a: "chest", dx: 12, dy: -8 }]; extra = { lookY: 1 }; }
    else if (eve && k === 1) { const yw = smooth(0.5 + 0.7 * Math.sin((TAU * tau) / 150)); expr = yw > 0.6 ? "yawn" : "tired"; hands = [{ a: "hip", b: "up", k: yw }, { a: "hip", b: "up", k: yw }]; extra = { tilt: -4 * yw }; }
    else if (eve && k === 13) { heading = -1.9; mode = "stand"; expr = "sigh"; hands = [{ a: "hang", hold: "briefcase" }, { a: "hang" }]; }
    const ori = orient(cam, P, heading, mode === "stand" ? -0.5 : -0.15);
    put(out, cam, A, P, { mode, view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway + (extra.tilt ?? 0), headTilt: L.head + (extra.headTilt ?? 0), shift: L.shift,
      expr, blink: blinkAt(tau, A.i), hands, lookY: extra.lookY ?? 0.4, nod: extra.nod }, { noBlob: mode === "chair" });
  });
};

const trading = (out: Stage, cam: CamInfo, id: number, f: number) => {
  staff(out, cam, id, f);
  if (id === 1 || id === 14) traderLoop(out, cam, id, f);   // fix2 (Design A): the front medium, the whole shot
  else if (id === 5) shot5(out, cam, f);
  else if (id === 6) shot6(out, cam, f);
  else if (id === 8) shot8(out, cam, f);
  else if (id === 12) shot12(out, cam, f);
};

// ---------------- the Tokyo street (shot 2) ----------------
/** salarymen with briefcases crossing in front of the exchange (walk cycles), one heading in through the entrance */
const street = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  const t = f - SHOTS[1].a;
  // fix2 (audit 2): THE TRADER walks to work along the far sidewalk (past the vending machines to the doors): a can of
  // green tea in his hand (one calm sip on "2005"), his lanyard swinging: the story stays on him between the hook and
  // his desk. He is in front of the salarymen's lanes (z -1.0), the only white shirt among dark suits.
  {
    // fix4 (1): he walks the kerb, then TURNS IN toward the exchange doors (the last third): the story's man goes to work
    const u = clamp01((t + 8) / (SHOTS[1].b - SHOTS[1].a + 16)), ua = clamp01(u / 0.68), ub = smooth((u - 0.62) / 0.38), tn = smooth((u - 0.6) / 0.14);
    const P = st([4.5 - 3.0 * ua - 0.3 * ub, 0, -1.0 - 0.8 * ub]), L = life(VF, TRD.i), ori = orient(cam, P, -Math.PI / 2 - (Math.PI / 2) * tn, -0.6);
    const sip = gest2(f, BEAT.y2005 - 6, 14, BEAT.small - 4, 14), keys: [number, Expr][] = [[0, "calm"], [BEAT.y2005 + 6, "bliss"], [BEAT.small + 6, "content"]];
    put(out, cam, TRD, P, { mode: "walk", phase: t / 13, lift: 0.9, view: ori.view, facing: ori.facing, breath: L.breath, expr: exprAt(f, keys), blink: Math.max(blinkAt(VF, TRD.i), swapLid(f, keys)),
      look: -0.5, lookY: 0.1, cardSwing: 0.7 * Math.sin((TAU * t) / 13), nod: -0.25 * sip,
      hands: [{ a: "hang" }, { a: "chest", b: "mouth", k: clamp(sip, 0, 1), dx: 6, dy: 4, hold: "teacan", ang: -14 * sip, front: true }] });
  }
  // fix4 (1): once the taxi is past and the signal turns, two salarymen step off the far kerb and cross the zebra TOWARD
  // the lens (the big near figures of the shot)
  [[-1.55, 0], [-0.75, 9]].forEach(([x0, d], k) => {
    const A: Act = { i: 26 + k, key: `sal${k + 1}`, o: salaryFit(k + 1) }, L = life(VF, A.i), go = BEAT.small - 21 + d, w = gest(f, go, 14);
    const P = st([x0, 0, -0.45 + 0.036 * Math.max(0, f - go - 4)]), ori = orient(cam, P, 0, -0.5);
    put(out, cam, A, P, { mode: w > 0.05 ? "walk" : "stand", phase: (f - go) / 14, lift: 0.9 * w, view: ori.view, facing: ori.facing, breath: L.breath, expr: k ? "calm" : "focus",
      blink: blinkAt(VF, A.i), hands: [{ a: "hang", hold: "briefcase" }, { a: "hang" }] });
  });
  ST.walkers.forEach((p0, k) => {
    const A: Act = { i: 20 + k, key: `sal${k}`, o: salaryFit(k) }, L = life(VF, A.i), into = k === 3, dir = k % 2 ? -1 : 1, v = 0.024 + 0.004 * (k % 3);
    const P = into ? st([p0[0] + 0.3, 0, p0[2] + 1.2 - 0.016 * t]) : st([p0[0] + dir * v * (t - 50), 0, p0[2]]);
    const heading = into ? Math.PI : dir > 0 ? Math.PI / 2 : -Math.PI / 2, ori = orient(cam, P, heading, -0.5);
    put(out, cam, A, P, { mode: "walk", phase: (t + 7 * k) / 15, lift: 0.9, view: ori.view, facing: ori.facing, breath: L.breath, expr: (["focus", "neutral", "calm"] as Expr[])[k % 3],
      blink: blinkAt(VF, A.i), wind: 0.3 * windAt(VF, A.i), flutter: 0.3 * flutAt(VF, A.i), hands: [{ a: "hang", hold: k === 3 ? "handbag" : "briefcase" }, { a: "hang" }] });
  });
};

// ---------------- the exchange lobby (shots 3 / 4 / 7 / 9) ----------------
/** the invented debut mascot strikes the hanging debut bell (TOKYO's BELL, swinging from "starts" - 3) with a little
 *  mallet: the arm out to the bell (8 f), a wind-up, the hit ON starts - 3, two more happy taps, a hop, ^^ eyes, the
 *  free hand waving */
const STRIKES = [BEAT.starts - 3, BEAT.starts + 10, BEAT.starts + 22];
const mascot = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT, t = f - (B.starts - 3), P = lb(LB.bell), L = life(VF, 60), sc = 1.25;
  const arm = gest(f, B.starts - 16, 8);
  // the mallet: wound back (-35 deg) before each hit, swung through to +45 on the hit, eased back
  let mal = -10 * arm;
  for (const s of STRIKES) { const u = f - s; if (u >= -5 && u < 0) mal = -10 - 30 * smooth((u + 5) / 5); else if (u >= 0 && u < 2) mal = lerp(-40, 45, (u + 1) / 2); else if (u >= 2 && u < 9) mal = lerp(45, -10, smooth((u - 2) / 7)); }
  const hop = t >= 0 && t < 16 ? -0.6 * Math.sin((Math.PI * t) / 16) : 0.15 * L.breath + (f >= B.starts - 7 && f < B.starts - 3 ? 0.3 : 0);
  const yaw = yawFrom(vec(cam.pos), P), hand = onCard(cam, P, yaw, lb(add(BELL, [0.32, -0.12, 0.25])), sc);
  const st0 = { ring: 0, arm: q(arm, 30), hop: q(hop, 30), blink: f < B.starts - 4 ? blinkAt(VF, 60) : 0, joy: f >= B.starts - 4 ? 1 : 0, light: 0,
    wave: q(f >= B.starts + 4 ? 0.5 + 0.5 * Math.sin(f * 0.35) : 0, 10), strike: [q(hand[0], 1), q(hand[1], 1)] as P2, mallet: q(mal, 1) };
  putCard(out, cam, `mascot|${fkey(st0)}`, P, (p) => drawMascot(p, st0), { scale: sc, yaw });
  blob(out, P[0], P[1], P[2], 1.1, 1, false);
};
const VIS: Act[] = [0, 1, 2, 3].map((v) => ({ i: 30 + v, key: `vis${v}`, o: visitorFit(v) }));
/** shot 3: visitors watching the ticker wall and the mascot (two turn to it and clap on "starts"); shot 9: the crash
 *  (staggered 0-4 f): hands to the head, a hand to the mouth, a frozen stare, a step back */
/** CHAR-local visitor marks (LB.crowd falls outside the TOKYO framings / in front of the mascot): shot 3 flanks the
 *  mascot (two turn to it), shot 9 = two backs-of-heads framing the bottom corners in front of the red wall (the ticker
 *  drum's front is at z ~ -1.3: nobody can stand nearer to it) */
const VIS3: V3[] = [[2.5, 0, 0.2], [1.4, 0, -1.0]];
/** shot 9: placed from the shot's camera at the crash (a fixed reference: they never swim with the creep), 2.9 m out,
 *  0.55 m either side of the axis, never nearer the drum than z -1.0 (lobby-local) */
const vis9 = (): V3[] => {
  const c = camAt(9, BEAT.crashes), F = nrm3([c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]]), R: V3 = [-F[2], 0, F[0]];
  return [-0.55, 0.55].map((s) => { const x = c.pos[0] + F[0] * 2.9 + R[0] * s - LB.base[0], z = c.pos[2] + F[2] * 2.9 + R[2] * s - LB.base[2]; return [x, 0, Math.max(-1.0, z)] as V3; });
};
const visitors = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const B = BEAT, tick = add(LB.ticker.c, [0, 2.6, 0]);
  (id === 3 ? VIS3 : vis9()).forEach((p0, k) => {
    const A = VIS[k], L = life(VF, A.i), P = lb(p0);
    let heading = Math.atan2(tick[0] - p0[0], tick[2] - p0[2]), expr: Expr = "curious", hands: [Hand | null, Hand | null] = [{ a: "hang" }, { a: "hang" }], ex: PersonOpts = {};
    const fan = id === 3 && k !== 1;
    if (fan) {
      heading = Math.atan2(LB.bell[0] - p0[0], LB.bell[2] - p0[2]);
      const clap = f >= B.starts && f < B.starts + 30 ? Math.abs(Math.sin(((f - B.starts) * Math.PI) / 6)) : 0;
      expr = f >= B.starts - 2 ? "grin" : "smile"; hands = [{ a: "chest", dx: 10 * clap - 4 }, { a: "chest", dx: -10 * clap + 4 }];
    } else if (id === 9) {
      // backs to us, facing the red wall: both hands fly to the head / one hand to the head + a recoil (staggered 3 f)
      const c0 = B.crashes - 2 + 3 * k, hit = gest(f, c0, 8);
      expr = f >= c0 ? "gasp" : "curious";
      hands = k === 0 ? [{ a: "hang", b: "head", k: hit }, { a: "hang", b: "head", k: hit }] : [{ a: "hang" }, { a: "hang", b: "head", k: hit, dy: -6 }];
      ex = { crouch: k === 1 ? -0.12 * gest2(f, c0, 4, c0 + 8, 10) : 0.06 * hit, tilt: (k ? 3 : -3) * hit };
    }
    const ori = orient(cam, P, heading, fan ? -0.7 : -0.15);
    put(out, cam, A, P, { view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift, expr, blink: Math.max(blinkAt(VF, A.i)), hands, lookY: -0.6, ...ex });
  });
};
/** shots 4 / 7: two onlookers flanking the pedestal; shot 7: their heads tip up as the tower rises through the ceiling */
const ONL: V3[] = [[-1.25, 0, -0.7], [1.0, 0, -1.0]];
const onlookers = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const B = BEAT, PED = LB.pedestal.c;
  ONL.forEach((d, k) => {
    if (k === 0) return; // (the one behind the pedestal only peeked out: removed)
    const A = VIS[k + 2], L = life(VF, A.i), P = lb(add(PED, d)), heading = Math.atan2(-d[0], -d[2]);
    const up = id === 7 ? smooth((f - (B.n41 - 2 + 3 * k)) / 30) : 0;
    const keys: [number, Expr][] = id === 7 ? [[0, "curious"], [B.n41 - 2 + 3 * k, "gazeO"], [B.more + 4 * k, "ohWide"]] : [[0, "curious"], [B.n14500 + 6 * k, "intrigued"]];
    const ori = orient(cam, P, heading, -0.7);
    put(out, cam, A, P, { view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway - 3 * up, headTilt: L.head - 6 * up * ori.facing, shift: L.shift, expr: exprAt(f, keys),
      blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), look: 0.6 * -Math.sign(d[0]), lookY: lerp(0.5, -1.3, up), face: { fdy: -4 * up },
      hands: k === 0 ? [{ a: "hip" }, { a: "chin", k: 1 }] : [{ a: "hang", hold: "handbag" }, { a: "hang" }] });
  });
};
/** fix2 (audit 2): shot 4: the museum guard beside the plinth flicks a red duster cloth over the one tidy stack (a slow
 *  14 f wipe, twice), then stands back proud as the plaque lands on 14,500 */
const GUARD: Act = { i: 36, key: "guard", o: GUARD_FIT };
const guard = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT, PED = LB.pedestal.c, P = lb(add(PED, [-0.7, 0, -0.1])), L = life(VF, GUARD.i), yaw = cardYaw(cam, P), ori = orient(cam, P, Math.PI / 2, -0.8);
  const wipe = 1 - smooth((f - (B.n14500 + 18)) / 14), sw = Math.sin(((f - B.itHas) * TAU) / 28);
  const top = lb(add(PED, [-0.2 + 0.13 * sw, LB.pedestal.h + 0.42, 0.12]));
  const keys: [number, Expr][] = [[0, "focus"], [B.n14500 + 24, "proud"]];
  put(out, cam, GUARD, P, { view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway + 4 * wipe, headTilt: L.head, shift: L.shift, expr: exprAt(f, keys), blink: Math.max(blinkAt(VF, GUARD.i), swapLid(f, keys)),
    look: 0.9, lookY: 0.5 * wipe, hands: ori.facing >= 0 ? [{ a: "hip" }, { a: "hip", b: onCard(cam, P, yaw, top), k: wipe, hold: "rag", n: sw, front: true, maxLen: 1.3 }]
      : [{ a: "hip", b: onCard(cam, P, yaw, top), k: wipe, hold: "rag", n: sw, front: true, maxLen: 1.3 }, { a: "hip" }] }, { yaw });
};
const lobby = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (id === 4) guard(out, cam, f);
  if (id === 3) { mascot(out, cam, f); visitors(out, cam, id, f); }
  // shot 9: no visitors (in front of the drum their heads land in the caption band; the wall carries the crash)
  else if (id === 7) onlookers(out, cam, id, f);
};

// ---------------- homes across Japan (shot 10) ----------------
/** a buyer at a PC in an open room (HM read at runtime: the HOMES owner may move the rooms): seated, turned to the
 *  desk at his left, clicking BUY 3 times (staggered) between "buyers" and "shares." */
type HomeKey = "office" | "grandma" | "cafe";
const buyer = (out: Stage, cam: CamInfo, f: number, a: Act, name: HomeKey, happy: Expr) => {
  // the HOMES layout's marks (read at runtime): seat, screen side, mouse, the BUY click frame; grandma kneels on a floor
  // cushion (the card sinks 0.3 m into the floor slab and is cut there: eyes ~0.88 m)
  const M = MARKS[name], floor = M.seat === "floor", P = hm(add(M.p, [0, floor ? -0.3 : 0, 0])), yaw = cardYaw(cam, P), L = life(VF, a.i);
  const c = CLICK[name], n = bump(f, c - 2, 2, 4), clicked = f >= c, side = (M.face > 0 ? 1 : -1) as -1 | 1;
  const drift = 0.015 * Math.sin((f - c) * 0.25) * (f < c - 4 ? 1 : 0);
  const mouse = hm(add(MICE[name], [drift, 0.012 + (floor ? 0.004 : 0), 0]));
  const keys: [number, Expr][] = [[0, "focus"], [c, happy]];
  const ci = side > 0 ? 1 : 0;
  const o: PersonOpts = { mode: "chair", facing: side, breath: L.breath, tilt: L.sway + 2 * side, headTilt: L.head, expr: exprAt(f, keys), blink: Math.max(blinkAt(VF, a.i), swapLid(f, keys)),
    look: 1.1 * side, lookY: 0.3, nod: 0.4 * n, ...(floor ? { cutY: 975 - 0.3 / SU } : {}), hands: ci ? [{ a: "lap" }, { a: "lap", hide: true }] : [{ a: "lap", hide: true }, { a: "lap" }] };
  put(out, cam, a, P, o, { yaw, noBlob: true });
  reachArm(out, cam, a, P, yaw, o, ci as 0 | 1, mouse, { hold: "mouse", n, bend: 0.6 });
};
const BUYERS: Act[] = [{ i: 40, key: "worker", o: WORKER_FIT }, { i: 41, key: "granny", o: GRANNY_FIT }, { i: 42, key: "student", o: STUDENT_FIT }];
const KID: Act = { i: 43, key: "buyer27", o: BUYER_FIT };
/** the 27-year-old in his flat (generic, no likeness): eyes on his monitors (screen right), the mouse hand clicks BUY,
 *  one deliberate 4 f BLINK after the counter lands on "¥2 billion" (no idle blinks from "One 27-year-old" on, so the
 *  one blink reads) */
const BLINK27 = BEAT.billion2End - 10;
const kid = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT, a = KID, M = MARKS.buyer, P = hm(M.p), yaw = cardYaw(cam, P), L = life(VF, a.i), side = (M.face > 0 ? 1 : -1) as -1 | 1;
  const keys: [number, Expr][] = [[0, "focus"], [B.b2 - 2, "read"]];
  const quiet = f >= B.one27 - 6, c = CLICK.buyer, n = bump(f, c - 2, 2, 4);
  const o: PersonOpts = { mode: "chair", facing: side, breath: L.breath, tilt: 0.5 * L.sway + 2 * side, headTilt: 0.5 * L.head, expr: exprAt(f, keys),
    blink: quiet ? Math.max(blinkN(f, BLINK27, 4), swapLid(f, keys)) : blinkAt(VF, a.i), look: 1.2 * side, lookY: f >= B.b2 - 2 ? -0.3 : 0.4,
    hands: [{ a: "lap", hide: true }, { a: "lap", hide: true }] };
  put(out, cam, a, P, o, { yaw, noBlob: true });
  const mouse = hm(add(MICE.buyer, [0, 0.012, 0]));
  reachArm(out, cam, a, P, yaw, o, side > 0 ? 1 : 0, mouse, { hold: "mouse", n, bend: 0.6 });
  reachArm(out, cam, a, P, yaw, o, side > 0 ? 0 : 1, add(mouse, [-0.34 * side, 0.01, 0.06]), { bend: 0.6 });
};
const homes = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  buyer(out, cam, f, BUYERS[0], "office", "smirk");
  buyer(out, cam, f, BUYERS[2], "cafe", "grin");
  buyer(out, cam, f, BUYERS[1], "grandma", "content");
  kid(out, cam, f);
};

// ---------------- the notice-board hall (shot 11) ----------------
/** the big cartoon hand pushes the pin of "SELLING!" home over PIN_F +- 3 (HALL draws the pin + the note): it glides in
 *  from the lower right (16 f), pulls back a hair (anticipation), the push, held, out after "up" */
const PIN_HEAD = (): V3 => hl(add(HL.note, [0, 0.35, 0.05]));
const pinHand = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT, tip = PIN_HEAD(), sc = 0.9;
  if (f < PIN_F - 24 || f > B.up + 26) return;
  const inn = smooth((f - (PIN_F - 24)) / 16), outk = smooth((f - Math.max(PIN_F + 8, B.up + 6)) / 16);
  const back = f >= PIN_F - 7 && f < PIN_F - 3 ? 0.08 * smooth((f - (PIN_F - 7)) / 4) : 0;
  const push = f >= PIN_F - 3 ? smooth((f - (PIN_F - 3)) / 6) : 0, press = push > 0.5 && outk < 0.2 ? 1 : 0;
  const off = 1 - inn + outk, z = 0.1 + back - 0.07 * push;
  const at: V3 = [tip[0] + 0.9 * off, tip[1] - 1.0 * off, tip[2] + z];
  const pos: V3 = [at[0], at[1] - (975 - 300) * SU * sc, at[2]];
  putCard(out, cam, `pinhand|${press}`, pos, (p) => drawPinHand(p, press, false), { yaw: 0, scale: sc });
};
/** the tabs: tab i is snatched at TAB_F(i) and flies (TAB_FLY f) to the raised hand of crowd mark TAB_HAND(i): that
 *  hand shoots up 4 f before, catches, and the catcher keeps the tabs up with a delighted face (exported for HALL) */
export const TAB_GRABS = Array.from({ length: TABS }, (_, i) => TAB_F(i));
export const tabTaken = (k: number, f: number) => k < TABS && f >= TAB_F(k);
const CROWD: Act[] = [0, 1, 2, 3, 4].map((v) => ({ i: 50 + v, key: `crowd${v}`, o: crowdFit(v) }));
/** the SELLER stands on crowd mark 2 (the note push-in frames it); that catcher steps 0.5 m to his right */
const SELLER_MARK = 2;
const crowdAt = (k: number): V3 => (k === SELLER_MARK ? add(HL.crowd[k], [0.5, 0, 0.15]) : HL.crowd[k]);
const snatchers = (out: Stage, cam: CamInfo, f: number) => {
  HL.crowd.forEach((p0, k) => {
    const A = CROWD[k], L = life(VF, A.i), P = hl(crowdAt(k)), yaw = cardYaw(cam, P);
    const mine = Array.from({ length: TABS }, (_, i) => i).filter((i) => TAB_HAND(i) === k);
    let reach = 0, caught = 0, cur = -1;
    for (const i of mine) { const c = TAB_F(i) + TAB_FLY; reach = Math.max(reach, gest2(f, c - 6, 4, c + 4, 8)); if (f >= c) caught++; if (f >= c - 8 && f < c + 6) cur = i; }
    const first = mine.length ? TAB_F(mine[0]) + TAB_FLY : 1e9, has = caught > 0;
    const keys: [number, Expr][] = mine.length ? [[0, "curious"], [TAB_F(mine[0]) - 4, "gazeAlert"], [first, "delight"]] : [[0, "curious"], [BEAT.check, "sheepish"]];
    const heading = has ? 0.6 * (k % 2 ? 1 : -1) : Math.PI, ori = orient(cam, P, heading, has ? -0.7 : -0.15);
    const o: PersonOpts = { view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift, expr: exprAt(f, keys),
      blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), crouch: -0.18 * reach, lookY: -0.9 };
    const ci = (k % 2 ? 1 : 0) as 0 | 1;
    const up: Hand = cur >= 0 ? { a: "raise", b: onCard(cam, P, yaw, tabTarget(cur)), k: reach, hold: has ? "tab" : null, over: true, maxLen: 1.35 }
      : { a: has ? "raise" : "hang", hold: has ? "tab" : null, over: true };
    o.hands = ci ? [{ a: "hang" }, up] : [up, { a: "hang" }];
    put(out, cam, A, P, o, { yaw });
  });
};
/** the SELLER (on crowd mark 2) turns his pockets out on "really have it": empty, a few moths flutter out; then he
 *  slinks off right */
const SELLER: Act = { i: 58, key: "seller", o: SELLER_FIT };
const seller = (out: Stage, cam: CamInfo, f: number) => {
  const B = BEAT, L = life(VF, SELLER.i), po = smooth((f - (B.really - 2)) / 8), leave = smooth((f - (B.haveEnd + 10)) / 34);
  const P = hl(add(HL.crowd[SELLER_MARK], [2.4 * leave, 0, 0.3 * leave])), walking = leave > 0.01 && leave < 0.99;
  const keys: [number, Expr][] = [[0, "smug"], [B.check - 2, "shifty"], [B.really - 2, "sheepish"], [B.haveEnd + 2, "whistle"]];
  const ori = orient(cam, P, walking ? Math.PI / 2 : 0.3, -0.7);
  put(out, cam, SELLER, P, { mode: walking ? "walk" : "stand", phase: f / 8, view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift,
    expr: exprAt(f, keys), blink: Math.max(blinkAt(VF, SELLER.i), swapLid(f, keys)), look: f >= B.check - 2 && f < B.really - 2 ? -1.2 : 0, pockets: po,
    hands: po > 0.02 ? [{ a: "pocket", b: "hip", k: 0.3, dy: 10 * po }, { a: "pocket", b: "hip", k: 0.3, dy: 10 * po }] : [{ a: "pocket" }, { a: "pocket" }] });
  // moths out of the pockets: 4, staggered, fluttering up and away (a sway, wings on a fast flap)
  for (let m = 0; m < 4; m++) {
    const t = f - (B.really + 4 + 5 * m); if (t < 0 || t > 50) continue;
    const s = m % 2 ? 1 : -1, x = s * (0.24 + 0.012 * t) + 0.06 * Math.sin(t * 0.4 + m), y = 0.95 + 0.028 * t + 0.05 * Math.sin(t * 0.7 + m * 2);
    const ph = q(((VF * 0.18 + m * 0.3) % 1), 6);
    fx(out, `moth|${ph}`, 128, 128, (p) => fxMoth(p, ph), add(P, [x, y, 0.1]), 0.2, 0.2, { rot: 0.3 * Math.sin(t * 0.3 + m) });
  }
};
const hall = (out: Stage, cam: CamInfo, _id: number, f: number) => { pinHand(out, cam, f); snatchers(out, cam, f); seller(out, cam, f); };

// ---------------- the court (shot 13) ----------------
/** three judges in black robes (the middle one older, white hair, NO gavel): the middle judge points at the broken
 *  CANCEL button on the evidence table on "ruled"; the exchange's lawyer receives the torn receipt slice on "pay" */
/** where the lawyer's hand takes the slice: HALL's SLICE_HAND (hall_time.ts) */
export const LAWYER_HAND: V3 = SLICE_HAND;
const JUDGES: Act[] = [0, 1, 2].map((v) => ({ i: 70 + v, key: `judge${v}`, o: judgeFit(v) }));
const LAWYER: Act = { i: 74, key: "lawyer", o: LAWYER_FIT };
const court = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  LX = "0007";   // fix3: the court card mode (cardshade.ts MODES[7]): faces off the clip, a soft shade side
  const B = BEAT, ev = ct(add(CT.evidence.c, [0, CT.evidence.top + 0.08, 0]));
  CT.judges.forEach((p0, k) => {
    const A = JUDGES[k], L = life(VF, A.i), P = ct(p0), yaw = cardYaw(cam, P), ori = orient(cam, P, 0, -0.5);
    const point = k === 1 ? gest2(f, B.court - 2, 12, B.pay - 2, 14) : 0;
    const keys: [number, Expr][] = k === 1 ? [[0, "stern"], [B.ruled - 4, "squint"], [B.pay - 2, "stern"]] : [[0, "listen"], [B.ruled + 4 * k, "stern"]];
    const o: PersonOpts = { mode: "chair", view: ori.view, facing: ori.facing, breath: L.breath, tilt: 0.6 * L.sway, headTilt: 0.6 * L.head, expr: exprAt(f, keys),
      blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), hands: [{ a: "lap" }, { a: "lap" }] };
    const g = gaze(add(P, [0, 1.25, 0]), ev); o.look = g.look; o.lookY = g.lookY;
    if (point > 0) {
      const sh = add(P, [0, 1.15, 0]), ci = (sub3(ev, P)[0] * CAMR.x + sub3(ev, P)[2] * CAMR.z) >= 0 ? 1 : 0;
      // the judge's arm swings out to the side at shoulder height and points down at the table (a straight forward point
      // would hide behind the bench front from this lens)
      const h: Hand = { a: "lap", b: "point", k: point, dy: 14, shape: point > 0.6 ? "f1" : "ball", ang: 0, front: true, over: true }; void sh;
      o.hands = ci ? [{ a: "lap" }, h] : [h, { a: "lap" }]; o.tilt = (o.tilt ?? 0) + 3 * point * (ci ? 1 : -1);
    }
    put(out, cam, A, P, o, { yaw, noBlob: true });
  });
  const L = life(VF, LAWYER.i), P = ct(CT.lawyer), take = gest(f, SLICE_F + SLICE_DUR - 12, 10), has = f >= SLICE_F + SLICE_DUR, look = smooth((f - (SLICE_F + SLICE_DUR + 4)) / 8);
  const heading = Math.atan2(CT.evidence.c[0] - CT.lawyer[0], CT.evidence.c[2] - CT.lawyer[2]), ori = orient(cam, P, heading, -0.6);
  const keys: [number, Expr][] = [[0, "stern"], [B.ruled + 2, "worry"], [B.pay + 6, "gasp"], [B.part + 6, "grimace"]];
  const hT: Hand = { a: "hang", b: onCard(cam, P, cardYaw(cam, P), ct(SLICE_HAND)), k: take, dy: -10 * look, hold: has ? "receipt" : null, ang: -15, front: true, maxLen: 1.3 };
  const ci = ori.facing >= 0 ? 1 : 0;
  put(out, cam, LAWYER, P, { view: ori.view, facing: ori.facing, breath: L.breath, tilt: L.sway, headTilt: L.head + 4 * look * (ci ? 1 : -1), shift: L.shift, expr: exprAt(f, keys),
    blink: Math.max(blinkAt(VF, LAWYER.i), swapLid(f, keys)), lookY: look > 0.5 ? 0.8 : 0, look: look > 0.5 ? (ci ? 0.8 : -0.8) : 0,
    hands: ci ? [{ a: "hang", hold: "briefcase" }, hT] : [hT, { a: "hang", hold: "briefcase" }] });
};

/** the lip-flap guard: the boss's "Cancel it!" is the ONLY line with flaps */
export const talkGuard = (f: number) => f >= FLAP0 && f < BEAT.cancelItEnd;

export const stage = (id: number, f: number, cam: CamInfo, L: LightState, vf: number = f): Stage => {
  VF = vf;
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = L.actorShadow ? "golden" : "day";
  EXT = EXTERIOR[s.set];
  LX = "0000";
  CAMR.copy(cam.right).setY(0).normalize();
  if (cam.sun) SUN.copy(cam.sun).normalize();
  switch (s.set) {
    case "trading": trading(out, cam, id, f); break;
    case "street": street(out, cam, id, f); break;
    case "lobby": lobby(out, cam, id, f); break;
    case "homes": homes(out, cam, id, f); break;
    case "hall": hall(out, cam, id, f); break;
    case "court": court(out, cam, id, f); break;
  }
  return out;
};
export { FPS, clamp01, fxSweat };
void put; void fx; void reachArm; void beam; void gest; void gest2; void gestO; void bump; void blinkN; void exprAt; void swapLid; void idle; void windAt; void flutAt;
void toward; void camRef; void traderLoop; void scr; void lerp2; void rad;

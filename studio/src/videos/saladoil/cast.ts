// The cast of "The Oil Tanks That Were Mostly Water" (saladoil) as lit flat cards in the 3D world, plus their effect cards.
// ENGINE (kept from antitheft): the canvas pool, the Actor / Fx meshes, the placement API and the light hooks. STAGING
// (CHAR, 2026-11-14): every shot's cast posed from the plan.ts anchors and the story.ts BEAT words, drawn with toon.ts.
// Each frame every character asks for a drawing (a key + a draw call); the pool keeps one canvas per distinct drawing.
// Characters are yaw-only billboards shaded by cardShade(); standing ones get a soft multiply contact blob + (outdoors) a
// sun-aligned shadow tail. Effects are unlit cards. Cards, effects and blobs live on the NOINK layer.
// LIFE: breathing, weight-shift sway, head bobs and wind on the VIDEO clock (VF) in WHOLE cycles over VOICE_TOTAL, blinks
// every 1.5-3.5 s + a blink across each expression swap (never within 6 video f of the loop seam), gestures with a 3 f
// anticipation and a settle (gest), reactions 0-3 f before the word, gaze toward what matters each beat. Lip flaps ONLY
// on the shouted line ("Ninety percent full!", BEAT.ninety .. BEAT.shoutEnd). Shot 1 frame 0 == the last frame: the tank
// man in shots 1 / LAST is posed from the loop clock tau (tau = 0 on both) and a fixed reference camera.
// Hands that must touch the world (the tape, the rail, the hatch rim, a valve wheel) are aimed by projecting the world
// point onto the card along the camera ray (toCard); arms that reach ACROSS A DESK (the banker's stamp and cash, the
// investor's pencil) are drawn on their own lit card standing at the hand (reachArm), joined to the body card's shoulder.
import * as THREE from "three";
import { Pen, drawPerson, drawLoneArm, shoulderAt, bodyAt, handAt, fxShadow, fxContact, fxSweat, fxShout, fxBubbles, drawBlob, drawFish, drawClipboard,
  drawReflection, drawShakeHand, drawCat, CatSt, fxBeam, fxSpot, fxBubble, fxDust, drawGull, drawTopFist, fxBill, fxSlip, fxDrip,
  drawHandTruck, fxGullShadow, fxGlint, fxSteam, fxSplash, drawCashCart, headAt, reelKnobAt,
  Outfit, PersonOpts, Expr, Hand, P2, Hold, BlobSt,
  TINO_FIT, TANKMAN_FIT, INSP_FIT, BANKER_FIT, INVESTOR_FIT, lenderFit, traderFit, workerFit, walkerFit, cafeFit } from "./toon";
import { FPS, SHOTS, LAST, BEAT, TOTAL, COUNT_AT, clamp01, smooth, camAt, PW, PWE } from "./story";
import type { LightState } from "./lights";
import { TK, TF, BK, TR, CU, KI, PR, ST, OF, EXTERIOR, add, V3 } from "./plan";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K, cardU, setCardMode } from "./cardshade";
import { VOICE_TOTAL } from "./voicewarp";

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
const hz = (v: number) => (Math.max(1, Math.round((v * VOICE_TOTAL) / FPS)) * FPS) / VOICE_TOTAL;
const HZ = { b: hz(0.25), s1: hz(0.3), s2: hz(0.73), h1: hz(0.2), h2: hz(0.55), w1: hz(0.13), w2: hz(0.41), fl: hz(1.3), ws: hz(0.09), rip: hz(0.64), bob: hz(0.9), ub: hz(0.6) };
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

// ---------------- people ----------------
type Act = { i: number; o: Outfit; key: string };
const TINO: Act = { i: 1, key: "tino", o: TINO_FIT };
const INSP: Act = { i: 2, key: "insp", o: INSP_FIT };
const BANKER: Act = { i: 3, key: "banker", o: BANKER_FIT };
const INVESTOR: Act = { i: 4, key: "investor", o: INVESTOR_FIT };
const TANKMAN: Act = { i: 5, key: "tankman", o: TANKMAN_FIT };
const LENDER = (v: number): Act => ({ i: 10 + v, key: `lender${v}`, o: lenderFit(v) });
const TRADER = (v: number): Act => ({ i: 20 + v, key: `trader${v}`, o: traderFit(v) });
const WORKER = (v: number): Act => ({ i: 30 + v, key: `worker${v}`, o: workerFit(v) });
const WALKER = (v: number): Act => ({ i: 40 + v, key: `walker${v}`, o: walkerFit(v) });
const CAFE = (v: number): Act => ({ i: 50 + v, key: `cafe${v}`, o: cafeFit(v) });
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

// ---------------- the tank top ----------------
/** everyone at the hatch: no sun tail and the contact blob pushed 0.25 m away from the hole (the oil stays clean gold) */
const atHatch = (p: V3): PutX => { const dx = p[0] - TK.hatch.c[0], dz = p[2] - TK.hatch.c[2], n = Math.hypot(dx, dz) || 1;
  return { noTail: true, blobAt: [p[0] + (0.25 * dx) / n, p[1], p[2] + (0.25 * dz) / n] }; };
/** the shout's lip flaps: they start 2 f BEFORE "Ninety" (the swap rule) and run to BEAT.shoutEnd: fast syllables on
 *  "Ninety percent", then the long "FULL!" held wide open, closing at the end; 3 shapes held 2-5 f (y0 mid D, y1 wide
 *  open, y2 tall O) */
const FLAP0 = BEAT.ninety - 2;
const SHOUT_FLAPS: [number, number][] = [[3, 1], [2, 0], [3, 2], [2, 0], [3, 1], [3, 0], [3, 2], [2, 0], [3, 1], [3, 2]];
const shoutShape = (f: number): number => {
  const t = f - FLAP0;
  if (t < 0 || f >= BEAT.shoutEnd) return -1;
  if (f < BEAT.fullShout - 1) { let a = 0, k = 0; for (;;) { const [n, s] = SHOUT_FLAPS[k % SHOUT_FLAPS.length]; if (t < a + n) return s; a += n; k++; } }
  const r = f - BEAT.fullShout + 1, left = BEAT.shoutEnd - f;
  return r < 4 ? 2 : left <= 4 ? 0 : 1;
};

/** shots 1 / LAST: the tank man kneels at the hatch, the tape in his hand (the loop pose: tau = 0 on frame 0 and on the
 *  last frame; the pose is aimed at a FIXED reference camera so it is identical in both shots). Fix r1: in the near
 *  top-down hatch view (frame 0, the loop shot) his upright card would read as a squashed sliver at the edge, so there he
 *  is drawn as a TOP-DOWN figure card (cap, shoulders, the arm and the mitten on the tape) and the upright card takes
 *  over once the crane has pulled out (shot 1, from TOPVIEW_END). Shot 1 acting: eyes on the tape, a sly glance up at the
 *  counter as it lands, back to the tape, a glance at the counter on "tanks", then a look to us + a WINK on "water." */
/** the top-down arm card is used while his head is still well off the left frame edge (camera-based, so it follows any
 *  pull-out), always in the loop shot (the near top-down hatch view throughout) */
const topView = (id: number, f: number) => id === LAST || scr(1, f, [TK.kneel[0], TK.kneel[1] + 0.95, TK.kneel[2]])[0] < -1.3;
const loopTankman = (out: Stage, cam: CamInfo, id: number, f: number) => {
  const tau = id === 1 ? VF : VF - (VOICE_TOTAL - 1);
  const ref = camRef(1, 220), P = TK.kneel, yaw = yawFrom(ref, P), i = TANKMAN.i;
  const L = life(tau, i);
  if (topView(id, f)) {
    // the top-down figure (camera-facing card, unlit, painted in the dawn light); the hand grips the tape a little below
    // the reel so the tape visibly has an owner at the frame edge
    // fix r2 (A2 P2): never a sticker: a +-1.5 deg tape sway (~0.3 Hz), a finger squeeze every ~2.5 s, and in the loop
    // shot a 6 f twitch as the water opens on "fake"; all on tau (0 on frame 0 AND on the last frame: the loop seam)
    const bob = 0.5 * L.breath, grip = lerp3(TK.tapeTop, TK.tapeIn, 0.1), B = camB(id, f), A = 0.36;
    const sway = 1.5 * wave(tau, HZ.s1, 0);
    const sqPh = ((tau % 75) + 75) % 75, sqz = sqPh >= 30 && sqPh < 40 ? Math.sin((Math.PI * (sqPh - 30)) / 10) : 0;
    const tw = id === LAST ? gest2(f, BEAT.fake + 2, 3, BEAT.fake + 5, 3) : 0;
    // the card's fist sits at (200, 64) of 256 x 128: shift it along the camera's right so the fist lands on the tape
    const c0: V3 = [0, 1, 2].map((k) => grip[k] - B.R[k] * ((200 - 128) / 256) * A + B.F[k] * -0.02 + B.U[k] * 0.012 * tw) as V3;
    fx(out, `toparm|${q(bob, 8)}|${q(sqz + 0.6 * tw, 6)}`, 256, 128, (p) => drawTopFist(p, bob, Math.min(1, sqz + 0.6 * tw)), c0, A, A / 2, { rot: rad(sway + 3 * tw) });
    return;
  }
  // gaze keys (shot 1): tape -> the counter landing -> tape (a reel crank) -> DOWN into the hatch on "against tanks" (a tape
  // tug) -> up to us 3 f before "mostly" -> the wink on "water." -> back to the tape. Every look held >= 24 f.
  type K = [number, Expr, number, number, number, number]; // frame, expr, look, lookY, head tilt, feature drop (fdy)
  const keys: K[] = [[0, "focus", 0.7, 1.0, 5, 2], [BEAT.million + 4, "smug", 1.1, -1.0, -3, -2], [BEAT.million + 44, "focus", 0.7, 1.05, 5, 2],
    [BEAT.against - 2, "focus", 0.45, 1.7, 11, 5], [BEAT.mostly1 - 3, "wink", 0, 0, 2, 0], [BEAT.water1 + 16, "smug", 0.7, 0.9, 4, 2]];
  let k0 = keys[0]; for (const k of keys) if (f >= k[0]) k0 = k;
  const kf: [number, Expr][] = keys.map((k) => [k[0] + 2, k[1]]);
  const wink = f >= BEAT.water1 - 2 && f < BEAT.water1 + 16;
  // a blink in the long tape look (life), the 18 f reel crank of the free hand in "$150 million...", the 2-px tape tug on
  // "tanks" (the hand dips and comes back)
  const bl2 = f >= BEAT.million + 58 && f < BEAT.million + 62 ? LID[Math.floor(f - BEAT.million - 58)] : 0;
  const crank = gest2(f, BEAT.million + 46, 8, BEAT.million + 68, 8), turn = clamp01((f - (BEAT.million + 50)) / 18);
  const tug = gest2(f, BEAT.tanks1 - 2, 3, BEAT.tanks1 + 3, 4);
  const opts: PersonOpts = { breath: L.breath, tilt: 0.6 * L.sway, headTilt: 0.6 * L.head + k0[4], mode: "kneel", facing: 1, view: "front",
    expr: k0[1], look: k0[2], lookY: k0[3], nod: k0[4] > 8 ? 0.8 : 0, blink: Math.max(blinkAt(tau, i), swapLid(f, kf), bl2), face: { ...(wink ? { wink: 1 } : {}), fdy: k0[5] },
    wind: 0.8 * windAt(tau, i), flutter: 1.2 * flutAt(tau, i), reelSide: -1, reelSpin: (TAU * 25 * tau) / VOICE_TOTAL + TAU * smooth(turn), tapeHand: 1, light: 0, seed: seedOf(i) };
  const tapeHand = toCard(ref, P, yaw, 1, TK.tapeTop);
  const knob = reelKnobAt(TANKMAN_FIT, { ...opts, hands: [{ a: "hip" }, { a: tapeHand }] });
  opts.hands = [crank > 0.02 ? { a: "hip", dx: -2, dy: 4, b: knob, k: crank } : { a: "hip", dx: -2, dy: 4 }, { a: tapeHand, dy: 6 * tug }];
  put(out, cam, TANKMAN, P, opts, { ...atHatch(P), yaw });
  // fix r2 (A2 P3): the gull lands on the LOANS counter's hood (well above the caption band), turns its head twice and flaps
  // off (same land / leave frames as the SFX)
  if (id === 1) { const C = TK.counter, cy = Math.cos(C.yaw), sy = Math.sin(C.yaw);
    gull(out, f, [C.c[0] + cy * 0.42, C.c[1] + C.h / 2 + 0.085, C.c[2] - sy * 0.42 - 0.05], 150, 238); }
};
/** a gull that glides in, lands (wings fold over 6 f), turns its head twice, then flaps off up-left: [land, leave] frames */
const gull = (out: Stage, f: number, at: V3, f0: number, f1: number) => {
  if (f < f0 - 14 || f > f1 + 26) return;
  const inA = clamp01((f - (f0 - 14)) / 14), outA = clamp01((f - f1) / 26);
  const pos: V3 = [at[0] + 1.6 * (1 - smooth(inA)) - 2.2 * outA * outA, at[1] + 0.9 * (1 - smooth(inA)) ** 2 + 1.6 * outA * outA, at[2] - 0.4 * (1 - smooth(inA)) + 0.3 * outA];
  const flying = f < f0 || f > f1, wing = flying ? 0.5 + 0.5 * Math.sin(f * 1.1) : f < f0 + 6 ? 1 - (f - f0) / 6 : 0;
  const head = f >= f0 + 22 && f < f0 + 44 ? -1 : f >= f0 + 58 && f < f0 + 74 ? -1 : 1;
  fx(out, `gull|${q(wing, 8)}|${head}|${flying ? 1 : 0}`, 256, 256, (p) => drawGull(p, wing, head, flying), [pos[0], pos[1] + 0.14, pos[2]], 0.36, 0.36);
};

/** shot 4 (fix r1): A = the tank man climbs the top flight hand over hand (a reach on every rung clang, alternating
 *  hands and legs, a body bob + sway), crouches and swings over the rim on "climb", scurries round the hatch to its far
 *  side and kneels facing us; he pays the tape in (eyes down INTO the hatch, the reel in his hand: the world draws it),
 *  glances up at us, stands, scurries to the rail, grips it, LEANS OVER it, fills his lungs and SHOUTS DOWN at the pair
 *  on the ground (cupped hand, lip flaps only on the line, an extra dip on "full!"), then straightens, proud.
 *  B (after the crane down) = the inspector ON THE GROUND reads his clipboard (eyes down the whole time), takes the
 *  pencil from behind his ear and ticks on "believed" WITHOUT LOOKING UP, then a slow deadpan blink; Tino beside him
 *  grins up at his man, side-eyes the inspector in the pause, then turns to us with a big thumbs-up + wink */
/** the shot-4 contact frames (sound: climb_4 / rim_4 / roof_4 / knee_4 / stand_4 / rail_4) */
export const S4 = (() => {
  // (the far-side kneel is ~3.2 m round the hatch from the ladder top: he tops out on "would" so the scurry is ~1 s)
  // fix r2 (A2 P1): he arrives at the far side at kneel - 10 and goes DOWN over 10 f (a 3 f rise first, a 2 f settle),
  // rises over 12 f to be on his feet at "shout" (stand), dashes to the rail (rail), inhales 3 f, leans over 10 f
  const a0 = SHOTS[3].a - 7, rim = BEAT.men + 10, onRoof = rim + 6, kneel = BEAT.drop + 13, tapeEnd = BEAT.inside1 + 16, stand = BEAT.shout - 1, rail = BEAT.ninety - 13;
  return { a0, pulls: [a0 + 4, a0 + 14, a0 + 24, a0 + 34], rim, onRoof, kneel, tapeEnd, stand, rail };
})();
/** the belt reel is in his HAND (the world draws it) exactly while the world shows it there */
const REEL4_A = BEAT.drop + 12, REEL4_B = BEAT.shout - 8;
/** a path round the hatch (keeps 0.74 m from its centre): from a to b along the shorter arc + the straight legs */
const HC2: [number, number] = [TK.hatch.c[0], TK.hatch.c[2]], KEEP = 0.74;
const roundHatch = (a: [number, number], b: [number, number], u: number): [number, number] => {
  // tangent from a onto the keep circle, arc, tangent to b (the side is the one with the shorter arc)
  const ang = (p: [number, number]) => Math.atan2(p[1] - HC2[1], p[0] - HC2[0]), rr = (p: [number, number]) => Math.hypot(p[0] - HC2[0], p[1] - HC2[1]);
  const ra = Math.max(KEEP, rr(a)), rb = Math.max(KEEP, rr(b)), oa = Math.acos(Math.min(1, KEEP / ra)), ob = Math.acos(Math.min(1, KEEP / rb));
  let best = { L: 1e9, ta: 0, tb: 0, dir: 1 };
  for (const dir of [1, -1]) {
    const ta = ang(a) + dir * oa, tb = ang(b) - dir * ob;
    let d = (tb - ta) * dir; while (d < 0) d += TAU; while (d > TAU) d -= TAU;
    const L = Math.sqrt(Math.max(0, ra * ra - KEEP * KEEP)) + KEEP * d + Math.sqrt(Math.max(0, rb * rb - KEEP * KEEP));
    if (L < best.L) best = { L, ta, tb: ta + dir * d, dir };
  }
  const l1 = Math.sqrt(Math.max(0, ra * ra - KEEP * KEEP)), l3 = Math.sqrt(Math.max(0, rb * rb - KEEP * KEEP)), l2 = best.L - l1 - l3, s = u * best.L;
  const T1: [number, number] = [HC2[0] + KEEP * Math.cos(best.ta), HC2[1] + KEEP * Math.sin(best.ta)], T2: [number, number] = [HC2[0] + KEEP * Math.cos(best.tb), HC2[1] + KEEP * Math.sin(best.tb)];
  if (s < l1) { const k = l1 ? s / l1 : 1; return [a[0] + (T1[0] - a[0]) * k, a[1] + (T1[1] - a[1]) * k]; }
  if (s < l1 + l2) { const t = best.ta + ((best.tb - best.ta) * (s - l1)) / Math.max(1e-6, l2); return [HC2[0] + KEEP * Math.cos(t), HC2[1] + KEEP * Math.sin(t)]; }
  const k = l3 ? (s - l1 - l2) / l3 : 1; return [T2[0] + (b[0] - T2[0]) * k, T2[1] + (b[1] - T2[1]) * k];
};
/** a hurried walk along a path: the ease-in-out position + the stride phase (a step every stride / 2 f) */
const scurry = (f: number, f0: number, f1: number, stride = 13) => { const u = clamp01((f - f0) / Math.max(1, f1 - f0)); return { u: u * u * (3 - 2 * u), ph: (f - f0) / stride }; };
/** fix r2: the kneel blend through time: a 3 f rise (anticipation), down over the rest of `dur`, a 2 f settle from 1.06 */
const kneelDown = (f: number, f0: number, dur: number) => {
  const t = f - f0; if (t < 0) return 0;
  if (t < 3) return -0.12 * Math.sin((Math.PI / 2) * (t / 3));
  if (t < dur) return -0.12 + 1.18 * smooth((t - 3) / (dur - 3));
  return 1.06 - 0.06 * smooth((t - dur) / 2);
};
/** ...and up: a 3 f deeper dip (1 -> 1.1), up over the rest of `dur` to a 2 % overshoot (-0.08), a 2 f settle to 0 */
const kneelUp = (f: number, f0: number, dur: number) => {
  const t = f - f0; if (t < 0) return 1;
  if (t < 3) return 1 + 0.1 * Math.sin((Math.PI / 2) * (t / 3));
  if (t < dur) return 1.1 - 1.18 * smooth((t - 3) / (dur - 3));
  return -0.08 + 0.08 * smooth((t - dur) / 2);
};
/** which screen side the pair below is on, seen from the shout camera (-1 left / 1 right) */
const sxRail4 = () => { const pair = scr(4, BEAT.ninety, [TK.inspGround[0] + 0.6, 1.2, TK.inspGround[2]]), me = scr(4, BEAT.ninety, [TK.shout[0], 12.4, TK.shout[2]]); return pair[0] < me[0] ? -1 : 1; };
const shot4 = (out: Stage, cam: CamInfo, f: number) => {
  const v = VF, refA = camRef(4, BEAT.tape), i = TANKMAN.i, L = life(v, i);
  const base: PersonOpts = { breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift, blink: blinkAt(v, i), wind: 1.1 * windAt(v, i), flutter: 1.3 * flutAt(v, i), reelSide: 1,
    noReel: f >= REEL4_A && f < REEL4_B };
  const LO = TK.ladderOut, LT = TK.ladderTop, K = TK.tapeKneel, Sh = TK.shout, sxR = sxRail4(), SH4: V3 = [Sh[0] + 0.17, Sh[1] + 0.03, Sh[2] - 0.55];
  const kA = S4.kneel - 10, uA = S4.stand - 12;   // the kneel-down starts, the stand-up starts
  if (f < S4.rim) {
    // the climb: a reach on each rung clang (6 f reach + 2 f settle), the body pulled up 0.6 m after each grab
    let y = 8.2, side = 1, reach = 0;
    S4.pulls.forEach((c, n) => { y += 0.7 * smooth((f - c) / 8); if (f >= c - 7) { side = n % 2 ? -1 : 1; reach = clamp01((f - (c - 7)) / 6); } });
    const crouch = f >= S4.rim - 4 ? 0.3 * smooth((f - (S4.rim - 4)) / 3) : 0, bob = 0.025 * Math.sin(Math.PI * clamp01(((f - S4.pulls[0]) % 10) / 10));
    const ph = (y - 8.2) / 1.24;
    put(out, cam, TANKMAN, [LO[0], y - bob - 0.08 * crouch, LO[2]], { ...base, view: "back", mode: "walk", phase: ph, lift: 1.5, tilt: 3 * Math.sin(TAU * ph) + 1.2 * L.sway,
      hands: side > 0 ? [{ a: "up", dy: 6 }, { a: "up", dy: -30 * reach + 18 }] : [{ a: "up", dy: -30 * reach + 18 }, { a: "up", dy: 6 }] }, { noBlob: true });
  } else if (f < S4.onRoof) {
    // over the rim: a step up and in, a little crouch as he lands on the roof (back view)
    const u = smooth((f - S4.rim) / (S4.onRoof - S4.rim)), P = lerp3([LO[0], 11, LO[2]], LT, u);
    put(out, cam, TANKMAN, [P[0], P[1] + 0.12 * Math.sin(Math.PI * u), P[2]], { ...base, view: "back", facing: -1, crouch: 0.25 * (1 - u), hands: [{ a: "up", dy: 40 * u }, { a: "hip" }] }, { noTail: true });
  } else if (f < kA) {
    // a quick scurry round the hatch to its far side (arms pumping), eyes on the hatch; ADD (A2): a sleeve wipe of the
    // brow after the climb (14 f, while he walks)
    const s = scurry(f, S4.onRoof, kA, 9), xz = roundHatch([LT[0], LT[2]], [K[0], K[2]], s.u), pump = Math.sin(TAU * s.ph), wipe = gest2(f, S4.onRoof + 2, 6, S4.onRoof + 12, 6);
    put(out, cam, TANKMAN, [xz[0], 11, xz[1]], { ...base, mode: "walk", phase: s.ph, lift: 1.3, facing: -1, expr: "focus", look: -0.6, lookY: 0.9,
      tilt: (base.tilt ?? 0) - 5, hands: [wipe > 0.02 ? { a: "chest", b: "head", k: wipe, dx: 6 * wipe, dy: 8 * wipe } : { a: "chest", dx: -10, dy: 10 * pump }, { a: "chest", dx: 10, dy: -10 * pump }] }, atHatch([xz[0], 11, xz[1]]));
    if (s.ph % 0.5 < 0.12 && f > S4.onRoof + 2) dust(out, [xz[0], 11.02, xz[1]], f);
  } else if (f < S4.stand + 2) {
    // fix r2 (A2 P1): kneeling at the far side of the hatch, facing us: DOWN over 10 f (a 3 f rise, a 2 f settle), the
    // reel in one hand (the world's reel), the other feeds the tape down INTO the hatch hand over hand; head and eyes DOWN
    // into the hatch the whole time (no lens look); then UP over 12 f (a 3 f dip, a 2 % overshoot) onto his feet on
    // "shout", the reel swinging back to his hip over 8 f, his eyes going to the rail and down
    const P = K, yaw = yawFrom(refA, P), pay = f >= BEAT.drop && f < S4.tapeEnd;
    const kk = f < uA ? kneelDown(f, kA, 10) : kneelUp(f, uA, 12);
    const keys: [number, Expr][] = [[kA, "focus"], [uA - 2, "smug"]];
    const feed = pay ? 0.05 * Math.sin((f - BEAT.drop) * 0.7) : 0, rk = smooth((f - REEL4_B) / 8);
    const lookDown = 1 - smooth((f - (uA + 2)) / 8);
    const o: PersonOpts = { ...base, mode: "kneel", kneelK: kk, facing: 0, expr: exprAt(f, keys), look: lerp(0.5 * sxR, 0.15, lookDown), lookY: lerp(1.0, 1.7, lookDown),
      blink: Math.max(base.blink ?? 0, swapLid(f, keys)), headTilt: (base.headTilt ?? 0) + 8 * lookDown, nod: lerp(0.4, 1.3, lookDown), face: { fdy: lerp(2, 6, lookDown) } };
    const reelW: V3 = [TK.tape4Top[0] + 0.03, TK.tape4Top[1] + 0.06, TK.tape4Top[2] + 0.02], feedW: V3 = [TK.tape4Top[0] - 0.04, TK.tape4Top[1] - 0.12 + feed, TK.tape4Top[2] + 0.03];
    const feedH = toCard(refA, P, yaw, 1, feedW), reelH = toCard(refA, P, yaw, 1, reelW), free = smooth((f - (S4.tapeEnd - 2)) / 10), grab = smooth((f - (REEL4_A - 8)) / 8);
    o.hands = [{ a: "chest", dx: -8, b: feedH, k: grab * (1 - free) }, f < REEL4_B ? { a: "hip", b: reelH, k: grab } : { a: reelH, b: "hip", k: rk }];
    if (f >= REEL4_B) { o.reelHand = 1; o.reelK = rk; }
    put(out, cam, TANKMAN, P, o, { ...atHatch(P), yaw });
  } else if (f < S4.rail) {
    // up and a dash round the hatch to the rail, toward the lens (big strides), eyes on the rail and down
    const s = scurry(f, S4.stand + 2, S4.rail - 1, 8), xz = roundHatch([K[0], K[2]], [SH4[0], SH4[2]], s.u), pump = Math.sin(TAU * s.ph);
    put(out, cam, TANKMAN, [xz[0], 11 + 0.03 * s.u, xz[1]], { ...base, mode: s.u < 0.98 ? "walk" : "stand", phase: s.ph, lift: 1.6, facing: 1, expr: "smug", look: 0.6 * sxR, lookY: 1.0,
      tilt: (base.tilt ?? 0) + 4 * Math.sin(TAU * s.ph), hands: [{ a: "chest", dx: -10, dy: 9 * pump }, { a: "chest", dx: 10, dy: -9 * pump }] }, { noTail: true });
    if (s.ph % 0.5 < 0.12 && f > S4.stand + 4) dust(out, [xz[0], 11.02, xz[1]], f);
  } else {
    // at the rail: grips it, a 3 f inhale (chest up, head back), then PITCHES FORWARD over it toward the pair below (the roll
    // <= 10 deg; the head drops, the face turns down toward them) and SHOUTS DOWN through a cupped hand pointing down past
    // the rail (flaps only on the line), an extra dip on "full!", then straightens, smug, with a sly glance at the lens.
    // fix r2: he stands 0.55 m back from the old mark (just clear of the hatch collar) so his mouth and the cupped hand stay
    // well clear ABOVE the near rail's top bar through every flap
    const P: V3 = SH4, ref = camRef(4, BEAT.ninety), yaw = yawFrom(ref, P), talk = shoutShape(f), shouting = talk >= 0, sx = sxR;
    const inhale = gest2(f, S4.rail, 3, S4.rail + 5, 3), lean = smooth((f - (S4.rail + 2)) / 10) * (1 - 0.7 * smooth((f - BEAT.shoutEnd - 1) / 12));
    const dip = gest2(f, BEAT.fullShout - 2, 2, BEAT.fullShout + 2, 4);
    const pump = shouting ? 0.06 * Math.abs(Math.sin((f - FLAP0) * 0.55)) : 0, cup = gest2(f, BEAT.ninety - 12, 8, BEAT.shoutEnd + 3, 12);
    const sly = f >= BEAT.shoutEnd + 1 ? smooth((f - BEAT.shoutEnd - 1) / 4) : 0;
    const keys: [number, Expr][] = [[S4.rail - 1, "inhale"], [FLAP0, "shout"], [BEAT.shoutEnd + 1, "smug"]];
    const railPt = toCard(ref, P, yaw, 1, [P[0] + 0.12 * sx * -1, TK.tank.h + TK.rail.h, TK.rail.r * 0.999]), grip = smooth((f - S4.rail + 1) / 4);
    const o: PersonOpts = { ...base, facing: sx as -1 | 1, expr: exprAt(f, keys), lookY: lerp(1.0, 1.9, lean) * (1 - sly) - 0.3 * inhale, look: lerp(0.9 * sx * lean, 0, sly), talk, yell: true,
      nod: 0.3 + 1.0 * lean + 0.4 * dip + 0.3 * pump - 0.4 * inhale, crouch: 0.03 + 0.07 * lean + 0.6 * pump + 0.04 * dip - 0.1 * inhale,
      tilt: (base.tilt ?? 0) * 0.5 + sx * (7 * lean + 2 * dip), breath: (base.breath ?? 0) + 3 * inhale,
      headTilt: (base.headTilt ?? 0) * 0.5 + sx * (6 * lean + 2 * pump) - sx * 3 * inhale, face: { fdy: 4 * lean + 2 * dip - 2 * inhale, fdx: 4 * sx * lean },
      blink: shouting || inhale > 0.3 ? 0 : Math.max(base.blink ?? 0, swapLid(f, keys)),
      hands: sx < 0 ? [cup > 0.02 ? { a: railPt, b: "mouth", k: cup, dx: -6 * cup, dy: 10 * cup, shape: "mitten", sz: 0.26, ang: -150 * cup, front: true } : { a: railPt, dx: -28 }, { a: railPt, dx: 16 }]
        : [{ a: railPt, dx: -16 }, cup > 0.02 ? { a: railPt, b: "mouth", k: cup, dx: 6 * cup, dy: 10 * cup, shape: "mitten", sz: 0.26, ang: 150 * cup, front: true } : { a: railPt, dx: 28 }] };
    if (grip < 1) o.hands = o.hands!.map((h) => (h && h.b === undefined ? { a: "chest", b: h.a, k: grip, dx: (h.dx ?? 0) * grip } : h)) as [Hand, Hand];
    put(out, cam, TANKMAN, P, o, { noTail: true, yaw });
    if (shouting) { // shout lines fanning DOWN toward the pair below (pulsing on the syllables)
      const mo = handAt(TANKMAN_FIT, { ...o, seed: seedOf(i) }, sx < 0 ? 0 : 1);
      const mp = toward(fromCard(P, yaw, 1, mo), vec(cam.pos), 0.25), k = Math.abs(Math.sin((f - FLAP0) * 0.5));
      fx(out, `shout|${q(k, 6)}|${sx}`, 256, 256, (p) => { if (sx < 0) { p.g.translate(256, 0); p.g.scale(-1, 1); } fxShout(p, k); }, [mp[0], mp[1] - 0.12, mp[2]], 0.95, 0.95);
    }
  }
  // ---- the ground pair (framing B) ----
  const refB = camRef(4, BEAT.believed), IP = TK.inspGround, iy = yawFrom(refB, IP), ii = INSP.i, IL = life(v, ii);
  // fix r2 (A2 P1/P2): the inspector reads DOWN at his board the whole of B (drooping lids, head pitched down, a 1.5 deg
  // weight sway, the cap peak + the sheet's corner fluttering in the gust), a blink, then a SLOW blink in the silence;
  // the pencil comes from behind his ear (12 f), he licks its tip (6 f), brings it to the board (12 f), taps twice, ticks
  // on "believed" WITHOUT LOOKING UP, then a slow deadpan blink (the button)
  const P_EAR = BEAT.ground - 14, P_MOUTH = P_EAR + 18, P_LICK = P_MOUTH + 6, P_BOARD = P_LICK + 12;
  const tick = clamp01((f - BEAT.believed - 2) / 8), lift = clamp01((f - BEAT.believed - 12) / 8);
  const slow = (f0: number) => (f >= f0 && f < f0 + 6 ? [0.5, 1, 1, 1, 1, 0.5][Math.floor(f - f0)] : 0);
  const quick = f >= BEAT.andInspector + 11 && f < BEAT.andInspector + 15 ? LID[Math.floor(f - BEAT.andInspector - 11)] : 0;
  const licking = f >= P_MOUTH && f < P_LICK;
  const io: PersonOpts = { breath: IL.breath, tilt: 0.9 * IL.sway, headTilt: -3 + 0.3 * IL.head, shift: IL.shift, facing: 1, expr: licking ? "lick" : "readDown", look: 0.3, lookY: 1.0, nod: 1.3,
    face: { fdy: 6 }, blink: licking ? 0 : Math.max(slow(BEAT.ground - 10), slow(BEAT.believed + 20), quick), wind: 0.9 * windAt(v, ii), flutter: 1.2 * flutAt(v, ii), seed: seedOf(ii),
    earPencil: f < P_EAR + 12 };
  const cb = bodyAt(INSP_FIT, io, 0.06, 0.5), CW = 0.5, CH = 0.41 * 0.94;
  const cw = toward(fromCard(IP, iy, 1, cb), refB, 0.14);
  const rIn = (dx: number, dy: number): P2 => toCard(refB, IP, iy, 1, [cw[0] + Math.cos(iy) * dx, cw[1] + dy, cw[2] - Math.sin(iy) * dx]);
  const earHand = bodyAt(INSP_FIT, io, 0.75, -0.55), mouthHand = bodyAt(INSP_FIT, io, 0.42, -0.1), board = rIn(0.1, -0.04);
  const toE = smooth((f - P_EAR) / 12), toM = smooth((f - (P_EAR + 12)) / 6), toB = smooth((f - P_LICK) / 12);
  const handPt: P2 = toB > 0 ? lerp2(mouthHand, board, toB) : toM > 0 ? lerp2(earHand, mouthHand, toM) : lerp2(board, earHand, toE);
  const pen = f >= P_BOARD ? 1 : 0, holding = f >= P_EAR + 12;
  io.hands = [{ a: rIn(-0.2, -0.03) }, pen ? { a: rIn(0.1, -0.06 + 0.02 * tick) } : { a: handPt, hold: holding ? "pencil" : null, ang: licking ? -10 : -30, front: true }];
  put(out, cam, INSP, IP, io, { yaw: iy });
  const tap = f >= P_BOARD && f < BEAT.believed ? Math.max(0, Math.sin(Math.PI * clamp01((f - P_BOARD) / 3.5))) + Math.max(0, Math.sin(Math.PI * clamp01((f - P_BOARD - 4.5) / 3.5))) : 0;
  const ant = f >= BEAT.believed && f < BEAT.believed + 2 ? 1 : 0, cfl = flutAt(v, ii) + 0.6 * (windAt(v, ii) - 0.45);
  fx(out, `clip|${q(tick, 20)}|${q(tap, 4)}|${q(lift, 8)}|${pen}|${ant}|${q(cfl, 6)}`, 512, 420, (p) => drawClipboard(p, tick, tap + ant, lift, pen, cfl), cw, CW, CH, { rot: 0.12 + 0.012 * IL.breath });
  // Tino: tugs both lapels proudly as the shout's echo dies, then grins UP at his man (head tilted up-left, eyes up), a
  // rock onto his heels in the pause, raises a big thumbs-up over 13 f (a dip, an overshoot) while still looking up,
  // turns to us on "believed" with a wink, then the beam; the thumb pumps; his gold tie flicks in the harbour wind
  const TP = TK.tinoBelow, ti = TINO.i, TL = life(v, ti), tb = BEAT.believed;
  const lap = gest2(f, BEAT.andInspector - 1, 7, BEAT.andInspector + 13, 8), rock = gest2(f, BEAT.ground - 8, 6, BEAT.ground + 2, 8);
  const tkeys: [number, Expr][] = [[0, "chinUp"], [BEAT.andInspector + 14, "beam"], [tb + 2, "wink"], [tb + 16, "beam"]];
  const thumb = gest(f, tb - 11, 13), pumpT = f > tb + 4 ? 3 * Math.sin((TAU * (f - tb - 4)) / 30) : 0, toUs = f >= tb;
  put(out, cam, TINO, TP, { breath: 1.5 * TL.breath, tilt: TL.sway - 3 * rock, headTilt: TL.head + (toUs ? 3 : -8) + 4 * rock, shift: TL.shift, facing: toUs ? 0 : -1,
    expr: exprAt(f, tkeys), look: toUs ? 0 : -1.0, lookY: toUs ? 0 : -1.5, face: toUs ? (f < tb + 14 ? { wink: 1 } : undefined) : { fdy: -4, fdx: -3 },
    blink: Math.max(blinkAt(v, ti), swapLid(f, tkeys)), crouch: -0.08 * rock - 0.05 * lap, wind: 0.95 * windAt(v, ti), flutter: 1.3 * flutAt(v, ti),
    hands: [lap > 0.02 ? { a: "hip", b: "chestPocket", k: lap, dx: 4, dy: -6 } : { a: "hip" },
      thumb > 0.01 ? { a: "hip", b: "show", k: thumb, dx: 12, dy: -22 + pumpT, shape: thumb > 0.5 ? "thumb" : "ball", sz: 0.4, front: true }
        : lap > 0.02 ? { a: "hip", b: "chestPocket", k: lap, dx: -4, dy: -6 } : { a: "hip" }] });
};
/** a little dust puff kicked up by a hurried step (it drifts and fades over ~8 f) */
const dust = (out: Stage, p: V3, f: number) => { const k = q(((f * 0.37) % 1), 4); fx(out, `dust|${k}`, 128, 128, (pp) => fxDust(pp, k), [p[0], p[1] + 0.06, p[2]], 0.28, 0.28, { soft: true }); };

/** shot 7 (MYSTERY, fix r2 A2 P1): a LENDER in a suit and fedora kneels BEHIND the far lip of the hatch collar (local
 *  anchor PEER7 = TK.peer 0.3 m further out) and leans in over it: the card is cut at the belt and lowered each frame so
 *  the belt sits just under the far lip on screen (the collar hides everything below it: he can never read as standing in
 *  the hole); one hand presses his hat brim down, the other rests ON the rim with the flashlight pointing down the shaft
 *  (its own card in front of the lip), the warm cone sweeping down the wall to the oil on "inside". Acting: suspicious
 *  (one brow up, eyes down at the hatch) -> intrigued on "someone" (a 3 f lean back, then in) -> a narrowed peer on "did"
 *  -> wide white eyes + O on "inside?" (a 2 f pop). His face (the SAME black fedora, seen in gold) is reflected in the
 *  oil; a bubble pops at its chin */
const PEER7: V3 = [TK.peer[0] - 0.3, TK.peer[1], TK.peer[2]];
const shot7 = (out: Stage, cam: CamInfo, f: number) => {
  const A = LENDER(0), i = A.i, Lf = life(VF, i);
  const lean = gest(f, BEAT.someone - 1, 16), did = PW(13, "did");
  const keys: [number, Expr][] = [[0, "suspicious"], [BEAT.someone, "intrigued"], [did, "peer"], [BEAT.insideQ - 1, "ohWide"]];
  const ex = exprAt(f, keys), bl = Math.max(blinkAt(VF, i), swapLid(f, keys)), wide = ex === "ohWide";
  const pop = wide ? Math.max(0, Math.sin(Math.PI * clamp01((f - (BEAT.insideQ - 3)) / 4))) : 0;
  const torchA = gest(f, BEAT.someone - 2, 12);
  const o: PersonOpts = { breath: Lf.breath, tilt: 0.5 * Lf.sway + 3 + 4 * lean, headTilt: 0.4 * Lf.head + 4 + 2 * lean + Math.sin(VF * 0.15), mode: "kneel", facing: 1, expr: ex,
    look: wide ? 0.05 : 0.3, lookY: wide ? 0.6 : lerp(1.3, 1.9, lean), nod: 1.6 + 1.2 * lean - 0.8 * pop, face: { fdy: lerp(4, 8, lean) - 3 * pop }, brimShade: 0.95,
    blink: bl, wind: 1.2 * windAt(VF, i), flutter: 1.5 * flutAt(VF, i), hatLag: 0.8 * flutAt(VF, i), crouch: 0, seed: seedOf(i) };
  o.hands = [{ a: "head", dx: -12, dy: 2 + 4 * lean }, { a: "hip", hide: true }];
  // the far collar lip seen from this frame's camera, and the card lowered until its belt sits 10 px under it
  const C = TK.hatch.c, cp = cam.pos, dh = Math.hypot(C[0] - cp.x, C[2] - cp.z) || 1;
  const lip: V3 = [C[0] + ((C[0] - cp.x) / dh) * 0.67, TK.hatch.rim, C[2] + ((C[2] - cp.z) / dh) * 0.67];
  const belt = bodyAt(A.o, o, 0, 0.86), sl = scr(7, f, lip)[1] + 10 / 960;
  let P: V3 = [PEER7[0] + 0.14 * lean, PEER7[1], PEER7[2]], yaw = yawFrom(vec(cam.pos), P);
  for (let it = 0; it < 3; it++) {
    const bw = fromCard(P, yaw, 1, belt), s0 = scr(7, f, bw), s1 = scr(7, f, [bw[0], bw[1] - 0.05, bw[2]]);
    const dsd = (s1[1] - s0[1]) / 0.05; if (Math.abs(dsd) < 1e-4) break;
    P = [P[0], P[1] + (s0[1] - sl) / dsd, P[2]];
  }
  P = [P[0], Math.min(P[1], PEER7[1] + 0.05), P[2]];
  o.cutY = belt[1] + 6;
  put(out, cam, A, P, o, { yaw, noBlob: true });
  // the flashlight hand resting ON the far lip (its own card, in front of the collar), the torch pointing down the shaft
  const hw: V3 = [lip[0] + (C[0] - lip[0]) * 0.22, TK.hatch.rim + 0.03, lip[2] + (C[2] - lip[2]) * 0.22];
  const torchAng = lerp(120, 172, torchA);
  reachArm(out, cam, A, P, yaw, o, 1, lerp3([P[0] + 0.12, P[1] + 0.45, P[2]], hw, smooth(clamp01((f - (SHOTS[6].a - 8)) / 10))), { hold: "flashlight", ang: torchAng, n: torchA > 0.5 ? 1 : 0, elbow: 0.22, up: 6 });
  // the beam: from the lens down the shaft wall (on "someone") to the oil (on "inside"), dust motes drifting in it
  if (torchA > 0.4) {
    const lens: V3 = [hw[0] + (C[0] - hw[0]) * 0.18, hw[1] - 0.08, hw[2] + (C[2] - hw[2]) * 0.18];
    const sweep = smooth((f - BEAT.someone - 4) / (BEAT.insideQ - BEAT.someone - 2));
    const wall: V3 = [TK.hatch.c[0] + 0.22, TK.hatch.rim - 0.32, TK.hatch.c[2] + 0.12], oil: V3 = [TK.reflect[0] + 0.05, TK.hatch.oil + 0.01, TK.reflect[2] + 0.04];
    const tgt = lerp3(wall, oil, sweep), k = 0.75 * smooth((torchA - 0.4) / 0.4) * (0.92 + 0.08 * Math.sin(VF * 0.9));
    beam(out, 7, f, toward(lens, vec(cam.pos), 0.05), tgt, 0.03, 0.22, k, "torch7");
    if (sweep > 0.85) fx(out, `glow|spot|${q(k, 8)}`, 128, 128, (p) => fxSpot(p, k), [oil[0], oil[1] + 0.012, oil[2]], 0.36, 0.3, { flat: true, soft: true });
    for (let n = 0; n < 4; n++) { // dust motes in the cone
      const t = (((VF * 0.013 + n * 0.27) % 1) + 1) % 1, m = lerp3(lens, tgt, 0.2 + 0.7 * t);
      fx(out, `glow|mote|${n}`, 128, 128, (p) => fxSpot(p, 0.9), toward([m[0] + 0.03 * Math.sin(VF * 0.07 + n), m[1], m[2] + 0.03 * Math.cos(VF * 0.05 + n * 2)], vec(cam.pos), 0.02), 0.035, 0.035, { soft: true });
    }
  }
  // the reflection: a soft card lying on the oil, turned so it reads upright from the lens, the SAME man; a bubble rises
  // and pops at its CHIN (toward the lens side of the card) as the question ends, its ring wobbling the face
  const R = TK.reflect, rip = wave(VF, HZ.rip), rot = Math.atan2(-(R[0] - cam.pos.x), -(R[2] - cam.pos.z));
  const rc = Math.hypot(cam.pos.x - R[0], cam.pos.z - R[2]) || 1, chin: V3 = [R[0] + ((cam.pos.x - R[0]) / rc) * 0.13, R[1], R[2] + ((cam.pos.z - R[2]) / rc) * 0.13];
  const ring = f >= BEAT.insideQEnd ? clamp01((f - BEAT.insideQEnd) / 24) : 0, bub = clamp01((f - (BEAT.insideQEnd - 9)) / 9);
  fx(out, `reflect|${ex}|${q(bl, 2)}|${q(rip, 6)}|${q(ring, 24)}`, 512, 512, (p) => drawReflection(p, rip, ex, bl, ring), R, 0.6, 0.6, { flat: true, soft: true, rot });
  if (bub > 0 && bub < 1) fx(out, `bub7|${q(bub, 9)}`, 128, 128, (p) => fxBubble(p, bub), [chin[0], R[1] + 0.012 + 0.02 * bub, chin[2]], 0.07, 0.07);
};

const tanktop = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (id === 1 || id === LAST) { loopTankman(out, cam, id, f); if (id === LAST) loopExtras(out, f); }
  else if (id === 4) shot4(out, cam, f);
  else if (id === 7) shot7(out, cam, f);
};

// ---------------- the tank farm ----------------
/** shot 2 (fix r2, A2 P1): Tino just inside the open gate. A TA-DA on "Meet" (arms flung wide, palms open, a 3 f
 *  anticipation, an overshoot + settle) with small happy bounces on "Tino" and "De Angelis"; the arms settle to his hips;
 *  on "king" a lapel tug with the chin up, the ^^ grin and a rock onto his heels; on "giant" (a 3 f dip first) a 16 f
 *  open-palm sweep UP and back toward the No. 7 tank top (~45 deg), his head turned + tilted up at it, eyes up, held ~24 f;
 *  back to us on "full"; the arm comes down over 14 f to the hip so the smug half-lid lands just before "oil."; then a
 *  sideways glance at the valve as it drips. His gold tie flips on the gust peaks. */
const tino2 = (out: Stage, cam: CamInfo, f: number) => {
  const P = add(TF.base, TF.tino), i = TINO.i, L = life(VF, i), dea = PW(2, "De Angelis");
  const keys: [number, Expr][] = [[0, "beam"], [BEAT.tino + 16, "proud"], [PW(2, "Jersey's"), "smile"], [BEAT.king - 2, "beam"], [BEAT.his, "smile"],
    [BEAT.giant - 1, "thrill"], [BEAT.full1 - 2, "grin"], [BEAT.oil1 - 1, "smug"], [BEAT.oil1End + 2, "shifty"]];
  const wide = gest2(f, BEAT.meet - 4, 12, PW(2, "New") - 6, 14), lapel = gest2(f, BEAT.king - 4, 10, BEAT.king + 18, 12);
  const sweep = gest2(f, BEAT.giant - 12, 16, BEAT.full1 + 5, 14), up = smooth((f - (BEAT.giant + 1)) / 6) * (1 - smooth((f - (BEAT.full1 - 6)) / 6));
  const bounce = (f0: number) => { const t = f - f0; return t < 0 || t > 10 ? 0 : Math.sin((Math.PI * t) / 5) * Math.exp(-t / 6); };
  const hop = 0.07 * bounce(BEAT.tino - 1) + 0.06 * bounce(dea - 1), rock = gest2(f, BEAT.king + 2, 6, BEAT.king + 14, 8);
  const pop = gest2(f, BEAT.meet - 4, 8, BEAT.meet + 10, 10), glance = f >= BEAT.oil1End + 2;
  const ex = exprAt(f, keys);
  const o: PersonOpts = { breath: L.breath, tilt: L.sway + 2 * sweep - 3 * rock, headTilt: L.head + (glance ? -6 : 0) + 7 * up - 3 * lapel + 3 * rock, shift: L.shift, expr: ex,
    blink: Math.max(blinkAt(VF, i), swapLid(f, keys)), look: glance ? -1.3 : 1.0 * up, lookY: glance ? 0.4 : -1.4 * up, face: { fdy: -3 * up - 3 * lapel, fdx: 3 * up },
    crouch: -0.14 * pop - 0.08 * lapel - 0.06 * rock + hop, wind: 0.95 * windAt(VF, i), flutter: 1.4 * flutAt(VF, i), seed: seedOf(i) };
  const [shx, shy, uu] = shoulderAt(TINO_FIT, o, 1), reachD = 76 * uu, tankHand: P2 = [shx + reachD * 1.05, shy - reachD * 0.95];
  o.hands = [wide > 0.02 ? { a: "hip", b: "raise", k: wide, dx: -16 * wide, shape: wide > 0.4 ? "palm" : "ball", sz: 0.22 } : lapel > 0.02 ? { a: "hip", b: "chestPocket", k: lapel, dx: 4, dy: -6 } : { a: "hip" },
    wide > 0.02 ? { a: "hip", b: "raise", k: wide, dx: 16 * wide, shape: wide > 0.4 ? "palm" : "ball", sz: 0.22 }
      : sweep > 0.02 ? { a: "hip", b: tankHand, k: sweep, shape: sweep > 0.35 ? "palm" : "ball", sz: 0.32, ang: 50 * clamp01(sweep), front: true, maxLen: 1.3 }
      : lapel > 0.02 ? { a: "hip", b: "chestPocket", k: lapel, dx: -4, dy: -6 } : { a: "hip" }];
  put(out, cam, TINO, P, o);
};
/** shot 2 background life (fix r2, A2 P2): one of Tino's men strolls along the tank wall with a wrench on his shoulder;
 *  another stands at the pipe run tightening a flange (a 24 f wrench loop, blinks) and rolls his eyes at the boss on
 *  "king" (12 f), then back to work; two gulls glide across the sky; in the landing a third pushes a hand truck of drums
 *  across the background (left to right) and tips his cap to Tino */
const farmhands = (out: Stage, cam: CamInfo, f: number) => {
  const O = TF.base, s = SHOTS[1];
  { const A = WORKER(0), L = life(VF, A.i), u = clamp01((f - s.a + 6) / (s.b - s.a + 12)), p: V3 = [lerp(5.6, 2.2, u), 0, 4.3];
    put(out, cam, A, add(O, p), { breath: L.breath, mode: "walk", phase: f / 15, facing: -1, expr: "calm", look: -0.6, blink: blinkAt(VF, A.i), wind: 0.4 * windAt(VF, A.i),
      hands: [{ a: "hang" }, { a: "raise", dx: -6, dy: 14, hold: "wrench", ang: -150 }] }); }
  { const A = WORKER(1), L = life(VF, A.i), roll = gest2(f, BEAT.king - 2, 8, BEAT.king + 14, 8), ph = (TAU * VF) / 24, turn = Math.sin(ph), push = Math.max(0, Math.sin(ph));
    const keys: [number, Expr][] = [[0, "effort"], [BEAT.king - 2, "skeptic"], [BEAT.king + 16, "focus"]];
    put(out, cam, A, add(O, [-3.1, 0, 5.4]), { breath: L.breath, tilt: L.sway + 3 * push * (1 - roll), headTilt: L.head - 4 + 8 * roll, shift: L.shift, facing: 1, expr: exprAt(f, keys),
      lookY: roll > 0.3 ? -1.5 : 1.2, look: roll > 0.3 ? 1.1 : 0.4, blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), wind: 0.4 * windAt(VF, A.i), crouch: 0.05 * push,
      hands: [{ a: "chest", dx: 4, dy: 6, front: true }, { a: "chest", dx: 14 + 6 * turn, dy: 2 - 5 * turn, hold: "wrench", ang: 90 + 40 * turn, front: true }] }); }
  // two gulls gliding across the sky band (a slow wing beat, then a glide)
  for (const [k, z, y, x0, x1, t0] of [[0, 7, 7.2, -7, 1.5, BEAT.king - 18], [1, 6, 8.0, -9, -1, BEAT.king - 8]] as const) {
    const u = clamp01((f - t0) / 50); if (u <= 0 || u >= 1) continue;
    const wing = 0.5 + 0.5 * Math.sin((f - t0) * 0.55 + k * 2);
    fx(out, `gull|${q(wing, 8)}|1|1`, 256, 256, (p) => drawGull(p, wing, 1, true), add(O, [lerp(x0, x1, u), y + 0.4 * Math.sin(Math.PI * u), z]), 0.62, 0.62);
  }
  // the hand truck: pushed left -> right across the background in the landing, a cap tip on the way past Tino
  { const A = WORKER(2), L = life(VF, A.i), t0 = BEAT.full1 - 24, u = clamp01((f - t0) / 52);
    if (u > 0 && u < 1) {
      const x = lerp(-7.6, -3.4, u), z = 5.6, tip = gest2(f, BEAT.oil1 - 14, 7, BEAT.oil1 + 2, 7);
      const PW2 = add(O, [x, 0, z]), c2 = vec(cam.pos), y2 = yawFrom(c2, PW2), tr = add(O, [x + 0.62, 0, z + 0.05]), hdl = toCard(c2, PW2, y2, 1, [tr[0] - 0.03, 1.02, tr[2]]);
      put(out, cam, A, PW2, { breath: L.breath, mode: "walk", phase: (f - t0) / 13, lift: 0.9, facing: 1, expr: tip > 0.3 ? "smile" : "effort", look: 0.8, lookY: 0.2,
        blink: blinkAt(VF, A.i), tilt: 6, wind: 0.4 * windAt(VF, A.i), hands: [tip > 0.02 ? { a: [hdl[0] - 8, hdl[1] + 10], b: "head", k: tip, dy: -4 * tip } : { a: [hdl[0] - 8, hdl[1] + 10] }, { a: hdl, front: true }] });
      fx(out, `htruck|${q(((f - t0) * 0.3) % TAU, 6)}`, 256, 384, (p) => drawHandTruck(p, (f - t0) * 0.3), [tr[0], 0.55, tr[2]], 0.75, 1.12, { yaw: yawFrom(vec(cam.pos), tr) });
      blob(out, tr[0], 0, tr[2], 0.9, 0.7, true);
    }
  }
};
/** shot 9 (fix r2, A2 P1/P2): the rain at the tank farm. A file of four lenders (fedoras, BIG black umbrellas held out
 *  BESIDE the head so no shaft or arm ever crosses a face) stands just inside the gate, staggered in depth (+-0.5 m),
 *  spacing and size; they flinch and gasp at the BANKRUPT slap on "bust", look UP at the notice (18 f), then at each other
 *  (worry). On "Lenders" the brown one points up at No. 7 (18 f) and the other three turn (front -> 3/4 -> back over 12 f)
 *  and hurry off toward the drums at screen right (the lead one in a 3/4 profile with his flashlight); the brown one stays,
 *  glances back at BANKRUPT on "finally", then squints up at the tank on "tanks". A gust clamps one hat, the rear
 *  umbrella blows inside out on "finally" and is tugged back. Breath steams in the cold. THE HERO of "checked": a lender
 *  hurrying up the No. 7 spiral stair from its foot (from "Lenders" - 6), his flashlight aimed up at the roof, above the
 *  umbrella line by "checked" */
const FILE9: { x: number; z: number; sc: number; tilt: number }[] = [{ x: -1.55, z: 14.5, sc: 1.0, tilt: -16 }, { x: -0.65, z: 14.0, sc: 1.06, tilt: -8 },
  { x: 0.65, z: 14.9, sc: 0.94, tilt: -4 }, { x: 1.65, z: 14.3, sc: 1.02, tilt: -12 }];
/** where the walkers head (set-local x, z): toward the drums at screen right, clear of the stair foot */
const FILE9_TO: [number, number][] = [[3.3, 10.6], [0, 0], [4.1, 11.4], [4.8, 12.2]];
/** the hero tank's spiral stair (sets_ext.ts FARM_STAIR): tread centre radius r + 0.43, angle a0 at y 0.2, 5.8 m per rad */
const STAIR9 = (() => { const H = TF.hero, L2 = TF.lenders[2], la = Math.atan2(L2[0] - H.c[0], L2[2] - H.c[2]); return { a0: la + (2.3 - 0.2) / 5.8, R: H.r + 0.43, c: H.c }; })();
const stairAt = (y: number): V3 => { const th = STAIR9.a0 - (y - 0.2) / 5.8; return [STAIR9.c[0] + STAIR9.R * Math.sin(th), y, STAIR9.c[2] + STAIR9.R * Math.cos(th)]; };
const lenders9 = (out: Stage, cam: CamInfo, f: number) => {
  const O = TF.base, end = SHOTS[8].b + 6, rainPh = VF, fin = PW(16, "finally"), tks = PW(16, "tanks");
  const umb = (k: number) => ({ n: 2.6 * wave(VF, HZ.ub, k * 1.7) });
  TF.lenderFile.forEach((_p0, k) => {
    const A = LENDER(k + 3), L = life(VF, A.i), stay = k === 1, F = FILE9[k], order = k === 0 ? 0 : k === 2 ? 1 : 2, t0 = BEAT.lenders - 6 + 6 * order;
    const tt = stay ? -1 : f - t0, s = stay ? 0 : clamp01((f - t0 - 6) / Math.max(1, end - t0 - 6)), walking = !stay && f >= t0 + 6;
    const to = FILE9_TO[k], x = lerp(F.x, to[0], smooth(s)), z = lerp(F.z, to[1], smooth(s));
    const jolt = gest2(f, BEAT.bust + (k % 2), 4, BEAT.bust + 10, 10), face0 = (k % 2 ? -1 : 1) as -1 | 1, walkDir = 1 as -1 | 1;
    const upNotice = f >= BEAT.bust + 2 && f < BEAT.bust + 20, atEach = f >= BEAT.bust + 20 && f < BEAT.lenders;
    const keys: [number, Expr][] = stay ? [[0, "stern"], [BEAT.bust, "gasp"], [BEAT.bust + 20, "worry"], [BEAT.lenders - 2, "alert"], [fin, "browsUp"], [tks, "squint"]]
      : [[0, k ? "stern" : "skeptic"], [BEAT.bust + (k % 2), "gasp"], [BEAT.bust + 20, "worry"]];
    // the turn: front (0-4 f) -> a 3/4 front toward the walk (4-8 f) -> a 3/4 BACK (from 8 f); the lead lender (k 0)
    // keeps the 3/4 front profile as he walks (one more face through "checked")
    const lead = k === 0, view: "front" | "back" = !stay && !lead && tt >= 8 ? "back" : "front";
    const facing: -1 | 0 | 1 = stay ? (f >= fin - 2 && f < tks - 6 ? 1 : f >= BEAT.lenders - 4 && f < BEAT.lenders + 18 ? -1 : atEach ? face0 : 0)
      : tt >= 4 ? walkDir : upNotice ? 0 : atEach ? face0 : 0;
    const point = stay ? gest2(f, BEAT.lenders - 4, 10, BEAT.lenders + 14, 10) : 0, clamp = k === 2 ? gest2(f, BEAT.bust + 8, 6, BEAT.bust + 22, 8) : 0;
    const inv = k === 3 ? gest2(f, fin - 2, 4, fin + 12, 6) : 0;
    const o: PersonOpts = { breath: L.breath, tilt: L.sway + (walking ? 2 * Math.sin(TAU * (s * 4)) : 0) + 4 * inv, headTilt: L.head + (upNotice ? 4 : 0) + (f >= BEAT.checked ? -7 : 0) + 6 * point,
      shift: L.shift, mode: walking ? "walk" : "stand", phase: (s * (end - t0)) / 20, lift: 0.9, view, facing,
      expr: exprAt(f, keys), look: upNotice ? 0.6 : atEach ? face0 * 1.0 : stay ? (f >= fin - 2 && f < tks - 6 ? 1.0 : point > 0.3 ? -0.6 : 0) : walking ? 0.8 : 0,
      lookY: upNotice ? -1.4 : stay ? (point > 0.3 ? -1.5 : f >= tks - 2 ? -1.6 : 0.2) : f >= BEAT.checked ? -1.4 : 0.1,
      face: upNotice || point > 0.3 || (stay && f >= tks - 2) ? { fdy: -3 } : undefined, blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), crouch: -0.14 * jolt, wind: 0.8 * windAt(VF, A.i), flutter: 1.4 * flutAt(VF, A.i),
      umbTilt: F.tilt + 3 * windAt(VF, A.i) + 18 * inv, umbInv: inv, rain: rainPh + k * 3,
      hands: [{ a: view === "front" ? [148, 335] : [300 - 60 * face0, 330], hold: "umbrella", ...umb(k), front: false },
        point > 0.02 ? { a: "hang", b: "up", k: point, dx: -18 * point, shape: point > 0.5 ? "f1" : "ball", front: true, over: true }
        : clamp > 0.02 ? { a: "hang", b: "head", k: clamp, dy: -6 * clamp, shape: "mitten", sz: 0.2, front: true }
        : inv > 0.02 ? { a: "hang", b: "raise", k: inv, dx: 10, front: true }
        : lead && walking ? { a: "reach", dy: -20, hold: "flashlight", ang: 70, n: 1 } : { a: "hang" }] };
    const P: V3 = add(O, [x, 0, z]);
    put(out, cam, A, P, o, { blobK: 0.7, noTail: true, scale: F.sc });
    // breath steam in the cold (a puff every ~2 s from the mouth side)
    const ph = ((VF + 17 * k) % 60) / 22;
    if (view === "front" && ph < 1) { const sd = (facing || (k % 2 ? 1 : -1)) as number;  // from the mouth corner, drifting out past the cheek
      fx(out, `steam|${q(ph, 10)}`, 128, 128, (p) => { if (sd < 0) { p.g.translate(128, 0); p.g.scale(-1, 1); } fxSteam(p, ph); }, toward([P[0] + 0.3 * sd * F.sc, 1.1 * F.sc, P[2]], vec(cam.pos), 0.15), 0.3 * F.sc, 0.3 * F.sc, { soft: true }); }
    if (lead && walking) { // the lead lender's flashlight beam cutting the rain toward the tank (an additive cone + a hot spot)
      const hand: V3 = [P[0] + 0.34, 1.05, P[2] - 0.1], tgt: V3 = add(O, [2.6, 2.4, 3.6]);
      beam(out, 9, f, hand, tgt, 0.03, 0.6, 0.5, "torch9");
      fx(out, `glow|spot9`, 128, 128, (p) => fxSpot(p, 0.7), toward(tgt, vec(cam.pos), 0.3), 0.9, 0.6, { soft: true });
    }
  });
  // the far layer: the pair at the tank foot (backs to us, heads up at the tank top) + THE HERO: the climber on the stair
  for (let k = 0; k < 3; k++) {
    const A = LENDER(k), L = life(VF, A.i);
    if (k === 2) {
      // up the No. 7 spiral stair from its foot (from "Lenders" - 6): a hurried climb (a tread every ~2 f, the body bobbing
      // per step), feet ~2.4 m up by "checked", then a slower climb; back view turned up the stair; the flashlight in his
      // raised hand aimed UP at the roof rim (a long warm cone), the other hand on the handrail; 1.3x so he reads at phone size
      const tA = BEAT.lenders - 6, tB = BEAT.checked, u1 = clamp01((f - tA) / (tB - tA)), y = f < tA ? 0.2 : f < tB ? 0.2 + 2.2 * (u1 * u1 * (3 - 2 * u1)) : 2.4 + 0.022 * (f - tB);
      const pos = stairAt(Math.min(y, 4.0)), steps = (y - 0.2) / 0.21, bob = 0.04 * Math.abs(Math.sin(Math.PI * steps));
      const P: V3 = add(O, [pos[0], pos[1] + bob - 0.02, pos[2]]), SC = 1.6;
      const co: PersonOpts = { breath: L.breath, view: "back", facing: -1, mode: "walk", phase: steps / 2, lift: 1.5, tilt: 3 * Math.sin(Math.PI * steps) + 2 * flutAt(VF, A.i),
        headTilt: -6, lookY: -1.4, wind: windAt(VF, A.i), flutter: 1.4 * flutAt(VF, A.i), rain: rainPh + 9,
        hands: [{ a: "up", dx: -6, dy: 10, hold: "flashlight", ang: -10, n: 1, front: true, over: true }, { a: "reach", dy: -40 - 8 * Math.sin(Math.PI * steps) }] };
      put(out, cam, A, P, co, { noBlob: true, scale: SC });
      if (f >= tA) {
        // the cone is aimed UP the stair at the tank wall (a hot spot above-left of him, under the gate sign)
        const up2 = stairAt(Math.min(y, 4.0) + 2.6), wl = Math.hypot(up2[0] - STAIR9.c[0], up2[2] - STAIR9.c[2]) || 1;
        const hand: V3 = fromCard(P, yawFrom(vec(cam.pos), P), SC, handAt(A.o, { ...co, seed: seedOf(A.i) }, 0)), rim: V3 = add(O, [STAIR9.c[0] + ((up2[0] - STAIR9.c[0]) * (TF.hero.r + 0.05)) / wl, up2[1] + 0.6, STAIR9.c[2] + ((up2[2] - STAIR9.c[2]) * (TF.hero.r + 0.05)) / wl]);
        beam(out, 9, f, hand, rim, 0.04, 0.8, 0.85 * smooth((f - tA) / 8), "climb9");
        fx(out, `glow|spot9c`, 128, 128, (p) => fxSpot(p, 1), toward(rim, vec(cam.pos), 0.4), 1.6, 1.1, { soft: true });
      }
      continue;
    }
    const p0 = TF.lenders[k];
    put(out, cam, A, add(O, p0), { breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift, mode: "stand", phase: 0,
      view: "back", facing: (k ? -1 : 1) as -1 | 1, lookY: f > BEAT.checked - 4 ? -1.4 : -0.4, wind: windAt(VF, A.i), flutter: 1.3 * flutAt(VF, A.i), umbTilt: -10, rain: rainPh + 5 * k,
      hands: [{ a: [300 + 60 * (k ? 1 : -1), 330], hold: "umbrella", ...umb(k + 7) }, { a: "hang" }] }, { blobK: 0.7, noTail: true });
  }
};
const tankfarm = (out: Stage, cam: CamInfo, id: number, f: number) => { if (id === 2) { tino2(out, cam, f); farmhands(out, cam, f); } else if (id === 9) lenders9(out, cam, f); };

// ---------------- the bank ----------------
/** shot 3 (fix r2, A2 P1): where the stack of cash slides on "against it" (0 .. 1): a 3 f pull-back, then a 16 f
 *  ease-out push (no overshoot) to the unseen borrower; sets_int.ts moves the cash with lerp(BK.cash, BK.cashTo, cashSlide(f)) */
/** the slanted OIL RECEIPT's APPROVED spot and its face normal (bank-local, from sets_int.ts RECEIPT_B / YAW / TILT) */
const RC_P: V3 = [-0.365, 0.864, -0.550], RC_N: V3 = [-0.113, 0.899, 0.423];  // fix2 LEAD (WORLD-INT receipt tilt 26 deg)
export const cashSlide = (f: number) => {
  const t = f - BEAT.againstIt;
  if (t < -3) return 0;
  if (t < 0) return -0.03 * Math.sin((Math.PI / 2) * ((t + 3) / 3));
  if (t < 16) return -0.03 + 1.03 * (1 - (1 - t / 16) ** 3);
  return 1;
};
/** fix r2 (A2 P1): shot 3's banker stands 0.2 m nearer the desk, 0.1 m right and 0.12 m higher (a local anchor from
 *  BK.banker): his shoulders, tie and both bent arms read over the slanted receipt, every reach <= ~0.55 m on screen */
const BANKER3: V3 = [BK.banker[0] + 0.1, 0.12, BK.banker[2] + 0.2];
/** where the stamp waits on the desk (just right of the receipt, >= 40 px clear of its letters) */
const STAMP_PARK: V3 = [0.02, 0.785, -0.74];
/** shot 5 (fix r1): the stamp landings = the score's beats (the right hand on stamps_5, the left hand half way between) */
export const STAMPS5 = { R: [BEAT.soBanks + 15.1 - 30.25, BEAT.soBanks + 15.1, BEAT.soBanks + 45.4, BEAT.soBanks + 75.6, BEAT.soBanks + 105.85],
  L: [BEAT.soBanks, BEAT.soBanks + 30.25, BEAT.soBanks + 60.5, BEAT.soBanks + 90.75] };
/** a stamping hand's height over the desk (m) round its landings: hover 0.30, a 3 f anticipation lift (+10 %), the slam
 *  (ease-in, 3 f), 2 f squashed on the paper, then up again over 12 f */
const stampH = (f: number, lands: number[]) => {
  for (const c of lands) {
    const t = f - c;
    if (t >= -6 && t < -3) return 0.3 + 0.03 * smooth((t + 6) / 3);
    if (t >= -3 && t < 0) return lerp(0.33, 0.085, ((t + 3) / 3) ** 2.2);
    if (t >= 0 && t < 2) return 0.085;
    if (t >= 2 && t < 14) return lerp(0.085, 0.3, smooth((t - 2) / 12));
  }
  return 0.3;
};
/** shot 5 (fix r2, A2 P2): the top of an OUTER cash stack (si 0 / 2) at frame f, as sets_int.ts stacks its bundles
 *  (4 to start, +4 on "more", +5 on the second "more", 0.0295 m each, each lands at its t0) */
const stackTop5 = (si: 0 | 2, f: number) => {
  let n = 0;
  for (let j = 0; j < 13; j++) { const t0 = j < 4 ? -1e9 : j < 8 ? BEAT.more1 - 2 + (j - 4) * 2.5 + si : BEAT.more2 - 2 + (j - 8) * 2.2 + si; if (f >= t0) n = j + 1; }
  return 0.785 + n * 0.0295;
};
const bank = (out: Stage, cam: CamInfo, id: number, f: number) => {
  if (id === 6) { chart6(out, cam, f); return; }
  const O = BK.base, P = add(O, id === 3 ? BANKER3 : BK.banker), c = vec(cam.pos), yaw = yawFrom(c, P), i = BANKER.i, L = life(VF, i);
  const W = (p: V3, dy = 0): V3 => [O[0] + p[0], O[1] + p[1] + dy, O[2] + p[2]];
  if (id === 3) {
    // eyes DOWN on the receipt as the stamp comes over (head pitched 6 deg); the satisfied ^^ at the lens on the slam (a 3 f
    // glasses glint); the eyes follow the cash he pushes to the borrower, a satisfied pat; brows up on "American"; a sly
    // side-eye at the window as the inspectors are sent (held to the cut)
    const m = BEAT.money, keys: [number, Expr][] = [[0, "smile"], [m - 6, "focus"], [m + 1, "content"], [BEAT.againstIt - 1, "smile"], [BEAT.amex - 1, "browsUp"],
      [BEAT.amex + 16, "smile"], [BEAT.sent - 4, "shifty"]];
    const ex = exprAt(f, keys);
    const toCash = f >= BEAT.againstIt - 1 && f < BEAT.amex - 1, win = f >= BEAT.sent - 4, down = ex === "focus";
    const pat = gest2(f, BEAT.againstIt + 18, 4, BEAT.againstIt + 23, 4) + gest2(f, BEAT.againstIt + 25, 4, BEAT.againstIt + 30, 4);
    // the stamp (his right hand, screen left): parked on the desk beside the receipt; carried over the board (10 f), a 3 f
    // lift, the slam ON "money", pressed to money + 6 (a 2 f squash), lifted off over 10 f, then back to its spot
    const over = (h: number): V3 => W([RC_P[0] + RC_N[0] * (h - 0.005), RC_P[1] + RC_N[1] * (h - 0.005), RC_P[2] + RC_N[2] * (h - 0.005)]);
    const park = W(STAMP_PARK, 0.085), t = f - m;
    const sp = t < -16 ? park : t < -6 ? lerp3(park, over(0.3), smooth((t + 16) / 10)) : t < -3 ? over(0.3 + 0.03 * smooth((t + 6) / 3))
      : t < 0 ? over(lerp(0.33, 0.085, ((t + 3) / 3) ** 2.2)) : t < 6 ? over(0.085) : t < 16 ? over(lerp(0.085, 0.25, smooth((t - 6) / 10))) : lerp3(over(0.25), park, smooth((t - 16) / 12));
    const o: PersonOpts = { breath: L.breath, tilt: 0.7 * L.sway + (t >= -1 && t < 6 ? -3 : 0), headTilt: L.head * 0.7 + (down ? -3 : toCash ? 4 : win ? 6 : 0), shift: L.shift * 0.5, expr: ex,
      blink: Math.max(blinkAt(VF, i), swapLid(f, keys)), look: down ? -0.6 : toCash ? 1.0 : win ? 1.3 : 0, lookY: down ? 1.5 : toCash ? 1.0 : win ? -0.4 : 0,
      nod: t >= 0 && t < 8 ? 0.6 : down ? 0.9 : 0.1 * pat, crouch: t >= 0 && t < 2 ? 0.04 : 0, face: { fdy: down ? 4 : 0, glint: t >= 1 && t < 4 ? 1 : 0 },
      hands: [{ a: "chest", hide: true }, { a: "chest", hide: true }] };
    put(out, cam, BANKER, P, o, { noBlob: true, yaw });
    reachArm(out, cam, BANKER, P, yaw, o, 0, sp, { hold: "stamp", n: t >= 0 ? 1 : 0, ang: -6, elbow: 0.24, up: 10 });
    // the cash hand (his left, screen right): rests by the stack, pushes it across to the borrower ("against it", 16 f
    // ease-out), two satisfied pats on it, then withdraws to the desk
    const cu = cashSlide(f), cash = lerp3(BK.cash, BK.cashTo, cu), reach = gest2(f, BEAT.againstIt - 10, 7, BEAT.againstIt + 34, 12);
    const push: V3 = W([cash[0] + 0.02, cash[1] + 0.06 + 0.035 * (1 - pat), cash[2] - 0.09]);
    reachArm(out, cam, BANKER, P, yaw, o, 1, lerp3(W([0.4, 0.84, -1.05]), push, reach), { ang: 10, elbow: 0.2, up: 6 });
    return;
  }
  if (id === 5) {
    // two stamps landing ON the score's beats (right hand on stamps_5, left half way between), eyes blissfully shut, a
    // contented nod + a 2 f shoulder squash on every landing. fix r2 (A2 P2): from ~"more" the stamps hit the CASH itself
    // (the top of each outer stack, which grows), so every thump visibly makes money; a happy shoulder shimmy on the
    // second "more"; bills flutter down beside him (never across his face); a banknote tucked behind his ear by the end
    const keys: [number, Expr][] = [[0, "bliss"], [BEAT.more1, "beam"], [BEAT.more1 + 16, "bliss"], [BEAT.more2, "beam"], [BEAT.more2 + 16, "bliss"]];
    const all = [...STAMPS5.R, ...STAMPS5.L], near = Math.min(...all.map((x) => (f - x >= 0 ? f - x : 99)));
    const shim = f >= BEAT.more2 + 2 && f < BEAT.more2 + 14 ? 2 * Math.sin((TAU * 2 * (f - BEAT.more2 - 2)) / 30) : 0;
    const o: PersonOpts = { breath: L.breath, tilt: 0.5 * L.sway + 2.5 * Math.sin((TAU * (f - STAMPS5.R[1])) / 30.25) + shim, headTilt: L.head * 0.6 + 3 * Math.sin((TAU * (f - STAMPS5.R[1])) / 30.25) - shim,
      expr: exprAt(f, keys), blink: 0, nod: near < 4 ? 0.7 : 0.1, crouch: near < 2 ? 0.05 : 0, earNote: f >= BEAT.more2 + 4, hands: [{ a: "chest", hide: true }, { a: "chest", hide: true }] };
    put(out, cam, BANKER, P, o, { noBlob: true, yaw });
    const ret = smooth((f - (BEAT.more1 - 4)) / 8);   // the hands move over to the stacks while up, before the first "more" landing
    const tgt = (s: -1 | 1): V3 => { const top = stackTop5(s < 0 ? 0 : 2, f); return lerp3([0.5 * s, 0.785, -0.95], [0.42 * s, top, -0.52], ret); };
    const tl = tgt(-1), tr2 = tgt(1);
    reachArm(out, cam, BANKER, P, yaw, o, 0, W(tl, stampH(f, STAMPS5.L)), { hold: "stamp", n: 1, ang: -8, elbow: 0.16 });
    reachArm(out, cam, BANKER, P, yaw, o, 1, W(tr2, stampH(f, STAMPS5.R)), { hold: "stamp", n: 1, ang: 8, elbow: 0.16 });
    // bills fluttering down after each "more" (a pendulum flutter, 30 f), always outside his head (|x| >= 0.5 m)
    for (const [m0, seed] of [[BEAT.more1 + 2, 1], [BEAT.more2 + 2, 2]] as const) for (let n = 0; n < 3; n++) {
      const t = f - m0 - 4 * n; if (t < 0 || t > 32) continue;
      const u = t / 32, sw = Math.sin(t * 0.32 + n * 2 + seed), side = n === 1 ? (seed === 1 ? 1 : -1) : n === 0 ? -1 : 1, x = side * (0.56 + 0.08 * n) + 0.07 * sw, y = 1.85 - 1.0 * u;
      fx(out, `bill|${q(sw, 6)}`, 128, 64, (p) => fxBill(p), W([x, y, -0.62 + 0.05 * n]), 0.15, 0.075, { rot: 0.6 * sw });
    }
  }
};
/** shot 6 (fix r2, A2 P1): Tino stands 0.22 m nearer the chart along its face and 0.25 m out toward the lens (a local
 *  anchor from BK.tinoChart): clear of the foreground desk, lamp and receipt. He brags as TINO'S OIL grows: a pointer in
 *  his chart-side hand (idle: a slow tap bob), a fan of OIL RECEIPTS raised to HEAD height on "papers" (chin up, eyes
 *  open, brows up, held 16 f); a 3 f lean back, then a tap on TINO'S OIL on "more" with the raised-brow D-grin brag held
 *  ~40 f, head turned to the chart; a lapel tug; a dismissive flick at the small US pile with a side-eye on "entire";
 *  wide eyes + an open grin tracking the drums up the pyramid on "United" (18 f sweep); the beam to us on "had.", then a
 *  wink and a polish of his gold pin at chest height */
const chartPt = (lx: number, ly: number): V3 => { const C = BK.chart, a = C.yaw; return add(BK.base, [C.c[0] + Math.cos(a) * lx * C.w * 0.5 + Math.sin(a) * 0.03, C.c[1] + ly * C.h * 0.5, C.c[2] - Math.sin(a) * lx * C.w * 0.5 + Math.cos(a) * 0.03]); };
const TINO6: V3 = (() => { const a = BK.chart.yaw, ux = Math.cos(a), uz = -Math.sin(a), nx = Math.sin(a), nz = Math.cos(a);
  return [BK.tinoChart[0] - 0.22 * ux + 0.25 * nx, 0, BK.tinoChart[2] - 0.22 * uz + 0.25 * nz]; })();
const chart6 = (out: Stage, cam: CamInfo, f: number) => {
  const P = add(BK.base, TINO6), i = TINO.i, L = life(VF, i), ref = camRef(6, BEAT.moreOf), yaw = yawFrom(ref, P);
  const pap = gest2(f, BEAT.papers - 2, 12, BEAT.papers + 26, 12), tap = gest2(f, BEAT.moreOf - 2, 6, BEAT.moreOf + 10, 8), flick = gest2(f, BEAT.entire - 2, 6, BEAT.entire + 8, 8);
  const lb = gest2(f, BEAT.moreOf - 6, 3, BEAT.moreOf - 2, 3), lapT = gest2(f, BEAT.moreOf + 22, 7, BEAT.moreOf + 36, 8);
  const sw = clamp01((f - (BEAT.united - 2)) / 18), sweepOn = f >= BEAT.united - 5 && f < BEAT.had - 4, polish = gest2(f, BEAT.had - 2, 8, BEAT.had + 18, 10);
  const keys: [number, Expr][] = [[0, "smug"], [BEAT.papers - 2, "chinUp"], [BEAT.moreOf - 2, "brag"], [BEAT.entire - 2, "shifty"], [BEAT.united - 2, "thrill"], [BEAT.had - 2, "beam"], [BEAT.had + 12, "wink"]];
  const ex = exprAt(f, keys), toChart = (f >= BEAT.moreOf - 2 && f < BEAT.moreOf + 30) || sweepOn;
  // where the pointer goes: resting down by his side; the tap on TINO'S OIL; the flick at the US pile; the sweep up the pyramid
  const pyr = chartPt(0.45, lerp(-0.62, 0.15, smooth(sw))), us = chartPt(-0.42, -0.5), tino = chartPt(0.45, -0.25);
  const tgtW = sweepOn ? pyr : flick > 0.05 ? us : tino, aim = Math.max(tap, flick, sweepOn ? smooth(clamp01((f - (BEAT.united - 5)) / 4)) * (1 - smooth(clamp01((f - (BEAT.had - 8)) / 4))) : 0);
  const idleTap = (1 - aim) * Math.max(0, Math.sin((TAU * VF) / 24)) ** 4;
  const o: PersonOpts = { breath: L.breath, tilt: L.sway - 3 * aim + 4 * lb, headTilt: L.head + (ex === "shifty" ? -5 : sweepOn ? -4 - 4 * sw : toChart ? -6 : 0) + 5 * pap, shift: L.shift, facing: -1, expr: ex,
    look: ex === "shifty" ? -1.3 : toChart ? -1.0 : pap > 0.3 ? 0.2 : 0, lookY: sweepOn ? lerp(0.8, -1.3, smooth(sw)) : ex === "shifty" ? 0.6 : pap > 0.3 ? -0.3 : 0,
    face: f >= BEAT.had + 12 ? { wink: -1 } : pap > 0.3 ? { fdy: -3 } : undefined,
    blink: Math.max(blinkAt(VF, i), swapLid(f, keys), f >= BEAT.had + 4 && f < BEAT.had + 6 ? 1 : 0), crouch: -0.1 * pap - 0.08 * polish, flutter: 0.5 * Math.sin(VF * 0.5) * aim, wind: 0.25 * aim, seed: seedOf(i) };
  const hand0: P2 = lerp2(toCard(ref, P, yaw, 1, add(P, [-0.42, 1.05 + 0.03 * idleTap, 0.1])), toCard(ref, P, yaw, 1, lerp3(add(P, [-0.3, 1.25, 0]), tgtW, 0.32)), aim);
  o.hands = [{ a: hand0, hold: "pointer" }, polish > 0.02 ? { a: "hip", b: "chestPocket", k: polish, dx: -16 - 5 * Math.sin(f * 1.1) * polish, dy: -4 + 3 * Math.cos(f * 1.1) * polish, front: true }
    : pap > 0.02 ? { a: "hip", b: "raise", k: pap, dx: -26 * pap, dy: -6 * pap, hold: pap > 0.3 ? "papers" : null, ang: -8, front: true }
    : lapT > 0.02 ? { a: "hip", b: "chestPocket", k: lapT, dx: -10, dy: -8 } : { a: "hip" }];
  // aim the pointer from the hand at the target (its length reaches it, clamped to a ~1 m stick)
  const hd = handAt(TINO_FIT, o, 0), tg = toCard(ref, P, yaw, 1, tgtW), rest = toCard(ref, P, yaw, 1, add(P, [-0.62, 0.02 + 0.06 * idleTap, 0.15]));
  const tip = lerp2(rest, tg, aim), [, , u] = shoulderAt(TINO_FIT, o, 0), dx = tip[0] - hd[0], dy = tip[1] - hd[1];
  o.hands[0]!.ang = (Math.atan2(dx, -dy) * 180) / Math.PI; o.hands[0]!.n = clamp(Math.hypot(dx, dy) / u, 60, 260);
  put(out, cam, TINO, P, o, { yaw, blobK: 0.8 });
};

// ---------------- the trading floor ----------------
/** a local anchor for Tino on the trading floor (front left third; LEAD: TR.tino) */
const TR_TINO: V3 = TR.tino;
/** shot 8 (fix r1): the 1963 trading floor: tinted shirts, waistcoats, suspenders. The phone men holler into real
 *  handsets (the phone base in the other hand), the others face the board and wave slips; TINO in the front left third
 *  on the phone, smug from "his" through "oil"; on "crashed" (staggered 0-2 f) everyone jolts: goggle eyes and round
 *  mouths, sweat drops pop, slips fly up, two receivers (and Tino's) drop and dangle on their cords */
const swingAt = (t: number) => (t < 0 ? 0 : 1 + 0.95 * Math.exp(-t / 9) * Math.cos(t * 0.42));
const trading = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  // fix r2 (A2 P2): a SHOUTING floor: the phone men cycle open shouting faces (holler / O / alert, each held 14-18 f,
  // phase-staggered, never on the narration rhythm); the board men pump their slips (12-18 f strokes, staggered); one
  // slams his handset down mid-shot; the ginger trader stands 0.25 m right (he reads in the wide); on "crashed" (staggered
  // 0-2 f) everyone jolts: one throws his slips up, one sits down hard with his head in his hands, and one keeps
  // hollering into TWO phones a beat longer (the comic beat)
  const C1 = BEAT.crashed1, SLAM = BEAT.november + 20;
  TR.traders.forEach((p0, k) => {
    const A = TRADER(k), L = life(VF, A.i), d = k % 3, sh = f >= C1 - 1 + d + (k === 5 ? 9 : 0), jolt = gest2(f, C1 - 1 + d, 4, C1 + 7 + d, 10);
    const phone = k % 2 === 1, P = add(TR.base, [p0[0] + (k === 1 ? 0.25 : 0), p0[1], p0[2]]);
    const cyc = Math.floor((VF + 23 * k) / 16) % 3, pump = Math.sin((TAU * (VF + 7 * k)) / (12 + 3 * (k % 3))), stroke = Math.sign(pump) * Math.abs(pump) ** 0.6;
    if (phone) { // front view: the receiver at the ear, the phone base low in the other hand, hollering; on the crash the receiver drops
      const drop = sh && k !== 5, two = k === 5, slam = k === 3 ? gest2(f, SLAM, 5, SLAM + 9, 8) : 0;
      const keys: [number, Expr][] = [[0, (["holler", "shout", "alert"] as Expr[])[cyc]], [C1 - 1 + d + (two ? 9 : 0), "goggleO"]];
      const ex: Expr = sh ? "goggleO" : slam > 0.3 ? "grimace" : (["holler", "shout", "alert"] as Expr[])[cyc];
      put(out, cam, A, P, { breath: L.breath, tilt: L.sway + 3 * stroke * (sh ? 0 : 1), headTilt: L.head + 2 * slam, shift: L.shift, facing: k === 1 ? 1 : -1, expr: ex, lookY: sh ? -1.2 : -0.6, look: sh ? 0 : (k === 1 ? 0.6 : -0.6),
        blink: sh ? 0 : Math.max(blinkAt(VF, A.i), swapLid(f, keys)), crouch: -0.15 * jolt + 0.06 * slam, face: sh ? { glassDy: 3 } : undefined, sweat: sh && k !== 3 ? 1 : 0,
        hands: two && !sh ? [{ a: "ear", hold: "handset", n: 0.6 * pump }, { a: "ear", hold: "handset", n: -0.6 * pump }]
          : [{ a: "hip", dx: -10, dy: 12, hold: "phone", n: drop ? swingAt(f - (C1 - 1 + d)) : 0 },
            drop ? { a: "head", dy: 4, shape: "palm", sz: 0.2 } : slam > 0.02 ? { a: "ear", b: "hip", k: slam, dx: -8 * slam, hold: "handset", n: 0.6 * pump } : { a: "ear", hold: "handset", n: 0.6 * pump }] });
    } else { // back view: arms up pumping slips at the board; on the crash: hands to the head (the slips fly up), k 4 sits down hard
      const sit = k === 4 && sh ? smooth((f - (C1 - 1 + d)) / 6) : 0;
      put(out, cam, A, P, { breath: L.breath, tilt: L.sway + 4 * stroke * (sh ? 0 : 1), view: "back", facing: k === 2 ? 1 : -1, crouch: -0.15 * jolt + (sh ? 0.08 : 0) + 0.75 * sit, lookY: -0.8,
        hands: sh ? [{ a: "head", dy: 4 + 10 * sit }, { a: "head", dy: 4 + 10 * sit }] : [{ a: "up", dy: 18 * stroke, hold: k === 0 ? "slip" : null }, { a: cyc === 1 ? "point" : "up", dy: -18 * stroke, hold: "slip" }] });
      if (sh && k !== 4) for (let n = 0; n < 2; n++) { const t = f - (C1 - 1 + d) - n * 2; if (t < 0 || t > 30) continue;
        const u = t / 30, sw = Math.sin(t * 0.5 + n * 2 + k);
        fx(out, `slipfly|${q(sw, 6)}`, 128, 128, (p) => fxSlip(p), [P[0] + (n ? 0.3 : -0.3) + 0.1 * sw, 2.1 + 1.6 * u - 1.4 * u * u, P[2] + 0.1], 0.13, 0.13, { rot: 1.2 * sw + t * 0.2 }); }
    }
  });
  // Tino on the phone: hollering cheerfully at the board, smug at us from "his" through "oil", the crash: grimace, sweat,
  // the receiver drops and dangles on its coiled cord, his hand flies to his cheek; fix r2: the phone base hangs LOW at his
  // hip (the gold pin and tie stay clean)
  const P = add(TR.base, TR_TINO), i = TINO.i, L = life(VF, i), sh = f >= C1 - 2, jolt = gest2(f, C1 - 2, 4, C1 + 8, 10), hol = Math.floor((VF + 11) / 36) % 2;
  const keys: [number, Expr][] = [[0, hol ? "holler" : "grin"], [PW(14, "his") - 2, "smug"], [C1 - 2, "grimace"]];
  const ex = f < PW(14, "his") - 2 ? (hol ? "holler" : "grin") : exprAt(f, keys);
  put(out, cam, TINO, P, { breath: L.breath, tilt: L.sway + (sh ? -4 * jolt : 2 * Math.sin(VF * 0.3)), headTilt: L.head + (sh ? 5 : 0), shift: L.shift, facing: sh ? 0 : 1,
    expr: ex, look: sh ? 0 : f >= PW(14, "his") - 2 ? 0 : 0.7, lookY: sh ? -0.4 : f >= PW(14, "his") - 2 ? 0 : -1.2, blink: Math.max(sh ? 0 : blinkAt(VF, i), swapLid(f, keys)),
    crouch: -0.16 * jolt, sweat: sh ? 1 : 0, face: sh ? { browUp: [3, 3] } : undefined,
    hands: [{ a: "hip", dx: -14, dy: 16, hold: "phone", n: sh ? swingAt(f - (C1 - 2)) : 0 }, sh ? { a: "chin", dx: 16, dy: -6, shape: "palm", sz: 0.2 } : { a: "ear", hold: "handset", n: 0.5 * Math.sin(VF * 0.3) }] });
};

// ---------------- the cutaway ----------------
/** shots 10 / 12 (fix r2, A2 P2): the joke fish. Shot 10: it fades out of the murk at the tank's left wall on "mostly"
 *  + 10 and cruises right (a ~3 Hz tail, fin flutter, a bob) above the caption band; on the slosh a startled double-take
 *  (wide eyes, a jolt, held 12 f) and a 3-bubble "blub" chain, then back to the deadpan half-lid. ADD: in the opening hatch
 *  view the lender's flashlight beam shines down the hatch onto the gold. Shot 12: it drops out of the SPOUT with the water,
 *  straight down the stream with a spin (12 f), splashes in (a ring), swirl-eyed and dazed for 12 f, calms, swims up to
 *  watch the thin oil arrive and gives the gold ceiling a slow suspicious half-lid on "oil,", blows a big bubble that
 *  bounces off the underside of the gold, then swims off to the right before the crane up */
const FISH_Y = CU.fish.y; // fix1 LEAD: plan CU.fish.y = 4.7
const cutaway = (out: Stage, _cam: CamInfo, id: number, f: number) => {
  const O = CU.base, z = O[2] + Math.max(CU.fish.z, 0.12);
  let x = 0, y = FISH_Y, tilt = 0, lid = 1, up = 0, spin = 0, daze = 0, wide = 0, alpha = 1, sc = 1;
  const tail = Math.sin((VF * TAU * 3) / 30), fin = Math.sin(VF * 0.9 + 1), bob = 0.04 * Math.sin(VF * 0.21);
  const blubs: number[] = [];
  if (id === 10) {
    if (f < BEAT.was) { // the hatch view (the lender's torch, continuity from shot 9): a warm cone down onto the gold
      const k = 0.55 * smooth((f - (SHOTS[9].a - 8)) / 10);
      if (k > 0.02) { beam(out, 10, f, [O[0] + 0.35, CU.hatch.c[1] + 1.6, O[2] + CU.hatch.c[2] + 0.3], [O[0] + 0.05, CU.oil + 0.01, O[2] + CU.hatch.c[2]], 0.04, 0.3, k, "torch10");
        fx(out, `glow|spot10|${q(k, 8)}`, 128, 128, (p) => fxSpot(p, k), [O[0] + 0.05, CU.oil + 0.015, O[2] + CU.hatch.c[2]], 0.42, 0.34, { flat: true, soft: true }); }
    }
    const t0 = BEAT.mostly + 10; if (f < t0) return;
    const u = (f - t0) / 50; x = -2.95 + 2.7 * (1 - (1 - clamp01(u)) ** 1.6) + 0.004 * Math.max(0, f - t0 - 50); y = FISH_Y + bob; alpha = smooth((f - t0) / 8);
    const sl = f - (BEAT.waterEnd + 1);
    if (sl >= 0 && sl < 14) { wide = 1; tilt = 22 * Math.sin((Math.PI * Math.min(sl, 6)) / 6) * Math.exp(-sl / 8); y += 0.06 * Math.sin((Math.PI * Math.min(sl, 6)) / 6); }
    for (const d of [2, 6, 10]) if (sl >= d && sl < d + 22) blubs.push((sl - d) / 22);
  } else {
    const t0 = BEAT.waterIn + 4, drop = 12, land = t0 + 3 + drop; if (f < t0) return;
    const lv = lerp(0.75, CU.water, smooth((f - (BEAT.fill + 4)) / 45));  // fix2 LEAD: = sets_int's water level
    if (f < land) { // out of the spout (a 3 f pop-out), then straight down the water column with a spin
      const u = clamp01((f - t0 - 3) / drop); sc = 0.4 + 0.6 * smooth((f - t0) / 3); x = CU.hatch.c[0]; y = lerp(10.0, Math.min(lv - 0.25, 6.6), u * u); spin = u * 4.2; lid = 0;
    } else {
      const sw = smooth((f - land - 20) / 40), out2 = smooth((f - (BEAT.hatch - 34)) / 30), y0 = Math.min(lv - 0.25, 6.6) - 0.3;
      x = lerp(CU.hatch.c[0], 0.9, sw) + 2.6 * out2; y = Math.min(lv - 0.45, lerp(y0, 7.25, sw)) + bob;
      daze = f < land + 14 ? 1 - smooth((f - land - 10) / 4) : 0; spin = f < land + 12 ? lerp(4.2, TAU * 1.5, smooth((f - land) / 12)) : 0;
      const look = gest2(f, BEAT.thin, 8, BEAT.hatch - 34, 8); up = look; tilt = 8 * look;
      lid = daze > 0.05 ? 0 : f >= BEAT.oilIn - 2 && f < BEAT.hatch - 34 ? 1.3 : 1 - 0.85 * look;
      if (f >= land && f < land + 16) { const k = (f - land) / 16; fx(out, `splash|${q(k, 16)}`, 256, 128, (p) => fxSplash(p, k), [O[0] + CU.hatch.c[0], lv + 0.05, z + 0.02], 1.1, 0.55, { soft: true }); }
      // the big bubble: blown on "layer", rises and bounces off the underside of the gold layer (2x)
      const bt = f - (BEAT.thin + 8);
      if (bt >= 0 && bt < 40) { const top = CU.water - 0.14, by = Math.min(top, y + 0.2 + 0.07 * bt) - (bt > 14 ? 0.08 * Math.abs(Math.sin((bt - 14) * 0.35)) * Math.exp(-(bt - 14) / 12) : 0);
        fx(out, `fbub|${bt > 14 ? q(Math.sin(bt), 4) : 0}`, 128, 128, (p) => fxBubble(p, 1), [O[0] + x + 0.15 + 0.01 * bt, by, z + 0.01], 0.24, 0.24); }
    }
  }
  const d = 1;
  fx(out, `fish|${d}|${q(tail, 6)}|${q(fin, 4)}|${q(lid, 6)}|${q(up, 4)}|${q(daze, 4)}|${q(wide, 2)}|${q(alpha, 10)}`, 512, 320,
    (p) => { if (d < 0) { p.g.translate(512, 0); p.g.scale(-1, 1); } drawFish(p, tail * 0.9, false, fin, lid, up, daze > 0.05 ? daze + VF * 0.05 : 0, wide, alpha); },
    [O[0] + x, y, z], 1.2 * sc, 0.75 * sc, { rot: (d * tilt * Math.PI) / 180 + spin });
  blubs.forEach((b, n) => fx(out, `blub|${q(b, 12)}`, 128, 128, (p) => fxBubble(p, 0.55 - 0.15 * n), [O[0] + x + 0.62 * d + 0.03 * Math.sin(b * 6 + n), y + 0.05 + 0.7 * b, z + 0.01], 0.09, 0.09));
  if ((id === 10 && alpha > 0.5) || (id === 12 && f > BEAT.add)) { const ph = (VF / 50) % 1; fx(out, `bubbles|${q(ph, 24)}`, 128, 256, (p) => fxBubbles(p, ph), [O[0] + x + d * 0.7, y + 0.4, z + 0.01], 0.26, 0.52, { soft: true }); }
};
/** the loop shot (fix r2 ADD, the running prop's callback): the little orange fish swims across the opened water on "fake."
 *  and flicks its tail before the gold closes over it (gone long before the last frame); a gull's shadow slides across the
 *  roof plates as the water opens */
const loopExtras = (out: Stage, f: number) => {
  const open = smooth((f - BEAT.fake) / 16) * (1 - smooth((f - BEAT.trust) / 24));
  if (open > 0.05) {
    const u = clamp01((f - (BEAT.fake + 8)) / 30), flick = gest2(f, BEAT.trust - 8, 3, BEAT.trust - 2, 3), a = clamp01(open * 1.6 - 0.4);
    const C = TK.reflect, tail = Math.sin((VF * TAU * 3) / 30) + 1.2 * flick;
    fx(out, `lfish|${q(tail, 6)}|${q(a, 10)}`, 512, 320, (p) => drawFish(p, tail * 0.9, false, 0.5 * tail, 1, 0, 0, 0, a),
      [C[0] - 0.14 + 0.26 * u, TK.hatch.oil + 0.006, C[2] + 0.02 * Math.sin(u * 5)], 0.17, 0.106, { flat: true, rot: 0.12 * Math.sin(u * 5) });
  }
  const g = clamp01((f - (BEAT.fake + 6)) / 36);
  if (g > 0 && g < 1) {
    const wing = 0.5 + 0.5 * Math.sin(f * 0.5);
    out.fx.push({ key: `blob|gullsh|${q(wing, 6)}`, cw: 256, ch: 128, draw: (p) => fxGullShadow(p, "#8a7aa8", wing), x: lerp(-2.2, 2.6, g), y: TK.tank.h + 0.006, z: lerp(3.6, 6.9, g),
      w: 1.0, h: 0.5, flat: true, rot: -0.55 });
  }
};

// ---------------- the kitchen ----------------
/** shot 11 (fix r2, A2 P3): the shake on "Ever": the hand reaches in over 16 f (a 3 f lift before the grip, a 2 f squash
 *  on it), shakes the bottle by its NECK with THREE vertical pump strokes (8 f each, +-0.03 m) and a 0.26 rad rock, lets
 *  go with a 3 f overshoot and leaves over 18 f (a 3 f settle). sets_int.ts moves the bottle with the same offsets
 *  (bottleShake: x += dx, y += dy, rotation.z = rot about the base); shakeMix(f) = how cloudy it should be (one third per
 *  stroke). AUDIO: the shake runs from BEAT.ever to BEAT.ever + 24 */
export const bottleShake = (f: number): { dx: number; dy: number; rot: number } => {
  const t = f - BEAT.ever, env = t < 0 || t > 24 ? 0 : Math.min(1, t / 3, (24 - t) / 4);
  const rk = env * 0.26 * Math.sin((TAU * t) / 8);
  return { dx: 0.006 * env * Math.sin((TAU * t) / 4), dy: 0.03 * env * (0.5 + 0.5 * Math.sin((TAU * t) / 8 - Math.PI / 2)), rot: rk };
};
/** the cloudiness the shake has worked up (0 clear .. 1 fully mixed): about 35 / 70 / 100 % after the three strokes */
export const shakeMix = (f: number) => { const t = f - BEAT.ever; return t < 0 ? 0 : Math.min(1, 0.35 * smooth(t / 8) + 0.35 * smooth((t - 8) / 8) + 0.3 * smooth((t - 16) / 8)); };
const kitchen = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  const t = f - BEAT.ever, inn = smooth((t + 22) / 16) * (1 - smooth((t - 29) / 18));
  catOnTable(out, cam, f);
  catPeek(out, f);
  if (inn <= 0.001) return;
  const b = KI.bottle, sh = bottleShake(f), O = KI.base, off = (1 - inn) * 0.32, neck = 0.305;
  const lift = t >= -6 && t < -2 ? 0.02 * Math.sin((Math.PI * (t + 6)) / 4) : 0, pop = t >= 24 && t < 29 ? 0.025 * Math.sin((Math.PI * (t - 24)) / 5) : 0, sq = t >= -2 && t < 2 ? 1 : 0;
  const settle = t >= 47 && t < 50 ? 0.008 * Math.sin((Math.PI * (t - 47)) / 3) : 0;
  const nx = O[0] + b.c[0] + sh.dx - Math.sin(sh.rot) * neck, ny = O[1] + KI.table.top + 0.005 + sh.dy + Math.cos(sh.rot) * neck;
  const grip: V3 = [nx + off * 0.8, ny + off * 0.6 + lift + pop + settle, O[2] + b.c[2]];
  // the card's grip point is at (430, 640) of 1024: shift the card so that point sits on the neck
  const S = 0.42, c0: V3 = [grip[0] + ((512 - 430) / 1024) * S, grip[1] + ((640 - 512) / 1024) * S, grip[2]];
  fx(out, `shake|${q(sh.rot, 20)}|${sq}`, 1024, 1024, (p) => drawShakeHand(p, sh.rot * 5, sq), toward(c0, vec(cam.pos), 0.07), S, S, { rot: -sh.rot });
};
/** a small tabby cat sitting on the table edge, watching the bottle: its head follows the hand as it reaches in, eyes WIDE
 *  on "Ever", a paw lifts to bat at the bottle on the shake, the tail curls into a question mark on "out?", a slow
 *  deadpan blink later; tail swishing (life) */
const catOnTable = (out: Stage, cam: CamInfo, f: number) => {
  const P: V3 = add(KI.base, [KI.bottle.c[0] + 0.17, KI.table.top, KI.bottle.c[2] - 0.32]);
  const reachIn = f >= BEAT.ever - 24 && f < BEAT.ever - 2, shake = f >= BEAT.ever - 2 && f < BEAT.ever + 30, wide = f >= BEAT.ever - 2 && f < BEAT.ever + 40;
  const outQ = PW(20, "out?"), bat = gest2(f, BEAT.ever + 4, 6, BEAT.ever + 18, 8), curl = gest2(f, outQ - 4, 10, outQ + 26, 12);
  const bl = f >= BEAT.top + 2 && f < BEAT.top + 14 ? 3 : f >= BEAT.top - 2 && f < BEAT.top + 20 ? 2 : -1;
  const follow = reachIn ? smooth((f - (BEAT.ever - 24)) / 10) : 0;
  const st: CatSt = { tilt: shake ? 8 * Math.sin((f - BEAT.ever) * 0.5) : -8 * follow + 4 * Math.sin(VF * 0.05) + (f > BEAT.theOilRises ? 6 : 0), eye: bl >= 0 ? bl : wide ? 1 : blinkAt(VF, 88) > 0.5 ? 3 : 0,
    tail: Math.sin(VF * 0.12), look: follow > 0.3 ? 0.8 : -0.8, ear: shake ? 1 : 0, paw: bat, curl };
  out.places.push({ key: `CAT|${fkey(st)}|LX${LX}`, x: P[0], y: P[1], z: P[2], scale: 0.2, size: [1080, 1800, 1.8], draw: (p) => drawCat(p, st, light2D(cam)) });
  blob(out, P[0], P[1] + 0.001, P[2], 0.2, 0.8, false);
};
/** fix r2 (A2 P2): in the bottle CU the cat's head and one paw POP in at the right frame edge (2 f, a reference
 *  convention) above the caption band, eyes on the bottle top; a slow deadpan half-lid blink on "top." and one ear flick
 *  (a screen-anchored lit card, so the CU push keeps it in place) */
const catPeek = (out: Stage, f: number) => {
  const t0 = BEAT.top - 13; if (f < t0) return;
  const B = camB(11, f), d = 0.72, inX = 1.02 - 0.16 * clamp01((f - t0) / 2), sx = (inX - 0.5) * 2, sy = (0.33 - 0.5) * 2;
  const head: V3 = [0, 1, 2].map((k) => B.pos[k] + B.F[k] * d + B.R[k] * (sx * d * B.t * 0.5625) + B.U[k] * (-sy * d * B.t)) as V3;
  const sc = 0.12, P: V3 = [head[0], head[1] - (975 - 545) * SU * sc, head[2]];
  const bl = f >= BEAT.top && f < BEAT.top + 12 ? (f < BEAT.top + 2 || f >= BEAT.top + 10 ? 2 : 3) : -1, flick = f >= BEAT.top + 11 && f < BEAT.top + 15 ? 1 : 0;
  const st: CatSt = { tilt: -6 + 2 * Math.sin(VF * 0.07), eye: bl >= 0 ? bl : 2, tail: 0, look: -1, ear: flick, peek: true };
  out.places.push({ key: `CATP|${fkey(st)}|LX${LX}`, x: P[0], y: P[1], z: P[2], scale: sc, size: [1080, 1800, 1.8], draw: (p) => drawCat(p, st, DEF_L) });
};
const DEF_L = (-120 * Math.PI) / 180;

// ---------------- the pump room ----------------
/** the valve-wheel pull frames (sound: valves_13): worker 0 on the first and third squeak, worker 1 on the second */
const PULLS13: number[][] = [[BEAT.pumped - 27, BEAT.pumped - 12, BEAT.pumped + 3, BEAT.again1 - 50, BEAT.again1 - 35, BEAT.again1 - 20],
  [BEAT.tankTo, BEAT.tankTo + 15, BEAT.tankTo + 30, BEAT.again2 + 6, BEAT.again2 + 21]];
/** a worker's valve wheel angle (rad) at frame f: 30 degrees per hand-over-hand pull (10 f each); sets_int.ts spins the
 *  wheel with it (LEAD: valveAngle) */
export const valveAngle = (k: number, f: number) => { let a = 0; for (const c of PULLS13[k]) a += (Math.PI / 6) * smooth((f - c) / 10); return a * (k ? -1 : 1); };
/** fix r2 (A2 P2): the C-wheel worker stands on the LEFT of his wheel (local anchor; LEAD: PR.workers[1]), so he is in the
 *  follow but never in the blob medium at tank C (no cap mass in the corner / caption band); the off-duty yawner moved in
 *  so his whole head is in frame A */
const WORKERS13: V3[] = [PR.workers[0], PR.workers[1]], YAWNER: V3 = [-4.3, 0, -2.75];
/** shot 13 (fix r2): two workers heave their red valve wheels HAND OVER HAND (both mittens on the rim at 10 and 2 o'clock,
 *  riding the wheel 30 deg per pull, then re-gripping one hand after the other; a 2 f lean-back anticipation, a 3-5 deg
 *  heave and a cap bob per pull, synced to the squeaks); a third, off duty, yawns over a steaming thermos; moths circle
 *  the work lamps; the oil blob (1.8x, a contact shadow, gold drip prints) rides the pipe A -> B -> C: arms up at A, a
 *  bow at B, a tired thumbs-up at C that droops; on "hardest-working" it PANTS (a 3 Hz squash, cheeks puffing, the mouth
 *  huffing open / tired smirk every 6 f, arms limp, a wobble) while the sweat drop slides down its temple; on "oil" the
 *  brow wipe (a 3 f dip, a 24 f arc ABOVE the brows with the eyes squeezed shut, flecks flung off), a proud ^^ puff, then
 *  the sigh to the cut */
const pumproom = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  const O = PR.base, c = vec(cam.pos);
  WORKERS13.forEach((p0, k) => {
    const A = WORKER(k), L = life(VF, A.i), P = add(O, p0), yaw = yawFrom(c, P), th = valveAngle(k, f), v = PR.valves[k], s = k ? -1 : 1;
    let pull = 0, ant = 0, th0 = th, since = 99;
    for (const c0 of PULLS13[k]) { const t = f - c0; if (t >= -2 && t < 0) ant = Math.sin((Math.PI / 2) * ((t + 2) / 2)); if (t >= 0 && t < 12) pull = Math.sin(Math.PI * clamp01(t / 12)); if (t >= 0) { th0 = valveAngle(k, c0 - 0.5); since = t; } }
    // the grips ride the wheel through a pull (th - th0), then re-grip back to 10 / 2 o'clock over 8 f (one hand, then the other)
    const ride = since < 10 ? th - th0 : (th - th0) * (1 - smooth((since - 10) / 6)), ride2 = since < 13 ? th - th0 : (th - th0) * (1 - smooth((since - 13) / 6));
    const wc: V3 = [O[0] + v[0], v[1] + 0.42, O[2] + v[2] - 0.1], rim = (a: number): P2 => toCard(c, P, yaw, 1, [wc[0] + 0.22 * Math.cos(a), wc[1] + 0.22 * Math.sin(a), wc[2]]);
    const h1 = rim((5 * Math.PI) / 6 + ride), h2 = rim(Math.PI / 6 + ride2);
    put(out, cam, A, P, { breath: L.breath, view: "back", facing: (k ? -1 : 1) as -1 | 1, tilt: L.sway * 0.5 + s * (4 * pull - 2 * ant), crouch: (k ? 0.26 : 0.06) + 0.07 * pull - 0.03 * ant,
      headTilt: L.head * 0.5 - s * 3 * pull, nod: 0.3 * pull, shift: L.shift,
      // (seen from behind: a mitten that lands inside his head's silhouette is hidden by it, as a hand on a wheel in front of
      // him would be; the other shows beside his cap, gripping the rim)
      hands: [{ a: h1, front: false, shape: "mitten", sz: 0.18, ang: -s * 20 }, { a: h2, front: false, shape: "mitten", sz: 0.18, ang: s * 20 }] }, { yaw });
  });
  // the off-duty worker: yawning over his thermos cup (a 40 f yawn every ~4 s), head nodding, steam off the cup
  { const A = WORKER(2), L = life(VF, A.i), yt = VF % 120, yawn = yt < 40 ? Math.sin((Math.PI * yt) / 40) : 0;
    put(out, cam, A, add(O, YAWNER), { breath: L.breath + 1.5 * yawn, tilt: L.sway, headTilt: L.head + 6 * yawn, nod: 0.3 + 0.5 * Math.max(0, Math.sin(VF * 0.05)), facing: 1,
      expr: yawn > 0.3 ? "effort" : "neutral", blink: yawn > 0.3 ? 1 : blinkAt(VF, A.i), hands: [{ a: "chest", dx: 6, dy: -4, hold: "thermos", n: VF }, yawn > 0.3 ? { a: "mouth", dx: 4, shape: "palm", sz: 0.18 } : { a: "hip" }] }); }
  // moths circling the two caged work lamps (tiny warm specks)
  PR.lamps.forEach((l, li) => { for (let n = 0; n < 3; n++) { const a = VF * (0.16 + 0.03 * n) + n * 2.1 + li, r = 0.22 + 0.06 * n;
    fx(out, `glow|moth`, 128, 128, (p) => fxSpot(p, 0.9), [O[0] + l[0] + r * Math.cos(a), l[1] - 0.15 + 0.08 * Math.sin(a * 1.7), O[2] + l[2] + r * Math.sin(a)], 0.05, 0.05, { soft: true }); } });
  // the blob
  const xA = PR.tanks[0][0], xB = PR.tanks[1][0], xC = PR.blobCU[0], [tA, tB, tC] = COUNT_AT, t0 = BEAT.pumped;
  const seg = (f0: number, f1: number) => clamp01((f - f0) / (f1 - f0));
  const x = f < t0 ? xA - 0.8 : f < tA ? lerp(xA - 0.8, xA, smooth(seg(t0, tA))) : f < tB ? lerp(xA, xB, smooth(seg(tA + 4, tB))) : f < tC ? lerp(xB, xC, smooth(seg(tB + 4, tC))) : xC;
  const moving = (f >= t0 && f < tA) || (f >= tA + 4 && f < tB) || (f >= tB + 4 && f < tC);
  const arrIdx = f >= tC ? 2 : f >= tB ? 1 : f >= tA ? 0 : -1, arrF = [tA, tB, tC][Math.max(0, arrIdx)];
  const cheer = arrIdx >= 0 ? gest2(f, arrF, 5, arrF + (arrIdx === 2 ? 26 : 12), 8) : 0, huff = arrIdx >= 0 ? clamp01((f - arrF - 4) / 14) : 0;
  const droop = arrIdx === 2 ? smooth((f - (tC + 12)) / 10) : 0;
  const oilW = PW(27, "oil"), pantOn = f >= BEAT.hardestW - 2 && f < oilW, wipeRaw = clamp01((f - oilW) / 24), wipe = wipeRaw > 0 && wipeRaw < 1 ? smooth(wipeRaw) : 0;
  const dipW = f >= oilW - 3 && f < oilW ? Math.sin((Math.PI * (f - oilW + 3)) / 3) : 0;
  const puff = gest2(f, oilW + 25, 6, oilW + 36, 6), sighAt = oilW + 40, sigh = smooth((f - sighAt) / 6), tired = f >= tC + 20;
  const mood: BlobSt["mood"] = f >= sighAt ? "sigh" : f >= oilW + 24 && f < sighAt ? "beam" : tired || arrIdx === 2 ? "tired" : cheer > 0.1 ? "proud" : "happy";
  const pantSq = pantOn ? 0.05 * Math.sin((VF * TAU * 3) / 30) : 0;
  const st: BlobSt = { sq: moving ? 0.2 * Math.sin(VF * 0.6) : 0.05 * Math.sin(VF * 0.2) + 0.1 * sigh + pantSq + 0.08 * dipW + (tired && mood === "tired" && !pantOn ? 0.05 * Math.sin(VF * 0.5) : 0),
    lean: moving ? -0.4 : pantOn ? 0.1 * Math.sin(VF * 0.4) : 0.08 * Math.sin(VF * 0.15), look: moving ? 0.6 : 0, lookY: 0,
    blink: (f >= oilW + 30 && f < oilW + 33) || (!tired && blinkAt(VF, 60) > 0.5), mood, sweat: f >= BEAT.hardestW - 2 && f < oilW + 24 ? 1 : f >= oilW + 24 ? 0.6 * smooth((f - oilW - 40) / 10) : 0, wipe, cheer: pantOn || wipe > 0 ? 0 : cheer,
    pant: 0.5 + 0.5 * Math.sin(VF * 0.5), pose: arrIdx < 0 ? 0 : arrIdx, huff: arrIdx >= 0 && huff < 1 && !pantOn ? huff : 0,
    sweatY: clamp01((f - (BEAT.hardestW - 2)) / 20), huffOpen: pantOn ? Math.floor((f - BEAT.hardestW + 2) / 6) % 2 === 0 : undefined,
    cheek: pantOn ? 0.5 + 0.5 * Math.sin((VF * TAU * 1.5) / 30) : 0, droop };
  // 1.8x (it reads at phone size in the wide and the follow; CAM's medium at tank C frames it)
  const S = 0.42 * 1.8 * (1 + 0.06 * puff - 0.04 * sigh), hop = (moving ? 0.03 * Math.abs(Math.sin(VF * 0.3)) : 0) + 0.08 * Math.sin(Math.PI * clamp01(cheer)) * (arrIdx === 1 ? 0 : 1) * (pantOn ? 0 : 1);
  const bp: V3 = [O[0] + x, PR.blobY + 0.418 * S + hop, O[2] + PR.pipe.z + 0.2];
  fx(out, `oilblob|${fkey(st)}`, 512, 512, (p) => drawBlob(p, st), bp, S, S);
  out.fx.push({ key: "blob|contact|#6a5a7a", cw: 128, ch: 128, draw: (p) => fxContact(p, "#6a5a7a"), x: bp[0], y: PR.blobY + 0.006, z: bp[2] - 0.02, w: 0.62 * S, h: 0.2 * S, flat: true, rot: Math.atan2(-CAMR.z, CAMR.x) });
  // gold drip prints left on the pipe behind it (a little trail at each tank it has passed)
  for (const [px, at] of [[xA - 0.4, t0 + 8], [xA - 0.15, t0 + 14], [(xA + xB) / 2 - 0.25, (tA + tB) / 2 - 4], [(xA + xB) / 2, (tA + tB) / 2], [(xB + xC) / 2 - 0.25, (tB + tC) / 2 - 4], [(xB + xC) / 2, (tB + tC) / 2]] as [number, number][])
    if (f >= at && x > px + 0.1) fx(out, "drip|p", 128, 64, (p) => fxDrip(p), [O[0] + px, PR.blobY + 0.008, O[2] + PR.pipe.z + 0.2], 0.16, 0.08, { flat: true });
};

// ---------------- the street ----------------
/** shot 14 (fix r2, A2 P3): the reader stands further right by the kiosk (>= 40 px from the woman, air above his hat under
 *  the CLOSED card): eyebrows up on "came out", GOGGLE eyes on "crashed" (his fedora pops ~55 px over 6 f and settles with
 *  an overshoot), then his newspaper droops in his hands; the woman stops under the SHARES board and clutches her
 *  handbag on "shares"; the comic button: a man with a briefcase hurrying along the facade stops dead after "crashed",
 *  looks up at the falling arrows, turns round (16 f) and hurries back the way he came */
const READER: V3 = [1.55, 0, -2.45], WOMAN_TO: V3 = [0.7, 0, -3.9];
const hatPop = (t: number) => (t < 0 ? 0 : t < 6 ? 100 * Math.sin((Math.PI / 2) * (t / 6)) : t < 12 ? 100 - 108 * ((t - 6) / 6) ** 2 : t < 16 ? -8 + 8 * smooth((t - 12) / 4) : 0);
const street = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  const O = ST.base, s = SHOTS[13];
  { const A = WALKER(0), L = life(VF, A.i), keys: [number, Expr][] = [[0, "read"], [BEAT.cameOut + 4, "browsUp"], [BEAT.crashed2 - 1, "goggle"]];
    const droop = smooth((f - (BEAT.crashed2 + 10)) / 12);
    put(out, cam, A, add(O, READER), { breath: L.breath, tilt: L.sway, headTilt: L.head, shift: L.shift, facing: -1, expr: exprAt(f, keys), lookY: f >= BEAT.crashed2 - 1 ? 0 : 1, look: f >= BEAT.crashed2 - 1 ? 0 : -0.4,
      blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), crouch: -0.12 * gest2(f, BEAT.crashed2 - 1, 4, BEAT.crashed2 + 10, 10), wind: 0.3 * windAt(VF, A.i), hatLift: hatPop(f - (BEAT.crashed2 - 1)),
      hands: [{ a: "chest", dx: -10, dy: -14 + 16 * droop, hold: "newspaper", ang: 28 * droop }, { a: "chest", dx: 14, dy: -12 + 18 * droop }] }); }
  { const A = WALKER(1), L = life(VF, A.i), u = smooth((f - s.a + 6) / 52), p: V3 = lerp3([2.8, 0, -5.0], WOMAN_TO, u), walking = u > 0.02 && u < 0.98;
    const keys: [number, Expr][] = [[0, "calm"], [BEAT.shares - 2, "gasp"], [BEAT.crashed2 + 12, "worry"]];
    put(out, cam, A, add(O, p), { breath: L.breath, tilt: L.sway, headTilt: L.head, mode: walking ? "walk" : "stand", phase: (f - s.a) / 13, facing: -1, view: "front",
      expr: exprAt(f, keys), look: walking ? -1 : -0.3, lookY: walking ? 0 : -1.1, blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)), wind: 0.3 * windAt(VF, A.i), flutter: 0.3 * flutAt(VF, A.i),
      crouch: -0.1 * gest2(f, BEAT.shares - 2, 4, BEAT.shares + 8, 8), hands: [{ a: "hang" }, f >= BEAT.shares - 2 ? { a: "chest", dx: 2, dy: -6, hold: "handbag" } : { a: "chest", dy: 10, hold: "handbag" }] }); }
  { // the briefcase man: hurries left along the facade, stops dead (crashed2 + 6), looks up at the arrows, turns round
    // (16 f: 3/4 -> front -> 3/4 the other way) and hurries back to the right
    const A = WALKER(2), L = life(VF, A.i), tA = BEAT.cameOut + 4, tStop = BEAT.crashed2 + 6, tTurn = tStop + 10, tBack = tTurn + 16;
    const goU = smooth(clamp01((f - tA) / (tStop - tA))), backU = clamp01((f - tBack) / 40), x = lerp(4.4, 1.95, goU) + 1.6 * backU * backU;
    const walking = (f >= tA && f < tStop - 2) || f >= tBack, turnU = clamp01((f - tTurn) / 16), lookUp = f >= tStop && f < tTurn + 6;
    const facing = (f < tTurn ? -1 : turnU < 0.35 ? -1 : turnU < 0.7 ? 0 : 1) as -1 | 0 | 1;
    const keys: [number, Expr][] = [[0, "focus"], [tStop - 1, "browsUp"], [tTurn + 4, "worry"]];
    if (f >= tA) put(out, cam, A, add(O, [x, 0, -5.15]), { breath: L.breath, mode: walking ? "walk" : "stand", phase: (f - tA) / 10, lift: 1.2, facing, expr: exprAt(f, keys),
      look: lookUp ? 0.2 : facing * 0.8, lookY: lookUp ? -1.5 : 0, face: lookUp ? { fdy: -3 } : undefined, blink: Math.max(blinkAt(VF, A.i), swapLid(f, keys)),
      wind: 0.3 * windAt(VF, A.i), tilt: walking ? -4 * (facing || 1) : 0, crouch: -0.08 * gest2(f, tStop - 2, 3, tStop + 4, 6),
      hands: [{ a: "hang", hold: "briefcase" }, lookUp ? { a: "hang", b: "head", k: smooth((f - tStop) / 6), shape: "palm", sz: 0.2 } : { a: "hang" }] });
  }
};

// ---------------- the office ----------------
/** shot 15 (fix r2, A2 P1/P2): the young investor at his desk: reads (eyes on the paper), a small smile + writes BUY on
 *  "bought", a smug half-lid + one soft nod on "cheap" (held 18 f); pushes his glasses up on "He bet" (12 f up from below,
 *  the arm under the eye line, a 1 f glint) and a smirk; on "trusted" a THUMB jerked back over his shoulder at the window
 *  (14 f up, held) with the knowing look to us; leans back a touch on "brand"; on "His name?" a smirk to us; on "Warren"
 *  the quiet, knowing win, the chin lifts on "Buffett." and he taps the BUY slip once. A pencil tap idles on the desk.
 *  Across the street (the cafe layer, the rack sharpens it on "trusted"): in the clear right pane a customer HANDS A PLAIN
 *  CARD to the waiter ON "trusted" (a 14 f reach, a glint), the waiter takes it with a nod and a smile; on the left a
 *  woman sips, a man laughs (the idle loops run after the hand-off) */
const office = (out: Stage, cam: CamInfo, _id: number, f: number) => {
  const O = OF.base, P = add(O, OF.investor), c = vec(cam.pos), yaw = yawFrom(c, P), i = INVESTOR.i, L = life(VF, i);
  const keys: [number, Expr][] = [[0, "read"], [BEAT.bought - 2, "smile"], [BEAT.cheap - 1, "smug"], [BEAT.heBet + 2, "dotSmirk"], [BEAT.trusted - 4, "knowing"], [BEAT.hisName - 2, "smirk"], [BEAT.warren - 2, "warm"]];
  const back = smooth((f - BEAT.heBet) / 20), thumb = gest2(f, BEAT.trusted - 4, 14, BEAT.trusted + 26, 14), lb = gest2(f, BEAT.brand - 2, 10, BEAT.hisName, 12);
  const chin = gest(f, BEAT.buffett - 2, 12), nod = f >= PWE(32, "Buffett") ? 0.4 * Math.max(0, Math.sin(((f - PWE(32, "Buffett")) * Math.PI) / 14)) : 0;
  const glasses = gest2(f, BEAT.heBet - 4, 12, BEAT.heBet + 14, 12), cheapNod = 0.6 * gest2(f, BEAT.cheap, 6, BEAT.cheap + 10, 8);
  const ex = exprAt(f, keys);
  const o: PersonOpts = { breath: L.breath, tilt: 0.6 * L.sway - 3 * back - 3 * lb + 3 * thumb, headTilt: L.head + 4 * chin - 3 * thumb, mode: "chair", expr: ex,
    blink: Math.max(blinkAt(VF, i), swapLid(f, keys)), look: thumb > 0.4 ? -0.5 : 0, lookY: f < BEAT.heBet ? 1.2 : 0,
    nod: cheapNod + nod - 0.5 * chin, facing: 0, face: { fdy: -3 * chin, glint: (f >= BEAT.warren && f < BEAT.warren + 16 ? 1 - (f - BEAT.warren) / 16 : 0) + (glasses > 0.92 && glasses < 1.06 ? 1 : 0), glassDy: 2 * glasses },
    hands: [{ a: "lap", hide: true }, { a: "lap", hide: true }] };
  const W = (p: V3, dy: number): V3 => [O[0] + p[0], O[1] + p[1] + dy, O[2] + p[2]];
  const pap = OF.paper, write = gest2(f, BEAT.bought - 10, 8, BEAT.cheap + 4, 12), sc = f >= BEAT.bought - 2 && f < BEAT.cheap ? 1 : 0;
  const scrib: V3 = [0.035 * Math.sin(f * 1.3) * sc, 0, 0.012 * Math.cos(f * 2.1) * sc], tap = (VF % 40) < 6 ? 0.025 * Math.sin((Math.PI * (VF % 40)) / 6) : 0;
  const rest = (dx: number): V3 => W([pap[0] + dx, pap[1], pap[2] - 0.08], 0.06 - 0.03 * back);
  const restL = lerp3(rest(0.05), W([pap[0] - 0.32, pap[1], pap[2] - 0.32], 0.05), back);
  if (thumb > 0.02) { // the thumb over his shoulder (the body card's own arm, from where the reach arm rested)
    o.hands![0] = { a: toCard(c, P, yaw, 1, restL), b: "raise", k: thumb, dx: -42 * thumb, dy: -12 * thumb, shape: thumb > 0.5 ? "thumb" : "ball", sz: 0.42, front: true, maxLen: 1.3 };
  }
  put(out, cam, INVESTOR, P, o, { noBlob: true, yaw });
  if (thumb <= 0.02) reachArm(out, cam, INVESTOR, P, yaw, o, 0, restL, { ang: -8, bend: 0.7 });
  // the pencil hand: writes, rests (a tap idle), once pushes the glasses up the nose on "He bet" (the hand comes up from
  // BELOW to the bridge: the arm stays under the eye line), and taps the BUY slip once on "Buffett."
  const eyeW = fromCard(P, yaw, 1, handAt(INVESTOR_FIT, { ...o, seed: seedOf(i), hands: [{ a: "lap" }, { a: "eye", dx: -12, dy: 6 }] }, 1));
  const slipTap = gest2(f, BEAT.buffett + 2, 6, BEAT.buffett + 12, 6);
  const desk = lerp3(lerp3(rest(0.2), W([OF.slip[0] + scrib[0], OF.slip[1], OF.slip[2] - 0.02 + scrib[2]], 0.075), write), W([0.42, 0.77, -1.0], 0.06 + tap), back * (1 - write));
  const deskT = lerp3(desk, W([OF.slip[0], OF.slip[1], OF.slip[2] - 0.02], 0.03), slipTap);
  const below = toward(lerp3(eyeW, [eyeW[0], eyeW[1] - 0.16, eyeW[2]], 1 - smooth(glasses)), c, 0.12);
  reachArm(out, cam, INVESTOR, P, yaw, o, 1, lerp3(deskT, below, Math.min(1, glasses)), { hold: glasses > 0.5 ? null : "pencil", ang: 30 + 10 * sc * Math.sin(f * 1.3), bend: 0.7 });
  // the cafe across the street, on the painted cafe layer (z -5.27): the hand-off pair in the clear right pane, keyed to
  // "trusted"; the sipper + the laugher in the left pane (their idle loops), 0.58 scale (~290 px tall)
  const z = O[2] - 5.27, floor = 1.0, sc2 = 0.58, tr = BEAT.trusted;
  const reach = gest2(f, tr - 4, 14, tr + 16, 12), take = gest2(f, tr + 12, 6, tr + 24, 10), took = f >= tr + 14;
  const after = f >= tr + 40, sip = after ? gest2((VF % 96), 30, 14, 62, 14) : 0, laugh = after && (VF % 150) < 30 ? Math.abs(Math.sin(((VF % 150) * Math.PI) / 7.5)) : 0;
  const tkeys: [number, Expr][] = [[0, "calm"], [tr + 12, "smile"]];
  const people: [number, number, PersonOpts][] = [
    [1.18, 0, { expr: exprAt(f, tkeys), facing: -1, nod: 0.6 * take, blink: swapLid(f, tkeys), hands: [{ a: "chest", b: "show", k: take, dx: -12, hold: took && take > 0.3 ? "card" : null, n: 2.4 }, { a: "hip" }] }],
    [0.74, 1, { expr: reach > 0.4 ? "proud" : "content", facing: 1, hands: [{ a: "hang" }, { a: "chest", b: "show", k: reach, dx: 12, hold: !took && reach > 0.15 ? "card" : null, n: 2.4 }] }],
    [-1.5, 3, { expr: sip > 0.5 ? "content" : "smile", facing: 1, hands: [{ a: "hang" }, { a: "chest", b: "mouth", k: sip, hold: "cup", n: VF }] }],
    [-1.1, 2, { expr: laugh > 0.2 ? "laugh" : "calm", facing: -1, nod: 0.6 * laugh, lookY: laugh > 0.2 ? 0 : 1, hands: [{ a: "chest", dx: -8, hold: "newspaper" }, { a: "chest", dx: 10 }] }],
  ];
  for (const [dx, v, po] of people) {
    const A = CAFE(v), Lc = life(VF, A.i);
    put(out, cam, A, [O[0] + dx, floor, z], { ...po, breath: Lc.breath, tilt: Lc.sway, headTilt: Lc.head, blink: Math.max(po.blink ?? 0, blinkAt(VF, A.i)) }, { scale: sc2, noBlob: true });
  }
  // the card's glint as it is held out (6-8 f)
  const gk = f >= tr + 8 && f < tr + 15 ? Math.sin((Math.PI * (f - tr - 8)) / 7) : 0;
  if (gk > 0.02) { const cp = CAFE(1), po = people[1][2], hd = handAt(cp.o, { ...po, seed: seedOf(cp.i) }, 1), at: V3 = [O[0] + 0.74, floor, z];
    const hw = fromCard(at, yawFrom(c, at), sc2, [hd[0] + 18, hd[1] - 22]);
    fx(out, `glow|glint|${q(gk, 8)}`, 128, 128, (p) => fxGlint(p, gk), toward(hw, c, 0.05), 0.16, 0.16, { soft: true }); }
};

/** keep the shout line the ONLY lip-flap line (a guard the audit can test against) */
export const talkGuard = (f: number) => f >= FLAP0 && f < BEAT.shoutEnd;

export const stage = (id: number, f: number, cam: CamInfo, L: LightState, vf: number = f): Stage => {
  VF = vf;
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = L.actorShadow ? "golden" : "day";
  EXT = EXTERIOR[s.set];
  // card light mode |LX backlit / lamp duotone / flat diagram / mode (1 morning gold, 2 dusk, 3 backlit sunset, 4 cool diagram)
  LX = `${0}${L.name === "pump_night" ? 1 : 0}${s.set === "cutaway" ? 1 : 0}${({ dawn_gold: 1, late: 1, cutaway: 4, storm: 5 } as Record<string, number>)[L.name] ?? 0}`;
  CAMR.copy(cam.right).setY(0).normalize();
  if (cam.sun) SUN.copy(cam.sun).normalize();
  switch (s.set) {
    case "tanktop": tanktop(out, cam, id, f); break;
    case "tankfarm": tankfarm(out, cam, id, f); break;
    case "bank": bank(out, cam, id, f); break;
    case "trading": trading(out, cam, id, f); break;
    case "cutaway": cutaway(out, cam, id, f); break;
    case "pumproom": pumproom(out, cam, id, f); break;
    case "street": street(out, cam, id, f); break;
    case "office": office(out, cam, id, f); break;
    case "kitchen": kitchen(out, cam, id, f); break;
  }
  return out;
};
export { FPS, clamp01, TOTAL, fxSweat };

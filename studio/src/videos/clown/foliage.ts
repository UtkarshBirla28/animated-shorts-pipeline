// FOLIAGE + AIR (owner LOOK, p3 polish): what turns the smooth green balls into stylised foliage, and the small moving
// things in the air round it.
//  - leaf-CLUSTER CARDS (an inked clump of leaves, 4 clumps in one atlas) laid over an ellipsoid (a canopy lobe, a hedge
//    lobe, a tree crown): each card tilts out of the surface so its leaf tips break the silhouette, takes the lobe's
//    SPHERICAL normal (so the sun side is lit and the far side shaded like one mass) and a vertex tint from sun-lit
//    yellow-green to a cool inner green. One merged mesh per sway group. The cards cast alpha-tested shadows: a dappled,
//    moving leaf-shadow on the ground and a light cookie on every card character that walks under them.
//  - WIND: gustAt(vf, x, z) = slow swells that travel east across the square (long lulls, short gusts); every sway
//    group, twig spray and single leaf scales its sway and adds a fast flutter with it (never one uniform sine).
//  - single leaves that flutter at the canopy's edge; leaves that drop from the tree, tumble, land and rest; ground
//    leaves and petals that stir in the clown's wake (plan.ts clownQ); soft blossom petals that cross near the lens;
//    pollen specks low in the sun; butterflies.
// HARD LIMITS (the quiz): nearBills() rejects, at build time, every card / single leaf whose disc would project onto the
// three bills (their screen box + a margin) through ANY Q1-Q3 camera (story.ts quizCamAt, sampled every 3 f), or would
// shade a bill from the sun; falling leaves are tested along their whole path at their own frames. Everything that can
// rise above the lens stays out of that box; petals near the lens and pollen stay BELOW the lens height (never on sky).
// Loop-safe: whole cycles over LOOP on the video clock of the picture time (so S20's slow motion, E1's replay and E3's
// rewind slow, replay and reverse it); the wake is a pure function of the picture frame.
import * as THREE from "three";
import { SQ, SUN, loopPh, LOOP, clownQ, type V3 } from "./plan";
import { SHOTS, SID } from "./beats";
import { quizCamAt } from "./story";
import type { Cam } from "./camkit";
import { lam, tx, TAU, hash, sm, clamp01, NOINK, type G } from "./setkit";
import { getInputProps } from "remotion";
/** QA: PROPS '{"qa":{"p3":false}}' builds the film WITHOUT the p3 polish layer (render-time A / B; absent = on) */
export const P3_OFF: boolean = (() => { try { return (getInputProps() as { qa?: { p3?: boolean } }).qa?.p3 === false; } catch { return false; } })();

const INKC = "#2a1c34";
const SUNV = new THREE.Vector3(...SUN).normalize();

// ======================================================================================================= painters
/** one inked leaf from its base at (x, y) along `ang`, length s */
const leafShape = (g: G, x: number, y: number, ang: number, s: number, fill: string, hi: string, lw: number) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = fill; g.strokeStyle = INKC; g.lineWidth = lw; g.lineJoin = "round";
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 0.28, -s * 0.42, s * 0.78, -s * 0.36, s, 0); g.bezierCurveTo(s * 0.78, s * 0.36, s * 0.28, s * 0.42, 0, 0); g.closePath(); g.stroke(); g.fill();
  g.fillStyle = hi; g.beginPath(); g.moveTo(s * 0.1, -2); g.bezierCurveTo(s * 0.34, -s * 0.31, s * 0.74, -s * 0.26, s * 0.92, -2); g.closePath(); g.fill();
  g.strokeStyle = "rgba(34,80,42,0.6)"; g.lineWidth = Math.max(1.5, lw * 0.45); g.beginPath(); g.moveTo(3, 0); g.lineTo(s * 0.93, 0); g.stroke();
  g.restore();
};
/** the leaf-clump atlas (1024, 2 x 2 clumps): each a bough end, ~18 leaves fanning up and out of the lower centre, the
 *  back ones deeper green; a mid-green base that the vertex tint pushes to sun-lit or shaded */
export const clumpAtlas = () => { const t = tx("fgClumpAtlas3", 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * 512, oy = Math.floor(q / 2) * 512, cx = ox + 256, cy = oy + 372;
    g.save(); g.beginPath(); g.rect(ox + 4, oy + 4, 504, 504); g.clip();
    g.strokeStyle = "#5a4030"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(cx, oy + 500); g.quadraticCurveTo(cx + 14 * (r() - 0.5), cy + 60, cx, cy); g.stroke();
    const n = 17 + Math.floor(r() * 4);
    const L = Array.from({ length: n }, (_, k) => { const back = k < n * 0.42, a = -Math.PI / 2 + (r() - 0.5) * (back ? 4.6 : 3.4), d = (back ? 20 : 8) + r() * (back ? 110 : 70);
      return { back, a, d, s: (back ? 150 : 132) + r() * 60, j: (r() - 0.5) * 0.5 }; });
    for (const l of L) { const x = cx + Math.cos(l.a) * l.d * 0.75, y = cy + Math.sin(l.a) * l.d * 0.75;
      leafShape(g, x, y, l.a + l.j, l.s, l.back ? ["#558a47", "#4e8042", "#5b924c"][Math.floor(r() * 3)] : ["#78b056", "#84ba5e", "#70a652", "#8ec266"][Math.floor(r() * 4)]   /* audit p2 minor 1: greens ~15 % calmer */,
        l.back ? "rgba(150,206,104,0.3)" : "rgba(222,246,146,0.5)", 6); }
    g.restore();
  }
}, true); t.anisotropy = 8; return t; };
/** the blossom-clump atlas (1024, 2 x 2): clusters of five-petal blossoms on a twig with a few young leaves */
export const blossomAtlas = () => { const t = tx("fgBlossomAtlas", 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * 512, oy = Math.floor(q / 2) * 512, cx = ox + 256, cy = oy + 330;
    g.save(); g.beginPath(); g.rect(ox + 4, oy + 4, 504, 504); g.clip();
    g.strokeStyle = "#5e4238"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(cx, oy + 500); g.quadraticCurveTo(cx + 30 * (r() - 0.5), cy + 60, cx + 20 * (r() - 0.5), cy - 60); g.stroke();
    for (let k = 0; k < 3; k++) leafShape(g, cx + 60 * (r() - 0.5), cy + 90 - 60 * k, -Math.PI / 2 + (k % 2 ? 1 : -1) * (0.7 + 0.5 * r()), 110, "#86c05a", "rgba(226,246,160,0.5)", 5);
    const n = 11 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) { const a = r() * TAU, d = 30 + 150 * Math.sqrt(r()), x = cx + Math.cos(a) * d, y = cy - 20 + Math.sin(a) * d * 0.85, s = 34 + 22 * r(), rot = r() * TAU;
      g.fillStyle = ["#fbe4ea", "#f6cdd8", "#fff3f5", "#f2bccb"][Math.floor(r() * 4)]; g.strokeStyle = "rgba(120,50,80,0.75)"; g.lineWidth = 4;
      for (let p = 0; p < 5; p++) { const pa = rot + (p / 5) * TAU; g.beginPath(); g.ellipse(x + Math.cos(pa) * s * 0.52, y + Math.sin(pa) * s * 0.52, s * 0.5, s * 0.36, pa, 0, TAU); g.stroke(); g.fill(); }
      g.fillStyle = "#e8b04a"; g.beginPath(); g.arc(x, y, s * 0.2, 0, TAU); g.fill(); }
    g.restore();
  }
}, true); t.anisotropy = 8; return t; };
/** a single leaf with a stalk (256 x 128); tone 0 green, 1 yellow-green, 2 ochre (a spent one) */
export const leafOneTex = (tone: number) => tx("fgLeafOne" + tone, 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128);
  g.strokeStyle = "#5a4030"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(10, 64); g.lineTo(50, 64); g.stroke();
  leafShape(g, 44, 64, 0, 196, ["#74b848", "#a8d058", "#d0a040"][tone % 3], "rgba(236,250,170,0.5)", 7);
}, true);
/** small flowers (512, 2 x 2): a daisy, a pink blossom, a white cluster, an orange-centred star; each with a few leaves */
export const flowerAtlas = () => tx("fgFlowerAtlas", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const F: [string, string, number][] = [["#fbf8ee", "#f0c040", 9], ["#f6b8cc", "#fff0c0", 5], ["#ffffff", "#f2d060", 6], ["#f7e9a0", "#e08a3a", 7]];
  for (let q = 0; q < 4; q++) { const cx = (q % 2) * 256 + 128, cy = Math.floor(q / 2) * 256 + 128, [pc, cc, n] = F[q];
    for (let k = 0; k < 3; k++) leafShape(g, cx, cy + 20, 0.6 + k * 1.1 + r() * 0.4, 96, "#5fa244", "rgba(206,240,140,0.45)", 4);
    g.fillStyle = pc; g.strokeStyle = "rgba(70,40,70,0.8)"; g.lineWidth = 4;
    for (let p = 0; p < n; p++) { const a = (p / n) * TAU; g.beginPath(); g.ellipse(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44, 40, n > 6 ? 15 : 24, a, 0, TAU); g.stroke(); g.fill(); }
    g.fillStyle = cc; g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill(); g.stroke(); }
}, true);
/** a tuft of grass blades (256 x 256): a fan of inked blades from the lower centre, two with seed heads */
export const tuftTex = () => tx("fgTuft", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256); g.lineCap = "round"; g.lineJoin = "round";
  for (let k = 0; k < 13; k++) { const a = -Math.PI / 2 + (k - 6) * 0.14 + (r() - 0.5) * 0.1, L = 120 + 100 * r(), bend = (k - 6) * 9, x1 = 128 + Math.cos(a) * L + bend, y1 = 250 + Math.sin(a) * L;
    g.beginPath(); g.moveTo(128 + (k - 6) * 5 - 6, 250); g.quadraticCurveTo(128 + Math.cos(a) * L * 0.5, 250 + Math.sin(a) * L * 0.55, x1, y1); g.quadraticCurveTo(128 + Math.cos(a) * L * 0.5 + 9, 250 + Math.sin(a) * L * 0.5, 128 + (k - 6) * 5 + 6, 250); g.closePath();
    g.fillStyle = ["#6a9c4c", "#7cae56", "#5c8e46", "#8cbc62"][k % 4]; g.strokeStyle = "rgba(42,28,52,0.75)"; g.lineWidth = 3; g.stroke(); g.fill();
    if (k === 3 || k === 9) { g.fillStyle = "#d8c888"; g.beginPath(); g.ellipse(x1, y1, 7, 15, a + Math.PI / 2, 0, TAU); g.fill(); g.stroke(); } }
}, true);
/** a soft out-of-focus petal (128): for the petals that drift across near the lens */
export const softPetalTex = () => tx("fgSoftPetal", 128, 128, (g) => {
  const im = g.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const u = (x - 64) / 58, v = (y - 64) / 36, d = Math.sqrt(u * u + v * v), a = clamp01(1 - d) ** 1.5;
    const i = (y * 128 + x) * 4; im.data[i] = 255; im.data[i + 1] = 226 - 26 * clamp01(d); im.data[i + 2] = 234 - 14 * clamp01(d); im.data[i + 3] = Math.round(255 * a * 0.78); }
  g.putImageData(im, 0, 0);
}, true);
/** a soft sun shaft (u = 0 at the canopy -> 1 near the ground), feathered sides */
export const shaftTex = () => tx("fgShaft", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) { const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2, a = Math.min(1, u * 7) * (1 - u) ** 0.9 * (1 - v ** 2.2) ** 1.5;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a)); }
  g.putImageData(im, 0, 0);
}, true);
/** a butterfly wing (128): rounded, a darker rim, two spots; tinted by the material colour */
export const wingTex = () => tx("fgWing", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128); g.lineJoin = "round";
  g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 7; g.beginPath(); g.moveTo(8, 64); g.bezierCurveTo(20, 4, 110, -4, 120, 44); g.bezierCurveTo(124, 78, 96, 84, 76, 78); g.bezierCurveTo(104, 104, 60, 130, 30, 104); g.bezierCurveTo(16, 92, 10, 80, 8, 64); g.closePath(); g.stroke(); g.fill();
  g.fillStyle = "rgba(42,28,52,0.55)"; g.beginPath(); g.arc(88, 38, 10, 0, TAU); g.fill(); g.beginPath(); g.arc(52, 96, 7, 0, TAU); g.fill();
}, true);

// ======================================================================================================= the wind
/** gust strength 0..1 at video frame vf and world x, z: slow swells that travel east (+x) across the square, long lulls
 *  and short gusts, never dead still. Whole cycles over the loop. */
export const gustAt = (vf: number, x: number, z: number) => {
  const s = 0.5 + 0.5 * Math.sin(loopPh(vf, 9) - 0.2 * x - 0.07 * z), t = 0.5 + 0.5 * Math.sin(loopPh(vf, 23) - 0.37 * x + 0.9);
  return Math.min(1, 0.16 + 0.64 * s * s * s + 0.2 * t);
};

// ======================================================================================================= the quiz guard
type Box = { cam: Cam; x0: number; x1: number; y0: number; y1: number; f: number };
const BILL_PTS: V3[] = SQ.bills.flatMap((b) => { const w = SQ.bill.w / 2 + 0.03, h = SQ.bill.h + 0.03, c = Math.cos(b.yaw), s = Math.sin(b.yaw), p = b.peg;
  return [[p[0] - w * c, p[1] + 0.06, p[2] + w * s], [p[0] + w * c, p[1] + 0.06, p[2] - w * s], [p[0] - w * c, p[1] - h, p[2] + w * s], [p[0] + w * c, p[1] - h, p[2] - w * s]] as V3[]; });
/** screen px (1080 x 1920) + depth of world p through cam c (null = behind) */
const proj = (c: Cam, p: V3): [number, number, number] | null => {
  const F: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], n = Math.hypot(...F), f: V3 = [F[0] / n, F[1] / n, F[2] / n];
  const rh = Math.hypot(f[0], f[2]) || 1, R0: V3 = [-f[2] / rh, 0, f[0] / rh];
  const U0: V3 = [R0[1] * f[2] - R0[2] * f[1], R0[2] * f[0] - R0[0] * f[2], R0[0] * f[1] - R0[1] * f[0]];
  const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]], z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  if (z <= 0.05) return null;
  const t = Math.tan((c.fov * Math.PI) / 360);
  return [540 + (540 * (d[0] * R0[0] + d[2] * R0[2])) / (z * t * 0.5625), 960 - (960 * (d[0] * U0[0] + d[1] * U0[1] + d[2] * U0[2])) / (z * t), z];
};
const boxOf = (f: number): Box | null => {
  const cam = quizCamAt(f); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
  for (const b of BILL_PTS) { const s = proj(cam, b); if (!s) continue; n++; x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]); }
  return n ? { cam, x0, x1, y0, y1, f } : null;
};
let BOXES: Box[] | null = null;
/** the quiz frames (Q1's first frame .. Q3's last) */
export const QUIZ = { a: 0, b: 0 };
const boxes = () => {
  if (!BOXES) { QUIZ.a = SHOTS[SID.Q1 - 1].a; QUIZ.b = SHOTS[SID.Q3 - 1].b; BOXES = [];
    for (let f = QUIZ.a; f <= QUIZ.b; f += 3) { const b = boxOf(f); if (b) BOXES.push(b); } }
  return BOXES;
};
const hits = (b: Box, p: V3, rad: number, margin: number) => {
  const s = proj(b.cam, p); if (!s) return false;
  const pr = (rad * 960) / (s[2] * Math.tan((b.cam.fov * Math.PI) / 360));
  return s[0] + pr > b.x0 - margin && s[0] - pr < b.x1 + margin && s[1] + pr > b.y0 - margin && s[1] - pr < b.y1 + margin && s[0] + pr > -40 && s[0] - pr < 1120 && s[1] + pr > -40;
};
/** would a thing of radius rad (m) at world p sit in front of / behind the bills in ANY quiz frame, or shade a bill? */
export const nearBills = (p: V3, rad: number, margin = 46): boolean => {
  for (const b of boxes()) if (hits(b, p, rad, margin)) return true;
  for (const bill of SQ.bills) { const v = new THREE.Vector3(p[0] - bill.peg[0], p[1] - (bill.peg[1] - SQ.bill.h / 2), p[2] - bill.peg[2]), t = v.dot(SUNV);
    if (t > 0 && v.addScaledVector(SUNV, -t).length() < rad + 0.42) return true; }
  return false;
};
/** the same test at ONE quiz frame (things that move) */
export const nearBillsAt = (p: V3, rad: number, f: number, margin = 46): boolean => { const b = boxOf(f); return !!b && hits(b, p, rad, margin); };

// ======================================================================================================= card meshes
/** a merged mesh of two-sided cards (both windings, ONE shading normal each) with vertex colours */
class CardGeo {
  private p: number[] = []; private n: number[] = []; private u: number[] = []; private c: number[] = []; count = 0;
  add(c: THREE.Vector3, rx: THREE.Vector3, ux: THREE.Vector3, nrm: THREE.Vector3, uv: [number, number, number, number], col: [number, number, number]) {
    const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c.x + a * rx.x + b * ux.x, c.y + a * rx.y + b * ux.y, c.z + a * rx.z + b * ux.z]);
    const UV = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (const i of [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]) { this.p.push(...P[i]); this.n.push(nrm.x, nrm.y, nrm.z); this.u.push(...UV[i]); this.c.push(...col); }
    this.count++;
  }
  mesh(mat: THREE.Material, cast: boolean, ink: number) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.userData.ink = ink; return m;
  }
}
export type Atlas = "leaf" | "blossom" | "flower";
const ATLAS: Record<Atlas, () => THREE.Texture> = { leaf: clumpAtlas, blossom: blossomAtlas, flower: flowerAtlas };
/** the card material of an atlas; dark = the calmer copy for the money shots */
export const cardMat = (a: Atlas, dark = false) => lam(`fgCard_${a}_${dark ? "D" : "L"}`, () => ({ map: ATLAS[a](), alphaTest: 0.42, vertexColors: true, side: THREE.FrontSide, ...(dark ? { color: "#93a48e" } : {}) }));
/** leaf tints: 0 = cool inner shade .. 1 = sun-lit yellow-green (linear multipliers on the mid-green atlas) */
const tint = (t: number): [number, number, number] => {
  const u = clamp01(t);
  if (u < 0.5) { const k = u / 0.5; return [0.5 + 0.42 * k, 0.66 + 0.32 * k, 0.6 + 0.26 * k]; }
  const k = (u - 0.5) / 0.5; return [0.92 + 0.34 * k, 0.98 + 0.26 * k, 0.86 - 0.04 * k];
};

export type DressOpt = {
  /** cards asked for (fewer after the guard / hemisphere / underside culls) */ n: number;
  /** card edge (m) min, max */ size: [number, number]; seed: number;
  /** sway groups about the centre (default 2) */ groups?: number; /** sway amplitude (rad, default 0.035) */ amp?: number;
  atlas?: Atlas;
  /** keep only cards whose surface normal . hemi > -0.15 (e.g. the plaza-facing side of a hedge) */ hemi?: V3;
  /** test every card against the bills (default true) */ guard?: boolean;
  ink?: number; cast?: boolean;
  /** where on the radius the cards sit (default 0.84 .. 1.02) */ lift?: [number, number];
  /** tone bias (-0.3 = deeper .. +0.2 = lighter), default 0 */ tone?: number;
  /** white tint (flowers / blossom): no leaf tones */ plain?: boolean;
  /** keep the money-shot dark swap for this group (default true for leaf cards) */ swap?: boolean;
  /** the bills guard's margin (px at 1080, default 46) and the share of the card's edge taken as its radius (default 0.75) */ gm?: number; gr?: number;
  /** cards that only CAST (never drawn): an unseen tree behind the lens that dapples the near ground */ shadowOnly?: boolean;
};
type Bough = { g: THREE.Group; x: number; z: number; ph: number; amp: number; i: number; mesh: THREE.Mesh; atlas: Atlas; swap: boolean };
type Single = { m: THREE.Mesh; base: THREE.Euler; ph: number; x: number; z: number; i: number };

export class Foliage {
  private boughs: Bough[] = [];
  private singles: Single[] = [];
  private dark = false;
  cards = 0; culled = 0;
  constructor(private parent: THREE.Object3D) {}

  /** leaf-cluster cards over the ellipsoid (centre c, radii rad) */
  dress(c: V3, rad: V3, o: DressOpt) {
    if (P3_OFF) return;
    const ng = o.groups ?? 2, geos = Array.from({ length: ng }, () => new CardGeo()), C = new THREE.Vector3(...c), atlas = o.atlas ?? "leaf";
    const hemi = o.hemi ? new THREE.Vector3(...o.hemi).normalize() : null, lift = o.lift ?? [0.84, 1.02];
    for (let i = 0; i < o.n; i++) {
      const h = (k: number) => hash(o.seed * 17.13 + i * 3.71 + k * 11.9);
      const y = 1 - (2 * (i + 0.5)) / o.n, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.39996 + o.seed;
      const n = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      if (hemi && n.dot(hemi) < -0.15) continue;
      if (n.y < -0.45 && h(0) < 0.45) continue;                                    /* thinner underneath */
      const s = (o.size[0] + (o.size[1] - o.size[0]) * h(1)), L = lift[0] + (lift[1] - lift[0]) * h(2);
      const p = new THREE.Vector3(c[0] + n.x * rad[0] * L, c[1] + n.y * rad[1] * L, c[2] + n.z * rad[2] * L);
      if (o.guard !== false && nearBills([p.x, p.y, p.z], s * (o.gr ?? 0.75), o.gm ?? 46)) { this.culled++; continue; }
      /* the card leans out of the surface: its plane normal m is n tipped ~50 deg toward a random tangent; its up axis
       * points as far outward as the plane allows (the clump's stalk at the lobe, its leaf tips beyond the silhouette) */
      const t0 = new THREE.Vector3(h(3) - 0.5, h(4) - 0.5, h(5) - 0.5); t0.addScaledVector(n, -t0.dot(n)).normalize();
      const m = n.clone().addScaledVector(t0, 1.15).normalize(), up = n.clone().addScaledVector(m, -n.dot(m)).normalize(), right = new THREE.Vector3().crossVectors(up, m).normalize();
      const q = Math.floor(h(6) * 4) % 4, fl = h(7) < 0.5, u0 = (q % 2) * 0.5, v0 = 0.5 - Math.floor(q / 2) * 0.5;
      const sun = n.dot(SUNV), tone = 0.5 + 0.5 * sun + 0.22 * n.y + (h(8) - 0.5) * 0.36 + (o.tone ?? 0);
      /* the shading normal: the lobe's own, lifted a little, so the whole mass reads lit on the sun side */
      const sn = n.clone().multiplyScalar(0.85).add(new THREE.Vector3(0, 0.25, 0)).normalize();
      geos[i % ng].add(p.addScaledVector(up, s * 0.26), right.multiplyScalar(s / 2), up.clone().multiplyScalar(s / 2), sn,
        [fl ? u0 + 0.5 : u0, v0, fl ? u0 : u0 + 0.5, v0 + 0.5], o.plain ? [1, 1, 1] : tint(tone));
      this.cards++;
    }
    geos.forEach((gq, k) => {
      if (!gq.count) return;
      const g = new THREE.Group(), inner = new THREE.Group(); g.position.copy(C); inner.position.copy(C).multiplyScalar(-1); g.add(inner); this.parent.add(g);
      const mesh = gq.mesh(o.shadowOnly ? lam("fgCardShadowOnly", () => ({ map: ATLAS[atlas](), alphaTest: 0.42, side: THREE.FrontSide, colorWrite: false, depthWrite: false })) : cardMat(atlas), o.cast !== false, o.shadowOnly ? 0 : o.ink ?? 0.4);
      if (o.shadowOnly) { mesh.receiveShadow = false; mesh.layers.set(NOINK); }
      inner.add(mesh);
      this.boughs.push({ g, x: c[0], z: c[2], ph: hash(o.seed * 3.3 + k * 7.7) * TAU, amp: o.amp ?? 0.035, i: this.boughs.length, mesh, atlas, swap: !o.shadowOnly && (o.swap ?? atlas === "leaf") });
    });
  }
  /** single leaves that flutter on their stalks at points pts (each: position, outward direction) */
  singleLeaves(pts: { p: V3; n: V3 }[], size = 0.26) {
    if (P3_OFF) return;
    pts.forEach(({ p, n }, i) => {
      if (nearBills(p, size)) { this.culled++; return; }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.6, size * 0.8).translate(size * 0.8, 0, 0), lam("fgLeafOne" + (i % 2), () => ({ map: leafOneTex(i % 2), alphaTest: 0.4, side: THREE.DoubleSide })));
      m.position.set(...p); m.rotation.set((hash(i * 4.1) - 0.5) * 1.2, Math.atan2(-n[2], n[0]) + (hash(i * 2.3) - 0.5), Math.asin(Math.max(-0.9, Math.min(0.9, n[1]))) + (hash(i * 6.7) - 0.5) * 0.6, "YXZ");
      m.castShadow = false; m.receiveShadow = true; m.userData.ink = 0.4; this.parent.add(m);
      this.singles.push({ m, base: m.rotation.clone(), ph: hash(i * 9.3) * TAU, x: p[0], z: p[2], i });
    });
  }
  /** the money shots swap the leaf cards to their calmer, darker material (per World: only the mesh's reference moves) */
  swap(dark: boolean) {
    if (dark === this.dark) return; this.dark = dark;
    for (const b of this.boughs) if (b.swap) b.mesh.material = cardMat(b.atlas, dark);
  }
  pose(vf: number) {
    for (const b of this.boughs) {
      const gq = gustAt(vf, b.x, b.z), a = b.amp * (0.4 + 1.25 * gq), i = b.i;
      b.g.rotation.set(a * Math.sin(loopPh(vf, 25 + (i % 5) * 3) + b.ph) + 0.3 * a * gq * Math.sin(loopPh(vf, 113 + (i % 7) * 6) + 2 * b.ph),
        0.7 * a * Math.sin(loopPh(vf, 17 + (i % 4) * 2) + 1.7 * b.ph), a * Math.sin(loopPh(vf, 29 + (i % 6) * 2) + 0.6 * b.ph) + 0.25 * a * gq * Math.sin(loopPh(vf, 127 + (i % 5) * 8) + b.ph));
    }
    for (const s of this.singles) {
      const gq = gustAt(vf, s.x, s.z), a = 0.14 + 0.5 * gq, i = s.i;
      s.m.rotation.set(s.base.x + a * Math.sin(loopPh(vf, 131 + (i % 9) * 7) + s.ph), s.base.y + 0.3 * a * Math.sin(loopPh(vf, 61 + (i % 5) * 5) + 2 * s.ph), s.base.z + 0.6 * a * Math.sin(loopPh(vf, 149 + (i % 7) * 6) + 1.3 * s.ph), "YXZ");
    }
  }
}

// ======================================================================================================= falling leaves
type Faller = { m: THREE.Mesh; s: V3; e: V3; n: number; ph: number; fall: number; rest: number; k: number };
/** leaves that let go of the tree, tumble down on the breeze, land and rest a while, then are gone (each on its own whole
 *  number of cycles over the loop). `starts` = candidate release points [x, y, z]; a candidate whose whole path crosses
 *  the bills' screen box in any quiz frame is dropped. */
export class LeafFall {
  private L: Faller[] = [];
  constructor(parent: THREE.Object3D, starts: V3[], want: number) {
    if (P3_OFF) return;
    boxes();
    for (let i = 0; i < starts.length && this.L.length < want; i++) {
      const s = starts[i], h = (k: number) => hash(i * 5.31 + k * 2.77);
      const n = 4 + (i % 4), per = LOOP / n, fall = (78 + 40 * h(0)) / per, rest = Math.min(0.9, fall + (90 + 120 * h(1)) / per);
      const e: V3 = [s[0] + 0.5 + 1.4 * h(2), 0.03, s[2] - 0.4 - 1.6 * h(3)];
      const F: Faller = { m: null as unknown as THREE.Mesh, s, e, n, ph: h(4), fall, rest, k: i };
      let bad = false;
      for (let f = QUIZ.a; f <= QUIZ.b && !bad; f += 2) { const st = LeafFall.at(F, f); if (st.on && nearBillsAt(st.p, 0.2, f, 60)) bad = true; }
      if (bad) continue;
      F.m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), lam("fgFall" + (i % 3), () => ({ map: leafOneTex(i % 3), alphaTest: 0.4, side: THREE.DoubleSide })));
      F.m.castShadow = true; F.m.receiveShadow = true; F.m.layers.set(NOINK); parent.add(F.m); this.L.push(F);
    }
  }
  /** leaf state at video frame vf: position, rotation (xyz), scale, on */
  static at(F: Faller, vf: number): { p: V3; r: V3; sc: number; on: boolean } {
    const u = ((((F.n * vf) / LOOP + F.ph) % 1) + 1) % 1;
    if (u < F.fall) {
      const t = u / F.fall, d = t ** 1.12, sw = (1 - t) * 0.42, a = t * TAU * 2.2 + F.k;
      return { p: [F.s[0] + (F.e[0] - F.s[0]) * t + sw * Math.sin(a), F.s[1] + (F.e[1] - F.s[1]) * d + 0.05 * Math.sin(a * 2), F.s[2] + (F.e[2] - F.s[2]) * t + sw * 0.6 * Math.cos(a * 0.8)],
        r: [t * TAU * 1.7 + F.k, t * TAU * 0.9 + 2 * F.k, 1.1 * Math.sin(t * TAU * 2.6 + F.k)], sc: sm(t / 0.07), on: true };
    }
    if (u < F.rest) { const t = (u - F.fall) / (F.rest - F.fall), set = Math.exp(-t * 40);
      return { p: [F.e[0], F.e[1] + 0.03 * set, F.e[2]], r: [-Math.PI / 2 + 0.5 * set, F.k * 1.9, 0.3 * set], sc: 1 - sm((t - 0.86) / 0.14), on: true }; }
    return { p: F.e, r: [0, 0, 0], sc: 0, on: false };
  }
  pose(vf: number) { for (const F of this.L) { const s = LeafFall.at(F, vf); F.m.visible = s.on && s.sc > 0.01; if (!F.m.visible) continue; F.m.position.set(...s.p); F.m.rotation.set(s.r[0], s.r[1], s.r[2]); F.m.scale.setScalar(s.sc); } }
}

// ======================================================================================================= the clown's wake
type Stir = { m: THREE.Mesh; p0: V3; t0: number; h: number; side: number; k: number };
/** ground leaves and petals along the clown's quiz route (plan.ts clownQ): each lies still until his wheel passes it
 *  (picture frame t0), then lifts, swirls forward ~0.6 m and settles. A pure function of the picture frame: it replays
 *  in E1, runs backward in E3 and lies exactly as on frame 0 at the loop seam. */
export class Wake {
  private S: Stir[] = [];
  constructor(parent: THREE.Object3D, n = 26) {
    const a = SHOTS[SID.Q1 - 1].a + 4, b = SHOTS[SID.Q3 - 1].b - 12;
    for (let k = 0; k < n; k++) {
      const t0 = a + ((b - a) * (k + hash(k * 3.9))) / n, c = clownQ(t0);
      if (c.v < 0.012) continue;
      const side = (k % 2 ? 1 : -1) * (0.22 + 0.42 * hash(k * 7.1)), hx = Math.sin(c.heading), hz = Math.cos(c.heading);
      const p0: V3 = [c.p[0] + hz * side, 0.022, c.p[2] - hx * side], petal = k % 3 === 0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(petal ? 0.1 : 0.24, petal ? 0.07 : 0.12),
        petal ? lam("fgWakePetal", () => ({ color: "#fbd4e0", side: THREE.DoubleSide })) : lam("fgWake" + (k % 3), () => ({ map: leafOneTex(k % 3), alphaTest: 0.4, side: THREE.DoubleSide })));
      m.receiveShadow = true; m.castShadow = false; m.layers.set(NOINK); parent.add(m);
      this.S.push({ m, p0, t0, h: c.heading, side, k });
    }
  }
  pose(f: number) {
    for (const s of this.S) {
      const e = clamp01((f - s.t0) / 30), hx = Math.sin(s.h), hz = Math.cos(s.h), d = 0.35 + 0.5 * hash(s.k * 2.3), out = Math.sign(s.side) * 0.3;
      const g = 1 - (1 - e) ** 2.2, y = 0.022 + (0.2 + 0.22 * hash(s.k * 5.7)) * Math.sin(Math.PI * e ** 0.75) * (1 - 0.25 * e);
      s.m.position.set(s.p0[0] + (hx * d + hz * out) * g, y, s.p0[2] + (hz * d - hx * out) * g);
      const sp = g * (7 + 5 * hash(s.k)), lift = Math.sin(Math.PI * e);
      s.m.rotation.set(-Math.PI / 2 + 1.3 * lift * Math.sin(sp), s.k * 2.1 + sp, 0.9 * lift * Math.cos(sp * 0.7), "YXZ");
    }
  }
}

// ======================================================================================================= near the lens
/** soft blossom petals that drift across near the lens now and then (in the LOWER half of the frame only: they never
 *  cross the sky or the bills), and pollen specks low in the sun (always below the lens height) */
export class LensAir {
  private petals: THREE.Mesh[] = [];
  private pts: THREE.Points; private N = 64;
  constructor(parent: THREE.Object3D) {
    for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.62), new THREE.MeshBasicMaterial({ map: softPetalTex(), transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0 }));
      m.layers.set(NOINK); m.renderOrder = 9; m.frustumCulled = false; m.visible = false; parent.add(m); this.petals.push(m); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.N * 3), 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softPetalTex(), color: new THREE.Color(1.0, 0.9, 0.62), size: 0.022, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.pts.frustumCulled = false; this.pts.layers.set(NOINK); this.pts.renderOrder = 8; parent.add(this.pts);
  }
  pose(vf: number, cam: THREE.PerspectiveCamera) {
    const R = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), U = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), Fw = new THREE.Vector3(); cam.getWorldDirection(Fw);
    const th = Math.tan((cam.fov * Math.PI) / 360);
    this.petals.forEach((m, k) => {
      /* n crossings per loop, each ~46 f: left -> right on a wavy line through the lower half of the frame */
      const n = 5 + k, per = LOOP / n, u = (((vf / per + hash(k * 3.3)) % 1) + 1) % 1, w = 46 / per, on = u < w;
      m.visible = on; if (!on) return;
      const t = u / w, cyc = Math.floor(vf / per + hash(k * 3.3)), d = 0.8 + 0.5 * hash(k * 5.1 + cyc), hw = d * th * 0.5625, hh = d * th;
      const x = (-1.25 + 2.5 * t) * hw * (hash(k + cyc * 1.7) < 0.5 ? 1 : -1), y = (-0.56 - 0.3 * hash(k * 2.9 + cyc) - 0.08 * t + 0.04 * Math.sin(t * 9 + k)) * hh;   /* the bottom fifth of the frame: over the ground, never across a face or a torso */
      m.position.copy(cam.position).addScaledVector(Fw, d).addScaledVector(R, x).addScaledVector(U, y);
      m.quaternion.copy(cam.quaternion); m.rotateZ(t * 5 + k); const s = 0.055 + 0.03 * hash(k * 7.7); m.scale.set(s * (0.6 + 0.4 * Math.abs(Math.cos(t * 7 + k))), s, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.8 * sm(t / 0.15) * (1 - sm((t - 0.85) / 0.15));
    });
    /* pollen: a 7 m lattice of specks wrapped round the lens (so a moving lens gets parallax), drifting slowly east */
    const a = this.pts.geometry.attributes.position as THREE.BufferAttribute, top = Math.max(0.3, Math.min(1.6, cam.position.y - 0.1));
    for (let i = 0; i < this.N; i++) {
      const bx = hash(i * 1.37) * 7 + 0.9 * Math.sin(loopPh(vf, 3 + (i % 3)) + i), bz = hash(i * 2.91) * 7 + 0.6 * Math.sin(loopPh(vf, 4 + (i % 4)) + 2 * i);
      const wx = cam.position.x + ((((bx - cam.position.x) % 7) + 7) % 7) - 3.5, wz = cam.position.z + ((((bz - cam.position.z) % 7) + 7) % 7) - 3.5;
      a.setXYZ(i, wx, 0.12 + (top - 0.12) * (0.5 + 0.5 * Math.sin(loopPh(vf, 6 + (i % 5)) + i * 1.7)) * hash(i * 4.3), wz);
    }
    a.needsUpdate = true;
  }
}

// ======================================================================================================= butterflies
type Fly = { g: THREE.Group; w: THREE.Object3D[]; c: V3; i: number };
/** butterflies round an anchor (flowers): two hinged wings beating, a wandering figure-of-eight; loop-safe */
export class Butterflies {
  private B: Fly[] = [];
  constructor(parent: THREE.Object3D, anchors: V3[], cols = ["#f6f2e4", "#f0a044", "#a8c8ee"]) {
    anchors.forEach((c, i) => {
      const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ map: wingTex(), color: cols[i % cols.length], transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
      const w = [1, -1].map((sd) => { const piv = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11).translate(0.055, 0, 0), mat); m.scale.x = sd; piv.add(m); g.add(piv); return piv; });
      g.traverse((o) => o.layers.set(NOINK)); parent.add(g); this.B.push({ g, w, c, i });
    });
  }
  pose(vf: number) {
    for (const b of this.B) {
      const i = b.i, a = loopPh(vf, 7 + i * 2) + i * 2.1, a2 = loopPh(vf, 13 + i * 3) + i;
      const x = b.c[0] + 0.7 * Math.sin(a) + 0.25 * Math.sin(a2 * 2), z = b.c[2] + 0.5 * Math.sin(2 * a + 0.6), y = b.c[1] + 0.22 * Math.sin(a2) + 0.06 * Math.sin(loopPh(vf, 90 + i * 7));
      const dx = 0.7 * Math.cos(a) + 0.5 * Math.cos(a2 * 2), dz = Math.cos(2 * a + 0.6);
      b.g.position.set(x, y, z); b.g.rotation.set(-1.1, Math.atan2(dx, dz), 0, "YXZ");
      const flap = 0.15 + 1.05 * Math.abs(Math.sin(loopPh(vf, 300 + i * 23) + i));
      b.w[0].rotation.y = -flap; b.w[1].rotation.y = flap;
    }
  }
}

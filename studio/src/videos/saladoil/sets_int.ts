// INTERIOR SETS of "The Oil Tanks That Were Mostly Water" (owner WORLD-INT, with lights.ts / shade.ts). Six closed
// rooms (no sky leaks: every window opens onto painted view layers behind the wall), built from merged two-tone
// batches with hand-painted canvas textures, plus per-frame parts that are pure functions of (shot, frame):
//  - BANK (BK, shots 3 / 5 / 6): walnut raised-panel office, green carpet, mahogany desk, brass + green banker's lamp,
//    sconces, harbour painting, bookcase, clock, plant, radiator, window with venetian blinds onto a tank farm (a tiny
//    khaki inspector walks up to the far tank on "sent inspectors to check"); the big slanted OIL RECEIPT + the rubber
//    stamp that hops onto it on "money" (APPROVED appears at money + 2); the cash bundles that slide across on
//    "against it"; the three stacks of shot 5 that grow bundle by bundle on "more" x2; the easel flip chart of shot 6
//    (ALL US OIL: a US map + 6 drums | TINO'S OIL: a drum pyramid 3 -> 10 on "more" -> 36 on "United").
//  - TRADING (TR, shot 8): green-grey hall, oak wainscot, the big SOYBEAN OIL chalk board (a chalk line that creeps on,
//    then DIVES on "crashed" + a red arrow), storm windows with running rain, clock, pendant globes, phone desks,
//    ticker machines, slips on the floor, ticker tape that rains down from the crash.
//  - CUTAWAY (CU, shots 10 / 12): a clean diagram: the back half of a tank cut open (red cut edges, concrete section
//    hatch), a HUGE blue water body (caustics, light shafts, bubbles; the front face is see-through so the fish swims
//    INSIDE it) under a THIN gold oil band, a ghosted front half, the pour pipe; shot 12 fills it (water pour, then a
//    thin oil pour that spreads), LOOKS FULL on the roof from "hatch" - 6.
//  - KITCHEN (KI, shot 11): sunny yellow kitchen, checker floor, mint cabinets, gingham, radio, fruit, a salad set; the
//    glass dressing bottle (oil over vinegar) shaken on "Ever" (cloudy), the oil rising again slowly from "The oil
//    always rises" to "top".
//  - PUMP ROOM (PR, shot 13): Saturday night, royal-blue shade + two warm caged work lamps (shade.ts ZONE spots + POOL
//    pools), a jungle of pipes (copper / steel / green, flanges, elbows, red valve wheels that turn, gauges whose needles
//    jitter), glass pipe sections where a gold slug travels under the blob, tanks A / B / C with COUNTED plates that
//    flip "-" -> 1 / 2 / 3 on COUNT_AT, sight glasses, the SATURDAY calendar, a workbench, hard hats, lunch box, thermos.
//  - OFFICE (OF, shot 15): a small warm 1960s office (honey wood, cream walls), the window across the street onto a
//    bright cafe where people hand plain cards to a waiter and a cashier (animated), curtains in a light breeze, the
//    newspaper OIL TANKS FULL OF WATER, the BUY slip written letter by letter from "bought" + 4, coffee steam, desk
//    lamp; warms on "Warren Buffett" (office_glow).
// Per-World hook: a zero-area mesh drawn first in every pass writes THIS World's TONE_X extras + interior pool / zone
// values (POOL slots 0..INT_POOLS-1, ZONE slots 0..1), so a cross-dissolve keeps each layer's own values.
// Idle life runs on the VIDEO clock (ctx.vf) in whole cycles over VOICE_TOTAL; story actions on the picture clock f.
import * as THREE from "three";
import { Batch, lam, quad, V } from "./build";
import { ctex, rng } from "./paint";
import { NOINK } from "./ink";
import { TONE_X, POOL, ZONE_N, untone } from "./shade";
import { BK, TR, CU, KI, PR, OF, V3 } from "./plan";
import { BEAT, COUNT_AT, smooth, clamp01, SHOTS, lightMixAt, FPS, PW } from "./story";
import { VOICE_TOTAL } from "./voicewarp";
import type { SetCtx } from "./ctx";
import { bottleShake, valveAngle, cashSlide, shakeMix, STAMPS5 } from "./cast";

// ======================================================================================================== helpers
type P3 = [number, number, number];
type G = CanvasRenderingContext2D; type R = () => number;
const TAU = Math.PI * 2;
let VF = 0;
/** angular rate per VIDEO frame for a nominal w (rad / s), snapped to whole cycles over the film (loop seam) */
const qw = (w: number) => (TAU * Math.max(1, Math.round((Math.abs(w) / TAU) * (VOICE_TOTAL / FPS))) * Math.sign(w || 1)) / VOICE_TOTAL;
const vs = (w: number, ph = 0) => Math.sin(qw(w) * VF + ph);
const vph = (w: number) => qw(w) * VF;
const vsec = () => VF / FPS;
const hash = (n: number) => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sm = (u: number) => smooth(u);
const outBack = (u: number, s = 1.9) => { const x = clamp01(u) - 1; return 1 + x * x * ((s + 1) * x + s); };
const outCubic = (u: number) => 1 - (1 - clamp01(u)) ** 3;
/** 0 -> 1 -> 0 over [a, b] with smooth ends of length e */
const env = (f: number, a: number, b: number, e: number) => sm((f - a) / e) * (1 - sm((f - (b - e)) / e));
const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 199999) + 1; };
/** a cached canvas texture seeded by its whole key (clamp = no wrap bleed at the edges) */
const tx = (key: string, w: number, h: number, draw: (g: G, r: R) => void, clamp = false) => {
  const t = ctex("si_" + key, w, h, (g) => draw(g, rng(fnv(key))));
  if (clamp && t.wrapS !== THREE.ClampToEdgeWrapping) { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; }
  return t;
};
const _c = new THREE.Color(), _h = { h: 0, s: 0, l: 0 };
/** colour jitter in HSL (lightness +- dv, hue +- dh deg) -> css hex */
const jit = (r: R, hex: string, dv = 0.08, dh = 4) => {
  _c.set(hex).getHSL(_h);
  _c.setHSL((_h.h + ((r() * 2 - 1) * dh) / 360 + 1) % 1, _h.s, Math.max(0, Math.min(0.97, _h.l * (1 + (r() * 2 - 1) * dv))));
  return "#" + _c.getHexString();
};
const shadeHex = (hex: string, dl: number) => { _c.set(hex).getHSL(_h); _c.setHSL(_h.h, _h.s, Math.max(0, Math.min(1, _h.l + dl))); return "#" + _c.getHexString(); };
const rgba = (hex: string, a: number) => { _c.set(hex); return `rgba(${Math.round(_c.r * 255)},${Math.round(_c.g * 255)},${Math.round(_c.b * 255)},${a})`; };
const font = (g: G, px: number, fam = '"Arial Black", Arial, sans-serif', w = "") => { g.font = `${w ? w + " " : ""}${Math.round(px)}px ${fam}`; };
/** centred text that shrinks to fit maxW */
const ctext = (g: G, s: string, x: number, y: number, px: number, col: string, maxW: number, fam?: string, w?: string) => {
  let p = px; font(g, p, fam, w); while (g.measureText(s).width > maxW && p > 8) { p -= 2; font(g, p, fam, w); }
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(s, x, y);
};
const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const speck = (g: G, r: R, w: number, h: number, n: number, cols: string[], s0: number, s1: number, a = 0.2) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + 0.6 * r()); g.fillStyle = cols[i % cols.length]; const s = s0 + r() * (s1 - s0); g.fillRect(r() * w, r() * h, s, s * (0.6 + 0.8 * r())); }
  g.globalAlpha = 1;
};
const mottle = (g: G, r: R, w: number, h: number, n: number, cols: string[], s0: number, s1: number, a = 0.07) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.5 + 0.5 * r()); g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(r() * w, r() * h, s0 + r() * (s1 - s0), 0, TAU); g.fill(); }
  g.globalAlpha = 1;
};
/** wood grain lines across a rect (horizontal = along x) */
const grain = (g: G, r: R, x: number, y: number, w: number, h: number, n: number, col: string, horiz = true, a0 = 0.07, a1 = 0.16) => {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < n; i++) {
    g.strokeStyle = rgba(col, a0 + (a1 - a0) * r()); g.lineWidth = 0.8 + r() * 2.2; g.beginPath();
    if (horiz) { const yy = y + r() * h, d = (r() - 0.5) * h * 0.08; g.moveTo(x, yy); g.bezierCurveTo(x + w * 0.33, yy + d, x + w * 0.66, yy - d, x + w, yy + d * 0.5); }
    else { const xx = x + r() * w, d = (r() - 0.5) * w * 0.08; g.moveTo(xx, y); g.bezierCurveTo(xx + d, y + h * 0.33, xx - d, y + h * 0.66, xx + d * 0.5, y + h); }
    g.stroke();
  }
  g.restore();
};
/** a raised panel: field + bevel (light top / left, dark bottom / right) + a soft inner edge */
const panel = (g: G, r: R, x: number, y: number, w: number, h: number, field: string, bev: number, horiz = false) => {
  g.fillStyle = shadeHex(field, 0.07); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - bev, y + bev); g.lineTo(x + bev, y + bev); g.lineTo(x + bev, y + h - bev); g.lineTo(x, y + h); g.closePath(); g.fill();
  g.fillStyle = shadeHex(field, -0.09); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.lineTo(x + bev, y + h - bev); g.lineTo(x + w - bev, y + h - bev); g.lineTo(x + w - bev, y + bev); g.closePath(); g.fill();
  g.fillStyle = field; g.fillRect(x + bev, y + bev, w - 2 * bev, h - 2 * bev);
  grain(g, r, x + bev, y + bev, w - 2 * bev, h - 2 * bev, Math.round((w * h) / 900), "#2a140a", horiz);
  g.strokeStyle = "rgba(30,14,6,0.35)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
};
const softDot = () => tx("softDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
}, true);
/** a soft beam (u = 0 at the source -> 1), feathered sides */
const shaftTex = () => tx("shaft", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2, a = Math.min(1, u * 8) * (1 - u) ** 1.3 * (1 - v * v) ** 1.6;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
}, true);
const glareTex = () => tx("glare", 256, 256, (g) => {
  g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(0, 0, 256, 256);
  for (const [x, w, a] of [[60, 34, 0.5], [112, 12, 0.35], [190, 22, 0.25]] as number[][]) {
    g.save(); g.translate(x, 128); g.rotate(0.55); const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(-w, -260, 2 * w, 520); g.restore();
  }
}, true);

// ---------------- materials ----------------
const C = (hex: string) => lam("si:" + hex, () => ({ color: hex }));
const TM = (key: string, map: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam("si:" + key, () => ({ map: map(), ...extra }));
const CE = (hex: string, e: string, k: number) => lam(`si:${hex}|${e}|${k}`, () => ({ color: hex, emissive: new THREE.Color(e), emissiveIntensity: k }));
const bmats = new Map<string, THREE.MeshBasicMaterial>();
const basic = (key: string, make: () => THREE.MeshBasicMaterialParameters) => {
  let m = bmats.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial(make()); bmats.set(key, m); }
  return m;
};
/** an unlit readable face material (boards that must be READ; k < 1 dims it into a dark room) */
const faceMat = (key: string, map: () => THREE.Texture, k = 1, alpha = false) => basic("face:" + key + k, () => ({ map: map(), color: new THREE.Color(k, k, k), ...(alpha ? { transparent: true, alphaTest: 0.02, depthWrite: false } : {}) }));
const glowCol = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
const Q = (rx: number, ry: number, rz: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ"));
const cylY = (r: number, h: number, seg = 24, open = false, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg, 1, open).translate(0, h / 2, 0);

/** builder in a room's local frame (origin = the set base): props cast sun shadows, the shell only receives */
class RB {
  cast = new Batch(); flat = new Batch();
  constructor(public o: V3) {}
  m(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | P3 = 1) {
    const S = typeof s === "number" ? [s, s, s] : s;
    return new THREE.Matrix4().compose(V(this.o[0] + x, this.o[1] + y, this.o[2] + z), Q(rx, ry, rz), V(S[0], S[1], S[2]));
  }
  /** axis box from corner to corner */
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cast = true) {
    (cast ? this.cast : this.flat).add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, this.m((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  }
  geo(g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | P3 = 1, cast = true) {
    (cast ? this.cast : this.flat).add(g, mat, this.m(x, y, z, ry, rx, rz, s));
  }
  /** rotated box (w x h x d) centred at x, y, z */
  rbox(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, cast = true) {
    this.geo(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry, rx, rz, 1, cast);
  }
  /** cylinder rod from a to b */
  seg(mat: THREE.Material, a: P3, b: P3, r: number, cast = true, sides = 10) {
    const A = V(...a), B = V(...b), d = B.clone().sub(A), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
    (cast ? this.cast : this.flat).add(new THREE.CylinderGeometry(r, r, L, sides), mat, new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5).add(V(...this.o)), q, V(1, 1, 1)));
  }
  /** wall quad in the plane z (face +1 = normal +z): u = (x - uo) / su, v = (y - vo) / sv */
  wallZ(mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number, face: number, su: number, sv: number, uo = 0, vo = 0) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return;
    const v0 = (y0 - vo) / sv, v1 = (y1 - vo) / sv;
    const g = face > 0 ? quad(V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z), (x1 - uo) / su, v1, (x0 - uo) / su, v0)
      : quad(V(x1, y0, z), V(x0, y0, z), V(x0, y1, z), V(x1, y1, z), -(x0 - uo) / su, v1, -(x1 - uo) / su, v0);
    this.flat.add(g, mat, this.m(0, 0, 0));
  }
  /** wall quad in the plane x (face +1 = normal +x) */
  wallX(mat: THREE.Material, z0: number, z1: number, y0: number, y1: number, x: number, face: number, su: number, sv: number, uo = 0, vo = 0) {
    if (z1 - z0 < 1e-4 || y1 - y0 < 1e-4) return;
    const v0 = (y0 - vo) / sv, v1 = (y1 - vo) / sv;
    const g = face > 0 ? quad(V(x, y0, z1), V(x, y0, z0), V(x, y1, z0), V(x, y1, z1), -(z0 - uo) / su, v1, -(z1 - uo) / su, v0)
      : quad(V(x, y0, z0), V(x, y0, z1), V(x, y1, z1), V(x, y1, z0), (z1 - uo) / su, v1, (z0 - uo) / su, v0);
    this.flat.add(g, mat, this.m(0, 0, 0));
  }
  /** floor (face +1, up) / ceiling (face -1, down) quad at height y */
  flatY(mat: THREE.Material, x0: number, x1: number, z0: number, z1: number, y: number, face: number, su: number, sv: number, cast = false) {
    const g = face > 0 ? quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), x1 / su, -z0 / sv, x0 / su, -z1 / sv)
      : quad(V(x0, y, z0), V(x1, y, z0), V(x1, y, z1), V(x0, y, z1), x1 / su, z1 / sv, x0 / su, z0 / sv);
    (cast ? this.cast : this.flat).add(g, mat, this.m(0, 0, 0));
  }
  /** a flat decal quad (local plane, centred, facing +z before rotation) */
  panel(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, cast = false) {
    this.geo(new THREE.PlaneGeometry(w, h), mat, x, y, z, ry, rx, rz, 1, cast);
  }
  done(parent: THREE.Object3D) { this.cast.build(parent, true); this.flat.build(parent, false); }
}
/** an unlit plane mesh (readable faces, views, effects) placed in a set */
const plane = (parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, p: P3, ry = 0, rx = 0, rz = 0, noInk = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...p); m.rotation.set(rx, ry, rz, "YXZ"); if (noInk) m.layers.set(NOINK); parent.add(m); return m;
};
/** fix r1: a soft contact shadow (plum, multiplied by `op`) lying on a horizontal surface at world point p */
const contact = (parent: THREE.Object3D, p: P3, w: number, d: number, op = 0.35, ry = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic("blob" + op, () => ({ map: blobTex(), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  m.position.set(...p); m.rotation.set(-Math.PI / 2, 0, ry); m.layers.set(NOINK); m.renderOrder = 2; parent.add(m); return m;
};
/** additive glow sprite (bulb halos) */
const glowSprite = (parent: THREE.Object3D, p: P3, size: number, col: THREE.Color) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.position.set(...p); s.scale.setScalar(size); s.layers.set(NOINK); s.renderOrder = 6; parent.add(s); return s;
};
/** an emissive bulb (> bloom threshold) + its halo */
const bulb = (parent: THREE.Object3D, p: P3, r: number, hex: string, k: number, halo = 0.5, haloK = 0.5) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), new THREE.MeshBasicMaterial({ color: glowCol(hex, k) }));
  m.position.set(...p); m.layers.set(NOINK); parent.add(m);
  const s = glowSprite(parent, p, halo, glowCol(hex, haloK));
  return { m, s };
};

/** drifting motes (dust in light, specks) as one Points cloud, posed on the video clock */
class Motes {
  pts: THREE.Points; base: Float32Array; n: number;
  constructor(parent: THREE.Object3D, n: number, seed: number, public o: V3, public lo: P3, public hi: P3, col: THREE.Color, size: number, public drift = 0.08, public rise = 0.02) {
    this.n = n;
    const pos = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) this.base[i * 3 + k] = lerp(lo[k], hi[k], hash(seed + i * 7.31 + k * 1.93));
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softDot(), color: col, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.pts.frustumCulled = false; this.pts.layers.set(NOINK); parent.add(this.pts);
  }
  pose(t: number, seed = 0) {
    const a = this.pts.geometry.attributes.position as THREE.BufferAttribute, p = a.array as Float32Array;
    for (let i = 0; i < this.n; i++) {
      const ph = hash(seed + i * 3.7) * TAU, sp = 0.4 + hash(i * 1.3) * 0.8;
      for (let k = 0; k < 3; k++) {
        const span = this.hi[k] - this.lo[k];
        let v = this.base[i * 3 + k] - this.lo[k] + Math.sin(t * sp * (0.6 + k * 0.3) + ph + k) * this.drift + (k === 1 ? t * this.rise * sp : t * 0.012 * (k ? 1 : -1));
        v = ((v % span) + span) % span;
        p[i * 3 + k] = this.o[k] + this.lo[k] + v;
      }
    }
    a.needsUpdate = true;
  }
}

// ======================================================================================================== BANK painters
/** honey parquet: 64 px rows of planks (2 m tile), seamless in x and y */
const parquetTex = (key = "parquet", base = "#a8703e") => tx(key, 1024, 1024, (g, r) => {
  g.fillStyle = shadeHex(base, -0.1); g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 64) {
    let x = -Math.floor(r() * 220);
    while (x < 1024) {
      const L = 170 + r() * 170, col = jit(r, base, 0.12, 5), gs: number[] = [];
      for (let k = 0; k < 7; k++) gs.push(y + 5 + r() * 54, 0.06 + 0.1 * r(), (r() - 0.5) * 7);
      for (const ox of [0, -1024, 1024]) {
        if (x + ox > 1024 || x + ox + L < 0) continue;
        g.fillStyle = col; g.fillRect(x + ox, y, L, 64);
        for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(70,36,16,${gs[k * 3 + 1]})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + ox, gs[k * 3]); g.bezierCurveTo(x + ox + L * 0.3, gs[k * 3] + gs[k * 3 + 2], x + ox + L * 0.7, gs[k * 3] - gs[k * 3 + 2], x + ox + L, gs[k * 3]); g.stroke(); }
        g.fillStyle = "rgba(255,230,190,0.10)"; g.fillRect(x + ox, y + 2, L, 5);
        g.fillStyle = "rgba(50,24,10,0.6)"; g.fillRect(x + ox, y, 3, 64);
      }
      x += L;
    }
    g.fillStyle = "rgba(50,24,10,0.55)"; g.fillRect(0, y, 1024, 3);
  }
});
/** the bank's deep green carpet with a burgundy + gold border (one image over the whole rug) */
const bkRugTex = () => tx("bkRug", 1024, 864, (g, r) => {
  g.fillStyle = "#6a1e22"; g.fillRect(0, 0, 1024, 864);
  for (let x = 0; x < 1024; x += 48) for (const y of [26, 838]) { g.fillStyle = "#c9a14a"; g.beginPath(); g.moveTo(x + 24, y - 14); g.lineTo(x + 38, y); g.lineTo(x + 24, y + 14); g.lineTo(x + 10, y); g.closePath(); g.fill(); }
  for (let y = 0; y < 864; y += 48) for (const x of [26, 998]) { g.fillStyle = "#c9a14a"; g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + 14, y + 24); g.lineTo(x, y + 38); g.lineTo(x - 14, y + 24); g.closePath(); g.fill(); }
  g.fillStyle = "#c9a14a"; g.fillRect(56, 56, 912, 752); g.fillStyle = "#24523e"; g.fillRect(66, 66, 892, 732);
  mottle(g, r, 1024, 864, 400, ["#1d4634", "#2c5e48", "#204c3a"], 10, 40, 0.18);
  speck(g, r, 1024, 864, 6000, ["#18382a", "#3a6a52"], 1, 3, 0.35);
  g.strokeStyle = "rgba(201,161,74,0.55)"; g.lineWidth = 6; g.beginPath(); g.ellipse(512, 432, 230, 150, 0, 0, TAU); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.ellipse(512, 432, 190, 118, 0, 0, TAU); g.stroke();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.fillStyle = "rgba(201,161,74,0.5)"; g.beginPath(); g.arc(512 + Math.cos(a) * 160, 432 + Math.sin(a) * 100, 10, 0, TAU); g.fill(); }
});
/** wainscot: mahogany frame + one raised panel per 1.0 m module (512 px = 1.0 m wide x 0.95 m tall) */
const bkWainTex = () => tx("bkWain", 512, 486, (g, r) => {
  g.fillStyle = "#4e2416"; g.fillRect(0, 0, 512, 486); grain(g, r, 0, 0, 512, 486, 90, "#1e0c06", true);
  panel(g, r, 56, 70, 400, 330, "#73361f", 22, true);
  g.fillStyle = "rgba(255,210,160,0.12)"; g.fillRect(0, 0, 512, 10); g.fillStyle = "rgba(20,8,4,0.4)"; g.fillRect(0, 456, 512, 30);
});
/** upper panelling: walnut stiles + a small top panel and a tall lower panel per 1.0 m (512 x 1054 = 1.0 x 2.06 m) */
const bkUpperTex = () => tx("bkUpper", 512, 1054, (g, r) => {
  g.fillStyle = "#5e2e1a"; g.fillRect(0, 0, 512, 1054); grain(g, r, 0, 0, 512, 1054, 120, "#1e0c06", false);
  panel(g, r, 60, 70, 392, 210, "#8c5431", 20, true);
  panel(g, r, 60, 330, 392, 660, "#8a5230", 20, false);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, 6, 1054); g.fillStyle = "rgba(255,220,170,0.08)"; g.fillRect(6, 0, 6, 1054);
});
/** crown moulding band with dentils and a gilt bead (512 x 160 = 1.0 x 0.32 m) */
const bkCrownTex = () => tx("bkCrown", 512, 160, (g) => {
  g.fillStyle = "#4a2414"; g.fillRect(0, 0, 512, 160);
  g.fillStyle = "#6a3820"; g.fillRect(0, 20, 512, 50); g.fillStyle = "rgba(255,220,170,0.15)"; g.fillRect(0, 20, 512, 6);
  for (let x = 4; x < 512; x += 32) { g.fillStyle = "#7a4426"; g.fillRect(x, 84, 20, 30); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x + 16, 84, 4, 30); }
  g.fillStyle = "#c9a14a"; g.fillRect(0, 124, 512, 6); g.fillStyle = "#3a1a0e"; g.fillRect(0, 140, 512, 20);
});
const plasterTex = (key: string, base: string, s = 512) => tx(key, s, s, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  mottle(g, r, s, s, 160, [shadeHex(base, 0.04), shadeHex(base, -0.05)], 20, 70, 0.12);
  speck(g, r, s, s, 1200, [shadeHex(base, -0.12), shadeHex(base, 0.08)], 1, 2.5, 0.25);
});
/** generic wood (desk tops, frames): long grain along u */
const woodTex = (key: string, base: string, rings = 70) => tx(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6; i++) { g.fillStyle = rgba(shadeHex(base, (r() - 0.5) * 0.08), 0.5); g.fillRect(0, r() * 512, 512, 30 + r() * 80); }
  grain(g, r, 0, 0, 512, 512, rings, "#1e0c06", true, 0.08, 0.2);
  speck(g, r, 512, 512, 300, ["#2a1408"], 1, 2, 0.25);
});
/** desk pedestal front: three drawers with brass pulls (256 x 384 = 0.46 x 0.69 m) */
const drawerTex = () => tx("bkDrawer", 256, 384, (g, r) => {
  g.fillStyle = "#4a2012"; g.fillRect(0, 0, 256, 384);
  for (const [y, h] of [[12, 98], [120, 120], [250, 122]]) {
    panel(g, r, 12, y, 232, h, "#6a2e1a", 8, true);
    g.fillStyle = "#3a2410"; g.fillRect(100, y + h / 2 - 7, 56, 14); g.fillStyle = "#e0b850"; rrect(g, 98, y + h / 2 - 9, 60, 12, 5); g.fill(); g.fillStyle = "rgba(255,255,220,0.7)"; g.fillRect(104, y + h / 2 - 8, 40, 3);
  }
});
/** green leather blotter with darker corners */
const blotterTex = () => tx("bkBlotter", 512, 288, (g, r) => {
  g.fillStyle = "#2c5a44"; g.fillRect(0, 0, 512, 288); mottle(g, r, 512, 288, 60, ["#24503a", "#356a52"], 10, 40, 0.3);
  g.fillStyle = "#4a2416"; for (const [x, y] of [[0, 0], [452, 0], [0, 228], [452, 228]]) g.fillRect(x, y, 60, 60);
  g.fillStyle = "#f4ecd8"; g.fillRect(150, 90, 200, 120); g.strokeStyle = "rgba(40,40,80,0.5)"; g.lineWidth = 2; for (let y = 110; y < 200; y += 16) { g.beginPath(); g.moveTo(165, y); g.lineTo(165 + 120 + r() * 50, y); g.stroke(); }
});
/** the OIL RECEIPT: a warehouse-receipt certificate (1200 x 880 = 0.6 x 0.44 m) */
// fix r3 (A3 P2 shot 3: APPROVED printed across RECEIPT): the card is 8 cm taller and re-laid out: OIL / RECEIPT higher,
// the seal + "1,000,000 LBS" up in the top corners, and the whole lower band left EMPTY for the red APPROVED mark
const RCPT = { w: 0.72, h: 0.56 };
/** condensed centred text: font px at full height, squeezed in x to fit maxW (cap height kept) */
const ctextC = (g: G, s: string, x: number, y: number, px: number, col: string, maxW: number) => {
  font(g, px); const w = g.measureText(s).width, k = Math.min(1, maxW / w); g.save(); g.translate(x, y); g.scale(k, 1); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(s, 0, 0); g.restore();
};
const receiptTex = () => tx("bkReceipt3", 1200, 934, (g, r) => {
  const H = 934; g.fillStyle = "#f6efdc"; g.fillRect(0, 0, 1200, H);
  speck(g, r, 1200, H, 2900, ["#c8b890", "#e8dcc0"], 1, 3, 0.25);
  g.strokeStyle = "#2f5a7a"; g.lineWidth = 14; g.strokeRect(22, 22, 1156, H - 44); g.lineWidth = 4; g.strokeRect(46, 46, 1108, H - 92);
  for (let x = 60; x < 1140; x += 26) { g.fillStyle = "rgba(47,90,122,0.5)"; g.beginPath(); g.arc(x + 13, 60, 6, 0, TAU); g.fill(); g.beginPath(); g.arc(x + 13, H - 60, 6, 0, TAU); g.fill(); }
  for (const [x, y] of [[80, 80], [1120, 80], [80, H - 80], [1120, H - 80]]) { g.fillStyle = "#2f5a7a"; g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill(); g.fillStyle = "#f6efdc"; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); }
  ctextC(g, "OIL", 600, 288, 250, "#1c2c44", 1080);
  ctextC(g, "RECEIPT", 600, 522, 250, "#1c2c44", 1090);
  // the gold seal (upper left) + the weight (upper right), clear of the words and of the stamp band below
  const sx = 175, sy = 190;
  g.fillStyle = "#c9a14a"; g.beginPath(); for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, rr = k % 2 ? 54 : 64; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.closePath(); g.fill();
  g.fillStyle = "#e8c860"; g.beginPath(); g.arc(sx, sy, 42, 0, TAU); g.fill(); g.fillStyle = "#a07a2a"; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * TAU, rr = k % 2 ? 12 : 30; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.closePath(); g.fill();
  ctext(g, "1,000,000", 1030, 180, 50, "#2f5a7a", 250, "Georgia, serif", "bold"); ctext(g, "LBS", 1030, 236, 50, "#2f5a7a", 200, "Georgia, serif", "bold");
  g.strokeStyle = "rgba(28,44,68,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(130, 568); g.lineTo(1070, 568); g.stroke();
}, true);
/** the red rubber-stamp mark (transparent background, ink voids) */
/** fix r3: the big receipt's APPROVED mark (900 x 285 = 0.6 x 0.19 m): condensed letters ~52 % of its height (>= 40 px) */
const approvedTex3 = () => tx("bkApproved3", 900, 285, (g, r) => {
  g.clearRect(0, 0, 900, 285);
  g.strokeStyle = "#c4201a"; g.lineWidth = 16; rrect(g, 12, 12, 876, 261, 28); g.stroke(); g.lineWidth = 5; rrect(g, 34, 34, 832, 217, 18); g.stroke();
  ctextC(g, "APPROVED", 450, 216, 212, "#c4201a", 790);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + 0.6 * r()})`; g.beginPath(); g.arc(r() * 900, r() * 285, 1 + r() * 4, 0, TAU); g.fill(); }
  g.globalCompositeOperation = "source-over";
}, true);
/** fix r3 (A3 P2 shot 3: the cash slide had no receiver): Tino's grey suit sleeve with a white cuff + gold cufflink and his
 *  ball hand (left end) reaching in from frame right to take the cash (a generic cartoon arm, no likeness) */
const sleeveTex = () => tx("bkSleeve3", 512, 128, (g) => {
  g.clearRect(0, 0, 512, 128); const ink = "#2c1e2a";
  g.fillStyle = "#8a8f99"; rrect(g, 120, 30, 400, 70, 28); g.fill(); g.strokeStyle = ink; g.lineWidth = 6; g.stroke();
  g.strokeStyle = "rgba(60,64,74,0.5)"; g.lineWidth = 3; g.beginPath(); g.moveTo(200, 42); g.lineTo(500, 46); g.stroke();
  g.fillStyle = "#f4f2ec"; rrect(g, 92, 36, 44, 58, 10); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#e0a92a"; g.beginPath(); g.arc(114, 64, 9, 0, TAU); g.fill(); g.strokeStyle = "#7a5410"; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = "#f8f3ee"; g.beginPath(); g.arc(58, 64, 40, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 6; g.stroke();
  g.strokeStyle = "rgba(44,30,42,0.5)"; g.lineWidth = 3; g.beginPath(); g.arc(58, 64, 22, 2.2, 4.0); g.stroke();
}, true);
/** fix r3 (CHAR P2 shot 5): a cash bundle edge whose paper band is STAMPED red (APPROVED band, ~35 % of the width) */
const billEdgeRedTex = () => tx("bkBillEdgeR3", 256, 64, (g) => {
  g.fillStyle = "#b8d0a4"; g.fillRect(0, 0, 256, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = y % 8 ? "rgba(70,100,60,0.35)" : "rgba(255,255,240,0.3)"; g.fillRect(0, y, 256, 2); }
  g.fillStyle = "#c8322a"; g.fillRect(84, 0, 92, 64); g.fillStyle = "rgba(255,240,220,0.9)"; g.fillRect(92, 26, 76, 12);
  g.strokeStyle = "#7a1410"; g.lineWidth = 3; g.strokeRect(85.5, 1.5, 89, 61);
});
const billRedTex = () => tx("bkBillR3", 256, 128, (g, r) => {
  g.fillStyle = "#9ab98a"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#4e6e4a"; g.lineWidth = 6; g.strokeRect(8, 8, 240, 112);
  speck(g, r, 256, 128, 300, ["#5e7e5a"], 1, 2, 0.3);
  g.fillStyle = "#c8322a"; g.fillRect(84, 0, 92, 128); g.save(); g.translate(128, 64); g.rotate(-0.12); g.strokeStyle = "#fbe8e0"; g.lineWidth = 6; g.strokeRect(-36, -22, 72, 44); g.restore();
});
const approvedTex = () => tx("bkApproved", 900, 300, (g, r) => {
  g.clearRect(0, 0, 900, 300);
  g.strokeStyle = "#c4201a"; g.lineWidth = 18; rrect(g, 14, 14, 872, 272, 30); g.stroke(); g.lineWidth = 6; rrect(g, 40, 40, 820, 220, 20); g.stroke();
  ctext(g, "APPROVED", 450, 212, 190, "#c4201a", 790);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + 0.6 * r()})`; g.beginPath(); g.arc(r() * 900, r() * 300, 1 + r() * 4, 0, TAU); g.fill(); }
  g.globalCompositeOperation = "source-over";
}, true);
/** a cash bundle: top = a bill with a paper band; sides = stacked bill edges */
const billTex = () => tx("bkBill", 256, 128, (g, r) => {
  g.fillStyle = "#9ab98a"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#4e6e4a"; g.lineWidth = 6; g.strokeRect(8, 8, 240, 112);
  g.fillStyle = "#c8d8b8"; g.beginPath(); g.ellipse(128, 64, 30, 38, 0, 0, TAU); g.fill(); g.strokeStyle = "#4e6e4a"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#6a8a62"; g.beginPath(); g.arc(128, 58, 12, 0, TAU); g.fill(); g.fillRect(114, 70, 28, 22);
  for (const [x, y] of [[34, 34], [222, 34], [34, 94], [222, 94]]) { g.fillStyle = "#4e6e4a"; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); }
  speck(g, r, 256, 128, 300, ["#5e7e5a"], 1, 2, 0.3);
  g.fillStyle = "#f0e2b0"; g.fillRect(170, 0, 30, 128); g.fillStyle = "rgba(120,90,40,0.6)"; g.fillRect(170, 0, 3, 128); g.fillRect(197, 0, 3, 128);
});
const billEdgeTex = () => tx("bkBillEdge", 256, 64, (g) => {
  g.fillStyle = "#b8d0a4"; g.fillRect(0, 0, 256, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = y % 8 ? "rgba(70,100,60,0.35)" : "rgba(255,255,240,0.3)"; g.fillRect(0, y, 256, 2); }
  g.fillStyle = "#f0e2b0"; g.fillRect(170, 0, 30, 64); g.fillStyle = "rgba(120,90,40,0.6)"; g.fillRect(170, 0, 3, 64);
});
/** the flip chart: cream paper, ALL US OIL (a US map) | TINO'S OIL (the drums are sprites) (1600 x 1050) */
const US_OUTLINE: [number, number][] = [
  [-124.7, 48.4], [-123.2, 48.2], [-122.8, 49.0], [-95.2, 49.0], [-95.2, 49.4], [-94.6, 48.7], [-92.1, 46.8], [-90.4, 46.6], [-87.6, 46.4],
  [-84.6, 46.5], [-84.1, 45.6], [-82.5, 45.3], [-82.4, 43.0], [-83.1, 42.0], [-81.0, 41.7], [-79.0, 42.9], [-79.2, 43.3], [-76.4, 43.5],
  [-75.3, 44.8], [-74.7, 45.0], [-71.5, 45.0], [-70.6, 45.7], [-70.0, 46.7], [-69.2, 47.4], [-67.8, 47.1], [-67.8, 45.6], [-67.0, 44.8],
  [-68.8, 44.2], [-70.2, 43.6], [-70.8, 42.8], [-70.6, 42.4], [-70.0, 41.8], [-70.7, 41.5], [-71.9, 41.3], [-73.9, 40.8], [-74.0, 40.4],
  [-74.0, 39.6], [-74.9, 38.9], [-75.5, 38.5], [-75.6, 37.4], [-76.0, 36.9], [-75.6, 35.8], [-75.5, 35.2], [-76.5, 34.7], [-77.9, 34.0],
  [-79.2, 33.2], [-80.9, 32.0], [-81.4, 30.4], [-81.0, 29.2], [-80.1, 26.9], [-80.4, 25.2], [-81.2, 25.3], [-81.8, 26.2], [-82.7, 27.9],
  [-82.8, 29.0], [-83.7, 29.9], [-84.4, 30.0], [-85.4, 29.7], [-86.5, 30.4], [-88.1, 30.4], [-89.6, 30.2], [-89.2, 29.3], [-90.2, 29.1],
  [-91.3, 29.3], [-93.8, 29.7], [-94.8, 29.3], [-96.6, 28.3], [-97.4, 27.4], [-97.2, 25.9], [-99.1, 26.4], [-99.5, 27.5], [-100.6, 28.9],
  [-101.4, 29.8], [-102.4, 29.8], [-103.2, 29.0], [-104.5, 29.6], [-105.0, 30.7], [-106.5, 31.8], [-108.2, 31.8], [-108.2, 31.3],
  [-111.1, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-117.3, 33.2], [-118.4, 33.8], [-119.6, 34.4], [-120.6, 34.6], [-121.9, 36.6],
  [-122.5, 37.8], [-123.7, 39.0], [-124.4, 40.4], [-124.2, 42.0], [-124.0, 46.2], [-124.7, 48.4],
];
const CHART_PX = { w: 1600, h: 1050 };
const chartTex = () => tx("bkChart2", CHART_PX.w, CHART_PX.h, (g, r) => {
  const W = CHART_PX.w, H = CHART_PX.h;
  g.fillStyle = "#fbf3e2"; g.fillRect(0, 0, W, H); speck(g, r, W, H, 3000, ["#d8ccb0", "#efe6d0"], 1, 3, 0.3);
  // fix r1 (A1 P2 shot 6): painted light on the unlit board: the top crossbar's soft shadow band (top 6 %), a warm lamp
  // glow on the top third, a darker foot (bottom 8 %) - the words stay crisp on top
  { const sh = g.createLinearGradient(0, 0, 0, H * 0.075); sh.addColorStop(0, "rgba(70,40,30,0.42)"); sh.addColorStop(1, "rgba(70,40,30,0)"); g.fillStyle = sh; g.fillRect(0, 0, W, H * 0.075);
    const gl = g.createRadialGradient(W * 0.5, -H * 0.1, 0, W * 0.5, -H * 0.1, H * 0.75); gl.addColorStop(0, "rgba(255,214,140,0.22)"); gl.addColorStop(1, "rgba(255,214,140,0)"); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    const ft = g.createLinearGradient(0, H * 0.72, 0, H); ft.addColorStop(0, "rgba(90,60,70,0)"); ft.addColorStop(1, "rgba(90,60,70,0.34)"); g.fillStyle = ft; g.fillRect(0, H * 0.72, W, H * 0.28);
    // fix r2 (A2 P3 #31): the picture light's pool: the top 20 % ~8 % brighter + warmer, the edges falling off (no pasted-on
    // even white); a soft plum shadow down the right edge where Tino stands
    const tp = g.createLinearGradient(0, H * 0.06, 0, H * 0.26); tp.addColorStop(0, "rgba(255,226,170,0.18)"); tp.addColorStop(1, "rgba(255,226,170,0)"); g.fillStyle = tp; g.fillRect(0, H * 0.06, W, H * 0.2);
    for (const [x0, x1, a0, a1] of [[0, W * 0.12, 0.22, 0], [W * 0.84, W, 0, 0.26]] as number[][]) { const sg = g.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, `rgba(70,36,54,${a0})`); sg.addColorStop(1, `rgba(70,36,54,${a1})`); g.fillStyle = sg; g.fillRect(x0, 0, x1 - x0, H); } }
  for (let y = 0; y < H; y += 40) { g.fillStyle = "rgba(120,150,190,0.12)"; g.fillRect(0, y, W, 2); }
  g.fillStyle = "#2a2a3a"; g.fillRect(796, 40, 8, H - 80);
  // fix r2 (carryover / A2: titles ~20 % bigger, cap height >= 0.1 m = 100 px): 150 px condensed to fit each half
  ctextC(g, "ALL US OIL", 400, 178, 150, "#1f3a6a", 740);
  ctextC(g, "TINO'S OIL", 1200, 178, 150, "#a8341c", 740);
  g.fillStyle = "#1f3a6a"; g.fillRect(120, 200, 560, 11); g.fillStyle = "#a8341c"; g.fillRect(920, 200, 560, 11);
  // the US map (equirectangular, x squashed by cos 38 deg), centred in the left half
  const k = 12.6, cx = 400, cy = 640, X = (lon: number) => cx + (lon + 96) * Math.cos((38 * Math.PI) / 180) * k, Y = (lat: number) => cy - (lat - 37.5) * k;
  g.beginPath(); US_OUTLINE.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.closePath();
  // fix r1 (A1 P3): a clean flat map (no blotches): #7FC27A with a fine painted grain + a thin dark coastline ink
  g.fillStyle = "#7fc27a"; g.fill(); g.save(); g.clip(); speck(g, r, W, H, 1400, ["#74b86f", "#8ccc86"], 1, 3, 0.35);
  g.fillStyle = "rgba(255,255,240,0.16)"; g.fillRect(0, 0, W, cy - 60); g.restore();
  g.lineWidth = 5; g.strokeStyle = "#2a5a3a"; g.lineJoin = "round"; g.stroke();
  g.fillStyle = "#2a2a3a"; g.fillRect(70, 930, 660, 8); g.fillRect(870, 930, 660, 8);
}, true);
/** a cartoon oil drum sprite (gold, two ribs, a drop icon, plum outline) */
const drumTex = () => tx("bkDrum", 128, 160, (g) => {
  g.clearRect(0, 0, 128, 160);
  const gr = g.createLinearGradient(14, 0, 114, 0); gr.addColorStop(0, "#c88a18"); gr.addColorStop(0.3, "#f6c544"); gr.addColorStop(0.75, "#e0a92a"); gr.addColorStop(1, "#a86a10");
  g.fillStyle = gr; rrect(g, 14, 18, 100, 134, 12); g.fill();
  g.fillStyle = "rgba(90,50,10,0.55)"; g.fillRect(14, 58, 100, 7); g.fillRect(14, 108, 100, 7);
  g.fillStyle = "#d89a20"; g.beginPath(); g.ellipse(64, 20, 50, 10, 0, 0, TAU); g.fill(); g.strokeStyle = "#8a5a10"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "rgba(255,250,220,0.55)"; g.fillRect(30, 28, 9, 118);
  g.fillStyle = "#8a4e0e"; g.beginPath(); g.moveTo(64, 70); g.bezierCurveTo(80, 92, 78, 104, 64, 104); g.bezierCurveTo(50, 104, 48, 92, 64, 70); g.fill();
  g.strokeStyle = "#2c1e2a"; g.lineWidth = 5; rrect(g, 14, 18, 100, 134, 12); g.stroke();
}, true);
/** tank-farm view through the bank window: SKY layer (opaque) */
const bkSkyTex = () => tx("bkSky", 1024, 840, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 840); gr.addColorStop(0, "#4f8fe0"); gr.addColorStop(0.45, "#8fbdf0"); gr.addColorStop(0.62, "#d9e8f4"); gr.addColorStop(1, "#c8d4dc");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 840);
  for (let i = 0; i < 9; i++) { const x = r() * 1024, y = 60 + r() * 300, s = 40 + r() * 70;
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(170,180,225,0.55)"; g.beginPath(); g.arc(x + (k - 2.5) * s * 0.55, y + s * 0.22, s * (0.45 + 0.2 * r()), 0, TAU); g.fill(); }
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,255,255,0.92)"; g.beginPath(); g.arc(x + (k - 2.5) * s * 0.55, y - s * 0.05, s * (0.42 + 0.2 * r()), 0, TAU); g.fill(); } }
  // hazy far skyline (generic towers) + harbour water
  let x = 0; while (x < 1024) { const w = 18 + r() * 40, h = 30 + r() * 120; g.fillStyle = jit(r, "#9fb0c6", 0.06); g.fillRect(x, 513 - h, w, h + 4); if (r() < 0.3) g.fillRect(x + w * 0.4, 513 - h - 20, w * 0.2, 22); x += w + r() * 6; }
  g.fillStyle = "#7fa0c4"; g.fillRect(0, 513, 1024, 60); for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(240,250,255,0.5)"; g.fillRect(r() * 1024, 520 + r() * 50, 10 + r() * 30, 2); }
  g.fillStyle = "#a8a088"; g.fillRect(0, 573, 1024, 267);
}, true);
/** tank-farm view: the TANK layer (alpha above the skyline): ground, fence, tanks with spiral stairs, pipes */
const FARM = { w: 3.2, h: 2.6, cx: 2.18, cy: 1.86, ground: 1.42, hero: 1.62, heroTop: 2.2 };   // fix r2 (A2 P2): the hero tank 40 % bigger
const bkFarmTex = () => tx("bkFarm", 1024, 832, (g, r) => {
  g.clearRect(0, 0, 1024, 832);
  const PX = 1024 / FARM.w, X = (x: number) => (x - (FARM.cx - FARM.w / 2)) * PX, Y = (y: number) => (FARM.cy + FARM.h / 2 - y) * PX;
  const gy = Y(FARM.ground);
  const tank = (cx: number, w: number, top: number, shade: string, rail = true, stair = false) => {
    const x0 = X(cx) - (w * PX) / 2, x1 = X(cx) + (w * PX) / 2, y0 = Y(top);
    const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, shadeHex(shade, 0.06)); gr.addColorStop(0.35, shadeHex(shade, 0.1)); gr.addColorStop(1, shadeHex(shade, -0.16));
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, gy - y0);
    g.fillStyle = shadeHex(shade, 0.05); g.beginPath(); g.ellipse((x0 + x1) / 2, y0, (x1 - x0) / 2, (x1 - x0) * 0.06, 0, Math.PI, TAU); g.fill();
    for (let k = 1; k < 4; k++) { g.fillStyle = "rgba(110,90,70,0.25)"; g.fillRect(x0, y0 + ((gy - y0) * k) / 4, x1 - x0, 2); }
    for (let k = 0; k < 4; k++) { const sx = x0 + r() * (x1 - x0); const sg = g.createLinearGradient(0, y0, 0, y0 + (gy - y0) * 0.6); sg.addColorStop(0, "rgba(160,84,40,0.5)"); sg.addColorStop(1, "rgba(160,84,40,0)"); g.fillStyle = sg; g.fillRect(sx, y0 + 4, 3 + r() * 4, (gy - y0) * 0.6); }
    if (rail) { g.strokeStyle = "#c8502c"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 2, y0 - 8); g.lineTo(x1 - 2, y0 - 8); g.stroke(); for (let px = x0 + 4; px < x1; px += 10) { g.beginPath(); g.moveTo(px, y0 - 8); g.lineTo(px, y0); g.stroke(); } }
    if (stair) { g.strokeStyle = "#9a4a2a"; g.lineWidth = 3; for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(x0 + 2, gy - 4 - k * (gy - y0) * 0.5); g.lineTo(x1 - 2, gy - (gy - y0) * (0.5 + k * 0.5) + 2); g.stroke(); g.beginPath(); g.moveTo(x0 + 2, gy - 12 - k * (gy - y0) * 0.5); g.lineTo(x1 - 2, gy - 8 - (gy - y0) * (0.5 + k * 0.5) + 2); g.stroke(); }
      g.lineWidth = 1.5; for (let k = 0; k < 22; k++) { const t = (k % 11) / 11, kk = Math.floor(k / 11), xx = x0 + 2 + (x1 - x0 - 4) * t, yy = gy - 4 - kk * (gy - y0) * 0.5 - (gy - y0) * 0.5 * t; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy - 8); g.stroke(); } }
    g.strokeStyle = "rgba(44,30,42,0.85)"; g.lineWidth = 3; g.strokeRect(x0, y0, x1 - x0, gy - y0);
  };
  // far cluster (hazy), mid tanks, the hero tank, pipes, the fence, the gravel yard
  for (const [cx, w, top] of [[0.8, 0.22, 1.6], [1.12, 0.2, 1.58], [2.05, 0.2, 1.6], [2.32, 0.24, 1.62], [3.55, 0.26, 1.64], [3.25, 0.2, 1.57], [2.85, 0.22, 1.6]]) tank(cx, w, top, "#cdd2dc", false);
  tank(2.62, 0.3, 1.74, "#e2dccd"); tank(1.05, 0.28, 1.7, "#e4dccb"); tank(3.1, 0.3, 1.76, "#e6decd");
  tank(FARM.hero, 0.56, FARM.heroTop, "#efe6d2", true, true);
  g.strokeStyle = "#8a6a4a"; g.lineWidth = 5; for (const y of [1.52, 1.58]) { g.beginPath(); g.moveTo(X(0.6), Y(y)); g.lineTo(X(3.8), Y(y)); g.stroke(); }
  g.fillStyle = "#8e8676"; g.fillRect(0, gy, 1024, 832 - gy); speck(g, r, 1024, 832, 1400, ["#7a7262", "#a8a090", "#6a6252"], 1, 4, 0.5);
  g.fillStyle = "#6e6a64"; g.fillRect(0, gy + 40, 1024, 26); for (let x = 0; x < 1024; x += 40) { g.fillStyle = "#e8e0c8"; g.fillRect(x, gy + 52, 20, 3); }
  for (const [x, c] of [[120, "#2f5a8a"], [146, "#c4302a"], [134, "#2f5a8a"], [880, "#c4302a"], [905, "#2f5a8a"]] as [number, string][]) { g.fillStyle = c; g.fillRect(x, gy + 78 + (x % 3) * 4, 22, 30); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x, gy + 86 + (x % 3) * 4, 22, 3); }
  g.fillStyle = "#d8d2c4"; rrect(g, 640, gy + 66, 150, 52, 22); g.fill(); g.fillStyle = "#3a6a8a"; g.fillRect(790, gy + 74, 46, 44); g.fillStyle = "#2a2a2a"; for (const x of [670, 760, 812]) { g.beginPath(); g.arc(x, gy + 120, 12, 0, TAU); g.fill(); }
  g.strokeStyle = "#8a6a4a"; g.lineWidth = 7; g.beginPath(); g.moveTo(0, gy - 8); g.lineTo(1024, gy - 8); g.stroke();
  g.fillStyle = "rgba(80,70,60,0.35)"; g.fillRect(0, gy, 1024, 5);
  g.strokeStyle = "rgba(90,90,96,0.8)"; g.lineWidth = 2; for (let x = 0; x < 1024; x += 9) { g.beginPath(); g.moveTo(x, gy + 26); g.lineTo(x + 9, gy + 6); g.moveTo(x, gy + 6); g.lineTo(x + 9, gy + 26); g.stroke(); }
  g.fillStyle = "#6a6a70"; for (let x = 0; x < 1024; x += 80) g.fillRect(x, gy + 2, 4, 28); g.fillRect(0, gy + 4, 1024, 3);
});
/** fix r1 (A1 P1 shot 3): a khaki INSPECTOR card for the window yard (feet at the bottom edge, facing left = the way
 *  they walk): flat cap, khaki work jacket, clipboard; frame 0 / 1 = walk contacts, 2 = stopped, pointing UP at the
 *  far tank; v = a slight jacket / cap variation per man. Bean head ~30 % of the height, plum ink. */
const inspTex = (v: number, k: number) => tx(`bkInspB${v}_${k}`, 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256); g.lineCap = "round"; g.lineJoin = "round";
  const ink = "#2c1e2a", jac = ["#b79a62", "#a88c56", "#c2a66c"][v % 3], cap = ["#7a6440", "#6a5636", "#84704a"][v % 3];
  // legs (dark trousers) + shoes
  const L = k === 0 ? [[-12, 6], [10, -4]] : k === 1 ? [[6, -6], [-6, 8]] : [[-4, 0], [6, 0]];
  g.strokeStyle = "#3a3448"; g.lineWidth = 13;
  for (const [a, b] of L) { g.beginPath(); g.moveTo(64 + a * 0.2, 172); g.lineTo(64 + a, 246); g.stroke(); g.fillStyle = "#1e1a22"; g.beginPath(); g.ellipse(64 + a - 5, 248, 11, 6, 0, 0, TAU); g.fill(); void b; }
  // jacket body
  g.fillStyle = jac; rrect(g, 34, 98, 60, 84, 18); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.strokeStyle = "rgba(60,40,20,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 104); g.lineTo(64, 176); g.stroke();
  g.fillStyle = "rgba(60,40,20,0.35)"; g.fillRect(40, 150, 18, 4); g.fillRect(70, 150, 18, 4);
  // the clipboard arm (front, toward the walk direction) + the far arm (swing / point up)
  g.strokeStyle = ink; g.lineWidth = 9;
  g.beginPath(); g.moveTo(44, 112); g.lineTo(30, 146); g.stroke();
  g.fillStyle = "#8a5a32"; rrect(g, 10, 128, 30, 40, 4); g.fill(); g.strokeStyle = ink; g.lineWidth = 3.5; g.stroke(); g.fillStyle = "#f6f2e4"; g.fillRect(14, 135, 22, 29);
  g.fillStyle = "#c0c0c8"; g.fillRect(19, 125, 12, 6);
  g.strokeStyle = ink; g.lineWidth = 9; g.beginPath();
  if (k === 2) { g.moveTo(80, 108); g.lineTo(84, 70); g.lineTo(74, 22); } else { g.moveTo(84, 112); g.lineTo(k ? 94 : 86, 150); }
  g.stroke(); g.fillStyle = "#f8f3ee"; g.beginPath(); g.arc(k === 2 ? 73 : k ? 95 : 87, k === 2 ? 18 : 154, 8, 0, TAU); g.fill(); g.lineWidth = 3.5; g.stroke();
  // bean head + flat cap (brim forward = left)
  g.fillStyle = "#f8f3ee"; g.beginPath(); g.ellipse(62, 70, 30, 34, 0, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = cap; g.beginPath(); g.ellipse(64, 44, 33, 14, 0, Math.PI, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(40, 46, 18, 5, -0.15, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#2a2030"; g.beginPath(); g.arc(48, 70, 3.6, 0, TAU); g.arc(62, 70, 3.6, 0, TAU); g.fill();
  if (k === 2) { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(54, 86, 6, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  else { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(48, 86); g.lineTo(60, 86); g.stroke(); }
}, true);
/** the near gravel yard + road seen through the bank window (alpha top edge): a pale road, gravel, a kerb, puddles */
const yardTex = () => tx("bkYard", 1024, 192, (g, r) => {
  g.clearRect(0, 0, 1024, 192);
  const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, "#a9a08a"); gr.addColorStop(1, "#8e8572"); g.fillStyle = gr; g.fillRect(0, 26, 1024, 166);
  speck(g, r, 1024, 192, 2600, ["#7a7262", "#bcb4a0", "#6a6252"], 1, 4, 0.55);
  g.fillStyle = "#c8c0aa"; g.fillRect(0, 22, 1024, 8); g.fillStyle = "rgba(70,60,50,0.35)"; g.fillRect(0, 30, 1024, 4);
  for (let i = 0; i < 6; i++) { const x = r() * 1024, y = 70 + r() * 90; g.fillStyle = "rgba(120,150,190,0.55)"; g.beginPath(); g.ellipse(x, y, 30 + r() * 40, 6 + r() * 5, 0, 0, TAU); g.fill(); g.fillStyle = "rgba(230,240,255,0.5)"; g.fillRect(x - 10, y - 2, 18, 2); }
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = "rgba(60,50,40,0.25)"; g.fillRect(x + r() * 20, 100 + r() * 60, 24, 3); }
}, true);
/** a 1960s tanker truck seen side-on (faces right) */
const truckTex = () => tx("bkTruck", 256, 96, (g) => {
  g.clearRect(0, 0, 256, 96); const ink = "#2c1e2a";
  g.fillStyle = "#e8e2d2"; rrect(g, 8, 18, 170, 52, 24); g.fill(); g.strokeStyle = ink; g.lineWidth = 4; g.stroke();
  g.fillStyle = "#c8452c"; g.fillRect(14, 40, 158, 8);
  g.fillStyle = "#3f6fa8"; rrect(g, 182, 26, 62, 46, 8); g.fill(); g.stroke(); g.fillStyle = "#bfe0f4"; g.fillRect(212, 32, 26, 18);
  g.fillStyle = "#2a2a2e"; for (const x of [40, 74, 214]) { g.beginPath(); g.arc(x, 76, 13, 0, TAU); g.fill(); g.fillStyle = "#9a9aa2"; g.beginPath(); g.arc(x, 76, 5, 0, TAU); g.fill(); g.fillStyle = "#2a2a2e"; }
}, true);
/** a gull glide sprite (two wing frames) */
const gullTex = (k: number) => tx("bkGull" + k, 64, 32, (g) => {
  g.clearRect(0, 0, 64, 32); g.strokeStyle = "#f6f4ee"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath();
  if (k) { g.moveTo(6, 20); g.quadraticCurveTo(18, 10, 32, 18); g.quadraticCurveTo(46, 10, 58, 20); } else { g.moveTo(6, 12); g.quadraticCurveTo(18, 22, 32, 18); g.quadraticCurveTo(46, 22, 58, 12); }
  g.stroke(); g.strokeStyle = "rgba(60,60,80,0.6)"; g.lineWidth = 1.5; g.stroke();
}, true);
/** a soft contact-shadow blob (multiplied by its material opacity) */
const blobTex = () => tx("blob", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(42,22,34,1)"); gr.addColorStop(0.55, "rgba(42,22,34,0.55)"); gr.addColorStop(1, "rgba(42,22,34,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}, true);
/** a wisp of smoke / steam (u across, v up: an S-curl that fades at both ends) */
const wispTex = () => tx("wisp", 64, 256, (g2) => { g2.clearRect(0, 0, 64, 256); for (let y = 0; y < 256; y++) { const a = Math.sin((y / 256) * Math.PI) * 0.55, x = 32 + Math.sin(y * 0.045) * 12; const gr = g2.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, `rgba(255,255,255,${a * 0.2})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g2.fillStyle = gr; g2.fillRect(x - 10, y, 20, 1); } }, true);
/** a harbour painting (oil style) for the back wall */
const paintingTex = () => tx("bkPainting", 640, 448, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 448); gr.addColorStop(0, "#e8b878"); gr.addColorStop(0.5, "#f4d8a8"); gr.addColorStop(0.62, "#7a9ab0"); gr.addColorStop(1, "#3a5a78");
  g.fillStyle = gr; g.fillRect(0, 0, 640, 448);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "60,80,110"},${0.08 + 0.1 * r()})`; g.fillRect(r() * 640, 270 + r() * 178, 14 + r() * 26, 3); }
  g.fillStyle = "#3a2a2a"; g.beginPath(); g.moveTo(170, 280); g.lineTo(470, 280); g.lineTo(440, 318); g.lineTo(200, 318); g.closePath(); g.fill();
  g.fillStyle = "#e8e0d0"; g.fillRect(250, 236, 120, 46); g.fillStyle = "#a83a22"; g.fillRect(300, 196, 26, 42); g.fillStyle = "#2a2020"; g.fillRect(300, 190, 26, 10);
  for (const x of [30, 90, 560, 610]) { g.fillStyle = "#d8d0c0"; g.fillRect(x - 22, 200, 44, 70); g.fillStyle = "#c0b8a8"; g.beginPath(); g.ellipse(x, 200, 22, 6, 0, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(255,240,200,0.8)"; g.beginPath(); g.arc(520, 110, 34, 0, TAU); g.fill();
  speck(g, r, 640, 448, 2000, ["#ffffff", "#000000"], 1, 3, 0.06);
});
const clockFaceTex = (key = "clock", rim = "#c9a14a") => tx(key, 256, 256, (g) => {
  g.fillStyle = rim; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
  g.fillStyle = "#f6f0e0"; g.beginPath(); g.arc(128, 128, 108, 0, TAU); g.fill();
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU, l = k % 5 ? 8 : 20, w = k % 5 ? 2 : 6; g.strokeStyle = "#2a2030"; g.lineWidth = w; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * (100 - l), 128 - Math.cos(a) * (100 - l)); g.stroke(); }
}, true);
/** shelves of ledgers / binders (the back panel of a bookcase; 512 x 640 = 1.8 x 2.25 m) */
const booksTex = (key: string, pal: string[]) => tx(key, 512, 640, (g, r) => {
  g.fillStyle = "#3a1c10"; g.fillRect(0, 0, 512, 640);
  for (let s = 0; s < 5; s++) {
    const y0 = 16 + s * 124, y1 = y0 + 104; let x = 10;
    while (x < 500) {
      const w = 12 + r() * 22, h = 70 + r() * 30, c = jit(r, pal[Math.floor(r() * pal.length) % pal.length], 0.12);
      if (r() < 0.07) { x += 20; continue; }
      g.fillStyle = c; g.fillRect(x, y1 - h, w, h); g.fillStyle = "rgba(255,230,180,0.5)"; g.fillRect(x + 2, y1 - h + 10, w - 4, 3); g.fillRect(x + 2, y1 - 18, w - 4, 3);
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + w - 3, y1 - h, 3, h); x += w + 1;
    }
    g.fillStyle = "#5a2e1a"; g.fillRect(0, y1, 512, 18); g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(0, y1 + 18, 512, 4);
  }
});
/** a leaf card (rubber plant / kitchen herbs): alpha, a midrib */
const leafTex = (key: string, col: string) => tx(key, 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256);
  g.fillStyle = col; g.beginPath(); g.moveTo(64, 250); g.bezierCurveTo(4, 180, 10, 40, 64, 6); g.bezierCurveTo(118, 40, 124, 180, 64, 250); g.fill();
  g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(64, 240); g.bezierCurveTo(24, 180, 26, 50, 64, 14); g.lineTo(64, 240); g.fill();
  g.strokeStyle = shadeHex(col, -0.15); g.lineWidth = 4; g.beginPath(); g.moveTo(64, 250); g.lineTo(64, 14); g.stroke();
  g.strokeStyle = "rgba(30,40,30,0.6)"; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 250); g.bezierCurveTo(4, 180, 10, 40, 64, 6); g.bezierCurveTo(118, 40, 124, 180, 64, 250); g.stroke();
}, true);
/** a framed certificate (ornate border, script lines, a gold seal; no readable words) */
const certTex = () => tx("bkCertT", 480, 640, (g, r) => {
  g.fillStyle = "#f4ecd6"; g.fillRect(0, 0, 480, 640); speck(g, r, 480, 640, 900, ["#d8c8a0"], 1, 3, 0.3);
  g.strokeStyle = "#6a4a8a"; g.lineWidth = 10; g.strokeRect(18, 18, 444, 604); g.lineWidth = 3; g.strokeRect(36, 36, 408, 568);
  g.strokeStyle = "rgba(40,30,60,0.75)"; g.lineWidth = 6; g.beginPath(); for (let x = 90; x < 390; x += 6) g.lineTo(x, 120 + 10 * Math.sin(x * 0.12)); g.stroke();
  g.lineWidth = 3; for (let y = 200; y < 470; y += 34) { g.beginPath(); g.moveTo(80, y); for (let x = 80; x < 400; x += 8) g.lineTo(x, y + 3 * Math.sin(x * 0.3 + y)); g.stroke(); }
  g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(360, 540, 46, 0, TAU); g.fill(); g.fillStyle = "#a8203a"; g.fillRect(340, 570, 14, 50); g.fillRect(366, 570, 14, 50);
}, true);
/** brass plaque with engraved text */
const plaqueTex = (key: string, text: string, w = 512, h = 140) => tx(key, w, h, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f0d27a"); gr.addColorStop(0.5, "#c9a14a"); gr.addColorStop(1, "#9a7428");
  g.fillStyle = gr; rrect(g, 2, 2, w - 4, h - 4, 14); g.fill(); g.strokeStyle = "#6a4a18"; g.lineWidth = 6; rrect(g, 10, 10, w - 20, h - 20, 10); g.stroke();
  ctext(g, text, w / 2, h * 0.7, h * 0.56, "#3a2408", w * 0.86, "Georgia, serif", "bold");
}, true);
/** a tufted burgundy leather chair back */
const leatherTex = (key: string, base: string) => tx(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); mottle(g, r, 256, 256, 40, [shadeHex(base, 0.06), shadeHex(base, -0.06)], 10, 30, 0.4);
  for (let y = 32; y < 256; y += 64) for (let x = (y / 64) % 2 ? 64 : 32; x < 256; x += 64) {
    g.fillStyle = "rgba(255,220,200,0.12)"; g.beginPath(); g.arc(x - 6, y - 6, 22, 0, TAU); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 32, y + 32); g.moveTo(x, y); g.lineTo(x - 32, y + 32); g.stroke();
    g.fillStyle = "#c9a14a"; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
  }
});
const radiatorTex = (key: string, base: string) => tx(key, 512, 128, (g) => {
  g.fillStyle = shadeHex(base, -0.12); g.fillRect(0, 0, 512, 128);
  for (let x = 0; x < 512; x += 24) { const gr = g.createLinearGradient(x, 0, x + 20, 0); gr.addColorStop(0, shadeHex(base, -0.05)); gr.addColorStop(0.4, shadeHex(base, 0.08)); gr.addColorStop(1, shadeHex(base, -0.14)); g.fillStyle = gr; rrect(g, x + 2, 4, 18, 120, 8); g.fill(); }
});

// ---------------- fix r2 bank painters ----------------
/** A2 P2 shot 5: the desk front as TWO raised panels (vertical figure grain, a 512 px tile for 1.0 x 0.5 m, no stretch)
 *  with brass corner bosses */
const bkDeskFrontTex = () => tx("bkDeskFront", 512, 256, (g, r) => {
  g.fillStyle = "#4e2416"; g.fillRect(0, 0, 512, 256); grain(g, r, 0, 0, 512, 256, 30, "#1e0c06", false, 0.05, 0.12);
  for (const x of [20, 266]) {
    panel(g, r, x, 22, 226, 200, "#6e321c", 14, false);
    for (const [bx, by] of [[x + 9, 31], [x + 217, 31], [x + 9, 213], [x + 217, 213]]) {
      g.fillStyle = "#e0b850"; g.beginPath(); g.arc(bx, by, 7, 0, TAU); g.fill(); g.strokeStyle = "rgba(60,30,10,0.75)"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "rgba(255,250,210,0.85)"; g.beginPath(); g.arc(bx - 2, by - 2, 2.4, 0, TAU); g.fill();
    }
  }
  g.fillStyle = "rgba(255,210,160,0.12)"; g.fillRect(0, 0, 512, 6); g.fillStyle = "rgba(20,8,4,0.35)"; g.fillRect(0, 236, 512, 20);
});
/** fix r2 (A2 P2 shot 15): the investor's honey-oak desk front: two raised panels, a carved trim line, brass corner bosses */
const ofDeskFrontTex = () => tx("ofDeskFront", 512, 300, (g, r) => {
  g.fillStyle = "#8a5a2e"; g.fillRect(0, 0, 512, 300); grain(g, r, 0, 0, 512, 300, 30, "#3a1e0c", false, 0.05, 0.12);
  g.strokeStyle = "rgba(60,30,12,0.6)"; g.lineWidth = 3; g.strokeRect(10, 10, 492, 280); g.strokeStyle = "rgba(255,220,170,0.25)"; g.lineWidth = 2; g.strokeRect(13, 13, 486, 274);
  for (const x of [26, 266]) { panel(g, r, x, 34, 220, 226, "#a8703e", 14, false);
    for (const [bx, by] of [[x + 9, 43], [x + 211, 43], [x + 9, 251], [x + 211, 251]]) { g.fillStyle = "#e0b850"; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill(); g.fillStyle = "rgba(255,250,210,0.85)"; g.beginPath(); g.arc(bx - 2, by - 2, 2, 0, TAU); g.fill(); } }
  g.fillStyle = "rgba(255,220,170,0.14)"; g.fillRect(0, 0, 512, 6); g.fillStyle = "rgba(40,18,8,0.32)"; g.fillRect(0, 280, 512, 20);
});
/** a window-pane light patch (2 x 3 panes with soft mullion shadows; additive, feathered) */
const paneLightTex = () => tx("ofPaneLight", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = 18 + i * 78, y = 26 + j * 104, gr = g.createLinearGradient(x, y, x + 64, y + 90); gr.addColorStop(0, "rgba(255,232,180,0.95)"); gr.addColorStop(1, "rgba(255,214,150,0.75)"); g.fillStyle = gr; rrect(g, x, y, 64, 92, 6); g.fill(); }
  g.filter = "blur(3px)"; g.drawImage(g.canvas, 0, 0); g.filter = "none";
  const m2 = g.createRadialGradient(128, 128, 40, 128, 128, 132); m2.addColorStop(0, "rgba(0,0,0,0)"); m2.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = m2; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = "source-over";
}, true);
/** a wicker waste basket weave (u around, v up) */
const wickerTex = () => tx("bkWicker", 256, 128, (g, r) => {
  g.fillStyle = "#a8763e"; g.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 128; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < 256; x += 16) { g.fillStyle = jit(r, "#c8945a", 0.1); rrect(g, x + 1, y + 1, 14, 6, 3); g.fill(); g.fillStyle = "rgba(60,30,10,0.35)"; g.fillRect(x + 1, y + 6, 14, 1); }
  g.fillStyle = "#6a4422"; g.fillRect(0, 0, 256, 8); g.fillRect(0, 120, 256, 8);
});
/** soft parallel light stripes (venetian blinds): white on transparent, 7 slats, feathered */
const blindStripeTex = () => tx("bkBlindStripes", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (let k = 0; k < 7; k++) { const y = 10 + k * 35, gr = g.createLinearGradient(0, y, 0, y + 22); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, y, 256, 22); }
  const m2 = g.createRadialGradient(128, 128, 40, 128, 128, 132); m2.addColorStop(0, "rgba(0,0,0,0)"); m2.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = m2; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = "source-over";
}, true);
/** a flat gravel yard (the near ground outside the bank window): gravel, tyre tracks, puddles */
const yardFlatTex = () => tx("bkYardFlat", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#9e967f"); gr.addColorStop(1, "#b2aa94"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  speck(g, r, 512, 256, 2600, ["#7a7262", "#c4bca8", "#6a6252"], 1, 4, 0.55);
  for (const y of [60, 84]) { g.strokeStyle = "rgba(70,62,52,0.35)"; g.lineWidth = 7; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 20, 340, y - 20, 512, y + 6); g.stroke(); }
  for (let i = 0; i < 4; i++) { const x = r() * 512, y = 120 + r() * 120; g.fillStyle = "rgba(130,160,200,0.6)"; g.beginPath(); g.ellipse(x, y, 34 + r() * 30, 9 + r() * 5, 0, 0, TAU); g.fill(); g.fillStyle = "rgba(235,245,255,0.55)"; g.fillRect(x - 12, y - 3, 20, 2); }
  g.fillStyle = "#c8c0aa"; g.fillRect(0, 0, 512, 6);
});
/** a grey city pigeon (two frames: 0 = standing, 1 = mid-hop, wings up) */
const pigeonTex = (k: number) => tx("bkPigeon" + k, 96, 72, (g) => {
  g.clearRect(0, 0, 96, 72); const ink = "#2c1e2a";
  g.fillStyle = "#8a8e9c"; g.beginPath(); g.ellipse(46, 44, 26, 15, -0.15, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#6a7088"; g.beginPath(); g.ellipse(26, 30, 11, 10, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#5a9a8a"; g.fillRect(28, 36, 10, 6);
  g.fillStyle = "#e8a040"; g.beginPath(); g.moveTo(15, 30); g.lineTo(8, 33); g.lineTo(15, 34); g.closePath(); g.fill();
  g.fillStyle = "#1a1420"; g.beginPath(); g.arc(23, 28, 2, 0, TAU); g.fill();
  g.fillStyle = "#5e6274"; g.beginPath(); if (k) { g.moveTo(44, 38); g.lineTo(70, 8); g.lineTo(76, 34); } else { g.moveTo(44, 40); g.lineTo(78, 46); g.lineTo(60, 54); } g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#4a4e5e"; g.beginPath(); g.moveTo(70, 46); g.lineTo(92, 42); g.lineTo(88, 52); g.closePath(); g.fill();
  if (!k) { g.strokeStyle = "#c8506a"; g.lineWidth = 3; g.beginPath(); g.moveTo(44, 58); g.lineTo(42, 68); g.moveTo(52, 58); g.lineTo(54, 68); g.stroke(); }
}, true);
/** a 1963 desk calendar block (cream card, red header) */
const deskCalTex = () => tx("bkDeskCal", 160, 200, (g) => {
  g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 160, 200); g.fillStyle = "#b8302a"; g.fillRect(0, 0, 160, 54);
  ctext(g, "MAY", 80, 42, 38, "#fbf4e4", 140); ctext(g, "1963", 80, 150, 64, "#2a2030", 150);
  g.strokeStyle = "#2a2030"; g.lineWidth = 4; g.strokeRect(2, 2, 156, 196);
}, true);
/** a fringe strip (white wool tassels on transparent) for the rug edges */
const fringeTex = () => tx("bkFringe", 256, 32, (g) => {
  g.clearRect(0, 0, 256, 32); for (let x = 2; x < 256; x += 6) { g.strokeStyle = "rgba(238,226,196,0.95)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 1, 28); g.stroke(); }
}, true);
/** a canvas money sack with a stencilled dollar sign (a symbol, no lettering) */
const sackTex = () => tx("bkSack", 256, 256, (g, r) => {
  g.fillStyle = "#c8b48a"; g.fillRect(0, 0, 256, 256); speck(g, r, 256, 256, 900, ["#a8946a", "#dccaa0"], 1, 3, 0.5);
  for (let y = 0; y < 256; y += 6) { g.fillStyle = "rgba(120,100,60,0.12)"; g.fillRect(0, y, 256, 2); }
  font(g, 150, '"Arial Black", Arial, sans-serif'); g.textAlign = "center"; g.fillStyle = "rgba(40,90,60,0.85)"; g.fillText("$", 128, 190);
});

/** the vault interior seen through the open round door: warm-lit shelves of cash bundles + sacks, dark plum depth */
const vaultInTex = () => tx("bkVaultIn", 256, 256, (g, r) => {
  const gr = g.createRadialGradient(128, 120, 10, 128, 128, 140); gr.addColorStop(0, "#6a4a36"); gr.addColorStop(1, "#1e1218"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (const y of [70, 128, 186]) { g.fillStyle = "#3a2418"; g.fillRect(20, y, 216, 8); g.fillStyle = "rgba(255,200,140,0.25)"; g.fillRect(20, y, 216, 2);
    let x = 34; while (x < 220) { if (r() < 0.35) { g.fillStyle = "#b8a47a"; g.beginPath(); g.ellipse(x + 12, y - 14, 13, 15, 0, 0, TAU); g.fill(); g.fillStyle = "rgba(40,90,60,0.7)"; font(g, 14); g.textAlign = "center"; g.fillText("$", x + 12, y - 9); x += 28; }
      else { for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? "#8aa878" : "#9ab98a"; g.fillRect(x, y - 6 - k * 7, 24, 6); g.fillStyle = "#f0e2b0"; g.fillRect(x + 14, y - 6 - k * 7, 4, 6); } x += 28; } } }
  g.strokeStyle = "rgba(20,10,14,0.8)"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 123, 0, TAU); g.stroke();
}, true);
/** a far generic cargo ship (side-on, faces left): hull, white superstructure, one red funnel (no markings) */
const shipTex = () => tx("bkShip", 256, 96, (g) => {
  g.clearRect(0, 0, 256, 96); const ink = "rgba(44,30,42,0.8)";
  g.fillStyle = "#4a5a6e"; g.beginPath(); g.moveTo(6, 60); g.lineTo(250, 60); g.lineTo(236, 84); g.lineTo(24, 84); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#e8e2d4"; g.fillRect(150, 34, 70, 26); g.strokeRect(150, 34, 70, 26); g.fillStyle = "#8aa0b8"; for (let x = 156; x < 214; x += 12) g.fillRect(x, 40, 7, 6);
  g.fillStyle = "#c4402a"; g.fillRect(178, 10, 20, 24); g.fillStyle = "#2a2a2e"; g.fillRect(178, 8, 20, 6);
  g.strokeStyle = "#5a5a64"; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 60); g.lineTo(60, 22); g.lineTo(100, 60); g.stroke();
}, true);

// ======================================================================================================== TRADING painters
/** grey-green linoleum tiles (0.5 m) with specks (2 m tile) */
const trFloorTex = () => tx("trFloor", 1024, 1024, (g, r) => {
  // fix r3 (A3 P2 shot 8: the floor rendered a saturated green #5E875F): warm-grey linoleum tiles (~30 % less green), so
  // the room's green lives in the walls and the board only
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = jit(r, (x + y) % 2 ? "#8a8478" : "#979080", 0.05); g.fillRect(x * 256, y * 256, 256, 256); }
  speck(g, r, 1024, 1024, 9000, ["#635e54", "#b0aa98", "#6e6458"], 1, 4, 0.35);
  mottle(g, r, 1024, 1024, 120, ["#4e5248", "#9a9a88"], 20, 80, 0.08);
  for (let k = 0; k <= 4; k++) { g.fillStyle = "rgba(40,44,36,0.45)"; g.fillRect(k * 256 - 1, 0, 3, 1024); g.fillRect(0, k * 256 - 1, 1024, 3); }
});
/** green-grey upper wall plaster with a faint stencil band (2 m tile) */
const trWallTex = () => tx("trWall", 512, 512, (g, r) => {
  g.fillStyle = "#7e8c84"; g.fillRect(0, 0, 512, 512); mottle(g, r, 512, 512, 200, ["#74827a", "#8a988e"], 20, 60, 0.15);
  speck(g, r, 512, 512, 900, ["#6e7a6a", "#a8b4a4"], 1, 2.5, 0.25);
});
/** dark oak wainscot (1 m module x 1.4 m) */
const trWainTex = () => tx("trWain", 512, 716, (g, r) => {
  g.fillStyle = "#3e2a1a"; g.fillRect(0, 0, 512, 716); grain(g, r, 0, 0, 512, 716, 80, "#140a04", false);
  panel(g, r, 46, 60, 420, 560, "#5c3e26", 18, false);
  g.fillStyle = "#2a1a0e"; g.fillRect(0, 676, 512, 40); g.fillStyle = "rgba(255,220,170,0.12)"; g.fillRect(0, 0, 512, 12);
});
/** the chalk board: dark green slate, chalk haze + ghosts of erased lines, the title, axes and a dashed grid (no numbers) */
const SOY = { w: 5.2, h: 3.0, px: 2048 / 5.2 };
const soyBoardTex = () => tx("trSoy2", 2048, 1182, (g, r) => {
  const W = 2048, H = 1182, P = SOY.px;
  g.fillStyle = "#26382e"; g.fillRect(0, 0, W, H);
  mottle(g, r, W, H, 260, ["#2e4236", "#1e3026", "#344a3c"], 30, 140, 0.35);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(230,240,230,${0.03 + 0.04 * r()})`; g.lineWidth = 30 + r() * 60; g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.bezierCurveTo(x + 100, y - 40, x + 220, y + 40, x + 340 * r(), y + 20); g.stroke(); }
  speck(g, r, W, H, 6000, ["#e8efe6"], 1, 3, 0.12);
  // title (top) + an underline
  g.save(); g.shadowColor = "rgba(240,245,240,0.4)"; g.shadowBlur = 6;
  ctext(g, "SOYBEAN OIL", W / 2, 0.47 * P, 0.36 * P, "#f2f2ea", W * 0.8);   // fix r2 (A2 P2 #15): 0.05 m lower (clear of the top molding)
  g.restore();
  g.fillStyle = "rgba(242,242,234,0.75)"; g.fillRect(W * 0.2, 0.565 * P, W * 0.6, 7);
  // axes (board local: x -2.3..2.35, y -1.2..0.75 around the centre)
  const BX = (x: number) => (x + SOY.w / 2) * P, BY = (y: number) => (SOY.h / 2 - y) * P;
  g.strokeStyle = "rgba(242,242,234,0.85)"; g.lineWidth = 9; g.lineCap = "round";
  g.beginPath(); g.moveTo(BX(-2.3), BY(0.78)); g.lineTo(BX(-2.3), BY(-1.25)); g.lineTo(BX(2.35), BY(-1.25)); g.stroke();
  g.lineWidth = 4; g.setLineDash([22, 18]);
  for (const y of [-0.85, -0.45, -0.05, 0.35]) { g.strokeStyle = "rgba(230,236,226,0.28)"; g.beginPath(); g.moveTo(BX(-2.25), BY(y)); g.lineTo(BX(2.3), BY(y)); g.stroke(); }
  g.setLineDash([]);
  for (let k = 0; k < 9; k++) { const x = -2.3 + (k + 1) * 0.5; g.strokeStyle = "rgba(242,242,234,0.7)"; g.lineWidth = 6; g.beginPath(); g.moveTo(BX(x), BY(-1.25)); g.lineTo(BX(x), BY(-1.35)); g.stroke(); }
  // a ghost of last week's erased line
  g.strokeStyle = "rgba(230,240,230,0.1)"; g.lineWidth = 14; g.beginPath(); g.moveTo(BX(-2.2), BY(-0.6)); g.bezierCurveTo(BX(-1), BY(0), BX(0.5), BY(-0.7), BX(2.2), BY(-0.2)); g.stroke();
}, true);
/** coffered ceiling (1.5 m tile): beams, recessed panels with an inner shadow, a gilt rosette */
const trCeilTex = () => tx("trCeil", 512, 512, (g, r) => {
  g.fillStyle = "#b8c4b6"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#9eac9e"; g.fillRect(60, 60, 392, 392); g.fillStyle = "#acb8a8"; g.fillRect(84, 84, 344, 344);
  g.fillStyle = "rgba(60,56,44,0.35)"; g.fillRect(60, 60, 392, 10); g.fillRect(60, 60, 10, 392);
  g.fillStyle = "rgba(255,250,235,0.35)"; g.fillRect(60, 442, 392, 10); g.fillRect(442, 60, 10, 392);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.fillStyle = "#c9a14a"; g.beginPath(); g.ellipse(256 + Math.cos(a) * 34, 256 + Math.sin(a) * 34, 16, 7, a, 0, TAU); g.fill(); }
  g.fillStyle = "#a8843a"; g.beginPath(); g.arc(256, 256, 18, 0, TAU); g.fill();
  speck(g, r, 512, 512, 900, ["#9a9686", "#e4e0d0"], 1, 2.5, 0.25);
});
/** a chalk stroke (u along the stroke): white, ragged alpha */
const chalkTex = (key: string, col: string) => tx(key, 512, 32, (g, r) => {
  g.clearRect(0, 0, 512, 32);
  for (let i = 0; i < 2600; i++) { const y = 16 + (r() - 0.5) * 26 * (0.5 + 0.5 * r()); g.fillStyle = rgba(col, 0.35 + 0.6 * r()); g.fillRect(r() * 512, y, 2 + r() * 5, 1.5 + r() * 2); }
  g.fillStyle = rgba(col, 0.75); g.fillRect(0, 9, 512, 14);
}, false);
/** a storm window view: grey cloud bands, a hazy city, rain on the glass (opaque) */
const stormTex = (key: string, w: number, h: number) => tx(key, w, h, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5c6678"); gr.addColorStop(0.55, "#8a94a6"); gr.addColorStop(1, "#a6aeba");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "70,78,96" : "160,168,184"},0.28)`; g.beginPath(); g.ellipse(r() * w, r() * h * 0.6, 60 + r() * 120, 18 + r() * 30, 0, 0, TAU); g.fill(); }
  let x = 0; while (x < w) { const bw = 20 + r() * 50, bh = h * (0.15 + r() * 0.3); g.fillStyle = jit(r, "#6a7486", 0.08); g.fillRect(x, h - bh, bw, bh); for (let k = 0; k < 6; k++) { g.fillStyle = r() < 0.25 ? "rgba(255,220,150,0.6)" : "rgba(40,46,60,0.5)"; g.fillRect(x + 4 + r() * (bw - 10), h - bh + 10 + r() * (bh - 20), 5, 7); } x += bw + 4; }
  g.strokeStyle = "rgba(220,228,240,0.35)"; g.lineWidth = 2; for (let i = 0; i < 160; i++) { const sx = r() * w, sy = r() * h; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 5, sy + 30 + r() * 30); g.stroke(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(230,236,245,0.55)"; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 3, 3 + r() * 5, 0, 0, TAU); g.fill(); }
}, true);
/** running rain on the glass (alpha; its offset scrolls each frame) */
const rainTex = () => tx("rainRun", 256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512);
  for (let i = 0; i < 120; i++) { const x = r() * 256, y = r() * 512, L = 20 + r() * 50; g.strokeStyle = `rgba(230,238,250,${0.25 + 0.35 * r()})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + L); g.stroke(); if (y + L > 512) { g.beginPath(); g.moveTo(x, y - 512); g.lineTo(x - 3, y + L - 512); g.stroke(); } }
});
/** a trading slip / ticker tape */
const slipTex = (k: number) => tx("trSlip" + k, 128, 96, (g, r) => {
  const pal = ["#f4efe0", "#f6e6a8", "#e8f0f4", "#f4d6d0"]; g.fillStyle = pal[k % 4]; g.fillRect(0, 0, 128, 96);
  g.strokeStyle = "rgba(40,40,80,0.55)"; g.lineWidth = 3; for (let y = 22; y < 90; y += 16) { g.beginPath(); g.moveTo(10, y); g.lineTo(20 + r() * 90, y); g.stroke(); }
  g.fillStyle = "rgba(160,40,30,0.7)"; g.fillRect(96, 10, 20, 20);
}, true);
/** fix r3 (A3 P2 shot 8): the board boy on the rolling ladder (BACK view toward the board: white shirt + black sleeve
 *  garters, a green eyeshade band, dark trousers); k = 0 his right hand on the ladder rail (the chalk arm is a separate
 *  rod that rides the line tip), 1 = the crash: both hands clutching the rails, shoulders up */
const boardBoyTex = (k: number) => tx("trBoy3_" + k, 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256); g.lineCap = "round"; g.lineJoin = "round"; const ink = "#2c1e2a", shirt = "#f6f4ee";
  g.strokeStyle = "#2e3040"; g.lineWidth = 14; for (const a of [-10, 10]) { g.beginPath(); g.moveTo(64 + a * 0.5, 172); g.lineTo(64 + a, 244); g.stroke(); g.fillStyle = "#1e1a22"; g.beginPath(); g.ellipse(64 + a, 247, 11, 6, 0, 0, TAU); g.fill(); }
  const arm = (x0: number, hx: number, hy: number) => { g.strokeStyle = shirt; g.lineWidth = 13; g.beginPath(); g.moveTo(x0, 108); g.lineTo(hx, hy); g.stroke(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
    g.strokeStyle = "#1e1a22"; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 + (hx - x0) * 0.45 - 6, 108 + (hy - 108) * 0.45); g.lineTo(x0 + (hx - x0) * 0.45 + 6, 108 + (hy - 108) * 0.45); g.stroke();
    g.fillStyle = "#f8f3ee"; g.beginPath(); g.arc(hx, hy, 8, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke(); };
  if (k === 1) { arm(40, 20, 52); arm(88, 108, 52); } else arm(90, 112, 138);
  g.fillStyle = shirt; rrect(g, 36, 98, 56, 80, 15); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.strokeStyle = "#3a2a24"; g.lineWidth = 5; g.beginPath(); g.moveTo(46, 100); g.lineTo(46, 174); g.moveTo(82, 100); g.lineTo(82, 174); g.stroke();
  const hy = k === 1 ? 62 : 68;
  g.fillStyle = "#f8f3ee"; g.beginPath(); g.ellipse(64, hy, 28, 32, 0, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#5a3a22"; g.beginPath(); g.ellipse(64, hy - 4, 27, 27, 0, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(90, hy + 6); g.bezierCurveTo(78, hy + 22, 50, hy + 22, 38, hy + 6); g.closePath(); g.fill();
  g.fillStyle = "#2f8a4a"; g.fillRect(36, hy - 14, 56, 10); g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(36, hy - 14, 56, 10);
  for (const s2 of [-1, 1]) { g.fillStyle = "rgba(47,138,74,0.85)"; g.beginPath(); g.moveTo(64 + s2 * 28, hy - 14); g.lineTo(64 + s2 * 40, hy - 6); g.lineTo(64 + s2 * 28, hy - 4); g.closePath(); g.fill(); }
  if (k === 1) { g.strokeStyle = ink; g.lineWidth = 2.5; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(64 + s2 * 34, hy - 30); g.lineTo(64 + s2 * 42, hy - 40); g.stroke(); } }
}, true);
/** fix r3: the spooling ticker tape (its own texture so only this tape scrolls) */
const tapeTex3 = () => tx("trTape3", 512, 32, (g, r) => {
  g.fillStyle = "#f2ead2"; g.fillRect(0, 0, 512, 32);
  for (let x = 6; x < 506; x += 9) if (r() < 0.6) { g.fillStyle = "rgba(40,40,60,0.75)"; g.fillRect(x, 10 + (r() < 0.5 ? 0 : 6), 5, 6); }
});
const tapeTex = () => tx("trTape", 512, 32, (g, r) => {
  g.fillStyle = "#f2ead2"; g.fillRect(0, 0, 512, 32);
  for (let x = 6; x < 506; x += 9) if (r() < 0.6) { g.fillStyle = "rgba(40,40,60,0.75)"; g.fillRect(x, 10 + (r() < 0.5 ? 0 : 6), 5, 6); }
}, true);

/** fix r2 (A2 P2 shot 8): a painted pit trader (BACK view, toward the board): bean head with hair, white shirt with
 *  suspenders / a vest, dark trousers; k = 0 one arm up waving a slip, 1 both arms up, 2 a phone at the ear;
 *  v = palette variant. Plum ink like the cast. */
const trTraderTex = (v: number, k: number) => tx(`trTrader${v}_${k}`, 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256); g.lineCap = "round"; g.lineJoin = "round";
  const ink = "#2c1e2a", hair = ["#2a1e18", "#6a3a1e", "#4a4a52", "#c8783a", "#1e1a22"][v % 5], vest = ["", "#3a4a6a", "", "#5a4a3a", "#6a2a2a"][v % 5], susp = ["#6a2a2a", "", "#2a3a5a", "", ""][v % 5];
  const trou = ["#3a3448", "#2e3040", "#4a4038", "#2a2a34", "#3e3a44"][v % 5], shirt = v % 4 === 3 ? "#e8eef6" : "#f6f4ee";
  // legs + shoes
  g.strokeStyle = trou; g.lineWidth = 14; for (const a of [-10, 10]) { g.beginPath(); g.moveTo(64 + a * 0.5, 170); g.lineTo(64 + a, 246); g.stroke(); g.fillStyle = "#1e1a22"; g.beginPath(); g.ellipse(64 + a, 248, 11, 6, 0, 0, TAU); g.fill(); }
  // arms (behind the torso when raised: drawn first)
  const arm = (x0: number, up: boolean, phone: boolean, side: number) => {
    g.strokeStyle = shirt; g.lineWidth = 14; g.beginPath(); g.moveTo(x0, 106);
    if (k === 3) { g.lineTo(x0 + side * 18, 86); g.lineTo(64 + side * 27, 50); } else if (phone) { g.lineTo(x0 + side * 10, 120); g.lineTo(64 + side * 22, 80); } else if (up) { g.lineTo(x0 + side * 14, 70); g.lineTo(x0 + side * 18, 30); } else { g.lineTo(x0 + side * 6, 150); }
    g.stroke(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
    const hx = k === 3 ? 64 + side * 27 : phone ? 64 + side * 22 : up ? x0 + side * 18 : x0 + side * 6, hy = k === 3 ? 50 : phone ? 80 : up ? 28 : 154;
    g.fillStyle = "#f8f3ee"; g.beginPath(); g.arc(hx, hy, 8, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
    if (up && !phone) { g.fillStyle = ["#f4efe0", "#f6e6a8", "#f4d6d0"][(v + (side > 0 ? 1 : 0)) % 3]; g.save(); g.translate(hx, hy - 12); g.rotate(side * 0.3); g.fillRect(-11, -9, 22, 16); g.strokeStyle = "rgba(40,40,80,0.5)"; g.lineWidth = 2; g.strokeRect(-11, -9, 22, 16); g.restore(); }
    if (phone) { g.fillStyle = "#141418"; g.save(); g.translate(hx + side * 2, hy - 2); g.rotate(-side * 0.8); g.fillRect(-4, -16, 8, 32); g.restore(); }
  };
  if (k !== 3) { arm(40, k === 0 || k === 1, false, -1); arm(88, k === 1, k === 2, 1); }
  // torso (back): shirt, a vest or suspenders
  g.fillStyle = shirt; rrect(g, 34, 96, 60, 82, 16); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  if (vest) { g.fillStyle = vest; rrect(g, 37, 100, 54, 70, 12); g.fill(); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(62, 104, 4, 60); }
  if (susp) { g.strokeStyle = susp; g.lineWidth = 6; g.beginPath(); g.moveTo(44, 98); g.lineTo(80, 170); g.moveTo(84, 98); g.lineTo(48, 170); g.stroke(); }
  g.strokeStyle = "rgba(60,50,60,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 168); g.lineTo(88, 168); g.stroke();
  // head from behind: hair covers most of it, ears
  g.fillStyle = "#f8f3ee"; g.beginPath(); g.ellipse(64, 66, 30, 34, 0, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = hair; g.beginPath(); g.ellipse(64, 60, 29, 30, 0, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(92, 74); g.bezierCurveTo(80, 92, 48, 92, 36, 74); g.closePath(); g.fill();
  for (const s2 of [-1, 1]) { g.fillStyle = "#f2e6dc"; g.beginPath(); g.ellipse(64 + s2 * 31, 72, 6, 9, 0, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke(); }
  if (k === 3) { arm(40, false, false, -1); arm(88, false, false, 1); }   // hands clutching the head (drawn over it)
}, true);

// ======================================================================================================== CUTAWAY painters + shaders
/** the diagram floor: deep navy with a white grid (1 m / 0.25 m) */
const cuGridTex = () => tx("cuGrid", 512, 512, (g) => {
  g.fillStyle = "#1a3466"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(170,205,245,0.13)"; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, 512); g.moveTo(0, k * 128); g.lineTo(512, k * 128); g.stroke(); }
  g.strokeStyle = "rgba(190,220,255,0.32)"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 0); g.moveTo(0, 0); g.lineTo(0, 512); g.stroke();
});
/** the inside of the steel shell. fix r1 (A1 P2 shots 10 / 12: the empty upper tank read as a dark violet 'ghost
 *  dome'): an EVEN blueprint-blue gradient (#5A6AAE low -> #3A4A8A high, v 0 -> 1 over the full height), four ring
 *  seams with rivet rows and vertical plate seams, so the curved back wall reads as a round steel shell */
const cuSteelInTex = () => tx("cuSteelIn2", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 1024, 0, 0); gr.addColorStop(0, "#5a6aae"); gr.addColorStop(1, "#3a4a8a"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  mottle(g, r, 1024, 1024, 120, ["#4e5ea0", "#6474b4"], 30, 90, 0.18);
  for (let k = 1; k < 6; k++) { const y = 1024 - k * 171; g.fillStyle = "rgba(20,28,70,0.55)"; g.fillRect(0, y - 3, 1024, 6); g.fillStyle = "rgba(170,190,240,0.25)"; g.fillRect(0, y + 3, 1024, 2);
    for (let x = 6; x < 1024; x += 22) { g.fillStyle = "rgba(20,28,70,0.6)"; g.beginPath(); g.arc(x, y + 12, 3.2, 0, TAU); g.fill(); g.fillStyle = "rgba(190,205,250,0.35)"; g.beginPath(); g.arc(x - 1, y + 11, 1.3, 0, TAU); g.fill(); } }
  for (let row = 0; row < 6; row++) for (let k = 0; k < 6; k++) { const x = (k * 171 + (row % 2) * 85) % 1024, y0 = 1024 - (row + 1) * 171; g.fillStyle = "rgba(20,28,70,0.4)"; g.fillRect(x, y0, 4, 171); }
  for (let i = 0; i < 14; i++) { const x = r() * 1024, y0 = r() * 800, L = 80 + r() * 200, sg = g.createLinearGradient(0, y0, 0, y0 + L); sg.addColorStop(0, "rgba(140,90,80,0.28)"); sg.addColorStop(1, "rgba(140,90,80,0)"); g.fillStyle = sg; g.fillRect(x, y0, 4 + r() * 5, L); }
}, false);
/** the roof underside: the same blue, 8 radial rafters + a ring beam (u = angle, v = radius: 0 rim -> 1 centre) */
const cuRoofUnderTex = () => tx("cuRoofU", 1024, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#3e4e90"); gr.addColorStop(1, "#33427e"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  mottle(g, r, 1024, 256, 40, ["#38488a", "#4a5aa0"], 10, 40, 0.2);
  for (let k = 0; k <= 8; k++) { const x = (k / 8) * 1024; g.fillStyle = "rgba(18,24,60,0.75)"; g.fillRect(x - 9, 0, 18, 256); g.fillStyle = "rgba(160,180,235,0.35)"; g.fillRect(x - 9, 0, 3, 256); }
  g.fillStyle = "rgba(18,24,60,0.6)"; g.fillRect(0, 96, 1024, 12);
}, false);
/** the roof top: cream steel plates in rings with rivets + rust (u = angle, v = radius) */
// fix r2 (A2 P3 #34 / P2 #22: the dense radial seams moired into a paper fan; the roof read washed): warm cream #EFE3C8,
// 9 radial seams per tile (~36 over the half roof) at alpha ~0.35 with a rivet row on every third, a soft edge vignette
const cuRoofTopTex = () => tx("cuRoofT2", 1024, 256, (g, r) => {
  g.fillStyle = "#efe3c8"; g.fillRect(0, 0, 1024, 256); mottle(g, r, 1024, 256, 80, ["#e4d8bc", "#f6ecd6"], 10, 40, 0.3);
  for (const y of [64, 140, 206]) { g.fillStyle = "rgba(110,90,70,0.45)"; g.fillRect(0, y, 1024, 3); for (let x = 4; x < 1024; x += 20) { g.fillStyle = "rgba(100,80,64,0.55)"; g.beginPath(); g.arc(x, y + 8, 2.4, 0, TAU); g.fill(); } }
  for (let k = 0; k < 9; k++) { const x = (k / 9) * 1024; g.fillStyle = "rgba(110,90,70,0.35)"; g.fillRect(x, 0, 3, 256);
    if (k % 3 === 0) for (let y = 10; y < 256; y += 18) { g.fillStyle = "rgba(100,80,64,0.5)"; g.beginPath(); g.arc(x + 9, y, 2.2, 0, TAU); g.fill(); } }
  { const vg = g.createLinearGradient(0, 0, 0, 40); vg.addColorStop(0, "rgba(120,96,80,0.28)"); vg.addColorStop(1, "rgba(120,96,80,0)"); g.fillStyle = vg; g.fillRect(0, 0, 1024, 40); }
  for (let i = 0; i < 16; i++) { const x = r() * 1024, sg = g.createLinearGradient(0, 0, 0, 120); sg.addColorStop(0, "rgba(168,92,48,0.45)"); sg.addColorStop(1, "rgba(168,92,48,0)"); g.fillStyle = sg; g.fillRect(x, 0, 4 + 6 * r(), 120); }
}, false);
/** concrete section hatch (the foundation's cut face) */
const hatchTex = () => tx("cuHatch", 256, 256, (g, r) => {
  g.fillStyle = "#b8b4ac"; g.fillRect(0, 0, 256, 256); speck(g, r, 256, 256, 500, ["#8a867e", "#d0ccc4"], 2, 6, 0.6);
  g.strokeStyle = "rgba(60,56,52,0.6)"; g.lineWidth = 4; for (let k = -256; k < 512; k += 32) { g.beginPath(); g.moveTo(k, 256); g.lineTo(k + 256, 0); g.stroke(); }
});
/** the blueprint backdrop: a faint grid (#153A81-class lines on transparent; 1 m cells, 0.25 m sub-grid) */
const cuPrintTex = () => tx("cuPrint", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(150,190,250,0.10)"; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, 512); g.moveTo(0, k * 128); g.lineTo(512, k * 128); g.stroke(); }
  g.strokeStyle = "rgba(170,205,255,0.2)"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 1); g.lineTo(512, 1); g.moveTo(1, 0); g.lineTo(1, 512); g.stroke();
}, false);
const looksFullTex = () => tx("cuLooksFull", 800, 300, (g) => {
  g.fillStyle = "#f6f1e2"; rrect(g, 6, 6, 788, 288, 26); g.fill(); g.strokeStyle = "#1f7a3a"; g.lineWidth = 16; rrect(g, 16, 16, 768, 268, 20); g.stroke();
  ctext(g, "LOOKS FULL", 400, 196, 150, "#1f7a3a", 700);
  g.fillStyle = "#1f7a3a"; g.beginPath(); g.moveTo(712, 60); g.lineTo(750, 60); g.lineTo(731, 40); g.closePath();
}, true);
const ringTex = () => tx("cuRing", 64, 64, (g) => {
  g.clearRect(0, 0, 64, 64); g.strokeStyle = "rgba(235,248,255,0.95)"; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 25, 0, TAU); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(24, 23, 6, 0, TAU); g.fill(); g.fillStyle = "rgba(200,235,255,0.18)"; g.beginPath(); g.arc(32, 32, 24, 0, TAU); g.fill();
}, true);
/** a waving weed strand (alpha): a wavy stalk with leaflets */
const weedTex = () => tx("cuWeedT", 64, 256, (g) => {
  g.clearRect(0, 0, 64, 256); g.strokeStyle = "#2e7a4a"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); for (let y = 256; y >= 6; y -= 4) g.lineTo(32 + 6 * Math.sin(y * 0.05), y); g.stroke();
  for (let k = 0; k < 9; k++) { const y = 230 - k * 26, s = k % 2 ? 1 : -1, x = 32 + 6 * Math.sin(y * 0.05); g.fillStyle = k % 3 ? "#4aa06a" : "#3a8a5a"; g.beginPath(); g.ellipse(x + s * 12, y - 6, 13, 5, s * -0.6, 0, TAU); g.fill(); g.strokeStyle = "rgba(20,50,30,0.7)"; g.lineWidth = 2; g.stroke(); }
}, true);
/** a thin expanding splash / ripple ring (flat, white) */
const rippleTex = () => tx("cuRipple", 128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke(); g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 44, 0, TAU); g.stroke(); }, true);
/** linear colour that the Neutral tone map turns into the sRGB target */
const ut = (hex: string) => { const c = untone(hex); return new THREE.Vector3(c.r, c.g, c.b); };
/** the water: the FRONT cut face (see-through, so the curved back wall reads through it) and the BACK body (opaque, on
 *  the inner wall) share this shader; uFront = 1 for the front face (alpha), 0 for the back.
 *  fix r1: (A1 P2) a depth gradient #7FD3F5 -> #1F5FB0, the back body carries the shell's ring seams + vertical plate
 *  seams (they curve in perspective: a ROUND tank), AO toward both sides, a lighter translucent front face;
 *  (A1 P1) uDark = the 'unknown' state of shot 10: murky navy (#0B1638), no caustics, until "mostly" floods it clear;
 *  (A1 P2) uSl = the slosh tilt (m at x = R) after "water" */
const waterMat = (front: boolean) => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uLevel: { value: CUW }, uR: { value: CU.tank.r }, uTop: { value: ut("#7fd3f5") }, uBot: { value: ut("#1f5fb0") },
    uPour: { value: 0 }, uPourX: { value: CU.hatch.c[0] }, uFront: { value: front ? 1 : 0 }, uDark: { value: 0 }, uMurk: { value: ut("#0e3f78") }, uSl: { value: 0 }, uPh: { value: 0 } },
  vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `uniform float uT, uLevel, uR, uPour, uPourX, uFront, uDark, uSl, uPh; uniform vec3 uTop, uBot, uMurk; varying vec3 vP;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    float lev = uLevel + uSl * sin(vP.x * 1.96 - uPh) * (1.0 - pow(abs(vP.x) / uR, 4.0));   // fix r2: a travelling wave pinned at the walls
    float y = vP.y; if (y > lev) discard;
    float t = clamp(y / max(lev, 0.05), 0.0, 1.0), ty = clamp(y / 8.0, 0.0, 1.0);
    vec3 c = mix(uBot, uTop, pow(ty, 1.1));
    float ex = abs(vP.x) / uR;
    if (uFront < 0.5) {
      c *= 1.0 - 0.42 * pow(ex, 2.4);                                            // AO toward both sides of the round wall
      float ang = atan(vP.z, vP.x);
      float ring = 1.0 - smoothstep(0.0, 0.03, abs(fract(y / 1.36 + 0.5) - 0.5) * 1.36);   // ring seams
      float vs = 1.0 - smoothstep(0.0, 0.025, abs(fract(ang / 0.5236 + 0.5) - 0.5) * 0.5236 * uR); // vertical plate seams
      float riv = step(0.5, fract(ang * uR / 0.11)) * (1.0 - smoothstep(0.03, 0.06, abs(fract(y / 1.36 + 0.5) - 0.5) * 1.36 - 0.05));
      c *= 1.0 - 0.28 * max(ring, vs) - 0.12 * riv * (1.0 - ring);
    } else c *= 1.0 - 0.18 * pow(ex, 4.0);
    // fix r3 (A3 P2 shot 10: the held diagram read frozen): TWO caustic layers that scroll ~0.3 m/s (~1.5 px/f at 1080) in
    // opposite directions, so the net always visibly moves
    vec2 q = vec2((vP.x + uT * 0.3) * 2.0, y * 1.5), q2 = vec2((vP.x - uT * 0.27) * 2.6, (y + 0.4) * 1.9);
    float w1 = sin(q.x + uT * 0.9 + sin(q.y * 1.3 + uT * 0.6) * 1.5), w2 = sin(q.y * 1.15 - uT * 0.7 + sin(q.x * 0.9 - uT * 0.5) * 1.7);
    float w3 = sin(q2.x - uT * 0.8 + sin(q2.y * 1.1 - uT * 0.5) * 1.4), w4 = sin(q2.y * 1.25 + uT * 0.6 + sin(q2.x * 0.8 + uT * 0.4) * 1.6);
    float ca = pow(1.0 - abs(w1 * w2), 7.0) * smoothstep(0.15, 1.0, ty) * (1.0 - uDark), ca2 = pow(1.0 - abs(w3 * w4), 9.0) * smoothstep(0.1, 0.9, ty) * (1.0 - uDark);
    c += vec3(0.22, 0.42, 0.52) * ca * (uFront > 0.5 ? 0.6 : 0.42) + vec3(0.2, 0.36, 0.44) * ca2 * (uFront > 0.5 ? 0.45 : 0.3);
    float ray = smoothstep(0.55, 1.0, sin(vP.x * 1.6 + y * 0.42 + uT * 0.12)) * smoothstep(0.0, 1.0, t) * smoothstep(lev, lev - 4.0, y);
    c += vec3(0.1, 0.2, 0.26) * ray * 0.55 * (1.0 - uDark);
    c += vec3(0.26, 0.48, 0.58) * smoothstep(lev - 0.22, lev, y) * 0.5;
    vec2 sq = vec2(vP.x * 6.0, (y - uT * 0.06) * 6.0), cell = floor(sq), fq = fract(sq) - 0.5; float sp = step(0.93, h21(cell)) * smoothstep(0.12, 0.04, length(fq + 0.25 * (vec2(h21(cell + 3.1), h21(cell + 7.7)) - 0.5)));
    c += vec3(0.45, 0.65, 0.75) * sp * 0.35;
    // the pour: a foamy churned column under the stream (through the hatch)
    float pc = uPour * exp(-pow((vP.x - uPourX) / 0.5, 2.0)) * smoothstep(lev - 2.2, lev, y);
    c = mix(c, vec3(0.75, 0.88, 0.95), pc * (0.45 + 0.25 * sin(y * 14.0 + uT * 9.0)));
    // the unknown: murky navy, a faint silt mottling
    float silt = 0.06 * h21(floor(vec2(vP.x * 3.0, y * 3.0 - uT * 0.1)));
    c = mix(c, uMurk * (1.0 + silt * 3.0), uDark * 0.9);
    c += vec3(0.24, 0.42, 0.5) * smoothstep(lev - 0.09, lev, y) * 0.55 * uDark * (0.8 + 0.2 * sin(vP.x * 9.0 + uT * 2.0));   // fix r2: a bright rippled meniscus under the gold even in the dark
    float a = uFront > 0.5 ? mix(0.24 + 0.16 * ca + 0.32 * smoothstep(lev - 0.25, lev, y) + 0.1 * smoothstep(0.6, 0.0, ty), 0.9, uDark) : 1.0;
    gl_FragColor = vec4(c, a);
  }`,
  transparent: front, depthWrite: !front, side: front ? THREE.FrontSide : THREE.DoubleSide, fog: false,
});
/** the oil: the cut-face band (front) and the top surface (seen through the hatch); it spreads RADIALLY from under the
 *  hatch (uSpread = radius from the hatch axis, A1 P2: no left-to-right loading bar).
 *  fix r1 (A1 P2): the band has a bright #FFE89A top highlight line, a darker amber underside (#C9861E), emits ~1.15
 *  (blooms a little), a small interface wave (<= 0.035 m) and a leading-edge meniscus; the top (the hatch payoff) is a
 *  radial gradient #FFC845 -> #E8961C, a sliding sky reflection band, a ripple ring every 40 f and the collar's violet
 *  crescent shadow on its upper-left */
const OIL_HC = new THREE.Vector2(CU.hatch.c[0], CU.hatch.c[2]);
/** fix r3 (A3 P2 shot 12: the thin gold line merged with the red eave): the diagram's water top and oil top (set-local;
 *  lead_requests asks plan.ts CU.water / CU.oil to take the same values so cast.ts's fish + torch spot and story.ts's DOF
 *  agree): a 0.38 m gold band with a 0.35 m navy air gap under the 8.5 m eave */
const CUW = 7.77, CUO = 8.15;
/** fix r2: the LOOKS FULL board (set-local; plan.ts CU.sign.c is still the old anchor, see lead_requests) */
const SIGN12 = { c: [0, 9.24, -2.45] as P3, w: 0.8, h: 0.3, rx: -0.55 };
const oilMat = (top: boolean) => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uSpread: { value: 10 }, uHC: { value: OIL_HC.clone() }, uHR: { value: CU.hatch.r }, uLight: { value: ut("#ffc845") }, uDeep: { value: ut("#e8961c") },
    uUnder: { value: ut("#c9861e") }, uHi: { value: ut("#ffe89a") }, uHot: { value: 1.15 }, uSl: { value: 0 }, uR: { value: CU.tank.r }, uRip: { value: 0 }, uPh: { value: 0 },
    uBase: { value: ut("#f2a81e") }, uTape: { value: new THREE.Vector2(0.12, CU.hatch.c[2] + 0.1) } },
  vertexShader: top ? `varying vec3 vP; varying vec2 vUv; void main(){ vP = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
    : `uniform float uSl, uR, uPh; varying vec3 vP; varying vec2 vUv; void main(){ vP = position; vUv = uv; vec3 p = position; p.y += uSl * sin(p.x * 1.96 - uPh) * (1.0 - pow(abs(p.x) / uR, 4.0)); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  // fix r2 (A2 P2 #17: the hatch oil read as a convex egg-yolk dome): a FLAT mirror plane (#F2A81E), a soft specular
  // streak reflecting the rim + sky (~15 % of the disc) drifting slowly, three slow ripple rings from the tape every 40 f
  // (<= 2 % of the radius in contrast terms), a darker meniscus ring at the collar, the collar's violet crescent shadow
  fragmentShader: top ? /* glsl */ `uniform float uT, uSpread, uHot, uHR, uRip; uniform vec2 uHC, uTape; uniform vec3 uLight, uDeep, uHi, uBase; varying vec3 vP;
  void main(){
    vec2 p = vec2(vP.x, vP.z), d2 = p - uHC; float rr = length(d2);
    if (rr > uSpread + 0.06 * sin(atan(d2.y, d2.x) * 5.0 + uT * 2.0)) discard;
    vec3 c = uBase;
    float sv = d2.x * 0.55 - d2.y * 0.83 + 0.06 * sin(uT * 0.3);
    float streak = exp(-pow((sv - 0.12) / (uHR * 0.17), 2.0)) * smoothstep(uHR * 1.02, uHR * 0.35, rr);
    c = mix(c, uHi, 0.6 * streak);
    vec2 dt = d2 - (uTape - uHC); float rt = length(dt);
    // fix r3 (A3 P2 shots 10 / 12: the hatch holds read frozen): the tape's ripple rings at 2x contrast, a soft sheen band
    // that drifts across the disc (~0.5 % W / f, fading in / out at the ends), the specular spot drifting ~0.5 px/f
    for (int k = 0; k < 3; k++) { float ph = fract(uRip + float(k) / 3.0), rad = 0.03 + ph * uHR * 1.5;
      float ring = 1.0 - smoothstep(0.0, 0.016, abs(rt - rad)), dark = 1.0 - smoothstep(0.0, 0.02, abs(rt - rad - 0.032));
      c += vec3(0.6, 0.44, 0.14) * ring * (1.0 - ph) * 0.85; c -= vec3(0.24, 0.16, 0.04) * dark * (1.0 - ph); }
    float shp = fract(uT * 0.3), sb = (d2.x * 0.83 + d2.y * 0.55) - mix(-0.6, 0.6, shp);
    c += vec3(0.5, 0.38, 0.12) * exp(-pow(sb / 0.08, 2.0)) * sin(3.14159 * shp) * smoothstep(uHR * 1.02, uHR * 0.4, rr) * 0.6;
    float gl = exp(-pow(length(d2 - vec2(0.12 + 0.09 * sin(uT * 0.6), -0.14 + 0.05 * cos(uT * 0.45))) / 0.07, 2.0));
    c += vec3(1.0, 0.86, 0.5) * gl * 0.65;
    float men = smoothstep(uHR * 0.92, uHR * 0.985, rr) * step(rr, uHR + 0.02);
    c = mix(c, c * vec3(0.62, 0.48, 0.4), men * 0.8);
    vec2 dir = d2 / max(rr, 1e-4);
    float cres = smoothstep(uHR - 0.14, uHR - 0.015, rr) * smoothstep(-0.1, 0.75, dot(dir, normalize(vec2(-0.8, -0.6)))) * step(rr, uHR + 0.02);
    c = mix(c, c * vec3(0.48, 0.38, 0.62), cres * 0.7);
    gl_FragColor = vec4(c * uHot, 1.0);
  }` : /* glsl */ `uniform float uT, uSpread, uHot, uR; uniform vec2 uHC; uniform vec3 uLight, uDeep, uUnder, uHi; varying vec3 vP; varying vec2 vUv;
  void main(){
    float dz = uHC.y, reach = sqrt(max(uSpread * uSpread - dz * dz, 0.0));
    float edge = abs(vP.x - uHC.x) - reach;
    if (edge > 0.0) discard;
    float wav = 0.11 * sin(vP.x * 3.0 + uT * 1.1) + 0.05 * sin(vP.x * 7.0 - uT * 0.8);
    float y = vUv.y; if (y < 0.06 + wav * 0.5) discard;
    float men = smoothstep(-0.12, 0.0, edge);
    vec3 c = mix(uUnder, uLight, smoothstep(0.12, 0.85, y));
    c = mix(c, uHi, smoothstep(0.86, 0.97, y));
    c += vec3(0.4, 0.3, 0.1) * smoothstep(0.92, 1.0, sin(vP.x * 3.3 - uT * 0.9)) * 0.4;
    c = mix(c, uHi, men * 0.5);
    // fix r3 (A3 P2 shot 10 / ADD #53): a slow shimmer (24 f) running along the top highlight + a brighter meniscus line
    c += vec3(0.5, 0.42, 0.2) * smoothstep(0.9, 0.99, y) * (0.25 + 0.25 * sin(uT * 7.854 + vP.x * 2.2));
    gl_FragColor = vec4(c * uHot, 1.0);
  }`,
  side: THREE.DoubleSide, fog: false,
});
/** a falling stream (water / oil): streaks scroll down */
const streamMat = (col: string, a: number) => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uC: { value: ut(col) }, uA: { value: a } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uA; uniform vec3 uC; varying vec2 vUv; varying vec3 vN;
  void main(){ float s = 0.75 + 0.25 * sin(vUv.x * 40.0) * sin(vUv.y * 30.0 + uT * 22.0); float edge = abs(vN.z); vec3 c = uC * (0.8 + 0.5 * edge) * s + vec3(0.3) * pow(1.0 - edge, 3.0);
    gl_FragColor = vec4(c, uA * (0.55 + 0.45 * edge)); }`,
  transparent: true, depthWrite: false, fog: false,
});

// ======================================================================================================== KITCHEN painters + bottle shaders
const checkerTex = () => tx("kiChecker", 512, 512, (g, r) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = jit(r, (x + y) % 2 ? "#f2e6c8" : "#c8483a", 0.05); g.fillRect(x * 128, y * 128, 128, 128); }
  speck(g, r, 512, 512, 1500, ["#8a3028", "#fff8e8"], 1, 3, 0.25);
  g.fillStyle = "rgba(255,255,255,0.12)"; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 128 + 6, y * 128 + 6, 50, 8);
  for (let k = 0; k <= 4; k++) { g.fillStyle = "rgba(60,30,20,0.35)"; g.fillRect(k * 128 - 1, 0, 2, 512); g.fillRect(0, k * 128 - 1, 512, 2); }
});
/** sunny yellow wallpaper with tiny white daisies (1 m tile) */
const kiPaperTex = () => tx("kiPaper", 512, 512, (g, r) => {
  g.fillStyle = "#f4cf58"; g.fillRect(0, 0, 512, 512); mottle(g, r, 512, 512, 80, ["#f8d868", "#ecc44c"], 20, 60, 0.2);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 24;
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; g.fillStyle = "rgba(255,252,240,0.85)"; g.beginPath(); g.ellipse(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 4, 2.5, a, 0, TAU); g.fill(); }
    g.fillStyle = "#e8913a"; g.beginPath(); g.arc(cx, cy, 2.2, 0, TAU); g.fill();
  }
});
// fix r2 (A2 P3 #36): a cool MINT tile (#9FD3B8) behind the bottle, so the gold oil reads against mint, not cream
const kiTileTex = () => tx("kiTile2", 256, 256, (g, r) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = jit(r, "#9fd3b8", 0.04); g.fillRect(x * 64, y * 64, 64, 64); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x * 64 + 6, y * 64 + 6, 20, 5); }
  for (let k = 0; k <= 4; k++) { g.fillStyle = "#f4f2ea"; g.fillRect(k * 64 - 2, 0, 4, 256); g.fillRect(0, k * 64 - 2, 256, 4); }
});
const ginghamTex = (key: string, col: string, base = "#fbf8f0", k1 = 0.3, k2 = 0.4) => tx(key, 256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 8; k++) { g.fillStyle = rgba(col, k1); g.fillRect(k * 32, 0, 16, 256); g.fillRect(0, k * 32, 256, 16); }
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = rgba(col, k2); g.fillRect(x * 32, y * 32, 16, 16); }
  g.globalAlpha = 0.08; for (let y = 0; y < 256; y += 3) { g.fillStyle = "#000"; g.fillRect(0, y, 256, 1); } g.globalAlpha = 1;
});
/** fix r3 (LEAD P3 shot 11: hairline banding on the blurred drape): 2x larger checks, no thread lines, pre-softened edges */
const drapeTex = () => tx("kiDrape3", 256, 256, (g) => {
  g.fillStyle = "#f4e6c8"; g.fillRect(0, 0, 256, 256); g.filter = "blur(3px)";
  for (let k = 0; k < 4; k++) { g.fillStyle = rgba("#c8452c", 0.26); g.fillRect(k * 64, -8, 32, 272); g.fillRect(-8, k * 64, 272, 32); }
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = rgba("#c8452c", 0.48); g.fillRect(x * 64, y * 64, 32, 32); }
  g.filter = "none";
});
/** fix r3 (A3 P3 shot 11: the lettuce read as faceted gems): a ruffled lettuce leaf card (3 greens, a pale rib, plum ink) */
const lettuceTex = (k: number) => tx("kiLeaf" + k, 96, 128, (g, r) => {
  g.clearRect(0, 0, 96, 128); const cols = ["#7ac04a", "#5aa83a", "#9ad06a"], ink = "#2c1e2a";
  g.beginPath(); g.moveTo(48, 124);
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (i / 20), rr = 40 + 7 * Math.sin(i * 2.6 + k) + 3 * r(); g.lineTo(48 - Math.cos(a) * rr * 0.95, 70 - Math.sin(a) * rr * 1.25); }
  g.closePath(); g.fillStyle = cols[k % 3]; g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
  g.strokeStyle = "rgba(240,250,210,0.85)"; g.lineWidth = 4; g.beginPath(); g.moveTo(48, 122); g.quadraticCurveTo(46, 70, 50, 26); g.stroke();
  g.strokeStyle = "rgba(240,250,210,0.5)"; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const y = 100 - i * 18; g.beginPath(); g.moveTo(48, y); g.lineTo(26, y - 14); g.moveTo(48, y); g.lineTo(70, y - 14); g.stroke(); }
}, true);
/** fix r3 (ADD #55): a plain paper bottle label (cream, a hand-drawn olive sprig, NO brand / no words) */
const bottleLabelTex = () => tx("kiLabel3", 256, 128, (g) => {
  g.fillStyle = "#f4ead2"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#8a5a3a"; g.lineWidth = 4; g.strokeRect(6, 6, 244, 116); g.lineWidth = 1.5; g.strokeRect(14, 14, 228, 100);
  g.strokeStyle = "#4a6a2a"; g.lineWidth = 4; g.beginPath(); g.moveTo(70, 92); g.quadraticCurveTo(128, 50, 190, 36); g.stroke();
  for (let i = 0; i < 6; i++) { const t = 0.15 + i * 0.14, x = 70 + 120 * t, y = 92 - 56 * t - 8 * Math.sin(t * 3), s = i % 2 ? 1 : -1; g.fillStyle = "#6a8a3a"; g.beginPath(); g.ellipse(x + 4, y + s * 12, 14, 6, s * 0.7, 0, TAU); g.fill(); }
  for (const [x, y] of [[112, 78], [160, 60]]) { g.fillStyle = "#3a4a1a"; g.beginPath(); g.ellipse(x, y, 7, 9, 0.3, 0, TAU); g.fill(); }
}, true);
/** fix r3 (A3 P2 shot 11): light through the dressing: the bottle's shadow carries a ruby (vinegar, near the base) -> gold
 *  (oil, the far end) glow; drawn additively along the shadow (u = 0 at the base -> 1 at the tip) */
const bottleTintTex = () => tx("kiBotTint3", 256, 64, (g) => {
  g.clearRect(0, 0, 256, 64);
  for (let x = 0; x < 256; x++) { const u = x / 255, a = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
    const c = u < 0.55 ? [150, 26, 46] : [255, 186, 70], k = u < 0.55 ? 0.55 : 0.9;
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`); gr.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${a * k})`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.fillStyle = gr; g.fillRect(x, 0, 1, 64); }
}, true);
const cabTex = (key: string, base: string, doors: number) => tx(key, 512, 256, (g, r) => {
  g.fillStyle = shadeHex(base, -0.08); g.fillRect(0, 0, 512, 256);
  const w = 512 / doors;
  for (let k = 0; k < doors; k++) { panel(g, r, k * w + 8, 8, w - 16, 240, base, 10, false); g.fillStyle = "#d8dee4"; rrect(g, k * w + (k % 2 ? 20 : w - 34), 100, 14, 56, 6); g.fill(); g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(k * w + (k % 2 ? 23 : w - 31), 106, 4, 40); }
});
/** the garden through the kitchen window: sky, a tree, a white picket fence, flower beds, the neighbour's house */
const kiGardenTex = () => tx("kiGarden", 1024, 720, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, "#5aa8f0"); gr.addColorStop(0.5, "#a8d6fa"); gr.addColorStop(0.62, "#e8f4fc"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 720);
  for (let i = 0; i < 5; i++) { const x = r() * 1024, y = 40 + r() * 160; for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(x + k * 34, y + (k % 2) * 10, 34 + r() * 16, 0, TAU); g.fill(); } }
  g.fillStyle = "#f2e8d8"; g.fillRect(560, 250, 360, 230); g.fillStyle = "#b8483a"; g.beginPath(); g.moveTo(540, 260); g.lineTo(740, 150); g.lineTo(940, 260); g.closePath(); g.fill();
  for (const x of [600, 700, 820]) { g.fillStyle = "#7ab0d8"; g.fillRect(x, 300, 56, 70); g.fillStyle = "#3a6a4a"; g.fillRect(x - 10, 300, 10, 70); g.fillRect(x + 56, 300, 10, 70); }
  g.fillStyle = "#4a8a3e"; g.beginPath(); g.arc(200, 260, 150, 0, TAU); g.fill(); g.fillStyle = "#5aa04a"; g.beginPath(); g.arc(160, 220, 100, 0, TAU); g.arc(270, 230, 90, 0, TAU); g.fill();
  g.fillStyle = "#6a4a2a"; g.fillRect(185, 330, 30, 160);
  g.fillStyle = "#6ab850"; g.fillRect(0, 470, 1024, 250);
  for (let x = 0; x < 1024; x += 34) { g.fillStyle = "#fbfaf4"; g.beginPath(); g.moveTo(x, 470); g.lineTo(x + 11, 450); g.lineTo(x + 22, 470); g.lineTo(x + 22, 560); g.lineTo(x, 560); g.closePath(); g.fill(); }
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 485, 1024, 10); g.fillRect(0, 530, 1024, 10);
  for (let i = 0; i < 160; i++) { g.fillStyle = ["#e84a6a", "#f8d040", "#ffffff", "#c060d0"][i % 4]; g.beginPath(); g.arc(r() * 1024, 575 + r() * 60, 5 + r() * 5, 0, TAU); g.fill(); }
  g.fillStyle = "#3e8a3a"; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * 1024, 600 + r() * 40, 10 + r() * 10, 0, TAU); g.fill(); }
}, true);
const radioTex = () => tx("kiRadio", 256, 160, (g) => {
  g.fillStyle = "#f2e2c4"; rrect(g, 0, 0, 256, 160, 30); g.fill();
  g.fillStyle = "#c8443a"; rrect(g, 14, 16, 140, 128, 16); g.fill(); g.strokeStyle = "rgba(255,240,220,0.7)"; g.lineWidth = 3; for (let y = 30; y < 140; y += 12) { g.beginPath(); g.moveTo(24, y); g.lineTo(144, y); g.stroke(); }
  g.fillStyle = "#fbf4e2"; g.beginPath(); g.arc(205, 60, 34, 0, TAU); g.fill(); g.strokeStyle = "#8a3a2a"; g.lineWidth = 4; g.stroke(); g.beginPath(); g.moveTo(205, 60); g.lineTo(225, 40); g.stroke();
  g.fillStyle = "#8a3a2a"; g.beginPath(); g.arc(186, 124, 12, 0, TAU); g.arc(224, 124, 12, 0, TAU); g.fill();
}, true);
/** a sparrow on the fence (side view, faces left): 0 = perched, 1 = mid-hop (wings up) */
const sparrowTex = (k: number) => tx("kiSparrow" + k, 128, 96, (g) => {
  g.clearRect(0, 0, 128, 96); const ink = "#2c1e2a";
  g.fillStyle = "#8a5a3a"; g.beginPath(); g.ellipse(64, 56, 30, 20, -0.15, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#e8d8bc"; g.beginPath(); g.ellipse(58, 64, 18, 11, -0.1, 0, TAU); g.fill();
  g.fillStyle = "#8a5a3a"; g.beginPath(); g.arc(38, 40, 13, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#1a1418"; g.beginPath(); g.arc(34, 37, 2.6, 0, TAU); g.fill();
  g.fillStyle = "#e8a83a"; g.beginPath(); g.moveTo(25, 40); g.lineTo(16, 43); g.lineTo(25, 45); g.fill();
  g.fillStyle = "#5a3a22"; g.beginPath(); g.moveTo(90, 50); g.lineTo(118, 40); g.lineTo(112, 56); g.closePath(); g.fill();
  g.fillStyle = "#6a4428"; g.beginPath(); if (k) { g.moveTo(60, 48); g.lineTo(84, 12); g.lineTo(92, 40); } else { g.moveTo(56, 50); g.lineTo(92, 46); g.lineTo(70, 64); } g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "#3a2a1a"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(58, 74); g.lineTo(56, 88); g.moveTo(68, 74); g.lineTo(70, 88); g.stroke();
}, true);
/** a generic cat-shaped wall clock (no brand): black cat, a white clock face belly, eyes (the tail is a separate swinging card) */
const catClockTex = () => tx("kiCatClock", 128, 192, (g) => {
  g.clearRect(0, 0, 128, 192); const ink = "#1e1a22";
  g.fillStyle = ink; g.beginPath(); g.ellipse(64, 46, 34, 30, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(34, 30); g.lineTo(38, 2); g.lineTo(56, 22); g.fill(); g.beginPath(); g.moveTo(94, 30); g.lineTo(90, 2); g.lineTo(72, 22); g.fill();
  rrect(g, 34, 66, 60, 112, 24); g.fill();
  g.fillStyle = "#f6f0e0"; g.beginPath(); g.arc(64, 108, 23, 0, TAU); g.fill(); g.strokeStyle = "#c8452c"; g.lineWidth = 3; g.stroke();
  g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 108); g.lineTo(64, 92); g.moveTo(64, 108); g.lineTo(76, 112); g.stroke();
  g.fillStyle = "#f6e05a"; g.beginPath(); g.ellipse(52, 44, 8, 9, 0, 0, TAU); g.ellipse(76, 44, 8, 9, 0, 0, TAU); g.fill(); g.fillStyle = ink; g.beginPath(); g.arc(54, 45, 3.5, 0, TAU); g.arc(78, 45, 3.5, 0, TAU); g.fill();
  g.strokeStyle = "#f6f0e0"; g.lineWidth = 3; g.beginPath(); g.arc(64, 58, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = "#c8452c"; g.fillRect(40, 70, 48, 7);
}, true);
/** the dressing: oil (gold) over vinegar (ruby); shaken -> a cloudy emulsion -> the oil rises back to the top.
 *  fix r1 (A1 P2 shot 11): the oil is the film's hero gold (#F7B733 -> #E8A020 at the interface, a bright meniscus line),
 *  the vinegar ruby (#B0283A -> #8E1C2E), the cloud #D88A5A; (A1 P1) the herb flecks are tiny leaf shapes that drift,
 *  tiny bubbles rise through the vinegar, the interface wobbles at rest (uSlosh) */
const liquidMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uH: { value: 0.2 }, uSep: { value: 1 }, uOilF: { value: 0.38 }, uSlosh: { value: 0 }, uGlow: { value: 0 },
    uOilL: { value: ut("#f7b733") }, uOilD: { value: ut("#e8a020") }, uVinL: { value: ut("#b0283a") }, uVinD: { value: ut("#8e1c2e") }, uEmu: { value: ut("#d88a5a") } },
  vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: /* glsl */ `uniform float uT, uH, uSep, uOilF, uSlosh, uGlow; uniform vec3 uOilL, uOilD, uVinL, uVinD, uEmu; varying vec3 vP; varying vec3 vN; varying vec3 vV;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    float h = (vP.y + vP.x * uSlosh * 1.6) / uH, ang = atan(vP.z, vP.x);
    float topB = 1.0 - uOilF * uSep, botB = (1.0 - uOilF) * uSep;
    float wob = 0.012 * sin(ang * 3.0 + uT * 2.0);
    vec3 oil = mix(uOilD, uOilL, smoothstep(topB, 1.0, h));
    vec3 vin = mix(uVinD, uVinL, smoothstep(0.0, botB + 0.001, h));
    float sw = sin(ang * 4.0 + h * 18.0 + uT * 3.0) * sin(ang * 2.0 - h * 9.0 - uT * 2.0);
    vec3 emu = uEmu * (0.92 + 0.12 * sw);
    vec3 c = h > topB + wob ? oil : (h < botB + wob ? vin : emu);
    // the bright gold meniscus line at the oil / vinegar interface (when separated)
    c = mix(c, vec3(1.0, 0.86, 0.42), (1.0 - smoothstep(0.0, 0.018, abs(h - topB - wob))) * smoothstep(0.6, 0.9, uSep) * 0.85);
    // gold droplets rising through the cloudy middle while it separates
    if (h <= topB + wob && h >= botB + wob) {
      vec2 q = vec2(ang * 5.0, h * 26.0 - uT * 1.6);
      vec2 cell = floor(q), f = fract(q) - 0.5 - 0.3 * (vec2(h21(cell + 2.3), h21(cell + 6.1)) - 0.5); float rnd = h21(cell);
      float d = length(f * vec2(1.0, 1.3)); float drop = smoothstep(0.26, 0.14, d) * step(0.74, rnd) * uSep * (1.0 - uSep) * 4.0;
      c = mix(c, uOilL, clamp(drop, 0.0, 1.0));
    }
    // fix r2 (ADD #61): small golden oil beads float UP through the ruby vinegar while it separates ("The oil always rises")
    if (h < botB + wob) {
      vec2 q2 = vec2(ang * 4.0, h * 14.0 - uT * 2.4); vec2 c2 = floor(q2), f2 = fract(q2) - 0.5 - 0.34 * (vec2(h21(c2 + 1.9), h21(c2 + 8.4)) - 0.5);
      float bead = smoothstep(0.22, 0.12, length(f2 * vec2(1.0, 1.2))) * step(0.78, h21(c2 + 5.1)) * clamp(uSep * (1.0 - uSep) * 5.0, 0.0, 1.0);
      c = mix(c, uOilL * 1.08, bead);
    }
    // herb flecks: little dark-green leaf shapes drifting slowly in the vinegar / emulsion
    vec2 fq = vec2(ang * 9.0 + 0.25 * sin(uT * 0.7 + h * 9.0), h * 34.0 - uT * 0.9);
    vec2 fc = floor(fq), ff = fract(fq) - 0.5; float fr0 = h21(fc), an = fr0 * 6.28;
    vec2 lp = mat2(cos(an), -sin(an), sin(an), cos(an)) * (ff - 0.18 * (vec2(h21(fc + 1.7), h21(fc + 4.1)) - 0.5));
    float leaf = step(0.9, fr0) * smoothstep(0.05, 0.0, length(lp * vec2(1.0, 2.6)) - 0.12) * step(h, topB);
    c = mix(c, vec3(0.1, 0.26, 0.08), leaf * 0.9);
    // tiny bubbles rising through the vinegar
    vec2 bq = vec2(ang * 12.0, h * 40.0 - uT * 4.0); vec2 bc = floor(bq), bf = fract(bq) - 0.5;
    float bub = step(0.96, h21(bc + 9.3)) * (1.0 - smoothstep(0.1, 0.17, length(bf))) * step(h, botB + wob);
    c = mix(c, vec3(1.0, 0.8, 0.82), bub * 0.6);
    float frn = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
    c *= 0.66 + 0.42 * frn;                                                  // round body: darker at the silhouette
    c += vec3(1.0, 0.85, 0.55) * smoothstep(0.985, 1.0, h) * 1.2 * step(topB, h); // the top meniscus glints
    c += vec3(0.5, 0.42, 0.3) * smoothstep(0.55, 0.0, abs(vN.x + 0.45)) * 0.35;  // a soft vertical sheen
    // fix r3 (A3 P2 shot 11): the settled gold GLOWS on "top" (an emissive ramp, catches the bloom)
    c += uOilL * uGlow * step(topB + wob, h) * (0.8 + 0.4 * frn);
    gl_FragColor = vec4(c, 1.0);
  }`,
  fog: false,
});
/** the glass. fix r1 (A1 P1 shot 11: the glass was invisible, the cork floated): a plum silhouette ink line on grazing
 *  angles (so neck, shoulders and body read as ONE bottle), a pale Fresnel rim, a 10 % cool tint, two vertical glare
 *  streaks running up the body, shoulders and neck */
// fix r2 (A2 P2 #19: the neck vanished, the two full-height glare stripes read as straws): a faint teal glass tint (#BFE3D6
// ~15 %), a Fresnel rim ~0.55, a 2-3 px plum (#2A1A26) silhouette that carries the neck + shoulders, and two SHORT
// curved glints (one on the shoulder, one on the lower body, ~30 % of the height, 40 % alpha); uSlide moves a window
// glint across the glass during the push-in (ADD #63)
const glassMat = () => new THREE.ShaderMaterial({
  uniforms: { uSlide: { value: -1 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uSlide; varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){ vec3 n = normalize(vN); float nv = dot(n, normalize(vV)), fr = 1.0 - abs(nv), front = step(0.0, nv);
    float g1 = smoothstep(0.09, 0.0, abs(n.x + 0.5 - 0.6 * (vY - 0.25))) * smoothstep(0.2, 0.225, vY) * smoothstep(0.31, 0.285, vY) * front;
    float g2 = smoothstep(0.06, 0.0, abs(n.x - 0.42 + 0.5 * (vY - 0.08))) * smoothstep(0.03, 0.05, vY) * smoothstep(0.14, 0.115, vY) * front;
    float g3 = smoothstep(0.07, 0.0, abs(n.x - uSlide)) * smoothstep(0.125, 0.145, vY) * smoothstep(0.215, 0.195, vY) * front;
    // fix r3 (A3 P2 shot 11: the empty upper bottle had no volume): one white glare streak (6-8 px) down the NECK, a faint
    // green glass tint (rgba 200,235,220,~0.12) above the liquid
    float g4 = smoothstep(0.16, 0.0, abs(n.x + 0.38)) * smoothstep(0.255, 0.27, vY) * smoothstep(0.335, 0.32, vY) * front;
    float glint = 0.4 * (g1 + g2) + 0.35 * g3 + 0.75 * g4;
    float a = 0.04 + 0.08 * smoothstep(0.195, 0.215, vY) + 0.55 * pow(fr, 2.4) + glint;
    vec3 c = mix(vec3(0.75, 0.89, 0.84), vec3(1.25), clamp(glint * 2.2 + 0.25 * pow(fr, 2.0), 0.0, 1.0));
    float sil = smoothstep(0.62, 0.8, fr);
    c = mix(c, vec3(0.165, 0.1, 0.15), sil); a = mix(a, 0.97, sil);
    gl_FragColor = vec4(c, clamp(a, 0.0, 0.97)); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
});

// ======================================================================================================== PUMP ROOM painters
const concreteTex = (key: string, base: string) => tx(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024); mottle(g, r, 1024, 1024, 300, [shadeHex(base, 0.05), shadeHex(base, -0.07)], 20, 90, 0.18);
  speck(g, r, 1024, 1024, 9000, [shadeHex(base, -0.2), shadeHex(base, 0.12)], 1, 3, 0.35);
  for (let i = 0; i < 9; i++) { const x = r() * 1024, y = r() * 1024, rr = 30 + r() * 90, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(40,30,20,0.45)"); gr.addColorStop(1, "rgba(40,30,20,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, r() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = "rgba(40,40,40,0.5)"; g.lineWidth = 2; for (let i = 0; i < 7; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 70; y += r() * 40; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = "rgba(30,30,30,0.4)"; g.fillRect(0, 0, 1024, 3); g.fillRect(0, 0, 3, 1024);
});
/** painted cinder block: dark green below 1.5 m, a yellow stripe, cream-grey above (512 x 1280 = 2 x 5 m) */
const blockTex = () => tx("prBlock", 512, 1280, (g, r) => {
  const P = 256, Y = (y: number) => 1280 - y * P;
  g.fillStyle = "#b8b2a2"; g.fillRect(0, 0, 512, 1280); g.fillStyle = "#3e5a4a"; g.fillRect(0, Y(1.5), 512, 1.5 * P);
  g.fillStyle = "#d8b040"; g.fillRect(0, Y(1.56), 512, 0.06 * P);
  for (let row = 0; row < 25; row++) { const y = 1280 - row * 51.2; g.fillStyle = "rgba(40,40,40,0.35)"; g.fillRect(0, y - 2, 512, 3); for (let x = (row % 2) * 51.2; x < 512; x += 102.4) g.fillRect(x, y - 51.2, 3, 51.2); }
  mottle(g, r, 512, 1280, 200, ["#ffffff", "#000000"], 10, 40, 0.04); speck(g, r, 512, 1280, 4000, ["#6a6a60"], 1, 3, 0.3);
  for (let i = 0; i < 6; i++) { const x = r() * 512, sg = g.createLinearGradient(0, Y(1.5), 0, Y(0.4)); sg.addColorStop(0, "rgba(30,24,16,0.3)"); sg.addColorStop(1, "rgba(30,24,16,0)"); g.fillStyle = sg; g.fillRect(x, Y(1.5), 6 + r() * 10, 1.1 * P); }
});
/** riveted tank steel (cream-grey, weld seams, rust runs) */
const prSteelTex = () => tx("prSteel", 1024, 1024, (g, r) => {
  g.fillStyle = "#cfc6b2"; g.fillRect(0, 0, 1024, 1024); mottle(g, r, 1024, 1024, 200, ["#c4bba6", "#d8d0bc"], 30, 90, 0.25);
  for (let k = 0; k < 5; k++) { const y = 100 + k * 205; g.fillStyle = "rgba(90,80,64,0.45)"; g.fillRect(0, y - 2, 1024, 4); for (let x = 8; x < 1024; x += 22) { g.fillStyle = "rgba(80,70,56,0.55)"; g.beginPath(); g.arc(x, y + 10, 3.5, 0, TAU); g.fill(); g.fillStyle = "rgba(255,250,230,0.4)"; g.beginPath(); g.arc(x - 1, y + 9, 1.5, 0, TAU); g.fill(); } }
  for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(90,80,64,0.4)"; g.fillRect(128 + k * 256, 0, 4, 1024); }
  for (let i = 0; i < 30; i++) { const x = r() * 1024, y0 = r() * 900, L = 60 + 260 * r(), sg = g.createLinearGradient(0, y0, 0, y0 + L); sg.addColorStop(0, "rgba(168,92,48,0.5)"); sg.addColorStop(1, "rgba(168,92,48,0)"); g.fillStyle = sg; g.fillRect(x, y0, 4 + 10 * r(), L); }
});
const countedTex = (t: string) => tx("prCounted" + t, 800, 496, (g, r) => {
  g.fillStyle = "#f2ecd8"; rrect(g, 4, 4, 792, 488, 26); g.fill(); speck(g, r, 800, 496, 900, ["#c8bc98"], 1, 3, 0.4);
  g.strokeStyle = "#1a1a1a"; g.lineWidth = 16; rrect(g, 16, 16, 768, 464, 20); g.stroke();
  for (const [x, y] of [[48, 48], [752, 48], [48, 448], [752, 448]]) { g.fillStyle = "#6a6a6a"; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); }
  ctext(g, "COUNTED:", 400, 150, 118, "#1a1a1a", 690);
  ctext(g, t, 400, 420, 260, t === "-" ? "#8a8a8a" : "#c0241c", 600);
}, true);
const calendarTex = () => tx("prCalendar", 920, 1000, (g, r) => {
  g.fillStyle = "#7a5a3a"; g.fillRect(0, 0, 920, 1000);
  const gr = g.createLinearGradient(0, 30, 0, 330); gr.addColorStop(0, "#f2b860"); gr.addColorStop(1, "#5a8ab8"); g.fillStyle = gr; g.fillRect(40, 40, 840, 290);
  g.fillStyle = "#3a4a5a"; g.beginPath(); g.moveTo(200, 270); g.lineTo(700, 270); g.lineTo(660, 310); g.lineTo(240, 310); g.closePath(); g.fill(); g.fillStyle = "#e8e0d0"; g.fillRect(380, 220, 140, 52);
  g.fillStyle = "#f8f4ea"; g.fillRect(40, 350, 840, 610); for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(200,190,170,0.6)"; g.fillRect(40, 350 + k * 6, 840, 2); }
  for (let x = 70; x < 860; x += 40) { g.fillStyle = "#3a3a3a"; g.beginPath(); g.arc(x, 350, 6, 0, TAU); g.fill(); }
  ctext(g, "SATURDAY", 460, 720, 210, "#c4201a", 820);
  g.fillStyle = "rgba(196,32,26,0.85)"; g.fillRect(150, 770, 620, 14);
  speck(g, r, 920, 1000, 600, ["#a89878"], 1, 3, 0.3);
}, true);
const gaugeTex = () => tx("prGauge", 256, 256, (g) => {
  g.fillStyle = "#2a2a2a"; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill(); g.fillStyle = "#f4f0e2"; g.beginPath(); g.arc(128, 128, 108, 0, TAU); g.fill();
  g.strokeStyle = "#c0241c"; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 88, -0.2, 0.75); g.stroke();
  for (let k = 0; k <= 10; k++) { const a = -Math.PI * 1.25 + (k / 10) * Math.PI * 1.5; g.strokeStyle = "#1a1a1a"; g.lineWidth = k % 5 ? 3 : 6; g.beginPath(); g.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); g.lineTo(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(100, 84, 50, 22, -0.6, 0, TAU); g.fill();
}, true);
const stencilTex = (s: string) => tx("prStencil" + s, 256, 256, (g) => { g.clearRect(0, 0, 256, 256); ctext(g, s, 128, 220, 230, "rgba(40,40,46,0.85)", 230); }, true);
const pegboardTex = () => tx("prPeg", 512, 320, (g) => {
  g.fillStyle = "#8a7050"; g.fillRect(0, 0, 512, 320); for (let y = 10; y < 320; y += 20) for (let x = 10; x < 512; x += 20) { g.fillStyle = "rgba(40,30,20,0.5)"; g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
  g.lineCap = "round";
  for (const [x, y, l, col] of [[50, 40, 150, "#8a8a92"], [100, 40, 190, "#9a9aa2"], [150, 40, 120, "#c0241c"], [200, 40, 170, "#7a7a82"]] as [number, number, number, string][]) { g.strokeStyle = col; g.lineWidth = 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + l); g.stroke(); g.lineWidth = 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18); g.stroke(); }
  g.strokeStyle = "#5a3a2a"; g.lineWidth = 14; g.beginPath(); g.moveTo(290, 60); g.lineTo(290, 210); g.stroke(); g.fillStyle = "#6a6a72"; g.fillRect(262, 40, 56, 34);
  g.strokeStyle = "#e8b830"; g.lineWidth = 10; g.beginPath(); g.arc(400, 140, 60, 0, TAU); g.stroke();
});

/** fix r1: two more caged work lamps (set-local): over the pump motor in frame A, by tank C behind the blob close-up */
const PR_LAMPS2: P3[] = [[-4.1, 3.55, -2.3], [3.85, 3.6, -2.9]];
/** fix r3: a chalk tally of n strokes (5 = four + a slash) */
const tallyTex = (n: number) => tx("prTally3_" + n, 160, 128, (g2) => { g2.clearRect(0, 0, 160, 128); g2.strokeStyle = "rgba(240,240,232,0.92)"; g2.lineWidth = 7; g2.lineCap = "round";
  for (let k = 0; k < Math.min(4, n); k++) { g2.beginPath(); g2.moveTo(20 + k * 24, 22); g2.lineTo(23 + k * 24, 106); g2.stroke(); } if (n > 4) { g2.beginPath(); g2.moveTo(8, 92); g2.lineTo(104, 34); g2.stroke(); } }, true);
/** the night sky through the pump room's high window: deep blue, stars, a thin cloud, the moon's glow at one corner */
const nightTex = () => tx("prNightSky", 512, 212, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 212); gr.addColorStop(0, "#0c1640"); gr.addColorStop(1, "#24366e"); g.fillStyle = gr; g.fillRect(0, 0, 512, 212);
  const mg = g.createRadialGradient(430, 40, 0, 430, 40, 120); mg.addColorStop(0, "rgba(200,220,255,0.55)"); mg.addColorStop(1, "rgba(200,220,255,0)"); g.fillStyle = mg; g.fillRect(0, 0, 512, 212);
  g.fillStyle = "#eef2ff"; g.beginPath(); g.arc(430, 40, 16, 0, TAU); g.fill(); g.fillStyle = "#0c1640"; g.beginPath(); g.arc(438, 35, 14, 0, TAU); g.fill();
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 170, s = r() < 0.15 ? 2.4 : 1.2; g.fillStyle = `rgba(240,245,255,${0.5 + 0.5 * r()})`; g.fillRect(x, y, s, s); }
  g.fillStyle = "rgba(90,110,170,0.35)"; g.beginPath(); g.ellipse(160, 120, 120, 14, 0, 0, TAU); g.fill();
  g.fillStyle = "#121a34"; let x = 0; while (x < 512) { const w = 30 + r() * 60, h = 20 + r() * 50; g.fillRect(x, 212 - h, w, h); x += w + 4; }
}, true);
/** the oil inside a glass pipe section: gold with a bright top highlight that scrolls along the pipe (uK = brightness) */
const pipeOilMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uK: { value: 1 }, uC: { value: ut("#f2b62e") }, uHi: { value: ut("#ffe89a") } },
  vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uK; uniform vec3 uC, uHi; varying vec3 vP; varying vec3 vN;
  void main(){ float top = smoothstep(0.3, 0.95, vN.y), side = smoothstep(-0.2, 0.6, vN.z);
    float flow = 0.5 + 0.5 * sin(vP.x * 9.0 - uT * 5.4), str = smoothstep(0.75, 1.0, sin(vP.x * 3.2 - uT * 1.9));
    vec3 c = uC * (0.62 + 0.3 * side) * (0.9 + 0.12 * flow);
    c = mix(c, uHi, smoothstep(0.86, 0.98, vN.y) * (0.3 + 0.5 * str));
    gl_FragColor = vec4(c * (0.95 + 0.3 * (uK - 1.0)), 1.0); }`,
  fog: false,
});

// ======================================================================================================== OFFICE painters
const ofWallTex = () => tx("ofWall", 512, 512, (g, r) => {
  g.fillStyle = "#ecdcb6"; g.fillRect(0, 0, 512, 512); mottle(g, r, 512, 512, 100, ["#f2e4c2", "#e2d0aa"], 20, 60, 0.15);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(200,170,120,0.18)"; g.fillRect(x, 0, 18, 512); g.fillStyle = "rgba(255,250,235,0.18)"; g.fillRect(x + 30, 0, 4, 512); }
});
const ofWainTex = () => tx("ofWain", 512, 436, (g, r) => {
  g.fillStyle = "#7a4e2a"; g.fillRect(0, 0, 512, 436); grain(g, r, 0, 0, 512, 436, 70, "#2a1408", true);
  panel(g, r, 50, 60, 412, 300, "#a06a3a", 16, true); g.fillStyle = "#4a2a16"; g.fillRect(0, 400, 512, 36);
});
/** the cafe across the street: a two-storey brick front, red-white awning, CAFE sign, big windows, the doorway, the
 *  sidewalk tables (people are separate animated cards) (1024 x 640 = 4.4 x 2.75 m; ground at y 0.92) */
const CAFE = { w: 4.4, h: 2.75, cx: -0.2, y0: 0.62, z: -5.3 };
/** fix r2: the investor's coffee cup (x, z), moved off the BUY slip (OF.slip x 0.53 since the A2 LEAD change) */
const CUP_OF = [0.3, -1.0] as const;
const cafeTex = () => tx("ofCafe", 1024, 640, (g, r) => {
  const P = 1024 / CAFE.w, Y = (y: number) => (CAFE.y0 + CAFE.h - y) * P, X = (x: number) => (x - CAFE.cx + CAFE.w / 2) * P;
  g.fillStyle = "#b8584a"; g.fillRect(0, 0, 1024, 640);
  for (let y = 0; y < 640; y += 12) for (let x = (y / 12) % 2 ? -12 : 0; x < 1024; x += 26) { g.fillStyle = jit(r, "#b8584a", 0.1); g.fillRect(x + 1, y + 1, 24, 10); }
  for (const x of [-1.9, -0.9, 0.1, 1.1]) { g.fillStyle = "#f0e6d0"; g.fillRect(X(x) - 4, Y(3.22), 0.7 * P + 8, 0.55 * P + 8); g.fillStyle = "#6a8ab0"; g.fillRect(X(x), Y(3.22) + 4, 0.7 * P, 0.55 * P); g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(X(x) + 6, Y(3.22) + 8, 10, 0.5 * P); g.fillStyle = "#3a6a4a"; g.fillRect(X(x), Y(2.67), 0.7 * P, 10); }
  g.fillStyle = "#e8dcc0"; g.fillRect(0, Y(2.72), 1024, 0.06 * P);
  // shop front: dark wood frame + glass + door
  g.fillStyle = "#3a2a24"; g.fillRect(0, Y(2.06), 1024, Y(CAFE.y0) - Y(2.06));
  for (const [x0, x1] of [[-2.25, -0.75], [-0.6, 0.45], [0.95, 2.0]]) { const gg = g.createLinearGradient(0, Y(2.02), 0, Y(1.12)); gg.addColorStop(0, "#f4d898"); gg.addColorStop(1, "#c89a60"); g.fillStyle = gg; g.fillRect(X(x0), Y(2.02), (x1 - x0) * P, Y(1.12) - Y(2.02));
    for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(255,250,230,0.8)"; g.beginPath(); g.arc(X(x0) + ((k + 0.5) / 5) * (x1 - x0) * P, Y(1.93), 6, 0, TAU); g.fill(); }
    g.fillStyle = "rgba(90,60,40,0.5)"; g.fillRect(X(x0), Y(1.4), (x1 - x0) * P, 8); }
  g.fillStyle = "#5a3a2a"; g.fillRect(X(0.5), Y(2.04), 0.42 * P, Y(1.08) - Y(2.04)); g.fillStyle = "#f4d898"; g.fillRect(X(0.55), Y(1.96), 0.32 * P, 0.45 * P);
  // awning (red / white stripes, scalloped edge) + the CAFE sign
  const ay0 = Y(2.4), ay1 = Y(2.08);
  for (let x = 0; x < 1024; x += 40) { g.fillStyle = (x / 40) % 2 ? "#f6f0e4" : "#d8323a"; g.beginPath(); g.moveTo(x, ay0); g.lineTo(x + 40, ay0); g.lineTo(x + 44, ay1); g.arc(x + 22, ay1, 22, 0, Math.PI); g.lineTo(x - 4, ay1); g.closePath(); g.fill(); }
  g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, ay0, 1024, 8);
  g.fillStyle = "#24345e"; rrect(g, X(-0.95), Y(2.68), 1.5 * P, 0.25 * P, 10); g.fill(); g.strokeStyle = "#f2d27a"; g.lineWidth = 6; rrect(g, X(-0.95) + 6, Y(2.68) + 6, 1.5 * P - 12, 0.25 * P - 12, 8); g.stroke();
  ctext(g, "CAFE", X(-0.2), Y(2.485), 0.2 * P, "#f8e8b0", 1.3 * P, "Georgia, serif", "bold");
  // fix r1 (A1 P2 shot 15): the cafe's own sidewalk is the floor CHAR's people stand on (visible y ~0.98-1.22 through
  // the window): paving slabs, a kerb line, a strip of asphalt below it
  g.fillStyle = "#c8c0b0"; g.fillRect(0, Y(1.22), 1024, 640 - Y(1.22)); speck(g, r, 1024, 640, 900, ["#a8a090", "#d8d0c0"], 1, 3, 0.4);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = "rgba(90,80,70,0.35)"; g.fillRect(x, Y(1.22), 2, Y(1.0) - Y(1.22)); }
  g.fillStyle = "rgba(90,80,70,0.35)"; g.fillRect(0, Y(1.1), 1024, 2);
  g.fillStyle = "#e8e2d4"; g.fillRect(0, Y(1.0), 1024, 6); g.fillStyle = "#8a847a"; g.fillRect(0, Y(1.0) + 6, 1024, 4);
  g.fillStyle = "#5a5a62"; g.fillRect(0, Y(1.0) + 10, 1024, 640 - Y(1.0) - 10);
  // a parked sedan at the kerb (left), two-tone, chrome bumper
  { const x0 = X(-2.05), x1 = X(-1.3), yb = Y(0.98), yt = Y(1.42); g.fillStyle = "#3a8a8a"; rrect(g, x0, Y(1.28), x1 - x0, yb - Y(1.28), 16); g.fill(); g.fillStyle = "#f2ece0"; rrect(g, x0 + 30, yt, (x1 - x0) * 0.6, Y(1.28) - yt + 4, 12); g.fill();
    g.fillStyle = "#9ec8e0"; g.fillRect(x0 + 40, yt + 6, (x1 - x0) * 0.24, Y(1.28) - yt - 8); g.fillRect(x0 + 50 + (x1 - x0) * 0.26, yt + 6, (x1 - x0) * 0.24, Y(1.28) - yt - 8);
    g.fillStyle = "#d8dce0"; g.fillRect(x0, yb - 14, x1 - x0, 6); g.fillStyle = "#1e1e22"; for (const x of [x0 + 34, x1 - 40]) { g.beginPath(); g.arc(x, yb - 4, 14, 0, TAU); g.fill(); } }
  // pigeons on the awning's top edge
  for (const x of [-1.5, -0.7, 0.3, 1.2]) { const px = X(x), py = Y(2.42); g.fillStyle = "#8a8e9a"; g.beginPath(); g.ellipse(px, py - 8, 11, 7, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(px - 9, py - 15, 5, 0, TAU); g.fill(); g.fillStyle = "#e8a83a"; g.fillRect(px - 16, py - 15, 4, 2); }
  // sidewalk tables (round, white cloth) + chairs
  for (const x of [-1.65, 0.85]) { g.fillStyle = "#f8f4ec"; g.beginPath(); g.ellipse(X(x), Y(1.4), 0.28 * P, 0.05 * P, 0, 0, TAU); g.fill(); g.fillRect(X(x) - 0.26 * P, Y(1.4), 0.52 * P, 0.24 * P); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(X(x) - 0.26 * P, Y(1.24), 0.52 * P, 0.08 * P);
    for (const s of [-1, 1]) { g.fillStyle = "#3a5a8a"; g.fillRect(X(x + s * 0.36) - 3, Y(1.5), 6, 0.4 * P); } }
  // a potted bay tree each side of the door, a lamp post
  for (const x of [0.38, 1.02]) { g.fillStyle = "#8a5a3a"; g.fillRect(X(x) - 12, Y(1.3), 24, 0.22 * P); g.fillStyle = "#3a7a3a"; g.beginPath(); g.arc(X(x), Y(1.5), 26, 0, TAU); g.fill(); }
  g.fillStyle = "#2a2a30"; g.fillRect(X(1.85), Y(2.62), 8, Y(1.1) - Y(2.62)); g.fillStyle = "#f8e0a0"; g.beginPath(); g.arc(X(1.85) + 4, Y(2.64), 14, 0, TAU); g.fill();
}, true);
/** sky + the upper storeys / roofs behind the cafe (opaque back layer) */
const ofSkyTex = () => tx("ofSky", 1024, 680, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 680); gr.addColorStop(0, "#5aa0ec"); gr.addColorStop(0.6, "#bcdcf6"); gr.addColorStop(1, "#f4e8d0"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 680);
  for (let i = 0; i < 6; i++) { const x = r() * 1024, y = 40 + r() * 200; for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(255,255,255,0.88)"; g.beginPath(); g.arc(x + k * 30, y + (k % 2) * 8, 28 + r() * 14, 0, TAU); g.fill(); } }
  let x = 0; while (x < 1024) { const w = 80 + r() * 140, h = 180 + r() * 220; g.fillStyle = jit(r, ["#c8a888", "#a87a62", "#d8c8b0"][Math.floor(r() * 3) % 3], 0.06); g.fillRect(x, 680 - h, w, h);
    for (let wy = 680 - h + 20; wy < 640; wy += 46) for (let wx = x + 12; wx < x + w - 20; wx += 30) { g.fillStyle = "#7a9ac0"; g.fillRect(wx, wy, 16, 24); } x += w; }
}, true);
/** a cafe person: a bean-head cartoon (seated or standing, facing left / right), body colour + item, no arm on the card
 *  side (the moving arm is a separate stick + hand-with-card quad) */
const personTex = (key: string, body: string, hair: string, standing: boolean, faceR: boolean, apron = false, hat = "") => tx("ofP" + key, 256, 384, (g) => {
  g.clearRect(0, 0, 256, 384); const ink = "#2c1e2a"; g.lineJoin = "round"; g.lineCap = "round";
  const top = standing ? 150 : 175, bot = standing ? 384 : 330;
  g.fillStyle = body; rrect(g, 70, top, 116, bot - top, 40); g.fill(); g.strokeStyle = ink; g.lineWidth = 7; g.stroke();
  if (apron) { g.fillStyle = "#f8f6f0"; rrect(g, 88, top + 40, 80, bot - top - 40, 16); g.fill(); g.stroke(); }
  if (!standing) { g.fillStyle = shadeHex(body, -0.15); rrect(g, 60, 290, 140, 40, 16); g.fill(); g.stroke(); }
  g.strokeStyle = ink; g.lineWidth = 9; const sx = faceR ? 80 : 176; g.beginPath(); g.moveTo(sx, top + 30); g.lineTo(sx + (faceR ? -6 : 6), top + 95); g.stroke(); g.fillStyle = "#f8f3ee"; g.beginPath(); g.arc(sx + (faceR ? -6 : 6), top + 100, 11, 0, TAU); g.fill(); g.lineWidth = 5; g.stroke();
  const hy = top - 62; g.fillStyle = "#f8f3ee"; g.beginPath(); g.ellipse(128, hy, 56, 62, 0, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 7; g.stroke();
  g.fillStyle = hair; g.beginPath(); g.ellipse(128 + (faceR ? -10 : 10), hy - 36, 56, 30, faceR ? -0.2 : 0.2, Math.PI, TAU); g.fill();
  if (hat) { g.fillStyle = hat; g.fillRect(70, hy - 66, 116, 14); rrect(g, 88, hy - 104, 80, 44, 10); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.strokeRect(70, hy - 66, 116, 14); }
  const ex = faceR ? 146 : 110; g.fillStyle = "#2a2030"; g.beginPath(); g.arc(ex - 12, hy + 2, 6, 0, TAU); g.arc(ex + 12, hy + 2, 6, 0, TAU); g.fill();
  g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(ex, hy + 18, 14, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = "rgba(240,120,120,0.35)"; g.beginPath(); g.arc(ex - 26, hy + 16, 9, 0, TAU); g.arc(ex + 26, hy + 16, 9, 0, TAU); g.fill();
}, true);
/** the moving arm: a stick (u along) ending in a ball hand that holds a plain cream card (no marks) */
const handCardTex = () => tx("ofHandCard", 256, 64, (g) => {
  g.clearRect(0, 0, 256, 64); g.lineCap = "round"; g.strokeStyle = "#2c1e2a"; g.lineWidth = 9; g.beginPath(); g.moveTo(8, 32); g.lineTo(200, 32); g.stroke();
  g.fillStyle = "#f6f0dc"; rrect(g, 196, 6, 54, 34, 5); g.fill(); g.strokeStyle = "#2c1e2a"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#c9a14a"; g.fillRect(204, 14, 12, 9);
  g.fillStyle = "#f8f3ee"; g.beginPath(); g.arc(204, 34, 11, 0, TAU); g.fill(); g.lineWidth = 4; g.stroke();
}, true);
/** a small framed line chart for the office wall (no numbers, a rising line) */
/** fix r3 (ADD #70): the same chart one green step higher (it ticks up on "Warren"; no numbers) */
const ofChartTex2 = () => tx("ofChartT2", 360, 200, (g) => {
  g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 360, 200); g.strokeStyle = "rgba(60,80,120,0.25)"; g.lineWidth = 2; for (let y = 30; y < 190; y += 32) { g.beginPath(); g.moveTo(20, y); g.lineTo(340, y); g.stroke(); }
  g.strokeStyle = "#2a2a3a"; g.lineWidth = 4; g.beginPath(); g.moveTo(24, 20); g.lineTo(24, 180); g.lineTo(340, 180); g.stroke();
  g.strokeStyle = "#1f7a3a"; g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); [[30, 160], [75, 150], [110, 158], [150, 120], [190, 128], [230, 80], [265, 88], [300, 46], [338, 22]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
}, true);
const ofChartTex = () => tx("ofChartT", 360, 200, (g) => {
  g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 360, 200); g.strokeStyle = "rgba(60,80,120,0.25)"; g.lineWidth = 2; for (let y = 30; y < 190; y += 32) { g.beginPath(); g.moveTo(20, y); g.lineTo(340, y); g.stroke(); }
  g.strokeStyle = "#2a2a3a"; g.lineWidth = 4; g.beginPath(); g.moveTo(24, 20); g.lineTo(24, 180); g.lineTo(340, 180); g.stroke();
  g.strokeStyle = "#1f7a3a"; g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); [[30, 160], [80, 150], [120, 158], [170, 120], [210, 128], [260, 80], [300, 88], [335, 40]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
}, true);
const newspaperTex = () => tx("ofPaper", 900, 660, (g, r) => {
  g.fillStyle = "#f2eee2"; g.fillRect(0, 0, 900, 660); speck(g, r, 900, 660, 2000, ["#c8c0b0"], 1, 3, 0.3);
  g.fillStyle = "#2a2a2a"; g.fillRect(30, 26, 840, 60); g.fillStyle = "#f2eee2"; for (let x = 60; x < 840; x += 34) g.fillRect(x, 44, 20 + r() * 8, 24);
  g.fillStyle = "#2a2a2a"; g.fillRect(30, 96, 840, 4);
  ctext(g, "OIL TANKS", 450, 230, 150, "#141414", 840);
  ctext(g, "FULL OF WATER", 450, 380, 130, "#141414", 850);
  g.fillStyle = "#9a9a9a"; g.fillRect(40, 420, 300, 210); g.fillStyle = "#6a6a6a"; g.fillRect(80, 480, 220, 110);
  g.fillStyle = "rgba(40,40,40,0.55)"; for (let y = 430; y < 630; y += 16) { g.fillRect(370, y, 230 + r() * 40, 6); g.fillRect(640, y, 200 + r() * 30, 6); }
}, true);
/** the BUY slip: a yellow note, the word written in pencil letter by letter (n = letters shown) */
const buyTex = (n: number) => tx("ofBuy" + n, 420, 300, (g, r) => {
  g.fillStyle = "#f8eea0"; g.fillRect(0, 0, 420, 300); speck(g, r, 420, 300, 300, ["#d8c870"], 1, 3, 0.4);
  g.fillStyle = "rgba(200,60,60,0.35)"; g.fillRect(0, 40, 420, 3);
  g.strokeStyle = "#20304a"; g.lineWidth = 16; g.lineCap = "round"; g.lineJoin = "round";
  if (n >= 1) { g.beginPath(); g.moveTo(70, 90); g.lineTo(70, 240); g.moveTo(70, 90); g.bezierCurveTo(140, 80, 140, 160, 72, 162); g.bezierCurveTo(156, 160, 150, 248, 72, 240); g.stroke(); }
  if (n >= 2) { g.beginPath(); g.moveTo(170, 92); g.lineTo(172, 200); g.bezierCurveTo(176, 250, 250, 250, 250, 200); g.lineTo(252, 92); g.stroke(); }
  if (n >= 3) { g.beginPath(); g.moveTo(290, 92); g.lineTo(325, 160); g.lineTo(362, 90); g.moveTo(325, 160); g.lineTo(323, 242); g.stroke(); }
  if (n >= 4) { g.lineWidth = 9; g.beginPath(); g.moveTo(60, 268); g.bezierCurveTo(160, 255, 260, 280, 370, 262); g.stroke(); }
}, true);
const curtainTex = (key: string, base: string) => tx(key, 256, 512, (g, r) => {
  for (let x = 0; x < 256; x++) { const k = 0.82 + 0.22 * Math.sin((x / 256) * TAU * 3) + 0.06 * Math.sin((x / 256) * TAU * 7); g.fillStyle = shadeHex(base, (k - 1) * 0.5); g.fillRect(x, 0, 1, 512); }
  speck(g, r, 256, 512, 600, [shadeHex(base, -0.1)], 1, 2, 0.3); g.fillStyle = shadeHex(base, -0.18); g.fillRect(0, 490, 256, 22);
});
const rugTex = (key: string, a: string, b: string) => tx(key, 512, 384, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 512, 384); g.fillStyle = b; g.fillRect(24, 24, 464, 336); g.fillStyle = a; g.fillRect(44, 44, 424, 296);
  for (let y = 70; y < 330; y += 52) for (let x = 70; x < 460; x += 52) { g.fillStyle = b; g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 16, y); g.lineTo(x, y + 16); g.lineTo(x - 16, y); g.closePath(); g.fill(); }
  speck(g, r, 512, 384, 3000, ["#000000", "#ffffff"], 1, 2, 0.08);
});

// ======================================================================================================== anchors (local)
// New set-local anchors derived from plan.ts (reported to the LEAD): the receipt moved left of the banker on a slanted
// stand so it reads from the shot-3 camera; the stamp + pad sit between him and it.
const RECEIPT_B: P3 = [-0.44, 0.8, -0.44];        // bottom-edge midpoint of the slanted OIL RECEIPT (bank-local)
// fix r1 (A1 P2 shot 3: the upright receipt hid the banker's torso): leans back 52 deg from vertical on a desk easel,
// its top edge at his chest; the words stay >= 45 px tall from the shot-3 camera
// fix r2 (A2 P2 shot 3: it still stood like a sign and hid the banker from the chin down): leans back further (26 deg
// above the desk), a bit larger (0.72 x 0.48) with bigger letters, so the top edge sits well under his chin and the
// words stay >= 40 px. New APPROVED spot / normal (bank-local) for CHAR: RC_P [-0.365, 0.864, -0.550], RC_N [-0.113, 0.899, 0.423]
const RECEIPT_YAW = -0.26, RECEIPT_TILT = (26 * Math.PI) / 180;
const PAD: P3 = [-0.06, 0.785, -0.92];             // the ink pad (the banker's hand-held stamp is CHAR's; the 3D stamp is hidden in shots 3 / 5)
/** shot 5: the two piles of stamped receipts under the banker's two stamp hands (CHAR cast.ts stamps at x +-0.55, z -0.95) */
const PILES: P3[] = [[-0.55, 0.785, -0.97], [0.55, 0.785, -0.97]];
/** shot 5 stamp landings (carryover r1 NEW FRAMES stamps_5, the score's beats; CHAR lands the stamps here): a fresh
 *  stamped receipt drops onto pile (i % 2) at each */
const STAMP5 = [933.1, 963.4, 993.6];
const LAMP: P3 = [-0.6, 0.785, -1.2];              // fix r1: the brass + green banker's lamp, pulled into the shot-5 frame (desk back-left)
/** fix r2: the banker's lamp is a movable group, placed per shot (x, z, yaw): shot 3 = 0.25 m right of r1 (its bulb + pool
 *  light the receipt and his hands, A2 P2); shot 5 = between the middle and right stacks (A2 P2: its green shade reads
 *  and it throws a warm pool on the blotter); shot 6 = hidden with the whole desk (A2 P1) */
// fix r3 (A3 P2 shot 5: the lamp's shade sat across his mouth line and hid his stamping arm): no lamp in shot 5 (the
// push leaves no clean spot for it); its warm pool stays on the blotter between the stacks (layoutPools)
const BK_LAMP: Record<number, [number, number, number]> = { 3: [-0.35, -1.15, 0.12] };
/** fix r3 (A3 P2 shot 3): the cash leaves with Tino's hand: it arrives at BK.cashTo (cast.ts cashSlide), the sleeve
 *  reaches in from frame right (TINO_IN .. TINO_GRAB), grabs, and pulls it out of frame (TINO_GRAB + 2 .. TINO_OUT) */
const TINO_IN = BEAT.againstIt + 5, TINO_GRAB = BEAT.againstIt + 14, TINO_OUT = BEAT.againstIt + 30;
const CASH_OUT: P3 = [1.45, 0.93, -0.36];
/** fix r3 (CHAR P2 / carryover shot 5): every stamp landing ON an outer stack (from "more" - 4 on) marks its top bundle
 *  red 1 f later and pops ONE more bundle onto it at landing + 9 (cast.ts stackTop5 must count these: lead_requests) */
const STAMP_ON: [number[], number[]] = [STAMPS5.L.filter((c) => c >= BEAT.more1 - 4), STAMPS5.R.filter((c) => c >= BEAT.more1 - 4)];
const STAMP_POP = 9;
/** the trading floor's pendant globes (x, z): the warm pools under them are per-set pools (layoutPools) */
const TR_PEND: [number, number][] = [[-1.35, -1.7], [1.55, -2.6], [-2.6, -3.9], [2.0, -0.4], [-3.3, 1.0]];
const FAN: P3 = [0.8, 0.935, -1.1];                // the oscillating desk fan (on the ledgers)
const BK_CLOCK: P3 = [-2.45, 2.82, -3.46];         // the wall clock above the bookcase (behind the chart)
const BK_CLOCK3: P3 = [0.93, 2.8, -3.46];          // fix r1 (A1 P3 shot 3): a second generic wall clock beside the window (the bank's tick)
/** fix r1 (A1 P1 shot 5): the three stacks spread to x -0.42 / 0 / +0.42 (out of the banker's head rectangle); the
 *  middle one caps at 9 bundles (pops in place), the outer two grow to 13 (drop in tilted) */
const STACKS: P3[] = [[-0.42, 0.785, -0.52], [0.0, 0.785, -0.47], [0.42, 0.785, -0.52]];
/** the standing brass LOANS desk nameplate (A1 P2: moved off the apron, above the caption band) per shot */
const NAMEPLATE: Record<number, P3> = { 5: [-0.21, 0.785, -0.38] };  // fix r2 (A2 P2 shot 3): the brass LOANS plate on the desk top edge in shot 3 too (y ~590-640 at 540p, above the captions)
/** shot 3 window: the near gravel yard layer the inspectors walk on (bank-local z, ground y) */
const YARD = { z: -3.92, y: 1.24, x0: 1.05, x1: 2.75 };
/** fix r3 (kitchen): the bottle's shadow direction on the table (xz, unit) = -KEY_KITCHEN flattened (toward camera-left);
 *  the contact-shadow decal's yaw for it; the kettle on the counter (kitchen-local) */
const KI_SH = [-0.803, -0.596] as const, KI_SHA = -0.64;
const KETTLE: P3 = [0.92, 0.93, -2.27];
/** interior POOL slots this module writes (0..INT_POOLS-1); the rest are free for the exteriors */
// fix r1: 18 slots (sets_ext.ts writes no pools, so slots 13..17 are taken over for the new practicals); one slot can
// serve one place per shot (pose() rewrites the shared slots per set)
const INT_POOLS = 18;
const PO = { bkLamp: 0, bkWin: 1, bkSconce: 2, trPend: 3, trWin: 4, kiWall: 5, kiGold: 6, prLampA: 7, prLampB: 8, prBlob: 9, prBench: 10, ofWin: 11, ofLamp: 12,
  bkCool: 13, bkPic: 14, x15: 15, x16: 16, x17: 17 };
type PoolV = { p: THREE.Vector3; c: THREE.Vector3; r: number };
type Shaft = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; p0: THREE.Vector3; d: THREE.Vector3; len: number; w: number; k: THREE.Color; ph: number };

/** the oil blob's x on the pump pipe (mirrors cast.ts pumproom(): A - 0.8 -> A on COUNT_AT[0], -> B on [1], -> C (blobCU) on [2]) */
const blobX = (f: number) => {
  const xA = PR.tanks[0][0], xB = PR.tanks[1][0], xC = PR.blobCU[0], [tA, tB, tC] = COUNT_AT, t0 = BEAT.pumped, seg = (a: number, b: number) => clamp01((f - a) / (b - a));
  return f < t0 ? xA - 0.8 : f < tA ? xA - 0.8 + 0.8 * smooth(seg(t0, tA)) : f < tB ? xA + (xB - xA) * smooth(seg(tA + 4, tB)) : f < tC ? xB + (xC - xB) * smooth(seg(tB + 4, tC)) : xC;
};

export class Interiors {
  private g = new THREE.Group();
  private bank = new THREE.Group(); private trading = new THREE.Group(); private cut = new THREE.Group();
  private kitchen = new THREE.Group(); private pump = new THREE.Group(); private office = new THREE.Group();
  private hook: THREE.Mesh;
  // fix r2 (bank): the desk group (hidden in shot 6), the movable lamp, the window yard ramp + bigger inspectors, the vault
  // door, the blind stripes, the floor props, the shot-6 window + umbrella stand
  private deskG = new THREE.Group(); private lampG = new THREE.Group(); private blinds5!: THREE.Mesh; private blindsF!: THREE.Mesh; private blindsC!: THREE.Mesh; private pigeon!: THREE.Mesh;
  private funnel: THREE.Mesh[] = []; private shipM!: THREE.Mesh; private bkFloor5 = new THREE.Group(); private bkFloor3 = new THREE.Group(); private calendar5!: THREE.Group; private vaultG = new THREE.Group(); private box6 = new THREE.Group();
  // this World's values for the shared uniforms (written by the hook right before this scene draws)
  private poolDom = 0; private rim = new THREE.Vector3(); private ws = new THREE.Vector3(1, 1, 1); private wl = new THREE.Vector3(); private wk = 0; private fill = new THREE.Vector3();
  private pools: PoolV[] = Array.from({ length: INT_POOLS }, () => ({ p: new THREE.Vector3(), c: new THREE.Vector3(), r: 0 }));
  private poolCol: THREE.Vector3[] = [];
  private shafts: Shaft[] = [];
  // bank
  private stamp = new THREE.Group(); private rcG = new THREE.Group(); private approved!: THREE.Mesh; private rcN = new THREE.Vector3(); private rcP = new THREE.Vector3();
  // fix r3 (bank): Tino's sleeve, the adding machine's cash drawer, stamped stack materials, front-falling bills, the vault door steel
  private sleeve!: THREE.Mesh; private addDrawer = new THREE.Group(); private bmStack: THREE.Material[][] = []; private frontBills: { m: THREE.Mesh; t: number; x: number; ph: number }[] = [];
  private vaultSteel!: THREE.MeshLambertMaterial; private vaultDoor!: THREE.Group;
  private cash = new THREE.Group(); private stacks: THREE.Mesh[][] = []; private drums: THREE.Mesh[] = []; private drumSlot: { u: number; v: number; t: number; row: number }[] = [];
  private insp: THREE.Mesh[] = []; private inspSh: THREE.Mesh[] = []; private fanHead = new THREE.Group(); private fanBlades = new THREE.Group(); private bkHands: THREE.Mesh[] = []; private bkMotes!: Motes;
  // fix r1 (bank): the second clock, the nameplate, the shot-5 piles + loose bills + tape, window life, cigar smoke, picture lamp
  private bkHands3: THREE.Mesh[] = []; private nameplate = new THREE.Group(); private pileSheets: { m: THREE.Mesh; t: number; pile: number; k: number }[] = [];
  private bills: { m: THREE.Mesh; t: number; x: number; z: number; ph: number }[] = []; private addTape!: THREE.Mesh; private addTapeN = 0;
  private truck!: THREE.Mesh; private gulls: THREE.Mesh[] = []; private flag!: THREE.Mesh; private smoke: THREE.Mesh[] = []; private paperFlap!: THREE.Mesh;
  private trayStack: THREE.Mesh[] = []; private tick!: THREE.Mesh; private glint6!: THREE.Sprite; private plantLeaves = new THREE.Group(); private bkMotes6!: Motes;
  // trading
  private chalk!: THREE.Mesh; private chalkN = 0; private chalkT: number[] = []; private arrow!: THREE.Mesh; private rainMats: THREE.MeshBasicMaterial[] = [];
  private tape: { m: THREE.Mesh; x: number; z: number; y0: number; sp: number; ph: number; t0: number; spin: number }[] = []; private trHands: THREE.Mesh[] = [];
  private pendants: THREE.Object3D[] = []; private fans: THREE.Object3D[] = [];
  // fix r3 (trading): the board boy + rolling ladder, the ticker's bell hammer
  private ladder = new THREE.Group(); private boy!: THREE.Mesh; private boyMat!: THREE.MeshBasicMaterial; private boyArm!: THREE.Mesh; private boyHand!: THREE.Mesh; private tickHammer = new THREE.Group();
  // fix r2 (trading): the painted pit crowd, the dangling handset, the FG desk's cigarette smoke
  private trCards: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; v: number; ph: number; per: number; base: number; phone: boolean }[] = []; private handset = new THREE.Group(); private trSmoke: THREE.Mesh[] = [];
  private trWinMats: THREE.MeshBasicMaterial[] = []; private chalkPts: THREE.Vector3[] = []; private dust: THREE.Sprite[] = []; private gobo!: THREE.Mesh;
  private trDrips: { x: number; y: number; z: number; ph: number }[] = []; private dripS: THREE.Sprite[] = [];
  // cutaway
  private wFront!: THREE.Mesh; private wBack!: THREE.Mesh; private wTop!: THREE.Mesh; private oilBand!: THREE.Mesh; private oilTop!: THREE.Mesh;
  private pourW!: THREE.Mesh; private pourO!: THREE.Mesh; private looks!: THREE.Mesh; private bubbles!: THREE.Points; private splash: THREE.Sprite[] = []; private sparkle!: THREE.Sprite;
  private cuMats: THREE.ShaderMaterial[] = [];
  // fix r1 (cutaway): the pour pipe group + spout, splash rings, gold drops, the shot-10 glint, the dark state (murk veil,
  // flashlight beam + motes, hatch glow), weeds, silt, the shot-12 tape
  private pipe = new THREE.Group(); private spout = new THREE.Vector3(); private ripples: THREE.Mesh[] = []; private drops: THREE.Sprite[] = []; private glint10!: THREE.Sprite;
  private hatchShafts: Shaft[] = []; private murk!: THREE.Mesh; private beam!: Shaft; private beamMotes!: Motes; private hatchGlow!: THREE.Sprite;
  private weeds: { m: THREE.Mesh; base: Float32Array; h: number; ph: number }[] = []; private silt!: Motes; private tapeG = new THREE.Group();
  private gullSh!: THREE.Mesh; private wallGl: THREE.Sprite[] = []; private waterTag!: THREE.Mesh; private waterLead!: THREE.Mesh;
  // fix r3 (cutaway): the top phantom rim, slosh droplets, the OIL tag, the bob glint, the tyre's bubble, rust flecks
  private topRim!: THREE.Mesh; private sloshDrops: THREE.Sprite[] = []; private oilTag!: THREE.Mesh; private bobGlint!: THREE.Sprite; private tyreBub!: THREE.Sprite; private rust!: Motes;
  // kitchen
  private caustic!: THREE.Mesh; private botShadow!: THREE.Mesh; private botContact!: THREE.Mesh; private radioDial!: THREE.Sprite; private sparrow!: THREE.Mesh; private sheet!: THREE.Mesh; private sheetBase!: Float32Array; private catTail!: THREE.Mesh;
  private botInk = new THREE.Group(); private botTint!: THREE.Mesh; private kiSteam: THREE.Mesh[] = [];
  private bottle = new THREE.Group(); private liquid!: THREE.ShaderMaterial; private glassM = glassMat(); private kiHands: THREE.Mesh[] = []; private kiMotes!: Motes; private curtainsK: THREE.Mesh[] = [];
  // pump room
  private plates: { dash: THREE.Mesh; n: THREE.Mesh; base: THREE.Vector3 }[] = []; private wheels: THREE.Object3D[] = []; private needles: { m: THREE.Object3D; base: number; amp: number; ph: number; tank: number }[] = [];
  private slugs: { m: THREE.Mesh; x0: number; x1: number }[] = []; private sights: { m: THREE.Mesh; i: number }[] = []; private lampsP: { g: THREE.Object3D; ph: number }[] = [];
  private prMotes!: Motes; private moths: THREE.Sprite[] = [];
  private pipeOil: { m: THREE.ShaderMaterial; x0: number; x1: number }[] = []; private flywheel = new THREE.Group(); private drip!: THREE.Sprite;
  private prSteam: { m: THREE.Mesh; x: number; y: number; z: number; k: number }[] = []; private mcuNeedle!: THREE.Object3D; private drip2!: THREE.Sprite;
  // fix r3 (pump): the COUNTED: 2 steam puff, chalk tallies by B / C, the gold smear in the glass
  private puff: THREE.Mesh[] = []; private tallies: { m: THREE.Mesh; i: number }[] = []; private smears: { m: THREE.Mesh; x0: number; x1: number }[] = [];
  // office
  private buy: THREE.Mesh[] = []; private pencil = new THREE.Group(); private steam: THREE.Mesh[] = []; private people: { arm: THREE.Mesh; sx: number; sy: number; reach: number; ang0: number; ang1: number; ph: number; per: number; body: THREE.Mesh; by: number }[] = [];
  private ofHands: THREE.Mesh[] = []; private ofCord = new THREE.Group();
  // fix r3 (office): the rug pane patch, the chair stripes, the ceiling-fan shadow, the framed chart
  private rugPatch!: THREE.Mesh; private chairStripes!: THREE.Mesh; private fanSh!: THREE.Mesh; private ofChart!: THREE.Mesh;
  private sunPatch!: THREE.Mesh; private ofMotes2!: Motes; private ofView: THREE.MeshBasicMaterial[] = []; private sunGlow!: THREE.Sprite; private curtainsO: THREE.Mesh[] = []; private ofMotes!: Motes;

  constructor(root: THREE.Object3D) {
    root.add(this.g);
    this.g.add(this.bank, this.trading, this.cut, this.kitchen, this.pump, this.office);
    // the hook: a zero-area triangle drawn first in every pass of this World's scene
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    this.hook = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    this.hook.frustumCulled = false; this.hook.renderOrder = -1e9;
    this.hook.onBeforeRender = () => {
      const X = TONE_X;
      X.uRimCol.value.copy(this.rim); X.uFill.value.copy(this.fill); X.uWoodShade.value.copy(this.ws); X.uWoodLift.value.copy(this.wl); X.uWoodK.value = this.wk;
      X.uCloud.value.set(1, 0, -1e5, -1e5); X.uCloudW.value = 1; X.uCloudTint.value.set(1, 1, 1); X.uPoolDom.value = this.poolDom;
      for (let i = 0; i < INT_POOLS; i++) { const p = this.pools[i]; POOL.uPoolPos.value[i].copy(p.p); POOL.uPoolCol.value[i].copy(p.c); POOL.uPoolRad.value[i] = p.r; }
      this.writeZones();
    };
    root.add(this.hook);
    this.buildBank(); this.buildTrading(); this.buildCutaway(); this.buildKitchen(); this.buildPump(); this.buildOffice();
    this.setPools();
    this.poolCol = this.pools.map((p) => p.c.clone()); this.poolP0 = this.pools.map((p) => p.p.clone()); this.poolR0 = this.pools.map((p) => p.r);
  }
  private poolP0: THREE.Vector3[] = []; private poolR0: number[] = [];
  /** fix r2: per-set pool layouts. Every frame pose() restores the defaults (setPools), then the shown set takes over the
   *  slots it does not use for its own extra practicals (each World has its own pools, written by its hook) */
  private layoutPools(set: string, id: number) {
    const P = (i: number, o: V3, p: P3, col: P3, r: number) => this.setPool(i, o, p, col, r);
    if (set === "bank") {
      const L = BK_LAMP[id] ?? BK_LAMP[3];
      if (id === 5) P(PO.bkLamp, BK.base, [0.2, 0.98, -0.78], [1.7, 1.02, 0.36], 0.8);   // fix r3: the (hidden) lamp's warm pool between the stacks
      else P(PO.bkLamp, BK.base, [L[0] + 0.1, 0.98, L[1] + 0.22], [1.9, 1.12, 0.4], 1.0);
      if (id === 3) { P(3, BK.base, [0.75, 1.05, -0.75], [0.11, 0.15, 0.24], 1.3); P(4, BK.base, [1.3, 1.6, -2.3], [0.1, 0.13, 0.2], 2.2); }   // A2 P2: the cool window wedge across the desk's right half
      if (id === 5) { P(3, BK.base, [-0.95, 1.35, -1.0], [0.12, 0.16, 0.27], 1.5); P(4, BK.base, [-0.75, 1.6, -3.2], [0.1, 0.14, 0.22], 1.4); } // A2 P2: the cool blind light from screen left (cheek + back wall)
      if (id === 6) { P(3, BK.base, [-3.35, 1.7, -1.4], [0.1, 0.13, 0.22], 2.4); P(4, BK.base, [-1.25, 0.9, -2.0], [0.32, 0.22, 0.1], 0.9); }   // A2 ADD: the left-wall window's cool counter-light; a warm spill round Tino's feet
    } else if (set === "trading") {
      // A2 P2 shot 8: a warm POOL under each pendant globe on the desks and the floor (#FFD38A class)
      // fix r3 (A3 P2: the pendants bloomed but threw no warm pools): ~1.8x stronger, wider warm pools (#FFD38A class)
      TR_PEND.forEach(([x, z], k) => P(5 + k, TR.base, [x, 1.0, z + 0.2], [1.12, 0.76, 0.3], 2.1));
      P(10, TR.base, [3.6, 2.2, -1.4], [0.06, 0.08, 0.12], 3.4);    // the cool window key's spill on the right
    } else if (set === "kitchen") {
      // A2 P2 shot 11: the raking sun patch on the cloth right of the bottle (#FFD27A class) + the warm bounce round the window
      P(7, KI.base, [KI.bottle.c[0] + 0.3, KI.table.top + 0.09, KI.bottle.c[2] + 0.02], [1.2, 0.92, 0.42], 0.42);
      P(PO.kiWall, KI.base, [KI.window.c[0], 1.5, -2.2], [0.36, 0.27, 0.11], 2.0);
      P(PO.kiGold, KI.base, [KI.bottle.c[0] - 0.12, KI.table.top + 0.03, KI.bottle.c[2] + 0.14], [1.3, 0.78, 0.12], 0.45);
    } else if (set === "pumproom") {
      // A2 P2 shot 13: a warm FLOOR pool under each caged lamp (r ~1.5 m, #FFB45A class): the floor reads lit, not a blue wash
      // fix r3 (A3 P2 shot 13: the bottom band stayed navy): the lamp floor pools sit higher (0.9 m: they reach the floor at
      // a useful angle) and wider, plus three warm floor pools along the follow path (the props there read)
      [...PR.lamps, ...PR_LAMPS2].forEach((l, k) => P(k, PR.base, [l[0], 0.9, l[2] - 0.15], k < 2 ? [2.4, 1.1, 0.26] : [2.0, 0.92, 0.22], 2.0));
      P(4, PR.base, [PR.blobCU[0] + 0.5, 0.8, -2.4], [1.5, 0.7, 0.18], 1.6);   // the MCU floor in front of tank C
      for (const [i, x] of [[5, -1.3], [6, 0.4], [11, 2.2]] as number[][]) P(i, PR.base, [x, 0.9, -2.45], [2.8, 1.45, 0.38], 2.1);
    } else if (set === "office") {
      // A2 P2 shot 15: the sun's mullion patch carries a little real light on the desk + a window-side warm rim pool
      P(3, OF.base, [-0.1, 0.95, -1.05], [0.3, 0.22, 0.1], 0.8); P(4, OF.base, [0.0, 1.6, -2.2], [0.22, 0.16, 0.08], 1.3);
    }
  }

  // ------------------------------------------------------------------------------------------------ pools / zones
  private setPool(i: number, o: V3, p: P3, col: P3, r: number) { const P = this.pools[i]; P.p.set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); P.c.set(...col); P.r = r; }
  private setPools() {
    // bank: the green banker's lamp (warm, short), the window's cool daylight spill, the two wall sconces
    // fix r1: the green lamp's warm pool on the blotter (tighter + stronger), a cool window counter-light from screen
    // left (A1 P2 shot 5: #9FB3D9 at ~25 %), the shot-6 picture lamp over the easel
    this.setPool(PO.bkLamp, BK.base, [LAMP[0] + 0.12, 0.96, LAMP[2] + 0.2], [1.7, 1.02, 0.36], 1.05);
    this.setPool(PO.bkCool, BK.base, [-2.2, 1.7, 0.6], [0.13, 0.18, 0.3], 3.4);
    { const ch = BK.chart, N = [Math.sin(ch.yaw), Math.cos(ch.yaw)]; this.setPool(PO.bkPic, BK.base, [ch.c[0] + N[0] * 0.5, ch.c[1] + 0.25, ch.c[2] + N[1] * 0.5], [1.15, 0.78, 0.36], 1.45); }
    this.setPool(PO.bkWin, BK.base, [BK.window.c[0], 1.55, -3.05], [0.16, 0.24, 0.38], 2.5);
    this.setPool(PO.bkSconce, BK.base, [-0.15, 2.1, -3.25], [0.62, 0.38, 0.15], 1.7);
    // trading floor: the warm pendant globes over the floor, the cool storm light high on the board wall
    this.setPool(PO.trPend, TR.base, [0, 4.3, -2.6], [0.34, 0.24, 0.12], 5.0);
    this.setPool(PO.trWin, TR.base, [0, 5.4, -5.6], [0.12, 0.16, 0.24], 3.6);
    // kitchen: warm sun bounce on the back wall round the window, the golden caustic beside the bottle
    this.setPool(PO.kiWall, KI.base, [KI.window.c[0], 1.5, -2.25], [0.3, 0.22, 0.08], 1.9);
    // fix r1 (A1 P2): the golden caustic the sun throws THROUGH the oil, inside the bottle's shadow on the cloth (left, toward the lens)
    this.setPool(PO.kiGold, KI.base, [KI.bottle.c[0] - 0.1, KI.table.top + 0.03, KI.bottle.c[2] + 0.13], [1.7, 1.0, 0.14], 0.2);
    // pump room: the two caged work lamps (warm #FFAD58 class), the oil blob's gold glow (moves), the bench bulb
    // fix r1 (A1 P1 shot 13): TIGHT, strong amber pools (#FFB45A -> #FFE0A8 class, ~1.5-2.5 m) so the room stays royal blue
    // between them (the broad 4.4 m pools had mixed warm into the blue shade = lavender)
    PR.lamps.forEach((l, i) => this.setPool(i ? PO.prLampB : PO.prLampA, PR.base, [l[0], l[1] - 0.9, l[2] - 0.35], [3.6, 1.75, 0.38], 2.7));
    this.setPool(PO.prBlob, PR.base, [0, PR.blobY + 0.1, PR.pipe.z + 0.1], [1.3, 0.8, 0.14], 1.0);
    this.setPool(PO.prBench, PR.base, [-5.5, 2.75, -4.0], [2.4, 1.3, 0.42], 1.6);
    // pump room (fix r1): the two new caged lamps + the cool moonlight under the high window
    PR_LAMPS2.forEach((l, i) => this.setPool(i ? PO.x16 : PO.x15, PR.base, [l[0], l[1] - 0.95, l[2] - 0.2], [3.2, 1.55, 0.34], 2.3));
    this.setPool(PO.x17, PR.base, [-5.2, 3.1, -3.6], [0.06, 0.12, 0.34], 2.8);
    // office: the sunny window behind the investor, the desk lamp
    this.setPool(PO.ofWin, OF.base, [OF.window.c[0], 1.55, -2.1], [0.55, 0.42, 0.22], 2.4);
    this.setPool(PO.ofLamp, OF.base, [-0.58, 1.05, -1.15], [0.7, 0.45, 0.18], 0.9);
  }
  /** shade.ts ZONE 0 / 1 = the pump room's two work lamps: the key (KEY_PUMP) only exists inside their spots */
  private writeZones() {
    const Z = POOL.uZone.value, ZP = POOL.uZonePos.value, ZD = POOL.uZoneDir.value;
    for (let i = 0; i < ZONE_N; i++) Z[i].set(0, 0, 1, 0); // fix r1: all 4 zones = the pump room's 4 work lamps (the exteriors use none)
    const aim = V(-0.1, -1, -0.32).normalize();
    PR.lamps.forEach((l, i) => {
      if (i >= ZONE_N) return;
      ZP[i].set(PR.base[0] + l[0], PR.base[1] + l[1] - 0.1, PR.base[2] + l[2]);
      Z[i].set(2.4, 3.9, Math.cos(THREE.MathUtils.degToRad(34)), 30);
      ZD[i].set(aim.x, aim.y, aim.z, Math.cos(THREE.MathUtils.degToRad(70)));
    });
    PR_LAMPS2.forEach((l, k) => { const i = 2 + k; if (i >= ZONE_N) return;
      ZP[i].set(PR.base[0] + l[0], PR.base[1] + l[1] - 0.1, PR.base[2] + l[2]); Z[i].set(2.0, 3.4, Math.cos(THREE.MathUtils.degToRad(32)), 30);
      ZD[i].set(aim.x, aim.y, aim.z, Math.cos(THREE.MathUtils.degToRad(66))); });
  }
  private addShaft(parent: THREE.Object3D, p0: P3, d: P3, len: number, w: number, k: THREE.Color, ph = 0) {
    const mat = new THREE.MeshBasicMaterial({ map: shaftTex(), color: k.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), mat); mesh.layers.set(NOINK); mesh.renderOrder = 4; mesh.frustumCulled = false; parent.add(mesh);
    const S: Shaft = { mesh, mat, p0: V(...p0), d: V(...d).normalize(), len, w, k: k.clone(), ph }; this.shafts.push(S); return S;
  }
  /** face each shaft to the lens about its own axis, breathe slowly */
  private poseShafts(cam: THREE.Camera, gain: (s: Shaft) => number) {
    for (const S of this.shafts) {
      if (!S.mesh.parent?.visible) continue;
      // fix r1: a RIGHT-handed basis (d, side, d x side); the old (d, side, side x d) was a reflection, so
      // setFromRotationMatrix turned every shaft the wrong way (the beams pointed off into the walls / up)
      const toCam = cam.position.clone().sub(S.p0).normalize(), side = new THREE.Vector3().crossVectors(S.d, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(S.d, side).normalize();
      S.mesh.position.copy(S.p0); S.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(S.d, side, nrm));
      S.mesh.scale.set(S.len, S.w * (1 + 0.05 * vs(0.6, S.ph)), 1);
      S.mat.color.copy(S.k).multiplyScalar(gain(S) * (0.88 + 0.12 * vs(0.45, S.ph)));
    }
  }

  // ================================================================================================ BANK
  private buildBank() {
    const o = BK.base, g = this.bank, rb = new RB(o);
    const X = BK.room.w / 2, Z = BK.room.d / 2, H = BK.room.h, WT = 0.95, RT = 1.02, CR = 3.08;
    const W = BK.window, wx0 = W.c[0] - W.w / 2, wx1 = W.c[0] + W.w / 2, wy0 = W.c[1] - W.h / 2, wy1 = W.c[1] + W.h / 2;
    const wain = TM("bkWain", bkWainTex), upper = TM("bkUpper", bkUpperTex), crown = TM("bkCrown", bkCrownTex);
    const mah = TM("bkMah", () => woodTex("bkMah", "#5a2614")), mahD = C("#3e1a0e"), brass = C("#d2a84e"), cream = C("#efe6d2");
    // ---- shell: parquet, a deep green rug, plaster ceiling with a moulded border; walls = wainscot + panelling + crown
    rb.flatY(TM("bkParquet", () => parquetTex()), -X, X, -Z, Z, 0, 1, 2, 2);
    rb.panel(TM("bkRug", bkRugTex), 5.4, 4.6, 0, 0.004, -0.6, 0, -Math.PI / 2);
    rb.flatY(TM("bkCeil", () => plasterTex("bkCeil", "#eee0c2")), -X, X, -Z, Z, H, -1, 2, 2);
    for (const [a, b, c, d] of [[-X, X, -Z, -Z + 0.3], [-X, X, Z - 0.3, Z], [-X, -X + 0.3, -Z, Z], [X - 0.3, X, -Z, Z]]) rb.box(C("#d8c8a4"), a, H - 0.06, c, b, H, d, false);
    const wallZ = (z: number, face: number) => {
      rb.wallZ(wain, -X, X, 0, WT, z, face, 1.0, WT); rb.wallZ(crown, -X, X, CR, H, z, face, 1.0, H - CR, 0, CR);
      if (face > 0) { rb.wallZ(upper, -X, wx0, RT, CR, z, face, 1.0, CR - RT, 0, RT); rb.wallZ(upper, wx1, X, RT, CR, z, face, 1.0, CR - RT, 0, RT);
        rb.wallZ(upper, wx0, wx1, RT, wy0, z, face, 1.0, CR - RT, 0, RT); rb.wallZ(upper, wx0, wx1, wy1, CR, z, face, 1.0, CR - RT, 0, RT); }
      else rb.wallZ(upper, -X, X, RT, CR, z, face, 1.0, CR - RT, 0, RT);
    };
    wallZ(-Z, 1); wallZ(Z, -1);
    for (const [x, face] of [[-X, 1], [X, -1]] as [number, number][]) { rb.wallX(wain, -Z, Z, 0, WT, x, face, 1.0, WT); rb.wallX(upper, -Z, Z, RT, CR, x, face, 1.0, CR - RT, 0, RT); rb.wallX(crown, -Z, Z, CR, H, x, face, 1.0, H - CR, 0, CR); }
    // chair rail + baseboard round the room
    for (const [x0, z0, x1, z1] of [[-X, -Z, X, -Z + 0.045], [-X, Z - 0.045, X, Z], [-X, -Z, -X + 0.045, Z], [X - 0.045, -Z, X, Z]]) {
      rb.box(mahD, x0, WT, z0, x1, RT, z1, false); rb.box(mahD, x0, 0, z0, x1, 0.13, z1, false);
    }
    // ---- the window: reveals, mahogany frame + cross mullions, sill, venetian blinds pulled up, cords, radiator below
    const rv = C("#d9ccb0");
    rb.box(rv, wx0 - 0.02, wy0, -Z - 0.24, wx0, wy1, -Z, false); rb.box(rv, wx1, wy0, -Z - 0.24, wx1 + 0.02, wy1, -Z, false);
    rb.box(rv, wx0, wy1, -Z - 0.24, wx1, wy1 + 0.02, -Z, false); rb.box(rv, wx0, wy0 - 0.02, -Z - 0.24, wx1, wy0, -Z, false);
    rb.box(mah, wx0 - 0.09, wy0 - 0.02, -Z, wx0, wy1 + 0.09, -Z + 0.05); rb.box(mah, wx1, wy0 - 0.02, -Z, wx1 + 0.09, wy1 + 0.09, -Z + 0.05);
    rb.box(mah, wx0 - 0.09, wy1, -Z, wx1 + 0.09, wy1 + 0.1, -Z + 0.05); rb.box(mah, wx0 - 0.14, wy0 - 0.05, -Z, wx1 + 0.14, wy0, -Z + 0.17);
    rb.box(mah, W.c[0] - 0.025, wy0, -Z - 0.14, W.c[0] + 0.025, wy1, -Z - 0.1); rb.box(mah, wx0, wy0 + 0.62 * W.h - 0.025, -Z - 0.14, wx1, wy0 + 0.62 * W.h + 0.025, -Z - 0.1);
    const slat = C("#efe8d6");
    for (let k = 0; k < 11; k++) rb.rbox(slat, W.w - 0.04, 0.012, 0.05, W.c[0], wy1 - 0.04 - k * 0.026, -Z - 0.04, 0, 0.3);
    rb.box(C("#cfc4ac"), wx0 + 0.02, wy1 - 0.36, -Z - 0.065, wx1 - 0.02, wy1 - 0.33, -Z - 0.015);
    for (const x of [wx0 + 0.18, wx1 - 0.22]) { rb.seg(C("#e8dcc0"), [x, wy1 - 0.34, -Z - 0.02], [x, 1.32, -Z - 0.01], 0.004, false, 5); rb.geo(new THREE.SphereGeometry(0.018, 10, 8), C("#c9a14a"), x, 1.31, -Z - 0.01); }
    rb.geo(new THREE.BoxGeometry(1.2, 0.58, 0.14), TM("bkRadiator", () => radiatorTex("bkRadiator", "#d8cdb6")), W.c[0], 0.42, -Z + 0.09);
    rb.geo(cylY(0.07, 0.11, 14, false, 0.09), C("#b8623a"), wx1 - 0.25, wy0, -Z + 0.09); for (let k = 0; k < 6; k++) rb.geo(new THREE.SphereGeometry(0.035, 8, 6), C(k % 2 ? "#d83a4a" : "#3a8a3a"), wx1 - 0.25 + (hash(k) - 0.5) * 0.08, wy0 + 0.14 + hash(k + 3) * 0.06, -Z + 0.09 + (hash(k + 7) - 0.5) * 0.08);
    // the view: sky + far skyline (opaque, 3 m back), the tank-farm layer (1.1 m back), the tiny inspector, glass glare
    plane(g, faceMat("bkSky", bkSkyTex), 4.4, 3.6, [o[0] + 2.6, o[1] + 1.95, o[2] - 6.5]);
    plane(g, basic("bkFarm", () => ({ map: bkFarmTex(), alphaTest: 0.5 })), FARM.w, FARM.h, [o[0] + FARM.cx, o[1] + FARM.cy, o[2] - 4.6]);
    // fix r1 (A1 P1 shot 3): "inspectors", plural and readable: a near gravel yard just outside the glass with THREE khaki
    // inspectors (0.27 m cards, ~90-150 px tall over the push) walking in from the gate side on "sent", the lead one
    // pointing up at the far tank on "check"; soft contact shadows; a tanker truck on the far road, two gulls, a flag
    void yardTex;
    for (let k = 0; k < 3; k++) {
      this.insp.push(plane(g, basic(`bkInspM${k}`, () => ({ map: inspTex(k, 0), alphaTest: 0.5 })), 0.27, 0.54, [o[0] + 2.6, o[1] + YARD.y + 0.135, o[2] + YARD.z + 0.01 * k], 0, 0, 0, true));
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.07), basic("bkInspSh", () => ({ map: blobTex(), transparent: true, opacity: 0.45, depthWrite: false })));
      sh.layers.set(NOINK); sh.renderOrder = 2; g.add(sh); this.inspSh.push(sh);
    }
    this.truck = plane(g, basic("bkTruckM", () => ({ map: truckTex(), alphaTest: 0.5 })), 0.26, 0.1, [o[0] + 1.4, o[1] + FARM.ground + 0.05, o[2] - 4.56], 0, 0, 0, true);
    for (let k = 0; k < 2; k++) { const gm = basic("bkGullM" + k, () => ({ map: gullTex(0), transparent: true, alphaTest: 0.3, depthWrite: false })); this.gulls.push(plane(g, gm, 0.09, 0.045, [o[0] + 1.6, o[1] + 2.3, o[2] - 6.3], 0, 0, 0, true)); }
    { const fgeo = new THREE.PlaneGeometry(0.07, 0.04, 6, 1).translate(0.035, 0, 0); this.flag = new THREE.Mesh(fgeo, basic("bkFlag", () => ({ color: new THREE.Color("#c8352a"), side: THREE.DoubleSide })));
      this.flag.position.set(o[0] + FARM.hero + 0.02, o[1] + FARM.heroTop + 0.13, o[2] - 4.58); this.flag.layers.set(NOINK); g.add(this.flag);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 5), basic("bkPole", () => ({ color: new THREE.Color("#3a3a40") }))); pole.position.set(o[0] + FARM.hero + 0.02, o[1] + FARM.heroTop + 0.07, o[2] - 4.585); pole.layers.set(NOINK); g.add(pole); }
    plane(g, basic("bkGlare", () => ({ map: glareTex(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })), W.w, W.h, [o[0] + W.c[0], o[1] + W.c[1], o[2] - Z - 0.12], 0, 0, 0, true);
    // ---- back wall dressing: the harbour painting, two brass sconces, bookcase of ledgers, clock, a rubber plant, a safe
    rb.box(C("#c9a14a"), -0.7, 1.9, -Z, 0.4, 2.7, -Z + 0.05); rb.panel(TM("bkPainting", paintingTex), 0.98, 0.68, -0.15, 2.3, -Z + 0.056, 0, 0, 0);
    rb.panel(faceMat("bkPlaque", () => plaqueTex("bkPlq", "HARBOUR, 1958"), 0.75), 0.24, 0.06, -0.15, 1.93, -Z + 0.058);
    for (const x of [-1.05, 0.72]) {
      rb.box(brass, x - 0.04, 1.98, -Z, x + 0.04, 2.16, -Z + 0.02); rb.seg(brass, [x, 2.06, -Z + 0.02], [x, 2.14, -Z + 0.14], 0.01);
      rb.geo(cylY(0.075, 0.12, 16, true, 0.05), CE("#f4e2bc", "#ffd890", 0.9), x, 2.13, -Z + 0.14);
      bulb(g, [o[0] + x, o[1] + 2.17, o[2] - Z + 0.14], 0.02, "#ffd9a0", 4.5, 0.42, 0.42);
    }
    rb.box(mah, -3.45, 0, -Z, -1.55, 2.32, -Z + 0.4); rb.panel(TM("bkBooks", () => booksTex("bkBooks", ["#6a1e22", "#24523e", "#2f4a7a", "#8a6a3a", "#3a2a24"])), 1.78, 2.15, -2.5, 1.15, -Z + 0.401);
    for (let s = 0; s < 5; s++) rb.box(mahD, -3.42, 0.08 + s * 0.44, -Z + 0.02, -1.58, 0.11 + s * 0.44, -Z + 0.42);
    rb.geo(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 32).rotateX(Math.PI / 2), C("#5a2e1a"), BK_CLOCK[0], BK_CLOCK[1], BK_CLOCK[2] + 0.02);
    rb.panel(faceMat("bkClock", () => clockFaceTex("bkClock", "#c9a14a"), 0.92), 0.38, 0.38, BK_CLOCK[0], BK_CLOCK[1], BK_CLOCK[2] + 0.047);
    for (const [L, w, k] of [[0.11, 0.016, 0], [0.15, 0.011, 1], [0.16, 0.004, 2]] as number[][]) {
      const hm = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.004).translate(0, L / 2 - 0.02, 0), basic("bkHand" + k, () => ({ color: k === 2 ? new THREE.Color("#a8201a") : new THREE.Color("#1a1420") })));
      hm.position.set(o[0] + BK_CLOCK[0], o[1] + BK_CLOCK[1], o[2] + BK_CLOCK[2] + 0.052 + k * 0.002); g.add(hm); this.bkHands.push(hm);
    }
    // fix r1 (A1 P3 shot 3): a second generic wall clock beside the window, in the shot-3 frame (the ambience ticks)
    rb.geo(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 32).rotateX(Math.PI / 2), C("#4a2414"), BK_CLOCK3[0], BK_CLOCK3[1], BK_CLOCK3[2] + 0.02);
    rb.panel(faceMat("bkClock3", () => clockFaceTex("bkClock3", "#c9a14a"), 0.92), 0.27, 0.27, BK_CLOCK3[0], BK_CLOCK3[1], BK_CLOCK3[2] + 0.044);
    for (const [L, w, k] of [[0.075, 0.012, 0], [0.105, 0.008, 1], [0.115, 0.003, 2]] as number[][]) {
      const hm = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.003).translate(0, L / 2 - 0.015, 0), basic("bkHand" + k, () => ({ color: k === 2 ? new THREE.Color("#a8201a") : new THREE.Color("#1a1420") })));
      hm.position.set(o[0] + BK_CLOCK3[0], o[1] + BK_CLOCK3[1], o[2] + BK_CLOCK3[2] + 0.048 + k * 0.002); g.add(hm); this.bkHands3.push(hm);
    }
    // fix r1 (A1 P2 shot 5): the back wall dressed for the shot-5 frame: a green steel safe at the left behind the
    // chair, a coat stand with a fedora + raincoat at the right; contact shadows on the parquet
    // fix r2 (A2 ADD shots 3 / 5): the green safe gave way to a round VAULT DOOR (buildBankR2)
    { const cx = -1.6, cz = -3.08; rb.seg(C("#3a1a0e"), [cx, 0, cz], [cx, 1.85, cz], 0.022); for (let k = 0; k < 3; k++) { const a = k * 2.1; rb.seg(C("#3a1a0e"), [cx, 0.02, cz], [cx + Math.cos(a) * 0.26, 0.0, cz + Math.sin(a) * 0.26], 0.016); }
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; rb.seg(brass, [cx, 1.72, cz], [cx + Math.cos(a) * 0.14, 1.8, cz + Math.sin(a) * 0.14], 0.008); }
      rb.geo(new THREE.SphereGeometry(0.15, 16, 10, 0, TAU, 0, Math.PI / 2), C("#3a3a46"), cx + 0.08, 1.78, cz + 0.05, 0, 0, 0, [1, 0.62, 1]); rb.geo(cylY(0.21, 0.012, 20), C("#3a3a46"), cx + 0.08, 1.78, cz + 0.05);
      rb.geo(cylY(0.155, 0.02, 20), C("#7a2a2a"), cx + 0.08, 1.8, cz + 0.05);
      rb.geo(new THREE.CylinderGeometry(0.1, 0.2, 1.05, 14, 1, true), lam("si:bkCoat", () => ({ color: "#b8a070", side: THREE.DoubleSide })), cx - 0.1, 1.2, cz + 0.06, 0, 0, 0.12);
      contact(g, [o[0] + cx, o[1] + 0.006, o[2] + cz], 0.7, 0.7, 0.32); }
    this.plant(rb, -3.55, -3.0, 1.0, "#2f6a3a", "bkLeaf", "#6a3a28");
    rb.box(C("#4a5a56"), 2.8, 0, -Z, 3.75, 1.2, -Z + 0.72); rb.box(C("#3a4844"), 2.88, 0.1, -Z + 0.72, 3.67, 1.1, -Z + 0.74);
    rb.geo(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 24).rotateX(Math.PI / 2), brass, 3.27, 0.7, -Z + 0.76); rb.seg(brass, [3.5, 0.45, -Z + 0.76], [3.5, 0.8, -Z + 0.76], 0.016);
    // a framed certificate + a coat stand on the left wall (shot 6 corner)
    rb.box(C("#3a1a0e"), -X, 1.5, -2.95, -X + 0.04, 2.05, -2.55); rb.panel(faceMat("bkCert", certTex, 0.7), 0.36, 0.48, -X + 0.045, 1.775, -2.75, Math.PI / 2);
    // fix r2 (A2 P1 shot 6): the desk + everything on it live in their own group (deskG), hidden in shot 6 so Tino stands
    // full-figure by his chart (no cut-off desk / lamp / receipt card at the right edge)
    const dg = this.deskG, drb = new RB(o); g.add(dg);
    // ---- the desk (mahogany, two pedestals with drawers, a modesty panel with the LOANS plaque), leather chair
    drb.box(mah, -1.02, 0.745, -1.27, 1.02, 0.785, -0.33); drb.box(mahD, -1.0, 0.72, -1.25, 1.0, 0.745, -0.35);
    for (const s of [-1, 1]) { drb.box(mah, s > 0 ? 0.52 : -0.98, 0.06, -1.22, s > 0 ? 0.98 : -0.52, 0.72, -0.4); drb.box(mahD, s > 0 ? 0.5 : -1.0, 0, -1.24, s > 0 ? 1.0 : -0.5, 0.06, -0.38);
      drb.panel(TM("bkDrawer", drawerTex), 0.44, 0.64, s * 0.75, 0.39, -0.395); }
    drb.box(mah, -0.52, 0.22, -0.46, 0.52, 0.72, -0.42); drb.panel(TM("bkDeskFront", bkDeskFrontTex), 1.0, 0.48, 0, 0.47, -0.415);
    // fix r1 (A1 P2 shot 3/5): the apron loses the LOANS plaque (it sat under the captions): brass pulls + a keyhole, a
    // plum-brown gradient darkening the lower desk front and a knee-hole shadow, so the bottom third has depth
    drb.geo(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12).rotateX(Math.PI / 2), brass, 0, 0.62, -0.405); drb.box(C("#1a0e08"), -0.004, 0.585, -0.41, 0.004, 0.605, -0.404, false);
    for (const x of [-0.3, 0.3]) { drb.box(C("#3a2410"), x - 0.05, 0.63, -0.414, x + 0.05, 0.645, -0.409, false); drb.box(brass, x - 0.045, 0.632, -0.409, x + 0.045, 0.642, -0.404, false); }
    { const dgt = tx("bkDeskGrad", 64, 256, (g2) => { const gr = g2.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(58,30,26,0)"); gr.addColorStop(0.45, "rgba(58,30,26,0.22)"); gr.addColorStop(1, "rgba(40,18,20,0.62)"); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 256); }, true);
      const dm = basic("bkDeskGrad", () => ({ map: dgt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      for (const [x, w, z] of [[0, 1.04, -0.395], [-0.75, 0.48, -0.375], [0.75, 0.48, -0.375]] as number[][]) { const m = plane(dg, dm, w, 0.72, [o[0] + x, o[1] + 0.36, o[2] + z], 0, 0, 0, true); m.renderOrder = 2; }
      contact(dg, [o[0], o[1] + 0.008, o[2] - 0.62], 1.1, 0.5, 0.5); }
    // the standing brass LOANS desk nameplate (placed per shot in poseBank: shot 3 right of the cash, shot 5 between the stacks)
    { const np = this.nameplate, base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.07).translate(0, 0.0175, 0), mah); base.castShadow = true; np.add(base);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.09), faceMat("bkLoansN", () => plaqueTex("bkLoansN", "LOANS"), 0.9)); face.position.set(0, 0.078, 0.012); face.rotation.x = -0.26; np.add(face);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.1, 0.012).translate(0, 0.05, 0), C("#8a6420")); back.position.set(0, 0.03, 0.0); back.rotation.x = -0.26; back.castShadow = true; np.add(back);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), basic("blob0.4", () => ({ map: blobTex(), transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      sh.rotation.x = -Math.PI / 2; sh.position.set(0.02, 0.002, -0.02); sh.layers.set(NOINK); np.add(sh); dg.add(np); }
    rb.box(TM("bkLeather", () => leatherTex("bkLeather", "#6a1e1e")), -0.38, 0.5, -2.12, 0.38, 1.46, -1.98); rb.box(C("#4a1414"), -0.42, 0.42, -2.0, 0.42, 0.55, -1.5);
    for (const s of [-1, 1]) rb.box(C("#4a1414"), s * 0.42 - 0.05, 0.55, -2.0, s * 0.42 + 0.05, 0.8, -1.55);
    rb.geo(new THREE.SphereGeometry(0.4, 20, 8, 0, TAU, 0, Math.PI / 2), C("#6a1e1e"), 0, 1.38, -2.05, 0, 0, 0, [0.95, 0.18, 0.18]);
    // ---- on the desk: blotter, banker's lamp, pen stand, in-tray, phone, ledgers + fan, adding machine, ink pad
    drb.panel(TM("bkBlotter", blotterTex), 0.98, 0.56, 0, 0.787, -0.8, 0, -Math.PI / 2);
    // fix r2: the banker's lamp as a movable group (BK_LAMP per shot; its warm pool = slot bkLamp in layoutPools); a warm
    // light ellipse on the blotter under the shade
    { const lg = this.lampG; dg.add(lg);
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, cast = true) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = cast; me.receiveShadow = true; lg.add(me); return me; };
      add(cylY(0.08, 0.025, 24), brass, 0, 0, 0); add(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), brass, 0, 0.145, 0);
      add(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8).rotateZ(Math.PI / 2), brass, 0, 0.27, 0);
      add(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 24, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), lam("si:bkShadeGlass", () => ({ color: "#1d6a48", emissive: new THREE.Color("#2a9a66"), emissiveIntensity: 0.45, side: THREE.DoubleSide })), 0, 0.3, 0);
      for (const s2 of [-1, 1]) { const c = add(new THREE.CircleGeometry(0.075, 16, 0, Math.PI), C("#c9a14a"), s2 * 0.17, 0.3, 0); c.rotation.y = s2 * Math.PI / 2; }
      const glowIn = add(new THREE.CylinderGeometry(0.071, 0.071, 0.33, 24, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: glowCol("#ffe2a8", 2.4), side: THREE.BackSide }), 0, 0.3, 0, false); glowIn.layers.set(NOINK);
      bulb(lg, [0, 0.27, 0], 0.02, "#ffd9a0", 5.5, 0.55, 0.4);
      add(new THREE.CylinderGeometry(0.002, 0.002, 0.1, 4), brass, 0.1, 0.22, 0.03, false);
      contact(lg, [0, 0.003, 0], 0.24, 0.24, 0.32);
      const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.55, 0.36, 0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 }));
      lp.position.set(0.0, 0.006, 0.16); lp.layers.set(NOINK); lp.renderOrder = 3; lg.add(lp); }
    drb.box(C("#1f3a30"), 0.44, 0.785, -1.24, 0.6, 0.81, -1.14); for (const a of [-0.35, 0.3]) drb.seg(C("#1a1a1a"), [0.52 + a * 0.05, 0.81, -1.19], [0.52 + a * 0.3, 0.98, -1.17], 0.006);
    drb.box(C("#8a8a90"), -0.9, 0.785, -1.24, -0.64, 0.84, -1.04); drb.box(cream, -0.88, 0.79, -1.22, -0.66, 0.83, -1.06);
    drb.box(C("#141418"), 0.18, 0.785, -1.2, 0.4, 0.85, -1.0); drb.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 20).rotateX(-0.9), C("#f2eee4"), 0.29, 0.845, -1.0);
    drb.seg(C("#141418"), [0.18, 0.885, -1.11], [0.4, 0.885, -1.11], 0.022); for (const x of [0.18, 0.4]) drb.geo(new THREE.SphereGeometry(0.03, 10, 8), C("#141418"), x, 0.875, -1.11);
    for (const [k, col] of [[0, "#6a1e22"], [1, "#24523e"], [2, "#8a6a3a"]] as [number, string][]) drb.rbox(C(col), 0.3, 0.048, 0.23, FAN[0], 0.81 + k * 0.05, FAN[2], 0.1 * (k - 1));
    drb.box(C("#5e6e66"), 0.62, 0.785, -0.86, 0.94, 0.87, -0.6); drb.rbox(C("#4a5852"), 0.3, 0.06, 0.12, 0.78, 0.89, -0.66, 0, -0.5);
    for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 6; c2++) drb.rbox(C(c2 > 3 ? "#c8443a" : "#efe8d8"), 0.028, 0.012, 0.025, 0.66 + c2 * 0.042, 0.905 - r2 * 0.015, -0.69 + r2 * 0.03, 0, -0.5);
    drb.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 16).rotateZ(Math.PI / 2), cream, 0.78, 0.9, -0.82); drb.rbox(cream, 0.08, 0.002, 0.16, 0.78, 0.94, -0.84, 0, 0.9);
    drb.box(C("#5a5a64"), PAD[0] - 0.09, PAD[1], PAD[2] - 0.055, PAD[0] + 0.09, PAD[1] + 0.016, PAD[2] + 0.055); drb.box(C("#a8202a"), PAD[0] - 0.075, PAD[1] + 0.016, PAD[2] - 0.042, PAD[0] + 0.075, PAD[1] + 0.018, PAD[2] + 0.042, false);
    // the fan (oscillating head, spinning blades)
    drb.geo(cylY(0.055, 0.02, 20), C("#2a3a34"), FAN[0], FAN[1], FAN[2]); drb.seg(C("#2a3a34"), [FAN[0], FAN[1], FAN[2]], [FAN[0], FAN[1] + 0.13, FAN[2]], 0.012);
    this.fanHead.position.set(o[0] + FAN[0], o[1] + FAN[1] + 0.15, o[2] + FAN[2]); dg.add(this.fanHead);
    const fanM = C("#3a4a44"), cage = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 6, 32), C("#c8ccc8")); cage.position.z = 0.05; this.fanHead.add(cage);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 16).rotateX(Math.PI / 2), fanM); motor.position.z = -0.01; this.fanHead.add(motor);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.002, 0.002), C("#c8ccc8")); sp.rotation.z = (k / 6) * Math.PI; sp.position.z = 0.052; this.fanHead.add(sp); }
    this.fanBlades.position.z = 0.04; this.fanHead.add(this.fanBlades);
    for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12, -0.35, 0.7).translate(0, 0, 0), lam("si:fanBlade", () => ({ color: "#d8dcd4", side: THREE.DoubleSide }))); bl.rotation.z = (k / 3) * TAU; this.fanBlades.add(bl); }
    // ---- the OIL RECEIPT on its slanted stand + the APPROVED mark; the stamp
    const rc = this.rcG; rc.position.set(o[0] + RECEIPT_B[0], o[1] + RECEIPT_B[1], o[2] + RECEIPT_B[2]); rc.rotation.y = RECEIPT_YAW; dg.add(rc);
    const tilt = RECEIPT_TILT - Math.PI / 2, up = V(0, Math.cos(tilt), Math.sin(tilt));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(RCPT.w, RCPT.h), faceMat("bkReceipt", receiptTex)); paper.position.copy(up.clone().multiplyScalar(RCPT.h / 2)); paper.rotation.x = tilt; rc.add(paper);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(RCPT.w + 0.05, RCPT.h + 0.04, 0.02), mah); stand.position.copy(up.clone().multiplyScalar(RCPT.h / 2 - 0.012)).add(V(0, -0.012 * Math.cos(-tilt), -0.012 * Math.sin(-tilt)).multiplyScalar(0));
    stand.position.add(V(0, -Math.sin(-tilt) * 0, 0)); stand.rotation.x = tilt; stand.translateZ(-0.012); stand.castShadow = true; stand.receiveShadow = true; rc.add(stand);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(RCPT.w + 0.05, 0.03, 0.04), mah); lip.position.set(0, -0.005, 0.01); lip.castShadow = true; rc.add(lip);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.3), mahD); strut.position.set(0, -0.005, -0.15); rc.add(strut);
    // fix r3 (A3 P2): the mark sits in the card's empty lower band, centred under RECEIPT, rotated -3 deg (new RC_P for
    // CHAR's stamp contact: bank-local [-0.410, 0.861, -0.554]; RC_N unchanged [-0.113, 0.899, 0.424])
    this.approved = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.19), basic("bkApproved3", () => ({ map: approvedTex3(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    this.approved.position.set(0.0, -0.147, 0.003); this.approved.rotation.z = -0.05; this.approved.layers.set(NOINK); paper.add(this.approved);
    rc.updateMatrixWorld(true);
    this.rcP.copy(this.approved.getWorldPosition(V(0, 0, 0))); this.rcN.set(0, 0, 1).applyQuaternion(paper.getWorldQuaternion(new THREE.Quaternion()));
    const wood = C("#6a3a1e");
    const stp = (geo: THREE.BufferGeometry, m: THREE.Material, y: number) => { const s = new THREE.Mesh(geo, m); s.position.y = y; s.castShadow = true; this.stamp.add(s); };
    stp(new THREE.BoxGeometry(0.1, 0.03, 0.055), wood, 0.024); stp(new THREE.BoxGeometry(0.096, 0.009, 0.052), C("#7a1a1a"), 0.005);
    stp(new THREE.CylinderGeometry(0.012, 0.016, 0.06, 12), wood, 0.068); stp(new THREE.SphereGeometry(0.03, 14, 10), C("#8a4a26"), 0.115);
    dg.add(this.stamp);
    // ---- cash: shot 3 = three bundles that slide across; shot 5 = three stacks that grow bundle by bundle
    const bm = [TM("bkBillE", billEdgeTex), TM("bkBillE", billEdgeTex), TM("bkBill", billTex), TM("bkBillE", billEdgeTex), TM("bkBillE", billEdgeTex), TM("bkBillE", billEdgeTex)];
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.034, 0.08).translate(0, 0.017, 0), bm); m.position.set(0.004 * (k - 1), k * 0.035, 0.003 * k); m.rotation.y = 0.05 * (k - 1); m.castShadow = true; m.receiveShadow = true; this.cash.add(m); }
    dg.add(this.cash);
    // fix r3: Tino's sleeve (shot 3 only), faced to the lens in poseBank
    this.sleeve = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155).translate(0.31 - 0.07, 0, 0), basic("bkSleeveM", () => ({ map: sleeveTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })));
    this.sleeve.visible = false; g.add(this.sleeve);
    // fix r3 (AUDIO P3 shot 3: the "ka-ching" had no source): the adding machine's cash drawer pops out on "it." and back
    this.addDrawer.position.set(o[0] + 0.78, o[1] + 0.8, o[2] - 0.6); dg.add(this.addDrawer);
    { const d = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.12).translate(0, 0, -0.06), C("#4a5852")); d.castShadow = true; this.addDrawer.add(d);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), C("#d2a84e")); kn.position.set(0, 0, 0.004); this.addDrawer.add(kn);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.08), C(k === 1 ? "#9ab98a" : "#c8d8b8")); b.position.set(-0.09 + k * 0.09, 0.015, -0.06); this.addDrawer.add(b); } }
    // fix r3: the outer stacks hold 2 more bundles (popped by the stamp landings); a stamped (red-band) bundle material
    const bmR = [TM("bkBillER3", billEdgeRedTex), TM("bkBillER3", billEdgeRedTex), TM("bkBillR3", billRedTex), TM("bkBillE", billEdgeTex), TM("bkBillER3", billEdgeRedTex), TM("bkBillE", billEdgeTex)];
    this.bmStack = [bm, bmR];
    STACKS.forEach((s, si) => {
      const list: THREE.Mesh[] = [];
      for (let j = 0; j < (si === 1 ? 9 : 13 + (si === 0 ? STAMP_ON[0] : STAMP_ON[1]).length); j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.028, 0.08).translate(0, 0.014, 0), bm); m.castShadow = true; m.receiveShadow = true; m.userData.base = V(o[0] + s[0], o[1] + s[1] + j * 0.0295, o[2] + s[2]); m.userData.yaw = (hash(si * 31 + j) - 0.5) * 0.14; dg.add(m); list.push(m); }
      this.stacks.push(list);
      contact(dg, [o[0] + s[0] + 0.03, o[1] + s[1] + 0.002, o[2] + s[2] - 0.02], 0.3, 0.17, 0.42);
    });
    // fix r1 (A1 P1 shot 5): loose single bills that flutter down beside the stacks on each "more" (3 per beat)
    const billDS = lam("si:bkBillDS", () => ({ map: billTex(), side: THREE.DoubleSide }));
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.068), billDS); m.castShadow = true; dg.add(m);
      this.bills.push({ m, t: (k < 3 ? BEAT.more1 : BEAT.more2) + (k % 3) * 5 - 2, x: [-0.6, 0.5, 0.64, -0.5, 0.58, -0.64][k], z: [-0.42, -0.36, -0.4, -0.36, -0.42, -0.4][k], ph: hash(k * 3.3) * TAU }); }
    // the two piles of stamped receipts under the stamp hands (shot 5): 5 sheets each + a fresh one per stamp landing
    PILES.forEach((pp, pi) => {
      for (let k = 0; k < 7; k++) {
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.19), faceMat("bkReceipt", receiptTex, 0.9)); sh.rotation.set(-Math.PI / 2, 0, (hash(k + pi * 9) - 0.5) * 0.35);
        sh.position.set(o[0] + pp[0] + (hash(k + 4 + pi) - 0.5) * 0.02, o[1] + pp[1] + 0.003 + k * 0.0035, o[2] + pp[2] + (hash(k + 8 + pi) - 0.5) * 0.02); sh.receiveShadow = true; dg.add(sh);
        const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.057), basic("bkApproved", () => ({ map: approvedTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); mk.position.set(0.02, -0.03, 0.001); mk.rotation.z = 0.15 - hash(k) * 0.3; mk.layers.set(NOINK); sh.add(mk);
        // sheets 5 / 6 of a pile are the fresh ones (dropped on the stamp landings STAMP5[i], i % 2 = this pile)
        const land = STAMP5.filter((_, i) => i % 2 === pi), t = k < 5 ? -1e9 : land[k - 5] ?? 1e9;
        this.pileSheets.push({ m: sh, t, pile: pi, k });
      }
      contact(dg, [o[0] + pp[0], o[1] + pp[1] + 0.0015, o[2] + pp[2]], 0.36, 0.28, 0.35);
    });
    // fix r1 (A1 ADD shot 5): the adding machine's paper tape curls over the desk edge, longer on each "more"
    { const P: [number, number, number][] = [[0.8, 0.935, -0.84], [0.8, 0.95, -0.76], [0.79, 0.9, -0.6], [0.76, 0.8, -0.54], [0.68, 0.789, -0.42], [0.63, 0.787, -0.34], [0.62, 0.77, -0.322], [0.62, 0.6, -0.31], [0.63, 0.42, -0.3], [0.65, 0.3, -0.27]];
      const N = 60, pts: THREE.Vector3[] = new THREE.CatmullRomCurve3(P.map((p) => V(o[0] + p[0], o[1] + p[1], o[2] + p[2]))).getSpacedPoints(N), w = 0.026;
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      pts.forEach((p, i) => { pos.push(p.x - w, p.y, p.z, p.x + w, p.y, p.z); uv.push(0, i / 6, 1, i / 6); if (i < N) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); });
      const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
      this.addTape = new THREE.Mesh(tg, lam("si:bkAddTape", () => ({ map: tx("bkAddTapeT", 64, 128, (g2, r) => { g2.fillStyle = "#f6f0de"; g2.fillRect(0, 0, 64, 128); for (let y = 8; y < 128; y += 16) { g2.fillStyle = "rgba(40,40,70,0.7)"; g2.fillRect(14, y, 18 + r() * 26, 4); } }), side: THREE.DoubleSide })));
      this.addTape.castShadow = true; this.addTape.receiveShadow = true; dg.add(this.addTape); this.addTapeN = N; }
    // fix r1 (A1 ADD shot 3): a cigar in a glass ashtray with a slow S-curl of smoke; a paper corner the fan flutters
    { const ax = -0.12, az = -1.12; drb.geo(new THREE.CylinderGeometry(0.06, 0.05, 0.022, 18), basic("bkAshtray", () => ({ color: new THREE.Color(0.75, 0.86, 0.9), transparent: true, opacity: 0.6 })), ax, 0.796, az);
      drb.geo(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 10).rotateZ(Math.PI / 2 - 0.12), C("#5a3420"), ax + 0.04, 0.812, az, 0.4); drb.geo(new THREE.SphereGeometry(0.0095, 8, 6), CE("#d8501a", "#ff7a2a", 1.4), ax + 0.093, 0.818, az - 0.024);
      for (let k = 0; k < 3; k++) { const s = plane(dg, basic("bkSmoke" + k, () => ({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.8 })), 0.07, 0.34, [o[0] + ax + 0.093, o[1] + 0.99, o[2] + az - 0.024], 0, 0, 0, true); this.smoke.push(s); }
      contact(dg, [o[0] + ax, o[1] + 0.787, o[2] + az], 0.17, 0.17, 0.3);
      this.paperFlap = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11).translate(0, 0.055, 0), lam("si:bkPaperFlap", () => ({ color: "#f4ecd8", side: THREE.DoubleSide })));
      this.paperFlap.position.set(o[0] + 0.38, o[1] + 0.789, o[2] - 0.98); this.paperFlap.rotation.set(-Math.PI / 2, 0, 0.3); this.paperFlap.castShadow = true; dg.add(this.paperFlap); }
    // contact shadows under the desk props (A1 P2 shot 5: "no readable contact shadows")
    for (const [x, z, w, d] of [[PAD[0], PAD[2], 0.24, 0.16], [0.29, -1.1, 0.3, 0.24], [0.83, -0.73, 0.4, 0.34], [0.52, -1.19, 0.2, 0.14], [-0.77, -1.14, 0.3, 0.24], [FAN[0], FAN[2], 0.36, 0.3]] as number[][])
      contact(dg, [o[0] + x, o[1] + 0.788, o[2] + z], w, d, 0.32);
    // ---- the easel flip chart (shot 6)
    this.buildChart(rb, g);
    // ---- light: a cool daylight shaft from the window across the room + dust motes in it
    this.addShaft(g, [o[0] + W.c[0] - 0.1, o[1] + 1.9, o[2] - Z + 0.05], [-0.42, -0.52, 0.74], 3.6, 1.2, new THREE.Color(0.1, 0.13, 0.17));
    this.addShaft(g, [o[0] + W.c[0] + 0.35, o[1] + 2.2, o[2] - Z + 0.05], [-0.42, -0.52, 0.74], 3.2, 0.6, new THREE.Color(0.07, 0.09, 0.12), 2.1);
    this.bkMotes = new Motes(g, 60, 11, BK.base, [0.4, 0.9, -3.3], [2.4, 2.4, -1.4], new THREE.Color(0.6, 0.56, 0.46), 0.017, 0.06);  // fix r1: visible dust in the window shafts (A1 ADD)
    this.buildBankR2(rb, drb, g, dg);
    drb.done(dg);
    rb.done(g);
  }
  /** fix r2 (A2 shots 3 / 5 / 6): desk-front detail + floor props, the round vault door, venetian-blind light stripes,
   *  the window yard ramp + a pigeon + a far ship's funnel smoke, a coffered ceiling + brass pendant, the shot-6 umbrella
   *  stand / spittoon / rug fringe / gold oil-can trophy */
  private buildBankR2(rb: RB, drb: RB, g: THREE.Group, dg: THREE.Group) {
    const o = BK.base, Z = BK.room.d / 2, H = BK.room.h, brass = C("#d2a84e");
    // ---- desk front (A2 P2 #10): a brass kick rail + corner bosses on the pedestals
    drb.seg(brass, [-0.98, 0.075, -0.37], [0.98, 0.075, -0.37], 0.012);
    for (const x of [-0.98, -0.52, 0.52, 0.98]) { drb.geo(new THREE.SphereGeometry(0.019, 10, 8), brass, x, 0.075, -0.37); for (const y of [0.1, 0.68]) drb.geo(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 12).rotateX(Math.PI / 2), brass, x + (x < 0 ? 0.03 : -0.03) * (Math.abs(x) > 0.9 ? 1 : -1), y, -0.392); }
    // a wicker waste basket of crumpled paper + loose money bands in front of the knee hole
    // fix r3 (A3 P2 shot 5: the basket was cut by the bottom edge): tucked 0.16 m back against the modesty panel
    { const bx = -0.22, bz = -0.24;
      drb.geo(new THREE.CylinderGeometry(0.135, 0.11, 0.3, 20, 1, true).translate(0, 0.15, 0), lam("si:bkWicker", () => ({ map: wickerTex(), side: THREE.DoubleSide })), bx, 0, bz);
      drb.geo(new THREE.CircleGeometry(0.11, 20).rotateX(-Math.PI / 2), C("#5a3a1e"), bx, 0.01, bz);
      for (let k = 0; k < 6; k++) drb.geo(new THREE.IcosahedronGeometry(0.05 + 0.015 * hash(k), 0), C(k % 3 ? "#f2eee2" : "#e8dcc0"), bx + (hash(k + 1) - 0.5) * 0.14, 0.26 + hash(k + 2) * 0.06, bz + (hash(k + 3) - 0.5) * 0.14, hash(k) * 3, hash(k + 5) * 3);
      for (let k = 0; k < 2; k++) drb.geo(new THREE.TorusGeometry(0.035, 0.008, 6, 16).scale(1.4, 1, 1), C("#f0d27a"), bx + (k - 0.5) * 0.09, 0.33, bz + 0.03, k * 0.8, 0.6, 0.3);
      drb.geo(new THREE.IcosahedronGeometry(0.045, 0), C("#f2eee2"), bx + 0.22, 0.04, bz + 0.1, 1, 2);
      contact(dg, [o[0] + bx, o[1] + 0.004, o[2] + bz], 0.42, 0.36, 0.45); }
    // a canvas money sack (a stencilled $) leaning on the right pedestal
    // fix r3 (A3 P2 shot 5: the '$' sack sat outside the frame): in front of the right half of the modesty panel
    { const sx = 0.36, sz = -0.25;
      drb.geo(new THREE.SphereGeometry(0.17, 20, 14), lam("si:bkSack", () => ({ map: sackTex() })), sx, 0.17, sz, -1.82, 0, -0.18, [1, 1.15, 0.85]);
      drb.geo(new THREE.CylinderGeometry(0.035, 0.06, 0.1, 12), C("#bca87e"), sx + 0.06, 0.38, sz - 0.02, 0, 0, -0.3);
      drb.geo(new THREE.TorusGeometry(0.04, 0.009, 6, 14).rotateX(Math.PI / 2), C("#7a5a2e"), sx + 0.055, 0.36, sz - 0.02, 0, 0, -0.3);
      contact(dg, [o[0] + sx, o[1] + 0.004, o[2] + sz + 0.02], 0.44, 0.36, 0.45); }
    // fix r3 (A3 P2 shot 5 / ADD #36 shot 3): the right pedestal's top drawer stands half open, stuffed with OIL RECEIPTS
    // and banded cash; a second brass FOOT rail higher on the modesty panel (y 0.2); bills that slide off the desk's front
    // edge on each "more" and flutter down the desk front (shot 5, posed in poseBank)
    { const dx = 0.75, dy = 0.62, dz = -0.38;
      drb.box(C("#4e2414"), dx - 0.21, dy - 0.09, dz - 0.02, dx + 0.21, dy + 0.06, dz + 0.13); drb.panel(TM("bkDrawer", drawerTex), 0.42, 0.15, dx, dy - 0.015, dz + 0.131);
      drb.geo(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10).rotateX(Math.PI / 2), brass, dx, dy - 0.01, dz + 0.14);
      const bmE = [TM("bkBillE", billEdgeTex), TM("bkBillE", billEdgeTex), TM("bkBill", billTex), TM("bkBillE", billEdgeTex), TM("bkBillE", billEdgeTex), TM("bkBillE", billEdgeTex)];
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.026, 0.07), bmE); m.position.set(o[0] + dx - 0.12 + k * 0.1, o[1] + dy + 0.07 + 0.012 * hash(k), o[2] + dz + 0.05); m.rotation.set(0.25 * (hash(k + 2) - 0.5), 0.3 * (hash(k) - 0.5), 0.4 * (hash(k + 4) - 0.5)); m.castShadow = true; dg.add(m); }
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.095), faceMat("bkReceipt", receiptTex, 0.9)); m.position.set(o[0] + dx - 0.15 + k * 0.09, o[1] + dy + 0.1 + 0.02 * hash(k + 9), o[2] + dz + 0.07 - 0.02 * k); m.rotation.set(-0.35, 0.2 * (hash(k + 5) - 0.5), 0.35 * (hash(k + 6) - 0.5)); dg.add(m); } }
    drb.seg(brass, [-0.52, 0.2, -0.395], [0.52, 0.2, -0.395], 0.011); for (const x of [-0.52, 0, 0.52]) drb.geo(new THREE.SphereGeometry(0.017, 10, 8), brass, x, 0.2, -0.395);
    { const billDS = lam("si:bkBillDS", () => ({ map: billTex(), side: THREE.DoubleSide }));
      for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.068), billDS); m.castShadow = true; m.visible = false; dg.add(m);
        this.frontBills.push({ m, t: (k < 3 ? BEAT.more1 : BEAT.more2) + 6 + (k % 3) * 6, x: [-0.3, 0.12, 0.34, 0.25, -0.12, -0.38][k], ph: hash(k * 7.7) * TAU }); } }
    // a brown leather briefcase leaning on the left pedestal (shot 3)
    { const bx = -0.76, bz = -0.31; drb.rbox(C("#5a3420"), 0.42, 0.3, 0.1, bx, 0.155, bz, 0.08, -0.16); drb.rbox(C("#4a2a18"), 0.43, 0.02, 0.105, bx, 0.25, bz, 0.08, -0.16);
      drb.geo(new THREE.TorusGeometry(0.05, 0.011, 6, 14, Math.PI), C("#3a2010"), bx, 0.31, bz + 0.03, 0.08, -0.16);
      for (const s2 of [-1, 1]) drb.rbox(brass, 0.03, 0.022, 0.012, bx + s2 * 0.12, 0.25, bz + 0.058, 0.08, -0.16);
      contact(dg, [o[0] + bx, o[1] + 0.004, o[2] + bz + 0.08], 0.52, 0.26, 0.45); }
    // shot 5: bills that fluttered off the desk lie on the carpet (flat, soft contact shadows)
    { const billDS = lam("si:bkBillDS", () => ({ map: billTex(), side: THREE.DoubleSide }));
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.068), billDS); m.rotation.set(-Math.PI / 2, 0, hash(k * 5.1) * TAU);
        m.position.set(o[0] - 0.5 + k * 0.34 + hash(k) * 0.08, o[1] + 0.006 + k * 0.0004, o[2] + 0.04 + hash(k + 3) * 0.26); m.receiveShadow = true; this.bkFloor5.add(m);
        contact(this.bkFloor5, [m.position.x, o[1] + 0.004, m.position.z], 0.2, 0.12, 0.22); }
      dg.add(this.bkFloor5); }
    // shot 5: a 1963 desk calendar beside the LOANS plaque (A2 P2 #10)
    // fix r3 (A3 P2 shot 5: cut to '196' at the right edge): 0.12 m screen-left
    { const cg = new THREE.Group(); cg.position.set(o[0] + 0.465, o[1] + 0.785, o[2] - 0.42); cg.rotation.y = -0.2; dg.add(cg); this.calendar5 = cg;
      const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.125).translate(0, 0.0625, 0), faceMat("bkDeskCal", deskCalTex, 0.88)); f1.rotation.x = -0.25; cg.add(f1);
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.106, 0.132, 0.004).translate(0, 0.066, -0.004), C("#8a6a3a")); b1.rotation.x = -0.25; b1.castShadow = true; cg.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.004).translate(0, 0.06, 0), C("#8a6a3a")); b2.position.z = -0.06; b2.rotation.x = 0.32; b2.castShadow = true; cg.add(b2);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), basic("blob0.35", () => ({ map: blobTex(), transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      sh.rotation.x = -Math.PI / 2; sh.position.set(0.0, 0.002, -0.03); sh.layers.set(NOINK); cg.add(sh); }
    // ---- the VAULT DOOR (A2 ADD #41 / #46: one prop that says BANK): a round opening on the back wall behind the banker's
    // right shoulder (warm-lit shelves of cash inside), a brass jamb ring, a massive steel door hinged left, swung open
    { const vx = -0.78, vy = 1.0, R = 0.6, vz = -Z;
      const rec = new THREE.Mesh(new THREE.CircleGeometry(R, 40), basic("bkVaultIn", () => ({ map: vaultInTex() }))); rec.position.set(o[0] + vx, o[1] + vy, o[2] + vz + 0.006); g.add(rec);
      rb.geo(new THREE.TorusGeometry(R + 0.04, 0.06, 10, 48), brass, vx, vy, vz + 0.035);
      rb.geo(new THREE.TorusGeometry(R + 0.13, 0.03, 8, 48), C("#8a8e94"), vx, vy, vz + 0.02);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; rb.geo(new THREE.SphereGeometry(0.02, 8, 6), C("#6a6e74"), vx + Math.cos(a) * (R + 0.13), vy + Math.sin(a) * (R + 0.13), vz + 0.045); }
      const dgp = new THREE.Group(); dgp.position.set(o[0] + vx - R - 0.03, o[1] + vy, o[2] + vz + 0.07); dgp.rotation.y = -1.12; g.add(dgp);
      // fix r3 (A3 P2 shot 6: Tino's grey suit read grey-on-grey against the light door): the door's own steel material is
      // darkened to #4E5562 in shot 6 (poseBank), with a brass rim on its edge in every shot
      this.vaultSteel = lam("si:bkVaultSteel3", () => ({ color: "#b4b8be" })) as THREE.MeshLambertMaterial;
      const steel = this.vaultSteel, add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rz = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.z = rz; me.castShadow = true; me.receiveShadow = true; dgp.add(me); return me; };
      add(new THREE.CylinderGeometry(R, R, 0.22, 44).rotateX(Math.PI / 2), steel, R + 0.03, 0, 0.11);
      add(new THREE.TorusGeometry(R + 0.005, 0.02, 8, 48), brass, R + 0.03, 0, 0.222); add(new THREE.TorusGeometry(R + 0.005, 0.02, 8, 48), brass, R + 0.03, 0, 0.0);
      this.vaultDoor = dgp;
      add(new THREE.TorusGeometry(R - 0.07, 0.014, 6, 44), C("#8a8e96"), R + 0.03, 0, 0.225); add(new THREE.TorusGeometry(R * 0.55, 0.012, 6, 36), C("#8a8e96"), R + 0.03, 0, 0.225);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; add(new THREE.SphereGeometry(0.022, 8, 6), C("#d8dce0"), R + 0.03 + Math.cos(a) * (R - 0.035), Math.sin(a) * (R - 0.035), 0.222); }
      add(new THREE.TorusGeometry(0.17, 0.018, 8, 28), brass, R + 0.03, 0, 0.27); add(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 14).rotateX(Math.PI / 2), brass, R + 0.03, 0, 0.25);
      for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.34, 0.016, 0.016), brass, R + 0.03, 0, 0.27, (k / 3) * Math.PI);
      for (const y of [-0.3, -0.1, 0.1, 0.3]) add(new THREE.CylinderGeometry(0.028, 0.028, 0.14, 10).rotateZ(Math.PI / 2), C("#d8dce0"), 2 * R + 0.07, y, 0.11);
      for (const y of [-0.38, 0.38]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12), brass, 0.0, y, 0.11);
      contact(g, [o[0] + vx - 0.3, o[1] + 0.006, o[2] + vz + 0.55], 0.9, 0.7, 0.32); }
    // ---- venetian-blind daylight (A2 P2 #9 + ADD #47): cool slat stripes slanting across the left back-wall panels and the
    // lower painting (shot 5); a cool wedge of stripes across the desk's right half + the carpet (shot 3, A2 P2 #8)
    this.blinds5 = plane(g, new THREE.MeshBasicMaterial({ map: blindStripeTex(), color: new THREE.Color(0.17, 0.21, 0.29), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 1.8, 1.6, [o[0] - 0.55, o[1] + 1.8, o[2] - Z + 0.075], 0, 0, -0.34, true);
    this.blinds5.renderOrder = 3;
    this.blindsF = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blindStripeTex(), color: new THREE.Color(0.1, 0.13, 0.19), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.blindsF.position.set(o[0] + 0.5, o[1] + 0.792, o[2] - 0.8); this.blindsF.rotation.y = 0.55; this.blindsF.layers.set(NOINK); this.blindsF.renderOrder = 4; g.add(this.blindsF);
    { const cf = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blindStripeTex(), color: new THREE.Color(0.07, 0.09, 0.13), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
      cf.position.set(o[0] + 0.7, o[1] + 0.008, o[2] + 0.55); cf.rotation.y = 0.55; cf.layers.set(NOINK); cf.renderOrder = 2; g.add(cf); this.blindsC = cf; }
    // ---- the window (A2 P2 #7): a sloped gravel YARD from just outside the glass up to the far farm's ground (the
    // inspectors walk on it, diagonally away toward the bigger far tank), a pigeon on the outside sill, a far ship
    { const a = Math.atan2(0.32, 0.8), L = Math.hypot(0.32, 0.8), ramp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, L), basic("bkYardFlatM", () => ({ map: yardFlatTex() })));
      ramp.position.set(o[0] + 1.95, o[1] + 1.24, o[2] - 4.15); ramp.rotation.x = a - Math.PI / 2; ramp.layers.set(NOINK); g.add(ramp);
      this.pigeon = plane(g, basic("bkPigeonM", () => ({ map: pigeonTex(0), alphaTest: 0.4 })), 0.085, 0.064, [o[0] + 1.6, o[1] + 1.082, o[2] - 3.66], 0, 0, 0, true);
      this.shipM = plane(g, basic("bkShipM", () => ({ map: shipTex(), alphaTest: 0.4 })), 0.62, 0.23, [o[0] + 3.35, o[1] + 1.62, o[2] - 6.46], 0, 0, 0, true);
      for (let k = 0; k < 3; k++) { const s = plane(g, basic("bkFunnel" + k, () => ({ map: wispTex(), color: new THREE.Color(0.62, 0.62, 0.68), transparent: true, depthWrite: false, opacity: 0.8 })), 0.16, 0.6, [o[0] + 3.4, o[1] + 1.9, o[2] - 6.47], 0, 0, 0, true); this.funnel.push(s); } }
    // shot 3 (A2 P2 #8): a brass LOANS plaque over the window (the desk plate slid into the caption band on the push)
    rb.panel(faceMat("bkLoansW", () => plaqueTex("bkLoansW", "LOANS", 640, 190), 0.92), 0.8, 0.24, BK.window.c[0], 2.87, -Z + 0.012);
    rb.box(C("#6a4420"), BK.window.c[0] - 0.42, 2.74, -Z, BK.window.c[0] + 0.42, 3.0, -Z + 0.01, false);
    // ---- a coffered ceiling (A2 P2 #11): cream beams on a 1 m grid with a gilt bead, a brass three-light pendant
    for (let x = -3; x <= 3.01; x += 1) { rb.box(C("#d8c8a4"), x - 0.06, H - 0.14, -Z, x + 0.06, H - 0.01, Z, false); rb.box(C("#c9a14a"), x - 0.062, H - 0.15, -Z, x + 0.062, H - 0.135, Z, false); }
    for (let z = -3; z <= 3.01; z += 1) { rb.box(C("#d2c29e"), -BK.room.w / 2, H - 0.13, z - 0.06, BK.room.w / 2, H - 0.01, z + 0.06, false); }
    { const px = -0.55, pz = -1.3, py = 2.72; rb.seg(brass, [px, H, pz], [px, py + 0.14, pz], 0.012);
      rb.geo(new THREE.SphereGeometry(0.2, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), lam("si:bkPendBowl", () => ({ color: "#c9a14a", side: THREE.DoubleSide, emissive: new THREE.Color("#4a3410"), emissiveIntensity: 0.35 })), px, py + 0.14, pz);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; bulb(g, [o[0] + px + Math.cos(a) * 0.12, o[1] + py + 0.2, o[2] + pz + Math.sin(a) * 0.12], 0.028, "#ffe0a8", 4.2, 0.4, 0.32); } }
    // ---- shot 6 corner (A2 P2 #11): a brass umbrella stand (a black umbrella, a cane), a brass spittoon, the rug fringe
    { const ux = -2.05, uz = -0.2; rb.geo(new THREE.CylinderGeometry(0.12, 0.11, 0.5, 20, 1, true).translate(0, 0.25, 0), lam("si:bkUmbStand", () => ({ color: "#c9a14a", side: THREE.DoubleSide })), ux, 0, uz);
      rb.geo(new THREE.TorusGeometry(0.12, 0.012, 6, 24).rotateX(Math.PI / 2), C("#a07a2a"), ux, 0.5, uz); rb.geo(new THREE.CircleGeometry(0.11, 18).rotateX(-Math.PI / 2), C("#3a2a1a"), ux, 0.02, uz);
      rb.geo(new THREE.ConeGeometry(0.07, 0.72, 8, 1, true), lam("si:bkUmb", () => ({ color: "#1e1e24", side: THREE.DoubleSide })), ux + 0.03, 0.62, uz, 0, 0, Math.PI - 0.1);
      rb.seg(C("#2a1a12"), [ux + 0.07, 0.95, uz], [ux + 0.08, 1.08, uz], 0.01); rb.geo(new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI), C("#2a1a12"), ux + 0.115, 1.08, uz);
      rb.seg(C("#5a3a20"), [ux - 0.04, 0.05, uz + 0.02], [ux - 0.1, 1.0, uz + 0.04], 0.012);
      contact(g, [o[0] + ux, o[1] + 0.006, o[2] + uz], 0.4, 0.4, 0.5); }
    { const sx = -1.5, sz = 0.35, pts = [[0.0, 0], [0.1, 0.0], [0.13, 0.04], [0.14, 0.09], [0.11, 0.15], [0.08, 0.17], [0.1, 0.2], [0.13, 0.22]].map(([r2, y]) => new THREE.Vector2(r2, y));
      rb.geo(new THREE.LatheGeometry(pts, 24), lam("si:bkSpit", () => ({ color: "#d2a84e", side: THREE.DoubleSide })), sx, 0, sz); contact(g, [o[0] + sx, o[1] + 0.006, o[2] + sz], 0.42, 0.42, 0.5); }
    { const fm = basic("bkFringeM", () => ({ map: fringeTex(), transparent: true, alphaTest: 0.3, depthWrite: false })), rw = 5.4, rd = 4.6, rz = -0.6;
      for (const [x, z, w, ry] of [[0, rz + rd / 2 + 0.04, rw, 0], [0, rz - rd / 2 - 0.04, rw, Math.PI], [-rw / 2 - 0.04, rz, rd, Math.PI / 2], [rw / 2 + 0.04, rz, rd, -Math.PI / 2]] as number[][]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.08).rotateX(-Math.PI / 2), fm); m.position.set(o[0] + x, o[1] + 0.006, o[2] + z); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = 1; g.add(m); } }
    // shot 6 only (the desk is hidden): file boxes of OIL RECEIPTS on the carpet at the lower right (Tino's paper empire),
    // a few receipts spilling out, contact shadows (fills the empty carpet, never near his face)
    { const bg = this.box6, card = C("#c8a878"), cardD = C("#a8885a"), lab = faceMat("bkReceipt", receiptTex, 0.9);
      const box = (x: number, y: number, z: number, ry: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.32), card); b.position.set(o[0] + x, o[1] + y + 0.14, o[2] + z); b.rotation.y = ry; b.castShadow = true; b.receiveShadow = true; bg.add(b);
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.34), cardD); lid.position.set(0, 0.15, 0); lid.castShadow = true; b.add(lid);
        const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.13), lab); lb.position.set(0, 0.01, 0.161); b.add(lb); };
      box(-0.55, 0, -0.4, 0.25); box(-0.52, 0.32, -0.42, 0.1); box(-0.08, 0, -0.32, -0.35);
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.125), faceMat("bkReceipt", receiptTex, 0.85)); m.rotation.set(-Math.PI / 2, 0, hash(k * 2.7) * TAU); m.position.set(o[0] - 0.75 + k * 0.22, o[1] + 0.006 + k * 0.0005, o[2] - 0.05 + hash(k + 1) * 0.2); bg.add(m); }
      contact(bg, [o[0] - 0.4, o[1] + 0.005, o[2] - 0.35], 1.0, 0.6, 0.45); g.add(bg); }
    // a gold oil-can trophy on a walnut plinth on top of the bookcase (A2 ADD #52; no lettering)
    { const tx0 = -1.85, tz0 = -3.25, ty = 2.32; rb.box(C("#3a1a0e"), tx0 - 0.1, ty, tz0 - 0.08, tx0 + 0.1, ty + 0.06, tz0 + 0.08);
      const gold = lam("si:bkTrophy", () => ({ color: "#f2c040", emissive: new THREE.Color("#5a3a08"), emissiveIntensity: 0.5 }));
      rb.geo(cylY(0.07, 0.15, 18), gold, tx0, ty + 0.06, tz0); rb.geo(new THREE.ConeGeometry(0.07, 0.06, 18), gold, tx0, ty + 0.24, tz0); rb.seg(gold, [tx0 + 0.04, ty + 0.25, tz0], [tx0 + 0.16, ty + 0.33, tz0], 0.012);
      rb.geo(new THREE.TorusGeometry(0.05, 0.01, 6, 14, Math.PI), gold, tx0 - 0.075, ty + 0.15, tz0, 0, 0, Math.PI / 2); }
  }
  /** a rubber plant: terracotta pot, soil, a few stems with leaf cards */
  private plant(rb: RB, x: number, z: number, h: number, leaf: string, key: string, pot: string) {
    rb.geo(cylY(0.17, 0.36, 18, false, 0.22), C(pot), x, 0, z); rb.geo(cylY(0.2, 0.02, 18), C("#3a2a1e"), x, 0.34, z);
    const lm = lam("si:" + key, () => ({ map: leafTex(key, leaf), alphaTest: 0.5, side: THREE.DoubleSide }));
    for (let k = 0; k < 18; k++) {
      const a = k * 2.4, hh = 0.45 + (k / 18) * h * 0.75, rr = 0.06 + 0.12 * hash(k + 1);
      rb.seg(C("#4a6a2a"), [x, 0.36, z], [x + Math.cos(a) * rr, hh, z + Math.sin(a) * rr], 0.008, true, 5);
      rb.geo(new THREE.PlaneGeometry(0.12, 0.26).translate(0, 0.12, 0), lm, x + Math.cos(a) * rr, hh, z + Math.sin(a) * rr, -a + Math.PI / 2, 0, (0.5 + 0.5 * hash(k)) * (k % 2 ? 1 : -1) * 0.9);
    }
  }
  private buildChart(rb: RB, g: THREE.Group) {
    const o = BK.base, ch = BK.chart, R = V(Math.cos(ch.yaw), 0, -Math.sin(ch.yaw)), N = V(Math.sin(ch.yaw), 0, Math.cos(ch.yaw)), U = V(0, 1, 0);
    const at = (u: number, v: number, d: number): P3 => [ch.c[0] + R.x * u + N.x * d, ch.c[1] + v, ch.c[2] + R.z * u + N.z * d];
    const legM = C("#7a5232"), dark = C("#3a2a1e");
    // fix r1 (A1 P3: the uprights' open ends showed as a dark 'C' ring under the panels): the uprights start hidden
    // behind the board
    for (const s of [-1, 1]) { rb.seg(legM, at(s * 0.66, -ch.c[1], 0.16), at(s * 0.56, -ch.h / 2 - 0.03, 0.05), 0.022); rb.seg(legM, at(s * 0.51, -ch.h / 2 + 0.08, -0.035), at(s * 0.44, ch.h / 2 + 0.12, -0.035), 0.02); }
    rb.seg(legM, at(0, -ch.c[1], -0.6), at(0, ch.h / 2 + 0.1, -0.05), 0.022);
    rb.geo(new THREE.BoxGeometry(1.74, 0.04, 0.11), legM, ...at(0, -ch.h / 2 - 0.03, 0.04), ch.yaw);
    rb.geo(new THREE.BoxGeometry(ch.w + 0.06, ch.h + 0.08, 0.025), dark, ...at(0, 0.0, -0.02), ch.yaw);
    rb.geo(new THREE.BoxGeometry(ch.w + 0.1, 0.05, 0.05), C("#1a1a1e"), ...at(0, ch.h / 2 + 0.02, 0.01), ch.yaw);
    for (const k of [1, 2]) rb.geo(new THREE.PlaneGeometry(ch.w - 0.02, ch.h), C(k === 1 ? "#efe6d0" : "#e6dcc4"), ...at(0.006 * k, -0.01 * k, -0.002 - 0.004 * k), ch.yaw);
    // fix1 LEAD (CHAR): the leaning pointer is gone, Tino holds his own
    // fix r2 (A2 P3): the board white ~#F4EEE4, not blown (k 0.94)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(ch.w, ch.h), faceMat("bkChart", chartTex, 0.94)); face.position.set(...at(0, 0, 0.004)); face.position.add(V(o[0], o[1], o[2])); face.rotation.y = ch.yaw; g.add(face);
    // fix r3 (ADD #45 / #46 shot 6): the picture lamp's warm falloff on the board (top ~8 % brighter, the bottom edge ~10 %
    // darker), a curled-over previous page along the pad's top, a chalk stick + an eraser + a box of pins on the tray, a
    // small brass TINO plate on the tray front
    { const ft = tx("bkChartFall3", 32, 256, (g2) => { g2.clearRect(0, 0, 32, 256); const gr = g2.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,226,170,0.2)"); gr.addColorStop(0.3, "rgba(255,226,170,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 32, 256); }, true);
      const bt = tx("bkChartDark3", 32, 256, (g2) => { g2.clearRect(0, 0, 32, 256); const gr = g2.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, "rgba(70,34,34,0.24)"); gr.addColorStop(0.16, "rgba(70,34,34,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 32, 256); }, true);
      for (const [map, add] of [[ft, true], [bt, false]] as [THREE.Texture, boolean][]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(ch.w, ch.h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, ...(add ? { blending: THREE.AdditiveBlending } : {}) }));
        m.position.set(...at(0, 0, 0.03)); m.position.add(V(o[0], o[1], o[2])); m.rotation.y = ch.yaw; m.layers.set(NOINK); m.renderOrder = 5; g.add(m); }
      rb.geo(new THREE.CylinderGeometry(0.028, 0.028, ch.w - 0.06, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), lam("si:bkPageCurl", () => ({ color: "#e8dec6", side: THREE.DoubleSide })), ...at(0, ch.h / 2 - 0.005, 0.012), ch.yaw);
      const ty = -ch.h / 2 - 0.005; rb.geo(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8).rotateZ(Math.PI / 2), C("#f6f4ea"), ...at(-0.45, ty, 0.05), ch.yaw);
      rb.geo(new THREE.BoxGeometry(0.1, 0.03, 0.045), C("#3a3a42"), ...at(-0.2, ty + 0.008, 0.05), ch.yaw); rb.geo(new THREE.BoxGeometry(0.1, 0.008, 0.047), C("#d8c8a8"), ...at(-0.2, ty + 0.027, 0.05), ch.yaw);
      rb.geo(new THREE.BoxGeometry(0.06, 0.025, 0.04), C("#b8302a"), ...at(0.3, ty + 0.005, 0.05), ch.yaw);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.045), faceMat("bkTinoPlate", () => plaqueTex("bkTinoPlate", "TINO", 512, 144), 0.9)); pl.position.set(...at(0.55, -ch.h / 2 - 0.03, 0.098)); pl.position.add(V(o[0], o[1], o[2])); pl.rotation.y = ch.yaw; g.add(pl); }
    // drums: ALL US OIL = a 3-row pile of 6 on the map; TINO'S OIL = an 8-base pyramid that appears 3 -> 10 -> 36
    const dm = basic("bkDrum", () => ({ map: drumTex(), alphaTest: 0.4 })), DW = 0.08, DH = 0.1, base = -0.405;
    const mk = (u: number, v: number, row: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), dm); const p = at(u, v, 0.012 + row * 0.0015); m.position.set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); m.rotation.y = ch.yaw; m.layers.set(NOINK); g.add(m); return m; };
    for (let r2 = 0; r2 < 3; r2++) for (let k = 0; k < 3 - r2; k++) mk(-0.4 + (k - (2 - r2) / 2) * 0.083, base + DH / 2 + r2 * 0.088, r2);
    const order: { r: number; k: number; st: number }[] = [];
    for (let r2 = 0; r2 < 8; r2++) for (let k = 0; k < 8 - r2; k++) { const off = k - (7 - r2) / 2, st = r2 < 2 && Math.abs(off) <= (1 - r2) / 2 ? 0 : r2 < 4 && Math.abs(off) <= (3 - r2) / 2 ? 1 : 2; order.push({ r: r2, k, st }); }
    let n1 = 0, n2 = 0;
    for (const d of order.sort((a, b) => a.st - b.st || a.r - b.r || a.k - b.k)) {
      const u = 0.4 + (d.k - (7 - d.r) / 2) * 0.083, v = base + DH / 2 + d.r * 0.088;
      const t = d.st === 0 ? -1e9 : d.st === 1 ? BEAT.moreOf - 3 + 2 * n1++ : BEAT.united - 3 + 1.08 * n2++;
      this.drums.push(mk(u, v, d.r)); this.drumSlot.push({ u, v, t, row: d.r });
    }
    // fix r1 (A1 P2 shot 6): a brass picture lamp over the board (blooming bulb, a warm pool on the board's top third
    // and the rug), contact shadows under the easel feet + the plant pot, a long soft easel shadow across the parquet
    const lampP = at(0, ch.h / 2 + 0.2, 0.2), brass = C("#d2a84e");
    rb.seg(brass, at(0, ch.h / 2 + 0.05, -0.03), at(0, ch.h / 2 + 0.2, 0.06), 0.012); rb.seg(brass, at(-0.32, ch.h / 2 + 0.2, 0.14), at(0.32, ch.h / 2 + 0.2, 0.14), 0.01);
    rb.geo(new THREE.CylinderGeometry(0.045, 0.06, 0.7, 20, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), lam("si:bkPicShade", () => ({ color: "#c9a14a", side: THREE.DoubleSide, emissive: new THREE.Color("#4a3410"), emissiveIntensity: 0.4 })), lampP[0], lampP[1], lampP[2], ch.yaw, 0.9);
    { const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 10).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: glowCol("#ffe2a8", 3.2) }));
      bl.position.set(o[0] + lampP[0], o[1] + lampP[1] - 0.025, o[2] + lampP[2]); bl.rotation.y = ch.yaw; bl.layers.set(NOINK); g.add(bl);
      for (const s of [-0.22, 0, 0.22]) { const p = at(s, ch.h / 2 + 0.17, 0.22); glowSprite(g, [o[0] + p[0], o[1] + p[1], o[2] + p[2]], 0.5, glowCol("#ffcf8a", 0.28)); } }
    for (const s of [-1, 1]) { const p = at(s * 0.66, -ch.c[1], 0.16); contact(g, [o[0] + p[0], o[1] + 0.006, o[2] + p[2]], 0.16, 0.16, 0.5); }
    { const p = at(0, -ch.c[1], -0.6); contact(g, [o[0] + p[0], o[1] + 0.006, o[2] + p[2]], 0.16, 0.16, 0.5); }
    { const p = at(0.35, -ch.c[1], -0.95); const m = contact(g, [o[0] + p[0], o[1] + 0.005, o[2] + p[2]], 1.0, 2.2, 0.24, ch.yaw + 0.55); m.renderOrder = 1; }
    contact(g, [o[0] - 3.55, o[1] + 0.006, o[2] - 3.0], 0.62, 0.62, 0.45);
    // a stack of OIL RECEIPTs on the easel tray (callback to shot 3) that grows with each pile stage; a red check tick
    // that draws itself under Tino's pile on "had"; a star glint that sweeps the pyramid on "had"
    for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.11), faceMat("bkReceipt", receiptTex, 0.9)); const p = at(-0.62 + (hash(k) - 0.5) * 0.01, -ch.h / 2 - 0.006 + k * 0.004, 0.06 + (hash(k + 3) - 0.5) * 0.008);
      m.position.set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); m.rotation.set(-Math.PI / 2, 0, 0); m.rotateOnWorldAxis(V(0, 1, 0), ch.yaw + (hash(k + 7) - 0.5) * 0.25); g.add(m); this.trayStack.push(m); }
    { const tt = tx("bkTick", 256, 128, (g2) => { g2.clearRect(0, 0, 256, 128); g2.strokeStyle = "#c4201a"; g2.lineWidth = 22; g2.lineCap = "round"; g2.lineJoin = "round"; g2.beginPath(); g2.moveTo(20, 60); g2.lineTo(80, 112); g2.lineTo(236, 16); g2.stroke(); }, true);
      const p = at(0.4, base - 0.055, 0.016); this.tick = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), basic("bkTickM", () => ({ map: tt, transparent: true, depthWrite: false })));
      this.tick.position.set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); this.tick.rotation.y = ch.yaw; this.tick.layers.set(NOINK); g.add(this.tick);
      const spT = tx("bkSpark", 128, 128, (g2) => { g2.clearRect(0, 0, 128, 128); g2.fillStyle = "#fff"; g2.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, rr = k % 2 ? 9 : 62; g2.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g2.closePath(); g2.fill(); }, true);
      this.glint6 = new THREE.Sprite(new THREE.SpriteMaterial({ map: spT, color: new THREE.Color(2.6, 2.2, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); this.glint6.layers.set(NOINK); this.glint6.renderOrder = 7; g.add(this.glint6); }
    // light shaft from the off-screen window across the board + motes in it
    this.bkMotes6 = new Motes(g, 40, 17, BK.base, [-3.2, 1.0, -2.6], [-1.4, 2.4, -1.2], new THREE.Color(0.75, 0.62, 0.42), 0.014, 0.05);
    void lampP;
  }

  // ================================================================================================ TRADING FLOOR
  private buildTrading() {
    const o = TR.base, g = this.trading, rb = new RB(o), X = TR.room.w / 2, Z = TR.room.d / 2, H = TR.room.h, WT = 1.4, CO = 5.62;
    const wain = TM("trWain", trWainTex), wall = TM("trWall", trWallTex), oak = TM("trOak", () => woodTex("trOak", "#5a3a22")), oakD = C("#2e1e12");
    rb.flatY(TM("trFloor", trFloorTex), -X, X, -Z, Z, 0, 1, 2, 2);
    rb.flatY(TM("trCeil", trCeilTex), -X, X, -Z, Z, H, -1, 1.5, 1.5);
    for (const z of [-4.2, -1.4, 1.4, 4.2]) rb.box(C("#94a294"), -X, H - 0.35, z - 0.18, X, H, z + 0.18, false);
    for (const x of [-3.5, 0, 3.5]) rb.box(C("#94a294"), x - 0.15, H - 0.3, -Z, x + 0.15, H, Z, false);
    for (const [z, face] of [[-Z, 1], [Z, -1]] as [number, number][]) { rb.wallZ(wain, -X, X, 0, WT, z, face, 1.0, WT); rb.wallZ(wall, -X, X, WT, CO, z, face, 2, 2); rb.wallZ(C("#6e7c6a"), -X, X, CO, H, z, face, 2, 2); }
    for (const [x, face] of [[-X, 1], [X, -1]] as [number, number][]) { rb.wallX(wain, -Z, Z, 0, WT, x, face, 1.0, WT); rb.wallX(wall, -Z, Z, WT, CO, x, face, 2, 2); rb.wallX(C("#6e7c6a"), -Z, Z, CO, H, x, face, 2, 2); }
    rb.box(oakD, -X, WT - 0.04, -Z, X, WT + 0.04, -Z + 0.06, false); rb.box(C("#5e6c5a"), -X, CO - 0.1, -Z, X, CO, -Z + 0.12, false);
    // pilasters + the flanking tall storm windows + two clerestory windows over the board (views ON the wall, framed)
    for (const x of [-3.95, -2.85, 2.85, 3.95]) rb.box(C("#7e8c7a"), x - 0.09, 0, -Z, x + 0.09, CO, -Z + 0.14);
    const frameM = C("#3a3a34");
    const win = (cx: number, cy: number, w: number, h: number, key: string, mull: number, dp = 1) => {   // fix r2: dp < 1 = shallow frames (behind the board face)
      const wm = faceMat(key, () => stormTex(key, 256, Math.round((256 * h) / w)), 0.92); this.trWinMats.push(wm); plane(g, wm, w, h, [o[0] + cx, o[1] + cy, o[2] - Z + 0.02]);
      const rm = basic("rain" + key, () => ({ map: rainTex(), transparent: true, opacity: 0.8, depthWrite: false })); this.rainMats.push(rm);
      plane(g, rm, w, h, [o[0] + cx, o[1] + cy, o[2] - Z + 0.03], 0, 0, 0, true);
      rb.box(frameM, cx - w / 2 - 0.06, cy - h / 2 - 0.06, -Z, cx + w / 2 + 0.06, cy - h / 2, -Z + 0.1 * dp); rb.box(frameM, cx - w / 2 - 0.06, cy + h / 2, -Z, cx + w / 2 + 0.06, cy + h / 2 + 0.06, -Z + 0.08 * dp);
      rb.box(frameM, cx - w / 2 - 0.06, cy - h / 2, -Z, cx - w / 2, cy + h / 2, -Z + 0.08 * dp); rb.box(frameM, cx + w / 2, cy - h / 2, -Z, cx + w / 2 + 0.06, cy + h / 2, -Z + 0.08 * dp);
      for (let k = 1; k < mull; k++) rb.box(frameM, cx - w / 2, cy - h / 2 + (h * k) / mull - 0.02, -Z + 0.035 * dp, cx + w / 2, cy - h / 2 + (h * k) / mull + 0.02, -Z + 0.06 * dp);
      rb.box(frameM, cx - 0.02, cy - h / 2, -Z + 0.035 * dp, cx + 0.02, cy + h / 2, -Z + 0.06 * dp);
    };
    win(-3.4, 3.05, 0.9, 3.5, "trWinL", 5); win(3.4, 3.05, 0.9, 3.5, "trWinR", 5); win(-1.75, 5.29, 2.0, 0.56, "trClL", 1, 0.3); win(1.75, 5.29, 2.0, 0.56, "trClR", 1, 0.3);
    // the board: oak frame, slate face, chalk tray with chalk + eraser; the clock above it
    const bd = TR.board, bz = bd.c[2];
    rb.box(oak, bd.c[0] - bd.w / 2 - 0.14, bd.c[1] - bd.h / 2 - 0.14, -Z, bd.c[0] + bd.w / 2 + 0.14, bd.c[1] + bd.h / 2 + 0.14, bz + 0.02);
    plane(g, faceMat("trSoy", soyBoardTex, 0.95), bd.w, bd.h, [o[0] + bd.c[0], o[1] + bd.c[1], o[2] + bz + 0.03]);
    rb.box(oak, bd.c[0] - bd.w / 2, bd.c[1] - bd.h / 2 - 0.12, bz, bd.c[0] + bd.w / 2, bd.c[1] - bd.h / 2 - 0.08, bz + 0.13);
    for (let k = 0; k < 7; k++) rb.geo(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 6).rotateZ(Math.PI / 2), C(k === 3 ? "#e8a0a0" : "#f4f2ea"), -2.1 + k * 0.17 + hash(k) * 0.05, bd.c[1] - bd.h / 2 - 0.073, bz + 0.07, hash(k + 9) * 0.5);
    rb.box(C("#3a2a1a"), 1.2, bd.c[1] - bd.h / 2 - 0.08, bz + 0.03, 1.36, bd.c[1] - bd.h / 2 - 0.04, bz + 0.1); rb.box(C("#d8d4cc"), 1.2, bd.c[1] - bd.h / 2 - 0.04, bz + 0.03, 1.36, bd.c[1] - bd.h / 2 - 0.035, bz + 0.1);
    rb.geo(new THREE.CylinderGeometry(0.4, 0.4, 0.07, 36).rotateX(Math.PI / 2), C("#2e2a24"), 0, 5.12 + 0.1, -Z + 0.035);
    plane(g, faceMat("trClock", () => clockFaceTex("trClock", "#8a8a80"), 0.85), 0.72, 0.72, [o[0], o[1] + 5.22, o[2] - Z + 0.075]);
    for (const [L, w, k] of [[0.2, 0.03, 0], [0.29, 0.02, 1], [0.31, 0.007, 2]] as number[][]) {
      const hm = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.006).translate(0, L / 2 - 0.04, 0), basic("trHand" + k, () => ({ color: k === 2 ? new THREE.Color("#a8201a") : new THREE.Color("#1a1420") })));
      hm.position.set(o[0], o[1] + 5.22, o[2] - Z + 0.08 + k * 0.003); g.add(hm); this.trHands.push(hm);
    }
    // the clerk's walkway under the board: a low oak platform + a brass rail
    rb.box(oak, -3.1, 0, -Z, 3.1, 0.42, -5.2); rb.box(oakD, -3.1, 0.42, -5.24, 3.1, 0.46, -5.16);
    for (let x = -3.0; x <= 3.01; x += 0.6) rb.seg(C("#c9a14a"), [x, 0.46, -5.22], [x, 1.32, -5.22], 0.018);
    rb.seg(C("#c9a14a"), [-3.05, 1.32, -5.22], [3.05, 1.32, -5.22], 0.025);
    // chalk line: a ribbon (pre-crash creep, then the dive) on the board face + a red arrow
    const pre: [number, number][] = [[-2.15, -0.55], [-1.8, -0.33], [-1.5, -0.45], [-1.15, -0.1], [-0.85, -0.22], [-0.5, 0.1], [-0.2, -0.02], [0.15, 0.32], [0.45, 0.2], [0.82, 0.52]];
    const dive: [number, number][] = [[1.05, 0.4], [1.32, -0.3], [1.66, -0.78], [2.08, -1.12]];
    const pts = [...pre, ...dive], sub = 8, pos: number[] = [], uvs: number[] = [], wdt = 0.032;
    const dense: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < sub; k++) { const t = k / sub; dense.push([lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]); }
    dense.push(pts[pts.length - 1]);
    let L = 0;
    const nrm = (i: number) => { const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; return [-dy / n, dx / n]; };
    for (let i = 0; i < dense.length - 1; i++) {
      const a = dense[i], b = dense[i + 1], na = nrm(i), nb = nrm(i + 1), l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const A0 = [a[0] - na[0] * wdt, a[1] - na[1] * wdt], A1 = [a[0] + na[0] * wdt, a[1] + na[1] * wdt], B0 = [b[0] - nb[0] * wdt, b[1] - nb[1] * wdt], B1 = [b[0] + nb[0] * wdt, b[1] + nb[1] * wdt];
      pos.push(A0[0], A0[1], 0, B0[0], B0[1], 0, B1[0], B1[1], 0, A0[0], A0[1], 0, B1[0], B1[1], 0, A1[0], A1[1], 0);
      const u0 = L / 0.6, u1 = (L + l) / 0.6; uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
      L += l; this.chalkT.push(i < (pre.length - 1) * sub ? 0 : 1);
    }
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    this.chalk = new THREE.Mesh(cg, basic("trChalk", () => ({ map: chalkTex("chalkW", "#f6f6ee"), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
    this.chalk.position.set(o[0] + bd.c[0], o[1] + bd.c[1], o[2] + bz + 0.036); this.chalk.layers.set(NOINK); this.chalk.frustumCulled = false; g.add(this.chalk); this.chalkN = dense.length - 1;
    this.chalkPts = dense.map(([x, y]) => V(o[0] + bd.c[0] + x, o[1] + bd.c[1] + y, o[2] + bz + 0.05));
    // fix r1 (A1 P2): chalk-dust puffs at the line's tip on each drawing step and a burst at the dive's end
    for (let k = 0; k < 8; k++) { const s2 = glowSprite(g, [0, 0, 0], 0.12, new THREE.Color(0.75, 0.78, 0.74)); s2.material.blending = THREE.NormalBlending; s2.material.opacity = 0.7; this.dust.push(s2); }
    const arrowT = tx("trArrow", 256, 256, (g2, r) => { g2.clearRect(0, 0, 256, 256); g2.strokeStyle = "#ff6a4a"; g2.lineWidth = 26; g2.lineCap = "round"; g2.lineJoin = "round"; g2.beginPath(); g2.moveTo(128, 20); g2.lineTo(128, 200); g2.moveTo(50, 130); g2.lineTo(128, 218); g2.lineTo(206, 130); g2.stroke();
      g2.globalCompositeOperation = "destination-out"; for (let i = 0; i < 500; i++) { g2.fillStyle = "rgba(0,0,0,0.6)"; g2.fillRect(r() * 256, r() * 256, 3, 2); } g2.globalCompositeOperation = "source-over"; }, true);
    this.arrow = plane(g, basic("trArrowM", () => ({ map: arrowT, transparent: true, depthWrite: false })), 0.5, 0.5, [o[0] + 2.32, o[1] + bd.c[1] - 0.72, o[2] + bz + 0.04], 0, 0, 0.35, true);
    // phone desks behind each trader (two phones, a coiled cord, slips, a pencil) + two ticker machines with tape
    TR.traders.forEach((t, k) => {
      const dz = t[2] - 0.62, x = t[0];
      rb.box(oak, x - 0.62, 0.74, dz - 0.24, x + 0.62, 0.8, dz + 0.22); rb.box(oakD, x - 0.58, 0, dz - 0.2, x + 0.58, 0.74, dz - 0.14);
      for (const s of [-1, 1]) rb.box(oakD, x + s * 0.56 - 0.03, 0, dz - 0.2, x + s * 0.56 + 0.03, 0.74, dz + 0.18);
      for (const s of [-0.35, 0.3]) { rb.box(C("#141418"), x + s - 0.09, 0.8, dz - 0.12, x + s + 0.09, 0.86, dz + 0.06); rb.seg(C("#141418"), [x + s - 0.1, 0.89, dz - 0.04], [x + s + 0.1, 0.89, dz - 0.04], 0.018); rb.geo(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16).rotateX(-1.0), C("#ecebe2"), x + s, 0.855, dz + 0.06); }
      for (let j = 0; j < 3; j++) rb.panel(TM("trSlipD" + ((k + j) % 4), () => slipTex((k + j) % 4)), 0.12, 0.09, x - 0.05 + j * 0.09, 0.803 + j * 0.001, dz + 0.08, hash(k * 7 + j) * 0.6 - 0.3, -Math.PI / 2);
    });
    for (const [x, z] of [[-2.55, -2.9], [2.75, -2.1]]) {
      rb.geo(cylY(0.12, 0.95, 16, false, 0.06), C("#3a3a3a"), x, 0, z); rb.geo(cylY(0.16, 0.12, 20), C("#c9a14a"), x, 0.95, z);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 12, 0, TAU, 0, Math.PI / 2), basic("trDome", () => ({ color: new THREE.Color(0.85, 0.92, 1.0), transparent: true, opacity: 0.25, depthWrite: false })));
      dome.position.set(o[0] + x, o[1] + 1.07, o[2] + z); dome.layers.set(NOINK); g.add(dome);
      rb.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16).rotateZ(Math.PI / 2), C("#f2ead2"), x, 1.14, z);
      for (let k = 0; k < 6; k++) rb.panel(TM("trTape", tapeTex), 0.6, 0.025, x + 0.2 + k * 0.03, 0.75 - k * 0.12, z + 0.1 + k * 0.06, 0.4 * k, 0.2, 1.2 + 0.5 * hash(k), false);
      rb.geo(cylY(0.17, 0.32, 14, true, 0.13), C("#b89a62"), x + 0.45, 0, z + 0.25);
    }
    // the litter of a busy day: slips + crumpled paper on the floor
    for (let i = 0; i < 46; i++) rb.panel(TM("trSlipF" + (i % 4), () => slipTex(i % 4)), 0.11, 0.08, -3.4 + hash(i) * 7, 0.004 + (i % 5) * 0.0005, -4.5 + hash(i + 50) * 6.8, hash(i + 9) * TAU, -Math.PI / 2);
    for (let i = 0; i < 14; i++) rb.geo(new THREE.IcosahedronGeometry(0.05, 0), C("#f2eee2"), -3 + hash(i + 3) * 6.5, 0.04, -4.2 + hash(i + 77) * 6, hash(i) * 3, hash(i + 1) * 3);
    // pendant globe lights (sway a hair on the video clock)
    for (const [x, z] of TR_PEND) {
      const pg = new THREE.Group(); pg.position.set(o[0] + x, o[1] + H, o[2] + z); g.add(pg); this.pendants.push(pg);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6).translate(0, -0.65, 0), C("#2a2a26")); pg.add(rod);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.08, 16).translate(0, -1.34, 0), C("#c9a14a")); pg.add(cap);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14).translate(0, -1.58, 0), new THREE.MeshBasicMaterial({ color: glowCol("#ffe0a8", 1.7) })); gl.layers.set(NOINK); pg.add(gl);
      const hs = glowSprite(g, [0, 0, 0], 1.3, glowCol("#ffd090", 0.3)); g.remove(hs); hs.position.set(0, -1.58, 0); pg.add(hs);
    }
    // two slow ceiling fans (life in the upper frame)
    for (const [x, z] of [[-0.3, -3.2], [0.9, -0.9]]) {
      const fg = new THREE.Group(); fg.position.set(o[0] + x, o[1] + H - 0.55, o[2] + z); g.add(fg); this.fans.push(fg);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).translate(0, 0.27, 0), C("#2a2a26")); fg.add(rod);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.12, 16), C("#c9a14a")); fg.add(hub);
      for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.13).translate(0.4, 0, 0), C("#5a3a22")); bl.rotation.y = (k / 4) * TAU; bl.rotation.x = 0.12; bl.castShadow = true; fg.add(bl); }
    }
    // ticker tape + slips that rain down from the crash (and a slow trickle before it)
    // fix r1 (A1 P2): curling tape ribbons 6-10 px wide falling 2-4 px/f with a slow spin (nearer the lens, so they read),
    // order slips tumbling; a pre-crash trickle from the start
    const tm = lam("si:trTapeFall", () => ({ map: tapeTex(), side: THREE.DoubleSide })), sm2 = [0, 1, 2, 3].map((k) => lam("si:trSlipFall" + k, () => ({ map: slipTex(k), side: THREE.DoubleSide })));
    const curl = new THREE.PlaneGeometry(0.045, 0.5, 1, 10); { const pa = curl.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setZ(i, 0.06 * Math.sin(y * 9)); pa.setX(i, pa.getX(i) + 0.03 * Math.sin(y * 6)); } curl.computeVertexNormals(); }
    for (let i = 0; i < 110; i++) {
      const strip = i % 3 !== 2, m = new THREE.Mesh(strip ? curl : new THREE.PlaneGeometry(0.12, 0.09), strip ? tm : sm2[i % 4]);
      m.castShadow = false; m.receiveShadow = true; g.add(m);
      // fix r2 (A2 P2 #14 / #15): NOTHING falls before the crash (a pre-crash ribbon read as a chalk spike on the chart);
      // every piece starts on / after "crashed", and no piece falls through the SOYBEAN OIL title column (|x| is pushed
      // out past the title's screen extent at its depth from the shot-8 lens)
      // fix r3 (A3 P3 #27: far ribbons over the chart read as chalk strokes): every piece falls in FRONT of the traders
      const near = i % 2 === 0, z = near ? -1.8 + hash(i * 5.7) * 4.2 : -2.7 + hash(i * 5.7) * 3.9;
      let x = (near ? -2.2 : -3.2) + hash(i * 3.1) * (near ? 4.6 : 6.8); const col = 1.45 * (5.6 - z) / 11.55 + 0.42;   // + the flutter drift and the ribbon half-length
      if (Math.abs(x - 0.05) < col) x = 0.05 + Math.sign(x - 0.05 || 1) * (col + 0.25 * hash(i * 8.3));
      this.tape.push({ m, x, z, y0: 2.9 + hash(i) * 2.9, sp: 0.38 + hash(i * 2.3) * 0.32, ph: hash(i * 9.1) * TAU,
        t0: BEAT.crashed1 + hash(i * 1.7) * 24, spin: (hash(i * 4.4) - 0.5) * 0.4 });
    }
    // glass-dome ticker machines on the two front desks, their tape spilling over the desk edge to the floor
    for (const s2 of [-1, 1]) { const tx2 = s2 * 1.7 + s2 * 0.38, tz = 1.35 - 0.62;
      rb.geo(cylY(0.09, 0.05, 16), C("#3a3a3a"), tx2, 0.8, tz); rb.geo(cylY(0.1, 0.03, 16), C("#c9a14a"), tx2, 0.85, tz);
      const dm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 10, 0, TAU, 0, Math.PI / 2), basic("trDome", () => ({ color: new THREE.Color(0.85, 0.92, 1.0), transparent: true, opacity: 0.25, depthWrite: false })));
      dm.position.set(o[0] + tx2, o[1] + 0.88, o[2] + tz); dm.layers.set(NOINK); g.add(dm);
      rb.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 14).rotateZ(Math.PI / 2), C("#f2ead2"), tx2, 0.93, tz);
      const P = [[0, 0.92, 0.02], [0.02, 0.85, 0.12], [0.05, 0.81, 0.2], [0.08, 0.8, 0.22], [0.1, 0.6, 0.25], [0.12, 0.35, 0.27], [0.18, 0.06, 0.3], [0.34, 0.01, 0.42]].map(([x, y, z]) => V(o[0] + tx2 + s2 * x, o[1] + y, o[2] + tz + z));
      const pts = new THREE.CatmullRomCurve3(P).getSpacedPoints(30), pos: number[] = [], uv: number[] = [], idx: number[] = [];
      pts.forEach((pp, i) => { pos.push(pp.x - 0.02, pp.y, pp.z, pp.x + 0.02, pp.y, pp.z); uv.push(0, i / 4, 1, i / 4); if (i < 30) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); });
      const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
      const tmesh = new THREE.Mesh(tg, lam("si:trTapeR", () => ({ map: tapeTex(), side: THREE.DoubleSide }))); tmesh.castShadow = true; g.add(tmesh); }
    // contact shadows under the phone desks (A1 P2), a coat rack with dripping fedoras + black umbrellas, a water
    // cooler, crumpled paper overflowing the waste baskets
    TR.traders.forEach((t) => contact(g, [o[0] + t[0], o[1] + 0.005, o[2] + t[2] - 0.62], 1.5, 0.75, 0.4));
    { const cx = -2.35, cz = -4.55; rb.seg(C("#2e1e12"), [cx, 0, cz], [cx, 1.9, cz], 0.025); for (let k = 0; k < 3; k++) { const a = k * 2.1; rb.seg(C("#2e1e12"), [cx, 0.02, cz], [cx + Math.cos(a) * 0.28, 0.0, cz + Math.sin(a) * 0.28], 0.018); }
      for (const [dx, dz, c] of [[0.13, 0.04, "#3a3a46"], [-0.12, 0.06, "#5a4a3a"]] as [number, number, string][]) { rb.geo(new THREE.SphereGeometry(0.13, 14, 10, 0, TAU, 0, Math.PI / 2), C(c), cx + dx, 1.82, cz + dz, 0, 0, 0, [1, 0.62, 1]); rb.geo(cylY(0.19, 0.012, 18), C(c), cx + dx, 1.82, cz + dz); }
      for (const [dx, a] of [[0.2, 0.18], [-0.18, -0.2]] as number[][]) { rb.seg(C("#1a1a1e"), [cx + dx * 0.3, 1.7, cz + 0.1], [cx + dx, 0.15, cz + 0.2], 0.012); rb.geo(new THREE.ConeGeometry(0.11, 0.7, 8, 1, true), lam("si:trUmb", () => ({ color: "#1e1e24", side: THREE.DoubleSide })), cx + dx * 0.7, 0.75, cz + 0.17, 0, 0, a); }
      contact(g, [o[0] + cx, o[1] + 0.005, o[2] + cz + 0.1], 0.8, 0.6, 0.4); contact(g, [o[0] + cx + 0.1, o[1] + 0.006, o[2] + cz + 0.35], 0.5, 0.22, 0.5);
      for (let k = 0; k < 4; k++) this.trDrips.push({ x: cx + [0.2, -0.18, 0.13, -0.12][k], y: [0.12, 0.12, 1.66, 1.66][k], z: cz + [0.2, 0.2, 0.04, 0.06][k], ph: k * 0.27 }); }
    for (let k = 0; k < 4; k++) { const s2 = glowSprite(g, [0, 0, 0], 0.03, new THREE.Color(0.6, 0.75, 0.95)); s2.material.blending = THREE.NormalBlending; this.dripS.push(s2); }
    { const wx = 2.55, wz = -4.6; rb.box(C("#d8d4c8"), wx - 0.18, 0, wz - 0.18, wx + 0.18, 0.95, wz + 0.18); rb.geo(cylY(0.15, 0.42, 18), basic("trJug", () => ({ color: new THREE.Color(0.55, 0.75, 0.95), transparent: true, opacity: 0.7 })), wx, 0.95, wz);
      rb.box(C("#3a6a9a"), wx - 0.05, 0.66, wz + 0.18, wx + 0.05, 0.72, wz + 0.22); contact(g, [o[0] + wx, o[1] + 0.005, o[2] + wz], 0.6, 0.6, 0.4); }
    for (const [x, z] of [[-2.55 + 0.45, -2.9 + 0.25], [2.75 + 0.45, -2.1 + 0.25]]) for (let k = 0; k < 7; k++) rb.geo(new THREE.IcosahedronGeometry(0.045, 0), C("#f2eee2"), x + (hash(k + x) - 0.5) * (k < 4 ? 0.14 : 0.5), k < 4 ? 0.33 + hash(k) * 0.05 : 0.03, z + (hash(k + z) - 0.5) * (k < 4 ? 0.14 : 0.5), hash(k) * 3, hash(k + 1) * 3);
    this.buildTradingR2(rb, g);
    this.buildTradingR3(rb, g);
    // cool storm-light shafts from the tall right window across the floor + a rain-streak gobo crawling on the floor
    for (const [x, w, ph] of [[3.25, 0.7, 0.4], [3.55, 0.45, 2.2], [-3.4, 0.5, 1.4]] as number[][]) this.addShaft(g, [o[0] + x, o[1] + 4.4, o[2] - Z + 0.08], [-0.42 * Math.sign(x), -0.62, 0.66], 6.0, w, new THREE.Color(0.1, 0.13, 0.19), ph);
    { const gt = tx("trGobo", 256, 256, (g2, r) => { g2.clearRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 256, L = 20 + r() * 60; g2.strokeStyle = `rgba(190,215,255,${0.15 + 0.3 * r()})`; g2.lineWidth = 2 + r() * 3; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x - 4, y + L); g2.stroke(); } });
      this.gobo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
      this.gobo.position.set(o[0] + 1.6, o[1] + 0.012, o[2] - 2.2); this.gobo.rotation.y = 0.5; this.gobo.layers.set(NOINK); this.gobo.renderOrder = 2; g.add(this.gobo); }
    rb.done(g);
  }

  /** fix r2 (A2 P2 shot 8: "a classroom with 4-5 people", the bottom 30 % empty tile): a stepped octagonal TRADING PIT in
   *  front of the board with a brass rail and a crowd of painted traders on its steps (waving slips, phones), and a
   *  trading-day litter near the lens: a drift of order slips (white / yellow / pink), crumpled wads, tape coils, a
   *  knocked-over chair, a dropped fedora, an overflowing bin, a dangling phone handset, and a soft-focus desk corner
   *  with a black rotary phone, coffee and a smoking ashtray at the bottom right */
  private buildTradingR2(rb: RB, g: THREE.Group) {
    const o = TR.base, oak = TM("trOak", () => woodTex("trOak", "#5a3a22")), oakD = C("#2e1e12"), brass = C("#c9a14a");
    // ---- the pit: three octagonal steps (outer highest), a brass rail round the top step
    const pc: P3 = [0.3, 0, -3.75], RR = [0.45, 0.8, 1.12, 1.42], HS = [0, 0.14, 0.28, 0.42], stepM = C("#6e5a44"), riserM = C("#4e3e2e");
    const stepY = (r: number) => (r < RR[0] ? 0 : r < RR[1] ? HS[1] : r < RR[2] ? HS[2] : HS[3]);
    rb.geo(new THREE.CircleGeometry(RR[0], 8, Math.PI / 8).rotateX(-Math.PI / 2), C("#5a4a3a"), pc[0], 0.003, pc[2], 0, 0, 0, 1, false);
    for (let k = 1; k < 4; k++) {
      rb.geo(new THREE.RingGeometry(RR[k - 1], RR[k], 8, 1, Math.PI / 8).rotateX(-Math.PI / 2), stepM, pc[0], HS[k], pc[2], 0, 0, 0, 1, false);
      rb.geo(new THREE.CylinderGeometry(RR[k - 1], RR[k - 1], HS[k] - HS[k - 1], 8, 1, true, Math.PI / 8).translate(0, (HS[k] + HS[k - 1]) / 2, 0), lam("si:trPitRiser", () => ({ color: "#4e3e2e", side: THREE.DoubleSide })), pc[0], 0, pc[2], 0, 0, 0, 1, false);
      rb.geo(new THREE.CylinderGeometry(RR[k - 1] + 0.01, RR[k - 1] + 0.01, 0.022, 8, 1, true, Math.PI / 8).translate(0, HS[k] - 0.011, 0), brass, pc[0], 0, pc[2], 0, 0, 0, 1, false);
    }
    rb.geo(new THREE.CylinderGeometry(RR[3], RR[3], HS[3], 8, 1, true, Math.PI / 8).translate(0, HS[3] / 2, 0), riserM, pc[0], 0, pc[2], 0, 0, 0, 1, false);
    rb.geo(new THREE.CylinderGeometry(RR[3] + 0.012, RR[3] + 0.012, 0.025, 8, 1, true, Math.PI / 8).translate(0, HS[3] - 0.012, 0), brass, pc[0], 0, pc[2], 0, 0, 0, 1, false);
    void stepM;
    { const rr = RR[3] - 0.08; for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k / 8) * TAU; if (Math.sin(a) < -0.3) continue; rb.seg(brass, [pc[0] + rr * Math.cos(a), 0.42, pc[2] - rr * Math.sin(a)], [pc[0] + rr * Math.cos(a), 1.2, pc[2] - rr * Math.sin(a)], 0.022); }
      for (let k = 0; k < 8; k++) { const a0 = Math.PI / 8 + (k / 8) * TAU, a1 = Math.PI / 8 + ((k + 1) / 8) * TAU; if (Math.sin(a0) < -0.3 || Math.sin(a1) < -0.3) continue;
        rb.seg(brass, [pc[0] + rr * Math.cos(a0), 1.2, pc[2] - rr * Math.sin(a0)], [pc[0] + rr * Math.cos(a1), 1.2, pc[2] - rr * Math.sin(a1)], 0.025); } }
    // the painted pit crowd (back views toward the board; arms wave on their own clocks): smaller cards on the pit floor
    // and the low steps, so their heads sit near the eye line (y ~880-940 at 1080) and never cover the board
    const spots: [number, number][] = [[0.05, -3.5], [0.6, -3.62], [-0.42, -3.9], [0.98, -3.3], [-0.55, -3.25], [0.32, -4.12], [1.25, -3.92], [-0.88, -3.98]];
    spots.forEach(([x, z], k) => {
      const y = stepY(Math.hypot(x - pc[0], z - pc[2])) + 0.002;
      const mat = lam("si:trTraderM" + k, () => ({ map: trTraderTex(k, 0), alphaTest: 0.5, side: THREE.DoubleSide }));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.63, 1.26), mat); m.position.set(o[0] + x, o[1] + y + 0.63, o[2] + z); m.castShadow = true; m.receiveShadow = true; g.add(m);
      this.trCards.push({ m, mat, v: k, ph: hash(k * 3.7) * 40, per: 18 + Math.floor(hash(k * 1.9) * 14), base: m.position.y, phone: k % 4 === 2 });
      contact(g, [o[0] + x, o[1] + y + 0.006, o[2] + z + 0.05], 0.46, 0.24, 0.4);
    });
    // ---- the floor near the lens: a drift of ~70 order slips, wads, tape coils
    for (let i = 0; i < 72; i++) { const x = -2.6 + hash(i * 1.3 + 5) * 5.4, z = -0.4 + hash(i * 2.9 + 7) * 4.4; if (Math.abs(x - 0.3) < 0.5 && z > 3.4) continue;
      rb.panel(TM("trSlipF" + (i % 4), () => slipTex(i % 4)), 0.12, 0.09, x, 0.005 + (i % 7) * 0.0004, z, hash(i + 31) * TAU, -Math.PI / 2); }
    for (let i = 0; i < 16; i++) rb.geo(new THREE.IcosahedronGeometry(0.045 + 0.02 * hash(i), 0), C(["#f2eee2", "#f6e6a8", "#f4d6d0"][i % 3]), -2.4 + hash(i * 4.1) * 5.0, 0.04, 0.2 + hash(i * 6.3) * 3.6, hash(i) * 3, hash(i + 1) * 3);
    for (let i = 0; i < 7; i++) { const x = -2.2 + hash(i * 7.7) * 4.6, z = 0.4 + hash(i * 3.3) * 3.0; for (let k = 0; k < 3; k++) rb.geo(new THREE.TorusGeometry(0.07 - k * 0.018, 0.012, 4, 20).rotateX(Math.PI / 2), lam("si:trTapeCoil", () => ({ map: tapeTex() })), x + k * 0.01, 0.01 + k * 0.004, z, hash(i) * 3); }
    // a knocked-over wooden chair, a dropped fedora, an overflowing bin
    { const cx = -1.75, cz = 2.5, ch = new THREE.Group(); ch.position.set(o[0] + cx, o[1] + 0.21, o[2] + cz); ch.rotation.set(0, 0.6, Math.PI / 2); g.add(ch);
      const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => { const me = new THREE.Mesh(geo, oak); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; ch.add(me); };
      add(new THREE.BoxGeometry(0.42, 0.04, 0.4), 0, 0, 0); add(new THREE.BoxGeometry(0.42, 0.42, 0.04), 0, 0.23, -0.19);
      for (const [lx, lz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.44), lx, -0.22, lz);
      contact(g, [o[0] + cx, o[1] + 0.005, o[2] + cz], 0.9, 0.6, 0.4); }
    { const fx = 0.95, fz = 2.05; rb.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 24), C("#3a3a46"), fx, 0.006, fz); rb.geo(new THREE.CylinderGeometry(0.095, 0.105, 0.1, 18), C("#3a3a46"), fx, 0.06, fz); rb.geo(new THREE.CylinderGeometry(0.106, 0.106, 0.022, 18), C("#7a2a2a"), fx, 0.025, fz);
      contact(g, [o[0] + fx, o[1] + 0.004, o[2] + fz], 0.42, 0.42, 0.4); }
    { const bx = -2.35, bz = 1.65; rb.geo(new THREE.CylinderGeometry(0.17, 0.14, 0.42, 18, 1, true).translate(0, 0.21, 0), lam("si:trBin", () => ({ color: "#6a7268", side: THREE.DoubleSide })), bx, 0, bz);
      for (let k = 0; k < 9; k++) rb.geo(new THREE.IcosahedronGeometry(0.05 + 0.02 * hash(k + 3), 0), C(["#f2eee2", "#f6e6a8", "#f4d6d0"][k % 3]), bx + (hash(k * 2.1) - 0.5) * (k < 5 ? 0.2 : 0.6), k < 5 ? 0.42 + hash(k) * 0.08 : 0.04, bz + (hash(k * 3.9) - 0.5) * (k < 5 ? 0.2 : 0.5), hash(k) * 3, hash(k + 2) * 3);
      contact(g, [o[0] + bx, o[1] + 0.004, o[2] + bz], 0.5, 0.5, 0.45); }
    // the dangling handset off the front-right desk (swings on its cord)
    { const t5 = TR.traders[5], hx = t5[0] + 0.32, hz = t5[2] - 0.62 + 0.23; this.handset.position.set(o[0] + hx, o[1] + 0.8, o[2] + hz); g.add(this.handset);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 6).translate(0, -0.17, 0), C("#141418")); this.handset.add(cord);
      for (let k = 0; k < 9; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 4, 10).rotateX(Math.PI / 2), C("#141418")); ring.position.y = -0.03 - k * 0.034; this.handset.add(ring); }
      const hs = new THREE.Group(); hs.position.y = -0.38; this.handset.add(hs);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 10), C("#141418")); body.castShadow = true; hs.add(body);
      for (const s2 of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 14).rotateX(Math.PI / 2), C("#141418")); cup.position.set(0, s2 * 0.1, 0.012); cup.castShadow = true; hs.add(cup); } }
    // ---- the soft-focus desk corner at the bottom right (a black rotary phone, coffee, a smoking ashtray, a newspaper)
    { const x0 = 0.78, x1 = 1.9, z0 = 2.0, z1 = 2.58;
      rb.box(oak, x0, 0.74, z0, x1, 0.8, z1); rb.box(oakD, x0 + 0.03, 0, z1 - 0.06, x0 + 0.08, 0.74, z1 - 0.01); rb.box(oakD, x0 + 0.03, 0.62, z0 + 0.04, x1 - 0.04, 0.74, z1 - 0.04);
      const px = x0 + 0.32, pz = z0 + 0.3; rb.geo(new THREE.CylinderGeometry(0.085, 0.11, 0.075, 20), C("#18181c"), px, 0.8375, pz, 0, 0, 0, [1.1, 1, 0.9]);
      rb.geo(new THREE.CylinderGeometry(0.055, 0.055, 0.008, 24).rotateX(-0.85), C("#f2f0e6"), px, 0.87, pz + 0.07);
      for (let k = 0; k < 10; k++) { const a = -2.4 + (k / 10) * 4.2; rb.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8).rotateX(-0.85), C("#18181c"), px + Math.cos(a) * 0.038, 0.87 + Math.sin(a) * 0.038 * 0.66, pz + 0.07 + Math.sin(a) * 0.038 * 0.75 + 0.004); }
      rb.seg(C("#18181c"), [px - 0.11, 0.915, pz - 0.015], [px + 0.11, 0.915, pz - 0.015], 0.017); for (const s2 of [-1, 1]) rb.geo(new THREE.SphereGeometry(0.03, 12, 8), C("#18181c"), px + s2 * 0.115, 0.908, pz - 0.015, 0, 0, 0, [1, 0.7, 1.2]);
      rb.geo(cylY(0.04, 0.08, 16), C("#f4f0e6"), x0 + 0.58, 0.8, z0 + 0.22); rb.geo(new THREE.CircleGeometry(0.034, 14).rotateX(-Math.PI / 2), C("#4a2a16"), x0 + 0.58, 0.875, z0 + 0.22);
      rb.geo(new THREE.CylinderGeometry(0.06, 0.05, 0.02, 16), basic("trAshtray", () => ({ color: new THREE.Color(0.7, 0.8, 0.86), transparent: true, opacity: 0.65 })), x0 + 0.78, 0.81, z0 + 0.36);
      rb.geo(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 8).rotateZ(Math.PI / 2 - 0.1), C("#f4f0e6"), x0 + 0.8, 0.825, z0 + 0.36);
      for (let k = 0; k < 2; k++) { const sm2 = plane(g, basic("trSmoke" + k, () => ({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.7 })), 0.06, 0.32, [o[0] + x0 + 0.84, o[1] + 1.0, o[2] + z0 + 0.36], 0, 0, 0, true); this.trSmoke.push(sm2); }
      rb.rbox(C("#ece6d6"), 0.34, 0.012, 0.26, x0 + 0.95, 0.806, z0 + 0.18, 0.3); rb.rbox(C("#2a2a30"), 0.3, 0.002, 0.03, x0 + 0.95, 0.813, z0 + 0.1, 0.3);
      contact(g, [o[0] + (x0 + x1) / 2, o[1] + 0.005, o[2] + (z0 + z1) / 2], x1 - x0 + 0.3, z1 - z0 + 0.3, 0.45); }
    // coffee cups + an ashtray / newspaper on the phone desks (ADD #57)
    TR.traders.forEach((t, k) => { const dz = t[2] - 0.62, x = t[0];
      rb.geo(cylY(0.038, 0.075, 14), C("#f4f0e6"), x + 0.05, 0.8, dz + 0.1); rb.geo(new THREE.CircleGeometry(0.032, 12).rotateX(-Math.PI / 2), C("#4a2a16"), x + 0.05, 0.873, dz + 0.1);
      if (k % 2) rb.rbox(C("#ece6d6"), 0.3, 0.01, 0.22, x - 0.3, 0.805, dz + 0.04, 0.25 * (k - 2)); });
  }

  /** fix r3 (A3 P2 shot 8: no sense of a busy 1963 trading floor; the chart drew itself; the ticker chatter + bell had no
   *  source): a BOARD BOY on a rolling ladder whose chalk hand rides the line tip (the ladder rolls along with it; on
   *  "crashed" he slips a rung and the ladder rolls off to the right with him clinging), a glass-dome TICKER on the
   *  front-right desk whose tape spools into a wicker basket (its bell hammer flicks on "November"), a second BACK ROW
   *  of smaller traders waving slips (heads just above the caption band) */
  private buildTradingR3(rb: RB, g: THREE.Group) {
    const o = TR.base, brass = C("#c9a14a"), oakD = C("#2e1e12");
    // ---- the rolling ladder (moved per frame) + the boy card + his chalk arm
    const lg = this.ladder; g.add(lg);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.3, 0.05).translate(0, 1.65, 0), oakD);
    for (const s2 of [-1, 1]) { const m = rail.clone(); m.position.x = s2 * 0.2; m.castShadow = true; lg.add(m); }
    for (let n = 1; n <= 10; n++) { const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 8).rotateZ(Math.PI / 2), brass); r2.position.y = n * 0.3; r2.castShadow = true; lg.add(r2); }
    for (const s2 of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12).rotateZ(Math.PI / 2), C("#1e1a1e")); w.position.set(s2 * 0.2, 0.04, 0); lg.add(w); }
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), brass); hook.position.set(0, 3.3, 0); hook.rotation.y = Math.PI / 2; lg.add(hook);
    this.boyMat = basic("trBoyM", () => ({ map: boardBoyTex(0), alphaTest: 0.5, side: THREE.DoubleSide }));
    this.boy = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 1.16), this.boyMat); g.add(this.boy);
    this.boyArm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8).translate(0, 0.5, 0), C("#f2efe8")); this.boyArm.castShadow = true; g.add(this.boyArm);
    this.boyHand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), C("#f8f3ee")); g.add(this.boyHand);
    const chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6).rotateZ(Math.PI / 2.6), C("#fbfbf4")); chalk.position.set(-0.03, 0.02, 0.02); this.boyHand.add(chalk);
    // ---- the glass-dome ticker on trader 2's desk (right end) + its tape spooling down into a wicker basket
    const t2 = TR.traders[2], tx0 = t2[0] + 0.48, tz0 = t2[2] - 0.62 - 0.05;
    rb.box(C("#2e2e30"), tx0 - 0.11, 0.8, tz0 - 0.08, tx0 + 0.11, 0.86, tz0 + 0.08); rb.geo(cylY(0.03, 0.12, 12), brass, tx0, 0.86, tz0);
    rb.geo(cylY(0.09, 0.025, 18), C("#3a3a3a"), tx0, 0.98, tz0); rb.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 14).rotateZ(Math.PI / 2), C("#f2ead2"), tx0, 1.04, tz0);
    { const dm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 10, 0, TAU, 0, Math.PI / 2), basic("trDome3", () => ({ color: new THREE.Color(0.86, 0.93, 1.0), transparent: true, opacity: 0.3, depthWrite: false })));
      dm.position.set(o[0] + tx0, o[1] + 1.0, o[2] + tz0); dm.layers.set(NOINK); g.add(dm);
      const gl = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 24).rotateX(Math.PI / 2), brass); gl.position.set(o[0] + tx0, o[1] + 1.0, o[2] + tz0); g.add(gl); }
    rb.geo(new THREE.SphereGeometry(0.035, 12, 8, 0, TAU, 0, Math.PI / 2), brass, tx0 + 0.15, 0.86, tz0);
    this.tickHammer.position.set(o[0] + tx0 + 0.19, o[1] + 0.9, o[2] + tz0); g.add(this.tickHammer);
    { const hm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6).translate(0, 0.035, 0), C("#2a2a2a")); this.tickHammer.add(hm);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), C("#2a2a2a")); hd.position.y = 0.07; this.tickHammer.add(hd); }
    const bx = tx0 + 0.25, bz = tz0 + 0.42;
    rb.geo(new THREE.CylinderGeometry(0.17, 0.13, 0.36, 18, 1, true).translate(0, 0.18, 0), lam("si:trWicker3", () => ({ map: wickerTex(), side: THREE.DoubleSide })), bx, 0, bz);
    contact(g, [o[0] + bx, o[1] + 0.005, o[2] + bz], 0.46, 0.46, 0.42);
    { const P = [[0, 1.04, 0.03], [0.04, 1.0, 0.1], [0.08, 0.86, 0.14], [0.12, 0.8, 0.16], [0.16, 0.62, 0.22], [0.2, 0.42, 0.3], [0.24, 0.3, 0.38], [0.25, 0.22, 0.42]].map(([x, y, z]) => V(o[0] + tx0 + x, o[1] + y, o[2] + tz0 + z));
      const pts = new THREE.CatmullRomCurve3(P).getSpacedPoints(30), pos: number[] = [], uv: number[] = [], idx: number[] = [];
      pts.forEach((pp, i) => { pos.push(pp.x - 0.02, pp.y, pp.z, pp.x + 0.02, pp.y, pp.z); uv.push(0, i / 5, 1, i / 5); if (i < 30) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); });
      const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
      const tmesh = new THREE.Mesh(tg, lam("si:trTapeSpool", () => ({ map: tapeTex3(), side: THREE.DoubleSide }))); g.add(tmesh); }
    for (let k = 0; k < 5; k++) rb.geo(new THREE.TorusGeometry(0.06 - k * 0.008, 0.01, 4, 16).rotateX(Math.PI / 2), lam("si:trTapeCoil", () => ({ map: tapeTex() })), bx + (hash(k + 61) - 0.5) * 0.08, 0.3 + k * 0.012, bz + (hash(k + 67) - 0.5) * 0.08, hash(k) * 3);
    // ---- the second back row: 7 smaller painted traders between the pit and the desks, waving on 12-18 f clocks
    const row: [number, number][] = [[-2.55, -2.55], [-1.85, -2.62], [-0.98, -2.48], [-0.2, -2.58], [0.55, -2.5], [1.38, -2.6], [2.25, -2.52]];
    row.forEach(([x, z], k) => { const v = (k + 3) % 8, mat = lam("si:trRow3M" + k, () => ({ map: trTraderTex(v, 0), alphaTest: 0.5, side: THREE.DoubleSide }));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.1), mat); m.position.set(o[0] + x, o[1] + 0.552, o[2] + z); m.castShadow = true; m.receiveShadow = true; g.add(m);
      this.trCards.push({ m, mat, v, ph: hash(k * 5.3 + 2) * 30, per: 12 + Math.floor(hash(k * 2.7 + 1) * 7), base: m.position.y, phone: k === 3 });
      contact(g, [o[0] + x, o[1] + 0.006, o[2] + z + 0.04], 0.42, 0.22, 0.36); });
  }
  /** how many chalk segments are drawn at picture frame f (the pre-crash creep in 3 steps + the dive), as a float */
  private chalkDrawn(f: number) {
    const preQ = this.chalkT.filter((v) => v === 0).length, sub = 8, c1 = BEAT.crashed1;
    const steps = [BEAT.november, PW(14, "big"), PW(14, "oil")], marks = [3 * sub, 5 * sub, 7 * sub, preQ];
    let preDrawn = marks[0]; steps.forEach((st, i) => { preDrawn += (marks[i + 1] - marks[i]) * sm((f - st + 1) / 12); });
    const dive = clamp01((f - c1 + 1) / 9);
    return preDrawn + (this.chalkN - preQ) * (f >= c1 - 1 ? outCubic(dive) : 0);
  }

  // ================================================================================================ CUTAWAY
  private buildCutaway() {
    const o = CU.base, g = this.cut, rb = new RB(o), T = CU.tank, R = T.r, B = 0.27, SL = Math.tan(THREE.MathUtils.degToRad(9));
    const red = C("#cf4a2a"), uvS = (geo: THREE.BufferGeometry, su: number, sv: number) => { const a = geo.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); return geo; };
    rb.flatY(TM("cuGrid", cuGridTex), -40, 40, -40, 40, 0, 1, 2, 2);
    // fix r1 (A1 P2 / P3): a clean blueprint grid on a backdrop wall far behind the tank (no floating tick ring)
    { const pt = cuPrintTex(); pt.repeat.set(16, 10); const bp = plane(g, basic("cuPrintM", () => ({ map: pt, transparent: true, depthWrite: false })), 64, 40, [o[0], o[1] + 12, o[2] - 18], 0, 0, 0, true); bp.renderOrder = -1; }
    // foundation (back half) + its hatched cut face
    rb.geo(new THREE.CylinderGeometry(R + 0.35, R + 0.45, B, 48, 1, false, Math.PI / 2, Math.PI).translate(0, B / 2, 0), C("#a8a49c"), 0, 0, 0);
    rb.panel(TM("cuHatch", hatchTex), 2 * (R + 0.4), B, 0, B / 2, 0.005);
    // the shell (back half): fix r1 = an even blueprint-blue steel (unlit, MeshBasic) with ring seams + rivets + plate
    // seams (v over the full height), so the curved back wall reads ROUND and the empty top is no 'ghost dome'
    { const shell = new THREE.Mesh(uvS(new THREE.CylinderGeometry(R, R, T.h - B, 64, 1, true, Math.PI / 2, Math.PI).translate(0, (T.h - B) / 2 + B, 0), 3, 1), basic("cuShellB", () => ({ map: cuSteelInTex(), side: THREE.DoubleSide })));
      shell.position.set(o[0], o[1], o[2]); g.add(shell); }
    rb.geo(new THREE.CircleGeometry(R, 48, 0, Math.PI).rotateX(-Math.PI / 2), C("#4a5a8a"), 0, B + 0.002, 0, 0, 0, 0, 1, false);
    // fix r1 (A1 P2): a shallow CONICAL roof (9 deg) on the back half with the hatch hole: a cream plated top (lit) and a
    // blue rafter underside (unlit, no dark dome); a red gable cut edge; a half-ring rail with 7 posts at the rim
    { const NR = 40, NT = 96, pos: number[] = [], uv: number[] = [], hc = CU.hatch.c, hr = CU.hatch.r - 0.02;
      const P = (r: number, a: number) => [r * Math.cos(a), T.h + (R - r) * SL, -r * Math.sin(a)];
      for (let i = 0; i < NR; i++) for (let j = 0; j < NT; j++) {
        const r0 = 0.04 + (i / NR) * (R - 0.04), r1 = 0.04 + ((i + 1) / NR) * (R - 0.04), a0 = (j / NT) * Math.PI, a1 = ((j + 1) / NT) * Math.PI;
        const cr = (r0 + r1) / 2, ca = (a0 + a1) / 2, cx = cr * Math.cos(ca), cz = -cr * Math.sin(ca);
        // skip a cell if any corner reaches into the hatch (no jagged roof teeth inside the collar); the annulus covers the gap
        if (Math.min(...[[r0, a0], [r1, a0], [r1, a1], [r0, a1], [cr, ca]].map(([rq, aq]) => Math.hypot(rq * Math.cos(aq) - hc[0], -rq * Math.sin(aq) - hc[2]))) < hr + 0.05) continue;
        void cx; void cz;
        const A = P(r0, a0), Bq = P(r1, a0), Cq = P(r1, a1), D = P(r0, a1);
        pos.push(...A, ...Bq, ...Cq, ...A, ...Cq, ...D);
        const u0 = (a0 / Math.PI) * 4, u1 = (a1 / Math.PI) * 4, v0 = 1 - r0 / R, v1 = 1 - r1 / R;
        uv.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0);
      }
      const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      // fix r2 (A2 P3 #34): analytic SMOOTH cone normals (up, leaning outward by the 9 deg slope), so the 96 facets no longer
      // print radial ink lines that moired into a paper fan
      { const nrm: number[] = []; for (let i = 0; i < pos.length; i += 3) { const x = pos[i], z = pos[i + 2], rq = Math.max(1e-4, Math.hypot(x, z)), v = V(SL * x / rq, 1, SL * z / rq).normalize(); nrm.push(v.x, v.y, v.z); }
        rg.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); }
      rb.geo(rg, lam("si:cuRoofTop", () => ({ map: cuRoofTopTex(), side: THREE.DoubleSide })), 0, 0, 0, 0, 0, 0, 1, true);
      const under = new THREE.Mesh(rg.clone().translate(0, -0.03, 0), basic("cuRoofU", () => ({ map: cuRoofUnderTex(), side: THREE.DoubleSide }))); under.position.set(o[0], o[1], o[2]); g.add(under);
      // red cut edges: the two walls, the floor line and the roof GABLE (the cone's section)
      for (const s of [-1, 1]) rb.box(red, s * R - 0.085, B, -0.05, s * R + 0.085, T.h + 0.04, 0.04);
      rb.box(red, -R - 0.085, B - 0.04, -0.05, R + 0.085, B + 0.03, 0.04);
      const gl = Math.hypot(R, R * SL), ga = Math.atan(SL);
      for (const s of [-1, 1]) rb.rbox(red, gl + 0.1, 0.1, 0.09, s * R / 2, T.h + (R * SL) / 2 + 0.01, -0.005, 0, 0, -s * ga);
      // rim rail (back half ring): 7 posts, top + mid rails following the circle
      const railM = C("#d0502e"), rr = R - 0.12;
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI; rb.seg(railM, [rr * Math.cos(a), T.h + 0.01, -rr * Math.sin(a)], [rr * Math.cos(a), T.h + 0.95, -rr * Math.sin(a)], 0.03); }
      for (let k = 0; k < 24; k++) { const a0 = (k / 24) * Math.PI, a1 = ((k + 1) / 24) * Math.PI;
        for (const h of [0.95, 0.5]) rb.seg(railM, [rr * Math.cos(a0), T.h + h, -rr * Math.sin(a0)], [rr * Math.cos(a1), T.h + h, -rr * Math.sin(a1)], h > 0.9 ? 0.03 : 0.02); }
    }
    // the hatch: a raised collar (on the cone), a lip ring, a tilted annulus around it, the lid propped open; LOOKS FULL
    const hc = CU.hatch.c, hy = T.h + (R - Math.hypot(hc[0], hc[2])) * SL;
    // fix r2 (A2 P3 #29): the collar is the BRONZE riveted collar of shots 1 / 7 / 16 (#8A5A2B, 12 dark rivets, an inked
    // lip), so "Inside..." and "from the hatch" show the same object as the hook; the diagram roof stays cream
    rb.geo(new THREE.CylinderGeometry(CU.hatch.r, CU.hatch.r, 0.36, 32, 1, true).translate(0, 0.12, 0), lam("si:cuCollar2", () => ({ color: "#8a5a2b", side: THREE.DoubleSide })), hc[0], hy, hc[2]);
    rb.geo(new THREE.TorusGeometry(CU.hatch.r + 0.02, 0.035, 8, 40).rotateX(Math.PI / 2), C("#6a4420"), hc[0], hy + 0.3, hc[2]);
    rb.geo(new THREE.RingGeometry(CU.hatch.r - 0.02, CU.hatch.r + 0.16, 40).rotateX(-Math.PI / 2), C("#6e4a2c"), hc[0], hy + 0.005, hc[2], 0, -Math.atan(SL));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + 0.13; rb.geo(new THREE.SphereGeometry(0.022, 8, 6), C("#3a2414"), hc[0] + Math.cos(a) * (CU.hatch.r + 0.006), hy + 0.19, hc[2] + Math.sin(a) * (CU.hatch.r + 0.006)); }
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; rb.geo(new THREE.SphereGeometry(0.018, 8, 6), C("#6a4420"), hc[0] + Math.cos(a) * (CU.hatch.r + 0.11), hy + 0.012 + Math.sin(a) * 0.02, hc[2] + Math.sin(a) * (CU.hatch.r + 0.11)); }
    this.buildCutR2(rb, g, hy);
    { const ru = new THREE.Mesh(new THREE.RingGeometry(CU.hatch.r - 0.03, CU.hatch.r + 0.17, 40).rotateX(Math.PI / 2), basic("cuRingU", () => ({ color: new THREE.Color("#28346a"), side: THREE.DoubleSide })));
      ru.position.set(o[0] + hc[0], o[1] + hy - 0.045, o[2] + hc[2]); ru.rotation.x = -Math.atan(SL); g.add(ru); }
    // fix r2 (A2 P1 x2 shot 12: LOOKS FULL hid behind the collar for the whole hatch hold): further back and up (z -2.45,
    // its centre 0.62 m over the old anchor's y), 0.8 x 0.3 m, turned to face the 60-deg hatch view (rx -0.55): in S12H its
    // bottom edge clears the collar top by ~200 px at 1080 (y ~300-475), letters ~80 px
    const sg = SIGN12;
    for (const s of [-1, 1]) rb.seg(C("#5a4a3a"), [sg.c[0] + s * 0.3, T.h + (R - Math.abs(sg.c[2])) * SL - 0.02, sg.c[2] - 0.07], [sg.c[0] + s * 0.3, sg.c[1] + 0.08, sg.c[2] - 0.06], 0.02);
    this.looks = plane(g, faceMat("cuLooks", looksFullTex), sg.w, sg.h, [o[0] + sg.c[0], o[1] + sg.c[1], o[2] + sg.c[2]], 0, sg.rx);
    // fix r1 (A1 P2 shot 12): the pour pipe comes in from the left and its spout hangs OVER THE HATCH, so both pours fall
    // through the open hatch; it swings away before the crane up to the hatch view; hidden in shot 10 (A1 P3)
    { const pm = C("#9c8f7a"), py = 11.0, hz = hc[2], G = this.pipe;   // fix r2 (A2 P2 #21): 0.8 m higher, so the thin oil stream shows above the gable
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; G.add(me); return me; };
      const L = 7.3; add(new THREE.CylinderGeometry(0.12, 0.12, L, 16).rotateZ(Math.PI / 2), pm, -0.2 - L / 2, py, hz);
      add(new THREE.TorusGeometry(0.2, 0.12, 10, 16, Math.PI / 2).rotateZ(Math.PI / 2), pm, -0.2, py - 0.2, hz);
      add(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16), pm, 0, py - 0.37, hz); add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20), C("#7a6e5c"), 0, py - 0.56, hz);
      add(new THREE.TorusGeometry(0.2, 0.025, 8, 28), C("#c4342a"), -4.0, py + 0.32, hz); add(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), C("#c4342a"), -4.0, py + 0.16, hz);
      for (const x of [-1.9, -3.4, -5.0]) add(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 18).rotateZ(Math.PI / 2), C("#7a6e5c"), x, py, hz);
      G.position.set(o[0], o[1], o[2]); g.add(G); this.spout = V(hc[0], py - 0.6, hz); }
    rb.done(g);
    // ---- the water: back body on the inner wall (opaque), a see-through front face, the top surface; the oil band + top
    const wb = waterMat(false), wf = waterMat(true), ob = oilMat(false), ot = oilMat(true); this.cuMats.push(wb, wf, ob, ot);
    this.wBack = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, T.h - B, 64, 1, true, Math.PI / 2, Math.PI).translate(0, (T.h - B) / 2 + B, 0), wb);
    this.wBack.position.set(o[0], o[1], o[2]); this.wBack.renderOrder = 1; g.add(this.wBack);
    this.wFront = new THREE.Mesh(new THREE.PlaneGeometry(2 * R - 0.15, T.h - B).translate(0, (T.h - B) / 2 + B, 0), wf);
    this.wFront.position.set(o[0], o[1], o[2] + 0.025); this.wFront.layers.set(NOINK); this.wFront.renderOrder = 3; g.add(this.wFront);
    this.wTop = new THREE.Mesh(new THREE.CircleGeometry(R - 0.04, 48, 0, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: untone("#8ad6f6"), side: THREE.DoubleSide }));
    this.wTop.position.set(o[0], 0, o[2]); this.wTop.layers.set(NOINK); g.add(this.wTop);
    this.oilBand = new THREE.Mesh(new THREE.PlaneGeometry(2 * R - 0.15, 1, 24, 1).translate(0, 0.5, 0), ob); this.oilBand.position.set(o[0], 0, o[2] + 0.03); g.add(this.oilBand);
    this.oilTop = new THREE.Mesh(new THREE.CircleGeometry(R - 0.04, 64, 0, Math.PI).rotateX(-Math.PI / 2), ot); this.oilTop.position.set(o[0], 0, o[2]); g.add(this.oilTop);
    // the removed front half, drawn as a faint phantom (a whisper of shell + two clean rim lines, no ticks)
    const ghost = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T.h - B, 64, 1, true, -Math.PI / 2, Math.PI).translate(0, (T.h - B) / 2 + B, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.88, 1.0), transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide }));
    ghost.position.set(o[0], o[1], o[2]); ghost.layers.set(NOINK); ghost.renderOrder = 5; g.add(ghost);
    // fix r3 (A3 P2 shot 10: a stray pale arc crossed the water on the pull-out): the phantom TOP rim (front half) is hidden
    // whenever the lens is above the roof (seen from above it projects across the water body); the base rim stays
    for (const y of [B, T.h]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.014, 6, 72, Math.PI).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.9, 1.0), transparent: true, opacity: 0.22, depthWrite: false }));
      rim.position.set(o[0], o[1] + y, o[2]); rim.layers.set(NOINK); rim.renderOrder = 5; g.add(rim); if (y > 1) this.topRim = rim; }
    this.buildCutR3(g);
    // bubbles (rising rings in front of the water face), the pour streams, splash rings, the "full" sparkle
    const n = 60, bp = new Float32Array(n * 3), bgeo = new THREE.BufferGeometry(); bgeo.setAttribute("position", new THREE.BufferAttribute(bp, 3));
    this.bubbles = new THREE.Points(bgeo, new THREE.PointsMaterial({ map: ringTex(), size: 0.16, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.9, 0.97, 1.0) }));
    this.bubbles.frustumCulled = false; this.bubbles.layers.set(NOINK); this.bubbles.renderOrder = 4; g.add(this.bubbles);
    const smW = streamMat("#a8dcf8", 0.85), smO = streamMat("#ffc23a", 1.0); this.cuMats.push(smW, smO);
    this.pourW = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 1, 16, 1, true).translate(0, 0.5, 0), smW); this.pourW.layers.set(NOINK); g.add(this.pourW);
    this.pourO = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.036, 1, 12, 1, true).translate(0, 0.5, 0), smO); this.pourO.layers.set(NOINK); g.add(this.pourO);
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic("cuRipM" + k, () => ({ map: rippleTex(), transparent: true, depthWrite: false, opacity: 0.8 }))); m.layers.set(NOINK); m.renderOrder = 6; g.add(m); this.ripples.push(m); }
    for (let k = 0; k < 9; k++) { const s = glowSprite(g, [0, 0, 0], 0.07, glowCol("#ffc23a", 1.1)); s.material.blending = THREE.NormalBlending; s.material.opacity = 1; this.drops.push(s); }
    const spT = tx("cuSpark", 128, 128, (g2) => { g2.clearRect(0, 0, 128, 128); g2.fillStyle = "#fff"; g2.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, rr = k % 2 ? 10 : 62; g2.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g2.closePath(); g2.fill(); }, true);
    this.sparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: spT, color: new THREE.Color(3, 2.6, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.sparkle.layers.set(NOINK); this.sparkle.renderOrder = 7; g.add(this.sparkle);
    this.glint10 = new THREE.Sprite(new THREE.SpriteMaterial({ map: spT, color: new THREE.Color(3, 2.6, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.glint10.layers.set(NOINK); this.glint10.renderOrder = 7; g.add(this.glint10);
    // fix r1 (A1 P1 shot 10): the UNKNOWN state - a murk veil in front of the water face (hides the fish + bubbles until
    // "mostly"), the lenders' flashlight beam slanting down from the open hatch through the glowing gold with dust motes
    this.murk = new THREE.Mesh(new THREE.PlaneGeometry(2 * R - 0.1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: untone("#0e3f78"), transparent: true, opacity: 0.9, depthWrite: false }));
    this.murk.position.set(o[0], o[1] + B, o[2] + 0.34); this.murk.layers.set(NOINK); this.murk.renderOrder = 5; g.add(this.murk);
    this.beam = this.addShaft(g, [o[0] + hc[0], o[1] + hy + 0.25, o[2] + hc[2]], [0.2, -1, 0.15], 7.4, 1.25, new THREE.Color(0.34, 0.31, 0.2), 0.4); this.beam.mesh.renderOrder = 7;
    this.beamMotes = new Motes(g, 34, 57, CU.base, [-0.9, 3.6, -1.1], [1.1, 8.0, 0.2], new THREE.Color(0.9, 0.82, 0.55), 0.035, 0.08);
    // shot 12 (A1 ADD): soft light shafts slanting down from the open hatch into the water once the tank is full
    for (const [dx, w, ph] of [[0.22, 0.7, 0.3], [-0.3, 0.5, 1.9]] as number[][]) this.hatchShafts.push(this.addShaft(g, [o[0] + hc[0], o[1] + hy - 0.05, o[2] + hc[2] + 0.2], [dx, -1, 0.28], 6.5, w, new THREE.Color(0.1, 0.12, 0.1), ph));
    this.hatchGlow = glowSprite(g, [o[0] + hc[0], o[1] + hy - 0.12, o[2] + hc[2] + 0.1], 0.8, glowCol("#ffe2a0", 0.5)); this.hatchGlow.renderOrder = 7;
    this.beamMotes.pts.renderOrder = 7;
    // inside the tank (seen through the water face once it clears): swaying weed strands, a lost rubber boot, silt specks
    // fix r2 (A2 P3 #33: the diagram read as an aquarium): 5 strands, <= 0.75 m (~115 px in the wide)
    // fix r3 (A3 P3 #31: seaweed in a freshly filled tank): ONE sprig left as the gag (rust, a bolt and a tyre in buildCutR3)
    for (let k = 2; k < 3; k++) { const x = -2.5 + k * 1.15 + (hash(k) - 0.5) * 0.3, h = 0.42 + 0.33 * hash(k + 3), wg = new THREE.PlaneGeometry(0.2, h, 1, 8).translate(0, h / 2, 0);
      const m = new THREE.Mesh(wg, lam("si:cuWeed2", () => ({ map: weedTex(), alphaTest: 0.4, side: THREE.DoubleSide }))); m.position.set(o[0] + x, o[1] + B, o[2] - 0.2 - hash(k + 9) * 0.5); g.add(m);
      this.weeds.push({ m, base: Float32Array.from((wg.attributes.position as THREE.BufferAttribute).array as Float32Array), h, ph: hash(k * 7) * TAU }); }
    // fix r2 (A2 P3 #33: the pink boot was unreadable; a drum read pink-purple too through the blue water face): the floor
    // keeps only the 5 weed strands, a clean diagram
    this.silt = new Motes(g, 60, 61, CU.base, [-2.8, 0.5, 0.05], [2.8, 7.6, 0.28], new THREE.Color(0.55, 0.7, 0.75), 0.04, -0.012);
    // shot 12: the weighted tape from a reel on the roof, over the collar, down into the gold skin (why it says FULL)
    { const tm = basic("cuTapeM", () => ({ color: new THREE.Color("#f2c230"), side: THREE.DoubleSide })), T2 = this.tapeG;
      const seg2 = (a: P3, b: P3) => { const A = V(...a), Bv = V(...b), d = Bv.clone().sub(A), m = new THREE.Mesh(new THREE.PlaneGeometry(0.045, d.length()), tm); m.position.copy(A.add(Bv).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.layers.set(NOINK); T2.add(m); };
      // fix r3 (A3 P3 #29: the plumb bob was unreadable): the tape runs on down through the gold and the bob (a big red-orange
      // plumb, plum-inked) hangs JUST under the oil, in the water, where the cut face shows it: they only measured the top
      const rim = hy + 0.32; seg2([0.62, hy + 0.12, hc[2] + 0.42], [0.36, rim, hc[2] + 0.22]); seg2([0.36, rim, hc[2] + 0.22], [0.12, CUW - 0.04, hc[2] + 0.1]);
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 20).rotateZ(Math.PI / 2), C("#b8472e")); reel.position.set(0.66, hy + 0.13, hc[2] + 0.46); reel.castShadow = true; T2.add(reel);
      const bob = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 14).rotateX(Math.PI), basic("cuBob3", () => ({ color: glowCol("#ff6a2a", 1.15) }))); bob.position.set(0.12, CUW - 0.42, hc[2] + 0.1); T2.add(bob);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.05, 14), basic("cuBobCap3", () => ({ color: glowCol("#c8472e", 1.0) }))); cap.position.set(0.12, CUW - 0.29, hc[2] + 0.1); T2.add(cap);
      { const A = V(0.12, CUW - 0.04, hc[2] + 0.1), Bv = V(0.12, CUW - 0.27, hc[2] + 0.1), m = new THREE.Mesh(new THREE.PlaneGeometry(0.045, A.distanceTo(Bv)), tm); m.position.copy(A.add(Bv).multiplyScalar(0.5)); m.layers.set(NOINK); T2.add(m); }
      this.bobGlint = glowSprite(g, [o[0] + 0.16, o[1] + CUW - 0.36, o[2] + hc[2] + 0.2], 0.3, glowCol("#fff0c8", 1.6)); this.bobGlint.visible = false;
      T2.position.set(o[0], o[1], o[2]); g.add(T2); }
  }

  /** fix r2 (A2 P2 #22 / ADD #67 shot 12 hatch hold; P3 #34): the hatch lid propped open on its left, a dark oily ring
   *  stain round the collar, rust streaks running downhill from it, rivet rows, boot scuffs + a boot print, a dropped
   *  pencil; a soft gull shadow that slides across the roof before "full"; two glints where the oil lens meets the walls
   *  (shot 12); the WATER tag (green frame, like LOOKS FULL) on "water," */
  private buildCutR2(rb: RB, g: THREE.Group, hy: number) {
    const o = CU.base, hc = CU.hatch.c, hr = CU.hatch.r, SL = Math.tan(THREE.MathUtils.degToRad(9)), tilt = -Math.atan(SL), bronze = C("#8a5a2b");
    // the lid: a bronze disc hinged on the collar's left lip, swung over to lean outward ~70 deg; a prop rod
    { const lg = new THREE.Group(); lg.position.set(o[0] + hc[0] - hr - 0.03, o[1] + hy + 0.3, o[2] + hc[2]); lg.rotation.z = THREE.MathUtils.degToRad(110); g.add(lg);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(hr + 0.02, hr + 0.02, 0.045, 32).translate(hr + 0.02, 0, 0), bronze); disc.castShadow = true; disc.receiveShadow = true; lg.add(disc);
      const gasket = new THREE.Mesh(new THREE.TorusGeometry(hr - 0.06, 0.016, 6, 32).rotateX(Math.PI / 2).translate(hr + 0.02, -0.03, 0), C("#2a2a2e")); lg.add(gasket);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14).translate(hr + 0.02, -0.035, 0), C("#6a4420")); lg.add(hub);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU, rv = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), C("#3a2414")); rv.position.set(hr + 0.02 + Math.cos(a) * (hr - 0.04), -0.026, Math.sin(a) * (hr - 0.04)); lg.add(rv); }
      rb.seg(C("#5a5e64"), [hc[0] - hr + 0.02, hy + 0.28, hc[2] + 0.12], [hc[0] - hr - 0.26, hy + 0.62, hc[2] + 0.1], 0.012); }
    // decals on the roof round the hatch (tilted with the cone): the oily ring stain, rust streaks downhill (-z), boot
    // scuffs + one boot print, a dropped pencil
    const deco = (key: string, w: number, h: number, x: number, z: number, ry: number, draw: (g2: G, r: R) => void, op = 1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateZ(ry), basic("cuDeco" + key, () => ({ map: tx("cuDecoT" + key, 256, 256, draw, true), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      const rr = Math.hypot(x, z), yy = CU.tank.h + (CU.tank.r - rr) * SL + 0.006; m.position.set(o[0] + x, o[1] + yy, o[2] + z);
      m.rotation.x = -Math.PI / 2 + tilt * (-z / Math.max(rr, 1e-3));   // lies on the cone (its normal leans outward / downhill)
      m.layers.set(NOINK); m.renderOrder = 2; g.add(m); return m; };
    deco("ring", 1.7, 1.7, hc[0], hc[2], 0, (g2, r) => { g2.clearRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 66 + r() * 34, gr = g2.createRadialGradient(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 0, 128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 14 + r() * 16);
      gr.addColorStop(0, "rgba(52,40,34,0.3)"); gr.addColorStop(1, "rgba(52,40,34,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 256, 256); }
      const m2 = g2.createRadialGradient(128, 128, 60, 128, 128, 66); m2.addColorStop(0, "rgba(0,0,0,1)"); m2.addColorStop(1, "rgba(0,0,0,0)"); g2.globalCompositeOperation = "destination-out"; g2.fillStyle = m2; g2.beginPath(); g2.arc(128, 128, 66, 0, TAU); g2.fill(); g2.globalCompositeOperation = "source-over"; });
    for (const [dx, w, L] of [[-0.24, 0.07, 0.75], [0.1, 0.05, 0.55], [0.3, 0.06, 0.65]] as number[][]) deco("rust" + dx, w, L, hc[0] + dx, hc[2] - hr - 0.18 - L / 2, 0, (g2) => {
      g2.clearRect(0, 0, 256, 256); const gr = g2.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, "rgba(160,84,40,0.75)"); gr.addColorStop(1, "rgba(160,84,40,0)"); g2.fillStyle = gr; g2.fillRect(70, 0, 116, 256); });
    deco("scuffs", 0.9, 0.6, hc[0] + 0.55, hc[2] + 0.55, 0.4, (g2, r) => { g2.clearRect(0, 0, 256, 256); for (let i = 0; i < 9; i++) { g2.strokeStyle = `rgba(80,60,50,${0.18 + 0.2 * r()})`; g2.lineWidth = 6 + r() * 8; g2.lineCap = "round"; const x = 30 + r() * 190, y = 30 + r() * 190; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x + 20 + r() * 30, y + (r() - 0.5) * 20); g2.stroke(); } });
    deco("boot", 0.13, 0.3, hc[0] - 0.55, hc[2] + 0.5, -0.3, (g2) => { g2.clearRect(0, 0, 256, 256); g2.fillStyle = "rgba(70,52,44,0.66)"; g2.beginPath(); g2.ellipse(128, 70, 62, 62, 0, 0, TAU); g2.fill(); g2.beginPath(); g2.ellipse(128, 200, 48, 46, 0, 0, TAU); g2.fill();
      g2.strokeStyle = "rgba(240,230,210,0.5)"; g2.lineWidth = 6; for (let y = 30; y < 240; y += 26) { g2.beginPath(); g2.moveTo(80, y); g2.lineTo(176, y); g2.stroke(); } });
    { const rr = Math.hypot(hc[0] + 0.62, hc[2] + 0.38), yy = CU.tank.h + (CU.tank.r - rr) * SL; rb.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.17, 6).rotateZ(Math.PI / 2), C("#f2c22a"), hc[0] + 0.62, yy + 0.01, hc[2] + 0.38, 0.6); rb.geo(new THREE.ConeGeometry(0.008, 0.025, 6).rotateZ(-Math.PI / 2), C("#e8c89a"), hc[0] + 0.62 + 0.095 * Math.cos(0.6), yy + 0.01, hc[2] + 0.38 - 0.095 * Math.sin(0.6), 0.6); }
    // the gull shadow (a soft dark bird silhouette) sliding across the roof
    { const gt = tx("cuGullSh", 256, 128, (g2) => { g2.clearRect(0, 0, 256, 128); g2.fillStyle = "rgba(60,48,80,0.85)"; g2.beginPath(); g2.moveTo(10, 70); g2.quadraticCurveTo(70, 30, 128, 64); g2.quadraticCurveTo(186, 30, 246, 70); g2.quadraticCurveTo(186, 52, 128, 80); g2.quadraticCurveTo(70, 52, 10, 70); g2.fill(); }, true);
      this.gullSh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      this.gullSh.layers.set(NOINK); this.gullSh.renderOrder = 3; g.add(this.gullSh); }
    // two wall glints where the spreading oil lens meets the walls (shot 12)
    const spT = tx("cuSpark", 128, 128, (g2) => { g2.clearRect(0, 0, 128, 128); g2.fillStyle = "#fff"; g2.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, rr = k % 2 ? 10 : 62; g2.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g2.closePath(); g2.fill(); }, true);
    for (let k = 0; k < 2; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spT, color: new THREE.Color(2.6, 2.1, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.layers.set(NOINK); sp.renderOrder = 7; g.add(sp); this.wallGl.push(sp); }
    // the WATER tag (ADD #65): green-frame board + a thin leader to the water body, pops on "water," (shot 12 wide)
    // fix r3 (A3 P2 shot 12: ~30 px letters right above the caption band): a 1.3x card with bigger letters (~46 px at 1080),
    // INSIDE the water body on its left third, riding up with the rising water to ~0.42 H; the OIL tag (gold frame, a
    // pointer up to the layer) replaces it on "oil,"
    { const tt = tx("cuWaterTag3", 640, 240, (g2) => { g2.fillStyle = "#f6f1e2"; rrect(g2, 6, 6, 628, 228, 24); g2.fill(); g2.strokeStyle = "#1f5a9a"; g2.lineWidth = 14; rrect(g2, 15, 15, 610, 210, 18); g2.stroke(); ctextC(g2, "WATER", 320, 182, 172, "#1f5a9a", 560); }, true);
      this.waterTag = plane(g, faceMat("cuWaterTag3", () => tt), 1.95, 0.73, [o[0] - 1.45, o[1] + 6.0, o[2] + 0.45], 0, 0, 0, true);
      const ot = tx("cuOilTag3", 520, 300, (g2) => { g2.clearRect(0, 0, 520, 300); g2.fillStyle = "#e0a92a"; g2.beginPath(); g2.moveTo(232, 62); g2.lineTo(260, 4); g2.lineTo(288, 62); g2.closePath(); g2.fill();
        g2.fillStyle = "#fbf3dc"; rrect(g2, 8, 56, 504, 236, 26); g2.fill(); g2.strokeStyle = "#e0a92a"; g2.lineWidth = 16; rrect(g2, 18, 66, 484, 216, 20); g2.stroke(); g2.strokeStyle = "#8a5a12"; g2.lineWidth = 3; rrect(g2, 30, 78, 460, 192, 14); g2.stroke();
        ctextC(g2, "OIL", 260, 236, 190, "#b06a0a", 420); }, true);
      this.oilTag = plane(g, faceMat("cuOilTag3", () => ot, 1, true), 1.25, 0.72, [o[0] + 1.55, o[1] + CUW - 0.52, o[2] + 0.46], 0, 0, 0, true); this.oilTag.visible = false; this.oilTag.renderOrder = 8;
      this.waterLead = plane(g, basic("cuWaterLead", () => ({ color: new THREE.Color("#1f5a9a") })), 0.001, 0.001, [o[0] + 0.9, o[1] + 2.5, o[2] + 0.44], 0, 0, 0, true); }
  }

  /** fix r3 (A3 P2 / P3 shots 10 + 12: the diagram backdrop was bare, the tank floor an aquarium): faint cyan BLUEPRINT
   *  outlines of two neighbouring tanks (spiral stairs, roof rails) cut by the frame edges, the No. 7 stair drawn in outline
   *  just outside the cut wall, a tick-only depth scale (no numbers) on the left cut edge, a hatched ground-section strip in
   *  front of the base; on the tank floor ONE weed sprig, rust flakes, a sunken bolt and a half-buried tyre that lets out a
   *  bubble every ~40 f; rust flecks drifting down through the water */
  private buildCutR3(g: THREE.Group) {
    const o = CU.base, T = CU.tank, R = T.r, B = 0.27;
    const cyan = (key: string, w: number, h: number, draw: (g2: G) => void, p: P3, op: number) => {
      const m = plane(g, basic("cuBP" + key, () => ({ map: tx("cuBPt" + key, Math.round(w * 64), Math.round(h * 64), (g2) => { g2.clearRect(0, 0, w * 64, h * 64); g2.strokeStyle = "rgba(150,215,255,1)"; g2.fillStyle = "rgba(150,215,255,1)"; g2.lineCap = "round"; g2.lineJoin = "round"; draw(g2); }, true), transparent: true, opacity: op, depthWrite: false })), w, h, [o[0] + p[0], o[1] + p[1], o[2] + p[2]], 0, 0, 0, true);
      m.renderOrder = 0; return m; };
    // two neighbour tanks (outline only), 6 m behind, centred 7.6 m left / right: shell, plate rings, cone roof + rail, a spiral stair
    const nb = (g2: G, flip: boolean) => { const S = 64, W = 6 * S, X0 = 1 * S, top = 1.2 * S, bot = 10.4 * S;
      g2.save(); if (flip) { g2.translate(8 * S, 0); g2.scale(-1, 1); }
      g2.lineWidth = 4; g2.strokeRect(X0, top, W, bot - top);
      g2.lineWidth = 2; for (let k = 1; k < 7; k++) { const y = top + ((bot - top) * k) / 7; g2.beginPath(); g2.moveTo(X0, y); g2.lineTo(X0 + W, y); g2.stroke(); }
      g2.lineWidth = 3; g2.beginPath(); g2.moveTo(X0, top); g2.lineTo(X0 + W / 2, top - 0.55 * S); g2.lineTo(X0 + W, top); g2.stroke();
      for (let k = 0; k <= 8; k++) { const x = X0 + (W * k) / 8, y = top - 0.55 * S * (1 - Math.abs(k / 4 - 1)); g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x, y - 0.6 * S); g2.stroke(); }
      g2.beginPath(); for (let k = 0; k <= 8; k++) { const x = X0 + (W * k) / 8, y = top - 0.55 * S * (1 - Math.abs(k / 4 - 1)) - 0.6 * S; if (k) g2.lineTo(x, y); else g2.moveTo(x, y); } g2.stroke();
      g2.lineWidth = 2.5; for (let k = 0; k < 9; k++) { const y0 = bot - k * 1.02 * S, x0 = k % 2 ? X0 + W - 0.2 * S : X0 + 0.2 * S, x1 = k % 2 ? X0 + 0.2 * S : X0 + W - 0.2 * S; g2.beginPath(); g2.moveTo(x0, y0); g2.lineTo(x1, y0 - 1.02 * S); g2.stroke(); }
      g2.restore(); };
    cyan("nbL", 8, 12, (g2) => nb(g2, false), [-8.6, 5.6, -6.0], 0.2);
    cyan("nbR", 8, 12, (g2) => nb(g2, true), [8.6, 5.6, -6.0], 0.2);
    // the No. 7 stair outline just outside the right cut wall (a zig-zag of flights with landings), on the cut plane
    cyan("stair", 1.0, 8.6, (g2) => { const S = 64; g2.lineWidth = 3; for (let k = 0; k < 8; k++) { const y0 = 8.6 * S - k * 1.04 * S, x0 = k % 2 ? 0.85 * S : 0.15 * S, x1 = k % 2 ? 0.15 * S : 0.85 * S; g2.beginPath(); g2.moveTo(x0, y0); g2.lineTo(x1, y0 - 1.04 * S); g2.stroke(); g2.beginPath(); g2.moveTo(0.1 * S, y0 - 1.04 * S); g2.lineTo(0.9 * S, y0 - 1.04 * S); g2.stroke(); }
      g2.lineWidth = 2; g2.beginPath(); g2.moveTo(0.05 * S, 0); g2.lineTo(0.05 * S, 8.6 * S); g2.moveTo(0.95 * S, 0); g2.lineTo(0.95 * S, 8.6 * S); g2.stroke(); }, [R + 0.62, 4.3 + 0.1, 0.06], 0.26);
    // a tick-only depth scale (no numbers) on the left cut edge: a long tick every metre, short ticks every 0.25 m
    cyan("scale", 0.5, 8.4, (g2) => { const S = 64; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(0.45 * S, 0); g2.lineTo(0.45 * S, 8.4 * S); g2.stroke();
      for (let k = 0; k <= 33; k++) { const y = 8.4 * S - k * 0.25 * S, L = k % 4 === 0 ? 0.4 : 0.18; g2.lineWidth = k % 4 === 0 ? 3 : 2; g2.beginPath(); g2.moveTo(0.45 * S, y); g2.lineTo((0.45 - L) * S, y); g2.stroke(); } }, [-R - 0.42, 4.2 + 0.27, 0.06], 0.3);
    // the hatched ground-section strip on the floor in front of the cut (a section through the ground)
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.7).rotateX(-Math.PI / 2), basic("cuGroundSec", () => ({ map: tx("cuGroundSecT", 1024, 64, (g2) => { g2.clearRect(0, 0, 1024, 64); g2.strokeStyle = "rgba(150,215,255,1)"; g2.lineWidth = 3; for (let x = -64; x < 1088; x += 18) { g2.beginPath(); g2.moveTo(x, 64); g2.lineTo(x + 40, 0); g2.stroke(); } g2.lineWidth = 5; g2.beginPath(); g2.moveTo(0, 2); g2.lineTo(1024, 2); g2.stroke(); }, true), transparent: true, opacity: 0.18, depthWrite: false })));
      m.position.set(o[0], o[1] + 0.006, o[2] + 0.42); m.layers.set(NOINK); m.renderOrder = 1; g.add(m); }
    // the tank floor: rust flakes + a sunken bolt + a half-buried tyre (a bubble from it every ~40 f)
    { const fl = tx("cuRustFl", 128, 64, (g2, r) => { g2.clearRect(0, 0, 128, 64); for (let i = 0; i < 14; i++) { g2.fillStyle = ["#8a4a2a", "#a8603a", "#6a3a22"][i % 3]; g2.beginPath(); const x = 10 + r() * 108, y = 10 + r() * 44; g2.ellipse(x, y, 3 + r() * 6, 2 + r() * 3, r() * 3, 0, TAU); g2.fill(); } }, true);
      for (const x of [-1.6, 0.4, 1.9]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35).rotateX(-Math.PI / 2), basic("cuRustFlM", () => ({ map: fl, transparent: true, depthWrite: false }))); m.position.set(o[0] + x, o[1] + B + 0.006, o[2] - 0.4); m.layers.set(NOINK); m.renderOrder = 1; g.add(m); }
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6).rotateZ(Math.PI / 2 - 0.2), C("#5a5e66")); bolt.position.set(o[0] - 0.7, o[1] + B + 0.05, o[2] - 0.5); g.add(bolt);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 6).rotateZ(Math.PI / 2 - 0.2), C("#4a4e56")); nut.position.set(o[0] - 0.84, o[1] + B + 0.08, o[2] - 0.5); g.add(nut);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 10, 28), C("#22232a")); tyre.position.set(o[0] + 1.25, o[1] + B + 0.12, o[2] - 0.75); tyre.rotation.set(0.35, 0.3, 0.12); g.add(tyre);
      this.tyreBub = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: new THREE.Color(0.9, 0.97, 1.0), transparent: true, depthWrite: false, fog: false })); this.tyreBub.layers.set(NOINK); this.tyreBub.renderOrder = 4; g.add(this.tyreBub); }
    // slosh droplets (shot 10): little gold drops flicked off the band at both walls
    for (let k = 0; k < 8; k++) { const s = glowSprite(g, [0, 0, 0], 0.08, glowCol("#ffc23a", 1.0)); s.material.blending = THREE.NormalBlending; s.material.opacity = 1; s.visible = false; this.sloshDrops.push(s); }
    // rust flecks drifting slowly DOWN through the water (normal blending, rust brown)
    this.rust = new Motes(g, 12, 83, CU.base, [-2.7, 0.6, 0.08], [2.7, 7.2, 0.3], new THREE.Color(0.55, 0.3, 0.18), 0.05, -0.02);
    (this.rust.pts.material as THREE.PointsMaterial).blending = THREE.NormalBlending; (this.rust.pts.material as THREE.PointsMaterial).opacity = 0.85;
  }

  // ================================================================================================ KITCHEN
  private buildKitchen() {
    const o = KI.base, g = this.kitchen, rb = new RB(o), X = KI.room.w / 2, Z = KI.room.d / 2, H = KI.room.h, W = KI.window;
    const paper = TM("kiPaper", kiPaperTex), tile = TM("kiTile", kiTileTex), white = C("#f8f4ea"), chrome = C("#d8dde2"), mint = "#8fd0b8";
    rb.flatY(TM("kiChecker", checkerTex), -X, X, -Z, Z, 0, 1, 1.2, 1.2);
    rb.flatY(TM("kiCeil", () => plasterTex("kiCeil", "#f8f0dc")), -X, X, -Z, Z, H, -1, 2, 2);
    rb.wallZ(paper, -X, X, 0, H, -Z, 1, 1, 1); rb.wallZ(paper, -X, X, 0, H, Z, -1, 1, 1);
    rb.wallX(paper, -Z, Z, 0, H, -X, 1, 1, 1); rb.wallX(paper, -Z, Z, 0, H, X, -1, 1, 1);
    rb.wallZ(tile, -2.1, X, 0.93, 1.5, -Z + 0.005, 1, 0.6, 0.6);
    for (const [x0, z0, x1, z1] of [[-X, -Z, X, -Z + 0.03], [-X, Z - 0.03, X, Z], [-X, -Z, -X + 0.03, Z], [X - 0.03, -Z, X, Z]]) rb.box(C("#d8483a"), x0, 0, z0, x1, 0.1, z1, false);
    // the window: the garden view on the wall, white frame + muntins, sill + geraniums, red gingham cafe curtains
    plane(g, faceMat("kiGarden", kiGardenTex, 0.95), W.w, W.h, [o[0] + W.c[0], o[1] + W.c[1], o[2] - Z + 0.012]);
    const wx0 = W.c[0] - W.w / 2, wx1 = W.c[0] + W.w / 2, wy0 = W.c[1] - W.h / 2, wy1 = W.c[1] + W.h / 2;
    rb.box(white, wx0 - 0.07, wy0, -Z, wx0, wy1, -Z + 0.06); rb.box(white, wx1, wy0, -Z, wx1 + 0.07, wy1, -Z + 0.06); rb.box(white, wx0 - 0.07, wy1, -Z, wx1 + 0.07, wy1 + 0.07, -Z + 0.06);
    rb.box(white, wx0 - 0.12, wy0 - 0.05, -Z, wx1 + 0.12, wy0, -Z + 0.14); rb.box(white, W.c[0] - 0.02, wy0, -Z, W.c[0] + 0.02, wy1, -Z + 0.04); rb.box(white, wx0, W.c[1] - 0.02, -Z, wx1, W.c[1] + 0.02, -Z + 0.04);
    plane(g, basic("kiGlare", () => ({ map: glareTex(), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })), W.w, W.h, [o[0] + W.c[0], o[1] + W.c[1], o[2] - Z + 0.045], 0, 0, 0, true);
    rb.geo(cylY(0.06, 0.09, 12, false, 0.075), C("#c86a3a"), wx0 + 0.25, wy0, -Z + 0.08); for (let k = 0; k < 7; k++) rb.geo(new THREE.SphereGeometry(0.03, 8, 6), C(k % 3 ? "#e8304a" : "#3a8a3a"), wx0 + 0.25 + (hash(k) - 0.5) * 0.12, wy0 + 0.12 + hash(k + 4) * 0.08, -Z + 0.08 + (hash(k + 9) - 0.5) * 0.08);
    const gm = lam("si:kiGinghamR", () => ({ map: ginghamTex("kiGR", "#d83a3a"), side: THREE.DoubleSide }));
    for (const [x, w] of [[wx0 - 0.02, 0.36], [wx1 + 0.02, 0.36]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9).translate(0, -0.45, 0), gm); m.position.set(o[0] + x, o[1] + wy1 + 0.02, o[2] - Z + 0.11); m.castShadow = true; g.add(m); this.curtainsK.push(m); }
    rb.geo(new THREE.PlaneGeometry(W.w + 0.4, 0.2), gm, W.c[0], wy1 - 0.02, -Z + 0.12); rb.seg(C("#c9a14a"), [wx0 - 0.3, wy1 + 0.04, -Z + 0.1], [wx1 + 0.3, wy1 + 0.04, -Z + 0.1], 0.012);
    // counter run: mint base cabinets, cream top with a red edge, sink + faucet; upper cabinets; a round fridge at left
    const cabF = TM("kiCabF", () => cabTex("kiCabF", mint, 6)), cabU = TM("kiCabU", () => cabTex("kiCabU", mint, 3));
    rb.box(C(mint), -2.1, 0.1, -Z, X, 0.88, -1.93); rb.panel(cabF, X + 2.1, 0.76, (X - 2.1) / 2, 0.49, -1.925);
    rb.box(C("#f4ead2"), -2.12, 0.88, -Z, X, 0.93, -1.88); rb.box(C("#d8483a"), -2.12, 0.88, -1.9, X, 0.93, -1.87);
    rb.box(C("#b8c0c8"), W.c[0] - 0.35, 0.86, -2.4, W.c[0] + 0.35, 0.935, -2.0); rb.seg(chrome, [W.c[0], 0.93, -2.42], [W.c[0], 1.18, -2.42], 0.02); rb.seg(chrome, [W.c[0], 1.18, -2.42], [W.c[0], 1.16, -2.2], 0.018);
    for (const [x0, x1] of [[-2.1, -0.75], [1.35, X]]) { rb.box(C(mint), x0, 1.55, -Z, x1, 2.38, -2.16); rb.panel(cabU, x1 - x0, 0.8, (x0 + x1) / 2, 1.965, -2.155); }
    rb.geo(new THREE.CapsuleGeometry(0.36, 1.0, 6, 16), C("#f2ecd8"), -2.55, 0.86, -2.05, 0, 0, 0, [1, 1, 0.9]);
    // fix r2 (A2 P3 #35): the near-black slot between the upper cabinet and the curtain becomes a warm wooden window casing
    rb.box(C("#8a5a3a"), -0.75, 1.5, -Z, -0.58, 2.42, -2.36); rb.box(C("#c8ccd0"), -2.33, 0.95, -1.75, -2.29, 1.25, -1.71);
    // counter clutter: radio, fruit bowl, canisters, a red kettle, a bread board; a kitchen clock over the window
    // fix r1 (A1 P2): the radio + fruit bowl moved INSIDE the shot-11 frame (either side of the bottle on the counter)
    rb.box(C("#f2e2c4"), -1.1, 0.93, -2.38, -0.74, 1.15, -2.2); rb.panel(faceMat("kiRadio", radioTex, 0.9), 0.34, 0.2, -0.92, 1.04, -2.195);
    this.radioDial = bulb(g, [o[0] - 0.84, o[1] + 1.075, o[2] - 2.19], 0.012, "#ffcf7a", 2.4, 0.12, 0.3).s;
    rb.seg(C("#c8ccd0"), [-0.8, 1.15, -2.3], [-0.68, 1.42, -2.32], 0.004, false, 4);
    rb.geo(new THREE.SphereGeometry(0.16, 20, 8, 0, TAU, Math.PI / 2, Math.PI / 2).translate(0, 0.16, 0), lam("si:kiBowlW", () => ({ color: "#f4f0e6", side: THREE.DoubleSide })), -0.12, 0.93, -2.24);
    for (let k = 0; k < 7; k++) rb.geo(new THREE.SphereGeometry(0.045, 12, 8), C(["#f08a2a", "#d8303a", "#f6c83a", "#8ac040"][k % 4]), -0.12 + (hash(k) - 0.5) * 0.18, 1.0 + hash(k + 2) * 0.06, -2.24 + (hash(k + 5) - 0.5) * 0.16);
    rb.geo(new THREE.TorusGeometry(0.09, 0.022, 8, 18, Math.PI * 0.9), C("#f2d23a"), -0.08, 1.06, -2.22, 0.3, 0, 2.5);
    // a utensil rail on the backsplash (ladle, whisk, a small copper pan) where the stray shadow smudges were (A1 P3)
    // fix r2 (A2 P3 #35: the copper pan sat right behind the bottle neck): the rail moved 0.3 m left, off the neck line
    rb.seg(C("#c8ccd0"), [-1.42, 1.44, -2.47], [-0.8, 1.44, -2.47], 0.008);
    for (const [x, kind] of [[-1.3, 0], [-1.12, 1], [-0.92, 2]] as number[][]) {
      rb.seg(C("#c8ccd0"), [x, 1.44, -2.465], [x, 1.4, -2.46], 0.004, false, 4);
      if (kind === 0) { rb.seg(C("#d8dce2"), [x, 1.4, -2.46], [x, 1.2, -2.455], 0.007); rb.geo(new THREE.SphereGeometry(0.04, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), C("#d8dce2"), x, 1.2, -2.44); }
      else if (kind === 1) { rb.seg(C("#8a5a32"), [x, 1.4, -2.46], [x, 1.31, -2.455], 0.009); for (let k = 0; k < 4; k++) rb.geo(new THREE.TorusGeometry(0.03, 0.002, 4, 14).scale(0.6, 1.6, 1), C("#d8dce2"), x, 1.24, -2.45, k * 0.8); }
      else { rb.seg(C("#5a3a20"), [x, 1.4, -2.46], [x, 1.3, -2.455], 0.008); rb.geo(new THREE.CylinderGeometry(0.075, 0.07, 0.04, 20).rotateX(Math.PI / 2), C("#c8743a"), x, 1.22, -2.45); }
    }
    for (const [x, c] of [[1.6, "#d8483a"], [1.82, "#f4f0e6"], [2.02, "#d8483a"]] as [number, string][]) { rb.geo(cylY(0.07, 0.2, 18), C(c), x, 0.93, -2.3); rb.geo(cylY(0.072, 0.03, 18), C("#c8ccd0"), x, 1.13, -2.3); }
    rb.geo(new THREE.SphereGeometry(0.11, 18, 12), C("#d8483a"), 2.4, 1.04, -2.25, 0, 0, 0, [1, 0.85, 1]); rb.seg(C("#2a2a2a"), [2.32, 1.14, -2.25], [2.48, 1.14, -2.25], 0.012);
    rb.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32).rotateX(Math.PI / 2), C("#d8483a"), W.c[0], wy1 + 0.33, -Z + 0.03); rb.panel(faceMat("kiClock", () => clockFaceTex("kiClock", "#d8483a"), 0.92), 0.36, 0.36, W.c[0], wy1 + 0.33, -Z + 0.057);
    // the table: blue gingham cloth with a skirt, chrome legs; two chrome diner chairs with red seats
    const tb = KI.table, top = tb.top + 0.005, cloth = TM("kiGinghamRC2", () => ginghamTex("kiGRC2", "#c8452c", "#f4e6c8", 0.26, 0.48));   // fix r2: check contrast -20 %  // fix r1: red-cream (A1 P2)
    rb.box(cloth, -tb.w / 2 - 0.02, tb.top - 0.02, -tb.d / 2 - 0.02, tb.w / 2 + 0.02, top, tb.d / 2 + 0.02);
    const drape = TM("kiDrape3", drapeTex);
    for (const [x0, z0, x1, z1] of [[-tb.w / 2 - 0.02, tb.d / 2 + 0.01, tb.w / 2 + 0.02, tb.d / 2 + 0.025], [-tb.w / 2 - 0.02, -tb.d / 2 - 0.025, tb.w / 2 + 0.02, -tb.d / 2 - 0.01], [-tb.w / 2 - 0.025, -tb.d / 2, -tb.w / 2 - 0.01, tb.d / 2], [tb.w / 2 + 0.01, -tb.d / 2, tb.w / 2 + 0.025, tb.d / 2]])
      rb.box(z0 > 0 ? drape : cloth, x0, tb.top - 0.24, z0, x1, tb.top, z1);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rb.seg(chrome, [sx * (tb.w / 2 - 0.12), 0, sz * (tb.d / 2 - 0.12)], [sx * (tb.w / 2 - 0.12), tb.top - 0.24, sz * (tb.d / 2 - 0.12)], 0.02);
    for (const s of [-1, 1]) { const cx = s * 1.0; rb.box(C("#d83a3a"), cx - 0.22, 0.44, -0.22, cx + 0.22, 0.5, 0.22); rb.box(C("#d83a3a"), cx + s * 0.2 - 0.03, 0.55, -0.2, cx + s * 0.2 + 0.03, 0.92, 0.2);
      for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) rb.seg(chrome, [cx + a, 0, b], [cx + a, 0.44, b], 0.013); rb.seg(chrome, [cx + s * 0.2, 0.5, -0.18], [cx + s * 0.2, 0.92, -0.18], 0.012); rb.seg(chrome, [cx + s * 0.2, 0.5, 0.18], [cx + s * 0.2, 0.92, 0.18], 0.012); }
    // on the table: the salad bowl (lettuce, tomato, cucumber), two plates + forks, salt + pepper, daisies, a lemon half
    const wood = C("#a8703e");
    rb.geo(new THREE.SphereGeometry(0.16, 24, 10, 0, TAU, Math.PI / 2, Math.PI / 2).translate(0, 0.14, 0), lam("si:kiSalad", () => ({ color: "#a8703e", side: THREE.DoubleSide })), -0.22, top, -0.16, 0, 0, 0, [1, 0.85, 1]);
    rb.geo(cylY(0.07, 0.02, 16), wood, -0.22, top, -0.16);
    // fix r3 (A3 P3 #30: faceted green gems): ruffled leaf CARDS (3 greens, plum ink) fanned up out of the bowl, two tomato
    // wedges, three cucumber rounds (pale centre, dark rind)
    for (let k = 0; k < 13; k++) {
      const a = (k / 13) * TAU + hash(k) * 0.4, rr = 0.03 + 0.07 * hash(k + 1), lm = lam("si:kiLeafM" + (k % 3), () => ({ map: lettuceTex(k % 3), alphaTest: 0.4, side: THREE.DoubleSide }));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.14).translate(0, 0.06, 0), lm); m.position.set(o[0] - 0.22 + Math.cos(a) * rr, o[1] + top + 0.09 + 0.02 * hash(k + 2), o[2] - 0.16 + Math.sin(a) * rr * 0.9);
      m.rotation.set(-0.35 + 0.25 * (hash(k + 4) - 0.5), -a + Math.PI / 2, (hash(k + 5) - 0.5) * 0.9, "YXZ"); m.castShadow = true; m.receiveShadow = true; g.add(m); }
    for (let k = 0; k < 2; k++) rb.geo(new THREE.SphereGeometry(0.032, 14, 8, 0, Math.PI * 0.6, 0, Math.PI / 2), C("#e0302a"), -0.25 + k * 0.08, top + 0.15, -0.1 + k * 0.03, 0.6 + k * 2.1, -0.3, 0, [1, 1.1, 1]);
    for (let k = 0; k < 3; k++) { const x = -0.3 + k * 0.07, z = -0.2 + hash(k + 40) * 0.08; rb.geo(new THREE.CylinderGeometry(0.024, 0.024, 0.008, 18), C("#3a7a2a"), x, top + 0.16, z, 0, 0.5 * (hash(k) - 0.5), 0.35); rb.geo(new THREE.CylinderGeometry(0.019, 0.019, 0.009, 18), C("#d8eeb0"), x, top + 0.16, z, 0, 0.5 * (hash(k) - 0.5), 0.35); }
    for (const [x, z] of [[0.24, 0.33], [-0.3, 0.3]]) { rb.geo(cylY(0.12, 0.012, 32), C("#fbf8f0"), x, top, z); rb.geo(new THREE.TorusGeometry(0.105, 0.007, 6, 40).rotateX(Math.PI / 2), C("#3a7ad0"), x, top + 0.013, z);
      rb.box(chrome, x + 0.15, top, z - 0.08, x + 0.165, top + 0.006, z + 0.08); }
    rb.geo(new THREE.SphereGeometry(0.04, 14, 10, 0, TAU, 0, Math.PI / 2), C("#f6d84a"), 0.26, top + 0.012, 0.31); rb.geo(new THREE.CircleGeometry(0.036, 16).rotateX(-Math.PI / 2), C("#fbf0a0"), 0.26, top + 0.013, 0.31);
    // fix r1 (A1 P2): the blurred foreground is dressed: a folded napkin, a recipe card, two tomatoes, a fork on the plate
    rb.rbox(C("#f8f2e4"), 0.14, 0.012, 0.1, -0.03, top + 0.006, 0.37, 0.4); rb.rbox(C("#c8452c"), 0.14, 0.004, 0.02, -0.03, top + 0.014, 0.37, 0.4);
    rb.rbox(C("#fbf6e6"), 0.12, 0.002, 0.08, 0.12, top + 0.002, 0.4, -0.3); rb.rbox(C("#c8452c"), 0.1, 0.0025, 0.006, 0.12, top + 0.0035, 0.38, -0.3);
    for (const [x, z, r2] of [[0.33, 0.42, 0.034], [0.37, 0.37, 0.03]]) { rb.geo(new THREE.SphereGeometry(r2, 14, 10), C("#e0302a"), x, top + r2 * 0.9, z, 0, 0, 0, [1, 0.85, 1]); rb.geo(new THREE.CylinderGeometry(0.006, 0.004, 0.012, 6), C("#3a7a2a"), x, top + r2 * 1.75, z); }
    rb.box(C("#d8dce2"), 0.16, top + 0.014, 0.28, 0.17, top + 0.018, 0.4);
    // fix r2: a fork on the folded napkin, a bread roll, a little mustard pot (soft in the DOF), contact shadows
    { const fa = 1.85; rb.rbox(C("#d8dce2"), 0.012, 0.004, 0.16, -0.03, top + 0.016, 0.37, fa); for (let k = 0; k < 3; k++) rb.rbox(C("#d8dce2"), 0.004, 0.003, 0.04, -0.03 + (k - 1) * 0.008 * Math.cos(fa) - 0.07 * Math.sin(fa), top + 0.016, 0.37 - 0.07 * Math.cos(fa) - (k - 1) * 0.008 * Math.sin(fa), fa); }
    rb.geo(new THREE.SphereGeometry(0.055, 16, 10), C("#d89a52"), -0.27, top + 0.03, 0.34, 0.3, 0, 0, [1.35, 0.7, 1]); rb.geo(new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI).rotateX(-Math.PI / 2), C("#b8783a"), -0.27, top + 0.062, 0.34, 0.3);
    rb.geo(cylY(0.03, 0.055, 16), C("#f2ecd8"), 0.5, top, 0.3); rb.geo(cylY(0.026, 0.01, 16), C("#e8b82a"), 0.5, top + 0.055, 0.3); rb.seg(C("#c8a070"), [0.5, top + 0.05, 0.3], [0.52, top + 0.12, 0.31], 0.004);
    for (const [x, z, w2] of [[-0.27, 0.34, 0.2], [0.5, 0.3, 0.1], [-0.03, 0.37, 0.2]] as number[][]) contact(g, [o[0] + x, o[1] + top + 0.0025, o[2] + z], w2, w2 * 0.7, 0.35);
    rb.geo(cylY(0.035, 0.07, 14), basic("kiJam", () => ({ color: new THREE.Color(0.75, 0.2, 0.28), transparent: true, opacity: 0.85 })), wx1 - 0.25, wy0, -Z + 0.08); rb.geo(cylY(0.037, 0.015, 14), C("#d8483a"), wx1 - 0.25, wy0 + 0.07, -Z + 0.08);
    rb.geo(new THREE.SphereGeometry(0.035, 12, 8), C("#e0302a"), wx1 - 0.13, wy0 + 0.032, -Z + 0.08, 0, 0, 0, [1, 0.85, 1]);
    for (const [x, c] of [[0.18, "#f4f4f4"], [0.235, "#3a3a3a"]] as [number, string][]) { rb.geo(cylY(0.02, 0.07, 14), basic("kiShaker" + c, () => ({ color: new THREE.Color(0.85, 0.9, 0.92), transparent: true, opacity: 0.55 })), x, top, -0.12); rb.geo(cylY(0.017, 0.045, 10), C(c), x, top + 0.003, -0.12); rb.geo(new THREE.SphereGeometry(0.021, 10, 6, 0, TAU, 0, Math.PI / 2), chrome, x, top + 0.07, -0.12); }
    rb.geo(cylY(0.03, 0.1, 14, false, 0.04), C("#5aa0d8"), 0.5, top, -0.3); for (let k = 0; k < 5; k++) { const a = k * 1.3; rb.seg(C("#4a8a3a"), [0.5, top + 0.08, -0.3], [0.5 + Math.cos(a) * 0.05, top + 0.2 + hash(k) * 0.05, -0.3 + Math.sin(a) * 0.05], 0.003); rb.geo(new THREE.CircleGeometry(0.022, 10), C("#fbfaf0"), 0.5 + Math.cos(a) * 0.05, top + 0.2 + hash(k) * 0.05, -0.3 + Math.sin(a) * 0.05, -0.5, -0.3); }
    // the dressing bottle: a lathe of thick glass, the two-layer liquid (shader), a cork, twine at the neck
    const bt = KI.bottle, B: [number, number][] = [[0.0, 0.0], [0.052, 0.0], [0.059, 0.006], [0.061, 0.025], [0.061, 0.205], [0.058, 0.228], [0.046, 0.255], [0.03, 0.278], [0.022, 0.296], [0.021, 0.33], [0.0255, 0.334], [0.0255, 0.345], [0.02, 0.348]];
    const Lq: [number, number][] = [[0.0, 0.008], [0.055, 0.008], [0.0575, 0.016], [0.0575, 0.2], [0.0, 0.2]];
    this.bottle.position.set(o[0] + bt.c[0], o[1] + top, o[2] + bt.c[2]); g.add(this.bottle);
    this.liquid = liquidMat();
    const liq = new THREE.Mesh(new THREE.LatheGeometry(Lq.map(([r2, y]) => new THREE.Vector2(r2, y)), 48), this.liquid); liq.castShadow = true; liq.layers.set(NOINK); this.bottle.add(liq);  // fix r1: no ink on the liquid (it read as a separate glass of juice); the glass carries the silhouette
    const glass = new THREE.Mesh(new THREE.LatheGeometry(B.map(([r2, y]) => new THREE.Vector2(r2, y)), 48), this.glassM); glass.renderOrder = 3; glass.layers.set(NOINK); glass.castShadow = true; this.bottle.add(glass);
    // fix r3 (A3 P2 shot 11: the glass above the liquid vanished, the cork floated): a 3-4 px plum ink line along BOTH
    // silhouette edges of the shoulders + neck + body (two thin tubes on the profile, turned to face the lens every frame
    // in poseKitchen), the cork seated 9 mm deeper in the mouth, a plain label (no words) low on the body
    { const pts = B.slice(2).map(([r2, y]) => new THREE.Vector3(r2 + 0.0007, y, 0)), crv = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const im = basic("kiGlassInk", () => ({ color: new THREE.Color("#2a1a26"), transparent: true, opacity: 0.72, depthWrite: false }));
      for (const sx of [1, -1]) { const tube = new THREE.Mesh(new THREE.TubeGeometry(crv, 60, 0.00075, 6, false), im); tube.scale.x = sx; tube.renderOrder = 5; tube.layers.set(NOINK); this.botInk.add(tube); }
      this.bottle.add(this.botInk);
      const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0618, 0.0618, 0.06, 32, 1, true, -0.95, 1.9), lam("si:kiLabel3", () => ({ map: bottleLabelTex() })));
      lab.position.y = 0.062; lab.receiveShadow = true; this.bottle.add(lab); }
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.0225, 0.0185, 0.046, 16).translate(0, 0.327, 0), lam("si:kiCork", () => ({ map: tx("kiCork", 128, 64, (g2, r) => { g2.fillStyle = "#c89a62"; g2.fillRect(0, 0, 128, 64); speck(g2, r, 128, 64, 300, ["#8a6a3a", "#e8c08a"], 1, 3, 0.7); }) })));
    cork.castShadow = true; this.bottle.add(cork);
    const twine = new THREE.Mesh(new THREE.TorusGeometry(0.0225, 0.0025, 6, 20).rotateX(Math.PI / 2), C("#8a6440")); twine.position.y = 0.318; this.bottle.add(twine);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0036, 8, 28).rotateX(Math.PI / 2), basic("kiLip", () => ({ color: new THREE.Color(0.3, 0.42, 0.42) }))); lip.position.y = 0.339; lip.layers.set(NOINK); this.bottle.add(lip);
    // fix r1 (A1 P2): a soft violet-plum bottle shadow (~1.5x the bottle width) across the cloth to the left, toward the
    // lens, + a contact ring under the base (they follow the shake)
    this.botShadow = contact(g, [o[0] + bt.c[0] + KI_SH[0] * 0.24, o[1] + top + 0.002, o[2] + bt.c[2] + KI_SH[1] * 0.24], 0.5, 0.16, 0.42, KI_SHA);
    // fix r3: the ruby -> gold light through the dressing inside that shadow (additive, follows the shake)
    this.botTint = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.1).translate(0.23, 0, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bottleTintTex(), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.botTint.rotation.y = Math.atan2(-KI_SH[1], KI_SH[0]); this.botTint.layers.set(NOINK); this.botTint.renderOrder = 3; g.add(this.botTint);
    // the golden caustic the sun throws through the oil: an additive dappled patch inside the shadow (dims while cloudy)
    { const ct = tx("kiCaustic", 128, 128, (g2, r) => { g2.clearRect(0, 0, 128, 128); for (let i = 0; i < 26; i++) { const a = r() * TAU, d = r() * 40, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d * 0.7, rr = 5 + r() * 9;
        const gr = g2.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,200,90,0.9)"); gr.addColorStop(1, "rgba(255,200,90,0)"); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, rr, 0, TAU); g2.fill(); }
        const m2 = g2.createRadialGradient(64, 64, 20, 64, 64, 64); m2.addColorStop(0, "rgba(0,0,0,0)"); m2.addColorStop(1, "rgba(0,0,0,1)"); g2.globalCompositeOperation = "destination-out"; g2.fillStyle = m2; g2.fillRect(0, 0, 128, 128); g2.globalCompositeOperation = "source-over"; }, true);
      this.caustic = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.13).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -3 }));
      this.caustic.layers.set(NOINK); this.caustic.renderOrder = 3; g.add(this.caustic); }
    this.botContact = contact(g, [o[0] + bt.c[0], o[1] + top + 0.0025, o[2] + bt.c[2]], 0.15, 0.15, 0.5);
    // fix r3 (A3 P2 shot 11): two soft additive sun shafts from the low camera-right sun (KEY_KITCHEN) down across the
    // table toward the back-left (~15 % at their core), motes drifting in them
    this.addShaft(g, [o[0] + 1.75, o[1] + 2.0, o[2] + 1.35], [-0.7, -0.5, -0.52], 3.4, 0.8, new THREE.Color(0.2, 0.15, 0.065), 0.7);
    this.addShaft(g, [o[0] + 1.9, o[1] + 1.95, o[2] + 1.0], [-0.7, -0.5, -0.52], 3.2, 0.45, new THREE.Color(0.13, 0.095, 0.04), 2.6);
    this.kiMotes = new Motes(g, 70, 21, KI.base, [-0.45, 0.82, -0.6], [0.55, 1.55, 0.3], new THREE.Color(0.95, 0.8, 0.48), 0.007, 0.04);
    // fix r3 (CHAR P2 / ADD #56): a red kettle on the counter right of the window with a looping steam wisp (the
    // ambience simmer has a source)
    { const kx = KETTLE[0], kz = KETTLE[2]; rb.geo(new THREE.SphereGeometry(0.1, 20, 12), C("#d83a2e"), kx, 0.93 + 0.085, kz, 0, 0, 0, [1, 0.82, 1]);
      rb.geo(cylY(0.07, 0.02, 18), C("#c8ccd0"), kx, 0.93 + 0.16, kz); rb.geo(new THREE.SphereGeometry(0.018, 10, 8), C("#1e1a1e"), kx, 0.93 + 0.185, kz);
      rb.seg(C("#d83a2e"), [kx - 0.08, 0.93 + 0.06, kz + 0.02], [kx - 0.15, 0.93 + 0.13, kz + 0.04], 0.012);
      rb.geo(new THREE.TorusGeometry(0.075, 0.01, 6, 20, Math.PI), C("#1e1a1e"), kx, 0.93 + 0.19, kz, 0);
      contact(g, [o[0] + kx, o[1] + 0.932, o[2] + kz], 0.26, 0.2, 0.35);
      const stT = tx("kiSteam3", 64, 256, (g2) => { g2.clearRect(0, 0, 64, 256); for (let y = 0; y < 256; y++) { const a = Math.sin((y / 256) * Math.PI) * 0.6, x = 32 + Math.sin(y * 0.05) * 10; const gr = g2.createRadialGradient(x, y, 0, x, y, 10); gr.addColorStop(0, `rgba(255,255,255,${a * 0.3})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g2.fillStyle = gr; g2.fillRect(x - 11, y, 22, 1); } }, true);
      for (let k = 0; k < 3; k++) this.kiSteam.push(plane(g, new THREE.MeshBasicMaterial({ map: stT, transparent: true, depthWrite: false, opacity: 0.9 }), 0.08, 0.3, [o[0] + kx - 0.15, o[1] + 1.12, o[2] + kz + 0.04], 0, 0, 0, true)); }
    // life outside the window (A1 P1): a sparrow hopping along the picket fence, a sheet billowing on a washing line
    this.sparrow = plane(g, basic("kiSparrowM", () => ({ map: sparrowTex(0), alphaTest: 0.4 })), 0.105, 0.075, [o[0] - 0.1, o[1] + 1.47, o[2] - Z + 0.016], 0, 0, 0, true);   // fix r3 (ADD #59): 1.5x
    { const sg = new THREE.PlaneGeometry(0.22, 0.17, 8, 4).translate(0, -0.085, 0); this.sheet = new THREE.Mesh(sg, basic("kiSheet", () => ({ color: new THREE.Color("#f6f2ea"), side: THREE.DoubleSide })));
      this.sheet.position.set(o[0] + 0.06, o[1] + 1.78, o[2] - Z + 0.014); this.sheet.layers.set(NOINK); g.add(this.sheet); this.sheetBase = Float32Array.from((sg.attributes.position as THREE.BufferAttribute).array as Float32Array);
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.004), basic("kiLine", () => ({ color: new THREE.Color("#5a5a5a") }))); ln.position.set(o[0] + 0.3, o[1] + 1.785, o[2] - Z + 0.013); ln.layers.set(NOINK); g.add(ln); }
    // a cat clock on the wall left of the window: its tail swings, its eyes tick side to side
    { const cx = -0.58, cy = 1.5, cz = -Z + 0.012; plane(g, faceMat("kiCat", catClockTex, 0.95), 0.2, 0.3, [o[0] + cx, o[1] + cy, o[2] + cz]);
      this.catTail = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.15).translate(0, -0.075, 0), basic("kiCatTail", () => ({ color: new THREE.Color("#1e1a22") })));
      this.catTail.position.set(o[0] + cx, o[1] + cy - 0.13, o[2] + cz + 0.002); this.catTail.layers.set(NOINK); g.add(this.catTail); }
    rb.done(g);
  }

  // ================================================================================================ PUMP ROOM
  private buildPump() {
    const o = PR.base, g = this.pump, rb = new RB(o), X = PR.room.w / 2, Z = PR.room.d / 2, H = PR.room.h, py = PR.pipe.y, pz = PR.pipe.z;
    const block = TM("prBlock", blockTex), steel = TM("prSteel", prSteelTex), copper = C("#b8723a"), blueS = C("#6f8296"), green = C("#4f7a5a"), iron = C("#5a5e64"), red = C("#c4302a");
    // fix r2 (A2 P2 #23: the floor was a flat electric-blue wash, C* 60-65): a warmer, darker concrete albedo, so the royal
    // blue shade lands near C* 35-40 and the new warm floor pools read amber
    rb.flatY(TM("prFloor2", () => concreteTex("prFloor2", "#74665a")), -X, X, -Z, Z, 0, 1, 3, 3);
    rb.flatY(C("#3a3a42"), -X, X, -Z, Z, H, -1, 2, 2);
    rb.wallZ(block, -X, X, 0, H, -Z, 1, 2, 5); rb.wallZ(block, -X, X, 0, H, Z, -1, 2, 5); rb.wallX(block, -Z, Z, 0, H, -X, 1, 2, 5); rb.wallX(block, -Z, Z, 0, H, X, -1, 2, 5);
    for (const z of [-3.2, -0.6, 2.0]) { rb.box(C("#4a4a52"), -X, H - 0.3, z - 0.08, X, H, z + 0.08); rb.box(C("#4a4a52"), -X, H - 0.32, z - 0.16, X, H - 0.3, z + 0.16); }
    rb.box(C("#d8b040"), -X, 0.002, -2.15, X, 0.006, -2.05, false);
    rb.box(C("#2a2a2e"), 0.1, 0.002, -1.7, 0.9, 0.008, -1.3, false); for (let k = 0; k < 8; k++) rb.box(C("#141418"), 0.14 + k * 0.1, 0.008, -1.66, 0.18 + k * 0.1, 0.01, -1.34, false);
    for (const [x, z, s] of [[-1.0, -1.2, 1.0], [2.2, -0.6, 0.7], [-3.6, 0.6, 0.8]]) rb.geo(new THREE.CircleGeometry(0.5 * s, 24).rotateX(-Math.PI / 2), C("#1e2a44"), x, 0.004, z, 0, 0, 0, [1.6, 1, 1], false);
    // the three tank walls (riveted steel, base band, manhole, stencil letter, sight glass) + COUNTED plates
    const uvS = (geo: THREE.BufferGeometry, su: number, sv: number) => { const a = geo.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); return geo; };
    PR.tanks.forEach((t, i) => {
      rb.geo(uvS(new THREE.CylinderGeometry(PR.tankR, PR.tankR, H, 48, 1, true).translate(0, H / 2, 0), 3, 2), steel, t[0], 0, t[2]);
      rb.geo(new THREE.CylinderGeometry(PR.tankR + 0.03, PR.tankR + 0.03, 0.32, 48, 1, true).translate(0, 0.16, 0), C("#6a6a66"), t[0], 0, t[2]);
      const fz = t[2] + PR.tankR;
      rb.geo(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 24).rotateX(Math.PI / 2), C("#a8a090"), t[0] - 0.55, 0.85, fz - 0.08 + 0.02);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; rb.geo(new THREE.SphereGeometry(0.022, 6, 4), C("#7a7468"), t[0] - 0.55 + Math.cos(a) * 0.28, 0.85 + Math.sin(a) * 0.28, fz - 0.02); }
      rb.panel(lam("si:prSt" + i, () => ({ map: stencilTex("ABC"[i]), alphaTest: 0.4, transparent: false })), 0.8, 0.8, t[0], 3.75, fz + 0.005);
      const sx = t[0] + 0.78, sz = t[2] + Math.sqrt(PR.tankR ** 2 - 0.78 ** 2) + 0.12;
      for (const y of [0.55, 2.45]) rb.box(iron, sx - 0.06, y - 0.03, sz - 0.12, sx + 0.06, y + 0.03, sz);
      const gl = new THREE.Mesh(cylY(0.045, 1.9, 14, true), basic("prSightG", () => ({ color: new THREE.Color(0.7, 0.85, 0.95), transparent: true, opacity: 0.3, depthWrite: false }))); gl.position.set(o[0] + sx, o[1] + 0.55, o[2] + sz); gl.layers.set(NOINK); g.add(gl);
      const fillM = new THREE.Mesh(cylY(0.03, 1, 12), basic("prSightO", () => ({ color: glowCol("#ffb52a", 1.15) }))); fillM.position.set(o[0] + sx, o[1] + 0.56, o[2] + sz); fillM.layers.set(NOINK); g.add(fillM); this.sights.push({ m: fillM, i });
      const c = PR.counters[i], cw = PR.counter.w, chh = PR.counter.h;
      rb.box(C("#2a2a2a"), c[0] - cw / 2 - 0.04, c[1] - chh / 2 - 0.04, c[2] - 0.12, c[0] + cw / 2 + 0.04, c[1] + chh / 2 + 0.04, c[2] - 0.005);
      const dash = plane(g, faceMat("prC-", () => countedTex("-"), 0.86), cw, chh, [o[0] + c[0], o[1] + c[1], o[2] + c[2] + 0.002]);
      const num = plane(g, faceMat("prC" + (i + 1), () => countedTex(String(i + 1)), 0.9), cw, chh, [o[0] + c[0], o[1] + c[1], o[2] + c[2] + 0.004]);
      this.plates.push({ dash, n: num, base: num.position.clone() });
      rb.seg(iron, [t[0], py, pz], [t[0], py, fz - 0.05], 0.12); rb.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20).rotateX(Math.PI / 2), iron, t[0], py, fz - 0.02);
    });
    // the main pipe (the blob's ride): steel / copper runs, flanges, two GLASS sections with the gold slug inside
    const runs: [number, number, THREE.Material][] = [[-X + 0.1, -2.45, iron], [-0.55, 0.55, copper], [2.45, X - 0.1, iron]];
    for (const [a, b, m] of runs) rb.seg(m, [a, py, pz], [b, py, pz], 0.15);
    for (const x of [-2.45, -0.55, 0.55, 2.45, -4.6, 4.6]) rb.geo(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 22).rotateZ(Math.PI / 2), C("#4a4e54"), x, py, pz);
    const glassM = basic("prGlass", () => ({ color: new THREE.Color(0.6, 0.78, 0.95), transparent: true, opacity: 0.16, depthWrite: false }));
    for (const [a, b] of [[-2.45, -0.55], [0.55, 2.45]]) {
      const gm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, b - a, 20, 1, true).rotateZ(Math.PI / 2), glassM); gm2.position.set(o[0] + (a + b) / 2, o[1] + py, o[2] + pz); gm2.layers.set(NOINK); gm2.renderOrder = 3; g.add(gm2);
      // fix r1 (A1 P2): the oil in the glass is the hero gold (#F2B62E) with a highlight scrolling along it at ~0.6 m/s
      // and emits ~1.2 (glints); it brightens while the blob / a slug passes through this section
      const fm = pipeOilMat(); this.pipeOil.push({ m: fm, x0: a, x1: b });
      const film = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, b - a - 0.06, 20).rotateZ(Math.PI / 2), fm); film.position.set(o[0] + (a + b) / 2, o[1] + py - 0.06, o[2] + pz); film.scale.set(1, 0.45, 1); film.layers.set(NOINK); g.add(film);
      const slug = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 1, 18).rotateZ(Math.PI / 2), basic("prSlug", () => ({ color: glowCol("#f2b62e", 1.6) }))); slug.layers.set(NOINK); g.add(slug); this.slugs.push({ m: slug, x0: a + 0.04, x1: b - 0.04 });
      plane(g, basic("prGlassGl", () => ({ map: glareTex(), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })), b - a, 0.26, [o[0] + (a + b) / 2, o[1] + py, o[2] + pz + 0.16], 0, 0, 0, true);
    }
    // the valve wheels the workers turn (big, red) + valve bodies; smaller wheels on the upper runs
    // fix r2 (A2 LEAD: PR.valves y 0.62): the wheel centre sits at (x, y + 0.42, z) = CHAR's rim (top ~1.29 m, under the
    // blob's feet at 1.42); a valve body hangs off the main pipe's front-bottom, a short stem carries the wheel, a drop
    // pipe runs down into a new LOWER pipe run (y 0.45) along the back
    rb.seg(green, [-3.7, 0.45, -3.47], [3.95, 0.45, -3.47], 0.075);
    for (const x of [-3.7, 3.95]) { rb.geo(new THREE.TorusGeometry(0.16, 0.075, 8, 12, Math.PI / 2), green, x + (x < 0 ? 0.16 : -0.16), 0.29, -3.47, 0, 0, x < 0 ? Math.PI / 2 : 0); rb.seg(green, [x, 0.0, -3.47], [x, 0.29, -3.47], 0.075); }
    for (let x = -2.9; x < 3.9; x += 1.6) rb.geo(new THREE.CylinderGeometry(0.115, 0.115, 0.045, 16).rotateZ(Math.PI / 2), C("#4a4e54"), x, 0.45, -3.47);
    for (const v of PR.valves) {
      const wy = v[1] + 0.42, wz = v[2];
      rb.box(C("#7a3a2a"), v[0] - 0.11, wy - 0.1, -3.5, v[0] + 0.11, wy + 0.1, wz - 0.06); rb.seg(iron, [v[0], wy, wz - 0.07], [v[0], wy, wz - 0.005], 0.024);
      rb.seg(iron, [v[0], 0.45, -3.47], [v[0], wy - 0.1, -3.47], 0.055); rb.geo(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 14), C("#4a4e54"), v[0], 0.6, -3.47);
      for (const sx of [-1, 1]) rb.geo(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8).rotateX(Math.PI / 2), C("#c8a030"), v[0] + sx * 0.08, wy + 0.07, wz - 0.06);
      const wg = new THREE.Group(); wg.position.set(o[0] + v[0], o[1] + wy, o[2] + wz); g.add(wg); this.wheels.push(wg);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 8, 32), red); rim.castShadow = true; wg.add(rim);
      for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.026, 0.026), red); sp.rotation.z = (k / 4) * Math.PI; wg.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12).rotateX(Math.PI / 2), C("#3a3a3a")); wg.add(hub);
    }
    // the upper runs (copper / steel-blue / green), side-wall runs, verticals, elbows into the tanks, flanges, wheels
    const ups: [number, number, number, THREE.Material][] = [[2.0, -3.95, 0.09, copper], [3.3, -3.85, 0.12, blueS], [4.4, -3.7, 0.08, green], [0.55, -3.95, 0.07, green]];
    for (const [y, z, r2, m] of ups) { rb.seg(m, [-X + 0.05, y, z], [X - 0.05, y, z], r2); for (let x = -5.6; x < 6; x += 1.6) rb.geo(new THREE.CylinderGeometry(r2 + 0.045, r2 + 0.045, 0.05, 16).rotateZ(Math.PI / 2), C("#4a4e54"), x + hash(y * 10 + x) * 0.3, y, z); }
    for (const t of PR.tanks) { rb.seg(copper, [t[0] + 0.45, 2.0, -3.95], [t[0] + 0.45, 2.0, t[2] + PR.tankR - 0.05], 0.07); rb.seg(blueS, [t[0] - 0.4, 3.3, -3.85], [t[0] - 0.4, 3.3, t[2] + PR.tankR - 0.05], 0.09); }
    for (const [x, m, r2] of [[-6.2, blueS, 0.1], [-5.85, copper, 0.08], [4.55, green, 0.09], [6.15, iron, 0.11]] as [number, THREE.Material, number][]) rb.seg(m, [x, 0, -4.25], [x, H, -4.25], r2);
    for (const y of [1.0, 2.6]) { rb.seg(blueS, [-X + 0.15, y, -Z + 0.2], [-X + 0.15, y, Z - 0.2], 0.08); rb.seg(copper, [X - 0.15, y + 0.3, -Z + 0.2], [X - 0.15, y + 0.3, Z - 0.2], 0.07); }
    for (const [x, y, z, r2] of [[-1.4, 2.0, -3.75, 0.11], [3.9, 3.3, -3.62, 0.12], [-4.1, 4.4, -3.55, 0.1], [1.3, 0.55, -3.8, 0.09]]) { rb.geo(new THREE.TorusGeometry(r2, 0.016, 6, 24), red, x, y + 0.2, z); rb.seg(iron, [x, y, z - 0.05], [x, y + 0.2, z], 0.02); }
    // gauges (dial faces + needle pivots) on short stems
    const gauge = (x: number, y: number, z: number, tank: number, s = 0.2) => {
      rb.seg(iron, [x, y - 0.25, z - 0.05], [x, y, z - 0.05], 0.02); rb.geo(new THREE.CylinderGeometry(s / 2 + 0.015, s / 2 + 0.015, 0.05, 24).rotateX(Math.PI / 2), C("#2a2a2a"), x, y, z - 0.03);
      plane(g, faceMat("prGauge", gaugeTex, 0.8), s, s, [o[0] + x, o[1] + y, o[2] + z]);
      const piv = new THREE.Group(); piv.position.set(o[0] + x, o[1] + y, o[2] + z + 0.004); g.add(piv);
      const nd = new THREE.Mesh(new THREE.BoxGeometry(0.006, s * 0.42, 0.003).translate(0, s * 0.19, 0), basic("prNeedle", () => ({ color: new THREE.Color("#a01a14") }))); nd.layers.set(NOINK); piv.add(nd);
      this.needles.push({ m: piv, base: 0.6 + hash(x * 3 + y) * 0.6, amp: 0.05 + hash(x + y * 7) * 0.08, ph: hash(x * 11) * TAU, tank: tank });
    };
    PR.tanks.forEach((t, i) => gauge(t[0] + 0.55, py + 0.5, pz + 0.1, i));
    gauge(-1.0, 2.35, -3.85, -1, 0.17); gauge(4.1, 3.62, -3.72, -1, 0.17); gauge(-5.3, 1.35, -3.9, -1, 0.17);
    // the two caged work lamps (they sway a hair), the calendar + its little caged lamp
    PR.lamps.forEach((l, i) => {
      const lg = new THREE.Group(); lg.position.set(o[0] + l[0], o[1] + H, o[2] + l[2]); g.add(lg); this.lampsP.push({ g: lg, ph: i * 1.9 });
      const dy = l[1] - H;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, -dy, 6).translate(0, dy / 2, 0), C("#141414")); lg.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 24, 1, true).translate(0, dy - 0.04, 0), lam("si:prShade", () => ({ color: "#2e4a3a", side: THREE.FrontSide }))); shade.castShadow = true; lg.add(shade);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.255, 0.2, 24, 1, true).translate(0, dy - 0.04, 0), new THREE.MeshBasicMaterial({ color: glowCol("#fff2d8", 1.6), side: THREE.BackSide })); inner.layers.set(NOINK); lg.add(inner);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 4).translate(0, dy - 0.2, 0), C("#2a2a2a")); w.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08); lg.add(w); }
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10).translate(0, dy - 0.17, 0), new THREE.MeshBasicMaterial({ color: glowCol("#ffcf86", 6) })); b.layers.set(NOINK); lg.add(b);
      const hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: glowCol("#ffb860", 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hs.position.set(0, dy - 0.17, 0); hs.scale.setScalar(1.3); hs.layers.set(NOINK); hs.renderOrder = 6; lg.add(hs);
      this.addShaft(g, [o[0] + l[0], o[1] + l[1] - 0.25, o[2] + l[2]], [-0.08, -1, -0.25], 3.4, 2.0, new THREE.Color(0.2, 0.12, 0.04), i * 2.3);
    });
    const cal = PR.calendar, CW = 1.05, CH = 1.06;
    const cx = -4.92;
    plane(g, faceMat("prCal", calendarTex, 0.85), CW, CH, [o[0] + cx, o[1] + 2.66, o[2] + cal.c[2] + 0.02]);
    rb.geo(new THREE.SphereGeometry(0.02, 8, 6), C("#888"), cx, 2.66 + CH / 2 - 0.02, cal.c[2] + 0.03);
    const lx = cx - 0.72; rb.box(C("#2a2a2a"), lx - 0.07, 3.0, -Z, lx + 0.07, 3.06, -Z + 0.14); bulb(g, [o[0] + lx, o[1] + 2.95, o[2] - Z + 0.16], 0.04, "#ffd08a", 5, 0.7, 0.35);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; rb.seg(C("#2a2a2a"), [lx, 3.0, -Z + 0.16], [lx + Math.cos(a) * 0.06, 2.88, -Z + 0.16 + Math.sin(a) * 0.06], 0.004, false, 4); }
    // the workbench (right): pegboard of tools, toolbox, thermos, lunch box, a hard hat, a mug; oil drums + a pallet (left)
    rb.box(C("#6a4a2e"), 4.5, 0.88, -Z, 6.35, 0.94, -3.75); for (const x of [4.56, 6.29]) rb.box(iron, x - 0.04, 0, -Z + 0.05, x + 0.04, 0.88, -3.8);
    rb.panel(TM("prPeg", pegboardTex), 1.8, 1.12, 5.42, 1.7, -Z + 0.01);
    rb.box(red, 4.7, 0.94, -4.3, 5.2, 1.16, -4.0); rb.seg(C("#2a2a2a"), [4.8, 1.22, -4.15], [5.1, 1.22, -4.15], 0.012);
    rb.geo(cylY(0.055, 0.3, 16), C("#c4302a"), 5.4, 0.94, -4.1); rb.geo(cylY(0.05, 0.06, 16), C("#d8d8d8"), 5.4, 1.24, -4.1);
    rb.box(C("#1e1e22"), 5.62, 0.94, -4.3, 5.98, 1.12, -4.08); rb.geo(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(0), C("#1e1e22"), 5.8, 1.12, -4.19);
    rb.geo(new THREE.SphereGeometry(0.15, 18, 10, 0, TAU, 0, Math.PI / 2), C("#f2c22a"), 6.1, 0.95, -3.95, 0, 0, 0, [1, 0.8, 1.1]); rb.geo(cylY(0.2, 0.012, 20), C("#f2c22a"), 6.1, 0.94, -3.95, 0, 0, 0, [1, 1, 1.15]);
    rb.geo(cylY(0.04, 0.1, 14, true), C("#e8e4d8"), 4.95, 0.94, -3.88);
    for (const [x, z, c] of [[-4.95, -2.75, "#2f5a8a"], [-4.35, -2.95, "#c4302a"], [-4.65, -3.45, "#2f5a8a"]] as [number, number, string][]) { rb.geo(cylY(0.29, 0.88, 22), C(c), x, 0.12, z); for (const y of [0.4, 0.72]) rb.geo(new THREE.TorusGeometry(0.29, 0.015, 6, 28).rotateX(Math.PI / 2), C("#1e2a3a"), x, y, z); rb.geo(cylY(0.27, 0.01, 22), C("#3a3a3e"), x, 1.0, z); }
    rb.box(C("#8a6a42"), -5.35, 0, -3.85, -3.95, 0.12, -2.35);
    // dust in the lamp cones + a few moths round the bulbs
    // ---- fix r1 (A1 P1 / P2 shot 13): NIGHT + a real pipe jungle + the night-shift clutter ----
    // a high window strip (back wall, upper left of frame A): moonlit deep-blue night with stars, a cool shaft below it
    { const wx = -5.55, wy = 4.25, ww = 1.5, wh = 0.62;
      plane(g, faceMat("prNight", nightTex, 1.0), ww, wh, [o[0] + wx, o[1] + wy, o[2] - Z + 0.02]);
      for (const x of [wx - ww / 2, wx - ww / 6, wx + ww / 6, wx + ww / 2]) rb.box(C("#2a2e38"), x - 0.03, wy - wh / 2, -Z, x + 0.03, wy + wh / 2, -Z + 0.08);
      rb.box(C("#2a2e38"), wx - ww / 2 - 0.03, wy - wh / 2 - 0.05, -Z, wx + ww / 2 + 0.03, wy - wh / 2, -Z + 0.14); rb.box(C("#2a2e38"), wx - ww / 2 - 0.03, wy + wh / 2, -Z, wx + ww / 2 + 0.03, wy + wh / 2 + 0.05, -Z + 0.08);
      this.addShaft(g, [o[0] + wx, o[1] + wy - 0.2, o[2] - Z + 0.1], [0.32, -0.75, 0.58], 3.6, 1.1, new THREE.Color(0.04, 0.07, 0.16), 1.3); }
    // a catwalk with a rail along the back wall above the stencils (y 4.0)
    { const cy = 4.0; rb.box(C("#3a3e46"), -X + 0.1, cy - 0.05, -3.4, X - 0.1, cy, -2.98);
      for (let x = -X + 0.3; x < X - 0.2; x += 0.6) rb.box(C("#2a2e36"), x - 0.01, cy - 0.12, -3.4, x + 0.01, cy - 0.05, -2.98);
      for (let x = -X + 0.3; x < X - 0.2; x += 1.2) rb.seg(C("#c8a030"), [x, cy, -3.0], [x, cy + 0.8, -3.0], 0.02);
      for (const h of [0.8, 0.42]) rb.seg(C("#c8a030"), [-X + 0.2, cy + h, -3.0], [X - 0.2, cy + h, -3.0], h > 0.5 ? 0.022 : 0.015);
      for (let x = -X + 1.2; x < X; x += 2.4) rb.seg(C("#2a2e36"), [x, cy, -3.2], [x, H, -3.3], 0.025); }
    // more pipes in three diameters: risers with elbows, flanges, T-joints and small hand wheels
    {       // (the elbow runs never cross a COUNTED plate (x -3 / 0 / 3 +- 0.55) or the SATURDAY calendar)
      const risers: [number, number, number, THREE.Material, boolean][] = [[-6.2, -4.05, 0.13, copper, false], [-1.5, -4.1, 0.08, green, true], [0.95, -4.1, 0.1, blueS, true], [4.0, -4.05, 0.13, copper, true], [-2.2, -4.0, 0.06, iron, false]];
      for (const [x, z, r2, m, run] of risers) {
        if (!run) { rb.seg(m, [x, 0, z], [x, H, z], r2); } else {
        rb.seg(m, [x, 0, z], [x, 2.6, z], r2); rb.geo(new THREE.TorusGeometry(0.22, r2, 10, 16, Math.PI / 2), m, x + 0.22, 2.6, z, 0, 0, Math.PI / 2);
        rb.seg(m, [x + 0.22, 2.82, z], [x + 0.9, 2.82, z], r2); }
        for (const y of [0.35, 1.7]) rb.geo(new THREE.CylinderGeometry(r2 + 0.04, r2 + 0.04, 0.05, 16), C("#4a4e54"), x, y, z);
        rb.geo(new THREE.TorusGeometry(0.1, 0.012, 6, 20), red, x, 1.0, z + r2 + 0.06); rb.seg(iron, [x, 1.0, z], [x, 1.0, z + r2 + 0.06], 0.01);
        rb.geo(new THREE.CylinderGeometry(r2 * 0.8, r2 * 0.8, 0.3, 12).rotateZ(Math.PI / 2), m, x + 0.15, 2.1, z);
      }
    }
    // the pump motor in frame A: a green motor, a flywheel + belt that turn, a pump body piped into the main run
    { const mx = -4.55, mz = -1.45; rb.box(C("#3e6a52"), mx - 0.35, 0, mz - 0.25, mx + 0.35, 0.12, mz + 0.25); rb.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 20).rotateZ(Math.PI / 2), C("#4f7a5a"), mx, 0.34, mz);
      for (let k = 0; k < 6; k++) rb.geo(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 20).rotateZ(Math.PI / 2), C("#3a5a46"), mx - 0.2 + k * 0.08, 0.34, mz);
      // fix r3 (A3 P2 shot 13: the outlet ran diagonally across worker 1's chin in S13A): the pump's outlet now runs along the
      // FLOOR back to behind the workers (z -3.35), then rises straight up into the main run
      rb.geo(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 18), C("#7a3a2a"), mx + 0.5, 0.15, mz - 0.3); rb.seg(iron, [mx + 0.5, 0.17, mz - 0.3], [mx + 0.5, 0.17, -3.35], 0.075);
      rb.geo(new THREE.TorusGeometry(0.12, 0.075, 8, 12, Math.PI / 2), iron, mx + 0.5, 0.29, -3.35, Math.PI / 2, 0, Math.PI); rb.seg(iron, [mx + 0.5, 0.29, -3.47], [mx + 0.5, 1.2, -3.47], 0.075); rb.seg(iron, [mx + 0.5, 1.2, -3.47], [mx + 0.5, 1.2, -3.6], 0.075);
      for (const z of [-2.2, -2.9]) rb.geo(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14).rotateX(Math.PI / 2), C("#4a4e54"), mx + 0.5, 0.17, z);
      this.flywheel.position.set(o[0] + mx - 0.32, o[1] + 0.34, o[2] + mz); g.add(this.flywheel);
      const fw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 28).rotateY(Math.PI / 2), C("#8a8e94")); fw.castShadow = true; this.flywheel.add(fw);
      for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.32, 0.02), C("#8a8e94")); sp.rotation.x = (k / 4) * Math.PI; this.flywheel.add(sp); }
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 30).rotateY(Math.PI / 2).scale(1, 1.5, 1), C("#1e1e22")); belt.position.set(o[0] + mx - 0.34, o[1] + 0.48, o[2] + mz); g.add(belt);
      contact(g, [o[0] + mx, o[1] + 0.006, o[2] + mz], 1.0, 0.8, 0.45); }
    // night-shift clutter on the drums + floor: hard hats, a lunch box + thermos, a transistor radio, a coiled hose,
    // a bucket with rags, a drip tray under a leaking flange (a slow gold drip), a wall clock at ~2:00 by the calendar
    rb.geo(new THREE.SphereGeometry(0.15, 18, 10, 0, TAU, 0, Math.PI / 2), C("#f2c22a"), -4.95, 1.0, -2.75, 0, 0, 0, [1, 0.8, 1.1]); rb.geo(cylY(0.2, 0.012, 20), C("#f2c22a"), -4.95, 1.0, -2.75, 0, 0, 0, [1, 1, 1.15]);
    rb.geo(new THREE.SphereGeometry(0.15, 18, 10, 0, TAU, 0, Math.PI / 2), C("#f2f0e8"), -4.65, 1.0, -3.45, 0.6, 0, 0, [1, 0.8, 1.1]); rb.geo(cylY(0.2, 0.012, 20), C("#f2f0e8"), -4.65, 1.0, -3.45, 0, 0, 0, [1, 1, 1.15]);
    rb.box(C("#2f5a8a"), -4.52, 1.0, -3.05, -4.18, 1.17, -2.85); rb.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), C("#2f5a8a"), -4.35, 1.17, -2.95);
    rb.geo(cylY(0.05, 0.28, 16), C("#c4302a"), -4.22, 1.0, -2.82); rb.geo(cylY(0.045, 0.05, 16), C("#d8d8d8"), -4.22, 1.28, -2.82);
    rb.box(C("#8a3a2a"), -5.0, 1.0, -2.65, -4.78, 1.12, -2.58); rb.box(C("#e8d8b0"), -4.98, 1.03, -2.578, -4.86, 1.1, -2.575);
    for (let k = 0; k < 4; k++) rb.geo(new THREE.TorusGeometry(0.24 - k * 0.035, 0.022, 6, 28).rotateX(Math.PI / 2), C("#2a2a30"), -3.55, 0.025 + k * 0.03, -0.85);
    rb.geo(cylY(0.13, 0.26, 16, true, 0.11), C("#8a8e94"), -3.0, 0, -1.0); for (let k = 0; k < 3; k++) rb.geo(new THREE.IcosahedronGeometry(0.06, 0), C(["#c8452c", "#e8d8b0", "#3a6a8a"][k]), -3.0 + (k - 1) * 0.05, 0.27, -1.0 + (k % 2) * 0.04);
    rb.box(C("#3a3a40"), -4.85, 0, -3.85, -4.35, 0.05, -3.4); rb.box(C("#c88a1a"), -4.8, 0.05, -3.8, -4.4, 0.052, -3.45, false);
    { const cx2 = -4.92, cy2 = 3.62, cz2 = -Z + 0.03; rb.geo(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 28).rotateX(Math.PI / 2), C("#2a2a2e"), cx2, cy2, cz2);
      plane(g, faceMat("prClock", () => clockFaceTex("prClock", "#8a8a80"), 0.85), 0.33, 0.33, [o[0] + cx2, o[1] + cy2, o[2] + cz2 + 0.03]);
      for (const [L, w, a] of [[0.09, 0.016, -((2 + 4 / 60) / 12) * TAU], [0.13, 0.01, -(4 / 60) * TAU]] as number[][]) { const hm = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.004).translate(0, L / 2 - 0.015, 0), basic("prHand", () => ({ color: new THREE.Color("#1a1420") }))); hm.position.set(o[0] + cx2, o[1] + cy2, o[2] + cz2 + 0.035); hm.rotation.z = a; g.add(hm); } }
    this.drip = glowSprite(g, [0, 0, 0], 0.05, glowCol("#f2b62e", 1.2)); this.drip.material.blending = THREE.NormalBlending;
    // steam wisps from two pipe joints
    for (const [x, y, z] of [[-1.4, 2.12, -3.7], [3.9, 3.42, -3.55], [-6.2, 1.75, -3.95]]) for (let k = 0; k < 2; k++) { const s2 = plane(g, basic("prSteam" + k, () => ({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.6 })), 0.12, 0.5, [o[0] + x, o[1] + y + 0.25, o[2] + z], 0, 0, 0, true); this.prSteam.push({ m: s2, x, y, z, k }); }
    // two more caged work lamps on swing arms (one over the motor in frame A, one by tank C behind the blob close-up)
    for (const [i, l] of [[0, PR_LAMPS2[0]], [1, PR_LAMPS2[1]]] as [number, P3][]) {
      const lg = new THREE.Group(); lg.position.set(o[0] + l[0], o[1] + H, o[2] + l[2]); g.add(lg); this.lampsP.push({ g: lg, ph: 2.7 + i * 1.3 });
      const dy = l[1] - H;
      lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, -dy, 6).translate(0, dy / 2, 0), C("#141414")));
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 24, 1, true).translate(0, dy - 0.04, 0), lam("si:prShade", () => ({ color: "#2e4a3a", side: THREE.FrontSide }))); shade.castShadow = true; lg.add(shade);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.215, 0.18, 24, 1, true).translate(0, dy - 0.04, 0), new THREE.MeshBasicMaterial({ color: glowCol("#fff2d8", 1.6), side: THREE.BackSide })); inner.layers.set(NOINK); lg.add(inner);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4).translate(0, dy - 0.18, 0), C("#2a2a2a")); w.position.set(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07); lg.add(w); }
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10).translate(0, dy - 0.16, 0), new THREE.MeshBasicMaterial({ color: glowCol("#ffcf86", 6) })); b.layers.set(NOINK); lg.add(b);
      const hs = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: glowCol("#ffb860", 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hs.position.set(0, dy - 0.16, 0); hs.scale.setScalar(1.2); hs.layers.set(NOINK); hs.renderOrder = 6; lg.add(hs);
      this.addShaft(g, [o[0] + l[0], o[1] + l[1] - 0.25, o[2] + l[2]], [-0.05, -1, -0.2], 3.0, 1.6, new THREE.Color(0.2, 0.12, 0.04), 1.1 + i);
    }
    // behind the blob close-up: a valve wheel on a stub + a warm lamp bokeh disc
    rb.geo(new THREE.TorusGeometry(0.16, 0.022, 8, 28), red, 1.95, 2.3, -3.82); for (let k = 0; k < 3; k++) rb.rbox(red, 0.32, 0.02, 0.02, 1.95, 2.3, -3.82, 0, 0, (k / 3) * Math.PI); rb.seg(iron, [1.95, 2.3, -3.95], [1.95, 2.3, -3.83], 0.03);
    glowSprite(g, [o[0] + 3.15, o[1] + 2.35, o[2] - 4.05], 0.9, glowCol("#ffb860", 0.4));
    this.prMotes = new Motes(g, 90, 31, PR.base, [-4.2, 0.6, -3.6], [4.2, 3.6, -1.6], new THREE.Color(0.85, 0.6, 0.3), 0.016, 0.08);
    this.buildPumpR2(rb, g);
    this.buildPumpR3(rb, g);
    for (let k = 0; k < 6; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.4, 1.2, 0.9), transparent: true, depthWrite: false, fog: false })); s.scale.setScalar(0.035); s.layers.set(NOINK); s.renderOrder = 6; g.add(s); this.moths.push(s); }
    rb.done(g);
  }

  /** fix r2 (A2 P2 #23 / #24, ADD #68-70 shot 13): floor dressing in both framings (oil stains + gold drip spots, a gold
   *  puddle that catches the lamp, a red-lid toolbox, the canvas hose, a bucket), a wet sheen; in the tank-C close-up a
   *  twitching gauge left of the blob, a steam wisp at a flange (upper right), a gold drip into a small tray every 40 f
   *  (the drips_13 phase); a chalk tally by COUNTED: A, hard hats on hooks + a wall telephone under SATURDAY */
  private buildPumpR2(rb: RB, g: THREE.Group) {
    const o = PR.base, iron = C("#5a5e64"), red = C("#c4302a");
    const stainT = tx("prStain", 128, 128, (g2, r) => { g2.clearRect(0, 0, 128, 128); for (let i = 0; i < 14; i++) { const x = 30 + r() * 68, y = 30 + r() * 68, rr = 10 + r() * 22, gr = g2.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(18,14,16,0.55)"); gr.addColorStop(1, "rgba(18,14,16,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); } }, true);
    const flat = (mat: THREE.Material, w: number, d: number, x: number, z: number, ry: number, y = 0.005, ord = 2) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); m.position.set(o[0] + x, o[1] + y, o[2] + z); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = ord; g.add(m); return m; };
    const stainM = new THREE.MeshBasicMaterial({ map: stainT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const [x, z, w2, ry] of [[-3.25, -1.95, 0.9, 0.3], [-2.55, -2.4, 0.6, 1.2], [2.55, -2.95, 0.7, 0.6], [1.9, -2.2, 0.5, 2.0], [-1.6, -1.2, 0.8, 0.9]] as number[][]) flat(stainM, w2, w2 * 0.7, x, z, ry);
    // gold drip spots + a small gold puddle that catches the lamp (emissive), a wet sheen streak
    const goldM = new THREE.MeshBasicMaterial({ color: glowCol("#f2b62e", 1.05), transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.025 + 0.02 * hash(k), 12).rotateX(-Math.PI / 2), goldM); m.position.set(o[0] - 3.6 + k * 0.75 + hash(k) * 0.2, o[1] + 0.006, o[2] - 2.0 - hash(k + 3) * 1.3); m.layers.set(NOINK); m.renderOrder = 3; g.add(m); }
    { const pm = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2).scale(1.5, 1, 1), goldM); pm.position.set(o[0] - 3.5, o[1] + 0.006, o[2] - 2.05); pm.layers.set(NOINK); pm.renderOrder = 3; g.add(pm);
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: glowCol("#fff2c8", 1.6), transparent: true, opacity: 0.8, depthWrite: false })); hl.position.set(o[0] - 3.45, o[1] + 0.007, o[2] - 2.1); hl.layers.set(NOINK); hl.renderOrder = 4; g.add(hl); }
    flat(new THREE.MeshBasicMaterial({ map: shaftTex(), color: new THREE.Color(0.18, 0.14, 0.08), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 1.6, 0.3, -2.7, -1.6, 0.45, 0.007, 3);
    // a red-lid toolbox, the canvas hose coil moved into frame A, a bucket
    rb.box(C("#5a5a62"), -2.45, 0, -1.95, -2.0, 0.2, -1.7); rb.box(red, -2.47, 0.2, -1.97, -1.98, 0.24, -1.68); rb.seg(C("#2a2a2a"), [-2.35, 0.27, -1.82], [-2.1, 0.27, -1.82], 0.012);
    contact(g, [o[0] - 2.22, o[1] + 0.006, o[2] - 1.82], 0.7, 0.45, 0.45);
    for (let k = 0; k < 4; k++) rb.geo(new THREE.TorusGeometry(0.26 - k * 0.045, 0.026, 6, 28).rotateX(Math.PI / 2), C("#c8b48a"), -3.85, 0.026 + k * 0.034, -1.7);
    contact(g, [o[0] - 3.85, o[1] + 0.006, o[2] - 1.7], 0.7, 0.7, 0.4);
    // shot 13 MCU life: a gauge left of the blob (its needle twitches +-8 deg at ~2 Hz), a steam wisp at a flange upper
    // right (a 60 f S-curl), a gold drip off the main pipe into a small tray (lands on the drips_13 phase: VF % 40 = 12)
    { const x = 1.9, y = 1.86, z = -3.66; rb.seg(iron, [x, 1.36, z - 0.02], [x, y, z - 0.02], 0.018); rb.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 24).rotateX(Math.PI / 2), C("#2a2a2a"), x, y, z - 0.02);
      plane(g, faceMat("prGauge", gaugeTex, 0.8), 0.17, 0.17, [o[0] + x, o[1] + y, o[2] + z + 0.008]);
      const piv = new THREE.Group(); piv.position.set(o[0] + x, o[1] + y, o[2] + z + 0.012); g.add(piv);
      const nd = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.072, 0.003).translate(0, 0.032, 0), basic("prNeedle", () => ({ color: new THREE.Color("#a01a14") }))); nd.layers.set(NOINK); piv.add(nd); this.mcuNeedle = piv; }
    for (let k = 0; k < 2; k++) { const s2 = plane(g, basic("prSteamC" + k, () => ({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.6 })), 0.13, 0.52, [o[0] + 3.7, o[1] + 2.3, o[2] - 3.8], 0, 0, 0, true); this.prSteam.push({ m: s2, x: 3.7, y: 2.05, z: -3.8, k }); }
    rb.geo(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 18).rotateZ(Math.PI / 2), C("#4a4e54"), 3.7, 2.0, -3.95);
    { const tx0 = 2.88, tz0 = -3.25; rb.box(C("#3a3a40"), tx0 - 0.16, 0, tz0 - 0.12, tx0 + 0.16, 0.05, tz0 + 0.12); rb.box(C("#c88a1a"), tx0 - 0.13, 0.05, tz0 - 0.09, tx0 + 0.13, 0.052, tz0 + 0.09, false);
      contact(g, [o[0] + tx0, o[1] + 0.005, o[2] + tz0], 0.45, 0.35, 0.4);
      this.drip2 = glowSprite(g, [0, 0, 0], 0.05, glowCol("#f2b62e", 1.2)); this.drip2.material.blending = THREE.NormalBlending; }
    // a chalk tally beside COUNTED: A (a sly hint of the fake counting): IIII IIII on the curved tank wall
    { const ct = tx("prTally", 256, 128, (g2) => { g2.clearRect(0, 0, 256, 128); g2.strokeStyle = "rgba(240,240,232,0.9)"; g2.lineWidth = 7; g2.lineCap = "round";
        for (const x0 of [16, 136]) { for (let k = 0; k < 4; k++) { g2.beginPath(); g2.moveTo(x0 + k * 22, 24); g2.lineTo(x0 + k * 22 + 3, 104); g2.stroke(); } g2.beginPath(); g2.moveTo(x0 - 8, 90); g2.lineTo(x0 + 82, 36); g2.stroke(); } }, true);
      const t0 = PR.tanks[0], dx = 0.78, sz = t0[2] + Math.sqrt(PR.tankR ** 2 - dx * dx); plane(g, basic("prTallyM", () => ({ map: ct, transparent: true, depthWrite: false })), 0.38, 0.19, [o[0] + t0[0] + dx, o[1] + 2.05, o[2] + sz + 0.008], Math.atan2(dx, sz - t0[2]), 0, 0, true); }
    // hard hats on wall hooks + a wall telephone under the SATURDAY calendar
    for (const [x, c] of [[-5.32, "#f2c22a"], [-4.6, "#f2f0e8"]] as [number, string][]) { rb.seg(iron, [x, 1.86, -4.5], [x, 1.86, -4.38], 0.012);
      rb.geo(new THREE.SphereGeometry(0.15, 18, 10, 0, TAU, 0, Math.PI / 2), C(c), x, 1.7, -4.33, 0, -1.2, 0, [1, 0.8, 1.1]); rb.geo(cylY(0.2, 0.012, 20), C(c), x, 1.7, -4.33, 0, -1.2, 0, [1, 1, 1.15]); }
    { const x = -3.95, y = 1.55; rb.box(C("#1e1e22"), x - 0.1, y - 0.15, -4.5, x + 0.1, y + 0.15, -4.42); rb.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 10), C("#1e1e22"), x - 0.15, y, -4.4);
      rb.geo(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 14).rotateX(Math.PI / 2), C("#e8e4d8"), x, y + 0.02, -4.41); rb.seg(C("#1e1e22"), [x - 0.15, y - 0.1, -4.4], [x - 0.05, y - 0.6, -4.38], 0.006); }
  }

  /** fix r3 (A3 P2 shot 13: the bottom 27 % of the follow + MCU was an empty navy floor; nothing moved in the MCU): the
   *  floor 1-2 m in front of the back wall dressed along the follow path (stencilled olive / red drums, a drip tray with a
   *  gold puddle that catches the lamp, a canvas hose, a pallet, floor grates, a mop + bucket), warm floor pools; in the
   *  MCU a steam wisp at the flange right of the blob; a 20 f steam puff by COUNTED: 2 on its tick; chalk tallies by
   *  plates B and C that gain a stroke as each plate flips; a gold smear left in the glass behind the blob */
  private buildPumpR3(rb: RB, g: THREE.Group) {
    const o = PR.base, iron = C("#5a5e64");
    const drum = (x: number, z: number, col: string, tilt = 0) => { rb.geo(cylY(0.29, 0.88, 22), C(col), x, 0, z, 0, 0, tilt); for (const y of [0.3, 0.6]) rb.geo(new THREE.TorusGeometry(0.29, 0.016, 6, 28).rotateX(Math.PI / 2), C("#1e2a3a"), x, y, z); rb.geo(cylY(0.27, 0.01, 22), C("#3a3a3e"), x, 0.88, z);
      rb.panel(lam("si:prDrumSt", () => ({ map: tx("prDrumSten", 128, 64, (g2) => { g2.clearRect(0, 0, 128, 64); ctext(g2, "OIL", 64, 50, 46, "rgba(240,236,220,0.85)", 110); }, true), alphaTest: 0.3 })), 0.34, 0.17, x, 0.5, z + 0.292); contact(g, [o[0] + x, o[1] + 0.006, o[2] + z], 0.8, 0.7, 0.45); };
    drum(-0.85, -2.95, "#5e6a3a"); drum(-0.3, -3.05, "#a8382a"); drum(2.95, -2.7, "#5e6a3a");
    // the drip tray under the main pipe with a gold puddle that catches the lamp
    { const tx0 = 0.35, tz0 = -2.75; rb.box(C("#3a3a40"), tx0 - 0.35, 0, tz0 - 0.22, tx0 + 0.35, 0.06, tz0 + 0.22); rb.box(C("#2a2a2e"), tx0 - 0.31, 0.06, tz0 - 0.18, tx0 + 0.31, 0.062, tz0 + 0.18, false);
      const pm = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2).scale(1.4, 1, 0.8), new THREE.MeshBasicMaterial({ color: glowCol("#f2b62e", 1.15), transparent: true, opacity: 0.95, depthWrite: false })); pm.position.set(o[0] + tx0, o[1] + 0.065, o[2] + tz0); pm.layers.set(NOINK); pm.renderOrder = 3; g.add(pm);
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.035).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: glowCol("#fff2c8", 1.8), transparent: true, opacity: 0.85, depthWrite: false })); hl.position.set(o[0] + tx0 + 0.05, o[1] + 0.067, o[2] + tz0 - 0.04); hl.layers.set(NOINK); hl.renderOrder = 4; g.add(hl);
      contact(g, [o[0] + tx0, o[1] + 0.005, o[2] + tz0], 0.95, 0.6, 0.45); }
    // a pallet with a crate, a coiled canvas hose, floor grates, a mop in a bucket
    { const px = 1.95, pz = -2.45; for (let k = 0; k < 5; k++) rb.box(C("#8a6a42"), px - 0.5, 0.1, pz - 0.4 + k * 0.2, px + 0.5, 0.13, pz - 0.31 + k * 0.2); for (const z of [-0.38, 0, 0.38]) rb.box(C("#6a4e2e"), px - 0.5, 0, pz + z - 0.05, px + 0.5, 0.1, pz + z + 0.05);
      rb.box(C("#a07a4a"), px - 0.3, 0.13, pz - 0.25, px + 0.25, 0.48, pz + 0.22); rb.panel(lam("si:prCrateSt", () => ({ map: tx("prCrateSten", 128, 64, (g2) => { g2.clearRect(0, 0, 128, 64); ctext(g2, "FRAGILE", 64, 42, 26, "rgba(60,30,20,0.8)", 120); }, true), alphaTest: 0.3 })), 0.4, 0.2, px - 0.02, 0.32, pz + 0.222);
      contact(g, [o[0] + px, o[1] + 0.005, o[2] + pz], 1.3, 1.0, 0.45); }
    for (let k = 0; k < 4; k++) rb.geo(new THREE.TorusGeometry(0.24 - k * 0.04, 0.024, 6, 28).rotateX(Math.PI / 2), C("#c8b48a"), -1.55, 0.024 + k * 0.03, -2.55);
    contact(g, [o[0] - 1.55, o[1] + 0.005, o[2] - 2.55], 0.65, 0.65, 0.4);
    { const gm = TM("prGrate3", () => tx("prGrateT", 128, 128, (g2) => { g2.fillStyle = "#3a3e46"; g2.fillRect(0, 0, 128, 128); g2.fillStyle = "#14161c"; for (let k = 0; k < 8; k++) g2.fillRect(10 + k * 14, 8, 7, 112); g2.strokeStyle = "#5a5e66"; g2.lineWidth = 6; g2.strokeRect(3, 3, 122, 122); }));
      for (const x of [-2.1, 1.0]) rb.panel(gm, 0.6, 0.6, x, 0.006, -2.25, 0, -Math.PI / 2); }
    { const bx = -1.95, bz = -3.2; rb.geo(cylY(0.15, 0.3, 18, true, 0.13), C("#8a8e94"), bx, 0, bz); rb.geo(cylY(0.13, 0.01, 18), C("#3a4a5a"), bx, 0.25, bz); rb.seg(C("#c8a070"), [bx, 0.2, bz], [bx + 0.18, 1.2, bz - 0.12], 0.016);
      for (let k = 0; k < 7; k++) rb.seg(C("#e8e0cc"), [bx + 0.01, 0.24, bz], [bx + (hash(k) - 0.5) * 0.18, 0.12, bz + (hash(k + 3) - 0.5) * 0.18], 0.012, true, 4);
      contact(g, [o[0] + bx, o[1] + 0.005, o[2] + bz], 0.5, 0.45, 0.45); }
    // a rag hanging off valve A's stem
    rb.geo(new THREE.PlaneGeometry(0.16, 0.24).translate(0, -0.12, 0), lam("si:prRag", () => ({ color: "#c8452c", side: THREE.DoubleSide })), PR.valves[0][0] + 0.2, PR.valves[0][1] + 0.3, -3.42, 0.3, 0, 0.15);
    // the MCU steam wisp at the flange right of the blob (a 60 f S-curl, ~15 %)
    for (let k = 0; k < 2; k++) { const s2 = plane(g, basic("prSteamM3" + k, () => ({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.5 })), 0.12, 0.45, [o[0] + 2.45, o[1] + 1.4, o[2] - 3.45], 0, 0, 0, true); this.prSteam.push({ m: s2, x: 2.47, y: 1.2, z: -3.45, k }); }
    // the COUNTED: 2 steam puff (shot 13 "got" + 2, 20 f), from a flange right of the plate
    for (let k = 0; k < 3; k++) { const s2 = plane(g, basic("prPuff3", () => ({ map: softDot(), color: new THREE.Color(0.92, 0.94, 1.0), transparent: true, depthWrite: false, opacity: 0.8 })), 0.3, 0.3, [o[0] + 0.78, o[1] + 2.1, o[2] - 3.8], 0, 0, 0, true); s2.visible = false; this.puff.push(s2); }
    rb.geo(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 18).rotateZ(Math.PI / 2), C("#4a4e54"), 0.72, 2.0, -3.95);
    // chalk tallies by B and C (4 strokes, + 1 when the plate flips)
    const tally = tallyTex;
    for (const i of [1, 2]) { const t0 = PR.tanks[i], dx = 0.8, sz = t0[2] + Math.sqrt(PR.tankR ** 2 - dx * dx);
      const m = plane(g, basic("prTally3M" + i, () => ({ map: tally(4), transparent: true, depthWrite: false })), 0.25, 0.2, [o[0] + t0[0] + dx, o[1] + 2.05, o[2] + sz + 0.008], Math.atan2(dx, sz - t0[2]), 0, 0, true);
      this.tallies.push({ m, i }); }
    // the gold smear left in the glass behind the blob (fades over ~20 f of travel)
    const sm = basic("prSmear3", () => ({ map: tx("prSmearT", 16, 128, (g2) => { const gr = g2.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,190,60,0)"); gr.addColorStop(1, "rgba(255,190,60,0.75)"); g2.fillStyle = gr; g2.fillRect(0, 0, 16, 128); }, true), color: glowCol("#ffffff", 1.25), transparent: true, depthWrite: false }));
    for (const [a, b] of [[-2.45, -0.55], [0.55, 2.45]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 1, 18, 1, true).rotateZ(-Math.PI / 2), sm); m.layers.set(NOINK); m.renderOrder = 4; m.visible = false; g.add(m); this.smears.push({ m, x0: a + 0.04, x1: b - 0.04 }); }
  }

  // ================================================================================================ OFFICE
  private buildOffice() {
    const o = OF.base, g = this.office, rb = new RB(o), X = OF.room.w / 2, Z = OF.room.d / 2, H = OF.room.h, W = OF.window, WT = 0.85, RT = 0.9, CR = 2.82;
    const wx0 = W.c[0] - W.w / 2, wx1 = W.c[0] + W.w / 2, wy0 = W.c[1] - W.h / 2, wy1 = W.c[1] + W.h / 2;
    const wain = TM("ofWain", ofWainTex), wall = TM("ofWall", ofWallTex), oak = TM("ofOak", () => woodTex("ofOak", "#a8743e")), walnut = C("#4a2c18"), brass = C("#d2a84e");
    rb.flatY(TM("ofFloor", () => parquetTex("ofFloor", "#b4804a")), -X, X, -Z, Z, 0, 1, 2, 2);
    rb.panel(TM("ofRug", () => rugTex("ofRug", "#7a2a2a", "#2f4a6a")), 2.6, 1.9, 0, 0.004, -0.75, 0, -Math.PI / 2);
    rb.flatY(TM("ofCeil", () => plasterTex("ofCeil", "#f4ead4")), -X, X, -Z, Z, H, -1, 2, 2);
    const wallZ = (z: number, face: number, hole: boolean) => {
      rb.wallZ(wain, -X, X, 0, WT, z, face, 1.0, WT); rb.wallZ(C("#8a5a32"), -X, X, CR, H, z, face, 1, 1);
      if (hole) { rb.wallZ(wall, -X, wx0, RT, CR, z, face, 1, 1); rb.wallZ(wall, wx1, X, RT, CR, z, face, 1, 1); rb.wallZ(wall, wx0, wx1, RT, wy0, z, face, 1, 1); rb.wallZ(wall, wx0, wx1, wy1, CR, z, face, 1, 1); }
      else rb.wallZ(wall, -X, X, RT, CR, z, face, 1, 1);
    };
    wallZ(-Z, 1, true); wallZ(Z, -1, false);
    for (const [x, face] of [[-X, 1], [X, -1]] as [number, number][]) { rb.wallX(wain, -Z, Z, 0, WT, x, face, 1.0, WT); rb.wallX(wall, -Z, Z, RT, CR, x, face, 1, 1); rb.wallX(C("#8a5a32"), -Z, Z, CR, H, x, face, 1, 1); }
    for (const [x0, z0, x1, z1] of [[-X, -Z, X, -Z + 0.04], [-X, Z - 0.04, X, Z], [-X, -Z, -X + 0.04, Z], [X - 0.04, -Z, X, Z]]) { rb.box(walnut, x0, WT, z0, x1, RT, z1, false); rb.box(walnut, x0, CR - 0.04, z0, x1, CR + 0.02, z1, false); }
    // the window: reveals, walnut frame, two sashes of three panes, a deep sill (cactus, books), blinds pulled up,
    // mustard curtains on a brass rod (a light breeze), a radiator below; the view: sky + buildings, the cafe, its people
    const rv = C("#e2d4b4");
    rb.box(rv, wx0 - 0.02, wy0, -Z - 0.22, wx0, wy1, -Z, false); rb.box(rv, wx1, wy0, -Z - 0.22, wx1 + 0.02, wy1, -Z, false); rb.box(rv, wx0, wy1, -Z - 0.22, wx1, wy1 + 0.02, -Z, false);
    rb.box(walnut, wx0 - 0.08, wy0, -Z, wx0, wy1 + 0.08, -Z + 0.05); rb.box(walnut, wx1, wy0, -Z, wx1 + 0.08, wy1 + 0.08, -Z + 0.05); rb.box(walnut, wx0 - 0.08, wy1, -Z, wx1 + 0.08, wy1 + 0.09, -Z + 0.05);
    rb.box(walnut, wx0 - 0.14, wy0 - 0.05, -Z - 0.22, wx1 + 0.14, wy0, -Z + 0.16);
    for (const x of [wx0 + W.w / 3, wx0 + (2 * W.w) / 3]) rb.box(walnut, x - 0.018, wy0, -Z - 0.13, x + 0.018, wy1, -Z - 0.1);
    rb.box(walnut, wx0, (wy0 + wy1) / 2 - 0.03, -Z - 0.14, wx1, (wy0 + wy1) / 2 + 0.03, -Z - 0.08);
    // fix r1 (A1 ADD): venetian blinds half down over the top of the window (tilted slats: the sun comes through in stripes)
    for (let k = 0; k < 9; k++) rb.rbox(C("#efe6d0"), W.w - 0.04, 0.012, 0.05, W.c[0], wy1 - 0.03 - k * 0.022, -Z - 0.04, 0, 0.5);
    { const sx = -0.62, sy = 2.66; rb.geo(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24).rotateX(Math.PI / 2), C("#c9a14a"), sx, sy, -Z + 0.03);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; rb.seg(C("#c9a14a"), [sx + Math.cos(a) * 0.08, sy + Math.sin(a) * 0.08, -Z + 0.025], [sx + Math.cos(a) * (k % 2 ? 0.15 : 0.19), sy + Math.sin(a) * (k % 2 ? 0.15 : 0.19), -Z + 0.025], 0.006, false, 4); }
      plane(g, faceMat("ofClock", () => clockFaceTex("ofClock", "#2a2a30"), 0.92), 0.13, 0.13, [o[0] + sx, o[1] + sy, o[2] - Z + 0.047]);
      // a small framed line chart (no numbers) to the right
      rb.box(C("#3a2414"), 0.42, 2.54, -Z, 0.82, 2.78, -Z + 0.025); this.ofChart = plane(g, faceMat("ofChart", ofChartTex, 0.92), 0.36, 0.2, [o[0] + 0.62, o[1] + 2.66, o[2] - Z + 0.027]); }
    rb.box(C("#d8ccb0"), wx0 + 0.02, wy1 - 0.14, -Z - 0.065, wx1 - 0.02, wy1 - 0.12, -Z - 0.02);
    // fix r1 (A1 P2): the cactus + books moved off the sill onto the radiator top (the sill line stays clean)
    rb.geo(cylY(0.06, 0.08, 14, false, 0.075), C("#c86a3a"), W.c[0] + 0.5, 0.7, -Z + 0.09); rb.geo(new THREE.SphereGeometry(0.06, 10, 8), C("#4a8a4a"), W.c[0] + 0.5, 0.83, -Z + 0.09, 0, 0, 0, [0.8, 1.4, 0.8]);
    for (let k = 0; k < 3; k++) rb.box(C(["#7a2a2a", "#2f4a6a", "#c8a050"][k]), W.c[0] - 0.62, 0.7 + k * 0.045, -Z + 0.03, W.c[0] - 0.35, 0.74 + k * 0.045, -Z + 0.15);
    rb.geo(new THREE.BoxGeometry(1.5, 0.55, 0.14), TM("ofRadiator", () => radiatorTex("ofRadiator", "#e2d8c0")), W.c[0], 0.42, -Z + 0.09);
    rb.seg(brass, [wx0 - 0.5, CR - 0.04, -Z + 0.1], [wx1 + 0.5, CR - 0.04, -Z + 0.1], 0.015); for (const x of [wx0 - 0.5, wx1 + 0.5]) rb.geo(new THREE.SphereGeometry(0.03, 10, 8), brass, x, CR - 0.04, -Z + 0.1);
    const cm = lam("si:ofCurtain", () => ({ map: curtainTex("ofCurtain", "#d8a038"), side: THREE.DoubleSide }));
    for (const x of [wx0 - 0.22, wx1 + 0.22]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.95).translate(0, -0.975, 0), cm); m.position.set(o[0] + x, o[1] + CR - 0.04, o[2] - Z + 0.12); m.castShadow = true; m.receiveShadow = true; g.add(m); this.curtainsO.push(m); }
    const sky = faceMat("ofSky", ofSkyTex), cafe = faceMat("ofCafe", cafeTex); this.ofView.push(sky, cafe);
    plane(g, sky, 9, 6, [o[0] - 0.6, o[1] + 2.5, o[2] - 9.5]);
    plane(g, cafe, CAFE.w, CAFE.h, [o[0] + CAFE.cx, o[1] + CAFE.y0 + CAFE.h / 2, o[2] + CAFE.z]);
    plane(g, basic("ofGlare", () => ({ map: glareTex(), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })), W.w, W.h, [o[0] + W.c[0], o[1] + W.c[1], o[2] - Z - 0.12], 0, 0, 0, true);
    // carryover r1 (binding): the cafe people are CHAR's (cast.ts); WORLD-INT's 6 painted cafe cards were removed
    // ---- the desk (honey oak, drawers, a modesty panel) + the swivel chair back
    rb.box(oak, -0.78, 0.72, -1.37, 0.78, 0.76, -0.53); rb.box(walnut, -0.76, 0.7, -1.35, 0.76, 0.72, -0.55);
    for (const s of [-1, 1]) { rb.box(oak, s > 0 ? 0.36 : -0.74, 0.05, -1.32, s > 0 ? 0.74 : -0.36, 0.7, -0.58); rb.panel(TM("bkDrawer", drawerTex), 0.36, 0.6, s * 0.55, 0.37, -0.575); }
    rb.box(oak, -0.36, 0.25, -0.64, 0.36, 0.7, -0.6); rb.panel(TM("ofDeskFront", ofDeskFrontTex), 0.7, 0.42, 0, 0.47, -0.595);   // fix r2: two raised panels + a carved trim
    rb.box(C("#6a4022"), -0.27, 0.55, -2.04, 0.27, 1.1, -1.98); rb.box(C("#5a3a20"), -0.3, 0.45, -2.0, 0.3, 0.52, -1.45); rb.seg(iron(), [0, 0, -1.75], [0, 0.45, -1.75], 0.03);
    // desk things: newspaper propped on a ledger, the BUY note pad + pencil, desk lamp, phone, coffee + steam, books
    rb.rbox(C("#2f4a6a"), 0.3, 0.05, 0.22, -0.15, 0.785, -0.92, 0.05); rb.rbox(C("#7a2a2a"), 0.28, 0.04, 0.2, -0.15, 0.83, -0.93, -0.04);
    plane(g, faceMat("ofPaper", newspaperTex, 0.95), 0.46, 0.34, [o[0] + OF.paper[0], o[1] + 0.86, o[2] - 0.78], 0.08, -Math.PI / 2 + 0.98);
    const sl = OF.slip, slipTilt = -Math.PI / 2 + 0.62;
    rb.rbox(C("#e8d878"), 0.21, 0.025, 0.16, sl[0], sl[1] + 0.03, sl[2] - 0.02, -0.15, slipTilt + Math.PI / 2 - 0.0);
    for (let n = 0; n <= 4; n++) this.buy.push(plane(g, faceMat("ofBuy" + n, () => buyTex(n), 0.97), 0.2, 0.143, [o[0] + sl[0], o[1] + sl[1] + 0.05, o[2] + sl[2] - 0.0], -0.15, slipTilt));
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 8).translate(0, 0.085, 0), C("#f2c22a")); pen.castShadow = true; this.pencil.add(pen);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 8).rotateX(Math.PI).translate(0, -0.01, 0), C("#e8c89a")); this.pencil.add(tip); g.add(this.pencil);
    const L = [-0.6, 0.76, -1.2] as P3;
    rb.geo(cylY(0.07, 0.02, 20), brass, L[0], L[1], L[2]); rb.seg(brass, [L[0], L[1], L[2]], [L[0] + 0.02, L[1] + 0.3, L[2] + 0.05], 0.01); rb.seg(brass, [L[0] + 0.02, L[1] + 0.3, L[2] + 0.05], [L[0] + 0.12, L[1] + 0.33, L[2] + 0.14], 0.01);
    rb.geo(new THREE.ConeGeometry(0.08, 0.1, 20, 1, true).translate(0, -0.03, 0), lam("si:ofShade", () => ({ color: "#2a5a3a", side: THREE.DoubleSide })), L[0] + 0.13, L[1] + 0.34, L[2] + 0.15, 0, 0.5);
    bulb(g, [o[0] + L[0] + 0.13, o[1] + L[1] + 0.29, o[2] + L[2] + 0.18], 0.02, "#ffd9a0", 4, 0.35, 0.3);
    { const px = 0.53, pz = -1.2; rb.geo(new THREE.CylinderGeometry(0.085, 0.11, 0.075, 20), C("#18181c"), px, 0.7975, pz, 0, 0, 0, [1.1, 1, 0.9]);
      rb.geo(new THREE.CylinderGeometry(0.055, 0.055, 0.008, 24).rotateX(-0.85), C("#f2f0e6"), px, 0.83, pz + 0.07); for (let k = 0; k < 10; k++) { const a = -2.4 + (k / 10) * 4.2; rb.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8).rotateX(-0.85), C("#18181c"), px + Math.cos(a) * 0.038, 0.83 + Math.sin(a) * 0.038 * 0.66, pz + 0.07 + Math.sin(a) * 0.038 * 0.75 + 0.004); }
      rb.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10).rotateX(-0.85), C("#c9a14a"), px, 0.836, pz + 0.075);
      for (const s2 of [-1, 1]) rb.box(C("#18181c"), px + s2 * 0.075 - 0.012, 0.83, pz - 0.03, px + s2 * 0.075 + 0.012, 0.86, pz + 0.0);
      rb.seg(C("#18181c"), [px - 0.11, 0.875, pz - 0.015], [px + 0.11, 0.875, pz - 0.015], 0.017); for (const s2 of [-1, 1]) rb.geo(new THREE.SphereGeometry(0.03, 12, 8), C("#18181c"), px + s2 * 0.115, 0.868, pz - 0.015, 0, 0, 0, [1, 0.7, 1.2]);
      rb.seg(C("#18181c"), [px - 0.09, 0.79, pz + 0.05], [px - 0.24, 0.762, pz + 0.18], 0.004, false, 4); contact(g, [o[0] + px, o[1] + 0.762, o[2] + pz], 0.3, 0.26, 0.4); }
    // fix r2: the coffee moved off the BUY slip's new spot (A2 LEAD OF.slip x 0.53)
    rb.geo(cylY(0.065, 0.008, 20), C("#f4f0e6"), CUP_OF[0], 0.76, CUP_OF[1]); rb.geo(cylY(0.038, 0.07, 18, false, 0.032), C("#f4f0e6"), CUP_OF[0], 0.768, CUP_OF[1]); rb.geo(new THREE.TorusGeometry(0.02, 0.006, 6, 14), C("#f4f0e6"), CUP_OF[0] + 0.045, 0.805, CUP_OF[1], 0);
    rb.geo(new THREE.CircleGeometry(0.034, 16).rotateX(-Math.PI / 2), C("#4a2a16"), CUP_OF[0], 0.832, CUP_OF[1]);
    const stT = tx("ofSteam", 64, 256, (g2) => { g2.clearRect(0, 0, 64, 256); for (let y = 0; y < 256; y++) { const a = Math.sin((y / 256) * Math.PI) * 0.5, x = 32 + Math.sin(y * 0.05) * 10; const gr = g2.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, `rgba(255,255,255,${a * 0.18})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g2.fillStyle = gr; g2.fillRect(x - 10, y, 20, 1); } }, true);
    for (let k = 0; k < 3; k++) { const s = plane(g, new THREE.MeshBasicMaterial({ map: stT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0.05, 0.2, [o[0] + CUP_OF[0], o[1] + 0.94, o[2] + CUP_OF[1]], 0, 0, 0, true); this.steam.push(s); }
    for (let k = 0; k < 4; k++) rb.rbox(C(["#7a2a2a", "#2f4a6a", "#c8a050", "#3a5a3a"][k]), 0.24, 0.04, 0.18, -0.58, 0.78 + k * 0.042, -0.74, 0.1 * (k - 1.5));
    for (const [x, z, w, d] of [[CUP_OF[0], CUP_OF[1], 0.2, 0.2], [-0.58, -0.74, 0.34, 0.28], [0.18, -1.2, 0.12, 0.12], [-0.6, -1.2, 0.2, 0.2], [-0.15, -0.92, 0.42, 0.3]] as number[][]) contact(g, [o[0] + x, o[1] + 0.761, o[2] + z], w, d, 0.35);
    { const st = tx("ofSunStripes", 256, 256, (g2) => { g2.clearRect(0, 0, 256, 256); for (let k = 0; k < 7; k++) { const gr = g2.createLinearGradient(0, k * 36, 0, k * 36 + 20); gr.addColorStop(0, "rgba(255,226,170,0)"); gr.addColorStop(0.5, "rgba(255,226,170,0.9)"); gr.addColorStop(1, "rgba(255,226,170,0)"); g2.fillStyle = gr; g2.fillRect(0, k * 36, 256, 20); }
        const m2 = g2.createRadialGradient(128, 128, 30, 128, 128, 128); m2.addColorStop(0, "rgba(0,0,0,0)"); m2.addColorStop(1, "rgba(0,0,0,1)"); g2.globalCompositeOperation = "destination-out"; g2.fillStyle = m2; g2.fillRect(0, 0, 256, 256); g2.globalCompositeOperation = "source-over"; }, true);
      void st;   // fix r2 (A2 P2 #27): a window-PANE light patch (mullion grid) instead of plain stripes
      this.sunPatch = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: paneLightTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22, polygonOffset: true, polygonOffsetFactor: -3 }));
      this.sunPatch.position.set(o[0] - 0.05, o[1] + 0.762, o[2] - 1.0); this.sunPatch.rotation.y = 0.12; this.sunPatch.layers.set(NOINK); this.sunPatch.renderOrder = 3; g.add(this.sunPatch); }
    { const tx0 = 1.12, tz0 = -0.95; rb.box(C("#5a3a20"), tx0 - 0.22, 0.62, tz0 - 0.2, tx0 + 0.22, 0.66, tz0 + 0.2); for (const [sx2, sz2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rb.seg(C("#3a2414"), [tx0 + sx2 * 0.18, 0, tz0 + sz2 * 0.16], [tx0 + sx2 * 0.18, 0.62, tz0 + sz2 * 0.16], 0.015);
      rb.geo(cylY(0.09, 0.05, 16), C("#3a3a3a"), tx0, 0.66, tz0); rb.geo(cylY(0.1, 0.03, 16), C("#c9a14a"), tx0, 0.71, tz0);
      const dm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 10, 0, TAU, 0, Math.PI / 2), basic("ofDome", () => ({ color: new THREE.Color(0.85, 0.92, 1.0), transparent: true, opacity: 0.28, depthWrite: false }))); dm.position.set(o[0] + tx0, o[1] + 0.74, o[2] + tz0); dm.layers.set(NOINK); g.add(dm);
      rb.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 14).rotateZ(Math.PI / 2), C("#f2ead2"), tx0, 0.79, tz0);
      const P = [[0, 0.78, 0.03], [-0.03, 0.7, 0.14], [-0.05, 0.665, 0.2], [-0.08, 0.5, 0.24], [-0.1, 0.25, 0.28], [-0.14, 0.03, 0.34], [-0.3, 0.005, 0.5]].map(([x, y, z]) => V(o[0] + tx0 + x, o[1] + y, o[2] + tz0 + z));
      const pts = new THREE.CatmullRomCurve3(P).getSpacedPoints(30), pos: number[] = [], uv: number[] = [], idx: number[] = [];
      pts.forEach((pp, i) => { pos.push(pp.x - 0.02, pp.y, pp.z, pp.x + 0.02, pp.y, pp.z); uv.push(0, i / 4, 1, i / 4); if (i < 30) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); });
      const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
      const tmesh = new THREE.Mesh(tg, lam("si:trTapeR", () => ({ map: tapeTex(), side: THREE.DoubleSide }))); tmesh.castShadow = true; g.add(tmesh); contact(g, [o[0] + tx0, o[1] + 0.006, o[2] + tz0], 0.6, 0.55, 0.35); }
    rb.geo(cylY(0.035, 0.1, 12), C("#2a3a5a"), 0.18, 0.76, -1.2); for (let k = 0; k < 3; k++) rb.seg(C(["#f2c22a", "#c4302a", "#2a2a2a"][k]), [0.18, 0.8, -1.2], [0.16 + k * 0.02, 0.95, -1.22 + k * 0.01], 0.004);
    // a bookshelf + a coat stand at the edges, a small framed photo of a ship by the window
    rb.box(C("#5a3a20"), 1.2, 0, -Z, 2.25, 2.1, -Z + 0.32); rb.panel(TM("ofBooks", () => booksTex("ofBooks", ["#7a2a2a", "#2f4a6a", "#c8a050", "#3a5a3a", "#e8dcc0"])), 1.0, 2.0, 1.725, 1.05, -Z + 0.322);   // fix r2: 0.15 m left, into the wide's right wall strip
    rb.seg(walnut, [-1.95, 0, -2.0], [-1.95, 1.85, -2.0], 0.025); rb.geo(new THREE.SphereGeometry(0.17, 14, 10, 0, TAU, 0, Math.PI / 2), C("#4a4a5a"), -1.95, 1.7, -1.92, 0, 0, 0, [1, 0.7, 1]);
    rb.box(C("#c9a14a"), -1.55, 1.55, -Z, -1.25, 1.95, -Z + 0.03); rb.panel(TM("bkPainting", paintingTex), 0.26, 0.36, -1.4, 1.75, -Z + 0.032);
    // window light: warm shafts from the panes onto the desk, a sun glow behind the glass, dust motes
    for (const [x, w, ph] of [[-0.55, 0.5, 0.3], [0.1, 0.65, 1.7], [0.7, 0.4, 3.1]]) this.addShaft(g, [o[0] + x, o[1] + 2.15, o[2] - Z + 0.02], [0.03, -0.42, 0.9], 3.0, w, new THREE.Color(0.17, 0.12, 0.05), ph);
    this.sunGlow = glowSprite(g, [o[0] - 0.75, o[1] + 2.35, o[2] - Z - 0.6], 1.7, new THREE.Color(0.5, 0.36, 0.18));
    this.addShaft(g, [o[0] + 0.85, o[1] + 2.35, o[2] - Z + 0.03], [-0.36, -0.6, 0.72], 2.7, 0.95, new THREE.Color(0.13, 0.095, 0.045), 0.9);   // fix r2 (A2 P2 #27): the diagonal sun shaft across the desk
    this.buildOfficeR3(g);
    this.buildOfficeR2(rb, g);
    this.ofMotes = new Motes(g, 60, 41, OF.base, [-1.0, 0.8, -2.3], [1.0, 2.3, -0.3], new THREE.Color(0.42, 0.34, 0.2), 0.009, 0.05);
    this.ofMotes2 = new Motes(g, 30, 43, OF.base, [-0.7, 0.9, -2.2], [0.8, 2.2, -0.8], new THREE.Color(0.95, 0.78, 0.45), 0.014, 0.05);
    rb.done(g);
  }

  /** fix r3 (A3 P2 shot 15: the sunny window threw no light into the room; the MS bottom third was a bare desk front):
   *  a stronger soft sun SHAFT from the window's upper right down across the desk, a window-grid light patch on the rug,
   *  blind-slat stripes on the back of his chair, a slow ceiling-fan shadow sweeping the desk, a CARDS WELCOME card on
   *  the cafe glass (plain lettering, no logo), the framed chart's alternate (one step higher) for "Warren" */
  private buildOfficeR3(g: THREE.Group) {
    const o = OF.base, Z = OF.room.d / 2;
    this.addShaft(g, [o[0] + 0.55, o[1] + 2.45, o[2] - Z + 0.03], [-0.3, -0.62, 0.72], 2.9, 0.75, new THREE.Color(0.16, 0.115, 0.05), 2.3);
    this.addShaft(g, [o[0] + 1.0, o[1] + 2.3, o[2] - Z + 0.03], [-0.3, -0.62, 0.72], 2.6, 0.45, new THREE.Color(0.11, 0.08, 0.035), 4.1);
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: paneLightTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3, polygonOffset: true, polygonOffsetFactor: -3 }));
      m.position.set(o[0] - 0.45, o[1] + 0.008, o[2] + 0.15); m.rotation.y = 0.35; m.layers.set(NOINK); m.renderOrder = 3; g.add(m); this.rugPatch = m; }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.55), new THREE.MeshBasicMaterial({ map: blindStripeTex(), color: new THREE.Color(0.3, 0.22, 0.11), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.position.set(o[0], o[1] + 0.83, o[2] - 1.977); m.rotation.z = -0.3; m.layers.set(NOINK); m.renderOrder = 3; g.add(m); this.chairStripes = m; }
    { const ft = tx("ofFanSh3", 256, 256, (g2) => { g2.clearRect(0, 0, 256, 256); g2.translate(128, 128); for (let k = 0; k < 4; k++) { g2.save(); g2.rotate((k / 4) * TAU); const gr = g2.createLinearGradient(0, 0, 120, 0); gr.addColorStop(0, "rgba(40,22,30,0.9)"); gr.addColorStop(1, "rgba(40,22,30,0.25)"); g2.fillStyle = gr; g2.beginPath(); g2.ellipse(64, 0, 62, 15, 0, 0, TAU); g2.fill(); g2.restore(); } g2.setTransform(1, 0, 0, 1, 0, 0); g2.filter = "blur(6px)"; g2.drawImage(g2.canvas, 0, 0); g2.filter = "none"; }, true);
      this.fanSh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ft, transparent: true, opacity: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      this.fanSh.position.set(o[0] - 0.1, o[1] + 0.763, o[2] - 0.95); this.fanSh.layers.set(NOINK); this.fanSh.renderOrder = 3; g.add(this.fanSh); }
    { const ct = tx("ofCardsSign3", 512, 300, (g2) => { g2.fillStyle = "#fbf6e8"; rrect(g2, 6, 6, 500, 288, 18); g2.fill(); g2.strokeStyle = "#2f6a4a"; g2.lineWidth = 10; rrect(g2, 14, 14, 484, 272, 14); g2.stroke();
        ctextC(g2, "CARDS", 256, 130, 104, "#2f6a4a", 440); ctextC(g2, "WELCOME", 256, 252, 104, "#c8452c", 450); }, true);
      plane(g, faceMat("ofCardsSign3", () => ct, 0.97), 0.7, 0.41, [o[0] + CAFE.cx - 1.3, o[1] + 1.8, o[2] + CAFE.z + 0.03]); }
  }
  /** fix r2 (A2 P2 #26 / P3 #38 / ADD #71 #74 shot 15): the desk-front + floor dressing (a wire waste basket of crumpled
   *  paper, a leather briefcase on the right drawers, a string-tied stack of newspapers), a coat rack with a trilby at the
   *  left of the window and a low bookshelf with a globe at its right (the wall strips of the wide), clock hands with a
   *  ticking second hand, the blind's pull cord swaying */
  private buildOfficeR2(rb: RB, g: THREE.Group) {
    const o = OF.base, Z = OF.room.d / 2, brass = C("#d2a84e");
    // wire waste basket (front left of the knee hole) + 3 paper balls
    // fix r3 (A3 P2 shot 15: none of it showed in the MS): the basket is a soft foreground framer at the lower left of the MS,
    // the briefcase at its lower right, the newspapers in front of the modesty panel, a brass key in its lock
    { const bx = -0.3, bz = -0.3; rb.geo(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 16, 1, true).translate(0, 0.15, 0), lam("si:ofWire", () => ({ map: tx("ofWireT", 128, 64, (g2) => { g2.clearRect(0, 0, 128, 64); g2.strokeStyle = "#3a3a40"; g2.lineWidth = 2; for (let x = 0; x < 128; x += 8) { g2.beginPath(); g2.moveTo(x, 0); g2.lineTo(x, 64); g2.stroke(); } for (let y = 2; y < 64; y += 12) { g2.beginPath(); g2.moveTo(0, y); g2.lineTo(128, y); g2.stroke(); } }, false), alphaTest: 0.4, side: THREE.DoubleSide })), bx, 0, bz);
      rb.geo(new THREE.TorusGeometry(0.13, 0.008, 6, 24).rotateX(Math.PI / 2), C("#3a3a40"), bx, 0.3, bz);
      for (let k = 0; k < 3; k++) rb.geo(new THREE.IcosahedronGeometry(0.05, 0), C("#f2eee2"), bx + (k - 1) * 0.06, 0.24 + (k % 2) * 0.05, bz + (hash(k) - 0.5) * 0.06, k, k * 2);
      rb.geo(new THREE.IcosahedronGeometry(0.045, 0), C("#f2eee2"), bx + 0.2, 0.04, bz + 0.12, 1, 2);
      contact(g, [o[0] + bx, o[1] + 0.006, o[2] + bz], 0.4, 0.34, 0.45); }
    // a brown leather briefcase leaning on the right drawers
    { rb.geo(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12).rotateX(Math.PI / 2), brass, 0, 0.6, -0.592); rb.box(C("#1a0e08"), -0.003, 0.585, -0.594, 0.003, 0.598, -0.588, false);
      rb.box(brass, -0.004, 0.57, -0.585, 0.004, 0.6, -0.578); rb.geo(new THREE.TorusGeometry(0.014, 0.004, 6, 14), brass, 0, 0.555, -0.578); }
    { const bx = 0.27, bz = -0.47; rb.rbox(C("#6a3a1e"), 0.4, 0.3, 0.1, bx, 0.155, bz, -0.06, -0.16); rb.rbox(C("#5a2e18"), 0.41, 0.02, 0.105, bx, 0.25, bz, -0.06, -0.16);
      rb.geo(new THREE.TorusGeometry(0.05, 0.011, 6, 14, Math.PI), C("#3a2010"), bx, 0.31, bz + 0.03, -0.06, -0.16); for (const s2 of [-1, 1]) rb.rbox(brass, 0.03, 0.022, 0.012, bx + s2 * 0.12, 0.25, bz + 0.058, -0.06, -0.16);
      contact(g, [o[0] + bx, o[1] + 0.006, o[2] + bz + 0.08], 0.5, 0.26, 0.45); }
    // a string-tied stack of newspapers on the floor by the left pedestal
    { const nx = 0.02, nz = -0.36; for (let k = 0; k < 6; k++) rb.rbox(C(k % 2 ? "#ece6d6" : "#e2dccc"), 0.42, 0.022, 0.3, nx + (hash(k) - 0.5) * 0.02, 0.011 + k * 0.022, nz, (hash(k + 4) - 0.5) * 0.08);
      for (const dx of [-0.1, 0.1]) rb.rbox(C("#b8945a"), 0.012, 0.14, 0.31, nx + dx, 0.07, nz, 0); rb.rbox(C("#b8945a"), 0.43, 0.006, 0.012, nx, 0.135, nz, 0);
      contact(g, [o[0] + nx, o[1] + 0.006, o[2] + nz], 0.6, 0.45, 0.45); }
    // the wall strips either side of the window (the wide): a coat rack with a trilby (left), a low bookshelf + globe (right)
    { const cx = -1.22, cz = -2.2; rb.seg(C("#4a2c18"), [cx, 0, cz], [cx, 1.8, cz], 0.022); for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.3; rb.seg(C("#4a2c18"), [cx, 0.02, cz], [cx + Math.cos(a) * 0.24, 0.0, cz + Math.sin(a) * 0.24], 0.015); }
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; rb.seg(brass, [cx, 1.68, cz], [cx + Math.cos(a) * 0.13, 1.76, cz + Math.sin(a) * 0.13], 0.008); }
      rb.geo(new THREE.SphereGeometry(0.13, 16, 10, 0, TAU, 0, Math.PI / 2), C("#5a4a3a"), cx + 0.06, 1.74, cz + 0.06, 0, 0, 0, [1, 0.62, 1.1]); rb.geo(cylY(0.2, 0.012, 20), C("#5a4a3a"), cx + 0.06, 1.74, cz + 0.06, 0, 0, 0, [1, 1, 1.1]); rb.geo(cylY(0.135, 0.025, 20), C("#2a2a30"), cx + 0.06, 1.75, cz + 0.06);
      rb.geo(new THREE.CylinderGeometry(0.09, 0.17, 0.9, 12, 1, true), lam("si:ofCoat", () => ({ color: "#5a6a7a", side: THREE.DoubleSide })), cx - 0.08, 1.2, cz + 0.05, 0, 0, 0.1);
      contact(g, [o[0] + cx, o[1] + 0.006, o[2] + cz], 0.6, 0.6, 0.35); }
    { const gx = 1.45, gz = -2.33, h = 2.1;   // a globe on the bookshelf top
      rb.geo(new THREE.SphereGeometry(0.13, 20, 14), lam("si:ofGlobe", () => ({ map: tx("ofGlobeT", 256, 128, (g2, r) => { g2.fillStyle = "#4a7ab0"; g2.fillRect(0, 0, 256, 128); for (let i = 0; i < 14; i++) { g2.fillStyle = "#c8b070"; g2.beginPath(); g2.ellipse(r() * 256, 20 + r() * 88, 10 + r() * 22, 6 + r() * 14, r() * 3, 0, TAU); g2.fill(); } }) })), gx, h + 0.25, gz, 0.4);
      rb.geo(new THREE.TorusGeometry(0.15, 0.008, 6, 28, Math.PI), brass, gx, h + 0.25, gz, 0, 0, 0.4); rb.geo(cylY(0.06, 0.1, 14, false, 0.08), C("#3a2414"), gx, h, gz); }
    // the sunburst clock's hands (the second hand ticks every whole second of the video clock)
    { const sx = -0.62, sy = 2.66, sz = -Z + 0.05; for (const [L, w, k] of [[0.04, 0.008, 0], [0.055, 0.005, 1], [0.06, 0.002, 2]] as number[][]) {
      const hm = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.002).translate(0, L / 2 - 0.008, 0), basic("ofHand" + k, () => ({ color: k === 2 ? new THREE.Color("#a8201a") : new THREE.Color("#1a1420") })));
      hm.position.set(o[0] + sx, o[1] + sy, o[2] + sz + k * 0.001); hm.layers.set(NOINK); g.add(hm); this.ofHands.push(hm); } }
    // the blind's pull cord with a brass acorn, swaying in the breeze
    { const cg = this.ofCord; cg.position.set(o[0] + OF.window.c[0] + 0.95, o[1] + OF.window.c[1] + 0.58, o[2] - Z + 0.03); g.add(cg);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.62, 5).translate(0, -0.31, 0), C("#e8dcc0")); cg.add(cord);
      const ac = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8).scale(1, 1.4, 1), brass); ac.position.y = -0.64; ac.castShadow = true; cg.add(ac); }
  }

  // ================================================================================================ POSE (every frame)
  pose(ctx: SetCtx) {
    VF = ctx.vf;
    const L = ctx.light, f = ctx.f, id = ctx.id, set = ctx.shot.set, cam = ctx.cam;
    // ---- shared-uniform extras for this World ----
    this.rim.set(...(L.rim ?? [0, 0, 0])); this.ws.set(...(L.woodShade ?? [1, 1, 1])); this.wl.set(...(L.woodLift ?? [0, 0, 0])); this.wk = L.woodK ?? 0;
    this.fill.set(...(L.fill ?? [0, 0, 0])); this.poolDom = set === "pumproom" ? 3.0 : 0;
    if (!(set === "tanktop" || set === "tankfarm" || set === "street")) this.rim.set(0, 0, 0);
    this.bank.visible = set === "bank"; this.trading.visible = set === "trading"; this.cut.visible = set === "cutaway";
    this.kitchen.visible = set === "kitchen"; this.pump.visible = set === "pumproom"; this.office.visible = set === "office";
    for (let i = 0; i < INT_POOLS; i++) { const P = this.pools[i]; P.c.copy(this.poolCol[i]); P.p.copy(this.poolP0[i]); P.r = this.poolR0[i]; }
    { const P = this.pools[PO.x17]; if (set === "cutaway") { P.p.set(CU.base[0] + 0.7, CU.base[1] + 9.6, CU.base[2] - 0.9); P.c.set(0.55, 0.4, 0.18); P.r = 2.3; }
      else { P.p.set(PR.base[0] - 5.2, PR.base[1] + 3.1, PR.base[2] - 3.6); P.c.set(0.06, 0.12, 0.34); P.r = 2.8; } }
    this.layoutPools(set, id);
    const t = vsec();
    if (this.bank.visible) this.poseBank(id, f, t, cam);
    if (this.trading.visible) this.poseTrading(f, t, cam);
    if (this.cut.visible) this.poseCut(id, f, t, cam);
    if (this.kitchen.visible) this.poseKitchen(f, t, cam);
    if (this.pump.visible) this.posePump(f, t, cam);
    if (this.office.visible) this.poseOffice(id, f, t, cam);
    this.poseShafts(cam, () => 1);
  }

  private poseBank(id: number, f: number, t: number, cam: THREE.Camera) {
    const o = BK.base;
    // fix r2: the desk (+ everything on it) hides in shot 6 (A2 P1); the lamp moves per shot; the shot-5 floor bills
    this.deskG.visible = id !== 6; this.bkFloor5.visible = id === 5; this.box6.visible = id === 6;
    { const L = BK_LAMP[id]; this.lampG.visible = !!L; if (L) { this.lampG.position.set(o[0] + L[0], o[1] + 0.785, o[2] + L[1]); this.lampG.rotation.y = L[2]; } }
    // the venetian-blind daylight: shot 5 on the back wall (drifts ~0.5 px/f, a passing cloud dims it ~10 % every ~2 s),
    // shot 3 across the desk's right half + the carpet
    { const dim = 0.9 + 0.1 * (0.5 + 0.5 * vs(3.1)), s5 = SHOTS[4].a;
      // fix r3 (A3 P3 #26: the stripes read warm white): cool daylight #CFE0F5-class stripes (less red, more blue)
      this.blinds5.visible = id === 5; if (id === 5) { this.blinds5.position.x = o[0] - 0.55 + 0.0011 * (f - s5); (this.blinds5.material as THREE.MeshBasicMaterial).color.setRGB(0.12 * dim, 0.19 * dim, 0.34 * dim); }
      this.blindsF.visible = this.blindsC.visible = id === 3; if (id === 3) { (this.blindsF.material as THREE.MeshBasicMaterial).color.setRGB(0.07 * dim, 0.12 * dim, 0.22 * dim); (this.blindsC.material as THREE.MeshBasicMaterial).color.setRGB(0.05 * dim, 0.08 * dim, 0.15 * dim); } }
    // shot 3 window life: a pigeon hops along the outside sill; a far ship drifts with a smoking funnel
    { const on = id === 3; this.pigeon.visible = on; this.shipM.visible = on; this.funnel.forEach((m) => { m.visible = on; });
      if (on) { const cyc = 40, n = Math.floor(VF / cyc), ph = VF - n * cyc, hop = ph < 8 ? Math.sin((Math.PI * ph) / 8) : 0, pr = (n % 3) + sm(Math.min(1, ph / 8)), fw = n % 6 < 3;
        this.pigeon.position.set(o[0] + (fw ? 1.45 + 0.09 * pr : 1.72 - 0.09 * pr), o[1] + 1.082 + 0.03 * hop, o[2] - 3.66); this.pigeon.scale.x = fw ? -1 : 1;
        const pm = this.pigeon.material as THREE.MeshBasicMaterial, ptx = pigeonTex(hop > 0.25 ? 1 : 0); if (pm.map !== ptx) { pm.map = ptx; pm.needsUpdate = true; }
        const sx = o[0] + 3.35 - 0.0008 * (f - SHOTS[2].a); this.shipM.position.x = sx;
        this.funnel.forEach((m, i) => { const a = ((VF / 80 + i / 3) % 1 + 1) % 1; m.position.set(sx + 0.145 + 0.05 * a + 0.015 * Math.sin(VF * 0.05 + i * 2), o[1] + 1.72 + 0.28 * a, o[2] - 6.47); m.scale.set(0.7 + 1.1 * a, 0.5 + 0.7 * a, 1); (m.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.sin(Math.PI * a); }); } }
    // the 3D rubber stamp: carryover r1 (binding) - the banker holds the stamp (CHAR) in shots 3 / 5, so the prop is
    // hidden there; it rests on the ink pad elsewhere
    this.stamp.visible = id !== 3 && id !== 5;
    this.stamp.position.set(o[0] + PAD[0], o[1] + PAD[1] + 0.018, o[2] + PAD[2]); this.stamp.quaternion.identity();
    this.rcG.visible = id !== 5;
    const shown = id !== 3 || f >= BEAT.money + 2; this.approved.visible = shown;
    if (shown) { const k = id === 3 ? clamp01((f - BEAT.money - 2) / 4) : 1; this.approved.scale.setScalar(1.18 - 0.18 * outCubic(k)); (this.approved.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.6 * k; }
    // the LOANS nameplate: shot 3 right of the cash, shot 5 between the left and middle stacks (A1 P2)
    const np = NAMEPLATE[id]; this.nameplate.visible = !!np;
    if (np) { this.nameplate.position.set(o[0] + np[0], o[1] + np[1], o[2] + np[2]); this.nameplate.rotation.y = id === 3 ? -0.35 : -0.05; }
    // shot 3: the bundles slide across on "against it"
    // fix r3 (A3 P2 shot 3): Tino's sleeve reaches in from frame right, takes the cash and pulls it out of frame
    const tk3 = sm((f - (TINO_GRAB + 2)) / (TINO_OUT - TINO_GRAB - 2));
    this.cash.visible = id === 3 && tk3 < 1;
    if (id === 3) { const u = cashSlide(f); /* fix1 LEAD: the banker's hand rides cast.ts cashSlide */
      const bx = lerp(BK.cash[0], BK.cashTo[0], u), bz = lerp(BK.cash[2], BK.cashTo[2], u);
      this.cash.position.set(o[0] + lerp(bx, CASH_OUT[0], tk3), o[1] + lerp(BK.cash[1], CASH_OUT[1], tk3) + 0.05 * Math.sin(Math.PI * tk3), o[2] + lerp(bz, CASH_OUT[2], tk3));
      this.cash.rotation.y = 0.12 * Math.sin(Math.PI * clamp01((f - BEAT.againstIt) / 16)) - 0.25 * tk3; }
    { const on = id === 3 && f >= TINO_IN && f < TINO_OUT + 1; this.sleeve.visible = on;
      if (on) { const c = this.cash.position, grip = V(c.x + 0.06, c.y + 0.05, c.z + 0.02), off = V(o[0] + CASH_OUT[0] + 0.25, o[1] + CASH_OUT[1] + 0.06, o[2] + CASH_OUT[2]);
        const kin = sm((f - TINO_IN) / (TINO_GRAB - TINO_IN)), p = f < TINO_GRAB ? off.clone().lerp(grip, kin) : grip;
        this.sleeve.position.copy(p); this.sleeve.quaternion.copy(cam.quaternion); this.sleeve.rotateZ(0.12 + 0.06 * Math.sin(Math.PI * kin)); } }
    // the adding machine's cash drawer: out on the "ka-ching" (againstIt + 26, 4 f), held, back in 6 f
    { const d = f - (BEAT.againstIt + 26), out = d < 0 ? 0 : d < 4 ? outBack(d / 4, 1.4) : d < 8 ? 1 : 1 - sm((d - 8) / 6);
      this.addDrawer.position.z = o[2] - 0.6 + 0.075 * (id === 3 ? out : 0); }
    // shot 5 (A1 P1): 4 bundles each to start; on "more" +4 / +3 / +4, on the second "more" +5 / +2 / +5 (the middle stack
    // caps at 9, a V that frames his grin). The middle POPS onto its top (0 -> 1.12 -> 1 over 4 f); the outer stacks DROP
    // in from 0.40 m over 8 f, tilted 0.45 rad toward the lens (bill face + band show) easing flat, a 2 f squash on landing
    // fix r3 (carryover + CHAR P2): the outer stacks also pop one bundle at each stamp landing on them (landing + 9) and the
    // top bundle the stamp hits turns red-banded 1 f after the landing (stamp -> red mark -> the stack grows)
    const sched = (si: number) => { const mid = si === 1, n1 = mid ? 7 : 8, off = mid ? 1 : si, ts: number[] = [];
      for (let j = 0; j < (mid ? 9 : 13); j++) ts.push(j < 4 ? -1e9 : j < n1 ? BEAT.more1 - 2 + (j - 4) * 2.5 + off : BEAT.more2 - 2 + (j - n1) * 2.2 + off);
      if (!mid) for (const c of STAMP_ON[si === 0 ? 0 : 1]) ts.push(c + STAMP_POP);
      return ts.sort((a, b) => a - b); };
    const S5 = [sched(0), sched(1), sched(2)];
    this.stacks.forEach((list, si) => list.forEach((m, j) => {
      if (id !== 5) { m.visible = false; return; }
      const mid = si === 1, t0 = S5[si][j];
      { const marks = mid ? [] : STAMP_ON[si === 0 ? 0 : 1].filter((c) => f >= c + 1 && S5[si].filter((x) => x <= c).length - 1 === j), mats = this.bmStack[marks.length ? 1 : 0];
        if (mats && m.material !== mats) m.material = mats; }
      const b = m.userData.base as THREE.Vector3;
      // fix r2 (A2 P1 shot 5: the outer bundles fell as thin edge-on slats that read as glitches): EVERY stack pops its new
      // bundle onto its top (0 -> 1.12 -> 1 over 4 f) with a 0.06 m settle drop and a 2 f squash on landing; staggered
      void mid;
      const u = (f - (t0 - 4)) / 4; m.visible = u >= 0;
      const s = u >= 1 ? 1 : u < 0.6 ? 1.12 * sm(u / 0.6) : 1.12 - 0.12 * sm((u - 0.6) / 0.4), land = f - t0, sq = land >= 0 && land < 2 ? 0.84 : 1, drop = 0.06 * (1 - sm(clamp01(u)));
      m.position.set(b.x, b.y + drop, b.z); m.scale.set(Math.max(0.001, s * (sq < 1 ? 1.08 : 1)), Math.max(0.001, s * sq), Math.max(0.001, s)); m.rotation.set(0, m.userData.yaw, 0);
    }));
    // loose bills flutter down beside the stacks on each "more" (26 f, a rocking fall, then lie flat)
    for (const B of this.bills) {
      const d = f - B.t, on = id === 5 && d >= 0; B.m.visible = on; if (!on) continue;
      const u = clamp01(d / 26), y = lerp(1.62, 0.792, sm(u)), sw = (1 - u) * 0.06 * Math.sin(d * 0.42 + B.ph);
      B.m.position.set(o[0] + B.x + sw, o[1] + y, o[2] + B.z + 0.02 * Math.cos(d * 0.3 + B.ph));
      // face the lens while they fall (a flat bill seen from desk height is edge-on), flattening only as they land
      B.m.rotation.set(lerp(-0.35 + 0.45 * Math.sin(d * 0.33 + B.ph), -Math.PI / 2, sm((u - 0.55) / 0.45)), (1 - u) * 0.6 * Math.sin(d * 0.21 + B.ph), (1 - u) * 0.7 * Math.cos(d * 0.29 + B.ph));
    }
    // fix r3 (A3 P2 shot 5: the bottom third was a dead desk front): bills slide off the desk's front edge on each "more"
    // and flutter down the desk front to the floor (30 f, rocking)
    for (const B of this.frontBills) { const d = f - B.t, on = id === 5 && d >= 0 && d < 40; B.m.visible = on; if (!on) continue;
      const u = clamp01(d / 30), y = lerp(0.79, 0.008, u * u * (3 - 2 * u)), z = lerp(-0.33, -0.05 + 0.1 * Math.sin(B.ph), u), sw = (1 - u) * 0.07 * Math.sin(d * 0.38 + B.ph);
      B.m.position.set(o[0] + B.x + sw + 0.04 * u, o[1] + y, o[2] + z);
      B.m.rotation.set(lerp(-0.2 + 0.5 * Math.sin(d * 0.31 + B.ph), -Math.PI / 2, sm((u - 0.7) / 0.3)), (1 - u) * 0.5 * Math.sin(d * 0.23 + B.ph), (1 - u) * 0.8 * Math.cos(d * 0.27 + B.ph)); }
    // shot 6: the vault door's steel is a dark gunmetal behind Tino (his grey suit pops), light steel elsewhere
    this.vaultSteel.color.set(id === 6 ? "#4e5562" : "#b4b8be");
    // the receipt piles: a fresh stamped sheet slides onto pile (i % 2) at each stamp landing
    for (const S of this.pileSheets) { const d = f - S.t; S.m.visible = id === 5 && d >= 0; if (S.m.visible && d < 6) { const k = sm(d / 6); S.m.position.y = o[1] + PILES[S.pile][1] + 0.003 + S.k * 0.0035 + 0.06 * (1 - k); } else if (S.m.visible) S.m.position.y = o[1] + PILES[S.pile][1] + 0.003 + S.k * 0.0035; }
    // the adding machine's tape grows +0.15 m on each "more" (base 0.32 m)
    { const L = 0.32 + 0.16 * sm((f - BEAT.more1) / 10) + 0.16 * sm((f - BEAT.more2) / 10), n = id === 5 ? Math.round(clamp01(L / 0.98) * this.addTapeN) : Math.round((0.32 / 0.98) * this.addTapeN);
      this.addTape.geometry.setDrawRange(0, n * 6); this.addTape.visible = id !== 6; }
    // shot 6: Tino's drums drop in (3 -> 10 on "more" -> 36 on "United"); A1 P3: each drum's start height is clamped
    // below the TINO'S OIL title rule, so no drum falls across the title. After landing the top drum rocks +-4 deg
    // (40 f cycle) and a star glint sweeps the pyramid on "had"
    this.drums.forEach((m, i) => {
      const s = this.drumSlot[i]; if (id !== 6) { m.visible = true; m.scale.set(1, 1, 1); return; }
      const u = clamp01((f - (s.t - 6)) / 6); m.visible = f >= s.t - 6;
      const lift = (1 - u * u) * Math.min(0.32, Math.max(0.03, 0.29 - s.v)), sq = f >= s.t && f < s.t + 8 ? 1 - 0.2 * Math.exp(-(f - s.t) / 2) * Math.cos((f - s.t) * 1.5) : 1;
      const ch = BK.chart, at = (uu: number, v: number) => [o[0] + ch.c[0] + Math.cos(ch.yaw) * uu + Math.sin(ch.yaw) * (0.012 + s.row * 0.0015), o[1] + ch.c[1] + v, o[2] + ch.c[2] - Math.sin(ch.yaw) * uu + Math.cos(ch.yaw) * (0.012 + s.row * 0.0015)];
      const P = at(s.u, s.v + lift - (1 - sq) * 0.04); m.position.set(P[0], P[1], P[2]); m.scale.set(1 + (1 - sq) * 0.6, sq, 1);
      // fix r3 (carryover + ADD #44): ONE jelly wobble of the whole TINO'S OIL pyramid on "had" (rows lag 1 f each, a
      // squash-stretch decaying over ~16 f), the top drum rocks +-4 deg for 12 f after it
      const dh = f - BEAT.had - s.row, wob = dh >= 0 ? 0.07 * Math.exp(-dh / 5) * Math.sin(dh * 1.1) : 0;
      if (wob !== 0 && f >= s.t) { m.scale.set(m.scale.x * (1 - 0.6 * wob), m.scale.y * (1 + wob), 1); m.position.y += 0.05 * wob * (1 + s.row * 0.4); }
      const dr = f - BEAT.had - 8, rock = s.row === 7 && dr >= 0 && dr < 14 ? THREE.MathUtils.degToRad(4) * Math.sin((TAU * dr) / 12) * (1 - dr / 14) : 0;
      m.rotation.set(0, BK.chart.yaw, rock);
    });
    if (id === 6) {
      // the tray stack of receipts grows with each pile stage; the tick draws itself under the pile on "had"
      const nTray = 3 + (f >= BEAT.moreOf ? 3 : 0) + (f >= BEAT.united ? 3 : 0); this.trayStack.forEach((m, k) => { m.visible = k < nTray; });
      const tk = clamp01((f - BEAT.had + 2) / 9); this.tick.visible = tk > 0; this.tick.scale.set(Math.max(0.001, tk), 1, 1);
      this.tick.position.copy(this.tickBase(tk));
      // fix r3 (ADD #44): a 4-point star glint pops ON the top drum after the wobble settles (had + 6, 8 f)
      const gk = (f - BEAT.had - 6) / 8; this.glint6.visible = gk > 0 && gk < 1;
      if (this.glint6.visible) { const ch = BK.chart, top = this.drumSlot.find((d) => d.row === 7), uu = (top?.u ?? 0.4) + 0.025, vv = (top?.v ?? 0.27) + 0.03;
        this.glint6.position.set(o[0] + ch.c[0] + Math.cos(ch.yaw) * uu + Math.sin(ch.yaw) * 0.04, o[1] + ch.c[1] + vv, o[2] + ch.c[2] - Math.sin(ch.yaw) * uu + Math.cos(ch.yaw) * 0.04);
        this.glint6.scale.setScalar(0.2 * Math.sin(Math.PI * gk)); this.glint6.material.rotation = 0.3 + gk * 0.8; }
    } else { this.tick.visible = false; this.glint6.visible = false; this.trayStack.forEach((m, k) => { m.visible = k < 9; }); }
    // shot 3 window (A1 P1): three khaki inspectors walk in from the gate side on "sent", the lead stops and points up at
    // the far tank on "check" (12 f raise); steps every 10 f with a 4 % bob; soft contact shadows on the yard
    // fix r2 (A2 P2 shot 3): 1.7x bigger on the near YARD ramp just beyond the glass, walking in from the right edge,
    // DIAGONALLY right-to-left and away toward the bigger far tank (a file of three, 9 f apart), a 2 Hz step with a bob;
    // the lead stops and points up at the tank on "check"; soft contact shadows lying on the ramp
    { const w0 = BEAT.sent - 14, stopAt = BEAT.check - 4, sp = 0.02, dir = [-0.912, -0.41], ra = Math.atan2(0.32, 0.8);
      const yardY = (z: number) => lerp(1.08, 1.4, clamp01((-3.75 - z) / 0.8));
      this.insp.forEach((m, k) => {
        const st = w0 + 9 * k, on = id === 3 && f >= st; m.visible = on; this.inspSh[k].visible = on; if (!on) return;
        const walking = f < stopAt, d = (Math.min(f, stopAt) - st) * sp, x = 2.85 + dir[0] * d, z = -3.86 + dir[1] * d;
        const step = Math.floor((f - st) / 7.5) % 2, point = k === 0 && f >= BEAT.check - 2, fr = point ? 2 : walking ? step : 0;
        const mat = m.material as THREE.MeshBasicMaterial, tex = inspTex(k, fr); if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
        const bob = walking ? 0.018 * Math.abs(Math.sin((Math.PI * (f - st)) / 7.5)) : point ? 0.008 * sm((f - BEAT.check + 2) / 12) : 0, gy = yardY(z);
        m.position.set(o[0] + x, o[1] + gy + 0.262 + bob, o[2] + z);
        const sh = this.inspSh[k]; sh.position.set(o[0] + x + 0.03, o[1] + gy + 0.006, o[2] + z); sh.rotation.set(ra - Math.PI / 2, 0, 0);
      }); }
    // window life (shot 3): a tanker truck rolls slowly along the far road, two gulls glide, the flag on the far tank waves
    { const s3 = SHOTS[2], tt = (f - s3.a) / FPS; this.truck.position.x = o[0] + 1.3 + 0.05 * tt; this.truck.visible = id === 3;
      this.gulls.forEach((m, k) => { const a = tt * 0.32 + k * 2.4; m.position.set(o[0] + 1.75 + 0.55 * Math.sin(a), o[1] + 2.25 + 0.08 * k + 0.05 * Math.sin(a * 1.7), o[2] - 6.3);
        const mat = m.material as THREE.MeshBasicMaterial, tex = gullTex(Math.floor(VF / 7 + k) % 2); if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; } m.scale.x = Math.cos(a) > 0 ? 1 : -1; m.visible = id === 3; });
      const fp = this.flag.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < fp.count; i++) { const xx = fp.getX(i); fp.setZ(i, 0.006 * (xx / 0.07) * Math.sin(xx * 90 - VF * 0.5)); } fp.needsUpdate = true; }
    // cigar smoke (S-curls rising, staggered), the paper corner in the fan's breeze
    this.smoke.forEach((s, i) => { const a = ((VF / 90 + i / 3) % 1 + 1) % 1; s.position.y = o[1] + 0.86 + 0.24 * a; s.position.x = o[0] - 0.12 + 0.093 + 0.03 * Math.sin(VF * 0.05 + i * 2) * a; s.scale.set(0.8 + a, 0.7 + 0.6 * a, 1); (s.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * a) * 0.75; });
    this.paperFlap.rotation.set(-Math.PI / 2 + 0.12 + 0.1 * Math.max(0, vs(0.55)) * (0.6 + 0.4 * vs(9.4, 1)), 0, 0.3);
    // fan + clocks + motes. A1 ADD shot 6: on "Soon," the shot-6 clock's minute hand spins two eased full turns (time
    // passing), then ticks on
    this.fanHead.rotation.y = 0.65 * vs(0.55) - 0.25; this.fanBlades.rotation.z = -VF * 0.95;
    const sec = Math.floor(t), tk = sec + Math.min(1, (t - sec) * 6), spin = id === 6 ? 2 * TAU * sm((f - BEAT.soon) / 34) : 0;
    this.bkHands[2].rotation.z = -((tk + 12) / 60) * TAU; this.bkHands[1].rotation.z = -((14 + t / 60) / 60) * TAU - spin; this.bkHands[0].rotation.z = -((10 + 14 / 60) / 12) * TAU - spin / 12;
    this.bkHands3[2].rotation.z = -((tk + 41) / 60) * TAU; this.bkHands3[1].rotation.z = -((52 + t / 60) / 60) * TAU; this.bkHands3[0].rotation.z = -((2 + 52 / 60) / 12) * TAU;
    this.bkMotes.pose(t, 2); this.bkMotes6.pose(t, 6);
    // A1 ADD: the sconces' glow flickers 2-3 %, the lamp a hair
    this.pools[PO.bkSconce].c.multiplyScalar(1 + 0.025 * vs(9.7) + 0.012 * vs(23.3, 1)); this.pools[PO.bkLamp].c.multiplyScalar(1 + 0.01 * vs(13.1, 2));
  }
  /** the shot-6 tick decal grows from its left end (scale.x about the left edge) */
  private tickBase(k: number) {
    const o = BK.base, ch = BK.chart, uu = 0.4 - 0.11 * (1 - k), v = -0.405 - 0.055;
    return V(o[0] + ch.c[0] + Math.cos(ch.yaw) * uu + Math.sin(ch.yaw) * 0.016, o[1] + ch.c[1] + v, o[2] + ch.c[2] - Math.sin(ch.yaw) * uu + Math.cos(ch.yaw) * 0.016);
  }
  private poseTrading(f: number, t: number, cam: THREE.Camera) {
    // chalk: the pre-crash line creeps on (index 7 -> 9 by crashed - 8), then the dive draws in 9 f; the red arrow pops
    // fix r1 (A1 P2): the line climbs in 3 chalk steps on "November", "big" and "oil" (12 f each, a dust puff at the
    // tip), peaks just before "crashed", then DIVES on "crashed" (9 f) with a chalk-dust burst at its end
    const preQ = this.chalkT.filter((v) => v === 0).length, sub = 8, c1 = BEAT.crashed1;
    const steps = [BEAT.november, PW(14, "big"), PW(14, "oil")], marks = [3 * sub, 5 * sub, 7 * sub, preQ];
    let preDrawn = marks[0]; steps.forEach((st, i) => { preDrawn += (marks[i + 1] - marks[i]) * sm((f - st + 1) / 12); });
    const dive = clamp01((f - c1 + 1) / 9), drawn = preDrawn + (this.chalkN - preQ) * (f >= c1 - 1 ? outCubic(dive) : 0), n = Math.min(this.chalkN, Math.floor(drawn));
    this.chalk.geometry.setDrawRange(0, n * 6);
    { const tipI = Math.max(0, Math.min(this.chalkPts.length - 1, Math.floor(drawn / 1))), tip = this.chalkPts[Math.min(this.chalkPts.length - 1, tipI)];
      const evs = [...steps.map((st) => st + 11), c1 + 8], last = evs.filter((e) => f >= e).pop();
      this.dust.forEach((d, k) => { const age = last === undefined ? 99 : f - last, big = last === c1 + 8 ? 1.8 : 1, on = age < 16; d.visible = on; if (!on) return;
        const a = (k / this.dust.length) * TAU + hash(k + (last ?? 0)) * 0.8, rr = (0.05 + 0.18 * (age / 16)) * big;
        d.position.set(tip.x + Math.cos(a) * rr, tip.y + Math.sin(a) * rr * 0.8 + 0.02 * age / 16, tip.z + 0.02); d.scale.setScalar((0.07 + 0.1 * age / 16) * big); d.material.opacity = 0.75 * (1 - age / 16); }); }
    const ap = clamp01((f - c1 - 8) / 5); this.arrow.visible = ap > 0; this.arrow.scale.setScalar(0.4 + 0.6 * outBack(ap)); (this.arrow.material as THREE.MeshBasicMaterial).opacity = ap;
    for (const m of this.rainMats) if (m.map) { m.map.offset.y = (VF * 0.035) % 1; }
    // A1 ADD: a lightning flash in the tall windows on the thunder (picture event thunder_8 = 1400): 3 f, the storm leaks in
    // fix r2: the flash rides the shared FLASHES schedule (SHOTS[8].a - 7)
    { const th = SHOTS[8].a - 7, fl = f >= th - 1 && f < th + 3 ? (f < th + 1 ? 1 : 0.55) : 0; for (const m of this.trWinMats) m.color.setScalar(0.92 + 0.9 * fl);
      for (const S of this.shafts) if (S.mesh.parent === this.trading) S.k.setRGB(0.1, 0.13, 0.19).multiplyScalar(1 + 2.2 * fl); }
    if (this.gobo.material instanceof THREE.MeshBasicMaterial && this.gobo.material.map) this.gobo.material.map.offset.set(VF * 0.0015, -VF * 0.006);
    this.dripS.forEach((d, k) => { const D = this.trDrips[k], ph = ((VF / 26 + D.ph) % 1 + 1) % 1; d.position.set(TR.base[0] + D.x, TR.base[1] + D.y - (D.y - 0.01) * Math.min(1, ph * ph * 1.6), TR.base[2] + D.z); d.visible = ph < 0.62; });
    const sec = Math.floor(t), tk = sec + Math.min(1, (t - sec) * 6);
    this.trHands[2].rotation.z = -((tk + 40) / 60) * TAU; this.trHands[1].rotation.z = -((52 + t / 60) / 60) * TAU; this.trHands[0].rotation.z = -((2 + 52 / 60) / 12) * TAU;
    this.fans.forEach((fg, i) => { fg.rotation.y = vph(1.6) + i * 0.7; });
    // fix r3 (ADD #48): on the THOOM ("crashed") the pendants swing ~3 deg and settle over ~40 f; their floor pools sway along
    { const d = f - BEAT.crashed1, sw = d >= 0 ? 0.052 * Math.exp(-d / 18) * Math.sin(d * 0.11) : 0;
      this.pendants.forEach((pg, i) => { pg.rotation.z = 0.006 * vs(0.7, i * 1.3) + sw * (1 - 0.15 * i); pg.rotation.x = 0.005 * vs(0.55, i * 2.1) + 0.4 * sw * Math.cos(i);
        const P = this.pools[5 + i]; if (P) P.p.x -= 1.55 * pg.rotation.z; }); }
    // fix r3: the board boy's ladder rolls along the line (5 f behind the tip), he climbs rung by rung, his chalk hand ON the
    // tip; on "crashed" he slips a rung (6 f), clutches the rails and the ladder rolls off to the right with him
    { const o = TR.base, c1 = BEAT.crashed1, tipOf = (ff: number) => this.chalkPts[Math.max(0, Math.min(this.chalkPts.length - 1, Math.floor(this.chalkDrawn(ff))))];
      const tL = tipOf(Math.min(f - 5, c1 - 2)), tN = tipOf(Math.min(f, c1 - 2)), roll = 1.9 * sm((f - c1 - 2) / 16) ** 1.4;
      const lx = tL.x + 0.44 + roll, rr = (tL.y - o[1] - 1.5) / 0.3, n0 = Math.floor(rr), rung = Math.max(3, Math.min(9, n0 + sm((rr - n0 - 0.3) / 0.4)));
      const slip = f >= c1 ? 0.3 * sm((f - c1) / 6) - 0.03 * Math.sin(Math.PI * clamp01((f - c1 - 6) / 6)) : 0, feet = 0.42 + 0.3 * rung - slip;
      const lean = (h: number) => lerp(-5.3, -5.86, h / 3.3);
      this.ladder.position.set(lx, o[1] + 0.42, o[2] + lean(0) ); this.ladder.rotation.set(-Math.atan2(0.56, 3.3), 0, 0);
      const bzz = o[2] + lean(feet - 0.42) + 0.14, shock = f >= c1;
      this.boy.position.set(lx + 0.02, o[1] + feet + 0.58, bzz); this.boy.rotation.set(0, 0, shock ? 0.05 * Math.sin((f - c1) * 0.6) * Math.exp(-(f - c1) / 10) : 0);
      const tex = boardBoyTex(shock ? 1 : 0); if (this.boyMat.map !== tex) { this.boyMat.map = tex; this.boyMat.needsUpdate = true; }
      this.boyArm.visible = this.boyHand.visible = !shock;
      if (!shock) { const sh = V(lx - 0.15, o[1] + feet + 0.93, bzz + 0.02), tip = V(tN.x, tN.y, tN.z + 0.03), d = tip.clone().sub(sh), L = d.length();
        this.boyArm.position.copy(sh); this.boyArm.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); this.boyArm.scale.set(1, L, 1); this.boyHand.position.copy(tip); } }
    // the ticker: tape spools (scrolls) on the video clock, the bell hammer flicks on "November" (tickbell_8) and idles
    { const tm = TM("trTapeSpool", tapeTex3) as THREE.MeshLambertMaterial; if (tm.map) tm.map.offset.y = -((VF * 0.045) % 1);
      const d = f - BEAT.november, flick = d >= -2 && d < 8 ? (d < 0 ? -0.25 * sm((d + 2) / 2) : -0.25 + 0.85 * Math.exp(-d / 2.5) * Math.cos(d * 1.4)) : 0;
      this.tickHammer.rotation.z = 0.2 + flick; }
    // fix r2: the pit crowd waves slips on its own clocks (2-frame arm swaps, a small hop on each), phones stay at ears;
    // after "crashed" they clutch their heads (staggered 2-10 f); the dropped handset swings on its cord; ashtray smoke
    this.trCards.forEach((c) => {
      const crash = f >= BEAT.crashed1 + 2 + (c.v % 5) * 2, n = Math.floor((VF + c.ph) / c.per), fr = crash ? 3 : c.phone ? 2 : n % 2;
      const tex = trTraderTex(c.v, fr); if (c.mat.map !== tex) { c.mat.map = tex; c.mat.needsUpdate = true; }
      const ph = (VF + c.ph) - n * c.per; c.m.position.y = c.base + (crash ? 0 : 0.03 * Math.max(0, Math.sin((Math.PI * ph) / 7)) * (ph < 7 ? 1 : 0));
    });
    this.handset.rotation.z = 0.1 * vs(4.4, 0.7) + 0.03 * vs(9.1); this.handset.rotation.x = 0.06 * vs(3.1, 2.1);
    this.trSmoke.forEach((m, i) => { const a = ((VF / 85 + i / 2) % 1 + 1) % 1; m.position.y = TR.base[1] + 0.86 + 0.3 * a; m.position.x = TR.base[0] + 0.78 + 0.84 + 0.03 * Math.sin(VF * 0.05 + i * 2) * a; m.scale.set(0.8 + a, 0.7 + 0.6 * a, 1); (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * a) * 0.7; });
    // ticker tape: each piece falls from t0 with a flutter, lands and lies still
    const o = TR.base;
    for (const p of this.tape) {
      const dt = (f - p.t0) / FPS, on = dt >= 0; p.m.visible = on; if (!on) continue;
      const y = p.y0 - p.sp * dt * 1.6;
      p.m.scale.setScalar(Math.min(1, 0.3 + 0.7 * dt * FPS / 4));
      if (y > 0.02) { p.m.position.set(o[0] + p.x + 0.25 * Math.sin(dt * 2.2 + p.ph), o[1] + y, o[2] + p.z + 0.15 * Math.cos(dt * 1.7 + p.ph)); p.m.rotation.set(0.6 * Math.sin(dt * 3.1 + p.ph), dt * (1.5 + p.spin * 6) + p.ph, 0.5 * Math.cos(dt * 2.5 + p.ph)); }
      else { p.m.position.set(o[0] + p.x, o[1] + 0.01, o[2] + p.z); p.m.rotation.set(-Math.PI / 2, 0, p.ph); }
    }
    void cam;
  }

  private poseCut(id: number, f: number, t: number, cam: THREE.Camera) {
    const o = CU.base, T = CU.tank, B = 0.27, hc = CU.hatch.c;
    // shot 10 (A1 P1): DARK until "mostly", then an 18 f relight floods the body clear (a light change on the beat)
    // fix r2 (A2 P3 #32): the brighten finishes BY "water" (it starts 2 f before "mostly")
    const rev = id === 10 ? sm((f - (BEAT.mostly - 2)) / Math.max(6, BEAT.water - BEAT.mostly + 2)) : 1, dark = 1 - rev;
    // shot 12: fix r2 (A2 P3 #37): the water rises from "Fill" + 4 over 45 f (ease in / out; cast.ts's fish rides the same
    // curve: lead_requests), then a thin oil pour ("thin" .. "oil" + 10) whose LENS spreads from the centre to both walls
    // over 16 f once the stream lands (A2 P2 #21), with a glint at each wall
    const fill12 = smooth((f - (BEAT.fill + 4)) / 45);
    const lv = id === 12 ? lerp(0.75, CUW, fill12) : CUW;
    const ok = id === 12 ? clamp01((f - BEAT.thin) / (BEAT.oilIn + 14 - BEAT.thin)) : 1;
    const thick = (CUO - CUW) * (id === 12 ? 0.35 + 0.65 * ok : 1);
    const tHit = BEAT.thin + 5, lens = clamp01((f - tHit) / 16), reach = (T.r - 0.075) * (lens * lens * (3 - 2 * lens) * 0.6 + lens * 0.4);
    const spread = id === 12 ? (f < BEAT.thin + 1 ? -1 : f < tHit ? 0.25 + 1.25 * sm((f - BEAT.thin - 1) / (tHit - BEAT.thin - 1)) : Math.hypot(reach, hc[2])) : 10;
    // the slosh after "water" (fix r2, A2 P2 #18: it tilted like a rigid plank and opened gaps at the walls): a travelling
    // wave on the band (2 crests, <= 0.03 m, decaying over ~20 f), pinned to both walls
    // fix r3 (A3 P2 shot 10: the slosh was ~2 px at 540): 0.10 m, e-fold ~10 f, 2 crests; gold droplets flick off at both
    // walls (8-10 f arcs) and the tape line swings +-4 deg for 16 f
    const ds = f - BEAT.waterEnd + 1, sl = id === 10 && ds >= 0 ? 0.1 * Math.exp(-ds / 10) * sm(ds / 3) : 0, sph = ds * 0.45;
    this.sloshDrops.forEach((s, k) => { const wall = k < 4 ? -1 : 1, d0 = 2 + (k % 4) * 2.5, u = (ds - d0) / 9, on = id === 10 && u >= 0 && u < 1; s.visible = on; if (!on) return;
      const vx = -wall * (0.25 + 0.12 * (k % 4)), vy = 0.55 + 0.18 * hash(k * 3.3);
      s.position.set(o[0] + wall * (T.r - 0.16) + vx * u, CUO + 0.03 + vy * u - 1.1 * u * u, o[2] + 0.07); s.scale.setScalar(0.07 * (1 - 0.4 * u)); });
    { const sw = id === 10 && ds >= 0 && ds < 16 ? THREE.MathUtils.degToRad(4) * Math.sin((TAU * ds) / 16) * (1 - ds / 16) : 0, pv = V(0.66, CU.tank.h + 0.4, CU.hatch.c[2] + 0.46);
      this.tapeG.rotation.z = sw; const rp = pv.clone().applyAxisAngle(V(0, 0, 1), sw); this.tapeG.position.set(o[0] + pv.x - rp.x, o[1] + pv.y - rp.y, o[2]); }
    this.topRim.visible = cam.position.y < o[1] + T.h - 0.2;
    for (const m of this.cuMats) m.uniforms.uT.value = t;
    const [wb, wf, ob, ot] = this.cuMats;
    const pourW = id === 12 && f >= BEAT.fill + 2 && f < BEAT.fill + 53, pourO = id === 12 && f >= BEAT.thin - 3 && f < BEAT.oilIn + 10;
    for (const m of [wb, wf]) { m.uniforms.uLevel.value = lv; m.uniforms.uPour.value = pourW ? 1 : 0; m.uniforms.uDark.value = dark; m.uniforms.uSl.value = sl; m.uniforms.uPh.value = sph; }
    // the hatch-view ripple rings run all the time on a 40 f video-clock cycle (life on the held hatch frames)
    const rip = ((VF / 40) % 1 + 1) % 1;
    for (const m of [ob, ot]) { m.uniforms.uSpread.value = spread; m.uniforms.uRip.value = rip; m.uniforms.uPh.value = sph; }
    ob.uniforms.uSl.value = sl / Math.max(0.05, thick); ot.uniforms.uSl.value = 0;
    ob.uniforms.uHot.value = 1.15 + 0.12 * dark; ot.uniforms.uHot.value = id === 12 && f >= BEAT.hatch - 10 ? 1.1 : 1.0;
    this.oilBand.visible = spread > 0; this.oilBand.position.y = lv; this.oilBand.scale.y = thick;
    this.oilTop.visible = spread > 0; this.oilTop.position.y = lv + thick; this.oilTop.rotation.z = 0;
    this.wTop.position.y = lv + 0.001; this.wTop.visible = true; this.wTop.rotation.z = 0; (this.wTop.material as THREE.MeshBasicMaterial).color.copy(untone("#8ad6f6")).lerp(untone("#1a2a5a"), dark * 0.85);
    // the pipe (shot 12 only): its spout over the hatch; it swings away left after the oil pour, before the crane up
    this.pipe.visible = id === 12; const away = sm((f - BEAT.oilIn - 12) / 24); this.pipe.position.set(o[0] - 3.4 * away, o[1] + 0.7 * away, o[2]);
    const top = this.spout.y, px = o[0] + hc[0], pzz = o[2] + hc[2];
    const wob = (k: number) => 1 + 0.06 * Math.sin(VF * 1.3 + k);
    this.pourW.visible = pourW; this.pourW.position.set(px, lv, pzz); this.pourW.scale.set(wob(0), Math.max(0.01, top - lv), wob(1));
    this.pourO.visible = pourO; this.pourO.position.set(px, lv + thick, pzz); this.pourO.scale.set(wob(2), Math.max(0.01, top - lv - thick), wob(3));
    // splash rings where the stream hits the surface (3 staggered, expanding + fading); gold droplets falling with the
    // oil stream, a few sinking a little then bobbing back up (oil floats)
    this.ripples.forEach((m, k) => { const on = pourW || pourO; m.visible = on; if (!on) return; const ph = ((VF / 14 + k / 3) % 1 + 1) % 1, s = (pourO && !pourW ? 0.25 : 0.4) + ph * 1.1;
      m.position.set(px, (pourW ? lv : lv + thick) + 0.01, pzz); m.scale.set(s, 1, s * 0.9); (m.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - ph); });
    this.drops.forEach((s, k) => { const on = id === 12 && f >= BEAT.thin && f < BEAT.oilIn + 40; s.visible = on; if (!on) return;
      const ph = ((VF / 22 + hash(k * 3.1)) % 1 + 1) % 1, surf = lv + thick, ang = k * 2.4, rr = 0.08 + 0.1 * hash(k);
      if (k < 6 && pourO) s.position.set(px + Math.cos(ang) * rr, lerp(top, surf, ph * ph), pzz + Math.sin(ang) * rr * 0.6);
      else { const bb = ((f - BEAT.thin) / 30 + hash(k)) % 1; s.position.set(px + Math.cos(ang) * (0.4 + k * 0.08), surf - 0.25 * Math.sin(Math.PI * bb) * Math.exp(-bb), pzz + 0.2); }
      s.scale.setScalar(0.07); });
    // bubbles rise in front of the water face (wrap below the surface); hidden while the tank is dark
    // fix r2 (A2 P3 #32): rising bubbles from the first frame, so the dark body reads as water, not space
    this.bubbles.visible = true; (this.bubbles.material as THREE.PointsMaterial).opacity = 0.45 + 0.55 * rev;
    const bp = (this.bubbles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array, nb = bp.length / 3;
    for (let i = 0; i < nb; i++) {
      const sp = 0.25 + 0.35 * hash(i * 1.7), span = Math.max(0.3, lv - B - 0.2), y = B + 0.1 + (((hash(i * 3.3) * span + t * sp) % span) + span) % span;
      const col = i % 4 === 0, bx = col ? [-1.9, 0.6, 2.2][i % 3] + 0.05 * Math.sin(t * 3 + i) : (hash(i * 5.1) - 0.5) * 2 * (T.r - 0.35) + 0.05 * Math.sin(t * 2 + i);
      bp[i * 3] = o[0] + bx; bp[i * 3 + 1] = y; bp[i * 3 + 2] = o[2] + 0.06 + hash(i * 7.7) * 0.15;
    }
    (this.bubbles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    // the murk veil + the flashlight beam sweeping down from the hatch ("Inside..." .. "mostly"), dust in the beam
    this.murk.visible = dark > 0.01; this.murk.scale.y = Math.max(0.01, lv - B - 0.03); (this.murk.material as THREE.MeshBasicMaterial).opacity = 0.72 * dark;
    const sw = clamp01((f - BEAT.inside) / Math.max(1, BEAT.mostly - BEAT.inside)), ba = lerp(-0.42, 0.3, sm(sw)) + 0.04 * Math.sin(VF * 0.11);
    this.beam.d.set(Math.sin(ba), -Math.cos(ba), 0.2).normalize(); this.beam.k.setRGB(0.2, 0.32, 0.36).multiplyScalar(id === 10 ? dark * (1 + 0.08 * Math.sin(VF * 0.31)) : 0);
    this.beam.mesh.visible = id === 10 && dark > 0.01;
    this.beamMotes.pts.visible = id === 10 && dark > 0.05; (this.beamMotes.pts.material as THREE.PointsMaterial).opacity = dark; this.beamMotes.pose(t, 9);
    this.hatchGlow.visible = id === 10 && dark > 0.01; this.hatchGlow.material.opacity = dark; this.hatchGlow.scale.setScalar(0.8 + 0.06 * Math.sin(VF * 0.4));
    // the band's star glint: on the shot-10 open and again on "water"; LOOKS FULL + the "full" sparkle (shot 12)
    const gk = id === 10 ? Math.max(clamp01(1 - Math.abs(f - SHOTS[9].a - 6) / 5), clamp01(1 - Math.abs(f - BEAT.water - 2) / 5)) : 0;
    this.glint10.visible = gk > 0; if (gk > 0) { const gx = f < BEAT.mostly ? lerp(-1.2, 1.4, (f - SHOTS[9].a - 1) / 10) : lerp(-2.2, 0.6, (f - BEAT.water + 3) / 10);
      this.glint10.position.set(o[0] + gx, lv + thick - 0.03 + 0.03 * Math.sin(gx * 4), o[2] + 0.06); this.glint10.scale.setScalar(0.55 * gk); this.glint10.material.rotation = f * 0.06; }
    this.looks.visible = id === 12 && f >= BEAT.hatch - 6;
    // fix r3 (A3 P2 shot 12): the LOOKS FULL sign settles with a 2-cycle 2 deg wobble as it pops in
    if (this.looks.visible) { const u = clamp01((f - BEAT.hatch + 6) / 18); this.looks.scale.setScalar(0.6 + 0.4 * outBack((f - BEAT.hatch + 6) / 8)); this.looks.rotation.z = THREE.MathUtils.degToRad(2) * Math.sin(TAU * 2 * u) * (1 - u); }
    // the "full" sparkle + (ADD #64) a slow 4-point glint on the gold disc every ~40 f through the hatch hold, at a new spot each time
    const spk = id === 12 ? clamp01(1 - Math.abs(f - BEAT.looksFull - 4) / 10) : 0;
    const pc = id === 12 && f >= BEAT.hatch + 4 ? (f - BEAT.hatch - 4) / 40 : -1, pn = Math.floor(pc), pu = (pc - pn) * 40, pk = pc >= 0 && pu < 9 ? Math.sin((Math.PI * pu) / 9) : 0;
    const useP = pk > spk, gx = useP ? (hash(pn * 7.1) - 0.5) * 0.45 : 0.12, gz = useP ? (hash(pn * 3.7) - 0.5) * 0.35 : -0.08;
    this.sparkle.visible = Math.max(spk, pk) > 0; this.sparkle.position.set(o[0] + hc[0] + gx, o[1] + CUO + 0.02, o[2] + hc[2] + gz); this.sparkle.scale.setScalar(0.35 * Math.max(spk, 0.7 * pk)); this.sparkle.material.rotation = useP ? 0.4 + pu * 0.03 : f * 0.05;
    // the bob glints on "water" (shot 10)
    { const bg = id === 10 ? clamp01(1 - Math.abs(f - BEAT.water - 4) / 5) : 0; this.bobGlint.visible = bg > 0; if (bg > 0) this.bobGlint.scale.setScalar(0.32 * bg); }
    // the tyre lets out one bubble every ~40 f (video clock), wobbling up 0.9 m
    { const ph = ((VF / 40) % 1 + 1) % 1, on = (id === 10 ? rev > 0.05 : lv > 1.4); this.tyreBub.visible = on && ph < 0.8;
      this.tyreBub.position.set(o[0] + 1.25 + 0.04 * Math.sin(ph * 14), o[1] + 0.5 + 1.1 * ph, o[2] - 0.6); this.tyreBub.scale.setScalar(0.09 + 0.04 * ph); }
    this.rust.pts.visible = (id === 10 ? rev > 0.05 : lv > 7); this.rust.pose(t, 13);
    // life inside: weed strands sway, silt drifts down (both hidden in the dark), the tape in the hatch (shot 12, after the oil)
    for (const w of this.weeds) { w.m.visible = rev > 0.05 && lv > B + w.h; const pa = w.m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) { const yy = w.base[i * 3 + 1] / w.h; pa.setX(i, w.base[i * 3] + 0.1 * yy * yy * Math.sin(t * 1.3 + w.ph + yy * 2.2) + 0.04 * yy * Math.sin(t * 2.7 + w.ph)); } pa.needsUpdate = true; }
    this.silt.pts.visible = rev > 0.05 && lv > 7; (this.silt.pts.material as THREE.PointsMaterial).opacity = 0.55 * rev; this.silt.pose(t, 3);
    // fix r2 (ADD #58): shot 10 shows the tank man's tape too, its bob resting just under the gold line (they only ever
    // measured the top)
    this.tapeG.visible = (id === 12 && f >= BEAT.oilIn + 18) || id === 10;
    // the gull shadow glides across the roof ~13 f before "full" (fix r2, ADD #67)
    { const gk = (f - (BEAT.looksFull - 30)) / 26, on = id === 12 && gk > 0 && gk < 1; this.gullSh.visible = on;
      if (on) { const x = lerp(-2.0, 1.9, gk), z = hc[2] + 0.55 - 0.5 * gk, rr = Math.hypot(x, z); this.gullSh.position.set(o[0] + x, o[1] + T.h + (T.r - rr) * Math.tan(THREE.MathUtils.degToRad(9)) + 0.012, o[2] + z);
        this.gullSh.rotation.y = 0.2; this.gullSh.scale.x = 1 + 0.12 * Math.sin(gk * 14); (this.gullSh.material as THREE.MeshBasicMaterial).opacity = 0.3 * Math.sin(Math.PI * gk); } }
    // the lens meets each wall: a glint at both ends (8 f)
    { const gk = id === 12 ? clamp01(1 - Math.abs(f - (tHit + 15)) / 5) : 0; this.wallGl.forEach((sp, k) => { sp.visible = gk > 0; if (gk > 0) { sp.position.set(o[0] + (k ? 1 : -1) * (T.r - 0.12), lv + thick, o[2] + 0.07); sp.scale.setScalar(0.45 * gk); sp.material.rotation = f * 0.07 + k; } }); }
    // the WATER tag pops on "water," (outBack 8 f), holds, and shrinks away before the crane up (fix r2, ADD #65)
    // fix r3 (A3 P2 shot 12): WATER pops in 1 f on "water," inside the water body (left third), rides up with the level to
    // ~6 m, pops out in 1 f on "oil," as the OIL tag (pointer up to the layer) pops in and rides until the crane up
    { const on = id === 12 && f >= BEAT.waterIn && f < BEAT.oilIn; this.waterTag.visible = on; this.waterLead.visible = false;
      if (on) { this.waterTag.position.y = o[1] + Math.min(6.0, lv - 0.7); this.waterTag.scale.setScalar(1 + 0.06 * Math.exp(-(f - BEAT.waterIn) / 3) * Math.cos((f - BEAT.waterIn) * 1.2)); }
      const onO = id === 12 && f >= BEAT.oilIn && f < BEAT.hatch - 12; this.oilTag.visible = onO;
      if (onO) this.oilTag.scale.setScalar(1 + 0.06 * Math.exp(-(f - BEAT.oilIn) / 3) * Math.cos((f - BEAT.oilIn) * 1.2)); }
    { const hk = id === 12 ? sm((f - BEAT.add) / 20) : 0; for (const S of this.hatchShafts) { S.mesh.visible = hk > 0.01; S.k.setRGB(0.1, 0.12, 0.1).multiplyScalar(hk); } }
    void cam;
  }

  private poseKitchen(f: number, t: number, cam: THREE.Camera) {
    const e = BEAT.ever, bt = KI.bottle, o = KI.base;
    // carryover r1 (binding): the whole bottle moves with CHAR's shaking hand (cast.ts bottleShake: x += dx, y += dy,
    // rotation.z about the base); the liquid clouds up from "Ever" and stays mixed until "The oil always rises", then
    // separates slowly (droplets climb, the gold layer grows on top) to "top" + 8
    const sh = bottleShake(f), after = f - e - 22, settle = after > 0 ? 0.03 * Math.exp(-after / 7) * Math.sin(after * 1.3) : 0;
    this.bottle.position.set(o[0] + bt.c[0] + sh.dx, o[1] + KI.table.top + 0.005 + sh.dy, o[2] + bt.c[2]);
    this.bottle.rotation.set(0, 0, sh.rot + settle);
    // fix r3: the shadow, its ruby -> gold tint and the caustic lie toward camera-left (the sun is behind-right now)
    this.botShadow.position.set(o[0] + bt.c[0] + KI_SH[0] * 0.24 + sh.dx, o[1] + KI.table.top + 0.007, o[2] + bt.c[2] + KI_SH[1] * 0.24);
    this.botTint.position.set(o[0] + bt.c[0] + KI_SH[0] * 0.03 + sh.dx, o[1] + KI.table.top + 0.0085, o[2] + bt.c[2] + KI_SH[1] * 0.03);
    this.caustic.position.set(o[0] + bt.c[0] + KI_SH[0] * 0.2 + sh.dx * 0.5, o[1] + KI.table.top + 0.008, o[2] + bt.c[2] + KI_SH[1] * 0.2); this.botContact.position.set(o[0] + bt.c[0] + sh.dx, o[1] + KI.table.top + 0.0075, o[2] + bt.c[2]);
    // the glass ink silhouette faces the lens (about the bottle's own axis)
    { const bw = this.bottle.position; this.botInk.rotation.y = Math.atan2(cam.position.x - bw.x, cam.position.z - bw.z); }
    (this.botShadow.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - 0.5 * clamp01(sh.dy / 0.012));
    const mixIn = shakeMix(f) /* fix2 LEAD (CHAR): clouds a step per stroke */, rise = sm((f - BEAT.theOilRises) / (BEAT.top + 8 - BEAT.theOilRises));
    const sep = f < e ? 1 : f < BEAT.theOilRises ? 1 - mixIn : rise;
    // (A1 P1) never frozen: a resting wobble of the interface (~1.5 % of the liquid height) on top of the shake slosh
    this.glassM.uniforms.uSlide.value = lerp(-0.75, 0.75, clamp01((f - (BEAT.theOilRises - 4)) / 60));
    const u = this.liquid.uniforms; u.uT.value = t; u.uSep.value = sep; u.uSlosh.value = (sh.rot + settle) * 2.2 + 0.04 * Math.sin(t * 2.5) + 0.02 * Math.sin(t * 4.1 + 1);
    // the golden caustic dims while the dressing is cloudy and brightens as the gold returns
    this.pools[PO.kiGold].c.multiplyScalar(0.3 + 0.7 * sep); (this.caustic.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * sep * (0.9 + 0.1 * Math.sin(t * 3.1));
    (this.botTint.material as THREE.MeshBasicMaterial).opacity = (0.22 + 0.2 * sep) * (1 - 0.5 * clamp01(sh.dy / 0.012));
    // fix r3 (A3 P2): the settled gold glows a little in the bloom as it reaches the top ("top" - 14 .. "top")
    u.uGlow.value = 0.16 * sm((f - (BEAT.top - 14)) / 14) * sep;
    // the kettle steam: three S-wisps rising off the spout (a 60 f video-clock loop), facing the lens
    this.kiSteam.forEach((s, i) => { const a = ((VF / 60 + i / 3) % 1 + 1) % 1; s.position.set(o[0] + KETTLE[0] - 0.16 - 0.06 * a + 0.015 * Math.sin(VF * 0.07 + i * 2), o[1] + 1.1 + 0.26 * a, o[2] + KETTLE[2] + 0.05); s.scale.set(0.8 + 0.9 * a, 0.7 + 0.5 * a, 1); (s.material as THREE.MeshBasicMaterial).opacity = 0.9 * Math.sin(Math.PI * a); s.quaternion.copy(cam.quaternion); });
    // (A1 P1) curtains sway 0.08 rad at ~0.3 Hz; the sparrow hops along the fence every ~1.5 s; the sheet billows; the cat
    // clock's tail swings; the radio dial glows
    this.curtainsK.forEach((m, i) => { m.rotation.x = 0.05 + 0.08 * vs(1.9, i * 1.7); m.rotation.y = 0.05 * vs(1.3, i); });
    // fix r3 (ADD #59): the sparrow's hops LAND on story beats (picture clock): a 9 f hop ending on each listed frame,
    // 0.08 m a hop, turning round after every third; a little head-bob between hops
    { const H = [SHOTS[10].a - 2, SHOTS[10].a + 18, BEAT.floats, BEAT.ever, BEAT.dressing + 8, BEAT.theOilRises + 6, BEAT.rises, BEAT.top, BEAT.top + 16];
      let n = 0; for (const h of H) if (f >= h) n++;
      const nxt = H[n] ?? 1e9, ph = f - (nxt - 9), hop = ph >= 0 && ph < 9 ? Math.sin((Math.PI * ph) / 9) : 0, pr = n + (ph >= 0 && ph < 9 ? sm(ph / 9) : 0);
      const leg = Math.floor(pr / 3), dirR = leg % 2 === 0, w = pr - leg * 3, x = dirR ? -0.3 + 0.08 * w : -0.06 - 0.08 * w;
      this.sparrow.position.set(o[0] + x, o[1] + 1.47 + 0.035 * hop + 0.004 * Math.max(0, vs(14.7)), o[2] - KI.room.d / 2 + 0.016);
      const mat = this.sparrow.material as THREE.MeshBasicMaterial, tex = sparrowTex(hop > 0.2 ? 1 : 0); if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
      this.sparrow.scale.x = dirR ? -1 : 1; }
    { const pa = this.sheet.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) { const x = this.sheetBase[i * 3], y = this.sheetBase[i * 3 + 1], k = -y / 0.17; pa.setX(i, x + 0.012 * k * vs(2.1, x * 20)); pa.setY(i, y + 0.01 * k * vs(1.7, x * 14 + 1)); pa.setZ(i, 0.02 * k * vs(2.4, x * 18)); } pa.needsUpdate = true; }
    this.catTail.rotation.z = 0.42 * vs(TAU * 0.5);
    this.radioDial.material.color.copy(glowCol("#ffcf7a", 0.3 + 0.04 * vs(5.3)));
    this.kiMotes.pose(t, 4);
  }

  private posePump(f: number, t: number, cam: THREE.Camera) {
    const o = PR.base, bx = blobX(f);
    const su = clamp01((f - BEAT.pumped - 2) / 30), sx = lerp(-2.45, -0.55, sm(su));  // the 'pumped' slug through glass 1
    // COUNTED plates flip "-" -> n on COUNT_AT (a quick pop), the sight glass of each tank bumps as the oil arrives
    this.plates.forEach((p, i) => {
      const at = COUNT_AT[i], on = f >= at; p.dash.visible = !on; p.n.visible = on;
      const k = clamp01((f - at) / 5); p.n.scale.set(1, on ? 0.2 + 0.8 * outBack(k, 2.4) : 1, 1);
    });
    this.sights.forEach((s) => { const arr = f >= COUNT_AT[s.i] ? outBack(clamp01((f - COUNT_AT[s.i]) / 12)) : 0; s.m.scale.y = 0.95 + 0.55 * arr + 0.02 * vs(1.3, s.i); });
    // the gold slug travels inside the glass under the blob
    for (const s of this.slugs) {
      const lead = s.x0 < -1 && su > 0 && su < 1, cx2 = lead ? sx : bx, a = Math.max(s.x0, cx2 - 0.4), b = Math.min(s.x1, cx2 + 0.4);
      s.m.visible = b > a + 0.02; if (s.m.visible) { s.m.position.set(o[0] + (a + b) / 2, o[1] + PR.pipe.y, o[2] + PR.pipe.z); s.m.scale.set(1, b - a, 1); }
    }
    const bp = this.pools[PO.prBlob]; bp.p.set(o[0] + bx, o[1] + PR.blobY + 0.15, o[2] + PR.pipe.z + 0.15); bp.r = 1.15;
    // carryover r1 (binding): wheel k turns with CHAR's valveAngle(k, f) (the workers' hands are on its rim)
    // fix r3 (A3 P2 MCU): wheel B keeps turning ~25 deg/s once the lens has left its worker (as if heaved off-screen)
    this.wheels.forEach((w, i) => { w.rotation.z = valveAngle(i, f) - (i === 1 ? 0.44 * Math.max(0, f - (BEAT.hardest - 12)) / FPS : 0); });
    // the COUNTED: 2 steam puff on its tick (got + 2, 20 f), the tallies by B / C gain a stroke as their plates flip
    this.puff.forEach((s, k) => { const d = f - (COUNT_AT[1] + 2) - k * 3, u = d / 20, on = u >= 0 && u < 1; s.visible = on; if (!on) return;
      s.position.set(o[0] + 0.8 + 0.25 * u + 0.05 * k, o[1] + 2.1 + 0.35 * u + 0.06 * k, o[2] - 3.75); s.scale.setScalar(0.5 + 1.6 * u); (s.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u * 0.3); s.quaternion.copy(cam.quaternion); });
    for (const T of this.tallies) { const mt = T.m.material as THREE.MeshBasicMaterial, nt = tallyTex(f >= COUNT_AT[T.i] ? 5 : 4); if (mt.map !== nt) { mt.map = nt; mt.needsUpdate = true; } }
    // the gold smear in the glass behind the blob: from where the blob was 20 f ago to just behind it
    { const xa = blobX(f - 20) - 0.3, xb = bx - 0.4; for (const S of this.smears) { const a = Math.max(S.x0, xa), b = Math.min(S.x1, xb); S.m.visible = b > a + 0.05;
      if (S.m.visible) { S.m.position.set(o[0] + (a + b) / 2, o[1] + PR.pipe.y, o[2] + PR.pipe.z); S.m.scale.set(1, b - a, 1); } } }
    // the gold in the glass flows (a scrolling highlight); a section brightens while the blob / the 'pumped' slug passes;
    // on "pumped" a slug of the real oil runs through glass 1 (30 f)
    for (const P of this.pipeOil) { P.m.uniforms.uT.value = t; const near = Math.max(bx > P.x0 - 0.3 && bx < P.x1 + 0.3 ? 1 : 0, su > 0 && su < 1 && P.x0 < -1 ? 1 : 0); P.m.uniforms.uK.value = 1 + 0.35 * near; }
    this.flywheel.rotation.x = -VF * 0.42;
    // fix r2 (A2 P2 #24): the MCU gauge needle twitches +-8 deg at ~2 Hz (the blob's weight on the line); the second gold
    // drip (into the tray at tank C) lands on the same 40 f phase as the first (drips_13)
    this.mcuNeedle.rotation.z = 0.35 - 0.16 * vs(7.5) - 0.06 * vs(31, 1.3) - 0.4 * Math.exp(-(((bx - PR.blobCU[0]) / 0.8) ** 2));
    { const ph = ((VF % 40) + 40) % 40, fall = ph / 12; this.drip2.position.set(o[0] + 2.86, o[1] + (ph < 12 ? 1.03 - 0.97 * fall * fall : 1.03), o[2] - 3.28); this.drip2.scale.setScalar(ph < 12 ? 0.05 : 0.035 * (1 + 0.3 * Math.sin(ph * 0.2))); }
    { const ph = ((VF % 40) + 40) % 40, fall = ph / 12; this.drip.visible = true; this.drip.position.set(o[0] - 4.6, o[1] + (ph < 12 ? 1.0 - 0.95 * fall * fall : 1.0), o[2] - 3.6); this.drip.scale.setScalar(ph < 12 ? 0.05 : 0.035 * (1 + 0.3 * Math.sin(ph * 0.2))); }
    this.prSteam.forEach((S) => { const a = ((VF / 75 + S.k * 0.5 + S.x * 0.1) % 1 + 1) % 1; S.m.position.set(o[0] + S.x + 0.05 * Math.sin(VF * 0.06 + S.k) * a, o[1] + S.y + 0.1 + 0.45 * a, o[2] + S.z); S.m.scale.set(0.7 + a, 0.6 + 0.6 * a, 1); (S.m.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.sin(Math.PI * a); S.m.quaternion.copy(cam.quaternion); });
    for (const n of this.needles) { const near = n.tank >= 0 ? Math.exp(-(((bx - PR.tanks[n.tank][0]) / 0.9) ** 2)) : 0; n.m.rotation.z = -(n.base + n.amp * vs(3.7, n.ph) + 0.03 * vs(11, n.ph * 2) + 0.9 * near) + 0.8; }
    this.lampsP.forEach((l) => { l.g.rotation.z = 0.012 * vs(0.5, l.ph); l.g.rotation.x = 0.01 * vs(0.37, l.ph + 1); });
    PR.lamps.forEach((l, i) => { const P = this.pools[i ? PO.prLampB : PO.prLampA]; P.c.multiplyScalar(1 + 0.025 * vs(7.3, i * 3) + 0.015 * vs(13.1, i));
      // fix r2: the pool rides the lamp's swing (its light patch slides on the tank wall)
      const sw = -1.4 * (0.012 * vs(0.5, i * 1.9) + 0.03 * vs(1.25, i * 1.9)); P.p.x += sw; this.pools[i].p.x += sw; });
    // the lamps sway a little on their cords, so their pools drift across the tank walls (~0.2 Hz)
    this.lampsP.forEach((l) => { l.g.rotation.z += 0.03 * vs(1.25, l.ph); });
    this.moths.forEach((m, k) => { const l = PR.lamps[k % 2], a = vph(2.2 + k * 0.4) + k * 1.3; m.position.set(o[0] + l[0] + 0.28 * Math.cos(a), o[1] + l[1] - 0.2 + 0.12 * Math.sin(a * 1.7), o[2] + l[2] + 0.22 * Math.sin(a)); });
    this.prMotes.pose(t, 7);
    void cam;
  }

  private poseOffice(id: number, f: number, t: number, cam: THREE.Camera) {
    const o = OF.base, mix = lightMixAt(id, f), glow = mix.b === "office_glow" ? (mix.a === "office_glow" ? 1 : mix.k) : 0;
    // BUY: written letter by letter from "bought" + 4 (B, U, Y, underline), the pencil scribbling over it
    const w0 = BEAT.bought + 4, n = f < w0 ? 0 : Math.min(4, 1 + Math.floor((f - w0) / 6));
    this.buy.forEach((m, i) => { m.visible = i === n; });
    const writing = f >= w0 - 2 && f < w0 + 26, sl = OF.slip;
    const pu = clamp01((f - w0) / 24), px = writing ? lerp(-0.07, 0.07, pu) + 0.012 * Math.sin(f * 2.1) : 0.16, pyy = writing ? 0.012 * Math.abs(Math.sin(f * 1.7)) : 0;
    this.pencil.position.set(o[0] + sl[0] + px, o[1] + sl[1] + (writing ? 0.085 + pyy : 0.012), o[2] + sl[2] + (writing ? 0.02 : 0.1));
    this.pencil.rotation.set(writing ? -0.35 : Math.PI / 2, 0.3, writing ? -0.45 : 0.25);
    const k = 1 + 0.07 * glow;   // fix r2 (A2 P1: the swell went milky): gentler view / pool / shaft gains
    for (const m of this.ofView) m.color.setRGB(k * 0.97, k * 0.97, k * 0.97);   // fix r3: the view no longer pushed orange (b* target +16..+21)
    this.sunGlow.material.color.setRGB(0.5 + 0.35 * glow, 0.36 + 0.24 * glow, 0.18 + 0.08 * glow);
    this.pools[PO.ofWin].c.multiplyScalar(1 + 0.22 * glow);
    this.steam.forEach((s, i) => { const a = (t * 0.35 + i / 3) % 1; s.position.set(o[0] + CUP_OF[0] + 0.02 * Math.sin(t * 1.3 + i * 2), o[1] + 0.86 + 0.18 * a, o[2] + CUP_OF[1]); s.scale.set(1 + a, 0.8 + a * 0.6, 1); (s.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * a) * 0.9; s.quaternion.copy(cam.quaternion); });
    this.curtainsO.forEach((m, i) => { m.rotation.x = 0.05 + 0.05 * vs(1.9, i * 2.3) + 0.015 * vs(4.1, i); m.rotation.y = 0.04 * vs(1.3, i * 1.1); });
    this.ofMotes.pose(t, 5);
    { const sec = Math.floor(t), tk = sec + Math.min(1, (t - sec) * 6); this.ofHands[2].rotation.z = -((tk + 23) / 60) * TAU; this.ofHands[1].rotation.z = -((17 + t / 60) / 60) * TAU; this.ofHands[0].rotation.z = -((10 + 17 / 60) / 12) * TAU; }
    this.ofCord.rotation.z = 0.06 * vs(2.4, 0.4) + 0.02 * vs(5.1); this.ofCord.rotation.x = 0.03 * vs(1.7, 1.1);
    // A1 P3: the "Warren" relight as a SHAPE: the striped sun patch on the desk + the window shafts brighten, motes appear
    (this.sunPatch.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.2 * glow;
    // fix r3: the rug's pane patch + the chair stripes warm with the glow; the ceiling-fan shadow turns slowly (2 whole turns
    // a minute on the video clock); the chart ticks up a step on "Warren"
    (this.rugPatch.material as THREE.MeshBasicMaterial).opacity = 0.28 + 0.16 * glow; (this.chairStripes.material as THREE.MeshBasicMaterial).color.setRGB(0.3 + 0.12 * glow, 0.22 + 0.08 * glow, 0.11 + 0.03 * glow);
    this.fanSh.rotation.y = vph(0.21);
    { const fm = this.ofChart.material as THREE.MeshBasicMaterial, ct = f >= BEAT.warren + 2 ? ofChartTex2() : ofChartTex(); if (fm.map !== ct) { fm.map = ct; fm.needsUpdate = true; } }
    for (const S of this.shafts) if (S.mesh.parent === this.office) S.k.setRGB(0.17, 0.12, 0.052).multiplyScalar(1 + 0.6 * glow);
    this.ofMotes2.pts.visible = glow > 0.02; (this.ofMotes2.pts.material as THREE.PointsMaterial).opacity = glow; this.ofMotes2.pose(t, 8);
  }
}
const iron = () => C("#5a5e64");

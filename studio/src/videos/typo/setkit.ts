// SET KIT (typo): the shared set-building helpers of the engine (from the saladoil interiors + exteriors): canvas
// textures (tx, cached + seeded), painters (grain, panel, speck, mottle, ctext), two-tone materials (C, TM, CE: Lambert via
// build.ts lam), unlit readable faces (faceMat, faceMesh), the RB room builder (merged batches: props cast, shells only
// receive), planes, contact shadows, glow sprites / bulbs, drifting motes, light shafts' texture, and the loop-safe idle
// clock (setVF + vs / vph: whole cycles over VOICE_TOTAL). Every set module (sets_*.ts) builds with these.
import * as THREE from "three";
import { Batch, lam, quad, V } from "./build";
import { ctex, rng } from "./paint";
import { NOINK } from "./ink";
import type { V3 } from "./plan";
import { FPS } from "./beats";
import { smooth, clamp01 } from "./camkit";
export { smooth, clamp01 };
import { VOICE_TOTAL } from "./voicewarp";
export { Batch, lam, quad, V, ctex, rng, NOINK };

export type P3 = [number, number, number];
export type G = CanvasRenderingContext2D; export type R = () => number;
export const TAU = Math.PI * 2;
/** the VIDEO frame of the current render (every set module calls setVF(ctx.vf) first in pose) */
export let VF = 0;
export const setVF = (v: number) => { VF = v; };
/** angular rate per VIDEO frame for a nominal w (rad / s), snapped to whole cycles over the film (loop seam) */
/** the LOOP period in video frames: frame 0 and the last frame (VOICE_TOTAL - 1) must be IDENTICAL, so every idle cycle is whole over VOICE_TOTAL - 1 */
export const LOOPN = VOICE_TOTAL - 1;
export const qw = (w: number) => (TAU * Math.max(1, Math.round((Math.abs(w) / TAU) * (LOOPN / FPS))) * Math.sign(w || 1)) / LOOPN;
export const vs = (w: number, ph = 0) => Math.sin(qw(w) * VF + ph);
export const vph = (w: number) => qw(w) * VF;
export const vsec = () => VF / FPS;
export const hash = (n: number) => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const sm = (u: number) => smooth(u);
export const outBack = (u: number, s = 1.9) => { const x = clamp01(u) - 1; return 1 + x * x * ((s + 1) * x + s); };
export const outCubic = (u: number) => 1 - (1 - clamp01(u)) ** 3;
/** 0 -> 1 -> 0 over [a, b] with smooth ends of length e */
export const env = (f: number, a: number, b: number, e: number) => sm((f - a) / e) * (1 - sm((f - (b - e)) / e));
export const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 199999) + 1; };
/** a cached canvas texture seeded by its whole key (clamp = no wrap bleed at the edges) */
export const tx = (key: string, w: number, h: number, draw: (g: G, r: R) => void, clamp = false) => {
  const t = ctex("si_" + key, w, h, (g) => draw(g, rng(fnv(key))));
  if (clamp && t.wrapS !== THREE.ClampToEdgeWrapping) { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; }
  return t;
};
export const _c = new THREE.Color(), _h = { h: 0, s: 0, l: 0 };
/** colour jitter in HSL (lightness +- dv, hue +- dh deg) -> css hex */
export const jit = (r: R, hex: string, dv = 0.08, dh = 4) => {
  _c.set(hex).getHSL(_h);
  _c.setHSL((_h.h + ((r() * 2 - 1) * dh) / 360 + 1) % 1, _h.s, Math.max(0, Math.min(0.97, _h.l * (1 + (r() * 2 - 1) * dv))));
  return "#" + _c.getHexString();
};
export const shadeHex = (hex: string, dl: number) => { _c.set(hex).getHSL(_h); _c.setHSL(_h.h, _h.s, Math.max(0, Math.min(1, _h.l + dl))); return "#" + _c.getHexString(); };
export const rgba = (hex: string, a: number) => { _c.set(hex); return `rgba(${Math.round(_c.r * 255)},${Math.round(_c.g * 255)},${Math.round(_c.b * 255)},${a})`; };
export const font = (g: G, px: number, fam = '"Arial Black", Arial, sans-serif', w = "") => { g.font = `${w ? w + " " : ""}${Math.round(px)}px ${fam}`; };
/** centred text that shrinks to fit maxW */
export const ctext = (g: G, s: string, x: number, y: number, px: number, col: string, maxW: number, fam?: string, w?: string) => {
  let p = px; font(g, p, fam, w); while (g.measureText(s).width > maxW && p > 8) { p -= 2; font(g, p, fam, w); }
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(s, x, y);
};
export const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export const speck = (g: G, r: R, w: number, h: number, n: number, cols: string[], s0: number, s1: number, a = 0.2) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + 0.6 * r()); g.fillStyle = cols[i % cols.length]; const s = s0 + r() * (s1 - s0); g.fillRect(r() * w, r() * h, s, s * (0.6 + 0.8 * r())); }
  g.globalAlpha = 1;
};
export const mottle = (g: G, r: R, w: number, h: number, n: number, cols: string[], s0: number, s1: number, a = 0.07) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.5 + 0.5 * r()); g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(r() * w, r() * h, s0 + r() * (s1 - s0), 0, TAU); g.fill(); }
  g.globalAlpha = 1;
};
/** wood grain lines across a rect (horizontal = along x) */
export const grain = (g: G, r: R, x: number, y: number, w: number, h: number, n: number, col: string, horiz = true, a0 = 0.07, a1 = 0.16) => {
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
export const panel = (g: G, r: R, x: number, y: number, w: number, h: number, field: string, bev: number, horiz = false) => {
  g.fillStyle = shadeHex(field, 0.07); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - bev, y + bev); g.lineTo(x + bev, y + bev); g.lineTo(x + bev, y + h - bev); g.lineTo(x, y + h); g.closePath(); g.fill();
  g.fillStyle = shadeHex(field, -0.09); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.lineTo(x + bev, y + h - bev); g.lineTo(x + w - bev, y + h - bev); g.lineTo(x + w - bev, y + bev); g.closePath(); g.fill();
  g.fillStyle = field; g.fillRect(x + bev, y + bev, w - 2 * bev, h - 2 * bev);
  grain(g, r, x + bev, y + bev, w - 2 * bev, h - 2 * bev, Math.round((w * h) / 900), "#2a140a", horiz);
  g.strokeStyle = "rgba(30,14,6,0.35)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
};
export const softDot = () => tx("softDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
}, true);
/** a soft beam (u = 0 at the source -> 1), feathered sides */
export const shaftTex = () => tx("shaft", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2, a = Math.min(1, u * 8) * (1 - u) ** 1.3 * (1 - v * v) ** 1.6;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
}, true);
export const glareTex = () => tx("glare", 256, 256, (g) => {
  g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(0, 0, 256, 256);
  for (const [x, w, a] of [[60, 34, 0.5], [112, 12, 0.35], [190, 22, 0.25]] as number[][]) {
    g.save(); g.translate(x, 128); g.rotate(0.55); const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(-w, -260, 2 * w, 520); g.restore();
  }
}, true);

// ---------------- materials ----------------
export const C = (hex: string) => lam("si:" + hex, () => ({ color: hex }));
export const TM = (key: string, map: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam("si:" + key, () => ({ map: map(), ...extra }));
export const CE = (hex: string, e: string, k: number) => lam(`si:${hex}|${e}|${k}`, () => ({ color: hex, emissive: new THREE.Color(e), emissiveIntensity: k }));
export const bmats = new Map<string, THREE.MeshBasicMaterial>();
export const basic = (key: string, make: () => THREE.MeshBasicMaterialParameters) => {
  let m = bmats.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial(make()); bmats.set(key, m); }
  return m;
};
/** an unlit readable face material (boards that must be READ; k < 1 dims it into a dark room) */
export const faceMat = (key: string, map: () => THREE.Texture, k = 1, alpha = false) => basic("face:" + key + k, () => ({ map: map(), color: new THREE.Color(k, k, k), ...(alpha ? { transparent: true, alphaTest: 0.02, depthWrite: false } : {}) }));
export const glowCol = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
export const Q = (rx: number, ry: number, rz: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ"));
export const cylY = (r: number, h: number, seg = 24, open = false, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg, 1, open).translate(0, h / 2, 0);

/** builder in a room's local frame (origin = the set base): props cast sun shadows, the shell only receives */
export class RB {
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
export const plane = (parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, p: P3, ry = 0, rx = 0, rz = 0, noInk = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...p); m.rotation.set(rx, ry, rz, "YXZ"); if (noInk) m.layers.set(NOINK); parent.add(m); return m;
};
/** fix r1: a soft contact shadow (plum, multiplied by `op`) lying on a horizontal surface at world point p */
export const contact = (parent: THREE.Object3D, p: P3, w: number, d: number, op = 0.35, ry = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic("blob" + op, () => ({ map: blobTex(), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  m.position.set(...p); m.rotation.set(-Math.PI / 2, 0, ry); m.layers.set(NOINK); m.renderOrder = 2; parent.add(m); return m;
};
/** additive glow sprite (bulb halos) */
export const glowSprite = (parent: THREE.Object3D, p: P3, size: number, col: THREE.Color) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.position.set(...p); s.scale.setScalar(size); s.layers.set(NOINK); s.renderOrder = 6; parent.add(s); return s;
};
/** an emissive bulb (> bloom threshold) + its halo */
export const bulb = (parent: THREE.Object3D, p: P3, r: number, hex: string, k: number, halo = 0.5, haloK = 0.5) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), new THREE.MeshBasicMaterial({ color: glowCol(hex, k) }));
  m.position.set(...p); m.layers.set(NOINK); parent.add(m);
  const s = glowSprite(parent, p, halo, glowCol(hex, haloK));
  return { m, s };
};

/** drifting motes (dust in light, specks) as one Points cloud, posed on the video clock */
export class Motes {
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

export const blobTex = () => tx("blob", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(42,22,34,1)"); gr.addColorStop(0.55, "rgba(42,22,34,0.55)"); gr.addColorStop(1, "rgba(42,22,34,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}, true);
/** a wisp of smoke / steam (u across, v up: an S-curl that fades at both ends) */
export const wispTex = () => tx("wisp", 64, 256, (g2) => { g2.clearRect(0, 0, 64, 256); for (let y = 0; y < 256; y++) { const a = Math.sin((y / 256) * Math.PI) * 0.55, x = 32 + Math.sin(y * 0.045) * 12; const gr = g2.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, `rgba(255,255,255,${a * 0.2})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g2.fillStyle = gr; g2.fillRect(x - 10, y, 20, 1); } }, true);

// ---------------- from the saladoil exteriors ----------------
/** build a batch into `parent`, every mesh with ink weight `ink` (0 = never inked, still occludes) */
export const buildInk = (b: Batch, parent: THREE.Object3D, ink = 1, cast = true) => {
  const g = new THREE.Group(); b.build(g, cast);
  for (const c of [...g.children]) { c.userData.ink = ink; parent.add(c); }
};
/** an unlit board face (signs that must be READ never grey out in the side light) */
export const faceMesh = (tex: THREE.Texture, w: number, h: number, alpha = false) =>
  new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, ...(alpha ? { transparent: true, alphaTest: 0.05 } : {}) }));
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
/** a transform: position, yaw (ry), scale, rx, rz */
export const M = (x: number, y: number, z: number, ry = 0, s: V3 = [1, 1, 1], rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone().setFromEuler(_e.set(rx, ry, rz, "YXZ")), new THREE.Vector3(...s));
/** a flat decal quad lying on the ground (y) */
export const flat = (b: Batch, mat: THREE.Material, x: number, z: number, w: number, d: number, rot = 0, y = 0.012) =>
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat, M(x, y, z, rot));
/** whole cycles over the narration (loop seam): sin(2 pi n v / VOICE_TOTAL + ph) */
export const cyc = (n: number, v: number, ph = 0) => Math.sin((TAU * n * v) / LOOPN + ph);

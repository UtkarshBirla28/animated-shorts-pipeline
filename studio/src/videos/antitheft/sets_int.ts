// INTERIOR SETS (owner: WORLD-INT): the warm classroom (shot 12), the night storeroom (shot 14) and the blueprint
// explainer space (shot 11). Every room is closed (no sky or desert shows), built from merged two-tone batches with
// hand-painted canvas textures, plus a few per-frame parts that are pure functions of (shot, frame):
//  - classroom: chalk text "HALF THIS CLASS CHEATED." written word by word as the voice says it (BEAT.half..cheated),
//    chalk dust at the writing tip, ticking wall clock, dust motes drifting in the window shafts;
//  - storeroom: chips scooped from the CONSCIENCE PILE into the BAIT bucket (BEAT.pieces..apology, bucket fills),
//    a returned parcel + envelope dropping onto the pile on BEAT.mailed, letters hopping on BEAT.apology, dust motes
//    in the desk-lamp beam, coffee steam, twinkling stars in the night window;
//  - blueprint: the diagram draws itself (path on "You see", THE RULE branch on "copy rules", EVERYONE ELSE on "copy
//    each other"), labels pop, the grid shimmers, chalk dust floats, the MANY VISITORS TAKE THE WOOD. panel flies in on
//    BEAT.manySteal and settles at BP.signFloat (bob + sway), and on BEAT.everyone its three thieves multiply into dozens.
// LIGHT: interiors use a WORLD-FIXED key (LightPreset.key, lights.ts): the classroom key comes through the east
// window band (the shell casts shadows, so the windows print light patches with mullion / blind shadows); the
// storeroom key stands in for the desk lamp (shell does not cast; shade.ts ZONE fades the key with distance from the
// lamp so the far corners keep the blue night shade) plus warm / moon light pools (shade.ts POOL). Until world.ts reads
// L.key itself, pose() re-aims the scene's sun to it (same rig, same shadow fit).
// ROUND 2 (A1 audit): LightFx below is a per-World light-effects rig that also runs on the EXTERIOR shots, because the
// light states are this owner's: (a) a hook mesh that writes this World's shade.ts TONE_X extras (rim, wood shade,
// cloud shadow) + interior pool colours right before its scene draws (dissolve-safe); (b) the backlit sunset sun disc
// + halo + god rays peeking past Sign B, low-sun horizon glow, slanted dust shafts and warm motes on the morning
// shots, the travelling cloud shadow on "vandalized" (shot 4) and multiply overlays on the readable sign faces
// (sunset gradient on Sign B, the cloud shadow on the warning board's wood but not its letters).
import * as THREE from "three";
import { Batch, lam, boxGeo, V } from "./build";
import { ctex, rng, testSignTex, parkWood, quartzFace, SIGN_B_LINES } from "./paint";
import { NOINK } from "./ink";
import { POOL, POOL_N, ZONE_N, TONE, TONE_X, CHAR, twoTone } from "./shade";
import { CL, SR, BP, TT, TH, V3 } from "./plan";
import { BEAT, clamp01, SHOTS, camAt, FPS, lightMixAt, PW, V as toV, PV } from "./story";
import { KEY_CLASSROOM, type LightState } from "./lights";
import { VOICE_TOTAL } from "./voicewarp";
import type { SetCtx } from "./ctx";

// ======================================================================================================== helpers
type P3 = [number, number, number];
const TAU = Math.PI * 2;
// ---- round 6 (LEAD A5 P1: idle life on the picture clock stretched / froze in the warped holds): every IDLE loop
// (flicker, steam, sway, moths, motes, shimmer, bob) runs on the VIDEO frame VF (ctx.vf, the narration clock); story
// actions stay on the picture clock f. LOOP SEAM RULE: a periodic idle term makes a WHOLE number of cycles over the
// film (qw rounds its rate), so video frame 0 and VOICE_TOTAL - 1 pose every idle term the same way.
let VF = 0;
/** angular rate per VIDEO frame for a nominal w (rad / s), rounded to whole cycles over VOICE_TOTAL */
const qw = (w: number) => (TAU * Math.max(1, Math.round((Math.abs(w) / TAU) * (VOICE_TOTAL / FPS))) * Math.sign(w || 1)) / VOICE_TOTAL;
/** idle sine on the video clock: sin(w t + ph) with w snapped to whole cycles per film */
const vs = (w: number, ph = 0) => Math.sin(qw(w) * VF + ph);
/** idle phase (radians) on the video clock, w snapped (for orbits / wrapping phases) */
const vph = (w: number) => qw(w) * VF;
/** idle time in seconds on the video clock (for non-periodic drifts: motes) */
const vtime = () => VF / FPS;
const hash = (n: number) => { const s = Math.sin(n * 91.3458 + 47.853) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sm = (u: number) => { const x = clamp01(u); return x * x * (3 - 2 * x); };
const outBack = (u: number, s = 1.9) => { const x = clamp01(u) - 1; return 1 + x * x * ((s + 1) * x + s); };
const outCubic = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const Q = (rx: number, ry: number, rz: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ"));
/** chip orientation: the quartz face (+y) tilted toward the (horizontal) view direction (dx, dz) by `lean` (0 = up,
 *  1 = 45 deg), with jitter j and a random spin about the face normal (round 3: faces, not bark, toward the lens) */
const faceQ = (seed: number, dx: number, dz: number, lean: number, j = 0.45) => {
  const n = V(dx * lean + (hash(seed * 1.7) - 0.5) * j, 1, dz * lean + (hash(seed * 2.9) - 0.5) * j).normalize();
  return new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(seed * 4.3) * TAU));
};
const C = (hex: string) => lam("int:" + hex, () => ({ color: hex }));
const TM = (key: string, map: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam("int:" + key, () => ({ map: map(), ...extra }));
/** round 3 (A2 P1: the conscience-pile chips read as navy coal): petrified-wood chip faces with an emissive floor
 *  from their own quartz map, so the red / orange / yellow / purple rings hold colour in the blue night shade */
// round 6 (A5 P2: the chips read as rubies / raw meat: red-magenta facets, no bark edges, the rainbow link to the hook
// rock lost): the chip top's UV window (chipGeos: centre .5 +- .275, radius .16) only ever saw the slice texture's red
// core, so the interior chips get their OWN faces: 8 variants = 4 base colours (red #C84A3A, orange #E8893A, yellow
// #F2C64A, purple #8A5AA8, ~25 % each) x with / without a brown bark edge (#7A5A44 / #5E4636 + a pale cambium line);
// 2-3 curved growth-ring stripes, white crystal flecks and a milky quartz vein on every face
const CHIP_BASE = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8"];
const CHIP_RING = [["#e07a52", "#a8342c", "#f2c64a"], ["#f4b05a", "#c86a2a", "#c84a3a"], ["#fbe08a", "#d8a032", "#e8893a"], ["#b07ac8", "#6a3e8c", "#c84a3a"]];
const chipTex = (v: number) => ctex("srChip6_" + v, 256, 256, (g, r) => {
  const c = v % 4, bark = v >= 4, S = 256;
  g.fillStyle = CHIP_BASE[c]; g.fillRect(0, 0, S, S);
  // mottled body
  for (let k = 0; k < 40; k++) { g.fillStyle = k % 2 ? "rgba(255,240,220,0.08)" : "rgba(60,20,30,0.07)"; g.beginPath(); g.arc(r() * S, r() * S, 10 + r() * 34, 0, TAU); g.fill(); }
  // growth rings: arcs round a centre far below-left of the window (a fragment of a big slice), so they run parallel to the bark
  const cx = -S * (0.7 + 0.3 * r()), cy = S * (1.7 + 0.3 * r()), R0 = Math.hypot(S * 0.5 - cx, S * 0.5 - cy);
  const ring = (rr: number, w: number, col: string, a: number) => { g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, rr, -Math.PI / 2, 0.2); g.stroke(); g.globalAlpha = 1; };
  const nR = 2 + Math.floor(r() * 2);
  for (let k = 0; k < nR; k++) ring(R0 - 70 + k * (52 + r() * 20), 10 + r() * 10, CHIP_RING[c][k % 3], 0.85);
  ring(R0 - 96 + r() * 30, 4, "#f6ecdc", 0.75);                                          // a thin milky quartz vein
  // white crystal flecks (sparkle points) + a few tiny dark pores
  for (let k = 0; k < 46; k++) { const x = r() * S, y = r() * S, s = 1 + r() * 3.2; g.fillStyle = "rgba(255,255,255," + (0.55 + 0.45 * r()).toFixed(2) + ")"; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s, y); g.lineTo(x, y + s * 1.6); g.lineTo(x - s, y); g.closePath(); g.fill(); }
  for (let k = 0; k < 20; k++) { g.fillStyle = "rgba(50,24,30,0.35)"; g.fillRect(r() * S, r() * S, 2, 2); }
  if (bark) { // the bark rind along the top of the texture (rows < ~70-96: about half the chip windows reach it)
    const bnd = (x: number) => 70 + 0.1 * x + 8 * Math.sin(x * 0.07) + 4 * Math.sin(x * 0.19);
    g.fillStyle = "#e2ccac"; g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= S; x += 8) g.lineTo(x, bnd(x) + 6); g.lineTo(S, 0); g.closePath(); g.fill();
    g.fillStyle = "#7a5a44"; g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= S; x += 8) g.lineTo(x, bnd(x)); g.lineTo(S, 0); g.closePath(); g.fill();
    g.strokeStyle = "#5e4636"; g.lineWidth = 3; for (let k = 0; k < 18; k++) { const x = r() * S, y0 = bnd(x) - 4; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (r() - 0.5) * 10, y0 - 10 - r() * 26); g.stroke(); }
    for (let k = 0; k < 30; k++) { g.fillStyle = k % 2 ? "rgba(94,70,54,0.6)" : "rgba(140,108,84,0.5)"; const x = r() * S; g.fillRect(x, r() * (bnd(x) - 8), 3 + r() * 6, 2); }
  }
});
/** chip face material (variant v: 0-3 colours, 4-7 the same with a bark edge), emissive floor k from its own map */
const qzE = (i: number, k = 0.42) => { const v = ((i % 8) + 8) % 8; return TM("srChipE6_" + v + "_" + k, () => chipTex(v), { emissive: new THREE.Color(1, 1, 1), emissiveMap: chipTex(v), emissiveIntensity: k * 1.05 }); }; // round 6c: +25 % (the bait-pail chips read purple-blue in the insert)
/** the heap mound under the chips: a dark rubble of mixed chip colours (no single red ring dome) */
const heapTex = () => ctex("srHeap6", 512, 256, (g, r) => {
  g.fillStyle = "#4a3430"; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 260; k++) {
    const x = r() * 512, y = r() * 256, s = 6 + r() * 16, c = Math.floor(r() * 5), col = c < 4 ? CHIP_BASE[c] : "#7a5a44";
    g.fillStyle = col; g.globalAlpha = 0.75 + 0.25 * r(); g.beginPath();
    const n = 4 + Math.floor(r() * 3); for (let j = 0; j < n; j++) { const a = (j / n) * TAU + r() * 0.6; g.lineTo(x + Math.cos(a) * s * (0.6 + 0.5 * r()), y + Math.sin(a) * s * 0.7 * (0.6 + 0.5 * r())); }
    g.closePath(); g.fill(); g.globalAlpha = 1;
    if (r() < 0.3) { g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(x, y, 2, 2); }
  }
});
void quartzFace;
const barkE = () => lam("int:srBarkE", () => ({ color: "#7a5a44", emissive: new THREE.Color("#4e3426"), emissiveIntensity: 0.5 }));
const rockE = (hex: string) => lam("int:srRockE" + hex, () => ({ color: hex, emissive: new THREE.Color(hex), emissiveIntensity: 0.34 }));
const bmats = new Map<string, THREE.MeshBasicMaterial>();
const basic = (key: string, make: () => THREE.MeshBasicMaterialParameters) => {
  let m = bmats.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial(make()); bmats.set(key, m); }
  return m;
};
/** emissive colour: linear rgb x k (k > ~1.1 blooms) */
const glow = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

/** builder in a room's local frame (origin = the set base): one batch that casts sun shadows, one that does not */
class RB {
  cast = new Batch(); flat = new Batch();
  constructor(public o: V3) {}
  m(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | P3 = 1) {
    const S = typeof s === "number" ? [s, s, s] : s;
    return new THREE.Matrix4().compose(V(this.o[0] + x, this.o[1] + y, this.o[2] + z), Q(rx, ry, rz), V(S[0], S[1], S[2]));
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0, cast = true, bottom = false) {
    (cast ? this.cast : this.flat).add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile, bottom), mat, this.m(0, 0, 0));
  }
  geo(g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | P3 = 1, cast = true) {
    (cast ? this.cast : this.flat).add(g, mat, this.m(x, y, z, ry, rx, rz, s));
  }
  /** rotated box (w x h x d) centred at x,y,z */
  rbox(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, cast = true) {
    this.geo(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry, rx, rz, 1, cast);
  }
  /** flat textured panel facing +z (rotate with ry), centred */
  panel(mat: THREE.Material, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, cast = false) {
    this.geo(new THREE.PlaneGeometry(w, h), mat, x, y, z, ry, rx, rz, 1, cast);
  }
  /** cylinder rod from a to b (room-local) */
  seg(mat: THREE.Material, a: P3, c: P3, r: number, cast = true, sides = 6) {
    const A = V(...a), B = V(...c), d = B.clone().sub(A), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
    const m = new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5).add(V(...this.o)), q, V(1, 1, 1));
    (cast ? this.cast : this.flat).add(new THREE.CylinderGeometry(r, r, L, sides), mat, m);
  }
  /** geometry placed with an explicit quaternion (room-local centre) */
  ori(g: THREE.BufferGeometry, mat: THREE.Material, c: THREE.Vector3, q: THREE.Quaternion, cast = true) {
    (cast ? this.cast : this.flat).add(g, mat, new THREE.Matrix4().compose(c.clone().add(V(...this.o)), q, V(1, 1, 1)));
  }
  done(parent: THREE.Object3D) { this.cast.build(parent, true); this.flat.build(parent, false); }
}

/** jittered low-poly rock (flat normals) */
const rockGeo = (seed: number, r: number, squash = 0.7) => {
  const g = new THREE.IcosahedronGeometry(r, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const key = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let j = key.get(k); if (j === undefined) { j = key.size; key.set(k, j); }
    const f = 0.72 + 0.5 * hash(seed * 13.1 + j * 3.7);
    p.setXYZ(i, p.getX(i) * f * (1 + 0.3 * hash(seed + 2.2)), p.getY(i) * f * squash, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
};

// ======================================================================================================== painters
const font = (g: CanvasRenderingContext2D, px: number, fam = "'Trebuchet MS', Verdana, sans-serif", w = "bold") => { g.font = `${w} ${Math.round(px)}px ${fam}`; };
const fitText = (g: CanvasRenderingContext2D, s: string, maxW: number, px: number, fam?: string, w?: string) => {
  let p = px; font(g, p, fam, w);
  while (g.measureText(s).width > maxW && p > 6) { p -= 2; font(g, p, fam, w); }
  return p;
};
const centerText = (g: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, px: number, col: string, fam?: string, w?: string) => {
  fitText(g, s, maxW, px, fam, w); g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const rrect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const speckle = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, cols: string[], r0: number, r1: number, a = 0.25) => {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = a * (0.4 + 0.6 * r()); g.fillStyle = cols[Math.floor(r() * cols.length) % cols.length];
    g.beginPath(); g.arc(r() * w, r() * h, r0 + r() * (r1 - r0), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
};
const mottle = (g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, cols: string[], s0: number, s1: number, a = 0.08) => {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = a; g.fillStyle = cols[Math.floor(r() * cols.length) % cols.length];
    g.beginPath(); g.ellipse(r() * w, r() * h, s0 + r() * (s1 - s0), (s0 + r() * (s1 - s0)) * 0.7, r() * 3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
};

/** horizontal floor boards (boards run along u), staggered butt joints, grain, knots */
const boardsTex = (key: string, cols: string[], seam: string, rows: number, size = 1024) => ctex(key, size, size, (g, r) => {
  const pw = size / rows;
  g.fillStyle = cols[0]; g.fillRect(0, 0, size, size);
  for (let i = 0; i < rows; i++) {
    let x = -r() * size * 0.5;
    while (x < size) {
      const len = size * (0.35 + r() * 0.5);
      g.fillStyle = cols[Math.floor(r() * cols.length) % cols.length];
      g.fillRect(x, i * pw, len, pw);
      g.strokeStyle = "rgba(70,35,12,0.16)"; g.lineWidth = 1.6;
      for (let k = 0; k < 6; k++) {
        const yy = i * pw + 3 + r() * (pw - 6), ph = r() * 6;
        g.beginPath(); g.moveTo(x, yy);
        for (let s = 1; s <= 10; s++) g.lineTo(x + (len * s) / 10, yy + Math.sin(s * 0.9 + ph) * 2.2);
        g.stroke();
      }
      if (r() < 0.35) { g.fillStyle = "rgba(80,40,15,0.35)"; g.beginPath(); g.ellipse(x + len * r(), i * pw + pw * (0.3 + 0.4 * r()), 7, 4, 0, 0, TAU); g.fill(); }
      g.fillStyle = "rgba(255,240,210,0.10)"; g.fillRect(x, i * pw + 3, len, 3);
      g.fillStyle = seam; g.fillRect(x + len - 2, i * pw, 3, pw);
      x += len;
    }
    g.fillStyle = seam; g.fillRect(0, i * pw, size, 3);
  }
});
/** vertical boards (wainscot / pine walls) */
const vboardsTex = (key: string, cols: string[], seam: string, n: number, w = 1024, h = 512, knots = 0) => ctex(key, w, h, (g, r) => {
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length) % cols.length]; g.fillRect(i * bw, 0, bw, h);
    g.strokeStyle = "rgba(70,35,12,0.13)"; g.lineWidth = 1.4;
    for (let k = 0; k < 4; k++) { const xx = i * bw + 4 + r() * (bw - 8), ph = r() * 6; g.beginPath(); g.moveTo(xx, 0); for (let s = 1; s <= 8; s++) g.lineTo(xx + Math.sin(s + ph) * 2, (h * s) / 8); g.stroke(); }
    for (let k = 0; k < knots; k++) if (r() < 0.5) { g.fillStyle = "rgba(90,45,15,0.45)"; g.beginPath(); g.ellipse(i * bw + bw * (0.3 + 0.4 * r()), r() * h, 5, 8, 0, 0, TAU); g.fill(); }
    g.fillStyle = "rgba(255,245,220,0.12)"; g.fillRect(i * bw + 3, 0, 3, h);
    g.fillStyle = seam; g.fillRect(i * bw, 0, 3, h);
  }
});
const plasterTex = (key: string, base: string, size = 512) => ctex(key, size, size, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  mottle(g, r, size, size, 60, ["#ffffff", "#c9b48a", "#e9c98f"], 30, 90, 0.06);
  speckle(g, r, size, size, 900, ["#b49a70", "#ffffff"], 0.6, 1.6, 0.25);
});
const tilesTex = () => ctex("intCeilTiles", 512, 512, (g, r) => {
  g.fillStyle = "#ece6d8"; g.fillRect(0, 0, 512, 512);
  speckle(g, r, 512, 512, 2400, ["#b8ae98", "#d0c7b2"], 0.5, 1.3, 0.5);
  g.fillStyle = "#c4baa4"; for (const p of [0, 256]) { g.fillRect(p, 0, 5, 512); g.fillRect(0, p, 512, 5); }
});
const metalTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(0, r() * 256, 256, 1 + r() * 2); }
  g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, 30, 256, 10);
});

// ---- classroom art ----
const boardTex = () => ctex("intChalkboard6", 2048, 634, (g, r) => {
  const w = 2048, h = 634;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2f5d47"); gr.addColorStop(1, "#28503d");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  mottle(g, r, w, h, 50, ["#3d6e56", "#24493a"], 60, 180, 0.12);
  // old eraser swirls
  g.strokeStyle = "rgba(220,235,225,0.07)"; g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const cx = r() * w, cy = r() * h, rr = 40 + r() * 90; g.lineWidth = 30 + r() * 30;
    g.beginPath(); for (let a = 0; a < 7; a += 0.3) g.lineTo(cx + Math.cos(a * 2.2) * rr + a * 14, cy + Math.sin(a * 1.7) * rr * 0.5); g.stroke();
  }
  // faint ghost writing + an old sum in the right corner + the date
  g.fillStyle = "rgba(230,240,232,0.10)"; font(g, 90); g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.fillText("SPELLING  TEST", 1350, 160); g.fillText("2 + 3 = 5", 1450, 330);
  g.fillStyle = "rgba(236,242,234,0.55)"; font(g, 58); g.fillText("TUESDAY", 1640, 560);
  // round 2: the right half is written on too: QUIZ TODAY (boxed), the date, a smiley, eraser streaks
  g.strokeStyle = "rgba(220,235,225,0.16)"; g.lineCap = "round";
  for (let i = 0; i < 5; i++) { g.lineWidth = 54; const y = 250 + i * 34 + r() * 10; g.beginPath(); g.moveTo(1280 + r() * 40, y); g.quadraticCurveTo(1500, y - 30 + r() * 20, 1700 + r() * 60, y + 10); g.stroke(); }
  // round 6 (A5 ADD: QUIZ TODAY was only seen during the move): the boxed QUIZ TODAY! now sits in the board's free
  // top-left corner (left of the chalk block, board-local x < -1.5 m), where the opening over-the-shoulder lens sees it
  // whole above the teacher's head while she writes HALF THIS CLASS CHEATED. (in-world irony); caps ~0.1 m = 40+ px
  { const fam = "'Comic Sans MS', 'Trebuchet MS', sans-serif", px = fitText(g, "TODAY!", 240, 104, fam);
    g.fillStyle = "rgba(246,248,240,0.9)"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    font(g, px, fam); g.fillText("TODAY!", 144, 236); font(g, Math.min(px * 1.18, 104), fam); g.fillText("QUIZ", 144, 128); g.textAlign = "left"; }
  g.strokeStyle = "rgba(244,246,238,0.78)"; g.lineWidth = 8; g.beginPath(); g.moveTo(16, 30); g.lineTo(272, 24); g.lineTo(276, 268); g.lineTo(12, 274); g.closePath(); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(40, 290); g.quadraticCurveTo(146, 306, 252, 286); g.stroke(); // underline swoosh
  g.fillStyle = "rgba(244,246,238,0.82)"; font(g, 92, "'Comic Sans MS', 'Trebuchet MS', sans-serif"); g.fillText("PAGE 42", 1440, 140);
  g.strokeStyle = "rgba(244,246,238,0.7)"; g.lineWidth = 7; g.beginPath(); g.moveTo(1356, 40); g.lineTo(1960, 34); g.lineTo(1966, 170); g.lineTo(1350, 176); g.closePath(); g.stroke();
  g.fillStyle = "rgba(244,246,238,0.7)"; font(g, 54, "'Comic Sans MS', 'Trebuchet MS', sans-serif"); g.fillText("JUNE 17", 1420, 250);
  g.strokeStyle = "rgba(244,246,238,0.75)"; g.lineWidth = 8; g.beginPath(); g.arc(1850, 330, 58, 0, TAU); g.stroke();
  g.beginPath(); g.arc(1850, 342, 34, 0.25, Math.PI - 0.25); g.stroke(); g.fillStyle = "rgba(244,246,238,0.8)"; g.beginPath(); g.arc(1830, 312, 8, 0, TAU); g.arc(1872, 312, 8, 0, TAU); g.fill();
  g.strokeStyle = "rgba(236,242,234,0.5)"; g.lineWidth = 6; g.beginPath(); g.arc(1560, 535, 26, 0, TAU); g.stroke();
  for (let a = 0; a < 8; a++) { const an = (a / 8) * TAU; g.beginPath(); g.moveTo(1560 + Math.cos(an) * 36, 535 + Math.sin(an) * 36); g.lineTo(1560 + Math.cos(an) * 52, 535 + Math.sin(an) * 52); g.stroke(); }
  speckle(g, r, w, h, 3000, ["#ffffff"], 0.6, 1.5, 0.06);
});
const rulesTex = () => ctex("intRules", 512, 640, (g) => {
  g.fillStyle = "#fbf1d6"; g.fillRect(0, 0, 512, 640);
  g.fillStyle = "#d8432f"; g.fillRect(0, 0, 512, 128);
  centerText(g, "CLASS RULES", 256, 66, 460, 70, "#fff7e6");
  // round 3 (A2 P3): rule 1 is the gag, so it is drawn big (~0.145 m caps on the x1.6 poster = ~40 px from the OTS lens)
  g.fillStyle = "#2e5aa8"; g.beginPath(); g.arc(44, 214, 20, 0, TAU); g.fill();
  g.fillStyle = "#3a2a22"; g.textAlign = "left"; g.textBaseline = "middle"; fitText(g, "1. BE HONEST", 420, 72); g.fillText("1. BE HONEST", 74, 214);
  g.strokeStyle = "#d8432f"; g.lineWidth = 6; g.beginPath(); g.moveTo(74, 258); g.quadraticCurveTo(260, 270, 480, 254); g.stroke();
  const L = ["2. DO YOUR OWN WORK", "3. RAISE YOUR HAND", "4. BE KIND"];
  L.forEach((s, i) => { g.fillStyle = ["#2f8a4a", "#b8641e", "#8a3c9a"][i]; g.beginPath(); g.arc(46, 350 + i * 96, 14, 0, TAU); g.fill();
    g.fillStyle = "#3a2a22"; g.textAlign = "left"; g.textBaseline = "middle"; fitText(g, s, 410, 40); g.fillText(s, 76, 350 + i * 96); });
  g.strokeStyle = "#d8432f"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 630);
});
const planetsTex = () => ctex("intPlanets", 512, 640, (g, r) => {
  g.fillStyle = "#1c2a66"; g.fillRect(0, 0, 512, 640);
  speckle(g, r, 512, 640, 220, ["#ffffff"], 0.8, 2.2, 0.9);
  const sun = g.createRadialGradient(40, 330, 10, 40, 330, 200); sun.addColorStop(0, "#fff2a8"); sun.addColorStop(0.5, "#ffb53a"); sun.addColorStop(1, "rgba(255,140,40,0)");
  g.fillStyle = sun; g.fillRect(0, 100, 260, 460);
  const P: [number, number, string][] = [[150, 9, "#c9b8a0"], [195, 14, "#e8c27a"], [245, 15, "#4f8fe0"], [290, 11, "#d9603a"], [355, 34, "#d9a86e"], [432, 28, "#e6cf8a"], [480, 18, "#9fd6e6"]];
  for (const [x, rr, c] of P) { g.fillStyle = c; g.beginPath(); g.arc(x, 330, rr, 0, TAU); g.fill(); g.strokeStyle = "rgba(20,20,40,.6)"; g.lineWidth = 3; g.stroke(); }
  g.strokeStyle = "#f0dca0"; g.lineWidth = 4; g.beginPath(); g.ellipse(432, 330, 46, 10, -0.3, 0, TAU); g.stroke();
  centerText(g, "OUR PLANETS", 256, 70, 460, 64, "#ffe27a");
});
const readTex = () => ctex("intRead", 512, 640, (g) => {
  g.fillStyle = "#f6c83c"; g.fillRect(0, 0, 512, 640);
  centerText(g, "READ!", 256, 120, 440, 150, "#7a2f1e", "Impact, 'Arial Black', sans-serif", "normal");
  g.fillStyle = "#2e6fb0"; g.beginPath(); g.moveTo(256, 300); g.lineTo(90, 270); g.lineTo(90, 500); g.lineTo(256, 530); g.closePath(); g.fill();
  g.fillStyle = "#c94a3a"; g.beginPath(); g.moveTo(256, 300); g.lineTo(422, 270); g.lineTo(422, 500); g.lineTo(256, 530); g.closePath(); g.fill();
  g.fillStyle = "#fff8e6"; g.beginPath(); g.moveTo(256, 310); g.lineTo(110, 286); g.lineTo(110, 480); g.lineTo(256, 506); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(256, 310); g.lineTo(402, 286); g.lineTo(402, 480); g.lineTo(256, 506); g.closePath(); g.fill();
  g.strokeStyle = "rgba(60,50,40,0.35)"; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(128, 320 + i * 28); g.lineTo(240, 336 + i * 28); g.stroke(); g.beginPath(); g.moveTo(272, 336 + i * 28); g.lineTo(386, 320 + i * 28); g.stroke(); }
  centerText(g, "A BOOK A DAY", 256, 590, 440, 46, "#7a2f1e");
});
const abcTex = () => ctex("intAbc", 2048, 128, (g) => {
  const L = "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm".split(" "), cols = ["#e8584a", "#f2a53a", "#f5d24a", "#6cbf5a", "#4fa0e0", "#9a6ad0"];
  const cw = 2048 / L.length;
  L.forEach((s, i) => { g.fillStyle = "#fff8ea"; g.fillRect(i * cw + 6, 6, cw - 12, 116); g.fillStyle = cols[i % 6]; g.fillRect(i * cw + 6, 6, cw - 12, 18);
    centerText(g, s, i * cw + cw / 2, 74, cw - 24, 70, "#3a2a26", "Georgia, serif"); });
});
const clockTex = () => ctex("intClock", 256, 256, (g) => {
  g.fillStyle = "#c8402e"; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
  g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.fill();
  g.fillStyle = "#2a2230"; font(g, 30, "Arial, sans-serif"); g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * TAU - Math.PI / 2; g.fillText(String(i), 128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); }
  for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU, r0 = i % 5 ? 104 : 98; g.fillRect(128 + Math.cos(a) * r0 - 1.5, 128 + Math.sin(a) * r0 - 1.5, 3, 3); }
});
const booksTex = (key: string) => ctex(key, 512, 256, (g, r) => {
  g.fillStyle = "#3a2618"; g.fillRect(0, 0, 512, 256);
  const cols = ["#c8402e", "#2e5aa8", "#e0a630", "#3e8a4a", "#8a3c9a", "#e8e0cc", "#d96a2a", "#2a6a7a", "#b03050"];
  let x = 0;
  while (x < 512) {
    const w = 18 + r() * 26, h = 170 + r() * 80, c = cols[Math.floor(r() * cols.length) % cols.length];
    g.fillStyle = c; g.fillRect(x, 256 - h, w - 2, h);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 3, 256 - h + 20, w - 8, 5); g.fillRect(x + 3, 256 - 40, w - 8, 5);
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x + w - 6, 256 - h, 4, h);
    x += w;
  }
});
const drawingsTex = () => ctex("intDrawings", 1024, 512, (g, r) => {
  g.fillStyle = "#c69a62"; g.fillRect(0, 0, 1024, 512);
  speckle(g, r, 1024, 512, 1500, ["#8a6638", "#e2bf8a"], 0.8, 2.2, 0.5);
  const pics = 7;
  for (let i = 0; i < pics; i++) {
    const x = 30 + (i % 4) * 245 + r() * 20, y = 30 + Math.floor(i / 4) * 240 + r() * 15, w = 200, h = 190;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((r() - 0.5) * 0.12);
    g.fillStyle = "#fffdf6"; g.fillRect(-w / 2, -h / 2, w, h);
    g.lineWidth = 7; g.lineCap = "round";
    const k = i % 4;
    if (k === 0) { g.fillStyle = "#f5c63a"; g.beginPath(); g.arc(-50, -40, 30, 0, TAU); g.fill(); g.fillStyle = "#e8584a"; g.fillRect(-10, 0, 80, 60); g.fillStyle = "#4a8ad0"; g.beginPath(); g.moveTo(-20, 0); g.lineTo(30, -50); g.lineTo(80, 0); g.fill(); }
    if (k === 1) { g.strokeStyle = "#3e8a4a"; g.beginPath(); g.moveTo(-70, 60); g.lineTo(70, 60); g.stroke(); g.fillStyle = "#6cbf5a"; g.beginPath(); g.arc(0, -10, 45, 0, TAU); g.fill(); g.fillStyle = "#8a5a36"; g.fillRect(-8, 20, 16, 40); }
    if (k === 2) { g.strokeStyle = "#2e5aa8"; for (let s = -1; s <= 1; s++) { g.beginPath(); g.arc(s * 45, -20, 18, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(s * 45, -2); g.lineTo(s * 45, 50); g.stroke(); } }
    if (k === 3) { g.fillStyle = "#9a6ad0"; g.beginPath(); g.moveTo(-60, 50); g.quadraticCurveTo(0, -90, 60, 50); g.fill(); g.fillStyle = "#f2a53a"; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); }
    g.fillStyle = "#d8432f"; g.beginPath(); g.arc(0, -h / 2 + 10, 7, 0, TAU); g.fill();
    g.restore();
  }
});
const deskTopTex = () => ctex("intDeskTop", 512, 512, (g, r) => {
  g.fillStyle = "#e3bf86"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(150,95,40,0.22)"; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { const y = r() * 512, ph = r() * 6; g.beginPath(); g.moveTo(0, y); for (let s = 1; s <= 12; s++) g.lineTo((512 * s) / 12, y + Math.sin(s * 0.8 + ph) * 4); g.stroke(); }
  g.fillStyle = "#b07a42"; g.fillRect(0, 0, 512, 10); g.fillRect(0, 502, 512, 10); g.fillRect(0, 0, 10, 512); g.fillRect(502, 0, 10, 512);
});
const paperTex = (key: string, title: string, grade = "") => ctex(key, 256, 320, (g) => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#e05a4a"; g.fillRect(34, 0, 3, 320);
  g.fillStyle = "#9fb9da"; for (let y = 70; y < 320; y += 24) g.fillRect(0, y, 256, 2);
  g.fillStyle = "#3a3440"; font(g, 30); g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(title, 48, 40);
  g.fillStyle = "#5a5870"; for (let y = 82; y < 300; y += 24) g.fillRect(48, y - 6, 60 + ((y * 37) % 130), 4);
  if (grade) { g.strokeStyle = "#d8432f"; g.lineWidth = 5; g.beginPath(); g.arc(205, 40, 28, 0, TAU); g.stroke(); centerText(g, grade, 205, 42, 48, 34, "#d8432f"); }
});
const globeTex = () => ctex("intGlobe", 512, 256, (g, r) => {
  g.fillStyle = "#3f86d0"; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#6cbf5a";
  for (let i = 0; i < 9; i++) { const x = r() * 512, y = 50 + r() * 160; g.beginPath(); for (let a = 0; a < TAU; a += 0.5) g.lineTo(x + Math.cos(a) * (25 + r() * 35), y + Math.sin(a) * (18 + r() * 25)); g.fill(); }
  g.fillStyle = "#f2efe6"; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
  g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 2; for (let x = 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
});
const outsideFarTex = () => ctex("intOutsideFar", 1024, 512, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, "#3f8ae6"); sky.addColorStop(0.55, "#8fc4f4"); sky.addColorStop(1, "#d9ecf6");
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
  for (const [cx, cy, s] of [[250, 110, 1], [760, 80, 0.8]] as [number, number, number][]) {
    g.fillStyle = "#b9c6ea"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(cx + (k - 2) * 34 * s, cy + 14 * s, (26 + 8 * Math.sin(k * 2)) * s, 0, TAU); g.fill(); }
    g.fillStyle = "#fbfbff"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(cx + (k - 2) * 34 * s, cy + Math.sin(k) * 6 * s, (28 + 8 * Math.sin(k * 2)) * s, 0, TAU); g.fill(); }
  }
  g.fillStyle = "#8eb07a"; g.beginPath(); g.moveTo(0, 360); g.bezierCurveTo(240, 300, 420, 330, 600, 310); g.bezierCurveTo(800, 290, 920, 330, 1024, 320); g.lineTo(1024, 512); g.lineTo(0, 512); g.fill();
  g.fillStyle = "#c98e62"; g.fillRect(620, 280, 260, 90); g.fillStyle = "#a8603e"; g.beginPath(); g.moveTo(600, 284); g.lineTo(750, 236); g.lineTo(900, 284); g.fill();
  g.fillStyle = "#f2e6c8"; for (let k = 0; k < 5; k++) g.fillRect(640 + k * 48, 300, 28, 26);
  g.fillStyle = "#7da35e"; g.fillRect(0, 380, 1024, 132);
  g.fillStyle = "#d8b98a"; g.fillRect(0, 400, 1024, 14);
  g.strokeStyle = "#f2efe6"; g.lineWidth = 4; for (let x = 6; x < 1024; x += 26) { g.beginPath(); g.moveTo(x, 372); g.lineTo(x, 404); g.stroke(); }
  g.beginPath(); g.moveTo(0, 378); g.lineTo(1024, 378); g.moveTo(0, 392); g.lineTo(1024, 392); g.stroke();
  speckle(g, r, 1024, 132, 300, ["#5e8a48", "#a9c98a"], 1, 3, 0.5);
});
/** near tree just outside the window: trunk, branches, shaded leaf clusters (alpha cut-out) */
const outsideTreeTex = () => ctex("intOutsideTree", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  g.strokeStyle = "#5e3e28"; g.lineCap = "round";
  g.lineWidth = 38; g.beginPath(); g.moveTo(250, 512); g.bezierCurveTo(245, 420, 262, 360, 250, 290); g.stroke();
  for (const [x1, y1, x2, y2, w] of [[250, 330, 140, 230, 16], [252, 310, 380, 210, 15], [250, 290, 230, 160, 13], [160, 250, 90, 210, 8], [360, 230, 440, 200, 8]] as number[][]) { g.lineWidth = w; g.beginPath(); g.moveTo(250, y1 + 10); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke(); void x2; }
  const blob = (x: number, y: number, s: number) => {
    g.fillStyle = "#3f7a3a"; g.beginPath(); g.arc(x + 6, y + 8, s, 0, TAU); g.fill();
    g.fillStyle = "#5aa04a"; g.beginPath(); g.arc(x, y, s * 0.92, 0, TAU); g.fill();
    g.fillStyle = "#86c462"; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.32, s * 0.45, 0, TAU); g.fill();
  };
  for (let k = 0; k < 16; k++) { const a = r() * TAU, d = 40 + r() * 150; blob(250 + Math.cos(a) * d * 1.25, 175 + Math.sin(a) * d * 0.62, 40 + r() * 30); }
  g.fillStyle = "#d84a3a"; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(150 + r() * 220, 130 + r() * 120, 7, 0, TAU); g.fill(); }
});
const worldMapTex = () => ctex("intWorldMap", 2048, 128, (g, r) => {
  g.fillStyle = "#7ab8e6"; g.fillRect(0, 0, 2048, 128);
  g.fillStyle = "#f2d27a"; for (let i = 0; i < 9; i++) { const x = 80 + i * 230 + r() * 60; g.beginPath(); for (let a = 0; a < TAU; a += 0.6) g.lineTo(x + Math.cos(a) * (40 + r() * 50), 70 + Math.sin(a) * (30 + r() * 25)); g.fill(); }
  g.fillStyle = "#8cc46a"; for (let i = 0; i < 6; i++) { const x = 160 + i * 330 + r() * 60; g.beginPath(); for (let a = 0; a < TAU; a += 0.6) g.lineTo(x + Math.cos(a) * (30 + r() * 30), 60 + Math.sin(a) * (20 + r() * 18)); g.fill(); }
  g.fillStyle = "#f4f0e4"; g.fillRect(0, 100, 2048, 28); centerText(g, "WORLD MAP", 1024, 114, 400, 26, "#3a2a26", "Arial, sans-serif");
});
/** round 6 (A5 ADD: the crib sheet must read next to the student's smug face): a big yellow crib card (3 lines,
 *  ~0.045 m caps), stood up like a tent card on the right desk's top */
const cribTex6 = () => ctex("intCrib6", 512, 384, (g, r) => {
  g.fillStyle = "#fff15a"; g.fillRect(0, 0, 512, 384); g.fillStyle = "rgba(180,140,0,0.14)"; g.fillRect(0, 0, 512, 46);
  g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(180, 0, 150, 30); // a strip of tape
  const fam = "'Comic Sans MS', 'Trebuchet MS', sans-serif", L = ["1.B  2.C", "3.A  4.D", "5.B  !!"];
  const px = Math.min(...L.map((t) => fitText(g, t, 470, 112, fam)));
  g.fillStyle = "#26265a"; g.textAlign = "left"; g.textBaseline = "middle";
  L.forEach((t, i) => { g.save(); g.translate(26, 108 + i * 104); g.rotate((r() - 0.5) * 0.04); font(g, px, fam); g.fillText(t, 0, 0); g.restore(); });
  g.strokeStyle = "rgba(200,40,40,0.85)"; g.lineWidth = 7; g.beginPath(); g.arc(352, 316, 34, 0, TAU); g.stroke(); // the circled '!!'
});
const cribTex = () => ctex("intCrib", 192, 128, (g) => {
  g.fillStyle = "#fff59a"; g.fillRect(0, 0, 192, 128); g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(60, 0, 70, 18);
  g.fillStyle = "#2a2a58"; g.font = "bold 24px 'Comic Sans MS', 'Trebuchet MS', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle";
  ["1. B   2. C", "3. A   4. D", "5. B !!"].forEach((s, i) => g.fillText(s, 12, 40 + i * 32));
});
const backpackTex = (key: string, base: string) => ctex(key, 128, 128, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(0,0,0,0.18)"; rrect(g, 20, 60, 88, 56, 14); g.fill();
  g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(20, 86, 88, 4);
});
// ---- classroom art, round 4 (A3 P2: the punchline's back wall was bare beige) ----
const star5 = (g: CanvasRenderingContext2D, x: number, y: number, R: number, c: string) => {
  g.fillStyle = c; g.beginPath();
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? R * 0.45 : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
};
/** the ironic poster (1.13 x 0.85 m): four lines of Arial Black, caps ~0.13 m = 40+ px from the end framing */
const honestyTex = () => ctex("clHonesty", 678, 510, (g) => {
  g.fillStyle = "#fdf3d2"; g.fillRect(0, 0, 678, 510);
  g.fillStyle = "#2e5aa8"; g.fillRect(0, 0, 678, 14); g.fillRect(0, 496, 678, 14); g.fillRect(0, 0, 14, 510); g.fillRect(664, 0, 14, 510);
  star5(g, 50, 52, 24, "#f2b632"); star5(g, 628, 52, 24, "#f2b632"); star5(g, 50, 458, 20, "#e8584a"); star5(g, 628, 458, 20, "#e8584a");
  ([["HONESTY", "#c8302a"], ["IS THE", "#24346e"], ["BEST", "#24346e"], ["POLICY", "#c8302a"]] as [string, string][])
    .forEach(([t, c], i) => centerText(g, t, 339, 84 + i * 114, 560, 108, c, "'Arial Black', Impact, sans-serif", "normal"));
});
/** corkboard of four pinned crayon drawings (a house, a sun + tree, a dog, a rainbow) */
const drawings4Tex = () => ctex("clDrawings4", 512, 468, (g, r) => {
  g.fillStyle = "#c69a62"; g.fillRect(0, 0, 512, 468);
  speckle(g, r, 512, 468, 900, ["#8a6638", "#e2bf8a"], 0.8, 2.2, 0.5);
  for (let i = 0; i < 4; i++) {
    const x = 22 + (i % 2) * 248 + r() * 12, y = 22 + Math.floor(i / 2) * 222 + r() * 10, w = 220, h = 196;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((r() - 0.5) * 0.16);
    g.fillStyle = ["#fffdf6", "#fff6dc", "#f4fbff", "#fffdf6"][i]; g.fillRect(-w / 2, -h / 2, w, h);
    g.lineWidth = 8; g.lineCap = "round"; g.lineJoin = "round";
    if (i === 0) { g.fillStyle = "#e8584a"; g.fillRect(-55, -5, 110, 70); g.fillStyle = "#4a8ad0"; g.beginPath(); g.moveTo(-70, -5); g.lineTo(0, -65); g.lineTo(70, -5); g.fill(); g.fillStyle = "#f5c63a"; g.fillRect(-15, 25, 30, 40); }
    if (i === 1) { g.fillStyle = "#f5c63a"; g.beginPath(); g.arc(-50, -45, 26, 0, TAU); g.fill(); g.strokeStyle = "#f5a63a"; for (let a = 0; a < 8; a++) { const an = (a / 8) * TAU; g.beginPath(); g.moveTo(-50 + Math.cos(an) * 34, -45 + Math.sin(an) * 34); g.lineTo(-50 + Math.cos(an) * 46, -45 + Math.sin(an) * 46); g.stroke(); }
      g.fillStyle = "#8a5a36"; g.fillRect(30, 0, 16, 60); g.fillStyle = "#6cbf5a"; g.beginPath(); g.arc(38, -10, 38, 0, TAU); g.fill(); }
    if (i === 2) { g.fillStyle = "#b8864e"; g.beginPath(); g.ellipse(0, 10, 60, 32, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(58, -22, 24, 0, TAU); g.fill();
      g.strokeStyle = "#7a5430"; for (const lx of [-40, -15, 15, 40]) { g.beginPath(); g.moveTo(lx, 34); g.lineTo(lx, 62); g.stroke(); } g.beginPath(); g.moveTo(-60, 0); g.lineTo(-84, -24); g.stroke();
      g.fillStyle = "#2a2230"; g.beginPath(); g.arc(64, -28, 4, 0, TAU); g.fill(); }
    if (i === 3) { const C3 = ["#e8584a", "#f2a53a", "#f5d24a", "#6cbf5a", "#4fa0e0", "#9a6ad0"]; C3.forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 11; g.beginPath(); g.arc(0, 60, 84 - k * 11, Math.PI, TAU); g.stroke(); }); }
    g.fillStyle = "#d8432f"; g.beginPath(); g.arc(0, -h / 2 + 12, 8, 0, TAU); g.fill();
    g.restore();
  }
});
// ---- classroom art, round 6 (A5 P3: the wall above the bookshelf was a big empty beige plane at the whip landing) ----
const worldMap6Tex = () => ctex("clWorldMap6", 1024, 576, (g, r) => {
  g.fillStyle = "#7cc0ea"; g.fillRect(0, 0, 1024, 576);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; for (let x = 64; x < 1024; x += 128) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 576); g.stroke(); } for (let y = 124; y < 576; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  const blob = (cx: number, cy: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); for (let a = 0; a < TAU; a += 0.35) { const k = 0.75 + 0.35 * r(); g.lineTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); } g.closePath(); g.fill(); g.strokeStyle = "rgba(60,50,40,0.5)"; g.lineWidth = 3; g.stroke(); };
  blob(210, 220, 120, 90, "#f2c46a"); blob(270, 400, 60, 100, "#9ad06a"); blob(520, 200, 70, 70, "#e88a6a"); blob(540, 360, 70, 110, "#f0d27a"); blob(760, 230, 160, 100, "#b48ad8"); blob(860, 440, 70, 50, "#f29a8a");
  g.fillStyle = "#e8584a"; g.beginPath(); g.arc(250, 270, 10, 0, TAU); g.fill(); // "we are here"
  g.fillStyle = "#fbf3dc"; g.fillRect(0, 0, 1024, 62); centerText(g, "OUR WORLD", 512, 34, 520, 46, "#2a3a6a", "'Arial Black', Impact, sans-serif", "normal");
  g.strokeStyle = "#8a5a36"; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 562);
});
const starChartTex = () => ctex("clStars6", 512, 640, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 512, 640); g.fillStyle = "#2e6fb0"; g.fillRect(0, 0, 512, 104);
  star5(g, 50, 52, 26, "#f2c23a"); star5(g, 462, 52, 26, "#f2c23a");
  centerText(g, "STAR", 256, 34, 300, 40, "#fff7e0", "'Arial Black', Impact, sans-serif", "normal"); centerText(g, "STUDENTS", 256, 78, 330, 40, "#fff7e0", "'Arial Black', Impact, sans-serif", "normal");
  const N = ["AMY", "BEN", "CARA", "DEV", "ELLA", "FINN", "GUS"], S = [5, 3, 6, 2, 4, 6, 1];
  N.forEach((n, i) => { const y = 140 + i * 70; g.fillStyle = i % 2 ? "#f3ecdc" : "#fffaf0"; g.fillRect(8, y - 32, 496, 66); g.fillStyle = "#3a2a26"; g.font = "bold 34px 'Trebuchet MS', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(n, 24, y);
    for (let k = 0; k < S[i]; k++) star5(g, 168 + k * 54, y, 22, k % 3 === 2 ? "#e8584a" : "#f2b632"); });
  g.strokeStyle = "#2e6fb0"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 630);
});
const corkNoticeTex = () => ctex("clCork6", 768, 470, (g, r) => {
  g.fillStyle = "#c69a62"; g.fillRect(0, 0, 768, 470); speckle(g, r, 768, 470, 1200, ["#8a6638", "#e2bf8a"], 0.8, 2.2, 0.5);
  const note = (x: number, y: number, w: number, h: number, c: string, rot: number, lines: string[], ink = "#2a2a58") => {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(-w / 2 + 6, -h / 2 + 6, w, h); g.fillStyle = c; g.fillRect(-w / 2, -h / 2, w, h);
    lines.forEach((t, i) => centerText(g, t, 0, -h / 2 + 40 + i * 40, w - 20, 30, ink, "'Comic Sans MS', 'Trebuchet MS', sans-serif"));
    g.fillStyle = "#d8432f"; g.beginPath(); g.arc(0, -h / 2 + 12, 9, 0, TAU); g.fill(); g.restore(); };
  note(130, 130, 220, 180, "#fff59a", -0.06, ["FIELD TRIP", "FRIDAY!"]);
  note(390, 120, 230, 160, "#ffd6e0", 0.05, ["LOST:", "BLUE PENCIL"]);
  note(630, 150, 210, 200, "#d6ecff", -0.04, ["SPELLING", "WINNERS", "WED"]);
  note(250, 340, 260, 170, "#e8f8d6", 0.04, ["PLEASE DO", "NOT COPY", "HOMEWORK"], "#8a2a1e");
  note(560, 360, 220, 150, "#fffaf0", -0.07, ["LUNCH: TACO", "TUESDAY"]);
  g.strokeStyle = "#7a4a2c"; g.lineWidth = 16; g.strokeRect(8, 8, 752, 454);
});
const kidDraw6Tex = (k: number) => ctex("clKid6_" + k, 320, 360, (g) => {
  g.fillStyle = k ? "#fff6dc" : "#f4fbff"; g.fillRect(0, 0, 320, 360); g.lineWidth = 10; g.lineCap = "round"; g.lineJoin = "round";
  if (k === 0) { // a rocket
    g.fillStyle = "#e8584a"; g.beginPath(); g.moveTo(160, 40); g.lineTo(210, 150); g.lineTo(210, 250); g.lineTo(110, 250); g.lineTo(110, 150); g.closePath(); g.fill();
    g.fillStyle = "#4fa0e0"; g.beginPath(); g.arc(160, 160, 26, 0, TAU); g.fill(); g.fillStyle = "#f2b632"; g.beginPath(); g.moveTo(120, 250); g.lineTo(160, 330); g.lineTo(200, 250); g.closePath(); g.fill();
    for (const [x, y] of [[50, 60], [270, 90], [60, 290], [260, 300]]) star5(g, x, y, 16, "#f2c23a");
  } else { // a cat + a sun
    g.fillStyle = "#f5c63a"; g.beginPath(); g.arc(250, 70, 40, 0, TAU); g.fill();
    g.fillStyle = "#e0883a"; g.beginPath(); g.ellipse(150, 250, 90, 60, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(90, 190, 46, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(60, 160); g.lineTo(66, 120); g.lineTo(90, 150); g.moveTo(100, 150); g.lineTo(118, 118); g.lineTo(126, 160); g.fill();
    g.fillStyle = "#2a2230"; g.beginPath(); g.arc(78, 186, 6, 0, TAU); g.arc(104, 186, 6, 0, TAU); g.fill();
    g.strokeStyle = "#e0883a"; g.beginPath(); g.moveTo(236, 250); g.quadraticCurveTo(300, 230, 280, 170); g.stroke();
  }
  g.fillStyle = "#d8432f"; g.beginPath(); g.arc(160, 14, 9, 0, TAU); g.fill();
});
const pennant6Tex = () => ctex("clPennant6", 160, 512, (g) => {
  g.clearRect(0, 0, 160, 512); g.fillStyle = "#2e8a5a"; g.beginPath(); g.moveTo(0, 0); g.lineTo(160, 0); g.lineTo(80, 512); g.closePath(); g.fill();
  g.fillStyle = "#f2c23a"; g.fillRect(0, 0, 160, 24);
  "GO TEAM".split("").forEach((ch, i) => { if (ch !== " ") centerText(g, ch, 80, 70 + i * 52, 70, 50, "#fdf3d2", "'Arial Black', Impact, sans-serif", "normal"); });
});

/** green EXIT sign: running figure + caps + arrow (self-lit) */
const exitTex = () => ctex("clExit", 384, 136, (g) => {
  g.fillStyle = "#16883f"; rrect(g, 0, 0, 384, 136, 12); g.fill();
  g.fillStyle = "#f4fff6"; rrect(g, 8, 8, 368, 120, 8); g.fill(); g.fillStyle = "#1d9a4a"; rrect(g, 14, 14, 356, 108, 6); g.fill();
  g.strokeStyle = "#f4fff6"; g.fillStyle = "#f4fff6"; g.lineWidth = 9; g.lineCap = "round";
  g.beginPath(); g.arc(62, 38, 10, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(58, 52); g.lineTo(52, 82); g.lineTo(36, 104); g.moveTo(52, 82); g.lineTo(70, 98); g.lineTo(72, 112); g.moveTo(56, 60); g.lineTo(36, 72); g.moveTo(56, 60); g.lineTo(78, 70); g.stroke();
  centerText(g, "EXIT", 214, 70, 200, 78, "#f4fff6", "'Arial Black', Impact, sans-serif", "normal");
  g.beginPath(); g.moveTo(326, 46); g.lineTo(354, 68); g.lineTo(326, 90); g.closePath(); g.fill();
});
/** the window light thrown onto the back wall near the window corner: a skewed 2 x 2 pane patch, the mullion and
 *  transom bars cut out, soft edges (white on transparent; additive warm #FFD9A0 in the scene) */
const sunPatchTex = () => ctex("clSunPatch", 256, 528, (g) => {
  g.clearRect(0, 0, 256, 528);
  // plane: z 2.59 .. 3.51 (u), y 0.8 .. 2.7 (v)
  const P = (z: number, y: number): [number, number] => [((z - 2.59) / 0.92) * 256, (1 - (y - 0.8) / 1.9) * 528];
  const quad = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.closePath(); g.fill(); };
  g.filter = "blur(4px)";
  const top = (z: number) => 2.36 + ((z - 2.64) / 0.84) * 0.28, bot = (z: number) => 0.84 + ((z - 2.64) / 0.84) * 0.28;
  const gr = g.createLinearGradient(0, 0, 0, 528); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0.8)"); g.fillStyle = gr;
  quad(P(2.64, top(2.64)), P(3.48, top(3.48)), P(3.48, bot(3.48)), P(2.64, bot(2.64)));
  g.globalCompositeOperation = "destination-out"; g.filter = "blur(2px)"; g.fillStyle = "#000";
  const mz = 3.06, my = (z: number) => (top(z) + bot(z)) / 2 + 0.12;
  quad(P(mz - 0.035, 2.75), P(mz + 0.035, 2.75), P(mz + 0.035, 0.8), P(mz - 0.035, 0.8));
  quad(P(2.55, my(2.55) + 0.03), P(3.55, my(3.55) + 0.03), P(3.55, my(3.55) - 0.03), P(2.55, my(2.55) - 0.03));
  g.globalCompositeOperation = "source-over"; g.filter = "none";
});

// ---- storeroom art ----
const crateTex = () => ctex("intCrate", 1024, 512, (g, r) => {
  // slats with gaps (the gap colour is dark), stencil "CONSCIENCE / PILE"
  g.fillStyle = "#2b1a12"; g.fillRect(0, 0, 1024, 512);
  const cols = ["#c4925a", "#b8854e", "#cf9c62"];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = cols[i % 3]; g.fillRect(0, 8 + i * 126, 1024, 114);
    g.strokeStyle = "rgba(90,50,20,0.25)"; g.lineWidth = 2; for (let k = 0; k < 5; k++) { const y = 14 + i * 126 + r() * 100; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(300, y + 6, 700, y - 6, 1024, y + 3); g.stroke(); }
  }
  g.fillStyle = "#9a6a3a"; g.fillRect(0, 0, 60, 512); g.fillRect(964, 0, 60, 512);
  g.fillStyle = "#5a3a22"; for (const x of [30, 994]) for (const y of [60, 190, 316, 444]) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
  // round 5: the CONSCIENCE PILE stencil is its own unlit overlay (stencilTex) so it keeps its cream in the blue night;
  // here only a faint darker overspray halo where the letters sit, and the grit
  g.fillStyle = "rgba(43,26,18,0.22)"; g.textAlign = "center"; g.textBaseline = "middle";
  fitText(g, "CONSCIENCE", 880, 186, "Impact, 'Arial Black', sans-serif", "normal"); g.fillText("CONSCIENCE", 512, 168);
  fitText(g, "PILE", 880, 186, "Impact, 'Arial Black', sans-serif", "normal"); g.fillText("PILE", 512, 352);
  g.globalCompositeOperation = "source-atop";
  speckle(g, r, 1024, 512, 1800, ["#2b1a12"], 0.8, 2.4, 0.5);
  g.globalCompositeOperation = "source-over";
});
/** round 5 (A4 P2: lilac letters on a lilac crate): the stencil as a transparent overlay: cream #F1E2C0 letters with a
 *  dark worn edge (paint build-up), stencil bridges, spray specks and wear, drawn on an unlit plane in front of the crate */
const stencilTex = () => ctex("srStencil5", 1024, 512, (g, r) => {
  g.clearRect(0, 0, 1024, 512);
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  const fam = "Impact, 'Arial Black', sans-serif";
  const line = (s: string, y: number) => {
    fitText(g, s, 840, 170, fam, "normal");
    g.strokeStyle = "rgba(34,20,12,0.92)"; g.lineWidth = 15; g.strokeText(s, 512, y);   // dark worn edge
    g.fillStyle = "#f1e2c0"; g.fillText(s, 512, y);
  };
  line("CONSCIENCE", 168); line("PILE", 352);
  // stencil bridges (the cut stencil's ties) and a soft overspray
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 15; i++) g.fillRect(128 + i * 54, 150 + (i % 2) * 34, 7, 12);
  for (let i = 0; i < 4; i++) g.fillRect(400 + i * 72, 340 + (i % 2) * 18, 7, 12);
  // wear: chipped specks and two scuffs
  for (let i = 0; i < 520; i++) { g.globalAlpha = 0.35 + 0.65 * r(); g.beginPath(); g.arc(r() * 1024, r() * 512, 0.8 + r() * 2.6, 0, TAU); g.fill(); }
  g.globalAlpha = 0.55; g.fillRect(250, 196, 120, 6); g.fillRect(610, 380, 90, 5);
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.globalCompositeOperation = "destination-over"; speckle(g, r, 1024, 512, 260, ["rgba(241,226,192,1)"], 0.6, 1.8, 0.35); g.globalCompositeOperation = "source-over";
});
/** round 5 (A4 P3: the 1972 note on the far corkboard had ~20 px letters): a kraft card tied to the crate front */
const note1972Tex = () => ctex("srNote1972", 512, 320, (g, r) => {
  g.fillStyle = "#d9f0ff"; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "rgba(120,150,200,0.35)"; for (let y = 70; y < 320; y += 52) g.fillRect(0, y, 512, 2);
  g.fillStyle = "#26265a"; g.textAlign = "center"; g.textBaseline = "middle";
  g.save(); g.translate(256, 108); g.rotate(-0.03); fitText(g, "SORRY - MY DAD", 470, 92, MARKER); g.fillText("SORRY - MY DAD", 0, 0); g.restore();
  g.save(); g.translate(256, 218); g.rotate(0.02); fitText(g, "TOOK IT IN 1972", 470, 92, MARKER); g.fillText("TOOK IT IN 1972", 0, 0); g.restore();
  g.fillStyle = "#d8404a"; g.beginPath(); g.moveTo(452, 292); g.bezierCurveTo(436, 272, 458, 262, 461, 276); g.bezierCurveTo(464, 262, 486, 272, 470, 292); g.lineTo(461, 302); g.closePath(); g.fill();
  speckle(g, r, 512, 320, 60, ["#8aa0c0"], 0.6, 1.4, 0.3);
});
/** round 5: glass jar label (kraft strip, year range) */
const jarLabelTex = (key: string, a: string, b: string) => ctex(key, 256, 128, (g) => {
  g.fillStyle = "#e9d6a8"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#5a3a22"; g.lineWidth = 6; g.strokeRect(6, 6, 244, 116);
  centerText(g, a, 128, 44, 230, 40, "#2a2230", "'Arial Black', Arial, sans-serif", "normal"); centerText(g, b, 128, 92, 230, 44, "#b8302a", "'Arial Black', Arial, sans-serif", "normal");
});
/** round 5: soft moonlight shaft: flat bright core, ~25 % feathered edges across v, fades in at the window end and out
 *  toward the floor along u (u = 0 at the window) */
const moonShaftTex = () => ctex("srMoonShaft5", 256, 128, (g) => {
  const im = g.createImageData(256, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 127 - 0.5) * 2;
    const across = 1 - THREE.MathUtils.smoothstep(v, 0.62, 1.0), along = THREE.MathUtils.smoothstep(u, 0.0, 0.1) * (1 - 0.35 * THREE.MathUtils.smoothstep(u, 0.3, 0.7) - 0.65 * THREE.MathUtils.smoothstep(u, 0.75, 1.0));
    const streak = 0.86 + 0.14 * Math.sin(y * 0.21 + Math.sin(y * 0.07) * 2.0);
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(across * along * streak));
  }
  g.putImageData(im, 0, 0);
});
const envelopeTex = (key: string, airmail: boolean, stamp: string) => ctex(key, 256, 128, (g, r) => {
  g.fillStyle = "#f6efdc"; g.fillRect(0, 0, 256, 128);
  if (airmail) for (let x = -20; x < 280; x += 28) { g.fillStyle = (x / 28) % 2 ? "#d8432f" : "#2e5aa8"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 14, 0); g.lineTo(x + 4, 10); g.lineTo(x - 10, 10); g.fill(); g.beginPath(); g.moveTo(x, 118); g.lineTo(x + 14, 118); g.lineTo(x + 4, 128); g.lineTo(x - 10, 128); g.fill(); }
  g.fillStyle = stamp; g.fillRect(200, 16, 40, 46); g.strokeStyle = "#fbf6ea"; g.lineWidth = 3; g.setLineDash([4, 3]); g.strokeRect(202, 18, 36, 42); g.setLineDash([]);
  g.strokeStyle = "rgba(40,40,60,0.6)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(196, 40, 14 + k * 6, -0.8, 0.8); g.stroke(); }
  g.fillStyle = "#3a3450"; for (let i = 0; i < 3; i++) g.fillRect(70, 58 + i * 16, 80 + r() * 60, 4);
});
const parcelTex = (key: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#c79a62"; g.fillRect(0, 0, 256, 256);
  mottle(g, r, 256, 256, 20, ["#b5884f", "#d8ad74"], 20, 60, 0.3);
  g.fillStyle = "#e9dcc0"; g.fillRect(0, 118, 256, 14); g.fillRect(118, 0, 14, 256);
  g.fillStyle = "#fbf7ec"; g.fillRect(30, 30, 80, 60); g.fillStyle = "#3a3450"; for (let i = 0; i < 3; i++) g.fillRect(38, 42 + i * 14, 50 + r() * 14, 4);
  g.fillStyle = ["#d8432f", "#2e8a5a", "#e0a630"][Math.floor(r() * 3) % 3]; g.fillRect(160, 160, 50, 56);
  g.fillStyle = "#d8432f"; font(g, 26); g.textAlign = "center"; g.fillText("RETURN", 128, 228);
});
/** handwritten apology note; lines are drawn big so they read on camera */
/** round 6b: the same paper note with ~40 % bigger letters (2 lines fitted to the full width, no ruled margin) */
const noteTexBig = (key: string, lines: string[], paper = "#fbf8ee", ink = "#2a2a58") => ctex(key, 512, 360, (g, r) => {
  g.fillStyle = paper; g.fillRect(0, 0, 512, 360);
  g.fillStyle = "rgba(120,150,200,0.3)"; for (let y = 52; y < 360; y += 50) g.fillRect(0, y, 512, 2);
  g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(0, 0, 512, 16);
  g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
  const fam = "'Comic Sans MS', 'Trebuchet MS', sans-serif";
  const px = Math.min(...lines.map((s) => fitText(g, s, 492, 150, fam)));
  lines.forEach((s, i) => { g.save(); g.translate(252, 360 / 2 + (i - (lines.length - 1) / 2) * px * 1.04 - 6); g.rotate((r() - 0.5) * 0.05); font(g, px, fam); g.fillText(s, 0, 0); g.restore(); });
  g.strokeStyle = "rgba(180,40,60,0.75)"; g.lineWidth = 5; g.beginPath(); g.moveTo(444, 330); g.bezierCurveTo(428, 306, 468, 298, 468, 322); g.bezierCurveTo(468, 298, 508, 306, 492, 330); g.lineTo(468, 352); g.closePath(); g.stroke();
});
const noteTex = (key: string, lines: string[], paper = "#fbf8ee", ink = "#2a2a58") => ctex(key, 512, 384, (g, r) => {
  g.fillStyle = paper; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "rgba(120,150,200,0.35)"; for (let y = 60; y < 384; y += 46) g.fillRect(0, y, 512, 2);
  g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
  const fam = "'Comic Sans MS', 'Trebuchet MS', sans-serif";
  lines.forEach((s, i) => {
    g.save(); g.translate(256, 384 / 2 + (i - (lines.length - 1) / 2) * 118); g.rotate((r() - 0.5) * 0.06);
    fitText(g, s, 470, lines.length === 1 ? 150 : 104, fam); g.fillText(s, 0, 0); g.restore();
  });
  g.strokeStyle = "rgba(180,40,60,0.7)"; g.lineWidth = 5; g.beginPath(); g.moveTo(420, 340); g.bezierCurveTo(400, 310, 450, 300, 450, 330); g.bezierCurveTo(450, 300, 500, 310, 480, 340); g.lineTo(450, 370); g.closePath(); g.stroke();
});
const trailMapTex = () => ctex("intTrailMap", 768, 560, (g, r) => {
  g.fillStyle = "#efe2bf"; g.fillRect(0, 0, 768, 560);
  mottle(g, r, 768, 560, 30, ["#d8c08e", "#e9c9a0", "#c9a8d0"], 40, 120, 0.25);
  g.fillStyle = "#5a3a22"; g.fillRect(0, 0, 768, 90); centerText(g, "TRAIL MAP", 384, 46, 700, 64, "#f4e6c4", "Georgia, serif");
  const T: [string, string, number][] = [["JASPER", "#c84a3a", 180], ["LONG LOGS", "#2e6fb0", 384], ["CRYSTAL", "#8a5aa8", 590]];
  for (const [n, c, x] of T) {
    g.strokeStyle = c; g.lineWidth = 9; g.setLineDash([22, 12]); g.beginPath(); g.moveTo(384, 520); g.bezierCurveTo(384, 430, x, 360, x + (r() - 0.5) * 40, 160); g.stroke(); g.setLineDash([]);
    g.fillStyle = c; g.beginPath(); g.arc(x, 150, 14, 0, TAU); g.fill();
    centerText(g, n, x, 120, 190, 34, "#3a2a1a");
  }
  g.fillStyle = "#3a2a1a"; g.beginPath(); g.arc(384, 520, 16, 0, TAU); g.fill();
  centerText(g, "YOU ARE HERE", 384, 548, 300, 22, "#3a2a1a");
  // round 5 (A4 ADD): push-pins where returned pieces were taken (clustered on the trails), with tiny shadows
  for (let i = 0; i < 26; i++) {
    const T0 = T[i % 3], u = 0.25 + 0.7 * r(), x = 384 + (T0[2] - 384) * u + (r() - 0.5) * 60, y = 520 - 370 * u + (r() - 0.5) * 30;
    g.fillStyle = "rgba(40,20,10,0.35)"; g.beginPath(); g.arc(x + 4, y + 5, 8, 0, TAU); g.fill();
    g.fillStyle = ["#d8342c", "#f2c230", "#2e8a5a", "#d8342c"][i % 4]; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x - 3, y - 3, 3, 0, TAU); g.fill();
  }
});
const calendarTex = () => ctex("intCalendar", 384, 512, (g) => {
  g.fillStyle = "#fbf7ec"; g.fillRect(0, 0, 384, 512);
  g.fillStyle = "#3a6a4a"; g.fillRect(0, 0, 384, 120); centerText(g, "JUNE", 192, 62, 340, 80, "#fbf7ec", "Georgia, serif");
  g.fillStyle = "#6a6070"; font(g, 26, "Arial, sans-serif"); g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 30; i++) { const x = 34 + (i % 7) * 52, y = 160 + Math.floor(i / 7) * 70; g.fillText(String(i + 1), x, y); if (i < 17) { g.strokeStyle = "#d8432f"; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 16, y - 16); g.lineTo(x + 16, y + 16); g.moveTo(x + 16, y - 16); g.lineTo(x - 16, y + 16); g.stroke(); } }
});
const corkTex = () => ctex("intCork", 1024, 720, (g, r) => {
  g.fillStyle = "#b98a56"; g.fillRect(0, 0, 1024, 720);
  speckle(g, r, 1024, 720, 3000, ["#8a6236", "#d6aa72"], 0.8, 2.4, 0.6);
  g.fillStyle = "#5a3a22"; g.fillRect(0, 0, 1024, 120); centerText(g, "RETURNED WITH APOLOGIES", 512, 62, 960, 62, "#f4e6c4");
  const notes: [string[], string][] = [[["SORRY!"], "#fff7a8"], [["I'M SO", "SORRY"], "#fbf8ee"], [["FORGIVE", "ME"], "#ffd9e2"], [["BAD", "LUCK!"], "#d6ecff"], [["NEVER", "AGAIN"], "#fbf8ee"], [["SORRY", "PARK"], "#e3f6d2"]];
  notes.forEach(([L, c], i) => {
    const x = 90 + (i % 3) * 320 + r() * 30, y = 220 + Math.floor(i / 3) * 250 + r() * 20;
    g.save(); g.translate(x + 110, y + 90); g.rotate((r() - 0.5) * 0.2);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(-104, -78, 220, 176);
    g.fillStyle = c; g.fillRect(-110, -86, 220, 176);
    g.fillStyle = "#2a2a58"; g.textAlign = "center"; g.textBaseline = "middle";
    L.forEach((s, k) => { fitText(g, s, 190, 62, "'Comic Sans MS', 'Trebuchet MS', sans-serif"); g.fillText(s, 0, (k - (L.length - 1) / 2) * 62); });
    g.fillStyle = "#d8432f"; g.beginPath(); g.arc(0, -76, 10, 0, TAU); g.fill();
    g.restore();
  });
});
const labelBoxTex = (key: string, label: string, base = "#c9a26a") => ctex(key, 256, 192, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 192);
  mottle(g, r, 256, 192, 10, ["#b58a52", "#dcb67e"], 20, 50, 0.3);
  g.fillStyle = "#e9dcc0"; g.fillRect(0, 84, 256, 12);
  g.fillStyle = "#fbf7ec"; g.fillRect(40, 30, 176, 54); centerText(g, label, 128, 58, 160, 34, "#2a2230", "Arial, sans-serif");
});
const nightTex = () => ctex("intNightOut3", 512, 512, (g, r) => {
  // round 3 (A2: muted slate glass, no moon): deep saturated night #0E2179 -> #253898 toward the horizon glow
  const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, "#0e2179"); sky.addColorStop(0.62, "#1c2f8e"); sky.addColorStop(0.8, "#253898"); sky.addColorStop(1, "#33449e");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 512);
  speckle(g, r, 512, 330, 90, ["#ffffff", "#cfe0ff"], 0.5, 1.4, 0.55);
  // far banded mesa (moonlit top edge), nearer ridge, a saguaro and a juniper outline under the moon
  g.fillStyle = "#1a2560"; g.beginPath(); g.moveTo(0, 512); g.lineTo(0, 372); g.lineTo(60, 366); g.lineTo(96, 318); g.lineTo(250, 312); g.lineTo(282, 352); g.lineTo(380, 358); g.lineTo(404, 334); g.lineTo(512, 338); g.lineTo(512, 512); g.fill();
  g.strokeStyle = "rgba(170,190,255,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(96, 318); g.lineTo(250, 312); g.lineTo(282, 352); g.stroke();
  for (const [y, c] of [[334, "rgba(60,70,140,0.5)"], [350, "rgba(40,50,110,0.5)"]] as [number, string][]) { g.fillStyle = c; g.fillRect(100, y, 176, 6); }
  g.fillStyle = "#101848"; g.beginPath(); g.moveTo(0, 512); g.lineTo(0, 420); g.bezierCurveTo(120, 396, 260, 430, 360, 404); g.bezierCurveTo(430, 392, 480, 410, 512, 402); g.lineTo(512, 512); g.fill();
  g.fillStyle = "#0a0f34";
  const cx = 150, base = 430; g.fillRect(cx - 9, base - 120, 18, 124); g.beginPath(); g.arc(cx, base - 120, 9, 0, TAU); g.fill();
  g.fillRect(cx - 40, base - 74, 31, 12); g.fillRect(cx - 40, base - 104, 12, 42); g.beginPath(); g.arc(cx - 34, base - 104, 6, 0, TAU); g.fill();
  g.fillRect(cx + 9, base - 56, 28, 11); g.fillRect(cx + 26, base - 92, 11, 47); g.beginPath(); g.arc(cx + 31.5, base - 92, 5.5, 0, TAU); g.fill();
  for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(395 + (k % 3) * 16 - 16, 392 - Math.floor(k / 3) * 14 - (k % 2) * 6, 18, 12, 0, 0, TAU); g.fill(); }
  g.fillRect(392, 398, 7, 20);
  g.fillStyle = "#070b28"; g.fillRect(0, 450, 512, 62);
});
const moonTex = () => ctex("intMoon", 128, 128, (g) => {
  g.fillStyle = "#f4f1e0"; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill();
  g.fillStyle = "rgba(160,160,180,0.35)"; for (const [x, y, rr] of [[44, 50, 12], [78, 72, 9], [60, 88, 7], [84, 40, 6]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
});
const softDot = () => ctex("intSoftDot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
/** soft beam: bright core along u = 0, fading to u = 1; soft edges across v */
const beamTex = () => ctex("intBeam", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2;
    const a = (1 - u) ** 1.4 * (1 - v * v) ** 1.5;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * a);
  }
  g.putImageData(im, 0, 0);
});
const stencilBucketTex = () => ctex("intBucket", 512, 256, (g, r) => {
  g.fillStyle = "#8f9cab"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(60,70,90,0.25)"; g.fillRect(0, 30 + i * 60, 512, 5); }
  mottle(g, r, 512, 256, 30, ["#6e7a8a", "#a9b4c2", "#8a6a50"], 10, 40, 0.18);
  g.fillStyle = "#fbf3dc"; rrect(g, 116, 62, 280, 132, 10); g.fill();
  g.fillStyle = "#c8302a"; g.textAlign = "center"; g.textBaseline = "middle"; fitText(g, "BAIT", 250, 120, "Impact, 'Arial Black', sans-serif", "normal"); g.fillText("BAIT", 256, 132);
});

// ---- storeroom art, round 3 ----
/** enamel pail (A2: the blue bucket vanished into the blue night): orange-red enamel, a warm lamp highlight band,
 *  darker rolled bands, a few chipped spots showing dark steel */
const pailRedTex = () => ctex("intPailRed", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, "#b8481a"); gr.addColorStop(0.3, "#dc5e22"); gr.addColorStop(0.46, "#f49a48"); gr.addColorStop(0.56, "#e4702c"); gr.addColorStop(1, "#a84418");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(90,20,10,0.32)"; g.fillRect(0, 36 + i * 80, 512, 7); g.fillStyle = "rgba(255,210,170,0.22)"; g.fillRect(0, 45 + i * 80, 512, 3); }
  g.fillStyle = "rgba(255,236,210,0.5)"; g.fillRect(226, 0, 18, 256);                         // the lamp's specular band
  mottle(g, r, 512, 256, 26, ["#c04a24", "#e8703e"], 10, 40, 0.16);
  for (let i = 0; i < 9; i++) { g.fillStyle = "#2e2a30"; g.beginPath(); g.ellipse(r() * 512, 20 + r() * 220, 3 + r() * 6, 2 + r() * 4, r() * 3, 0, TAU); g.fill(); }
  g.fillStyle = "#f2e6cc"; g.fillRect(0, 0, 512, 12);                                           // cream rolled rim band
});
/** braided oval rag rug: concentric braid rings in warm rust / mustard / cream with a slate and plum ring */
// round 8 (A7 P3: the lit #C48D76 rings were the brightest warm area after the bulb and pulled the eye to empty floor):
// ~25 % darker with half the ring contrast (#8A5A4A / #6E4636 class, a dusty slate and plum ring kept faint)
const rugTex = () => ctex("intRug8", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const cols = ["#6e4636", "#8a5a4a", "#7a5040", "#5e5260", "#82543f", "#644456", "#8a5c44", "#6e4636", "#86604c", "#764a3a"];
  for (let k = 0; k < cols.length; k++) {
    const R = 250 - k * 23;
    g.fillStyle = cols[k]; g.beginPath(); g.arc(256, 256, R, 0, TAU); g.fill();
    g.strokeStyle = "rgba(40,20,10,0.35)"; g.lineWidth = 2;
    for (let a = 0; a < TAU; a += 0.12) { g.beginPath(); g.moveTo(256 + Math.cos(a) * (R - 3), 256 + Math.sin(a) * (R - 3)); g.lineTo(256 + Math.cos(a + 0.07) * (R - 19), 256 + Math.sin(a + 0.07) * (R - 19)); g.stroke(); }
  }
  speckle(g, r, 512, 512, 900, ["#2b1a12", "#fff4dc"], 0.6, 1.6, 0.18);
});
/** the RETURNS sign over the mail slot: brass border, dark enamel field, big cream caps + a down arrow */
const returnsTex = () => ctex("intReturns", 1024, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#f0cd6a"); gr.addColorStop(0.5, "#c99a3a"); gr.addColorStop(1, "#9c7022");
  g.fillStyle = gr; rrect(g, 0, 0, 1024, 256, 26); g.fill();
  g.fillStyle = "#3a2216"; rrect(g, 22, 22, 980, 212, 16); g.fill();
  for (const x of [52, 972]) for (const y of [52, 204]) { g.fillStyle = "#e8c463"; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); }
  centerText(g, "RETURNS", 470, 134, 720, 190, "#f6e8c6", "Impact, 'Arial Black', sans-serif", "normal");
  g.fillStyle = "#f6e8c6"; g.beginPath(); g.moveTo(860, 80); g.lineTo(930, 80); g.lineTo(930, 130); g.lineTo(958, 130); g.lineTo(895, 196); g.lineTo(832, 130); g.lineTo(860, 130); g.closePath(); g.fill();
});
/** the parcel that drops on "mailed": kraft box, FRAGILE tape, a big marker SORRY! and two stamps */
const fragileTex = () => ctex("intFragile", 256, 256, (g, r) => {
  g.fillStyle = "#c79a62"; g.fillRect(0, 0, 256, 256);
  mottle(g, r, 256, 256, 20, ["#b5884f", "#d8ad74"], 20, 60, 0.3);
  g.fillStyle = "#e9dcc0"; g.fillRect(118, 0, 18, 256);
  g.save(); g.translate(128, 60); g.rotate(-0.08); g.fillStyle = "#d8342c"; g.fillRect(-140, -26, 280, 52);
  centerText(g, "FRAGILE", 0, 2, 236, 40, "#fff4e4", "Impact, 'Arial Black', sans-serif", "normal"); g.restore();
  centerText(g, "SORRY!", 120, 158, 210, 66, "#26265a", "'Comic Sans MS', 'Trebuchet MS', sans-serif");
  for (const [x, c] of [[200, "#2e8a5a"], [232, "#2e5aa8"]] as [number, string][]) { g.fillStyle = "#fbf6ea"; g.fillRect(x - 16, 206, 30, 38); g.fillStyle = c; g.fillRect(x - 12, 210, 22, 30); }
  g.strokeStyle = "rgba(40,40,60,0.55)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(176, 226, 10 + k * 5, -0.8, 0.8); g.stroke(); }
});
/** lantern glass: warm gradient (bright core, amber rim) */
const lanternGlassTex = () => ctex("intLanternGlass", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 70, 4, 64, 64, 64); gr.addColorStop(0, "#fff6d8"); gr.addColorStop(0.35, "#ffd286"); gr.addColorStop(1, "#e08a3a");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** round 8: a kerosene flame (white-yellow core, orange skirt, soft alpha), teardrop pointing up */
const flameTex = () => ctex("intFlame8", 64, 128, (g) => {
  g.clearRect(0, 0, 64, 128);
  const shape = (w: number) => { g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(32 + w * 0.5, 40, 32 + w, 78, 32 + w * 0.8, 100); g.bezierCurveTo(32 + w * 0.5, 124, 32 - w * 0.5, 124, 32 - w * 0.8, 100); g.bezierCurveTo(32 - w, 78, 32 - w * 0.5, 40, 32, 6); g.closePath(); };
  g.fillStyle = "rgba(255,140,40,0.55)"; shape(26); g.fill();
  g.fillStyle = "rgba(255,196,90,0.9)"; shape(19); g.fill();
  const gr = g.createRadialGradient(32, 92, 2, 32, 86, 30); gr.addColorStop(0, "rgba(255,255,245,1)"); gr.addColorStop(1, "rgba(255,236,170,0.9)");
  g.fillStyle = gr; shape(12); g.fill();
  g.fillStyle = "rgba(120,150,255,0.55)"; g.beginPath(); g.ellipse(32, 112, 7, 5, 0, 0, TAU); g.fill(); // the blue root of the flame
});
// ---- storeroom art, round 4 ----
/** archive box label: white card, big year */
const archiveLabelTex = (key: string, year: string) => ctex(key, 256, 160, (g) => {
  g.fillStyle = "#c9a26a"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#fbf7ec"; g.fillRect(28, 18, 200, 104); g.strokeStyle = "#2a2230"; g.lineWidth = 3; g.strokeRect(28, 18, 200, 104);
  centerText(g, "RETURNS", 128, 46, 180, 34, "#2a2230", "'Arial Black', Arial, sans-serif", "normal");
  centerText(g, year, 128, 92, 180, 52, "#c8302a", "'Arial Black', Arial, sans-serif", "normal");
  g.fillStyle = "rgba(40,24,12,0.55)"; rrect(g, 98, 132, 60, 16, 8); g.fill();
});
/** the ironic shipping tag on the CONSCIENCE PILE crate */
const baitTagTex = () => ctex("srBaitTag", 384, 200, (g, r) => {
  g.fillStyle = "#e2c48e"; g.beginPath(); g.moveTo(40, 0); g.lineTo(384, 0); g.lineTo(384, 200); g.lineTo(40, 200); g.lineTo(0, 160); g.lineTo(0, 40); g.closePath(); g.fill();
  mottle(g, r, 384, 200, 14, ["#d2b07a", "#efd6a6"], 10, 40, 0.3);
  g.fillStyle = "#fbf3dc"; g.beginPath(); g.arc(30, 100, 13, 0, TAU); g.fill(); g.strokeStyle = "#8a6a3a"; g.lineWidth = 4; g.stroke();
  centerText(g, "DO NOT USE", 214, 62, 320, 64, "#8a1e1a", "Impact, 'Arial Black', sans-serif", "normal");
  centerText(g, "AS BAIT", 214, 142, 320, 70, "#8a1e1a", "Impact, 'Arial Black', sans-serif", "normal");
});
/** a night cloud drifting past the moon: slate body, a moonlit upper rim */
const nightCloudTex = () => ctex("srNightCloud", 256, 96, (g) => {
  g.clearRect(0, 0, 256, 96);
  const lumps: [number, number, number][] = [[52, 60, 26], [92, 48, 32], [136, 44, 34], [178, 52, 28], [214, 62, 20], [120, 66, 30]];
  g.filter = "blur(3px)";
  g.fillStyle = "rgba(150,165,230,0.85)"; for (const [x, y, r] of lumps) { g.beginPath(); g.arc(x, y - 4, r, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(40,52,120,0.95)"; for (const [x, y, r] of lumps) { g.beginPath(); g.arc(x, y + 2, r - 2, 0, TAU); g.fill(); }
  g.filter = "none";
});

// ---- storeroom art, round 6 ----
/** the night cat curled asleep on the moonlit window sill (0 = asleep, 1 = one eye open, 2 = ears up + eye wide):
 *  an orange tabby card with the film's plum ink, lamp-warm front, a cool moon rim along its back */
/** round 7: st 3 = head lifted, both eyes open, looking right (toward the mail chute); tl 1 = the tail tip flicked up */
const catTex = (st: number, tl = 0) => ctex("srCat7_" + st + "_" + tl, 512, 320, (g) => {
  g.clearRect(0, 0, 512, 320);
  const ink = "#2c1e2a"; g.lineJoin = "round"; g.lineCap = "round";
  // tail curled round the front
  g.strokeStyle = ink; g.lineWidth = 34; g.beginPath(); g.moveTo(420, 250);
  if (tl) { g.quadraticCurveTo(486, 236, 482, 168); g.quadraticCurveTo(480, 118, 450, 96); } else { g.quadraticCurveTo(470, 300, 360, 296); g.quadraticCurveTo(220, 300, 150, 280); }
  g.stroke();
  g.strokeStyle = "#e0883a"; g.lineWidth = 22; g.stroke();
  // body loaf
  g.fillStyle = "#e0883a"; g.strokeStyle = ink; g.lineWidth = 9;
  g.beginPath(); g.moveTo(120, 280); g.bezierCurveTo(90, 160, 210, 110, 320, 120); g.bezierCurveTo(430, 128, 470, 200, 440, 280); g.closePath(); g.fill(); g.stroke();
  // tabby stripes + belly
  g.strokeStyle = "#b05a24"; g.lineWidth = 11; for (const [x, y] of [[250, 128], [300, 124], [350, 130], [395, 146]] as number[][]) { g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + 10, y + 34, x - 4, y + 62); g.stroke(); }
  g.fillStyle = "#f6d7a8"; g.beginPath(); g.ellipse(270, 262, 70, 20, 0, 0, TAU); g.fill();
  // cool moonlight rim on the back
  g.strokeStyle = "rgba(170,190,255,0.85)"; g.lineWidth = 7; g.beginPath(); g.moveTo(215, 122); g.bezierCurveTo(280, 106, 400, 112, 445, 190); g.stroke();
  // head (tucked low at the left), ears
  const hy = st === 3 ? 150 : st === 2 ? 168 : 190, px = st === 3 ? 6 : 0;
  g.fillStyle = "#e0883a"; g.strokeStyle = ink; g.lineWidth = 9;
  for (const [ex, tilt] of [[100, -0.5], [176, 0.4]] as number[][]) { g.beginPath(); g.moveTo(ex - 28, hy - 30); g.lineTo(ex + 18 * Math.sin(tilt) - 4, hy - 82 - (st >= 2 ? 14 : 0)); g.lineTo(ex + 30, hy - 34); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(140, hy + 8, 78, 62, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#f6c0a8"; for (const ex of [100, 176]) { g.beginPath(); g.moveTo(ex - 12, hy - 36); g.lineTo(ex, hy - 64); g.lineTo(ex + 12, hy - 36); g.closePath(); g.fill(); }
  // face: closed eyes (two arcs) / one eye open / both wide
  g.strokeStyle = ink; g.lineWidth = 7;
  const closed = (x: number) => { g.beginPath(); g.arc(x, hy + 4, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); };
  const open = (x: number, R: number) => { g.fillStyle = "#f8f3ee"; g.beginPath(); g.ellipse(x, hy + 2, R, R * 1.1, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#2a2030"; g.beginPath(); g.ellipse(x + 3, hy + 4, R * 0.42, R * 0.8, 0, 0, TAU); g.fill(); };
  if (st === 0) { closed(112); closed(172); } else if (st === 1) { closed(112); open(172, 17); } else { open(112 + px, 20); open(172 + px, 20); }
  g.fillStyle = "#c8505a"; g.beginPath(); g.moveTo(134, hy + 26); g.lineTo(150, hy + 26); g.lineTo(142, hy + 36); g.closePath(); g.fill();
  g.strokeStyle = ink; g.lineWidth = 3; for (const s of [-1, 1]) for (const k of [0, 1]) { g.beginPath(); g.moveTo(142 + s * 30, hy + 30 + k * 10); g.lineTo(142 + s * 74, hy + 22 + k * 18); g.stroke(); }
  if (st === 0) { g.fillStyle = "rgba(240,246,255,0.9)"; font(g, 40, "'Comic Sans MS', 'Trebuchet MS', sans-serif"); g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("z", 220, 74); font(g, 28, "'Comic Sans MS', 'Trebuchet MS', sans-serif"); g.fillText("z", 256, 44); }
});
/** the tear-off LETTERS THIS YEAR counter over the RETURNS slot: the plaque (header + the pad's NEXT sheet) and the top
 *  sheet that tears off on "mailed" */
const counterTex = () => ctex("srCounter6", 512, 320, (g, r) => {
  g.fillStyle = "#6b4426"; rrect(g, 0, 0, 512, 320, 22); g.fill();
  g.strokeStyle = "#3a2416"; g.lineWidth = 10; rrect(g, 5, 5, 502, 310, 18); g.stroke();
  for (let k = 0; k < 10; k++) { g.strokeStyle = "rgba(40,24,14,0.25)"; g.lineWidth = 2; g.beginPath(); const y = 20 + r() * 280; g.moveTo(10, y); g.bezierCurveTo(170, y + 8, 340, y - 8, 502, y + 4); g.stroke(); }
  centerText(g, "LETTERS THIS YEAR:", 256, 50, 470, 44, "#f1e2c0", "'Arial Black', Impact, sans-serif", "normal");
  g.fillStyle = "#f8f4ea"; g.fillRect(56, 92, 400, 196); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(56, 92, 400, 12);
  centerText(g, "1,202", 256, 198, 380, 150, "#b8302a", "'Arial Black', Impact, sans-serif", "normal");
});
const sheetTex = () => ctex("srSheet6", 400, 196, (g) => {
  g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 400, 196); g.fillStyle = "rgba(0,0,0,0.1)"; g.fillRect(0, 0, 400, 12);
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 6; x < 400; x += 14) g.fillRect(x, 3, 6, 4); // perforation
  centerText(g, "1,201", 200, 106, 380, 150, "#2a2a58", "'Arial Black', Impact, sans-serif", "normal");
});

// ---- storeroom art, round 2 ----
const MARKER = "'Comic Sans MS', 'Trebuchet MS', sans-serif";
/** corkboard of pinned apology letters with short readable lines + a heart or sad face each */
const corkTex2 = () => ctex("intCork6", 1024, 760, (g, r) => {
  g.fillStyle = "#b98a56"; g.fillRect(0, 0, 1024, 760);
  speckle(g, r, 1024, 760, 3200, ["#8a6236", "#d6aa72"], 0.8, 2.4, 0.6);
  g.fillStyle = "#5a3a22"; g.fillRect(0, 0, 1024, 104); centerText(g, "RETURNED WITH APOLOGIES", 512, 54, 960, 58, "#f4e6c4");
  const notes: [string[], string, number, number, number, "heart" | "sad"][] = [
    // round 5 (A4 P3: long lines read as ~20 px noise on the far wall): one or two BIG words per note (the 1972 note
    // moved onto the crate front, where the camera lingers)
    [["SORRY!"], "#fbf8ee", 190, 250, -0.06, "heart"], [["MY DOG", "LIMPS", "NOW"], "#d6ecff", 520, 250, 0.05, "sad"], // round 6: the floor note moved up here (it was cut by the frame edge in every lens)
    [["OOPS"], "#ffd9e2", 840, 262, 0.08, "heart"], [["MY", "BAD!"], "#d6ecff", 230, 560, 0.04, "sad"],
    [["FORGIVE", "ME"], "#e3f6d2", 560, 572, -0.07, "heart"], [["NEVER", "AGAIN!"], "#fbf8ee", 852, 560, 0.06, "sad"]];
  // drawn last: the big 3-line MY DOG LIMPS NOW card (330 x 262, it overlaps its neighbours like a freshly pinned letter)
  notes.sort((a, b) => a[0].length - b[0].length);
  for (const [L, c, x, y, rot, mark] of notes) {
    g.save(); g.translate(x, y); g.rotate(rot);
    const big = L.length === 3, cwid = big ? 330 : 296, chei = big ? 262 : 206, ox = -cwid / 2 - 2, oy = -chei / 2 - 1;
    g.fillStyle = "rgba(40,20,10,0.32)"; g.fillRect(ox + 8, oy + 8, cwid, chei);
    g.fillStyle = c; g.fillRect(ox, oy, cwid, chei);
    g.fillStyle = "rgba(120,150,200,0.35)"; for (let yy = oy + 44; yy < oy + chei - 4; yy += 38) g.fillRect(ox, yy, cwid, 2);
    g.fillStyle = "#26265a"; g.textAlign = "center"; g.textBaseline = "middle";
    L.forEach((s, k) => { fitText(g, s, big ? 300 : 270, L.length === 1 ? 112 : big ? 86 : 78, MARKER); g.fillText(s, -2, (k - (L.length - 1) / 2) * (big ? 74 : 80) - (big ? 12 : 8)); });
    g.strokeStyle = "#c8303a"; g.lineWidth = 5; g.lineCap = "round";
    g.save(); g.translate((cwid - 296) / 2, (chei - 206) / 2 + (big ? 6 : 0));
    if (mark === "heart") { g.fillStyle = "#d8404a"; g.beginPath(); g.moveTo(110, 82); g.bezierCurveTo(90, 58, 118, 46, 122, 64); g.bezierCurveTo(126, 46, 154, 58, 134, 82); g.lineTo(122, 94); g.closePath(); g.fill(); }
    else { g.strokeStyle = "#26265a"; g.beginPath(); g.arc(122, 72, 20, 0, TAU); g.stroke(); g.beginPath(); g.arc(122, 90, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.fillStyle = "#26265a"; g.fillRect(114, 64, 4, 6); g.fillRect(127, 64, 4, 6); }
    g.restore();
    g.fillStyle = "#d8432f"; g.beginPath(); g.arc(-2, oy + 12, 11, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(-5, oy + 9, 3.5, 0, TAU); g.fill();
    g.restore();
  }
});
/** brown padded mailer, marker label, postage stamps, red RETURN TO PARK stamp */
const padTex = () => ctex("intPadEnv", 512, 320, (g, r) => {
  g.fillStyle = "#d9b27a"; g.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,240,210,${0.08 + r() * 0.1})`; g.beginPath(); g.arc(r() * 512, r() * 320, 6 + r() * 6, 0, TAU); g.fill(); }
  g.fillStyle = "#c79a5e"; g.fillRect(0, 0, 512, 22);
  g.fillStyle = "#26265a"; g.textAlign = "center"; g.textBaseline = "middle";
  fitText(g, "I'M RETURNING", 400, 74, MARKER); g.fillText("I'M RETURNING", 230, 140); fitText(g, "THIS", 300, 84, MARKER); g.fillText("THIS", 230, 222);
  for (const [x, c] of [[420, "#2e8a5a"], [470, "#d8432f"]] as [number, string][]) { g.fillStyle = "#fbf6ea"; g.fillRect(x - 24, 36, 48, 58); g.fillStyle = c; g.fillRect(x - 18, 42, 36, 46); }
  g.save(); g.translate(400, 250); g.rotate(-0.18); g.strokeStyle = "rgba(200,40,40,0.85)"; g.lineWidth = 6; g.strokeRect(-92, -30, 184, 60);
  centerText(g, "RETURN TO PARK", 0, 2, 170, 30, "rgba(200,40,40,0.9)", "Impact, 'Arial Black', sans-serif", "normal"); g.restore();
});
/** taped parcel: kraft, tape cross, address label, stamps, red RETURN TO PARK / RETURNED stamp */
const parcelTex2 = (key: string, stamp: string, post = "") => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = "#c79a62"; g.fillRect(0, 0, 256, 256);
  mottle(g, r, 256, 256, 20, ["#b5884f", "#d8ad74"], 20, 60, 0.3);
  g.fillStyle = "#e9dcc0"; g.fillRect(0, 118, 256, 18); g.fillRect(118, 0, 18, 256);
  g.fillStyle = "#fbf7ec"; g.fillRect(24, 22, 88, 64); g.fillStyle = "#3a3450"; for (let i = 0; i < 3; i++) g.fillRect(32, 34 + i * 16, 54 + r() * 18, 5);
  for (const [x, c] of [[170, "#d8432f"], [214, "#2e5aa8"]] as [number, string][]) { g.fillStyle = "#fbf6ea"; g.fillRect(x - 20, 20, 40, 48); g.fillStyle = c; g.fillRect(x - 15, 25, 30, 38); }
  g.save(); g.translate(128, 198); g.rotate(-0.14); g.strokeStyle = "rgba(205,36,36,0.92)"; g.lineWidth = 6; g.strokeRect(-108, -28, 216, 56);
  centerText(g, stamp, 0, 2, 196, 38, "rgba(205,36,36,0.95)", "Impact, 'Arial Black', sans-serif", "normal"); g.restore();
  if (post) { // round 7: a round black postmark with wavy cancel lines over the stamps
    g.save(); g.translate(180, 52); g.rotate(0.12); g.strokeStyle = "rgba(30,26,40,0.85)"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke();
    centerText(g, post.split(" ")[0], 0, -9, 60, 17, "rgba(30,26,40,0.9)", "'Courier New', monospace"); centerText(g, post.split(" ")[1] ?? "", 0, 12, 60, 19, "rgba(30,26,40,0.9)", "'Courier New', monospace");
    g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 36; x < 110; x += 4) g.lineTo(x, -14 + k * 14 + 4 * Math.sin(x * 0.2)); g.stroke(); } g.restore(); }
});
const tallyTex = () => ctex("intTally", 384, 512, (g) => {
  g.fillStyle = "#fbfaf2"; g.fillRect(0, 0, 384, 512);
  g.fillStyle = "#9fb9da"; for (let y = 130; y < 512; y += 30) g.fillRect(0, y, 384, 2);
  centerText(g, "RETURNED:", 192, 52, 340, 56, "#26265a", MARKER); centerText(g, "1,200+ LETTERS", 192, 104, 350, 46, "#c8303a", MARKER);
  g.strokeStyle = "#26265a"; g.lineWidth = 5; g.lineCap = "round";
  for (let row = 0; row < 8; row++) for (let grp = 0; grp < 3; grp++) {
    const x0 = 34 + grp * 116, y0 = 150 + row * 44;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + k * 18, y0); g.lineTo(x0 + k * 18 + 3, y0 + 30); g.stroke(); }
    g.beginPath(); g.moveTo(x0 - 6, y0 + 26); g.lineTo(x0 + 66, y0 + 4); g.stroke();
  }
});
const tearCalTex = () => ctex("intTearCal", 256, 320, (g) => {
  g.fillStyle = "#fbf7ec"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#c8302a"; g.fillRect(0, 0, 256, 78); centerText(g, "JUNE", 128, 42, 220, 54, "#fbf7ec", "Arial, sans-serif");
  centerText(g, "17", 128, 190, 220, 170, "#2a2230", "Georgia, serif"); centerText(g, "TUESDAY", 128, 290, 220, 34, "#6a6070", "Arial, sans-serif");
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let k = 0; k < 4; k++) g.fillRect(0, 316 - k * 3, 256, 1);
});
const baitLabelTex = () => ctex("intBaitLabel", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = "#fbf6e6"; g.beginPath(); g.moveTo(10, 14); for (let x = 10; x <= 502; x += 24) g.lineTo(x, 10 + r() * 8); g.lineTo(502, 246); for (let x = 502; x >= 10; x -= 24) g.lineTo(x, 238 + r() * 8); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.06)"; for (let i = 0; i < 30; i++) g.fillRect(r() * 512, 14 + r() * 220, 30 + r() * 60, 2);
  g.fillStyle = "#c8282a"; g.textAlign = "center"; g.textBaseline = "middle";
  fitText(g, "BAIT", 440, 196, "Impact, 'Arial Black', sans-serif", "normal"); g.fillText("BAIT", 256, 134);
});
const pailTex = () => ctex("intPail2", 512, 256, (g, r) => {
  g.fillStyle = "#8f9cab"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(60,70,90,0.28)"; g.fillRect(0, 30 + i * 60, 512, 6); g.fillStyle = "rgba(255,255,255,0.16)"; g.fillRect(0, 38 + i * 60, 512, 3); }
  mottle(g, r, 512, 256, 34, ["#6e7a8a", "#a9b4c2", "#8a6a50"], 10, 40, 0.18);
});
const starTex = () => ctex("intStar4", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 22); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#fff"; g.beginPath();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2, rr = k % 2 ? 9 : 62; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
  g.closePath(); g.fill();
});
const brassTex = (key: string, text: string, w = 512, h = 160) => ctex(key, w, h, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#e8c463"); gr.addColorStop(0.5, "#c99a3a"); gr.addColorStop(1, "#a37624"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#7a5418"; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
  centerText(g, text, w / 2, h / 2 + 4, w - 60, h * 0.55, "#4a3212", "Georgia, serif");
});
const photoTex = () => ctex("intPhoto", 512, 384, (g, r) => {
  g.fillStyle = "#3a2618"; g.fillRect(0, 0, 512, 384); g.fillStyle = "#efe4cc"; g.fillRect(24, 24, 464, 336);
  const sk = g.createLinearGradient(0, 40, 0, 230); sk.addColorStop(0, "#c9b48e"); sk.addColorStop(1, "#e9dcc0"); g.fillStyle = sk; g.fillRect(44, 44, 424, 200);
  g.fillStyle = "#a88a66"; g.beginPath(); g.moveTo(44, 210); g.lineTo(140, 150); g.lineTo(220, 170); g.lineTo(300, 120); g.lineTo(468, 190); g.lineTo(468, 244); g.lineTo(44, 244); g.fill();
  g.fillStyle = "#c4a67e"; g.fillRect(44, 240, 424, 80);
  for (let i = 0; i < 5; i++) { g.fillStyle = "#6e5640"; g.beginPath(); g.ellipse(110 + i * 62, 282 - i * 4, 30, 18, 0.1, 0, TAU); g.fill(); g.fillStyle = "#8a6a50"; g.beginPath(); g.ellipse(112 + i * 62, 280 - i * 4, 18, 12, 0.1, 0, TAU); g.fill(); }
  centerText(g, "LONG LOGS TRAIL - 1962", 256, 345, 420, 24, "#5a4630", "Georgia, serif");
});
const staffTex = () => ctex("intStaff", 384, 160, (g) => {
  g.fillStyle = "#2f5a3c"; g.fillRect(0, 0, 384, 160); g.strokeStyle = "#e9dcc0"; g.lineWidth = 6; g.strokeRect(10, 10, 364, 140);
  centerText(g, "STAFF ONLY", 192, 84, 330, 70, "#f4ecd8", "Arial, sans-serif");
});
/** chalk-tinted moth: two wing shapes (frame 0 open, 1 half closed) */
const mothTex = (k: number) => ctex("intMoth" + k, 64, 64, (g) => {
  g.clearRect(0, 0, 64, 64); g.fillStyle = "#c8b898"; const s = k ? 0.55 : 1;
  for (const d of [-1, 1]) { g.beginPath(); g.ellipse(32 + d * 13 * s, 30, 13 * s, 10, d * 0.4, 0, TAU); g.fill(); }
  g.fillStyle = "#5a4a3a"; g.beginPath(); g.ellipse(32, 33, 3, 9, 0, 0, TAU); g.fill();
});
/** angular petrified-wood chip: n-gon slab, quartz face up / down (radial uv into the slice texture), bark sides */
const chipGeos = (seed: number, r: number, th: number) => {
  const n = 5 + Math.floor(hash(seed * 1.3) * 3), pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (hash(seed + i * 1.7) - 0.5) * 0.7, rr = r * (0.62 + 0.5 * hash(seed * 3.1 + i)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  const h = th / 2, ox = (hash(seed * 7.7) - 0.5) * 0.55, oz = (hash(seed * 9.1) - 0.5) * 0.55, k = 0.16 / r;
  const cap: number[] = [], cuv: number[] = [], side: number[] = [];
  const tilt = (x: number) => h + 0.25 * th * (x / r);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cap.push(0, tilt(0), 0, b[0], tilt(b[0]), b[1], a[0], tilt(a[0]), a[1]);
    cap.push(0, -h, 0, a[0], -h, a[1], b[0], -h, b[1]);
    for (const p of [[0, 0], b, a, [0, 0], a, b]) cuv.push(0.5 + ox + p[0] * k, 0.5 + oz + p[1] * k);
    side.push(a[0], tilt(a[0]), a[1], b[0], -h, b[1], a[0], -h, a[1], a[0], tilt(a[0]), a[1], b[0], tilt(b[0]), b[1], b[0], -h, b[1]);
  }
  const top = new THREE.BufferGeometry(); top.setAttribute("position", new THREE.Float32BufferAttribute(cap, 3)); top.setAttribute("uv", new THREE.Float32BufferAttribute(cuv, 2)); top.computeVertexNormals();
  const sd = new THREE.BufferGeometry(); sd.setAttribute("position", new THREE.Float32BufferAttribute(side, 3)); sd.computeVertexNormals();
  return { top, side: sd, dot: [pts[0][0] * 0.35, tilt(pts[0][0] * 0.35) + 0.0015, pts[0][1] * 0.35] as P3, r };
};

// ---- blueprint art ----
const bpFloorTex = () => ctex("intBpFloor", 1024, 1024, (g, r) => {
  g.fillStyle = "#2a5cae"; g.fillRect(0, 0, 1024, 1024);
  mottle(g, r, 1024, 1024, 80, ["#3468bb", "#22509c", "#2d61b2"], 60, 200, 0.18);
  g.fillStyle = "rgba(220,235,255,0.07)"; for (let i = 0; i < 16; i++) { g.fillRect(i * 64, 0, 2, 1024); g.fillRect(0, i * 64, 1024, 2); } // 0.25 m lines (4 m tile)
  speckle(g, r, 1024, 1024, 1800, ["#bcd6ff", "#16407e"], 0.6, 1.6, 0.18);
});
/** floating "MANY VISITORS TAKE THE WOOD." panel size (m): text cap ~50 px at 1080 from ~6.5 m with a 44 deg lens */
const BPS = 2.2;
const THIEF_N = 60; // round 7 (carry-over: ~60, 2-3 new per frame)
/** round 5 (A4 P1/P2) blueprint label + title anchors (BP-local), from scripts/search*_wint.mjs against camAt(11):
 *  THE RULE (0.95 x 0.76 m), EVERYONE ELSE (1.56 x 0.8 m) low -> high on its pole, the FIG. 1 cartouche (2.0 m) */
const LBL5 = { rule: [-0.9, 1.65, -2.25] as V3, ee: [1.6, 1.9, -3.5] as V3, eeHigh: 4.55, title: [-0.7, 5.2, -7.0] as V3 };
/** round 8 (A7 P2): where the shot-11 visitor stands from 'Many people steal' on (cast.ts blueprint(): BP.person +
 *  1.92 m along [0.416, -0.909]) and his head + cap ellipse (centre height, half width, half height, m) */
const MAN11_HEAD = { x: BP.person[0] + 0.416 * 1.92, z: BP.person[2] - 0.909 * 1.92, y: 1.44, rx: 0.31, ry: 0.33 };
/** clear margin kept round his head + cap on screen (m in his depth plane: ~120 px at 1080 in the 'everyone' lens) */
const HEAD_CLEAR = 0.25;
/** Sign B style pictogram visitor walking with a petrified-wood chip, alpha cut-out with a cream outline.
 *  walk 0 / 1 = the two step drawings, v = variant (chip carried in front / on the shoulder) */
const pictoTex = (walk: number, v: number) => ctex(`bpPicto${walk}${v}`, 256, 384, (g) => {
  g.clearRect(0, 0, 256, 384);
  const ink = "#3a2414", cream = "#f3ead6", O = 20;
  const legs = walk ? [[118, 230, 112, 300, 104, 372], [130, 230, 140, 300, 150, 372]] : [[118, 230, 96, 300, 76, 370], [130, 230, 158, 298, 178, 366]];
  const armB = walk ? [[124, 132, 108, 186, 100, 232]] : [[124, 132, 92, 180, 74, 214]];
  const armF = v ? [[130, 130, 170, 112, 180, 82]] : [[130, 132, 168, 168, 196, 176]];
  const chip = v ? [176, 54, 62, 34] : [190, 158, 64, 36];
  const pass = (col: string, extra: number) => {
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = "round"; g.lineJoin = "round";
    for (const L of [...legs, ...armB, ...armF]) { g.lineWidth = (L === legs[0] || L === legs[1] ? 30 : 22) + extra; g.beginPath(); g.moveTo(L[0], L[1]); g.quadraticCurveTo(L[2], L[3], L[4], L[5]); g.stroke(); }
    g.lineWidth = 46 + extra; g.beginPath(); g.moveTo(126, 118); g.lineTo(122, 228); g.stroke();
    g.beginPath(); g.arc(132, 70, 34 + extra / 2, 0, TAU); g.fill();
    rrect(g, chip[0] - extra / 2, chip[1] - extra / 2, chip[2] + extra, chip[3] + extra, 10); g.fill();
  };
  pass(cream, O); pass(ink, 0);
  g.fillStyle = "#e8893a"; rrect(g, chip[0] + 4, chip[1] + 4, chip[2] - 8, chip[3] - 8, 7); g.fill();
  g.fillStyle = "#f2c64a"; g.beginPath(); g.ellipse(chip[0] + chip[2] - 14, chip[1] + chip[3] / 2, 7, chip[3] / 2 - 6, 0, 0, TAU); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(chip[0] + 16, chip[1] + 12, 4, 0, TAU); g.fill();
});
/** round 8 (script v2: Sign B now reads "MANY VISITORS TAKE THE WOOD."): the floating panel draws its OWN face in Sign B's
 *  art (cream face, brown border, condensed Tahoma caps, the three-visitor pictogram carrying wood), so the shot-11 copy is
 *  right whatever paint.ts carries; once WORLD-EXT's SIGN_B_LINES hold the new words, their line breaks are used */
const BP_SIGN_LINES = SIGN_B_LINES.join(" ").includes("TAKE THE WOOD") ? SIGN_B_LINES : ["MANY VISITORS", "TAKE THE WOOD."];
const bpFigure = (g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, reach: number) => {
  g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round";
  const hipX = s * 0.06 * reach, hipY = -s * 0.36, shX = s * 0.22 * reach, shY = -s * (0.74 - 0.16 * reach);
  g.beginPath(); g.arc(shX + s * 0.08 * reach, shY - s * 0.16, s * 0.11, 0, TAU); g.fill();
  g.lineWidth = s * 0.15; g.beginPath(); g.moveTo(shX, shY); g.lineTo(hipX, hipY); g.stroke();
  g.lineWidth = s * 0.11; g.beginPath(); g.moveTo(hipX, hipY); g.lineTo(-s * 0.14, 0); g.moveTo(hipX, hipY); g.lineTo(s * 0.16, 0); g.stroke();
  const hx = shX + s * (0.18 + 0.12 * reach), hy = shY + s * (0.12 + 0.34 * reach);
  g.lineWidth = s * 0.085; g.beginPath(); g.moveTo(shX, shY); g.lineTo(hx, hy); g.stroke();
  g.beginPath(); g.moveTo(shX, shY); g.lineTo(shX - s * 0.14, shY + s * 0.22); g.lineTo(shX - s * 0.1, shY + s * 0.38); g.stroke();
  g.fillStyle = "#a0603a"; rrect(g, hx - s * 0.04, hy - s * 0.05, s * 0.24, s * 0.12, s * 0.03); g.fill();
  g.restore();
};
const bpWood = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.fillStyle = "#a0603a"; rrect(g, x - s * 0.5, y - s * 0.28, s, s * 0.28, s * 0.06); g.fill();
  g.fillStyle = "#d8843e"; g.beginPath(); g.ellipse(x + s * 0.5, y - s * 0.14, s * 0.07, s * 0.14, 0, 0, TAU); g.fill();
};
const bpSignTex = () => ctex("bpSignB8_" + BP_SIGN_LINES.join("|"), 1024, 1024, (g, r) => {
  const S = 1024, ink = "#3a2414", fam = "Tahoma, Verdana, Arial, sans-serif";
  const vg = g.createLinearGradient(0, 0, 0, S); vg.addColorStop(0, "#f6ebd8"); vg.addColorStop(0.55, "#efe3d0"); vg.addColorStop(1, "#e3d6cc");
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) { const x = r() * S, y = r() * S, rad = 80 + 160 * r(), gr = g.createRadialGradient(x, y, 0, x, y, rad), c = r() < 0.6 ? "150,120,80" : "255,255,245";
    gr.addColorStop(0, `rgba(${c},0.06)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,90,60,0.07)" : "rgba(255,255,250,0.1)"; g.fillRect(r() * S, r() * S, 2, 2); }
  const sb = g.createLinearGradient(0, 0, 0, S * 0.09); sb.addColorStop(0, "rgba(70,52,70,0.2)"); sb.addColorStop(1, "rgba(70,52,70,0)");
  g.fillStyle = sb; g.fillRect(0, 0, S, S * 0.09);
  g.fillStyle = "rgba(255,214,160,0.55)"; g.fillRect(0, 0, S, 5);
  g.strokeStyle = "#5a3a22"; g.lineWidth = 34; rrect(g, 17, 17, S - 34, S - 34, 40); g.stroke();
  g.strokeStyle = "rgba(255,240,215,0.5)"; g.lineWidth = 4; rrect(g, 40, 40, S - 80, S - 80, 26); g.stroke();
  // the short text in the band above the pictogram, as big as the widest line allows (caps ~50 px at 1080 in the hold)
  const L = BP_SIGN_LINES, top = 70, bot = 560, pitch = (bot - top) / L.length, k = 0.84;
  let px = Math.round(pitch * (L.length > 2 ? 0.8 : 0.6));
  for (const l of L) { g.font = `bold ${px}px ${fam}`; const w = g.measureText(l).width * k; if (w > S - 120) px = Math.floor((px * (S - 120)) / w); }
  L.forEach((l, i) => { g.save(); g.translate(S / 2, top + pitch * (i + 0.5)); g.scale(k, 1); g.font = `bold ${px}px ${fam}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ink; g.fillText(l, 0, 0); g.restore(); });
  g.fillStyle = "rgba(90,58,34,0.35)"; g.fillRect(110, bot + 12, S - 220, 5);
  const gy = S - 100;
  g.fillStyle = "#ddcfb3"; g.fillRect(90, gy, S - 180, 8);
  for (const [x, sc] of [[250, 0.82], [500, 0.95], [760, 0.82]] as const) bpFigure(g, x - 50, gy, 330 * sc, ink, 0.55);
  bpWood(g, 395, gy, 80); bpWood(g, 650, gy, 80); bpWood(g, 880, gy, 70);
});
/** round 5 (A4: a few multiplying thieves landed on the THE RULE label at the reveal): where thief i lands (BP world
 *  x, z) around the floating panel at (sx, sz): the left half hop out FORWARD (in front of / below the THE RULE label),
 *  the right half spread right toward the crowd as before */
const thiefLand = (i: number, sx: number, sz: number): [number, number] => i % 2
  ? [sx + 0.7 + 2.6 * hash(i * 1.7), sz - 0.4 + 2.4 * hash(i * 6.1)]
  : [sx - 0.4 - 0.9 * hash(i * 1.7), sz + 0.6 + 1.6 * hash(i * 6.1)];
/** a "boiled" redraw of a sign face: the picture region (lower 45 %) re-drawn with tiny row shifts */
const boilTex = (src: THREE.Texture) => {
  const im = src.image as HTMLCanvasElement, w = im.width, h = im.height, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d")!; g.drawImage(im, 0, 0);
  const y0 = Math.round(h * 0.53), y1 = Math.round(h * 0.93);
  for (let y = y0; y < y1; y += 4) { const dx = Math.round(2.2 * Math.sin(y * 0.071 + 1.3) + 1.2 * Math.sin(y * 0.23)); g.drawImage(im, 0, y, w, 4, dx, y, w, 4); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const bpTapeTex = () => ctex("bpTape", 256, 84, (g, r) => {
  g.clearRect(0, 0, 256, 84); g.fillStyle = "rgba(244,236,206,0.85)"; g.beginPath(); g.moveTo(4, 8);
  for (let x = 4; x <= 252; x += 16) g.lineTo(x, 6 + r() * 6); g.lineTo(252, 78); for (let x = 252; x >= 4; x -= 16) g.lineTo(x, 72 + r() * 6); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(10, 18, 236, 8);
});
const bpRingTex = () => ctex("bpRing", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256);
  for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(120,80,40,${0.35 - k * 0.1})`; g.lineWidth = 9 - k * 3; g.beginPath(); g.arc(128 + k * 3, 128 - k * 2, 92 + k * 4 + r() * 3, 0.2 + k, TAU - 0.4 + k); g.stroke(); }
  g.fillStyle = "rgba(120,80,40,0.08)"; g.beginPath(); g.arc(128, 128, 88, 0, TAU); g.fill();
});
const bpFootTex = () => ctex("bpFoot", 96, 128, (g) => {
  g.clearRect(0, 0, 96, 128); g.strokeStyle = "rgba(235,245,255,0.95)"; g.lineWidth = 6;
  g.beginPath(); g.ellipse(48, 40, 26, 34, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(48, 102, 20, 20, 0, 0, TAU); g.stroke();
});
const bpTallyTex = () => ctex("bpTally", 1024, 300, (g) => {
  g.clearRect(0, 0, 1024, 300); g.strokeStyle = "rgba(240,248,255,0.92)"; g.lineWidth = 16; g.lineCap = "round";
  for (let grp = 0; grp < 4; grp++) {
    const x0 = 60 + grp * 240;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + k * 40, 50 + (k % 2) * 6); g.lineTo(x0 + k * 40 + 6, 250); g.stroke(); }
    g.beginPath(); g.moveTo(x0 - 20, 220); g.lineTo(x0 + 150, 80); g.stroke();
  }
});
const bpRimTex = () => ctex("bpRim", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(255,255,255,${0.09 * (1 - k / 14)})`; g.lineWidth = 3; rrect(g, 20 + k * 1.5, 20 + k * 1.5, 216 - k * 3, 216 - k * 3, 12); g.stroke(); }
  for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(255,255,255,${0.06 * (1 - k / 10)})`; g.lineWidth = 3; rrect(g, 20 - k * 1.8, 20 - k * 1.8, 216 + k * 3.6, 216 + k * 3.6, 14); g.stroke(); }
});
/** the drafting backdrop (34 x 10.5 m): FIG. 1 title, a ruler along the bottom, a protractor, tape strips, crosses */
const bpBackTex = () => ctex("bpBack", 2048, 640, (g, r) => {
  g.clearRect(0, 0, 2048, 640);
  const ch = "rgba(225,238,255,0.85)", faint = "rgba(200,222,255,0.45)";
  g.textAlign = "center"; g.textBaseline = "middle"; // round 3: the FIG. 1 title is its own mesh (bpTitleTex)
  // ruler along the horizon
  g.strokeStyle = ch; g.lineWidth = 4; g.strokeRect(120, 540, 1808, 60);
  g.font = "bold 22px 'Courier New', monospace";
  for (let i = 0; i <= 80; i++) { const x = 140 + i * 22.4, L = i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14; g.beginPath(); g.moveTo(x, 540); g.lineTo(x, 540 + L); g.stroke(); if (i % 10 === 0) { g.fillStyle = ch; g.fillText(String(i / 10), x, 588); } }
  // protractor arc (right)
  const px = 1760, py = 470, R = 210; g.strokeStyle = faint; g.lineWidth = 5; g.beginPath(); g.arc(px, py, R, Math.PI, TAU); g.stroke(); g.beginPath(); g.moveTo(px - R, py); g.lineTo(px + R, py); g.stroke();
  for (let a = 0; a <= 18; a++) { const an = Math.PI + (a / 18) * Math.PI, l = a % 3 ? 14 : 28; g.beginPath(); g.moveTo(px + Math.cos(an) * R, py + Math.sin(an) * R); g.lineTo(px + Math.cos(an) * (R - l), py + Math.sin(an) * (R - l)); g.stroke(); }
  g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(-0.7) * R * 0.9, py + Math.sin(-0.7) * R * 0.9); g.stroke();
  g.fillStyle = faint; g.font = "bold 30px 'Courier New', monospace"; g.fillText("40°", px + 60, py - 40);
  // a pencil-construction triangle + crosses (left), tape strips at the top corners
  g.strokeStyle = faint; g.lineWidth = 4; g.setLineDash([18, 12]); g.beginPath(); g.moveTo(180, 470); g.lineTo(420, 300); g.lineTo(560, 470); g.closePath(); g.stroke(); g.setLineDash([]);
  for (const [x, y] of [[300, 360], [700, 420], [1400, 330], [1100, 470], [1600, 300]]) { g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.moveTo(x, y - 18); g.lineTo(x, y + 18); g.stroke(); }
  for (const [x, rot] of [[90, -0.5], [1958, 0.5]] as [number, number][]) { g.save(); g.translate(x, 46); g.rotate(rot); g.fillStyle = "rgba(244,236,206,0.6)"; g.fillRect(-90, -24, 180, 48); g.restore(); }
  void r;
});
/** round 3: the sheet title, two lines, sized to sit inside the frame at the sign-hold lenses (6 m wide) */
const bpTitleTex = () => ctex("bpTitle2", 1536, 448, (g) => {
  g.clearRect(0, 0, 1536, 448);
  centerText(g, "FIG. 1", 768, 120, 1400, 190, "rgba(236,245,255,0.95)", "'Trebuchet MS', Verdana, sans-serif");
  centerText(g, "HOW PEOPLE DECIDE", 768, 310, 1480, 150, "rgba(225,238,255,0.86)", "'Trebuchet MS', Verdana, sans-serif");
  g.strokeStyle = "rgba(225,238,255,0.6)"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(160, 405); g.bezierCurveTo(560, 420, 1000, 392, 1380, 408); g.stroke();
});
/** a drafting set-square / a compass, flat on the sheet edge (translucent white outlines) */
const bpToolTex = (which: 0 | 1) => ctex("bpTool" + which, 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); g.strokeStyle = "rgba(235,245,255,0.9)"; g.fillStyle = "rgba(220,236,255,0.14)"; g.lineWidth = 10; g.lineJoin = "round";
  if (which === 0) { g.beginPath(); g.moveTo(40, 470); g.lineTo(470, 470); g.lineTo(40, 60); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(110, 410); g.lineTo(330, 410); g.lineTo(110, 200); g.closePath(); g.stroke();
    for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(60 + k * 28, 470); g.lineTo(60 + k * 28, 470 - (k % 5 ? 16 : 30)); g.stroke(); } }
  else { g.beginPath(); g.arc(256, 70, 30, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(240, 96); g.lineTo(110, 470); g.moveTo(272, 96); g.lineTo(400, 460); g.stroke();
    g.beginPath(); g.moveTo(400, 460); g.lineTo(392, 500); g.stroke(); g.beginPath(); g.moveTo(170, 300); g.lineTo(350, 300); g.stroke(); }
});
const labelTex = (key: string, text: string, w: number, h: number) => ctex(key, w, h, (g) => {
  g.clearRect(0, 0, w, h);
  const q = h / 256;
  g.strokeStyle = "rgba(240,248,255,0.95)"; g.lineWidth = 10 * q; g.lineJoin = "round";
  rrect(g, 10 * q, 10 * q, w - 20 * q, h - 20 * q, 18 * q); g.fillStyle = "rgba(220,236,255,0.16)"; g.fill(); g.stroke();
  g.lineWidth = 4 * q; rrect(g, 28 * q, 28 * q, w - 56 * q, h - 56 * q, 10 * q); g.stroke();
  const lines = text.split("\n");
  lines.forEach((t, i) => centerText(g, t, w / 2, h / 2 + 4 * q + (i - (lines.length - 1) / 2) * h * 0.36, w - 90 * q, lines.length > 1 ? h * 0.33 : h * 0.55, "#f4f9ff", "'Trebuchet MS', Verdana, sans-serif"));
});
/** round 5 (A4 P1: the fork labels' letters were ~17-30 px at 1080): two-line signpost label with tight margins, the
 *  words filling ~86 % of the width (cap height ~0.26 x the label height) */
const labelTex5 = (key: string, lines: string[], w: number, h: number) => ctex(key, w, h, (g) => {
  g.clearRect(0, 0, w, h);
  const q = h / 256;
  g.strokeStyle = "rgba(240,248,255,0.96)"; g.lineWidth = 9 * q; g.lineJoin = "round";
  rrect(g, 8 * q, 8 * q, w - 16 * q, h - 16 * q, 16 * q); g.fillStyle = "rgba(14,44,104,0.55)"; g.fill(); g.stroke();
  g.lineWidth = 3.5 * q; rrect(g, 21 * q, 21 * q, w - 42 * q, h - 42 * q, 9 * q); g.stroke();
  lines.forEach((t, i) => centerText(g, t, w / 2, h / 2 + 3 * q + (i - (lines.length - 1) / 2) * h * 0.37, w - 62 * q, h * 0.36, "#f6faff", "'Trebuchet MS', Verdana, sans-serif"));
});
/** round 5 (A4 P2: the FIG. 1 title was cut at the left edge and under the panel): one compact drafting cartouche, three
 *  title lines + the scale / revision line + a red APPROVED stamp, sized to sit above the panel at every hold lens */
const bpCartoucheTex = () => ctex("bpCart5", 1152, 640, (g) => {
  g.clearRect(0, 0, 1152, 640);
  g.fillStyle = "rgba(12,40,96,0.42)"; rrect(g, 10, 10, 1132, 620, 20); g.fill();
  g.strokeStyle = "rgba(235,245,255,0.9)"; g.lineWidth = 9; rrect(g, 10, 10, 1132, 620, 20); g.stroke();
  g.lineWidth = 3.5; rrect(g, 30, 30, 1092, 580, 12); g.stroke();
  centerText(g, "FIG. 1", 576, 128, 1000, 168, "rgba(240,248,255,0.98)", "'Trebuchet MS', Verdana, sans-serif");
  centerText(g, "HOW PEOPLE", 576, 300, 1040, 150, "rgba(232,242,255,0.95)", "'Trebuchet MS', Verdana, sans-serif");
  centerText(g, "DECIDE", 576, 444, 1040, 150, "rgba(232,242,255,0.95)", "'Trebuchet MS', Verdana, sans-serif");
  g.lineWidth = 4; g.beginPath(); g.moveTo(40, 528); g.lineTo(1112, 528); g.stroke();
  centerText(g, "SCALE 1:20   N.T.S.   REV. 2", 470, 576, 780, 44, "rgba(214,230,255,0.82)", "'Courier New', monospace");
  g.save(); g.translate(1000, 560); g.rotate(-0.16); g.strokeStyle = "rgba(255,120,110,0.9)"; g.lineWidth = 7; g.strokeRect(-118, -38, 236, 76);
  centerText(g, "APPROVED", 0, 3, 210, 52, "rgba(255,132,120,0.95)", "Impact, 'Arial Black', sans-serif", "normal"); g.restore();
});
const bpNoteTex = (key: string, text: string, w = 512, h = 128) => ctex(key, w, h, (g) => {
  g.clearRect(0, 0, w, h);
  centerText(g, text, w / 2, h / 2, w - 20, h * 0.62, "rgba(230,242,255,0.85)", "'Courier New', monospace");
});
/** round 4: a two-line chalk note (dimension labels) */
const bpNoteTex2 = (key: string, lines: string[], w: number, h: number) => ctex(key, w, h, (g) => {
  g.clearRect(0, 0, w, h);
  lines.forEach((t, i) => centerText(g, t, w / 2, h * (0.3 + 0.42 * i), w - 24, h * 0.38, "rgba(236,246,255,0.92)", "'Courier New', monospace"));
});
// ---- blueprint art, round 6 (A5 P2: the top ~17 % of the wide was empty blue; the crowd read as ~14 static figures) ----
const BPW = "rgba(238,246,255,0.96)", BPW2 = "rgba(214,230,255,0.85)";
/** the drawing's sheet title block, top right: SHEET 2 / 3 - FIELD TEST */
const bpSheetTex = () => ctex("bpSheet6", 1024, 400, (g) => {
  g.clearRect(0, 0, 1024, 400); g.fillStyle = "rgba(12,40,96,0.4)"; g.fillRect(8, 8, 1008, 384);
  g.strokeStyle = BPW; g.lineWidth = 9; g.strokeRect(8, 8, 1008, 384); g.lineWidth = 4;
  g.beginPath(); g.moveTo(8, 270); g.lineTo(1016, 270); g.moveTo(560, 270); g.lineTo(560, 392); g.stroke();
  centerText(g, "SHEET 2 / 3", 512, 92, 960, 120, BPW, "'Trebuchet MS', Verdana, sans-serif");
  centerText(g, "FIELD TEST", 512, 206, 960, 96, BPW, "'Trebuchet MS', Verdana, sans-serif");
  centerText(g, "DRN: TEAM   CHK: OK", 284, 332, 520, 40, BPW2, "'Courier New', monospace");
  centerText(g, "TRAILS A / B", 788, 332, 420, 40, BPW2, "'Courier New', monospace");
});
/** a drafting compass rose with N / E / S / W */
const bpCompassTex = () => ctex("bpCompass6", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); const c = 256; g.strokeStyle = BPW; g.lineWidth = 6;
  g.beginPath(); g.arc(c, c, 170, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(c, c, 150, 0, TAU); g.stroke();
  for (let k = 0; k < 32; k++) { const a = (k / 32) * TAU, r0 = k % 4 ? 160 : 140; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 170, c + Math.sin(a) * 170); g.stroke(); }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU - Math.PI / 2, R = k % 2 ? 92 : 150, w = k % 2 ? 0.26 : 0.18;
    g.beginPath(); g.moveTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.lineTo(c + Math.cos(a + w) * 34, c + Math.sin(a + w) * 34); g.lineTo(c, c); g.closePath();
    g.fillStyle = k === 0 ? "rgba(255,140,120,0.95)" : "rgba(236,246,255,0.9)"; g.fill();
    g.beginPath(); g.moveTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.lineTo(c + Math.cos(a - w) * 34, c + Math.sin(a - w) * 34); g.lineTo(c, c); g.closePath(); g.lineWidth = 3; g.stroke();
  }
  ([["N", 0, -214], ["E", 214, 0], ["S", 0, 214], ["W", -214, 0]] as [string, number, number][]).forEach(([t, x, y]) => centerText(g, t, c + x, c + y + 4, 90, 66, BPW, "'Trebuchet MS', Verdana, sans-serif"));
});
/** a 0-1-2-3 m scale bar (alternate filled blocks) */
const bpScaleBarTex = () => ctex("bpScaleBar6", 1024, 192, (g) => {
  g.clearRect(0, 0, 1024, 192); g.strokeStyle = BPW; g.lineWidth = 5;
  for (let k = 0; k < 6; k++) { const x = 60 + k * 150; if (k % 2 === 0) { g.fillStyle = "rgba(236,246,255,0.9)"; g.fillRect(x, 96, 150, 34); } g.strokeRect(x, 96, 150, 34); }
  ["0", "1", "2", "3"].forEach((t, k) => centerText(g, t, 60 + k * 300, 56, 90, 58, BPW, "'Trebuchet MS', Verdana, sans-serif"));
  centerText(g, "m", 990, 116, 60, 52, BPW, "'Trebuchet MS', Verdana, sans-serif");
  centerText(g, "SCALE", 512, 168, 300, 34, BPW2, "'Courier New', monospace");
});
/** a chalk note (handwritten look) with a quick underline swoosh: the shot-10 counters coming back */
const bpPctTex = (key: string, text: string, col = "rgba(255,236,150,0.98)") => ctex(key, 512, 200, (g) => {
  g.clearRect(0, 0, 512, 200); g.save(); g.translate(256, 92); g.rotate(-0.05);
  centerText(g, text, 0, 0, 470, 128, col, "'Comic Sans MS', 'Trebuchet MS', sans-serif");
  g.restore(); g.strokeStyle = col; g.lineWidth = 9; g.lineCap = "round";
  g.beginPath(); g.moveTo(40, 168); g.bezierCurveTo(170, 150, 330, 176, 470, 150); g.stroke();
});
const bpFig2Tex = () => ctex("bpFig26", 768, 256, (g) => {
  g.clearRect(0, 0, 768, 256); g.fillStyle = "rgba(12,40,96,0.42)"; rrect(g, 8, 8, 752, 240, 18); g.fill();
  g.strokeStyle = BPW; g.lineWidth = 7; rrect(g, 8, 8, 752, 240, 18); g.stroke(); g.lineWidth = 3; rrect(g, 24, 24, 720, 208, 10); g.stroke();
  centerText(g, "FIG. 2: COPY", 384, 132, 680, 120, BPW, "'Trebuchet MS', Verdana, sans-serif");
});
// ---- blueprint art, round 7 (A6 P2: the opening's top ~35 % was empty blue through the pause after 'You see,'; the
// tracing-paper corner was a flat grey trapezoid) ----
/** the PROBLEM title strip that writes itself in the pause after 'You see,' */
const bpProblemTex = () => ctex("bpProblem7", 1024, 300, (g) => {
  g.clearRect(0, 0, 1024, 300); g.fillStyle = "rgba(12,40,96,0.4)"; rrect(g, 6, 6, 1012, 288, 16); g.fill();
  g.strokeStyle = BPW; g.lineWidth = 7; rrect(g, 6, 6, 1012, 288, 16); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(24, 96); g.lineTo(1000, 96); g.stroke();
  font(g, 62, "'Courier New', monospace"); g.fillStyle = BPW2; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("PROBLEM:", 34, 54);
  centerText(g, "FIELD NOTE 0", 820, 54, 340, 44, BPW2, "'Courier New', monospace");
  centerText(g, "WHY DO PEOPLE STEAL?", 512, 196, 960, 132, BPW, "'Trebuchet MS', Verdana, sans-serif");
});
/** tracing paper: off-white with a printed white border, faint pencil construction lines, a FIG. 1a doodle (the fork,
 *  sketched small) and a curled-up corner (6 % darker, with its soft shadow) */
const bpTracingTex = () => ctex("bpTracing7", 512, 372, (g, r) => {
  const W = 512, H = 372; g.clearRect(0, 0, W, H);
  g.fillStyle = "#e8eef6"; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H - 62); g.lineTo(W - 86, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 3; g.strokeRect(10, 10, W - 20, H - 20);
  g.strokeStyle = "rgba(70,84,120,0.33)"; g.lineWidth = 1.6;
  for (const [x0, y0, x1, y1] of [[24, 70, 488, 82], [40, 30, 64, 350], [24, 250, 470, 236], [300, 22, 352, 350]] as number[][]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.strokeStyle = "rgba(60,72,110,0.55)"; g.lineWidth = 2.4; g.lineCap = "round";
  g.beginPath(); g.moveTo(150, 300); g.lineTo(150, 210); g.lineTo(112, 140); g.moveTo(150, 210); g.lineTo(206, 128); g.stroke();
  for (const [x, y, a] of [[112, 140, -2.1], [206, 128, -0.98]] as number[][]) { g.beginPath(); g.moveTo(x + 16 * Math.cos(a + 2.6), y + 16 * Math.sin(a + 2.6)); g.lineTo(x, y); g.lineTo(x + 16 * Math.cos(a - 2.6), y + 16 * Math.sin(a - 2.6)); g.stroke(); }
  for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(214 + (r() - 0.5) * 34, 112 + (r() - 0.5) * 22, 4, 0, TAU); g.stroke(); }
  g.beginPath(); g.arc(104, 128, 4, 0, TAU); g.stroke();
  font(g, 30, "'Courier New', monospace"); g.fillStyle = "rgba(50,62,100,0.7)"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText("FIG. 1a", 258, 214); g.fillText("(SKETCH)", 258, 248);
  // the curled corner (bottom right): the lifted flap 6 % darker + its shadow on the sheet
  g.fillStyle = "rgba(40,60,110,0.22)"; g.beginPath(); g.moveTo(W, H - 62); g.lineTo(W - 86, H); g.lineTo(W - 104, H - 76); g.closePath(); g.fill();
  g.fillStyle = "#d6dde8"; g.beginPath(); g.moveTo(W, H - 62); g.lineTo(W - 86, H); g.lineTo(W - 92, H - 70); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(W, H - 62); g.lineTo(W - 92, H - 70); g.lineTo(W - 86, H); g.stroke();
});
/** a red-pencil double underline (two quick strokes, the second shorter) */
const bpRedLineTex = () => ctex("bpRedLine7", 512, 96, (g) => {
  g.clearRect(0, 0, 512, 96); g.strokeStyle = "rgba(255,92,80,0.98)"; g.lineCap = "round"; g.lineWidth = 11;
  g.beginPath(); g.moveTo(14, 30); g.bezierCurveTo(150, 22, 330, 36, 498, 24); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(40, 70); g.bezierCurveTo(170, 62, 330, 74, 470, 64); g.stroke();
});
/** margin doodle: a petrified-log slice (rings, bark, a crack) labelled SAMPLE 14 T (ties the diagram to the park) */
const bpDoodleTex = () => ctex("bpDoodle7", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); g.strokeStyle = BPW; g.lineCap = "round"; g.lineJoin = "round";
  const cx = 256, cy = 200;
  g.lineWidth = 9; g.beginPath(); g.ellipse(cx, cy, 170, 128, -0.08, 0, TAU); g.stroke();
  g.lineWidth = 4; for (const s of [0.78, 0.58, 0.4, 0.22]) { g.beginPath(); g.ellipse(cx + 8 * (1 - s), cy + 4 * (1 - s), 170 * s, 128 * s, -0.08 + 0.2 * (1 - s), 0, TAU); g.stroke(); }
  g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 20, cy - 10); g.lineTo(cx + 70, cy - 40); g.lineTo(cx + 96, cy - 34); g.lineTo(cx + 150, cy - 70); g.stroke();
  g.fillStyle = "rgba(255,170,120,0.85)"; g.beginPath(); g.ellipse(cx - 60, cy + 30, 22, 14, 0.3, 0, TAU); g.fill();
  g.lineWidth = 5; g.setLineDash([10, 12]); g.beginPath(); g.moveTo(cx + 168, cy + 30); g.lineTo(cx + 210, cy + 150); g.stroke(); g.setLineDash([]);
  centerText(g, "SAMPLE 14 T", 256, 414, 470, 74, BPW, "'Comic Sans MS', 'Trebuchet MS', sans-serif");
  g.lineWidth = 5; g.beginPath(); g.moveTo(70, 462); g.bezierCurveTo(180, 450, 330, 470, 444, 452); g.stroke();
});
/** a chalk stick walker in profile walking screen-right (walk 0/1 = the two leg drawings; look 1 = head snapped back
 *  up-left toward the floating panel; chip = an orange chip in the front hand) */
const chalkWalkerTex = (walk: number, look: number, chip: number) => ctex(`bpWalker6_${walk}${look}${chip}`, 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256); g.strokeStyle = "rgba(240,248,255,0.97)"; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 8;
  const hx = 64 + (look ? -6 : 4), hy = 46 + (look ? -2 : 0);
  g.beginPath(); g.arc(hx, hy, 22, 0, TAU); g.stroke();
  g.fillStyle = "rgba(240,248,255,0.97)";
  if (look) { g.beginPath(); g.arc(hx - 10, hy - 5, 4, 0, TAU); g.arc(hx - 2, hy - 7, 4, 0, TAU); g.fill(); } // eyes up-left
  else { g.beginPath(); g.arc(hx + 11, hy - 2, 4, 0, TAU); g.fill(); }
  g.beginPath(); g.moveTo(64, 70); g.lineTo(62, 150); g.stroke(); // body
  const sw = walk ? 1 : -1;
  g.beginPath(); g.moveTo(63, 88); g.lineTo(63 + 26 * sw, 128); g.moveTo(63, 88); g.lineTo(63 - 24 * sw, 126); g.stroke(); // arms
  g.beginPath(); g.moveTo(62, 150); g.lineTo(62 + 30 * sw, 236); g.moveTo(62, 150); g.lineTo(62 - 24 * sw, 236); g.stroke(); // legs
  if (chip) { g.fillStyle = "#ff9a3c"; const cx = 63 + 26 * sw, cy = 132; g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx + 11, cy); g.lineTo(cx, cy + 10); g.lineTo(cx - 11, cy); g.closePath(); g.fill(); }
});
/** an upright chalk-drawn texture that writes itself left -> right (uProg 0..1) with a glowing leading edge */
const wipeMat = (map: THREE.Texture, col = new THREE.Color(1.22, 1.25, 1.3)) => new THREE.ShaderMaterial({
  uniforms: { uMap: { value: map }, uProg: { value: 0 }, uAlpha: { value: 1 }, uCol: { value: col } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform float uProg, uAlpha; uniform vec3 uCol; varying vec2 vUv;
  void main(){
    vec4 t = texture2D(uMap, vUv);
    float edge = uProg * 1.08 - 0.04 + 0.03 * sin(vUv.y * 21.0);
    float vis = 1.0 - smoothstep(edge - 0.015, edge + 0.015, vUv.x);
    float tip = exp(-abs(vUv.x - edge) * 60.0) * step(uProg, 0.999);
    gl_FragColor = vec4(t.rgb * uCol * (1.0 + 2.5 * tip), t.a * vis * uAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
  transparent: true, depthWrite: false,
});

/** round 4 (A3 P3: the old 2.6 m block was cut by the frame edge and crossed by the path rail): a compact title block
 *  (1.16 x 0.46 m) that fits between the right rail / dashed circle and the frame edge at every lens of shot 11 */
const bpTitleBlockTex = () => ctex("bpTitleBlk7", 1024, 406, (g) => {
  g.clearRect(0, 0, 1024, 406); g.strokeStyle = "rgba(235,245,255,0.92)"; g.lineWidth = 10; g.strokeRect(8, 8, 1008, 390);
  g.lineWidth = 5; g.beginPath(); g.moveTo(8, 214); g.lineTo(1016, 214); g.moveTo(700, 8); g.lineTo(700, 398); g.stroke();
  centerText(g, "VISITOR BEHAVIOR", 354, 112, 640, 104, "rgba(240,248,255,0.96)", "'Trebuchet MS', sans-serif");
  centerText(g, "HOW WARNINGS WORK", 354, 306, 640, 72, "rgba(225,238,255,0.88)", "'Courier New', monospace");
  centerText(g, "SHEET 1/1", 858, 112, 290, 58, "rgba(225,238,255,0.85)", "'Courier New', monospace");
  centerText(g, "FIELD TEST", 858, 306, 290, 66, "#ff8a7a", "'Trebuchet MS', sans-serif");
  // round 7 (A6 ADD): a red NOT TO SCALE rubber stamp, rotated, across the title / sheet divider (worn ink edge)
  g.save(); g.translate(520, 214); g.rotate(-0.1); g.globalAlpha = 0.9;
  g.strokeStyle = "rgba(255,110,96,0.95)"; g.lineWidth = 8; g.strokeRect(-170, -40, 340, 80); g.lineWidth = 3; g.strokeRect(-160, -31, 320, 62);
  centerText(g, "NOT TO SCALE", 0, 3, 300, 46, "rgba(255,120,104,0.98)", "Impact, 'Arial Black', sans-serif", "normal");
  g.globalCompositeOperation = "destination-out"; for (let k = 0; k < 60; k++) { g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(-170 + ((k * 97) % 340), -40 + ((k * 53) % 80), 3 + (k % 4), 2); }
  g.restore();
});
/** round 4 (A3 P3: REV 2 / the compass were half cut by the frame top at 1330-1370): ONE low strip (9 x 0.56 m) in
 *  the band between the FIG. 1 title and the sign-hold frame top: compass rose, 0-1-2 m scale bar, SCALE, REV. 2 */
const bpTopTex4 = () => ctex("bpTop4", 2048, 128, (g) => {
  g.clearRect(0, 0, 2048, 128);
  const ch = "rgba(220,236,255,0.74)"; g.strokeStyle = ch; g.fillStyle = ch; g.lineWidth = 4;
  const cx = 230, cy = 64; g.beginPath(); g.arc(cx, cy, 50, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cy, 40, 0, TAU); g.stroke();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2, L = k % 2 ? 30 : 60; g.beginPath(); g.moveTo(cx + Math.cos(a + 0.2) * 9, cy + Math.sin(a + 0.2) * 9); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.lineTo(cx + Math.cos(a - 0.2) * 9, cy + Math.sin(a - 0.2) * 9); g.closePath(); if (k === 0) g.fill(); else g.stroke(); }
  centerText(g, "N", cx + 90, cy - 22, 60, 44, ch, "'Trebuchet MS', sans-serif");
  const x0 = 520, u = 200; g.lineWidth = 4; g.strokeRect(x0, 34, 2 * u, 28); g.fillRect(x0, 34, u, 28);
  for (let k = 0; k <= 2; k++) centerText(g, String(k), x0 + k * u, 96, 60, 36, ch, "'Courier New', monospace");
  centerText(g, "m", x0 + 2 * u + 40, 48, 60, 36, ch, "'Courier New', monospace");
  centerText(g, "SCALE 1:20", x0 + 2 * u + 240, 64, 300, 40, "rgba(210,228,255,0.64)", "'Courier New', monospace");
  g.save(); g.translate(1560, 64); g.rotate(-0.06); g.strokeStyle = "rgba(255,150,140,0.8)"; g.lineWidth = 7; g.strokeRect(-150, -46, 300, 92);
  centerText(g, "REV. 2", 0, 3, 260, 70, "rgba(255,160,150,0.85)", "Impact, 'Arial Black', sans-serif", "normal"); g.restore();
});
/** round 4 (A3 P3): a chalk scribble ellipse where each floating-sign post "lands" on the paper */
const bpScribTex = () => ctex("bpScrib", 256, 160, (g, r) => {
  g.clearRect(0, 0, 256, 160); g.strokeStyle = "rgba(240,248,255,0.95)"; g.lineCap = "round"; g.lineJoin = "round";
  for (let k = 0; k < 3; k++) {
    g.lineWidth = 20 - k * 5; g.beginPath();
    for (let a = 0; a <= TAU + 0.5; a += 0.12) { const rr = 1 + 0.06 * Math.sin(a * 3 + k * 2) + (r() - 0.5) * 0.05; g.lineTo(128 + Math.cos(a + k * 0.7) * 100 * rr, 80 + Math.sin(a + k * 0.7) * 52 * rr); }
    g.stroke();
  }
});

// ======================================================================================================== chalk text
const CHALK_LINES = ["HALF THIS", "CLASS", "CHEATED."];
const BOARD_PX = 2048 / CL.board.w;                        // canvas px per metre on the board
const CHALK = { x0: -1.5, cap: 0.23, lead: 0.325, top: 0.17 }; // block left (board-local x, m), cap height, line step, top margin
/** word timing: each word is written while (slightly ahead of) the voice saying it */
const chalkWords = () => {
  const h = BEAT.half, c = BEAT.cheated;
  return [{ s: "HALF", a: BEAT.teacher + 4, b: h + 2 }, { s: "THIS", a: h + 3, b: h + 12 }, { s: "CLASS", a: h + 13, b: c - 2 }, { s: "CHEATED.", a: c - 1, b: c + 10 }];
};
type Glyph = { ch: string; line: number; x: number; w: number; t0: number; t1: number };
let glyphCache: Glyph[] | null = null;
const CHALK_FONT = "'Comic Sans MS', 'Trebuchet MS', sans-serif";
const glyphs = (): Glyph[] => {
  if (glyphCache) return glyphCache;
  const cv = document.createElement("canvas"), g = cv.getContext("2d")!;
  const px = (CHALK.cap / 0.72) * BOARD_PX; font(g, px, CHALK_FONT);
  const words = chalkWords(), out: Glyph[] = [];
  let wi = 0;
  CHALK_LINES.forEach((line, li) => {
    let x = (CHALK.x0 + CL.board.w / 2) * BOARD_PX;
    for (const w of line.split(" ")) {
      const W = words[wi++], n = w.length;
      for (let k = 0; k < n; k++) {
        const cw = g.measureText(w[k]).width;
        out.push({ ch: w[k], line: li, x, w: cw, t0: lerp(W.a, W.b, k / n), t1: lerp(W.a, W.b, (k + 1) / n) });
        x += cw + px * 0.02;
      }
      x += g.measureText(" ").width * 1.1;
    }
  });
  glyphCache = out;
  return out;
};
/** world position of the chalk tip at frame f (for the teacher's writing hand; null when not writing) */
export const chalkTip = (f: number): V3 | null => {
  const G = glyphs(), cur = G.find((q) => f >= q.t0 && f < q.t1);
  if (!cur) return null;
  const k = (f - cur.t0) / (cur.t1 - cur.t0), xpx = cur.x + cur.w * k;
  const bx = xpx / BOARD_PX - CL.board.w / 2, top = CL.board.cy + CL.board.h / 2;
  const y = top - CHALK.top - CHALK.cap * (0.35 + 0.5 * Math.abs(Math.sin(k * 5))) - cur.line * CHALK.lead;
  return [CL.base[0] + CL.board.cx + bx, CL.base[1] + y, CL.base[2] + CL.board.z + 0.01];
};
class ChalkText {
  cv = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; grain: HTMLCanvasElement; key = "";
  constructor() {
    this.cv.width = 2048; this.cv.height = 634; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.grain = document.createElement("canvas"); this.grain.width = 2048; this.grain.height = 634;
    const q = this.grain.getContext("2d")!, r = rng(77);
    for (let i = 0; i < 52000; i++) { q.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.65})`; q.fillRect(r() * 2048, r() * 634, 1 + r() * 2.5, 1 + r() * 2); }
    for (let i = 0; i < 900; i++) { q.strokeStyle = `rgba(0,0,0,${0.5 + r() * 0.4})`; q.lineWidth = 1 + r() * 2; const x = r() * 2048, y = r() * 634; q.beginPath(); q.moveTo(x, y); q.lineTo(x + 6 + r() * 16, y + (r() - 0.5) * 4); q.stroke(); }
  }
  /** redraw only when the visible state changes */
  draw(f: number) {
    const G = glyphs();
    let n = 0, part = 0;
    for (const q of G) { if (f >= q.t1) n++; else { if (f > q.t0) part = (f - q.t0) / (q.t1 - q.t0); break; } }
    const key = `${n}|${part.toFixed(2)}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.g, px = (CHALK.cap / 0.72) * BOARD_PX;
    g.clearRect(0, 0, 2048, 634);
    font(g, px, CHALK_FONT); g.textAlign = "left"; g.textBaseline = "alphabetic";
    for (let i = 0; i < Math.min(G.length, n + 1); i++) {
      const q = G[i], p = i < n ? 1 : part;
      if (p <= 0) break;
      const base = (CHALK.top + CHALK.cap + q.line * CHALK.lead) * BOARD_PX;
      // each letter appears in 3 overlapping strokes (left stem, middle, right), each drawn top -> bottom
      for (let j = 0; j < 3; j++) {
        const kj = clamp01(p * 3 - j);
        if (kj <= 0) break;
        const b0 = [-0.15, 0.3, 0.62][j], b1 = [0.42, 0.74, 1.15][j];
        g.save();
        g.beginPath(); g.rect(q.x + q.w * b0 - 6, base - px * 1.05, q.w * (b1 - b0) + 12, px * 1.35 * kj); g.clip();
        g.translate(q.x + q.w / 2, base + (hash(i * 3.3) - 0.5) * 9); g.rotate((hash(i * 1.7) - 0.5) * 0.1);
        g.filter = "blur(4px)"; g.fillStyle = "rgba(246,246,238,0.16)"; g.fillText(q.ch, -q.w / 2, 0); g.filter = "none";
        for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(246,246,238,${k ? 0.36 : 0.86})`; g.fillText(q.ch, -q.w / 2 + (hash(i + k * 5.1) - 0.5) * 5, (hash(i + k * 2.9) - 0.5) * 5); }
        g.strokeStyle = "rgba(246,246,238,0.35)"; g.lineWidth = 2.5; g.strokeText(q.ch, -q.w / 2 + (hash(i * 7.1) - 0.5) * 3, (hash(i * 8.3) - 0.5) * 3);
        g.restore();
      }
    }
    // the underline swoosh under CHEATED. once it is done
    const last = G[G.length - 1];
    if (f > last.t1 + 1) {
      const u = clamp01((f - last.t1 - 1) / 5), y = (CHALK.top + CHALK.cap + 2 * CHALK.lead + 0.07) * BOARD_PX, x0 = G.find((q) => q.line === 2)!.x;
      g.strokeStyle = "rgba(246,246,238,0.8)"; g.lineWidth = 12; g.lineCap = "round";
      g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(x0 + (last.x + last.w - x0) * 0.5 * u, y + 16 * u, x0 + (last.x + last.w - x0) * u, y - 6 * u); g.stroke();
    }
    g.globalCompositeOperation = "destination-out"; g.drawImage(this.grain, 0, 0); g.globalCompositeOperation = "source-over";
    this.tex.needsUpdate = true;
  }
}

// ======================================================================================================== particles
/** deterministic drifting motes inside a box (local frame), additive soft dots */
class Motes {
  pts: THREE.Points; base: Float32Array; n: number;
  constructor(parent: THREE.Object3D, n: number, seed: number, public o: V3, public lo: P3, public hi: P3, col: THREE.Color, size: number, public drift = 0.08) {
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
        let v = this.base[i * 3 + k] - this.lo[k] + Math.sin(t * sp * (0.6 + k * 0.3) + ph + k) * this.drift + (k === 1 ? t * 0.02 * sp : t * 0.012 * (k ? 1 : -1));
        v = ((v % span) + span) % span;
        p[i * 3 + k] = this.o[k] + this.lo[k] + v;
      }
    }
    a.needsUpdate = true;
  }
}

// ======================================================================================================== light FX
const fxDiscTex = () => ctex("fxSunDisc2", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.78, "rgba(255,255,255,1)"); gr.addColorStop(0.9, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const fxHaloTex = () => ctex("fxSunHalo2", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.6 * Math.exp(-((u / 0.16) ** 2)) + 0.4 * Math.exp(-((u / 0.5) ** 2))) * (1 - clamp01((u - 0.82) / 0.18));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
});
/** god ray: bright at u = 0 (the sun end), fading out to u = 1; soft across v, a little streaky */
const fxRayTex = () => ctex("fxRay", 512, 64, (g) => {
  const im = g.createImageData(512, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 512; x++) {
    const u = x / 511, v = Math.abs(y / 63 - 0.5) * 2;
    const a = Math.min(1, u * 14) * (1 - u) ** 1.6 * (1 - v * v) ** 2 * (0.8 + 0.2 * Math.sin(y * 0.9 + x * 0.004));
    const i = (y * 512 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
});
/** shaft through the air: soft on both ends and across */
const fxShaftTex = () => ctex("fxShaft", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2;
    const a = Math.sin(Math.PI * u) ** 1.2 * (1 - u * 0.5) * (1 - v * v) ** 1.6;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
});
/** round 6: a lamp's light cone (u = 0 at the bulb -> 1 at the lit face): narrow and bright at the bulb, widening and
 *  fading, feathered sides */
const fxConeTex = () => ctex("fxCone6", 256, 128, (g) => {
  const im = g.createImageData(256, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 127 - 0.5) * 2, half = 0.12 + 0.88 * u;
    const a = Math.min(1, u * 10) * (1 - u) ** 0.8 * (1 - Math.min(1, v / half)) ** 1.4 * (0.85 + 0.15 * Math.sin(x * 0.11 + y * 0.05));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
});
/** multiply overlay for a readable MeshBasic face (child of the face mesh): vertical gradient x cloud shadow on the
 *  dark (wood) pixels only, so letters keep their cream (uKeep = how much of the bright pixels are spared) */
// round 7 (A6 P2 shot 1: the unlit board face looked pasted against the lit posts): uEdge = a soft inner occlusion along
// the face's left / right / bottom edges (the raised frame), so the face sits IN its frame; the vertical gradient (uTop /
// uBot) may exceed 1 (the scene buffer is half float): a warm sky-lit top, a darker bottom
const faceOverlayMat = (map: THREE.Texture | null) => new THREE.ShaderMaterial({
  uniforms: { uMap: { value: map }, uTop: { value: new THREE.Vector3(1, 1, 1) }, uBot: { value: new THREE.Vector3(1, 1, 1) }, uKeep: { value: 0 },
    uCloud: { value: new THREE.Vector4(1, 0, -1e5, -1e5) }, uCloudW: { value: 1 }, uCloudTint: { value: new THREE.Vector3(1, 1, 1) }, uEdge: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform vec3 uTop, uBot, uCloudTint; uniform float uKeep, uCloudW, uEdge; uniform vec4 uCloud; varying vec2 vUv; varying vec3 vW;
  void main(){
    vec3 m = mix(uBot, uTop, smoothstep(0.0, 1.0, vUv.y));
    float ex = min(vUv.x, 1.0 - vUv.x) * 1.3, ey = vUv.y;
    m *= 1.0 - uEdge * (1.0 - smoothstep(0.0, 0.035, min(ex, ey)));
    vec2 cp = vW.xz * 0.35;
    float nz = fract(sin(dot(floor(cp), vec2(12.9898, 78.233))) * 43758.5453), nz2 = fract(sin(dot(floor(cp * 2.3 + 7.0), vec2(39.3468, 11.135))) * 24634.6345);
    float sC = dot(vW.xz, uCloud.xy) + (0.6 * nz + 0.4 * nz2 - 0.5) * uCloudW * 0.8;
    float cov = smoothstep(uCloud.w - uCloudW, uCloud.w + uCloudW, sC) * (1.0 - smoothstep(uCloud.z - uCloudW, uCloud.z + uCloudW, sC));
    m *= mix(vec3(1.0), uCloudTint, cov);
    float lum = dot(texture2D(uMap, vUv).rgb, vec3(0.2126, 0.7152, 0.0722));
    float letter = smoothstep(0.32, 0.5, lum) * uKeep;
    gl_FragColor = vec4(mix(m, vec3(1.0), letter), 1.0);
  }`,
  transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
});
const lin = (hex: string, k = 1) => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r * k, c.g * k, c.b * k); };
/** mean camera position / look point over a shot (from story.ts camAt; cached, so a re-framed camera is picked up) */
const camMean = new Map<number, { pos: THREE.Vector3; look: THREE.Vector3 }>();
const meanCam = (id: number) => {
  let m = camMean.get(id);
  if (!m) {
    const s = SHOTS[id - 1], pos = new THREE.Vector3(), look = new THREE.Vector3(); let n = 0;
    for (let f = s.a; f < s.b; f += 4) { const c = camAt(id, f); pos.add(V(...c.pos)); look.add(V(...c.look)); n++; }
    m = { pos: pos.multiplyScalar(1 / n), look: look.multiplyScalar(1 / n) }; camMean.set(id, m);
  }
  return m;
};

/** round 7 (carry-over for POST's sun13Dir): the WORLD point of the visible sunset sun of shot `id` (8 m behind the gap
 *  between Sign B's top edge and its LED box, seen from the shot's OPENING camera). Pure: the direction toward the sun
 *  from a camera at p is sunsetPoint(id).sub(p).normalize(). */
export const sunsetPoint = (id: number): THREE.Vector3 => {
  const c = camAt(id, SHOTS[id - 1].a), gap = V(TT.base[0] + TT.signB.dx - 0.02, 2.1, TT.base[2]);
  return gap.clone().addScaledVector(gap.clone().sub(V(...c.pos)).normalize(), 8);
};
type FxShaft = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; off: P3; w: number; len: number };
class LightFx {
  g = new THREE.Group();
  private hook: THREE.Mesh;
  // this World's values for the shared uniforms (written by the hook right before this scene draws)
  private rim = new THREE.Vector3(); private ws = new THREE.Vector3(1, 1, 1); private wl = new THREE.Vector3(); private wk = 0; private fill = new THREE.Vector3();
  // round 5: morning god rays through the sign-post gaps (shots 8-9) + a sun glint sliding over the LED glass (shot 9)
  private gapRays: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; x: number; y: number; w: number; len: number; ph: number }[] = [];
  private ledGlints: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; k: number }[] = [];
  private cloud = new THREE.Vector4(1, 0, -1e5, -1e5); private cloudW = 1; private cloudT = new THREE.Vector3(1, 1, 1);
  pools = Array.from({ length: POOL_N }, () => new THREE.Vector3());
  private disc: THREE.Sprite; private halo: THREE.Sprite; private glow: THREE.Sprite;
  private rays: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; a: number; len: number; w: number }[] = [];
  private shafts: FxShaft[] = [];
  private dust: Motes;
  private faces: { signB: THREE.Mesh | null; warn: THREE.Mesh | null; signBo: THREE.ShaderMaterial | null; warno: THREE.ShaderMaterial | null; found: boolean } =
    { signB: null, warn: null, signBo: null, warno: null, found: false };
  private sunCache = new Map<number, THREE.Vector3>();
  private tmp = new THREE.Vector3(); private tmp2 = new THREE.Vector3(); private q = new THREE.Quaternion();
  // round 6
  private ov = { on: false, lit: new THREE.Vector3(), shade: new THREE.Vector3(), lift: new THREE.Vector3(), grad: 0, bodyGrad: 0, lambert: 0, sideK: 1 };
  private boardLamps: { bulb: THREE.Vector3; aim: THREE.Vector3; glow: THREE.Sprite; core: THREE.Sprite; cone: THREE.Mesh; coneMat: THREE.MeshBasicMaterial; moths: THREE.Sprite[] }[] = [];
  private boardDust!: Motes; private profDust!: Motes;

  constructor(private root: THREE.Object3D) {
    root.add(this.g);
    // the hook: a zero-area triangle drawn first in every pass of this World's scene
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    this.hook = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    this.hook.frustumCulled = false; this.hook.renderOrder = -1e9;
    this.hook.onBeforeRender = () => {
      const X = TONE_X;
      X.uRimCol.value.copy(this.rim); X.uFill.value.copy(this.fill); X.uWoodShade.value.copy(this.ws); X.uWoodLift.value.copy(this.wl); X.uWoodK.value = this.wk;
      X.uCloud.value.copy(this.cloud); X.uCloudW.value = this.cloudW; X.uCloudTint.value.copy(this.cloudT);
      for (let i = 0; i < POOL_N; i++) POOL.uPoolCol.value[i].copy(this.pools[i]);
      // round 6: this World's tone override (shot 10's noon contrast), written after world.ts's applyLight
      if (this.ov.on) { TONE.uLitCol.value.copy(this.ov.lit); TONE.uShadeCol.value.copy(this.ov.shade); TONE.uShadeLift.value.copy(this.ov.lift); TONE.uLambert.value = this.ov.lambert; TONE.uSideK.value = this.ov.sideK; CHAR.uGrad.value = this.ov.grad; CHAR.uBodyGrad.value = this.ov.bodyGrad; }
    };
    root.add(this.hook);
    // round 6: the warning board's two gooseneck sign lamps (sets_ext.ts builds the fittings): a blooming bulb glow, a
    // soft warm light cone washing down the board face (camera-facing about its axis) and three moth specks each; on
    // at dusk (shot 15) and switched on as a time-passing cue late in the shot-6 relight (video ~860)
    for (const x of [-0.4, 0.4]) {
      const bulb = V(x, TH.board.cy + TH.board.h / 2 + 0.14 + 0.17, 0.235), aim = V(x * 0.85, TH.board.cy + 0.05, 0.075);
      const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      glowS.position.copy(bulb); core.position.copy(bulb); glowS.renderOrder = 5; core.renderOrder = 6;
      const coneMat = new THREE.MeshBasicMaterial({ map: fxConeTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const cone = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), coneMat); cone.renderOrder = 4; cone.frustumCulled = false;
      const moths = [0, 1, 2].map(() => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, depthWrite: false, fog: false })); m.scale.setScalar(0.03); m.renderOrder = 6; return m; });
      for (const o2 of [glowS, core, cone, ...moths]) { o2.layers.set(NOINK); o2.visible = false; this.g.add(o2); }
      this.boardLamps.push({ bulb, aim, glow: glowS, core, cone, coneMat, moths });
    }
    // round 7 (A6 ADD shot 6): golden dust motes drifting through the late light in front of the board once the lamps are
    // on (and faintly in the lamp cones at dusk)
    this.boardDust = new Motes(this.g, 46, 71, [TH.base[0], TH.base[1], TH.base[2]], [-1.25, 2.25, 0.12], [1.25, 4.35, 1.1], new THREE.Color(0, 0, 0), 0.02, 0.07);
    this.boardDust.pts.visible = false;
    // round 8 (A7 ADD shot 7): a dozen soft gold specks drifting slowly (~0.1-0.3 px/f) through the low morning light
    // behind the professor's head in the MCU (TT-local box 1.2-2.0 m behind him along the MCU lens axis); the DOF turns
    // them into soft bokeh dust
    this.profDust = new Motes(this.g, 12, 83, [TT.base[0], TT.base[1], TT.base[2]], [2.35, 1.15, 0.75], [3.95, 2.55, 2.15], new THREE.Color(0, 0, 0), 0.075, 0.03);
    this.profDust.pts.visible = false;
    // sun disc (blooms: > 1 linear), its halo, a broad horizon glow
    this.disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxDiscTex(), color: new THREE.Color(6.5, 4.6, 2.3), fog: false, depthWrite: false, transparent: true }));
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: fxHaloTex(), color: new THREE.Color(1, 0.7, 0.4), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.2, 0.13, 0.06), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.disc.renderOrder = -0.4; this.halo.renderOrder = 5; this.glow.renderOrder = -0.3;
    for (const s of [this.disc, this.halo, this.glow]) { s.frustumCulled = false; s.layers.set(NOINK); this.g.add(s); }
    // god rays fanning from the sunset sun toward the lens (camera-facing plane just behind Sign B: the sign occludes them)
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute([0, -0.06, 0, 1, -0.5, 0, 1, 0.5, 0, 0, -0.06, 0, 1, 0.5, 0, 0, 0.06, 0], 3));
    rg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    const RAYS: [number, number, number][] = [[-8, 1.1, 0.55], [22, 0.9, 0.5], [52, 0.8, 0.7], [88, 0.7, 0.45], [128, 0.55, 0.5], [-112, 0.75, 0.6], [-142, 0.6, 0.5], [-160, 0.5, 0.45]];
    for (const [a, len, w] of RAYS) {
      const mat = new THREE.MeshBasicMaterial({ map: fxRayTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(rg, mat); mesh.layers.set(NOINK); mesh.renderOrder = 4; mesh.frustumCulled = false; this.g.add(mesh);
      this.rays.push({ mesh, mat, a: THREE.MathUtils.degToRad(a), len, w });
    }
    // slanted shafts of low sun through the air (morning / late), placed around the shot's mean look point
    const sg = new THREE.PlaneGeometry(1, 1); sg.translate(0.5, 0, 0);
    const SH: [P3, number, number][] = [[[-2.2, 0.15, -1.6], 0.9, 9], [[0.5, 0.15, -2.6], 0.6, 8], [[2.0, 0.15, -1.2], 1.1, 10], [[-0.8, 0.15, 0.4], 0.45, 6]];
    for (const [off, w, len] of SH) {
      const mat = new THREE.MeshBasicMaterial({ map: fxShaftTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(sg, mat); mesh.layers.set(NOINK); mesh.renderOrder = 4; mesh.frustumCulled = false; this.g.add(mesh);
      this.shafts.push({ mesh, mat, off, w, len });
    }
    this.dust = new Motes(this.g, 90, 61, [0, 0, 0], [-3.2, 0.15, -3.5], [3.2, 2.6, 2.5], new THREE.Color(0, 0, 0), 0.03, 0.18);
    // round 5 (A4 ADD shot 8): morning god rays slanting through the gaps between the Sign A / Sign B posts and between
    // Sign B and the CRYSTAL head (x = TT-local gap centre, y = height where the light passes, w = width, len = reach)
    for (const [x, y, w, len, ph] of [[-1.6, 1.35, 0.42, 6.5, 0], [-1.35, 0.75, 0.3, 5.0, 1.7], [-1.95, 1.9, 0.26, 5.5, 3.1], [1.65, 1.2, 0.36, 5.8, 4.4]] as number[][]) {
      const mat = new THREE.MeshBasicMaterial({ map: fxShaftTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(sg, mat); mesh.layers.set(NOINK); mesh.renderOrder = 4; mesh.frustumCulled = false; mesh.visible = false; this.g.add(mesh);
      this.gapRays.push({ mesh, mat, x, y, w, len, ph });
    }
    // round 5 (A4 ADD shot 9): a warm sun glint that slides across each LED box's glass (additive band, clipped to the face)
    for (const s of [TT.signA, TT.signB]) {
      const mat = new THREE.ShaderMaterial({ uniforms: { uPos: { value: -1 }, uK: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform float uPos, uK; varying vec2 vUv; void main(){ float s = vUv.x + 0.42 * (vUv.y - 0.5) - uPos; float a = exp(-s * s / 0.0035) + 0.5 * exp(-(s - 0.1) * (s - 0.1) / 0.0006); gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a * uK, 1.0); }",
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TT.led.w * 0.97, TT.led.h * 0.92), mat);
      mesh.position.set(TT.base[0] + s.dx, s.cy + TT.led.dy, TT.base[2] + s.z + 0.0675); mesh.layers.set(NOINK); mesh.renderOrder = 5; mesh.visible = false; this.g.add(mesh);
      this.ledGlints.push({ mesh, mat, k: s === TT.signA ? 0 : 1 });
    }
  }

  /** find the exterior's readable faces once (Exterior is built before Interiors) and give them multiply overlays */
  private findFaces() {
    const F = this.faces; F.found = true;
    const tb = testSignTex("B"), wp = new THREE.Vector3();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !(m.material instanceof THREE.MeshBasicMaterial)) return;
      const map = (m.material as THREE.MeshBasicMaterial).map;
      if (map === tb && !F.signB) F.signB = m;
      m.getWorldPosition(wp);
      if (!F.warn && map && Math.abs(wp.x - TH.base[0]) < 0.05 && Math.abs(wp.y - TH.board.cy) < 0.05 && Math.abs(wp.z - (TH.base[2] + TH.board.z)) < 0.03) F.warn = m;
    });
    const over = (face: THREE.Mesh) => {
      const mat = faceOverlayMat((face.material as THREE.MeshBasicMaterial).map), ov = new THREE.Mesh(face.geometry, mat);
      ov.position.z = 0.002; ov.layers.set(NOINK); ov.renderOrder = 3; face.add(ov); return mat;
    };
    if (F.signB) F.signBo = over(F.signB);
    if (F.warn) { F.warno = over(F.warn); F.warno.uniforms.uKeep.value = 1; }
  }

  /** world direction of the visible sunset sun. Round 3 (A2: the disc sat at frame left, a halo tangent on the red-cap
   *  tourist): from the OPENING camera the disc sits in the gap between Sign B's top edge and the LED box (screen
   *  ~640, 717 at 1080), and it is anchored to a point 8 m behind that gap, so as the camera pushes in it stays
   *  peeking over the panel's top edge (a cartoon cheat on parallax) instead of hiding behind the panel */
  private sunsetDir(id: number, camPos: THREE.Vector3) {
    let P = this.sunCache.get(id);
    if (!P) { P = sunsetPoint(id); this.sunCache.set(id, P); }
    return P.clone().sub(camPos).normalize();
  }

  pose(ctx: SetCtx) {
    const L = ctx.light, f = ctx.f, t = vtime(), cam = ctx.cam, name = L.name, set = ctx.shot.set; // round 6: idle on the video clock
    if (!this.faces.found) this.findFaces();
    // round 6 (A5 P2 shot 10: flat noon on the trails, no form shading, mesas washed grey-lavender under a cobalt sky):
    // this World only: key +15 %, the shade -15 % and turned toward violet (#6A5A9A class), a violet lift, more card form
    // shading, and the scene fog ~30 % thinner so the lavender / rust / cream bands keep their colour
    this.ov.on = ctx.id === 10 && name === "noon";
    if (this.ov.on) {
      this.ov.lit.set(...L.lit).multiplyScalar(1.12);
      this.ov.shade.set(L.shade[0] * 0.74, L.shade[1] * 0.62, L.shade[2] * 0.7); // ~-30 % and violet (r / g 0.85 -> 1.1): the lit floor already sits on the tone-map shoulder, so the contrast comes from the shade
      this.ov.lift.set(0.014, 0.008, 0.04); this.ov.grad = L.charGrad * 1.45; this.ov.bodyGrad = L.bodyGrad * 2.0;
      this.ov.lambert = 0.58; this.ov.sideK = 0.72; // more cosine modelling: posts, panels, logs and rocks show a lit and a turned-away side
      const sc = this.root.parent as THREE.Scene | null;
      if (sc && sc.fog instanceof THREE.Fog) { sc.fog.near = L.fogNear * 1.3; sc.fog.far = L.fogFar * 1.43; }
    }
    // round 8 (user, preview 7: shot 6 'But why would a warning make an honest person want to steal?' must be a MYSTERY
    // beat): on top of the noon -> late relight the light DROPS a little through the question: from 'honest' the key
    // eases down ~14 %, the shade ~10 % and the lift ~35 % (deeper, plum darks) over ~26 video f, and it holds there to
    // the dissolve, so the board lamps flicking on just before 'steal?' read as a motivated, slightly uneasy moment
    if (ctx.id === 6 && set === "trailhead") {
      const dk = sm((VF - (toV(BEAT.honest) - 4)) / 26);
      if (dk > 0.001) this.toneOverride(L, 1 - 0.14 * dk, [1 - 0.1 * dk, 1 - 0.12 * dk, 1 - 0.06 * dk], [1 - 0.35 * dk, 1 - 0.35 * dk, 1 - 0.3 * dk]);
    }
    // ---- shared-uniform extras for this World ----
    this.rim.set(...(L.rim ?? [0, 0, 0])); this.ws.set(...(L.woodShade ?? [1, 1, 1])); this.wl.set(...(L.woodLift ?? [0, 0, 0])); this.wk = L.woodK ?? 0;
    this.fill.set(...(L.fill ?? [0, 0, 0]));
    const exterior = set === "trailhead" || set === "vista" || set === "trails";
    if (!exterior) this.rim.set(0, 0, 0);
    // cloud shadow on "vandalized" (shot 4): leading edge sweeps left -> right across board, posts and ground in ~20 f,
    // holds, the trailing edge clears it from tons14 + 20
    this.cloud.set(1, 0, -1e5, -1e5); this.cloudT.set(1, 1, 1); this.cloudW = 1.1;
    let cloudOn = false;
    if (ctx.id === 4 && f >= BEAT.vandalized - 8) {
      // round 7: the trailing edge clears with the light's own lift back to noon (story.ts SHOTS[3].relight[1]) if the
      // LEAD moves that earlier (A6 P2: end the dip on '14'), else at tons14 + 20 as before
      const lift = SHOTS[3].relight?.[1]?.f ?? 1e9, f0 = BEAT.vandalized - 6, f1 = Math.min(BEAT.tons14 + 20, lift + 2);
      const lead = -3.2 + (f - f0) * 0.22, trail = f >= f1 ? -3.4 + (f - f1) * 0.26 : -1e4;
      // round 5 (A4 P3: the posts went magenta-plum): a cool violet with green kept level with red (no magenta bias)
      // round 7 (A6 P2): a cleaner lavender on the floor; shade.ts turns it warm-neutral on the brown wood
      if (trail < 40) { this.cloud.set(1, 0, lead, trail); this.cloudT.set(0.79, 0.79, 0.92); cloudOn = true; } // round 4: violet, not grey-blue (A3 P2: muddy dim)
    }
    const F = this.faces;
    if (F.warno) {
      // round 7 (A6 P2: the dimmed board read wine / maroon, hue ~340): the cloud darkens the board's wood WARM-NEUTRAL
      // (-20 %, r over b), so it stays brown (#4A2F1D class); the letters are spared as before
      const u = F.warno.uniforms; u.uCloud.value.copy(this.cloud); u.uCloudW.value = this.cloudW; u.uCloudTint.value.set(...(cloudOn ? [0.8, 0.77, 0.73] as P3 : [1, 1, 1] as P3));
      // round 5 (A4 P3): during the shot-6 relight the unlit board face's wood warms ~13 % toward #FFC890 (letters kept)
      let lk = 0;
      if (ctx.id === 6) { const mx = lightMixAt(6, f); lk = mx.a === "late" ? 1 : mx.b === "late" ? mx.k : 0; }
      // round 7 (A6 P2 shot 1: the flat unlit face looked pasted on): a sky-lit warm top (+6 %) to a darker foot (-10 %)
      // and a soft inner occlusion along the frame (left / right / bottom), letters spared
      u.uTop.value.set(1.07, 1.05 * (1 - 0.1 * lk), 1.0 * (1 - 0.19 * lk)); u.uBot.value.set(0.88, 0.865 * (1 - 0.12 * lk), 0.86 * (1 - 0.2 * lk));
      // round 8: the shot-6 mystery drop darkens the unlit board's wood too (-12 %, the routed letters kept bright)
      if (ctx.id === 6) { const dk = sm((VF - (toV(BEAT.honest) - 4)) / 26); u.uTop.value.multiplyScalar(1 - 0.12 * dk); u.uBot.value.multiplyScalar(1 - 0.14 * dk); }
      u.uEdge.value = 0.16;
    }
    if (F.signBo) {
      const u = F.signBo.uniforms;
      if (name === "sunset") { u.uTop.value.set(0.86, 0.72, 0.56); u.uBot.value.set(0.6, 0.54, 0.76); } // round 3: face -10 % (backlit)
      else if (name === "morning") { u.uTop.value.set(1.0, 0.93, 0.82); u.uBot.value.set(0.9, 0.86, 0.94); }
      else { u.uTop.value.set(1, 1, 1); u.uBot.value.set(1, 1, 1); }
    }
    // ---- visible sun, halo, horizon glow, god rays, shafts, motes ----
    const fw = this.tmp.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const sunset = name === "sunset" && set === "trails";
    const sd = sunset ? this.sunsetDir(ctx.id, cam.position) : ctx.sunDir;
    const backK = clamp01((V(sd.x, 0, sd.z).normalize().dot(V(fw.x, 0, fw.z).normalize()) - 0.1) / 0.8);
    this.disc.visible = this.halo.visible = sunset;
    for (const r of this.rays) r.mesh.visible = sunset;
    // low-sun strength follows the (blended) sun elevation, so a relight (shot 6 noon -> late) fades them in smoothly
    const lowSun = exterior ? THREE.MathUtils.smoothstep(30 - L.el, 0, 16) : 0;
    const glowK = lowSun * (name === "sunset" ? 1.3 : name === "dusk" ? 0.7 : 1);
    this.glow.visible = glowK > 0;
    if (glowK > 0) {
      const ge = V(sd.x, Math.max(0.02, sd.y * 0.5), sd.z).normalize();
      this.glow.position.copy(cam.position).addScaledVector(ge, 800); this.glow.scale.setScalar(2 * 800 * Math.tan(THREE.MathUtils.degToRad(32)));
      const gc = name === "dusk" ? [0.22, 0.1, 0.06] : name === "sunset" ? [0.3, 0.15, 0.05] : [0.24, 0.15, 0.07];
      (this.glow.material as THREE.SpriteMaterial).color.setRGB(gc[0] * glowK, gc[1] * glowK, gc[2] * glowK);
    }
    if (sunset) {
      const R = 900, pulse = 1 + 0.03 * vs(2.1);
      this.disc.position.copy(cam.position).addScaledVector(sd, R); this.disc.scale.setScalar(2 * R * Math.tan(THREE.MathUtils.degToRad(2.3)));
      this.halo.position.copy(this.disc.position); this.halo.scale.setScalar(2 * R * Math.tan(THREE.MathUtils.degToRad(17)) * pulse);
      (this.halo.material as THREE.SpriteMaterial).color.setRGB(1.25, 0.78, 0.38);
      // god rays: a fan on a camera-facing plane just behind Sign B, centred on the sun's direction
      const S = V(TT.base[0] + TT.signB.dx, TT.signB.cy, TT.base[2] + TT.signB.z), D = cam.position.distanceTo(S) + 1.6;
      const C = this.tmp2.copy(cam.position).addScaledVector(sd, D / Math.max(0.3, sd.dot(fw)));
      const H = 2 * D * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      this.rays.forEach((r, i) => {
        const sway = 0.025 * vs(0.7, i * 1.9), fl = 0.85 + 0.15 * vs(1.3, i * 2.7);
        r.mesh.position.copy(C); r.mesh.quaternion.copy(cam.quaternion); r.mesh.rotateZ(r.a + sway);
        r.mesh.scale.set(H * r.len, H * 0.16 * r.w, 1);
        r.mat.color.setRGB(0.5 * fl, 0.3 * fl, 0.12 * fl);
      });
    }
    // shafts + motes: low sun (morning, late, sunset), brightest when the sun is ahead of the lens
    const shaftK = lowSun * (name === "dusk" ? 0 : name === "sunset" ? 0.7 : 1);
    const mc = exterior ? meanCam(ctx.id) : null;
    for (const s of this.shafts) {
      s.mesh.visible = shaftK > 0 && !!mc;
      if (!s.mesh.visible || !mc) continue;
      const p0 = V(mc.look.x + s.off[0], s.off[1], mc.look.z + s.off[2]);
      const ax = sd.clone().normalize(), toCam = cam.position.clone().sub(p0).normalize();
      const side = new THREE.Vector3().crossVectors(ax, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(side, ax).normalize();
      s.mesh.position.copy(p0).addScaledVector(ax, -0.6);
      s.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, side, nrm));
      const br = 0.6 + 0.4 * vs(0.5, s.off[0] * 2.0);
      // round 3 (A2: thin streaks over the striped mounds in shot 6): gated by backK^2 (gone unless the sun is well
      // ahead of the lens), twice as wide and soft, at most ~7 %, one warm tint
      s.mesh.scale.set(s.len, 2 * s.w * (1 + 0.08 * vs(0.8, s.off[2])), 1);
      const k = shaftK * backK * backK * (0.75 + 0.25 * br) * 0.07 * (name === "late" ? 0.6 : 1);
      s.mat.color.setRGB(1.0 * k, 0.72 * k, 0.42 * k);
    }
    const dustK = shaftK * (0.3 + 0.7 * backK);
    this.dust.pts.visible = dustK > 0 && !!mc;
    if (this.dust.pts.visible && mc) {
      this.dust.o = [mc.look.x, 0, mc.look.z];
      (this.dust.pts.material as THREE.PointsMaterial).color.setRGB(0.9 * dustK, 0.6 * dustK, 0.3 * dustK);
      this.dust.pose(t, 4);
    }
    // round 5: morning god rays through the sign-post gaps (shots 8-9 at the trail heads): each starts ~1.6 m up-sun of
    // its gap and runs down along the light toward the lens side, turned about its axis to face the camera; ~10-14 %
    // at their brightest, a slow breathing so they shimmer with the dust
    this.profDust.pts.visible = ctx.id === 7 && name === "morning";
    if (this.profDust.pts.visible) { (this.profDust.pts.material as THREE.PointsMaterial).color.setRGB(1.25, 0.9, 0.5); this.profDust.pose(t * 0.45, 13); }
    const gapOn = name === "morning" && set === "trails" && (ctx.id === 8 || ctx.id === 9);
    for (const R of this.gapRays) {
      R.mesh.visible = gapOn;
      if (!gapOn) continue;
      const ax = this.tmp2.copy(sd).multiplyScalar(-1).normalize(), G = V(TT.base[0] + R.x, R.y, TT.base[2] + 0.05);
      const p0 = G.clone().addScaledVector(ax, -1.6), toCam = cam.position.clone().sub(p0).normalize();
      const side = new THREE.Vector3().crossVectors(ax, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(side, ax).normalize();
      R.mesh.position.copy(p0); R.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, side, nrm));
      R.mesh.scale.set(R.len, R.w * (1 + 0.06 * vs(0.7, R.ph)), 1);
      const k = 0.12 * (0.8 + 0.2 * vs(0.55, R.ph)) * (0.4 + 0.6 * backK);
      R.mat.color.setRGB(1.0 * k, 0.76 * k, 0.48 * k);
    }
    // round 5: the morning sun glint sliding across the LED glass in shot 9 (Sign A's during the hold, Sign B's as the
    // camera trucks to it), one slow pass each; a faint late pass in shot 10's noon is left off (white noon light)
    // round 7 (A6 P3 + carry-over: the pass lasted ~30 f and crossed the '0.00%' digits while 'Please don't' was spoken):
    // each glint is now a quick 9 VIDEO-frame flick at ~35 %, inside the word gap just before 'Please' (Sign A) and
    // before 'Another' (Sign B), so it is gone when the word starts (keyed to BEAT on the video clock: follows a re-timed voice)
    for (const G of this.ledGlints) {
      const v0 = toV(G.k === 0 ? BEAT.please1 : BEAT.another) - 9.5, u = (VF - v0) / 9;
      const on = ctx.id === 9 && name === "morning" && u > 0 && u < 1;
      G.mesh.visible = on;
      if (!on) continue;
      G.mat.uniforms.uPos.value = -0.35 + 1.75 * sm(u);
      G.mat.uniforms.uK.value = 0.35 * Math.sin(Math.PI * u);
    }
    // round 6: the board's gooseneck lamps: on at dusk (shot 15), and in shot 6 they flick on late in the relight
    // as the afternoon goes; glow + cone + moths (dusk only)
    // round 8 (A7 ADD + the relay-click cue): in shot 6 each lamp flicks on with WORLD-EXT's fitting (sets_ext.ts), on the
    // VIDEO clock: lamp i on at video toV(steal2) - 11 + 2 i for 1 f, off 2 f, then on for good (a 2 f rise), so the
    // flicker reads at real speed in the fast window and lands with AUDIO's two relay clicks; the halo is a warm cream
    // #FFD7A0 that blooms
    const v6 = toV(BEAT.steal2) - 11;
    const lampOn = (i: number) => {
      if (name === "dusk" && set === "trailhead") return 1;
      if (ctx.id !== 6) return 0;
      const n = Math.floor(VF - (v6 + i * 2));
      return n < 0 ? 0 : n === 0 ? 0.8 : n < 3 ? 0.08 : n === 3 ? 0.62 : 0.86;
    };
    this.lampKs = [lampOn(0), lampOn(1)]; this.lampK = Math.max(this.lampKs[0], this.lampKs[1]);
    this.boardLamps.forEach((B, i) => {
      const onK = this.lampKs[i], vis = onK > 0.01; B.glow.visible = B.core.visible = B.cone.visible = vis;
      // round 7 (A6 ADD shot 6): two moth specks find the LEFT lamp as soon as it is on in shot 6 (the right one has the raven)
      for (let j = 0; j < B.moths.length; j++) B.moths[j].visible = vis && (name === "dusk" || (ctx.id === 6 && i === 0 && j < 2 && VF >= v6 + 6));
      if (!vis) return;
      const fl = 1 + 0.03 * vs(11.0, i * 2.1) * vs(3.7, i);
      // round 7 (A6 P2 shot 6: the right lamp's glow + cone washed the raven perched beside it into a translucent brown
      // smear for ~12 f as it pecked the chip): in shot 6 the right lamp is small (glow 0.2, core 0.08, cone 0.5 wide at
      // 60 %), and EVERY lamp glow is drawn just behind the raven's plane (pushed along its own view ray to z ~0, scaled
      // so it projects the same), so the bird's opaque card occludes it and keeps its full dark fill + outline
      const near = ctx.id === 6 && i === 1;
      const gs = near ? 0.26 : name === "dusk" ? 0.38 : ctx.id === 6 ? 0.62 : 0.42, cs = near ? 0.09 : ctx.id === 6 ? 0.16 : 0.13; // round 8: the shot-6 switch-on must read against the bright late sky
      const cp = cam.position, tz = Math.abs(cp.z - B.bulb.z) > 0.3 ? (cp.z - (TH.base[2] - 0.01)) / (cp.z - B.bulb.z) : 1, kz = Math.max(1, Math.min(1.6, tz));
      B.glow.position.copy(cp).addScaledVector(this.tmp.copy(B.bulb).sub(cp), kz);
      const cream = ctx.id === 6; // round 8: #FFD7A0 in the late light, the warmer orange at dusk
      (B.glow.material as THREE.SpriteMaterial).color.setRGB((cream ? 1.5 : 1.1) * onK * fl, (cream ? 1.2 : 0.7) * onK * fl, (cream ? 0.78 : 0.3) * onK * fl); B.glow.scale.setScalar(gs * kz);
      (B.core.material as THREE.SpriteMaterial).color.setRGB(3.2 * onK, (cream ? 2.7 : 2.4) * onK, (cream ? 1.9 : 1.3) * onK); B.core.scale.setScalar(cs);
      // the cone: from the bulb down to the board face, turned about its axis to face the lens
      const ax = this.tmp2.copy(B.aim).sub(B.bulb), len = ax.length(); ax.normalize();
      const toCam = cam.position.clone().sub(B.bulb).normalize(), side = new THREE.Vector3().crossVectors(ax, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(side, ax).normalize();
      B.cone.position.copy(B.bulb); B.cone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, side, nrm)); B.cone.scale.set(len, near ? 0.5 : 0.95, 1);
      const ck = 0.3 * onK * fl * (name === "dusk" ? 1 : 1.35) * (near ? 0.6 : 1); B.coneMat.color.setRGB(1.0 * ck, 0.68 * ck, 0.36 * ck); // round 8: x1.7 in shot 6
      B.moths.forEach((m, j) => { const a = vph(4.4 + j * 1.3) + j * 2.1 + i, R = 0.1 + 0.04 * vs(1.6, j + i);
        m.position.set(B.bulb.x + Math.cos(a) * R, B.bulb.y - 0.03 + 0.05 * vs(2.9, j * 1.7), B.bulb.z + 0.04 + Math.sin(a) * R * 0.7);
        m.scale.setScalar(Math.floor((VF + j) / 2) % 2 ? 0.032 : 0.022); });
    });
    // round 7 (A6 ADD shot 6): golden dust motes drift through the late light in front of the board once the relight is
    // well under way (brightest after the lamps flick on); at dusk a faint few hang in the lamp light
    { let dk = 0;
      if (ctx.id === 6) { const mx = lightMixAt(6, f), lk = mx.a === "late" ? 1 : mx.b === "late" ? mx.k : 0; dk = 0.55 * sm((lk - 0.35) / 0.4) + 0.45 * Math.min(1, this.lampK / 0.86); }
      else if (name === "dusk" && set === "trailhead") dk = 0.45;
      this.boardDust.pts.visible = dk > 0.01;
      if (dk > 0.01) { (this.boardDust.pts.material as THREE.PointsMaterial).color.setRGB(1.0 * dk, 0.72 * dk, 0.36 * dk); this.boardDust.pose(t * 0.7, 8); } }
  }
  /** this World's board-lamp level (0 = off), read by Interiors.pose for the trailhead pools 9-10 (round 8: per lamp) */
  lampK = 0; lampKs = [0, 0];
  /** round 7: a per-World tone override (Interiors: the shot-14 BAIT insert): lit / shade / lift multipliers on L */
  toneOverride(L: LightState, lit: number, shade: P3, lift: P3) {
    const o = this.ov; o.on = true;
    o.lit.set(...L.lit).multiplyScalar(lit); o.shade.set(L.shade[0] * shade[0], L.shade[1] * shade[1], L.shade[2] * shade[2]); o.lift.set(L.lift[0] * lift[0], L.lift[1] * lift[1], L.lift[2] * lift[2]);
    o.lambert = L.lambert; o.sideK = L.sideK; o.grad = L.charGrad; o.bodyGrad = L.bodyGrad;
  }
}

// ======================================================================================================== blueprint lines
/** flat polyline ribbon on the floor: uv.x = arc length fraction, uv.y 0..1 across; returns the geometry and length */
const ribbon = (pts: [number, number][], w: number, y = 0.012): { g: THREE.BufferGeometry; len: number } => {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = L[L.length - 1], pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n;
    let mx = -dz, mz = dx, ml = 1;
    if (i > 0 && i < pts.length - 1) { // miter
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const d1 = [p1[0] - p0[0], p1[1] - p0[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
      const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
      mx = n1[0] + n2[0]; mz = n1[1] + n2[1]; const ln = Math.hypot(mx, mz) || 1; mx /= ln; mz /= ln;
      ml = Math.min(2.5, 1 / Math.max(0.2, mx * n1[0] + mz * n1[1]));
    }
    const p = pts[i], h = (w / 2) * ml;
    pos.push(p[0] + mx * h, y, p[1] + mz * h, p[0] - mx * h, y, p[1] - mz * h);
    uv.push(L[i] / len, 1, L[i] / len, 0);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return { g, len };
};
const CHALK_VS = /* glsl */ `varying vec2 vUv; varying vec3 vW;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const NOISE = /* glsl */ `float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }`;
/** chalky white line that draws itself (uProg 0..1 along the ribbon) with a glowing pen head */
const chalkLineMat = (len: number, col = new THREE.Color(1.36, 1.44, 1.54)) => new THREE.ShaderMaterial({ // round 3: x1.3 (A2: flat, no glow); round 5: x1.17 more (A4: "no line glow": the blueprint bloom keys at 1.0)
  uniforms: { uProg: { value: 0 }, uAlpha: { value: 1 }, uLen: { value: len }, uCol: { value: col } },
  vertexShader: CHALK_VS,
  fragmentShader: /* glsl */ `uniform float uProg, uAlpha, uLen; uniform vec3 uCol; varying vec2 vUv; varying vec3 vW;
  ${NOISE}
  void main(){
    float s = vUv.x * uLen, head = uProg * uLen;
    if (s > head + 0.001) discard;
    float across = abs(vUv.y - 0.5) * 2.0;
    vec2 wq = vec2(vW.x + 0.83 * vW.y, vW.z + 0.61 * vW.y);                    // floor and upright lines alike
    float rough = 0.35 * (vn(vec2(s * 7.0, vUv.y * 2.0)) - 0.5) + 0.3 * (vn(wq * 31.0) - 0.5);
    float a = 1.0 - smoothstep(0.45, 1.0, across + rough);
    a *= 0.62 + 0.38 * vn(wq * 83.0);
    float tip = exp(-max(head - s, 0.0) * 5.0) * (1.0 - step(0.999, uProg));
    gl_FragColor = vec4(uCol * (1.0 + 3.5 * tip), clamp(a * uAlpha + tip * 0.6, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
});
/** additive 1 m / 5 m grid with a slow travelling shimmer, fading with distance (blueprint floor overlay) */
const gridMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(0.55, 0.72, 1.0) }, uRev: { value: new THREE.Vector3(0, 0, 1e4) },
    uRip: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0)) } },
  vertexShader: CHALK_VS,
  fragmentShader: /* glsl */ `uniform float uT; uniform vec3 uCam, uCol, uRev; uniform vec4 uRip[ 4 ]; varying vec2 vUv; varying vec3 vW;
  void main(){
    vec2 p = vW.xz;
    vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
    float line = 1.0 - min(min(g.x, g.y) / 1.3, 1.0);
    vec2 p5 = p / 5.0; vec2 g5 = abs(fract(p5 - 0.5) - 0.5) / fwidth(p5);
    float major = 1.0 - min(min(g5.x, g5.y) / 1.8, 1.0);
    float d = length(vW - uCam);
    float fade = 1.0 - smoothstep(12.0, 46.0, d);
    float wave = pow(0.5 + 0.5 * sin(dot(p, vec2(0.42, 0.27)) - uT * 3.14159), 4.0); // round 3: one sweep every 2 s
    float a = (line * (0.09 + 0.2 * wave) + major * (0.16 + 0.14 * wave)) * fade;
    // round 6 (A5 ADD: the grid draws itself): on "You see," the grid inks outward from the visitor in a ring
    // (uRev = origin xz, radius); its front edge glows like a fresh chalk line, the lines behind it settle
    float dr = length(p - uRev.xy), front = uRev.z;
    a *= 1.0 - smoothstep(front - 1.4, front, dr);
    a += (line * 0.55 + major * 0.8) * exp(-abs(dr - front) * 1.5) * step(dr, front + 0.6) * step(front, 60.0) * fade;
    // round 7 (A6 ADD): a faint shimmer ripples outward through the grid from each label / note as it lands
    // (uRip[i] = origin xz, radius m, strength 0..1)
    for (int i = 0; i < 4; i++) { vec4 R = uRip[ i ]; if (R.w <= 0.001) continue; float rr = length(p - R.xy); a += (line * 0.5 + major * 0.6) * R.w * exp(-abs(rr - R.z) * 3.2) * fade; }
    gl_FragColor = vec4(uCol * a, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
});
const fillMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.85, 1.0), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3, side: THREE.DoubleSide });

// ======================================================================================================== anchors
/** BAIT bucket (round 2): beside the crate's right side on a 0.35 m step stool, so its label clears both the frame
 *  bottom and the CONSCIENCE PILE stencil. LEAD: plan.ts SR.bucket -> [1.05, 0, -0.6]; cast.ts's bucket target y =
 *  BAIT.rim (0.67) instead of 0.42 (cast stages the assistant from SR.bucket). */
export const BAIT = { pos: [1.05, 0, -0.6] as V3, stool: 0.35, rim: 0.67 };
/** height of the pail's chip heap over the rim at radius rho (m): +4.2 cm at the centre, ~-1.5 cm at the wall */
const BHEAP = (rho: number) => -0.015 + 0.057 * (1 - (rho / 0.15) ** 2);
/** the scoop pours (cast.ts: fs = BEAT.pieces + 4 + n * (BEAT.apology - BEAT.pieces - 4) / 3; tips fs+4 .. fs+9): chip k
 *  of scoop n leaves the scoop at fs + 4 + k from cast's bucket target + [0, 0.32, 0] and lands 5 f later */
/** the hurricane lantern on the storeroom floor, in front of the bait stool (room-local) */
const LANTERN: P3 = [1.31, 0, -0.13]; // round 6: 6 cm right + 4 cm toward the lens (it hid the end of BAD LUCK EVER SINCE in the reveal)
const pourAt = (n: number, k: number) => BEAT.pieces + 4 + (n * (BEAT.apology - BEAT.pieces - 4)) / 3 + 4 + k;
/** storeroom swing-arm lamp: head high over the desk's right end, aimed at the crate top / letters / bucket */
const LAMP_HEAD: P3 = [-1.15, 2.0, -1.5], LAMP_AIM: P3 = [0.4, 0.85, -1.05];
/** brass mail slot in the north wall and the galvanized chute from it down to the back of the pile */
const MAIL = { slot: [-0.2, 1.5, -2.75] as P3, s0: [-0.2, 1.44, -2.68] as P3, s1: [-0.12, 1.06, -1.6] as P3 };
/** round 8: the warm plug-in night-light right of the slot collar (room-local x, y on the north wall) */
const NIGHT_LIGHT: P3 = [0.13, 1.33, 0];
/** round 5: the moonlight shaft (room-local): from the window centre, down and toward the lens, landing on the floor in
 *  front of the crate's left end */
const MOON = (() => {
  const start: P3 = [-1.3, 1.8, -2.7], d = V(0.38, -0.6, 0.7).normalize(), len = 3.0;
  return { start, dir: [d.x, d.y, d.z] as P3, len, end: [start[0] + d.x * len, start[1] + d.y * len, start[2] + d.z * len] as P3 };
})();
/** round 5: the bare work bulb hanging from the second ceiling beam over the gap between the pile and the pail (in
 *  frame top-centre in the reveal and the two-shot; it fills the dead ceiling band) */
const WORK_BULB = { hook: [0.5, 2.78, -0.66] as P3, y: 2.25 };
/** round 5: the dusk practicals at the trailhead (world space, plan.ts TH): the board's two gooseneck sign lights and
 *  the lot lamp behind the sign (sets_ext.ts builds the fittings); they light posts, frame and ground in shot 15 */
const DUSK_LAMPS: [P3, number, P3][] = [
  [[-0.4, 4.24, 0.32], 2.3, [1.25, 0.66, 0.26]], [[0.4, 4.24, 0.32], 2.3, [1.25, 0.66, 0.26]], [[3.18, 3.9, -6.0], 7.0, [1.1, 0.6, 0.24]],
];

// ======================================================================================================== the rooms
/** a self-drawing chalk line; round 7: `out` = picture frame it is rubbed out (6 f fade), `p3` = world points of an
 *  upright line (for the chalk dust at its draw head) */
type ChalkLine = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; a: number; b: number; pre: number; pts: [number, number][]; L: number[]; stick: boolean; out?: number; p3?: THREE.Vector3[] };
/** a pop-in (8 picture f outBack); round 7: vd = its length in VIDEO frames instead (the THE RULE label pops in 3) */
type Pop = { obj: THREE.Object3D; f: number; s: number; vd?: number };

export class Interiors {
  private cl = new THREE.Group(); private sr = new THREE.Group(); private bp = new THREE.Group();
  private fx: LightFx; private poolBase: THREE.Vector3[] = [];
  // classroom
  private chalk = new ChalkText(); private secHand!: THREE.Mesh; private minHand!: THREE.Mesh; private hourHand!: THREE.Mesh;
  private clMotes!: Motes; private chalkDust!: Motes; private clTree: THREE.Mesh | null = null; private clTree2: THREE.Mesh | null = null;
  private swingers: { g: THREE.Object3D; amp: number; hz: number; ph: number }[] = [];
  private hour2!: THREE.Mesh; private min2!: THREE.Mesh; private sec2!: THREE.Mesh; private pennants: THREE.Mesh[] = []; private patchMotes!: Motes; private letterPuffs: THREE.Sprite[] = [];
  // storeroom
  private letters: { m: THREE.Object3D; p: THREE.Vector3; r: THREE.Euler; s: number }[] = [];
  private lampMotes!: Motes; private steam: THREE.Mesh[] = []; private stars!: THREE.Points;
  // blueprint
  private lines: ChalkLine[] = []; private fills: { m: THREE.MeshBasicMaterial; f: number }[] = []; private pops: Pop[] = [];
  private grid!: THREE.ShaderMaterial; private bpDust!: Motes; private sign!: THREE.Group; private thieves: THREE.Mesh[] = [];
  private labels: THREE.Mesh[] = [];

  constructor(root: THREE.Object3D) {
    root.add(this.cl, this.sr, this.bp);
    this.fx = new LightFx(root);
    this.buildClassroom();
    this.buildStoreroom();
    this.buildBlueprint();
    this.setPools();
    this.poolBase = POOL.uPoolCol.value.map((v) => v.clone());
  }

  // ------------------------------------------------------------------------------------------------ pools / zones
  private setPools() {
    const P = POOL.uPoolPos.value, Cc = POOL.uPoolCol.value, R = POOL.uPoolRad.value, ZP = POOL.uZonePos.value, Z = POOL.uZone.value;
    const set = (i: number, o: V3, p: P3, col: P3, r: number) => { if (i < POOL_N) { P[i].set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); Cc[i].set(...col); R[i] = r; } };
    // classroom: warm daylight glow inside the south window band (the window side of the room is brighter; +30 % r2)
    set(0, CL.base, [-2.6, 1.8, 3.2], [0.24, 0.165, 0.07], 3.6);
    set(1, CL.base, [0.4, 1.8, 3.2], [0.24, 0.165, 0.07], 3.6);
    // storeroom: the swing-arm lamp bulb (warm, strong, short) and the moon window (cool)
    const hd = V(...LAMP_HEAD), am = V(...LAMP_AIM).sub(hd).normalize(), bulbP = hd.clone().addScaledVector(am, 0.05);
    const lampBulb: P3 = [bulbP.x, bulbP.y, bulbP.z], aim = V(...LAMP_AIM).sub(bulbP).normalize();
    // round 6 (A5 P2: the warm pools did not pop against the lavender): every warm storeroom practical +25 % (#FFAD58 -
    // #FFD2A0 class), the moon pool a cleaner blue
    set(2, SR.base, lampBulb, [1.62, 0.9, 0.34], 1.9); // round 3: +30 %; round 6: +25 %
    // round 5: the cool moon pool sits where the new shaft lands (the floor + the crate's front-left), not on the wall
    set(3, SR.base, [MOON.end[0] - 0.1, 0.45, MOON.end[2] - 0.2], [0.03, 0.08, 0.3], 1.5);
    // round 5 (A4 P2: no warm practical in frame, no warm wall falloff): the hanging work bulb, #FFD2A0, a long soft
    // reach (the back wall, the ceiling beams, the pile top, the stool and the jar shelf all take it)
    set(8, SR.base, [WORK_BULB.hook[0], WORK_BULB.y, WORK_BULB.hook[2]], [2.45, 1.42, 0.5], 2.6); // round 6b: shorter reach, same near strength, warmer: the ceiling's warm-over-blue lavender band (A5 P2) shrinks to a quick warm -> blue edge
    // round 5 (A4 P2 dusk): the trailhead practicals, ON only in the dusk World (Interiors.pose zeroes them otherwise)
    DUSK_LAMPS.forEach(([p, r, c], i) => set(9 + i, [0, 0, 0], p, c, r));
    // round 7 (A6 P3 dusk: nothing motivated the warm floor): the gooseneck lamps' warm #FFC27A spill on the GROUND under
    // the board, ~3 m reach each with a soft falloff (centred 1.2 m up so the paving takes it at a good angle), so the
    // ground near the sign and the tourist's lens side are warm and the far floor falls into the blue hour
    for (const [i, x] of [[12, -0.55], [13, 0.55]] as [number, number][]) set(i, [0, 0, 0], [x, 1.2, 0.95], [0.8, 0.43, 0.15], 2.8);
    set(4, SR.base, [0.5, 1.45, -0.5], [1.44, 0.76, 0.23], 1.9);  // round 3: lamp spill aimed at the pile top + the pail (lens side)
    // round 3: the hurricane lantern on the floor (crate front, stool, pail, rug, notes) + a softer spill on the crate's left
    set(6, SR.base, [LANTERN[0], 0.2, LANTERN[2]], [1.94, 0.9, 0.26], 2.3);
    set(7, SR.base, [-0.2, 0.75, -0.25], [0.56, 0.29, 0.09], 1.4);
    // round 8 (A7 P3): the slot night-light's small warm pool (collar, chute lip and tray, the wall round the slot)
    set(14, SR.base, [NIGHT_LIGHT[0] - 0.18, NIGHT_LIGHT[1] - 0.02, -SR.room.d / 2 + 0.3], [1.6, 0.86, 0.26], 1.5);
    // classroom: the teacher's desk lamp pool (warm, small)
    set(5, CL.base, [0.75 - 0.47, 1.0, -2.45 - 0.18], [0.8, 0.52, 0.2], 1.3); // round 3: the lamp reads as ON
    if (ZONE_N > 0) {
      ZP[0].set(SR.base[0] + lampBulb[0], SR.base[1] + lampBulb[1], SR.base[2] + lampBulb[2]);
      // the lamp's spot: full inside 21 deg of its aim, gone by 36 deg; full to 3.0 m, gone by 4.6 m (whole room = 40 m)
      // round 3: a wider, longer spot (full inside 19 deg, gone by 36 deg; full to 3.0 m, gone by 4.3 m)
      Z[0].set(3.0, 4.3, Math.cos(THREE.MathUtils.degToRad(19)), 40);
      POOL.uZoneDir.value[0].set(aim.x, aim.y, aim.z, Math.cos(THREE.MathUtils.degToRad(36)));
    }
  }

  // ================================================================================================ CLASSROOM
  private buildClassroom() {
    const o = CL.base, b = new RB(o), W = CL.room.w / 2, D = CL.room.d / 2, H = CL.room.h;
    const floor = TM("clFloor", () => boardsTex("clFloorT", ["#c48a52", "#b97f49", "#cc965e", "#b07644"], "#6a4026", 12));
    const plaster = TM("clPlaster", () => plasterTex("clPlasterT", "#efdcb2"));
    const wains = TM("clWains", () => vboardsTex("clWainsT", ["#a26a42", "#9a6440", "#a87148"], "#5a3722", 10));
    const ceil = TM("clCeil", () => tilesTex());
    const trim = C("#7a4a2c"), white = C("#f3eee2"), metal = TM("clMetal", () => metalTex("clMetalT", "#5d6b80"));
    const WT = 0.2, WAIN = 1.0;
    // floor + ceiling
    b.box(floor, -W - WT, -0.12, -D - WT, W + WT, 0, D + WT, 2);
    b.box(ceil, -W - WT, H, -D - WT, W + WT, H + 0.2, D + WT, 1.2, true, true);
    // walls: lower wainscot boards, upper plaster; the SOUTH (back) wall holds the window band (x -4.1 .. 1.9,
    // sill 0.9, head 2.7): a low sun from behind the students throws pane patches and long shadows onto the board wall
    const wall = (x0: number, z0: number, x1: number, z1: number, y0 = 0, y1 = H) => {
      if (y0 < WAIN) b.box(wains, x0, y0, z0, x1, Math.min(WAIN, y1), z1, 1);
      if (y1 > WAIN) b.box(plaster, x0, Math.max(WAIN, y0), z0, x1, y1, z1, 2);
    };
    wall(-W - WT, -D - WT, W + WT, -D);       // north (board)
    wall(-W - WT, -D, -W, D);                 // west
    wall(W, -D, W + WT, D);                   // east
    const WIN = { x0: -4.1, x1: 1.9, y0: 0.9, y1: 2.7, n: 4 };
    wall(-W - WT, D, WIN.x0, D + WT); wall(WIN.x1, D, W + WT, D + WT);
    wall(WIN.x0, D, WIN.x1, D + WT, 0, WIN.y0); wall(WIN.x0, D, WIN.x1, D + WT, WIN.y1, H);
    // chair rail + skirting on all walls
    for (const [x0, z0, x1, z1] of [[-W, -D, W, -D + 0.04], [-W, D - 0.04, WIN.x0, D], [WIN.x1, D - 0.04, W, D], [-W, -D, -W + 0.04, D], [W - 0.04, -D, W, D]] as [number, number, number, number][]) {
      b.box(trim, x0, WAIN - 0.03, z0, x1, WAIN + 0.04, z1); b.box(trim, x0, 0, z0, x1, 0.12, z1);
    }
    b.box(trim, WIN.x0, 0, D - 0.04, WIN.x1, 0.12, D);
    // window band: frames, mullions (cast the pane shadows), sill, half-lowered blinds, radiator, plants
    const pw = (WIN.x1 - WIN.x0) / WIN.n;
    b.box(white, WIN.x0, WIN.y0 - 0.06, D - 0.12, WIN.x1, WIN.y0, D + 0.02);                          // sill
    for (let i = 0; i <= WIN.n; i++) b.box(white, WIN.x0 + i * pw - 0.05, WIN.y0, D - 0.06, WIN.x0 + i * pw + 0.05, WIN.y1, D + 0.02);
    for (let i = 0; i < WIN.n; i++) b.box(white, WIN.x0 + (i + 0.5) * pw - 0.02, WIN.y0, D - 0.05, WIN.x0 + (i + 0.5) * pw + 0.02, WIN.y1, D + 0.01);
    b.box(white, WIN.x0, 1.98, D - 0.06, WIN.x1, 2.03, D + 0.02);                                          // transom
    b.box(white, WIN.x0, WIN.y1 - 0.06, D - 0.06, WIN.x1, WIN.y1, D + 0.02);
    for (let k = 0; k < 5; k++) b.box(C("#f1e8d0"), WIN.x0 + 0.05, 2.62 - k * 0.075, D - 0.1, WIN.x1 - 0.05, 2.665 - k * 0.075, D - 0.085); // blinds (top)
    b.box(C("#efe6cf"), WIN.x0 + 0.05, 2.66, D - 0.12, WIN.x1 - 0.05, 2.7, D - 0.08);
    b.box(C("#d9d4c8"), -3.8, 0.18, D - 0.32, 1.6, 0.78, D - 0.1, 0, false);                             // radiator
    for (let k = 0; k < 17; k++) b.box(C("#c7c1b3"), -3.7 + k * 0.31, 0.2, D - 0.33, -3.6 + k * 0.31, 0.76, D - 0.31, 0, false);
    const glass = basic("clGlass", () => ({ color: new THREE.Color(0.78, 0.9, 1.0), transparent: true, opacity: 0.16, depthWrite: false }));
    b.flat.add(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0).rotateY(Math.PI), glass, b.m((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, D - 0.01));
    for (const [x, h] of [[-3.3, 0.32], [-1.15, 0.26], [0.9, 0.36]] as [number, number][]) {
      b.geo(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 10), C("#c8643a"), x, WIN.y0 + 0.07, D - 0.16);
      for (let k = 0; k < 6; k++) b.geo(new THREE.IcosahedronGeometry(0.08 + 0.03 * hash(x + k), 0), C(["#5aa84a", "#4c9a3e", "#69b54d"][k % 3]), x + (hash(k * 3 + x) - 0.5) * 0.2, WIN.y0 + 0.16 + h * hash(k * 2 + x), D - 0.16 + (hash(k + x) - 0.5) * 0.12);
    }
    // the sunny schoolyard outside (self-lit, never casts)
    const out = basic("clOutsideFar", () => ({ map: outsideFarTex(), color: new THREE.Color(1.15, 1.13, 1.08) }));
    b.flat.add(new THREE.PlaneGeometry(26, 13).rotateY(Math.PI), out, b.m(-1, 2.4, D + 6.5));
    const tree = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2).translate(0, 2.6, 0).rotateY(Math.PI), new THREE.MeshBasicMaterial({ map: outsideTreeTex(), transparent: true, alphaTest: 0.4, color: new THREE.Color(1.05, 1.04, 0.98) }));
    tree.position.set(o[0] - 2.4, o[1] - 0.6, o[2] + D + 1.6); tree.layers.set(NOINK); this.cl.add(tree); this.clTree = tree;
    const tree2 = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0).translate(0, 2.0, 0).rotateY(Math.PI), tree.material);
    tree2.position.set(o[0] + 1.6, o[1] - 0.2, o[2] + D + 2.6); tree2.layers.set(NOINK); this.cl.add(tree2); this.clTree2 = tree2;
    // chalkboard: frame, slate, tray with chalk + eraser
    const bd = CL.board, bz = bd.z; // plan.ts board anchors are room-local
    const slate = (() => {
      const m = twoTone(new THREE.MeshLambertMaterial({ map: boardTex() })), ob = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { ob.call(m, sh, r);
        sh.fragmentShader = sh.fragmentShader.replace("float sunTerm = sunVis *", "float sunTerm = 0.15 * sunVis *").replace("vec3 lit = uLitCol *", "vec3 lit = uLitCol * vec3( 1.0, 0.86, 0.66 ) *"); };
      m.customProgramCacheKey = () => "twoTone8_slate"; return m;
    })();
    b.box(trim, bd.cx - bd.w / 2 - 0.09, bd.cy - bd.h / 2 - 0.09, -D, bd.cx + bd.w / 2 + 0.09, bd.cy + bd.h / 2 + 0.09, bz - 0.012);
    for (const [x0, y0, x1, y1] of [[-bd.w / 2 - 0.09, bd.h / 2, bd.w / 2 + 0.09, bd.h / 2 + 0.09], [-bd.w / 2 - 0.09, -bd.h / 2 - 0.09, -bd.w / 2, bd.h / 2 + 0.09], [bd.w / 2, -bd.h / 2 - 0.09, bd.w / 2 + 0.09, bd.h / 2 + 0.09]] as [number, number, number, number][])
      b.box(trim, bd.cx + x0, bd.cy + y0, bz - 0.012, bd.cx + x1, bd.cy + y1, bz + 0.02);
    b.flat.add(new THREE.PlaneGeometry(bd.w, bd.h), slate, b.m(bd.cx, bd.cy, bz - 0.008));
    b.box(trim, bd.cx - bd.w / 2 - 0.09, bd.cy - bd.h / 2 - 0.1, -D, bd.cx + bd.w / 2 + 0.09, bd.cy - bd.h / 2 - 0.06, bz + 0.09);
    for (let k = 0; k < 4; k++) b.rbox(C(["#f6f4ec", "#f2d24a", "#f29ab0", "#f6f4ec"][k]), 0.09, 0.016, 0.016, -1.6 + k * 0.17 + hash(k) * 0.05, bd.cy - bd.h / 2 - 0.05, bz + 0.05, 0.1 * k, 0, 0, false);
    b.rbox(C("#3a4a6a"), 0.16, 0.035, 0.06, 0.9, bd.cy - bd.h / 2 - 0.04, bz + 0.05, 0.05, 0, 0, false);
    b.rbox(C("#d8cfbc"), 0.16, 0.012, 0.06, 0.9, bd.cy - bd.h / 2 - 0.016, bz + 0.05, 0.05, 0, 0, false);
    const chalkMesh = new THREE.Mesh(new THREE.PlaneGeometry(bd.w, bd.h), new THREE.MeshBasicMaterial({ map: this.chalk.tex, transparent: true, depthWrite: false, color: new THREE.Color(0.86, 0.88, 0.84) }));
    chalkMesh.position.set(o[0] + bd.cx, o[1] + bd.cy, o[2] + bz - 0.004); chalkMesh.layers.set(NOINK); chalkMesh.renderOrder = 2;
    this.cl.add(chalkMesh);
    this.chalkDust = new Motes(this.cl, 22, 5, [o[0], o[1] + bd.cy, o[2] + bz], [-0.14, -0.3, 0.0], [0.14, 0.04, 0.14], new THREE.Color(0.45, 0.46, 0.44), 0.03, 0.03);
    // round 4 (A3 ADD): 3 chalk specks puff off every finished letter and fall away from the board
    for (let k = 0; k < 42; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.92, 0.93, 0.9), transparent: true, depthWrite: false, opacity: 0 })); sp.layers.set(NOINK); sp.visible = false; this.cl.add(sp); this.letterPuffs.push(sp); }
    // above the board: ABC strip, wall clock
    b.panel(TM("clAbc", () => abcTex()), 4.4, 0.275, 0, 2.6, -D + 0.012);
    // round 3: a yellow NO PHONES sticky note stuck on the board's frame corner (top right)
    { const sn = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.24), basic("clNoPhones", () => ({ map: ctex("clNoPhonesT", 256, 236, (g) => {
        g.fillStyle = "#f8e36a"; g.fillRect(0, 0, 256, 236); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 0, 256, 30);
        centerText(g, "NO", 128, 92, 220, 80, "#2a2a58", "'Comic Sans MS', 'Trebuchet MS', sans-serif"); centerText(g, "PHONES!", 128, 172, 230, 62, "#c8302a", "'Comic Sans MS', 'Trebuchet MS', sans-serif");
      }), color: new THREE.Color(0.98, 0.94, 0.86) })));
      sn.position.set(o[0] + CL.board.cx + CL.board.w / 2 - 0.08, o[1] + CL.board.cy + CL.board.h / 2 - 0.04, o[2] + CL.board.z + 0.025); sn.rotation.z = -0.1; sn.layers.set(NOINK); this.cl.add(sn); }
    const cx = -0.85, cy = 2.95; // round 4 (A3 ADD): no longer hidden behind the map roll (the roll now hangs right of it)
    b.geo(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 28).rotateX(Math.PI / 2), C("#c8402e"), cx, cy, -D + 0.025);
    b.geo(new THREE.CircleGeometry(0.2, 40), TM("clClockFace", () => clockTex()), cx, cy, -D + 0.052, 0, 0, 0, 1, false);
    const hand = (w: number, l: number, col: string) => { const g = new THREE.BoxGeometry(w, l, 0.008); g.translate(0, l / 2 - 0.02, 0); const m = new THREE.Mesh(g, C(col)); m.position.set(o[0] + cx, o[1] + cy, o[2] - D + 0.06); m.receiveShadow = true; this.cl.add(m); return m; };
    this.hourHand = hand(0.022, 0.1, "#2a2230"); this.minHand = hand(0.016, 0.15, "#2a2230"); this.secHand = hand(0.006, 0.16, "#d8432f");
    // posters + boards
    // round 4 (A3 P3: only a 0.25 m sliver of it was in frame, "S / T / RK / D" fragments): the rules poster moves fully
    // out of the OTS frame (left edge of frame ~x -2.44 at 1404-1460), and the sliver gets a narrow felt banner that is
    // whole in frame: BE HONEST stacked, caps 0.115 m (~42 px)
    b.panel(TM("clRules", () => rulesTex()), 1.28, 1.6, -3.3, 1.86, -D + 0.012);
    b.panel(TM("clBanner", () => ctex("clBannerT", 128, 1060, (g) => {
      g.fillStyle = "#c8302a"; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(128, 1060); g.lineTo(64, 990); g.lineTo(0, 1060); g.closePath(); g.fill();
      g.fillStyle = "#f2c23a"; g.fillRect(0, 0, 128, 22);
      "BE*HONEST".split("").forEach((ch, i) => { if (ch === "*") star5(g, 64, 70 + i * 104, 26, "#f2c23a"); else centerText(g, ch, 64, 72 + i * 104, 118, 124, "#fdf3d2", "'Arial Black', Impact, sans-serif", "normal"); });
    }), { transparent: true, alphaTest: 0.5 }), 0.165, 1.37, -2.297, 1.78, -D + 0.014);
    b.panel(TM("clPlanets", () => planetsTex()), 0.8, 1.0, 3.25, 1.75, -D + 0.012);
    b.box(trim, -W, 1.25, -2.4, -W + 0.03, 2.3, 1.6);                                              // west corkboard frame
    b.panel(TM("clDrawings", () => drawingsTex()), 3.9, 0.98, -W + 0.035, 1.775, -0.4, Math.PI / 2);
    b.panel(TM("clRead", () => readTex()), 0.72, 0.9, 3.3, 1.75, D - 0.012, Math.PI);
    // door on the east wall, with a little window
    b.box(C("#8a5a36"), W - 0.06, 0, 1.6, W - 0.01, 2.15, 2.6);
    b.box(C("#9cb6c8"), W - 0.065, 1.4, 1.85, W - 0.05, 1.95, 2.35, 0, false); // round 4: a little darker (it sits behind the thought bubble)
    b.geo(new THREE.SphereGeometry(0.035, 10, 8), C("#d9b04a"), W - 0.08, 1.05, 1.72);
    // bookshelf (east wall) with books
    const shelf = C("#9a6440"), books = TM("clBooks", () => booksTex("clBooksT"));
    b.box(shelf, W - 0.04, 0, -2.9, W, 1.6, -1.0); b.box(shelf, W - 0.38, 0, -2.9, W, 1.6, -2.86); b.box(shelf, W - 0.38, 0, -1.04, W, 1.6, -1.0);
    for (let k = 0; k < 5; k++) { b.box(shelf, W - 0.38, 0.03 + k * 0.39, -2.9, W, 0.06 + k * 0.39, -1.0); if (k < 4) b.panel(books, 1.82, 0.3, W - 0.06, 0.22 + k * 0.39, -1.95, -Math.PI / 2, 0, 0, false); }
    // backpacks on hooks (west wall)
    for (let k = 0; k < 5; k++) {
      const z = 2.3 - k * 0.55, col = ["#d8432f", "#2e6fb0", "#e0a630", "#8a3c9a", "#3e8a4a"][k];
      b.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6).rotateZ(Math.PI / 2), C("#9aa4b0"), -W + 0.05, 1.32, z, 0, 0, 0, 1, false);
      b.rbox(TM("clPack" + k, () => backpackTex("clPackT" + k, col)), 0.16, 0.36, 0.3, -W + 0.1, 1.08 - hash(k) * 0.05, z, 0, 0, 0.05 * (hash(k * 3) - 0.5));
    }
    // ceiling: fluorescent panels (self-lit)
    const tube = basic("clTube", () => ({ color: glow("#fff6e6", 1.2) }));
    for (const x of [-2.2, 0.4, 3.0]) for (const z of [-1.6, 1.6]) { b.box(white, x - 0.65, H - 0.06, z - 0.32, x + 0.65, H, z + 0.32, 0, false, true); b.flat.add(new THREE.PlaneGeometry(1.2, 0.5).rotateX(Math.PI / 2), tube, b.m(x, H - 0.062, z)); }
    // student desks, chairs, papers, pencils, backpacks on the floor
    const top = TM("clDeskTop", () => deskTopTex());
    CL.desks.forEach(([x, zc], i) => {
      const z = zc - 0.3; // the desk stands in front of the seated student (the student anchor is the seat)
      b.box(top, x - 0.36, 0.66, z - 0.26, x + 0.36, 0.7, z + 0.26);
      b.box(metal, x - 0.33, 0.52, z - 0.24, x + 0.33, 0.66, z + 0.2);                                 // book box
      for (const [dx, dz] of [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]) b.box(metal, x + dx - 0.018, 0, z + dz - 0.018, x + dx + 0.018, 0.66, z + dz + 0.018);
      const cc = ["#c9483a", "#3e6fb0", "#e0a630", "#5e9e4e", "#c9483a", "#3e6fb0"][i];
      const sz = zc + 0.18;
      b.box(C(cc), x - 0.2, 0.38, sz - 0.18, x + 0.2, 0.42, sz + 0.18);                                // seat
      b.box(C(cc), x - 0.2, 0.5, sz + 0.17, x + 0.2, 0.8, sz + 0.2);                                   // back
      for (const [dx, dz] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]]) b.box(metal, x + dx - 0.012, 0, sz + dz - 0.012, x + dx + 0.012, 0.38, sz + dz + 0.012);
      b.panel(TM("clPaper" + (i % 3), () => paperTex("clPaperT" + (i % 3), "TEST", i % 3 === 1 ? "A+" : i % 3 === 0 ? "B" : "")), 0.21, 0.27, x - 0.08 + hash(i) * 0.1, 0.702, z, 0.3 * (hash(i * 7) - 0.5), -Math.PI / 2, 0, false);
      b.rbox(C("#f2c23a"), 0.16, 0.012, 0.012, x + 0.2, 0.708, z - 0.1, 0.6 + hash(i), 0, 0, false);
      const pc = ["#2e6fb0", "#8a3c9a", "#d8432f", "#3e8a4a", "#e0a630", "#2e6fb0"][i];
      b.rbox(TM("clFloorPack" + i, () => backpackTex("clFloorPackT" + i, pc)), 0.3, 0.34, 0.16, x + 0.48, 0.17, zc + 0.1, 0.4 + hash(i * 5), 0, 0.05);
    });
    // teacher's desk with globe, apple, books, mug of pencils, papers
    const tx = 0.75, tz = -2.45;
    const tw = TM("clTeachTop", () => boardsTex("clTeachTopT", ["#9a6038", "#8f5833", "#a5683f"], "#5a3420", 6, 512));
    b.box(tw, tx - 0.75, 0.74, tz - 0.36, tx + 0.75, 0.78, tz + 0.36, 1);
    b.box(C("#8a5530"), tx - 0.72, 0, tz - 0.33, tx - 0.3, 0.74, tz + 0.33); b.box(C("#8a5530"), tx + 0.3, 0, tz - 0.33, tx + 0.72, 0.74, tz + 0.33);
    b.box(C("#7a4a2c"), tx - 0.3, 0.4, tz - 0.33, tx + 0.3, 0.74, tz - 0.29);
    for (const yy of [0.22, 0.47]) for (const xx of [-0.51, 0.51]) b.box(C("#d9b04a"), tx + xx - 0.05, yy, tz + 0.33, tx + xx + 0.05, yy + 0.02, tz + 0.35, 0, false);
    b.geo(new THREE.SphereGeometry(0.17, 24, 16), TM("clGlobe", () => globeTex()), tx + 0.5, 1.04, tz - 0.05, 0.5, 0.41);
    b.geo(new THREE.TorusGeometry(0.19, 0.012, 6, 24, Math.PI), C("#c9a24a"), tx + 0.5, 1.04, tz - 0.05, 0.5, 0, 0.41);
    b.geo(new THREE.CylinderGeometry(0.02, 0.07, 0.06, 12), C("#c9a24a"), tx + 0.5, 0.81, tz - 0.05); b.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), C("#c9a24a"), tx + 0.5, 0.86, tz - 0.05);
    b.geo(new THREE.SphereGeometry(0.05, 14, 10), C("#d8342c"), tx - 0.1, 0.83, tz + 0.12, 0, 0, 0, [1, 0.9, 1]);
    b.geo(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 5), C("#5a3a22"), tx - 0.1, 0.885, tz + 0.12);
    for (let k = 0; k < 3; k++) b.rbox(C(["#2e5aa8", "#c8402e", "#3e8a4a"][k]), 0.3, 0.05, 0.22, tx - 0.5, 0.805 + k * 0.05, tz - 0.05, 0.1 * k);
    b.geo(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), C("#f2efe6"), tx + 0.12, 0.83, tz - 0.18);
    for (let k = 0; k < 4; k++) b.rbox(C(["#f2c23a", "#d8432f", "#2e6fb0", "#f2c23a"][k]), 0.012, 0.16, 0.012, tx + 0.12 + (k - 1.5) * 0.015, 0.9, tz - 0.18, 0, 0.15 * (k - 1.5), 0.12 * (k - 1.5), false);
    b.panel(TM("clPaper0", () => paperTex("clPaperT0", "TEST", "A+")), 0.21, 0.27, tx + 0.15, 0.782, tz + 0.12, 0.5, -Math.PI / 2, 0, false);
    // round 3: a stack of graded tests on the desk front, an A+ on top and an F peeking out of the middle
    for (let k = 0; k < 7; k++) b.rbox(C(k % 2 ? "#f4f0e4" : "#ece6d6"), 0.22, 0.004, 0.28, tx + 0.42 + (hash(k * 3.1) - 0.5) * 0.02, 0.782 + k * 0.005, tz + 0.16, 0.12 + (hash(k) - 0.5) * 0.08, 0, 0, false);
    b.panel(TM("clPaperF", () => paperTex("clPaperTF", "TEST", "F")), 0.21, 0.27, tx + 0.47, 0.798, tz + 0.21, 0.42, -Math.PI / 2, 0, false);
    b.panel(TM("clPaperA", () => paperTex("clPaperTA", "TEST", "A+")), 0.21, 0.27, tx + 0.42, 0.8175, tz + 0.16, 0.12, -Math.PI / 2, 0, false);
    // the teacher's green banker's lamp (warm practical: emissive bulb under the shade + a small pool on the desk)
    const lpx = tx - 0.52, lpz = tz - 0.18;
    b.geo(new THREE.CylinderGeometry(0.07, 0.08, 0.025, 16), C("#c9a24a"), lpx, 0.792, lpz);
    b.geo(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 6), C("#c9a24a"), lpx, 0.92, lpz);
    b.geo(new THREE.CylinderGeometry(0.06, 0.13, 0.08, 18, 1, true), lam("int:clLampShade", () => ({ color: "#2e7a52", side: THREE.DoubleSide })), lpx + 0.05, 1.07, lpz, 0, 0, 0.12);
    const clBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.005, 16), new THREE.MeshBasicMaterial({ color: glow("#ffd59a", 3.2) }));
    clBulb.position.set(o[0] + lpx + 0.05, o[1] + 1.035, o[2] + lpz); clBulb.rotation.z = 0.12; this.cl.add(clBulb);
    { const bulb2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: glow("#ffdca0", 4.0) }));
      bulb2.position.set(o[0] + lpx + 0.055, o[1] + 1.03, o[2] + lpz); this.cl.add(bulb2);
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.55, 0.36, 0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      hl.position.set(o[0] + lpx + 0.05, o[1] + 1.0, o[2] + lpz); hl.layers.set(NOINK); hl.renderOrder = 4; this.cl.add(hl); this.clHalo = hl;
      const dp = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.32, 0.2, 0.06), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      dp.position.set(o[0] + lpx + 0.1, o[1] + 0.785, o[2] + lpz + 0.08); dp.layers.set(NOINK); dp.renderOrder = 2; this.cl.add(dp); }
    this.clLampPos = V(o[0] + lpx + 0.05, o[1] + 1.0, o[2] + lpz);
    // waste bin + teacher's chair
    b.geo(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 14, 1, true), C("#4e6a8a"), -3.9, 0.17, -2.9, 0, 0, 0, 1);
    b.box(C("#2e3a52"), tx - 0.22, 0.42, tz - 0.85, tx + 0.22, 0.47, tz - 0.45);
    // round 2 dressing: pull-down WORLD MAP roll over the board, wall pencil sharpener, paper airplane on the floor,
    // a crib note taped under the desk behind the honest student, backpacks on two chair backs (keychain + strap swing)
    // (round 4: the map roll spans x 0.1 .. 2.3 only, so the clock left of it is in the OTS frame during the chalk write)
    b.geo(new THREE.CylinderGeometry(0.065, 0.065, 2.3, 14).rotateZ(Math.PI / 2), C("#efe9da"), 1.2, 3.07, -D + 0.09);
    for (const s of [-1, 1]) b.geo(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14).rotateZ(Math.PI / 2), C("#3a5a8a"), 1.2 + s * 1.17, 3.07, -D + 0.09);
    b.panel(TM("clWorldMap", () => worldMapTex()), 2.2, 0.27, 1.2, 2.89, -D + 0.1);
    b.geo(new THREE.TorusGeometry(0.035, 0.008, 6, 14), C("#c9a24a"), 1.2, 2.72, -D + 0.1);
    { const sx = -3.75; // pencil sharpener (moved clear of the bigger rules poster)
      b.box(C("#c8402e"), sx, 1.0, -D, sx + 0.12, 1.1, -D + 0.1); b.box(C("#9aa4b0"), sx - 0.02, 0.97, -D + 0.02, sx + 0.14, 1.0, -D + 0.09);
      b.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6).rotateZ(Math.PI / 2), C("#2a2a30"), sx + 0.17, 1.06, -D + 0.06); b.geo(new THREE.SphereGeometry(0.015, 8, 6), C("#2a2a30"), sx + 0.22, 1.03, -D + 0.06);
      for (let k = 0; k < 7; k++) b.geo(new THREE.ConeGeometry(0.012, 0.01, 5), C(k % 2 ? "#e0b070" : "#d8a050"), sx + 0.06 + (hash(k * 2.3) - 0.5) * 0.3, 0.005, -D + 0.12 + hash(k * 4.1) * 0.15, 0, Math.PI / 2, hash(k) * 3, 1, false); }
    { const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.03, 0.16, -0.09, 0.0, -0.1, 0, 0.0, -0.1, 0, 0.03, 0.16, 0, 0.0, -0.1, 0.09, 0.0, -0.1, 0, 0.03, 0.16, 0, -0.03, -0.1, 0, 0.0, -0.1], 3)); pg.computeVertexNormals();
      b.geo(pg, lam("int:clPlane", () => ({ color: "#f6f4ec", side: THREE.DoubleSide })), 1.45, 0.04, 0.35, 0.9, 0.05, 0.1); }
    // round 6: the crib note became a big tent card on the right desk's front corner (desk 4), turned to the end
    // two-shot lens (picture ~1497: x ~910-1060, y ~1030-1150 at 1080, next to the honest student's smug side-eye)
    { const cx = CL.desks[4][0] + 0.29, cz = CL.desks[4][1] - 0.455, ry = -2.21, rx = -0.16, cw = 0.26, chh = 0.195, cy = 0.7 + chh / 2;
      b.panel(TM("clCrib6", () => cribTex6(), { emissive: new THREE.Color(1, 1, 1), emissiveMap: cribTex6(), emissiveIntensity: 0.25 }), cw, chh, cx + 0.0032 * Math.sin(ry), cy + 0.001, cz + 0.0032 * Math.cos(ry), ry, rx, 0, false); // 1.7 mm proud of the card's lens-side face
      b.rbox(C("#efe070"), cw, chh, 0.003, cx, cy, cz, ry, rx, 0, true); void cribTex; }
    for (const [di, col] of [[3, "#d8432f"], [5, "#3e8a4a"]] as [number, string][]) {
      const [x, zc] = CL.desks[di], sz = zc + 0.18;
      b.rbox(TM("clChairPack" + di, () => backpackTex("clChairPackT" + di, col)), 0.32, 0.36, 0.14, x, 0.6, sz + 0.28, 0, 0.12, 0);
      b.box(C("#2a2a30"), x - 0.1, 0.76, sz + 0.2, x - 0.08, 0.8, sz + 0.25, 0, false); b.box(C("#2a2a30"), x + 0.08, 0.76, sz + 0.2, x + 0.1, 0.8, sz + 0.25, 0, false);
    }
    {
      const [x, zc] = CL.desks[3], sz = zc + 0.18, kc = new THREE.Group();
      kc.position.set(o[0] + x + 0.12, o[1] + 0.62, o[2] + sz + 0.36);
      const str = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.006).translate(0, -0.035, 0), C("#c9a24a")); kc.add(str);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.045, 0.012).translate(0, -0.09, 0), C("#2e8ad8")); tag.castShadow = true; kc.add(tag);
      this.cl.add(kc); this.swingers.push({ g: kc, amp: 0.35, hz: 0.9, ph: 0 });
      const [x0, z0] = CL.desks[0], strap = new THREE.Group();
      strap.position.set(o[0] + x0 + 0.2, o[1] + 0.52, o[2] + z0 - 0.3 + 0.2);
      const sm2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.008).translate(0, -0.15, 0), C("#2e6fb0")); sm2.castShadow = true; strap.add(sm2);
      this.cl.add(strap); this.swingers.push({ g: strap, amp: 0.16, hz: 0.55, ph: 1.3 });
    }
    // ---- round 4 (A3 P2): the EAST (back) wall the punchline framing looks at (1484-1529: z 0.4 .. 3.5 in frame, the
    // thought bubble over z ~1.2 .. 2.5 / y ~1.0 .. 1.75 kept low-contrast): a ticking clock + green EXIT sign over the
    // door, the ironic HONESTY IS THE BEST POLICY poster upper left, a pastel times table under it, the solar system
    // poster + a corkboard of drawings by the window corner, pennant bunting along the top, a wall pencil sharpener
    {
      const E = W - 0.012, ry = -Math.PI / 2;
      b.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 28).rotateZ(Math.PI / 2), C("#c8402e"), W - 0.025, 2.68, 2.1);
      b.geo(new THREE.CircleGeometry(0.19, 40), TM("clClockFace", () => clockTex()), W - 0.052, 2.68, 2.1, ry, 0, 0, 1, false);
      const hand2 = (w: number, l: number, col: string) => { const g = new THREE.BoxGeometry(0.008, l, w); g.translate(0, l / 2 - 0.02, 0); const m = new THREE.Mesh(g, C(col)); m.position.set(o[0] + W - 0.06, o[1] + 2.68, o[2] + 2.1); m.receiveShadow = true; this.cl.add(m); return m; };
      this.hour2 = hand2(0.022, 0.1, "#2a2230"); this.min2 = hand2(0.016, 0.15, "#2a2230"); this.sec2 = hand2(0.006, 0.16, "#d8432f");
      b.box(C("#e9e4d8"), W - 0.045, 2.255, 1.88, W, 2.405, 2.32, 0, false);
      const ex = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.149), basic("clExit", () => ({ map: exitTex(), color: new THREE.Color(1.12, 1.16, 1.12) })));
      ex.position.set(o[0] + W - 0.047, o[1] + 2.33, o[2] + 2.1); ex.rotation.y = ry; ex.layers.set(NOINK); this.cl.add(ex);
      b.panel(TM("clHonesty", () => honestyTex()), 1.13, 0.85, E, 2.445, 0.985, ry);
      // (the corkboard of drawings sits under the HONESTY poster, left of the bubble; the right column keeps the solar
      // system poster over BARE wall, so the window light + its mullion bars read as a shape there)
      b.box(trim, W - 0.03, 1.24, 0.4, W, 1.86, 0.96); // left of the bubble's left lobe (z ~1.0 at 1510)
      b.panel(TM("clDrawings4", () => drawings4Tex()), 0.52, 0.58, W - 0.032, 1.55, 0.68, ry);
      b.panel(TM("clPlanets", () => planetsTex()), 0.6, 0.75, E, 2.475, 3.08, ry);
      // round 6 (A5 P3: the wall above the bookshelf was a ~35 % empty beige plane at the whip landing, video 1915-1936):
      // a framed OUR WORLD map, a cork board of class notices (PLEASE DO NOT COPY HOMEWORK: the film's irony), a STAR
      // STUDENTS chart with gold stars, two kids' drawings and a GO TEAM pennant that sways in the window draft
      b.panel(TM("clWorldMap6", () => worldMap6Tex()), 1.42, 0.8, E, 2.72, -2.12, ry);
      b.panel(TM("clCork6", () => corkNoticeTex()), 0.92, 0.563, E, 1.97, -2.2, ry);
      b.panel(TM("clKid6_0", () => kidDraw6Tex(0)), 0.36, 0.405, E - 0.002, 1.95, -1.48, ry, 0, 0.05);
      b.panel(TM("clStars6", () => starChartTex()), 0.8, 1.0, E, 2.5, -0.55, ry);
      b.panel(TM("clKid6_1", () => kidDraw6Tex(1)), 0.34, 0.38, E - 0.002, 1.62, -0.6, ry, 0, -0.06);
      { const pg6 = new THREE.Group(); pg6.position.set(o[0] + E - 0.006, o[1] + 2.92, o[2] + 0.17); pg6.rotation.y = ry;
        const pm6 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.64).translate(0, -0.32, 0), lam("int:clPennant6", () => ({ map: pennant6Tex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })));
        pm6.receiveShadow = true; pg6.add(pm6); this.cl.add(pg6); this.wallPennant = pg6;
        b.geo(new THREE.SphereGeometry(0.014, 8, 6), C("#d8432f"), E - 0.01, 2.92, 0.17, 0, 0, 0, 1, false); }
      // round 6 (A5 ADD: a spitball stuck on the ceiling tile): the classic gag over the board side of the room, in the
      // top band of the opening over-the-shoulder lens: three pencils stuck point-first in the ceiling tiles (hanging,
      // slightly crooked; one sways in the window draft, posed in Interiors.pose) and a scatter of dried spitballs
      { const yel = C("#f2c23a"), pink = C("#ec8c9c"), ferr = C("#c0c6ce"), spit = C("#ebe6da");
        const pencil = (x: number, z: number, dx: number, dz: number, L: number) => {
          const top: P3 = [x, H - 0.004, z], end: P3 = [x + dx, H - L, z + dz], fe: P3 = [x + dx * 1.08, H - L - 0.012, z + dz * 1.08], er: P3 = [x + dx * 1.2, H - L - 0.032, z + dz * 1.2];
          b.seg(C("#e8c89a"), [x, H + 0.01, z], top, 0.004, false, 6); b.seg(yel, top, end, 0.0085, false, 6); b.seg(ferr, end, fe, 0.009, false, 8); b.seg(pink, fe, er, 0.0088, false, 8);
        };
        pencil(-1.05, -2.55, 0.02, 0.012, 0.17); pencil(-1.62, -2.05, -0.03, 0.02, 0.16);
        for (const [x, z, s] of [[-1.3, -2.75, 1], [-0.85, -2.2, 0.8], [-1.45, -1.75, 1.1], [-0.6, -2.85, 0.9], [-1.9, -2.6, 0.85], [-0.95, -1.6, 1]] as number[][])
          b.geo(new THREE.SphereGeometry(0.02 * s, 8, 6), spit, x, H - 0.006, z, x * 3, 0, 0, [1.2, 0.45, 1], false); }
      { const sw6 = new THREE.Group(); sw6.position.set(o[0] - 1.35, o[1] + H - 0.004, o[2] - 2.35); this.cl.add(sw6); this.ceilPencil = sw6;
        const pb6 = new RB([0, 0, 0]);
        pb6.seg(C("#f2c23a"), [0, 0, 0], [0, -0.165, 0], 0.0085, false, 6); pb6.seg(C("#c0c6ce"), [0, -0.165, 0], [0, -0.178, 0], 0.009, false, 8); pb6.seg(C("#ec8c9c"), [0, -0.178, 0], [0, -0.2, 0], 0.0088, false, 8);
        pb6.done(sw6); }
      // wall pencil sharpener left of the door (grey: it is behind the bubble's lower edge)
      b.box(C("#9aa4b0"), W - 0.1, 1.0, 1.36, W, 1.1, 1.48); b.box(C("#7a8490"), W - 0.08, 0.97, 1.37, W - 0.02, 1.0, 1.47);
      b.geo(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), C("#2a2a30"), W - 0.07, 1.06, 1.53, 0, Math.PI / 2, 0, 1, false);
      // pennant bunting: two swags along the top, 15 pennants that flutter a little in the window draft
      const swag = (z: number) => { const [z0, z1] = z < 1.88 ? [0.3, 1.88] : [1.88, 3.45]; return 3.14 - 0.1 * Math.sin((Math.PI * (z - z0)) / (z1 - z0)); };
      const str = new THREE.CatmullRomCurve3(Array.from({ length: 33 }, (_, i) => { const z = 0.3 + (3.15 * i) / 32; return V(o[0] + W - 0.03, o[1] + swag(z), o[2] + z); }));
      const strM = new THREE.Mesh(new THREE.TubeGeometry(str, 64, 0.004, 4, false), C("#f2efe6")); this.cl.add(strM);
      const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.075, 0, 0, 0.075, 0, -0.18, 0], 3)); pg.computeVertexNormals();
      const PC = ["#e8584a", "#f2b632", "#4fa0e0", "#6cbf5a", "#9a6ad0"];
      for (let k = 0; k < 15; k++) {
        const z = 0.42 + k * 0.212, pm = new THREE.Mesh(pg, lam("int:clPennant" + (k % 5), () => ({ color: PC[k % 5], side: THREE.DoubleSide })));
        pm.position.set(o[0] + W - 0.032, o[1] + swag(z), o[2] + z); pm.castShadow = false; pm.receiveShadow = true; this.cl.add(pm); this.pennants.push(pm);
      }
    }
    // ---- round 4 (A3 P2: no light shape behind the student): the window corner throws a skewed warm pane patch on the
    // back wall's right column (mullion + transom bars cut out; additive #FFD9A0 ~17 %), dust motes drift in it, and the
    // upper wall corners darken ~15 % (a multiply wash in front of everything on that wall) so her face + the bubble are
    // the brightest shapes
    {
      const pc = new THREE.Color("#ffd9a0"), k = 0.42; // (0.17 only read with a contrast boost)
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.9), new THREE.MeshBasicMaterial({ map: sunPatchTex(), color: new THREE.Color(pc.r * k, pc.g * k, pc.b * k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(o[0] + W - 0.07, o[1] + 1.75, o[2] + 3.05); sp.rotation.y = -Math.PI / 2; sp.layers.set(NOINK); sp.renderOrder = 3; this.cl.add(sp);
      this.patchMotes = new Motes(this.cl, 14, 43, o, [W - 0.6, 0.95, 2.62], [W - 0.08, 2.55, 3.45], new THREE.Color(0.5, 0.38, 0.2), 0.026, 0.05);
      const dk = new THREE.Mesh(new THREE.PlaneGeometry(3.5, H), new THREE.ShaderMaterial({
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `varying vec2 vUv; void main(){
          float dl = length((vUv - vec2(0.0, 1.0)) * vec2(1.1, 1.0)), dr = length((vUv - vec2(1.0, 1.0)) * vec2(1.5, 1.0));
          float c = max(1.0 - smoothstep(0.0, 0.62, dl), 1.0 - smoothstep(0.0, 0.48, dr));
          float d = clamp(max(c, 0.45 * smoothstep(0.7, 1.0, vUv.y)), 0.0, 1.0);
          gl_FragColor = vec4(vec3(1.0 - 0.3 * d), 1.0); }`,
        transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor }));
      dk.position.set(o[0] + W - 0.085, o[1] + H / 2, o[2] + 1.75); dk.rotation.y = -Math.PI / 2; dk.layers.set(NOINK); dk.renderOrder = 2; this.cl.add(dk);
    }
    // ---- round 4 (A3 ADD): floor / desk clutter for the back of the room: a second waste bin by the window corner with
    // crumpled paper balls (two missed), a paper airplane on a back desk, a red tin lunchbox by a chair
    {
      b.geo(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 14, 1, true), lam("int:clBin2", () => ({ color: "#4e6a8a", side: THREE.DoubleSide })), 4.12, 0.17, 3.12);
      b.geo(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 14), C("#3a5068"), 4.12, 0.005, 3.12);
      for (const [x, y, z, r] of [[4.1, 0.33, 3.1, 0.065], [4.17, 0.31, 3.16, 0.055], [3.86, 0.05, 2.88, 0.055], [3.95, 0.05, 2.55, 0.06], [3.72, 0.045, 3.05, 0.05]] as number[][])
        b.geo(rockGeo(900 + x * 10 + z, r, 0.9), C("#f4f0e4"), x, y, z, x * 3, z * 2, 0);
      const pg2 = new THREE.BufferGeometry(); pg2.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.03, 0.16, -0.09, 0.0, -0.1, 0, 0.0, -0.1, 0, 0.03, 0.16, 0, 0.0, -0.1, 0.09, 0.0, -0.1, 0, 0.03, 0.16, 0, -0.03, -0.1, 0, 0.0, -0.1], 3)); pg2.computeVertexNormals();
      b.geo(pg2, lam("int:clPlane", () => ({ color: "#f6f4ec", side: THREE.DoubleSide })), CL.desks[5][0] - 0.12, 0.735, CL.desks[5][1] - 0.32, 2.2, 0.02, 0.05);
      b.rbox(C("#c8302a"), 0.26, 0.17, 0.1, CL.desks[5][0] + 0.42, 0.085, CL.desks[5][1] + 0.55, 0.5);
      b.rbox(C("#f2c23a"), 0.262, 0.03, 0.102, CL.desks[5][0] + 0.42, 0.12, CL.desks[5][1] + 0.55, 0.5);
      b.geo(new THREE.TorusGeometry(0.04, 0.008, 5, 12, Math.PI), C("#9aa4b0"), CL.desks[5][0] + 0.42, 0.17, CL.desks[5][1] + 0.55, 0.5);
    }
    b.done(this.cl);
    // dust motes drifting in the window shafts (warm, sparse)
    this.clMotes = new Motes(this.cl, 70, 11, o, [-4.0, 0.7, -1.8], [2.2, 2.6, 3.3], new THREE.Color(0.72, 0.56, 0.32), 0.03, 0.12);
    // round 8 (A7 ADD shot 12): dusty sunbeams. Three soft additive shafts (~11-13 %) slant in from the south panes along the
    // low key (KEY_CLASSROOM) across the desks to the board wall, turned about their own axis to face the lens and slowly
    // breathing; the pane nearest the honest student's seat is left out so no shaft crosses her face or her bubble
    { const d = V(-KEY_CLASSROOM[0], -KEY_CLASSROOM[1], -KEY_CLASSROOM[2]).normalize(), sg = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
      for (const [x, w, len, ph] of [[-3.35, 1.15, 6.4, 0], [-1.85, 1.0, 6.0, 2.1], [1.15, 1.1, 6.2, 4.0]] as number[][]) {
        const mat = new THREE.MeshBasicMaterial({ map: fxShaftTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
        const mesh = new THREE.Mesh(sg, mat); mesh.layers.set(NOINK); mesh.renderOrder = 4; mesh.frustumCulled = false; this.cl.add(mesh);
        this.clShafts.push({ mesh, mat, p0: V(o[0] + x, o[1] + 1.95, o[2] + D - 0.08), d, w, len, ph });
      } }
    // round 3: the ceiling darkens ~15 % toward the walls and corners (a soft dark warm gradient just under it)
    const cd = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 2 * D).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: ctex("clCeilDark", 256, 200, (g) => {
      const gr = g.createRadialGradient(128, 100, 30, 128, 100, 160); gr.addColorStop(0, "rgba(40,24,16,0)"); gr.addColorStop(0.55, "rgba(40,24,16,0.08)"); gr.addColorStop(1, "rgba(40,24,16,0.3)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 200);
    }), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    cd.position.set(o[0], o[1] + H - 0.004, o[2]); cd.layers.set(NOINK); cd.renderOrder = 1; this.cl.add(cd);
    // soft light shafts from the window panes along the key (additive, never cast)
    const key = new THREE.Vector3(...KEY_CLASSROOM).normalize(), travel = key.clone().negate();
    const beam = new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(0.108, 0.08, 0.042), transparent: true, depthWrite: false, /* round 3: haze -30 % */ blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < WIN.n; i++) {
      const x0 = WIN.x0 + i * pw + 0.08, x1 = x0 + pw - 0.16, Lb = 6.0, yc = (WIN.y0 + 2.62) / 2, xc = (x0 + x1) / 2;
      for (const [p0, p1] of [[V(xc, 2.55, D), V(xc, WIN.y0 + 0.05, D)], [V(x0, yc, D), V(x1, yc, D)]] as [THREE.Vector3, THREE.Vector3][]) {
        p0.add(V(...o)); p1.add(V(...o));
        const g = new THREE.BufferGeometry(), e0 = p0.clone().addScaledVector(travel, Lb), e1 = p1.clone().addScaledVector(travel, Lb);
        g.setAttribute("position", new THREE.Float32BufferAttribute([p0, p1, e1, p0, e1, e0].flatMap((v) => [v.x, v.y, v.z]), 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], 2));
        const m = new THREE.Mesh(g, beam); m.layers.set(NOINK); m.renderOrder = 3; this.cl.add(m);
      }
    }
  }

  // ================================================================================================ STOREROOM
  private buildStoreroom() {
    const o = SR.base, b = new RB(o), W = SR.room.w / 2, D = SR.room.d / 2, H = SR.room.h, WT = 0.2;
    const floor = TM("srFloor", () => boardsTex("srFloorT", ["#7c5638", "#6e4a30", "#84603e", "#734d33"], "#3a2416", 10));
    const pine = TM("srPine", () => vboardsTex("srPineT", ["#b88e5a", "#ad8450", "#c29862", "#a67c4a"], "#5a3a22", 8, 1024, 1024, 2));
    const beam = C("#6a4428"), shelfM = C("#7a8494"), wood = C("#8a5a36"), steel = C("#a9b2be"), brass = C("#c9a24a");
    // shell: walls / floor / ceiling never cast (the key is the lamp INSIDE the room)
    b.box(floor, -W - WT, -0.12, -D - WT, W + WT, 0, D + WT, 2, false);
    b.box(pine, -W - WT, H, -D - WT, W + WT, H + 0.2, D + WT, 2, false, true);
    const WIN = { x0: -1.85, x1: -0.75, y0: 1.3, y1: 2.35 };
    b.box(pine, -W - WT, 0, -D - WT, WIN.x0, H, -D, 2, false); b.box(pine, WIN.x1, 0, -D - WT, W + WT, H, -D, 2, false);
    b.box(pine, WIN.x0, 0, -D - WT, WIN.x1, WIN.y0, -D, 2, false); b.box(pine, WIN.x0, WIN.y1, -D - WT, WIN.x1, H, -D, 2, false);
    b.box(pine, -W - WT, 0, D, W + WT, H, D + WT, 2, false);
    b.box(pine, -W - WT, 0, -D, -W, H, D, 2, false); b.box(pine, W, 0, -D, W + WT, H, D, 2, false);
    for (let k = 0; k < 4; k++) b.box(beam, -W, H - 0.22, -D + 0.5 + k * 1.5, W, H, -D + 0.68 + k * 1.5, 0, false, true);   // ceiling beams
    for (const [x0, z0, x1, z1] of [[-W, -D, W, -D + 0.03], [-W, D - 0.03, W, D], [-W, -D, -W + 0.03, D], [W - 0.03, -D, W, D]] as [number, number, number, number][]) b.box(beam, x0, 0, z0, x1, 0.1, z1, 0, false);
    // floor darkening away from the lamp pool (the near foreground reads ~15 % darker, so the pool reads as a pool)
    const fd = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 2 * D).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ctex("srFloorDark", 256, 200, (g) => {
      const px = ((SR.crate[0] + 0.4 + W) / (2 * W)) * 256, py = ((SR.crate[2] + 0.2 + D) / (2 * D)) * 200;
      const gr = g.createRadialGradient(px, py, 18, px, py, 230); gr.addColorStop(0, "rgba(6,10,32,0)"); gr.addColorStop(0.28, "rgba(6,10,32,0.14)"); gr.addColorStop(0.6, "rgba(6,10,32,0.3)"); gr.addColorStop(1, "rgba(6,10,32,0.5)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 200);
    }), transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    fd.position.set(o[0], o[1] + 0.004, o[2]); fd.layers.set(NOINK); fd.renderOrder = 1; this.sr.add(fd);
    // night window: frame, cross mullion, sill, the night outside (self-lit), moon + halo, a cactus pot on the sill
    const frame = C("#e9e1cf");
    b.box(frame, WIN.x0 - 0.06, WIN.y0 - 0.08, -D - 0.02, WIN.x1 + 0.06, WIN.y0, -D + 0.12, 0, false);
    b.box(frame, WIN.x0 - 0.06, WIN.y1, -D - 0.02, WIN.x1 + 0.06, WIN.y1 + 0.06, -D + 0.04, 0, false);
    b.box(frame, WIN.x0 - 0.06, WIN.y0, -D - 0.02, WIN.x0, WIN.y1, -D + 0.04, 0, false); b.box(frame, WIN.x1, WIN.y0, -D - 0.02, WIN.x1 + 0.06, WIN.y1, -D + 0.04, 0, false);
    b.box(frame, (WIN.x0 + WIN.x1) / 2 - 0.025, WIN.y0, -D - 0.06, (WIN.x0 + WIN.x1) / 2 + 0.025, WIN.y1, -D - 0.01, 0, false);
    b.box(frame, WIN.x0, (WIN.y0 + WIN.y1) / 2 - 0.025, -D - 0.06, WIN.x1, (WIN.y0 + WIN.y1) / 2 + 0.025, -D - 0.01, 0, false);
    b.geo(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 12), C("#c8643a"), WIN.x0 + 0.18, WIN.y0 + 0.045, -D + 0.07, 0, 0, 0, 1, false);
    b.geo(new THREE.CapsuleGeometry(0.03, 0.1, 3, 8), C("#4f7a4a"), WIN.x0 + 0.18, WIN.y0 + 0.16, -D + 0.07, 0, 0, 0, 1, false);
    b.geo(new THREE.CapsuleGeometry(0.016, 0.05, 3, 6), C("#4f7a4a"), WIN.x0 + 0.22, WIN.y0 + 0.17, -D + 0.07, 0, 0, -0.7, 1, false);
    // round 3 (A2: slate glass, no moon, no stars): the night backdrop sits 0.9 m behind the wall (seen through the panes
    // from the shot-14 lenses: x -2.5 .. -1.2), the moon ~60 px wide (0.2 m at ~6.6 m) placed where those lenses see it
    // through the upper-left pane (projected at f1690 / 1715 / 1745), a soft halo, 8 bright + 18 faint stars
    const night = basic("srNight3", () => ({ map: nightTex(), color: new THREE.Color(1.05, 1.05, 1.1), fog: false }));
    b.flat.add(new THREE.PlaneGeometry(2.6, 2.2), night, b.m(-1.85, 1.9, -D - 0.92));
    const moon = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: moonTex(), color: glow("#fffbe8", 2.2), transparent: true, depthWrite: false, fog: false }));
    moon.position.set(o[0] - 1.95, o[1] + 2.15, o[2] - D - 0.7); moon.layers.set(NOINK); moon.renderOrder = 1; this.sr.add(moon);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.22, 0.3, 0.62), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.position.copy(moon.position).add(V(0, 0, 0.02)); halo.layers.set(NOINK); halo.renderOrder = 2; this.sr.add(halo);
    // round 4 (A3 ADD): a slow night cloud drifts across the moon (crosses it ~1725, when the MS lenses see the moon)
    this.nightCloud = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: nightCloudTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1) }));
    this.nightCloud.position.set(o[0] - 1.95, o[1] + 2.16, o[2] - D - 0.62); this.nightCloud.layers.set(NOINK); this.nightCloud.renderOrder = 3; this.sr.add(this.nightCloud);
    const sg = new THREE.BufferGeometry(), sp: number[] = [], sz: number[] = [];
    for (let i = 0; i < 26; i++) { sp.push(o[0] - 2.7 + hash(i * 3.1) * 1.9, o[1] + 1.75 + hash(i * 5.7) * 1.0, o[2] - D - 0.86); sz.push(i < 8 ? 1 : 0.45); }
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ map: starTex(), color: glow("#e6eeff", 1.9), size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.stars.layers.set(NOINK); this.stars.frustumCulled = false; this.stars.renderOrder = 1; this.sr.add(this.stars);
    void sz;
    const glass = basic("srGlass", () => ({ color: new THREE.Color(0.5, 0.6, 0.9), transparent: true, opacity: 0.07, depthWrite: false }));
    b.flat.add(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), glass, b.m((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, -D - 0.03));
    // moonlight patch on the floor (additive, soft): the window pane grid thrown toward +z
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ctex("srMoonPatch", 256, 320, (g) => {
      const gr = g.createRadialGradient(128, 160, 20, 128, 160, 170); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 320); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.fillRect(118, 0, 20, 320); g.fillRect(0, 150, 256, 20);
    }), color: new THREE.Color(0.11, 0.15, 0.34), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    // round 5: the patch sits where the new moon shaft (MOON below) lands, in front of the crate's left end
    mp.position.set(o[0] + MOON.end[0] - 0.05, o[1] + 0.006, o[2] + MOON.end[2] - 0.25); mp.rotation.y = -Math.atan2(MOON.dir[0], MOON.dir[2]); mp.scale.set(1.05, 1, 1.1); mp.layers.set(NOINK); this.sr.add(mp);
    // round 5 (A4 P2: the old 'moon beam' was the lamp cone's hard polygon edge across the back wall): a SOFT moonlight
    // shaft from the window down to the floor in front of the crate (#A9B8FF at ~16 % additive, feathered edges, turned
    // about its own axis to face the lens every frame so it never shows a polygon edge) with slow dust motes inside
    { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ map: moonShaftTex(), color: new THREE.Color(0.45, 0.55, 1.0).multiplyScalar(0.4),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      sh.layers.set(NOINK); sh.renderOrder = 4; sh.frustumCulled = false; this.sr.add(sh); this.moonShaft = sh;
      const d = V(...MOON.dir), up = V(0, 1, 0), s0 = new THREE.Vector3().crossVectors(d, up).normalize(), u0 = new THREE.Vector3().crossVectors(s0, d).normalize();
      this.moonAxes = { d, s0, u0 };
      const n = 56, pos = new Float32Array(n * 3); this.moonMoteBase = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { this.moonMoteBase[i * 3] = hash(i * 2.3 + 0.7); this.moonMoteBase[i * 3 + 1] = (hash(i * 4.1 + 1.3) - 0.5) * 0.8; this.moonMoteBase[i * 3 + 2] = (hash(i * 6.7 + 2.9) - 0.5) * 0.8; }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.moonMotes = new THREE.Points(g2, new THREE.PointsMaterial({ map: softDot(), color: new THREE.Color(0.55, 0.66, 1.3), size: 0.022, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      this.moonMotes.frustumCulled = false; this.moonMotes.layers.set(NOINK); this.moonMotes.renderOrder = 5; this.sr.add(this.moonMotes); }
    // ---- north wall: trail map, clock (11:40) above the desk, corkboard of apology letters, old photo, the mail slot ----
    b.panel(TM("srTrailMap", () => trailMapTex()), 0.96, 0.7, -2.85, 1.72, -D + 0.012);
    const ck = [0.25, 2.5] as const; // round 4 (A3 ADD): in frame in every shot-14 lens from 1670 on (was over the desk, off-frame)
    b.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 28).rotateX(Math.PI / 2), C("#2f4a6a"), ck[0], ck[1], -D + 0.024, 0, 0, 0, 1, false);
    b.geo(new THREE.CircleGeometry(0.155, 40), TM("srClockFace", () => clockTex()), ck[0], ck[1], -D + 0.048, 0, 0, 0, 1, false);
    const hand = (w: number, l: number, ang: number, col: string) => { const g = new THREE.BoxGeometry(w, l, 0.006); g.translate(0, l / 2 - 0.015, 0); b.geo(g, C(col), ck[0], ck[1], -D + 0.054, 0, 0, -ang, 1, false); };
    hand(0.018, 0.085, ((11 + 40 / 60) / 12) * TAU, "#2a2230"); hand(0.012, 0.125, (40 / 60) * TAU, "#2a2230");
    this.srSec = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.13, 0.004).translate(0, 0.05, 0), C("#d8432f")); this.srSec.position.set(o[0] + ck[0], o[1] + ck[1], o[2] - D + 0.058); this.sr.add(this.srSec);
    const kx = 0.9;
    b.box(beam, kx - 0.64, 1.2, -D, kx + 0.64, 2.12, -D + 0.025, 0, false);
    b.panel(TM("srCork2", () => corkTex2()), 1.2, 0.89, kx, 1.66, -D + 0.028);
    b.box(beam, kx - 0.45, 2.24, -D, kx + 0.45, 2.66, -D + 0.02, 0, false);
    b.panel(TM("srPhoto", () => photoTex()), 0.86, 0.39, kx, 2.45, -D + 0.022);
    // the brass MAIL slot and its galvanized chute down to the pile (things posted to the park land in the heap)
    const [mx, my] = MAIL.slot;
    b.box(brass, mx - 0.2, my - 0.08, -D, mx + 0.2, my + 0.08, -D + 0.02, 0, false);
    b.box(C("#1a1410"), mx - 0.16, my - 0.035, -D + 0.005, mx + 0.16, my + 0.035, -D + 0.021, 0, false);
    // round 3 (A2: the chute read as a floating trough): a big RETURNS sign over the slot (caps ~0.11 m = 40+ px at
    // 1080 from the MS lenses; unlit, lamp-warm), and a steel collar that visibly joins the wall slot to the chute
    { const rs = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), basic("srReturns", () => ({ map: returnsTex(), transparent: true, color: new THREE.Color(1.0, 0.9, 0.74) })));
      rs.position.set(o[0] + mx, o[1] + my + 0.2, o[2] - D + 0.014); rs.layers.set(NOINK); this.sr.add(rs); }
    const collar = C("#b4bcc6");
    b.box(collar, mx - 0.2, my - 0.11, -D, mx + 0.2, my - 0.085, -D + 0.17, 0, false);
    for (const sx of [-1, 1]) b.box(collar, mx + sx * 0.2 - 0.012, my - 0.11, -D, mx + sx * 0.2 + 0.012, my + 0.09, -D + 0.15, 0, false);
    b.box(collar, mx - 0.212, my + 0.075, -D, mx + 0.212, my + 0.095, -D + 0.12, 0, false);
    for (const sx of [-1, 1]) b.seg(C("#5a626e"), [mx + sx * 0.15, my - 0.1, -D + 0.01], [mx + sx * 0.15, my - 0.24, -D + 0.16], 0.008, false, 4);
    this.flap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.008).translate(0, -0.04, 0.004), TM("srFlap", () => brassTex("srFlapT", "MAIL", 384, 96)));
    this.flap.position.set(o[0] + mx, o[1] + my + 0.04, o[2] - D + 0.022); this.flap.castShadow = this.flap.receiveShadow = true; this.sr.add(this.flap);
    // round 8 (A7 P3: the chute insert was one blue note, no warm practical in frame): a little brass plug-in night-light
    // right of the slot collar, an amber dome that blooms (#FFB860), a soft warm glow over the slot's brass and a warm
    // pool (shade.ts POOL 14) that catches the collar, the chute lip and the envelopes on its tray
    { const nx = NIGHT_LIGHT[0], ny = NIGHT_LIGHT[1], nz = -D;
      b.box(brass, nx - 0.04, ny - 0.06, nz, nx + 0.04, ny + 0.06, nz + 0.018, 0, false);
      b.geo(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 5).rotateX(Math.PI / 2), C("#2a2a30"), nx, ny - 0.035, nz + 0.02, 0, 0, 0, 1, false);
      const dome = new THREE.MeshBasicMaterial({ color: glow("#ffb860", 2.2) });
      const dm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2), dome); dm.scale.set(1, 1.25, 0.9);
      dm.position.set(o[0] + nx, o[1] + ny + 0.01, o[2] + nz + 0.018); dm.layers.set(NOINK); this.sr.add(dm);
      const ng = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.55, 0.3, 0.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      ng.scale.setScalar(0.78); ng.position.set(o[0] + nx - 0.12, o[1] + ny + 0.04, o[2] + nz + 0.07); // round 8: a warm wash over the collar + chute lip ng.layers.set(NOINK); ng.renderOrder = 5; this.sr.add(ng);
      this.nightLight = { glow: ng, dome, p: dm.position.clone() }; }
    {
      const S0 = V(...MAIL.s0), S1 = V(...MAIL.s1), u = S1.clone().sub(S0), L = u.length(); u.normalize();
      const x = new THREE.Vector3().crossVectors(V(0, 1, 0), u).normalize(), y = new THREE.Vector3().crossVectors(u, x).normalize();
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, u)), mid = S0.clone().add(S1).multiplyScalar(0.5);
      b.ori(new THREE.BoxGeometry(0.34, 0.012, L), steel, mid, q);
      for (const s of [-1, 1]) b.ori(new THREE.BoxGeometry(0.012, 0.09, L), steel, mid.clone().addScaledVector(x, s * 0.17).addScaledVector(y, 0.045), q);
      b.ori(new THREE.BoxGeometry(0.36, 0.1, 0.012), C("#6e7886"), S1.clone().addScaledVector(y, 0.045).addScaledVector(u, -0.006), q);
      // round 5 (A4 P3: four full-height hanger wires cut through the RETURNS sign and the window): the chute now rests on
      // two short diagonal struts under its lower end, braced back to a wall plate below the slot (hidden by the pile)
      { const p = S0.clone().lerp(S1, 0.7), plateY = 1.0, strut = C("#3a4250");
        b.box(C("#5a626e"), mx - 0.22, plateY - 0.03, -D, mx + 0.22, plateY + 0.03, -D + 0.015, 0, false);
        for (const s of [-1, 1]) b.seg(strut, [p.x + s * 0.15 * x.x, p.y - 0.012, p.z + s * 0.15 * x.z], [mx + s * 0.18, plateY, -D + 0.012], 0.007, false, 5); }
      this.chute = { S0, S1, u, x, y, q };
      // round 4 (A3 ADD): opened envelopes piled on the chute tray, one hanging over the lip
      for (const [k, du, dx, rot] of [[0, 0.62, -0.07, 0.3], [1, 0.76, 0.06, -0.5], [2, 0.88, -0.03, 0.9], [0, 1.0, 0.05, 1.3]] as number[][]) {
        const c = S0.clone().lerp(S1, du).addScaledVector(x, dx).addScaledVector(y, 0.009 + 0.004 * k), q2 = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(du >= 1 ? 0.35 : 0, Math.PI / 2 + rot, 0)));
        b.ori(new THREE.BoxGeometry(0.24, 0.005, 0.13), TM("srEnv" + k, () => envelopeTex("srEnvT" + k, k % 2 === 0, ["#d8432f", "#2e8a5a", "#e0a630"][k % 3])), c, q2, false);
      }
    }
    // a spare ranger hat hanging on a peg between the window and the RETURNS sign
    b.geo(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6).rotateX(Math.PI / 2), C("#9aa4b0"), -0.42, 2.2, -D + 0.04, 0, 0, 0, 1, false);
    // round 4 (A3 ADD: it read as a round disc / clock face-on): hung by the brim at an angle, crown turned to the
    // lens' left, with the four-dent ranger peak and a dark band (no patch)
    // round 5 (A4 P3: it read as an unfilled lavender outline): felt tan #9C7A45 with an emissive floor so it stays
    // FILLED in the blue night, a soft contact shadow on the pine behind it, and it swings on its peg when the parcel
    // lands (BEAT.mailed + 3) plus a faint idle sway (pivot = the peg)
    { const peg = new THREE.Group(), hg = new THREE.Group(), hatM = lam("int:srHatFelt5", () => ({ color: "#9c7a45", emissive: new THREE.Color("#6a4c26"), emissiveIntensity: 0.55 })), bandM = lam("int:srHatBand5", () => ({ color: "#5a4026", emissive: new THREE.Color("#2e1e10"), emissiveIntensity: 0.5 }));
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 28), hatM);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.097, 0.075, 16), hatM); crown.position.y = 0.042;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.093, 0.07, 4), hatM); peak.position.y = 0.114; peak.rotation.y = Math.PI / 4;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.099, 0.099, 0.024, 16), bandM); band.position.y = 0.018;
      for (const m of [brim, crown, peak, band]) { m.castShadow = true; m.receiveShadow = true; hg.add(m); }
      peg.position.set(o[0] - 0.42, o[1] + 2.2, o[2] - D + 0.06);
      hg.position.set(0, -0.19, 0.08); hg.quaternion.setFromUnitVectors(V(0, 1, 0), V(-0.55, -0.32, 0.77).normalize());
      peg.add(hg); this.sr.add(peg); this.hatPeg = peg;
      const hs = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color("#0a0c22"), transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      hs.position.set(o[0] - 0.48, o[1] + 1.98, o[2] - D + 0.014); hs.layers.set(NOINK); hs.renderOrder = 1; this.sr.add(hs); this.hatShadow = hs; }
    // the month calendar, right of the slot
    b.panel(TM("srCalendar", () => calendarTex()), 0.36, 0.48, 1.88, 1.95, -D + 0.012);
    // round 6 (A5 ADD): a tear-off LETTERS THIS YEAR counter over the RETURNS sign (in every shot-14 lens from the reveal
    // on): its top sheet 1,201 peels and flutters down on "mailed", leaving 1,202 (unlit, lamp-warm so it reads)
    { const cx2 = 0.02, cy2 = 2.04, w = 0.42, h = 0.2625;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic("srCounter6", () => ({ map: counterTex(), color: new THREE.Color(0.95, 0.84, 0.68) })));
      pl.position.set(o[0] + cx2, o[1] + cy2, o[2] - D + 0.016); pl.layers.set(NOINK); this.sr.add(pl);
      b.box(beam, cx2 - w / 2 - 0.015, cy2 - h / 2 - 0.015, -D, cx2 + w / 2 + 0.015, cy2 + h / 2 + 0.015, -D + 0.012, 0, false);
      // the top sheet: hinged at its top edge (pivot), the pad window is x 56-456 / y 92-288 of the 512 x 320 plaque
      const sw = (400 / 512) * w, sh = (196 / 320) * h, piv = new THREE.Group();
      piv.position.set(o[0] + cx2, o[1] + cy2 + h / 2 - (92 / 320) * h, o[2] - D + 0.019); this.sr.add(piv);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh).translate(0, -sh / 2, 0), basic("srSheet6", () => ({ map: sheetTex(), side: THREE.DoubleSide, color: new THREE.Color(0.97, 0.88, 0.74) })));
      sheet.layers.set(NOINK); piv.add(sheet); this.tearSheet = { piv, sheet, base: piv.position.clone() }; }
    // round 6 (A5 ADD): a ginger cat asleep on the moonlit window sill (right half, in frame from the reveal to the
    // apology); one eye snaps open on the parcel thump (BEAT.mailed + 3), it looks for 12 f, closes again ~video 2290
    { const cat = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25).translate(0, 0.125, 0), basic("srCat6", () => ({ map: catTex(0), transparent: true, alphaTest: 0.4, depthWrite: true, color: new THREE.Color(0.86, 0.8, 0.86) })));
      cat.position.set(o[0] + (WIN.x0 + WIN.x1) / 2 + 0.2, o[1] + WIN.y0 - 0.005, o[2] - D + 0.07); cat.layers.set(NOINK); this.sr.add(cat); this.cat = cat;
      const cs = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color("#0a0c22"), transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
      cs.position.set(cat.position.x, cat.position.y + 0.004, cat.position.z); cs.layers.set(NOINK); cs.renderOrder = 1; this.sr.add(cs); }
    // ---- west wall (screen left): 3-tier steel shelf of returned boxes, ranger hat + binoculars on pegs, tear-off calendar ----
    const westShelf = (z0: number, labels: string[]) => {
      const x0 = -W + 0.03, x1 = x0 + 0.42, z1 = z0 + 1.15;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.box(shelfM, x - 0.02, 0, z - 0.02, x + 0.02, 1.62, z + 0.02);
      for (let k = 0; k < 3; k++) b.box(shelfM, x0, 0.25 + k * 0.6, z0, x1, 0.275 + k * 0.6, z1);
      labels.forEach((L, i) => {
        const k = Math.floor(i / 2), j = i % 2, z = z0 + 0.3 + j * 0.55, y = 0.275 + k * 0.6 + 0.17;
        b.rbox(TM("srBox" + L, () => labelBoxTex("srBoxT" + L, L, ["#c9a26a", "#b9925a", "#d2ab72"][i % 3])), 0.36, 0.34, 0.48, x0 + 0.2, y, z, Math.PI / 2 + (hash(i * 2.2) - 0.5) * 0.12);
      });
      b.geo(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 10), C("#c8402e"), x0 + 0.2, 1.62 + 0.11, z0 + 0.25);
      b.geo(new THREE.TorusGeometry(0.12, 0.035, 6, 14), C("#c9a86a"), x0 + 0.2, 1.62 + 0.05, z0 + 0.8, 0, Math.PI / 2);
    };
    westShelf(-0.35, ["RETURNED 1987", "RETURNED 2003", "LETTERS A-M", "LETTERS N-Z", "ROCKS - SORTED", "RETURNED 2015"]);
    const hat = C("#9c7a45");
    for (const z of [1.05, 1.4]) b.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6).rotateZ(Math.PI / 2), C("#9aa4b0"), -W + 0.05, 1.62, z, 0, 0, 0, 1, false);
    b.geo(new THREE.CylinderGeometry(0.22, 0.22, 0.014, 24), hat, -W + 0.12, 1.55, 1.05, 0, 0, -1.35);
    b.geo(new THREE.CylinderGeometry(0.085, 0.1, 0.12, 16), hat, -W + 0.16, 1.56, 1.05, 0, 0, -1.35);
    b.geo(new THREE.CylinderGeometry(0.102, 0.102, 0.03, 16), C("#5a4026"), -W + 0.145, 1.555, 1.05, 0, 0, -1.35);
    for (const dz of [-0.04, 0.04]) b.geo(new THREE.CylinderGeometry(0.03, 0.035, 0.12, 10), C("#2e3440"), -W + 0.08, 1.5, 1.4 + dz);
    b.geo(new THREE.TorusGeometry(0.06, 0.006, 4, 12, Math.PI), C("#2e3440"), -W + 0.08, 1.59, 1.4, Math.PI / 2, 0, Math.PI);
    b.panel(TM("srTearCal", () => tearCalTex()), 0.26, 0.32, -W + 0.012, 1.62, -1.55, Math.PI / 2);
    b.panel(TM("srStaffW", () => staffTex()), 0.42, 0.175, -W + 0.012, 2.2, 0.2, Math.PI / 2);
    // ---- metal shelving with labelled boxes (north-east corner + east wall) ----
    const shelves = (x0: number, z0: number, ry: number, labels: string[]) => {
      const m = (lx: number, ly: number, lz: number) => { const c = Math.cos(ry), s = Math.sin(ry); return [x0 + lx * c + lz * s, ly, z0 - lx * s + lz * c] as P3; };
      for (const [lx, lz] of [[0, 0], [1.1, 0], [0, 0.42], [1.1, 0.42]]) { const p = m(lx, 0, lz); b.box(shelfM, p[0] - 0.02, 0, p[2] - 0.02, p[0] + 0.02, 2.1, p[2] + 0.02); }
      for (let k = 0; k < 4; k++) { const p = m(0.55, 0.3 + k * 0.55, 0.21); b.rbox(shelfM, 1.12, 0.025, 0.44, p[0], p[1], p[2], ry); }
      labels.forEach((L, i) => {
        const k = Math.floor(i / 2), j = i % 2, p = m(0.28 + j * 0.54, 0.3 + k * 0.55 + 0.17, 0.2);
        b.rbox(TM("srBox" + L, () => labelBoxTex("srBoxT" + L, L, ["#c9a26a", "#b9925a", "#d2ab72"][i % 3])), 0.46, 0.32, 0.36, p[0], p[1], p[2], ry + (hash(i) - 0.5) * 0.1);
      });
      const top = m(0.55, 1.95, 0.21); b.geo(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 10), C("#c8402e"), top[0] - 0.3, top[1] + 0.12, top[2]);
      b.geo(new THREE.TorusGeometry(0.13, 0.04, 6, 14), C("#c9a86a"), top[0] + 0.2, top[1] + 0.05, top[2], 0, Math.PI / 2);
    };
    shelves(2.2, -D + 0.05, 0, ["RETURNS 1970s", "FIRST AID", "RETURNS 2000s", "BATTERIES", "LOST & FOUND", "ROPE"]);
    shelves(W - 0.05, -0.9, -Math.PI / 2, ["RAIN PONCHOS", "FLASHLIGHTS", "BROCHURES", "TAGS"]);
    // spare "STAY ON TRAIL" sign leaning on the east wall + a broom
    b.rbox(C("#5a3a22"), 0.7, 0.45, 0.03, W - 0.2, 0.42, 1.2, -Math.PI / 2, 0, -0.18);
    b.panel(TM("srStay", () => ctex("srStayT", 512, 320, (g) => { g.fillStyle = "#6b4426"; g.fillRect(0, 0, 512, 320); centerText(g, "STAY ON", 256, 110, 460, 110, "#f1e2c0", "Georgia, serif"); centerText(g, "TRAIL", 256, 230, 460, 110, "#f1e2c0", "Georgia, serif"); })), 0.64, 0.4, W - 0.222, 0.42, 1.2, -Math.PI / 2, 0, -0.18);
    b.geo(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6), C("#c9a86a"), W - 0.25, 0.7, 2.1, 0, 0, 0.14);
    b.geo(new THREE.ConeGeometry(0.12, 0.25, 8), C("#d9b04a"), W - 0.17, 0.12, 2.1, 0, 0, 0.14 + Math.PI);
    // ---- south wall (behind the lens): the door with a STAFF ONLY sign, coat hooks with a ranger jacket, extinguisher ----
    b.box(C("#7a4e2e"), -0.9, 0, D - 0.06, 0.1, 2.1, D - 0.01, 0, false);
    b.box(C("#5a3a22"), -0.98, 0, D - 0.07, -0.9, 2.18, D - 0.01, 0, false); b.box(C("#5a3a22"), 0.1, 0, D - 0.07, 0.18, 2.18, D - 0.01, 0, false); b.box(C("#5a3a22"), -0.98, 2.1, D - 0.07, 0.18, 2.18, D - 0.01, 0, false);
    b.geo(new THREE.SphereGeometry(0.035, 10, 8), brass, -0.05, 1.02, D - 0.09);
    b.panel(TM("srStaff", () => staffTex()), 0.46, 0.19, -0.4, 1.55, D - 0.065, Math.PI);
    for (let k = 0; k < 4; k++) b.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6).rotateX(Math.PI / 2), C("#9aa4b0"), 0.7 + k * 0.32, 1.7, D - 0.05, 0, 0, 0, 1, false);
    b.rbox(C("#4e7a4a"), 0.42, 0.62, 0.1, 0.7, 1.36, D - 0.1, 0, 0, 0.03); b.rbox(C("#3e6a3e"), 0.12, 0.5, 0.11, 0.7, 1.4, D - 0.1, 0, 0, 0.03);
    b.rbox(C("#d9c08a"), 0.36, 0.3, 0.12, 1.34, 1.52, D - 0.1, 0, 0, -0.05);
    b.geo(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 12), C("#c8302a"), 2.6, 0.32, D - 0.12); b.geo(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 8), C("#2a2a30"), 2.6, 0.56, D - 0.12);
    for (let k = 0; k < 3; k++) b.rbox(TM("srParcelS" + k, () => parcelTex2("srParcelST" + k, k ? "RETURNED" : "RETURN TO PARK")), 0.5 - k * 0.08, 0.32 - k * 0.04, 0.4 - k * 0.05, -2.4 + (k % 2) * 0.06, 0.16 + k * 0.29, D - 0.35, 0.2 * (hash(k * 5) - 0.5));
    // ---- the desk: swing-arm lamp aimed at the pile, mug, ledger, stamp, envelopes, postal scale, tally, open envelope ----
    const [dx, , dz] = SR.desk;
    b.box(TM("srDeskTop", () => boardsTex("srDeskTopT", ["#8e5c36", "#845432", "#966240"], "#4a2c1a", 5, 512)), dx - 0.68, 0.74, dz - 0.38, dx + 0.68, 0.78, dz + 0.38, 1, false);
    b.box(wood, dx - 0.66, 0, dz - 0.36, dx - 0.26, 0.74, dz + 0.36, 0, false); b.box(wood, dx + 0.5, 0, dz - 0.36, dx + 0.66, 0.74, dz + 0.36, 0, false);
    for (const yy of [0.2, 0.45]) b.box(C("#d9b04a"), dx - 0.5, yy, dz + 0.36, dx - 0.42, yy + 0.02, dz + 0.38, 0, false);
    const [lx, ly, lz] = SR.lamp, lampM = C("#2f6a52"), arm = C("#3a3a40");
    const elbow: P3 = [lx + 0.25, ly + 0.95, lz + 0.05], head = V(...LAMP_HEAD), aim = V(...LAMP_AIM).sub(head).normalize();
    b.geo(new THREE.CylinderGeometry(0.09, 0.11, 0.035, 18), lampM, lx, ly + 0.018, lz, 0, 0, 0, 1, false);
    b.seg(arm, [lx, ly + 0.03, lz], elbow, 0.012, false); b.seg(arm, [lx + 0.03, ly + 0.03, lz], [elbow[0] + 0.03, elbow[1], elbow[2]], 0.006, false);
    b.seg(arm, elbow, [head.x - aim.x * 0.06, head.y + 0.05, head.z - aim.z * 0.06], 0.011, false); b.geo(new THREE.SphereGeometry(0.022, 8, 6), arm, ...elbow, 0, 0, 0, 1, false);
    const headQ = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), aim);
    const shadeGeo = new THREE.ConeGeometry(0.13, 0.17, 18, 1, true); shadeGeo.translate(0, 0.02, 0);
    const shadeMesh = new THREE.Mesh(shadeGeo, lam("int:lampShade", () => ({ color: "#2f6a52", side: THREE.DoubleSide })));
    shadeMesh.position.set(o[0] + head.x, o[1] + head.y, o[2] + head.z); shadeMesh.quaternion.copy(headQ); shadeMesh.receiveShadow = true; this.sr.add(shadeMesh);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), new THREE.MeshBasicMaterial({ color: glow("#ffd08a", 5.5) }));
    bulb.position.copy(shadeMesh.position).addScaledVector(aim, 0.05); this.sr.add(bulb); this.bulbPos = bulb.position.clone();
    const bh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.9, 0.55, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    bh.position.copy(bulb.position); bh.layers.set(NOINK); bh.renderOrder = 4; this.sr.add(bh); this.lampHalo = bh;
    // round 5 (A4 P2): the lamp's hard additive beam CONE is gone (its straight silhouette split the back wall into a
    // cobalt / lilac wedge and read as a flat overlay); the lamp now shows as its warm spill (zone + pools) and the
    // dust motes drifting in it over the pile. The visible practical in frame is the hanging work bulb (WORK_BULB).
    void beamTex;
    // the hanging work bulb on its cord from the ceiling beam over the pile / pail (sways; blooms; warm pool 8 lights
    // the ceiling band, the back wall, the pile top, the stool and the jar shelf), moths round it
    { const piv = new THREE.Group(); piv.position.set(o[0] + WORK_BULB.hook[0], o[1] + WORK_BULB.hook[1], o[2] + WORK_BULB.hook[2]); this.sr.add(piv); this.bulbPivot = piv;
      const L = WORK_BULB.hook[1] - WORK_BULB.y, cordM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.05, 0.07) });
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, L - 0.08, 5).translate(0, -(L - 0.08) / 2, 0), cordM); piv.add(cord);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.07, 12).translate(0, -L + 0.08, 0), lam("int:srSocket", () => ({ color: "#2a2a30" }))); sock.castShadow = false; piv.add(sock);
      const wb = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), new THREE.MeshBasicMaterial({ color: glow("#ffdca8", 6.5) })); wb.scale.set(1, 1.18, 1); wb.position.y = -L + 0.01; piv.add(wb); this.workBulb = wb;
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 4, 10), new THREE.MeshBasicMaterial({ color: glow("#fff2d0", 9) })); fil.position.y = -L + 0.012; fil.rotation.x = Math.PI / 2; piv.add(fil);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.64, 0.36, 0.09), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); // round 6: -35 % (the warm halo over the blue read as lavender haze)
      halo.layers.set(NOINK); halo.renderOrder = 4; this.sr.add(halo); this.workHalo = halo; }
    const motesC = bulb.position.clone().addScaledVector(aim, 1.2).sub(V(...o));
    this.lampMotes = new Motes(this.sr, 46, 21, o, [motesC.x - 0.75, motesC.y - 0.35, motesC.z - 0.4], [motesC.x + 0.75, motesC.y + 0.35, motesC.z + 0.4], new THREE.Color(1.1, 0.6, 0.2), 0.03, 0.06);
    this.lampMotes2 = new Motes(this.sr, 22, 23, o, [head.x + aim.x * 0.4 - 0.25, head.y - 0.3, head.z - 0.25], [head.x + aim.x * 0.4 + 0.25, head.y + 0.05, head.z + 0.25], new THREE.Color(1.1, 0.62, 0.22), 0.024, 0.04);
    this.moth = new THREE.Sprite(new THREE.SpriteMaterial({ map: mothTex(0), color: new THREE.Color(0.9, 0.82, 0.66), transparent: true, depthWrite: false }));
    this.moth.scale.setScalar(0.05); this.moth.layers.set(NOINK); this.sr.add(this.moth);
    // round 4 (A3 ADD): a second moth round the lamp and one round the lantern
    for (const s0 of [0.045, 0.04]) { const mth = new THREE.Sprite(new THREE.SpriteMaterial({ map: mothTex(0), color: new THREE.Color(0.9, 0.82, 0.66), transparent: true, depthWrite: false })); mth.scale.setScalar(s0); mth.layers.set(NOINK); this.sr.add(mth); this.moths2.push(mth); }
    // round 6 (A5 ADD: 2-3 moths circling the hanging bulb, catching its bloom): a third bulb moth (figure-8 orbit)
    { const mth = new THREE.Sprite(new THREE.SpriteMaterial({ map: mothTex(0), color: new THREE.Color(1.25, 1.12, 0.9), transparent: true, depthWrite: false })); mth.scale.setScalar(0.042); mth.layers.set(NOINK); this.sr.add(mth); this.moths2.push(mth); }
    // desk props
    b.geo(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), C("#d8432f"), dx + 0.3, 0.83, dz + 0.1, 0, 0, 0, 1, false);
    b.geo(new THREE.TorusGeometry(0.03, 0.009, 6, 10), C("#d8432f"), dx + 0.35, 0.835, dz + 0.1, 0, 0, 0, 1, false);
    b.box(C("#2e4a7a"), dx - 0.15, 0.78, dz - 0.2, dx + 0.15, 0.81, dz + 0.02, 0, false);
    b.geo(new THREE.CylinderGeometry(0.02, 0.025, 0.07, 10), C("#6a4428"), dx + 0.05, 0.815, dz + 0.22, 0, 0, 0, 1, false);
    b.rbox(C("#8a2a2a"), 0.07, 0.025, 0.05, dx + 0.05, 0.795, dz + 0.22, 0, 0, 0, false);
    for (let k = 0; k < 6; k++) b.rbox(TM("srEnvD" + (k % 3), () => envelopeTex("srEnvDT" + (k % 3), k % 2 === 0, ["#d8432f", "#2e8a5a", "#e0a630"][k % 3])), 0.24, 0.006, 0.12, dx - 0.4 + hash(k) * 0.05, 0.785 + k * 0.007, dz + 0.12, 0.2 * (hash(k * 3) - 0.5), 0, 0, false);
    // rubber-banded bundle of envelopes
    for (let k = 0; k < 5; k++) b.rbox(TM("srEnvD" + (k % 3), () => envelopeTex("srEnvDT" + (k % 3), k % 2 === 0, ["#d8432f", "#2e8a5a", "#e0a630"][k % 3])), 0.22, 0.012, 0.11, dx + 0.48, 0.787 + k * 0.012, dz - 0.18, 0.5 + (hash(k * 7) - 0.5) * 0.08, 0, 0, false);
    b.rbox(C("#c8302a"), 0.012, 0.066, 0.115, dx + 0.48, 0.81, dz - 0.18, 0.5, 0, 0, false);
    // postal scale
    b.box(C("#3a4a5a"), dx - 0.6, 0.78, dz - 0.3, dx - 0.4, 0.84, dz - 0.12, 0, false);
    b.geo(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 18), steel, dx - 0.5, 0.86, dz - 0.21, 0, 0, 0, 1, false);
    b.geo(new THREE.CircleGeometry(0.035, 18), basic("srScaleDial", () => ({ color: new THREE.Color(0.95, 0.92, 0.82) })), dx - 0.5, 0.81, dz - 0.119, 0, 0, 0, 1, false);
    b.rbox(TM("srParcelS0", () => parcelTex2("srParcelST0", "RETURN TO PARK")), 0.12, 0.07, 0.1, dx - 0.5, 0.9, dz - 0.21, 0.3);
    // tally sheet + an open envelope with a chip spilling out (in the lamp's spill)
    b.panel(TM("srTally", () => tallyTex()), 0.2, 0.27, dx + 0.12, 0.783, dz - 0.05, 0.25, -Math.PI / 2);
    b.rbox(TM("srEnvO", () => envelopeTex("srEnvOT", true, "#2e5aa8")), 0.24, 0.008, 0.13, dx + 0.32, 0.79, dz + 0.24, -0.4, 0, 0.04);
    b.geo(new THREE.PlaneGeometry(0.2, 0.08).rotateX(-0.6), C("#f6efdc"), dx + 0.32, 0.81, dz + 0.17, -0.4);
    { const cg = chipGeos(901, 0.035, 0.018); b.geo(cg.top, qzE(5, 0.3), dx + 0.44, 0.8, dz + 0.3, 0.5, 0.2, 0.1); b.geo(cg.side, C("#7a5a44"), dx + 0.44, 0.8, dz + 0.3, 0.5, 0.2, 0.1); }
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.1, 0.1, 0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.layers.set(NOINK); this.sr.add(m); this.steam.push(m); }
    this.mugTop = V(o[0] + dx + 0.3, o[1] + 0.9, o[2] + dz + 0.1);
    // chair, waste basket with crumpled paper, box of packing peanuts under the desk
    b.box(C("#5a3a22"), dx - 0.2, 0.44, dz + 0.5, dx + 0.2, 0.48, dz + 0.88, 0, false); b.box(C("#5a3a22"), dx - 0.2, 0.48, dz + 0.86, dx + 0.2, 0.95, dz + 0.9, 0, false);
    for (const [ex, ez] of [[-0.18, 0.52], [0.18, 0.52], [-0.18, 0.86], [0.18, 0.86]]) b.box(C("#4a2e1a"), dx + ex - 0.02, 0, dz + ez - 0.02, dx + ex + 0.02, 0.44, dz + ez + 0.02, 0, false);
    b.geo(new THREE.CylinderGeometry(0.15, 0.12, 0.32, 14, 1, true), lam("int:srBin", () => ({ color: "#4e6a8a", side: THREE.DoubleSide })), dx - 0.05, 0.16, dz - 0.12, 0, 0, 0, 1, false);
    for (let k = 0; k < 4; k++) b.geo(rockGeo(700 + k, 0.06, 0.9), C("#efeadc"), dx - 0.05 + (hash(k) - 0.5) * 0.14, 0.3 + hash(k * 2) * 0.04, dz - 0.12 + (hash(k * 3) - 0.5) * 0.14, 0, 0, 0, 1, false);
    b.rbox(TM("srParcelS1", () => parcelTex2("srParcelST1", "RETURNED")), 0.4, 0.26, 0.32, dx + 0.15, 0.13, dz - 0.05, 0.2);
    for (let k = 0; k < 14; k++) b.geo(new THREE.TorusGeometry(0.012, 0.006, 4, 6, Math.PI * 1.3), C("#f4f0e4"), dx + 0.15 + (hash(k * 1.1) - 0.5) * 0.3, 0.27 + hash(k * 1.7) * 0.03, dz - 0.05 + (hash(k * 2.3) - 0.5) * 0.24, hash(k) * 6, hash(k * 4) * 3, 0, 1, false);
    // ---- the CONSCIENCE PILE (casts: lit by the lamp key) ----
    const [cx, , cz] = SR.crate, cyaw = 0.1, cw = 1.04, ch = 0.52, cd = 0.62;
    const crateM = TM("srCrate", () => crateTex()), slatM = C("#b8854e");
    const cm = (lx2: number, ly2: number, lz2: number): P3 => [cx + lx2 * Math.cos(cyaw) + lz2 * Math.sin(cyaw), ly2, cz - lx2 * Math.sin(cyaw) + lz2 * Math.cos(cyaw)];
    b.geo(new THREE.PlaneGeometry(cw, ch), crateM, ...cm(0, ch / 2, cd / 2 + 0.002), cyaw);
    b.rbox(slatM, cw, ch, 0.03, ...cm(0, ch / 2, cd / 2 - 0.015), cyaw);
    b.rbox(slatM, cw, ch, 0.03, ...cm(0, ch / 2, -cd / 2 + 0.015), cyaw);
    b.rbox(slatM, 0.03, ch, cd, ...cm(-cw / 2 + 0.015, ch / 2, 0), cyaw);
    b.rbox(slatM, 0.03, ch, cd, ...cm(cw / 2 - 0.015, ch / 2, 0), cyaw);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rbox(C("#8a5a30"), 0.06, ch + 0.02, 0.06, ...cm(sx * (cw / 2 - 0.01), ch / 2 + 0.01, sz * (cd / 2 - 0.01)), cyaw);
    for (const side of [-1, 1]) b.rbox(C("#8a5a30"), 0.04, 0.05, cd + 0.04, ...cm(side * (cw / 2 + 0.01), ch - 0.03, 0), cyaw);
    // the heap: a mound of angular petrified-wood chips (quartz-ring faces, bark-brown edges, a white paint dot each)
    // plus a few rounded rocks, ~0.3 m above the rim; heapTop() is shared with the mail drop's landing
    const heapTop = (lx2: number, lz2: number) => { const rr = Math.max(Math.abs(lx2 / (cw / 2 - 0.08)), Math.abs(lz2 / (cd / 2 - 0.07))); return ch - 0.04 + 0.36 * (1 - Math.min(1, rr) ** 2) + 0.03; };
    this.heapTop = (lx2, lz2) => cm(lx2, heapTop(lx2, lz2), lz2);
    const QZ = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#7a5a44", "#f4ecd8", "#5e4636", "#e8893a", "#f2c64a", "#8a5aa8", "#c84a3a"]; // round 6: even red / orange / yellow / purple + bark browns + cream
    const qm = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => qzE(i)), bark = barkE(), dotM = basic("srDot", () => ({ color: new THREE.Color(0.95, 0.94, 0.9) }));
    for (let k = 0; k < 150; k++) {
      const u = hash(k * 1.31) * 2 - 1, v = hash(k * 2.77) * 2 - 1, lx2 = u * (cw / 2 - 0.07), lz2 = v * (cd / 2 - 0.06);
      const ly2 = heapTop(lx2, lz2) - 0.36 * (1 - hash(k * 4.3) ** 0.35) * 0.9;
      const p = cm(lx2, ly2, lz2);
      if (k % 4 === 3) { b.geo(rockGeo(k + 1, 0.04 + 0.04 * hash(k * 5.9), 0.65), rockE(QZ[Math.floor(hash(k * 7.7) * QZ.length) % QZ.length]), ...p, hash(k) * 6, hash(k * 2) * 2, hash(k * 3) * 2); continue; }
      const cg = chipGeos(k + 11, 0.05 + 0.045 * hash(k * 5.9), 0.024 + 0.016 * hash(k * 6.3));
      const q = faceQ(k + 11, 0.18, 0.98, 0.85, 0.7), c3 = V(...p);
      b.ori(cg.top, qm[Math.floor(hash(k * 3.37 + 0.5) * 8) % 8], c3, q); b.ori(cg.side, bark, c3, q);
      if (ly2 > heapTop(lx2, lz2) - 0.12) b.ori(new THREE.CircleGeometry(cg.r * 0.13, 8).rotateX(-Math.PI / 2).translate(...cg.dot), dotM, c3, q, false);
    }
    b.geo(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), TM("srMound6", () => heapTex(), { emissive: new THREE.Color(1, 1, 1), emissiveMap: heapTex(), emissiveIntensity: 0.2 }), ...cm(0, ch - 0.08, 0), cyaw, 0, 0, [cw / 2 - 0.04, 0.3, cd / 2 - 0.04]);
    // glint stars on lamp-lit chip faces (round 3: 3 of them, twinkling all through the shot)
    for (const [gx, gz] of [[-0.12, 0.06], [0.22, -0.05], [0.36, 0.16]] as [number, number][]) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(2.2, 1.9, 1.5), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      const p = cm(gx, heapTop(gx, gz) + 0.03, gz); s.position.set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); s.layers.set(NOINK); s.renderOrder = 6; s.visible = false; this.sr.add(s); this.glints.push(s);
    }
    // opened envelopes + letters + parcels in / around the pile
    const env = (i: number, x: number, y: number, z: number, ry: number, rx: number, rz: number) => {
      b.rbox(TM("srEnv" + (i % 3), () => envelopeTex("srEnvT" + (i % 3), i % 2 === 0, ["#d8432f", "#2e8a5a", "#e0a630"][i % 3])), 0.26, 0.006, 0.14, x, y, z, ry, rx, rz);
    };
    env(0, ...cm(-0.3, ch + 0.26, 0.05), cyaw + 0.4, 0.6, 0.2); env(1, ...cm(0.32, ch + 0.22, -0.1), cyaw - 0.5, -0.4, 0.5); env(2, ...cm(0.05, ch + 0.38, -0.15), cyaw + 1.2, 0.3, -0.3);
    for (let k = 0; k < 5; k++) { const a = -1.2 + k * 0.6; env(k + 3, ...cm(Math.cos(a) * 0.75 + 0.1, 0.004, Math.sin(a) * 0.55 + 0.42), a * 2, 0, 0); }
    const parcel = (k: number, w: number, h: number, d: number, x: number, z: number, ry: number) => b.rbox(TM("srParcelP" + k, () => parcelTex2("srParcelPT" + k, k === 1 ? "RETURNED" : "RETURN TO PARK")), w, h, d, x, h / 2, z, ry);
    // round 4 (A3 ADD): the left stack is now archive boxes of earlier returns, labels to the lens
    for (const [i, yr, w, h, d, y0, ry] of [[0, "1987", 0.42, 0.26, 0.32, 0, 0.28], [1, "1994", 0.4, 0.24, 0.3, 0.26, 0.16], [2, "2009", 0.37, 0.22, 0.28, 0.5, 0.36]] as [number, string, number, number, number, number, number][]) {
      const c = cm(-0.82 + 0.02 * i, 0, 0.12 - 0.02 * i), yc = y0 + h / 2;
      b.rbox(C(["#c4975c", "#b88a52", "#cfa266"][i]), w, h, d, c[0], yc, c[2], cyaw + ry);
      b.rbox(C("#a87e48"), w + 0.012, 0.03, d + 0.012, c[0], y0 + h - 0.015, c[2], cyaw + ry);
      b.geo(new THREE.PlaneGeometry(w * 0.72, h * 0.7).translate(0, -0.01, d / 2 + 0.003), basic("srArch" + yr, () => ({ map: archiveLabelTex("srArchT" + yr, yr), color: new THREE.Color(0.96, 0.84, 0.66) })), c[0], yc, c[2], cyaw + ry, 0, 0, 1, false);
    }
    parcel(1, 0.26, 0.18, 0.22, cm(-0.62, 0, 0.5)[0], cm(-0.62, 0, 0.5)[2], cyaw - 0.4);
    parcel(2, 0.22, 0.14, 0.18, cm(0.42, 0, 0.8)[0], cm(0.42, 0, 0.8)[2], cyaw + 0.8);
    // (round 4: the small parcel that sat on this stack is now the archive box RETURNS 2009)
    // the mail sack slumped beside the crate, envelopes spilling out; string + crumpled paper on the floor
    const sack = new THREE.LatheGeometry([V(0.001, 0, 0), V(0.25, 0.02, 0), V(0.3, 0.2, 0), V(0.26, 0.42, 0), V(0.16, 0.56, 0), V(0.12, 0.62, 0), V(0.16, 0.68, 0), V(0.001, 0.7, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 14);
    b.geo(sack, TM("srSack", () => ctex("srSackT", 512, 256, (g, r) => { g.fillStyle = "#cdb88e"; g.fillRect(0, 0, 512, 256); mottle(g, r, 512, 256, 30, ["#b8a276", "#ddc9a0"], 10, 40, 0.35); centerText(g, "RETURNS", 256, 120, 220, 54, "#3a5a8a", "Impact, sans-serif", "normal"); })), ...cm(-1.05, 0, -0.35), 0.6, 0.12, -0.18);
    const str = new THREE.CatmullRomCurve3([V(-0.6, 0.01, 0.2), V(-0.3, 0.01, 0.45), V(-0.45, 0.01, 0.75), V(-0.05, 0.01, 0.9), V(0.2, 0.01, 0.7), V(0.45, 0.01, 1.0)]);
    b.geo(new THREE.TubeGeometry(str, 40, 0.005, 4, false), C("#e9dcc0"), 0, 0, 0, 0, 0, 0, 1, false);
    for (const [px, pz, s] of [[-0.85, 0.85, 0.07], [0.55, 0.45, 0.06], [1.7, 0.3, 0.065]] as [number, number, number][]) b.geo(rockGeo(800 + px * 10, s, 0.85), C("#f2eee2"), px, s * 0.7, pz, px, px * 2, 0, 1, false);
    for (let k = 0; k < 18; k++) b.geo(new THREE.TorusGeometry(0.012, 0.006, 4, 6, Math.PI * 1.3), C("#f4f0e4"), -0.3 + (hash(k * 1.9) - 0.5) * 1.2, 0.006, 0.6 + (hash(k * 2.9) - 0.5) * 0.8, hash(k) * 6, Math.PI / 2, 0, 1, false);
    // round 4 (A3 ADD): an ironic kraft tag tied to the crate front's lower right, DO NOT USE / AS BAIT, a yellow sticky
    // note (OOPS) half over it; unlit + lamp-warm so it reads
    { const tq = cm(0.35, 0.16, cd / 2 + 0.012);
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.13), basic("srBaitTag", () => ({ map: baitTagTex(), color: new THREE.Color(0.98, 0.86, 0.66) })));
      tag.position.set(o[0] + tq[0], o[1] + tq[1], o[2] + tq[2]); tag.rotation.set(0, cyaw, -0.12, "YXZ"); tag.layers.set(NOINK); this.sr.add(tag);
      const nq = cm(0.43, 0.115, cd / 2 + 0.016);
      const nt = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.08), basic("srOops", () => ({ map: ctex("srOopsT", 128, 120, (g) => { g.fillStyle = "#f8e36a"; g.fillRect(0, 0, 128, 120); g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(0, 0, 128, 18); centerText(g, "OOPS", 64, 66, 112, 44, "#2a2a58", MARKER); }), color: new THREE.Color(1.0, 0.9, 0.7) })));
      nt.position.set(o[0] + nq[0], o[1] + nq[1], o[2] + nq[2]); nt.rotation.set(0, cyaw, 0.22, "YXZ"); nt.layers.set(NOINK); this.sr.add(nt);
      const hole = cm(0.24, 0.17, cd / 2 + 0.014), nail = cm(0.3, 0.42, cd / 2 + 0.01);
      b.seg(C("#e9dcc0"), hole, nail, 0.003, false, 4); b.geo(new THREE.SphereGeometry(0.008, 6, 4), C("#5a626e"), ...nail, 0, 0, 0, 1, false); }
    // round 5 (A4 P2): the CONSCIENCE PILE stencil as an unlit, lamp-warm overlay on the crate front (cream letters with a
    // dark worn edge, >= 60 % luminance contrast against the slats in every lens); and (A4 P3) the "SORRY - MY DAD TOOK
    // IT IN 1972" card moved off the far corkboard onto the crate's front-left corner, tied on with string
    { const sc = cm(0, ch / 2, cd / 2 + 0.006);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.98, ch * 0.98), basic("srStencil5", () => ({ map: stencilTex(), transparent: true, depthWrite: false, color: new THREE.Color(0.95, 0.86, 0.72), fog: false })));
      st.position.set(o[0] + sc[0], o[1] + sc[1], o[2] + sc[2]); st.rotation.y = cyaw; st.layers.set(NOINK); st.renderOrder = 2; this.sr.add(st);
      const nq = cm(-0.335, 0.125, cd / 2 + 0.014);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1875), basic("srNote1972", () => ({ map: note1972Tex(), color: new THREE.Color(0.98, 0.88, 0.74) })));
      card.position.set(o[0] + nq[0], o[1] + nq[1], o[2] + nq[2]); card.rotation.set(0, cyaw, 0.07, "YXZ"); card.layers.set(NOINK); card.renderOrder = 3; this.sr.add(card);
      const nail2 = cm(-0.4, 0.3, cd / 2 + 0.01); b.seg(C("#e9dcc0"), cm(-0.42, 0.21, cd / 2 + 0.015), nail2, 0.003, false, 4); b.geo(new THREE.SphereGeometry(0.008, 6, 4), C("#5a626e"), ...nail2, 0, 0, 0, 1, false); }
    // round 5 (A4 ADD: fill the dead ceiling band): a high shelf of labelled glass jars of returned chips on the back
    // wall's right, catching the work bulb (pool 8)
    { const y0 = 2.38, x0 = 1.3, x1 = 2.06, z0 = -D + 0.02, z1 = -D + 0.24, shelfW = lam("int:srJarShelf", () => ({ map: parkWood("#8a5a36", false) }));
      b.box(shelfW, x0, y0 - 0.03, z0, x1, y0, z1, 0, true);
      for (const x of [x0 + 0.08, x1 - 0.08]) b.rbox(C("#5a3a22"), 0.03, 0.16, 0.2, x, y0 - 0.11, z0 + 0.11, 0, 0.6, 0);
      const jars: [string, string, number][] = [["RETURNED", "1980s", 0], ["RETURNED", "1990s", 1], ["RETURNED", "2000s", 2]];
      const glassJ = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.62, 0.8), transparent: true, opacity: 0.22, depthWrite: false });
      jars.forEach(([a, yr, k]) => {
        const jx = x0 + 0.15 + k * 0.24, jz = z0 + 0.12, jh = 0.2 - 0.02 * (k % 2), cg = 0.075;
        // the chips inside (a quartz mound), the glass, the lid, the label
        b.geo(new THREE.CylinderGeometry(cg * 0.9, cg * 0.9, jh * 0.62, 14), qzE(k + 4 * (k % 2), 0.5), jx, y0 + jh * 0.31, jz, k);
        const jg = new THREE.Mesh(new THREE.CylinderGeometry(cg, cg, jh, 16, 1, true), glassJ); jg.position.set(o[0] + jx, o[1] + y0 + jh / 2, o[2] + jz); jg.renderOrder = 3; this.sr.add(jg);
        b.geo(new THREE.CylinderGeometry(cg * 1.04, cg * 1.04, 0.03, 16), C(["#b8302a", "#2e6a3e", "#c9a24a"][k]), jx, y0 + jh + 0.015, jz);
        const lb = new THREE.Mesh(new THREE.CylinderGeometry(cg + 0.002, cg + 0.002, 0.085, 16, 1, true, -0.95, 1.9), basic("srJarL" + k, () => ({ map: jarLabelTex("srJarLT" + k, a, yr), color: new THREE.Color(0.96, 0.84, 0.66) })));
        lb.position.set(o[0] + jx, o[1] + y0 + jh * 0.48, o[2] + jz); lb.rotation.y = 0.15; lb.layers.set(NOINK); this.sr.add(lb);
      });
      // a fourth, half-full jar lying on its side + a few loose chips on the shelf
      b.geo(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14), qzE(3, 0.45), x1 - 0.06, y0 + 0.06, z0 + 0.14, 0.3, 0, Math.PI / 2);
      for (let k = 0; k < 3; k++) { const cg2 = chipGeos(880 + k, 0.025, 0.012); b.geo(cg2.top, qzE(k, 0.45), x0 + 0.86 - k * 0.05, y0 + 0.008, z0 + 0.06 + k * 0.03, k); b.geo(cg2.side, barkE(), x0 + 0.86 - k * 0.05, y0 + 0.008, z0 + 0.06 + k * 0.03, k); } }
    // the three hero letters, readable (unlit: always lamp-warm, no lighting flicker on the hop)
    const note = (key: string, lines: string[], paper: string, w: number, h: number, p: P3, ry: number, rx: number, rz: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(key, () => ({ map: noteTex(key + "T", lines, paper), side: THREE.DoubleSide, color: new THREE.Color(0.98, 0.84, 0.62) })));
      m.position.set(o[0] + p[0], o[1] + p[1], o[2] + p[2]); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = true;
      this.sr.add(m); this.letters.push({ m, p: m.position.clone(), r: m.rotation.clone(), s: 1 });
    };
    note("srNoteSorry", ["SORRY!"], "#fff7a8", 0.34, 0.25, cm(-0.4, ch + 0.48, -0.16), cyaw + 0.45, -0.35, 0.14);
    note("srNoteReturn", ["I'M RETURNING", "THIS"], "#fbf8ee", 0.42, 0.31, cm(0.15, ch + 0.44, 0.06), cyaw - 0.2, -0.3, -0.1);
    note("srNoteForgive", ["PLEASE", "FORGIVE ME"], "#ffd9e2", 0.38, 0.28, cm(-0.02, ch + 0.27, 0.29), cyaw + 0.15, -0.68, 0.04);
    // ---- the BAIT bucket on a step stool, label taped on the lens side (unlit, curved). Round 3 (A2): an orange-red
    // enamel pail (the blue one vanished into the blue room), pre-filled with a heap of rainbow chips 3-5 cm over the
    // rim for "the bait wood?" insert; each scoop pours 3 chips FROM the scoop into it and the heap grows ----
    const [bx, , bz] = BAIT.pos, by = BAIT.stool, stoolM = C("#9a6a40");
    b.box(stoolM, bx - 0.22, by - 0.04, bz - 0.2, bx + 0.22, by, bz + 0.2);
    for (const [ex, ez] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]]) b.box(C("#7a4e2e"), bx + ex - 0.025, 0, bz + ez - 0.025, bx + ex + 0.025, by - 0.04, bz + ez + 0.025);
    b.box(C("#7a4e2e"), bx - 0.2, 0.12, bz - 0.16, bx + 0.2, 0.15, bz - 0.13); b.box(C("#7a4e2e"), bx - 0.2, 0.12, bz + 0.13, bx + 0.2, 0.15, bz + 0.16);
    const pail = new THREE.CylinderGeometry(0.17, 0.13, 0.32, 24, 1, true);
    const cIns = camAt(14, SHOTS[13].a + 2), cMs = camAt(14, BEAT.pieces);
    const yawTo = (p: number[]) => Math.atan2(p[0] - (o[0] + bx), p[2] - (o[2] + bz));
    const baitYaw = 0.55 * yawTo(cIns.pos) + 0.45 * yawTo(cMs.pos); // label centred between the insert and the MS lenses (P3: the B sat on the silhouette)
    this.pailMat = lam("int:srPailRed6", () => ({ map: pailRedTex(), color: new THREE.Color(0.55, 0.5, 0.48), side: THREE.DoubleSide, emissive: new THREE.Color(1, 1, 1), emissiveMap: pailRedTex(), emissiveIntensity: 0.78 })) as THREE.MeshLambertMaterial;
    b.geo(pail, this.pailMat /* round 6: the greyed night albedo made it pink: a stronger orange emissive floor */, bx, by + 0.16, bz, baitYaw - 2.0); // orange in the blue shade, not pink
    b.geo(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 20), C("#8a2e18"), bx, by + 0.005, bz);
    b.geo(new THREE.TorusGeometry(0.171, 0.011, 6, 28), lam("int:srPailRim", () => ({ color: "#f2e6cc", emissive: new THREE.Color("#3a3020"), emissiveIntensity: 0.6 })), bx, by + 0.32, bz, 0, Math.PI / 2);
    b.geo(new THREE.TorusGeometry(0.17, 0.005, 4, 20, Math.PI), C("#b4bcc6"), bx, by + 0.32, bz, 0.95, 0.35);
    for (const sx of [-1, 1]) b.geo(new THREE.SphereGeometry(0.014, 8, 6), C("#b4bcc6"), bx + Math.cos(0.95) * 0.17 * sx, by + 0.3, bz - Math.sin(0.95) * 0.17 * sx);
    {
      const arc = 1.5, lg = new THREE.CylinderGeometry(0.1625, 0.1485, 0.115, 16, 1, true, baitYaw - arc / 2, arc);
      const lm = new THREE.Mesh(lg, basic("srBaitLabel", () => ({ map: baitLabelTex(), transparent: true, alphaTest: 0.3, side: THREE.FrontSide, color: new THREE.Color(0.98, 0.94, 0.88) })));
      lm.position.set(o[0] + bx, o[1] + by + 0.168, o[2] + bz); lm.layers.set(NOINK); this.sr.add(lm);
    }
    // the heap in the pail: a quartz dome + ~46 chips, top ~4 cm over the rim at the centre (local origin = rim centre)
    this.bHeap = new THREE.Group(); this.bHeap.position.set(o[0] + bx, o[1] + by + 0.32, o[2] + bz); this.sr.add(this.bHeap);
    {
      const hb = new Batch();
      hb.add(new THREE.SphereGeometry(1, 18, 8, 0, TAU, 0, Math.PI / 2), TM("srMound6", () => heapTex(), { emissive: new THREE.Color(1, 1, 1), emissiveMap: heapTex(), emissiveIntensity: 0.2 }),
        new THREE.Matrix4().compose(V(0, -0.035, 0), new THREE.Quaternion(), V(0.158, 0.05, 0.158)));
      for (let k = 0; k < 46; k++) {
        const a = hash(k * 2.31 + 5) * TAU, rho = 0.14 * Math.sqrt(hash(k * 3.7 + 1)), cg = chipGeos(300 + k, 0.03 + 0.018 * hash(k * 1.9), 0.012 + 0.008 * hash(k * 4.1));
        const y = BHEAP(rho) - 0.012 * hash(k * 6.6) - (k < 14 ? 0.022 : 0);
        const m = new THREE.Matrix4().compose(V(Math.cos(a) * rho, y, Math.sin(a) * rho), faceQ(300 + k, Math.sin(baitYaw), Math.cos(baitYaw), 1.5, 0.6), V(1, 1, 1));
        hb.add(cg.top, qzE(Math.floor(hash(k * 5.71 + 0.2) * 8), 0.48), m); hb.add(cg.side, barkE(), m);
        // round 7 (A6 ADD: a story callback): the top chips carry shot 8's small white paint dot (the MARKED test chips)
        if (k >= 14) hb.add(new THREE.CircleGeometry(cg.r * 0.16, 8).rotateX(-Math.PI / 2).translate(...cg.dot), basic("srDot", () => ({ color: new THREE.Color(0.95, 0.94, 0.9) })), m);
      }
      hb.build(this.bHeap, true);
    }
    // the 9 poured chips (3 per scoop), children of the heap so they ride its growth once landed
    for (let k = 0; k < 9; k++) {
      const cg = chipGeos(520 + k, 0.03 + 0.012 * hash(k * 2.7), 0.02), g = new THREE.Group();
      const top = new THREE.Mesh(cg.top, qzE(k * 3 + 1, 0.5)), side = new THREE.Mesh(cg.side, barkE());
      for (const m of [top, side]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
      g.visible = false; this.bHeap.add(g); this.pour.push(g);
    }
    for (let k = 0; k < 2; k++) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(2.2, 1.9, 1.5), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
      st.position.set(k ? 0.05 : -0.06, 0.05, k ? -0.02 : 0.05); st.layers.set(NOINK); st.renderOrder = 6; st.visible = false; this.bHeap.add(st); this.bGlints.push(st);
    }
    this.bucketBase = V(o[0] + bx, o[1] + by, o[2] + bz);
    // round 4 (A3 ADD): an enamel camp mug of coffee on the stool's front-left corner, steaming (steam on 2s)
    { const mx2 = bx - 0.172, mz2 = bz + 0.152;
      b.geo(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 16), C("#ece6d8"), mx2, by + 0.045, mz2);
      b.geo(new THREE.CylinderGeometry(0.0405, 0.0405, 0.012, 16, 1, true), lam("int:srMugRim", () => ({ color: "#2e5aa8", side: THREE.DoubleSide })), mx2, by + 0.086, mz2, 0, 0, 0, 1, false);
      b.geo(new THREE.CylinderGeometry(0.035, 0.035, 0.004, 14), C("#3a2416"), mx2, by + 0.08, mz2, 0, 0, 0, 1, false);
      b.geo(new THREE.TorusGeometry(0.025, 0.007, 5, 12, Math.PI * 1.2), C("#ece6d8"), mx2 - 0.045, by + 0.048, mz2, Math.PI / 2, 0, Math.PI / 2 + 0.6, 1, false);
      this.mug2Top = V(o[0] + mx2, o[1] + by + 0.1, o[2] + mz2);
      // round 4 (A3 ADD): the returns tally on a clipboard, hooked over the stool's front edge (RETURNED: 1,200+ LETTERS)
      // round 6: the clipboard tally gave its place to the BAD LUCK EVER SINCE note (the wall counter now carries the
      // letter count): see the joke notes below
      void tallyTex;
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.13), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.2, 0.17, 0.15), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.layers.set(NOINK); m.renderOrder = 5; this.sr.add(m); this.steam2.push(m); } }
    // the returned padded envelope + taped parcel that come down the chute on "mailed", and their paper puffs
    this.mailEnv = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.022, 0.24), [C("#c79a5e"), C("#c79a5e"), TM("srPad", () => padTex()), C("#c79a5e"), C("#c79a5e"), C("#c79a5e")]);
    // round 4 (A3 P2: ~30 px wide in the 540 preview, landed behind the PLEASE FORGIVE ME card): x1.5, its FRAGILE band
    // and stamps self-lit a little so they stay bright; it fits the chute across (0.3 < 0.34 m)
    this.mailBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.225, 0.39), TM("srParcelM2b", () => fragileTex(), { emissive: new THREE.Color(1, 1, 1), emissiveMap: fragileTex(), emissiveIntensity: 0.32 }));
    this.mailBox2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.26), TM("srParcelM7", () => parcelTex2("srParcelM7T", "RETURN TO PARK", "OHIO 1972"), { emissive: new THREE.Color(1, 1, 1), emissiveMap: parcelTex2("srParcelM7T", "RETURN TO PARK", "OHIO 1972"), emissiveIntensity: 0.22 })); // round 7 (A6 ADD): postmarked OHIO 1972
    for (const m of [this.mailEnv, this.mailBox, this.mailBox2]) { m.castShadow = m.receiveShadow = true; m.visible = false; this.sr.add(m); }
    // 4 chips knocked off the heap by the parcel's landing (hop onto the rug)
    for (let k = 0; k < 4; k++) {
      const cg = chipGeos(760 + k, 0.03 + 0.012 * hash(k * 2.9), 0.018), g = new THREE.Group();
      const top = new THREE.Mesh(cg.top, qzE(k * 5 + 2, 0.5)), side = new THREE.Mesh(cg.side, barkE());
      for (const m of [top, side]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
      g.visible = false; this.sr.add(g); this.hops.push(g);
    }
    for (let k = 0; k < 24; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.75, 0.68, 0.58), transparent: true, depthWrite: false, opacity: 0 }));
      s.layers.set(NOINK); s.visible = false; this.sr.add(s); this.puffs.push(s);
    }
    // ---- round 3 (A2: one blue hue, empty bottom third): a ranger's hurricane lantern on the floor in front of the
    // bait stool (a second warm practical: blooming globe + flame, warm pool on the crate front, stool, pail and floor,
    // shade.ts POOL 6), a braided rag rug, an open mail sack spilling envelopes, spilled rainbow chips glinting in the
    // pool, a parcel stack and two readable apology notes in the foreground ----
    {
      const [lx2, , lz2] = LANTERN, lg = C("#2f5a3c"), ld = C("#24402c");
      b.geo(new THREE.CylinderGeometry(0.075, 0.088, 0.075, 18), lg, lx2, 0.0375, lz2);
      b.geo(new THREE.TorusGeometry(0.082, 0.008, 5, 20), ld, lx2, 0.076, lz2, 0, Math.PI / 2);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; b.seg(ld, [lx2 + Math.cos(a) * 0.068, 0.075, lz2 + Math.sin(a) * 0.068], [lx2 + Math.cos(a) * 0.06, 0.245, lz2 + Math.sin(a) * 0.06], 0.005, false, 4); }
      b.geo(new THREE.ConeGeometry(0.078, 0.06, 16), lg, lx2, 0.275, lz2);
      b.geo(new THREE.CylinderGeometry(0.022, 0.026, 0.04, 10), ld, lx2, 0.32, lz2);
      b.geo(new THREE.TorusGeometry(0.075, 0.005, 4, 16, Math.PI), C("#8a949e"), lx2, 0.32, lz2, 0.5, 0, 0);
      // round 8 (A7 P3: a flat yellow glass, no flame, no bloom): the globe is a thinner amber glass (~50 %) so the FLAME card
      // shows through it (a blooming teardrop, emissive ~2.6, flickering +-8 % every 3-5 f with a little lick), with a warm
      // ~0.25 m glow sprite round it (posed per frame, kept just in front of the glass toward the lens)
      const glassM = new THREE.MeshBasicMaterial({ map: lanternGlassTex(), color: new THREE.Color(1.2, 0.86, 0.55), transparent: true, opacity: 0.5, depthWrite: false });
      const gl = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glassM); gl.scale.set(0.058, 0.085, 0.058); gl.position.set(o[0] + lx2, o[1] + 0.16, o[2] + lz2); this.sr.add(gl);
      const coreM = new THREE.MeshBasicMaterial({ color: glow("#ffe2a6", 6.0) });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), coreM); core.scale.set(1, 1.6, 1); core.position.set(o[0] + lx2, o[1] + 0.15, o[2] + lz2); core.layers.set(NOINK); this.sr.add(core);
      const lh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.95, 0.5, 0.16), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      lh.position.set(o[0] + lx2, o[1] + 0.16, o[2] + lz2); lh.layers.set(NOINK); lh.renderOrder = 4; this.sr.add(lh);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: glow("#ffe0a0", 2.6), transparent: true, depthWrite: false, fog: false }));
      flame.scale.set(0.036, 0.066, 1); flame.layers.set(NOINK); flame.renderOrder = 6; this.sr.add(flame);
      const lg2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.1, 0.62, 0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      lg2.scale.setScalar(0.26); lg2.layers.set(NOINK); lg2.renderOrder = 6; this.sr.add(lg2);
      this.lantern = { halo: lh, glass: glassM, core: coreM, flame, glow: lg2, c: V(o[0] + lx2, o[1] + 0.155, o[2] + lz2) };
      // warm light on the floor around it (additive, soft) + its contact shadow
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ctex("srLanternPool", 256, 200, (g) => {
        const gr = g.createRadialGradient(128, 100, 6, 128, 100, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.55)"); gr.addColorStop(0.7, "rgba(255,255,255,0.14)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 256, 200);
      }), color: new THREE.Color(0.2, 0.09, 0.025), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      fp.position.set(o[0] + lx2 - 0.3, o[1] + 0.007, o[2] + lz2 + 0.15); fp.layers.set(NOINK); fp.renderOrder = 2; this.sr.add(fp); this.lanternPool = fp.material as THREE.MeshBasicMaterial;
      // braided rag rug in the foreground
      const rug = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
      b.geo(rug, TM("srRug", () => rugTex(), { transparent: false }), 1.0, 0.004, 0.42, 0.15, 0, 0, [0.8, 1, 0.52], false);
      // round 5 (A4 P3: the tipped, inside-out sack read as a blue cylinder with mirrored letters): a CLOSED canvas mail
      // sack slumped upright at the reveal's lower-left edge (~0.5 x the focus distance, so it blurs as a framer), its
      // RETURNS stencil turned to that lens and reading the right way, the tied neck flopped over; the envelopes that
      // spilled from it stay fanned on the rug
      const sackG = new THREE.LatheGeometry([[0.001, 0], [0.23, 0.01], [0.29, 0.14], [0.3, 0.28], [0.26, 0.44], [0.15, 0.57], [0.09, 0.62], [0.12, 0.66], [0.06, 0.71], [0.001, 0.72]].map(([x, y]) => new THREE.Vector2(x, y)), 20, 0, TAU);
      // round 6 (A5 P3: a featureless grey-lavender blob over 15-20 % of the reveal, stencil unreadable): warm BURLAP
      // (#8A6A4A, weave + a strong emissive floor so the night shade cannot grey it), a bold dark-red RETURNS stencil
      // on a pale patch, moved 0.1 m left and 0.1 m toward the lens (its right edge now ~130 px into the reveal: <= 10 %
      // of the frame), the neck opened with three envelopes sticking out of it
      const sackTex = () => ctex("srSackT6", 1024, 256, (g, r) => { g.fillStyle = "#8a6a4a"; g.fillRect(0, 0, 1024, 256); mottle(g, r, 1024, 256, 60, ["#7a5c3e", "#a07c56"], 12, 44, 0.4);
        g.strokeStyle = "rgba(60,40,24,0.28)"; g.lineWidth = 2; for (let y = 2; y < 256; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y + 2); g.stroke(); } // burlap weave
        g.strokeStyle = "rgba(190,160,120,0.18)"; for (let x = 3; x < 1024; x += 7) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, 256); g.stroke(); }
        g.strokeStyle = "rgba(50,32,18,0.45)"; g.lineWidth = 4; for (const x of [80, 340, 690, 940]) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20, 90, x - 16, 170, x + 8, 256); g.stroke(); }
        g.fillStyle = "#d8c49a"; g.save(); g.translate(512, 160); g.rotate(-0.03); g.fillRect(-230, -62, 460, 124); g.restore();
        g.save(); g.translate(512, 152); g.rotate(-0.03); centerText(g, "RETURNS", 0, 0, 420, 78, "#8a2a1e", "Impact, 'Arial Black', sans-serif", "normal"); g.restore();
        centerText(g, "TO THE PARK", 512, 206, 300, 26, "#3a2a1a", "Impact, 'Arial Black', sans-serif", "normal"); });
      const SK: P3 = [0.5, 0, 1.3];
      b.geo(sackG, basic("srSack7", () => ({ map: sackTex(), color: new THREE.Color(0.105, 0.11, 0.2) })) /* round 7 (A6 P3: a big blurred orange disc with partial red letters competed with the BAIT bucket): a dark NAVY silhouette framer (#1A1D40 class), its burlap weave just readable */ /* round 6c: unlit lantern-warm burlap (lit it still took the night blue: a navy blob at the reveal's lower-left edge) */, SK[0], 0, SK[2], -2.6, 0.12, 0.04, [1, 0.92, 0.9]); // round 6b: the map as the emissive floor (emissive #6a4c30 x the map was ~1 %: it still read navy)
      // the loosened tie cord round its neck + three envelopes poking out of the open mouth
      b.geo(new THREE.TorusGeometry(0.1, 0.012, 5, 14), C("#8a6a3a"), SK[0] - 0.038, 0.565, SK[2] - 0.063, -2.6, Math.PI / 2 + 0.12, 0, 1, false);
      for (const [k, dx, dz, ry, rx] of [[0, 0.0, 0.0, 0.4, 0.5], [1, 0.05, -0.04, 1.6, -0.45], [2, -0.05, 0.03, 2.5, 0.2]] as number[][])
        b.rbox(TM("srEnv" + (k % 3), () => envelopeTex("srEnvT" + (k % 3), k % 2 === 0, ["#d8432f", "#2e8a5a", "#e0a630"][k % 3])), 0.2, 0.005, 0.12, SK[0] - 0.04 + dx, 0.7, SK[2] - 0.06 + dz, ry, rx + Math.PI / 2 * 0.8, 0.1 * k, false);
      for (let k = 0; k < 13; k++) {
        const u = k / 12, x = 0.48 + u * 0.75 + (hash(k * 3.3) - 0.5) * 0.12, z = 0.82 - u * 0.25 + (hash(k * 1.7) - 0.5) * 0.3;
        b.rbox(TM("srEnvR" + (k % 3), () => envelopeTex("srEnvT" + (k % 3), k % 2 === 0, ["#d8432f", "#2e8a5a", "#e0a630"][k % 3]), { color: new THREE.Color(0.7, 0.7, 0.7) }), 0.24, 0.005, 0.13, x, 0.008 + 0.003 * (k % 3), z, hash(k * 9.1) * 3, (hash(k) - 0.5) * 0.12, 0, false); // round 8: ~70 % (A7 P3)
      }
      // round 7: one loose envelope on the rug that the chute draft stirs (posed per frame)
      { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.13).translate(0.12, 0, 0), TM("srEnv1", () => envelopeTex("srEnvT1", false, "#2e8a5a")));
        m.material.side = THREE.DoubleSide; this.rugEnvP = V(o[0] + 0.78, o[1] + 0.016, o[2] + 0.3); m.position.copy(this.rugEnvP); m.rotation.set(-Math.PI / 2, 0, 0.8); m.castShadow = true; this.sr.add(m); this.rugEnv = m; }
      // the parcel stack front-right
      b.rbox(TM("srParcelF0", () => parcelTex2("srParcelFT0", "RETURNED")), 0.4, 0.24, 0.32, 1.76, 0.12, 0.8, 0.35);
      b.rbox(TM("srParcelF1", () => parcelTex2("srParcelFT1", "RETURN TO PARK")), 0.28, 0.17, 0.24, 1.78, 0.325, 0.78, -0.2);
      // spilled chips in the lantern pool (+ 2 glints)
      for (let k = 0; k < 9; k++) {
        const a = hash(k * 4.4) * TAU, d = 0.25 + 0.55 * hash(k * 7.3), x = LANTERN[0] - 0.25 + Math.cos(a) * d, z = LANTERN[2] + 0.35 + Math.sin(a) * d * 0.7;
        const cg = chipGeos(640 + k, 0.035 + 0.02 * hash(k * 2.2), 0.022);
        b.geo(cg.top, qzE(k * 3, 0.45), x, 0.014, z, hash(k) * 6, (hash(k * 2) - 0.5) * 0.3, (hash(k * 5) - 0.5) * 0.3); b.geo(cg.side, barkE(), x, 0.014, z, hash(k) * 6, (hash(k * 2) - 0.5) * 0.3, (hash(k * 5) - 0.5) * 0.3);
        if (k < 2) {
          const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(2.0, 1.6, 1.1), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
          st.position.set(o[0] + x, o[1] + 0.04, o[2] + z); st.layers.set(NOINK); st.renderOrder = 6; st.visible = false; this.sr.add(st); this.floorGlints.push(st);
        }
      }
      // two readable apology notes propped in the foreground (unlit, lantern-warm), caps 40+ px at 1080
      const prop = (key: string, lines: string[], paper: string, w: number, h: number, x: number, y: number, z: number, ry: number, rx: number, rz: number, big = false) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(key, () => ({ map: big ? noteTexBig(key + "T", lines, paper) : noteTex(key + "T", lines, paper), side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.86, 0.66) })));
        m.position.set(o[0] + x, o[1] + y, o[2] + z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = true; this.sr.add(m);
      };
      const cy14 = meanCam(14).pos, face = (x: number, z: number) => Math.atan2(cy14.x - (o[0] + x), cy14.z - (o[2] + z));
      // round 6 (A5 P3: the best joke notes sat at y 1430-1810 in the Shorts UI band, under the caption): BAD LUCK EVER
      // SINCE is now pinned over the bait stool's front (y ~1200-1340 at 1080 in the reveal, caps ~0.075 m = 40+ px),
      // MY DOG LIMPS NOW leans on a returned parcel right of the lantern (y ~1240-1330); both lantern-warm, unlit
      // round 6b: the reveal measured ~22 px caps on this note and the lantern hid its last letters: big-letter layout
      // (~34 px caps), the lantern stepped right; MY DOG LIMPS NOW (cut by the right frame edge in the reveal, the
      // two-shot and the end MS) is now the big card on the RETURNED WITH APOLOGIES corkboard, high in every lens
      prop("srNoteLuck6", ["BAD LUCK", "EVER SINCE"], "#fff7a8", 0.37, 0.26, BAIT.pos[0] - 0.11, BAIT.stool - 0.14, BAIT.pos[2] + 0.214, 0.06, -0.1, 0.035, true);
      { const [nx, nz] = [1.46, -0.6];
        b.rbox(TM("srParcelN6", () => parcelTex2("srParcelNT6", "RETURNED")), 0.32, 0.2, 0.26, nx, 0.1, nz, 0.25); void face; }
      for (const [k, x, y, z] of [[0, BAIT.pos[0] - 0.26, BAIT.stool - 0.03, BAIT.pos[2] + 0.226], [1, BAIT.pos[0] + 0.04, BAIT.stool - 0.025, BAIT.pos[2] + 0.226]] as number[][])
        b.geo(new THREE.SphereGeometry(0.011, 8, 6), C(k ? "#2e6fb0" : "#d8432f"), x, y, z, 0, 0, 0, 1, false); // push-pins
    }
    b.done(this.sr);
  }
  private clShafts: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; p0: THREE.Vector3; d: THREE.Vector3; w: number; len: number; ph: number }[] = [];
  private clLampPos!: THREE.Vector3; private clHalo!: THREE.Mesh; private lampHalo!: THREE.Mesh; private mugTop!: THREE.Vector3; private bucketBase!: THREE.Vector3;
  private heapTop!: (lx: number, lz: number) => P3; private glints: THREE.Sprite[] = []; private puffs: THREE.Sprite[] = [];
  private flap!: THREE.Mesh; private chute!: { S0: THREE.Vector3; S1: THREE.Vector3; u: THREE.Vector3; x: THREE.Vector3; y: THREE.Vector3; q: THREE.Quaternion };
  private mailEnv!: THREE.Mesh; private mailBox!: THREE.Mesh; private srSec!: THREE.Mesh; private moth!: THREE.Sprite; private bulbPos!: THREE.Vector3;
  private lampMotes2!: Motes;
  private bHeap!: THREE.Group; private pour: THREE.Group[] = []; private bGlints: THREE.Sprite[] = [];
  private lantern!: { halo: THREE.Mesh; glass: THREE.MeshBasicMaterial; core: THREE.MeshBasicMaterial; flame: THREE.Sprite; glow: THREE.Sprite; c: THREE.Vector3 }; private floorGlints: THREE.Sprite[] = [];
  private nightLight!: { glow: THREE.Sprite; dome: THREE.MeshBasicMaterial; p: THREE.Vector3 };
  private mailBox2!: THREE.Mesh; private hops: THREE.Group[] = []; private moths2: THREE.Sprite[] = []; private nightCloud!: THREE.Mesh;
  private mug2Top!: THREE.Vector3; private steam2: THREE.Mesh[] = []; private q2 = new THREE.Quaternion();
  // round 5
  private moonShaft!: THREE.Mesh; private moonAxes!: { d: THREE.Vector3; s0: THREE.Vector3; u0: THREE.Vector3 }; private moonMoteBase!: Float32Array; private moonMotes!: THREE.Points;
  private bulbPivot!: THREE.Group; private workBulb!: THREE.Mesh; private workHalo!: THREE.Mesh; private hatPeg!: THREE.Group; private hatShadow!: THREE.Mesh;
  private lanternPool: THREE.MeshBasicMaterial | null = null; private v2 = new THREE.Vector3(); private v3 = new THREE.Vector3(); private v4 = new THREE.Vector3();
  // round 6
  private L!: LightState; private pailMat!: THREE.MeshLambertMaterial; private rugEnv!: THREE.Mesh; private rugEnvP = new THREE.Vector3(); private workHaloCol = new THREE.Color(0.64, 0.36, 0.09);
  private cat!: THREE.Mesh; private tearSheet!: { piv: THREE.Group; sheet: THREE.Mesh; base: THREE.Vector3 }; private wallPennant: THREE.Object3D | null = null; private ceilPencil: THREE.Object3D | null = null;

  // ================================================================================================ BLUEPRINT
  private buildBlueprint() {
    const o = BP.base, b = new RB(o);
    const paper = TM("bpFloor", () => bpFloorTex());
    b.box(paper, -520, -0.1, -520, 520, 0, 520, 4, false);
    b.done(this.bp);
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), (this.grid = gridMat()));
    grid.position.set(o[0], o[1] + 0.004, o[2]); grid.layers.set(NOINK); grid.renderOrder = 1; grid.frustumCulled = false; this.bp.add(grid);
    const at = (p: [number, number][]) => p.map(([x, z]) => [x + o[0], z + o[2]] as [number, number]);
    const addLine = (pts: [number, number][], w: number, a: number, b2: number, col?: THREE.Color, pre = 0, stick = true) => {
      const { g, len } = ribbon(at(pts), w), mat = chalkLineMat(len, col), m = new THREE.Mesh(g, mat);
      m.position.y = o[1]; m.layers.set(NOINK); m.renderOrder = 2; this.bp.add(m);
      const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      this.lines.push({ mesh: m, mat, a, b: b2, pre, pts: at(pts), L, stick: stick && w >= 0.05 && b2 - a >= 4 });
      // round 4 (A3 ADD): a chalk-dust puff where every main line finishes drawing (6-8 specks)
      if (pre === 0 && w >= 0.05 && L[L.length - 1] >= 0.8) { const e = pts[pts.length - 1]; this.puffAt.push({ p: V(o[0] + e[0], o[1] + 0.04, o[2] + e[1]), f: b2 }); }
    };
    /** upright chalk drawing (local x right, y up) standing at p (x, z) facing +z, base height y0 */
    const addVLine = (pts: [number, number][], w: number, a: number, b2: number, p: [number, number], y0: number, col?: THREE.Color, out?: number) => {
      const { g, len } = ribbon(pts.map(([x, y]) => [x, -y] as [number, number]), w, 0); g.rotateX(Math.PI / 2);
      const mat = chalkLineMat(len, col), m = new THREE.Mesh(g, mat);
      m.position.set(o[0] + p[0], o[1] + y0, o[2] + p[1]); m.layers.set(NOINK); m.renderOrder = 5; this.bp.add(m);
      const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      this.lines.push({ mesh: m, mat, a, b: b2, pre: 0, pts: [], L, stick: false, out, p3: pts.map(([x, y]) => V(o[0] + p[0] + x, o[1] + y0 + y, o[2] + p[1])) });
    };
    const fillShape = (pts: [number, number][], f: number) => {
      const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
      const m = fillMat(), mesh = new THREE.Mesh(g, m); mesh.position.set(o[0], o[1] + 0.008, o[2]); mesh.layers.set(NOINK); mesh.renderOrder = 1; this.bp.add(mesh); this.fills.push({ m, f });
    };
    const flat = (tex: THREE.Texture, w: number, h: number, p: [number, number], ry: number, f: number, opacity = 1, pre = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity }));
      m.position.set(o[0] + p[0], o[1] + 0.011, o[2] + p[1]); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = 2; this.bp.add(m);
      if (pre > 0) this.fades.push({ m: m.material as THREE.MeshBasicMaterial, f, pre, full: opacity }); else this.pops.push({ obj: m, f, s: 1 });
      return m;
    };
    // the drawing sheet: a faint border pinned + taped at its corners, a coffee ring, pencil construction crosses
    const f0 = BEAT.youSee - 6, faint = new THREE.Color(0.45, 0.6, 0.92);
    const SH = { x0: -6.2, x1: 7.4, z0: -9.6, z1: 5.6 };
    addLine([[SH.x0, SH.z0], [SH.x1, SH.z0], [SH.x1, SH.z1], [SH.x0, SH.z1], [SH.x0, SH.z0]], 0.05, f0 - 8, f0 - 7, faint, 1, false);
    for (const [x, z, r] of [[SH.x0, SH.z0, 0.6], [SH.x1, SH.z0, -0.6], [SH.x1, SH.z1, 0.6], [SH.x0, SH.z1, -0.6]] as [number, number, number][]) {
      flat(bpTapeTex(), 1.3, 0.42, [x, z], r, 0, 0.75, 0.75);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), C("#d8432f")); pin.position.set(o[0] + x, o[1] + 0.07, o[2] + z); pin.castShadow = true; this.bp.add(pin);
    }
    flat(bpRingTex(), 1.5, 1.5, [-4.3, 2.1], 0.4, 0, 0.8, 0.8);
    for (const [x, z] of [[-2.6, 4.6], [3.9, 3.6], [5.8, -2.4], [-4.8, -4.6], [4.6, -7.8], [-1.2, -7.6]] as [number, number][]) {
      addLine([[x - 0.25, z], [x + 0.25, z]], 0.03, f0 - 8, f0 - 7, faint, 1, false); addLine([[x, z - 0.25], [x, z + 0.25]], 0.03, f0 - 8, f0 - 7, faint, 1, false);
    }
    // the visitor's path: two rails from behind the person to the fork, plus footstep dashes
    addLine([[-0.45, 6.5], [-0.45, 0.75]], 0.07, f0, f0 + 14);
    addLine([[0.45, 6.5], [0.45, 0.75]], 0.07, f0 + 1, f0 + 15);
    for (let k = 0; k < 5; k++) { const z = 5.6 - k * 1.05; addLine([[(k % 2 ? 0.12 : -0.12), z], [(k % 2 ? 0.12 : -0.12), z - 0.3]], 0.09, f0 + 3 + k * 2, f0 + 5 + k * 2); }
    // a dashed circle marker around the person
    const circ: [number, number][] = []; for (let k = 0; k <= 40; k++) { const a = (k / 40) * TAU; circ.push([BP.person[0] + Math.cos(a) * 0.75, BP.person[2] + Math.sin(a) * 0.75]); }
    for (let k = 0; k < 40; k += 2) addLine(circ.slice(k, k + 2), 0.05, f0 + 8 + k * 0.3, f0 + 9 + k * 0.3);
    // the two branches: flat arrows drawn as outlines + a soft fill; "THE RULE" thin, "EVERYONE ELSE" wide
    const arrow = (base: [number, number], to: V3, len: number, w: number, hw: number, hl: number, a: number, dur: number) => {
      const dir = Math.atan2(to[0] - base[0], -(to[2] - base[1]));
      const ux = Math.sin(dir), uz = -Math.cos(dir), vx = -uz, vz = ux; // u along the branch, v across (to its right)
      const P = (s: number, t: number): [number, number] => [base[0] + ux * s + vx * t, base[1] + uz * s + vz * t];
      const pts = [P(0, -w / 2), P(len - hl, -w / 2), P(len - hl, -hw / 2), P(len, 0), P(len - hl, hw / 2), P(len - hl, w / 2), P(0, w / 2)];
      // round 5 (A4 ADD): a faint construction ghost of the outline, offset ~6 cm, drawn just ahead of the real line (as
      // if the arrow was sketched once and redrawn), plus pencil tick marks at its corners
      addLine(pts.map(([x, z]) => [x + 0.065, z - 0.05] as [number, number]), 0.03, a - 4, a + dur - 5, new THREE.Color(0.42, 0.56, 0.9));
      for (const q of [pts[1], pts[3], pts[5]]) { addLine([[q[0] - 0.16, q[1] + 0.03], [q[0] + 0.16, q[1] - 0.03]], 0.022, a + dur - 2, a + dur, new THREE.Color(0.5, 0.63, 0.95), 0, false); }
      addLine(pts, 0.08, a, a + dur);
      fillShape(pts, a + dur);
      this.puffAt.push({ p: V(o[0] + P(len, 0)[0], o[1] + 0.05, o[2] + P(len, 0)[1]), f: a + dur });
      return P;
    };
    const rule = arrow([-0.42, 0.42], BP.ruleFigure, BP.ruleArrow.len, 0.42, 1.0, 0.9, BEAT.copyRules - 8, 16);
    const crowd = arrow([1.1, 0.1], BP.crowd, BP.crowdArrow.len, 2.0, 3.0, 1.3, BEAT.copyEach + 6, 16);
    // the fork's junction: the path rails open into both arrows (outer rails to the outer edges, an inner cusp)
    addLine([[-0.45, 0.75], rule(0, -0.21)], 0.07, BEAT.copyRules - 10, BEAT.copyRules - 8);
    addLine([[0.45, 0.75], [0.3, 0.6], rule(0, 0.21)], 0.07, BEAT.copyRules - 10, BEAT.copyRules - 8);
    addLine([[0.45, 0.75], crowd(0, 1.0)], 0.07, BEAT.copyEach + 3, BEAT.copyEach + 6);
    addLine([rule(0, 0.21), crowd(0, -1.0)], 0.07, BEAT.copyEach + 3, BEAT.copyEach + 6);
    // dimension lines beside each arrow (end ticks + arrowheads), self-drawing on "rules" and "each other"
    const dim = (P: (s: number, t: number) => [number, number], len: number, off: number, a: number, label: string, key: string) => {
      const s0 = 0.6, s1 = len - 0.5;
      addLine([P(s0, off), P(s1, off)], 0.035, a, a + 12, faint);
      for (const s of [s0, s1]) addLine([P(s, off - 0.22), P(s, off + 0.22)], 0.035, a + (s === s0 ? 0 : 11), a + (s === s0 ? 2 : 13), faint);
      for (const [s, d] of [[s0, 1], [s1, -1]] as [number, number][]) addLine([P(s + d * 0.3, off - 0.12), P(s, off), P(s + d * 0.3, off + 0.12)], 0.035, a + 12, a + 15, faint);
      const mid = P((s0 + s1) / 2, off + Math.sign(off) * 0.42), dirA = Math.atan2(P(1, off)[0] - P(0, off)[0], P(1, off)[1] - P(0, off)[1]);
      flat(bpNoteTex(key, label, 512, 128), 1.6, 0.4, mid, dirA + Math.PI / 2, a + 14);
    };
    dim(rule, BP.ruleArrow.len, -0.85, BEAT.copyRules - 2, "1 PERSON", "bpDim1");
    dim(crowd, BP.crowdArrow.len, 2.2, BEAT.eachOther - 2, "MOST PEOPLE", "bpDim2");
    // round 4 (A3 ADD): the crowd arrow's WIDTH is dimensioned like a drawing (in frame, unlike the side dimension): a
    // self-drawing line across its root with end ticks + arrowheads and "~600,000 VISITORS / YR" (the park's yearly
    // visitors, mirroring 1 PERSON on THE RULE), drawn on "each other"
    {
      const s0 = 1.25, a = BEAT.eachOther - 2, t0 = -0.98, t1 = 0.98;
      addLine([crowd(s0, t0), crowd(s0, t1)], 0.035, a, a + 10, faint);
      for (const t of [t0, t1]) addLine([crowd(s0 - 0.2, t), crowd(s0 + 0.2, t)], 0.035, a + (t === t0 ? 0 : 9), a + (t === t0 ? 2 : 11), faint);
      for (const [t, d] of [[t0, 1], [t1, -1]] as [number, number][]) addLine([crowd(s0 - 0.11, t + d * 0.26), crowd(s0, t), crowd(s0 + 0.11, t + d * 0.26)], 0.035, a + 10, a + 13, faint);
      const lp = crowd(0.66, 0.22), dv = Math.atan2(crowd(0, 1)[1] - crowd(0, 0)[1], crowd(0, 1)[0] - crowd(0, 0)[0]);
      flat(bpNoteTex2("bpDimCrowd4", ["~600,000", "VISITORS / YR"], 768, 256), 1.3, 0.43, lp, -dv, a + 12);
    }
    // footprints: one lonely trail on THE RULE vs dozens overlapping on EVERYONE ELSE
    const fp = bpFootTex();
    for (let k = 0; k < 6; k++) { const s = 0.9 + k * 0.85, p = rule(s, k % 2 ? 0.07 : -0.07); flat(fp, 0.22, 0.3, p, Math.atan2(rule(1, 0)[0] - rule(0, 0)[0], rule(1, 0)[1] - rule(0, 0)[1]) + Math.PI, BEAT.copyRules + 6 + k * 2, 0.8); }
    // round 5 (A4 P2: the EVERYONE ELSE side read as a still drawing): the crowd's footprints are a STREAM: they ink in
    // along the arrow and then pulse in a wave travelling up the branch at ~1.2 m/s (walkers passing), never all still
    for (let k = 0; k < 56; k++) {
      const s = 0.8 + hash(k * 3.1) * 5.0, tt = (hash(k * 5.3) - 0.5) * 1.7, p = crowd(s, tt), ang = Math.atan2(crowd(1, 0)[0] - crowd(0, 0)[0], crowd(1, 0)[1] - crowd(0, 0)[1]) + Math.PI + (hash(k) - 0.5) * 0.5;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: fp, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
      m.position.set(o[0] + p[0], o[1] + 0.011, o[2] + p[1]); m.rotation.y = ang; m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.bp.add(m);
      this.crowdPrints.push({ m, s, ph: hash(k * 7.7) + 0.04 * k });
    }
    // round 5 (A4 ADD): on "everyone" a red-pencil scribble loops twice round the crowd's end of the branch (self-drawing
    // in 16 f), so the reveal names who "everyone" is
    { const c0 = crowd(4.1, 0.15), rx = 2.05, rz = 2.5, sc: [number, number][] = [];
      for (let k = 0; k <= 120; k++) { const a = -0.6 + (k / 120) * TAU * 2.08, j = 1 + 0.05 * Math.sin(a * 3.3) + 0.04 * (k / 120); sc.push([c0[0] + Math.cos(a) * rx * j, c0[1] + Math.sin(a) * rz * j]); }
      addLine(sc, 0.085, BEAT.everyone - 2, BEAT.everyone + 14, new THREE.Color(1.45, 0.32, 0.26), 0, false); }
    // chalk-dust puffs where each multiplying thief lands on the paper (3 specks each)
    for (let k = 0; k < 96; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.85, 0.9, 1.0), transparent: true, depthWrite: false, opacity: 0 })); s.layers.set(NOINK); s.visible = false; this.bp.add(s); this.thiefPuffs.push(s); }
    // round 4 (A3 ADD): his OWN chalk footprints pop up behind him as he walks off after the crowd (cast.ts walk:
    // copyEach + 2 .. manySteal - 2 at 1.4 m/s along [0.33, -0.94] from BP.person); a print appears ~0.24 m behind him
    {
      const w0 = BEAT.copyEach + 2, dir: [number, number] = [0.33, -0.94], ang = Math.atan2(dir[0], dir[1]) + Math.PI, sMax = ((BEAT.manySteal - 2 - w0) / FPS) * 1.4;
      for (let k = 0; k < 12; k++) {
        const s = 0.16 + k * 0.21; if (s > sMax - 0.1) break;
        const side = k % 2 ? 0.075 : -0.075, p: [number, number] = [BP.person[0] + dir[0] * s - dir[1] * side, BP.person[2] + dir[1] * s + dir[0] * side];
        flat(fp, 0.17, 0.24, p, ang, w0 + ((s + 0.24) / 1.4) * FPS, 0.78);
      }
    }
    // chalk tallies: "1" under the lonely figure, IIII IIII IIII beside the crowd
    flat(bpNoteTex("bpTally1", "1", 256, 256), 0.7, 0.7, [BP.ruleFigure[0] - 0.9, BP.ruleFigure[2] + 0.5], 0.2, BEAT.copyRules + 10);
    flat(bpTallyTex(), 2.6, 0.75, [BP.crowd[0] - 2.9, BP.crowd[2] + 1.9], 0.25, BEAT.eachOther + 12);
    // construction arcs + ticks + a compass mark (faint, shown at 60 % from the first frame so the dissolve reads as a drawing)
    const arc: [number, number][] = []; for (let k = 0; k <= 48; k++) { const a = -0.95 + (k / 48) * 1.9; arc.push([Math.sin(a) * 4.0, -Math.cos(a) * 4.0]); }
    addLine(arc, 0.035, f0 + 6, f0 + 30, new THREE.Color(0.5, 0.65, 0.95));
    for (let k = 0; k <= 8; k++) { const a = -0.95 + (k / 8) * 1.9; addLine([[Math.sin(a) * 3.85, -Math.cos(a) * 3.85], [Math.sin(a) * 4.15, -Math.cos(a) * 4.15]], 0.03, f0 + 8 + k * 2, f0 + 10 + k * 2, new THREE.Color(0.5, 0.65, 0.95)); }
    const cp = [-3.0, 3.4] as const;
    addLine([[cp[0], cp[1] + 0.6], [cp[0], cp[1] - 0.6]], 0.03, f0 + 14, f0 + 20, new THREE.Color(0.55, 0.7, 1.0), 0.6);
    addLine([[cp[0] - 0.6, cp[1]], [cp[0] + 0.6, cp[1]]], 0.03, f0 + 16, f0 + 22, new THREE.Color(0.55, 0.7, 1.0), 0.6);
    addLine([[cp[0] - 0.15, cp[1] - 0.35], [cp[0], cp[1] - 0.75], [cp[0] + 0.15, cp[1] - 0.35]], 0.03, f0 + 20, f0 + 24, new THREE.Color(0.55, 0.7, 1.0), 0.6);
    // upright arrow-sign labels standing at each branch (face the lens each frame, pop in when the branch is drawn);
    // drawn after the crowd cards (renderOrder 6) but still depth-tested, so they sit on top of the crowd and behind the panel
    const label = (key: string, text: string, w: number, h: number, p: [number, number], y: number, f: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: labelTex(key, text, Math.round(512 * (w / h)), 512), transparent: true, depthWrite: false, color: new THREE.Color(1.3, 1.34, 1.4), fog: false }));
      m.position.set(o[0] + p[0], o[1] + y, o[2] + p[1]); m.layers.set(NOINK); m.renderOrder = 6; this.bp.add(m); this.labels.push(m); this.pops.push({ obj: m, f, s: 1 });
      const post = new THREE.Mesh(new THREE.PlaneGeometry(0.035, y - h / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.92, 1.0), transparent: true, opacity: 0.8, depthWrite: false }));
      post.position.set(o[0] + p[0], o[1] + (y - h / 2) / 2, o[2] + p[1]); post.layers.set(NOINK); post.renderOrder = 6; this.bp.add(post); this.labels.push(post); this.pops.push({ obj: post, f, s: 1 });
    };
    void label;
    // round 5 (A4 P1: both labels were cut by the frame edges or hidden behind the floating panel from 1520 to 1690 video,
    // letters 17-30 px): two-line labels with ~2.3x bigger letters (caps ~0.2 m: 40-50 px at 1080 in every shot-11 lens),
    // placed with scripts/search*_wint.mjs against camAt(11) so each is WHOLE from its pop to the reveal:
    //  - THE RULE beside its branch, left of the panel (x 54-414 px at 1244-1395, never under the panel);
    //  - EVERYONE ELSE on a tall post planted in the crowd stream: it pops at its low height (top-right, whole while the
    //    VO says "We copy each other"), and as the panel flies in on "Many people steal" it climbs its pole (the chalk
    //    post redraws taller) to sit ABOVE the panel's top-right corner for the whole hold (x 580-960, y 80-330)
    const label5 = (key: string, lines: string[], w: number, h: number, p: [number, number], y: number, f: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: labelTex5(key, lines, Math.round(512 * (w / h)), 512), transparent: true, depthWrite: false, color: new THREE.Color(1.3, 1.34, 1.4), fog: false }));
      m.position.set(o[0] + p[0], o[1] + y, o[2] + p[1]); m.layers.set(NOINK); m.renderOrder = 6; this.bp.add(m); this.labels.push(m); this.pops.push({ obj: m, f, s: 1 });
      const pg = new THREE.PlaneGeometry(0.04, 1).translate(0, 0.5, 0);
      const post = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.92, 1.0), transparent: true, opacity: 0.85, depthWrite: false }));
      post.position.set(o[0] + p[0], o[1], o[2] + p[1]); post.scale.y = y - h / 2; post.layers.set(NOINK); post.renderOrder = 6; this.bp.add(post); this.labels.push(post);
      // the post draws itself up from the floor in 6 f as the label pops (a chalk line), then stays
      this.posts5.push({ post, label: m, f, h });
      return m;
    };
    // round 7 (A6 P3: it popped 4-7 f AFTER 'rules.' began): the THE RULE label pops 2.5 VIDEO f before the word, in
    // 3 video f (scale 0 -> 1.1 -> 1); its chalk post grows with it
    label5("bpRule5", ["THE", "RULE"], 0.95, 0.76, [LBL5.rule[0], LBL5.rule[2]], LBL5.rule[1], PV(toV(BEAT.copyRules) - 2.5));
    this.pops[this.pops.length - 1].vd = 3;
    // round 8 (A7 P3: it first popped on the backdrop ruler's base line, then the landing panel covered it): it pops at
    // its FINAL spot above the panel's landing (LBL5.eeHigh) and never moves; the panel now slides in from the right,
    // under it (poseBlueprint), so nothing ever crosses it
    this.eeLabel = label5("bpCrowd5", ["EVERYONE", "ELSE"], 1.56, 0.8, [LBL5.ee[0], LBL5.ee[2]], LBL5.eeHigh, BEAT.eachOther + 2);
    // a chalk arrow on the EVERYONE ELSE pole, pointing down into the crowd (rides with the label)
    { const ar: [number, number][] = [[-0.16, 0.0], [0.0, -0.22], [0.16, 0.0]], gq = ribbon(ar.map(([x, y]) => [x, -y] as [number, number]), 0.05, 0); gq.g.rotateX(Math.PI / 2);
      const am = new THREE.Mesh(gq.g, chalkLineMat(gq.len)); am.layers.set(NOINK); am.renderOrder = 6; am.visible = false; this.bp.add(am); this.eeArrow = am; }
    // the sheet's title block, flat on the floor in front of the visitor (pre-shown at 60 %)
    // round 4 (A3 P3): 1.16 x 0.46 m between the right rail / the dashed circle (x >= 0.8) and the frame's right edge
    // (x <= 1.96 at z 2.1 on the tightest lens, f1290); square to the sheet, so no rail crosses it
    const tb = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.46).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bpTitleBlockTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1) }));
    tb.position.set(o[0] + 1.38, o[1] + 0.012, o[2] + 2.1); tb.layers.set(NOINK); tb.renderOrder = 2; this.bp.add(tb);
    this.fades.push({ m: tb.material as THREE.MeshBasicMaterial, f: f0 + 10, pre: 0.6, full: 1 });
    flat(bpNoteTex("bpN", "N"), 0.9, 0.225, [cp[0], cp[1] - 1.05], 0, f0 + 22, 1, 0.6);
    // the drafting backdrop: a translucent sheet standing far behind the diagram (title, ruler, protractor, tape)
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(34, 10.5), new THREE.MeshBasicMaterial({ map: bpBackTex(), transparent: true, depthWrite: false, fog: true, color: new THREE.Color(1, 1, 1) }));
    bd.position.set(o[0] + 0.6, o[1] + 5.1, o[2] - 13.5); bd.layers.set(NOINK); bd.renderOrder = 1; this.bp.add(bd);
    this.fades.push({ m: bd.material as THREE.MeshBasicMaterial, f: f0 + 4, pre: 0.55, full: 0.85 });
    // round 5 (A4 P2: "FIG. 1 / HOW PEOPLE DECIDE" cut at the left edge and overlapped by the panel's top-left corner at
    // 1586-1690 video): ONE compact cartouche (FIG. 1 / HOW PEOPLE / DECIDE + scale / N.T.S. / REV. 2 + an APPROVED
    // stamp), 2.0 x 1.11 m standing 7 m back, searched against camAt(11) so it sits whole above the panel's top-left,
    // inside x 40-570 px and clear of the EVERYONE ELSE label at every hold lens (1298-1386); the old 6 m title, the
    // 9 m strip and the high N.T.S. note are folded into it
    void bpTitleTex; void bpTopTex4;
    const ttl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0 / 1.8), new THREE.MeshBasicMaterial({ map: bpCartoucheTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.22, 1.25, 1.3) }));
    ttl.position.set(o[0] + LBL5.title[0], o[1] + LBL5.title[1], o[2] + LBL5.title[2]); ttl.layers.set(NOINK); ttl.renderOrder = 1; this.bp.add(ttl);
    this.fades.push({ m: ttl.material as THREE.MeshBasicMaterial, f: f0 + 4, pre: 0.6, full: 1 });
    // drafting tools lying on the sheet + eraser crumbs by the title block
    flat(bpToolTex(0), 1.7, 1.7, [-3.3, 1.2], 0.35, 0, 0.6, 0.6);
    flat(bpToolTex(1), 1.5, 1.5, [3.9, 0.9], -0.5, 0, 0.6, 0.6);
    for (let k = 0; k < 14; k++) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.05 + 0.04 * hash(k), 0.025, 0.035), basic("bpCrumb", () => ({ color: new THREE.Color(0.86, 0.66, 0.7) })));
      cr.position.set(o[0] + 1.38 + (hash(k * 2.1) - 0.5) * 0.9, o[1] + 0.013, o[2] + 2.47 + (hash(k * 3.9) - 0.5) * 0.18); cr.rotation.y = hash(k) * 3; this.bp.add(cr); this.crumbs.push({ m: cr, p: cr.position.clone(), k }); }
    // round 4 (A3 ADD): blueprint-on-a-desk cues at the frame edges, 3D so they throw soft blue shadows: a giant
    // yellow pencil lying on the sheet (lower left), a pink eraser in a blue sleeve + crumbs + soft eraser smudges
    // (right), and a corner of tracing paper taped down with a red push-pin (lower right)
    {
      const pb2 = new RB(o), pd = V(1.5, 0, -1.65).normalize(), L = 2.3, c0 = V(-2.45, 0.075, 3.35);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), pd), qh = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 6));
      const at2 = (d: number) => c0.clone().addScaledVector(pd, d);
      pb2.ori(new THREE.CylinderGeometry(0.075, 0.075, L, 6), C("#f2c23a"), at2(L / 2), qh);
      pb2.ori(new THREE.CylinderGeometry(0.0765, 0.0765, 0.03, 6), C("#2e6a3e"), at2(L - 0.05), qh);
      pb2.ori(new THREE.CylinderGeometry(0.079, 0.079, 0.14, 12), C("#c0c6ce"), at2(-0.07), q);
      pb2.ori(new THREE.CylinderGeometry(0.072, 0.072, 0.16, 12), C("#ec8c9c"), at2(-0.22), q);
      pb2.ori(new THREE.CylinderGeometry(0.0, 0.074, 0.3, 6), C("#e8c89a"), at2(L + 0.15), qh);
      pb2.ori(new THREE.CylinderGeometry(0.0, 0.022, 0.085, 6), C("#3a3a44"), at2(L + 0.258), qh);
      pb2.rbox(C("#f08c9c"), 0.5, 0.15, 0.26, 2.05, 0.075, 1.3, 0.45);
      pb2.rbox(C("#2e5aa8"), 0.22, 0.158, 0.268, 2.0, 0.077, 1.32, 0.45);
      for (let k = 0; k < 10; k++) pb2.rbox(C("#f2a0ae"), 0.035 + 0.03 * hash(k * 1.3), 0.02, 0.03, 1.75 + (hash(k * 2.7) - 0.5) * 0.7, 0.01, 1.05 + (hash(k * 4.1) - 0.5) * 0.6, hash(k) * 3, 0, 0, false);
      pb2.done(this.bp);
      for (const [x, z, sx, r] of [[1.65, 0.85, 1.0, 0.4], [2.35, 1.75, 0.8, -0.3], [-1.75, 2.55, 0.9, 0.8]] as [number, number, number, number][]) {
        const sm0 = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * sx, 0.5 * sx).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.11, 0.13, 0.17), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        sm0.position.set(o[0] + x, o[1] + 0.01, o[2] + z); sm0.rotation.y = r; sm0.layers.set(NOINK); sm0.renderOrder = 1; this.bp.add(sm0);
      }
      // round 7 (A6 P2: a flat untextured grey trapezoid that read as a render glitch): a real sheet of tracing paper,
      // off-white with a printed border, pencil construction lines, a FIG. 1a sketch and a curled corner, at ~60 %
      const tr = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bpTracingTex(), color: new THREE.Color(0.97, 0.98, 1.0), transparent: true, opacity: 0.62, depthWrite: false, fog: false }));
      tr.position.set(o[0] + 3.35, o[1] + 0.009, o[2] + 3.0); tr.rotation.y = 0.35; tr.layers.set(NOINK); tr.renderOrder = 1; this.bp.add(tr);
      flat(bpTapeTex(), 0.62, 0.2, [2.2, 2.72], 0.35 + 0.78, 0, 0.85, 1);
      const pin2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), C("#d8432f")); pin2.position.set(o[0] + 2.32, o[1] + 0.06, o[2] + 2.82); pin2.castShadow = true; this.bp.add(pin2);
    }
    // the sheet is brighter toward the fork (radial falloff, additive): depth instead of a flat PowerPoint blue
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.07, 0.1, 0.17), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    fg.position.set(o[0] + 0.4, o[1] + 0.006, o[2] - 0.6); fg.layers.set(NOINK); fg.renderOrder = 1; this.bp.add(fg);
    // ---- the floating MANY VISITORS TAKE THE WOOD. panel: Sign B's face art (round 8: its own copy, bpSignTex), frame wood and posts ----
    this.sign = new THREE.Group();
    const S = BPS, faceMat = new THREE.MeshBasicMaterial({ map: bpSignTex(), color: new THREE.Color(0.97, 0.97, 0.97) });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(S, S), faceMat); face.position.z = 0.031; face.castShadow = true; this.sign.add(face); this.signFace = faceMat;
    const frWood = lam("atBeamDark", () => ({ map: parkWood("#85593a", false) })), postWood = lam("atPostDark", () => ({ map: parkWood("#94663f", true) }));
    const fr = new THREE.Mesh(new THREE.BoxGeometry(S + 0.1, S + 0.1, 0.06), frWood); fr.castShadow = true; fr.receiveShadow = true; this.sign.add(fr);
    for (const dx of [-0.38, 0.38]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.09), postWood); p.position.set(dx * S / 0.92, -S / 2 - 0.33, -0.03); p.castShadow = true; this.sign.add(p); }
    // faint chalk rim glow around the frame (additive)
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(S + 0.7, S + 0.7), new THREE.MeshBasicMaterial({ map: bpRimTex(), color: new THREE.Color(0.16, 0.2, 0.26), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    rim.position.z = -0.04; rim.layers.set(NOINK); rim.renderOrder = 3; this.sign.add(rim);
    this.bp.add(this.sign);
    // round 8 (A7 ADD): a chalk-dust ring puffs up from the paper under each post as the panel lands (fa + 16)
    for (const dx of [-0.38, 0.38]) this.puffAt.push({ p: V(o[0] + BP.signFloat[0] + (dx * BPS) / 0.92, o[1] + 0.04, o[2] + BP.signFloat[2] - 0.03), f: BEAT.manySteal + 12 });
    // its soft navy contact shadow on the paper (grows as it settles)
    this.signShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color("#0d2348"), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.signShadow.layers.set(NOINK); this.signShadow.renderOrder = 2; this.bp.add(this.signShadow);
    // round 4 (A3 P3: the posts ended in mid-air): a chalk scribble ellipse (35 %) under each post + a short cool-blue
    // drop shadow offset 0.15 m toward the lens, faded in once the panel has settled
    for (let k = 0; k < 2; k++) {
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bpScribTex(), transparent: true, opacity: 0, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -3 }));
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color("#123f86"), transparent: true, opacity: 0, depthWrite: false, fog: false }));
      for (const m of [sc, sh]) { m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.bp.add(m); }
      this.postMarks.push({ sc, sh });
    }
    // "doesn't sound like a warning": a chalk "?" scribble beside the panel; "sounds like what everyone does": an
    // "=" arrow from the panel to the crowd
    const rest = BP.signFloat, qx = rest[0] + S / 2 + 0.5;
    const q: [number, number][] = []; for (let k = 0; k <= 18; k++) { const a = Math.PI * 1.05 - (k / 18) * Math.PI * 1.45; q.push([Math.cos(a) * 0.2, 0.42 + Math.sin(a) * 0.2]); }
    q.push([0.02, 0.12], [0.02, -0.02]);
    addVLine(q, 0.06, BEAT.warning2 - 2, BEAT.warning2 + 10, [qx, rest[2] + 0.2], rest[1] + 0.25);
    const dot: [number, number][] = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * TAU; dot.push([0.02 + Math.cos(a) * 0.04, -0.17 + Math.sin(a) * 0.04]); }
    addVLine(dot, 0.05, BEAT.warning2 + 10, BEAT.warning2 + 12, [qx, rest[2] + 0.2], rest[1] + 0.25);
    const e0: [number, number] = [rest[0] + 0.9, rest[2] + 0.7], e1: [number, number] = [BP.crowd[0] - 1.1, BP.crowd[2] + 1.9];
    const ea: [number, number][] = []; for (let k = 0; k <= 16; k++) { const u = k / 16; ea.push([lerp(e0[0], e1[0], u) + Math.sin(u * Math.PI) * 0.9, lerp(e0[1], e1[1], u)]); }
    addLine(ea, 0.08, BEAT.sounds, BEAT.sounds + 12);
    const ed = Math.atan2(e1[0] - ea[15][0], e1[1] - ea[15][1]);
    addLine([[e1[0] - Math.sin(ed + 0.5) * 0.45, e1[1] - Math.cos(ed + 0.5) * 0.45], e1, [e1[0] - Math.sin(ed - 0.5) * 0.45, e1[1] - Math.cos(ed - 0.5) * 0.45]], 0.08, BEAT.sounds + 12, BEAT.sounds + 14);
    const em = ea[8];
    addVLine([[-0.24, 0.1], [0.24, 0.1]], 0.07, BEAT.sounds + 4, BEAT.sounds + 7, [em[0], em[1]], 0.45);
    addVLine([[-0.24, -0.1], [0.24, -0.1]], 0.07, BEAT.sounds + 7, BEAT.sounds + 10, [em[0], em[1]], 0.45);
    // the thieves that multiply out of the picture: pictogram cut-outs (Sign B style) that land standing on the paper
    const tg = new THREE.PlaneGeometry(0.37, 0.55); tg.translate(0, 0.275, 0);
    for (let i = 0; i < THIEF_N; i++) { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ map: pictoTex(0, i % 2), transparent: true, alphaTest: 0.35, depthWrite: true, color: new THREE.Color(0.97, 0.97, 0.97) })); m.visible = false; m.layers.set(NOINK); m.renderOrder = 5; this.bp.add(m); this.thieves.push(m); }
    // chalk sticks that lead each self-drawing line, with a few dust grains at the tip; dust puffs where arrows finish
    for (let k = 0; k < 6; k++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.2, 8).translate(0, 0.1, 0), basic("bpChalkStick", () => ({ color: new THREE.Color(0.95, 0.96, 0.98) })));
      st.visible = false; st.layers.set(NOINK); this.bp.add(st); this.sticks.push(st);
    }
    for (let k = 0; k < 84; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.85, 0.9, 1.0), transparent: true, depthWrite: false, opacity: 0 })); s.layers.set(NOINK); s.visible = false; this.bp.add(s); this.bpPuffs.push(s); }
    // round 7 (A6 ADD): chalk-dust specks shed at the draw head of every line while it draws (fall 10-14 f)
    for (let k = 0; k < 120; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(0.92, 0.96, 1.05), transparent: true, depthWrite: false, opacity: 0 })); s.layers.set(NOINK); s.visible = false; this.bp.add(s); this.headDust.push(s); }
    this.bpDust = new Motes(this.bp, 80, 31, o, [-5, 0.1, -8], [5, 4.5, 6], new THREE.Color(0.7, 0.9, 1.4), 0.07, 0.15);
    // ---- round 6 (A5 P2: the wide's top ~17 % was empty blue): drafting furniture that writes itself into the band
    // above the FIG. 1 cartouche once the panel has landed (searched against camAt(11): plane z -7.3 sees y ~5.0-7.8 at
    // the hold lenses): a compass rose (top left), a 0-3 m scale bar over the cartouche, a dimension chain across the
    // top, the SHEET 2 / 3 - FIELD TEST title block (top right) and a FIG. 2: COPY cartouche left of FIG. 1; plus the
    // shot-10 counters coming back as chalk notes: 1.67 % over THE RULE (on "rules") and 7.92 % riding over EVERYONE
    // ELSE (on "each other")
    {
      const zP = -7.3, land = BEAT.manySteal + 9;
      const up = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, a: number, dur: number, col?: THREE.Color) => {
        const mat = wipeMat(tex, col), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(o[0] + x, o[1] + y, o[2] + z); m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.bp.add(m);
        this.wipes.push({ m, mat, a, b: a + dur }); return m;
      };
      up(bpCompassTex(), 1.05, 1.05, -2.6, 6.75, zP, land + 8, 12);
      up(bpScaleBarTex(), 2.0, 0.375, -0.7, 6.22, zP, land + 13, 11);
      up(bpSheetTex(), 2.0, 0.78, 2.9, 6.8, zP, land + 4, 13);
      up(bpFig2Tex(), 1.1, 0.367, -2.58, 5.95, zP, land + 18, 12); // under the compass, clear of FIG. 1
      // dimension chain across the top: a line with end ticks, mid tick and arrowheads + two chalk figures
      const dy = 7.05, x0 = -1.75, x1 = 1.85, xm = 0.1, a0 = land;
      addVLine([[x0, 0], [x1, 0]], 0.05, a0, a0 + 12, [0, zP + 0.05], dy);
      for (const [x, k] of [[x0, 0], [xm, 5], [x1, 11]] as number[][]) addVLine([[x, -0.16], [x, 0.16]], 0.045, a0 + k, a0 + k + 2, [0, zP + 0.05], dy);
      for (const [x, d] of [[x0, 1], [xm, -1], [xm, 1], [x1, -1]] as number[][]) addVLine([[x + d * 0.22, -0.09], [x, 0], [x + d * 0.22, 0.09]], 0.045, a0 + 12, a0 + 14, [0, zP + 0.05], dy);
      up(bpNoteTex2("bpDimA6", ["1.85 m"], 512, 160), 0.85, 0.27, (x0 + xm) / 2, dy + 0.24, zP + 0.05, a0 + 13, 6);
      up(bpNoteTex2("bpDimB6", ["1.75 m"], 512, 160), 0.85, 0.27, (xm + x1) / 2, dy + 0.24, zP + 0.05, a0 + 15, 6);
      // the shot-10 counters, back as chalk: 1.67 % over THE RULE (left of the panel), 7.92 % over EVERYONE ELSE
      up(bpPctTex("bpPct1", "1.67 %"), 0.95, 0.37, LBL5.rule[0] - 0.05, LBL5.rule[1] + 1.22, LBL5.rule[2] + 0.02, BEAT.copyRules + 9, 12); // above the backdrop ruler line
      this.pct8 = up(bpPctTex("bpPct8", "7.92 %"), 1.15, 0.45, LBL5.ee[0], LBL5.ee[1] + 0.7, LBL5.ee[2] + 0.02, BEAT.eachOther + 9, 12);
    }
    // ---- round 6 (A5 P2: EVERYONE ELSE read as ~14 static figures in one clump): a receding chalk CROWD on the wide
    // arrow behind / right of the cast's stream: 6 rows (s 2.3 .. 6.4 m along the branch), 36 walkers on 2-drawing walk
    // cycles in place toward the arrow head (bob ~3 %, 10-12 video-f cycle, random phase), ~20 % carrying an orange
    // chip; they ink in row by row on "each other" and every head snaps back up toward the panel as it lands
    {
      const dir = Math.atan2(BP.crowd[0] - 1.1, -(BP.crowd[2] - 0.1)), ux = Math.sin(dir), uz = -Math.cos(dir), vx = -uz, vz = ux;
      const rows: [number, number, number, number][] = [[2.3, 6, -0.05, 0.95], [3.1, 7, -0.15, 1.0], [3.9, 8, -0.3, 1.05], [4.7, 8, -0.4, 1.1], [5.6, 9, -1.3, 1.35], [6.4, 8, -1.0, 1.0]]; // round 6b: 46 walkers (A5 P2 asked 40-60)
      const g = new THREE.PlaneGeometry(0.36, 0.72).translate(0, 0.36, 0); let k = 0;
      rows.forEach(([s, n, t0, t1], r) => {
        for (let i = 0; i < n; i++, k++) {
          const tt = lerp(t0, t1, n > 1 ? i / (n - 1) : 0.5) + (hash(k * 2.3) - 0.5) * 0.18, ss = s + (hash(k * 4.1) - 0.5) * 0.35;
          const x = 1.1 + ux * ss + vx * tt, z = 0.1 + uz * ss + vz * tt, chip = hash(k * 7.7) < 0.22 ? 1 : 0;
          const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: chalkWalkerTex(0, 0, chip), transparent: true, alphaTest: 0.3, depthWrite: true, color: new THREE.Color(1.18, 1.22, 1.3), fog: false }));
          m.position.set(o[0] + x, o[1], o[2] + z); m.layers.set(NOINK); m.renderOrder = 5; m.visible = false; this.bp.add(m);
          this.walkers.push({ m, ph: hash(k * 3.9), per: 10 + 2 * hash(k * 5.5), f0: BEAT.eachOther + 1 + r * 2 + 2 * hash(k * 1.9), look: BEAT.manySteal + 5 + 2 * hash(k * 6.1), chip, h: 0.92 + 0.16 * hash(k * 8.3),
            s: ss, t: tt, k, early: k % 9 === 4 ? PV(toV(BEAT.manySteal) - 4) + 2 * hash(k * 2.7) : 1e9 });
        }
      });
    }
    // ---- round 7 (A6 P2: the pivot opened on the emptiest frame of the film, the top ~35 % flat blue through the silent
    // pause after 'You see,'): drafting marks standing in the opening lens's top band (bp z -3.3 .. -4.6, y 2.2 .. 3.6;
    // projected with scripts/project_wint.mjs at picture 1216-1240), ONE NEW MARK EVERY ~6-8 VIDEO FRAMES across the pause:
    // the PROBLEM / WHY DO PEOPLE STEAL? strip writes itself (video ~1612-1630), a compass rose spins in (~1618-1632), a
    // dimension arrow grows under the strip with chalk dust at its head (~1622-1638), a red-pencil ring circles STEAL?
    // (~1633-1641) and a SAMPLE 14 T log-slice doodle writes in at the top left (~1628-1642). All of it is rubbed out
    // (6 f fade) as THE RULE takes over (video ~1664), before the labels, the 1.67 % note and the panel use that space
    {
      const yv = toV(BEAT.youSee), P = (dv: number) => PV(yv + dv), rub = P(63), zS = -4.4;
      const up7 = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, a: number, b2: number, col?: THREE.Color) => {
        const mat = wipeMat(tex, col), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(o[0] + x, o[1] + y, o[2] + z); m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.bp.add(m);
        this.wipes.push({ m, mat, a, b: b2, out: rub }); return m;
      };
      up7(bpProblemTex(), 3.3, 0.97, 0.15, 2.85, zS, P(11), P(29)); // (y 2.85: whole inside the opening lens, y ~50-250 px)
      this.compass7 = up7(bpCompassTex(), 0.8, 0.8, -2.0, 2.15, -3.3, P(17), P(31));
      up7(bpDoodleTex(), 0.8, 0.8, -2.05, 3.0, -4.0, P(27), P(41));
      // the dimension arrow under the strip: a line growing left -> right, end ticks, arrowheads, its note
      const dy = 2.18, x0 = -1.35, x1 = 1.65, zD = zS + 0.05;
      addVLine([[x0, 0], [x1, 0]], 0.05, P(21), P(35), [0, zD], dy, undefined, rub);
      addVLine([[x0, -0.14], [x0, 0.14]], 0.045, P(21), P(22.5), [0, zD], dy, undefined, rub);
      addVLine([[x1, -0.14], [x1, 0.14]], 0.045, P(34), P(35.5), [0, zD], dy, undefined, rub);
      for (const [x, d] of [[x0, 1], [x1, -1]] as number[][]) addVLine([[x + d * 0.2, -0.085], [x, 0], [x + d * 0.2, 0.085]], 0.045, P(35), P(37), [0, zD], dy, undefined, rub);
      up7(bpNoteTex2("bpDimP7", ["1 VISITOR"], 512, 160), 0.9, 0.28, 0.15, dy - 0.2, zD, P(35), P(40));
      // a red-pencil ring round STEAL? (the strip's big line runs x ~-0.9 .. 1.2 at y ~2.93)
      // round 8 (A7 P3: the ring circled 'PLE STEA' and cut the L): centred on STEAL? (measured on the render: STEAL? spans
      // x ~0.77 .. 1.66 m on the strip) with a ~0.1 m clear margin round the word
      const ring: [number, number][] = []; for (let k = 0; k <= 40; k++) { const a = -0.4 + (k / 40) * TAU * 1.08; ring.push([1.21 + Math.cos(a) * 0.56 * (1 + 0.04 * Math.sin(a * 3)), Math.sin(a) * 0.23]); }
      addVLine(ring, 0.05, P(32), P(40), [0, zS + 0.03], 2.67, new THREE.Color(1.45, 0.34, 0.28), rub);
    }
    // round 7 (A6 ADD): on 'Many' a red-pencil double underline draws itself under EVERYONE ELSE (it rides the label up
    // its pole: a child of the label)
    { const mat = wipeMat(bpRedLineTex(), new THREE.Color(1.1, 1.0, 1.0)), m = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.255), mat);
      m.position.set(0, -0.5, 0.01); m.layers.set(NOINK); m.renderOrder = 7; m.visible = false; this.eeLabel.add(m);
      this.wipes.push({ m, mat, a: BEAT.manySteal - 1, b: BEAT.manySteal + 6 }); }
    // round 6 (A5 ADD: a real sheet on a desk + a rewatch callback): the HOOK's paperclip, with its tiny red gift bow,
    // clipped over the VISITOR BEHAVIOR title block's top-right corner (desk scale, like the giant pencil); it throws a
    // soft blue shadow on the paper
    {
      const pb3 = new RB(o), steel = lam("int:bpClip6", () => ({ color: "#c8d0dc", emissive: new THREE.Color("#5a6a88"), emissiveIntensity: 0.35 }));
      const L0 = 0.62, W0 = 0.17, r0 = W0 / 2, pts: THREE.Vector3[] = [];
      // the classic double-loop wire: long outer U, short inner U (local x along the clip, z across, y up)
      const arc = (cx: number, r: number, a0: number, a1: number) => { for (let k = 0; k <= 10; k++) { const a = a0 + ((a1 - a0) * k) / 10; pts.push(V(cx + Math.cos(a) * r, 0, Math.sin(a) * r)); } };
      pts.push(V(L0 * 0.25, 0, r0 * 0.4)); arc(L0 - r0, r0, Math.PI / 2, -Math.PI / 2); pts.push(V(r0 * 0.8, 0, -r0));
      arc(r0 * 0.8, r0 * 0.98, -Math.PI / 2, -Math.PI * 1.5); pts.push(V(L0 - r0 * 2.2, 0, r0 * 0.7)); arc(L0 - r0 * 2.2, r0 * 0.7, Math.PI / 2, -Math.PI / 2); pts.push(V(r0 * 1.6, 0, -r0 * 0.7));
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1), 120, 0.011, 6, false);
      const cx3 = 1.96, cz3 = 1.86, yaw3 = -0.75;
      pb3.geo(tube, steel, cx3, 0.03, cz3, yaw3, 0, 0.05);
      // the bow: two red loops, a knot and two tails, on the clip's outer end
      const red = lam("int:bpBow6", () => ({ color: "#e8443a", emissive: new THREE.Color("#a82a20"), emissiveIntensity: 0.45 }));
      const ex = cx3 + Math.cos(-yaw3) * (L0 - 0.02), ez = cz3 + Math.sin(-yaw3) * (L0 - 0.02);
      for (const s2 of [-1, 1]) pb3.geo(new THREE.TorusGeometry(0.045, 0.014, 6, 14), red, ex + s2 * 0.045, 0.05, ez + s2 * 0.02, yaw3 + s2 * 0.5, Math.PI / 2 - 0.35, 0);
      pb3.geo(new THREE.SphereGeometry(0.022, 10, 8), red, ex, 0.05, ez);
      for (const s2 of [-1, 1]) pb3.rbox(red, 0.022, 0.006, 0.08, ex + s2 * 0.02, 0.03, ez + 0.05, yaw3 + s2 * 0.4, 0, 0, false);
      pb3.done(this.bp);
      const sh3 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color("#0d2a66"), transparent: true, opacity: 0.45, depthWrite: false, fog: false }));
      sh3.position.set(o[0] + cx3 + 0.3 * Math.cos(-yaw3) + 0.03, o[1] + 0.012, o[2] + cz3 + 0.3 * Math.sin(-yaw3) + 0.06); sh3.rotation.y = yaw3; sh3.layers.set(NOINK); sh3.renderOrder = 2; this.bp.add(sh3);
    }
    // chalk dust motes drifting right in front of the lens (big, soft: the DOF turns them into out-of-focus specks)
    this.bpLensDust = new Motes(this.bp, 18, 47, o, [-2.2, 1.6, 3.6], [2.2, 4.4, 6.4], new THREE.Color(0.32, 0.42, 0.62), 0.09, 0.22);
    // round 7: grid-ripple sources (a label / note / the panel landing: world xz, picture frame)
    { const R = (x: number, z: number, f: number) => this.ripples.push({ x: o[0] + x, z: o[2] + z, f });
      R(0.15, -4.4, PV(toV(BEAT.youSee) + 29)); R(-2.0, -3.3, PV(toV(BEAT.youSee) + 31)); R(LBL5.rule[0], LBL5.rule[2], PV(toV(BEAT.copyRules) - 2.5) + 1); R(LBL5.rule[0], LBL5.rule[2] + 0.3, BEAT.copyRules + 20);
      R(LBL5.ee[0], LBL5.ee[2], BEAT.eachOther + 4); R(LBL5.ee[0], LBL5.ee[2], BEAT.eachOther + 20); R(BP.signFloat[0], BP.signFloat[2], BEAT.manySteal + 12); }
  }
  // round 6 blueprint
  private wipes: { m: THREE.Mesh; mat: THREE.ShaderMaterial; a: number; b: number; out?: number }[] = []; private pct8!: THREE.Mesh;
  private compass7!: THREE.Mesh; private headDust: THREE.Sprite[] = []; private ripples: { x: number; z: number; f: number }[] = [];
  private walkers: { m: THREE.Mesh; ph: number; per: number; f0: number; look: number; chip: number; h: number; s: number; t: number; k: number; early: number }[] = []; private bpLensDust!: Motes;
  private fades: { m: THREE.MeshBasicMaterial; f: number; pre: number; full: number }[] = [];
  private puffAt: { p: THREE.Vector3; f: number }[] = []; private sticks: THREE.Mesh[] = []; private bpPuffs: THREE.Sprite[] = [];
  private signFace!: THREE.MeshBasicMaterial; private signShadow!: THREE.Mesh; private signBoil: THREE.Texture | null = null;
  private postMarks: { sc: THREE.Mesh; sh: THREE.Mesh }[] = []; private v1 = new THREE.Vector3();
  // round 5
  private posts5: { post: THREE.Mesh; label: THREE.Mesh; f: number; h: number }[] = []; private eeLabel!: THREE.Mesh; private eeArrow!: THREE.Mesh;
  private thiefPuffs: THREE.Sprite[] = []; private crowdPrints: { m: THREE.Mesh; s: number; ph: number }[] = [];
  private crumbs: { m: THREE.Mesh; p: THREE.Vector3; k: number }[] = []; // round 8: eraser crumbs that hop when the panel lands
  private thiefPush = new Array<number>(THIEF_N).fill(0); // round 8: each thief's head-clear slide this frame (m along the lens horizontal)

  // ================================================================================================ per frame
  pose(ctx: SetCtx) {
    VF = ctx.vf ?? ctx.f; // round 6: idle loops run on the video clock (see qw / vs above)
    this.L = ctx.light;
    const set = ctx.shot.set, f = ctx.f, t = vtime();
    this.cl.visible = set === "classroom"; this.sr.visible = set === "storeroom"; this.bp.visible = set === "blueprint";
    for (let i = 0; i < POOL_N; i++) this.fx.pools[i].copy(this.poolBase[i]);
    // round 5: the trailhead practicals (pools 9-11) light only the dusk World (shot 15); every other World has them off
    if (!(ctx.light.name === "dusk" && set === "trailhead")) for (let i = 9; i < 14 && i < POOL_N; i++) this.fx.pools[i].set(0, 0, 0);
    this.fx.pose(ctx);
    // round 6: the board lamps switched on late in the shot-6 relight light the board face and posts a little
    if (ctx.id === 6 && this.fx.lampK > 0) for (let i = 9; i < 11 && i < POOL_N; i++) this.fx.pools[i].copy(this.poolBase[i]).multiplyScalar(1.3 * this.fx.lampKs[i - 9]); // round 8: a readable warm pool on the board's top rail + frame
    if (!this.cl.visible && !this.sr.visible && !this.bp.visible) return;
    if (this.cl.visible) this.poseClassroom(f, t, ctx.cam);
    if (this.sr.visible) this.poseStoreroom(f, t, ctx.cam);
    if (this.bp.visible) this.poseBlueprint(f, t, ctx.cam);
  }

  private poseClassroom(f: number, t: number, cam: THREE.Camera) {
    this.chalk.draw(f);
    this.clHalo.quaternion.copy(cam.quaternion);
    // clock: 10:10 and a ticking second hand (snap + tiny overshoot each second); round 6: real seconds (video clock)
    const sec = Math.floor(t), fr = t - sec, tick = sec + Math.min(1, fr * 6) + 0.12 * Math.sin(Math.min(1, fr * 6) * Math.PI) * (fr < 0.3 ? 1 : 0);
    this.secHand.rotation.z = -((tick + 22) / 60) * TAU; this.minHand.rotation.z = -((10 + t / 60) / 60) * TAU; this.hourHand.rotation.z = -((10 + 10 / 60) / 12) * TAU;
    // round 4: the back-wall clock over the door shows the same time and ticks with it (it faces -x: + = clockwise)
    this.sec2.rotation.x = ((tick + 22) / 60) * TAU; this.min2.rotation.x = ((10 + t / 60) / 60) * TAU; this.hour2.rotation.x = ((10 + 10 / 60) / 12) * TAU;
    this.pennants.forEach((pm, i) => { pm.rotation.set(0.05 * vs(1.3, i * 0.9) + 0.02 * vs(3.1, i), 0, -(0.12 + 0.06 * vs(0.9, i * 1.7))); });
    this.wallPennant?.rotation.set(0, -Math.PI / 2, 0.035 * vs(1.1, 0.4) + 0.012 * vs(2.7, 1.2));
    this.ceilPencil?.rotation.set(0.05 + 0.03 * vs(1.6, 0.7), 0, 0.04 * vs(1.25, 2.1)); // round 6: the stuck pencil wobbles in the draft
    this.patchMotes.pose(t * 0.7, 6);
    // chalk specks puffing off each letter as it is finished (3 per letter, 14 f, fall + drift off the board)
    { const G = glyphs(), top = CL.board.cy + CL.board.h / 2; let pi = 0;
      for (let i = 0; i < G.length; i++) {
        const q = G[i], v = f - q.t1; if (v < 0 || v >= 14) continue;
        for (let k = 0; k < 3 && pi < this.letterPuffs.length; k++, pi++) {
          const sp = this.letterPuffs[pi], u = v / 14, hx = hash(i * 3.7 + k * 1.3);
          const bx = (q.x + q.w * (0.25 + 0.25 * k)) / BOARD_PX - CL.board.w / 2, by = top - CHALK.top - CHALK.cap * (0.15 + 0.35 * hx) - q.line * CHALK.lead;
          sp.visible = true;
          sp.position.set(CL.base[0] + CL.board.cx + bx + (hx - 0.5) * 0.08 * u, CL.base[1] + by - 0.05 * u - 0.12 * u * u, CL.base[2] + CL.board.z + 0.02 + 0.07 * outCubic(u));
          sp.scale.setScalar(0.022 + 0.03 * u); (sp.material as THREE.SpriteMaterial).opacity = 0.6 * (1 - u) ** 1.3;
        }
      }
      for (; pi < this.letterPuffs.length; pi++) this.letterPuffs[pi].visible = false; }
    this.clMotes.pose(t, 3);
    for (const S of this.clShafts) { // round 8: face the lens about the beam axis, breathe slowly (video clock)
      const toCam = cam.position.clone().sub(S.p0).normalize(), side = new THREE.Vector3().crossVectors(S.d, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(side, S.d).normalize();
      S.mesh.position.copy(S.p0); S.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(S.d, side, nrm));
      S.mesh.scale.set(S.len, S.w * (1 + 0.05 * vs(0.6, S.ph)), 1);
      const k = 0.13 * (0.85 + 0.15 * vs(0.45, S.ph)); S.mat.color.setRGB(1.0 * k, 0.78 * k, 0.48 * k);
    }
    for (const s of this.swingers) s.g.rotation.set(0, 0, s.amp * vs(TAU * s.hz, s.ph) * (0.75 + 0.25 * vs(0.7, s.ph)));
    if (this.clTree && this.clTree2) { this.clTree.rotation.z = 0.012 * vs(1.1) + 0.006 * vs(2.7); this.clTree2.rotation.z = 0.014 * vs(1.3, 1) + 0.005 * vs(3.1); }
    // chalk dust: shown only near the writing tip while writing, falling a little
    const tip = chalkTip(f);
    const cd = this.chalkDust;
    (cd.pts.material as THREE.PointsMaterial).opacity = tip ? 1 : Math.max(0, 1 - (f - BEAT.cheated - 10) / 12);
    if (tip) cd.o = tip;
    cd.pose(t * 1.6, 9);
  }

  private poseStoreroom(f: number, t: number, cam: THREE.Camera) {
    const o = SR.base;
    // ---- the pail heap (round 3): pre-filled for the insert; each scoop pours 3 chips from the scoop tip (cast.ts
    // bucket target + 0.32 m) that tumble into the pail over 5 f; every landing lifts the heap ~4 mm with a little jiggle
    let landed = 0, jig = 0;
    for (let n = 0; n < 3; n++) for (let k = 0; k < 3; k++) {
      const i = n * 3 + k, f0 = pourAt(n, k), u = (f - f0) / 5, g = this.pour[i];
      if (n >= 2) { g.visible = false; continue; } // LEAD merge: cast.ts scoops from the pile only at 1693 and 1713.7 (its bait scoop at 1618 draws its own chips)
      const ang = hash(i * 3.3) * TAU, rho = 0.03 + 0.07 * hash(i * 5.1);
      const land = V(Math.cos(ang) * rho, BHEAP(rho) + 0.012, Math.sin(ang) * rho);
      if (u >= 1) { landed++; const v = f - (f0 + 5); if (v < 5) jig = Math.max(jig, Math.sin((v / 5) * Math.PI) * (1 - v / 5)); }
      g.visible = u >= 0;
      if (!g.visible) continue;
      if (u < 1) {
        // start at the scoop lip (world) -> heap-local; slight sideways arc, accelerating, tumbling
        // (measured on the A2 clip: the scoop blade tips ~0.2 m lower and ~0.1 m screen-left of cast's bucket + 0.32 m)
        const st = V(SR.base[0] + SR.bucket[0] - 0.1 + (k - 1) * 0.025, SR.base[1] + 0.71 + 0.13, SR.base[2] + SR.bucket[2] + 0.05 + 0.015 * (k - 1)).sub(this.bHeap.position);
        const e = u * u;
        g.position.lerpVectors(st, land, e); g.position.x += 0.03 * Math.sin(Math.PI * u) * (k - 1);
        g.rotation.set(2.4 * u + i, 1.7 * u + i * 0.7, 1.3 * u);
      } else {
        const v = f - (f0 + 5), bounce = v < 3 ? 0.012 * Math.sin((v / 3) * Math.PI) : 0;
        g.position.copy(land).add(V(0, bounce, 0)); g.quaternion.copy(faceQ(520 + i, 0.3, 0.95, 1.2, 0.5));
      }
    }
    const bk = this.bucketBase;
    this.bHeap.position.set(bk.x, bk.y + 0.32 + 0.004 * landed + 0.006 * jig, bk.z);
    this.bHeap.rotation.y = 0.02 * jig;
    // pail glints: twinkle in the insert ("the bait wood?") and once after each pour
    this.bGlints.forEach((gs, i) => {
      let k = 0;
      for (const f0 of [SHOTS[13].a + 6 + i * 11, SHOTS[13].a + 30 + i * 9, pourAt(0, 2) + 6 + i * 3, pourAt(1, 2) + 6 + i * 3, pourAt(2, 2) + 6 + i * 3]) { const v = f - f0; if (v >= 0 && v < 8) k = Math.max(k, Math.sin((v / 8) * Math.PI)); }
      gs.visible = k > 0.01; if (gs.visible) { gs.scale.setScalar(0.015 + 0.07 * k); gs.material.rotation = 0.25 * f + i; }
    });
    // ---- mail: the flap snaps open (1 f), a padded envelope then a taped parcel shoot down the chute, drop onto the
    // pile (the envelope lands ON BEAT.mailed, the parcel 3 f later), 2-3 f bounce, paper puff; the flap swings shut
    // round 4: a second parcel follows on "apology" + 20 (the flow never stops), so the flap opens twice
    // round 6 (A5 P3: the parcel popped into existence in front of the RETURNS sign): the mail now comes THROUGH the
    // brass slot. The flap knocks twice (video ~2262: something is pushing from outside), snaps open in 1 f (~2266), each
    // item squeezes out of the 7 cm slot (squashed flat while its back is still inside the wall, then it pops back to
    // shape with a little overshoot), slides 5-6 f down the chute and falls onto the pile (the parcel still lands at
    // BEAT.mailed + 3 = video ~2273); after it lands the flap swings open / shut twice more (decaying)
    const fm = BEAT.mailed, f2 = BEAT.apology + 20, C = this.chute;
    const fOpen = fm - 4.4, fOpen2 = f2 - 7.5;
    const flapAng = (O: number, shut: number) => {
      if (f < O - 4.2) return 0;
      if (f < O) { const u = (f - (O - 4.2)) / 4.2; return 0.14 * Math.abs(Math.sin(u * Math.PI * 2)); } // two knocks
      if (f < O + 1) return 1.25 * (f - O);                                                                 // 1 f snap
      if (f < shut) return 1.25;
      const v = f - shut; if (v < 1.5) return 1.25 * (1 - v / 1.5);
      const w = v - 1.5; return 0.45 * Math.exp(-w / 5.5) * Math.abs(Math.sin((w / 4.4) * Math.PI));        // two swings
    };
    this.flap.rotation.x = -(f >= fOpen2 - 4.2 ? flapAng(fOpen2, fOpen2 + 3.4) : flapAng(fOpen, fOpen + 4.2));
    /** an item squeezing out of the slot and sliding down the chute: s = distance along the chute from S0 (back of the
     *  wall < sW < 0 < chute length), the squash while any part of it is still inside the wall */
    const S0w = this.v4.copy(C.S0).add(V(...o)), Lc = C.S1.distanceTo(C.S0), sW = (-SR.room.d / 2 - C.S0.z) / C.u.z;
    const chute = (m: THREE.Mesh, out0: number, lip: number, half: number, len: number, sqY: number, sqX: number, pad: number, sqD = 2.0) => {
      const out1 = out0 + sqD, s0 = sW - len / 2 - 0.02, s1 = len / 2 + 0.02;
      let sl: number;
      if (f < out1) sl = lerp(s0, s1, (f - out0) / (out1 - out0));
      else sl = s1 + (Lc - s1) * Math.min(1, (f - out1) / Math.max(1, lip - out1)) ** 1.5;
      const inside = sl - len / 2 < sW + 0.005, sClear = sW + 0.005 + len / 2, fClear = out0 + ((sClear - s0) / (s1 - s0)) * (out1 - out0);
      const pop = inside ? 0 : outBack(clamp01((f - fClear) / 2.2), 2.4), sy = lerp(sqY, 1, pop), sx = lerp(sqX, 1, pop), sz = lerp(1 / Math.sqrt(sqY * sqX), 1, pop);
      m.scale.set(sx, sy, sz); m.quaternion.copy(C.q);
      m.position.copy(S0w).addScaledVector(C.u, sl).addScaledVector(C.y, half * sy + pad);
    };
    const item = (m: THREE.Mesh, out0: number, land: number, at: [number, number], half: number, len: number, sqX: number, spin: number, puff0: number, sqD = 2.0) => {
      const P = this.heapTop(at[0], at[1]), rest = V(o[0] + P[0], o[1] + P[1] + half, o[2] + P[2]);
      m.visible = f >= out0;
      if (!m.visible) { for (let k = 0; k < 8; k++) this.puffs[puff0 + k].visible = false; return; }
      const end = C.S1.clone().add(V(...o)).addScaledVector(C.y, half + 0.022);
      if (f < land - 2) chute(m, out0, land - 2, half, len, Math.min(1, 0.032 / half), sqX, 0.022, sqD); // squeeze out + slide down the chute
      else if (f < land) { // fall off the lip onto the heap
        const u = (f - (land - 2)) / 2; m.scale.set(1, 1, 1); m.position.lerpVectors(end, rest, u); m.position.y += 0.05 * Math.sin(u * Math.PI);
        m.quaternion.copy(C.q).multiply(this.q1.setFromEuler(new THREE.Euler(0.5 * u, spin * u, 0.3 * u)));
      } else { // land, bounce, settle
        const v = f - land, bounce = v < 4 ? Math.abs(Math.sin((v / 4) * Math.PI)) * 0.045 * (1 - v / 4) : 0;
        m.scale.set(1, 1, 1); m.position.copy(rest).add(V(0, bounce, 0));
        m.quaternion.setFromEuler(new THREE.Euler(0.12 + (v < 4 ? 0.1 * (1 - v / 4) : 0), spin + 0.2, -0.08));
      }
      for (let k = 0; k < 8; k++) { // paper / dust puff at the landing
        const s = this.puffs[puff0 + k], v = f - land, u = v / 10;
        s.visible = v >= 0 && v < 10;
        if (!s.visible) continue;
        const a = (k / 8) * TAU + 0.4, d = 0.05 + 0.2 * outCubic(u);
        s.position.copy(rest).add(V(Math.cos(a) * d, 0.02 + 0.08 * u + 0.03 * hash(k), Math.sin(a) * d * 0.7));
        s.scale.setScalar(0.05 + 0.13 * u); (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - u) ** 1.3;
      }
    };
    item(this.mailEnv, fOpen + 2.4, fm + 5, [-0.3, 0.12], 0.011, 0.24, 0.8, 0.5, 0, 1.4); // round 6: right behind the parcel, lands BEAT.mailed + 5
    item(this.mailBox2, fOpen2 + 0.3, f2, [-0.33, 0.12], 0.065, 0.26, 1, 0.9, 16);
    // the FRAGILE parcel (x1.5): squeezes out of the slot right behind the envelope, slides down the chute, arcs off the
    // lip and lands on the heap's FRONT-RIGHT (clear of the note cards, left of the pail), 2 f squash, 3 f bounce, a
    // paper-dust puff, 4 chips hop off the heap onto the rug
    {
      const L = fm + 3, m = this.mailBox, half = 0.1125, P = this.heapTop(0.36, 0.22), rest = V(o[0] + P[0], o[1] + P[1] + half, o[2] + P[2]);
      const qRest = this.q2.setFromEuler(new THREE.Euler(0.08, 0.2, -0.07)), out0 = fOpen, fall = 2.4;
      // round 7 (A6 P3: it faded in half-transparent / squashed on the chute instead of sliding out of the slot): the
      // flap snaps first (1 f), then the parcel is OPAQUE and full-size from its first frame, pushed 0.25 m out of the slot
      // mouth in 3 f (a quick stretch along the push), then it slides on down the chute, arcs off the lip and falls
      m.visible = f >= out0 + 1; m.scale.set(1, 1, 1);
      if (m.visible) {
        const end = C.S1.clone().add(V(...o)).addScaledVector(C.y, half + 0.026);
        if (f < L - fall) {
          const sA = sW + 0.39 / 2 + 0.01, sB = sA + 0.25, u3 = (f - (out0 + 1)) / 3;
          const sl = u3 < 1 ? lerp(sA, sB, outCubic(u3)) : sB + (Lc - sB) * Math.min(1, (f - (out0 + 4)) / Math.max(1, L - fall - (out0 + 4))) ** 1.5;
          const pk = u3 < 1 ? 1 + 0.12 * Math.sin(Math.PI * clamp01(u3)) : 1;
          m.scale.set(1 / Math.sqrt(pk), 1 / Math.sqrt(pk), pk); m.quaternion.copy(C.q);
          m.position.copy(S0w).addScaledVector(C.u, sl).addScaledVector(C.y, half + 0.026);
        }
        else if (f < L) {
          const u = (f - (L - fall)) / fall; m.position.lerpVectors(end, rest, u); m.position.y = lerp(end.y, rest.y, u * u) + 0.07 * Math.sin(Math.PI * u);
          m.quaternion.slerpQuaternions(C.q, qRest, outCubic(u)); m.rotateX(0.55 * Math.sin(Math.PI * u));
        } else {
          const v = f - L; let sy = 1, dy = 0;
          if (v < 2) sy = 0.78 + 0.11 * v;                                                                       // squash
          else if (v < 5) { const w = (v - 2) / 3; dy = 0.055 * Math.sin(Math.PI * w); sy = 1 + 0.06 * Math.sin(Math.PI * w); } // bounce
          else if (v < 9) sy = 1 - 0.03 * Math.sin((Math.PI * (v - 5)) / 4);                                    // settle
          const sxz = 1 / Math.sqrt(sy);
          m.scale.set(sxz, sy, sxz); m.position.copy(rest).add(V(0, dy - half * (1 - sy), 0)); m.quaternion.copy(qRest);
        }
      }
      for (let k = 0; k < 8; k++) {
        const sp = this.puffs[8 + k], v = f - L, u = v / 11;
        sp.visible = v >= 0 && v < 11;
        if (!sp.visible) continue;
        const a = (k / 8) * TAU + 0.4, d = 0.08 + 0.26 * outCubic(u);
        sp.position.copy(rest).add(V(Math.cos(a) * d, -half + 0.03 + 0.1 * u + 0.03 * hash(k), Math.sin(a) * d * 0.7));
        sp.scale.setScalar(0.06 + 0.16 * u); (sp.material as THREE.SpriteMaterial).opacity = 0.6 * (1 - u) ** 1.3;
      }
      this.hops.forEach((g, i) => {
        const v = f - L - 1; g.visible = v >= 0;
        if (!g.visible) return;
        const p0 = V(rest.x + (i - 1.5) * 0.07, o[1] + P[1] + 0.012, rest.z + 0.08), g9 = 0.0109;
        const vx = (i - 1.5) * 0.011 + 0.004, vz = 0.03 + 0.009 * hash(i * 3.1), vy = 0.055 + 0.02 * hash(i * 5.3);
        const tl = (vy + Math.sqrt(vy * vy + 2 * g9 * (p0.y - o[1] - 0.014))) / g9, tt = Math.min(v, tl);
        g.position.set(p0.x + vx * tt, p0.y + vy * tt - 0.5 * g9 * tt * tt, p0.z + vz * tt);
        if (v < tl) g.rotation.set(0.5 * v + i, 0.3 * v, 0.4 * v);
        else {
          // round 5 (A4 ADD): after the hop each chip skids on across the rug and spins to a stop over ~12-15 f
          const w = v - tl, hv = Math.hypot(vx, vz) || 1, ease = 1 - Math.exp(-w / 4.5), rr = (0.08 + 0.06 * hash(i * 2.2)) * ease;
          g.position.x += (vx / hv) * rr; g.position.z += (vz / hv) * rr;
          if (w < 3) g.position.y += 0.014 * Math.sin((Math.PI * w) / 3);
          g.quaternion.copy(faceQ(700 + i, 0.2, 0.98, 0.6, 0.5));
          g.rotateY((i % 2 ? 1 : -1) * 6.5 * rr); g.rotateX(0.35 * Math.exp(-w / 3.5) * Math.sin(w * 1.6));
        }
      });
    }
    // the letters hop on "apology" (translation + scale only: they are unlit, so no lighting flicker)
    this.letters.forEach((L, i) => {
      const v = f - (BEAT.apology + i * 3), hop = v >= 0 && v < 10 ? Math.sin((v / 10) * Math.PI) : 0;
      L.m.position.copy(L.p).add(V(0, hop * 0.05, 0));
      L.m.rotation.set(L.r.x + vs(2.1, i) * 0.012, L.r.y, L.r.z + vs(1.7, i * 2) * 0.012 + hop * 0.05, "YXZ");
      L.m.scale.setScalar(1 + hop * 0.08);
    });
    // chip glints on the lamp-lit heap: three 4-point stars twinkling in turn all through the shot (one is always
    // on near "conscience"); the floor chips in the lantern pool twinkle too
    this.glints.forEach((g, i) => {
      const per = 38 + 7 * i, v = (((f - BEAT.conscience - 2 - i * 13) % per) + per) % per; g.visible = v < 8;
      if (g.visible) { const k = Math.sin((v / 8) * Math.PI); g.scale.setScalar(0.02 + 0.1 * k); g.material.rotation = 0.3 * v + i; }
    });
    this.floorGlints.forEach((g, i) => {
      const per = 47 + 9 * i, v = (((f - (BEAT.bait - 2) - i * 21) % per) + per) % per; g.visible = v < 7; // round 4: keyed to the beat (was a hard-coded 1615)
      if (g.visible) { const k = Math.sin((v / 7) * Math.PI); g.scale.setScalar(0.015 + 0.06 * k); g.material.rotation = 0.3 * v; }
    });
    // round 6: every idle loop below runs on the VIDEO clock (t = vtime(), vs / vph snapped to whole cycles); the
    // story kicks (the parcel thump, the flap) stay on the picture clock f
    this.lampMotes.pose(t * 0.6, 5); this.lampMotes2.pose(t * 0.8, 7);
    const flick = 0.95 + 0.035 * vs(9.0) * vs(2.3) + 0.015 * vs(23.0);
    (this.lampHalo.material as THREE.MeshBasicMaterial).color.setRGB(0.64, 0.4, 0.14).multiplyScalar(flick); // round 6: -30 % (haze)
    this.fx.pools[2].multiplyScalar(flick);
    // the lantern flame (round 5, A4 P2: it did not flicker): an irregular kerosene flicker of about +-8 % made of
    // three incommensurate 4-8 Hz sines riding a slow breath, a short gutter dip now and then; the halo faces the lens
    const lfN = (vs(TAU * 4.3) + 0.7 * vs(TAU * 5.9, 1.3) + 0.5 * vs(TAU * 7.7, 2.1)) / 2.2;
    const gutter = Math.max(0, vs(TAU * 0.37, 0.8)) ** 12;
    const lf = 1 + 0.08 * lfN * (0.75 + 0.25 * vs(TAU * 0.6)) - 0.07 * gutter;
    this.fx.pools[6].multiplyScalar(lf);
    (this.lantern.halo.material as THREE.MeshBasicMaterial).color.setRGB(0.8 * lf, 0.42 * lf, 0.12 * lf); // round 6: a touch less haze
    this.lantern.core.color.copy(glow("#ffe2a6", 6.0 * lf));
    // round 8: the flame card + its glow sit 7 cm in front of the globe's centre toward the lens (in front of the glass), the
    // flame licks (height +-12 %, a 1-2 mm sway) with the same flicker
    { const Lt = this.lantern, toCam = this.v3.copy(cam.position).sub(Lt.c).normalize();
      Lt.flame.position.copy(Lt.c).addScaledVector(toCam, 0.07); Lt.flame.position.x += 0.0015 * vs(TAU * 3.1, 0.7);
      Lt.flame.scale.set(0.034 * (1 + 0.04 * lfN), 0.064 * (1 + 0.12 * lfN), 1); Lt.flame.material.color.copy(glow("#ffe0a0", 2.6 * lf));
      Lt.glow.position.copy(Lt.c).addScaledVector(toCam, 0.075); Lt.glow.scale.setScalar(0.26 * (1 + 0.05 * lfN)); Lt.glow.material.color.setRGB(1.1 * lf, 0.62 * lf, 0.22 * lf); }
    // round 8: the slot night-light: a steady warm dome with a faint mains shimmer (its pool is shade.ts POOL 14)
    { const N = this.nightLight, sh = 1 + 0.02 * vs(TAU * 0.5, 1.1); N.glow.material.color.setRGB(0.62 * sh, 0.34 * sh, 0.11 * sh); this.fx.pools[14]?.multiplyScalar(sh); }
    if (this.lanternPool) this.lanternPool.color.setRGB(0.25 * lf, 0.11 * lf, 0.03 * lf); // round 6: +25 %
    this.lantern.halo.quaternion.copy(cam.quaternion);
    this.lampHalo.quaternion.copy(cam.quaternion);
    // round 5: the hanging work bulb swings on its cord: a slow idle sway (~1.5 deg) plus a kick when the parcel lands
    // on the pile (BEAT.mailed + 3) that decays over ~1.5 s; the warm pool follows the bulb, a faint mains shimmer
    { const kv = f - (BEAT.mailed + 3), kick = kv > 0 ? 0.07 * Math.exp(-kv / 16) * Math.sin(kv * 0.42) : 0;
      const ax = 0.026 * vs(TAU * 0.33, 0.4) + kick, az = 0.018 * vs(TAU * 0.27, 2.0) + 0.4 * kick;
      this.bulbPivot.rotation.set(ax, 0, az);
      this.bulbPivot.updateMatrixWorld(true);
      const bp = this.workBulb.getWorldPosition(this.v2), sh = 1 + 0.015 * vs(37.0) * vs(3.1);
      POOL.uPoolPos.value[8].copy(bp); this.fx.pools[8].multiplyScalar(sh);
      this.workHalo.position.copy(bp); this.workHalo.quaternion.copy(cam.quaternion); this.workHalo.scale.setScalar(sh);
      (this.workBulb.material as THREE.MeshBasicMaterial).color.copy(glow("#ffdca8", 6.5 * sh)); }
    // round 5: the moonlight shaft turns about its own axis to face the lens (never an edge-on polygon); its motes drift
    // slowly down the beam (one pass ~25 s) with a lazy wobble, brightest in the beam's core
    // round 6 (A5 ADD: raise the shaft to ~15-20 % so the cool / warm split reads; A5 P2: no lavender): a clean moon
    // blue (#5A8CFF class, no red), ~10 % stronger
    { const A = this.moonAxes, s0 = V(o[0] + MOON.start[0], o[1] + MOON.start[1], o[2] + MOON.start[2]);
      const mid = this.v3.copy(s0).addScaledVector(A.d, MOON.len * 0.5), toCam = cam.position.clone().sub(mid).normalize();
      const side = new THREE.Vector3().crossVectors(A.d, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(side, A.d).normalize();
      this.moonShaft.position.copy(s0); this.moonShaft.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(A.d, side, nrm));
      this.moonShaft.scale.set(MOON.len, 1.3 + 0.04 * vs(0.6), 1);
      (this.moonShaft.material as THREE.MeshBasicMaterial).color.setRGB(0.22, 0.42, 1.0).multiplyScalar(0.46 * (0.93 + 0.07 * vs(0.45)));
      const pa = this.moonMotes.geometry.attributes.position as THREE.BufferAttribute, P = pa.array as Float32Array, B = this.moonMoteBase;
      for (let i = 0; i < B.length / 3; i++) {
        const s = ((B[i * 3] + t * (0.03 + 0.012 * hash(i * 1.7))) % 1) * 0.9 + 0.06, a = B[i * 3 + 1] + 0.05 * vs(0.7, i), c = B[i * 3 + 2] + 0.05 * vs(0.5, i * 1.9);
        P[i * 3] = s0.x + A.d.x * s * MOON.len + A.s0.x * a + A.u0.x * c;
        P[i * 3 + 1] = s0.y + A.d.y * s * MOON.len + A.s0.y * a + A.u0.y * c;
        P[i * 3 + 2] = s0.z + A.d.z * s * MOON.len + A.s0.z * a + A.u0.z * c;
      }
      pa.needsUpdate = true; }
    // round 5: the ranger hat swings on its peg when the parcel lands (and its wall shadow follows), a faint idle sway
    { const kv = f - (BEAT.mailed + 3), sw = 0.012 * vs(TAU * 0.4) + (kv > 0 ? 0.11 * Math.exp(-kv / 14) * Math.sin(kv * 0.5) : 0);
      this.hatPeg.rotation.set(0, 0, sw); this.hatShadow.position.x = SR.base[0] - 0.48 - 0.16 * sw; this.hatShadow.rotation.z = sw * 0.8; }
    // moths: three lazy wobbling orbits round the work bulb (~0.65-0.85 Hz, in frame, catching its bloom) and one round
    // the lantern; wings flap every 2 VIDEO frames, out of phase
    const wing = (i: number) => mothTex(Math.floor((VF + i) / 2) % 2);
    const ma = vph(5.2), mr = 0.09 + 0.02 * vs(1.7);
    this.moth.position.copy(this.v2).add(V(Math.cos(ma) * mr, 0.04 + 0.03 * vs(3.3), Math.sin(ma) * mr * 0.8));
    const mm = this.moth.material as THREE.SpriteMaterial, mt = wing(0); if (mm.map !== mt) { mm.map = mt; mm.needsUpdate = true; }
    // round 4: the second lamp moth (counter-orbit) and the lantern moth, wings on 2s out of phase; round 6: + a third
    // bulb moth on a figure-8
    { const ma2 = -(vph(4.1) + 2.0), mr2 = 0.14 + 0.03 * vs(1.3, 1);
      this.moths2[0].position.copy(this.v2).add(V(Math.cos(ma2) * mr2, 0.01 + 0.05 * vs(2.6, 1), Math.sin(ma2) * mr2 * 0.8));
      const ma3 = vph(3.3) + 4, mr3 = 0.1 + 0.03 * vs(1.9);
      this.moths2[1].position.set(o[0] + LANTERN[0] + Math.cos(ma3) * mr3, o[1] + 0.33 + 0.04 * vs(2.2), o[2] + LANTERN[2] + Math.sin(ma3) * mr3 * 0.8);
      if (this.moths2[2]) { const a8 = vph(4.6) + 1.1; this.moths2[2].position.copy(this.v2).add(V(0.16 * Math.sin(a8), -0.02 + 0.07 * Math.sin(2 * a8), 0.11 * Math.cos(a8))); }
      this.moths2.forEach((s2, i) => { const m2 = s2.material as THREE.SpriteMaterial, tx = wing(1 + i); if (m2.map !== tx) { m2.map = tx; m2.needsUpdate = true; } }); }
    this.nightCloud.position.x = o[0] - 1.95 + (f - (BEAT.mailed - 6)) * 0.0075;
    { const fq = Math.floor(VF / 2) * 2, tq = fq / FPS;
      this.steam2.forEach((m, i) => {
        const ph = (tq * 0.5 + i / 3) % 1;
        m.position.copy(this.mug2Top).add(V(-0.05 * ph + 0.015 * Math.sin(tq * 1.4 + i * 2), ph * 0.26, 0));
        m.quaternion.copy(cam.quaternion); m.scale.set(1 + ph * 1.2, 1 + ph * 0.6, 1);
        (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(ph * Math.PI) * 0.85;
      }); }
    this.steam.forEach((m, i) => {
      const ph = ((t * 0.45 + i / 3) % 1);
      m.position.copy(this.mugTop).add(V(vs(1.3, i * 2) * 0.03, ph * 0.3, 0));
      m.quaternion.copy(cam.quaternion); m.scale.set(1 + ph, 1 + ph * 0.5, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(ph * Math.PI) * 0.8;
    });
    this.srSec.rotation.z = -((Math.floor(t) + 14) / 60) * TAU;
    // round 6: the cat on the sill breathes (~0.3 Hz), one eye snaps open on the parcel thump (BEAT.mailed + 3) with
    // the ears pricked for 2 f, it stares ~15 f, then the eye closes again by ~video 2290 ('z' while asleep)
    // round 7 (A6 ADD): on the clunk it LIFTS its head (eyes open, looking at the chute), flicks its tail twice, then
    // one eye stays open a moment and it tucks back in by ~video 2386 (keyed on the video clock from the thump)
    { const kv = f - (BEAT.mailed + 3), dv = VF - toV(BEAT.mailed + 3);
      const st = dv >= 0 && dv < 1.5 ? 2 : dv >= 1.5 && dv < 12 ? 3 : dv >= 12 && dv < 16 ? 1 : 0, tl = (dv >= 3 && dv < 5) || (dv >= 8 && dv < 10) ? 1 : 0;
      const cm2 = this.cat.material as THREE.MeshBasicMaterial, ct = catTex(st, tl); if (cm2.map !== ct) { cm2.map = ct; cm2.needsUpdate = true; }
      const br = 1 + 0.018 * vs(TAU * 0.3), jump = kv >= 0 && kv < 4 ? 0.06 * Math.sin((kv / 4) * Math.PI) : 0;
      this.cat.scale.set(1, br + jump, 1); }
    // round 6: the LETTERS THIS YEAR counter: the top sheet 1,201 peels off its pad on "mailed" (video ~2270), then
    // flutters down past the chute and is gone; 1,202 underneath
    // round 7 (A6 ADD): it no longer vanishes mid-air: it see-saws down and forward in ~40 f (a falling-leaf flutter that
    // calms as it drops) and lands FLAT on the rug in front of the crate, with a little slide
    { const T = this.tearSheet, v = f - (BEAT.mailed - 0.3), W = 40, land = this.v3.set(o[0] + 0.62, o[1] + 0.014, o[2] + 0.05);
      T.sheet.visible = true;
      if (v < 0) { T.piv.position.copy(T.base); T.piv.rotation.set(0, 0, 0); }
      else if (v < 2.5) { const u = v / 2.5; T.piv.position.copy(T.base); T.piv.rotation.set(-1.1 * outCubic(u), 0, 0.12 * u); }
      else if (v < 2.5 + W) { const w = v - 2.5, u = w / W, e = u * u * (3 - 2 * u), calm = 1 - 0.6 * u;
        T.piv.position.set(lerp(T.base.x, land.x, e) + 0.16 * Math.sin(w * 0.32) * calm, lerp(T.base.y, land.y + 0.06, u ** 1.35), lerp(T.base.z + 0.05, land.z, e));
        T.piv.rotation.set(lerp(-1.1, -Math.PI / 2, e) - 0.45 * Math.sin(w * 0.32) * calm, 0.6 * Math.sin(w * 0.2) * calm, 0.12 + 0.5 * Math.sin(w * 0.32 + 0.6) * calm); }
      else { const w = v - 2.5 - W, sl = 0.05 * (1 - Math.exp(-w / 3));
        T.piv.position.set(land.x + sl, land.y + 0.06 * Math.exp(-w / 1.5), land.z + 0.4 * sl); T.piv.rotation.set(-Math.PI / 2, 0.45, 0.12); } }
    // round 7 (A6 ADD): an envelope on the rug stirs in the draft each time the chute flap swings (lifts its corner, shuffles)
    { const v1 = f - (BEAT.mailed - 4.4 + 4.2), v2 = f - (BEAT.apology + 20 - 7.5 + 3.4); let lift = 0;
      for (const v of [v1, v2]) if (v >= 0 && v < 12) lift = Math.max(lift, Math.sin((v / 12) * Math.PI) * (1 - 0.3 * (v / 12)));
      this.rugEnv.rotation.set(-Math.PI / 2 + 0.28 * lift * Math.abs(Math.sin(v1 * 0.9)), 0, 0.8 + 0.12 * lift);
      this.rugEnv.position.set(this.rugEnvP.x + 0.02 * lift, this.rugEnvP.y + 0.012 * lift, this.rugEnvP.z + 0.015 * lift); }
    const sm2 = this.stars.material as THREE.PointsMaterial; sm2.size = 0.045 + 0.012 * vs(3.1);
    // round 7 (A6 P2: the BAIT insert read milky lavender-pink, L* 48 / b* -5 against the wide's L* 36 / b* -26, the
    // pail salmon #E38E83, no warm practical on it): while the lens is on the insert (fading out over the 30 video f pull
    // to the reveal) the scene is keyed from the LANTERN side (its pool +15 %, warmer #FFB070), the desk-lamp key -30 %
    // and its spill / the work bulb -45-50 % (the right and back fall into the night blue), the shade's red / green ~30 %
    // deeper with its blue kept (darks toward L* ~12-15 but blue, b* down), the additive halos and the moon shaft (the haze) cut ~35-70 %, and the pail
    // takes its colour from its emissive orange-red (albedo -60 %), so it matches the wide's hue
    { const k = 1 - sm((VF - (toV(BEAT.conscience) - 25)) / 30);
      this.pailMat.color.setRGB(0.55, 0.5, 0.48).multiplyScalar(1 - 0.6 * k); this.pailMat.emissiveIntensity = 0.78 + 0.06 * k;
      if (k > 0.001) {
        this.fx.toneOverride(this.L, 1 - 0.3 * k, [1 - 0.35 * k, 1 - 0.3 * k, 1], [1 - 0.6 * k, 1 - 0.6 * k, 1 - 0.1 * k]); // the desk-lamp key backs off (the lantern keys the insert); the darks go deeper but stay BLUE
        const P = this.fx.pools;
        P[6].multiplyScalar(1 + 0.15 * k).multiply(this.v3.set(1 + 0.08 * k, 1, 1 - 0.12 * k));
        P[2].multiplyScalar(1 - 0.45 * k); P[4].multiplyScalar(1 - 0.45 * k); P[8].multiplyScalar(1 - 0.5 * k); P[7].multiplyScalar(1 - 0.2 * k);
        (this.lantern.halo.material as THREE.MeshBasicMaterial).color.multiplyScalar(1 - 0.6 * k);
        (this.lampHalo.material as THREE.MeshBasicMaterial).color.multiplyScalar(1 - 0.7 * k);
        (this.moonShaft.material as THREE.MeshBasicMaterial).color.multiplyScalar(1 - 0.35 * k);
      }
      (this.workHalo.material as THREE.MeshBasicMaterial).color.copy(this.workHaloCol).multiplyScalar(1 - 0.6 * k); }
  }
  private q1 = new THREE.Quaternion();

  private poseBlueprint(f: number, t: number, cam: THREE.PerspectiveCamera) {
    const o = BP.base;
    let si = 0, hd = 0;
    for (const L of this.lines) {
      const prog = L.b > L.a ? clamp01((f - L.a) / (L.b - L.a)) : f >= L.a ? 1 : 0;
      if (L.pre > 0 && f < L.a) { L.mat.uniforms.uProg.value = 1; L.mat.uniforms.uAlpha.value = L.pre; }
      else { L.mat.uniforms.uProg.value = prog; L.mat.uniforms.uAlpha.value = L.pre > 0 ? lerp(L.pre, 1, prog) : 1; }
      // round 7: rubbed out (the opening's construction marks)
      if (L.out !== undefined) { const e = sm((f - L.out) / 6); L.mat.uniforms.uAlpha.value *= 1 - e; L.mesh.visible = e < 0.999; }
      // round 7 (A6 ADD): chalk dust shed at the draw head: one speck every 2.5 picture f along the head's path, each
      // falling ~0.12 m and fading over 12 f (only lines >= 0.5 m long, while drawing and just after)
      const LL = L.L[L.L.length - 1];
      if (LL >= 0.5 && L.b > L.a && f >= L.a && f < L.b + 12 && (L.pts.length > 1 || (L.p3 && L.p3.length > 1)) && (L.out === undefined || f < L.out)) {
        for (let j = 0; j < 6 && hd < this.headDust.length; j++) {
          const te = Math.floor(f / 2.5) * 2.5 - j * 2.5, age = f - te;
          if (te < L.a || te > L.b || age < 0 || age >= 12) continue;
          const s = clamp01((te - L.a) / (L.b - L.a)) * LL; let i = 1; while (i < L.L.length - 1 && L.L[i] < s) i++;
          const k = (s - L.L[i - 1]) / Math.max(1e-6, L.L[i] - L.L[i - 1]), h = hash(te * 1.37 + L.a * 0.71 + j), u = age / 12;
          const sp = this.headDust[hd++]; sp.visible = true;
          if (L.p3) sp.position.lerpVectors(L.p3[i - 1], L.p3[i], k).add(this.v1.set((h - 0.5) * 0.08 * u, -0.12 * u * u - 0.03 * u, 0.04 + 0.03 * h));
          else { const a2 = L.pts[i - 1], c2 = L.pts[i]; sp.position.set(lerp(a2[0], c2[0], k) + (h - 0.5) * 0.1 * u, o[1] + 0.03 + 0.1 * u * (1 - u) + 0.02 * h, lerp(a2[1], c2[1], k) + (hash(h * 7.1) - 0.5) * 0.1 * u); }
          sp.scale.setScalar(0.028 + 0.03 * h + 0.02 * u); (sp.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - u) ** 1.2;
        }
      }
      // the chalk stick leading the line (tilted toward the drawing direction), with a dust grain or two
      if (L.stick && prog > 0 && prog < 1 && si < this.sticks.length) {
        const s = prog * L.L[L.L.length - 1]; let i = 1; while (i < L.L.length - 1 && L.L[i] < s) i++;
        const k = (s - L.L[i - 1]) / Math.max(1e-6, L.L[i] - L.L[i - 1]), a = L.pts[i - 1], c = L.pts[i];
        const st = this.sticks[si++]; st.visible = true;
        st.position.set(lerp(a[0], c[0], k), o[1] + 0.01, lerp(a[1], c[1], k));
        st.rotation.set(0, Math.atan2(c[0] - a[0], c[1] - a[1]), 0); st.rotateX(-0.55);
      }
    }
    for (let i = si; i < this.sticks.length; i++) this.sticks[i].visible = false;
    for (let i = hd; i < this.headDust.length; i++) this.headDust[i].visible = false;
    for (const F of this.fills) F.m.opacity = 0.16 * sm((f - F.f) / 8);
    for (const F of this.fades) F.m.opacity = F.full * lerp(F.pre, 1, sm((f - F.f) / 8));
    this.grid.uniforms.uT.value = t; this.grid.uniforms.uCam.value.copy(cam.position);
    { const g0 = SHOTS[10].a - 3, u = clamp01((f - g0) / 28); // the reveal runs over the dissolve + the first ~25 picture f
      this.grid.uniforms.uRev.value.set(o[0] + BP.person[0], o[2] + BP.person[2], u >= 1 ? 1e4 : 1.2 + 46 * (1 - (1 - u) ** 2.2)); }
    for (const p of this.pops) {
      const u = p.vd ? (VF - toV(p.f)) / p.vd : (f - p.f) / 8, k = u <= 0 ? 0 : outBack(u);
      p.obj.visible = u > 0; p.obj.scale.setScalar(Math.max(1e-3, k * p.s));
    }
    // round 7 (A6 ADD): grid shimmer rings from the labels / notes / panel as they land (the 4 freshest, ~0.8 s each)
    { const R = this.grid.uniforms.uRip.value as THREE.Vector4[]; let n = 0;
      const live = this.ripples.filter((r) => f >= r.f && f < r.f + 24).sort((a2, b2) => b2.f - a2.f);
      for (const r of live) { if (n >= 4) break; const age = f - r.f; R[n++].set(r.x, r.z, 0.25 + 0.16 * age, 0.85 * (1 - age / 24) ** 1.5); }
      for (; n < 4; n++) R[n].set(0, 0, 0, 0); }
    for (const m of this.labels) { m.rotation.set(0, Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z), 0); }
    // chalk-dust puffs where each main line / arrow finishes drawing (round 4: 7 specks each, 12 f; only the live
    // puffs take sprites)
    let pi = 0;
    for (const P of this.puffAt) {
      const v = f - P.f;
      if (v < 0 || v >= 12) continue;
      for (let k = 0; k < 7 && pi < this.bpPuffs.length; k++, pi++) {
        const s = this.bpPuffs[pi]; s.visible = true;
        const u = v / 12, a = (k / 7) * TAU + P.f * 0.37, rr = (0.14 + 0.2 * hash(k * 3.1 + P.f)) * outCubic(u);
        s.position.copy(P.p).add(V(Math.cos(a) * rr, 0.03 + (0.12 + 0.22 * hash(k + P.f)) * u - 0.06 * u * u, Math.sin(a) * rr * 0.8));
        s.scale.setScalar(0.05 + 0.12 * u * (0.6 + 0.4 * hash(k * 7.7))); (s.material as THREE.SpriteMaterial).opacity = 0.62 * (1 - u) ** 1.2;
      }
    }
    for (; pi < this.bpPuffs.length; pi++) this.bpPuffs[pi].visible = false;
    // the floating sign: flies in from the upper right on "Many people steal", settles with an overshoot, then floats
    // (bob 0.06 m at 0.35 Hz, sway 0.04 rad); its picture boils (two drawings, swapped every 4 f) once it has landed
    const fa = BEAT.manySteal - 4, fb = fa + 16, u = (f - fa) / (fb - fa);
    const rest = V(o[0] + BP.signFloat[0], o[1] + BP.signFloat[1], o[2] + BP.signFloat[2]);
    this.sign.visible = f >= fa;
    let k = 0;
    if (f >= fa) {
      k = outBack(u, 1.4);
      // round 8 (A7 P3): it slides in from the RIGHT, a little low and nearer the lens (it used to swoop down from the
      // upper right straight through the EVERYONE ELSE label); its top edge stays under the label the whole way
      const from = V(rest.x + 5.4, rest.y - 0.25, rest.z + 0.9), hold = f > fb ? clamp01((f - fb) / 10) : 0;
      const bob = vs(TAU * 0.35) * 0.06 * hold; // round 6: idle float on the video clock
      this.sign.position.lerpVectors(from, rest, Math.min(1.08, k)).add(V(0, bob, 0));
      this.sign.rotation.set(0.25 * (1 - k) + 0.04 * vs(2.1) * hold, -1.0 * (1 - k) + 0.04 * vs(1.5, 1) * hold, -0.22 * (1 - k) + 0.035 * vs(2.7) * hold);
      if (!this.signBoil) this.signBoil = boilTex(bpSignTex());
      const tex = f > fb && Math.floor(VF / 4) % 2 === 1 ? this.signBoil : bpSignTex(); // round 6: boil on 4 video f
      if (this.signFace.map !== tex) { this.signFace.map = tex; this.signFace.needsUpdate = true; }
    }
    const shK = f >= fa ? clamp01(k) : 0;
    // round 8 (A7 ADD): the landing jolts the sheet: the eraser crumbs hop 1-3 cm and settle (8 f, staggered)
    for (const c of this.crumbs) { const v = f - (fb + 0.4 * hash(c.k * 5.1)), hop = v >= 0 && v < 8 ? Math.sin((v / 8) * Math.PI) * (1 - v / 10) : 0;
      c.m.position.set(c.p.x + 0.012 * hop * (hash(c.k * 7.3) - 0.5), c.p.y + (0.01 + 0.02 * hash(c.k * 2.9)) * hop, c.p.z); c.m.rotation.x = 0.6 * hop * (hash(c.k) - 0.5); }
    this.signShadow.visible = shK > 0.01;
    this.signShadow.position.set(this.sign.position.x, o[1] + 0.009, this.sign.position.z + 0.2);
    this.signShadow.scale.set(BPS * 1.05 * (0.5 + 0.5 * shK), 1, BPS * 0.33 * (0.5 + 0.5 * shK));
    (this.signShadow.material as THREE.MeshBasicMaterial).opacity = 0.42 * shK;
    // round 4: chalk contact marks + drop shadows under the two posts, once the panel has landed (bob: the shadow
    // tightens / darkens a little as the panel dips)
    const mk = f >= fb ? sm((f - fb) / 8) : 0;
    this.sign.updateMatrixWorld();
    this.postMarks.forEach((pm, i) => {
      pm.sc.visible = pm.sh.visible = this.sign.visible && mk > 0.01;
      if (!pm.sc.visible) return;
      const pb = this.v1.set(((i ? 0.38 : -0.38) * BPS) / 0.92, -BPS / 2 - 0.64, -0.03); this.sign.localToWorld(pb);
      const near = clamp01(1.25 - (pb.y - o[1]) / 1.0);
      pm.sc.position.set(pb.x, o[1] + 0.013, pb.z); pm.sh.position.set(pb.x + 0.03, o[1] + 0.012, pb.z + 0.15);
      (pm.sc.material as THREE.MeshBasicMaterial).opacity = 0.5 * mk; // (0.35 read as nothing at ~7 m)
      (pm.sh.material as THREE.MeshBasicMaterial).opacity = (0.5 + 0.2 * near) * mk; pm.sh.scale.setScalar(1.08 - 0.12 * near);
    });
    // "everyone": the sign's thieves multiply. Pictogram cut-outs pop out of the picture 2-3 per frame, hop out and
    // down (never up over the text: the picture is already below the text block), land STANDING on the paper around
    // the sign base, then walk off toward the EVERYONE ELSE crowd with a step bob (walk drawings swap every 4 f)
    const fe = BEAT.everyone - 3, sp = this.sign.position, right = V(1, 0, 0).applyQuaternion(cam.quaternion); // round 4 (A3 P2): pops start 3 f before the word
    // round 8: the lens basis + the visitor's head in it (for the head-clear ring below)
    const camRt = right, camUp = V(0, 1, 0).applyQuaternion(cam.quaternion), camFw = V(0, 0, -1).applyQuaternion(cam.quaternion), rgtH = V(right.x, 0, right.z).normalize();
    const hd11 = V(o[0] + MAN11_HEAD.x, o[1] + MAN11_HEAD.y, o[2] + MAN11_HEAD.z).sub(cam.position), headZ = hd11.dot(camFw), headX = hd11.dot(camRt), headY = hd11.dot(camUp);
    this.thieves.forEach((m, i) => {
      const f1 = fe + i / 2.5, v = f - f1;
      m.visible = f >= f1 && this.sign.visible;
      if (!m.visible) return;
      // round 8 (A7 P2): a thief pops out of the pictogram figure on its own landing side (left half: the left figure,
      // right half: the middle or right figure), never across the visitor's head
      const fig = i % 2 ? (i % 4 === 1 ? 0 : 1) : -1, start = V(sp.x + fig * 0.27 * BPS + (hash(i * 1.3) - 0.5) * 0.12, sp.y - 0.25 * BPS, sp.z + 0.06);
      const side = i % 2 ? 1 : -1, [tx, tz] = thiefLand(i, sp.x, sp.z);
      const flight = 9, land = V(tx, o[1], tz);
      const c = V(BP.crowd[0] + o[0], o[1], BP.crowd[2] + o[2]), wd = c.clone().sub(land); wd.y = 0; const wl = wd.length(); wd.normalize();
      let pos: THREE.Vector3, sc: number, sy = 1, walk = 0, moveDir = wd;
      if (v < flight) {
        const uu = v / flight, e = outCubic(uu);
        // round 5: the left-hand thieves drop as fast as they travel (they hop DOWN and forward, never across THE RULE label)
        pos = V(lerp(start.x, land.x, e), lerp(start.y, land.y, i % 2 ? uu * uu : e) + 0.18 * Math.sin(Math.PI * uu) - 0.275 * 0.9 * (1 - uu), lerp(start.z, land.z, e));
        sc = 0.35 + 0.65 * outBack(clamp01(uu * 1.6)); moveDir = land.clone().sub(start);
      } else {
        // round 7 (carry-over: ~60 thieves, walking OUTWARD ~0.4 m/s with a 10 f step bob until the dissolve; nobody
        // stops): the right half stream on toward the crowd and past it, 7 of the left half spill onto THE RULE path (the
        // rule-followers' road fills up too), the rest walk out toward the lens side, away from the panel
        const w = v - flight, speed = (0.38 + 0.12 * hash(i * 9.1)) / 30, d = w * speed;
        if (i % 8 === 0) { const rp = V(o[0] + BP.ruleFigure[0] * (0.55 + 0.3 * hash(i * 2.9)), o[1], o[2] + BP.ruleFigure[2] * (0.5 + 0.35 * hash(i * 4.4))).sub(land); rp.y = 0; moveDir = rp.normalize(); }
        else if (i % 2 === 0) { moveDir = V(land.x - sp.x, 0, land.z - sp.z + 1.2).normalize(); }
        else moveDir = wd;
        pos = land.clone().addScaledVector(moveDir, d); sc = 1;
        if (w < 3) sy = 1 - 0.18 * Math.sin((w / 3) * Math.PI);
        walk = Math.floor(w / 5) % 2; pos.y += 0.022 * Math.abs(Math.sin((w / 10) * Math.PI));
      }
      const s = (0.92 + 0.16 * hash(i * 8.8)) * sc, flip = moveDir.dot(right) < 0 ? -1 : 1;
      // round 8 (A7 P2: a thief stood on his cap at the punch word): the head-clear ring. In his depth plane the card may
      // not enter his head + cap ellipse grown by HEAD_CLEAR (+ the card's own half size); a card that would is slid
      // along the lens's horizontal to its landing side, so the paths bend round his head and nobody stands on it
      { const dt = this.v3.copy(pos).addScaledVector(camUp, 0.275 * s * sy).sub(cam.position), tz = dt.dot(camFw);
        if (tz > 0.3 && headZ > 0.3) {
          const k = headZ / tz, DX = dt.dot(camRt) * k - headX, DY = dt.dot(camUp) * k - headY;
          const ex = MAN11_HEAD.rx + HEAD_CLEAR + 0.185 * s * k, ey = MAN11_HEAD.ry + HEAD_CLEAR + 0.275 * s * sy * k;
          const W = ex * Math.sqrt(Math.max(0, 1 - (DY / ey) ** 2)), side = i % 2 ? 1 : -1, need = W - side * DX;
          this.thiefPush[i] = need > 0 ? (need * side) / k : 0;
          if (need > 0) pos.addScaledVector(rgtH, this.thiefPush[i]);
        } else this.thiefPush[i] = 0; }
      m.position.copy(pos);
      m.rotation.set(0, Math.atan2(cam.position.x - pos.x, cam.position.z - pos.z), 0);
      m.scale.set(s * flip, s * sy, s);
      const mat = m.material as THREE.MeshBasicMaterial, tex = pictoTex(walk, i % 2);
      if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
    });
    // round 5 (A4 ADD): a chalk-dust puff (3 specks, 10 f) where each thief lands on the paper
    { let tp = 0;
      for (let i = 0; i < THIEF_N && this.sign.visible; i++) {
        const v = f - (fe + i / 2.5 + 9); if (v < 0 || v >= 10) continue;
        const [tx0, tz0] = thiefLand(i, sp.x, sp.z), u = v / 10, tx = tx0 + rgtH.x * this.thiefPush[i], tz = tz0 + rgtH.z * this.thiefPush[i];
        for (let k = 0; k < 3 && tp < this.thiefPuffs.length; k++, tp++) {
          const s = this.thiefPuffs[tp], a = (k / 3) * TAU + i * 1.3, rr = (0.08 + 0.1 * hash(i * 3.3 + k)) * outCubic(u);
          s.visible = true; s.position.set(tx + Math.cos(a) * rr, o[1] + 0.03 + 0.12 * u, tz + Math.sin(a) * rr * 0.8);
          s.scale.setScalar(0.05 + 0.1 * u); (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - u) ** 1.2;
        }
      }
      for (; tp < this.thiefPuffs.length; tp++) this.thiefPuffs[tp].visible = false; }
    // round 5 (A4 P1): the signpost labels: each chalk post draws itself up in 6 f as its label pops; the EVERYONE ELSE
    // label climbs its pole on "Many people steal" (10 f, a small overshoot) so the panel never covers it
    for (const P5 of this.posts5) {
      const lab = P5.label;
      if (lab === this.eeLabel) lab.position.y = o[1] + LBL5.eeHigh; // round 8: no climb (it pops where it stays)
      const grow = sm((f - P5.f) / 6);
      P5.post.visible = f >= P5.f && grow > 0.01; P5.post.scale.y = Math.max(1e-3, (lab.position.y - o[1] - P5.h / 2 + 0.02) * grow);
    }
    { const L = this.eeLabel, am = this.eeArrow, on = f >= BEAT.eachOther + 6;
      am.visible = on;
      if (on) { const u = am.material as THREE.ShaderMaterial; u.uniforms.uProg.value = clamp01((f - (BEAT.eachOther + 6)) / 5); u.uniforms.uAlpha.value = 1;
        am.position.set(L.position.x, L.position.y - 0.4 - 0.08 - 0.03 * vs(4.0), L.position.z + 0.02); am.rotation.set(0, L.rotation.y, 0); } }
    // round 5 (A4 P2): the crowd footprints ink in along the branch, then pulse in a wave flowing up it (~1.2 m/s)
    { const fs = BEAT.eachOther + 4;
      this.crowdPrints.forEach((cp, k) => {
        const fin = clamp01((f - (fs + k * 0.4)) / 4); cp.m.visible = fin > 0;
        if (!cp.m.visible) return;
        const flow = 0.5 + 0.5 * Math.sin(vph(TAU * 0.9) - TAU * (cp.s * 0.75 - cp.ph));
        (cp.m.material as THREE.MeshBasicMaterial).opacity = 0.78 * fin * (0.22 + 0.78 * flow * flow);
      }); }
    // round 6: the top-band drafting furniture + the 1.67 % / 7.92 % chalk notes write themselves in (left -> right)
    for (const W of this.wipes) {
      const u = (f - W.a) / Math.max(1, W.b - W.a), e = W.out === undefined ? 0 : sm((f - W.out) / 6); W.m.visible = u > 0 && e < 0.999;
      if (W.m.visible) { W.mat.uniforms.uProg.value = clamp01(u); W.mat.uniforms.uAlpha.value = 1 - e; }
    }
    // round 7: the opening compass rose spins in as it draws (a quarter turn with a small overshoot)
    { const W = this.wipes.find((w) => w.m === this.compass7); if (W) { const u = clamp01((f - W.a) / Math.max(1, W.b - W.a)); this.compass7.rotation.z = -1.4 * (1 - outBack(u, 1.6)); } }
    // 7.92 % rides with the EVERYONE ELSE label as it climbs its pole (above it, facing the lens like the label)
    { const L = this.eeLabel; this.pct8.position.set(L.position.x + 0.05, L.position.y + 0.7, L.position.z + 0.02); this.pct8.rotation.set(0, L.rotation.y, -0.04); }
    // round 6: the receding chalk crowd: ink in row by row (6 f pop with a little overshoot), walk in place toward the
    // arrow head on 2 drawings (10-12 video-f cycle, ~3 % bob), every head snaps up toward the panel as it lands and
    // holds there ~1.4 s, then they walk on with an occasional glance back
    // round 7 (A6 P3: the ~46 figures were frozen for 4 s of holds): they now MARCH down the wide arrow at ~0.15 m/s
    // (looping at the far end: they shrink away there and grow back in at the near end), every figure boils (+-1.5 px
    // on 2s), and 5 of them turn their heads back toward the visitor as he arrives (video ~1723)
    { const right = this.v1.set(1, 0, 0).applyQuaternion(cam.quaternion), dir = Math.atan2(BP.crowd[0] - 1.1, -(BP.crowd[2] - 0.1)), dirX = Math.sin(dir);
      const ux = Math.sin(dir), uz = -Math.cos(dir), vx = -uz, vz = ux, S0 = 2.0, S1 = 6.9, bq = Math.floor(VF / 2);
      const flip = right.x * dirX >= 0 ? 1 : -1;
      for (const w of this.walkers) {
        const u = (f - w.f0) / 6; w.m.visible = u > 0;
        if (!w.m.visible) continue;
        const run = Math.max(0, VF - toV(w.f0)) * (0.15 / FPS), s = S0 + ((((w.s - S0 + run) % (S1 - S0)) + (S1 - S0)) % (S1 - S0));
        const endK = sm(Math.min(s - S0, S1 - s) / 0.35);
        const jx = (hash(bq * 1.31 + w.k * 7.7) - 0.5) * 0.014, jy = (hash(bq * 2.17 + w.k * 3.3) - 0.5) * 0.012;
        w.m.position.set(o[0] + 1.1 + ux * s + vx * w.t + jx, o[1] + jy, o[2] + 0.1 + uz * s + vz * w.t);
        const cyc = (VF / w.per + w.ph) % 1, step = cyc < 0.5 ? 0 : 1, bob = 0.03 * Math.abs(Math.sin(cyc * TAU));
        const lv = f - w.look, ev = f - w.early, look = (ev >= 0 && ev < 30) || (lv >= 0 && lv < 42) || (lv >= 42 && ((Math.floor(VF / 30) + Math.floor(w.ph * 7)) % 9 === 0)) ? 1 : 0;
        const sc = outBack(u, 2.2) * w.h * Math.max(1e-3, endK), mat = w.m.material as THREE.MeshBasicMaterial, tx = chalkWalkerTex(step, look, w.chip);
        if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
        w.m.scale.set(sc * flip, sc * (1 + bob), sc);
        w.m.rotation.set(0, Math.atan2(cam.position.x - w.m.position.x, cam.position.z - w.m.position.z), 0);
      } }
    this.bpLensDust.pose(t * 0.8, 9);
    this.bpDust.pose(t, 2);
  }

}

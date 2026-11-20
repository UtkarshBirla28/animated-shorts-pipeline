// THE TOKYO STREET, 8 December 2005 (owner TOKYO; shot 2): the exchange front (granite podium, glass entrance, plain
// "TOKYO STOCK EXCHANGE" letters, an amber LED date board), grey / beige office towers both sides with rooftop signs,
// far tower haze, an asphalt street (road at y -0.15, sidewalks at 0) with lane marks + a zebra crossing to the doors,
// yellow tactile paving, white guard rails, bare December cherry trees, street lamps, a pedestrian signal, vending
// machines, parked bicycles, a red post box; life: the white taxi + a dark sedan crossing, pigeons, steam from a vent.
// CHAR's salarymen stand on the far sidewalk at ST.walkers (kept clear).
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Lighting } from "./sets";
import { ST, type V3 } from "./plan";
import { BEAT } from "./beats";
import { Batch, RB, C, TM, faceMesh, buildInk, M, NOINK, TAU, hash, clamp01, cyc, VF, Q, plane, basic, glowSprite, softDot, contact } from "./setkit";
import { rep, pigeonTex, puffTex, roadTex, aoTex } from "./paint";
import { VOICE_TOTAL } from "./voicewarp";
import * as TP from "./tokyo_paint";

const O = ST.base;
const RD = -0.15;                       // road surface height (sidewalks at 0, so CHAR's walkers stand at y 0)
/** local tree marks (TOKYO-only; ST.trees moved outward so the bare crowns frame the sign instead of crossing it) */
export const TREES: [number, number, number, number][] = [[-10.6, -0.75, 0, -1], [-5.3, -0.75, 1, -1], [5.4, -0.75, 2, 1], [10.8, -0.75, 3, 1], [3.3, 9.75, 4, 1], [-6.2, 9.75, 5, -1]];
const TAXI_Z = ST.taxi[2] - 0.4, SEDAN_Z = 6.6;
/** the exchange front: podium top, sign fascia (two-line letters), LED board centre, the stone front's height */
const PD_H = 8.0, SG_Y0 = 4.5, SG_Y1 = 7.5, LED_Y = 9.25, EX_H = 17;
/** the taxi's x (local) at picture frame f: crosses the doors' axis ~BEAT.small */
export const taxiX = (f: number) => -16 + (f - (BEAT.december - 2)) * 0.36;
const sedanX = (f: number) => 26 - (f - (BEAT.december - 30)) * 0.42;

const W = (x: number, y: number, z: number) => new THREE.Vector3(O[0] + x, O[1] + y, O[2] + z);
const cylG = (r0: number, r1: number, h: number, seg = 10) => new THREE.CylinderGeometry(r1, r0, h, seg).translate(0, h / 2, 0);
/** a tapered rod from a to b (world-local to the batch) */
const rod = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r0: number, r1: number, seg = 7) => {
  const d = c.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, false).translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  b.add(g, mat, new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
};

/** a bare December cherry: a short dark trunk, 3-4 limbs that spread wide and low, twiggy tips (recursive) */
const cherry = (b: Batch, x: number, z: number, seed: number, side: number, s = 1) => {
  const bark = TM("tkBark", () => rep(TP.barkTex(), 1, 2));
  const twig = C("#3a2c2a");
  const base = W(x, 0, z), top = W(x + 0.05 * side, 1.9 * s, z);
  rod(b, bark, base, top, 0.17 * s, 0.12 * s, 9);
  b.add(cylG(0.24 * s, 0.17 * s, 0.25, 9), bark, M(base.x, base.y, base.z));
  let k = 0;
  const grow = (p: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const e = p.clone().addScaledVector(dir, len);
    rod(b, depth > 1 ? bark : twig, p, e, r, r * 0.62, depth > 1 ? 7 : 5);
    if (depth === 0) return;
    const n = depth > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const h1 = hash(seed * 31 + ++k), h2 = hash(seed * 17 + k * 3.1), h3 = hash(seed * 7 + k * 5.3);
      const yaw = Math.atan2(dir.z, dir.x) + (h1 - 0.5) * 1.6, up = Math.asin(Math.max(-0.3, Math.min(0.95, dir.y))) + (h2 - 0.35) * 0.7;
      const nd = new THREE.Vector3(Math.cos(yaw) * Math.cos(up), Math.sin(up), Math.sin(yaw) * Math.cos(up)).normalize();
      grow(e.clone().addScaledVector(dir, -len * 0.15 * h3), nd, len * (0.55 + 0.2 * h3), r * 0.62, depth - 1);
    }
  };
  const nL = 4;
  for (let i = 0; i < nL; i++) {
    const h = hash(seed * 13 + i * 2.7), yaw = (i / nL) * TAU + seed + (h - 0.5) * 0.6;
    // lopsided: the limbs lean away from the doors (side) and a little up; the crown stays wide and low
    let dx = Math.cos(yaw), dz = Math.sin(yaw) * 0.7; dx = dx * 0.75 + side * 0.55;
    const d = new THREE.Vector3(dx, 0.85 + 0.35 * h, dz).normalize();
    grow(top.clone().addScaledVector(d, -0.1), d, (1.35 + 0.4 * h) * s, 0.1 * s, 4);
  }
};

/** a boxy 2005 Japanese taxi along local +x (front at +x), centred, wheels on y 0: white body, a green belt stripe,
 *  the roof lamp, fender mirrors, chrome bumpers */
const taxiGeo = (b: Batch, body: string, belt: string, lamp: boolean) => {
  const wh = C(body), glass = C("#33405a"), chrome = C("#c8ccd2"), blk = C("#1c1c20");
  const ex = (pts: [number, number][], d: number) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }).translate(0, 0, -d / 2); };
  b.add(ex([[-2.3, 0.3], [2.3, 0.3], [2.32, 0.62], [2.26, 0.92], [1.12, 0.96], [-1.5, 0.98], [-2.28, 0.98], [-2.32, 0.62]], 1.62), wh);
  b.add(ex([[1.08, 0.95], [0.5, 1.44], [-1.02, 1.45], [-1.5, 0.98]], 1.5), glass);
  b.add(new THREE.BoxGeometry(1.5, 0.05, 1.54).translate(-0.26, 1.46, 0), wh);
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.1, 0.5, 0.04).rotateZ(-0.62).translate(0.8, 1.2, s * 0.75), wh);
    b.add(new THREE.BoxGeometry(0.1, 0.48, 0.04).translate(-0.18, 1.2, s * 0.755), wh);
    b.add(new THREE.BoxGeometry(0.1, 0.5, 0.04).rotateZ(0.7).translate(-1.27, 1.2, s * 0.755), wh);
    b.add(new THREE.BoxGeometry(4.5, 0.07, 0.02).translate(0, 0.74, s * 0.85), C(belt));
    b.add(new THREE.BoxGeometry(0.02, 0.5, 0.02).translate(-0.18, 0.66, s * 0.852), C("#8a8e96"));
    b.add(new THREE.BoxGeometry(0.02, 0.5, 0.02).translate(0.95, 0.66, s * 0.852), C("#8a8e96"));
    b.add(new THREE.BoxGeometry(0.12, 0.03, 0.02).translate(0.25, 0.82, s * 0.855), chrome);
    b.add(new THREE.BoxGeometry(0.12, 0.03, 0.02).translate(-0.75, 0.82, s * 0.855), chrome);
    // fender mirrors on thin stalks (the 2005 taxi cue)
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.16).translate(1.9, 1.02, s * 0.72), blk);
    b.add(new THREE.BoxGeometry(0.06, 0.1, 0.12).translate(1.9, 1.12, s * 0.74), blk);
    for (const dx of [-1.45, 1.45]) {
      b.add(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18).rotateX(Math.PI / 2).translate(dx, 0.32, s * 0.72), blk);
      b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14).rotateX(Math.PI / 2).translate(dx, 0.32, s * 0.835), chrome);
    }
    b.add(new THREE.BoxGeometry(0.04, 0.12, 0.3).translate(2.33, 0.74, s * 0.58), C("#f6f0d8"));
    b.add(new THREE.BoxGeometry(0.04, 0.16, 0.22).translate(-2.34, 0.76, s * 0.62), C("#d22a22"));
  }
  b.add(new THREE.BoxGeometry(0.1, 0.14, 1.7).translate(2.36, 0.42, 0), chrome);
  b.add(new THREE.BoxGeometry(0.1, 0.14, 1.7).translate(-2.36, 0.42, 0), chrome);
  b.add(new THREE.BoxGeometry(0.03, 0.18, 0.7).translate(2.33, 0.68, 0), C("#9aa0a8"));
  if (lamp) b.add(new THREE.BoxGeometry(0.4, 0.06, 0.16).translate(-0.2, 1.5, 0), blk);
};

/** a parked city bicycle (mamachari) along local +x, leaning a little on its stand */
const bicycle = (b: Batch, x: number, z: number, yaw: number, col: string) => {
  const m = M(O[0] + x, 0, O[2] + z, yaw, [1, 1, 1], 0.08, 0), fr = C(col), blk = C("#1e1e22"), sil = C("#b8bcc4");
  const add = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g, mat, m);
  for (const dx of [-0.52, 0.52]) { add(new THREE.TorusGeometry(0.33, 0.025, 6, 22).translate(dx, 0.34, 0), blk); add(new THREE.CylinderGeometry(0.03, 0.03, 0.06).rotateX(Math.PI / 2).translate(dx, 0.34, 0), sil); }
  const seg = (a: [number, number], c: [number, number], r = 0.018, mat = fr) => { const A = new THREE.Vector3(a[0], a[1], 0), B = new THREE.Vector3(c[0], c[1], 0), d = B.clone().sub(A), L = d.length();
    add(new THREE.CylinderGeometry(r, r, L, 6).translate(0, L / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).translate(A.x, A.y, 0), mat); };
  seg([-0.52, 0.34], [-0.08, 0.36]); seg([-0.08, 0.36], [0.36, 0.78]); seg([-0.08, 0.36], [-0.22, 0.86]); seg([-0.52, 0.34], [-0.22, 0.8]); seg([0.52, 0.34], [0.38, 0.92]);
  seg([-0.22, 0.86], [-0.24, 0.92], 0.02, blk); add(new THREE.BoxGeometry(0.24, 0.05, 0.13).translate(-0.24, 0.94, 0), blk);
  seg([0.38, 0.92], [0.3, 1.0], 0.016, sil); add(new THREE.CylinderGeometry(0.014, 0.014, 0.56).rotateX(Math.PI / 2).translate(0.3, 1.0, 0), sil);
  add(new THREE.BoxGeometry(0.3, 0.2, 0.34).translate(0.6, 0.86, 0), C("#4a4e56"));
  add(new THREE.BoxGeometry(0.55, 0.02, 0.06).translate(0.52, 0.66, 0), sil);
  add(new THREE.BoxGeometry(0.62, 0.025, 0.1).translate(-0.5, 0.67, 0), sil);
};

export class TokyoStreet {
  readonly group = new THREE.Group();
  private taxi = new THREE.Group(); private sedan = new THREE.Group();
  private pigeons: THREE.Sprite[] = []; private puffs: THREE.Sprite[] = [];
  private ped!: THREE.Mesh; private pedTex = [TP.pedSigTex(false), TP.pedSigTex(true)];
  private skyMats: THREE.MeshBasicMaterial[] = [];
  private led!: THREE.MeshBasicMaterial; private glints: THREE.Sprite[] = [];

  constructor() {
    const S = this.group, rb = new RB(O), b = new Batch(), bd = new Batch();
    // ---------------- ground ----------------
    rb.flatY(TM("tkRoad", () => rep(roadTex("tkRoadT", "#58595f"), 1, 1)), -160, 160, 0, 9, RD, 1, 6, 6);
    rb.box(C("#a8a49a"), -160, RD - 0.2, -0.22, 160, 0.0, 0.0, false);                       // far kerb stone
    rb.box(C("#a8a49a"), -160, RD - 0.2, 9.0, 160, 0.0, 9.22, false);                         // near kerb stone
    rb.flatY(TM("tkPaver", () => rep(TP.paverTex(), 1, 1)), -160, 160, -40, -0.22, 0, 1, 2.4, 2.4);
    rb.flatY(TM("tkPaver", () => rep(TP.paverTex(), 1, 1)), -160, 160, 9.22, 60, 0, 1, 2.4, 2.4);
    { const tm = TM("tkTactile", () => rep(TP.tactileTex(), 1, 1));                             // yellow guide blocks
      rb.flatY(tm, -160, 160, -2.78 + 0, -2.48, 0.006, 1, 1.2, 0.3); rb.flatY(tm, -160, 160, 11.0, 11.3, 0.006, 1, 1.2, 0.3); }
    // lane marks: edge lines, a dashed centre line, stop lines and the zebra crossing to the doors
    const paint = C("#e6e3d8"), y0 = RD + 0.004;
    for (const z of [0.35, 8.55]) { rb.box(paint, -160, RD, z, -3.0, y0, z + 0.15, false); rb.box(paint, 3.0, RD, z, 160, y0, z + 0.15, false); }
    for (let x = -60; x < 60; x += 8) { if (x + 4 > -4.5 && x < 4.5) continue; rb.box(paint, x, RD, 4.45, x + 4, y0, 4.6, false); }
    rb.box(paint, -4.2, RD, 0.5, -3.75, y0, 4.4, false); rb.box(paint, 3.75, RD, 4.65, 4.2, y0, 8.5, false);
    for (let z = 0.55; z < 8.8; z += 0.9) rb.box(TM("tkPaintW", () => rep(TP.paintTex(), 2, 0.3)), -2.2, RD, z, 2.2, y0 + 0.002, z + 0.45, false);
    flatDecal(bd, TM("tkManhole", () => TP.manholeTex(), { transparent: true, alphaTest: 0.4 }), 4.4, 6.6, 0.8, 0.8, RD + 0.008);
    flatDecal(bd, TM("tkManhole", () => TP.manholeTex(), { transparent: true, alphaTest: 0.4 }), -7.5, 2.2, 0.8, 0.8, RD + 0.008);
    // ---------------- THE EXCHANGE (x -9..9, front z -4) ----------------
    const gran = TM("tkGranite", () => rep(TP.graniteTex(), 1, 1)), granD = TM("tkGraniteD", () => rep(TP.graniteTex("tkGraniteD", "#5e5852"), 1, 1));
    const exU = TM("tkExchange", () => rep(TP.exchangeTex(), 1, 1)), FZ = ST.facadeZ, en = ST.entrance;
    const ex0 = -en.w / 2, ex1 = en.w / 2;
    rb.wallZ(gran, -9, ex0 - 0.5, 0, PD_H, FZ, 1, 4, 4); rb.wallZ(gran, ex1 + 0.5, 9, 0, PD_H, FZ, 1, 4, 4);
    rb.wallZ(gran, ex0 - 0.5, ex1 + 0.5, en.h + 0.6, PD_H, FZ, 1, 4, 4);
    // the entrance: a deep stone portal, glass doors set back, a lit soffit with downlights, steps
    rb.box(granD, ex0 - 0.5, 0, FZ - 1.2, ex0, en.h + 0.6, FZ + 0.25); rb.box(granD, ex1, 0, FZ - 1.2, ex1 + 0.5, en.h + 0.6, FZ + 0.25);
    rb.box(granD, ex0 - 0.5, en.h, FZ - 1.2, ex1 + 0.5, en.h + 0.6, FZ + 0.25);
    rb.wallX(C("#cbbfa8"), FZ - 1.2, FZ, 0, en.h, ex0, 1, 2, 2); rb.wallX(C("#cbbfa8"), FZ - 1.2, FZ, 0, en.h, ex1, -1, 2, 2);
    { const d = faceMesh(TP.doorsTex(), en.w, en.h, false); (d.material as THREE.MeshBasicMaterial).color.setScalar(0.92); d.position.copy(W(0, en.h / 2, FZ - 1.18)); d.layers.set(NOINK); S.add(d); }
    rb.flatY(C("#f2e8d0"), ex0, ex1, FZ - 1.2, FZ + 0.25, en.h - 0.01, -1, 2, 2);
    for (const x of [-1.2, 0, 1.2]) { const g = glowSprite(S, [O[0] + x, en.h - 0.05, O[2] + FZ - 0.5], 0.5, new THREE.Color(1.3, 1.15, 0.85)); void g; }
    rb.box(C("#bdb3a2"), ex0 - 1.2, 0, FZ - 0.0, ex1 + 1.2, 0.08, FZ + 0.7, false);
    // the canopy over the doors (dark steel + glass edge), two tie rods
    rb.box(C("#40444c"), ex0 - 0.9, en.h + 0.66, FZ + 0.25, ex1 + 0.9, en.h + 0.8, FZ + 1.9);
    rb.box(C("#9fb4c8"), ex0 - 0.9, en.h + 0.8, FZ + 1.85, ex1 + 0.9, en.h + 0.86, FZ + 1.92);
    // the sign fascia (dark granite band) + the plain bronze letters (two lines: they read big in the vertical frame)
    rb.box(granD, -3.6, SG_Y0, FZ, 3.6, SG_Y1, FZ + 0.08);
    rb.box(C("#c8a060"), -3.6, SG_Y1 - 0.06, FZ + 0.06, 3.6, SG_Y1, FZ + 0.12); rb.box(C("#c8a060"), -3.6, SG_Y0, FZ + 0.06, 3.6, SG_Y0 + 0.06, FZ + 0.12);
    { const sw = 6.6, sh = sw * 640 / 1600, sg = faceMesh(TP.signTex(), sw, sh, true); sg.position.copy(W(0, (SG_Y0 + SG_Y1) / 2, FZ + 0.1)); sg.layers.set(NOINK); S.add(sg); }
    // piers + tall ground-floor windows between them
    for (const x of [-8.7, -6.0, -3.4, 3.4, 6.0, 8.7]) rb.box(gran, x - 0.35, 0, FZ, x + 0.35, PD_H, FZ + 0.32);
    const win = TM("tkWinGlass", () => rep(TP.officeTex(2), 1, 1));
    for (const [a, c] of [[-8.35, -6.35], [-5.65, -3.75], [3.75, 5.65], [6.35, 8.35]]) { rb.wallZ(win, a, c, 0.7, 3.9, FZ + 0.02, 1, 2.0, 3.2); rb.wallZ(win, a, c, 4.6, 7.6, FZ + 0.02, 1, 2.0, 3.2, 0, 0.8); }
    rb.box(C("#d8ccb2"), -9.1, PD_H, FZ - 0.1, 9.1, PD_H + 0.35, FZ + 0.45);               // podium cornice
    // upper floors (set back a little), side faces, parapet
    const UP = PD_H + 0.35;
    rb.wallZ(exU, -9, 9, UP, EX_H, FZ - 0.3, 1, 9, 9); rb.wallX(exU, -24, FZ - 0.3, UP, EX_H, 9, 1, 9, 9); rb.wallX(exU, -24, FZ - 0.3, UP, EX_H, -9, -1, 9, 9);
    rb.wallX(gran, -24, FZ, 0, UP, 9, 1, 4, 4); rb.wallX(gran, -24, FZ, 0, UP, -9, -1, 4, 4);
    rb.box(C("#d8ccb2"), -9.2, EX_H, FZ - 0.5, 9.2, EX_H + 0.7, FZ + 0.1); rb.flatY(C("#8a8478"), -9, 9, -24, FZ - 0.3, EX_H + 0.01, 1, 4, 4);
    // a flagpole pair on the parapet (plain white flags, no marks), the LED date board on the upper facade
    for (const x of [-7.5, 7.5]) { rb.seg(C("#d8dadc"), [x, EX_H + 0.7, FZ - 0.1], [x, EX_H + 5.4, FZ - 0.1], 0.05); }
    rb.box(C("#24262a"), -3.0, LED_Y - 0.72, FZ - 0.3, 3.0, LED_Y + 0.72, FZ + 0.05);
    { const l = faceMesh(TP.ledTex("DEC 8, 2005"), 5.7, 1.07); this.led = l.material as THREE.MeshBasicMaterial; l.position.copy(W(0, LED_Y, FZ + 0.07)); l.layers.set(NOINK); S.add(l); }
    // a taller set-back tower behind (pale, hazy over the stone front)
    tower(rb, TM("tkOffice3", () => rep(TP.officeTex(3), 1, 1)), 3, 16, -36, -20, 0, 58, 12.8, 0.3);
    // ---------------- neighbours (both sides), far towers, the haze skyline ----------------
    const off = (i: number) => TM("tkOffice" + i, () => rep(TP.officeTex(i), 1, 1));
    tower(rb, off(0), -24, -9.4, -22, FZ, 0, 38, 12.8, 0.1); storefront(rb, S, -24, -9.4, FZ + 0.02, 0);
    tower(rb, off(2), 9.4, 22, -20, FZ, 0, 47, 12.8, 0.6); storefront(rb, S, 9.4, 22, FZ + 0.02, 1);
    tower(rb, off(1), -40, -24.4, -22, FZ - 0.5, 0, 30, 12.8, 0.3); tower(rb, off(3), 22.4, 38, -20, FZ - 0.5, 0, 35, 12.8, 0.8);
    tower(rb, off(0), -58, -40.4, -24, FZ - 0.5, 0, 42, 12.8, 0.45); tower(rb, off(1), 38.4, 56, -22, FZ - 0.5, 0, 27, 12.8, 0.15);
    const far: [number, number, number, number, number, number][] = [[-30, -12, -60, -42, 86, 2], [16, 34, -58, -40, 74, 3], [-52, -36, -70, -52, 64, 1], [38, 54, -78, -60, 96, 2]];
    const offH = (i: number) => TM("tkOfficeHaze" + i, () => rep(TP.officeTex(i), 1, 1), { color: "#c4d0e2" });
    for (const [a, c, z0, z1, h, st] of far) tower(rb, offH(st), a, c, z0, z1, 0, h, 12.8, (a * 0.37) % 1);
    for (const [x, y, z, w, txt, bg, fg, jp] of [[-16.5, 38, FZ - 0.2, 7, "証券", "#1e4a8a", "#ffffff", 1], [15.8, 47, FZ - 0.2, 8, "SECURITIES", "#f2f0ea", "#c8282a", 0],
      [-32, 30, FZ - 0.7, 7, "HOTEL", "#2a2a30", "#f2d27a", 0], [30, 35, FZ - 0.7, 6.5, "BANK", "#f2f0ea", "#1e4a8a", 0]] as [number, number, number, number, string, string, string, number][]) {
      rb.box(C("#5a5e66"), x - w / 2, y, z - 0.6, x + w / 2, y + 0.25, z - 0.2);
      for (const sx of [-w / 2 + 0.3, 0, w / 2 - 0.3]) rb.box(C("#5a5e66"), x + sx - 0.06, y, z - 0.5, x + sx + 0.06, y + 1.0, z - 0.4);
      const s = faceMesh(TP.roofSignTex(txt, bg, fg, !!jp), w, w / 4); (s.material as THREE.MeshBasicMaterial).color.setScalar(0.95); s.position.copy(W(x, y + 0.25 + w / 8, z - 0.38)); S.add(s);
    }
    for (const [x, z, w, h, seed, k] of [[0, -260, 700, 175, 1, 0.55], [-120, -180, 300, 120, 2, 0.4], [150, -200, 320, 110, 3, 0.4]] as const) {
      const m = new THREE.MeshBasicMaterial({ map: TP.skylineTex(seed), transparent: true, depthWrite: false, color: new THREE.Color(0.86, 0.9, 0.98), fog: true, opacity: 1 - k * 0.3 });
      this.skyMats.push(m); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.copy(W(x, h / 2 - 1, z)); p.layers.set(NOINK); p.renderOrder = -0.2; S.add(p);
    }
    // ---------------- street furniture ----------------
    for (const [x, z, seed, side] of TREES) { cherry(b, x, z, seed, side, z > 5 ? 1.15 : 1); flatDecal(bd, TM("tkTreePit", () => TP.manholeTex(), { transparent: true, alphaTest: 0.4, color: "#8a8a8a" }), x, z, 1.1, 1.1, 0.008); }
    // white guard rails along the far kerb (open at the crossing)
    { const rail = C("#e8eaee"), post = C("#d8dade");
      for (const [a, c] of [[-26, -3.0], [3.0, 26]]) { for (let x = a; x <= c + 1e-3; x += 2) b.add(cylG(0.035, 0.035, 0.85, 8), post, M(O[0] + x, 0, O[2] - 0.45));
        for (const y of [0.55, 0.82]) b.add(new THREE.CylinderGeometry(0.025, 0.025, c - a, 8).rotateZ(Math.PI / 2), rail, M(O[0] + (a + c) / 2, y, O[2] - 0.45)); } }
    // street lamps (a tall pole with a curved arm), a pedestrian signal on the far kerb, a vehicle signal
    for (const [x, z, dir] of [[-8.0, -0.5, 1], [8.2, -0.5, 1], [-1.0, 9.6, -1]] as const) streetLamp(b, x, z, dir);
    { const pole = C("#8a8e96"); b.add(cylG(0.06, 0.06, 3.2, 10), pole, M(O[0] + 2.55, 0, O[2] - 0.32)); b.add(new THREE.BoxGeometry(0.34, 0.66, 0.2), C("#2a2c30"), M(O[0] + 2.55, 2.75, O[2] - 0.2));
      this.ped = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), new THREE.MeshBasicMaterial({ map: this.pedTex[0] })); this.ped.position.copy(W(2.55, 2.75, -0.09)); this.ped.layers.set(NOINK); S.add(this.ped);
      b.add(cylG(0.09, 0.08, 5.6, 10), pole, M(O[0] - 3.2, 0, O[2] - 0.35)); b.add(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8).rotateX(Math.PI / 2), pole, M(O[0] - 3.2, 5.4, O[2] + 1.75));
      b.add(new THREE.BoxGeometry(0.3, 0.36, 1.25), C("#3a3e46"), M(O[0] - 3.22, 5.05, O[2] + 3.4));
      for (const [k, c] of [[0, "#3a6a5a"], [1, "#6a5a2a"], [2, "#ff4030"]] as const) { const lm = plane(S, basic("tkSig" + k, () => ({ color: k === 2 ? new THREE.Color(2.2, 0.5, 0.35) : new THREE.Color(c) })), 0.26, 0.26, [O[0] - 3.38, 5.05, O[2] + 3.4 - 0.4 + k * 0.4], -Math.PI / 2, 0, 0, true); void lm; }
      b.add(new THREE.BoxGeometry(0.02, 0.6, 2.3), C("#e8e6e0"), M(O[0] - 3.2, 4.45, O[2] + 3.4)); }
    // vending machines along the exchange's right bay (glowing) + a recycling bin; bicycles; the red post box
    for (const [x, i] of [[4.25, 0], [5.2, 1], [6.95, 2]] as const) {
      const z0 = FZ + 0.34, z1 = z0 + 0.72;
      rb.box(C(["#e2e6ea", "#c8302c", "#2e5aa8"][i]), x - 0.46, 0, z0, x + 0.46, 1.83, z1);
      const f = faceMesh(TP.vendTex(i), 0.9, 1.8); (f.material as THREE.MeshBasicMaterial).color.setScalar(1.0); f.position.copy(W(x, 0.92, z1 + 0.01)); f.layers.set(NOINK); S.add(f);
      rb.box(C("#4a4e56"), x - 0.48, 1.83, z0 - 0.02, x + 0.48, 1.9, z1 + 0.04);
      contact(S, [O[0] + x, 0.01, O[2] + z1], 1.1, 0.7, 0.35);
    }
    rb.box(C("#2e6ab0"), 6.0, 0, FZ + 0.6, 6.4, 0.8, FZ + 0.95); rb.box(C("#2a2c30"), 5.98, 0.8, FZ + 0.58, 6.42, 0.84, FZ + 0.97);
    for (const [x, z, yaw, col] of [[-4.6, -1.15, 0.12, "#c8ccd4"], [-3.9, -1.25, -0.08, "#b8302c"], [6.8, -1.1, 3.14, "#e8e8e8"], [7.5, -1.2, 3.0, "#3a5a8a"]] as const) bicycle(b, x, z, yaw, col);
    { const red = C("#c82a26"); b.add(cylG(0.24, 0.22, 1.1, 14), red, M(O[0] - 7.3, 0, O[2] - 1.1)); b.add(new THREE.SphereGeometry(0.25, 14, 8, 0, TAU, 0, Math.PI / 2), red, M(O[0] - 7.3, 1.1, O[2] - 1.1));
      b.add(new THREE.BoxGeometry(0.28, 0.04, 0.05), C("#2a1a1a"), M(O[0] - 7.3, 0.92, O[2] - 0.86)); }
    // contact shade under the furniture
    for (const [x, z, w, d] of [[-4.25, -1.2, 1.8, 0.9], [7.15, -1.15, 1.8, 0.9], [-7.3, -1.1, 0.8, 0.8]]) contact(S, [O[0] + x, 0.01, O[2] + z], w, d, 0.4);
    { const band = new THREE.MeshBasicMaterial({ map: aoTex(), color: "#2a2840", transparent: true, opacity: 0.4, depthWrite: false });
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.4).rotateX(-Math.PI / 2), band); fm.position.copy(W(0, 0.012, FZ + 0.3)); fm.layers.set(NOINK); S.add(fm); }
    // ---------------- traffic ----------------
    { const tb = new Batch(); taxiGeo(tb, "#f4f2ec", "#2f8a5a", true); buildInk(tb, this.taxi, 1); S.add(this.taxi);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.14), C("#f4e6b8")); lamp.position.set(-0.2, 1.63, 0); lamp.castShadow = true; this.taxi.add(lamp);
      for (const s of [-1, 1]) { const f = faceMesh(TP.taxiLampTex(), 0.36, 0.18, true); f.position.set(-0.2, 1.63, s * 0.072); if (s < 0) f.rotation.y = Math.PI; f.layers.set(NOINK); this.taxi.add(f); }
      contactChild(this.taxi, 5.0, 2.0, 0.5);
      const sb = new Batch(); taxiGeo(sb, "#2a3448", "#2a3448", false); buildInk(sb, this.sedan, 1); this.sedan.rotation.y = Math.PI; contactChild(this.sedan, 5.0, 2.0, 0.5); S.add(this.sedan); }
    // ---------------- life ----------------
    for (let k = 0; k < 6; k++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: pigeonTex(0), transparent: true, depthWrite: false })); p.layers.set(NOINK); p.renderOrder = 5; S.add(p); this.pigeons.push(p); }
    for (let k = 0; k < 5; k++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, color: "#ffffff" })); p.layers.set(NOINK); p.renderOrder = 5; S.add(p); this.puffs.push(p); }
    for (let k = 0; k < 3; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.layers.set(NOINK); S.add(s); this.glints.push(s); }
    rb.done(S); buildInk(b, S, 1); buildInk(bd, S, 0, false);
  }

  pose(ctx: SetCtx, L: Lighting) {
    const f = ctx.f, vf = VF;
    // the taxi and the dark sedan (left-hand traffic: the taxi in the lane by the exchange, heading +x)
    this.taxi.position.copy(W(taxiX(f), RD + 0.01 * Math.abs(cyc(97, vf)), TAXI_Z)); this.taxi.visible = Math.abs(taxiX(f)) < 60;
    this.sedan.position.copy(W(sedanX(f), RD, SEDAN_Z)); this.sedan.visible = Math.abs(sedanX(f)) < 60;
    // a chrome glint slides over the taxi as it passes the sun side
    { const x = taxiX(f); this.glints.forEach((g, k) => { const on = false; g.visible = on; if (on) { const u = (x + 6) / 14; g.position.copy(W(x + 0.9 - 1.6 * u, 1.0, TAXI_Z + 0.9)); g.scale.setScalar(0.35 * Math.sin(Math.PI * u)); } }); }
    // the walk signal turns once the taxi is past the crossing
    { const walk = taxiX(f) > 4.5; const m = this.ped.material as THREE.MeshBasicMaterial; const t = this.pedTex[walk ? 1 : 0]; if (m.map !== t) { m.map = t; m.needsUpdate = true; } }
    // the LED board's dots breathe a little (whole cycles)
    this.led.color.setScalar(1.25 + 0.06 * cyc(37, vf));
    // pigeons on the far sidewalk by the doors; two scatter as the taxi passes
    const P0: V3[] = [[-0.9, 0, -1.35], [-0.35, 0, -1.0], [0.6, 0, -1.55], [1.05, 0, -1.1], [-1.6, 0, -1.7], [2.0, 0, -1.25]];
    this.pigeons.forEach((p, k) => {
      const [px, , pz] = P0[k], ph = hash(k * 7.7) * TAU, peck = Math.sin((TAU * (31 + 3 * k) * vf) / VOICE_TOTAL + ph) > 0.4;
      const t0 = k < 2 ? BEAT.december + 32 + k * 4 : 1e9, u = clamp01((f - t0) / 26), fly = f >= t0;
      const walk = 0.08 * Math.sin((TAU * (5 + k) * vf) / VOICE_TOTAL + ph);
      p.position.copy(W(px + walk + (fly ? -3.5 * u * u - 0.6 * u : 0), 0.16 + (fly ? 3.4 * u * u + 0.5 * Math.sin(Math.PI * u) : 0), pz - (fly ? 1.5 * u : 0)));
      p.visible = !(fly && u >= 1);
      const fr = fly ? (Math.floor((f - t0) / 2) % 2 ? 3 : 2) : peck ? 1 : 0, mat = p.material as THREE.SpriteMaterial, tx = pigeonTex(fr);
      if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      const sz = fly ? 0.44 : 0.36; p.scale.set((k % 2 ? -1 : 1) * (fly ? -1 : 1) * sz, sz, 1);
    });
    // steam breathing out of the road vent (loop-safe whole cycles)
    this.puffs.forEach((p, k) => {
      const u = ((47 * vf) / VOICE_TOTAL + k / this.puffs.length) % 1;
      p.position.copy(W(4.4 + 0.5 * u + 0.1 * Math.sin(u * 7 + k), RD + 0.1 + 1.9 * u, 6.6 - 0.25 * u)); p.scale.setScalar(0.45 + 1.3 * u);
      (p.material as THREE.SpriteMaterial).opacity = 0.42 * Math.sin(Math.PI * u) ** 0.8;
    });
    for (const m of this.skyMats) m.color.set(ctx.light.fog).multiplyScalar(0.96);
    // practicals: the warm lobby spill at the doors, the vending glow
    L.pool([O[0], 1.2, O[2] + ST.facadeZ + 0.8], [0.55, 0.42, 0.24], 4.2);
    L.pool([O[0] - 2.45, 1.0, O[2] + 10.2], [0.3, 0.32, 0.36], 2.4);
    void Q;
  }
}

/** a flat decal on the ground (y) */
function flatDecal(b: Batch, mat: THREE.Material, x: number, z: number, w: number, d: number, y: number) {
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat, M(O[0] + x, y, O[2] + z));
}
/** an office tower box (front + sides + roof; texture tile s metres, u offset uo) from y0 to y1 */
function tower(rb: RB, mat: THREE.Material, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s: number, uo: number) {
  rb.wallZ(mat, x0, x1, y0, y1, z1, 1, s, s, uo * s, 0); rb.wallX(mat, z0, z1, y0, y1, x0, -1, s, s, uo * s * 0.7); rb.wallX(mat, z0, z1, y0, y1, x1, 1, s, s, uo * s * 0.3);
  rb.flatY(C("#7a7c80"), x0, x1, z0, z1, y1, 1, 4, 4);
  rb.box(C("#8e9096"), x0 - 0.1, y1, z1 - 0.4, x1 + 0.1, y1 + 0.6, z1 + 0.1);
  rb.box(C("#6a6e76"), x0 + (x1 - x0) * 0.25, y1, z0 + 2, x0 + (x1 - x0) * 0.55, y1 + 2.4, z0 + (z1 - z0) * 0.5);
}
/** a ground-floor shopfront (generic: warm-lit glass, a plain awning band) */
function storefront(rb: RB, S: THREE.Object3D, x0: number, x1: number, z: number, i: number) {
  rb.box(C(["#3a3e46", "#7a3a2a"][i]), x0, 3.4, z, x1, 3.9, z + 0.4);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.6, 3.0), new THREE.MeshBasicMaterial({ map: rep(TP.doorsTex(), (x1 - x0) / 5, 1), color: new THREE.Color(0.86, 0.84, 0.8) }));
  m.position.set(O[0] + (x0 + x1) / 2, 1.6, O[2] + z + 0.01); m.layers.set(NOINK); S.add(m);
}
function streetLamp(b: Batch, x: number, z: number, dir: number) {
  const pole = C("#6a6e78"), X = O[0] + x, Z = O[2] + z;
  b.add(cylG(0.11, 0.075, 6.2, 12), pole, M(X, 0, Z));
  const a = new THREE.Vector3(X, 6.1, Z), c = new THREE.Vector3(X, 6.55, Z + dir * 0.7), e = new THREE.Vector3(X, 6.6, Z + dir * 1.5);
  rod(b, pole, a, c, 0.06, 0.05); rod(b, pole, c, e, 0.05, 0.045);
  b.add(new THREE.BoxGeometry(0.34, 0.12, 0.62), C("#4a4e56"), M(X, 6.56, Z + dir * 1.62));
  b.add(new THREE.BoxGeometry(0.28, 0.03, 0.5), C("#f4f0e0"), M(X, 6.49, Z + dir * 1.62));
}
function contactChild(g: THREE.Object3D, w: number, d: number, op: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), basic("tkCarBlob" + op, () => ({ map: aoTex(), color: new THREE.Color("#2a2840"), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.layers.set(NOINK); m.renderOrder = 2; g.add(m);
}

// THE HERO DESK (owner DESK): everything on the trader's desk at TR.desk. The chunky 2005 keyboard (painted legends,
// kana, a cable) with the big glowing ENTER key and the big red CANCEL key; the HERO HAND (desk_hand.ts); the blue
// ORDER SCREEN (canvas states, a pure function of shot + frame) on the centre monitor + two side monitors (quotes,
// chart); the SHARES SOLD split-flap counter on top; the certificate fountain (desk_cert.ts); and the desk's life:
// tea with steam, the curly-cord phone, the warm lamp, paper stacks, notes, pen cup, an ID tray with a hanko, cables.
// LOOP: shots 1 and 14 run their idle life on tau (0 at frame 0 and at the last frame), so frame 0 == frame 2540.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import type { Lighting, SetModule } from "./sets";
import { TR, V3 } from "./plan";
import { BEAT, SHOTS } from "./beats";
import { RB, C, TM, tx, plane, contact, glowSprite, bulb, cylY, hash, clamp01, smooth, softDot, wispTex, glareTex, TAU, NOINK, outBack } from "./setkit";
import { LOOPN, lsin, lfr, KB, ENTER_K, CANCEL_K, keyLayout, kbTex, enterTex, cancelTex, orderTex, Ord, SCR, SCR_W, SCR_H, glowRectTex, scanTex, quotesTex, chartTex,
  flapAtlas, CNT, counterFaceTex, lamTex, edgeTex, sheetTex, noteTex, phoneTex, idTex, certTex, ghostTex, plateTex, bigClockTex, pageTex, slipTex } from "./desk_tex";
import { HeroHand, SHOULDER } from "./desk_hand";
import { Fountain } from "./desk_cert";
import { SIP_WINDOW } from "./cast";
import { PRESS1, CUT8, STARE8, DOTS8, PRESS8A, PRESS8B, CUT6, qtyDigitAt, STRIP6, REFUSE8, faceOnAt } from "./desk_beats";
import { HK, CERT, certA, certB, certDrift, certMyst, tickAt, pageAt, PAGES } from "./hook";
import type { CertPose } from "./hook";
import { lam as lamM } from "./setkit";

/** fix2: the big hanging board (set-local centre of its counter face, scale of the desk counter, yaw toward the front-right
 *  lens), the clock over it; the trader's LEFT shoulder as the front lens sees his card (the 3D arm ends there) */
export const BIG = { c: [-0.62, 2.03, 2.75] as V3, s: 2.3, yaw: 0.36, clockY: 2.93, clockR: 0.3 };
const SH_FRONT: V3 = [-0.13, 0.97, 1.83];
const _hq = new THREE.Quaternion(), _he = new THREE.Euler(), _hi = new THREE.Quaternion();

/** true while the DESK's 3D hero hand (sleeve + finger) is shown in shot id at frame f (CHAR hides the trader's arm then) */
export const deskHand = (id: number, f: number) => id === 1 || id === 14 || (id === 6 && f < CUT6) || (id === 8 && f >= CUT8 && !STARE8.some(([a, b]) => f >= a && f < b));
void CUT6;

// ---------------- geometry helpers ----------------
/** a key cap: a frustum box (outer footprint at yb, inset top at yt) with a top-down planar uv over rect U */
const capGeo = (x0: number, x1: number, z0: number, z1: number, yb: number, yt: number, ins: number, U: { x0: number; x1: number; z0: number; z1: number }) => {
  const B = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], T = [[x0 + ins, z0 + ins * 0.8], [x1 - ins, z0 + ins * 0.8], [x1 - ins, z1 - ins * 1.2], [x0 + ins, z1 - ins * 1.2]];
  const pos: number[] = [], uv: number[] = [];
  const P = (x: number, y: number, z: number) => { pos.push(x, y, z); uv.push((x - U.x0) / (U.x1 - U.x0), 1 - (z - U.z0) / (U.z1 - U.z0)); };
  const q = (a: number[], b: number[], c: number[], d: number[]) => { for (const v of [a, b, c, a, c, d]) P(v[0], v[1], v[2]); };
  const t = T.map(([x, z]) => [x, yt, z]), b = B.map(([x, z]) => [x, yb, z]);
  q(t[3], t[2], t[1], t[0]);                 // top (+y)
  q(b[3], b[2], t[2], t[3]);                 // front (+z)
  q(b[1], b[0], t[0], t[1]);                 // back
  q(b[0], b[3], t[3], t[0]);                 // left
  q(b[2], b[1], t[1], t[2]);                 // right
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
};
/** place a local offset l of a part rotated by ry about centre c */
const rot = (c: V3, ry: number, l: V3): V3 => { const cs = Math.cos(ry), sn = Math.sin(ry); return [c[0] + l[0] * cs + l[2] * sn, c[1] + l[1], c[2] - l[0] * sn + l[2] * cs]; };
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private base: THREE.CatmullRomCurve3, private r: number, private turns: number) { super(); }
  getPoint(t: number, out = new THREE.Vector3()) {
    const p = this.base.getPoint(t), d = this.base.getTangent(t), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3().crossVectors(d, up);
    if (s.lengthSq() < 1e-6) s.set(1, 0, 0); s.normalize(); const u = new THREE.Vector3().crossVectors(s, d).normalize(), a = t * this.turns * TAU;
    return out.copy(p).addScaledVector(s, Math.cos(a) * this.r).addScaledVector(u, Math.sin(a) * this.r);
  }
}
const tube = (pts: V3[], r: number, seg = 48) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 6, false);

// ---------------- the press curve ----------------
type Press = { lift0: number; down0: number; contact: number; up0: number; settle: number };
/** finger height offset (m) relative to its hover point: lift, the strike (accelerating), the hold, the bounce back */
/** fix4 (2): shot 6: the hero finger TYPES the order: one tap per QTY digit (6 1 0 0 0 0, contacts = qtyDigitAt), a TAB
 *  to the PRICE box (STRIP6 + 4), the lone '1' on "¥1" (contact = BEAT.yen1). Fingertip targets on the number row. */
const TYPE6 = (() => {
  const K = keyLayout(), kx = (lab: string) => { const k = K.find((q) => q.label === lab)!; return [(k.x0 + k.x1) / 2, (k.z0 + k.z1) / 2] as [number, number]; };
  const seq: [string, number][] = [["6", qtyDigitAt(0)], ["1", qtyDigitAt(1)], ["0", qtyDigitAt(2)], ["0", qtyDigitAt(3)], ["0", qtyDigitAt(4)], ["0", qtyDigitAt(5)], ["TAB", STRIP6 + 4], ["1", BEAT.yen1]];
  return seq.map(([lab, f]) => ({ p: kx(lab), f }));
})();
/** the fingertip over the keyboard at frame f: [x, z, dip 0..1] (it travels to the next key between taps, dips 2 f, holds 1, lifts 4) */
const type6At = (f: number): [number, number, number] => {
  let j = TYPE6.findIndex((t) => f <= t.f + 1); if (j < 0) j = TYPE6.length - 1;
  const b = TYPE6[j], a = TYPE6[Math.max(0, j - 1)], f0 = j ? a.f + 1 : b.f - 30, u = smooth((f - f0) / Math.max(2, b.f - 2 - f0));
  let dip = 0; for (const t of TYPE6) { const d = f - t.f; dip = Math.max(dip, d < -2 ? 0 : d < 0 ? (d + 2.5) / 2.5 : d < 1.5 ? 1 : Math.max(0, 1 - (d - 1.5) / 4)); }
  return [a.p[0] + (b.p[0] - a.p[0]) * u, a.p[1] + (b.p[1] - a.p[1]) * u, dip];
};
const pressDY = (f: number, P: Press, hover: number, lift: number, travel: number, after = 0) => {
  if (f < P.lift0) return 0;
  if (f < P.down0) return lift * smooth((f - P.lift0) / (P.down0 - P.lift0));
  const bottom = -(hover + travel);
  if (f < P.contact) { const u = (f - P.down0) / (P.contact - P.down0); return lift + (bottom - lift) * u * u; }
  if (f < P.up0) return bottom;
  const u = clamp01((f - P.up0) / (P.settle - P.up0));
  return bottom + (after - bottom) * outBack(u, 1.4);
};

// ---------------- counter values ----------------
const RED_AT = 14500;
/** SHARES SOLD value of shot id at picture frame f */
const soldAt = (id: number, f: number) => {
  if (id === 1) {
    const T0 = BEAT.typo + 3, B = BEAT.billion, H1 = B + 14, E = BEAT.exist1End;
    if (f < T0) return 0;
    if (f < B) return Math.pow(RED_AT + 1, (f - T0) / (B - T0)) - 1;
    if (f < H1) return RED_AT;
    if (f < E) { const u = (f - H1) / (E - H1), e = u * u * (3 - 2 * u) * 0.35 + u * 0.65; return RED_AT * Math.pow(610000 / RED_AT, e); }
    return 610000;
  }
  if (id === 8) {
    const a = SHOTS[7].a, m = BEAT.cancelIt - 6, b = SHOTS[7].b;
    if (f < m) return 2400 * Math.pow(RED_AT / 2400, (f - a) / (m - a));
    return RED_AT * Math.pow(330000 / RED_AT, Math.min(1, (f - m) / (b - m)));
  }
  if (id === 12) return 610000;
  return 0;
};
/** red flash envelope: 0..1 while the counter just crossed 14,500 (blinks), then the steady warning */
const redAt = (id: number, f: number) => {
  const v = soldAt(id, f);
  if (v < RED_AT) return { on: 0, blink: 0 };
  const t0 = id === 1 ? BEAT.billion : id === 8 ? BEAT.cancelIt - 6 : -1e9, dt = f - t0;
  const blink = dt >= 0 && dt < 18 ? (Math.floor(dt / 3) % 2 === 0 ? 1 : 0.15) : 0;
  return { on: 1, blink };
};
type Flap = { top: THREE.Mesh; bot: THREE.Mesh; flap: THREE.Mesh };
const setHalf = (uv: THREE.BufferAttribute, d: number, top: boolean, flip = false) => {
  const u0 = d / 11 + 0.002, u1 = (d + 1) / 11 - 0.002, va = top ? 0.5 : 0, vb = top ? 1 : 0.5;
  const [lo, hi] = flip ? [vb, va] : [va, vb];
  uv.setXY(0, u0, hi); uv.setXY(1, u1, hi); uv.setXY(2, u0, lo); uv.setXY(3, u1, lo); uv.needsUpdate = true;
};
/** card index shown for value position c (digit k): blank (10) for leading zeros */
const card = (n: number, _k: number) => Math.floor(n) % 10;   // LEAD: a split-flap counter rests on 000,000 (blanks + a stray comma read as broken)

export class DeskSet implements SetModule {
  readonly sets = ["trading" as const];
  readonly group = new THREE.Group();
  private hand: HeroHand; private fountain: Fountain;
  private enter!: THREE.Mesh; private enterMat!: THREE.MeshBasicMaterial; private cancel!: THREE.Mesh; private glowPad!: THREE.Mesh;
  private scrMat!: THREE.MeshBasicMaterial; private pulse!: THREE.Mesh; private scan: THREE.MeshBasicMaterial[] = []; private sideMats: THREE.MeshBasicMaterial[] = [];
  private quotes!: THREE.Texture; private flaps: Flap[] = []; private flapsB: Flap[] = []; private flapMat!: THREE.MeshBasicMaterial; private halo!: THREE.Mesh; private faceMat!: THREE.MeshBasicMaterial; private redLamp!: { m: THREE.Mesh; s: THREE.Sprite };
  /** fix2: BACK-view-only things (the right side monitor, the lamp: they would stand between the front lens and him) and
   *  FRONT-view-only things (the lamp on the desk corner, the big hanging board + its clock, the hero certificates) */
  private backOnly = new THREE.Group(); private frontOnly = new THREE.Group(); private big = new THREE.Group();
  private clockS!: THREE.Mesh; private bigHalo!: THREE.Mesh; private heroA!: THREE.Mesh; private heroB!: THREE.Mesh; private heroG!: THREE.Mesh; private pages: THREE.Mesh[] = [];
  private frontLampHalo!: THREE.Sprite; private slip!: THREE.Mesh;
  private wisps: THREE.Mesh[] = []; private cup = new THREE.Group(); private enterHalo!: THREE.Sprite; private lampHalo!: THREE.Sprite; private chartDot!: THREE.Sprite;
  constructor(_kit: Kit) {
    const g = this.group, rb = new RB(TR.base), o = TR.base, d = TR.desk;
    const bk = new RB(TR.base), gB = this.backOnly, fb = new RB(TR.base), gF = this.frontOnly; g.add(gB, gF);
    // ---- the desk: laminate top with a dark edge band, a modesty panel, a drawer pedestal, a leg panel
    const dx0 = d.c[0] - d.w / 2, dx1 = d.c[0] + d.w / 2, dz0 = d.c[2] - d.d / 2, dz1 = d.c[2] + d.d / 2, T = d.top;
    rb.box(TM("dkLam", lamTex), dx0, T - 0.03, dz0, dx1, T, dz1);
    const edge = TM("dkEdgeM", edgeTex);
    rb.box(edge, dx0 - 0.004, T - 0.032, dz1 - 0.002, dx1 + 0.004, T + 0.001, dz1 + 0.006);
    rb.box(edge, dx0 - 0.006, T - 0.032, dz0, dx0, T + 0.001, dz1 + 0.006); rb.box(edge, dx1, T - 0.032, dz0, dx1 + 0.006, T + 0.001, dz1 + 0.006);
    const grey = C("#868a92"), greyD = C("#62666e");
    rb.box(grey, dx0 + 0.04, 0.08, dz0 + 0.01, dx1 - 0.04, T - 0.03, dz0 + 0.03);
    rb.box(grey, dx1 - 0.04, 0, dz0 + 0.02, dx1 - 0.015, T - 0.03, dz1 - 0.03);
    rb.box(grey, dx0 + 0.02, 0, dz0 + 0.03, dx0 + 0.44, T - 0.035, dz1 - 0.06);
    for (let k = 0; k < 3; k++) { const y0 = 0.04 + k * 0.215; rb.box(C("#9a9ea6"), dx0 + 0.03, y0, dz1 - 0.062, dx0 + 0.43, y0 + 0.2, dz1 - 0.055); rb.box(greyD, dx0 + 0.17, y0 + 0.16, dz1 - 0.055, dx0 + 0.29, y0 + 0.175, dz1 - 0.04); }
    // ---- the keyboard: case (planar-mapped, so its rim + deck read from the texture), caps, ENTER, CANCEL, cable
    const kbM = TM("dkKb", kbTex), U = { x0: KB.x0, x1: KB.x1, z0: KB.z0, z1: KB.z1 };
    rb.geo(capGeo(KB.x0, KB.x1, KB.z0, KB.z1, T, KB.deck, 0.004, U), kbM, 0, 0, 0);
    rb.box(C("#a69c88"), KB.x0 + 0.01, T, KB.z0 - 0.004, KB.x1 - 0.01, KB.deck + 0.004, KB.z0 + 0.012);
    for (const k of keyLayout()) {
      const j = (hash(k.x0 * 913 + k.z0 * 37) - 0.5) * 0.0011;
      rb.geo(capGeo(k.x0, k.x1, k.z0, k.z1, KB.deck, KB.capTop + j + (k.z0 < 1.25 ? -0.0012 : 0), KB.ins, U), kbM, 0, 0, 0);
    }
    this.enterMat = new THREE.MeshBasicMaterial({ map: enterTex(), color: new THREE.Color(1.8, 1.8, 1.8) });
    const E = ENTER_K, Cn = CANCEL_K;
    this.enter = new THREE.Mesh(capGeo(E.x0, E.x1, E.z0, E.z1, KB.deck - 0.004, E.top, 0.0028, E), this.enterMat); this.enter.userData.ink = 0.6; g.add(this.enter);
    this.cancel = new THREE.Mesh(capGeo(Cn.x0, Cn.x1, Cn.z0, Cn.z1, KB.deck - 0.004, Cn.top, 0.0026, Cn), TM("dkCancelM", cancelTex)); g.add(this.cancel);
    this.cancel.castShadow = true; this.cancel.receiveShadow = true;
    this.glowPad = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.17).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.25, 0.65, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowPad.position.set(o[0] + TR.enter[0] - 0.01, o[1] + KB.capTop + 0.0012, o[2] + TR.enter[2]); this.glowPad.layers.set(NOINK); this.glowPad.renderOrder = 3; g.add(this.glowPad);
    this.enterHalo = glowSprite(g, [o[0] + TR.enter[0], o[1] + TR.enter[1] + 0.012, o[2] + TR.enter[2]], 0.2, new THREE.Color(0.35, 0.75, 1.0));
    contact(g, [o[0] + TR.kb.c[0], o[1] + T + 0.001, o[2] + TR.kb.c[2] + 0.004], 0.56, 0.24, 0.45);
    const cableM = C("#2a2c30");
    rb.geo(tube([[0.04, 0.752, KB.z0 + 0.002], [0.06, 0.744, 1.18], [0.02, 0.743, 1.06], [0.09, 0.743, 0.95], [0.16, 0.743, 0.82], [0.2, 0.74, 0.74], [0.21, 0.6, 0.73]], 0.0032, 64), cableM, 0, 0, 0);
    // ---- the mouse on its pad
    rb.box(C("#2c3e72"), 0.235, T, 1.23, 0.385, T + 0.003, 1.37);
    rb.geo(new THREE.SphereGeometry(1, 18, 12), C("#ddd5c3"), 0.31, T + 0.003, 1.31, 0.12, 0, 0, [0.028, 0.017, 0.045]);
    rb.geo(tube([[0.305, 0.752, 1.27], [0.3, 0.748, 1.2], [0.24, 0.745, 1.1], [0.18, 0.743, 0.96], [0.2, 0.742, 0.8], [0.22, 0.74, 0.74]], 0.0025), cableM, 0, 0, 0);
    contact(g, [o[0] + 0.31, o[1] + T + 0.004, o[2] + 1.31], 0.09, 0.11, 0.4);
    // ---- monitors: the ORDER SCREEN + two side panels (2005 flat panels: black bezel, silver chin + stand)
    const bez = C("#2b2d33"), silver = C("#a9adb5"), rb0 = rb, g0 = g;
    const monitor = (c: V3, ry: number, w: number, h: number, rb: RB = rb0, g: THREE.Object3D = g0) => {
      rb.rbox(bez, w + 0.044, h + 0.046, 0.034, ...rot(c, ry, [0, 0.0, -0.0172]), ry);
      rb.rbox(silver, w + 0.046, 0.024, 0.036, ...rot(c, ry, [0, -h / 2 - 0.03, -0.017]), ry);
      rb.rbox(bez, w * 0.72, h * 0.66, 0.045, ...rot(c, ry, [0, 0, -0.056]), ry);
      const nb = c[1] - h / 2 - 0.04, ny = (nb + T) / 2;
      rb.rbox(silver, 0.064, nb - T, 0.026, ...rot([c[0], ny, c[2]], ry, [0, 0, -0.06]), ry);
      rb.rbox(silver, 0.24, 0.012, 0.17, ...rot([c[0], T + 0.006, c[2]], ry, [0, 0, -0.05]), ry);
      contact(g, rot([c[0], T + 0.001, c[2]], ry, [0, 0, -0.05]) as V3, 0.42, 0.3, 0.4, ry);
      // a tiny green power LED on the chin
      const led = rot(c, ry, [w / 2 - 0.01, -h / 2 - 0.03, 0.0015]); glowSprite(g, led, 0.012, new THREE.Color(0.4, 1.6, 0.6));
    };
    const S = TR.screen; monitor(S.c, 0, S.w, S.h);
    this.scrMat = new THREE.MeshBasicMaterial({ map: orderTex({ mode: "typo", qty: "610000", price: "1", strip: 0, cur: "", dots: 0, flash: 0 }) });
    plane(g, this.scrMat, S.w, S.h, [o[0] + S.c[0], o[1] + S.c[1], o[2] + S.c[2] + 0.0012]);
    const scanT = scanTex(); scanT.repeat.set(1, 70);
    const overlays = (c: V3, ry: number, w: number, h: number, g: THREE.Object3D = g0) => {
      const sm = new THREE.MeshBasicMaterial({ map: scanT, transparent: true, opacity: 0.16, depthWrite: false }); this.scan.push(sm);
      plane(g, sm, w, h, rot(c, ry, [0, 0, 0.0018]), ry, 0, 0, true).renderOrder = 3;
      plane(g, new THREE.MeshBasicMaterial({ map: glareTex(), transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }), w, h, rot(c, ry, [0, 0, 0.0024]), ry, 0, 0, true).renderOrder = 4;
    };
    overlays(S.c, 0, S.w, S.h);
    // the PRESS ENTER pulse (additive glow over the button)
    const px = S.w / SCR_W, F = SCR.btn;
    this.pulse = plane(g, new THREE.MeshBasicMaterial({ map: glowRectTex(), color: new THREE.Color(0.3, 0.75, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      (F.w + 50) * px, (F.h + 40) * px, [o[0] + S.c[0] + (F.x + F.w / 2 - SCR_W / 2) * px, o[1] + S.c[1] + (SCR_H / 2 - (F.y + F.h / 2)) * px, o[2] + S.c[2] + 0.003], 0, 0, 0, true);
    this.pulse.renderOrder = 5;
    const sideRy = [0.46, -0.46], sideW = 0.4, sideH = 0.3;
    TR.sideScreens.forEach((c, k) => {
      const G = k === 1 ? gB : g;
      monitor(c, sideRy[k], sideW, sideH, k === 1 ? bk : rb, G);
      const t = k === 0 ? quotesTex() : chartTex();
      if (k === 0) { t.repeat.set(1, 0.42); this.quotes = t; }
      const m = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.95, 0.95, 0.95) }); this.sideMats.push(m);
      plane(G, m, sideW, sideH, rot(c, sideRy[k], [0, 0, 0.0012]), sideRy[k]);
      overlays(c, sideRy[k], sideW, sideH, G);
    });
    // fix2 (audit 9): the boss's ORDER SLIP stands clipped on top of the counter, over the order screen, from shot 6 on, so
    // the two boxes can be checked against it: SELL 1 @ ¥610,000 next to QTY 610000 / PRICE 1
    { const cc = TR.counter.c, pp: V3 = [o[0] + cc[0] - 0.15, o[1] + cc[1] + CNT.h / 2 + 0.03 + 0.068, o[2] + cc[2] - 0.01];
      this.slip = plane(g, new THREE.MeshBasicMaterial({ map: slipTex(), color: new THREE.Color(0.97, 0.97, 0.97) }), 0.2, 0.125, pp, 0, -0.1, 0.035, true); this.slip.renderOrder = 6; }
    this.chartDot = glowSprite(gB, rot(TR.sideScreens[1], sideRy[1], [0.155, 0.02, 0.003]), 0.03, new THREE.Color(0.5, 2.0, 0.9));
    // sticky notes on the bezels
    const notes: [V3, number, number, number][] = [[rot(S.c, 0, [-S.w / 2 - 0.012, S.h / 2 - 0.02, 0.003]), 0, 0.18, 0], [rot(S.c, 0, [S.w / 2 + 0.014, -S.h / 2 + 0.05, 0.003]), 0, -0.12, 1],
      [rot(TR.sideScreens[0], sideRy[0], [-sideW / 2 + 0.01, sideH / 2 + 0.004, 0.003]), sideRy[0], 0.1, 2], [rot(TR.sideScreens[1], sideRy[1], [sideW / 2 - 0.02, -sideH / 2 - 0.0, 0.003]), sideRy[1], -0.2, 3]];
    for (const [p, ry, rz, k] of notes) (k === 3 ? bk : rb).panel(TM("dkNoteM" + k, () => noteTex(k)), 0.055, 0.055, p[0], p[1], p[2], ry, 0, rz);
    // ---- the SHARES SOLD counter on top of the order-screen monitor
    {
      const cc = TR.counter.c, cg = new THREE.Group(); cg.position.set(o[0] + cc[0], o[1] + cc[1], o[2] + cc[2]); g.add(cg);
      this.faceMat = new THREE.MeshBasicMaterial({ map: counterFaceTex() });
      this.flapMat = new THREE.MeshBasicMaterial({ map: flapAtlas(), side: THREE.DoubleSide });
      this.halo = this.mkCounter(cg, this.flaps);
      this.redLamp = bulb(g, [o[0] + cc[0] + CNT.w / 2 - 0.03, o[1] + cc[1] + CNT.h / 2 + 0.045, o[2] + cc[2] - 0.02], 0.016, "#ff3020", 0.4, 0.12, 0.0);
      rb.box(C("#2a2c32"), cc[0] + CNT.w / 2 - 0.045, cc[1] + CNT.h / 2 + 0.029, cc[2] - 0.035, cc[0] + CNT.w / 2 - 0.015, cc[1] + CNT.h / 2 + 0.034, cc[2] - 0.005);
    }
    // ---- his tea (a yunomi on a cork coaster) + steam
    {
      // the cup itself is its own group: hidden while he holds it (cast.ts SIP_WINDOW); the coaster stays
      const [x, , z] = TR.tea, cb = new RB(TR.base);
      rb.geo(cylY(0.046, 0.005, 24), C("#b88a58"), x, T, z);
      cb.geo(new THREE.CylinderGeometry(0.037, 0.031, 0.084, 26, 1, true).translate(0, 0.042, 0), TM("dkYunomi", () => yunomiTex()), x, T + 0.005, z);
      cb.geo(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 26).translate(0, 0.002, 0), C("#e8e2d2"), x, T + 0.005, z);
      cb.geo(new THREE.CircleGeometry(0.035, 26).rotateX(-Math.PI / 2), C("#a4a24a"), x, T + 0.077, z);
      cb.geo(new THREE.TorusGeometry(0.0365, 0.0022, 6, 30).rotateX(Math.PI / 2), C("#efe9dc"), x, T + 0.089, z);
      cb.done(this.cup); g.add(this.cup);
      contact(g, [o[0] + x, o[1] + T + 0.001, o[2] + z], 0.13, 0.13, 0.4);
      for (let k = 0; k < 3; k++) {
        const w = plane(g, new THREE.MeshBasicMaterial({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(1.05, 1.05, 1.08) }), 0.06, 0.2, [o[0] + x, o[1] + T + 0.18, o[2] + z], 0, 0, 0, true);
        w.renderOrder = 6; this.wisps.push(w);
      }
    }
    // ---- the curly-cord phone
    {
      const [x, , z] = TR.phone, ry = 0.55, body = C("#454952");
      rb.rbox(body, 0.19, 0.04, 0.2, ...rot([x, T + 0.02, z], ry, [0, 0, 0]), ry);
      rb.rbox(body, 0.19, 0.03, 0.11, ...rot([x, T + 0.048, z], ry, [0, 0, -0.045]), ry, 0);
      const kp = rot([x, T + 0.0505, z], ry, [0, 0, 0.045]);
      rb.panel(TM("dkPhoneM", phoneTex), 0.16, 0.1, kp[0], kp[1], kp[2], ry, -Math.PI / 2 + 0.12);
      const hs = rot([x, T + 0.08, z], ry, [0, 0, -0.045]), hm = C("#3a3e46");
      rb.rbox(hm, 0.2, 0.032, 0.045, hs[0], hs[1], hs[2], ry);
      for (const s of [-1, 1]) { const e = rot([x, T + 0.073, z], ry, [s * 0.09, 0, -0.045]); rb.rbox(hm, 0.05, 0.03, 0.06, e[0], e[1], e[2], ry); }
      const a = rot([x, T + 0.07, z], ry, [-0.1, 0, -0.045]), b2 = rot([x, T + 0.02, z], ry, [-0.096, 0, 0.0]);
      const base = new THREE.CatmullRomCurve3([new THREE.Vector3(...a), new THREE.Vector3(a[0] - 0.05, T + 0.03, a[2] + 0.03), new THREE.Vector3(a[0] - 0.07, T + 0.008, a[2] + 0.1), new THREE.Vector3(b2[0] - 0.02, T + 0.006, b2[2] + 0.1), new THREE.Vector3(...b2)]);
      rb.geo(new THREE.TubeGeometry(new Helix(base, 0.0055, 34), 420, 0.0018, 5, false), C("#30333a"), 0, 0, 0);
      rb.geo(tube([rot([x, T + 0.02, z], ry, [0, 0, -0.1]), [x + 0.02, T + 0.004, 0.85], [x + 0.05, T + 0.002, 0.74], [x + 0.06, 0.6, 0.73]], 0.0025), cableM, 0, 0, 0);
      contact(g, [o[0] + x, o[1] + T + 0.001, o[2] + z], 0.28, 0.28, 0.42, ry);
    }
    // ---- the warm desk lamp (black arm, a cone shade aimed at the keyboard's right half) + a soft warm decal
    {
      const [x, , z] = TR.lamp, lm = C("#2c3330");
      bk.geo(cylY(0.075, 0.022, 24), lm, x, T, z);
      const j1: V3 = [x - 0.02, T + 0.36, z + 0.02], hd: V3 = [x - 0.16, T + 0.42, z + 0.16];
      bk.seg(lm, [x, T + 0.02, z], j1, 0.009); bk.seg(lm, j1, hd, 0.008);
      bk.geo(new THREE.SphereGeometry(0.016, 12, 8), lm, ...j1);
      const dir = new THREE.Vector3(-0.35, -1, 0.35).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.11, 24, 1, true).translate(0, -0.055, 0), C("#2f4a3e"));
      sh.position.set(o[0] + hd[0], o[1] + hd[1], o[2] + hd[2]); sh.quaternion.copy(q); (sh.material as THREE.Material).side = THREE.DoubleSide; sh.castShadow = true; gB.add(sh);
      const bp = new THREE.Vector3(...hd).addScaledVector(dir, 0.07);
      const bl = bulb(gB, [o[0] + bp.x, o[1] + bp.y, o[2] + bp.z], 0.026, "#ffe2b0", 2.2, 0.28, 0.35); this.lampHalo = bl.s;
      const warm = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.22, 0.15, 0.06), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      warm.position.set(o[0] + x - 0.3, o[1] + T + 0.0015, o[2] + z + 0.33); warm.layers.set(NOINK); warm.renderOrder = 2; gB.add(warm);
      contact(gB, [o[0] + x, o[1] + T + 0.001, o[2] + z], 0.2, 0.2, 0.45);
      bk.geo(tube([[x + 0.06, T + 0.005, z - 0.02], [x + 0.1, T + 0.003, 0.8], [x + 0.12, T, 0.74], [x + 0.12, 0.5, 0.73]], 0.0025), cableM, 0, 0, 0);
    }
    // ---- fix2: the FRONT-view lamp on the desk's right-front corner (screen left of the front-right lens), aimed at the keys
    {
      const x = 0.85, z = 1.4, lm = C("#2c3330");
      fb.geo(cylY(0.075, 0.022, 24), lm, x, T, z);
      const j1: V3 = [x + 0.02, T + 0.36, z + 0.03], hd: V3 = [x - 0.12, T + 0.43, z - 0.05];
      fb.seg(lm, [x, T + 0.02, z], j1, 0.009); fb.seg(lm, j1, hd, 0.008);
      fb.geo(new THREE.SphereGeometry(0.016, 12, 8), lm, ...j1);
      const dir = new THREE.Vector3(-0.5, -1, -0.12).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.11, 24, 1, true).translate(0, -0.055, 0), C("#c8442c"));
      sh.position.set(o[0] + hd[0], o[1] + hd[1], o[2] + hd[2]); sh.quaternion.copy(q); (sh.material as THREE.Material).side = THREE.DoubleSide; sh.castShadow = true; gF.add(sh);
      const bp = new THREE.Vector3(...hd).addScaledVector(dir, 0.08);
      const bl = bulb(gF, [o[0] + bp.x, o[1] + bp.y, o[2] + bp.z], 0.03, "#ffe2b0", 2.4, 0.42, 0.5); this.frontLampHalo = bl.s;
      const warm = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softDot(), color: new THREE.Color(0.34, 0.22, 0.08), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      warm.position.set(o[0] + x - 0.36, o[1] + T + 0.0016, o[2] + z - 0.06); warm.layers.set(NOINK); warm.renderOrder = 2; gF.add(warm);
      contact(gF, [o[0] + x, o[1] + T + 0.001, o[2] + z], 0.2, 0.2, 0.45);
    }
    // ---- paper: a report stack front-left, folders under the lamp, loose sheets
    const stack = (x: number, z: number, w: number, dd: number, n: number, ry: number, k0: number) => {
      rb.rbox(C("#f0ede4"), w, n * 0.0016, dd, x, T + (n * 0.0016) / 2, z, ry);
      for (let k = 0; k < 3; k++) rb.panel(TM("dkSheetM" + ((k0 + k) % 3), () => sheetTex((k0 + k) % 3)), w, dd, x + (hash(k + k0) - 0.5) * 0.02, T + n * 0.0016 + 0.0004 + k * 0.0004, z + (hash(k * 3 + k0) - 0.5) * 0.02, ry + (hash(k * 7 + k0) - 0.5) * 0.15, -Math.PI / 2, 0, true);
      contact(g, [o[0] + x, o[1] + T + 0.001, o[2] + z], w + 0.08, dd + 0.08, 0.35, ry);
    };
    stack(-0.38, 1.14, 0.21, 0.28, 14, 0.12, 0); stack(0.62, 1.34, 0.22, 0.3, 6, -0.25, 1); stack(-0.74, 0.96, 0.21, 0.28, 22, -0.3, 2);
    rb.rbox(C("#d8b56c"), 0.24, 0.006, 0.31, 0.64, T + 0.013, 1.33, -0.18); rb.rbox(C("#4d6aa6"), 0.235, 0.006, 0.305, 0.63, T + 0.019, 1.335, -0.32);
    for (let k = 0; k < 4; k++) rb.panel(TM("dkSheetM" + (k % 3), () => sheetTex(k % 3)), 0.21, 0.28, 0.44 + k * 0.05, T + 0.0006 + k * 0.0004, 0.84 + k * 0.03, 0.6 + k * 0.3, -Math.PI / 2, 0, true);
    // ---- pen cup, ID tray with a lanyard card, a hanko + its red ink pad
    {
      const [x, z] = [-0.27, 0.98];
      rb.geo(new THREE.CylinderGeometry(0.035, 0.032, 0.1, 20, 1, true).translate(0, 0.05, 0), C("#3a3d48"), x, T, z); rb.geo(cylY(0.032, 0.004, 20), C("#3a3d48"), x, T, z);
      const pens = [["#1e3a8a", 0.25, 0.3], ["#c4231a", -0.2, 1.2], ["#202020", 0.1, 2.6], ["#e8c020", -0.3, 4.0], ["#f0f0f0", 0.18, 5.0]] as [string, number, number][];
      for (const [c, tilt, a] of pens) { const tx2 = x + Math.cos(a) * 0.012, tz = z + Math.sin(a) * 0.012; rb.seg(C(c), [tx2, T + 0.01, tz], [tx2 + Math.sin(tilt) * Math.cos(a) * 0.1, T + 0.16, tz + Math.sin(tilt) * Math.sin(a) * 0.1], 0.0045); }
      contact(g, [o[0] + x, o[1] + T + 0.001, o[2] + z], 0.11, 0.11, 0.45);
      const tx3 = -0.72, tz3 = 1.48, trm = C("#59606a");
      rb.box(trm, tx3 - 0.08, T, tz3 - 0.06, tx3 + 0.08, T + 0.004, tz3 + 0.06);
      for (const [a0, b0, a1, b1] of [[-0.08, -0.06, 0.08, -0.054], [-0.08, 0.054, 0.08, 0.06], [-0.08, -0.06, -0.074, 0.06], [0.074, -0.06, 0.08, 0.06]]) rb.box(trm, tx3 + a0, T, tz3 + b0, tx3 + a1, T + 0.016, tz3 + b1);
      rb.panel(TM("dkIdM", idTex), 0.054, 0.085, tx3 - 0.02, T + 0.0055, tz3, 0.25, -Math.PI / 2, 0, true);
      rb.geo(tube([[tx3 - 0.03, T + 0.006, tz3 - 0.045], [tx3 + 0.02, T + 0.007, tz3 - 0.03], [tx3 + 0.05, T + 0.006, tz3 + 0.02], [tx3 + 0.0, T + 0.006, tz3 + 0.04], [tx3 - 0.05, T + 0.006, tz3 + 0.03]], 0.003, 40), C("#2a4a9a"), 0, 0, 0);
      rb.geo(cylY(0.009, 0.06, 14), C("#3a2418"), tx3 + 0.045, T + 0.004, tz3 - 0.025); rb.geo(cylY(0.0095, 0.004, 14), C("#c01818"), tx3 + 0.045, T + 0.004, tz3 - 0.025);
      rb.box(C("#2a2a2e"), -0.6, T, 1.5, -0.52, T + 0.012, 1.56); rb.box(C("#b0141a"), -0.595, T + 0.012, 1.505, -0.525, T + 0.0135, 1.555);
      contact(g, [o[0] + tx3, o[1] + T + 0.001, o[2] + tz3], 0.2, 0.16, 0.4);
    }
    // ---- cables behind the desk (monitors, counter) dropping to the floor
    for (const xx of [-0.5, -0.1, 0.06, 0.5]) rb.geo(tube([[xx, T + 0.01, 0.84], [xx + 0.02, T + 0.002, 0.76], [xx + 0.03, T - 0.01, 0.728], [xx + 0.05, 0.3, 0.722], [xx + 0.1, 0.02, 0.75]], 0.004, 32), cableM, 0, 0, 0);
    rb.done(g); bk.done(gB); fb.done(gF);
    this.buildBig();
    this.hand = new HeroHand(g);
    this.fountain = new Fountain(g);
  }

  /** a split-flap SHARES SOLD counter (housing, face, 6 flap cells, a red halo) in the group cg (its face on local +z) */
  private mkCounter(cg: THREE.Group, flaps: Flap[]) {
    const mk = (mat: THREE.Material, w: number, h: number, dd: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; cg.add(m); return m; };
    mk(C("#3a3e46"), CNT.w + 0.03, CNT.h + 0.02, 0.07, 0, 0, -0.036);
    mk(C("#4c515a"), CNT.w + 0.05, 0.014, 0.09, 0, CNT.h / 2 + 0.017, -0.03);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CNT.w, CNT.h), this.faceMat); face.position.z = 0.0005; face.layers.set(NOINK); cg.add(face);
    for (const c of CNT.cells) {
      const mkF = (y: number, zz: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(CNT.cw, CNT.ch / 2).translate(0, y, 0), this.flapMat); m.position.set(c.x, c.y, zz); m.layers.set(NOINK); cg.add(m); return m; };
      flaps.push({ top: mkF(CNT.ch / 4, 0.002), bot: mkF(-CNT.ch / 4, 0.002), flap: mkF(CNT.ch / 4, 0.005) });
    }
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(CNT.w + 0.3, CNT.h + 0.24), new THREE.MeshBasicMaterial({ map: glowRectTex(), color: new THREE.Color(1.0, 0.18, 0.1), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.z = -0.075; halo.layers.set(NOINK); cg.add(halo);
    return halo;
  }
  /** fix2 (Design A): the BIG hanging SHARES SOLD board over the aisle behind him (the front-right lens of shots 1 / 14
   *  sees it over his head): the same split-flap counter at BIG.s in a dark housing on two ceiling rods, a brass plate
   *  under it ("J-COM: ONLY 14,500 EXIST": the stakes, in words), a round station clock over it (shot 14's "one
   *  second"), the two hero certificates and the loop's eight calendar pages */
  private buildBig() {
    const o = TR.base, B = this.big, S = BIG.s, W = CNT.w * S, Hh = CNT.h * S;
    B.position.set(o[0] + BIG.c[0], o[1] + BIG.c[1], o[2] + BIG.c[2]); B.rotation.y = Math.PI - BIG.yaw; this.group.add(B);
    const cg = new THREE.Group(); cg.scale.setScalar(S); B.add(cg);
    this.bigHalo = this.mkCounter(cg, this.flapsB);
    const dark = C("#2c3038"), steel = C("#8a8f99");
    const box = (mat: THREE.Material, w: number, h: number, dd: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; B.add(m); return m; };
    // the brass plate (engraved) on a dark backer
    const ph = 0.19, py = -Hh / 2 - 0.035 - ph / 2;
    box(dark, W + 0.04, ph + 0.03, 0.05, 0, py, -0.03);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(W, ph), new THREE.MeshBasicMaterial({ map: plateTex() })); plate.position.set(0, py, 0.0); plate.layers.set(NOINK); B.add(plate);
    // rods to the ceiling, a top rail
    const top = TR.room.h - BIG.c[1];
    for (const sx of [-1, 1]) box(steel, 0.03, top - Hh / 2, 0.03, sx * (W / 2 - 0.12), (top + Hh / 2) / 2, -0.06);
    box(dark, W + 0.1, 0.05, 0.14, 0, Hh / 2 + 0.03, -0.05);
    // the round clock over the board (on a short drop rod from the ceiling)
    const cy = BIG.clockY - BIG.c[1], ck = new THREE.Group(); ck.position.set(0, cy, 0.0); B.add(ck);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(BIG.clockR + 0.03, BIG.clockR + 0.03, 0.08, 40).rotateX(Math.PI / 2), dark); rim.position.z = -0.045; rim.castShadow = true; ck.add(rim);
    const cf = new THREE.Mesh(new THREE.CircleGeometry(BIG.clockR, 48), new THREE.MeshBasicMaterial({ map: bigClockTex() })); cf.position.z = 0.0; cf.layers.set(NOINK); ck.add(cf);
    this.clockS = new THREE.Mesh(new THREE.PlaneGeometry(0.014, BIG.clockR * 1.02).translate(0, BIG.clockR * 0.33, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8261c") }));
    this.clockS.position.z = 0.004; this.clockS.layers.set(NOINK); ck.add(this.clockS);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8261c") })); hub.position.z = 0.006; hub.layers.set(NOINK); ck.add(hub);
    box(steel, 0.03, Math.max(0.02, top - cy - BIG.clockR), 0.03, 0, (top + cy + BIG.clockR) / 2, -0.06);
    // ---- the hero certificates (hook.ts poses them) and the calendar pages (set-root children: posed in world space)
    const g = this.group, cgeo = () => new THREE.PlaneGeometry(1, 1);
    const cmat = lamM("si:dkCertHero", () => ({ map: certTex(), side: THREE.DoubleSide }));
    this.heroA = new THREE.Mesh(cgeo(), cmat); this.heroB = new THREE.Mesh(cgeo(), cmat);
    this.heroG = new THREE.Mesh(cgeo(), new THREE.MeshBasicMaterial({ map: ghostTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: new THREE.Color(1.2, 1.32, 1.45) }));
    this.heroG.layers.set(NOINK); this.heroG.renderOrder = 7;
    for (const m of [this.heroA, this.heroB]) { m.castShadow = true; m.receiveShadow = true; }
    for (const m of [this.heroA, this.heroB, this.heroG]) { m.visible = false; m.frustumCulled = false; g.add(m); }
    for (let k = 0; k < PAGES; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), new THREE.MeshBasicMaterial({ map: pageTex(2006 + k), side: THREE.DoubleSide }));
      m.visible = false; m.frustumCulled = false; g.add(m); this.pages.push(m);
    }
  }

  pose(ctx: SetCtx, L: Lighting) {
    const { id, f, vf } = ctx, o = TR.base;
    const tau = id === 14 ? vf - LOOPN : vf;                 // the loop clock: 0 at frame 0 and at the last frame
    const breath = 1 + 0.1 * lsin(28, tau);
    // ---- the hand + the two moving keys
    const front = faceOnAt(id, f), showHand = deskHand(id, f);
    this.hand.root.visible = showHand;
    this.backOnly.visible = !front; this.frontOnly.visible = front; this.big.visible = front;
    this.slip.visible = id >= 6 && !front;
    let enterDY = 0, cancelDY = 0, flare = 0;
    const E = TR.enter, Ck = TR.cancelKey;
    if (showHand) {
      const idle: V3 = [0.0015 * lsin(9, tau, 1.3), 0.0024 * lsin(14, tau), 0.0012 * lsin(11, tau, 0.4)];
      if (front) {
        // fix2: the FRONT view: his LEFT hand (screen right) over ENTER; it lands on "typo", stays resting on the key, and
        // jerks up off it when he sees the board (the "O")
        const hover = 0.045, base: V3 = [E[0] - 0.012, E[1] + hover, E[2] + 0.004];
        const rec = id === 1 ? smooth((f - HK.oh) / 7) : 0;
        const dy = id === 1 ? pressDY(f, PRESS1, hover, 0.02, 0.005, 0.01) + (0.045 + 0.005 * Math.sin(f * 0.9) * (1 - smooth((f - HK.oh - 8) / 30))) * rec : 0;
        const tip: V3 = [base[0] + idle[0] - 0.02 * rec, base[1] + dy + idle[1], base[2] + idle[2] + 0.03 * rec];
        enterDY = Math.max(-0.005, Math.min(0, tip[1] - ENTER_K.top));
        if (id === 1 && f >= PRESS1.contact - 1) flare = Math.exp(-(f - PRESS1.contact + 1) / 9);
        this.hand.pose([o[0] + tip[0], o[1] + tip[1], o[2] + tip[2]], -0.62, -0.16 - 0.1 * clamp01(-dy / 0.04) - 0.06 * rec, 0.1, SH_FRONT.map((v, i) => v + o[i]) as V3, 0.2, 0.05, true);
      } else if (id === 8) {
        const hover = 0.03, base: V3 = [Ck[0] - 0.004, Ck[1] + hover, Ck[2] + 0.006];
        const dy = f < PRESS8B.lift0 ? pressDY(f, PRESS8A, hover, 0.03, 0.005, 0.004) : pressDY(f, PRESS8B, hover + 0.004, 0.055, 0.0075, 0.006) + 0.004;
        const tip: V3 = [base[0] + idle[0], base[1] + dy + idle[1] * 0.6, base[2] + idle[2]];
        cancelDY = Math.max(-(f >= PRESS8B.lift0 ? 0.0075 : 0.005), Math.min(0, tip[1] - CANCEL_K.top));
        this.hand.pose([o[0] + tip[0], o[1] + tip[1], o[2] + tip[2]], 0.62, -0.06 - 0.12 * clamp01(-dy / 0.03), -0.12, SHOULDER.map((v, i) => v + o[i]) as V3, 0.25, 0.08);
      } else if (id === 6) {
        const [kx, kz, dip] = type6At(f), y = KB.capTop + 0.034 * (1 - dip) - 0.002 * dip;
        const tip: V3 = [kx + idle[0], y + idle[1] * (1 - dip), kz + 0.004 + idle[2]];
        this.hand.pose([o[0] + tip[0], o[1] + tip[1], o[2] + tip[2]], 0.3 - 1.6 * (kx - 0.08), -0.14 - 0.12 * dip, -0.08, SHOULDER.map((v, i) => v + o[i]) as V3, 0.25, 0.07);
      } else {
        const hover = 0.04, base: V3 = [E[0] + 0.016, E[1] + hover, E[2] + 0.004];
        const dy = id === 1 ? pressDY(f, PRESS1, hover, 0.018, 0.005, 0.012) : 0;
        const tip: V3 = [base[0] + idle[0], base[1] + dy + idle[1], base[2] + idle[2]];
        enterDY = Math.max(-0.005, Math.min(0, tip[1] - ENTER_K.top));
        if (id === 1 && f >= PRESS1.contact - 1) flare = Math.exp(-(f - PRESS1.contact + 1) / 9);
        this.hand.pose([o[0] + tip[0], o[1] + tip[1], o[2] + tip[2]], 0.22, -0.16 - 0.1 * clamp01(-dy / 0.04), -0.1, SHOULDER.map((v, i) => v + o[i]) as V3);
      }
    }
    this.enter.position.y = enterDY; this.cancel.position.y = cancelDY;
    // ENTER glow: breathes on the loop clock (shots 1 / 14), flares on the press; dims in the other shots
    const pre = id === 14 || (id === 1 && f < PRESS1.contact);
    const gk = (pre ? 2.15 * breath : id === 1 ? 1.6 : 1.3) + 1.6 * flare;
    this.enterMat.color.setScalar(gk);
    (this.glowPad.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (pre ? 0.65 * breath : 0.3) + 0.9 * flare);
    this.enterHalo.material.opacity = Math.min(1, (pre ? 0.5 * breath : 0.22) + 0.8 * flare); this.enterHalo.scale.setScalar(0.2 + 0.08 * flare);
    // ---- the order screen
    const st = this.screenState(id, f, vf);
    const tex = orderTex(st);
    if (this.scrMat.map !== tex) this.scrMat.map = tex;
    const flick = 1 + 0.012 * lsin(173, tau) + 0.008 * lsin(311, tau, 1.1);
    const sk = (id === 8 ? 1.06 : id === 12 ? 0.9 : 1.0) * flick;
    this.scrMat.color.setScalar(sk); for (const m of this.sideMats) m.color.setScalar(0.92 * flick);
    (this.pulse.material as THREE.MeshBasicMaterial).opacity = st.mode === "typo" ? 0.35 + 0.35 * (0.5 + 0.5 * lsin(42, tau)) : 0;
    for (const m of this.scan) { m.map!.offset.y = lfr(30, tau); m.opacity = 0.14 + 0.02 * lsin(97, tau); }
    this.quotes.offset.y = lfr(8, tau);
    this.chartDot.material.opacity = 0.5 + 0.5 * lsin(84, tau);
    // ---- the counter
    const v = soldAt(id, f), v3 = soldAt(id, f + 3);
    [...this.flaps, ...this.flapsB].forEach((Fp, i6) => {
      const i = i6 % 6;
      // a cell flips only over the ~3 f before its value actually changes (slow high digits never hang mid-flip)
      const k = 5 - i, c = v / Math.pow(10, k), n0 = Math.floor(c), c3 = v3 / Math.pow(10, k), p = v >= 1 && Math.floor(c3) > n0 ? clamp01(1 - (n0 + 1 - c) / Math.max(1e-6, c3 - c)) : 0;
      const from = card(n0, k), to = card(n0 + 1, k);
      if (p <= 0 || from === to || v === 0) {
        setHalf(Fp.top.geometry.attributes.uv as THREE.BufferAttribute, from, true); setHalf(Fp.bot.geometry.attributes.uv as THREE.BufferAttribute, from, false); Fp.flap.visible = false;
      } else {
        setHalf(Fp.top.geometry.attributes.uv as THREE.BufferAttribute, to, true); setHalf(Fp.bot.geometry.attributes.uv as THREE.BufferAttribute, from, false); Fp.flap.visible = true;
        const th = p * Math.PI; Fp.flap.rotation.x = th;
        setHalf(Fp.flap.geometry.attributes.uv as THREE.BufferAttribute, th < Math.PI / 2 ? from : to, th < Math.PI / 2, th >= Math.PI / 2);
      }
    });
    const red = redAt(id, f);
    const rk = red.blink ? 1 + 0.9 * red.blink : 1;
    this.faceMat.color.setRGB(red.on ? 1.0 * rk : 1, red.on ? 0.55 + 0.1 * (1 - red.blink) : 1, red.on ? 0.5 : 1);
    // the digits go warning-red past 14,500 (a bright blink as it crosses, then a steady red-orange), with a red halo
    if (!red.on) this.flapMat.color.setRGB(1, 1, 1);
    else if (red.blink) this.flapMat.color.setRGB(0.9 + 1.0 * red.blink, 0.3 + 0.2 * (1 - red.blink), 0.26 + 0.2 * (1 - red.blink));
    else this.flapMat.color.setRGB(1.25, 0.46, 0.36);
    (this.halo.material as THREE.MeshBasicMaterial).opacity = red.on ? 0.3 + 0.5 * red.blink : 0;
    (this.bigHalo.material as THREE.MeshBasicMaterial).opacity = red.on ? 0.34 + 0.5 * red.blink : 0;
    (this.redLamp.m.material as THREE.MeshBasicMaterial).color.setRGB(red.on ? 3.2 * (red.blink ? 0.5 + red.blink : 1) : 0.35, red.on ? 0.35 : 0.06, red.on ? 0.2 : 0.05);
    this.redLamp.s.material.color.setRGB(red.on ? 0.6 : 0, red.on ? 0.06 : 0, red.on ? 0.04 : 0);
    // ---- certificates (shot 1 only)
    this.fountain.pose(f, id === 1 && f >= BEAT.typo);
    // ---- fix2: the hero certificates (hook.ts), the clock's second hand, the calendar pages
    {
      const cq = ctx.cam.quaternion, A = id === 8 ? certDrift(id, f) : certA(id, f), Bc = id === 8 ? certMyst(id, f) : certB(id, f);
      const put = (m: THREE.Mesh, c: CertPose, u0: number, u1: number) => {
        m.visible = c.on && u1 - u0 > 0.004;
        if (!m.visible) return;
        _hq.setFromEuler(_he.set(-Math.PI * 2 * c.flip - (Math.PI / 2) * c.flat * 0.94, 0, c.roll, "ZXY"));
        m.quaternion.copy(cq).slerp(_hi, c.flat).multiply(_hq);
        m.position.set(o[0] + c.p[0], o[1] + c.p[1], o[2] + c.p[2]); m.scale.set(CERT.w * c.s, CERT.h * c.s, 1);
        const pa = m.geometry.attributes.position as THREE.BufferAttribute, ua = m.geometry.attributes.uv as THREE.BufferAttribute;
        pa.setX(0, u0 - 0.5); pa.setX(2, u0 - 0.5); pa.setX(1, u1 - 0.5); pa.setX(3, u1 - 0.5); pa.needsUpdate = true;
        ua.setX(0, u0); ua.setX(2, u0); ua.setX(1, u1); ua.setX(3, u1); ua.needsUpdate = true;
      };
      put(this.heroA, A, 0, 1); put(this.heroB, Bc, Bc.wipe, 1); put(this.heroG, Bc, 0, Bc.wipe);
      this.clockS.rotation.z = -((42 + tickAt(id, f)) * TAU) / 60;
      this.pages.forEach((m, k) => {
        const pg = pageAt(id, f, k); m.visible = pg.on; if (!pg.on) return;
        _hq.setFromEuler(_he.set(pg.flip, 0, pg.roll, "ZXY")); m.quaternion.copy(cq).multiply(_hq);
        m.position.set(o[0] + pg.p[0], o[1] + pg.p[1], o[2] + pg.p[2]);
      });
      this.frontLampHalo.material.opacity = 0.9 + 0.1 * lsin(5, tau);
    }
    // ---- tea steam (loop-safe), the lamp halo breathes a hair
    const cam = ctx.cam.position, sip = id === 6 && f >= SIP_WINDOW[0] && f < SIP_WINDOW[1];
    this.cup.visible = !sip;
    this.wisps.forEach((w, k) => {
      const ph = lfr(26, tau, k / 3), m = w.material as THREE.MeshBasicMaterial;
      w.position.set(o[0] + TR.tea[0] + 0.006 * Math.sin(ph * 5 + k), o[1] + TR.desk.top + 0.11 + 0.12 * ph, o[2] + TR.tea[2]);
      w.scale.set(0.8 + 0.6 * ph, 0.8 + 0.5 * ph, 1); w.rotation.y = Math.atan2(cam.x - w.position.x, cam.z - w.position.z);
      m.opacity = sip ? 0 : 0.42 * Math.sin(Math.PI * ph) * (id === 12 ? 0.4 : 1);
    });
    this.lampHalo.material.opacity = 0.9 + 0.1 * lsin(5, tau);
    // ---- light pools (<= 9; the TRADING owner shares the 18 slots)
    const P = (p: V3, c: [number, number, number], r: number) => L.pool([o[0] + p[0], o[1] + p[1], o[2] + p[2]], c, r);
    if (front) P([0.55, 1.02, 1.36], [0.85, 0.56, 0.22], 0.95);                                             // the front lamp (a bigger, warmer pool: it also warms his near side)
    else P([0.5, 0.98, 1.2], [0.6, 0.42, 0.18], 0.75);                                                      // the desk lamp
    const ek = (pre ? breath : 0.7) + 2.5 * flare;
    P([E[0], E[1] + 0.035, E[2] + 0.01], [0.1 * ek, 0.32 * ek, 0.6 * ek], 0.22);                                // ENTER's cyan glow
    const sg = id === 8 ? 1.5 : 1;
    P([0, 1.0, 1.28], [0.06 * sg, 0.12 * sg, 0.3 * sg], 1.0);                                                  // the order screen's blue
    if (id === 6 || id === 8 || id === 5) P([0, 1.2, 1.72], [0.07 * sg, 0.13 * sg, 0.3 * sg], 0.6);          // screen glow on his face
    if (red.on && front) P([0.12, 1.42, 1.78], [1.5 * rk, 0.2, 0.14], 1.35);                                  // fix2: the big board's red falls on his head and shoulders
    if (red.on && (id === 1 || id === 8)) P([TR.counter.c[0], TR.counter.c[1], TR.counter.c[2] + 0.18], [0.8 * rk, 0.1, 0.07], 0.55);
    if (id === 8 && f >= BEAT.cancelIt - 3) {
      const a = clamp01((f - BEAT.cancelIt + 3) / 8), sw = 0.65 + 0.35 * Math.sin((f - BEAT.cancelIt) * 0.21);
      P([0.5 + 0.8 * Math.sin((f - BEAT.cancelIt) * 0.1), 1.7, 1.9], [1.1 * a * sw, 0.1 * a * sw, 0.08 * a * sw], 1.6);
      P([-0.2, 0.92, 1.36], [0.5 * a, 0.05 * a, 0.04 * a], 0.5);
    }
    void TAU; void SCR;
  }

  /** the ORDER SCREEN's state: a pure function of shot + frame */
  private screenState(id: number, f: number, vf: number): Ord {
    const blink = Math.floor(vf / 15) % 2 === 0;
    if (id === 1) return f < PRESS1.contact ? { mode: "typo", qty: "610000", price: "1", strip: 0, cur: "", dots: 0, flash: 0 } : { mode: "sent", qty: "610000", price: "1", strip: 0, cur: "", dots: 0, flash: 0 };
    if (id === 14) return { mode: "typo", qty: "610000", price: "1", strip: 0, cur: "", dots: 0, flash: 0 };
    if (id === 6) {
      let n = 0; for (let k = 0; k < 6; k++) if (f >= qtyDigitAt(k)) n = k + 1;
      const qty = "610000".slice(0, n), price = f >= BEAT.yen1 ? "1" : "", strip = f >= BEAT.yen1 ? 2 : f >= STRIP6 ? 1 : 0;
      const cur: Ord["cur"] = price ? "" : n >= 6 && f >= STRIP6 ? (blink ? "p" : "") : blink || (n > 0 && n < 6) ? "q" : "";
      // fix4 (2): the box being filled glows amber; once both are in, BOTH flag red (the swap: 610000 under "shares", 1 under "yen")
      const hot: Ord["hot"] = f >= BEAT.yen1 + 10 ? "b" : f >= STRIP6 + 4 ? "p" : f >= qtyDigitAt(0) - 12 ? "q" : "";
      return { mode: "typing", qty, price, strip, cur: f >= STRIP6 + 4 && !price ? (blink ? "p" : "") : cur === "p" ? "" : cur, dots: 0, flash: 0, hot };
    }
    if (id === 8) {
      if (f < REFUSE8) return { mode: "sent", qty: "610000", price: "1", strip: 0, cur: "", dots: 0, flash: 0 };
      const flash = (f >= REFUSE8 && f < REFUSE8 + 6) || (f >= PRESS8B.contact && f < PRESS8B.contact + 6) ? 1 : 0;
      const dots = (f >= DOTS8[0] && f < PRESS8B.contact) || f >= DOTS8[1] ? 1 : 0;
      return { mode: "cancel", qty: "610000", price: "1", strip: 0, cur: "", dots, flash };
    }
    if (id === 12) return { mode: "sent", qty: "610000", price: "1", strip: 0, cur: "", dots: 0, flash: 0 };
    return { mode: "blank", qty: "", price: "", strip: 0, cur: blink ? "q" : "", dots: 0, flash: 0 };
  }
}

/** the yunomi: off-white glaze, a blue brush band, a little speckle */
const yunomiTex = () => tx("dkYunomiT", 256, 256, (g) => {
  g.fillStyle = "#ece6d8"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#3a5a8e"; g.fillRect(0, 150, 256, 22); g.fillStyle = "#5a7ab0"; g.fillRect(0, 176, 256, 5);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(80,70,60,${0.1 + 0.2 * hash(i)})`; g.fillRect(hash(i * 3.1) * 256, hash(i * 7.7) * 256, 2, 2); }
});

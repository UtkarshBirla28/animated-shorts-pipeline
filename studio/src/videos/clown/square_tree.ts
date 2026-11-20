// THE TREE AND THE MONEY (owner WORLD): the deciduous tree at the left edge of the opening frame, its ONE branch bent
// down across the path at head height, and the THREE one-dollar bills clipped to it with wooden clothes pegs (a tiny
// taped note on each). Everything is posed from plan.ts (SQ.tree / SQ.branch / SQ.bills, billSway), so CHAR's hands and
// heads meet the same bills. The canopy sits west and north of the trunk: the sun (south-south-west) reaches the bills,
// so they are LIT, pale green on clean sky, never glowing. The reveal's gold outline + arrow are OFF until shot 9.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import { SQ, SUN, billSway, loopPh, type V3 } from "./plan";
import { SID } from "./beats";
import { FILM, REW } from "./remap";
import { Batch, C, TM, lam, basic, NOINK, TAU, hash, sm, clamp01, softDot } from "./setkit";
import * as SP from "./square_paint";
import { Foliage, LeafFall, gustAt, shaftTex } from "./foliage";

const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

// ---------------- LOOK v2: the brush KICK (an animator makes a bill swing when a head brushes it) ----------------
const KICKS: { i: number; f0: number; s: number }[] = [];
/** ANIMATORS: bill i (0..2, 2 = the lowest) is brushed at PICTURE frame f0 of the shot that shows it (key S20 with
 *  pt(SID.S20, BEAT.x), the quiz with Q1's own frames): it swings away (+ = its bottom edge away from the lens) and
 *  settles over ~2 s. strength 1 = a firm brush (~0.4 rad), 0.5 = a hair touch, negative = toward the lens. Call it once
 *  at module load (your staging file); the swing is then a pure function of the picture time, so it slows down in S20,
 *  replays in E1 and runs backward in E3's rewind, and it is zero at the loop seam (t = 0) */
export const billKick = (i: number, f0: number, strength = 1) => { if (Number.isFinite(f0)) KICKS.push({ i, f0, s: strength }); };
/** the kick part of bill i's sway at picture frame f: [swing, twist] (rad) */
export const billKickAt = (i: number, f: number): [number, number] => {
  let sw = 0, tw = 0;
  for (const k of KICKS) { if (k.i !== i) continue; const t = f - k.f0; if (t < 0 || t > 80) continue;
    const env = (1 - Math.exp(-t / 1.6)) * Math.exp(-t / 24) * (1 - sm((t - 56) / 24));
    sw += 0.42 * k.s * env * Math.cos((t - 4) * 0.3); tw += 0.16 * k.s * env * Math.sin(t * 0.23 + 0.6); }
  return [sw, tw];
};
/** a tapered rod from a to b */
const rod = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r0: number, r1: number, seg = 9, vrep = 1) => {
  const d = c.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, false).translate(0, L / 2, 0);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * L * vrep);
  b.add(g, mat, new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)));
  b.add(new THREE.SphereGeometry(r1, seg, 6), mat, new THREE.Matrix4().makeTranslation(c.x, c.y, c.z));
};
/** a group that turns about a world pivot: add world-space meshes to `.inner`, rotate `.g` */
const pivot = (parent: THREE.Object3D, p: THREE.Vector3) => {
  const g = new THREE.Group(), inner = new THREE.Group();
  g.position.copy(p); inner.position.copy(p).multiplyScalar(-1); g.add(inner); parent.add(g);
  return { g, inner };
};
/** the canopy lobes [x, y, z, r, squash]: west and north of the trunk (nothing south-east of the branch, so the
 *  afternoon sun reaches the bills and the sky behind them stays clean in the opening framing) */
const LOBES: [number, number, number, number, number][] = [
  [-2.75, 4.35, 5.55, 1.3, 0.9], [-3.75, 4.9, 5.0, 1.45, 0.92], [-2.2, 5.35, 4.55, 1.25, 0.9], [-1.35, 4.5, 4.2, 1.05, 0.88], [-3.2, 6.0, 4.2, 1.35, 0.9],
  [-4.6, 4.3, 5.5, 1.2, 0.88], [-0.75, 5.15, 3.7, 0.95, 0.88], [-2.0, 6.45, 3.6, 1.1, 0.9], [-4.3, 5.9, 3.9, 1.2, 0.9], [-5.3, 5.0, 4.3, 1.05, 0.88],
  [-3.4, 4.0, 3.4, 1.15, 0.86], [-1.6, 5.9, 2.9, 0.95, 0.9], [-4.9, 3.7, 6.4, 0.85, 0.85], [-3.3, 3.55, 6.1, 0.7, 0.85],
];
/** the limbs that carry the canopy [from, to, r0, r1] */
const LIMBS: [V3, V3, number, number][] = [
  [[-2.52, 3.0, 5.86], [-3.5, 4.5, 5.2], 0.13, 0.07], [[-2.5, 3.3, 5.8], [-2.2, 5.0, 4.7], 0.12, 0.06], [[-2.55, 2.7, 5.9], [-4.3, 3.9, 5.6], 0.1, 0.05],
  [[-2.2, 5.0, 4.7], [-1.4, 4.4, 4.3], 0.06, 0.035], [[-3.5, 4.5, 5.2], [-3.2, 5.8, 4.3], 0.07, 0.04], [[-2.2, 5.0, 4.7], [-2.0, 6.2, 3.8], 0.06, 0.035],
];

export class MoneyTree {
  readonly group = new THREE.Group();
  private bob: ReturnType<typeof pivot>;
  private bills: { g: THREE.Group; halo: THREE.Mesh }[] = [];
  private sprays: { p: ReturnType<typeof pivot>; ph: number }[] = [];
  private crown: { p: ReturnType<typeof pivot>; ph: number }[] = [];
  private arrow: THREE.Mesh;
  private dark: THREE.Group[] = []; private lite: THREE.Group[] = [];
  private notes: THREE.Mesh[] = [];
  /* p3 polish */
  private fol!: Foliage; private fall!: LeafFall;
  private shafts: THREE.Mesh[] = [];
  private billGeo: { g: THREE.BufferGeometry; base: Float32Array }[] = [];
  private glints: THREE.Mesh[] = [];

  constructor() {
    const S = this.group, bark = TM("sqBark", () => SP.barkTex()), twig = C("#6a4a38");
    // ---------------- trunk + limbs (static) ----------------
    const b = new Batch(), T = SQ.tree.trunk, r0 = SQ.tree.r;
    const tp: [number, number, number, number][] = [[0, 0, 0, r0 * 1.25], [0.02, 0.5, 0.0, r0], [0.04, 1.5, -0.02, r0 * 0.9], [0.05, 2.5, -0.04, r0 * 0.8], [0.04, 3.3, -0.07, r0 * 0.66]];
    for (let k = 0; k + 1 < tp.length; k++) rod(b, bark, new THREE.Vector3(T[0] + tp[k][0], tp[k][1], T[2] + tp[k][2]), new THREE.Vector3(T[0] + tp[k + 1][0], tp[k + 1][1], T[2] + tp[k + 1][2]), tp[k][3], tp[k + 1][3], 12, 0.7);
    // root flare
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.4; rod(b, bark, new THREE.Vector3(T[0] + Math.cos(a) * 0.12, 0.42, T[2] + Math.sin(a) * 0.12), new THREE.Vector3(T[0] + Math.cos(a) * 0.5, -0.03, T[2] + Math.sin(a) * 0.5), 0.13, 0.06, 7); }
    for (const [a, c, ra, rb] of LIMBS) rod(b, bark, v3(a), v3(c), ra, rb, 8, 0.7);
    b.build(S, true);
    // ---------------- canopy: sphere lobes in 3 sway groups ----------------
    const lobe = new THREE.SphereGeometry(1, 22, 15);
    const anchors = [new THREE.Vector3(-3.4, 3.9, 5.2), new THREE.Vector3(-2.2, 4.4, 4.6), new THREE.Vector3(-4.2, 3.8, 4.6)];
    const cb = anchors.map(() => new Batch());
    /* p3: the lobes are the INNER MASS now (a little smaller and deeper green, no cast shadow); the leaf-cluster cards
     * (foliage.ts) carry the silhouette, the sun-lit rim and the dappled shadow */
    const IN = 0.9;
    LOBES.forEach(([x, y, z, r, sq], i) => {
      const m = TM("sqLeafMassI" + (i % 4), () => SP.leafMassTex(i % 4), { color: "#b8cca8" });
      cb[i % 3].add(lobe, m, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(i * 3.1) * TAU, 0)), new THREE.Vector3(r * IN, r * sq * IN, r * IN)));
    });
    cb.forEach((bt, i) => { const p = pivot(S, anchors[i]); bt.build(p.inner, false); this.crown.push({ p, ph: i * 2.1 }); });
    /* LOOK v2: the SAME lobes in a calmer, darker green (screen L* ~50, C* ~45) for the money shots S16-S20, so bills 2-3
     * (pale green, L* ~89) separate from the canopy behind them; swapped per World by visibility (pose) */
    { const db = anchors.map(() => new Batch());
      LOBES.forEach(([x, y, z, r, sq], i) => {
        const m = TM("sqLeafMassD2" + (i % 4), () => SP.leafMassTex(i % 4), { color: "#7c8e78" });
        db[i % 3].add(lobe, m, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(i * 3.1) * TAU, 0)), new THREE.Vector3(r * IN, r * sq * IN, r * IN)));
      });
      db.forEach((bt, i) => { const g = new THREE.Group(); bt.build(g, false); g.visible = false; this.crown[i].p.inner.add(g); this.dark.push(g); }); }
    for (const c of this.crown) { const g = new THREE.Group(); for (const ch of [...c.p.inner.children]) if (!this.dark.includes(ch as THREE.Group)) { c.p.inner.remove(ch); g.add(ch); } c.p.inner.add(g); this.lite.push(g); }
    // ---------------- p3: LEAF-CLUSTER CARDS over every lobe, fluttering single leaves, falling leaves, sun shafts ----------------
    this.fol = new Foliage(S);
    LOBES.forEach(([x, y, z, r, sq], i) => this.fol.dress([x, y, z], [r, r * sq, r], { n: Math.round(24 + 9 * r), size: [0.72 * r, 1.02 * r], seed: i + 1, groups: 2, amp: 0.036 + 0.01 * hash(i * 2.9) }));
    { const pts: { p: V3; n: V3 }[] = [];
      LOBES.forEach(([x, y, z, r, sq], i) => { for (let k = 0; k < 4; k++) { const a = hash(i * 7.1 + k * 3.3) * TAU, e = -0.15 + 1.0 * hash(i * 2.3 + k * 5.9), ce = Math.cos(e), n: V3 = [Math.cos(a) * ce, Math.sin(e), Math.sin(a) * ce];
        pts.push({ p: [x + n[0] * r * 1.1, y + n[1] * r * sq * 1.1, z + n[2] * r * 1.1], n }); } });
      this.fol.singleLeaves(pts, 0.25); }
    { /* release points on the west / north / top lobes (away from the branch); each path is tested against the bills */
      const st: V3[] = [];
      for (let k = 0; k < 44; k++) { const L = LOBES[[1, 5, 8, 9, 10, 4, 12, 11, 7, 2][k % 10]], a = hash(k * 4.7) * TAU; st.push([L[0] + Math.cos(a) * L[3] * 0.8 - 0.3, L[1] - L[3] * 0.5 * hash(k * 2.1), L[2] + Math.sin(a) * L[3] * 0.8 - 0.4]); }
      this.fall = new LeafFall(S, st, 11); }
    { /* soft sun shafts through the canopy (S15-S20 only: in the quiz they would lie right behind the bills): sheets along
       * the sun's rays from gaps in the crown, turned to the money shots' lenses (south-east) */
      const d = new THREE.Vector3(-SUN[0], -SUN[1], -SUN[2]).normalize(), w = new THREE.Vector3(0.72, 0, -0.69);
      for (const [x, y, z, wd, len] of [[-3.3, 5.0, 4.9, 0.8, 6.4], [-2.1, 5.3, 4.2, 0.6, 6.6], [-4.2, 4.7, 4.4, 0.9, 6.0], [-1.5, 4.9, 3.6, 0.5, 6.2], [-2.8, 5.6, 3.5, 0.7, 7.0]]) {
        const A = new THREE.Vector3(x, y, z).addScaledVector(w, -wd / 2), B = new THREE.Vector3(x, y, z).addScaledVector(w, wd / 2), Cc = B.clone().addScaledVector(d, len), D = A.clone().addScaledVector(d, len);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([A, D, Cc, A, Cc, B].flatMap((p) => [p.x, p.y, p.z]), 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, color: new THREE.Color(1.0, 0.9, 0.62), opacity: 0.1 }));
        m.layers.set(NOINK); m.renderOrder = 6; m.frustumCulled = false; m.visible = false; S.add(m); this.shafts.push(m); } }
    // ---------------- THE BRANCH (bobs a hair about its joint), its twigs, the pegs' stubs ----------------
    const P = SQ.branch.map(v3);
    this.bob = pivot(S, P[0]);
    const bb = new Batch(), R = [0.075, 0.066, 0.058, 0.048, 0.038, 0.026];
    for (let k = 0; k + 1 < P.length; k++) rod(bb, bark, P[k], P[k + 1], R[k], R[k + 1], 9, 0.9);
    // side twigs (up and out; none hangs into a bill)
    const at = (u: number) => { const f = u * (P.length - 1), k = Math.min(P.length - 2, Math.floor(f)); return P[k].clone().lerp(P[k + 1], f - k); };
    const twigs: [number, number, number, number][] = [[0.14, -0.22, 0.46, 0.2], [0.3, 0.26, 0.42, -0.25], [0.47, -0.1, 0.4, 0.22], [0.62, 0.24, 0.36, -0.2], [0.75, -0.04, 0.36, -0.22], [0.92, 0.12, 0.28, -0.18]];
    const tips: THREE.Vector3[] = [];
    for (const [u, dx, dy, dz] of twigs) { const a = at(u), e = a.clone().add(new THREE.Vector3(dx, dy, dz)); rod(bb, twig, a, e, 0.018, 0.009, 6); tips.push(e); }
    const tipEnd = P[P.length - 1].clone().add(new THREE.Vector3(0.1, -0.08, -0.1));   /* the tip bends BACK: its leaves stay behind the lowest bill (the bills are turned toward +x) */ rod(bb, twig, P[P.length - 1], tipEnd, 0.022, 0.008, 6); tips.push(tipEnd);
    bb.build(this.bob.inner, true);
    // ---------------- leaf sprays (alpha cards; they sway in little groups; no shadow casting: clean bills) ----------------
    const sprayMat = (v: number) => lam("sqSpray" + v, () => ({ map: SP.leafSprayTex(v), alphaTest: 0.5, side: THREE.DoubleSide }));
    const sprayAt = (p: THREE.Vector3, rz: number, ry: number, s: number, v: number, grp: Batch) => {
      const g = new THREE.PlaneGeometry(s, s).translate(0, s * 0.47, 0);   // the twig's foot at the origin
      grp.add(g, sprayMat(v), new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12 * Math.sin(v * 7 + rz), ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1)));
    };
    const groups = [0, 1, 2, 3].map((k) => ({ bt: new Batch(), piv: at(0.12 + k * 0.27) }));
    tips.forEach((e, i) => { const gq = groups[Math.min(3, Math.floor((i / tips.length) * 4))].bt; sprayAt(e, (hash(i * 5.3) - 0.5) * 1.1, hash(i * 2.9) * 0.9 - 0.45, 0.42 + 0.1 * hash(i * 9.1), i % 3, gq); sprayAt(e, 0.9 + hash(i) * 0.5, 0.5, 0.34, (i + 1) % 3, gq); sprayAt(e, -0.9 - hash(i * 3) * 0.5, -0.4, 0.34, (i + 2) % 3, gq); });
    // sprays straight off the top of the branch + the leafy tip that walkers duck under (it hangs to ~1.42 m)
    for (let k = 0; k < 5; k++) { const u = 0.06 + k * 0.16, a = at(u), gq = groups[Math.min(3, Math.floor(u * 4))].bt; sprayAt(a.clone().add(new THREE.Vector3(0, 0.03, 0.02 * (k % 2 ? 1 : -1))), (k % 2 ? -0.4 : 0.4) + 0.2 * hash(k * 4.1), (hash(k * 6.3) - 0.5) * 1.2, 0.36, k % 3, gq); }
    const tipP = P[P.length - 1];
    /* the tip's tuft points right and down-right, AWAY from the lowest bill's face */
    sprayAt(tipP.clone().add(new THREE.Vector3(0.05, 0, -0.1)), -2.0, 0.2, 0.27, 0, groups[3].bt); sprayAt(tipP.clone().add(new THREE.Vector3(0.06, 0.0, -0.12)), -1.4, -0.3, 0.28, 1, groups[3].bt); sprayAt(tipP.clone().add(new THREE.Vector3(0.03, 0.01, -0.13)), -0.7, 0.5, 0.3, 2, groups[3].bt);
    groups.forEach(({ bt, piv }, k) => { const p = pivot(this.bob.inner, piv); bt.build(p.inner, false); this.sprays.push({ p, ph: k * 1.7 }); });
    // ---------------- THE THREE BILLS ----------------
    const BW = SQ.bill.w, BH = SQ.bill.h, wood = C("#d9a96a"), steel = C("#aab2c0");
    const billGeo = () => {
      const g = new THREE.PlaneGeometry(BW, BH, 14, 6).translate(0, -BH / 2, 0), p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), t = -p.getY(i) / BH; p.setZ(i, 0.012 * Math.sin(x * 9) * t + 0.02 * t * t * (0.4 + (x / BW) ** 2 * 3)); }
      g.computeVertexNormals(); return g;
    };
    SQ.bills.forEach((B, i) => {
      // the stub that carries the peg, part of the branch
      const g = new THREE.Group(); g.position.set(...B.peg); g.rotation.order = "YXZ"; this.bob.inner.add(g);
      const front = new THREE.Mesh(billGeo(), lam("sqBillF", () => ({ map: SP.billTex(false), side: THREE.FrontSide })));
      const back = new THREE.Mesh(billGeo(), lam("sqBillB", () => ({ map: SP.billTex(true), side: THREE.BackSide })));
      for (const m of [front, back]) { m.castShadow = true; m.receiveShadow = false; /* audit p2 minor 7: no violet leaf-shadow blotches on the notes */ g.add(m); this.billGeo.push({ g: m.geometry, base: Float32Array.from((m.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array) }); }
      /* p3: a light glint that slides across the bill (ONLY in the story's money shots and at E3's freeze: pose) */
      { const gl = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.34, BH * 1.02), new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 1.0, 0.9), opacity: 0, fog: false }));
        gl.position.set(0, -BH / 2, 0.02); gl.rotation.z = -0.35; gl.layers.set(NOINK); gl.renderOrder = 5; gl.visible = false; g.add(gl); this.glints.push(gl); }
      // the tiny taped note (lower right of the face), a hair in front
      const note = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.086), lam("sqNote" + i, () => ({ map: SP.noteTex(i), alphaTest: 0.4 })));
      note.position.set(BW * (0.33 - 0.02 * i), -BH * (0.66 + 0.03 * i), 0.012); note.rotation.z = 0.14 - 0.1 * i; note.receiveShadow = true; g.add(note); this.notes.push(note);
      // the wooden clothes peg: two slats pinched over the top edge, a steel coil; it hangs from a twig stub
      const peg = new THREE.Group(); peg.position.set(0, 0.012, 0); g.add(peg);
      for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.115, 0.012), wood); m.position.set(0, 0.012, s * 0.009); m.rotation.x = s * 0.1; m.castShadow = true; peg.add(m); }
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.004, 6, 12), steel); coil.rotation.y = Math.PI / 2; coil.position.set(0, 0.03, 0); peg.add(coil);
      // the gold halo for the reveal (behind the bill, additive; off until shot 9)
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(BW * 1.5, BH * 1.8), new THREE.MeshBasicMaterial({ map: SP.haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: new THREE.Color(0, 0, 0), fog: false }));
      halo.position.set(0, -BH / 2, -0.012); halo.layers.set(NOINK); halo.renderOrder = 4; halo.visible = false; g.add(halo);
      this.bills.push({ g, halo });
      // the stub from the branch down to the peg (static with the branch)
      const sb = new Batch(); rod(sb, twig, new THREE.Vector3(B.peg[0], B.peg[1] + 0.13, B.peg[2]), new THREE.Vector3(B.peg[0], B.peg[1] + 0.05, B.peg[2] + 0.004), 0.012, 0.008, 6); sb.build(this.bob.inner, true);
    });
    // the reveal's thin arrow (a camera-facing card right of the row, pointing at it)
    this.arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), basic("sqArrow", () => ({ map: SP.arrowTex(), transparent: true, depthWrite: false, depthTest: false, opacity: 0, fog: false })));
    this.arrow.layers.set(NOINK); this.arrow.renderOrder = 7; this.arrow.visible = false; S.add(this.arrow);
  }

  /** the reveal's highlight strength at picture frame f (shot 9 only): in over the first 14 f of the pull-back, a slow
   *  pulse, out over the last line, exactly 0 on the last frames (the loop: frame TOTAL = frame 0 = no highlight) */
  static reveal(_id: number, _f: number) {
    return 0;   /* LOOK v2: retired; E3's gold ring is drawn by Overlays.tsx (crisp, screen-space, driven by remap.ts tapeAt) */
  }

  pose(ctx: SetCtx) {
    const vf = ctx.vf;
    // the branch nods a hair in the breeze, the crown breathes, the sprays flutter (all whole cycles over the loop)
    this.bob.g.rotation.set(0.004 * Math.sin(loopPh(vf, 19) + 0.6), 0, 0.006 * Math.sin(loopPh(vf, 13)));
    this.crown.forEach((c, i) => c.p.g.rotation.set(0.012 * Math.sin(loopPh(vf, 11 + 2 * i) + c.ph), 0, 0.014 * Math.sin(loopPh(vf, 9 + 3 * i) + 1.3 * c.ph)));
    /* p3: the twig sprays ride the gusts (a lull: half the old sway; a gust: ~1.5 x plus a fast flutter) */
    this.sprays.forEach((s, i) => { const gq = gustAt(vf, -2.2 + 0.5 * i, 5.5), a = 0.5 + 1.0 * gq;
      s.p.g.rotation.set(0.05 * a * Math.sin(loopPh(vf, 31 + 4 * i) + s.ph) + 0.012 * gq * Math.sin(loopPh(vf, 139 + 9 * i) + s.ph), 0.04 * a * Math.sin(loopPh(vf, 23 + 3 * i) + 2 * s.ph), 0.06 * a * Math.sin(loopPh(vf, 27 + 5 * i) + 1.4 * s.ph)); });
    const k = MoneyTree.reveal(ctx.id, ctx.f), pulse = 0.72 + 0.28 * Math.sin(ctx.f * 0.21);
    // LOOK v2: the darker canopy in the money shots; the taped note only where the reader peers at it (S19)
    const money = ctx.id >= SID.S16 && ctx.id <= SID.S20;
    this.dark.forEach((g) => { g.visible = money; }); this.lite.forEach((g) => { g.visible = !money; });
    /* p3: foliage, falling leaves, shafts (S15-S20 only), the bills' soft flutter, the glint */
    this.fol.swap(money); this.fol.pose(vf); this.fall.pose(vf);
    { const on = ctx.id >= SID.S15 && ctx.id <= SID.S20, gq = gustAt(vf, -2.8, 4.4);
      this.shafts.forEach((m, i) => { m.visible = on; if (on) (m.material as THREE.MeshBasicMaterial).opacity = [0.1, 0.07, 0.09, 0.06, 0.08][i] * (0.7 + 0.3 * Math.sin(loopPh(vf, 37 + 6 * i) + i)) * (0.75 + 0.5 * gq); }); }
    this.billGeo.forEach((bg, k) => { const i = k >> 1, gq = gustAt(vf, SQ.bills[i].peg[0], 5.5), a = bg.g.attributes.position as THREE.BufferAttribute, B0 = bg.base, BH = SQ.bill.h;
      for (let q = 0; q < a.count; q++) { const x = B0[q * 3], t = -B0[q * 3 + 1] / BH; a.setZ(q, B0[q * 3 + 2] + (0.004 + 0.008 * gq) * t * t * Math.sin(x * 15 + loopPh(vf, 151 + 6 * i) + i)); }
      a.needsUpdate = true; });
    { const f = ctx.f, story = ctx.id >= SID.S17 && ctx.id <= SID.S20, e3 = FILM.id === SID.E3, h0 = REW.a + REW.r1;
      this.glints.forEach((gl, i) => {
        /* story: one pass every 76 picture frames, the three bills in turn; E3: one pass each during the freeze */
        const u = e3 ? (FILM.f - (h0 + 3 + 3 * i)) / 12 : story ? ((((f + 25 * i) % 76) + 76) % 76) / 13 : -1;
        gl.visible = u > 0 && u < 1; if (!gl.visible) return;
        gl.position.x = (-0.6 + 1.2 * u) * SQ.bill.w * 0.5; (gl.material as THREE.MeshBasicMaterial).opacity = (e3 ? 0.85 : 0.6) * Math.sin(Math.PI * u) ** 1.5; }); }
    this.notes.forEach((n) => { n.visible = false; });   /* audit p2 minor 9: the taped note read as a yellow blemish even in S19 */
    /* lead decision (audit_p2 AUDIT_test minor 10): the bills belong to THIS VIDEO’s quiz and to the money study, not to the
     * clown study: they hang in the quiz (Q1-Q3; E1-E3 draw those shots, so the replays show them) and from the shot where
     * Hyman hangs them (S17-S20). In S1 and S6-S16 the branch is bare (no bills, pegs or notes) */
    const hung = ctx.id <= SID.Q3 || (ctx.id >= SID.S17 && ctx.id <= SID.S20);
    this.bills.forEach((b, i) => {
      b.g.visible = hung;
      const sw = billSway(i, vf), kk = billKickAt(i, ctx.f);
      b.g.rotation.set(sw.swing + kk[0], SQ.bills[i].yaw + sw.twist + kk[1], 0.03 * Math.sin(loopPh(vf, 29 + i) + i));
      b.halo.visible = k > 0.002;
      if (b.halo.visible) (b.halo.material as THREE.MeshBasicMaterial).color.setRGB(3.4 * k * pulse, 2.5 * k * pulse, 0.6 * k * pulse);
    });
    // the arrow: right of the middle bill, turned to the lens, a constant ~0.5 of the frame width at any distance
    this.arrow.visible = k > 0.002;
    if (this.arrow.visible) {
      const mid = SQ.bills[1].peg, cam = ctx.cam, d = cam.position.distanceTo(new THREE.Vector3(mid[0], mid[1], mid[2]));
      const sc = clamp01((d - 3) / 9), size = 0.75 + 0.55 * sc, wob = 0.05 * Math.sin(ctx.f * 0.21);
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      this.arrow.position.set(mid[0], mid[1] - SQ.bill.h / 2, mid[2]).addScaledVector(right, 0.42 + 0.62 * size + wob).addScaledVector(up, 0.3 + 0.2 * size);
      this.arrow.quaternion.copy(cam.quaternion); this.arrow.scale.setScalar(size);
      (this.arrow.material as THREE.MeshBasicMaterial).opacity = k;
    }
  }
}

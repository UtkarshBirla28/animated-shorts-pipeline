// HALL + COURT (owner HALL): shot 11 THE PIVOT, a warm chalky community hall (a new colour world: cream plaster, honey
// planks, mint wainscot, pastel bunting + paper lanterns, low sun through tall windows) round a GIANT cork NOTICE BOARD:
// "SELLING!" is pinned (tear-off tabs snatched one by one), then the big red CANCEL button, out of whose crack a little
// bug crawls (a BUG tag swings down beside it). Shot 13 THE COURT, a pale blond-wood Tokyo courtroom: the raised bench
// (three judges = CHAR), the evidence table with the broken CANCEL button + a long receipt (a slice is torn off on
// "pay"), the lawyer's table with a briefcase, a ceiling fan, high windows, a wall calendar flipping 2005 -> 2013.
// Story timing + the points the cast syncs to: hall_time.ts. Painters: hall_tex.ts. No gavel anywhere.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import type { Lighting, SetModule } from "./sets";
import { HL, CT } from "./plan";
import type { V3 } from "./plan";
import {
  RB, C, TM, CE, lam, basic, faceMat, plane, contact, glowSprite, glowCol, Motes, shaftTex, wispTex, cylY, V, NOINK,
  vs, vph, VF, TAU, hash, lerp, sm, outBack, clamp01,
} from "./setkit";
import type { P3 } from "./setkit";
import { tri } from "./build";
import {
  hlFloorTex, hlPlasterTex, hlWainTex, hlWoodTex, hlCorkTex, sellingTex, tabTex, btnPlateTex, crackDecalTex, bugTagTex,
  clockFaceTex, lanternTex, panePatchTex, chairTex, hallPosterTex, BTN,
  ctPanelTex, ctBoardsTex, ctPlasterTex, ctCarpetTex, ctFloorTex, ctBenchTex, ctWindowTex, calPageTex, calBackTex,
  receiptTex, sliceTex, evidTagTex, ctLeatherTex, papersTex,
} from "./hall_tex";
import {
  PIN_F, TABS, TAB_FLY, TAB_F, tabTarget, NOTE, BTN_F, BUG_PEEK, BUG_OUT, BUG_SIT, TAG_F,
  CAL, CAL_F, EVID, SLICE_FROM, sliceU, slicePos,
} from "./hall_time";
import { KEY_HALL, KEY_COURT } from "./look_hall";

type Shaft = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; p0: THREE.Vector3; d: THREE.Vector3; len: number; w: number; k: THREE.Color; ph: number };
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const W = (o: V3, p: V3): P3 => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, p: P3 = [0, 0, 0], cast = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
};
const KH = new THREE.Vector3(...KEY_HALL).normalize(), KC = new THREE.Vector3(...KEY_COURT).normalize();
/** the foreground side table (hall-local x, z) and the kettle's x offset on it */
const TBL = [-0.78, 1.5], KET = 0.24;
/** the court bench top actually built (plan.ts CT.bench.top is 1.5: lead_request to lower it, so the judges' robes and
 *  the pointing arm clear the bench) */
const BENCH_TOP = 1.24;

export class HallSet implements SetModule {
  readonly sets = ["hall" as const, "court" as const];
  readonly group = new THREE.Group();
  private hall = new THREE.Group(); private court = new THREE.Group();
  private shafts: Shaft[] = [];
  // hall story props + life
  private note = new THREE.Group(); private notePin = new THREE.Group(); private tabs: THREE.Mesh[] = [];
  private btn = new THREE.Group(); private btnPins: THREE.Mesh[] = [];
  private bug = new THREE.Group(); private bugAnt: THREE.Group[] = []; private bugLegs: THREE.Group[] = [];
  private tag = new THREE.Group(); private tagPin!: THREE.Mesh; private tagString!: THREE.Mesh;
  private lanterns: THREE.Group[] = []; private hlHands: THREE.Mesh[] = []; private steam: THREE.Mesh[] = [];
  private flyer!: THREE.Mesh; private flyerBase!: Float32Array; private hlMotes!: Motes;
  // court
  private pages: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = []; private fan = new THREE.Group();
  private slice!: THREE.Mesh; private rustle!: THREE.Mesh; private rustleBase!: Float32Array; private ctMotes!: Motes;

  constructor(_kit: Kit) {
    this.group.add(this.hall, this.court);
    this.buildHall();
    this.buildCourt();
  }

  // ------------------------------------------------------------------------------------------------ shafts (saladoil)
  private addShaft(parent: THREE.Object3D, p0: P3, d: THREE.Vector3, len: number, w: number, k: THREE.Color, ph = 0) {
    const mat = new THREE.MeshBasicMaterial({ map: shaftTex(), color: k.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), mat); m.layers.set(NOINK); m.renderOrder = 4; m.frustumCulled = false; parent.add(m);
    this.shafts.push({ mesh: m, mat, p0: V(...p0), d: d.clone().normalize(), len, w, k: k.clone(), ph });
  }
  private poseShafts(cam: THREE.Camera) {
    for (const S of this.shafts) {
      if (!S.mesh.parent?.visible) continue;
      const toCam = cam.position.clone().sub(S.p0).normalize(), side = new THREE.Vector3().crossVectors(S.d, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(S.d, side).normalize();
      S.mesh.position.copy(S.p0); S.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(S.d, side, nrm));
      S.mesh.scale.set(S.len, S.w * (1 + 0.05 * vs(0.6, S.ph)), 1);
      S.mat.color.copy(S.k).multiplyScalar(0.88 + 0.12 * vs(0.45, S.ph));
    }
  }

  // ================================================================================================ HALL
  private buildHall() {
    const o = HL.base, g = this.hall, rb = new RB(o), X = HL.room.w / 2, Z = HL.room.d / 2, H = HL.room.h, WT = 1.0;
    const plaster = TM("hlPlaster", () => hlPlasterTex()), wain = TM("hlWain", hlWainTex), wood = TM("hlWood", () => hlWoodTex());
    const woodD = TM("hlWoodD", () => hlWoodTex("hlWoodD", "#b07a44")), trim = C("#fbf1dc"), sky = C("#9cc8e0");
    // ---- shell: honey planks, cream ceiling + honey beams, mint wainscot + cream plaster, a chair rail, skirting
    rb.flatY(TM("hlFloor", hlFloorTex), -X, X, -Z, Z, 0, 1, 2, 2);
    rb.flatY(TM("hlCeil", () => hlPlasterTex("hlCeil", "#f8eedb")), -X, X, -Z, Z, H, -1, 2, 2);
    for (const [z, f] of [[-Z, 1], [Z, -1]] as number[][]) { rb.wallZ(wain, -X, X, 0, WT, z, f, 1, 1); rb.wallZ(plaster, -X, X, WT, H, z, f, 2, 2); }
    for (const [x, f] of [[-X, 1], [X, -1]] as number[][]) { rb.wallX(wain, -Z, Z, 0, WT, x, f, 1, 1); rb.wallX(plaster, -Z, Z, WT, H, x, f, 2, 2); }
    for (const [x0, z0, x1, z1] of [[-X, -Z, X, -Z + 0.04], [-X, Z - 0.04, X, Z], [-X, -Z, -X + 0.04, Z], [X - 0.04, -Z, X, Z]]) {
      rb.box(trim, x0, WT, z0, x1, WT + 0.06, z1, false); rb.box(woodD, x0, 0, z0, x1, 0.12, z1, false);
    }
    for (const z of [-3.7, -1.25, 1.2, 3.65]) rb.box(woodD, -X, H - 0.26, z - 0.12, X, H, z + 0.12, false);
    // ---- tall windows on the +x wall (the low sun comes through them): a warm garden view, pastel-blue frames, sills
    const winZ = [2.6, 0.2, -2.2];
    for (const zc of winZ) {
      plane(g, basic("hlWinView", () => ({ color: new THREE.Color(1.5, 1.38, 1.12) })), 1.5, 2.6, W(o, [X - 0.01, 2.4, zc]), -Math.PI / 2, 0, 0, true);
      for (const dz of [-0.78, 0.78]) rb.box(sky, X - 0.1, 1.1, zc + dz - 0.04, X, 3.7, zc + dz + 0.04);
      rb.box(sky, X - 0.1, 3.7, zc - 0.82, X, 3.8, zc + 0.82); rb.box(trim, X - 0.2, 1.04, zc - 0.85, X, 1.1, zc + 0.85);
      rb.box(sky, X - 0.06, 1.1, zc - 0.02, X, 3.7, zc + 0.02); for (const y of [1.75, 2.4, 3.05]) rb.box(sky, X - 0.06, y - 0.02, zc - 0.78, X, y + 0.02, zc + 0.78);
    }
    // ---- THE GIANT NOTICE BOARD: a cork slab in a honey frame with a pin ledge; a few 3D notes for depth
    const B = HL.board, bx0 = B.c[0] - B.w / 2, bx1 = B.c[0] + B.w / 2, by0 = B.c[1] - B.h / 2, by1 = B.c[1] + B.h / 2, fw = 0.15, fz = B.c[2] + 0.08;
    rb.box(C("#8a6040"), bx0, by0, -Z, bx1, by1, B.c[2] - 0.003, false);
    rb.panel(TM("hlCork", hlCorkTex), B.w, B.h, B.c[0], B.c[1], B.c[2]);
    rb.box(wood, bx0 - fw, by1, -Z, bx1 + fw, by1 + fw, fz); rb.box(wood, bx0 - fw, by0 - fw, -Z, bx1 + fw, by0, fz);
    rb.box(wood, bx0 - fw, by0, -Z, bx0, by1, fz); rb.box(wood, bx1, by0, -Z, bx1 + fw, by1, fz);
    rb.box(woodD, bx0 - fw - 0.04, by0 - fw - 0.05, -Z, bx1 + fw + 0.04, by0 - fw, B.c[2] + 0.2);
    // chalk + a pin box on the ledge
    for (let k = 0; k < 5; k++) rb.rbox(C(["#fbf6ea", "#f8c9c8", "#c7e5d6", "#fbe7a1", "#cfe0f4"][k]), 0.09, 0.022, 0.022, -1.9 + k * 0.13, by0 - fw + 0.011, B.c[2] + 0.12, 0.2 * (k - 2));
    rb.box(C("#e86a5a"), 2.1, by0 - fw, B.c[2] + 0.05, 2.32, by0 - fw + 0.06, B.c[2] + 0.17);
    const pastels = ["#fdf6e2", "#f8c9c8", "#c7e5d6", "#cfe0f4", "#e3d4f0", "#fbe7a1"], pinCols = ["#e8473c", "#3a8ad8", "#f2c230", "#3aa86a", "#e86aa8"];
    const notes3: [number, number, number, number, number][] = [[-2.45, 3.45, 0.42, 0.34, 0.06], [-1.75, 1.15, 0.36, 0.44, -0.08], [0.55, 3.55, 0.4, 0.3, 0.05], [2.55, 3.4, 0.34, 0.42, -0.07], [2.6, 1.15, 0.4, 0.32, 0.09], [-2.6, 2.2, 0.3, 0.38, 0.12], [0.75, 1.25, 0.34, 0.28, -0.05]];
    notes3.forEach(([x, y, w, h, a], i) => {
      const memo = lam("si:hlMemo" + i, () => ({ map: papersTex(), color: new THREE.Color(pastels[i % pastels.length]) }));
      rb.panel(memo, w, h, x, y, B.c[2] + 0.012 + 0.002 * i, 0, 0.05 * ((i % 3) - 1), a, true);
      rb.geo(new THREE.SphereGeometry(0.022, 12, 8), C(pinCols[i % pinCols.length]), x, y + h / 2 - 0.04, B.c[2] + 0.04);
    });
    // the round wall clock above the board (pastel pink rim) + its hands
    rb.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 32).rotateX(Math.PI / 2), C("#e89a9a"), 0, 4.31, -Z + 0.03);
    rb.panel(faceMat("hlClock", () => clockFaceTex("hlClockF", "#e89a9a"), 0.93), 0.3, 0.3, 0, 4.31, -Z + 0.057);
    for (const [L, w, k] of [[0.08, 0.014, 0], [0.115, 0.01, 1], [0.12, 0.004, 2]] as number[][]) {
      const hm = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.004).translate(0, L / 2 - 0.018, 0), basic("hlHand" + k, () => ({ color: k === 2 ? new THREE.Color("#c8302a") : new THREE.Color("#2a2030") })));
      hm.position.set(o[0], o[1] + 4.31, o[2] - Z + 0.062 + k * 0.002); hm.layers.set(NOINK); g.add(hm); this.hlHands.push(hm);
    }
    // posters on the plaster either side of the board
    rb.panel(TM("hlPoster", hallPosterTex), 0.72, 1.04, -4.2, 2.3, -Z + 0.01); rb.panel(lam("si:hlPoster2", () => ({ map: hallPosterTex(), color: new THREE.Color("#cfe8ff") })), 0.6, 0.86, 4.1, 2.1, -Z + 0.01, 0, 0, 0.04);
    // ---- pastel bunting strung across the hall (three strings, sagging)
    const bunt = ["#f4a8a8", "#a9d8c4", "#fbe08a", "#a8c8ec", "#d8bce8", "#f8c49a"];
    const string = (z: number, y0: number, sag: number, x0: number, x1: number, seed: number) => {
      const N = 40, pts: P3[] = [];
      for (let i = 0; i <= N; i++) { const u = i / N, x = lerp(x0, x1, u); pts.push([x, y0 - sag * 4 * u * (1 - u), z]); }
      for (let i = 0; i < N; i++) rb.seg(C("#8a6a58"), pts[i], pts[i + 1], 0.005, false, 4);
      for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.36) {
        const u = (x - x0) / (x1 - x0), y = y0 - sag * 4 * u * (1 - u), col = bunt[Math.floor(hash(seed + x * 7.1) * bunt.length)];
        rb.geo(tri(V(x - 0.1, y, z), V(x, y - 0.24, z), V(x + 0.1, y, z)), lam("si:hlBunt" + col, () => ({ color: col, side: THREE.DoubleSide })), 0, 0, 0, 0, 0, 0, 1, false);
      }
    };
    string(-4.2, 4.12, 0.42, -X, X, 1); string(-1.7, 4.2, 0.5, -X, X, 2); string(0.9, 4.25, 0.45, -X, X, 3);
    // ---- foreground left: a little round side table with a mint enamel kettle, cups and a biscuit tin (steam)
    { const tx0 = TBL[0], tz = TBL[1], top = 0.72;
      rb.geo(cylY(0.34, 0.04, 28), wood, tx0, top - 0.04, tz); rb.seg(woodD, [tx0, 0, tz], [tx0, top - 0.04, tz], 0.04);
      rb.geo(cylY(0.2, 0.03, 20), woodD, tx0, 0, tz);
      const kx = tx0 + KET;
      rb.geo(new THREE.SphereGeometry(0.11, 20, 14), C("#8fd0b8"), kx, top + 0.09, tz - 0.05, 0, 0, 0, [1, 0.85, 1]);
      rb.geo(cylY(0.07, 0.03, 18), C("#fbf1dc"), kx, top + 0.17, tz - 0.05); rb.geo(new THREE.SphereGeometry(0.02, 10, 8), C("#2a2030"), kx, top + 0.205, tz - 0.05);
      rb.seg(C("#8fd0b8"), [kx - 0.09, top + 0.07, tz - 0.05], [kx - 0.18, top + 0.15, tz - 0.03], 0.014);
      rb.geo(new THREE.TorusGeometry(0.08, 0.011, 6, 20, Math.PI), C("#2a2030"), kx, top + 0.19, tz - 0.05);
      for (const [dx, dz, c] of [[-0.16, 0.1, "#f4a8a8"], [-0.02, 0.2, "#fbe08a"]] as [number, number, string][]) { rb.geo(cylY(0.04, 0.07, 16, false, 0.045), C(c), tx0 + dx, top, tz + dz); rb.geo(new THREE.TorusGeometry(0.022, 0.006, 6, 12), C(c), tx0 + dx + 0.05, top + 0.035, tz + dz); }
      rb.geo(cylY(0.09, 0.08, 24), C("#7fa8d8"), tx0 - 0.15, top, tz - 0.12); rb.geo(cylY(0.092, 0.015, 24), C("#f6d27a"), tx0 - 0.15, top + 0.08, tz - 0.12);
      contact(g, [o[0] + tx0, o[1] + 0.006, o[2] + tz], 0.9, 0.9, 0.35);
      for (let k = 0; k < 3; k++) this.steam.push(plane(g, new THREE.MeshBasicMaterial({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.8 }), 0.08, 0.3, W(o, [kx - 0.19, top + 0.3, tz - 0.03]), 0, 0, 0, true)); }
    // ---- foreground right: a stack of six pastel stacking chairs + one chair set out
    const chairM = (c: string) => TM("hlChair" + c, () => chairTex("hlChairT" + c, c)), steel = C("#6a8ab0");
    const chair = (x: number, z: number, ry: number, y0: number, col: string, legs: boolean) => {
      const m = new THREE.Matrix4().makeRotationY(ry), P = (a: number, b: number, c: number): P3 => { const v = V(a, b, c).applyMatrix4(m); return [x + v.x, y0 + v.y, z + v.z]; };
      rb.geo(new THREE.BoxGeometry(0.44, 0.03, 0.42), chairM(col), ...P(0, 0.45, 0), ry);
      rb.geo(new THREE.BoxGeometry(0.42, 0.24, 0.025), chairM(col), ...P(0, 0.76, -0.2), ry, -0.12);
      for (const sx of [-1, 1]) { rb.seg(steel, P(sx * 0.2, 0.45, -0.2), P(sx * 0.21, 0.9, -0.24), 0.011, true, 6);
        if (legs) { rb.seg(steel, P(sx * 0.2, 0, 0.19), P(sx * 0.2, 0.45, 0.19), 0.011, true, 6); rb.seg(steel, P(sx * 0.2, 0, -0.2), P(sx * 0.2, 0.45, -0.2), 0.011, true, 6); } }
    };
    for (let k = 0; k < 6; k++) chair(1.22, 1.25, -0.35, k * 0.075, ["#f4a8a8", "#a9d8c4", "#fbe08a", "#a8c8ec", "#d8bce8", "#f4a8a8"][k], k === 0);
    contact(g, [o[0] + 1.22, o[1] + 0.006, o[2] + 1.25], 0.8, 0.8, 0.35);
    chair(-2.3, -0.3, 0.3, 0, "#a9d8c4", true); chair(2.6, -0.9, -0.4, 0, "#fbe08a", true);
    // ---- paper lanterns hanging from the beams (they sway); warm glow
    const lan: [number, number, number, number, string][] = [[-1.05, 3.45, -2.9, 0.28, "#fbe7c8"], [1.45, 3.6, -1.4, 0.24, "#f8d2d0"], [-0.15, 3.75, 0.7, 0.3, "#fff0c0"], [2.4, 3.35, -3.5, 0.22, "#d8ecdc"], [-2.6, 3.55, -1.2, 0.24, "#f8d2d0"]];
    lan.forEach(([x, y, z, r, c], i) => {
      const grp = new THREE.Group(); grp.position.set(o[0] + x, o[1] + H - 0.26, o[2] + z); g.add(grp); this.lanterns.push(grp);
      const L = H - 0.26 - y;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, L, 4).translate(0, -L / 2, 0), basic("hlCord", () => ({ color: new THREE.Color("#4a3a34") }))); cord.layers.set(NOINK); grp.add(cord);
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16).scale(1, 0.9, 1), lam("si:hlLan" + i, () => ({ map: lanternTex("hlLanT" + c, c), emissive: new THREE.Color("#ffb868"), emissiveIntensity: 0.5 })));
      m.position.y = -L - r * 0.9; grp.add(m);
      for (const s of [1, -1]) { const cap = new THREE.Mesh(cylY(r * 0.32, 0.03, 16), C("#3a3034")); cap.position.y = -L - r * 0.9 + s * r * 0.9 - (s > 0 ? 0.01 : 0.02); grp.add(cap); }
      glowSprite(grp, [0, -L - r * 0.9, 0], r * 3.2, glowCol("#ffc890", 0.16));
    });
    // ---- a flyer fluttering in the draft (pinned at its top, on the board's left)
    { const fg = new THREE.PlaneGeometry(0.42, 0.56, 6, 8).translate(0, -0.28, 0); this.flyer = new THREE.Mesh(fg, lam("si:hlFlyer", () => ({ map: hallPosterTex(), color: new THREE.Color("#fff6d8"), side: THREE.DoubleSide })));
      this.flyer.position.set(o[0] - 2.1, o[1] + 2.0, o[2] + B.c[2] + 0.02); this.flyer.castShadow = true; g.add(this.flyer);
      this.flyerBase = Float32Array.from((fg.attributes.position as THREE.BufferAttribute).array as Float32Array);
      mesh(g, new THREE.SphereGeometry(0.024, 12, 8), C("#3a8ad8"), [o[0] - 2.1, o[1] + 1.96, o[2] + B.c[2] + 0.045]); }
    // ---- window light: sun shafts from the tall windows + pane patches on the floor, dust motes in them
    // the beams are aimed a little steeper than the painted key and start where they enter the frame (upper right), as
    // if from the high part of the windows; they land as soft pane patches in front of the board
    const sd = V(-0.62, -0.63, -0.45).normalize();
    for (const [x, y, z, w, k, ph] of [[2.9, 4.35, -0.6, 1.1, 1, 0.3], [3.1, 4.3, -2.3, 0.8, 0.8, 1.9], [2.7, 4.4, 0.9, 0.7, 0.6, 3.3], [3.3, 4.2, -1.4, 0.45, 0.5, 4.4]]) {
      this.addShaft(g, W(o, [x, y, z]), sd, (y - 0.05) / -sd.y + 0.6, w, new THREE.Color(0.48, 0.35, 0.16).multiplyScalar(k), ph);
      const t = y / -sd.y, cx = x + sd.x * t, cz = z + sd.z * t;
      if (cz > -Z + 0.5) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, w * 2.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: panePatchTex(), color: new THREE.Color(0.3, 0.21, 0.09).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
        pm.position.set(o[0] + cx, o[1] + 0.013, o[2] + cz); pm.rotation.y = Math.atan2(sd.x, sd.z); pm.layers.set(NOINK); pm.renderOrder = 3; g.add(pm); }
    }
    const d = KH.clone().negate();
    winZ.forEach((zc) => {
      const tb = 1.1 / -d.y, tt = 3.7 / -d.y, b0: P3 = [X + d.x * tb, 0, zc + d.z * tb], b1: P3 = [X + d.x * tt, 0, zc + d.z * tt];
      const cx = (b0[0] + b1[0]) / 2, cz = (b0[2] + b1[2]) / 2, len = Math.hypot(b1[0] - b0[0], b1[2] - b0[2]), ang = Math.atan2(b1[0] - b0[0], b1[2] - b0[2]);
      if (cz - 0.3 * len > -Z) {
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.25, len).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: panePatchTex(), color: new THREE.Color(0.32, 0.22, 0.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
        pm.position.set(o[0] + cx, o[1] + 0.012, o[2] + cz); pm.rotation.y = ang; pm.layers.set(NOINK); pm.renderOrder = 3; g.add(pm);
      }
    });
    this.hlMotes = new Motes(g, 160, 11, HL.base, [-1.6, 0.4, -4.4], [3.6, 3.6, 1.2], new THREE.Color(0.95, 0.78, 0.5), 0.016, 0.05, 0.015);
    rb.done(g);
    this.buildNote(); this.buildButton(); this.buildBug(); this.buildTag();
  }

  /** the SELLING! note: body + pin + 8 tear-off tabs (a group at the note centre, plan.ts HL.note) */
  private buildNote() {
    const o = HL.base, n = this.note;
    n.position.set(o[0] + NOTE.c[0], o[1] + NOTE.c[1], o[2] + NOTE.c[2]); this.hall.add(n);
    const body = new THREE.Mesh(new THREE.PlaneGeometry(NOTE.w, NOTE.h), faceMat("hlSelling", sellingTex, 0.96)); n.add(body);
    const back = new THREE.Mesh(new THREE.BoxGeometry(NOTE.w, NOTE.h, 0.004).translate(0, 0, -0.003), C("#e8d690")); back.castShadow = true; n.add(back);
    const tw = NOTE.w / TABS;
    for (let i = 0; i < TABS; i++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(tw - 0.005, NOTE.tabH).translate(0, -NOTE.tabH / 2, 0), basic("hlTabM", () => ({ map: tabTex(), side: THREE.DoubleSide, color: new THREE.Color(0.96, 0.96, 0.96) })));
      t.position.set(-NOTE.w / 2 + (i + 0.5) * tw, -NOTE.h / 2, 0.001); n.add(t); this.tabs.push(t);
    }
    this.notePin.position.set(0, NOTE.h / 2 - 0.05, 0.02); n.add(this.notePin);
    mesh(this.notePin, new THREE.SphereGeometry(0.034, 16, 12).scale(1, 1, 0.8), C("#e8473c"), [0, 0, 0.03]);
    mesh(this.notePin, cylY(0.022, 0.03, 14).rotateX(Math.PI / 2), C("#c8302a"), [0, 0, 0.0]);
  }
  /** the CANCEL button: a cream plate (unlit, readable "CANCEL"), dark bezel, red dome with a crack, four corner pins */
  private buildButton() {
    const o = HL.base, b = this.btn, P = BTN.plate;
    b.position.set(o[0] + HL.button[0], o[1] + HL.button[1], o[2] + HL.button[2]); this.hall.add(b);
    mesh(b, new THREE.BoxGeometry(P, P, 0.05).translate(0, 0, -0.026), C("#d8ccb4"));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(P, P), faceMat("hlBtnPlate", btnPlateTex, 0.95)); face.position.z = 0.001; b.add(face);
    mesh(b, new THREE.TorusGeometry(0.205, 0.022, 10, 40), C("#3a3038"), [0, 0.06, 0.006]);
    const dome = mesh(b, new THREE.SphereGeometry(BTN.dome, 40, 20, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.58), CE("#e2302a", "#ff3a2a", 0.22), [0, 0.06, 0.004]);
    void dome;
    // the crack: an alpha decal laid on the dome surface (front-upper-right), where the bug comes out
    const c = this.domePt(0.06, 0.06), nrm = this.domeN(0.06, 0.06);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), basic("hlCrackM", () => ({ map: crackDecalTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
    crack.position.set(c.x - 0.004, c.y + 0.006, c.z + 0.003); crack.quaternion.setFromUnitVectors(V(0, 0, 1), nrm); crack.layers.set(NOINK); crack.renderOrder = 3; b.add(crack);
    for (const [x, y] of [[-0.27, 0.27], [0.27, 0.27], [-0.27, -0.27], [0.27, -0.27]]) {
      const p = mesh(b, new THREE.SphereGeometry(0.022, 12, 8).scale(1, 1, 0.8), C("#3a8ad8"), [x, y, 0.02]); this.btnPins.push(p);
    }
  }
  /** a point on the dome surface at plate-local (x, y relative to the dome centre) */
  private domePt(x: number, y: number) { const r = BTN.dome, q = 1 - (x * x + y * y) / (r * r); return V(x, 0.06 + y, 0.004 + (q > 0 ? 0.58 * r * Math.sqrt(q) : 0)); }
  private domeN(x: number, y: number) { const r = BTN.dome, q = 1 - (x * x + y * y) / (r * r); if (q <= 0.02) return V(0, 0, 1); const zc = 0.58 * r, z = zc * Math.sqrt(q); return V(x / (r * r), y / (r * r), z / (zc * zc)).normalize(); }
  /** the cute beetle (back toward +z, head toward +y): teal shell + yellow spots, dark head, big eyes, antennae, 6 legs */
  private buildBug() {
    const b = this.bug, s = 1.35;
    const inner = new THREE.Group(); inner.scale.setScalar(s); b.add(inner);
    const shell = C("#2f9a78"), dark = C("#2a2430");
    mesh(inner, new THREE.SphereGeometry(0.05, 20, 14).scale(1, 1.25, 0.62), shell, [0, -0.005, 0.03]);
    mesh(inner, new THREE.BoxGeometry(0.004, 0.115, 0.004), dark, [0, -0.005, 0.061]);
    for (const [x, y] of [[-0.022, 0.012], [0.024, -0.02], [-0.018, -0.035], [0.02, 0.025]]) mesh(inner, new THREE.SphereGeometry(0.0095, 10, 8).scale(1, 1, 0.35), C("#f6d24a"), [x, y, 0.058]);
    mesh(inner, new THREE.SphereGeometry(0.03, 16, 12).scale(1, 0.9, 0.8), dark, [0, 0.065, 0.026]);
    for (const sx of [-1, 1]) {
      mesh(inner, new THREE.SphereGeometry(0.0135, 12, 10), basic("hlBugEye", () => ({ color: new THREE.Color(0.97, 0.97, 0.95) })), [sx * 0.015, 0.078, 0.046]);
      mesh(inner, new THREE.SphereGeometry(0.0068, 10, 8), basic("hlBugPupil", () => ({ color: new THREE.Color(0.06, 0.04, 0.06) })), [sx * 0.016, 0.084, 0.056]);
      const a = new THREE.Group(); a.position.set(sx * 0.01, 0.088, 0.036); inner.add(a); this.bugAnt.push(a);
      const st = mesh(a, new THREE.CylinderGeometry(0.0022, 0.0022, 0.055, 6).translate(0, 0.0275, 0), dark); st.rotation.z = -sx * 0.45;
      mesh(st, new THREE.SphereGeometry(0.0065, 10, 8), dark, [0, 0.056, 0]);
      for (const ly of [0.025, -0.005, -0.035]) {
        const lg = new THREE.Group(); lg.position.set(sx * 0.04, ly, 0.02); inner.add(lg); this.bugLegs.push(lg);
        const leg = mesh(lg, new THREE.CylinderGeometry(0.003, 0.0025, 0.04, 5).translate(0, 0.02, 0), dark); leg.rotation.z = -sx * (1.25 + ly * 6);
      }
    }
    b.visible = false; this.btn.add(b);
  }
  /** the BUG tag: pinned beside the button, swings down and settles; a thread runs from its hole to the bug */
  private buildTag() {
    const t = this.tag; t.position.set(0.37, -0.03, 0.03); this.btn.add(t);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18).translate(0.13, 0, 0), faceMat("hlBugTag", bugTagTex, 0.95, true)); m.position.z = 0.004; t.add(m);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.17).translate(0.135, 0, 0), C("#c8a868")); back.position.z = 0.001; back.castShadow = true; t.add(back);
    this.tagPin = mesh(this.btn, new THREE.SphereGeometry(0.022, 12, 8).scale(1, 1, 0.8), C("#e86aa8"), [0.37, -0.03, 0.045]);
    this.tagString = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 5).translate(0, 0.5, 0), basic("hlThread", () => ({ color: new THREE.Color("#4a3428") })));
    this.tagString.layers.set(NOINK); this.btn.add(this.tagString);
  }

  // ================================================================================================ COURT
  private buildCourt() {
    const o = CT.base, g = this.court, rb = new RB(o), X = CT.room.w / 2, Z = CT.room.d / 2, H = CT.room.h, PT = 2.4, BT = 3.6;
    const pan = TM("ctPanel", ctPanelTex), boards = TM("ctBoards", ctBoardsTex), plaster = TM("ctPlaster", ctPlasterTex), blond = TM("ctBlond", () => hlWoodTex("ctBlondW2", "#c98f4e"));
    const blondD = TM("ctBlondD", () => hlWoodTex("ctBlondDW2", "#96602e")), trim = C("#a8733c");
    rb.flatY(TM("ctFloor", ctFloorTex), -X, X, -Z, Z, 0, 1, 2, 2);
    rb.flatY(TM("ctCarpet", ctCarpetTex), -3.8, 3.8, -3.75, 1.5, 0.006, 1, 1.5, 1.5);
    for (const [a, b, c, d2] of [[-3.8, 3.8, -3.75, -3.6], [-3.8, 3.8, 1.35, 1.5], [-3.8, -3.65, -3.75, 1.5], [3.65, 3.8, -3.75, 1.5]]) rb.flatY(C("#6f8272"), a, b, c, d2, 0.008, 1, 1, 1);
    rb.flatY(TM("ctCeil", () => hlPlasterTex("ctCeil", "#f1ece2")), -X, X, -Z, Z, H, -1, 2, 2);
    // back wall: a plain, emblem-free boards field behind the bench; panelling either side; plaster + high windows above
    rb.wallZ(boards, -3.6, 3.6, 0, BT, -Z, 1, 1.2, 1.2);
    for (const [a, b] of [[-X, -3.6], [3.6, X]]) { rb.wallZ(pan, a, b, 0, PT, -Z, 1, 1.2, 2.4); rb.wallZ(boards, a, b, PT, BT, -Z, 1, 1.2, 1.2); }
    rb.wallZ(plaster, -X, X, BT, H, -Z, 1, 2, 2);
    rb.wallZ(pan, -X, X, 0, PT, Z, -1, 1.2, 2.4); rb.wallZ(plaster, -X, X, PT, H, Z, -1, 2, 2);
    for (const [x, f] of [[-X, 1], [X, -1]] as number[][]) { rb.wallX(pan, -Z, Z, 0, PT, x, f, 1.2, 2.4); rb.wallX(boards, -Z, Z, PT, BT, x, f, 1.2, 1.2); rb.wallX(plaster, -Z, Z, BT, H, x, f, 2, 2); }
    for (const [x0, z0, x1, z1] of [[-X, -Z, X, -Z + 0.05], [-X, Z - 0.05, X, Z], [-X, -Z, -X + 0.05, Z], [X - 0.05, -Z, X, Z]]) {
      rb.box(trim, x0, BT - 0.04, z0, x1, BT + 0.06, z1, false); rb.box(blondD, x0, 0, z0, x1, 0.1, z1, false); rb.box(trim, x0, PT - 0.02, z0, x1, PT + 0.02, z1, false);
    }
    rb.box(trim, -3.6, 0, -Z, -3.52, BT, -Z + 0.05, false); rb.box(trim, 3.52, 0, -Z, 3.6, BT, -Z + 0.05, false);
    // high windows: on the back wall (calm daylight above the bench) and the left wall (the sun shafts come from there)
    const winM = faceMat("ctWin", ctWindowTex, 1.05), frame = C("#e9e2d2");
    for (const x of [-4.6, -1.55, 1.55, 4.6]) { rb.panel(winM, 1.7, 0.85, x, 4.25, -Z + 0.01); rb.box(frame, x - 0.9, 3.78, -Z, x + 0.9, 3.83, -Z + 0.14); }
    for (const z of [-3.2, 0, 3.2]) { plane(g, winM, 1.9, 0.9, W(o, [-X + 0.01, 4.25, z]), Math.PI / 2); rb.box(frame, -X, 3.75, z - 1.0, -X + 0.14, 3.8, z + 1.0); }
    // ---- the dais + the raised bench (blond wood, long plain panels) + three tall leather chairs; NO gavel
    rb.box(blondD, -3.5, 0, -Z, 3.5, 0.5, -4.45); rb.box(trim, -3.5, 0.48, -4.47, 3.5, 0.52, -4.43);
    const bz0 = CT.bench.c[2] - 0.25, bz1 = CT.bench.c[2] + 0.25, bw = CT.bench.w / 2, btop = BENCH_TOP;
    rb.box(blondD, -bw, 0, bz0, bw, btop - 0.06, bz1);
    rb.panel(TM("ctBenchF", ctBenchTex), CT.bench.w - 0.1, btop - 0.25, 0, (btop - 0.06) / 2 + 0.05, bz1 + 0.002);
    rb.box(blond, -bw - 0.08, btop - 0.06, bz0 - 0.05, bw + 0.08, btop, bz1 + 0.08);
    for (const s of [-1, 1]) rb.box(blondD, s * bw - 0.05, 0, bz0 - 0.4, s * bw + 0.05, btop - 0.06, bz1);
    const leather = TM("ctLeather", ctLeatherTex);
    CT.judges.forEach((j, i) => {
      const h = i === 1 ? 1.5 : 1.36, cz = j[2] - 0.42;
      rb.box(leather, j[0] - 0.33, 0.95, cz - 0.07, j[0] + 0.33, 0.5 + h, cz + 0.07);
      rb.box(blondD, j[0] - 0.36, 0.5 + h, cz - 0.08, j[0] + 0.36, 0.5 + h + 0.06, cz + 0.08);
      // on the bench top: a small gooseneck microphone, papers, a water glass
      rb.box(C("#2a2a30"), j[0] + 0.26, btop, bz0 + 0.1, j[0] + 0.34, btop + 0.02, bz0 + 0.18); rb.seg(C("#2a2a30"), [j[0] + 0.3, btop + 0.02, bz0 + 0.14], [j[0] + 0.2, btop + 0.24, bz0 + 0.34], 0.006);
      rb.rbox(lam("si:ctPapersM", () => ({ map: papersTex() })), 0.24, 0.012, 0.3, j[0] - 0.12, btop + 0.006, bz0 + 0.2, 0.1 * (i - 1));
      rb.geo(cylY(0.03, 0.1, 14), basic("ctGlass", () => ({ color: new THREE.Color(0.82, 0.9, 0.94), transparent: true, opacity: 0.6 })), j[0] - 0.4, btop, bz0 + 0.12);
    });
    // ---- the clerk's desk below the bench (a 2005 CRT monitor, papers, a mic) + an empty chair
    rb.box(blondD, -1.3, 0, -3.55, 1.3, 0.92, -3.05); rb.box(blond, -1.36, 0.92, -3.6, 1.36, 0.96, -3.0);
    rb.panel(TM("ctClerkF", ctBenchTex), 2.5, 0.75, 0, 0.46, -3.049);
    rb.box(C("#d8d2c4"), -1.25, 0.96, -3.5, -0.9, 1.24, -3.2); rb.panel(basic("ctCrt", () => ({ color: new THREE.Color(0.32, 0.42, 0.46) })), 0.27, 0.2, -1.075, 1.1, -3.199);
    rb.rbox(lam("si:ctPapersM", () => ({ map: papersTex() })), 0.3, 0.02, 0.36, 0.4, 0.97, -3.3, 0.2);
    rb.box(C("#4a4a56"), 0.1, 0, -3.95, 0.55, 0.48, -3.6); rb.box(C("#4a4a56"), 0.1, 0.48, -4.0, 0.55, 0.95, -3.92);
    // ---- the EVIDENCE TABLE in the well: the broken CANCEL button on a little stand + its tag + the long receipt
    const et = CT.evidence, top = et.top, ex = et.c[0], ez = et.c[2];
    rb.box(blond, ex - 0.65, top - 0.05, ez - 0.36, ex + 0.65, top, ez + 0.36);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rb.box(blondD, ex + sx * 0.58 - 0.03, 0, ez + sz * 0.3 - 0.03, ex + sx * 0.58 + 0.03, top - 0.05, ez + sz * 0.3 + 0.03);
    rb.box(blondD, ex - 0.6, top - 0.16, ez - 0.32, ex + 0.6, top - 0.05, ez - 0.3);
    contact(g, [o[0] + ex, o[1] + 0.012, o[2] + ez], 1.6, 1.0, 0.3);
    // the stand: a block with a back support; the plate leans back on it
    rb.box(blondD, ex - 0.26, top, ez - 0.32, ex + 0.26, top + 0.06, ez - 0.06);
    rb.rbox(blondD, 0.4, 0.42, 0.035, ex, top + 0.22, ez - 0.31, 0, -0.42);
    { const pg = new THREE.Group(); pg.position.set(o[0] + ex, o[1] + top + 0.26, o[2] + ez - 0.22); pg.rotation.x = -0.42; g.add(pg);
      const P = 0.44;
      mesh(pg, new THREE.BoxGeometry(P, P, 0.035).translate(0, 0, -0.019), C("#d8ccb4"));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(P, P), faceMat("ctBtnPlate", btnPlateTex, 0.92)); face.position.z = 0.001; pg.add(face);
      const r = 0.135, dy = 0.043;
      mesh(pg, new THREE.TorusGeometry(0.146, 0.015, 8, 32), C("#3a3038"), [0, dy, 0.004]);
      // the cracked dome: two halves pushed apart (a dark gap between), a spring springing out, chips on the table
      mesh(pg, new THREE.CircleGeometry(0.13, 28), basic("ctGap", () => ({ color: new THREE.Color(0.08, 0.05, 0.06) })), [0, dy, 0.006]).layers.set(NOINK);
      for (const s of [-1, 1]) {
        const half = mesh(pg, new THREE.SphereGeometry(r, 28, 14, s > 0 ? Math.PI : 0, Math.PI, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.58), CE("#d42c26", "#ff3a2a", 0.15), [s * 0.05, dy + (s > 0 ? -0.012 : 0.008), 0.004]);
        half.rotation.z = s * -0.22; half.rotation.y = s * 0.38;
      }
      const helix = new THREE.CatmullRomCurve3(Array.from({ length: 48 }, (_, i) => { const t = i / 47, a = t * TAU * 6; return V(Math.cos(a) * 0.026 + t * 0.03, dy + 0.03 + t * 0.09 + Math.sin(a) * 0.01, 0.03 + t * 0.15); }));
      mesh(pg, new THREE.TubeGeometry(helix, 220, 0.0048, 6, false), C("#c8ccd4"));
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), basic("hlCrackM", () => ({ map: crackDecalTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })));
      crack.position.set(-0.07, dy + 0.02, 0.07); crack.rotation.set(-0.2, -0.5, 0); crack.layers.set(NOINK); pg.add(crack); }
    for (const [dx, dz, s, a] of [[0.3, 0.02, 0.035, 0.8], [0.36, -0.1, 0.022, 2.1], [-0.2, 0.04, 0.018, 4.0]]) rb.geo(new THREE.SphereGeometry(s, 12, 8, 0, Math.PI, 0, Math.PI / 2).scale(1, 0.5, 1), CE("#d42c26", "#ff3a2a", 0.15), ex + dx, top, ez + dz, a);
    // the evidence tag, tied to the stand, standing up on the table at its left
    rb.panel(faceMat("ctEvidTag", evidTagTex, 0.94, true), 0.24, 0.13, ex - 0.43, top + 0.075, ez - 0.1, 0.25, -0.3);
    rb.box(C("#c8b48a"), ex - 0.43 - 0.1, top, ez - 0.16, ex - 0.43 + 0.1, top + 0.012, ez - 0.09);
    rb.seg(C("#8a6a48"), [ex - 0.32, top + 0.1, ez - 0.12], [ex - 0.22, top + 0.2, ez - 0.22], 0.003, false, 4);
    // the receipt: a long paper strip along the table front, round the corner, over the edge and coiling on the floor
    { const pts: P3[] = [[0.3, 0.786, -0.98], [-0.1, 0.786, -0.98], [-0.36, 0.786, -0.97], [-0.48, 0.786, -0.92], [-0.53, 0.786, -0.86], [-0.55, 0.77, -0.83], [-0.56, 0.62, -0.8], [-0.57, 0.36, -0.79], [-0.6, 0.12, -0.74], [-0.66, 0.025, -0.6], [-0.78, 0.008, -0.32], [-0.95, 0.008, -0.02], [-1.1, 0.008, 0.25], [-1.2, 0.03, 0.42], [-1.2, 0.11, 0.42], [-1.13, 0.1, 0.36]];
      const nrm = (i: number) => (pts[i][1] > 0.78 || pts[i][1] < 0.02 ? V(0, 1, 0) : V(0, 0.15, 1).normalize());
      const pos: number[] = [], uv: number[] = [], idx: number[] = []; let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = V(...pts[Math.max(0, i - 1)]), b = V(...pts[Math.min(pts.length - 1, i + 1)]), t = b.sub(a).normalize(), s = new THREE.Vector3().crossVectors(t, nrm(i)).normalize();
        if (i > 0) acc += V(...pts[i]).distanceTo(V(...pts[i - 1]));
        for (const k of [-1, 1]) { pos.push(pts[i][0] + s.x * 0.08 * k, pts[i][1] + s.y * 0.08 * k, pts[i][2] + s.z * 0.08 * k); uv.push(k < 0 ? 1 : 0, 1 - acc / 3.2); }
        if (i > 0) { const q = (i - 1) * 2; idx.push(q, q + 1, q + 3, q, q + 3, q + 2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
      const rm = mesh(g, geo, lam("si:ctReceipt", () => ({ map: receiptTex(), side: THREE.DoubleSide })), [o[0] + ex, o[1], o[2] + ez + 0.0]);
      rm.position.set(o[0], o[1], o[2]); }
    // the slice that is torn off on "pay" (a 0.3 m piece with a TOTAL band)
    // fix4 (5): a big readable piece with its own face: "EXCHANGE PAYS PART" (who pays is SHOWN)
    { const sg = new THREE.PlaneGeometry(0.44, 0.5);
      this.slice = new THREE.Mesh(sg, lam("si:ctSlice", () => ({ map: sliceTex(), side: THREE.DoubleSide }))); this.slice.castShadow = true; g.add(this.slice); }
    // ---- counsel tables: the exchange's lawyer (right: a briefcase) and the other side (left: papers, a carafe)
    for (const [cx, side] of [[CT.lawyer[0], 1], [-2.4, -1]] as number[][]) {
      const cz = CT.lawyer[2] - 0.62, tp = 0.76;
      rb.box(blond, cx - 0.8, tp - 0.05, cz - 0.36, cx + 0.8, tp, cz + 0.36);
      rb.box(blondD, cx - 0.78, 0.1, cz - 0.34, cx + 0.78, tp - 0.05, cz - 0.3);
      for (const sx of [-1, 1]) rb.box(blondD, cx + sx * 0.74 - 0.04, 0, cz - 0.32, cx + sx * 0.74 + 0.04, tp - 0.05, cz + 0.32);
      rb.rbox(lam("si:ctPapersM", () => ({ map: papersTex() })), 0.26, 0.015, 0.34, cx - 0.35 * side, tp + 0.008, cz + 0.05, 0.25 * side);
      rb.box(C("#3e4250"), cx - 0.25, 0, CT.lawyer[2] + 0.28, cx + 0.25, 0.48, CT.lawyer[2] + 0.72); rb.box(C("#3e4250"), cx - 0.25, 0.48, CT.lawyer[2] + 0.62, cx + 0.25, 1.0, CT.lawyer[2] + 0.72);
      contact(g, [o[0] + cx, o[1] + 0.012, o[2] + cz], 1.9, 1.0, 0.28);
      if (side > 0) {   // the briefcase (dark brown leather, brass clasps, a handle)
        rb.box(C("#5a3424"), cx + 0.12, tp, cz - 0.12, cx + 0.58, tp + 0.11, cz + 0.2);
        for (const dx of [0.2, 0.5]) rb.box(C("#d8b45a"), cx + dx - 0.02, tp + 0.07, cz + 0.2, cx + dx + 0.02, tp + 0.1, cz + 0.205);
        rb.geo(new THREE.TorusGeometry(0.05, 0.012, 6, 16, Math.PI), C("#3a2016"), cx + 0.35, tp + 0.11, cz + 0.04, 0, -Math.PI / 2, 0);
      } else { rb.geo(cylY(0.05, 0.2, 16, false, 0.035), basic("ctGlass", () => ({ color: new THREE.Color(0.82, 0.9, 0.94), transparent: true, opacity: 0.6 })), cx + 0.4, tp, cz - 0.1); }
    }
    // a loose sheet on the lawyer's table that rustles in the fan's draft
    { const rg = new THREE.PlaneGeometry(0.22, 0.3, 4, 6).rotateX(-Math.PI / 2); this.rustle = new THREE.Mesh(rg, lam("si:ctRustle", () => ({ map: papersTex(), side: THREE.DoubleSide })));
      this.rustle.position.set(o[0] + CT.lawyer[0] - 0.05, o[1] + 0.775, o[2] + CT.lawyer[2] - 0.6); this.rustle.rotation.y = -0.3; this.rustle.castShadow = true; g.add(this.rustle);
      this.rustleBase = Float32Array.from((rg.attributes.position as THREE.BufferAttribute).array as Float32Array); }
    // ---- the bar railing (gate in the middle) + gallery benches behind it
    for (const [a, b] of [[-X + 0.1, -0.7], [0.7, X - 0.1]]) {
      rb.box(blond, a, 0.9, 1.66, b, 0.98, 1.78); rb.box(blondD, a, 0.08, 1.68, b, 0.16, 1.76);
      for (let x = a + 0.05; x <= b; x += 0.22) rb.box(blondD, x - 0.018, 0.16, 1.7, x + 0.018, 0.9, 1.74);
    }
    for (const z of [2.6, 3.7, 4.8]) for (const [a, b] of [[-5.6, -1.1], [1.1, 5.6]]) {
      rb.box(blond, a, 0.42, z - 0.22, b, 0.47, z + 0.2); rb.box(blond, a, 0.5, z + 0.18, b, 0.95, z + 0.24); rb.box(blondD, a, 0, z - 0.18, a + 0.06, 0.42, z + 0.18); rb.box(blondD, b - 0.06, 0, z - 0.18, b, 0.42, z + 0.18);
    }
    // ---- the wall CALENDAR (court-local CAL: hall_time.ts): backing board + 9 year pages 2005 .. 2013
    { const cc = CAL.c;
      plane(g, faceMat("ctCalBack", calBackTex, 0.93), CAL.w, CAL.h, W(o, [cc[0], cc[1], cc[2] + 0.002]));
      rb.box(C("#8a7a6a"), cc[0] - CAL.w / 2 - 0.01, cc[1] - CAL.h / 2 - 0.01, -Z, cc[0] + CAL.w / 2 + 0.01, cc[1] + CAL.h / 2 + 0.01, cc[2]);
      rb.geo(new THREE.SphereGeometry(0.018, 10, 8), C("#5a5060"), cc[0], cc[1] + CAL.h / 2 + 0.06, cc[2] + 0.01);
      for (let k = 0; k <= 8; k++) {
        const mat = new THREE.MeshBasicMaterial({ map: calPageTex(2005 + k), color: new THREE.Color(0.95, 0.95, 0.95), transparent: true });
        const pgeo = new THREE.PlaneGeometry(CAL.w - 0.02, 0.82).translate(0, -0.41, 0), m = new THREE.Mesh(pgeo, mat); m.renderOrder = 2 + (8 - k);
        const bk = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.86, 0.84, 0.8), side: THREE.BackSide, transparent: true })); bk.renderOrder = m.renderOrder; m.add(bk);
        g.add(m); this.pages.push({ m, mat });
      } }
    // ---- the ceiling fan (slow, whole cycles over the film)
    { const fp = W(o, [0.75, H, -2.6]), drop = 1.32; this.fan.position.set(fp[0], fp[1] - drop, fp[2]); g.add(this.fan);
      mesh(g, new THREE.CylinderGeometry(0.018, 0.018, drop, 8), C("#e8e2d6"), [fp[0], fp[1] - drop / 2, fp[2]]);
      mesh(this.fan, cylY(0.1, 0.1, 18, false, 0.08), C("#e8e2d6"), [0, -0.04, 0]);
      for (let k = 0; k < 4; k++) { const bl = mesh(this.fan, new THREE.BoxGeometry(0.72, 0.012, 0.15).translate(0.44, 0, 0), C("#d8bc8a"), [0, 0, 0]); bl.rotation.set(0.12, (k * TAU) / 4, 0); } }
    // ---- daylight: shafts from the left high windows, pane patches on the floor, dust motes
    // beams start where they enter the frame (upper left, as if from the high left windows) and run down to the floor
    const d = KC.clone().negate();
    for (const [x, y, z, w, k, ph] of [[-3.0, 4.6, 0.9, 1.2, 1, 0.4], [-3.3, 4.5, -1.0, 0.8, 0.75, 2.2], [-2.8, 4.7, 2.2, 0.6, 0.6, 3.6]])
      this.addShaft(g, W(o, [x, y, z]), d, y / -d.y + 0.4, w, new THREE.Color(0.17, 0.18, 0.21).multiplyScalar(k), ph);   // fix3: was (.42, .44, .5): the additive beams crossed the bench and blew the judges' faces out
    [-3.2, 0, 3.2].forEach((z) => {
      const t = 4.25 / -d.y, cx = -X + d.x * t, cz = z + d.z * t;
      if (cz > -Z + 0.6) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: panePatchTex(), color: new THREE.Color(0.2, 0.2, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
        pm.position.set(o[0] + cx, o[1] + 0.014, o[2] + cz); pm.rotation.y = Math.atan2(d.x, d.z); pm.layers.set(NOINK); pm.renderOrder = 3; g.add(pm); }
    });
    this.ctMotes = new Motes(g, 150, 23, CT.base, [-4.5, 0.6, -5], [2.5, 4.2, 2], new THREE.Color(0.85, 0.85, 0.82), 0.015, 0.05, 0.012);
    rb.done(g);
  }

  // ================================================================================================ POSE
  pose(ctx: SetCtx, L: Lighting) {
    const hall = ctx.shot.set === "hall";
    this.hall.visible = hall; this.court.visible = !hall;
    if (hall) this.poseHall(ctx, L); else this.poseCourt(ctx, L);
    this.poseShafts(ctx.cam);
  }

  private poseHall(ctx: SetCtx, L: Lighting) {
    const f = ctx.f, o = HL.base, cam = ctx.cam;
    // pools: the lanterns, the sun patches on the floor, a soft warm wash on the board
    L.pool(W(o, [0, 2.3, -4.4]), [0.1, 0.075, 0.04], 3.4);
    L.pool(W(o, [-1.05, 3.1, -2.9]), [0.18, 0.12, 0.05], 1.8); L.pool(W(o, [1.45, 3.3, -1.4]), [0.16, 0.11, 0.05], 1.7); L.pool(W(o, [-0.15, 3.4, 0.7]), [0.16, 0.11, 0.05], 1.8);
    L.pool(W(o, [2.4, 0.2, -0.4]), [0.3, 0.2, 0.08], 2.0); L.pool(W(o, [2.4, 0.2, -2.8]), [0.26, 0.18, 0.07], 2.0);
    // life: lanterns sway, the clock runs, the kettle steams, the flyer flutters, motes drift
    this.lanterns.forEach((l, i) => { l.rotation.z = 0.035 * vs(1.1 + i * 0.13, i * 1.7); l.rotation.x = 0.025 * vs(0.8 + i * 0.11, i * 2.3); });
    { const sec = 37 + VF / 30, mn = 14 + sec / 60, hr = 10 + mn / 60; const a = [-(hr / 12) * TAU, -(mn / 60) * TAU, -Math.floor(sec) / 60 * TAU]; this.hlHands.forEach((h, i) => (h.rotation.z = a[i])); }
    this.steam.forEach((s, i) => { const a = ((VF / 60 + i / 3) % 1 + 1) % 1; s.position.set(o[0] + TBL[0] + KET - 0.2 - 0.04 * a + 0.012 * Math.sin(VF * 0.07 + i * 2), o[1] + 0.72 + 0.18 + 0.28 * a, o[2] + TBL[1] - 0.03); s.scale.set(0.8 + 0.9 * a, 0.7 + 0.5 * a, 1); (s.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.sin(Math.PI * a); s.quaternion.copy(cam.quaternion); });
    { const pa = this.flyer.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) { const x = this.flyerBase[i * 3], y = this.flyerBase[i * 3 + 1], k = Math.max(0, -y / 0.56) ** 1.4; pa.setX(i, x + 0.01 * k * vs(2.3, y * 9)); pa.setZ(i, 0.07 * k * (0.6 + 0.4 * vs(3.1, x * 8 + y * 5)) * (0.7 + 0.3 * vs(0.9))); } pa.needsUpdate = true; this.flyer.geometry.computeVertexNormals(); }
    this.hlMotes.pose(ctx.vf / 30, 3);
    // ---- the SELLING! note: appears as the pin goes in (a bounce), the pin pushes home, each tab kicks the note
    const shown = f >= PIN_F; this.note.visible = shown;
    if (shown) {
      const u = clamp01((f - PIN_F) / 9), sc = 0.82 + 0.18 * outBack(u, 2.6);
      let kick = 0; for (let i = 0; i < TABS; i++) { const t = f - TAB_F(i); if (t >= 0 && t < 14) kick += 0.035 * Math.exp(-t / 4) * Math.sin(t * 1.3) * (i % 2 ? 1 : -1); }
      this.note.scale.set(sc, sc, 1); this.note.rotation.z = 0.03 + 0.06 * (1 - sm(u)) * Math.sin(u * 9) + kick;
      this.notePin.position.z = 0.02 + 0.07 * (1 - sm((f - (PIN_F - 3)) / 6));
      const base = [o[0] + NOTE.c[0], o[1] + NOTE.c[1], o[2] + NOTE.c[2]];
      this.tabs.forEach((t, i) => {
        const tw = NOTE.w / TABS, home = V(-NOTE.w / 2 + (i + 0.5) * tw, -NOTE.h / 2, 0.001), uu = (f - TAB_F(i)) / TAB_FLY;
        if (uu < 0) { t.visible = true; t.position.copy(home); t.rotation.set(0.12 * vs(2.6 + i * 0.2, i * 1.3) * 0.5, 0, 0.02 * vs(1.7, i)); t.scale.setScalar(1); return; }
        if (uu >= 1) { t.visible = false; return; }
        const tg = tabTarget(i), tl = V(tg[0] - base[0], tg[1] - base[1], tg[2] - base[2]).divideScalar(sc), e = 1 - (1 - uu) ** 2;
        t.visible = true; t.position.lerpVectors(home, tl, e); t.position.y += 0.18 * Math.sin(Math.PI * uu);
        t.rotation.set(1.1 * uu, 0.6 * uu, (i % 2 ? 1 : -1) * 2.4 * uu); t.scale.setScalar(1 - 0.35 * uu);
      });
    }
    // ---- the CANCEL button: pops on with a bounce, its four pins push home
    const bShown = f >= BTN_F; this.btn.visible = bShown;
    if (bShown) {
      const u = clamp01((f - BTN_F) / 10), sc = 0.7 + 0.3 * outBack(u, 2.4);
      this.btn.scale.set(sc, sc, 1); this.btn.rotation.z = -0.02 + 0.05 * (1 - sm(u)) * Math.sin(u * 8);
      this.btnPins.forEach((p, i) => (p.position.z = 0.02 + 0.08 * (1 - sm((f - BTN_F - 2 - i * 2) / 5))));
      this.poseBug(f);
    }
  }

  /** the bug's crawl: peeks out of the crack, crawls down the dome onto the plate, sits; the tag swings down by it */
  private poseBug(f: number) {
    const b = this.bug;
    const path: [number, number][] = [[0.06, 0.06], [0.11, 0.0], [0.17, -0.07], [0.24, -0.13]];
    const pAt = (s: number) => { const n = path.length - 1, x = clamp01(s) * n, i = Math.min(n - 1, Math.floor(x)), k = x - i; return [lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k)] as [number, number]; };
    b.visible = f >= BUG_PEEK;
    if (b.visible) {
      const em = sm((f - BUG_PEEK) / (BUG_OUT - BUG_PEEK)), s = sm((f - BUG_OUT) / (BUG_SIT - BUG_OUT)), [x, y] = pAt(s), [x2, y2] = pAt(Math.min(1, s + 0.05));
      const surf = this.domePt(x, y), n = this.domeN(x, y);
      let hd = new THREE.Vector3(x2 - x, y2 - y, 0); if (hd.lengthSq() < 1e-8) hd.set(0.5, -0.8, 0);
      hd.normalize();
      // once seated it turns its head up toward the tag (and the viewer's eye line)
      const turn = sm((f - BUG_SIT) / 12); hd.lerp(V(0.25, 1, 0).normalize(), turn).normalize();
      const tang = hd.clone().sub(n.clone().multiplyScalar(hd.dot(n))).normalize(), xa = new THREE.Vector3().crossVectors(tang, n).normalize();
      b.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, tang, n));
      const sink = -0.07 * (1 - em) + 0.004;
      b.position.copy(surf).addScaledVector(n, sink).addScaledVector(tang, -0.03 * (1 - em));
      const moving = f > BUG_OUT - 4 && f < BUG_SIT + 2;
      this.bugLegs.forEach((lg, i) => { lg.rotation.y = moving ? 0.5 * Math.sin(f * 1.6 + (i % 2) * Math.PI + i) : 0.06 * vs(3.3, i); });
      this.bugAnt.forEach((a, i) => { const tw = Math.max(0, Math.sin(f * 0.9 + i * 1.7)) ** 6; a.rotation.z = 0.18 * vs(5.1, i * 2) + 0.3 * tw * (i ? 1 : -1); a.rotation.x = 0.25 * vs(3.7, i) - 0.1; });
    }
    // the tag: pops in at TAG_F and swings down to rest (settled on "bug.")
    const tShown = f >= TAG_F; this.tag.visible = tShown; this.tagPin.visible = tShown; this.tagString.visible = tShown && b.visible;
    if (tShown) {
      const t = f - TAG_F, ap = clamp01(t / 5);
      this.tag.scale.setScalar(0.4 + 0.6 * outBack(ap, 2));
      this.tag.rotation.z = -0.13 - 0.9 * Math.exp(-t / 6) * Math.cos(t * 0.42) + 0.015 * vs(1.3);
      if (this.tagString.visible) {
        const hole = this.tag.position.clone().add(V(0, 0, 0.006)), tail = b.position.clone().add(V(0, 0, 0.02)), dd = tail.clone().sub(hole), Lr = dd.length();
        this.tagString.position.copy(hole); this.tagString.scale.set(1, Lr, 1); this.tagString.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize());
      }
    }
  }

  private poseCourt(ctx: SetCtx, L: Lighting) {
    const f = ctx.f, o = CT.base;
    L.pool(W(o, [0, 1.9, -4.6]), [0.1, 0.085, 0.06], 3.2); L.pool(W(o, [0, 1.0, -1.2]), [0.1, 0.09, 0.07], 1.6);
    L.pool(W(o, [-1.0, 0.2, -4.0]), [0.14, 0.14, 0.13], 2.4); L.pool(W(o, [-1.0, 0.2, -1.0]), [0.14, 0.14, 0.13], 2.4);
    L.pool(W(o, [CAL.c[0], CAL.c[1], CAL.c[2] + 0.5]), [0.06, 0.06, 0.06], 1.4);
    this.fan.rotation.y = vph(TAU * 0.32);
    this.ctMotes.pose(ctx.vf / 30, 5);
    // the rustling sheet (the fan's draft lifts its far corner)
    { const pa = this.rustle.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) { const x = this.rustleBase[i * 3], z = this.rustleBase[i * 3 + 2], k = clamp01((-z + 0.05) / 0.2) * clamp01((x + 0.11) / 0.22); pa.setY(i, 0.03 * k * k * (0.55 + 0.45 * vs(2.9, x * 7))); } pa.needsUpdate = true; this.rustle.geometry.computeVertexNormals(); }
    // the calendar: each year page flips up off the hanger and flutters down; "2013" stays from "ruled"
    const cc = CAL.c, hinge = V(o[0] + cc[0], o[1] + cc[1] + CAL.h / 2 - 0.08, o[2] + cc[2]);
    this.pages.forEach(({ m, mat }, k) => {
      const z0 = 0.004 + (8 - k) * 0.0012, tear = k < 8 ? CAL_F(k + 1) : 1e9, t = f - tear;
      m.position.set(hinge.x, hinge.y, hinge.z + z0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); mat.opacity = 1; ((m.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1;
      // still on the hanger: shown once the page above starts to lift (so it is there underneath)
      if (t < 0) { m.visible = k === 0 || f >= CAL_F(k) - 1; return; }
      if (t < 4) { m.visible = true; m.rotation.x = -1.2 * sm(t / 4); m.position.z += 0.02 * t; return; }
      const tt = t - 4, D = 16; if (tt > D) { m.visible = false; return; }
      const u = tt / D, sw = Math.sin(tt * 0.5 + k * 1.3), side = k % 2 ? 1 : -1;
      m.visible = true; m.position.set(hinge.x + side * (0.12 + 0.35 * u) + 0.06 * sw, hinge.y - 0.1 - 2.0 * u * u - 0.3 * u, hinge.z + 0.1 + 0.35 * u);
      m.rotation.set(-1.25 + 0.5 * Math.sin(tt * 0.4), 0.35 * sw, side * (0.3 + 0.9 * u)); m.scale.setScalar(1 - 0.25 * u);
      const op = 1 - sm((u - 0.5) / 0.5); mat.opacity = op; ((m.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = op;
    });
    // the receipt slice: flat on the table; torn on "pay", lifted and handed to the lawyer, held there
    { const u = sliceU(f), p = u <= 0 ? W(o, [SLICE_FROM[0], SLICE_FROM[1], SLICE_FROM[2]]) : slicePos(f);
      this.slice.position.set(p[0], p[1] - 0.3 * sm(u * 1.3), p[2]);   // fix4 (5): it hangs from his hand, BELOW his face
      const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2, "YXZ")), qUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, -2.45, 0.08, "YXZ"));
      this.slice.quaternion.copy(qFlat).slerp(qUp, sm(u * 1.6)); this.slice.scale.setScalar(0.4 + 0.6 * sm(u * 2.2));
      if (u >= 1) { this.slice.rotation.z += 0.04 * vs(1.6); this.slice.position.y += 0.008 * vs(1.1); } }
    void EVID; void add3;
  }
}

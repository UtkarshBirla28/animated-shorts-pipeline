// TRADING ROOM (owner TRADING): the Mizuho Securities trading room, Tokyo, December 2005. 18 x 13 x 3.3 m (plan.ts TR).
// Shell: grey-blue carpet tiles, a suspended ceiling grid with fluorescent troffers, cable trays, structural columns,
// the -z WINDOW WALL (piers, mullions, venetian blinds) onto three painted parallax layers of Tokyo towers + sky (a
// morning set and an evening set), plaster walls with doors (TR.door on +x, open onto a corridor in shot 12), a
// whiteboard, notice boards, filing cabinets, plants, a water cooler, exit signs, two wall clocks (TR.clocks: ~9:27 in
// the morning, ~18:40 in shot 12), two scrolling LED ticker strips. Four rows of desks (2-4 flat 2005 LCDs each with
// scrolling quotes / charts, curly-cord phones, paper stacks, binders, mugs, keyboards, chairs; TR.staff are seats),
// the hero desk's chair, its low partition and the printer at TR.printer (the DESK owner builds everything ON TR.desk).
// Light: the window light baked through the blinds (trading_gobo.ts) per state, desk lamps, a red rotating beacon on a
// pilaster (alarm_red), <= 9 light pools (the DESK owner uses the rest). Shot 12's bill props live in trading_bill.ts.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import type { Lighting, SetModule } from "./sets";
import { TR, type V3, type LightName } from "./plan";
import { lightMixAt } from "./story";
import { BEAT } from "./beats";
import { faceOnAt } from "./desk_beats";
import { RB, C, TM, basic, plane, contact, glowSprite, Motes, Batch, lam, cylY, hash, vs, vph, VF, TAU, sm, clamp01, glowCol, buildInk } from "./setkit";
import { NOINK } from "./ink";
import { LOOPN } from "./setkit";
import * as P from "./trading_paint";
import { floorDecal, wallXDecal, type Box, type Decal, WIN, glassRuns, mullions, BLINDS } from "./trading_gobo";
import { KEY_TRADING_AM, KEY_TRADING_EVE } from "./look_trading";
import { Bill } from "./trading_bill";

const o = TR.base;
const X = TR.room.w / 2, Z = TR.room.d / 2, H = TR.room.h;
const Wv = (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
/** desk rows (desk centre z; the seat is 0.75 m behind it, facing -z) and columns (desk centre x) */
export const ROWS = [-4.7, -1.95, TR.desk.c[2], 4.2];
export const COLS = [-7.9, -5.3, -2.6, 0, 2.7, 5.3, 7.9];
const DESK_D = 0.85, TOP = 0.74;
/** the desk lamps (x, z of the lamp foot) on the other desks: their warm pools are this module's */
const LAMPS: [number, number][] = [[-5.85, ROWS[1] - 0.2], [3.25, ROWS[0] - 0.2], [5.85, ROWS[2] - 0.22], [-2.05, ROWS[3] - 0.2], [-2.05, ROWS[1] - 0.2], [0.65, ROWS[0] - 0.2]];
/** the beacon's pilaster on the +z wall (seen behind the trader in the desk shots) */
const BEACON: V3 = [-3.9, 2.62, Z - 0.42];
type Shaft = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; p0: THREE.Vector3; d: THREE.Vector3; len: number; w: number; ph: number; eve: boolean };
const lightW = (id: number, f: number) => {
  const m = lightMixAt(id, f), w: Partial<Record<LightName, number>> = {};
  w[m.a] = (w[m.a] ?? 0) + (1 - m.k); w[m.b] = (w[m.b] ?? 0) + m.k;
  return { am: w.desk_am ?? 0, dim: w.desk_dim ?? 0, red: w.alarm_red ?? 0, eve: w.desk_eve ?? 0 };
};

export class TradingSet implements SetModule {
  readonly sets = ["trading" as const];
  readonly group = new THREE.Group();
  private occ: Box[] = [];
  private scrMats: THREE.MeshBasicMaterial[] = [];
  private amOnly: THREE.Object3D[] = []; private eveOnly: THREE.Object3D[] = [];
  private heroPart = new RB(TR.base); private heroPartG = new THREE.Group();
  private decAm: Decal[] = []; private decEve: Decal[] = [];
  private troffer!: THREE.MeshBasicMaterial; private trofferBad!: THREE.MeshBasicMaterial;
  private ledMats: THREE.MeshBasicMaterial[] = [];
  private hands: { g: THREE.Group; k: number }[] = [];
  private printerLed!: THREE.Mesh;
  private beacon!: THREE.Group; private beaconDome!: THREE.MeshBasicMaterial; private beams: THREE.Mesh[] = []; private beaconHalo!: THREE.Sprite;
  private lampBulbs: THREE.MeshBasicMaterial[] = [];
  private shafts: Shaft[] = [];
  private motesAm!: Motes; private motesEve!: Motes;
  private avia: THREE.Sprite[] = [];
  private door!: THREE.Group;
  private viewMats: { m: THREE.MeshBasicMaterial; eve: boolean }[] = [];
  private bill: Bill;
  private deskSpots: V3[] = [];

  constructor(_kit: Kit) {
    const rb = new RB(o), noInk = new Batch(), scr = new Batch();
    this.buildShell(rb, noInk);
    this.buildWindowWall(rb, noInk);
    this.buildDesks(rb, scr);
    this.buildProps(rb);
    rb.done(this.group); this.heroPart.done(this.heroPartG); this.group.add(this.heroPartG);
    buildInk(noInk, this.group, 0, false);
    buildInk(scr, this.group, 0, false);
    this.buildView();
    this.buildLife();
    this.buildLight();
    this.bill = new Bill(this.group, this.deskSpots);
  }

  // ================================================================================================ shell
  private buildShell(rb: RB, noInk: Batch) {
    const carpet = TM("trCarpetM", P.carpetTex), wall = TM("trWallM", () => P.plasterTex("trWall2", "#d4d0c6")), skirt = C("#3e434c"), ceil = TM("trCeilM", P.ceilTex);
    rb.flatY(carpet, -X, X, -Z, Z, 0, 1, 2, 2);
    rb.flatY(ceil, -X, X, -Z, Z, H, -1, 1.2, 1.2);
    // +z wall (with a second door at x -6.2), -x wall, +x wall around TR.door
    const dz = TR.door, dz0 = dz.c[2] - dz.w / 2, dz1 = dz.c[2] + dz.w / 2, d2x0 = -6.7, d2x1 = -5.7;
    rb.wallZ(wall, -X, d2x0, 0, H, Z, -1, 2, 2); rb.wallZ(wall, d2x1, X, 0, H, Z, -1, 2, 2); rb.wallZ(wall, d2x0, d2x1, 2.2, H, Z, -1, 2, 2);
    rb.wallX(wall, -Z, Z, 0, H, -X, 1, 2, 2);
    rb.wallX(wall, -Z, dz0, 0, H, X, -1, 2, 2); rb.wallX(wall, dz1, Z, 0, H, X, -1, 2, 2); rb.wallX(wall, dz0, dz1, dz.h, H, X, -1, 2, 2);
    // skirting
    rb.box(skirt, -X, 0, Z - 0.02, d2x0, 0.1, Z, false); rb.box(skirt, d2x1, 0, Z - 0.02, X, 0.1, Z, false);
    rb.box(skirt, -X, 0, -Z, -X + 0.02, 0.1, Z, false); rb.box(skirt, X - 0.02, 0, -Z, X, 0.1, dz0, false); rb.box(skirt, X - 0.02, 0, dz1, X, 0.1, Z, false);
    // door frames (+x door: open onto a corridor; +z door: closed) + exit signs
    const frame = C("#8a9098"), leaf = C("#9aa4ae");
    for (const zz of [dz0 - 0.06, dz1]) rb.box(frame, X - 0.1, 0, zz, X, dz.h + 0.06, zz + 0.06);
    rb.box(frame, X - 0.1, dz.h, dz0 - 0.06, X, dz.h + 0.07, dz1 + 0.06);
    for (const xx of [d2x0 - 0.06, d2x1]) rb.box(frame, xx, 0, Z - 0.1, xx + 0.06, 2.26, Z);
    rb.box(frame, d2x0 - 0.06, 2.2, Z - 0.1, d2x1 + 0.06, 2.27, Z);
    rb.box(leaf, d2x0, 0, Z - 0.06, d2x1, 2.2, Z - 0.02); rb.box(C("#c8ccd2"), d2x1 - 0.2, 1.0, Z - 0.1, d2x1 - 0.08, 1.04, Z - 0.06);
    plane(this.group, basic("trExitM", () => ({ map: P.exitTex(), color: new THREE.Color(1.15, 1.25, 1.15) })), 0.42, 0.16, Wv(X - 0.03, dz.h + 0.28, dz.c[2]), -Math.PI / 2);
    plane(this.group, basic("trExitM", () => ({ map: P.exitTex(), color: new THREE.Color(1.15, 1.25, 1.15) })), 0.42, 0.16, Wv((d2x0 + d2x1) / 2, 2.5, Z - 0.03), Math.PI);
    // the +x door leaf (hinged at dz1, swings into the corridor; posed per shot)
    this.door = new THREE.Group(); this.door.position.set(...Wv(X, 0, dz1)); this.group.add(this.door);
    { const lm = new THREE.Mesh(new THREE.BoxGeometry(0.04, dz.h - 0.01, dz.w - 0.02).translate(0.02, (dz.h - 0.01) / 2, -(dz.w - 0.02) / 2), leaf); lm.castShadow = true; lm.receiveShadow = true; this.door.add(lm);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.12).translate(-0.01, 1.0, -(dz.w - 0.14)), C("#c8ccd2")); this.door.add(hd); }
    // the corridor behind the +x door (warm-lit, painted end wall)
    { const cw = TM("trCorrM", () => P.plasterTex("trCorr", "#d8cfbe")), cx0 = X, cx1 = X + 3.2, cz0 = dz.c[2] - 1.3, cz1 = dz.c[2] + 1.3;
      rb.flatY(TM("trCorrFloorM", () => P.plasterTex("trCorrFloor", "#8c8478")), cx0, cx1, cz0, cz1, 0, 1, 2, 2); rb.flatY(cw, cx0, cx1, cz0, cz1, 2.6, -1, 2, 2);
      rb.wallZ(cw, cx0, cx1, 0, 2.6, cz0, 1, 2, 2); rb.wallZ(cw, cx0, cx1, 0, 2.6, cz1, -1, 2, 2); rb.wallX(cw, cz0, cz1, 0, 2.6, cx1, -1, 2, 2);
      const lt = glowSprite(this.group, Wv(X + 1.6, 2.5, dz.c[2]), 1.2, glowCol("#fff2d8", 0.5)); void lt;
      rb.box(basic("trCorrLamp", () => ({ color: new THREE.Color(1.5, 1.45, 1.3) })), X + 1.2, 2.58, dz.c[2] - 0.3, X + 2.0, 2.6, dz.c[2] + 0.3, false); }
    // structural columns (+ the beacon pilaster on the +z wall)
    const colM = TM("trColM", () => P.plasterTex("trCol", "#d6d6d0")), guard = C("#9aa0a8");
    for (const [x, z] of [[-4.0, -3.0], [4.0, -3.0], [4.0, 4.4], [-4.0, 4.4]] as number[][]) {
      rb.box(colM, x - 0.28, 0, z - 0.28, x + 0.28, H, z + 0.28); rb.box(skirt, x - 0.29, 0, z - 0.29, x + 0.29, 0.1, z + 0.29);
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rb.box(guard, x + sx * 0.28 - 0.015, 0.1, z + sz * 0.28 - 0.015, x + sx * 0.28 + 0.015, 1.4, z + sz * 0.28 + 0.015);
      this.occ.push([x - 0.28, 0, z - 0.28, x + 0.28, H, z + 0.28]);
    }
    rb.box(colM, BEACON[0] - 0.3, 0, Z - 0.5, BEACON[0] + 0.3, H, Z); rb.box(skirt, BEACON[0] - 0.31, 0, Z - 0.51, BEACON[0] + 0.31, 0.1, Z);
    // troffers in the ceiling grid + two cable trays on rods
    this.troffer = basic("trTrofferM", () => ({ map: P.trofferTex(), color: new THREE.Color(1.3, 1.32, 1.34) }));
    this.trofferBad = basic("trTrofferBadM", () => ({ map: P.trofferTex(), color: new THREE.Color(1.3, 1.32, 1.34) }));
    let n = 0;
    for (const x of [-7.8, -5.2, -2.6, 0, 2.6, 5.2, 7.8]) for (const z of [-5.1, -3.3, -0.3, 2.4, 5.4]) {
      const m = n++ === 23 ? this.trofferBad : this.troffer;
      noInk.add(new THREE.PlaneGeometry(0.6, 1.2).rotateX(Math.PI / 2), m, new THREE.Matrix4().makeTranslation(o[0] + x, o[1] + H - 0.005, o[2] + z));
    }
    const tray = C("#9aa0a6"), cab = [C("#2a5ac8"), C("#d8d4c8"), C("#c84a2a"), C("#3a3e46")];
    for (const z of [-3.0, -0.1]) {
      const x0 = -8.6, x1 = 8.6, y = 2.98;
      rb.box(tray, x0, y, z - 0.15, x1, y + 0.012, z + 0.15); rb.box(tray, x0, y, z - 0.16, x1, y + 0.08, z - 0.15); rb.box(tray, x0, y, z + 0.15, x1, y + 0.08, z + 0.16);
      for (let k = 0; k < 4; k++) rb.seg(cab[k], [x0, y + 0.03, z - 0.1 + k * 0.06], [x1, y + 0.03, z - 0.1 + k * 0.06], 0.014, true, 6);
      for (let x = x0 + 0.4; x < x1; x += 2.2) for (const s of [-1, 1]) rb.seg(C("#5a5e66"), [x, y, z + s * 0.16], [x, H, z + s * 0.16], 0.006, false, 4);
    }
  }

  // ================================================================================================ window wall
  private buildWindowWall(rb: RB, noInk: Batch) {
    const zw = WIN.z, wall = TM("trWallM", () => P.plasterTex("trWall2", "#d4d0c6")), alu = C("#a8aeb6"), aluD = C("#6e747c");
    // the HVAC sill cabinet under the glass, the sill top
    rb.wallZ(TM("trSillM", P.sillTex), -X, X, 0, WIN.y0 - 0.04, -Z + 0.32, 1, 1.0, WIN.y0 - 0.04);
    rb.box(C("#b8bcc2"), -X, WIN.y0 - 0.04, -Z, X, WIN.y0, -Z + 0.36);
    rb.box(C("#5a626c"), -X, 0, -Z, X, 0.06, -Z + 0.33, false);
    rb.flatY(C("#7e868e"), -X, X, -Z, -Z + 0.32, WIN.y0 - 0.04, 1, 1, 1);
    // piers (one carries the clock), the header over the glass, side returns
    for (const [a, b] of WIN.piers) { rb.box(wall, a, 0, -Z, b, H, -Z + 0.38); this.occ.push([a, 0, -Z, b, H, -Z + 0.38]); }
    rb.wallZ(wall, -X, X, WIN.y1, H, zw + 0.02, 1, 2, 2);
    rb.box(wall, -X, 0, -Z, TR.windows.x0, H, -Z + 0.38); rb.box(wall, TR.windows.x1, 0, -Z, X, H, -Z + 0.38);
    // mullions + transoms (aluminium) at the glass line
    for (const x of mullions()) rb.box(alu, x - WIN.mullW / 2, WIN.y0, zw - 0.02, x + WIN.mullW / 2, WIN.y1, zw + 0.06);
    for (const [a, b] of glassRuns()) { rb.box(alu, a, WIN.y0 - 0.02, zw - 0.02, b, WIN.y0 + 0.04, zw + 0.07); rb.box(alu, a, WIN.y1 - 0.05, zw - 0.02, b, WIN.y1 + 0.02, zw + 0.07);
      rb.box(aluD, a, WIN.y1 - 0.18, zw + 0.02, b, WIN.y1 - 0.05, zw + 0.16); }
    // venetian blinds per bay: morning (raised / half down) and evening (down, slats open); no ink (slat line noise)
    const bays: [number, number][] = []; for (const [a, b] of glassRuns()) { const n = Math.max(1, Math.round((b - a) / 1.45)), w = (b - a) / n; for (let k = 0; k < n; k++) bays.push([a + k * w + WIN.mullW / 2, a + (k + 1) * w - WIN.mullW / 2]); }
    const stackM = lam("si:trBlindStack", () => ({ map: P.blindStackTex() }));
    for (const eve of [false, true]) {
      const st = BLINDS[eve ? "eve" : "am"], b = new Batch(), slat = lam("si:trBlind" + (eve ? "E" : "M"), () => ({ map: P.blindTex(st.duty), alphaTest: 0.5, side: THREE.DoubleSide }));
      bays.forEach(([a, c], i) => {
        const d = st.drop(i), zz = zw + 0.13, h = st.top - d;
        if (h > 0.02) {
          const g = new THREE.PlaneGeometry(c - a, h), uv = g.attributes.uv as THREE.BufferAttribute;
          for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * 4, (uv.getY(q) * h) / st.pitch);
          b.add(g, slat, new THREE.Matrix4().makeTranslation(o[0] + (a + c) / 2, o[1] + (d + st.top) / 2, o[2] + zz));
          b.add(new THREE.BoxGeometry(c - a, 0.025, 0.035), C("#c8c6be"), new THREE.Matrix4().makeTranslation(o[0] + (a + c) / 2, o[1] + d, o[2] + zz));
        }
        b.add(new THREE.BoxGeometry(c - a, WIN.y1 - st.top, 0.05), stackM, new THREE.Matrix4().makeTranslation(o[0] + (a + c) / 2, o[1] + (st.top + WIN.y1) / 2, o[2] + zz));
        // the wand + cord
        b.add(new THREE.CylinderGeometry(0.005, 0.005, 0.7), C("#d8d6ce"), new THREE.Matrix4().makeTranslation(o[0] + c - 0.06, o[1] + st.top - 0.4, o[2] + zz + 0.03));
      });
      const g = new THREE.Group(); buildInk(b, g, 0, true); this.group.add(g); (eve ? this.eveOnly : this.amOnly).push(g);
    }
    void noInk;
    // the window clock on the pier (TR.clocks[0]) and the +z wall clock (TR.clocks[1])
    for (const [k, cl] of TR.clocks.entries()) {
      // the window clock hangs on its pier's face (the pier stands 0.38 m proud of the glass line): c.z moves 0.33 m in
      const c: V3 = k === 0 ? [cl.c[0], cl.c[1], -Z + 0.38 + 0.03] : cl.c, fz = cl.face, R = 0.42;
      rb.geo(new THREE.CylinderGeometry(R, R, 0.06, 40).rotateX(Math.PI / 2), C("#3a3e46"), c[0], c[1], c[2] - fz * 0.0);
      plane(this.group, basic("trClockFace", () => ({ map: P.clockTex(), transparent: true, alphaTest: 0.1, color: new THREE.Color(0.96, 0.96, 0.94) })), 2 * R, 2 * R, Wv(c[0], c[1], c[2] + fz * 0.035), fz > 0 ? 0 : Math.PI);
      const g = new THREE.Group(); g.position.set(...Wv(c[0], c[1], c[2] + fz * 0.04)); g.rotation.y = fz > 0 ? 0 : Math.PI; this.group.add(g);
      const mk = (L: number, w: number, col: string, dz2: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, L, 0.006).translate(0, L / 2 - 0.05, dz2), basic("trHand" + col, () => ({ color: new THREE.Color(col) }))); m.layers.set(NOINK); const p = new THREE.Group(); p.add(m); g.add(p); return p; };
      const hh = mk(R * 0.55, 0.035, "#15171c", 0.004), mm = mk(R * 0.8, 0.024, "#15171c", 0.008), ss = mk(R * 0.86, 0.008, "#c4201a", 0.012);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16).rotateX(Math.PI / 2), basic("trHandCap", () => ({ color: new THREE.Color("#15171c") }))); cap.position.z = 0.016; g.add(cap);
      this.hands.push({ g: hh, k: 0 }, { g: mm, k: 1 }, { g: ss, k: 2 }); void k;
    }
  }

  // ================================================================================================ desks
  private buildDesks(rb: RB, scr: Batch) {
    const top = TM("trDeskM", P.deskTex), metal = C("#7c828c"), edge = C("#4a4e56"), fab = TM("trFabricM", () => P.fabricTex("trFabric", "#c98c5c")), alu = C("#b4b8be");
    const bez = C("#2c2f36"), bezS = C("#a6aab2"), kb = TM("trKeysM", P.keyboardTex), phoneM = C("#3a3d44"), phoneL = C("#d8d6ce");
    const paper = TM("trPaperSideM", P.paperSideTex), chairF = TM("trChairFM", P.chairTex), chairD = C("#24262c");
    for (let k = 0; k < 6; k++) this.scrMats.push(basic("trScrM" + k, () => ({ map: P.screenTex(k), color: new THREE.Color(1, 1, 1) })));
    const seat = (x: number, z: number): V3 => { for (const s of TR.staff) if (Math.abs(s[0] - x) < 0.6 && Math.abs(s[2] - (z + 0.75)) < 0.3) return s; return [x + (hash(x * 3 + z) - 0.5) * 0.3, 0, z + 0.75 + (hash(x + z * 5) - 0.5) * 0.2]; };
    // desks: rows x columns, the hero desk (DESK owner) and the door's approach left out
    for (const [ri, z] of ROWS.entries()) for (const [ci, x] of COLS.entries()) {
      const hero = ri === 2 && ci === 3; if (ri === 3 && ci === 6) continue;
      const w = Math.abs(x) > 7 ? 1.6 : 1.8, x0 = x - w / 2, x1 = x + w / 2, z0 = z - DESK_D / 2, z1 = z + DESK_D / 2, seed = ri * 17 + ci * 5;
      if (!hero) {
        rb.box(top, x0, TOP - 0.035, z0, x1, TOP, z1); rb.box(edge, x0, TOP - 0.04, z1 - 0.005, x1, TOP - 0.002, z1 + 0.005);
        for (const sx of [x0 + 0.02, x1 - 0.05]) rb.box(metal, sx, 0, z0 + 0.03, sx + 0.03, TOP - 0.035, z1 - 0.03);
        rb.box(metal, x0 + 0.05, 0.28, z0 + 0.03, x1 - 0.05, TOP - 0.035, z0 + 0.05);
        this.occ.push([x0, TOP - 0.035, z0, x1, TOP, z1], [x0 + 0.05, 0.28, z0 + 0.03, x1 - 0.05, TOP - 0.035, z0 + 0.05]);
        if (ri === 2 || ri === 3) for (const fx of [0.25, 0.5, 0.75]) this.deskSpots.push([x0 + w * fx, TOP, z + 0.1]);
      }
      // the low fabric partition along the desk's back edge (the hero desk's too)
      { const pz = z0 - 0.035, ph = hero ? 1.06 : 1.0, pb = hero ? this.heroPart : rb;   // fix2: the hero desk's partition is its own group (hidden for the front lens of shots 1 / 14)
        pb.box(fab, x0, TOP - 0.3, pz, x1, ph, pz + 0.035); pb.box(alu, x0 - 0.01, ph, pz - 0.005, x1 + 0.01, ph + 0.02, pz + 0.04);
        for (const sx of [x0 - 0.015, x1 - 0.015]) pb.box(alu, sx, 0, pz - 0.005, sx + 0.03, ph, pz + 0.04);
        this.occ.push([x0, TOP - 0.3, pz, x1, ph + 0.02, pz + 0.04]); }
      // the chair (staff seats at TR.staff; the hero's at TR.trader)
      const s = hero ? TR.trader : seat(x, z), ry = hero ? 0 : TR.staff.includes(s) ? 0 : (hash(seed * 1.7) - 0.5) * 0.9;
      this.chair(rb, chairF, chairD, s[0], s[2], ry, hero);
      if (hero) continue;
      // monitors: 2-4 LCDs (4 = a 2 x 2 bank on a pole), screens face +z toward the seat
      const nm = ri === 3 && ci === 3 ? 3 : 2 + Math.floor(hash(seed * 2.3 + 1) * 3), mz = z0 + 0.16, silver = hash(seed * 4.1) < 0.45;
      const mons: [number, number, number][] = nm === 4 ? [[-0.2, 0.99, 0.08], [0.2, 0.99, -0.08], [-0.2, 1.32, 0.08], [0.2, 1.32, -0.08]]
        : nm === 3 ? [[-0.42, 1.02, 0.32], [0, 1.02, 0], [0.42, 1.02, -0.32]] : [[-0.22, 1.02, 0.12], [0.22, 1.02, -0.12]];
      const mx = x + (hash(seed * 5.3) - 0.5) * 0.2;
      for (const [k, [dx, y, a]] of mons.entries()) {
        const cx = mx + dx, cz = mz + Math.abs(dx) * 0.18;
        this.monitor(rb, scr, silver ? bezS : bez, cx, y, cz, a, Math.floor(hash(seed * 7 + k * 3.1) * 6), seed + k, nm === 4);
        this.occ.push([cx - 0.2, y - 0.17, cz - 0.07, cx + 0.2, y + 0.17, cz + 0.01]);
      }
      if (nm === 4) { rb.box(metal, mx - 0.02, TOP, mz - 0.09, mx + 0.02, 1.45, mz - 0.05); rb.box(metal, mx - 0.13, TOP, mz - 0.14, mx + 0.13, TOP + 0.02, mz); }
      // keyboard + mouse, phone (curly cord), papers, binders, a mug; a PC tower under the desk
      const kx = x + (hash(seed * 1.9) - 0.5) * 0.2;
      rb.rbox(kb, 0.44, 0.025, 0.15, kx, TOP + 0.0125, z1 - 0.2, (hash(seed) - 0.5) * 0.12);
      rb.geo(new THREE.SphereGeometry(0.028, 10, 8), C("#2e3138"), kx + 0.33, TOP + 0.012, z1 - 0.2, 0, 0, 0, [1, 0.5, 1.5]);
      this.phone(rb, phoneM, phoneL, x0 + 0.24, z1 - 0.28, 0.25 - hash(seed * 3.7) * 0.4);
      const nP = 1 + Math.floor(hash(seed * 6.1) * 3);
      for (let k = 0; k < nP; k++) { const h = 0.02 + hash(seed * 9 + k) * 0.08, px = x1 - 0.3 - k * 0.26, pz = z + (hash(seed + k * 2.2) - 0.5) * 0.16, ry2 = (hash(seed * 3 + k) - 0.5) * 0.4;
        rb.rbox(paper, 0.22, h, 0.3, px, TOP + h / 2, pz, ry2); rb.panel(TM("trPageM" + ((seed + k) % 4), () => P.pageTex((seed + k) % 4)), 0.21, 0.29, px, TOP + h + 0.001, pz, ry2, -Math.PI / 2); }
      if (hash(seed * 8.3) < 0.7) { const nb = 3 + Math.floor(hash(seed * 2.9) * 4); for (let k = 0; k < nb; k++) rb.rbox(TM("trBinderM" + ((seed + k) % 6), () => P.binderTex((seed + k) % 6)), 0.055, 0.3, 0.26, x0 + 0.1 + k * 0.06, TOP + 0.15, z0 + 0.2, 0, 0, k === nb - 1 ? 0.2 : 0); }
      if (hash(seed * 4.7) < 0.75) { const ux = kx + 0.55 * (hash(seed * 7.7) < 0.5 ? -1 : 1), uz = z1 - 0.32; rb.geo(cylY(0.038, 0.095, 16), C(["#f4f2ea", "#2a5ac8", "#c8402a", "#f4f2ea"][seed % 4]), ux, TOP, uz);
        rb.geo(new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), C("#f4f2ea"), ux + 0.04, TOP + 0.05, uz, 0, 0, -Math.PI / 2);
        rb.geo(new THREE.CircleGeometry(0.033, 14).rotateX(-Math.PI / 2), C("#3a2414"), ux, TOP + 0.085, uz); }
      rb.box(C(hash(seed * 3.3) < 0.5 ? "#d4d0c4" : "#2c2e34"), x1 - 0.45, 0, z - 0.25, x1 - 0.25, 0.44, z + 0.2);
      // fix2 (audit 3): a small potted plant on about half the desks (green among the screens, in every row)
      if (hash(seed * 5.9 + 2) < 0.55) { const px = x1 - 0.14, pz = z0 + 0.24;
        rb.geo(cylY(0.055, 0.1, 14, false, 0.07), C("#c8643a"), px, TOP, pz);
        for (let k = 0; k < 9; k++) { const a = hash(seed * 3 + k) * TAU, r = 0.03 + 0.07 * hash(seed + k * 1.7), hy = TOP + 0.13 + 0.16 * hash(k * 2.3 + seed);
          rb.geo(new THREE.SphereGeometry(0.05, 7, 5), C(["#3e8a3a", "#4e9a42", "#2e7a34", "#62aa4a"][k % 4]), px + Math.cos(a) * r, hy, pz + Math.sin(a) * r, a, 0.5, 0, [1.5, 0.5, 0.85]); } }
      contact(this.group, Wv(x, 0.004, z), w + 0.3, DESK_D + 0.3, 0.32);
    }
    // the hero desk's floor: a clear chair mat (the desk itself is the DESK owner's)
    rb.box(basic("trChairMat", () => ({ color: new THREE.Color(0.62, 0.66, 0.72), transparent: true, opacity: 0.35 })), -0.7, 0.0, TR.desk.c[2] + 0.45, 0.7, 0.006, TR.desk.c[2] + 1.55, false);
    contact(this.group, Wv(TR.trader[0], 0.006, TR.trader[2]), 0.8, 0.8, 0.35);
    // desk lamps on five other desks (their warm pools are this module's)
    const lampM = C("#2e3036");
    for (const [lx, lz] of LAMPS) {
      rb.geo(cylY(0.07, 0.02, 18), lampM, lx, TOP, lz); rb.seg(lampM, [lx, TOP + 0.02, lz], [lx + 0.06, TOP + 0.3, lz + 0.05], 0.009); rb.seg(lampM, [lx + 0.06, TOP + 0.3, lz + 0.05], [lx + 0.22, TOP + 0.36, lz + 0.14], 0.009);
      rb.geo(new THREE.ConeGeometry(0.075, 0.11, 18, 1, true), lam("si:trLampShade", () => ({ color: "#2e3036", side: THREE.DoubleSide })), lx + 0.24, TOP + 0.33, lz + 0.15, 0, 0.35, 0);
      const bm = basic("trLampBulb" + this.lampBulbs.length, () => ({ color: new THREE.Color(1.8, 1.4, 0.9) })); this.lampBulbs.push(bm);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), bm); b.position.set(...Wv(lx + 0.245, TOP + 0.29, lz + 0.165)); b.layers.set(NOINK); this.group.add(b);
    }
    // the printer at TR.printer: a stand + a 2005 office laser printer, its front slot faces +z (the bill's receipt)
    { const [px, , pz] = TR.printer, st = C("#5e646e"), bodyM = C("#d6d4cc"), dk = C("#4a4e56");
      rb.box(st, px - 0.3, 0, pz - 0.27, px + 0.3, 0.6, pz + 0.27); rb.box(dk, px - 0.28, 0.06, pz + 0.27, px + 0.28, 0.55, pz + 0.275);
      rb.box(bodyM, px - 0.26, 0.6, pz - 0.22, px + 0.26, 0.84, pz + 0.24); rb.box(dk, px - 0.2, 0.84, pz - 0.18, px + 0.2, 0.86, pz + 0.12);
      rb.box(dk, px - 0.2, 0.845, pz + 0.24, px + 0.2, 0.875, pz + 0.27); rb.box(C("#8a8e96"), px + 0.12, 0.74, pz + 0.24, px + 0.24, 0.82, pz + 0.245);
      this.printerLed = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.004), basic("trPrinterLed", () => ({ color: new THREE.Color(0.4, 2.2, 0.6) })));
      this.printerLed.position.set(...Wv(px + 0.2, 0.8, pz + 0.248)); this.printerLed.layers.set(NOINK); this.group.add(this.printerLed);
      contact(this.group, Wv(px, 0.005, pz), 0.9, 0.8, 0.4);
      this.occ.push([px - 0.3, 0, pz - 0.27, px + 0.3, 0.86, pz + 0.27]); }
    // the hero desk's things as occluders for the baked light (the DESK owner's monitors / counter)
    { const d = TR.desk, s = TR.screen; this.occ.push([d.c[0] - d.w / 2, d.top - 0.04, d.c[2] - d.d / 2, d.c[0] + d.w / 2, d.top, d.c[2] + d.d / 2]);
      this.occ.push([s.c[0] - s.w / 2, s.c[1] - s.h / 2, s.c[2] - 0.08, s.c[0] + s.w / 2, TR.counter.c[1] + 0.1, s.c[2]]);
      for (const p of TR.sideScreens) this.occ.push([p[0] - 0.2, p[1] - 0.16, p[2] - 0.08, p[0] + 0.2, p[1] + 0.16, p[2]]); }
  }
  /** a 2005 flat LCD (4:3): bezel, screen (unlit, scrolling page k), neck + foot */
  private monitor(rb: RB, scr: Batch, bez: THREE.Material, x: number, y: number, z: number, ry: number, k: number, seed: number, pole: boolean) {
    const nx = Math.sin(ry), nz = Math.cos(ry);
    rb.rbox(bez, 0.41, 0.33, 0.045, x - nx * 0.024, y, z - nz * 0.024, ry);
    rb.rbox(C("#24262c"), 0.3, 0.22, 0.03, x - nx * 0.06, y - 0.01, z - nz * 0.06, ry);
    if (!pole || y < 1.1) { const by = pole ? y : TOP; if (!pole) { rb.rbox(C("#3a3d44"), 0.05, y - 0.16 - TOP, 0.03, x - nx * 0.07, (y - 0.16 + TOP) / 2, z - nz * 0.07, ry); rb.rbox(C("#3a3d44"), 0.24, 0.02, 0.18, x - nx * 0.08, TOP + 0.01, z - nz * 0.08, ry); } void by; }
    const g = new THREE.PlaneGeometry(0.37, 0.285), uv = g.attributes.uv as THREE.BufferAttribute, uo = hash(seed * 1.3) * 0.5, vo = hash(seed * 2.7);
    for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * 0.62 + uo, uv.getY(q) * 0.48 + vo);
    scr.add(g, this.scrMats[k], new THREE.Matrix4().compose(new THREE.Vector3(o[0] + x + nx * 0.0, o[1] + y, o[2] + z + nz * 0.0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
  }
  /** an office chair facing -z (rotated by ry): five-star base, gas lift, seat, backrest, arms */
  private chair(rb: RB, fabM: THREE.Material, dk: THREE.Material, x: number, z: number, ry: number, low = false) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.3, [ex, ez] = L(Math.cos(a) * 0.3, Math.sin(a) * 0.3); rb.seg(dk, [x, 0.08, z], [ex, 0.05, ez], 0.018, true, 6); rb.geo(new THREE.SphereGeometry(0.025, 8, 6), dk, ex, 0.025, ez); }
    rb.seg(C("#8a8e96"), [x, 0.08, z], [x, 0.42, z], 0.022, true, 8);
    const [sx, sz] = L(0, 0.02); rb.geo(new THREE.BoxGeometry(0.48, 0.07, 0.46), fabM, sx, 0.46, sz, ry);
    const [bx, bz] = L(0, 0.26); if (low) rb.geo(new THREE.BoxGeometry(0.42, 0.24, 0.06), fabM, bx, 0.66, bz, ry, -0.1); else rb.geo(new THREE.BoxGeometry(0.44, 0.5, 0.06), fabM, bx, 0.82, bz, ry, -0.12);
    const [kx, kz] = L(0, 0.27); rb.seg(dk, [kx, 0.46, kz], [kx, 0.6, kz], 0.02, true, 6);
    for (const sd of [-1, 1]) { const [ax, az] = L(sd * 0.25, 0.0), [ax2, az2] = L(sd * 0.25, 0.12); rb.seg(dk, [ax2, 0.48, az2], [ax2, 0.66, az2], 0.012, true, 6); rb.geo(new THREE.BoxGeometry(0.05, 0.025, 0.26), dk, ax, 0.67, az, ry); }
    this.occ.push([x - 0.25, 0.42, z - 0.25, x + 0.25, 1.06, z + 0.3]);
    contact(this.group, Wv(x, 0.005, z), 0.75, 0.75, 0.3);
  }
  /** a desk phone with a curly cord from the handset to the base (drooping over the desk front) */
  private phone(rb: RB, m: THREE.Material, light: THREE.Material, x: number, z: number, ry: number) {
    const c = Math.cos(ry), s = Math.sin(ry), L = (lx: number, ly: number, lz: number) => new THREE.Vector3(o[0] + x + lx * c + lz * s, o[1] + ly, o[2] + z - lx * s + lz * c);
    rb.geo(new THREE.BoxGeometry(0.2, 0.05, 0.22), m, x, TOP + 0.025, z, ry);
    { const p = L(0, TOP + 0.06, 0.04); rb.geo(new THREE.BoxGeometry(0.15, 0.02, 0.12), light, p.x - o[0], p.y - o[1], p.z - o[2], ry, -0.22); }
    { const p = L(0, TOP + 0.085, -0.06); rb.geo(new THREE.CapsuleGeometry(0.022, 0.15, 4, 8).rotateZ(Math.PI / 2), m, p.x - o[0], p.y - o[1], p.z - o[2], ry); }
    // the coil: a helix around a drooping spine (handset end -> over the desk front -> back to the base side)
    const spine = new THREE.CatmullRomCurve3([L(-0.1, TOP + 0.08, -0.06), L(-0.16, TOP + 0.02, 0.02), L(-0.18, TOP - 0.02, 0.2), L(-0.12, TOP - 0.16, 0.26), L(-0.04, TOP - 0.08, 0.24), L(-0.02, TOP + 0.01, 0.13), L(-0.08, TOP + 0.03, 0.08)]);
    const up = new THREE.Vector3(0, 1, 0), turns = 46, rr = 0.009;
    class Coil extends THREE.Curve<THREE.Vector3> {
      constructor() { super(); }
      getPoint(t: number, out = new THREE.Vector3()) {
        const p = spine.getPoint(t), d = spine.getTangent(t), n = new THREE.Vector3().crossVectors(d, up); if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
        const b = new THREE.Vector3().crossVectors(d, n).normalize(), a = t * turns * TAU;
        return out.copy(p).addScaledVector(n, Math.cos(a) * rr).addScaledVector(b, Math.sin(a) * rr);
      }
    }
    const tube = new THREE.TubeGeometry(new Coil(), 220, 0.0032, 4, false);
    rb.cast.add(tube, m);
  }

  // ================================================================================================ room props
  private buildProps(rb: RB) {
    const cab = C("#a8aeb6"), cabD = C("#7e848c"), handle = C("#d8dce0");
    // filing cabinets: along the +z wall (right half) and the +x wall between the rows
    const cabinet = (x0: number, z0: number, x1: number, z1: number, h: number, alongX: boolean) => {
      rb.box(cab, x0, 0, z0, x1, h, z1);
      const n = Math.round(h / 0.33);
      if (alongX) { const fz = z0 < 0 ? z1 : z0; for (let x = x0; x < x1 - 0.1; x += 0.45) for (let k = 0; k < n; k++) { rb.box(cabD, x + 0.02, k * (h / n) + 0.02, fz - 0.006, x + 0.43, (k + 1) * (h / n) - 0.02, fz + 0.002); rb.box(handle, x + 0.17, (k + 0.65) * (h / n), fz - 0.02, x + 0.28, (k + 0.65) * (h / n) + 0.02, fz); } }
      else { const fx = x0; for (let z = z0; z < z1 - 0.1; z += 0.45) for (let k = 0; k < n; k++) { rb.box(cabD, fx - 0.006, k * (h / n) + 0.02, z + 0.02, fx + 0.002, (k + 1) * (h / n) - 0.02, z + 0.43); rb.box(handle, fx - 0.02, (k + 0.65) * (h / n), z + 0.17, fx, (k + 0.65) * (h / n) + 0.02, z + 0.28); } }
      this.occ.push([x0, 0, z0, x1, h, z1]);
    };
    for (let x = 1.4; x < 8.3; x += 0.95) cabinet(x, Z - 0.6, x + 0.9, Z, 1.32, true);
    cabinet(X - 0.6, -0.85, X, 0.5, 1.32, false); cabinet(X - 0.6, -3.55, X, -2.5, 1.0, false);
    // binders + box files on the cabinet tops
    for (let x = 1.5; x < 8.2; x += 0.31) { const k = Math.floor(hash(x * 7) * 6); rb.rbox(TM("trBinderM" + k, () => P.binderTex(k)), 0.06, 0.3, 0.26, x, 1.47, Z - 0.3, 0, 0, hash(x * 3) < 0.2 ? 0.25 : 0); }
    // whiteboard on the -x wall, a notice board + calendar on the +z wall, a notice board on the -x wall
    plane(this.group, basic("trWhiteboardM", () => ({ map: P.whiteboardTex(), color: new THREE.Color(0.95, 0.95, 0.95) })), 2.4, 1.2, Wv(-X + 0.03, 1.55, -1.0), Math.PI / 2);
    rb.box(C("#b8bcc2"), -X, 0.92, -2.25, -X + 0.04, 2.2, -2.2); rb.box(C("#b8bcc2"), -X, 0.92, 0.2, -X + 0.04, 2.2, 0.25); rb.box(C("#b8bcc2"), -X, 0.9, -2.25, -X + 0.1, 0.94, 0.25);
    rb.box(C("#b8bcc2"), -X, 2.15, -2.25, -X + 0.04, 2.2, 0.25);
    plane(this.group, faceMatLike("trNoticeM", P.noticeTex), 1.5, 1.0, Wv(-1.6, 1.6, Z - 0.03), Math.PI);
    plane(this.group, faceMatLike("trNoticeM", P.noticeTex), 1.5, 1.0, Wv(-X + 0.03, 1.6, 2.9), Math.PI / 2);
    plane(this.group, faceMatLike("trCalM", P.calendarTex), 0.42, 0.56, Wv(0.2, 1.75, Z - 0.03), Math.PI);
    // department signs hung from the ceiling (plain text)
    for (const [x, z, t] of [[-5.2, -0.3, "EQUITY SALES"], [5.2, -0.3, "EQUITY TRADING"]] as [number, number, string][]) {
      plane(this.group, basic("trSign" + t, () => ({ map: P.signTex("trSignT" + t, t), color: new THREE.Color(0.92, 0.92, 0.92), side: THREE.DoubleSide })), 1.9, 0.36, Wv(x, 2.72, z));
      for (const s of [-1, 1]) rb.seg(C("#5a5e66"), [x + s * 0.8, 2.9, z], [x + s * 0.8, H, z], 0.005, false, 4);
    }
    // the LED ticker strips: on the +z wall (full width) and hung across the room over the window rows
    for (const eve of [false, true]) {
      const t = P.ledTex(eve), m = basic("trLedM" + (eve ? "E" : "M"), () => ({ map: t, color: new THREE.Color(1.25, 1.25, 1.25) })); this.ledMats.push(m);
      const strip = (x0: number, x1: number, y0: number, y1: number, z: number, face: number) => {
        const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0), uv = g.attributes.uv as THREE.BufferAttribute; for (let q = 0; q < uv.count; q++) uv.setX(q, (uv.getX(q) * (x1 - x0)) / 8);
        const ms = new THREE.Mesh(g, m); ms.position.set(...Wv((x0 + x1) / 2, (y0 + y1) / 2, z)); ms.rotation.y = face > 0 ? 0 : Math.PI; ms.layers.set(NOINK); this.group.add(ms); (eve ? this.eveOnly : this.amOnly).push(ms);
      };
      strip(-7.6, 7.6, 2.86, 3.1, Z - 0.035, -1); strip(-0.9, 6.4, 2.66, 2.88, -3.0 + 0.04, 1);
    }
    rb.box(C("#24262c"), -7.7, 2.82, Z - 0.06, 7.7, 3.14, Z - 0.02); rb.box(C("#24262c"), -1.0, 2.62, -3.04, 6.5, 2.92, -2.98);
    for (const x of [-0.6, 6.1]) rb.seg(C("#5a5e66"), [x, 2.92, -3.0], [x, H, -3.0], 0.006, false, 4);
    // water cooler, plants, a waste bin per few desks
    { const wx = -X + 0.32, wz = -0.25; rb.box(C("#e4e2da"), wx - 0.16, 0, wz - 0.16, wx + 0.16, 1.0, wz + 0.16); rb.box(C("#3a6aa8"), wx - 0.05, 0.84, wz + 0.16, wx + 0.05, 0.9, wz + 0.19);
      const jug = new THREE.Mesh(cylY(0.13, 0.36, 20), basic("trJug", () => ({ color: new THREE.Color(0.55, 0.74, 0.95), transparent: true, opacity: 0.7 }))); jug.position.set(...Wv(wx, 1.0, wz)); this.group.add(jug);
      for (let k = 0; k < 4; k++) rb.geo(cylY(0.035, 0.08, 10, true, 0.028), C("#f4f2ea"), wx, 0.6 + k * 0.012, wz + 0.2); contact(this.group, Wv(wx, 0.005, wz), 0.5, 0.5, 0.4); }
    const pot = C("#d8d4cc"), soil = C("#3a2a1e");
    for (const [x, z, s] of [[-X + 0.45, Z - 0.5, 1.2], [X - 0.45, -Z + 0.62, 1.0], [-X + 0.45, -Z + 0.62, 1.1], [X - 0.5, 1.6, 0.9], [-0.95, Z - 0.45, 1.0]] as number[][]) {
      rb.geo(cylY(0.17 * s, 0.38 * s, 18, false, 0.22 * s), pot, x, 0, z); rb.geo(new THREE.CircleGeometry(0.2 * s, 16).rotateX(-Math.PI / 2), soil, x, 0.36 * s, z);
      rb.seg(C("#5a4030"), [x, 0.36 * s, z], [x + 0.03, 1.2 * s, z - 0.02], 0.02 * s);
      for (let k = 0; k < 26; k++) { const a = hash(x * 3 + k) * TAU, r = 0.12 + hash(z + k * 1.7) * 0.32, hy = (0.8 + hash(k * 2.3 + x) * 0.75) * s;
        rb.geo(new THREE.SphereGeometry(0.11 * s, 7, 5), C(["#3e7a3a", "#4e8a42", "#2e6a34", "#5a9a4a"][k % 4]), x + Math.cos(a) * r * s, hy, z + Math.sin(a) * r * s, a, 0.4, 0, [1.4, 0.45, 0.8]); }
      contact(this.group, Wv(x, 0.005, z), 0.7 * s, 0.7 * s, 0.4); this.occ.push([x - 0.3 * s, 0, z - 0.3 * s, x + 0.3 * s, 1.5 * s, z + 0.3 * s]);
    }
  }

  // ================================================================================================ the view
  private buildView() {
    for (const eve of [false, true]) {
      const sky = basic("trSkyM" + eve, () => ({ map: P.skyTex(eve), fog: false, depthWrite: false })); this.viewMats.push({ m: sky, eve });
      const s = plane(this.group, sky, 900, 520, Wv(0, 60, -260), 0, 0, 0, true); s.renderOrder = -5; (eve ? this.eveOnly : this.amOnly).push(s);
      P.LAYERS.slice().reverse().forEach((L, i) => {
        const m = basic(`trViewM_${L.key}${eve}`, () => ({ map: P.layerTex(L, eve), transparent: true, alphaTest: 0.02, fog: false, depthWrite: false })); this.viewMats.push({ m, eve });
        const p = plane(this.group, m, L.w, L.h, Wv(0, L.y0 + L.h / 2, L.z), 0, 0, 0, true); p.renderOrder = -4 + i; (eve ? this.eveOnly : this.amOnly).push(p);
      });
    }
    // red aviation lights on the antenna towers of the near and mid layers (blink)
    for (const L of P.LAYERS.slice(0, 2)) for (const t of P.layerTowers(L)) if (t.ant && Math.abs(t.x) < L.w / 2 - 2) {
      const sp = glowSprite(this.group, Wv(t.x, L.y0 + t.top + 9, L.z + 0.5), L.key === "near" ? 2.4 : 5.0, new THREE.Color(1.6, 0.18, 0.12)); sp.userData.ph = hash(t.x) * TAU; this.avia.push(sp);
    }
  }

  // ================================================================================================ life + light
  private buildLife() {
    // the red rotating beacon on the pilaster: a bracket, a dome, a spinning reflector with two beams
    const b = new THREE.Group(); b.position.set(...Wv(BEACON[0], BEACON[1], BEACON[2] - 0.1)); this.group.add(b); this.beacon = b;
    const brk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.22).translate(0, -0.1, 0.06), C("#3a3e46")); b.add(brk);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.05, 20).translate(0, -0.055, 0), C("#2a2c32")); b.add(base);
    this.beaconDome = basic("trBeaconDome", () => ({ color: new THREE.Color(0.45, 0.06, 0.05), transparent: true, opacity: 0.92 }));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 12, 0, TAU, 0, Math.PI / 2).scale(1, 1.5, 1).translate(0, -0.03, 0), this.beaconDome); dome.layers.set(NOINK); b.add(dome);
    const bm = new THREE.MeshBasicMaterial({ map: P.beamTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1).translate(2.1, 0, 0), bm); m.layers.set(NOINK); m.renderOrder = 6; b.add(m); this.beams.push(m); }
    this.beaconHalo = glowSprite(this.group, Wv(BEACON[0], BEACON[1] + 0.02, BEACON[2] - 0.1), 0.9, new THREE.Color(0, 0, 0));
    // dust motes: in the morning window light, and in the evening blind light (on the video clock)
    this.motesAm = new Motes(this.group, 160, 31, o, [-8, 0.6, -6.2], [8, 2.9, -2.6], new THREE.Color(0.55, 0.62, 0.72), 0.022, 0.1, 0.012);
    this.motesEve = new Motes(this.group, 260, 57, o, [-8, 0.4, -6.2], [8.5, 2.8, 4.0], new THREE.Color(1.0, 0.62, 0.3), 0.026, 0.12, 0.01);
  }
  private buildLight() {
    const kAm = norm(KEY_TRADING_AM), kEve = norm(KEY_TRADING_EVE), occ = this.occ;
    // morning: the cool window light near the glass (floor + the window rows' desk tops)
    this.decAm.push(floorDecal(this.group, "amFloor", -X, X, -Z + 0.36, -1.0, 0.004, kAm, BLINDS.am, occ, 30, 1.2));
    // evening: long orange blind stripes over the whole floor, the desk tops, the +x wall
    // (the evening bake keeps only LOCAL shadows (maxT): long stripes reach across the whole room, a painter's licence)
    this.decEve.push(floorDecal(this.group, "eveFloor", -X, X + 0.0, -Z + 0.36, Z, 0.004, kEve, BLINDS.eve, occ, 34, 1.0, 1.3));
    for (const [ri, z] of ROWS.entries()) for (const [ci, x] of COLS.entries()) {
      if (ri === 3 && ci === 6) continue;
      const hero = ri === 2 && ci === 3, w = Math.abs(x) > 7 ? 1.6 : 1.8;
      const dy = hero ? TR.desk.top + 0.0015 : TOP + 0.0015;
      this.decEve.push(floorDecal(this.group, `eveDesk${ri}_${ci}`, x - w / 2, x + w / 2, z - DESK_D / 2, z + DESK_D / 2, dy, kEve, BLINDS.eve, occ, 70, 1.0, 0.9));
      if (ri <= 1) this.decAm.push(floorDecal(this.group, `amDesk${ri}_${ci}`, x - w / 2, x + w / 2, z - DESK_D / 2, z + DESK_D / 2, dy, kAm, BLINDS.am, occ, 60, 1.0));
    }
    // the +x wall: a lower, more raking beam so the stripe band climbs the wall round the door (no occluders)
    this.decEve.push(wallXDecal(this.group, "eveWallX", X, -1, -Z, Z, 0, H, norm([-0.5, 0.125, -0.86]), BLINDS.eve, [], 30, 1.2));
    // dust beams through the blinds (camera-facing ribbons along the key)
    const sh = (p0: V3, d: V3, len: number, w: number, ph: number, eve: boolean) => {
      const mat = new THREE.MeshBasicMaterial({ map: P.beamTex(), color: new THREE.Color(0, 0, 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), mat); mesh.layers.set(NOINK); mesh.renderOrder = 5; mesh.frustumCulled = false; this.group.add(mesh);
      this.shafts.push({ mesh, mat, p0: new THREE.Vector3(...Wv(...p0)), d: new THREE.Vector3(...d).normalize(), len, w, ph, eve });
    };
    const dA: V3 = [-kAm[0], -kAm[1], -kAm[2]], dE: V3 = [-kEve[0], -kEve[1], -kEve[2]];
    for (const [x, w, ph] of [[-6.6, 1.1, 0.3], [-1.4, 0.9, 1.9], [1.6, 1.2, 3.1], [6.0, 1.0, 4.4]]) sh([x, 2.2, WIN.z + 0.2], dA, 4.2, w, ph, false);
    for (const [x, w, ph] of [[-7.4, 1.0, 0.7], [-5.4, 1.4, 2.0], [-1.0, 1.3, 3.3], [0.9, 0.9, 1.2], [5.3, 1.4, 4.1], [7.3, 1.0, 5.2]]) sh([x, 2.0, WIN.z + 0.2], dE, 7.5, w, ph, true);
  }

  // ================================================================================================ pose
  pose(ctx: SetCtx, L: Lighting) {
    const { id, f } = ctx, w = lightW(id, f), eve = w.eve > 0.5, cam = ctx.cam;
    for (const ob of this.amOnly) ob.visible = !eve; for (const ob of this.eveOnly) ob.visible = eve;
    this.heroPartG.visible = !faceOnAt(id, f);
    // screens: brighter as the room dims; a slow scroll per page, a shimmer
    const scrK = 0.95 * w.am + 1.3 * w.dim + 1.12 * w.red + 1.05 * w.eve;
    this.scrMats.forEach((m, k) => {
      const tint = w.red; m.color.setRGB(scrK * (1 + 0.15 * tint), scrK * (1 - 0.18 * tint), scrK * (1 - 0.15 * tint)).multiplyScalar(1 + 0.025 * vs(7.3 + k, k));
      if (m.map) { const n = [9, 0, 0, 3, 5, 7][k], nx = [0, 4, 6, 0, 0, 0][k]; m.map.offset.set(cycK(nx), cycK(n)); }
    });
    // troffers: on (one tube flickers now and then), dimmer in the mystery / the alarm / the evening
    const trK = 1.32 * w.am + 0.95 * w.dim + 0.7 * w.red + 0.62 * w.eve;
    this.troffer.color.setRGB(trK * 0.98, trK, trK * (1.03 - 0.12 * w.eve));
    { const ph = cycK(1) * TAU, bad = ph > 3.0 && ph < 3.5 ? (Math.floor(VF / 2) % 3 ? 0.35 : 1) : 1; this.trofferBad.color.copy(this.troffer.color).multiplyScalar(bad); }
    for (const m of this.ledMats) if (m.map) m.map.offset.x = -cycK(6) * 4;
    // clocks: ~9:27 in the morning shots (the second hand ticks), ~18:40 in the evening
    { const [hh, mm] = eve ? [18, 40] : [9, 27], sec = Math.floor(cycK(3) * 60) % 60;
      const mAng = ((mm + sec / 60) / 60) * TAU, hAng = (((hh % 12) + (mm + sec / 60) / 60) / 12) * TAU, sAng = (sec / 60) * TAU;
      for (const h of this.hands) h.g.rotation.z = -(h.k === 0 ? hAng : h.k === 1 ? mAng : sAng); }
    // the printer's status LED blinks; in shot 12 it flashes busy while the receipt prints
    { const busy = id === 12 && f > ctx.shot.a + 200, on = busy ? Math.floor(VF / 3) % 2 === 0 : vs(1.4) > -0.2; (this.printerLed.material as THREE.MeshBasicMaterial).color.setRGB(on ? 0.4 : 0.05, on ? 2.2 : 0.2, on ? 0.6 : 0.06); }
    // desk lamps
    const lampK = 1.0 * w.am + 1.1 * w.dim + 0.7 * w.red + 1.25 * w.eve;
    for (const m of this.lampBulbs) m.color.setRGB(1.8 * lampK, 1.4 * lampK, 0.9 * lampK);
    // the +x door: open in the evening (the receipt / trucks go through it), shut in the morning
    this.door.rotation.y = eve ? 1.75 : 0;
    // window light decals per state
    const amK = w.am + 0.55 * w.dim + 0.25 * w.red;
    for (const d of this.decAm) d.mat.color.setRGB(0.13 * amK, 0.17 * amK, 0.24 * amK);
    for (const d of this.decEve) d.mat.color.setRGB(1.45 * w.eve, 0.7 * w.eve, 0.24 * w.eve);
    // view: a hair of sky drift
    for (const v of this.viewMats) if (v.m.map && v.m.map.image && v.m === this.viewMats[0].m) v.m.map.offset.x = 0;
    // aviation lights blink (1 Hz-ish, whole cycles over the film)
    for (const s of this.avia) { const on = Math.sin(vph(TAU * 0.7) + s.userData.ph) > 0.55; s.material.color.setRGB(on ? 1.6 : 0.15, on ? 0.2 : 0.02, on ? 0.12 : 0.02); }
    // the beacon: spins in the alarm (2 rev / s), dark otherwise
    { const red = w.red, rot = vph(TAU * 1.6);
      this.beaconDome.color.setRGB(0.45 + 2.6 * red, 0.06 + 0.25 * red, 0.05 + 0.18 * red);
      this.beams.forEach((m, k) => { m.rotation.set(0, rot + k * Math.PI, 0.08); (m.material as THREE.MeshBasicMaterial).color.setRGB(0.9 * red, 0.04 * red, 0.03 * red); m.visible = red > 0.01; });
      this.beaconHalo.material.color.setRGB(1.4 * red * (0.75 + 0.25 * Math.cos(rot * 2)), 0.08 * red, 0.06 * red); }
    // shafts face the lens, breathe
    for (const S of this.shafts) {
      const k = S.eve ? w.eve * 0.16 : amK * 0.07; S.mesh.visible = k > 0.002 && (S.eve === eve);
      if (!S.mesh.visible) continue;
      const toCam = cam.position.clone().sub(S.p0).normalize(), side = new THREE.Vector3().crossVectors(S.d, toCam).normalize(), nrm = new THREE.Vector3().crossVectors(S.d, side).normalize();
      S.mesh.position.copy(S.p0); S.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(S.d, side, nrm)); S.mesh.scale.set(S.len, S.w * (1 + 0.05 * vs(0.6, S.ph)), 1);
      const kk = k * (0.85 + 0.15 * vs(0.45, S.ph)); if (S.eve) S.mat.color.setRGB(kk * 1.0, kk * 0.55, kk * 0.25); else S.mat.color.setRGB(kk * 0.7, kk * 0.85, kk * 1.0);
    }
    // (the motes drift on a running clock: kept out of the loop shots 1 / 14 so frame 0 = the last frame)
    this.motesAm.pts.visible = !eve && id !== 1 && id !== 14; this.motesEve.pts.visible = eve;
    const t = VF / 30; if (eve) this.motesEve.pose(t, 3); else this.motesAm.pose(t, 1);
    // shot 12: the bill
    this.bill.setPaper(0.94, 0.82, 0.68);
    this.bill.pose(id, f, cam);
    // ---- pools (<= 9): the window, six desk lamps, then 2 per state: the alarm's sweeping red / the evening's bounce +
    // the ghost cloud's glow / the morning's fluorescent spill
    const P9: { p: V3; c: [number, number, number]; r: number }[] = [];
    const winC: [number, number, number] = [0.15 * w.am + 0.09 * w.dim + 0.05 * w.red + 0.6 * w.eve, 0.19 * w.am + 0.11 * w.dim + 0.05 * w.red + 0.3 * w.eve, 0.28 * w.am + 0.17 * w.dim + 0.1 * w.red + 0.1 * w.eve];
    P9.push({ p: Wv(0, 1.5, -6.0), c: winC, r: 6.8 });
    // fix2 (audit 3): the warm desk-lamp pools are bigger and stronger (they barely showed against the cool room)
    const lc: [number, number, number] = [1.7 * lampK, 1.05 * lampK, 0.44 * lampK];
    for (const [lx, lz] of LAMPS) P9.push({ p: Wv(lx + 0.25, TOP + 0.22, lz + 0.2), c: lc, r: 1.5 });
    if (w.red > 0.01) {
      // the beacon's sweep: one red spot circling the hero desk, one on the walls round the pilaster
      const rot = vph(TAU * 1.6), r = w.red;
      P9.push({ p: Wv(0.2 + Math.cos(rot) * 1.7, 1.55, 1.7 + Math.sin(rot) * 1.4), c: [2.6 * r, 0.14 * r, 0.12 * r], r: 2.8 });
      P9.push({ p: Wv(BEACON[0] + Math.cos(rot + Math.PI) * 2.0, 1.9, BEACON[2] - 0.4 - Math.abs(Math.sin(rot + Math.PI)) * 2.0), c: [2.2 * r, 0.1 * r, 0.08 * r], r: 3.0 });
    } else if (eve) {
      P9.push({ p: Wv(8.4, 1.3, 0.5), c: [0.3, 0.15, 0.06], r: 4.2 });
      // the ghost cloud's cream glow (shot 12, from "96,000" to "cash")
      const g = id === 12 ? sm((f - BEAT.n96k + 12) / 30) * (1 - sm((f - BEAT.cash) / 20)) : 0; P9.push({ p: Wv(-0.8, 2.1, 2.9), c: [0.2 * g, 0.44 * g, 0.6 * g], r: 3.8 });   // fix2: a cool cyan glow (the ghosts' own colour)
    } else {
      const k = w.am + 0.45 * w.dim;
      P9.push({ p: Wv(0, 2.8, 0.6), c: [0.07 * k, 0.075 * k, 0.08 * k], r: 6.5 }, { p: Wv(0, 2.8, -3.6), c: [0.06 * k, 0.065 * k, 0.075 * k], r: 6.0 });
    }
    for (const q of P9.slice(0, 9)) L.pool(q.p, q.c, q.r);
    // the evening: the room's key exists only where the blinds let it through (the baked stripes carry it), so zone 3
    // kills the key over the whole room (a lamp zone of the DESK owner still unions its own spot back in)
    if (eve) L.zone(3, Wv(0, 1.5, 0), [-2, -1, 1, 60], [0, -1, 0, -2]);
    void clamp01;
  }
}
/** the fraction (0..1) of n whole cycles over the loop (LOOPN video frames), exact integer arithmetic: frame 0 = the last frame */
const cycK = (n: number) => (((Math.round(VF) * n) % LOOPN) + LOOPN) % LOOPN / LOOPN;
const norm = (v: V3): V3 => { const n = Math.hypot(...v) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
/** a readable board face (unlit, a hair dimmer than white) */
const faceMatLike = (key: string, map: () => THREE.Texture) => basic(key, () => ({ map: map(), color: new THREE.Color(0.9, 0.9, 0.9) }));

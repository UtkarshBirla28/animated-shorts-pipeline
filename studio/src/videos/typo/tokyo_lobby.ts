// THE EXCHANGE LOBBY (owner TOKYO; shots 3 / 4 / 7 / 9): a bright modern atrium (polished stone floor, travertine,
// a glass front wall onto the street, a skylight grid with steel trusses, a mezzanine with a glass balustrade), the big
// ROUND GLASS TICKER DRUM (bands of scrolling green / red quotes, a quote board, the live J-COM chart panel that plunges
// onto a red FLOOR bar in shot 9 and turns the drum red), the debut stage (red carpet disc, a bell in a lacquered
// frame, the "TODAY: J-COM DEBUT" banner), the MUSEUM PEDESTAL under the mezzanine (one tidy certificate stack, a brass
// plaque, stanchions + velvet rope, a warm spot cone with dust) in front of a dark felt gallery wall, and the shot-7
// TOWER of 41 stacks that wobbles up through the mezzanine (ceiling tiles pop, dust) under a "41x" banner.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Lighting } from "./sets";
import { LB, type V3 } from "./plan";
import { BEAT, SHOTS } from "./beats";
import { Batch, RB, C, TM, CE, faceMesh, buildInk, M, NOINK, TAU, hash, clamp01, cyc, VF, vph, Motes, contact, glowSprite, smooth, outBack } from "./setkit";
import { rep } from "./paint";
import { VOICE_TOTAL } from "./voicewarp";
import * as TP from "./tokyo_paint";

const O = LB.base, X = LB.room.w / 2, Z = LB.room.d / 2, H = LB.room.h;
const W = (x: number, y: number, z: number) => new THREE.Vector3(O[0] + x, O[1] + y, O[2] + z);
const TK = LB.ticker, DR = TK.r, DC = TK.c;
/** the mezzanine (its underside = LB.pedCeil): x -13..MZ_X, top floor at MZ_TOP */
export const MZ_X = -4.6, MZ_TOP = LB.pedCeil + 0.4;
/** the pedestal + the shot-7 tower (local), one stack's size */
const PED = LB.pedestal.c, PW = 0.78, TW: V3 = [PED[0] + 1.3, 0, PED[2] - 0.75];
export const STACK = { w: 0.42, d: 0.3, h: 0.34 };
const CONF_N = 90, TOWER_W = 1.7;
/** TOKYO-local board marks: the TODAY banner over the debut stage, the 41x banner on the mezzanine glass */
export const TODAY = { c: [LB.bell[0] - 0.45, 2.72, LB.bell[2] - 0.55] as V3, w: 2.3, h: 0.95, ry: 0.62 };
export const B41 = { c: [MZ_X + 0.22, MZ_TOP + 0.38, TW[2] + 2.1] as V3, w: 2.2, h: 1.64 };
/** the bell (hangs in its frame right of the mascot) */
export const BELL: V3 = [LB.bell[0] - 0.88, 1.32, LB.bell[2] - 0.35];
/** the chart panel on the drum: centred at bearing CH_A (rad from +z toward +x), half-width CH_HW */
const CH_A = -0.12, CH_HW = 0.46, CH_Y0 = 1.75, CH_Y1 = 4.15;
const HOLE = { x0: TW[0] - 0.3, x1: TW[0] + 0.3, z0: TW[2] - 0.3, z1: TW[2] + 0.3 };

/** the tower of shot 7: how many stacks (continuous) at picture frame f */
const T0 = BEAT.thats + 3, TD = 68;
export const towerN = (f: number) => 41 * clamp01((f - T0) / TD) ** 1.35;
/** fix4 (3): the 41 stacks stand as a WALL OF PAPER, 4 stacks wide (it read as a thin pole): rows of 4 fill bottom-up
 *  (9 full rows + 3), then the last two go on the first column, up THROUGH the ceiling hole. slot s -> [column, row] */
const WALL_K = 1.2, WALL_P = 0.56;
const slot = (s: number): [number, number] => (s < 39 ? [s % 4, Math.floor(s / 4)] : [0, s - 29]);
const towerTop = (f: number) => { const n = towerN(f); let h = 0; for (let s = 0; s < 41; s++) if (slot(s)[0] === 0) h += STACK.h * WALL_K * clamp01(n - s); return h; };
/** the frame the tower top reaches the ceiling (searched once) */
let F_HIT = 0;
const fHit = () => { if (!F_HIT) { let f = T0; while (towerTop(f) < LB.pedCeil && f < T0 + TD) f += 0.25; F_HIT = f; } return F_HIT; };

export class TokyoLobby {
  readonly group = new THREE.Group();
  private bands: { m: THREE.MeshBasicMaterial; r: THREE.MeshBasicMaterial; tex: THREE.Texture[]; n: number }[] = [];
  private chart = new TP.ChartPanel(1024, 640); private chartMat!: THREE.MeshBasicMaterial;
  private bell = new THREE.Group(); private ding!: THREE.Mesh;
  private boards: { m: THREE.MeshBasicMaterial; k: number }[] = [];
  private plaque!: THREE.Mesh; private confetti!: THREE.InstancedMesh;
  private b41!: THREE.Mesh; private today!: THREE.Mesh;
  private stacks: THREE.Mesh[] = []; private tiles: THREE.Mesh[] = []; private floorTile!: THREE.Mesh; private capTile!: THREE.Mesh;
  private dust: THREE.Sprite[] = []; private cone!: THREE.Mesh; private coneMat!: THREE.MeshBasicMaterial; private coneFloor!: THREE.MeshBasicMaterial;
  private motes!: Motes; private mobile = new THREE.Group();
  private streak!: THREE.Texture; private floorGlow!: THREE.MeshBasicMaterial;

  constructor() {
    const S = this.group, rb = new RB(O), b = new Batch();
    // ---------------- shell ----------------
    const trav = TM("tkTrav", () => rep(TP.travTex(), 1, 1)), felt = TM("tkFelt", () => rep(TP.feltTex(), 1, 1)), steel = C("#5e646e"), steelL = C("#9aa2ae");
    rb.flatY(TM("tkFloor", () => rep(TP.floorTex(), 1, 1)), -X, X, -Z, Z, 0, 1, 2.4, 2.4);
    rb.wallX(trav, -Z, Z, MZ_TOP, H, -X, 1, 3, 3); rb.wallX(felt, -Z, Z, 0, LB.pedCeil, -X, 1, 2, 2);
    rb.wallX(trav, -Z, Z, 0, H, X, -1, 3, 3); rb.wallZ(trav, -X, X, 0, H, Z, -1, 3, 3);
    // the glass front wall (street beyond) + its base and a steel transom
    { const g = faceMesh(TP.curtainTex(), 2 * X, H - 0.4); (g.material as THREE.MeshBasicMaterial).color.setRGB(1.02, 1.04, 1.08); g.position.copy(W(0, 0.4 + (H - 0.4) / 2, -Z + 0.02)); g.layers.set(NOINK); S.add(g);
      rb.box(C("#4a4e56"), -X, 0, -Z, X, 0.4, -Z + 0.12); rb.box(steel, -X, 4.4, -Z, X, 4.62, -Z + 0.3); }
    // skylight ceiling + trusses
    { const sk = faceMesh(TP.skylightTex(), 2 * X, 2 * Z); (sk.material as THREE.MeshBasicMaterial).map = rep(TP.skylightTex(), 6, 5); (sk.material as THREE.MeshBasicMaterial).color.setScalar(1.08);
      sk.rotation.x = Math.PI / 2; sk.position.copy(W(0, H, 0)); sk.layers.set(NOINK); S.add(sk);
      for (let x = -10; x <= 10; x += 5) { rb.box(steel, x - 0.12, H - 0.7, -Z, x + 0.12, H - 0.55, Z); rb.box(steel, x - 0.06, H - 0.55, -Z, x + 0.06, H, Z);
        for (let z = -Z; z < Z; z += 1.4) b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.75).rotateX(0.95), steelL, M(O[0] + x, H - 0.33, O[2] + z + 0.35)); } }
    // ---------------- the mezzanine (x -13..MZ_X), its tiled underside = the lower ceiling over the pedestal ----------------
    { const y0 = LB.pedCeil, y1 = MZ_TOP, slab = C("#d8d4cc"), tileM = TM("tkTile", () => rep(TP.tileTex(), 1, 1)), mzF = TM("tkFloorMz", () => rep(TP.floorTex(), 1, 1));
      const cut: [number, number, number, number][] = [[-X, HOLE.x0, -Z, Z], [HOLE.x1, MZ_X, -Z, Z], [HOLE.x0, HOLE.x1, -Z, HOLE.z0], [HOLE.x0, HOLE.x1, HOLE.z1, Z]];
      for (const [a, c, z0, z1] of cut) { rb.box(slab, a, y0, z0, c, y1, z1, false); rb.flatY(tileM, a, c, z0, z1, y0 - 0.004, -1, 2.4, 2.4); rb.flatY(mzF, a, c, z0, z1, y1 + 0.004, 1, 2.4, 2.4); }
      rb.box(steel, MZ_X, y0 - 0.06, -Z, MZ_X + 0.12, y1 + 0.05, Z);
      // glass balustrade + handrail
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(2 * Z, 1.05), new THREE.MeshBasicMaterial({ color: "#b8d4dc", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      gl.rotation.y = Math.PI / 2; gl.position.copy(W(MZ_X + 0.06, y1 + 0.55, 0)); gl.layers.set(NOINK); S.add(gl);
      rb.box(steelL, MZ_X, y1 + 1.05, -Z, MZ_X + 0.1, y1 + 1.12, Z); for (let z = -Z + 1; z < Z; z += 2) rb.box(steel, MZ_X + 0.02, y1, z - 0.03, MZ_X + 0.08, y1 + 1.06, z + 0.03);
      // columns under the mezzanine edge
      for (const z of [-7.2, -1.2, 8.6]) { b.add(new THREE.CylinderGeometry(0.28, 0.28, y0, 20).translate(0, y0 / 2, 0), C("#e8e4dc"), M(O[0] + MZ_X - 0.3, 0, O[2] + z)); contact(S, [O[0] + MZ_X - 0.3, 0.01, O[2] + z], 1.0, 1.0, 0.35); }
      // downlights in the tiled ceiling
      for (let x = -11.5; x < MZ_X - 0.5; x += 2.4) for (let z = -8.4; z < Z; z += 2.4) { if (Math.abs(x - PED[0]) < 1 && Math.abs(z - PED[2]) < 1) continue; const s = glowSprite(S, [O[0] + x, y0 - 0.03, O[2] + z], 0.28, new THREE.Color(0.9, 0.86, 0.74)); void s; }
    }
    // the dark felt gallery wall behind the pedestal + a few framed pieces (abstract, unreadable)
    rb.box(felt, PED[0] - 3.2, 0, PED[2] - 2.25, PED[0] + 3.0, LB.pedCeil, PED[2] - 1.95);
    // dark wood dado + brass rail + skirting along the gallery wall, two lit frames close behind the pedestal
    rb.box(C("#2c1d17"), PED[0] - 3.2, 0, PED[2] - 1.95, PED[0] + 3.0, 0.95, PED[2] - 1.9);
    rb.box(C("#c8a050"), PED[0] - 3.2, 0.95, PED[2] - 1.95, PED[0] + 3.0, 0.99, PED[2] - 1.87);
    rb.box(C("#171012"), PED[0] - 3.2, 0, PED[2] - 1.95, PED[0] + 3.0, 0.1, PED[2] - 1.88);
    { const gold = C("#c8a050"), Z0 = PED[2] - 1.9;
      // A: an abstract oil (sky, a sun, a hill)
      const ax = PED[0] - 1.0, ay = 2.1;
      rb.box(gold, ax - 0.43, ay - 0.53, Z0 - 0.05, ax + 0.43, ay + 0.53, Z0);
      rb.box(C("#2d4a7c"), ax - 0.37, ay - 0.47, Z0, ax + 0.37, ay + 0.47, Z0 + 0.012);
      rb.box(C("#e8b04a"), ax - 0.12, ay + 0.1, Z0 + 0.012, ax + 0.14, ay + 0.34, Z0 + 0.02);
      rb.box(C("#3c7a58"), ax - 0.37, ay - 0.47, Z0 + 0.012, ax + 0.37, ay - 0.16, Z0 + 0.02);
      rb.box(C("#a8443a"), ax - 0.05, ay - 0.16, Z0 + 0.012, ax + 0.28, ay - 0.04, Z0 + 0.02);
      // B: a framed old share certificate
      const bx = PED[0] + 0.3, by = 2.25;
      rb.box(gold, bx - 0.38, by - 0.31, Z0 - 0.05, bx + 0.38, by + 0.31, Z0);
      rb.box(C("#f4efe0"), bx - 0.34, by - 0.27, Z0, bx + 0.34, by + 0.27, Z0 + 0.012);
      const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), TM("tkCertTop", () => TP.certTopTex())); cm.position.copy(W(bx, by, Z0 + 0.016)); S.add(cm);
      // brass picture lamps over both frames
      for (const [lx, ly] of [[ax, ay + 0.62], [bx, by + 0.42]]) { rb.box(C("#b88a3a"), lx - 0.16, ly, Z0 - 0.02, lx + 0.16, ly + 0.035, Z0 + 0.1); rb.box(C("#fff0c0"), lx - 0.14, ly - 0.004, Z0 - 0.0, lx + 0.14, ly + 0.001, Z0 + 0.09); } }
    for (const [x, y, w, h] of [[-2.2, 2.2, 0.9, 1.2], [2.2, 2.1, 0.7, 0.95]]) { rb.box(C("#b89a5a"), PED[0] + x - w / 2 - 0.05, y - h / 2 - 0.05, PED[2] - 1.95, PED[0] + x + w / 2 + 0.05, y + h / 2 + 0.05, PED[2] - 1.9);
      rb.box(C(x < 0 ? "#3a4a6a" : "#5a3a3a"), PED[0] + x - w / 2, y - h / 2, PED[2] - 1.9, PED[0] + x + w / 2, y + h / 2, PED[2] - 1.88); }
    // the right wall: elevator doors, an exit sign
    for (const z of [-6, -3, 3]) { rb.box(C("#b8bec8"), X - 0.08, 0, z - 0.75, X - 0.02, 2.5, z + 0.75); rb.box(C("#8a909a"), X - 0.09, 0, z - 0.02, X - 0.02, 2.5, z + 0.02); }
    { const e = faceMesh(TP.exitTex(), 0.8, 0.3); e.position.copy(W(X - 0.05, 3.0, 0)); e.rotation.y = -Math.PI / 2; e.layers.set(NOINK); S.add(e);
      const e2 = faceMesh(TP.exitTex(), 0.8, 0.3); e2.position.copy(W(-X + 0.05, 3.4, -6)); e2.rotation.y = Math.PI / 2; e2.layers.set(NOINK); S.add(e2); }
    // ---------------- the ROUND GLASS TICKER DRUM ----------------
    { const gD = TM("tkGraniteD", () => rep(TP.graniteTex("tkGraniteD", "#5e5852"), 1, 1));
      b.add(new THREE.CylinderGeometry(DR + 0.25, DR + 0.3, TK.y0, 64).translate(0, TK.y0 / 2, 0), gD, M(O[0] + DC[0], 0, O[2] + DC[2]));
      b.add(new THREE.CylinderGeometry(DR + 0.2, DR + 0.2, 0.32, 64).translate(0, TK.y1 + 0.16, 0), steelL, M(O[0] + DC[0], 0, O[2] + DC[2]));
      b.add(new THREE.CylinderGeometry(DR - 0.05, DR - 0.05, TK.y1 - TK.y0, 64, 1, true).translate(0, (TK.y0 + TK.y1) / 2, 0), C("#0a1612"), M(O[0] + DC[0], 0, O[2] + DC[2]));
      for (const y of [1.08, 1.68, 4.22, 4.83]) b.add(new THREE.CylinderGeometry(DR + 0.04, DR + 0.04, 0.07, 64), steel, M(O[0] + DC[0], y, O[2] + DC[2]));
      for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; let d = a - CH_A; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < CH_HW + 0.03) continue;
        b.add(new THREE.BoxGeometry(0.05, TK.y1 - TK.y0, 0.06), steel, M(O[0] + DC[0] + Math.sin(a) * (DR + 0.04), (TK.y0 + TK.y1) / 2, O[2] + DC[2] + Math.cos(a) * (DR + 0.04), a)); }
      // bands: [y0, y1, texture kind, scroll cycles over the film (sign = direction)]
      const bandDef: [number, number, number, number][] = [[0.52, 1.04, 0, 5], [1.12, 1.64, 1, -4], [4.26, 4.79, 2, 4], [4.87, 5.42, 3, -6]];
      const mk = (y0: number, y1: number, tex: THREE.Texture, r: number, op: number) => {
        const m = new THREE.MeshBasicMaterial({ map: tex, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
        const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 96, 1, true).translate(0, (y0 + y1) / 2, 0), m);
        g.position.copy(W(DC[0], 0, DC[2])); g.layers.set(NOINK); S.add(g); return m;
      };
      for (const [y0, y1, i, n] of bandDef) {
        const t0 = rep(TP.tickerTex(i), 3, 1), t1 = rep(TP.tickerTex(i, true), 3, 1);
        this.bands.push({ m: mk(y0, y1, t0, DR, 1), r: mk(y0, y1, t1, DR + 0.006, 0), tex: [t0, t1], n });
      }
      const q0 = rep(TP.quoteTex(), 3, 1), q1 = rep(TP.quoteTex(true), 3, 1);
      this.bands.push({ m: mk(CH_Y0, CH_Y1, q0, DR, 1), r: mk(CH_Y0, CH_Y1, q1, DR + 0.006, 0), tex: [q0, q1], n: 0 });
      // the chart panel (a curved segment over the quote board) + its frame
      this.chartMat = new THREE.MeshBasicMaterial({ map: this.chart.tex });
      const cg = new THREE.CylinderGeometry(DR + 0.02, DR + 0.02, CH_Y1 - CH_Y0 - 0.06, 48, 1, true, CH_A - CH_HW, 2 * CH_HW).translate(0, (CH_Y0 + CH_Y1) / 2, 0);
      const cm = new THREE.Mesh(cg, this.chartMat); cm.position.copy(W(DC[0], 0, DC[2])); cm.layers.set(NOINK); S.add(cm);
      for (const a of [CH_A - CH_HW - 0.01, CH_A + CH_HW + 0.01]) b.add(new THREE.BoxGeometry(0.09, CH_Y1 - CH_Y0 + 0.1, 0.09), steelL, M(O[0] + DC[0] + Math.sin(a) * (DR + 0.05), (CH_Y0 + CH_Y1) / 2, O[2] + DC[2] + Math.cos(a) * (DR + 0.05), a));
      // glass sheen over the drum
      { this.streak = rep(TP.glassStreakTex(), 2, 1);
        const gm = new THREE.MeshBasicMaterial({ map: this.streak, color: new THREE.Color(0.2, 0.25, 0.27), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const gc = new THREE.Mesh(new THREE.CylinderGeometry(DR + 0.12, DR + 0.12, TK.y1 - TK.y0, 96, 1, true).translate(0, (TK.y0 + TK.y1) / 2, 0), gm); gc.position.copy(W(DC[0], 0, DC[2])); gc.layers.set(NOINK); gc.renderOrder = 4; S.add(gc); }
      // the drum's glow on the polished floor (additive, green -> red in the crash)
      this.floorGlow = new THREE.MeshBasicMaterial({ map: TP.dustTex(), color: new THREE.Color(0.05, 0.32, 0.14), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      { const fg = new THREE.Mesh(new THREE.PlaneGeometry(9, 5).rotateX(-Math.PI / 2), this.floorGlow); fg.position.copy(W(DC[0] + Math.sin(CH_A) * (DR + 1.6), 0.014, DC[2] + Math.cos(CH_A) * (DR + 1.6))); fg.rotation.y = CH_A; fg.layers.set(NOINK); S.add(fg); }
      contact(S, [O[0] + DC[0], 0.012, O[2] + DC[2]], 2 * DR + 1.6, 2 * DR + 1.6, 0.35);
    }
    // ---------------- the debut stage: carpet, the bell frame, the TODAY banner ----------------
    { const B = LB.bell, lac = C("#5a1a1a"), blk = C("#1e1a1a"), gold = C("#c8a050");
      const cp = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0).rotateX(-Math.PI / 2), TM("tkCarpet", () => TP.carpetTex(), { transparent: true, alphaTest: 0.5 }));
      cp.position.copy(W(B[0] + 0.2, 0.012, B[2] - 0.1)); cp.receiveShadow = true; S.add(cp);
      // the bell frame: two lacquered posts on black feet, a crossbar with gold caps
      const bx = BELL[0], bz = BELL[2];
      for (const s of [-0.42, 0.42]) { b.add(new THREE.BoxGeometry(0.08, 1.78, 0.08).translate(0, 0.89, 0), lac, M(O[0] + bx + s, 0, O[2] + bz)); b.add(new THREE.BoxGeometry(0.16, 0.08, 0.5), blk, M(O[0] + bx + s, 0.04, O[2] + bz)); }
      b.add(new THREE.BoxGeometry(1.1, 0.09, 0.1), lac, M(O[0] + bx, 1.8, O[2] + bz)); for (const s of [-0.58, 0.58]) b.add(new THREE.BoxGeometry(0.08, 0.12, 0.12), gold, M(O[0] + bx + s, 1.8, O[2] + bz));
      // the bell (lathe profile) + a cord, hung from the crossbar; swings on "starts"
      const prof = [[0.0, 0.0], [0.2, 0.0], [0.21, 0.04], [0.17, 0.14], [0.14, 0.3], [0.12, 0.38], [0.06, 0.42], [0.0, 0.43]].map(([x, y]) => new THREE.Vector2(x, y - 0.43));
      const bell = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), CE("#b8873a", "#3a2408", 0.15)); bell.position.y = -0.22; bell.castShadow = true;
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 24).rotateX(Math.PI / 2), C("#8a6024")); lip.position.y = -0.64; this.bell.add(lip);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22).translate(0, -0.11, 0), C("#c8282a")); this.bell.add(bell, cord);
      this.bell.position.copy(W(bx, 1.75, bz)); S.add(this.bell);
      this.ding = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: TP.dingTex(), transparent: true, depthWrite: false })); this.ding.layers.set(NOINK); this.ding.renderOrder = 6; S.add(this.ding);
      // the TODAY banner on two slim posts behind the mascot
      const T = TODAY, cs = Math.cos(T.ry), sn = Math.sin(T.ry);
      for (const s of [-1, 1]) { const px = T.c[0] + s * (T.w / 2 + 0.04) * cs, pz = T.c[2] - s * (T.w / 2 + 0.04) * sn; b.add(new THREE.CylinderGeometry(0.035, 0.035, T.c[1] + T.h / 2 + 0.1).translate(0, (T.c[1] + T.h / 2 + 0.1) / 2, 0), steelL, M(O[0] + px, 0, O[2] + pz));
        b.add(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 16), steel, M(O[0] + px, 0, O[2] + pz)); }
      b.add(new THREE.BoxGeometry(T.w + 0.12, T.h + 0.12, 0.05), C("#c8a050"), M(O[0] + T.c[0], T.c[1], O[2] + T.c[2], T.ry, [1, 1, 1]));
      this.today = this.board(faceMesh(TP.boardTex("today", [{ t: "TODAY:", px: 150, c: "#f2d27a" }, { t: "J-COM DEBUT", px: 190, c: "#ffffff" }], 1024, 424), T.w, T.h), 1);
      this.today.position.copy(W(T.c[0] + 0.03 * sn, T.c[1], T.c[2] + 0.03 * cs)); this.today.rotation.y = T.ry; S.add(this.today);
      // stanchions round the stage front
      for (const [dx, dz] of [[-1.4, 1.0], [1.6, 1.1]]) stanchion(b, B[0] + dx, B[2] + dz);
    }
    // ---------------- the museum pedestal ----------------
    { const P = PED, h = LB.pedestal.h, w = PW;
      rb.box(C("#efece4"), P[0] - w / 2, 0, P[2] - w / 2, P[0] + w / 2, h, P[2] + w / 2);
      rb.box(C("#d8d4ca"), P[0] - w / 2 - 0.04, 0, P[2] - w / 2 - 0.04, P[0] + w / 2 + 0.04, 0.1, P[2] + w / 2 + 0.04);
      rb.box(C("#d8d4ca"), P[0] - w / 2 - 0.03, h - 0.04, P[2] - w / 2 - 0.03, P[0] + w / 2 + 0.03, h, P[2] + w / 2 + 0.03);
      // richer base: a dark marble double plinth, a gold inlay band, an inset gold-framed panel for the plaque, a deep cornice
      rb.box(C("#2e2c34"), P[0] - w / 2 - 0.12, 0, P[2] - w / 2 - 0.12, P[0] + w / 2 + 0.12, 0.05, P[2] + w / 2 + 0.12);
      rb.box(C("#4a4752"), P[0] - w / 2 - 0.08, 0.05, P[2] - w / 2 - 0.08, P[0] + w / 2 + 0.08, 0.13, P[2] + w / 2 + 0.08);
      rb.box(C("#c8a050"), P[0] - w / 2 - 0.045, 0.13, P[2] - w / 2 - 0.045, P[0] + w / 2 + 0.045, 0.145, P[2] + w / 2 + 0.045);
      rb.box(C("#c8a050"), P[0] - w / 2 - 0.045, h - 0.15, P[2] - w / 2 - 0.045, P[0] + w / 2 + 0.045, h - 0.135, P[2] + w / 2 + 0.045);
      rb.box(C("#f6f2e8"), P[0] - w / 2 - 0.07, h - 0.1, P[2] - w / 2 - 0.07, P[0] + w / 2 + 0.07, h, P[2] + w / 2 + 0.07);
      rb.box(C("#8c7a64"), P[0] - 0.36, 0.34, P[2] + w / 2, P[0] + 0.36, 0.86, P[2] + w / 2 + 0.008);
      rb.box(C("#c8a050"), P[0] - 0.33, 0.37, P[2] + w / 2, P[0] + 0.33, 0.83, P[2] + w / 2 + 0.012);
      const pq = this.board(faceMesh(TP.plaqueTex(), 0.62, 0.375), 1); pq.position.copy(W(P[0], 0.6, P[2] + w / 2 + 0.02)); S.add(pq); this.plaque = pq;
      b.add(new THREE.BoxGeometry(0.66, 0.42, 0.012), C("#7a5a24"), M(O[0] + P[0], 0.6, O[2] + P[2] + w / 2 + 0.008));
      // the exhibit: a velvet cushion, the tidy stack (green band), and a fan of loose certificates leaning on its face
      b.add(new THREE.BoxGeometry(0.56, 0.03, 0.42), C("#7a1f2a"), M(O[0] + P[0], h + 0.015, O[2] + P[2]));
      this.stackMesh(S, [P[0], h + 0.03, P[2] - 0.02], 0, 0);
      const topM = TM("tkCertTop", () => TP.certTopTex()), edgeM = C("#efe7cf");
      for (let k = 0; k < 4; k++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.19, 0.006), [edgeM, edgeM, edgeM, edgeM, topM, edgeM]);
        sh.position.copy(W(P[0] - 0.15 + k * 0.1, h + 0.14, P[2] + 0.14)); sh.rotation.set(-0.35, (k - 1.5) * 0.12, (k - 1.5) * 0.14, "YXZ"); sh.castShadow = true; sh.receiveShadow = true; S.add(sh); }
      b.add(new THREE.BoxGeometry(0.03, 0.2, 0.012), C("#c8282a"), M(O[0] + P[0] + 0.09, h + 0.13, O[2] + P[2] - 0.02 + 0.15));
      // stanchions + velvet rope (sides and back: the front stays open for the plaque)
      const R = 0.85, pts: [number, number][] = [[-R, R], [-R, -R], [R, -R], [R, R]];
      for (const [dx, dz] of pts) stanchion(b, P[0] + dx, P[2] + dz);
      const vel = TM("tkVelvet", () => rep(TP.velvetTex(), 3, 1));
      for (let i = 0; i < 3; i++) { const [ax, az] = pts[i], [cx, cz] = pts[i + 1]; const A = W(P[0] + ax, 0.86, P[2] + az), Cc = W(P[0] + cx, 0.86, P[2] + cz), Mid = A.clone().lerp(Cc, 0.5).setY(0.66);
        const curve = new THREE.QuadraticBezierCurve3(A, Mid, Cc); b.add(new THREE.TubeGeometry(curve, 16, 0.028, 6, false), vel); }
      contact(S, [O[0] + P[0], 0.012, O[2] + P[2]], 1.8, 1.8, 0.45);
      // the spot can in the ceiling, its cone of light, a warm floor pool, dust in the beam
      b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.22, 16), C("#1e2026"), M(O[0] + P[0], LB.pedCeil - 0.11, O[2] + P[2]));
      const sp = glowSprite(S, [O[0] + P[0], LB.pedCeil - 0.23, O[2] + P[2]], 0.5, new THREE.Color(1.6, 1.3, 0.9)); void sp;
      const ch = LB.pedCeil - 0.24;
      this.coneMat = new THREE.MeshBasicMaterial({ map: TP.coneTex(), color: new THREE.Color(0.42, 0.33, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, fog: false });
      this.cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.78, ch, 32, 1, true).translate(0, -ch / 2, 0), this.coneMat);
      this.cone.position.copy(W(P[0], LB.pedCeil - 0.22, P[2])); this.cone.layers.set(NOINK); this.cone.renderOrder = 7; S.add(this.cone);
      this.coneFloor = new THREE.MeshBasicMaterial({ map: TP.dustTex(), color: new THREE.Color(0.5, 0.36, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const fp = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32).rotateX(-Math.PI / 2), this.coneFloor); fp.position.copy(W(P[0], 0.015, P[2])); fp.layers.set(NOINK); S.add(fp);
      // a soft polished-floor reflection under the plinth (a faint warm streak that fades toward the camera)
      { const rc = document.createElement("canvas"); rc.width = 64; rc.height = 128; const g = rc.getContext("2d")!; const gr = g.createLinearGradient(0, 0, 0, 128);
        gr.addColorStop(0, "rgba(255,240,205,0.55)"); gr.addColorStop(1, "rgba(255,240,205,0)"); g.fillStyle = gr; g.fillRect(8, 0, 48, 128);
        const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
        const rf = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55 }));
        rf.position.copy(W(P[0], 0.018, P[2] + 0.88)); rf.layers.set(NOINK); rf.renderOrder = 5; S.add(rf); }
      this.motes = new Motes(S, 90, 7, O, [P[0] - 0.6, 0.9, P[2] - 0.6], [P[0] + 0.6, LB.pedCeil - 0.5, P[2] + 0.6], new THREE.Color(1.0, 0.8, 0.5), 0.035, 0.08, 0.03);
    }
    // ---------------- the 41-stack tower (shot 7), its ceiling tiles, the 41x banner ----------------
    for (let k = 0; k < 41; k++) { const m = this.stackMesh(S, [TW[0], 0, TW[2]], k + 1, Math.PI / 2); m.visible = false; this.stacks.push(m); }
    { const tm = TM("tkTileOne", () => TP.tileOneTex(), { side: THREE.DoubleSide });
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { if (!i && !j) continue; const t = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6).rotateX(Math.PI / 2), tm); t.position.copy(W(TW[0] + i * 0.6, LB.pedCeil - 0.008, TW[2] + j * 0.6)); t.userData.ij = [i, j]; S.add(t); this.tiles.push(t); }
      this.capTile = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.6), tm); this.capTile.castShadow = true; S.add(this.capTile);
      this.floorTile = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.6), TM("tkFloorMz", () => rep(TP.floorTex(), 0.25, 0.25))); this.floorTile.castShadow = true; S.add(this.floorTile); }
    for (let k = 0; k < 10; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TP.dustTex(), color: "#ece6da", transparent: true, depthWrite: false })); s.layers.set(NOINK); s.renderOrder = 6; S.add(s); this.dust.push(s); }
    { const B = B41;
      b.add(new THREE.BoxGeometry(0.05, B.h + 0.12, B.w + 0.12), C("#c8a050"), M(O[0] + B.c[0] - 0.03, B.c[1], O[2] + B.c[2]));
      this.b41 = this.board(faceMesh(TP.boardTex("b41", [{ t: "41×", px: 250, c: "#ffd25a" }, { t: "THE WHOLE", px: 150, c: "#ffffff" }, { t: "COMPANY", px: 150, c: "#ffffff" }], 1024, 764), B.w, B.h), 1);
      this.b41.position.copy(W(B.c[0], B.c[1], B.c[2])); this.b41.rotation.y = Math.PI / 2; S.add(this.b41); }
    // ---------------- a slowly turning ceiling mobile over the atrium ----------------
    { const mb = new Batch(), cols = ["#d8282a", "#f2c23a", "#2a6ab8", "#f4f2ec", "#2a2a30"];
      mb.add(new THREE.CylinderGeometry(0.01, 0.01, 1.6).translate(0, 0.8, 0), C("#2a2a30"));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU, r = 0.9 + 0.5 * (k % 2), y = -0.2 - 0.35 * k;
        mb.add(new THREE.CylinderGeometry(0.008, 0.008, r).rotateZ(Math.PI / 2).translate(r / 2, y, 0).rotateY(a), C("#2a2a30"));
        mb.add(new THREE.CylinderGeometry(0.26 + 0.06 * (k % 3), 0.26 + 0.06 * (k % 3), 0.03, 24).rotateX(Math.PI / 2).translate(r, y - 0.25, 0).rotateY(a), C(cols[k])); }
      buildInk(mb, this.mobile, 1); this.mobile.position.copy(W(4.5, 7.4, -1.5)); S.add(this.mobile); }
    rb.done(S); buildInk(b, S, 1);
    // fix2 (audit 2): confetti over the debut stage as the mascot strikes the bell (shot 3)
    { const N = CONF_N, cols = ["#e8382e", "#f6c833", "#2f7fe0", "#38b86a", "#f4f2ec", "#f08a2c"];
      this.confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.075, 0.04), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), N);
      for (let i = 0; i < N; i++) this.confetti.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      this.confetti.layers.set(NOINK); this.confetti.frustumCulled = false; this.confetti.visible = false; S.add(this.confetti); }
  }

  private board(m: THREE.Mesh, k: number) { this.boards.push({ m: m.material as THREE.MeshBasicMaterial, k }); m.layers.set(NOINK); return m; }
  /** one tidy stack of certificates (box: green-edged cream sides, the certificate on top) standing at local p */
  private stackMesh(S: THREE.Object3D, p: V3, seed: number, ry: number) {
    const side = TM("tkCertSide", () => rep(TP.certSideTex(), 1, 1)), top = TM("tkCertTop", () => TP.certTopTex());
    const g = new THREE.BoxGeometry(STACK.w, STACK.h, STACK.d).translate(0, STACK.h / 2, 0);
    const m = new THREE.Mesh(g, [side, side, top, side, side, side]); m.position.copy(W(p[0], p[1], p[2])); m.rotation.y = ry + (hash(seed * 3.3) - 0.5) * 0.08; m.castShadow = true; m.receiveShadow = true; S.add(m); return m;
  }

  pose(ctx: SetCtx, L: Lighting) {
    const f = ctx.f, vf = VF, id = ctx.id, name = ctx.light.name;
    const s9 = id === 9, red = s9 ? smooth((f - (BEAT.crashes - 2)) / 22) : 0;
    // ---- ticker bands: whole-cycle scroll on the video clock; red overlay in the crash ----
    for (const bd of this.bands) { const u = ((bd.n * vf) / VOICE_TOTAL) % 1; for (const t of bd.tex) t.offset.x = u; bd.m.color.setScalar(1.22 * (1 - 0.55 * red)); bd.r.opacity = red; bd.r.color.setScalar(1.25); bd.r.transparent = true; }
    // ---- the chart ----
    this.poseChart(id, f, red);
    // ---- boards: lightbox faces, a little dimmer in the museum light, warmer in the crash ----
    const kB = name === "museum" ? 0.92 : 1.0;
    for (const bo of this.boards) bo.m.color.setRGB(kB * bo.k, kB * bo.k * (1 - 0.18 * red), kB * bo.k * (1 - 0.2 * red));
    // ---- the bell rings on "starts": a damped swing + the ding arcs ----
    { const t = f - (BEAT.starts - 3), sw = t >= 0 ? 0.32 * Math.exp(-t / 16) * Math.sin(t * 0.42) : 0;
      this.bell.rotation.z = sw + 0.006 * cyc(23, vf); const dv = t >= 2 && t < 22; this.ding.visible = dv && id === 3;
      if (this.ding.visible) { const u = (t - 2) / 20; this.ding.position.copy(W(BELL[0], BELL[1] - 0.36, BELL[2] + 0.12)); this.ding.scale.setScalar(0.7 + 0.6 * outBack(clamp01(u * 2))); this.ding.rotation.y = TODAY.ry; (this.ding.material as THREE.MeshBasicMaterial).opacity = 1 - smooth((u - 0.6) / 0.4); } }
    // ---- fix2: the confetti burst (from just over the bell on the first strike; it flutters down over ~3 s) ----
    { const t = f - (BEAT.starts - 3), on = id === 3 && t >= 0 && t < 100; this.confetti.visible = on;
      if (on) { const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
        for (let i = 0; i < CONF_N; i++) {
          const a = hash(i * 3.7) * TAU, sp = 0.5 + 1.5 * hash(i * 9.1), up = 0.55 + 0.9 * hash(i * 5.3), tt = Math.max(0, t - 3 * hash(i * 2.2)), k = 1 - Math.exp(-tt / 14);
          const x = BELL[0] + 0.25 + Math.cos(a) * sp * k + 0.06 * Math.sin(tt * 0.16 + i), z = BELL[2] + 0.25 + Math.sin(a) * sp * 0.7 * k;
          const y = Math.max(0.03, BELL[1] + 0.7 + up * (1 - Math.exp(-tt / 7)) - 0.021 * tt - 0.00012 * tt * tt);
          e4.set(tt * (0.21 + 0.2 * hash(i)), tt * 0.13 + i, tt * (0.17 + 0.2 * hash(i * 1.3))); q4.setFromEuler(e4);
          m4.compose(v4.copy(W(x, y, z)), q4, s4.setScalar(tt > 0 ? 1 : 0)); this.confetti.setMatrixAt(i, m4);
        }
        this.confetti.instanceMatrix.needsUpdate = true; } }
    // ---- fix2: the plaque's number counts up to 14,500 as the narrator says it (shot 4), with a little pop on landing ----
    { const a = BEAT.itHas - 2, b = BEAT.n14500 + 26, u = id === 4 ? clamp01((f - a) / (b - a)) : 1, uq = u >= 1 ? 1 : Math.floor(u * 26) / 26;
      const n = uq >= 1 ? 14500 : Math.round((14500 * (0.35 * uq + 0.65 * uq * uq)) / 5) * 5, tex = TP.plaqueTex(n), pm = this.plaque.material as THREE.MeshBasicMaterial;
      if (pm.map !== tex) { pm.map = tex; pm.needsUpdate = true; }
      const pop = id === 4 && f >= b && f < b + 10 ? 0.07 * Math.sin(((f - b) / 10) * Math.PI) : 0; this.plaque.scale.setScalar(1 + pop); }
    // ---- museum spot ----
    const mus = name === "museum" ? 1 : ctx.shot.light === "museum" ? 1 : 0.35;
    this.coneMat.opacity = 0.9 * mus; this.coneFloor.opacity = 0.8 * mus; this.cone.visible = id !== 3 && id !== 9 ? true : true;
    this.motes.pose(vf / 30, 3); (this.motes.pts.material as THREE.PointsMaterial).opacity = 0.35 + 0.65 * mus;
    // ---- the shot-7 tower ----
    this.poseTower(id, f, vf);
    // ---- the mobile turns, glints slide over the drum glass ----
    this.mobile.rotation.y = vph(0.12);
    this.streak.offset.x = ((2 * vf) / VOICE_TOTAL) % 1;
    this.floorGlow.color.setRGB(0.05 * (1 - red) + 0.4 * red, 0.32 * (1 - red) + 0.04 * red, 0.14 * (1 - red) + 0.03 * red);
    // ---- light pools / zones ----
    const gk = 1 - red;
    L.pool([O[0] + DC[0] + Math.sin(CH_A) * (DR + 1.0), 0.9, O[2] + DC[2] + Math.cos(CH_A) * (DR + 1.0)], [0.08 * gk + 0.5 * red, 0.42 * gk + 0.04 * red, 0.18 * gk + 0.04 * red], 6.0);
    L.pool([O[0] + DC[0] + 3.4, 1.6, O[2] + DC[2] + 3.2], [0.06 * gk + 0.4 * red, 0.3 * gk + 0.03 * red, 0.14 * gk + 0.03 * red], 4.5);
    L.pool([O[0] + DC[0] - 3.2, 1.6, O[2] + DC[2] + 3.0], [0.06 * gk + 0.4 * red, 0.3 * gk + 0.03 * red, 0.14 * gk + 0.03 * red], 4.5);
    L.pool([O[0] + PED[0], LB.pedestal.h + 1.0, O[2] + PED[2] + 0.3], [0.9 * mus, 0.62 * mus, 0.32 * mus], 2.4);
    if (mus > 0.9) {
      // the museum: the key exists only inside the spot cone round the pedestal (and the tower beside it)
      L.zone(0, [O[0] + PED[0] + 0.5, LB.pedCeil - 0.2, O[2] + PED[2]], [3.0, 5.2, Math.cos(0.32), 7.5], [0, -1, 0, Math.cos(0.5)]);
      L.pool([O[0] + B41.c[0] + 0.6, B41.c[1], O[2] + B41.c[2]], [0.5, 0.42, 0.3], 2.6);
      if (id === 7) {
        // fix4 (3): shot 7: the spot opens wide over the pedestal AND the paper wall, warm fill on the wall + the lobby
        L.zone(0, [O[0] + PED[0] + 1.2, LB.pedCeil - 0.2, O[2] + PED[2] - 1.3], [3.0, 5.2, Math.cos(0.8), 7.5], [0, -1, 0, Math.cos(1.05)]);
        L.pool([O[0] + TW[0] + 1.6, 2.0, O[2] + TW[2] - 0.9], [1.0, 0.86, 0.6], 4.2);
        L.pool([O[0] + TW[0] + 3.2, 2.6, O[2] + TW[2] + 2.4], [0.5, 0.5, 0.62], 6.5);
        L.pool([O[0] + PED[0] - 1.5, 2.4, O[2] + PED[2] + 2.2], [0.42, 0.46, 0.7], 6.0);
      }
    }
  }

  private poseChart(id: number, f: number, red: number) {
    if (id === 9) {
      const s = SHOTS[8], a = s.a - 8, b = s.b + 8, hit = BEAT.floor - 5, tc = BEAT.crashes - 1;
      const N = 90, pts: number[] = [];
      // the window: the past (x 0..0.58) is history, time runs over x 0.58..1 across the shot
      const p = (t: number) => {
        if (t < tc) return 0.8 + 0.05 * Math.sin(t * 0.21) + 0.03 * Math.sin(t * 0.77 + 1);
        const g = 0.8 / ((hit - tc) ** 2);
        if (t < hit) return Math.max(0, 0.8 + 0.05 * Math.sin(tc * 0.21) + 0.03 * Math.sin(tc * 0.77 + 1) - g * (t - tc) ** 2);
        const tb = t - hit, up = 0.16 * Math.max(0, Math.sin(Math.PI * tb / 11)) * (tb < 11 ? 1 : 0); return up;
      };
      for (let i = 0; i <= N; i++) { const x = i / N, t = x < 0.58 ? a - (0.58 - x) * 400 : a + ((x - 0.58) / 0.42) * (b - a); pts.push(p(t)); }
      const upto = 0.58 + 0.42 * clamp01((f - a) / (b - a));
      const fk = f >= hit ? Math.exp(-(f - hit) / 8) + 0.35 : 0;
      this.chart.draw(pts, upto, fk, red, f >= hit ? "PRICE: FLOOR" : "J-COM", "FLOOR");
    } else {
      const s = SHOTS[2], a = s.a - 8, b = s.b + 8, N = 60, pts: number[] = [];
      for (let i = 0; i <= N; i++) { const x = i / N; pts.push(0.32 + 0.4 * x + 0.05 * Math.sin(i * 1.3) + 0.03 * Math.sin(i * 2.9)); }
      const upto = id === 3 ? 0.12 + 0.8 * clamp01((f - a) / (b - a)) : 0.92;
      this.chart.draw(pts, upto, -1, 0, "J-COM", "");
    }
  }

  private poseTower(id: number, f: number, vf: number) {
    const on = id === 7, n = on ? towerN(f) : 0, hitF = fHit();
    // heights from the bottom: stack k (k = 0 the first, on top) sits on every later one
    const SH = STACK.h * WALL_K, tot = on ? towerTop(f) : 0;
    const sway = on ? 0.05 * Math.sin(((f - T0) / 30) * TAU * 0.7) * smooth((f - T0) / 20) + 0.02 * cyc(41, vf) : 0;
    for (let k = 0; k < 41; k++) {
      const m = this.stacks[k], g = clamp01(n - k), [c, r] = slot(k); m.visible = on && g > 0.002;
      if (!m.visible) continue;
      // each stack drops into its slot (a small squash-in), the whole wall leans / wobbles more the higher the row
      const yy = r * SH, hh = (yy + SH / 2) / 4.4, bend = 2.2 * sway * hh ** 1.5 * (1 + 0.25 * Math.sin(c * 1.9 + f * 0.11));
      m.position.copy(W(TW[0] + 0.3 * bend + (hash(k * 1.7) - 0.5) * 0.05, yy + 0.25 * (1 - outBack(g, 1.6)), TW[2] - c * WALL_P - bend + (hash(k * 2.9) - 0.5) * 0.035));
      m.scale.set(WALL_K, WALL_K * Math.max(0.05, 0.4 + 0.6 * g), WALL_K);
      m.rotation.x = 0.45 * bend + (hash(k * 4.3) - 0.5) * 0.03;
    }
    // the ceiling: tiles over the tower pop when its top arrives; the cap tile rides up and slides off
    const th = f - hitF, hit = on && th >= 0;
    for (const t of this.tiles) { const [i, j] = t.userData.ij as number[], hk = hash(i * 3 + j * 7 + 11);
      if (!hit) { t.position.y = O[1] + LB.pedCeil - 0.008; t.rotation.set(0, 0, 0); continue; }
      const u = clamp01(th / 10), drop = (0.06 + 0.16 * hk) * outBack(u, 2.4);
      t.position.y = O[1] + LB.pedCeil - 0.008 - drop; t.rotation.set(Math.PI * 0 + j * 0.25 * hk * u, 0, -i * 0.3 * hk * u); }
    { const c = this.capTile, fl = this.floorTile, top = tot;
      c.visible = true; fl.visible = true;
      if (!hit) { c.position.copy(W(TW[0], LB.pedCeil - 0.02, TW[2])); c.rotation.set(0, 0, 0); fl.position.copy(W(TW[0], MZ_TOP - 0.02, TW[2])); fl.rotation.set(0, 0, 0); }
      else {
        const lift = Math.min(top, MZ_TOP + 0.75), tip = clamp01((top - (MZ_TOP + 0.75)) / 0.6);
        c.position.copy(W(TW[0] - 0.5 * tip * tip, lift + 0.015 - 0.6 * tip * tip, TW[2] + 0.2 * tip)); c.rotation.set(0.3 * tip, 0, 1.2 * tip);
        const u = clamp01(th / 14); fl.position.copy(W(TW[0] - 0.9 * u, MZ_TOP - 0.02 + 0.9 * Math.sin(Math.PI * u) + 0.03 * u, TW[2] + 0.5 * u)); fl.rotation.set(0.6 * u, 0.4 * u, 1.9 * u * (u < 1 ? 1 : 1));
      }
    }
    this.dust.forEach((d, k) => { const below = k < 6, u = (th - (k % 3) * 2) / 18; d.visible = hit && u > 0 && u < 1;
      if (!d.visible) return; const a = hash(k * 5.1) * TAU, r = 0.25 + 0.9 * u;
      d.position.copy(W(TW[0] + Math.cos(a) * r * 0.8, below ? LB.pedCeil - 0.15 - 0.9 * u * u : MZ_TOP + 0.2 + 0.5 * u, TW[2] + Math.sin(a) * r * 0.8)); d.scale.setScalar(0.5 + 1.3 * u);
      (d.material as THREE.SpriteMaterial).opacity = 0.8 * Math.sin(Math.PI * u) ** 0.7; });
    // the banner: dim until "41", then it lights (a quick pop), held
    { const u = clamp01((f - (BEAT.more - 3)) / 8), k = id === 7 ? 0.25 + 0.75 * u : 1; this.b41.scale.setScalar(id === 7 ? 0.9 + 0.1 * outBack(u, 2.2) : 1);
      const m = this.b41.material as THREE.MeshBasicMaterial; m.color.multiplyScalar(k); }
  }
}

function stanchion(b: Batch, x: number, z: number) {
  const brass = C("#c8a050");
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9).translate(0, 0.45, 0), brass, M(O[0] + x, 0, O[2] + z));
  b.add(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16), brass, M(O[0] + x, 0, O[2] + z));
  b.add(new THREE.SphereGeometry(0.05, 12, 8), brass, M(O[0] + x, 0.92, O[2] + z));
}

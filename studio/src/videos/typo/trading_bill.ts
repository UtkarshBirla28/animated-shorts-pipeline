// SHOT 12 "THE BILL" props of the trading room (owner TRADING), keyed to BEAT: the toy BUYBACK TRUCKS (white, a plain
// blue stripe, no logos) roll in through the door along the aisle with certificate stacks ("Mizuho bought most shares
// back."); a cloud of translucent GHOST certificates floats up and each flips into a brown CASH ENVELOPE on "cash" that
// drifts down onto the desks ("...never existed, so it paid cash instead."); the printer spits a long RECEIPT that runs
// across the floor and out of the door, its TOTAL settling in the aisle ("The bill: about ¥40 billion.").
import * as THREE from "three";
import { TR, type V3 } from "./plan";
import { BEAT } from "./beats";
import { C, TM, basic, lam, contact, hash, TAU, sm, clamp01, outBack, lerp, vs, Batch } from "./setkit";
import { NOINK } from "./ink";
import * as P from "./trading_paint";

const o = TR.base;
const Wp = (x: number, y: number, z: number) => new THREE.Vector3(o[0] + x, o[1] + y, o[2] + z);
/** the receipt's path (set-local): out of the printer's front slot, a drape to the floor, along the aisle, out of the door */
export const PRINTER_MOUTH: V3 = [TR.printer[0], 0.86, TR.printer[2] + 0.27];
export const AISLE_Z = 2.75, TRUCK_Z = 3.4;
const pathPts = (): THREE.Vector3[] => {
  const m = PRINTER_MOUTH, pts: THREE.Vector3[] = [];
  const add = (x: number, y: number, z: number) => pts.push(new THREE.Vector3(x, y, z));
  add(m[0], m[1], m[2]); add(m[0], m[1] - 0.02, m[2] + 0.1);
  // the drape: a falling curl down the stand's front to the floor
  for (let k = 1; k <= 8; k++) { const u = k / 8; add(m[0], m[1] * (1 - u) ** 1.6 + 0.004 * u, m[2] + 0.1 + 0.32 * Math.sin((u * Math.PI) / 2)); }
  // along the floor in +z, then a quarter turn into the aisle (+x)
  const z0 = m[2] + 0.42, R = 0.8, zc = AISLE_Z - R;
  add(m[0], 0.004, Math.max(z0 + 0.05, zc - 0.05));
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * (Math.PI / 2); add(m[0] + R - R * Math.cos(a), 0.004, zc + R * Math.sin(a)); }
  // the aisle run to the door, a soft S into the door opening, out into the corridor
  for (let x = m[0] + R + 0.6; x < 7.6; x += 0.6) add(x, 0.004, AISLE_Z);
  for (let k = 1; k <= 6; k++) { const u = k / 6; add(7.6 + 1.3 * u, 0.004, AISLE_Z + (TR.door.c[2] - AISLE_Z) * sm(u)); }
  add(9.6, 0.004, TR.door.c[2]); add(11.5, 0.004, TR.door.c[2]);
  return pts;
};
/** arc-length sampled path */
class Path {
  p: THREE.Vector3[] = []; s: number[] = []; len = 0;
  constructor(pts: THREE.Vector3[], step = 0.04) {
    const c = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.3), n = Math.ceil(c.getLength() / step);
    this.p = c.getSpacedPoints(n); let acc = 0; this.s = this.p.map((q, i) => (i ? (acc += q.distanceTo(this.p[i - 1])) : 0)); this.len = acc;
  }
  at(s: number, out: THREE.Vector3) {
    const S = Math.max(0, Math.min(this.len, s)); let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= S) lo = m; else hi = m; }
    const k = (S - this.s[lo]) / Math.max(1e-6, this.s[hi] - this.s[lo]); return out.copy(this.p[lo]).lerp(this.p[hi], k);
  }
}
/** a ribbon over the path between path distances a..b; v from the paper coordinate (lead end = 0) */
class Ribbon {
  mesh: THREE.Mesh; pos: Float32Array; uv: Float32Array; nrm: Float32Array; N = 240; clampV = false;
  constructor(parent: THREE.Object3D, mat: THREE.Material) {
    const g = new THREE.BufferGeometry(), n = this.N + 1;
    this.pos = new Float32Array(n * 2 * 3); this.uv = new Float32Array(n * 2 * 2); this.nrm = new Float32Array(n * 2 * 3);
    const idx: number[] = []; for (let i = 0; i < this.N; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    g.setIndex(idx); g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2)); g.setAttribute("normal", new THREE.BufferAttribute(this.nrm, 3));
    this.mesh = new THREE.Mesh(g, mat); this.mesh.userData.ink = 0; this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true; parent.add(this.mesh);
  }
  /** s0..s1 = visible path range, paper coordinate p = L - s, v = 1 - (p - p0) / vScale (the text's up = the lead end) */
  set(path: Path, s0: number, s1: number, L: number, p0: number, vScale: number, w: number, lift: (s: number) => number) {
    const A = new THREE.Vector3(), B = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3(), Nn = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const vis = s1 > s0 + 1e-3; this.mesh.visible = vis; if (!vis) return;
    for (let i = 0; i <= this.N; i++) {
      const s = s0 + ((s1 - s0) * i) / this.N; path.at(s, A); path.at(s + 0.02, B); T.copy(B).sub(A).normalize();
      if (T.lengthSq() < 0.5) T.set(1, 0, 0);
      S.crossVectors(T, up); if (S.lengthSq() < 1e-4) S.set(1, 0, 0); S.normalize(); Nn.crossVectors(S, T).normalize();
      const y = lift(s), j = i * 2;
      for (let e = 0; e < 2; e++) {
        const sd = (e ? 0.5 : -0.5) * w, q = (j + e) * 3;
        this.pos[q] = o[0] + A.x + S.x * sd + Nn.x * y; this.pos[q + 1] = o[1] + A.y + S.y * sd + Nn.y * y; this.pos[q + 2] = o[2] + A.z + S.z * sd + Nn.z * y;
        this.nrm[q] = Nn.x; this.nrm[q + 1] = Nn.y; this.nrm[q + 2] = Nn.z;
        this.uv[(j + e) * 2] = e ? 1 : 0; const v = 1 - ((L - s) - p0) / vScale; this.uv[(j + e) * 2 + 1] = this.clampV ? Math.max(0.002, Math.min(0.998, v)) : v;
      }
    }
    const g = this.mesh.geometry; (g.attributes.position as THREE.BufferAttribute).needsUpdate = true; (g.attributes.uv as THREE.BufferAttribute).needsUpdate = true; (g.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    g.computeBoundingSphere();
  }
}

type Truck = { g: THREE.Group; wheels: THREE.Mesh[]; i: number };
type Ghost = { m: THREE.Mesh; env: THREE.Mesh; x: number; z: number; y: number; t0: number; flip: number; land: V3; ph: number; tilt: number };

export class Bill {
  readonly group = new THREE.Group();
  private trucks: Truck[] = [];
  private ghosts: Ghost[] = [];
  private path = new Path(pathPts());
  private body: Ribbon; private end: Ribbon;
  private paperL = 0;
  /** desk-top landing spots for the envelopes (x, top y, z), from the room builder */
  constructor(parent: THREE.Object3D, deskSpots: V3[]) {
    parent.add(this.group);
    this.buildTrucks();
    this.buildGhosts(deskSpots);
    // the paper reads as a board: unlit, tinted per light in pose (paperCol)
    const bm = basic("trRcptBodyM", () => ({ map: P.receiptBodyTex(), side: THREE.DoubleSide }));
    const em = basic("trRcptEndM", () => ({ map: P.receiptEndTex(), side: THREE.DoubleSide }));
    this.body = new Ribbon(this.group, bm); this.end = new Ribbon(this.group, em); this.end.clampV = true;
  }
  /** total paper (lead end to the TOTAL's tail margin) */
  static readonly BODY = 13.4;
  static readonly MARGIN = 2.5;
  private buildTrucks() {
    const white = C("#f2f2ee"), side = TM("trTruckSideM", P.truckSideTex), dark = C("#22252c"), glass = C("#6a88aa"), hub = C("#b8bcc4");
    const cert = TM("trCertSideM", P.certSideTex), certTop = TM("trCertTopM", P.certTex), lamp = basic("trTruckLamp", () => ({ color: new THREE.Color(1.6, 1.5, 1.2) }));
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group(), b = new Batch();
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => b.add(geo, m, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
      // local: the truck drives toward -x (its front at -x); cab at the front, a flatbed with certificate stacks behind
      add(new THREE.BoxGeometry(0.2, 0.2, 0.3), white, -0.27, 0.17, 0);
      add(new THREE.BoxGeometry(0.02, 0.1, 0.24), glass, -0.37, 0.21, 0);
      add(new THREE.BoxGeometry(0.12, 0.07, 0.31), side, -0.27, 0.13, 0);
      add(new THREE.BoxGeometry(0.56, 0.05, 0.3), white, 0.06, 0.09, 0);
      add(new THREE.BoxGeometry(0.4, 0.06, 0.305), side, 0.13, 0.135, 0);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.03, 0.05), lamp, -0.375, 0.12, s * 0.1);
      // certificate stacks (2-3 per truck, a red paper band)
      const nS = 2 + (i % 2);
      for (let k = 0; k < nS; k++) { const h = 0.12 + 0.05 * hash(i * 7 + k), x = -0.06 + k * 0.13; add(new THREE.BoxGeometry(0.11, h, 0.15), cert, x, 0.165 + h / 2, -0.06 + (k % 2) * 0.12 - 0.03);
        add(new THREE.PlaneGeometry(0.11, 0.15).rotateX(-Math.PI / 2), certTop, x, 0.166 + h, -0.06 + (k % 2) * 0.12 - 0.03); }
      // fix2 (audit 5): "Mizuho bought most shares back." gets its picture: a BOUGHT / BACK placard on two sticks over the
      // cargo, facing the way the truck drives (toward the lens)
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.2, 0.012), dark, 0.1, 0.3, s * 0.1);
      const grp = new THREE.Group(); b.build(grp, true); for (const c of grp.children) g.add(c);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24).rotateY(-Math.PI / 2), basic("trBoughtM", () => ({ map: P.boughtTex(), color: new THREE.Color(1.0, 0.9, 0.78), side: THREE.DoubleSide })));
      sign.position.set(0.092, 0.5, 0); sign.layers.set(NOINK); g.add(sign);
      const wheels: THREE.Mesh[] = [];
      for (const [x, z] of [[-0.24, 0.15], [-0.24, -0.15], [0.2, 0.15], [0.2, -0.15]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16).rotateX(Math.PI / 2), dark); w.position.set(x, 0.055, z); w.castShadow = true; g.add(w); wheels.push(w);
        const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.045, 10).rotateX(Math.PI / 2), hub); w.add(h2);
      }
      contact(g, [0, 0.004, 0], 0.75, 0.42, 0.42);
      g.scale.setScalar(1.65); g.visible = false; this.group.add(g); this.trucks.push({ g, wheels, i });
    }
  }
  private buildGhosts(spots: V3[]) {
    const gm = basic("trGhostM", () => ({ map: P.ghostTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 1, color: new THREE.Color(1.1, 1.3, 1.45) }));
    const em = lam("si:trEnvM", () => ({ map: P.envelopeTex(), side: THREE.DoubleSide }));
    const N = 48, near = spots.filter((s) => s[0] > -5.8 && s[0] < 3.8), sp = near.length ? near : spots;
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), gm); m.layers.set(NOINK); m.renderOrder = 7; m.visible = false; this.group.add(m);
      const env = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), em); env.castShadow = true; env.visible = false; this.group.add(env);
      const land = sp[Math.floor(hash(i * 7.3) * sp.length)], jx = (hash(i * 3.3) - 0.5) * 0.9, jz = (hash(i * 5.1) - 0.5) * 0.4;
      this.ghosts.push({ m, env, x: -1.9 + hash(i * 1.7) * 6.6, z: 1.7 + hash(i * 2.9) * 2.5, y: 1.45 + hash(i * 4.3) * 1.2,
        t0: BEAT.n96k - 22 + hash(i * 6.1) * 40, flip: BEAT.cash - 2 + hash(i * 8.7) * 10, land: [land[0] + jx, land[1] + 0.004 + (i % 3) * 0.003, land[2] + jz], ph: hash(i * 9.9) * TAU, tilt: (hash(i * 4.4) - 0.5) * 0.6 });
    }
  }
  /** the paper's (unlit) tint for the light of the frame */
  setPaper(r: number, g: number, b: number) {
    for (const m of [this.body.mesh.material, this.end.mesh.material] as THREE.MeshBasicMaterial[]) m.color.setRGB(r, g, b);
  }
  pose(id: number, f: number, cam: THREE.Camera) {
    const on = id === 12; this.group.visible = on; if (!on) return;
    this.poseTrucks(f); this.poseGhosts(f, cam); this.poseReceipt(f);
  }
  /** the convoy: in through the door (from x ~10) along the truck lane, a little bounce as each stops near the hero desk */
  private poseTrucks(f: number) {
    const t0 = BEAT.mizuho2 - 26, dur = BEAT.back + 8 - t0;
    for (const T of this.trucks) {
      const stop = 0.1 + T.i * 1.45, start = 11.6 + T.i * 1.45, u = clamp01((f - t0 - T.i * 3) / dur), e = 1 - (1 - u) ** 2.2;
      let x = lerp(start, stop, e), z = TRUCK_Z, yaw = 0;
      // through the door the convoy comes from the corridor at the door's z, then swings onto the lane
      const dz = TR.door.c[2] - TRUCK_Z, k = sm((x - 7.2) / 1.8); z = TRUCK_Z + dz * k; yaw = -Math.atan2(dz * (sm((x - 7.2 + 0.05) / 1.8) - sm((x - 7.2 - 0.05) / 1.8)) / 0.1, 1) * 0.9;
      const settle = u >= 1 ? 0 : 0, d = f - (t0 + T.i * 3 + dur), bounce = d > 0 && d < 14 ? 0.012 * Math.sin(d * 0.9) * Math.exp(-d / 5) : 0;
      T.g.visible = x < 9.6; T.g.position.set(o[0] + x, o[1] + bounce + settle, o[2] + z); T.g.rotation.set(0, yaw, d > 0 && d < 14 ? 0.04 * Math.sin(d * 0.9) * Math.exp(-d / 5) : 0);
      const roll = (start - x) / (0.055 * 1.65); for (const w of T.wheels) w.rotation.z = roll;
    }
  }
  /** ghosts rise (staggered from "96,000"), bob; on "cash" each flips (10 f) into an envelope that flutters down */
  private poseGhosts(f: number, cam: THREE.Camera) {
    const cp = cam.position;
    for (const G of this.ghosts) {
      const rise = clamp01((f - G.t0) / 34), fl = clamp01((f - G.flip) / 10);
      const y = lerp(0.3, G.y, 1 - (1 - rise) ** 2.5) + 0.05 * Math.sin(f * 0.11 + G.ph);
      const x = G.x + 0.06 * Math.sin(f * 0.07 + G.ph * 2), z = G.z + 0.05 * Math.cos(f * 0.09 + G.ph);
      const yaw = Math.atan2(cp.x - (o[0] + x), cp.z - (o[2] + z)) + 0.25 * Math.sin(f * 0.05 + G.ph);
      // the flip: the ghost card turns edge-on (0..0.5), the envelope turns from edge-on to face (0.5..1)
      const gOn = f >= G.t0 && fl < 0.5, eOn = fl >= 0.5;
      G.m.visible = gOn;
      if (gOn) { G.m.position.set(o[0] + x, o[1] + y, o[2] + z); G.m.rotation.set(0, yaw + Math.PI * fl, G.tilt * 0.4); G.m.scale.set(Math.max(0.02, Math.cos(Math.PI * fl)), 1, 1).multiplyScalar(1.3 * (0.6 + 0.4 * outBack(rise))); }
      G.env.visible = eOn;
      if (eOn) {
        const dt = f - (G.flip + 5), fall = clamp01((dt - 4) / 34), ef = fall * fall * (3 - 2 * fall);
        const L = G.land, px = lerp(x, L[0], ef) + (1 - ef) * 0.18 * Math.sin(dt * 0.21 + G.ph), py = lerp(y, L[1], ef), pz = lerp(z, L[2], ef) + (1 - ef) * 0.1 * Math.cos(dt * 0.17 + G.ph);
        G.env.position.set(o[0] + px, o[1] + py, o[2] + pz);
        const flat = sm((fall - 0.55) / 0.45), sway = (1 - flat) * 0.5 * Math.sin(dt * 0.25 + G.ph);
        const sc = Math.max(0.02, Math.min(1, (fl - 0.5) * 2));
        G.env.rotation.set(-Math.PI / 2 * flat + (1 - flat) * 0.25, (1 - flat) * (yaw + Math.PI) + flat * G.ph, sway, "YXZ"); G.env.scale.set(sc, 1, 1);
      }
    }
  }
  /** the paper: L = paper out of the printer (m); it whooshes out on "The bill", the lead end races out of the door,
   *  then the TOTAL slides into the aisle and settles on "¥40" (the printer stops) */
  private poseReceipt(f: number) {
    const a = BEAT.theBill - 4, land = BEAT.forty2 + 8, LTOT = Bill.BODY + P.RECEIPT_END + Bill.MARGIN;
    const u = clamp01((f - a) / (land - a)), L = LTOT * (1 - (1 - u) ** 2.4);
    this.paperL = L;
    const S = this.path.len;
    // body: paper coordinate p in [0, BODY] -> s = L - p
    const lift = (s: number) => (s > 1.4 ? 0.006 + 0.012 * Math.max(0, Math.sin(s * 2.1 + 0.4)) * Math.min(1, (s - 1.4) / 2) : 0.004);
    this.body.set(this.path, Math.max(0, L - Bill.BODY), Math.min(S, L), L, 0, P.RECEIPT_TILE, P.RECEIPT_W, lift);
    this.end.set(this.path, Math.max(0, L - Bill.BODY - P.RECEIPT_END - Bill.MARGIN), Math.min(S, Math.max(0, L - Bill.BODY)), L, Bill.BODY, P.RECEIPT_END, P.RECEIPT_W, lift);
  }
  /** where the TOTAL lines rest at the end (world), for the camera */
  totalAt(): THREE.Vector3 {
    const LTOT = Bill.BODY + P.RECEIPT_END + Bill.MARGIN, s = LTOT - Bill.BODY - P.RECEIPT_END * 0.35;
    return this.path.at(s, new THREE.Vector3()).add(Wp(0, 0, 0));
  }
}
/** the path distance of the TOTAL's centre once the paper has settled (for cams / QA; no THREE scene needed) */
export const totalRest = () => { const p = new Path(pathPts()), s = Bill.MARGIN + P.RECEIPT_END * 0.65; return p.at(s, new THREE.Vector3()); };
void vs;

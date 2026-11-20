// THE CAMPUS SQUARE (owner WORLD): the ONE set of "The Clown Nobody Saw". Every shot is an angle inside it.
//  - the herringbone red-brick plaza (wear, joints, petals, drains), the cream-edged walkway, the pale stone lap ring
//  - THE SCULPTURE: our own dark-blue cube standing on a corner, round cut-outs, on three brick piers
//  - THE TREE with the money branch and the three bills (square_tree.ts)
//  - north: the LIBRARY (tall windows, the CLOCK tower); east: the ARTS building; west: the hedge + leafy trees (the
//    background of the money close-up), then the low wall with the open view (bay, far hills) = the clean sky behind
//    the bills in the opening framing; evergreen hills behind the buildings
//  - the banner lamp posts, the bike rack, benches, the fountain (moving water), the study corner's table + sign
//  - life on the LOOP clock (whole cycles over the film): pigeons, far students, banners, leaves, drifting petals, the
//    cloud shadow, the fountain; the facade clock spins one hour on "So for an hour"; the channel's crow on the lamp
// Pose is a pure function of (shot, frame). Anchors: plan.ts SQ. Nothing tall stands in the wedge behind the bills.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import { boxGeo, prop } from "./build";
import type { Lighting, SetModule } from "./sets";
import { SQ, STORY, STUDY, loopPh, LOOP, type V3 } from "./plan";
import { BEAT, SID } from "./beats";
import { Batch, RB, C, TM, faceMesh, buildInk, M, NOINK, TAU, hash, clamp01, sm, V, basic, contact, lerp, lam } from "./setkit";
import { twoTone } from "./shade";
/** a two-tone lit material from a plain colour, double-sided (the bunting's pennants) */
const lamD = (hex: string) => lam("sqPen:" + hex, () => ({ color: hex, side: THREE.DoubleSide }));
import { rep, pigeonTex, parkWood, birdTex } from "./paint";
import * as SP from "./square_paint";
import { MoneyTree } from "./square_tree";
import { SquareP3 } from "./square_p3";
import { P3_OFF } from "./foliage";

const PZ = SQ.plaza;
/** lamp posts with banners [x, z, banner colour, banner side (+1 = arm toward +x)] */
/* LOOK v2: navy + forest-green banners (no teal: the hero owns it) */
const LAMPS: [number, number, string, number][] = [[SQ.lamp[0], SQ.lamp[2], "#2f6a4a", -1], [6.7, -12.5, "#2f4f86", -1], [9.5, -23, "#2f6a4a", -1], [9.5, 3.5, "#2f4f86", -1], [9.5, 15.6, "#2f6a4a", -1], [7.4, -31, "#2f4f86", -1]];
/** blossom trees [x, z, height] (east side, by the arts building, and two by the library) */
const CHERRIES: [number, number, number][] = [[9.2, -2.0, 4.6], [9.4, -9.6, 5.0], [9.2, -17.5, 4.4], [9.3, 12.4, 4.8], [9.4, 19.6, 4.6], [12.5, -35.2, 4.6], [17.5, -35.4, 5.0]];
/** pigeons [x, z, facing, phase] : the foreground of the opening frame, the fountain rim, the study corner */
const PIGEONS: [number, number, number, number][] = [[0.9, 11.6, 1, 0.1], [0.35, 10.7, -1, 0.5], [1.5, 10.2, 1, 0.8], [-0.6, 12.3, -1, 0.3], [2.6, 6.3, 1, 0.65], [-3.2, -19.6, -1, 0.2], [-2.3, -20.1, 1, 0.9], [6.2, 12.4, -1, 0.4]];
/** far students as painted figures [x, y, z, variant, pose (0 stand, 1 walk, 2 sit), height] */
const STUDENTS: [number, number, number, number, number, number][] = [
  [-4.9, 0.3, -21.6, 0, 2, 1.5], [-2.0, 0.3, -24.2, 3, 2, 1.5], [9.9, 0.46, -14.2, 1, 2, 1.55], [9.9, 0.46, -15.0, 4, 2, 1.55],
  [14.5, 0.0, -34.6, 5, 0, 1.66], [-6.7, 0.6, -30.0, 4, 2, 1.5],   /* none on the tower steps: a face showed through the cube's cut-out */
];

/** a cube face with a round cut-out: a square plate (edge e, thickness t) with a hole of radius r, centred, facing +z */
const plateGeo = (e: number, r: number, t: number, ox = 0, oy = 0) => {
  const s = new THREE.Shape(); s.moveTo(-e / 2, -e / 2); s.lineTo(e / 2, -e / 2); s.lineTo(e / 2, e / 2); s.lineTo(-e / 2, e / 2); s.closePath();
  const h = new THREE.Path(); h.absarc(ox, oy, r, 0, TAU, true); s.holes.push(h);
  /* a tiny bevel: three r175 builds NO caps for an un-bevelled extrusion here */
  return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1, curveSegments: 40 }).translate(0, 0, -t - 0.008);
};
/** painted steel for the cube (1 m tile): deep cobalt, brushed streaks, a few scuffs */
const steelTex = () => SP.steelTex();

export class SquareSet implements SetModule {
  readonly sets = ["square" as const];
  readonly group = new THREE.Group();
  private tree = new MoneyTree();
  private pigeons: THREE.Sprite[] = [];
  private students: THREE.Sprite[] = [];
  private banners: THREE.Mesh[] = [];
  private jets: THREE.Mesh[] = []; private jetMap!: THREE.Texture; private pool!: THREE.Texture;
  private hands: THREE.Mesh[] = [];
  private petals: THREE.Sprite[] = [];
  private hills: THREE.MeshBasicMaterial[] = [];
  private crow!: THREE.Sprite;
  private walkers: THREE.Sprite[] = [];
  /* LOOK v2 */
  private birds: THREE.Sprite[] = [];
  private pennants: { m: THREE.Mesh; ph: number }[] = [];
  private s19 = new THREE.Group(); private s19Mat: THREE.MeshLambertMaterial[] = [];
  private umbrella!: THREE.Object3D;
  private clip = new THREE.Group(); private clipPage!: THREE.Mesh;
  private p3!: SquareP3;   /* p3 polish: foliage, air, the far north-west, small motion, ground (square_p3.ts) */

  constructor(kit: Kit) {
    const S = this.group, rb = new RB(SQ.base), b = new Batch(), bd = new Batch();
    const tbox = (mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile: number, cast = true) =>
      (cast ? rb.cast : rb.flat).add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile), mat);
    /* LOOK v2: calmer, redder wall brick; the dark brick (piers, pilasters) cooler; the far LIBRARY + tower a hazed, low-chroma
     * brick (they sit 40-55 m back and must never carry the clown's hair hue behind him) */
    const brickW = TM("sqWall2", () => SP.wallTex()), brickD = TM("sqWallD2", () => SP.wallTex("sqWallD2", ["#7a4a46", "#704440", "#82524c", "#683e3c"], "#b8a898"));
    const brickF = TM("sqWallF", () => SP.wallTex("sqWallF", ["#9c7a70", "#927268", "#a68278", "#8c6e66"], "#cfc2b2"));
    const cream = TM("sqCream", () => SP.creamTex()), creamD = TM("sqCreamD", () => SP.creamTex("sqCreamD", "#cfc2a6"));
    const teal = C("#4a6488"), tealD = C("#34465e"), dark = C("#2a2c3c");   /* LOOK v2: slate blue (was teal #2f7f86 / #245f68) */

    // ---------------- ground ----------------
    rb.flatY(TM("sqLawnM2", () => rep(SP.lawnTex(), 1, 1), { color: "#a4ae9c" }), -900, 900, -900, 400, -0.06, 1, 14, 14);   /* LOOK v2: a calm mown lawn (no flat lime) */
    rb.flatY(TM("sqHerring", () => SP.herringTex()), PZ.x0 - 0.2, PZ.x1 + 0.2, PZ.z0 - 0.3, PZ.z1 + 2, 0, 1, 4.6, 4.6);
    // the wear map: one big multiply layer over the plaza (never inked, no depth write)
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(PZ.x1 - PZ.x0, PZ.z1 - PZ.z0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: SP.wearTex(), transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, fog: false }));
      m.position.set((PZ.x0 + PZ.x1) / 2, 0.006, (PZ.z0 + PZ.z1) / 2); m.layers.set(NOINK); m.renderOrder = 1; S.add(m); }
    // the walkway: a paved band along SQ.path (2.2 m wide, mitred corners), texture running along it
    { const pts = SQ.path, W = 1.0, g = new THREE.BufferGeometry(), pos: number[] = [], uv: number[] = [], nor: number[] = [];
      const dir = (i: number) => { const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], dx = c[0] - a[0], dz = c[2] - a[2], n = Math.hypot(dx, dz) || 1; return [dx / n, dz / n]; };
      const L: number[][] = [], Rr: number[][] = [], vv: number[] = []; let acc = 0;
      // subdivide the polyline so the corners round a little
      const fine: V3[] = [];
      for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < 8; k++) fine.push([lerp(pts[i][0], pts[i + 1][0], k / 8), 0, lerp(pts[i][2], pts[i + 1][2], k / 8)]);
      fine.push(pts[pts.length - 1]);
      const smo = fine.map((p, i) => { let x = 0, z = 0, n = 0; for (let k = -3; k <= 3; k++) { const q = fine[Math.max(0, Math.min(fine.length - 1, i + k))]; x += q[0]; z += q[2]; n++; } return i === 0 || i === fine.length - 1 ? p : ([x / n, 0, z / n] as V3); });
      const d2 = (i: number) => { const a = smo[Math.max(0, i - 1)], c = smo[Math.min(smo.length - 1, i + 1)], dx = c[0] - a[0], dz = c[2] - a[2], n = Math.hypot(dx, dz) || 1; return [dx / n, dz / n]; };
      smo.forEach((p, i) => { const [dx, dz] = d2(i); if (i) acc += Math.hypot(p[0] - smo[i - 1][0], p[2] - smo[i - 1][2]); L.push([p[0] + dz * W, p[2] - dx * W]); Rr.push([p[0] - dz * W, p[2] + dx * W]); vv.push(acc / 2.0); });
      for (let i = 0; i + 1 < smo.length; i++) {
        const quadP = [[L[i], 0, vv[i]], [Rr[i], 1, vv[i]], [Rr[i + 1], 1, vv[i + 1]], [L[i], 0, vv[i]], [Rr[i + 1], 1, vv[i + 1]], [L[i + 1], 0, vv[i + 1]]] as [number[], number, number][];
        for (const [q, u, v] of quadP) { pos.push(q[0], 0.012, q[1]); uv.push(u, v); nor.push(0, 1, 0); }
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      // three.js culls by winding: make both windings valid
      const mat = TM("sqPath", () => SP.pathTex(), { side: THREE.DoubleSide });
      bd.add(g, mat); void dir; }
    // the lap ring (pale stone setts) + the brick disc under the sculpture
    { const c = SQ.lap.c, r0 = SQ.lap.r - 0.42, r1 = SQ.lap.r + 0.42, ring = new THREE.RingGeometry(r0, r1, 128, 1).rotateX(-Math.PI / 2);
      const p = ring.attributes.position as THREE.BufferAttribute, uv = ring.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); uv.setXY(i, (Math.atan2(z, x) / TAU + 1) % 1, (rr - r0) / (r1 - r0)); }
      // the seam: vertices at angle 0 appear twice (u 0 and u 1): fix the last column
      const n = 129; for (let k = 0; k < 2; k++) uv.setX(k * n + 128, 1);
      bd.add(ring, TM("sqRing", () => SP.ringTex()), M(c[0], 0.014, c[2]));
      bd.add(new THREE.CircleGeometry(r0, 64).rotateX(-Math.PI / 2), TM("sqDiscSlate", () => rep(SP.slateTex(), 1.0, 1.0)), M(c[0], 0.013, c[2])); }   /* LOOK v2: cool slate under the sculpture */
    // drains, petal drifts (denser under the blossom trees and in the foreground of the opening frame)
    /* (LOOK v2: the drains with unreadable letters are gone: the near one sat in the foreground of every low lens) */
    { const pm = (k: number) => TM("sqPetals" + k, () => SP.petalsTex(k), { transparent: true, alphaTest: 0.35 });
      const spots: [number, number, number, number][] = [[0.8, 10.4, 5, 0], [-0.6, 7.6, 5, 1], [2.6, 5.4, 5, 2], [-2.2, 2.2, 5, 0], [0.4, 0.6, 5, 1], [4.4, -1.2, 5, 2], [-3.4, -4.0, 5, 1], [7.6, -2.5, 6, 0], [7.9, -9.8, 6, 1], [7.6, -17.2, 6, 2], [7.8, 12.0, 6, 0], [7.9, 19.0, 6, 1], [3.0, -12.5, 5, 2], [-2.6, -15.4, 5, 0], [12.2, -33.4, 6, 1], [4.6, 11.4, 5, 2]];
      spots.forEach(([x, z, s, k], i) => bd.add(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), pm(k), M(x, 0.018 + 0.0004 * i, z, hash(i * 3.3) * TAU))); }

    // ---------------- THE SCULPTURE ----------------
    { const sc = SQ.sculpture, e = sc.edge, t = 0.09, steel = TM("sqSteelBlue", () => steelTex(), { side: THREE.DoubleSide });
      // the cube stands on a corner (its body diagonal upright), turned and leaned a little
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
      q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.09, 0.55, -0.07)));
      const corners: THREE.Vector3[] = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push(new THREE.Vector3(sx, sy, sz).multiplyScalar(e / 2).applyQuaternion(q));
      corners.sort((a, c) => a.y - c.y);
      const sup = corners.slice(1, 4), lift = sc.pierTop + 0.06 - (sup[0].y + sup[1].y + sup[2].y) / 3, base = new THREE.Vector3(sc.c[0], lift, sc.c[2]);
      const holes = [0.56, 0.44, 0.62, 0.5, 0.38, 0.58], off = [[0, 0], [0.12, -0.08], [-0.06, 0.05], [0.1, 0.1], [-0.14, -0.1], [0, 0.06]];
      const faces: [number, number, number][] = [[0, 0, 0], [0, Math.PI, 0], [0, Math.PI / 2, 0], [0, -Math.PI / 2, 0], [-Math.PI / 2, 0, 0], [Math.PI / 2, 0, 0]];
      faces.forEach(([rx, ry], i) => {
        const fq = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), n = new THREE.Vector3(0, 0, e / 2).applyQuaternion(fq);
        const m = new THREE.Matrix4().compose(base.clone().add(n.applyQuaternion(q)), q.clone().multiply(fq), new THREE.Vector3(1, 1, 1));
        b.add(plateGeo(e, holes[i], t, off[i][0], off[i][1]), steel, m);
      });
      // three brick piers under the three low corners, cream caps, a little steel shoe on each
      for (const cnr of sup) { const x = base.x + cnr.x * 0.93, z = base.z + cnr.z * 0.93, top = lift + cnr.y - 0.03;
        tbox(brickD, x - 0.3, 0, z - 0.3, x + 0.3, top - 0.12, z + 0.3, 1.6); tbox(cream, x - 0.36, top - 0.12, z - 0.36, x + 0.36, top, z + 0.36, 2);
        tbox(cream, x - 0.38, 0, z - 0.38, x + 0.38, 0.14, z + 0.38, 2); contact(S, [x, 0.02, z], 1.5, 1.5, 0.5); }
      contact(S, [sc.c[0], 0.021, sc.c[2]], 3.4, 3.4, 0.3); }

    // ---------------- NORTH: THE LIBRARY + THE CLOCK TOWER ----------------
    { const Z = PZ.z0, X0 = 1.0, X1 = 23.4, Hh = 10.4;
      tbox(brickF, X0, 0, Z - 14, X1, Hh, Z, 3.2, false);
      tbox(cream, X0 - 0.2, 0, Z, X1 + 0.2, 0.95, Z + 0.22, 2);                                   // plinth
      tbox(cream, X0 - 0.1, 8.55, Z, X1 + 0.1, 9.0, Z + 0.16, 2);                                 // sign band
      tbox(creamD, X0 - 0.4, Hh - 0.42, Z - 0.2, X1 + 0.4, Hh, Z + 0.5, 2);                        // cornice
      tbox(brickD, X0 - 0.2, Hh, Z - 0.5, X1 + 0.2, Hh + 0.7, Z + 0.12, 3.2);                      // parapet
      // bays of tall windows between brick pilasters
      for (let k = 0; k < 5; k++) { const cx = 8.2 + k * 3.4, w = 2.2, y0 = 1.5, y1 = 8.0;
        tbox(cream, cx - w / 2 - 0.2, y0 - 0.2, Z, cx + w / 2 + 0.2, y1 + 0.24, Z + 0.14, 2);
        rb.panel(TM("sqWinL" + (k % 3), () => SP.windowTex(k % 3, 2, 5)), w, y1 - y0, cx, (y0 + y1) / 2, Z + 0.15);
        tbox(cream, cx - w / 2 - 0.3, y0 - 0.34, Z, cx + w / 2 + 0.3, y0 - 0.2, Z + 0.3, 2);       // sill
        tbox(brickD, cx + 1.7 - 0.3, 0.95, Z, cx + 1.7 + 0.3, Hh - 0.42, Z + 0.42, 3.2); tbox(cream, cx + 1.7 - 0.36, 8.0, Z, cx + 1.7 + 0.36, 8.3, Z + 0.48, 2); }
      tbox(brickD, 6.5 - 0.3, 0.95, Z, 6.5 + 0.3, Hh - 0.42, Z + 0.42, 3.2);
      { const s = faceMesh(SP.signTex("LIBRARY"), 4.4, 0.42); (s.material as THREE.MeshBasicMaterial).color.setScalar(0.96); s.position.set(13.3, 8.775, Z + 0.17); S.add(s); }
      // the clock tower (stands 0.62 m proud of the wall): a slit window, the entrance, the dial, a teal pyramid cap
      const tx0 = 2.9, tx1 = 6.1, TZ = Z + 0.62, TH = 13.2, cx = (tx0 + tx1) / 2;
      tbox(brickF, tx0, 0, Z - 3, tx1, TH, TZ, 3.2); tbox(cream, tx0 - 0.15, 0, TZ, tx1 + 0.15, 0.95, TZ + 0.2, 2);
      for (const y of [6.72, 10.2]) tbox(cream, tx0 - 0.18, y, Z - 3.1, tx1 + 0.18, y + 0.3, TZ + 0.22, 2);
      tbox(creamD, tx0 - 0.3, TH - 0.4, Z - 3.2, tx1 + 0.3, TH, TZ + 0.34, 2);
      b.add(new THREE.ConeGeometry(2.55, 2.5, 4, 1).rotateY(Math.PI / 4), C("#5a6e86"), M(cx, TH + 1.25, (Z - 3 + TZ) / 2));
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), dark, M(cx, TH + 3.0, (Z - 3 + TZ) / 2));
      rb.panel(TM("sqWinS", () => SP.windowTex(2, 1, 4)), 0.9, 2.2, cx, 5.15, TZ + 0.12); tbox(cream, cx - 0.6, 3.9, TZ, cx + 0.6, 6.4, TZ + 0.1, 2);
      for (const dx of [-0.75, 0, 0.75]) { tbox(dark, cx + dx - 0.2, 11.0, TZ, cx + dx + 0.2, 12.3, TZ + 0.05, 1); }          // belfry louvres
      { const d = faceMesh(SP.doorTex(), 2.3, 2.9); (d.material as THREE.MeshBasicMaterial).color.setScalar(0.9); d.position.set(cx, 0.48 + 1.45, TZ + 0.03); d.layers.set(NOINK); S.add(d); }
      tbox(cream, cx - 1.4, 3.38, TZ, cx + 1.4, 3.62, TZ + 0.5, 2);
      for (let k = 0; k < 3; k++) tbox(creamD, cx - 2.4 + 0.25 * k, 0, TZ, cx + 2.4 - 0.25 * k, 0.48 - 0.16 * k, TZ + 1.5 - 0.45 * k, 2);
      // the dial + its hands (posed in pose())
      const cl = SQ.clock;
      b.add(new THREE.CylinderGeometry(cl.r + 0.16, cl.r + 0.16, 0.1, 40).rotateX(Math.PI / 2), cream, M(cl.c[0], cl.c[1], TZ + 0.05));
      { const f = faceMesh(SP.clockTex(), cl.r * 2, cl.r * 2, true); (f.material as THREE.MeshBasicMaterial).color.setScalar(0.98); f.position.set(cl.c[0], cl.c[1], TZ + 0.11); f.layers.set(NOINK); S.add(f); }
      for (const [len, wid] of [[cl.r * 0.52, 0.16], [cl.r * 0.8, 0.11]]) { const h = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.03).translate(0, len / 2 - 0.08, 0), new THREE.MeshBasicMaterial({ color: "#241c34" })); h.position.set(cl.c[0], cl.c[1], TZ + 0.14 + 0.02 * this.hands.length); h.layers.set(NOINK); S.add(h); this.hands.push(h); }
      { const hub = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: "#3a4a6a" })); hub.position.set(cl.c[0], cl.c[1], TZ + 0.2); hub.layers.set(NOINK); S.add(hub); }
      // west of the tower the north side is OPEN: a low brick wall with a cream cap (the bills' clean sky is over it)
      tbox(brickD, PZ.x0 - 0.4, 0, Z - 0.35, X0, 0.72, Z, 3.2); tbox(cream, PZ.x0 - 0.5, 0.72, Z - 0.45, X0, 0.84, Z + 0.1, 2); }

    // ---------------- EAST: THE ARTS BUILDING (its west face at x = PZ.x1) ----------------
    { const X = PZ.x1, Z0 = -38, Z1 = 23, Hh = 8.8;
      tbox(brickW, X, 0, Z0, X + 14, Hh, Z1, 3.2, false);
      tbox(cream, X - 0.2, 0, Z0, X, 0.5, Z1, 2); tbox(cream, X - 0.16, 3.72, Z0, X, 4.12, Z1, 2);
      tbox(creamD, X - 0.5, Hh - 0.4, Z0 - 0.3, X + 0.2, Hh, Z1 + 0.3, 2); tbox(brickD, X - 0.12, Hh, Z0, X + 0.4, Hh + 0.6, Z1, 3.2);
      for (let k = 0; k < 15; k++) { const cz = Z0 + 2.2 + k * 4.0, door = k === 7 || k === 11 || k === 3;
        tbox(brickD, X - 0.36, 0.5, cz - 2.0 - 0.26, X, Hh - 0.4, cz - 2.0 + 0.26, 3.2);                       // pilaster
        // the big ground-floor glass (teal frame), or a door bay with a canopy
        tbox(tealD, X - 0.12, 0.5, cz - 1.56, X, 3.5, cz + 1.56, 1);
        if (door) { const d = faceMesh(SP.doorTex(), 2.4, 2.8); (d.material as THREE.MeshBasicMaterial).color.setScalar(0.92); d.position.set(X - 0.13, 0.5 + 1.4, cz); d.rotation.y = -Math.PI / 2; d.layers.set(NOINK); S.add(d);
          tbox(teal, X - 1.7, 3.36, cz - 1.9, X, 3.52, cz + 1.9, 1); for (const s of [-1, 1]) rb.seg(dark, [X - 1.55, 3.4, cz + s * 1.7], [X - 0.05, 4.6, cz + s * 1.7], 0.02);
          for (let q = 0; q < 2; q++) tbox(creamD, X - 1.3 + 0.35 * q, 0, cz - 1.9, X - 0.2, 0.5 - 0.25 * q - 0.0, cz + 1.9, 2); }
        else rb.panel(TM("sqWinA" + (k % 3), () => SP.windowTex(k % 3, 3, 2)), 2.9, 2.8, X - 0.13, 2.0, cz, -Math.PI / 2);
        // upper floor: a pair of windows with cream surrounds
        for (const s of [-1, 1]) { tbox(cream, X - 0.1, 4.55, cz + s * 0.95 - 0.7, X, 7.25, cz + s * 0.95 + 0.7, 2); rb.panel(TM("sqWinU" + ((k + (s > 0 ? 1 : 0)) % 3), () => SP.windowTex((k + (s > 0 ? 1 : 0)) % 3, 2, 3)), 1.15, 2.4, X - 0.11, 5.9, cz + s * 0.95, -Math.PI / 2); }
      }
      tbox(brickD, X - 0.36, 0.5, Z1 - 0.26, X, Hh - 0.4, Z1 + 0.26, 3.2);
      { const s = faceMesh(SP.signTex("ARTS", 768, 256), 2.2, 0.36); (s.material as THREE.MeshBasicMaterial).color.setScalar(0.96); s.position.set(X - 0.18, 3.92, -7.8); s.rotation.y = -Math.PI / 2; S.add(s); }
      // low brick benches with wooden tops along the facade
      for (const cz of [-14.6, 6.5, -27]) { tbox(brickD, X - 1.35, 0, cz - 1.3, X - 0.75, 0.38, cz + 1.3, 1.6); rb.box(TM("sqBenchWood", () => rep(parkWood("#b98654", false), 2, 1)), X - 1.42, 0.38, cz - 1.36, X - 0.68, 0.46, cz + 1.36); contact(S, [X - 1.05, 0.02, cz], 1.3, 3.2, 0.4); } }

    // ---------------- WEST: the hedge + leafy trees (z > -9), then the low wall with the open view ----------------
    { const hedge = TM("sqHedge", () => rep(SP.hedgeTex(), 1, 1)), lobe = new THREE.SphereGeometry(1, 16, 11), HX = PZ.x0 - 0.45;
      const uvScale = (g: THREE.BufferGeometry, su: number, sv: number) => { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
      for (let z = -9.2; z <= 23.5; z += 1.15) { const k = Math.round(z * 10), r = 0.95 + 0.14 * hash(k), h = 1.02 + 0.1 * hash(k * 1.7);
        b.add(uvScale(lobe.clone(), 2, 1), hedge, M(HX + 0.06 * (hash(k * 2.3) - 0.5), h * 1.02, z, hash(k) * TAU, [0.56, h * 1.06, r])); }
      tbox(hedge, HX - 0.42, 0, -9.4, HX + 0.42, 1.75, 23.8, 2.5);
      tbox(brickD, PZ.x0 - 0.4, 0, PZ.z0 - 0.35, PZ.x0, 0.72, -9.9, 3.2); tbox(cream, PZ.x0 - 0.5, 0.72, PZ.z0 - 0.45, PZ.x0 + 0.1, 0.84, -9.8, 2);
      tbox(brickD, PZ.x0 - 0.55, 0, -10.3, PZ.x0 + 0.15, 1.05, -9.6, 1.6); tbox(cream, PZ.x0 - 0.62, 1.05, -10.37, PZ.x0 + 0.22, 1.2, -9.53, 2);
      // the trees behind the hedge (the leafy wall of the money close-up) and a few bushes at its foot outside
      const kinds = ["tree_oak", "tree_fat", "tree_detailed", "tree_default"];
      for (let i = 0; i < 12; i++) { const z = -8.2 + i * 2.75 + 0.9 * (hash(i * 4.1) - 0.5), x = PZ.x0 - 2.6 - 1.8 * hash(i * 2.7), h = 4.4 + 1.9 * hash(i * 1.3); prop(b, kit, kinds[i % 4], x, -0.05, z, h, i); }
      for (let i = 0; i < 7; i++) prop(b, kit, kinds[(i + 1) % 4], PZ.x0 - 7.5 - 2.5 * hash(i * 6.1), -0.05, -7 + i * 4.6, 5.8 + 2.4 * hash(i * 3.3), i * 2);
      for (let i = 0; i < 6; i++) prop(b, kit, "plant_bush", PZ.x0 - 1.5, -0.05, -8 + i * 5.2 + hash(i) * 1.5, 1.3 + 0.4 * hash(i * 2.2), i); }

    // ---------------- furniture ----------------
    // the banner lamp posts: a dark green post, a lantern, an arm with a hanging banner (the banners sway: pose())
    LAMPS.forEach(([x, z, col, side], i) => {
      const post = C("#2c4a44"), Hp = i ? 4.4 : 3.8;   /* the opening frame's lamp is shorter: its lantern and the crow stay inside the frame */
      b.add(new THREE.CylinderGeometry(0.06, 0.085, Hp, 12).translate(0, Hp / 2, 0), post, M(x, 0, z)); b.add(new THREE.CylinderGeometry(0.13, 0.16, 0.5, 12).translate(0, 0.25, 0), post, M(x, 0, z));
      b.add(new THREE.CylinderGeometry(0.1, 0.07, 0.12, 12), post, M(x, Hp + 0.02, z)); b.add(new THREE.SphereGeometry(0.2, 16, 12), C("#f6f0dc"), M(x, Hp + 0.26, z)); b.add(new THREE.ConeGeometry(0.2, 0.16, 12), post, M(x, Hp + 0.52, z));
      b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.86, 8).rotateZ(Math.PI / 2), post, M(x + side * 0.45, Hp - 0.22, z)); b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.86, 8).rotateZ(Math.PI / 2), post, M(x + side * 0.45, Hp - 2.0, z));
      const cloth = new THREE.PlaneGeometry(0.62, 1.7, 6, 10).translate(0, -0.85, 0), p = cloth.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) p.setZ(k, 0.03 * Math.sin(p.getX(k) * 9 + 0.4) * (-p.getY(k) / 1.7));
      cloth.computeVertexNormals();
      const m = new THREE.Mesh(cloth, TM("sqBanner" + col + (i % 2), () => SP.bannerTex(col, i % 2), { side: THREE.DoubleSide }));
      m.position.set(x + side * 0.5, Hp - 0.26, z); m.castShadow = true; m.receiveShadow = true; S.add(m); this.banners.push(m);
      contact(S, [x, 0.02, z], 0.7, 0.7, 0.5);
    });
    // the bike rack (far left of the opening frame, low): a steel rail + four bikes
    { const bx = -4.7, bz = -13.4, steel = C("#9aa4b4");
      for (const dz of [-1.5, 1.5]) b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8).translate(0, 0.4, 0), steel, M(bx, 0, bz + dz));
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 3.0, 8).rotateX(Math.PI / 2), steel, M(bx, 0.8, bz));
      [["#2f7f86", -1.1], ["#d8553a", -0.35], ["#e8e2d0", 0.4], ["#3f6fb0", 1.1]].forEach(([col, dz], i) => bicycle(b, bx + 0.1, bz + (dz as number), 0.15 * (i % 2 ? 1 : -1), col as string));
      contact(S, [bx, 0.02, bz], 2.2, 3.6, 0.35); }
    // the fountain: a cream basin, water, a bowl on a stem; the jets are posed in pose()
    { const f = SQ.fountain, c = f.c, stone = TM("sqCream", () => SP.creamTex());
      b.add(new THREE.CylinderGeometry(f.r, f.r + 0.08, 0.5, 40, 1, true), stone, M(c[0], 0.25, c[2])); b.add(new THREE.RingGeometry(f.r - 0.28, f.r + 0.06, 40).rotateX(-Math.PI / 2), stone, M(c[0], 0.5, c[2]));
      b.add(new THREE.CylinderGeometry(f.r - 0.28, f.r - 0.28, 0.42, 40, 1, true).scale(-1, 1, 1), creamD, M(c[0], 0.29, c[2]));
      this.pool = rep(SP.poolTex(), 2, 2);
      const w = new THREE.Mesh(new THREE.CircleGeometry(f.r - 0.28, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.pool, color: new THREE.Color(1.05, 1.08, 1.1) })); w.position.set(c[0], 0.4, c[2]); w.layers.set(NOINK); S.add(w);
      b.add(new THREE.CylinderGeometry(0.16, 0.24, 0.95, 14).translate(0, 0.475, 0), stone, M(c[0], 0.3, c[2])); b.add(new THREE.CylinderGeometry(0.75, 0.2, 0.26, 24), stone, M(c[0], 1.3, c[2]));
      this.jetMap = rep(SP.jetTex(), 1, 1);
      const jm = () => new THREE.MeshBasicMaterial({ map: this.jetMap, transparent: true, depthWrite: false, color: new THREE.Color(1.15, 1.2, 1.25), side: THREE.DoubleSide, fog: false });
      const add = (w0: number, h0: number, x: number, y: number, z: number, ry: number, rz: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w0, h0).translate(0, h0 / 2, 0), jm()); m.position.set(x, y, z); m.rotation.set(0, ry, rz, "YXZ"); m.layers.set(NOINK); m.renderOrder = 3; S.add(m); this.jets.push(m); };
      add(0.34, 0.62, c[0], 1.38, c[2], 0, 0); add(0.34, 0.62, c[0], 1.38, c[2], Math.PI / 2, 0);                 // the plume
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; add(0.2, 0.98, c[0] + Math.cos(a) * 0.72, 0.42, c[2] + Math.sin(a) * 0.72, -a + Math.PI / 2, 0); }   // the bowl's overflow
      contact(S, [c[0], 0.02, c[2]], 5.4, 5.4, 0.4); }
    // THE STUDY CORNER: a folding table with a teal cloth front and the plain "PSYCH STUDY" sign, a few things on it
    { const st = SQ.study, t = st.table, cloth = TM("sqCloth", () => rep(SP.clothTex(), 2, 1)), white = C("#f4f0e6");
      rb.box(white, t[0] - 0.76, 0.7, t[2] - 0.31, t[0] + 0.76, 0.74, t[2] + 0.31);
      rb.box(cloth, t[0] - 0.75, 0.12, t[2] + 0.27, t[0] + 0.75, 0.7, t[2] + 0.3); rb.box(cloth, t[0] - 0.75, 0.3, t[2] - 0.3, t[0] - 0.72, 0.7, t[2] + 0.3); rb.box(cloth, t[0] + 0.72, 0.3, t[2] - 0.3, t[0] + 0.75, 0.7, t[2] + 0.3);
      for (const sx of [-0.66, 0.66]) for (const sz of [-0.24, 0.2]) rb.seg(C("#8a92a0"), [t[0] + sx, 0, t[2] + sz], [t[0] + sx, 0.7, t[2] + sz], 0.016);
      /* audit p2 (minor 5, captions on the table banner in S10 / S11): the table front is a plain cloth now; the name stays on the standing sign and the A-frame */
      rb.box(C("#c8a070"), t[0] - 0.55, 0.74, t[2] - 0.2, t[0] - 0.24, 0.756, t[2] + 0.22); rb.box(white, t[0] - 0.53, 0.756, t[2] - 0.17, t[0] - 0.26, 0.762, t[2] + 0.18);   // a clipboard
      rb.box(white, t[0] + 0.1, 0.74, t[2] - 0.18, t[0] + 0.4, 0.79, t[2] + 0.2);                                           // a pile of forms
      b.add(new THREE.CylinderGeometry(0.045, 0.04, 0.11, 12), C("#2f7fb0"), M(t[0] + 0.58, 0.795, t[2] - 0.05));
      for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.17, 5), C(["#d8553a", "#2a2c3c", "#3f8f5a"][k]), M(t[0] + 0.57 + 0.012 * k, 0.87, t[2] - 0.06 + 0.012 * k, 0, [1, 1, 1], 0.2 * (k - 1), 0.15 * (1 - k)));
      /* the standing sign board on two posts behind the table: PSYCH STUDY reads above people's heads */
      { const g2 = st.sign; for (const sx of [-0.46, 0.46]) rb.seg(C("#8a92a0"), [g2[0] + sx, 0, g2[2] - 0.03], [g2[0] + sx, g2[1] + 0.2, g2[2] - 0.03], 0.02);
        rb.box(white, g2[0] - 0.54, g2[1] - 0.23, g2[2] - 0.02, g2[0] + 0.54, g2[1] + 0.23, g2[2]);
        const s2 = faceMesh(SP.studySignTex(), 1.02, 0.408); (s2.material as THREE.MeshBasicMaterial).color.setScalar(0.8);   /* audit p2 minor 6: L* ~85, under the faces */ s2.position.set(g2[0], g2[1], g2[2] + 0.006); S.add(s2); }
      contact(S, [t[0], 0.02, t[2]], 1.9, 1.0, 0.45); }
    // blossom trees in round brick planters (east side, by the library)
    { const blossom = TM("sqBlossom", () => rep(SP.blossomTex(), 1, 1)), bark = C("#6a4a40"), lobe = new THREE.SphereGeometry(1, 18, 12);
      CHERRIES.forEach(([x, z, h], i) => {
        b.add(new THREE.CylinderGeometry(0.85, 0.9, 0.42, 20, 1, false), brickD, M(x, 0.21, z)); b.add(new THREE.CylinderGeometry(0.92, 0.92, 0.08, 20), cream, M(x, 0.45, z));
        b.add(new THREE.CylinderGeometry(0.07, 0.12, h * 0.5, 9).translate(0, h * 0.25, 0), bark, M(x, 0.4, z, 0, [1, 1, 1], 0.05 * (hash(i) - 0.5), 0.06 * (hash(i * 3) - 0.5)));
        const cy = 0.4 + h * 0.62, n = 6;
        b.add(lobe, blossom, M(x, cy, z, hash(i) * TAU, [h * 0.26, h * 0.22, h * 0.26]));
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU + hash(i * 7 + k), d = h * 0.2, r = h * (0.15 + 0.05 * hash(i * 5 + k * 3)); b.add(lobe, blossom, M(x + Math.cos(a) * d, cy + h * 0.06 * (hash(k * 9 + i) - 0.4), z + Math.sin(a) * d, a, [r, r * 0.86, r])); }
        b.add(lobe, blossom, M(x + 0.1, cy + h * 0.17, z, 0, [h * 0.17, h * 0.14, h * 0.17]));
        contact(S, [x, 0.02, z], 2.4, 2.4, 0.4);
      }); }
    // firs behind the library and beside the arts building (the evergreen edge of the campus; none west of x = 1)
    for (let i = 0; i < 9; i++) prop(b, kit, "tree_cone", 25 + 3.2 * hash(i * 3.7) + (i % 3) * 3, -0.05, -41 - i * 4.4 + 60 * (i > 6 ? 1 : 0), 11 + 5 * hash(i * 2.1), i);
    for (let i = 0; i < 7; i++) prop(b, kit, "tree_cone", 8 + i * 3.6, -0.05, -56 - 3 * hash(i * 5.3), 13 + 5 * hash(i * 1.9), i * 3);

    // ---------------- backdrops: the bay over the north wall, the evergreen hills behind the buildings ----------------
    { const mk = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry: number, k: number) => {
        const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(k, k, k) });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; p.layers.set(NOINK); p.renderOrder = -0.3; S.add(p); this.hills.push(m); return p; };
      mk(SP.bayTex(), 2400, 54, -520, 27 - 22.5, -760, 0, 1.0);                    // far hills ~ up to 0.9 deg, the water below the horizon
      mk(SP.firHillTex(0), 230, 125, 105, 62.5 - 22, -330, 0, 1.0);                   // north-east: rises behind the library, falls away to the left
      mk(SP.firHillTex(1), 760, 125, 300, 62.5 - 22, -80, -Math.PI / 2, 1.0);         // east: behind the arts building
    }

    // ---------------- life ----------------
    PIGEONS.forEach(() => { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: pigeonTex(0), transparent: true, depthWrite: false })); p.layers.set(NOINK); p.renderOrder = 5; S.add(p); this.pigeons.push(p); });
    for (const [x, , z] of PIGEONS.map(([x, z]) => [x, 0, z])) contact(S, [x, 0.021, z], 0.42, 0.3, 0.35);
    STUDENTS.forEach(([x, y, z, v, pose, h]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SP.studentTex(v, pose), transparent: true, alphaTest: 0.3 })); s.center.set(0.5, 0); s.position.set(x, y, z); s.scale.set(h / 2, h, 1); s.layers.set(NOINK); s.renderOrder = 4; S.add(s); this.students.push(s); });
    // two far walkers by the library steps (painted figures, loop clock)
    for (let k = 0; k < 2; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SP.studentTex(k + 1, 1), transparent: true, alphaTest: 0.3 })); s.center.set(0.5, 0); s.layers.set(NOINK); s.renderOrder = 4; S.add(s); this.walkers.push(s); }
    // petals drifting down from the blossom trees
    for (let k = 0; k < 14; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SP.shadowTex(), color: new THREE.Color(k % 3 ? "#ffd6e2" : "#fff2f5"), transparent: true, depthWrite: false })); s.layers.set(NOINK); s.renderOrder = 5; S.add(s); this.petals.push(s); }
    // the channel's crow, perched on the arm of the banner lamp at the right edge of the opening frame
    this.crow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SP.crowTex(), transparent: true, alphaTest: 0.3 })); this.crow.center.set(0.5, 0.1); this.crow.position.set(...SQ.crow); this.crow.scale.set(0.44, 0.44, 1); this.crow.layers.set(NOINK); S.add(this.crow);

    this.buildV2(S, b);
    rb.done(S); buildInk(b, S, 1); buildInk(bd, S, 0, false);
    S.add(this.tree.group);
    if (!P3_OFF) this.p3 = new SquareP3(S, this.banners);
  }

  /** LOOK v2: detail and life where the lenses look (off the walkers' lanes and out of the sky behind the bills) */
  private buildV2(S: THREE.Group, b: Batch) {
    const wood = C("#7a4e30"), cream = C("#efe4cc"), steel = C("#9aa4b4");
    // (a) the study corner's "PSYCH STUDY" A-frame: left of the walkers' way in, turned to the S7-S12 lenses
    { const p: V3 = [2.75, 0, 8.6]; const m = TM("sqAFrameM", () => SP.aframeTex()); aFrame(S, [m, m], p, Math.atan2(5.5 - p[0], 12.4 - p[2]), 0.62, 0.84); contact(S, [p[0], 0.02, p[2]], 0.9, 0.7, 0.4); }
    // (b) EDIT's S19 board at STORY.s19.board, facing the S19 lens; its own group, shown in S19 only (poseV2)
    { const p0 = STORY.s19.board, p: V3 = [p0[0] - 0.4, 0.3, p0[2]], A = twoTone(new THREE.MeshLambertMaterial({ map: s19Tex(0) })), B2 = twoTone(new THREE.MeshLambertMaterial({ map: s19Tex(2) })), B1 = twoTone(new THREE.MeshLambertMaterial({ map: s19Tex(1) }));
      /* audit p2 M2: 0.4 m west of the mark and up on a crate, so both numbers clear the button column and the caption band */
      { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.62).translate(0, -0.15, 0), TM("sqCrate", () => rep(parkWood("#a8743e", false), 1, 1))); cr.castShadow = true; cr.receiveShadow = true; this.s19.add(cr); }   /* the crate belongs to the S19-only group */
      this.s19Mat = [A, B2, B1];
      aFrame(this.s19, [A, A], [0, 0, 0], 0, 0.8, 1.1, 0.16); this.s19.position.set(...p); this.s19.rotation.y = Math.atan2(1.63 - p[0], 9.79 - p[2]); this.s19.visible = false; S.add(this.s19); }
    // (c) the coffee cart (east side): maroon + cream body, wheels, a striped umbrella, the FREE COFFEE sign facing the plaza
    { const cx = 8.2, cz = 8.6, g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = -Math.PI / 2; S.add(g);
      const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
      add(new THREE.BoxGeometry(1.3, 0.62, 0.62), TM("sqCartStripe", () => SP.cartTex()), 0, 0.62, 0); add(new THREE.BoxGeometry(1.38, 0.05, 0.7), cream, 0, 0.955, 0);
      for (const sx of [-0.45, 0.45]) for (const sz of [-0.33, 0.33]) add(new THREE.TorusGeometry(0.17, 0.035, 8, 18), C("#2a2630"), sx, 0.2, sz);
      { const sg = faceMesh(SP.coffeeSignTex(), 0.86, 0.32); (sg.material as THREE.MeshBasicMaterial).color.setScalar(0.94); sg.position.set(0, 0.68, 0.315); g.add(sg); }
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 16), steel, -0.4, 1.16, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), C("#2a2630"), -0.4, 1.36, 0);
      for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.04, 0.032, 0.09, 12), k % 2 ? cream : C("#c8503a"), 0.1 + 0.09 * k, 1.03, 0.12 - 0.05 * (k % 2));
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), C("#d8c8a0"), 0.5, 1.05, -0.12);
      add(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), C("#dcd6c8"), 0, 1.65, -0.1);
      this.umbrella = add(new THREE.ConeGeometry(0.95, 0.42, 16, 1, true), TM("sqUmbrella", () => SP.umbrellaTex(), { side: THREE.DoubleSide }), 0, 2.38, -0.1);
      contact(S, [cx, 0.02, cz], 1.7, 1.2, 0.45, -Math.PI / 2); }
    // (d) bunting: Q1's lamp -> the arts building's lamp, and along the arts building (pennants flutter: poseV2)
    { const runs: [V3, V3][] = [[[SQ.lamp[0], 3.62, SQ.lamp[2]], [9.5, 4.15, 3.5]], [[9.5, 4.15, 3.5], [9.5, 4.15, 15.6]], [[6.7, 4.15, -12.5], [9.5, 4.15, -23]]];
      const cols = ["#2f4f86", "#f2e8d0", "#d8707a", "#e0b04a", "#5a8a5a"];
      runs.forEach(([a, c], ri) => { const n = Math.max(6, Math.round(Math.hypot(c[0] - a[0], c[2] - a[2]) / 0.55)), sag = 0.45;
        const at = (u: number): V3 => [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (c[2] - a[2]) * u];
        for (let k = 0; k < 24; k++) { const p0 = at(k / 24), p1 = at((k + 1) / 24), d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), L = d.length();
          b.add(new THREE.CylinderGeometry(0.008, 0.008, L, 5), C("#3a3040"), new THREE.Matrix4().compose(new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1))); }
        const yaw = Math.atan2(c[2] - a[2], -(c[0] - a[0]));
        for (let k = 1; k < n; k++) { const p = at(k / n), tri = new THREE.BufferGeometry();
          tri.setAttribute("position", new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.3, 0], 3)); tri.computeVertexNormals();
          const m = new THREE.Mesh(tri, lamD(cols[(k + ri) % cols.length])); m.position.set(...p); m.rotation.set(0, yaw, 0, "YXZ"); m.castShadow = true; S.add(m); this.pennants.push({ m, ph: k * 0.7 + ri * 2.1 }); } }); }
    // (e) planters with flowers along the arts building; round tubs by the library steps and the west hedge's end
    { const planter = (x: number, z: number, w: number, d: number, round = false) => {
        if (round) { b.add(new THREE.CylinderGeometry(0.42, 0.36, 0.5, 18).translate(0, 0.25, 0), C("#b88a64"), M(x, 0, z)); b.add(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 18), cream, M(x, 0.5, z)); }
        else { b.add(new THREE.BoxGeometry(w, 0.46, d).translate(0, 0.23, 0), wood, M(x, 0, z)); b.add(new THREE.BoxGeometry(w + 0.06, 0.05, d + 0.06), cream, M(x, 0.47, z)); }
        const n = Math.round((round ? 0.64 : w * d) * 60), fc = ["#e85a6a", "#f6f0e8", "#f29a3a", "#e8789a", "#d84a3a"];
        for (let i = 0; i < n; i++) { const fx = x + (hash(i * 3.1 + x) - 0.5) * (round ? 0.7 : w - 0.1), fz = z + (hash(i * 5.7 + z) - 0.5) * (round ? 0.7 : d - 0.1), y = 0.52 + 0.14 * hash(i * 7.3);
          b.add(new THREE.SphereGeometry(0.06 + 0.025 * hash(i), 8, 6), hash(i * 2.2) < 0.35 ? C("#4f7a44") : C(fc[i % fc.length]), M(fx, y, fz)); }
        contact(S, [x, 0.02, z], (round ? 1 : w) + 0.4, (round ? 1 : d) + 0.4, 0.4); };
      for (const z of [-19.2, -3.6, 2.2, 13.4]) planter(10.25, z, 0.55, 1.6);
      planter(8.4, -35.6, 0, 0, true); planter(18.6, -35.6, 0, 0, true); planter(-4.9, 11.2, 0, 0, true); }
    // (f) bags on the benches (a backpack, a tote, a cup and a book), the campus map board, a notice pillar with flyers
    { const X = SQ.plaza.x1;
      b.add(new THREE.CapsuleGeometry(0.15, 0.2, 4, 10), C("#c8503a"), M(X - 1.05, 0.66, 6.0, 0.4, [1, 1, 0.65])); b.add(new THREE.BoxGeometry(0.2, 0.12, 0.05), C("#a03e2c"), M(X - 1.05, 0.6, 5.88, 0.4));
      b.add(new THREE.BoxGeometry(0.32, 0.34, 0.1), C("#e8dcc0"), M(X - 1.05, 0.63, -14.0, 0.2, [1, 1, 1], 0.1)); b.add(new THREE.TorusGeometry(0.1, 0.012, 6, 14, Math.PI), C("#e8dcc0"), M(X - 1.05, 0.8, -14.0, 0.2));
      b.add(new THREE.CylinderGeometry(0.04, 0.032, 0.1, 12), C("#c8503a"), M(X - 1.0, 0.51, -27.4)); b.add(new THREE.BoxGeometry(0.2, 0.04, 0.26), C("#2f4f86"), M(X - 1.1, 0.48, -26.7, 0.3));
      { const p: V3 = [X - 1.0, 0, -5.0], mm = new THREE.Group(); mm.position.set(...p); mm.rotation.y = -Math.PI / 2; S.add(mm);
        for (const sx of [-0.55, 0.55]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 8).translate(0, 0.95, 0), C("#2c3e5a")); post.position.set(sx, 0, 0); post.castShadow = true; mm.add(post); }
        const bdm = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.86, 0.05), C("#2c3e5a")); bdm.position.set(0, 1.45, -0.01); bdm.castShadow = true; mm.add(bdm);
        const f = faceMesh(SP.mapTex(), 1.2, 0.8); (f.material as THREE.MeshBasicMaterial).color.setScalar(0.93); f.position.set(0, 1.45, 0.018); mm.add(f); contact(S, [p[0], 0.02, p[2]], 0.6, 1.6, 0.35); }
      { const p: V3 = [7.6, 0, 1.0]; b.add(new THREE.CylinderGeometry(0.34, 0.36, 2.3, 20).translate(0, 1.15, 0), C("#3a4a62"), M(...p)); b.add(new THREE.CylinderGeometry(0.42, 0.38, 0.18, 20), C("#3a4a62"), M(p[0], 2.38, p[2]));
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3, fl = faceMesh(SP.flyerTex(k), 0.34, 0.48); (fl.material as THREE.MeshBasicMaterial).color.setScalar(0.92); fl.position.set(p[0] + Math.sin(a) * 0.365, 1.05 + 0.55 * (k % 2), p[2] + Math.cos(a) * 0.365); fl.rotation.y = a; S.add(fl); }
        contact(S, [p[0], 0.02, p[2]], 1.0, 1.0, 0.4); } }
    // (h) S12's clipboard page "1 in 4" (in the world, at EDIT's CLIP point in the interviewer's hands, turned to the S12
    //     lens; shown in S12 only; the marks land on "1", "in", "4", "seen")
    { const C0: V3 = [STUDY.iv[0] - 0.18, 1.08, STUDY.iv[2] - 0.2], cam: V3 = [C0[0] - 0.52, C0[1] + 0.64, C0[2] - 0.64];
      this.clip.position.set(...C0); this.clip.lookAt(cam[0], cam[1], cam[2]); S.add(this.clip);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.34, 0.008), C("#a8743f")); board.position.z = -0.006; board.castShadow = true; this.clip.add(board);
      this.clipPage = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.293), new THREE.MeshBasicMaterial({ map: SP.clipPageTex(0), color: new THREE.Color(0.95, 0.94, 0.92) })); this.clipPage.position.set(0, -0.012, 0.0); this.clip.add(this.clipPage);
      const cl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.016), C("#b9bcc8")); cl.position.set(0, 0.16, 0.004); this.clip.add(cl);
      this.clip.visible = false; }
    // (i) ground detail under the low lenses: leaf litter decals, two dropped flyers, a paper cup (flat, never inked,
    //     nothing a walker trips on; none under the branch, so nothing "points" at the bills)
    { const lm = (k: number) => TM("sqLitterM" + k, () => SP.litterTex(k), { transparent: true, alphaTest: 0.3, depthWrite: false });
      const spots: [number, number][] = [[1.6, 12.6], [-0.9, 13.4], [3.2, 11.0], [0.4, 9.6], [2.6, 7.4], [-1.6, 2.6], [1.0, 0.8], [3.9, 2.9], [5.4, -1.6], [-2.6, -3.2], [0.2, -10.4], [4.4, -13.2],
        [6.4, 6.2], [5.8, 11.8], [-3.6, 9.4], [6.9, -6.0], [-4.2, -8.4], [2.2, -19.5]];
      spots.forEach(([x, z], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2), lm(i % 4)); m.position.set(x, 0.02 + 0.0003 * i, z); m.rotation.y = hash(i * 4.7) * TAU; m.layers.set(NOINK); m.renderOrder = 1; m.receiveShadow = true; S.add(m); });
      for (const [x, z, k, ry] of [[3.4, 12.2, 1, 0.5], [-2.2, -1.2, 4, 2.1]] as number[][]) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.3).rotateX(-Math.PI / 2), TM("sqFlyerFlat" + k, () => SP.flyerTex(k))); fl.position.set(x, 0.024, z); fl.rotation.y = ry; fl.receiveShadow = true; S.add(fl); }
      b.add(new THREE.CylinderGeometry(0.04, 0.03, 0.1, 12).rotateZ(Math.PI / 2), C("#efe4cc"), M(4.9, 0.04, 12.6, 0.7)); }
    // (g) birds: four crossing the high sky over the library and the arts building (never behind the bills), loop-safe
    for (let k = 0; k < 4; k++) { const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(0), transparent: true, depthWrite: false, fog: false })); s2.layers.set(NOINK); s2.scale.set(1.3, 0.65, 1); S.add(s2); this.birds.push(s2); }
  }
  private poseV2(ctx: SetCtx) {
    const vf = ctx.vf;
    // the S19 board: only in S19; the numbers land on "6"
    this.s19.visible = ctx.id === SID.S19;
    if (this.s19.visible) { const m = this.s19Mat[ctx.f >= BEAT.stoppedFor - 2 ? 1 : ctx.f >= BEAT.six - 2 ? 2 : 0];   /* "6 in 100" on "6", "20 in 100" on "stopped" */ this.s19.traverse((c) => { const me = c as THREE.Mesh; if (me.isMesh && me.geometry.type === "PlaneGeometry") me.material = m; }); }
    // S12's clipboard: shown in S12 only; its page state follows the words
    this.clip.visible = ctx.id === SID.S12;
    if (this.clip.visible) { const f = ctx.f, st = f >= Math.min(BEAT.hadSeen - 2, BEAT.four18 + 6) ? 4 : f >= BEAT.four18 - 1 ? 3 : f >= BEAT.in18 - 1 ? 2 : f >= BEAT.one18 - 2 ? 1 : 0;
      const m = this.clipPage.material as THREE.MeshBasicMaterial, t = SP.clipPageTex(st); if (m.map !== t) { m.map = t; m.needsUpdate = true; } }
    // bunting pennants flutter on the breeze (whole cycles over the loop)
    for (const p of this.pennants) p.m.rotation.x = 0.22 * Math.sin(loopPh(vf, 41) + p.ph) + 0.08 * Math.sin(loopPh(vf, 97) + 2 * p.ph);
    if (this.umbrella) this.umbrella.rotation.z = 0.025 * Math.sin(loopPh(vf, 19) + 1);
    // birds: each crosses right -> left in a gentle wave, n whole crossings per loop
    this.birds.forEach((s2, k) => { const n = 3 + k, u = ((((n * vf) / LOOP + k * 0.27) % 1) + 1) % 1, fl = Math.floor(vf / 3 + k) % 3;
      const t = birdTex(fl), m = s2.material as THREE.SpriteMaterial; if (m.map !== t) { m.map = t; m.needsUpdate = true; }
      s2.position.set(70 - 85 * u, 24 + 4 * k + 1.2 * Math.sin(u * 14 + k), -46 - 6 * k); m.opacity = sm(u / 0.06) * (1 - sm((u - 0.9) / 0.1)); s2.scale.set(-1.3, 0.65, 1); });
  }

  /** the clock's extra minutes at picture frame f: it runs through one HOUR while "So for an hour, he rode laps" is
   *  spoken, and is back at its start by the time the square is seen again (shot 9 = the loop) */
  private static hourAt(f: number) {
    const a = BEAT.soFor - 4, b = BEAT.hourEnd + 6;
    const u = clamp01((f - a) / (b - a));
    return 60 * (u * u * (3 - 2 * u));
  }

  pose(ctx: SetCtx, L: Lighting) {
    const vf = ctx.vf, f = ctx.f;
    this.tree.pose(ctx);
    /* the channel's crow is hidden ONCE: on the lamp arm in the opening framing (shots 1 and 9 = the loop); gone elsewhere */
    this.crow.visible = ctx.id === SID.Q1;   /* the quiz shot (its replays E1 / E3 draw Q1 too) */
    this.poseV2(ctx);
    if (this.p3) this.p3.pose(ctx);
    // banners: a slow sway on their arms
    this.banners.forEach((m, i) => { m.rotation.set(0.05 * Math.sin(loopPh(vf, 21 + 3 * i) + i), 0.1 * Math.sin(loopPh(vf, 15 + 2 * i) + 2 * i), 0.03 * Math.sin(loopPh(vf, 27 + i) + 0.5 * i)); });
    // the clock: 2:10 + the hour spin
    { const min = 130 + SquareSet.hourAt(f);
      this.hands[0].rotation.z = -(min / 720) * TAU; this.hands[1].rotation.z = -(min / 60) * TAU; }
    // the fountain: the jets' texture falls (whole cycles), the surface drifts
    this.jetMap.offset.y = ((40 * vf) / LOOP) % 1; this.pool.offset.set(((3 * vf) / LOOP) % 1, ((2 * vf) / LOOP) % 1);
    this.jets.forEach((m, i) => { const k = 1 + 0.07 * Math.sin(loopPh(vf, 37 + 2 * i) + i); m.scale.set(1, i < 2 ? k : 0.94 + 0.06 * k, 1); });
    // pigeons: peck, look up, a little hop now and then (hashed slots on the loop clock; none near the seam)
    const SLOT = Math.round(LOOP / Math.max(1, Math.round(LOOP / 46)));
    this.pigeons.forEach((p, i) => {
      const [x, z, face, ph] = PIGEONS[i], t = (((vf + ph * SLOT) % LOOP) + LOOP) % LOOP, n = Math.floor(t / SLOT), u = (t - n * SLOT) / SLOT, hsh = hash(i * 17.3 + n * 5.1);
      const pecking = hsh < 0.55 && u > 0.15 && u < 0.85 && Math.sin(u * TAU * 4) > 0.2;
      const hop = hsh > 0.78 ? Math.sin(Math.PI * clamp01((u - 0.3) / 0.25)) : 0, dir = hash(i * 3.1 + n) > 0.5 ? 1 : -1;
      const walk = 0.1 * Math.sin(loopPh(vf, 5 + i) + i * 2.1);
      p.position.set(x + walk + 0.12 * dir * (hsh > 0.78 ? sm((u - 0.3) / 0.25) - sm((u - 0.7) / 0.2) : 0), 0.15 + 0.1 * hop, z);
      const tx = pigeonTex(pecking ? 1 : 0), mat = p.material as THREE.SpriteMaterial; if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      p.scale.set(face * 0.34, 0.34, 1);
    });
    // far students: a tiny idle bob; the two walkers stroll along the library front and back (one loop each way)
    this.students.forEach((s, i) => { s.position.y = STUDENTS[i][1] + 0.012 * Math.sin(loopPh(vf, 9 + i) + i); });
    this.walkers.forEach((s, k) => { const u = (((vf / LOOP + k * 0.5) % 1) + 1) % 1, tri = u < 0.5 ? u * 2 : 2 - u * 2, x = 8 + 13 * tri, step = Math.abs(Math.sin(loopPh(vf, 120) + k));
      s.position.set(x, 0.02 * step, -35.6 - 0.8 * k); s.scale.set((u < 0.5 ? 1 : -1) * 0.83, 1.66, 1); });
    // petals: each falls from a blossom tree's crown to the bricks once per cycle, sliding on the breeze
    this.petals.forEach((s, k) => { const c = CHERRIES[k % 5], n = 3 + (k % 3), u = (((n * vf) / LOOP + hash(k * 3.7)) % 1 + 1) % 1, a = hash(k * 9.1) * TAU;
      s.position.set(c[0] - 0.4 - 1.6 * u + 0.5 * Math.cos(a) + 0.18 * Math.sin(u * 14 + k), 0.04 + (1 - u) * (0.5 + 0.6 * c[2]), c[1] + 0.5 * Math.sin(a) + 0.4 * u);
      const mat = s.material as THREE.SpriteMaterial; mat.opacity = 0.95 * sm(u / 0.08) * (1 - sm((u - 0.9) / 0.1)); s.scale.set(0.07, 0.045, 1); });
    // the far cards take the fog colour a little (haze)
    this.hills.forEach((m, i) => { m.color.set(ctx.light.fog).lerp(new THREE.Color(1, 1, 1), i ? 0.78 : 0.55); });
    // ONE soft cloud shadow drifts across the plaza from the south-west, twice per film (a whole number: the loop)
    { const dirx = 0.42, dirz = -0.908, u = (((2 * vf) / LOOP + 0.18) % 1 + 1) % 1, s = -78 + 156 * u;
      L.cloud([dirx, dirz], s + 9, s - 9, 5.5, [0.8, 0.82, 0.95]); }
  }
}

/** an A-frame sandwich board (two w x h faces leaning +-lean from a top hinge) at p, turned by yaw (the front face looks
 *  toward +z rotated by yaw); mats = [front, back] */
function aFrame(parent: THREE.Object3D, mats: THREE.Material[], p: V3, yaw: number, w: number, h: number, lean = 0.2) {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = yaw;
  const H = h * Math.cos(lean);
  [1, -1].forEach((sd, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats[i] ?? mats[0]);
    m.position.set(0, H - (h / 2) * Math.cos(lean), sd * (h / 2) * Math.sin(lean)); m.rotation.set(-lean, sd > 0 ? 0 : Math.PI, 0, "YXZ"); m.castShadow = true; m.receiveShadow = true; g.add(m); });
  const wood = C("#6e4428");
  for (const sx of [-1, 1]) for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, h + 0.02, 0.03), wood); leg.position.set(sx * (w / 2 + 0.018), H - (h / 2) * Math.cos(lean), sd * (h / 2) * Math.sin(lean) - sd * 0.005); leg.rotation.x = -sd * lean; leg.castShadow = true; g.add(leg); }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w + 0.08, 8).rotateZ(Math.PI / 2), wood); top.position.set(0, H, 0); g.add(top);
  parent.add(g);
  return g;
}
/** the S19 board face (chalk on slate, 0.8 x 1.1 m): "ON A PHONE" / "6 in 100" and "NO PHONE" / "20 in 100"; full = false
 *  shows the labels with a chalk "?" where the numbers go (they land on the narrator's "6") */
const s19Tex = (st: number) => SP.boardFace("sqS19v2_" + st, (g, ch) => {
  ch("ON A PHONE", 200, 100, "#f4f1e6"); ch(st >= 1 ? "6 in 100" : "?", 380, 170, "#ff9a8a");
  g.strokeStyle = "rgba(244,241,230,0.6)"; g.lineWidth = 8; g.beginPath(); g.moveTo(120, 480); g.lineTo(648, 480); g.stroke();
  ch("NO PHONE", 640, 100, "#f4f1e6"); ch(st >= 2 ? "20 in 100" : "?", 820, 170, "#b0e890");
});
/** a parked bicycle along local +z, leaning a little on its stand */
function bicycle(b: Batch, x: number, z: number, lean: number, col: string) {
  const m = M(x, 0, z, Math.PI / 2, [1, 1, 1], lean, 0), fr = C(col), blk = C("#22222a"), sil = C("#b8bcc4");
  const add = (g: THREE.BufferGeometry, mat: THREE.Material) => b.add(g, mat, m);
  for (const dx of [-0.52, 0.52]) { add(new THREE.TorusGeometry(0.33, 0.026, 6, 22).translate(dx, 0.34, 0), blk); add(new THREE.CylinderGeometry(0.03, 0.03, 0.06).rotateX(Math.PI / 2).translate(dx, 0.34, 0), sil); }
  const seg = (a: [number, number], c: [number, number], r = 0.02, mat: THREE.Material = fr) => { const A = new THREE.Vector3(a[0], a[1], 0), B = new THREE.Vector3(c[0], c[1], 0), d = B.clone().sub(A), L = d.length();
    add(new THREE.CylinderGeometry(r, r, L, 6).translate(0, L / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).translate(A.x, A.y, 0), mat); };
  seg([-0.52, 0.34], [-0.08, 0.36]); seg([-0.08, 0.36], [0.36, 0.78]); seg([-0.08, 0.36], [-0.22, 0.86]); seg([-0.52, 0.34], [-0.22, 0.8]); seg([0.52, 0.34], [0.38, 0.92]); seg([-0.22, 0.8], [0.36, 0.78]);
  seg([-0.22, 0.86], [-0.24, 0.92], 0.02, blk); add(new THREE.BoxGeometry(0.24, 0.05, 0.13).translate(-0.24, 0.94, 0), blk);
  seg([0.38, 0.92], [0.3, 1.0], 0.016, sil); add(new THREE.CylinderGeometry(0.014, 0.014, 0.5).rotateX(Math.PI / 2).translate(0.3, 1.0, 0), sil);
}

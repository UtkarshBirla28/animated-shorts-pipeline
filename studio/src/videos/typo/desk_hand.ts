// THE HERO HAND (owner DESK): a painted 3D cartoon right hand (a mitten with the index finger out) + the forearm and a
// white rolled shirt sleeve up to the trader's right shoulder. Posed per frame by its FINGERTIP (world point), a yaw
// and a small pitch / roll; the forearm trails straight back from the wrist to a resting elbow, the upper arm runs to
// the fixed shoulder. Lit two-tone materials, so the world ink pass outlines it like the rest of the set.
import * as THREE from "three";
import { CE, Q } from "./setkit";
import type { V3 } from "./plan";

/** the trader's right shoulder (set-local; CHAR: his card's right shoulder should sit near here) */
export const SHOULDER: V3 = [0.2, 1.02, 1.97];
const SKIN = "#f8efe6", SKIN_D = "#efdccd", SHIRT = "#f5f6f2", SHIRT_D = "#e2e5e6", NAIL = "#fff6f0";

type Seg = { m: THREE.Mesh; r0: number; r1: number };
const unitCyl = (r0: number, r1: number, seg = 14) => new THREE.CylinderGeometry(r1, r0, 1, seg, 1, false).translate(0, 0.5, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
/** stretch a unit cylinder mesh from a to b */
const span = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
  _d.subVectors(b, a); const L = _d.length();
  m.position.copy(a); m.quaternion.setFromUnitVectors(_up, _d.normalize()); m.scale.set(1, Math.max(1e-4, L), 1);
};
const capsule = (r: number, a: V3, b: V3, mat: THREE.Material) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CapsuleGeometry(r, L, 6, 14); const m = new THREE.Mesh(g, mat);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(_up, d.normalize()); return m;
};
const blob = (rx: number, ry: number, rz: number, p: V3, mat: THREE.Material, rot: V3 = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), mat); m.scale.set(rx, ry, rz); m.position.set(...p); m.quaternion.copy(Q(...rot)); return m;
};

export class HeroHand {
  readonly root = new THREE.Group();
  /** the hand itself (fingertip at its origin; local -z = pointing direction, +z back toward the wrist) */
  readonly hand = new THREE.Group();
  private fore: Seg; private sleeveF: Seg; private upper: Seg; private cuff: THREE.Mesh; private elbow: THREE.Mesh;
  private wristL = new THREE.Vector3(0.019, 0.066, 0.17);
  readonly wrist = new THREE.Vector3(); readonly elbowP = new THREE.Vector3();
  constructor(parent: THREE.Object3D) {
    // a little warm self-light keeps the near-white cartoon skin from going lavender in the cool room shade
    const skin = CE(SKIN, "#f0d8c4", 0.32), skinD = CE(SKIN_D, "#e8ccb8", 0.3), shirt = CE(SHIRT, "#e8ecf0", 0.22), shirtD = CE(SHIRT_D, "#d8dce2", 0.2), nail = CE(NAIL, "#ffe8e0", 0.4);
    const S = 1.18, h = this.hand;
    const inner = new THREE.Group(); inner.scale.setScalar(S); h.add(inner);
    // index finger (tip at the origin, knuckle up and back), a nail, the knuckle bump
    inner.add(capsule(0.0108, [0, 0.0098, 0.004], [0.004, 0.04, 0.07], skin));
    inner.add(blob(0.0074, 0.0026, 0.0092, [0.0006, 0.0192, 0.0118], nail, [-0.42, 0, 0]));
    // the palm (a soft wedge: wider at the knuckles), the curled fingers (the mitten), the thumb tucked along
    inner.add(blob(0.04, 0.023, 0.048, [0.019, 0.052, 0.105], skin, [-0.3, 0, 0]));
    inner.add(blob(0.03, 0.022, 0.025, [0.03, 0.036, 0.072], skin, [-0.5, 0, 0.12]));
    inner.add(blob(0.022, 0.017, 0.016, [0.042, 0.03, 0.08], skinD, [-0.5, 0, 0.2]));
    inner.add(capsule(0.0118, [-0.022, 0.04, 0.112], [-0.021, 0.026, 0.078], skin));
    for (const c of inner.children) { (c as THREE.Mesh).castShadow = true; (c as THREE.Mesh).receiveShadow = true; }
    this.root.add(h);
    // forearm (skin), the rolled cuff, the sleeve to the elbow, the elbow, the upper arm
    const mk = (r0: number, r1: number, mat: THREE.Material): Seg => { const m = new THREE.Mesh(unitCyl(r0, r1), mat); m.castShadow = true; m.receiveShadow = true; this.root.add(m); return { m, r0, r1 }; };
    this.fore = mk(0.022, 0.027, skin);
    this.cuff = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.011, 10, 22), shirtD); this.cuff.castShadow = true; this.root.add(this.cuff);
    this.sleeveF = mk(0.034, 0.039, shirt);
    this.elbow = new THREE.Mesh(new THREE.SphereGeometry(0.039, 18, 12), shirt); this.elbow.castShadow = true; this.root.add(this.elbow);
    this.upper = mk(0.039, 0.042, shirt);
    void skinD;
    parent.add(this.root);
  }
  /** pose: fingertip world point, yaw (rad, 0 = pointing -z; + = turned toward -x), pitch (- = finger steeper), roll;
   *  the elbow trails `back` m behind the wrist, `drop` m lower; the shoulder is the fixed world point sh */
  pose(tip: V3, yaw: number, pitch: number, roll: number, sh: V3, back = 0.25, drop = 0.06, mirror = false) {
    const h = this.hand; h.position.set(...tip); h.quaternion.copy(Q(pitch, yaw, roll)); h.scale.set(mirror ? -1 : 1, 1, 1); h.updateMatrix(); h.updateMatrixWorld(true);
    this.wrist.copy(this.wristL).applyMatrix4(h.matrixWorld);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // the forearm runs back from the wrist along the hand's heading, dropping toward a resting elbow
    this.elbowP.copy(this.wrist).addScaledVector(dir, back).add(new THREE.Vector3(mirror ? -0.035 : 0.035, -drop, 0));
    const cuffP = _a.copy(this.wrist).lerp(this.elbowP, 0.46);
    span(this.fore.m, this.wrist, cuffP);
    const fd = _b.subVectors(this.elbowP, this.wrist).normalize();
    this.cuff.position.copy(cuffP); this.cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fd);
    span(this.sleeveF.m, cuffP.clone(), this.elbowP);
    this.elbow.position.copy(this.elbowP);
    span(this.upper.m, this.elbowP, new THREE.Vector3(...sh));
  }
}

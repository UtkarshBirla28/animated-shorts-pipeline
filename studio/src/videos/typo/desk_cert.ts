// THE CERTIFICATE FOUNTAIN (owner DESK, shot 1): paper share certificates pop up out of the hero keyboard like toast
// (one, then another, then dozens, faster and faster), arc over the desk and land round it; from "didn't" the newest
// ones come out as GHOSTS (see-through, a dashed outline). Deterministic per frame (a pure function of f): instanced
// meshes, every certificate's launch time / path / landing from hashes of its index.
import * as THREE from "three";
import { BEAT } from "./beats";
import { TR } from "./plan";
import { lam, basic, hash, clamp01, TAU, softDot } from "./setkit";
import { certTex, ghostTex } from "./desk_tex";
import { CERT } from "./hook";

const N_SOLID = 300, N_GHOST = 110;
/** launch frame of certificate i (picture clock): exponential at first, then a steady ~2 per frame */
const T0 = BEAT.typo + 3, K = 16, RMAX = 2.0, XB = Math.log(RMAX * K), NB = Math.exp(XB) - 1;
export const launchAt = (i: number) => (i < NB ? T0 + K * Math.log(1 + i) : T0 + K * XB + (i - NB) / RMAX);
/** certificates launched by frame f */
export const launchedBy = (f: number) => { const x = f - T0; if (x < 0) return 0; return x < K * XB ? Math.floor(Math.exp(x / K) - 1) + 1 : Math.floor(NB + (x - K * XB) * RMAX) + 1; };

type Path = { sx: number; sz: number; ex: number; ey: number; ez: number; ap: number; T: number; yaw: number; flips: number; tilt: number; ghost: boolean; lift: number };
const DESK = TR.desk;
/** a landing spot: on the desk top (away from the keyboard / monitors / props) or on the floor round the desk */
const land = (i: number): [number, number, number] => {
  for (let k = 0; k < 12; k++) {
    // sideways and forward (never back over the screens): right-back .. front .. left-back
    const a = (-0.3 + 1.6 * hash(i * 7.13 + k * 3.1)) * Math.PI, rr = 0.3 + 1.4 * Math.pow(hash(i * 2.71 + k * 5.3), 0.8);
    const x = TR.kb.c[0] + Math.cos(a) * rr * 1.25, z = TR.kb.c[2] - 0.05 + Math.sin(a) * rr * 0.85;
    const onDesk = Math.abs(x - DESK.c[0]) < DESK.w / 2 - 0.08 && Math.abs(z - DESK.c[2]) < DESK.d / 2 - 0.06;
    if (onDesk) {
      if (Math.abs(x) < 0.33 && z > 1.18 && z < 1.47) continue;      // the keyboard + the hand
      if (z < 1.08 && Math.abs(x) < 0.9) continue;                    // the monitors' feet
      if (Math.hypot(x - TR.tea[0], z - TR.tea[2]) < 0.09) continue;
      if (Math.abs(x - TR.phone[0]) < 0.14 && Math.abs(z - TR.phone[2]) < 0.14) continue;
      return [x, DESK.top + 0.0015 + (i % 23) * 0.0005, z];
    }
    const inside = Math.abs(x - DESK.c[0]) < DESK.w / 2 + 0.05 && Math.abs(z - DESK.c[2]) < DESK.d / 2 + 0.05;
    if (inside) continue;
    if (Math.abs(x) < 0.45 && z > 1.55 && z < 2.5) continue;          // the trader's chair
    if (x > 0.25 && z > 1.7) continue;                                // the camera side of the pull-out
    return [x, 0.004 + (i % 29) * 0.0005, z];
  }
  return [-0.6 - hash(i) * 0.3, DESK.top + 0.002 + (i % 23) * 0.0005, 0.95 + 0.2 * hash(i + 3)];
};
const paths: Path[] = [];
const pathOf = (i: number): Path => {
  if (paths[i]) return paths[i];
  const [ex, ey, ez] = land(i);
  const sx = -0.17 + hash(i * 1.37) * 0.27, sz = 1.27 + hash(i * 4.21) * 0.08;
  const dist = Math.hypot(ex - sx, ez - sz);
  return (paths[i] = { sx, sz, ex, ey, ez, ap: 0.1 + 0.16 * hash(i * 9.7) + 0.07 * dist, T: 15 + 6 * hash(i * 3.3) + 7 * dist, yaw: (hash(i * 6.1) - 0.5) * 2.4,
    flips: hash(i * 8.8) > 0.55 ? 1 : 0, tilt: (hash(i * 2.2) - 0.5) * 0.9, ghost: launchAt(i) >= BEAT.didnt, lift: 0.07 + 0.03 * hash(i * 5.5) });
};
const CW = CERT.w, CH = CERT.h;   // fix2: a little larger (they are seen from the front medium now)
/** a slightly curled sheet (toast-like stiffness) */
const certGeo = () => {
  const g = new THREE.PlaneGeometry(CW, CH, 6, 2), p = g.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < p.count; k++) { const x = p.getX(k) / (CW / 2); p.setZ(k, 0.006 * x * x); }
  g.computeVertexNormals(); return g;
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), Z0 = new THREE.Matrix4().makeScale(0, 0, 0);

export class Fountain {
  readonly group = new THREE.Group();
  private solid: THREE.InstancedMesh; private back: THREE.InstancedMesh; private ghost: THREE.InstancedMesh; private puffs: THREE.Sprite[] = [];
  constructor(parent: THREE.Object3D) {
    const geo = certGeo();
    // fix2: the printed face on the front only; the BACK is plain cream paper (a double-sided map showed mirrored text
    // on every sheet that tumbled past the front lens)
    this.solid = new THREE.InstancedMesh(geo, lam("si:dkCertF", () => ({ map: certTex(), side: THREE.FrontSide })), N_SOLID);
    this.solid.castShadow = true; this.solid.receiveShadow = true; this.solid.frustumCulled = false;
    this.back = new THREE.InstancedMesh(geo, lam("si:dkCertB", () => ({ color: "#efe6cb", side: THREE.BackSide })), N_SOLID);
    this.back.receiveShadow = true; this.back.frustumCulled = false; this.group.add(this.back);
    this.ghost = new THREE.InstancedMesh(geo, basic("dkGhostM", () => ({ map: ghostTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: new THREE.Color(1.15, 1.25, 1.35) })), N_GHOST);
    this.ghost.frustumCulled = false; this.ghost.layers.set(3); this.ghost.renderOrder = 4;
    for (let k = 0; k < 10; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: new THREE.Color(1, 1, 1), transparent: true, depthWrite: false, opacity: 0 }));
      s.layers.set(3); s.renderOrder = 5; this.group.add(s); this.puffs.push(s);
    }
    this.group.add(this.solid, this.ghost); parent.add(this.group);
  }
  /** shot-1 frame f (picture clock); visible = false hides everything */
  pose(f: number, visible: boolean) {
    this.group.visible = visible;
    if (!visible) return;
    const n = Math.min(N_SOLID + N_GHOST, launchedBy(f));
    let ns = 0, ng = 0;
    for (let i = 1; i < n; i++) {   // fix2: no. 0 is the hero certificate that lands on his forehead (hook.ts certA)
      const P = pathOf(i), t0 = launchAt(i), age = f - t0;
      if (age < 0) continue;
      // phase A (0..5 f): the toast pop: rises upright out of the keys; phase B: the arc + tumble; then lies flat
      const pop = 5, u = clamp01((age - pop) / P.T);
      let x: number, y: number, z: number, rx: number, ry: number, rz: number, sc = 1;
      const y0 = TR.kb.c[1] - 0.02;
      if (age < pop) {
        const a = age / pop, e = 1 - (1 - a) * (1 - a);
        x = P.sx; z = P.sz; y = y0 + CH / 2 * 0.2 + e * P.lift; rx = 0; ry = 0; rz = 0; sc = 0.75 + 0.25 * e;
      } else {
        const ue = u, sy = y0 + P.lift + CH * 0.1;
        x = P.sx + (P.ex - P.sx) * ue + Math.sin(ue * Math.PI * 3 + i) * 0.03 * ue * (1 - ue);
        z = P.sz + (P.ez - P.sz) * ue;
        // up fast, floats down slower (paper): a skewed arc
        const ua = Math.pow(ue, 0.8);
        y = sy + (P.ey - sy) * ua * ua + 4 * P.ap * ua * (1 - ua);
        const land = u >= 1;
        rx = land ? -Math.PI / 2 : -Math.PI / 2 * Math.pow(ue, 0.7) - TAU * P.flips * ue;
        ry = P.yaw * ue; rz = land ? 0 : Math.sin(ue * 7 + i) * P.tilt * (1 - ue);
      }
      _e.set(rx, ry, rz, "YXZ"); _q.setFromEuler(_e); _p.set(x, y, z); _s.setScalar(sc);
      _m.compose(_p, _q, _s);
      if (P.ghost) { if (ng < N_GHOST) this.ghost.setMatrixAt(ng++, _m); }
      else if (ns < N_SOLID) { this.back.setMatrixAt(ns, _m); this.solid.setMatrixAt(ns++, _m); }
    }
    for (let k = ns; k < N_SOLID; k++) { this.solid.setMatrixAt(k, Z0); this.back.setMatrixAt(k, Z0); }
    this.back.count = Math.max(1, ns); this.back.instanceMatrix.needsUpdate = true;
    for (let k = ng; k < N_GHOST; k++) this.ghost.setMatrixAt(k, Z0);
    this.solid.count = Math.max(1, ns); this.ghost.count = Math.max(1, ng);
    this.solid.instanceMatrix.needsUpdate = true; this.ghost.instanceMatrix.needsUpdate = true;
    // a soft puff of paper dust at the newest launches
    for (let k = 0; k < this.puffs.length; k++) {
      const i = n - 1 - k * Math.max(1, Math.floor(n / 30)), s = this.puffs[k];
      if (i < 0) { s.visible = false; continue; }
      const P = pathOf(i), age = f - launchAt(i), a = clamp01(age / 10);
      s.visible = age >= 0 && age < 10;
      s.position.set(P.sx, TR.kb.c[1] + 0.02 + 0.04 * a, P.sz); s.scale.setScalar(0.05 + 0.08 * a);
      (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - a);
    }
  }
}

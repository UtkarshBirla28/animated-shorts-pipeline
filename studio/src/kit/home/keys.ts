// KIT / HOME: a key ring (3 keys + a small emerald train charm, the film's "YOUR keys") that hangs from a pivot and
// SWINGS: a damped pendulum (~2 Hz, the real length of a key bunch) driven by kicks { t, amp } (the hand letting go of
// the lever, the door moving), plus a per-item secondary swing that lags the ring. Pure function of t. The pivot is a
// key inserted in a lock cylinder by default (`inLock`), or any moving anchor (`anchor(t)`) for a hand.
// Local frame: the keys hang in the local XY plane (y up), the lock face normal is local +Z.
import * as THREE from "three";
import type { Built, KitCtx } from "../core/ctx";
import { pbr, mesh, at, kick, rboxC, type V3 } from "./util";

export type KeyKick = { t: number; amp: number };
export type KeyRingOpts = {
  /** the pivot (world) and the facing of the lock face (world yaw of its normal) */
  pos: V3; yaw?: number;
  /** kicks (rad of ring swing) at film times */
  kicks?: KeyKick[];
  /** a key is in the lock (its bow sticks out of the cylinder) = default; false: the ring hangs from a hook / hand */
  inLock?: boolean;
  /** charm body colour (sRGB) */
  charm?: [number, number, number];
  seed?: number;
};

const keyShape = (len: number, bowR: number, teeth: number[], seedTilt = 0) => {
  // a flat key: round bow with a hole + a shoulder + a blade with bitting on the lower edge (metres, bow centre at origin, blade along -y)
  const s = new THREE.Shape();
  const bw = 0.0045, L = len;
  s.absarc(0, 0, bowR, Math.PI * 1.4, -Math.PI * 0.4, true);          // bottom-left, over the top, to bottom-right
  s.lineTo(bw * 1.4, -bowR - 0.002); s.lineTo(bw, -bowR - 0.004);
  // blade right edge straight, tip, then the bitting back up the left edge
  s.lineTo(bw, -bowR - L); s.lineTo(0, -bowR - L - 0.003); s.lineTo(-bw, -bowR - L + 0.002);
  const n = teeth.length;
  for (let i = 0; i < n; i++) { const y = -bowR - L + 0.004 + ((i + 0.5) / n) * (L - 0.008); s.lineTo(-bw - teeth[i], y - 0.0015); s.lineTo(-bw - teeth[i], y + 0.0015); }
  s.lineTo(-bw, -bowR - 0.004); s.lineTo(-bw * 1.4, -bowR - 0.002);
  const hole = new THREE.Path(); hole.absarc(0, bowR * 0.35, bowR * 0.28, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0004, bevelSegments: 1, curveSegments: 18 });
  g.translate(0, -bowR * 0.35, -0.0009);          // hang from the hole centre
  void seedTilt;
  return g;
};

/** the small emerald commuter-train charm (3.4 cm): rounded body, window band, white stripe, cab glass, wheels */
const trainCharm = (body: THREE.Material, dark: THREE.Material, white: THREE.Material) => {
  const g = new THREE.Group();
  g.add(mesh(rboxC(0.034, 0.014, 0.012, 0, 0, 0, 0.004, 3), body, true));
  g.add(mesh(rboxC(0.03, 0.0045, 0.0124, -0.001, 0.0025, 0, 0.0015), dark, false));       // window band
  g.add(mesh(rboxC(0.0345, 0.0015, 0.0125, 0, -0.0022, 0, 0.0006), white, false));       // stripe
  g.add(mesh(rboxC(0.004, 0.006, 0.0105, 0.0158, 0.0022, 0, 0.0015), dark, false));      // cab glass
  for (const x of [-0.011, 0.011]) for (const z of [-0.0052, 0.0052]) g.add(mesh(at(new THREE.CylinderGeometry(0.0026, 0.0026, 0.0016, 12), x, -0.0075, z, Math.PI / 2), dark, false));
  return g;
};

export const keyRing = async (_ctx: KitCtx, o: KeyRingOpts): Promise<Built & { pivot: THREE.Group; swing: (t: number) => number }> => {
  const root = new THREE.Group(); root.name = "keyRing";
  const brass = pbr({ color: [0.78, 0.62, 0.32], rough: 0.32, metal: 1, brushed: true, tile: 0.03, normalScale: 0.15 });
  const nickel = pbr({ color: [0.8, 0.8, 0.78], rough: 0.28, metal: 1, brushed: true, tile: 0.03, normalScale: 0.15 });
  const steel = pbr({ color: [0.72, 0.72, 0.72], rough: 0.22, metal: 1, peel: 0 });
  const charmM = pbr({ color: o.charm ?? [0.12, 0.6, 0.35], rough: 0.25, peel: 0, clearcoat: 0.6, ccRough: 0.1 });
  const darkM = pbr({ color: [0.06, 0.08, 0.1], rough: 0.2, peel: 0 }), whiteM = pbr({ color: [0.93, 0.93, 0.9], rough: 0.4, peel: 0 });
  // the key in the lock: only its bow + shoulder show; the pivot = its hole
  const pivot = new THREE.Group(); pivot.name = "keyPivot";
  if (o.inLock !== false) {
    // the key in the cylinder: blade along -z into the door, its flat bow standing vertical (YZ plane) 3.4 cm out of
    // the cylinder face; the ring hangs from its hole (= the pivot)
    const kg = keyShape(0.03, 0.011, [0.002, 0.001, 0.0025, 0.0015, 0.002]); kg.rotateX(Math.PI / 2); kg.rotateZ(Math.PI / 2);
    const k0 = mesh(kg, nickel, true, "keyInLock"); k0.position.set(0, 0, 0.034); root.add(k0);
    pivot.position.set(0, 0, 0.034);
  }
  // the split ring (torus) + the bunch, all under `swingG` (rotates about the pivot)
  const swingG = new THREE.Group(); pivot.add(swingG);
  const ring = mesh(new THREE.TorusGeometry(0.0125, 0.0011, 8, 40), steel, true, "splitRing");
  ring.position.set(0, -0.0125, 0); swingG.add(ring);
  const items: { g: THREE.Group; lag: number; amp: number }[] = [];
  const hang = (child: THREE.Object3D, angle: number, lag: number, amp: number) => {
    const g = new THREE.Group(); g.position.set(Math.sin(angle) * 0.0125, -0.0125 - Math.cos(angle) * 0.0125, 0.0015 * (items.length % 2 ? 1 : -1));
    g.add(child); swingG.add(g); items.push({ g, lag, amp });
  };
  hang(mesh(keyShape(0.034, 0.012, [0.0025, 0.0012, 0.002, 0.003, 0.0015, 0.002]), brass, true, "keyA"), -0.35, 0.08, 1.0);
  hang(mesh(keyShape(0.028, 0.0105, [0.0018, 0.0028, 0.001, 0.0022]), nickel, true, "keyB"), 0.15, 0.12, 1.2);
  hang(mesh(keyShape(0.022, 0.009, [0.0012, 0.002, 0.0015]), nickel, true, "keyC"), 0.5, 0.06, 0.8);
  // the charm on a short ball chain
  const ch = new THREE.Group();
  const links = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 8, 6), steel, 9);
  for (let i = 0; i < 9; i++) links.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, -0.003 * i, 0));
  links.castShadow = true; ch.add(links);
  const tr = trainCharm(charmM, darkM, whiteM); tr.position.set(0, -0.034, 0); tr.rotation.z = 0.08; ch.add(tr);
  hang(ch, -0.05, 0.16, 1.5);
  root.add(pivot);
  root.position.set(...o.pos); root.rotation.y = o.yaw ?? 0;
  const kicks = o.kicks ?? [];
  // ring swing (rad): a 2.1 Hz damped pendulum per kick + a faint idle drift (the corridor draught)
  const swing = (t: number) => kicks.reduce((a, k) => a + kick(t, k.t, k.amp, 2.1, 2.2), 0) + 0.012 * Math.sin(t * 1.3 + (o.seed ?? 0));
  const twist = (t: number) => kicks.reduce((a, k) => a + kick(t, k.t + 0.05, k.amp * 0.6, 1.4, 1.8), 0);
  return { object: root, pivot, swing, update: (t) => {
    swingG.rotation.z = swing(t); swingG.rotation.y = twist(t) * 0.8;
    for (const it of items) { it.g.rotation.z = (swing(t - it.lag) - swing(t)) * it.amp * 1.4; it.g.rotation.x = twist(t - it.lag) * 0.35 * it.amp; }
  } };
};

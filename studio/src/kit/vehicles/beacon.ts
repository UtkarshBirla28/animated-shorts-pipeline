// kit/vehicles (TRAIN owner): a FAR LAMP THAT MUST READ AT PHONE SIZE (the green signal the driver points at; usable
// for any small lit lamp far down the line). Two additive glow sprites with a SCREEN-SIZE FLOOR (a core and a halo,
// given in pixels of a 1080 x 1920 frame, resolution-independent) over an optional matte black background board that
// the haze does not lift (fog off: a far lamp on a bright hazy sky has no contrast, a real signal with a poor
// background gets exactly such a board). The lamp housing itself is somebody else's model (kit/rail signalJP): this
// only stands in front of it.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";

export type BeaconOpts = {
  /** the lamp's world position at film time t (the centre of the lit lens) */
  pos: (t: number) => V3;
  /** the way the lamp faces (unit, default +Z = toward a train that runs toward -Z) */
  face?: V3;
  /** linear HDR colour of the core (default signal green) */
  color?: [number, number, number];
  /** the floors on screen, in px of a 1920-high frame: the core disc and the soft halo (defaults 18 / 40) */
  corePx?: number; haloPx?: number;
  /** the real sizes (m) they have when near (defaults 0.22 / 0.7) */
  coreM?: number; haloM?: number;
  /** a matte black background board [w, h] m behind the lamp (false = none); `boardDy` = its centre relative to the
   *  lamp (default -0.35: a 3-lamp head with the lit lamp on top) */
  board?: [number, number] | false; boardDy?: number;
  /** 0..1 at t (a lamp that goes out); default 1 */
  on?: (t: number) => number;
  /** hide it when the lamp is nearer than this along its facing axis, or behind the lens (default 4 m) */
  nearM?: number;
};

let glowTex: THREE.Texture | null = null, coreTex: THREE.Texture | null = null;
const radial = (stops: [number, number][]) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [p, a] of stops) gr.addColorStop(p, `rgba(255,255,255,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
};
const roundRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 6);
};

export const lampBeacon = (ctx: KitCtx, o: BeaconOpts): Built => {
  const col = o.color ?? [0.22, 2.7, 1.05], face = new THREE.Vector3(...(o.face ?? [0, 0, 1])).normalize();
  const g = new THREE.Group(); g.name = "lamp-beacon";
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: (coreTex ??= radial([[0, 1], [0.55, 1], [0.8, 0.35], [1, 0]])), color: new THREE.Color(...col),
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (glowTex ??= radial([[0, 0.9], [0.25, 0.42], [0.55, 0.12], [1, 0]])), color: new THREE.Color(...col).multiplyScalar(0.45),
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  for (const [s, ro] of [[halo, 6], [core, 7]] as const) { s.renderOrder = ro; s.userData.noProbe = true; s.position.copy(face).multiplyScalar(0.12); g.add(s); }
  let board: THREE.Mesh | null = null;
  if (o.board !== false) {
    const [w, h] = o.board ?? [1.7, 2.6];
    board = new THREE.Mesh(roundRect(w, h, 0.18), new THREE.MeshBasicMaterial({ color: 0x040506, fog: false }));
    board.position.copy(face).multiplyScalar(-0.2); board.position.y += o.boardDy ?? -0.35;
    board.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
    board.name = "beacon-board"; board.castShadow = false; board.receiveShadow = false; g.add(board);
  }
  const wp = new THREE.Vector3(), cp = new THREE.Vector3(), base = new THREE.Color(...col);
  const update = (t: number, cam: THREE.Camera) => {
    const p = o.pos(t); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld();
    const pc = cam as THREE.PerspectiveCamera;
    wp.setFromMatrixPosition(g.matrixWorld); cp.setFromMatrixPosition(cam.matrixWorld);
    const d = wp.distanceTo(cp), along = cp.sub(wp).dot(face);            // > 0: the lens is in front of the lamp
    const k = Math.max(0, Math.min(1, o.on ? o.on(t) : 1));
    g.visible = along > (o.nearM ?? 4) && k > 0.001;
    if (!g.visible) return;
    // metres that one pixel of a 1920-high frame covers at the lamp's distance (the same at every render size)
    const mpp = (2 * d * Math.tan((((pc.fov ?? 55) * Math.PI) / 180) / 2)) / 1920;
    core.scale.setScalar(Math.max(o.coreM ?? 0.22, ((o.corePx ?? 18) * mpp) / 0.75));   // the texture's solid disc is ~75 % of the sprite
    halo.scale.setScalar(Math.max(o.haloM ?? 0.7, (o.haloPx ?? 40) * mpp));
    (core.material as THREE.SpriteMaterial).color.copy(base).multiplyScalar(k);
    (halo.material as THREE.SpriteMaterial).color.copy(base).multiplyScalar(0.45 * k);
  };
  return { object: g, update };
};

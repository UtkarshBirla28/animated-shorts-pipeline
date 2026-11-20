// TRADING ROOM window light (owner TRADING): the sun / sky light that comes through the -z window wall and its venetian
// blinds, baked into additive light decals (floor, desk tops, the +x wall). Each texel traces back toward the key
// light: through the window plane (bays, mullions, piers, the blind slats of that state) and against the room's
// occluder boxes (desks, monitors, partitions, columns), so the stripes fall where the engine's own key light falls.
import * as THREE from "three";
import { tx, G } from "./setkit";
import { NOINK } from "./ink";
import { TR, type V3 } from "./plan";

export type Box = [number, number, number, number, number, number];
/** the window wall: glass runs between the piers; mullions inside them */
export const WIN = { z: TR.windows.z, y0: TR.windows.y0, y1: TR.windows.y1, piers: [[-3.75, -2.65], [2.9, 3.5]] as [number, number][], mullW: 0.07 };
export const glassRuns = (): [number, number][] => [[TR.windows.x0, WIN.piers[0][0]], [WIN.piers[0][1], WIN.piers[1][0]], [WIN.piers[1][1], TR.windows.x1]];
export const mullions = (): number[] => {
  const out: number[] = [];
  for (const [a, b] of glassRuns()) { const n = Math.max(1, Math.round((b - a) / 1.45)); for (let k = 1; k < n; k++) out.push(a + ((b - a) * k) / n); }
  return out;
};
/** blind states: drop = the blind's bottom edge (y), pitch = slat pitch (m), duty = open fraction of the slat gaps;
 *  per-bay drops for the morning (some blinds half down) */
export type BlindState = { drop: (bay: number) => number; top: number; pitch: number; duty: number };
export const BLINDS: Record<"am" | "eve", BlindState> = {
  am: { drop: (b) => [2.75, 2.05, 2.75, 2.4, 2.75, 1.95, 2.75, 2.75, 2.25, 2.75, 2.05, 2.75, 2.75][b % 13], top: 2.75, pitch: 0.075, duty: 0.55 },
  eve: { drop: (b) => [1.3, 1.25, 1.35, 1.3, 1.2, 1.3, 1.25, 1.35, 1.3, 1.25, 1.3, 1.2, 1.3][b % 13], top: 2.95, pitch: 0.075, duty: 0.42 },
};
/** which glass bay (index across the wall) an x on the window plane is in, or -1 (pier / mullion / outside) */
export const bayAt = (x: number) => {
  let idx = 0;
  for (const [a, b] of glassRuns()) {
    const n = Math.max(1, Math.round((b - a) / 1.45)), w = (b - a) / n;
    if (x >= a && x <= b) { const k = Math.min(n - 1, Math.floor((x - a) / w)), xl = a + k * w; if (x - xl < WIN.mullW / 2 || xl + w - x < WIN.mullW / 2) return -1; return idx + k; }
    idx += n;
  }
  return -1;
};
/** light transmitted through the window at window-plane point (x, y) for a blind state (0..1, soft slat edges) */
export const winMask = (st: BlindState, x: number, y: number) => {
  const b = bayAt(x); if (b < 0 || y < WIN.y0 || y > WIN.y1) return 0;
  const d = st.drop(b);
  if (y < d) return 1;
  if (y > st.top) return 0;
  const ph = ((y - d) / st.pitch) % 1, e = 0.18;
  const a = Math.min(1, Math.max(0, (ph - (1 - st.duty)) / e)) * Math.min(1, Math.max(0, (1 - ph) / e));
  return a * 0.95;
};
/** blur a canvas in place (through a copy) */
const blurIn = (g: G, px: number) => { const c = document.createElement("canvas"); c.width = g.canvas.width; c.height = g.canvas.height; c.getContext("2d")!.drawImage(g.canvas, 0, 0); g.clearRect(0, 0, c.width, c.height); g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); g.filter = "none"; };
/** ray (p + t k, t > 0) vs axis box: hit? */
const hitBox = (p: V3, k: V3, b: Box, maxT = 1e9) => {
  let t0 = 1e-3, t1 = 1e9;
  for (let i = 0; i < 3; i++) {
    const lo = b[i], hi = b[i + 3];
    if (Math.abs(k[i]) < 1e-9) { if (p[i] < lo || p[i] > hi) return false; continue; }
    let a = (lo - p[i]) / k[i], c = (hi - p[i]) / k[i]; if (a > c) { const s = a; a = c; c = s; }
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return false;
  }
  return t0 < maxT;
};
/** the light reaching world point p (set-local) from key k through the window: mask x visibility */
export const lightAt = (p: V3, k: V3, st: BlindState, occ: Box[], maxT = 1e9) => {
  if (k[2] >= -1e-3) return 0;
  const t = (WIN.z - p[2]) / k[2]; if (t <= 0) return 0;
  const m = winMask(st, p[0] + t * k[0], p[1] + t * k[1]);
  if (m <= 0.001) return 0;
  for (const b of occ) { if (b[2] > p[2]) continue; if (hitBox(p, k, b, maxT)) return 0; }
  return m;
};
/** a light decal on a horizontal rect (y) or a vertical wall (x = const): baked mask texture (white on transparent) */
export type Decal = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial };
const decalMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false, color: new THREE.Color(0, 0, 0) });
/** bake the light onto a horizontal rect x0..x1, z0..z1 at height y (px per metre ppm), blurred by blur px */
export const floorDecal = (parent: THREE.Object3D, key: string, x0: number, x1: number, z0: number, z1: number, y: number, k: V3, st: BlindState, occ: Box[], ppm: number, blur = 1.5, maxT = 1e9): Decal => {
  const W = Math.max(8, Math.round((x1 - x0) * ppm)), H = Math.max(8, Math.round((z1 - z0) * ppm));
  const near = occ.filter((b) => b[3] > x0 - 8 && b[0] < x1 + 8 && b[5] > z0 - 9 && b[2] < z1 + 1);
  const map = tx("trGobo_" + key, W, H, (g: G) => {
    const im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const a = lightAt([x0 + ((i + 0.5) / W) * (x1 - x0), y + 0.002, z0 + ((j + 0.5) / H) * (z1 - z0)], k, st, near, maxT);
      const q = (j * W + i) * 4; im.data[q] = im.data[q + 1] = im.data[q + 2] = 255; im.data[q + 3] = Math.round(255 * a);
    }
    g.putImageData(im, 0, 0);
    if (blur > 0) blurIn(g, blur);
  }, true);
  const mat = decalMat(map);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mat);
  mesh.position.set(TR.base[0] + (x0 + x1) / 2, TR.base[1] + y, TR.base[2] + (z0 + z1) / 2); mesh.layers.set(NOINK); mesh.renderOrder = 3; parent.add(mesh);
  return { mesh, mat };
};
/** bake the light onto a wall at x = xw (facing -x, so the room side), z0..z1, y0..y1 */
export const wallXDecal = (parent: THREE.Object3D, key: string, xw: number, face: number, z0: number, z1: number, y0: number, y1: number, k: V3, st: BlindState, occ: Box[], ppm: number, blur = 1.5): Decal => {
  const W = Math.max(8, Math.round((z1 - z0) * ppm)), H = Math.max(8, Math.round((y1 - y0) * ppm));
  const map = tx("trGobo_" + key, W, H, (g: G) => {
    const im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      // the plane is turned about y: facing -x its u runs along +z, facing +x along -z
      const zz = face < 0 ? z0 + ((i + 0.5) / W) * (z1 - z0) : z1 - ((i + 0.5) / W) * (z1 - z0), yy = y1 - ((j + 0.5) / H) * (y1 - y0);
      const a = lightAt([xw + face * 0.003, yy, zz], k, st, occ);
      const q = (j * W + i) * 4; im.data[q] = im.data[q + 1] = im.data[q + 2] = 255; im.data[q + 3] = Math.round(255 * a);
    }
    g.putImageData(im, 0, 0);
    if (blur > 0) blurIn(g, blur);
  }, true);
  const mat = decalMat(map);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), mat);
  mesh.position.set(TR.base[0] + xw + face * 0.004, TR.base[1] + (y0 + y1) / 2, TR.base[2] + (z0 + z1) / 2); mesh.rotation.y = face < 0 ? -Math.PI / 2 : Math.PI / 2;
  mesh.layers.set(NOINK); mesh.renderOrder = 3; parent.add(mesh);
  return { mesh, mat };
};

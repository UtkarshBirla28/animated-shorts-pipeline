// Track pieces for the lineside world (STATION owner). `treadTrack` = SURFACES' kit `railTrack()` (1,067 mm, ballast bed,
// bevelled concrete sleepers every 0.6 m, clips, rusty-sided rails with polished heads) with its ballast switched to
// GEOMETRY-UV mapping, so the ballast moves with the mesh on the treadmill (a world-XZ surface would stand still under
// moving sleepers). Plus a brake-dust / oil strip between the rails, a cheap `farTrack` to the vanishing point (instanced
// sleepers), and `groundStrip` (a uv-mapped soil / gravel patch that can scroll).
import * as THREE from "three";
import type { KitCtx } from "../core/ctx";
import { railTrack, patchGeometry, type Lens } from "../surfaces/ground";
import { surface, type SurfaceOpts, type SurfName } from "../surfaces/materials";
import { canvasTex, hash, rng } from "./util";

export const RAIL_H = 0.59;            // rail top above the track base (railTrack: 0.25 bed + 0.17 sleeper + 0.018 clip + 0.152 rail)

/** metre UVs (x, -z) from local positions (so a "uv" surface reads like its "xz" twin, but moves with the mesh) */
export const uvFromXZ = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = -p.getZ(i); }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};

let stainTex: THREE.Texture | null = null;
/** brake dust + oil down the middle of a track (multiply quad texture, tiles along the track) */
const stain = () => (stainTex ??= (() => {
  const t = canvasTex(256, 1024, (g, w, h) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    const R = rng(77);
    for (let i = 0; i < 2600; i++) {
      const x = w / 2 + (R() + R() + R() - 1.5) * w * 0.42, y = R() * h, s = 2 + R() * 9;
      const k = R(); g.fillStyle = k < 0.55 ? `rgba(70,40,22,${0.06 + R() * 0.12})` : `rgba(20,18,16,${0.05 + R() * 0.1})`;
      g.beginPath(); g.ellipse(x, y, s, s * (1 + R() * 3), 0, 0, Math.PI * 2); g.fill();
    }
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0)"); gr.addColorStop(0.75, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  t.wrapT = THREE.RepeatWrapping; return t;
})());
const stainMat = () => new THREE.MeshBasicMaterial({ map: stain(), transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true, polygonOffset: true, polygonOffsetFactor: -3 });

export type TreadTrackOpts = { x: number; z0: number; z1: number; gauge?: number; base?: number; seed?: number; lens?: Lens; stain?: boolean };
/** one track (static or scrolling): railTrack + uv ballast. `base` = track base y (rail top = base + 0.59). */
export const treadTrack = async (ctx: KitCtx, o: TreadTrackOpts) => {
  const base = o.base ?? -RAIL_H;
  const t = await railTrack(ctx, { x: o.x, z0: o.z0, z1: o.z1, gauge: o.gauge ?? 1.067, y: base, seed: o.seed, lens: o.lens });
  const bal = t.object.children.find((c) => (c as THREE.Mesh).material === t.mats.ballast) as THREE.Mesh | undefined;
  if (bal) {
    uvFromXZ(bal.geometry);
    bal.material = await surface(ctx, "ballast", { uv: "uv", tint: [0.84, 0.82, 0.8], dirt: { grime: 0.28, edge: 0.35 }, seed: o.seed });
  }
  if (o.stain !== false) {
    const L = o.z1 - o.z0, q = new THREE.PlaneGeometry(1.25, L); q.rotateX(-Math.PI / 2); q.translate(o.x, base + 0.25 + 0.004, (o.z0 + o.z1) / 2);
    const uv = q.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * Math.max(1, Math.round(L / 10)));
    const sm = new THREE.Mesh(q, stainMat()); sm.renderOrder = 1; sm.receiveShadow = false; t.object.add(sm);
    // a second, finer stain over the sleepers (rust from the clips)
    const q2 = q.clone(); q2.translate(0, 0.17 + 0.002, 0);
    const s2 = new THREE.Mesh(q2, stainMat()); (s2.material as THREE.MeshBasicMaterial).opacity = 0.6; s2.renderOrder = 1; t.object.add(s2);
  }
  return t;
};

/** a cheap far track (ballast strip + 2 rails + instanced sleepers), from z1 down to z0, scrolled by `shift(m)` */
export const farTrack = async (ctx: KitCtx, o: { x: number; z0: number; z1: number; base?: number; gauge?: number }) => {
  const G = new THREE.Group(); G.name = "farTrack";
  const base = o.base ?? -RAIL_H, L = o.z1 - o.z0, gauge = o.gauge ?? 1.067;
  const bg = new THREE.PlaneGeometry(4.2, L, 1, 1); bg.rotateX(-Math.PI / 2); bg.translate(o.x, base + 0.2, (o.z0 + o.z1) / 2); uvFromXZ(bg);
  const bm = await surface(ctx, "ballast", { uv: "uv", res: "1k", tint: [0.8, 0.79, 0.77], dirt: { grime: 0.3 } });
  const b = new THREE.Mesh(bg, bm); b.receiveShadow = true; G.add(b);
  const n = Math.floor(L / 0.6), sl = new THREE.BoxGeometry(2.0, 0.18, 0.24);
  const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.55, 0.54, 0.51, THREE.SRGBColorSpace), roughness: 0.9 });
  const im = new THREE.InstancedMesh(sl, sm, n); const m4 = new THREE.Matrix4(); const R = rng(9);
  for (let i = 0; i < n; i++) { m4.makeTranslation(o.x + (R() - 0.5) * 0.02, base + 0.33, o.z1 - 0.3 - i * 0.6); im.setMatrixAt(i, m4); }
  im.receiveShadow = true; im.castShadow = false; G.add(im);
  const rm = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.25, 0.14, 0.08), roughness: 0.6, metalness: 0.5 });
  const hm = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.7, 0.7, 0.72), roughness: 0.18, metalness: 1 });
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, L), rm); r.position.set(o.x + s * gauge / 2, base + 0.5, (o.z0 + o.z1) / 2); G.add(r);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.02, L), hm); h.position.set(o.x + s * gauge / 2, base + RAIL_H - 0.01, (o.z0 + o.z1) / 2); G.add(h);
  }
  return G;
};

/** a uv-mapped ground patch (moves with its mesh), graded tessellation toward `lens` */
export const groundStrip = async (ctx: KitCtx, name: SurfName, o: { rect: [number, number, number, number]; y?: number | ((x: number, z: number) => number); lens?: Lens; coarse?: number; opts?: SurfaceOpts; seed?: number }) => {
  const { geometry } = patchGeometry({ rect: o.rect, y: o.y ?? 0, lens: o.lens, fine: 0.05, k: 0.02, coarse: o.coarse ?? 1.2, displace: false });
  if (typeof o.y === "function") geometry.computeVertexNormals();
  uvFromXZ(geometry);
  const m = await surface(ctx, name, { uv: "uv", ...o.opts, seed: o.seed });
  const mesh = new THREE.Mesh(geometry, m); mesh.receiveShadow = true; mesh.castShadow = false; mesh.userData.kitModule = "rail-ground";
  return mesh;
};
void hash;

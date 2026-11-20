// SURFACES sandbox set (a): the look pilot's campus path at the pilot's camera (knee height, 25 mm), rebuilt from the
// kit only: displaced brick pavers with moss / weeds in the joints and a worn walking line, segmented bevelled edging
// stones, a cross path, lawn soil (NATURE adds blades; none here), projected decals, a building edge (facade kit) and
// the far building. A shadow-only "gobo" canopy (a stand-in for NATURE's trees, invisible to the lens) throws dapple.
import * as THREE from "three";
import type { KitCtx, Built, SetBuilder, CamState, V3 } from "../../kit/core/ctx";
import { path, lawn, farGround, groundMesh, type Lens } from "../../kit/surfaces/ground";
import { addDecals, scatterWear } from "../../kit/surfaces/decals";
import { probeModules, surfProps } from "./probe";

// ---- the pilot's shot (lookpilot/shot.ts, copied: the frozen pilot is not imported) ----
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const charPos = (t: number): V3 => [0.32 + 0.09 * Math.sin(t * 1.25 + 0.6) + 0.03 * Math.sin(t * 2.9), 0, -4.7 + 0.85 * t];
const distAt = (t: number) => 3.25 * Math.pow(1.95 / 3.25, ease(t / 5) * 0.85 + 0.15 * (t / 5));
export const pilotCam = (t: number): CamState => {
  const c = charPos(t), d = distAt(t), u = ease(t / 5);
  const x = -0.38 + 0.95 * u + 0.025 * Math.sin(t * 1.7 + 0.3), y = 0.62 + 0.03 * Math.sin(t * 2.1 + 1.1) + 0.04 * u, z = c[2] + d;
  return { pos: [x, y, z], look: [c[0] * 0.6 + 0.1 * (x - c[0]) - 0.05, 1.12 + 0.05 * u, c[2] - 0.6], fov: 72, roll: 0.6 * Math.PI / 180 * Math.sin(t * 0.9 + 0.4) - 0.4 * Math.PI / 180, focus: d, fnum: 4 };
};
export const CROSS_Z = -12.2;

/** shadow-only leaf canopy: alpha-tested canvas of leaf clusters, casts into the sun map, draws nothing. NOTE: three copies
 *  map / alphaTest / side from the object's material onto its depth material, so they must be set on the MAIN material */
export const gobo = (size: number, pos: V3, seed = 3) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1024; const g = cv.getContext("2d")!;
  let s = seed >>> 0; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  g.fillStyle = "rgba(255,255,255,0)"; g.clearRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const x = R() * 1024, y = R() * 1024, cl = Math.sin(x * 0.006 + 1.3) * Math.sin(y * 0.005 + 0.4); if (cl < -0.35 && R() < 0.85) continue;
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(x, y, 5 + R() * 14, 3 + R() * 8, R() * 6.28, 0, 6.28); g.fill(); }
  const t = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, map: t, alphaTest: 0.5, side: THREE.DoubleSide }));
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5, side: THREE.DoubleSide });
  m.castShadow = true; m.frustumCulled = false; m.position.set(...pos); m.userData.kitModule = "gobo";
  return m;
};

export const buildPathSet: SetBuilder = async (ctx: KitCtx): Promise<Built> => {
  const root = new THREE.Group(); root.name = "set_path";
  const lens: Lens = { points: [[-0.38, -1.45], [-0.1, -0.3], [0.2, 0.6], [0.57, 1.55]] };
  const P = await path(ctx, { width: 2.4, z0: -76, z1: 9.5, lens, edgingGaps: [[CROSS_Z - 1.1, CROSS_Z + 1.1]], seed: 2,
    surfaceOpts: { displace: true, moss: { amount: 0.95, edge: 0.55, weeds: 0.7, scaleM: 0.7 }, dirt: { joints: 0.85, edge: 0.4, grime: 0.14, dust: 0.55, color: [0.11, 0.09, 0.07] }, wear: { polish: 0.3, centre: 0.7, chips: 0.9 } } });
  root.add(P.object);
  // the cross path (same pavers, same material: "xz" surfaces are continuous in world space)
  for (const r of [[-13, -1.2], [1.2, 13]] as [number, number][])
    root.add(groundMesh(P.mats.paving, { rect: [r[0], r[1], CROSS_Z - 1.1, CROSS_Z + 1.1], lens, edges: (_x, z) => [1 - Math.min(1, Math.min(z - (CROSS_Z - 1.1), CROSS_Z + 1.1 - z) / 0.4), 0] }));
  // decals on the paving: leaf-stain prints, a dried puddle stain, a crack, a wear patch on the walking line
  addDecals(P.mats.paving, [
    { type: "leaves", at: [-0.75, -1.6], size: [0.9, 0.7], rot: 0.4, opacity: 0.8 },
    { type: "leaves", at: [0.8, -6.2], size: [1.0, 0.8], rot: 1.2, opacity: 0.7 },
    { type: "stain", at: [0.35, -3.6], size: [1.1, 0.8], rot: 0.2, opacity: 0.55 },
    { type: "wear", at: [0.1, -8.5], size: [1.4, 3.0], rot: 0.05, opacity: 0.7 },
    { type: "moss", at: [-1.0, 0.8], size: [0.6, 1.6], rot: 0.1, opacity: 0.9 },
    { type: "moss", at: [1.05, -4.5], size: [0.5, 1.8], rot: -0.1, opacity: 0.8 },
    { type: "puddle", at: [-0.55, -10.2], size: [0.9, 0.55], rot: 0.3, opacity: 0.9 },
  ]);
  scatterWear(P.mats.paving, [-1.1, 1.1, -40, -14], { stain: 3, leaves: 2, crack: 1 }, 9);
  addDecals(P.mats.paving, [{ type: "stain", at: [-0.6, 0.2], size: [0.7, 0.5], rot: 0.7, opacity: 0.6, tint: [0.45, 0.4, 0.36] }, { type: "stain", at: [0.5, -1.8], size: [0.9, 0.6], rot: 2.1, opacity: 0.5, tint: [0.42, 0.38, 0.34] }]);
  // lawns both sides (NATURE adds the blades), far ground
  for (const r of [[-14, -1.3, -80, 12], [1.3, 14, -80, 12]] as [number, number, number, number][]) root.add((await lawn(ctx, { rect: r, lens })).object);
  root.add((await farGround(ctx, "lawn_soil", [-120, 120, -200, 30], { tint: [0.8, 0.9, 0.7] }, -0.03)).object);
  // the canopy stand-in (sun side, high): dapple on the path like the pilot's trees
  root.add(gobo(40, [-12, 8.5, -16], 5));
  // facade: the building edge on the right + the far building at the end of the path (facade.ts, loaded lazily)
  try {
    const F = await import("../../kit/surfaces/facade");
    // a CLOSED building at the path edge (main side faces the path, the flank faces the lens): no paper-thin edge
    const near = await F.building(ctx, { x0: 3.4, z0: -32, w: 11, d: 15, floors: 3, seed: 11, wall: "brick_wall", front: "-x", main: { door: 1, bays: 5 }, roof: "parapet" });
    root.add(near.object);
    const far = await F.facade(ctx, { origin: [-23, 0, -76], yaw: 0, width: 34, floors: 3, seed: 4, wall: "brick_wall", lod: "far", roof: "cornice" });
    root.add(far.object);
  } catch (e) { console.warn("set_path: facade not available yet", String(e)); }
  let probed = false;
  const sp = surfProps();
  for (const h of sp.hide ?? []) root.traverse((o) => { if (o.userData.kitModule === h) o.visible = false; });
  return {
    object: root,
    hints: { shadowCenter: [0, 0, -8], shadowExt: 24, probe: [0.2, 1.2, -3] },
    update: (_t, cam) => { if (sp.probe && !probed) { probed = true; probeModules(ctx, cam, root, "path"); } },
  };
};

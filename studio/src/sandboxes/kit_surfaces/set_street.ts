// SURFACES sandbox set (b): a street corner. Main road along Z (kerb faces x -7 .. 0), a side road along +X (kerb faces
// z -15 .. -8), cambered asphalt with sett gutters, segmented kerbs with worn arrises, slab sidewalks, painted centre
// dashes + edge lines + a zebra, a manhole, gutter drains, oil / crack / stain / puddle decals, and the corner building:
// a shop front with an awning on the main road (facade A) and a residential side with a door + steps (facade B).
import * as THREE from "three";
import type { KitCtx, Built, SetBuilder, CamState } from "../../kit/core/ctx";
import { street, groundMesh, farGround, kerbMesh, type Lens } from "../../kit/surfaces/ground";
import { addDecals, scatterWear, manhole, drainGrate } from "../../kit/surfaces/decals";
import { facade, building } from "../../kit/surfaces/facade";
import { probeModules, surfProps } from "./probe";

export const streetCam = (t: number): CamState => {
  const u = (t * 30 - 150) / 10;
  return { pos: [-7.7 + 0.1 * u, 1.05, -21.5], look: [1.2, 2.6, -6.5], fov: 72, focus: 14, fnum: 5.6 };
};

export const buildStreetSet: SetBuilder = async (ctx: KitCtx): Promise<Built> => {
  const root = new THREE.Group(); root.name = "set_street";
  const lens: Lens = { points: [[-7.7, -21.5], [-6.5, -19.5], [-4, -17]] };
  const kH = 0.12;
  // main road (left sidewalk only; the right sidewalks are built per block below), kerb cut at the junction
  const S = await street(ctx, { x0: -7, x1: 0, z0: -45, z1: 14, lens, sidewalk: [2.6, 0], markings: { centre: true, edges: false, zebraZ: -24.5 }, kerbGaps: { right: [[-15.2, -7.84]] }, wet: 0.25, seed: 3 });
  root.add(S.object);
  // side road: built along Z then turned so it runs along +X (xz surfaces sample WORLD coordinates, so the textures stay continuous)
  const T = await street(ctx, { x0: -15, x1: -8, z0: -40, z1: -0.3, sidewalk: [2.84, 2.84], markings: { centre: true, edges: false }, wet: 0.25, seed: 7 });
  T.object.rotation.y = -Math.PI / 2; root.add(T.object);
  // right sidewalks of the main road: near block (z > -5) and far block (z < -18), same slabs, raised by the kerb
  for (const r of [[0.16, 3.2, -5.0, 14], [0.16, 3.2, -45, -17.84], [0.16, 0.3, -7.84, -5.0], [0.16, 0.3, -17.84, -15.16]] as [number, number, number, number][]) root.add(groundMesh(S.mats.walk, { rect: r, y: kH - 0.004, lens, edges: (x) => [1 - Math.min(1, (x - 0.16) / 0.3), 0] }));
  // corner stones where the kerbs meet
  for (const z of [-7.92, -15.08]) root.add(kerbMesh(S.mats.kerb, { from: [0.08, z + 0.15], to: [0.08, z - 0.15], w: 0.16, h: kH, len: 0.3, r: 0.02, seed: 5 }));
  // decals: oil under parked-car spots, cracks, stains, puddles along the gutter, a patch of wear at the zebra
  addDecals(S.mats.road, [
    { type: "oil", at: [-1.4, -12.5], size: [0.9, 0.7], rot: 0.3 }, { type: "oil", at: [-1.2, -17.8], size: [0.7, 0.55], rot: 1.1, opacity: 0.8 },
    { type: "oil", at: [-5.6, -27.0], size: [0.8, 0.6], rot: 2.0, opacity: 0.7 },
    { type: "crack", at: [-3.3, -19.0], size: [2.2, 0.9], rot: 0.4 }, { type: "crack", at: [-5.2, -14.0], size: [1.8, 0.8], rot: -0.6, variant: 1 },
    { type: "crack", at: [-2.2, -9.0], size: [1.4, 1.4], rot: 0.2, variant: 2, opacity: 0.8 },
    { type: "puddle", at: [-0.6, -20.5], size: [1.6, 0.7], rot: 0.1 }, { type: "puddle", at: [-6.4, -16.0], size: [1.2, 0.6], rot: -0.2, opacity: 0.9 },
    { type: "stain", at: [-4.0, -22.5], size: [1.6, 1.1], rot: 0.5, opacity: 0.6 }, { type: "wear", at: [-3.5, -24.5], size: [6.5, 2.6], opacity: 0.5 },
  ]);
  scatterWear(S.mats.walk, [0.3, 3.0, -4, 12], { stain: 3, leaves: 2, crack: 1 }, 4);
  addDecals(T.mats.road, [{ type: "oil", at: [6, -9.6], size: [0.8, 0.6], rot: 0.4 }, { type: "crack", at: [9, -12.5], size: [2.0, 0.8], rot: 1.4 }, { type: "puddle", at: [4, -8.6], size: [1.4, 0.55], opacity: 0.8 }]);
  root.add(manhole({ at: [-3.6, S.roadY(-3.6) + 0.0, -15.5], r: 0.32 }));
  root.add(drainGrate({ at: [-0.15, 0.005, -19.0], w: 0.28, l: 0.55 }));
  root.add(drainGrate({ at: [5.0, 0.005, -7.85 - 0.15], w: 0.28, l: 0.55, rot: Math.PI / 2 }));
  // the corner building: A faces the main road (-X), B faces the side road (-Z); they meet at (3.2, -5)
  const A = await building(ctx, { x0: 3.2, z0: -5, w: 15, d: 15, y: kH, floors: 3, seed: 21, wall: "brick_wall", front: "-x", roof: "cornice",
    main: { shop: { awning: [[0.62, 0.08, 0.07], [0.92, 0.88, 0.8]] }, window: "sash", frameColor: [0.92, 0.9, 0.85] }, sides: { door: 2, window: "casement", frameColor: [0.1, 0.18, 0.14] } });
  const C = await building(ctx, { x0: 3.2, z0: -45, w: 14, d: 27, y: kH, floors: 4, seed: 5, wall: "painted_wall", front: "-x", roof: "cornice", lod: "far" });
  root.add(A.object, C.object);
  const D = await facade(ctx, { origin: [-9.8, kH, 14], yaw: Math.PI / 2, width: 60, floors: 3, seed: 9, wall: "painted_wall", lod: "far", wallOpts: { tint: [0.85, 0.88, 0.9] } });
  root.add(D.object);
  root.add((await farGround(ctx, "concrete_floor", [-80, 80, -120, 60], { tint: [0.7, 0.7, 0.68] }, -0.02)).object);
  const sp = surfProps(); let probed = false;
  for (const h of sp.hide ?? []) root.traverse((o) => { if (o.userData.kitModule === h) o.visible = false; });
  return { object: root, hints: { shadowCenter: [0, 0, -12], shadowExt: 24, probe: [-3, 1.2, -14] },
    update: (_t, cam) => { if (sp.probe && !probed) { probed = true; probeModules(ctx, cam, root, "street"); } } };
};

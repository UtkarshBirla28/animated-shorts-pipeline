// SURFACES sandbox set (c): an interior room lit by the sun through a window (the pipeline's sun + shafts) and a pendant
// lamp (CORE practical). Wood floorboards (displaced near the lens), plaster walls + one papered wall, skirting, crown
// moulding, a panelled door with architrave, curtains, radiator, sill board, art frames, a book shelf, ceiling rose.
import * as THREE from "three";
import type { KitCtx, Built, SetBuilder, CamState, RigSpec } from "../../kit/core/ctx";
import { room } from "../../kit/surfaces/interior";
import { facade } from "../../kit/surfaces/facade";
import { farGround } from "../../kit/surfaces/ground";
import { probeModules, surfProps } from "./probe";

export const ROOM_RIG: Partial<RigSpec> = { sunAz: 100, sunEl: 27 };
export const roomCam = (_t: number): CamState => ({ pos: [1.75, 1.32, 0.55], look: [-1.9, 1.1, -2.7], fov: 72, focus: 3.5, fnum: 4 });

export const buildRoomSet: SetBuilder = async (ctx: KitCtx): Promise<Built> => {
  const root = new THREE.Group(); root.name = "set_room";
  const Rm = await room(ctx, { origin: [-2.5, 0, -4], w: 5, d: 5, h: 2.9, seed: 4, lens: { points: [[1.75, 0.55], [0.5, -1]] },
    wallTint: [0.93, 0.85, 0.72], wallpaper: { wall: "back", colors: [[0.62, 0.66, 0.55], [0.5, 0.55, 0.45]] },
    windows: [{ wall: "left", at: 2.6, w: 1.35, h: 1.6, sill: 0.82 }],
    doors: [{ wall: "back", at: 4.0, color: [0.82, 0.8, 0.74] }],
    lamps: [{ x: 0, z: -1.6, drop: 0.8, lumens: 1100, shadow: true }],
    art: [{ wall: "back", at: 1.6, y: 1.6, w: 0.62, h: 0.8 }, { wall: "back", at: 2.6, y: 1.45, w: 0.36, h: 0.46 }, { wall: "right", at: 3.2, y: 1.6, w: 0.7, h: 0.5 }],
    shelf: { wall: "right", at: 1.6, y: 1.25, len: 1.3 }, floorOpts: { tint: [0.7, 0.7, 0.76], sat: 0.45, rough: 1.25 }, bounce: 0.12 });
  root.add(Rm.object);
  // outside the window: a house across the lawn + far ground (seen through the glass)
  const F = await facade(ctx, { origin: [-14, 0, 6], yaw: Math.PI / 2, width: 16, floors: 2, seed: 31, wall: "brick_wall", lod: "far" });
  root.add(F.object);
  root.add((await farGround(ctx, "lawn_soil", [-60, -2.8, -40, 40], { tint: [0.75, 0.85, 0.65] }, -0.02)).object);
  const sp = surfProps(); let probed = false;
  for (const h of sp.hide ?? []) root.traverse((o) => { if (o.userData.kitModule === h) o.visible = false; });
  return { object: root, hints: { shadowCenter: [-1.5, 0, -1.5], shadowExt: 7.5, probe: [0, 1.3, -1.5] },
    update: (t, cam) => { Rm.update?.(t, cam); for (const l of Rm.lamps) l.set(1); if (sp.probe && !probed) { probed = true; probeModules(ctx, cam, root, "room"); } } };
};

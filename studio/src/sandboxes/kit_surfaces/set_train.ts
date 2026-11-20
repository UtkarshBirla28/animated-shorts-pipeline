// SURFACES sandbox set (d): the new train-film surfaces in one view: a Japanese platform (slabs, yellow tactile guidance
// strip, painted white edge line, coping, grimy recessed front wall), a narrow-gauge track (ballast, concrete sleepers,
// rails), a white-tiled station wall with grime, a brushed-steel pillar, a tunnel-concrete retaining wall.
import * as THREE from "three";
import type { KitCtx, Built, SetBuilder, CamState } from "../../kit/core/ctx";
import { platform, railTrack, farGround } from "../../kit/surfaces/ground";
import { surface, setSurfAttrs } from "../../kit/surfaces/materials";
import { probeModules, surfProps } from "./probe";

export const trainCam = (_t: number): CamState => ({ pos: [1.2, 1.1 + 0.62, 3.0], look: [-1.0, 1.2, -6.0], fov: 72, focus: 5, fnum: 5.6 });

const wallQuad = (w: number, h: number) => { const g = new THREE.PlaneGeometry(w, h); const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); return setSurfAttrs(g, () => [0, 0, 0, 0]); };

export const buildTrainSet: SetBuilder = async (ctx: KitCtx): Promise<Built> => {
  const root = new THREE.Group(); root.name = "set_train";
  const lens = { points: [[1.2, 3.0], [0.5, 0]] as [number, number][] };
  // platform on +x, its edge at x = 0; the track centred at x = -1.6 on the track bed (y 0)
  root.add((await platform(ctx, { x0: 0, x1: 4.5, z0: -40, z1: 8, h: 1.1, lens })).object);
  root.add((await railTrack(ctx, { x: -1.6, z0: -40, z1: 8, gauge: 1.067, lens })).object);
  // the far side: a tunnel-concrete retaining wall, grimy and streaked
  const tun = await surface(ctx, "tunnel_concrete", { uv: "uv", dirt: { grime: 0.45, streaks: 0.6, bottom: 0.9, heightM: 0.8, baseY: 0 } });
  const tw = new THREE.Mesh(wallQuad(48, 5), tun); tw.rotation.y = Math.PI / 2; tw.position.set(-4.3, 2.5, -16); tw.receiveShadow = true; tw.castShadow = true; tw.userData.kitModule = "facade"; root.add(tw);
  // station wall behind the platform: white tiles with grime at the bottom and streaks
  const tiles = await surface(ctx, "subway_tiles", { uv: "uv", dirt: { bottom: 0.6, heightM: 0.5, baseY: 1.1, grime: 0.12, streaks: 0.25 } });
  const sw = new THREE.Mesh(wallQuad(48, 3.2), tiles); sw.rotation.y = -Math.PI / 2; sw.position.set(4.5, 1.1 + 1.6, -16); sw.receiveShadow = true; sw.userData.kitModule = "facade"; root.add(sw);
  // a brushed-steel pillar on the platform
  const steel = await surface(ctx, "steel_brushed", { uv: "uv", tileM: 0.6 });
  const pg = new THREE.CylinderGeometry(0.16, 0.16, 3.2, 32, 1); const pu = pg.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < pu.count; i++) pu.setXY(i, pu.getX(i) * 1.0, pu.getY(i) * 3.2);
  setSurfAttrs(pg, () => [0, 0, 0, 0]);
  const pillar = new THREE.Mesh(pg, steel); pillar.position.set(2.6, 1.1 + 1.6, -5); pillar.castShadow = true; pillar.receiveShadow = true; pillar.userData.kitModule = "facade"; root.add(pillar);
  root.add((await farGround(ctx, "ballast", [-30, 30, -120, 40], {}, -0.02)).object);
  const sp = surfProps(); let probed = false;
  return { object: root, hints: { shadowCenter: [0, 0, -6], shadowExt: 14, probe: [0, 1.6, -4] },
    update: (_t, cam) => { if (sp.probe && !probed) { probed = true; probeModules(ctx, cam, root, "train"); } } };
};

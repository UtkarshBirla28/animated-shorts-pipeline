// set "room": a small test interior for the interiorWarm / nightPractical rigs, practical lamps and the GI probe (CORE
// sandbox only: SURFACES owns the real interior room kit). 4.2 x 5 x 2.8 m, a window in the sun-side (-X) wall, plank
// floor, plaster walls, a table lamp (point, soft shadow), a wall sconce (spot), a sofa block, a rug, a shelf.
import * as THREE from "three";
import type { Built, SetBuilder } from "../../../kit/core/ctx";
import { pbrRepeat } from "../../../kit/core/assets";

export const buildRoom: SetBuilder = async (ctx): Promise<Built> => {
  const A = ctx.assets;
  const [planks, plaster] = await Promise.all([A.pbr("lookpilot/weathered_planks", "1k"), A.pbr("lookpilot/plastered_stone_wall", "1k")]);
  const mat = (p: typeof planks, rep: [number, number], col: [number, number, number], rough = 1) => {
    const r = pbrRepeat(p, rep);
    return new THREE.MeshStandardMaterial({ map: r.map, normalMap: r.normalMap, roughnessMap: r.arm, aoMap: r.arm, roughness: rough, color: new THREE.Color().setRGB(...col, THREE.SRGBColorSpace) });
  };
  const floorM = mat(planks, [2.2, 2.6], [0.95, 0.82, 0.7]);
  const wallM = mat(plaster, [2, 1.4], [0.93, 0.88, 0.8]);
  const ceilM = mat(plaster, [2, 2.4], [0.96, 0.94, 0.9]);
  const root = new THREE.Group(); root.name = "room";
  const W = 4.2, D = 5, H = 2.8, T = 0.15;
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; root.add(b); return b;
  };
  box(W + 2 * T, T, D + 2 * T, floorM, 0, -T / 2, 0);                    // floor
  box(W + 2 * T, T, D + 2 * T, ceilM, 0, H + T / 2, 0);                  // ceiling
  box(W + 2 * T, H + 0.2, T, wallM, 0, H / 2, -D / 2 - T / 2);           // back wall (-Z); walls overlap floor + ceiling (no leaks)
  box(T, H + 0.2, D, wallM, W / 2 + T / 2, H / 2, 0);                    // right wall (+X)
  // left wall (-X, the sun side) with a window 1.5 x 1.3 m (sill 0.9 m) centred at z -0.6
  const wz = -0.6, ww = 1.5, y0 = 0.9, y1 = 2.2;
  box(T, H + 0.2, (D / 2 + wz - ww / 2), wallM, -W / 2 - T / 2, H / 2, (-D / 2 + (wz - ww / 2)) / 2);
  box(T, H + 0.2, (D / 2 - (wz + ww / 2)), wallM, -W / 2 - T / 2, H / 2, ((wz + ww / 2) + D / 2) / 2);
  box(T, y0 + 0.1, ww, wallM, -W / 2 - T / 2, (y0 - 0.1) / 2, wz);
  box(T, H - y1 + 0.1, ww, wallM, -W / 2 - T / 2, (H + y1 + 0.1) / 2, wz);
  // the front wall (+Z) is left open for the lens (a set, not a room)
  // furniture
  const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.42, 0.26, 0.16, THREE.SRGBColorSpace), roughness: 0.55 });
  const fabric = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.36, 0.45, 0.52, THREE.SRGBColorSpace), roughness: 0.95 });
  const rugM = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.62, 0.3, 0.22, THREE.SRGBColorSpace), roughness: 1 });
  box(1.1, 0.04, 0.7, wood, 1.2, 0.72, -1.4); for (const [x, z] of [[0.7, -1.7], [1.7, -1.7], [0.7, -1.1], [1.7, -1.1]]) box(0.05, 0.7, 0.05, wood, x, 0.35, z);
  box(2.0, 0.45, 0.85, fabric, -0.6, 0.225, -2.0); box(2.0, 0.5, 0.2, fabric, -0.6, 0.7, -2.35);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), rugM); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.2, 0.004, -0.7); rug.receiveShadow = true; root.add(rug);
  box(0.9, 1.9, 0.32, wood, 1.85, 0.95, -2.3);
  for (let i = 0; i < 4; i++) box(0.84, 0.025, 0.3, wood, 1.85, 0.3 + i * 0.45, -2.3);
  // the table lamp: a shade (open cylinder) over a point practical with a soft shadow; a wall sconce (spot up the wall)
  const shadeM = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.95, 0.88, 0.72, THREE.SRGBColorSpace), roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color(1, 0.7, 0.4), emissiveIntensity: 0 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.24, 24, 1, true), shadeM); shade.position.set(1.4, 1.2, -1.55); root.add(shade);
  box(0.03, 0.42, 0.03, wood, 1.4, 0.95, -1.55);
  if (ctx.practical) {
    const lamp = ctx.practical({ kind: "point", pos: [1.4, 1.17, -1.55], kelvin: 2700, lumens: 800, shadow: true, shadowNear: 0.05, bulb: { radius: 0.035 }, flicker: 0.02, seed: 3 });
    root.add(lamp.object);
    const sconce = ctx.practical({ kind: "spot", pos: [2.0, 1.9, 0.6], target: [2.1, 2.8, 0.6], kelvin: 2900, lumens: 400, angle: 0.9, penumbra: 0.8, bulb: { radius: 0.03 }, seed: 5 });
    root.add(sconce.object);
    ctx.onUpdate(() => { shadeM.emissiveIntensity = 0.6 * (ctx.rig.practicalK ?? 0); });
  }
  return { object: root, hints: { shadowCenter: [0, 0, 0], shadowExt: 7, probe: [0.2, 1.2, -0.6], groundAlbedo: [0.4, 0.3, 0.22] } };
};

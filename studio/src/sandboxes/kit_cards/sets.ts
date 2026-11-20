// KIT_CARDS sandbox: two small test sets for the cards (CARDS owner): an INTERIOR with a barred window the low sun comes
// through + a warm lamp, and a NIGHT street under a sodium street lamp (moonlight as the "sun"). Built from the look
// pilot's CC0 assets (studio/public/lookpilot/). Only for proving the cards; the real rooms / streets are SURFACES' job.
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { seeded, WIND_T } from "../lookpilot/shaders";

export type SetW = { scene: THREE.Scene; sun: THREE.DirectionalLight | null; update: (t: number) => void; hazeDens: number; expo: number; sunColI: THREE.Color | null };
const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const tl = new THREE.TextureLoader();
const loadTex = async (path: string, srgb: boolean, rep: [number, number]) => {
  const t = await tl.loadAsync(staticFile(path)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t;
};
const pbr = async (id: string, res: string, rep: [number, number], o: THREE.MeshStandardMaterialParameters = {}) => {
  const [map, normalMap, arm] = await Promise.all([loadTex(`lookpilot/${id}/${id}_diff_${res}.jpg`, true, rep), loadTex(`lookpilot/${id}/${id}_nor_gl_${res}.jpg`, false, rep), loadTex(`lookpilot/${id}/${id}_arm_${res}.jpg`, false, rep)]);
  return seeded(new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap: arm, aoMap: arm, roughness: 1, metalness: 0, ...o }));
};
const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, cast = true) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = true; return b;
};
const mkSun = (dir: THREE.Vector3, col: THREE.Color, I: number, size: number, ext: number, target: THREE.Vector3, diamDeg = 0.6) => {
  const s = new THREE.DirectionalLight(col, I);
  s.castShadow = true; s.shadow.mapSize.set(size, size);
  const c = s.shadow.camera; c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 0.5; c.far = 60;
  s.shadow.radius = 50 + (c.far - c.near) * (diamDeg * Math.PI / 180) * (size / (2 * ext));   // > 50 = the pilot's PCSS
  s.shadow.bias = -0.0003; s.shadow.normalBias = 0.012;
  s.target.position.copy(target); s.position.copy(target).addScaledVector(dir, 30);
  return s;
};
const loadHdr = async (gl: THREE.WebGLRenderer) => {
  const t = await new RGBELoader().setDataType(THREE.FloatType).loadAsync(staticFile("lookpilot/hdri/je_gray_park_2k.hdr"));
  const d = (t.image as unknown as { data: Float32Array }).data;
  for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; if (l > 12) { const k = 12 / l; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; } }
  t.needsUpdate = true; t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(gl), env = pm.fromEquirectangular(t).texture; pm.dispose();
  return { bg: t, env };
};

// ================================================================ INTERIOR: a plaster room, a barred window, a warm lamp
/** the window is in the LEFT wall (x = -3); the low sun comes in from the left / back through four vertical bars and a
 *  transom, its patch lies on the planks where the character stands (x ~ -1.2, z ~ -1.5); a warm floor lamp stands to
 *  his right. */
export const ROOM_SUN = new THREE.Vector3(-0.82, 0.5, -0.28).normalize();
export const buildRoom = async (gl: THREE.WebGLRenderer): Promise<SetW> => {
  const [hdr, plaster, planks, brick] = await Promise.all([loadHdr(gl), pbr("plastered_stone_wall", "1k", [2.5, 1.2], { color: lin(0.95, 0.9, 0.82) }),
    pbr("weathered_planks", "1k", [3, 3], { color: lin(0.78, 0.66, 0.54) }), pbr("red_brick", "1k", [3, 2])]);
  const scene = new THREE.Scene();
  scene.background = hdr.bg; scene.environment = hdr.env; scene.backgroundIntensity = 0.55; scene.environmentIntensity = 0.07;
  scene.fog = new THREE.FogExp2(lin(0.5, 0.46, 0.42).multiplyScalar(0.25), 0.005);
  const root = new THREE.Group(); scene.add(root);
  const X0 = -3, X1 = 3, Z0 = -3.6, Z1 = 2.4, HY = 2.9;
  // floor + ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), planks); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2); floor.receiveShadow = true; root.add(floor);
  root.add(box(X1 - X0, 0.1, Z1 - Z0, plaster, 0, HY + 0.05, (Z0 + Z1) / 2));
  // back and right walls, skirting
  root.add(box(X1 - X0, HY, 0.18, plaster, 0, HY / 2, Z0 - 0.09));
  root.add(box(0.18, HY, Z1 - Z0, plaster, X1 + 0.09, HY / 2, (Z0 + Z1) / 2));
  const skirt = seeded(new THREE.MeshStandardMaterial({ color: lin(0.42, 0.3, 0.22), roughness: 0.6 }));
  root.add(box(X1 - X0, 0.1, 0.03, skirt, 0, 0.05, Z0 + 0.015, false), box(0.03, 0.1, Z1 - Z0, skirt, X1 - 0.015, 0.05, (Z0 + Z1) / 2, false));
  // the window wall (x = -3) with an opening z [-2.5, -0.5], y [0.75, 2.35]
  const WZ0 = -2.5, WZ1 = -0.5, WY0 = 0.75, WY1 = 2.62, T = 0.24, wx = X0 - T / 2;
  root.add(box(T, HY, WZ0 - Z0, plaster, wx, HY / 2, (Z0 + WZ0) / 2));
  root.add(box(T, HY, Z1 - WZ1, plaster, wx, HY / 2, (WZ1 + Z1) / 2));
  root.add(box(T, WY0, WZ1 - WZ0, plaster, wx, WY0 / 2, (WZ0 + WZ1) / 2));
  root.add(box(T, HY - WY1, WZ1 - WZ0, plaster, wx, (WY1 + HY) / 2, (WZ0 + WZ1) / 2));
  // frame, sill, four iron bars and a transom
  const wood = seeded(new THREE.MeshStandardMaterial({ color: lin(0.86, 0.84, 0.78), roughness: 0.55 }));
  const iron = seeded(new THREE.MeshStandardMaterial({ color: lin(0.07, 0.07, 0.08), roughness: 0.45, metalness: 0.7 }));
  root.add(box(0.36, 0.05, WZ1 - WZ0 + 0.16, wood, X0 + 0.05, WY0 - 0.02, (WZ0 + WZ1) / 2));
  for (const z of [WZ0 + 0.03, WZ1 - 0.03]) root.add(box(0.12, WY1 - WY0, 0.06, wood, X0 - 0.05, (WY0 + WY1) / 2, z));
  root.add(box(0.12, 0.07, WZ1 - WZ0, wood, X0 - 0.05, WY1 - 0.035, (WZ0 + WZ1) / 2));
  for (let i = 1; i <= 4; i++) root.add(box(0.035, WY1 - WY0, 0.035, iron, X0 - 0.06, (WY0 + WY1) / 2, WZ0 + ((WZ1 - WZ0) * i) / 5));
  root.add(box(0.05, 0.05, WZ1 - WZ0, iron, X0 - 0.06, WY0 + (WY1 - WY0) * 0.62, (WZ0 + WZ1) / 2));
  // outside: a brick wall across the street catches the sun (seen through the window)
  root.add(box(0.3, 7, 30, brick, X0 - 9, 3.5, -1, false));
  // furniture: a sideboard on the back wall, a picture frame, the floor lamp, a rug
  const dark = await pbr("weathered_planks", "1k", [1, 0.6], { color: lin(0.55, 0.4, 0.3) });
  root.add(box(1.5, 0.82, 0.45, dark, 1.2, 0.41, Z0 + 0.25));
  const frame = box(0.9, 0.65, 0.04, skirt, 1.2, 1.75, Z0 + 0.02, false); root.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.53), seeded(new THREE.MeshStandardMaterial({ color: lin(0.55, 0.62, 0.5), roughness: 0.8 }))); art.position.set(1.2, 1.75, Z0 + 0.045); root.add(art);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), seeded(new THREE.MeshStandardMaterial({ color: lin(0.55, 0.22, 0.18), roughness: 0.95 }))); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.6, 0.004, -1.3); rug.receiveShadow = true; root.add(rug);
  const LX = 0.55, LZ = -2.55;
  root.add(box(0.32, 0.03, 0.32, iron, LX, 0.015, LZ), box(0.025, 1.4, 0.025, iron, LX, 0.72, LZ));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.3, 24, 1, true), seeded(new THREE.MeshStandardMaterial({ color: lin(0.95, 0.86, 0.7), emissive: lin(1, 0.72, 0.42), emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.9 })));
  shade.position.set(LX, 1.52, LZ); root.add(shade);
  const lamp = new THREE.PointLight(lin(1.0, 0.7, 0.42), 3.2, 0, 2); lamp.position.set(LX, 1.45, LZ); root.add(lamp);
  // the sun + a faint warm bounce from the sun patch (no GI in the sandbox pipeline)
  const sunCol = lin(1.0, 0.84, 0.64);
  const sun = mkSun(ROOM_SUN, sunCol, 6.5, 2048, 6, new THREE.Vector3(-1.2, 0.8, -1.5), 0.6);
  scene.add(sun, sun.target);
  const bounce = new THREE.PointLight(lin(1.0, 0.82, 0.62), 0.9, 7, 2); bounce.position.set(-1.0, 0.35, -1.4); root.add(bounce);
  return { scene, sun, update: (t) => { WIND_T.value = t + 3; }, hazeDens: 0.0007, expo: 1.15, sunColI: sunCol.clone().multiplyScalar(6.5) };
};

// ================================================================ NIGHT: a brick street under a sodium lamp
export const NIGHT_LAMP = new THREE.Vector3(1.35, 0, -0.55);
export const buildNight = async (gl: THREE.WebGLRenderer): Promise<SetW> => {
  const [hdr, pave, brick, plaster, planks, lampG] = await Promise.all([loadHdr(gl), pbr("brick_pavement", "2k", [5, 5], { color: lin(0.8, 0.78, 0.78) }), pbr("red_brick", "1k", [5, 2.5]),
    pbr("plastered_stone_wall", "1k", [6, 0.3]), pbr("weathered_planks", "1k", [0.6, 1.2], { color: lin(0.4, 0.26, 0.2) }),
    new GLTFLoader().loadAsync(staticFile("lookpilot/street_lamp_01/street_lamp_01_1k.gltf"))]);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color().setRGB(0.006, 0.009, 0.02); scene.environment = hdr.env; scene.environmentIntensity = 0.012;
  scene.fog = new THREE.FogExp2(new THREE.Color().setRGB(0.012, 0.016, 0.03), 0.045);
  const root = new THREE.Group(); scene.add(root);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), pave); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -6); ground.receiveShadow = true; root.add(ground);
  // the facade behind him (z = -3.4): bricks, a plinth, a door, two windows (one lit warm from inside)
  const WZ = -3.4;
  root.add(box(14, 6, 0.3, brick, 0, 3, WZ - 0.15));
  root.add(box(14.1, 0.5, 0.36, plaster, 0, 0.25, WZ - 0.12));
  const door = box(1.1, 2.2, 0.08, planks, -2.2, 1.1, WZ + 0.02); root.add(door);
  const glass = seeded(new THREE.MeshStandardMaterial({ color: lin(0.03, 0.035, 0.04), roughness: 0.1, emissive: lin(1, 0.66, 0.3), emissiveIntensity: 0 }));
  const glassLit = glass.clone(); glassLit.emissiveIntensity = 0.22; seeded(glassLit);
  for (const [x, m] of [[0.9, glass], [3.4, glassLit]] as [number, THREE.Material][]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), m); w.position.set(x, 2.0, WZ + 0.005); root.add(w);
    root.add(box(1.4, 0.1, 0.18, plaster, x, 1.2, WZ + 0.06), box(1.4, 0.14, 0.12, plaster, x, 2.82, WZ + 0.04));
  }
  // the street lamp (Poly Haven street_lamp_01) in front-right of him: its spot throws his shadow back onto the bricks + the wall
  const lamp = lampG.scene.clone(true);
  lamp.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; seeded(m.material as THREE.Material); } });
  lamp.position.copy(NIGHT_LAMP); lamp.rotation.y = -Math.PI / 2; root.add(lamp);
  lamp.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(lamp);
  const headY = bb.max.y - 0.35;
  const sodium = lin(1.0, 0.64, 0.33);
  const spot = new THREE.SpotLight(sodium, 34, 0, 1.05, 0.7, 2);
  spot.position.set(NIGHT_LAMP.x, headY, NIGHT_LAMP.z); spot.target.position.set(NIGHT_LAMP.x - 1.6, 0.5, NIGHT_LAMP.z - 2.4);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.radius = 4; spot.shadow.camera.near = 0.2; spot.shadow.camera.far = 14;
  root.add(spot, spot.target);
  const glow = new THREE.PointLight(sodium, 0.6, 3, 2); glow.position.set(NIGHT_LAMP.x, headY + 0.05, NIGHT_LAMP.z); root.add(glow);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: sodium.clone().multiplyScalar(9) })); bulb.position.copy(glow.position); root.add(bulb);
  // the lit window spills a little warm light; the moon is the "sun" (cool, weak, shadowed)
  const spill = new THREE.PointLight(lin(1, 0.7, 0.4), 0.5, 4, 2); spill.position.set(3.4, 2.0, WZ + 0.6); root.add(spill);
  const moonCol = lin(0.55, 0.66, 1.0);
  const moon = mkSun(new THREE.Vector3(0.45, 0.72, -0.53).normalize(), moonCol, 0.35, 2048, 9, new THREE.Vector3(0, 0, -2), 0.6);
  scene.add(moon, moon.target);
  return { scene, sun: moon, update: (t) => { WIND_T.value = t + 3; }, hazeDens: 0.0012, expo: 1.35, sunColI: moonCol.clone().multiplyScalar(1.4) };
};

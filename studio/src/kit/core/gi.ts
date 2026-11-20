// REAL-WORLD KIT bounce light (so shade is not flat). Two terms:
//  1. PROBE GI: render a small cube map of the BUILT set from a probe point with the sky / IBL / fog switched off, so
//     only what the sun and the lamps light glows (= the first bounce), project it to 3rd-order spherical harmonics
//     (three/examples LightProbeGenerator) and light the whole set with it as a LightProbe (x rig.gi). Warm sunlit bricks
//     now push warm light into the hedge, the bench, the cards' shaded sides. Cached per (set, rig, probe point).
//  2. GROUND BOUNCE (cheap, always available): a HemisphereLight with a black sky and a ground colour = ground albedo x
//     the sun on the ground. Used in draft and whenever the probe is off or fails.
// Honest limits: one probe per shot (no spatial variation: deep shade under a canopy gets the same bounce as open
// ground; N8AO darkens contact areas). An irradiance volume (a grid of probes) would fix it.
import * as THREE from "three";
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator.js";
import type { LightRigState, RigSpec, V3 } from "./ctx";

export type GI = {
  probe: THREE.LightProbe;
  hemi: THREE.HemisphereLight;
  /** the last baked key and its SH (cache) */
  cache: Map<string, THREE.SphericalHarmonics3>;
  lastMs: number;
};
export const makeGI = (): GI => {
  const probe = new THREE.LightProbe(); probe.intensity = 0; probe.name = "kit-gi-probe";
  const hemi = new THREE.HemisphereLight(0x000000, 0x000000, 0); hemi.name = "kit-ground-bounce";
  return { probe, hemi, cache: new Map(), lastMs: 0 };
};

/** the cheap ground-bounce term for a rig (sets hemi colour / intensity); k scales it (0 = off) */
export const setGroundBounce = (gi: GI, r: RigSpec, st: LightRigState, k: number) => {
  const g = r.groundAlbedo ?? [0.3, 0.25, 0.2];
  gi.hemi.color.setRGB(0, 0, 0);
  gi.hemi.groundColor.setRGB(g[0], g[1], g[2]).multiply(st.sunColor);
  // sun irradiance on open ground x ~0.6 unshadowed share, plus a little of the sky
  gi.hemi.intensity = k * (Math.max(0, st.sunDir[1]) * st.sunIntensity * 0.6 + r.skyLevel * 0.5 * Math.PI * 0.3);
};

let cubeRT: THREE.WebGLCubeRenderTarget | null = null;
let cubeCam: THREE.CubeCamera | null = null;
const tmpC = new THREE.Color();

/** bake (or fetch from the cache) the probe SH at `at` for the current scene state. Returns ms spent (0 if cached). */
export const bakeProbe = async (gl: THREE.WebGLRenderer, scene: THREE.Scene, gi: GI, key: string, at: V3, size: number): Promise<number> => {
  const hit = gi.cache.get(key);
  if (hit) { gi.probe.sh.copy(hit); return 0; }
  const t0 = performance.now();
  if (!cubeRT || cubeRT.width !== size) {
    cubeRT?.dispose();
    cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false, depthBuffer: true });
    cubeCam = new THREE.CubeCamera(0.05, 400, cubeRT);
  }
  // first bounce only: no sky, no IBL, no fog, no bounce lights of our own. Only UNIFORMS change (intensities, fog
  // density): setting environment / fog to null would recompile every material of the set (14 s measured)
  const fog = scene.fog as THREE.FogExp2 | THREE.Fog | null;
  const keep = { bi: scene.backgroundIntensity, ei: scene.environmentIntensity, fd: fog && "density" in fog ? fog.density : -1,
    pi: gi.probe.intensity, hi: gi.hemi.intensity, auto: gl.shadowMap.autoUpdate, clear: gl.getClearColor(tmpC).clone(), ca: gl.getClearAlpha() };
  scene.backgroundIntensity = 0; scene.environmentIntensity = 0;
  if (fog && "density" in fog) fog.density = 0;
  gl.setClearColor(0x000000, 1);
  gi.probe.intensity = 0; gi.hemi.intensity = 0;
  gl.shadowMap.autoUpdate = false;          // the shadow maps were rendered by the warm-up render: do not redo them 6x
  // hide what is not a surface: point sprites (dust motes are sized for the film lens: on a 16-64 px cube face each one
  // covers a large part of the picture and the bounce comes out many times too bright; CARDS' finding), sprites, and
  // additive glows (shafts, flares, steam)
  const hidden: THREE.Object3D[] = [];
  scene.traverseVisible((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    const add = m && !Array.isArray(m) && m.blending === THREE.AdditiveBlending;
    // leaf objects only: hiding a parent would also hide a light below it (= another light count = a recompile)
    if (o.children.length === 0 && ((o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite || add)) hidden.push(o);
  });
  for (const o of hidden) o.visible = false;
  cubeCam!.position.set(...at);
  scene.add(cubeCam!);
  cubeCam!.updateMatrixWorld();
  cubeCam!.update(gl, scene);
  scene.remove(cubeCam!);
  for (const o of hidden) o.visible = true;
  scene.backgroundIntensity = keep.bi; scene.environmentIntensity = keep.ei;
  if (fog && "density" in fog) fog.density = keep.fd;
  gi.probe.intensity = keep.pi; gi.hemi.intensity = keep.hi;
  gl.shadowMap.autoUpdate = keep.auto;
  gl.setClearColor(keep.clear, keep.ca);
  const tCube = performance.now() - t0;
  const lp = await LightProbeGenerator.fromCubeRenderTarget(gl, cubeRT);
  const c0 = lp.sh.coefficients[0];
  console.warn(`kit GI bake: cube render ${tCube.toFixed(0)} ms, readback + SH ${(performance.now() - t0 - tCube).toFixed(0)} ms (${size} px); SH L0 = ${c0.x.toFixed(3)} ${c0.y.toFixed(3)} ${c0.z.toFixed(3)}`);
  gi.probe.sh.copy(lp.sh);
  gi.cache.set(key, lp.sh.clone());
  if (gi.cache.size > 24) gi.cache.delete(gi.cache.keys().next().value as string);
  gi.lastMs = performance.now() - t0;
  return gi.lastMs;
};

/** the probe's horizontal irradiance / pi (radiance-like, what a card's albedo multiplies), into `out` */
export const probeBounce = (gi: GI, k: number, out: THREE.Color) => {
  const v = new THREE.Vector3(), c = new THREE.Vector3(), acc = new THREE.Vector3();
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -0.7, 0.7]] as V3[]) {
    gi.probe.sh.getIrradianceAt(v.set(...d).normalize(), c);
    acc.add(c);
  }
  acc.multiplyScalar(k / 5 / Math.PI);
  return out.setRGB(Math.max(0, acc.x), Math.max(0, acc.y), Math.max(0, acc.z));
};

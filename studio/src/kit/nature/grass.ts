// NATURE / grass: instanced blades grown in CLUMPS (shared height / lean / colour per clump), green-to-dry variation in
// seeded patches, density falling off from the lens point, the shared wind (gusts travel across the lawn), darker roots,
// tips translucent toward the sun. Optional real grass clumps (Poly Haven grass_medium_01) sprinkled near the lens, and
// `weeds()` for paving joints / kerb lines / wall feet (blade tufts + real weed_plant_02 / dandelion plants).
import * as THREE from "three";
import type { KitCtx, Built } from "../core/ctx";
import { WIND, keyed } from "./wind";
import { scatterPoints, vnoise, type Area, type Avoid, type XZ } from "./ground_scatter";
import { plants } from "./plants";

export type GrassOpts = {
  area: Area | Area[];
  /** blades per m2 at the lens (default 900) */
  density?: number;
  /** blade height range in metres (default 0.05..0.14) */
  height?: [number, number];
  /** share of dry / straw patches 0..1 (default 0.15) */
  dry?: number;
  /** the lens ground point: density x (near / d)^pow, never below `min` (default near 6 m, pow 1.3, min 0.08) */
  falloff?: { from: XZ; near: number; pow?: number; min?: number };
  avoid?: Avoid[];
  seed?: number;
  wind?: number;
  /** real grass clumps (grass_medium_01) per m2 near the lens (default 0 = off) */
  realClumps?: number;
  /** colour multiplier (linear) */
  tint?: [number, number, number];
};

const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const GREENS = [lin(0.33, 0.45, 0.16), lin(0.27, 0.40, 0.12), lin(0.40, 0.50, 0.20), lin(0.24, 0.35, 0.13), lin(0.46, 0.50, 0.24), lin(0.36, 0.47, 0.2)];
const DRY = [lin(0.62, 0.55, 0.32), lin(0.55, 0.5, 0.3), lin(0.7, 0.62, 0.4), lin(0.5, 0.46, 0.26)];

export const bladeGeo = (() => {
  const seg = 4, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) { const h = i / seg, w = 0.5 * Math.pow(1 - h, 0.9) + 0.02, bend = 0.22 * h * h; pos.push(-w, h, bend, w, h, bend); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.4, 0.85, n.getZ(i) * 0.4);
  return g;
})();

const GRASS_VERT = /* glsl */ `
attribute vec2 aBlade;
uniform float windT; uniform vec3 uWindW; uniform float uWind;
varying float vH;
`;
const GRASS_PROJECT = /* glsl */ `
vec4 nkLP = vec4( transformed, 1.0 );
vH = position.y;
#ifdef USE_INSTANCING
  nkLP = instanceMatrix * nkLP;
  float hh = position.y * position.y;
  vec3 ip = instanceMatrix[ 3 ].xyz;
  float T = windT;
  // a gust front travelling down-wind across the lawn + per-blade flutter
  float front = dot( ip.xz, uWindW.xz );
  float g = 0.55 + 0.45 * smoothstep( -0.4, 0.9, sin( front * 0.35 - T * 1.3 ) ) ;
  float w = sin( T * 2.2 + ip.x * 0.9 + ip.z * 0.6 + aBlade.x * 6.283 ) + 0.4 * sin( T * 5.1 + aBlade.x * 30.0 );
  float bh = length( instanceMatrix[ 1 ].xyz );
  vec3 side = vec3( -uWindW.z, 0.0, uWindW.x );
  nkLP.xyz += ( uWindW * ( 0.6 + 0.5 * w ) * g * 0.05 + side * 0.022 * w ) * hh * aBlade.y * uWind * ( 0.4 + bh * 6.0 );
  nkLP.y -= 0.012 * hh * g * aBlade.y * uWind;
#endif
vec4 mvPosition = modelViewMatrix * nkLP;
gl_Position = projectionMatrix * mvPosition;
`;
const WORLDPOS = /* glsl */ `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
  vec4 worldPosition = modelMatrix * nkLP;
#endif
`;
export const grassMaterial = (windT: { value: number }, wind = 1) => {
  const U = { windT, uWindW: { value: WIND.dir.clone() }, uWind: { value: wind } };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + GRASS_VERT)
      .replace("#include <project_vertex>", GRASS_PROJECT).replace("#include <worldpos_vertex>", WORLDPOS);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vH;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= mix( 0.36, 1.12, smoothstep( 0.0, 1.0, vH ) );")
      .replace("#include <lights_fragment_end>", /* glsl */ `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0 && defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
{ vec3 L = directionalLights[ 0 ].direction;
  float vis = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
  vec3 V = normalize( vViewPosition ); float fwd = pow( max( 0.0, dot( V, -L ) * 0.5 + 0.5 ), 2.0 );
  reflectedLight.directDiffuse += diffuseColor.rgb * vec3( 1.0, 1.0, 0.55 ) * directionalLights[ 0 ].color * vis * fwd * 0.35 * vH; }
#endif`);
  };
  return keyed(m, "grass-blade");
};

/** a lawn / verge of instanced blades (one Built). ~8 triangles per blade. */
export const grass = async (ctx: KitCtx, o: GrassOpts): Promise<Built> => {
  const dens = o.density ?? 900, R = rng((o.seed ?? 1) + 5), H = o.height ?? [0.05, 0.14], dryK = o.dry ?? 0.15;
  const fo = o.falloff ? { from: o.falloff.from, near: o.falloff.near, pow: o.falloff.pow ?? 1.3, min: o.falloff.min ?? 0.08 } : undefined;
  // clump centres (each grows 4-14 blades), plus loose single blades between them
  const per = 9;
  const centres = scatterPoints({ area: o.area, density: dens / per, seed: o.seed, avoid: o.avoid, falloff: fo, clump: 0.35, clumpM: 1.2 });
  const tint = new THREE.Color(...(o.tint ?? [1, 1, 1]));
  type B = { x: number; z: number; h: number; w: number; yaw: number; c: THREE.Color; ph: number; st: number; lean: number };
  const list: B[] = [];
  for (const c of centres) {
    const patch = vnoise(c.x / 2.6, c.z / 2.6, (o.seed ?? 1) + 3), dry = patch < dryK * 1.4 ? 1 : patch < dryK * 1.4 + 0.12 ? 0.5 : 0;
    const base = (dry > 0.9 ? DRY : GREENS)[Math.floor(R() * (dry > 0.9 ? DRY.length : GREENS.length))].clone();
    if (dry > 0.4 && dry < 0.9) base.lerp(DRY[0], 0.45);
    base.multiply(tint).multiplyScalar(0.85 + 0.3 * R());
    const ch = H[0] + (H[1] - H[0]) * R() * (0.7 + 0.6 * vnoise(c.x / 1.3, c.z / 1.3, 7)), lean = (R() - 0.5) * 0.5, n = 4 + Math.floor(R() * 11), cr = 0.02 + 0.05 * R();
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, r = cr * Math.sqrt(R());
      const col = base.clone().multiplyScalar(0.88 + 0.24 * R()); if (R() < 0.05) col.lerp(DRY[1], 0.6);
      list.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, h: ch * (0.6 + 0.55 * R()), w: 0.0042 + 0.0042 * R(), yaw: a + (R() - 0.5) * 1.2, c: col, ph: R(), st: 0.6 + 0.8 * R(), lean });
    }
  }
  const im = new THREE.InstancedMesh(bladeGeo, grassMaterial(ctx.windT, o.wind ?? 1), list.length);
  const aBlade = new Float32Array(list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((b, i) => {
    q.setFromEuler(e.set(b.lean * 0.4, b.yaw, b.lean * 0.3, "YXZ"));
    m4.compose(new THREE.Vector3(b.x, -0.004, b.z), q, new THREE.Vector3(b.w, b.h, b.h)); im.setMatrixAt(i, m4); im.setColorAt(i, b.c);
    aBlade[i * 2] = b.ph; aBlade[i * 2 + 1] = b.st;
  });
  im.geometry = bladeGeo.clone(); im.geometry.setAttribute("aBlade", new THREE.InstancedBufferAttribute(aBlade, 2));
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
  const root = new THREE.Group(); root.name = "kit-grass"; root.add(im);
  if (o.realClumps) {
    const pts = scatterPoints({ area: o.area, density: o.realClumps, seed: (o.seed ?? 1) + 40, avoid: o.avoid, falloff: fo ? { ...fo, min: 0 } : undefined, clump: 0.5 });
    const cl = await plants(ctx, { model: "grass_medium_01", points: pts.map((p) => ({ pos: [p.x, -0.005, p.z], scale: 0.7 + 0.6 * p.r })), seed: o.seed, wind: o.wind });
    root.add(cl.object);
  }
  root.userData.blades = list.length;
  return { object: root };
};

/** weeds for paving joints, kerb lines and wall feet: short blade tufts + real weed / dandelion plants along strips */
export const weeds = async (ctx: KitCtx, o: { strips: XZ[][]; width?: number; perM?: number; seed?: number; plantsPerM?: number; avoid?: Avoid[]; falloff?: GrassOpts["falloff"] }): Promise<Built> => {
  const area = o.strips.map((s) => ({ strip: s, width: o.width ?? 0.08 }));
  const g = await grass(ctx, { area, density: (o.perM ?? 60) / (o.width ?? 0.08), height: [0.03, 0.11], dry: 0.25, seed: o.seed, avoid: o.avoid, falloff: o.falloff });
  const pts = scatterPoints({ area, density: (o.plantsPerM ?? 0.6) / (o.width ?? 0.08), seed: (o.seed ?? 1) + 9, avoid: o.avoid, falloff: o.falloff ? { ...o.falloff, min: 0.05 } : undefined, clump: 0.6 });
  const half = Math.ceil(pts.length * 0.7);
  const w1 = await plants(ctx, { model: "weed_plant_02", points: pts.slice(0, half).map((p) => ({ pos: [p.x, -0.003, p.z], scale: 0.55 + 0.5 * p.r })), seed: o.seed });
  const w2 = await plants(ctx, { model: "dandelion_01", points: pts.slice(half).map((p) => ({ pos: [p.x, -0.003, p.z], scale: 0.6 + 0.4 * p.r })), seed: o.seed, variants: ["_c_", "_d_", "_e_"] });
  const root = new THREE.Group(); root.name = "kit-weeds"; root.add(g.object, w1.object, w2.object);
  return { object: root };
};

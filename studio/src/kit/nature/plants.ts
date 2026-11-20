// NATURE / plants: real CC0 plant models (Poly Haven glTF, studio/public/kit/plants/<id>/<id>_1k.gltf; each child node
// is one variant) instanced at many points with seeded variant / yaw / scale / tint, a soft wind bend (height-weighted,
// the same wind field as the trees, colour AND shadow pass), translucency toward the sun and darker bases.
//   const w = await plants(ctx, { model: "weed_plant_02", points: scatterPoints(...) })
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { WIND, TRANSLUCENT_GLSL, keyed } from "./wind";

export type PlantModel = "weed_plant_02" | "dandelion_01" | "flower_gazania" | "periwinkle_plant" | "grass_medium_01" | "fern_02" | "shrub_02";
/** per model: default scale, how much it bends, translucency, colour multiplier, variant filter (substring), LOD keep */
export const PLANT_MODELS: Record<PlantModel, { bend: number; transl: number; tint?: [number, number, number]; skip?: string[]; shadow: boolean }> = {
  weed_plant_02: { bend: 0.6, transl: 0.5, shadow: false },
  dandelion_01: { bend: 0.8, transl: 0.5, shadow: false },
  flower_gazania: { bend: 0.5, transl: 0.4, shadow: false },
  periwinkle_plant: { bend: 0.5, transl: 0.4, shadow: false },
  grass_medium_01: { bend: 1.0, transl: 0.7, tint: [0.92, 0.96, 0.82], skip: ["large"], shadow: false },
  fern_02: { bend: 0.7, transl: 0.6, shadow: true },
  shrub_02: { bend: 0.35, transl: 0.5, shadow: true },
};
export type PlantPoint = { pos: V3; rotY?: number; scale?: number; variant?: number; tint?: number };
export type PlantOpts = { model: PlantModel; points: PlantPoint[]; seed?: number; wind?: number; shadow?: boolean; tint?: [number, number, number]; variants?: string[] };

type Variant = { name: string; prims: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial }[]; h: number };
const cache = new Map<string, Promise<Variant[]>>();
const loadModel = (ctx: KitCtx, model: PlantModel) => {
  let p = cache.get(model);
  if (!p) {
    p = ctx.assets.gltf(`kit/plants/${model}/${model}_1k.gltf`).then((g) => {
      g.updateMatrixWorld(true);
      const out: Variant[] = [];
      for (const n of g.children) {
        const prims: Variant["prims"] = []; let h = 0.01;
        n.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const geo = m.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().copy(m.matrixWorld).premultiply(new THREE.Matrix4().makeTranslation(-n.position.x, 0, -n.position.z)));
          geo.computeBoundingBox(); h = Math.max(h, geo.boundingBox!.max.y);
          prims.push({ geo, mat: m.material as THREE.MeshStandardMaterial });
        });
        out.push({ name: n.name, prims, h });
      }
      return out;
    });
    cache.set(model, p);
  }
  return p;
};
const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

const PLANT_VERT = /* glsl */ `
uniform float windT; uniform vec3 uWindW; uniform float uBend; uniform float uH;
attribute vec2 aPl;
varying float vPlH;
`;
const PLANT_PROJECT = /* glsl */ `
vec4 nkLP = vec4( transformed, 1.0 );
vPlH = clamp( position.y / uH, 0.0, 1.0 );
#ifdef USE_INSTANCING
  nkLP = instanceMatrix * nkLP;
  vec3 ip = instanceMatrix[ 3 ].xyz;
  float hh = vPlH * vPlH;
  float T = windT;
  float g = 0.65 + 0.35 * sin( T * 0.29 + ip.x * 0.05 ) * sin( T * 0.131 + ip.z * 0.04 + 1.3 );
  float w = sin( T * 1.9 + dot( ip.xz, vec2( 0.9, 0.6 ) ) + aPl.x * 6.283 ) + 0.45 * sin( T * 4.7 + aPl.x * 30.0 );
  float sc = length( instanceMatrix[ 1 ].xyz );
  vec3 side = vec3( -uWindW.z, 0.0, uWindW.x );
  nkLP.xyz += ( uWindW * ( 0.5 + 0.5 * w ) * g + side * 0.35 * w ) * hh * uBend * uH * sc * 0.16;
  nkLP.y -= hh * uBend * uH * sc * 0.02 * ( 0.5 + 0.5 * w ) * g;
#endif
vec4 mvPosition = modelViewMatrix * nkLP;
gl_Position = projectionMatrix * mvPosition;
`;
const WORLDPOS = /* glsl */ `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
  vec4 worldPosition = modelMatrix * nkLP;
#endif
`;
type PU = { windT: { value: number }; uWindW: { value: THREE.Vector3 }; uBend: { value: number }; uH: { value: number }; uTransl: { value: number } };
const patchV = (sh: THREE.WebGLProgramParametersWithUniforms, U: PU) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + PLANT_VERT)
    .replace("#include <project_vertex>", PLANT_PROJECT).replace("#include <worldpos_vertex>", WORLDPOS);
};
const plantMat = (src: THREE.MeshStandardMaterial, U: PU, tint: THREE.Color, key: string) => {
  const m = src.clone();
  m.transparent = false; m.depthWrite = true; m.alphaTest = src.alphaMap || (src.map && src.alphaTest > 0) ? Math.max(0.4, src.alphaTest) : 0;
  m.side = THREE.DoubleSide; m.color.multiply(tint);
  m.onBeforeCompile = (sh) => {
    patchV(sh, U);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uTransl; varying float vPlH;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= mix( 0.55, 1.05, smoothstep( 0.0, 0.6, vPlH ) );")
      .replace("#include <lights_fragment_end>", TRANSLUCENT_GLSL("uTransl * vPlH"));
  };
  return keyed(m, "plant-" + key);
};
const plantDepth = (U: PU, key: string) => {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => patchV(sh, U);
  return keyed(m, "plant-depth-" + key);
};

/** instance one plant model at the given points (one Built; InstancedMesh per variant x primitive) */
export const plants = async (ctx: KitCtx, o: PlantOpts): Promise<Built> => {
  const vars0 = await loadModel(ctx, o.model);
  const def = PLANT_MODELS[o.model];
  const vars = vars0.filter((v) => (!o.variants || o.variants.some((s) => v.name.includes(s))) && !(def.skip ?? []).some((s) => v.name.includes(s)));
  const R = rng((o.seed ?? 1) * 31 + o.model.length);
  const root = new THREE.Group(); root.name = "kit-plants-" + o.model;
  const byVar: PlantPoint[][] = vars.map(() => []);
  for (const p of o.points) byVar[(p.variant ?? Math.floor(R() * vars.length)) % vars.length].push(p);
  const tint = new THREE.Color(...(def.tint ?? [1, 1, 1])).multiply(new THREE.Color(...(o.tint ?? [1, 1, 1])));
  const cast = o.shadow ?? def.shadow;
  let tris = 0;
  vars.forEach((v, vi) => {
    const pts = byVar[vi]; if (!pts.length) return;
    const U: PU = { windT: ctx.windT, uWindW: { value: WIND.dir.clone() }, uBend: { value: def.bend * (o.wind ?? 1) }, uH: { value: v.h }, uTransl: { value: def.transl } };
    const n = pts.length, im = new Float32Array(n * 16), pl = new Float32Array(n * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const cols = new Float32Array(n * 3);
    pts.forEach((p, j) => {
      const s = p.scale ?? 0.85 + 0.3 * R();
      q.setFromEuler(e.set((R() - 0.5) * 0.08, p.rotY ?? R() * Math.PI * 2, (R() - 0.5) * 0.08));
      m4.compose(new THREE.Vector3(...p.pos), q, new THREE.Vector3(s, s * (0.9 + 0.2 * R()), s)); m4.toArray(im, j * 16);
      pl[j * 2] = R(); pl[j * 2 + 1] = p.tint ?? R();
      const tv = 0.85 + 0.3 * (p.tint ?? R()); cols.set([tv * (0.96 + 0.08 * R()), tv, tv * (0.92 + 0.1 * R())], j * 3);
    });
    const imA = new THREE.InstancedBufferAttribute(im, 16), plA = new THREE.InstancedBufferAttribute(pl, 2), colA = new THREE.InstancedBufferAttribute(cols, 3);
    v.prims.forEach((pr, pi) => {
      const g = new THREE.BufferGeometry();
      for (const [nm, a] of Object.entries(pr.geo.attributes)) g.setAttribute(nm, a);
      if (pr.geo.index) g.setIndex(pr.geo.index);
      g.setAttribute("aPl", plA);
      const mesh = new THREE.InstancedMesh(g, plantMat(pr.mat, U, tint, `${o.model}`), n);
      mesh.instanceMatrix = imA; mesh.instanceColor = colA; mesh.count = n;
      mesh.castShadow = cast; mesh.receiveShadow = true; mesh.frustumCulled = false;
      if (cast) mesh.customDepthMaterial = plantDepth(U, `${o.model}`);
      tris += n * (pr.geo.index ? pr.geo.index.count : pr.geo.attributes.position.count) / 3;
      root.add(mesh);
      void pi;
    });
  });
  root.userData.tris = tris;
  return { object: root };
};

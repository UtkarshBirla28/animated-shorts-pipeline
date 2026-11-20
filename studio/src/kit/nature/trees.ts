// NATURE / trees: REAL tree meshes (Poly Haven CC0 geometry-nodes trees, prepared offline by nature/prep/export_gn_tree.py)
// drawn as trunk + branch meshes + INSTANCED leaf clusters (the tree's own clusters, at the positions its own geometry
// nodes put them: real branch structure, irregular crowns). Per tree: seeded rotation / height / tint / crown holes /
// thinning, wind in the vertex shader (colour AND shadow pass: the dapple moves), bent crown normals, crown-depth AO per
// cluster, leaf translucency toward the sun, coverage-preserving alpha, continuous distance LOD (a seeded random prefix of
// the clusters, the kept ones scaled up to keep the coverage), and a CHEAP SHADOW TWIN (fewer, larger clusters) that is
// the only leaf caster in the sun / card shadow maps.
//   const t = await buildTrees(ctx, [{ species: "jacaranda", pos: [-5, 0, -8], height: 10, seed: 3 }, ...]); set.add(t.object)
import * as THREE from "three";
import { staticFile } from "remotion";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { SWAY_GLSL, FLUTTER_GLSL, COVERAGE_GLSL, TRANSLUCENT_GLSL, WORLDPOS_GLSL, keyed, treeUniforms, type TreeU } from "./wind";

export type TreeSpeciesId = "jacaranda" | "small02";
type SpeciesDef = { dir: string; file: string; near: string[]; far: string[]; defaultH: number; keep: number; transl: number;
  tint: [number, number, number]; trunkRough?: boolean; flutter: number };
/** the catalogue (add a species: run export_gn_tree.py, convert its textures with tex_convert.py + dilate_rgb.py) */
export const TREE_SPECIES: Record<TreeSpeciesId, SpeciesDef> = {
  // broad 24 x 19 m (asset scale) park tree, fern-like compound leaves; ~6k clusters; scaled to ~9-12 m
  jacaranda: { dir: "kit/trees/jacaranda", file: "jacaranda", near: ["trunk", "branches"], far: ["trunk_lo", "branches_lo"], defaultH: 10,
    keep: 0.8, transl: 0.6, tint: [0.84, 0.95, 0.74], trunkRough: true, flutter: 1 },
  // small 4 m garden / street tree (wild syringa), ~3.3k clusters; good for markets, yards, mid-ground rows
  small02: { dir: "kit/trees/tree_small_02", file: "tree_small_02", near: ["trunk"], far: ["trunk_lo"], defaultH: 4.4,
    keep: 0.62, transl: 0.55, tint: [0.88, 0.96, 0.8], flutter: 1.2 },
};

export type TreeSpec = {
  species?: TreeSpeciesId;
  /** ground point of the trunk */
  pos: V3;
  /** yaw (rad); default: seeded */
  rotY?: number;
  /** top height in metres (default: the species default x seeded 0.9..1.1) */
  height?: number;
  seed?: number;
  /** leaf cluster fraction kept at full detail (0..1, default species) */
  keep?: number;
  /** leaf colour multiplier (linear) on top of the seeded per-tree hue drift */
  tint?: [number, number, number];
  /** seeded spherical gaps cut into the crown (irregular silhouettes / sun gaps), default 3 */
  holes?: number;
  /** explicit gaps in WORLD space (e.g. the sun patch a walker steps into) */
  gaps?: { c: V3; r: number }[];
  /** wind strength multiplier (default 1) */
  wind?: number;
  /** cast shadows (default true) */
  shadow?: boolean;
  /** shadow twin cluster fraction (default 0.38) */
  shadowKeep?: number;
  /** LOD: full detail inside `near` m, the cluster fraction falls as (near / d)^0.75 down to `minKeep`; wood swaps to
   *  the low mesh beyond `far` m */
  lod?: { near?: number; far?: number; minKeep?: number };
};

// ------------------------------------------------------------------ species loading (cached per page)
type Prim = { geo: THREE.BufferGeometry; mat: "leaf" | "trunk" | "branch" };
type Species = {
  def: SpeciesDef; man: { kinds: string[]; count: number; crownCenter: V3; crownMin: V3; crownMax: V3; bboxMin: V3; bboxMax: V3 };
  nodes: Map<string, Prim[]>; inst: Float32Array;
  tex: { leaf: THREE.Texture; alpha: THREE.Texture; leafN: THREE.Texture; branch: THREE.Texture; branchN: THREE.Texture; trunk: THREE.Texture; trunkN: THREE.Texture; trunkR?: THREE.Texture };
};
const speciesCache = new Map<string, Promise<Species>>();
const loadSpecies = (ctx: KitCtx, id: TreeSpeciesId): Promise<Species> => {
  let p = speciesCache.get(id);
  if (p) return p;
  const def = TREE_SPECIES[id];
  p = (async () => {
    const d = def.dir;
    // glTF UVs want flipY = false: take a clone of the cached texture (shares the image) with flipY off
    const tx = async (f: string, srgb: boolean) => { const t = (await ctx.assets.tex(`${d}/${f}`, { srgb })).clone(); t.flipY = false; t.needsUpdate = true; return t; };
    const [scene, man, inst, leaf, alpha, leafN, branch, branchN, trunk, trunkN, trunkR] = await Promise.all([
      ctx.assets.gltf(`${d}/${def.file}.glb`),
      fetch(staticFile(`${d}/${def.file}.json`)).then((r) => r.json()),
      fetch(staticFile(`${d}/${def.file}.inst.bin`)).then((r) => r.arrayBuffer()).then((b) => new Float32Array(b)),
      tx("leaves_diff.jpg", true), tx("leaves_alpha.png", false), tx("leaves_nor.jpg", false),
      tx("branches_diff.jpg", true), tx("branches_nor.jpg", false), tx("trunk_diff.jpg", true), tx("trunk_nor.jpg", false),
      def.trunkRough ? tx("trunk_rough.jpg", false) : Promise.resolve(undefined),
    ]);
    const nodes = new Map<string, Prim[]>();
    for (const n of scene.children) {
      const prims: Prim[] = [];
      n.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mn = ((m.material as THREE.Material).name || "").toLowerCase();
        prims.push({ geo: m.geometry, mat: mn.includes("leav") ? "leaf" : mn.includes("trunk") ? "trunk" : "branch" });
      });
      nodes.set(n.name, prims);
    }
    return { def, man, nodes, inst, tex: { leaf, alpha, leafN, branch, branchN, trunk, trunkN, trunkR } } as Species;
  })();
  p.catch(() => speciesCache.delete(id));
  speciesCache.set(id, p);
  return p;
};

// ------------------------------------------------------------------ materials
const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

const VERT_PARS = /* glsl */ `
uniform float uKeepS;
uniform float uFlutter;
#ifdef USE_INSTANCING
attribute vec4 aLeafI;
attribute vec3 aOut;
#endif
varying vec2 vLeafI;
` + SWAY_GLSL + FLUTTER_GLSL;
const PROJECT = /* glsl */ `
vec4 nkLP = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  nkLP = instanceMatrix * nkLP;
  vec3 nkIO = instanceMatrix[ 3 ].xyz;
  nkLP.xyz = nkIO + ( nkLP.xyz - nkIO ) * uKeepS;
  nkLP.xyz += nkSway( nkIO ) + 0.25 * ( nkSway( nkLP.xyz ) - nkSway( nkIO ) );
#else
  nkLP.xyz += nkSway( nkLP.xyz );
#endif
vec4 mvPosition = modelViewMatrix * nkLP;
gl_Position = projectionMatrix * mvPosition;
`;
const BEGIN = (leaf: boolean) => /* glsl */ `
vec3 transformed = vec3( position );
vLeafI = vec2( 1.0, 0.5 );
#ifdef USE_INSTANCING
  vLeafI = aLeafI.yz;
  ${leaf ? "transformed = nkFlutter( position, normal, aLeafI.x, uFlutter );" : ""}
#endif
`;
type MatU = TreeU & { uKeepS: { value: number }; uFlutter: { value: number }; uTransl: { value: number } };

const patchVert = (sh: THREE.WebGLProgramParametersWithUniforms, U: MatU, leaf: boolean) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\n" + VERT_PARS)
    .replace("#include <begin_vertex>", BEGIN(leaf))
    .replace("#include <project_vertex>", PROJECT)
    .replace("#include <worldpos_vertex>", WORLDPOS_GLSL);
  if (leaf) sh.vertexShader = sh.vertexShader.replace("#include <defaultnormal_vertex>", /* glsl */ `#include <defaultnormal_vertex>
#ifdef USE_INSTANCING
  transformedNormal = normalize( mix( normalize( transformedNormal ), normalize( normalMatrix * aOut ), 0.62 ) );
#endif`);
};
const woodMat = (map: THREE.Texture, normalMap: THREE.Texture, rough: THREE.Texture | undefined, U: MatU, tint: THREE.Color) => {
  const m = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap: rough ?? null, roughness: rough ? 1 : 0.9, metalness: 0, color: tint });
  m.onBeforeCompile = (sh) => patchVert(sh, U, false);
  return keyed(m, "tree-wood");
};
const leafMat = (S: Species, U: MatU, tint: THREE.Color) => {
  const m = new THREE.MeshStandardMaterial({ map: S.tex.leaf, alphaMap: S.tex.alpha, normalMap: S.tex.leafN, normalScale: new THREE.Vector2(0.6, 0.6),
    alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.62, metalness: 0, color: tint });
  m.onBeforeCompile = (sh) => {
    patchVert(sh, U, true);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTransl;\nvarying vec2 vLeafI;")
      // one bent normal for both leaf faces (the crown shades as a mass; three would flip it on back faces)
      .replace("#include <normal_fragment_begin>", THREE.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""))
      .replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
  { float tn = vLeafI.y; diffuseColor.rgb *= mix( vec3( 1.06, 1.02, 0.78 ), vec3( 0.86, 1.0, 1.02 ), tn ) * mix( 0.84, 1.1, fract( tn * 7.13 ) ) * mix( 0.62, 1.0, vLeafI.x ); }`)
      .replace("#include <alphatest_fragment>", COVERAGE_GLSL)
      .replace("#include <lights_fragment_end>", TRANSLUCENT_GLSL("uTransl") + `
  reflectedLight.indirectDiffuse *= mix( 0.35, 1.0, vLeafI.x ); reflectedLight.indirectSpecular *= vLeafI.x;`);
  };
  return keyed(m, "tree-leaf");
};
const depthMat = (U: MatU, alpha: THREE.Texture | null, leaf: boolean) => {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alpha, alphaTest: alpha ? 0.5 : 0, side: leaf ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = (sh) => patchVert(sh, U, leaf);
  return keyed(m, leaf ? "tree-leaf-depth" : "tree-wood-depth");
};

// ------------------------------------------------------------------ one tree
type TreeRT = { group: THREE.Group; center: THREE.Vector3; near: THREE.Object3D[]; far: THREE.Object3D[];
  kinds: { mesh: THREE.InstancedMesh[]; n: number }[]; U: MatU; base: number; spec: TreeSpec; lod: { near: number; far: number; minKeep: number }; tris: number[] };

const buildOne = (ctx: KitCtx, S: Species, spec: TreeSpec, idx: number): TreeRT => {
  const def = S.def, man = S.man, R = rng((spec.seed ?? idx * 7 + 1) + 101);
  const localH = man.bboxMax[1];
  const crownR = 0.5 * Math.max(man.crownMax[0] - man.crownMin[0], man.crownMax[2] - man.crownMin[2]);
  const H = spec.height ?? def.defaultH * (0.9 + 0.2 * R());
  const sc = H / localH;
  const rotY = spec.rotY ?? R() * Math.PI * 2;
  const group = new THREE.Group();
  group.position.set(...spec.pos); group.rotation.y = rotY; group.scale.setScalar(sc);
  group.updateMatrixWorld(true);
  const base = Math.min(1, spec.keep ?? def.keep);
  const U: MatU = { ...treeUniforms(ctx.windT, localH, crownR, R(), spec.wind ?? 1, group.matrixWorld), uKeepS: { value: 1 }, uFlutter: { value: def.flutter }, uTransl: { value: def.transl } };
  const Ud: MatU = { ...U, uKeepS: { value: Math.min(2.2, Math.sqrt(base / (spec.shadowKeep ?? 0.38))) } };
  // per-tree colour drift (seeded): a touch warmer / cooler / lighter per tree
  const hue = R(), tintC = new THREE.Color(...def.tint).multiply(new THREE.Color(...(spec.tint ?? [1, 1, 1])))
    .multiply(new THREE.Color(0.94 + 0.12 * hue, 0.96 + 0.08 * R(), 0.9 + 0.14 * (1 - hue)));
  const woodTint = new THREE.Color(0.82, 0.8, 0.76).multiplyScalar(0.9 + 0.2 * R());
  const mats = {
    leaf: leafMat(S, U, tintC), trunk: woodMat(S.tex.trunk, S.tex.trunkN, S.tex.trunkR, U, woodTint), branch: woodMat(S.tex.branch, S.tex.branchN, undefined, U, woodTint),
    leafD: depthMat(Ud, S.tex.alpha, true), woodD: depthMat(U, null, false), twigD: depthMat(Ud, null, false),
  };
  const cast = spec.shadow !== false;
  const tris: number[] = [0, 0, 0];
  // ---- wood: near + far LOD meshes ----
  const wood = (names: string[]) => names.flatMap((nm) => (S.nodes.get(nm) ?? []).map((p) => {
    const mesh = new THREE.Mesh(p.geo, p.mat === "leaf" ? mats.leaf : p.mat === "trunk" ? mats.trunk : mats.branch);
    mesh.castShadow = cast; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.customDepthMaterial = p.mat === "leaf" ? mats.leafD : mats.woodD;
    group.add(mesh); return mesh;
  }));
  const near = wood(def.near), far = wood(def.far);
  far.forEach((m) => (m.visible = false));
  // ---- leaf clusters: this tree's subset, seeded rank order (a prefix = a random subset), crown AO + outward normal ----
  const K = man.kinds.length, inst = S.inst, N = inst.length / 13;
  const cc = new THREE.Vector3(...man.crownCenter);
  const rad = new THREE.Vector3(Math.max(0.5, (man.crownMax[0] - man.crownMin[0]) / 2), Math.max(0.5, (man.crownMax[1] - man.crownMin[1]) / 2), Math.max(0.5, (man.crownMax[2] - man.crownMin[2]) / 2));
  // crown shell per direction bin (8 elevation x 16 azimuth): how deep each cluster sits
  const BIN = (d: THREE.Vector3) => { const e = Math.min(7, Math.floor(((Math.atan2(d.y, Math.hypot(d.x, d.z)) / Math.PI) + 0.5) * 8)); const a = Math.min(15, Math.floor(((Math.atan2(d.z, d.x) / Math.PI) * 0.5 + 0.5) * 16)); return e * 16 + a; };
  const shell = new Float32Array(128);
  const P = new THREE.Vector3(), dv = new THREE.Vector3();
  for (let i = 0; i < N; i++) { P.set(inst[i * 13 + 10], inst[i * 13 + 11], inst[i * 13 + 12]); dv.copy(P).sub(cc).divide(rad); const b = BIN(dv); shell[b] = Math.max(shell[b], dv.length()); }
  // crown holes (seeded, in tree-local space) + explicit world gaps
  const holes: { c: THREE.Vector3; r: number }[] = [];
  const nh = spec.holes ?? 3;
  for (let h = 0; h < nh; h++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    holes.push({ c: new THREE.Vector3(cc.x + Math.cos(a) * s * rad.x * 0.95, cc.y + u * rad.y * 0.8, cc.z + Math.sin(a) * s * rad.z * 0.95), r: Math.min(rad.x, rad.z) * (0.22 + 0.2 * R()) });
  }
  const inv = group.matrixWorld.clone().invert();
  for (const g of spec.gaps ?? []) holes.push({ c: new THREE.Vector3(...g.c).applyMatrix4(inv), r: g.r / sc });
  const perKind: { i: number; rank: number }[][] = Array.from({ length: K }, () => []);
  for (let i = 0; i < N; i++) {
    P.set(inst[i * 13 + 10], inst[i * 13 + 11], inst[i * 13 + 12]);
    if (holes.some((h) => P.distanceTo(h.c) < h.r * (0.75 + 0.5 * R()))) continue;
    perKind[inst[i * 13] | 0].push({ i, rank: R() });
  }
  const kinds: TreeRT["kinds"] = [];
  const kindName = man.kinds;
  for (let k = 0; k < K; k++) {
    const list = perKind[k].sort((a, b) => a.rank - b.rank), n = list.length;
    const prims = S.nodes.get("leaves_" + kindName[k]) ?? [];
    if (!n || !prims.length) { kinds.push({ mesh: [], n: 0 }); continue; }
    const im = new Float32Array(n * 16), li = new Float32Array(n * 4), out = new Float32Array(n * 3);
    const clumpT = R();
    list.forEach((e, j) => {
      const o = e.i * 13;
      // column-major 3x4 -> 4x4
      im.set([inst[o + 1], inst[o + 2], inst[o + 3], 0, inst[o + 4], inst[o + 5], inst[o + 6], 0, inst[o + 7], inst[o + 8], inst[o + 9], 0, inst[o + 10], inst[o + 11], inst[o + 12], 1], j * 16);
      P.set(inst[o + 10], inst[o + 11], inst[o + 12]); dv.copy(P).sub(cc).divide(rad);
      const depth = dv.length() / Math.max(0.2, shell[BIN(dv)]);
      const low = THREE.MathUtils.clamp((P.y - (cc.y - rad.y)) / (2 * rad.y), 0, 1);
      const ao = THREE.MathUtils.clamp((0.28 + 0.72 * Math.pow(THREE.MathUtils.clamp(depth, 0, 1), 2.2)) * (0.7 + 0.3 * low), 0.22, 1);
      // tint: coherent over the crown (low-frequency in position) + a little per cluster
      const tn = THREE.MathUtils.clamp(0.5 + 0.35 * Math.sin(P.x * 0.21 + P.z * 0.17 + clumpT * 6) * Math.sin(P.y * 0.23 + 1.3) + 0.25 * (R() - 0.5), 0, 1);
      li.set([R(), ao, tn, 0], j * 4);
      dv.normalize(); out.set([dv.x + (R() - 0.5) * 0.3, dv.y * 1.1 + 0.15, dv.z + (R() - 0.5) * 0.3], j * 3);
    });
    const imA = new THREE.InstancedBufferAttribute(im, 16), liA = new THREE.InstancedBufferAttribute(li, 4), outA = new THREE.InstancedBufferAttribute(out, 3);
    const meshes: THREE.InstancedMesh[] = [];
    for (const p of prims) {
      const g = new THREE.BufferGeometry();
      for (const [nm, a] of Object.entries(p.geo.attributes)) g.setAttribute(nm, a);
      if (p.geo.index) g.setIndex(p.geo.index);
      g.setAttribute("aLeafI", liA); g.setAttribute("aOut", outA);
      const isLeaf = p.mat === "leaf";
      const mk = (shadowTwin: boolean) => {
        const m = new THREE.InstancedMesh(g, isLeaf ? mats.leaf : mats.branch, n);
        m.instanceMatrix = imA; m.count = shadowTwin ? 0 : n; m.frustumCulled = false;
        m.castShadow = shadowTwin; m.receiveShadow = !shadowTwin;
        if (shadowTwin) {
          m.customDepthMaterial = isLeaf ? mats.leafD : mats.twigD;
          const ns = () => Math.max(1, Math.round(n * Math.min(1, (spec.shadowKeep ?? 0.38) / base)));
          m.onBeforeShadow = () => { m.count = ns(); };
          m.onAfterShadow = () => { m.count = 0; };
        }
        m.userData.triPerInst = (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3;
        group.add(m); return m;
      };
      meshes.push(mk(false));
      if (cast) meshes.push(mk(true));
    }
    kinds.push({ mesh: meshes, n });
  }
  const center = new THREE.Vector3().copy(cc).applyMatrix4(group.matrixWorld);
  const lod = { near: spec.lod?.near ?? 14, far: spec.lod?.far ?? 38, minKeep: spec.lod?.minKeep ?? 0.12 };
  return { group, center, near, far, kinds, U, base, spec, lod, tris };
};

/** build a group of trees (any species mix); one Built, one update for all */
export const buildTrees = async (ctx: KitCtx, specs: TreeSpec[]): Promise<Built> => {
  const root = new THREE.Group(); root.name = "kit-trees";
  const ids = [...new Set(specs.map((s) => s.species ?? "jacaranda"))];
  const sp = new Map<string, Species>();
  await Promise.all(ids.map(async (id) => sp.set(id, await loadSpecies(ctx, id))));
  const trees = specs.map((s, i) => buildOne(ctx, sp.get(s.species ?? "jacaranda")!, s, i));
  trees.forEach((t) => root.add(t.group));
  const camP = new THREE.Vector3();
  let lastTris = 0;
  const update = (_t: number, cam: THREE.Camera) => {
    camP.setFromMatrixPosition(cam.matrixWorld);
    let tris = 0;
    for (const T of trees) {
      const d = camP.distanceTo(T.center);
      const k = Math.max(T.lod.minKeep, Math.min(1, Math.pow(T.lod.near / Math.max(d, 0.1), 0.75))) * T.base;
      const kk = Math.min(T.base, Math.max(k, T.lod.minKeep * T.base));
      T.U.uKeepS.value = Math.min(2.4, Math.sqrt(T.base / kk));
      for (const K of T.kinds) for (const m of K.mesh) if (!m.castShadow) { m.count = Math.max(1, Math.round(K.n * kk / T.base)); tris += m.count * (m.userData.triPerInst as number); }
      const farOn = d > T.lod.far;
      T.near.forEach((m) => (m.visible = !farOn)); T.far.forEach((m) => (m.visible = farOn));
    }
    lastTris = tris;
  };
  return { object: root, update, hints: {}, costMs: undefined, ...{ stats: () => ({ trees: trees.length, leafTris: lastTris }) } } as Built & { stats: () => { trees: number; leafTris: number } };
};
export const tree = (ctx: KitCtx, spec: TreeSpec) => buildTrees(ctx, [spec]);

/** crown gaps that open a SUN PATCH on the ground at `ground` (radius r m): spheres along the ray toward the sun at
 *  heights h0..h1 (pass to TreeSpec.gaps of the trees between the patch and the sun) */
export const sunGap = (ground: V3, sunDir: V3, r = 2.2, h0 = 3.5, h1 = 11): { c: V3; r: number }[] => {
  const out: { c: V3; r: number }[] = [];
  for (let h = h0; h <= h1; h += 1.5) { const k = h / Math.max(0.05, sunDir[1]); out.push({ c: [ground[0] + sunDir[0] * k, ground[1] + h, ground[2] + sunDir[2] * k], r }); }
  return out;
};

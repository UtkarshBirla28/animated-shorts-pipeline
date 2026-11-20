// NATURE / flowers: meadow and bed flowers. "daisy" = cheap lit cards on short stems (drawn once on a canvas, many per
// m2); "gazania" (orange), "periwinkle" (pink), "dandelion" (yellow) = real CC0 Poly Haven plants via plants.ts.
//   const f = await flowers(ctx, { area: { rect: [1.3, -20, 6, 6] }, kinds: ["daisy", "dandelion"], density: 6, seed: 2 })
import * as THREE from "three";
import type { KitCtx, Built } from "../core/ctx";
import { scatterPoints, type ScatterOpts } from "./ground_scatter";
import { plants } from "./plants";
import { WIND, keyed } from "./wind";

export type FlowerKind = "daisy" | "gazania" | "periwinkle" | "dandelion";
export type FlowerOpts = ScatterOpts & { kinds: FlowerKind[]; scale?: number };
const TAU = Math.PI * 2;

let daisyT: THREE.Texture | null = null;
const daisyTex = () => {
  if (daisyT) return daisyT;
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  g.translate(64, 64);
  for (let i = 0; i < 18; i++) { g.rotate(TAU / 18); g.beginPath(); g.ellipse(0, -33, 6.5, 25, 0, 0, TAU); g.fillStyle = i % 3 ? "#f6f3ec" : "#ffffff"; g.fill(); }
  g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fillStyle = "#e3ae18"; g.fill();
  g.beginPath(); g.arc(-3, -3, 7, 0, TAU); g.fillStyle = "#f4cc3a"; g.fill();
  daisyT = new THREE.CanvasTexture(c); daisyT.colorSpace = THREE.SRGBColorSpace; daisyT.anisotropy = 8;
  return daisyT;
};
const daisyMat = (windT: { value: number }) => {
  const U = { windT, uWindW: { value: WIND.dir.clone() } };
  const m = new THREE.MeshStandardMaterial({ map: daisyTex(), alphaTest: 0.5, roughness: 0.7, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float windT; uniform vec3 uWindW;")
      .replace("#include <project_vertex>", /* glsl */ `
vec4 nkLP = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  nkLP = instanceMatrix * nkLP; vec3 ip = instanceMatrix[ 3 ].xyz;
  float w = sin( windT * 2.0 + ip.x * 0.9 + ip.z * 0.6 ) + 0.5 * sin( windT * 4.3 + ip.x * 13.0 );
  nkLP.xyz += uWindW * 0.012 * w * ip.y * 12.0;
#endif
vec4 mvPosition = modelViewMatrix * nkLP; gl_Position = projectionMatrix * mvPosition;`)
      .replace("#include <worldpos_vertex>", "#if defined( USE_SHADOWMAP ) || defined( USE_ENVMAP )\n vec4 worldPosition = modelMatrix * nkLP;\n#endif");
  };
  return keyed(m, "flower-daisy");
};

export const flowers = async (ctx: KitCtx, o: FlowerOpts): Promise<Built> => {
  const pts = scatterPoints({ clump: 0.6, clumpM: 1.1, ...o });
  const root = new THREE.Group(); root.name = "kit-flowers";
  const by: Record<FlowerKind, typeof pts> = { daisy: [], gazania: [], periwinkle: [], dandelion: [] };
  pts.forEach((p) => by[o.kinds[Math.floor(p.r * o.kinds.length * 0.9999)]].push(p));
  const sc = o.scale ?? 1;
  if (by.daisy.length) {
    const n = by.daisy.length, head = new THREE.PlaneGeometry(1, 1);
    const im = new THREE.InstancedMesh(head, daisyMat(ctx.windT), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    by.daisy.forEach((p, i) => {
      const s = (0.02 + 0.014 * ((p.r * 13.7) % 1)) * sc;
      q.setFromEuler(e.set(-Math.PI / 2 + ((p.r * 7.3) % 1 - 0.5) * 0.9, (p.r * 91) % TAU, 0, "YXZ"));
      m4.compose(new THREE.Vector3(p.x, (0.04 + 0.07 * ((p.r * 31.1) % 1)) * sc, p.z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4);
    });
    im.receiveShadow = true; im.frustumCulled = false; root.add(im);
  }
  const model = { gazania: "flower_gazania", periwinkle: "periwinkle_plant", dandelion: "dandelion_01" } as const;
  for (const k of ["gazania", "periwinkle", "dandelion"] as const) {
    if (!by[k].length) continue;
    const scl = k === "gazania" ? 0.35 : 1;
    const pts2 = (l: typeof pts) => l.map((p) => ({ pos: [p.x, -0.004, p.z] as [number, number, number], scale: scl * sc * (0.8 + 0.4 * ((p.r * 17.3) % 1)) }));
    if (k === "dandelion") {
      // the flowering heads are 23k-tri models: only ~1 in 6 dandelions flowers, the rest are leaf rosettes (2-3k tris)
      const fl = by[k].filter((p) => (p.r * 53.7) % 1 < 0.16), ro = by[k].filter((p) => (p.r * 53.7) % 1 >= 0.16);
      if (fl.length) root.add((await plants(ctx, { model: model[k], points: pts2(fl), seed: o.seed, variants: ["_a_", "_b_"] })).object);
      if (ro.length) root.add((await plants(ctx, { model: model[k], points: pts2(ro), seed: o.seed, variants: ["_c_", "_d_", "_e_"] })).object);
      continue;
    }
    root.add((await plants(ctx, { model: model[k], points: pts2(by[k]), seed: o.seed })).object);
  }
  let tris = 0; root.traverse((o2) => { if (typeof o2.userData.tris === "number") tris += o2.userData.tris; }); root.userData.tris = tris;
  return { object: root };
};

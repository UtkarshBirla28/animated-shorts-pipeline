// NATURE / hedges + bushes: a clipped hedge along a polyline with LEAF DEPTH (a dark woody core + leaf cards in a 0-14 cm
// deep shell: outer leaves lit and fluttering, inner ones darker = the clipped-privet look), uneven clipping (seeded bulges
// and dips), a rounded top edge, wind flutter in colour and shadow passes. `bushes()` = real CC0 shrubs (shrub_02).
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { FLUTTER_GLSL, COVERAGE_GLSL, TRANSLUCENT_GLSL, keyed } from "./wind";
import { leafAtlas, vnoise, type XZ } from "./ground_scatter";
import { plants } from "./plants";

export type HedgeOpts = { path: XZ[]; height?: number; width?: number; seed?: number; leavesPerM2?: number; leafSize?: number; tint?: [number, number, number]; wind?: number };
const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

const HEDGE_VERT = /* glsl */ `
uniform float windT; uniform float uWind;
attribute vec4 aHl;     // cell, phase, depth AO, tint
varying vec2 vHl;
` + FLUTTER_GLSL;
const HEDGE_BEGIN = /* glsl */ `
vec3 transformed = nkFlutter( position, normal, aHl.y, uWind );
vHl = aHl.zw;
`;
const hedgePatch = (sh: THREE.WebGLProgramParametersWithUniforms, U: object) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + HEDGE_VERT)
    .replace("#include <begin_vertex>", HEDGE_BEGIN)
    .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = ( uv + vec2( mod( aHl.x, 3.0 ), floor( aHl.x / 3.0 ) ) ) / 3.0;\n#endif\n#ifdef USE_ALPHAMAP\n vAlphaMapUv = ( uv + vec2( mod( aHl.x, 3.0 ), floor( aHl.x / 3.0 ) ) ) / 3.0;\n#endif");
};

export const hedge = async (ctx: KitCtx, o: HedgeOpts): Promise<Built> => {
  const { map, alpha } = await leafAtlas(ctx);
  const H = o.height ?? 0.95, Wd = o.width ?? 0.7, R = rng((o.seed ?? 1) + 77), dens = o.leavesPerM2 ?? 520, LS = o.leafSize ?? 0.075;
  const U = { windT: ctx.windT, uWind: { value: 0.6 * (o.wind ?? 1) }, uTransl: { value: 0.45 } };
  const tint = new THREE.Color(...(o.tint ?? [0.52, 0.66, 0.4]));
  const mat = new THREE.MeshStandardMaterial({ map, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, color: tint });
  mat.onBeforeCompile = (sh) => {
    hedgePatch(sh, U);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uTransl; varying vec2 vHl;")
      .replace("#include <normal_fragment_begin>", THREE.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""))
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= mix( 0.42, 1.0, vHl.x ) * mix( vec3( 0.92, 1.0, 0.86 ), vec3( 1.06, 1.0, 1.04 ), vHl.y );")
      .replace("#include <alphatest_fragment>", COVERAGE_GLSL)
      .replace("#include <lights_fragment_end>", TRANSLUCENT_GLSL("uTransl") + "\n reflectedLight.indirectDiffuse *= mix( 0.3, 1.0, vHl.x );");
  };
  keyed(mat, "hedge-leaf");
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide });
  depth.onBeforeCompile = (sh) => hedgePatch(sh, U);
  keyed(depth, "hedge-leaf-depth");
  const core = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.05, 0.08, 0.035, THREE.SRGBColorSpace), roughness: 1 });
  const root = new THREE.Group(); root.name = "kit-hedge";
  type L = { p: THREE.Vector3; n: THREE.Vector3; s: number; cell: number; ph: number; ao: number; tn: number };
  const leaves: L[] = [];
  const seed = o.seed ?? 1;
  for (let si = 0; si + 1 < o.path.length; si++) {
    const a = new THREE.Vector3(o.path[si][0], 0, o.path[si][1]), b = new THREE.Vector3(o.path[si + 1][0], 0, o.path[si + 1][1]);
    const dir = b.clone().sub(a), len = dir.length(); dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const yaw = Math.atan2(dir.x, dir.z);
    // the core: a slightly smaller box (no light leaks through the leaf shell)
    const box = new THREE.Mesh(new THREE.BoxGeometry(Wd - 0.12, H - 0.08, len), core);
    box.position.copy(a).addScaledVector(dir, len / 2).setY((H - 0.08) / 2); box.rotation.y = yaw; box.castShadow = true; box.receiveShadow = true; root.add(box);
    // the leaf shell: sides + top, with depth (0-14 cm inside the clipped surface) and seeded bulges
    const area = len * (2 * H + Wd);
    const n = Math.round(area * dens);
    for (let i = 0; i < n; i++) {
      const u = R() * len, f = R(), d = Math.pow(R(), 1.6) * 0.14;             // depth inside the surface
      const bulge = 0.035 * (vnoise(u / 0.6, f * 3, seed) - 0.5) + 0.02 * (vnoise(u / 0.23, f * 9, seed + 1) - 0.5);
      const c = a.clone().addScaledVector(dir, u);
      let p: THREE.Vector3, nn: THREE.Vector3;
      const sideA = f < 0.36 ? 1 : f < 0.72 ? -1 : 0;
      if (sideA !== 0) {
        const y = 0.03 + (H - 0.06) * Math.pow(R(), 0.85);
        const taper = 0.04 * (y / H);                                                  // clipped narrower at the top
        p = c.clone().addScaledVector(side, sideA * (Wd / 2 - taper + bulge - d)).setY(y);
        nn = side.clone().multiplyScalar(sideA).add(new THREE.Vector3((R() - 0.5) * 0.9, (R() - 0.25) * 1.0, (R() - 0.5) * 0.9));
      } else {
        const x = (R() - 0.5) * Wd, edge = Math.abs(x) / (Wd / 2);
        p = c.clone().addScaledVector(side, x).setY(H + bulge - d - 0.07 * Math.pow(edge, 3));   // rounded top edge
        nn = new THREE.Vector3(0, 1, 0).addScaledVector(side, x * 2.2).add(new THREE.Vector3((R() - 0.5) * 0.8, 0, (R() - 0.5) * 0.8));
      }
      const ao = THREE.MathUtils.clamp(1 - d / 0.14, 0, 1) * (0.75 + 0.25 * Math.min(1, p.y / H));
      leaves.push({ p, n: nn.normalize(), s: LS * (0.75 + 0.5 * R()) * (0.85 + 0.3 * ao), cell: Math.floor(R() * 9), ph: R(), ao: 0.25 + 0.75 * ao, tn: vnoise(u / 1.7, f, seed + 5) });
    }
  }
  const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(g, mat, leaves.length);
  const at = new Float32Array(leaves.length * 4), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), zA = new THREE.Vector3(0, 0, 1);
  leaves.forEach((L, i) => { q.setFromUnitVectors(zA, L.n); q2.setFromAxisAngle(L.n, L.ph * Math.PI * 2); q.premultiply(q2); m4.compose(L.p, q, new THREE.Vector3(L.s, L.s, L.s)); im.setMatrixAt(i, m4); at.set([L.cell, L.ph, L.ao, L.tn], i * 4); });
  im.geometry = g.clone(); im.geometry.setAttribute("aHl", new THREE.InstancedBufferAttribute(at, 4));
  im.customDepthMaterial = depth; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  root.add(im);
  root.userData.leaves = leaves.length;
  return { object: root };
};

/** real CC0 bushes (Poly Haven shrub_02, 4 variants ~1.2-2.2 m) at points, seeded variant / yaw / scale */
export const bushes = (ctx: KitCtx, pts: { pos: V3; scale?: number; rotY?: number }[], seed = 1) =>
  plants(ctx, { model: "shrub_02", points: pts.map((p) => ({ pos: p.pos, scale: p.scale ?? 0.8, rotY: p.rotY })), seed, shadow: true });

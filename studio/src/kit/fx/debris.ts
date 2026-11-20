// FX / debris: falling leaves (from a canopy volume, side-swinging + tumbling), leaves blowing along the ground (hops +
// skids down-wind) and blowing paper sheets. Instanced lit cards; position + rotation are pure functions of film time in
// the vertex shader (each item loops on its own seeded cycle). They cast shadows (small moving flecks) and read the
// same leaf atlas as the ground litter.
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { leafAtlas, curledLeafGeo } from "../nature/ground_scatter";
import { WIND_FX } from "./particles";

export type DebrisOpts = { on?: boolean; density?: number; seed?: number; box: [V3, V3]; count?: number; groundY?: number };
const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

const VERT = /* glsl */ `
attribute vec4 aD0;    // start xyz, phase
attribute vec4 aD1;    // cell, rand, size, mode (0 falling, 1 ground, 2 paper)
uniform float uT; uniform vec3 uWindD; uniform float uFall; uniform float uDrift; uniform float uPeriod; uniform float uGround; uniform float uDens; uniform vec3 uSpan;
varying vec2 vCell2;
mat3 nkRot( vec3 ax, float a ) { ax = normalize( ax ); float s = sin( a ), c = cos( a ), oc = 1.0 - c;
  return mat3( oc * ax.x * ax.x + c, oc * ax.x * ax.y + ax.z * s, oc * ax.z * ax.x - ax.y * s,
               oc * ax.x * ax.y - ax.z * s, oc * ax.y * ax.y + c, oc * ax.y * ax.z + ax.x * s,
               oc * ax.z * ax.x + ax.y * s, oc * ax.y * ax.z - ax.x * s, oc * ax.z * ax.z + c ); }
`;
const DEB_FN = /* glsl */ `
void nkDeb( out vec3 P, out mat3 Rm, out float sz ) {
float age = mod( uT + aD0.w * uPeriod, uPeriod );
float alive = step( aD1.y, uDens );
sz = aD1.z * alive;
if ( aD1.w < 0.5 ) {
  // falling: down at uFall m/s with a pendulum side-swing, drifting down-wind, tumbling
  float y = aD0.y - uFall * age;
  float sw = sin( age * ( 2.2 + aD1.y ) + aD0.w * 20.0 );
  P = vec3( aD0.x, max( y, uGround + 0.003 ), aD0.z ) + uWindD * uDrift * age + vec3( -uWindD.z, 0.0, uWindD.x ) * 0.35 * sw;
  float landed = step( y, uGround + 0.003 );
  Rm = nkRot( vec3( 0.3 + aD1.y, 1.0, 0.5 - aD1.y ), ( 1.0 - landed ) * ( age * ( 3.0 + 4.0 * aD1.y ) ) + sw * 0.8 );
  sz *= 1.0 - smoothstep( 0.85, 1.0, age / uPeriod );
} else {
  // blowing along the ground (leaves) / paper: skids down-wind with hops, wrapped inside the span box
  float hop = abs( sin( age * ( 2.5 + aD1.y * 2.0 ) + aD0.w * 9.0 ) );
  float gust = 0.5 + 0.5 * sin( uT * 0.7 + aD0.x * 0.3 );
  vec3 p = aD0.xyz + uWindD * uDrift * age * ( 0.6 + 0.8 * gust );
  p.xz = aD0.xz + mod( p.xz - aD0.xz + uSpan.xz * 0.5, uSpan.xz ) - uSpan.xz * 0.5;
  P = vec3( p.x, uGround + 0.004 + hop * hop * ( aD1.w > 1.5 ? 0.25 : 0.12 ) * gust, p.z );
  Rm = nkRot( vec3( aD1.y - 0.5, 1.0, 0.3 ), age * 6.0 * gust + aD0.w * 30.0 ) ;
}
vCell2 = aD1.xy;
}
`;
const BEGIN_N = "vec3 nkP; mat3 nkR; float nkS; nkDeb( nkP, nkR, nkS );\nvec3 objectNormal = nkR * vec3( normal );";
const BEGIN_V = (decl: boolean) => (decl ? "vec3 nkP; mat3 nkR; float nkS; nkDeb( nkP, nkR, nkS );\n" : "") + "vec3 transformed = nkR * ( position * nkS ) + nkP;";
export const debris = async (ctx: KitCtx, kind: "falling" | "blowing" | "paper", o: DebrisOpts): Promise<Built> => {
  const { map, alpha } = await leafAtlas(ctx);
  const R = rng((o.seed ?? 1) * 13 + kind.length);
  const n = Math.max(1, o.count ?? (kind === "falling" ? 60 : kind === "blowing" ? 40 : 6));
  const d0 = new Float32Array(n * 4), d1 = new Float32Array(n * 4), b = o.box;
  for (let i = 0; i < n; i++) {
    d0.set([b[0][0] + (b[1][0] - b[0][0]) * R(), b[0][1] + (b[1][1] - b[0][1]) * R(), b[0][2] + (b[1][2] - b[0][2]) * R(), R()], i * 4);
    d1.set([Math.floor(R() * 9), R(), kind === "paper" ? 0.2 + 0.08 * R() : 0.05 + 0.035 * R(), kind === "falling" ? 0 : kind === "blowing" ? 1 : 2], i * 4);
  }
  const base = kind === "paper" ? (() => { const g = new THREE.PlaneGeometry(1, 0.75, 4, 3); const p = g.getAttribute("position") as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * Math.sin(p.getX(i) * 4)); g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g; })() : curledLeafGeo(0.25);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index;
  for (const [k, a] of Object.entries(base.attributes)) g.setAttribute(k, a);
  g.setAttribute("aD0", new THREE.InstancedBufferAttribute(d0, 4)); g.setAttribute("aD1", new THREE.InstancedBufferAttribute(d1, 4)); g.instanceCount = n;
  const U = { uT: { value: 0 }, uWindD: { value: WIND_FX.clone() }, uFall: { value: kind === "falling" ? 0.7 : 0 }, uDrift: { value: kind === "falling" ? 0.5 : kind === "blowing" ? 1.4 : 1.1 },
    uPeriod: { value: kind === "falling" ? Math.max(4, (b[1][1] - (o.groundY ?? 0)) / 0.7 + 3) : 6 }, uGround: { value: o.groundY ?? 0 }, uDens: { value: o.density ?? 1 },
    uSpan: { value: new THREE.Vector3(b[1][0] - b[0][0], 0, b[1][2] - b[0][2]) } };
  const paper = kind === "paper";
  const mat = new THREE.MeshStandardMaterial(paper ? { color: 0xebe6da, roughness: 0.9, side: THREE.DoubleSide } : { map, alphaMap: alpha, alphaTest: 0.5, roughness: 0.75, side: THREE.DoubleSide });
  const patch = (sh: THREE.WebGLProgramParametersWithUniforms, frag: boolean) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VERT + DEB_FN)
      .replace("#include <beginnormal_vertex>", frag ? BEGIN_N : "#include <beginnormal_vertex>").replace("#include <begin_vertex>", BEGIN_V(!frag))
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = ( uv + vec2( mod( aD1.x, 3.0 ), floor( aD1.x / 3.0 ) ) ) / 3.0;\n#endif\n#ifdef USE_ALPHAMAP\n vAlphaMapUv = ( uv + vec2( mod( aD1.x, 3.0 ), floor( aD1.x / 3.0 ) ) ) / 3.0;\n#endif");
    if (frag && !paper) sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vCell2;").replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
 { float l = dot( diffuseColor.rgb, vec3( 0.3, 0.6, 0.1 ) ) * 2.1; float h = vCell2.y;
   vec3 c = h < 0.3 ? vec3( 0.58, 0.34, 0.12 ) : h < 0.6 ? vec3( 0.74, 0.55, 0.2 ) : h < 0.8 ? vec3( 0.45, 0.5, 0.18 ) : vec3( 0.44, 0.27, 0.13 ); diffuseColor.rgb = c * l; }`);
  };
  // colour pass: the debris transform runs at <beginnormal_vertex> (before <begin_vertex>), so the normals rotate too
  mat.onBeforeCompile = (sh) => patch(sh, true);
  mat.customProgramCacheKey = () => "fx:debris-" + kind;
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: paper ? null : alpha, alphaTest: paper ? 0 : 0.5, side: THREE.DoubleSide });
  dm.onBeforeCompile = (sh) => patch(sh, false); dm.customProgramCacheKey = () => "fx:debris-depth-" + kind;
  const mesh = new THREE.Mesh(g, mat); mesh.customDepthMaterial = dm; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.visible = o.on !== false; mesh.name = "fx-debris-" + kind;
  return { object: mesh, update: (t) => { U.uT.value = t; } };
};

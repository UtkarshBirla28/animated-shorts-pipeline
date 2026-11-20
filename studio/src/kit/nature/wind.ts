// NATURE: shared wind / foliage GLSL + material patch helpers (trees, hedges, grass, flowers all use these, so the wind
// field is ONE coherent field). Everything is a pure function of ctx.windT (the pipeline sets windT = t + 3 per sub-frame)
// and of position; the same code runs in the colour pass AND the shadow / depth pass (the shadows move with the leaves).
import * as THREE from "three";

/** world wind direction (unit, xz) + global strength, shared by every nature shader */
export const WIND = { dir: new THREE.Vector3(0.94, 0, 0.34).normalize(), strength: { value: 1 } };

/** tree-local sway: `lp` = position in the TREE's local frame (local units; uTreeB.x = local -> metres scale).
 *  uTree = (local height, local crown radius, phase 0..1, strength); uWindL = wind direction in tree-local axes (unit).
 *  Returns a displacement in local units. Weight grows with height and with distance from the trunk axis, so the trunk
 *  base never moves and a leaf cluster moves with the branch it hangs on (both sample the same field). */
export const SWAY_GLSL = /* glsl */ `
uniform float windT;
uniform vec4 uTree;
uniform vec4 uTreeB;
uniform vec3 uWindL;
vec3 nkSway( vec3 lp ) {
  float S = uTreeB.x;
  vec3 pm = lp * S;
  float Hm = max( uTree.x * S, 0.5 ), Rm = max( uTree.y * S, 0.3 );
  float h = clamp( pm.y / Hm, 0.0, 1.25 ), r = clamp( length( pm.xz ) / Rm, 0.0, 1.6 );
  float w = pow( smoothstep( 0.08, 1.0, h ), 1.5 ) * ( 0.45 + 0.55 * r );
  float T = windT, ph = uTree.z * 6.2832;
  float gust = 0.62 + 0.38 * sin( T * 0.29 + ph ) * sin( T * 0.131 + ph * 0.7 + 1.3 );
  float s1 = sin( T * 0.83 + ph ) + 0.5 * sin( T * 1.57 + ph * 1.7 );
  float s2 = sin( T * 2.05 + dot( pm, vec3( 0.83, 0.47, 0.71 ) ) + ph );
  float s3 = sin( T * 3.6 + dot( pm, vec3( 2.3, 1.9, 2.9 ) ) + ph * 2.0 );
  vec3 W = uWindL, side = normalize( vec3( -W.z, 0.0, W.x ) + 1e-5 );
  vec3 d = W * ( Hm * 0.0065 * ( 1.0 + 0.6 * s1 ) * gust * w )
         + side * ( Hm * 0.004 * s1 * gust * w )
         + ( vec3( 0.0, 1.0, 0.0 ) * 0.035 + ( W * 0.6 + side ) * 0.03 ) * s2 * r * w * ( 0.5 + gust )
         + vec3( 0.3, 1.0, 0.2 ) * 0.014 * s3 * r * w;
  return d * uTree.w / S;
}
`;

/** leaf flutter inside one cluster / leaf card (cluster-local vertex `p`, per-instance phase `ph`): a small rigid flap
 *  about the attachment point + a leaflet shimmer along the normal, both growing with distance from the stem */
export const FLUTTER_GLSL = /* glsl */ `
vec3 nkFlutter( vec3 p, vec3 n, float ph, float amt ) {
  float T = windT;
  float L = length( p );
  float a = amt * ( 0.11 * sin( T * 5.3 + ph * 40.0 ) + 0.06 * sin( T * 8.7 + ph * 23.0 ) );
  float c = cos( a ), s = sin( a );
  vec3 q = vec3( c * p.x - s * p.y, s * p.x + c * p.y, p.z );
  q += n * amt * 0.012 * L * sin( T * 11.0 + dot( p, vec3( 31.0, 17.0, 23.0 ) ) + ph * 13.0 );
  return q;
}
`;

/** coverage-preserving alpha: as a leaf texture minifies, boost alpha by its mip level so far foliage does not erode
 *  into holes (alpha-tested leaves otherwise thin out with distance) */
export const COVERAGE_GLSL = /* glsl */ `
#ifdef USE_MAP
{
  vec2 tsz = vec2( textureSize( map, 0 ) );
  vec2 ddx = dFdx( vMapUv * tsz ), ddy = dFdy( vMapUv * tsz );
  float lod = 0.5 * log2( max( max( dot( ddx, ddx ), dot( ddy, ddy ) ), 1e-6 ) );
  diffuseColor.a *= 1.0 + max( lod, 0.0 ) * 0.28;
}
#endif
#include <alphatest_fragment>`;

/** translucency toward the sun (thin leaves / blades glow when backlit), sampled with the real sun shadow */
export const TRANSLUCENT_GLSL = (k: string) => /* glsl */ `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0 && defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
{
  vec3 L = directionalLights[ 0 ].direction;
  float back = 0.08 + 0.92 * max( 0.0, - dot( normal, L ) );
  float vis = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity,
    directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
  vec3 V = normalize( vViewPosition );
  float fwd = 0.35 + 0.65 * pow( max( 0.0, dot( V, -L ) * 0.5 + 0.5 ), 3.0 );
  reflectedLight.directDiffuse += diffuseColor.rgb * vec3( 1.05, 1.0, 0.6 ) * directionalLights[ 0 ].color * vis * back * fwd * ${k};
}
#endif`;

/** world position of the patched vertex for shadows / fog (replaces <worldpos_vertex>) */
export const WORLDPOS_GLSL = /* glsl */ `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
  vec4 worldPosition = modelMatrix * nkLP;
#endif
`;

/** set a unique program cache key (CORE rule: every onBeforeCompile patch needs its own key) */
export const keyed = <T extends THREE.Material>(m: T, key: string): T => { m.customProgramCacheKey = () => "nature:" + key; return m; };

/** the wind uniforms for one tree / plant group: tree-local frame from its world matrix */
export type TreeU = { windT: { value: number }; uTree: { value: THREE.Vector4 }; uTreeB: { value: THREE.Vector4 }; uWindL: { value: THREE.Vector3 } };
export const treeUniforms = (windT: { value: number }, localH: number, localR: number, phase: number, strength: number, mat: THREE.Matrix4): TreeU => {
  const s = new THREE.Vector3().setFromMatrixScale(mat).x;
  const inv = new THREE.Matrix3().setFromMatrix4(mat).invert();
  const wl = WIND.dir.clone().applyMatrix3(inv).normalize();
  return { windT, uTree: { value: new THREE.Vector4(localH, localR, phase, strength) }, uTreeB: { value: new THREE.Vector4(s, 0, 0, 0) }, uWindL: { value: wl } };
};

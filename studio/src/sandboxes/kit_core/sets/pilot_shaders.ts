// KIT CORE sandbox: the look pilot's set shaders (wind on instanced leaves / grass, the lit character card, dust motes),
// COPIED from studio/src/sandboxes/lookpilot/shaders.ts (frozen there). PCSS, the noise seed, the accumulation, the shafts
// and the grade now come from kit/core (the pipeline owns them).
import * as THREE from "three";
import { seeded } from "../../../kit/core/shaders";
export { seeded };

// ================================================================ WIND (instanced leaves, grass)
export const WIND_T = { value: 0 };
/** leaves: aLeaf = (atlas cell x, cell y, phase, clump phase). Local flutter about the stem + a clump sway in world space */
const LEAF_VERT_PARS = /* glsl */ `
attribute vec4 aLeaf;
attribute vec2 aShade;
varying vec2 vShade;
uniform float windT;
vec3 lpSway( vec3 p, float ph ) {
  float h = clamp( ( p.y - 2.0 ) / 6.0, 0.0, 1.0 );
  float s = sin( windT * 1.3 + ph * 6.283 + p.x * 0.21 ) + 0.5 * sin( windT * 2.7 + ph * 11.0 + p.z * 0.37 );
  return vec3( 0.055 * s, 0.012 * sin( windT * 2.1 + ph * 7.0 ), 0.03 * s ) * ( 0.4 + h );
}
`;
const LEAF_BEGIN = /* glsl */ `
vec3 transformed = vec3( position );
vShade = aShade;
{
  float fl = 0.35 * sin( windT * 7.3 + aLeaf.z * 40.0 ) + 0.2 * sin( windT * 12.1 + aLeaf.z * 23.0 );
  float c = cos( fl ), s = sin( fl );
  transformed.xz = vec2( c * transformed.x - s * transformed.z, s * transformed.x + c * transformed.z );
}
`;
const LEAF_PROJECT = /* glsl */ `
vec4 lpIP = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  lpIP = instanceMatrix * lpIP;
  lpIP.xyz += lpSway( instanceMatrix[ 3 ].xyz, aLeaf.w );
#endif
vec4 mvPosition = modelViewMatrix * lpIP;
gl_Position = projectionMatrix * mvPosition;
`;
const LEAF_WORLDPOS = /* glsl */ `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
  vec4 worldPosition = modelMatrix * lpIP;
#endif
`;

const LEAF_COV = /* glsl */ `
#ifdef USE_MAP
{
  vec2 tsz = vec2( textureSize( map, 0 ) );
  vec2 ddx = dFdx( vMapUv * tsz ), ddy = dFdy( vMapUv * tsz );
  float lod = 0.5 * log2( max( max( dot( ddx, ddx ), dot( ddy, ddy ) ), 1e-6 ) );
  diffuseColor.a *= 1.0 + max( lod, 0.0 ) * 0.3;
}
#endif
#include <alphatest_fragment>`;
const leafVert = (sh: THREE.WebGLProgramParametersWithUniforms, atlas: number) => {
  sh.fragmentShader = sh.fragmentShader.replace("#include <alphatest_fragment>", LEAF_COV);
  sh.uniforms.windT = WIND_T;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\n" + LEAF_VERT_PARS)
    .replace("#include <begin_vertex>", LEAF_BEGIN)
    .replace("#include <project_vertex>", LEAF_PROJECT)
    .replace("#include <worldpos_vertex>", LEAF_WORLDPOS)
    .replace("#include <uv_vertex>", `#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = ( uv + aLeaf.xy ) / ${atlas.toFixed(1)};\n#endif`);
};
/** leaf material: PBR + thin-leaf translucency toward the sun (backlit leaves glow yellow-green) */
export const leafMaterial = (map: THREE.Texture, tint: THREE.Color, transl = 0.9) => {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.62, metalness: 0, color: tint });
  m.userData.translU = { value: transl };
  return seeded(m, (sh) => {
    leafVert(sh, 3);
    sh.uniforms.uTransl = m.userData.translU;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTransl;\nvarying vec2 vShade;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= vShade.x * mix( vec3( 0.9, 1.0, 0.8 ), vec3( 1.06, 1.0, 1.04 ), vShade.y ) * mix( 0.9, 1.08, vShade.y );")
      .replace("#include <lights_fragment_end>", /* glsl */ `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0 && defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
{
  vec3 L = directionalLights[ 0 ].direction;
  float back = max( 0.0, - dot( normal, L ) );
  float vis = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity,
    directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
  vec3 V = normalize( vViewPosition );
  float fwd = 0.45 + 0.55 * pow( max( 0.0, dot( V, -L ) * 0.5 + 0.5 ), 3.0 );
  reflectedLight.directDiffuse += diffuseColor.rgb * vec3( 1.05, 1.0, 0.62 ) * directionalLights[ 0 ].color * vis * back * fwd * uTransl;
}
#endif`);
  });
};
export const leafDepthMaterial = (map: THREE.Texture) => {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.42, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => leafVert(sh, 3);
  return m;
};

/** grass blades: aBlade = (phase, stiffness). Bend grows with height^2 */
const GRASS_PARS = /* glsl */ `
attribute vec2 aBlade;
uniform float windT;
`;
const GRASS_PROJECT = /* glsl */ `
vec4 lpIP = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  lpIP = instanceMatrix * lpIP;
  float hh = position.y * position.y;
  vec3 ip = instanceMatrix[ 3 ].xyz;
  float w = sin( windT * 2.2 + ip.x * 0.9 + ip.z * 0.6 + aBlade.x * 6.283 ) + 0.4 * sin( windT * 5.1 + aBlade.x * 30.0 );
  lpIP.x += 0.035 * hh * w * aBlade.y;
  lpIP.z += 0.02 * hh * w * aBlade.y;
#endif
vec4 mvPosition = modelViewMatrix * lpIP;
gl_Position = projectionMatrix * mvPosition;
`;
export const grassMaterial = () => {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, side: THREE.DoubleSide, vertexColors: false });
  return seeded(m, (sh) => {
    sh.uniforms.windT = WIND_T;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\n" + GRASS_PARS + "\nvarying float vH;")
      .replace("#include <project_vertex>", GRASS_PROJECT + "\nvH = position.y;")
      .replace("#include <worldpos_vertex>", LEAF_WORLDPOS);
    // base darker (self-occlusion inside the turf), tips lighter + a little translucency toward the sun
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vH;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= mix( 0.38, 1.12, smoothstep( 0.0, 1.0, vH ) );")
      .replace("#include <lights_fragment_end>", /* glsl */ `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0 && defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
{
  vec3 L = directionalLights[ 0 ].direction;
  float vis = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity,
    directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
  vec3 V = normalize( vViewPosition );
  float fwd = pow( max( 0.0, dot( V, -L ) * 0.5 + 0.5 ), 2.0 );
  reflectedLight.directDiffuse += diffuseColor.rgb * vec3( 1.0, 1.0, 0.55 ) * directionalLights[ 0 ].color * vis * fwd * 0.35 * vH;
}
#endif`);
  });
};

// ================================================================ THE CHARACTER CARD (the only inked thing in the frame)
// Flat 2D card lit like a set piece: albedo x (sky + ground bounce) + sun x sun visibility (the leaf dapple, from the
// SECOND directional light's shadow map, which never contains the card itself, so no self-shadow) x a soft gradient toward
// the sun side, + a warm rim on the sun-facing edge where the sun reaches. The card is drawn with the clown film's cast kit.
export type CardU = { uAmb: { value: THREE.Color }; uSun: { value: THREE.Color }; uSunK: { value: number }; uRim: { value: number }; uPx: { value: number }; uSide: { value: number }; uDbg: { value: number } };
export const cardMaterial = (map: THREE.Texture) => {
  const U: CardU = { uAmb: { value: new THREE.Color(0.5, 0.56, 0.66) }, uSun: { value: new THREE.Color(1, 0.86, 0.68) }, uSunK: { value: 0.7 }, uRim: { value: 1.0 },
    uPx: { value: 1 }, uSide: { value: -1 }, uDbg: { value: 0 } };
  const m = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  m.userData.cardU = U;
  return seeded(m, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uAmb; uniform vec3 uSun; uniform float uSunK; uniform float uRim; uniform float uPx; uniform float uSide; uniform float uDbg;")
      .replace("#include <opaque_fragment>", /* glsl */ `
{
  float vis = 1.0;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 1
  vis = getShadow( directionalShadowMap[ 1 ], directionalLightShadows[ 1 ].shadowMapSize, directionalLightShadows[ 1 ].shadowIntensity,
    directionalLightShadows[ 1 ].shadowBias, directionalLightShadows[ 1 ].shadowRadius, vDirectionalShadowCoord[ 1 ] );
#endif
  // screen-left .. right across the card (the card may be mirrored: dFdx sign)
  float sx = ( vMapUv.x - 0.5 ) * sign( dFdx( vMapUv.x ) + 1e-7 );
  float toward = clamp( 0.5 - sx * uSide * 2.2, 0.0, 1.0 );     // 1 on the sun side
  float grad = mix( 0.78, 1.12, toward );
  vec3 albedo = diffuseColor.rgb;
  // sky light from above, a warm bounce from the sunlit bricks below
  float up = smoothstep( 0.1, 0.95, vMapUv.y );
  vec3 amb = uAmb * mix( vec3( 1.06, 0.97, 0.88 ), vec3( 0.97, 1.0, 1.06 ), up );
  vec3 col = albedo * ( amb + uSun * uSunK * vis * grad );
#ifdef USE_MAP
  // warm rim on the sun-facing contour: the next pixels toward the sun are outside the card
  vec2 dsun = vec2( uSide, 0.55 );
  vec2 duv = 4.0 * uPx * ( dsun.x * dFdx( vMapUv ) + dsun.y * dFdy( vMapUv ) );
  float edge = step( texture2D( map, vMapUv + duv ).a, 0.5 );
  float solid = step( 0.5, texture2D( map, vMapUv - normalize( duv + 1e-9 ) * 0.018 ).a );
  col += uSun * vec3( 1.0, 0.82, 0.56 ) * edge * solid * vis * uRim * 1.4;
#endif
  outgoingLight = uDbg > 0.5 ? vec3( vis, 1.0 - vis, 0.0 ) : col;
}
#include <opaque_fragment>`);
  });
};

// ================================================================ DUST MOTES (instanced points, lit only inside the sun)
export const moteMaterial = (shadowMap: () => THREE.Texture | null, shadowMat: THREE.Matrix4) => {
  const U = { windT: WIND_T, tShadow: { value: null as THREE.Texture | null }, shadowMat: { value: shadowMat }, pxScale: { value: 1 }, sunCol: { value: new THREE.Color(1, 0.85, 0.6) },
    sunDirV: { value: new THREE.Vector3() } };
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
#include <packing>
attribute vec4 aMote;
uniform float windT; uniform sampler2D tShadow; uniform mat4 shadowMat; uniform float pxScale;
varying float vB;
void main() {
  vec3 p = position;
  float t = windT;
  p += vec3( 0.22 * sin( t * 0.31 + aMote.x * 6.28 ) + 0.06 * t, 0.12 * sin( t * 0.43 + aMote.y * 6.28 ) + 0.02 * t, 0.18 * sin( t * 0.27 + aMote.z * 6.28 ) );
  vec4 sc = shadowMat * vec4( p, 1.0 ); sc.xyz /= sc.w;
  float vis = ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 ) ? 1.0 : step( sc.z - 0.002, unpackRGBAToDepth( texture2D( tShadow, sc.xy ) ) );
  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mv;
  float tw = 0.55 + 0.45 * sin( t * ( 2.0 + 3.0 * aMote.w ) + aMote.x * 40.0 );
  vB = vis * tw;
  gl_PointSize = clamp( ( 0.0042 + 0.004 * aMote.w ) * pxScale / max( -mv.z, 0.05 ), 1.2, 14.0 );
}`,
    fragmentShader: /* glsl */ `
uniform vec3 sunCol;
varying float vB;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep( 0.5, 0.0, length( d ) );
  if ( vB * a < 0.002 ) discard;
  gl_FragColor = vec4( sunCol * vB * a * a * 2.2, 1.0 );
}`,
  });
  m.onBeforeRender = () => { U.tShadow.value = shadowMap(); };
  return { m, U };
};

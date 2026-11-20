// LOOK PILOT shaders: PCSS soft sun shadows (contact-hardening, patched into three's shadow chunk for this sandbox
// bundle only), wind on instanced leaves / grass, the lit character card, volumetric sun shafts, the accumulation pass
// (sub-frame motion blur + lens DOF + AA) and the calm filmic grade.
import * as THREE from "three";
import { Effect, EffectAttribute, BlendFunction, Pass } from "postprocessing";

// ================================================================ PCSS (directional sun, ortho shadow camera)
// A light with shadow.radius > 50 uses PCSS: penumbra (texels) = (receiver depth - mean blocker depth) * (radius - 50).
// 16 blocker taps + 32 filter taps on a Vogel disk rotated per pixel (interleaved gradient noise + a per-sub-frame
// seed, so the accumulation averages the noise away).
export const LP_SEED = { value: 0 };
const PCSS = /* glsl */ `
uniform float lpSeed;
float lpIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
vec2 lpVogel( int i, float n, float s, float c ) {
  float r = sqrt( ( float( i ) + 0.5 ) / n ), th = float( i ) * 2.39996;
  vec2 p = vec2( cos( th ), sin( th ) ) * r;
  return vec2( p.x * c - p.y * s, p.x * s + p.y * c );
}
float lpPCSS( sampler2D sm, vec2 size, float K, vec4 sc ) {
  vec2 texel = 1.0 / size;
  float zR = sc.z;
  float ang = 6.2831853 * lpIGN( gl_FragCoord.xy + vec2( 17.0, 59.0 ) * lpSeed );
  float sA = sin( ang ), cA = cos( ang );
  float Rs = clamp( K * 0.12, 3.0, 36.0 );
  float sum = 0.0, n = 0.0;
  for ( int i = 0; i < 16; i ++ ) {
    float d = unpackRGBAToDepth( texture2D( sm, sc.xy + lpVogel( i, 16.0, sA, cA ) * Rs * texel ) );
    if ( d < zR ) { sum += d; n += 1.0; }
  }
  if ( n < 0.5 ) return 1.0;
  float pen = clamp( ( zR - sum / n ) * K, 1.2, 36.0 );
  float lit = 0.0;
  for ( int i = 0; i < 32; i ++ ) lit += step( zR, unpackRGBAToDepth( texture2D( sm, sc.xy + lpVogel( i, 32.0, cA, sA ) * pen * texel ) ) );
  return lit / 32.0;
}
`;
let patched = false;
export const patchShadowChunk = () => {
  if (patched) return;
  patched = true;
  let s = THREE.ShaderChunk.shadowmap_pars_fragment;
  s = s.replace("float getShadow( sampler2D shadowMap,", PCSS + "\n\tfloat getShadow( sampler2D shadowMap,");
  s = s.replace("#if defined( SHADOWMAP_TYPE_PCF )\n", "#if defined( SHADOWMAP_TYPE_PCF )\n if ( shadowRadius > 50.0 ) { shadow = lpPCSS( shadowMap, shadowMapSize, shadowRadius - 50.0, shadowCoord ); } else {\n");
  s = s.replace("#elif defined( SHADOWMAP_TYPE_PCF_SOFT )", "}\n#elif defined( SHADOWMAP_TYPE_PCF_SOFT )");
  THREE.ShaderChunk.shadowmap_pars_fragment = s;
};
/** every lit material of the pilot gets the shared per-sub-frame noise seed */
export const seeded = <T extends THREE.Material>(m: T, extra?: (sh: THREE.WebGLProgramParametersWithUniforms) => void): T => {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { sh.uniforms.lpSeed = LP_SEED; prev.call(m, sh, r); extra?.(sh); };
  return m;
};

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

// ================================================================ VOLUMETRIC SUN SHAFTS
// Single scattering through a thin ground haze: march the view ray to the scene depth (max 45 m) in 40 jittered steps,
// test the sun's shadow map at each step (so shafts follow the real leaf gaps and the trunks' shadows), Henyey-Greenstein
// phase, exponential height falloff. Added in linear HDR before the AO-free accumulation.
const volFrag = /* glsl */ `
uniform sampler2D tShadow;
uniform mat4 shadowMat;
uniform mat4 projInv;
uniform mat4 camWorld;
uniform vec3 sunDirW;
uniform vec3 sunCol;
uniform float density;
uniform float seed;
uniform float maxDist;
uniform float camNear;
uniform float camFar;
float lpUnpack( const in vec4 v ) { return dot( v, vec4( ( 255.0 / 256.0 ) / vec3( 1.0, 256.0, 65536.0 ), 1.0 / 16777216.0 ) ); }
float vIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
float sunVis( vec3 w ) {
  vec4 sc = shadowMat * vec4( w, 1.0 );
  sc.xyz /= sc.w;
  if ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 ) return 1.0;
  return step( sc.z - 0.0015, lpUnpack( texture2D( tShadow, sc.xy ) ) );
}
void mainImage( const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor ) {
  vec4 ndc = vec4( uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );
  vec4 vp = projInv * ndc; vp /= vp.w;
  float dist = depth >= 0.9999 ? maxDist : min( length( vp.xyz ), maxDist );
  vec3 ro = ( camWorld * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
  vec3 rd = normalize( ( camWorld * vec4( vp.xyz, 0.0 ) ).xyz );
  const int N = 40;
  float dt = dist / float( N );
  float j = vIGN( gl_FragCoord.xy + vec2( 23.0, 71.0 ) * seed );
  float acc = 0.0, T = 1.0;
  for ( int i = 0; i < N; i ++ ) {
    float s = ( float( i ) + j ) * dt;
    vec3 p = ro + rd * s;
    float dens = density * exp( - max( p.y, 0.0 ) / 3.2 );
    acc += T * dens * sunVis( p ) * dt;
    T *= exp( - dens * dt * 0.35 );
  }
  float mu = dot( rd, sunDirW ), g = 0.62;
  float hg = ( 1.0 - g * g ) / ( 4.0 * 3.14159 * pow( 1.0 + g * g - 2.0 * g * mu, 1.5 ) );
  outputColor = vec4( inputColor.rgb + sunCol * acc * hg * 12.566, inputColor.a );
}`;
export class VolumeEffect extends Effect {
  constructor() {
    super("VolumeEffect", volFrag, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["tShadow", new THREE.Uniform(null)], ["shadowMat", new THREE.Uniform(new THREE.Matrix4())], ["projInv", new THREE.Uniform(new THREE.Matrix4())],
        ["camWorld", new THREE.Uniform(new THREE.Matrix4())], ["sunDirW", new THREE.Uniform(new THREE.Vector3())], ["sunCol", new THREE.Uniform(new THREE.Color())],
        ["density", new THREE.Uniform(0.02)], ["seed", new THREE.Uniform(0)], ["maxDist", new THREE.Uniform(45)],
        ["camNear", new THREE.Uniform(0.05)], ["camFar", new THREE.Uniform(3000)],
      ]),
    });
  }
  set(light: THREE.DirectionalLight, cam: THREE.PerspectiveCamera, sunCol: THREE.Color, density: number, seed: number) {
    const u = this.uniforms;
    u.get("tShadow")!.value = light.shadow.map ? light.shadow.map.texture : null;
    (u.get("shadowMat")!.value as THREE.Matrix4).copy(light.shadow.matrix);
    (u.get("projInv")!.value as THREE.Matrix4).copy(cam.projectionMatrixInverse);
    (u.get("camWorld")!.value as THREE.Matrix4).copy(cam.matrixWorld);
    (u.get("sunDirW")!.value as THREE.Vector3).copy(light.position).sub(light.target.position).normalize();
    (u.get("sunCol")!.value as THREE.Color).copy(sunCol);
    u.get("density")!.value = density;
    u.get("seed")!.value = seed;
  }
}

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

// ================================================================ ACCUMULATION + COPY passes
const ACC_FRAG = /* glsl */ `
uniform sampler2D tIn; uniform sampler2D tDepth; uniform float w; uniform float volOn;
uniform sampler2D tShadow; uniform mat4 shadowMat; uniform mat4 projInv; uniform mat4 camWorld;
uniform vec3 sunDirW; uniform vec3 sunCol; uniform float density; uniform float seed; uniform float maxDist;
varying vec2 vUv;
float lpUnpack( const in vec4 v ) { return dot( v, vec4( ( 255.0 / 256.0 ) / vec3( 1.0, 256.0, 65536.0 ), 1.0 / 16777216.0 ) ); }
float vIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
float sunVis( vec3 p ) {
  vec4 sc = shadowMat * vec4( p, 1.0 );
  sc.xyz /= sc.w;
  if ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 ) return 1.0;
  return step( sc.z - 0.0015, lpUnpack( texture2D( tShadow, sc.xy ) ) );
}
void main() {
  vec3 col = texture2D( tIn, vUv ).rgb;
  if ( volOn > 0.5 ) {
    float depth = texture2D( tDepth, vUv ).r;
    vec4 vp = projInv * vec4( vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 ); vp /= vp.w;
    float dist = depth >= 0.99999 ? maxDist : min( length( vp.xyz ), maxDist );
    vec3 ro = ( camWorld * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
    vec3 rd = normalize( ( camWorld * vec4( vp.xyz, 0.0 ) ).xyz );
    const int N = 40;
    float dt = dist / float( N ), j = vIGN( gl_FragCoord.xy + vec2( 23.0, 71.0 ) * seed ), acc = 0.0;
    for ( int i = 0; i < N; i ++ ) {
      vec3 p = ro + rd * ( ( float( i ) + j ) * dt );
      acc += ( 0.25 + smoothstep( 0.3, 2.5, p.y ) * exp( - max( p.y - 2.5, 0.0 ) / 4.0 ) ) * sunVis( p ) * dt;
    }
    float mu = dot( rd, sunDirW ), g = 0.7;
    float hg = ( 1.0 - g * g ) / ( 4.0 * 3.14159 * pow( 1.0 + g * g - 2.0 * g * mu, 1.5 ) );
    col += sunCol * density * acc * hg * 12.566;
  }
  gl_FragColor = vec4( col * w, 1.0 );
}`;
const quadVert = /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4( position.xy, 1.0, 1.0 ); }`;
export class AccumPass extends Pass {
  target: THREE.WebGLRenderTarget; first = true; weight = 1; vol = true;
  private mat: THREE.ShaderMaterial;
  constructor(target: THREE.WebGLRenderTarget) {
    super("AccumPass");
    this.target = target;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tIn: { value: null }, tDepth: { value: null }, w: { value: 1 }, volOn: { value: 1 },
        tShadow: { value: null }, shadowMat: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
        sunDirW: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, density: { value: 0.002 }, seed: { value: 0 }, maxDist: { value: 34 } },
      vertexShader: quadVert, fragmentShader: ACC_FRAG,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, depthTest: false, depthWrite: false });
    this.fullscreenMaterial = this.mat;
    this.needsSwap = false;
    this.needsDepthTexture = true;
  }
  setDepthTexture(t: THREE.Texture) { this.mat.uniforms.tDepth.value = t; }
  setVolume(light: THREE.DirectionalLight, cam: THREE.PerspectiveCamera, sunCol: THREE.Color, density: number, seed: number) {
    const u = this.mat.uniforms;
    u.tShadow.value = light.shadow.map ? light.shadow.map.texture : null;
    (u.shadowMat.value as THREE.Matrix4).copy(light.shadow.matrix);
    (u.projInv.value as THREE.Matrix4).copy(cam.projectionMatrixInverse);
    (u.camWorld.value as THREE.Matrix4).copy(cam.matrixWorld);
    (u.sunDirW.value as THREE.Vector3).copy(light.position).sub(light.target.position).normalize();
    (u.sunCol.value as THREE.Color).copy(sunCol);
    u.density.value = density; u.seed.value = seed;
  }
  render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    this.mat.uniforms.tIn.value = inputBuffer.texture;
    this.mat.uniforms.w.value = this.weight;
    this.mat.uniforms.volOn.value = this.vol && this.mat.uniforms.tShadow.value ? 1 : 0;
    renderer.setRenderTarget(this.target);
    if (this.first) { renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); this.first = false; }
    renderer.render(this.scene, this.camera);
  }
}
export class CopyFromPass extends Pass {
  private mat: THREE.ShaderMaterial;
  constructor(tex: THREE.Texture) {
    super("CopyFromPass");
    this.mat = new THREE.ShaderMaterial({ uniforms: { tIn: { value: tex } }, vertexShader: quadVert,
      fragmentShader: `uniform sampler2D tIn; varying vec2 vUv; void main() { gl_FragColor = vec4( texture2D( tIn, vUv ).rgb, 1.0 ); }`, depthTest: false, depthWrite: false });
    this.fullscreenMaterial = this.mat;
    this.needsSwap = true;
  }
  render(renderer: THREE.WebGLRenderer, _in: THREE.WebGLRenderTarget, outputBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}

// ================================================================ CALM FILMIC GRADE (after AgX, display-referred)
// AgX already rolls the highlights and desaturates them; this adds a gentle S curve, a global saturation trim, a hint of
// warm highlights / near-neutral cool shadows, a soft vignette and a very fine grain. Target: mean chroma ~24, neutral
// shadows (shadow chroma ~20).
const gradeFrag = /* glsl */ `
uniform float sat; uniform float shadowSat; uniform float contrast; uniform float vig; uniform float grain; uniform float seed; uniform float expo;
uniform vec3 hiTint; uniform vec3 loTint;
float gH( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  vec3 c = max( inputColor.rgb * expo, 0.0 );
  vec3 d = pow( c, vec3( 1.0 / 2.2 ) );                       // display-ish
  float l = dot( d, vec3( 0.2126, 0.7152, 0.0722 ) );
  // S curve around 0.42
  vec3 s = d + contrast * ( d - 0.42 ) * ( 1.0 - abs( d - 0.42 ) * 1.6 );
  s = clamp( s, 0.0, 1.0 );
  float ls = dot( s, vec3( 0.2126, 0.7152, 0.0722 ) );
  float satK = mix( shadowSat, sat, smoothstep( 0.08, 0.45, ls ) );
  s = mix( vec3( ls ), s, satK );
  s *= mix( loTint, hiTint, smoothstep( 0.2, 0.85, ls ) );
  vec2 q = uv - 0.5; q.x *= 0.5625 * 1.6;
  s *= 1.0 - vig * smoothstep( 0.25, 0.85, length( q ) );
  s += grain * ( gH( uv * 1920.0 + seed ) - 0.5 ) * ( 0.6 + 0.4 * ( 1.0 - ls ) );
  outputColor = vec4( pow( max( s, 0.0 ), vec3( 2.2 ) ), inputColor.a );
}`;
export class LookGrade extends Effect {
  constructor() {
    super("LookGrade", gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["sat", new THREE.Uniform(1.9)], ["shadowSat", new THREE.Uniform(1.35)], ["contrast", new THREE.Uniform(0.24)], ["vig", new THREE.Uniform(0.2)],
        ["grain", new THREE.Uniform(0.012)], ["seed", new THREE.Uniform(0)], ["expo", new THREE.Uniform(1)],
        ["hiTint", new THREE.Uniform(new THREE.Vector3(1.012, 1.0, 0.975))], ["loTint", new THREE.Uniform(new THREE.Vector3(0.985, 1.0, 1.02))],
      ]),
    });
  }
  u(name: string) { return this.uniforms.get(name)!; }
}

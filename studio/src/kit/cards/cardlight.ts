// KIT / CARDS: the light ON a 2D character card (owner CARDS, 2026-11-19). See NOTES.md in this folder.
//
// One CardLight service per scene, shared by every card:
//  - a CHARACTER-FREE sun visibility map: a private DirectionalLight (never added to the scene, so it costs no other
//    material anything) whose shadow map is rendered by us once per sub-frame (ctx.onUpdate) through three's own
//    WebGLShadowMap, so every caster uses its real depth material (wind, alpha-tested leaves, window bars). The card
//    proxies skip this pass, the cards never cast, so the dapple / window bars cross a card with no self-shadow. The
//    ortho frustum is fitted tightly round the near cards (mm-scale texels: leaf flecks stay crisp on a face).
//  - a local GI PROBE per 1.5 m cell: a 6-face capture of the set at chest height (cards hidden, wind frozen) projected
//    to L2 spherical harmonics, bilinear between cells. It carries the sky AND the bounce (sunlit bricks under him, a
//    lamp-lit wall at night, the sun patch on an interior floor).
//  - the card MATERIAL (one program for every card): form shading from a distance-field bulge of the drawing's alpha,
//    sun x visibility, every three Point / Spot / Directional / Hemisphere light of the scene (CORE's practicals work
//    with no glue), SH fill with ground AO, a crisp rim on the sun side and on the strongest lamp's side, an exposure
//    guard (floor + ceiling relative to the strongest light: readable in backlight, never blown in full sun), a shade
//    saturation lift (never grey), toned ink, reduced fog on the card.
import * as THREE from "three";
import type { KitCtx, V3 } from "../core/ctx";

export type CardLook = {
  /** card brightness relative to the world's physical light (cartoon albedos are high: 1 would blow out a cream face) */
  gain: number;
  /** extra factor on direct light (sun / lamps) vs fill */
  keyK: number;
  /** form shading amount (0 = flat card, 1 = full bulge normals) */
  form: number;
  /** wrap lighting (0 = hard Lambert terminator .. 1 = very soft) */
  wrap: number;
  /** total light never drops under floorK x (the strongest light's unoccluded key): faces stay readable in shade / backlight */
  floorK: number;
  /** the floor when that light is BEHIND the card (backlight) */
  floorBackK: number;
  /** ... and never rises over ceilK x it (plus the rim) */
  ceilK: number;
  /** rim strength (sun side and strongest lamp side), width in px at 1080 x 1920 */
  rim: number; rimPx: number;
  /** ink albedo (linear): the outline takes the local light at this albedo instead of 0 */
  inkK: number;
  /** saturation lift in shade (never grey) */
  shadeSat: number;
  /** how much of the FILL's colour (sky / bounce) tints the card (1 = physical; less keeps the cartoon palette true in shade) */
  tintK: number;
  /** fog / haze on the card relative to the world (cards stay a little crisper than the set) */
  fogK: number;
  /** bulge depth (m) used to bend the visibility lookup round the body */
  bulgeM: number;
  /** ground AO on the card's lowest 0.3 m (0 = off) */
  groundAO: number;
};
export const DEFAULT_LOOK: CardLook = { gain: 0.42, keyK: 1.0, form: 1, wrap: 0.35, floorK: 0.3, floorBackK: 0.5, ceilK: 1.35, rim: 1.0, rimPx: 3.2, inkK: 0.05,
  shadeSat: 0.3, tintK: 0.38, fogK: 0.55, bulgeM: 0.12, groundAO: 0.3 };

export type CardLightOpts = {
  mapSize?: number; sunDiamDeg?: number; probeCell?: number; probeRes?: number; look?: Partial<CardLook>;
  /** near cards' sun visibility: "private" (default: our tight per-sub-frame pass) or "sunCard" (CORE's ctx.sunCard map,
   *  character-free, once per output frame, no extra pass). Far cards always read ctx.sunCard when it exists, else ctx.sun */
  source?: "private" | "sunCard";
  /** fill: "capture" (local cube probes: sky + bounce) or "rig" (CORE's ctx.rig.ambient / .bounce as a two-tone sky,
   *  free). Default: capture, except quality "draft" when the rig carries ambient */
  probe?: "capture" | "rig";
};
/** configure the scene's card light BEFORE the first card is built (else the first card creates it with defaults) */
export const configureCards = (ctx: KitCtx, o: CardLightOpts) => CardLight.of(ctx, o);

/** what a card registers so the service can fit the visibility frustum and hide it in probe captures */
export type CardReg = { pos: (t: number) => V3; heightM: number; near: () => boolean; hide: THREE.Object3D[] };

const INK_SRGB = { r: 0x2c / 255, g: 0x1e / 255, b: 0x2a / 255 };   // toon.ts INK, display sRGB
const TMP = new THREE.Vector3(), TMP2 = new THREE.Vector3();

// ================================================================ the card material (shared program)
const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vViewPos;
varying vec3 vRight;
varying vec3 vUpW;
varying vec3 vFwd;
#ifdef CARD_ATLAS
attribute vec4 aCell;
varying vec4 vCell;
#endif
void main() {
  vUv = uv;
  mat4 M = modelMatrix;
#ifdef USE_INSTANCING
  M = modelMatrix * instanceMatrix;
#endif
#ifdef CARD_ATLAS
  vCell = aCell;
#endif
  vec4 wp = M * vec4( position, 1.0 );
  vWorld = wp.xyz;
  vRight = normalize( M[ 0 ].xyz );   // the direction of +uv.x (mirrored cards: points left)
  vUpW = normalize( M[ 1 ].xyz );
  vFwd = normalize( M[ 2 ].xyz );     // the card's face, toward the lens
  vec4 mvPosition = viewMatrix * wp;
  vViewPos = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
uniform sampler2D map;
uniform sampler2D tFormS;
uniform sampler2D tFormL;
uniform vec2 uFormTexel;
uniform vec2 uSigma;      // the two blur sigmas in form texels
uniform vec3 uSH[ 9 ];
// visibility (character-free sun shadow map)
uniform sampler2D tVis;
uniform mat4 visMat;
uniform float visOn;
uniform float visK;        // penumbra texels per unit of map depth
uniform vec2 visSize;
uniform float visBias;
uniform vec3 uSunDirV;     // view space, toward the sun (matches one of directionalLights[])
uniform float uSeed;
// look
uniform float uGain; uniform float uKeyK; uniform float uForm; uniform float uWrap; uniform float uFloorK; uniform float uFloorBack; uniform float uCeilK;
uniform float uRim; uniform float uRimPx; uniform float uInkK; uniform vec3 uInk; uniform float uShadeSat; uniform float uFogK;
uniform float uTintK; uniform float uBulge; uniform float uGroundAO; uniform float uGroundY; uniform float uPxK; uniform float uDbg; uniform float uAlphaTest;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vViewPos;
varying vec3 vRight;
varying vec3 vUpW;
varying vec3 vFwd;
#ifdef CARD_ATLAS
varying vec4 vCell;
#endif

float cIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
vec2 cVogel( int i, float n, float s, float c ) {
  float r = sqrt( ( float( i ) + 0.5 ) / n ), th = float( i ) * 2.39996;
  vec2 p = vec2( cos( th ), sin( th ) ) * r;
  return vec2( p.x * c - p.y * s, p.x * s + p.y * c );
}
// contact-hardening soft visibility (PCSS) on the character-free map
float cardVis( vec3 wp ) {
  if ( visOn < 0.5 ) return 1.0;
  vec4 sc = visMat * vec4( wp, 1.0 );
  sc.xyz /= sc.w;
  if ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 ) return 1.0;
  float zR = sc.z - visBias;
  vec2 texel = 1.0 / visSize;
  float ang = 6.2831853 * cIGN( gl_FragCoord.xy + vec2( 17.0, 59.0 ) * uSeed );
  float sA = sin( ang ), cA = cos( ang );
  float Rs = clamp( visK * 0.1, 2.0, 40.0 );
  float sum = 0.0, n = 0.0;
  for ( int i = 0; i < 12; i ++ ) {
    float d = unpackRGBAToDepth( textureLod( tVis, sc.xy + cVogel( i, 12.0, sA, cA ) * Rs * texel, 0.0 ) );
    if ( d < zR ) { sum += d; n += 1.0; }
  }
  if ( n < 0.5 ) return 1.0;
  float pen = clamp( ( zR - sum / n ) * visK, 1.0, 40.0 );
  float lit = 0.0;
  for ( int i = 0; i < 24; i ++ ) lit += step( zR, unpackRGBAToDepth( textureLod( tVis, sc.xy + cVogel( i, 24.0, cA, sA ) * pen * texel, 0.0 ) ) );
  return lit / 24.0;
}
float wrapResp( float nl ) { return clamp( ( nl + uWrap ) / ( 1.0 + uWrap ), 0.0, 1.0 ); }
float lum3( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }
// crisp rim: the next pixels toward the light (screen direction Lv.xy) are outside the drawing
float rimEdge( vec3 Lv, vec2 uv, vec2 dU, vec2 dV, float rimW ) {
  vec2 sd = Lv.xy; float sl = length( sd );
  if ( sl < 0.05 ) return 0.0;
  sd /= sl;
  float back = 0.25 + 0.75 * smoothstep( 0.45, -0.55, Lv.z );
  // LOOK 2026-11-21 02:30: at draft / preview scale (0.5) rimW was ~1.2 px and the one-sample test flipped pixel by pixel
  // along the contour = a WHITE DASHED rim on small / far figures. Now: at least 2 px, three samples along the light
  // direction averaged (not max), a softer alpha step
  vec2 duv = rimW * ( sd.x * dU + sd.y * dV );
  duv *= max( 1.0, 2.0 / max( rimW, 1e-3 ) );
  float e1 = 1.0 - smoothstep( uAlphaTest * 0.3, uAlphaTest * 1.2, texture2D( map, uv + duv ).a );
  float e2 = 1.0 - smoothstep( uAlphaTest * 0.3, uAlphaTest * 1.2, texture2D( map, uv + duv * 0.6 ).a );
  float e3 = 1.0 - smoothstep( uAlphaTest * 0.3, uAlphaTest * 1.2, texture2D( map, uv + duv * 1.4 ).a );
  return ( 0.4 * e1 + 0.25 * e2 + 0.35 * e3 ) * back * smoothstep( 0.05, 0.4, sl );
}
vec2 cellUv( vec2 uv ) {
#ifdef CARD_ATLAS
  return vCell.xy + uv * vCell.zw;
#else
  return uv;
#endif
}

void main() {
  vec2 uv = cellUv( vUv );
  vec4 tex = texture2D( map, uv );
  if ( tex.a < uAlphaTest ) discard;
  vec3 albedo = tex.rgb;

  // ---- FORM: a soft bulge from the blurred alpha (two scales), gradients by central differences
  vec2 dS = vec2( uFormTexel.x, 0.0 ), dT = vec2( 0.0, uFormTexel.y );
  dS *= 1.5; dT *= 1.5;
  float hS = texture2D( tFormS, uv ).a, hL = texture2D( tFormL, uv ).a;
  float gSx = texture2D( tFormS, uv + dS ).a - texture2D( tFormS, uv - dS ).a;
  float gSy = texture2D( tFormS, uv + dT ).a - texture2D( tFormS, uv - dT ).a;
  float gLx = texture2D( tFormL, uv + dS ).a - texture2D( tFormL, uv - dS ).a;
  float gLy = texture2D( tFormL, uv + dT ).a - texture2D( tFormL, uv - dT ).a;
  // in units of each blur's own sigma (S: ~2.5 form texels, L: ~11): a blurred step has slope ~0.4 per sigma
  float bigK = smoothstep( 0.22, 0.6, hL );
  vec2 g = vec2( gSx, gSy ) * ( uSigma.x / 3.0 ) * 2.2 + vec2( gLx, gLy ) * ( uSigma.y / 3.0 ) * 2.9 * bigK;
  vec3 nC = normalize( vec3( - g * uForm, 1.0 ) );                  // card space: x right, y up, z toward the lens
  vec3 fw = gl_FrontFacing ? vFwd : - vFwd;
  vec3 nW = normalize( vRight * nC.x + vUpW * nC.y + fw * nC.z );
  vec3 nV = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
  float h = clamp( 0.55 * hL + 0.45 * hS, 0.0, 1.0 );

  // ---- sun visibility (bent round the bulge, nudged toward the sun)
  vec3 sunW = normalize( ( vec4( uSunDirV, 0.0 ) * viewMatrix ).xyz );
  vec3 wpv = vWorld + fw * ( h * uBulge ) + sunW * 0.02;
  float vis = cardVis( wpv );

  vec3 geoPos = vViewPos;
  vec3 key = vec3( 0.0 ), fill = vec3( 0.0 ), rimC = vec3( 0.0 );
  float keyRef = 0.0; vec3 refCol = vec3( 1.0 );
  vec2 dU = dFdx( uv ), dV = dFdy( uv );
  float rimW = uRimPx * uPxK;

#if NUM_DIR_LIGHTS > 0
  for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
    DirectionalLight dl = directionalLights[ i ];
    float isSun = step( 0.9995, dot( dl.direction, uSunDirV ) );
    float v = mix( 1.0, vis, isSun );
    key += dl.color * wrapResp( dot( nV, dl.direction ) ) * v;
    if ( lum3( dl.color ) > keyRef ) { keyRef = lum3( dl.color ); refCol = dl.color; }
    rimC += dl.color * v * ( 0.4 + 0.6 * isSun ) * rimEdge( dl.direction, uv, dU, dV, rimW );
  }
#endif
  // practical lights: three's own falloff + cone, the brightest one also rims the card
  float bestL = 0.0; vec3 bestDir = vec3( 0.0, 0.0, 1.0 ), bestCol = vec3( 0.0 );
#if NUM_POINT_LIGHTS > 0
  for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
    PointLight pl = pointLights[ i ];
    vec3 lv = pl.position - geoPos; float ld = length( lv ); lv /= max( ld, 1e-4 );
    vec3 c = pl.color * getDistanceAttenuation( ld, pl.distance, pl.decay );
    key += c * wrapResp( dot( nV, lv ) );
    float lc = lum3( c ); if ( lc > keyRef ) { keyRef = lc; refCol = c; }
    if ( lc > bestL ) { bestL = lc; bestDir = lv; bestCol = c; }
  }
#endif
#if NUM_SPOT_LIGHTS > 0
  for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
    SpotLight sl = spotLights[ i ];
    vec3 lv = sl.position - geoPos; float ld = length( lv ); lv /= max( ld, 1e-4 );
    float cone = getSpotAttenuation( sl.coneCos, sl.penumbraCos, dot( lv, sl.direction ) );
    vec3 c = sl.color * getDistanceAttenuation( ld, sl.distance, sl.decay ) * cone;
    key += c * wrapResp( dot( nV, lv ) );
    float lc = lum3( c ); if ( lc > keyRef ) { keyRef = lc; refCol = c; }
    if ( lc > bestL ) { bestL = lc; bestDir = lv; bestCol = c; }
  }
#endif
  if ( bestL > 0.0 ) rimC += bestCol * rimEdge( bestDir, uv, dU, dV, rimW );
#if NUM_HEMI_LIGHTS > 0
  for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) fill += getHemisphereLightIrradiance( hemisphereLights[ i ], nV );
#endif
  fill += ambientLightColor;
  // the local probe: sky + bounce (radiance SH -> irradiance)
  fill += max( shGetIrradianceAt( nW, uSH ), vec3( 0.0 ) );
  float above = vWorld.y - uGroundY;
  float gao = 1.0 - uGroundAO * ( 1.0 - smoothstep( 0.0, 0.32, above ) );
  // the cartoon keeps its own colours in shade: the fill's tint (blue sky) is only partly applied; key lights keep theirs
  fill = mix( vec3( lum3( fill ) ), fill, uTintK );
  vec3 light = ( key * uKeyK * RECIPROCAL_PI + fill * RECIPROCAL_PI * gao ) * uGain;
  // FACE-TINT CAP (round 2, LOOK + lead: faces took the room colour: red in the hall, orange on the steam deck): the summed
  // light on a card keeps only half its colour; a face may lean toward the room but stays a face colour
  light = mix( vec3( lum3( light ) ), light, 0.5 );

  // ---- exposure guard: floor + ceiling relative to the strongest light's unoccluded key. The floor rises when that light
  // is behind the card (backlight: a readable front) and is ADDED in the key light's own colour (a warm reflector fill,
  // not a grey lift)
  float ref = keyRef * uKeyK * RECIPROCAL_PI * uGain;
  float L = max( lum3( light ), 1e-5 );
  float backK = smoothstep( 0.2, -0.6, uSunDirV.z );
  float lo = mix( uFloorK, uFloorBack, backK ) * ref, hi = uCeilK * ref;
  if ( ref > 0.0 ) {
    float Lf = 0.5 * ( L + lo + sqrt( ( L - lo ) * ( L - lo ) + 0.09 * lo * lo ) );   // smooth max( L, lo )
    light += ( refCol / max( lum3( refCol ), 1e-5 ) ) * mix( vec3( 1.0 ), vec3( 0.9, 0.95, 1.08 ), 0.0 ) * ( Lf - L );
    L = Lf;
    float Lg = L > hi ? hi + ( L - hi ) * 0.25 : L;
    light *= Lg / L; L = Lg;
  }
  float Lg = L;
  float shade = ref > 0.0 ? clamp( 1.0 - Lg / ( ref * 0.95 ), 0.0, 1.0 ) : 0.0;

  vec3 col = albedo * light;
  // shade keeps its colour: a cartoon shadow is a deeper hue, not grey
  float lc = lum3( col );
  col = max( mix( vec3( lc ), col, 1.0 + uShadeSat * shade ), 0.0 );
  // ---- ink: the outline takes the light at a dark albedo (sits in the scene, keeps the cartoon read)
  float inkD = distance( pow( max( albedo, 0.0 ), vec3( 1.0 / 2.2 ) ), uInk );
  float ink = 1.0 - smoothstep( 0.05, 0.13, inkD );
  col = mix( col, light * uInkK * vec3( 1.0, 0.92, 0.95 ), ink );
  // ---- rim (crisp, warm, on the lit contour)
  col += rimC * uRim * uGain * RECIPROCAL_PI * 0.9;

  if ( uDbg > 0.5 && uDbg < 1.5 ) col = vec3( vis, 1.0 - vis, 0.0 );
  if ( uDbg > 1.5 && uDbg < 2.5 ) col = nW * 0.5 + 0.5;
  if ( uDbg > 2.5 && uDbg < 3.5 ) col = light;
  if ( uDbg > 3.5 && uDbg < 4.5 ) col = vec3( h );
  if ( uDbg > 4.5 && uDbg < 5.5 ) col = key * uKeyK * RECIPROCAL_PI * uGain;
  if ( uDbg > 5.5 ) col = fill * RECIPROCAL_PI * uGain * gao;
  gl_FragColor = vec4( col, 1.0 );
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor * uFogK );
#endif
}`;

export type CardMatU = {
  map: { value: THREE.Texture | null }; tFormS: { value: THREE.Texture | null }; tFormL: { value: THREE.Texture | null }; uFormTexel: { value: THREE.Vector2 }; uSigma: { value: THREE.Vector2 };
  uSH: { value: THREE.Vector3[] }; uGroundY: { value: number }; uDbg: { value: number }; uAlphaTest: { value: number };
  [k: string]: { value: unknown };
};

type VisSrc = { tVis: { value: THREE.Texture | null }; visMat: { value: THREE.Matrix4 }; visOn: { value: number }; visK: { value: number }; visSize: { value: THREE.Vector2 }; visBias: { value: number } };
const visViews = (cl: CardLight, far: boolean) => {
  const sel = { far };
  const src = (): VisSrc => (sel.far ? cl.UF : cl.U);
  const view = <K extends keyof VisSrc>(k: K) => ({ get value() { return src()[k].value; }, set value(_v) { /* read-only view */ } });
  return { tVis: view("tVis"), visMat: view("visMat"), visOn: view("visOn"), visK: view("visK"), visSize: view("visSize"), visBias: view("visBias"), _visSel: { value: sel } };
};
/** a card material: shared light uniforms (by reference) + this card's own textures / probe / look */
export const makeCardMaterial = (cl: CardLight, o: { atlas?: boolean; far?: boolean; look?: Partial<CardLook> } = {}) => {
  const look = { ...cl.look, ...(o.look ?? {}) };
  const base = THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog]);
  const own: CardMatU = {
    map: { value: null }, tFormS: { value: null }, tFormL: { value: null }, uFormTexel: { value: new THREE.Vector2(1 / 128, 1 / 200) }, uSigma: { value: new THREE.Vector2(2.5, 11) },
    uSH: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) }, uGroundY: { value: 0 }, uDbg: { value: cl.dbg }, uAlphaTest: { value: 0.5 },
    // live views of the near (private map) or far (scene sun map) source, read by three at draw time: the private pass
    // renders inside the scene render, after the cards' update ran (cl.applyVis(U, far) picks the source)
    ...visViews(cl, o.far ?? false),
    uSunDirV: cl.U.uSunDirV, uSeed: cl.U.uSeed, uPxK: cl.U.uPxK, uInk: { value: new THREE.Vector3(INK_SRGB.r, INK_SRGB.g, INK_SRGB.b) },
    uGain: { value: look.gain }, uKeyK: { value: look.keyK }, uForm: { value: look.form }, uWrap: { value: look.wrap }, uFloorK: { value: look.floorK }, uFloorBack: { value: look.floorBackK },
    uCeilK: { value: look.ceilK }, uRim: { value: look.rim }, uRimPx: { value: look.rimPx }, uInkK: { value: look.inkK }, uShadeSat: { value: look.shadeSat },
    uFogK: { value: look.fogK }, uTintK: { value: look.tintK }, uBulge: { value: look.bulgeM }, uGroundAO: { value: look.groundAO },
  };
  const m = new THREE.ShaderMaterial({ uniforms: { ...base, ...own }, vertexShader: VERT, fragmentShader: FRAG, lights: true, fog: true, side: THREE.DoubleSide,
    defines: o.atlas ? { CARD_ATLAS: "" } : {} });
  m.extensions = { clipCullDistance: false, multiDraw: false };
  return { m, U: own };
};

// ================================================================ the service
const REG = new WeakMap<THREE.Scene, CardLight>();
type Probe = { sh: Float32Array };

export class CardLight {
  ctx: KitCtx;
  look: CardLook;
  dbg = 0;
  /** shared uniforms for near cards (private map) */
  U = { tVis: { value: null as THREE.Texture | null }, visMat: { value: new THREE.Matrix4() }, visOn: { value: 0 }, visK: { value: 10 }, visSize: { value: new THREE.Vector2(2048, 2048) },
    visBias: { value: 0.0003 }, uSunDirV: { value: new THREE.Vector3(0, 1, 0) }, uSeed: { value: 0 }, uPxK: { value: 1 } };
  /** shared uniforms for far cards (the scene sun's own map) */
  UF = { tVis: { value: null as THREE.Texture | null }, visMat: { value: new THREE.Matrix4() }, visOn: { value: 0 }, visK: { value: 6 }, visSize: { value: new THREE.Vector2(4096, 4096) },
    visBias: { value: 0.0004 } };
  private light: THREE.DirectionalLight;
  private regs: CardReg[] = [];
  private probes = new Map<string, Probe>();
  private cell: number; private probeRes: number; private sunDiam: number;
  source: "private" | "sunCard"; probeMode: "capture" | "rig";
  private capRT: THREE.WebGLRenderTarget | null = null; private capCam = new THREE.PerspectiveCamera(90, 1, 0.03, 600);
  /** shadow-casting lights of the scene (for proxies), rescanned every 30 updates */
  shadowLights: THREE.Light[] = [];
  private scanN = 0;
  /** last measured cost of the visibility pass (ms, gl.finish based) and the probe captures */
  costVisMs = 0; costProbeMs = 0; probeCount = 0;
  measure = false;
  /** testing: skip the private pass (the cards keep the last map) */
  skipVis = false;
  private pendingCam: THREE.Camera | null = null;
  private instCasters: THREE.InstancedMesh[] | null = null; private instScanN = 0;
  private hook: THREE.Mesh;

  static of(ctx: KitCtx, o: CardLightOpts = {}): CardLight {
    let c = REG.get(ctx.scene);
    if (!c) { c = new CardLight(ctx, o); REG.set(ctx.scene, c); }
    return c;
  }
  constructor(ctx: KitCtx, o: CardLightOpts) {
    this.ctx = ctx;
    this.look = { ...DEFAULT_LOOK, ...(o.look ?? {}) };
    const size = o.mapSize ?? (ctx.quality === "draft" ? 1024 : 2048);
    this.source = o.source ?? "private";
    this.probeMode = o.probe ?? (ctx.quality === "draft" && ctx.rig?.ambient ? "rig" : "capture");
    this.cell = o.probeCell ?? 1.5; this.probeRes = o.probeRes ?? 16; this.sunDiam = ((o.sunDiamDeg ?? 0.5) * Math.PI) / 180;
    const L = new THREE.DirectionalLight(0xffffff, 0);
    L.castShadow = true; L.shadow.mapSize.set(size, size);
    L.shadow.bias = 0; L.shadow.normalBias = 0;
    L.name = "cardVisLight";
    this.light = L;
    this.U.visSize.value.set(size, size);
    // the hook: an empty draw sorted first in the opaque list; it renders the private pass inside the scene's own render
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    this.hook = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    this.hook.frustumCulled = false; this.hook.renderOrder = -1e9; this.hook.castShadow = false; this.hook.name = "cardVisHook";
    this.hook.onBeforeRender = () => this.renderVis();
    ctx.scene.add(this.hook);
    this.regs.push({ pos: () => [0, 0, 0], heightM: 0, near: () => false, hide: [this.hook] });
    ctx.onUpdate((t, cam) => this.update(t, cam));
  }
  register(r: CardReg) { this.regs.push(r); }
  /** copy the near (private map) or far (scene sun map) visibility source into a card material's own uniforms */
  applyVis(U: CardMatU, far: boolean) { (U._visSel.value as { far: boolean }).far = far; }
  /** the scene's shadow-casting lights (rescanned every 30 calls; the first call scans) */
  lights(): THREE.Light[] { if (this.scanN++ % 30 === 0) this.scanLights(); return this.shadowLights; }
  /** the camera of the private pass (proxies compare against it to skip themselves) */
  get visCamera(): THREE.Camera { return this.light.shadow.camera; }

  /** the scene's sun direction (world, toward the sun) */
  sunDirW(out = new THREE.Vector3()): THREE.Vector3 | null {
    const s = this.ctx.sun;
    if (!s || !s.visible || s.intensity <= 0) return null;
    s.updateMatrixWorld(); s.target.updateMatrixWorld();
    return out.setFromMatrixPosition(s.matrixWorld).sub(TMP2.setFromMatrixPosition(s.target.matrixWorld)).normalize();
  }

  private scanLights() {
    const out: THREE.Light[] = [];
    this.ctx.scene.traverse((o) => { const l = o as THREE.Light; if ((l as THREE.DirectionalLight).isDirectionalLight || (l as THREE.SpotLight).isSpotLight || (l as THREE.PointLight).isPointLight) { if (l.castShadow && l !== this.light && l !== this.ctx.sunCard) out.push(l); } });
    this.shadowLights = out;
  }

  /** per sub-frame: the probe cells the cards need, then the character-free visibility map */
  update(t: number, cam: THREE.Camera) {
    const gl = this.ctx.gl;
    this.lights();
    this.U.uSeed.value = (Math.round(t * 30 * 8) * 7) % 61;
    const sz = gl.getDrawingBufferSize(new THREE.Vector2());
    this.U.uPxK.value = sz.y / 1920;
    cam.updateMatrixWorld();
    const view = (cam as THREE.PerspectiveCamera).matrixWorldInverse;
    const L = this.sunDirW(TMP);
    if (L) this.U.uSunDirV.value.copy(L).transformDirection(view);
    else this.U.uSunDirV.value.set(0, -1, 0);
    // far cards: the scene sun's own map (exists after the first render)
    // far cards: CORE's character-free card light when it exists (its map holds no proxies), else the scene sun's map
    const sc0 = this.ctx.sunCard, s = sc0 && sc0.castShadow && sc0.shadow.map ? sc0 : this.ctx.sun;
    if (s && s.castShadow && s.shadow.map && L) {
      const sc = s.shadow.camera as THREE.OrthographicCamera;
      this.UF.tVis.value = s.shadow.map.texture; this.UF.visMat.value.copy(s.shadow.matrix); this.UF.visOn.value = 1;
      this.UF.visSize.value.set(s.shadow.mapSize.x, s.shadow.mapSize.y);
      const texM = (sc.right - sc.left) / s.shadow.mapSize.x;
      this.UF.visK.value = ((sc.far - sc.near) * this.sunDiam) / texM;
      this.UF.visBias.value = 0.04 / (sc.far - sc.near);
    } else this.UF.visOn.value = 0;
    if (!L) { this.U.visOn.value = 0; return; }
    if (this.source === "sunCard" && sc0 && sc0.shadow.map) {
      // near cards share CORE's card map: no private pass at all
      this.U.tVis.value = this.UF.tVis.value; this.U.visMat.value.copy(this.UF.visMat.value); this.U.visOn.value = this.UF.visOn.value;
      this.U.visK.value = this.UF.visK.value; this.U.visSize.value.copy(this.UF.visSize.value); this.U.visBias.value = this.UF.visBias.value;
      return;
    }
    // ---- fit the private ortho frustum round the near cards at this time
    const near = this.regs.filter((r) => r.near());
    if (!near.length) { this.U.visOn.value = 0; return; }
    const ctr = new THREE.Vector3(); let n = 0;
    for (const r of near) { const p = r.pos(t); ctr.x += p[0]; ctr.y += p[1] + r.heightM * 0.5; ctr.z += p[2]; n++; }
    ctr.multiplyScalar(1 / n);
    let R = 0;
    for (const r of near) { const p = r.pos(t); R = Math.max(R, Math.hypot(p[0] - ctr.x, p[1] + r.heightM * 0.5 - ctr.y, p[2] - ctr.z) + r.heightM * 0.62); }
    R = Math.max(2.2, R + 0.35);
    if ((globalThis as { __CARDVIS?: boolean }).__CARDVIS) console.warn(`CARDVIS ${Math.round(t * 30 * 8) / 8} n=${near.length}/${this.regs.length} R=${R.toFixed(2)} ctr=${ctr.toArray().map((v) => v.toFixed(2))} src=${this.source}`);
    const size = this.light.shadow.mapSize.x, texM = (2 * R) / size;
    // snap the centre to the texel grid in light space (no swimming between sub-frames)
    const up = Math.abs(L.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const ax = new THREE.Vector3().crossVectors(up, L).normalize(), ay = new THREE.Vector3().crossVectors(L, ax).normalize();
    const cx = Math.round(ctr.dot(ax) / texM) * texM, cy = Math.round(ctr.dot(ay) / texM) * texM, cz = ctr.dot(L);
    ctr.copy(ax).multiplyScalar(cx).addScaledVector(ay, cy).addScaledVector(L, cz);
    const D = 70;
    const lt = this.light, oc = lt.shadow.camera as THREE.OrthographicCamera;
    lt.position.copy(ctr).addScaledVector(L, D); lt.target.position.copy(ctr);
    lt.updateMatrixWorld(); lt.target.updateMatrixWorld();
    oc.left = -R; oc.right = R; oc.top = R; oc.bottom = -R; oc.near = 0.5; oc.far = D + 8; oc.updateProjectionMatrix();
    this.U.visK.value = ((oc.far - oc.near) * this.sunDiam) / texM;
    this.U.visBias.value = 0.025 / (oc.far - oc.near);
    // ---- rendered by the hook mesh at the start of the next scene render (three's shadow pass needs a live render state)
    this.pendingCam = cam;
  }
  /** the private pass: three's own WebGLShadowMap with our light only (wind, alpha-tested leaves, every caster's real depth
   *  material); called from the hook mesh's onBeforeRender, the first opaque draw of the next render of the scene */
  private renderVis() {
    const cam = this.pendingCam;
    if (!cam || (this.skipVis && this.U.tVis.value)) { this.pendingCam = null; return; }
    this.pendingCam = null;
    const gl = this.ctx.gl, lt = this.light;
    const t0 = this.measure ? (gl.getContext().finish(), performance.now()) : 0;
    // (round 2, the v23 "pale card" at f1209 / v20 strobing: three culls an InstancedMesh caster by a bounding sphere it
    // computes ONCE, at its first render; the streaming world (trees, stakes: instances moved every frame) then left that
    // stale sphere and the whole mesh dropped out of this pass at once, mid-shot (a still computes it fresh: no step).
    // Every instanced caster gets its sphere recomputed for this pass)
    if (!this.instCasters || this.instScanN++ % 30 === 0) { const L: THREE.InstancedMesh[] = []; this.ctx.scene.traverse((o) => { const m = o as THREE.InstancedMesh; if (m.isInstancedMesh && m.castShadow) L.push(m); }); this.instCasters = L; }
    for (const m of this.instCasters) if (m.visible) m.computeBoundingSphere();
    const sm = gl.shadowMap, nu = sm.needsUpdate;
    sm.needsUpdate = true;
    sm.render([lt], this.ctx.scene, cam);
    if ((globalThis as { __CARDVIS?: boolean }).__CARDVIS) {   // TEST ONLY (round 2 pale-card hunt): the casters this pass saw
      const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(lt.shadow.camera.projectionMatrix, lt.shadow.camera.matrixWorldInverse));
      const names: string[] = [];
      this.ctx.scene.traverseVisible((o) => { const m = o as THREE.Mesh; if (!m.isMesh || !m.castShadow || !m.geometry) return; if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); const bs = m.geometry.boundingSphere!.clone().applyMatrix4(m.matrixWorld); if (m.frustumCulled === false || fr.intersectsSphere(bs)) names.push((m.name || m.parent?.name || "?") + "@" + bs.center.toArray().map((v) => v.toFixed(1)).join(",")); });
      const key = names.sort().join("|"); const G = globalThis as { __CARDVISK?: string };
      if (key !== G.__CARDVISK) { const prev = new Set((G.__CARDVISK ?? "").split("|")), now = new Set(names); console.warn("CARDVISC +" + names.filter((n) => !prev.has(n)).join(" ") + " -" + [...prev].filter((n) => !now.has(n)).join(" ")); G.__CARDVISK = key; }
    }
    sm.needsUpdate = nu;
    if (this.measure) { gl.getContext().finish(); this.costVisMs = performance.now() - t0; }
    this.U.tVis.value = lt.shadow.map ? lt.shadow.map.texture : null;
    this.U.visMat.value.copy(lt.shadow.matrix);
    this.U.visOn.value = this.U.tVis.value ? 1 : 0;
  }

  // ---------------------------------------------------------------- the local GI probe (L2 SH), bilinear over cells
  /** radiance SH (9 x RGB) at a ground point: interpolated between the four surrounding cells, captured lazily */
  probeAt(p: V3, out: THREE.Vector3[], yUp = 1.05) {
    if (this.probeMode === "rig") { this.rigProbe(out); return; }
    const c = this.cell, fx = p[0] / c, fz = p[2] / c, x0 = Math.floor(fx), z0 = Math.floor(fz), ux = fx - x0, uz = fz - z0;
    for (const v of out) v.set(0, 0, 0);
    const add = (ix: number, iz: number, w: number) => {
      if (w <= 1e-4) return;
      const pr = this.cellProbe(ix, iz, p[1] + yUp);
      for (let j = 0; j < 9; j++) out[j].x += pr.sh[j * 3] * w, out[j].y += pr.sh[j * 3 + 1] * w, out[j].z += pr.sh[j * 3 + 2] * w;
    };
    add(x0, z0, (1 - ux) * (1 - uz)); add(x0 + 1, z0, ux * (1 - uz)); add(x0, z0 + 1, (1 - ux) * uz); add(x0 + 1, z0 + 1, ux * uz);
  }
  /** CORE's rig terms as a two-tone sky: radiance ambient / PI above (E_up = ambient), 2 x bounce / PI below (a vertical
   *  surface gets E = bounce from the ground) */
  private rigSH: Float32Array | null = null; private rigKey = "";
  rigProbe(out: THREE.Vector3[]) {
    const a = this.ctx.rig?.ambient, b = this.ctx.rig?.bounce;
    const k = `${a?.getHexString()}|${b?.getHexString()}|${a?.r}|${b?.r}`;
    if (!this.rigSH || k !== this.rigKey) {
      this.rigKey = k;
      const up = a ? a.clone().multiplyScalar(1 / Math.PI) : new THREE.Color(0.25, 0.28, 0.33), dn = b ? b.clone().multiplyScalar(2 / Math.PI) : new THREE.Color(0.12, 0.1, 0.08);
      const sh = new THREE.SphericalHarmonics3(), basis = new Array(9).fill(0), d = new THREE.Vector3(); let W = 0;
      for (let i = 0; i < 400; i++) {
        const z = 1 - (2 * (i + 0.5)) / 400, r = Math.sqrt(1 - z * z), ph = i * 2.39996;
        d.set(r * Math.cos(ph), z, r * Math.sin(ph));
        const c = z > 0 ? up : dn;
        THREE.SphericalHarmonics3.getBasisAt(d, basis);
        for (let j = 0; j < 9; j++) { sh.coefficients[j].x += basis[j] * c.r; sh.coefficients[j].y += basis[j] * c.g; sh.coefficients[j].z += basis[j] * c.b; }
        W++;
      }
      const n = (4 * Math.PI) / W; this.rigSH = new Float32Array(27);
      for (let j = 0; j < 9; j++) { this.rigSH[j * 3] = sh.coefficients[j].x * n; this.rigSH[j * 3 + 1] = sh.coefficients[j].y * n; this.rigSH[j * 3 + 2] = sh.coefficients[j].z * n; }
    }
    for (let j = 0; j < 9; j++) out[j].set(this.rigSH[j * 3], this.rigSH[j * 3 + 1], this.rigSH[j * 3 + 2]);
  }
  private cellProbe(ix: number, iz: number, y: number): Probe {
    const k = `${ix},${iz},${y.toFixed(1)}`;
    let pr = this.probes.get(k);
    if (!pr) { pr = { sh: this.capture(new THREE.Vector3(ix * this.cell, y, iz * this.cell)) }; this.probes.set(k, pr); }
    return pr;
  }
  /** 6 x 90-degree renders of the set (cards hidden, wind frozen) -> radiance SH */
  capture(at: THREE.Vector3): Float32Array {
    const gl = this.ctx.gl, scene = this.ctx.scene, N = this.probeRes;
    const t0 = performance.now();
    if (!this.capRT) this.capRT = new THREE.WebGLRenderTarget(N, N, { type: THREE.HalfFloatType, depthBuffer: true });
    const hidden: THREE.Object3D[] = [];
    for (const r of this.regs) for (const o of r.hide) if (o.visible) { o.visible = false; hidden.push(o); }
    // cheap: hide dense non-casting instanced clutter (grass blades, flowers); the ground under them still shows
    // and every point sprite / additive glow (dust motes sized for the full-res lens would flood a 16 px face)
    scene.traverse((o) => {
      if (!o.visible) return;
      const im = o as THREE.InstancedMesh, mt = (o as THREE.Mesh).material as THREE.Material | undefined;
      const add = mt && !Array.isArray(mt) && (mt.blending === THREE.AdditiveBlending || (mt.transparent && !mt.depthWrite && mt.blending !== THREE.CustomBlending));
      if ((im.isInstancedMesh && !im.castShadow && im.count > 2000) || (o as THREE.Points).isPoints || add) { o.visible = false; hidden.push(o); }
    });
    const prevRT = gl.getRenderTarget(), sm = gl.shadowMap, au = sm.autoUpdate, nu = sm.needsUpdate, wt = this.ctx.windT.value;
    const prevTone = gl.toneMapping;
    gl.toneMapping = THREE.NoToneMapping;
    this.ctx.windT.value = 0;
    sm.autoUpdate = false; sm.needsUpdate = true;
    const cam = this.capCam, buf = new Uint16Array(N * N * 4);
    const sh = new THREE.SphericalHarmonics3(), basis = new Array(9).fill(0), dir = new THREE.Vector3(), col = new THREE.Color();
    let totalW = 0;
    const faces: [V3, V3][] = [[[1, 0, 0], [0, 1, 0]], [[-1, 0, 0], [0, 1, 0]], [[0, 1, 0], [0, 0, -1]], [[0, -1, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, 1, 0]]];
    const R = new THREE.Vector3(), U = new THREE.Vector3(), F = new THREE.Vector3();
    for (const [fw, upv] of faces) {
      cam.position.copy(at); cam.up.set(...upv); cam.lookAt(at.x + fw[0], at.y + fw[1], at.z + fw[2]); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      gl.setRenderTarget(this.capRT); gl.clear(); gl.render(scene, cam);
      gl.readRenderTargetPixels(this.capRT, 0, 0, N, N, buf);
      R.setFromMatrixColumn(cam.matrixWorld, 0); U.setFromMatrixColumn(cam.matrixWorld, 1); F.setFromMatrixColumn(cam.matrixWorld, 2).negate();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4, px = -1 + ((x + 0.5) * 2) / N, py = -1 + ((y + 0.5) * 2) / N;
        dir.copy(F).addScaledVector(R, px).addScaledVector(U, py);
        const l2 = dir.lengthSq(), w = 4 / (Math.sqrt(l2) * l2);
        dir.normalize();
        const cl = (v: number) => Math.min(6, Math.max(0, THREE.DataUtils.fromHalfFloat(v)));
        col.setRGB(cl(buf[i]), cl(buf[i + 1]), cl(buf[i + 2]));
        THREE.SphericalHarmonics3.getBasisAt(dir, basis);
        for (let j = 0; j < 9; j++) { sh.coefficients[j].x += basis[j] * col.r * w; sh.coefficients[j].y += basis[j] * col.g * w; sh.coefficients[j].z += basis[j] * col.b * w; }
        totalW += w;
      }
    }
    const norm = (4 * Math.PI) / totalW, outA = new Float32Array(27);
    for (let j = 0; j < 9; j++) { outA[j * 3] = sh.coefficients[j].x * norm; outA[j * 3 + 1] = sh.coefficients[j].y * norm; outA[j * 3 + 2] = sh.coefficients[j].z * norm; }
    gl.setRenderTarget(prevRT);
    gl.toneMapping = prevTone;
    sm.autoUpdate = au; sm.needsUpdate = nu || true;
    this.ctx.windT.value = wt;
    for (const o of hidden) o.visible = true;
    this.costProbeMs += performance.now() - t0; this.probeCount++;
    return outA;
  }
}

/** key light of a card for its proxies / rim: world positions, for tests */
export const lightWorldPos = (l: THREE.Light, out = new THREE.Vector3()) => out.setFromMatrixPosition(l.matrixWorld);
export { TMP as _tmpV };

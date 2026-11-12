// Character card shading (lighting.md 9.2 / 9.5). Replaces the flat emissive "pasted-on" look: the card takes the
// scene light colour as a tint, keeps a bright floor where a cast shadow falls on it (charShade ~.86), and gets a soft
// side gradient toward the real sun (head ~charGrad, torso ~bodyGrad) with a lavender far side.
// Contract with WORLD: LFB (sun shadow visibility inside three's light loop) and CHAR (uniforms world.ts updates from
// LIGHTS every frame) come from shade.ts; the sun direction is three's own directional light 0.
// The drawing already carries a painted crescent (toon.ts shadedFill / gradFill), so the shader adds GRAD_K of the
// preset gradient, and the preset tint (measured on WHITE heads) is applied at TINT_K so peach skin stays clean
// (lighting.md 9.1 note: golden ~[1, .88, .76], day ~[1, .97, .96] for peach skin). antitheft: a pale key-side rim in
// every light (warm in low sun / lamp light), see the USE_MAP block.
import * as THREE from "three";
import { LFB, CHAR } from "./shade";

export const GRAD_K = 5.5;   // head: preset charGrad x5.5, capped at .4 linear: ~14 % on screen after the grade /
                             // tone-map highlight roll-off (faces sit at ~.96 there; review round 2)
export const GRAD_KB = 1.6;  // torso: preset bodyGrad x1.6 -> ~10-15 % form shade on screen (review round 3)
export const TINT_K = 0.55;

// Card zones in UV (v = 1 at the top of the 600 x 1000 design card): adult chin at y ~420 -> v .58, head centre
// y ~309 -> v .69, head half height ~111 -> .11. Head half width ~118 units -> .2 of the card, torso ~89 -> .15.
const CARD = /* glsl */ `
// warmth of the scene light (blue channel of the tint down = warm): low sun, sunset, lamp light
float warm = smoothstep( 0.06, 0.26, 1.0 - uCharTint.b );
vec3 tintK = mix( vec3( 1.0 ), uCharTint, uTintK + ( uTintWarm - uTintK ) * warm );        // golden light: ~8 % toward #FCE3CC
tintK /= pow( max( dot( tintK, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.2 ), uNorm );             // same face value day and golden
vec3 outgoingLight = diffuseColor.rgb * tintK;
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                                          // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = sign( sunV.x + 1e-4 ) * mix( 0.6, 1.0, smoothstep( 0.0, 0.35, abs( sunV.x ) ) ); // a near-frontal / back sun still shades one side
  float head = smoothstep( 0.53, 0.56, vMapUv.y );                                        // head zone (adult chin ~v .54)
  float hw = mix( 0.15, 0.2, head );
  float uu = clamp( ( vMapUv.x - 0.5 ) / hw, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 ); // -1..1 screen left..right
  float t = uu * side;                                                                     // +1 = edge facing the sun
  float g = mix( uBodyGrad * uGradKB, min( uGrad * uGradK, 0.4 ), head );
  float dark = smoothstep( -0.2, 1.0, -t ) * uDarkK;                                         // far side: broad soft gradient, centre stays pale (A5: x uDarkK per light mode)
  // lavender far side (bible 4.1: 10-25 % darker, blue-violet): the preset side tint, squared, at full strength on
  // the far edge, plus an extra ~18 % lavender multiply (uFarK; less in warm light, where the gold tint carries it)
  vec3 lav = uSideTint * uSideTint * mix( vec3( 1.0 ), vec3( 0.86, 0.84, 0.97 ), uFarK * ( 1.0 - 0.5 * warm ) );
  vec3 sideK = mix( vec3( 1.0 ), lav, dark * mix( 0.75, 1.0, head ) );
  float top = 1.0 + 0.05 * clamp( ( vMapUv.y - 0.69 ) / 0.11, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.05 * smoothstep( 0.0, 0.9, t );
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * lift * uGain;
  // BACKLIT low sun (sunset, A2): faces sit darker and warmer against the bright sky (toward #E2B4A0, luma >= .75),
  // bodies a touch; the rim widens and runs over the top contours (below)
  outgoingLight *= mix( vec3( 1.0 ), mix( vec3( 0.95, 0.86, 0.84 ), vec3( 0.88, 0.74, 0.68 ), head ), uBack );
  // LAMP DUOTONE (night storeroom, A2): lavender on the side away from the lamp, a warm wash on the lamp side
  outgoingLight *= mix( vec3( 1.0 ), mix( vec3( 0.84, 0.76, 0.98 ), vec3( 1.1, 0.95, 0.78 ), smoothstep( -0.7, 0.8, t ) ), uDuo );
  #ifdef USE_MAP
  {
    // KEY-SIDE RIM in every light (bible 4.1 rim kind a/c): the outermost ~3 px (at 1080 wide) of any thick part of the
    // card (head, hat, hair, torso, skirt, held boards) on the edge that faces the key. No offset copy: we only test
    // whether the next pixels toward the key are outside the card; thin parts (stick limbs, straps) are skipped by
    // requiring the card to be solid ~16 design units inward. Pale cream by day / in cool light, orange-gold in warm
    // light (low sun, lamps): warmth is read from the scene tint (blue channel down = warm).
    // the rim sits on the OUTER part of the ink line (a pale "sticker" rim, bible 4.1 kind c): 3 px at 1080 by day
    // (#FFF3DC-ish), 6-7 px warm gold in low sun / lamp light (#FFC979)
    float sl = length( sunV.xy );
    vec2 d2 = normalize( vec2( sunV.x, 0.45 * sunV.y ) + vec2( 1e-4, 0.0 ) );              // biased sideways: a high sun still rims the key SIDE
    vec2 duv = mix( 3.4, 6.5, warm ) * uPx * ( d2.x * dFdx( vMapUv ) + d2.y * dFdy( vMapUv ) );
    float edge = step( texture2D( map, vMapUv + duv ).a, 0.5 );
    vec2 dirU = normalize( duv + vec2( 1e-9 ) );
    vec4 c1 = texture2D( map, vMapUv - dirU * vec2( 0.027, 0.016 ) );   // ~16 design units inward (past the ink line)
    float solid = step( 0.5, c1.a );
    float rim = edge * solid * smoothstep( 0.03, 0.25, sl ) * mix( 0.6, 1.0, sunVis );
    // A3: day rim #FFF4E0 (pale warm cream; it must read on the hat straw and the shirts), gold in warm light
    vec3 rimCol = mix( vec3( 1.0, 0.91, 0.76 ), vec3( 1.05, 0.66, 0.26 ), warm );
    outgoingLight += rimCol * rim * uRimK * ( 1.0 - uModeK ) * ( 1.0 + 0.6 * uBack + 0.4 * uDuo ); // (A4: a per-light mode brings its own rim below)
    if ( uBack > 0.0 ) {
      // backlight: a 5-6 px #FFB070 rim along every upward-facing contour (hat, hair, shoulders)
      vec2 dup = 5.5 * uPx * dFdy( vMapUv );
      float e2 = step( texture2D( map, vMapUv + dup ).a, 0.5 ) * step( 0.5, texture2D( map, vMapUv - normalize( dup + vec2( 1e-9 ) ) * vec2( 0.0, 0.016 ) ).a );
      outgoingLight = mix( outgoingLight, vec3( 1.0, 0.45, 0.12 ) * 1.25, e2 * uBack * 0.85 );
    }
  }
  #endif
  // A3 NIGHT INK: in the lamp-lit night room the plum ink lines take the scene light: ~60 % toward navy #1A1D40
  float inkK = 1.0 - smoothstep( 0.012, 0.04, dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) );
  outgoingLight = mix( outgoingLight, vec3( 0.010, 0.012, 0.051 ) * 1.6, 0.6 * inkK * uDuo );
}
#endif
// A3 BLUEPRINT: the diagram space lights the card nearly neutral (tint #F4F2FF), so the tourist orange and the red cap
// keep their own colours against the blue (lavender far side kept <= ~10 %)
outgoingLight = mix( outgoingLight, diffuseColor.rgb * vec3( 0.957, 0.949, 1.0 ) * ( 0.94 + 0.06 * smoothstep( -0.5, 0.5, vMapUv.x - 0.5 ) ), 0.82 * uFlat );
// A4 PER-LIGHT CARD GRADE (cast.ts: the 4th LX digit picks a mode, Actor.bind sets these): the face / body take the
// scene's colour on the key side (morning #FBEFD9, dusk #EBD3C6, sunset #EBC0AE), a lavender (blueprint: cool blue) far
// side reaches ~45 % across the head, and an explicit key-side rim (morning gold #FFC46E 5 px, dusk warm 3 px, sunset
// orange #FFB060 3.5 px, blueprint pale cyan 2.5 px), so the cards sit IN each light instead of on top of it
#if NUM_DIR_LIGHTS > 0
if ( uModeK > 0.0 ) {
  vec3 sunM = directionalLights[ 0 ].direction;
  float sideM = sign( sunM.x + 1e-4 );
  float zh = smoothstep( 0.53, 0.56, vMapUv.y );
  float uu2 = clamp( ( vMapUv.x - 0.5 ) / mix( 0.15, 0.2, zh ), -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 );
  float tM = uu2 * sideM;
  float inkM = 1.0 - smoothstep( 0.012, 0.04, dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ); // keep the ink lines dark
  vec3 keyMul = mix( uBodyMul, uFaceMul, zh );
  float farM = 1.0 - smoothstep( -1.0, -1.0 + 2.0 * uFarW, tM );
  vec3 farMul = mix( vec3( 1.0 ), uFarMul, farM * mix( 0.7, 1.0, zh ) );
  outgoingLight *= mix( vec3( 1.0 ), keyMul * farMul, uModeK * ( 1.0 - inkM ) );
  #ifdef USE_MAP
  {
    vec2 d2m = normalize( vec2( sunM.x, 0.45 * sunM.y ) + vec2( 1e-4, 0.0 ) );
    vec2 duvM = uRimW2 * uPx * ( d2m.x * dFdx( vMapUv ) + d2m.y * dFdy( vMapUv ) );
    float edgeM = step( texture2D( map, vMapUv + duvM ).a, 0.5 );
    vec2 dirM = normalize( duvM + vec2( 1e-9 ) );
    float solidM = step( 0.5, texture2D( map, vMapUv - dirM * vec2( 0.027, 0.016 ) ).a );
    outgoingLight = mix( outgoingLight, uRimCol2, edgeM * solidM * uModeK * 0.92 );
  }
  #endif
}
#endif
`;

const DECL = "#include <common>\nuniform vec3 uCharTint; uniform float uCharShade; uniform float uGrad; uniform float uBodyGrad; uniform vec3 uSideTint;"
  + " uniform float uGradK; uniform float uGradKB; uniform float uTintK; uniform float uTintWarm; uniform float uFarK; uniform float uNorm; uniform float uGain; uniform float uPx; uniform float uRimK;"
  + " uniform float uBack; uniform float uDuo; uniform float uFlat;"
  + " uniform float uModeK; uniform vec3 uFaceMul; uniform vec3 uBodyMul; uniform vec3 uFarMul; uniform float uFarW; uniform vec3 uRimCol2; uniform float uRimW2; uniform float uDarkK;";
/** card-only constants (not per light): gradient share, tint share (day / warm light), lavender far-side extra,
 *  overall gain (calibrated: faces ~.93 V) */
export const CARD_K = { uGradK: { value: GRAD_K }, uGradKB: { value: GRAD_KB }, uTintK: { value: TINT_K }, uTintWarm: { value: 0.9 }, uFarK: { value: 1.0 },
  uNorm: { value: 0.7 }, uGain: { value: 1.03 }, uPx: { value: 0.5 }, uRimK: { value: 1.0 } }; // uPx = render height / 1920 (set per draw in cast.ts)

/** MeshLambertMaterial -> lit card: no emissive, scene tint, bright floor, side gradient toward the sun. */
/** per-card light mode uniforms (each Actor owns its material): uBack = backlit low sun, uDuo = lamp duotone.
 *  cast.ts sets them per card from its draw key, so two dissolving shots never share one value */
type U1 = { value: number }; type U3 = { value: THREE.Vector3 };
export type CardU = { uBack: U1; uDuo: U1; uFlat: U1; uModeK: U1; uFaceMul: U3; uBodyMul: U3; uFarMul: U3; uFarW: U1; uRimCol2: U3; uRimW2: U1; uDarkK: U1 };
const v3 = (x: number, y: number, z: number) => ({ value: new THREE.Vector3(x, y, z) });
export const cardU = (m: THREE.Material): CardU => (m.userData.cardU ??= { uBack: { value: 0 }, uDuo: { value: 0 }, uFlat: { value: 0 },
  uModeK: { value: 0 }, uFaceMul: v3(1, 1, 1), uBodyMul: v3(1, 1, 1), uFarMul: v3(1, 1, 1), uFarW: { value: 0.45 }, uRimCol2: v3(1, 1, 1), uRimW2: { value: 3 }, uDarkK: { value: 1 } }) as CardU;
/** sRGB hex -> linear rgb */
const lin = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16), f = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
};
/** the screen colour a key-side face should read as -> the multiply on the pale face fill (#F8F3EE), share k */
const faceTo = (h: string, k: number): [number, number, number] => { const a = lin(h), s = lin("#f8f3ee"); return [0, 1, 2].map((i) => 1 + (Math.min(1.05, a[i] / s[i]) - 1) * k) as [number, number, number]; };
/** A4 per-light card modes (the 4th LX digit): 1 morning, 2 dusk, 3 sunset (backlit), 4 blueprint */
type Mode = { face: [number, number, number]; body: [number, number, number]; far: [number, number, number]; farW: number; rim: [number, number, number]; rimW: number; darkK?: number };
const MODES: Record<number, Mode> = {
  1: { face: [1.0, 0.995, 0.985], body: [1.0, 0.99, 0.97], far: [0.9, 0.88, 1.03], farW: 0.42, rim: lin("#ffc46e"), rimW: 5.2 }, // (measured: the morning grade already warms the face to ~#FBE4B5)
  // A5 P3 (dusk far side measured #8E7BD2, ~45 % darker and strongly violet): the base far-side darkening x0.5 and a
  // milder, greyer lavender (target ~#B6A4D8, <= 30 % under the lit #F5D6D9), the warm rim kept
  2: { face: [0.78, 0.72, 0.84], body: [0.95, 0.9, 0.92], far: [1.02, 1.0, 1.12], farW: 0.45, rim: lin("#ffb070"), rimW: 3.2, darkK: 0.5 },
  // A6 P3 (shot 13 faces read evenly front-lit cream): the camera-side face fill ~12 % toward violet (#C9898C class), a
  // bolder 4.6 px orange sun-side rim
  3: { face: [0.83, 0.66, 0.84], body: [0.95, 0.86, 0.88], far: [0.8, 0.74, 1.02], farW: 0.46, rim: lin("#ff9a3c"), rimW: 4.6 }, // (A5 measured: lit face ~#EBC0AE)
  4: { face: [1, 1, 1], body: [1, 1, 1], far: [0.86, 0.91, 1.0], farW: 0.4, rim: lin("#bff3ff"), rimW: 2.6 },
};
/** set a card's per-light mode uniforms (0 = off) */
export const setCardMode = (U: CardU, mode: number) => {
  const M = MODES[mode];
  U.uModeK.value = M ? 1 : 0;
  U.uDarkK.value = M?.darkK ?? 1;
  if (!M) return;
  U.uFaceMul.value.set(...M.face); U.uBodyMul.value.set(...M.body); U.uFarMul.value.set(...M.far); U.uFarW.value = M.farW;
  U.uRimCol2.value.set(...M.rim); U.uRimW2.value = M.rimW;
};
export function cardShade(m: THREE.MeshLambertMaterial) {
  m.emissive.set(0x000000); m.emissiveIntensity = 0; m.emissiveMap = null;
  const U = cardU(m);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CHAR, CARD_K, U);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;", CARD);
  };
  m.customProgramCacheKey = () => "card15";
  return m;
}

/** ground contact blob: multiplies what is already drawn (the ground); drawn after the ground and before the cards */
export const blobMaterial = (map: THREE.Texture) => new THREE.MeshBasicMaterial({
  map, transparent: false, depthWrite: false, fog: false, toneMapped: false,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide,
});

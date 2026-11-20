// Stylised two-tone lighting for every world material (lighting.md 9.2, world part): albedo x mix(shadeCol, litCol,
// sunTerm), sunTerm = real shadow-map visibility x a soft N.L terminator. The sun visibility is captured inside three's
// own light loop (LFB), so nothing is computed twice. Character cards (cardShade) live in the CHAR agent's file and
// can import LFB / CHAR from here; world.ts sets every uniform below once per frame from LIGHTS.
import * as THREE from "three";

export const TONE = {
  uLitCol: { value: new THREE.Vector3(1.5, 1.44, 1.32) }, uShadeCol: { value: new THREE.Vector3(0.6, 0.58, 0.86) },
  uShadeLift: { value: new THREE.Vector3() }, uLambert: { value: 0.35 }, uSideK: { value: 0.84 }, uTerm: { value: 0.2 },
  uBounce: { value: new THREE.Vector3() }, // warm bounce on shaded faces turned to the camera (golden only; day = 0)
  uSat: { value: 1 }, // world albedo saturation around its luminance (characters are not twoTone, so unaffected)
};
// ---------------- per-World light extras (WORLD-INT, round 2) ----------------
// world.ts copies only the TONE / CHAR fields above into the shared uniforms. These extras are written by a hook mesh
// that sets_int.ts adds to EVERY World (it renders first in each scene and copies that World's values in its
// onBeforeRender), so a cross-dissolve keeps each layer's own rim / wood shade / cloud shadow. Neutral = no effect.
//  - RIM: warm backlight sliver on the sun side of vertical faces (posts, frames, LED boxes, rails) when the sun is
//    ahead of the lens (morning / late / sunset). uRimCol linear rgb (0 = off).
//  - WOOD: dark warm albedo (brown wood: posts, sign frames, marker boards) gets its own shade + lift multipliers in
//    shadow, so low-sun lavender shade does not turn brown wood violet (bible: wood shadows stay warm brown).
//    uWoodK 0 = off. Classified in the shader: warm hue ((r-b)/r > ~.6) and albedo luminance < ~.2 (the red-tan
//    ground and the rust badland bands are brighter, sage / juniper / rail are not warm).
//  - CLOUD: a soft-edged cloud-shadow band in world xz: covered where trail < dot(p.xz, dir) < lead (uCloud = dir.x,
//    dir.z, lead, trail; uCloudW = edge width m), multiplied by uCloudTint (1 = off).
//  - FILL (round 5, A4 P2 dusk): an additive sky fill on lit AND shaded faces (albedo x uFill, linear rgb; 0 = off), so
//    a blue-hour ground reads rose-mauve in the key and violet in the shade instead of one saturated orange.
//  - RIM DISTANCE FADE (round 5, WORLD-EXT carry-over: a vertical streak on the far domes in shot 7): the rim fades
//    out between 60 and 120 m from the lens; a material built with twoTone(m, k, true) has no rim at all (NO_RIM).
export const TONE_X = {
  uRimCol: { value: new THREE.Vector3() }, uFill: { value: new THREE.Vector3() },
  uWoodShade: { value: new THREE.Vector3(1, 1, 1) }, uWoodLift: { value: new THREE.Vector3() }, uWoodK: { value: 0 },
  uCloud: { value: new THREE.Vector4(1, 0, -1e5, -1e5) }, uCloudW: { value: 1 }, uCloudTint: { value: new THREE.Vector3(1, 1, 1) },
  // fix r1 (saladoil WORLD-INT, A1 P1 pump room): POOL DOMINANCE. Where a warm practical pool is strong, the cool shade
  // and lift are divided by (1 + uPoolDom x pool luminance), so a lamp pool reads AMBER on a night-blue wall instead
  // of mixing into lavender. 0 = off (every set but the pump room)
  uPoolDom: { value: 0 },
};
/** character-card uniforms (lighting.md 9.2 cardShade); world.ts keeps them in sync with LIGHTS for cardshade.ts */
export const CHAR = {
  uCharTint: { value: new THREE.Vector3(1, 0.94, 0.92) }, uCharShade: { value: 0.86 }, uGrad: { value: 0.07 },
  uBodyGrad: { value: 0.2 }, uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
};

// directional light 0 = the sun = the only shadow caster (three sorts shadow-casting lights first). Only the
// UNROLLED index 0 compiles the shadow block, so sunVis is written once.
export const LFB = THREE.ShaderChunk.lights_fragment_begin
  .replace("directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
    "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]")
  .replace("vDirectionalShadowCoord[ i ] ) : 1.0;", "vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;");
if (!LFB.includes("directLight.color *= sunVis")) throw new Error("shade.ts: three lights_fragment_begin changed");

// ---------------- warm practical pools + key fall-off zones (WORLD-INT) ----------------
// The template's TWO_TONE drops every non-sun light, so interiors had no lamp / window pools. These are NOT three
// lights (no extra shadow maps, no light-loop cost): a few static world-space spheres evaluated inside TWO_TONE.
//  - POOL i: additive warm light around uPoolPos[i] (linear rgb uPoolCol[i] x (1 - d / range)^2 x wrapped N.L).
//  - ZONE j: a SPOT mask for the key. Inside uZone[j].w metres of uZonePos[j] (the lamp), the KEY (sun term) is
//    multiplied by a distance fade (1 at uZone.x, 0 at uZone.y) and a cone around uZoneDir[j].xyz (full inside
//    cos-angle uZone.z, gone outside cos-angle uZoneDir.w), so a "sun" that stands in for a desk lamp prints a lamp
//    POOL (lit heap + an elliptical pool on the floor) while the walls and far corners keep the blue night shade.
//    uZoneDir.w <= -1.5 = no cone (distance fade only).
// Positions are WORLD space and constant (sets_int.ts writes them once): the interiors sit 2 km from every other set,
// so the same values are right for both canvases of a cross-dissolve (no per-World copy needed, see world.ts).
// range / radius 0 = slot unused.
export const POOL_N = 18, ZONE_N = 4; // saladoil WORLD-INT: slots 0..12 = the interiors (sets_int.ts writes them per World), 13..17 free for the exteriors; zones 0..1 = the pump-room work lamps, 2..3 free // round 3: 8 pools (storeroom lantern + pile spill + warm floor bounce); round 5: 12 (the storeroom's hanging work bulb + the three dusk practicals at the trailhead); round 7: 14 (the dusk board lamps' warm GROUND pools); round 8: 15 (the storeroom's slot night-light)
export const POOL = {
  uPoolPos: { value: Array.from({ length: POOL_N }, () => new THREE.Vector3()) },
  uPoolCol: { value: Array.from({ length: POOL_N }, () => new THREE.Vector3()) },
  uPoolRad: { value: new Array<number>(POOL_N).fill(0) },
  uZonePos: { value: Array.from({ length: ZONE_N }, () => new THREE.Vector3()) },
  uZone: { value: Array.from({ length: ZONE_N }, () => new THREE.Vector4(0, 0, 1, 0)) },
  uZoneDir: { value: Array.from({ length: ZONE_N }, () => new THREE.Vector4(0, -1, 0, -2)) },
};
/** GLSL: pool light and key mask at a view-space point / normal (needs POOL uniforms + viewMatrix). Shared so the
 *  character cards (cardshade.ts) can add the same pools if the CHAR owner wants to. */
export const POOL_GLSL = /* glsl */ `
uniform vec3 uPoolPos[ ${POOL_N} ]; uniform vec3 uPoolCol[ ${POOL_N} ]; uniform float uPoolRad[ ${POOL_N} ];
uniform vec3 uZonePos[ ${ZONE_N} ]; uniform vec4 uZone[ ${ZONE_N} ]; uniform vec4 uZoneDir[ ${ZONE_N} ];
vec3 poolLight( vec3 pV, vec3 nV ) {
  vec3 acc = vec3( 0.0 );
  for ( int i = 0; i < ${POOL_N}; i ++ ) {
    float r = uPoolRad[ i ];
    if ( r <= 0.0 ) continue;
    vec3 l = ( viewMatrix * vec4( uPoolPos[ i ], 1.0 ) ).xyz - pV;
    float d = length( l );
    float a = clamp( 1.0 - d / r, 0.0, 1.0 );
    float w = clamp( ( dot( nV, l / max( d, 1e-4 ) ) + 0.3 ) / 1.3, 0.0, 1.0 );   // wrapped N.L: soft, no hard edge
    acc += uPoolCol[ i ] * ( a * a * w );
  }
  return acc;
}
// saladoil (WORLD-INT): zones whose reach covers a point are a UNION of lamp spots (max), so two work lamps each print
// their own pool; a point outside every zone's reach keeps the full key (one zone = the antitheft behaviour)
float keyMask( vec3 pV ) {
  float k = 0.0; bool any = false;
  for ( int j = 0; j < ${ZONE_N}; j ++ ) {
    vec4 z = uZone[ j ];
    if ( z.w <= 0.0 ) continue;
    vec3 l = pV - ( viewMatrix * vec4( uZonePos[ j ], 1.0 ) ).xyz;              // lamp -> point (view space)
    float d = length( l );
    if ( d >= z.w ) continue;
    any = true;
    float m = 1.0 - smoothstep( z.x, z.y, d );
    vec4 cd = uZoneDir[ j ];
    if ( cd.w > -1.5 ) m *= smoothstep( cd.w, z.z, dot( l / max( d, 1e-4 ), normalize( ( viewMatrix * vec4( cd.xyz, 0.0 ) ).xyz ) ) );
    k = max( k, m );
  }
  return any ? k : 1.0;
}
`;

const TWO_TONE = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                               // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl ) * keyMask( geometryPosition ); // 0 = cast/form shadow, 1 = lit
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );    // up-facing a bit brighter
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );                             // keep some cosine modelling
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );        // 1 = faces the lens
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  // warm wood keeps a warm (plum-brown) shade instead of the lavender ground shade
  float lumA = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  float warmA = clamp( ( diffuseColor.r - diffuseColor.b ) / max( diffuseColor.r, 1e-3 ), 0.0, 1.0 );
  float woodK = uWoodK * smoothstep( 0.55, 0.75, warmA ) * ( 1.0 - smoothstep( 0.17, 0.23, lumA ) );
  vec3 shadeC = mix( uShadeCol, uWoodShade, woodK );
  vec3 liftC = mix( uShadeLift, uWoodLift, woodK );
  vec3 poolC = poolLight( geometryPosition, geometryNormal );
  float pDom = 1.0 / ( 1.0 + uPoolDom * dot( poolC, vec3( 0.3, 0.55, 0.15 ) ) );
  reflectedLight.directDiffuse = alb * ( mix( shadeC * pDom, lit, sunTerm ) * skyK + uBounce * facing * clamp( 1.0 - dot( geometryNormal, upV ), 0.0, 1.0 ) * ( 1.0 - sunTerm ) )
    + liftC * LIFT_K * ( 1.0 - sunTerm ) * pDom
    + alb * poolC;                                                            // warm practical pools (interiors)
  // backlight rim: the sun-side faces of vertical things seen edge-on, only when the sun is ahead of the lens
  float vert = 1.0 - abs( dot( geometryNormal, upV ) );
  float backK = smoothstep( 0.05, 0.75, dot( sunV, -geometryViewDir ) );
  float rimK = smoothstep( -0.42, 0.05, ndl ) * vert * vert * vert * pow( 1.0 - facing, 1.5 ) * backK; // edge-on sides of a dead-backlit post count too
  rimK *= 1.0 - smoothstep( 60.0, 120.0, length( geometryPosition ) );           // round 5: no rim streaks on the far domes / mesas
  #ifndef NO_RIM
  reflectedLight.directDiffuse += uRimCol * rimK * ( 0.35 + alb );
  #endif
  reflectedLight.directDiffuse += alb * uFill;                                // round 5: sky fill (dusk blue hour)
  #ifdef HAZE_MUL
  // round 6 (carry-over: the badland bands read flat): on the hazy terrain materials (sets_ext.ts hazy(): mounds, hero
  // mounds, mesas, floor) the SLOPES take a two-tone: the key side +14 % warm, the far side -12 % violet; the flat
  // floor (normal near up) is left as it is
  {
    float slope = 1.0 - smoothstep( 0.72, 0.93, dot( geometryNormal, upV ) );
    vec3 two = mix( vec3( 0.88, 0.84, 0.95 ), vec3( 1.14, 1.08, 1.0 ), smoothstep( -0.25, 0.35, dot( geometryNormal, sunV ) ) ); // net brighter (A5 shot 2: the mounds already read too dark)
    reflectedLight.directDiffuse *= mix( vec3( 1.0 ), two, slope );
  }
  #endif
  // cloud shadow band (soft, noisy edges)
  if ( uCloudTint.x + uCloudTint.y + uCloudTint.z < 2.999 ) {
    vec3 wP = transpose( mat3( viewMatrix ) ) * ( geometryPosition - viewMatrix[ 3 ].xyz );
    vec2 cp = wP.xz * 0.35;
    float nz = fract( sin( dot( floor( cp ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
    float nz2 = fract( sin( dot( floor( cp * 2.3 + 7.0 ), vec2( 39.3468, 11.135 ) ) ) * 24634.6345 );
    float sC = dot( wP.xz, uCloud.xy ) + ( 0.6 * nz + 0.4 * nz2 - 0.5 ) * uCloudW * 0.8;
    float cov = smoothstep( uCloud.w - uCloudW, uCloud.w + uCloudW, sC ) * ( 1.0 - smoothstep( uCloud.z - uCloudW, uCloud.z + uCloudW, sC ) );
    // round 7 (A6 P2: the dim turned the brown posts / frame wine-maroon): on dark warm WOOD albedo the cloud shadow is a
    // warm-neutral darkening (its mean value, r .04 over b), so wood stays brown; the floor / rocks keep the lavender tint
    float wk2 = smoothstep( 0.5, 0.72, warmA ) * ( 1.0 - smoothstep( 0.16, 0.26, lumA ) );
    vec3 cT = mix( uCloudTint, vec3( dot( uCloudTint, vec3( 0.3333 ) ) ) * vec3( 1.03, 1.0, 0.96 ), wk2 );
    reflectedLight.directDiffuse *= mix( vec3( 1.0 ), cT, cov );
  }
  reflectedLight.indirectDiffuse = vec3( 0.0 );                               // hemisphere/fill no longer used here
}
#endif
`;
const DECL = "#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;\n"
  + "uniform vec3 uRimCol; uniform vec3 uFill; uniform vec3 uWoodShade; uniform vec3 uWoodLift; uniform float uWoodK; uniform vec4 uCloud; uniform float uCloudW; uniform vec3 uCloudTint; uniform float uPoolDom;\n" + POOL_GLSL;

/** Lambert (or Phong: its specular term is kept, masked by the shadow) -> two-tone. Call once per material.
 *  noRim = true: this material never takes the backlight rim (round 5 opt-out for far mounds / mesas). */
export function twoTone<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, liftK = 1, noRim = false): T {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE, TONE_X, POOL);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", DECL + `\n#define LIFT_K ${liftK.toFixed(3)}` + (noRim ? String.fromCharCode(10) + "#define NO_RIM" : ""))
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
  };
  m.customProgramCacheKey = () => "twoTone18z4pd_" + liftK.toFixed(3) + (noRim ? "_nr" : "");
  return m;
}

// ---------------- tone-map inversion ----------------
// The composer ends in PBR-Neutral tone mapping, so a colour written to the scene buffer is NOT what lands on screen
// (toe: -0.04 linear offset, shoulder above 0.76). Self-lit things whose on-screen colour is a measured target (sky,
// fog, river) are written as untone(target): the linear value that the Neutral curve maps onto the target.
const neutral = (c: number[]) => {
  const x = Math.min(c[0], c[1], c[2]), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const v = c.map((k) => k - off), peak = Math.max(v[0], v[1], v[2]), S = 0.76;
  if (peak < S) return v;
  const d = 1 - S, np = 1 - (d * d) / (peak + d - S), g = 1 - 1 / (0.15 * (peak - np) + 1);
  return v.map((k) => (k * np) / peak * (1 - g) + np * g);
};
/** linear input that the Neutral tone map turns into the given on-screen colour (hex or THREE.Color, sRGB target) */
export const untone = (target: THREE.ColorRepresentation, out = new THREE.Color()) => {
  const t = new THREE.Color(target); // linear working space
  const tt = [t.r, t.g, t.b].map((k) => Math.min(k, 0.985));
  let c = tt.slice();
  for (let i = 0; i < 60; i++) { const y = neutral(c); c = c.map((k, j) => Math.max(0, k + (tt[j] - y[j]))); }
  return out.setRGB(c[0], c[1], c[2]);
};

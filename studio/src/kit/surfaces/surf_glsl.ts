// SURFACES shader source (GLSL ES 3.0 via three r175). Injected into MeshStandardMaterial by materials.ts. Everything is
// a pure function of the surface position + the seed: no time, no per-frame randomness (the accumulation stays stable).
// Coordinates: vSM = surface metres (world XZ for grounds, geometry UV in metres for walls / parts), uvT = texture space.

/** shared by vertex + fragment: hash / noise / cell decode / uv transform */
export const SURF_COMMON = /* glsl */ `
uniform vec4 sXf;          // (cos / tileM, sin / tileM, offset u, offset v)
uniform float sSeed;
uniform vec4 sDispV;       // (relief metres, per-cell height metres, hgt lo, 1 / (hgt hi - lo))
uniform sampler2D sHgt;
uniform sampler2D sCell;
vec2 sXform( vec2 m ) { return vec2( sXf.x * m.x - sXf.y * m.y, sXf.y * m.x + sXf.x * m.y ) + sXf.zw; }
float sHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 + sSeed * 0.01373 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
vec2 sHash2( vec2 p ) { return vec2( sHash( p ), sHash( p + vec2( 19.19, 7.31 ) ) ); }
float sNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( sHash( i ), sHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( sHash( i + vec2( 0.0, 1.0 ) ), sHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
float sFbm( vec2 p ) { float a = 0.5, s = 0.0; for ( int i = 0; i < 4; i ++ ) { s += a * sNoise( p ); p = mat2( 1.6, 1.2, -1.2, 1.6 ) * p + 3.1; a *= 0.5; } return s / 0.9375; }
// cell map: R,G = id; B = code * 10, code = (dx+1) + 3 (dy+1) + 9 joint; A = px to the joint (x16)
vec3 sCellKey( vec4 c, vec2 uvT ) {
  float code = floor( c.b * 255.0 / 10.0 + 0.5 );
  vec2 off = vec2( mod( code, 3.0 ) - 1.0, mod( floor( code / 3.0 ), 3.0 ) - 1.0 );
  return vec3( floor( uvT ) + off, c.r * 255.0 + c.g * 65280.0 );
}
float sCellRand( vec3 k, float n ) { return sHash( k.xy * vec2( 17.13, 31.71 ) + vec2( k.z * 0.61803, k.z * 0.2113 ) + n * 7.77 ); }
float sHgtN( float raw ) { return clamp( ( raw - sDispV.z ) * sDispV.w, 0.0, 1.0 ); }
uniform sampler2D sCen;
uniform vec4 sCellV2;      // per-cell tilt (m/m), missing share, cracked share, chipped share
uniform float sWarp;       // outline warp of the cell / height lookups (uv units): bricks are not perfect rectangles
vec2 sWarpUV( vec2 uvT, vec2 m ) {
  return uvT + ( vec2( sNoise( m * 9.0 ), sNoise( m * 9.0 + 17.3 ) ) - 0.5 ) * sWarp + ( vec2( sNoise( m * 33.0 + 5.1 ), sNoise( m * 33.0 + 9.7 ) ) - 0.5 ) * sWarp * 0.4;
}
float sTileM() { return 1.0 / max( length( sXf.xy ), 1e-4 ); }
/** per-cell extra height (h units): jitter + tilt about the brick's centroid + missing bricks sunk to the joint */
float sCellExtra( vec3 ck, vec2 off, float h ) {
  float top = smoothstep( 0.2, 0.6, h );
  if ( sCellRand( ck, 7.0 ) < sCellV2.y ) return ( 0.06 - h ) * top;
  float jit = ( sCellRand( ck, 3.0 ) - 0.5 ) * 2.0 * sDispV.y;
  vec2 sl = ( vec2( sCellRand( ck, 5.0 ), sCellRand( ck, 6.0 ) ) - 0.5 ) * 2.0 * sCellV2.x;
  return ( jit + dot( sl, off * sTileM() ) ) / max( sDispV.x, 1e-4 ) * top;
}
`;

export const SURF_VERT_PARS = /* glsl */ `
varying vec3 vSW;
varying vec2 vSM;
varying vec4 vSA;
varying float vSB;
attribute vec3 aSurf;      // (edge 0..1, centre 0..1, displacement weight 0..1); missing = 0
attribute float aWear;     // bevel / edge wear 0..1; missing = 0
attribute float aBlendW;   // height-blend weight toward set 2 (mask "attr")
` + SURF_COMMON;

export const SURF_VERT_MAIN = /* glsl */ `
{
  vec4 sWp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    sWp = instanceMatrix * sWp;
  #endif
  sWp = modelMatrix * sWp;
  vSW = sWp.xyz;
  #if S_UV == 0
    vSM = vec2( sWp.x, - sWp.z );
  #elif S_UV == 1
    vSM = uv;
  #elif S_UV == 2
    vSM = sWp.xy;
  #else
    vSM = vec2( - sWp.z, sWp.y );
  #endif
  vSA = vec4( aSurf, aWear ); vSB = aBlendW;
  #ifdef S_DISP
  {
    vec2 uvT = sXform( vSM );
    #ifdef S_CELL
      uvT = sWarpUV( uvT, vSM );
    #endif
    float h = sHgtN( textureLod( sHgt, uvT, 0.0 ).r );
    #ifdef S_CELL
      vec3 ck = sCellKey( textureLod( sCell, uvT, 0.0 ), uvT );
      h += sCellExtra( ck, ( textureLod( sCen, uvT, 0.0 ).rg - 0.5 ) * 0.5, h );
    #endif
    transformed += normalize( objectNormal ) * ( h - 1.0 ) * sDispV.x * aSurf.z;
  }
  #endif
}
`;

/** fragment declarations + the surface evaluation (called in place of <map_fragment>) */
export const SURF_FRAG_PARS = /* glsl */ `
varying vec3 vSW;
varying vec2 vSM;
varying vec4 vSA;
varying float vSB;
` + SURF_COMMON + /* glsl */ `
uniform sampler2D sAlb; uniform sampler2D sNor; uniform sampler2D sArm;
uniform vec4 sCol;     // tint rgb, cavity (AO into albedo)
uniform vec4 sMat;     // roughness x, normal strength, AO strength, metal x
uniform vec4 sMacro;   // amount, 1 / scale m, roughness amount, hue amount
uniform vec4 sCellV;   // value, hue, roughness, odd share
uniform vec4 sJoint;   // lo, hi (in hgt units), darken, hex rotation share
uniform vec4 sMoss;    // amount, 1 / patch m, edge boost, weeds
uniform vec3 sMossC;
uniform vec4 sDirt;    // joints, bottom, bottom height m, base y (world)
uniform vec4 sDirt2;   // edge, grime (overall), streak, dust (toward edges)
uniform float sSat;    // albedo saturation
uniform vec3 sDirtC;
uniform vec4 sWet;     // wetness, puddles, 1 / puddle m, level
uniform vec4 sWear;    // edges, polish, centre, chip
uniform vec4 sPom;     // POM scale (uv), steps, self-shadow strength, fade distance m
uniform float sPoro;   // porosity (how much darker when wet)
uniform float sDispUV; // relief metres / tileM (height -> uv)
#ifdef S_BLEND
uniform sampler2D sAlb2; uniform sampler2D sNor2; uniform sampler2D sArm2; uniform sampler2D sHgt2;
uniform vec4 sXf2; uniform vec4 sCol2; uniform vec4 sMat2;
uniform vec4 sBlend;   // mode (1 noise, 2 attr, 3 both), 1 / scale m, contrast, bias
uniform vec2 sHgt2N;   // lo, 1 / range
#endif
#ifdef S_DECALS
uniform sampler2D sDcTex;
uniform int sDcN;
uniform vec4 sDcA[ S_MAXD ];   // centre (surface m), rotation rad, opacity
uniform vec4 sDcB[ S_MAXD ];   // half size (m), atlas cell, type
uniform vec4 sDcC[ S_MAXD ];   // tint rgb, param
#endif
struct SOut { vec3 alb; vec3 nrm; float rough; float metal; float ao; float h; float joint; };
SOut S;
vec2 sUvT; vec2 sGx; vec2 sGy; mat3 sF;
mat3 sFrame( vec3 eye, vec3 n, vec2 uv ) {
  vec3 q0 = dFdx( eye ), q1 = dFdy( eye ); vec2 st0 = dFdx( uv ), st1 = dFdy( uv );
  vec3 q1p = cross( q1, n ), q0p = cross( n, q0 );
  vec3 T = q1p * st0.x + q0p * st1.x, B = q1p * st0.y + q0p * st1.y;
  float det = max( dot( T, T ), dot( B, B ) ); float sc = det == 0.0 ? 0.0 : inversesqrt( det );
  return mat3( T * sc, B * sc, n );
}
float sH( vec2 uv, vec2 gx, vec2 gy ) { return sHgtN( textureGrad( sHgt, uv, gx, gy ).r ); }
#ifdef S_POM
vec2 sParallax( vec2 uv, vec3 Vt, float scaleUV, vec2 gx, vec2 gy ) {
  float n = sPom.y, dl = 1.0 / n;
  vec2 dUV = - Vt.xy / max( Vt.z, 0.25 ) * scaleUV / n;
  float layer = 0.0; vec2 cur = uv; float d = 1.0 - sH( cur, gx, gy );
  for ( int i = 0; i < 32; i ++ ) { if ( float( i ) >= n || layer >= d ) break; cur += dUV; layer += dl; d = 1.0 - sH( cur, gx, gy ); }
  vec2 prev = cur - dUV; float after = d - layer, before = ( 1.0 - sH( prev, gx, gy ) ) - layer + dl;
  return mix( cur, prev, clamp( after / ( after - before + 1e-5 ), 0.0, 1.0 ) );
}
#endif
#ifdef S_HEX
// hex-tile bombing (Mikkelsen 2022): 3 rotated / offset samples per texel, blended with contrast + height
void sHexTap( vec2 uvT, vec2 gx, vec2 gy, vec2 v, float w, inout vec4 A, inout vec3 Nn, inout vec4 R, inout float Hh, inout float W ) {
  vec2 r = sHash2( v ); float a = ( r.x * 2.0 - 1.0 ) * 3.14159 * sJoint.w;
  float c = cos( a ), s = sin( a ); mat2 M = mat2( c, s, -s, c );
  vec2 uv = M * uvT + sHash2( v + 5.3 ) * 7.0;
  vec2 dx = M * gx, dy = M * gy;
  float h = sHgtN( textureGrad( sHgt, uv, dx, dy ).r );
  float ww = pow( w, 6.0 ) * ( 0.25 + h );
  vec3 n = textureGrad( sNor, uv, dx, dy ).xyz * 2.0 - 1.0;
  n.xy = transpose( M ) * n.xy;
  A += textureGrad( sAlb, uv, dx, dy ) * ww; Nn += n * ww; R += textureGrad( sArm, uv, dx, dy ) * ww; Hh += h * ww; W += ww;
}
#endif
float sSunSelf( vec3 Lv ) {
#ifdef S_SELF
  float k = sPom.z * ( 1.0 - smoothstep( sPom.w * 0.6, sPom.w, length( vViewPosition ) ) );
  if ( k < 0.01 ) return 1.0;
  vec3 Lt = vec3( dot( Lv, normalize( sF[ 0 ] ) ), dot( Lv, normalize( sF[ 1 ] ) ), dot( Lv, normalize( sF[ 2 ] ) ) );
  if ( Lt.z <= 0.03 ) return 1.0;
  vec2 dir = Lt.xy / Lt.z * sDispUV;
  float h0 = S.h, occ = 0.0;
  for ( int i = 1; i <= 10; i ++ ) {
    float t = float( i ) * 0.1 * ( 1.02 - h0 );
    float hh = sH( sUvT + dir * t, sGx, sGy );
    occ = max( occ, ( hh - ( h0 + t ) ) * ( 1.0 - float( i ) / 11.0 ) );
  }
  return 1.0 - clamp( occ * 10.0, 0.0, 1.0 ) * k;
#else
  return 1.0;
#endif
}
`;

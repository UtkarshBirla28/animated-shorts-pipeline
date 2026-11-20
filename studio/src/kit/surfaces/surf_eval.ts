// SURFACES shader: the surface evaluation (see surf_glsl.ts for the declarations). Order: base sample (plain / hex / POM)
// -> kit-height normal -> per-cell variation -> macro -> height blend -> decals -> moss / weeds / dirt -> wear -> wet.
// Fills the global S (albedo, tangent normal, roughness, metal, AO, height, joint mask).
export const SURF_EVAL = /* glsl */ `
float hiK0( float h ) { return smoothstep( 0.4, 0.9, h ); }
void sEval() {
  vec3 N0 = normalize( vNormal );
  #ifdef DOUBLE_SIDED
    N0 *= gl_FrontFacing ? 1.0 : - 1.0;
  #endif
  vec2 uvT = sXform( vSM );
  vec2 gx = dFdx( uvT ), gy = dFdy( uvT );
  mat3 F = sFrame( - vViewPosition, N0, uvT );
  float dist = length( vViewPosition );
  #ifdef S_POM
  {
    vec3 V = normalize( vViewPosition );
    vec3 Vt = vec3( dot( V, normalize( F[ 0 ] ) ), dot( V, normalize( F[ 1 ] ) ), dot( V, N0 ) );
    float k = 1.0 - smoothstep( sPom.w * 0.6, sPom.w, dist );
    if ( k > 0.01 && Vt.z > 0.0 ) uvT = sParallax( uvT, Vt, sPom.x * k, gx, gy );
  }
  #endif
  vec2 uvH = uvT;
  #ifdef S_CELL
    uvH = sWarpUV( uvT, vSM );
  #endif
  vec4 alb, arm; vec3 tn; float h;
  #ifdef S_HEX
  {
    vec2 st = uvT * 1.7;
    vec2 sk = vec2( st.x, - 0.57735027 * st.x + 1.15470054 * st.y );
    vec2 b = floor( sk ); vec3 t = vec3( fract( sk ), 0.0 ); t.z = 1.0 - t.x - t.y;
    float s = step( 0.0, - t.z ), s2 = 2.0 * s - 1.0;
    vec3 w = vec3( - t.z * s2, s - t.y * s2, s - t.x * s2 );
    vec4 A = vec4( 0.0 ), R = vec4( 0.0 ); vec3 Nn = vec3( 0.0 ); float Hh = 0.0, W = 0.0;
    sHexTap( uvT, gx, gy, b + vec2( s, s ), w.x, A, Nn, R, Hh, W );
    sHexTap( uvT, gx, gy, b + vec2( s, 1.0 - s ), w.y, A, Nn, R, Hh, W );
    sHexTap( uvT, gx, gy, b + vec2( 1.0 - s, s ), w.z, A, Nn, R, Hh, W );
    alb = A / W; arm = R / W; tn = normalize( Nn / W ); h = Hh / W;
  }
  #else
    alb = textureGrad( sAlb, uvT, gx, gy ); arm = textureGrad( sArm, uvT, gx, gy );
    tn = textureGrad( sNor, uvT, gx, gy ).xyz * 2.0 - 1.0;
    h = sH( uvH, gx, gy );
  #endif
  tn.xy *= sMat.y;
  vec3 col = alb.rgb * sCol.rgb;
  col = mix( vec3( dot( col, vec3( 0.2126, 0.7152, 0.0722 ) ) ), col, sSat );
  float rough = arm.g * sMat.x, metal = arm.b * sMat.w, ao = arm.r;
  #ifdef S_HGTN
  {
    // normal from the kit height map (bevels that match the real displacement + self-shadow), whiteout-blended
    vec2 e = max( vec2( 1.0 / 1024.0 ), vec2( length( gx ), length( gy ) ) * 0.75 );
    float hx = sH( uvH + vec2( e.x, 0.0 ), gx, gy ) - sH( uvH - vec2( e.x, 0.0 ), gx, gy );
    float hy = sH( uvH + vec2( 0.0, e.y ), gx, gy ) - sH( uvH - vec2( 0.0, e.y ), gx, gy );
    vec2 sl = vec2( hx / ( 2.0 * e.x ), hy / ( 2.0 * e.y ) ) * sDispUV;
    vec3 nh = normalize( vec3( - sl, 1.0 ) );
    tn = normalize( vec3( tn.xy + nh.xy, tn.z * nh.z ) );
  }
  #endif
  float joint = 1.0 - smoothstep( sJoint.x, sJoint.y, h );
  float cellV = 0.0, edgePx = 99.0;
  float chipK = 0.0;
  #ifdef S_CELL
  {
    vec4 cr = texture( sCell, uvH );
    vec3 ck = sCellKey( cr, uvH );
    vec2 offM = ( texture( sCen, uvH ).rg - 0.5 ) * 0.5 * sTileM();
    float r1 = sCellRand( ck, 1.0 ), r2 = sCellRand( ck, 2.0 ), r3 = sCellRand( ck, 3.0 ), r4 = sCellRand( ck, 4.0 );
    float r5 = sCellRand( ck, 5.0 ), r6 = sCellRand( ck, 6.0 ), r7 = sCellRand( ck, 7.0 ), r8 = sCellRand( ck, 8.0 ), r9 = sCellRand( ck, 9.0 ), r10 = sCellRand( ck, 10.0 );
    cellV = 1.0 - smoothstep( 8.0, 20.0, max( length( gx ), length( gy ) ) * 1024.0 );
    float inC = cellV * ( 1.0 - joint );
    float val = 1.0 + ( r1 - 0.5 ) * 2.0 * sCellV.x;
    vec3 hue = mix( vec3( 1.0 + sCellV.y, 1.0, 1.0 - sCellV.y ), vec3( 1.0 - sCellV.y, 1.0, 1.0 + sCellV.y ), r2 );
    float odd = step( 1.0 - sCellV.w, r4 );
    col *= mix( vec3( 1.0 ), val * hue, inC );
    // odd bricks: half dark / burnt, half sun-bleached (paler, greyer)
    float lumC = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
    col = mix( col, r2 < 0.5 ? col * vec3( 0.6, 0.55, 0.58 ) : mix( vec3( lumC ), col, 0.45 ) * 1.28, odd * inC );
    rough *= 1.0 + ( r3 - 0.5 ) * 2.0 * sCellV.z * cellV;
    // per-brick height jitter + tilt (also shades the brick: the sun catches tilted bricks differently)
    float topK = smoothstep( 0.2, 0.6, h );
    vec2 sl = ( vec2( r5, r6 ) - 0.5 ) * 2.0 * sCellV2.x;
    h += ( ( r3 - 0.5 ) * 2.0 * sDispV.y + dot( sl, offM ) ) / max( sDispV.x, 1e-4 ) * topK;
    tn.xy -= sl * inC * 1.4;
    edgePx = cr.a * 255.0 / 16.0;
    // a few missing bricks (a hole of soil + moss), a few cracked ones, chipped arrises on some
    if ( r7 < sCellV2.y ) {
      h = min( h, 0.08 ); joint = 1.0;
      col = mix( sDirtC * ( 0.6 + 0.8 * sNoise( vSM * 70.0 ) ), sMossC * 1.4, smoothstep( 0.4, 0.7, sNoise( vSM * 12.0 ) ) );
      tn = normalize( mix( tn, vec3( ( sHash2( floor( vSM * 160.0 ) ) - 0.5 ) * 0.8, 1.0 ), 0.7 ) ); rough = 0.95;
    } else if ( r8 < sCellV2.z ) {
      float an = r9 * 6.2832; vec2 cn = vec2( cos( an ), sin( an ) );
      float dd = abs( dot( offM, cn ) - ( r5 - 0.5 ) * 0.03 + ( sNoise( vSM * 150.0 ) - 0.5 ) * 0.004 );
      float crk = ( 1.0 - smoothstep( 0.0006, 0.0022, dd ) ) * inC;
      joint = max( joint, crk ); h -= crk * 0.3; col *= 1.0 - 0.6 * crk;
    }
    chipK = step( r10, sCellV2.w ) * inC;
  }
  #endif
  joint = max( joint, 1.0 - smoothstep( sJoint.x, sJoint.y, h ) );
  // macro variation (metres): breaks any repeat at distance
  vec2 mp = vSM * sMacro.y;
  float m1 = sFbm( mp ), m2 = sNoise( mp * 2.7 + 7.0 );
  col *= 1.0 + ( m1 - 0.5 ) * 2.0 * sMacro.x;
  col *= mix( vec3( 1.0 ), mix( vec3( 1.05, 1.0, 0.94 ), vec3( 0.95, 1.0, 1.06 ), m2 ), sMacro.w );
  rough *= 1.0 + ( m2 - 0.5 ) * 2.0 * sMacro.z;
  #ifdef S_BLEND
  {
    vec2 u2 = vec2( sXf2.x * vSM.x - sXf2.y * vSM.y, sXf2.y * vSM.x + sXf2.x * vSM.y ) + sXf2.zw;
    vec2 g2x = dFdx( u2 ), g2y = dFdy( u2 );
    vec4 a2 = textureGrad( sAlb2, u2, g2x, g2y ), r2 = textureGrad( sArm2, u2, g2x, g2y );
    vec3 n2 = textureGrad( sNor2, u2, g2x, g2y ).xyz * 2.0 - 1.0; n2.xy *= sMat2.y;
    float h2 = clamp( ( textureGrad( sHgt2, u2, g2x, g2y ).r - sHgt2N.x ) * sHgt2N.y, 0.0, 1.0 );
    float m = sBlend.w;
    if ( sBlend.x == 1.0 || sBlend.x == 3.0 ) m += sFbm( vSM * sBlend.y + 21.0 ) - 0.5;
    if ( sBlend.x >= 2.0 ) m += vSB;
    m = clamp( m, 0.0, 1.0 );
    float ha = h + ( 1.0 - m ), hb = h2 + m, ma = max( ha, hb ) - sBlend.z;
    float wa = max( ha - ma, 0.0 ), wb = max( hb - ma, 0.0 ), f = wb / ( wa + wb + 1e-5 );
    col = mix( col, a2.rgb * sCol2.rgb * ( 1.0 + ( m1 - 0.5 ) * 2.0 * sMacro.x ), f );
    rough = mix( rough, r2.g * sMat2.x, f ); ao = mix( ao, r2.r, f ); metal = mix( metal, r2.b * sMat2.w, f );
    tn = normalize( mix( tn, n2, f ) ); h = mix( h, h2, f ); joint = mix( joint, 0.0, f );
  }
  #endif
  float addPud = 0.0, addMoss = 0.0, clean = 0.0;
  #ifdef S_DECALS
  {
    float mpp = max( length( dFdx( vSM ) ), length( dFdy( vSM ) ) );
    for ( int i = 0; i < S_MAXD; i ++ ) {
      if ( i >= sDcN ) break;
      vec4 A = sDcA[ i ], B = sDcB[ i ], C = sDcC[ i ];
      vec2 d = vSM - A.xy; float cs = cos( A.z ), sn = sin( A.z );
      vec2 l = vec2( cs * d.x + sn * d.y, - sn * d.x + cs * d.y ) / B.xy;
      if ( abs( l.x ) > 1.0 || abs( l.y ) > 1.0 ) continue;
      vec2 cuv = ( vec2( mod( B.z, 4.0 ), floor( B.z / 4.0 ) ) + ( l * 0.5 + 0.5 ) * 0.96 + 0.02 ) * 0.25;
      float lod = log2( max( mpp / ( 2.0 * min( B.x, B.y ) ) * 512.0, 1.0 ) );
      vec4 tx = textureLod( sDcTex, cuv, lod );
      float a = tx.a * A.w;
      int ty = int( B.w + 0.5 );
      if ( ty == 0 ) { col *= mix( vec3( 1.0 ), C.rgb, a ); rough = mix( rough, min( 1.0, rough + C.w ), a ); }
      else if ( ty == 1 ) { col *= mix( 1.0, 0.28 + 0.2 * tx.r, a ); rough = mix( rough, 0.18 + 0.25 * tx.r, a ); metal = mix( metal, 0.0, a ); }
      else if ( ty == 2 ) { addPud = max( addPud, a ); }
      else if ( ty == 3 ) { col *= mix( 1.0, 0.42, a * tx.r ); joint = max( joint, a ); h = mix( h, h * 0.4, a * tx.r ); }
      else if ( ty == 4 ) { float pw = a * smoothstep( 0.25, 0.6, tx.r * ( 0.7 + 0.6 * sNoise( vSM * 19.0 ) ) - C.w ); col = mix( col, C.rgb, pw ); rough = mix( rough, 0.55, pw ); tn = normalize( mix( tn, vec3( 0.0, 0.0, 1.0 ), pw * 0.6 ) ); joint *= 1.0 - pw; }
      else if ( ty == 5 ) { col *= mix( vec3( 1.0 ), C.rgb * ( 0.8 + 0.4 * tx.r ), a ); }
      else if ( ty == 6 ) { col = mix( col, col * 1.12 + 0.015, a ); rough = mix( rough, rough * 0.8, a ); clean = max( clean, a ); }
      else if ( ty == 7 ) { col *= mix( vec3( 1.0 ), C.rgb, a * ( 0.6 + 0.4 * tx.r ) ); rough = mix( rough, min( 1.0, rough + 0.1 ), a ); }
      else { addMoss = max( addMoss, a ); }
    }
  }
  #endif
  // moss / weeds in the joints (patchy, more near the borders, less on the walking line)
  float edge = vSA.x, centre = vSA.y;
  float fine = sNoise( vSM * 61.0 );
  float mossM = sMoss.x * smoothstep( 0.45, 0.72, sFbm( vSM * sMoss.y + 3.7 ) + edge * sMoss.z - centre * 0.3 ) * smoothstep( 0.2, 0.75, joint );
  mossM = clamp( max( mossM, addMoss * ( 0.4 + 0.6 * joint ) ), 0.0, 1.0 ) * ( 1.0 - clean );
  vec3 mossCol = sMossC * ( 0.6 + 0.8 * fine ) * mix( vec3( 1.0 ), vec3( 1.3, 1.2, 0.65 ), smoothstep( 0.4, 0.9, sNoise( vSM * 8.0 ) ) );
  col = mix( col, mossCol, mossM ); rough = mix( rough, 0.95, mossM ); tn = normalize( mix( tn, vec3( 0.0, 0.0, 1.0 ), mossM * 0.7 ) );
  float weed = sMoss.w * smoothstep( 0.5, 0.9, joint ) * step( 0.82, sNoise( vSM * 6.0 + 13.0 ) ) * smoothstep( 0.35, 0.75, sNoise( vSM * 37.0 ) ) * ( 1.0 - clean );
  col = mix( col, vec3( 0.13, 0.2, 0.04 ) * ( 0.75 + 0.5 * fine ), weed );
  // dirt: joints, wall bottoms, borders, overall grime, vertical streaks
  float yb = vSW.y - sDirt.w;
  float dJ = sDirt.x * joint * ( 0.5 + 0.5 * sNoise( vSM * 4.3 ) );
  float dB = sDirt.y * ( 1.0 - smoothstep( 0.0, sDirt.z, yb + ( sNoise( vec2( vSM.x * 2.3, 1.7 ) ) - 0.5 ) * sDirt.z * 0.7 ) );
  float dE = sDirt2.x * edge * ( 0.6 + 0.4 * sNoise( vSM * 3.1 ) );
  float dG = sDirt2.y * smoothstep( 0.35, 0.8, sFbm( vSM * 0.9 + 5.0 ) );
  float dS = sDirt2.z * smoothstep( 0.55, 0.95, sNoise( vec2( vSM.x * 7.0, vSM.y * 0.35 ) ) ) * ( 1.0 - smoothstep( 0.0, 3.0, yb ) * 0.5 );
  float dirtM = clamp( dJ + dB + dE + dG + dS, 0.0, 1.0 ) * ( 1.0 - mossM * 0.7 ) * ( 1.0 - clean );
  col = mix( col, sDirtC * ( 0.7 + 0.6 * fine ) * ( 0.6 + 0.4 * col / max( dot( col, vec3( 0.333 ) ), 0.02 ) ), dirtM * 0.85 );
  rough = mix( rough, 0.93, dirtM * 0.7 );
  float dust = sDirt2.w * pow( clamp( edge, 0.0, 1.0 ), 0.7 ) * smoothstep( 0.25, 0.75, sFbm( vSM * 1.7 + 9.0 ) ) * ( 0.6 + 0.4 * hiK0( h ) );
  col = mix( col, vec3( 0.32, 0.29, 0.25 ) * ( 0.85 + 0.3 * fine ), dust * 0.75 ); rough = mix( rough, 0.96, dust );
  // wear: polished high points (+ the walking line), chipped cell edges, worn bevels (aSurf.w)
  float hiK = smoothstep( 0.62, 0.95, h );
  rough *= 1.0 - sWear.y * hiK * ( 0.45 + 0.55 * centre );
  col *= 1.0 + sWear.z * centre * hiK * 0.14;
  #ifdef S_CELL
    float chip = sWear.w * chipK * ( 1.0 - smoothstep( 1.0, 6.0, edgePx + ( sNoise( vSM * 45.0 ) - 0.5 ) * 6.0 ) ) * step( 0.45, sNoise( vSM * 38.0 ) );
    col = mix( col, mix( col * 1.15, sDirtC * 1.6, 0.35 ), chip ); rough = mix( rough, 0.97, chip );
    tn = normalize( mix( tn, vec3( ( sHash2( floor( vSM * 120.0 ) ) - 0.5 ) * 1.4, 1.0 ), chip * 0.7 ) ); joint = max( joint, chip * 0.6 );
  #endif
  float aw = vSA.w * sWear.x * smoothstep( 0.3, 0.7, sNoise( vSM * 47.0 ) );
  col = mix( col, col * 1.3 + 0.025, aw ); rough = mix( rough, min( 1.0, rough * 1.2 ), aw );
  // wet + puddles (water collects in low spots and joints first)
  float pud = 0.0;
  if ( sWet.y > 0.0 ) pud = smoothstep( sWet.w, sWet.w + 0.05, sFbm( vSM * sWet.z + 11.0 ) + ( 0.5 - h ) * 0.25 ) * sWet.y;
  pud = max( pud, addPud );
  float wJ = clamp( sWet.x * ( 1.0 + joint * 0.8 ) + pud, 0.0, 1.0 );
  col *= mix( 1.0, 1.0 - 0.55 * sPoro, wJ );
  rough = mix( rough, 0.08, wJ * 0.85 );
  col *= mix( 1.0, 0.8, pud ); rough = mix( rough, 0.02, pud ); tn = normalize( mix( tn, vec3( 0.0, 0.0, 1.0 ), pud * 0.95 ) );
  // cavity: a little AO into the albedo (crevices read under direct light too) + joint darkening
  col *= mix( 1.0, ao, sCol.w ) * mix( 1.0, 0.55, joint * sJoint.z );
  S.alb = col; S.nrm = tn; S.rough = clamp( rough, 0.02, 1.0 ); S.metal = clamp( metal, 0.0, 1.0 );
  S.ao = mix( 1.0, ao, sMat.z ); S.h = h; S.joint = joint;
  sUvT = uvT; sGx = gx; sGy = gy; sF = F;
}
`;

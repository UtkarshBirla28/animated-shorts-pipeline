// KIT / HOME: THE COUNTING JARS (K-P20, second build, 2026-11-19 night). One picture, readable at phone size with the
// sound off: two glass jars, red balls dropping into them, a pictogram over each jar, a plain bar under each jar.
//  - jarGlass: glass that reads as glass WITHOUT three's transmission pass: every reflection at full strength (its own
//    room environment: a bright window with its bars, ceiling panels, the sunlit table), the scene behind attenuated by a
//    fresnel alpha (clear in the middle, dense at the silhouette), a darker optically-thick edge, a tinted body in the
//    thick base. Blend ONE / ONE_MINUS_SRC_ALPHA, no depth write, double sided (inner + outer wall = two edge lines).
//  - glassJar: a thick-walled jar (bead rim, punt base, inner + outer wall), a shadow-only caster for rim + base
//  - glassShadow: what a glass jar throws on a sunlit table: a light grey strip with dark edge lines, the rim ring and
//    bright caustic lines inside it; follows the LIVE sun (ctx.rig.sunDir) in update
//  - jarStation: a white plinth with the TRIES bar in its front (a round-button pictogram, a glowing fill, an end mark;
//    no digits), a slim rod at the back that carries the PICTOGRAM plate over the jar (EYE / POINTING HAND + SPEECH
//    BUBBLE), the jar on top. `setBar(k)` fills the bar 0..1.
//  - dropsForImpacts: release times so that each ball's FIRST tink lands on its cue (the sim is re-run: later balls
//    land on the pile, so every fall has its own length). The balls themselves: lab.ts ballSim + redBalls.
// Everything is a pure function of t; no text anywhere (pictograms only).
import * as THREE from "three";
import type { KitCtx } from "../core/ctx";
import { pbr, mesh, rboxG, at, merge, latheG, cylG, canvas, glow, contactBlob, rng, roughMap, rep, ownEnv, type V3, type C3 } from "./util";
import { ballSim, type BallDrop, type BallTrack, type JarSpace } from "./lab";

// ================================================================ glass
export type GlassOpts = {
  env?: THREE.Texture | null; envK?: number;
  /** body tint (linear), micro roughness */
  tint?: C3; rough?: number;
  /** alpha = a0 + a1 * (1 - n.v)^pow : how much of the scene behind is blocked (centre .. silhouette) */
  a0?: number; a1?: number; pow?: number;
  /** the optically thick edge: starts at (1 - n.v) = edge, darkens the reflection by edgeDark */
  edge?: number; edgeDark?: number;
  /** reflection gain, body (diffuse) gain, clamp on the summed specular (keeps the sun glint from blowing the bloom) */
  specK?: number; body?: number; specMax?: number;
  /** a HINT OF REFRACTION (cheap, no transmission pass): toward the silhouette the scene behind is partly replaced by the
   *  room environment looked up along the REFRACTED ray (ior ~1.5), so the band near each edge shows a bent, squeezed
   *  room instead of the straight background. refrK = how much (0 = off) */
  refrK?: number;
  seed?: number;
};
export const jarGlass = (o: GlassOpts = {}) => {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...(o.tint ?? [0.5, 0.74, 0.68])), roughness: o.rough ?? 0.07, metalness: 0,
    transparent: true, depthWrite: false, side: THREE.DoubleSide });
  m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
  m.roughnessMap = rep(roughMap(61 + (o.seed ?? 0), { base: 0.55, var: 0.4, prints: 3, scratches: 10 }), 1.6, 1.6);
  if (o.env) ownEnv(m, o.env, o.envK ?? 1);
  const U = { uGA: { value: new THREE.Vector4(o.a0 ?? 0.03, o.a1 ?? 0.9, o.pow ?? 3.0, o.edge ?? 0.7) }, uGK: { value: new THREE.Vector4(o.specK ?? 1.6, o.body ?? 0.1, o.edgeDark ?? 0.75, o.specMax ?? 7) },
    uGR: { value: o.refrK ?? 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec4 uGA;\nuniform vec4 uGK;\nuniform float uGR;")
      .replace("#include <opaque_fragment>", `{
  float gNdv = clamp( abs( dot( normal, normalize( vViewPosition ) ) ), 0.0, 1.0 );
  float gF = pow( 1.0 - gNdv, uGA.z );
  float gEdge = smoothstep( uGA.w, 1.0, 1.0 - gNdv );
  vec3 gSpec = min( reflectedLight.directSpecular, vec3( uGK.w ) ) + reflectedLight.indirectSpecular;
  vec3 gDiff = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
  float gA = clamp( uGA.x + uGA.y * gF, 0.0, 0.97 );
  outgoingLight = gSpec * uGK.x * ( 1.0 - uGK.z * gEdge ) + gDiff * uGK.y * gA;
#ifdef ENVMAP_TYPE_CUBE_UV
  if ( uGR > 0.0 ) {
    // the refracted room in the band toward the silhouette (the straight background fades out there)
    vec3 gRv = inverseTransformDirection( refract( - normalize( vViewPosition ), normal, 0.66 ), viewMatrix );
    vec3 gRc = textureCubeUV( envMap, envMapRotation * gRv, 0.06 ).rgb * envMapIntensity;
    float gBand = uGR * smoothstep( 0.3, 0.8, 1.0 - gNdv ) * ( 1.0 - gEdge );
    outgoingLight += gRc * gBand * diffuseColor.rgb * 1.6;
    gA = clamp( gA + gBand, 0.0, 0.97 );
  }
#endif
  diffuseColor.a = gA;
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "home:jarglass3";
  m.userData.U = U; m.name = "home:jarglass";
  return m;
};

export type JarOpts = { r?: number; h?: number; wall?: number; base?: number; env?: THREE.Texture | null; envK?: number; seed?: number;
  /** the wall's own sun shadow: the share of the light it blocks face-on .. edge-on (a stochastic caster: the sun's soft
   *  PCSS filter averages it into a light veil with dark edge lines, contact-hard at the foot, softer far away);
   *  refrK = the refraction hint of the wall (jarGlass), rimK = the rim glint (0 = none) */
  shadow?: [number, number]; refrK?: number; rimK?: number };
/** a stochastic shadow caster: discards a hashed share of the depth fragments (more kept where the wall is edge-on to the sun) */
const ditherDepth = (d0: number, d1: number) => {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDD = { value: new THREE.Vector2(d0, d1) };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vDN;").replace("#include <project_vertex>", "#include <project_vertex>\n  vDN = normalize( normalMatrix * normal );");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vDN;\nuniform vec2 uDD;").replace("vec4 diffuseColor = vec4( 1.0 );", `vec4 diffuseColor = vec4( 1.0 );
  {
    float dn = 1.0 - abs( normalize( vDN ).z ), den = mix( uDD.x, uDD.y, dn * dn );
    float hs = fract( sin( dot( gl_FragCoord.xy + ( gl_FrontFacing ? vec2( 17.31, 5.17 ) : vec2( 0.0 ) ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
    if ( hs > den ) discard;
  }`);
  };
  m.customProgramCacheKey = () => "home:glassDither";
  return m;
};
/** local: the jar's base centre on y = 0. Returns the inner space for the ball sim (innerR, floorY, topY) */
export const glassJar = (_ctx: KitCtx, o: JarOpts = {}) => {
  const R = o.r ?? 0.075, H = o.h ?? 0.32, wall = o.wall ?? 0.0085, base = o.base ?? 0.022, g = new THREE.Group(); g.name = "glassJar";
  const wallM = jarGlass({ env: o.env, envK: o.envK, seed: o.seed, refrK: o.refrK ?? 0.4 });
  // the wall: up the outside, over the bead rim, down the inside to the inner floor's cove
  const prof: [number, number][] = [
    [R - 0.007, 0.0], [R - 0.002, 0.0025], [R, 0.009], [R, H - 0.02], [R - 0.0015, H - 0.013], [R + 0.004, H - 0.009], [R + 0.0048, H - 0.003],
    [R + 0.0018, H + 0.0012], [R - wall + 0.0012, H + 0.0008], [R - wall, H - 0.006], [R - wall, base + 0.012], [R - wall - 0.004, base + 0.004], [R - wall - 0.012, base],
  ];
  const body = new THREE.Mesh(latheG(prof, 96), wallM); body.name = "jarWall"; body.receiveShadow = false; body.renderOrder = 6;
  const sd = o.shadow ?? [0.14, 0.8]; body.castShadow = sd[1] > 0; if (body.castShadow) body.customDepthMaterial = ditherDepth(sd[0], sd[1]);
  g.add(body);
  // THE RIM GLINT: the bead catches the window and the ceiling all the way round: a thin bright line, brightest on the
  // side toward the sun (stage -x / -z: the three-quarter backlight) and at the two ends of the ellipse
  if ((o.rimK ?? 1) > 0) {
    const tg = new THREE.TorusGeometry(R + 0.0006, 0.0013, 6, 128); tg.rotateX(Math.PI / 2); tg.translate(0, H + 0.0004, 0);
    const pp = tg.getAttribute("position") as THREE.BufferAttribute, col = new Float32Array(pp.count * 3), sunA = Math.atan2(-0.6, -0.8);
    for (let i = 0; i < pp.count; i++) {
      const ang = Math.atan2(pp.getZ(i), pp.getX(i)), sun = Math.max(0, Math.cos(ang - sunA)), ends = Math.abs(Math.cos(ang)) ** 6;
      const top = Math.max(0, Math.min(1, (pp.getY(i) - H) / 0.0013));
      const v = (o.rimK ?? 1) * (0.28 + 0.9 * sun * sun + 0.45 * ends) * (0.55 + 0.45 * top);
      col[i * 3] = v; col[i * 3 + 1] = v * 0.99; col[i * 3 + 2] = v * 0.95;
    }
    tg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const rm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.5, 1.5, 1.5) });
    rm.customProgramCacheKey = () => "home:jarRim";
    const rim = new THREE.Mesh(tg, rm); rim.name = "jarRimGlint"; rim.renderOrder = 7; g.add(rim);
  }
  // the thick base: the inner floor + the underside, and a solid core seen through the wall (a denser, greener body)
  const baseM = jarGlass({ env: o.env, envK: o.envK, seed: (o.seed ?? 0) + 7, a0: 0.16, a1: 0.7, pow: 1.8, body: 0.42, tint: [0.3, 0.56, 0.5], edge: 0.6, edgeDark: 0.5 });
  const floor = new THREE.Mesh(merge([latheG([[R - wall - 0.012, base], [0.03, base - 0.002], [0.001, base - 0.0035]], 64), latheG([[0.001, 0.004], [R - 0.02, 0.0008], [R - 0.007, 0.0]], 64),
    at(cylG(R - 0.0035, R - 0.0035, base - 0.006, 64, true), 0, base / 2, 0)]), baseM);
  floor.name = "jarBase"; floor.castShadow = false; floor.receiveShadow = false; floor.renderOrder = 5;
  g.add(floor);
  // a shadow-only caster for the rim bead + the thick base (the thin wall lets nearly all the light through)
  const shM = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); shM.customProgramCacheKey = () => "home:shadowonly";
  const sh = new THREE.Mesh(merge([at(new THREE.TorusGeometry(R + 0.001, 0.0042, 6, 48), 0, H - 0.004, 0, Math.PI / 2), at(cylG(R - 0.004, R - 0.004, base * 0.6, 36), 0, base * 0.3, 0)]), shM);
  sh.castShadow = true; sh.name = "jarShadow"; g.add(sh);
  return { object: g, innerR: R - wall, floorY: base, topY: H, r: R, h: H, wallMat: wallM, baseMat: baseM };
};

// ================================================================ the shadow + caustics of a glass jar on a sunlit top
const shadowTex = (() => {
  let mul: THREE.CanvasTexture | null = null, add: THREE.CanvasTexture | null = null;
  return () => {
    if (mul && add) return { mul, add };
    // u (canvas x) = along the shadow, base -> rim; v (canvas y) = across. The first map holds DARKNESS (linear data):
    // the pixel behind is multiplied by (1 - map * strength), so the shadow can fade with the sun.
    const W = 512, Hh = 128;
    { const { cv, g: c } = canvas(W, Hh); c.fillStyle = "#000"; c.fillRect(0, 0, W, Hh);
      const img = c.getImageData(0, 0, W, Hh), d = img.data;
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const u = x / (W - 1), v = Math.abs((y / (Hh - 1)) * 2 - 1);
        const inside = 1 - Math.min(1, Math.max(0, (v - 0.9) / 0.1)), endU = Math.min(1, Math.max(0, (u - 0.004) / 0.02)) * Math.min(1, Math.max(0, (0.996 - u) / 0.03));
        let k = 0.1;                                                              // the thin wall: a light grey veil
        k += 0.34 * Math.exp(-(((v - 0.84) / 0.07) ** 2));                        // the wall seen edge-on by the sun: a dark line each side
        k += 0.3 * Math.exp(-(((u - 0.955) / 0.022) ** 2)) * (v < 0.9 ? 1 : 0);   // the rim bead
        k += 0.22 * Math.exp(-((u / 0.05) ** 2));                                 // the thick base
        const i = (y * W + x) * 4, q = Math.round(255 * Math.min(1, k * inside * endU));
        d[i] = q; d[i + 1] = Math.max(0, q - 3); d[i + 2] = Math.max(0, q - 2); d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0); mul = new THREE.CanvasTexture(cv); mul.colorSpace = THREE.NoColorSpace; mul.anisotropy = 8; }
    { const { cv, g: c } = canvas(W, Hh); c.fillStyle = "#000"; c.fillRect(0, 0, W, Hh);
      const img = c.getImageData(0, 0, W, Hh), d = img.data, R = rng(53);
      const wob = Array.from({ length: 6 }, () => [R() * 6.28, 2 + R() * 5, 0.004 + R() * 0.01]);
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const u = x / (W - 1), vs = (y / (Hh - 1)) * 2 - 1, v = Math.abs(vs);
        let w = 0; for (const [p, f, a] of wob) w += a * Math.sin(p + u * f * 6.28 + (vs > 0 ? 1.3 : 0));
        let k = 0.9 * Math.exp(-(((v - 0.7 - w) / 0.035) ** 2)) * (0.5 + 0.5 * Math.sin(u * 3.1));      // the bright line inside each dark edge
        k += 0.55 * Math.exp(-(((v - 0.22 - w * 2) / 0.09) ** 2)) * Math.exp(-(((u - 0.12) / 0.1) ** 2)); // the base's small focus
        k += 0.5 * Math.exp(-(((u - 0.9) / 0.03) ** 2)) * Math.exp(-((v / 0.6) ** 2));                    // light through the rim
        k *= Math.min(1, u / 0.03) * Math.min(1, (1 - u) / 0.03);
        const i = (y * W + x) * 4, q = Math.round(255 * Math.min(1, k)); d[i] = q; d[i + 1] = Math.round(q * 0.97); d[i + 2] = Math.round(q * 0.88); d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0); add = new THREE.CanvasTexture(cv); add.colorSpace = THREE.SRGBColorSpace; add.anisotropy = 8; }
    return { mul: mul!, add: add! };
  };
})();
/** the jar's shadow + caustics on a horizontal top at local y = `y` (the jar stands with its base at `baseY`, radius r,
 *  height h; all in the frame of the returned object's PARENT, whose +x / +z are `axes` in world: pass the parent's world
 *  yaw). Follows the live sun every update; fades out without direct sun. */
export const glassShadow = (ctx: KitCtx, o: { at: [number, number]; y: number; baseY: number; r: number; h: number; parentYaw?: number; k?: number; /** false = no drawn shadow strip (the jar casts its own stochastic shadow), only the caustic lines */ mul?: boolean; /** share of the strip (from the base end) that is hidden: it lies in the shadow of what the jar stands on */ skip?: number }) => {
  const T = shadowTex(), g = new THREE.Group(); g.name = "glassShadow";
  const mm = new THREE.MeshBasicMaterial({ map: T.mul, transparent: true, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  mm.blending = THREE.CustomBlending; mm.blendSrc = THREE.ZeroFactor; mm.blendDst = THREE.OneMinusSrcColorFactor; mm.blendSrcAlpha = THREE.ZeroFactor; mm.blendDstAlpha = THREE.OneFactor;
  mm.customProgramCacheKey = () => "home:glassShadowMul";
  const am = new THREE.MeshBasicMaterial({ map: T.add, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  am.customProgramCacheKey = () => "home:glassShadowAdd";
  // local x 0..1 = along the shadow (u), z = across; vertex colours fade the strip in after `skip`
  const geo = new THREE.PlaneGeometry(1, 1, 24, 1); geo.rotateX(-Math.PI / 2); geo.translate(0.5, 0, 0);
  { const pp = geo.getAttribute("position") as THREE.BufferAttribute, col = new Float32Array(pp.count * 3), sk = o.skip ?? 0;
    for (let i = 0; i < pp.count; i++) { const q = sk > 0 ? Math.max(0, Math.min(1, (pp.getX(i) - sk) / 0.07)) : 1, v = q * q * (3 - 2 * q); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
  mm.vertexColors = true; am.vertexColors = true;
  const a = new THREE.Mesh(geo, mm), b = new THREE.Mesh(geo, am); a.renderOrder = 1; b.renderOrder = 2; a.name = "glassShadowMul"; b.name = "glassShadowAdd";
  g.add(a, b);
  const cy = Math.cos(o.parentYaw ?? 0), sy = Math.sin(o.parentYaw ?? 0);
  const update = () => {
    const s = ctx.rig.sunDir, el = Math.atan2(s[1], Math.hypot(s[0], s[2]));
    const on = ctx.sun && ctx.sun.visible !== false && el > 0.05 ? Math.min(1, (ctx.rig.sunIntensity ?? 0) / 5) : 0;
    // the light's horizontal travel (AWAY from the sun) in the parent's frame (world -> local: rotate by -yaw)
    const wx = -s[0], wz = -s[2], n = Math.hypot(wx, wz) || 1, lx = (wx * cy - wz * sy) / n, lz = (wx * sy + wz * cy) / n;
    const ct = 1 / Math.tan(Math.max(0.08, el)), d0 = (o.baseY - o.y) * ct, len = o.h * ct;
    g.position.set(o.at[0] + lx * d0, o.y + 0.0012, o.at[1] + lz * d0);
    g.rotation.y = Math.atan2(-lz, lx);
    g.scale.set(len, 1, o.r * 2.24);
    const k = (o.k ?? 1) * on;
    a.visible = k > 0.02 && o.mul !== false; b.visible = k > 0.02;
    mm.color.setScalar(k);
    am.color.setRGB(1.0, 0.95, 0.84).multiplyScalar(1.5 * k * Math.min(1.4, (ctx.rig.sunIntensity ?? 0) / 7.2));
  };
  update();
  return { object: g, update };
};

// ================================================================ pictograms (canvas, no text)
export type JarIcon = "eye" | "finger";
const INK = "#15171a", PAPER = "#f6f5f0";
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
/** a bold eye / a pointing hand with a speech bubble ("hand" = the hand alone), in a 512 x 512 box at (ox, oy) scaled by s */
export const drawPictogram = (c: CanvasRenderingContext2D, kind: JarIcon | "hand", ox = 0, oy = 0, s = 1, ink = INK, paper = PAPER) => {
  c.save(); c.translate(ox, oy); c.scale(s, s); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = ink; c.fillStyle = ink;
  if (kind === "eye") {
    c.lineWidth = 30;
    c.beginPath(); c.moveTo(52, 272); c.quadraticCurveTo(256, 72, 460, 272); c.quadraticCurveTo(256, 472, 52, 272); c.closePath(); c.stroke();
    c.beginPath(); c.arc(256, 272, 76, 0, Math.PI * 2); c.fill();
    c.fillStyle = paper; c.beginPath(); c.arc(284, 246, 23, 0, Math.PI * 2); c.fill();
    c.lineWidth = 24; for (const [x0, y0, x1, y1] of [[256, 138, 256, 92], [168, 158, 148, 116], [344, 158, 364, 116]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  } else {
    // the hand: a cuff, a fist with three curled fingers, the thumb on top, the index finger straight out to the right
    rr(c, 30, 322, 46, 122, 10); c.fill();
    rr(c, 88, 300, 176, 164, 38); c.fill();
    rr(c, 128, 258, 124, 70, 32); c.fill();
    rr(c, 170, 318, 316, 58, 29); c.fill();
    c.strokeStyle = paper; c.lineWidth = 9;
    for (const y of [389, 424]) { c.beginPath(); c.moveTo(178, y); c.lineTo(262, y); c.stroke(); }
    c.beginPath(); c.moveTo(150, 330); c.lineTo(250, 330); c.stroke();
    if (kind === "finger") {
      // the speech bubble: three dots, a tail down to the hand
      c.fillStyle = ink; rr(c, 238, 48, 244, 168, 52); c.fill();
      c.beginPath(); c.moveTo(286, 206); c.lineTo(256, 272); c.lineTo(344, 206); c.closePath(); c.fill();
      c.fillStyle = paper; for (const x of [300, 360, 420]) { c.beginPath(); c.arc(x, 132, 18, 0, Math.PI * 2); c.fill(); }
    }
  }
  c.restore();
};
const signTex = (kind: JarIcon, seed: number) => {
  const { cv, g: c } = canvas(512, 512), R = rng(seed);
  c.fillStyle = PAPER; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) { c.fillStyle = `rgba(${R() < 0.5 ? "110,105,95" : "255,255,252"},${0.03 + R() * 0.04})`; c.fillRect(R() * 512, R() * 512, 1 + R() * 2, 1 + R() * 2); }
  drawPictogram(c, kind, 26, 20, 0.9);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
/** the bar's face: a dark glossy strip, a round-button pictogram at the left end, an empty channel, the end mark.
 *  Returns the texture + the channel's place on it (fractions of the strip) */
const BAR = { w: 0.176, h: 0.05, ch0: 0.27, ch1: 0.905, chH: 0.74 };      // the channel: from / to along the strip, height share
const barTex = () => {
  const W = 1056, H = 300, { cv, g: c } = canvas(W, H);
  c.fillStyle = "#14171b"; c.fillRect(0, 0, W, H);
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(255,255,255,0.07)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,0.25)"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  const x0 = BAR.ch0 * W, x1 = BAR.ch1 * W, hh = BAR.chH * H, y0 = (H - hh) / 2;
  c.fillStyle = "#2a3037"; rr(c, x0, y0, x1 - x0, hh, 16); c.fill();
  c.strokeStyle = "rgba(0,0,0,0.5)"; c.lineWidth = 5; rr(c, x0, y0, x1 - x0, hh, 16); c.stroke();
  // the round button (a push button from above): a ring + a disc
  const bx = 0.135 * W, by = H / 2;
  c.strokeStyle = "#eef2f5"; c.lineWidth = 20; c.beginPath(); c.arc(bx, by, 88, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#eef2f5"; c.beginPath(); c.arc(bx, by, 50, 0, Math.PI * 2); c.fill();
  // the end mark: a tick the full height of the channel + a small flag
  c.fillStyle = "#eef2f5"; rr(c, x1 + 12, y0 - 14, 20, hh + 28, 6); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

// ================================================================ the station: plinth + bar + pictogram + jar
export type StationOpts = { icon: JarIcon; jar?: JarOpts; w?: number; h?: number; d?: number; signSize?: number; signGap?: number; fill?: C3; fillK?: number; seed?: number; env?: THREE.Texture | null;
  /** which side the stand's rod is on (-1 = the left as seen from the front, +1 = the right): the outer side of a pair */
  rodSide?: -1 | 1 };
/** local: the plinth's footprint centred on the origin on y = 0 (the table top), the front (bar, pictogram) toward +z */
export const jarStation = (ctx: KitCtx, o: StationOpts) => {
  const W = o.w ?? 0.19, H = o.h ?? 0.06, D = o.d ?? 0.19, S = o.signSize ?? 0.118, g = new THREE.Group(); g.name = "jarStation:" + o.icon;
  const white = pbr({ color: [0.9, 0.9, 0.88], rough: 0.42, peel: 0.9, tile: 0.12, roughVar: 0.35, prints: 4 });
  const dark = pbr({ color: [0.07, 0.075, 0.08], rough: 0.6, peel: 0 });
  g.add(mesh(rboxG(-W / 2 + 0.006, 0, -D / 2 + 0.006, W / 2 - 0.006, 0.007, D / 2 - 0.006, 0.001), dark, true, "plinthFoot"));          // a shadow gap: the plinth floats 7 mm
  g.add(mesh(rboxG(-W / 2, 0.006, -D / 2, W / 2, H, D / 2, 0.007, 3), white, true, "plinth"));
  g.add(contactBlob(W * 1.25, D * 1.3, 0.55));
  // ---- the TRIES bar in the front face
  const bt = barTex();
  const faceM = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.22, metalness: 0, emissive: new THREE.Color(1, 1, 1), emissiveMap: bt, emissiveIntensity: 0.55 });
  faceM.customProgramCacheKey = () => "home:barface"; if (o.env) ownEnv(faceM, o.env, 0.5);
  const by = 0.006 + (H - 0.006) / 2, fz = D / 2 + 0.0008;
  g.add(mesh(rboxG(-BAR.w / 2 - 0.002, by - BAR.h / 2 - 0.002, D / 2 - 0.003, BAR.w / 2 + 0.002, by + BAR.h / 2 + 0.002, D / 2 + 0.0004, 0.002), dark, false, "barBezel"));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BAR.w, BAR.h), faceM); face.position.set(0, by, fz); face.name = "barFace"; face.receiveShadow = true; g.add(face);
  const L = (BAR.ch1 - BAR.ch0) * BAR.w, fh = BAR.chH * BAR.h * 0.86;
  const fg = new THREE.PlaneGeometry(L, fh); fg.translate(L / 2, 0, 0);
  const fc = o.fill ?? [0.42, 0.76, 1.0], fillM = glow(fc, o.fillK ?? 2.0);
  const fill = new THREE.Mesh(fg, fillM); fill.position.set(-BAR.w / 2 + BAR.ch0 * BAR.w, by, fz + 0.0006); fill.name = "barFill"; fill.scale.x = 1e-4; g.add(fill);
  // the bright leading edge of the fill (a small cap that rides its end)
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(0.004, fh), glow([0.9, 0.97, 1.0], (o.fillK ?? 2.1) * 1.5)); cap.position.set(fill.position.x, by, fz + 0.0009); cap.name = "barCap"; g.add(cap);
  // ---- the jar
  const jar = glassJar(ctx, { ...o.jar, env: o.env ?? o.jar?.env, seed: o.seed });
  jar.object.position.y = H; g.add(jar.object);
  // ---- the pictogram plate on a retort stand: a rod at the plinth's outer back corner (outside the jar's outline,
  // so nothing stands behind the glass), a boss head, a short arm to the plate
  const steel = pbr({ color: [0.72, 0.73, 0.74], rough: 0.32, metal: 1, brushed: true, tile: 0.05 });
  const sd = o.rodSide ?? -1, rx = sd * (W / 2 - 0.011), rz = -D / 2 + 0.016;
  const sy = H + jar.h + (o.signGap ?? 0.024) + S / 2, sz = -0.02, rodTop = sy + 0.03;
  g.add(mesh(at(cylG(0.0036, 0.0036, rodTop - H, 12), rx, H + (rodTop - H) / 2, rz), steel, true, "signRod"));
  g.add(mesh(at(cylG(0.01, 0.012, 0.008, 20), rx, H + 0.004, rz), steel, true, "signRodFoot"));
  g.add(mesh(rboxG(rx - 0.009, sy - 0.011, rz - 0.009, rx + 0.009, sy + 0.011, rz + 0.009, 0.003), steel, true, "signBoss"));
  { const ax = sd * (S / 2 - 0.004), len = Math.hypot(rx - ax, rz - (sz - 0.004)), ang = Math.atan2(rz - (sz - 0.004), rx - ax);
    const arm = mesh(cylG(0.003, 0.003, len, 10), steel, true, "signArm"); arm.rotation.set(0, -ang, Math.PI / 2); arm.position.set((rx + ax) / 2, sy, (rz + sz - 0.004) / 2); g.add(arm); }
  g.add(mesh(rboxG(-S / 2, sy - S / 2, sz - 0.004, S / 2, sy + S / 2, sz + 0.0015, 0.0022), pbr({ color: [0.93, 0.93, 0.91], rough: 0.4, peel: 0.4, tile: 0.1 }), true, "signPlate"));
  const st = signTex(o.icon, 31 + (o.seed ?? 0));
  const signM = new THREE.MeshStandardMaterial({ map: st, roughness: 0.5, metalness: 0, emissive: new THREE.Color(1, 1, 1), emissiveMap: st, emissiveIntensity: 0.22 });
  signM.customProgramCacheKey = () => "home:signface";
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.006, S - 0.006), signM); sg.position.set(0, sy, sz + 0.0021); sg.name = "signFace"; sg.receiveShadow = true; g.add(sg);
  const jarSpace = (origin: V3): JarSpace => ({ centre: [origin[0], origin[1] + H, origin[2]], innerR: jar.innerR, floorY: jar.floorY, topY: jar.topY });
  return { object: g, jar, jarSpace, plinthH: H, signY: sy, signFace: signM, barFace: faceM,
    /** fill the bar: 0 = empty, 1 = at the end mark */
    setBar: (k: number) => { const q = Math.max(0, Math.min(1, k)); fill.scale.x = Math.max(1e-4, q); cap.position.x = fill.position.x + L * q; cap.visible = q > 0.004 && q < 0.999; } };
};

// ================================================================ ball timing: the tink lands on the cue
/** drop times such that ball k's FIRST impact is at cues[k]. `mk(k, t)` builds the drop released at time t. The sim is
 *  re-run (at most `iters` times): a later ball lands on the pile, so its fall is shorter than the first one's. */
export const dropsForImpacts = (jar: JarSpace, cues: number[], mk: (k: number, t: number) => BallDrop, sim: Parameters<typeof ballSim>[2] = {}, iters = 5) => {
  const floor = jar.centre[1] + jar.floorY + (sim?.r ?? 0.025);
  const ts = cues.map((c, k) => c - Math.sqrt(Math.max(0.01, 2 * (mk(k, 0).from[1] - floor) / 9.81)));
  let drops: BallDrop[] = [], tracks: BallTrack[] = [], err = 0;
  for (let it = 0; it < iters; it++) {
    drops = ts.map((t, k) => mk(k, t));
    tracks = ballSim(jar, drops, sim);
    err = 0;
    tracks.forEach((tr, k) => { if (tr.firstImpact > 0) { const e = tr.firstImpact - cues[k]; err = Math.max(err, Math.abs(e)); ts[k] -= e; } });
    if (err < 0.004) break;
  }
  return { drops, tracks, err };
};

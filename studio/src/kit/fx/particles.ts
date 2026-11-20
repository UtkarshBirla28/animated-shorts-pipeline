// FX / particles: GPU billboards whose state is a PURE function of film time (seeded per particle; nothing integrates
// frame to frame, so any sub-frame renders the same in any tab). Lit by the real sun: each particle reads the sun's
// shadow map, so dust / smoke glow only where the sun reaches. Presets: motes (sun dust), puffs (footstep dust events),
// smoke, steam, sparks, embers, fireflies, rain (+ ground splashes) and a wet-surface hook.
//   const m = fx.motes(ctx, { box: [[-3, 0.1, -14], [3, 3.7, 4]], count: 2600 }); set.add(m.object); (update via Built)
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../core/ctx";

const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export const WIND_FX = new THREE.Vector3(0.94, 0, 0.34).normalize();

/** shared shader parts: sun visibility from the sun shadow map (RGBA-packed depth) */
const SUNVIS = /* glsl */ `
#include <packing>
uniform sampler2D tSunShadow; uniform mat4 uSunMat; uniform float uHasShadow;
float fxSunVis( vec3 p ) {
  if ( uHasShadow < 0.5 ) return 1.0;
  vec4 sc = uSunMat * vec4( p, 1.0 ); sc.xyz /= sc.w;
  if ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 ) return 1.0;
  return step( sc.z - 0.002, unpackRGBAToDepth( texture2D( tSunShadow, sc.xy ) ) );
}`;

export type FxBase = { on?: boolean; density?: number; seed?: number };
type Kind = "motes" | "puff" | "smoke" | "steam" | "sparks" | "embers" | "fireflies" | "rain" | "splash";
type Spec = {
  kind: Kind; count: number; life: number; size: [number, number]; color: THREE.Color; alpha: number; additive: boolean;
  /** per particle: start position, velocity, birth phase (0..1 of life, or absolute event time when events are used) */
  init: (R: () => number, i: number) => { p: V3; v: V3; b: number; r?: number };
  gravity?: V3; wind?: number; turb?: number; events?: boolean; stretch?: number; lit?: number; glow?: number; wrapBox?: [V3, V3];
};
const VERT = /* glsl */ `
attribute vec4 aP0; attribute vec4 aP1;
uniform float uT; uniform float uLife; uniform vec2 uSize; uniform vec3 uGrav; uniform vec3 uWindV; uniform float uTurb; uniform float uEvents;
uniform float uStretch; uniform vec3 uWrapMin; uniform vec3 uWrapSize; uniform float uWrap; uniform vec3 uCamPos; uniform float uDens;
varying float vA; varying float vVis; varying vec2 vUv; varying float vR;
` + SUNVIS + /* glsl */ `
void main() {
  float age = uEvents > 0.5 ? uT - aP0.w : mod( uT + aP0.w * uLife, uLife );
  float u = age / uLife;
  float alive = step( 0.0, age ) * step( age, uLife ) * step( aP1.w, uDens );
  vec3 p = aP0.xyz + aP1.xyz * age + 0.5 * uGrav * age * age + uWindV * age;
  p += uTurb * vec3( sin( age * 1.3 + aP1.w * 40.0 ), 0.6 * sin( age * 0.9 + aP1.w * 23.0 ), sin( age * 1.1 + aP1.w * 61.0 ) ) * ( 0.3 + u );
  if ( uWrap > 0.5 ) p = uWrapMin + uCamPos * vec3( 1.0, 0.0, 1.0 ) + mod( p - uCamPos * vec3( 1.0, 0.0, 1.0 ) - uWrapMin, uWrapSize );
  float sz = mix( uSize.x, uSize.y, sqrt( clamp( u, 0.0, 1.0 ) ) ) * ( 0.7 + 0.6 * fract( aP1.w * 7.13 ) ) * alive;
  vec4 mv = viewMatrix * vec4( p, 1.0 );
  vec2 q = position.xy;
  if ( uStretch > 0.0 ) {
    // streak along the screen-space velocity (rain / sparks)
    vec3 vel = aP1.xyz + uGrav * age + uWindV;
    vec4 mv2 = viewMatrix * vec4( p - vel * uStretch, 1.0 );
    vec2 d = mv2.xy - mv.xy; float L = length( d ) + 1e-5; vec2 dn = d / L, nn = vec2( -dn.y, dn.x );
    mv.xy += nn * q.x * sz + dn * ( q.y + 0.5 ) * L;
  } else mv.xy += q * sz;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy + 0.5;
  vA = alive * smoothstep( 0.0, 0.12, u ) * ( 1.0 - smoothstep( 0.55, 1.0, u ) );
  vVis = fxSunVis( p ); vR = aP1.w;
}`;
const FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uAlpha; uniform vec3 uSunCol; uniform vec3 uAmb; uniform float uLit; uniform float uGlow; uniform float uAdd;
varying float vA; varying float vVis; varying vec2 vUv; varying float vR;
void main() {
  vec2 d = vUv - 0.5; float r = length( d ) * 2.0;
  float a = smoothstep( 1.0, 0.0, r ); a *= a;
  if ( a * vA < 0.003 ) discard;
  vec3 light = mix( vec3( 1.0 ), uAmb + uSunCol * vVis, uLit );
  vec3 c = uCol * light * ( 0.85 + 0.3 * vR ) + uCol * uGlow;
  float al = a * vA * uAlpha;
  gl_FragColor = uAdd > 0.5 ? vec4( c * al, 1.0 ) : vec4( c, al );
}`;

const quad = (() => { const g = new THREE.PlaneGeometry(1, 1); return g; })();
const build = (ctx: KitCtx, s: Spec, o: FxBase & { tint?: THREE.Color }): Built => {
  const R = rng((o.seed ?? 1) * 97 + s.kind.length * 13);
  const n = s.count;
  const p0 = new Float32Array(n * 4), p1 = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const q = s.init(R, i); p0.set([...q.p, q.b], i * 4); p1.set([...q.v, q.r ?? R()], i * 4); }
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.setAttribute("position", quad.getAttribute("position"));
  g.setAttribute("aP0", new THREE.InstancedBufferAttribute(p0, 4)); g.setAttribute("aP1", new THREE.InstancedBufferAttribute(p1, 4));
  g.instanceCount = n;
  const wrap = s.wrapBox;
  const U = {
    uT: { value: 0 }, uLife: { value: s.life }, uSize: { value: new THREE.Vector2(...s.size) }, uGrav: { value: new THREE.Vector3(...(s.gravity ?? [0, 0, 0])) },
    uWindV: { value: WIND_FX.clone().multiplyScalar(s.wind ?? 0) }, uTurb: { value: s.turb ?? 0 }, uEvents: { value: s.events ? 1 : 0 }, uStretch: { value: s.stretch ?? 0 },
    uWrapMin: { value: new THREE.Vector3(...(wrap ? wrap[0] : [0, 0, 0])) }, uWrapSize: { value: new THREE.Vector3(...(wrap ? wrap[1] : [1, 1, 1])) }, uWrap: { value: wrap ? 1 : 0 },
    uCamPos: { value: new THREE.Vector3() }, uDens: { value: o.density ?? 1 },
    tSunShadow: { value: null as THREE.Texture | null }, uSunMat: { value: new THREE.Matrix4() }, uHasShadow: { value: 0 },
    uCol: { value: (o.tint ?? s.color).clone() }, uAlpha: { value: s.alpha }, uSunCol: { value: new THREE.Color(1, 0.86, 0.69).multiplyScalar(1) }, uAmb: { value: new THREE.Color(0.55, 0.56, 0.6) },
    uLit: { value: s.lit ?? 1 }, uGlow: { value: s.glow ?? 0 }, uAdd: { value: s.additive ? 1 : 0 },
  };
  const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: s.additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
  m.customProgramCacheKey = () => "fx:particles";
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.name = "fx-" + s.kind;
  mesh.visible = o.on !== false;
  mesh.onBeforeRender = () => {
    const sun = ctx.sun;
    if (sun && sun.shadow.map) { U.tSunShadow.value = sun.shadow.map.texture; U.uSunMat.value.copy(sun.shadow.matrix); U.uHasShadow.value = 1;
      U.uSunCol.value.copy(sun.color).multiplyScalar(sun.intensity / 7.2); }
  };
  return { object: mesh, update: (t, cam) => { U.uT.value = t; U.uCamPos.value.setFromMatrixPosition(cam.matrixWorld); } };
};
const box = (R: () => number, b: [V3, V3]): V3 => [b[0][0] + (b[1][0] - b[0][0]) * R(), b[0][1] + (b[1][1] - b[0][1]) * R(), b[0][2] + (b[1][2] - b[0][2]) * R()];

/** dust / pollen motes drifting in the sun (glow only where the sun's shadow map says sunlight) */
export const motes = (ctx: KitCtx, o: FxBase & { box: [V3, V3]; count?: number }) => build(ctx, {
  kind: "motes", count: o.count ?? 2400, life: 14, size: [0.006, 0.009], color: new THREE.Color(1, 0.88, 0.66), alpha: 1, additive: true, lit: 1, wind: 0.05, turb: 0.25,
  init: (R) => ({ p: box(R, o.box), v: [(R() - 0.5) * 0.04, (R() - 0.4) * 0.03, (R() - 0.5) * 0.04], b: R() }),
}, o);

/** footstep / landing dust puffs: one burst per event { t, pos } (pure: age = t - event time) */
export const puffs = (ctx: KitCtx, o: FxBase & { events: { t: number; pos: V3; k?: number }[]; perPuff?: number; color?: THREE.ColorRepresentation; size?: [number, number]; alpha?: number }) => {
  const per = o.perPuff ?? 14;
  return build(ctx, {
    kind: "puff", count: Math.max(1, o.events.length * per), life: 1.2, size: o.size ?? [0.04, 0.26], color: new THREE.Color(o.color ?? 0xc9b49a), alpha: o.alpha ?? 0.25, additive: false, lit: 1, gravity: [0, -0.05, 0], wind: 0.12, turb: 0.03, events: true,
    init: (R, i) => { const e = o.events[Math.floor(i / per)] ?? o.events[0]; const a = R() * Math.PI * 2, sp = (0.25 + 0.35 * R()) * (e.k ?? 1);
      return { p: [e.pos[0] + Math.cos(a) * 0.05, e.pos[1] + 0.015, e.pos[2] + Math.sin(a) * 0.05], v: [Math.cos(a) * sp, 0.04 + 0.08 * R(), Math.sin(a) * sp * 0.7], b: e.t + R() * 0.05 }; },
  }, o);
};
/** a soft, lit, wind-driven smoke column (chimney, fire, exhaust) */
export const smoke = (ctx: KitCtx, o: FxBase & { pos: V3; count?: number; rise?: number; spread?: number; color?: THREE.ColorRepresentation; size?: [number, number] }) => build(ctx, {
  kind: "smoke", count: o.count ?? 160, life: 7, size: o.size ?? [0.25, 2.2], color: new THREE.Color(o.color ?? 0x9a958e), alpha: 0.28, additive: false, lit: 1, wind: 0.7, turb: 0.35,
  init: (R) => ({ p: [o.pos[0] + (R() - 0.5) * (o.spread ?? 0.2), o.pos[1], o.pos[2] + (R() - 0.5) * (o.spread ?? 0.2)], v: [(R() - 0.5) * 0.1, (o.rise ?? 0.6) * (0.7 + 0.6 * R()), (R() - 0.5) * 0.1], b: R() }),
}, o);
/** steam from a cup / pot / vent: small, bright, fast-fading */
export const steam = (ctx: KitCtx, o: FxBase & { pos: V3; count?: number; size?: [number, number] }) => build(ctx, {
  kind: "steam", count: o.count ?? 60, life: 2.4, size: o.size ?? [0.02, 0.16], color: new THREE.Color(0xf4f1ec), alpha: 0.22, additive: false, lit: 0.6, glow: 0.2, wind: 0.08, turb: 0.04,
  init: (R) => ({ p: [o.pos[0] + (R() - 0.5) * 0.04, o.pos[1], o.pos[2] + (R() - 0.5) * 0.04], v: [(R() - 0.5) * 0.02, 0.12 + 0.08 * R(), (R() - 0.5) * 0.02], b: R() }),
}, o);
/** sparks (grinder, fire, short circuit): bright additive streaks with gravity */
export const sparks = (ctx: KitCtx, o: FxBase & { pos: V3; dir?: V3; count?: number; speed?: number }) => build(ctx, {
  kind: "sparks", count: o.count ?? 120, life: 0.7, size: [0.006, 0.003], color: new THREE.Color(1.0, 0.62, 0.22), alpha: 1, additive: true, lit: 0, glow: 5, gravity: [0, -6, 0], stretch: 0.03,
  init: (R) => { const d = o.dir ?? [0, 1, 0], sp = (o.speed ?? 3) * (0.5 + R()); return { p: [...o.pos] as V3, v: [d[0] * sp + (R() - 0.5) * 2, d[1] * sp + R() * 1.5, d[2] * sp + (R() - 0.5) * 2], b: R() }; },
}, o);
/** embers rising from a fire */
export const embers = (ctx: KitCtx, o: FxBase & { pos: V3; count?: number; radius?: number }) => build(ctx, {
  kind: "embers", count: o.count ?? 80, life: 3.5, size: [0.012, 0.006], color: new THREE.Color(1.0, 0.45, 0.12), alpha: 1, additive: true, lit: 0, glow: 4, wind: 0.25, turb: 0.25,
  init: (R) => ({ p: [o.pos[0] + (R() - 0.5) * (o.radius ?? 0.3), o.pos[1], o.pos[2] + (R() - 0.5) * (o.radius ?? 0.3)], v: [0, 0.5 + 0.6 * R(), 0], b: R() }),
}, o);
/** fireflies wandering at dusk / night */
export const fireflies = (ctx: KitCtx, o: FxBase & { box: [V3, V3]; count?: number }) => build(ctx, {
  kind: "fireflies", count: o.count ?? 60, life: 9, size: [0.02, 0.02], color: new THREE.Color(0.8, 1.0, 0.35), alpha: 1, additive: true, lit: 0, glow: 3, turb: 0.6,
  init: (R) => ({ p: box(R, o.box), v: [(R() - 0.5) * 0.15, (R() - 0.5) * 0.05, (R() - 0.5) * 0.15], b: R() }),
}, o);
/** rain streaks in a box that follows the lens + ground splashes; pair with wetHook() on ground materials */
export const rain = (ctx: KitCtx, o: FxBase & { count?: number; box?: [V3, V3]; splashes?: number; groundY?: number }) => {
  const b = o.box ?? [[-6, 0, -14], [6, 7, 2]];
  const size: V3 = [b[1][0] - b[0][0], b[1][1] - b[0][1], b[1][2] - b[0][2]];
  const streaks = build(ctx, {
    kind: "rain", count: o.count ?? 5000, life: 0.9, size: [0.0035, 0.0035], color: new THREE.Color(0.8, 0.84, 0.9), alpha: 0.55, additive: false, lit: 0.5, glow: 0.3, stretch: 0.045, wind: 0.6,
    init: (R) => ({ p: [b[0][0] + R() * size[0], b[1][1] + R() * size[1] * 0.2, b[0][2] + R() * size[2]], v: [0, -8.5 - 2 * R(), 0], b: R() }), wrapBox: [b[0], size],
  }, o);
  const spl = build(ctx, {
    kind: "splash", count: o.splashes ?? 900, life: 0.28, size: [0.005, 0.05], color: new THREE.Color(0.85, 0.88, 0.92), alpha: 0.45, additive: false, lit: 0.5, glow: 0.2,
    init: (R) => ({ p: [b[0][0] + R() * size[0], (o.groundY ?? 0) + 0.01, b[0][2] + R() * size[2]], v: [0, 0.05, 0], b: R() }), wrapBox: [[b[0][0], (o.groundY ?? 0) + 0.005, b[0][2]], [size[0], 0.02, size[2]]],
  }, o);
  const g = new THREE.Group(); g.name = "fx-rain"; g.add(streaks.object, spl.object); g.visible = o.on !== false;
  return { object: g, update: (t: number, cam: THREE.Camera) => { streaks.update!(t, cam); spl.update!(t, cam); } } as Built;
};

/** WET SURFACE hook: one shared uniform; patch any MeshStandardMaterial so `WET.value` (0..1) darkens it and makes it
 *  glossy (puddle-ish sheen in the joints where its AO map is dark). Call before the material compiles. */
export const WET = { value: 0 };
export const wetHook = (m: THREE.MeshStandardMaterial, key: string) => {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) {
    prev.call(this, sh, r);
    sh.uniforms.uWet = WET;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uWet;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix( roughnessFactor, 0.08, uWet * 0.85 );")
      .replace("#include <color_fragment>", "#include <color_fragment>\n diffuseColor.rgb *= mix( 1.0, 0.62, uWet );");
  };
  const k0 = m.customProgramCacheKey();
  m.customProgramCacheKey = () => k0 + "|wet:" + key;
  return m;
};

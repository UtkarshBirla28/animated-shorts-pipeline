// kit/vehicles (TRAIN owner): the steam engine's moving air, as GPU billboards whose state is a PURE function of film
// time (seeded per particle; nothing integrates, so any sub-frame of any tab renders the same picture):
//   locoSmoke  the chimney's coal smoke, a long rolling plume that the train's own wind lays back along the train
//   locoSteam  white steam: the safety valve's feather, the cylinder drain cocks' low jets, the whistle
// Particles live in the coordinates of the group they are added to (add them to the LOCO group: the "wind" is the
// train's speed through still air, +Z in the loco frame). Shaded as soft lit balls (a fake sphere normal against the
// sun: bright sunlit tops, cool shaded bellies), alpha-blended, no depth write.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";

export type PlumeOpts = {
  /** where they are born (group coordinates) */
  pos: V3;
  count?: number; life?: number;
  /** the train's air speed (m/s, along +Z of the group) the plume settles to, + how fast it gets there (s) */
  wind?: number | ((t: number) => number); windTau?: number;
  /** initial velocity (m/s) and its random spread */
  vel?: V3; spread?: number;
  /** start / end size (m), opacity, colours: lit side + shaded side (linear-ish sRGB hex) */
  size?: [number, number]; alpha?: number; lit?: THREE.ColorRepresentation; shade?: THREE.ColorRepresentation;
  /** birth area half-size (m) */
  radius?: number;
  /** world-space sun direction (toward the sun) for the fake shading */
  sunDir?: V3;
  /** a buoyant rise added over life (m/s) and a sideways cross-wind (m/s, +X) */
  rise?: number; cross?: number;
  /** turbulence amplitude (m) */
  turb?: number;
  seed?: number;
  /** emission strength 0..1 at t (fades the young particles: e.g. the drain cocks only while starting) */
  on?: (t: number) => number;
};

const VERT = /* glsl */ `
attribute vec4 aA; attribute vec4 aB;
uniform float uT; uniform float uLife; uniform vec2 uSize; uniform float uWind; uniform float uTau; uniform float uRise; uniform float uCross; uniform float uTurb; uniform float uOn;
uniform vec3 uSunW;
varying float vA; varying vec2 vQ; varying vec3 vSunV; varying float vU; varying float vR;
void main() {
  float age = mod( uT + aA.w * uLife, uLife ), u = age / uLife;
  // the velocity decays to the train's wind (+Z) with time constant uTau
  float e = 1.0 - exp( -age / uTau );
  vec3 p = aA.xyz + aB.xyz * uTau * e;
  p.z += uWind * ( age - uTau * e );
  p.y += uRise * age;
  p.x += uCross * age;
  float r = aB.w;
  p += uTurb * ( 0.2 + u ) * vec3( sin( age * 2.1 + r * 40.0 ), 0.7 * sin( age * 1.7 + r * 23.0 ), sin( age * 1.3 + r * 61.0 ) );
  float sz = mix( uSize.x, uSize.y, pow( u, 0.6 ) ) * ( 0.7 + 0.6 * fract( r * 7.13 ) );
  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  float c = cos( r * 30.0 + age * 0.6 ), s = sin( r * 30.0 + age * 0.6 );
  vec2 q = vec2( c * position.x - s * position.y, s * position.x + c * position.y );
  mv.xy += q * sz;
  gl_Position = projectionMatrix * mv;
  vQ = position.xy * 2.0;
  vSunV = normalize( ( viewMatrix * vec4( uSunW, 0.0 ) ).xyz );
  float born = smoothstep( 0.0, 0.06, u );
  vA = born * ( 1.0 - smoothstep( 0.45, 1.0, u ) ) * mix( 1.0, uOn, 1.0 - smoothstep( 0.0, 0.25, u ) );
  vU = u; vR = r;
}`;
const FRAG = /* glsl */ `
uniform vec3 uLit; uniform vec3 uShade; uniform float uAlpha;
varying float vA; varying vec2 vQ; varying vec3 vSunV; varying float vU; varying float vR;
void main() {
  float rr = dot( vQ, vQ );
  if ( rr > 1.0 ) discard;
  // a lumpy edge (cauliflower billows), a fake sphere normal for the light
  float edge = 1.0 - smoothstep( 0.35, 1.0, rr + 0.18 * sin( atan( vQ.y, vQ.x ) * 5.0 + vR * 20.0 ) );
  vec3 n = normalize( vec3( vQ, sqrt( max( 0.0, 1.0 - rr ) ) ) );
  float l = clamp( dot( n, vSunV ) * 0.6 + 0.45, 0.0, 1.0 );
  vec3 c = mix( uShade, uLit, l ) * ( 0.9 + 0.2 * vR );
  float a = edge * vA * uAlpha;
  if ( a < 0.004 ) discard;
  gl_FragColor = vec4( c, a );
}`;
const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

export const plume = (ctx: KitCtx, o: PlumeOpts): Built => {
  void ctx;
  const n = o.count ?? 400, R = rng(o.seed ?? 3), life = o.life ?? 3, rad = o.radius ?? 0.1, sp = o.spread ?? 0.5, v = o.vel ?? [0, 3, 0];
  const A = new Float32Array(n * 4), Bv = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    A.set([o.pos[0] + (R() - 0.5) * 2 * rad, o.pos[1] + (R() - 0.5) * rad, o.pos[2] + (R() - 0.5) * 2 * rad, R()], i * 4);
    Bv.set([v[0] + (R() - 0.5) * sp, v[1] * (0.7 + 0.6 * R()), v[2] + (R() - 0.5) * sp, R()], i * 4);
  }
  const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  g.setAttribute("aA", new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute("aB", new THREE.InstancedBufferAttribute(Bv, 4));
  g.instanceCount = n;
  const sd = new THREE.Vector3(...(o.sunDir ?? [0.35, 0.55, -0.75])).normalize();
  const U = {
    uT: { value: 0 }, uLife: { value: life }, uSize: { value: new THREE.Vector2(...(o.size ?? [0.5, 3.5])) }, uWind: { value: 0 }, uTau: { value: o.windTau ?? 0.6 },
    uRise: { value: o.rise ?? 0.4 }, uCross: { value: o.cross ?? 0 }, uTurb: { value: o.turb ?? 0.35 }, uOn: { value: 1 }, uSunW: { value: sd },
    uLit: { value: new THREE.Color(o.lit ?? "#fbf3e6") }, uShade: { value: new THREE.Color(o.shade ?? "#6f7684") }, uAlpha: { value: o.alpha ?? 0.6 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  mat.name = "steam-fx";
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 5;
  const wind = typeof o.wind === "function" ? o.wind : () => (o.wind as number | undefined) ?? 10;
  return { object: mesh, update: (t) => { U.uT.value = t; U.uWind.value = wind(t); U.uOn.value = o.on ? Math.max(0, Math.min(1, o.on(t))) : 1; } };
};

/** the chimney smoke of a working engine: a dense, rolling, grey-white plume laid back by the train's wind */
export const locoSmoke = (ctx: KitCtx, o: { pos: V3; speed: number | ((t: number) => number); sunDir?: V3; count?: number; dark?: number; seed?: number }) => plume(ctx, {
  pos: o.pos, count: o.count ?? 520, life: 3.6, wind: o.speed, windTau: 0.45, vel: [0, 5.5, -2], spread: 1.2, size: [0.55, 4.2], alpha: 0.72,
  lit: o.dark ? "#d9d4cc" : "#fbf4e8", shade: o.dark ? "#3c3f47" : "#a3afc4", radius: 0.12, rise: 0.5, turb: 0.55, sunDir: o.sunDir, seed: o.seed ?? 11,
});
/** white steam: the safety valve's feather (up + back) */
export const valveSteam = (ctx: KitCtx, o: { pos: V3; speed: number | ((t: number) => number); sunDir?: V3; on?: (t: number) => number }) => plume(ctx, {
  pos: o.pos, count: 160, life: 1.3, wind: o.speed, windTau: 0.25, vel: [0, 6, 0], spread: 0.6, size: [0.12, 1.4], alpha: 0.55, lit: "#ffffff", shade: "#a9b6c8", radius: 0.05,
  rise: 0.3, turb: 0.15, sunDir: o.sunDir, seed: 23, on: o.on,
});
/** the cylinder drain cocks: low white jets sideways and forward, hugging the rails */
export const drainCocks = (ctx: KitCtx, o: { pos: V3; side: 1 | -1; speed: number | ((t: number) => number); sunDir?: V3; on?: (t: number) => number }) => plume(ctx, {
  pos: o.pos, count: 140, life: 1.1, wind: o.speed, windTau: 0.3, vel: [o.side * 3.2, -0.3, -1.5], spread: 0.8, size: [0.1, 1.2], alpha: 0.5, lit: "#ffffff", shade: "#a3b0c2",
  radius: 0.04, rise: 0.35, turb: 0.12, sunDir: o.sunDir, seed: o.side > 0 ? 31 : 37, on: o.on,
});
/** a thin wisp of steam leaking from the cab fittings (the injector overflow, the whistle valve) */
export const wisp = (ctx: KitCtx, o: { pos: V3; speed: number | ((t: number) => number); sunDir?: V3 }) => plume(ctx, {
  pos: o.pos, count: 50, life: 1.0, wind: o.speed, windTau: 0.5, vel: [0, 1.2, 0], spread: 0.3, size: [0.04, 0.45], alpha: 0.35, lit: "#ffffff", shade: "#b8c2cf", radius: 0.02,
  rise: 0.2, turb: 0.06, sunDir: o.sunDir, seed: 41,
});

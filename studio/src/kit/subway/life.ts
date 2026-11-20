// KIT / SUBWAY: life for underground sets, all pure functions of t (seeded hashes, no state):
//   stutter(t, seed)   a failing fluorescent / LED tube: on, then bursts of fast drop-outs every few seconds
//   drips(ctx, o)      water drops forming on a stained ceiling spot, falling, and a ripple ring on the puddle below
//   lampMotes(ctx, o)  dust motes that glow only near the lamps (the fx motes are sun-lit: underground they would not show)
//   ratCard(ctx, o)    a small cartoon rat (inked, like every character) running a path: the NYC in-joke
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../core/ctx";
import { card, type CardBuilt } from "../cards/card";
import { ringTex } from "./tex";

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** a failing tube: 1 most of the time; every `period` s (seeded) a 0.25-0.9 s burst of fast flickers and dips to ~0.08 */
export const stutter = (t: number, seed = 1, period = 3.4) => {
  const k = Math.floor(t / period), u = t - k * period, h = hash(k * 13.1 + seed * 7.7);
  const start = period * (0.15 + 0.5 * hash(k * 3.3 + seed)), len = 0.25 + 0.65 * h;
  if (h < 0.2 || u < start || u > start + len) return 1;              // ~20 % of the periods are calm
  const f = Math.floor((u - start) * 22), b = hash(f * 1.7 + k * 9.1 + seed);
  return b < 0.45 ? 0.08 + 0.12 * b : b < 0.7 ? 0.55 : 1;
};

export type DripOpts = { at: V3; floorY: number; period?: number; phase?: number; light?: THREE.ColorRepresentation; size?: number };
/** one dripping spot: a bead grows on the ceiling, falls (g), a ripple spreads on the puddle (pure in t) */
export const drips = (ctx: KitCtx, list: DripOpts[]): Built => {
  const G = new THREE.Group(); G.name = "drips";
  const water = new THREE.MeshStandardMaterial({ color: 0x9fb2b8, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.75, emissive: 0xffd2a0, emissiveIntensity: 0.25 });
  water.customProgramCacheKey = () => "subway:water";
  const items = list.map((o, i) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(o.size ?? 0.0045, 10, 8), water); drop.castShadow = false;
    const rm = new THREE.MeshBasicMaterial({ map: ringTex(), color: new THREE.Color(o.light ?? 0xffd9a8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true });
    const rings = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rm.clone()); r.rotation.x = -Math.PI / 2; r.position.set(o.at[0], o.floorY + 0.002, o.at[2]); r.renderOrder = 4; G.add(r); return r; });
    G.add(drop);
    return { o, drop, rings, seed: i + 1 };
  });
  const update = (t: number) => {
    for (const it of items) {
      const P = it.o.period ?? 1.6, ph = it.o.phase ?? 0, H = it.o.at[1] - it.o.floorY, tf = Math.sqrt((2 * H) / 9.81);
      const k = Math.floor((t + ph) / P), u = (t + ph) - k * P, grow = P - tf;
      if (u < grow) { const s = 0.35 + 0.65 * (u / grow); it.drop.position.set(it.o.at[0], it.o.at[1] - 0.004 * s, it.o.at[2]); it.drop.scale.set(s, s * (1 + 0.6 * (u / grow)), s); }
      else { const f = u - grow; it.drop.position.set(it.o.at[0], it.o.at[1] - 0.5 * 9.81 * f * f, it.o.at[2]); it.drop.scale.set(0.8, 1.9, 0.8); }
      // the cycle starts when the previous drop lands (grow + fall = P): the ripple age is u (a second ring 0.12 s later)
      it.rings.forEach((r, j) => {
        const a = u - j * 0.12, s = 0.02 + Math.max(0, a) * 0.24, op = a < 0 ? 0 : Math.max(0, 1 - a / 0.9) * 0.55;
        r.scale.set(s, s, s); (r.material as THREE.MeshBasicMaterial).opacity = op; r.visible = op > 0.01;
      });
    }
  };
  return { object: G, update };
};

export type MoteOpts = { box: [V3, V3]; lamps: V3[]; count?: number; radius?: number; color?: THREE.ColorRepresentation; seed?: number; size?: number; gain?: number };
/** dust that shows only in the lamp light (additive, pure in t: drift + turbulence wrapped in the box) */
export const lampMotes = (ctx: KitCtx, o: MoteOpts): Built & { setGain: (k: number) => void } => {
  const n = o.count ?? 900, R = (() => { let s = ((o.seed ?? 3) * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const p0 = new Float32Array(n * 4), p1 = new Float32Array(n * 4), [a, b] = o.box;
  for (let i = 0; i < n; i++) {
    p0.set([a[0] + (b[0] - a[0]) * R(), a[1] + (b[1] - a[1]) * R(), a[2] + (b[2] - a[2]) * R(), R()], i * 4);
    p1.set([(R() - 0.5) * 0.05, (R() - 0.45) * 0.025, (R() - 0.5) * 0.05, R()], i * 4);
  }
  const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  g.setAttribute("aP0", new THREE.InstancedBufferAttribute(p0, 4)); g.setAttribute("aP1", new THREE.InstancedBufferAttribute(p1, 4)); g.instanceCount = n;
  const L = o.lamps.slice(0, 8); while (L.length < 8) L.push([1e4, 1e4, 1e4]);
  const U = { uT: { value: 0 }, uMin: { value: new THREE.Vector3(...a) }, uSize: { value: new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]) },
    uLamps: { value: L.map((p) => new THREE.Vector3(...p)) }, uR: { value: o.radius ?? 1.4 }, uCol: { value: new THREE.Color(o.color ?? 0xffd8a8) },
    uSz: { value: o.size ?? 0.006 }, uGain: { value: o.gain ?? 1 } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
attribute vec4 aP0; attribute vec4 aP1; uniform float uT; uniform vec3 uMin; uniform vec3 uSize; uniform vec3 uLamps[8]; uniform float uR; uniform float uSz;
varying float vB; varying vec2 vUv;
void main() {
  float t = uT + aP0.w * 40.0;
  vec3 p = aP0.xyz + aP1.xyz * t + 0.06 * vec3( sin( t * 0.7 + aP1.w * 40.0 ), 0.5 * sin( t * 0.5 + aP1.w * 17.0 ), sin( t * 0.6 + aP1.w * 63.0 ) );
  p = uMin + mod( p - uMin, uSize );
  float b = 0.0;
  for ( int i = 0; i < 8; i++ ) { vec3 d = p - uLamps[i]; float dd = dot( d, d ) / ( uR * uR ); b += 1.0 / ( 1.0 + dd * dd * 4.0 ); }
  vB = b * ( 0.5 + aP1.w );
  vec4 mv = viewMatrix * vec4( p, 1.0 );
  float sz = uSz * ( 0.6 + 0.8 * fract( aP1.w * 7.3 ) );
  mv.xy += position.xy * sz;
  gl_Position = projectionMatrix * mv; vUv = position.xy + 0.5;
}`, fragmentShader: /* glsl */ `
uniform vec3 uCol; uniform float uGain; varying float vB; varying vec2 vUv;
void main() { float r = length( vUv - 0.5 ) * 2.0; float a = smoothstep( 1.0, 0.0, r ); a *= a; if ( a * vB < 0.002 ) discard;
  gl_FragColor = vec4( uCol * a * vB * uGain * 2.2, 1.0 ); }` });
  m.customProgramCacheKey = () => "subway:lampMotes";
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.name = "lamp-motes";
  return { object: mesh, update: (t) => { U.uT.value = t; }, setGain: (k) => { U.uGain.value = k; } };
};

// ---------------------------------------------------------------- the rat (an inked cartoon card, side view)
const INK = "#2c1e2a";
const drawRat = (g: CanvasRenderingContext2D, t: number, w: number, h: number, run: number) => {
  g.clearRect(0, 0, w, h);
  const s = w / 600, ph = run * Math.PI * 2, bob = Math.abs(Math.sin(ph)) * 6 * s;
  g.lineJoin = "round"; g.lineCap = "round";
  const body = "#6b5d55", belly = "#8c7d72", pink = "#e5a3a0";
  g.save(); g.translate(0, -bob);
  // tail (behind): a long curve
  g.strokeStyle = INK; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(170 * s, 165 * s); g.bezierCurveTo(90 * s, 150 * s + Math.sin(ph) * 14 * s, 40 * s, 190 * s, 8 * s, 160 * s + Math.sin(ph * 0.5) * 12 * s); g.stroke();
  g.strokeStyle = pink; g.lineWidth = 5 * s; g.stroke();
  // legs (2 visible pairs, alternating)
  const leg = (x: number, a: number) => { g.strokeStyle = INK; g.lineWidth = 12 * s; g.beginPath(); g.moveTo(x * s, 190 * s); g.lineTo((x + 18 * Math.sin(a)) * s, 232 * s); g.stroke(); g.strokeStyle = pink; g.lineWidth = 6 * s; g.stroke(); };
  leg(215, ph); leg(250, ph + Math.PI); leg(395, ph + Math.PI); leg(425, ph);
  // body bean
  g.fillStyle = body; g.strokeStyle = INK; g.lineWidth = 8 * s;
  g.beginPath(); g.ellipse(310 * s, 165 * s, 150 * s, 62 * s, -0.06, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = belly; g.beginPath(); g.ellipse(320 * s, 195 * s, 105 * s, 22 * s, -0.04, 0, Math.PI * 2); g.fill();
  // head + snout
  g.fillStyle = body; g.beginPath(); g.moveTo(420 * s, 120 * s); g.quadraticCurveTo(540 * s, 128 * s, 592 * s, 168 * s); g.quadraticCurveTo(540 * s, 200 * s, 430 * s, 205 * s); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = pink; g.beginPath(); g.arc(590 * s, 168 * s, 9 * s, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 4 * s; g.stroke();
  // ear + eye + whiskers
  g.fillStyle = pink; g.strokeStyle = INK; g.lineWidth = 7 * s; g.beginPath(); g.ellipse(462 * s, 112 * s, 26 * s, 32 * s, -0.3, 0, 7); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(515 * s, 150 * s, 8 * s, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(518 * s, 147 * s, 2.6 * s, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 2.5 * s; for (const d of [-8, 2, 12]) { g.beginPath(); g.moveTo(570 * s, 170 * s); g.lineTo(625 * s, (170 + d * 1.6) * s); g.stroke(); }
  g.restore();
  void t; void h;
};
export type RatOpts = { path: (t: number) => V3; heading: (t: number) => number; on: (t: number) => boolean; speed?: number; lengthM?: number };
/** a scurrying rat (card, 0.36 m nose to tail tip): faces its heading (mirror), legs cycle with the distance run */
export const ratCard = async (ctx: KitCtx, o: RatOpts): Promise<CardBuilt & { on: (t: number) => boolean }> => {
  const len = o.lengthM ?? 0.36, aspect = 2.4;
  const c = await card(ctx, {
    px: 260, heightM: len / aspect, aspect, crownY: 0.0, soleY: 1.0, pos: o.path, name: "rat", lodM: 30,
    draw: (g, t, w, h) => drawRat(g, t, w, h, (t * (o.speed ?? 1.4)) / 0.09),
    key: (t) => String(Math.floor((t * (o.speed ?? 1.4)) / 0.09 * 8)),
    mirror: (t) => Math.cos(o.heading(t)) < 0,
    shadow: true,
  });
  return Object.assign(c, { on: o.on });
};

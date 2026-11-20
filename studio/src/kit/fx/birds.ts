// FX / birds: low-poly lit birds (body + 2 jointed wings, flap in the vertex shader from a per-bird attribute), as a
// FLOCK (each bird = the flock path + its own seeded orbit offset, flap / glide cycles) or SINGLE birds on paths. Pure
// functions of t; they cast small moving shadows. Paths: { from, to, t0, t1 } (straight, with a gentle arc) or
// { center, radius, height, period } (circling).
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../core/ctx";

export type BirdPath = { from: V3; to: V3; t0: number; t1: number; arc?: number } | { center: V3; radius: number; period: number; phase?: number; bob?: number };
export type BirdOpts = { on?: boolean; flock?: { path: BirdPath; count?: number; spread?: V3 }; singles?: BirdPath[]; size?: number; color?: THREE.ColorRepresentation; seed?: number; density?: number; flapHz?: number };

const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pathAt = (p: BirdPath, t: number): THREE.Vector3 => {
  if ("from" in p) {
    const u = (t - p.t0) / (p.t1 - p.t0), a = new THREE.Vector3(...p.from), b = new THREE.Vector3(...p.to);
    return a.lerp(b, u).add(new THREE.Vector3(0, (p.arc ?? 0.6) * 4 * u * (1 - u), 0));
  }
  const a = (t / p.period) * Math.PI * 2 + (p.phase ?? 0);
  return new THREE.Vector3(p.center[0] + Math.cos(a) * p.radius, p.center[1] + (p.bob ?? 0.4) * Math.sin(a * 2.3), p.center[2] + Math.sin(a) * p.radius);
};
/** bird mesh: +Z forward, wings along +-X; aWing = signed span position (0 body .. +-1 wing tip) */
const birdGeo = () => {
  const P: number[] = [], W: number[] = [];
  const tri = (a: V3, b: V3, c: V3, w: [number, number, number]) => { P.push(...a, ...b, ...c); W.push(...w); };
  // body: a stretched double pyramid
  const nose: V3 = [0, 0, 0.5], tail: V3 = [0, 0.02, -0.55], up: V3 = [0, 0.12, 0], dn: V3 = [0, -0.1, 0.05], l: V3 = [-0.09, 0, 0.05], r: V3 = [0.09, 0, 0.05];
  for (const [a, b] of [[up, r], [r, dn], [dn, l], [l, up]] as [V3, V3][]) { tri(nose, a, b, [0, 0, 0]); tri(tail, b, a, [0, 0, 0]); }
  // tail fan
  tri([0, 0.02, -0.45], [-0.14, 0.01, -0.75], [0.14, 0.01, -0.75], [0, 0, 0]);
  // wings: inner + outer panel per side
  for (const s of [-1, 1]) {
    tri([s * 0.06, 0.03, 0.18], [s * 0.06, 0.03, -0.12], [s * 0.5, 0.03, 0.02], [s * 0.0, s * 0.0, s * 1]);
    tri([s * 0.5, 0.03, 0.02], [s * 0.06, 0.03, -0.12], [s * 0.45, 0.03, -0.2], [s * 1, 0, s * 1]);
    tri([s * 0.5, 0.03, 0.02], [s * 0.45, 0.03, -0.2], [s * 0.95, 0.03, -0.18], [s * 1, s * 1, s * 2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  // per-vertex span weight from |x|: 0 at the body, 1 at the elbow, 2 at the tip (signed)
  const n = P.length / 3, aw = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = P[i * 3]; aw[i] = Math.sign(x) * Math.min(2, Math.max(0, (Math.abs(x) - 0.06) / 0.44)); }
  g.setAttribute("aWing", new THREE.BufferAttribute(aw, 1));
  void W;
  g.computeVertexNormals();
  return g;
};
const FLAP = /* glsl */ `
attribute float aWing;
attribute vec2 aFlap;     // wing angle (rad), elbow fold
`;
const FLAP_BEGIN = /* glsl */ `
vec3 transformed = vec3( position );
{
  float s = sign( aWing ), k = abs( aWing );
  if ( k > 0.0 ) {
    float a1 = aFlap.x * min( k, 1.0 ), a2 = ( aFlap.x + aFlap.y ) * max( k - 1.0, 0.0 );
    float x0 = abs( transformed.x ) - 0.06;
    float y = sin( a1 ) * min( x0, 0.44 ) + sin( a1 + a2 ) * max( x0 - 0.44, 0.0 );
    float x = cos( a1 ) * min( x0, 0.44 ) + cos( a1 + a2 ) * max( x0 - 0.44, 0.0 );
    transformed.x = s * ( 0.06 + x ); transformed.y += y;
  }
}`;

export const birds = (ctx: KitCtx, o: BirdOpts): Built => {
  const R = rng((o.seed ?? 1) + 303), size = o.size ?? 0.32;
  type B = { path: BirdPath; off: V3; ph: number; hz: number; drift: number };
  const list: B[] = [];
  if (o.flock) {
    const n = Math.round((o.flock.count ?? 14) * (o.density ?? 1)), sp = o.flock.spread ?? [3, 1.2, 3];
    for (let i = 0; i < n; i++) list.push({ path: o.flock.path, off: [(R() - 0.5) * sp[0], (R() - 0.5) * sp[1], (R() - 0.5) * sp[2]], ph: R(), hz: (o.flapHz ?? 5) * (0.85 + 0.3 * R()), drift: R() * 6 });
  }
  for (const s of o.singles ?? []) list.push({ path: s, off: [0, 0, 0], ph: R(), hz: (o.flapHz ?? 5) * (0.85 + 0.3 * R()), drift: R() * 6 });
  const geo = birdGeo(), n = Math.max(1, list.length);
  const flapA = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); flapA.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aFlap", flapA);
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0x3a3632, roughness: 0.8, side: THREE.DoubleSide });
  const patch = (sh: THREE.WebGLProgramParametersWithUniforms) => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + FLAP).replace("#include <begin_vertex>", FLAP_BEGIN); };
  mat.onBeforeCompile = patch; mat.customProgramCacheKey = () => "fx:bird";
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }); dm.onBeforeCompile = patch; dm.customProgramCacheKey = () => "fx:bird-depth";
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.castShadow = true; im.receiveShadow = false; im.frustumCulled = false; im.customDepthMaterial = dm;
  im.visible = o.on !== false && list.length > 0; im.name = "fx-birds";
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), fwd = new THREE.Vector3(0, 0, 1), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Matrix4();
  const posAt = (b: B, t: number) => pathAt(b.path, t).add(new THREE.Vector3(
    b.off[0] + 0.35 * Math.sin(t * 0.7 + b.drift), b.off[1] + 0.25 * Math.sin(t * 0.9 + b.drift * 1.3), b.off[2] + 0.35 * Math.sin(t * 0.6 + b.drift * 0.7)));
  const update = (t: number) => {
    list.forEach((b, i) => {
      const p = posAt(b, t), p2 = posAt(b, t + 0.05), v = p2.clone().sub(p);
      const speedUp = v.y / 0.05;
      // flap while climbing / slow, glide in bursts (a seeded on/off cycle)
      const cyc = Math.sin(t * 0.9 + b.drift * 3) > -0.35 || speedUp > 0.3 ? 1 : 0;
      const ang = cyc ? 0.75 * Math.sin((t * b.hz + b.ph) * Math.PI * 2) + 0.12 : 0.1 + 0.03 * Math.sin(t * 3 + b.ph * 6);
      flapA.setXY(i, ang, cyc ? -0.35 * Math.cos((t * b.hz + b.ph) * Math.PI * 2) : 0.05);
      if (v.lengthSq() < 1e-8) v.set(0, 0, 1);
      tmp.lookAt(new THREE.Vector3(0, 0, 0), v.clone().normalize().negate(), up); q.setFromRotationMatrix(tmp);
      const bank = new THREE.Quaternion().setFromAxisAngle(fwd, Math.max(-0.6, Math.min(0.6, -(p2.x - p.x) * 2)));
      m4.compose(p, q.multiply(bank), new THREE.Vector3(size, size, size)); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true; flapA.needsUpdate = true;
  };
  update(0);
  return { object: im, update };
};

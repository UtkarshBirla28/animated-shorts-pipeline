// EXTERIOR SETS (owner: WORLD-EXT). Petrified Forest: painted badlands (flat dusty floor near the trails, striped
// Blue-Mesa mounds further out, mesas on the horizon), sliced petrified logs with rainbow-quartz faces, the paved trail +
// low metal rail, sagebrush / junipers / dry grass that sway in one shared wind, rocks, pebbles and loose chips, the park
// dressing (kiosk, benches, bins, fountain, ramada, parking lot + cars, visitor center, entrance sign), the main warning
// sign + split-flap "14 TONS / YEAR" counter, the plaque, the glint rock, the three trail heads with Sign A / Sign B,
// their LED "PIECES MISSING" counters, the marked chips, the giant rubber stamp, plus blowing sand, a dust devil and
// tumbleweeds. Everything is a pure function of (shot, frame); ambient motion uses whole cycles over TOTAL frames so
// the last frame loops onto frame 0.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Kit, Batch, lam, boxGeo, V } from "./build";
import * as P from "./paint";
import { NOINK } from "./ink";
import { twoTone, untone } from "./shade";
import { TH, TT, VISTA, add, V3 } from "./plan";
import { BEAT, SHOTS, TOTAL, PW, camAt, clamp01, smooth, V as vidAt, PV as picAt } from "./story";
import type { Cam } from "./story";
import type { LightState } from "./lights";
import type { SetCtx } from "./ctx";
import { swapPath } from "./toon";
import { VOICE_TOTAL, toNew } from "./voicewarp";

const TAU = Math.PI * 2;
const tt = (d: V3): V3 => add(TT.base, d);
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sstep = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
/** value noise in [0, 1] and a 4-octave fbm */
const vnoise = (x: number, z: number, s = 0) => {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const h = (a: number, b: number) => hash(a * 57.31 + b * 113.7 + s * 7.13, s);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), ux), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), ux), uz);
};
const fbm = (x: number, z: number, s = 0) => (vnoise(x, z, s) * 0.5 + vnoise(x * 2.03, z * 2.03, s + 1) * 0.25 + vnoise(x * 4.1, z * 4.1, s + 2) * 0.15 + vnoise(x * 8.3, z * 8.3, s + 3) * 0.1);

// ---------------- the shared wind (CHAR can import windAt for hat brims / hems / straps) ----------------
// round 5 (LEAD A5 P1: idle life on the picture clock slowed to 0.42x in the long pauses): every idle loop out here
// (wind, grass / sage / flags / cloth, wisps, birds, lizards' idle bobs, dust devils, tumbleweeds, glints, motes, steam,
// flicker) runs on the VIDEO frame ctx.vf. Loop seam: whole cycles over VOICE_TOTAL, and shot 16 runs vf - (VOICE_TOTAL
// - 1), so the last video frame renders exactly frame 0's phase. Story actions stay on the picture clock f (BEAT keyed).
/** whole cycles per film (VOICE_TOTAL video frames) so the wind at the last frame continues into frame 0 */
const cyc = (n: number, f: number, ph = 0) => Math.sin((TAU * n * f) / VOICE_TOTAL + ph);
/** wind strength 0..1 at (x, z) on VIDEO loop frame f: slow gusts x a travelling wave; it blows toward +x */
export const windAt = (x: number, z: number, f: number) => {
  const gust = 0.62 + 0.24 * cyc(5, f, 0.7) + 0.14 * cyc(13, f, 2.1);
  const wave = 0.55 + 0.45 * Math.sin((TAU * 19 * f) / VOICE_TOTAL - 0.21 * x - 0.13 * z);
  return clamp01(gust * wave + 0.08 * cyc(41, f, x * 0.9 + z * 0.4));
};

// ---------------- trails, flat zones, ground height ----------------
type P2 = [number, number];
const smoothLine = (pts: P2[], step = 0.5): P2[] => {
  const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z)), false, "centripetal");
  const n = Math.max(2, Math.ceil(c.getLength() / step));
  return c.getSpacedPoints(n).map((p) => [p.x, p.z] as P2);
};
/** a polyline shifted sideways by d (left of travel = +) */
const offsetLine = (L: P2[], d: number): P2[] => L.map((p, i) => {
  const a = L[Math.max(0, i - 1)], c = L[Math.min(L.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], n = Math.hypot(dx, dz) || 1;
  return [p[0] - (dz / n) * d, p[1] + (dx / n) * d] as P2;
});
const TR_VISTA = smoothLine([[0, -2.4], ...VISTA.trail.slice(1).map((p) => [p[0], p[2]] as P2)]);
const ttP = (x: number, z: number): P2 => [TT.base[0] + x, TT.base[2] + z];
const TR_TT = [
  smoothLine([ttP(TT.heads.jasper, -0.8), ttP(-3.3, -9), ttP(-5.4, -20), ttP(-10, -34), ttP(-16, -46)]),
  smoothLine([ttP(TT.heads.longlogs, -0.8), ttP(0, -14), ttP(0, -27), ttP(1.6, -40), ttP(4, -52)]),
  smoothLine([ttP(TT.heads.crystal, -0.8), ttP(3.5, -9), ttP(6.2, -20), ttP(11, -33), ttP(17, -44)]),
];
const LOT: { c: P2; w: number; d: number } = { c: [11, -63], w: 14, d: 9 };
const TR_ROAD = smoothLine([[2, -63.5], [18, -64], [60, -71], [150, -86], [320, -112], [620, -150]], 2);
const TR_LOTPATH = smoothLine([[4, -62.5], [-2, -62.8], [-8.6, -63]]);
const segD = (x: number, z: number, a: P2, b: P2) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = clamp01(((x - a[0]) * dx + (z - a[1]) * dz) / L2);
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
const lineD = (x: number, z: number, L: P2[]) => { let d = Infinity; for (let i = 1; i < L.length; i += 1) d = Math.min(d, segD(x, z, L[i - 1], L[i])); return d; };
/** coarse polylines (every 4th point) for the many-vertex distance fields */
const coarse = (L: P2[]) => L.filter((_, i) => i % 4 === 0 || i === L.length - 1);
const C_VISTA = coarse(TR_VISTA), C_TT = TR_TT.map(coarse), C_ROAD = coarse(TR_ROAD);
/** distance to everything that must stay flat (trails, trail heads, plazas, road, lot) */
const flatD = (x: number, z: number) => {
  let d = Math.min(Math.hypot(x, z) - 4, lineD(x, z, C_VISTA), Math.hypot(x - TT.base[0], z - TT.base[2] - 2) - 6, lineD(x, z, C_ROAD) - 3,
    Math.max(Math.abs(x - LOT.c[0]) - LOT.w / 2, Math.abs(z - LOT.c[1]) - LOT.d / 2));
  for (const L of C_TT) d = Math.min(d, lineD(x, z, L));
  return Math.max(0, d);
};
/** distance to the paved centre lines (for keeping props off the paving) */
const paveD = (x: number, z: number) => {
  let d = Math.min(lineD(x, z, TR_VISTA) - VISTA.trailW / 2, lineD(x, z, TR_ROAD) - 3, lineD(x, z, TR_LOTPATH) - 0.9,
    Math.max(Math.abs(x) - 2.8, z - 1.85, -2.6 - z),                                                  // TH plaza
    Math.max(Math.abs(x - TT.base[0]) - 5.8, Math.abs(z - TT.base[2] - 2.35) - 3.15),               // TT plaza
    Math.max(Math.abs(x - LOT.c[0]) - LOT.w / 2, Math.abs(z - LOT.c[1]) - LOT.d / 2));
  for (const L of TR_TT) d = Math.min(d, lineD(x, z, L) - 0.95);
  return d;
};
/** the floor: exactly 0 near the story, a gentle +-0.2 m swell further out */
export const floorY = (x: number, z: number) => {
  const w = sstep(10, 40, flatD(x, z));
  return w ? w * 0.5 * (fbm(x / 21, z / 21, 3) - 0.5) : 0;
};

// ---------------- sight lines: nothing may stand between a story lens and its subject ----------------
type Seg = { o: THREE.Vector3; l: THREE.Vector3 };
const EXT_SHOTS = SHOTS.filter((s) => s.set === "trailhead" || s.set === "vista" || s.set === "trails");
const SIGHT: Seg[] = [];
for (const s of EXT_SHOTS) for (let f = s.a - 4; f <= s.b + 4; f += 4) { const c = camAt(s.id, f); SIGHT.push({ o: V(...c.pos), l: V(...c.look) }); }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3();
/** true when a thing of radius rad, from y0 to y1 at (x, z), would block a lens or sit right in front of it */
const blocks = (x: number, z: number, rad: number, y0: number, y1: number) => {
  for (const { o, l } of SIGHT) {
    if (Math.hypot(x - o.x, z - o.z) < rad + 1.4 && y1 > o.y - 1.2) return true;
    _a.subVectors(l, o); const L = _a.length(); _a.divideScalar(L);
    for (const yy of [y0, (y0 + y1) / 2, y1]) {
      _p.set(x, yy, z).sub(o); const t = THREE.MathUtils.clamp(_p.dot(_a), 0, L * 0.92);
      _b.copy(o).addScaledVector(_a, t);
      if (_b.distanceTo(_p.add(o)) < rad + 0.22) return true;
      _p.set(x, yy, z);
    }
  }
  return false;
};
/** shot 3: the loose rainbow slice standing on edge beside the pocketing tourist (audit A1 anchor) */
const SLICE3: V3 = add(VISTA.pocketTourist, [0.9, 0, -0.5]);
/** the plaque lectern scale (round 1 = 1; caps were ~30 px at 1080, the rule is >= 40) */
const PLAQUE_K = 1.72; // round 6 (audit A6 P2: caps ~28 px at 1080, the rule is >= 40): x1.32 board + condensed taller letters (paint.ts)
/** marker posts sit 0.4 m further left than plan.ts said, so their name boards clear the sign posts (min() keeps
 *  this right if plan.ts is updated to the same value) */
const MARKER_DX = Math.min(TT.marker.dx, -1.15);
/** audit A3 + carry-over: the trail names are NAME PLATES now. JASPER hangs on Sign A's posts and LONG LOGS on Sign B's
 *  posts (under each panel, so no board ever sticks out beside a whole sign: the 'PER' / 'OGS' / 'RYSTAL' slivers), and
 *  CRYSTAL sits on its own post where the CAM framed the old board (x 2.05), narrowed so its right edge clears the
 *  shot-10 B frame */
const PLATE = { w: 0.96, h: 0.3, y: 0.84, cw: 0.84 };
const CRYSTAL_X = TT.heads.crystal + MARKER_DX;
/** audit A5 P2 (only JASPER read at the "trails" beat: LONG LOGS ~28 px, CRYSTAL ~20 px): LONG LOGS as two stacked
 *  lines on a taller plate (its 1.6 MI tag drops below it), CRYSTAL a wider, taller plate on its own post */
const LLP = { w: 0.96, h: 0.5, y: 0.75 };
const CRY = { w: 0.92, h: 0.4, y: 0.9, dx: -0.08 }; // round 7: 0.92 m wide (was 1.05), so it fits beside the professor in the shot-7 opener
/** round 7 (audit A7 P2: the professor hid 'RYSTA' in the shot-7 opener): in shot 7 only the CRYSTAL post + plate stand
 *  this far left (the shot-8 gap lens needs them where they were) */
const CRY7_DX = -0.85;
/** audit A5 P2 (the loop frame read 'TON' / '/YEA' behind her bob): the split-flap box is ~40 % narrower and stacked
 *  (flaps on top, TONS / YEAR underneath); its LEFT and TOP edges stay where plan.ts TH.flip had them */
const FL = { x: TH.flip.x - TH.flip.w / 2 + 0.19, y: TH.flip.y + TH.flip.h / 2 - 0.2, z: TH.flip.z, w: 0.38, h: 0.4 };
/** round 6 (audit A6 P2: the shot-2 faces in shade read as magenta salami discs): the shade side of a painted face goes
 *  half-way to a warm neutral (0.66 / 0.58 / 0.62 x the key) instead of the full lavender ground shade, so the yellow /
 *  orange / red zones survive the violet shadow; a 0.2 self-lit floor keeps the rings readable */
const warmShade = <T extends THREE.MeshLambertMaterial>(m: T, key: string, k = 0.5): T => {
  const prev = m.onBeforeCompile, ck = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (sh, rd) => { prev.call(m, sh, rd);
    sh.fragmentShader = sh.fragmentShader.replace("+ alb * poolLight( geometryPosition, geometryNormal );", `+ alb * poolLight( geometryPosition, geometryNormal );
      { vec3 sSh = mix( shadeC, uLitCol * vec3( 0.66, 0.58, 0.62 ), ${k.toFixed(3)} ); reflectedLight.directDiffuse = alb * mix( sSh, lit, sunTerm ) * skyK + liftC * LIFT_K * 0.5 * ( 1.0 - sunTerm ); }`); };
  m.customProgramCacheKey = () => ck() + "_warm_" + key;
  return m;
};
const jasMats = new Map<number, THREE.MeshLambertMaterial>();
/** the exterior log cut faces: the round-6 painted section (P.jasperFace), warm shade, small self-lit floor */
const jasM = (i: number) => {
  let m = jasMats.get(i);
  if (!m) { const t = P.jasperFace(i); m = warmShade(twoTone(new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color(1, 1, 1), emissiveMap: t, emissiveIntensity: 0.2 })), "jas8_" + i); jasMats.set(i, m); }
  return m;
};
/** round 6 (audit A6 P2 shots 2 / 8: chips read as jelly beans / red glass slabs): an angular broken chip. body = the
 *  bark-brown sides + bottom, cap = the flat cut face (uv = a window into a slice face, so rings show as arcs and the
 *  rind shows on one edge). Unit radius ~1, y from -0.35 to ~+0.45 (scaled per instance: s, s * 0.55, s). */
const shardGeo = (seed: number) => {
  const r = P.rng(seed), n = 5 + Math.floor(r() * 3), a0 = r() * TAU, tx = (r() - 0.5) * 0.3, tz = (r() - 0.5) * 0.3;
  const ring: [number, number][] = [];
  for (let k = 0; k < n; k++) { const a = a0 + (k / n) * TAU + (r() - 0.5) * 0.5, d = 0.72 + r() * 0.34; ring.push([Math.cos(a) * d, Math.sin(a) * d]); }
  const top = (x: number, z: number) => 0.38 + tx * x + tz * z, yb = -0.35;
  // the face window: centred off the pith (outer zones + rind on one side), ~0.3 of the face
  const wa = r() * TAU, wd = 0.2 + r() * 0.1, wc: [number, number] = [0.5 + Math.cos(wa) * wd, 0.5 + Math.sin(wa) * wd], ws = 0.14 + r() * 0.035;
  const cp: number[] = [], cn: number[] = [], cu: number[] = [], bp: number[] = [], bn: number[] = [], bu: number[] = [];
  const nT = V(-tx, 1, -tz).normalize();
  for (let k = 0; k < n; k++) { const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % n];
    for (const [x, z] of [[0, 0], [x1, z1], [x0, z0]] as const) { cp.push(x, top(x, z), z); cn.push(nT.x, nT.y, nT.z); cu.push(wc[0] + x * ws, wc[1] + z * ws); }
    // side quad (flat normal, faceted), bark uv
    const sn = V(z1 - z0, 0, -(x1 - x0)).normalize(), u0 = k / n, u1 = (k + 1) / n;
    for (const [x, y, z, u, v] of [[x0, yb, z0, u0, 0], [x1, top(x1, z1), z1, u1, 0.3], [x1, yb, z1, u1, 0], [x0, yb, z0, u0, 0], [x0, top(x0, z0), z0, u0, 0.3], [x1, top(x1, z1), z1, u1, 0.3]] as const) {
      bp.push(x, y, z); bn.push(sn.x, sn.y, sn.z); bu.push(u, v); }
    for (const [x, z] of [[0, 0], [x0, z0], [x1, z1]] as const) { bp.push(x, yb, z); bn.push(0, -1, 0); bu.push(x * 0.3, z * 0.3); }
  }
  const mk = (p: number[], nn: number[], u: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nn, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2)); return g; };
  return { body: mk(bp, bn, bu), cap: mk(cp, cn, cu) };
};
const SHARDS = [0, 1, 2].map((k) => shardGeo(9100 + k * 37));
/** chip cut-face materials (3 variants) + the bark body */
const chipCapMats = new Map<number, THREE.MeshLambertMaterial>();
const chipCapM = (k: number) => {
  let m = chipCapMats.get(k);
  if (!m) { const t = P.chipFace([0, 3, 2][k % 3]); m = warmShade(twoTone(new THREE.MeshLambertMaterial({ map: t, emissive: new THREE.Color(1, 1, 1), emissiveMap: t, emissiveIntensity: 0.16 })), "chip" + k, 0.4); chipCapMats.set(k, m); }
  return m;
};
const chipBodyM = () => lam("atChipBody6", () => ({ map: P.barkHD(), color: new THREE.Color(0.86, 0.8, 0.78) }));
/** sagebrush cards (audit A5 P2: navy-blue "flowers" in the morning shade): a grey-green self-lit floor keeps the shade
 *  side #4E5E58-class or lighter, never violet */
const sageMats = new Map<number, THREE.MeshLambertMaterial>();
const sageM = (i: number) => {
  let m = sageMats.get(i);
  if (!m) {
    m = twoTone(new THREE.MeshLambertMaterial({ map: P.sageCardTex(i), alphaTest: 0.5, emissive: new THREE.Color(0.1, 0.13, 0.05), emissiveMap: P.sageCardTex(i) }));
    const prev = m.onBeforeCompile, ck = m.customProgramCacheKey.bind(m), mm = m;
    // the shade side half-way to a green-grey (0.5 / 0.6 / 0.46 x the key): #4E5E58-class or lighter in every light
    mm.onBeforeCompile = (sh, rd) => { prev.call(mm, sh, rd);
      sh.fragmentShader = sh.fragmentShader.replace("+ alb * poolLight( geometryPosition, geometryNormal );", `+ alb * poolLight( geometryPosition, geometryNormal );
        { vec3 sSh = mix( shadeC, uLitCol * vec3( 0.5, 0.6, 0.46 ), 0.5 ); reflectedLight.directDiffuse = alb * mix( sSh, lit, sunTerm ) * skyK + liftC * LIFT_K * 0.5 * ( 1.0 - sunTerm ); }`); };
    mm.customProgramCacheKey = () => ck() + "_sage5";
    sageMats.set(i, m);
  }
  return m;
};
/** round 5: a foliage card material with the sage shade patch (shade side never violet / navy) for other plant cards */
const foliMats = new Map<string, THREE.MeshLambertMaterial>();
const foliM = (key: string, tex: () => THREE.Texture, emi: [number, number, number]) => {
  let m = foliMats.get(key);
  if (!m) {
    const t = tex(); m = twoTone(new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, emissive: new THREE.Color(...emi), emissiveMap: t }));
    const prev = m.onBeforeCompile, ck = m.customProgramCacheKey.bind(m), mm = m;
    mm.onBeforeCompile = (sh, rd) => { prev.call(mm, sh, rd);
      sh.fragmentShader = sh.fragmentShader.replace("+ alb * poolLight( geometryPosition, geometryNormal );", `+ alb * poolLight( geometryPosition, geometryNormal );
        { vec3 sSh = mix( shadeC, uLitCol * vec3( 0.5, 0.6, 0.46 ), 0.5 ); reflectedLight.directDiffuse = alb * mix( sSh, lit, sunTerm ) * skyK + liftC * LIFT_K * 0.5 * ( 1.0 - sunTerm ); }`); };
    mm.customProgramCacheKey = () => ck() + "_foli_" + key;
    foliMats.set(key, m);
  }
  return m;
};
/** a yucca rosette (unit ~0.7 m): ~30 dagger leaves fanning up and out from the base, two-faced, normals up-outward */
const yuccaGeo = (seed: number) => {
  const r = P.rng(seed), pos: number[] = [], uv: number[] = [], nor: number[] = [];
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996 + r() * 0.3, el = THREE.MathUtils.degToRad(i < 8 ? 70 + r() * 18 : 30 + r() * 42), L = (0.5 + r() * 0.25) * (i < 8 ? 1.05 : 1), w = 0.045 + r() * 0.015;
    const dx = Math.cos(a), dz = Math.sin(a), tip = V(dx * Math.cos(el) * L, 0.08 + Math.sin(el) * L, dz * Math.cos(el) * L), side = V(-dz, 0, dx).multiplyScalar(w / 2);
    const b0 = V(dx * 0.03, 0.06, dz * 0.03).sub(side), b1 = V(dx * 0.03, 0.06, dz * 0.03).add(side), mid = tip.clone().multiplyScalar(0.55).add(V(0, -0.04 * Math.cos(el), 0)); // a slight droop
    const m0 = mid.clone().sub(side.clone().multiplyScalar(0.8)), m1 = mid.clone().add(side.clone().multiplyScalar(0.8)), n = V(dx * 0.5, 0.85, dz * 0.5).normalize();
    for (const [p, q] of [[b0, [0, 0]], [b1, [1, 0]], [m1, [1, 0.55]], [b0, [0, 0]], [m1, [1, 0.55]], [m0, [0, 0.55]], [m0, [0, 0.55]], [m1, [1, 0.55]], [tip, [0.5, 1]]] as const) {
      pos.push(p.x, p.y, p.z); uv.push(q[0], q[1]); nor.push(n.x, n.y, n.z); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return twoFaced(g);
};
/** the shot-2 crane's end (story.ts V2E / V2END, copied: not exported): the vista-only hero mounds are laid out along it */
const V2E_XZ: P2 = [-36, -22], V2_BEAR = (50 * Math.PI) / 180;
/** the shot-2 match slice (story.ts V2F, copied: not exported) */
const V2F_XZ: P2 = [-26.1, -29.59];
const alongV2 = (along: number, perp: number): P2 => [V2E_XZ[0] + Math.sin(V2_BEAR) * along + Math.cos(V2_BEAR) * perp, V2E_XZ[1] - Math.cos(V2_BEAR) * along + Math.sin(V2_BEAR) * perp];
/** word cues for ambient gags (keyed to words, never fixed frames, so a voice re-time follows) */
const CUE = { want: PW(11, "want"), kept5: PW(5, "kept"), psych: PW(12, "psychologist"), mostly: PW(8, "mostly"), removed: PW(15, "removed"), petrified: PW(3, "Petrified") };
/** keep-out circles: where the cast stands and acts */
const KEEP: [number, number, number][] = [
  [TH.woman[0], TH.woman[2], 0.7], [TH.fiance[0], TH.fiance[2], 0.7], [TH.tourist[0], TH.tourist[2], 0.7], [TH.glintRock[0], TH.glintRock[2], 0.35],
  [VISTA.pocketTourist[0], VISTA.pocketTourist[2], 0.9], ...VISTA.walkers.map((p) => [p[0], p[2], 0.8] as [number, number, number]),
  [tt([1.8, 0, 2.4])[0], tt([1.8, 0, 2.4])[2], 1.0], [SLICE3[0], SLICE3[2], 0.6],
  [tt([0.85, 0, -3.4])[0], tt([0.85, 0, -3.4])[2], 0.6], [tt([-0.35, 0, -6.8])[0], tt([-0.35, 0, -6.8])[2], 0.6], [tt([-2.62, 0, 0.5])[0], tt([-2.62, 0, 0.5])[2], 0.5],
  [tt([-2.42, 0, 1.75])[0], tt([-2.42, 0, 1.75])[2], 0.5],
];
const kept = (x: number, z: number, rad: number) => KEEP.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + rad);
/** round 6 (LEAD A6 P2): the shot-4 heap footprint (TH.heap14, r 2.15 m) and the three pocketing tourists' spots
 *  (TH.pock[], r 0.45 m) are cleared of scatter AFTER it is laid out (a post-filter, so the seeded scatter everywhere
 *  else, frame 0 included, is unchanged) */
const HEAP_R = 2.15;
const castClear = (x: number, z: number, rad: number) => Math.hypot(x - TH.heap14[0], z - TH.heap14[2]) < HEAP_R + rad * 0.5 ||
  TH.pock.some((p) => Math.hypot(x - p[0], z - p[2]) < 0.45 + rad);
/** a free ground spot for a prop / plant: off the paving, out of the cast, out of every lens line */
const free = (x: number, z: number, rad: number, h: number, pave = 0.25) =>
  paveD(x, z) > rad + pave && !kept(x, z, rad) && !blocks(x, z, rad, 0, h);

// ---------------- camera-relative placement (sky / foreground dressing follows whatever framing story.ts has) ----------------
const ASPECT = 1080 / 1920;
const anchorCache = new Map<number, Cam>();
/** the camera a shot's sky dressing is laid out for: mid-shot; shots 1 and 16 share frame 0 (loop-safe) */
const anchorCam = (id: number): Cam => {
  let c = anchorCache.get(id);
  // shot 4 lays its sky out for the opening low wide (the empty top band the audit saw), not the mid-shot counter CU
  if (!c) { const s = SHOTS[id - 1]; c = id === 1 || id === 16 ? camAt(1, 0) : id === 4 ? camAt(4, BEAT.warning - 14) : camAt(id, Math.round((s.a + s.b) / 2)); anchorCache.set(id, c); }
  return c;
};
/** world point at distance D on the camera ray through NDC (sx, sy); the ray is lifted to at least minEl degrees */
const viewPoint = (c: Cam, sx: number, sy: number, D: number, minEl = -90) => {
  const p = V(...c.pos), fw = V(...c.look).sub(p).normalize(), rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
  const ty = Math.tan(THREE.MathUtils.degToRad(c.fov / 2)), tx = ty * ASPECT;
  const d = fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty).normalize();
  const el = THREE.MathUtils.degToRad(minEl);
  if (Math.asin(d.y) < el) { const h = Math.hypot(d.x, d.z) || 1; d.set((d.x / h) * Math.cos(el), Math.sin(el), (d.z / h) * Math.cos(el)); }
  return p.addScaledVector(d, D);
};
/** ground point ahead of a camera: horizontal distance d, lateral sx of the half frame width at that distance */
const groundAhead = (c: Cam, d: number, sx: number): P2 => {
  const fx = c.look[0] - c.pos[0], fz = c.look[2] - c.pos[2], n = Math.hypot(fx, fz) || 1, ux = fx / n, uz = fz / n;
  const tx = Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * ASPECT * sx * d;
  return [c.pos[0] + ux * d - uz * tx, c.pos[2] + uz * d + ux * tx];
};
const _pc = new THREE.PerspectiveCamera(50, ASPECT, 0.05, 2000);
/** screen px (1080 x 1920) of a world point through shot id's camera at frame f, + its depth (m, < 0 behind) */
const screenAt = (id: number, f: number, p: THREE.Vector3): [number, number, number] => {
  const c = camAt(id, f);
  _pc.position.set(...c.pos); _pc.up.set(0, 1, 0); _pc.lookAt(...c.look); _pc.rotateZ(c.roll); _pc.fov = c.fov; _pc.updateProjectionMatrix(); _pc.updateMatrixWorld();
  const v = p.clone().applyMatrix4(_pc.matrixWorldInverse), s = p.clone().project(_pc);
  return [(s.x * 0.5 + 0.5) * 1080, (0.5 - s.y * 0.5) * 1920, -v.z];
};
/** round 5b: the ground point (y = 0 plane) under screen px (1080 x 1920) of shot id's camera at picture frame f */
const groundAtScreen = (id: number, f: number, px: number, py: number): P2 => {
  const c = camAt(id, f);
  _pc.position.set(...c.pos); _pc.up.set(0, 1, 0); _pc.lookAt(...c.look); _pc.rotateZ(c.roll); _pc.fov = c.fov; _pc.updateProjectionMatrix(); _pc.updateMatrixWorld();
  const d = V((px / 1080) * 2 - 1, 1 - (py / 1920) * 2, 0.5).unproject(_pc).sub(_pc.position).normalize(), t = -_pc.position.y / Math.min(-1e-3, d.y);
  return [_pc.position.x + d.x * t, _pc.position.z + d.z * t];
};
/** audit A2: nothing tall may stand in the shot-8 opening insert (765-800, a low lens over the marked chips) except a
 *  small framer in its lower-left corner */
const INS8 = camAt(8, BEAT.marked - 6);
const insert8Blocks = (x: number, z: number, h: number) => {
  if (Math.hypot(x - INS8.pos[0], z - INS8.pos[2]) > 4.2) return false;
  for (const f of [BEAT.marked - 16, BEAT.marked, BEAT.marked + 16]) for (const y of [0.02, h]) {
    const [sx, sy, d] = screenAt(8, f, V(x, y, z));
    if (d > 0 && sx > -120 && sx < 1200 && sy > 200 && sy < 2300 && !(sx < 250 && sy > 1480)) return true;
  }
  return false;
};
/** audit A5 P2: a plant within 3 m of a story lens that rises into the middle of its frame (|ndc x| < 0.5, above the
 *  bottom 7 %) is hidden in that shot (bit id - 1): no blurred tuft or bush over a character. Corner framers stay.
 *  (3.5 m: the shot-6 one stood 3.15 m from the push-in lens)
 *  Shots 1 and 16 share one mask (frame 0 = the last frame). */
const LENS_S = (() => { const out: { id: number; c: THREE.PerspectiveCamera }[] = [];
  for (const s of EXT_SHOTS) for (const f of [s.a + 1, (s.a + s.b) / 2, s.b - 1]) { const c = camAt(s.id, f), pc = new THREE.PerspectiveCamera(c.fov, ASPECT, 0.05, 2000);
    pc.position.set(...c.pos); pc.up.set(0, 1, 0); pc.lookAt(...c.look); pc.rotateZ(c.roll); pc.updateProjectionMatrix(); pc.updateMatrixWorld(); out.push({ id: s.id, c: pc }); }
  return out; })();
const lensHide = (x: number, y: number, z: number, h: number) => {
  let m = 0;
  for (const { id, c } of LENS_S) {
    if (Math.hypot(x - c.position.x, z - c.position.z) > 3.5) continue;
    const a = V(x, y, z).project(c), t = V(x, y + h * 0.9, z).project(c);
    if (a.z > 1 || t.z > 1 || Math.abs(a.x) > 0.5 || t.y < -0.86 || t.y > 1) continue;
    m |= 1 << (id - 1);
  }
  if (m & 1 || m & (1 << 15)) m |= 1 | (1 << 15);
  return m;
};
/** the exterior shots each set is seen in */
const SET_SHOTS: Record<string, number[]> = { trailhead: [1, 4, 5, 6, 15, 16], vista: [2, 3], trails: [7, 8, 9, 10, 13] };

// ---------------- dry washes: winding sandy gullies (darker floor, gravel banks, plants crowd along them) ----------------
const WASHES: P2[][] = (() => {
  const out: P2[][] = [];
  const starts: [number, number, number][] = [[-34, 16, -1.1], [-26, -50, -0.4], [26, -12, -2.0], [36, 58, -1.6], [90, 8, -2.4], [-50, -8, -0.15], [12, -104, -2.9], [40, -40, -2.6]];
  for (const [x0, z0, a0] of starts) {
    let x = x0, z = z0, a = a0; const pts: P2[] = [];
    for (let i = 0; i < 42; i++) { pts.push([x, z]); a += (fbm(x / 30, z / 30, 41) - 0.5) * 0.9; x += Math.cos(a) * 3; z += Math.sin(a) * 3; }
    out.push(smoothLine(pts, 1.5));
  }
  return out;
})();
const WASH_BOX = WASHES.map((L) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of L) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0 - 6, x1 + 6, z0 - 6, z1 + 6];
});
const washD = (x: number, z: number) => {
  let d = Infinity;
  for (let i = 0; i < WASHES.length; i++) { const b = WASH_BOX[i]; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; d = Math.min(d, lineD(x, z, WASHES[i])); }
  return d;
};

/** round A4 (audit P2 shot 2: the crane's lower 40 % was empty sand): a paved spur from a small viewpoint pad in the
 *  crane's lower-right foreground to an apron in front of the PETRIFIED FOREST sign (a lead-in line to the sign); it
 *  passes north of the west log (the shot-2 match slice) and east of its end */
const SPUR = smoothLine([[-26.2, -26.4], [-21.5, -26.5], [-17.4, -26.9], [-15.0, -29.2], [-13.9, -32.2], [-13.4, -34.4]], 0.5);
const SPUR_PAD: P2 = [-26.9, -26.2];
/** distance to the spur + its pad (< 0 on the paving); scatter is post-filtered with it (paveD stays unchanged, so the
 *  seeded scatter everywhere else is exactly as before) */
const spurD = (x: number, z: number) => (Math.abs(x + 20) > 12 || Math.abs(z + 30) > 9 ? 99 : Math.min(lineD(x, z, SPUR) - 1.2, Math.hypot(x - SPUR_PAD[0], z - SPUR_PAD[1]) - 2.0, Math.hypot(x + 13.2, z + 35.2) - 1.9));

// ---------------- aerial haze + heat shimmer on the far terrain (mounds, mesas, floor) ----------------
// distance haze toward the horizon colour on top of the scene fog (far rows of mounds fade 35-45 %), and at noon a
// 1-2 px heat shimmer of everything far away and close to the ground. The uniforms are shared module objects, so each
// World copies its own values in from the meshes' onBeforeRender (same idea as world.ts' crossfade light fix).
const HAZE = { uHazeCol: { value: new THREE.Color() }, uHaze: { value: new THREE.Vector4(70, 430, 0.42, 0) }, uShim: { value: new THREE.Vector2(0, 0) },
  uMound: { value: new THREE.Vector2(0.55, 1) }, // round 5: badland two-tone split (x = shade lift toward the key, y = warm key)
  uCld: { value: new THREE.Vector3(0, 0, 0) } }; // round 6: drifting cloud shadows on the badlands (x / z phase, strength)
/** o.fog scales the scene fog on this material (audit A4: the far mesas read through ~25-35 % haze, not 80 %);
 *  o.d0 / o.d1 override the haze ramp distances (the vista hero mounds: near row clear, far row 30-40 % hazed) */
const hazy = <T extends THREE.MeshLambertMaterial>(m: T, key: string, mul = 1, o: { fog?: number; d0?: number; d1?: number; tone?: number; cloud?: boolean } = {}): T => {
  const prev = m.onBeforeCompile, fogK = o.fog ?? 1, ramp = o.d0 !== undefined ? `vec2(${o.d0.toFixed(1)}, ${(o.d1 ?? 430).toFixed(1)})` : "uHaze.xy";
  m.onBeforeCompile = (sh, rd) => {
    prev.call(m, sh, rd);
    Object.assign(sh.uniforms, HAZE);
    // heat shimmer (noon): a 1-2 px wobble of far geometry close to the ground, in vertical bands that crawl upward
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec2 uShim; varying vec3 vWPh;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec4 wS = modelMatrix * vec4( transformed, 1.0 ); float dS = distance( wS.xyz, cameraPosition ); vWPh = wS.xyz;
          float kS = uShim.x * smoothstep( 70.0, 240.0, dS ) * exp( -max( wS.y, 0.0 ) / 6.0 ) * ( dS / 200.0 );
          transformed.x += kS * sin( uShim.y + wS.x * 0.23 + wS.z * 0.19 + wS.y * 2.1 );
          transformed.y += kS * 0.5 * sin( uShim.y * 1.7 - wS.y * 3.1 + wS.x * 0.11 );
          transformed.z += kS * 0.6 * cos( uShim.y * 1.3 + wS.x * 0.17 - wS.z * 0.21 ); }`);
    // audit A5 P1 + carry-over (badlands: indigo night tents, bands read flat): on the mounds / mesas the two-tone split
    // is their own - the key side +10 % warm, the far side lifted toward a soft violet-grey (uMound.x of the way to
    // 0.72 / 0.70 / 0.86 x the key), so a sunlit dome keeps its pale clays (if shade.ts changes the line this is a no-op)
    if (o.tone) sh.fragmentShader = sh.fragmentShader.replace("+ alb * poolLight( geometryPosition, geometryNormal );", `+ alb * poolLight( geometryPosition, geometryNormal );
      { // round 5b (the band albedo is right now, so the noon key x1.3 washed the domes to luma 0.70): a sun-facing key side
        // ~10 % warm at the albedo's own value, the side turned from the sun -20 % toward violet (the dome form reads)
        float mF = smoothstep( 0.08, 0.8, ndl );
        vec3 mLit = lit * mix( vec3( 1.0 ), mix( vec3( 0.6, 0.58, 0.72 ), vec3( 0.84, 0.79, 0.74 ), mF ), min( uMound.y, 1.0 ) );
        vec3 mSh = mix( shadeC, uLitCol * vec3( 0.72, 0.70, 0.86 ), uMound.x * ${o.tone.toFixed(3)} );
        reflectedLight.directDiffuse = alb * mix( mSh, mLit, sunTerm ) * skyK + liftC * LIFT_K * ( 1.0 - sunTerm );
        if ( uMound.y > 10.5 && uMound.y < 11.5 ) reflectedLight.directDiffuse = alb; if ( uMound.y > 11.5 ) reflectedLight.directDiffuse = vec3( sunTerm, ndl, skyK ); }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nuniform vec3 uHazeCol; uniform vec4 uHaze; uniform vec2 uMound; uniform vec3 uCld; varying vec3 vWPh;\n#define HAZE_MUL ${mul.toFixed(3)}`)
      .replace("#include <fog_fragment>", (o.cloud ? `{ // round 6 (audit A6 ADD shot 2): soft violet cloud shadows, 30-60 m patches, sliding downwind ~0.5 m/s (loop clock)
          float c1 = sin( vWPh.x * 0.075 + uCld.x ) * sin( vWPh.z * 0.062 + uCld.y + vWPh.x * 0.02 ), c2 = sin( vWPh.x * 0.031 - vWPh.z * 0.027 + uCld.x * 0.6 );
          float cs = smoothstep( 0.18, 0.62, 0.6 * c1 + 0.45 * c2 );
          gl_FragColor.rgb *= mix( vec3( 1.0 ), vec3( 0.78, 0.76, 0.9 ), cs * uCld.z ); }\n` : "") + `#ifdef USE_FOG\n  { vec2 hr = ${ramp}; gl_FragColor.rgb = mix( gl_FragColor.rgb, uHazeCol, min( 0.85, uHaze.z * HAZE_MUL * smoothstep( hr.x, hr.y, vFogDepth ) ) ); }\n` +
        (fogK === 1 ? "#endif\n#include <fog_fragment>" : `  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, smoothstep( fogNear, fogFar, vFogDepth ) * ${fogK.toFixed(3)} );\n#endif`));
  };
  const ck = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => ck() + "_haze_" + key + mul.toFixed(2) + "_" + fogK.toFixed(2) + ramp + "_t" + (o.tone ?? 0).toFixed(2) + (o.cloud ? "_c" : "") + "b";
  return m;
};
/** badland feet: a per-vertex `foot` weight (0..1) blends the strata toward the sandy floor colour, so every dome's
 *  skirt washes out into the flats instead of ending on a hard banded rim */
const footy = <T extends THREE.MeshLambertMaterial>(m: T, foot: string): T => {
  const prev = m.onBeforeCompile, fc = new THREE.Color(foot); // an albedo (lit like the strata), not a self-lit colour
  m.onBeforeCompile = (sh, rd) => {
    prev.call(m, sh, rd);
    sh.uniforms.uFootCol = { value: fc };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float foot; varying float vFoot;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFoot = foot;");
    // audit A4 P3 (the "rainbow arc" on the left dusk horizon of shot 15, the far-dome streak of shot 7): shade.ts' backlight
    // rim lit the edge-on flanks of far humps as an orange arch; on terrain it fades out from 45 m to 110 m (if shade.ts
    // changes that line this is a no-op)
    sh.fragmentShader = sh.fragmentShader.replace("reflectedLight.directDiffuse += uRimCol * rimK * ( 0.35 + alb );",
      "reflectedLight.directDiffuse += uRimCol * rimK * ( 0.35 + alb ) * ( 1.0 - smoothstep( 45.0, 110.0, length( geometryPosition ) ) );");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uFootCol; varying float vFoot;")
      // audit A4 P2: a grey-blue scree apron (#8E96AC, popcorn-clay grit) where the slope meets the floor, then the sand
      .replace("#include <color_fragment>", `#include <color_fragment>
        { float sc = smoothstep( 0.04, 0.42, vFoot ) * ( 1.0 - smoothstep( 0.55, 0.9, vFoot ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.195, 0.144, 0.270 ) * ( 0.9 + 0.3 * diffuseColor.g ), 0.72 * sc ); // round 6 (audit A6 P2: the pale fan read as a haze band, the domes floated): a darker violet colluvium apron #7A6A8E (linear)
          diffuseColor.rgb = mix( diffuseColor.rgb, uFootCol, smoothstep( 0.45, 0.85, vFoot ) ); }`);
  };
  const ck = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => ck() + "_foot4";
  return m;
};
/** badland mound clusters: rounded humps (radius R, height H, optional table cap) sharing one strata offset */
type Hump = { x: number; z: number; R: number; H: number; cap: number; asp: number; th: number; skew: number };
type Clu = { x: number; z: number; F: number; humps: Hump[]; vOff: number; dx: number; dz: number; tint: number[]; NA: number; NR: number; sp: number };
/** polynomial smooth minimum (rounded table tops) */
const smin = (a: number, b: number, k: number) => { const h = clamp01(0.5 + (0.5 * (b - a)) / k); return lerp(b, a, h) - k * h * (1 - h); };

// ---------------- small geometry helpers ----------------
const M4 = (x: number, y: number, z: number, yaw = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, rz, "YXZ")), V(sx, sy, sz));
const UB = new THREE.BoxGeometry(1, 1, 1);
/** box from centre/size in a local frame m */
const bx = (b: Batch, mat: THREE.Material, m: THREE.Matrix4, cx: number, cy: number, cz: number, w: number, h: number, d: number) =>
  b.add(UB, mat, m.clone().multiply(new THREE.Matrix4().compose(V(cx, cy, cz), new THREE.Quaternion(), V(w, h, d))));
/** box with tiled uvs, min / max in a local frame m */
const tb = (b: Batch, mat: THREE.Material, m: THREE.Matrix4, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0.5) =>
  b.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile), mat, m);
const cyl = (b: Batch, mat: THREE.Material, m: THREE.Matrix4, x: number, y0: number, z: number, r0: number, r1: number, h: number, seg = 10) =>
  b.add(new THREE.CylinderGeometry(r1, r0, h, seg).translate(x, y0 + h / 2, z), mat, m);
/** a tube between two points (rails) */
const tube = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r: number) => {
  const d = c.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, 8, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  b.add(g, mat, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), q, V(1, 1, 1)));
};
/** an unlit text face with its own material (tinted per frame by the light) */
type Face = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; n: THREE.Vector3; gain: number };

// ---------------- vegetation geometry (unit height, base at y = 0) ----------------
const lobeGeo = new THREE.SphereGeometry(1, 12, 8);
const lobes = (list: [number, number, number, number, number][]) =>
  mergeGeometries(list.map(([x, y, z, r, sy]) => lobeGeo.clone().scale(r, r * sy, r).translate(x, y, z)), false)!;
const juniperGeo = (seed: number) => {
  // Utah juniper: a few irregular clumps on a leaning, twisted trunk (not a lollipop)
  const r = P.rng(seed), L: [number, number, number, number, number][] = [], lean = (r() - 0.5) * 0.3;
  const clumps = 4 + Math.floor(r() * 3);
  for (let c = 0; c < clumps; c++) {
    const a = r() * TAU, d = 0.1 + r() * 0.24, y = 0.38 + (c / clumps) * 0.42 + r() * 0.08, cx = Math.cos(a) * d + lean * y, cz = Math.sin(a) * d;
    const k = 3 + Math.floor(r() * 2);
    for (let i = 0; i < k; i++) L.push([cx + (r() - 0.5) * 0.2, y + (r() - 0.5) * 0.12, cz + (r() - 0.5) * 0.2, 0.1 + r() * 0.09, 0.78]);
  }
  L.push([lean * 0.9, 0.9 + r() * 0.06, 0, 0.11 + r() * 0.04, 0.9]);
  return lobes(L);
};
const trunkGeo = () => {
  const g = new THREE.CylinderGeometry(0.045, 0.085, 0.5, 8).translate(0, 0.25, 0);
  const b = new THREE.CylinderGeometry(0.025, 0.04, 0.3, 6).rotateZ(-0.7).translate(0.1, 0.4, 0);
  return mergeGeometries([g.toNonIndexed(), b.toNonIndexed()], false)!;
};
/** a plane plus its mirrored twin (reversed winding, SAME normals): both faces are front faces, so a FrontSide material
 *  never flips the normal on the back (audit A3: DoubleSide flipped the up-normals of half the cards into full shade -
 *  the near-black "burnt weeds" of the backlit shot-8 wide) */
const twoFaced = (g: THREE.BufferGeometry) => {
  const a = g.toNonIndexed(), b = a.clone(), pos = b.attributes.position as THREE.BufferAttribute, uv = b.attributes.uv as THREE.BufferAttribute, nor = b.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 3) for (const attr of [pos, uv, nor]) { // swap vertices 1 and 2 of every triangle
    for (let k = 0; k < attr.itemSize; k++) { const t = attr.getComponent(i + 1, k); attr.setComponent(i + 1, k, attr.getComponent(i + 2, k)); attr.setComponent(i + 2, k, t); } }
  return mergeGeometries([a, b], false)!;
};
/** three crossed cut-out cards, normals straight up (lit like the ground, no card flicker), front-facing both sides */
const tuftGeo = () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) { const q = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY((i * Math.PI) / 3); parts.push(q); }
  const g = mergeGeometries(parts, false)!;
  const n = g.attributes.normal as THREE.BufferAttribute, pp = g.attributes.position as THREE.BufferAttribute;
  // audit A3: straight-up normals left every tuft in shade under the low morning / sunset sun (near-black "burnt weeds");
  // mostly up with an outward tilt gives each tuft a lit side and a shade side (smooth per vertex: no card flicker)
  for (let i = 0; i < n.count; i++) { const v = V(pp.getX(i) * 0.7, 0.85, pp.getZ(i) * 0.7).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return twoFaced(g);
};
/** audit A3 sagebrush (the lobe spheres read as cauliflower / cotton balls): 4 crossed branchy leaf cards round the axis
 *  + 2 tilted ones, uneven widths / heights, normals pointing out and up from the bush centre (soft round shading, no
 *  flat-card flicker), both faces front-facing; unit height, ~1.5 wide */
const sageCardGeo = (seed: number) => {
  const r = P.rng(seed), parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const tilt = i >= 4, w = (tilt ? 1.0 : 1.35) * (0.85 + 0.3 * r()), h = (tilt ? 0.6 : 0.86) * (0.85 + 0.25 * r());
    const q = new THREE.PlaneGeometry(w, h, 4, 3).translate(0, h / 2, 0);
    if (tilt) q.rotateX((i === 4 ? 1 : -1) * 0.6).translate(0, -0.05, 0);
    q.rotateY((i * Math.PI) / 4 + (r() - 0.5) * 0.3);
    parts.push(q);
  }
  const g = mergeGeometries(parts, false)!, pos = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) { const v = V(pos.getX(i) * 0.9, pos.getY(i) * 0.7 + 0.35, pos.getZ(i) * 0.9).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return twoFaced(g);
};
/** round 6: one dry-grass blade card (unit height, tapering, curving forward), two-faced, normals up-out (a 6-instance
 *  clump of these = "5-6 distinct blades" near the lens) */
const bladeGeo = () => {
  const g = new THREE.PlaneGeometry(1, 1, 1, 5).translate(0, 0.5, 0), pa = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setX(i, pa.getX(i) * (1 - 0.6 * y)); pa.setZ(i, 0.22 * y * y); }
  const n = g.attributes.normal as THREE.BufferAttribute, nv = V(0, 0.8, 0.6).normalize(); for (let i = 0; i < n.count; i++) n.setXYZ(i, nv.x, nv.y, nv.z);
  return twoFaced(g);
};
/** round 6 (audit A6 P3 shot 13: the sunlit path stripes neon orange, chroma ~74): the paving's SUNLIT term is pulled
 *  toward an orange of the same luminance but ~30 % less chroma (#C8703A family) by uPathK; the shade is untouched */
const PATH = { uPathK: { value: 0 } };
const pathDone = new WeakSet<THREE.Material>();
const pathTone = <T extends THREE.MeshLambertMaterial>(m: T, key: string): T => {
  if (pathDone.has(m)) return m;
  pathDone.add(m);
  const prev = m.onBeforeCompile, ck = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (sh, rd) => { prev.call(m, sh, rd); sh.uniforms.uPathK = PATH.uPathK;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uPathK;").replace("+ alb * poolLight( geometryPosition, geometryNormal );", `+ alb * poolLight( geometryPosition, geometryNormal );
      { vec3 dd = reflectedLight.directDiffuse; float lw = dot( dd, vec3( 0.2126, 0.7152, 0.0722 ) );
        float orng = clamp( ( dd.r - max( dd.g, dd.b ) * 1.25 ) / max( dd.r, 1e-3 ), 0.0, 1.0 ); // only the hot orange (the violet shade has r ~ b)
        reflectedLight.directDiffuse = mix( dd, lw * vec3( 1.9, 0.75, 0.45 ) * 0.75, uPathK * orng ); }`); }; // (a darker, less saturated orange: ~#C8703A on screen instead of #EE8125)
  m.customProgramCacheKey = () => ck() + "_path_" + key;
  return m;
};
/** lumpy rock / angular chip / pebble prototypes */
const rockGeo = (seed: number, detail: number, jit: number, sy: number) => {
  const r = P.rng(seed);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute("normal"); g.deleteAttribute("uv");
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute, uv: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (r() - 0.5) * jit;
    p.setXYZ(i, p.getX(i) * k, Math.max(-0.35, p.getY(i) * k * sy), p.getZ(i) * k);
    uv.push(Math.atan2(p.getZ(i), p.getX(i)) / TAU + 0.5, p.getY(i) * 0.5 + 0.5);
  }
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};

// ---------------- petrified log slices ----------------
type LogDef = { c: V3; yaw: number; len: number; r: number };
const EXTRA_LOGS: LogDef[] = [
  { c: [-3.4, 0, -7.2], yaw: 0.85, len: 4.2, r: 0.36 },   // TH: behind the sign, left of the trail
  { c: [3.7, 0, -10.5], yaw: -0.35, len: 5.4, r: 0.44 },  // TH: right of the trail
  { c: tt([-6.4, 0, -4.5]), yaw: 0.25, len: 6.5, r: 0.52 },
  // audit A5 P2 (no petrified logs at the LONG LOGS head): two long logs broken into slices behind Sign B, along the path
  { c: tt([2.4, 0, -9.6]), yaw: Math.PI / 2 - 0.1, len: 7, r: 0.55 },
  { c: tt([5.4, 0, -11.5]), yaw: Math.PI / 2 + 0.45, len: 6, r: 0.5 },
  { c: tt([6.6, 0, -3.6]), yaw: -0.45, len: 5.2, r: 0.46 },
  { c: [10, 0, -30], yaw: 0.5, len: 7, r: 0.5 },
  { c: [-22, 0, -30], yaw: -0.2, len: 9, r: 0.62 },
  // trail heads (audit A1): a log on either side of the professor (shot 7) and two along the LONG LOGS path (shot 8)
  { c: tt([4.9, 0, -1.9]), yaw: 0.3, len: 3.0, r: 0.32 },
  { c: tt([-1.85, 0, -4.6]), yaw: Math.PI / 2 - 0.08, len: 3.0, r: 0.32 },
  { c: tt([2.35, 0, -4.5]), yaw: Math.PI / 2 + 0.12, len: 2.6, r: 0.3 },
  { c: tt([-1.95, 0, -9.2]), yaw: Math.PI / 2 - 0.1, len: 3.6, r: 0.3 },
  // trailhead: one more behind the kiosk side
  { c: [-6.2, 0, -14.5], yaw: 1.1, len: 4.6, r: 0.4 },
  // audit A3 shot 13: a sliced log right of Sign B, its axis along the lens (cut faces toward the backlit wide), clear of
  // the shot-8 gap camera's line (x 0.85) and both trails
  { c: tt([1.72, 0, -2.75]), yaw: Math.PI / 2 + 0.06, len: 2.3, r: 0.3 },
];
/** one slice: bumpy radius per angle (shared along a log), ends tilted (broken, not sawn); x along the axis */
const sliceGeo = (rad: number[], len: number, tA: P2, tB: P2) => {
  const NA = rad.length, side = new THREE.BufferGeometry(), cap = new THREE.BufferGeometry();
  const avg = rad.reduce((a, b) => a + b, 0) / NA, around = Math.max(1, Math.round((TAU * avg) / 1.1));
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= 2; j++) for (let i = 0; i <= NA; i++) {
    const a = ((i % NA) / NA) * TAU, r = rad[i % NA] * (j === 1 ? 1.025 : 1), y = Math.cos(a) * r, z = Math.sin(a) * r;
    const x0 = -len / 2 + tA[0] * y + tA[1] * z, x1 = len / 2 + tB[0] * y + tB[1] * z, x = lerp(x0, x1, j / 2);
    pos.push(x, y, z); nor.push(0, Math.cos(a), Math.sin(a)); uv.push((i / NA) * around, x);
  }
  for (let j = 0; j < 2; j++) for (let i = 0; i < NA; i++) {
    const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 2, d = a + NA + 1;
    idx.push(a, c, d, a, b, c);
  }
  side.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); side.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  side.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); side.setIndex(idx);
  const cp: number[] = [], cn: number[] = [], cu: number[] = [];
  for (const [sgn, t] of [[-1, tA], [1, tB]] as const) {
    const n = V(sgn, -sgn * t[0], -sgn * t[1]).normalize();
    for (let i = 0; i < NA; i++) for (const k of [0, sgn > 0 ? 1 : 2, sgn > 0 ? 2 : 1]) {
      const ii = k === 0 ? -1 : (i + k - 1) % NA;
      if (ii < 0) { cp.push((sgn * len) / 2, 0, 0); cu.push(0.5, 0.5); }
      else { const a = (ii / NA) * TAU, r = rad[ii], y = Math.cos(a) * r, z = Math.sin(a) * r; cp.push((sgn * len) / 2 + t[0] * y + t[1] * z, y, z); cu.push(0.5 + 0.47 * Math.cos(a), 0.5 + 0.47 * Math.sin(a)); }
      cn.push(n.x, n.y, n.z);
    }
  }
  cap.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3)); cap.setAttribute("normal", new THREE.Float32BufferAttribute(cn, 3));
  cap.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2));
  return { side, cap };
};

// ---------------- the exterior ----------------
type Inst = { mesh: THREE.InstancedMesh; px: Float32Array; py: Float32Array; pz: Float32Array; yaw: Float32Array; s: Float32Array; sy: Float32Array; amp: number; n: number; flut: number; hide: Uint32Array };
type Flap = { top: THREE.Mesh; bot: THREE.Mesh; flap: THREE.Mesh; y0: number; flapUv: THREE.BufferAttribute; topUv: THREE.BufferAttribute; botUv: THREE.BufferAttribute };
const FLAP_SEQ = (target: number, f0: number) => { // [from, to, start, dur][] for "-" -> 0 -> ... -> target
  const out: [number, number, number, number][] = [];
  let f = f0;
  for (let c = 0; c <= target; c++) { const d = c % 2 ? 2 : 3; out.push([c, c + 1, f, d]); f += d; }
  return out;
};

export class Exterior {
  private g = new THREE.Group();
  private faces: Face[] = [];
  private winds: Inst[] = [];
  private flaps: Flap[] = [];
  private ledCv: HTMLCanvasElement[] = []; private ledTex: THREE.CanvasTexture[] = []; private ledStr = ["", ""]; private ledLit: THREE.MeshBasicMaterial[] = [];
  private signA_old = new THREE.Group(); private signA_new = new THREE.Group();
  private stamp = new THREE.Group(); private stampMark: THREE.Mesh;
  private sparkle: THREE.Mesh; private glint: THREE.Mesh;
  private chipsMarked!: THREE.InstancedMesh; private chipDots!: THREE.InstancedMesh; private chipBase: { p: V3; s: number; yaw: number; hideAt: number; showAt: number; dot: boolean; col?: THREE.Color }[] = [];
  private q = new THREE.Quaternion(); private e = new THREE.Euler(); private m = new THREE.Matrix4(); private v = new THREE.Vector3(); private sc = new THREE.Vector3(1, 1, 1);
  private tint = new THREE.Color();

  constructor(root: THREE.Object3D, _kit: Kit) {
    root.add(this.g);
    // per-shot groups (audit A3): the lot + road + parked vehicles (hidden in the vista shots so the crane reads as the
    // badlands, not a car park), the visitor centre (hidden in shot 2 only), the shot-7 research foreground
    this.g.add(this.lotGrp, this.vcGrp, this.fg7);
    const b = new Batch(), bl = new Batch(), bv = new Batch(), b7 = new Batch();
    // foreground framers (blurred by the lens): a sage clump low in the frame-0 lower-left corner, a sage at the
    // shot-5 lower right and one at the shot-15 lower left (all off the faces; frame 0 = frame 1857 wind phase)
    this.extraTufts.push({ x: -0.36, z: 3.25, s: 0.46, sy: 0.78, yaw: 0.4 }, { x: -0.56, z: 3.45, s: 0.4, sy: 0.66, yaw: 1.9 });
    { const g5 = groundAhead(camAt(5, SHOTS[4].a + 4), 1.4, 0.82); if (!kept(g5[0], g5[1], 0.3)) this.extraSage.push({ x: g5[0], z: g5[1], s: 0.42, yaw: 1.3 }); }
    { const g15 = groundAhead(camAt(15, SHOTS[14].a + 4), 1.25, -0.95); if (!kept(g15[0], g15[1], 0.3)) this.extraSage.push({ x: g15[0], z: g15[1], s: 0.38, yaw: 2.2 }); }
    this.buildFloor();
    this.buildHills();
    this.buildHeroMounds();
    this.buildThMounds();
    this.buildPaving(b, bl);
    this.buildLogs(b);
    this.buildMainSign(b);
    this.buildTrailheadDressing(b);
    this.buildVistaDressing(b, bl, bv);
    this.buildTrailHeads(b);
    this.buildDressA2(b);
    this.buildDressA3(b, b7);
    this.g.add(this.two9);
    this.buildDressA4(b);
    this.buildDressA5(b);
    this.buildDressA5b(b);
    b.build(this.g); bl.build(this.lotGrp); bv.build(this.vcGrp); b7.build(this.fg7); this.bCry.build(this.cryGrp); this.bCryS.build(this.crySign);
    this.buildScatter();
    { const sg = this.inst(sageCardGeo(52), sageM(1), this.two9Sage, 0.05, true, 0.04);
      const tm = twoTone(new THREE.MeshLambertMaterial({ map: P.tuftTex(1), alphaTest: 0.45, emissive: new THREE.Color("#ffffff"), emissiveMap: P.tuftTex(1), emissiveIntensity: 0.1 }), 2.4);
      const tf = this.inst(tuftGeo(), tm, this.two9Tufts, 0.09, false, 0.075);
      this.two9.add(sg, tf);
      const db = new Batch(), blob = new THREE.MeshBasicMaterial({ map: P.blobTex(), color: new THREE.Color("#5a4a7a"), transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      for (const [x, z, w, h, rot] of this.twoBlobs) db.add(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(rot).translate(x, 0.04, z), blob);
      const n0 = this.two9.children.length; db.build(this.two9, false);
      for (let i = n0; i < this.two9.children.length; i++) { this.two9.children[i].layers.set(NOINK); this.two9.children[i].renderOrder = 1; } }
    this.buildDressDecals();
    this.buildFx();
    // sparkle + glint rock (shot 1)
    const gr = this.glintRock();
    this.glint = gr;
    this.sparkle = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.sparkleTex(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, color: new THREE.Color(3.2, 3.0, 2.6), fog: false }));
    this.sparkle.layers.set(NOINK); this.sparkle.renderOrder = 6; this.g.add(this.sparkle);
    // stamp mark on Sign B
    const sB = TT.signB;
    // 0.13 m low (mostly over the pictogram), 0.80 wide, -8 deg; cream knock-out halo in the texture
    this.stampMark = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8 * 600 / 1024), new THREE.MeshBasicMaterial({ map: P.stampMarkTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.stampMark.position.set(TT.base[0] + sB.dx, sB.cy - STAMP_DY, TT.base[2] + sB.z + 0.004); this.stampMark.rotation.z = -0.14;
    this.stampMark.layers.set(NOINK); this.stampMark.renderOrder = 2; this.g.add(this.stampMark);
    this.buildStamp();
    this.buildHeap14();
    this.buildLizard();
    this.buildSunset13();
    this.buildR6();
    this.buildFg10();
  }
  private lotGrp = new THREE.Group(); private vcGrp = new THREE.Group(); private fg7 = new THREE.Group(); private cryGrp = new THREE.Group(); private bCry = new Batch(); private crySign = new THREE.Group(); private bCryS = new Batch();

  // ======================================== ground ========================================
  private buildFloor() {
    const axis = (lo: number, hi: number, fine: [number, number], mid: [number, number]) => {
      const out: number[] = [];
      let x = lo;
      while (x < hi) { out.push(x); const st = x >= fine[0] && x < fine[1] ? 1 : x >= mid[0] && x < mid[1] ? 3 : Math.abs(x) < 320 ? 8 : 25; x += st; }
      out.push(hi);
      return out;
    };
    const xs = axis(-700, 700, [-46, 92], [-130, 170]), zs = axis(-700, 700, [-112, 52], [-210, 110]);
    const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = xs[i], z = zs[j], k = j * nx + i, fd = flatD(x, z), wv = sstep(10, 40, fd), y = wv ? wv * 0.5 * (fbm(x / 21, z / 21, 3) - 0.5) : 0;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 4; uv[k * 2 + 1] = -z / 4;
      // broad colour drift: redder / paler / greyer patches at 6-60 m, a pale gravel apron along the paving
      const a = fbm(x / 34, z / 34, 11), c = fbm(x / 9, z / 9, 12), red = fbm(x / 60, z / 60, 13);
      let l = 0.9 + 0.2 * a + 0.08 * (c - 0.5);
      const pd = fd < 4 ? paveD(x, z) : 9, apron = pd > -0.2 && pd < 1.4 ? sstep(1.4, 0.2, pd) : 0;
      // round 6 (audit A6 P2 shot 1: the trailhead floor read pale #D8BA9C-#EFBE83 against the vista's red-tan): round TH
      // the sand is redder and a touch darker (#C98E62 / #D7A57A family), with a weaker pale gravel apron and more grit
      const thW = sstep(60, 14, Math.hypot(x, z + 6));
      let r = l * (1 + 0.07 * (red - 0.5)), gg = l * (1 - 0.03 * (red - 0.5)), bb = l * (1 - 0.1 * (red - 0.5));
      r = lerp(r, 1.04, apron * (0.5 - 0.3 * thW)); gg = lerp(gg, 1.02, apron * (0.5 - 0.3 * thW)); bb = lerp(bb, 1.0, apron * (0.5 - 0.3 * thW));
      r *= 1 - 0.01 * thW; gg *= 1 - 0.15 * thW; bb *= 1 - 0.13 * thW;
      // dry washes: a darker, redder sandy bed with pale gravel banks; darker grit patches between
      const wd = fd < 60 ? washD(x, z) : Infinity, wash = sstep(2.4, 0.5, wd), bank = sstep(3.9, 2.5, wd) * (1 - wash);
      // round 7 (audit A7 P2 shot 1: the floor round the glint rock read orange-peach #E0A062, C 41-46): the trailhead plaza
      // ground goes dusty red-tan (#CF9670 family, ~25 % less chroma: linear r x0.84, g x0.87, b x1.33) with more dark grit
      // and pale grey gravel patches; (P3 shot 2) the vista floor ~15 % less chroma toward #B98468, grey gravel near the logs
      const thA = sstep(26, 9, Math.hypot(x, z + 1.5)), vsA = sstep(50, 24, Math.hypot(x + 12, z + 36)) * (1 - thA);
      const grit = sstep(0.62, 0.74, fbm(x / 5, z / 5, 14)) * (0.08 + 0.06 * thW + 0.06 * thA + 0.04 * vsA);
      const gravel = sstep(0.64, 0.8, fbm(x / 3.1, z / 3.1, 17)) * (0.7 * thA + 0.8 * vsA);
      r *= lerp(1, 0.85, thA) * lerp(1, 0.95, vsA) * (1 + 0.02 * gravel); gg *= lerp(1, 0.95, thA) * lerp(1, 1.12, vsA) * (1 + 0.12 * gravel); bb *= lerp(1, 1.85, thA) * lerp(1, 1.24, vsA) * (1 + 0.36 * gravel); // (render-measured: C 47 -> 40 at x1.33, the sand map is very orange)
      r *= 1 - 0.13 * wash + 0.07 * bank - grit; gg *= 1 - 0.13 * wash + 0.08 * bank - grit; bb *= 1 - 0.05 * wash + 0.1 * bank - grit * 0.6;
      const far = sstep(60, 260, Math.hypot(x - 20, z + 40)); // far floor a touch paler / pinker (dust haze)
      // shot 3 (carry-over): paler #D7A57A-family sand drift round the pocketing tourist, so his orange shirt separates
      const pale = sstep(7, 2.5, Math.hypot(x - VISTA.pocketTourist[0], z - VISTA.pocketTourist[2])) * 0.09;
      r *= 1 + pale; gg *= 1 + pale * 1.25; bb *= 1 + pale * 1.5;
      // floor tint: the planned red-tan (#C98E62 / #D7A57A family) at ~18 % less saturation than round 1's orange
      col[k * 3] = r * (1 + 0.02 * far) * 0.8; col[k * 3 + 1] = gg * (1 - 0.02 * far) * 0.86; col[k * 3 + 2] = bb * (1 + 0.03 * far) * 1.08;
    }
    const idx: number[] = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b2 = a + 1, c = a + nx + 1, d = a + nx; idx.push(a, d, c, a, c, b2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, hazy(twoTone(new THREE.MeshLambertMaterial({ map: P.sandHD(), vertexColors: true })), "floor"));
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.matrixAutoUpdate = false; mesh.onBeforeRender = this.hazeHook;
    this.g.add(mesh);
  }

  /** badlands: separate rounded mounds (domes, cones, a few flat-topped tables) in four staggered depth rows with
   *  gaps between them (sky and farther rows show through); fluted gully slopes; strata bands that follow height but
   *  wobble and shift per mound; per-mound tint; aerial haze by distance (hazy); flat-topped mesas on the horizon */
  /** badlands (audit A2 P1: the round-1 mounds read as Egyptian pyramids). Painted Desert / Blue Mesa: CLUSTERS of 3-5
   *  overlapping low rounded domes and haystacks (height:width 0.19-0.33, broad convex caps, a few rounded table
   *  tops, no apex anywhere), flanks carved by dense narrow rills every 1.4-6.5 m (finer near the story) plus a few
   *  deeper gullies, darker slate-blue in every groove, skirts that flare out and wash into the sandy floor; strata
   *  bands follow height with a gentle 3-8 deg dip and wavy edges, continuous across the humps of one cluster. Far
   *  back: low flat-topped mesas with a dark caprock rim over banded, rilled talus slopes, under 45-50 % haze. */
  private buildHills() {
    const r = P.rng(4243);
    const STORY: P2[] = [[0, 0], [-6, -40], [TT.base[0], TT.base[2]], [-9, -70]];
    const storyD = (x: number, z: number) => Math.min(...STORY.map(([sx, sz]) => Math.hypot(x - sx, z - sz)));
    // dMin, dMax, main-dome radius R0..R1, height / radius hr0..hr1, clusters, rill spacing (m), angular + radial segments
    const rows: number[][] = [
      [46, 100, 11, 20, 0.5, 0.66, 18, 1.4, 120, 18], [100, 175, 17, 31, 0.46, 0.62, 22, 2.4, 104, 16],
      [175, 300, 26, 45, 0.42, 0.58, 24, 4.0, 88, 14], [300, 520, 38, 64, 0.38, 0.52, 18, 6.5, 72, 12]];
    const cl: Clu[] = [];
    for (const [d0, d1, R0, R1, h0, h1, n, sp, NA, NR] of rows) {
      let made = 0;
      for (let tries = 0; tries < n * 140 && made < n; tries++) {
        const a = r() < 0.62 ? Math.PI + r() * Math.PI : r() * TAU, rad = lerp(30, 600, Math.sqrt(r()));
        const x = 10 + Math.cos(a) * rad * 1.05, z = -10 + Math.sin(a) * rad, sd = storyD(x, z);
        if (sd < d0 || sd > d1) continue;
        const Rc = lerp(R0, R1, r()), F = Rc * 1.6;
        if (flatD(x, z) < Rc * 1.3 + 6) continue;
        if (Math.hypot(x - 26, z + 86) < F + 22 || Math.hypot(x - LOT.c[0], z - LOT.c[1]) < F + 14) continue;
        if (cl.some((m) => Math.hypot(m.x - x, m.z - z) < (m.F + F) * 0.7)) continue;
        const humps: Hump[] = [], nh = 3 + Math.floor(r() * 3);
        for (let k = 0; k < nh; k++) {
          const main = k === 0, aa = r() * TAU, dd = main ? Rc * 0.1 * r() : Rc * (0.5 + 0.45 * r());
          const R = main ? Rc : Rc * (0.4 + 0.38 * r()), hr = lerp(h0, h1, r()) * (main ? 1 : 0.85 + 0.25 * r());
          const hx = x + Math.cos(aa) * dd, hz = z + Math.sin(aa) * dd;
          if (!main && flatD(hx, hz) < R * 1.3 + 5) continue;
          humps.push({ x: hx, z: hz, R, H: R * hr, cap: r() < 0.26 ? 0.72 + 0.14 * r() : 1, asp: 0.68 + r() * 0.32, th: r() * TAU, skew: (r() - 0.5) * 0.2 });
        }
        const dipA = r() * TAU, dip = Math.tan(THREE.MathUtils.degToRad(3 + 5 * r()));
        cl.push({ x, z, F, humps, vOff: r() * 8, dx: Math.cos(dipA) * dip, dz: Math.sin(dipA) * dip, tint: [1 + (r() - 0.5) * 0.08, 1 + (r() - 0.5) * 0.06, 1 + (r() - 0.5) * 0.1], NA, NR, sp });
        made++;
      }
    }
    const mesh = new THREE.Mesh(this.moundGeo(cl, true), this.moundMat());
    mesh.receiveShadow = true; mesh.castShadow = true; mesh.matrixAutoUpdate = false; mesh.layers.set(NOINK); mesh.onBeforeRender = this.hazeHook;
    this.g.add(mesh);
    this.mounds = cl.flatMap((c) => c.humps.map((m) => [m.x, m.z, m.R * 1.3] as [number, number, number]));
    this.buildMesas();
  }
  private moundMatC: THREE.MeshLambertMaterial | null = null;
  private moundMat() {
    // audit A4 P2: lower-contrast strata with wobbly soft edges, sub-beds, dark-slate marker beds and down-slope rills
    // round 6 (audit A6 P2): broad Blue Mesa beds (BADLAND_BANDS5), fewer / wider texture rills (no pleats); 70 % of the
    // scene fog (A6 P2 shot 1: the bands behind her were a faint lavender strip)
    // round 7 (audit A7 P2 shot 8 "striped circus tents"): the far field's own strata - the same beds, but the texture rills
    // stop 2-6 m up (they converged at the apex of the smaller far domes) and are thin dark-lavender cuts
    if (!this.moundMatC) this.moundMatC = hazy(footy(twoTone(new THREE.MeshLambertMaterial({ map: P.strataBandsHD("bad11", P.BADLAND_BANDS5, 36, { sat: 0.8, blend: 0.22, fine: 0, rills: 4, rillTop: [0.05, 0.16], srgb: true }), vertexColors: true }), 1, true), "#c49a78"), "mound", 1, { tone: 1, fog: 0.7, cloud: true });
    return this.moundMatC;
  }
  /** the vista hero mounds: the same strata, a depth ramp that starts further out (near row clear, far row ~25 % toward
   *  the horizon colour) so the rows separate without a pale band at their feet (audit A6 P2) */
  private heroMat() {
    return hazy(footy(twoTone(new THREE.MeshLambertMaterial({ map: P.strataBandsHD("bad10", P.BADLAND_BANDS5, 36, { sat: 0.8, blend: 0.22, fine: 0, rills: 6, rillTop: [0.15, 0.42], srgb: true }), vertexColors: true }), 1, true), "#c49a78"), "heroMound", 0.85, { d0: 125, d1: 320, tone: 1, fog: 0.65, cloud: true });
  }
  /** audit A3 P1 (domes read as circus tents / plaid): the strata v coordinate is WORLD HEIGHT ONLY (+ one constant offset
   *  per cluster), the band texture has straight edges, the rills are shallow and only darken the lower slopes (<= 8 %) */
  private moundGeo(cl: Clu[], lowG = false) {
    const pos: number[] = [], uv: number[] = [], col: number[] = [], foot: number[] = [], idx: number[] = [];
    for (const c of cl) for (const m of c.humps) {
      const rr = P.rng(Math.abs(Math.floor(m.x * 13 + m.z * 7)) + 11), p1 = rr() * TAU, p2 = rr() * TAU, p3 = rr() * TAU;
      const NA = c.NA, NR = c.NR, nR = Math.max(10, Math.round((TAU * m.R * 0.72) / c.sp)), nG = 5 + Math.floor(rr() * 4);
      // audit A4 P2: break the dome silhouettes: 40 % of the humps get one eroded notch (a saddle gully down one side)
      const hasN = rr() < 0.4, aN = rr() * TAU, wN = 0.1 + 0.12 * rr(), dN = 0.08 + 0.12 * rr(), nS = 7 + Math.floor((p1 / TAU) * 5);
      // round 6 (audit A6 P2 "perfectly radial, pleated domes"): 8-14 deep irregular gullies (random azimuths and widths,
      // 0.6-1 m deep, reaching 15-40 % up the dome), +-0.6-1 m noise on the outline, a 2-3 lobe plan shape
      const nGul = 8 + Math.floor(rr() * 7), gul = Array.from({ length: nGul }, () => [rr() * TAU, 0.035 + 0.06 * rr(), 0.6 + 0.4 * rr(), 0.15 + 0.25 * rr()]);
      // round 7 (audit A7 P2 shot 8: the trail-head domes read as striped circus tents - the gullies ran up to the apex and
      // the bands chevroned down them): the far field's gullies start at mid-slope and are shallower, so the upper
      // domes keep level horizontal beds and the erosion lives on the lower flanks only
      if (lowG) for (const gq of gul) { gq[3] = 0.5 + (gq[3] - 0.15) * 1.2; gq[2] *= 0.7; }
      const DN = THREE.MathUtils.clamp(0.055 * m.R, 0.8, 2.8), GK = Math.max(1, m.R / 14), lob = 2 + Math.floor(rr() * 2), pL = rr() * TAU, aL = 0.06 + 0.06 * rr(), pB = rr() * TAU;
      const around = Math.max(1, Math.round((TAU * m.R) / 46)), ct = Math.cos(m.th), st = Math.sin(m.th), base = pos.length / 3;
      for (let j = 0; j <= NR; j++) {
        const t = (j / NR) * 1.3; // t > 1: the flared apron, the last ring sinks just under the floor
        for (let i = 0; i <= NA; i++) {
          const a = ((i % NA) / NA) * TAU, ca = Math.cos(a), sa = Math.sin(a);
          const rm = 1 + 0.09 * Math.sin(3 * a + p1) + 0.055 * Math.sin(5 * a + p2) + 0.03 * Math.sin(9 * a + p3) + aL * Math.sin(lob * a + pL);
          const u = Math.min(1, t);
          let f = 0.84 * (1 - Math.pow(u, 2.3)) + 0.16 * (1 - sstep(0.45, 1.3, t)); // broad convex cap, steeper lower flank
          if (m.cap < 1) f = smin(f, m.cap, 0.05) / m.cap;                       // a rounded table top
          // narrow V rills between broad rounded ribs (they meander a little downslope) + a few deep gullies
          const mea = vnoise(ca * 2.2 + t * 1.7 + p1, sa * 2.2 - t * 1.3, 17) - 0.5;
          const g1 = Math.pow(0.5 + 0.5 * Math.cos(nR * a + mea * 3.2 + p2), 4);
          const g2 = Math.pow(0.5 + 0.5 * Math.cos(nG * a + p3 + 0.9 * Math.sin(t * 3 + p1)), 3);
          const dep = sstep(0.5, 0.82, t) * (1 - sstep(0.98, 1.22, t)); // audit A3: rills on the lower slopes only
          let h = m.H * f;
          // audit A5 P2: scalloped crests - rounded lobes along the upper flanks so the skyline is not a ruler-smooth dome
          h -= m.H * 0.035 * Math.pow(0.5 + 0.5 * Math.cos(nS * a + p1 * 2), 2) * sstep(0.12, 0.4, t) * (1 - sstep(0.62, 0.9, t));
          if (hasN) { const da = Math.atan2(Math.sin(a - aN), Math.cos(a - aN)); h -= m.H * dN * Math.exp(-((da / wN) ** 2)) * (lowG ? sstep(0.4, 0.62, t) * 0.6 : sstep(0.08, 0.3, t)) * (1 - sstep(0.55, 0.95, t)); }
          // round 6: the even pleats at half depth with a noisy amplitude (30-100 %), so the flanks are not combed
          h -= dep * (m.H * 0.003 + c.sp * 0.015) * g1 * (0.3 + 0.7 * vnoise(ca * 2.4 + p3, sa * 2.4 + t * 1.8, 29)) + dep * m.H * 0.018 * g2;
          h += m.H * 0.075 * (vnoise(ca * t * 2.6 + pB, sa * t * 2.6 - pB, 31) - 0.5) * 2 * (1 - sstep(0.45, 0.9, t)); // a lumpy crown (2-3 sub-peaks; continuous at the apex)
          let gR = 0;
          for (const [ag, wg, dg, tg] of gul) { const da = Math.atan2(Math.sin(a - ag), Math.cos(a - ag)), gk = Math.exp(-((da / wg) ** 2)) * sstep(tg, tg + 0.25, t) * (1 - sstep(1.02, 1.22, t)); h -= dg * GK * gk; gR += dg * GK * 0.7 * gk; }
          h *= 0.95 + 0.1 * vnoise(ca * 3 + p2, sa * 3 + t * 2.5, 9);
          h -= 0.4 * sstep(1.14, 1.3, t);
          const dR = (vnoise(ca * 2.6 + p2, sa * 2.6 + t * 1.4 + p1, 23) - 0.5) * 2 * DN * sstep(0.2, 0.6, t);
          const rad = Math.max(0, m.R * rm * t * (1 - 0.012 * g1 * dep) - gR * sstep(0.1, 0.4, t) + dR);
          const lx = ca * rad + m.skew * h, lz = sa * rad * m.asp;
          const x = m.x + lx * ct - lz * st, z = m.z + lx * st + lz * ct, y = h + floorY(x, z);
          pos.push(x, y, z);
          uv.push((i / NA) * around, (Math.max(0, y) + c.vOff + m.H * (0.03 * Math.sin(2 * a + p2) + 0.015 * Math.sin(5 * a + p3)) * (1 - 0.5 * u)) / 36); // audit A5 P2: beds undulate 2-4 % of the dome height
          const low = sstep(0.5, 0.82, t) * (1 - sstep(1.05, 1.25, t)), dk = low * (0.06 * g1 + 0.025 * g2), capK = 1 + 0.04 * (1 - sstep(0, 0.4, t));
          // audit A4: table tops carry a brown caprock rim (the flat skyline reads as a cap-rock butte)
          const rock = m.cap < 1 ? sstep(0.93, 0.99, f) : 0;
          const rk: [number, number, number] = [lerp(1, 0.8, rock), lerp(1, 0.66, rock), lerp(1, 0.6, rock)];
          col.push(c.tint[0] * (1 - dk) * capK * rk[0], c.tint[1] * (1 - dk) * capK * rk[1], c.tint[2] * (1 - dk * 0.9) * capK * rk[2]); // thin erosion streaks, value only
          foot.push(0.85 * sstep(0.88, 1.2, t));
        }
      }
      for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = base + j * (NA + 1) + i, b2 = a + 1, c2 = a + NA + 2, d = a + NA + 1; idx.push(a, c2, d, a, b2, c2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute("foot", new THREE.Float32BufferAttribute(foot, 1));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  }
  /** audit A3 P1 (shot 2 did not read as the badlands: the bands were an 8 % strip at the horizon): four big rounded,
   *  boldly banded mound clusters 115-200 m out along the crane's end view, left of and behind the log field, so the
   *  stripes fill ~15-20 % of the final frame's height. Vista shots only (the lot, road and visitor centre are hidden in
   *  those shots, so nothing here has to clear them) */
  private buildHeroMounds() {
    const r = P.rng(5151), cl: Clu[] = [];
    for (const [along, perp, R, hr] of [[115, -16, 24, 0.72], [152, 12, 32, 0.72], [132, -44, 22, 0.68], [200, -14, 42, 0.66]] as const) {
      const [x, z] = alongV2(along, perp), humps: Hump[] = [];
      // audit A4 P2 (f): the back cluster's main hump is a flat-topped cap-rock butte on the skyline
      // round 6 (audit A6 P2: flatten 1-2 tops into mesa caps): the big middle cluster's main hump is a cap-rock table too
      humps.push({ x, z, R, H: R * hr * (along === 200 ? 1.12 : 1), cap: along === 200 ? 0.8 : along === 152 ? 0.84 : 1, asp: 0.8 + r() * 0.2, th: r() * TAU, skew: (r() - 0.5) * 0.12 });
      for (let k = 0, nh = 2 + Math.floor(r() * 2); k < nh; k++) {
        const aa = r() * TAU, dd = R * (0.55 + 0.35 * r()), RR = R * (0.42 + 0.3 * r());
        humps.push({ x: x + Math.cos(aa) * dd, z: z + Math.sin(aa) * dd, R: RR, H: RR * hr * (0.85 + 0.2 * r()), cap: r() < 0.3 ? 0.8 : 1, asp: 0.7 + r() * 0.3, th: r() * TAU, skew: (r() - 0.5) * 0.15 });
      }
      cl.push({ x, z, F: R * 1.6, humps, vOff: r() * 8, dx: 0, dz: 0, tint: [1 + (r() - 0.5) * 0.06, 1 + (r() - 0.5) * 0.05, 1 + (r() - 0.5) * 0.08], NA: 120, NR: 18, sp: 2.4 });
    }
    const mesh = new THREE.Mesh(this.moundGeo(cl), this.heroMat());
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.matrixAutoUpdate = false; mesh.layers.set(NOINK); mesh.onBeforeRender = this.hazeHook; mesh.visible = false;
    this.g.add(mesh); this.vistaMounds = mesh;
    this.heroMounds = cl.flatMap((c) => c.humps.map((m) => [m.x, m.z, m.R * 1.3] as [number, number, number]));
  }
  private vistaMounds!: THREE.Mesh; private heroMounds: [number, number, number][] = [];
  private thMounds: THREE.Mesh | null = null;
  /** round 6 (audit A6 P2 shot 1: "the far badlands are a faint lavender strip, the hook doesn't read as a desert park"):
   *  two boldly banded mound clusters ~150-175 m out behind the trailhead (bearings -10 / +13 deg off -z), with the
   *  vista's low-haze strata, shown in the trailhead shots only (frame 0 = the last frame) */
  private buildThMounds() {
    const r = P.rng(7171), cl: Clu[] = [];
    for (const [x, z, R, hr] of [[38, -168, 30, 0.6], [-30, -158, 24, 0.66], [8, -205, 34, 0.55]] as const) {
      const humps: Hump[] = [{ x, z, R, H: R * hr, cap: R === 34 ? 0.82 : 1, asp: 0.8 + r() * 0.2, th: r() * TAU, skew: (r() - 0.5) * 0.12 }];
      for (let k = 0, nh = 2 + Math.floor(r() * 2); k < nh; k++) { const aa = r() * TAU, dd = R * (0.55 + 0.35 * r()), RR = R * (0.42 + 0.3 * r());
        humps.push({ x: x + Math.cos(aa) * dd, z: z + Math.sin(aa) * dd, R: RR, H: RR * hr * (0.85 + 0.2 * r()), cap: r() < 0.3 ? 0.8 : 1, asp: 0.7 + r() * 0.3, th: r() * TAU, skew: (r() - 0.5) * 0.15 }); }
      cl.push({ x, z, F: R * 1.6, humps, vOff: r() * 8, dx: 0, dz: 0, tint: [1, 1, 1], NA: 110, NR: 16, sp: 3 });
    }
    const mesh = new THREE.Mesh(this.moundGeo(cl), this.heroMat());
    mesh.receiveShadow = true; mesh.castShadow = false; mesh.matrixAutoUpdate = false; mesh.layers.set(NOINK); mesh.onBeforeRender = this.hazeHook; mesh.visible = false;
    this.g.add(mesh); this.thMounds = mesh;
  }
  private buildMesas() {
    // mesas: low (28-44 m), long, flat-topped, a dark caprock cliff over a broad banded talus slope with rills
    const mp: number[] = [], mu: number[] = [], mc: number[] = [], mf: number[] = [], mi: number[] = [];
    const prof = [[1.7, 0], [1.46, 0.08], [1.28, 0.2], [1.15, 0.36], [1.07, 0.52], [1.025, 0.66], [1.0, 0.76], [0.99, 0.79], [0.978, 0.93], [0.962, 0.985], [0.93, 1.0], [0.5, 1.0], [0, 1.0]];
    for (const [cx, cz, R, Hh, seed, asp, th] of [[-190, -365, 100, 38, 1, 0.55, 0.3], [75, -430, 125, 58, 2, 0.5, -0.1], // A4: 42 -> 58 m (it hid behind the trailhead roofs at frame 0) [280, -335, 82, 32, 3, 0.6, 0.6],
      [-385, -190, 105, 40, 4, 0.5, 1.2], [365, -140, 72, 28, 5, 0.65, -0.7],
      // audit A4 P2: a butte in the gap left of the [75, -430] mesa, so the frame-0 horizon is banded on BOTH sides of her
      [-88, -492, 78, 60, 6, 0.55, 0.15],
      // audit A5 P2 (shot 2: no flat-topped mesas on the horizon): one in the left sky gap and one over the right
      // dome's shoulder of the crane's end frame (~390 / 510 m out, hazed ~40 % by the mesa ramp)
      [180, -386, 85, 52, 7, 0.55, 0.9], [440, -265, 70, 46, 8, 0.6, -0.4]] as const) {
      const rr = P.rng(seed * 97), NA = 240, base = mp.length / 3, nR = 70 + Math.floor(rr() * 20), p1 = rr() * TAU, p2 = rr() * TAU;
      const rad = Array.from({ length: NA }, (_, i) => { const a = (i / NA) * TAU; return 1 + 0.13 * Math.sin(3 * a + seed) + 0.08 * Math.sin(7 * a + seed * 2) + 0.04 * Math.sin(17 * a + seed * 3); });
      const ct = Math.cos(th), st = Math.sin(th), around = Math.round((TAU * R) / 60);
      for (let k = 0; k < prof.length; k++) for (let i = 0; i <= NA; i++) {
        const a = ((i % NA) / NA) * TAU, yf = prof[k][1], skirt = yf < 0.76 && yf > 0.02 ? 1 : 0;
        const g1 = Math.pow(0.5 + 0.5 * Math.cos(nR * a + p1 + 2.4 * (vnoise(Math.cos(a) * 3 + yf * 2, Math.sin(a) * 3, 31) - 0.5)), 4);
        const joint = yf >= 0.79 && yf <= 0.985 ? Math.pow(0.5 + 0.5 * Math.cos(nR * 1.6 * a + p2), 8) : 0;
        const rk = prof[k][0] * R * (k < prof.length - 1 ? rad[i % NA] : 0) * (1 - 0.01 * g1 * skirt - 0.006 * joint); // audit A3: shallow rills (no stripes)
        const lx = Math.cos(a) * rk, lz = Math.sin(a) * rk * asp;
        const x = cx + lx * ct - lz * st, z = cz + lx * st + lz * ct, y = yf * Hh - 1 - 0.25 * g1 * skirt;
        mp.push(x, y, z);
        mu.push((i / NA) * around, Math.min(0.999, Math.max(0, yf))); // height-only strata (audit A3: no azimuth term)
        const dk = 0.06 * g1 * skirt + 0.07 * joint;
        mc.push(1 - dk, 1 - dk, 1 - dk * 0.9); mf.push(yf < 0.08 ? 0.6 * (1 - yf / 0.08) : 0);
      }
      for (let k = 0; k < prof.length - 1; k++) for (let i = 0; i < NA; i++) { const a = base + k * (NA + 1) + i, b2 = a + 1, c = a + NA + 2, d = a + NA + 1; mi.push(a, c, b2, a, d, c); }
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(mu, 2));
    mg.setAttribute("color", new THREE.Float32BufferAttribute(mc, 3)); mg.setAttribute("foot", new THREE.Float32BufferAttribute(mf, 1));
    mg.setIndex(mi); mg.computeVertexNormals();
    // audit A4 P2: bold thick Blue Mesa beds + rills, and ~30-35 % total haze at 450 m (was ~80 %: a faint pink strip)
    const mesaTex = P.strataBandsHD("mesa6", P.MESA3_BANDS, 1, { wob: 0.06, blend: 0.12, rills: 24, rillTop: [0.3, 0.72], srgb: true, sat: 0.85 }) /* round 5b: sRGB band values (they were decoded twice) */; mesaTex.wrapT = THREE.ClampToEdgeWrapping;
    const mm = new THREE.Mesh(mg, hazy(footy(twoTone(new THREE.MeshLambertMaterial({ map: mesaTex, vertexColors: true }), 1, true), "#c49a78"), "mesa", 0.32, { fog: 0.42, tone: 0.7 }));
    mm.receiveShadow = true; mm.castShadow = false; mm.matrixAutoUpdate = false; mm.layers.set(NOINK); mm.onBeforeRender = this.hazeHook;
    this.g.add(mm);
  }
  private mounds: [number, number, number][] = [];

  // ======================================== paving + rails ========================================
  private ribbon(b: Batch, L: P2[], w: number, mat: THREE.Material, y = 0.03, v0 = 0) {
    const pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = [];
    let s = v0;
    for (let i = 0; i < L.length; i++) {
      const a = L[Math.max(0, i - 1)], c = L[Math.min(L.length - 1, i + 1)], dx = c[0] - a[0], dz = c[1] - a[1], n = Math.hypot(dx, dz) || 1;
      const sx = -dz / n, sz = dx / n;
      if (i) s += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]);
      for (const k of [-1, 1]) {
        const x = L[i][0] + (sx * k * w) / 2, z = L[i][1] + (sz * k * w) / 2;
        pos.push(x, floorY(x, z) + y, z); nor.push(0, 1, 0); uv.push(k < 0 ? 0 : 1, s / 2.2);
      }
      if (i) { const q = (i - 1) * 2; idx.push(q, q + 2, q + 3, q, q + 3, q + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    // make sure the winding faces up
    const ia = g.index!.array; const p0 = V(pos[ia[0] * 3], 0, pos[ia[0] * 3 + 2]), p1 = V(pos[ia[1] * 3], 0, pos[ia[1] * 3 + 2]), p2 = V(pos[ia[2] * 3], 0, pos[ia[2] * 3 + 2]);
    if (p1.sub(p0).cross(p2.sub(p0)).y < 0) { const ii = Array.from(ia); for (let k = 0; k < ii.length; k += 3) [ii[k + 1], ii[k + 2]] = [ii[k + 2], ii[k + 1]]; g.setIndex(ii); }
    b.add(g, mat);
  }
  private rail(b: Batch, L: P2[], side: number, off: number, from: number, to: number, k = 1) {
    const mat = lam("atRail", () => ({ color: "#56625a" })), post = lam("atRailPost", () => ({ color: "#4a554e" }));
    let s = 0, next = from;
    const pts: THREE.Vector3[] = [];
    for (let i = 1; i < L.length && s < to; i++) {
      const a = L[i - 1], c = L[i], d = Math.hypot(c[0] - a[0], c[1] - a[1]);
      while (next <= s + d && next <= to) {
        const t = (next - s) / d, x = lerp(a[0], c[0], t), z = lerp(a[1], c[1], t), nx = -(c[1] - a[1]) / d, nz = (c[0] - a[0]) / d;
        pts.push(V(x + nx * side * off, 0, z + nz * side * off)); next += 2.5;
      }
      s += d;
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], y = floorY(p.x, p.z);
      b.add(new THREE.CylinderGeometry(0.032 * k, 0.036 * k, 0.88, 8).translate(p.x, y + 0.44, p.z), post);
      b.add(new THREE.SphereGeometry(0.042 * k, 8, 6).translate(p.x, y + 0.88, p.z), post);
      if (i) { const q = pts[i - 1], yq = floorY(q.x, q.z);
        tube(b, mat, V(q.x, yq + 0.84, q.z), V(p.x, y + 0.84, p.z), 0.024 * k);
        tube(b, mat, V(q.x, yq + 0.46, q.z), V(p.x, y + 0.46, p.z), 0.02 * k); }
    }
  }
  private buildPaving(b: Batch, bl: Batch) {
    const asph = pathTone(lam("atAsphalt", () => ({ map: P.asphaltHD() })), "asph"), road = lam("atRoad", () => ({ map: P.asphaltHD(), color: new THREE.Color(0.78, 0.76, 0.74) }));
    // audit A3: the vista trail in the planned pale grey-tan (#B7AEA2) so it reads as a paved ribbon against the red floor
    const asphV = lam("atAsphaltVista", () => ({ map: P.asphaltHD(), color: new THREE.Color(1.0, 1.15, 1.34) }));
    const gravel = pathTone(lam("atGravelEdge", () => ({ map: P.gravelEdgeHD() })), "gravel");
    // TH plaza (round 6, audit A6 P2 shot 1: pale, washed): the warm red-dust concrete of the trail-head plaza, tiled in
    // world space, a touch darker than at TT (it fills the frame-0 floor)
    { const pw = lam("atPlazaTH7", () => ({ map: P.plazaTH(), color: new THREE.Color(0.76, 0.672, 0.86) })) /* round 7: dusty red-tan, ~25 % less chroma (was 0.92, 0.79, 0.8 on the warm plaza) */, g = new THREE.PlaneGeometry(5.6, 4.45).rotateX(-Math.PI / 2).translate(0, 0.032, -0.375);
      const ua = g.attributes.uv as THREE.BufferAttribute, pa = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < ua.count; i++) ua.setXY(i, pa.getX(i) / 2.2 + 0.31, -pa.getZ(i) / 2.2);
      b.add(g, pw); void asph; }
    this.ribbon(b, TR_VISTA, VISTA.trailW, asphV, 0.03);                                          // the vista trail
    for (const sd of [-1, 1]) this.ribbon(b, offsetLine(TR_VISTA, sd * (VISTA.trailW / 2 + 0.2)), 0.42, gravel, 0.024); // its gravel edges
    // TT plaza (audit A3 P2: shot 10 paving pale / chalky / empty): warm red-dust concrete tiled in world space (no
    // stretched pebbles), a pebbly #9C6E4E gravel border on the front and both sides
    { const pw = pathTone(lam("atPlazaWarm", () => ({ map: P.plazaWarmHD() })), "plaza"), [cx, cz] = ttP(0, 2.35), W = 11.6, D = 6.3;
      const g = new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2).translate(cx, 0.032, cz);
      const ua = g.attributes.uv as THREE.BufferAttribute, pa = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < ua.count; i++) ua.setXY(i, pa.getX(i) / 2.2, -pa.getZ(i) / 2.2);
      b.add(g, pw);
      this.ribbon(b, [[cx - W / 2 - 0.45, cz + D / 2 + 0.38], [cx + W / 2 + 0.45, cz + D / 2 + 0.38]], 0.5, gravel, 0.026);
      for (const sx of [-1, 1]) this.ribbon(b, [[cx + sx * (W / 2 + 0.25), cz - D / 2 + 0.2], [cx + sx * (W / 2 + 0.25), cz + D / 2 + 0.6]], 0.5, gravel, 0.026); }
    for (const L of TR_TT) this.ribbon(b, L, 1.9, asph, 0.03, 0.7);
    this.ribbon(bl, TR_ROAD, 6.4, road, 0.035);
    this.ribbon(bl, [[LOT.c[0] - LOT.w / 2, LOT.c[1]], [LOT.c[0] + LOT.w / 2, LOT.c[1]]], LOT.d, road, 0.036);
    this.ribbon(b, TR_LOTPATH, 1.8, asph, 0.031);
    // drifted sand on the plazas and trail starts (so no frame shows a bare paved floor)
    const dr = P.rng(515), drift = [0, 1].map((i) => pathTone(lam("atDrift" + i, () => ({ map: P.driftTex(i), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })), "drift" + i));
    const drifts: [number, number, number, number][] = [[-2.2, 0.6, 2.2, 0.4], [2.3, -0.8, 2.6, -0.3], [1.6, 1.4, 1.6, 0.2], [-1.2, -2.0, 2.0, 0.9], [0.4, -5, 1.8, 1.3], [-0.6, -9, 2.0, 1.7],
      [TT.base[0] - 5, TT.base[2] + 4.6, 2.6, 0.2], [TT.base[0] - 1.6, TT.base[2] + 4.9, 2.2, -0.3], [TT.base[0] + 2.2, TT.base[2] + 4.2, 2.4, 0.5], [TT.base[0] + 4.9, TT.base[2] + 1.6, 2.0, 1.2],
      [TT.base[0] - 4.4, TT.base[2] + 1.2, 1.8, 2.4], [TT.base[0] + 1.6, TT.base[2] + 0.6, 1.4, 0.9], [TT.base[0] - 1.8, TT.base[2] + 2.6, 1.6, 2.0]];
    const db = new Batch();
    drifts.forEach(([x, z, sz, rot], i) => db.add(new THREE.PlaneGeometry(sz * (1.3 + dr() * 0.5), sz).rotateX(-Math.PI / 2).rotateY(rot).translate(x, 0.036 + i * 0.0004, z), drift[i % 2]));
    const n0 = this.g.children.length; db.build(this.g, false);
    for (let i = n0; i < this.g.children.length; i++) { this.g.children[i].layers.set(NOINK); this.g.children[i].renderOrder = 1; }
    // parking stripes
    const paint = lam("atStripe", () => ({ color: "#f2ede2" }));
    for (let i = 0; i < 6; i++) { const x = LOT.c[0] - LOT.w / 2 + 1.2 + i * 2.6; bl.add(new THREE.PlaneGeometry(0.1, 3.6).rotateX(-Math.PI / 2).translate(x, 0.04, LOT.c[1] - 2.2), paint); }
    // low metal rails: vista trail west side (+ the TT trails' west sides near the heads); the vista rail 1.35x thicker so
    // the two tubes read from the crane (audit A3)
    this.rail(b, TR_VISTA, -1, VISTA.trailW / 2 + 0.42, 1.2, 140, 1.35);
    for (const L of TR_TT) this.rail(b, L, -1, 1.25, 2.2, 22);
    // curbs at the plazas' front edges (a few ink lines where the paving ends)
    const curb = lam("atCurb", () => ({ color: "#c9bfb2" }));
    tb(b, curb, new THREE.Matrix4(), -2.85, 0, 1.8, 2.85, 0.036, 1.95, 1); // audit A5 P2: flush (a 6 cm kerb sliced her ankles in the shot-1 MCU)
    tb(b, curb, new THREE.Matrix4(), TT.base[0] - 5.85, 0, TT.base[2] + 5.45, TT.base[0] + 5.85, 0.07, TT.base[2] + 5.62, 1);
  }

  // ======================================== petrified logs ========================================
  private logSlices(b: Batch, L: LogDef, seed: number, chips: [number, number, number][]) {
    const r = P.rng(seed), NA = 22, bark = lam("atBark", () => ({ map: P.barkHD() }));
    const caps = [0, 1, 2, 3].map((i) => jasM(i));
    const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
    // audit A3: radius noise amplitude halved (the shot-2 hero slice's two top lobes read as a heart)
    const prof = Array.from({ length: NA }, (_, i) => { const a = (i / NA) * TAU; return 1 + 0.04 * Math.sin(2 * a + p1) + 0.03 * Math.sin(3 * a + p2) + 0.02 * Math.sin(5 * a + p3) + 0.0125 * Math.sin(9 * a + p1 * 2); });
    const ax = Math.cos(L.yaw), az = -Math.sin(L.yaw);
    // the lens that sees this log best (nearest story camera): one slice rolls off the line and stands on edge with
    // its rainbow face turned to it, and one lies flat, face up (both read from any height)
    let co = SIGHT[0].o, cd = Infinity;
    for (const { o } of SIGHT) { const d = Math.hypot(o.x - L.c[0], o.z - L.c[2]); if (d < cd) { cd = d; co = o; } }
    const nSl = Math.max(2, Math.round(L.len / 1.1)), rollAt = Math.floor(r() * nSl), flatAt = (rollAt + 1 + Math.floor(r() * (nSl - 1))) % nSl;
    let s = -L.len / 2, k = 0;
    while (s < L.len / 2 - 0.3) {
      const sl = Math.min(0.5 + r() * 0.7, L.len / 2 - s), mid = s + sl / 2;
      let x = L.c[0] + ax * mid, z = L.c[2] + az * mid;
      const taper = 1 - 0.16 * ((mid + L.len / 2) / L.len), rr = L.r * taper;
      const { side, cap } = sliceGeo(prof.map((q) => q * rr), sl, [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25], [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25]);
      let q: THREE.Quaternion, y = rr * 0.9;
      if (k === rollAt || k === flatAt) {
        const side2 = r() < 0.5 ? 1 : -1, off = rr + 0.35 + r() * 0.3; // roll it off the line, beside the log
        x += -az * side2 * off; z += ax * side2 * off;
        if (k === rollAt) { // standing on edge, cut face to the lens, tipped back a little
          const yawF = Math.atan2(-(co.z - z), co.x - x);
          q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawF, 0.14 + r() * 0.1, "YXZ")); y = rr * 0.98;
        } else { q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * TAU, Math.PI / 2 + (r() - 0.5) * 0.12, "YXZ")); y = sl / 2 + 0.01; }
      } else { // round 6 (audit A6 P3: the rear slices stood like crates, bark out): each slice turns up to ~22 deg toward its
        // nearest story lens (whichever cut face is nearer) and tilts 8-17 deg, so the rainbow faces show
        const rx = r() * TAU, y0 = L.yaw + (r() - 0.5) * 0.66, tilt = (r() < 0.5 ? -1 : 1) * (0.14 + r() * 0.16), tc = Math.atan2(-(co.z - z), co.x - x);
        let dy = Math.atan2(Math.sin(tc - y0), Math.cos(tc - y0)); if (dy > Math.PI / 2) dy -= Math.PI; if (dy < -Math.PI / 2) dy += Math.PI;
        q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, y0 + Math.sign(dy) * Math.min(Math.abs(dy), 0.38), tilt, "YZX")); }
      const skip = paveD(x, z) < rr + 0.25 || kept(x, z, rr * 0.6);
      if (!skip) {
        const m = new THREE.Matrix4().compose(V(x, floorY(x, z) + y, z), q, V(1, 1, 1)), ci = Math.floor(r() * 4);
        b.add(side, bark, m); b.add(cap, Math.hypot(x - V2F_XZ[0], z - V2F_XZ[1]) < 0.7 ? jasM(4) : caps[ci], m); // round 6: the shot-2 match slice = the most orange / yellow face (matches the shot-1 rock)
        for (let c = 0; c < 9; c++) { const a = r() * TAU, d = rr + 0.08 + r() ** 1.5 * 1.4; chips.push([x + Math.cos(a) * d, z + Math.sin(a) * d, 0.035 + r() * 0.08]); }
      }
      s += sl + 0.2 + r() * 0.15; k++;
    }
  }
  private buildLogs(b: Batch) {
    this.chipSpots = [];
    [...VISTA.logs, ...EXTRA_LOGS].forEach((L, i) => this.logSlices(b, L, 300 + i * 17, this.chipSpots));
    // round 6 (audit A6 P3): 2-3 broken chunks (small slices / bark lumps) lying at the feet of every log
    { const r = P.rng(6006), bark = lam("atBark", () => ({ map: P.barkHD() }));
      [...VISTA.logs, ...EXTRA_LOGS].forEach((L, li) => { const ax = Math.cos(L.yaw), az = -Math.sin(L.yaw);
        for (let k = 0, n = 2 + (li % 2); k < n; k++) {
          const along = (r() - 0.5) * L.len, side = r() < 0.5 ? 1 : -1, off = L.r + 0.25 + r() * 0.45, x = L.c[0] + ax * along - az * side * off, z = L.c[2] + az * along + ax * side * off;
          const R0 = L.r * (0.22 + r() * 0.2), NA = 12, rad = Array.from({ length: NA }, (_, i) => R0 * (1 + 0.14 * Math.sin(2 * i + k + li)));
          const { side: sd, cap } = sliceGeo(rad, R0 * (0.6 + r() * 0.9), [(r() - 0.5) * 0.4, (r() - 0.5) * 0.4], [(r() - 0.5) * 0.4, (r() - 0.5) * 0.4]);
          if (paveD(x, z) < R0 + 0.2 || kept(x, z, R0) || castClear(x, z, R0) || spurD(x, z) < 0.3) continue;
          const m = new THREE.Matrix4().compose(V(x, floorY(x, z) + R0 * 0.55, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * TAU, r() * TAU, (r() - 0.5) * 0.7)), V(1, 1, 1));
          b.add(sd, bark, m); b.add(cap, jasM((li + k) % 5), m); this.blobs.push([x, z, R0 * 3, R0 * 2.4, r() * 3]); } }); }
    this.logLines = [...VISTA.logs, ...EXTRA_LOGS].map((L) => {
      const ax = Math.cos(L.yaw) * L.len / 2, az = -Math.sin(L.yaw) * L.len / 2;
      return [[L.c[0] - ax, L.c[2] - az], [L.c[0] + ax, L.c[2] + az]] as [P2, P2];
    });
  }
  private logLines: [P2, P2][] = [];
  private chipSpots: [number, number, number][] = [];

  /** the sparkly rainbow rock at TH.glintRock: a broken chunk of log, quartz face toward the shot-1 lens */
  private glintRock() {
    // a touch bigger (r 0.14) and standing up so its top shows above the frame-0 bottom edge at the right post foot
    const NA = 14, rad = Array.from({ length: NA }, (_, i) => 0.14 * (1 + 0.12 * Math.sin(2 * i + 1) + 0.08 * Math.sin(5 * i)));
    const { side, cap } = sliceGeo(rad, 0.17, [0.12, -0.1], [-0.15, 0.08]);
    const grp = new THREE.Group();
    const m1 = new THREE.Mesh(side, lam("atBark", () => ({ map: P.barkHD() }))), m2 = new THREE.Mesh(cap, lam("atJasperGlint7", () => ({ map: P.glintFaceTex(), color: new THREE.Color(1.1, 1.06, 1.02) }))); // round 7: + amethyst and blue-white crystal rings
    for (const m of [m1, m2]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
    const [gx, , gz] = TH.glintRock, c1 = camAt(1, BEAT.steal1 + 6);
    const toCam = V(c1.pos[0] - gx, c1.pos[1] - 0.1, c1.pos[2] - gz).normalize();
    grp.quaternion.setFromUnitVectors(V(1, 0, 0), toCam.lerp(V(0, 1, 0), 0.25).normalize());
    grp.position.set(gx, 0.125, gz);
    this.g.add(grp);
    this.glintGrp = grp; this.glintQ0 = grp.quaternion.clone();
    // shot 5 (audit A3 P2: the rock between his legs read as a campfire): the bark side to the whisper lens, quartz away
    { const c5 = camAt(5, BEAT.whisper - 20), away = V(gx - c5.pos[0], 0, gz - c5.pos[2]).normalize();
      this.glintQ5 = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), away.lerp(V(0, 1, 0), 0.15).normalize()); }
    return m2;
  }
  private glintGrp!: THREE.Group; private glintQ0 = new THREE.Quaternion(); private glintQ5 = new THREE.Quaternion();
  private sunD = new THREE.Vector3(0, 1, 0);
  private scratchQ!: THREE.Mesh; private qGlint!: THREE.Sprite; private flare13!: THREE.Sprite; private caustic!: THREE.Mesh;

  // ======================================== the main warning sign ========================================
  private face(tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, yaw = 0, gain = 1, tiltX = 0) {
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z); mesh.rotation.set(tiltX, yaw, 0, "YXZ"); mesh.layers.set(NOINK); mesh.updateMatrixWorld();
    this.g.add(mesh);
    const n = V(0, 0, 1).applyQuaternion(mesh.quaternion);
    const f = { mesh, mat, n, gain }; this.faces.push(f);
    return f;
  }
  private buildMainSign(b: Batch) {
    const B = TH.board, post = lam("atPostWeathered", () => ({ map: P.weatheredWood("#94663f") })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const boardWood = lam("atBoardWood", () => ({ map: P.parkWood("#8a5c38", false) })), I = new THREE.Matrix4();
    const pz0 = -0.19, pz1 = -0.01, ptop = TH.postTop;
    for (const x of TH.posts) {
      tb(b, post, I, x - 0.09, 0, pz0, x + 0.09, ptop - 0.035, pz1, 0.5);
      tb(b, beam, I, x - 0.13, ptop - 0.035, pz0 - 0.04, x + 0.13, ptop, 0.1, 0.5); // cap plate (raven perch)
      tb(b, lam("atStone", () => ({ map: P.rockHD(), color: new THREE.Color(0.86, 0.74, 0.66) })), I, x - 0.17, 0, pz0 - 0.08, x + 0.17, 0.16, pz1 + 0.08, 0.6); // footing
    }
    const x0 = -B.w / 2, x1 = B.w / 2, y0 = B.cy - B.h / 2, y1 = B.cy + B.h / 2;
    tb(b, boardWood, I, x0, y0, -0.012, x1, y1, B.z - 0.001, 0.8);
    // frame around the board, a top beam and a bottom rail between the posts
    tb(b, beam, I, x0 - 0.06, y1, -0.03, x1 + 0.06, y1 + 0.07, B.z + 0.02, 0.6);
    tb(b, beam, I, x0 - 0.06, y0 - 0.07, -0.03, x1 + 0.06, y0, B.z + 0.02, 0.6);
    tb(b, beam, I, x0 - 0.06, y0, -0.03, x0, y1, B.z + 0.02, 0.6);
    tb(b, beam, I, x1, y0, -0.03, x1 + 0.06, y1, B.z + 0.02, 0.6);
    tb(b, beam, I, x0 - 0.16, y1 + 0.07, -0.13, x1 + 0.16, y1 + 0.14, B.z + 0.08, 0.6);        // little drip cap
    // text face: column limited to what the frame-0 lens sees at the board (P0: ~2.17 m wide) minus margins
    const colW = Math.min(B.w - 0.12, 1.98); // audit A3/A4: room for the +14 % / +8 % letters (frame-0 caps >= 40 px)
    this.face(P.warnBoardTex(B.w, B.h, colW), B.w, B.h, 0, B.cy, B.z + 0.0015);
    // round 7 (shot 6 mystery): a '?' scratched into the stain in the board's lower-right margin, revealed only by the
    // raking late light of shot 6 (between the face and WORLD-INT's overlay, so the dim / late overlay shades it too)
    { const f = this.face(P.scratchQTex(), Q6.w, Q6.h, Q6.x, Q6.y, B.z + 0.0025);
      f.mat.transparent = true; f.mat.depthWrite = false; f.mat.opacity = 0; f.mesh.rotation.z = Q6.rot; f.mesh.renderOrder = 2; f.mesh.visible = false; f.gain = 1.05; this.scratchQ = f.mesh; }
    // split-flap counter on the left post: housing, brackets, face, flap cells
    const F = FL, metal = lam("atFlipBox", () => ({ color: "#5d5852" }));
    tb(b, metal, I, F.x - F.w / 2 - 0.02, F.y - F.h / 2 - 0.02, F.z - 0.05, F.x + F.w / 2 + 0.02, F.y + F.h / 2 + 0.02, F.z + 0.045, 0.5);
    for (const dy of [-0.1, 0.1]) tb(b, metal, I, F.x - 0.05, F.y + dy - 0.02, pz1 - 0.01, F.x + 0.05, F.y + dy + 0.02, F.z - 0.05, 0.5);
    tb(b, metal, I, F.x - F.w / 2 - 0.03, F.y + F.h / 2 + 0.02, F.z - 0.06, F.x + F.w / 2 + 0.03, F.y + F.h / 2 + 0.045, F.z + 0.07, 0.5); // rain hood
    const fz = F.z + 0.0465;
    this.face(P.flipStackTex(F.w, F.h), F.w, F.h, F.x, F.y, fz, 0, 0.95);
    const atlas = P.flapAtlas(), lay = P.FLIP_STACK(F.w, F.h);
    for (const c of lay.cells) {
      const mk = (y: number, z: number) => {
        const g = new THREE.PlaneGeometry(lay.cw, lay.ch / 2).translate(0, y, 0);
        const mat = new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(g, mat); mesh.position.set(F.x + c.x, F.y + c.y, z); mesh.layers.set(NOINK); this.g.add(mesh);
        this.faces.push({ mesh, mat, n: V(0, 0, 1), gain: 1 });
        return mesh;
      };
      const top = mk(lay.ch / 4, fz + 0.002), bot = mk(-lay.ch / 4, fz + 0.002), flap = mk(lay.ch / 4, fz + 0.006);
      this.flaps.push({ top, bot, flap, y0: F.y + c.y, topUv: top.geometry.attributes.uv as THREE.BufferAttribute, botUv: bot.geometry.attributes.uv as THREE.BufferAttribute, flapUv: flap.geometry.attributes.uv as THREE.BufferAttribute });
    }
    // engraved brass plate hung under the counter ("THEFT LOSSES") so it reads as part of the warning
    { const py = F.y - F.h / 2 - 0.085;
      tb(b, metal, I, F.x - 0.215, py - 0.045, F.z - 0.01, F.x + 0.215, py + 0.045, F.z + 0.015, 0.5);
      for (const dx of [-0.16, 0.16]) tb(b, metal, I, F.x + dx - 0.012, py + 0.04, F.z - 0.005, F.x + dx + 0.012, F.y - F.h / 2 - 0.02, F.z + 0.008, 0.5);
      this.face(P.brassTex(), 0.41, 0.085, F.x, py, F.z + 0.0165, 0, 1.0);
      // audit A2 counter CU wear: a strip of faded tape across the plate's corner, a dusty web in the housing's lower-left
      // corner, red dust caked along the bottom lip, a dented top-right corner of the rain hood
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.03), new THREE.MeshBasicMaterial({ color: "#e8dcb8", transparent: true, opacity: 0.62, depthWrite: false }));
      tape.position.set(F.x + 0.17, py + 0.03, F.z + 0.0175); tape.rotation.z = -0.5; tape.layers.set(NOINK); this.g.add(tape); this.faces.push({ mesh: tape, mat: tape.material as THREE.MeshBasicMaterial, n: V(0, 0, 1), gain: 0.9 });
      const web = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), new THREE.MeshBasicMaterial({ map: P.webTex(), transparent: true, depthWrite: false, opacity: 0.55 }));
      web.position.set(F.x - F.w / 2 + 0.05, F.y - F.h / 2 + 0.045, F.z + 0.049); web.layers.set(NOINK); web.renderOrder = 4; this.g.add(web); this.web = web; this.faces.push({ mesh: web, mat: web.material as THREE.MeshBasicMaterial, n: V(0, 0, 1), gain: 0.85 });
      tb(b, lam("atRedDust", () => ({ color: "#b98a64" })), I, F.x - F.w / 2 - 0.018, F.y - F.h / 2 - 0.021, F.z + 0.03, F.x + F.w / 2 + 0.018, F.y - F.h / 2 - 0.012, F.z + 0.047, 0.5);
      b.add(new THREE.BoxGeometry(0.06, 0.012, 0.05).rotateZ(-0.35).translate(F.x + F.w / 2 + 0.005, F.y + F.h / 2 + 0.05, F.z + 0.045), metal); }
    // a carved heart + initials low on the left post (the vandals' signature), weathered post faces
    { const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), lam("atCarve", () => ({ map: P.carveTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      cm.position.set(TH.posts[0] + 0.005, 0.68, pz1 + 0.003); cm.rotation.z = 0.06; cm.layers.set(NOINK); this.g.add(cm); }
    // a little bracket ledge under the board on the right post (a raven perch the camera can reach in shot 5)
    { const x = TH.posts[1], y = 1.8; // bracket top at 1.8 (CHAR round 3: the shot-5 raven lands at [0.98, 1.8, 0..0.2], in frame between the couple)
      tb(b, beam, I, x - 0.11, y - 0.035, pz1 - 0.02, x + 0.11, y, pz1 + 0.2, 0.5);
      b.add(new THREE.BoxGeometry(0.03, 0.2, 0.03).rotateX(-0.75).translate(x, y - 0.11, pz1 + 0.08), metal); }
    // round 7 (ADD shot 1): a half-buried second chip beside the glint rock (frame 0 = the last frame: static)
    this.extraChips.push({ x: TH.glintRock[0] - 0.24, z: TH.glintRock[2] + 0.12, s: 0.05, sy: 0.018, y: 0.004, col: new THREE.Color("#c84a3a"), yaw: 1.1 });
    // rewatch clue: a tiny chip with a manila "TIMES STOLEN" tag on the right footing (frame 0 and the loop end)
    { const x = TH.posts[1] + 0.08, z = pz1 + 0.05, y = 0.16;
      this.extraChips.push({ x, z, s: 0.045, sy: 0.026, y: y + 0.012, col: new THREE.Color("#e8893a") });
      const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.038), lam("atTinyTag", () => ({ map: P.tinyTagTex(), side: THREE.DoubleSide })));
      tg.position.set(x + 0.055, y + 0.004, z + 0.02); tg.rotation.set(-Math.PI / 2, 0, 0.5); tg.receiveShadow = true; this.g.add(tg);
      for (const sx of [-1, 1]) for (let i = 0; i < 26; i++) { // pebbles + a few chips around both post feet (on the plaza paving)
        const a = hash(i, sx + 5) * TAU, d = 0.2 + hash(i, sx + 9) * 0.5, px = TH.posts[sx < 0 ? 0 : 1] + Math.cos(a) * d, pz = -0.1 + Math.sin(a) * d * 0.8;
        if (kept(px, pz, 0.03)) continue;
        const s2 = 0.012 + hash(i, sx + 13) ** 2 * 0.04;
        if (i % 6 === 0) this.extraChips.push({ x: px, z: pz, s: s2 * 1.2, sy: s2 * 0.6, y: s2 * 0.25, col: new THREE.Color(["#c84a3a", "#f2c64a", "#8a5aa8", "#e8893a"][i % 4]) });
        else this.extraPeb.push({ x: px, z: pz, s: s2, sy: s2 * 0.6, y: 0.03, col: new THREE.Color(["#e7d6bc", "#d8c3a6", "#c9b49a", "#b9a08a"][i % 4]) });
      } }
  }
  private extraPeb: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private extraChips: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private extraTufts: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private extraSage: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  /** uv of a half card: char index c, half = 1 top / 0 bottom; flip = v reversed (the flap's back after 90 deg) */
  private setHalf(uv: THREE.BufferAttribute, c: number, half: number, flip = false) {
    const u0 = c / 11 + 0.002, u1 = (c + 1) / 11 - 0.002, va = half ? 0.5 : 0, vb = half ? 1 : 0.5;
    const [lo, hi] = flip ? [vb, va] : [va, vb];
    // PlaneGeometry vertex order: (0) top-left, (1) top-right, (2) bottom-left, (3) bottom-right
    uv.setXY(0, u0, hi); uv.setXY(1, u1, hi); uv.setXY(2, u0, lo); uv.setXY(3, u1, lo); uv.needsUpdate = true;
  }
  private poseFlip(id: number, vf: number) {
    // round 7 (fast picture-clock window, video 449-478): the flaps run on the VIDEO clock at real speed (3 / 2 video f per
    // card), the last card landing on "14" (video); before shot 4 '--', after it '14'
    const on = id >= 4 && id <= 15, v14 = toNew(BEAT.tons14);
    const seqs = [FLAP_SEQ(1, toNew(BEAT.tons14) - 8), FLAP_SEQ(4, toNew(BEAT.tons14) - 13)];
    for (let k = 0; k < 2; k++) {
      const F = this.flaps[k];
      let cur = 0, from = 0, to = 0, p = -1;
      if (on) for (const [a, bb, f0, d] of seqs[k]) { if (vf >= f0 + d) cur = bb; else if (vf >= f0) { from = a; to = bb; p = (vf - f0) / d; break; } }
      if (on && id > 4) cur = seqs[k][seqs[k].length - 1][1]; // (shots 5-15 always show 14)
      const last = seqs[k][seqs[k].length - 1], fe = last[2] + last[3], st = id === 4 ? vf - fe : 99; void v14;
      if (p < 0 && on && st >= 0 && st < 3) { // settle: the last flap bounces back up a little and drops again (3 f)
        this.setHalf(F.topUv, cur, 1); this.setHalf(F.botUv, last[0], 0); F.flap.visible = true;
        F.flap.rotation.x = Math.PI - [0.5, 0.2, 0.07][Math.min(2, Math.floor(st))]; this.setHalf(F.flapUv, cur, 0, true); F.flap.position.y = F.y0; // (floor: the picture clock is fractional, A4)
      } else if (p < 0) {
        this.setHalf(F.topUv, cur, 1); this.setHalf(F.botUv, cur, 0); F.flap.visible = false;
      } else {
        this.setHalf(F.topUv, to, 1); this.setHalf(F.botUv, from, 0); F.flap.visible = true;
        const th = p * Math.PI; F.flap.rotation.x = th;
        if (th < Math.PI / 2) this.setHalf(F.flapUv, from, 1); else this.setHalf(F.flapUv, to, 0, true);
        // the falling flap is drawn hinged at the card's middle: geometry spans y 0..ch/2 above the hinge
        F.flap.position.y = F.y0;
      }
    }
  }

  // ======================================== trailhead dressing ========================================
  private buildTrailheadDressing(b: Batch) {
    const I = new THREE.Matrix4(), post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const tan = lam("atWoodTan", () => ({ map: P.parkWood("#8a5e3c", false) })), metal = lam("atMetalGrey", () => ({ color: "#6d7378" })), roofM = lam("atRoofTin", () => ({ color: "#8c8f94" }));
    // kiosk with a roof and the trail map (left, behind the sign)
    { const kx = -3.3, kz = -9.4, m = M4(kx, floorY(kx, kz), kz, 0.25);
      for (const dx of [-0.75, 0.75]) tb(b, post, m, dx - 0.07, 0, -0.07, dx + 0.07, 2.35, 0.07, 0.5);
      tb(b, beam, m, -0.95, 1.95, -0.05, 0.95, 2.05, 0.05, 0.6);
      tb(b, beam, m, -0.82, 0.75, -0.04, 0.82, 1.9, 0.02, 0.6);
      b.add(new THREE.BoxGeometry(2.2, 0.06, 1.1).rotateX(0.22).translate(0, 2.42, 0.05), roofM, m);
      const fm = new THREE.Vector3(kx, floorY(kx, kz) + 1.33, kz).add(V(0, 0, 0.025).applyAxisAngle(V(0, 1, 0), 0.25));
      this.face(P.kioskMapTex(), 1.5, 1.08, fm.x, fm.y, fm.z, 0.25, 0.92); }
    // STAY ON TRAIL post sign + trail distance marker + bench + bins + fountain
    const postSign = (x: number, z: number, yaw: number, tex: THREE.Texture, w: number, h: number, top: number) => {
      const m = M4(x, floorY(x, z), z, yaw);
      tb(b, post, m, -0.05, 0, -0.1, 0.05, top, -0.02, 0.5);
      tb(b, beam, m, -w / 2 - 0.02, top - h - 0.02, -0.02, w / 2 + 0.02, top + 0.02, 0.01, 0.5);
      const p = V(0, top - h / 2, 0.0115).applyMatrix4(m);
      this.face(tex, w, h, p.x, p.y, p.z, yaw, 0.92);
    };
    postSign(-1.95, -3.6, 0.15, P.smallSignTex("stay", ["PLEASE", "STAY ON", "TRAIL"], 0.42, 0.42), 0.42, 0.42, 1.1);
    postSign(2.05, -7.8, -0.2, P.smallSignTex("giant", ["GIANT LOGS", "0.4 MI"], 0.62, 0.36, 1), 0.62, 0.36, 1.15);
    postSign(-7.4, -37.2, 0.5, P.smallSignTex("vista2", ["LONG LOGS", "1.6 MI"], 0.62, 0.36, -1), 0.62, 0.36, 1.15);
    this.bench(b, 2.55, -11.6, -Math.PI / 2 + 0.1);
    this.bench(b, 2.6, -14.5, -Math.PI / 2 - 0.15);
    this.bins(b, 1.75, -4.4, -0.35);
    { const p = tt([-6.9, 0, 1.6]); this.bins(b, p[0], p[2], 0.2); }
    { const fx = 2.55, fz = -6.2, m = M4(fx, floorY(fx, fz), fz, -0.4); // drinking fountain
      cyl(b, lam("atStoneTan", () => ({ map: P.rockHD(), color: new THREE.Color(0.95, 0.8, 0.66) })), m, 0, 0, 0, 0.16, 0.13, 0.82, 12);
      cyl(b, metal, m, 0, 0.82, 0, 0.2, 0.2, 0.07, 14); cyl(b, metal, m, 0.06, 0.86, 0, 0.015, 0.015, 0.06, 6); }
    // shade ramada with a picnic table (right background)
    { const rx = 4.6, rz = -19, m = M4(rx, floorY(rx, rz), rz, 0.3);
      for (const [dx, dz] of [[-1.9, -1.6], [1.9, -1.6], [-1.9, 1.6], [1.9, 1.6]]) tb(b, post, m, dx - 0.09, 0, dz - 0.09, dx + 0.09, 2.7, dz + 0.09, 0.5);
      for (const dz of [-1.6, 1.6]) tb(b, beam, m, -2.2, 2.62, dz - 0.08, 2.2, 2.8, dz + 0.08, 0.6);
      for (let i = 0; i < 9; i++) tb(b, beam, m, -2.25 + i * 0.56, 2.8, -2.1, -2.12 + i * 0.56, 2.9, 2.1, 0.6);
      tb(b, tan, m, -1.0, 0.72, -0.45, 1.0, 0.78, 0.45, 0.6);
      for (const dz of [-0.75, 0.75]) tb(b, tan, m, -1.0, 0.42, dz - 0.15, 1.0, 0.46, dz + 0.15, 0.6);
      for (const dx of [-0.8, 0.8]) tb(b, tan, m, dx - 0.04, 0, -0.85, dx + 0.04, 0.72, 0.85, 0.6); }
    // ---- round 2 dressing ----
    // a second STAY ON TRAIL post on the right of the plaza + a trail distance marker by the trail start
    postSign(3.2, -2.9, -0.25, P.smallSignTex("stay2", ["STAY ON", "TRAIL"], 0.4, 0.3), 0.4, 0.3, 1.05);
    postSign(-1.6, -12.8, 0.1, P.smallSignTex("crystal", ["CRYSTAL", "FOREST 0.8 MI"], 0.62, 0.36, -1), 0.62, 0.36, 1.15);
    this.bench(b, -2.6, -6.4, Math.PI / 2 - 0.2);
    // flagpole with a plain banded park flag (no logo) that flaps in the shared wind
    { const fx = -4.2, fz = -16, y0 = floorY(fx, fz);
      cyl(b, lam("atFlagPole", () => ({ color: "#d8dadc" })), new THREE.Matrix4(), fx, y0, fz, 0.06, 0.045, 7.4, 10);
      b.add(new THREE.SphereGeometry(0.09, 10, 8).translate(fx, y0 + 7.45, fz), lam("atFinial", () => ({ color: "#c9a256" })));
      cyl(b, lam("atStone", () => ({ map: P.rockHD(), color: new THREE.Color(0.86, 0.74, 0.66) })), new THREE.Matrix4(), fx, y0, fz, 0.3, 0.26, 0.25, 12);
      this.flag = this.makeFlag(fx, y0 + 7.35, fz, 1.25, 0.78); } // audit A3: top of the cloth 5 cm under the truck (read as half-staff)
    // the trail-map flyers pinned beside the map lift their bottom corners in the gusts
    { const kx = -3.3, kz = -9.4, kq = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.25);
      for (const [lx, ly, rot] of [[-0.62, 1.12, 0.05], [0.64, 1.5, -0.04], [0.5, 1.05, 0.02]] as const) {
        const geo = new THREE.PlaneGeometry(0.24, 0.17).translate(0, -0.085, 0);
        const mesh = new THREE.Mesh(geo, lam("atFlyer", () => ({ map: P.brochureTex(), side: THREE.DoubleSide })));
        const p = V(lx, ly, 0.035).applyQuaternion(kq).add(V(kx, floorY(kx, kz), kz));
        const grp = new THREE.Group(); grp.position.copy(p); grp.quaternion.copy(kq); grp.rotateZ(rot); grp.add(mesh); this.g.add(grp);
        mesh.castShadow = true; mesh.receiveShadow = true; this.flyers.push(mesh);
      } }
    // a dropped water bottle on the plaza
    { const m = M4(TH.posts[0] + 0.01, 0.16 + 0.036, 0.035, 0.05, 1, 1, 1, 0, Math.PI / 2); // round 6: on the left post footing (pock[1] stands where it lay)
      b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), lam("atBottle", () => ({ color: "#7fb2d8" })), m);
      b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10).translate(0, 0.115, 0), lam("atBottleCap", () => ({ color: "#f0f0ea" })), m); }
    // parking-lot style lamp post behind the sign (lit at dusk) and a small lamp under the kiosk roof
    { const lx = TH.base[0] + 4, lz = TH.base[2] - 6, y0 = floorY(lx, lz), iron = lam("atIron", () => ({ color: "#3e4246" }));
      cyl(b, iron, new THREE.Matrix4(), lx, y0, lz, 0.07, 0.05, 4.2, 10);
      cyl(b, lam("atStone", () => ({ map: P.rockHD(), color: new THREE.Color(0.86, 0.74, 0.66) })), new THREE.Matrix4(), lx, y0, lz, 0.22, 0.2, 0.35, 12);
      b.add(new THREE.BoxGeometry(0.9, 0.05, 0.05).translate(lx - 0.42, y0 + 4.15, lz), iron);
      b.add(new THREE.CylinderGeometry(0.08, 0.24, 0.16, 12).translate(lx - 0.82, y0 + 4.06, lz), iron);
      this.lamps.push(this.makeLamp(V(lx - 0.82, y0 + 3.97, lz), 0.11, 7.5, 1.0));
      const kq = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 0.25), kp = V(0, 2.28, 0.32).applyQuaternion(kq).add(V(-3.3, floorY(-3.3, -9.4), -9.4));
      b.add(new THREE.BoxGeometry(0.14, 0.08, 0.14).translate(kp.x, kp.y + 0.05, kp.z), iron);
      this.lamps.push(this.makeLamp(kp, 0.05, 3.0, 0.6)); }
    // two gooseneck sign lights on the warning board's drip cap (off by day; at dusk they light the routed letters)
    { const iron = lam("atIron", () => ({ color: "#3e4246" })), yTop = TH.board.cy + TH.board.h / 2 + 0.14;
      for (const x of [-0.4, 0.4]) {
        b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6).translate(x, yTop + 0.06, 0.02), iron);
        b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 6).rotateX(Math.PI / 2 - 0.35).translate(x, yTop + 0.16, 0.13), iron);
        b.add(new THREE.CylinderGeometry(0.022, 0.045, 0.06, 10).rotateX(0.64).translate(x, yTop + 0.2, 0.25), iron);
        this.lamps.push(this.makeLamp(V(x, yTop + 0.17, 0.235), 0.02, 0.01, 0.45));
      } }
    // ---- round A3 dressing ----
    postSign(-3.05, -4.7, 0.25, P.smallSignTex("bluemesa", ["BLUE MESA", "2.1 MI"], 0.62, 0.36, -1), 0.62, 0.36, 1.12);
    { const m = M4(-2.6, 0.465, -6.4, Math.PI / 2 - 0.2), dark = lam("atShades", () => ({ color: "#1e2026" }));
      for (const dx of [-0.045, 0.045]) b.add(new THREE.CylinderGeometry(0.033, 0.033, 0.01, 12).translate(dx, 0, 0.05), dark, m);
      b.add(new THREE.BoxGeometry(0.03, 0.008, 0.008).translate(0, 0.004, 0.05), dark, m);
      for (const dx of [-0.075, 0.075]) b.add(new THREE.BoxGeometry(0.006, 0.006, 0.12).translate(dx, 0.002, -0.01), dark, m); }
    // a DO NOT FEED WILDLIFE plate by the bins, a dropped sun visor and a crushed cup beside them
    postSign(2.6, -3.95, -0.35, P.smallSignTex("feed", ["DO NOT FEED", "WILDLIFE"], 0.44, 0.3), 0.44, 0.3, 0.95);
    { const white = lam("atVisor", () => ({ color: "#f2efe6" })), m = M4(1.2, 0.04, -3.85, 0.9);
      b.add(new THREE.TorusGeometry(0.09, 0.012, 6, 16, Math.PI * 1.3).rotateX(-Math.PI / 2), white, m);
      b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 16, 1, false, 0, Math.PI * 0.7).translate(0, 0.004, 0.02), lam("atVisorBill", () => ({ color: "#3e6aa0" })), m);
      b.add(new THREE.CylinderGeometry(0.035, 0.03, 0.07, 10).rotateZ(Math.PI / 2).translate(0.3, 0.035, 0.25), lam("atCupRed", () => ({ color: "#c84a3a" })), m); }
    // a trailhead lamp post beside the kiosk: its warm bulb flicks on at dusk (shot 15, behind the tourist) with moths
    { const lx = -2.15, lz = -8.5, y0 = floorY(lx, lz), iron = lam("atIron", () => ({ color: "#3e4246" }));
      cyl(b, iron, new THREE.Matrix4(), lx, y0, lz, 0.06, 0.045, 3.4, 10);
      cyl(b, lam("atStone", () => ({ map: P.rockHD(), color: new THREE.Color(0.86, 0.74, 0.66) })), new THREE.Matrix4(), lx, y0, lz, 0.18, 0.16, 0.3, 12);
      b.add(new THREE.CylinderGeometry(0.07, 0.2, 0.14, 12).translate(lx, y0 + 3.45, lz), iron);
      this.kioskLamp = this.makeLamp(V(lx, y0 + 3.36, lz), 0.09, 5.5, 1.0); this.lamps.push(this.kioskLamp); }
    // a tumbleweed snagged against the counter post's base (the split-flap CU's empty lower frame, shot 4)
    { const grp = new THREE.Group(), tm = lam("atTumbleStatic2", () => ({ map: P.tumbleTex(), alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color("#c9a66b"), emissiveMap: P.tumbleTex(), emissiveIntensity: 0.26 }));
      for (const [rad, rx] of [[1, 0], [0.62, 1]] as const) { const mm = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 2), tm); mm.rotation.set(rx, rx * 2, 0.3); mm.castShadow = true; mm.layers.set(NOINK); grp.add(mm); }
      grp.scale.set(0.26, 0.23, 0.26); grp.position.set(TH.posts[0] - 0.3, 0.22, -0.02); this.g.add(grp); this.snagWeed = grp; }
    // drifting crack patches and footprints on the open floor around the trailhead
    this.decals(0, 0, 16, 12, 1.0);
  }
  private kioskLamp!: { bulb: THREE.Mesh; glow: THREE.Sprite; pool: THREE.Mesh; k: number }; private snagWeed!: THREE.Group;
  private flag!: { mesh: THREE.Mesh; base: Float32Array; w: number; h: number };
  private flyers: THREE.Mesh[] = [];
  private lamps: { bulb: THREE.Mesh; glow: THREE.Sprite; pool: THREE.Mesh; k: number }[] = [];
  /** a flag hung on a pole at (x, y top, z): a 14 x 4 segment plane whose vertices wave in the wind each frame */
  private makeFlag(x: number, y: number, z: number, w: number, h: number, parent: THREE.Object3D = this.g) {
    const geo = new THREE.PlaneGeometry(w, h, 14, 4).translate(w / 2 + 0.06, -h / 2, 0);
    const mesh = new THREE.Mesh(geo, lam("atFlagCloth", () => ({ map: P.flagTex(), side: THREE.DoubleSide })));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return { mesh, base: Float32Array.from(geo.attributes.position.array as ArrayLike<number>), w, h };
  }
  /** a lamp: emissive bulb (blooms when lit), an additive glow sprite and a warm pool on the ground below */
  private makeLamp(p: THREE.Vector3, rad: number, pool: number, k: number) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 8), new THREE.MeshBasicMaterial({ color: "#6a645a" }));
    bulb.position.copy(p); bulb.layers.set(NOINK); this.g.add(bulb);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.softDotTex(), color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.position.copy(p); glow.scale.setScalar(rad * 14); glow.layers.set(NOINK); glow.renderOrder = 6; this.g.add(glow);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(pool, pool).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.softDotTex(), color: new THREE.Color(0, 0, 0), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    pm.position.set(p.x, floorY(p.x, p.z) + 0.05, p.z); pm.layers.set(NOINK); pm.renderOrder = 2; this.g.add(pm);
    return { bulb, glow, pool: pm, k };
  }
  /** crack patches (bare floor) and a few footprint trails scattered around (cx, cz) */
  private decals(cx: number, cz: number, R: number, n: number, feet: number) {
    const r = P.rng(Math.round(cx * 7 + cz * 3 + 919)), crack = lam("atCrackDecal", () => ({ map: P.crackTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const fm = lam("atFeetDecal", () => ({ map: P.footprintTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const db = new Batch();
    for (let i = 0; i < n * 4 && i < 400; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, s = 1.6 + r() * 2.4;
      if (paveD(x, z) < s * 0.4 || kept(x, z, 0.3) || fbm(x / 11, z / 11, 52) > 0.45) continue; // cracks where the floor is bare
      db.add(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2).rotateY(r() * TAU).translate(x, floorY(x, z) + 0.012, z), crack);
      if (--n <= 0) break;
    }
    for (let i = 0; i < 40 && feet > 0; i++) {
      const a = r() * TAU, d = 2 + Math.sqrt(r()) * R * 0.6, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (paveD(x, z) < 0.5 || paveD(x, z) > 4 || kept(x, z, 0.3)) continue;
      db.add(new THREE.PlaneGeometry(0.42, 1.65).rotateX(-Math.PI / 2).rotateY(r() * TAU).translate(x, floorY(x, z) + 0.014, z), fm);
      feet -= 0.34;
    }
    const n0 = this.g.children.length; db.build(this.g, false);
    for (let i = n0; i < this.g.children.length; i++) { this.g.children[i].layers.set(NOINK); this.g.children[i].renderOrder = 1; this.g.children[i].castShadow = false; }
  }
  private bench(b: Batch, x: number, z: number, yaw: number) {
    const m = M4(x, floorY(x, z), z, yaw), tan = lam("atWoodTan", () => ({ map: P.parkWood("#8a5e3c", false) })), iron = lam("atIron", () => ({ color: "#3e4246" }));
    for (const dx of [-0.65, 0.65]) { tb(b, iron, m, dx - 0.03, 0, -0.22, dx + 0.03, 0.44, 0.2, 0.5); tb(b, iron, m, dx - 0.03, 0.44, -0.24, dx + 0.03, 0.85, -0.18, 0.5); }
    for (let i = 0; i < 3; i++) tb(b, tan, m, -0.82, 0.42, -0.2 + i * 0.14, 0.82, 0.46, -0.08 + i * 0.14, 0.6);
    for (let i = 0; i < 2; i++) tb(b, tan, m, -0.82, 0.56 + i * 0.16, -0.24, 0.82, 0.68 + i * 0.16, -0.2, 0.6);
  }
  private bins(b: Batch, x: number, z: number, yaw: number) {
    const m = M4(x, floorY(x, z), z, yaw), lid = lam("atBinLid6", () => ({ color: "#8a90a2" })); // audit A5 P3: lighter (they read as navy holes in the shot-5 shade)
    const tr = lam("atBinTrash6", () => ({ map: P.binTex("TRASH", "#93795a") })), rc = lam("atBinRec6", () => ({ map: P.binTex("RECYCLE", "#86a4d0") }));
    for (const [dx, mat] of [[-0.36, tr], [0.36, rc]] as const) {
      b.add(new THREE.CylinderGeometry(0.29, 0.27, 0.92, 16).translate(dx, 0.46, 0), mat, m);
      b.add(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 16).translate(dx, 0.95, 0), lid, m);
      b.add(new THREE.BoxGeometry(0.18, 0.04, 0.1).translate(dx, 0.99, 0.12), lid, m);
    }
  }

  // ======================================== vista dressing ========================================
  private buildVistaDressing(b: Batch, bl: Batch, bv: Batch) {
    const post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const stone = lam("atStoneTan", () => ({ map: P.rockHD(), color: new THREE.Color(0.95, 0.8, 0.66) }));
    // interpretive plaque: lectern on two short posts beside the pocketing tourist (VISTA.plaque moved into the
    // shot-3 lens: see the report; derived from the anchor)
    const pl = this.plaquePos();
    { // 1.3x the round-1 lectern (main lines ~42 px caps at 1080), posts raised so its face clears the loose slice
      const m = M4(pl[0], floorY(pl[0], pl[2]), pl[2], pl[3]), K = PLAQUE_K;
      for (const dx of [-0.22, 0.22]) tb(b, post, m, dx - 0.04, 0, -0.07, dx + 0.04, 1.08, 0.02, 0.5);
      const t = new THREE.Matrix4().compose(V(0, 1.2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0, 0)), V(1, 1, 1));
      b.add(new THREE.BoxGeometry(0.5 * K, 0.4 * K, 0.05).translate(0, 0, -0.03), beam, m.clone().multiply(t));
      const fp = V(0, 0, 0.0); fp.applyMatrix4(m.clone().multiply(t));
      this.face(P.plaqueTex(), 0.46 * K, 0.326 * K, fp.x, fp.y, fp.z, pl[3], 0.95, -0.45); }
    this.buildSlice3(b);
    // a small STAY ON TRAIL plate on the rail post nearest the pocketing tourist (a managed park; no "don't take" yet)
    { let best: THREE.Vector3 | null = null, bd = Infinity; const L = TR_VISTA, side = -1, off = VISTA.trailW / 2 + 0.42;
      let sAcc = 0, next = 1.2;
      for (let i = 1; i < L.length && sAcc < 60; i++) { const a = L[i - 1], c = L[i], d = Math.hypot(c[0] - a[0], c[1] - a[1]);
        while (next <= sAcc + d) { const t2 = (next - sAcc) / d, x = lerp(a[0], c[0], t2), z = lerp(a[1], c[1], t2), nx = -(c[1] - a[1]) / d, nz = (c[0] - a[0]) / d;
          const p = V(x + nx * side * off, 0, z + nz * side * off), dd = Math.hypot(p.x - VISTA.pocketTourist[0], p.z - VISTA.pocketTourist[2]);
          if (dd < bd) { bd = dd; best = p; } next += 2.5; }
        sAcc += d; }
      if (best) { const c3 = camAt(3, BEAT.pocketing), yaw = Math.atan2(c3.pos[0] - best.x, c3.pos[2] - best.z), y = floorY(best.x, best.z);
        const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), fp = V(0, 0.62, 0.045).applyQuaternion(q).add(V(best.x, y, best.z));
        b.add(new THREE.BoxGeometry(0.3, 0.2, 0.02).applyQuaternion(q).translate(fp.x - Math.sin(yaw) * 0.012, fp.y, fp.z - Math.cos(yaw) * 0.012), beam);
        this.face(P.smallSignTex("stayRail", ["STAY ON", "TRAIL"], 0.28, 0.18), 0.28, 0.18, fp.x, fp.y, fp.z, yaw, 0.92); } }
    // the tourist stepped off the paving to the slice: a line of prints from the trail edge
    { const fm = lam("atFeetDecal", () => ({ map: P.footprintTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      const a = V(-5.0, 0, -26.4), c = V(VISTA.pocketTourist[0] - 0.2, 0, VISTA.pocketTourist[2] - 0.1), d = c.clone().sub(a), L2 = d.length(), yaw = Math.atan2(d.x, d.z);
      const g2 = new THREE.PlaneGeometry(0.42, L2).rotateX(-Math.PI / 2).rotateY(yaw).translate((a.x + c.x) / 2, 0.016, (a.z + c.z) / 2);
      const fmesh = new THREE.Mesh(g2, fm); fmesh.layers.set(NOINK); fmesh.renderOrder = 1; fmesh.receiveShadow = true; this.g.add(fmesh); }
    // along the trail: benches, a distance marker, trash + recycling, rope barrier round one log, a second plaque
    this.bench(b, -0.9, -15.5, Math.PI / 2 + 0.25); this.bench(b, -6.0, -44.5, Math.PI / 2 + 0.5);
    this.bins(b, -1.6, -20.5, 1.2);
    { const pb = (x: number, z: number, yaw: number, tex: THREE.Texture, w: number, h: number, top: number) => {
        const m = M4(x, floorY(x, z), z, yaw); tb(b, post, m, -0.05, 0, -0.1, 0.05, top, -0.02, 0.5);
        tb(b, beam, m, -w / 2 - 0.02, top - h - 0.02, -0.02, w / 2 + 0.02, top + 0.02, 0.01, 0.5);
        const p = V(0, top - h / 2, 0.0115).applyMatrix4(m); this.face(tex, w, h, p.x, p.y, p.z, yaw, 0.92); };
      pb(-1.4, -9.5, 0.3, P.smallSignTex("giant2", ["GIANT LOGS", "0.3 MI"], 0.62, 0.36, -1), 0.62, 0.36, 1.15); }
    { const L = VISTA.logs[2], rope = lam("atRope", () => ({ color: "#c9a96a" })), pts: THREE.Vector3[] = [];
      const ca = Math.cos(L.yaw), sa = Math.sin(L.yaw);
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, lx = Math.cos(a) * (L.len / 2 + 1.0), lz = Math.sin(a) * (L.r + 1.2), x = L.c[0] + lx * ca + lz * sa, z = L.c[2] - lx * sa + lz * ca;
        if (paveD(x, z) < 0.3) continue; pts.push(V(x, floorY(x, z), z)); cyl(b, post, new THREE.Matrix4(), x, floorY(x, z), z, 0.05, 0.045, 0.75, 8); }
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i]; if (a.distanceTo(c) > 4) continue;
        const mid = a.clone().add(c).multiplyScalar(0.5); mid.y -= 0.12;
        tube(b, rope, V(a.x, a.y + 0.66, a.z), V(mid.x, mid.y + 0.66, mid.z), 0.015); tube(b, rope, V(mid.x, mid.y + 0.66, mid.z), V(c.x, c.y + 0.66, c.z), 0.015); } }
    // park entrance sign "PETRIFIED FOREST" on stone piers (carry-over + audit A3 P1: moved beside the trail's west edge
    // behind the rail, into the crane's frame, facing camAt(2, 168) = the "Forest." word; a taller 5.3 x 2.1 m face with
    // two routed lines so the caps are >= 40 px; shadowed pier bases + sage at its feet)
    // round 4 carry-over (CAM): the sign at (-11.7, -35.8) facing camAt(2, 165), inside the new crane; nudged west in
    // 15 cm steps until both piers clear the vista rail and the paving
    { const c2 = camAt(2, 165), railL = offsetLine(TR_VISTA, -(VISTA.trailW / 2 + 0.42));
      let ex = -11.7, ez = -35.8, yaw = 0;
      for (let k = 0; k < 14; k++) {
        yaw = Math.atan2(c2.pos[0] - ex, c2.pos[2] - ez);
        const ok = [-2.7, 2.7].every((dx) => { const px = ex + Math.cos(yaw) * dx, pz = ez - Math.sin(yaw) * dx; return lineD(px, pz, railL) > 0.72 && paveD(px, pz) > 0.9; });
        if (ok) break; ex -= 0.15; ez -= 0.03;
      }
      this.entrance = [ex, ez, yaw];
      const m = M4(ex, floorY(ex, ez), ez, yaw);
      const sand = lam("atSandstone", () => ({ map: P.sandstoneTex() })), Hs = 3.85; // tall piers: the board clears the heads of the photographer pair beside it
      for (const dx of [-2.7, 2.7]) {
        tb(b, sand, m, dx - 0.4, 0, -0.35, dx + 0.4, Hs, 0.35, 0.8);
        tb(b, sand, m, dx - 0.47, Hs, -0.42, dx + 0.47, Hs + 0.12, 0.42, 0.8);
        tb(b, stone, m, dx - 0.46, 0, -0.41, dx + 0.46, 0.14, 0.41, 0.8); // plinth
        const pp = V(dx, 0, 0.55).applyMatrix4(m); this.blobs.push([pp.x, pp.z, 1.5, 0.9, yaw]);
        for (const [ox, oz, sc] of [[-0.55, 0.5, 0.42], [0.5, 0.62, 0.36]] as const) { const q = V(dx + ox, 0, oz).applyMatrix4(m); this.extraSage.push({ x: q.x, z: q.z, s: sc, yaw: dx + ox }); }
      }
      { const bp = V(-2.7, 1.45, 0.352).applyMatrix4(m); this.face(P.bronzeTex(), 0.5, 0.31, bp.x, bp.y, bp.z, yaw, 0.95); }
      tb(b, beam, m, -2.75, 1.68, -0.1, 2.75, Hs + 0.03, 0.05, 0.8);
      tb(b, beam, m, -3.2, Hs + 0.03, -0.25, 3.2, Hs + 0.2, 0.25, 0.8);
      const fp = V(0, 1.78 + 1.05, 0.052).applyMatrix4(m);
      this.face(P.entranceTex(), 5.3, 2.1, fp.x, fp.y, fp.z, yaw, 0.98); }
    // visitor center (distant, flat-roofed pueblo style) + parked cars at the lot
    { const vx = 26, vz = -86, yaw = -0.25, m = M4(vx, 0, vz, yaw);
      // audit A3 P3: desert stucco (#D9B98F), a dark roof overhang on posts, and a generic VISITOR CENTER fascia
      const wall = lam("atVCwall6", () => ({ map: P.vcFrontTex(24, 5) })); // round 6 (audit A6 P3: read as a train carriage): adobe + 3 window groups
      const side = lam("atVCside", () => ({ map: P.facadeHD("atVCs", 10, 5, { wall: "#d4b088", shutter: "#5a3a28" }) }));
      bv.add(new THREE.PlaneGeometry(24, 5).translate(0, 2.5, 5), wall, m);
      bv.add(new THREE.PlaneGeometry(24, 5).rotateY(Math.PI).translate(0, 2.5, -5), side, m);
      bv.add(new THREE.PlaneGeometry(10, 5).rotateY(-Math.PI / 2).translate(-12, 2.5, 0), side, m);
      bv.add(new THREE.PlaneGeometry(10, 5).rotateY(Math.PI / 2).translate(12, 2.5, 0), side, m);
      tb(bv, lam("atVCroof", () => ({ color: "#c79f78" })), m, -12.3, 5, -5.3, 12.3, 5.6, 5.3, 2);
      tb(bv, lam("atVCeave", () => ({ color: "#6a4a34" })), m, -12.6, 5.0, 5.0, 12.6, 5.25, 6.4, 2); // dark roof overhang
      tb(bv, lam("atVCfascia", () => ({ color: "#4e3424" })), m, -12.7, 5.0, 6.4, 12.7, 5.75, 6.55, 2); // round 6: a deep dark fascia on the overhang
      tb(bv, lam("atVCparapet", () => ({ color: "#c49a70" })), m, -12.4, 5.6, -5.4, 12.4, 6.0, -4.9, 2);  // a parapet line on the flat roof
      for (const dx of [-11.5, -8, 8, 11.5]) tb(bv, post, m, dx - 0.12, 0, 6.15, dx + 0.12, 5.0, 6.39, 0.5);
      for (let i = 0; i < 12; i++) bv.add(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6).rotateX(Math.PI / 2).translate(-11 + i * 2, 4.6, 5.3), beam, m); // vigas
      tb(bv, beam, m, -6, 3.3, 5, 6, 3.5, 7.4, 1); for (const dx of [-5.8, -2, 2, 5.8]) tb(bv, post, m, dx - 0.1, 0, 7.2, dx + 0.1, 3.3, 7.4, 0.5); // portal
      tb(bv, beam, m, -4.4, 3.5, 7.3, 4.4, 4.45, 7.42, 1);
      { const fp = V(0, 3.975, 7.43).applyMatrix4(m), mat = new THREE.MeshBasicMaterial({ map: P.smallSignTex("vcFascia", ["VISITOR CENTER"], 1.75, 0.19) }), me = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.93), mat);
        me.position.copy(fp); me.rotation.y = yaw; me.layers.set(NOINK); this.vcGrp.add(me); this.faces.push({ mesh: me, mat, n: V(0, 0, 1).applyAxisAngle(V(0, 1, 0), yaw), gain: 0.95 });
        this.vcWin.push(...[-9.5, -6.5, 6.5, 9.5].map((dx) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
          w.position.copy(V(dx, 2.2, 5.03).applyMatrix4(m)); w.rotation.y = yaw; w.layers.set(NOINK); this.vcGrp.add(w); return w; })); }
      tb(bv, lam("atFlagPole", () => ({ color: "#d8dadc" })), m, 14.9, 0, 6.9, 15.1, 9, 7.1, 1);
      const fp = V(15.1, 8.95, 7).applyMatrix4(m); this.flag2 = this.makeFlag(fp.x, fp.y, fp.z, 2.2, 1.35, this.vcGrp);
      const rp = V(-9, 0, 13).applyMatrix4(m); this.ramada(bv, rp.x, rp.z, -0.25 + 0.2); }
    const carCols = ["#b8433a", "#e9e4da", "#3f6fa8", "#d9a43a", "#5f6a70", "#2f5a48"];
    for (let i = 0; i < 5; i++) { const x = LOT.c[0] - LOT.w / 2 + 2.5 + i * 2.6 + (i > 2 ? 2.6 : 0), z = LOT.c[1] - 2.2; this.car(bl, x, z, Math.PI / 2 + (hash(i, 3) - 0.5) * 0.08, carCols[i]); }
    this.car(bl, 40, -67.5, -0.15 + Math.PI, "#e9e4da");
    // the far row of the lot: a tour bus, a camper RV and a ranger pickup (plain colours, no logos)
    this.vehicle(bl, 12.5, LOT.c[1] + 2.4, 0.02, 10.5, 2.5, 3.0, "#e9e4da", "#3f6fa8", 6);
    this.vehicle(bl, 22.5, LOT.c[1] - 1.8, -0.06, 7.2, 2.4, 3.1, "#efe6d6", "#b8433a", 3);
    this.vehicle(bl, 5.6, LOT.c[1] + 2.3, Math.PI + 0.03, 5.2, 1.95, 1.75, "#5e7a4a", "#e9e4da", 0);
  }
  private vcWin: THREE.Mesh[] = [];
  private entrance: [number, number, number] = [-11.7, -35.8, 0];
  private flag2!:{ mesh: THREE.Mesh; base: Float32Array; w: number; h: number };
  /** shade ramada with a picnic table */
  private ramada(b: Batch, rx: number, rz: number, yaw: number) {
    const post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) })), tan = lam("atWoodTan", () => ({ map: P.parkWood("#8a5e3c", false) }));
    const m = M4(rx, floorY(rx, rz), rz, yaw);
    for (const [dx, dz] of [[-1.9, -1.6], [1.9, -1.6], [-1.9, 1.6], [1.9, 1.6]]) tb(b, post, m, dx - 0.09, 0, dz - 0.09, dx + 0.09, 2.7, dz + 0.09, 0.5);
    for (const dz of [-1.6, 1.6]) tb(b, beam, m, -2.2, 2.62, dz - 0.08, 2.2, 2.8, dz + 0.08, 0.6);
    for (let i = 0; i < 9; i++) tb(b, beam, m, -2.25 + i * 0.56, 2.8, -2.1, -2.12 + i * 0.56, 2.9, 2.1, 0.6);
    tb(b, tan, m, -1.0, 0.72, -0.45, 1.0, 0.78, 0.45, 0.6);
    for (const dz of [-0.75, 0.75]) tb(b, tan, m, -1.0, 0.42, dz - 0.15, 1.0, 0.46, dz + 0.15, 0.6);
    for (const dx of [-0.8, 0.8]) tb(b, tan, m, dx - 0.04, 0, -0.85, dx + 0.04, 0.72, 0.85, 0.6);
  }
  /** a boxy vehicle (bus / RV / pickup): body colour + a stripe, window band, wheels; nWin side windows (0 = pickup bed) */
  private vehicle(b: Batch, x: number, z: number, yaw: number, L: number, W: number, H: number, col: string, stripe: string, nWin: number) {
    const m = M4(x, 0, z, yaw), body = lam("atCar" + col, () => ({ color: col })), st = lam("atCar" + stripe, () => ({ color: stripe }));
    const glass = lam("atCarGlass", () => ({ color: "#4a5a86" })), tire = lam("atTire", () => ({ color: "#26262a" }));
    if (nWin) {
      bx(b, body, m, 0, 0.35 + H / 2, 0, L, H, W);
      bx(b, st, m, 0, 0.75, 0, L + 0.02, 0.22, W + 0.02);
      bx(b, glass, m, 0, H * 0.72 + 0.35, 0, L * 0.92, H * 0.28, W + 0.03);
      bx(b, glass, m, L / 2, H * 0.62 + 0.35, 0, 0.04, H * 0.42, W * 0.86);
      for (let i = 1; i < nWin; i++) bx(b, body, m, -L * 0.46 + (i * L * 0.92) / nWin, H * 0.72 + 0.35, 0, 0.12, H * 0.3, W + 0.05);
    } else { // pickup: cab + open bed
      bx(b, body, m, 0, 0.75, 0, L, 0.8, W); bx(b, body, m, L * 0.18, 1.45, 0, L * 0.34, 0.65, W * 0.96);
      bx(b, glass, m, L * 0.18, 1.47, 0, L * 0.3, 0.45, W + 0.02); bx(b, st, m, 0, 0.82, 0, L + 0.02, 0.12, W + 0.02);
      bx(b, lam("atTire", () => ({ color: "#26262a" })), m, -L * 0.25, 1.18, 0, L * 0.42, 0.06, W * 0.9);
    }
    for (const dx of [-L * 0.34, L * 0.34]) for (const dz of [-W / 2, W / 2]) b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14).rotateX(Math.PI / 2).translate(dx, 0.42, dz), tire, m);
    for (const dz of [-W * 0.36, W * 0.36]) this.tails.push(V(-L / 2 - 0.02, 0.8, dz).applyMatrix4(m));
  }
  private tails: THREE.Vector3[] = [];
  /** plaque position + yaw: screen-right of the shot-3 tourist, in front of the log (VISTA.plaque lies outside every
   *  shot-3 frame; the free room in that lens is between the tourist's right edge and the frame edge) */
  private plaquePos(): [number, number, number, number] {
    const c = camAt(3, BEAT.pocketing + 28), dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], n = Math.hypot(dx, dz), fx = dx / n, fz = dz / n;
    const a = THREE.MathUtils.degToRad(7.2), rx = -fz, rz = fx, ux = Math.cos(a) * fx + Math.sin(a) * rx, uz = Math.cos(a) * fz + Math.sin(a) * rz;
    // 3.3 m out along this ray; if the loose slice (SLICE3) stands there, step further out so the plaque stays on the
    // slice's far side (its raised face then shows above the slice)
    let D = 3.3;
    for (let i = 0; i < 20 && Math.hypot(c.pos[0] + ux * D - SLICE3[0], c.pos[2] + uz * D - SLICE3[2]) < 1.0; i++) D += 0.15;
    const x = c.pos[0] + ux * D, z = c.pos[2] + uz * D;
    return [x, 0, z, Math.atan2(c.pos[0] - x, c.pos[2] - z)];
  }
  /** shot 3: one loose slice (r 0.45, 0.25 m thick) standing on edge beside the tourist, its rainbow face turned to the
   *  lens, a pale fresh notch on its rim where his chip came off, 10 chips at its base (3 of them twinkle) */
  private buildSlice3(b: Batch) {
    const NA = 26, R = 0.45, rad = Array.from({ length: NA }, (_, i) => { const a = (i / NA) * TAU; return R * (1 + 0.05 * Math.sin(2 * a + 0.7) + 0.035 * Math.sin(5 * a + 1.3) + 0.02 * Math.sin(9 * a)); });
    const { side, cap } = sliceGeo(rad, 0.25, [0.06, -0.04], [-0.05, 0.05]);
    const c3 = camAt(3, BEAT.pocketing), [x, , z] = SLICE3, yaw = Math.atan2(-(c3.pos[2] - z), c3.pos[0] - x) + 0.44; // audit A3: side thickness shows
    const m = new THREE.Matrix4().compose(V(x, floorY(x, z) + R * 0.97, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0.12, "YXZ")), V(1, 1, 1));
    b.add(side, lam("atBark", () => ({ map: P.barkHD() })), m);
    b.add(cap, lam("atJasperNotch", () => ({ map: P.quartzNotch(), color: new THREE.Color(1.04, 1.02, 1.0) })), m);
    // audit A5 P3: 5 tiny quartz glints on the face that twinkle one after another (3 f each, 7 f apart, video clock)
    for (const [ry, rz] of [[0.18, -0.12], [-0.06, 0.24], [0.27, 0.14], [-0.22, -0.18], [0.04, -0.3]] as const) this.s3Glints.push(V(0.135, ry, rz).applyMatrix4(m));
    // the fragments that broke off the notch (dark lavender quartz with pale crystal faces) lie on the ground under it
    for (const [dx, dz, s0, c] of [[0.12, 0.22, 0.05, "#6e5a86"], [0.26, 0.1, 0.035, "#d9cce6"], [0.02, 0.34, 0.03, "#8a5aa8"]] as const) {
      const px = x + Math.cos(yaw) * dx - Math.sin(yaw) * dz, pz = z - Math.sin(yaw) * dx - Math.cos(yaw) * dz;
      if (!kept(px, pz, 0.02)) this.extraChips.push({ x: px, z: pz, s: s0, sy: s0 * 0.6, y: floorY(px, pz) + s0 * 0.2, col: new THREE.Color(c) }); }
    const r = P.rng(3303), CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#efe0cc"];
    for (let i = 0; i < 11; i++) {
      const a = yaw + (r() - 0.5) * 2.4, d = 0.32 + r() * 0.55, px = x + Math.cos(a) * d, pz = z - Math.sin(a) * d, s = 0.035 + r() * 0.04;
      this.extraChips.push({ x: px, z: pz, s, sy: s * 0.55, y: floorY(px, pz) + s * 0.2, col: new THREE.Color(CC[i % 5]) });
      if (i < 3) this.glints.push({ p: V(px, floorY(px, pz) + s * 0.7, pz), set: "vista", n: 23 + i * 7, ph: i * 0.31, size: 0.07 });
    }
  }
  private glints: { p: THREE.Vector3; set: string; n: number; ph: number; size: number }[] = [];
  private car(b: Batch, x: number, z: number, yaw: number, col: string) {
    const m = M4(x, 0, z, yaw), body = lam("atCar" + col, () => ({ color: col })), glass = lam("atCarGlass", () => ({ color: "#4a5a86" })), tire = lam("atTire", () => ({ color: "#26262a" })), chrome = lam("atChrome", () => ({ color: "#c9ccd0" }));
    bx(b, body, m, 0, 0.55, 0, 4.2, 0.62, 1.78);
    bx(b, body, m, -0.25, 1.08, 0, 2.3, 0.5, 1.6);
    bx(b, glass, m, -0.25, 1.1, 0, 2.2, 0.4, 1.64);
    bx(b, glass, m, 0.95, 1.05, 0, 0.12, 0.36, 1.5);
    bx(b, chrome, m, 2.1, 0.45, 0, 0.06, 0.18, 1.6); bx(b, chrome, m, -2.1, 0.45, 0, 0.06, 0.18, 1.6);
    for (const [dx, dz] of [[-1.35, -0.85], [1.35, -0.85], [-1.35, 0.85], [1.35, 0.85]]) b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14).rotateX(Math.PI / 2).translate(dx, 0.36, dz), tire, m);
    for (const dz of [-0.62, 0.62]) this.tails.push(V(-2.13, 0.7, dz).applyMatrix4(m));
    // a sun glint off the windshield now and then (the lot reads as a real car park from the trailhead and the vista)
    const wp = V(0.98, 1.12, 0.3).applyMatrix4(m), k = this.glints.length;
    this.glints.push({ p: wp.clone(), set: "trailhead", n: 7 + (k % 5) * 2, ph: hash(k, 17), size: 0.9 }); // (the vista hides the lot)
  }

  // ======================================== the three trail heads ========================================
  private buildTrailHeads(b: Batch) {
    const post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) })), I = new THREE.Matrix4();
    const metal = lam("atLedBox", () => ({ color: "#2e3035" }));
    // trail name plates (audit A3 + carry-over): JASPER / LONG LOGS on their own sign's posts under the panel, CRYSTAL on
    // its own post; condensed routed caps as tall as each plate allows
    for (const [name, x, z, w, h, y, lines] of [["JASPER", TT.base[0] + TT.signA.dx, TT.base[2] + TT.signA.z + 0.0, PLATE.w, PLATE.h, PLATE.y, ["JASPER"]],
      ["LONG LOGS", TT.base[0] + TT.signB.dx, TT.base[2] + TT.signB.z + 0.0, LLP.w, LLP.h, LLP.y, ["LONG", "LOGS"]],
      ["CRYSTAL", TT.base[0] + CRYSTAL_X + CRY.dx, TT.base[2] + 0.35, CRY.w, CRY.h, CRY.y, ["CRYSTAL"]]] as const) {
      const bb = name === "CRYSTAL" ? this.bCryS : b;
      if (name === "CRYSTAL") { const px = TT.base[0] + CRYSTAL_X; tb(bb, post, I, px - 0.08, 0, z - 0.16, px + 0.08, TT.marker.h, z, 0.5); bb.add(new THREE.ConeGeometry(0.12, 0.1, 4).rotateY(Math.PI / 4).translate(px, TT.marker.h + 0.05, z - 0.08), beam); }
      tb(bb, beam, I, x - w / 2 - 0.02, y - h / 2 - 0.02, z - (name === "CRYSTAL" ? 0.02 : 0.04), x + w / 2 + 0.02, y + h / 2 + 0.02, z + 0.012, 0.6);
      const fc = this.face(P.namePlateTex(name, w, h, [...lines]), w, h, x, y, z + 0.0135, 0, 0.95);
      if (name === "CRYSTAL") this.crySign.add(fc.mesh);
    }

    // Sign A / Sign B: two thin posts each, LED counter on a crossbar above the panel
    for (const [k, s] of [[0, TT.signA], [1, TT.signB]] as const) {
      const x = TT.base[0] + s.dx, z = TT.base[2] + s.z, top = s.cy + TT.led.dy + TT.led.h / 2 + 0.08;
      for (const dx of [-0.38, 0.38]) {
        tb(b, post, I, x + dx - 0.04, 0, z - 0.12, x + dx + 0.04, top, z - 0.04, 0.5);
        cyl(b, lam("atConcrete", () => ({ map: P.rockHD(), color: new THREE.Color(0.9, 0.86, 0.82) })), I, x + dx, 0, z - 0.08, 0.13, 0.11, 0.09, 12); // footing
        for (let i = 0; i < 16; i++) { const a = hash(i, k * 7 + dx * 10) * TAU, d = 0.14 + hash(i, k * 3 + dx * 20) * 0.2, s2 = 0.012 + hash(i, k + 31) ** 2 * 0.03; // gravel collar
          this.extraPeb.push({ x: x + dx + Math.cos(a) * d, z: z - 0.08 + Math.sin(a) * d, s: s2, sy: s2 * 0.6, y: 0.033, col: new THREE.Color(["#d8d0c4", "#c9b49a", "#b9a08a", "#e7d6bc"][i % 4]) }); }
        for (let i = 0; i < 2; i++) this.extraTufts.push({ x: x + dx + (i ? 0.2 : -0.18) * (dx < 0 ? -1 : 1), z: z + 0.02 + i * 0.12, s: 0.3 + 0.1 * i, sy: 0.32 + 0.12 * i });
        // backlight rims (sunset / morning): thin additive strips on the posts' outer edges and tops
        this.rim(x + dx + 0.04 * Math.sign(dx), top / 2, z - 0.04, 0.012, top, 0);
      }
      this.rim(x, s.cy + s.h / 2 + 0.025, z + 0.01, s.w + 0.04, 0.012, 0); this.rim(x + s.w / 2 + 0.022, s.cy, z + 0.01, 0.012, s.h + 0.04, 0);
      this.rim(x, s.cy + TT.led.dy + TT.led.h / 2 + 0.022, z + 0.06, TT.led.w + 0.04, 0.012, 0);
      tb(b, beam, I, x - 0.46, s.cy - s.h / 2 - 0.08, z - 0.12, x + 0.46, s.cy - s.h / 2 - 0.02, z - 0.04, 0.5);
      // LED box
      const ly = s.cy + TT.led.dy;
      tb(b, metal, I, x - TT.led.w / 2 - 0.02, ly - TT.led.h / 2 - 0.02, z - 0.04, x + TT.led.w / 2 + 0.02, ly + TT.led.h / 2 + 0.02, z + 0.06, 0.5);
      this.face(P.ledFaceTex(), TT.led.w, TT.led.h, x, ly, z + 0.0615, 0, 0.9);
      const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 333;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      this.ledCv.push(cv); this.ledTex.push(tex);
      const lit = new THREE.Mesh(new THREE.PlaneGeometry(TT.led.w, TT.led.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2.4, 2.4, 2.4), fog: false }));
      lit.position.set(x, ly, z + 0.063); lit.layers.set(NOINK); lit.renderOrder = 3; this.g.add(lit); this.ledLit.push(lit.material as THREE.MeshBasicMaterial);
      // audit A5 ADD: the lit digits spill a faint red glow down onto the panel's top band
      { const sp = new THREE.Mesh(new THREE.PlaneGeometry(TT.led.w * 1.25, 0.34), new THREE.MeshBasicMaterial({ map: P.softDotTex(), color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        sp.position.set(x, s.cy + s.h / 2 - 0.04, z + 0.008); sp.layers.set(NOINK); sp.renderOrder = 4; this.g.add(sp); this.ledSpill.push(sp); }
      // panel(s)
      const panel = (grp: THREE.Group, tex2: THREE.Texture) => {
        const wood = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.04, s.h + 0.04, 0.035), lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) })));
        wood.position.set(0, 0, -0.019); wood.castShadow = true; wood.receiveShadow = true; grp.add(wood);
        const mat = new THREE.MeshBasicMaterial({ map: tex2 }), fm = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
        fm.layers.set(NOINK); grp.add(fm); this.faces.push({ mesh: fm, mat, n: V(0, 0, 1), gain: 0.97 });
        grp.position.set(x, s.cy, z); this.g.add(grp);
      };
      if (k === 0) { panel(this.signA_old, P.oldPanelTex()); panel(this.signA_new, P.testSignTex("A"));
        // audit A5 P2 (the red circle-bar did nothing when the tourist looked at it): an overlay of just the circle-bar,
        // exactly over the painted one, that pulses 1 -> 1.15 -> 1 (+30 % brighter) as he looks up
        const bp = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: P.circleBarTex(), transparent: true, depthWrite: false }));
        bp.position.set(0.0675, -0.331, 0.003); bp.layers.set(NOINK); bp.renderOrder = 3; bp.visible = false; this.signA_new.add(bp); this.barPulse = bp; }
      else { this.signB = new THREE.Group(); panel(this.signB, P.testSignTex("B")); }
    }
    // a bench and the bins at the trail-head plaza edge
    this.bench(b, TT.base[0] + 7.4, TT.base[2] + 1.2, -Math.PI / 2);
    // marked chips along the LONG LOGS path (TT.chipZ), the other two trails, and loose chips at both sign bases
    const r = P.rng(777);
    // the two nearest the shot-8 lens are put down by the assistants on "marked" (pop in), the rest are already placed
    TT.chipZ.forEach((cz, i) => this.chipBase.push({ p: tt([TT.heads.longlogs + (i % 2 ? 1.25 : -1.25) + (r() - 0.5) * 0.25, 0, cz]), s: 0.095 + r() * 0.04, yaw: r() * 6, hideAt: Infinity,
      showAt: i < 2 ? BEAT.marked - 2 + i * 10 : 0, dot: true }));
    for (const hx of [TT.heads.jasper, TT.heads.crystal]) for (let i = 0; i < 9; i++) {
      const L = TR_TT[hx < 0 ? 0 : 2], q = L[Math.min(L.length - 1, 4 + i * 5)];
      this.chipBase.push({ p: [q[0] + (i % 2 ? 1.2 : -1.2), 0, q[1]], s: 0.05 + r() * 0.03, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true });
    }
    // Sign B base: the crowd pockets these in shot 10 (staggered around BEAT.pct8); Sign A base: one is touched and put back
    // audit A2 P1: 4 chips round each crowd member (cast.ts shot 10 crowd: positions + pick offsets copied below) vanish
    // on that member's pick frame (1166-1168, staggered 1 f), so the ground in front of B is empty by 1172
    CROWD_B.forEach(([dx, dz, off], n) => { for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + n * 0.9 + (r() - 0.5) * 0.6, d = 0.24 + r() * 0.3;
      this.chipBase.push({ p: tt([dx + Math.cos(a) * d, 0, dz + 0.12 + Math.sin(a) * d * 0.8]), s: 0.045 + r() * 0.03, yaw: r() * 6, hideAt: BEAT.pct8 - 27 + off + (k % 2), showAt: 0, dot: true }); // vanish on the crowd's unison pick (cast.ts G = pct8 - 27)
    } });
    for (let i = 0; i < 5; i++) this.chipBase.push({ p: tt([TT.signA.dx + (r() - 0.5) * 1.6, 0, 0.55 + r() * 1.0]), s: 0.045 + r() * 0.03, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true });
    // shot 13: four chips still lying under Sign B at sunset (they hop when the stamp slams); pale dust outlines where
    // the shot-10 crowd lifted the others; footprints and scuffs in the sand drift there
    for (let i = 0; i < 4; i++) this.chipBase.push({ p: tt([TT.signB.dx - 0.75 + i * 0.5 + (r() - 0.5) * 0.2, 0, 0.75 + r() * 0.7]), s: 0.06 + r() * 0.02, yaw: r() * 6, hideAt: Infinity, showAt: -13, dot: true });
    // shot 8: three more marked chips (white paint dots) just inside the bottom of the low LONG LOGS lens
    { const c8 = camAt(8, SHOTS[7].a + 2);
      for (const [d, sx] of [[1.45, -0.35], [1.75, 0.3], [2.1, -0.05]] as const) { const [x, z] = groundAhead(c8, d, sx);
        if (!kept(x, z, 0.05)) this.chipBase.push({ p: [x, 0, z], s: 0.06 + r() * 0.02, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true }); } }
    this.buildTrailDressing(b);
    this.cryGrp.add(this.crySign); this.g.add(this.cryGrp); // CRYSTAL plate + the research table: hidden in shot 10 (edge slivers); built after buildDressA5b (round 7: the 0.8 MI / STAY ON TRAIL boards added later were never built)
  }
  /** round 2 dressing at the three trail heads */
  private buildTrailDressing(b: Batch) {
    const I = new THREE.Matrix4(), r = P.rng(4545), post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const decal = (tex: THREE.Texture, key: string) => pathTone(lam(key, () => ({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })), key);
    const flat = (m: THREE.Material, x: number, z: number, w: number, h: number, rot: number, y = 0.04) => {
      const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(rot), m); me.position.set(x, floorY(x, z) + y, z); me.layers.set(NOINK); me.renderOrder = 1; me.receiveShadow = true; this.g.add(me); return me; };
    // divots where the crowd lifted the Sign B chips (visible once each chip is gone), prints and scuffs under Sign B
    const dv = decal(P.divotTex(), "atDivotDecal");
    for (const c of this.chipBase) if (c.hideAt < Infinity) this.divots.push({ mesh: flat(dv, c.p[0], c.p[2], c.s * 2.6, c.s * 2.2, c.yaw, 0.041), at: c.hideAt });
    const fm = decal(P.footprintTex(), "atFeetDecal");
    // audit A3: a trampled path of prints leading to Sign B, only two neat lines at Sign A
    for (const [dx, dz, rot] of [[-0.7, 1.2, 0.4], [0.6, 1.0, -0.6], [0.1, 1.9, 1.4], [-3.4, 1.4, 0.2], [-2.6, 2.1, -0.9], [-0.3, 2.6, 0.1], [0.4, 2.9, -0.2], [-0.9, 2.2, 0.9],
      [1.0, 2.3, -1.1], [0.2, 3.5, 0.05], [-0.5, 3.4, -0.4], [0.9, 3.7, 0.3], [-1.3, 1.0, 1.3], [1.4, 1.2, -1.4]] as const) flat(fm, TT.base[0] + dx, TT.base[2] + dz, 0.42, 1.65, rot, 0.042);
    const dr = decal(P.driftTex(0), "atDrift0");
    for (const [dx, dz, s] of [[0.2, 0.9, 1.6], [-3.1, 0.9, 1.4], [3.0, 0.8, 1.3]] as const) flat(dr, TT.base[0] + dx, TT.base[2] + dz, s * 1.4, s, r() * 3, 0.039);
    const ck = decal(P.crackTex(), "atCrackDecal");
    for (let i = 0; i < 6; i++) flat(ck, TT.base[0] + (r() - 0.5) * 10, TT.base[2] + 0.2 + r() * 4.8, 1.0 + r() * 0.8, 1.0 + r() * 0.8, r() * 3, 0.038);
    // a dropped trail brochure under Sign B (its free end flutters)
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12).translate(0.12, 0, 0), lam("atBrochure", () => ({ map: P.brochureTex(), side: THREE.DoubleSide })));
      const grp = new THREE.Group(); grp.position.set(TT.base[0] + 0.62, 0.05, TT.base[2] + 1.55); grp.rotation.set(-Math.PI / 2, 0, 0.5); grp.add(m); this.g.add(grp);
      m.castShadow = true; m.receiveShadow = true; this.brochure = m; }
    // STAY ON TRAIL post + distance marker between the heads, a second bin pair
    const ps = (x: number, z: number, yaw: number, tex: THREE.Texture, w: number, h: number, top: number) => {
      const m = M4(x, floorY(x, z), z, yaw); tb(b, post, m, -0.05, 0, -0.1, 0.05, top, -0.02, 0.5);
      tb(b, beam, m, -w / 2 - 0.02, top - h - 0.02, -0.02, w / 2 + 0.02, top + 0.02, 0.01, 0.5);
      const p = V(0, top - h / 2, 0.0115).applyMatrix4(m); this.face(tex, w, h, p.x, p.y, p.z, yaw, 0.92); };
    { const p = tt([1.55, 0, -1.4]); ps(p[0], p[2], 0.1, P.smallSignTex("stayTT", ["PLEASE", "STAY ON", "TRAIL"], 0.36, 0.36), 0.36, 0.36, 1.0); }
    { const p = tt([-5.75, 0, -1.25]); ps(p[0], p[2], 0.2, P.smallSignTex("ll06", ["LONG LOGS", "0.6 MI"], 0.62, 0.36, 1), 0.62, 0.36, 1.15); }
    { const p = tt([6.4, 0, -0.4]); this.bins(b, p[0], p[2], -0.3); }
    // spare sign panels (backs out, chalked A / B / SPARE) + a red toolbox with a screwdriver, against Sign A's right post
    { const bx0 = TT.base[0] + TT.signA.dx + 0.5, z0 = TT.base[2] - 0.02, back = lam("atPanelBack", () => ({ map: P.weatheredWood("#7a5234") }));
      const bS = new Batch();
      ["A", "B", "SPARE"].forEach((lbl, i) => {
        const m = M4(bx0 + 0.05 + i * 0.07, 0, z0 + 0.06 + i * 0.055, 0.0, 1, 1, 1, -0.2, -0.04 * i);
        bS.add(new THREE.BoxGeometry(0.92, 0.92, 0.03).translate(0.46, 0.46, 0), back, m);
        const fp = V(0.46, 0.5, 0.017).applyMatrix4(m);
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), lam("atChalk" + lbl, () => ({ map: P.labelTex("ch" + lbl, lbl, "#7a5234", "#f4efe2"), transparent: false })));
        lm.position.copy(fp); lm.rotation.set(-0.2, 0, -0.04 * i, "YXZ"); this.spareGrp.add(lm);
      });
      bS.build(this.spareGrp); this.g.add(this.spareGrp);
      const tm = M4(bx0 + 1.3, 0, z0 + 0.35, 0.3), red = lam("atToolbox", () => ({ color: "#c43a2e" })), steel = lam("atSteel", () => ({ color: "#8a9096" }));
      bx(b, red, tm, 0, 0.11, 0, 0.46, 0.22, 0.22); bx(b, red, tm, 0, 0.24, 0, 0.44, 0.04, 0.2); bx(b, steel, tm, 0, 0.3, 0, 0.26, 0.03, 0.03);
      for (const dx of [-0.13, 0.13]) bx(b, steel, tm, dx, 0.28, 0, 0.02, 0.06, 0.02);
      b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6).rotateZ(Math.PI / 2).translate(0.05, 0.275, 0.08), steel, tm);
      b.add(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 8).rotateZ(Math.PI / 2).translate(-0.07, 0.275, 0.08), lam("atHandle", () => ({ color: "#e8b830" })), tm); }
    // the research table near the CRYSTAL head: thermos, coffee cup (steam), clipboard, the chip bucket labelled MARKED
    // audit A2: moved into the shot-7 frame (right of the professor, behind him): the field-research station
    { const b0 = b; b = this.bCry; // (the research table lives in the group hidden in shot 10: its corner slivered into the B snap)
      const p = tt([2.85, 0, 0.55]), m = M4(p[0], 0, p[2], -0.3), top = lam("atTableTop", () => ({ color: "#d9d4c8" })), leg = lam("atSteel", () => ({ color: "#8a9096" }));
      bx(b, top, m, 0, 0.74, 0, 1.2, 0.035, 0.6);
      for (const [dx, dz] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) bx(b, leg, m, dx, 0.37, dz, 0.025, 0.74, 0.025);
      cyl(b, lam("atThermos", () => ({ color: "#2f5a48" })), m, 0.02, 0.757, -0.2, 0.045, 0.045, 0.3, 12); // audit A3: 0.4 m right, behind the cup
      cyl(b, lam("atThermosCap", () => ({ color: "#d8dadc" })), m, 0.02, 1.057, -0.2, 0.05, 0.05, 0.05, 12);
      cyl(b, lam("atCup", () => ({ color: "#f0ece2" })), m, -0.12, 0.757, 0.12, 0.035, 0.04, 0.09, 12);
      bx(b, lam("atClip", () => ({ color: "#a8784a" })), m, 0.25, 0.78, 0, 0.24, 0.012, 0.32); bx(b, lam("atPaper", () => ({ color: "#f6f2e6" })), m, 0.25, 0.79, 0.01, 0.2, 0.006, 0.26);
      this.steam = V(-0.12, 0.86, 0.12).applyMatrix4(m);
      this.bucket(b, V(0.8, 0, 0.35).applyMatrix4(m), "MARKED", 0.3, this.cryGrp); b = b0; }
    // shot 8: by the kneeling assistant, a MARKED bucket, an open white paint pot with a brush; orange pin flags beside
    // every marked chip down the LONG LOGS path
    { this.bucket(b, V(...tt([1.5, 0, -3.95])), "MARKED", 0.6);
      // audit A2: the paint tin + brush sat 1.3 m from the shot-8 insert lens (a "broom handle" over white rocks): now
      // beside the assistant, just outside the insert, the short brush laid across the tin
      const pm = M4(...tt([1.55, 0, -3.15]), 0.4);
      cyl(b, lam("atPaintTin", () => ({ color: "#b9bec4" })), pm, 0, 0, 0, 0.08, 0.08, 0.11, 14);
      b.add(new THREE.CylinderGeometry(0.072, 0.072, 0.004, 14).translate(0, 0.108, 0), lam("atWhitePaint", () => ({ color: "#fbf8f0" })), pm);
      b.add(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 6).rotateZ(Math.PI / 2).translate(0.02, 0.118, 0.02), lam("atHandle", () => ({ color: "#e8b830" })), pm);
      b.add(new THREE.BoxGeometry(0.035, 0.012, 0.04).translate(-0.06, 0.118, 0.02), lam("atWhitePaint", () => ({ color: "#fbf8f0" })), pm); }
    { const wire = lam("atWire", () => ({ color: "#5a5a5a" }));
      this.chipBase.forEach((c, i) => { if (i >= TT.chipZ.length) return;
        const x = c.p[0] + 0.12, z = c.p[2] + 0.05; cyl(b, wire, I, x, 0, z, 0.004, 0.004, 0.36, 4); this.pinFlags.push([x, 0.36, z]); }); }
    // shot 7 / 8 foreground clutter near each anchor lens: pebbles, rainbow chips, dry tufts (low, at the frame bottom)
    for (const id of [7, 8, 9, 10, 13]) {
      const c = camAt(id, SHOTS[id - 1].a + 2), CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8"];
      const dy = c.look[1] - c.pos[1], dh = Math.hypot(c.look[0] - c.pos[0], c.look[2] - c.pos[2]), dn = Math.atan2(-dy, dh) + THREE.MathUtils.degToRad(c.fov / 2);
      const db = dn > 0.05 ? c.pos[1] / Math.tan(dn) : 3; // where the ground enters the bottom of the frame
      for (let i = 0; i < 34; i++) {
        const [x, z] = groundAhead(c, db * (0.95 + r() * 1.3), (r() - 0.5) * 2.2);
        if (kept(x, z, 0.05)) continue;
        const s = (0.015 + r() ** 2 * 0.06) * Math.max(1, db / 3);
        if (i % 7 === 0) this.extraChips.push({ x, z, s: s * 1.3, sy: s * 0.7, y: floorY(x, z) + 0.03 + s * 0.2, col: new THREE.Color(CC[i % 4]) });
        else if (i % 9 === 4 && paveD(x, z) > 0.1) this.extraTufts.push({ x, z, s: 0.26 + r() * 0.2, sy: 0.25 + r() * 0.25 });
        else this.extraPeb.push({ x, z, s, sy: s * 0.6, y: floorY(x, z) + 0.032, col: new THREE.Color(["#e7d6bc", "#d8c3a6", "#c9b49a", "#b9a08a", "#efe2cf"][i % 5]) });
      }
    }
    // gravel edging along the first 12 m of the three trails
    for (const L of TR_TT) for (let i = 0; i < L.length && i < 26; i++) for (const sd of [-1, 1]) {
      const a = L[Math.max(0, i - 1)], c2 = L[Math.min(L.length - 1, i + 1)], dx = c2[0] - a[0], dz = c2[1] - a[1], n = Math.hypot(dx, dz) || 1;
      for (let k2 = 0; k2 < 3; k2++) { const off = 0.92 + r() * 0.22, x = L[i][0] - (dz / n) * sd * off + (r() - 0.5) * 0.3, z = L[i][1] + (dx / n) * sd * off + (r() - 0.5) * 0.3, s = 0.012 + r() ** 2 * 0.035;
        if (!kept(x, z, 0.04)) this.extraPeb.push({ x, z, s, sy: s * 0.6, y: floorY(x, z) + 0.03, col: new THREE.Color(["#d8d0c4", "#c9b49a", "#b9a08a", "#e7d6bc"][k2 % 4]) }); }
    }
    this.decals(TT.base[0], TT.base[2] - 6, 14, 10, 1.0);
    // a picnic ramada and a ranger pickup far behind the heads (plum silhouettes on the sunset horizon in shot 13)
    { const p = tt([-4.6, 0, -36]); if (paveD(p[0], p[2]) > 3) this.ramada(b, p[0], p[2], 0.2);
      const q = tt([-8.6, 0, -37.5]); if (paveD(q[0], q[2]) > 2) this.vehicle(b, q[0], q[2], 0.4, 5.2, 1.95, 1.75, "#5e7a4a", "#e9e4da", 0); }
    // shots 7-8: Sign B waits under a tied tan tarp (no spoiler before shot 9); its LED stays dark until then
    // audit A2: tan canvas with painted folds, two dark rope ties wrapped round the posts, the lower-right corner flap
    // lifting in the gusts (vertex wind, +-6 cm) and a clothes-pinned card "TEST B"
    // round 6 (audit A6 P2: "a plain wooden crate or outhouse with a black box on top"): ONE heavy canvas drape thrown
    // over the LED box AND the panel, gathered by a rope at the neck under the LED and a second round the panel, 6
    // hanging folds that deepen toward a flared, scalloped hem (lavender creases from the shading + the texture), the
    // sides wrapping back round the edges, the lower-right corner lifting in the gusts, knotted rope ends and a
    // TEST IN PROGRESS card. Local frame: x across, y = world height, z out of the sign face (hem above the LONG LOGS plate)
    // round 7 (audit A7 P2 "a hay bale or a mummy"): the drape covers ONLY the flat panel now - the dark LED box sits
    // above it and both posts show below the hem, so it reads as a covered sign; the cloth lies flat over the board
    // (small bulge), folds over the top edge, two rope ties and a big 'SIGN B / TEST' card on the lower rope
    { const Y0 = 0.98, Y1 = 2.09, NX = 18, NY = 26, geo = new THREE.PlaneGeometry(1, Y1 - Y0, NX, NY).translate(0, (Y0 + Y1) / 2, 0), pa = geo.attributes.position as THREE.BufferAttribute;
      const NECK = 1.93, BELT = 1.24;
      for (let i = 0; i < pa.count; i++) {
        const u = pa.getX(i) * 2, y = pa.getY(i), v = (Y1 - y) / (Y1 - Y0);                    // u -1..1 across, v 0 top .. 1 hem
        const halfW = 0.505 + 0.04 * v * v + 0.008 * Math.sin(v * 9);                            // the panel's width, flaring a little at the hem
        const pinch = Math.exp(-(((y - NECK) / 0.05) ** 2)) * 0.6 + Math.exp(-(((y - BELT) / 0.05) ** 2)) * 0.5;
        const folds = Math.cos(u * 3.1 * Math.PI + 0.6 * Math.sin(v * 3)) * (0.006 + 0.03 * v * v) * (1 - 0.6 * pinch);
        const bulge = 0.022 * Math.max(0, 1 - u * u);                                             // a flat board under the cloth
        const wrap = 0.09 * sstep(0.8, 1.0, Math.abs(u)) * (0.6 + 0.4 * v);                     // the sides bend back round the edges
        const over = y > Y1 - 0.07 ? (y - (Y1 - 0.07)) * 1.15 : 0;                                // folded back over the top edge
        const hem = v > 0.9 ? 0.02 * Math.sin(u * 11 + 0.7) * (v - 0.9) / 0.1 : 0;              // a scalloped hem
        pa.setXYZ(i, u * halfW * (1 - 0.04 * pinch), y + hem - over * 0.35, 0.06 + bulge + folds - wrap - 0.025 * pinch - over);
      }
      geo.computeVertexNormals();
      this.tarpBase = Float32Array.from(pa.array as ArrayLike<number>);
      // warm canvas even in the backlit morning shade (a tan emissive floor + low shade lift, like the stamp)
      const tx = P.tarpTex3(), tarp = new THREE.Mesh(geo, twoTone(new THREE.MeshLambertMaterial({ map: tx, side: THREE.DoubleSide, emissive: new THREE.Color("#c9a878"), emissiveMap: tx, emissiveIntensity: 0.32 }), 0.25));
      tarp.position.set(TT.base[0] + TT.signB.dx, 0, TT.base[2] + TT.signB.z - 0.012); tarp.castShadow = true; tarp.receiveShadow = true; this.g.add(tarp);
      const ropeM = lam("atRopeDark", () => ({ color: "#6a4a2a" }));
      for (const [ry, hw] of [[NECK, 0.5], [BELT, 0.53]] as const) { // a rope round the top and the lower band: a sagging front run + side wraps + a knot with two loose ends
        const pts: THREE.Vector3[] = []; for (let k = 0; k <= 10; k++) { const uu = -1 + (2 * k) / 10; pts.push(V(uu * hw, ry - 0.012 * (1 - uu * uu), 0.05 + 0.03 * (1 - uu * uu))); }
        for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], c = pts[k], d = c.clone().sub(a), mm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, d.length() + 0.004, 6), ropeM);
          mm.position.copy(a.clone().add(c).multiplyScalar(0.5)); mm.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); mm.castShadow = true; tarp.add(mm); }
        for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.03, 0.2), ropeM); w.position.set(sx * (hw + 0.01), ry, -0.04); tarp.add(w); }
        const kx = ry === NECK ? -0.3 : 0.36, kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), ropeM); kn.position.set(kx, ry - 0.005, 0.085); kn.castShadow = true; tarp.add(kn);
        for (const [dx, L] of [[-0.02, 0.16], [0.025, 0.11]] as const) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.009, L, 5).translate(0, -L / 2, 0), ropeM); e.position.set(kx + dx, ry - 0.02, 0.095); e.rotation.z = dx * 6; e.castShadow = true; tarp.add(e); } }
      // the card: 'SIGN B / TEST' (caps ~40+ px in the shot-7 opener), clothes-pinned to the lower rope, unlit-bright so it reads in the backlit morning
      { const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26).translate(0, -0.13, 0), new THREE.MeshBasicMaterial({ map: P.tagTex2("signBtest", ["SIGN B", "TEST"]), side: THREE.DoubleSide }));
        tag.layers.set(NOINK); this.faces.push({ mesh: tag, mat: tag.material as THREE.MeshBasicMaterial, n: V(0, 0, 1), gain: 0.92 });
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.065, 0.022), lam("atPin", () => ({ color: "#c9a06a" })));
        const tg = new THREE.Group(); tg.position.set(0.04, NECK - 0.012, 0.1); tg.add(tag); pin.position.set(0, 0.0, 0.012); tg.add(pin); tarp.add(tg); this.tarpTag = tg; } // (on the top rope: the lower corner flap hid it)
      this.tarp = tarp; }
    // a faint glass reflection on each LED face (reads as a switched-off screen while dark)
    for (const s of [TT.signA, TT.signB]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(TT.led.w * 0.96, TT.led.h * 0.9), new THREE.MeshBasicMaterial({ map: P.glassTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.2, 0.2, 0.22), fog: false }));
      m.position.set(TT.base[0] + s.dx, s.cy + TT.led.dy, TT.base[2] + s.z + 0.0645); m.layers.set(NOINK); m.renderOrder = 4; this.g.add(m); this.ledGlass.push(m);
    }
    // a canyon wren on top of the CRYSTAL marker post (shot 7 morning): bobs and cocks its tail
    { const w = new THREE.Group(), brown = lam("atWren", () => ({ color: "#9a6a42" })), pale = lam("atWrenPale", () => ({ color: "#efe2cc" }));
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.05, 0.035, 0.032), brown), throat = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6).scale(0.025, 0.022, 0.024).translate(0.03, 0.01, 0), pale);
      const head = new THREE.Group(); head.position.set(0.045, 0.03, 0); head.add(new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), brown));
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.035, 5).rotateZ(-Math.PI / 2).translate(0.035, -0.002, 0), lam("atBeak", () => ({ color: "#3a3030" }))); head.add(beak);
      for (const dz of [-0.012, 0.012]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.004, 5, 4), new THREE.MeshBasicMaterial({ color: "#141014" })); e.position.set(0.014, 0.008, dz); head.add(e); }
      const tail = new THREE.Group(); tail.position.set(-0.04, 0.01, 0); tail.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.025).translate(-0.03, 0, 0), brown));
      for (const m of [body, throat]) { m.castShadow = true; w.add(m); } w.add(head, tail);
      w.scale.setScalar(3); // audit A3 P3: 2x (it was ~5 px); round 6 (audit A6 ADD): 3x, ~60 px in the shot-7 wide
      w.position.set(TT.base[0] + CRYSTAL_X - 0.24, CRY.y + CRY.h / 2 + 0.022 + 0.07, TT.base[2] + 0.35 + 0.0); w.rotation.y = -2.2; this.g.add(w);
      this.wren = { grp: w, head, tail }; }
    // a lizard on Sign A's left footing (push-ups in shots 9-10)
    { const a = this.makeLizard(); this.lizA = a; a.grp.position.set(TT.base[0] + TT.signA.dx - 0.38 + 0.03, 0.115, TT.base[2] + TT.signA.z - 0.04); a.grp.rotation.y = -0.6; }
    for (let i = 0; i < 20; i++) this.pickPuffs.push(this.spr(P.puffTex(), "#ead8bc", false, true));
  }
  /** audit A2 "no empty flat areas": dress the ground a lens sees between d0 and d1 metres ahead (lateral +-1.2 of the
   *  half frame): clustered dry tufts (2-4 per clump, scale 0.6-1.4, tinted), pebble scatter (1-4 cm), clusters of
   *  5-15 cm rainbow chips, a few rocks with lavender contact blobs, sage mounds, cracked-earth / hairline-crack decals.
   *  Everything goes through free() (off the cast, out of every lens line) and stays out of the shot-8 insert. */
  private dressLens(id: number, f: number, d0: number, d1: number, n: number, seed: number, o: { pave?: boolean; tufts?: number; sage?: number; rocks?: number; chips?: number; cracks?: number } = {}) {
    const c = camAt(id, f), r = P.rng(seed), CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#d8683c", "#b85a6a"];
    const PC = ["#e7d6bc", "#d8c3a6", "#c9b49a", "#b9a08a", "#c98a6a", "#a88a7a", "#efe2cf"], TC = ["#ffffff", "#f2e6cc", "#e4ead8", "#fff0d8", "#d8cdb8", "#eadcc0"];
    const RC = ["#b08a72", "#a07866", "#c09a80", "#9a7c70", "#b7967e"];
    const at = () => { const d = lerp(d0, d1, r() ** 0.8), [x, z] = groundAhead(c, d, (r() - 0.5) * 2.4); return [x, z, d] as const; };
    const okPave = (x: number, z: number, rad: number) => (o.pave ? true : paveD(x, z) > rad + 0.05);
    for (let i = 0; i < n; i++) { // pebbles (gravel), sizes scale a little with distance so they still read
      const [x, z, d] = at(), s = (0.01 + r() ** 2 * 0.03) * Math.max(1, d / 4);
      if (kept(x, z, 0.03) || !okPave(x, z, 0)) continue;
      this.extraPeb.push({ x, z, s, sy: s * 0.6, y: floorY(x, z) + (paveD(x, z) < 0 ? 0.032 : 0.004), col: new THREE.Color(PC[Math.floor(r() * PC.length)]) });
    }
    for (let i = 0; i < (o.chips ?? 4); i++) { // chip clusters: 3-6 broken pieces of one log, red / orange / purple
      const [x, z] = at(); if (kept(x, z, 0.1) || !okPave(x, z, 0)) continue;
      const k = 3 + Math.floor(r() * 4), col = CC[Math.floor(r() * CC.length)];
      for (let j = 0; j < k; j++) { const a = r() * TAU, dd = r() * 0.22, px = x + Math.cos(a) * dd, pz = z + Math.sin(a) * dd, s = 0.03 + r() * 0.06;
        if (!kept(px, pz, 0.03)) this.extraChips.push({ x: px, z: pz, s, sy: s * 0.55, y: floorY(px, pz) + (paveD(px, pz) < 0 ? 0.03 : 0) + s * 0.2, col: new THREE.Color(j % 3 ? col : CC[Math.floor(r() * CC.length)]) }); }
    }
    for (let i = 0; i < (o.tufts ?? 5); i++) { // dry tuft clumps (2-4)
      const [x, z] = at(); if (!free(x, z, 0.2, 0.45, o.pave ? -9 : 0.08) || insert8Blocks(x, z, 0.45)) continue;
      const k = 2 + Math.floor(r() * 3), base = 0.6 + r() * 0.8;
      for (let j = 0; j < k; j++) { const a = r() * TAU, dd = j ? 0.12 + r() * 0.3 : 0, px = x + Math.cos(a) * dd, pz = z + Math.sin(a) * dd, sc = base * (0.6 + r() * 0.6);
        if (!kept(px, pz, 0.1)) this.extraTufts.push({ x: px, z: pz, s: 0.34 * sc, sy: (0.26 + r() * 0.24) * sc, col: new THREE.Color(TC[Math.floor(r() * TC.length)]) }); }
    }
    for (let i = 0; i < (o.sage ?? 2); i++) { const [x, z] = at(); if (free(x, z, 0.45, 0.8, 0.4) && !insert8Blocks(x, z, 0.8)) this.extraSage.push({ x, z, s: 0.38 + r() * 0.3, yaw: r() * TAU }); }
    for (let i = 0; i < (o.rocks ?? 3); i++) { // sandstone rocks with lavender contact blobs
      const [x, z] = at(), s = 0.08 + r() * 0.16; if (!free(x, z, s + 0.05, s * 1.6, 0.1) || insert8Blocks(x, z, s * 1.5)) continue;
      this.extraRocks.push({ x, z, s, sy: s * (0.55 + r() * 0.3), col: new THREE.Color(RC[Math.floor(r() * RC.length)]), y: floorY(x, z) - s * 0.15 });
      this.blobs.push([x, z, s * 2.6, s * 2.0, r() * TAU]);
    }
    for (let i = 0; i < (o.cracks ?? 2); i++) { const [x, z] = at(); if (kept(x, z, 0.3)) continue; this.cracks.push([x, z, 0.9 + r() * 1.2, r() * TAU, paveD(x, z) < 0 ? 1 : 0]); }
  }
  /** round A2 dressing: ground clutter in every story lens, the shot-1 plaza edge, the shot-2 trail edge, the shot-7
   *  research station, shot-8 tent markers, small park plaques */
  private buildDressA2(b: Batch) {
    const I = new THREE.Matrix4(), r = P.rng(6161), post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const decal = (tex: THREE.Texture, key: string) => lam(key, () => ({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const flat = (m: THREE.Material, x: number, z: number, w: number, h: number, rot: number, y: number) => {
      const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(rot), m); me.position.set(x, y, z); me.layers.set(NOINK); me.renderOrder = 1; me.receiveShadow = true; this.g.add(me); return me; };
    const CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#d8683c"];
    // ---- every story lens: ground clutter in the lower frame ----
    this.dressLens(1, BEAT.wanted + 7, 2.4, 6.5, 170, 101, { pave: true, tufts: 3, sage: 0, rocks: 0, chips: 3, cracks: 3 });
    this.dressLens(2, BEAT.arizona + 27, 5, 13, 280, 202, { tufts: 12, sage: 4, rocks: 5, chips: 7, cracks: 4 });
    this.dressLens(2, SHOTS[1].b - 3, 4.5, 11, 220, 203, { tufts: 10, sage: 3, rocks: 4, chips: 6, cracks: 3 });
    this.dressLens(3, BEAT.pocketing + 10, 2.7, 6.5, 160, 304, { tufts: 4, sage: 1, rocks: 2, chips: 3, cracks: 2 });
    this.dressLens(4, BEAT.warning - 14, 3.5, 8, 120, 405, { pave: true, tufts: 2, sage: 0, rocks: 0, chips: 2, cracks: 2 });
    this.dressLens(7, CUE.psych + 3, 3.4, 7.5, 160, 707, { pave: true, tufts: 3, sage: 1, rocks: 2, chips: 4, cracks: 2 });
    this.dressLens(8, BEAT.trails + 6, 6, 12, 160, 808, { pave: true, tufts: 4, sage: 1, rocks: 2, chips: 3, cracks: 2 });
    this.dressLens(9, BEAT.please1 + 12, 3.6, 7, 140, 909, { pave: true, tufts: 3, sage: 0, rocks: 1, chips: 3, cracks: 3 });
    this.dressLens(9, BEAT.many1 + 37, 3.6, 7, 140, 910, { pave: true, tufts: 3, sage: 0, rocks: 1, chips: 3, cracks: 3 });
    this.dressLens(10, BEAT.pleaseA + 25, 3.1, 7, 160, 1010, { pave: true, tufts: 2, sage: 0, rocks: 1, chips: 3, cracks: 4 });
    this.dressLens(10, BEAT.pct8 - 23, 3.1, 7, 140, 1011, { pave: true, tufts: 2, sage: 0, rocks: 0, chips: 0, cracks: 3 }); // no loose chips here: the crowd empties this ground
    this.dressLens(13, BEAT.permission - 5, 3.8, 8, 140, 1313, { pave: true, tufts: 3, sage: 0, rocks: 1, chips: 2, cracks: 2 });
    this.dressLens(15, BEAT.soSome + 14, 2.6, 6, 100, 1515, { pave: true, tufts: 2, sage: 0, rocks: 0, chips: 2, cracks: 2 });
    // ---- shot 1 MCU: a gravel border along the plaza curb + side edges, 9 tiny chips round the glint rock, dusty
    // prints and scuffs on the paving, a dropped trail map (all static: frame 0 = frame 1857) ----
    const PC = ["#e7d6bc", "#d8c3a6", "#c9b49a", "#b9a08a", "#efe2cf", "#c98a6a"];
    for (let i = 0; i < 260; i++) {
      const side = i % 5, s = 0.01 + r() ** 2 * 0.022;
      const [x, z] = side < 3 ? [lerp(-2.8, 2.8, r()), 1.97 + r() * 0.38] : [(side === 3 ? -1 : 1) * (2.84 + r() * 0.34), lerp(-2.6, 1.9, r())];
      if (!kept(x, z, 0.02)) this.extraPeb.push({ x, z, s, sy: s * 0.6, y: 0.004, col: new THREE.Color(PC[i % PC.length]) });
    }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + r() * 0.5, d = 0.17 + r() * 0.28, x = TH.glintRock[0] + Math.cos(a) * d, z = TH.glintRock[2] + Math.sin(a) * d, s = 0.014 + r() * 0.018;
      if (!kept(x, z, 0.01) || Math.hypot(x - TH.glintRock[0], z - TH.glintRock[2]) > 0.16) this.extraChips.push({ x, z, s, sy: s * 0.55, y: 0.036 + s * 0.2, col: new THREE.Color(CC[i % 5]) }); }
    { const fm = decal(P.footprintTex(), "atFeetDecal");
      for (const [x, z, rot] of [[-0.55, 0.9, 0.15], [0.3, 0.2, -0.2], [1.6, 0.7, 0.5], [-1.4, -0.6, -0.1]] as const) { const me = flat(fm, x, z, 0.42, 1.4, rot, 0.0368); (me.material as THREE.MeshLambertMaterial).opacity = 1; } }
    /* audit A5 P2: the TRAIL GUIDE MAP brochure half cut in the shot-1 MCU's corner (a UI sticker) is removed */
    // tufts + a hairline crack where the plaza meets the curb (weeds in the cracks)
    for (const [x, z] of [[-1.3, 1.72], [1.95, 1.7], [2.6, 0.2]] as const) for (let k = 0; k < 2; k++) this.extraTufts.push({ x: x + k * 0.1, z: z - k * 0.05, s: 0.2 + 0.06 * k, sy: 0.16 + 0.05 * k, y: 0.03 });
    this.cracks.push([-0.9, 1.25, 0.9, 0.3, 1], [2.1, 0.6, 1.0, -1.1, 1], [0.6, -1.4, 1.1, 0.8, 1]);
    // ---- shot 2: along the trail edge behind the entrance sign: a bench, a small plaque lectern, a rope barrier ----
    { const ok = (x: number, z: number, rad: number, h: number) => paveD(x, z) > rad && !blocks(x, z, rad, 0, h);
      if (ok(-7.7, -29.6, 0.9, 0.9)) this.bench(b, -7.7, -29.6, Math.PI / 2 + 0.3);
      if (ok(-7.3, -25.4, 0.4, 1.2)) { const m = M4(-7.3, floorY(-7.3, -25.4), -25.4, -1.2);
        for (const dx of [-0.16, 0.16]) tb(b, post, m, dx - 0.035, 0, -0.06, dx + 0.035, 0.92, 0.0, 0.5);
        const t = new THREE.Matrix4().compose(V(0, 1.0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0, 0)), V(1, 1, 1));
        b.add(new THREE.BoxGeometry(0.48, 0.34, 0.04).translate(0, 0, -0.025), beam, m.clone().multiply(t));
        const fp = V(0, 0, 0.0).applyMatrix4(m.clone().multiply(t)); this.face(P.plaqueTex(), 0.44, 0.31, fp.x, fp.y, fp.z, -1.2, 0.95, -0.45); }
      const rope = lam("atRope", () => ({ color: "#c9a96a" })), pts: THREE.Vector3[] = [];
      for (let i = 0; i < 6; i++) { const z = -21 - i * 2.2, x = -8.6 + 0.15 * Math.sin(i); if (!ok(x, z, 0.1, 0.8)) continue; pts.push(V(x, floorY(x, z), z)); cyl(b, post, I, x, floorY(x, z), z, 0.05, 0.045, 0.72, 8); }
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i]; if (a.distanceTo(c) > 2.6) continue; const mid = a.clone().add(c).multiplyScalar(0.5); mid.y -= 0.12;
        tube(b, rope, V(a.x, a.y + 0.64, a.z), V(mid.x, mid.y + 0.64, mid.z), 0.014); tube(b, rope, V(mid.x, mid.y + 0.64, mid.z), V(c.x, c.y + 0.64, c.z), 0.014); } }
    // ---- shot 3: a blurred framer at the bottom-left (two dry tufts by the rail end) ----
    { const c3 = camAt(3, BEAT.pocketing + 10); for (const [d, sx, s] of [[1.7, -0.95, 0.42], [1.9, -0.78, 0.34]] as const) { const [x, z] = groundAhead(c3, d, sx); if (!kept(x, z, 0.15)) this.extraTufts.push({ x, z, s, sy: s * 0.9, col: new THREE.Color("#f2e6cc") }); } }
    // ---- shot 5: a blurred sage framer lower-left; a trail leaflet flapping against the curb ----
    { const c5 = camAt(5, BEAT.leaned + 10), [x, z] = groundAhead(c5, 1.55, -0.92); if (!kept(x, z, 0.3)) this.extraSage.push({ x, z, s: 0.4, yaw: 0.6 }); }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.13).translate(0, 0.065, 0), lam("atBrochure", () => ({ map: P.brochureTex(), side: THREE.DoubleSide })));
      const grp = new THREE.Group(); grp.position.set(1.2, 0.036, 1.3); grp.rotation.set(0, 0.5, 0); grp.add(m); this.g.add(grp); m.castShadow = true; m.receiveShadow = true; this.curbLeaf = m; } // audit A5 P2: on the plaza right of the couple - out of the shot-1 / 15 frames (it was half cut in their corners), whole in shots 5-6
    { const a = this.makeLizard(); this.lizC = a; a.grp.position.set(0.98, 0.004, 2.28); a.grp.rotation.y = 2.5; }
    // ---- shot 7: the research station right of the professor: MARKED CHIPS crate, a RESEARCH IN PROGRESS sandwich
    // board at the CRYSTAL head, orange survey flags ----
    { const p = tt([3.0, 0, 1.7]), m = M4(p[0], 0, p[2], -0.25), wood = lam("atCrateWood", () => ({ map: P.parkWood("#a8804e", false) })); // audit A3: out of the B frame
      tb(b, wood, m, -0.36, 0, -0.22, 0.36, 0.4, 0.22, 0.4);
      b.add(new THREE.BoxGeometry(0.66, 0.06, 0.4).translate(0, 0.43, 0), lam("atChipFill3", () => ({ map: P.chipPileTex() })), m);
      for (const [lbl, y] of [["MARKED", 0.29], ["CHIPS", 0.14]] as const) {
        const fp = V(0, y, 0.222).applyMatrix4(m), lm = new THREE.MeshBasicMaterial({ map: P.labelTex("mk" + lbl, lbl, "#e9dcc0", "#3a2414") }), me = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.13), lm);
        me.position.copy(fp); me.rotation.y = -0.25; me.layers.set(NOINK); this.g.add(me); this.faces.push({ mesh: me, mat: lm, n: V(0, 0, 1), gain: 0.95 }); }
      for (let i = 0; i < 7; i++) { const a = r() * TAU, d = 0.1 + r() * 0.2; this.extraChips.push({ x: p[0] + 0.5 + Math.cos(a) * d, z: p[2] + Math.sin(a) * d, s: 0.04 + r() * 0.03, sy: 0.025, y: 0.05, col: new THREE.Color(CC[i % 5]) }); } }
    { const p = tt([3.95, 0, -0.25]), m = M4(p[0], 0, p[2], -0.3), tex = P.smallSignTex("research", ["RESEARCH IN", "PROGRESS", "PLEASE STAY", "ON TRAIL"], 0.6, 0.62);
      for (const s of [1, -1]) { const t = new THREE.Matrix4().compose(V(0, 0.42, s * 0.13), new THREE.Quaternion().setFromEuler(new THREE.Euler(s * -0.3, s < 0 ? Math.PI : 0, 0)), V(1, 1, 1));
        b.add(new THREE.BoxGeometry(0.64, 0.86, 0.025), beam, m.clone().multiply(t));
        if (s > 0) { const fp = V(0, 0.06, 0.0135).applyMatrix4(m.clone().multiply(t)); this.face(tex, 0.6, 0.62, fp.x, fp.y, fp.z, -0.3, 0.95, -0.3); } } }
    { const wire = lam("atWire", () => ({ color: "#5a5a5a" }));
      for (const [dx, dz] of [[2.2, 0.15], [3.6, 0.6], [2.45, 1.45], [1.15, 0.9], [0.4, -0.5]] as const) { const [x, , z] = tt([dx, 0, dz]); if (kept(x, z, 0.05)) continue; cyl(b, wire, I, x, 0, z, 0.004, 0.004, 0.42, 4); this.pinFlags.push([x, 0.42, z]); } }
    // ---- shot 8: numbered tent markers beside the three insert chips, knee prints, a rope coil + mallet ----
    { const c8 = camAt(8, SHOTS[7].a + 2), yawC = Math.atan2(c8.pos[0] - c8.look[0], c8.pos[2] - c8.look[2]);
      ([[1.45, -0.35, "1"], [1.75, 0.3, "2"], [2.1, -0.05, "3"]] as const).forEach(([d, sx, n]) => {
        const [x0, z0] = groundAhead(c8, d, sx), x = x0 + 0.1 * Math.cos(yawC), z = z0 - 0.1 * Math.sin(yawC);
        const tm = new THREE.MeshBasicMaterial({ map: P.tentTex(n) }), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, yawC, 0, "YXZ"));
        const me = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.055).translate(0, 0.026, 0), tm); me.quaternion.copy(q); me.position.set(x, 0.035, z); me.layers.set(NOINK); this.g.add(me);
        this.faces.push({ mesh: me, mat: tm, n: V(0, 0, 1).applyQuaternion(q), gain: 1.0 });
        const bk = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.055).translate(0, 0.026, 0), lam("atTentBack", () => ({ color: "#e0b020", side: THREE.DoubleSide })));
        bk.quaternion.setFromEuler(new THREE.Euler(0.35, yawC, 0, "YXZ")); bk.position.set(x - 0.02 * Math.sin(yawC), 0.035, z - 0.02 * Math.cos(yawC)); bk.castShadow = true; this.g.add(bk);
      }); }
    { const dv = decal(P.divotTex(), "atDivotDecal");
      for (const [dx, dz] of [[0.72, -3.25], [1.0, -3.3], [-0.5, -6.65], [-0.2, -6.7]] as const) flat(dv, TT.base[0] + dx, TT.base[2] + dz, 0.14, 0.2, 0.3, 0.041); }
    { const p = tt([-1.5, 0, 0.62]) /* round 7 (audit A7 P2: tourist A planted his feet on it in shot 10): 0.55 m right */, rope = lam("atRope", () => ({ color: "#c9a96a" }));
      for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.15 - k * 0.012, 0.013, 6, 18).rotateX(Math.PI / 2).translate(p[0], 0.015 + k * 0.022, p[2]), rope);
      const mm = M4(p[0] + 0.32, 0.04, p[2] + 0.12, 0.8); b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6).rotateZ(Math.PI / 2), lam("atHandle", () => ({ color: "#e8b830" })), mm);
      b.add(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 10).translate(0.18, 0.0, 0), lam("atMallet", () => ({ color: "#7a5236" })), mm); }
    // ---- shot 9: a 1.6 MI plaque under the LONG LOGS name board; a marked chip near the lens bottom-right ----
    { const x = TT.base[0] + TT.signB.dx, z = TT.base[2] + TT.signB.z; // (round 5: under the taller LONG / LOGS plate)
      tb(b, beam, I, x - 0.2, 0.3, z - 0.02, x + 0.2, 0.46, z + 0.01, 0.5);
      this.face(P.smallSignTex("ll16", ["1.6 MI"], 0.36, 0.14), 0.36, 0.14, x, 0.38, z + 0.0115, 0, 0.92); }
    { const [x, z] = groundAhead(camAt(9, BEAT.many1 + 37), 3.75, 0.72); if (!kept(x, z, 0.05)) this.chipBase.push({ p: [x, 0, z], s: 0.11, yaw: 1.3, hideAt: Infinity, showAt: 0, dot: true }); }
    // ---- shot 13: the four chips under Sign B glint in the low sun ----
    for (const c of this.chipBase) if (c.showAt === -13) this.glints.push({ p: V(c.p[0], c.s * 0.8 + 0.03, c.p[2]), set: "trails13", n: 31 + Math.floor(c.s * 300), ph: c.yaw, size: 0.09 });
    // ---- shot 15: PARK CLOSES AT SUNSET on the kiosk's right post ----
    { const m = M4(-3.3, floorY(-3.3, -9.4), -9.4, 0.25), fp = V(0.75, 0.95, 0.075).applyMatrix4(m);
      tb(b, beam, m, 0.57, 0.83, 0.05, 0.93, 1.07, 0.07, 0.5);
      this.face(P.smallSignTex("closes", ["PARK CLOSES", "AT SUNSET"], 0.34, 0.22), 0.34, 0.22, fp.x, fp.y, fp.z, 0.25, 0.92); }
    // ---- extra wisps at ankle height across the plaza (shots 1, 5, 15) and between the shot-3 tourist and slice ----
    this.flyAway.visible = false; this.flyAway.castShadow = true; this.g.add(this.flyAway);
    this.wispQ.push(["trailhead", 0.4, 1.45, 6, 0.22, 0.02, 31, 23, 1.7], ["trailhead", 0.2, 2.45, 7, 0.26, -0.03, 27, 21, 3.9],
      ["vista", VISTA.pocketTourist[0] + 0.6, VISTA.pocketTourist[2] - 0.2, 5, 0.25, 0.5, 29, 19, 5.2], ["trails", TT.base[0] - 1.2, TT.base[2] + 4.4, 9, 0.28, 0, 33, 22, 0.4]);
  }
  /** round A3 dressing: the shot-7 research foreground (own group, shots 7-8 only), the shot-8 wide's empty foreground,
   *  shot-10 near-lens marked chips + litter, a shot-9 brochure box on Sign A, shot-1 / shot-2 build-up glints, shot-13
   *  backlit junipers + a near-lens sand wisp */
  private buildDressA3(b: Batch, b7: Batch) {
    const r = P.rng(7373);
    // ---- shot 7 (audit A3 P2: the bottom 28 % of the wide was bare paving) ----
    { const c7 = camAt(7, SHOTS[6].a + 3), at = (d: number, sx: number) => groundAhead(c7, d, sx);
      { const [x, z] = at(3.9, -0.5), m = M4(x, 0.032, z, 0.6), canvas = lam("atStoolCanvas", () => ({ color: "#6e7a3a" })), steel = lam("atSteel", () => ({ color: "#8a9096" }));
        for (const sg of [-1, 1]) for (const dz of [-0.13, 0.13]) b7.add(new THREE.CylinderGeometry(0.011, 0.011, 0.46, 6).rotateZ(sg * 0.62).translate(0, 0.19, dz), steel, m);
        bx(b7, canvas, m, 0, 0.38, 0, 0.32, 0.022, 0.28);
        const cs = lam("atCase", () => ({ color: "#8a7a5a" }));
        bx(b7, cs, m, 0.02, 0.435, 0, 0.18, 0.085, 0.12);                                                               // closed stopwatch case
        b7.add(new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI).translate(0.02, 0.478, 0), lam("atCaseHandle", () => ({ color: "#3a3028" })), m); }
      { const [x, z] = at(2.8, 0.52); this.bucket(b7, V(x, 0.03, z), "MARKED", -0.5, this.fg7); }
      for (const [d, sx] of [[3.75, -0.8], [4.35, 0.72]] as const) { const [x, z] = at(d, sx);
        b7.add(new THREE.CylinderGeometry(0.004, 0.004, 0.52, 4).translate(x, 0.29, z), lam("atWire", () => ({ color: "#5a5a5a" })));
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.085).translate(0.065, -0.042, 0), lam("atPinFlag", () => ({ color: "#f06a1e", side: THREE.DoubleSide })));
        fl.position.set(x, 0.55, z); fl.castShadow = true; this.fg7.add(fl); this.fg7Flags.push(fl); }
      // weeds in the plaza cracks, near-left corner (low soft framers)
      for (const [d, sx, s2] of [[2.45, -0.86, 0.27], [2.62, -0.72, 0.21], [2.36, -0.66, 0.17]] as const) { const [x, z] = at(d, sx); if (!kept(x, z, 0.1)) this.extraTufts.push({ x, z, s: s2, sy: s2 * 0.9, y: 0.03, col: new THREE.Color("#f2e6cc") }); }
      for (let i = 0; i < 40; i++) { const [x, z] = at(2.3 + r() * 2.8, (r() - 0.5) * 2.2), s2 = 0.012 + r() ** 2 * 0.03; if (!kept(x, z, 0.03)) this.extraPeb.push({ x, z, s: s2, sy: s2 * 0.6, y: 0.034, col: new THREE.Color(["#e7d6bc", "#c9b49a", "#9c6e4e", "#d8c3a6"][i % 4]) }); } }
    // ---- shot 8 (audit A3 P2: the wide's bottom 35 % was bare sand with four dark shrubs): clumped tufts, sage, rocks,
    // rainbow chips, crack decals, two survey flags ----
    { const f8 = BEAT.swapping + 4, c8 = camAt(8, f8);
      this.dressLens(8, f8, 2.3, 6.8, 260, 812, { tufts: 11, sage: 3, rocks: 4, chips: 5, cracks: 3 });
      const wire = lam("atWire", () => ({ color: "#5a5a5a" }));
      for (const [d, sx] of [[3.3, -0.45], [4.1, 0.5]] as const) { const [x, z] = groundAhead(c8, d, sx); if (kept(x, z, 0.05)) continue; cyl(b, wire, new THREE.Matrix4(), x, 0, z, 0.004, 0.004, 0.42, 4); this.pinFlags.push([x, 0.42, z]); } }
    // ---- shot 10 (audit A3 P2): white-dotted chips with contact blobs 1.5-2.5 m from the A and B hold lenses, a dropped
    // park map and a water bottle on the plaza ----
    for (const [f, list] of [[BEAT.pleaseA + 20, [[1.7, -0.34], [2.25, 0.44]]], [BEAT.many2 + 25, [[1.85, 0.3], [2.4, -0.46]]]] as const) {
      const c = camAt(10, f);
      for (const [d, sx] of list) { const [x, z] = groundAhead(c, d, sx); if (kept(x, z, 0.06)) continue;
        this.chipBase.push({ p: [x, 0, z], s: 0.085 + r() * 0.02, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true }); this.blobs.push([x, z, 0.3, 0.22, r() * 3]); } }
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.17), lam("atBrochure", () => ({ map: P.brochureTex(), side: THREE.DoubleSide })));
      m.rotation.set(-Math.PI / 2 + 0.05, 0, -0.6); m.position.set(...tt([-1.35, 0.042, 2.75])); m.receiveShadow = true; m.castShadow = true; this.g.add(m);
      /* audit A4 P3: the blue bottle at tt(-0.95, 3.25) read as litter in the B wide: removed */ }
    // ---- shot 9: a brochure box on Sign A's left post, two flyers flapping out of it ----
    { const x = TT.base[0] + TT.signA.dx - 0.38 - 0.13, y = 1.18, z = TT.base[2] + TT.signA.z - 0.06, box = lam("atBroBox", () => ({ color: "#5d5852" }));
      tb(b, box, new THREE.Matrix4(), x - 0.09, y - 0.13, z - 0.06, x + 0.09, y + 0.13, z + 0.07, 0.5);
      tb(b, box, new THREE.Matrix4(), x - 0.1, y + 0.13, z - 0.07, x + 0.1, y + 0.15, z + 0.09, 0.5);
      for (const [dx, rot] of [[-0.03, 0.05], [0.035, -0.08]] as const) {
        const grp = new THREE.Group(); grp.position.set(x + dx, y + 0.1, z + 0.075); grp.rotation.z = rot; this.g.add(grp);
        const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15).translate(0, 0.075, 0), lam("atFlyer", () => ({ map: P.brochureTex(), side: THREE.DoubleSide })));
        fm.castShadow = true; grp.add(fm); this.flyers.push(fm); } }
    // ---- shot 1 (audit A3 ADD): three small chips round the sparkly rock that glint in turn just before the hero glint ----
    [[0.32, 0.18], [-0.26, 0.22], [0.12, -0.3]].forEach(([dx, dz], i) => {
      const x = TH.glintRock[0] + dx, z = TH.glintRock[2] + dz;
      if (!kept(x, z, 0.01)) this.extraChips.push({ x, z, s: 0.022, sy: 0.012, y: 0.036, col: new THREE.Color(["#f2c64a", "#c84a3a", "#8a5aa8"][i]) });
      this.preGlints.push({ p: V(x, 0.06, z), at: BEAT.wanted - 2 + i * 5 }); });
    // ---- shot 2 (audit A3 ADD): dim rainbow glints on loose chips in the crane's rising foreground ----
    { const c2 = camAt(2, PW(3, "Petrified") + 4), CC = ["#c84a3a", "#f2c64a", "#8a5aa8"];
      [[4.6, -0.42], [5.6, 0.36], [6.8, -0.1]].forEach(([d, sx], i) => { const [x, z] = groundAhead(c2, d, sx); if (kept(x, z, 0.05)) return;
        this.extraChips.push({ x, z, s: 0.06, sy: 0.035, y: floorY(x, z) + 0.012, col: new THREE.Color(CC[i]) });
        this.glints.push({ p: V(x, floorY(x, z) + 0.05, z), set: "vista", n: 41 + i * 6, ph: 0.18 + i * 0.27, size: 0.16 }); }); }
    // ---- shots 7-8 (audit A3 ADD): a plain white park pickup behind the CRYSTAL head, two spare panels strapped in the bed ----
    { const [px, , pz] = tt([8.6, 0, -7.6]), yaw = Math.PI / 2 + 0.35;
      this.vehicle(b, px, pz, yaw, 5.2, 1.95, 1.75, "#ece8de", "#5e7a4a", 0);
      const m = M4(px, 0, pz, yaw), back = lam("atPanelBack", () => ({ map: P.weatheredWood("#7a5234") })), strap = lam("atStrap", () => ({ color: "#d8a020" }));
      for (const k of [0, 1]) b.add(new THREE.BoxGeometry(0.92, 0.92, 0.03).rotateZ(0.18).translate(-1.35 + k * 0.08, 1.55, -0.2 + k * 0.38).rotateY(Math.PI / 2), back, m);
      b.add(new THREE.BoxGeometry(0.03, 0.05, 1.7).translate(-1.3, 1.62, 0), strap, m); }
    for (const [dx, dz, s0] of [[-1.1, 3.0, 0.2], [-1.0, 3.08, 0.16], [1.45, 3.9, 0.22], [-2.0, 4.4, 0.18], [0.65, 4.6, 0.17], [-0.1, 2.15, 0.15]] as const) {
      const [x, , z] = tt([dx, 0, dz]); if (!kept(x, z, 0.08)) this.extraTufts.push({ x, z, s: s0, sy: s0 * 0.85, y: 0.032, col: new THREE.Color("#eadcc0") }); }
    // ---- shot 13 (audit A3 P2): two junipers behind Sign B (backlit rims), a low gold sand wisp near the lens ----
    this.extraJun.push({ x: tt([-1.65, 0, -6.4])[0], z: tt([-1.65, 0, -6.4])[2], s: 1.8 }, { x: tt([5.2, 0, -5.4])[0], z: tt([5.2, 0, -5.4])[2], s: 1.95 });
    { const c13 = camAt(13, BEAT.thieves), [x, z] = groundAhead(c13, 2.6, 0); this.wispQ.push(["trails", x, z, 7, 0.24, Math.atan2(c13.pos[0] - c13.look[0], c13.pos[2] - c13.look[2]), 31, 23, 2.6]); }
  }
  /** round A4 dressing. P1: the shot 9/10 two-sign diptych had 30-40 % plain ground and nothing between the lens and the
   *  signs: a low rope barrier along the plaza's front edge (posts every 1.5 m, placed so none stands in the shot-10
   *  crowd frame), two sagebrush framers rising into the frame bottom, dry tufts, a log slice standing on edge with its
   *  rainbow face to the lens, 12 white-dotted chips across the visible plaza band, contact shadows (the rope + framers
   *  are a group shown in shots 9-10 only: the shot-7 orbit and the shot-13 low wide pass right over that edge).
   *  P2 shot 2: a paved spur (+ gravel edges, low rail on its far side) from a small viewpoint pad in the crane's
   *  lower-right foreground to an apron in front of the PETRIFIED FOREST sign; log fragments, chip clusters, cracked mud,
   *  a STAY ON TRAIL post, a lizard on a rock. Shot 10: weeds in a plaza crack + chips in the B wide (the litter bottle
   *  is gone). Extras: JASPER 0.8 MI plate, a fountain at the LONG LOGS head, Sign B brochure box, CRYSTAL 0.8 MI +
   *  STAY ON TRAIL posts by the professor, a TRAIL OPEN sub-plaque under the warning board, prints to the glint rock */
  private buildDressA4(b: Batch) {
    const r = P.rng(8484), I = new THREE.Matrix4(), post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#d8683c", "#b85a6a"], TC = ["#ffffff", "#f2e6cc", "#e4ead8", "#fff0d8", "#eadcc0"];
    const ps = (bb: Batch, x: number, z: number, yaw: number, tex: THREE.Texture, w: number, h: number, top: number) => {
      const m = M4(x, floorY(x, z), z, yaw); tb(bb, post, m, -0.05, 0, -0.1, 0.05, top, -0.02, 0.5);
      tb(bb, beam, m, -w / 2 - 0.02, top - h - 0.02, -0.02, w / 2 + 0.02, top + 0.02, 0.01, 0.5);
      const p = V(0, top - h / 2, 0.0115).applyMatrix4(m); return this.face(tex, w, h, p.x, p.y, p.z, yaw, 0.92); };
    // ---------------- P1: the diptych foreground ----------------
    { const c = camAt(9, SHOTS[8].b - 3), bt = new Batch(), at = (d: number, sx: number) => groundAhead(c, d, sx);
      const rope = lam("atRope", () => ({ color: "#c9a96a" })), ropeZ = TT.base[2] + 5.2, xs = [-3.55, -2.05, -0.55, 0.95, 2.45].map((dx) => TT.base[0] + dx);
      const tops: THREE.Vector3[] = [];
      xs.forEach((x, i) => { const z = ropeZ + 0.03 * Math.sin(i * 1.7);
        cyl(bt, post, I, x, 0.032, z, 0.045, 0.04, 0.5, 8); bt.add(new THREE.SphereGeometry(0.05, 8, 6).translate(x, 0.54, z), post);
        tops.push(V(x, 0.47, z)); this.twoBlobs.push([x, z, 0.34, 0.26, 0.3 * i]); });
      for (let i = 1; i < tops.length; i++) { const a = tops[i - 1], e = tops[i]; let q = a.clone(); // a sagging rope: 6 short tubes on a parabola
        for (let k = 1; k <= 6; k++) { const u = k / 6, p = a.clone().lerp(e, u); p.y -= 0.09 * 4 * u * (1 - u); tube(bt, rope, q, p, 0.012); q = p; } }
      bt.build(this.two9);
      for (const [d, sx, s] of [[3.12, -0.5, 0.58], [3.2, 0.52, 0.52]] as const) { const [x, z] = at(d, sx); if (kept(x, z, 0.3)) continue;
        this.two9Sage.push({ x, z, s, yaw: r() * TAU }); this.twoBlobs.push([x, z, s * 1.7, s * 1.3, r() * 3]);
        for (let k = 0; k < 4; k++) { const a = r() * TAU, dd = s * (0.55 + 0.5 * r()); this.two9Tufts.push({ x: x + Math.cos(a) * dd, z: z + Math.sin(a) * dd, s: 0.24 + 0.12 * r(), sy: 0.22 + 0.14 * r(), y: 0.03, col: new THREE.Color(TC[k % TC.length]) }); } }
      for (let i = 0; i < 6; i++) { const [x, z] = at(3.0 + r() * 0.45, (r() - 0.5) * 2); if (!kept(x, z, 0.1)) this.two9Tufts.push({ x, z, s: 0.2 + 0.12 * r(), sy: 0.18 + 0.12 * r(), y: 0.03, col: new THREE.Color(TC[i % TC.length]) }); }
      // round 6 (carry-over: the red slice at (3.85, -0.82) read as a no-entry disc): a sage clump there instead, plus the
      // two sage framers rising into the diptych's bottom corners
      for (const [d, sx, s0] of [[3.85, -0.82, 0.46], [4.2, -0.55, 0.5], [4.4, 0.6, 0.52]] as const) { const [x, z] = at(d, sx); if (kept(x, z, 0.3)) continue;
        this.two9Sage.push({ x, z, s: s0, yaw: d * 2.7 + sx }); this.twoBlobs.push([x, z, s0 * 1.7, s0 * 1.3, d]);
        for (let k = 0; k < 3; k++) { const a = r() * TAU, dd = s0 * (0.6 + 0.5 * r()); this.two9Tufts.push({ x: x + Math.cos(a) * dd, z: z + Math.sin(a) * dd, s: 0.22 + 0.12 * r(), sy: 0.2 + 0.14 * r(), y: 0.03, col: new THREE.Color(TC[k % TC.length]) }); } }
      // 12 white-dotted marked chips across the visible plaza band (d 3.6-6.6), clear of the readers
      for (let i = 0, n = 0; i < 40 && n < 12; i++) { const [x, z] = at(3.6 + r() * 3.0, (r() - 0.5) * 1.8); if (kept(x, z, 0.12)) continue;
        this.chipBase.push({ p: [x, 0, z], s: 0.075 + r() * 0.03, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true }); this.blobs.push([x, z, 0.2, 0.15, r() * 3]); n++; }
      // a hairline crack with weeds in the plaza (shot-10 B wide foreground) and a few more marked chips there
      { const cB = camAt(10, BEAT.many2 + 25), [x0, z0] = groundAhead(cB, 3.4, -0.3), [x1, z1] = groundAhead(cB, 3.0, 0.6);
        this.cracks.push([(x0 + x1) / 2, (z0 + z1) / 2, 1.3, -Math.atan2(z1 - z0, x1 - x0), 1]);
        for (let k = 0; k < 7; k++) { const u = k / 6, x = lerp(x0, x1, u) + (r() - 0.5) * 0.1, z = lerp(z0, z1, u) + (r() - 0.5) * 0.1; if (!kept(x, z, 0.1)) this.extraTufts.push({ x, z, s: 0.16 + 0.1 * r(), sy: 0.14 + 0.12 * r(), y: 0.032, col: new THREE.Color(TC[k % TC.length]) }); }
        for (const [d, sx] of [[3.6, -0.75], [4.2, 0.62], [3.9, 0.05]] as const) { const [x, z] = groundAhead(cB, d, sx); if (!kept(x, z, 0.08)) { this.chipBase.push({ p: [x, 0, z], s: 0.07 + r() * 0.02, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true }); this.blobs.push([x, z, 0.2, 0.15, r() * 3]); } } }
      // the midground: JASPER 0.8 MI under the JASPER plate (pairs LONG LOGS 1.6 MI), a fountain + its drain at the LONG
      // LOGS head (left of Sign B), a brochure box on Sign B's left post, a lizard on Sign B's right footing
      { const x = TT.base[0] + TT.signA.dx, z = TT.base[2] + TT.signA.z; tb(b, beam, I, x - 0.2, 0.47, z - 0.02, x + 0.2, 0.63, z + 0.01, 0.5);
        this.face(P.smallSignTex("ja08", ["0.8 MI"], 0.36, 0.14), 0.36, 0.14, x, 0.55, z + 0.0115, 0, 0.92); }
      { const [fx, , fz] = tt([-1.6, 0, -1.3]), m = M4(fx, 0, fz, 0.2), metal = lam("atMetalGrey", () => ({ color: "#6d7378" }));
        cyl(b, lam("atStoneTan", () => ({ map: P.rockHD(), color: new THREE.Color(0.95, 0.8, 0.66) })), m, 0, 0, 0, 0.16, 0.13, 0.82, 12);
        cyl(b, metal, m, 0, 0.82, 0, 0.2, 0.2, 0.07, 14); cyl(b, metal, m, 0.06, 0.86, 0, 0.015, 0.015, 0.06, 6);
        this.blobs.push([fx, fz, 0.6, 0.5, 0.2]); this.cracks.push([fx + 0.1, fz + 0.45, 0.7, 0.4, 0]); }
      { const x = TT.base[0] + TT.signB.dx - 0.38 - 0.13, y = 1.18, z = TT.base[2] + TT.signB.z - 0.06, box = lam("atBroBox", () => ({ color: "#5d5852" }));
        tb(b, box, I, x - 0.09, y - 0.13, z - 0.06, x + 0.09, y + 0.13, z + 0.07, 0.5); tb(b, box, I, x - 0.1, y + 0.13, z - 0.07, x + 0.1, y + 0.15, z + 0.09, 0.5);
        const grp = new THREE.Group(); grp.position.set(x + 0.02, y + 0.1, z + 0.075); grp.rotation.z = -0.05; this.g.add(grp);
        const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15).translate(0, 0.075, 0), lam("atFlyer", () => ({ map: P.brochureTex(), side: THREE.DoubleSide }))); fm.castShadow = true; grp.add(fm); this.flyers.push(fm); }
      { const a = this.makeLizard(); this.lizB = a; a.grp.position.set(TT.base[0] + TT.signB.dx + 0.38 + 0.02, 0.115, TT.base[2] + TT.signB.z - 0.05); a.grp.rotation.y = -2.4; }
    }
    // ---------------- P2 shot 2: the spur, the pad, the foreground ----------------
    { const asphV = lam("atAsphaltVista", () => ({ map: P.asphaltHD(), color: new THREE.Color(1.0, 1.15, 1.34) })), gravel = lam("atGravelEdge", () => ({ map: P.gravelEdgeHD() }));
      this.ribbon(b, SPUR, 2.0, asphV, 0.03);
      for (const sd of [-1, 1]) this.ribbon(b, offsetLine(SPUR, sd * 1.18), 0.36, gravel, 0.024);
      const disc = (cx: number, cz: number, R: number) => { const g = new THREE.CircleGeometry(R, 28).rotateX(-Math.PI / 2), pa = g.attributes.position as THREE.BufferAttribute, ua = g.attributes.uv as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) { const x = pa.getX(i) + cx, z = pa.getZ(i) + cz; pa.setXYZ(i, x, floorY(x, z) + 0.031, z); ua.setXY(i, x / 2.2, -z / 2.2); } b.add(g, asphV);
        const ring = new THREE.RingGeometry(R, R + 0.3, 28).rotateX(-Math.PI / 2), pr = ring.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pr.count; i++) { const x = pr.getX(i) + cx, z = pr.getZ(i) + cz; pr.setXYZ(i, x, floorY(x, z) + 0.025, z); } b.add(ring, gravel); };
      disc(SPUR_PAD[0], SPUR_PAD[1], 1.7);
      { const [ex, ez, yaw] = this.entrance, fx = ex + Math.sin(yaw) * 1.5, fz = ez + Math.cos(yaw) * 1.5; disc(fx, fz, 1.6); }
      // the low rail on the spur's far side (away from the crane), posts every 2.5 m
      { const c2 = camAt(2, SHOTS[1].b - 3), mid = SPUR[Math.floor(SPUR.length / 2)], a = SPUR[Math.floor(SPUR.length / 2) - 1], dx = mid[0] - a[0], dz = mid[1] - a[1], n = Math.hypot(dx, dz) || 1;
        const nx = dz / n, nz = -dx / n, side = (mid[0] + nx - c2.pos[0]) ** 2 + (mid[1] + nz - c2.pos[2]) ** 2 > (mid[0] - nx - c2.pos[0]) ** 2 + (mid[1] - nz - c2.pos[2]) ** 2 ? -1 : 1;
        this.rail(b, SPUR, side, 1.42, 2.2, 13.5, 1.2); }
      // the pad: a bench facing the badlands, a STAY ON TRAIL post, a small LONG LOGS 0.6 MI marker
      { const [px, pz] = SPUR_PAD, c2 = camAt(2, SHOTS[1].b - 3), yawB = Math.atan2(px - c2.pos[0], pz - c2.pos[2]) + Math.PI;
        this.bench(b, px - 0.2, pz - 0.6, yawB + 0.6);
        ps(b, px + 1.55, pz + 0.9, Math.atan2(c2.pos[0] - (px + 1.55), c2.pos[2] - (pz + 0.9)), P.smallSignTex("stayPad", ["PLEASE", "STAY ON", "TRAIL"], 0.42, 0.42), 0.42, 0.42, 1.05);
        this.blobs.push([px + 1.55, pz + 0.9, 0.5, 0.4, 0.3], [px - 0.2, pz - 0.6, 2.0, 0.8, yawB + 0.6]); }
      // foreground (crane end, d 7-16): log fragment clusters, chips, tufts, cracked mud, a lizard on a rock
      const c = camAt(2, SHOTS[1].b - 3), at = (d: number, sx: number) => groundAhead(c, d, sx);
      const bark = lam("atBark", () => ({ map: P.barkHD() }));
      for (const [d, sx] of [[8.2, -0.45], [10.6, 0.12], [12.8, -0.72]] as const) { const [x, z] = at(d, sx); if (spurD(x, z) < 0.6 || paveD(x, z) < 0.6) continue;
        for (let k = 0; k < 3; k++) { // broken log pieces (small slices / bark chunks) lying about
          const a = r() * TAU, dd = r() * 0.9, px = x + Math.cos(a) * dd, pz = z + Math.sin(a) * dd, R = 0.12 + r() * 0.12, NA = 12, rad = Array.from({ length: NA }, (_, i) => R * (1 + 0.12 * Math.sin(2 * i + k)));
          const { side, cap } = sliceGeo(rad, 0.1 + r() * 0.18, [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3], [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3]);
          const m = new THREE.Matrix4().compose(V(px, floorY(px, pz) + R * 0.6, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * TAU, r() * TAU, (r() - 0.5) * 0.6)), V(1, 1, 1));
          b.add(side, bark, m); b.add(cap, jasM(k % 4), m); this.blobs.push([px, pz, R * 3, R * 2.2, r() * 3]); }
        for (let k = 0; k < 9; k++) { const a = r() * TAU, dd = 0.2 + r() * 1.2, px = x + Math.cos(a) * dd, pz = z + Math.sin(a) * dd, s = 0.03 + r() * 0.06;
          this.extraChips.push({ x: px, z: pz, s, sy: s * 0.55, y: floorY(px, pz) + s * 0.2, col: new THREE.Color(CC[k % CC.length]) });
          if (k < 2) this.glints.push({ p: V(px, floorY(px, pz) + s * 0.8, pz), set: "vista", n: 37 + k * 11 + Math.floor(d), ph: r(), size: 0.12 }); } }
      for (let i = 0; i < 14; i++) { const [x, z] = at(7 + r() * 9, (r() - 0.5) * 2.2); if (spurD(x, z) < 0.4 || !free(x, z, 0.15, 0.4, 0.1)) continue; // dry tuft clumps
        for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) { const a = r() * TAU, dd = k ? 0.12 + r() * 0.3 : 0; this.extraTufts.push({ x: x + Math.cos(a) * dd, z: z + Math.sin(a) * dd, s: 0.3 + r() * 0.2, sy: 0.28 + r() * 0.26, col: new THREE.Color(TC[k % TC.length]) }); } }
      for (let i = 0; i < 5; i++) { const [x, z] = at(7.5 + r() * 8, (r() - 0.5) * 2); if (spurD(x, z) > 0.5) this.cracks.push([x, z, 1.4 + r() * 1.4, r() * TAU, 0]); } // cracked-mud patches
      { const [x, z] = at(9.4, -0.12), s = 0.2; if (spurD(x, z) > 0.5 && !kept(x, z, 0.3)) { // a lizard on a flat rock
        this.extraRocks.push({ x, z, s, sy: s * 0.55, col: new THREE.Color("#b7967e"), y: floorY(x, z) - s * 0.15 }); this.blobs.push([x, z, s * 2.8, s * 2.1, 0.4]);
        const a = this.makeLizard(); this.lizV2 = a; a.grp.position.set(x, floorY(x, z) + s * 0.55 * 0.85 - s * 0.15 + 0.012, z); a.grp.rotation.y = Math.atan2(-(c.pos[2] - z), c.pos[0] - x) + 1.2; a.grp.scale.setScalar(1.6); } }
    }
    // ---------------- extras ----------------
    // shot 7: CRYSTAL 0.8 MI + a low STAY ON TRAIL marker beside the CRYSTAL plate (in the orbit's left third)
    { const x = TT.base[0] + CRYSTAL_X + CRY.dx, z = TT.base[2] + 0.35; tb(this.bCryS, beam, I, x - 0.24, 0.47, z - 0.02, x + 0.24, 0.63, z + 0.01, 0.5);
      const fc = this.face(P.smallSignTex("cr08", ["0.8 MI"], 0.4, 0.14), 0.4, 0.14, x, 0.55, z + 0.0115, 0, 0.92); this.crySign.add(fc.mesh);
      const p = tt([CRYSTAL_X + 0.62, 0, 0.55]); if (!kept(p[0], p[2], 0.2)) { const f2 = ps(this.bCry, p[0], p[2], -0.35, P.smallSignTex("stayCr", ["STAY ON", "TRAIL"], 0.3, 0.2), 0.3, 0.2, 0.62); this.cryGrp.add(f2.mesh); this.blobs.push([p[0], p[2], 0.3, 0.24, 0]); } }
    // shot 7: a lizard on the MARKED CHIPS crate rim (push-ups on "psychologist", then a head turn to the professor)
    { const p = tt([3.0, 0, 1.7]), a = this.makeLizard(); this.lizCr = a; this.fg7.add(a.grp); a.grp.position.set(p[0] - 0.18, 0.465, p[2] + 0.1); a.grp.rotation.y = 0.9; a.grp.scale.setScalar(1.4); }
    // shot 1 / 16: a TRAIL OPEN sub-plaque hanging on two short chains under the board's right side (it swings with the
    // gusts on the loop clock: frame 0 = frame 1857)
    { const B = TH.board, x = 0.72, y = B.cy - B.h / 2 - 0.07, grp = new THREE.Group(); grp.position.set(x, y, B.z + 0.012); this.g.add(grp);
      const iron = lam("atIron", () => ({ color: "#3e4246" }));
      for (const dx of [-0.13, 0.13]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 5).translate(dx, -0.05, 0), iron); ch.castShadow = true; grp.add(ch); }
      const pb = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.02).translate(0, -0.165, -0.011), beam); pb.castShadow = true; pb.receiveShadow = true; grp.add(pb);
      const mat = new THREE.MeshBasicMaterial({ map: P.smallSignTex("trailOpen", ["TRAIL OPEN"], 0.33, 0.1) }), fm = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.1).translate(0, -0.165, 0.0005), mat);
      fm.layers.set(NOINK); grp.add(fm); this.faces.push({ mesh: fm, mat, n: V(0, 0, 1), gain: 0.92 }); this.openPlate = grp; this.openMat = mat; }
    // shot 1: a trail of dusty prints across the plaza to the glint rock (others pocketed pieces here)
    { const fm = lam("atFeetDecal", () => ({ map: P.footprintTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      const a = V(1.75, 0, 2.15), e = V(TH.glintRock[0] + 0.18, 0, TH.glintRock[2] + 0.22), d = e.clone().sub(a), L = d.length();
      const me = new THREE.Mesh(new THREE.PlaneGeometry(0.4, L).rotateX(-Math.PI / 2).rotateY(Math.atan2(d.x, d.z)).translate((a.x + e.x) / 2, 0.0372, (a.z + e.z) / 2), fm);
      me.layers.set(NOINK); me.renderOrder = 1; me.receiveShadow = true; this.g.add(me); }
  }
  /** round A5 dressing: the shot-8 wide's bare lower third (sage, pebbles, white-dotted chips, a dropped TALLY sheet
   *  under a stone, a rope-barrier stake), shot-7 sagebrush (one a lower-left framer), a juniper behind the MARKED
   *  CHIPS crate and a prickly pear by the CRYSTAL plate, shot-5 foreground (a half-buried chip that glints on "ours",
   *  dry tufts in both lower corners) */
  private buildDressA5(b: Batch) {
    const r = P.rng(9595), I = new THREE.Matrix4(), post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) }));
    // ---- shot 8 (audit A5 P2: the wide's lower 30-35 % was bare paving): everything below y ~1520 of the 1080 frame ----
    { const c8 = camAt(8, BEAT.trails + 9), at = (d: number, sx: number) => groundAhead(c8, d, sx);
      for (const [d, sx, s0] of [[3.7, -0.72, 0.5], [4.0, 0.52, 0.44], [4.5, -0.15, 0.4]] as const) { const [x, z] = at(d, sx);
        if (!kept(x, z, 0.3) && paveD(x, z) > -9) { this.extraSage.push({ x, z, s: s0, yaw: d * 1.7 }); this.blobs.push([x, z, s0 * 1.6, s0 * 1.2, d]); } }
      for (let i = 0; i < 14; i++) { const [x, z] = at(3.4 + r() * 1.8, (r() - 0.5) * 1.7), s2 = 0.014 + r() ** 2 * 0.035;
        if (!kept(x, z, 0.03)) this.extraPeb.push({ x, z, s: s2, sy: s2 * 0.6, y: floorY(x, z) + 0.032, col: new THREE.Color(["#e7d6bc", "#c9b49a", "#9c6e4e", "#d8c3a6"][i % 4]) }); }
      for (const [d, sx] of [[3.6, 0.2], [4.1, -0.45], [4.7, 0.35], [3.9, 0.78]] as const) { const [x, z] = at(d, sx);
        if (!kept(x, z, 0.06)) { this.chipBase.push({ p: [x, 0, z], s: 0.07 + r() * 0.02, yaw: r() * 6, hideAt: Infinity, showAt: 0, dot: true }); this.blobs.push([x, z, 0.2, 0.15, r() * 3]); } }
      { const [x, z] = at(4.25, 0.08), sh = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), lam("atTally", () => ({ map: P.tallyTex(), side: THREE.DoubleSide })));
        sh.rotation.set(-Math.PI / 2 + 0.03, 0, 0.7); sh.position.set(x, floorY(x, z) + 0.038, z); sh.receiveShadow = true; this.g.add(sh);
        this.extraRocks.push({ x: x + 0.04, z: z - 0.05, s: 0.045, sy: 0.03, col: new THREE.Color("#b08a72"), y: floorY(x, z) + 0.035 }); this.blobs.push([x, z, 0.34, 0.4, 0.7]); }
      { const [x, z] = at(4.8, 0.82), y0 = floorY(x, z) + 0.03, rope = lam("atRope", () => ({ color: "#c9a96a" }));
        cyl(b, post, I, x, y0, z, 0.045, 0.04, 0.55, 8); b.add(new THREE.SphereGeometry(0.05, 8, 6).translate(x, y0 + 0.59, z), post);
        tube(b, rope, V(x, y0 + 0.5, z), V(x - 0.45, y0 + 0.02, z + 0.3), 0.012); this.blobs.push([x, z, 0.3, 0.24, 0]); } }
    // ---- shot 7 (audit A5 P3: no sagebrush or juniper: a research yard, not a park) ----
    { const c7 = camAt(7, CUE.psych + 3), at = (d: number, sx: number) => groundAhead(c7, d, sx);
      for (const [d, sx, s0] of [[1.75, -0.92, 0.55], [2.9, 0.84, 0.46], [3.7, -0.74, 0.42], [4.7, 0.7, 0.5]] as const) { const [x, z] = at(d, sx); if (!kept(x, z, 0.25)) this.extraSage.push({ x, z, s: s0, yaw: d * 2.3 }); }
      { const [x, , z] = tt([4.4, 0, 0.2]); this.extraJunA.push({ x, z, s: 1.45 }); this.blobs.push([x, z, 1.6, 1.1, 0.4]); }
      { const [px, , pz] = tt([1.25, 0, 0.8]), pad = lam("atPearPad", () => ({ map: P.pearPadTex(), emissive: new THREE.Color(0.1, 0.13, 0.06), emissiveMap: P.pearPadTex() }));
        for (const [dx, dy, dz, rx, rz, sc] of [[0, 0.17, 0, 0.1, 0.15, 1], [0.12, 0.36, 0.02, -0.2, -0.5, 0.8], [-0.11, 0.33, -0.02, 0.15, 0.55, 0.75], [0.03, 0.5, 0, 0, 0.1, 0.62], [0.2, 0.12, 0.08, 0.3, -1.1, 0.7]] as const)
          b.add(new THREE.SphereGeometry(1, 12, 8).scale(0.13 * sc, 0.17 * sc, 0.035 * sc).rotateX(rx).rotateZ(rz).translate(px + dx, dy, pz + dz), pad);
        this.blobs.push([px, pz, 0.6, 0.45, 0.3]); } }
    // ---- shot 9 (audit A5 ADD: warm accents between the signs, not just chips): a yucca rosette with a dried flower
    // stalk between Sign A and Sign B, rabbitbrush clumps with golden flower tufts along the sign line ----
    { const yM = lam("atYucca", () => ({ map: P.yuccaLeafTex(), emissive: new THREE.Color(0.05, 0.07, 0.035), emissiveMap: P.yuccaLeafTex() })), stalk = lam("atYuccaStalk", () => ({ color: "#9c7e56" }));
      const bell = lam("atYuccaBell", () => ({ color: "#efe6c8", emissive: new THREE.Color(0.12, 0.11, 0.08) }));
      for (const [dx, dz, sc, yaw, st] of [[-1.55, -1.4, 1.05, 0.4, 1], [3.95, -1.3, 0.8, 1.9, 0], [-4.75, -1.6, 0.75, 2.6, 0]] as const) {
        const [x, , z] = tt([dx, 0, dz]); if (kept(x, z, 0.4)) continue;
        b.add(yuccaGeo(700 + Math.round(dx * 10)), yM, M4(x, floorY(x, z), z, yaw, sc));
        this.blobs.push([x, z, 0.9 * sc, 0.75 * sc, yaw]);
        if (st) { const y0 = floorY(x, z) + 0.15, H = 1.25, lean = 0.06;
          tube(b, stalk, V(x, y0, z), V(x + lean, y0 + H, z - 0.02), 0.014);
          for (let k = 0; k < 9; k++) { const t = 0.62 + 0.38 * (k / 8), a = k * 2.1; b.add(new THREE.SphereGeometry(0.028, 8, 6).scale(1, 1.25, 1).translate(x + lean * t + Math.cos(a) * 0.045, y0 + H * t, z - 0.02 * t + Math.sin(a) * 0.045), bell); } } }
      const rb: { x: number; z: number; s: number; yaw?: number }[] = [];
      for (const [dx, dz, s0] of [[-2.25, -1.15, 0.52], [-0.95, -1.6, 0.46], [1.3, -1.3, 0.5], [-4.25, -1.05, 0.44], [2.25, -2.6, 0.4], [-2.7, -3.1, 0.38]] as const) {
        const [x, , z] = tt([dx, 0, dz]); if (!kept(x, z, 0.3)) { rb.push({ x, z, s: s0, yaw: dx * 1.9 }); this.blobs.push([x, z, s0 * 1.5, s0 * 1.1, dx]); } }
      this.inst(sageCardGeo(77), foliM("rabbit", P.rabbitTex, [0.12, 0.11, 0.04]), rb, 0.05, true, 0.04); }
    // ---- shot 5 (audit A5 P3: an empty sand band along the bottom) ----
    { const c5 = camAt(5, BEAT.leaned + 10), at = (d: number, sx: number) => groundAhead(c5, d, sx);
      { const [x, z] = at(3.35, 0.3); this.extraChips.push({ x, z, s: 0.055, sy: 0.022, y: floorY(x, z) + 0.004, col: new THREE.Color("#d0503c") }); this.ch5 = { p: V(x, 0.045, z), at: PW(10, "ours") }; }
      for (const [d, sx, s0] of [[3.0, 0.8, 0.3], [3.15, 0.68, 0.24], [2.95, -0.74, 0.27], [3.1, -0.86, 0.2]] as const) { const [x, z] = at(d, sx); if (!kept(x, z, 0.1)) this.extraTufts.push({ x, z, s: s0, sy: s0 * 0.9, col: new THREE.Color("#f2e6cc") }); } }
  }
  /** round 5b dressing (audit A5 ADD / P3): shot 2 - a wayside panel PLEASE DO NOT REMOVE PETRIFIED WOOD beside the
   *  first (hero) log, a cholla, a prickly pear and a juniper in the mid ground, a far white park pickup on a dirt
   *  track trailing a dust plume; shot 4 - a pebble cairn, a crushed paper cup and chips along the curb in the low
   *  wide's empty lower right; shot 6 - a half-buried chip at the right post footing that catches the low sun; shot 13 -
   *  a TRAIL CLOSES AT SUNSET plate under the STAY ON TRAIL sign; shots 7-9 - a morning ground-mist band at the feet of
   *  the far mesas; shot 15 - a thin pink-lit contrail */
  private buildDressA5b(b: Batch) {
    const r = P.rng(5353);
    const post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const F2 = SHOTS[1].b - 13; // the crane's end framing (video ~244)
    // ---- shot 2: the wayside panel, left of the hero log, facing the crane lens, tilted back 32 deg ----
    { const [x, z] = groundAtScreen(2, F2, 205, 1655), c = camAt(2, F2), yaw = Math.atan2(c.pos[0] - x, c.pos[2] - z), y0 = floorY(x, z);
      const W = 1.32, H = 0.72, tilt = -0.56, m = M4(x, y0, z, yaw);
      for (const dx of [-0.42, 0.42]) tb(b, post, m, dx - 0.035, 0, -0.07, dx + 0.035, 0.62, 0.0, 0.5);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ")), ctr = V(x, y0 + 0.7, z);
      b.add(new THREE.BoxGeometry(W + 0.07, H + 0.07, 0.05).translate(0, 0, -0.027), beam, new THREE.Matrix4().compose(ctr, q, V(1, 1, 1)));
      const fp = ctr.clone().addScaledVector(V(0, 0, 1).applyQuaternion(q), 0.0015);
      this.face(P.waysideTex("triassic", ["LATE TRIASSIC", "LOGS 0.4 MI", "STAY ON TRAIL"], W, H, "trail"), W, H, fp.x, fp.y, fp.z, yaw, 0.95, tilt); // round 6 (audit A6 P3: it pre-empted Sign A)
      this.blobs.push([x, z, 0.85, 0.45, -yaw]); }
    // ---- shot 2: desert plants in the mid ground (a cholla, a prickly pear, a juniper) ----
    const pad = lam("atPearPad", () => ({ map: P.pearPadTex(), emissive: new THREE.Color(0.1, 0.13, 0.06), emissiveMap: P.pearPadTex() }));
    const pear = (px: number, pz: number, sc: number) => { const y0 = floorY(px, pz);
      for (const [dx, dy, dz, rx, rz, s0] of [[0, 0.17, 0, 0.1, 0.15, 1], [0.12, 0.36, 0.02, -0.2, -0.5, 0.8], [-0.11, 0.33, -0.02, 0.15, 0.55, 0.75], [0.03, 0.5, 0, 0, 0.1, 0.62], [0.2, 0.12, 0.08, 0.3, -1.1, 0.7], [-0.22, 0.13, 0.05, -0.2, 1.0, 0.72]] as const)
        b.add(new THREE.SphereGeometry(1, 12, 8).scale(0.13 * s0 * sc, 0.17 * s0 * sc, 0.035 * s0 * sc).rotateX(rx).rotateZ(rz).translate(px + dx * sc, y0 + dy * sc, pz + dz * sc), pad);
      this.blobs.push([px, pz, 0.62 * sc, 0.45 * sc, 0.3]); };
    const cho = lam("atCholla", () => ({ map: P.chollaTex(), emissive: new THREE.Color(0.16, 0.17, 0.09), emissiveMap: P.chollaTex() }));
    const cholla = (px: number, pz: number, sc: number, seed: number) => { const q = P.rng(seed), y0 = floorY(px, pz), top = V(px + 0.03 * sc, y0 + 0.62 * sc, pz);
      tube(b, cho, V(px, y0 - 0.02, pz), top, 0.06 * sc); b.add(new THREE.SphereGeometry(0.065 * sc, 10, 8).translate(top.x, top.y, top.z), cho);
      for (let k = 0; k < 6; k++) { const a = k * 1.13 + q() * 0.6, h = (0.22 + 0.36 * q()) * sc, s0 = V(px + 0.01 * sc, y0 + h, pz);
        const j1 = s0.clone().add(V(Math.cos(a) * 0.2 * sc, 0.08 * sc, Math.sin(a) * 0.2 * sc)), j2 = j1.clone().add(V(Math.cos(a) * 0.06 * sc, (0.16 + 0.1 * q()) * sc, Math.sin(a) * 0.06 * sc));
        tube(b, cho, s0, j1, 0.042 * sc); tube(b, cho, j1, j2, 0.038 * sc);
        for (const p of [j1, j2]) b.add(new THREE.SphereGeometry(0.046 * sc, 9, 7).translate(p.x, p.y, p.z), cho); }
      this.blobs.push([px, pz, 0.7 * sc, 0.55 * sc, seed]); };
    { const okAt = (x: number, z: number, rad: number) => !kept(x, z, rad) && paveD(x, z) > rad + 0.3;
      const c1 = groundAtScreen(2, F2, 92, 1205), c2 = groundAtScreen(2, F2, 800, 1178), j = groundAtScreen(2, F2, 70, 905);
      // round 7 (audit A7 P3: it read as a saguaro - Sonoran, not this grassland - and overlapped the photographer's
      // legs): a yucca rosette with a dried flower stalk, further right and nearer (clear of his silhouette)
      void cholla;
      { const yc = groundAtScreen(2, F2, 236, 1330); if (okAt(yc[0], yc[1], 0.5)) { const yM = lam("atYucca", () => ({ map: P.yuccaLeafTex(), emissive: new THREE.Color(0.05, 0.07, 0.035), emissiveMap: P.yuccaLeafTex() }));
        const y0 = floorY(yc[0], yc[1]); b.add(yuccaGeo(761), yM, M4(yc[0], y0, yc[1], 0.7, 1.15));
        tube(b, lam("atYuccaStalk", () => ({ color: "#9c7e56" })), V(yc[0], y0 + 0.15, yc[1]), V(yc[0] + 0.05, y0 + 1.15, yc[1] - 0.02), 0.014);
        this.blobs.push([yc[0], yc[1], 1.0, 0.8, 0.7]); } }
      if (okAt(c2[0], c2[1], 0.5)) pear(c2[0], c2[1], 1.5);
      if (okAt(j[0], j[1], 1.2)) { this.extraJunA.push({ x: j[0], z: j[1], s: 1.6 }); this.blobs.push([j[0], j[1], 1.7, 1.2, 0.2]); } }
    // ---- shot 2: a white park pickup on a dirt track across the far flats (it comes out from behind the entrance
    // sign ~video 215 and drives left at ~9 m/s), kicking up a dust plume that drifts downwind ----
    { const A = groundAtScreen(2, F2, 1010, 884), B2 = groundAtScreen(2, F2, 120, 862), dx = B2[0] - A[0], dz = B2[1] - A[1], L0 = Math.hypot(dx, dz), ux = dx / L0, uz = dz / L0;
      const x0 = A[0] - ux * 45, z0 = A[1] - uz * 45, E = groundAtScreen(2, F2, 600, 878), sE = (E[0] - x0) * ux + (E[1] - z0) * uz;
      this.pick2Path = { x0, z0, ux, uz, sE };
      const N = 80, Ls = L0 + 110, Wd = 3.4, pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = [];
      for (let i = 0; i <= N; i++) { const sx = (i / N) * Ls, wob = 1.6 * Math.sin(sx * 0.045 + 0.7), cx = x0 + ux * sx - uz * wob, cz = z0 + uz * sx + ux * wob;
        for (const sd of [-1, 1]) { const x = cx - uz * sd * Wd * 0.5, z = cz + ux * sd * Wd * 0.5; pos.push(x, floorY(x, z) + 0.06, z); uv.push(sx / 9, sd < 0 ? 0 : 1); nor.push(0, 1, 0); } }
      for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex(idx);
      const road = new THREE.Mesh(geo, twoTone(new THREE.MeshLambertMaterial({ map: P.dirtRoadTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 1, true));
      road.receiveShadow = true; road.layers.set(NOINK); road.renderOrder = 1; road.visible = false; this.g.add(road); this.pick2Road = road;
      const pb = new Batch(), nT = this.tails.length; this.vehicle(pb, 0, 0, 0, 4.9, 1.95, 1.4, "#ecebe4", "#3e6a4c", 0); this.tails.length = nT;
      pb.build(this.pick2); this.pick2.visible = false; this.g.add(this.pick2);
      for (let k = 0; k < 12; k++) this.pick2Dust.push(this.spr(P.puffTex(), "#e2c49c", false, true)); }
    // ---- shot 4 (the low wide's empty lower-right floor): a pebble cairn, a crushed paper cup, chips along the curb ----
    { const F4 = BEAT.warning - 14, stoneC = ["#d9c7aa", "#b89a80", "#e6d8c2", "#a8866c", "#cbb79a"];
      { const [x, z] = groundAtScreen(4, F4, 948, 1712); let y = floorY(x, z);
        for (let k = 0; k < 5; k++) { const s0 = 0.085 - k * 0.013, sy = s0 * 0.42; y += sy * (k ? 0.95 : 0.6);
          this.extraRocks.push({ x: x + 0.012 * Math.sin(k * 2.1), z: z + 0.01 * Math.cos(k * 1.7), s: s0, sy, col: new THREE.Color(stoneC[k]), y, yaw: k * 1.3 }); y += sy * 0.9; }
        this.blobs.push([x, z, 0.26, 0.2, 0.4]); }
      { const [x, z] = groundAtScreen(4, F4, 770, 1830), cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.095, 10, 1, false).scale(1, 1, 0.45),
          lam("atCrushedCup", () => ({ map: P.cupTex() })));
        cup.rotation.set(Math.PI / 2, 0, 0.6); cup.position.set(x, floorY(x, z) + 0.018, z); cup.castShadow = true; cup.receiveShadow = true; this.g.add(cup); this.blobs.push([x, z, 0.12, 0.08, 0.6]); }
      for (const [px, py, col] of [[612, 1568, "#c84a3a"], [705, 1580, "#e8893a"], [868, 1572, "#8a5aa8"], [1010, 1590, "#f2c64a"], [960, 1610, "#c84a3a"]] as const) {
        const [x, z] = groundAtScreen(4, F4, px, py); if (kept(x, z, 0.05)) continue;
        this.extraChips.push({ x, z, s: 0.04 + r() * 0.02, sy: 0.018, y: floorY(x, z) + 0.008, col: new THREE.Color(col), yaw: r() * 6 }); } }
    // ---- shot 6: a half-buried chip at the right post footing; it catches the low sun now and then ----
    { const x = TH.posts[1] + 0.24, z = TH.board.z + 0.3; this.extraChips.push({ x, z, s: 0.05, sy: 0.02, y: floorY(x, z) + 0.004, col: new THREE.Color("#e0703a"), yaw: 0.7 });
      this.glints.push({ p: V(x, floorY(x, z) + 0.045, z), set: "trailhead", n: 29, ph: 0.41, size: 0.11 }); }
    // ---- shot 13: TRAIL CLOSES AT SUNSET, a small plate hung under the STAY ON TRAIL sign right of Sign B ----
    { const p = tt([1.55, 0, -1.4]), m = M4(p[0], floorY(p[0], p[2]), p[2], 0.1), W = 0.5, H = 0.23, yc = 0.45, ox = 0.07, chain = lam("atChainDark", () => ({ color: "#3a3430" }));
      tb(b, beam, m, ox - W / 2 - 0.02, yc - H / 2 - 0.02, -0.02, ox + W / 2 + 0.02, yc + H / 2 + 0.02, 0.01, 0.5);
      for (const dx of [-0.15, 0.15]) cyl(b, chain, m, ox + dx, yc + H / 2 + 0.02, -0.005, 0.005, 0.005, 0.07, 5);
      const fp = V(ox, yc, 0.0115).applyMatrix4(m); this.face(P.smallSignTex("closes", ["TRAIL CLOSES", "AT SUNSET"], W, H), W, H, fp.x, fp.y, fp.z, 0.1, 0.92); }
    // ---- shots 7-9: a soft lavender ground-mist band at the feet of the far mesas (cool morning air) ----
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.mistBandTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color("#ddd0ec"), opacity: 0.2 }));
      m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.g.add(m); this.mist = m; }
    // ---- shot 15: a thin contrail lit pink by the sun below the horizon ----
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.contrailTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color("#f4bcc6") }));
      m.layers.set(NOINK); m.renderOrder = -0.4; m.visible = false; this.g.add(m); this.contrail = m; }
  }
  private pick2 = new THREE.Group(); private pick2Road: THREE.Mesh | null = null; private pick2Dust: THREE.Sprite[] = [];
  private pick2Path: { x0: number; z0: number; ux: number; uz: number; sE: number } | null = null;
  private mist: THREE.Mesh | null = null; private contrail: THREE.Mesh | null = null;
  /** round 5b life: the shot-2 pickup + plume, the morning mist band, the dusk contrail (video clock vf) */
  private poseA5b(id: number, vf: number, L: LightState, t: THREE.Color, setName: string) {
    // the pickup: video ~215 it clears the entrance sign's left edge, ~9.3 m/s (0.31 m per video frame)
    { const P0 = this.pick2Path, on = id === 2 && !!P0; this.pick2.visible = on; if (this.pick2Road) this.pick2Road.visible = setName === "vista";
      const s0 = P0 ? P0.sE + 0.31 * (vf - 215) : 0, x = P0 ? P0.x0 + P0.ux * s0 : 0, z = P0 ? P0.z0 + P0.uz * s0 : 0, wob = 1.6 * Math.sin(s0 * 0.045 + 0.7);
      const px = P0 ? x - P0.uz * wob : 0, pz = P0 ? z + P0.ux * wob : 0;
      if (on && P0) { this.pick2.position.set(px, floorY(px, pz) + 0.02 + 0.03 * Math.abs(Math.sin(vf * 0.93)), pz);
        this.pick2.rotation.set(0.012 * Math.sin(vf * 1.3), Math.atan2(-P0.uz, P0.ux) - 0.072 * Math.cos(s0 * 0.045 + 0.7), 0.014 * Math.sin(vf * 1.1)); }
      this.pick2Dust.forEach((sp, k) => { sp.visible = on; if (!on || !P0) return;
        const back = 2.4 + 1.25 * k, w = windAt(px, pz, vf), qx = px - P0.ux * back + (0.18 + 0.15 * w) * k, qz = pz - P0.uz * back, sz = 1.0 + 0.36 * k;
        sp.position.set(qx, floorY(qx, qz) + 0.35 + 0.15 * k + 0.06 * Math.sin(vf * 0.31 + k), qz); sp.scale.set(sz * 1.5, sz, 1);
        const mt = sp.material as THREE.SpriteMaterial; mt.opacity = 0.9 * Math.pow(1 - k / 12, 1.4) * (0.85 + 0.15 * Math.sin(vf * 0.47 + k * 1.7)); mt.color.set("#f2dcc0").multiply(t).multiplyScalar(1.12); // paler than the floor: lit dust, low and short
        mt.rotation = 0.6 * k + vf * 0.01; }); }
    // the morning mist band at the mesa feet (shots 7-9)
    if (this.mist) { const on = setName === "trails" && L.name === "morning"; this.mist.visible = on;
      if (on) { const c = anchorCam(id), D = 360, [gx, gz] = groundAhead(c, D, 0), W = 2 * D * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * ASPECT * 2.8, H = 30;
        this.mist.position.set(gx, floorY(gx, gz) + H * 0.32, gz); this.mist.rotation.set(0, Math.atan2(c.pos[0] - gx, c.pos[2] - gz), 0); this.mist.scale.set(W, H, 1);
        (this.mist.material as THREE.MeshBasicMaterial).opacity = 0.22 + 0.03 * Math.sin((TAU * 7 * vf) / VOICE_TOTAL); } }
    // the dusk contrail (shot 15): its head creeps on across the sky
    if (this.contrail) { const on = id === 15 && L.name === "dusk"; this.contrail.visible = on;
      if (on) { const c = camAt(15, SHOTS[14].a + 20), u = vf - toNew(SHOTS[14].a), head = viewPoint(c, 0.62 + 0.0016 * u, 0.36, 560, 10), tail = viewPoint(c, -1.5, 0.12, 560, 8);
        const p = V(...c.pos), fw = V(...c.look).sub(p).normalize(), rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw), d = head.clone().sub(tail);
        const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rt, up, fw.clone().negate()));
        this.contrail.position.copy(head).add(tail).multiplyScalar(0.5); this.contrail.quaternion.copy(q); this.contrail.rotateZ(Math.atan2(d.dot(up), d.dot(rt)));
        this.contrail.scale.set(d.length(), 7, 1); (this.contrail.material as THREE.MeshBasicMaterial).opacity = 0.75; } }
  }
  private extraJunA: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private ch5Spr!: THREE.Sprite;
  private two9 = new THREE.Group(); private twoBlobs: [number, number, number, number, number][] = [];
  private spareGrp = new THREE.Group(); private s3Glints: THREE.Vector3[] = []; private s3Spr: THREE.Sprite[] = [];
  private barPulse: THREE.Mesh | null = null; private dust10: { mesh: THREE.Mesh; at: number }[] = [];
  private mirage: THREE.Mesh | null = null; private mirBase = new Float32Array(0); private stampShadow: THREE.Mesh | null = null;
  private ledSpill: THREE.Mesh[] = []; private s13: THREE.InstancedMesh[] = []; private ch5: { p: THREE.Vector3; at: number } | null = null;
  private two9Sage: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private two9Tufts: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private lizB: Liz | null = null; private lizV2: Liz | null = null; private lizCr: Liz | null = null; private openPlate: THREE.Group | null = null;
  private shot13Jun: THREE.InstancedMesh[] = [];
  private fg7Flags: THREE.Mesh[] = []; private preGlints: { p: THREE.Vector3; at: number }[] = []; private preGlintSpr: THREE.Sprite[] = [];
  private extraJun: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  /** shot 13 (audit A3 P2: no badlands at sunset): a matte silhouette card of plum domes + one flat mesa with gold rims,
   *  ~260 m behind Sign B (its foot sinks below the floor line), shown in shot 13 only */
  private buildSunset13() {
    const W = 560, H = 100, m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: P.sunsetRidgeTex(), transparent: true, depthWrite: false, fog: false }));
    m.position.set(TT.base[0] - 10, -8 + H / 2, TT.base[2] - 260); m.layers.set(NOINK); m.renderOrder = -0.2; m.visible = false; this.g.add(m); this.ridge13 = m;
  }
  private ridge13!: THREE.Mesh;
  private flyAway = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.17), lam("atFlyer", () => ({ map: P.brochureTex(), side: THREE.DoubleSide })));
  private curbLeaf: THREE.Mesh | null = null; private lizC: Liz | null = null;
  private wispQ: [string, number, number, number, number, number, number, number, number][] = [];
  private extraRocks: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[] = [];
  private blobs: [number, number, number, number, number][] = [];
  private cracks: [number, number, number, number, number][] = [];
  /** contact blobs + crack decals gathered by dressLens (one batch) */
  private buildDressDecals() {
    const db = new Batch(), blob = new THREE.MeshBasicMaterial({ map: P.blobTex(), color: new THREE.Color("#5a4a7a"), transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const crF = lam("atCrackDecal", () => ({ map: P.crackTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const crP = lam("atCrackLine", () => ({ map: P.crackLineTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    for (const [x, z, w, h, rot] of this.blobs.filter(([x, z]) => spurD(x, z) > 0.1)) db.add(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(rot).translate(x, floorY(x, z) + 0.013, z), blob);
    for (const [x, z, s, rot, pave] of this.cracks.filter(([x, z, , , pv]) => pv || spurD(x, z) > 0.4)) db.add(pave ? new THREE.PlaneGeometry(s * 1.6, s * 0.4).rotateX(-Math.PI / 2).rotateY(rot).translate(x, 0.0365, z)
      : new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2).rotateY(rot).translate(x, floorY(x, z) + 0.012, z), pave ? crP : crF);
    const n0 = this.g.children.length; db.build(this.g, false);
    for (let i = n0; i < this.g.children.length; i++) { this.g.children[i].layers.set(NOINK); this.g.children[i].renderOrder = 1; this.g.children[i].castShadow = false; }
  }
  private divots: { mesh: THREE.Mesh; at: number }[] = [];
  private pickPuffs: THREE.Sprite[] = [];
  private tarp: THREE.Mesh | null = null; private tarpBase = new Float32Array(0); private tarpTag: THREE.Group | null = null; private ledGlass: THREE.Mesh[] = [];
  private wren: { grp: THREE.Group; head: THREE.Group; tail: THREE.Group } | null = null;
  private railGlint!: THREE.Sprite; private sweepGlint!: THREE.Sprite; private bats: THREE.Sprite[] = [];
  private brochure!: THREE.Mesh;
  private steam = new THREE.Vector3();
  private pinFlags: V3[] = [];
  /** a white plastic bucket with a label */
  private bucket(b: Batch, p: THREE.Vector3, label: string, yaw: number, parent: THREE.Object3D = this.g) {
    const m = M4(p.x, floorY(p.x, p.z), p.z, yaw), white = lam("atBucket", () => ({ color: "#ece8de" }));
    b.add(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 16, 1, true).translate(0, 0.15, 0), white, m);
    b.add(new THREE.CircleGeometry(0.13, 16).rotateX(-Math.PI / 2).translate(0, 0.01, 0), white, m);
    b.add(new THREE.CircleGeometry(0.15, 16).rotateX(-Math.PI / 2).translate(0, 0.25, 0), lam("atChipFill3", () => ({ map: P.chipPileTex() })), m);
    b.add(new THREE.TorusGeometry(0.15, 0.006, 4, 16, Math.PI).translate(0, 0.3, 0), lam("atWire", () => ({ color: "#5a5a5a" })), m);
    const fp = V(0, 0.16, 0.152).applyMatrix4(m), yawW = yaw;
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), lam("atLabel" + label, () => ({ map: P.labelTex(label, label, "#f4efe2", "#3a2414") })));
    lm.position.copy(fp); lm.rotation.set(0, yawW, 0); lm.castShadow = false; lm.receiveShadow = true; parent.add(lm);
  }

  // ======================================== scatter: plants, rocks, pebbles, chips ========================================
  private inst(geo: THREE.BufferGeometry, mat: THREE.Material, pts: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[], amp: number, cast = true, flut = 0) {
    const n = pts.length, mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    const I: Inst = { mesh, px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n), yaw: new Float32Array(n), s: new Float32Array(n), sy: new Float32Array(n), amp, n, flut, hide: new Uint32Array(n) };
    pts.forEach((p, i) => {
      I.px[i] = p.x; I.pz[i] = p.z; I.py[i] = p.y ?? floorY(p.x, p.z) - 0.02; I.yaw[i] = p.yaw ?? hash(i, 9) * TAU; I.s[i] = p.s; I.sy[i] = p.sy ?? p.s;
      mesh.setMatrixAt(i, M4(I.px[i], I.py[i], I.pz[i], I.yaw[i], p.s, I.sy[i], p.s));
      if (p.col) mesh.setColorAt(i, p.col);
    });
    mesh.count = n; mesh.castShadow = cast; mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.g.add(mesh);
    if (amp > 0) { for (let i = 0; i < n; i++) I.hide[i] = lensHide(I.px[i], I.py[i], I.pz[i], I.sy[i]); this.winds.push(I); }
    return mesh;
  }
  private buildScatter() {
    const r = P.rng(9001);
    type Pt = { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number };
    // where to scatter: dense rings around each set, sparse everywhere visible
    const areas: [number, number, number, number, number][] = [ // cx, cz, radius, density weight, minimum distance from flat-zone (0 = anywhere)
      [0, 0, 14, 1.0, 0], [0, -25, 30, 0.8, 0], [-6, -55, 30, 0.7, 0], [TT.base[0], TT.base[2] - 8, 22, 1.0, 0], [0, -110, 80, 0.35, 0], [60, -40, 60, 0.35, 0],
      [-40, -40, 40, 0.4, 0], [10, -60, 20, 0.5, 0],
    ];
    // clumped scatter: plants and stones crowd along the dry washes, the paving edges and the log bases, thin out into
    // bare cracked-earth patches between (no even sprinkle), sizes vary 0.6-1.6x
    const dens = (x: number, z: number) => {
      const pd = paveD(x, z), wd = washD(x, z);
      let ld = Infinity; for (const [a, c] of this.logLines) ld = Math.min(ld, segD(x, z, a, c));
      const d = 0.2 + 0.95 * sstep(3.6, 0.9, wd) + 0.7 * (pd > 0.15 ? sstep(2.8, 0.35, pd) : 0) + 0.8 * sstep(2.8, 0.5, ld) + 0.75 * sstep(0.52, 0.7, fbm(x / 7, z / 7, 51));
      return d * (0.1 + 0.9 * sstep(0.3, 0.46, fbm(x / 11, z / 11, 52)));
    };
    const sample = (n: number, rad: number, h: number, pave: number, out: Pt[], mk: (x: number, z: number) => Pt | null, boost = 2.3) => {
      for (const [cx, cz, R, wgt] of areas) {
        const k = Math.round(n * wgt * (R / 30) ** 1.2 * boost);
        for (let i = 0; i < k; i++) {
          const a = r() * TAU, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
          if (r() > dens(x, z) * 0.5) continue;
          if (!free(x, z, rad, h, pave)) continue;
          const p = mk(x, z); if (p) out.push(p);
        }
      }
    };
    const vary = () => 0.6 + r() * 1.0;
    // sagebrush + junipers (grey-green / dark olive), grass tufts (straw), all on the wind
    const sage: Pt[][] = [[], [], []], jun: Pt[][] = [[], []], tufts: Pt[][] = [[], [], []];
    sample(130, 0.5, 0.8, 0.5, sage[0], (x, z) => ({ x, z, s: (0.45 + r() * 0.35) * vary() }));
    for (const p of this.extraSage) sage[0].push(p);
    for (let i = 0; i < sage[0].length; i++) if (i % 3) sage[i % 3].push(sage[0][i]);
    sage[0] = sage[0].filter((_, i) => i % 3 === 0);
    sample(16, 1.2, 3.5, 1.2, jun[0], (x, z) => (Math.hypot(x, z) > 6 && Math.hypot(x - TT.base[0], z - TT.base[2]) > 7 ? { x, z, s: (1.6 + r() * 1.2) * (0.75 + r() * 0.6) } : null), 1.6);
    jun[1] = jun[0].filter((_, i) => i % 2); jun[0] = jun[0].filter((_, i) => i % 2 === 0);
    for (const p of this.extraJunA) jun[0].push(p);
    // audit A2: tufts grow in clumps of 2-4 (never an even sprinkle), scale 0.6-1.4, each one tinted (straw / grey /
    // sage-green / bleached)
    const TC = ["#ffffff", "#f2e6cc", "#e4ead8", "#fff0d8", "#d8cdb8", "#eadcc0", "#f6f0e0"].map((c) => new THREE.Color(c));
    sample(300, 0.18, 0.5, 0.12, tufts[0], (x, z) => { const k = vary(); return { x, z, s: (0.3 + r() * 0.2) * k, sy: (0.26 + r() * 0.3) * k, col: TC[Math.floor(r() * TC.length)] }; });
    { const seeds = tufts[0].slice();
      for (const p of seeds) for (let j = 0, k = 1 + Math.floor(r() * 3); j < k; j++) {
        const a = r() * TAU, d = 0.12 + r() * 0.35, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, sc = 0.6 + r() * 0.7;
        if (free(x, z, 0.12, 0.4, 0.1)) tufts[0].push({ x, z, s: p.s * sc, sy: (p.sy ?? p.s) * sc, col: TC[Math.floor(r() * TC.length)] });
      } }
    for (const p of this.extraTufts) tufts[0].push(p);
    for (let i = 0; i < tufts[0].length; i++) if (!tufts[0][i].col) tufts[0][i].col = TC[i % TC.length];
    for (let i = 0; i < tufts[0].length; i++) if (i % 3) tufts[i % 3].push(tufts[0][i]);
    tufts[0] = tufts[0].filter((_, i) => i % 3 === 0);
    // camera-foreground clumps: a few tufts + sage near every lens (but never in its sight line)
    for (const { o } of SIGHT.filter((_, i) => i % 6 === 0)) for (let i = 0; i < 4; i++) {
      const a = r() * TAU, d = 1.6 + r() * 3, x = o.x + Math.cos(a) * d, z = o.z + Math.sin(a) * d;
      if (free(x, z, 0.15, 0.45, 0.1)) tufts[i % 3].push({ x, z, s: 0.3 + r() * 0.3, sy: 0.25 + r() * 0.3 });
    }
    // nothing tall in the shot-8 opening insert except its lower-left framer
    const clear8 = (L: Pt[]) => L.filter((p) => !insert8Blocks(p.x, p.z, (p.sy ?? p.s) * 0.9) && spurD(p.x, p.z) > Math.max(0.12, p.s * 0.5) && !castClear(p.x, p.z, p.s * 0.6)); // (+ off the A4 spur, the heap + pocketing spots)
    for (let i = 0; i < 3; i++) { sage[i] = clear8(sage[i]); tufts[i] = clear8(tufts[i]); }
    { const [x, z] = groundAhead(INS8, 1.05, -0.92); tufts[1].push({ x, z, s: 0.3, sy: 0.24, col: TC[1] }); } // the insert's corner framer
    for (let i = 0; i < 2; i++) jun[i] = jun[i].filter((p) => spurD(p.x, p.z) > 1.2 && !castClear(p.x, p.z, p.s * 0.4));
    const junM = lam("atJuniper5", () => ({ map: P.juniperTex(), emissive: new THREE.Color(0.12, 0.16, 0.08), emissiveMap: P.juniperTex() })), trunkM = lam("atJunTrunk", () => ({ color: "#6e4e3a" }));
    // audit A3: branchy silver-green leaf cards (3 texture variants), sway 2-4 deg on the shared wind
    sage.forEach((L, i) => this.inst(sageCardGeo(31 + i * 7), sageM(i), L, 0.05, true, 0.04));
    // shot 13 (audit A5 P3: the long hold's bottom quarter was a bare orange path): rim-lit sage + two rocks 2-3 m from
    // the lens in the lower corners (shot 13 only: the same ground is the shot 9-10 crowd's plaza)
    { const c13 = camAt(13, BEAT.thieves), sg: { x: number; z: number; s: number; yaw?: number }[] = [], rk: { x: number; z: number; s: number; sy?: number; col?: THREE.Color; y?: number }[] = [];
      for (const [d, sx, s0] of [[2.3, -0.92, 0.5], [2.7, 0.9, 0.44], [3.1, -0.62, 0.32]] as const) { const [x, z] = groundAhead(c13, d, sx); sg.push({ x, z, s: s0, yaw: d * 2.1 }); }
      for (const [d, sx, s0] of [[2.5, -0.7, 0.16], [2.9, 0.68, 0.12]] as const) { const [x, z] = groundAhead(c13, d, sx); rk.push({ x, z, s: s0, sy: s0 * 0.6, col: new THREE.Color("#b08a72"), y: floorY(x, z) - s0 * 0.15 }); }
      this.s13.push(this.inst(sageCardGeo(91), sageM(2), sg, 0.05, true, 0.04), this.inst(rockGeo(533, 1, 0.35, 0.8), lam("atRock", () => ({ map: P.rockHD() })), rk, 0)); }
    jun.forEach((L, i) => { this.inst(juniperGeo(71 + i * 5), junM, L, 0.022, true, 0.014); this.inst(trunkGeo(), trunkM, L, 0.022, true, 0.014); });
    // audit A4 P2: the two backlit shot-13 junipers behind Sign B are their own mesh, shown in shot 13 only (one stood
    // right behind tourist A's head through the shot-10 Sign A hold and the shot-9 reader)
    if (this.extraJun.length) this.shot13Jun.push(this.inst(juniperGeo(71), junM, this.extraJun, 0.022, true, 0.014), this.inst(trunkGeo(), trunkM, this.extraJun, 0.022, true, 0.014));
    const tg = tuftGeo();
    // (a 2.4x shade lift: only the shaded side of a tuft lightens toward lavender, the sunlit side keeps its straw gold)
    tufts.forEach((L, i) => this.inst(tg, twoTone(new THREE.MeshLambertMaterial({ map: P.tuftTex(i), alphaTest: 0.45, emissive: new THREE.Color("#ffffff"), emissiveMap: P.tuftTex(i), emissiveIntensity: 0.1 }), 2.4), L, 0.09, false, 0.075));
    // sandstone rocks and boulders (tinted per instance), pebbles near the lenses, rainbow chips round the logs
    const rockM = lam("atRock", () => ({ map: P.rockHD() }));
    const RC = ["#b08a72", "#a07866", "#c09a80", "#9a7c70", "#b7967e", "#8f7468"].map((c) => new THREE.Color(c));
    const rocks: Pt[][] = [[], [], []];
    sample(160, 0.4, 0.5, 0.2, rocks[0], (x, z) => { const s = (0.08 + r() ** 2.2 * 0.6) * vary(); return { x, z, s, sy: s * (0.55 + r() * 0.3), col: RC[Math.floor(r() * RC.length)], y: floorY(x, z) - s * 0.15 }; });
    // round 7 (audit A7 P2 shot 2: the big dark-brown rock mounds read as dung piles, one sat on the red-cap's head): the
    // big ones become FLAT pale sandstone slabs (<= 0.25 m tall, #C9906A -> #E0B48C), the scatter order is unchanged
    { const SL = ["#c9906a", "#d4a07a", "#e0b48c", "#cfa480"].map((c) => new THREE.Color(c));
      rocks[0].forEach((p, i) => { if (p.s > 0.22) { p.sy = Math.min(0.25, (p.sy ?? p.s) * 0.5); p.col = SL[i % SL.length]; p.y = floorY(p.x, p.z) - p.sy * 0.25; } });
      // (the slab right behind the shot-2 red-cap walker's head, ground under 410 / 1196 px at video 268: gone)
      rocks[0] = rocks[0].filter((p) => !(p.s > 0.16 && Math.hypot(p.x + 20.6, p.z + 36.36) < 1.4 + p.s)); }
    for (const p of this.extraRocks) rocks[0].push(p);
    rocks[0] = clear8(rocks[0]);
    for (let i = 0; i < rocks[0].length; i++) if (i % 3) rocks[i % 3].push(rocks[0][i]);
    rocks[0] = rocks[0].filter((_, i) => i % 3 === 0);
    rocks.forEach((L, i) => this.inst(rockGeo(500 + i, 1, 0.35, 0.8), rockM, L, 0));
    // lizard rock + a few rocks along the paving edges (gravel border)
    // round 6 (audit A6 P2 shot 2): plain pebbles grey-beige (#B8A898 class), only a little warmth left
    const peb: Pt[] = [], PC = ["#d6ccbe", "#c8bcae", "#b8a898", "#a89a8c", "#c4ae9a", "#9c8e82", "#e2d8ca"].map((c) => new THREE.Color(c));
    const pebArea = (cx: number, cz: number, R: number, n: number) => { for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (paveD(x, z) > 0.05 && !kept(x, z, 0.05)) { const s = 0.012 + r() ** 2 * 0.05; peb.push({ x, z, s, sy: s * 0.6, col: PC[Math.floor(r() * PC.length)], y: floorY(x, z) }); } } };
    pebArea(0, 2, 9, 900); pebArea(0, -12, 10, 300); pebArea(TT.base[0], TT.base[2] + 1, 10, 900); pebArea(TT.base[0], TT.base[2] - 12, 9, 300);
    pebArea(VISTA.pocketTourist[0], VISTA.pocketTourist[2], 7, 600); pebArea(-6, -38, 12, 300);
    // gravel banks along the washes near the sets
    for (const L of WASHES) for (let i = 0; i < L.length; i += 2) { const [wx, wz] = L[i];
      if (Math.min(Math.hypot(wx, wz), Math.hypot(wx + 6, wz + 30), Math.hypot(wx - TT.base[0], wz - TT.base[2])) > 45) continue;
      for (let k = 0; k < 6; k++) { const a = r() * TAU, d = 1.8 + r() * 1.6, x = wx + Math.cos(a) * d, z = wz + Math.sin(a) * d;
        if (paveD(x, z) > 0.05 && !kept(x, z, 0.05)) { const s = 0.015 + r() ** 2 * 0.06; peb.push({ x, z, s, sy: s * 0.6, col: PC[Math.floor(r() * PC.length)], y: floorY(x, z) }); } } }
    for (const p of this.extraPeb) peb.push(p);
    this.inst(rockGeo(611, 0, 0.3, 0.7), lam("atPebble", () => ({ color: "#ffffff" })), peb.filter((p) => spurD(p.x, p.z) > 0.02), 0, false);
    const CC = ["#d0503c", "#ee9040", "#f6cc50", "#9462b4", "#d86c4a", "#c25e70", "#f4e6d2"].map((c) => new THREE.Color(c));
    const chips: Pt[] = this.chipSpots.filter(([x, z]) => paveD(x, z) > 0.05 && !kept(x, z, 0.05)).map(([x, z, s]) => ({ x, z, s, sy: s * 0.55, col: CC[Math.floor(r() * CC.length)], y: floorY(x, z) + s * 0.2 }));
    for (const p of this.extraChips) chips.push(p);
    for (let i = chips.length - 1; i >= 0; i--) if (spurD(chips[i].x, chips[i].z) < 0.05) chips.splice(i, 1);
    // sun glints on a few chips near each set (1-2 a second, 4 f each; whole cycles per film so the loop holds)
    for (const [set, cx, cz, R] of [["trailhead", 0, -2, 12], ["vista", -6, -30, 26], ["trails", TT.base[0], TT.base[2] - 3, 12]] as const) {
      const near = chips.filter((c) => Math.hypot(c.x - cx, c.z - cz) < R && c.s > 0.04);
      for (let i = 0; i < 12 && near.length; i++) { const c = near[Math.floor(r() * near.length)]; this.glints.push({ p: V(c.x, (c.y ?? 0) + c.s * 0.6, c.z), set, n: 17 + Math.floor(r() * 30), ph: r(), size: 0.06 + c.s * 0.6 }); }
    }
    for (let i = 0; i < 80; i++) { const a = r() * TAU, d = 1.2 + Math.sqrt(r()) * 6, x = TH.glintRock[0] + Math.cos(a) * d, z = TH.glintRock[2] - 4 + Math.sin(a) * d * 1.6;
      if (paveD(x, z) > 0.1 && !kept(x, z, 0.1)) { const s = 0.025 + r() * 0.04; chips.push({ x, z, s, sy: s * 0.55, col: CC[Math.floor(r() * CC.length)], y: floorY(x, z) + s * 0.2 }); } }
    // audit A5 P3 (shot 2: candy sprinkles near the crane lens): within ~7 m of the shot-2 lens path and away from the
    // logs, half the loose chips go and half of the rest turn muted jasper red / ochre / grey-brown
    { const c2: P2[] = []; for (let f = SHOTS[1].a; f <= SHOTS[1].b; f += 3) { const c = camAt(2, f); c2.push([c.pos[0], c.pos[2]]); }
      const MU = ["#9a5a48", "#a8784a", "#8a7060", "#7a5a4a", "#946650"].map((c) => new THREE.Color(c));
      for (let i = chips.length - 1; i >= 0; i--) { const ch = chips[i];
        if (Math.min(...c2.map(([x, z]) => Math.hypot(ch.x - x, ch.z - z))) > 7) continue;
        let ld = Infinity; for (const [a, c] of this.logLines) ld = Math.min(ld, segD(ch.x, ch.z, a, c));
        if (ld < 1.5 + 0.6 || Math.hypot(ch.x - SLICE3[0], ch.z - SLICE3[2]) < 1.4) continue;
        const h = hash(i, 77); if (h < 0.5) chips.splice(i, 1); else if (h < 0.75) ch.col = MU[i % MU.length]; } }
    // round 6 (audit A6 P2 shot 2: "dozens of round saturated chips, jelly beans / confetti, spread evenly"): in the
    // vista ~70 % of the chips further than 1.8 m from a log go (the rest cluster at the log feet), no white chips
    { for (let i = chips.length - 1; i >= 0; i--) { const ch = chips[i];
        if (ch.x < -48 || ch.x > 16 || ch.z > -12 || ch.z < -82) continue;
        let ld = Infinity; for (const [a, c] of this.logLines) ld = Math.min(ld, segD(ch.x, ch.z, a, c));
        if (ld < 1.8 || Math.hypot(ch.x - SLICE3[0], ch.z - SLICE3[2]) < 1.4) continue;
        if (hash(i, 83) < 0.7) chips.splice(i, 1); } }
    for (const ch of chips) if (ch.col && ch.col.r > 0.8 && ch.col.g > 0.7 && ch.col.b > 0.6) ch.col = CC[0];
    // audit A5 P2 (shot 10: after the crowd pockets its chips the ground under Sign B looked unchanged): the loose chips
    // within 2 m in front of Sign B go dynamic; ~70 % vanish on the crowd's unison pick (6-8 stay), each leaving a
    // pale dust shadow
    { const [bx, , bz] = tt([TT.signB.dx + 0.15, 0, 1.2]);
      let keep = 0;
      for (let i = chips.length - 1; i >= 0; i--) { const ch = chips[i]; if (Math.hypot(ch.x - bx, ch.z - bz) > 2.0) continue;
        const stay = hash(i, 91) < 0.3; if (stay) keep++;
        this.chipBase.push({ p: [ch.x, 0, ch.z], s: ch.s, yaw: hash(i, 92) * 6, hideAt: stay ? Infinity : BEAT.pct8 - 27 + Math.floor(hash(i, 93) * 4), showAt: -10, dot: false, col: ch.col }); chips.splice(i, 1); }
      for (const c of this.chipBase) { if (c.showAt !== 0 || c.hideAt < Infinity || Math.hypot(c.p[0] - bx, c.p[2] - bz) > 2.0) continue;
        if (hash(Math.floor(c.p[0] * 31 + c.p[2] * 17), 94) < 0.7 || keep > 8) c.hideAt = BEAT.pct8 - 26 + Math.floor(hash(Math.floor(c.p[2] * 13), 95) * 3); else keep++; }
      const dm = new THREE.MeshBasicMaterial({ map: P.softDotTex(), color: new THREE.Color("#f2e0c4"), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      for (const c of this.chipBase) if (c.hideAt < Infinity && Math.hypot(c.p[0] - bx, c.p[2] - bz) < 2.6) {
        const me = new THREE.Mesh(new THREE.PlaneGeometry(c.s * 3.2, c.s * 2.6).rotateX(-Math.PI / 2).rotateY(c.yaw), dm); me.position.set(c.p[0], floorY(c.p[0], c.p[2]) + 0.042, c.p[2]);
        me.layers.set(NOINK); me.renderOrder = 1; me.visible = false; this.g.add(me); this.dust10.push({ mesh: me, at: c.hideAt }); } }
    // round 6: angular shards (bark body + ringed cut face) instead of round saturated beads
    this.shardInst(chips);
    // the marked chips (visibility per frame) + their white paint dots
    const n = this.chipBase.length, W1 = new THREE.Color(1, 1, 1);
    this.chipsMarked = new THREE.InstancedMesh(SHARDS[1].body, chipBodyM(), n);
    this.chipsMarkedCap = new THREE.InstancedMesh(SHARDS[1].cap, chipCapM(1), n);
    this.chipDots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: "#fbf8f0" }), n);
    this.chipBase.forEach((c, i) => this.chipsMarkedCap.setColorAt(i, W1.clone().lerp(c.col ?? CC[i % 5], 0.22)));
    for (const m of [this.chipsMarked, this.chipsMarkedCap, this.chipDots]) { m.castShadow = m === this.chipsMarked; m.receiveShadow = true; m.frustumCulled = false; this.g.add(m); }
  }

  /** round 6 (audit A6 P2 shots 2 / 8): broken chips as angular shards - a bark-brown body and a flat cut face that shows
   *  a window of a ringed slice face (arcs + a rind edge); 3 shapes / face variants; the old chip colour only tints the
   *  face 20 % (the rings carry the rainbow) */
  private shardInst(pts: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color; y?: number }[], cast = true, parent: THREE.Object3D | null = null) {
    const W = new THREE.Color(1, 1, 1), BR = [new THREE.Color(1, 1, 1), new THREE.Color(0.86, 0.84, 0.86), new THREE.Color(1.04, 0.96, 0.9)], out: THREE.InstancedMesh[] = [];
    for (let k = 0; k < 3; k++) {
      const L = pts.filter((_, i) => i % 3 === k); if (!L.length) continue;
      out.push(this.inst(SHARDS[k].body, chipBodyM(), L.map((p, i) => ({ ...p, col: BR[i % 3] })), 0, cast));
      out.push(this.inst(SHARDS[k].cap, chipCapM(k), L.map((p) => ({ ...p, col: W.clone().lerp(p.col ?? W, 0.2) })), 0, false));
    }
    if (parent) for (const m of out) { this.g.remove(m); parent.add(m); }
    return out;
  }
  private chipsMarkedCap!: THREE.InstancedMesh;

  // ======================================== FX: wind, dust, sky life ========================================
  private wisp2: { mesh: THREE.Mesh; tex: THREE.Texture; k: number; set: string; base: number; n: number; ph: number; tint?: THREE.Color }[] = [];
  private devils: { g: THREE.Group; tex: THREE.Texture[]; mats: THREE.MeshBasicMaterial[]; skirt: THREE.Mesh; debris: THREE.InstancedMesh }[] = [];
  private tumbles: THREE.Group[] = []; private puffs: THREE.Sprite[] = []; private tumbleMat!: THREE.MeshLambertMaterial;
  private shadowMeshes: { mesh: THREE.Mesh; tex: THREE.Texture; set: string }[] = [];
  private sweeps: { m: THREE.Mesh; tex: THREE.Texture; x0: number; w: number }[] = [];
  private flipPuff!: THREE.Sprite;
  private skyClouds: THREE.Mesh[] = []; private birds: THREE.Sprite[] = []; private stars: THREE.Sprite[] = []; private moon!: THREE.Sprite; private moths: THREE.Sprite[] = [];
  private motes!: THREE.Points; private moteCol!: THREE.BufferAttribute; private motePos!: THREE.BufferAttribute;
  private glintSpr: THREE.Sprite[] = [];
  private speed: THREE.Mesh[] = []; private ring!: THREE.Mesh; private flecks: THREE.Mesh[] = [];
  private steamSpr: THREE.Sprite[] = [];
  private pins!: THREE.InstancedMesh;
  private tailSpr: THREE.Sprite[] = []; private carMove = new THREE.Group(); private carTail: THREE.Sprite[] = [];
  private rims: THREE.Mesh[] = [];
  private rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  private hazeCol = new THREE.Color("#c9d4ee"); private hazeK = 0.42; private shimA = 0; private shimPh = 0;
  private moundK = 0.6;
  private hazeHook = () => { HAZE.uHazeCol.value.copy(this.hazeCol); HAZE.uHaze.value.z = this.hazeK; HAZE.uShim.value.set(this.shimA, this.shimPh); HAZE.uMound.value.set(this.moundK, this.moundDbg); HAZE.uCld.value.copy(this.cld); }; private moundDbg = 1; private cld = new THREE.Vector3();
  private litK = 1; private back = 0;
  private stampMats: THREE.MeshBasicMaterial[] = []; private soleMat: THREE.MeshBasicMaterial | null = null;
  private signB: THREE.Group | null = null;

  private rim(x: number, y: number, z: number, w: number, h: number, yaw: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.rimMat);
    m.position.set(x, y, z + 0.004); m.rotation.y = yaw; m.layers.set(NOINK); m.renderOrder = 4; this.g.add(m); this.rims.push(m);
  }
  private spr(tex: THREE.Texture, col: THREE.ColorRepresentation, additive = false, fog = false) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(col), transparent: true, depthWrite: false, fog,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.layers.set(NOINK); s.visible = false; s.renderOrder = 5; this.g.add(s); return s;
  }
  private buildFx() {
    // ---- blowing sand: hair-thin dashed streak sheets low over the ground, in gusts that fade in / out over ~20 f ----
    const wt = P.wispTex();
    const wisp = (set: string, x: number, z: number, w: number, h: number, yaw: number, k: number, n: number, ph: number, base = 0.75, tint?: THREE.Color) => {
      const tex = wt.clone(); tex.repeat.set(w / 5, 1); tex.needsUpdate = true;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: base }));
      mesh.position.set(x, floorY(x, z) + 0.01, z); mesh.rotation.y = yaw; mesh.layers.set(NOINK); mesh.renderOrder = 4; this.g.add(mesh);
      this.wisp2.push({ mesh, tex, k, set, base, n, ph, tint });
    };
    wisp("trailhead", 0, 3.3, 9, 0.42, 0, 23, 17, 0.0); wisp("trailhead", 0, 0.75, 7, 0.3, 0, 29, 19, 2.1); wisp("trailhead", 0.3, -1.6, 10, 0.4, 0.05, 26, 15, 4.0);
    wisp("trailhead", 0, -6, 14, 0.6, 0, 17, 13, 1.2); wisp("trailhead", 0.5, 6.4, 12, 0.5, -0.04, 21, 16, 3.3);
    const T0 = TT.base;
    wisp("trails", T0[0], T0[2] + 3.6, 14, 0.42, 0, 23, 17, 0.7); wisp("trails", T0[0], T0[2] + 1.2, 12, 0.32, 0, 29, 19, 2.8); wisp("trails", T0[0] - 1, T0[2] - 1.4, 12, 0.36, 0.04, 26, 15, 4.4);
    wisp("trails", T0[0], T0[2] - 9, 18, 0.6, 0, 17, 13, 1.9); wisp("trails", T0[0] + 0.5, T0[2] + 6.2, 12, 0.5, 0, 21, 16, 5.1);
    wisp("vista", VISTA.pocketTourist[0] + 1, VISTA.pocketTourist[2] + 1.4, 8, 0.4, 0.55, 23, 17, 0.3); wisp("vista", -8, -34, 22, 0.8, 0.3, 17, 13, 2.2);
    wisp("vista", -14, -21, 30, 1.0, 0.2, 15, 11, 4.1); wisp("vista", -4, -50, 26, 0.9, 0.4, 19, 14, 1.0);
    // audit A2: wisps through the shot-2 crane foreground (two sheets 5-9 m from the lens) + the dressing pass's sheets
    { const c2 = camAt(2, PW(3, "Petrified") + 19); for (const [d, ph] of [[6, 0.8], [8.5, 3.1]] as const) { const [x, z] = groundAhead(c2, d, 0); wisp("vista", x, z, 16, 0.5, Math.atan2(c2.pos[0] - c2.look[0], c2.pos[2] - c2.look[2]), 25, 18, ph, 0.45, new THREE.Color("#e8c9a0")); } }
    for (const w of this.wispQ) wisp(...w);
    // audit A5 P3 shot 13: backlit gold sand wisps at shin height crossing the long hold (a gust every ~1.5 s)
    { const c13 = camAt(13, BEAT.thieves), yaw = Math.atan2(c13.pos[0] - c13.look[0], c13.pos[2] - c13.look[2]);
      for (const [d, sx, ph, n] of [[2.2, -0.3, 0.5, 52], [3.0, 0.25, 2.6, 56], [3.8, -0.1, 4.4, 50], [2.6, 0.5, 1.4, 54]] as const) { const [x, z] = groundAhead(c13, d, sx); wisp("trails13", x, z, 4.5, 0.32, yaw, 34, n, ph, 0.62, new THREE.Color("#ffd49a")); } }
    // audit A5 P2 heat shimmer: a pale wavering mirage band along the far floor (shots 2, 3, 10 at noon)
    { const geo = new THREE.PlaneGeometry(1, 1, 48, 2).translate(0, 0.5, 0), tex = P.mirageTex(); tex.wrapS = THREE.RepeatWrapping;
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.34 }));
      m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.g.add(m); this.mirage = m; this.mirBase = Float32Array.from(geo.attributes.position.array as ArrayLike<number>); }
    for (let i = 0; i < 5; i++) this.s3Spr.push(this.spr(P.sparkleTex(), new THREE.Color(2.0, 1.95, 1.8), true));
    this.ch5Spr = this.spr(P.sparkleTex(), new THREE.Color(2.4, 2.2, 1.9), true);
    // ---- dust devil: a narrow leaning tan funnel (two counter-scrolling swirl layers), a dust skirt and orbiting debris ----
    // audit A2: a funnel that flares to ~3x its waist at the top (no straight column), two counter-scrolling swirl layers
    // audit A3 P1/P2: ONE devil per allowed shot (2 and 10), far, narrow (waist 0.5 m, top 1.6 m, 9.4 m tall), soft noise
    // body with broad twisted streaks, dense skirt at the ground, sand-coloured grit (no dark specks)
    for (let dv = 0; dv < 2; dv++) { // round 5b: a second devil (shot 10 A medium far right)
      const prof = [[0.9, 0], [0.56, 0.55], [0.5, 1.55], [0.64, 3.1], [0.9, 5.0], [1.2, 7.0], [1.45, 8.5], [1.6, 9.4]];
      const D = { g: new THREE.Group(), tex: [] as THREE.Texture[], mats: [] as THREE.MeshBasicMaterial[], skirt: null as unknown as THREE.Mesh, debris: null as unknown as THREE.InstancedMesh };
      for (let i = 0; i < 2; i++) {
        const tex = P.dustDevilTex().clone(); tex.repeat.set(i ? 3 : 2, 1); tex.needsUpdate = true; D.tex.push(tex);
        const geo = new THREE.LatheGeometry(prof.map(([r2, y]) => new THREE.Vector2(r2 * (i ? 1 : 0.8), y)), 28);
        const pa = geo.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < pa.count; k++) pa.setX(k, pa.getX(k) + 0.22 * Math.sin(pa.getY(k) / 3.4 + dv)); // gentle S-bend
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.5 });
        D.mats.push(mat);
        const m = new THREE.Mesh(geo, mat); m.layers.set(NOINK); m.renderOrder = 3; D.g.add(m);
      }
      D.g.visible = false; this.g.add(D.g);
      D.skirt = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.devilSkirtTex(), transparent: true, depthWrite: false, opacity: 0.7 }));
      D.skirt.layers.set(NOINK); D.skirt.renderOrder = 3; D.skirt.visible = false; this.g.add(D.skirt);
      D.debris = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.1), lam("atDebris2", () => ({ color: "#d2aa80" })), 24);
      D.debris.frustumCulled = false; D.debris.visible = false; this.g.add(D.debris);
      this.devils.push(D);
    }
    // ---- tumbleweeds (two), rolling with hops; beige dust puffs on landings ----
    this.tumbleMat = twoTone(new THREE.MeshLambertMaterial({ map: P.tumbleTex(), alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color("#c9a66b"), emissiveMap: P.tumbleTex(), emissiveIntensity: 0.3 }));
    for (let i = 0; i < 2; i++) {
      const grp = new THREE.Group(), tm = this.tumbleMat;
      const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), tm), inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), tm);
      inner.rotation.set(1, 2, 0.5);
      for (const m of [outer, inner]) { m.castShadow = true; m.layers.set(NOINK); grp.add(m); } // audit A4: no ink on the strands
      grp.visible = false; this.g.add(grp); this.tumbles.push(grp);
    }
    for (let i = 0; i < 4; i++) this.puffs.push(this.spr(P.puffTex(), "#ead8bc", false, true));
    // ---- drifting cloud shadows: soft lavender patches draped on the floor (TH + vista, and the trail heads) ----
    for (const [set, x0, x1, z0, z1] of [["th", -60, 64, -112, 26], ["trails", TT.base[0] - 44, TT.base[0] + 44, TT.base[2] - 50, TT.base[2] + 26]] as const) {
      const st = 2, nx = Math.round((x1 - x0) / st), nz = Math.round((z1 - z0) / st), pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * st, z = z0 + j * st; pos.push(x, floorY(x, z) + 0.06, z); uv.push(x / 90, -z / 90); }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b2 = a + 1, c = a + nx + 2, d = a + nx + 1; idx.push(a, d, c, a, c, b2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const tex = P.cloudShadowTex().clone(); tex.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color("#3a2f6a"), transparent: true, depthWrite: false, opacity: 0.45,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      mesh.layers.set(NOINK); mesh.renderOrder = 1; this.g.add(mesh); this.shadowMeshes.push({ mesh, tex, set });
    }
    // ---- shot 4: a cloud shadow sweeps left to right over the ground, the board, the posts and the counter on "vandalized" ----
    { const base = P.ptex("atSweep2", 512, 8, (g) => { g.clearRect(0, 0, 512, 8); const gr = g.createLinearGradient(0, 0, 512, 0);
        gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.05, "rgba(255,255,255,1)"); gr.addColorStop(0.8, "rgba(255,255,255,1)"); gr.addColorStop(0.85, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 512, 8); });
      const mk = (w: number, h: number, x: number, y: number, z: number, flatG: boolean) => {
        const tex = base.clone(); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
        const geo = new THREE.PlaneGeometry(w, h); if (flatG) geo.rotateX(-Math.PI / 2);
        // round 6 (audit A6 P1: the violet patch turned the brown board magenta-plum, hue ~335 deg): on the board, posts and
        // counter the shadow only DARKENS - a warm dark neutral at 20 % keeps the wood within ~5 deg of its noon hue; the
        // ground keeps the lavender (coloured shadow on the sand)
        // round 7 (carry-over: the dim board read maroon): on the board / posts / counter the shadow is a soft-edged
        // MULTIPLY by #CCC4B8 (dst x lerp(1, c, alpha): premultiplied src, src x dst + dst x (1 - a)), never a tint
        const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(flatG ? "#463a6c" : "#ccc4b8"), transparent: true, depthWrite: false, opacity: flatG ? 0.3 : 1,
          polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
        if (!flatG) { mat.premultipliedAlpha = true; mat.blending = THREE.CustomBlending; mat.blendEquation = THREE.AddEquation; mat.blendSrc = THREE.DstColorFactor; mat.blendDst = THREE.OneMinusSrcAlphaFactor; }
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z); m.layers.set(NOINK); m.renderOrder = 3; m.visible = false; this.g.add(m); this.sweeps.push({ m, tex, x0: x - w / 2, w });
      };
      const B = TH.board, F = FL;
      mk(60, 44, 0, 0.066, -8, true); mk(B.w, B.h, 0, B.cy, B.z + 0.004, false);
      for (const x of TH.posts) mk(0.18, TH.postTop, x, TH.postTop / 2, -0.006, false);
      mk(F.w + 0.04, F.h + 0.04, F.x, F.y, F.z + 0.052, false); }
    // ---- sky life: local puffy clouds laid out in each shot's own frame, two ravens circling, first stars + a moon ----
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.08, 1.08, 1.08) }));
      m.layers.set(NOINK); m.visible = false; this.g.add(m); this.skyClouds.push(m);
    }
    for (let i = 0; i < 3; i++) this.preGlintSpr.push(this.spr(P.sparkleTex(), new THREE.Color(1.7, 1.6, 1.4), true));
    this.flipPuff = this.spr(P.puffTex(), "#e8dcc8", false, true);
    for (let i = 0; i < 2; i++) this.birds.push(this.spr(P.birdTex(0), "#ffffff", false, true));
    for (let i = 0; i < 8; i++) this.stars.push(this.spr(P.sparkleTex(), "#fff6e8", true));
    this.moon = this.spr(P.crescentTex(), "#ffffff"); // round 6 (audit A6 ADD): a thin crescent, not a white dot
    for (let i = 0; i < 8; i++) this.moths.push(this.spr(P.softDotTex(), "#fff2d8"));
    this.railGlint = this.spr(P.sparkleTex(), new THREE.Color(2.0, 1.6, 1.1), true);
    this.qGlint = this.spr(P.sparkleTex(), new THREE.Color(2.2, 1.7, 1.15), true); this.qGlint.renderOrder = 6;
    this.flare13 = this.spr(P.speedTex(), new THREE.Color(1.6, 1.05, 0.6), true); this.flare13.renderOrder = 8;
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.causticTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0, 0, 0), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.position.set(TH.glintRock[0] - 0.12, 0.045, TH.glintRock[2] + 0.2); m.rotation.y = 0.5; m.layers.set(NOINK); m.renderOrder = 4; m.visible = false; this.g.add(m); this.caustic = m; }
    this.sweepGlint = this.spr(P.sparkleTex(), new THREE.Color(2.2, 2.1, 1.9), true);
    for (let i = 0; i < 3; i++) this.bats.push(this.spr(P.birdTex(0), "#2a2440", false, false)); // round 6: three bats
    // ---- warm dust motes drifting through the lens (soft bokeh dots under the depth of field) ----
    { const NM = 44, geo = new THREE.BufferGeometry();
      this.motePos = new THREE.BufferAttribute(new Float32Array(NM * 3), 3); this.moteCol = new THREE.BufferAttribute(new Float32Array(NM * 4), 4);
      geo.setAttribute("position", this.motePos); geo.setAttribute("color", this.moteCol);
      this.motes = new THREE.Points(geo, new THREE.PointsMaterial({ map: P.softDotTex(), size: 0.03, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false }));
      this.motes.frustumCulled = false; this.motes.layers.set(NOINK); this.motes.visible = false; this.motes.renderOrder = 7; this.g.add(this.motes); }
    // ---- glints on chips, the stamp's speed lines / impact ring / ink flecks, cup steam, pin flags, tail lights ----
    for (let i = 0; i < 14; i++) this.glintSpr.push(this.spr(P.sparkleTex(), new THREE.Color(2.2, 2.1, 1.9), true));
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.speedTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.3, 1.25, 1.2), fog: false }));
      m.layers.set(NOINK); m.visible = false; m.renderOrder = 7; this.g.add(m); this.speed.push(m);
    }
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.ringTex(), transparent: true, depthWrite: false, color: new THREE.Color("#f0dcc0") }));
    this.ring.layers.set(NOINK); this.ring.visible = false; this.ring.renderOrder = 6; this.g.add(this.ring);
    for (let i = 0; i < 11; i++) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.024, 6), new THREE.MeshBasicMaterial({ color: "#d8242c", side: THREE.DoubleSide }));
      m.layers.set(NOINK); m.visible = false; m.renderOrder = 6; this.g.add(m); this.flecks.push(m);
    }
    for (let i = 0; i < 4; i++) this.steamSpr.push(this.spr(P.softDotTex(), "#ffffff"));
    this.pins = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.065).translate(0.05, -0.0325, 0), lam("atPinFlag", () => ({ color: "#f06a1e", side: THREE.DoubleSide })), Math.max(1, this.pinFlags.length));
    this.pins.castShadow = true; this.pins.frustumCulled = false; this.pins.count = this.pinFlags.length; this.g.add(this.pins);
    for (const p of this.tails) { const s = this.spr(P.softDotTex(), "#000000", true); s.position.copy(p); s.scale.setScalar(0.5); this.tailSpr.push(s); }
    { // a car pulling out along the road at dusk (shot 15)
      const red = lam("atCar#b8433a", () => ({ color: "#b8433a" })), glass = lam("atCarGlass", () => ({ color: "#4a5a86" }));
      for (const [w, h, d, y, x, mat] of [[4.2, 0.62, 1.78, 0.55, 0, red], [2.3, 0.5, 1.6, 1.08, -0.25, red], [2.2, 0.4, 1.64, 1.1, -0.25, glass]] as const) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, 0); m.castShadow = true; this.carMove.add(m); }
      for (const dz of [-0.62, 0.62]) { const s = this.spr(P.softDotTex(), "#000000", true); this.g.remove(s); s.position.set(-2.15, 0.7, dz); s.scale.setScalar(0.6); s.visible = true; this.carMove.add(s); this.carTail.push(s); }
      // round 6 (audit A6 ADD shot 15: justify the car SFX): two warm headlight discs at the front (bokeh in the soft background)
      for (const dz of [-0.6, 0.6]) { const s = this.spr(P.softDotTex(), "#ffe2a8", true); this.g.remove(s); s.position.set(2.16, 0.68, dz); s.scale.setScalar(0.85); s.visible = true; (s.material as THREE.SpriteMaterial).color.setRGB(2.4, 2.0, 1.4); this.carMove.add(s); }
      this.carMove.visible = false; this.g.add(this.carMove); }
  }

  // ======================================== round 6 dressing + life (audit A6) ========================================
  private web: THREE.Mesh | null = null; private openMat: THREE.MeshBasicMaterial | null = null;
  private stampFaceSh: THREE.Mesh | null = null; private drips: THREE.Mesh[] = []; private grains: THREE.Sprite[] = [];
  private beetle: { grp: THREE.Group; legs: THREE.Mesh[] } | null = null;
  private pathMats: THREE.MeshLambertMaterial[] = [];
  private s5Grp = new THREE.Group();
  /** round 6 additions: the stamp's shadow on Sign B + ink runs + impact grains (13), a defocused juniper sprig and a
   *  dry-grass clump with distinct blades + a cairn in the shot-5 lower corners + an ankle-height wisp across the paving,
   *  the diptych floor (9-10: a trail plaque at 0.7 W, the team's red cooler + clipboard, a tape-measure flag line between
   *  the trail heads, white-dotted chips with contact blobs, tufts + a rock cluster bottom-left), a wheelbarrow of chips
   *  and a RESEARCH AREA sawhorse (7-8), a survey tape along the LONG LOGS edge (8), a beetle climbing the counter post (4) */
  private buildR6() {
    const r = P.rng(6060), I = new THREE.Matrix4(), post = lam("atPostDark", () => ({ map: P.parkWood("#94663f", true) })), beam = lam("atBeamDark", () => ({ map: P.parkWood("#85593a", false) }));
    const TC = ["#ffffff", "#f2e6cc", "#e4ead8", "#fff0d8", "#eadcc0"].map((c) => new THREE.Color(c));
    // ---- shot 13: the stamp's shadow arrives on Sign B's face first; ink runs after the lift; sand grains at the slam ----
    if (this.signB) { const tex = P.ptex("atStampShadowFace", 128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.filter = "blur(5px)"; g.fillStyle = "#ffffff"; g.fillRect(12, 20, 104, 88); g.filter = "none"; });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.72), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color("#2e2450"), transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      m.position.set(0, -0.13, 0.006); m.layers.set(NOINK); m.renderOrder = 3; m.visible = false; this.signB.add(m); this.stampFaceSh = m; }
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ map: P.dripTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.layers.set(NOINK); m.renderOrder = 3; m.visible = false; this.g.add(m); this.drips.push(m); }
    for (let i = 0; i < 9; i++) this.grains.push(this.spr(P.softDotTex(), "#e8cfa8", false, true));
    // ---- shot 5: near-lens framers in both lower corners (1.2-1.7 m from the two-shot lens), an ankle wisp ----
    { const c5 = camAt(5, SHOTS[4].a + 4), junM = lam("atJuniper5", () => ({ map: P.juniperTex(), emissive: new THREE.Color(0.12, 0.16, 0.08), emissiveMap: P.juniperTex() })), trunkM = lam("atJunTrunk", () => ({ color: "#6e4e3a" }));
      const [jx, jz] = groundAhead(c5, 1.2, 1.02), jun = [{ x: jx, z: jz, s: 0.46, sy: 0.62, yaw: 2.1 }]; // (only its top pokes into the corner)
      for (const m of [this.inst(juniperGeo(83), junM, jun, 0.03, true, 0.02), this.inst(trunkGeo(), trunkM, jun, 0.03, true, 0.02)]) { this.g.remove(m); this.s5Grp.add(m); }
      const bladeM = foliM("blades", P.bladeTex, [0.14, 0.11, 0.06]), bl: { x: number; z: number; s: number; sy?: number; yaw?: number; col?: THREE.Color }[] = [];
      const [bx0, bz0] = groundAhead(c5, 1.35, -0.86);
      for (let k = 0; k < 6; k++) bl.push({ x: bx0 + (r() - 0.5) * 0.16, z: bz0 + (r() - 0.5) * 0.12, s: 0.16 + 0.05 * r(), sy: 0.34 + 0.16 * r(), yaw: (k / 6) * Math.PI + r() * 0.4, col: TC[k % TC.length] });
      { const m = this.inst(bladeGeo(), bladeM, bl, 0.07, false, 0.06); this.g.remove(m); this.s5Grp.add(m); }
      const [cx0, cz0] = groundAhead(c5, 1.75, -0.62), rk: { x: number; z: number; s: number; sy: number; y: number; col: THREE.Color; yaw: number }[] = [], SC = ["#d9c7aa", "#b89a80", "#e6d8c2", "#a8866c"];
      let y = 0; for (let k = 0; k < 4; k++) { const s0 = 0.08 - k * 0.014, sy = s0 * 0.45; y += sy * (k ? 0.95 : 0.6); rk.push({ x: cx0 + 0.01 * Math.sin(k * 2.1), z: cz0 + 0.01 * Math.cos(k * 1.7), s: s0, sy, y, col: new THREE.Color(SC[k]), yaw: k * 1.3 }); y += sy * 0.9; }
      { const m = this.inst(rockGeo(533, 1, 0.35, 0.8), lam("atRock", () => ({ map: P.rockHD() })), rk, 0); this.g.remove(m); this.s5Grp.add(m); }
      this.g.add(this.s5Grp);
      const wyaw = Math.atan2(c5.pos[0] - c5.look[0], c5.pos[2] - c5.look[2]), [wx, wz] = groundAhead(c5, 2.6, 0);
      const tex = P.wispTex().clone(); tex.repeat.set(6 / 5, 1); tex.needsUpdate = true;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.24).translate(0, 0.12, 0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.6 }));
      mesh.position.set(wx, 0.045, wz); mesh.rotation.y = wyaw; mesh.layers.set(NOINK); mesh.renderOrder = 4; this.g.add(mesh);
      this.wisp2.push({ mesh, tex, k: 31, set: "th5", base: 0.6, n: 23, ph: 1.1 }); }
    // ---- shots 9-10: the diptych's lower third (everything in the two9 group: shown in 9 from the pull-back and 10) ----
    { const F9 = SHOTS[8].b - 3, bt = new Batch(), at = (px: number, py: number) => groundAtScreen(9, F9, px, py), c9 = camAt(9, F9), yaw9 = (x: number, z: number) => Math.atan2(c9.pos[0] - x, c9.pos[2] - z);
      // a low trail plaque at ~0.7 W (its top under the caption band's bottom edge)
      { const [x, z] = at(760, 1640); if (!kept(x, z, 0.3)) { const yw = yaw9(x, z), m = M4(x, 0.03, z, yw);
        for (const dx of [-0.16, 0.16]) tb(bt, post, m, dx - 0.03, 0, -0.05, dx + 0.03, 0.5, 0.0, 0.5);
        const t = new THREE.Matrix4().compose(V(0, 0.56, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, 0)), V(1, 1, 1));
        bt.add(new THREE.BoxGeometry(0.54, 0.34, 0.035).translate(0, 0, -0.02), beam, m.clone().multiply(t));
        const fp = V(0, 0, 0.0005).applyMatrix4(m.clone().multiply(t)), mat = new THREE.MeshBasicMaterial({ map: P.waysideTex("loop9", ["LONG LOGS", "LOOP 1.6 MI"], 0.5, 0.3, "trail") }), fm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), mat);
        fm.position.copy(fp); fm.rotation.set(-0.5, yw, 0, "YXZ"); fm.layers.set(NOINK); this.two9.add(fm); this.faces.push({ mesh: fm, mat, n: V(0, 0, 1).applyEuler(fm.rotation), gain: 0.95 });
        this.twoBlobs.push([x, z, 0.7, 0.4, -yw]); } }
      // the assistants' red cooler with a clipboard of tally sheets leaning on it
      { const [x, z] = at(330, 1745); if (!kept(x, z, 0.35)) { const m = M4(x, 0.03, z, yaw9(x, z) + 0.5), red = lam("atCooler", () => ({ color: "#c8342c" })), white = lam("atCoolerLid", () => ({ color: "#f2efe6" }));
        bx(bt, red, m, 0, 0.16, 0, 0.52, 0.32, 0.32); bx(bt, white, m, 0, 0.345, 0, 0.54, 0.05, 0.34); bx(bt, white, m, 0, 0.385, 0, 0.3, 0.025, 0.04);
        bx(bt, lam("atClip", () => ({ color: "#a8784a" })), m.clone().multiply(new THREE.Matrix4().makeRotationX(-0.35)), 0, 0.2, 0.27, 0.24, 0.32, 0.012);
        bx(bt, lam("atPaper", () => ({ color: "#f6f2e6" })), m.clone().multiply(new THREE.Matrix4().makeRotationX(-0.35)), 0, 0.19, 0.277, 0.2, 0.26, 0.004);
        this.twoBlobs.push([x, z, 0.9, 0.6, 0.3]); } }
      // a tape-measure line with small orange flags between the two trail heads (in front of the readers)
      { const a = tt([-2.75, 0, 2.55]), e = tt([-0.45, 0, 2.45]), d = V(e[0] - a[0], 0, e[2] - a[2]), Ln = d.length(), yw = Math.atan2(d.x, d.z);
        const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.03, Ln).rotateX(-Math.PI / 2).rotateY(yw), lam("atTapeM", () => { const t = P.tapeTex().clone(); t.repeat.set(1, 1); return { map: t }; }));
        tape.position.set((a[0] + e[0]) / 2, 0.041, (a[2] + e[2]) / 2); tape.receiveShadow = true; this.two9.add(tape);
        const fl = lam("atPinFlag", () => ({ color: "#f06a1e", side: THREE.DoubleSide })), wire = lam("atWire", () => ({ color: "#5a5a5a" }));
        for (let k = 0; k <= 4; k++) { const u = k / 4, x = lerp(a[0], e[0], u), z = lerp(a[2], e[2], u); cyl(bt, wire, I, x, 0.03, z, 0.004, 0.004, 0.3, 4);
          bt.add(new THREE.PlaneGeometry(0.09, 0.06).translate(0.045, -0.03, 0).rotateY(0.4 + k * 0.3).translate(x, 0.33, z), fl); } }
      // 7 white-dotted chips with contact blobs across the lower third (clear of the caption band)
      { const pts: { x: number; z: number; s: number; sy: number; y: number; yaw: number; col: THREE.Color }[] = [], CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8"].map((c) => new THREE.Color(c)), dot = new THREE.MeshBasicMaterial({ color: "#fbf8f0" });
        for (const [px, py] of [[200, 1530], [470, 1600], [640, 1880], [880, 1500], [960, 1760], [380, 1860], [560, 1520]] as const) { const [x, z] = at(px, py); if (kept(x, z, 0.1)) continue;
          const s = 0.07 + 0.03 * r(); pts.push({ x, z, s, sy: s * 0.55, y: 0.03 + s * 0.2, yaw: r() * TAU, col: CC[pts.length % 4] }); this.twoBlobs.push([x, z, 0.22, 0.16, r() * 3]);
          bt.add(new THREE.SphereGeometry(1, 8, 6).scale(Math.max(0.022, s * 0.3), Math.max(0.022, s * 0.3) * 0.42, Math.max(0.022, s * 0.3)).translate(x, 0.03 + s * 0.2 + s * 0.26, z), dot); }
        this.shardInst(pts, true, this.two9); }
      // dry tufts + a rock cluster bottom-left
      { const [x, z] = at(140, 1800), tf: { x: number; z: number; s: number; sy: number; y: number; col: THREE.Color }[] = [], rk: { x: number; z: number; s: number; sy: number; y: number; col: THREE.Color }[] = [];
        for (let k = 0; k < 2; k++) tf.push({ x: x + 0.25 * k, z: z - 0.15 * k, s: 0.3 - 0.06 * k, sy: 0.3 - 0.04 * k, y: 0.03, col: TC[k + 1] });
        for (let k = 0; k < 4; k++) { const a = k * 1.7, s0 = 0.07 + 0.05 * r(); rk.push({ x: x + 0.35 + Math.cos(a) * 0.16, z: z + 0.1 + Math.sin(a) * 0.12, s: s0, sy: s0 * 0.6, y: 0.03 - s0 * 0.1, col: new THREE.Color(["#b08a72", "#c09a80", "#9a7c70", "#b7967e"][k]) }); }
        const tm = twoTone(new THREE.MeshLambertMaterial({ map: P.tuftTex(1), alphaTest: 0.45, emissive: new THREE.Color("#ffffff"), emissiveMap: P.tuftTex(1), emissiveIntensity: 0.1 }), 2.4);
        for (const m of [this.inst(tuftGeo(), tm, tf, 0.09, false, 0.075), this.inst(rockGeo(541, 1, 0.35, 0.8), lam("atRock", () => ({ map: P.rockHD() })), rk, 0)]) { this.g.remove(m); this.two9.add(m); }
        this.twoBlobs.push([x + 0.35, z + 0.1, 0.6, 0.45, 0.5]); }
      const n0 = this.two9.children.length; bt.build(this.two9); for (let i = n0; i < this.two9.children.length; i++) this.two9.children[i].castShadow = true; }
    // ---- shots 7-8: a wheelbarrow half full of chips beside the MARKED CHIPS crate; a RESEARCH AREA sawhorse ----
    { const b7 = new Batch(), p = tt([3.78, 0, 2.3]), m = M4(p[0], 0, p[2], -0.9), steel = lam("atBarrow", () => ({ color: "#5e7a62" })), tire = lam("atTire", () => ({ color: "#26262a" })), wood = lam("atWoodTan", () => ({ map: P.parkWood("#8a5e3c", false) }));
      b7.add(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 4, 1, true).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0, 0.5, 0), steel, m);   // the tray
      b7.add(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 4).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0, 0.35, 0), steel, m);
      b7.add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16).rotateZ(Math.PI / 2).translate(0, 0.2, 0.55), tire, m);                          // the wheel
      for (const sx of [-1, 1]) { b7.add(new THREE.BoxGeometry(0.035, 0.035, 1.3).translate(sx * 0.2, 0.42, -0.2), wood, m); b7.add(new THREE.BoxGeometry(0.03, 0.34, 0.03).translate(sx * 0.2, 0.17, -0.5), steel, m); }
      b7.add(new THREE.CircleGeometry(0.36, 4).rotateX(-Math.PI / 2).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0, 0.6, 0), lam("atChipFill3", () => ({ map: P.chipPileTex() })), m);
      const sw = M4(...tt([5.55, 0, 0.85]), -0.35), board = new THREE.MeshBasicMaterial({ map: P.barrierTex(["RESEARCH AREA"]) });
      for (const sx of [-0.55, 0.55]) for (const sz of [-1, 1]) b7.add(new THREE.BoxGeometry(0.04, 0.84, 0.04).translate(0, 0.42, 0).applyMatrix4(new THREE.Matrix4().makeRotationX(sz * 0.26)).translate(sx, 0, sz * 0.11), wood, sw);
      b7.add(new THREE.BoxGeometry(1.3, 0.24, 0.03).translate(0, 0.72, 0.03), wood, sw);
      { const fm = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.22), board), fp = V(0, 0.72, 0.047).applyMatrix4(sw); fm.position.copy(fp); fm.rotation.y = -0.35; fm.layers.set(NOINK); this.fg7.add(fm); this.faces.push({ mesh: fm, mat: board, n: V(0, 0, 1).applyAxisAngle(V(0, 1, 0), -0.35), gain: 0.95 }); }
      b7.build(this.fg7);
      const pts: { x: number; z: number; s: number; sy: number; y: number; yaw: number; col: THREE.Color }[] = [], CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8"].map((c) => new THREE.Color(c));
      for (let k = 0; k < 10; k++) { const lp = V((r() - 0.5) * 0.36, 0.62 + r() * 0.06, (r() - 0.5) * 0.26).applyMatrix4(m); const s = 0.06 + 0.04 * r(); pts.push({ x: lp.x, z: lp.z, s, sy: s * 0.55, y: lp.y, yaw: r() * TAU, col: CC[k % 4] }); }
      this.shardInst(pts, true, this.fg7);
      this.blobs.push([p[0], p[2], 1.2, 0.8, 0.9]); }
    // ---- shot 8: a yellow survey tape along the LONG LOGS path edge + its case ----
    { const a = tt([0.92, 0, -1.9]), e = tt([1.08, 0, -6.6]), d = V(e[0] - a[0], 0, e[2] - a[2]), Ln = d.length(), yw = Math.atan2(d.x, d.z);
      const t = P.tapeTex().clone(); t.repeat.set(1, Ln); t.needsUpdate = true; t.rotation = Math.PI / 2;
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.03, Ln).rotateX(-Math.PI / 2).rotateY(yw), lam("atTapeM8", () => ({ map: t })));
      tape.position.set((a[0] + e[0]) / 2, 0.04, (a[2] + e[2]) / 2); tape.receiveShadow = true; this.g.add(tape);
      const cs = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.045), lam("atTapeCase", () => ({ color: "#e8b830" }))); cs.position.set(a[0] - 0.02, 0.075, a[2] + 0.06); cs.rotation.set(0, yw, 0.1); cs.castShadow = true; this.g.add(cs); }
    // ---- shot 4: a beetle climbing the counter post past the carved heart (the counter insert) ----
    { const grp = new THREE.Group(), shell = lam("atBeetle", () => ({ color: "#2e2a34" })), leg = lam("atBeetleLeg", () => ({ color: "#1e1a22" }));
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8).scale(0.012, 0.018, 0.008), shell), head = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6).translate(0, 0.019, 0.001), shell);
      grp.add(body, head); const legs: THREE.Mesh[] = [];
      for (let k = 0; k < 6; k++) { const sd = k % 2 ? 1 : -1, yy = -0.008 + Math.floor(k / 2) * 0.008, lg = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0025, 0.0025).translate(sd * 0.007, 0, 0), leg); lg.position.set(sd * 0.008, yy, 0); grp.add(lg); legs.push(lg); }
      grp.position.set(TH.posts[0] + 0.025, 0.9, -0.01 + 0.01); grp.visible = false; this.g.add(grp); this.beetle = { grp, legs }; }
    // ---- shots 8-10: a TEST IN PROGRESS sawhorse beside the LONG LOGS path, far back (reads in the diptych wide) ----
    { const b9 = new Batch(), wood = lam("atWoodTan", () => ({ map: P.parkWood("#8a5e3c", false) })), sw = M4(...tt([1.85, 0, -8.6]), 0.12), board = new THREE.MeshBasicMaterial({ map: P.barrierTex(["TEST IN PROGRESS"]) });
      for (const sx of [-0.55, 0.55]) for (const sz of [-1, 1]) b9.add(new THREE.BoxGeometry(0.045, 0.84, 0.045).translate(0, 0.42, 0).applyMatrix4(new THREE.Matrix4().makeRotationX(sz * 0.26)).translate(sx, 0, sz * 0.11), wood, sw);
      b9.add(new THREE.BoxGeometry(1.3, 0.24, 0.03).translate(0, 0.72, 0.03), wood, sw); b9.build(this.g);
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.22), board); fm.position.copy(V(0, 0.72, 0.047).applyMatrix4(sw)); fm.rotation.y = 0.12; fm.layers.set(NOINK); this.g.add(fm);
      this.faces.push({ mesh: fm, mat: board, n: V(0, 0, 1).applyAxisAngle(V(0, 1, 0), 0.12), gain: 0.95 }); }
    void I;
  }
  /** round 6 per-frame life */
  /** round 7 (audit A7 P2 shot 10: the Sign A noon hold had the barest foreground - flat sand, two flags, a few chips):
   *  a near-lens layer for the A hold, shot 10 only: a big blurred sage framer low left ~1.35 m from the lens, a low metal
   *  rail post with its tube on the right, 9 white-dotted marked chips + pebbles + dry tufts across the lower third */
  private fg10 = new THREE.Group();
  private buildFg10() {
    const c = camAt(10, picAt(1405)), r = P.rng(1010), at = (d: number, sx: number) => groundAhead(c, d, sx), b = new Batch(), I = new THREE.Matrix4();
    const sage: { x: number; z: number; s: number; yaw?: number }[] = [], tufts: { x: number; z: number; s: number; sy: number; y: number; col: THREE.Color }[] = [];
    const TC = ["#ffffff", "#f2e6cc", "#e4ead8", "#fff0d8", "#eadcc0"].map((h) => new THREE.Color(h)), bl: [number, number, number, number, number][] = [];
    { const [x, z] = at(1.35, -0.8); sage.push({ x, z, s: 0.78, yaw: 1.1 }); bl.push([x, z, 1.1, 0.8, 0.4]);
      for (let k = 0; k < 4; k++) { const a = k * 1.6 + 0.3, dd = 0.4 + 0.15 * k; tufts.push({ x: x + Math.cos(a) * dd, z: z + Math.sin(a) * dd, s: 0.3 + 0.08 * (k % 2), sy: 0.3 + 0.1 * (k % 3), y: 0.03, col: TC[k % TC.length] }); } }
    { const [x, z] = at(2.9, -0.95); sage.push({ x, z, s: 0.5, yaw: 2.3 }); bl.push([x, z, 0.75, 0.55, 1.2]); }
    // a low rail post with its two tubes running off the right edge (dark green-grey park rail)
    { const [x, z] = at(2.55, 0.97), [x2, z2] = at(2.9, 1.7), railM = lam("atRail", () => ({ color: "#4e5a52" })); // (render check: clear of tourist A's right edge, low in the corner)
      cyl(b, railM, I, x, 0, z, 0.028, 0.028, 0.66, 8); b.add(new THREE.SphereGeometry(0.034, 8, 6).translate(x, 0.66, z), railM);
      for (const y of [0.36, 0.61]) tube(b, railM, V(x, y, z), V(x2, y, z2), 0.02);
      bl.push([x, z, 0.3, 0.24, 0]); }
    // marked chips (white paint dots) and pebbles across the lower third, clear of the cast
    const pts: { x: number; z: number; s: number; sy: number; y: number; yaw: number; col: THREE.Color }[] = [], CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8"].map((h) => new THREE.Color(h)), dot = new THREE.MeshBasicMaterial({ color: "#fbf8f0" });
    for (let i = 0, n = 0; i < 60 && n < 9; i++) { const [x, z] = at(1.9 + r() * 1.7, (r() - 0.5) * 1.5); if (kept(x, z, 0.12)) continue;
      const s0 = 0.06 + 0.03 * r(); pts.push({ x, z, s: s0, sy: s0 * 0.55, y: 0.03 + s0 * 0.2, yaw: r() * TAU, col: CC[n % 4] }); bl.push([x, z, 0.2, 0.15, r() * 3]);
      b.add(new THREE.SphereGeometry(1, 8, 6).scale(Math.max(0.02, s0 * 0.3), Math.max(0.02, s0 * 0.3) * 0.42, Math.max(0.02, s0 * 0.3)).translate(x, 0.03 + s0 * 0.2 + s0 * 0.26, z), dot); n++; }
    const PC = ["#d6ccbe", "#c8bcae", "#b8a898", "#e2d8ca", "#a89a8c"].map((h) => new THREE.Color(h)), peb: { x: number; z: number; s: number; sy: number; y: number; col: THREE.Color }[] = [];
    for (let i = 0; i < 70; i++) { const [x, z] = at(1.6 + r() * 2.2, (r() - 0.5) * 2.1); if (kept(x, z, 0.04)) continue; const s0 = 0.012 + r() ** 2 * 0.04; peb.push({ x, z, s: s0, sy: s0 * 0.6, y: 0.03, col: PC[i % PC.length] }); }
    for (let i = 0; i < 8; i++) { const [x, z] = at(2.2 + r() * 1.6, (r() - 0.5) * 1.9); if (kept(x, z, 0.1)) continue; tufts.push({ x, z, s: 0.22 + 0.1 * r(), sy: 0.2 + 0.14 * r(), y: 0.03, col: TC[i % TC.length] }); }
    b.build(this.fg10);
    const tm = twoTone(new THREE.MeshLambertMaterial({ map: P.tuftTex(2), alphaTest: 0.45, emissive: new THREE.Color("#ffffff"), emissiveMap: P.tuftTex(2), emissiveIntensity: 0.1 }), 2.4);
    for (const m of [this.inst(sageCardGeo(77), sageM(0), sage, 0.05, true, 0.04), this.inst(tuftGeo(), tm, tufts, 0.09, false, 0.075),
      this.inst(rockGeo(611, 0, 0.3, 0.7), lam("atPebble", () => ({ color: "#ffffff" })), peb, 0, false)]) { this.g.remove(m); this.fg10.add(m); }
    this.shardInst(pts, true, this.fg10);
    { const db = new Batch(), blob = new THREE.MeshBasicMaterial({ map: P.blobTex(), color: new THREE.Color("#5a4a7a"), transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      for (const [x, z, w, h, rot] of bl) db.add(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(rot).translate(x, 0.04, z), blob);
      const n0 = this.fg10.children.length; db.build(this.fg10, false); for (let i = n0; i < this.fg10.children.length; i++) { this.fg10.children[i].layers.set(NOINK); this.fg10.children[i].renderOrder = 1; } }
    this.fg10.visible = false; this.g.add(this.fg10);
  }
  private poseR6(id: number, f: number, vf: number, fa: number, L: LightState, t: THREE.Color, ctx: SetCtx) {
    const F = STAMP_F, s = TT.signB, x = TT.base[0] + s.dx, z = TT.base[2] + s.z;
    // the stamp's shadow sliding onto Sign B's face in the 8 f before the impact, sharpening as it nears
    if (this.stampFaceSh) { const k = (f - (F - 8)) / 8, on = id === 13 && k >= 0 && k < 1.05; this.stampFaceSh.visible = on;
      if (on) { const u = clamp01(k); this.stampFaceSh.position.set(0.3 * (1 - u), -STAMP_DY + 0.55 * (1 - u), 0.006); this.stampFaceSh.scale.set(1.3 - 0.45 * u, 1.3 - 0.45 * u, 1); // slides in from the top right, ends block-sized (its edges read on the panel) this.stampFaceSh.rotation.z = -0.14 * u;
        (this.stampFaceSh.material as THREE.MeshBasicMaterial).opacity = 0.72 * u ** 1.2; (this.stampFaceSh.material as THREE.MeshBasicMaterial).color.set("#2e2450").multiply(t).multiplyScalar(1.4); } }
    // two red ink runs creeping down from the mark after the lift (~20 f)
    this.drips.forEach((m, i) => { const k = (f - (F + 9 + i * 4)) / 20, on = id === 13 && k >= 0; m.visible = on; if (!on) return;
      const [lx, ly] = i ? [0.21, -0.12] : [-0.16, -0.155], c = Math.cos(-0.14), sn = Math.sin(-0.14);
      m.position.set(x + lx * c - ly * sn, s.cy - STAMP_DY + lx * sn + ly * c, z + 0.0055); m.scale.set(0.016, 0.006 + 0.05 * smooth(k) * (i ? 0.8 : 1), 1);
      (m.material as THREE.MeshBasicMaterial).color.copy(t).multiplyScalar(1.2); });
    // sand grains thrown up off the path at the sign foot on the slam
    this.grains.forEach((sp, i) => { const k = (f - F) / 10, on = id === 13 && k >= 0 && k <= 1; sp.visible = on; if (!on) return;
      const a = (i / this.grains.length) * Math.PI + 0.2 * hash(i, 7), v = 0.35 + 0.35 * hash(i, 8), px = x + Math.cos(a) * v * k * 1.2, py = 0.06 + v * 0.9 * k - 0.85 * k * k, pz = z + 0.15 + Math.sin(a) * v * k * 0.9;
      sp.position.set(px, Math.max(0.04, py), pz); sp.scale.setScalar(0.022 + 0.012 * hash(i, 9)); (sp.material as THREE.SpriteMaterial).opacity = 0.9 * (1 - k * 0.6); (sp.material as THREE.SpriteMaterial).color.set("#e8cfa8").multiply(t).multiplyScalar(1.3); });
    // shot 5 corner framers (their group: shot 5 only)
    this.s5Grp.visible = id === 5;
    // the glint rock steps 0.57 m right beside the dropped leaflet in shot 5 (it sat behind his shins: a purple blob)
    if (id === 5) this.glintGrp.position.set(TH.glintRock[0] + 0.57, 0.125, TH.glintRock[2] - 0.05); else this.glintGrp.position.set(TH.glintRock[0], 0.125, TH.glintRock[2]);
    // the cobweb in the counter housing trembles on the gusts
    if (this.web) { const w = windAt(-0.8, 0.1, fa); this.web.rotation.z = 0.06 * w * Math.sin((TAU * 61 * fa) / VOICE_TOTAL); this.web.scale.set(1 + 0.05 * w * Math.sin((TAU * 89 * fa) / VOICE_TOTAL), 1 + 0.04 * w * Math.cos((TAU * 73 * fa) / VOICE_TOTAL), 1); }
    // the beetle: climbs ~12 cm up the left post through the counter insert (video clock), legs scuttling
    if (this.beetle) { const v0 = toNew(BEAT.vandalized), u = clamp01((vf - v0) / 70), on = id === 4 && vf >= v0 - 30 && vf <= v0 + 120; this.beetle.grp.visible = on;
      if (on) { this.beetle.grp.position.y = 0.86 + 0.14 * u + 0.004 * Math.sin(vf * 1.7); this.beetle.grp.rotation.z = 0.12 * Math.sin(vf * 0.37);
        this.beetle.legs.forEach((lg, k) => { lg.rotation.z = (k % 2 ? 1 : -1) * (0.3 + 0.35 * Math.sin(vf * 2.2 + k * 1.6)); }); } }
    // TRAIL OPEN -> TRAIL CLOSED at dusk (he is pocketing after hours)
    if (this.openMat) { const tx = L.name === "dusk" ? P.smallSignTex("trailClosed", ["TRAIL CLOSED"], 0.33, 0.1) : P.smallSignTex("trailOpen", ["TRAIL OPEN"], 0.33, 0.1); if (this.openMat.map !== tx) { this.openMat.map = tx; this.openMat.needsUpdate = true; } }
    // the shot-13 sunlit paving: chroma ~-30 % (audit A6 P3: neon-orange stripes), the violet shade untouched
    PATH.uPathK.value = id === 13 ? 0.9 : 0;
    void ctx;
  }

  // ======================================== shot 4: the "14 tons a year" heap (LEAD A6 P2 gag insert) ========================================
  private heap = new THREE.Group(); private heapPile = new THREE.Group(); private heapPuffs: THREE.Sprite[] = []; private heapShadow: THREE.Mesh | null = null;
  private heapFlag: { mesh: THREE.Mesh; base: Float32Array } | null = null;
  private heapFly: { m: THREE.Group; a: number; vxz: number; vy: number; y0: number; spin: number }[] = [];
  private heapRoll: { m: THREE.Group; a: number; t0: number; d: number }[] = []; private heapCamA = 0;
  /** a ~2.2 m tall, ~4 m wide cartoon heap of broken rainbow chips at TH.heap14: a lumpy painted pile, ~130 angular chips
   *  standing out of its surface, a few sliced chunks with rainbow faces, a "14 TONS" summit pennant. It drops in from
   *  above on BEAT.tons14 (shot 4 only), lands in 6 video f with a squash and a damped wobble, kicks up a dust ring and
   *  flings 8 chips; never visible outside shot 4 (so never on the loop frame) */
  private buildHeap14() {
    const R = 2.0, H = 2.2, r = P.rng(1414), [hx, , hz] = TH.heap14;
    const surfY = (t: number) => H * (1 - Math.pow(t, 1.5)) * (1 - 0.1 * t * (1 - t)); // t = radius / R
    const prof: THREE.Vector2[] = [];
    for (let k = 0; k <= 22; k++) { const t = 1.04 - (k / 22) * 1.04; prof.push(new THREE.Vector2(R * Math.max(0.002, t), t > 1 ? -0.06 : surfY(t))); }
    const geo = new THREE.LatheGeometry(prof, 56), pa = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), rr = Math.hypot(x, z); // chunky lumps
      if (y < 0) continue;
      const n = (vnoise(x * 1.5 + 3, z * 1.5 - 2 + y * 0.8, 61) - 0.5) * 0.4 + (vnoise(x * 4.3, z * 4.3 + y * 2, 62) - 0.5) * 0.14, k = rr > 0.05 ? 1 + (n * 0.45) / Math.max(0.6, rr) : 1;
      pa.setXYZ(i, x * k, Math.max(0, y + n * 0.45 * (1 - (y / H) * 0.3)), z * k); }
    geo.computeVertexNormals();
    const tex = P.heapTex().clone(); tex.repeat.set(5, 2.4); tex.needsUpdate = true;
    const pile = new THREE.Mesh(geo, warmShade(twoTone(new THREE.MeshLambertMaterial({ map: tex, emissive: new THREE.Color(1, 1, 1), emissiveMap: tex, emissiveIntensity: 0.2 })), "heap", 0.45));
    pile.castShadow = true; pile.receiveShadow = true; this.heapPile.add(pile);
    // ~130 chips standing out of the surface (tilted to the slope + jitter), 3 shard shapes
    const CC = ["#c84a3a", "#e8893a", "#f2c64a", "#8a5aa8", "#de6a3a", "#b8506a", "#f0a24a"].map((c) => new THREE.Color(c)), W = new THREE.Color(1, 1, 1);
    const lists: THREE.Matrix4[][] = [[], [], []], cols: THREE.Color[][] = [[], [], []], up = V(0, 1, 0);
    for (let i = 0; i < 132; i++) {
      const a = r() * TAU, t = Math.sqrt(r()) * 0.97, rr = R * t, y = surfY(t), s = 0.1 + r() ** 1.6 * 0.17;
      const sl = (H * 1.5 * Math.sqrt(Math.max(t, 0.01))) / R, nrm = V(Math.cos(a) * sl, 1, Math.sin(a) * sl).normalize().add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(up, nrm).multiply(new THREE.Quaternion().setFromAxisAngle(up, r() * TAU));
      const k = i % 3; lists[k].push(new THREE.Matrix4().compose(V(Math.cos(a) * rr, y - s * 0.05, Math.sin(a) * rr), q, V(s, s * 0.6, s))); cols[k].push(W.clone().lerp(CC[i % CC.length], 0.25));
    }
    for (let k = 0; k < 3; k++) for (const [geoK, mat, cast] of [[SHARDS[k].body, chipBodyM(), true], [SHARDS[k].cap, chipCapM(k), false]] as const) {
      const im = new THREE.InstancedMesh(geoK, mat, lists[k].length);
      lists[k].forEach((m, i) => { im.setMatrixAt(i, m); if (!cast) im.setColorAt(i, cols[k][i]); });
      im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; this.heapPile.add(im); }
    // sliced chunks with rainbow faces; round 7 (audit A7 P3): 14 of them on the lens side, their ring faces turned
    // toward the landing lens (+-25 deg), so the pile reads as sliced petrified logs, not rubble
    const bark = lam("atBark", () => ({ map: P.barkHD() })), bb = new Batch();
    const cL = camAt(4, picAt(HEAP_V0() + 8)), aCam = Math.atan2(cL.pos[2] - hz, cL.pos[0] - hx), ry0 = 0.35; // the heap group's yaw
    this.heapCamA = aCam;
    for (let i = 0; i < 14; i++) {
      const aw = aCam + (i / 13 - 0.5) * 2.3 + (r() - 0.5) * 0.2, t = 0.2 + r() * 0.66, rr = R * t, y = surfY(t), R0 = 0.12 + r() * 0.12, NA = 14, rad = Array.from({ length: NA }, (_, k2) => R0 * (1 + 0.1 * Math.sin(2 * k2 + i)));
      const { side, cap } = sliceGeo(rad, 0.14 + r() * 0.16, [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25], [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25]);
      const al = aw + ry0, pl = V(Math.cos(al) * rr, y + R0 * 0.3, Math.sin(al) * rr); // heap-local (the group's yaw turns local angle al to world aw = al - ry0)
      const toCam = V(cL.pos[0] - (hx + Math.cos(aw) * rr), cL.pos[1] - y, cL.pos[2] - (hz + Math.sin(aw) * rr)).normalize().applyAxisAngle(V(0, 1, 0), -ry0);
      toCam.add(V(r() - 0.5, (r() - 0.5) * 0.6, r() - 0.5).multiplyScalar(0.8)).normalize();
      const m = new THREE.Matrix4().compose(pl, new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), toCam), V(1, 1, 1));
      bb.add(side, bark, m); bb.add(cap, jasM(i % 5), m); }
    bb.build(this.heapPile);
    // the summit pennant
    { const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.95, 6).translate(0, H + 0.38, 0), lam("atHeapStick", () => ({ color: "#8a6a44" }))); stick.castShadow = true; this.heapPile.add(stick);
      const fg = new THREE.PlaneGeometry(0.6, 0.32, 12, 2).translate(0.31, H + 0.68, 0), fm = new THREE.Mesh(fg, lam("atHeapFlag", () => ({ map: P.heapFlagTex(), side: THREE.DoubleSide })));
      fm.castShadow = true; fm.receiveShadow = true; this.heapPile.add(fm); this.heapFlag = { mesh: fm, base: Float32Array.from(fg.attributes.position.array as ArrayLike<number>) }; }
    this.heap.add(this.heapPile); this.heap.position.set(hx, 0, hz); this.heap.rotation.y = 0.35; this.heap.visible = false; this.g.add(this.heap);
    // its contact / drop shadow on the floor
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.6, R * 2.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.blobTex(), color: new THREE.Color("#3a2f6a"), transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      m.position.set(hx, 0.045, hz); m.layers.set(NOINK); m.renderOrder = 1; m.visible = false; this.g.add(m); this.heapShadow = m; }
    // round 7 (audit A7 P3): 10 cartoon puff clouds (lobed, plum ink) + 6 soft dust puffs that drift downwind for 20 f
    for (let i = 0; i < 16; i++) this.heapPuffs.push(i < 10 ? this.spr(P.cartoonPuffTex(i % 3), "#ffffff", false, true) : this.spr(P.puffTex(), "#ead8bc", false, true));
    // round 7 (audit A7 P3 "a ~1 m brown slab tumbled up-left"): the flung pieces are 0.2-0.3 m rainbow-faced slices on
    // arcs to the sides and behind (never toward the close landing lens); + 5 chips rolling down the lens-side flank
    const slicePiece = (i: number, R0: number, len: number) => { const NA = 12, rad = Array.from({ length: NA }, (_, k2) => R0 * (1 + 0.12 * Math.sin(2 * k2 + i * 1.3)));
      const { side, cap } = sliceGeo(rad, len, [0.15 * Math.sin(i), 0.1], [-0.1, 0.15 * Math.cos(i)]), grp = new THREE.Group();
      const b0 = new THREE.Mesh(side, bark), c0 = new THREE.Mesh(cap, jasM(i % 5)); b0.castShadow = true; c0.castShadow = true; grp.add(b0, c0); grp.visible = false; this.g.add(grp); return grp; };
    const flyA = [-0.5, -0.1, 0.25, 2.65, 3.0, 3.4, 4.1, 4.7, 5.3];
    flyA.forEach((da, i) => { const grp = slicePiece(i, 0.1 + 0.05 * hash(i, 71), 0.07 + 0.04 * hash(i, 77));
      this.heapFly.push({ m: grp, a: aCam + Math.PI / 2 + da, vxz: 0.06 + 0.05 * hash(i, 73), vy: 0.08 + 0.05 * hash(i, 74), y0: 0.4 + 0.6 * hash(i, 75), spin: 0.25 + 0.3 * hash(i, 76) }); });
    for (let i = 0; i < 5; i++) this.heapRoll.push({ m: slicePiece(20 + i, 0.07 + 0.03 * hash(i, 81), 0.06), a: aCam + (i - 2) * 0.32 + 0.1 * hash(i, 82), t0: 0.3 + 0.12 * hash(i, 83), d: 2 + 3 * i });
    // ADD: an 'EVERY YEAR' plank stuck in the pile under the pennant (it echoes the board)
    { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.175), new THREE.MeshLambertMaterial({ map: P.plankNoteTex("every", "EVERY YEAR"), side: THREE.DoubleSide }));
      const st2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.75, 6), lam("atHeapStick", () => ({ color: "#8a6a44" })));
      const al = aCam + 0.35 + 0.3, rr = R * 0.32, y0 = surfY(0.32), grp = new THREE.Group(); grp.position.set(Math.cos(al) * rr, y0 - 0.1, Math.sin(al) * rr);
      st2.position.y = 0.37; pl.position.set(0, 0.62, 0.02); grp.add(st2, pl); grp.rotation.set(0.06, -(aCam + 0.35) + Math.PI / 2, -0.12); pl.castShadow = true; st2.castShadow = true; this.heapPile.add(grp); }
  }
  /** the heap drop (video clock from the beat: no stretch by the voice warp) */
  private poseHeap14(id: number, vf: number, fa: number) {
    const FALL = 6, v0 = toNew(PW(8, "year")) + 23, /* LEAD A7 merge: = new 'year...' end - 5 (~video 544): lands on CAM's HELD heap wide in the pause after 'every year...' */ dv = vf - v0, on = id === 4 && dv >= 0, [hx, , hz] = TH.heap14;
    this.heap.visible = on; if (this.heapShadow) this.heapShadow.visible = on;
    for (const s of this.heapPuffs) s.visible = false;
    for (const c of this.heapFly) c.m.visible = false;
    for (const c of this.heapRoll) c.m.visible = false;
    if (!on) return;
    let y = 0, sy = 1, sx = 1;
    if (dv < FALL) { const u = dv / FALL; y = 9 * (1 - u * u); sy = 1.12; sx = 0.93; }                 // falls (ease-in), stretched
    else { const k = dv - FALL, sq = 0.22 * Math.exp(-k / 3.2) * Math.cos(k * 1.15); sy = 1 - sq; sx = 1 + sq * 0.55; } // squash + damped wobble
    this.heap.position.set(hx, y, hz); this.heapPile.scale.set(sx, sy, sx); this.heap.rotation.z = dv < FALL ? 0.04 * Math.sin(dv * 0.9) : 0;
    if (this.heapShadow) { const u = clamp01(dv / FALL); this.heapShadow.scale.setScalar(1.6 - 0.55 * u); (this.heapShadow.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.3 * u; }
    if (this.heapFlag) { const pa = this.heapFlag.mesh.geometry.attributes.position as THREE.BufferAttribute, B0 = this.heapFlag.base, w0 = windAt(hx, hz, fa);
      // round 7 (ADD: "it reads static"): the pennant SNAPS - a 2.3 Hz travelling wave + a 3.7 Hz flutter at the free end
      for (let i = 0; i < pa.count; i++) { const bx2 = B0[i * 3], u = clamp01(bx2 / 0.62);
        const wave = Math.sin(bx2 * 11 - (TAU * 197 * fa) / VOICE_TOTAL) * 0.075 * u * (0.55 + w0) + Math.sin(bx2 * 19 + B0[i * 3 + 1] * 6 - (TAU * 311 * fa) / VOICE_TOTAL) * 0.025 * u * u;
        pa.setXYZ(i, bx2 * (0.94 + 0.06 * w0), B0[i * 3 + 1] - u * u * 0.05 * (1 - w0) - (dv < FALL ? -0.08 * u : 0), wave); }
      pa.needsUpdate = true; this.heapFlag.mesh.geometry.computeVertexNormals(); }
    const k = dv - FALL;
    // cartoon puffs round the foot: grow over 6 f (ease-out), hold, fade over the next 8 f; then 6 soft puffs drift right
    // (render check: a puff on the lens side filled 40 % of the close landing frame) - the puffs sit round the sides and
    // back of the foot (never within ~45 deg of the lens bearing), the two nearest the lens corners small
    if (k >= 0 && k <= 14) this.heapPuffs.forEach((s, i) => { if (i >= 10) return; const g = easeOutQ(k / 6), side = i % 2 ? 1 : -1, j = Math.floor(i / 2);
      const a = this.heapCamA + side * (0.8 + j * 0.42 + 0.08 * hash(i, 3)), rad = 2.0 + 0.45 * g, near = j === 0 ? 0.55 : 1;
      s.visible = true; s.position.set(hx + Math.cos(a) * rad, 0.2 + 0.3 * g * (0.5 + 0.5 * hash(i, 4)), hz + Math.sin(a) * rad); s.scale.setScalar((0.3 + 0.7 * g) * (0.8 + 0.4 * hash(i, 5)) * near);
      const mt = s.material as THREE.SpriteMaterial; mt.opacity = k < 6 ? 1 : 1 - (k - 6) / 8; mt.color.copy(this.tint).multiplyScalar(1.12); mt.rotation = 0.3 * (hash(i, 6) - 0.5); });
    if (k >= 3 && k <= 23) this.heapPuffs.forEach((s, i) => { if (i < 10) return; const u = (k - 3) / 20, j = i - 10;
      s.visible = true; s.position.set(hx + 1.4 + 1.7 * u + 0.25 * j, 0.25 + 0.35 * u + 0.12 * (j % 3), hz - 0.3 - 0.3 * j); s.scale.setScalar(0.6 + 0.8 * u);
      const mt = s.material as THREE.SpriteMaterial; mt.opacity = 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u * 0.4); mt.color.set("#ead8bc").multiply(this.tint).multiplyScalar(1.15); mt.rotation = j + u; });
    if (k >= 0) this.heapFly.forEach((c) => { const G = 0.011, tl = (c.vy + Math.sqrt(c.vy * c.vy + 2 * G * c.y0)) / G, t = Math.min(k, tl), d = 2.0 * 0.92 + c.vxz * t;
      c.m.visible = true; c.m.position.set(hx + Math.cos(c.a) * d, Math.max(0.06, c.y0 + c.vy * t - 0.5 * G * t * t), hz + Math.sin(c.a) * d);
      c.m.rotation.set(k < tl ? t * c.spin : 0.2, c.a, k < tl ? t * c.spin * 0.7 : 0); });
    // 5 chips roll down the lens-side flank for ~20 f after the squash (gravity ease-in, a small bounce at the foot)
    if (k >= 0) this.heapRoll.forEach((c) => { const u = clamp01((k - c.d) / 18), t = c.t0 + (1.06 - c.t0) * u * u, y = 2.2 * (1 - Math.pow(Math.min(1, t), 1.5)) * (1 - 0.1 * t * (1 - t)) * this.heapPile.scale.y;
      c.m.visible = k >= c.d; const b = u >= 1 ? 0.05 * Math.abs(Math.sin(Math.min(6, k - c.d - 18) * 1.4)) * Math.exp(-(k - c.d - 18) / 3) : 0;
      c.m.position.set(hx + Math.cos(c.a) * 2.0 * t, Math.max(0.07, y + 0.08) + b, hz + Math.sin(c.a) * 2.0 * t);
      c.m.rotation.set(0, -c.a, -(2.0 * t) / 0.09); });
  }

  // ======================================== the giant rubber stamp ========================================
  private buildStamp() {
    // warm brown wood that keeps its colour in the sunset backlight (emissive floor from the wood map itself), a thick
    // red rubber pad with a wet-ink sheen on its leading edge, and orange rim strips on the top / right edges
    const mk = (o: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(o), 0.15); // low blue shade-lift: stays warm in backlight
    // round 6 (audit A6 P2: "a thin tan plywood box with a dome knob; no handle neck, no red rubber"): a 0.9 x 0.55 x
    // 0.18 m varnished block with a dark moulding, a 0.05 m BRIGHT red rubber base (#B8262E) wet with ink, a turned
    // handle (flared foot, brass collar, a waisted 0.12 m neck, a 0.2 m ball): ~0.6 m deep in all
    const wood = mk({ map: P.parkWood("#8a5a32", false), emissive: new THREE.Color("#b07a48"), emissiveIntensity: 0.55 });
    const dark = mk({ map: P.parkWood("#5a3a22", false), emissive: new THREE.Color("#6a4428"), emissiveIntensity: 0.5 });
    const knob = mk({ color: "#8a5530", emissive: new THREE.Color("#a86a3a"), emissiveIntensity: 0.55 });
    const rub = mk({ color: "#b8262e", emissive: new THREE.Color("#8e1a22"), emissiveIntensity: 0.6 });
    const brass = mk({ color: "#c9a256", emissive: new THREE.Color("#a07a30"), emissiveIntensity: 0.5 });
    const add2 = (g: THREE.BufferGeometry, mat: THREE.Material, shadow = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = shadow; this.stamp.add(m); return m; };
    // round 7 (audit A7 P2 "still a thin tan plywood box with a brass doorknob"): a THICKER varnished block (0.2 m) with
    // dark bevelled edges and grain, a 4 cm red rubber layer that overhangs the mount by 1 cm (a red band shows from
    // every angle on the descent) with a dark wet-ink skin, and a classic turned handle: flared foot, a 0.10-0.12 m
    // waisted neck and a 0.16 m mushroom knob, ~0.27 m tall
    add2(new THREE.BoxGeometry(0.9, 0.55, 0.2).translate(0, 0, 0.165), wood);        // block, z 0.065 .. 0.265
    add2(new THREE.BoxGeometry(0.93, 0.58, 0.025).translate(0, 0, 0.0525), dark);    // the dark moulded mount the rubber is glued to
    add2(new THREE.BoxGeometry(0.92, 0.57, 0.04).translate(0, 0, 0.02), rub);        // rubber, z 0 .. 0.04 (face at z 0)
    add2(new THREE.BoxGeometry(0.925, 0.575, 0.008).translate(0, 0, 0.004), mk({ color: "#4a0e16", emissive: new THREE.Color("#3a0a10"), emissiveIntensity: 0.5 })); // the ink skin on the rubber's lower edge
    for (const [w, h, x, y] of [[0.9, 0.035, 0, 0.2575], [0.9, 0.035, 0, -0.2575], [0.035, 0.55, 0.4325, 0], [0.035, 0.55, -0.4325, 0]] as const)
      add2(new THREE.BoxGeometry(w, h, 0.035).translate(x, y, 0.255), dark);           // dark bevel strips round the top edge
    add2(new THREE.BoxGeometry(0.8, 0.46, 0.018).translate(0, 0, 0.274), dark);       // a raised top panel
    { const prof = [[0.09, 0], [0.086, 0.018], [0.066, 0.034], [0.054, 0.06], [0.05, 0.1], [0.054, 0.13], [0.062, 0.15], [0.05, 0.165]].map(([rr, y]) => new THREE.Vector2(rr, y));
      add2(new THREE.LatheGeometry(prof, 20).rotateX(Math.PI / 2).translate(0, 0, 0.283), wood);                     // turned foot + waisted neck
      add2(new THREE.CylinderGeometry(0.094, 0.094, 0.022, 20).rotateX(Math.PI / 2).translate(0, 0, 0.294), brass); // brass collar
      add2(new THREE.SphereGeometry(0.08, 20, 14).scale(1, 1, 0.72).translate(0, 0, 0.497), knob);                  // the mushroom knob (z 0.44 .. 0.555)
      add2(new THREE.TorusGeometry(0.072, 0.012, 8, 20).translate(0, 0, 0.462), dark); }                               // a dark turned groove under the knob
    // the sole: mirrored raised type wet with ink. Round 7 (audit A7 P2: a flat unlit saturated slab on the lift): its own
    // sunset multiply, #B85A50 at the top -> #6E2A3A at the bottom (vertex colours), and a thin orange rim on the sun side
    { const sg = new THREE.PlaneGeometry(0.92, 0.57).rotateY(Math.PI), pa = sg.attributes.position as THREE.BufferAttribute, cc: number[] = [], top = new THREE.Color("#b85a50"), bot = new THREE.Color("#6e2a3a"), tmp = new THREE.Color();
      for (let i = 0; i < pa.count; i++) { tmp.copy(bot).lerp(top, clamp01(pa.getY(i) / 0.57 + 0.5)); cc.push(tmp.r, tmp.g, tmp.b); }
      sg.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
      const sm = new THREE.MeshBasicMaterial({ map: P.stampSoleTex2(), vertexColors: true }), sole = new THREE.Mesh(sg, sm);
      sole.position.z = -0.0015; sole.layers.set(NOINK); this.stamp.add(sole); this.soleMat = sm;
      const sr = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.012).rotateY(Math.PI).translate(0, 0.279, -0.002), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      sr.layers.set(NOINK); this.stamp.add(sr); this.stampMats.push(sr.material as THREE.MeshBasicMaterial); }
    // the painted label on the block's top panel (the side the lens sees while it sits on the sign), above the handle
    { const lm = new THREE.MeshBasicMaterial({ map: P.stampLabelTex() }), lab = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.097), lm);
      lab.position.set(0, 0.17, 0.2835); lab.layers.set(NOINK); this.stamp.add(lab); this.faces.push({ mesh: lab, mat: lm, n: V(0, 0, 1), gain: 1.1 }); }
    const sheen = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.5, 0.5) }), rimM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.stampMats.push(rimM);
    add2(new THREE.BoxGeometry(0.922, 0.012, 0.044).translate(0, 0.286, 0.02), sheen, false).layers.set(NOINK);   // wet ink on the rubber's leading top edge
    add2(new THREE.BoxGeometry(0.012, 0.54, 0.044).translate(-0.461, 0, 0.02), sheen, false).layers.set(NOINK);   // ... and down its left edge
    add2(new THREE.BoxGeometry(0.9, 0.006, 0.006).translate(0, 0.277, 0.268), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 1.0) }), false).layers.set(NOINK); // lacquer highlight on the top back edge
    for (const g of [new THREE.BoxGeometry(0.92, 0.016, 0.2).translate(0, 0.277, 0.165), new THREE.BoxGeometry(0.016, 0.57, 0.2).translate(0.452, 0, 0.165),
      new THREE.BoxGeometry(0.03, 0.03, 0.14).translate(0.045, 0.045, 0.36), new THREE.SphereGeometry(0.082, 14, 10, 0, Math.PI, 0, Math.PI / 2.4).scale(1, 1, 0.72).translate(0.006, 0.006, 0.497)])
      add2(g, rimM, false).layers.set(NOINK);
    this.stamp.visible = false; this.g.add(this.stamp);
    // audit A5 ADD: the falling stamp's shadow arrives first - a soft dark violet block slides over the path to the sign
    // foot in the 6 f before impact (anticipation)
    { const tex = P.ptex("atStampShadow", 128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.filter = "blur(9px)"; g.fillStyle = "#ffffff"; g.fillRect(24, 34, 80, 60); g.filter = "none"; });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color("#2e2450"), transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.layers.set(NOINK); m.renderOrder = 2; m.visible = false; this.g.add(m); this.stampShadow = m; }
  }
  private poseStamp(id: number, f: number, cam: THREE.Camera, vf: number) {
    const F = STAMP_F, s = TT.signB, x = TT.base[0] + s.dx, y = s.cy - STAMP_DY, z = TT.base[2] + s.z, df = f - F;
    // audit A4 P3: Sign B takes the hit: the panel wobbles +-1.5 deg, damped over 10 f (the mark rides on it)
    const wob = id === 13 && df >= 0 && df < 10 ? 0.026 * Math.sin((TAU * df) / 5) * (1 - df / 10) ** 2 : 0;
    if (this.signB) this.signB.rotation.z = wob;
    this.stampMark.visible = id === 13 && f >= F;
    if (this.stampMark.visible) { const k = 1 + 0.05 * (1 - clamp01(df / 3)); this.stampMark.scale.set(k, k, 1); this.stampMark.rotation.z = -0.14 + wob;
      this.stampMark.position.set(x + STAMP_DY * Math.sin(wob), s.cy - STAMP_DY * Math.cos(wob), z + 0.004); }
    // round 7: the lift runs on the VIDEO clock from the end of the hold (the picture clock is ~0.58x here: the old lift
    // crawled and hung face-on for ~10 video f); out of the frame ~8 video f after it leaves the sign
    const vL = vidAt(F + 6), kv = vf - vL;
    const st = this.stamp; st.visible = id === 13 && f >= F - 5 && kv <= 12;
    // ADD (shot 13): a short warm sun-flare streak across the low sun as the stamp lifts off the sign (video 1..13 of the lift)
    { const u = (kv - 1) / 12, on = id === 13 && u >= 0 && u <= 1; this.flare13.visible = on;
      if (on) { const sd = new THREE.Vector3().copy(this.sunD); this.flare13.position.copy(cam.position).addScaledVector(sd, 40); this.flare13.scale.set(16 * (0.6 + 0.4 * u), 0.32, 1);
        (this.flare13.material as THREE.SpriteMaterial).opacity = 0.42 * Math.sin(Math.PI * u); } }
    if (this.soleMat) this.soleMat.color.setScalar(id === 13 ? 1.3 : 1);
    // the fresh ink on the mark is wet for ~20 video f (a bright sheen that dulls), tinted by the scene like the panel
    { const wet = id === 13 && f >= F ? 1 - clamp01((vf - vidAt(F)) / 20) : 0; (this.stampMark.material as THREE.MeshBasicMaterial).color.copy(this.tint).multiplyScalar(0.97 * (1 + 0.32 * wet * wet)); }
    if (this.stampShadow) { const k = (f - (F - 6)) / 6, on = id === 13 && k >= 0 && k <= 1.2; this.stampShadow.visible = on;
      if (on) { const u = clamp01(k); this.stampShadow.position.set(x + 0.35 * (1 - u), 0.046, z + 0.35 + 4.0 * (1 - u) ** 1.3); this.stampShadow.scale.set(1.7 - 0.75 * u, 1, 1.5 - 0.6 * u); this.stampShadow.rotation.y = -0.14 * u;
        (this.stampShadow.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.min(1, u * 2.2) * (k > 1 ? (1.2 - k) / 0.2 : 1); } }
    if (id === 13) for (const sp of this.pickPuffs) sp.visible = false;
    for (const m of this.speed) m.visible = false;
    this.ring.visible = false; for (const m of this.flecks) m.visible = false;
    if (id !== 13) return;
    // impact (audit A4 P3): a white dust ring with 18 radial streaks for 6 f, and 11 red ink specks: 5 spatter onto the
    // panel round the mark, 6 arc out and land on the gravel at the sign's foot - all of them STAY (continuity into the
    // dissolve)
    if (df >= 0 && df <= 6) {
      const u = df / 6, sc = 0.7 + 1.1 * (1 - (1 - u) ** 3);
      this.ring.visible = true; this.ring.position.set(x, y, z + 0.035); this.ring.rotation.set(0, 0, -0.14); this.ring.scale.set(sc * 1.3, sc * 1.0, 1);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - u) ** 1.2;
      (this.ring.material as THREE.MeshBasicMaterial).color.copy(this.tint).multiplyScalar(1.2).lerp(new THREE.Color("#fff4e6"), 0.6);
    }
    if (df >= 0) this.flecks.forEach((m, i) => {
      const a = (i / this.flecks.length) * TAU + 0.4 + 0.3 * hash(i, 43), t = Math.min(df, 9), u = t / 9;
      m.visible = true; (m.material as THREE.MeshBasicMaterial).color.set("#d8242c").multiply(this.tint).multiplyScalar(1.25);
      if (i < 5) { // onto the panel face (flat on it), a short splat out from the mark
        const R0 = 0.34 + 0.12 * hash(i, 41), k = 1 - (1 - Math.min(1, t / 2)) ** 2;
        m.position.set(x + Math.cos(a) * R0 * 1.25 * k, y + Math.sin(a) * R0 * 0.75 * k, z + 0.006); m.rotation.set(0, 0, a); m.scale.setScalar(0.45 + 0.4 * hash(i, 44));
      } else { // an arc out toward the lens and down onto the gravel, then lying flat
        const v = 0.08 + 0.07 * hash(i, 41), gx = x + Math.cos(a) * (0.4 + v * 9), gz = z + 0.2 + 0.35 * hash(i, 45), y0 = y + Math.sin(a) * 0.26;
        const px = lerp(x + Math.cos(a) * 0.4, gx, u), pz = lerp(z + 0.04, gz, u), py = lerp(y0, 0.037, u * u) + 0.25 * Math.sin(Math.PI * u) * (1 - u);
        m.position.set(px, Math.max(0.037, py), pz);
        if (df < 9) { m.quaternion.copy(cam.quaternion); m.scale.setScalar(0.8 + 0.5 * hash(i, 44)); } else { m.rotation.set(-Math.PI / 2, 0, a); m.scale.setScalar(0.6 + 0.4 * hash(i, 44)); }
      }
    });
    { const k = df / 8; // audit A3 ADD: dust kicks off the ground at the sign's post bases on the slam
      for (let i = 0; i < 4; i++) { const sp = this.pickPuffs[i]; if (!sp) continue; sp.visible = k >= 0 && k <= 1; if (!sp.visible) continue;
        const sx = i < 2 ? -0.38 : 0.38, o = i % 2 ? 0.18 : -0.12; sp.position.set(x + sx + o, 0.08 + 0.12 * k, z + 0.1 + (i % 2) * 0.12); sp.scale.setScalar(0.18 + 0.34 * k);
        (sp.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - k); (sp.material as THREE.SpriteMaterial).color.copy(this.tint).multiplyScalar(1.2); } }
    if (!st.visible) return;
    // audit A4 P2 (it popped in 60 % inside the top of frame and hovered): ONE continuous fall from a block height above
    // the top frame edge (y + 2.6, a little toward the lens, tipped so the varnished top and the knob lead), ease-in
    // over 5 f to contact ON the beat with speed lines; 2 f squash, hold to F+6, then it lifts toward the lens, up-left
    // round 7 (audit A7 P2: on the way down it read as a box with a doorknob - the handle pointed AT the lens): it comes in
    // turned ~38 deg (handle to screen right), so the waisted neck, the collar and the red rubber band read in profile,
    // and squares up to the sign over the last frames
    const A = { p: V(x + 0.3, y + 2.6, z + 0.5), r: new THREE.Euler(-0.5, 0.66, 0.05) }, Bp = { p: V(x, y, z + 0.006), r: new THREE.Euler(0, 0, -0.14) };
    const C = { p: V(x - 0.75, y + 0.75, z + 0.95), r: new THREE.Euler(-0.35, -0.1, 0.1) };
    let p: THREE.Vector3, e: THREE.Euler, sx = 1, sz = 1;
    if (f < F) {
      const u = clamp01((f - (F - 5)) / 5), fall = u ** 1.6, ru = smooth(u); // enters the frame ~F-3 (squares up late: the profile reads on the way in)
      p = A.p.clone().lerp(Bp.p, fall); e = new THREE.Euler(lerp(A.r.x, 0, ru), lerp(A.r.y, 0, ru), lerp(A.r.z, -0.14, ru));
      sx = 1 - 0.04 * u; sz = 1 + 0.12 * u; // a stretch along the fall
      if (u > 0.3) this.speed.forEach((m, i) => { m.visible = true; const L = 0.6 + 0.3 * hash(i, 77), dx = -0.33 + i * 0.22;
        m.position.set(p.x + dx, p.y + 0.36 + L / 2, p.z + 0.05); m.quaternion.copy(cam.quaternion); m.rotateZ(Math.PI / 2); m.scale.set(L, 0.06, 1);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * clamp01((u - 0.3) / 0.3); });
    } else if (f <= F + 6) {
      p = Bp.p.clone(); e = Bp.r;
      const sq = [[1.08, 0.8], [1.05, 0.88], [1.02, 0.96]][Math.floor(df)] ?? [1, 1]; sx = sq[0]; sz = sq[1]; // floor: the picture clock is fractional
      if (df > 2) p.z += 0.004 * (df - 2);
      p.x += STAMP_DY * Math.sin(wob); e = new THREE.Euler(0, 0, -0.14 + wob); // rides the panel's wobble
    } else { // round 7 (audit A7 P2 "no hover"): ONE continuous lift on the video clock - it peels off toward the lens, turns
      // sideways (so the mirrored type reads upright) with a 6-10 deg tumble, and keeps rising and accelerating up-left
      // (>= 2.5 %H/f from the 2nd frame); the inked sole faces the lens only for its last ~4 f in the frame
      const k = Math.max(0, kv), u = clamp01(k / 9), turn = smooth((k - 0.5) / 4.5);
      p = Bp.p.clone().add(V(-0.12 * u - 0.85 * u * u, 0.05 * k + 0.028 * k * k, 0.9 * smooth(k / 3) + 0.2 * u));
      e = new THREE.Euler(-0.3 * smooth(k / 4) - 0.55 * u, (Math.PI - 0.1) * turn, lerp(-0.14, 0.03, smooth(k / 3)) + 0.16 * u, "YXZ");
      void C; }
    st.position.copy(p); st.rotation.copy(e); st.scale.set(sx, sx, sz);
  }

  // ======================================== lizards: on the plaque top (vista) and on the right sign post (trailhead) ========================================
  private liz: { grp: THREE.Group; body: THREE.Group; head: THREE.Group }[] = [];
  private lizV: Liz | null = null; private lizTH: Liz | null = null; private lizA: Liz | null = null;
  private makeLizard() {
    const skin = lam("atLizard", () => ({ color: "#c98a52" })), dark = lam("atLizardDk", () => ({ color: "#7a5236" })), eye = new THREE.MeshBasicMaterial({ color: "#1a1418" });
    const add2 = (grp: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material) => { const mm = new THREE.Mesh(g, m); mm.castShadow = true; grp.add(mm); return mm; };
    const grp = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
    add2(body, new THREE.SphereGeometry(1, 12, 8).scale(0.07, 0.024, 0.032), skin);
    for (const dx of [-0.03, 0, 0.03]) add2(body, new THREE.SphereGeometry(1, 8, 6).scale(0.012, 0.006, 0.022).translate(dx, 0.02, 0), dark);
    add2(body, new THREE.ConeGeometry(0.018, 0.13, 8).rotateZ(Math.PI / 2).translate(-0.13, -0.004, 0), skin);
    head.position.set(0.075, 0.01, 0);
    add2(head, new THREE.SphereGeometry(1, 10, 8).scale(0.036, 0.018, 0.022).translate(0.02, 0, 0), skin);
    for (const dz of [-0.014, 0.014]) add2(head, new THREE.SphereGeometry(0.0055, 6, 5).translate(0.03, 0.01, dz), eye);
    body.add(head);
    for (const [lx, lz] of [[0.04, 0.035], [0.04, -0.035], [-0.04, 0.035], [-0.04, -0.035]]) add2(body, new THREE.CylinderGeometry(0.006, 0.006, 0.04, 5).translate(lx, -0.02, lz), skin);
    grp.add(body); this.g.add(grp);
    const L = { grp, body, head }; this.liz.push(L); return L;
  }
  private buildLizard() {
    const pl = this.plaquePos(), a = this.makeLizard(), hh = 0.2 * PLAQUE_K; this.lizV = a;
    const m = M4(pl[0], floorY(pl[0], pl[2]), pl[2], pl[3]);
    a.grp.position.copy(V(0.14, 1.2 + hh * Math.cos(0.45) + 0.03, -hh * Math.sin(0.45) - 0.01).applyMatrix4(m));
    a.grp.rotation.y = pl[3] + Math.PI + 0.35; // head toward the tourist, three-quarter to the lens
    // trailhead: clinging head-up on the right post's front (back out, legs on the wood), push-ups; frame 0 = 1857
    const b2 = this.makeLizard(); this.lizTH = b2;
    b2.grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)));
    b2.grp.rotateX(0.12); b2.grp.position.set(TH.posts[1] - 0.02, 0.6, -0.01 + 0.036);
  }

  // ======================================== per frame ========================================
  private faceTint(L: LightState, ctx: SetCtx) {
    const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const k = THREE.MathUtils.clamp(lum(L.lit) / 1.52, 0.35, 1.08), mx = Math.max(...L.lit);
    let r = 0.62 + 0.38 * (L.lit[0] / mx), g = 0.62 + 0.38 * (L.lit[1] / mx), bb = 0.62 + 0.38 * (L.lit[2] / mx);
    const fw = V(0, 0, -1).applyQuaternion(ctx.cam.quaternion); fw.y = 0; fw.normalize();
    const sh = V(ctx.sunDir.x, 0, ctx.sunDir.z).normalize();
    const back = sstep(0.55, 0.9, fw.dot(sh)) * sstep(0.45, 0.2, ctx.sunDir.y);
    this.back = back; this.litK = k;
    if (back > 0) {
      // backlit faces sit in shade: cool lavender at morning, but a warm 8 % peach at the golden sunset (audit A1)
      const sm = Math.max(...L.shade), warm = L.showSun ? 1 : 0;
      const tr = lerp(0.7 + 0.3 * L.shade[0] / sm, 1.0, warm), tg = lerp(0.7 + 0.3 * L.shade[1] / sm, 0.93, warm), tb2 = lerp(0.7 + 0.3 * L.shade[2] / sm, 0.86, warm);
      r = lerp(r, tr, back * 0.6); g = lerp(g, tg, back * 0.6); bb = lerp(bb, tb2, back * 0.6);
    }
    const s = (0.45 + 0.55 * k) * (1 - 0.15 * back * (L.showSun ? 0.5 : 1));
    return this.tint.setRGB(r * s, g * s, bb * s);
  }
  private poseLed(id: number, f: number, vf: number) {
    // audit A2: a monotonic ease-out roll 0.00 -> value over the 25 f before the beat that lands EXACTLY on the beat
    // frame (1.67 % on pct2, 7.92 % on pct8) and holds; no overshoot notch. Landing accent: the DIGITS blink twice
    // (3 f off / 3 f on from beat + 2); the PIECES MISSING header never blanks.
    // audit A5 P2 (counter A stalled on 1.66 % for 7 f: the warp stretched the last step): the roll runs on the VIDEO
    // clock - an ease-out to target - 0.05 over ~25 f, then one hundredth per video frame (1.62 .. 1.66), the true
    // figure ON the beat's video frame
    const lands = [BEAT.pct2, BEAT.pct8], shownS = [ledShownAt(1.67, LED_LANDS.A, f, vf, id), ledShownAt(7.92, LED_LANDS.B, f, vf, id)];
    // shot 9: the label scrolls in once when the camera arrives. Audit A3: the digits (and the always-lit decimal point)
    // never blank or blink; the landing accent is a brightness pulse in the gain below
    const scroll = 1, blink = false; // audit A5 P3: the label is lit from shot 9's first frame (it re-typed itself after shot 8)
    for (let k = 0; k < 2; k++) {
      const off = false, s = shownS[k];
      // audit A4 P3: a 2 f dot-matrix glitch under the stamp slam (the digits stay 7.92 %)
      const gl = id === 13 && f >= STAMP_F && f < STAMP_F + 2 ? 1 + Math.floor(f - STAMP_F) : 0;
      const key = `${s}|${Math.round(scroll * 14)}|${gl}`;
      if (key === this.ledStr[k]) continue;
      this.ledStr[k] = key;
      const g = this.ledCv[k].getContext("2d")!, W = 1024, H = 333, L = P.LED_LAYOUT(W, H);
      g.clearRect(0, 0, W, H); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      const label = "PIECES MISSING".slice(0, Math.round(scroll * 14));
      P.ledText(g, label, L.lx, L.ly, L.lp, "#ffb444", null);
      const shown = blink ? s.replace(".", " ") : s;
      if (!off) P.ledText(g, shown, L.vx, L.vy, L.vp, "#ff3a26", null);
      if (gl) { // torn scan rows + stray lit dots
        for (let q = 0; q < 4; q++) { const y0 = Math.floor(hash(q + gl * 7, 81 + k) * (H - 40)), hh2 = 14 + Math.floor(hash(q, 82 + gl) * 30), dx = (hash(q + gl, 83) - 0.5) * 70;
          g.drawImage(this.ledCv[k], 0, y0, W, hh2, dx, y0, W, hh2); }
        for (let q = 0; q < 40; q++) { g.fillStyle = q % 3 ? "#ff3a26" : "#ffb444"; const xx = Math.floor(hash(q + gl * 13, 84 + k) * W / 16) * 16, yy = Math.floor(hash(q + gl * 5, 85) * H / 16) * 16; g.fillRect(xx, yy, 9, 9); }
      }
      this.ledTex[k].needsUpdate = true;
    }
    // landing "lock" flash in shot 10: 1.0 -> 1.6 -> 1.0 over 6 f, twice; a faint +-3 % scan shimmer; impact flicker
    // (2 f at 60 %) under the stamp in shot 13
    for (let k = 0; k < 2; k++) {
      let gain = 2.4 * (1 + 0.03 * Math.sin(vf * 1.6 + k * 1.7));
      const dl = f - lands[k];
      if (id === 10 && dl >= 0 && dl < 12) gain = 2.4 * (1 + 0.6 * Math.sin(Math.PI * ((dl % 6) / 6)));
      if (id === 13 && f >= STAMP_F && f < STAMP_F + 2) gain = 2.4 * 0.6;
      if (k === 1 && (id === 7 || id === 8 || (id === 9 && f < SHOTS[8].a + 30))) gain = 0; // Sign B is still under its tarp
      this.ledLit[k].color.setScalar(gain);
    }
  }
  private poseWind(f: number, id: number) {
    const bit = 1 << (id - 1);
    for (const I of this.winds) {
      for (let i = 0; i < I.n; i++) {
        // slow gusts + a ~0.6 Hz flutter (phase by position) so every bush visibly sways in a 2-3 s shot
        // audit A2: a visible 3-6 deg flutter at ~0.75 Hz (phase by position) that swells on the gust peaks
        const w = windAt(I.px[i], I.pz[i], f), fl = Math.sin((TAU * 46 * f) / VOICE_TOTAL + I.px[i] * 0.9 + I.pz[i] * 0.7) + 0.35 * Math.sin((TAU * 71 * f) / VOICE_TOTAL + I.px[i] * 1.7 - I.pz[i] * 1.1);
        const a = I.amp * (0.35 + w) + I.flut * fl * (0.55 + 0.6 * w), side = I.amp * 0.3 * Math.sin((TAU * 31 * f) / VOICE_TOTAL + i * 1.7);
        const k = I.hide[i] & bit ? 0 : 1; // audit A5 P2 (shot 6: a blurred tuft dead centre over her legs): out of this lens
        this.e.set(side, I.yaw[i], -a, "ZXY"); this.q.setFromEuler(this.e);
        this.m.compose(this.v.set(I.px[i], I.py[i], I.pz[i]), this.q, this.sc.set(I.s[i] * k, I.sy[i] * (1 - 0.03 * w) * k, I.s[i] * k));
        I.mesh.setMatrixAt(i, this.m);
      }
      I.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  private poseChips(id: number, f: number) {
    const F = STAMP_F;
    for (let i = 0; i < this.chipBase.length; i++) {
      const c = this.chipBase[i];
      let vis = c.showAt === -10 ? id >= 7 && id <= 13 : id >= 8 && id <= 13, pop = 1, hop = 0;
      let slide = 0;
      if (c.showAt === -13) { vis = id === 13; const big = i % 2 === 0, Lh = big ? 10 : 8; if (vis && f >= F && f < F + Lh) hop = (big ? 0.13 : 0.045) * Math.sin(((f - F) / Lh) * Math.PI) * (0.7 + 0.3 * hash(i, 5));
        if (vis && big && f >= F) slide = 0.09 * smooth((f - F) / Lh); }
      else if (id === 8 && c.showAt) { vis = f >= c.showAt; const u = clamp01((f - c.showAt) / 5); pop = u < 0.6 ? (u / 0.6) * 1.2 : 1.2 - 0.2 * ((u - 0.6) / 0.4); }
      if (id === 10 && f >= c.hideAt) vis = false;
      if (id > 10 && c.hideAt < Infinity) vis = false;
      const s = vis ? c.s * pop : 0, y = floorY(c.p[0], c.p[2]) + s * 0.2 + 0.03 + hop, px = c.p[0] + slide * Math.cos(c.yaw), pz = c.p[2] + slide * Math.abs(Math.sin(c.yaw)) + slide * 0.5;
      this.m.compose(this.v.set(px, y, pz), this.q.setFromEuler(this.e.set(hop * 4 + slide * 9, c.yaw, hop * 3)), this.sc.set(s, s * 0.6, s));
      this.chipsMarked.setMatrixAt(i, this.m); this.chipsMarkedCap.setMatrixAt(i, this.m);
      const ds = vis && c.dot ? Math.max(0.022, s * 0.3) : 0;
      this.m.compose(this.v.set(px, y + s * 0.26, pz), this.q.identity(), this.sc.set(ds, ds * 0.42, ds)); // (sits on the shard's cut face)
      this.chipDots.setMatrixAt(i, this.m);
    }
    this.chipsMarked.instanceMatrix.needsUpdate = true; this.chipsMarkedCap.instanceMatrix.needsUpdate = true; this.chipDots.instanceMatrix.needsUpdate = true;
    for (const d of this.divots) d.mesh.visible = id >= 10 && id <= 13 && (id > 10 || f >= d.at);
    for (const d of this.dust10) d.mesh.visible = (id === 10 && f >= d.at) || id === 13;
    // a beige puff where each Sign B chip is lifted (shot 10, 6 f)
    let pp = 0;
    for (const p of this.pickPuffs) p.visible = false;
    if (id === 10) for (const c of this.chipBase) { if (c.hideAt === Infinity || pp >= this.pickPuffs.length) continue; const k = (f - c.hideAt) / 6; if (k < 0 || k > 1) continue;
      const s = this.pickPuffs[pp++]; s.visible = true; s.position.set(c.p[0], floorY(c.p[0], c.p[2]) + 0.06 + 0.08 * k, c.p[2]); s.scale.setScalar(0.12 + 0.2 * k);
      (s.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - k); (s.material as THREE.SpriteMaterial).color.copy(this.tint).multiplyScalar(1.1); }
  }
  /** the shot's sky: 3-4 local clouds in the upper frame (drifting with the wind), two ravens circling, dusk stars + moon */
  private poseSky(id: number, f: number, vf: number, L: LightState) {
    const c = anchorCam(id), set = SHOTS[id - 1].set, night = L.name === "dusk", sunset = L.name === "sunset";
    const lay: [number, number, number, number][] = // sx, sy, distance, width (fraction of the frame width there)
      // round 7 (audit A7 P2: the hook's sky was an empty gradient): one cumulus peeking out left of the board top, one
      // right of the raven; drift on the loop clock (shot 16 df = fa -> the last frame = frame 0)
      id === 1 || id === 16 ? [[-0.97, 0.87, 320, 0.36], [0.95, 0.955, 340, 0.3]] :
      id === 2 ? [[-0.55, 0.78, 420, 0.5], [0.35, 0.86, 460, 0.42], [0.9, 0.7, 380, 0.3]] :
      [[-0.62, 0.8, 300, 0.48], [0.3, 0.9, 340, 0.4], [0.88, 0.66, 280, 0.32], [-0.05, 0.62, 360, 0.26]];
    const trailsSky = set === "trails" && id !== 13;
    if (trailsSky) {
      const morning = L.name === "morning", pal = morning ? { lit: "#fff3e6", mid: "#eee2ec", shade: "#9c94d0" } : L.look.cloud, k = morning ? 0.62 : 0.9;
      // bearing deg (0 = -z, 90 = +x), elevation deg, distance m, width m, seen from TT
      const W: [number, number, number, number][] = [[-14, 15, 330, 120], [6, 22, 360, 95], [24, 13, 300, 110], [41, 19, 340, 120], [57, 14, 310, 100], [73, 21, 350, 115], [90, 16, 320, 100]];
      for (let i = 0; i < this.skyClouds.length; i++) {
        const m = this.skyClouds[i], [bd, ed, D, wd] = W[i], B2 = THREE.MathUtils.degToRad(bd), E2 = THREE.MathUtils.degToRad(ed);
        m.visible = true;
        const p = V(TT.base[0] + D * Math.sin(B2) * Math.cos(E2), D * Math.sin(E2), TT.base[2] - D * Math.cos(B2) * Math.cos(E2));
        p.x += 0.027 * vf * (D / 300); // the same wind drift as every other sky, keyed to the absolute (video) frame
        m.position.copy(p); m.lookAt(TT.base[0], p.y, TT.base[2]); m.scale.set(wd * k, (wd * k) / 2, 1);
        const mat = m.material as THREE.MeshBasicMaterial, tx = P.cloudSoft(4 + (i % 4), pal);
        if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
        mat.color.setScalar(morning ? 1.0 : 1.06);
      }
    }
    const thSky = (id === 1 || id === 16) && L.name === "noon", cm = [0, 1, 2, 3].map((s2) => P.cloudHD(s2 + 4, thSky ? TH_CLOUD : L.look.cloud));
    const df = id === 16 ? f : vf - toNew(SHOTS[id - 1].a); // shot 16 continues into frame 0's layout (loop: f = vf - (VOICE_TOTAL - 1))
    for (let i = 0; i < this.skyClouds.length && !trailsSky; i++) {
      const m = this.skyClouds[i], d = lay[i];
      m.visible = !!d && L.name !== "blueprint" && !night;
      if (!m.visible) continue;
      const p = viewPoint(c, d[0], d[1], d[2], 7), ty = Math.tan(THREE.MathUtils.degToRad(c.fov / 2)), w = 2 * d[2] * ty * ASPECT * d[3] * 2.1;
      p.x += 0.027 * df * (d[2] / 300); // ~0.05 %w/f drift toward +x (the wind)
      m.position.copy(p); m.lookAt(c.pos[0], p.y, c.pos[2]); m.scale.set(w, w / 2, 1);
      const mat = m.material as THREE.MeshBasicMaterial, tx = cm[(i + (id === 16 ? 1 : id)) % 4]; // (shot 16 = shot 1's cloud shapes: loop seam)
      if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      mat.color.setScalar(sunset ? 1.0 : 1.08);
    }
    // ravens circling high (not in the vista: CHAR flies that pair); whole cycles per film
    const birdsOn = set !== "vista" && !night && L.name !== "blueprint";
    this.birds.forEach((s, i) => {
      s.visible = birdsOn; if (!birdsOn) return;
      const ctr = viewPoint(c, i ? 0.38 : -0.42, id === 4 ? 0.8 : 0.62, 70, 9), n = i ? 9 : 7, ang = (TAU * n * f) / VOICE_TOTAL + i * 2.4, R = 7 + 2 * i;
      s.position.set(ctr.x + Math.cos(ang) * R, ctr.y + Math.sin(ang * 2) * 1.2, ctr.z + Math.sin(ang) * R * 0.5);
      const flap = Math.floor((((f * 0.31 + i * 3) % 8) + 8) % 8), fr = flap === 1 || flap === 3 ? 1 : flap === 2 ? 2 : 0;
      const mat = s.material as THREE.SpriteMaterial, tx = P.birdTex(fr);
      if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      mat.rotation = 0.35 * Math.cos(ang); s.scale.set(2.2, 1.1, 1);
      mat.color.setRGB(sunset ? 0.7 : 1, sunset ? 0.6 : 1, sunset ? 0.8 : 1);
    });
    // first stars (dusk; three faint ones at the very top at sunset) and a thin crescent moon at dusk
    this.stars.forEach((s, i) => {
      const on = night || (sunset && i < 3); s.visible = on; if (!on) return;
      const sx = -0.85 + ((i * 0.37) % 1) * 1.7, sy = sunset ? 0.94 + 0.03 * (i % 2) : 0.5 + ((i * 0.61) % 1) * 0.45;
      s.position.copy(viewPoint(c, sx, sy, 600, 12));
      // round 7 (ADD shot 15): star 2 is the evening planet - steady (no twinkle), ~1.8x, a touch warm
      const planet = night && i === 2, tw = planet ? 1 : (0.75 + 0.25 * Math.sin((TAU * (23 + i * 5) * f) / VOICE_TOTAL + i)) * ((((f + i * 37) % 53) + 53) % 53 < 3 ? 1.55 : 1), sz = (night ? 3.2 : 2.2) * (planet ? 1.8 : 0.7 + 0.3 * ((i * 0.53) % 1)) * tw;
      s.scale.set(sz, sz, 1); (s.material as THREE.SpriteMaterial).opacity = sunset ? 0.5 : planet ? 1 : 0.9; (s.material as THREE.SpriteMaterial).color.setRGB(planet ? 1.25 : 1, planet ? 1.12 : 0.922, planet ? 0.9 : 0.807);
    });
    this.moon.visible = night;
    // audit A2: a clear rising moon, ~60 % of round 1's disc, screen-right and clear of the shot-15 tourist's head
    // round 5b: the moon sits in the open sky left of the board post in the shot-15 MS (the old spot, top right of the
    // anchor framing, hid behind the board; the peach disc at the left edge was a world.ts ring cloud, see lead requests)
    if (night) { this.moon.position.copy(viewPoint(id === 15 ? camAt(15, SHOTS[14].a + 8) : c, id === 15 ? -0.8 : 0.84, id === 15 ? 0.46 : 0.8, 600, 12)); this.moon.scale.setScalar(id === 15 ? 18 : 10); (this.moon.material as THREE.SpriteMaterial).color.setRGB(0.95, 0.96, 1.05); } // audit A5 P3: a cool white moon // round 5b: ~0.7 deg disc in shot 15 (60 % of the low sun)
  }
  private poseDevil(id: number, f: number, t: THREE.Color) { // f = VIDEO frame (idle spin / drift)
    // [lateral fraction, distance, framing frame (0 = the shot's opening), fade-in start]: where each devil spins
    // audit A3: ONE devil in the vista (left of the hero mounds, >= 180 m out) and one far one in the shot-10 Sign A hold
    // (>= 250 m, off to the left behind the mesas; gone before the truck to Sign B so it never stands behind a sign)
    // audit A5 P2 (shot 2: the ambience plays a dust devil, none in frame - the 192 m one stood BEHIND the hero mounds):
    // in front of the mounds, ~92 m out at ~0.2 W of the end framing, drifting ~1.2 m/s downwind
    // round 5b (audit A5 ADD): a thin far devil screen-right on the shot-3 flats, a second small one far right in the
    // shot-10 A medium
    const SPOT: Record<number, [number, number, number, number][]> = { 2: [[0.87, 150, SHOTS[1].b - 3, 0]], /* round 7 (audit A7 P2: it rose out of the pickup like smoke): far right flats, >= 0.2 W off the pickup's path */
      6: [[-0.78, 150, SHOTS[5].a + 4, 0]], /* round 7 (ADD shot 6 mystery): a far devil turning slowly in the banded hills behind the left post */ 3: [[0.82, 150, BEAT.pocketing, 0]], 10: [[-0.8, 270, BEAT.pct2, 0], [0.8, 310, BEAT.pct2, 0]] };
    const sps = id === 10 && f >= toNew(BEAT.withB - 20) ? [] : SPOT[id] ?? [];
    this.devils.forEach((D, n) => {
      const sp = sps[n], on = !!sp;
      D.g.visible = D.skirt.visible = D.debris.visible = on;
      if (!sp) return;
      const key = id * 10 + n;
      let xz = this.devilXZ.get(key);
      if (!xz) {
        const c = camAt(id, sp[2] || SHOTS[id - 1].a + 2);
        let [x, z] = groundAhead(c, sp[1], sp[0]);
        // keep it on open desert: off the dome footprints, away from the visitor centre and the lot
        for (let k = 0; k < 12; k++) {
          const hit = (id === 2 || id === 3 ? this.heroMounds : this.mounds).some(([mx, mz, mR]) => Math.hypot(x - mx, z - mz) < mR + 3) || (id !== 2 && (Math.hypot(x - 26, z + 86) < 30 || Math.hypot(x - LOT.c[0], z - LOT.c[1]) < 16));
          if (!hit) break; [x, z] = groundAhead(c, sp[1] - 7 * (k + 1), sp[0]);
        }
        xz = [x, z]; this.devilXZ.set(key, xz);
      }
      const x = xz[0] + (id === 2 ? 0.04 : 0.01) * (f - toNew(SHOTS[id - 1].a)) + 1.5 * cyc(2, f, 0.4 + n), z = xz[1] + 1.0 * cyc(3, f, 1.1 + n), y = floorY(x, z), sc = id === 10 ? 1.5 : id === 2 ? 1.25 : 1; // drifts downwind (round 7: the shot-2 devil ~12 m tall, ~1/3 of the domes)
      const fade = sp[3] ? sstep(sp[3], sp[3] + 16, f) : 1; // spins up
      // round 6 (audit A6 P3 shot 2: "a thin brown streak with a shrub floating on top"): a tall tapered funnel, base ~2 m,
      // top ~8 m wide, ~25 m tall, translucent tan, spinning ~1 rev/s
      D.g.position.set(x, y, z); D.g.scale.set(sc, sc * (0.9 + 0.1 * fade), sc);
      D.g.rotation.set(0, 0.05 * cyc(7, f), -0.17 + 0.03 * cyc(5, f, 0.8 + n)); // leans ~10 deg downwind
      // the streaks twist with height (in the texture) and the column turns 0.4 turns / s
      const spin = id === 2 ? 1.0 : 0.4; D.tex[0].offset.x = -(((f * spin) / 30) % 1); D.tex[1].offset.x = (((f * spin * 0.62) / 30) % 1);
      const tan = new THREE.Color(id === 2 ? "#cfa47a" : "#c98e62").multiply(t).multiplyScalar(1.1), pulse = 0.9 + 0.1 * cyc(4, f, 2 + n);
      D.mats.forEach((m, i) => { m.color.copy(tan); m.opacity = (i ? 0.3 : 0.42) * (id === 2 ? 1.1 : 1) * pulse * fade; }); // (round 7: 40-50 % in shot 2)
      D.skirt.position.set(x, y + 0.08, z); D.skirt.rotation.y = -f / 9; D.skirt.scale.setScalar(sc);
      const sk = D.skirt.material as THREE.MeshBasicMaterial; sk.color.copy(tan).multiplyScalar(1.15); sk.opacity = 0.5 * pulse * fade;
      for (let i = 0; i < 24; i++) { // 16 sand grains orbiting the base + 8 lifted up the funnel
        const low = i < 16, a = f / (low ? 5 + (i % 3) : 7 + (i % 4)) + i * 1.9, R = (low ? 0.6 + 0.9 * hash(i, 3) : 0.4 + 0.8 * hash(i, 3)) * sc, h = (low ? 0.1 + 0.6 * hash(i, 4) : 1.2 + 5 * hash(i, 4) ** 1.3) * sc;
        this.m.compose(this.v.set(x + Math.cos(a) * R * (1 + h * 0.04) + h * 0.17, y + h, z + Math.sin(a) * R), this.q.setFromEuler(this.e.set(a, a * 1.3, 0)), this.sc.setScalar((low ? 0.6 + 0.6 * hash(i, 6) : 0.3 + 0.3 * hash(i, 6)) * fade * sc));
        D.debris.setMatrixAt(i, this.m);
      }
      D.debris.instanceMatrix.needsUpdate = true;
    });
  }
  private devilXZ = new Map<number, [number, number]>();
  private poseTumble(id: number, f: number, L: LightState) {
    for (const t of this.tumbles) t.visible = false;
    for (const p of this.puffs) p.visible = false;
    // straw weed; at dusk a warm rim (emissive) so it never turns into a navy scribble
    const dusk = L.name === "dusk";
    // round 5b: a touch darker / browner by day in the vista and at the trail heads (the shot-2 weed vanished into the sand)
    const vis2 = id === 2 || id === 8 || id === 9;
    this.tumbleMat.color.set(dusk ? "#e0cdb0" : vis2 ? "#cdb08a" : "#ffffff"); this.tumbleMat.emissive.set(dusk ? "#e6a08a" : "#c9a66b"); this.tumbleMat.emissiveIntensity = dusk ? 0.34 : vis2 ? 0.16 : 0.3; // a soft sun-through glow
    let pi = 0;
    for (const R of TUMBLE) {
      if (R.id !== id) continue;
      const v0 = toNew(R.f0), a = (f - v0) / R.dur; // f = VIDEO frame here; R.f0 = the cue word (picture), R.dur in video frames
      if (a < 0 || a > 1) continue;
      if (R.rel && !R.a[0] && !R.a[2]) { const c = camAt(R.id, R.relF ?? Math.round(R.f0 + R.dur / 2)), g1 = groundAhead(c, R.rel[0], R.rel[1]), g2 = groundAhead(c, R.rel[2], R.rel[3]); R.a = [g1[0], 0, g1[1]]; R.b = [g2[0], 0, g2[1]]; }
      const grp = this.tumbles[R.k], A = V(...R.a), Bv = V(...R.b), dist = A.distanceTo(Bv), d = a * dist;
      const p = A.clone().lerp(Bv, a);
      // hop curve + landing frames
      let hop = 0; const lands: number[] = [];
      if (R.hopDur) {
        for (let h = 0; h < R.hops; h++) { const hs = v0 + (R.dur * (h + 0.6)) / (R.hops + 0.4), k = (f - hs) / R.hopDur; lands.push(hs + R.hopDur); if (k >= 0 && k <= 1) hop = (R.hopH ?? 0.2) * 4 * k * (1 - k); }
      } else {
        const hl = dist / R.hops; hop = Math.abs(Math.sin((Math.PI * d) / hl)) * R.R * 0.45;
        for (let h = 1; h <= R.hops; h++) lands.push(v0 + (R.dur * h * hl) / dist);
      }
      grp.visible = true; grp.scale.set(R.R, R.R * (hop > 0 ? 1 : 0.94), R.R); // a slight squash while it rolls on the ground
      grp.position.set(p.x, floorY(p.x, p.z) + R.R * 0.92 + hop, p.z);
      const dir = Bv.clone().sub(A).normalize(), axis = V(-dir.z, 0, dir.x).normalize();
      grp.quaternion.setFromAxisAngle(axis, -d / R.R);
      for (const fl of lands) { // a dust puff where each hop lands (7 f)
        if (pi >= this.puffs.length) break;
        const k = (f - fl) / 7;
        if (k < 0 || k > 1) continue;
        const q = A.clone().lerp(Bv, clamp01((fl - v0) / R.dur)), s = this.puffs[pi++];
        s.visible = true; s.position.set(q.x, floorY(q.x, q.z) + 0.1 + 0.12 * k, q.z); s.scale.setScalar(R.R * (1.2 + 1.6 * k));
        (s.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - k); (s.material as THREE.SpriteMaterial).color.copy(this.tint).multiplyScalar(dusk ? 1.3 : 1.1);
      }
    }
  }
  private poseMotes(id: number, f: number, L: LightState) { // f = VIDEO frame
    const on = [4, 5, 6, 7, 8, 9, 13, 15].includes(id);
    this.motes.visible = on; if (!on) return;
    // shot 13: 44 backlit pollen / dust specks drifting across the low sun (warm #FFD9A0); 18 elsewhere
    const c = anchorCam(id), n = this.motePos.count, used = id === 13 ? n : 18, warm = L.name === "late" || L.name === "dusk" || L.name === "morning" || L.name === "sunset";
    for (let i = 0; i < n; i++) {
      const d = 1.2 + 2.6 * hash(i, 61), sx = -0.95 + 1.9 * hash(i, 62), sy = -0.7 + 1.4 * hash(i, 63);
      const p = viewPoint(c, sx, sy, d);
      const sp = 0.012 + 0.01 * hash(i, 64), span = 3.0, u = ((hash(i, 65) * span + sp * f) % span) / span; // drift +x, wraps with a fade
      p.x += (u - 0.5) * span; p.y += 0.06 * Math.sin((TAU * (9 + i) * f) / VOICE_TOTAL + i);
      this.motePos.setXYZ(i, p.x, p.y, p.z);
      const a = i >= used ? 0 : Math.min(1, u / 0.15, (1 - u) / 0.15) * (0.35 + 0.25 * hash(i, 66)) * (id === 13 ? 1.4 : 1);
      this.moteCol.setXYZW(i, warm ? 1.0 : 0.95, warm ? 0.82 : 0.9, warm ? 0.6 : 0.8, a);
    }
    this.motePos.needsUpdate = true; this.moteCol.needsUpdate = true;
  }
  private poseGlints(set: string, f: number, L: LightState, id: number, vf: number) {
    let k = 0;
    // loop seam: no hashed glint in the first / last 6 video frames (frame 0 = the last frame, both clean)
    const day = (L.name === "noon" || L.name === "dim" || L.name === "late" || L.name === "morning" || L.name === "sunset") && vf >= 6 && vf <= VOICE_TOTAL - 7;
    for (const g of this.glints) {
      if ((g.set === "trails13" ? id !== 13 : g.set !== set) || !day || k >= this.glintSpr.length) continue;
      const ph = (((g.n * f) / VOICE_TOTAL + g.ph) % 1 + 1) % 1, life = (ph * VOICE_TOTAL) / g.n; // video frames since this glint's cycle began
      if (life >= 5) continue;
      const s = this.glintSpr[k++], u = life / 5, sz = g.size * Math.sin(u * Math.PI) * 1.4;
      s.visible = true; s.position.copy(g.p); s.scale.set(sz, sz, 1); (s.material as THREE.SpriteMaterial).rotation = 0.3 + u;
    }
    for (; k < this.glintSpr.length; k++) this.glintSpr[k].visible = false;
  }

  pose(ctx: SetCtx) {
    const { id, f, shot } = ctx, ext = shot.set === "trailhead" || shot.set === "vista" || shot.set === "trails", L = ctx.light;
    this.g.visible = ext;
    if (!ext) return;
    // unlit faces follow the light (dim on "vandalized", warm morning, peach backlit sunset, blue dusk)
    const t = this.faceTint(L, ctx); this.sunD.copy(ctx.sunDir);
    for (const F of this.faces) F.mat.color.copy(t).multiplyScalar(F.gain);
    if (L.name === "dusk") for (const F of this.faces) F.mat.color.multiply(DUSK_WARM); // the gooseneck lamps warm the letters
    // aerial haze toward the horizon colour (day: a cool lavender-blue), heat shimmer only at noon
    const day = L.name === "noon" || L.name === "dim" || L.name === "late";
    untone(L.fog, this.hazeCol); if (day) this.hazeCol.lerp(untone("#c9d4ee"), 0.5);
    // shot 10: -30 % haze (WORLD-INT A5 request); round 6 (audit A6): shot 9 0.32 (the far mesas' bands read), the noon
    // trailhead -35 % (the striped badlands behind her read in shots 1 / 4 / 5 / 6 / 16; frame 0 = the last frame)
    this.hazeK = id === 10 ? 0.29 : id === 9 ? 0.32 : day && shot.set === "trailhead" ? 0.27 : day ? 0.42 : L.name === "dusk" ? 0.3 : 0.36;
    // the loop clock (same as the cast's tau): shot 16 runs f - (TOTAL - 1), so its last frame renders every ambient
    // motion (wind, flags, grass, wisps, cloud shadows, glints, lizard) with exactly frame 0's phase
    // round 5: idle loops on the VIDEO clock; va = the loop clock (shot 16 runs vf - (VOICE_TOTAL - 1), so the last
    // video frame renders every ambient motion with exactly frame 0's phase)
    const vf = ctx.vf ?? f, fa = id === 16 ? vf - (VOICE_TOTAL - 1) : vf;
    // noon heat shimmer: ~2 Hz crawl, whole cycles per loop
    this.shimA = L.name === "noon" ? 0.55 : L.name === "dim" ? 0.3 : 0; this.shimPh = (TAU * 160 * fa) / VOICE_TOTAL;
    // badland two-tone split per light (audit A5 P1): day lifts the far side most, golden / dusk keep more contrast
    this.moundK = L.name === "noon" || L.name === "dim" ? 0.6 : L.name === "late" ? 0.5 : L.name === "morning" ? 0.42 : L.name === "sunset" ? 0.25 : 0.18;
    this.cld.set(-0.0013 * fa, 0.0004 * fa, day ? (id === 2 || id === 3 ? 0.6 : 0.3) : L.name === "morning" ? 0.14 : 0); // round 6: cloud shadows on the domes, ~0.5 m/s downwind (+x); round 7 (audit A7 P3 shot 2 "lit flat, no cloud shadows"): ~13 % violet patches in the vista
    this.poseWind(fa, id);
    this.poseFlip(id, vf);
    this.poseLed(id, f, vf);
    this.poseChips(id, f);
    this.poseStamp(id, f, ctx.cam, vf);
    this.poseSky(id, fa, vf, L);
    this.poseDevil(id, vf, t);
    this.poseTumble(id, vf, L);
    this.poseMotes(id, vf, L);
    this.poseGlints(shot.set, fa, L, id, vf);
    // per-shot groups (audit A3): no lot / road / parked vehicles in the vista, no visitor centre in the crane, the hero
    // mounds only in the vista, the sunset ridge only in shot 13, the research foreground only in shots 7-8
    this.lotGrp.visible = shot.set !== "vista"; this.vcGrp.visible = id !== 2; this.vistaMounds.visible = shot.set === "vista"; if (this.thMounds) this.thMounds.visible = shot.set === "trailhead";
    this.ridge13.visible = id === 13; this.fg7.visible = id === 7 || id === 8; this.cryGrp.visible = id !== 10; this.crySign.position.x = id === 7 ? CRY7_DX : 0;
    if (this.fg7.visible) this.fg7Flags.forEach((fl, i) => { const w2 = windAt(fl.position.x, fl.position.z, fa); fl.rotation.set(0, -0.5 * (1 - w2) + 0.3 * Math.sin(vf * 0.7 + i * 2), 0.16 * Math.sin(vf * 1.3 + i)); });
    // the visitor-centre windows warm up as the afternoon goes (shot 6) and glow at dusk
    { const warm = L.name === "dusk" ? 1 : id === 6 ? smooth((f - BEAT.honest) / 40) * 0.6 : 0;
      for (const w of this.vcWin) { const m2 = w.material as THREE.MeshBasicMaterial; m2.opacity = warm; m2.color.set("#ffb060").multiplyScalar(1.4 * warm); w.visible = warm > 0.01; } }
    // build-up glints round the sparkly rock in shot 1 (3 small chips, 4 f each, before the hero glint on "steal")
    this.preGlintSpr.forEach((sp, i) => { const g = this.preGlints[i], k = g ? (f - g.at) / 4 : -1; sp.visible = id === 1 && k >= 0 && k <= 1;
      if (sp.visible) { const sz = 0.09 * Math.sin(Math.PI * k); sp.position.copy(g.p); sp.scale.set(sz, sz, 1); (sp.material as THREE.SpriteMaterial).rotation = 0.4 + k; } });
    // a small dust puff off the split-flap box as the last card lands on "14"
    { const k = (vf - toNew(BEAT.tons14)) / 9; this.flipPuff.visible = id === 4 && k >= 0 && k <= 1; // (video clock)
      if (this.flipPuff.visible) { const F = FL; this.flipPuff.position.set(F.x + 0.05, F.y - F.h / 2 - 0.02 - 0.04 * k, F.z + 0.12 + 0.06 * k); this.flipPuff.scale.setScalar(0.12 + 0.22 * k);
        (this.flipPuff.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - k); (this.flipPuff.material as THREE.SpriteMaterial).color.copy(t).multiplyScalar(1.1); } }
    if (this.tarp) {
      // audit A3 P2: the tarp stays on through the 8 -> 9 match dissolve and comes off once Sign B is out of the frame
      this.tarp.visible = id === 7 || id === 8 || (id === 9 && f < SHOTS[8].a + 30);
      if (this.tarp.visible) { // the lower-right corner flap lifts in the gusts (+-6 cm), the TEST B card swings
        const pa = this.tarp.geometry.attributes.position as THREE.BufferAttribute, B0 = this.tarpBase, w = windAt(this.tarp.position.x, this.tarp.position.z, fa);
        // round 6: the drape's lower-right corner (below the belt rope) lifts 3-5 deg in the gusts + a hem ripple across
        for (let i = 0; i < pa.count; i++) { const x = B0[i * 3], y = B0[i * 3 + 1], k = sstep(0.12, 0.6, x) * sstep(1.2, 1.0, y), hm = sstep(1.1, 0.99, y);
          const fl = 0.07 * k * (0.35 + 0.65 * w) * (0.6 + 0.4 * Math.sin(vf * 0.7 + x * 6)), cu = 0.03 * k * Math.sin(vf * 0.55 + y * 5) * w, rp = 0.012 * hm * w * Math.sin(vf * 0.9 - x * 9);
          pa.setXYZ(i, x - fl * 0.2, y + fl * 0.5 + cu, B0[i * 3 + 2] + fl + rp); }
        pa.needsUpdate = true; this.tarp.geometry.computeVertexNormals();
        if (this.tarpTag) this.tarpTag.rotation.set(-0.06 + 0.08 * w * (0.5 + 0.5 * Math.sin(vf * 0.62)), 0, 0.07 * Math.sin(vf * 0.42)); // round 7: a gentle swing that keeps the card flat to the low lens
      }
    }
    for (const [k, m] of this.ledGlass.entries()) { // the glass sheen reads mostly when the screen is dark
      const dark = k === 1 && (id === 7 || id === 8 || (id === 9 && f < SHOTS[8].a + 30)); (m.material as THREE.MeshBasicMaterial).color.setScalar(shot.set === "trails" ? (dark ? 0.32 : 0.035) * this.litK : 0); m.visible = shot.set === "trails"; } // audit A5 P3: a lit screen keeps only a faint sheen (the streak washed the 0.00 % digits)
    // Sign A: both panels ride toon.ts swapPath, the same motion the swapping assistant's hands follow (carry-over)
    { const aX = TT.base[0] + TT.signA.dx, aY = TT.signA.cy, aZ = TT.base[2] + TT.signA.z, sp = swapPath(id, f - BEAT.swapping), neu = sp.neu;
      // audit A3 P2: the swapped-out panel keeps leaning on the post through shot 9 (it popped to the SPARE stack in the
      // 8 -> 9 match dissolve)
      const old = id === 9 ? swapPath(8, 999).old : sp.old;
      this.signA_old.visible = !!old && id <= 9;
      if (old) { this.signA_old.position.set(aX + old[0], aY + old[1], aZ + old[2]); if (id === 9) this.signA_old.rotation.set(0, Math.PI, -old[3]); else this.signA_old.rotation.set(0, 0, old[3]); }
      // audit A5 P2 (it stood behind reader A as a big maroon slab, his orange shirt merged into it): in shot 9 it lies
      // face down on the ground 1.5 m left of the JASPER post (the spare stack is gone after shot 8 too)
      if (old && id === 9) { this.signA_old.position.set(TT.base[0] + TT.signA.dx - 0.38 - 1.55, 0.05, TT.base[2] + 0.45); this.signA_old.rotation.set(Math.PI / 2, 0, 0.32); }
      this.spareGrp.visible = id <= 8;
      this.signA_new.visible = id >= 7;
      this.signA_new.position.set(aX + neu[0], aY + neu[1], aZ + neu[2]); this.signA_new.rotation.set(0, 0, neu[3]); }
    // glint + sparkle on "steal" (shot 1); the same sparkle on a chip at her feet on "steal?" (shot 6)
    const g0 = BEAT.steal1 - 1, gk = (f - g0) / 11, g6 = (f - (BEAT.steal2 - 1)) / 10;
    const s1 = id === 1 && gk >= 0 && gk <= 1, s6 = id === 6 && g6 >= 0 && g6 <= 1;
    this.sparkle.visible = s1 || s6;
    if (this.sparkle.visible) {
      const k = s1 ? gk : g6, pop = k < 0.25 ? (k / 0.25) * 1.25 : 1.25 - 0.25 * clamp01((k - 0.25) / 0.2), fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const sz = (s1 ? 0.3 : 0.25) * pop * fade;
      if (s1) this.sparkle.position.set(TH.glintRock[0] - 0.02, 0.24, TH.glintRock[2] + 0.03); else this.sparkle.position.set(FEET6[0], 0.24, FEET6[2]);
      this.sparkle.quaternion.copy(ctx.cam.quaternion); this.sparkle.rotateZ(0.3 + k * 0.6); this.sparkle.scale.set(sz, sz, 1);
    }
    // round 7 (ADD shot 1): with the glint, a small rainbow caustic splashes on the ground beside the rock (bell, 11 f)
    { const on = s1; this.caustic.visible = on; if (on) (this.caustic.material as THREE.MeshBasicMaterial).color.setScalar(0.9 * Math.sin(Math.PI * clamp01(gk))); }
    // the glint rock: faceted chip, not a flame (lower gain in the shot-4 wide where it sits behind his foot)
    (this.glint.material as THREE.MeshLambertMaterial).color.setScalar(id === 1 && gk >= 0 && gk <= 1 ? 1.15 + 0.6 * Math.sin(clamp01(gk) * Math.PI) : id === 5 ? 0.65 : id === 4 ? 0.96 : id === 6 ? 0.74 : 1.08);
    this.glintGrp.quaternion.copy(id === 5 ? this.glintQ5 : this.glintQ0);
    // wisps: this set's sheets scroll with the wind, in gusts (fade in / out ~20 f, whole cycles per film)
    for (const w of this.wisp2) {
      w.mesh.visible = w.set === shot.set || (w.set === "trails13" && id === 13) || (w.set === "th5" && id === 5);
      if (!w.mesh.visible) continue;
      w.tex.offset.x = -((((w.k * fa) / VOICE_TOTAL) % 1) + 1) % 1;
      const env = sstep(-0.35, 0.65, Math.sin((TAU * w.n * fa) / VOICE_TOTAL + w.ph)), gust = windAt(w.mesh.position.x, w.mesh.position.z, fa);
      const mat = w.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = w.base * env * (0.55 + 0.45 * gust) * (L.name === "dusk" ? 0.6 : 1);
      mat.color.copy(t).multiplyScalar(L.name === "sunset" || L.name === "morning" ? 1.15 : 1.05); if (w.tint) mat.color.multiply(w.tint);
    }
    // cloud shadows drift with the wind at ~1.5 m/s (noon / dim / late only; 6x faster through the shot-6 relight, so
    // the afternoon visibly passes); the shot-4 sweep on "vandalized"
    for (const s of this.shadowMeshes) {
      s.mesh.visible = day && (s.set === "th" ? shot.set !== "trails" : shot.set === "trails");
      const fast = id === 6 ? (5 * Math.max(0, f - SHOTS[5].a)) / TOTAL : 0;
      s.tex.offset.set(-(((fa / VOICE_TOTAL + fast) % 1) + 1) % 1, 0); // one tile (90 m) per film: the last frame flows into frame 0
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = L.name === "late" ? 0.24 : 0.3;
    }
    // audit A5 P3 (nothing motivated the dim): a cloud shadow sweeps in from screen left over 10 f from "vandalized" - 2,
    // holds on the board / ground / couple, and slides off screen right from "time" (the far mesas stay lit)
    // round 6 (audit A6 P1): the shadow slides off on the VIDEO clock over the 18 f before "time" ends + 2, so the board is
    // back to noon brown on its last ~10 f before the 4 -> 5 dissolve (it covered the board through the dissolve)
    const vTE = toNew(BEAT.timeEnd), eIn = lerp(-14, 8, smooth((vf - toNew(BEAT.vandalized - 2)) / 12)); // round 7: video clock (the fast window)
    const e = vf < vTE - 16 ? eIn : lerp(8, 62, smooth((vf - (vTE - 16)) / 18));
    const swOn = id === 4 && f >= BEAT.vandalized - 2 && e < 61;
    for (const sw of this.sweeps) {
      sw.m.visible = swOn; if (!swOn) continue;
      sw.tex.repeat.x = sw.w / 60; sw.tex.offset.x = (sw.x0 - (e - 48)) / 60;
    }
    // flags, flyers and the dropped brochure flutter in the gusts (loop clock); in shot 6 the trailhead flag swings
    // round once with the relight (the wind backs as the afternoon goes)
    for (const fl of [this.flag, this.flag2]) {
      const pa = fl.mesh.geometry.attributes.position as THREE.BufferAttribute, w0 = windAt(fl.mesh.position.x, fl.mesh.position.z, fa);
      const gk = id === 6 && fl === this.flag ? 1 + 0.6 * smooth((f - (BEAT.but + 12)) / 40) : 1; // round 7 (ADD shot 6): the evening wind rises, the flag flaps harder
      for (let i = 0; i < pa.count; i++) {
        const bx2 = fl.base[i * 3], by = fl.base[i * 3 + 1], u = clamp01((bx2 - 0.06) / fl.w);
        const wave = (Math.sin(bx2 * 4.2 - (TAU * 47 * fa) / VOICE_TOTAL) * 0.16 * u + Math.sin(bx2 * 7.1 + by * 3 - (TAU * 71 * fa) / VOICE_TOTAL) * 0.05 * u) * gk;
        pa.setXYZ(i, bx2 * (0.92 + 0.08 * w0), by - u * u * 0.12 * (1 - w0), wave * (0.6 + 0.6 * w0));
      }
      pa.needsUpdate = true; fl.mesh.geometry.computeVertexNormals();
      fl.mesh.rotation.y = 0.3 * cyc(3, fa) - 0.15 + (id === 6 && fl === this.flag ? -0.9 * smooth((f - (BEAT.but + 12)) / 40) : 0);
    }
    this.flyers.forEach((m, i) => { const w2 = windAt(m.parent!.position.x, m.parent!.position.z, fa); m.rotation.x = -(0.12 + 0.5 * w2 * (0.6 + 0.4 * Math.sin((TAU * (53 + i * 6) * fa) / VOICE_TOTAL + i))); });
    if (this.brochure) { const w2 = windAt(this.brochure.parent!.position.x, this.brochure.parent!.position.z, fa);
      this.brochure.rotation.y = -(0.05 + 0.35 * w2 * (0.5 + 0.5 * Math.sin((TAU * 61 * fa) / VOICE_TOTAL))); }
    // shot 6: the wind snatches the top-right flyer off the trail-map kiosk on "want" and tumbles it across the trail
    { const W0 = CUE.want - 5, sn = id === 6 && f >= W0, fk = this.flyers[1]; if (fk) fk.visible = !sn; this.flyAway.visible = sn && f <= W0 + 39;
      if (this.flyAway.visible && fk) { const u = clamp01((f - W0) / 38), A = fk.parent!.position, Bp = V(2.8, 0.05, -3.6);
        this.flyAway.position.set(lerp(A.x, Bp.x, u) + 0.25 * Math.sin(u * 9), lerp(A.y, Bp.y, u * u) + 0.55 * Math.sin(Math.PI * u) + 0.08 * Math.sin(u * 23), lerp(A.z, Bp.z, u));
        this.flyAway.rotation.set(u * 9.5, u * 4 + 0.25, u * 6.3); } }
    if (this.curbLeaf) { const w2 = windAt(1.2, 1.3, fa); this.curbLeaf.rotation.x = -(0.35 + 0.55 * w2 * (0.55 + 0.45 * Math.sin((TAU * 83 * fa) / VOICE_TOTAL))); }
    this.pinFlags.forEach(([x, y, z], i) => {
      const w2 = windAt(x, z, fa), ya = -0.4 * (1 - w2) + 0.25 * Math.sin((TAU * (67 + (i % 5) * 4) * fa) / VOICE_TOTAL + i);
      this.m.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e.set(0, ya, 0.15 * Math.sin((TAU * 97 * fa) / VOICE_TOTAL + i * 2))), this.sc.setScalar(1)); this.pins.setMatrixAt(i, this.m);
    });
    this.pins.instanceMatrix.needsUpdate = true;
    // cup steam (trail heads, cool morning)
    this.steamSpr.forEach((s, i) => {
      const on = shot.set === "trails" && L.name === "morning"; s.visible = on; if (!on) return;
      const u = (((vf + i * 11) % 44) / 44); s.position.set(this.steam.x + 0.03 * Math.sin(u * 6 + i) + 0.05 * u * windAt(this.steam.x, this.steam.z, fa), this.steam.y + u * 0.32, this.steam.z + u * 0.05);
      s.scale.setScalar(0.04 + u * 0.1); (s.material as THREE.SpriteMaterial).opacity = 0.32 * Math.sin(u * Math.PI);
    });
    // dusk practicals: lamp bulbs bloom, warm pools on the ground, moths round the lamps, red tail-lights, a car
    // pulling out along the road
    const dusk = L.name === "dusk";
    for (const lp of this.lamps) {
      // the kiosk post lamp flicks on just after "So some" (on 1 f, off 2 f, then on): emissive > 1 so it blooms
      const fo = lp === this.kioskLamp ? Math.floor(f - (BEAT.soSome + 9)) : 99;
      // audit A5 ADD shot 6: the two gooseneck sign lights flick on in the late light just before "steal?" (on 1 f, off
      // 2 f, then on; video clock, ~860)
      const gi = this.lamps.indexOf(lp), fl6 = id === 6 && (gi === 2 || gi === 3) ? Math.floor(vf - (toNew(BEAT.steal2) - 11 + (gi - 2) * 2)) : -1;
      const on = (dusk && (fo >= 3 || fo === 0)) || fl6 >= 3 || fl6 === 0;
      (lp.bulb.material as THREE.MeshBasicMaterial).color.set(on ? "#ffd9a0" : "#6a645a").multiplyScalar(on ? 3.2 : 1);
      (lp.glow.material as THREE.SpriteMaterial).color.set(on ? "#ffad58" : "#000000").multiplyScalar(on ? 0.9 * lp.k : 0);
      (lp.pool.material as THREE.MeshBasicMaterial).color.set(on ? "#ffad58" : "#000000").multiplyScalar(on ? 0.42 * lp.k : 0);
      lp.glow.visible = lp.pool.visible = on;
    }
    this.moths.forEach((s, i) => { const kl = i >= 5; s.visible = dusk && (!kl || f >= BEAT.soSome + 14); if (!s.visible) return; const lp = (kl ? this.kioskLamp : this.lamps[i < 3 ? 0 : 1]).bulb.position, a = vf / (5 + i) + i * 2.1, R = (i < 3 || kl ? 0.2 : 0.1) + 0.06 * Math.sin(vf / 7 + i);
      s.position.set(lp.x + Math.cos(a) * R, lp.y - 0.06 + 0.1 * Math.sin(vf / 4 + i * 1.3), lp.z + Math.sin(a) * R); s.scale.setScalar(i < 3 || kl ? 0.035 : 0.022); });
    for (const s of this.tailSpr) { s.visible = dusk; (s.material as THREE.SpriteMaterial).color.set("#ff3020").multiplyScalar(dusk ? 1.6 : 0); }
    this.carMove.visible = dusk && id === 15;
    if (this.carMove.visible) {
      const u = clamp01((f - SHOTS[14].a + 8) / 70), sAt = 6 + 34 * smooth(u);
      let acc = 0, px = TR_ROAD[0][0], pz = TR_ROAD[0][1], dx = 1, dz = 0;
      for (let i = 1; i < TR_ROAD.length; i++) { const a = TR_ROAD[i - 1], c = TR_ROAD[i], d = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (acc + d >= sAt) { const k = (sAt - acc) / d; px = lerp(a[0], c[0], k); pz = lerp(a[1], c[1], k); dx = (c[0] - a[0]) / d; dz = (c[1] - a[1]) / d; break; } acc += d; }
      this.carMove.position.set(px - dz * 1.5, 0.04, pz + dx * 1.5); this.carMove.rotation.y = Math.atan2(-dz, dx);
      for (const s of this.carTail) (s.material as THREE.SpriteMaterial).color.set("#ff3020").multiplyScalar(2.2);
    }
    // backlight rims on the trail-head signs (sunset gold, morning amber)
    const rimK = shot.set === "trails" ? this.back * (L.showSun ? 1 : L.name === "morning" ? 0.55 : 0) : 0;
    this.rimMat.color.set(L.sunCol).multiplyScalar(1.6 * rimK); for (const m of this.rims) m.visible = rimK > 0.02;
    for (const m of this.stampMats) m.color.set("#ffb070").multiplyScalar(id === 13 ? 1.2 : 0);
    // lizards (audit A2 gags): vista - two push-ups at 199 and 206, a 1 f head snap toward the tourist on "pocketing",
    // then scurries 0.3 m off the plaque edge over 10 f at 232. Trailhead - 2 push-ups at ~50 and a 10 cm dart up the
    // post at 115 (shot 1 only); loop-safe whole-cycle bobs elsewhere (frame 0 = frame 1857). Sign A - push-ups in the
    // empty hold (885, 905). Curb (shot 5) - push-ups on "whispered".
    const pushUp = (k: number, at: number, dur = 3) => (k >= at && k < at + dur ? Math.sin(((k - at) / dur) * Math.PI) : 0);
    { const v = this.lizV!, th = this.lizTH!;
      v.grp.visible = shot.set === "vista" && !(id === 3 && f >= BEAT.pocketing + 37);
      if (id === 3) {
        v.body.position.y = 0.011 * (pushUp(f, CUE.kept5) + pushUp(f, CUE.kept5 + 7));
        v.head.rotation.y = f >= BEAT.pocketing ? 0.6 : 0.05;
        const sc = smooth((f - (BEAT.pocketing + 27)) / 10); v.body.position.x = 0.3 * sc; v.body.rotation.z = -0.25 * sstep(0.6, 1, sc);
      } else { const lt = ((vf % 40) + 40) % 40; v.body.position.set(0, 0.012 * (lt < 8 ? Math.sin((lt / 8) * Math.PI) : 0), 0); v.body.rotation.z = 0; v.head.rotation.y = 0.08 * cyc(23, fa); }
      th.grp.visible = shot.set === "trailhead";
      const ph = ((((60 * fa) / VOICE_TOTAL) % 1) + 1) % 1, pb = ph < 0.2 ? Math.sin(((ph % 0.1) / 0.1) * Math.PI) : 0;
      // shot 1 (audit A3 ADD): two push-up bobs after "paperclip" (~72, ~78), a 10 cm dart up the post, then its head snaps
      // toward the glinting rock on "steal"
      th.body.position.y = 0.012 * pb + (id === 1 ? 0.014 * (pushUp(f, BEAT.paperclip + 27, 4) + pushUp(f, BEAT.paperclip + 33, 4)) : 0);
      th.body.position.x = id === 1 ? 0.1 * smooth((f - (BEAT.wanted + 4)) / 4) : 0; // body +x points up the post
      th.head.rotation.y = id === 1 && f >= BEAT.steal1 - 1 ? -0.7 : 0.25 * cyc(19, fa, 1.3);
      const sa = this.lizA!; sa.grp.visible = shot.set === "trails";
      const pa2 = (vf % 40) / 40, P9 = BEAT.please1; sa.body.position.y = id === 9 ? 0.02 * (pushUp(f, P9 - 3, 4) + pushUp(f, P9 + 3, 4) + pushUp(f, P9 + 17, 4) + pushUp(f, P9 + 23, 4)) : 0.012 * (pa2 < 0.2 ? Math.sin(((pa2 % 0.1) / 0.1) * Math.PI) : 0);
      sa.head.rotation.y = f >= BEAT.please1 && f < BEAT.another ? 0.5 : -0.2;
      sa.body.position.x = id === 9 ? 0.17 * smooth((f - 934) / 3) : 0; // round 6 (audit A6 ADD): darts off behind the post as the raven takes off
      const lc = this.lizC!; lc.grp.visible = shot.set === "trailhead";
      const Wh = BEAT.whispered; lc.body.position.y = id === 5 ? 0.012 * (pushUp(f, Wh) + pushUp(f, Wh + 5) + pushUp(f, Wh + 10)) + 0.02 * pushUp(f, BEAT.now, 4) : 0;
      lc.head.rotation.y = id === 5 && f >= BEAT.whisper ? 0.7 : 0.1 * cyc(17, fa);
      lc.body.position.x = id === 5 ? 0.1 * smooth((f - BEAT.now) / 3) : 0; } // a startled 10 cm dart on "now"
    // the wren bobs every ~0.8 s, cocks its tail, turns its head in 1 f snaps
    if (this.wren) { const w = this.wren, ph = (vf % 24) / 24, y0 = CRY.y + CRY.h / 2 + 0.022 + 0.07; w.grp.visible = shot.set === "trails" && id !== 10;
      const hop = (at: number) => (f >= at && f < at + 6 ? 0.09 * Math.sin(((f - at) / 6) * Math.PI) : 0), h1 = BEAT.professor + 14, h2 = BEAT.cialdini - 6;
      w.grp.position.y = y0 - 0.02 * (ph < 0.25 ? Math.sin((ph / 0.25) * Math.PI) : 0) + (id === 7 ? hop(h1) + hop(h2) : 0);
      w.grp.position.x = TT.base[0] + CRYSTAL_X - 0.24 + (id === 7 ? CRY7_DX : 0) + (id === 7 ? 0.08 * smooth((f - h1) / 6) - 0.08 * smooth((f - h2) / 6) : 0);
      w.tail.rotation.z = 0.5 + 0.25 * Math.sin((TAU * vf) / 18);
      const fl = vf % 20 < 2; w.head.rotation.y = fl ? [0.7, -0.6, 0.5, -0.5][Math.floor(vf / 20) % 4] : [0.0, 0.25, -0.2, 0.1][Math.floor(vf / 40) % 4]; }
    // ---- round A5 ----
    for (const m of this.s13) m.visible = id === 13;
    if (this.barPulse) { const P0 = toNew(BEAT.pct2) - 11, k = (vf - P0) / 6, on = id === 10 && k >= 0 && k <= 1; this.barPulse.visible = on;
      if (on) { const sc = 1 + 0.15 * Math.sin(Math.PI * k); this.barPulse.scale.set(sc, sc, 1); (this.barPulse.material as THREE.MeshBasicMaterial).color.copy(t).multiplyScalar(0.97 * (1 + 0.3 * Math.sin(Math.PI * k))); } }
    this.ledSpill.forEach((sp, k) => { const g = this.ledLit[k].color.r / 2.4, on = shot.set === "trails" && g > 0.05 && (id === 10 || id === 13 || id === 9);
      sp.visible = on; if (on) (sp.material as THREE.MeshBasicMaterial).color.setRGB(0.22 * g, 0.03 * g, 0.02 * g); });
    // shot 3: the hero face's quartz glints, one after another (3 f each, 7 f apart, a 35 f round; video clock)
    this.s3Spr.forEach((sp, i) => { const ph = (((vf - toNew(SHOTS[2].a)) % 35) + 35) % 35 - 7 * i, on = id === 3 && ph >= 0 && ph < 3 && !!this.s3Glints[i]; sp.visible = on;
      if (on) { const sz = 0.055 * Math.sin((Math.PI * (ph + 0.5)) / 3); sp.position.copy(this.s3Glints[i]); sp.scale.set(sz, sz, 1); (sp.material as THREE.SpriteMaterial).rotation = 0.3 + i; } });
    // shot 5: the half-buried chip by her toe glints once on "ours" (8 f star)
    { const g5 = this.ch5, k = g5 ? (f - (g5.at - 1)) / 8 : -1, on = id === 5 && k >= 0 && k <= 1; this.ch5Spr.visible = on;
      if (on && g5) { const sz = 0.16 * Math.sin(Math.PI * k); this.ch5Spr.position.copy(g5.p); this.ch5Spr.scale.set(sz, sz, 1); (this.ch5Spr.material as THREE.SpriteMaterial).rotation = 0.4 + k; } }
    // heat shimmer: the mirage band at the foot of the far terrain (noon: shots 2, 3, 10), wavering on the video clock
    // round 6 (audit A6 ADD shots 1 / 16: a faint heat shimmer behind her): also the trailhead noon shots, on the loop clock fa
    if (this.mirage) { const thM = (id === 1 || id === 16 || id === 4) && L.name === "noon", D = id === 2 ? 106 : id === 3 ? 88 : thM ? 92 : 84, on = (id === 2 || id === 3 || id === 10 || thM) && L.name === "noon"; this.mirage.visible = on;
      if (on) { const c = thM ? anchorCam(id) : camAt(id, id === 2 ? SHOTS[1].b - 3 : id === 3 ? BEAT.pocketing : BEAT.pleaseA + 20), [gx, gz] = groundAhead(c, D, 0), W = 2 * D * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) * ASPECT * 1.7;
        const vf = thM ? fa : ctx.vf ?? f; // (frame 0 and the last frame share fa = 0)
        this.mirage.position.set(gx, floorY(gx, gz) + 0.15, gz); this.mirage.rotation.set(0, Math.atan2(c.pos[0] - gx, c.pos[2] - gz), 0); this.mirage.scale.set(W, D * 0.022, 1);
        const pa = this.mirage.geometry.attributes.position as THREE.BufferAttribute, B0 = this.mirBase;
        for (let i = 0; i < pa.count; i++) { const bx2 = B0[i * 3], by = B0[i * 3 + 1]; pa.setY(i, by + (by > 0.2 ? 0.18 * Math.sin(bx2 * 31 + vf * 0.41) + 0.1 * Math.sin(bx2 * 73 - vf * 0.67) : 0)); }
        pa.needsUpdate = true;
        // round 6 (audit A6 P2 shot 2: the domes' bases dissolved into a pale band and floated): shot 2 keeps only a faint shimmer
        const mt = this.mirage.material as THREE.MeshBasicMaterial; mt.map!.offset.x = ((vf * 0.0021) % 1); mt.color.set(L.fog).multiplyScalar(1.06); mt.opacity = (id === 2 ? 0.12 : thM ? 0.16 : 0.3) + 0.05 * Math.sin(vf * 0.23); } }
    // ---- round A4 ----
    // the diptych foreground (rope + framers) in shots 9 (from the glide out to the two signs) and 10; the shot-13 junipers
    this.two9.visible = (id === 9 && f >= CUE.removed) || id === 10;
    this.fg10.visible = id === 10;
    for (const m of this.shot13Jun) m.visible = id === 13;
    // TRAIL OPEN plate: swings 3-5 deg on its chains in the gusts (loop clock)
    if (this.openPlate) { const w2 = windAt(0.72, 0.1, fa); this.openPlate.rotation.set(0.05 * w2 * Math.sin((TAU * 37 * fa) / VOICE_TOTAL + 0.6), 0, 0.03 + 0.055 * (w2 - 0.45) + 0.025 * Math.sin((TAU * 61 * fa) / VOICE_TOTAL)); }
    // lizards: Sign B's footing (push-ups in the B hold, a look at reader B's chip on "removed"), the shot-2 rock (two
    // push-ups as the crane passes, a head snap), the shot-7 crate rim (push-ups on "psychologist", then it turns to him)
    { const pushUp = (k: number, at: number, dur = 3) => (k >= at && k < at + dur ? Math.sin(((k - at) / dur) * Math.PI) : 0);
      const lb = this.lizB; if (lb) { lb.grp.visible = shot.set === "trails"; const M1 = BEAT.many1;
        lb.body.position.y = id === 9 ? 0.02 * (pushUp(f, M1 + 4, 4) + pushUp(f, M1 + 10, 4) + pushUp(f, CUE.removed + 6, 4)) : 0.012 * ((vf % 46) < 4 ? Math.sin(((vf % 46) / 4) * Math.PI) : 0);
        lb.head.rotation.y = id === 9 && f >= CUE.removed ? 0.6 : 0.1 * cyc(21, fa, 0.5); }
      const lv = this.lizV2; if (lv) { lv.grp.visible = id === 2; const P2a = CUE.petrified;
        lv.body.position.y = 0.012 * (pushUp(f, P2a + 4, 4) + pushUp(f, P2a + 10, 4)); lv.head.rotation.y = f >= P2a + 16 ? -0.6 : 0.15; }
      const lr = this.lizCr; if (lr) { lr.body.position.y = id === 7 ? 0.014 * (pushUp(f, CUE.psych, 4) + pushUp(f, CUE.psych + 6, 4)) : 0;
        lr.head.rotation.y = id === 7 && f >= CUE.psych + 12 ? 0.8 : 0.05; } }
    // shot 2: a 4-point glint sweeps across the hero slice's crystal flecks as the crane rises over it (~150-157)
    { const k = (f - 150) / 8, on = id === 2 && k >= 0 && k <= 1; this.sweepGlint.visible = on;
      if (on) { const n = V(-0.927, 0, 0.375), tg = V(0.375, 0, 0.927), p = V(-26.1, 0.6, -29.59).addScaledVector(n, 0.07).addScaledVector(tg, -0.34 + 0.68 * k); p.y += 0.22 - 0.38 * k;
        const sz = 0.22 * Math.sin(Math.PI * k) * (0.8 + 0.2 * Math.sin(f * 2.3)); this.sweepGlint.position.copy(p); this.sweepGlint.scale.set(sz, sz, 1); (this.sweepGlint.material as THREE.SpriteMaterial).rotation = 0.4 + k * 1.2; } }
    // dusk: two bats flit across the upper sky (2-3 f wing beats, erratic jinks)
    this.bats.forEach((sp, i) => { const on = L.name === "dusk" && shot.set === "trailhead"; sp.visible = on; if (!on) return;
      const fb = vf * 0.77, c = anchorCam(id), u = (((fb * (0.011 + 0.004 * i) + i * 0.47) % 1) + 1) % 1, sx = -1.1 + 2.2 * u + 0.08 * Math.sin(fb * 0.9 + i * 2), sy = 0.62 + 0.12 * i + 0.07 * Math.sin(fb * 0.55 + i * 1.3) + 0.04 * Math.sin(fb * 1.9);
      sp.position.copy(viewPoint(c, sx, sy, 60, 6)); const fr = Math.floor(vf / 2 + i) % 3, mat = sp.material as THREE.SpriteMaterial, tx = P.birdTex(fr);
      if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; } mat.color.set("#2a2440"); mat.rotation = 0.3 * Math.sin(fb * 0.8 + i); sp.scale.set(0.9, 0.45, 1); });
    // shot 6: a warm glint creeps along the board's top rail in the low late sun
    this.railGlint.visible = id === 6;
    if (id === 6) { const u = clamp01((f - SHOTS[5].a) / (SHOTS[5].b - SHOTS[5].a)), B = TH.board; this.railGlint.position.set(lerp(-B.w / 2, B.w / 2, u), B.cy + B.h / 2 + 0.145, B.z + 0.09);
      const k = smooth(clamp01((f - BEAT.but - 10) / 30)); this.railGlint.scale.setScalar(0.22 * k); (this.railGlint.material as THREE.SpriteMaterial).opacity = 0.8 * k; }
    // round 7 (shot 6 mystery): the raking late light finds the scratched '?' on the board (it fades up from "But" + 8
    // to "honest"), then one warm glint runs along its groove over 18 video f from "honest" (video clock: real speed)
    { const on = id === 6, rv = on ? smooth((f - (BEAT.but + 8)) / Math.max(1, BEAT.honest - BEAT.but - 8)) : 0;
      this.scratchQ.visible = rv > 0.01; (this.scratchQ.material as THREE.MeshBasicMaterial).opacity = 0.92 * rv;
      const u = on ? (vf - toNew(BEAT.honest)) / 18 : -1; this.qGlint.visible = u >= 0 && u <= 1;
      if (this.qGlint.visible) { const [lx, ly] = q6Path(u), c = Math.cos(Q6.rot), sn = Math.sin(Q6.rot), B = TH.board;
        this.qGlint.position.set(Q6.x + lx * c - ly * sn, Q6.y + lx * sn + ly * c, B.z + 0.02); const sz = 0.11 * Math.sin(Math.PI * u) * (0.85 + 0.15 * Math.sin(vf * 2.1));
        this.qGlint.scale.set(sz, sz, 1); (this.qGlint.material as THREE.SpriteMaterial).rotation = 0.3 + u * 2; } }
    this.poseA5b(id, vf, L, t, shot.set);
    this.poseHeap14(id, vf, fa);
    this.poseR6(id, f, vf, fa, L, t, ctx);
  }
}

/** round 6 (carry-over, POST's LED flicker): the exact string the LED counter draws. Shot 10 rolls on the VIDEO clock
 *  (an ease-out to target - 0.05 over ~25 f, then one hundredth per video frame), the true figure ON the land frame;
 *  before shot 10 "0.00%", after it the final value */
export const ledShownAt = (target: number, land: number, f: number, vf: number, id = 10) => {
  const ROLL = 30; let v: number; void f;
  if (id < 10) v = 0; else if (id > 10) v = target;
  else { const Lv = toNew(land), dv = Lv - vf; v = dv <= 0 ? target : dv <= 5 ? target - 0.01 * Math.ceil(dv) : (target - 0.05) * (1 - (1 - clamp01((vf - (Lv - ROLL)) / (ROLL - 5))) ** 3); }
  return (Math.round(Math.max(0, v) * 100) / 100).toFixed(2) + "%";
};
/** the picture frames the two counters land on (B: half a frame before floor(BEAT.pct8), carry-over) */
export const LED_LANDS = { A: BEAT.pct2, B: Math.floor(BEAT.pct8) - 0.5 };
/** tumbleweed routes: shot, mesh, start frame, frames, from, to, radius, hops. `rel` = [d0, sx0, d1, sx1] ground points
 *  ahead of the shot's mid camera (distance, lateral fraction of the half frame). Default hops bounce continuously;
 *  with hopDur the weed rolls on the ground and makes `hops` discrete hops of hopDur frames, hopH metres high. */
type Roll = { id: number; k: number; f0: number; dur: number; a: V3; b: V3; R: number; hops: number; rel?: [number, number, number, number]; relF?: number; hopDur?: number; hopH?: number };
const TUMBLE: Roll[] = [ // start frames keyed to words (a voice re-time follows)
  // audit A4 P2: the gag was in 9 shots (noise competing with the beats): THREE weeds only - far in the vista, a small
  // mid-ground one in the mystery pause, and the dusk one, which now rolls on behind the tourist through the MCU
  // round 5: start = a cue word (picture clock, converted with toNew), dur / hopDur = VIDEO frames (constant real speed)
  { id: 1, k: 0, f0: BEAT.sign1 - 22, dur: 42, a: [-3.4, 0, -3.8], b: [3.4, 0, -4.3], R: 0.2, hops: 3, hopDur: 7, hopH: 0.16 },          // audit A5 ADD: between the posts behind her ("Then she read one sign")
  { id: 2, k: 1, f0: BEAT.arizona + 21, dur: 36, a: [0, 0, 0], b: [0, 0, 0], R: 0.46, hops: 3, rel: [19, -1.05, 21.5, 0.0], relF: SHOTS[1].b - 6, hopDur: 8, hopH: 0.36 }, // audit A5 P2: across the crane's mid ground in front of the log row (video ~222-258)
  { id: 4, k: 0, f0: BEAT.warning - 22, dur: 34, a: [0, 0, 0], b: [0, 0, 0], R: 0.22, hops: 2, rel: [13, -1.15, 14, 1.15], relF: BEAT.warning - 10, hopDur: 7, hopH: 0.18 }, // audit A5 ADD: far behind the sign in the low wide
  { id: 6, k: 1, f0: BEAT.but + 21, dur: 70, a: [-5.5, 0, -9.5], b: [5.0, 0, -11.5], R: 0.16, hops: 3, hopDur: 10, hopH: 0.14 },        // ~40 px, the far trail behind the couple
  // audit A5 ADD shot 8: left to right behind the trail heads in the wide, just after "the trails," (~1.8 m/s, 2 hops)
  { id: 8, k: 1, f0: BEAT.trails + 2, dur: 34, a: [0, 0, 0], b: [0, 0, 0], R: 0.25, hops: 2, rel: [6.6, -1.05, 7.1, 0.85], relF: BEAT.trails + 9, hopDur: 8, hopH: 0.24 }, // round 6 (audit A6 ADD): ~130 px, through the foreground third
  // round 6 (audit A6 ADD): shot 3 behind the log (video ~297-333), shot 5 far along the path in the bokeh, shot 13 backlit (long shadow to the lens)
  { id: 3, k: 0, f0: BEAT.pocketing + 8, dur: 36, a: [0, 0, 0], b: [0, 0, 0], R: 0.24, hops: 3, rel: [7.2, -1.05, 8.2, 1.0], relF: BEAT.pocketing + 20, hopDur: 7, hopH: 0.2 },
  // round 7 (audit A7 P3: it rolled in the blur at the far left edge, its hop SFX had no source): 1.5x, across the open
  // ground ~1.5 m behind the couple, both hops in the clear (left of her, right of him); same start / speed / hop frames
  { id: 5, k: 0, f0: BEAT.leaned + 2, dur: 52, a: [-1.9, 0, 0.35], b: [2.6, 0, 0.15], R: 0.15, hops: 2, hopDur: 9, hopH: 0.15 }, // (~110 px at 1080: 1.5x its old on-screen size)
  { id: 13, k: 0, f0: BEAT.signDidnt + 4, dur: 50, a: [0, 0, 0], b: [0, 0, 0], R: 0.3, hops: 2, rel: [6.2, -1.15, 6.8, 1.15], relF: BEAT.signDidnt + 20, hopDur: 9, hopH: 0.2 },
  // audit A5 ADD shot 9: between and behind the two signs during the pull-back (video ~1300-1334)
  { id: 9, k: 1, f0: BEAT.withA - 28, dur: 36, a: tt([-4.6, 0, -2.4]), b: tt([1.6, 0, -2.9]), R: 0.2, hops: 2, hopDur: 8, hopH: 0.16 },
  { id: 15, k: 0, f0: BEAT.soSome + 3, dur: 62, a: [-2.1, 0, -1.3], b: [2.0, 0, -1.6], R: 0.28, hops: 2, hopDur: 8, hopH: 0.2 },        // behind the sign line, on through the MCU
];
/** shot 10 Sign B crowd (cast.ts results(): tt offsets + pick offset `off`); their chips vanish at 1166 + off */
const CROWD_B: [number, number, number][] = [[0.72, 0.95, 0], [-0.88, 0.4, 1], [1.08, 0.35, 0], [-0.62, 0.95, 1], [1.45, 1.0, 0]]; // = cast.ts CROWD10 (round 4 cluster)
/** shot 6: the chip at the woman's feet that catches the low sun on "steal?" */
type Liz = { grp: THREE.Group; body: THREE.Group; head: THREE.Group };
const DUSK_WARM = new THREE.Color(1.22, 1.0, 0.78);
/** the video frame the shot-4 heap starts its drop (LEAD A6 merge: it lands on 'tons') */
const HEAP_V0 = () => toNew(BEAT.tons14 + 12) - 6;
const easeOutQ = (u: number) => 1 - (1 - clamp01(u)) ** 3;
/** round 7 (shot 6 mystery): the scratched '?' on the board's lower-right margin (m, board-face coordinates) and the
 *  path of its glint (u 0..1 along the hook then the stem; the same curve scratchQTex draws, in plane-local metres) */
const Q6 = { x: 0.8, y: 2.5, w: 0.2, h: 0.25, rot: -0.12 };
const q6Path = (u: number): [number, number] => {
  const pxX = Q6.w / 256, pxY = Q6.h / 320, k = clamp01(u) * 1.25;
  let x: number, y: number;
  if (k < 1) { const t = -0.95 * Math.PI + k * 1.55 * Math.PI; x = 128 + Math.cos(t) * 70; y = 102 + Math.sin(t) * 64; }
  else { const q = (k - 1) / 0.25; x = lerp(150, 128, q); y = lerp(168, 218, q); }
  return [(x - 128) * pxX, (160 - y) * pxY];
};
/** round 7: the trailhead hook's cumulus: white crowns, lavender bellies (#8F98E2, the audit's #7884DF class) */
const TH_CLOUD = { lit: "#fdfaf3", mid: "#e4e6f6", shade: "#8f98e2" };
const FEET6: V3 = [TH.glintRock[0] - 0.02, 0, TH.glintRock[2] + 0.03];
/** round 6 (carry-over AUDIO / A6): the stamp's impact lands 2.5 VIDEO frames before "per-" (picture clock, fractional) */
const STAMP_F = picAt(vidAt(BEAT.permission) - 2.5);
/** round 7: the stamp (and its mark) land 0.19 m below Sign B's centre (was 0.13), so the new short text's MANY VISITORS
 *  line and most of TAKE THE WOOD. stay readable above the PERMISSION GRANTED mark */
const STAMP_DY = 0.19; // audit A3: the "steal?" sparkle on the hook's rock (in frame, right of her hem)

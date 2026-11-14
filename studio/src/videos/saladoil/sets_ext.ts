// EXTERIOR SETS of "The Oil Tanks That Were Mostly Water" (owner WORLD-EXT, build round 2026-11-14). A 1960s New Jersey
// waterfront oil-tank farm in painted low-poly 3D (Canvas2D textures from paint.ts, two-tone lit via build.ts lam):
//  - tanktop  (TK): the hero tank (riveted cream shell with rust runs, a flat plated roof, the red-orange rim rail, the
//                   round hatch with its neck, flange and propped lid), the GOLDEN OIL in the hatch (a glossy painted
//                   shader: sky window, toon ripple rings round the tape, a blooming glint, the collar's dark reflection,
//                   the shot-16 parting onto blue water), the tank man's yellow measuring tape + reel + plumb bob, the LOANS
//                   split-flap counter on the hatch platform rail (rolls from "borrowed", lands "$150,000,000" on "$150
//                   million"), the spiral stair to a landing + the vertical top ladder (no cage) he climbs in shot 4, the
//                   ground at the tank foot (foundation, manway, nozzle valves, the level gauge, drums, puddles, oil stains,
//                   weeds) for the shot-4 ground two-shot, rows of other tanks with stairs / rails / stencils, catwalks, pipe
//                   runs, a windsock, a roof vent steaming, the quay, the harbour with a docked tanker, a freighter + a tug
//                   under way, cranes, a hazy skyline; gulls circling.
//  - tankfarm (TF): the gate (posts, crossbar, the "ALLIED / VEGETABLE OIL" sign, open chain-link leaves), the fence with
//                   barbed wire, the guard hut, a 1960s tanker truck, drums, puddles, the hero tank with its stair, valve
//                   (one drip on "oil.") and base manifold, dozens of tanks, an elevated pipe rack, catwalks; the STORM
//                   version (shot 9): rain streaks, ground splashes, puddle rings, a wet sheen, drips off the sign, the
//                   BANKRUPT notice slapped on the sign on "bust".
//  - street   (ST): a grey 1963 street: sidewalk slabs, kerb, asphalt, 1960s facades, the firm's storefront with its dark
//                   door (the CLOSED card swings up on "shares"), the SHARES stock board (red arrows drop on "crashed"),
//                   the green newsstand with racks of papers and the headline bill (the paper spins in on "came out"),
//                   a hydrant, a mailbox, a wire bin, pigeons pecking, a loose sheet blowing.
// FIX ROUND 1 (audit A1): the shot-2 pipe riser + gate valve + gauge at TF.valve with a FAT glinting drip and its puddle,
// the gate leaves folded wide open, gooseneck lamps over the sign, tyre tracks / SLOW / hairline cracks / drain / hose / wet
// debris; a saturated blue storm (haze, scudding deck, hair-thin rain + curtains, splash bursts, puddle rings, navy
// puddles with the tank's reflection, rivulets, the beam's pour, sign drips, lightning on both thunder rolls, BANKRUPT
// 1.6 x 0.62 with a spray burst + a fluttering corner); the hatch zone (doubler pad, weld bead, radial seams + rivets,
// oil sheen, rust runs), the lid hinged at 115 deg, roof props, a per-light steel tint, the water reveal rebuilt (fine
// caustic network, depth gradient, meniscus, ripple rings, bubbles), a drifting glint, gull / cloud shadows, the shot-1
// sun glow + rays, far workers, burgees, ship smoke, noon cumulus, a perched gull startled by the shout, shot-7 briefcase
// + umbrella + motes, a gauge stand-pipe + gooseneck vent; the street's slate frieze, warm shop window, bigger CLOSED,
// OFFICES gold leaf, contact shade, awning shadow band, wet patches (red after "crashed"), paper bundles.
// Pure function of (shot, frame): idle life (gulls, steam, windsock, ripples, rain, ships, pigeons) runs on the VIDEO
// clock ctx.vf in whole cycles over VOICE_TOTAL; the loop shots 1 / 16 run it on tau (= vf in shot 1, vf - (VOICE_TOTAL
// - 1) in shot 16), so frame 0 and the last frame are identical. Story actions run on the picture clock f (BEAT).
import * as THREE from "three";
import { Kit, Batch, lam, boxGeo, V } from "./build";
import * as P from "./paint";
import { NOINK } from "./ink";
import { TK, TF, ST, V3 } from "./plan";
import type { LightName } from "./plan";
import { BEAT, SHOTS, LAST, smooth, clamp01, lightMixAt, camAt } from "./story";
import type { Cam } from "./story";
import { VOICE_TOTAL } from "./voicewarp";
import type { SetCtx } from "./ctx";

// ---------------- helpers ----------------
const TAU = Math.PI * 2, D2R = Math.PI / 180, ASPECT = 1080 / 1920;
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7 + 0.13) * 43758.5453; return v - Math.floor(v); };
const fract = (x: number) => x - Math.floor(x);
/** unsigned angular distance (rad) */
const angDist = (a: number, b: number) => { const d = (((a - b) % TAU) + TAU) % TAU; return Math.min(d, TAU - d); };
/** whole cycles over the narration (loop seam) */
const cyc = (n: number, v: number, ph = 0) => Math.sin((TAU * n * v) / VOICE_TOTAL + ph);
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
const M = (x: number, y: number, z: number, ry = 0, s: V3 = [1, 1, 1], rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone().setFromEuler(_e.set(rx, ry, rz, "YXZ")), new THREE.Vector3(...s));
/** a point on a circle round (cx, cz): angle th from +z toward +x (the plan's convention) */
const pol = (cx: number, cz: number, R: number, th: number): [number, number] => [cx + R * Math.sin(th), cz + R * Math.cos(th)];
const col = (key: string, c: string) => lam("sx_" + key, () => ({ color: c }));
const texM = (key: string, make: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam("sx_" + key, () => ({ map: make(), ...extra }));
const decalM = (key: string, make: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) =>
  lam("sx_" + key, () => ({ map: make(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...extra }));
const cutM = (key: string, make: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) =>
  lam("sx_" + key, () => ({ map: make(), alphaTest: 0.4, side: THREE.DoubleSide, ...extra }));
const box = (b: Batch, mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m?: THREE.Matrix4) =>
  b.add(boxGeo(V(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), V(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), 0, true), mat, m);
/** a box centred at (x, y, z), w x h x d, turned by yaw */
const cbox = (b: Batch, mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0, rx = 0, rz = 0) =>
  b.add(boxGeo(V(-w / 2, -h / 2, -d / 2), V(w / 2, h / 2, d / 2), 0, true), mat, M(x, y, z, yaw, [1, 1, 1], rx, rz));
const cyl = (r: number, h: number, seg = 24, open = false) => new THREE.CylinderGeometry(r, r, h, seg, 1, open).translate(0, h / 2, 0);
/** a solid rod between two points */
const rod = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r: number, seg = 10) => {
  const d = c.clone().sub(a), L = d.length(); if (L < 1e-4) return;
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  b.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), q, V(1, 1, 1)));
};
/** an arc of a horizontal ring (radius R, tube t) at height y round (cx, cz), from angle a to angle b (rad, a < b) */
const arcRing = (b: Batch, mat: THREE.Material, cx: number, cz: number, R: number, t: number, y: number, a: number, bb: number, seg = 96) => {
  const arc = bb - a; if (arc <= 0) return;
  const g = new THREE.TorusGeometry(R, t, 5, Math.max(8, Math.round((seg * arc) / TAU)), arc).rotateX(Math.PI / 2).rotateY(-(Math.PI / 2 - bb));
  b.add(g, mat, M(cx, y, cz));
};
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private cx: number, private cz: number, private R: number, private a0: number, private a1: number, private y0: number, private y1: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) { const a = this.a0 + (this.a1 - this.a0) * t; return target.set(this.cx + this.R * Math.sin(a), this.y0 + (this.y1 - this.y0) * t, this.cz + this.R * Math.cos(a)); }
}
/** fix r3 (audit A3 P3 shot 9: no barbed wire read on the fence): a concertina coil of razor wire along x (overlapping
 *  loops, radius r, one loop per `pitch` m) at height y, depth z */
class CoilX extends THREE.Curve<THREE.Vector3> {
  constructor(private x0: number, private x1: number, private y: number, private z: number, private r: number, private turns: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) { const a = TAU * this.turns * t; return target.set(this.x0 + (this.x1 - this.x0) * t + 0.4 * this.r * Math.sin(a), this.y + this.r * Math.cos(a), this.z + this.r * Math.sin(a)); }
}
const coil = (b: Batch, mat: THREE.Material, x0: number, x1: number, y: number, z: number, r: number, pitch: number) => {
  const turns = Math.max(1, Math.round(Math.abs(x1 - x0) / pitch));
  b.add(new THREE.TubeGeometry(new CoilX(x0, x1, y, z, r, turns), turns * 14, 0.007, 3, false), mat);
};
/** a pipe run through points (elbow balls, flanges every ~5 m, little ground stands under low horizontal runs) */
const pipeRun = (b: Batch, mat: THREE.Material, pts: V3[], r: number, stands = true) => {
  const flange = col("flange", "#6c6a68"), stand = col("pipeStand", "#5d5a58");
  for (let i = 1; i < pts.length; i++) {
    const a = V(...pts[i - 1]), c = V(...pts[i]); rod(b, mat, a, c, r, 12);
    const d = c.clone().sub(a), L = d.length(), n = Math.floor(L / 5);
    for (let k = 1; k <= n; k++) rod(b, flange, a.clone().addScaledVector(d, (k - 0.012) / (n + 1)), a.clone().addScaledVector(d, (k + 0.012) / (n + 1)), r * 1.5, 12);
    if (stands && Math.abs(d.y) < 0.01 && a.y < 1.6) for (let k = 0.5; k < L; k += 3.5) { const p = a.clone().addScaledVector(d, k / L);
      box(b, stand, p.x - 0.05, 0, p.z - 0.05, p.x + 0.05, p.y - r, p.z + 0.05); box(b, stand, p.x - r * 1.4, p.y - r - 0.04, p.z - 0.06, p.x + r * 1.4, p.y - r, p.z + 0.06); }
    if (i < pts.length - 1) b.add(new THREE.SphereGeometry(r * 1.08, 12, 8), mat, M(c.x, c.y, c.z));
  }
};
/** build a batch into `parent`, every mesh with ink weight `ink` (0 = never inked, still occludes) */
const buildInk = (b: Batch, parent: THREE.Object3D, ink = 1, cast = true) => {
  const g = new THREE.Group(); b.build(g, cast);
  for (const c of [...g.children]) { c.userData.ink = ink; parent.add(c); }
};
/** an unlit board face (signs that must be READ never grey out in the side light); its colour is set per light */
const faceMesh = (tex: THREE.Texture, w: number, h: number, alpha = false) =>
  new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, ...(alpha ? { transparent: true, alphaTest: 0.05 } : {}) }));
/** the screen point (sx, sy in -1..1) at distance D in front of camera c */
const viewPoint = (c: Cam, sx: number, sy: number, D: number) => {
  const pos = V(...c.pos), fw = V(...c.look).sub(pos).normalize(), rt = new THREE.Vector3().crossVectors(fw, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(rt, fw);
  const t = Math.tan((c.fov * Math.PI) / 360);
  return pos.addScaledVector(fw, D).addScaledVector(rt, sx * t * D * ASPECT).addScaledVector(up, sy * t * D);
};
const add3 = (o: V3, d: V3): V3 => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
/** the shared harbour wind (toward +x, a little +z), gusting in whole cycles */
const WIND = new THREE.Vector3(0.86, 0, 0.5).normalize();
const gust = (v: number, ph = 0) => 0.6 + 0.25 * cyc(7, v, ph) + 0.15 * cyc(19, v, ph * 1.7);

// ---------------- per-light look of the self-lit things (boards, oil, water, skyline) ----------------
type Look = { board: string; gold: string; deep: string; sky: string; sun: [number, number, number]; water: string; skyline: string; haze: number };
const LOOKS: Partial<Record<LightName, Look>> = {
  dawn_gold: { board: "#ffe6cc", gold: "#ffbc34", deep: "#8a4212", sky: "#ffd6b0", sun: [3.4, 2.2, 1.1], water: "#d9a6a0", skyline: "#c8a2b0", haze: 0.58 },
  noon: { board: "#ffffff", gold: "#ffc63c", deep: "#94541a", sky: "#e4f1ff", sun: [3.2, 3.0, 2.6], water: "#9cc4dc", skyline: "#a9b6cc", haze: 0.55 },
  late: { board: "#ffe8cc", gold: "#ffb42e", deep: "#8a4414", sky: "#ffd9b8", sun: [3.4, 2.1, 0.9], water: "#d4b0a0", skyline: "#c4a8b0", haze: 0.56 },
  storm: { board: "#d6dbe4", gold: "#d89a2a", deep: "#5a3a20", sky: "#c4ccd8", sun: [1.2, 1.2, 1.25], water: "#8a96a6", skyline: "#98a0ae", haze: 0.55 },
  street_grey: { board: "#eceef2", gold: "#e0a82a", deep: "#6a4a20", sky: "#dde2ea", sun: [1.4, 1.4, 1.4], water: "#9aa6b4", skyline: "#a8aebb", haze: 0.5 },
};
const _ca = new THREE.Color(), _cb = new THREE.Color();
const lookAt = (id: number, f: number) => {
  const m = lightMixAt(id, f), A = LOOKS[m.a] ?? LOOKS.noon!, B = LOOKS[m.b] ?? A, k = m.k;
  const c = (a: string, b: string) => _ca.set(a).lerp(_cb.set(b), k).clone();
  return { board: c(A.board, B.board), gold: c(A.gold, B.gold), deep: c(A.deep, B.deep), sky: c(A.sky, B.sky), water: c(A.water, B.water), skyline: c(A.skyline, B.skyline),
    sun: A.sun.map((v, i) => v + (B.sun[i] - v) * k) as [number, number, number], haze: A.haze + (B.haze - A.haze) * k };
};

/** fix r1 (audit A1 P2: the dawn roof read as orange sand, the same hue as the oil): a cool multiplier on the tank-top
 *  steel (roof, hatch zone, hero shell) under the warm low suns, so dawn lands peach-cream and the oil stays the gold */
const TOP_TINT: Partial<Record<LightName, [number, number, number]>> ={ dawn_gold: [0.76, 0.94, 1.25], late: [0.84, 0.97, 1.16], noon: [1, 1, 1] };

// ---------------- the golden oil (hero image of the film) ----------------
const OIL_VERT = /* glsl */ `uniform float uR; varying vec2 vP; void main(){ vP = position.xz / uR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const OIL_FRAG = /* glsl */ `
uniform float uPh, uRipK, uRing, uRingK, uOpen, uSwell, uT, uDrift, uSpark, uBub;
uniform float uFlash, uFilm, uPop, uCloud, uDrip, uDripK, uFat;
uniform vec3 uGold, uDeep, uSky, uSun, uWater, uWaterE;
uniform vec2 uRip, uGlint;
varying vec2 vP;
float hash1(float n) { return fract(sin(n * 91.345) * 47453.5453); }
/** fix r1 (audit A1: the reveal read as blue mosaic / woven tiles): a fine caustic NETWORK (thin bright lines, ~25 px
 *  cells at the P0 zoom), the classic iterated-warp water caustic; t drifts slowly */
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250.0, i = p; float c = 1.0, inten = 0.005;
  for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0);
}
/** a crisp crescent along the rim, centred on angle aL, between radii r0 and r1, tapering to its ends at +-span */
float crescent(vec2 q, float aL, float r0, float r1, float span) {
  float a = atan(q.y, q.x), da = abs(mod(a - aL + 3.14159265, 6.2831853) - 3.14159265);
  float r = length(q), mid = 0.5 * (r0 + r1), hw = 0.5 * (r1 - r0) * sqrt(max(0.0, 1.0 - (da / span) * (da / span)));
  return 1.0 - smoothstep(hw - 0.01, hw + 0.006, abs(r - mid));
}
void main(){
  vec2 p = vP; float r = length(p);
  // a few ripple rings travelling out from the tape (they die within ~0.4 of the radius) + one impact ring
  vec2 d = p - uRip; float dr = length(d) + 1e-4;
  float ph = dr * 34.0 - uPh;
  float fall = exp(-dr * 3.4) * uRipK;
  float ring = uRingK * exp(-pow((dr - uRing) * 12.0, 2.0)) * (1.0 - smoothstep(0.6, 1.3, uRing));
  // fix r2 (audit A2 ADD shot 4): a second, slower ring trailing the plunk's
  float r2 = uRing - 0.3; ring += uRingK * 0.6 * step(0.0, r2) * exp(-pow((dr - r2) * 11.0, 2.0)) * (1.0 - smoothstep(0.5, 1.2, r2));
  // fix r2 (loop shots): a golden drip runs off the collar lip into the oil near the far wall every ~3 s: a small ring
  { vec2 dc = vec2(-0.48, 0.58); float dd = length(p - dc), rr = uDrip * 0.42;
    ring += uDripK * step(0.001, uDrip) * exp(-pow((dd - rr) * 26.0, 2.0)) * (1.0 - uDrip) * 0.8; }
  float h = sin(ph) * fall + ring;
  float sw = uSwell * sin(p.x * 2.3 + uPh * 0.021) * sin(p.y * 2.9 - uPh * 0.017);
  vec2 q = p + (d / dr) * h * 0.05 + vec2(sw, -sw) * 0.04;
  float aL = atan(uGlint.y, uGlint.x);
  // honey body: a light pool on the glint side, deep amber round the far edge
  float pool = 1.0 - smoothstep(0.0, 1.4, length(q - uGlint * 0.6));
  vec3 c = mix(uDeep, uGold, 0.7 + 0.3 * pool);
  // slow oily swirl sheen
  float sv = 0.5 + 0.5 * sin(q.x * 5.0 + 1.6 * sin(q.y * 3.7 + uPh * 0.011));
  c = mix(c, uGold * 1.15, 0.16 * smoothstep(0.6, 0.95, sv));
  // the sky seen in it: a broad soft lighter window on the glint side
  c = mix(c, c * 0.55 + uSky * 0.6, 0.5 * (1.0 - smoothstep(0.22, 0.62, length((q - uGlint * 0.5) * vec2(1.0, 1.25)))));
  // fix r2 (audit A2 ADD shot 16): pale peach cloud reflections drift slowly across the gold (whole cycles: loop-safe)
  if (uCloud > 0.001) { vec2 cq = q * 1.3 + vec2(0.55 * cos(uDrift * 0.5), 0.35 * sin(uDrift * 0.5 + 1.1));
    float cl = smoothstep(0.35, 0.85, 0.5 + 0.28 * sin(cq.x * 3.1 + 0.6) * sin(cq.y * 2.3 - 0.4) + 0.22 * sin(cq.x * 5.3 - cq.y * 4.1 + 1.7));
    c = mix(c, c * 0.7 + vec3(1.0, 0.86, 0.72) * 0.42, uCloud * 0.32 * cl * (1.0 - smoothstep(0.55, 0.85, r))); }
  // fix r2 (audit A2 ADD shot 7): thin iridescent oil-film swirls on the gold, slowly turning
  if (uFilm > 0.001) { float fa = atan(q.y, q.x) + uT * 0.004, fr = length(q);
    float sw = sin(fa * 3.0 + fr * 14.0 + 1.3 * sin(fr * 6.0 - uT * 0.01));
    float band = smoothstep(0.86, 0.97, sw) * (1.0 - smoothstep(0.55, 0.8, fr)) * smoothstep(0.08, 0.2, fr);
    vec3 hue = 0.5 + 0.5 * cos(6.2831853 * (fr * 2.4 + fa * 0.16 + vec3(0.0, 0.33, 0.67)));
    c = mix(c, c * 0.6 + hue * 0.55, uFilm * band * 0.42); }
  // fix r2 (audit A2 ADD shot 7): 3 tiny bubbles swell and pop on the surface just before the bloop
  if (uPop > -0.5) { for (int k = 0; k < 3; k++) { float fk = float(k), tb = uPop - fk * 4.0;
      if (tb > 0.0 && tb < 9.0) { vec2 bc = uRip + vec2(0.14 * sin(fk * 2.1 + 0.4), 0.12 * cos(fk * 1.7 + 0.9)); float br = 0.012 + 0.03 * tb / 9.0, bd = length(p - bc);
        c += vec3(1.0, 0.92, 0.7) * (exp(-pow((bd - br) * 160.0, 2.0)) * 0.8 + (1.0 - smoothstep(br * 0.2, br * 0.5, bd)) * 0.25) * (1.0 - smoothstep(7.0, 9.0, tb)); } } }
  // fix r3 (audit A3 ADD shot 7): one FAT bubble swells up through the gold toward the reflection's chin from 1226 and is
  // gone as the 1238 pop ring starts (the pop is anticipated)
  if (uFat > 0.0 && uFat < 12.0) { float tb = uFat / 12.0; vec2 bc = uRip + vec2(-0.03, 0.08) * (1.0 - tb); float br = 0.022 + 0.06 * tb, bd = length(p - bc);
    float body = 1.0 - smoothstep(br * 0.88, br, bd), rimL = exp(-pow((bd - br) * 120.0, 2.0));
    c = mix(c, c * 0.8 + vec3(1.0, 0.9, 0.6) * 0.3, body * 0.55); c += vec3(1.0, 0.95, 0.78) * rimL * 0.8;
    vec2 hl = p - bc + vec2(0.35, 0.35) * br; c += vec3(1.0) * exp(-dot(hl, hl) / (br * br * 0.05)) * 0.9 * body; }
  // ripple crests: thin light lines, troughs a touch darker (toon)
  float crest = smoothstep(0.66, 0.9, sin(ph)) * fall + smoothstep(0.3, 0.8, ring);
  c = mix(c, uSky * 0.85 + uGold * 0.45, clamp(crest, 0.0, 1.0) * 0.85);
  c *= 1.0 - 0.2 * smoothstep(0.6, 0.95, -sin(ph)) * fall;
  // the glare of a FLAT glossy surface: two diagonal reflection bands across the glint side (a broad soft one and a
  // thin crisp one), broken up by the ripples, a hot spot on the broad band (blooms), and a thin rim crescent
  vec2 gd = normalize(uGlint), gp = vec2(-gd.y, gd.x);
  float gv = dot(q, gd), gu = dot(q, gp), fade = 1.0 - smoothstep(0.35, 0.8, abs(gu));
  float band1 = (1.0 - smoothstep(0.075, 0.1, abs(gv - 0.3 - 0.04 * h))) * fade;
  float band2 = (1.0 - smoothstep(0.018, 0.03, abs(gv - 0.5 - 0.04 * h))) * (1.0 - smoothstep(0.25, 0.6, abs(gu)));
  c = mix(c, uSky * 0.95 + uGold * 0.25, band1 * 0.62);
  c = mix(c, uSky * 1.1 + vec3(0.15), band2 * 0.85);
  vec2 s1 = q - gd * 0.3 - gp * 0.08;
  c += uSun * (0.55 * exp(-dot(s1, s1) * 160.0) + 0.18 * exp(-dot(s1, s1) * 25.0));
  c = mix(c, uSky * 1.05 + vec3(0.12), crescent(q, aL, 0.7, 0.76, 0.5) * 0.55);
  // the collar reflected: a dark rim band (wobbly) + a thin bright meniscus line at the very edge
  float rim = smoothstep(0.83 + h * 0.03, 0.89 + h * 0.03, r);
  c = mix(c, uDeep * 0.42, rim * 0.9);
  c += uGold * 0.6 * (smoothstep(0.935, 0.958, r) - smoothstep(0.962, 0.99, r));
  // shots 1 / 16: one slow drifting star glint on the gold (whole cycles over the film: the loop frame matches frame 0)
  if (uSpark > 0.001) {
    vec2 sp = q - vec2(0.32 * cos(uDrift) - 0.1, 0.26 * sin(uDrift * 2.0 + 0.7) + 0.08);
    float star = exp(-abs(sp.x) * 90.0 - abs(sp.y) * 9.0) + exp(-abs(sp.y) * 90.0 - abs(sp.x) * 9.0) + 1.6 * exp(-dot(sp, sp) * 900.0);
    c += uSun * 0.5 * uSpark * star * (0.75 + 0.25 * sin(uDrift * 23.0));
  }
  // fix r2 (audit A2 ADD shot 1): an 8 f four-point glint flashes on the gold on '1963' and again as the camera lifts
  if (uFlash > 0.001) { vec2 fp = q - vec2(0.22, -0.3);
    float st = exp(-abs(fp.x) * 60.0 - abs(fp.y) * 5.0) + exp(-abs(fp.y) * 60.0 - abs(fp.x) * 5.0) + 2.0 * exp(-dot(fp, fp) * 500.0);
    c += uSun * 0.7 * uFlash * st; }
  // shot 16: the gold parts onto blue WATER underneath: a wobbly disc with a radial depth gradient (deep navy at the edge,
  // bright cyan-blue in the middle), a fine drifting caustic network, two slow ripple rings, rising bubbles that pop on
  // "fake", a bright meniscus where the gold pulls back, and the gold film's bright leading edge
  if (uOpen > 0.001) {
    // fix r2 (audit A2 P2: a scalloped pentagon with a glowing ring read as a gem / portal): an irregular, soft edge (low
    // and odd harmonics), a thick curled GOLD lip rolling back over it, the inner meniscus at 40 %, gold flakes drifting on
    // the blue, a few bubbles
    float a = atan(p.y, p.x), e = uOpen * (1.0 + 0.075 * sin(a * 2.0 + 0.9 + uT * 0.012) + 0.045 * sin(a * 3.0 - 1.7 - uT * 0.017) + 0.022 * sin(a * 7.0 + 2.3 + uT * 0.03));
    float inW = 1.0 - smoothstep(e - 0.035, e + 0.005, r);
    vec2 cu = p * 2.3 + vec2(uT * 0.0019, uT * 0.0012);
    float cs = caustic(cu, uT * 0.035) + 0.6 * caustic(cu * 1.6 + 3.1, uT * 0.03 + 1.7);
    vec3 wc = mix(uWater, uWaterE, smoothstep(0.0, 1.0, r / max(e, 0.05)));
    wc = mix(wc, vec3(0.62, 0.89, 1.0), clamp(cs, 0.0, 1.0) * 0.6 * (1.0 - 0.5 * smoothstep(0.2, 1.0, r / max(e, 0.05))));
    for (int k = 0; k < 2; k++) { float rk = fract(uT * 0.012 + float(k) * 0.5) * e; float rw = exp(-pow((r - rk) * 40.0, 2.0)) * (1.0 - rk / max(e, 0.05)) * smoothstep(0.0, 0.15, rk / max(e, 0.05));
      wc = mix(wc, vec3(0.78, 0.95, 1.0), rw * 0.3); }
    for (int k = 0; k < 4; k++) { float fk = float(k), tb = uBub - fk * 4.0;
      if (tb > 0.0 && tb < 14.0) { vec2 bc = vec2(0.38 * sin(fk * 2.3 + 0.5), 0.34 * cos(fk * 1.7 + 1.1)) * min(e, 0.7);
        float br = 0.016 + 0.04 * tb / 14.0, bd = length(p - bc);
        float ring = exp(-pow((bd - br) * 80.0, 2.0)) * (1.0 - tb / 14.0), dotb = (1.0 - smoothstep(br * 0.4, br * 0.6, bd)) * (1.0 - smoothstep(0.0, 5.0, tb));
        wc += vec3(0.85, 0.97, 1.0) * (ring * 0.8 + dotb * 0.5); } }
    // gold film flakes adrift on the water (thin golden slivers that slide outward with the parting)
    for (int k = 0; k < 6; k++) { float fk = float(k), ang = fk * 1.13 + 0.6 + 0.05 * sin(uT * 0.02 + fk), rad = (0.25 + 0.5 * hash1(fk + 3.0)) * e * (0.85 + 0.15 * uOpen / 0.74);
      vec2 fc = vec2(cos(ang), sin(ang)) * rad, dq = p - fc; float rot = fk * 0.9 + uT * 0.004;
      vec2 lq = vec2(cos(rot) * dq.x + sin(rot) * dq.y, -sin(rot) * dq.x + cos(rot) * dq.y);
      float fl = 1.0 - smoothstep(0.6, 1.0, length(lq / vec2(0.034 + 0.02 * hash1(fk), 0.013)));
      wc = mix(wc, uGold * (0.95 + 0.25 * lq.y / 0.013), fl * 0.9); }
    float men = exp(-pow((r - (e - 0.03)) * 55.0, 2.0));
    wc = mix(wc, vec3(0.92, 0.99, 1.0), men * 0.34);
    // the lip's shadow on the water, just inside the edge
    wc *= 1.0 - 0.35 * (smoothstep(e - 0.06, e - 0.03, r) - smoothstep(e - 0.03, e - 0.005, r));
    c = mix(c, wc, inW);
    // the curled golden lip (~0.03 wide = 8-10 px at 1080 on the loop frame): a deep amber underside, a bright crest line,
    // a soft outer roll-off back into the flat gold
    float lip = smoothstep(e - 0.012, e + 0.004, r) - smoothstep(e + 0.026, e + 0.05, r);
    float crest = exp(-pow((r - (e + 0.012)) * 120.0, 2.0));
    c = mix(c, uDeep * 0.9 + uGold * 0.35, lip * 0.55);
    c += uGold * 1.1 * lip * smoothstep(e - 0.004, e + 0.02, r);
    c += (uSky * 0.6 + vec3(0.35)) * crest * 0.9;
  }
  gl_FragColor = vec4(c, 1.0);
}`;

// ---------------- storage tanks ----------------
type StairDef = { a0: number; a1: number; y0: number; y1: number };
type TankDef = { c: V3; r: number; h: number; roof: "cone" | "flat"; stair: StairDef | null; shell: number; detail: number; num?: string; numA?: number; numY?: number; skipRail?: number; mat?: string };
const RAIL_RED = () => col("railRed", "#c84a26");
const STEEL_GREY = () => col("stairSteel", "#857d72");
/** a spiral stair round a tank wall (r) from (a0, y0) to (a1, y1): treads, brackets, the outer stringer, handrail + mid rail
 *  (helices) and posts. Returns nothing; everything goes into b. */
const spiralStair = (b: Batch, cx: number, cz: number, r: number, s: StairDef, detail: number) => {
  const Rs = r + 0.43, n = Math.max(2, Math.round(Math.abs(s.y1 - s.y0) / 0.21)), steel = STEEL_GREY(), red = RAIL_RED();
  const tread = boxGeo(V(-0.13, -0.02, -0.36), V(0.13, 0.02, 0.36), 0, true);
  for (let i = 0; i <= n; i++) {
    const t = i / n, th = s.a0 + (s.a1 - s.a0) * t, y = s.y0 + (s.y1 - s.y0) * t, [x, z] = pol(cx, cz, Rs, th);
    b.add(tread, steel, M(x, y, z, th));
    if (detail > 0 && i % 5 === 0) { const [bx, bz] = pol(cx, cz, r + 0.38, th); b.add(boxGeo(V(-0.025, -0.32, -0.36), V(0.025, -0.02, 0.36), 0, true), steel, M(bx, y, bz, th)); }
  }
  const len = Math.hypot(Math.abs(s.a1 - s.a0) * (r + 0.8), s.y1 - s.y0);
  const helix = (R: number, dy: number, rad: number, mat: THREE.Material) =>
    b.add(new THREE.TubeGeometry(new Helix(cx, cz, R, s.a0, s.a1, s.y0 + dy, s.y1 + dy), Math.max(8, Math.ceil(len / 0.35)), rad, 5, false), mat);
  helix(r + 0.8, -0.06, 0.045, steel);
  helix(r + 0.8, 0.98, 0.028, red);
  if (detail > 0) helix(r + 0.8, 0.5, 0.02, red);
  const np = Math.max(2, Math.ceil(len / (detail > 0 ? 1.4 : 2.4)));
  for (let k = 0; k <= np; k++) { const t = k / np, th = s.a0 + (s.a1 - s.a0) * t, y = s.y0 + (s.y1 - s.y0) * t, [x, z] = pol(cx, cz, r + 0.8, th);
    box(b, red, x - 0.022, y - 0.05, z - 0.022, x + 0.022, y + 0.98, z + 0.022); }
};
/** one storage tank (wall, foundation, wind girder, top angle, roof, rim rail with a gap at the stair top, the stair, a
 *  stencilled number, and at detail >= 1 a manway, a base nozzle + valve and a roof vent) */
const tank = (b: Batch, O: V3, t: TankDef, sb?: Batch) => {
  const cx = O[0] + t.c[0], cz = O[2] + t.c[2], { r, h } = t;
  const shell = lam(t.mat ?? `sx_shell${t.shell}`, () => ({ map: P.rep(P.tankShellTex(t.shell, [0.55, 0.75, 0.9, 0.65][t.shell % 4], ["#ece3cf", "#e8e0cc", "#efe8d6", "#e4dac4"][t.shell % 4]), 4, 1) }));
  b.add(cyl(r, h, t.detail > 1 ? 128 : t.detail > 0 ? 80 : 56, true), shell, M(cx, 0, cz, hash(t.c[0], t.c[2]) * TAU));
  b.add(cyl(r + 0.38, 0.28, 64), texM("concrete", () => P.rep(P.concreteTex(), 6, 0.2)), M(cx, 0, cz));
  b.add(new THREE.TorusGeometry(r + 0.05, 0.08, 4, 96).rotateX(Math.PI / 2), col("girder", "#cfc4ac"), M(cx, h - 0.9, cz));
  b.add(new THREE.TorusGeometry(r, 0.06, 5, 96).rotateX(Math.PI / 2), col("topAngle", "#b8ac94"), M(cx, h, cz));
  if (t.roof === "cone") b.add(new THREE.ConeGeometry(r + 0.06, r * 0.1, 64, 1, true).translate(0, r * 0.05, 0), texM("coneRoof", () => P.rep(P.coneRoofTex(), 6, 1), { side: THREE.DoubleSide }), M(cx, h, cz));
  // rim rail (posts + 2 rings) with a gap where the stair arrives
  const red = RAIL_RED(), gapA = t.stair ? t.stair.a1 : 99, gw = 0.55 / r, Rr = r - 0.12, yr = h + (t.roof === "cone" ? 0.05 : 0);
  if (t.skipRail === undefined) {
    if (t.stair) { arcRing(b, red, cx, cz, Rr, 0.028, yr + 1.02, gapA + gw, gapA + TAU - gw); arcRing(b, red, cx, cz, Rr, 0.022, yr + 0.55, gapA + gw, gapA + TAU - gw); }
    else { arcRing(b, red, cx, cz, Rr, 0.028, yr + 1.02, 0, TAU); arcRing(b, red, cx, cz, Rr, 0.022, yr + 0.55, 0, TAU); }
    const np = Math.round((TAU * Rr) / (t.detail > 0 ? 1.1 : 2.2));
    for (let k = 0; k < np; k++) { const a = (k / np) * TAU; if (t.stair && angDist(a, gapA) < gw * 0.9) continue;
      const [x, z] = pol(cx, cz, Rr, a); box(b, red, x - 0.025, yr, z - 0.025, x + 0.025, yr + 1.03, z + 0.025); }
  }
  if (t.stair) spiralStair(sb ?? b, cx, cz, r, t.stair, t.detail);  // fix r3: sb = a non-casting batch (no saw-tooth stair shadows)
  if (t.num) {
    const a = t.numA ?? 0.3, w = Math.min(4.2, r * 0.62), hgt = w / 3;
    const g = new THREE.CylinderGeometry(r + 0.015, r + 0.015, hgt, 24, 1, true, a - w / (2 * r), w / r).translate(0, t.numY ?? h * 0.62, 0);
    b.add(g, decalM("stencil" + t.num, () => P.stencilTex(t.num!), { side: THREE.FrontSide }), M(cx, 0, cz));
  }
  if (t.detail > 0) {
    // manway (bolted cover) + a base nozzle with a gate valve and a red handwheel
    const am = t.stair ? t.stair.a0 + 0.55 : 0.5, [mx, mz] = pol(cx, cz, r + 0.04, am);
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24).rotateX(Math.PI / 2), col("manway", "#cbbfa6"), M(mx, 0.85, mz, am));
    b.add(new THREE.TorusGeometry(0.42, 0.03, 4, 24), col("manwayRim", "#8d826e"), M(mx + 0.04 * Math.sin(am), 0.85, mz + 0.04 * Math.cos(am), am));
    const an = am + 0.35, [nx, nz] = pol(cx, cz, r, an), [vx, vz] = pol(cx, cz, r + 0.55, an), pipe = col("pipeGrey", "#7f8a86");
    rod(b, pipe, V(nx, 0.6, nz), V(vx, 0.6, vz), 0.11);
    b.add(new THREE.BoxGeometry(0.3, 0.32, 0.26), col("valveBody", "#4f5a58"), M(vx, 0.6, vz, an));
    rod(b, col("valveStem", "#3a3a3a"), V(vx, 0.76, vz), V(vx, 1.05, vz), 0.02);
    b.add(new THREE.TorusGeometry(0.17, 0.022, 5, 18).rotateX(Math.PI / 2), col("wheelRed", "#c4321f"), M(vx, 1.05, vz));
    const [ex, ez] = pol(cx, cz, r + 1.6, an);
    rod(b, pipe, V(vx, 0.6, vz), V(ex, 0.6, ez), 0.11);
    if (t.roof === "cone") { const [rx, rz] = pol(cx, cz, r * 0.45, an + 2); b.add(cyl(0.18, 0.7, 12), col("vent", "#9a917f"), M(rx, h + r * 0.06, rz)); b.add(new THREE.ConeGeometry(0.34, 0.22, 12), col("vent", "#9a917f"), M(rx, h + r * 0.06 + 0.8, rz)); }
  }
};
/** a grated catwalk bridge between two roof points (deck, side rails, a light truss under it) */
const catwalk = (b: Batch, a: V3, c: V3) => {
  const A = V(...a), C = V(...c), d = C.clone().sub(A), L = d.length(), yaw = Math.atan2(d.x, d.z), pitch = -Math.asin(d.y / L), mid = A.clone().add(C).multiplyScalar(0.5);
  const deck = texM("grating", () => P.rep(P.gratingTex(), 1, 6));
  b.add(boxGeo(V(-0.42, -0.04, -L / 2), V(0.42, 0.0, L / 2), 0, true), deck, M(mid.x, mid.y, mid.z, yaw, [1, 1, 1], pitch));
  b.add(boxGeo(V(-0.4, -0.38, -L / 2), V(0.4, -0.06, L / 2), 0, true), col("truss", "#6d6862"), M(mid.x, mid.y, mid.z, yaw, [0.25, 1, 1], pitch));
  const red = RAIL_RED();
  for (const s of [-0.42, 0.42]) {
    const off = V(Math.cos(yaw) * s, 0, -Math.sin(yaw) * s);
    rod(b, red, A.clone().add(off).setY(A.y + 1.0), C.clone().add(off).setY(C.y + 1.0), 0.025);
    rod(b, red, A.clone().add(off).setY(A.y + 0.5), C.clone().add(off).setY(C.y + 0.5), 0.02);
    for (let k = 0; k <= Math.ceil(L / 1.5); k++) { const p = A.clone().lerp(C, k / Math.ceil(L / 1.5)).add(off); box(b, red, p.x - 0.02, p.y, p.z - 0.02, p.x + 0.02, p.y + 1.0, p.z + 0.02); }
  }
};
/** an oil drum standing (or lying when `lying`), its painted wrap by colour */
const drum = (b: Batch, x: number, z: number, colr: string, yaw = 0, lying = false) => {
  const m = texM("drum" + colr, () => P.drumTex(colr));
  const lidM = col("drumLid" + colr, colr);
  if (!lying) { b.add(cyl(0.29, 0.88, 20), m, M(x, 0, z, yaw)); b.add(new THREE.CircleGeometry(0.29, 20).rotateX(-Math.PI / 2), lidM, M(x, 0.881, z)); b.add(new THREE.TorusGeometry(0.28, 0.02, 4, 20).rotateX(Math.PI / 2), col("drumRim", "#3a3434"), M(x, 0.88, z)); }
  else b.add(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 20).rotateZ(Math.PI / 2), m, M(x, 0.29, z, yaw));
};
/** a wooden pallet */
const pallet = (b: Batch, x: number, z: number, yaw = 0) => {
  const w = texM("palletWood", () => P.boardsTex("#a98a62"));
  for (let k = 0; k < 5; k++) cbox(b, w, x + Math.cos(yaw) * (-0.48 + k * 0.24), 0.13, z - Math.sin(yaw) * (-0.48 + k * 0.24), 0.18, 0.025, 1.2, yaw);
  for (const s of [-0.5, 0, 0.5]) cbox(b, w, x + Math.sin(yaw) * s, 0.06, z + Math.cos(yaw) * s, 1.2, 0.11, 0.1, yaw);
};
/** ground decals: flat textured cards just above the ground */
const flat = (b: Batch, mat: THREE.Material, x: number, z: number, w: number, d: number, rot = 0, y = 0.012) =>
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat, M(x, y, z, rot));
/** a crossed weed clump (two upright cards) */
const weed = (b: Batch, x: number, z: number, s: number, i: number, y = 0) => {
  const m = cutM("weed" + (i % 4), () => P.weedTex(i % 4));
  for (const a of [0.3, 1.9]) b.add(new THREE.PlaneGeometry(0.55 * s, 0.55 * s).translate(0, 0.27 * s, 0), m, M(x, y, z, a + i));
};
/** a 1960s tanker truck (rounded cab, a cylindrical tank with a red stripe, chrome bumper, 10 wheels) at (x, z) facing yaw */
const tankerTruck = (b: Batch, x: number, z: number, yaw: number) => {
  const Mt = (dx: number, dy: number, dz: number, extra: THREE.Matrix4 = new THREE.Matrix4()) => M(x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, dy, z - Math.sin(yaw) * dx + Math.cos(yaw) * dz, yaw).multiply(extra);
  const cab = col("truckCab", "#b8332a"), dark = col("truckDark", "#2b2a30"), chrome = col("truckChrome", "#d6d8dc"), glass = col("truckGlass", "#4a5a7a");
  b.add(boxGeo(V(-1.1, 0.75, 2.3), V(1.1, 2.0, 4.2), 0, true), cab, Mt(0, 0, 0));
  b.add(boxGeo(V(-1.0, 2.0, 2.5), V(1.0, 2.75, 3.9), 0, true), cab, Mt(0, 0, 0));
  b.add(boxGeo(V(-0.95, 2.05, 3.9), V(0.95, 2.6, 3.95), 0, true), glass, Mt(0, 0, 0));
  b.add(boxGeo(V(-1.15, 0.5, 4.2), V(1.15, 0.8, 4.35), 0, true), chrome, Mt(0, 0, 0));
  b.add(boxGeo(V(-0.7, 0.9, 4.2), V(0.7, 1.7, 4.25), 0, true), chrome, Mt(0, 0, 0));
  b.add(boxGeo(V(-0.6, 0.55, -4.6), V(0.6, 0.85, 2.3), 0, true), dark, Mt(0, 0, 0));
  b.add(new THREE.CylinderGeometry(1.05, 1.05, 6.6, 32).rotateX(Math.PI / 2), texM("truckTank", () => P.drumTex("#e6e2d6")), Mt(0, 1.95, -1.25));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(1.05, 24, 12, 0, TAU, 0, Math.PI / 2).rotateX(s * Math.PI / 2), col("truckTankEnd", "#ded9cc"), Mt(0, 1.95, -1.25 + s * 3.3, new THREE.Matrix4().makeScale(1, 1, 0.35)));
  b.add(new THREE.CylinderGeometry(1.07, 1.07, 6.62, 32, 1, true, -0.25, 0.5).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), col("truckStripe", "#c23a24"), Mt(0, 1.95, -1.25));
  b.add(new THREE.CylinderGeometry(1.07, 1.07, 6.62, 32, 1, true, Math.PI - 0.25, 0.5).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), col("truckStripe", "#c23a24"), Mt(0, 1.95, -1.25));
  for (const dz of [3.1, -2.6, -3.7]) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 18).rotateZ(Math.PI / 2), dark, Mt(s * 0.92, 0.5, dz));
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.16, 12, 8), col("truckLamp", "#f4ead0"), Mt(s * 0.78, 1.2, 4.33));
};
/** a small cargo / tanker ship (hull with a pointed bow, red boot-top, white aft house, funnel with a red band, masts) */
const ship = (b: Batch, L: number, B: number, H: number, hull: string, kind: "tanker" | "freighter" | "tug") => {
  const sh = new THREE.Shape(); sh.moveTo(-L / 2, -B / 2); sh.lineTo(L * 0.3, -B / 2); sh.quadraticCurveTo(L * 0.47, -B * 0.4, L / 2, 0); sh.quadraticCurveTo(L * 0.47, B * 0.4, L * 0.3, B / 2);
  sh.lineTo(-L / 2, B / 2); sh.quadraticCurveTo(-L * 0.53, 0, -L / 2, -B / 2);
  const ex = (h0: number, h1: number) => new THREE.ExtrudeGeometry(sh, { depth: h1 - h0, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2).translate(0, h0, 0);
  b.add(ex(-1.2, 0.5), col("shipBoot", "#a8301f"));
  b.add(ex(0.5, H), col("shipHull" + hull, hull));
  b.add(ex(H, H + 0.25), col("shipDeck", "#8a7a66"));
  const white = col("shipWhite", "#ece8de"), win = col("shipWin", "#2c3446");
  if (kind === "tug") {
    box(b, white, -L * 0.12, H, -B * 0.3, L * 0.2, H + 2.2, B * 0.3); box(b, win, L * 0.2, H + 1.3, -B * 0.28, L * 0.205, H + 1.9, B * 0.28);
    b.add(cyl(0.45, 2.0, 12), col("shipFunnelBlack", "#22222a"), M(-L * 0.02, H + 2.2, 0));
    b.add(cyl(0.47, 0.5, 12), col("shipFunnelRed", "#c8361f"), M(-L * 0.02, H + 3.2, 0));
    return;
  }
  const ax = -L * 0.36;
  box(b, white, ax - L * 0.09, H, -B * 0.42, ax + L * 0.07, H + H * 1.2, B * 0.42);
  box(b, white, ax - L * 0.04, H + H * 1.2, -B * 0.5, ax + L * 0.05, H + H * 1.55, B * 0.5);
  box(b, win, ax + L * 0.05, H + H * 1.3, -B * 0.48, ax + L * 0.052, H + H * 1.48, B * 0.48);
  box(b, win, ax + L * 0.07, H + H * 0.5, -B * 0.4, ax + L * 0.072, H + H * 0.7, B * 0.4);
  b.add(cyl(B * 0.13, H * 0.9, 16), col("shipFunnelBlack", "#22222a"), M(ax - L * 0.06, H + H * 1.2, 0));
  b.add(cyl(B * 0.135, H * 0.22, 16), col("shipFunnelRed", "#c8361f"), M(ax - L * 0.06, H + H * 1.6, 0));
  const mast = col("shipMast", "#d8d2c4");
  if (kind === "freighter") { for (const fx of [L * 0.3, L * 0.05]) { box(b, mast, fx - 0.3, H, -0.3, fx + 0.3, H + H * 1.8, 0.3); rod(b, mast, V(fx, H + H * 1.6, 0), V(fx + L * 0.12, H + 0.5, 0), 0.18); }
    for (const hx of [L * 0.18, -L * 0.08]) box(b, col("shipHatch", "#4a6a5a"), hx - L * 0.06, H, -B * 0.32, hx + L * 0.06, H + 1.0, B * 0.32); }
  else { rod(b, col("shipPipe", "#c8a03a"), V(-L * 0.25, H + 0.6, 0), V(L * 0.42, H + 0.6, 0), 0.4); box(b, mast, L * 0.42 - 0.3, H, -0.3, L * 0.42 + 0.3, H + H * 1.4, 0.3);
    for (const k of [0, 1, 2, 3]) box(b, mast, L * (-0.15 + k * 0.15) - 0.15, H, -0.15, L * (-0.15 + k * 0.15) + 0.15, H + 3.5, 0.15); }
};
/** a dockside gantry crane (A-frame legs, a machinery house, a boom) */
const crane = (b: Batch, x: number, z: number, yaw: number, s: number, boomUp: number) => {
  const c = col("craneOrange", "#d8782a"), dk = col("craneDark", "#4a3a34"), Mc = (m: THREE.Matrix4) => M(x, 0, z, yaw).multiply(m);
  for (const [lx, lz] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) b.add(boxGeo(V(-0.4, 0, -0.4), V(0.4, 22, 0.4), 0, true), c, Mc(new THREE.Matrix4().makeTranslation(lx * s, 0, lz * s).multiply(new THREE.Matrix4().makeScale(s, s, s))));
  b.add(boxGeo(V(-6, 22, -5), V(6, 24, 5), 0, true), c, Mc(new THREE.Matrix4().makeScale(s, s, s)));
  b.add(boxGeo(V(-3, 24, -3), V(4, 29, 3), 0, true), dk, Mc(new THREE.Matrix4().makeScale(s, s, s)));
  b.add(boxGeo(V(-0.6, -0.6, 0), V(0.6, 0.6, 34), 0, true), c, Mc(new THREE.Matrix4().makeScale(s, s, s).multiply(M(0, 25, 3, 0, [1, 1, 1], -boomUp))));
};

// ---------------- the LOANS split-flap counter ----------------
type Flap = { top: THREE.Mesh; bot: THREE.Mesh; flap: THREE.Mesh };
const LOANS_TARGET = [1, 5, 0, 0, 0, 0, 0, 0, 0];
/** cell i's state at picture frame f in shot 1: every cell flips every 2 f from just after "borrowed" and lands on its
 *  target left to right, the last one on "$150 million" + 6 (the split-flap clatter 75..103) */
const flapState = (i: number, f: number) => {
  // fix r2 (audit A2 P3: random readings like '$938,765,543' flashed by): the board reads '$0' (blank leading flaps), every
  // flap riffles BLANK cards from just after "$150 million" + 8 (the clatter), then the digits lock LEFT TO RIGHT so the value
  // only ever builds up: '1' ~112, '5' ~118, the zeros 122-130 (2 f per flip; index 10 = the blank card)
  const T = 2, s = BEAT.million + 8 + i * 0.6, /* fix1 LEAD (CAM): rolls on the settled crane */ tgt = LOANS_TARGET[i], init = i === 8 ? 0 : 10;
  const lock = i === 0 ? BEAT.million + 15 : i === 1 ? BEAT.million + 21 : BEAT.million + 25 + ((i - 2) * 8) / 6, n = Math.max(1, Math.floor((lock - s) / T));
  const card = (k: number) => (k <= 0 ? init : k >= n ? tgt : 10);
  const u = (f - s) / T;
  if (u < 0) return { cur: init, from: init, to: init, p: -1 };
  if (u >= n) return { cur: tgt, from: tgt, to: tgt, p: -1 };
  const k = Math.floor(u); return { cur: card(k), from: card(k), to: card(k + 1), p: u - k };
};
const setHalf = (uv: THREE.BufferAttribute, d: number, top: boolean, flip = false) => {
  const u0 = d / 11 + 0.002, u1 = (d + 1) / 11 - 0.002, va = top ? 0.5 : 0, vb = top ? 1 : 0.5;
  const [lo, hi] = flip ? [vb, va] : [va, vb];
  uv.setXY(0, u0, hi); uv.setXY(1, u1, hi); uv.setXY(2, u0, lo); uv.setXY(3, u1, lo); uv.needsUpdate = true;
};

// ---------------- anchors derived from plan.ts (local to each set) ----------------
const H = TK.tank.h, R = TK.tank.r, HC = TK.hatch.c;
/** the hero tank's stair: a spiral round the wall from the ground (left of the camera side) up to a landing at y 8.0 under
 *  the vertical top ladder at TK.ladderTop's angle; the ladder runs from the landing to the rim (shot 4: he climbs it) */
const LAD_A = Math.atan2(TK.ladderTop[0], TK.ladderTop[2]), LAND_Y = 8.0;
const HERO_STAIR: StairDef = { a0: LAD_A - 5.2 * D2R - 7.6 / 5.8, a1: LAD_A - 5.2 * D2R, y0: 0.2, y1: LAND_Y - 0.2 };
/** the tank-farm hero: a spiral that passes the shot-9 ladder lender (TF.lenders[2], feet y 2.3 at 28 deg) and climbs
 *  leftward across the front of the tank to the roof */
const TFH = TF.hero;
/** fix r2 (A2 binding decision, shot 9 'Lenders finally checked the tanks.'): the climber climbs STRAIGHT UP at TF.ladder,
 *  so the hero tank gets a vertical steel ladder there (FARM_LAD_A, rungs 0.27 m out) from the ground to a grated landing at
 *  FARM_LAND_Y; the spiral stair now starts on that landing and climbs up-left to the roof (it never crosses the ladder) */
const FARM_LAD_A = Math.atan2(TF.ladder[0] - TFH.c[0], TF.ladder[2] - TFH.c[2]), FARM_LAND_Y = 3.6;
const FARM_STAIR: StairDef = { a0: FARM_LAD_A - 0.62 / 7.43, a1: FARM_LAD_A - 0.62 / 7.43 - (TFH.h - FARM_LAND_Y) / 5.8, y0: FARM_LAND_Y + 0.05, y1: TFH.h };
/** fix r1 (plan A1) + r2 (audit A2 P1): the dripping valve sits on a PIPE RISER at TF.valve (Tino's left); the outlet now
 *  turns 0.3 m AWAY from Tino (-x) so the drop falls against the dark tanker shadow, clear of the seated worker and of the
 *  centred caption, into a small puddle */
const SPOUT: V3 = [TF.valve[0] - 0.3, TF.valve[1] - 0.17, TF.valve[2]];
/** fix r2 (audit A2 P3: fragments of 'E OI' peeked above it): the BANKRUPT notice is slapped over 'OIL' alone and hangs
 *  lower-right off the sign, so 'ALLIED / VEGETABLE' stay whole: its left edge x 0.70 (right of VEGETABLE's last E), its top
 *  ~4 cm over OIL's cap line and ~4 cm under ALLIED, its right edge ~0.2 m inside the right post (1.3 x 0.5 m, BANKRUPT ~0.29 m
 *  tall). Local anchor (lead_request TF.notice = [1.33, 3.2, 16.07]) */
const NOTICE: V3 = [1.33, 3.2, TF.notice[2]], NOTICE_W = 1.3, NOTICE_H = 0.5, NOTICE_ROT = 0.02;
/** the farm's foreground storm puddles (set-local x, z, w, d, seed) and the guard hut (inside the fence, left of the gate;
 *  fix r2: 0.35 m nearer the gate, still left of the shot-2 drip's fall line so the drop never falls against its white wall) */
const STORM_PUDDLES: [number, number, number, number, number][] = [[-0.5, 18.4, 4.8, 2.5, 1], [1.3, 13.7, 2.6, 1.3, 2], [-1.7, 11.0, 2.2, 1.1, 3], [2.1, 21.0, 2.6, 1.2, 4], [1.85, 16.55, 1.1, 0.55, 5]];
/** fix r3: shot 9's sign-end pour (x, z) and the near puddle that mirrors the lit sign + BANKRUPT (x, z, w, d) */
const POUR9: [number, number] = [1.76, TF.gate.z + 0.12], REFL9: [number, number, number, number] = [-0.6, 20.55, 1.7, 0.85];
const HUT: V3 = [-3.6, 0, 14.2];
/** fix r2 (audit A2 P2 shot 2 / P3 shot 9): the gate leaves swing OUT toward the street as soft foreground framers; their
 *  opening angle (rad from closed) per shot: shot 2 left 58 deg / right 68 deg (both edges of the gate wide, out of the
 *  landing), shot 9 left 72 deg (the left ~10 % of the storm frame) / right 72 deg (out of frame) */
const LEAF_OPEN: Record<number, [number, number]> = { 2: [58 * D2R, 75 * D2R], 9: [72 * D2R, 74 * D2R] };  // r2 check: the right leaf at 68 deg read as a blurred grey bar in the landing, so it opens past both frames
/** fix r2 (audit A2 P2 shot 14): the arriving car (a red / cream two-tone sedan) for AUDIO's car_14. The camera only sees
 *  the kerb lane, and the parked sedan holds its right half, so the car pulls IN from the left edge and parks behind it:
 *  it enters at CAR14_A (after the poster lands), decelerates, gives a friendly toot ~CAR14_A + 16, stops at CAR14_A + 44
 *  (before CLOSED) with a 6 f suspension dip; its bonnet, grille and windscreen then hold the lower left */
const CAR14_A = BEAT.cameOut + 8, CAR14_STOP = CAR14_A + 44, CAR14_FRONT = -0.05, CAR14_ON = false;
/** a 1960s two-tone sedan along local +x (front at +x), centred on the origin, wheels on y 0: a long low body with a
 *  creased beltline and tail fins, a glass house with a wrap-around windscreen, a pale roof, chrome bumpers, side trim,
 *  white-wall hubcaps */
const sedan = (b: Batch, m: THREE.Matrix4, key: string, body: string, roofC: string) => {
  const sh = new THREE.Shape(); sh.moveTo(-2.6, 0.32); sh.lineTo(2.55, 0.32); sh.quadraticCurveTo(2.66, 0.34, 2.66, 0.62); sh.lineTo(2.6, 0.86); sh.lineTo(1.05, 0.96);
  sh.lineTo(-1.55, 0.98); sh.lineTo(-2.45, 1.0); sh.lineTo(-2.66, 1.1); sh.lineTo(-2.66, 0.5); sh.closePath();
  const ex = (s: THREE.Shape, d: number, bev = 0) => new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 }).translate(0, 0, -d / 2);
  // (r2 check: the flat slab body read as a toy block from the street camera): a bevelled body, a cream side flash, chrome
  // edge trims along the deck and bonnet, a centre crease, a hood ornament
  b.add(ex(sh, 1.76, 0.06), col("car" + key, body), m);
  for (const s of [-1, 1]) { b.add(boxGeo(V(-2.45, 0.74, s * 0.93 - 0.01), V(1.9, 0.86, s * 0.93 + 0.012), 0, true), col("carRoof" + key, roofC), m);
    b.add(boxGeo(V(0.9, 0.955, s * 0.86 - 0.015), V(2.55, 0.985, s * 0.86 + 0.015), 0, true), col("carChrome2", "#e2e4e8"), m);
    b.add(boxGeo(V(-2.55, 1.0, s * 0.86 - 0.015), V(-1.5, 1.035, s * 0.86 + 0.015), 0, true), col("carChrome2", "#e2e4e8"), m); }
  b.add(boxGeo(V(1.1, 0.97, -0.012), V(2.5, 0.99, 0.012), 0, true), col("carChrome2", "#e2e4e8"), m);
  b.add(boxGeo(V(-2.5, 1.0, -0.012), V(-1.6, 1.03, 0.012), 0, true), col("carChrome2", "#e2e4e8"), m);
  b.add(new THREE.ConeGeometry(0.035, 0.16, 6).rotateZ(-Math.PI / 2).translate(2.48, 1.0, 0), col("carChrome2", "#e2e4e8"), m);
  const cab = new THREE.Shape(); cab.moveTo(0.75, 0.95); cab.lineTo(0.28, 1.4); cab.lineTo(-0.95, 1.42); cab.lineTo(-1.5, 0.97); cab.closePath();
  b.add(ex(cab, 1.62), col("carGlass2", "#3e4c66"), m);
  const roof = new THREE.Shape(); roof.moveTo(0.3, 1.39); roof.lineTo(-0.94, 1.41); roof.lineTo(-0.94, 1.47); roof.lineTo(0.3, 1.45); roof.closePath();
  b.add(ex(roof, 1.66), col("carRoof" + key, roofC), m);
  for (const s of [-1, 1]) { b.add(boxGeo(V(0.05, 0.99, s * 0.8 - 0.02), V(0.2, 1.4, s * 0.8 + 0.02), 0, true), col("carRoof" + key, roofC), m);   // the B pillars
    b.add(boxGeo(V(-2.6, 0.96, s * 0.84 - 0.06), V(-1.7, 1.12, s * 0.84 + 0.06), 0, true), col("car" + key, body), m); }        // tail fins
  b.add(boxGeo(V(2.62, 0.36, -0.95), V(2.74, 0.56, 0.95), 0, true), col("carChrome2", "#e2e4e8"), m);
  b.add(boxGeo(V(-2.74, 0.36, -0.95), V(-2.62, 0.56, 0.95), 0, true), col("carChrome2", "#e2e4e8"), m);
  for (const [dx, s] of [[-1.62, -1], [-1.62, 1], [1.62, -1], [1.62, 1]] as const) {
    b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 20).rotateX(Math.PI / 2).translate(dx, 0.36, s * 0.84), col("carTire", "#1e1e22"), m);
    b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 18).rotateX(Math.PI / 2).translate(dx, 0.36, s * 0.97), col("carHub", "#e8eaee"), m); }
  for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.1, 10, 6).translate(2.64, 0.72, s * 0.7), col("carLamp", "#f6eed6"), m);
  for (const s of [-1, 1]) b.add(boxGeo(V(-2.7, 0.72, s * 0.72 - 0.1), V(-2.62, 0.95, s * 0.72 + 0.1), 0, true), col("carTail", "#d8281e"), m);
  b.add(boxGeo(V(2.66, 0.5, -0.55), V(2.7, 0.72, 0.55), 0, true), col("carGrille", "#b8bcc4"), m);
  // fix r3 (audit A3 P2 shot 14: from 2.6 m up only a teal box corner showed): the cues that say '1960s sedan' at a crop:
  // big chrome-bezelled round headlights on the front corners, a rounded chrome bumper wrapping the corners, a chrome
  // side spear down the flank, a fat whitewall front tyre arch
  const chrome = col("carChrome2", "#e2e4e8");
  for (const s of [-1, 1]) { b.add(new THREE.SphereGeometry(0.135, 14, 10).scale(0.6, 1, 1).translate(2.62, 0.74, s * 0.68), col("carLamp", "#f6eed6"), m);
    b.add(new THREE.TorusGeometry(0.14, 0.03, 6, 18).rotateY(Math.PI / 2).translate(2.64, 0.74, s * 0.68), chrome, m);
    b.add(new THREE.CapsuleGeometry(0.085, 0.42, 4, 10).rotateZ(Math.PI / 2).translate(2.42, 0.46, s * 0.97), chrome, m);
    b.add(boxGeo(V(-2.1, 0.69, s * 0.935 - 0.012), V(2.35, 0.725, s * 0.935 + 0.012), 0, true), chrome, m);
    b.add(new THREE.TorusGeometry(0.44, 0.06, 6, 20, Math.PI).translate(1.62, 0.36, s * 0.9), col("carArch", "#2a3a42"), m); }
  b.add(new THREE.CapsuleGeometry(0.09, 1.7, 4, 10).rotateX(Math.PI / 2).translate(2.74, 0.46, 0), chrome, m);
};
/** lightning (shot 9): flash 1 crosses the 8 -> 9 dissolve (the crack of thunder_8: AUDIO, please set thunder_8 to
 *  SHOTS[8].a - 1), flash 2 is a far sheet flash + a bolt just before the far roll thunder_9 (checked - 8) */
const flashAt = (f: number) => {
  const k = (d: number) => (d < 0 ? 0 : d < 1 ? d : Math.max(0, 1 - (d - 1) / 2.5));
  // fix1 LEAD (binding): ONE schedule = POST's FLASHES (SaladOil.tsx): SHOTS[8].a - 7, BEAT.bust - 2 (the big one), BEAT.checked - 8 (far);
  // POST lifts the whole frame, so the set's own lift is halved here (bolt + storm deck / haze only)
  const F1 = SHOTS[8].a - 7, FB = BEAT.bust - 2, F2 = BEAT.checked - 8;
  return { all: 0.55 * Math.max(k(f - F1), 0.7 * k(f - F1 - 3.5), k(f - FB), 0.6 * k(f - FB - 3), 0.55 * k(f - F2), 0.4 * k(f - F2 - 2.5)),
    bolt: f >= FB - 0.5 && f < FB + 3 ? 1 : f >= F2 - 0.5 && f < F2 + 3 ? 0.8 : f >= F1 + 3 && f < F1 + 5 ? 0.6 : 0 };
};

type Gull = { s: THREE.Sprite; i: number };
type Puff = { s: THREE.Sprite; src: THREE.Vector3; n: number; ph: number; rise: number; drift: number; size: number; set: "tanktop" | "tankfarm" | "street"; alpha: number;
  /** fix r3: only in these shots (all shots of the set when absent); a drift direction of its own (the harbour WIND when absent) */
  ids?: number[]; dir?: THREE.Vector3 };

export class Exterior {
  private g = new THREE.Group();
  private top = new THREE.Group(); private farm = new THREE.Group(); private street = new THREE.Group();
  // tank top
  private oil!: THREE.ShaderMaterial; private tape!: THREE.Mesh; private tapeTex!: THREE.Texture; private reel = new THREE.Group(); private bob!: THREE.Mesh;
  private flaps: Flap[] = []; private counter = new THREE.Group(); private sock!: THREE.Mesh; private sockBase!: Float32Array;
  private tanker = new THREE.Group(); private freighter = new THREE.Group(); private tug = new THREE.Group(); private wake!: THREE.Mesh;
  private harbour!: THREE.MeshBasicMaterial; private skylines: THREE.MeshBasicMaterial[] = []; private splash4: THREE.Sprite[] = [];
  // tank farm
  private dripRing!: THREE.Mesh; private notice!: THREE.Mesh; private wetFarm = new THREE.Group();
  private rain!: THREE.InstancedMesh; private splashes!: THREE.InstancedMesh; private signDrips: THREE.Sprite[] = [];
  // street
  private poster!: THREE.Mesh; private arrowsN: THREE.Mesh[] = []; private arrowsD: THREE.Mesh[] = []; private closed!: THREE.Mesh; private pigeons: THREE.Sprite[] = []; private sheet!: THREE.Mesh;
  // fix r1: tank top extras (per-light roof tint, gull / cloud shadows, the shot-1 sun glow + rays, shot-7 props and motes,
  // the perched gull of shot 4, pennants, far workers, ship smoke)
  private topTint: THREE.MeshLambertMaterial[] = []; private gullShadow!: THREE.Mesh; private cloudShadow!: THREE.Mesh;
  private sunGlow!: THREE.Sprite; private rays: THREE.Mesh[] = []; private motes: THREE.Sprite[] = []; private s7props = new THREE.Group();
  private perch!: THREE.Sprite; private flags: { m: THREE.Mesh; base: Float32Array; storm: number }[] = []; private workers: { s: THREE.Sprite; c: V3; r: number; n: number; ph: number }[] = [];
  private smoke: { s: THREE.Sprite; ship: THREE.Group; off: V3; vx: number; k: number }[] = [];
  // fix r1: tank farm extras (the riser's gauge, the fat drip, its puddle, the storm kit, lightning, the hut window)
  private dripCrown!: THREE.Sprite; private dripWet!: THREE.Sprite;
  private needle!: THREE.Mesh; private drop!: THREE.Sprite; private bead!: THREE.Sprite; private dropKids: THREE.Sprite[] = []; private dripPuddle!: THREE.Mesh;
  private hutWin!: THREE.MeshBasicMaterial; private stormOnly = new THREE.Group(); private crowns!: THREE.InstancedMesh; private ripples!: THREE.InstancedMesh;
  private curtains: THREE.Mesh[] = []; private cloudBand!: THREE.Mesh; private bolt!: THREE.Sprite; private flash!: THREE.Mesh; private haze!: THREE.Mesh;
  private rivulets!: THREE.Mesh; private gutter!: THREE.Mesh; private spray: THREE.Sprite[] = []; private sprayRing!: THREE.Sprite; private noticeBase!: Float32Array;
  private farmSheet!: THREE.Mesh; private gateBulb!: THREE.MeshBasicMaterial;
  // fix r1: street extras
  private carRefl!: THREE.Texture; private bundleTops: THREE.Mesh[] = []; private wetRed: THREE.Mesh[] = []; private wetGrey: THREE.Mesh[] = [];
  // fix r1: per-shot sky clouds over the noon exteriors (shots 2 / 4)
  private skyClouds: THREE.Sprite[] = []; private skyC = new Map<number, THREE.Vector3[]>();
  // fix r2 (audit A2): tank top (the sun patch, the shot-1 hatch glow, ground / roof gull shadows, B's paper scrap, the
  // ship's horn steam, the far tank man with his tape, the tape's '90'), tank farm (the swung gate leaves, the gull on the
  // sign, the spout glint, wire drips, the stair lamp), street (the passing car, flying pigeons, a feather, the kerb sheet,
  // the bin page, the clerk, the curtain, the awning valance)
  private sunPatch!: THREE.Mesh; private hatchGlow!: THREE.Sprite; private gullShadow2!: THREE.Mesh; private scrap4!: THREE.Mesh; private horn: THREE.Sprite[] = [];
  private tapeMan!: THREE.Sprite; private tapeLine!: THREE.Mesh; private tape90!: THREE.Mesh; private bobGlint!: THREE.Sprite;
  private leaves: THREE.Group[] = []; private signGull!: THREE.Sprite; private spoutGlint!: THREE.Sprite; private wireDrips: THREE.Sprite[] = []; private stairBulb!: THREE.MeshBasicMaterial; private stairPool!: THREE.Mesh; private streaks: THREE.Texture[] = [];
  private car14 = new THREE.Group(); private carGlint!: THREE.Sprite; private feather!: THREE.Sprite; private kerbSheet!: THREE.Mesh; private binPage!: THREE.Mesh;
  private clerk!: THREE.Mesh; private curtain!: THREE.Mesh; private curtainBase!: Float32Array; private valance!: THREE.Mesh;
  // shared life
  private gulls: Gull[] = []; private puffs: Puff[] = []; private boards: { m: THREE.MeshBasicMaterial; set: string; k: number }[] = [];
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private v = new THREE.Vector3(); private sc = new THREE.Vector3(); private c = new THREE.Color();
  private gullC = new Map<number, THREE.Vector3[]>();
  // fix r3 (audit A3): tank top (the counter's own rail group, the rim rail posts as their own caster group, the shot-4
  // tape texture + plunk ring + its droplets, the P0 rail-bar shadow, dew glints, the loop logbook page + pencil, shot-4 B
  // gulls on the fire-bucket stand, the shot-7 fat bubble), tank farm (the SLOW decal, the storm road marks + sign
  // reflection puddle, the shot-9 stencil, the lamp's wall pool + light cone, tread splashes, the sign-end pour, huddled
  // gulls, the tanker beacon, the soggy page), street (hanging papers, the kiosk valance)
  private counterRail = new THREE.Group(); private railPosts = new THREE.Group(); private tape4Tex!: THREE.Texture; private plunkRing!: THREE.Mesh;
  private railShadow!: THREE.Mesh; private dew: THREE.Sprite[] = []; private logPage = new THREE.Group(); private pencil = new THREE.Group(); private standGulls: THREE.Sprite[] = [];
  private gullShadow3!: THREE.Mesh; private skyPuddle!: THREE.Mesh;
  private slow!: THREE.Mesh; private stencil9!: THREE.Mesh; private wallPool!: THREE.Mesh; private lampCone!: THREE.Mesh; private treadSplash: THREE.Sprite[] = [];
  private signPour!: THREE.Mesh; private signPourSplash: THREE.Sprite[] = []; private huddle: THREE.Sprite[] = []; private beacon!: THREE.MeshBasicMaterial; private beaconHalo!: THREE.Sprite;
  private soggy!: THREE.Mesh; private reflPuddle!: THREE.Mesh; private reflTex!: THREE.Texture;
  private drainSwirl!: THREE.Mesh; private streamLand: THREE.Mesh[] = []; private hangPapers: THREE.Mesh[] = []; private kioskVal!: THREE.Mesh; private kioskValBase!: Float32Array;

  private board(m: THREE.Mesh, set: string, k = 1) { this.boards.push({ m: m.material as THREE.MeshBasicMaterial, set, k }); m.layers.set(NOINK); return m; }
  private spr(tex: THREE.Texture, parent: THREE.Object3D, colr: THREE.ColorRepresentation = "#ffffff", additive = false, fog = true) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(colr), transparent: true, depthWrite: false, fog, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.layers.set(NOINK); s.renderOrder = 5; parent.add(s); return s;
  }

  /** a pennant on a pole top at p (w x h, the hoist at p); it streams downwind with a travelling wave (posed per frame) */
  private addFlag(parent: THREE.Object3D, p: THREE.Vector3, w: number, h: number, storm: number) {
    const g = new THREE.PlaneGeometry(w, h, 14, 4).translate(w / 2, -h / 2, 0);
    const m = new THREE.Mesh(g, lam("sx_pennant2", () => ({ map: P.pennantTex(), side: THREE.DoubleSide, alphaTest: 0.5 })));
    m.position.copy(p); parent.add(m);
    this.flags.push({ m, base: Float32Array.from(g.attributes.position.array as ArrayLike<number>), storm });
  }

  constructor(root: THREE.Object3D, _kit: Kit) {
    root.add(this.g);
    this.g.add(this.top, this.farm, this.street);
    this.buildTop();
    this.buildFarm();
    this.buildStreet();
    // ---- gulls (sprites, circling in whole cycles; placed per shot in its own view) ----
    for (let i = 0; i < 9; i++) this.gulls.push({ s: this.spr(P.gullTex(0), this.g, "#ffffff", false, true), i });
    // fix r1 (audit A1 P2: the noon sky was a bare gradient): 4 puffy cumulus per noon shot, white with lavender bellies,
    // far behind the skyline haze (the skyline cards draw over them), drifting slowly
    for (let i = 0; i < 4; i++) { const c = this.spr(P.cloudSoft(11 + i, P.CLOUD_DAY), this.g, "#ffffff", false, false); c.renderOrder = -0.45; c.material.depthTest = true; this.skyClouds.push(c); }
    void _kit;
  }

  // ============================================ TANK TOP ============================================
  private buildTop() {
    const T = this.top, O = TK.base, b = new Batch(), bd = new Batch(), bfar = new Batch();
    // ---- ground: the gravel yard, the quay, the harbour, the far shore + skyline ----
    b.add(new THREE.PlaneGeometry(800, 660).rotateX(-Math.PI / 2), texM("yard", () => P.rep(P.yardTex(), 80, 66)), M(O[0], 0, O[2] + 270));
    box(b, texM("quay", () => P.rep(P.concreteTex(), 80, 1)), O[0] - 400, -1.6, O[2] + TK.harbourZ - 1.4, O[0] + 400, 0.25, O[2] + TK.harbourZ);
    box(b, col("fender", "#5a4232"), O[0] - 400, -0.9, O[2] + TK.harbourZ - 1.55, O[0] + 400, -0.2, O[2] + TK.harbourZ - 1.4);
    for (let x = -300; x <= 300; x += 14) b.add(cyl(0.22, 0.55, 12), col("bollard", "#3a3a40"), M(O[0] + x, 0.25, O[2] + TK.harbourZ - 0.6));
    this.harbour = new THREE.MeshBasicMaterial({ map: P.rep(P.harbourTex(), 70, 34), fog: true });
    { const w = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1100).rotateX(-Math.PI / 2), this.harbour); w.position.set(O[0], -1.0, O[2] + TK.harbourZ - 550); w.layers.set(NOINK); T.add(w); }
    // far shore: a low land strip, far tanks, the hazy skyline card
    box(bfar, col("farShore", "#8d8a9a"), O[0] - 1200, -1, O[2] - 790, O[0] + 1200, 5, O[2] - 680);
    for (let i = 0; i < 22; i++) { const x = -700 + i * 55 + hash(i, 3) * 30, r = 8 + 6 * hash(i, 4); bfar.add(cyl(r, 10 + 8 * hash(i, 5), 20), col("farTank", "#a8a6b2"), M(O[0] + x, 5, O[2] - 700 + 20 * hash(i, 6))); }
    buildInk(bfar, T, 0, false);
    for (const [sd, x, w] of [[1, -380, 900], [2, 420, 700]] as const) {
      const m = new THREE.MeshBasicMaterial({ map: P.skylineTex(sd), transparent: true, depthWrite: false, fog: false });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, (w * 768) / 4096), m); s.position.set(O[0] + x, 4 + (w * 768) / 4096 / 2, O[2] - 760); s.layers.set(NOINK); s.renderOrder = -0.4; T.add(s); this.skylines.push(m);
    }
    // ---- harbour traffic + cranes ----
    { const bs = new Batch(); ship(bs, 118, 17, 7.5, "#2c3240", "tanker"); bs.build(this.tanker); this.tanker.position.set(O[0] - 100, 0, O[2] + TK.harbourZ - 11); T.add(this.tanker); }
    { const bs = new Batch(); ship(bs, 96, 15, 7, "#3a4a3e", "freighter"); bs.build(this.freighter); this.freighter.rotation.y = 0; T.add(this.freighter); }
    { const bs = new Batch(); ship(bs, 16, 5.5, 2.2, "#24242c", "tug"); bs.build(this.tug); this.tug.rotation.y = Math.PI; T.add(this.tug);
      this.wake = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.softDotTex(), transparent: true, depthWrite: false, color: "#f4f6f8", opacity: 0.6 }));
      this.wake.layers.set(NOINK); T.add(this.wake); }
    // fix r1 (audit ADD shot 1: harbour life): smoke plumes trailing from the tug's and the freighter's funnels
    for (let k = 0; k < 7; k++) { this.smoke.push({ s: this.spr(P.puffTex(), T, "#7a7680"), ship: this.tug, off: [0.32, 6.5, 0], vx: -0.035, k });
      this.smoke.push({ s: this.spr(P.puffTex(), T, "#7a7680"), ship: this.freighter, off: [-40.3, 21.8, 0], vx: 0.05, k }); }
    { const bc = new Batch(); for (const [x, z, y, u] of [[-260, -300, 0.3, 0.5], [-215, -300, -0.2, 0.9], [-170, -305, 0.1, 0.35], [-560, -560, 0.6, 0.6], [180, -330, -0.3, 0.8]] as const) crane(bc, O[0] + x, O[2] + z, y, 1, u);
      box(bc, col("pier", "#a49c90"), O[0] - 300, -1, O[2] - 318, O[0] - 130, 0.8, O[2] - 290); buildInk(bc, T, 0.4); }
    // ---- the hero tank (shell, foundation, girder, rim; the flat roof is its own disc) ----
    tank(b, O, { c: [0, 0, 0], r: R, h: H, roof: "flat", stair: HERO_STAIR, shell: 0, detail: 2, skipRail: 1, mat: "sx_shellTop" });
    {
      const roof = new THREE.Shape(); roof.absarc(0, 0, R, 0, TAU, false);
      const hole = new THREE.Path(); hole.absarc(HC[0], -HC[2], TK.hatch.r + 0.01, 0, TAU, true); roof.holes.push(hole);
      const rg = new THREE.ShapeGeometry(roof, 128), pos = rg.attributes.position, uv = rg.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * R) + 0.5, pos.getY(i) / (2 * R) + 0.5);
      rg.rotateX(-Math.PI / 2);
      const roofM = texM("heroRoof", () => P.roofDiscTex(R, HC[0], HC[2], TK.ladderTop[0], TK.ladderTop[2]));
      b.add(rg, roofM, M(O[0], H, O[2]));
      // fix r1 (audit A1 P2 shot 16 / ADD 1+16): the hatch zone: a riveted doubler pad, a weld bead round the collar,
      // radial plate seams with rivet rows, rust runs + golden drips from the collar, a rainbow oil-sheen ring (static:
      // frame 0 = the last frame)
      const zoneM = decalM("hatchZone", () => P.hatchZoneTex());
      bd.add(new THREE.RingGeometry(TK.hatch.r + 0.027, P.HZ_SIZE / 2, 128, 2).rotateX(-Math.PI / 2), zoneM, M(O[0] + HC[0], H + 0.006, O[2] + HC[2]));
      // per-light roof / shell tint (dawn and late light were turning the cream steel into orange sand: the oil must stay
      // the one saturated gold): tanktop-only materials, so a dissolve neighbour never shares them
      this.topTint.push(roofM as THREE.MeshLambertMaterial, zoneM as THREE.MeshLambertMaterial, lam("sx_shellTop", () => ({})) as THREE.MeshLambertMaterial);
    }
    // rim rail (posts every ~1 m, top + mid rail, a toe board), open at the ladder top
    {
      const red = RAIL_RED(), Rr = TK.rail.r, gw = 0.5 / Rr, a = LAD_A + gw, bb = LAD_A + TAU - gw, rpb = new Batch();
      arcRing(rpb, red, O[0], O[2], Rr, 0.032, H + TK.rail.h, a, bb, 200); arcRing(rpb, red, O[0], O[2], Rr, 0.024, H + TK.rail.h * 0.52, a, bb, 200);
      rpb.add(new THREE.CylinderGeometry(Rr, Rr, 0.1, 160, 1, true, a, bb - a).translate(0, H + 0.05, 0), lam("sx_toe", () => ({ color: "#c84a26", side: THREE.DoubleSide })), M(O[0], 0, O[2]));
      // fix r3 (audit A3 shot 7: a lattice of long violet rail shadows crossed the lender and the hatch under the low late
      // sun): the whole rim rail (rings, toe board, posts) is its own group, so shot 7 can drop its shadows
      const np = Math.round((TAU * Rr) / 1.0);
      for (let k = 0; k < np; k++) { const t = a + ((bb - a) * k) / (np - 1), [x, z] = pol(O[0], O[2], Rr, t); box(rpb, red, x - 0.028, H, z - 0.028, x + 0.028, H + TK.rail.h + 0.02, z + 0.028); }
      buildInk(rpb, this.railPosts, 1, true); T.add(this.railPosts);
      // grab rails at the ladder top: the ladder stiles rise over the rim and bend back to the rail
      for (const s of [-0.23, 0.23]) { const tx = Math.cos(LAD_A) * s, tz = -Math.sin(LAD_A) * s, [x0, z0] = pol(O[0], O[2], R + 0.28, LAD_A), [x1, z1] = pol(O[0], O[2], Rr, LAD_A);
        rod(b, red, V(x0 + tx, H - 0.1, z0 + tz), V(x0 + tx, H + 1.1, z0 + tz), 0.025); rod(b, red, V(x0 + tx, H + 1.1, z0 + tz), V(x1 + tx, H + 1.1, z1 + tz), 0.025); }
    }
    // the stair landing (grated, railed) + the vertical top ladder (stiles + rungs) from the landing to the rim
    {
      const steel = STEEL_GREY(), red = RAIL_RED(), [lx, lz] = pol(O[0], O[2], R + 0.45, LAD_A);
      b.add(boxGeo(V(-0.62, -0.05, -0.42), V(0.62, 0.0, 0.42), 0, true), texM("grating", () => P.rep(P.gratingTex(), 1, 6)), M(lx, LAND_Y, lz, LAD_A));
      for (const [dx, dz] of [[-0.6, 0.4], [0.6, 0.4], [0.6, -0.1]] as const) { const x = lx + Math.cos(LAD_A) * dx + Math.sin(LAD_A) * dz, z = lz - Math.sin(LAD_A) * dx + Math.cos(LAD_A) * dz; box(b, red, x - 0.022, LAND_Y, z - 0.022, x + 0.022, LAND_Y + 1.0, z + 0.022); }
      const ex = (dx: number, dz: number): THREE.Vector3 => V(lx + Math.cos(LAD_A) * dx + Math.sin(LAD_A) * dz, LAND_Y + 1.0, lz - Math.sin(LAD_A) * dx + Math.cos(LAD_A) * dz);
      rod(b, red, ex(-0.6, 0.4), ex(0.6, 0.4), 0.025); rod(b, red, ex(0.6, 0.4), ex(0.6, -0.1), 0.025);
      for (const s of [-0.23, 0.23]) { const [x, z] = pol(O[0], O[2], R + 0.28, LAD_A); const tx = Math.cos(LAD_A) * s, tz = -Math.sin(LAD_A) * s;
        box(b, steel, x + tx - 0.025, LAND_Y, z + tz - 0.035, x + tx + 0.025, H, z + tz + 0.035); }
      for (let y = LAND_Y + 0.3; y < H; y += 0.3) { const [x, z] = pol(O[0], O[2], R + 0.28, LAD_A); b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 6).rotateZ(Math.PI / 2), steel, M(x, y, z, LAD_A)); }
      for (let y = LAND_Y + 0.75; y < H; y += 1.0) for (const s of [-0.23, 0.23]) { const [x0, z0] = pol(O[0], O[2], R, LAD_A), [x1, z1] = pol(O[0], O[2], R + 0.28, LAD_A), tx = Math.cos(LAD_A) * s, tz = -Math.sin(LAD_A) * s; rod(b, steel, V(x0 + tx, y, z0 + tz), V(x1 + tx, y, z1 + tz), 0.018); }
    }
    // the hatch: neck (outside), the dark oily inside of the neck down to the oil, the flange, bolts, the propped lid
    {
      const rh = TK.hatch.r, x = O[0] + HC[0], z = O[2] + HC[2], rim = TK.hatch.rim, oilY = TK.hatch.oil, steel = col("hatchSteel", "#c9bea6");
      b.add(cyl(rh + 0.025, rim - H, 48, true), steel, M(x, H, z));
      const inner = new THREE.CylinderGeometry(rh, rh, rim - oilY + 0.06, 64, 1, true).translate(0, (rim + oilY - 0.06) / 2, 0);
      { const cm = new THREE.Mesh(inner, new THREE.MeshBasicMaterial({ map: P.rep(P.collarTex(), 1, 1), side: THREE.BackSide })); cm.position.set(x, 0, z); T.add(cm); this.boards.push({ m: cm.material as THREE.MeshBasicMaterial, set: "tanktop", k: 0.92 }); }
      // fix r2 (audit A2 ADD shot 1): golden drip runs down the OUTSIDE of the collar neck (a thin alpha sleeve)
      { const t = P.ptex("sxNeckDrips", 1024, 128, (g, r) => { g.clearRect(0, 0, 1024, 128);
          for (let i = 0; i < 26; i++) { const xx = r() * 1024, L = 30 + 90 * r(), w = 5 + 9 * r(); const gr = g.createLinearGradient(0, 0, 0, L); gr.addColorStop(0, "rgba(214,150,40,0.9)"); gr.addColorStop(1, "rgba(150,96,24,0.5)");
            g.fillStyle = gr; g.beginPath(); g.moveTo(xx - w / 2, 0); g.lineTo(xx + w / 2, 0); g.lineTo(xx + w * 0.3, L); g.lineTo(xx - w * 0.3, L); g.closePath(); g.fill();
            g.fillStyle = "rgba(236,180,60,0.95)"; g.beginPath(); g.arc(xx, L, w * 0.48, 0, TAU); g.fill(); g.fillStyle = "rgba(255,240,190,0.8)"; g.beginPath(); g.arc(xx - w * 0.15, L - w * 0.2, w * 0.15, 0, TAU); g.fill(); } });
        b.add(new THREE.CylinderGeometry(rh + 0.031, rh + 0.031, rim - H - 0.02, 48, 1, true).translate(0, (rim - H - 0.02) / 2, 0), lam("sx_neckDrips", () => ({ map: t, transparent: true, depthWrite: false, alphaTest: 0.05 })), M(x, H + 0.01, z)); }
      b.add(new THREE.RingGeometry(rh, rh + 0.1, 48).rotateX(-Math.PI / 2), col("flangeTop", "#b8ac94"), M(x, rim, z));
      b.add(new THREE.TorusGeometry(rh + 0.1, 0.022, 5, 48).rotateX(Math.PI / 2), col("flangeRim", "#857a68"), M(x, rim - 0.01, z));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, [bx, bz] = pol(x, z, rh + 0.06, a); b.add(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 6), col("bolt", "#4a4038"), M(bx, rim + 0.012, bz)); }
      // fix r1 (audit A1 P3: the lid lay on the counter's post, its handle read as a smiley): hinged on the collar's +x side
      // (clear of every kneel spot and of the shot-7 sight line), flipped open with its outer edge resting on the roof; two
      // hinge knuckles, the dark gasket ring + a centre boss on its (now upward) inside face
      const hy = rim + 0.02, lr = rh + 0.1, LA = 25 * D2R;  // the hinge line faces 115 deg (+x, a little -z)
      const hinge = new THREE.Matrix4().makeTranslation(x, hy, z).multiply(new THREE.Matrix4().makeRotationY(LA)).multiply(new THREE.Matrix4().makeTranslation(rh + 0.075, 0, 0))
        .multiply(new THREE.Matrix4().makeRotationZ(-(Math.PI + 0.25))).multiply(new THREE.Matrix4().makeTranslation(-lr, 0.018, 0));
      // fix r3 (audit A3 P3 shot 7: the lid was the biggest dead area, a plain cream disc): a painted face (a rivet ring every
      // ~6 cm, a rust bloom, a small stencilled No. 7, an oil drip run toward the hinge), a hinge strap across it and a
      // padlock hasp at its free edge (static: frame 0 = the last frame)
      b.add(new THREE.CylinderGeometry(lr, lr, 0.036, 40), texM("lidFace", () => P.lidTex()), hinge);
      b.add(new THREE.BoxGeometry(lr + 0.02, 0.012, 0.075).translate(lr / 2 + 0.02, -0.024, 0), col("hingeStrap", "#5a5048"), hinge);
      for (const dz of [-0.022, 0.022]) b.add(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 6).translate(lr * 0.55 + dz * 2, -0.031, dz), col("bolt", "#4a4038"), hinge);
      b.add(new THREE.BoxGeometry(0.07, 0.012, 0.07).translate(-lr + 0.05, -0.024, 0), col("hingeStrap", "#5a5048"), hinge);
      b.add(new THREE.TorusGeometry(0.022, 0.006, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(-lr - 0.004, -0.03, 0), col("hingeK", "#5a5048"), hinge);
      b.add(new THREE.BoxGeometry(0.035, 0.05, 0.06).translate(-lr - 0.03, -0.045, 0), col("padlock", "#c9a24a"), hinge);
      b.add(new THREE.TorusGeometry(lr * 0.78, 0.018, 5, 40).rotateX(Math.PI / 2), col("gasket", "#2e2a2c"), hinge.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.02, 0)));
      b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), col("lidBoss", "#8d826e"), hinge.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.03, 0)));
      for (const dz of [-0.2, 0.2]) b.add(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 10).rotateX(Math.PI / 2), col("hingeK", "#5a5048"),
        new THREE.Matrix4().makeTranslation(x, hy, z).multiply(new THREE.Matrix4().makeRotationY(LA)).multiply(new THREE.Matrix4().makeTranslation(rh + 0.075, 0, dz)));
      
      // the hatch platform: a short rail beside the hatch carrying the LOANS counter (box, hood, face, flaps)
      const cc = TK.counter, red = RAIL_RED(), cyw = cc.yaw, ux = Math.cos(cyw), uz = -Math.sin(cyw), nx = Math.sin(cyw), nz = Math.cos(cyw);
      // fix r2 (audit A2 P2 shot 16: broad violet post shadows read as rain streaks at the loop frame): slim 1.8 cm steel
      // posts and bars, so their long dawn shadows land as thin lines (<= ~30 px at P0) joined by the bar's shadow
      // fix r3 (audit A3 P2 shot 16 / frame 0: their long dawn shadows crossed the loop frame as loose violet diagonals; P3
      // shot 4: the frame read as an orphan goalpost): the counter's posts + bars are their own NON-casting group, shown
      // with the counter only (shot 1); the loop frame gets a designed rail-bar shadow instead (railShadow)
      const crb = new Batch();
      for (const s of [-0.45, 0.45]) { const px = O[0] + cc.c[0] + ux * s - nx * 0.1, pz = O[2] + cc.c[2] + uz * s - nz * 0.1; box(crb, red, px - 0.009, H, pz - 0.009, px + 0.009, cc.c[1] + 0.1, pz + 0.009); }
      { const p0 = V(O[0] + cc.c[0] - ux * 0.45 - nx * 0.1, cc.c[1] - 0.05, O[2] + cc.c[2] - uz * 0.45 - nz * 0.1), p1 = V(O[0] + cc.c[0] + ux * 0.45 - nx * 0.1, cc.c[1] - 0.05, O[2] + cc.c[2] + uz * 0.45 - nz * 0.1);
        rod(crb, red, p0, p1, 0.011); rod(crb, red, p0.clone().setY(H + 0.5), p1.clone().setY(H + 0.5), 0.01); }
      buildInk(crb, this.counterRail, 1, false); T.add(this.counterRail);
      const C = this.counter; C.position.set(O[0] + cc.c[0], cc.c[1], O[2] + cc.c[2]); C.rotation.y = cyw; T.add(C);
      const cb = new Batch(), w = cc.w, h = cc.h;
      cb.add(boxGeo(V(-w / 2 - 0.05, -h / 2 - 0.05, -0.14), V(w / 2 + 0.05, h / 2 + 0.05, -0.005), 0, true), col("counterBox", "#1d3329"));
      cb.add(boxGeo(V(-w / 2 - 0.09, h / 2 + 0.05, -0.2), V(w / 2 + 0.09, h / 2 + 0.085, 0.07), 0, true), col("counterHood", "#2a4436"));
      cb.build(C, false);
      const fc = this.board(faceMesh(P.loansFaceTex(w, h), w, h), "tanktop"); fc.position.z = 0; C.add(fc);
      const atlas = P.loansFlapAtlas(), L = P.LOANS_LAYOUT(w, h), fm = new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide });
      this.boards.push({ m: fm, set: "tanktop", k: 1 });
      for (const c of L.cells) {
        const mk = (y: number, zz: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L.cw, L.ch / 2).translate(0, y, 0), fm); m.position.set(c.x, c.y, zz); m.layers.set(NOINK); C.add(m); return m; };
        const top = mk(L.ch / 4, 0.003), bot = mk(-L.ch / 4, 0.003), flap = mk(L.ch / 4, 0.007);
        this.flaps.push({ top, bot, flap });
      }
    }
    // roof fittings: a mushroom vent (steams), a gauge well, a foam pipe over the rim, a windsock mast
    {
      const fit = col("roofFit", "#a99f8b"), [vx, vz] = [O[0] - 2.6, O[2] + 1.2];
      b.add(cyl(0.2, 0.55, 14), fit, M(vx, H, vz)); b.add(new THREE.ConeGeometry(0.38, 0.22, 14).translate(0, 0.11, 0), fit, M(vx, H + 0.6, vz)); b.add(cyl(0.36, 0.04, 14), col("ventLip", "#7a705e"), M(vx, H + 0.56, vz));
      this.puffs.push(...[0, 1, 2, 3].map((k) => ({ s: this.spr(P.puffTex(), T, "#ffffff"), src: V(vx, H + 0.75, vz), n: 41 + k * 6, ph: k * 0.25, rise: 1.8, drift: 1.6, size: 1.15, set: "tanktop" as const, alpha: 0.6 })));  // fix r2: a clearer wisp on the gusts
      box(b, fit, O[0] + 2.0, H, O[2] - 1.8, O[0] + 2.5, H + 0.35, O[2] - 1.3);
      rod(b, col("pipeGrey", "#7f8a86"), V(O[0] - 4.8, H + 0.18, O[2] - 3.5), V(O[0] - 5.75, H + 0.18, O[2] - 4.2), 0.07);
      const [mx, mz] = pol(O[0], O[2], TK.rail.r, 200 * D2R);
      rod(b, col("mast", "#d8d2c4"), V(mx, H, mz), V(mx, H + 3.3, mz), 0.04);
      const sg = new THREE.CylinderGeometry(0.2, 0.09, 1.2, 14, 6, true).translate(0, -0.6, 0).rotateZ(Math.PI / 2);
      this.sock = new THREE.Mesh(sg, lam("sx_sock", () => ({ map: P.windsockTex(), side: THREE.DoubleSide })));
      this.sock.position.set(mx, H + 3.2, mz); this.sock.castShadow = true; T.add(this.sock);
      this.sockBase = Float32Array.from(sg.attributes.position.array as ArrayLike<number>);
      b.add(new THREE.TorusGeometry(0.2, 0.015, 5, 16).rotateY(Math.PI / 2), col("sockRing", "#5a5048"), M(mx, H + 3.2, mz));
    }
    // the tank man's kit on the roof: a red toolbox (open lid), a coil of rope, an oily rag, a thermos
    {
      const tb = col("toolbox", "#b8332a"), tx = O[0] - 1.5, tz = O[2] + 4.5;
      cbox(b, tb, tx, H + 0.11, tz, 0.5, 0.22, 0.24, 0.35); cbox(b, col("toolboxLid", "#9a2a22"), tx - 0.06, H + 0.3, tz - 0.12, 0.5, 0.02, 0.22, 0.35, -1.1);
      cbox(b, col("toolHandle", "#2a2a2e"), tx, H + 0.26, tz, 0.26, 0.02, 0.03, 0.35);
      for (const [dx, c0] of [[-0.12, "#8a8f98"], [0.05, "#c9a24a"], [0.15, "#8a8f98"]] as const) cbox(b, col("tool" + c0, c0), tx + dx, H + 0.25, tz + 0.03, 0.03, 0.12, 0.03, 0.35);
      for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.2 - k * 0.018, 0.02, 5, 22).rotateX(Math.PI / 2), col("rope", "#c9b080"), M(O[0] + 1.45, H + 0.02 + k * 0.035, O[2] + 3.9));
      cbox(b, col("rag", "#d8c8a0"), O[0] - 1.05, H + 0.01, O[2] + 4.95, 0.28, 0.02, 0.2, 0.7);
      b.add(cyl(0.05, 0.28, 12), col("thermos", "#2f6a4a"), M(O[0] - 1.82, H, O[2] + 4.62)); b.add(cyl(0.055, 0.06, 12), col("thermosCap", "#d8d2c4"), M(O[0] - 1.82, H + 0.28, O[2] + 4.62));
    }
    // fix r1: more roof life + dressing
    {
      // P0 / shot 16 lower left: a coiled rope + an oily rag; lower right: a small oil can (static: the loop frame = frame 0)
      for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(0.15 - k * 0.022, 0.02, 6, 24).rotateX(Math.PI / 2), col("rope", "#c9b080"), M(O[0] - 0.42, H + 0.022 + k * 0.03, O[2] + 6.2));
      // fix r3 (audit A3 ADD shot 16): the rope's loose end trails off the coil with a frayed tip (a few splayed strands)
      { const rope = col("rope", "#c9b080"), a0 = V(O[0] - 0.42 + 0.15, H + 0.03, O[2] + 6.2), a1 = V(O[0] - 0.42 + 0.27, H + 0.022, O[2] + 6.29), a2 = V(O[0] - 0.42 + 0.34, H + 0.021, O[2] + 6.42);
        rod(b, rope, a0, a1, 0.018, 8); rod(b, rope, a1, a2, 0.017, 8); b.add(new THREE.SphereGeometry(0.018, 8, 6), rope, M(a1.x, a1.y, a1.z));
        for (let k = 0; k < 5; k++) { const ang = Math.atan2(a2.z - a1.z, a2.x - a1.x) + (k - 2) * 0.32, L = 0.035 + 0.012 * (k % 2);
          rod(b, col("ropeFray", "#d8c498"), a2, V(a2.x + Math.cos(ang) * L, H + 0.015, a2.z + Math.sin(ang) * L), 0.0035, 4); } }
      // fix r2 (audit A2 P2 shot 16: a grey mat and a red can-on-a-stick read as nothing from above): an OPEN LOGBOOK with a
      // pencil (the tank man's readings) and a SPARE TAPE REEL lying flat (red flanges, 4 spokes, the yellow coil, a crank)
      b.add(new THREE.BoxGeometry(0.3, 0.018, 0.2), texM("logbook", () => P.logbookTex()), M(O[0] - 0.12, H + 0.01, O[2] + 6.3, 0.42));
      // fix r3 (audit A3 ADD shot 16): the logbook's top right page lifts 2-3 deg in the harbour wind and the pencil rolls a
      // few mm and back (posed on tau, whole cycles: frame 0 = the last frame)
      { this.logPage.position.set(O[0] - 0.12, H + 0.0195, O[2] + 6.3); this.logPage.rotation.y = 0.42; T.add(this.logPage);
        const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.142, 0.19).rotateX(-Math.PI / 2).translate(0.073, 0, 0), lam("sx_logPage", () => ({ map: P.logPageTex(), side: THREE.DoubleSide })));
        pg.castShadow = true; pg.receiveShadow = true; this.logPage.add(pg);
        const pb = new Batch(); rod(pb, col("pencil", "#e8b830"), V(-0.105, 0, 0), V(0.105, 0, 0), 0.006); rod(pb, col("pencilTip", "#3a2a20"), V(0.105, 0, 0), V(0.123, 0, 0), 0.004);
        pb.add(new THREE.CylinderGeometry(0.0062, 0.0062, 0.016, 8).rotateZ(Math.PI / 2).translate(-0.11, 0, 0), col("pencilEraser", "#d86a6a"));
        pb.build(this.pencil, true); this.pencil.position.set(O[0] - 0.135, H + 0.0255, O[2] + 6.42); this.pencil.rotation.order = "YXZ"; this.pencil.rotation.y = -Math.atan2(0.04, 0.21); T.add(this.pencil); }
      { const rx = O[0] + 0.32, rz = O[2] + 6.2, red = col("reel", "#b8472e");
        b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 32), red, M(rx, H + 0.006, rz));
        b.add(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 28), col("reelTape2", "#f2c230"), M(rx, H + 0.03, rz));
        b.add(new THREE.CircleGeometry(0.1, 32).rotateX(-Math.PI / 2), lam("sx_reelTop", () => ({ map: P.reelTopTex(), transparent: true, alphaTest: 0.3 })), M(rx, H + 0.056, rz, 0.3));
        rod(b, col("reelHub", "#3a3030"), V(rx, H + 0.06, rz), V(rx + 0.07, H + 0.06, rz - 0.05), 0.008);
        b.add(cyl(0.012, 0.05, 8), col("reelKnob", "#e8d8b0"), M(rx + 0.07, H + 0.06, rz - 0.05));
        // its loose tape end trailing a little way across the plates
        b.add(new THREE.PlaneGeometry(0.05, 0.26).rotateX(-Math.PI / 2), lam("sx_tapeEnd", () => ({ map: P.measureTapeTex(), side: THREE.DoubleSide })), M(rx - 0.15, H + 0.004, rz + 0.06, 1.2)); }
      // oily boot prints from the ladder top round to his kneeling spot (static: frame 0 = the last frame)
      { const fp = decalM("bootPrints", () => P.footprintTex(), { opacity: 0.85 });
        for (const [x0, z0, x1, z1] of [[1.55, 6.55, 0.55, 6.05], [0.5, 6.0, -0.75, 5.95]] as const) { const L = Math.hypot(x1 - x0, z1 - z0);
          bd.add(new THREE.PlaneGeometry(0.34, L).rotateX(-Math.PI / 2), fp, M(O[0] + (x0 + x1) / 2, H + 0.007, O[2] + (z0 + z1) / 2, Math.atan2(x0 - x1, z0 - z1))); } }
      // a warm dawn sun patch on the near plates (light through the gap under the propped lid): breaks the collar's shade
      // (r2 check: additive light went beige over the violet shade): a honey patch laid OVER the shade, normal blending
      // fix r3 (audit A3 P3 shot 16: a soft orange blob read as a lens smudge): a CRISP light patch between two rail-post
      // shadows (its sides run along the dawn shadow direction), nearer the collar on the in-focus plates, honey over the shade
      { const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.sunPatchCrispTex(), color: "#f0b468", transparent: true, opacity: 0.66, depthWrite: false, fog: false }));
        sp.position.set(O[0] + 0.24, H + 0.009, O[2] + 5.98); sp.scale.set(1.15, 1, 0.8); sp.layers.set(NOINK); sp.renderOrder = 1.6; T.add(sp); this.sunPatch = sp; }
      // fix r3 (audit A3 P2 shot 16 / frame 0): the dawn shadow of the rail's TOP BAR as ONE continuous violet band across the
      // top of the loop frame (curving gently with the roof), with thin post shadows running up from it to the posts' feet
      // beyond the frame top: the stray diagonals of the counter posts are gone (they no longer cast), so the top of P0 reads
      // as 'a railing behind us in the low sun'; dawn shots only, faded out as shot 1's crane lifts (frame 0 = the last frame)
      { const rs = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.railShadowTex(), color: "#4b3c8c", transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
        rs.position.set(O[0] + HC[0] + 0.02, H + 0.0085, O[2] + HC[2] - 0.95); rs.layers.set(NOINK); rs.renderOrder = 1.55; T.add(rs); this.railShadow = rs; }
      // fix r3 (audit A3 ADD shot 16): dew beads on a few doubler-ring rivets catch the dawn sparkle in step with the oil's star
      // glint (tau, whole cycles); a faint steam wisp curls off the lid hinge
      for (const [rr0, a] of [[0.6, -1.95], [0.84, -1.35], [0.6, 2.35], [0.84, 1.95], [0.6, 0.45]] as const) {
        const s = this.spr(P.glintStarTex(), T, new THREE.Color(1.5, 1.3, 1.0), true, false); s.position.set(O[0] + HC[0] + rr0 * Math.cos(a), H + 0.03, O[2] + HC[2] + rr0 * Math.sin(a)); s.renderOrder = 5.5; this.dew.push(s); }
      { const hx = O[0] + HC[0] + 0.45, hz = O[2] + HC[2] - 0.21;
        this.puffs.push(...[0, 1, 2].map((k) => ({ s: this.spr(P.puffTex(), T, "#fff4e8"), src: V(hx, H + 0.3, hz), n: 61 + k * 7, ph: k / 3, rise: 0.38, drift: 0.32, size: 0.16, set: "tanktop" as const, alpha: 0.2,
          ids: [1, 16], dir: V(-0.5, 0, 0.86) }))); }
      // fix r3 (audit A3 ADD shot 4): the tank man's chalk tally on the plates beside the hatch ('90' + four strokes and a
      // tick), an oil-sheen puddle by the collar, a stencilled 'No. 7' on the deck at the ladder top (all off the P0 frame)
      flat(bd, decalM("chalk90", () => P.chalkTallyTex(), { opacity: 0.9 }), O[0] - 0.98, O[2] + 4.95, 0.46, 0.3, 0.35, H + 0.0075);
      flat(bd, decalM("puddleOil", () => P.puddleTex(true, 1)), O[0] - 0.86, O[2] + 5.8, 0.42, 0.3, 0.9, H + 0.0078);
      flat(bd, decalM("deckNo7", () => P.deckStencilTex(), { opacity: 0.85 }), O[0] + 1.22, O[2] + 6.2, 0.62, 0.21, 0.52, H + 0.0076);
      // shot 7 lower right: a gauge stand-pipe (dial toward the camera side) and a gooseneck vent that steams
      const gx = O[0] + 1.55, gz = O[2] + 4.75, steel = col("roofFit", "#a99f8b");
      rod(b, col("pipeGrey", "#7f8a86"), V(gx, H, gz), V(gx, H + 0.62, gz), 0.035); b.add(cyl(0.07, 0.03, 12), col("flangeRim", "#857a68"), M(gx, H, gz));
      b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20).rotateX(Math.PI / 2), col("gaugeFace", "#f2eee2"), M(gx, H + 0.7, gz, 0.74));
      b.add(new THREE.TorusGeometry(0.1, 0.012, 5, 20), col("gaugeRim", "#4a4038"), M(gx + 0.026 * Math.sin(0.74), H + 0.7, gz + 0.026 * Math.cos(0.74), 0.74));
      cbox(b, col("gaugePointer", "#c0241c"), gx + 0.03 * Math.sin(0.74), H + 0.72, gz + 0.03 * Math.cos(0.74), 0.012, 0.075, 0.006, 0.74, 0, -0.6);
      const vx = O[0] + 1.95, vz = O[2] + 5.25;
      b.add(cyl(0.075, 0.48, 12), steel, M(vx, H, vz)); b.add(new THREE.TorusGeometry(0.11, 0.075, 8, 12, Math.PI).rotateY(Math.PI / 2), steel, M(vx, H + 0.48, vz + 0.11));
      b.add(cyl(0.085, 0.04, 12), col("ventLip", "#7a705e"), M(vx, H + 0.37, vz + 0.22)); b.add(cyl(0.11, 0.04, 12), col("flangeRim", "#857a68"), M(vx, H, vz));
      this.puffs.push(...[0, 1, 2].map((k) => ({ s: this.spr(P.puffTex(), T, "#ffffff"), src: V(vx, H + 0.36, vz + 0.22), n: 47 + k * 5, ph: k / 3, rise: 1.1, drift: 1.6, size: 0.5, set: "tanktop" as const, alpha: 0.4 })));
      // fix r2 (audit A2 ADD shot 16): a small breather vent at the loop frame's top-right whose thin steam wisp drifts
      // across the corner on the dawn wind (whole cycles on tau: frame 0 = the last frame)
      { const bx = O[0] + 0.78, bz = O[2] + 4.5; b.add(cyl(0.045, 0.26, 10), col("pipeGrey", "#7f8a86"), M(bx, H, bz)); b.add(cyl(0.075, 0.035, 12), col("ventLip", "#7a705e"), M(bx, H + 0.26, bz));
        b.add(new THREE.ConeGeometry(0.1, 0.07, 12).translate(0, 0.035, 0), col("roofFit", "#a99f8b"), M(bx, H + 0.33, bz));
        this.puffs.push(...[0, 1, 2].map((k) => ({ s: this.spr(P.puffTex(), T, "#ffffff"), src: V(bx, H + 0.36, bz), n: 53 + k * 7, ph: k / 3, rise: 0.55, drift: 0.9, size: 0.32, set: "tanktop" as const, alpha: 0.32 }))); }
      // shot 4 A (audit ADD): a catwalk bridge from the hero roof's far rim down to the neighbouring tank (depth)
      const t1 = TK.tanks[1], th0 = Math.atan2(t1.c[0], t1.c[2]), th1 = Math.atan2(-t1.c[0], -t1.c[2]), [ax, az] = pol(O[0], O[2], R - 0.1, th0), [cx2, cz2] = pol(O[0] + t1.c[0], O[2] + t1.c[2], t1.r - 0.2, th1);
      catwalk(b, [ax, H + 0.04, az], [cx2, t1.h + 0.04, cz2]);
      // fix r3 (audit A3 ADD shot 4): a short steam stub by the ladder top whose thin wisp drifts across the top rungs while
      // he climbs (shot 4 only)
      { const sx = O[0] + 2.35, sz = O[2] + 6.05; b.add(cyl(0.04, 0.3, 10), col("pipeGrey", "#7f8a86"), M(sx, H, sz)); b.add(cyl(0.06, 0.03, 10), col("ventLip", "#7a705e"), M(sx, H + 0.3, sz));
        this.puffs.push(...[0, 1, 2, 3].map((k) => ({ s: this.spr(P.puffTex(), T, "#ffffff"), src: V(sx, H + 0.34, sz), n: 71 + k * 6, ph: k / 4, rise: 0.9, drift: 1.1, size: 0.42, set: "tanktop" as const, alpha: 0.42,
          ids: [4], dir: V(-0.45, 0, 0.9) }))); }
    }
    // shot 7 (audit ADD): the lender's leather briefcase (brass clasps) and folded black umbrella on the roof beside him
    {
      const pb = new Batch(), lx = O[0] + TK.peer[0], lz = O[2] + TK.peer[2], leather = col("briefcase", "#6a3a22"), brass = col("brass", "#c9a24a");
      cbox(pb, leather, lx - 0.3, H + 0.17, lz + 0.62, 0.11, 0.32, 0.44, 0.15); cbox(pb, col("briefcaseDk", "#4a2816"), lx - 0.3, H + 0.335, lz + 0.62, 0.115, 0.012, 0.445, 0.15);
      for (const dz of [-0.12, 0.12]) cbox(pb, brass, lx - 0.24 + 0.012, H + 0.29, lz + 0.62 + dz, 0.012, 0.035, 0.05, 0.15);
      pb.add(new THREE.TorusGeometry(0.06, 0.012, 5, 12, Math.PI).rotateY(Math.PI / 2 + 0.15), leather, M(lx - 0.3, H + 0.335, lz + 0.62));
      const u0 = V(lx - 0.15, H + 0.03, lz - 0.62), u1 = V(lx + 0.55, H + 0.03, lz - 0.95), ua = -Math.atan2(u1.z - u0.z, u1.x - u0.x);
      pb.add(new THREE.CylinderGeometry(0.012, 0.045, u0.distanceTo(u1), 10).rotateZ(Math.PI / 2).rotateY(ua), col("umbrella", "#1e1e24"), M((u0.x + u1.x) / 2, H + 0.045, (u0.z + u1.z) / 2));
      pb.add(new THREE.TorusGeometry(0.05, 0.012, 5, 12, Math.PI), col("umbHandle", "#5a3a22"), M(u0.x - 0.05, H + 0.05, u0.z + 0.02, ua + Math.PI / 2, [1, 1, 1], Math.PI / 2));
      // fix r2 (audit A2 ADD shot 7): a galvanised bucket by the hatch (a hint of water), a dropped pencil, a crumpled
      // cigarette pack by the briefcase, a second rust-streaked vent cap
      { const bx = lx + 0.35, bz = lz - 0.7;
        pb.add(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 16, 1, true).translate(0, 0.14, 0), lam("sx_bucketG", () => ({ color: "#9aa2a8", side: THREE.DoubleSide })), M(bx, H, bz));
        pb.add(new THREE.CircleGeometry(0.12, 16).rotateX(-Math.PI / 2), col("bucketIn", "#4a5058"), M(bx, H + 0.02, bz));
        pb.add(new THREE.TorusGeometry(0.15, 0.012, 5, 18).rotateX(Math.PI / 2), col("bucketRim", "#c0c6cc"), M(bx, H + 0.28, bz));
        pb.add(new THREE.TorusGeometry(0.15, 0.01, 4, 14, Math.PI).rotateY(1.1).rotateZ(0.5), col("bucketHandle", "#5a5a60"), M(bx, H + 0.28, bz)); }
      rod(pb, col("pencil", "#e8b830"), V(lx + 0.15, H + 0.008, lz + 0.35), V(lx + 0.31, H + 0.008, lz + 0.28), 0.007);
      { const ck = new THREE.IcosahedronGeometry(0.045, 0).scale(1.3, 0.5, 0.9); pb.add(ck, col("cigPack", "#e8e2d2"), M(lx - 0.48, H + 0.02, lz + 0.78, 0.6)); pb.add(new THREE.IcosahedronGeometry(0.03, 0).scale(1.2, 0.5, 0.8), col("cigPackR", "#c4321f"), M(lx - 0.45, H + 0.028, lz + 0.8, 0.9)); }
      { const vx = O[0] - 1.25, vz = O[2] + 3.4; pb.add(cyl(0.12, 0.32, 12), col("roofFit", "#a99f8b"), M(vx, H, vz)); pb.add(new THREE.ConeGeometry(0.22, 0.14, 12).translate(0, 0.07, 0), texM("rustCap", () => P.drumTex("#9a6a4a")), M(vx, H + 0.34, vz)); }
      // fix r3 (audit A3 ADD shot 7): a crumpled khaki inspection slip (a pale card with a tick, no text) by the toolbox; a
      // black lunch pail with its lid ajar and a thermos cup that steams, beside the briefcase; a roof vent stub beyond him
      // whose thin wisp drifts through the frame's top-left corner
      { const tx = O[0] - 1.5, tz = O[2] + 4.5;
        pb.add(new THREE.PlaneGeometry(0.16, 0.11).rotateX(-Math.PI / 2), lam("sx_slip7", () => ({ map: P.inspectSlipTex(), side: THREE.DoubleSide })), M(tx + 0.36, H + 0.012, tz + 0.3, 0.7, [1, 1, 1], 0.08, 0.12));
        pb.add(new THREE.IcosahedronGeometry(0.045, 1).scale(1.2, 0.55, 1), col("slipCrumple", "#c8b88a"), M(tx + 0.5, H + 0.025, tz + 0.12, 0.4)); }
      { const px = lx - 0.62, pz = lz + 0.95;
        pb.add(new THREE.BoxGeometry(0.3, 0.14, 0.18), col("lunchPail", "#1e1e24"), M(px, H + 0.07, pz, 0.3));
        pb.add(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(0.3 + Math.PI / 2), col("lunchPail", "#1e1e24"), M(px - 0.02, H + 0.2, pz - 0.05, 0, [1, 1, 1], 0, 0.5));
        pb.add(new THREE.TorusGeometry(0.07, 0.008, 4, 12, Math.PI).rotateY(0.3), col("pailHandle", "#8a8a90"), M(px, H + 0.15, pz));
        pb.add(cyl(0.045, 0.26, 12), col("thermos", "#2f6a4a"), M(px + 0.24, H, pz - 0.14));
        pb.add(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 14, 1, true).translate(0, 0.035, 0), lam("sx_thermosCup", () => ({ color: "#d8d2c4", side: THREE.DoubleSide })), M(px + 0.12, H, pz - 0.26));
        pb.add(new THREE.CircleGeometry(0.046, 14).rotateX(-Math.PI / 2), col("coffee", "#3a2416"), M(px + 0.12, H + 0.06, pz - 0.26));
        this.puffs.push(...[0, 1, 2].map((k) => ({ s: this.spr(P.puffTex(), T, "#ffffff"), src: V(px + 0.12, H + 0.09, pz - 0.26), n: 83 + k * 7, ph: k / 3, rise: 0.32, drift: 0.12, size: 0.1, set: "tanktop" as const, alpha: 0.38, ids: [7] }))); }
      { const vx = O[0] - 1.95, vz = O[2] + 6.55; pb.add(cyl(0.06, 0.4, 10), col("roofFit", "#a99f8b"), M(vx, H, vz)); pb.add(cyl(0.085, 0.035, 10), col("ventLip", "#7a705e"), M(vx, H + 0.4, vz));
        this.puffs.push(...[0, 1, 2, 3].map((k) => ({ s: this.spr(P.puffTex(), T, "#fff6ec"), src: V(vx, H + 0.45, vz), n: 67 + k * 6, ph: k / 4, rise: 0.9, drift: 1.3, size: 0.34, set: "tanktop" as const, alpha: 0.42,
          ids: [7], dir: V(0.25, 0, -1) }))); }
      pb.build(this.s7props, true); T.add(this.s7props);
    }
    // gull shadow (shots 1 / 7 / 16) + a slow cloud shadow (shot 7), the shot-1 dawn sun glow + rays, motes (shot 7)
    {
      this.gullShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.gullShadowTex(), color: "#1c1236", transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      this.gullShadow.layers.set(NOINK); this.gullShadow.renderOrder = 2; T.add(this.gullShadow);
      this.cloudShadow = new THREE.Mesh(new THREE.PlaneGeometry(10, 6.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.softDotTex(), color: "#2a2050", transparent: true, opacity: 0.2, depthWrite: false, fog: false }));
      this.cloudShadow.layers.set(NOINK); this.cloudShadow.renderOrder = 1.5; T.add(this.cloudShadow);
      this.sunGlow = this.spr(P.sunGlowTex(), T, new THREE.Color(2.0, 1.32, 0.66), true, false); this.sunGlow.renderOrder = -0.45;
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.godRayTex(), color: new THREE.Color(0.26, 0.17, 0.08), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        m.layers.set(NOINK); m.renderOrder = 4; m.matrixAutoUpdate = false; T.add(m); this.rays.push(m); }
      for (let k = 0; k < 12; k++) this.motes.push(this.spr(P.softDotTex(), T, new THREE.Color(0.9, 0.62, 0.3), true, false));
      // shot 4: a gull perched on the rim rail beside the shout spot; the shout startles it off on "full!"
      this.perch = this.spr(P.gullPerchTex(), T, "#ffffff", false, true);
      // fix r2: shot 1's warm gold glow over the hatch mouth in the wide (the hero gold never leaves the frame); a ground gull
      // shadow (shot 4 B, the far gull's cry) / a big roof one (shot 7); a paper scrap skittering across B's gravel; the far
      // ship's horn: a white steam burst from its whistle; a far tank man with his own tape at a hatch (a rhyme for the con)
      this.hatchGlow = this.spr(P.softDotTex(), T, new THREE.Color("#ffc54a"), true, false); this.hatchGlow.renderOrder = 4.5;
      this.gullShadow2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.gullShadowTex(), color: "#2a1a4a", transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
      this.gullShadow2.layers.set(NOINK); this.gullShadow2.renderOrder = 2; T.add(this.gullShadow2);
      // fix r3 (audit A3 ADD shot 16): the loop shot's early gull shadow glides across the roof AND the gold before "fake"
      this.gullShadow3 = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.gullShadowTex(), color: "#1c1236", transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
      this.gullShadow3.layers.set(NOINK); this.gullShadow3.renderOrder = 2; T.add(this.gullShadow3);
      this.scrap4 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), lam("sx_sheet", () => ({ map: P.newsSheetTex(), side: THREE.DoubleSide }))); this.scrap4.castShadow = true; T.add(this.scrap4);
      for (let k = 0; k < 7; k++) this.horn.push(this.spr(P.puffTex(), T, "#ffffff", false, false));
      { const t = TK.tanks[1], a = 2.6, rr = t.r * 0.55, wx = O[0] + t.c[0] + rr * Math.sin(a), wz = O[2] + t.c[2] + rr * Math.cos(a);
        const kneel = P.ptex("sxTinyKneel", 64, 96, (g) => { g.clearRect(0, 0, 64, 96); g.fillStyle = "#2a2a3a"; g.strokeStyle = "#2a2a3a"; g.lineCap = "round";
          g.beginPath(); g.arc(30, 22, 9, 0, TAU); g.fill(); g.fillRect(20, 13, 22, 5); g.beginPath(); g.ellipse(30, 52, 12, 18, 0.25, 0, TAU); g.fill();
          g.lineWidth = 7; g.beginPath(); g.moveTo(26, 66); g.lineTo(14, 84); g.lineTo(34, 88); g.moveTo(36, 66); g.lineTo(46, 88); g.stroke(); g.beginPath(); g.moveTo(38, 44); g.lineTo(52, 58); g.stroke(); });
        this.tapeMan = this.spr(kneel, T, "#ffffff", false, true); this.tapeMan.position.set(wx, t.h + 0.75, wz); this.tapeMan.scale.set(0.95, 1.42, 1);
        const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.0).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: "#f2c230", side: THREE.DoubleSide, fog: true }));
        tl.position.set(wx + 0.5 * Math.cos(a), t.h + 0.85, wz - 0.5 * Math.sin(a)); tl.layers.set(NOINK); T.add(tl); this.tapeLine = tl; }
      // pennants on two far tank tops (shots 1 / 4) and tiny workers walking their roofs
      for (const i of [3, 8]) { const t = TK.tanks[i], py = t.h + t.r * 0.1;
        rod(b, col("mast", "#d8d2c4"), V(O[0] + t.c[0], py - 0.1, O[2] + t.c[2]), V(O[0] + t.c[0], py + 3.4, O[2] + t.c[2]), 0.05);
        this.addFlag(T, V(O[0] + t.c[0], py + 3.3, O[2] + t.c[2]), 1.9, 1.05, 0);
        for (let w = 0; w < (i === 3 ? 2 : 1); w++) this.workers.push({ s: this.spr(P.tinyWorkerTex(0), T, "#ffffff", false, true), c: [O[0] + t.c[0], t.h, O[2] + t.c[2]], r: t.r - 1.2, n: 3 + w, ph: i * 1.3 + w * 2.6 }); }
    }
    // the golden oil (self-lit painted shader, NOINK: no ink, no contact shade on it)
    {
      const rh = TK.hatch.r;
      this.oil = new THREE.ShaderMaterial({ vertexShader: OIL_VERT, fragmentShader: OIL_FRAG, fog: false,
        uniforms: { uR: { value: rh }, uPh: { value: 0 }, uRipK: { value: 1 }, uRing: { value: 9 }, uRingK: { value: 0 }, uOpen: { value: 0 }, uSwell: { value: 0.3 },
          uT: { value: 0 }, uDrift: { value: 0 }, uSpark: { value: 0 }, uBub: { value: -1 },
          uFlash: { value: 0 }, uFilm: { value: 0 }, uPop: { value: -1 }, uCloud: { value: 0 }, uDrip: { value: 0 }, uDripK: { value: 0 }, uFat: { value: -1 },
          uGold: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uSun: { value: new THREE.Color() },
          uWater: { value: new THREE.Color("#3ba4e0") }, uWaterE: { value: new THREE.Color("#0e4c8a") },
          uRip: { value: new THREE.Vector2() }, uGlint: { value: new THREE.Vector2(0.18, -0.2) } } });
      const m = new THREE.Mesh(new THREE.CircleGeometry(rh + 0.004, 96).rotateX(-Math.PI / 2), this.oil);
      m.position.set(O[0] + HC[0], TK.hatch.oil, O[2] + HC[2]); m.layers.set(NOINK); m.renderOrder = 1; T.add(m);
    }
    // the tank man's measuring tape (a yellow ribbon, oriented to the lens each frame), its reel, the plumb bob
    {
      this.tapeTex = P.measureTapeTex().clone(); this.tapeTex.needsUpdate = true; this.tapeTex.wrapS = this.tapeTex.wrapT = THREE.RepeatWrapping;
      this.tape = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ map: this.tapeTex, side: THREE.DoubleSide }));
      this.tape.layers.set(NOINK); T.add(this.tape);
      // fix r2 (audit A2 ADD shot 16): the tape's bold red '90' sits just above the oil line in the loop frame
      this.tape90 = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.104), new THREE.MeshBasicMaterial({ map: P.tape90Tex(), side: THREE.DoubleSide }));
      this.tape90.layers.set(NOINK); this.tape90.matrixAutoUpdate = false; T.add(this.tape90);
      const rb = new Batch(), red = col("reel", "#b8472e");
      rb.add(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 28).rotateX(Math.PI / 2), red);
      rb.add(new THREE.CylinderGeometry(0.085, 0.085, 0.056, 28).rotateX(Math.PI / 2), col("reelTape2", "#f2c230"));
      rb.add(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 12).rotateX(Math.PI / 2), col("reelHub", "#3a3030"));
      for (let k = 0; k < 4; k++) rb.add(boxGeo(V(-0.006, 0, -0.03), V(0.006, 0.1, 0.03), 0, true), col("reelSpoke", "#7a2a1a"), M(0, 0, 0, 0, [1, 1, 1], 0, (k * Math.PI) / 2));
      rb.add(boxGeo(V(0.09, -0.012, 0.03), V(0.14, 0.012, 0.05), 0, true), col("reelHub", "#3a3030"));
      rb.add(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8).rotateX(Math.PI / 2), col("reelKnob", "#e8d8b0"), M(0.13, 0, 0.08));
      rb.build(this.reel, true); T.add(this.reel);
      this.bob = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 14).rotateX(Math.PI), lam("sx_bob", () => ({ color: "#e0b040" }))); T.add(this.bob);
      this.bobGlint = this.spr(P.glintStarTex(), T, new THREE.Color(1.6, 1.35, 0.8), true, false); this.bobGlint.visible = false;
      for (let k = 0; k < 5; k++) { const s = this.spr(P.dripDropTex(), T, new THREE.Color(1.25, 0.95, 0.4)); s.visible = false; this.splash4.push(s); }
      // fix r3 (audit A3 P2 shot 4: the tape blended into the cream roof; no source for the plunk): a saturated #F2C21B tape
      // with navy ink edges for shot 4 (the loop shots keep theirs: frame 0 = the last frame), and a bright gold impact ring
      // on the oil at the plunk
      this.tape4Tex = P.measureTape4Tex().clone(); this.tape4Tex.needsUpdate = true; this.tape4Tex.wrapS = this.tape4Tex.wrapT = THREE.RepeatWrapping;
      this.plunkRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.rippleTex(), color: new THREE.Color(1.7, 1.25, 0.45), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      this.plunkRing.layers.set(NOINK); this.plunkRing.renderOrder = 3; this.plunkRing.visible = false; T.add(this.plunkRing);
    }
    // ---- the ground at the tank foot (shot 4 B two-shot) ----
    {
      const fx = (a: number, rr: number): [number, number] => pol(O[0], O[2], rr, a * D2R);
      // the level gauge: a tall white board with a float cable, the pointer high at FULL
      { const ga = -3 * D2R, [gx, gz] = pol(O[0], O[2], R + 0.06, ga); const gb = new THREE.CylinderGeometry(R + 0.06, R + 0.06, 9.4, 6, 1, true, ga - 0.022, 0.044).translate(0, 5.6, 0);
        b.add(gb, texM("gauge", () => P.rep(P.gaugeTex(), 1, 1), { side: THREE.FrontSide }), M(O[0], 0, O[2]));
        rod(b, col("gaugeCable", "#3a3a40"), V(gx, 1.0, gz), V(gx, H + 0.2, gz), 0.008);
        cbox(b, col("gaugePointer", "#c0241c"), gx + Math.sin(ga) * 0.05, 10.25, gz + Math.cos(ga) * 0.05, 0.34, 0.06, 0.05, ga); }
      // NO SMOKING plate + the tank number stencil (as decals on the shell)
      // fix r3 (audit A3 P3 shot 4: the ladder's violet shadow tinted 'ING' and read as a glitch): the plate is an UNLIT board
      { const pa = 9 * D2R, g = new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.36, 8, 1, true, pa - 0.055, 0.11).translate(0, 2.25, 0);
        const ns = this.board(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: P.plateTex("nosmoke", ["NO", "SMOKING"], "#c4281e", "#f6f0e2", 512, 256) })), "tanktop", 0.92); ns.position.set(O[0], 0, O[2]); T.add(ns); }
      // fix r2 (audit A2 ADD shot 4): the hero is "No. 7" here too (the same tank as the shot-2 gate wide), and a smaller
      // stencil in the ground two-shot B above the NO SMOKING plate
      { const na = -24 * D2R, w = 3.6, g = new THREE.CylinderGeometry(R + 0.015, R + 0.015, 1.2, 24, 1, true, na - w / (2 * R), w / R).translate(0, 6.7, 0); b.add(g, decalM("stencilNo7", () => P.stencilTex("No. 7"), { side: THREE.FrontSide }), M(O[0], 0, O[2])); }
      { const na = 3.5 * D2R, w = 1.5, g = new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.5, 16, 1, true, na - w / (2 * R), w / R).translate(0, 3.0, 0); b.add(g, decalM("stencilNo7", () => P.stencilTex("No. 7"), { side: THREE.FrontSide }), M(O[0], 0, O[2])); }
      // fix r2 (audit A2 P3 shot 4: nothing in B said 'he is up there'): the access ladder runs on DOWN from the stair
      // landing to the ground in line with the top flight (stiles, rungs every 0.3 m, wall brackets), so B shows its foot
      // rising out of the top of frame with its striped shadow on the wall
      { const steel = STEEL_GREY(), [x, z] = pol(O[0], O[2], R + 0.28, LAD_A);
        for (const s of [-0.23, 0.23]) { const tx = Math.cos(LAD_A) * s, tz = -Math.sin(LAD_A) * s; box(b, steel, x + tx - 0.025, 0.05, z + tz - 0.035, x + tx + 0.025, LAND_Y, z + tz + 0.035);
          for (let y = 1.2; y < LAND_Y; y += 1.5) { const [x0, z0] = pol(O[0], O[2], R, LAD_A); rod(b, steel, V(x0 + tx, y, z0 + tz), V(x + tx, y, z + tz), 0.018); } }
        for (let y = 0.3; y < LAND_Y; y += 0.3) b.add(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 6).rotateZ(Math.PI / 2), steel, M(x, y, z, LAD_A));
        b.add(new THREE.BoxGeometry(0.62, 0.06, 0.4), col("ladderFoot", "#6a6460"), M(x, 0.03, z, LAD_A)); }
      // a rope + bucket line hangs from the rail at the left of B (tank men haul tools up)
      { const ra = -13.5 * D2R, [x0, z0] = pol(O[0], O[2], TK.rail.r, ra), [x1, z1] = pol(O[0], O[2], R + 0.12, ra), rope = col("rope", "#c9b080");
        rod(b, rope, V(x0, H + TK.rail.h, z0), V(x1, H + 0.05, z1), 0.012); rod(b, rope, V(x1, H + 0.05, z1), V(x1 + 0.02, 2.35, z1 + 0.06), 0.012);
        b.add(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 14, 1, true).translate(0, 0.15, 0), lam("sx_bucketG", () => ({ color: "#9aa2a8", side: THREE.DoubleSide })), M(x1 + 0.02, 2.0, z1 + 0.06));
        b.add(new THREE.TorusGeometry(0.15, 0.012, 5, 16, Math.PI).rotateY(0.6), col("bucketHandle", "#5a5a60"), M(x1 + 0.02, 2.3, z1 + 0.06)); }
      // a nozzle + valve at the foot (behind the inspector), its pipe dropping into a ground run toward +x (fix r2: 9.5 deg,
      // clear of the ladder's left stile)
      { const a = 9.5 * D2R, [nx, nz] = fx(9.5, R), [vx, vz] = fx(9.5, R + 0.5), pipe = col("pipeGreen", "#6f7f6a");
        rod(b, pipe, V(nx, 0.55, nz), V(vx, 0.55, vz), 0.1); b.add(new THREE.BoxGeometry(0.28, 0.3, 0.24), col("valveBody", "#4f5a58"), M(vx, 0.55, vz, a));
        rod(b, col("valveStem", "#3a3a3a"), V(vx, 0.7, vz), V(vx, 0.98, vz), 0.02); b.add(new THREE.TorusGeometry(0.16, 0.022, 5, 18).rotateX(Math.PI / 2), col("wheelRed", "#c4321f"), M(vx, 0.98, vz));
        const [ex, ez] = fx(9.5, R + 1.2); rod(b, pipe, V(vx, 0.55, vz), V(ex, 0.55, ez), 0.1);
        pipeRun(b, pipe, [[ex, 0.55, ez], [ex + 6, 0.55, ez + 1.0], [O[0] + 8.2, 0.55, O[2] + 7.2]], 0.1); }
      // the manway on the camera side
      { const a = 22 * D2R, [mx, mz] = pol(O[0], O[2], R + 0.04, a); b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24).rotateX(Math.PI / 2), col("manway", "#cbbfa6"), M(mx, 0.85, mz, a));
        for (let k = 0; k < 12; k++) { const t = (k / 12) * TAU; b.add(new THREE.SphereGeometry(0.022, 6, 4), col("bolt", "#4a4038"), M(mx + Math.cos(a) * Math.cos(t) * 0.36 + Math.sin(a) * 0.05, 0.85 + Math.sin(t) * 0.36, mz - Math.sin(a) * Math.cos(t) * 0.36 + Math.cos(a) * 0.05)); } }
      // drums, a pallet, a lying drum, a coiled hose, a sand bucket
      drum(b, O[0] + 2.75, O[2] + 8.15, "#2f5f8a", 0.3); drum(b, O[0] + 3.35, O[2] + 8.45, "#b8432e", 1.2); drum(b, O[0] + 3.0, O[2] + 8.95, "#5a6a3a", 2.1);
      drum(b, O[0] + 3.9, O[2] + 9.6, "#2f5f8a", 0.4, true);
      pallet(b, O[0] - 1.9, O[2] + 8.6, 0.25); drum(b, O[0] - 2.1, O[2] + 8.5, "#d8a03a", 0.8); drum(b, O[0] - 1.55, O[2] + 8.85, "#b8432e", 2.4);
      b.add(new THREE.TorusGeometry(0.3, 0.05, 6, 24).rotateX(Math.PI / 2), col("hose", "#2a2a2e"), M(O[0] - 0.75, 0.05, O[2] + 8.0)); b.add(new THREE.TorusGeometry(0.22, 0.05, 6, 24).rotateX(Math.PI / 2), col("hose", "#2a2a2e"), M(O[0] - 0.75, 0.13, O[2] + 8.0));
      b.add(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 14).translate(0, 0.16, 0), col("bucketRed", "#c4321f"), M(O[0] + 1.6, 0, O[2] + 7.75));
      { const sx = O[0] - 0.85, sz = O[2] + 7.8, rd = col("fireStand", "#b8332a");  // fix r1 (audit ADD): a fire-bucket stand, three conical buckets
        for (const dx of [-0.5, 0.5]) { rod(b, rd, V(sx + dx, 0, sz - 0.1), V(sx + dx * 0.9, 1.35, sz), 0.025); rod(b, rd, V(sx + dx, 0, sz + 0.1), V(sx + dx * 0.9, 1.35, sz), 0.025); }
        rod(b, rd, V(sx - 0.47, 1.3, sz), V(sx + 0.47, 1.3, sz), 0.022);
        for (const dx of [-0.3, 0, 0.3]) b.add(new THREE.ConeGeometry(0.11, 0.3, 14).rotateX(Math.PI), col("fireBucket", "#d23a22"), M(sx + dx, 1.08, sz + 0.06)); }
      // ground decals: oil stains, puddles (one with an oil sheen), weeds along the foundation
      // fix r2 (audit A2 P3 shot 4: the near out-of-focus stains read as lens smudges): lighter (0.32), smaller; the nearest
      // one is now a cast-iron drain grate with a faint stain; a pallet with two drums frames B's lower-left corner (soft in
      // the DOF); the tank man's black lunch pail + a thermos sit on the lying drum by the pipe run
      const stain = decalM("oilStainB", () => P.puddleTex(true, 3), { color: "#5a4a48", opacity: 0.32 });
      for (const [x, z, s, r0] of [[-0.6, 11.3, 1.0, 0.4], [2.2, 9.4, 0.85, 1.2], [-1.4, 10.0, 0.7, 0.7]] as const) flat(bd, stain, O[0] + x, O[2] + z, s, s * 0.8, r0);
      // fix r3 (audit A3 P3 shot 4: a dark out-of-focus stain at the bottom read as a lens smudge, a cut-off red drum at the
      // bottom-left): the near stain is gone (the grate stays), the pallet + its two drums slide 0.6 m into frame
      flat(bd, texM("drain", () => P.drainTex()), O[0] + 1.6, O[2] + 13.7, 0.5, 0.5, 0.15, 0.014);  // (r3 check: off B's bottom edge, no near-lens blot)
      pallet(b, O[0] + 0.8, O[2] + 13.15, 0.3); drum(b, O[0] + 0.57, O[2] + 13.0, "#2f5f8a", 0.7); drum(b, O[0] + 1.13, O[2] + 13.35, "#b8432e", 1.9);
      // fix r3 (audit A3 ADD shot 4 B colour): a blue drum beside Tino's side of the pipe run, yellow-black hazard stripes on
      // the camera side of the foundation ring, the noon sky reflected bright in the near puddle
      drum(b, O[0] + 1.95, O[2] + 8.8, "#2a6ab8", 0.9); flat(bd, decalM("aoTop", () => P.aoTex(), { color: "#3a3044", opacity: 0.45 }), O[0] + 1.95, O[2] + 8.8, 0.9, 0.8, 0, 0.013);
      { const a0 = -28 * D2R, a1 = 34 * D2R, hz = new THREE.CylinderGeometry(R + 0.39, R + 0.39, 0.2, 64, 1, true, a0, a1 - a0).translate(0, 0.13, 0);
        const uv = hz.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * ((a1 - a0) * (R + 0.39)) / 0.8);
        b.add(hz, decalM("hazard", () => { const t = P.hazardTex(); t.wrapS = THREE.RepeatWrapping; return t; }, { side: THREE.FrontSide, transparent: false, depthWrite: true }), M(O[0], 0, O[2])); }
      { const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.puddleTex(false, 2), color: "#cfe6ff", transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
        sp.position.set(O[0] + 1.0, 0.018, O[2] + 11.3); sp.rotation.y = 0.3; sp.layers.set(NOINK); sp.renderOrder = 1.2; T.add(sp); this.skyPuddle = sp; }
      // fix r3 (audit A3 ADD shot 4): two gulls perched on the fire-bucket stand's top rail lift off at the echo, just after
      // the cut to B
      for (let k = 0; k < 2; k++) this.standGulls.push(this.spr(P.gullPerchTex(), T, "#ffffff", false, true));
      { const lx = O[0] + 3.9, lz = O[2] + 9.6, ly = 0.58;
        b.add(new THREE.BoxGeometry(0.3, 0.14, 0.18), col("lunchPail", "#1e1e24"), M(lx, ly + 0.07, lz, 0.4));
        b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(0.4 + Math.PI / 2), col("lunchPail", "#1e1e24"), M(lx, ly + 0.14, lz));
        b.add(new THREE.TorusGeometry(0.07, 0.008, 4, 12, Math.PI).rotateY(0.4), col("pailHandle", "#8a8a90"), M(lx, ly + 0.24, lz));
        b.add(cyl(0.045, 0.26, 12), col("thermos", "#2f6a4a"), M(lx + 0.24, ly - 0.02, lz - 0.12)); b.add(cyl(0.05, 0.05, 12), col("thermosCap", "#d8d2c4"), M(lx + 0.24, ly + 0.24, lz - 0.12)); }
      flat(bd, decalM("puddleOil", () => P.puddleTex(true, 1)), O[0] + 1.0, O[2] + 11.3, 1.5, 1.1, 0.3, 0.014);  // fix r1: fully inside the B frame
      flat(bd, decalM("puddle", () => P.puddleTex(false, 2)), O[0] - 1.2, O[2] + 13.4, 1.3, 0.9, -0.4, 0.014);
      for (let k = 0; k < 64; k++) { const a = (-70 + k * 2.6) * D2R, [x, z] = pol(O[0], O[2], R + 0.42 + 0.15 * hash(k, 9), a); if (hash(k, 7) < 0.45) weed(bd, x, z, 0.6 + 0.6 * hash(k, 8), k); }
    }
    // ---- the other tanks (rows round the hero), catwalks, ground pipe runs, a pump house, light poles ----
    const tanks: TankDef[] = TK.tanks.map((t, i) => ({ c: t.c, r: t.r, h: t.h, roof: "cone", stair: { a0: (40 + i * 67) * D2R, a1: (40 + i * 67) * D2R - (t.h - 0.2) / 5.6, y0: 0.2, y1: t.h }, shell: 1 + (i % 3),
      detail: i < 6 ? 1 : 0, num: i % 2 === 0 ? `No. ${61 + i * 7}` : undefined, numA: (100 + i * 31) * D2R }));
    for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), x = side * (48 + (row % 4) * 17 + hash(i, 1) * 5), z = -46 + Math.floor(row / 4) * 20 + hash(i, 2) * 6;
      const r = 6 + hash(i, 3) * 2, h = 10 + hash(i, 4) * 3; tanks.push({ c: [x, 0, z], r, h, roof: "cone", stair: { a0: hash(i, 5) * TAU, a1: hash(i, 5) * TAU - (h - 0.2) / 5.6, y0: 0.2, y1: h }, shell: 1 + (i % 3), detail: 0 }); }
    // fix r2 (audit A2 P2 shot 16 / shot 1: eight broad violet bands across the loop frame were the 13 m neighbour's rim
    // posts and stair, their dawn shadows ~19 m long): that one tank (TK.tanks[2]) is built without casting
    const bnc = new Batch();
    tanks.forEach((t, i) => tank(i === 2 ? bnc : t.detail > 0 ? b : bfar, O, t));
    buildInk(bnc, T, 1, false);
    buildInk(bfar, T, 0.6);
    catwalk(b, [O[0] - 2 + 4.6, 10.3, O[2] - 20 + 4.6], [O[0] + 15 - 5.3, 13.3, O[2] - 14 - 5.3]);
    catwalk(b, [O[0] - 19 + 4.2, 10.3, O[2] - 22 + 0.4], [O[0] - 2 - 6.4, 10.3, O[2] - 20 - 0.8]);
    catwalk(b, [O[0] - 17 + 3.5, 12.2, O[2] - 3 + 6.0], [O[0] - 15 + 3.0, 11.2, O[2] + 14 - 5.8]);
    { const pg = col("pipeGreen", "#6f7f6a"), pr = col("pipeRust", "#9a5a3a"), pa = col("pipeAlu", "#b8bcc0");
      pipeRun(b, pr, [[O[0] - 4.6, 0.55, O[2] + 5.3], [O[0] - 6.4, 0.55, O[2] + 7.2], [O[0] - 10.3, 0.55, O[2] + 9.7]], 0.12);
      pipeRun(b, pa, [[O[0] - 8, 0.4, O[2] - 4.5], [O[0] - 8, 0.4, O[2] - 13], [O[0] - 13, 0.4, O[2] - 18]], 0.09);
      pipeRun(b, pg, [[O[0] + 7.2, 0.7, O[2] - 2.5], [O[0] + 9.5, 0.7, O[2] - 6.5], [O[0] + 9.5, 0.7, O[2] - 20]], 0.14);
      pipeRun(b, pr, [[O[0] - 3, 0.5, O[2] - 7.5], [O[0] - 3, 0.5, O[2] - 13.6]], 0.1);
      // an elevated pipe rack running out toward the quay (H frames, three pipes)
      for (let z = -30; z <= -8; z += 5.5) { box(b, col("rackSteel", "#5d5a58"), O[0] + 23.8, 0, O[2] + z - 0.1, O[0] + 24.0, 4.2, O[2] + z + 0.1); box(b, col("rackSteel", "#5d5a58"), O[0] + 26.4, 0, O[2] + z - 0.1, O[0] + 26.6, 4.2, O[2] + z + 0.1);
        box(b, col("rackSteel", "#5d5a58"), O[0] + 23.6, 4.1, O[2] + z - 0.12, O[0] + 26.8, 4.3, O[2] + z + 0.12); }
      pipeRun(b, pg, [[O[0] + 24.4, 4.5, O[2] - 56], [O[0] + 24.4, 4.5, O[2] - 6]], 0.2, false); pipeRun(b, pr, [[O[0] + 25.2, 4.45, O[2] - 56], [O[0] + 25.2, 4.45, O[2] - 6]], 0.15, false); pipeRun(b, pa, [[O[0] + 26.0, 4.4, O[2] - 56], [O[0] + 26.0, 4.4, O[2] - 6]], 0.12, false); }
    { // a small brick pump house with a tin roof and a door
      const ph = new THREE.Matrix4().makeTranslation(O[0] - 9.5, 0, O[2] - 31);
      b.add(boxGeo(V(-3, 0, -2.2), V(3, 3.2, 2.2), 0, true), texM("brickPump", () => P.rep(P.brick(), 3, 1.6)), ph);
      b.add(new THREE.CylinderGeometry(0.01, 3.8, 1.2, 4, 1).rotateY(Math.PI / 4).scale(1.15, 1, 0.85).translate(0, 3.8, 0), col("tinRoof", "#7a8088"), ph);
      b.add(boxGeo(V(-0.6, 0, 2.2), V(0.6, 2.2, 2.25), 0, true), col("pumpDoor", "#3f5a6a"), ph); }
    // utility poles with sagging wires across the yard (1960s)
    { const wood = col("pole", "#6a4e38"), wire = col("wire", "#2a2a30"), poles: [number, number][] = [[-30, 22], [-10, 26], [10, 26], [30, 22]];
      for (const [x, z] of poles) { box(b, wood, O[0] + x - 0.13, 0, O[2] + z - 0.13, O[0] + x + 0.13, 11, O[2] + z + 0.13); box(b, wood, O[0] + x - 1.2, 10.2, O[2] + z - 0.08, O[0] + x + 1.2, 10.4, O[2] + z + 0.08); }
      for (let i = 1; i < poles.length; i++) for (const s of [-1, 0, 1]) { const [x0, z0] = poles[i - 1], [x1, z1] = poles[i], N = 10;
        for (let k = 0; k < N; k++) { const t0 = k / N, t1 = (k + 1) / N, sag = (t: number) => -1.2 * 4 * t * (1 - t);
          rod(b, wire, V(O[0] + x0 + (x1 - x0) * t0 + s, 10.45 + sag(t0), O[2] + z0 + (z1 - z0) * t0), V(O[0] + x0 + (x1 - x0) * t1 + s, 10.45 + sag(t1), O[2] + z0 + (z1 - z0) * t1), 0.012, 4); } } }
    // scattered dressing across the yard: drums, pallets, puddles, stains, weeds
    for (let i = 0; i < 40; i++) { const x = -40 + hash(i, 11) * 80, z = -50 + hash(i, 12) * 75; if (Math.hypot(x, z) < R + 3 || Math.hypot(x - 2, z - 12) < 6) continue;
      if (TK.tanks.some((t) => Math.hypot(x - t.c[0], z - t.c[2]) < t.r + 1.5)) continue;
      const k = hash(i, 13); if (k < 0.35) drum(b, O[0] + x, O[2] + z, ["#2f5f8a", "#b8432e", "#5a6a3a", "#d8a03a"][i % 4], k * 9); else if (k < 0.45) pallet(b, O[0] + x, O[2] + z, k * 7);
      flat(bd, decalM("oilStain", () => P.puddleTex(true, 3), { color: "#4a3a40", opacity: 0.55 }), O[0] + x + 1.4, O[2] + z, 2 + 2 * k, 1.5 + k, k * 5);
      if (k > 0.7) flat(bd, decalM("puddle", () => P.puddleTex(false, 2)), O[0] + x - 1.5, O[2] + z + 1, 2.2, 1.4, k * 3, 0.014); }
    buildInk(b, T, 1);
    buildInk(bd, T, 0, false);
  }

  // ============================================ TANK FARM ============================================
  private buildFarm() {
    const F = this.farm, O = TF.base, b = new Batch(), bd = new Batch(), bfar = new Batch(), gz = TF.gate.z, gh = TF.gate.half;
    F.add(this.wetFarm);
    // ground: gravel yard inside, an asphalt apron + street outside the fence, the concrete driveway through the gate
    b.add(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), texM("farmYard2", () => P.rep(P.yardTex("sxYardC", "#a8916e"), 70, 70)), M(O[0], 0, O[2] - 334));
    b.add(new THREE.PlaneGeometry(700, 60).rotateX(-Math.PI / 2), texM("apron", () => P.rep(P.roadTex(), 116, 10)), M(O[0], 0.005, O[2] + gz + 30));
    b.add(new THREE.PlaneGeometry(6.4, gz - 2).rotateX(-Math.PI / 2), texM("driveFarm", () => P.rep(P.concreteTex("sxConcreteFarm", "#aea38e"), 1, 2.2)), M(O[0], 0.01, O[2] + 2 + (gz - 2) / 2));
    for (let z = 4; z < gz; z += 3) box(b, col("driveJoint", "#8a847a"), O[0] - 3.2, 0.011, O[2] + z, O[0] + 3.2, 0.015, O[2] + z + 0.04);
    b.add(new THREE.PlaneGeometry(700, 0.18).rotateX(-Math.PI / 2), col("roadLine", "#e8d48a"), M(O[0], 0.012, O[2] + gz + 9));
    // the hero tank + a dozen more round it, with stairs, rails, numbers
    // fix r2 (audit A2 P3 shot 2: the stencil's top half peeked under the sign): "No. 7" sits higher, hidden whole behind
    // the sign in the gate wide and whole in the landing
    tank(b, O, { c: TFH.c, r: TFH.r, h: TFH.h, roof: "cone", stair: FARM_STAIR, shell: 0, detail: 2, num: "No. 7", numA: -19 * D2R, numY: 6.0 });
    // fix r2 (A2 binding decision shot 9): the vertical steel ladder at TF.ladder (ground -> the landing at FARM_LAND_Y), the
    // grated landing where the spiral stair starts, and a caged work lamp over it (warm-lit in the storm: the climber's light)
    {
      const steel = STEEL_GREY(), red = RAIL_RED(), cx0 = O[0] + TFH.c[0], cz0 = O[2] + TFH.c[2], A0 = FARM_LAD_A, tx = Math.cos(A0), tz = -Math.sin(A0);
      const [lx, lz] = pol(cx0, cz0, TFH.r + 0.27, A0), [wx, wz] = pol(cx0, cz0, TFH.r, A0);
      for (const s of [-0.24, 0.24]) { box(b, steel, lx + tx * s - 0.026, 0.0, lz + tz * s - 0.036, lx + tx * s + 0.026, FARM_LAND_Y + 1.05, lz + tz * s + 0.036);
        for (let y = 0.9; y < FARM_LAND_Y; y += 1.2) rod(b, steel, V(wx + tx * s, y, wz + tz * s), V(lx + tx * s, y, lz + tz * s), 0.02); }
      for (let y = 0.3; y < FARM_LAND_Y; y += 0.3) b.add(new THREE.CylinderGeometry(0.019, 0.019, 0.48, 6).rotateZ(Math.PI / 2), steel, M(lx, y, lz, A0));
      const [px, pz] = pol(cx0, cz0, TFH.r + 0.5, A0 - 0.3 / 7.5);
      b.add(boxGeo(V(-0.85, -0.05, -0.45), V(0.85, 0.0, 0.45), 0, true), texM("grating", () => P.rep(P.gratingTex(), 1, 6)), M(px, FARM_LAND_Y, pz, A0));
      for (const [dx, dz] of [[-0.85, 0.45], [0.85, 0.45], [0.85, -0.2]] as const) { const x = px + tx * dx + Math.sin(A0) * dz, z = pz + tz * dx + Math.cos(A0) * dz; box(b, red, x - 0.022, FARM_LAND_Y, z - 0.022, x + 0.022, FARM_LAND_Y + 1.0, z + 0.022); }
      { const e = (dx: number, dz: number) => V(px + tx * dx + Math.sin(A0) * dz, FARM_LAND_Y + 1.0, pz + tz * dx + Math.cos(A0) * dz); rod(b, red, e(-0.85, 0.45), e(0.85, 0.45), 0.025); rod(b, red, e(0.85, 0.45), e(0.85, -0.2), 0.025); }
      // the caged lamp on the wall above the landing (bulb posed per shot: warm in the storm)
      const [bx, bz] = pol(cx0, cz0, TFH.r + 0.2, A0 + 0.1);
      b.add(new THREE.BoxGeometry(0.18, 0.24, 0.1), col("lampBox", "#3a3e44"), M(bx, FARM_LAND_Y + 1.7, bz, A0 + 0.1));
      b.add(new THREE.TorusGeometry(0.1, 0.012, 4, 12).rotateX(Math.PI / 2), col("lampArm", "#3a3e44"), M(bx + 0.08 * Math.sin(A0), FARM_LAND_Y + 1.6, bz + 0.08 * Math.cos(A0)));
      this.stairBulb = new THREE.MeshBasicMaterial({ color: "#d8d0b8" });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), this.stairBulb); bulb.position.set(bx + 0.12 * Math.sin(A0), FARM_LAND_Y + 1.6, bz + 0.12 * Math.cos(A0)); bulb.layers.set(NOINK); F.add(bulb);
    }
    // fix r3 (audit A3 P3 shot 2: the neighbours' spiral-stair shadows lay on their curved walls as big jagged violet
    // triangles, 'torn paint'): their stairs no longer cast (the hero's clean diagonal stripes stay)
    const bns = new Batch();
    TF.tanks.forEach((t, i) => tank(b, O, { c: t.c, r: t.r, h: t.h, roof: "cone", stair: { a0: (60 + i * 53) * D2R, a1: (60 + i * 53) * D2R - (t.h - 0.2) / 5.6, y0: 0.2, y1: t.h },
      shell: 1 + (i % 3), detail: i < 4 ? 1 : 0, num: i < 3 ? `No. ${3 + i * 5}` : undefined, numA: (i % 2 ? -30 : 20) * D2R }, bns));
    buildInk(bns, F, 1, false);
    for (let i = 0; i < 22; i++) { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), x = side * (18 + (row % 4) * 15 + hash(i, 21) * 4), z = -42 - Math.floor(row / 4) * 18 + hash(i, 22) * 6;
      const r = 6 + hash(i, 23) * 1.8, h = 10 + hash(i, 24) * 3; tank(bfar, O, { c: [x, 0, z], r, h, roof: "cone", stair: { a0: hash(i, 25) * TAU, a1: hash(i, 25) * TAU - (h - 0.2) / 5.6, y0: 0.2, y1: h }, shell: 1 + (i % 3), detail: 0 }); }
    buildInk(bfar, F, 0.6);
    // the farm hero's details: the dripping valve, a base manifold, NO SMOKING
    {
      this.buildRiser(b, bd, O);
      // the manifold: a header across the tank foot with three risers, valves
      const hdr = col("pipeGreen", "#6f7f6a"), base = [O[0] + TFH.c[0], O[2] + TFH.c[2]] as const;
      const pA = pol(base[0], base[1], TFH.r + 0.7, -58 * D2R), pB = pol(base[0], base[1], TFH.r + 0.7, -40 * D2R);
      pipeRun(b, hdr, [[pA[0], 0.45, pA[1]], [pB[0], 0.45, pB[1]], [pB[0] + 2, 0.45, pB[1] + 3], [O[0] - 14, 0.45, O[2] + 9]], 0.13);
      for (const a of [-56, -48]) { const [x0, z0] = pol(base[0], base[1], TFH.r, a * D2R), [x1, z1] = pol(base[0], base[1], TFH.r + 0.7, a * D2R); rod(b, hdr, V(x0, 1.0, z0), V(x1, 1.0, z1), 0.1); rod(b, hdr, V(x1, 1.0, z1), V(x1, 0.45, z1), 0.1);
        b.add(new THREE.TorusGeometry(0.15, 0.02, 5, 16).rotateX(Math.PI / 2), col("wheelRed", "#c4321f"), M(x1, 1.25, z1)); }
      { const fl = col("foamLine", "#c8462a"), cx0 = O[0] + TFH.c[0], cz0 = O[2] + TFH.c[2];
        arcRing(b, fl, cx0, cz0, TFH.r + 0.22, 0.07, 2.65, -78 * D2R, -6 * D2R, 160);
        for (let a = -76; a <= -8; a += 6) { const [x0, z0] = pol(cx0, cz0, TFH.r, a * D2R), [x1, z1] = pol(cx0, cz0, TFH.r + 0.22, a * D2R); rod(b, col("bracket", "#5d5a58"), V(x0, 2.6, z0), V(x1, 2.6, z1), 0.025); }
        const [rx, rz] = pol(cx0, cz0, TFH.r + 0.22, -62 * D2R); rod(b, fl, V(rx, 0.45, rz), V(rx, 2.65, rz), 0.07);
        const ha = -23 * D2R, [hx, hz] = pol(cx0, cz0, TFH.r + 0.16, ha); cbox(b, col("hoseBox", "#c4321f"), hx, 1.25, hz, 0.62, 0.8, 0.3, ha);
        const [hx2, hz2] = pol(cx0, cz0, TFH.r + 0.315, ha); cbox(b, col("hoseBoxDoor", "#a82a1a"), hx2, 1.25, hz2, 0.5, 0.66, 0.02, ha);
        b.add(new THREE.TorusGeometry(0.17, 0.05, 6, 20), col("hoseCoil", "#d8c8a0"), M(hx2 + Math.sin(ha) * 0.04, 1.25, hz2 + Math.cos(ha) * 0.04, ha));
      }
      { const pa = 14 * D2R, g = new THREE.CylinderGeometry(TFH.r + 0.02, TFH.r + 0.02, 0.4, 8, 1, true, pa - 0.06, 0.12).translate(0, 2.0, 0); b.add(g, texM("noSmoke", () => P.plateTex("nosmoke", ["NO", "SMOKING"], "#c4281e", "#f6f0e2", 512, 256)), M(O[0] + TFH.c[0], 0, O[2] + TFH.c[2])); }
      // catwalk bridges from the hero roof to its neighbours, an elevated pipe rack behind
      catwalk(b, [O[0] + 7.0, TFH.h + 0.5, O[2] - 4.5], [O[0] + 8.6, 11.4, O[2] - 5]);
      catwalk(b, [O[0] - 7.0, TFH.h + 0.5, O[2] - 4.5], [O[0] - 8.6, 11.4, O[2] - 5]);
      for (let x = -26; x <= 26; x += 6.5) { box(b, col("rackSteel", "#5d5a58"), O[0] + x - 0.1, 0, O[2] - 14.1, O[0] + x + 0.1, 5.2, O[2] - 13.9); box(b, col("rackSteel", "#5d5a58"), O[0] + x - 0.1, 0, O[2] - 16.1, O[0] + x + 0.1, 5.2, O[2] - 15.9);
        box(b, col("rackSteel", "#5d5a58"), O[0] + x - 0.12, 5.1, O[2] - 16.3, O[0] + x + 0.12, 5.3, O[2] - 13.7); }
      for (const [dz, r, m] of [[-14.4, 0.2, "#6f7f6a"], [-15.0, 0.16, "#9a5a3a"], [-15.6, 0.13, "#b8bcc0"]] as const) pipeRun(b, col("rp" + m, m), [[O[0] - 30, 5.5 + r, O[2] + dz], [O[0] + 30, 5.5 + r, O[2] + dz]], r, false);
    }
    // the gate: two tall steel posts, a crossbar, the hung sign (+ a navy back panel), the open chain-link leaves
    {
      const post = col("gatePost", "#4e5664"), sg = TF.gate.sign;
      for (const s of [-1, 1]) { box(b, post, O[0] + s * gh - 0.14, 0, O[2] + gz - 0.14, O[0] + s * gh + 0.14, sg.cy + sg.h / 2 + 0.75, O[2] + gz + 0.14);
        b.add(new THREE.ConeGeometry(0.2, 0.2, 4).rotateY(Math.PI / 4), post, M(O[0] + s * gh, sg.cy + sg.h / 2 + 0.85, O[2] + gz)); }
      box(b, post, O[0] - gh, sg.cy + sg.h / 2 + 0.28, O[2] + gz - 0.09, O[0] + gh, sg.cy + sg.h / 2 + 0.46, O[2] + gz + 0.09);
      for (const s of [-1, 1]) rod(b, col("chainHang", "#3a3a40"), V(O[0] + s * (sg.w / 2 - 0.2), sg.cy + sg.h / 2 + 0.28, O[2] + gz), V(O[0] + s * (sg.w / 2 - 0.2), sg.cy + sg.h / 2 + 0.02, O[2] + gz), 0.015);
      box(b, col("signBack", "#22314e"), O[0] - sg.w / 2 - 0.07, sg.cy - sg.h / 2 - 0.07, O[2] + gz - 0.05, O[0] + sg.w / 2 + 0.07, sg.cy + sg.h / 2 + 0.07, O[2] + gz + 0.0);
      const sign = this.board(faceMesh(P.gateSignTex(), sg.w, sg.h), "tankfarm"); sign.position.set(O[0], sg.cy, O[2] + gz + 0.012); F.add(sign);
      // fix r1: two gooseneck lamps over the sign (green enamel shades); their bulbs glow warm in the storm
      { const shade = col("lampShade", "#2f5a4a"), arm = col("lampArm", "#3a3e44"), yb = sg.cy + sg.h / 2 + 0.46;
        this.gateBulb = new THREE.MeshBasicMaterial({ color: "#d8d0b8" });
        for (const x of [-1.15, 1.15]) { rod(b, arm, V(O[0] + x, yb, O[2] + gz), V(O[0] + x, yb + 0.32, O[2] + gz), 0.022);
          b.add(new THREE.TorusGeometry(0.18, 0.022, 6, 16, Math.PI).rotateY(Math.PI / 2), arm, M(O[0] + x, yb + 0.32, O[2] + gz + 0.18));
          b.add(new THREE.ConeGeometry(0.17, 0.16, 16, 1, true), lam("sx_lampShadeIn", () => ({ color: "#2f5a4a", side: THREE.DoubleSide })), M(O[0] + x, yb + 0.3, O[2] + gz + 0.36));
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), this.gateBulb); bulb.position.set(O[0] + x, yb + 0.21, O[2] + gz + 0.36); bulb.layers.set(NOINK); F.add(bulb); void shade; } }
      this.notice = this.board(new THREE.Mesh(new THREE.PlaneGeometry(NOTICE_W, NOTICE_H, 10, 4), new THREE.MeshBasicMaterial({ map: P.bankruptTex(), side: THREE.DoubleSide })), "tankfarm");
      this.notice.position.set(O[0] + NOTICE[0], NOTICE[1], O[2] + NOTICE[2]); F.add(this.notice);
      this.noticeBase = Float32Array.from(this.notice.geometry.attributes.position.array as ArrayLike<number>);
      // fix r2 (audit A2 P2 shot 2 / P3 shot 9): the two leaves are swinging groups (hinged at the posts, posed per shot,
      // swung OUT toward the street as soft foreground framers): chain-link in a tube frame, a brace, two barbed-wire
      // strands on stubs along the top, a drop rod, the KEEP OUT plate on the right leaf
      const link = cutM("chainLink", () => P.rep(P.chainLinkTex(), 2, 1), { alphaTest: 0.35 }), tube = col("fenceTube", "#9aa0a4");
      const barbM = cutM("barb", () => P.rep(P.barbTex(), 12, 1), { alphaTest: 0.3 });
      for (const s of [-1, 1]) { const hx = O[0] + s * (gh - 0.18), hz = O[2] + gz - 0.1, Lw = gh - 0.25;
        const grp = new THREE.Group(); grp.position.set(hx, 0, hz); F.add(grp); this.leaves.push(grp);
        const fb = new Batch(), m = new THREE.Matrix4();
        fb.add(new THREE.PlaneGeometry(Lw, 2.1).translate(Lw / 2, 1.15, 0), link, m);
        for (const y of [0.1, 2.2]) fb.add(new THREE.CylinderGeometry(0.03, 0.03, Lw, 8).rotateZ(Math.PI / 2).translate(Lw / 2, y, 0), tube, m);
        for (const x of [0, Lw]) fb.add(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 8).translate(x, 1.15, 0), tube, m);
        fb.add(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(Lw, 2.1), 6).rotateZ(Math.atan2(Lw, 2.1)).translate(Lw / 2, 1.15, 0), tube, m);
        for (const x of [0.02, Lw - 0.02]) fb.add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6).translate(x, 2.38, 0), tube, m);
        for (const y of [2.33, 2.47]) { const bg = new THREE.PlaneGeometry(Lw, 0.07); const u2 = bg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u2.count; i++) u2.setX(i, (u2.getX(i) * Lw) / 12);
          fb.add(bg.translate(Lw / 2, y, 0), barbM, m); }
        fb.add(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6).translate(Lw - 0.12, 0.05, 0.05), tube, m);
        const cb2 = new Batch(); coil(cb2, col("barbCoil", "#646a72"), 0.06, Lw - 0.06, 2.66, 0, 0.17, 0.15); buildInk(cb2, grp, 0, true);
        buildInk(fb, grp, 0.5);
        if (s > 0) { const ko = this.board(faceMesh(P.plateTex("keepout", ["KEEP", "OUT"], "#f2ece0", "#b8241c", 512, 300), 0.72, 0.42), "tankfarm", 0.92);
          ko.position.set(Lw * 0.5, 1.35, -0.04); ko.rotation.y = Math.PI; grp.add(ko); } }
      // fix r2 (audit A2 P2 shot 2: the flag snaps had no source): two company pennants on short staffs atop the crossbar,
      // inside the gate wide's top corners (they stream in the noon wind and whip in the storm)
      { const yc = sg.cy + sg.h / 2 + 0.46; for (const x of [-1.62, 1.62]) { rod(b, col("mast", "#d8d2c4"), V(O[0] + x, yc, O[2] + gz), V(O[0] + x, yc + 0.72, O[2] + gz), 0.022);
          b.add(new THREE.SphereGeometry(0.035, 8, 6), col("brass", "#c9a24a"), M(O[0] + x, yc + 0.74, O[2] + gz)); this.addFlag(F, V(O[0] + x, yc + 0.7, O[2] + gz), 0.8, 0.44, 1); } }
      // fix r2 (audit A2 ADD shot 2): a herring gull perched on the gate's crossbar; it flaps off as the glide begins
      this.signGull = this.spr(P.gullPerchTex(), F, "#ffffff", false, true);
    }
    // the fence: posts every 3 m, chain-link (lit, cut-out, never inked), barbed wire on outward arms
    {
      const post = col("fencePost", "#9aa0a4"), link = cutM("chainLink", () => P.rep(P.chainLinkTex(), 2, 1), { alphaTest: 0.35 }), barb = cutM("barb", () => P.rep(P.barbTex(), 12, 1), { alphaTest: 0.3 });
      const fb = new Batch();
      for (const s of [-1, 1]) {
        const x0 = s * (gh + 0.2), x1 = s * 70, L = Math.abs(x1 - x0), cxm = O[0] + (x0 + x1) / 2;
        const lg = new THREE.PlaneGeometry(L, 2.3).translate(0, 1.2, 0); const uv = lg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (L / 2.4));
        fb.add(lg, link, M(cxm, 0, O[2] + gz));
        for (let x = x0; s * x <= s * x1; x += s * 3) { box(b, post, O[0] + x - 0.04, 0, O[2] + gz - 0.04, O[0] + x + 0.04, 2.45, O[2] + gz + 0.04);
          rod(b, post, V(O[0] + x, 2.4, O[2] + gz), V(O[0] + x, 2.85, O[2] + gz + 0.42), 0.022); }
        rod(b, post, V(O[0] + x0, 2.42, O[2] + gz), V(O[0] + x1, 2.42, O[2] + gz), 0.025);
        coil(fb, col("barbCoil", "#646a72"), O[0] + s * (gh + 0.3), O[0] + s * (gh + 26), 2.7, O[2] + gz + 0.12, 0.2, 0.17);
        for (let k = 0; k < 3; k++) { const y = 2.55 + k * 0.14, zz = O[2] + gz + 0.13 + k * 0.13; const bg = new THREE.PlaneGeometry(L, 0.07); const u2 = bg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u2.count; i++) u2.setX(i, u2.getX(i) * L / 12);
          fb.add(bg, barb, M(cxm, y, zz)); }
      }
      buildInk(fb, F, 0);
      for (let k = 0; k < 90; k++) { const s = k % 2 ? 1 : -1, x = s * (gh + 0.4 + hash(k, 31) * 30); if (hash(k, 32) < 0.6) weed(bd, O[0] + x, O[2] + gz + (hash(k, 33) - 0.5) * 0.6, 0.6 + 0.7 * hash(k, 34), k); }
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) weed(bd, O[0] + s * (gh + 0.25 + k * 0.12), O[2] + gz + 0.2 - k * 0.1, 0.7 + 0.2 * k, 50 + k);
    }
    // the guard hut, the tanker truck, drums, pallets, a light pole
    {
      const hx = O[0] + HUT[0], hz = O[2] + HUT[2], clap = texM("clap", () => P.rep(P.clapboardTex(), 1, 1.2)), trim = col("hutTrim", "#3f5a6a");
      b.add(boxGeo(V(-1.0, 0, -1.0), V(1.0, 2.5, 1.0), 0, true), clap, M(hx, 0, hz));
      box(b, col("hutRoof", "#4a4a52"), hx - 1.25, 2.5, hz - 1.25, hx + 1.25, 2.68, hz + 1.25);
      for (const [x0, z0, x1, z1] of [[0.99, -0.65, 1.02, 0.65], [-0.65, 0.99, 0.65, 1.02]] as const) { box(b, trim, hx + x0, 1.1, hz + z0, hx + x1 + 0.01, 1.15, hz + z1 + 0.01); box(b, trim, hx + x0, 2.0, hz + z0, hx + x1 + 0.01, 2.05, hz + z1 + 0.01); }
      this.hutWin = new THREE.MeshBasicMaterial({ map: P.shopWindowTex(), color: "#41506a" });
      { const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), this.hutWin); w1.position.set(hx + 1.012, 1.575, hz); w1.rotation.y = Math.PI / 2; w1.layers.set(NOINK); F.add(w1);
        const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), this.hutWin); w2.position.set(hx, 1.575, hz + 1.012); w2.layers.set(NOINK); F.add(w2); }
      box(b, trim, hx - 1.02, 0, hz - 0.45, hx - 0.99, 2.1, hz + 0.45);
      b.add(new THREE.SphereGeometry(0.1, 10, 6), col("hutLamp", "#f2ead6"), M(hx + 1.1, 2.3, hz + 0.75));
      rod(b, col("mast", "#d8d2c4"), V(hx - 0.7, 2.68, hz - 0.7), V(hx - 0.7, 4.7, hz - 0.7), 0.035);
      this.addFlag(F, V(hx - 0.7, 4.62, hz - 0.7), 1.0, 0.56, 1);
      tankerTruck(b, O[0] - 6.2, O[2] + 10.5, -0.3);
      // fix r2 (audit A2 ADD shot 9): a second tanker parked in the mid-ground right, behind the drums (no marks)
      tankerTruck(b, O[0] + 7.0, O[2] + 7.2, 0.45);
      for (const [x, z, c0, ly] of [[3.0, 9.5, "#2f5f8a", 0], [3.6, 9.2, "#b8432e", 0], [3.3, 8.6, "#5a6a3a", 0], [-4.6, 11.6, "#d8a03a", 0], [-5.0, 12.4, "#2f5f8a", 1]] as const) drum(b, O[0] + x, O[2] + z, c0, x * z, !!ly);
      pallet(b, O[0] + 4.2, O[2] + 8.2, 0.4); pallet(b, O[0] - 9.5, O[2] + 13, 0.2);
      // puddles on the driveway / apron (one with an oil sheen), oil stains
      for (const [x, z, w, oil, rot] of [[-1.1, 9.2, 1.6, 0, 0.3], [1.5, 13.4, 1.1, 1, 1.2], [0.6, 19.5, 2.2, 0, 0.1], [-1.8, 21.5, 1.4, 1, 2.0], [2.2, 22.6, 1.8, 0, 0.8], [-0.5, 4.8, 1.2, 0, 2.5]] as const)
        flat(bd, decalM(oil ? "puddleOil" : "puddle", () => P.puddleTex(!!oil, oil ? 1 : 2)), O[0] + x, O[2] + z, w, w * 0.7, rot, 0.016);
      for (let i = 0; i < 18; i++) flat(bd, decalM("oilStain", () => P.puddleTex(true, 3), { color: "#4a3a40", opacity: 0.55 }), O[0] - 12 + hash(i, 41) * 24, O[2] - 2 + hash(i, 42) * 30, 1 + hash(i, 43) * 2, 0.8 + hash(i, 44), hash(i, 45) * 6);
    }
    // the drip (shot 2): its landing ring
    this.dripRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.rippleTex(), transparent: true, depthWrite: false, color: "#e8f4ff", fog: false }));
    this.dripRing.layers.set(NOINK); this.dripRing.renderOrder = 3; F.add(this.dripRing);
    this.buildFarmDressing(b, bd, O);
    // steam from the pump house beyond, a far skyline for the gaps
    { const src = V(O[0] - 22, 7, O[2] - 30); b.add(cyl(0.35, 7, 12), texM("brickPump", () => P.rep(P.brick(), 1, 3)), M(src.x, 0, src.z));
      this.puffs.push(...[0, 1, 2, 3, 4].map((k) => ({ s: this.spr(P.puffTex(), F, "#ffffff"), src: src.clone().setY(7.2), n: 31 + k * 5, ph: k * 0.2, rise: 5, drift: 4, size: 2.6, set: "tankfarm" as const, alpha: 0.5 }))); }
    { const m = new THREE.MeshBasicMaterial({ map: P.skylineTex(3), transparent: true, depthWrite: false, fog: false }); const s = new THREE.Mesh(new THREE.PlaneGeometry(1500, 281), m);
      s.position.set(O[0], 4 + 140, O[2] - 760); s.layers.set(NOINK); s.renderOrder = -0.4; F.add(s); this.skylines.push(m); }
    buildInk(b, F, 1);
    buildInk(bd, F, 0, false);
    this.buildStorm(O);
  }


  /** fix r1 (plan A1): the dripping valve on a PIPE RISER at TF.valve (Tino's left): a pipe run along the ground back to
   *  the hero tank's wall (x -3.6, beside the drive), the riser, a standpipe gate valve with a red handwheel, a tee with a
   *  pressure gauge (its needle jitters), the spout turning down toward Tino; the fat drip, its bead, splash droplets and
   *  the puddle it feeds */
  private buildRiser(b: Batch, bd: Batch, O: V3) {
    const F = this.farm, vx = O[0] + TF.valve[0], vy = TF.valve[1], vz = O[2] + TF.valve[2];
    const pipe = col("pipeGreen", "#6f7f6a"), dark = col("valveBody", "#4f5a58"), fl = col("flange", "#6c6a68"), red = col("wheelRed", "#c4321f");
    const wx = O[0] - 3.6, wz = O[2] + TFH.c[2] + Math.sqrt(TFH.r * TFH.r - 3.6 * 3.6);
    pipeRun(b, pipe, [[wx, 0.32, wz - 0.2], [wx, 0.32, vz], [vx, 0.32, vz]], 0.085);
    rod(b, fl, V(wx, 0.32, wz + 0.02), V(wx, 0.32, wz + 0.1), 0.13);
    b.add(new THREE.SphereGeometry(0.092, 12, 8), pipe, M(vx, 0.32, vz));
    rod(b, pipe, V(vx, 0.32, vz), V(vx, vy - 0.12, vz), 0.075);
    b.add(cyl(0.11, 0.035, 16), fl, M(vx, vy - 0.16, vz)); b.add(cyl(0.12, 0.06, 16), fl, M(vx, 0.0, vz)); rod(b, col("pipeStand", "#5d5a58"), V(vx, 0.05, vz), V(vx, 0.25, vz), 0.045);
    b.add(new THREE.SphereGeometry(0.12, 14, 10).scale(1, 1.15, 0.9), dark, M(vx, vy, vz));
    b.add(cyl(0.06, 0.16, 12), dark, M(vx, vy + 0.1, vz)); rod(b, col("valveStem", "#3a3a3a"), V(vx, vy + 0.26, vz), V(vx, vy + 0.36, vz), 0.016);
    b.add(new THREE.TorusGeometry(0.12, 0.018, 6, 22).rotateX(Math.PI / 2), red, M(vx, vy + 0.35, vz));
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; rod(b, red, V(vx, vy + 0.35, vz), V(vx + 0.12 * Math.cos(a), vy + 0.35, vz + 0.12 * Math.sin(a)), 0.01); }
    // the outlet + downturned spout (its mouth = SPOUT)
    rod(b, pipe, V(vx, vy, vz), V(O[0] + SPOUT[0], vy, vz), 0.04); b.add(new THREE.SphereGeometry(0.045, 10, 8), pipe, M(O[0] + SPOUT[0], vy, vz));
    rod(b, pipe, V(O[0] + SPOUT[0], vy, vz), V(O[0] + SPOUT[0], SPOUT[1] + 0.02, vz), 0.04);
    b.add(new THREE.TorusGeometry(0.042, 0.012, 6, 14).rotateX(Math.PI / 2), fl, M(O[0] + SPOUT[0], SPOUT[1] + 0.02, vz));
    // the pressure gauge on a tee (faces the street side), its red needle posed per frame
    rod(b, pipe, V(vx, vy - 0.38, vz), V(vx, vy - 0.38, vz + 0.12), 0.022);
    b.add(new THREE.CylinderGeometry(0.085, 0.085, 0.045, 20).rotateX(Math.PI / 2), col("gaugeBody", "#3a3a40"), M(vx, vy - 0.38, vz + 0.15));
    b.add(new THREE.CircleGeometry(0.072, 20), col("gaugeFace", "#f2eee2"), M(vx, vy - 0.38, vz + 0.173));
    for (let k = 0; k <= 6; k++) { const a = -2.2 + (k / 6) * 4.4; cbox(b, col("gaugeTick", "#2a2a2e"), vx + 0.058 * Math.sin(a), vy - 0.38 + 0.058 * Math.cos(a), vz + 0.174, 0.006, 0.016, 0.002, 0, 0, -a); }
    cbox(b, col("gaugeRed", "#c4321f"), vx + 0.05 * Math.sin(1.6), vy - 0.38 + 0.05 * Math.cos(1.6), vz + 0.174, 0.01, 0.022, 0.002, 0, 0, -1.6);
    this.needle = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.06, 0.004).translate(0, 0.026, 0), lam("sx_needle", () => ({ color: "#1e1e24" })));
    this.needle.position.set(vx, vy - 0.38, vz + 0.178); F.add(this.needle);
    // the drip puddle beside Tino's feet (grows when the drop lands) + the fat drop, its bead, three splash droplets
    // fix r3 (audit A3 ADD shot 2): the puddle the valve has fed for weeks is OILY (a rainbow sheen), spread in front of the
    // pipe where the run-off lands
    this.dripPuddle = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), decalM("dripPuddleOil", () => P.puddleTex(true, 6)));
    this.dripPuddle.position.set(O[0] + SPOUT[0] + 0.12, 0.017, vz + 0.32); this.dripPuddle.renderOrder = 1; F.add(this.dripPuddle);
    this.dripCrown = this.spr(P.crownThinTex(), F, "#eef6ff", false, false); this.dripCrown.center.set(0.5, 0.12); this.dripCrown.renderOrder = 6;
    this.dripWet = this.spr(P.glintStarTex(), F, new THREE.Color(1.3, 1.4, 1.6), true, false); this.dripWet.renderOrder = 6;
    this.drop = this.spr(P.dripDropTex(), F, "#ffffff", false, false); this.drop.center.set(0.5, 0.94);
    this.bead = this.spr(P.dripDropTex(), F, "#ffffff", false, false); this.bead.center.set(0.5, 0.94);
    for (let k = 0; k < 3; k++) this.dropKids.push(this.spr(P.dripDropTex(), F, "#ffffff", false, false));
    // fix r2 (audit A2 P1): a 2-3 f glint on the spout as the drop lets go
    this.spoutGlint = this.spr(P.glintStarTex(), F, new THREE.Color(1.5, 1.6, 1.8), true, false); this.spoutGlint.renderOrder = 6;
    void bd;
  }

  /** fix r1 (audit A1 P2 shot 2): the landing ground beside Tino (a drain grate, a hose coil, drums with contact shade),
   *  tyre tracks and a painted SLOW mark on the apron, wet debris, a pennant on No. 7, a steam stub on its roof */
  private buildFarmDressing(b: Batch, bd: Batch, O: V3) {
    const F = this.farm, ao = decalM("aoFarm", () => P.aoTex(), { color: "#3a3044", opacity: 0.5 });
    flat(bd, texM("drain", () => P.drainTex()), O[0] + 0.95, O[2] + 12.15, 0.55, 0.55, 0.05, 0.014);
    for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.27 - k * 0.04, 0.04, 6, 24).rotateX(Math.PI / 2), col("hose", "#2a2a2e"), M(O[0] + 1.8, 0.04 + k * 0.075, O[2] + 13.7));
    flat(bd, ao, O[0] + 1.8, O[2] + 13.7, 0.9, 0.75, 0, 0.013);
    drum(b, O[0] + 2.6, O[2] + 12.55, "#b8432e", 0.4); drum(b, O[0] + 3.15, O[2] + 12.85, "#2f5f8a", 1.1); drum(b, O[0] + 2.85, O[2] + 13.35, "#d8a03a", 2.2, true);
    flat(bd, ao, O[0] + 2.85, O[2] + 12.9, 1.8, 1.4, 0.3, 0.013);
    for (const [x, z, c0] of [[3.0, 9.5, 0], [3.3, 8.6, 1], [-4.6, 11.6, 2], [-6.2, 10.5, 3]] as const) flat(bd, ao, O[0] + x, O[2] + z, c0 === 3 ? 3.4 : 1.1, c0 === 3 ? 8.2 : 0.9, c0 === 3 ? -0.3 : 0, 0.013);
    flat(bd, decalM("tyre", () => P.rep(P.tyreTrackTex(), 1, 8)), O[0] + 0.05, O[2] + 17, 2.9, 26, 0, 0.0135);
    // fix r2 (audit A2 LEAD P2: a giant blurred 'SLOW' fragment filled the landing's foreground): the marking moves out to
    // the street apron (whole at the bottom of the gate wide, behind the lens before the landing)
    // fix r3 (A3 P1 shot 9 + P3 shot 2): the SLOW marking is its own mesh, shown in shot 2 only (never in the storm, where it
    // read as part of the caption), 3.4 m further out on the apron so it leaves the glide's frame by ~305 (whole and low in
    // the gate wide, y ~1720-1910 at 1080)
    this.slow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.1).rotateX(-Math.PI / 2), decalM("slow", () => P.slowTex()));
    this.slow.position.set(O[0] + 0.1, 0.0145, O[2] + 23.0); this.slow.receiveShadow = true; this.slow.userData.ink = 0; F.add(this.slow);
    // fix r2 (audit A2 ADD shot 2): the gate threshold: a steel trench drain across the drive, an oil puddle with a sheen,
    // a dropped work glove, grit and leaves at the kerb, weeds at the post feet; VEG OIL stencils on the right-hand drums
    { const tr = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 0.32).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: P.rep(P.drainTex(), 18, 1) }));
      tr.position.set(O[0], 0.016, O[2] + TF.gate.z + 0.45); tr.receiveShadow = true; F.add(tr); }
    flat(bd, decalM("puddleOil", () => P.puddleTex(true, 1)), O[0] + 1.2, O[2] + 15.3, 1.3, 0.9, 0.7, 0.017);
    flat(bd, decalM("gutterLitter", () => P.gutterLitterTex()), O[0] - 1.0, O[2] + 16.9, 2.4, 0.6, 0.1, 0.0175);
    flat(bd, decalM("gutterLitter", () => P.gutterLitterTex()), O[0] + 1.6, O[2] + 14.6, 2.0, 0.5, -0.3, 0.0175);
    { const gl = new THREE.Shape(); gl.moveTo(0, 0); gl.lineTo(0.09, 0); gl.lineTo(0.1, 0.1); gl.lineTo(0.13, 0.17); gl.lineTo(0.1, 0.19); gl.lineTo(0.07, 0.13); gl.lineTo(0.05, 0.2); gl.lineTo(0.02, 0.2); gl.lineTo(0.0, 0.12); gl.closePath();
      b.add(new THREE.ExtrudeGeometry(gl, { depth: 0.025, bevelEnabled: false }).rotateX(-Math.PI / 2), col("glove", "#c8a050"), M(O[0] - 0.6, 0.02, O[2] + 15.0, 0.8)); }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) weed(bd, O[0] + s * (TF.gate.half + 0.05) + (k - 1) * 0.18, O[2] + TF.gate.z + 0.3 + 0.1 * k, 0.6 + 0.2 * k, 70 + k + (s > 0 ? 3 : 0));
    { const vm = decalM("vegOil", () => P.vegOilStencilTex(), { side: THREE.FrontSide });
      for (const [x, z, a] of [[2.6, 12.55, -0.2], [3.15, 12.85, -0.25], [3.0, 9.5, -0.15]] as const) b.add(new THREE.CylinderGeometry(0.296, 0.296, 0.16, 20, 1, true, a - 0.75, 1.5).translate(0, 0.52, 0), vm, M(O[0] + x, 0, O[2] + z)); }
    // wet debris on the apron / yard: a soaked newspaper, a wooden crate, a hose (both farm shots)
    flat(b, lam("sx_wetPaper", () => ({ map: P.wetPaperTex(), side: THREE.DoubleSide })), O[0] + 1.55, O[2] + 17.35, 0.52, 0.38, 0.55, 0.02);
    cbox(b, texM("crate", () => P.boardsTex("#8a6a48")), O[0] - 2.4, 0.3, O[2] + 18.7, 0.6, 0.6, 0.6, 0.35); flat(bd, ao, O[0] - 2.4, O[2] + 18.7, 1.0, 0.9, 0.35, 0.013);
    // a pennant on No. 7's roof (streams in the wind, whips in the storm) + a steaming stub pipe on its cone
    const pk = 12 + TFH.r * 0.1;
    rod(b, col("mast", "#d8d2c4"), V(O[0] + TFH.c[0], pk - 0.1, O[2] + TFH.c[2]), V(O[0] + TFH.c[0], pk + 4.6, O[2] + TFH.c[2]), 0.06);
    this.addFlag(F, V(O[0] + TFH.c[0], pk + 4.5, O[2] + TFH.c[2]), 2.1, 1.15, 1);
    const sx = O[0] - 2.0, sz = O[2] + 0.2, sy = 12 + TFH.r * 0.1 * (1 - Math.hypot(-2.0 - TFH.c[0], 0.2 - TFH.c[2]) / TFH.r);
    b.add(cyl(0.1, 0.75, 10), col("vent", "#9a917f"), M(sx, sy - 0.05, sz)); b.add(cyl(0.14, 0.05, 10), col("ventLip", "#7a705e"), M(sx, sy + 0.68, sz));
    this.puffs.push(...[0, 1, 2, 3].map((k) => ({ s: this.spr(P.puffTex(), F, "#ffffff"), src: V(sx, sy + 0.8, sz), n: 37 + k * 6, ph: k / 4, rise: 2.4, drift: 2.4, size: 1.3, set: "tankfarm" as const, alpha: 0.45 })));
  }

  /** fix r1 (audit A1 P2 shot 9: grey, dry, thick rain bars, no lightning): a saturated blue storm. A deep-blue wet
   *  sheen on the ground, navy puddles with the tank's pale reflection and constant rain rings, white splash crowns,
   *  hair-thin rain in depth layers + far rain curtains, wet rivulets running down No. 7, a scudding storm deck, a blue
   *  rain haze between the gate and the tank, water pouring off the gate beam, drips along the sign, lightning on the two
   *  thunder rolls (a flash + a bolt), the hut's warm window pool, a newspaper tumbling in a gust, a spray off BANKRUPT */
  private buildStorm(O: V3) {
    const W = this.wetFarm, gz = TF.gate.z, gh = TF.gate.half, sg = TF.gate.sign;
    const basic = (o: THREE.MeshBasicMaterialParameters) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, ...o });
    const add = (m: THREE.Mesh | THREE.Sprite | THREE.InstancedMesh, ro: number) => { m.layers.set(NOINK); m.renderOrder = ro; W.add(m); return m; };
    // fix r2 (carry-over: shot 9 mid-frame L* 40-46): a darker soaked ground (albedo ~x0.65) and the lower 3 m of No. 7
    // darkened by the rain (~x0.8) with vertical gloss streaks
    { const wet = new THREE.Mesh(new THREE.PlaneGeometry(120, 60).rotateX(-Math.PI / 2), basic({ color: "#121c40", opacity: 0.56, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      wet.position.set(O[0], 0.02, O[2] + 10); add(wet, 1); }
    { const t = P.ptex("sxWetFoot", 1024, 256, (g, r) => { g.clearRect(0, 0, 1024, 256);
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(14,22,52,0)"); gr.addColorStop(0.55, "rgba(14,22,52,0.32)"); gr.addColorStop(1, "rgba(14,22,52,0.5)"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
        for (let i = 0; i < 120; i++) { const x = r() * 1024, y0 = r() * 120, L = 60 + 130 * r(); g.fillStyle = `rgba(200,214,240,${0.08 + 0.14 * r()})`; g.fillRect(x, y0, 1.5 + 2 * r(), L); } });
      t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(TFH.r + 0.045, TFH.r + 0.045, 3.2, 96, 1, true, -1.45, 2.9).translate(0, 1.6, 0), basic({ map: t, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.position.set(O[0] + TFH.c[0], 0, O[2] + TFH.c[2]); add(m, 1.1); }
    // the stair lamp's warm pool on the wet ground at the ladder foot + a glow round the bulb (the climber's light)
    { const [lx, lz] = pol(O[0] + TFH.c[0], O[2] + TFH.c[2], TFH.r + 1.1, FARM_LAD_A);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0).rotateX(-Math.PI / 2), basic({ map: P.softDotTex(), color: new THREE.Color(0.55, 0.32, 0.12), blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
      pool.position.set(lx, 0.035, lz); add(pool, 2.7); this.stairPool = pool;
      const [bx, bz] = pol(O[0] + TFH.c[0], O[2] + TFH.c[2], TFH.r + 0.35, FARM_LAD_A + 0.1);
      const halo = this.spr(P.softDotTex(), W, new THREE.Color(1.1, 0.66, 0.26), true, false); halo.position.set(bx, FARM_LAND_Y + 1.6, bz); halo.scale.setScalar(2.4);
      // fix r3 (audit A3 P3 / P1 place shot 9: the climber had nothing to read against): the caged lamp throws a warm amber
      // POOL on the wet wall round the landing (~1.2 m round the climber's head and shoulders), a cone of light whose rain
      // streaks glint as they fall through it, water sheeting off the landing's edge, splashes on the treads
      const A0 = FARM_LAD_A, cx0 = O[0] + TFH.c[0], cz0 = O[2] + TFH.c[2];
      { const g = new THREE.CylinderGeometry(TFH.r + 0.06, TFH.r + 0.06, 4.2, 24, 1, true, A0 + 0.1 - 0.24, 0.48).translate(0, FARM_LAND_Y + 1.15, 0);
        this.wallPool = new THREE.Mesh(g, basic({ map: P.softDotTex(), color: new THREE.Color(0.95, 0.52, 0.16), blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
        this.wallPool.position.set(cx0, 0, cz0); add(this.wallPool, 1.3); }
      { const t = P.rainSheetTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
        this.lampCone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.9, 24, 1, true).translate(0, -0.95, 0), basic({ map: t, color: new THREE.Color(0.9, 0.55, 0.2), blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
        this.lampCone.position.set(bx + 0.35 * Math.sin(A0), FARM_LAND_Y + 1.62, bz + 0.35 * Math.cos(A0)); add(this.lampCone, 4); }
      { const [px, pz] = pol(cx0, cz0, TFH.r + 0.95, A0 - 0.3 / 7.5);
        for (let k = 0; k < 3; k++) { const t = P.rainSheetTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.2, 3);
          const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, FARM_LAND_Y - 0.05).translate(0, -(FARM_LAND_Y - 0.05) / 2, 0), basic({ map: t, color: new THREE.Color(0.7, 0.8, 1.0), blending: THREE.AdditiveBlending }));
          const dx = (k - 1) * 0.55; m.position.set(px + Math.cos(A0) * dx, FARM_LAND_Y - 0.05, pz - Math.sin(A0) * dx); add(m, 7); this.streamLand.push(m); } }
      for (let k = 0; k < 8; k++) this.treadSplash.push(this.spr(P.crownThinTex(), W, "#e8f2ff", false, true)); }
    // rain drips off the swung left gate leaf's top wire (shot 9)
    for (let k = 0; k < 7; k++) this.wireDrips.push(this.spr(P.softDotTex(), W, "#e8f0fa"));
    // the gate lamps' warm light on the wet apron (long streaks toward the lens) and the hut window's pool
    { const c9 = camAt(9, SHOTS[8].a + 12).pos;
      // a wet-ground light reflection lies on the ground line from the light's foot toward the lens (vertical on screen)
      const warm = (x: number, z: number, w: number, d: number, k: number, aim = false, streak = false) => { const tx = streak ? P.wetStreakTex().clone() : P.softDotTex(); if (streak) { tx.needsUpdate = true; tx.wrapT = THREE.RepeatWrapping; this.streaks.push(tx); }
        const s2 = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), basic({ map: tx, color: new THREE.Color(1.0, 0.56, 0.2).multiplyScalar(k), blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
        s2.position.set(O[0] + x, 0.03, O[2] + z); if (aim) s2.rotation.y = Math.atan2(c9[0] - s2.position.x, c9[2] - s2.position.z); add(s2, 2.6); };
      // fix r2 (audit A2 P3: wide soft orange columns): narrow broken streaks (<= ~60 px), shimmering down the ripples
      for (const x of [-1.15, 1.15]) { const L = 5.5, ux = c9[0] - (O[0] + x), uz = c9[2] - (O[2] + gz + 0.4), n = Math.hypot(ux, uz);
        warm(x + (ux / n) * (0.4 + L / 2), gz + 0.4 + (uz / n) * (0.4 + L / 2), 0.11, L, 0.55, true, true); warm(x, gz + 0.9, 1.0, 0.9, 0.16); }
      warm(HUT[0], HUT[2] + 2.6, 1.1, 3.4, 0.55); warm(HUT[0] + 1.9, HUT[2], 2.0, 1.6, 0.45); }
    // the puddles
    for (const [x, z, w, d, sd] of STORM_PUDDLES) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), basic({ map: P.stormPuddleTex(sd), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      m.position.set(O[0] + x, 0.03, O[2] + z); add(m, 2); }
    // rain (hair-thin streaks in depth; additive, per-instance brightness), splash crowns, puddle ripple rings
    this.rain = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), basic({ map: P.rainTex(), color: "#c8d6f0", blending: THREE.AdditiveBlending }), 1500);
    this.rain.frustumCulled = false; add(this.rain, 8);
    for (let i = 0; i < 1500; i++) this.rain.setColorAt(i, new THREE.Color(0, 0, 0));
    // fix r3 (audit A3 P2 shot 9: the splashes read as cotton / popcorn puffs): thin crown splashes (3-5 spikes + a flat
    // ring, alpha ~0.55), sized per distance to 16-28 px at 1080, living 4-6 f
    this.crowns = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.375, 0), basic({ map: P.crownThinTex(), color: "#e6eefa", opacity: 0.6 }), 240);
    this.crowns.frustumCulled = false; add(this.crowns, 7);
    this.ripples = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ map: P.rippleThinTex(), color: "#ffffff", blending: THREE.AdditiveBlending }), 72);
    this.ripples.frustumCulled = false; add(this.ripples, 3);
    for (let i = 0; i < 72; i++) this.ripples.setColorAt(i, new THREE.Color(0, 0, 0));
    // far rain curtains (scrolling streak sheets at 14 / 28 / 46 m), posed facing the lens
    for (const k of [0, 1, 2]) { const t = P.rainSheetTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set([4, 6, 8][k], [2, 3, 4][k]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ map: t, color: new THREE.Color(0.2, 0.22, 0.27).multiplyScalar([0.55, 0.8, 0.9][k]), blending: THREE.AdditiveBlending, fog: false }));
      add(m, 6); this.curtains.push(m); }
    // the scudding storm deck (a far cylinder band behind the tank tops) + the bolt
    { const t = P.stormCloudTex(1).clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
      this.cloudBand = new THREE.Mesh(new THREE.CylinderGeometry(260, 260, 150, 72, 1, true, Math.PI - 1.4, 2.8), basic({ map: t, side: THREE.BackSide, fog: false }));
      this.cloudBand.position.set(O[0], 120, O[2]); add(this.cloudBand, -0.45); }
    this.bolt = this.spr(P.boltTex(), W, new THREE.Color(1.5, 1.6, 2.0), true, false); this.bolt.renderOrder = -0.44;
    // the lamps' warm spill down the face of the sign (storm only)
    { const sp = new THREE.Mesh(new THREE.PlaneGeometry(sg.w + 0.3, sg.h + 0.2), basic({ map: P.ptex("sxSignSpill", 256, 128, (g) => { g.clearRect(0, 0, 256, 128);
        for (const x of [70, 186]) { const gr = g.createRadialGradient(x, 0, 0, x, 0, 120); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } }),
        color: new THREE.Color(0.55, 0.32, 0.1), blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(O[0], sg.cy + 0.05, O[2] + gz + 0.02); add(sp, 3); }
    // the blue rain haze between the gate and No. 7 (tints the tank / stair / far lenders: depth + a saturated storm)
    // fix r2 (audit A2 P3: no sky at all): the haze stops at the tank's rim, so the bruised storm deck reads above it
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(70, 12.3), basic({ color: "#3a5aa0", opacity: 0.24, fog: false }));
    this.haze.position.set(O[0], 6.15, O[2] + 5.6); add(this.haze, 1);
    // lightning: a full-frame cool flash card in front of the lens (posed per frame)
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic({ color: "#dde6ff", blending: THREE.AdditiveBlending, depthTest: false, fog: false }));
    add(this.flash, 999);
    // wet rivulets running down the camera side of No. 7
    { const t = P.rivuletTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 2.5);
      this.rivulets = new THREE.Mesh(new THREE.CylinderGeometry(TFH.r + 0.035, TFH.r + 0.035, TFH.h - 0.3, 96, 1, true, -1.35, 2.7).translate(0, (TFH.h - 0.3) / 2 + 0.15, 0),
        basic({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      this.rivulets.position.set(O[0] + TFH.c[0], 0, O[2] + TFH.c[2]); add(this.rivulets, 1.2); }
    // water pouring off the right end of the gate beam (posed facing the lens) + drips along the sign's bottom edge
    { const t = P.rainSheetTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 5);
      // fix r3 (audit A3 ADD shot 9: the pour off the beam's end was off-frame): the water pours off the SIGN's right end into
      // a splashing puddle at the post foot (AUDIO's gutter cue)
      const top = sg.cy - sg.h / 2 - 0.04;
      this.gutter = new THREE.Mesh(new THREE.PlaneGeometry(0.075, top).translate(0, -top / 2, 0), basic({ map: t, color: new THREE.Color(0.8, 0.9, 1.05), blending: THREE.AdditiveBlending }));
      this.gutter.position.set(O[0] + POUR9[0], top, O[2] + POUR9[1]); add(this.gutter, 7);
      for (let k = 0; k < 3; k++) this.signPourSplash.push(this.spr(P.crownThinTex(), W, "#eef4ff", false, true)); }
    for (const [y, w] of [[sg.cy - sg.h / 2 - 0.075, sg.w + 0.14], [sg.cy + sg.h / 2 + 0.275, gh * 2]] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.028), basic({ color: new THREE.Color(0.86, 0.92, 1.05), opacity: 0.75 })); m.position.set(O[0], y, O[2] + gz + 0.1); add(m, 6); }
    for (let k = 0; k < 10; k++) this.signDrips.push(this.spr(P.softDotTex(), W, "#e8f0fa"));
    // BANKRUPT's slap: a burst of spray + a ring
    for (let k = 0; k < 14; k++) this.spray.push(this.spr(P.softDotTex(), W, "#eef4ff"));
    this.sprayRing = this.spr(P.rippleTex(), W, "#eef4ff");
    // a newspaper sheet tumbling across the yard in a gust
    this.farmSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), lam("sx_wetPaper", () => ({ map: P.wetPaperTex(), side: THREE.DoubleSide })));
    this.farmSheet.castShadow = false; W.add(this.farmSheet);
    // ---- fix r3 (audit A3 P1 / P3 / ADD shot 9) ----
    // the hero's 'No. 7' stencilled low on the wall left of the stair, whole between the sign and the umbrellas (the high
    // stencil hides behind the sign from this camera), so the storm tank is the same No. 7 as the sunny gate shot
    { const a0 = -18 * D2R, a1 = 4 * D2R, g = new THREE.CylinderGeometry(TFH.r + 0.03, TFH.r + 0.03, 0.92, 24, 1, true, a0, a1 - a0).translate(0, 3.9, 0);
      this.stencil9 = new THREE.Mesh(g, lam("sx_stencil9", () => ({ map: P.stencilTex("No. 7"), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
      this.stencil9.position.set(O[0] + TFH.c[0], 0, O[2] + TFH.c[2]); this.stencil9.receiveShadow = true; this.stencil9.userData.ink = 0; W.add(this.stencil9); }
    // three gulls huddled on the gate's crossbar, hunched against the rain
    for (let k = 0; k < 3; k++) this.huddle.push(this.spr(P.gullHuddleTex(), W, "#c9d2e2", false, true));
    // a slowly blinking amber beacon on the parked tanker's tank top
    { const bx = O[0] + 5.6, bz = O[2] + 4.3; this.beacon = new THREE.MeshBasicMaterial({ color: "#ffb040" });
      const bm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, TAU, 0, Math.PI / 2), this.beacon); bm.position.set(bx, 3.05, bz); bm.layers.set(NOINK); W.add(bm);
      const base = new THREE.Mesh(cyl(0.12, 0.06, 12), new THREE.MeshLambertMaterial({ color: "#2a2a30" })); base.position.set(bx, 2.99, bz); W.add(base);
      this.beaconHalo = this.spr(P.softDotTex(), W, new THREE.Color(1.4, 0.75, 0.2), true, false); this.beaconHalo.position.set(bx, 3.12, bz); }
    // a soggy newspaper page plastered flat on the swung left leaf's chain-link
    { const g = new THREE.PlaneGeometry(0.46, 0.34, 6, 4); const pa = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, 0.012 * Math.sin(pa.getX(i) * 14 + pa.getY(i) * 9));
      this.soggy = new THREE.Mesh(g, lam("sx_soggy", () => ({ map: P.wetPaperTex(), side: THREE.DoubleSide, color: "#9aa2b4" })));
      this.soggy.position.set(1.45, 1.05, 0.03); this.soggy.rotation.z = 0.18; this.leaves[0].add(this.soggy); this.soggy.visible = false; }
    // text-free road marks on the apron in place of SLOW: a worn dashed centre line toward the gate, glossy tyre-track sheen,
    // a kerb drain swallowing a swirl of water
    { const dm = basic({ map: P.dashWornTex(), color: "#c9d0dc", opacity: 0.42, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
      for (let z = 16.9; z < 24; z += 1.8) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.95).rotateX(-Math.PI / 2), dm); m.position.set(O[0] + 0.05, 0.034, O[2] + z); add(m, 2.1); }
      for (const x of [-0.75, 0.8]) { const t = P.wetStreakTex().clone(); t.needsUpdate = true; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); this.streaks.push(t);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 7.5).rotateX(-Math.PI / 2), basic({ map: t, color: new THREE.Color(0.32, 0.4, 0.55), blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
        m.position.set(O[0] + x, 0.035, O[2] + 20.0); add(m, 2.4); }
      const dr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: P.drainTex(), polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
      dr.position.set(O[0] + 2.15, 0.036, O[2] + 19.2); dr.receiveShadow = true; W.add(dr);
      this.drainSwirl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), basic({ map: P.swirlTex(), color: new THREE.Color(0.55, 0.65, 0.85), blending: THREE.AdditiveBlending }));
      this.drainSwirl.position.set(O[0] + 2.15, 0.04, O[2] + 19.2); add(this.drainSwirl, 2.5); }
    // the near puddle mirroring the lit sign and the red notice, upside down and broken by rain rings
    { this.reflTex = P.signReflTex().clone(); this.reflTex.needsUpdate = true; this.reflTex.wrapS = THREE.ClampToEdgeWrapping;
      this.reflPuddle = new THREE.Mesh(new THREE.PlaneGeometry(REFL9[2], REFL9[3]).rotateX(-Math.PI / 2), basic({ map: this.reflTex, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
      this.reflPuddle.position.set(O[0] + REFL9[0], 0.037, O[2] + REFL9[1]); add(this.reflPuddle, 2.2); }
  }

  // ============================================ STREET ============================================
  private buildStreet() {
    const S = this.street, O = ST.base, b = new Batch(), bd = new Batch();
    b.add(new THREE.PlaneGeometry(400, 40).rotateX(-Math.PI / 2), texM("street", () => P.rep(P.roadTex("sxRoadSt", "#56565c"), 66, 6.7)), M(O[0], 0, O[2] + 20.5));
    for (let x = -60; x < 60; x += 6) box(b, col("laneLine", "#e6e2d6"), O[0] + x, 0.003, O[2] + 6.4, O[0] + x + 3, 0.006, O[2] + 6.55);
    // fix r2 (audit A2 P2 shot 14: a blank pale sidewalk, L* 55-62): a warmer mid-grey slab albedo (~L* 50)
    box(b, texM("sidewalk2", () => P.rep(P.sidewalkTex(), 133, 2.2), { color: "#c7bcad" }), O[0] - 200, 0, O[2] - 6.05, O[0] + 200, 0.15, O[2] + 0.4);
    box(b, col("kerb", "#9a978f"), O[0] - 200, 0, O[2] + 0.4, O[0] + 200, 0.16, O[2] + 0.6);
    // facades: the firm's building (centre) + neighbours, each a box with a 1960s facade texture; cornices
    const builds: [number, number, number, number][] = [[-3.6, 3.6, 16, 0], [3.6, 10.4, 20, 1], [-10.6, -3.6, 14, 2], [10.4, 18, 13, 3], [-18, -10.6, 18, 1], [18, 26, 15, 2], [-26, -18, 13, 3]];
    for (const [x0, x1, h, st] of builds) { const w = x1 - x0;
      b.add(boxGeo(V(x0, 0, -14), V(x1, h, -6.05), 0, true), lam(`sx_fac${st}_${w}_${h}`, () => ({ map: P.rep(P.facade60Tex(st), w / 7, h / 14) })), M(O[0], 0.15, O[2]));
      box(b, col("cornice" + st, ["#cfc6b4", "#d8d2c4", "#bfb4a0", "#c9bfae"][st]), O[0] + x0 - 0.1, h - 0.1, O[2] - 6.4, O[0] + x1 + 0.1, h + 0.35, O[2] - 6.0);
      box(b, col("beltCourse", "#d9d2c2"), O[0] + x0, 4.75, O[2] - 6.18, O[0] + x1, 5.0, O[2] - 6.0); }
    // the firm's storefront (x -3.6..3.6): a stone surround, a big display window left, the recessed door at ST.door
    {
      const stone = col("storeStone", "#8c8478"), dark = col("storeDark", "#2a2c34"), brass = col("brass", "#c9a24a"), dr = ST.door;
      box(b, stone, O[0] - 3.6, 0.15, O[2] - 6.1, O[0] + 3.6, 0.6, O[2] - 5.95);
      box(b, stone, O[0] - 3.6, 2.95, O[2] - 6.12, O[0] + 3.6, 3.05, O[2] - 5.92);
      box(b, texM("slateFrieze", () => P.rep(P.slateStoneTex(), 3.6, 0.85)), O[0] - 3.6, 3.05, O[2] - 6.1, O[0] + 3.6, 4.75, O[2] - 6.02);  // fix r1: slate stone courses (was a flat pale band)
      box(b, col("friezeGilt", "#c9a24a"), O[0] - 3.6, 4.55, O[2] - 6.0, O[0] + 3.6, 4.6, O[2] - 5.99);
      for (let k = 0; k < 8; k++) { const x0 = -3.55 + k * 0.5; cbox(b, col(k % 2 ? "awnCream" : "awnRed", k % 2 ? "#efe6d2" : "#b8382a"), O[0] + x0 + 0.25, 2.78, O[2] - 5.55, 0.5, 0.025, 0.95, 0, 0.42); }
      for (let k = 0; k < 8; k++) { const x0 = -3.55 + k * 0.5; cbox(b, col(k % 2 ? "awnCream" : "awnRed", k % 2 ? "#efe6d2" : "#b8382a"), O[0] + x0 + 0.25, 2.5, O[2] - 5.11, 0.5, 0.16, 0.02); }
      // display window (dark glass with painted reflections) + brass frame, a sill
      // fix r1 (audit A1 P2: flat, milky): the display window is a warm-lit shop interior; a passing car's reflection slides
      // across the glass with the car horn (BEAT.amex2 - 4)
      const gl = this.board(faceMesh(P.shopWindowTex(), 4.0, 2.3), "street", 1.12);
      gl.position.set(O[0] - 1.5, 1.75, O[2] - 5.93); S.add(gl);
      { this.carRefl = P.carSilTex().clone(); this.carRefl.needsUpdate = true; this.carRefl.wrapS = this.carRefl.wrapT = THREE.ClampToEdgeWrapping; this.carRefl.repeat.set(4.0 / 2.6, 2.3 / 0.98);
        const cr = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.3), new THREE.MeshBasicMaterial({ map: this.carRefl, transparent: true, opacity: 0.38, depthWrite: false }));
        cr.position.set(O[0] - 1.5, 1.75, O[2] - 5.925); cr.layers.set(NOINK); cr.renderOrder = 2; S.add(cr); }
      for (const [x0, x1, y0, y1] of [[-3.55, 0.55, 0.6, 0.66], [-3.55, 0.55, 2.86, 2.92], [-3.55, -3.49, 0.6, 2.92], [0.49, 0.55, 0.6, 2.92], [-1.53, -1.47, 0.6, 2.92]] as const) box(b, brass, O[0] + x0, y0, O[2] - 5.94, O[0] + x1, y1, O[2] - 5.9);
      // the door: a stone surround, the dark wood door with a glass upper panel, brass knob + kick plate, a step
      box(b, stone, O[0] + dr.c[0] - dr.w / 2 - 0.18, 0.15, O[2] + dr.c[2] - 0.02, O[0] + dr.c[0] - dr.w / 2, dr.h + 0.35, O[2] + dr.c[2] + 0.1);
      box(b, stone, O[0] + dr.c[0] + dr.w / 2, 0.15, O[2] + dr.c[2] - 0.02, O[0] + dr.c[0] + dr.w / 2 + 0.18, dr.h + 0.35, O[2] + dr.c[2] + 0.1);
      box(b, stone, O[0] + dr.c[0] - dr.w / 2 - 0.18, dr.h + 0.15, O[2] + dr.c[2] - 0.02, O[0] + dr.c[0] + dr.w / 2 + 0.18, dr.h + 0.35, O[2] + dr.c[2] + 0.12);
      box(b, texM("doorWood", () => P.boardsTex("#4a2e1e")), O[0] + dr.c[0] - dr.w / 2, 0.15, O[2] + dr.c[2] - 0.1, O[0] + dr.c[0] + dr.w / 2, dr.h + 0.15, O[2] + dr.c[2] - 0.04);
      box(b, dark, O[0] + dr.c[0] - dr.w / 2 + 0.14, 1.25, O[2] + dr.c[2] - 0.04, O[0] + dr.c[0] + dr.w / 2 - 0.14, dr.h - 0.05, O[2] + dr.c[2] - 0.035);
      box(b, brass, O[0] + dr.c[0] - dr.w / 2 + 0.06, 0.2, O[2] + dr.c[2] - 0.04, O[0] + dr.c[0] + dr.w / 2 - 0.06, 0.42, O[2] + dr.c[2] - 0.032);
      b.add(new THREE.SphereGeometry(0.045, 10, 8), brass, M(O[0] + dr.c[0] + dr.w / 2 - 0.13, 1.08, O[2] + dr.c[2] - 0.0));
      box(b, stone, O[0] + dr.c[0] - dr.w / 2 - 0.2, 0.15, O[2] + dr.c[2], O[0] + dr.c[0] + dr.w / 2 + 0.2, 0.3, O[2] + dr.c[2] + 0.38);
      box(b, texM("slatePier", () => P.rep(P.slateStoneTex(), 0.8, 1.2)), O[0] + 1.95, 0.6, O[2] - 6.05, O[0] + 3.6, 2.95, O[2] - 5.98);
      // the SHARES board on the frieze (brass-framed slate) with its three arrow windows
      const bc = ST.board;
      box(b, col("boardBack", "#3a3226"), O[0] + bc.c[0] - bc.w / 2 - 0.05, bc.c[1] - bc.h / 2 - 0.05, O[2] + bc.c[2] - 0.01, O[0] + bc.c[0] + bc.w / 2 + 0.05, bc.c[1] + bc.h / 2 + 0.05, O[2] + bc.c[2] + 0.03);
      const bf = this.board(faceMesh(P.sharesBoardTex(), bc.w, bc.h), "street"); bf.position.set(O[0] + bc.c[0], bc.c[1], O[2] + bc.c[2] + 0.035); S.add(bf);
      for (let k = 0; k < 3; k++) { const x = O[0] + bc.c[0] + ((k - 1) * 420 / 1500) * bc.w, y = bc.c[1] + (0.5 - 495 / 700) * bc.h, w = (340 / 1500) * bc.w, h = (300 / 700) * bc.h;
        const n = this.board(faceMesh(P.arrowPlateTex(false), w, h), "street"); n.position.set(x, y, O[2] + bc.c[2] + 0.04); S.add(n); this.arrowsN.push(n);
        const d = this.board(faceMesh(P.arrowPlateTex(true), w, h), "street"); d.position.set(x, y, O[2] + bc.c[2] + 0.045); d.visible = false; S.add(d); this.arrowsD.push(d); }
      // the CLOSED card (pivot at its hook, top centre)
      // fix r1 (audit A1 P2: letters ~35 px, whose door?): the card 1.2x with condensed letters (~50+ px), hung lower;
      // generic gold-leaf OFFICES on the door glass above it and a brass plate beside the door (no name, no mark)
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.72).translate(0, -0.324, 0), new THREE.MeshBasicMaterial({ map: P.closedTex(), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
      this.closed = this.board(cl, "street"); this.closed.position.set(O[0] + dr.sign[0], dr.sign[1] + 0.2, O[2] + dr.sign[2] + 0.12); S.add(this.closed);
      const of2 = this.board(faceMesh(P.officesTex(), 0.66, 0.138, true), "street", 1.05); of2.position.set(O[0] + dr.c[0], 2.04, O[2] + dr.c[2] - 0.03); S.add(of2);
      // fix r2 (audit A2 P3: whose door is CLOSED?): a dark glass transom over the door with "ALLIED" in gold leaf (the name
      // on the shot-2 gate; plain letters, no mark), ~47 px tall at 1080, clear of the CLOSED card
      // fix r3 (audit A3 P2 shot 14: its 'A' was hidden by the kiosk roof, it read 'LLIED'): the fascia panel runs 0.3 m
      // further right over the pier, so the whole ALLIED clears the (trimmed) kiosk roof
      { box(b, stone, O[0] + 0.83, dr.h + 0.35, O[2] + dr.c[2] - 0.02, O[0] + 2.33, 2.95, O[2] + dr.c[2] + 0.06);
        box(b, col("transomGlass", "#1e2430"), O[0] + 0.88, dr.h + 0.38, O[2] + dr.c[2] + 0.06, O[0] + 2.28, 2.92, O[2] + dr.c[2] + 0.07);
        const al = this.board(faceMesh(P.alliedTransomTex(), 1.32, 0.45, true), "street", 1.08); al.position.set(O[0] + 1.58, (dr.h + 0.38 + 2.92) / 2, O[2] + dr.c[2] + 0.075); S.add(al); }
      box(b, brass, O[0] + dr.c[0] + dr.w / 2 + 0.03, 1.32, O[2] + dr.c[2] + 0.1, O[0] + dr.c[0] + dr.w / 2 + 0.16, 1.58, O[2] + dr.c[2] + 0.115);
      // a striped awning over the neighbour's shop + a brass plate
      for (let k = 0; k < 7; k++) box(b, col(k % 2 ? "awnW" : "awnG", k % 2 ? "#ece6d6" : "#2f6a4a"), O[0] + 4.0 + k * 0.9, 2.9, O[2] - 7.1 + 1.1, O[0] + 4.9 + k * 0.9, 3.0, O[2] - 6.0 + 1.1, M(0, 0, 0));
    }
    // the newsstand: green plank body, a counter, the racks, a roof with a striped valance, stacks of papers, the bill board
    {
      const sd = ST.stand, x = O[0] + sd[0], z = O[2] + sd[2], green = texM("kiosk", () => P.boardsTex("#3f6a4a")), dk = col("kioskDark", "#24402e");
      box(b, green, x - 0.85, 0.15, z - 0.5, x + 0.85, 1.25, z + 0.4);
      box(b, dk, x - 0.92, 1.25, z - 0.55, x + 0.92, 1.32, z + 0.5);
      for (const s of [-0.84, 0.84]) box(b, dk, x + s - 0.04, 1.32, z + 0.36, x + s + 0.04, 2.62, z + 0.44);
      box(b, dk, x - 0.84, 1.32, z - 0.5, x + 0.84, 2.62, z - 0.42);
      // fix r3 (audit A3 P2 shot 14: the kiosk roof's right overhang hid the 'A' of the ALLIED fascia): the roof stops 3 cm past
      // the right post; its striped valance is one cloth that ripples in the wind (+-2 cm, ~0.4 Hz)
      box(b, col("kioskRoof", "#2c4a34"), x - 1.05, 2.62, z - 0.7, x + 0.87, 2.74, z + 0.66);
      { const vg = new THREE.PlaneGeometry(1.92, 0.16, 24, 1).translate(0.96, -0.08, 0);
        const vt = P.ptex("sxKioskVal", 512, 64, (g) => { for (let k = 0; k < 11; k++) { g.fillStyle = k % 2 ? "#ece6d6" : "#2f6a4a"; g.fillRect((k * 512) / 11, 0, 512 / 11 + 1, 64); } g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, 56, 512, 8); });
        this.kioskVal = new THREE.Mesh(vg, new THREE.MeshLambertMaterial({ map: vt, side: THREE.DoubleSide })); this.kioskVal.position.set(x - 1.05, 2.62, z + 0.675); this.kioskVal.castShadow = true; S.add(this.kioskVal);
        this.kioskValBase = Float32Array.from(vg.attributes.position.array as ArrayLike<number>); }
      // fix r3 (audit A3 ADD shot 14): newspapers clipped with pegs on a line beside the bill (they sway), a coin cup on the
      // counter
      { const line = col("twine", "#8a6a3a"); rod(b, line, V(x + 0.47, 2.44, z + 0.43), V(x + 0.82, 2.44, z + 0.43), 0.006); rod(b, line, V(x - 0.83, 2.44, z + 0.43), V(x - 0.47, 2.44, z + 0.43), 0.006);
        for (const [px, k] of [[x + 0.56, 0], [x + 0.74, 1], [x - 0.66, 2]] as const) {
          const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.3).translate(0, -0.16, 0), lam("sx_hangPaper", () => ({ map: P.foldedPaperTex(), side: THREE.DoubleSide })));
          pm.position.set(px, 2.44, z + 0.44 + 0.004 * k); pm.castShadow = true; S.add(pm); this.hangPapers.push(pm);
          b.add(new THREE.BoxGeometry(0.018, 0.05, 0.02), col("peg", "#c9a87a"), M(px, 2.43, z + 0.45)); }
        b.add(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 14, 1, true).translate(0, 0.05, 0), lam("sx_coinCup", () => ({ color: "#8a8f98", side: THREE.DoubleSide })), M(x + 0.6, 1.32, z + 0.22));
        for (let k = 0; k < 3; k++) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 10), col("coin", "#d8c06a"), M(x + 0.53 + k * 0.03, 1.322, z + 0.32 - k * 0.01)); }
      const rack = this.board(faceMesh(P.newsRackTex(), 1.6, 0.78), "street", 0.9); rack.position.set(x, 0.75, z + 0.41); S.add(rack);
      const side = this.board(faceMesh(P.newsRackTex(), 0.9, 0.9), "street", 0.85); side.position.set(x - 0.86, 1.7, z - 0.0); side.rotation.y = -Math.PI / 2; S.add(side);
      for (let k = 0; k < 4; k++) { const sx = x - 0.7 + k * 0.38, h0 = 1.32, hh = 0.06 + 0.05 * hash(k, 61); box(b, col("paperStack", "#e8e2d0"), sx - 0.15, h0, z + 0.05, sx + 0.15, h0 + hh, z + 0.38); box(b, col("paperBand", "#1a1a1a"), sx - 0.151, h0 + hh * 0.4, z + 0.05, sx + 0.151, h0 + hh * 0.55, z + 0.381); }
      // the headline bill board on the kiosk front (a wood frame with clips; the bill lands here)
      const pc = ST.poster;
      box(b, col("billFrame", "#5a3a22"), O[0] + pc.c[0] - pc.w / 2 - 0.05, pc.c[1] - pc.h / 2 - 0.05, O[2] + pc.c[2] - 0.05, O[0] + pc.c[0] + pc.w / 2 + 0.05, pc.c[1] + pc.h / 2 + 0.05, O[2] + pc.c[2] - 0.01);
      for (const s of [-0.28, 0.28]) box(b, col("clip", "#b8b8bc"), O[0] + pc.c[0] + s - 0.04, pc.c[1] + pc.h / 2 - 0.04, O[2] + pc.c[2] - 0.01, O[0] + pc.c[0] + s + 0.04, pc.c[1] + pc.h / 2 + 0.06, O[2] + pc.c[2] + 0.025);
      this.poster = this.board(faceMesh(P.headlineTex(), pc.w, pc.h), "street"); S.add(this.poster);
    }
    // street furniture: hydrant, mailbox, a wire bin, a lamp post, a parked 1960s car at the kerb, litter
    {
      const hx = O[0] - 0.55, hz = O[2] - 0.65, red = col("hydrant", "#c4321f");  // fix r3: 0.3 m right, clear of the lamp post
      b.add(cyl(0.12, 0.55, 14), red, M(hx, 0.15, hz)); b.add(new THREE.SphereGeometry(0.13, 14, 8, 0, TAU, 0, Math.PI / 2), red, M(hx, 0.7, hz));
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 10).rotateZ(Math.PI / 2), red, M(hx, 0.5, hz)); b.add(cyl(0.16, 0.06, 14), red, M(hx, 0.15, hz));
      const mb = col("mailbox", "#2f4a8a"); box(b, mb, O[0] + 2.1, 0.55, O[2] - 5.6, O[0] + 2.6, 1.3, O[2] - 5.15); b.add(new THREE.CylinderGeometry(0.25, 0.25, 0.45, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), mb, M(O[0] + 2.35, 1.3, O[2] - 5.375));
      for (const s of [-1, 1]) for (const t of [-1, 1]) box(b, col("mailLeg", "#22344e"), O[0] + 2.35 + s * 0.2 - 0.02, 0.15, O[2] - 5.375 + t * 0.18 - 0.02, O[0] + 2.35 + s * 0.2 + 0.02, 0.55, O[2] - 5.375 + t * 0.18 + 0.02);
      const bin = col("wireBin", "#4a4e54"); b.add(new THREE.CylinderGeometry(0.26, 0.22, 0.8, 14, 1, true).translate(0, 0.55, 0), lam("sx_wireBinC", () => ({ color: "#4a4e54", side: THREE.DoubleSide })), M(O[0] - 1.25, 0, O[2] - 3.3));
      b.add(new THREE.TorusGeometry(0.26, 0.02, 5, 16).rotateX(Math.PI / 2), bin, M(O[0] - 1.25, 0.95, O[2] - 3.3)); b.add(new THREE.SphereGeometry(0.2, 10, 6), col("binTrash", "#ddd6c4"), M(O[0] - 1.25, 0.86, O[2] - 3.3));
      const lp = col("lampPost", "#3a4048"); b.add(cyl(0.08, 6.2, 12), lp, M(O[0] + 3.3, 0.15, O[2] - 0.1)); rod(b, lp, V(O[0] + 3.3, 6.2, O[2] - 0.1), V(O[0] + 3.3, 6.5, O[2] + 1.6), 0.05);
      b.add(new THREE.SphereGeometry(0.3, 12, 8).scale(1, 0.4, 1.6), col("lampHead", "#9aa0a8"), M(O[0] + 3.3, 6.45, O[2] + 1.9));
      // fix r2 (audit A2 P2 shot 14: the bottom 30 % was blank slabs): a parked teal / cream 1960s sedan at the kerb in the
      // lower RIGHT (tail fins toward us, roof + glass + chrome soft in the DOF), a lamp post at the kerb lower LEFT (a tall
      // framer), gutter litter (leaves, butts, grit) both sides of the kerb, a puddle with a grey-sky sheen, a round iron
      // coal-hole cover in the slabs, a road manhole off the bottom edge breathing steam, an AO band at the wall foot
      // fix r3 (audit A3 P2 + carry-over CAM numbers: the cropped teal tail fins read as an unreadable slab): the parked
      // teal / cream sedan now noses in from the LOWER LEFT, its rounded chrome front (bonnet, grille, headlight, bumper)
      // ending at x ~ -0.1, in front of the hydrant and below the caption band; the lamp post stands at the kerb at the left
      // edge (base x -0.78, z -0.45), a tall dark framer
      sedan(b, M(O[0] - 2.36, 0, O[2] + 1.6, 0), "Park", "#4f8a9a", "#eeeae0");
      flat(bd, decalM("aoCar", () => P.aoTex(), { color: "#22202e", opacity: 0.6 }), O[0] - 2.36, O[2] + 1.6, 5.8, 2.5, 0, 0.012);
      { const lpx = O[0] - 0.78, lpz = O[2] - 0.45, lp2 = col("lampPost2", "#4a5260");
        b.add(cyl(0.16, 0.5, 14), lp2, M(lpx, 0.15, lpz)); b.add(cyl(0.058, 7.0, 12), lp2, M(lpx, 0.6, lpz)); b.add(cyl(0.1, 0.2, 12), col("lampCollar", "#4a525c"), M(lpx, 1.1, lpz));
        rod(b, lp2, V(lpx, 7.4, lpz), V(lpx, 7.7, lpz + 1.6), 0.05); b.add(new THREE.SphereGeometry(0.3, 12, 8).scale(1, 0.4, 1.6), col("lampHead", "#9aa0a8"), M(lpx, 7.65, lpz + 1.9));
        for (let y = 1.6; y < 6.5; y += 0.9) b.add(new THREE.TorusGeometry(0.062, 0.01, 4, 14).rotateX(Math.PI / 2), col("lampCollar", "#4a525c"), M(lpx, y, lpz));
        b.add(cyl(0.08, 0.08, 12), col("lampCollar", "#4a525c"), M(lpx, 3.2, lpz)); cbox(b, col("lampCollar", "#4a525c"), lpx, 3.1, lpz, 0.4, 0.035, 0.035);
        flat(bd, decalM("aoLamp", () => P.aoTex(), { color: "#22202e", opacity: 0.55 }), lpx, lpz, 0.7, 0.5, 0, 0.156); }
      flat(bd, decalM("gutterLitter", () => P.gutterLitterTex()), O[0] - 0.4, O[2] + 0.22, 3.4, 0.34, 0, 0.157);
      flat(bd, decalM("gutterLitter", () => P.gutterLitterTex()), O[0] + 0.6, O[2] + 0.78, 3.6, 0.36, Math.PI, 0.008);
      flat(bd, decalM("puddleKerb", () => P.puddleTex(false, 5)), O[0] + 0.35, O[2] - 0.15, 1.2, 0.55, 0.1, 0.158);
      flat(bd, texM("coalHole", () => P.manholeTex()), O[0] - 0.05, O[2] - 0.95, 0.55, 0.55, 0.3, 0.156);
      flat(bd, texM("manholeRoad", () => P.manholeTex()), O[0] + 0.5, O[2] + 1.35, 0.75, 0.75, 0, 0.006);
      this.puffs.push(...[0, 1, 2].map((k) => ({ s: this.spr(P.puffTex(), S, "#ffffff"), src: V(O[0] + 0.5, 0.15, O[2] + 1.35), n: 43 + k * 5, ph: k / 3, rise: 2.2, drift: 0.7, size: 0.75, set: "street" as const, alpha: 0.16 })));
      // fix r3 (audit A3 ADD shot 14): a thin steam wisp breathes out of the sidewalk grate (a 60 f loop: 46 whole cycles)
      this.puffs.push(...[0, 1, 2].map((k) => ({ s: this.spr(P.puffTex(), S, "#f4f4f6"), src: V(O[0] - 0.05, 0.2, O[2] - 0.95), n: 46, ph: k / 3, rise: 1.3, drift: 0.45, size: 0.5, set: "street" as const, alpha: 0.22 })));
      { const band = P.ptex("sxWallFoot", 64, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); });
        const fm = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: band, color: "#2a2640", transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
        fm.position.set(O[0], 0.156, O[2] - 5.7); fm.layers.set(NOINK); fm.renderOrder = 1; S.add(fm); }
      // the wire bin overflows (crumpled balls, a paper sticking out); a page lies by it and skitters in a gust
      for (const [dx, dy, dz, s0] of [[0.08, 0.98, 0.05, 0.1], [-0.1, 1.0, -0.06, 0.09], [0.0, 1.06, 0.0, 0.08], [0.32, 0.2, 0.25, 0.07], [-0.3, 0.2, 0.3, 0.06]] as const)
        b.add(new THREE.IcosahedronGeometry(s0, 0), col("paperBall", "#e8e2d2"), M(O[0] - 1.25 + dx, dy, O[2] - 3.3 + dz, dx * 9));
      b.add(new THREE.PlaneGeometry(0.34, 0.26), lam("sx_sheet", () => ({ map: P.newsSheetTex(), side: THREE.DoubleSide })), M(O[0] - 1.22, 1.08, O[2] - 3.28, 0.3, [1, 1, 1], -0.25, 0.4));
      this.binPage = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), lam("sx_sheet", () => ({ map: P.newsSheetTex(), side: THREE.DoubleSide }))); this.binPage.castShadow = true; S.add(this.binPage);
      this.kerbSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), lam("sx_sheet", () => ({ map: P.newsSheetTex(), side: THREE.DoubleSide }))); this.kerbSheet.castShadow = true; S.add(this.kerbSheet);
      // fix r3 (audit A3 ADD shot 14): bread crumbs by the paper bundles where the pigeon pecks
      flat(bd, decalM("crumbs", () => P.ptex("sxCrumbs", 256, 256, (g, r) => { g.clearRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? "rgba(236,214,160,0.95)" : "rgba(200,160,100,0.9)"; g.beginPath(); g.ellipse(128 + (r() - 0.5) * 200, 128 + (r() - 0.5) * 160, 2 + 4 * r(), 2 + 3 * r(), r() * 3, 0, TAU); g.fill(); } })),
        O[0] - 0.3, O[2] - 1.42, 0.5, 0.4, 0.3, 0.158);
      for (let k = 0; k < 9; k++) flat(bd, decalM("gum", () => P.puddleTex(false, 9), { color: "#3a3a40", opacity: 0.35 }), O[0] - 3 + hash(k, 71) * 7, O[2] - 5 + hash(k, 72) * 5, 0.25, 0.18, k, 0.153);
      // fix r1 (audit A1 P2: no shadows): contact shade under the kiosk, mailbox, bin, hydrant; a blue-violet shadow band
      // under the shop awning (on the sidewalk and down the facade); wet patches with the window's warm streaks and the
      // SHARES arrows' red ones (red from "crashed"); bundled papers tied with twine at the kiosk foot
      const aoM = (k: number) => new THREE.MeshBasicMaterial({ map: P.aoTex(), color: "#2a2840", transparent: true, opacity: k, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const aoAt = (x: number, z: number, w: number, d: number, k: number, y = 0.155) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), aoM(k)); m.position.set(O[0] + x, y, O[2] + z); m.layers.set(NOINK); m.renderOrder = 1; S.add(m); };
      aoAt(ST.stand[0], ST.stand[2] - 0.05, 2.5, 1.6, 0.55); aoAt(2.35, -5.38, 0.9, 0.7, 0.45); aoAt(-1.25, -3.3, 0.8, 0.6, 0.45); aoAt(-0.55, -0.65, 0.55, 0.45, 0.45);
      { const band = P.ptex("sxAwnBand", 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
        const v = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 0.75), new THREE.MeshBasicMaterial({ map: band, color: "#3a3468", transparent: true, opacity: 0.42, depthWrite: false })); v.position.set(O[0] - 1.55, 2.08, O[2] - 5.9); v.layers.set(NOINK); v.renderOrder = 2; S.add(v);
        const h = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 1.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: band, color: "#3a3468", transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
        h.position.set(O[0] - 1.55, 0.156, O[2] - 5.5); h.layers.set(NOINK); h.renderOrder = 1; S.add(h); }
      const wet = (x: number, z: number, w: number, d: number, rgb: string, k: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: P.wetPatchTex(rgb), transparent: true, opacity: k, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
        m.position.set(O[0] + x, 0.157, O[2] + z); m.layers.set(NOINK); m.renderOrder = 2; S.add(m); return m; };
      wet(-1.6, -4.55, 1.9, 1.3, "255,196,120", 0.8);
      this.wetGrey.push(wet(1.95, -4.15, 1.2, 0.85, "150,158,162", 0.75)); this.wetRed.push(wet(1.95, -4.15, 1.2, 0.85, "232,53,42", 0.85));
      const paper = col("paperStack", "#e8e2d0"), twine = col("twine", "#8a6a3a");
      for (const [x, z, n, yaw] of [[-0.78, -1.95, 2, 0.2], [-0.42, -2.02, 1, -0.15]] as const) for (let k = 0; k < n; k++) {
        cbox(b, paper, O[0] + x, 0.15 + 0.11 + k * 0.22, O[2] + z, 0.42, 0.22, 0.3, yaw + k * 0.1); cbox(b, twine, O[0] + x, 0.15 + 0.11 + k * 0.22, O[2] + z, 0.425, 0.225, 0.02, yaw + k * 0.1);
        cbox(b, twine, O[0] + x, 0.15 + 0.11 + k * 0.22, O[2] + z, 0.02, 0.225, 0.305, yaw + k * 0.1); }
      for (const [x, z, y] of [[-0.78, -1.95, 0.6], [-0.42, -2.02, 0.38]] as const) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28).translate(0.2, 0, 0), lam("sx_sheet", () => ({ map: P.newsSheetTex(), side: THREE.DoubleSide })));
        t.position.set(O[0] + x - 0.2, y + 0.01, O[2] + z); t.castShadow = true; S.add(t); this.bundleTops.push(t); }
      aoAt(-0.6, -1.98, 0.9, 0.55, 0.5);
    }
    // fix r2 (audit A2 ADD shot 14): upper-facade life: a fire escape at the right (a landing with railings + its drop
    // ladder), red geraniums in a window box under the middle window, a lace curtain stirring in the left window
    {
      const iron = col("fireEscape", "#24262c"), yL = 5.15, z0 = O[2] - 6.05;
      b.add(boxGeo(V(1.9, yL - 0.05, z0), V(3.55, yL, z0 + 0.95), 0, true), texM("grating", () => P.rep(P.gratingTex(), 1, 6)), M(O[0], 0, 0));
      for (const x of [1.9, 2.45, 3.0, 3.55]) box(b, iron, O[0] + x - 0.018, yL, z0 + 0.93, O[0] + x + 0.018, yL + 1.0, z0 + 0.97);
      for (const y of [yL + 0.98, yL + 0.5]) box(b, iron, O[0] + 1.9, y, z0 + 0.93, O[0] + 3.55, y + 0.035, z0 + 0.97);
      for (const x of [1.9, 3.55]) { box(b, iron, O[0] + x - 0.018, yL, z0, O[0] + x + 0.018, yL + 1.0, z0 + 0.04); rod(b, iron, V(O[0] + x, yL + 0.98, z0 + 0.02), V(O[0] + x, yL + 0.98, z0 + 0.95), 0.016); }
      for (let x = 2.0; x < 3.5; x += 0.12) box(b, iron, O[0] + x - 0.008, yL, z0 + 0.94, O[0] + x + 0.008, yL + 0.5, z0 + 0.955);
      rod(b, iron, V(O[0] + 3.2, yL, z0 + 0.8), V(O[0] + 3.2, 3.25, z0 + 0.8), 0.02); rod(b, iron, V(O[0] + 3.48, yL, z0 + 0.8), V(O[0] + 3.48, 3.25, z0 + 0.8), 0.02);
      for (let y = 3.4; y < yL; y += 0.3) rod(b, iron, V(O[0] + 3.2, y, z0 + 0.8), V(O[0] + 3.48, y, z0 + 0.8), 0.012);
      for (const x of [2.0, 3.45]) rod(b, iron, V(O[0] + x, yL - 0.05, z0 + 0.9), V(O[0] + x, yL - 0.65, z0 + 0.02), 0.02);
      // fix r3 (audit A3 ADD shot 14): washing pegged on a line across the fire-escape landing, stirring in the wind
      rod(b, col("twine", "#8a6a3a"), V(O[0] + 1.95, yL + 0.95, z0 + 0.55), V(O[0] + 3.5, yL + 0.95, z0 + 0.55), 0.006);
      for (const [x, w, h, c0] of [[2.2, 0.36, 0.42, "#f2efe6"], [2.68, 0.3, 0.5, "#3e5f8a"], [3.12, 0.32, 0.3, "#c8452c"]] as const) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, -h / 2, 0), lam("sx_wash" + c0, () => ({ color: c0, side: THREE.DoubleSide })));
        m.position.set(O[0] + x, yL + 0.95, z0 + 0.55); m.castShadow = true; S.add(m); this.hangPapers.push(m); }
      cbox(b, col("windowBox", "#6a3a24"), O[0] - 0.28, 5.3, O[2] - 5.92, 1.3, 0.2, 0.26);
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.48), lam("sx_geranium", () => ({ map: P.geraniumTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })));
      gm.position.set(O[0] - 0.28, 5.56, O[2] - 5.86); gm.castShadow = true; S.add(gm);
      const cg = new THREE.PlaneGeometry(1.15, 1.1, 8, 4).translate(0, -0.55, 0);
      this.curtain = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: P.curtainTex(), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, color: "#d8d0bc" }));
      this.curtain.position.set(O[0] - 2.48, 7.05, O[2] - 6.04); this.curtain.layers.set(NOINK); S.add(this.curtain);
      this.curtainBase = Float32Array.from(cg.attributes.position.array as ArrayLike<number>);
      // the warm shop: a clerk's silhouette moves behind the display glass (left of the kiosk); the awning's scalloped
      // valance sways in the wind
      this.clerk = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.24), new THREE.MeshBasicMaterial({ map: P.clerkTex(), transparent: true, depthWrite: false, color: "#ffffff" }));
      this.clerk.layers.set(NOINK); this.clerk.renderOrder = 1.9; S.add(this.clerk);
      const vt = P.ptex("sxValance", 512, 64, (g) => { g.clearRect(0, 0, 512, 64); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#efe6d2" : "#b8382a"; g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 + 64, 0); g.lineTo(k * 64 + 64, 30); g.quadraticCurveTo(k * 64 + 32, 70, k * 64, 30); g.closePath(); g.fill(); } });
      this.valance = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.22).translate(0, -0.11, 0), new THREE.MeshLambertMaterial({ map: vt, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
      this.valance.position.set(O[0] - 1.55, 2.42, O[2] - 5.1); this.valance.castShadow = true; S.add(this.valance);
    }
    // fix r2 (audit A2 P2 shot 14): the passing car (cream over red, crosses left -> right in the lane nearer the lens)
    { const cb = new Batch(); sedan(cb, new THREE.Matrix4(), "Pass", "#b8302a", "#f2ead6"); buildInk(cb, this.car14, 1); S.add(this.car14); this.car14.visible = false;
      this.carGlint = this.spr(P.glintStarTex(), S, new THREE.Color(1.6, 1.6, 1.7), true, false); }
    buildInk(b, S, 1);
    buildInk(bd, S, 0, false);
    // life: pigeons (fix r2: 7 = two on the kiosk roof, one on the SHARES board, two on the sidewalk, two on the belt
    // course), a feather, a loose sheet of newspaper
    for (let k = 0; k < 7; k++) { const p = this.spr(P.pigeonTex(0), S, "#ffffff"); p.scale.set(0.34, 0.34, 1); this.pigeons.push(p); }
    this.feather = this.spr(P.featherTex(), S, "#ffffff");
    this.sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), lam("sx_sheet", () => ({ map: P.newsSheetTex(), side: THREE.DoubleSide })));
    this.sheet.castShadow = true; S.add(this.sheet);
  }

  // ============================================ pose ============================================
  pose(ctx: SetCtx) {
    const set = ctx.shot.set, id = ctx.id, f = ctx.f, vf = ctx.vf;
    this.top.visible = set === "tanktop"; this.farm.visible = set === "tankfarm"; this.street.visible = set === "street";
    const look = lookAt(id, f), loop = id === 1 || id === LAST, tau = id === 1 ? vf : id === LAST ? vf - (VOICE_TOTAL - 1) : vf;
    for (const bo of this.boards) if (bo.set === set) bo.m.color.copy(look.board).multiplyScalar(bo.k);
    for (const m of this.skylines) m.color.copy(look.skyline).lerp(this.c.set(ctx.light.fog), look.haze);
    if (this.top.visible) this.poseTop(id, f, tau, look, loop, ctx);
    if (this.farm.visible) this.poseFarm(id, f, vf, ctx);
    if (this.street.visible) this.poseStreet(id, f, vf, ctx);
    this.poseLife(id, set, tau, ctx);
    this.poseFlags(tau, ctx);
    this.poseClouds(id, f, ctx);
  }

  private poseTop(id: number, f: number, tau: number, look: ReturnType<typeof lookAt>, loop: boolean, ctx: SetCtx) {
    const O = TK.base;
    // ---- per-light steel tint: dawn / late light lands peach-cream on the roof and shell, the oil stays the one gold ----
    { const m = lightMixAt(id, f), A = TOP_TINT[m.a] ?? [1, 1, 1], Bt = TOP_TINT[m.b] ?? A;
      for (const mat of this.topTint) mat.color.setRGB(A[0] + (Bt[0] - A[0]) * m.k, A[1] + (Bt[1] - A[1]) * m.k, A[2] + (Bt[2] - A[2]) * m.k); }
    // ---- the LOANS counter: shot 1 only (A1 decision: never in shot 16; it casts no shadow, and at P0 it is out of the
    // frustum, so frame 0 = the last frame); it rolls from "borrowed" and lands on "$150 million" ----
    this.counter.visible = id === 1;
    // fix r3: the counter's own rail shows with it (shot 1 only: no orphan goalpost in shots 4 / 7); the rim posts cast
    // except in shot 7 (their late-sun lattice crossed the lender and the hatch)
    this.counterRail.visible = id === 1;
    { const cast = id !== 7; for (const c of this.railPosts.children) (c as THREE.Mesh).castShadow = cast; }
    if (id === 1) this.flaps.forEach((F, i) => {
      const st = flapState(i, f);
      if (st.p < 0) { setHalf(F.top.geometry.attributes.uv as THREE.BufferAttribute, st.cur, true); setHalf(F.bot.geometry.attributes.uv as THREE.BufferAttribute, st.cur, false); F.flap.visible = false; }
      else { setHalf(F.top.geometry.attributes.uv as THREE.BufferAttribute, st.to, true); setHalf(F.bot.geometry.attributes.uv as THREE.BufferAttribute, st.from, false); F.flap.visible = true;
        const th = st.p * Math.PI; F.flap.rotation.x = th; setHalf(F.flap.geometry.attributes.uv as THREE.BufferAttribute, th < Math.PI / 2 ? st.from : st.to, th < Math.PI / 2, th >= Math.PI / 2); }
    });
    // ---- the oil: palette per light, ripples round the tape, the shot-4 plunk ring, the shot-7 bloop, the shot-16 parting ----
    const U = this.oil.uniforms;
    U.uGold.value.copy(look.gold); U.uDeep.value.copy(look.deep); U.uSky.value.copy(look.sky); U.uSun.value.setRGB(...look.sun);
    // fix r2 (carry-over: shot 7's late oil sheen ~1.15): the gold and its sky window glow a little hotter as the light turns
    { const lm = lightMixAt(id, f), lk = lm.b === "late" ? lm.k : lm.a === "late" ? 1 : 0; if (lk > 0) { U.uGold.value.multiplyScalar(1 + 0.15 * lk); U.uSky.value.multiplyScalar(1 + 0.1 * lk); } }
    U.uPh.value = (TAU * 151 * tau) / VOICE_TOTAL; U.uSwell.value = 0.3;
    U.uSpark.value = loop ? 1 : id === 7 ? 0.6 : 0; U.uDrift.value = (TAU * 3 * tau) / VOICE_TOTAL; U.uT.value = f; U.uBub.value = id === LAST ? f - BEAT.fake : -1;
    // fix r2: shot 1's two 8 f glints ('1963' and the lift); the loop's drifting cloud reflections + the collar drip ring
    // (whole cycles on tau: frame 0 = the last frame); shot 7's oil-film swirls + 3 bubbles before the bloop
    { const bellF = (u: number) => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2);
      U.uFlash.value = id === 1 ? Math.max(bellF((f - (BEAT.y1963 - 4)) / 8), 0.8 * bellF((f - 46) / 8)) : 0;
      U.uCloud.value = loop ? 0.85 : 0;
      const dp = fract((30 * tau) / VOICE_TOTAL + 0.6); U.uDrip.value = loop && dp < 0.35 ? dp / 0.35 : 0; U.uDripK.value = loop ? 1 : 0;
      U.uFilm.value = id === 7 ? 1 : 0; U.uPop.value = id === 7 ? f - (BEAT.insideQEnd - 16) : -1; U.uFat.value = id === 7 ? f - (BEAT.insideQEnd - 12) : -1; }
    const rip = (p: V3) => [(p[0] - HC[0]) / TK.hatch.r, (p[2] - HC[2]) / TK.hatch.r] as [number, number];
    const PLUNK = BEAT.drop + 36;  // fix2 LEAD (AUDIO): the plunk lands in the 'inside,|and' breath
    // the loop tape sways +-1 deg in the harbour wind (whole cycles on tau: the loop frame matches frame 0)
    const sway: V3 = loop ? [0.014 * cyc(9, tau, 0.4) * gust(tau, 0.7), 0, 0.009 * cyc(7, tau, 1.1)] : [0, 0, 0];
    const tapeIn: V3 = [TK.tapeIn[0] + sway[0], TK.tapeIn[1], TK.tapeIn[2] + sway[2]];
    if (loop) { U.uRip.value.set(...rip(tapeIn)); U.uRipK.value = 1; U.uRingK.value = 0; U.uGlint.value.set(0.36, -0.42); }
    else if (id === 4) { U.uRip.value.set(...rip(TK.tape4In)); U.uRipK.value = 0.15 + 0.85 * smooth((f - PLUNK) / 10) * (1 - 0.5 * smooth((f - PLUNK - 60) / 80)) * (1 - 0.7 * smooth((f - (BEAT.shout + 2)) / 30)); U.uRing.value = Math.max(0, (f - PLUNK) * 0.045); U.uRingK.value = f >= PLUNK ? 1 : 0; U.uGlint.value.set(0.34, -0.4); }
    else { const BL = BEAT.insideQEnd; /* fix1 LEAD (AUDIO): one pop, with the bubble */ U.uRip.value.set(0.05, 0.05); U.uRipK.value = 0.12; U.uRing.value = Math.max(0, (f - BL) * 0.035); U.uRingK.value = f >= BL ? 0.7 : 0; U.uGlint.value.set(-0.36, -0.4); }
    // the loop shot: the gold parts on "fake" (16 f) and settles from "trust" (24 f); exactly 0 well before the last frame
    // fix r2 (audit A2 P2): the parting starts 2 f before "fake" and eases open over 18 f (it was 4 f late and 12 f fast)
    U.uOpen.value = id === LAST ? 0.74 * smooth((f - (BEAT.fake - 2)) / 18) * (1 - smooth((f - BEAT.trust) / 24)) : 0;
    // ---- the tape: shots 1 / 16 the loop pose (from CHAR's card tape at TK.tapeTop into the oil; NO world reel there, the
    // belt reel is CHAR's); shot 4 it pays out from his hand from "drop" with the reel in his hand, shot 7 none ----
    // fix r3 (audit A3 P2 shot 4: after he stood, the tape stayed a rigid yellow stick standing out of the hatch): he REELS IT
    // IN as he stands (RIN0..RIN1, with the whirr): the top end follows his hand to his hip, the plumb comes up out of the oil
    // with it, the hatch is empty by RIN1
    const RIN0 = BEAT.shout - 6, RIN1 = RIN0 + 12;
    const showTape = loop || (id === 4 && f >= BEAT.drop + 12 && f < RIN1);
    const reel4 = id === 4 && f >= BEAT.drop + 12 && f < BEAT.shout - 8;
    this.tape.visible = showTape; this.reel.visible = reel4; this.bob.visible = id === 4 && ((f >= BEAT.drop + 12 && f < PLUNK + 2) || (f >= RIN0 + 2 && f < RIN1));
    this.tape90.visible = loop;
    for (const s of this.splash4) s.visible = false;
    this.plunkRing.visible = false;
    if (showTape) {
      const hip = smooth((f - (BEAT.shout - 8)) / 8), top4 = V(...TK.tape4Top).lerp(V(TK.tapeKneel[0] + 0.1, 11.62, TK.tapeKneel[2] + 0.08), id === 4 ? hip : 0);
      const a = loop ? V(...TK.tapeTop) : top4, end = V(...(loop ? tapeIn : TK.tape4In)), d = end.clone().sub(a), Lf = d.length();
      const k = loop ? 1 : clamp01((f - BEAT.drop - 12) / (PLUNK - BEAT.drop - 12)) ** 1.6 * (1 - smooth((f - RIN0) / (RIN1 - RIN0))), L = Math.max(0.01, Lf * k);
      const dir = d.normalize(), tip = a.clone().addScaledVector(dir, L);
      const yv = dir.clone().negate(), toCam = ctx.cam.position.clone().sub(a), zv = toCam.addScaledVector(yv, -toCam.dot(yv)).normalize(), xv = new THREE.Vector3().crossVectors(yv, zv);
      this.m4.makeBasis(xv, yv, zv).setPosition(a); this.tape.matrixAutoUpdate = false; this.tape.matrix.copy(this.m4).multiply(new THREE.Matrix4().makeScale(id === 4 ? 1.35 : 1, L, 1)); this.tape.matrixWorldNeedsUpdate = true;
      { const tm = this.tape.material as THREE.MeshBasicMaterial, want = id === 4 ? this.tape4Tex : this.tapeTex; if (tm.map !== want) { tm.map = want; tm.needsUpdate = true; } }
      if (loop) { const c90 = end.clone().addScaledVector(dir, -0.085).addScaledVector(zv, 0.002); this.tape90.matrix.makeBasis(xv, yv, zv).setPosition(c90); this.tape90.matrixWorldNeedsUpdate = true; }
      { const tt = id === 4 ? this.tape4Tex : this.tapeTex; tt.repeat.set(1, L / 0.5); tt.offset.set(0, loop ? fract((55 * tau) / VOICE_TOTAL) : -(L / 0.5)); }
      if (this.bob.visible) { this.bob.position.copy(tip).addScaledVector(dir, 0.05); }
      // fix r2 (audit A2 ADD shot 4): the brass bob catches the noon sun for 3 f as it drops
      { const gk = (f - (BEAT.drop + 17)) / 3; this.bobGlint.visible = id === 4 && gk >= 0 && gk < 1;
        if (this.bobGlint.visible) { this.bobGlint.position.copy(tip).addScaledVector(dir, 0.02); this.bobGlint.scale.setScalar(0.09 * Math.sin(Math.PI * gk) + 0.03); } }
      if (reel4) { this.reel.position.set(TK.tape4Top[0] + 0.03, TK.tape4Top[1] + 0.1, TK.tape4Top[2]); this.reel.rotation.set(0, Math.PI / 2, -L * 9); }
      // fix r3: the plunk reads at phone size: 4 fat gold droplets thrown up 0.24 m and out (12 f) + a bright gold ring (8 f)
      // (r3 check: from the high 3/4 the oil sits 0.63 m down the neck, out of sight): the droplets LEAP out of the hatch
      // mouth (up to ~0.35 m over the rim) and fall back, 16 f; a gold glow pulses up the neck (8 f)
      if (id === 4 && f >= PLUNK && f < PLUNK + 16) this.splash4.forEach((s, i) => { const u = (f - PLUNK) / 16, a0 = (i / 5) * TAU + 0.6, hk = 0.8 + 0.2 * hash(i, 81); s.visible = true;
        s.position.set(end.x + Math.cos(a0) * 0.2 * u, TK.hatch.oil + 0.03 + 0.95 * hk * 4 * u * (1 - u), end.z + Math.sin(a0) * 0.16 * u); s.scale.set(0.06 * (1 - 0.25 * u), 0.09 * (1 - 0.25 * u), 1); });
      { const gk = (f - PLUNK) / 8; this.bobGlint.visible = this.bobGlint.visible || (id === 4 && gk >= 0 && gk < 1);
        if (id === 4 && gk >= 0 && gk < 1) { this.bobGlint.position.set(end.x, TK.hatch.rim - 0.05, end.z); this.bobGlint.scale.setScalar(0.5 * Math.sin(Math.PI * gk) + 0.05); } }
      { const ru = (f - PLUNK) / 8; this.plunkRing.visible = id === 4 && ru >= 0 && ru < 1;
        if (this.plunkRing.visible) { this.plunkRing.position.set(end.x, TK.hatch.oil + 0.004, end.z); this.plunkRing.scale.setScalar(0.1 + 0.6 * Math.sqrt(ru)); (this.plunkRing.material as THREE.MeshBasicMaterial).opacity = 1 - ru * ru; } }
    }
    // ---- the windsock: points downwind, droops with the gusts, flutters ----
    {
      const gk = gust(tau, 1.3), pos = this.sock.geometry.attributes.position as THREE.BufferAttribute, base = this.sockBase;
      for (let i = 0; i < pos.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], t = -x / 1.2;
        pos.setXYZ(i, x, y - (1 - gk) * 0.9 * t * t + 0.04 * t * cyc(97, tau, t * 4), z + 0.06 * t * cyc(83, tau, t * 3)); }
      pos.needsUpdate = true; this.sock.rotation.set(0, Math.atan2(-WIND.z, WIND.x) + Math.PI + 0.12 * cyc(11, tau), 0);
    }
    // ---- harbour: the water drifts; the freighter + tug under way (smoke plumes); the docked tanker rides the swell ----
    {
      this.harbour.color.copy(look.water); (this.harbour.map as THREE.Texture).offset.set(fract((3 * tau) / VOICE_TOTAL), fract((2 * tau) / VOICE_TOTAL));
      const t0 = id === 4 ? tau - SHOTS[3].a : id === 7 ? tau - SHOTS[6].a + 200 : tau;
      // fix r2 (audit A2 P3 shot 1 + carry-over: the horn had no source): the freighter and the tug cross the visible harbour
      // gap between the far tanks in the shot-1 wide (x ~380-640 at 1080 through 165-198)
      this.freighter.position.set(O[0] - 104 + 0.05 * t0, 0.05 * cyc(13, tau), O[2] - 205);
      this.tug.position.set(O[0] - 60 - 0.035 * t0, 0.08 * cyc(23, tau, 1), O[2] - 150); this.tug.rotation.z = 0.02 * cyc(29, tau);
      this.wake.position.set(this.tug.position.x + 10, -0.95, this.tug.position.z); this.wake.scale.set(14, 1, 3.2);
      this.tanker.position.y = 0.04 * cyc(9, tau, 0.5);
      const dawn = ctx.light.name === "dawn_gold" || ctx.light.name === "late";
      for (const p of this.smoke) {
        const u = fract((31 * tau) / VOICE_TOTAL + p.k / 7), age = u * 90, big = p.ship === this.freighter ? 1.7 : 1;
        p.s.position.set(p.ship.position.x + p.off[0] - p.vx * age + WIND.x * age * 0.05, p.off[1] + age * 0.09 * big, p.ship.position.z + p.off[2] + WIND.z * age * 0.05);
        p.s.scale.setScalar((1.6 + 6 * u) * big); const mat = p.s.material as THREE.SpriteMaterial; mat.opacity = 0.7 * Math.sin(Math.PI * u) ** 0.7; mat.color.set(dawn ? "#9a8282" : "#7a7680");
      }
      // fix r2 (audit A2 P3 shot 1): the tug in the harbour gap blows its whistle (AUDIO horn_1 ~165): a white steam burst
      // from beside its funnel, 4 puffs 3 f apart from 160, each rising and swelling over 26 f (unfogged so it reads)
      // fix r3 (audit A3 P3 shot 1: nothing synced to the horn at 165): bigger bursts (~60-150 px), and the freighter's
      // whistle answers beside its funnel (3 white puffs from 162), both rising in the harbour band
      this.horn.forEach((s, k) => { const fr = k >= 4, kk = fr ? k - 4 : k, u = (f - (160 + 3 * kk + (fr ? 2 : 0))) / (fr ? 32 : 26); s.visible = id === 1 && u >= 0 && u < 1; if (!s.visible) return;
        const sh = fr ? this.freighter : this.tug, ox = fr ? -37.3 : 1.4, oy = fr ? 24.5 : 7.0;
        s.position.set(sh.position.x + ox + WIND.x * (fr ? 9 : 5) * u, oy + (fr ? 11 : 7) * u, sh.position.z + WIND.z * 4 * u);
        s.scale.setScalar(fr ? 7 + 15 * u : 5 + 10 * u); const mat = s.material as THREE.SpriteMaterial; mat.opacity = 0.95 * Math.sin(Math.PI * Math.min(1, u * 1.6)) ** 0.6 * (1 - u * 0.5); mat.color.set(dawn ? "#fff2e8" : "#ffffff"); });
    }
    // ---- fix r2: shot 1's warm glow over the hatch mouth (fades in as the crane lifts, so frame 0 is untouched); the dawn
    // sun patch on the loop frame's near plates; the far tank man with his own tape (shot 4 A only) ----
    { const k = id === 1 ? smooth((f - 60) / 40) : 0; this.hatchGlow.visible = k > 0.001;
      if (this.hatchGlow.visible) { this.hatchGlow.position.set(O[0] + HC[0], TK.hatch.rim + 0.06, O[2] + HC[2]); this.hatchGlow.scale.setScalar(1.05); (this.hatchGlow.material as THREE.SpriteMaterial).opacity = 0.26 * k; } }
    this.sunPatch.visible = ctx.light.name === "dawn_gold";
    // ---- fix r3: the loop frame's rail-bar shadow (dawn shots; it fades as shot 1's crane lifts, untouched at frame 0 and
    // through shot 16); dew glints on the rivets in step with the oil's star glint; the logbook page + pencil in the wind;
    // the sky in shot 4 B's puddle (all tau / whole cycles: frame 0 = the last frame) ----
    { const k = id === LAST ? 1 : id === 1 ? 1 - smooth((f - 22) / 26) : 0; this.railShadow.visible = k > 0.001; (this.railShadow.material as THREE.MeshBasicMaterial).opacity = 0.62 * k; }
    { const dr = (TAU * 3 * tau) / VOICE_TOTAL;
      this.dew.forEach((s, i) => { s.visible = loop; if (!loop) return; const tw = Math.max(0, Math.sin(dr * 23 + i * 1.9)) ** 6;
        s.scale.setScalar(0.03 + 0.05 * tw); (s.material as THREE.SpriteMaterial).opacity = 0.25 + 0.75 * tw; }); }
    { const lift = Math.max(0, cyc(17, tau, 0.3)) ** 2 * gust(tau, 2.1); this.logPage.children[0].rotation.z = (2.6 * lift * Math.PI) / 180;
      const roll = 0.004 * cyc(13, tau, 1.2), yw = this.pencil.rotation.y; this.pencil.position.set(O[0] - 0.135 + Math.sin(yw) * roll, H + 0.0255, O[2] + 6.42 + Math.cos(yw) * roll);
      this.pencil.rotation.x = -roll / 0.006; }
    this.skyPuddle.visible = id === 4;
    this.standGulls.forEach((g, k) => { const on = id === 4 && f >= SHOTS[3].a + 150; g.visible = on; if (!on) return;
      const mat = g.material as THREE.SpriteMaterial, t0 = BEAT.andInspector + 2 + 4 * k, u = (f - t0) / 24, sx = O[0] - 0.85 + (k ? 0.32 : -0.28), sz = O[2] + 7.8;
      if (u < 0) { if (mat.map !== P.gullPerchTex()) { mat.map = P.gullPerchTex(); mat.needsUpdate = true; } g.center.set(0.5, 0.08);
        g.position.set(sx, 1.33 + 0.01 * Math.abs(Math.sin(ctx.vf * 0.4 + k)), sz); g.scale.set((k ? -0.4 : 0.4), 0.4, 1); }
      else if (u < 1.2) { const fr = Math.floor(f / 2 + k) % 3, tx = P.gullTex(fr === 1 ? 1 : fr === 2 ? 2 : 0); if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; } g.center.set(0.5, 0.5);
        g.position.set(sx - (1.2 + 0.4 * k) * u - 0.8 * u * u, 1.5 + 1.0 * u + 2.2 * u * u, sz - 0.6 * u); g.scale.set(0.8 + 0.3 * u, 0.4 + 0.15 * u, 1); }
      else g.visible = false; });
    this.tapeMan.visible = this.tapeLine.visible = id === 4;
    if (id === 4) { this.tapeMan.position.y = TK.tanks[1].h + 0.75 + 0.02 * Math.sin(ctx.vf * 0.31); this.tapeLine.scale.y = 0.85 + 0.15 * Math.sin(ctx.vf * 0.11); }
    // ---- shot 1 / 7 / 16: a gull's shadow flicks across the roof and the gold; shot 7: a slow cloud shadow as the light turns
    {
      // fix r2: the loop shot's gull shadow glides across the near plates under the hatch after "trust" (gone by 2740, so
      // the seam stays clean); shot 7's is a full-size gull (1.1 m) sweeping the roof as the light turns (AUDIO gull_7)
      const gsPath: [number, number, number, number, number, number] | null = id === 1 ? [30, 30, -0.95, 4.6, 0.95, 6.15] : id === LAST ? [BEAT.trust + 7, 22, -0.95, 6.05, 0.95, 6.3]
        : null;
      const gu = gsPath ? (f - gsPath[0]) / gsPath[1] : -1;
      this.gullShadow.visible = !!gsPath && gu >= 0 && gu <= 1;
      if (gsPath && this.gullShadow.visible) { const x = gsPath[2] + (gsPath[4] - gsPath[2]) * gu, z = gsPath[3] + (gsPath[5] - gsPath[3]) * gu;
        this.gullShadow.position.set(O[0] + x, H + 0.28, O[2] + z); this.gullShadow.rotation.set(0, Math.atan2(-(gsPath[4] - gsPath[2]), -(gsPath[5] - gsPath[3])), 0);
        this.gullShadow.scale.setScalar(1 + 0.12 * Math.sin(gu * 9)); }
      // the big gull shadow: shot 7 across the roof (BEAT.soHow + 2 .. + 30), shot 4 B across the gravel yard (the far gull's
      // cry ~825) right to left
      // fix r3 (audit A3 P2 shot 7: gull_7 played with no gull in frame): the shadow now crosses the roof BEHIND the lender,
      // screen left -> right (+z -> -z), 1176 -> 1214, a 0.85 m wingspan, a slight wobble as it banks
      { const p7 = id === 7 ? (f - (BEAT.soHow + 10)) / 38 : -1, p4 = id === 4 ? (f - 818) / 16 : -1, on7 = p7 >= 0 && p7 <= 1, on4 = p4 >= 0 && p4 <= 1;
        this.gullShadow2.visible = on7 || on4;
        if (on7) { this.gullShadow2.position.set(O[0] - 1.7 + 0.25 * p7, H + 0.02, O[2] + 6.7 - 2.6 * p7); this.gullShadow2.rotation.set(0, Math.atan2(0.25, -2.6) + Math.PI, 0); this.gullShadow2.scale.setScalar(0.85 * (1 + 0.1 * Math.sin(p7 * 11))); }
        if (on4) { this.gullShadow2.position.set(O[0] + 3.6 - 4.8 * p4, 0.025, O[2] + 12.4 - 2.4 * p4); this.gullShadow2.rotation.set(0, Math.atan2(4.8, 2.4) + Math.PI, 0); this.gullShadow2.scale.setScalar(1.3 * (1 + 0.1 * Math.sin(p4 * 9))); } }
      // shot 4 B: a newspaper scrap skitters across the gravel in a gust (830-872), tumbling and settling
      { const u = (f - 830) / 42; this.scrap4.visible = id === 4 && u >= 0 && u < 1.6;
        if (this.scrap4.visible) { const uu = Math.min(1, u), hop = 0.18 * Math.abs(Math.sin(uu * Math.PI * 3.2)) * (1 - uu);
          this.scrap4.position.set(O[0] + 3.2 - 3.0 * (1 - (1 - uu) ** 2), 0.03 + hop, O[2] + 12.2 - 0.9 * uu);
          this.scrap4.rotation.set(-Math.PI / 2 + (1 - uu) * 1.4 * Math.sin(uu * 17), uu * 6 + (1 - uu) * Math.sin(uu * 9), 0.5 * (1 - uu) * Math.sin(uu * 13)); } }
      // fix r3 (audit A3 ADD shot 16): before "fake", one gull shadow glides left -> right across the plates and the gold
      { const u = id === LAST ? (f - (SHOTS[LAST - 1].a + 1)) / 32 : -1; this.gullShadow3.visible = u >= 0 && u <= 1;
        if (this.gullShadow3.visible) { const x = -0.95 + 1.9 * u, z = 4.95 + 0.75 * u; this.gullShadow3.position.set(O[0] + x, H + 0.3, O[2] + z);
          this.gullShadow3.rotation.set(0, Math.atan2(-1.9, -0.75), 0); this.gullShadow3.scale.setScalar(1 + 0.1 * Math.sin(u * 9)); } }
      const cu = (f - BEAT.soHow - 28) / 80;
      this.cloudShadow.visible = id === 7 && cu > 0;
      if (this.cloudShadow.visible) { this.cloudShadow.position.set(O[0] + 3.2 - 5.4 * cu, H + 0.014, O[2] + 8.2 - 4.4 * cu); (this.cloudShadow.material as THREE.MeshBasicMaterial).opacity = 0.2 * smooth(cu * 4); }
    }
    // ---- shot 1: the dawn sun just above the skyline at screen right (behind the cranes) + three faint god rays ----
    {
      const on = id === 1 && f >= 70, k = smooth((f - 70) / 50);
      this.sunGlow.visible = on; for (const r of this.rays) r.visible = on;
      if (on) {
        const c = camAt(1, 200), sx = 0.62, sy = 0.9;
        this.sunGlow.position.copy(viewPoint(c, sx, sy, 1050)); this.sunGlow.scale.setScalar(2 * 1050 * Math.tan(7 * D2R)); (this.sunGlow.material as THREE.SpriteMaterial).opacity = k;
        const pos = V(...c.pos), fw = V(...c.look).sub(pos).normalize(), rt = new THREE.Vector3().crossVectors(fw, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(rt, fw);
        this.rays.forEach((m, i) => { const ang = -2.2 + (i - 1) * 0.16, L = [1.5, 1.8, 1.3][i], Wd = [0.16, 0.24, 0.12][i], D = 60;
          const p0 = viewPoint(c, sx, sy, D), p1 = viewPoint(c, sx + Math.cos(ang) * L, sy + Math.sin(ang) * L * ASPECT, D), X = p1.clone().sub(p0);
          const Y = new THREE.Vector3().crossVectors(fw.clone().negate(), X).normalize().multiplyScalar(Wd * D * Math.tan((c.fov * Math.PI) / 360));
          this.m4.makeBasis(X, Y, fw.clone().negate()).setPosition(p0.clone().add(p1).multiplyScalar(0.5)); m.matrix.copy(this.m4); m.matrixWorldNeedsUpdate = true;
          (m.material as THREE.MeshBasicMaterial).opacity = k * [0.9, 1.0, 0.7][i]; void up; void rt; });
      }
    }
    // ---- shot 7: dust motes drifting in the late sun over the hatch; the lender's briefcase + umbrella ----
    this.s7props.visible = id === 7;
    // fix r2 (audit A2 ADD shot 16): the loop shots get 6 dim dawn motes too (tau-based: frame 0 = the last frame)
    { const lk = id === 7 ? 0.35 + 0.65 * smooth((f - BEAT.soHow - 6) / 70) : loop ? 0.45 : 0;
      this.motes.forEach((s, i) => { s.visible = id === 7 || (loop && i < 6); if (!s.visible) return;
        const u = fract((7 + (i % 3)) * tau / VOICE_TOTAL + hash(i, 141)), a = hash(i, 142) * TAU + tau * 0.004;
        s.position.set(O[0] + HC[0] + 0.55 * Math.sin(a) * (0.4 + hash(i, 143)), H + 0.25 + (loop ? 0.35 : 0.9) * u, O[2] + HC[2] + 0.45 * Math.cos(a) * (0.4 + hash(i, 144)));
        s.scale.setScalar(0.014 + 0.012 * hash(i, 145)); (s.material as THREE.SpriteMaterial).opacity = lk * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(tau * 0.3 + i)); }); }
    // ---- shot 4: the gull perched on the rim rail next to the shout spot; "full!" startles it into the air ----
    {
      const on = id === 4, [px, pz] = pol(O[0], O[2], TK.rail.r, -0.03), tOff = BEAT.fullShout + 3, u = (f - tOff) / 40;
      this.perch.visible = on && u < 1.4;
      if (this.perch.visible) { const mat = this.perch.material as THREE.SpriteMaterial;
        if (u < 0) { const turn = hash(Math.floor(ctx.vf / 52), 151) < 0.5 ? 1 : -1;
          if (mat.map !== P.gullPerchTex()) { mat.map = P.gullPerchTex(); mat.needsUpdate = true; }
          this.perch.position.set(px, H + TK.rail.h + 0.15 + 0.008 * Math.abs(Math.sin(ctx.vf * 0.4)), pz); this.perch.scale.set(0.36 * turn, 0.36, 1); }
        else { const fr = Math.floor(f / 2) % 3, tx = P.gullTex(fr === 1 ? 1 : fr === 2 ? 2 : 0); if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
          this.perch.position.set(px - 1.6 * u - 0.4 * u * u, H + TK.rail.h + 0.15 + 0.5 * u + 1.6 * u * u, pz - 1.4 * u); this.perch.scale.set(0.7 + 0.3 * u, 0.35 + 0.15 * u, 1); }
      }
    }
    // ---- far life: tiny workers walking two far tank roofs ----
    for (const w of this.workers) { const a = w.ph + (TAU * w.n * tau) / VOICE_TOTAL;
      w.s.position.set(w.c[0] + w.r * Math.sin(a), w.c[1] + 0.95, w.c[2] + w.r * Math.cos(a)); w.s.scale.set(0.95, 1.9, 1);
      const mat = w.s.material as THREE.SpriteMaterial, tx = P.tinyWorkerTex(Math.floor(tau / 9) % 2); if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; } }
  }

  private poseFarm(id: number, f: number, vf: number, ctx: SetCtx) {
    const O = TF.base, cam = ctx.cam;
    // ---- fix r2: the gate leaves swing out per shot (soft foreground framers); the right one shivers on the fence rattle
    // (AUDIO fence_2, BEAT.king - 3); the gull on the sign flaps off as the glide begins; the stair lamp lights the storm ----
    { const [aL, aR] = LEAF_OPEN[id] ?? LEAF_OPEN[2], rt = f - (BEAT.king - 3), sh = id === 2 && rt >= 0 ? 0.018 * Math.exp(-rt / 7) * Math.sin(rt * 2.3) : 0;
      this.leaves[0].rotation.y = -aL + (id === 9 ? 0.008 * cyc(97, vf) : 0); this.leaves[1].rotation.y = Math.PI + aR + sh + (id === 9 ? 0.008 * cyc(89, vf, 1) : 0); }
    { const sg = TF.gate.sign, gx = O[0] - 0.62, gy = sg.cy + sg.h / 2 + 0.46, gz0 = O[2] + TF.gate.z + 0.02, tOff = BEAT.tino + 21, u = (f - tOff) / 34;
      this.signGull.visible = id === 2 && u < 1; const mat = this.signGull.material as THREE.SpriteMaterial;
      if (this.signGull.visible) {
        if (u < 0) { if (mat.map !== P.gullPerchTex()) { mat.map = P.gullPerchTex(); mat.needsUpdate = true; } this.signGull.center.set(0.5, 0.08);
          const turn = hash(Math.floor(vf / 46), 171) < 0.5 ? 1 : -1, bob = Math.max(0, Math.sin(vf * 0.5)) ** 8 * 0.02;
          this.signGull.position.set(gx, gy + bob, gz0); this.signGull.scale.set(0.46 * turn, 0.46, 1); }
        else { const fr = Math.floor(f / 2) % 3, tx = P.gullTex(fr === 1 ? 1 : fr === 2 ? 2 : 0); if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; } this.signGull.center.set(0.5, 0.5);
          this.signGull.position.set(gx - 1.4 * u - 0.6 * u * u, gy + 0.25 + 1.2 * u + 1.6 * u * u, gz0 + 0.8 * u); this.signGull.scale.set(0.95 + 0.25 * u, 0.48 + 0.12 * u, 1); } } }
    if (id === 9) this.stairBulb.color.setRGB(3.6, 2.3, 1.05); else this.stairBulb.color.setRGB(0.85, 0.82, 0.74);
    this.slow.visible = id === 2; this.soggy.visible = id === 9;  // fix r3 (A3 P1): no SLOW in the storm
    // ---- the riser's pressure gauge needle jitters (idle life, video clock) ----
    this.needle.rotation.set(0, 0, -(0.45 + 0.07 * cyc(31, vf) + 0.04 * cyc(73, vf, 1.3) + 0.025 * cyc(151, vf, 0.5)));
    // ---- the drip (shot 2). fix r3 (audit A3 P2: a detached speck hung under the spout for 2 s; the drop fell BEHIND the
    // green pipe and the 'plip' played over nothing): a bead GROWS on the spout lip from t0 - 16 (attached, its body over
    // the lip), lets go as "oil." ends (t0) 1.3x fatter, falls 12 f in front of the pipe's axis and lands ON the pipe's top
    // at t0 + 12 = oil1End + 6 (the plip, AUDIO unchanged) with a thin splash crown, 3 droplets (12 f) and a wet glint that stays; then a fresh bead
    // slowly regrows ----
    {
      const s2 = id === 2, t0 = BEAT.oil1End - 6, land = t0 + 12, mx = O[0] + SPOUT[0], my = SPOUT[1] + 0.025, mz = O[2] + SPOUT[2], fz = mz + 0.12, pipeY = 0.405;
      const fw = new THREE.Vector3(); cam.getWorldDirection(fw);
      const depth = Math.max(0.5, this.v.set(mx, my, mz).sub(cam.position).dot(fw)), ppm = 1920 / (2 * depth * Math.tan((cam.fov * Math.PI) / 360));
      const dropH = 1.3 * Math.max(0.11, 44 / ppm), sh = dropH / 0.84, sw = sh * (128 / 192), CY = 0.85;
      this.drop.center.set(0.5, CY); this.bead.center.set(0.5, CY);
      this.drop.visible = s2 && f >= t0 - 16 && f < land;
      if (this.drop.visible) {
        if (f < t0) { const k = 0.18 + 0.82 * smooth((f - (t0 - 16)) / 16), wob = 1 + 0.04 * Math.sin((f - t0) * 1.3) * (f > t0 - 5 ? 1 : 0); this.drop.position.set(mx, my, fz - 0.06); this.drop.scale.set(sw * k / wob, sh * k * wob, 1); }
        else { const u = (f - t0) / 12, yEnd = pipeY + 0.777 * sh; this.drop.position.set(mx, my - (my - yEnd) * u * u, fz - 0.06 + 0.06 * u); this.drop.scale.set(sw * (1 - 0.08 * u), sh * (1 + 0.22 * u), 1); }
      }
      this.bead.visible = s2 && f >= t0 + 3;
      if (this.bead.visible) { const k = 0.4 * smooth((f - t0 - 3) / 30); this.bead.position.set(mx, my, fz - 0.06); this.bead.scale.set(sw * k, sh * k, 1); }
      { const gu = (f - (t0 - 1)) / 3.5; this.spoutGlint.visible = s2 && gu >= 0 && gu < 1;
        if (this.spoutGlint.visible) { this.spoutGlint.position.set(mx + 0.03, my - 0.02, mz + 0.08); this.spoutGlint.scale.setScalar(dropH * 1.8 * Math.sin(Math.PI * gu)); } }
      // (r3 check: the splash has only ~3 f before the 10 f dissolve into shot 3): a BIG crown (~90 px) that pops in on the plip
      const cu = (f - land + 1) / 9; this.dripCrown.visible = s2 && cu >= 0 && cu < 1;
      if (this.dripCrown.visible) { this.dripCrown.position.set(mx, pipeY - 0.01, fz); const w = Math.max(0.26, 90 / ppm) * (0.75 + 0.45 * Math.sqrt(cu)); this.dripCrown.scale.set(w, w * 0.7, 1);
        (this.dripCrown.material as THREE.SpriteMaterial).opacity = 1 - cu * cu; }
      const wk = (f - land) / 40; this.dripWet.visible = s2 && wk >= 0 && wk < 1;
      if (this.dripWet.visible) { this.dripWet.position.set(mx + 0.01, pipeY + 0.01, fz); this.dripWet.scale.setScalar(Math.max(0.05, 16 / ppm) * (0.6 + 0.4 * Math.cos(wk * 9))); (this.dripWet.material as THREE.SpriteMaterial).opacity = 0.9 * (1 - wk); }
      this.dripRing.visible = false;
      this.dropKids.forEach((s, i) => { const v = (f - land + 1) / 12; s.visible = s2 && v >= 0 && v < 1; if (!s.visible) return; const a = [0.5, 2.6, 1.6][i], k = Math.max(0.05, dropH * 0.5) * (1 - 0.3 * v);
        s.position.set(mx + Math.cos(a) * 0.26 * v, pipeY + 0.03 + 0.24 * 4 * v * (1 - v) - 0.15 * v * v, fz + 0.02 + Math.sin(a) * 0.05 * v); s.scale.set(k * (128 / 192), k, 1); });
      this.dripPuddle.scale.set(0.75, 1, 0.5);
    }
    // ---- BANKRUPT (shot 9): slapped onto the sign on "bust" (a 6 f overshoot settle, a spray burst off the wet sign); its
    // half-glued lower corner flutters in the wind ----
    const k = (f - (BEAT.bust - 2)) / 7;
    this.notice.visible = id === 9 && k >= 0;
    if (this.notice.visible) {
      const s = k < 1 ? 1 + 0.35 * (1 - k) * Math.cos(k * 5) : 1; this.notice.scale.setScalar(s); this.notice.rotation.z = NOTICE_ROT + 0.12 * (1 - clamp01(k)) * Math.cos(k * 4);
      this.notice.position.set(O[0] + NOTICE[0], NOTICE[1], O[2] + NOTICE[2] + 0.03);
      const pos = this.notice.geometry.attributes.position as THREE.BufferAttribute, b = this.noticeBase, fl = 0.5 + 0.5 * cyc(73, vf), fl2 = cyc(131, vf, 0.7);
      for (let i = 0; i < pos.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], w = clamp01(x / (NOTICE_W / 2)) ** 2 * clamp01(-y / (NOTICE_H / 2)) ** 2;
        pos.setXYZ(i, x - 0.01 * w * fl, y + 0.035 * w * fl, 0.07 * w * (0.4 + 0.6 * fl) + 0.012 * w * fl2); }
      pos.needsUpdate = true;
    }
    this.spray.forEach((s, i) => { const v = (f - (BEAT.bust - 2)) / 12; s.visible = id === 9 && v >= 0 && v < 1; if (!s.visible) return;
      const a = (i / 14) * TAU + hash(i, 161) * 0.5, sp = 0.5 + 0.6 * hash(i, 162), t = v * 12;
      s.position.set(O[0] + NOTICE[0] + Math.cos(a) * 0.065 * sp * t, NOTICE[1] + Math.sin(a) * 0.05 * sp * t - 0.004 * t * t, O[2] + NOTICE[2] + 0.1 + 0.025 * t);
      s.scale.setScalar(0.04 + 0.025 * hash(i, 163)); (s.material as THREE.SpriteMaterial).opacity = 1 - v; });
    { const v = (f - (BEAT.bust - 2)) / 9; this.sprayRing.visible = id === 9 && v >= 0 && v < 1;
      if (this.sprayRing.visible) { this.sprayRing.position.set(O[0] + NOTICE[0], NOTICE[1], O[2] + NOTICE[2] + 0.08); this.sprayRing.scale.setScalar(0.5 + 1.8 * v); (this.sprayRing.material as THREE.SpriteMaterial).opacity = 0.85 * (1 - v); } }
    // ---- the hut window: warm-lit in the storm (the one warm accent), dark glass at noon ----
    this.hutWin.color.set(id === 9 ? "#ffd09a" : "#5a6a88");
    if (id === 9) this.gateBulb.color.setRGB(2.6, 1.75, 0.85); else this.gateBulb.color.set("#d8d0b8");
    // ---- the storm: rain in depth, splash crowns, puddle rings, curtains, the scudding deck, lightning, rivulets ----
    const storm = id === 9;
    this.wetFarm.visible = storm;
    if (storm) {
      const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); const fw = fwd.clone(); fw.y = 0; fw.normalize(); const rt = new THREE.Vector3(fw.z, 0, -fw.x).negate();
      const fl = flashAt(f), camY = cam.position.y, tv = Math.tan((cam.fov * Math.PI) / 360);
      // rain: d = 2.5 + 26 h^1.6, width 0.0014 d (2-3 px at 1080), 0.3-0.7 m long, brighter far (0.3 -> 0.6), inside the frustum
      const N = this.rain.count, tilt = 0.12;
      for (let i = 0; i < N; i++) {
        const h = hash(i, 91), d = 2.5 + 26 * Math.pow(h, 1.6), x = (hash(i, 92) - 0.5) * d * 0.64, L = 0.3 + 0.4 * hash(i, 93), sp = 0.36 + 0.14 * hash(i, 94);
        const yLo = Math.max(-0.2, camY - 0.6 * d - 0.4), yHi = camY + 0.62 * d + 1.0, span = yHi - yLo;
        const y = yHi - fract(hash(i, 95) + (vf * sp) / span) * span + L;
        const px = cam.position.x + fw.x * d + rt.x * x, pz = cam.position.z + fw.z * d + rt.z * x;
        this.q.setFromEuler(_e.set(0, Math.atan2(cam.position.x - px, cam.position.z - pz), tilt, "YXZ"));
        this.m4.compose(this.v.set(px, y, pz), this.q, this.sc.set(0.0014 * d, L, 1)); this.rain.setMatrixAt(i, this.m4);
        this.rain.setColorAt(i, this.c.setScalar((0.3 + 0.3 * clamp01((d - 2.5) / 18)) * (1 + 1.4 * fl.all)));
      }
      this.rain.instanceMatrix.needsUpdate = true; if (this.rain.instanceColor) this.rain.instanceColor.needsUpdate = true;
      // fix r3 (audit A3 P2): thin crown splashes, 16-28 px at 1080 whatever the distance, alpha ~0.55, life 4-6 f, at seeded
      // spots (denser near the lens); fix r3 puddle rings: 2 -> ~32 px over 10-12 f, hairline, in every puddle + the pour
      const ppmAt = (d: number) => 1920 / (2 * d * tv);
      for (let i = 0; i < this.crowns.count; i++) {
        const per = 13 + 9 * hash(i, 101), uu = fract(vf / per + hash(i, 102)), c0 = Math.floor(vf / per + hash(i, 102)), life = (4 + 2 * hash(i, 106)) / per;
        const d = 1.6 + 19 * Math.pow(hash(i, 103 + c0 * 7), 1.5), x = (hash(i, 104 + c0 * 5) - 0.5) * d * 0.66;
        const px = cam.position.x + fw.x * d + rt.x * x, pz = cam.position.z + fw.z * d + rt.z * x, v = uu / life;
        const sz = uu < life ? (((16 + 12 * hash(i, 105 + c0 * 3)) * clamp01(Math.max(0.45, 4 / d))) / ppmAt(d)) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, v * 1.3)) ** 0.5) : 0;
        this.q.setFromEuler(_e.set(0, Math.atan2(cam.position.x - px, cam.position.z - pz), 0, "YXZ"));
        this.m4.compose(this.v.set(px, 0.012, pz), this.q, this.sc.set(sz * 1.4, sz, 1)); this.crowns.setMatrixAt(i, this.m4);
      }
      this.crowns.instanceMatrix.needsUpdate = true;
      const gx = POUR9[0], ppmK = 1920 / (2 * tv);
      for (let i = 0; i < this.ripples.count; i++) {
        const pour = i >= 64, refl = i >= 48 && i < 64, act = pour ? i < 70 : refl ? true : i < 30;
        if (!act) { this.m4.makeScale(0, 0, 0); this.ripples.setMatrixAt(i, this.m4); this.ripples.setColorAt(i, this.c.setScalar(0)); continue; }
        const per = (pour ? 9 : 11) + 3 * hash(i, 121), uu = fract(vf / per + hash(i, 122)), c0 = Math.floor(vf / per + hash(i, 122));
        const pd = STORM_PUDDLES[i % STORM_PUDDLES.length];
        const cx = pour ? gx + (hash(i, 123 + c0) - 0.5) * 0.25 : refl ? REFL9[0] + (hash(i, 127 + c0 * 3) - 0.5) * REFL9[2] * 0.85 : pd[0] + (hash(i, 124 + c0 * 3) - 0.5) * pd[2] * 0.7;
        const cz = pour ? POUR9[1] + 0.2 + (hash(i, 125 + c0) - 0.5) * 0.25 : refl ? REFL9[1] + (hash(i, 128 + c0 * 5) - 0.5) * REFL9[3] * 0.8 : pd[1] + (hash(i, 126 + c0 * 5) - 0.5) * pd[3] * 0.6;
        const d = Math.max(1, this.v.set(O[0] + cx, 0.04, O[2] + cz).distanceTo(cam.position)), rpx = 2 + 30 * Math.sqrt(uu), diam = (2 * rpx * d) / ppmK;
        this.m4.compose(this.v.set(O[0] + cx, 0.042, O[2] + cz), this.q.identity(), this.sc.setScalar(diam)); this.ripples.setMatrixAt(i, this.m4);
        this.ripples.setColorAt(i, this.c.setScalar((refl ? 0.75 : 0.6) * (1 - uu)));
      }
      this.ripples.instanceMatrix.needsUpdate = true; if (this.ripples.instanceColor) this.ripples.instanceColor.needsUpdate = true;
      // fix r3: the climber's lamp: the wall pool breathes a little, rain streaks fall through its cone, water sheets off the
      // landing, splashes pop on the treads; the sign-end pour splashes at the post foot; the huddled gulls shuffle; the
      // tanker's beacon blinks slowly; the drain swallows its swirl; the puddle's sign reflection wobbles
      (this.wallPool.material as THREE.MeshBasicMaterial).opacity = 0.62 + 0.06 * cyc(37, vf) + 0.25 * fl.all;
      { const t = (this.lampCone.material as THREE.MeshBasicMaterial).map!; t.offset.set(fract(vf * 0.013), fract(vf * 0.11)); (this.lampCone.material as THREE.MeshBasicMaterial).opacity = 0.55; }
      this.streamLand.forEach((m, k) => { const t = (m.material as THREE.MeshBasicMaterial).map!; t.offset.set(k * 0.3, fract(vf * 0.08 + k * 0.37)); m.rotation.y = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z); });
      { const cx0 = O[0] + TFH.c[0], cz0 = O[2] + TFH.c[2];
        this.treadSplash.forEach((sp, i) => { const per = 8 + 5 * hash(i, 201), uu = fract(vf / per + hash(i, 202)), c0 = Math.floor(vf / per + hash(i, 202)), on = uu < 0.45; sp.visible = on; if (!on) return;
          const t = hash(i, 203 + c0 * 3) * 0.35, th = FARM_STAIR.a0 + (FARM_STAIR.a1 - FARM_STAIR.a0) * t, y = FARM_STAIR.y0 + (FARM_STAIR.y1 - FARM_STAIR.y0) * t;
          const [x, z] = i < 3 ? pol(cx0, cz0, TFH.r + 0.5 + (hash(i, 204 + c0) - 0.5) * 0.6, FARM_LAD_A - 0.03 + (hash(i, 205 + c0) - 0.5) * 0.18) : pol(cx0, cz0, TFH.r + 0.43, th);
          sp.position.set(x, (i < 3 ? FARM_LAND_Y : y) + 0.02, z); const sz = 0.16 * Math.sin(Math.PI * (uu / 0.45)) ** 0.6; sp.scale.set(sz * 1.4, sz, 1); sp.center.set(0.5, 0.12); }); }
      this.signPourSplash.forEach((sp, k) => { const per = 7 + 2 * k, uu = fract(vf / per + k * 0.33); sp.visible = true; sp.center.set(0.5, 0.12);
        sp.position.set(O[0] + POUR9[0] + (k - 1) * 0.07, 0.03, O[2] + POUR9[1] + 0.06); const sz = 0.2 * (0.5 + 0.5 * Math.sin(Math.PI * uu)); sp.scale.set(sz * 1.4, sz, 1); (sp.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - uu * 0.6); });
      this.huddle.forEach((g, k) => { const sg = TF.gate.sign, x = [-0.62, -0.34, 0.55][k], fluff = Math.max(0, cyc(5 + 2 * k, vf, k * 2.1)) ** 12;
        g.center.set(0.5, 0.06); g.position.set(O[0] + x + 0.02 * cyc(3 + k, vf, k), sg.cy + sg.h / 2 + 0.47, O[2] + TF.gate.z); const sz = 0.42 + 0.04 * fluff; g.scale.set((k === 1 ? -1 : 1) * sz * 1.1, sz * (0.92 + 0.06 * fluff), 1); });
      { const bl = Math.max(0, Math.sin((TAU * 46 * vf) / VOICE_TOTAL)) ** 3; this.beacon.color.setRGB(0.6 + 2.6 * bl, 0.32 + 1.3 * bl, 0.08 + 0.3 * bl);
        this.beaconHalo.scale.setScalar(0.6 + 1.0 * bl); (this.beaconHalo.material as THREE.SpriteMaterial).opacity = 0.15 + 0.85 * bl; }
      this.drainSwirl.rotation.y = -vf * 0.09;
      this.reflTex.offset.set(0.006 * Math.sin(vf * 0.9) + 0.004 * Math.sin(vf * 2.3), 0); (this.reflPuddle.material as THREE.MeshBasicMaterial).opacity = 0.74 + 0.16 * fl.all;
      // the far rain curtains face the lens at 14 / 28 / 46 m and fall ~1.2 m per frame
      this.curtains.forEach((m, k) => { const D = [14, 28, 46][k], hgt = 2 * D * tv * 1.35, wdt = hgt * ASPECT * 1.2;
        m.position.copy(cam.position).addScaledVector(fwd, D); m.quaternion.copy(cam.quaternion); m.scale.set(wdt, hgt, 1);
        const t = (m.material as THREE.MeshBasicMaterial).map!; t.offset.set(fract(k * 0.37), fract((vf * 1.2 * t.repeat.y) / hgt + k * 0.29)); });
      // the storm deck scuds (0.3 % of the frame width per frame); lightning brightens it, the haze and the whole frame
      (this.cloudBand.material as THREE.MeshBasicMaterial).map!.offset.x = fract(vf * 0.0021);
      (this.cloudBand.material as THREE.MeshBasicMaterial).color.setScalar(1 + 1.6 * fl.all);
      (this.haze.material as THREE.MeshBasicMaterial).color.set("#3a5aa0").multiplyScalar(1 + 1.4 * fl.all);
      { const D = 0.3, hgt = 2 * D * tv * 1.25; this.flash.position.copy(cam.position).addScaledVector(fwd, D); this.flash.quaternion.copy(cam.quaternion); this.flash.scale.set(hgt * ASPECT * 1.2, hgt, 1);
        this.flash.visible = fl.all > 0.001; (this.flash.material as THREE.MeshBasicMaterial).color.set("#dde6ff").multiplyScalar(0.16 * fl.all); }
      this.bolt.visible = fl.bolt > 0;
      // fix r2: the forked bolt sits in the strip of storm sky over No. 7's rim (its foot hidden behind the tank)
      if (this.bolt.visible) { const c = camAt(9, SHOTS[8].a + 12); this.bolt.position.copy(viewPoint(c, 0.22, 0.83, 320)); this.bolt.scale.set(16, 64, 1); (this.bolt.material as THREE.SpriteMaterial).opacity = fl.bolt; }
      // wet rivulets run down No. 7; the beam's pour
      (this.rivulets.material as THREE.MeshBasicMaterial).map!.offset.y = fract(vf * 0.012);
      this.gutter.rotation.set(0, Math.atan2(cam.position.x - this.gutter.position.x, cam.position.z - this.gutter.position.z), 0);
      (this.gutter.material as THREE.MeshBasicMaterial).map!.offset.y = fract(vf * 0.09);
      // fix r2: the lamps' wet streaks shimmer down the ripples; rain drips run off the swung left leaf's top wire
      this.streaks.forEach((t, k) => { t.offset.set(0.02 * Math.sin(vf * 0.7 + k), fract(vf * 0.013 + k * 0.4)); });
      { const lf = this.leaves[0]; lf.updateMatrixWorld();
        this.wireDrips.forEach((s, i) => { const per = 14 + 5 * (i % 3), uu = fract(vf / per + i * 0.29), y = 2.22 - 2.4 * uu * uu; s.visible = y > 0.04;
          s.position.copy(lf.localToWorld(this.v.set(0.25 + (i * (TF.gate.half - 0.6)) / 6, y, 0.02))); s.scale.set(0.035, 0.08, 1); }); }
      // drips along the sign's bottom edge (0.05 x 0.12 m)
      this.signDrips.forEach((s, i) => { const per = 16 + 6 * (i % 4), uu = fract(vf / per + i * 0.37), sg = TF.gate.sign, y = sg.cy - sg.h / 2 - 0.1 - 3.0 * uu * uu; s.visible = y > 0.05;
        s.position.set(O[0] - sg.w / 2 + 0.2 + (i * (sg.w - 0.4)) / 9, y, O[2] + TF.gate.z + 0.07); s.scale.set(0.05, 0.12, 1); });
      // a newspaper tumbles across the yard in a gust, under the lenders' feet
      { const u = (f - BEAT.lenders - 8) / 50; this.farmSheet.visible = u >= 0 && u < 1;
        if (this.farmSheet.visible) { this.farmSheet.position.set(O[0] - 3.6 + 7.4 * u, 0.06 + 0.32 * Math.abs(Math.sin(u * Math.PI * 3)), O[2] + 12.4 - 0.8 * u);
          this.farmSheet.rotation.set(-1.1 + 1.2 * Math.sin(u * 19), u * 11, 0.7 * Math.sin(u * 13)); } }
    }
  }

  private poseStreet(id: number, f: number, vf: number, ctx: SetCtx) {
    const O = ST.base, pc = ST.poster;
    // ---- the headline bill spins in onto the kiosk board on "came out" (16 f: 1.5 turns + a flight in from the left), then a
    // 3 f slap-wobble as it lands (AUDIO: spin_14 a = cameOut - 3, land = cameOut + 13) ----
    const u = clamp01((f - (BEAT.cameOut - 3)) / 16), e = 1 - (1 - u) ** 3, w = f - (BEAT.cameOut + 13);
    this.poster.visible = f >= BEAT.cameOut - 3;
    this.poster.position.set(O[0] + pc.c[0] - 1.6 * (1 - e), pc.c[1] + 0.5 * (1 - e) * Math.sin(Math.PI * e), O[2] + pc.c[2] + 0.002 + 0.6 * (1 - e));
    this.poster.rotation.set(0, 0, -TAU * 1.5 * (1 - e) + (w >= 0 ? 0.045 * Math.exp(-w / 2.2) * Math.sin(w * 2.1) : 0));
    this.poster.scale.setScalar((0.35 + 0.65 * e) * (w >= 0 ? 1 + 0.035 * Math.exp(-w / 1.8) * Math.cos(w * 2.6) : 1));
    // ---- the SHARES arrows drop red on "crashed" (staggered 3 f, a little bounce); the wet patch's streaks turn red ----
    this.arrowsD.forEach((d, k) => { const t = (f - (BEAT.crashed2 - 2 + k * 3)) / 8, on = t >= 0; d.visible = on; this.arrowsN[k].visible = !on;
      if (on) { const tt = clamp01(t), y0 = ST.board.c[1] + (0.5 - 495 / 700) * ST.board.h; d.position.y = y0 + 0.12 * (1 - tt) * (1 - tt) - 0.025 * Math.sin(Math.PI * clamp01((t - 0.6) / 0.5)) * (t > 0.6 ? 1 : 0); } });
    { const red = f >= BEAT.crashed2 + 6; for (const m of this.wetRed) m.visible = red; for (const m of this.wetGrey) m.visible = !red; }
    // ---- the CLOSED card swings up on "shares" (a damped pendulum from its hook) ----
    const c = (f - (BEAT.shares - 2)) / 30;
    this.closed.visible = c >= 0;
    if (this.closed.visible) this.closed.rotation.z = 0.45 * Math.exp(-c * 3.2) * Math.cos(c * 14) + 0.01 * cyc(17, vf);
    // ---- fix r2 (audit A2 P2): the red / cream sedan pulls in from the left and parks behind the teal one (ease-out, a
    // suspension dip as it stops, a chrome glint on the bumper); its reflection slides across the lit shop window ----
    { const u = clamp01((f - CAR14_A) / (CAR14_STOP - CAR14_A)), xf = CAR14_FRONT - 3.6 * (1 - u) ** 2, ds = f - CAR14_STOP;
      const dip = ds >= 0 ? 0.03 * Math.exp(-ds / 4) * Math.sin(ds * 1.3) : 0;
      // (r2 check, test clip A2_clip_s14: from this 2.7 m-high camera only the kerb lane shows, so any moving car is a
      // close-up block crossing the bottom 30 % and hides the parked one: the pass is OFF until CAM shows more road)
      this.car14.visible = CAR14_ON; this.car14.position.set(O[0] + xf - 2.74, -dip, O[2] + 1.6); this.car14.rotation.set(0, 0, ds >= 0 ? 0.012 * Math.exp(-ds / 4) * Math.sin(ds * 1.3) : 0);
      const gk = (f - (CAR14_STOP - 2)) / 5; this.carGlint.visible = CAR14_ON && gk >= 0 && gk < 1;
      if (this.carGlint.visible) { this.carGlint.position.set(O[0] + xf, 0.62, O[2] + 2.5); this.carGlint.scale.setScalar(0.3 * Math.sin(Math.PI * gk)); }
      const cu = (f - (CAR14_A - 6)) / 40; this.carRefl.offset.set(cu > 0 && cu < 1 ? 1.0 - 2.6 * cu : 1.2, -0.18); }
    // ---- the bundles' top sheets lift in the gusts ----
    this.bundleTops.forEach((t, k) => t.rotation.set(-Math.PI / 2, -(0.06 + 0.42 * Math.max(0, cyc(13 + 4 * k, vf, k * 1.7)) ** 2 * gust(vf, k)), 0));
    // ---- pigeons: two on the kiosk roof, one on the SHARES board, two on the sidewalk, two on the belt course. fix r2
    // (audit A2 P2: they promised to flutter up on the bwomp): from crashed + 2 the two kiosk-roof birds and the one by the
    // reader take off (stagger 0 / 3 / 5 f), a 2-frame wing flap, rising up and out of the top-left in an arc over ~22 f;
    // the board bird goes too; one feather drifts down for 30+ f ----
    const P0: [number, number, number][] = [[-0.62, 2.74, -1.98], [-0.32, 2.74, -2.06], [1.62, ST.board.c[1] + ST.board.h / 2 + 0.06, -5.9], [-0.3, 0.15, -1.5], [1.32, 0.15, -2.0],
      [-2.45, 5.0, -5.95], [-1.75, 5.0, -5.95]];
    const FLY: Record<number, number> = { 0: 0, 1: 3, 4: 5, 2: 1 };
    this.pigeons.forEach((p, k) => { const [px, py, pz] = P0[k], ph = hash(k, 111) * TAU, peck = Math.sin((TAU * (29 + 3 * k) * 3 * vf) / VOICE_TOTAL + ph) > (k < 3 || k > 4 ? 0.75 : 0.35);
      const t0 = FLY[k] !== undefined ? BEAT.crashed2 + 2 + FLY[k] : 1e9, fu = (f - t0) / 22, fly = f >= t0 ? clamp01(fu) : 0;
      const walk = (k < 3 || k > 4 ? 0.03 : 0.12) * Math.sin((TAU * (5 + k) * vf) / VOICE_TOTAL + ph);
      const hop = k === 3 || k === 4 ? 0.03 * Math.max(0, Math.sin((TAU * (41 + k) * vf) / VOICE_TOTAL + ph)) ** 6 : 0;
      p.visible = !(f >= t0 && fu > 1.4);
      const ax = k === 2 ? 2.2 : -3.4 - 0.4 * (k % 2), ay = k === 2 ? 2.4 : 3.2 - py * 0.25, az = -0.6;
      p.position.set(O[0] + px + walk + ax * (fly * 0.6 + 0.4 * fly * fly), py + 0.15 + hop + ay * (fly * 0.35 + 0.65 * fly * fly) + 0.35 * Math.sin(Math.PI * fly), O[2] + pz + az * fly);
      const flap = f >= t0, tx = P.pigeonTex(flap ? (Math.floor((f - t0) / 2) % 2 ? 3 : 2) : peck ? 1 : 0), mat = p.material as THREE.SpriteMaterial; if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      const sz = flap ? 0.44 : k > 4 ? 0.3 : 0.34; p.scale.set((flap ? (ax < 0 ? 1 : -1) : k % 2 ? -1 : 1) * sz, sz, 1); });
    { const u = (f - (BEAT.crashed2 + 4)) / 34; this.feather.visible = u >= 0 && u < 1.3;
      // fix r3 (audit A3 P3 shot 14: the falling feather crossed the 'I' of OIL as a white streak): it drifts down right of the
      // bill, in front of the kiosk's dark interior
      if (this.feather.visible) { this.feather.position.set(O[0] + 0.33 + 0.08 * Math.sin(u * 7), 3.0 - 1.6 * u, O[2] - 1.9 + 0.1 * u); this.feather.scale.setScalar(0.12);
        (this.feather.material as THREE.SpriteMaterial).rotation = 0.8 * Math.sin(u * 7 + 0.5); (this.feather.material as THREE.SpriteMaterial).opacity = Math.min(1, (1.3 - u) * 3); } }
    // ---- a newspaper page tumbles along the kerb on "crashed"; the bin's page skitters 0.4 m in a gust ----
    { const u = (f - (BEAT.crashed2 - 2)) / 40; this.kerbSheet.visible = u >= 0 && u < 1;
      if (this.kerbSheet.visible) { this.kerbSheet.position.set(O[0] - 1.7 + 3.6 * u, 0.2 + 0.32 * Math.abs(Math.sin(u * Math.PI * 3)), O[2] + 0.1 + 0.15 * Math.sin(u * 5));
        this.kerbSheet.rotation.set(-1.0 + 1.1 * Math.sin(u * 15), u * 8, 0.6 * Math.sin(u * 11)); } }
    { const g0 = BEAT.cameOut + 33, u = clamp01((f - g0) / 14), e = 1 - (1 - u) ** 2;
      this.binPage.position.set(O[0] - 0.85 + 0.4 * e, 0.165 + 0.08 * Math.sin(Math.PI * u), O[2] - 3.05 + 0.1 * e); this.binPage.rotation.set(-Math.PI / 2 + 0.25 * Math.sin(Math.PI * u), 0.4 + 1.1 * e, 0.15 * Math.sin(Math.PI * u)); }
    // ---- the clerk moves along the lit shelves; the lace curtain stirs; the awning valance sways (whole cycles) ----
    { const cx = -2.8 + 0.42 * cyc(3, vf, 0.6) + 0.12 * cyc(7, vf, 2.1); this.clerk.position.set(O[0] + cx, 1.28 + 0.02 * Math.abs(cyc(41, vf)), O[2] - 5.927); this.clerk.scale.x = cyc(3, vf, 0.6 + Math.PI / 2) > 0 ? 1 : -1; }
    { const pos = this.curtain.geometry.attributes.position as THREE.BufferAttribute, b0 = this.curtainBase;
      for (let i = 0; i < pos.count; i++) { const x = b0[i * 3], y = b0[i * 3 + 1], t = clamp01(-y / 1.1); pos.setXYZ(i, x + 0.03 * t * cyc(23, vf, x * 3), y, 0.05 * t * t * (0.5 + 0.5 * cyc(17, vf, 0.4 + x)) * gust(vf, 2)); }
      pos.needsUpdate = true; }
    this.valance.rotation.x = 0.1 * gust(vf, 0.8) * (0.6 + 0.4 * cyc(31, vf, 1.1));
    // fix r3: the kiosk's striped valance ripples (+-2 cm, ~0.4 Hz travelling wave), the pegged papers sway in the gusts
    { const pos = this.kioskVal.geometry.attributes.position as THREE.BufferAttribute, b0 = this.kioskValBase, ph = (TAU * 37 * vf) / VOICE_TOTAL;
      for (let i = 0; i < pos.count; i++) { const x = b0[i * 3], y = b0[i * 3 + 1], t = clamp01(-y / 0.16); pos.setXYZ(i, x, y, (0.012 + 0.02 * t) * Math.sin(x * 5.5 - ph) * gust(vf, 0.4)); }
      pos.needsUpdate = true; this.kioskVal.geometry.computeVertexNormals(); }
    this.hangPapers.forEach((m, k) => { m.rotation.set(0.12 * gust(vf, k * 1.3) * (0.5 + 0.5 * cyc(23 + 4 * k, vf, k)), 0.15 * cyc(11 + k, vf, k * 2), 0.05 * cyc(29 + 3 * k, vf, k)); });
    { const t = fract(vf / 150 + 0.23), x = -1.4 + 3.8 * t, y = 0.2 + 0.28 * Math.abs(Math.sin(t * Math.PI * 4)), z = -1.75 + 0.25 * Math.sin(t * 7);
      this.sheet.position.set(O[0] + x, y, O[2] + z); this.sheet.rotation.set(-1.2 + 0.9 * Math.sin(t * 17), t * 9, 0.6 * Math.sin(t * 13)); }
    void ctx; void id;
  }

  /** gulls + steam: every exterior. Gulls circle round a few points laid out in each shot's own view (whole cycles). */
  private poseLife(id: number, set: string, tau: number, ctx: SetCtx) {
    const ext = set === "tanktop" || set === "tankfarm" || set === "street", storm = ctx.light.name === "storm" || set === "street";
    let C = this.gullC.get(id);
    if (!C) {
      const s = SHOTS[id - 1], ref = id === LAST ? 1 : id, fm = id === 1 || id === LAST ? 200 : s.a + 12, cam = camAt(ref, fm);
      C = [[-0.6, 0.75, 38], [0.55, 0.6, 30], [0.1, 0.85, 55], [-0.3, 0.5, 70]].map(([sx, sy, D]) => viewPoint(cam, sx, sy, D));
      this.gullC.set(id, C);
    }
    this.gulls.forEach((g, i) => {
      const on = ext && !storm && i < (set === "tankfarm" ? 7 : 9); g.s.visible = on; if (!on) return;
      const c = C![i % C!.length], n = 5 + (i % 4), ang = (TAU * n * tau) / VOICE_TOTAL + i * 2.1, Rr = 5 + 2.2 * (i % 3);
      g.s.position.set(c.x + Math.cos(ang) * Rr + (i > 3 ? 6 : 0), c.y + 1.2 * Math.sin(ang * 2 + i) + (i > 3 ? 4 : 0), c.z + Math.sin(ang) * Rr * 0.6);
      const fl = fract((tau * (0.09 + 0.02 * (i % 3))) + i * 0.37), glide = Math.sin(ang * 3 + i) > 0.2, fr = glide ? 0 : fl < 0.33 ? 1 : fl < 0.66 ? 0 : 2;
      const mat = g.s.material as THREE.SpriteMaterial, tx = P.gullTex(fr); if (mat.map !== tx) { mat.map = tx; mat.needsUpdate = true; }
      mat.rotation = 0.3 * Math.cos(ang); const sz = 1.5 + 0.3 * (i % 2); g.s.scale.set(sz, sz / 2, 1);
      const L = ctx.light.name; mat.color.set(L === "dawn_gold" || L === "late" ? "#ffe4cc" : "#ffffff");
    });
    const wet = ctx.light.name === "storm";
    for (const p of this.puffs) {
      const on = p.set === set && (!p.ids || p.ids.includes(id)); p.s.visible = on; if (!on) continue;
      const u = fract((p.n * tau) / VOICE_TOTAL + p.ph), gk = gust(tau, p.ph * 4);
      // in the storm the steam is knocked flat and torn sideways by the rain
      p.s.position.copy(p.src).addScaledVector(p.dir ?? WIND, p.drift * u * gk * (wet ? 2.4 : 1)).setY(p.src.y + p.rise * u * (wet ? 0.35 : 1));
      p.s.scale.setScalar(p.size * (0.4 + 1.1 * u)); (p.s.material as THREE.SpriteMaterial).opacity = p.alpha * Math.sin(Math.PI * u) ** 0.8;
    }
  }

  /** pennants stream downwind with a travelling wave (they whip faster and harder in the storm); whole cycles on tau */
  private poseFlags(tau: number, ctx: SetCtx) {
    const st = ctx.light.name === "storm";
    for (const fl of this.flags) {
      if (!(fl.m.parent as THREE.Object3D).visible) continue;
      const pos = fl.m.geometry.attributes.position as THREE.BufferAttribute, b = fl.base, gk = gust(tau, 0.9), hard = st && fl.storm ? 1 : 0;
      const ph = (TAU * (hard ? 238 : 146) * tau) / VOICE_TOTAL, w = b[3 * (pos.count - 1)] || 1, amp = hard ? 0.26 : 0.1 + 0.08 * gk, droop = hard ? 0.05 : (1 - gk) * 0.45;
      for (let i = 0; i < pos.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], t = clamp01(x / w);
        pos.setXYZ(i, x * (1 - 0.05 * t * t), y - droop * t * t * w * 0.5, amp * t * Math.sin(6.5 * t - ph) * w * 0.5 + 0.02 * t * Math.sin(17 * t - ph * 1.7) * w); }
      pos.needsUpdate = true; fl.m.geometry.computeVertexNormals();
      fl.m.rotation.set(0, -Math.atan2(WIND.z, WIND.x) + (hard ? 0.25 : 0.12) * cyc(11, tau, fl.base[0]), 0);
    }
  }

  /** fix r1: 4 puffy noon cumulus far behind the skyline haze, laid out in each noon shot's own first framing at 8-22 %
   *  of the frame height from the top, drifting 0.02 % of the frame width per frame */
  private poseClouds(id: number, f: number, ctx: SetCtx) {
    const on = (id === 2 || id === 4) && ctx.light.name === "noon";
    for (const c of this.skyClouds) c.visible = on;
    if (!on) return;
    const s = SHOTS[id - 1], cam = camAt(id, s.a + 12), D = 1000, fw = 2 * D * Math.tan((cam.fov * Math.PI) / 360) * ASPECT;
    let P0c = this.skyC.get(id);
    if (!P0c) { P0c = (id === 2 ? [[-0.72, 0.82], [0.05, 0.66], [0.78, 0.86], [0.42, 0.6]] : [[-0.78, 0.84], [-0.1, 0.62], [0.55, 0.8], [0.95, 0.66]]).map(([sx, sy]) => viewPoint(cam, sx, sy, D)); this.skyC.set(id, P0c); }
    const pos = V(...cam.pos), rt = new THREE.Vector3().crossVectors(V(...cam.look).sub(pos).normalize(), V(0, 1, 0)).normalize();
    this.skyClouds.forEach((c, i) => { const w = fw * [0.42, 0.34, 0.38, 0.28][i];
      c.position.copy(P0c![i]).addScaledVector(rt, 0.0002 * fw * (f - s.a)); c.scale.set(w, w / 2, 1); (c.material as THREE.SpriteMaterial).color.setScalar(1.04); });
  }
}

// ANIMATOR C helper kit for cast_story2.ts (S12-S20): screen <-> world helpers, the clown / crowd / pigeons placements,
// hand inserts (sleeve + hand on its own lit card, mapped through the LIVE lens so it lands on world points), the call
// bubble (the mum's cosy kitchen, the hero's mind), the phone-signal line. Owner: animator C (story part 2). Uses the
// DESIGN functions (cast_people.ts, cast_crowd.ts, cast_fx.ts) only; nothing here draws a character by hand except the
// insert hands (DESIGN's hand shapes on sleeves).
import type { Eng, Stage, CamInfo } from "./cast";
import type { Pen, P2 } from "./toon";
import { INK, mix, shade, rrect } from "./toon";
import * as PPL from "./cast_people";
import type { Pose, ClownPose, HandKind } from "./cast_people";
import * as CROWD from "./cast_crowd";
import type { CrowdId } from "./cast_crowd";
import * as FX from "./cast_fx";
import type { V3 } from "./plan";

export const TAU = Math.PI * 2;
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
/** 0 -> 1 over [a, b] (smoothstep) */
export const ramp = (t: number, a: number, b: number) => sm((t - a) / (b - a));
/** up over [a, a + i], held, down over [b, b + o] */
export const hold = (t: number, a: number, b: number, i = 8, o = 8) => ramp(t, a, a + i) * (1 - ramp(t, b, b + o));
/** one sine bump over n frames from a */
export const bumpN = (t: number, a: number, n: number) => { const u = (t - a) / n; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
export const up = (p: V3, y: number): V3 => [p[0], y, p[2]];
export const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const dist2 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const headingOf = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
/** a heading rotated `deg` degrees (+ = clockwise seen from above: x toward -z ... used to cheat a 3/4 toward the lens) */
export const turnH = (h: number, deg: number) => h + (deg * Math.PI) / 180;

// ---------------- screen helpers (the live shot camera, picture time f) ----------------
/** screen px (1080 x 1920) + depth of a world point through shot id's lens */
export const toPx = (E: Eng, id: number, f: number, w: V3): [number, number, number] => { const s = E.scr(id, f, w); return [540 + 540 * s[0], 960 + 960 * s[1], s[2]]; };
/** the world point at screen px (sx, sy), depth d along the lens axis */
export const scrW = (E: Eng, id: number, f: number, sx: number, sy: number, d: number): V3 => {
  const B = E.camB(id, f), kx = ((sx - 540) / 540) * d * B.t * 0.5625, ky = -((sy - 960) / 960) * d * B.t;
  return [0, 1, 2].map((i) => B.pos[i] + B.F[i] * d + B.R[i] * kx + B.U[i] * ky) as V3;
};
/** metres per screen px at depth d */
export const mPx = (E: Eng, id: number, f: number, d: number) => (2 * d * E.camB(id, f).t) / 1920;
/** an UNLIT effect card locked to the SCREEN: centre (sx, sy) px, size (wpx, hpx) px, at depth d, turned by rot (rad) */
export const scrFx = (E: Eng, out: Stage, id: number, f: number, key: string, cw: number, ch: number, draw: (p: Pen) => void, sx: number, sy: number, d: number, wpx: number, hpx: number, rot = 0, soft = true) =>
  E.fx(out, key, cw, ch, draw, scrW(E, id, f, sx, sy, d), wpx * mPx(E, id, f, d), hpx * mPx(E, id, f, d), { soft, rot });

// ---------------- figures ----------------
/** a cast_people figure at world p with pose P (the key follows the pose) */
export type FigX = { scale?: number; noBlob?: boolean; blobK?: number; blobSc?: number;
  /** p3: crisp effects drawn on the figure's own card after the figure (cast_vfx.ts); fxKey must change whenever they do */ fx?: (q: Pen) => void; fxKey?: string | number };
export const fig = (E: Eng, out: Stage, cam: CamInfo, key: string, p: V3, P: Pose, draw: (q: Pen, P: Pose) => void, x: FigX = {}) =>
  E.putFig(out, cam, `${key}|${E.fkey(P)}${x.fx ? `|fx${x.fxKey ?? ""}` : ""}`, p, (q) => { draw(q, P); x.fx?.(q); }, x);
/** the card yaw world.ts gives a billboard at p (no explicit yaw) */
export const yawAt = (cam: CamInfo, p: V3) => Math.atan2(cam.pos.x - p[0], cam.pos.z - p[2]);
/** a world point as a design point on the billboard card standing at p (scale sc): hand targets that land on it */
export const onFig = (E: Eng, cam: CamInfo, p: V3, w: V3, sc = 1): P2 => E.onCard(cam, p, yawAt(cam, p), w, sc);
/** THE CLOWN on his unicycle at p (the wheel's contact point) */
export const clownAt = (E: Eng, out: Stage, cam: CamInfo, key: string, p: V3, P: ClownPose, x: { /** p3: one of DESIGN's bits (its pose is merged, its props drawn) */ bit?: PPL.ClownBit;
  /** p3: crisp effects on his card after him (honk rings, "?"); fxKey must change whenever they do */ fx?: (q: Pen, P: ClownPose) => void; fxKey?: string | number } = {}) => {
  const Q: ClownPose = x.bit ? { ...P, ...x.bit.pose, face: { ...(P.face ?? {}), ...(x.bit.pose.face ?? {}) } } : P;
  return E.putFig(out, cam, `s2clown|${key}|${E.fkey(Q)}${x.fx || x.bit ? `|fx${x.fxKey ?? ""}` : ""}`, p, (q) => { PPL.drawClown(q, Q); x.bit?.props(q, PPL.clownAnchors(Q), Q); x.fx?.(q, Q); }, { scale: 1 / PPL.CLOWN_K, blobSc: 1.25 });
};

// ---------------- the background crowd ----------------
export type CrowdWalk = { id: CrowdId; a: V3; b: V3; f0: number; seed?: number; speed?: number; stand?: boolean; f1?: number };
/** an extra walking from a toward b (and on past it) at its natural speed, starting at a on frame f0 (before f0 it is
 *  further back on the same line: always alive, never sliding). stand = a standing extra at a (chatting, listening) */
export const crowd = (E: Eng, out: Stage, cam: CamInfo, w: CrowdWalk, f: number, extra: Partial<Pose> = {}, fx?: { draw: (q: Pen, P: CROWD.CrowdPose) => void; key: string | number }) => {
  const L = Math.max(1e-3, dist2(w.a, w.b)), v = (w.speed ?? CROWD.crowdSpeed(w.id)) / 30, m = w.stand ? 0 : (f - w.f0) * v;
  const d: V3 = [(w.b[0] - w.a[0]) / L, 0, (w.b[2] - w.a[2]) / L], p: V3 = [w.a[0] + d[0] * m, 0, w.a[2] + d[2] * m];
  const h = w.stand ? headingOf(w.a, w.b) : Math.atan2(d[0], d[2]), sc = E.orientSC(cam, p, h);
  const P: CROWD.CrowdPose = { ...CROWD.crowdPose(w.id, f, { s: sc.s, c: sc.c, metres: w.stand ? undefined : m + 17.3 * (w.seed ?? 1), light: E.light2D(cam), seed: w.seed, stand: w.stand }), ...extra };
  E.putFig(out, cam, `s2crowd|${w.id}|${E.fkey(P)}${fx ? `|fx${fx.key}` : ""}`, p, (q) => { CROWD.drawCrowd(q, w.id, P); fx?.draw(q, P); });
  return p;
};
/** the frisbee pair: two extras throwing a disc back and forth (period per throw), the disc flying in a flat arc */
export const frisbeePair = (E: Eng, out: Stage, cam: CamInfo, f: number, A: V3, B: V3, per = 46, ph = 0) => {
  const n = Math.floor((f + ph) / per), t = (f + ph) - n * per, from = n % 2 ? B : A, to = n % 2 ? A : B, light = E.light2D(cam);
  for (const [i, me, other] of [[0, A, B], [1, B, A]] as [number, V3, V3][]) {
    const throwing = (n % 2 ? B : A) === me, h = headingOf(me, other), sc = E.orientSC(cam, me, h);
    const P = CROWD.crowdPose(i ? "chatA" : "frisbee", f, { s: sc.s, c: sc.c, light, seed: 40 + i, stand: true, f0: throwing ? f - t + 10 : f + 999 });
    if (i === 1) { P.mouth = undefined; P.armL = throwing ? { to: "chest", to2: "point", k: clamp(CROWD.frisbeeAt(t, 10), -0.6, 1.2), hand: "open", front: true } : { to: "hang", to2: "out", k: ramp(t, per - 14, per - 4), hand: "open", front: true }; P.armR = { to: "hang" }; P.expr = "brightGrin"; }
    else if (!throwing) { P.armR = { to: "hang", to2: "out", k: ramp(t, per - 14, per - 4), hand: "open", front: true }; P.expr = "brightGrin"; }
    E.putFig(out, cam, `s2fris|${i}|${E.fkey(P)}`, me, (q) => CROWD.drawCrowd(q, i ? "chatA" : "frisbee", P));
  }
  const u = clamp((t - 10) / (per - 22), 0, 1);
  if (t > 10 && t < per - 10) { const p = lerp3(add3(from, [0, 1.15, 0]), add3(to, [0, 1.15, 0]), u); p[1] += 0.55 * Math.sin(Math.PI * u);
    E.fx(out, `s2disc|${E.q((t / 4) % 1, 8)}`, 128, 64, (q) => FX.drawFrisbee(q, [64, 32], 2.6, -8, t / 4), p, 0.3, 0.15, { soft: false }); }
};

/** the crowd kit's pose / draw by id (for extras that need extra acting: the duckers, the stopper) */
export const crowdPoseOf = (id: CrowdId, f: number, o: CROWD.CrowdOpt) => CROWD.crowdPose(id, f, o);
export const drawCrowdId = (p: Pen, id: CrowdId, P: CROWD.CrowdPose) => CROWD.drawCrowd(p, id, P);

// ---------------- pigeons (they flee whoever comes within 1.35 m, then walk back; they peck between) ----------------
export const pigeons = (E: Eng, out: Stage, cam: CamInfo, f: number, homes: [number, number, number][], moversAt: (t: number) => V3[], startle = 0, key = "p") => {
  const vf = E.vf;
  homes.forEach(([hx, hz, face], n) => {
    let amt = startle, ax = face, az = -0.4;
    for (let k = 0; k < 7; k++) for (const m of moversAt(f - 5 * k)) { const d = Math.hypot(m[0] - hx, m[2] - hz), c = Math.max(0, 1 - d / 1.35) * (1 - k / 7.5); if (c > amt) { amt = c; ax = (hx - m[0]) / (d || 1); az = (hz - m[2]) / (d || 1); } }
    const a = sm(amt * 1.5), fly = sm((amt - 0.25) / 0.4), slot = Math.floor((vf + n * 23) / 46), u = (((vf + n * 23) % 46) + 46) % 46 / 46;
    const pk = E.hh(n * 7 + slot, 3) < 0.55 && u > 0.2 && u < 0.8 && Math.sin(u * TAU * 4) > 0.1;
    const hop = !pk && E.hh(n * 5 + slot, 9) > 0.7 ? Math.max(0, Math.sin(Math.PI * clamp((u - 0.3) / 0.2, 0, 1))) : 0;
    const p: V3 = [hx + ax * 1.5 * a + 0.08 * hop * face, 0.02 + 0.05 * hop + 0.7 * fly * Math.sin(Math.PI * Math.min(1, a)), hz + az * 1.5 * a];
    const st = { run: E.q(a > 0.02 || hop > 0 ? ((f + 4000) / 6) % 1 : 0, 24), flap: E.q(Math.max(fly, 0.4 * hop), 10), wing: E.q(((f + 4000) / 4) % 1, 12), peck: a < 0.02 && pk ? 1 : 0, lift: E.q(fly, 8) };
    const mir = a > 0.05 ? ax * E.camR.x + az * E.camR.z > 0 : face > 0;
    E.putFig(out, cam, `s2pig|${key}${n}|${mir ? 1 : 0}|${JSON.stringify(st)}`, p, (q) => FX.drawPigeon(q, st), { scale: 0.2, blobSc: 0.3, noBlob: p[1] > 0.5, mirror: mir });
  });
};
/** a pigeon flight across the frame (a bird already in the air: wings beating) from a to b over [f0, f1] */
export const pigeonFly = (E: Eng, out: Stage, cam: CamInfo, f: number, a: V3, b: V3, f0: number, f1: number, key: string) => {
  if (f < f0 || f > f1) return;
  const u = (f - f0) / (f1 - f0), p = lerp3(a, b, u); p[1] += 0.4 * Math.sin(Math.PI * u);
  const st = { run: 0, flap: 1, wing: E.q(((f + 4000) / 3.2) % 1, 12), peck: 0, lift: 0.6 };
  E.putFig(out, cam, `s2pfly|${key}|${JSON.stringify(st)}`, p, (q) => FX.drawPigeon(q, st), { scale: 0.2, noBlob: true });
};

// ---------------- INSERT cards: hands on sleeves, pegs, pencils (lit, mapped through the live lens) ----------------
export type Ins = { pos: V3; yaw: number; sc: number; map: (w: V3) => P2; u: number };
/** an insert card standing `toward` metres in front of world point `anchor` (toward the lens), scale sc (the anchor at
 *  design (300, 500)); map() turns world points into design points on it so drawings land on them in this frame */
export const insertAt = (E: Eng, cam: CamInfo, anchor: V3, toward: number, sc: number): Ins => {
  const c: V3 = [cam.pos.x, cam.pos.y, cam.pos.z], q = E.toward(anchor, c, toward), pos: V3 = [q[0], q[1] - (975 - 500) * E.SU * sc, q[2]], yaw = yawAt(cam, pos);
  return { pos, yaw, sc, map: (w) => E.onCard(cam, pos, yaw, w, sc), u: (0.0052 / (E.SU * sc)) };
};
export const putInsert = (E: Eng, out: Stage, cam: CamInfo, key: string, I: Ins, draw: (p: Pen) => void) =>
  E.putCard(out, cam, key, I.pos, draw, { scale: I.sc, yaw: I.yaw });
/** a sleeve (band from `from` to the wrist, a cuff at the wrist) + a hand: kind, size z (u = the owner's head unit in
 *  design units of the insert), side (which way the thumb sits), ang (deg) */
export const sleeveHand = (p: Pen, from: P2, wrist: P2, kind: HandKind, u: number, side: number, ang: number, z: number, sleeve: string, cuff: string | null, w = 8.6) => {
  const d = Math.atan2(wrist[1] - from[1], wrist[0] - from[0]), n = Math.hypot(wrist[0] - from[0], wrist[1] - from[1]) || 1, ux = (wrist[0] - from[0]) / n, uy = (wrist[1] - from[1]) / n;
  p.band([from, [wrist[0] - ux * 3 * u, wrist[1] - uy * 3 * u]], sleeve, w * u, 1.5 * u, "round");
  if (cuff) p.band([[wrist[0] - ux * 7 * u, wrist[1] - uy * 7 * u], [wrist[0] - ux * 1.5 * u, wrist[1] - uy * 1.5 * u]], cuff, (w - 0.6) * u, 1.2 * u, "butt");
  return PPL.drawHandShape(p, kind, wrist, u, side, (d * 180) / Math.PI, ang, z);
};
/** the wrist that puts a hand's fingertip on `tip` for a forearm direction dir (deg) (same geometry as drawHand) */
export const wristFor = (kind: HandKind, tip: P2, u: number, side: number, dirDeg: number, z: number): P2 => {
  const Lk: Partial<Record<HandKind, [number, number]>> = { pinch: [3, 16.6], grip: [0, 11], open: [1.3, 20], point: [2.2, 22.4], flat: [0, 18.5], fist: [0, 12] }, [x, y] = Lk[kind] ?? [0, 10];
  const v = u * z, dir = (dirDeg * Math.PI) / 180, ca = Math.cos(dir), sa = Math.sin(dir), ts = -side;
  return [tip[0] - (x * ts * -sa * v + y * ca * v), tip[1] - (x * ts * ca * v + y * sa * v)];
};
/** a pencil from its point `tip` along direction dirDeg (toward the hand), length len (design units) */
export const pencil = (p: Pen, tip: P2, dirDeg: number, len: number, u: number) => {
  const a = (dirDeg * Math.PI) / 180, ex = Math.cos(a), ey = Math.sin(a), at = (d: number): P2 => [tip[0] + ex * d, tip[1] + ey * d];
  p.poly([tip, [at(5 * u)[0] - ey * 1.6 * u, at(5 * u)[1] + ex * 1.6 * u], [at(5 * u)[0] + ey * 1.6 * u, at(5 * u)[1] - ex * 1.6 * u]], "#f1d6a6", 0.7 * u);
  p.dot(tip[0] + ex * 0.8 * u, tip[1] + ey * 0.8 * u, 0.9 * u, "#3a3040");
  p.band([at(5 * u), at(len - 4 * u)], "#f2c230", 3.2 * u, 0.9 * u, "butt");
  p.band([at(len - 4 * u), at(len)], "#e88a9a", 3.2 * u, 0.9 * u, "round");
  p.stroke([at(6 * u), at(len - 5 * u)].map(([x, y]) => [x - ey * 0.8 * u, y + ex * 0.8 * u] as P2), 0.8 * u, "#f8e08a");
};

// ---------------- THE CALL BUBBLE (S15, S20): a round window into the mum's warm kitchen ----------------
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): P2[] => {
  const r = (rot * Math.PI) / 180, o: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); o.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]); }
  return o;
};
export type BubbleSt = { on: number; arr: number; t: number; pop: number; laugh: number };
/** the bubble on a 640 x 640 canvas (centre 320, 312, r 268): the mum on the phone at her kitchen table, a mug of tea;
 *  the hero's MIND (her see-through copy) arrives (arr) at the table beside her and the two chat and laugh. on = the
 *  picture inside comes up, t = frame (talk, steam, the lamp, the cat's tail), pop = the arrival squash, laugh = 0..1 */
export const drawBubble = (p: Pen, st: BubbleSt) => {
  const g = p.g, cx = 320, cy = 312, R = 268 * (1 + 0.05 * st.pop), circ = ell(cx, cy, R, R, 0, 64), t = st.t;
  for (const [x, y, r] of [[560, 560, 26], [604, 612, 15]] as const) p.poly(ell(x, y, r, r, 0, 24), "#fff3d6", 9);
  p.poly(circ, "#ffe6b0", 0);
  p.clip(circ, () => {
    const wall = g.createLinearGradient(0, cy - R, 0, cy + R); wall.addColorStop(0, "#fff2c8"); wall.addColorStop(0.6, "#ffd894"); wall.addColorStop(1, "#f6b46a");
    g.fillStyle = wall; g.fillRect(0, 0, 640, 640);
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? "#fff6dc" : "#ffe1a8"; g.fillRect(16 + i * 64, 318 + j * 46, 60, 42); }
    // the window (a sunny garden, a cross bar, gingham curtains that stir) + a potted plant on the sill
    p.poly(rrect(84, 92, 262, 262, 10), "#9fdcf5", 8);
    p.poly(ell(120, 250, 70, 34, 0, 20), "#7cc46a", 0); p.poly(ell(230, 252, 60, 30, 0, 20), "#6ab85a", 0);
    g.fillStyle = "#fffbe6"; g.beginPath(); g.arc(214, 140, 22, 0, TAU); g.fill();
    p.stroke([[173, 96], [173, 258]], 7); p.stroke([[88, 178], [258, 178]], 7);
    const cs = 4 * Math.sin(t / 23);
    for (const sd of [0, 1]) { const x0 = sd ? 228 : 74, x1 = sd ? 272 : 118; p.poly([[x0, 86], [x1, 86], [(sd ? x1 : x1 - 18) + cs, 258], [(sd ? x0 + 18 : x0) + cs, 258]], "#ff8f6b", 6);
      for (let k = 0; k < 4; k++) p.stroke([[x0 + 4 + cs * k / 4, 112 + k * 36], [x1 - 6 + cs * k / 4, 112 + k * 36]], 4, "#fff3e0"); }
    p.band([[62, 82], [288, 82]], "#b9783e", 12, 3, "round");
    p.poly(rrect(196, 228, 236, 262, 6), "#d8704a", 5); p.poly(ell(216, 220, 26, 16, 0, 16), "#5fae5a", 5);
    // a shelf with jars + a wall clock whose hand ticks round
    p.band([[350, 186], [610, 186]], "#b9783e", 14, 3, "round");
    for (const [x, c2, h2] of [[384, "#e8553f", 50], [432, "#57b98a", 40], [478, "#f2c230", 56]] as const) { p.poly(rrect(x - 18, 178 - h2, x + 18, 178, 7), c2, 6); p.poly(rrect(x - 14, 170 - h2, x + 14, 180 - h2, 3), "#fbf6ec", 5); }
    p.poly(ell(548, 112, 38, 38, 0, 28), "#fbf6ec", 7);
    { const a = TAU * (t / 60) - Math.PI / 2, a2 = TAU * (t / 900) - Math.PI / 2; p.stroke([[548, 112], [548 + 26 * Math.cos(a), 112 + 26 * Math.sin(a)]], 4); p.stroke([[548, 112], [548 + 17 * Math.cos(a2), 112 + 17 * Math.sin(a2)]], 6); p.dot(548, 112, 5, "#e8553f"); }
    // the hanging lamp: a warm cone, swinging a hair
    { const sw = 6 * Math.sin(t / 19), lx = cx + 10 + sw;
      const gl = g.createRadialGradient(lx, 120, 6, lx, 160, 260); gl.addColorStop(0, `rgba(255,246,190,${0.85 * st.on})`); gl.addColorStop(1, "rgba(255,246,190,0)");
      g.fillStyle = gl; g.fillRect(0, 0, 640, 640);
      p.stroke([[cx + 10, 30], [lx, 72]], 5); p.poly([[lx - 44, 114], [lx - 20, 72], [lx + 20, 72], [lx + 44, 114]], "#ff7a59", 7); p.poly(ell(lx, 116, 22, 9, 0, 16), "#fff6c0", 5); }
    // the cat on the counter (right), its tail swishing
    { const tx = 590, ty = 318, sw = Math.sin(t / 9);
      p.stroke([[tx + 6, ty - 8], [tx + 26, ty - 30 - 6 * sw], [tx + 22 + 14 * sw, ty - 58]], 13, INK); p.stroke([[tx + 6, ty - 8], [tx + 26, ty - 30 - 6 * sw], [tx + 22 + 14 * sw, ty - 58]], 7, "#f0a050");
      p.poly(ell(tx - 6, ty - 26, 34, 28, 0, 24), "#f0a050", 6); p.poly(ell(tx - 28, ty - 62, 22, 20, 0, 20), "#f0a050", 6);
      for (const sd of [-1, 1]) p.poly([[tx - 28 + sd * 8, ty - 78], [tx - 28 + sd * 20, ty - 94], [tx - 28 + sd * 20, ty - 72]], "#f0a050", 5);
      const bl = ((Math.floor(t) % 67) < 3) ? 1 : 0; for (const sd of [-1, 1]) { if (bl) p.stroke([[tx - 28 + sd * 9 - 3, ty - 63], [tx - 28 + sd * 9 + 3, ty - 63]], 3); else p.dot(tx - 28 + sd * 8, ty - 63, 3.2, INK); }
      p.stroke([[tx - 40, ty - 40], [tx - 20, ty - 44]], 4, "#c87a30"); }
    // the two at the table (behind it): the mum on the phone (left), the hero's MIND beside her (right)
    const at = (x: number, footY: number, sc: number, fn: () => void) => { g.save(); g.translate(x - 300 * sc, footY - 975 * sc); g.scale(sc, sc); fn(); g.restore(); p.rot = null; };
    const mTalk = st.arr > 0.6 ? PPL.talkAt(t % 90, 0, 40, 3) : undefined, hTalk = st.arr > 0.6 ? PPL.talkAt((t + 45) % 90, 0, 40, 9) : undefined, lg = st.laugh > 0.5;
    const mumP: Pose = { s: 0.32, c: 0.95, go: 0, expr: lg ? "laughBig" : st.arr > 0.5 ? "brightGrin" : "bright", mouth: lg ? "laugh" : mTalk, look: st.arr > 0.5 ? 0.9 : 0.2, lookY: 0.1,
      headTilt: 4 * Math.sin(t / 11) + (lg ? -6 : 0), nod: 0.6 * Math.max(0, Math.sin(t / 5)) * (mTalk ? 0 : 1), blink: (Math.floor(t) % 71) < 3 ? 1 : 0, light: -2.2,
      armL: PPL.phoneArm("#f4f6fb"), armR: { to: "belly", to2: "talk", k: 0.5 + 0.4 * Math.sin(t / 13), hand: "open", ang: 30 } };
    at(214, 560, 0.62, () => PPL.drawMum(p, mumP));
    if (st.arr > 0.02) { const a = sm(st.arr / 0.5), pop = 1 + 0.16 * Math.sin(Math.PI * Math.min(1, st.arr / 0.7)) * (1 - st.arr);
      const mindP: Pose = { s: -0.3, c: 0.95, go: 0, expr: lg ? "laughBig" : "brightGrin", mouth: lg ? "laugh" : hTalk, look: -0.9, lookY: 0.05, headTilt: -4 + 3 * Math.sin(t / 9) + (lg ? 7 : 0),
        light: -2.2, blink: (Math.floor(t + 30) % 83) < 3 ? 1 : 0, armR: { to: "hang", to2: "talk", k: 0.6 + 0.35 * Math.sin(t / 6), hand: "open", ang: -40 }, armL: PPL.phoneArm(PPL.C.phoneYellow), nod: lg ? 1.2 * Math.abs(Math.sin(t / 3)) : 0 };
      at(440, 560 + 160 * (1 - a), 0.6 * pop, () => PPL.drawMind(p, mindP, 0.92)); }
    // the table: a wooden top, a red gingham cloth, two mugs with steam, a plate of biscuits
    p.poly(rrect(10, 470, 630, 700, 16), "#c9743a", 9);
    p.poly([[56, 470], [584, 470], [618, 560], [24, 560]], "#fff6e6", 7);
    p.clip([[56, 470], [584, 470], [618, 560], [24, 560]], () => { g.globalAlpha = 0.8; for (let i = -2; i < 15; i++) { g.fillStyle = "#f0604d"; g.fillRect(30 + i * 44, 470, 22, 100); } g.globalAlpha = 0.35; for (let j = 0; j < 3; j++) { g.fillStyle = "#f0604d"; g.fillRect(20, 478 + j * 30, 620, 15); } g.globalAlpha = 1; });
    p.poly([[56, 470], [584, 470], [618, 560], [24, 560]], null, 7);
    const mug = (x: number, y: number, col: string, sd: number) => { p.arc(x + sd * 26, y - 22, 13, 15, -90, 90, 7);
      p.poly(rrect(x - 24, y - 46, x + 24, y, 8), col, 7); p.poly(ell(x, y - 46, 24, 7, 0, 20), "#6a3d1e", 5);
      for (let k = 0; k < 2; k++) { const ph = t / 13 + k * 0.5 + x, pts: P2[] = []; for (let i = 0; i <= 8; i++) pts.push([x - 9 + k * 18 + 6 * Math.sin(ph * 2 + i * 0.9), y - 56 - i * 8]); g.globalAlpha = 0.75; p.stroke(pts, 5, "#ffffff"); g.globalAlpha = 1; } };
    mug(250, 520, "#57b98a", 1); mug(408, 524, "#f2c230", -1);
    p.poly(ell(330, 532, 46, 14, 0, 24), "#fbf6ec", 6); for (const [dx, dy] of [[-18, -6], [6, -9], [22, -3], [-4, -1]] as const) p.poly(ell(330 + dx, 530 + dy, 13, 8, 0, 14), "#e9b469", 4);
    if (st.on < 0.99) { g.fillStyle = `rgba(255,236,196,${0.6 * (1 - st.on)})`; g.fillRect(0, 0, 640, 640); }
    const rim = g.createRadialGradient(cx, cy, R * 0.8, cx, cy, R); rim.addColorStop(0, "rgba(255,255,255,0)"); rim.addColorStop(1, "rgba(255,244,200,0.3)"); g.fillStyle = rim; g.fillRect(0, 0, 640, 640);
  });
  g.lineWidth = 20; g.strokeStyle = "#fff6dc"; g.beginPath(); g.arc(cx, cy, R - 9, 0, TAU); g.stroke();
  g.lineWidth = 11; g.strokeStyle = INK; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.lineCap = "round"; g.lineWidth = 9; g.strokeStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(cx, cy, R - 30, (200 * Math.PI) / 180, (238 * Math.PI) / 180); g.stroke();
  g.beginPath(); g.arc(cx, cy, R - 30, (246 * Math.PI) / 180, (252 * Math.PI) / 180); g.stroke();
};
/** the warm glow round the bubble (an ADDITIVE card, 256 x 256) */
export const drawHalo = (p: Pen, k: number) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 30, 128, 128, 127);
  gr.addColorStop(0, `rgba(255,214,140,${0.34 * k})`); gr.addColorStop(0.6, `rgba(255,190,110,${0.26 * k})`); gr.addColorStop(1, "rgba(255,180,90,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
/** the phone-signal line: a wavy dotted line along the canvas (w x h), drawn on by k, the wave travelling by ph */
export const drawSignal = (p: Pen, w: number, h: number, k: number, ph: number, col: string) => {
  const g = p.g, amp = h * 0.3, n = 40, pts: P2[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; if (u > k) break; const e = Math.sin(Math.PI * u) ** 0.6; pts.push([14 + (w - 28) * u, h / 2 + amp * e * Math.sin(TAU * (u * 4.2 - ph))]); }
  if (pts.length < 2) return;
  g.setLineDash([]); p.stroke(pts, 17, INK); p.stroke(pts, 9, "#eafffb");
  g.setLineDash([15, 11]); g.lineDashOffset = -ph * 52; p.stroke(pts, 9, col); g.setLineDash([]);
};
/** where the signal line is at fraction u (canvas px) */
export const signalAt = (w: number, h: number, u: number, ph: number): P2 => { const e = Math.sin(Math.PI * u) ** 0.6; return [14 + (w - 28) * u, h / 2 + h * 0.3 * e * Math.sin(TAU * (u * 4.2 - ph))]; };
/** a few speed / motion ticks (canvas 256 x 128): k 0..1 */
export const drawTicks = (p: Pen, k: number, col = "#ffffff") => {
  const g = p.g; g.save(); g.globalAlpha = Math.sin(Math.PI * clamp(k, 0, 1)) ** 0.7;
  for (let i = 0; i < 3; i++) { const x = 40 + i * 70 + 20 * k, y = 40 + 14 * Math.sin(i * 2.1), pts: P2[] = [[x, y], [x + 14, y + 22 + 10 * k], [x + 6, y + 46 + 20 * k]];
    p.stroke(pts, 10, INK); p.stroke(pts, 5, col); }
  g.restore();
};
/** honk arcs (canvas 256 x 256): three arcs fanning out to the right, k 0..1 */
export const drawHonk = (p: Pen, k: number) => {
  const g = p.g; g.save(); g.globalAlpha = Math.sin(Math.PI * clamp(k, 0, 1)) ** 0.5;
  for (let i = 0; i < 3; i++) { const r = 40 + i * 30 + 36 * k, pts: P2[] = []; for (let j = 0; j <= 10; j++) { const a = (-40 + 8 * j) * Math.PI / 180; pts.push([60 + r * Math.cos(a), 128 + r * Math.sin(a)]); }
    p.stroke(pts, 14, INK); p.stroke(pts, 7, "#fff2a8"); }
  g.restore();
};
void mix; void shade; void FX;

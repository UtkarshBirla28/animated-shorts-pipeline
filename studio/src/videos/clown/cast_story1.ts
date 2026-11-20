// STAGE MODULE (REBUILD v2), owner ANIMATOR B: S1 (the phone guy + the circling clown), S2-S5 (the office: Hyman, the door,
// the student, the unicycle, the clown suit), S6 (the high crane: the clown's lap, crowds), S7-S11 (the study corner: the
// pair walks in, the interviewer, the friend, the headphones dude, the phone guy with the clown riding by behind him).
// cast.ts calls stageStory1(E, out, cam, id, f, R): id = the shot (beats.ts SID.*), f = its picture time (= the film frame
// here: S1-S11 are never remapped). Every action is keyed to a BEAT word / a character line's words (cast_story1_marks.ts),
// never to a literal frame. The characters are cast_people.ts / cast_crowd.ts / cast_fx.ts (owner DESIGN, import only).
import type { Eng, Stage, CamInfo, StageInfo } from "./cast";
import * as PPL from "./cast_people";
import type { Pose, ClownPose, Arm } from "./cast_people";
import * as CROWD from "./cast_crowd";
import type { CrowdId } from "./cast_crowd";
import * as FX from "./cast_fx";
import * as VFX from "./cast_vfx";
import type { Pen, Expr, MouthK, P2 } from "./toon";
import { rig, SKIN } from "./toon";
import * as FIT from "./cast_fits";
import { SQ, STUDY, OFFICE, STORY, WHEEL_R, laneAt, laneLen, lapPos, lapHeading, type V3 } from "./plan";
import { SID } from "./beats";
import {
  TAU, clamp, c01, sm, lerp, lerp3, add3, sub3, mul3, flat, headTo, dirOf, prog, SH,
  s1Guy, s1Clown, s1Metres, s1Stop, T1, T2, T3, T4, T5, S2P0, s2Hyman, s4From, s4To, s4Student, s4Hyman, s3Hyman, HY5, s6Clown, s6Ang, S6C, S6_WA, S6_GAPE, S6_WB, lapAng, T6,
  T7, IV7, B7, T8, T9, T10, T11, s11Clown, TEAM_B, lineWords,
} from "./cast_story1_marks";

type Draw = (p: Pen, P: Pose) => void;
const C = PPL.C;
const isBack = (c: number) => c < -0.35;
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// ================================================================== shared staging helpers
/** a lit figure card (cast_people draw function) at pos; the key carries the pose */
const fig = (E: Eng, out: Stage, cam: CamInfo, key: string, pos: V3, P: Pose, draw: Draw, x: { noBlob?: boolean; blobK?: number; scale?: number } = {}) => {
  const Q: Pose = { light: E.light2D(cam), ...P };
  E.putFig(out, cam, `${key}|${E.fkey(Q)}`, pos, (pen) => draw(pen, Q), x);
  return Q;
};
/** p3 (D9): EFFECTS on a ghost card at a figure's place (bright, unlit, soft: CHAR.md "B"), drawn in the figure's card
 *  units; the key changes with the frame. sc = the figure's putFig scale (the clown: 1 / CLOWN_K) */
const ghost = (E: Eng, out: Stage, cam: CamInfo, key: string, f: number, pos: V3, draw: (p: Pen) => void, sc = 1) => E.putGhost(out, cam, `${key}|${f}`, pos, draw, sc);
const within = (f: number, a: number, b: number) => f >= a && f < b;
/** the card yaw world.ts gives a card at p (a billboard toward the lens) */
const yawAt = (cam: CamInfo, p: V3) => Math.atan2(cam.pos.x - p[0], cam.pos.z - p[2]);
/** THE TALK of a character line (by script line name): a viseme cycle inside each spoken word, closed between words */
const say = (line: string, f: number, seed: number): MouthK | undefined => {
  const ws = lineWords(line);
  for (let i = 0; i < ws.length; i++) { const w = ws[i]; if (f >= w.f - 1 && f < w.fe + 1) return PPL.talkAt(f, w.f - 1, w.fe + 1, seed * 7 + i) ?? "vM"; }
  return ws.length && f > ws[0].f && f < ws[ws.length - 1].fe ? "vM" : undefined;
};
/** p4: THE TALK THROUGH A GRIN (a delighted / proud speaker keeps the smile between syllables): the closed and puckered
 *  visemes become smiling ones. big = the biggest grin (only open D "laugh" and toothy "grin" shapes) */
const sayGrin = (line: string, f: number, seed: number, big = false): MouthK | undefined => {
  const m = say(line, f, seed); if (!m) return m;
  if (big) return m === "vA" || m === "vO" ? "laugh" : "grin";
  return m === "vM" ? "smileWide" : m === "vU" || m === "vO" ? "vE" : m;
};
/** p4: a sequence of EYE DARTS (each move takes 2 f): keys [frame, look]; before the first key 0 */
const darts = (f: number, keys: [number, number][]) => {
  let i = -1; while (i + 1 < keys.length && keys[i + 1][0] <= f) i++;
  if (i < 0) return 0; const a = i > 0 ? keys[i - 1][1] : 0; return lerp(a, keys[i][1], sm((f - keys[i][0]) / 2));
};
/** a head accent on each spoken word's onset (talkers nod into their words) */
const accent = (line: string, f: number, amt = 0.7) => lineWords(line).reduce((s, w) => s + amt * PPL.bump(f, w.f - 2, 3, 7), 0);
/** is the line being spoken now (from its first word to its last) */
const inLine = (line: string, f: number, pad = 0) => { const ws = lineWords(line); return ws.length > 0 && f >= ws[0].f - pad && f <= ws[ws.length - 1].fe + pad; };
/** eyes: a gaze track (lookAt) + darts + seeded blinks + the face track's half-blink */
const eyes = (f: number, seed: number, keys: [number, number, number][], lid = 0, dart = 0.22) => {
  const g = PPL.lookAt(f, keys), d = PPL.dartAt(f, seed, dart);
  return { look: g.look + d.look, lookY: g.lookY + d.lookY, head: g.head, blink: Math.max(PPL.blinkAt(f, seed), g.blink, lid) };
};
/** an FK arm pose (degrees: 0 down, 90 out to its own side, 180 up; negative = across) */
type FK = [number, number];
const fkBlend = (a: FK, b: FK, k: number): FK => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
/** a GESTURING free hand on FK arcs: a new pose every `per` frames from the list, the recipe (anticipation, overshoot,
 *  settle) between them; `hold` (0..1) blends the whole thing toward a fixed pose (a laugh, a rest) by angle */
const gestFK = (f: number, seed: number, poses: FK[], per: number, hand: PPL.HandKind = "open", hs = 1.25, hold?: { to: FK; k: number }): Arm => {
  const x = f + PPL.hash(seed, 4) * per, n = Math.floor(x / per), t = x - n * per, L = poses.length, pick = (k: number) => poses[((k % L) + L) % L];
  let a = fkBlend(pick(n - 1), pick(n), PPL.gesture(t, 6, { ant: 4, move: 6, over: 0.14, settle: 8 }));
  if (hold && hold.k > 0) a = fkBlend(a, hold.to, clamp(hold.k, -0.2, 1.2));
  return { fk: a, fkK: 1, hand, hs, ang: 25 + 30 * Math.sin(TAU * f / 41 + seed) };
};

// ---------------- the clown ----------------
type ClownAct = Partial<ClownPose> & { p: V3; heading: number; metres: number };
/** THE CLOWN at p riding `heading` (the wheel turns with `metres`); the figure's LEFT hand holds the horn: pass arms
 *  through clownArms() so they swap with the view. Returns the view (s, c) */
const clownAt = (E: Eng, out: Stage, cam: CamInfo, key: string, A: ClownAct, extra?: { k: string; draw: (p: Pen, P: ClownPose) => void }) => {
  const { p, heading, metres, ...rest } = A;
  const o = E.orientSC(cam, p, heading);
  const P: ClownPose = { s: o.s, c: o.c, spin: metres / WHEEL_R, wheelR: WHEEL_R, light: E.light2D(cam), expr: "brightGrin", face: { blush: 0.6 }, ...rest };
  E.putFig(out, cam, `clown|${key}${extra ? extra.k : ""}|${E.fkey(P)}`, p, (pen) => { PPL.drawClown(pen, P); if (extra) extra.draw(pen, P); }, { scale: 1 / PPL.CLOWN_K, blobSc: 1.25 });
  return { ...o, P };
};
/** p3 (D9): HONK RINGS, the clown's motif, for the honks at these frames: out of his horn's bell, on a ghost card */
const honkRings = (E: Eng, out: Stage, cam: CamInfo, key: string, f: number, p: V3, P: ClownPose, honks: number[]) => {
  const on = honks.filter((h) => within(f, h, h + 21)); if (!on.length) return;
  const A = PPL.clownAnchors(P), horn = A.horn; if (!horn) return;
  ghost(E, out, cam, `honk|${key}`, f, p, (pen) => { for (const h of on) VFX.honkRings(pen, f, h, horn, { u: A.u, dir: A.hornDir ?? -45 }); }, 1 / PPL.CLOWN_K);
};
/** the clown doing one of DESIGN's BITS (cast_people.ts clownBit): its pose merged over the ride, its props (balls, hat,
 *  hankies...) drawn on the same card after him. bit = null: the plain clown */
const clownBitAt = (E: Eng, out: Stage, cam: CamInfo, key: string, A: ClownAct, bit: PPL.ClownBit | null, f: number) => {
  if (!bit) return clownAt(E, out, cam, key, A);
  const { face, roll, stretch, ...bp } = bit.pose;
  const B: ClownAct = { ...A, ...bp, roll: (A.roll ?? 0) + (roll ?? 0), stretch: (A.stretch ?? 1) * (stretch ?? 1), face: { blush: 0.6, ...(A.face ?? {}), ...(face ?? {}) } };
  return clownAt(E, out, cam, key, B, { k: `bit${f}`, draw: (pen, P) => bit.props(pen, PPL.clownAnchors(P), P) });
};
/** THE LITTLE BELL (a local helper until DESIGN has a bell prop: CHAR.md "Requests from animators"): where drawClown puts the
 *  hand of an FK arm (fkK = 1) on screen side `side`, in the clown CARD's design units (its rider rig + the card transform,
 *  replicated from cast_people.ts drawClown), so a bell can be drawn in that fist inside the same card */
const UMt = 1 / 0.00216;
const clownHandFK = (P: ClownPose, side: -1 | 1, fk: [number, number], fkK = 1): P2 => {
  const s = P.s ?? 0, c = P.c ?? 1, back = P.view ? P.view === "back" : c < -0.35;
  const facing = P.facing ?? (back ? 0 : Math.abs(s) > 0.28 ? (Math.sign(s) as -1 | 1) : 0);
  const R = rig(FIT.CLOWN, { view: back ? "back" : "front", facing, mode: "stand", tilt: P.tilt ?? 0, headTilt: P.headTilt ?? 0, nod: P.nod ?? 0, breath: P.breath ?? 0, seed: P.seed ?? 1 });
  const La = 0.46 * R.HH * 1.04, Sb = R.sh(side), rd = Math.PI / 180, d = (x: number): P2 => [side * Math.sin(x * rd), Math.cos(x * rd)];
  // the IK pose the FK blends from (the arm's default "hang" target), then the blend BY ANGLE, as cast_people solveArm does
  const unfin = (q: P2): P2 => { const a = -R.A * rd, cs = Math.cos(a), sn = Math.sin(a), x = q[0] - 300, y = q[1] - R.hipY; return [300 + x * cs - y * sn, R.hipY + x * sn + y * cs]; };
  const S = R.fin(Sb), hT = R.fin([R.tcx + side * (1.1 * R.T.a + 6 * R.u), Sb[1] + 0.9 * La]);
  let dx = hT[0] - S[0], dy = hT[1] - S[1], dd = Math.hypot(dx, dy) || 1e-3; const mx = 0.995 * 2 * La; if (dd > mx) { dx *= mx / dd; dy *= mx / dd; dd = mx; }
  const kk = dd / 2, hh = Math.sqrt(Math.max(0, La * La - kk * kk)), ux = dx / dd, uy = dy / dd; let nx = -uy, ny = ux; if (nx * side * 0.45 + ny < 0) { nx = -nx; ny = -ny; }
  const eb = unfin([S[0] + ux * kk + nx * hh, S[1] + uy * kk + ny * hh]), hb = unfin([S[0] + dx, S[1] + dy]);
  const normA = (a: number) => ((((a + 90) % 360) + 360) % 360) - 90, angOf = (a: P2, b: P2) => normA(Math.atan2(side * (b[0] - a[0]), b[1] - a[1]) / rd);
  const a1 = lerp(angOf(Sb, eb), fk[0], fkK), a2 = lerp(angOf(eb, hb), fk[1], fkK);
  const Ed: P2 = [Sb[0] + La * d(a1)[0], Sb[1] + La * d(a1)[1]], h = R.fin([Ed[0] + La * d(a2)[0], Ed[1] + La * d(a2)[1]]);
  const x = h[0] + -0.03 * s * UMt, y = h[1] + 975 - 0.93 * UMt - R.hipY;
  const sq = (P.view ? 1 : 1 - 0.32 * Math.exp(-(((c + 0.35) / 0.08) ** 2))) * (P.sq ?? 1), st = P.stretch ?? 1, r = ((P.roll ?? 0) * Math.PI) / 180;
  const vx = ((x - 300) * sq) / Math.sqrt(st), vy = (y - 975) * st - (P.hop ?? 0) * UMt;
  return [300 + PPL.CLOWN_K * (vx * Math.cos(r) - vy * Math.sin(r)), 975 + PPL.CLOWN_K * (vx * Math.sin(r) + vy * Math.cos(r))];
};
/** a brass hand bell hanging from a fist at h (card units), swung by `swing` degrees, the clapper `ding` (0..1) */
const drawBell = (p: Pen, h: P2, swing: number, ding: number) => {
  // a cartoon-big school bell: ~0.2 m dome, ~0.3 m with the handle
  const k = 343 * 0.3 / 100, g = p.g; g.save(); g.translate(h[0], h[1]); g.rotate((swing * Math.PI) / 180);
  p.band([[0, -6 * k], [0, 26 * k]], "#8a5a2e", 13 * k, 3 * k, "round");                                  // the wooden handle
  const dome: P2[] = [[-9 * k, 30 * k], [-14 * k, 52 * k], [-26 * k, 78 * k], [26 * k, 78 * k], [14 * k, 52 * k], [9 * k, 30 * k]];
  p.poly(dome, "#f2c240", 4 * k);                                                                          // the brass dome
  p.stroke([[-6 * k, 40 * k], [-13 * k, 66 * k]], 5 * k, "#fff2b0");                                     // a shine
  p.poly([[-28 * k, 76 * k], [28 * k, 76 * k], [28 * k, 83 * k], [-28 * k, 83 * k]], "#d9a62a", 4 * k);  // the lip
  p.dot(10 * k * Math.sin(ding * Math.PI * 2), 88 * k, 7 * k, "#7a5a24");                                // the clapper
  g.restore();
  if (ding > 0.3) for (const sd of [-1, 1]) { g.save(); g.globalAlpha = 0.85 * ding; p.arc(h[0] + sd * 40 * k, h[1] + 60 * k, 18 * k, 26 * k, sd > 0 ? -60 : 120, sd > 0 ? 60 : 240, 5 * k, "#fff6c8"); g.restore(); }
};
/** the clown's screen arms from his RIGHT (free) and LEFT (horn) arms for the view */
const clownArms = (c: number, right: Arm, left: Arm) => PPL.bodyArms(isBack(c), right, left);
/** the horn arm at rest (held out, a little bob) unless a honk is on */
const hornArm = (f: number, honks: number[], rest: PPL.ArmTo = "show"): { arm: Arm; hatLag: number; ruff: number } => {
  // the honk whose anticipation has begun; a previous one still squeezing keeps the arm until its bulb is released
  let i = -1;
  for (let k = 0; k < honks.length; k++) if (f >= honks[k] - 5) i = k;
  if (i > 0 && f < honks[i] && f - honks[i - 1] < 6) i -= 1;
  if (i >= 0 && f < honks[i] + 14) { const b = PPL.clownHonk(f, honks[i], rest); return { arm: b.arm, hatLag: b.hatLag, ruff: b.ruff }; }
  return { arm: { to: rest, dy: -2 * Math.sin(TAU * f / 23), hand: "grip", prop: { k: "horn", squeeze: 0 } }, hatLag: 0, ruff: 0 };
};
/** the lean INTO a circle as the screen sees it (deg, + = the top to screen right) */
const leanTo = (E: Eng, p: V3, centre: V3, v: number, r: number) => {
  const d = sub3(centre, p), n = Math.hypot(d[0], d[2]) || 1;
  return PPL.circleLean(v, r) * ((d[0] * E.camR.x + d[2] * E.camR.z) / n);
};
/** the lean into ANY curve from the path itself (speed x turn rate), as the screen sees it (deg) */
const leanTurn = (E: Eng, path: (t: number) => V3, f: number) => {
  const a = path(f - 1), b = path(f), c = path(f + 1), h0 = headTo(a, b), h1 = headTo(b, c), v = (flat(a, b) + flat(b, c)) * 15;
  const rate = wrapA(h1 - h0) * 30, acc = v * Math.abs(rate), deg = clamp((Math.atan(acc / 9.81) * 180) / Math.PI, 0, 18), h = (h0 + h1) / 2 + (Math.abs(h1 - h0) > Math.PI ? Math.PI : 0);
  const n: V3 = [Math.sign(rate) * Math.cos(h), 0, -Math.sign(rate) * Math.sin(h)];
  return deg * (n[0] * E.camR.x + n[2] * E.camR.z);
};

// ---------------- the crowd + pigeons + frisbee ----------------
/** a background extra: walks the polyline `pts` from frame t0 at its natural speed (or `speed` m/s), or stands at pts[0]
 *  (stand: true, facing `heading`); gone before / after its route (route ends sit off frame) */
type Ex = { id: CrowdId; pts: V3[]; t0: number; seed?: number; speed?: number; stand?: boolean; heading?: number; f0?: number; tag?: string };
const extra = (E: Eng, out: Stage, cam: CamInfo, f: number, x: Ex) => {
  let p: V3, h: number, metres: number | undefined;
  if (x.stand) { p = x.pts[0]; h = x.heading ?? 0; metres = undefined; }
  else {
    const v = (x.speed ?? CROWD.crowdSpeed(x.id)) / 30, L = laneLen(x.pts), s = (f - x.t0) * v;
    if (s < 0 || s > L) return;
    const q = laneAt(x.pts, s); p = q.p; h = q.heading; metres = s;
  }
  const o = E.orientSC(cam, p, h);
  const P = CROWD.crowdPose(x.id, f, { s: o.s, c: o.c, metres, light: E.light2D(cam), seed: x.seed, stand: x.stand, f0: x.f0 });
  E.putFig(out, cam, `crowd|${x.id}|${x.tag ?? ""}|${E.fkey(P)}`, p, (pen) => CROWD.drawCrowd(pen, x.id, P));
};
const where = (x: Ex, f: number): V3 | null => {
  if (x.stand) return x.pts[0];
  const v = (x.speed ?? CROWD.crowdSpeed(x.id)) / 30, L = laneLen(x.pts), s = (f - x.t0) * v;
  return s < 0 || s > L ? null : laneAt(x.pts, s).p;
};
/** the cast's pigeons: each pecks at home, flushes from whoever comes within 1.4 m (runs, flaps up and away), and
 *  settles back when they have passed. homes = [x, z, facing (+1 = right)] */
type Home = [number, number, number];
const pigeons = (E: Eng, out: Stage, cam: CamInfo, f: number, tag: string, homes: Home[], movers: (t: number) => V3[]) => {
  homes.forEach(([hx, hz, face], n) => {
    let amt = 0, ax = face, az = -0.4;
    for (let k = 0; k < 8; k++) for (const m of movers(f - 5 * k)) {
      const d = Math.hypot(m[0] - hx, m[2] - hz), cc = Math.max(0, 1 - d / 1.4) * (1 - k / 8.5);
      if (cc > amt) { amt = cc; ax = (hx - m[0]) / (d || 1); az = (hz - m[2]) / (d || 1); }
    }
    const a = sm(amt * 1.5), fly = sm((amt - 0.22) / 0.4);
    const slot = Math.floor((f + n * 23) / 46), u = (((f + n * 23) % 46) + 46) % 46 / 46, pk = E.hh(n * 7 + slot, 3) < 0.55 && u > 0.2 && u < 0.8 && Math.sin(u * TAU * 4) > 0.1;
    const p: V3 = [hx + ax * 1.7 * a, 0.02 + 0.9 * fly * Math.sin(Math.PI * Math.min(1, a)), hz + az * 1.7 * a];
    const st = { run: E.q((a > 0.02 ? (f + 4000) / 6 : 0) % 1, 24), flap: E.q(fly, 10), wing: E.q(((f + 4000) / 4) % 1, 12), peck: a < 0.02 && pk ? 1 : 0, lift: E.q(fly, 8) };
    E.putFig(out, cam, `pigeon|${tag}${n}|${JSON.stringify(st)}`, p, (pen) => FX.drawPigeon(pen, st),
      { scale: 0.2, mirror: a > 0.05 ? ax * E.camR.x + az * E.camR.z > 0 : face > 0, blobSc: 0.3, noBlob: p[1] > 0.4 } as never);
  });
};
/** a FRISBEE pair: A and B toss the disc back and forth (a throw every `per` frames from t0, alternating; the disc flies
 *  `fly` frames on an arc); the catcher's hand goes up to meet it */
const frisbee = (E: Eng, out: Stage, cam: CamInfo, f: number, tag: string, A: V3, B: V3, t0: number, per = 50, fly = 26, idA: CrowdId = "frisbee", idB: CrowdId = "runner") => {
  const k = Math.floor((f - t0) / per), throwOf = (who: 0 | 1) => { let kk = k; if (((kk % 2) + 2) % 2 !== who) kk -= 1; return t0 + kk * per; };
  const people: [V3, V3, CrowdId, 0 | 1][] = [[A, B, idA, 0], [B, A, idB, 1]];
  for (const [me, other, id, who] of people) {
    const myThrow = throwOf(who), next = myThrow + 2 * per, myF0 = f - myThrow > 26 ? next : myThrow, theirThrow = throwOf(who ? 0 : 1), arrive = theirThrow + fly;
    const o = E.orientSC(cam, me, headTo(me, other));
    const P = CROWD.crowdPose(id, f, { s: o.s, c: o.c, light: E.light2D(cam), stand: true, f0: myF0, seed: 300 + who * 11 });
    const th = CROWD.frisbeeAt(f, myF0), catchK = PPL.bump(f, arrive - 9, 8, 14);
    if (Math.abs(th) > 0.01) P.armR = { to: "chest", to2: "point", k: clamp(th, -0.6, 1.2), dx: -12 * Math.min(0, th), hand: th < 0.6 ? "grip" : "open", front: true };
    else if (catchK > 0.01) P.armR = { to: "chest", to2: "up", k: catchK, hand: "open", hs: 1.3, front: true };
    P.expr = "brightGrin"; P.go = 0;
    E.putFig(out, cam, `fris|${tag}${who}|${E.fkey(P)}`, me, (pen) => CROWD.drawCrowd(pen, id, P));
  }
  // the disc in flight
  for (const who of [0, 1] as const) {
    const t = throwOf(who), u = (f - t) / fly; if (u < 0 || u > 1) continue;
    const a = who ? B : A, b = who ? A : B, p = lerp3(add3(a, [0, 1.15, 0]), add3(b, [0, 1.35, 0]), u); p[1] += 0.9 * Math.sin(Math.PI * u);
    const spin = (f * 0.23) % 1, tilt = Math.round(-12 + 24 * u);
    E.fx(out, `fx|disc|${E.q(spin, 8)}|${tilt}`, 64, 64, (pp) => FX.drawFrisbee(pp, [32, 32], 1.6, tilt, spin, "#ff5a3a", 1), p, 0.3, 0.3);
  }
};
/** the study team's second member at the table: writes on her clipboard, looks up now and then, a nod */
const teamB = (E: Eng, out: Stage, cam: CamInfo, f: number, look: V3) => {
  const L = PPL.holdLife(f, 44, 0.8), up = PPL.bump(((f % 150) + 150) % 150, 70, 8, 40), g = E.gaze([TEAM_B[0], 1.4, TEAM_B[2]], look);
  const o = E.orientSC(cam, TEAM_B, headTo(TEAM_B, STUDY.stop));
  fig(E, out, cam, "teamB", TEAM_B, { ...L, s: o.s, c: o.c, expr: up > 0.5 ? "bright" : "focusB", look: up > 0.5 ? g.look : L.look, lookY: up > 0.5 ? g.lookY : 1, nod: 0.4 * PPL.bump(((f % 150) + 150) % 150, 100, 5, 7),
    ...PPL.bodyArms(isBack(o.c), PPL.writeArm(f), PPL.clipboardArm(-6)) }, (p, P) => PPL.drawInterviewer(p, 1, P));
};
/** the clown far away on his lap round the sculpture (the hour goes on behind the study corner) */
const lapClown = (E: Eng, out: Stage, cam: CamInfo, f: number, key: string) => {
  const a = lapAng(f), p = lapPos(a), r = PPL.clownRide(f, 7);
  const o = E.orientSC(cam, p, lapHeading(a));
  clownAt(E, out, cam, key, { p, heading: lapHeading(a), metres: SQ.lap.r * 0.045 * (f - SH("S6").a), ...r, roll: (r.roll ?? 0) + leanTo(E, p, SQ.lap.c, 3.1, SQ.lap.r), handK: 1.4,
    ...clownArms(o.c, PPL.waveArm(f, 20 + 90 * Math.floor((f + 30) / 90), 1, { swings: 2, down: 40 + 90 * Math.floor((f + 30) / 90) }).arm, hornArm(f, []).arm) });
};

// ================================================================== S1: "In a real experiment, most people on a phone call never saw him."
// The phone guy walks at the lens chatting with big free-hand gestures, oblivious; right behind him the clown circles,
// waving both arms, honking, pulling faces, a honking frenzy on "never saw him" while the guy laughs at his call, then the
// clown deflates on "him." Crowd life behind; pigeons flush round the guy's feet and the clown's wheel.
const GUY_FK: FK[] = [[75, 118], [32, 96], [88, 90], [24, -112], [104, 150], [40, 120], [16, 34]];
const S1 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T1(), from = STORY.s1.from, to = STORY.s1.to, hd = headTo(from, to);
  // ---- the phone guy ----
  const wv = PPL.weave(f, 21, 0.06), perp: V3 = [Math.cos(hd), 0, -Math.sin(hd)], gp = add3(s1Guy(f), mul3(perp, wv));
  const m = flat(from, to) * clamp(prog("S1", f), -0.3, 1.3);
  const o = E.orientSC(cam, gp, hd + 0.07 * Math.sin(TAU * f / 110));
  const ch = PPL.phoneChat(f, 21), laughK = PPL.gestureBack(f, t.never - 4, t.never + 18, { ant: 3, move: 5, over: 0.1, settle: 6 });
  const fa = PPL.faceAt(f, [[t.a - 20, "bright"], [t.a + 8, "brightGrin"], [t.never - 4, "laughBig"], [t.never + 18, "brightGrin"]]);
  const ey = eyes(f, 21, [[t.a - 20, 0.15, 0.25], [t.most + 6, -0.25, 0.2], [t.phone, 0.2, 0.3], [t.never + 18, -0.1, 0.25]], fa.lid);
  const laughing = f >= t.never - 4 && f < t.never + 18;
  const free0 = gestFK(f, 21, GUY_FK, 26, "open", 1.3, { to: [18, -80], k: laughK });
  // p4 (audit p3 S1-1): after the 2nd honk his free hand rubs his OTHER ear, never looking: he felt it but did not see it
  const rub = PPL.gestureBack(f, t.people + 3, t.people + 15, { ant: 2, move: 4, over: 0.08, settle: 2 }, { ant: 0, move: 5, over: 0.04, settle: 3 }), rubK = clamp(rub, 0, 1);
  const free: Arm = rubK > 0.02 ? { ...free0, to: "ear", fkK: (free0.fkK ?? 1) * (1 - rubK), dy: 3 * Math.sin((TAU * f) / 5) * rubK, hand: "open", ang: 70 } : free0;
  free.dy = (free.dy ?? 0) + (laughing ? -3 * Math.abs(Math.sin(TAU * f / 8)) : 0);
  const PG: Pose = { s: o.s, c: o.c, walk: PPL.walkPhase(m, "phone"), go: 1, gait: "phone", expr: fa.expr, mouth: laughing ? "laugh" : ch.mouth,
    look: ey.look, lookY: ey.lookY, blink: ey.blink, nod: ch.nod + (laughing ? 0.8 * Math.abs(Math.sin(TAU * f / 8)) : 0), headTilt: -7 * laughK + 2 * ey.head,
    tilt: -2.5 * laughK, ...PPL.bodyArms(isBack(o.c), PPL.phoneArm(C.phoneRed), free) };
  fig(E, out, cam, "phoneguy", gp, PG, PPL.drawPhoneGuy);
  // ---- the clown, circling right behind him ----
  const fh = Math.min(f, s1Stop() + 2), cp = s1Clown(f), q0 = s1Clown(fh - 0.5), q1 = s1Clown(fh + 0.5), cHd = headTo(q0, q1);   // the heading holds once he has stopped
  const metres = s1Metres(f);
  const r = PPL.clownRide(f, 5), head: V3 = [cp[0], 1.85, cp[2]], gz = E.gaze(head, [gp[0], 1.5, gp[2]]);
  // the performance: wave both arms -> honk honk -> pull faces -> the frenzy (honks + the bell hand high) -> deflate
  const honks = [t.most - 1, t.people, t.never - 2, t.never + 6];
  const hn = hornArm(f, honks), oc = E.orientSC(cam, cp, cHd);
  const waveK = PPL.gestureBack(f, t.a - 14, t.most - 4, { move: 7 });
  const faceK = PPL.gestureBack(f, t.phone - 5, t.never - 3, { move: 6 });
  const frenzyK = PPL.gesture(f, t.never - 4, { move: 5 });
  const deflate = PPL.gesture(f, t.saw - 3, { move: 9, over: 0.06, settle: 10 });
  const wR = PPL.waveArm(f, t.a - 6, 1, { swings: 6, per: 10, amp: 30 }), wL = PPL.waveArm(f, t.a - 2, -1, { swings: 6, per: 10, amp: 30 });
  // the RIGHT (free) arm: wave -> thumb to the nose, fingers waggling -> high over the head ringing -> drops
  const nose: Arm = { to: "chin", dy: -38 + 3 * Math.sin(TAU * f / 6), dx: -4, hand: "open", hs: 1.25, ang: 20 * Math.sin(TAU * f / 5), front: true };
  const high: Arm = { fk: [150 + 8 * Math.sin(TAU * f / 5), 168 + 14 * Math.sin(TAU * f / 4)], fkK: 1, hand: "fist", hs: 1.2 };
  let right: Arm = { fk: [96 + 7 * Math.sin(TAU * f / 23), 104 + 12 * Math.sin(TAU * f / 19 + 1)], fkK: 1, hand: "open", ang: 10 };
  if (waveK > 0.02) right = { ...wR.arm, fkK: (wR.arm.fkK ?? 1) * clamp(waveK, 0, 1.1) };
  if (faceK > 0.02) right = { ...nose, to: "out", to2: "chin", k: clamp(faceK, -0.2, 1.1), dy: -38 * clamp(faceK, 0, 1) + 3 * Math.sin(TAU * f / 6) };
  // the frenzy arm goes up, and on "saw him" sinks from up there to his side (one FK blend: no jump), the bell still in it
  const ringFK = fkBlend(high.fk as FK, [10, 14], clamp(deflate, -0.1, 1.06));
  if (frenzyK > 0.02) right = { ...high, fk: ringFK, fkK: clamp(frenzyK, 0, 1.1) };
  // the LEFT (horn) arm: a wave up high before the honks, then the honks, then it drops too
  let left: Arm = hn.arm;
  if (waveK > 0.02 && f < t.most - 6) left = { ...wL.arm, fkK: (wL.arm.fkK ?? 1) * clamp(waveK, 0, 1.1), prop: { k: "horn", squeeze: 0 }, hand: "grip" };
  if (deflate > 0.02) left = { ...hn.arm, fk: [10, 16], fkK: clamp(deflate, 0, 1.06) };
  const cfa = PPL.faceAt(f, [[t.a - 20, "thrillB"], [t.most - 2, "brightGrin"], [t.phone - 4, "jawDrop"], [t.phone + 9, "laughBig"], [t.never - 3, "thrillB"], [t.saw - 2, "worriedB"]]);
  const toLens = deflate > 0.3;   // stopped and slumped, he looks at US: "nothing?"
  const c1 = clownAt(E, out, cam, "s1", { p: cp, heading: cHd, metres, ...r, expr: cfa.expr, look: toLens ? 0.05 : gz.look, lookY: toLens ? 0.25 : gz.lookY, blink: Math.max(r.blink ?? 0, cfa.lid),
    facing: toLens && !isBack(oc.c) ? 0 : undefined,
    roll: (r.roll ?? 0) * (1 - 0.5 * faceK) + leanTurn(E, s1Clown, f), hatLag: (r.hatLag ?? 0) + hn.hatLag, ruff: hn.ruff,
    headTilt: 9 * faceK * Math.sin(TAU * f / 9) + (wR.headTilt + wL.headTilt) * c01(waveK) * 0.5, nod: 1.6 * deflate, tilt: -4 * deflate,
    handK: 1.15, ...clownArms(oc.c, right, left) },
    // the little bell rings in the raised fist through the frenzy (the hand found by clownHandFK, the same arm blend)
    frenzyK > 0.25 ? { k: `bell${f}`, draw: (pen, P) => {
      const side: -1 | 1 = isBack(P.c ?? 1) ? 1 : -1, ring = 1 - c01(deflate);
      drawBell(pen, clownHandFK(P, side, ringFK, clamp(frenzyK, 0, 1.1)), 26 * ring * Math.sin(TAU * f / 8) + 4 * Math.sin(TAU * f / 30), ring * Math.abs(Math.sin(TAU * f / 8)));
    } } : undefined);
  // p3 (D9): the honk rings; the brake's dust and his sweat when nobody looked; the blah-blah of the phone guy's call
  honkRings(E, out, cam, "s1", f, cp, c1.P, honks);
  if (within(f, s1Stop(), s1Stop() + 26) || within(f, t.saw + 4, t.b + 6)) { const CA = PPL.clownAnchors(c1.P);
    ghost(E, out, cam, "s1fx", f, cp, (pen) => { VFX.dust(pen, f, s1Stop(), CA.wheel, { kind: "skid", dir: Math.sign(oc.s || 1), u: CA.u });
      VFX.sweat(pen, f, t.saw + 4, [CA.head[0] + 0.85 * CA.r, CA.head[1] - 0.35 * CA.r], { u: CA.u, n: 2, f1: t.b + 6, side: 1 }); }, 1 / PPL.CLOWN_K); }
  { const GA = PPL.anchors("phoneGuy", PG), ph = GA.hands[isBack(o.c) ? 1 : 0], bk = 1 - c01(laughK);
    if (bk > 0.05) ghost(E, out, cam, "s1blah", f, gp, (pen) => VFX.blah(pen, f, [ph[0] - 30 * GA.u, ph[1] - 34 * GA.u], { side: -1, u: GA.u, k: bk })); }
  // ---- life behind ----
  const a = t.a;
  const ex: Ex[] = [
    { id: "cyclist", pts: [[7, 0, -8.6], [-7.5, 0, -9.0]], t0: a - 30, tag: "1" },
    { id: "dogwalker", pts: [[-5, 0, -6.4], [5, 0, -5.9]], t0: a - 130, tag: "1" },
    { id: "tote", pts: [[6.5, 0, -11.2], [-6.5, 0, -11.8]], t0: a - 95, tag: "1" },
    { id: "skater", pts: [[-8, 0, -13.5], [8, 0, -12.8]], t0: a - 25, tag: "1" },
    { id: "chatA", pts: [[-1.55, 0, -5.4]], t0: 0, stand: true, heading: 1.9, tag: "1" },
    { id: "chatB", pts: [[-0.95, 0, -5.75]], t0: 0, stand: true, heading: -1.3, tag: "1" },
    { id: "elder", pts: [[2.8, 0, -16.5], [-4, 0, -17]], t0: a - 40, tag: "1" },
  ];
  for (const x of ex) extra(E, out, cam, f, x);
  pigeons(E, out, cam, f, "s1", [[-0.95, 0.35, 1], [0.55, -0.15, -1], [1.25, -1.5, 1], [-0.75, -1.95, -1], [0.2, 1.2, 1]],
    (tt) => [s1Guy(tt), s1Clown(tt)]);
};

// ================================================================== the office (S2-S5)
const OH = OFFICE.hyman, OSt = OFFICE.student;
const deg = (r: number) => (r * 180) / Math.PI;
/** the card angle (deg: 0 = facing the lens, + = turned toward screen right) of a world heading seen from this lens */
const cardAng = (E: Eng, cam: CamInfo, pos: V3, heading: number) => { const o = E.orientSC(cam, pos, heading); return deg(Math.atan2(o.s, o.c)); };
/** a figure with more drawn on the SAME card after it (a prop in the air, a mark); k = the extra drawing's key */
const figX = (E: Eng, out: Stage, cam: CamInfo, key: string, pos: V3, P: Pose, draw: Draw, k: string, more: (p: Pen, Q: Pose) => void) => {
  const Q: Pose = { light: E.light2D(cam), ...P };
  E.putFig(out, cam, `${key}|${E.fkey(Q)}|${k}`, pos, (pen) => { draw(pen, Q); more(pen, Q); });
};
/** p4: THE BIGGEST GRIN (S9 "amazing!"; audit p3 RETENTION-7b asks for an open D twice the kit's width): a wide open-D
 *  mouth in the kit's own style (dark inside, the top teeth band, the tongue, the ink rim) drawn over the kit's "laugh"
 *  mouth on the figure's card at its mouth anchor; open 0..1 (the talk opens it), cheek creases at the corners */
const bigD = (p: Pen, A: PPL.Anchors, open: number) => {
  const u = A.u, mx = A.mouth[0], y = A.mouth[1] - 3 * u, rx = 21 * u, ry = (12.5 + 6 * clamp(open, 0, 1)) * u;
  p.ell(mx, y, rx, ry, "#40101c", 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 4 * u], [mx - rx, y + 4 * u]], () => p.ell(mx, y, rx, ry, "#ffffff", 0, 0, 180));
  p.ell(mx + 2 * u, y + 0.64 * ry, 0.42 * rx, 0.27 * ry, "#e86e78", 0);
  p.ell(mx, y, rx, ry, null, 2.8 * u, 0, 180);
  for (const sd of [-1, 1]) p.stroke([[mx + sd * (rx + 1.5 * u), y - 4.5 * u], [mx + sd * (rx + 4 * u), y - 0.5 * u], [mx + sd * (rx + 3 * u), y + 3 * u]], 2.2 * u, "#2c1e2a");
};
/** a sheet of note paper (crush 0) that crumples into a ball (crush 1) at c (card units); u = the figure's head unit */
const drawPaper = (p: Pen, c: P2, u: number, crush: number, rot: number) => {
  const k = clamp(crush, 0, 1), cs = Math.cos(rot), sn = Math.sin(rot), R = (x: number, y: number): P2 => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
  if (k < 0.45) {
    const w = 13 * u * (1 - 0.5 * k), h = 17 * u * (1 - 0.5 * k);
    p.poly([R(-w, -h), R(w, -h + 5 * u * k), R(w - 4 * u * k, h), R(-w, h - 4 * u * k)], "#fbf8ee", 1.5 * u);
    for (const y of [-0.5, 0, 0.5]) p.stroke([R(-0.6 * w, y * h), R(0.6 * w, y * h)], 1.2 * u, "#9aa3b5");
    return;
  }
  const r = lerp(13, 9.5, (k - 0.45) / 0.55) * u, pts: P2[] = [];
  for (let i = 0; i < 10; i++) { const a = (TAU * i) / 10, rr = r * (0.84 + 0.3 * PPL.hash(i, 5)); pts.push(R(rr * Math.cos(a), rr * Math.sin(a))); }
  p.poly(pts, "#fbf8ee", 1.5 * u);
  p.stroke([R(-0.5 * r, -0.2 * r), R(0.1 * r, 0.1 * r), R(0.5 * r, -0.3 * r)], 1.1 * u, "#b9bfcc"); p.stroke([R(-0.2 * r, 0.5 * r), R(0.1 * r, 0.1 * r)], 1.1 * u, "#b9bfcc");
};
/** Hyman's heading (world) when S2 ends: 3/4 toward the board side of the S2 lens */
const H_S2END = -0.17;
// S2: "Psychologist Ira Hyman needed a distraction nobody could miss." He thinks IN MOTION (audit p2 M6): at the board, his
// back to us, he taps under "DISTRACTION?" twice with a marker and shakes his head; turns on his name (a polite nod to
// us); paces two steps away, eyes on the floor; swings back on "a distraction" and jabs the marker at the title (twice);
// pulls a note out of his pocket, reads it, crumples it and lobs it at the board on "nobody could" (it bounces off and
// drops); then the chin hand with two real strokes on "miss.", eyes to the ceiling, and to the DOOR 6 f before the cut.
/** Hyman in S2 at frame ff (a pure function of the frame: the paper's release point is the hand of the pose at that frame) */
const hymanS2 = (E: Eng, cam: CamInfo, ff: number): { P: Pose; pos: V3; back: boolean } => {
  const t = T2(), hy = s2Hyman(ff), pos = hy.p, L = PPL.holdLife(ff, 31, 0.6), yaw = yawAt(cam, pos), bc = OFFICE.board.c;
  // he faces the board (180), then the way he paces (pa), then 3/4 back toward the board side (-25)
  const pa = clamp(cardAng(E, cam, pos, headTo(S2P0, OH.atBoard)), 22, 58);
  const tn = PPL.spinAt(ff, t.turn, { from: 180, to: pa, wind: 3, turn: 9, over: 8, settle: 8, windDeg: 6, keyed: false });
  const tb = PPL.spinAt(ff, t.paceEnd - 3, { from: pa, to: -25, wind: 2, turn: 7, over: 7, settle: 8, windDeg: 4, keyed: false });
  const sp = ff < t.paceEnd - 6 ? tn : tb, back = sp.view === "back";
  const sw = PPL.stopWalk(ff, t.paceEnd, "walk"), sa = PPL.stopAt(ff, t.paceEnd), goK = c01(hy.m / 0.07) * (hy.m > 0.005 ? 1 : 0);
  // ---- the marker hand (his RIGHT) ----
  const up = PPL.gestureBack(ff, t.a - 9, t.tap2 + 3, { move: 7 }), poke = PPL.bump(ff, t.tap1 - 2, 2, 3) + PPL.bump(ff, t.tap2 - 2, 2, 3);
  const aimTap = E.onCard(cam, pos, yaw, [S2P0[0] + 0.3, bc[1] + 0.22, bc[2] + 0.02]);   // under the middle of the title, up to his right
  const jabK = PPL.gestureBack(ff, t.distraction - 6, t.nobody - 2) - 0.1 * PPL.bump(ff, t.distraction, 2, 3) - 0.1 * PPL.bump(ff, t.distraction + 7, 2, 3);
  const marker: Arm = ff < t.turn + 2 ? { to: "hang", aim: aimTap, k: clamp(up, -0.2, 1.1) * 0.86 + 0.13 * poke, hand: "pinch", hs: 1.15, prop: { k: "pencil" } }
    : { to: "hang", aim: [-420, 330], k: clamp(jabK, -0.2, 1.15), hand: "pinch", hs: 1.2, prop: { k: "pencil" } };
  // ---- the free hand (his LEFT): on the hip at the board -> the note out of the pocket -> crumple -> the lob -> the chin ----
  const hipK = 1 - PPL.gesture(ff, t.turn - 2, { move: 6, over: 0 });
  const g1 = PPL.gesture(ff, t.paper + 1, { ant: 1, move: 5, over: 0.04, settle: 3 }), g2 = PPL.gesture(ff, t.paper + 8, { ant: 1, move: 5, over: 0.1, settle: 6 });
  const fkOn = PPL.gesture(ff, t.toss - 4, { ant: 0, move: 4, over: 0, settle: 1 }), thr = PPL.gesture(ff, t.toss, { ant: 0, move: 3, over: 0.12, settle: 4 }), drop = PPL.gesture(ff, t.toss + 4, { ant: 0, move: 5, over: 0.04, settle: 4 });
  const fkP = fkBlend(fkBlend([62, 148], [150, 214], clamp(thr, 0, 1.12)), [9, 13], clamp(drop, 0, 1.04));
  const crush = c01((ff - (t.toss - 8)) / 5), ck = PPL.gesture(ff, t.chin, { move: 7, over: 0.08 });
  const free: Arm = ff < t.paper ? { to: "hang", to2: "hip", k: clamp(hipK, 0, 1), hand: "ball" }
    : ff < t.paper + 7 ? { to: "hang", to2: "chest", k: g1, hand: "grip" }
    : ff < t.chin - 5 ? { to: "chest", to2: "talk", k: g2, dx: crush * 2 * Math.sin(ff * 2.1), dy: -4 * g2, fk: fkP, fkK: clamp(fkOn, 0, 1), hand: ff >= t.toss + 2 ? "open" : crush > 0.3 ? "fist" : "grip", hs: 1.15 }
    : { to: "hang", to2: "chin", k: ck, hand: "pinch", hs: 1.15, ang: -20, dy: ck > 0.8 ? 3 * (1 - Math.cos((TAU * Math.max(0, ff - t.chin - 8)) / 14)) : 0 };
  // ---- the face ----
  const fa = PPL.faceAt(ff, [[t.a - 20, "focusB"], [t.turn + 2, "polite"], [t.needed - 2, "puzzled"], [t.distraction - 6, "asking"], [t.paper + 8, "worriedB"], [t.toss + 6, "puzzled"], [t.door + 1, "asking"]]);
  const ey = eyes(ff, 31, [[t.a - 20, 0.3, -0.6], [t.turn + 3, 0.1, 0.05], [t.needed - 4, 0.55, 0.7], [t.paceEnd - 4, 0.1, 0], [t.paper + 9, 0.85, 0.8], [t.toss + 2, -0.9, -0.8], [t.toss + 9, -0.8, 0.5],
    [t.chin + 4, 0.45, -0.95], [t.door, 1.2, -0.1]], fa.lid, 0.12);
  const shake = 5 * Math.sin((TAU * (ff - t.tap2 - 4)) / 7) * PPL.bump(ff, t.tap2 + 3, 3, 9), sigh = 1.5 * PPL.bump(ff, t.tap2 + 4, 5, 4) - 1.4 * PPL.bump(ff, t.tap2 + 9, 4, 12);
  const P: Pose = { ...L, ...sp, walk: sw.walk, go: sw.go * goK, feet: hy.m > 0.005 && ff > t.paceEnd - 8 ? sw.feet : undefined, duck: sa.duck,
    tilt: L.tilt * (back ? 0.4 : 1) + (sp.tilt ?? 0) + sa.tilt * 0.6 + 2 * PPL.bump(ff, t.toss - 3, 3, 3) - 3 * PPL.bump(ff, t.toss, 2, 6),
    // p4 (audit p3 S2-1): a deflating SIGH as the paper bounces off the board (6 % squash for 8 f), then on "miss" a small
    // hopeful lift (eyes up, brows up), which motivates the knock
    breath: L.breath * 0.6 + sigh - 2.2 * PPL.bump(ff, t.toss + 9, 3, 8), stretch: (sp.stretch ?? 1) * (1 + 0.018 * sigh + 0.03 * PPL.bump(ff, t.toss, 2, 5)) * (1 - 0.06 * PPL.bump(ff, t.toss + 9, 3, 8)) * (1 + 0.035 * PPL.bump(ff, t.miss - 2, 4, 10)),
    nod: 0.9 * PPL.bump(ff, t.hyman, 4, 10) + 0.5 * PPL.bump(ff, t.distraction - 1, 3, 6) + 0.3 * c01(ck) + (back ? 0.5 * poke : 0),
    headTilt: L.headTilt * 0.6 + shake + 4 * c01(ck) + 2 * ey.head, expr: fa.expr, look: ey.look, lookY: ey.lookY, blink: Math.max(ey.blink, sp.blink ?? 0),
    face: { ...(sp.face ?? {}), browUp: [PPL.browsUp(ff, t.door + 1, Infinity, 7)[0] - 3 * PPL.bump(ff, t.paper + 6, 4, 24) + 5 * PPL.bump(ff, t.miss - 2, 4, 12), PPL.browsUp(ff, t.door + 1, Infinity, 7)[1] - 3 * PPL.bump(ff, t.paper + 6, 4, 24) + 5 * PPL.bump(ff, t.miss - 2, 4, 12)] }, ...PPL.bodyArms(back, marker, free) };
  return { P, pos, back };
};
const S2 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T2(), H = hymanS2(E, cam, f), fr = t.toss + 2, A = PPL.anchors("prof", H.P), u = A.u, bc = OFFICE.board.c;
  const hit = E.onCard(cam, H.pos, yawAt(cam, H.pos), [bc[0] - 0.1, bc[1] + 0.26, bc[2] + 0.02]);
  let paper: { c: P2; crush: number; rot: number; star: number } | null = null;
  if (f >= t.paper + 5 && f < fr) { const h = A.hands[H.back ? 0 : 1], cr = c01((f - (t.toss - 8)) / 5); paper = { c: [h[0] + 2 * u, h[1] - (15 - 9 * cr) * u], crush: cr, rot: 0.2 + 0.25 * cr * Math.sin(f * 1.7), star: 0 }; }
  else if (f >= fr && f < fr + 6) { const R0 = hymanS2(E, cam, fr), h0 = PPL.anchors("prof", R0.P).hands[R0.back ? 0 : 1], k = (f - fr) / 6; paper = { c: [lerp(h0[0], hit[0], k), lerp(h0[1] - 12 * u, hit[1], k) - 60 * k * (1 - k)], crush: 1, rot: f * 0.9, star: 0 }; }
  else if (f >= fr + 6 && f < fr + 30) { const k = f - fr - 6, y = hit[1] + 2.5 * k * k - 8 * k; if (y < 985) paper = { c: [hit[0] - 1.6 * k, y], crush: 1, rot: f * 0.6, star: k < 3 ? 1 - k / 3 : 0 }; }
  const pp = paper;
  figX(E, out, cam, "hyman", H.pos, H.P, PPL.drawHyman, pp ? `pp${f}` : "", (pen) => {
    if (!pp) return;
    if (pp.star > 0) { const g = pen.g; g.save(); g.globalAlpha = pp.star; for (let i = 0; i < 5; i++) { const a = -0.5 + i * 1.25, r0 = 16 * u, r1 = (26 + 10 * (1 - pp.star)) * u; pen.stroke([[hit[0] + r0 * Math.cos(a), hit[1] + r0 * Math.sin(a)], [hit[0] + r1 * Math.cos(a), hit[1] + r1 * Math.sin(a)]], 2.4 * u, "#2a2433"); } g.restore(); }
    drawPaper(pen, pp.c, u, pp.crush, pp.rot);
  });
  // p3 (D9): his sigh at the board (a puff), a sweat drop over the note
  if (within(f, t.tap2 + 8, t.tap2 + 28) || within(f, t.paper + 9, t.paper + 26) || within(f, t.toss + 9, t.toss + 28)) ghost(E, out, cam, "s2fx", f, H.pos, (pen) => {
    VFX.puff(pen, f, t.toss + 10, [A.head[0] + 0.95 * A.r, A.head[1] + 0.45 * A.r], { u, dir: -20 });
    VFX.puff(pen, f, t.tap2 + 9, [A.head[0] + 0.95 * A.r, A.head[1] + 0.45 * A.r], { u, dir: -20 });
    VFX.sweat(pen, f, t.paper + 9, [A.head[0] + 0.85 * A.r, A.head[1] - 0.35 * A.r], { u, side: 1 }); });
};
// S3: "Then a student told him:" The door swings open (officeDoorYaw at OFFICE.door.openF), the student stands in the
// corridor, steps into the doorway and LEANS IN grinning on "student", a little wave and ONE silent "hi" on "told him".
// Hyman (audit p2 M7): the chin hand stops, his eyes snap to the door, a small take, then ONE clear turn of head and body
// toward it (to a profile, his face seen) and one step along the board (S3END: whole in the frame after the snap push,
// his head never in front of the student's face).
const S3 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T3(), hy3 = s3Hyman(f), pos = hy3.p, turnF = t.open + 6, hsw = PPL.stopWalk(f, t.step, "walk"), hsa = PPL.stopAt(f, t.step);
  const a0 = cardAng(E, cam, pos, H_S2END), a1 = clamp(cardAng(E, cam, pos, headTo(pos, OFFICE.door.opening)), -78, 78);
  const turn = (x: number) => PPL.spinAt(x, turnF, { from: a0, to: a1, wind: 3, turn: 8, over: 8, settle: 8, windDeg: 5, keyed: false });
  // p4 (audit p3 M2 / S3-1): when the student LEANS IN on "student" Hyman does a real TAKE: down 4 f, pop up, eyes wide with
  // an "o", the glasses jumping 1 f late, the brows up; then a curious face held to the dissolve (mouth shut)
  const tn = turn(f), tk = PPL.takeAt(f, t.open + 2, 0.7), tk2 = PPL.takeAt(f, t.student - 2, 1.15), gl3 = f >= t.student + 3 ? 6.5 * Math.exp(-(f - t.student - 3) / 6) : 0;
  const L = PPL.holdLife(f, 31, 0.5), ck = 1 - PPL.gesture(f, t.open + 3, { move: 6, over: 0.06 });
  const fa = PPL.faceAt(f, [[t.a - 30, "puzzled"], [t.open + 5, "asking"], [t.student + 2, "brightO"], [t.student + 15, "asking"]]);
  const door: V3 = [OFFICE.door.opening[0], 1.6, OFFICE.door.opening[2]], gz = E.gaze([pos[0], 1.55, pos[2]], door), seen = sm((f - t.open - 1) / 3);
  const HP3 = fig(E, out, cam, "hyman", pos, { ...L, ...tn, walk: hy3.m > 0.005 ? hsw.walk : 0, go: hy3.m > 0.005 ? hsw.go * c01(hy3.m / 0.06) : 0, feet: hy3.m > 0.005 && f > t.step - 8 ? hsw.feet : undefined, duck: hsa.duck,
    expr: fa.expr, look: lerp(1.2, gz.look, seen), lookY: lerp(-0.1, gz.lookY, seen), blink: Math.max(fa.lid, PPL.blinkAt(f, 31), tn.blink ?? 0),
    stretch: (tn.stretch ?? 1) * tk.stretch * tk2.stretch, nod: tk.nod + tk2.nod, tilt: (tn.tilt ?? 0) + L.tilt - 2.5 * PPL.gesture(f, turnF + 4, { move: 6, over: 0.2 }),
    headTilt: 4 * c01(ck) + L.headTilt * 0.5 + PPL.headDrag((x) => turn(x).angle / 6, f),
    face: { ...(tn.face ?? {}), browUp: [PPL.browsUp(f, t.open + 4, Infinity, 8)[0] + PPL.browsUp(f, t.student + 1, Infinity, 5)[0], PPL.browsUp(f, t.open + 4, Infinity, 8)[1] + PPL.browsUp(f, t.student + 1, Infinity, 5)[1]], glassDy: gl3 },
    ...PPL.bodyArms(tn.view === "back", { to: "hang", hand: "pinch", prop: { k: "pencil" } }, { to: "hang", to2: "chin", k: c01(ck), hand: ck > 0.5 ? "pinch" : "ball", hs: 1.15, ang: -20 }) }, PPL.drawHyman);
  // p3 (D9): surprise lines on his take; the door's draught lifts a few sheets off the pin board (they flutter down)
  if (within(f, t.open + 4, t.open + 24) || within(f, t.student + 2, t.student + 22)) { const A = PPL.anchors("prof", HP3); ghost(E, out, cam, "s3fx", f, pos, (pen) => { VFX.surpriseLines(pen, f, t.open + 4, A.head, { u: A.u }); VFX.surpriseLines(pen, f, t.student + 2, A.head, { u: A.u, r: 70 }); }); }
  if (within(f, t.open + 3, t.open + 52)) { const dp: V3 = [OFFICE.door.opening[0] - 0.75, 0, OFFICE.door.opening[2] + 0.25]; ghost(E, out, cam, "s3paper", f, dp, (pen) => VFX.paperFlutter(pen, f, t.open + 3, [300, 300], { n: 4, w: 120, ground: 975 })); }
  // ---- the student ----
  const lean = PPL.gesture(f, t.student - 7, { move: 7, over: 0.16, settle: 10 }), step = sm((f - (t.student - 12)) / 10);
  const sp: V3 = [OSt.lean[0] - 0.04 * step, 0, OSt.lean[2] - 0.12 + 0.3 * step];
  const so = E.orientSC(cam, sp, headTo(sp, pos)), wave = PPL.waveArm(f, t.told - 2, 1, { swings: 2, per: 9, amp: 22, down: t.end + 6 });
  const sgz = E.gaze([sp[0], 1.7, sp[2]], [pos[0], 1.5, pos[2]]);
  const push = PPL.gestureBack(f, t.open - 6, t.open + 10, { move: 5 }), hi = f >= t.told - 1 && f < t.told + 5;
  fig(E, out, cam, "student", sp, { ...PPL.holdLife(f, 8, 0.6), s: so.s, c: so.c, walk: PPL.walkPhase(0.3 * step), go: step > 0.02 && step < 0.98 ? 1 : 0, ...PPL.leanIn(clamp(lean, -0.2, 1.2), -1),
    // (audit p2: his mouth flapped 18 f before his line: now a closed smile, and ONE open "hi" shape for 6 f with the wave)
    expr: "bright", mouth: hi ? "vA" : "smallSmile", blink: PPL.blinkAt(f, 8), look: sgz.look, lookY: sgz.lookY, face: { browUp: PPL.browsUp(f, t.student - 4, Infinity, 6) },
    stretch: 1 + 0.03 * PPL.bump(f, t.student - 6, 3, 8),
    // his screen-left hand grips the door frame as he leans in; the other pushed the door open and then waves "hi"
    armL: { to: "hang", to2: "out", k: 0.2 + 0.6 * c01(lean), dy: -16 * c01(lean), hand: "grip", hs: 1.1 },
    armR: f > t.told - 12 ? { ...wave.arm, hs: 1.2 } : { to: "hang", to2: "out", k: c01(push) * 0.9 + 0.35 * c01(lean), dy: -12 * c01(lean), hand: "open", hs: 1.15, ang: 70 } }, PPL.drawStudent);
};
// S4 STUDENT: "I own a unicycle." He rolls the unicycle in from the door (its wheel turning with the ground), stops on
// "unicycle", turns it sideways to show it off and rocks it so the wheel spins, presents it with his free hand (palm up),
// talking on his words. Hyman takes two steps to meet him as the shot starts, then a real TAKE on "unicycle" (audit p2 M7:
// down, pop up, head back, brows high, a lean away, eyes down to the wheel and back), his mouth CLOSED: only the student talks.
const S4 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T4();
  // ---- the student + the unicycle ----
  const st = s4Student(f), hd = headTo(s4From, s4To), o = E.orientSC(cam, st.p, hd + 0.35 * sm((f - t.stop) / 10));
  const sw = PPL.stopWalk(f, t.stop, "walk"), sa = PPL.stopAt(f, t.stop), started = st.m > 0.01;
  const show = PPL.gesture(f, t.unicycle - 2, { move: 7, over: 0.14 }), rock = 0.09 * Math.sin(TAU * Math.max(0, f - t.stop - 2) / 16) * c01((f - t.stop - 2) / 6);
  const spin = st.m / 0.27 + rock / 0.27, uniS = lerp(0.55, 0.95, sm((f - t.stop) / 9));
  // p4 (audit p3 S4-1): ONE proud attitude through the line (half-lid smug eyes, brows up, chin up); only the mouth talks
  const sfa = PPL.faceAt(f, [[t.a - 20, "brightGrin"], [t.own - 2, "smugB"]]);
  const hy = s4Hyman(f), sgz = E.gaze([st.p[0], 1.7, st.p[2]], [hy.p[0], 1.5, hy.p[2]]);
  const talking = inLine("unicycle", f), puff = PPL.chestPuff(f, t.own - 2, t.end + 6);
  const SP4 = fig(E, out, cam, "student", st.p, { ...PPL.holdLife(f, 8, 0.5), s: o.s, c: o.c, walk: started ? sw.walk : 0, go: started ? sw.go : 0, feet: started && f > t.stop - 8 ? sw.feet : undefined,
    tilt: sa.tilt * Math.sign(o.s || 1), duck: sa.duck, expr: sfa.expr, mouth: sayGrin("unicycle", f, 4) ?? (talking ? undefined : "smirk1"), nod: accent("unicycle", f, 0.6) + 0.5 * puff.nod - 0.9 * c01((f - t.own + 2) / 5), blink: sfa.lid,
    face: { browUp: [4 * c01((f - t.own + 2) / 4), 4 * c01((f - t.own + 2) / 4)], freckles: 1 },
    breath: puff.breath, stretch: puff.stretch,
    look: sgz.look - 0.4 * PPL.bump(f, t.unicycle - 2, 3, 12), lookY: sgz.lookY + 0.5 * PPL.bump(f, t.unicycle - 2, 3, 12),
    armL: { to: "saddle", dx: 6 + rock * 160, hand: "grip", prop: { k: "unicycle", s: uniS, spin, lean: 22 } },
    // the free hand presents it, palm up, out at his side ("I own a unicycle!")
    armR: talking || show > 0.05 ? { to: "hang", to2: "talk", k: show, hand: "open", hs: 1.25, ang: 55, dy: talking ? -2 * Math.abs(Math.sin(TAU * f / 9)) : 0 } : undefined }, PPL.drawStudent);
  // ---- Hyman ----
  const hsw = PPL.stopWalk(f, t.hyStop, "walk"), hsa = PPL.stopAt(f, t.hyStop), hgo = hy.m > 0.01 && f < t.hyStop + 1;
  // p4 (audit p3 S4-2): the take on "unicycle" bigger and longer: a 5 f dip, the pop up (+17 %) with the eyes WIDE and the
  // glasses jumping off his nose, MOUTH SHUT (the student talks), a lean back, settle; then a slow interested smile
  const ho = E.orientSC(cam, hy.p, headTo(hy.p, [st.p[0], 0, st.p[2] + 0.6])), tk = PPL.takeAt(f, t.unicycle - 5, 1.3), back = PPL.gesture(f, t.unicycle, { ant: 0, move: 5, over: 0.25, settle: 10 });
  const fa0 = PPL.faceAt(f, [[t.a - 20, "asking"], [t.unicycle - 1, "jawDrop"], [t.unicycle + 11, "bright"]], 8), wide = fa0.expr === "jawDrop";
  const fa = { expr: fa0.expr, lid: fa0.lid }, gl4 = f >= t.unicycle ? 7 * Math.exp(-(f - t.unicycle) / 7) : 0;
  const wheel: V3 = [st.p[0] - 0.3, 0.4, st.p[2]], face: V3 = [st.p[0], 1.7, st.p[2]], hp: V3 = [hy.p[0], 1.55, hy.p[2]];
  const gzF = E.gaze(hp, face), gzW = E.gaze(hp, wheel), wk = PPL.gestureBack(f, t.unicycle + 3, t.unicycle + 19, { ant: 0, move: 3, over: 0 }, { ant: 0, move: 3, over: 0, settle: 1 });
  const L = PPL.holdLife(f, 31, 0.5), side = Math.sign(ho.s || 1);
  const HP4 = fig(E, out, cam, "hyman", hy.p, { ...L, s: ho.s, c: ho.c, facing: side > 0 ? 1 : -1, walk: hy.m > 0.01 ? hsw.walk : 0, go: hgo ? hsw.go : 0, feet: hy.m > 0.01 && f > t.hyStop - 8 ? hsw.feet : undefined, duck: hsa.duck,
    expr: fa.expr, mouth: wide ? "vM" : f > t.unicycle + 18 ? undefined : "smallSmile", look: lerp(gzF.look, gzW.look, c01(wk)) + L.look * 0.5, lookY: lerp(gzF.lookY, gzW.lookY, c01(wk)),
    blink: Math.max(fa.lid, wide ? 0 : L.blink), face: { browUp: PPL.browsUp(f, t.unicycle - 1, Infinity, 10), glassDy: gl4 }, stretch: tk.stretch, nod: tk.nod - 0.5 * c01(back),
    tilt: L.tilt + hsa.tilt * side - 3.5 * side * clamp(back, 0, 1.25), headTilt: L.headTilt * 0.5 - 4 * side * clamp(back, 0, 1.25) + 3 * c01(wk),
    armL: { to: "hang", hand: "pinch", prop: { k: "pencil" } }, armR: { to: "hang", to2: "chest", k: 0.7 * clamp(back, 0, 1.15), hand: "open", hs: 1.15, ang: -30 } }, PPL.drawHyman);
  // p3 (D9): a twinkle on the unicycle as he shows it off; surprise lines on Hyman's take
  if (f >= t.unicycle - 1) { const A = PPL.anchors("student", SP4), h = A.hands[0]; ghost(E, out, cam, "s4spark", f, st.p, (pen) => VFX.sparkles(pen, f, [h[0] - 6 * A.u, h[1] + 34 * A.u], { u: A.u, n: 4, r: 46, f0: t.unicycle - 1 })); }
  if (within(f, t.unicycle + 1, t.unicycle + 21)) { const A = PPL.anchors("prof", HP4); ghost(E, out, cam, "s4take", f, hy.p, (pen) => VFX.surpriseLines(pen, f, t.unicycle + 1, A.head, { u: A.u })); }
};
// S5 STUDENT: "...and a clown suit." HARD CUT on "...and": he holds the zipped garment bag up by its hanger BESIDE him, at
// arm's length on its own card (DESIGN's PPL.suitReveal + drawSuitBag, CHAR.md p3 KIT "S5"), a sly side-eye: there is
// more. p4 (audit p3 RETENTION-5): his far hand reaches across and grabs the flap's edge 7 f ahead (the ARM LEADS), tugs
// it back, and on "clown" the FLAP SWINGS OPEN over 7 f (a visible step every frame, no flash frame), the suit tumbles out
// 2 f late and bounces once, the hand sweeps out into a palm-up TA-DA; confetti, sparkles. One face track: sly, then the
// PROUD GRIN from "clown" held to the cut (talked through on "suit."), the chest puffed. Hyman (mouth shut while the
// student talks): curious eyes on the bag, a take, the JAW DROP on "suit" (eyes wide, glasses popping up) for 9 f, THEN the
// light bulb, then the delighted grin spreading, the fists rubbing with glee, a little hop.
const S5 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T5(), f0 = t.clown, sp = OSt.inRoom, sr = PPL.suitReveal(f, f0, 1);
  // ---- the student ----
  const L = PPL.holdLife(f, 8, 0.5), hp: V3 = [HY5[0], 1.55, HY5[2]], sgz = E.gaze([sp[0], 1.75, sp[2]], hp), puff = PPL.chestPuff(f, f0 + 5);
  const bagLook = PPL.gestureBack(f, f0 - 8, f0 + 3, { ant: 0, move: 3, over: 0 }, { ant: 0, move: 4, over: 0, settle: 1 });
  const proud = f >= f0, mouth: MouthK | undefined = proud ? sayGrin("suit", f, 9, true) ?? "grin" : say("suit", f, 9);
  // (the ta-da goes up high beside his head, palm up: the kit's sideways fling put the hand past the right edge here)
  const fling: Arm = { ...sr.fling, fk: [136, 150] }, hold: Arm = { ...sr.hold, fk: [134, 106] };   // (the hold arm a little higher: the suit's hem clears the caption band)
  const SP5 = fig(E, out, cam, "student", sp, { ...L, s: -0.3, c: 0.94, facing: -1, expr: proud ? "brightGrin" : "sly", mouth, nod: accent("suit", f, 0.8) + puff.nod,
    look: lerp(sgz.look, -1.0, c01(bagLook)), lookY: lerp(sgz.lookY, 0.35, c01(bagLook)), blink: L.blink * (proud ? 0 : 1), breath: L.breath * 0.5 + puff.breath * 1.4,
    stretch: sr.stretch * (1 + 1.6 * (puff.stretch - 1)), tilt: L.tilt * 0.5 + sr.tilt, headTilt: L.headTilt * 0.5 - 3 * c01(PPL.gesture(f, f0 + 3, { move: 6 })),
    face: { browUp: PPL.browsUp(f, f0 + 1, Infinity, 5), freckles: 1 }, armL: hold, armR: fling }, PPL.drawStudent);
  // the bag on its OWN card at the hold hand (3 cm behind him: his fist covers the hook)
  const h = PPL.anchors("student", SP5).hands[sr.hand], [dx] = PPL.cardOffset(h);
  const ax = sp[0] - cam.pos.x, az = sp[2] - cam.pos.z, an = Math.hypot(ax, az) || 1;
  const bag: V3 = [sp[0] + cam.right.x * dx + (ax / an) * 0.03, 0, sp[2] + cam.right.z * dx + (az / an) * 0.03];
  E.putCard(out, cam, `bag|${E.fkey([sr.open, sr.suit, sr.sway, h[1]])}`, bag, (p) => PPL.drawSuitBag(p, h[1], sr, 2.15));   // (u 2.15: its hem stays above the caption band)
  // the unicycle he rolled in, parked against the wall by the door behind him
  const up: V3 = [OFFICE.door.opening[0] - 0.62, 0, OFFICE.door.opening[2] + 0.2];
  E.putCard(out, cam, `uni|parked`, up, (p) => FX.drawUnicycle(p, [300 - 34, 975 - 0.82 / 0.00216], 975, 0.8, 1.2, 2.4, 34));
  E.blob(out, up[0], 0, up[2], 0.6, 0.8, false);
  // ---- Hyman ----
  const ho = E.orientSC(cam, HY5, headTo(HY5, [bag[0], 0, bag[2] + 0.9])), side = Math.sign(ho.s || 1);
  const jaw = f >= t.suit && f < t.suit + 9, bulb = t.suit + 9, grin = f >= bulb;
  const gzB = E.gaze(hp, [bag[0], 1.2, bag[2]]), gzS = E.gaze(hp, [sp[0], 1.75, sp[2]]), toBag = c01((f - t.a - 3) / 5) * (1 - 0.7 * c01((f - bulb - 2) / 4));
  const htk = PPL.takeAt(f, t.suit - 4, 1.25), glee = PPL.gesture(f, bulb + 2, { move: 6, over: 0.12 }), rub = 4 * Math.sin((TAU * f) / 6) * c01(glee), hop = PPL.hopAt(f, bulb + 2, 0.07, 8);
  const gdy = jaw ? 7 * Math.exp(-(f - t.suit - 1) / 6) * (f > t.suit ? 1 : 0.4) : 0, HL = PPL.holdLife(f, 31, 0.5);
  const spread = c01((f - bulb) / 10), hexpr: Expr = jaw ? "jawDrop" : grin ? (spread < 0.45 ? "brightO" : "brightGrin") : "asking";
  const HP5 = fig(E, out, cam, "hyman", HY5, { ...HL, s: ho.s, c: ho.c, facing: side > 0 ? 1 : -1, expr: hexpr, mouth: !jaw && !grin ? "smallSmile" : undefined, look: lerp(gzS.look, gzB.look, toBag), lookY: lerp(gzS.lookY, gzB.lookY, toBag),
    blink: Math.max(HL.blink * (jaw ? 0 : 1), f === bulb || f === bulb + 1 ? 0.5 : 0), face: { browUp: PPL.browsUp(f, t.suit - 1, Infinity, 9), glassDy: gdy }, nod: htk.nod - 0.4 * spread, stretch: htk.stretch * hop.stretch, hop: hop.hop,
    tilt: HL.tilt * 0.5 - 3 * side * c01(PPL.bump(f, t.suit, 3, 10)) + 3 * side * c01(glee), headTilt: HL.headTilt * 0.5 + 4 * side * c01(glee),
    armL: { to: "hang", to2: "hug", k: glee, dx: rub, hand: "fist", hs: 1.15 }, armR: { to: "hang", to2: "hug", k: glee, dx: -rub, dy: 2, hand: "fist", hs: 1.15 } }, PPL.drawHyman);
  // p3 (D9) / p4: confetti out of the bag's mouth as the flap opens and sparkles round the suit (no flash: the opening is
  // seen); surprise lines on Hyman's jaw drop, then the light bulb over him
  if (f >= f0 + 2) ghost(E, out, cam, "s5fx", f, bag, (pen) => {
    VFX.confetti(pen, f, f0 + 4, [300, h[1] + 70], { n: 40, w: 150, ground: 975 });
    VFX.sparkles(pen, f, [300, h[1] + 200], { n: 6, r: 100, f0: f0 + 8 }); });
  { const A = PPL.anchors("prof", HP5);
    if (within(f, t.suit, t.suit + 20)) ghost(E, out, cam, "s5jaw", f, HY5, (pen) => VFX.surpriseLines(pen, f, t.suit, A.head, { u: A.u }));
    if (f >= bulb) ghost(E, out, cam, "s5bulb", f, HY5, (pen) => VFX.bulb(pen, f, bulb, [A.crown[0], A.crown[1] - 30 * A.u], { u: A.u, hold: 30 })); }
};

// ================================================================== S6: "So for one hour, the clown rode circles in the middle of campus."
// p4 (audit p3 R2 + RETENTION-6, the viewer's 28-30 s dip): the crane is already pitched down on his TIGHT circle (no
// horizon in any frame) and comes down and in; he is >= 20 % of the frame all shot. Time-lapse riding, fast, leaning hard:
// a wave to the lens on "So for", a honk BLAST on "one hour"; on "circles" his worn TYRE TRACK glows on the brick and
// three time-lapse AFTERIMAGES trail him round it. THE GAG (one picture of the whole film): the beret woman (no phone)
// walks in, stops DEAD, gapes and claps at him, while the pink-phone blonde chats past behind his circle: he slows, rides up
// behind her and HONKS at her ear; she laughs into her call and never looks; his "?". Then, on "in the middle of campus",
// he juggles as the lime-phone varsity man crosses the near foreground, soft in the lens blur, eyes on his call.
/** the S6 clown's pose at frame ff (shared by the clown and his afterimages) */
const s6Pose = (E: Eng, cam: CamInfo, ff: number) => {
  const t = T6(), cl = s6Clown(ff), r = PPL.clownRide(ff, 7), o = E.orientSC(cam, cl.p, cl.heading), hk1 = t.hour + 4, jug0 = t.honk + 16;
  const wv = PPL.waveArm(ff, t.a - 2, 1, { swings: 2.5, per: 9, amp: 28, down: hk1 - 9 }), hn = hornArm(ff, [hk1, t.honk]), jg = PPL.honkJiggle(ff, hk1), jg2 = PPL.honkJiggle(ff, t.honk);
  let bit = ff >= jug0 - 8 ? PPL.clownBit("juggle", ff, jug0) : null;
  if (bit && ff < jug0 + 6) { const { expr: _e, ...pose } = bit.pose; void _e; bit = { ...bit, pose }; }   // his "?" face holds into the first balls
  const cfa = PPL.faceAt(ff, [[t.a - 20, "brightGrin"], [hk1 - 1, "laughBig"], [hk1 + 9, "thrillB"], [t.honk - 12, "sly"], [t.honk - 1, "laughBig"], [t.honk + 9, "puzzled"], [jug0 + 6, "brightGrin"]], 10);
  const wa = s6WalkerA(ff), cH: V3 = [cl.p[0], 1.85, cl.p[2]], gA = E.gaze(cH, [wa.p[0], 1.6, wa.p[2]]), toA = sm((ff - (t.honk - 14)) / 4) * (1 - sm((ff - (t.honk + 12)) / 5));
  // (view "front" all the way round: on the half of the lap that rides AWAY from the lens he turns to us and rides
  // backwards, the showman; his back was on screen for half of every lap)
  const A: ClownAct = { p: cl.p, heading: cl.heading, metres: cl.metres, ...r, view: "front", expr: cfa.expr, blink: Math.max(r.blink ?? 0, cfa.lid), handK: 1.5,
    facing: ff < hk1 + 12 || toA < 0.3 ? 0 : undefined, look: lerp(r.look ?? 0, gA.look, toA), lookY: lerp(r.lookY ?? 0, gA.lookY, toA),
    roll: (r.roll ?? 0) * 0.6 + leanTo(E, cl.p, S6C.c, cl.v, S6C.r), hatLag: (r.hatLag ?? 0) + hn.hatLag, ruff: hn.ruff + jg.ruff + jg2.ruff, pom: jg.pom + jg2.pom, stretch: jg.stretch * jg2.stretch,
    face: { blush: 0.7 }, ...clownArms(1, ff < hk1 - 7 ? wv.arm : (r.armR as Arm), hn.arm) };
  return { A, bit, o, cl, hk1, jug0 };
};
/** the phone walker he honks at (drawPink): along S6_WA at the phone gait, at kr = atHonk on the honk frame */
const s6WalkerA = (f: number) => { const L = flat(S6_WA.from, S6_WA.to), v = PPL.gaitSpeed(S6_WA.gait) / 30, m0 = (S6_WA.atHonk + 2.4) * L / 5.2, m = m0 + (f - T6().honk) * v;
  return { p: lerp3(S6_WA.from, S6_WA.to, clamp(m / L, 0, 1)), m, h: headTo(S6_WA.from, S6_WA.to) }; };
/** THE TYRE TRACK on the brick (a flat card on the ground at his circle): a pale worn ring over the angle he has ridden,
 *  brighter where he has been round twice, with a glint on "circles" */
const drawTrack = (p: Pen, done: number, glow: number) => {
  const g = p.g, W = 256, k = W / (2 * (S6C.r + 0.3)), R = S6C.r * k, a0 = s6Ang(SH("S6").a - 12), th0 = Math.PI / 2 - a0;
  g.save(); g.lineCap = "round";
  for (let lap = 0; lap < 3; lap++) { const seg = clamp(done - lap * TAU, 0, TAU - 0.002); if (seg <= 0.01) break;
    g.strokeStyle = `rgba(255,246,226,${(0.5 + 0.12 * lap + 0.3 * glow).toFixed(3)})`; g.lineWidth = 0.13 * k; g.beginPath(); g.arc(W / 2, W / 2, R, th0 + lap * TAU, th0 + lap * TAU + seg); g.stroke();
    g.strokeStyle = `rgba(70,40,48,${(0.16 + 0.06 * lap).toFixed(3)})`; g.lineWidth = 0.025 * k; g.beginPath(); g.arc(W / 2, W / 2, R, th0 + lap * TAU, th0 + lap * TAU + seg); g.stroke(); }
  g.restore();
};
const S6 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T6(), a = t.a, sp = s6Pose(E, cam, f), { cl, o } = sp;
  // ---- the clown ----
  const c6 = clownBitAt(E, out, cam, "s6", sp.A, sp.bit, f);
  honkRings(E, out, cam, "s6", f, cl.p, c6.P, [sp.hk1, t.honk]);
  { const sk = 0.85 * c01((Math.abs(o.s) - 0.4) / 0.35) * c01((cl.v - 1.2) / 0.8); if (sk > 0.05) { const CA = PPL.clownAnchors(c6.P);
    ghost(E, out, cam, "s6speed", f, cl.p, (pen) => VFX.speedLines(pen, f, CA.chest, { dir: Math.sign(o.s), len: 80, n: 6, h: 150, u: CA.u, k: sk }), 1 / PPL.CLOWN_K); } }
  // his "?" when the blonde does not even look
  if (within(f, t.honk + 8, t.honk + 30)) { const CA = PPL.clownAnchors(c6.P); ghost(E, out, cam, "s6q", f, cl.p, (pen) => VFX.bang(pen, f, t.honk + 8, [CA.crown[0] + 0.9 * CA.r, CA.crown[1] - 10 * CA.u], { ch: "?", hold: 18, u: CA.u }), 1 / PPL.CLOWN_K); }
  // ---- "circles": the worn tyre track (grows with the angle ridden) + three time-lapse afterimages round it ----
  { const done = Math.max(0, s6Ang(a - 12) - s6Ang(f)), glow = PPL.bump(f, t.circles - 4, 4, 16), w = 2 * (S6C.r + 0.3);
    E.fx(out, `s6track|${E.q(done, 30)}|${E.q(glow, 10)}`, 256, 256, (pen) => drawTrack(pen, done, glow), [S6C.c[0], 0.024, S6C.c[2]], w, w, { flat: true, rot: 0 }); }
  if (within(f, t.circles - 8, t.circles + 16)) for (let k = 1; k <= 3; k++) {
    const q = s6Pose(E, cam, f - 4 * k), al = (0.42 - 0.1 * k) * PPL.bump(f, t.circles - 8, 5, 19);
    if (al < 0.02) continue;
    const { p: _p, heading: _h, metres: _m, ...rest } = q.A; void _p; void _h; void _m;
    const oq = E.orientSC(cam, q.cl.p, q.cl.heading), P: ClownPose = { s: oq.s, c: oq.c, spin: q.cl.metres / WHEEL_R, wheelR: WHEEL_R, light: E.light2D(cam), expr: "brightGrin", face: { blush: 0.6 }, ...rest };
    E.putGhost(out, cam, `s6after${k}|${f}`, q.cl.p, (pen) => PPL.asGhost(pen, al, "#fff4e0", 0.35, (qq) => PPL.drawClown(qq, P)), 1 / PPL.CLOWN_K);
  }
  // ---- THE PHONE WALKER he honks at (the pink-phone blonde): chatting, oblivious; she LAUGHS into her call on the honk ----
  { const wa = s6WalkerA(f), L = flat(S6_WA.from, S6_WA.to);
    if (wa.m >= 0 && wa.m <= L) { const ow = E.orientSC(cam, wa.p, wa.h), ch = PPL.phoneChat(f, 33), lg = within(f, t.honk + 1, t.honk + 14), WL = PPL.holdLife(f, 33, 0.3);
      const WP = fig(E, out, cam, "s6pink", wa.p, { ...WL, s: ow.s, c: ow.c, walk: PPL.walkPhase(wa.m, "phone"), go: 1, gait: "phone", expr: lg ? "laughBig" : ch.laughing ? "laughBig" : "bright", mouth: lg ? "laugh" : ch.mouth,
        nod: ch.nod + (lg ? 0.8 * Math.abs(Math.sin((TAU * f) / 8)) : 0), headTilt: lg ? -6 : 0, look: 0.2 * Math.sign(ow.s || 1), lookY: 0.2, ...PPL.bodyArms(isBack(ow.c), PPL.phoneArm(C.phonePink), PPL.talkHand(f, 33, ch.talking)) }, PPL.drawPink);
      const GA = PPL.anchors("pink", WP), ph = GA.hands[isBack(ow.c) ? 1 : 0];
      void ph; if (!lg) ghost(E, out, cam, "s6blahA", f, wa.p, (pen) => VFX.blah(pen, f, [GA.crown[0] + 1.05 * GA.r, GA.crown[1] + 4 * GA.u], { side: 1, u: GA.u, k: 1 })); } }
  // ---- THE GAPER (the beret woman, no phone): walks in, stops DEAD on "circles" (a take), gapes, then claps and laughs ----
  { const gs = t.circles - 1, sw = PPL.stopWalk(f, gs, "walk"), hd = headTo(S6_GAPE.from, S6_GAPE.at), gp = add3(S6_GAPE.at, mul3([Math.sin(hd), 0, Math.cos(hd)], sw.metres));
    if (flat(gp, S6_GAPE.at) < flat(S6_GAPE.from, S6_GAPE.at) + 0.01) {
      const turn = sm((f - gs - 2) / 7), gh = hd + wrapA(headTo(gp, S6C.c) - hd) * turn, og = E.orientSC(cam, gp, gh), sa = PPL.stopAt(f, gs), tk = PPL.takeAt(f, gs + 1, 1.1);
      const clap0 = gs + 16, clapK = PPL.gesture(f, clap0 - 4, { ant: 3, move: 5, over: 0.08 }), hit = Math.abs(Math.sin((Math.PI * (f - clap0)) / 8));
      const gz = E.gaze([gp[0], 1.5, gp[2]], [cl.p[0], 1.7, cl.p[2]]), gex: Expr = f < gs + 4 ? "bright" : f < clap0 ? "jawDrop" : f < clap0 + 20 ? "delightB" : "laughBig", hp = PPL.hopAt(f, clap0 + 22, 0.08, 9);
      const clap = (sd: number): Arm => ({ to: "hang", to2: "chest", k: clapK, dx: (14 - sd * (10 * hit - 4)) * c01(clapK), dy: -8 * c01(clapK), hand: "open", hs: 1.35, ang: sd * 70, front: true });
      const P0 = CROWD.crowdPose("beret", f, { s: og.s, c: og.c, metres: sw.go > 0.01 ? sw.metres + 9 : undefined, light: E.light2D(cam), seed: 160 });
      const GP: Pose = { ...P0, walk: sw.walk, go: sw.go, feet: sw.feet, tilt: (P0.tilt ?? 0) + sa.tilt * Math.sign(og.s || 1), duck: sa.duck, expr: gex, mouth: f >= clap0 + 20 ? "laugh" : undefined,
        look: gz.look, lookY: gz.lookY, blink: f >= gs + 4 && f < clap0 ? 0 : P0.blink, stretch: tk.stretch * hp.stretch, hop: hp.hop, nod: tk.nod, face: { browUp: PPL.browsUp(f, gs + 3, Infinity, 7) },
        ...(f >= clap0 - 8 ? { armL: clap(-1), armR: clap(1) } : f >= gs + 3 ? { armL: { to: "hang", to2: "chest", k: 0.5 * sm((f - gs - 3) / 5), dy: -10, hand: "open", hs: 1.3, front: true }, armR: { to: "hang", to2: "chest", k: 0.5 * sm((f - gs - 3) / 5), dy: -10, hand: "open", hs: 1.3, front: true } } : {}) };
      E.putFig(out, cam, `crowd|gaper|${E.fkey(GP)}`, gp, (pen) => CROWD.drawCrowd(pen, "beret", GP));
      if (within(f, gs + 3, clap0 + 40)) { const GA = PPL.figAnchors(CROWD.CROWD.beret.o, GP); ghost(E, out, cam, "s6gape", f, gp, (pen) => {
        VFX.surpriseLines(pen, f, gs + 4, GA.head, { u: GA.u }); VFX.bang(pen, f, gs + 5, [GA.crown[0], GA.crown[1] - 12 * GA.u], { ch: "!", hold: 14, u: GA.u });
        for (let n = 0; n < 5; n++) VFX.popBurst(pen, f, clap0 + 8 * n, [(GA.hands[0][0] + GA.hands[1][0]) / 2, (GA.hands[0][1] + GA.hands[1][1]) / 2 - 6 * GA.u], { r: 12, u: GA.u }); }); } } }
  // ---- THE NEAR PHONE WALKER (the lime-phone varsity man): crosses the near foreground on "in the middle of campus" ----
  { const L = flat(S6_WB.from, S6_WB.to), v = PPL.gaitSpeed(S6_WB.gait) / 30, m = L / 2 + (f - S6_WB.mid()) * v;
    if (m >= 0 && m <= L) { const bp = lerp3(S6_WB.from, S6_WB.to, m / L), ob = E.orientSC(cam, bp, headTo(S6_WB.from, S6_WB.to)), ch = PPL.phoneChat(f, 44), BL = PPL.holdLife(f, 44, 0.3);
      const BP: Pose = { ...BL, s: ob.s, c: ob.c, walk: PPL.walkPhase(m, "walk"), go: 1, gait: "walk", expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod, look: 0.15 * Math.sign(ob.s || 1), lookY: 0.35,
        ...PPL.bodyArms(isBack(ob.c), PPL.phoneArm(C.phoneLime), PPL.talkHand(f, 44, ch.talking)) };
      fig(E, out, cam, "s6lime", bp, BP, PPL.drawWhite); } }
  // ---- life behind ----
  const ex: Ex[] = [
    { id: "scarf", pts: [[-0.75, 0, -8.5], [-0.75, 0, -6.4], [-1.15, 0, 0.6]], t0: a - 20, tag: "6b" },
    { id: "cyclist", pts: [[-6, 0, -9.0], [11, 0, -8.2]], t0: a + 6, tag: "6g" },
    { id: "skater", pts: [[9.5, 0, -9.2], [-6.5, 0, -10.9]], t0: a - 30, tag: "6j" },
    { id: "chatA", pts: [[-2.9, 0, -9.6]], t0: 0, stand: true, heading: 1.6, tag: "6n", seed: 141 },
    { id: "chatB", pts: [[-2.3, 0, -9.75]], t0: 0, stand: true, heading: -1.5, tag: "6o", seed: 152 },
    { id: "books", pts: [[4.6, 0, -9.6], [3.4, 0, -3.0], [3.9, 0, 3.5]], t0: a - 70, tag: "6k" },
  ];
  for (const x of ex) extra(E, out, cam, f, x);
  frisbee(E, out, cam, f, "6", [3.7, 0, -4.3], [0.2, 0, -4.9], a - 20, 44, 24);
  const C6 = S6C.c;
  pigeons(E, out, cam, f, "6", [[C6[0] + 1.35, C6[2] + 0.75, 1], [C6[0] - 1.3, C6[2] + 0.85, -1], [C6[0] - 0.7, C6[2] - 1.45, 1], [C6[0] + 1.15, C6[2] - 1.2, -1]], (tt) => [s6Clown(tt).p]);
};

// ================================================================== the study corner (S7-S11)
/** friend B (pink cardigan: she talks in S8 / S9) and friend A (denim) */
const friend = (E: Eng, out: Stage, cam: CamInfo, which: 0 | 1, key: string, pos: V3, P: Pose): Pose => fig(E, out, cam, key, pos, P, (p, Q) => PPL.drawFriend(p, which, Q));
const ivDraw: Draw = (p, P) => PPL.drawInterviewer(p, 0, P);
const IVH: V3 = [STUDY.iv[0], 1.5, STUDY.iv[2]];
/** THE PEDAL MIME (friend B, "He was amazing!"; audit p2 M5): each fist rides its own crank beside her, just OUTSIDE her
 *  body's outline and below her chin (never over her mouth), half a turn apart, 14 f a turn. `chest` = her chest on the
 *  card (PPL.anchors). It starts in S8's last frames and runs on through S9 (one clock, f0: the cut does not restart it).
 *  ph = the crank angle, k = how far the fists are up */
const pedalMime = (f: number, f0: number, chest: P2) => {
  const k = clamp(PPL.gesture(f, f0, { move: 6, over: 0.12 }), -0.1, 1.12), ph = (TAU * Math.max(0, f - f0)) / 14;
  const arm = (sd: number, o: number): Arm => ({ to: "hang", to2: [chest[0] + sd * (142 + 54 * Math.cos(ph + o)), chest[1] + 4 - 72 * Math.sin(ph + o)], k, hand: "fist", hs: 1.9, front: true });
  return { armL: arm(-1, 0), armR: arm(1, Math.PI), ph, k: c01(k) };
};
// S7 INTERVIEWER: "Did you see anything unusual?" (FIX2 D4: she asks FACING the lens.) She stands in front of her table
// (the PSYCH STUDY sign over her shoulder), clipboard up, and leans in to the passer-by she has just stopped (friend B:
// her shoulder and bob are the near layer at the left edge, settling from her last step): the pen points on "you", draws a
// little circle in the air on "anything", opens out on "unusual?" with her brows up and her head tilted, then an expectant
// smile. B listens (a nod), then her hand goes up to her chin on "unusual?" (she thinks: S8 picks it up from the front).
const S7 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T7(), toCam: V3 = [cam.pos.x, 0, cam.pos.z], bh: V3 = [B7[0], 1.47, B7[2]], ih: V3 = [IV7[0], 1.5, IV7[2]];
  // ---- the interviewer ----
  const io = E.orientSC(cam, IV7, headTo(IV7, lerp3(B7, toCam, 0.5))), IL = PPL.holdLife(f, 12, 0.5), gzB = E.gaze(ih, bh);
  const leanK = PPL.gesture(f, t.a - 8, { move: 7, over: 0.1 }), up = PPL.gesture(f, t.see - 8, { move: 6, over: 0.12 }), un = PPL.gesture(f, t.unusual - 3, { move: 6, over: 0.15 });
  const circ = PPL.bump(f, t.anything - 2, 3, 10), ph = (TAU * (f - t.anything)) / 11;
  // p4 (audit p3 M2 / S7-1): a friendly smile, a LEAN IN on "anything", on "unusual" one brow up and the eyes narrowed
  // (curious, not blank), the pen TAPS the clipboard twice, then an expectant grin; one slow blink
  const fa = PPL.faceAt(f, [[t.a - 30, "bright"], [t.anything - 2, "asking"], [t.unusual - 2, "puzzled"], [t.end + 1, "brightGrin"]], 10);
  const lean7 = PPL.gesture(f, t.anything - 3, { move: 7, over: 0.14, settle: 9 }), sq7 = PPL.bump(f, t.unusual - 2, 3, 12) * 0.4, slow7 = PPL.bump(f, t.see + 2, 2, 3);
  const tapK = PPL.gestureBack(f, t.unusual - 3, t.unusual + 13, { ant: 2, move: 4, over: 0.06, settle: 3 }), taps = PPL.bump(f, t.unusual + 2, 2, 3) + PPL.bump(f, t.unusual + 8, 2, 3);
  const pen: Arm = { to: "hang", to2: "talk", k: clamp(up, -0.15, 1.1), dx: 5 * Math.cos(ph) * circ + 5 * c01(un) * (1 - c01(tapK)), dy: -5 * Math.sin(ph) * circ - 7 * c01(un) * (1 - c01(tapK)) - 2 * PPL.bump(f, t.see, 2, 4), hand: "pinch", hs: 1.2, ang: 20 + 35 * c01(un), prop: { k: "pencil" }, front: true };
  const pen2: Arm = c01(tapK) > 0.02 ? { to: "talk", to2: "write", k: clamp(tapK, 0, 1.06), dy: -9 * taps, hand: "pinch", hs: 1.2, ang: -20, prop: { k: "pencil" }, front: true } : pen;
  fig(E, out, cam, "iv0", IV7, { ...IL, s: io.s, c: io.c, expr: fa.expr, mouth: say("unusual", f, 3), nod: accent("unusual", f, 0.9) + 0.5 * PPL.bump(f, t.end + 1, 4, 8) + 0.6 * c01(lean7) + 0.4 * taps,
    look: gzB.look * 0.8, lookY: gzB.lookY, blink: Math.max(fa.lid, IL.blink, Math.min(1, slow7 * 1.4), sq7), tilt: IL.tilt * 0.5 - 3 * c01(leanK) - 5 * clamp(lean7, 0, 1.15), headTilt: IL.headTilt * 0.4 - 6 * clamp(un, 0, 1.2) - 3 * c01(lean7),
    stretch: 1 + 0.02 * PPL.bump(f, t.unusual - 2, 3, 8), face: { browUp: [PPL.browsUp(f, t.unusual - 3, Infinity, 9)[0] - 2 * sq7, PPL.browsUp(f, t.unusual - 3, Infinity, 9)[1] + 6 * c01((f - t.unusual + 2) / 4)] }, ...PPL.bodyArms(isBack(io.c), pen2, PPL.clipboardArm(-12)) }, ivDraw);
  // ---- friend B: the near layer (her back to the lens) ----
  const hdB = headTo(B7, IV7), bp = add3(B7, mul3([Math.sin(hdB), 0, Math.cos(hdB)], PPL.stopWalk(f, t.stop, "walk").metres)), sw = PPL.stopWalk(f, t.stop, "walk"), sa = PPL.stopAt(f, t.stop);
  const bo = E.orientSC(cam, bp, hdB), BL = PPL.holdLife(f, 71, 0.5), think = PPL.gesture(f, t.unusual + 5, { move: 7, over: 0.08 });
  friend(E, out, cam, 1, "fr1", bp, { ...BL, s: bo.s, c: bo.c, walk: sw.walk, go: sw.go, feet: sw.feet, tilt: BL.tilt * 0.5 + sa.tilt * Math.sign(bo.s || 1), duck: sa.duck,
    nod: 0.6 * PPL.bump(f, t.see + 2, 4, 8), headTilt: BL.headTilt * 0.5 + 6 * c01(think), ...PPL.stopOverlap(f, t.stop, Math.sign(bo.s || 1)),
    ...PPL.bodyArms(isBack(bo.c), { to: "hang", to2: "chin", k: 0.85 * clamp(think, -0.1, 1.1), hand: "ball", hs: 1.1 }, { to: "strap", hand: "ball" }) });
  // ---- life behind her ----
  const a = t.a;
  for (const x of [
    { id: "tote", pts: [[11, 0, -1.0], [2, 0, 0.5]], t0: a - 70, tag: "7a" },
    { id: "cyclist", pts: [[12, 0, -6.5], [0, 0, -5.4]], t0: a - 14, tag: "7b" },
    { id: "elder", pts: [[10.5, 0, 0.5], [6.5, 0, -3.5]], t0: a - 60, tag: "7c" },
  ] as Ex[]) extra(E, out, cam, f, x);
  pigeons(E, out, cam, f, "s7", [[5.6, 9.0, 1], [5.95, 8.6, -1], [5.3, 8.3, 1]], () => []);
};
// S8 FRIEND: the reaction, then "The clown?" (over the interviewer's shoulder onto friend B's face). She is thinking as the
// question ends (hand at her chin, eyes up), it DAWNS (a take, eyes back to the asker), the short laugh that opens her
// line bursts out (head back, shoulders shaking), then "The clown?": she leans in, brows up, eyes wide open, both open
// hands up; in the last frames her fists come up into the pedal mime (S9 carries it on). No second blink (audit p2).
const S8 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T8(), bp = STUDY.walkIn.to, bh: V3 = [bp[0], 1.45, bp[2]];
  const io = E.orientSC(cam, STUDY.iv, headTo(STUDY.iv, bp)), IL = PPL.holdLife(f, 12, 0.5);
  fig(E, out, cam, "iv0", STUDY.iv, { ...IL, s: io.s, c: io.c, expr: "bright", nod: 0.5 * PPL.bump(f, t.clownW + 2, 4, 8) + 0.6 * PPL.bump(f, t.clownQ + 1, 3, 7), headTilt: IL.headTilt + 3 * PPL.bump(f, t.laugh + 2, 4, 14) - 4 * PPL.bump(f, t.clownQ + 2, 4, 12),
    ...PPL.bodyArms(isBack(io.c), { to: "write", dy: -3, hand: "pinch", prop: { k: "pencil" }, ang: -30 }, PPL.clipboardArm(-14)) }, ivDraw);
  // p4 (audit p3 RETENTION-7a): the voice's short laugh opens the line (6 f), then "The clown?" is DELIGHTED RECOGNITION:
  // a take (down, pop), the eyes POP wide for 4 f, then the thrilled grin with the brows high, a lean in toward the asker,
  // a twinkle by her eyes; "clown?" is talked THROUGH the grin
  const laughing = f >= t.laugh && f < t.laugh + 6, think = 0.85 * (1 - PPL.gesture(f, t.laugh - 6, { ant: 2, move: 5, over: 0.05, settle: 4 }));
  const pop = f >= t.clownQ && f < t.clownQ + 4;
  const fa0 = PPL.faceAt(f, [[t.a - 30, "puzzled"], [t.laugh - 4, "brightGrin"], [t.laugh, "laughBig"], [t.laugh + 6, "brightGrin"], [t.clownQ + 4, "thrillB"]], 3), fa = { expr: pop ? ("jawDrop" as Expr) : fa0.expr, lid: fa0.lid };
  const gz = E.gaze(bh, IVH), L = PPL.holdLife(f, 71, 0.4), g = PPL.lookAt(f, [[t.a - 30, -0.7, -1.05], [t.laugh - 6, gz.look, gz.lookY]]);
  const tk = PPL.takeAt(f, t.clownQ - 4, 1.1), ls = PPL.laughShake(f, t.laugh, t.laugh + 6, 0.8), q = PPL.gestureBack(f, t.clownQ - 2, t.he - 9, { move: 6, over: 0.15 }, { ant: 2, move: 5, over: 0, settle: 3 });
  const bo = E.orientSC(cam, bp, headTo(bp, STUDY.iv)), side = Math.sign(bo.s || 1), pm = pedalMime(f, t.he - 3, PPL.anchors("friend1", { s: bo.s, c: bo.c }).chest);
  const openHand = (sd: number): Arm => pm.k > 0.01 ? (sd < 0 ? pm.armL : pm.armR)
    : sd > 0 ? { to: "hang", to2: "talk", k: clamp(q, -0.1, 1.15), dy: -10 * c01(q) - 3 * PPL.bump(f, t.clownW, 2, 5), hand: "open", hs: 1.3, ang: 40, front: true }
    : think > 0.02 && f < t.clownQ - 2 ? { to: "hang", to2: "chin", k: think, hand: "ball", hs: 1.1 }
    : { to: "hang", to2: "talk", k: clamp(q, -0.1, 1.15), dy: -10 * c01(q) - 3 * PPL.bump(f, t.clownW, 2, 5), hand: "open", hs: 1.3, ang: -40, front: true };
  const lean = PPL.gesture(f, t.clownQ - 1, { ant: 3, move: 6, over: 0.15, settle: 9 }), bu = PPL.browsUp(f, t.clownQ - 1, t.he - 2, 13);
  const BP8 = friend(E, out, cam, 1, "fr1", bp, { ...L, s: bo.s, c: bo.c, facing: f >= t.clownQ - 1 && pm.k < 0.5 ? 0 : undefined, expr: fa.expr, mouth: laughing ? "laugh" : f >= t.clownW - 1 ? sayGrin("amazing", f, 5, true) ?? "grin" : say("amazing", f, 5) ?? (f >= t.clownQ ? "smileWide" : undefined),
    look: g.look, lookY: g.lookY, blink: Math.max(f >= t.clownQ - 1 && f < t.clownQ + 8 ? 0 : fa.lid, g.blink), face: { browUp: bu, blush: 0.55 * c01(lean) },
    stretch: tk.stretch * ls.stretch * (1 + 0.03 * PPL.bump(f, t.clownW - 1, 2, 6) + 0.02 * pm.k * Math.sin(2 * pm.ph)), nod: tk.nod + ls.nod + accent("amazing", f, 0.7) - 0.6 * c01(lean),
    tilt: L.tilt * 0.5 + 4 * side * c01(q) * (1 - c01(lean)) - 2 * side * clamp(lean, 0, 1.15) * (1 - pm.k) + 3.5 * pm.k * Math.sin(pm.ph), headTilt: L.headTilt * 0.5 + 5 * c01(think) * (f < t.laugh - 5 ? 1 : 0) + ls.headTilt * side - 3 * side * c01(lean) - 2.5 * pm.k * Math.sin(pm.ph),
    duck: 0.06 * pm.k * (0.5 + 0.5 * Math.cos(2 * pm.ph)), armL: openHand(-1), armR: openHand(1) });
  // p3 (D9): it dawns (surprise lines), the tears of her short laugh; p4: the twinkle of recognition by her eyes
  if (within(f, t.laugh - 4, t.clownQ + 24)) { const A = PPL.anchors("friend1", BP8); ghost(E, out, cam, "s8fx", f, bp, (pen) => {
    VFX.surpriseLines(pen, f, t.clownQ, A.head, { u: A.u }); VFX.laughTears(pen, f, t.laugh + 1, A.head, { u: A.u, f1: t.laugh + 6 });
    if (within(f, t.clownQ + 1, t.clownQ + 22)) VFX.sparkles(pen, f, [A.head[0] - 1.25 * A.r, A.head[1] - 0.45 * A.r], { u: A.u, n: 3, r: 34, f0: t.clownQ + 1 }); }); }
  const a = t.a;
  for (const x of [
    { id: "cyclist", pts: [[-3, 0, 4.6], [6, 0, 3.4]], t0: a - 4, tag: "8a" },
    { id: "backpack", pts: [[0.4, 0, 7.6], [1.6, 0, 1.0]], t0: a - 30, tag: "8b" },
    { id: "beret", pts: [[3.2, 0, -1.5], [-3, 0, -0.6]], t0: a - 70, tag: "8c" },
  ] as Ex[]) extra(E, out, cam, f, x);
  lapClown(E, out, cam, f, "s8");
  pigeons(E, out, cam, f, "s8", [[1.75, 6.15, 1], [1.2, 5.4, -1], [2.35, 5.6, 1]], (tt) => { const p = where({ id: "backpack", pts: [[0.4, 0, 7.6], [1.6, 0, 1.0]], t0: a - 30 }, tt); return p ? [p] : []; });
};
// S9 FRIEND: "He was amazing!" B has stepped forward (in front of her friend, both arms clear) and MIMES PEDALLING, big:
// fists on two cranks wider than her body (14 f a turn, three turns), her shoulders rocking against them, a saddle bounce,
// her knees pumping; her eyes OPEN and on the asker through the line (the closed-eye laugh only in the last ~12 f).
// A watches with a closed smile, then claps (at his far side, clear of her fists) and laughs.
const S9 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T9(), B: V3 = [3.67, 0, 10.42], A = STUDY.pair[1], bh: V3 = [B[0], 1.45, B[2]], ah: V3 = [A[0], 1.5, A[2]];
  // ---- B talks ----
  const bo = E.orientSC(cam, B, headTo(B, STUDY.iv)), pm = pedalMime(f, t.he - 3, PPL.anchors("friend1", { s: bo.s, c: bo.c }).chest), stopK = 1 - c01((f - t.end - 2) / 6), lf = t.end - 9;
  // p4 (audit p3 RETENTION-7b): "amazing!" = THE BIGGEST GRIN OF THE FILM: the thrilled open-D grin talked through (only
  // open "laugh" and toothy "grin" shapes), the brows shot up, rosy cheeks, a little hop of joy on the word and a lean in;
  // the closed-eye laugh only on the last 9 f
  const fa = PPL.faceAt(f, [[t.a - 30, "delightB"], [t.amazing - 1, "thrillB"], [lf, "laughBig"]], 3);
  const bgz = E.gaze(bh, IVH), L = PPL.holdLife(f, 71, 0.3), ls = PPL.laughShake(f, lf + 1, t.b + 12, 0.8), side = Math.sign(bo.s || 1);
  const am = PPL.gesture(f, t.amazing - 2, { ant: 3, move: 5, over: 0.2, settle: 10 }), amK = c01(am), hp = PPL.hopAt(f, t.amazing - 1, 0.05, 9);
  const lift = (o: number): [number, number, number] => { const h = 0.11 * pm.k * stopK * Math.max(0, Math.sin(pm.ph + o)); return [0.02, h, -3 * h]; };
  const mth: MouthK | undefined = f < t.amazing - 1 ? sayGrin("amazing", f, 5) ?? "smileWide" : f < lf ? sayGrin("amazing", f, 5, true) ?? "laugh" : "laugh";
  const bu = PPL.browsUp(f, t.he - 2, lf, 6), bu2 = 6 * clamp(am, 0, 1.2) * (1 - sm((f - lf) / 5));
  const BIG = f >= t.amazing - 1 && f < lf, sv = say("amazing", f, 5), bigOpen = sv === "vA" || sv === "vO" ? 1 : sv === "vM" || sv === "vU" ? 0.15 : 0.5;
  const BP9: Pose = { light: E.light2D(cam), ...L, s: bo.s, c: bo.c, expr: fa.expr, mouth: BIG ? "laugh" : mth,
    nod: accent("amazing", f, 0.7) + 0.5 * pm.k * Math.abs(Math.sin(pm.ph)) + ls.nod - 0.7 * amK, tilt: 5.5 * pm.k * Math.sin(pm.ph) + 3 * side * amK, duck: 0.1 * pm.k * (0.5 + 0.5 * Math.cos(2 * pm.ph)),
    stretch: (1 + 0.025 * pm.k * Math.sin(2 * pm.ph)) * ls.stretch * hp.stretch, hop: hp.hop, look: bgz.look, lookY: bgz.lookY, blink: fa.lid, feet: [lift(0), lift(Math.PI)],
    face: { browUp: [bu[0] + bu2, bu[1] + bu2], blush: 0.45 + 0.45 * amK }, headTilt: L.headTilt * 0.4 - 4 * pm.k * Math.sin(pm.ph) + ls.headTilt * side + 3 * side * amK, armL: pm.armL, armR: pm.armR };
  figX(E, out, cam, "fr1", B, BP9, (p, Q) => PPL.drawFriend(p, 1, Q), BIG ? `big${E.q(bigOpen, 10)}` : "", (pen, Q) => { if (BIG) bigD(pen, PPL.anchors("friend1", Q), bigOpen); });
  // ---- A: a closed smile until he claps (audit p2), then the laugh ----
  // (the hands MEET on clap0 + 9 n: sound_cues.json lists exactly those frames)
  const clap0 = t.amazing - 4, clapK = PPL.gestureBack(f, clap0 - 6, t.end + 14, { ant: 3, move: 5, over: 0.06 }), clapping = clapK > 0.5, alaugh = f >= t.amazing + 6;
  const ao = E.orientSC(cam, A, headTo(A, STUDY.iv)), agz = E.gaze(ah, bh), agzI = E.gaze(ah, IVH), aL = PPL.holdLife(f, 70, 0.5);
  const clap = (sd: number): Arm => ({ to: "hang", to2: "chest", k: clapK, dx: (16 - sd * (11 * Math.abs(Math.sin(Math.PI * (f - clap0) / 9)) - 5)) * c01(clapK), dy: -6 * c01(clapK), hand: "open", hs: 1.2, ang: sd * 70, front: true });
  const afa = PPL.faceAt(f, [[t.a - 30, "bright"], [t.amazing + 6, "laughBig"]], 3);
  const AP9 = friend(E, out, cam, 0, "fr0", A, { ...aL, s: ao.s, c: ao.c, expr: afa.expr, mouth: alaugh ? "laugh" : clapping ? "smileWide" : "smallSmile", look: f < t.amazing + 14 ? agz.look : agzI.look, lookY: f < t.amazing + 14 ? agz.lookY : agzI.lookY,
    blink: Math.max(afa.lid, PPL.blinkAt(f, 70)), nod: alaugh ? 0.8 * Math.abs(Math.sin(TAU * f / 8)) : 0.5 * PPL.bump(f, t.he + 2, 4, 8), headTilt: alaugh ? -8 : aL.headTilt,
    armL: clap(-1), armR: clap(1) });
  // p3 (D9): she loved him (hearts on "amazing!"); a little burst on each clap, her friend's tears of laughter
  if (f >= t.amazing + 2) { const BA = PPL.anchors("friend1", BP9); ghost(E, out, cam, "s9hearts", f, B, (pen) => VFX.hearts(pen, f, t.amazing + 2, [BA.head[0] - 0.7 * BA.r, BA.head[1] - 1.05 * BA.r], { n: 3, rise: 1.6, u: BA.u })); }
  if (f >= clap0) { const AA = PPL.anchors("friend0", AP9), mid: P2 = [(AA.hands[0][0] + AA.hands[1][0]) / 2, (AA.hands[0][1] + AA.hands[1][1]) / 2 - 6 * AA.u];
    ghost(E, out, cam, "s9clap", f, A, (pen) => { for (let n = 0; n < 5; n++) VFX.popBurst(pen, f, clap0 + 9 * n, mid, { r: 13, u: AA.u }); if (alaugh) VFX.laughTears(pen, f, t.amazing + 8, AA.head, { u: AA.u, f1: t.b + 10 }); }); }
  // (the interviewer is off the right edge in this framing: the wider mime needs the room)
  void ivDraw;
  const a = t.a;
  for (const x of [
    { id: "parka", pts: [[-2.5, 0, 6.2], [2.8, 0, 3.6]], t0: a - 40, tag: "9a" },
    { id: "dogwalker", pts: [[0.6, 0, 1.5], [-2.6, 0, 7.0]], t0: a - 80, tag: "9b" },
    { id: "runner", pts: [[-3.5, 0, -3.0], [2.5, 0, -6.5]], t0: a - 20, tag: "9c" },
  ] as Ex[]) extra(E, out, cam, f, x);
  pigeons(E, out, cam, f, "s9", [[1.9, 7.1, 1], [2.5, 7.45, -1], [1.4, 6.6, 1]], (tt) => { const p = where({ id: "parka", pts: [[-2.5, 0, 6.2], [2.8, 0, 3.6]], t0: a - 40 }, tt); return p ? [p] : []; });
};
/** a clown bit without its own face (his honk blast holds through the bit's wind-up) */
const hatTipKeepFace = (bit: PPL.ClownBit, keep: boolean): PPL.ClownBit => { if (!keep) return bit; const { expr: _e, ...pose } = bit.pose; void _e; return { ...bit, pose }; };
/** where the FAR clown idles in S10 (on the path west of the sculpture: in the gap right of the dude's head through the
 *  S10 lens, clear of the banner lamp and of the table) */
const S10_CLOWN: V3 = [-2.5, 0, -6.3];
// S10 HEADPHONES: "Dude, the unicycle guy!" (the asked person LEFT, the asker off the right edge, as in S7-S11.) The cup
// is ON when the shot clears: his hand hooks it off his ear on "Dude," (still bopping to the other one), then the same
// hand makes a fist beside his shoulder and jerks a THUMB back at the clown, who is idling and waving far behind him (the
// thumb out sideways: nothing that reads as a raised finger), a jab on "unicycle" and on "guy!"; his eyes flick along the
// thumb first, the head follows, then back to the asker with a grin. Far behind, the clown hears it: a honk and a tip of
// his hat.
const S10 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T10(), p = STUDY.stop, aimAt: V3 = [cam.pos.x + 0.6, 0, cam.pos.z + 0.25];
  const o = E.orientSC(cam, p, headTo(p, aimAt)), co = PPL.cupOffArm(f, t.dude + 2, 1);
  // ---- the far clown: idling (rocking) on the spot, waving at the lens; noticed -> a honk + a tip of the hat ----
  const rk = PPL.clownRock(f), chd = headTo(S10_CLOWN, [cam.pos.x, 0, cam.pos.z]) + 0.9, cp: V3 = [S10_CLOWN[0] + rk.d * Math.sin(chd), 0, S10_CLOWN[2] + rk.d * Math.cos(chd)];
  // p4: the far clown ANSWERS "guy!": a honk 3 f after the word (the blast face), then a tip of the hat into the cut
  const cr = PPL.clownRide(f, 4), hk = t.guy + 3, tip0 = hk + 11;
  const wR = PPL.waveArm(f, t.a - 20, 1, { swings: 40, per: 11, amp: 30 }), chn = hornArm(f, [hk]), cj = PPL.honkJiggle(f, hk), cco = E.orientSC(cam, cp, chd);
  const c10 = clownBitAt(E, out, cam, "s10", { p: cp, heading: chd, metres: rk.d, ...cr, facing: 0, look: 0, lookY: 0.1, roll: (cr.roll ?? 0) * 0.5 + rk.roll, tilt: rk.tilt, handK: 1.5,
    hatLag: (cr.hatLag ?? 0) + chn.hatLag, ruff: chn.ruff + cj.ruff, pom: cj.pom, stretch: cj.stretch, expr: f >= hk - 1 && f < hk + 10 ? "laughBig" : f >= t.uni - 4 ? "thrillB" : "brightGrin", face: { blush: 0.7 },
    ...clownArms(cco.c, f < tip0 - 6 ? wR.arm : (cr.armR as Arm), chn.arm) }, f >= tip0 - 8 ? hatTipKeepFace(PPL.clownBit("hatTip", f, tip0, 1), f < hk + 10) : null, f);
  // ---- the dude ----
  // p4 (audit p3 RETENTION-8): his EYES DART to the clown 3 f before the thumb comes up, the head follows 8 deg; the thumb
  // PUMPS on "unicycle" and harder on "guy!" (the torso leans into it), where his eyes snap BACK to the asker with the brows
  // up and a grin; after the word the thumb keeps pumping on the beat of his music, with a heel bounce
  const up = PPL.gesture(f, t.uni - 8, { move: 6, over: 0.14 }), upK = clamp(up, -0.15, 1.12), beat = 1800 / 104;
  const pumpAt = (f0: number) => PPL.gestureBack(f, f0 - 2, f0 + 4, { ant: 3, move: 3, over: 0.12, settle: 2 }, { ant: 0, move: 5, over: 0.06, settle: 4 });
  const onBeat = f > t.guy + 8 ? PPL.bump(((f - t.guy - 8) % beat + beat) % beat, 0, 3, 6) : 0;
  const pumps = pumpAt(t.uni) + 1.3 * pumpAt(t.guy) + 0.55 * onBeat, jab = clamp(pumps, -0.3, 1.5), pk = clamp(pumps, 0, 1.3);
  const th: Arm = { ...co.arm, fk: [15 + 16 * jab, 160 - 38 * jab], fkK: upK, hand: up > 0.4 ? "fist" : "grip", hs: up > 0.4 ? 1.45 : 1.1, front: true };
  const eyeK = sm((f - (t.uni - 11)) / 2) * (1 - sm((f - (t.guy - 1)) / 2)), headK = sm((f - (t.uni - 9)) / 6) * (1 - sm((f - (t.guy - 1)) / 5));
  const fa = PPL.faceAt(f, [[t.a - 20, "bright"], [t.dude + 4, "brightGrin"], [t.guy - 1, "delightB"]]);
  const L = PPL.holdLife(f, 6, 0.4), bop = PPL.bopAt(f, 104, 0.8), gz = E.gaze([p[0], 1.5, p[2]], [aimAt[0], 1.5, aimAt[2]]);
  const heel = f > t.guy + 6 ? 0.022 * Math.max(0, Math.sin((TAU * (f - t.guy - 6)) / beat)) : 0, bu = PPL.browsUp(f, t.uni - 4, Infinity, 7), bu2 = PPL.browsUp(f, t.guy - 1, Infinity, 6);
  const P: Pose = { ...L, s: o.s, c: o.c, facing: headK > 0.5 ? 1 : undefined, expr: fa.expr, mouth: f >= t.guy - 1 ? sayGrin("dude", f, 2, true) : say("dude", f, 2), nod: bop.nod! + accent("dude", f, 0.9) + 0.7 * pk,
    headTilt: bop.headTilt! + L.headTilt + 8 * headK, tilt: bop.tilt! + L.tilt - 2 * c01(up) + 4 * pk,
    look: lerp(gz.look, 1.25, eyeK), lookY: lerp(gz.lookY, 0.05, eyeK), blink: Math.max(fa.lid, L.blink), face: { browUp: [bu[0] + bu2[0], bu[1] + bu2[1]] },
    stretch: 1 + 0.03 * PPL.bump(f, t.uni - 2, 2, 6) + 0.04 * PPL.bump(f, t.guy - 2, 2, 6), hop: heel, cupOff: co.cupOff, armR: th, armL: { to: "hang", to2: "talk", k: 0.45 * PPL.gestureBack(f, t.dude - 4, t.uni - 8, { move: 6 }), hand: "open", hs: 1.15, ang: -40 } };
  // the thumb: drawn out of the fist, sideways toward the clown (the kit's thumbs-up stays upright and read as "like")
  const AN = PPL.anchors("dude", P), hnd = AN.hands[1], tu = AN.u, tk = c01((up - 0.4) / 0.5);
  figX(E, out, cam, "dude", p, P, PPL.drawDude, tk > 0.02 ? `th${E.q(tk, 20)}|${E.q(jab, 20)}` : "", (pen) => {
    if (tk <= 0.02) return;
    const L2 = (17 + 8 * clamp(jab, 0, 1.5)) * tu * tk, x0 = hnd[0] + 8 * tu, y0 = hnd[1] - 5 * tu, x1 = x0 + L2, y1 = y0 + 2 * tu;
    pen.band([[x0, y0], [x1, y1]], SKIN, 10 * tu, 1.6 * tu, "round");
  });
  // p3 (D9): the music leaks out of the lifted cup (notes); the far clown's honk rings
  if (co.cupOff.k > 0.05) ghost(E, out, cam, "s10notes", f, p, (pen) => VFX.notes(pen, f, [AN.head[0] + AN.r + 26 * tu, AN.head[1] - 0.25 * AN.r], { side: 1, k: c01(co.cupOff.k), u: tu }));
  honkRings(E, out, cam, "s10", f, cp, c10.P, [hk]);
  const a = t.a;
  for (const x of [
    { id: "skater", pts: [[-9, 0, 1.0], [3.5, 0, 3.6]], t0: a - 60, tag: "10a" },
    { id: "chatA", pts: [[-6.4, 0, -9.4]], t0: 0, stand: true, heading: 2.4, tag: "10c" },
    { id: "chatB", pts: [[-6.85, 0, -9.95]], t0: 0, stand: true, heading: -0.6, tag: "10d" },
    { id: "runner", pts: [[-1.6, 0, -13.5], [-7, 0, -3]], t0: a - 30, tag: "10e" },
  ] as Ex[]) extra(E, out, cam, f, x);
  pigeons(E, out, cam, f, "s10", [[0.9, 3.6, 1], [1.5, 3.2, -1], [0.3, 3.0, 1]], (tt) => { const q = where({ id: "skater", pts: [[-9, 0, 1.0], [3.5, 0, 3.6]], t0: a - 60 }, tt); return q ? [q] : []; });
};
// S11 PHONE GUY: "Sorry... what clown?" Phone still at his ear, polite ("Sorry..." a small bow, palm up), puzzled on
// "what clown?" (one brow up, head tilt, a palm-up shrug), talking on his words, eyes on the interviewer, SHARP through
// his line (FIX2 D4: the focus leaves him only after "clown?"); BEHIND him the clown rides by right -> left, slows in the
// gap right of his head and waves, then HONKS just after "clown?" and rides on; pigeons scatter from the clown's wheel.
// The team member at the table: deadpan at her clipboard, ONE slow blink, a casual look, then the double-take on the honk.
const S11 = (E: Eng, out: Stage, cam: CamInfo, f: number) => {
  const t = T11(), p = STUDY.stop, toCam: V3 = [cam.pos.x, 0, cam.pos.z], aimAt = lerp3(STUDY.iv, toCam, 0.55);
  const o = E.orientSC(cam, p, headTo(p, aimAt)), L = PPL.holdLife(f, 21, 0.4), gz = E.gaze([p[0], 1.55, p[2]], IVH);
  // p4 (audit p3 RETENTION-9): "what" = the SQUINT (the brows knit, the eyes narrow and dart left, right, left, right, 4 f
  // each, the mouth an "o" on its side); "clown?" = the SHRUG (eyes open, one brow shoots up, the free palm up, the head
  // sinks into the shoulders); after the line he keeps the lopsided "hmm" (he still has no idea)
  const cw = t.cw, sorry = PPL.gestureBack(f, t.sorry - 2, t.what - 5, { move: 6 }), shrug = PPL.gesture(f, cw - 3, { move: 6, over: 0.18 }), shK = c01(shrug);
  const sqz = sm((f - (t.what - 4)) / 3) * (1 - sm((f - cw) / 3));
  const dv = darts(f, [[t.what - 3, -1.1], [t.what + 1, 1.1], [t.what + 5, -1.1], [t.what + 9, 1.0], [cw + 1, 0]]), dvH = darts(f - 2, [[t.what - 3, -1.1], [t.what + 1, 1.1], [t.what + 5, -1.1], [t.what + 9, 1.0], [cw + 1, 0]]);
  const inSq = sm((f - (t.what - 4)) / 2) * (1 - sm((f - (cw + 1)) / 3));
  const fa = PPL.faceAt(f, [[t.a - 20, "polite"], [t.what - 4, "puzzled"]]);
  const sayM = say("whatClown", f, 7), inWhat = f >= t.what - 1 && f < cw - 1, inClown = f >= cw - 1;
  const mouth: MouthK | undefined = sayM && inWhat ? (sayM === "vA" ? "vO" : "o") : sayM && inClown ? (sayM === "vA" ? "vA" : sayM === "vM" ? "wave" : "vO") : sayM ?? (f > t.end ? "hmm" : undefined);
  const free: Arm = shrug > 0.02 ? { to: "hang", to2: "talk", k: shrug, hand: "open", hs: 1.3, ang: -50, dy: 4 - 6 * shK }   // palm up at his side: the gap by his head stays clear for the clown
    : { to: "hang", to2: "chest", k: sorry * 0.8, hand: "open", hs: 1.2, ang: -60 };
  const GP11 = fig(E, out, cam, "phoneguy", p, { ...L, s: o.s, c: o.c, expr: fa.expr, mouth, nod: accent("whatClown", f, 0.6) + 0.9 * PPL.bump(f, t.sorry, 5, 10) + 1.1 * shK - 0.5 * PPL.bump(f, cw - 4, 3, 4),
    headTilt: L.headTilt - 4 * c01(sorry) + 3.5 * dvH * inSq + 8 * shK, tilt: L.tilt + 2 * shK, look: lerp(gz.look + L.look, dv, inSq), lookY: lerp(gz.lookY, 0.15, inSq), blink: Math.max(fa.lid, L.blink * (1 - inSq), 0.55 * sqz),
    breath: L.breath + 2.4 * shK, stretch: 1 + 0.035 * PPL.bump(f, cw - 2, 3, 9) - 0.02 * sqz,
    face: { browUp: [-3.5 * sqz, -3.5 * sqz + 11 * shK] }, ...PPL.bodyArms(isBack(o.c), PPL.phoneArm(C.phoneRed), free) }, PPL.drawPhoneGuy);
  // ---- the clown rides by behind him: a showman's grin to the lens, a cheeky WINK with a brow waggle while he waves,
  // delight on "clown?", then the honk BLAST (eyes squeezed shut) ----
  const cl = s11Clown(f), r = PPL.clownRide(f, 9), co = E.orientSC(cam, cl.p, cl.heading);
  const wv = PPL.waveArm(f, t.what - 6, -1, { swings: 3, per: 10, amp: 30, down: t.end + 2 });
  const honk = t.end + 2, hn = hornArm(f, [honk]), hj = PPL.honkJiggle(f, honk);
  const cfa = PPL.faceAt(f, [[t.a - 20, "brightGrin"], [t.what - 10, "thrillB"], [cw, "delightB"], [honk - 1, "laughBig"]], 10);
  const wink = within(f, t.what - 2, t.what + 12), wag = wink ? 6 * Math.abs(Math.sin((Math.PI * (f - t.what + 2)) / 4)) : 0;
  const c11 = clownAt(E, out, cam, "s11", { p: cl.p, heading: cl.heading, metres: cl.metres, ...r, expr: cfa.expr, facing: f > t.what - 14 && f < honk + 10 ? 0 : undefined, look: f > t.what - 14 ? 0 : r.look,
    blink: Math.max(r.blink ?? 0, cfa.lid), headTilt: wv.headTilt, tilt: wv.tilt - 3 * c01((1.6 - cl.v) / 1.2), hatLag: (r.hatLag ?? 0) + hn.hatLag, ruff: hn.ruff + hj.ruff, pom: hj.pom, stretch: hj.stretch,
    face: { blush: 0.75, ...(wink ? { wink: 1 } : {}), browUp: [wag, wag] }, ...clownArms(co.c, f > t.what - 18 ? wv.arm : (r.armR as Arm), hn.arm) });
  // ---- the team member at the table: deadpan at her clipboard (one slow blink), a casual first glance at the clown on
  // "what", back to her page, then the FULL double take (the head snaps back, eyes wide, brows up, jaw drop) by "clown?" + 7 ----
  const dt0 = t.what + 2, dir = Math.sign((cl.p[0] - TEAM_B[0]) * E.camR.x + (cl.p[2] - TEAM_B[2]) * E.camR.z) || -1, dt = PPL.doubleTake(f, dt0, dir), seen = f >= dt0 + 17;
  const glance = f >= dt0 + 1 && f < dt0 + 10, slow = Math.max(PPL.bump(f, t.a + 12, 4, 5), dt.blink);
  const TB: V3 = [TEAM_B[0] - 0.22, 0, TEAM_B[2] + 0.05], TL = PPL.holdLife(f, 44, 0.6), to2 = E.orientSC(cam, TB, headTo(TB, STUDY.stop)), tk2 = PPL.takeAt(f, dt0 + 14, 1.15);
  const TP11 = fig(E, out, cam, "teamB", TB, { ...TL, s: to2.s, c: to2.c, expr: seen ? "jawDrop" : glance ? "listenB" : "focusB", look: dt.look, lookY: seen || glance ? 0.1 : 1, blink: slow,
    headTilt: TL.headTilt * 0.5 + dt.headTilt, stretch: dt.stretch * tk2.stretch, nod: dt.nod + tk2.nod * 0.5, face: seen ? { browUp: [3, 3] } : undefined,
    ...PPL.bodyArms(isBack(to2.c), seen ? { to: "write", dy: -14, dx: 4, hand: "open", hs: 1.15, ang: -30 } : PPL.writeArm(f), PPL.clipboardArm(seen ? -16 : -6)) }, (pen, P) => PPL.drawInterviewer(pen, 1, P));
  // p3 (D9): the "?" over the puzzled phone guy; the clown's honk rings and his speed streaks while he still rides fast;
  // the team member's "!" on her double-take
  if (within(f, t.what - 1, t.b + 8)) { const A = PPL.anchors("phoneGuy", GP11); ghost(E, out, cam, "s11q", f, p, (pen) => VFX.bang(pen, f, t.what - 1, [A.crown[0] - 0.95 * A.r, A.crown[1] + 2 * A.u], { ch: "?", hold: 40, u: A.u })); }
  honkRings(E, out, cam, "s11", f, cl.p, c11.P, [honk]);
  { const sk = 0.8 * c01((cl.v - 1.5) / 1.0) * c01(Math.abs(co.s) * 2); if (sk > 0.05) { const CA = PPL.clownAnchors(c11.P);
    ghost(E, out, cam, "s11speed", f, cl.p, (pen) => VFX.speedLines(pen, f, CA.chest, { dir: Math.sign(co.s || -1), len: 70, n: 6, h: 150, u: CA.u, k: sk }), 1 / PPL.CLOWN_K); } }
  if (within(f, dt0 + 16, dt0 + 44)) { const A = PPL.anchors("ask1", TP11); ghost(E, out, cam, "s11bang", f, TB, (pen) => {
    VFX.surpriseLines(pen, f, dt0 + 16, A.head, { u: A.u }); VFX.bang(pen, f, dt0 + 17, [A.crown[0], A.crown[1] - 12 * A.u], { ch: "!", hold: 26, u: A.u }); }); }
  const a = t.a;
  for (const x of [
    { id: "tote", pts: [[-3, 0, -4.5], [9, 0, -5.5]], t0: a - 80, tag: "11a" },
    { id: "beret", pts: [[9, 0, -9], [-2, 0, -8]], t0: a - 120, tag: "11b" },
    { id: "cyclist", pts: [[-4, 0, -12], [12, 0, -13]], t0: a - 30, tag: "11c" },
  ] as Ex[]) extra(E, out, cam, f, x);
  pigeons(E, out, cam, f, "s11", [[5.3, 6.75, -1], [4.6, 6.45, 1], [3.9, 6.7, -1]], (tt) => [s11Clown(tt).p]);
};

// ================================================================== the dispatch
export const stageStory1 = (E: Eng, out: Stage, cam: CamInfo, id: number, f: number, R: StageInfo): void => {
  void R;
  switch (id) {
    case SID.S1: return S1(E, out, cam, f);
    case SID.S2: return S2(E, out, cam, f);
    case SID.S3: return S3(E, out, cam, f);
    case SID.S4: return S4(E, out, cam, f);
    case SID.S5: return S5(E, out, cam, f);
    case SID.S6: return S6(E, out, cam, f);
    case SID.S7: return S7(E, out, cam, f);
    case SID.S8: return S8(E, out, cam, f);
    case SID.S9: return S9(E, out, cam, f);
    case SID.S10: return S10(E, out, cam, f);
    case SID.S11: return S11(E, out, cam, f);
    default: return;
  }
};
void (null as unknown as P2); void (null as unknown as Expr); void dirOf; void lerp3; void S2P0; void sub3; void prog;

// CAMERAS v2 of "The Clown Nobody Saw" (owner EDIT; BUILD_PLAN_v2.md, the ten laws). One camera per shot (26), every one
// MOVING in every frame (Hermite paths through keyed framings = velocity-continuous; creeps on top of every key; bell
// glides of 30-55 f inside a shot; low lenses; a near layer where the set has one). Every key frame is a BEAT word or an
// anchor of plan.ts; framings are written as "world point T at screen fraction (xs, ys)" so the animators know where the
// action must be (EDIT_V2.md lists them). Remapped shots (S20 slow motion, E1-E3 replays) are cameras on their SOURCE
// shot's picture clock: remap.ts. Retires cams_square.ts (cut 1; kept in out/clown/_v1_src/).
import { SQ, OFFICE, STUDY, STORY, CLOWN_Q3_STOP, clownQ, clownQ0p, billCentre, COUNT, DUCKS, OVAL, lapPos, type V3 } from "./plan";
import { SHOTS, SID, BEAT, TOTAL, hasLine } from "./beats";
import { pt } from "./remap";
import { IV7, s2Hyman, S6C, s6Clown } from "./cast_story1_marks";
import { cam16, push16, cam14T, cam14XS } from "./cast_story2_marks";
import { fr, full, mixCam, glide, clamp01, smooth, at, type Key, type Dof, type Shot, type Cam } from "./camkit";

const S = (k: string) => SHOTS[SID[k] - 1];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** office point (office-local metres -> world) */
const ofc = (d: V3): V3 => add(OFFICE.base, d);

// ---------------- the path camera: Hermite through keyed framings (C1 in time: velocity never jumps) ----------------
/** a camera key: at picture frame f the lens is at `pos` and world point `t` sits at screen (xs, ys) with vertical fov */
export type PK = { f: number; pos: V3; t: V3; xs: number; ys: number; fov: number; roll?: number };
const K = (f: number, pos: V3, t: V3, xs: number, ys: number, fov: number, roll = 0): PK => ({ f, pos, t, xs, ys, fov, roll });
type Q = { f: number; pos: V3; look: V3; fov: number; roll: number };
const toQ = (k: PK): Q => { const F = fr(k.pos, k.t, k.fov, k.xs, k.ys); return { f: k.f, pos: F.pos, look: F.look, fov: k.fov, roll: k.roll ?? 0 }; };
/** natural-cubic-like Hermite: tangents from the neighbours (time-scaled); the first / last keys keep the neighbour slope,
 *  so the camera is still moving at both ends of its life (dissolves, cuts) */
const hermite = (qs: Q[], f: number): Cam => {
  const n = qs.length;
  const comp = (g: (q: Q) => number[]): number[] => {
    if (n === 1) return g(qs[0]);
    const slope = (i: number) => {
      const a = qs[Math.max(0, i - 1)], b = qs[Math.min(n - 1, i + 1)];
      return g(b).map((v, c) => (v - g(a)[c]) / (b.f - a.f));
    };
    if (f <= qs[0].f) return g(qs[0]).map((v, c) => v + slope(0)[c] * (f - qs[0].f));
    if (f >= qs[n - 1].f) return g(qs[n - 1]).map((v, c) => v + slope(n - 1)[c] * (f - qs[n - 1].f));
    let i = 0; while (i + 2 < n && f > qs[i + 1].f) i++;
    const h = qs[i + 1].f - qs[i].f, u = (f - qs[i].f) / h, u2 = u * u, u3 = u2 * u, m0 = slope(i), m1 = slope(i + 1), p0 = g(qs[i]), p1 = g(qs[i + 1]);
    return p0.map((v, c) => (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * h * m0[c] + (-2 * u3 + 3 * u2) * p1[c] + (u3 - u2) * h * m1[c]);
  };
  const v = comp((q) => [...q.pos, ...q.look, q.fov, q.roll]);
  return { pos: [v[0], v[1], v[2]], look: [v[3], v[4], v[5]], fov: v[6], roll: v[7] };
};
/** a shot camera from keys (sorted by frame) */
const path = (keys: PK[]) => { const qs = keys.map(toQ).sort((a, b) => a.f - b.f); return (f: number): Shot => hermite(qs, f); };
/** a framing that FOLLOWS a moving world point: the lens rides at offset `off` from it (an offset that may itself glide),
 *  the point held at screen (xs, ys) */
const follow = (tgt: (f: number) => V3, off: (f: number) => V3, xs: (f: number) => number, ys: (f: number) => number, fov: (f: number) => number) =>
  (f: number): Shot => { const t = tgt(f), F = fr(add(t, off(f)), t, fov(f), xs(f), ys(f)); return { pos: F.pos, look: F.look, fov: F.fov }; };
/** a slow drift added on top of any framing (lens and look move together by d metres per frame since f0): keeps a hold alive */
const drift = (s: (f: number) => Shot, f0: number, d: V3) => (f: number): Shot => {
  const c = full(s(f)), k = f - f0;
  return { ...c, pos: [c.pos[0] + d[0] * k, c.pos[1] + d[1] * k, c.pos[2] + d[2] * k], look: [c.look[0] + d[0] * k, c.look[1] + d[1] * k, c.look[2] + d[2] * k] };
};
/** a symmetric glide from framing a to framing b over [f0, f0 + dur] (both keep moving: the blend is between two LIVE cameras) */
const glideAB = (a: (f: number) => Shot, b: (f: number) => Shot, f0: number, dur: number) => (f: number): Shot => mixCam(full(a(f)), full(b(f)), glide((f - f0) / dur));
/** a snap push: the lens slides toward its look point by `k` (0.2 = 20 % closer) in `dur` frames from f0, front-loaded */
const snap = (s: (f: number) => Shot, f0: number, dur: number, k: number) => (f: number): Shot => {
  const c = full(s(f)), u = clamp01((f - f0) / dur), e = 1 - (1 - u) ** 2.4, m = 1 - k * e;
  return { ...c, pos: [c.look[0] + (c.pos[0] - c.look[0]) * m, c.look[1] + (c.pos[1] - c.look[1]) * m, c.look[2] + (c.pos[2] - c.look[2]) * m] };
};
const one = (s: (f: number) => Shot): Key[] => [{ f: -1e6, s }];
/** STORY-1 (p4, the viewer's 32-36 s dip: "the interviews feel like a predictable list"): a WHIP-PAN across a cut. The lens
 *  YAWS about its own position, accelerating into the cut ("out") or arriving from the other side and braking onto its
 *  framing ("in"), so both layers of the 7 f dissolve streak the same way (Clown.tsx's camera motion blur switches on
 *  above ~2.2 %W/f). deg = the yaw L frames past the cut (+ = toward screen right); speed at the cut = 2 deg / L per frame */
const whip = (s: (f: number) => Shot, cut: number, side: "in" | "out", deg: number, L = 6) => (f: number): Shot => {
  const c = full(s(f)), u = side === "out" ? Math.max(0, (f - (cut - L)) / L) : Math.max(0, (cut + L - f) / L);
  const a = ((side === "out" ? 1 : -1) * deg * u * u * Math.PI) / 180;
  if (a === 0) return c;
  const dx = c.look[0] - c.pos[0], dz = c.look[2] - c.pos[2], cs = Math.cos(a), sn = Math.sin(a);
  return { ...c, look: [c.pos[0] + dx * cs - dz * sn, c.look[1], c.pos[2] + dz * cs + dx * sn], roll: c.roll + 0.1 * a };
};
/** a shot's progress u (0 at its first frame, 1 at its last), NOT clamped to 0..1 (only to -0.3..1.3): follow cameras keep
 *  their velocity through the dissolve tails on either side */
const uq = (key: string, f: number) => { const s = S(key); return Math.max(-0.3, Math.min(1.3, (f - s.a) / (s.b - s.a))); };

// ================================================================== QUIZ
const CLOWN_H = 2.1;                       // the clown on his unicycle, wheel contact to hat top
const cq = (f: number, y = 1.05): V3 => { const c = clownQ(f).p; return [c[0], y, c[2]]; };
// Q1 THE COUNT: ONE continuous shot. 0 -> ~48: the lens dollies beside the clown at 0.8 m (wheel-to-chest), 5.4 m off his
// side, trucking left with him while he rides west (he holds screen x ~0.68); then he swings north up the plaza and the lens
// eases into a slow ARCING PUSH (forward-left; EDIT p3: 1.1 m left + 1.75 m forward over the count) that keeps the three bills whole in the upper-left,
// the duck point under them, the clown's loop in the right half, and walkers crossing at three depths.
/** the scene point the count framing holds (between the duck point and the clown's loop, at head height) */
const Q1T: V3 = [0.35, 1.55, 2.4];
/** the ride's key frames scale with the instruction ("Quick test. Count the people on a phone." = 0 .. COUNT.a; the
 *  numbers are the frames on the 90 f provisional instruction) */
const RK = (f: number) => Math.round((f * COUNT.a) / 90);
const Q1K: PK[] = [
  K(0, [1.6, 0.8, 15.4], cq(0), 0.806, 0.47, 47, 0.012),   // ANIMATOR A p3: the clown stands 0.3 m further east at xs 0.80: the bills keep their place (x ~72-440), he is >= 220 px from them
  K(RK(22), [1.5, 0.82, 15.1], ((c) => [c[0], 1.05, c[2]] as V3)(clownQ0p(RK(22))), 0.8, 0.465, 47, 0.014),   // ANIMATOR A p4: framed on where he WAS (plan.ts clownQ0p): he now rides west of it, the lens does not pan after him   // ANIMATOR A p3: he no longer rides west, so the lens no longer trucks west with him: it pushes in behind him
  K(RK(50), [1.05, 0.85, 14.86], [0.3, 1.45, 3.6], 0.63, 0.44, 47.5, 0.006),   // ANIMATOR A p3
  K(COUNT.a, [0.3, 0.88, 14.58], Q1T, 0.635, 0.45, 48, 0),
  K(Math.round((COUNT.a + COUNT.b) / 2), [-0.24, 0.93, 13.78], Q1T, 0.662, 0.46, 48, -0.005),   // ANIMATOR A: half the left truck of EDIT's (-0.35 / -0.95): near walkers no longer drift out of the right edge
  K(COUNT.b, [-0.8, 0.98, 12.85], Q1T, 0.694, 0.46, 47.6, -0.008),   // ANIMATOR A: was [-0.95, 0.98, 12.9] at xs 0.675
];
const q1Path = path(Q1K);
/** EDIT p3 (the count is never parked; the bills stay whole in the upper-left, x 60-600, below the chip's plate):
 *  (1) THE ARC: the lens trucks 1.1 m left (was 0.82) while it pushes 1.75 m forward, the hold point sliding right on
 *      screen: the far square slides one way and the near things (plan.ts Q1_NEAR) the other, the bills between them;
 *  (2) the breathing crane: the lens rises and sinks +-10 cm (a ~4 s cycle) while the hold point stays put, fading in and
 *      out over 40 f at both ends of the count (velocity-continuous);
 *  (3) THE LANDING: over the last 1.7 s (from COUNT.b - 50) the lens eases 1.6 % closer along the line to the clown's
 *      loop, so the picture is tightening on him as "How many?" comes and Q2's closer angle continues the push. It is
 *      this small on purpose: he rides at x ~740-900 and the bills' left edge sits at x ~60; a stronger push toward him
 *      slides the bills out of the safe area (3 % puts their left edge at x 46) */
const Q1_LAND = 0.016, Q1_LAND_F = COUNT.b - 50, Q1_LAND_D = 62;
const OVC: V3 = [OVAL.c[0], 1.1, OVAL.c[2]];
const camQ1 = (f: number): Shot => {
  const c = full(q1Path(f)), w = smooth((f - COUNT.a + 10) / 40) * smooth((COUNT.b + 30 - f) / 40), dy = 0.1 * Math.sin((2 * Math.PI * (f - COUNT.a + 10)) / 118) * w;
  const u = clamp01((f - Q1_LAND_F) / Q1_LAND_D), k = Q1_LAND * u * u * (3 - 2 * u), d: V3 = [(OVC[0] - c.pos[0]) * k, (OVC[1] - c.pos[1]) * k, (OVC[2] - c.pos[2]) * k];
  return { ...c, pos: [c.pos[0] + d[0], c.pos[1] + dy + d[1], c.pos[2] + d[2]], look: [c.look[0] + d[0], c.look[1] + d[1], c.look[2] + d[2]] };
};
// Q2 THE ANSWER ("How many? Five."): a new, closer angle on the plaza's middle, a short push (the chip flips top-right)
const Q2T: V3 = [0.7, 1.35, 1.2];
const camQ2 = path([
  K(S("Q2").a - 8, [1.5, 1.15, 13.7], Q2T, 0.55, 0.45, 42),
  K(S("Q2").b + 8, [1.28, 1.12, 12.55], Q2T, 0.55, 0.445, 42),
]);
// Q3 YOU SAW HIM: a low lens 4.2 m in front of where he brakes: he rides up the frame's middle, brakes with a wobble on
// "You saw him", waves (open hand from the elbow), honks; the lens drifts back a touch as he arrives, then pushes in
const Q3L: V3 = [CLOWN_Q3_STOP[0] + 0.22, 0.8, CLOWN_Q3_STOP[2] + 4.75];
const camQ3 = path([
  K(S("Q3").a - 8, add(Q3L, [0.25, 0.04, -0.5]), [0.75, 1.3, 5.0], 0.52, 0.43, 44),
  K(BEAT.youSaw - 6, add(Q3L, [0.06, 0.0, 0.12]), add(CLOWN_Q3_STOP, [0, 1.05, 0]), 0.5, 0.425, 44),
  K(S("Q3").b + 8, add(Q3L, [-0.1, 0.02, -0.5]), add(CLOWN_Q3_STOP, [0, 1.1, 0]), 0.5, 0.43, 44),
]);

// ================================================================== STORY: the square (S1)
// S1: the phone guy walks toward the lens chatting; right behind him the clown circles, honking and waving; the lens backs
// away slower than he walks: a slow push to his oblivious face (head ends ~38 % of the height, upper third)
const s1Guy = (f: number): V3 => lerp3(STORY.s1.from, STORY.s1.to, uq("S1", f));
const camS1 = follow((f) => add(s1Guy(f), [0, 1.45, 0]),
  (f) => { const u = uq("S1", f); return [0.65 - 0.2 * u, -0.3 + 0.05 * u, 5.0 - 1.6 * u]; },
  () => 0.38, () => 0.3, (f) => 42 - 2 * uq("S1", f));

// ================================================================== STORY: the office (S2-S5), LOOK's anchors
const OC = OFFICE.cams, OH = OFFICE.hyman, ODR = OFFICE.door, OSt = OFFICE.student;
/** office camera key from LOOK's suggested lens (pos, look) with a lens offset */
const KO = (f: number, pos: V3, look: V3, fov: number): PK => ({ f, pos, t: look, xs: 0.5, ys: 0.5, fov });
// S2: the board + Hyman: a slow glide ALONG the board (left -> right, closing in) to his chin-stroke (Hyman at the board's
// right half, 3/4 to the lens; the board's "DISTRACTION?" reads over him at the start)
const HYB = add(OH.atBoard, [0, 1.42, 0]), HYT = add(OH.turned, [0, 1.42, 0]), STR = add(OSt.inRoom, [0, 1.35, 0]);
const camS2 = path([
  K(S("S2").a - 8, add(OC.wide.pos, [-0.55, 0.06, 0.2]), OFFICE.board.c, 0.42, 0.42, 44),
  // ANIMATOR B (p3): Hyman now WORKS at the board and paces to his mark (cast_story1_marks.ts s2Hyman): the middle key holds him where he is then
  // STORY-1 (p4, the look audit's S2 note): the whole "DISTRACTION?" stays in frame through "distraction"; the glide to his
  // chin-stroke runs after it (from "nobody")
  K(BEAT.nobody, add(OC.wide.pos, [-0.42, 0.05, -0.3]), OFFICE.board.c, 0.475, 0.415, 42.5),
  K(S("S2").b + 8, add(OC.close.pos, [0.1, -0.02, 0.35]), HYB, 0.5, 0.36, 37),
]);
// S3: the door swings open, the student leans in: the door lens, a snap push on the lean (one of the film's 2 snaps)
const camS3 = snap(path([
  KO(S("S3").a - 8, add(OC.door.pos, [0.15, 0.03, 0.3]), add(OC.door.look, [-0.15, 0.02, 0]), 42),
  KO(S("S3").b + 8, add(OC.door.pos, [0.3, 0.05, 0.05]), add(OC.door.look, [0.0, 0.05, 0]), 42),
]), BEAT.student - 4, 7, 0.2);
// S4: the two-shot from the window side: Hyman (turned toward the door) left-near, the student right by the door rolling the
// unicycle in; a slow push + a small truck right
const S4M = lerp3(HYT, STR, 0.5);
const camS4 = path([
  K(S("S4").a - 8, add(S4M, [-1.45, 0.0, 4.65]), S4M, 0.5, 0.4, 44),
  K(S("S4").b + 8, add(S4M, [-1.1, 0.02, 4.3]), S4M, 0.5, 0.4, 43),
]);
// S5 (HARD CUT on "...and"): closer, from the window side: the student flings the garment bag open toward Hyman (the suit
// faces the lens), Hyman's face 3/4 at the left lighting up; a snap push on "clown"
// ANIMATOR B (CHAR): pulled back into the window corner (Hyman ~2.7 m off, not 2.3: his head no longer covers the student's
// face), a longer lens; the student holds the bag up against himself so the suit is revealed ON him (no room beside him)
// ANIMATOR B (p3, audit p2 B2 / FIX2 D10): a NEW lens from the desk side (south-south-east), three things in a row with air
// between them: Hyman's face (left), the suit on its hanger held out BESIDE the student (middle, above the caption band),
// the student (right, inside x < 888); the snap push lands as the bag's doors swing open
const S5L: V3 = ofc([2.99, 1.62, 2.37]), S5T: V3 = ofc([1.55, 1.45, -1.9]);   // (1.62 m up: the desk lamp in front of the lens stays under the caption band)
const camS5 = snap(path([
  K(S("S5").a - 2, S5L, S5T, 0.455, 0.42, 44),      // (44 deg: Hyman's head whole inside the left edge AND the student's inside x < 888 after the push)
  K(S("S5").b + 8, add(S5L, [-0.12, 0.01, -0.16]), S5T, 0.455, 0.42, 43.5),
]), BEAT.clownSuit, 7, 0.06);

// ================================================================== STORY: the square again (S6-S20)
// S6: the big wide from a high slow CRANE (rises 3.5 m, pushes 2 m): the whole square, the clown circling the sculpture,
// crowds, the clock tower; the money tree at the left edge (honest, no emphasis)
// ANIMATOR B (p3, FIX2 D5): the crane now comes DOWN and IN on the lap (fov 40). Through "So for one hour" it drifts with
// the library's clock at the top of the frame (the horizon sits behind the library and LOOK's far fill); then it swoops
// down and in on "the clown rode circles" and pitches down (no horizon at all) as he juggles. He rides his circles on the
// open plaza IN FRONT of the sculpture (cast_story1_marks.ts S6C: never hidden behind it); the last two keys hold that
// circle's centre, its front above the caption band. The crane works from the south-EAST, so the banner lamp (plan.ts
// SQ.lamp, 4 m tall, south of the plaza) stands LEFT of his circle and slides out of the left edge, never in front of
// him. Measured on stills the drawn clown is ~0.72 x his 2.1 m box: ~9 % of the frame under the clock, ~14 % on
// "rode circles", ~16 % at the end
// STORY-1 (p4, audit p3 R2 / the viewer's 28-30 s dip): the crane starts already pitched DOWN on his circle (no lawn, no
// horizon in any frame: every frame corner hits the plaza, out/clown/anim_story1/tools/s6probe.mjs) and comes down and in
// over the line, orbiting a little the way he rides: the clown 20 % of the frame at the start, ~27 % at the end, the
// whole tight circle (cast_story1_marks.ts S6C) inside the frame; the sculpture above him ("the middle of campus")
const S6T: V3 = [S6C.c[0], 0.85, S6C.c[2]], s6o = (d: V3): V3 => add(S6C.c, d);
const camS6 = path([
  K(S("S6").a - 8, s6o([2.85, 6.0, 5.55]), S6T, 0.44, 0.45, 40),
  K(BEAT.theClownRode, s6o([2.25, 5.15, 5.4]), S6T, 0.44, 0.44, 40),
  K(BEAT.middle, s6o([1.75, 4.45, 5.25]), S6T, 0.44, 0.425, 40),
  K(S("S6").b + 8, s6o([1.4, 4.2, 5.25]), S6T, 0.44, 0.42, 40),
]);
// S7: "Then his team asked people leaving:" track WITH the walker coming down into the study corner; the interviewer
// steps in from the right; the lens decelerates as he stops (ends on the two-shot)
// ANIMATOR B (CHAR): the lens follows friend B on her REAL walk (cast_story1_marks.ts s7B: the 1.04 m/s walk gait, stopping
// 12 f before the cut with stopWalk's arithmetic, so feet and lens agree); the old fixed-length lerp ran ~2.7 m/s on a short voice
// ANIMATOR B (p3, FIX2 D4): S7 is now the INTERVIEWER'S LINE, asked FACING the lens: a front medium on her at her mark in
// front of the table (cast_story1_marks.ts IV7), the PSYCH STUDY sign over her shoulder (upper left), the passer-by's
// shoulder the near layer at the left edge; a slow push in
const IV7H: V3 = add(IV7, [0, 1.47, 0]);
// STORY-1 (p4): the interviews are no longer a list: a WHIP-PAN between each two (right, left, right, left), each framed
// differently: S7 the asker front-on under her sign, S8 a close over-the-shoulder push, S9 a two-shot with a SNAP
// punch-in on "amazing!", S10 a low Dutch-tilted medium with a SNAP on "guy!", S11 the frontal medium with the clown behind
const camS7 = whip(path([
  K(S("S7").a - 8, [3.75, 1.45, 12.7], IV7H, 0.6, 0.37, 40),    // (0.3 m further east: the whole sign stays inside the left edge)
  K(S("S7").b + 8, [3.83, 1.47, 12.42], IV7H, 0.605, 0.368, 40),
]), S("S8").a, "out", 10);
// S8 INTERVIEWER: over her right shoulder onto the walker's face (friendly, clipboard up), a slow push
const IVH = add(STUDY.iv, [0, 1.45, 0]), STH = add(STUDY.stop, [0, 1.42, 0]);
// ANIMATOR B (CHAR): 1.0 m behind her the drawn head was ~1500 px wide and hid the walker's face; the lens now stands 1.6 m off
// her LEFT shoulder (south of her): her hair + shoulder are a ~330 px sliver at the right edge, the walker's face clear
const camS8 = whip(whip(path([
  K(S("S8").a - 8, add(STUDY.iv, [0.16, 1.6, 1.58]), STH, 0.4, 0.36, 40),
  K(BEAT.theClownQ - 2, add(STUDY.iv, [0.14, 1.6, 1.5]), STH, 0.4, 0.36, 40),
  K(S("S8").b + 8, add(STUDY.iv, [0.08, 1.585, 1.24]), STH, 0.41, 0.352, 38.5),   // p4: the push quickens on her recognition
]), S("S8").a, "in", 10), S("S9").a, "out", -10);
// S9 FRIEND: the pair, a medium two-shot from the interviewer's side; a small arc left as she mimes pedalling
const PAIRC: V3 = [(STUDY.pair[0][0] + STUDY.pair[1][0]) / 2, 1.25, (STUDY.pair[0][2] + STUDY.pair[1][2]) / 2];
// ANIMATOR B (CHAR): the talker steps forward of her friend (cast_story1.ts S9: both arms clear), so the frame is tilted down a
// little (ys 0.4 -> 0.33): her pedalling fists sit at y ~900-1200, clear of the caption band, her head top at y ~470
// ANIMATOR B (p3, audit p2 M5): a wider two-shot (4.6 m off, not 3.4): the pedal mime's fists ride OUTSIDE her body, so she
// needs the room on both sides; her friend claps behind her right shoulder; the interviewer is off the right edge
const camS9 = whip(whip(snap(path([
  K(S("S9").a - 8, add(PAIRC, [1.9, 0.1, 4.2]), PAIRC, 0.56, 0.36, 40),
  K(S("S9").b + 8, add(PAIRC, [1.55, 0.12, 3.55]), PAIRC, 0.56, 0.355, 40),
]), BEAT.amazing - 1, 4, 0.1), S("S9").a, "in", -10), S("S10").a, "out", 10);
// S10 HEADPHONES: a 3/4 low medium from the south-west, he pulls a cup off and points back over his shoulder; push in
// ANIMATOR B (p3): from the south-EAST now (the asked person stays LEFT, the asker off the right edge, as in S7-S11): behind
// him the open square with the far clown idling in the gap right of his head (the thumb he jerks back points AT him),
// the banner lamp and the study table out at the right edge; the push goes straight at him, so the far clown holds still
const camS10 = whip(whip(snap(path([
  K(S("S10").a - 8, [5.6, 0.92, 12.9], STH, 0.37, 0.36, 40, 0.075),   // p4: lower, a 4 deg Dutch tilt (his groove)
  K(S("S10").b + 8, [5.33, 0.95, 12.48], STH, 0.37, 0.355, 39, 0.06),
]), BEAT.unicycleGuy - 1, 4, 0.1), S("S10").a, "in", 10), S("S10").b, "out", -10);
// S11 PHONE GUY: frontal medium (phone at his ear, blank and polite); BEHIND him the clown rides by right -> left waving;
// a slow drift right + the RACK FOCUS guy -> clown -> guy (DOFS)
const camS11 = whip(path([
  K(S("S11").a - 8, add(STUDY.stop, [-0.35, 1.32, 3.6]), STH, 0.3, 0.36, 40),
  K(S("S11").b + 8, add(STUDY.stop, [-0.05, 1.33, 3.25]), STH, 0.31, 0.355, 40),
]), S("S11").a, "in", -10);
// S12: the clipboard in the interviewer's hands (four phone doodles, one tick, three crosses, "1 in 4"), then a CRANE UP
// AND BACK to her raised eyebrows.
// EDIT p3 (FIX2 D3): (1) the page is framed HIGH (the lens rides LOOK's page axis, 1.22 -> 1.04 m: the page fills about
// y 390-1240, x 225-855, so captions keep the house band y 1280-1440 and Captions.tsx PLACE.S12 is no longer needed);
// (2) the lens HOLDS on the page (a slow push, never parked) while the tick and the three crosses land, the big red
// "1 in 4" is written on "4" and READ: until S12H = "4" + 36 f (>= 1.2 s; the words "people on a call" pass meanwhile);
// (3) the crane runs on "had seen him" (a bell from S12G, ~95 % landed at the hard cut on "Many") to ANIMATOR C's medium:
// her eyebrows in the upper third and the page still readable under her chin, its bottom edge above the caption band.
const CLIP: V3 = add(STUDY.iv, [-0.18, 1.08, -0.2]);
/** LOOK's page faces CLIP + [-0.52, 0.64, -0.64] (sets_square.ts: 38 deg above the horizon). The hold's lens rides the
 *  same compass line 8 deg LOWER (30 deg: the page loses 1 % of its height, and the crane has 8 deg less to tilt) */
const PAGE_AX: V3 = [-0.57, 0.52, -0.7];
const pax = (k: number): V3 => add(CLIP, [PAGE_AX[0] * k, PAGE_AX[1] * k, PAGE_AX[2] * k]);
/** the read ends / the crane may start: "4" + 1.2 s */
export const S12H = BEAT.four18 + 36;
/** the crane's bell (a smoothstep: softer peak than the house glide): from four frames before the read is over (those
 *  frames move the page < 6 px) to two frames past the cut (98 % landed at the cut); never shorter than 24 f and never
 *  before "4" + 20 (a voice with less room keeps the read and cuts into the crane) */
export const S12G = Math.max(BEAT.four18 + 20, Math.min(S12H - 4, S("S12").b - 24)), S12GD = Math.max(24, S("S12").b + 2 - S12G);
/** S12's marks for the cast (STORY-2) and LOOK: the page is the picture until `read`; her face comes into frame from the
 *  top at `faceIn` (look up + eyebrows there, not before: until then only the page and her hands are seen); `landed` =
 *  the crane has settled on her eyebrows (the hard cut to S13 follows) */
export const S12_MARKS = { read: S12H, crane: S12G, faceIn: S12G + Math.round(S12GD * 0.5), landed: S12G + S12GD - 3 };
/* the hold is never parked: a slow push (1.22 -> 1.03 m) on a small arc round the page (11 cm right -> 5 cm left of
 * the axis: her cardigan and the plaza slide behind the board) and a 15 px rise */
const s12a = path([K(S("S12").a - 8, add(pax(1.22), [0.085, 0, -0.069]), CLIP, 0.5, 0.398, 34), K(S12G + S12GD, add(pax(1.03), [-0.047, 0, 0.038]), CLIP, 0.5, 0.406, 34)]);
const s12b = path([K(S12G - 6, add(IVH, [-1.36, 0.05, -1.72]), IVH, 0.5, 0.223, 38), K(S("S12").b + 8, add(IVH, [-1.28, 0.05, -1.62]), IVH, 0.5, 0.223, 38)]);
const camS12 = (f: number): Shot => { const u = clamp01((f - S12G) / S12GD); return mixCam(full(s12a(f)), full(s12b(f)), u * u * (3 - 2 * u)); };
// S13 (HARD CUT): the spin: from the WEST, the clown nearer-left right behind the phone guy; the guy spins to face him
// (3/4 to the lens), jaw drops; a 6 f bump in on the turn, then a slow push
const S13M: V3 = lerp3(STUDY.stop, STUDY.clownSide, 0.5);
const camS13 = snap(path([
  K(S("S13").a - 2, [0.95, 1.3, 15.0], add(S13M, [0, 1.25, 0]), 0.5, 0.4, 40),
  K(S("S13").b + 8, [1.2, 1.32, 14.45], add(S13M, [0, 1.27, 0]), 0.5, 0.4, 40),
]), (hasLine("spun") ? BEAT.spun + 1 : S("S13").a + 7) - 1, 6, 0.06);   // ANIMATOR C: the bump rides the turn (= cast_story2.ts SPIN13; the line may be dropped)
// S14: dolly WITH the headphone dude bopping past the sculpture (he waves at the clown, the clown waves back)
const s14Dude = (f: number): V3 => { const s = S("S14"); return lerp3(STORY.s14.from, STORY.s14.to, clamp01((f - s.a + 6) / (s.b - s.a + 12))); };
// ANIMATOR C (p4, audit R3 "the weird part shows nothing weird"): the lens opens on a PHONE walker passing right under the
// clown's nose (unseen), drifting west with her, then glides back and left onto the dude as he bops in on "listening" and
// follows him as before (cast_story2_marks.ts cam14T / cam14XS: the same offset and lens as p3's S14)
const camS14 = follow((f) => cam14T(f), () => [-0.6, -0.2, 4.9], (f) => cam14XS(f), () => 0.4, () => 42);
void s14Dude;
// S15: ahead of the hero, the lens walking backward as she walks south toward the branch; she sits right of centre, the
// upper left is free for the call bubble; a slow push as her mind leaves
const s15Hero = (f: number): V3 => { const s = S("S15"); return lerp3(STORY.s15.from, STORY.s15.to, clamp01((f - s.a + 6) / (s.b - s.a + 12))); };
const camS15 = follow((f) => add(s15Hero(f), [0, 1.3, 0]),
  (f) => { const u = clamp01((f - S("S15").a) / (S("S15").b - S("S15").a)); return [0.95 - 0.15 * u, 0.15, 3.9 - 0.6 * glide(u)]; },
  () => 0.66, () => 0.42, () => 44);   // ANIMATOR C (p3): the hero a little further right (0.6 -> 0.66): the call bubble fits upper-left with its top inside y >= 288
// S16: Hyman tiptoes south along the path; a low tracking 3/4 front from the south-east.
// ANIMATOR C (p3): the lens follows his REAL walk (cast_story2_marks.ts: he freezes when a jogger passes, then sneaks on),
// smoothed, and pushes in 0.3 m while he is frozen (the camera never stops)
const s16Hy = cam16;
const camS16 = follow((f) => add(s16Hy(f), [0, 1.15, 0]), (f) => [2.0 - 0.14 * push16(f), -0.35, 2.7 - 0.3 * push16(f)], () => 0.48, () => 0.42, () => 40);
// S17: close on his hands clipping the lowest bill (the peg pinch, the bill swings), then a bell PULL-BACK (45 f, on "branch")
// to the medium: Hyman beside the bill, a flat hand at his own head height
const PEG = SQ.bills[2].peg, B2 = billCentre(2), HYS17 = STORY.s17.at;
const s17a = path([K(S("S17").a - 8, add(PEG, [0.72, 0.02, 0.95]), add(PEG, [0, -0.05, 0]), 0.5, 0.42, 34), K(BEAT.onABranch, add(PEG, [0.62, 0.03, 0.82]), add(PEG, [0, -0.05, 0]), 0.5, 0.43, 34)]);
// ANIMATOR C: Hyman stands LEFT of the lowest bill (cast_story2.ts HY17 = (-1.32, 0, 5.62)): the medium frames him + the
// bill side by side (his face never behind it); the pull-back starts right after the snap ("dollar bills")
const S17T: V3 = [-1.03, 1.42, 5.56];
const s17b = path([K(BEAT.onABranch - 20, add(S17T, [2.05, -0.08, 3.45]), S17T, 0.5, 0.42, 40), K(S("S17").b + 8, add(S17T, [1.72, -0.07, 2.75]), S17T, 0.5, 0.42, 40)]);
const S17G = BEAT.dollarBills + 2, S17GD = 58;
const camS17 = glideAB(s17a, s17b, S17G, S17GD);
// S18: the low 3/4 branch angle from the south-east (walkers come from the far path, upper right, and dip under the lowest
// bill one at a time); a slow truck left
const BILLS: V3 = billCentre(1);
const camS18 = path([
  K(S("S18").a - 8, [2.05, 0.58, 8.35], BILLS, 0.48, 0.3, 46),
  K(S("S18").b + 8, [1.7, 0.6, 8.55], BILLS, 0.47, 0.3, 46),
]);
// S19: medium on the stopper under the bills + the A-frame board right of the path; a slow push
// ANIMATOR C: closer, so the stopper (~40 %) can ACT (the stop, the double-take, the peer, the touch) with the whole
// A-frame board still in frame at the right; a slow push
const S19T: V3 = [-0.62, 1.2, 5.75];   // p3: the stopper at x ~200-260, the bill's corner at ~400; the lens trucks RIGHT while it pushes, so the board does not drift into the button column
const camS19 = path([
  K(S("S19").a - 8, [-0.95, 1.24, 10.95], S19T, 0.5, 0.45, 46),   // (the lens left of LOOK's board on its crate, so the path under the bill's left end shows beside it)
  K(S("S19").b + 8, [-0.72, 1.3, 9.8], S19T, 0.5, 0.45, 46),
]);
// S20 (SLOW MOTION, on its own picture clock: the lens is keyed in picture frames, so it moves at ~45 %): side-front close
// medium of the lowest bill, the hero dips under it; a push in + a small rise (the call bubble above her)
const s20a = pt(SID.S20, S("S20").a), s20b = pt(SID.S20, S("S20").b);
const camS20base = path([
  // ANIMATOR C (p3): the bill right of centre (0.46 -> 0.58) so the mind bubble sits whole in the frame's left (x 72-408)
  K(s20a - 8, [1.25, 1.22, 8.1], add(B2, [0, -0.05, 0]), 0.58, 0.34, 40),
  K(s20b + 8, [0.92, 1.28, 7.55], add(B2, [0, -0.05, 0]), 0.58, 0.34, 39),
]);
// ANIMATOR C (p4, audit R1 "Their minds never saw it", the quietest second): on "Their minds" the lens CRANES UP off her
// blank face toward the bill swinging over her head and pushes in 5 % (gently: she walks toward the lens, so any stronger tilt / push
// sends her face under the caption band); the mind bubble GROWS 35 % and comes in with it (cast_story2.ts B20At, the same smootherstep over 20 picture f = ~45 film f)
const camS20up = (f: number): Shot => { const c = full(camS20base(f)), k = 0.05, p: V3 = [c.pos[0] + (B2[0] - c.pos[0]) * k, c.pos[1] + (B2[1] - c.pos[1]) * k + 0.03, c.pos[2] + (B2[2] - c.pos[2]) * k], F = fr(p, add(B2, [0, -0.05, 0]), 38.5, 0.57, 0.355); return { pos: F.pos, look: F.look, fov: F.fov }; };   // (a stronger tilt put her eyes under the captions)
const camS20 = glideAB(camS20base, camS20up, pt(SID.S20, BEAT.theirMinds) - 1, 20);

// ================================================================== the table
const quizCam = (t: number): Shot => (t >= S("Q3").a ? camQ3(t) : t >= S("Q2").a ? camQ2(t) : camQ1(t));
export const CAMS: Record<number, Key[]> = {
  [SID.Q1]: one(camQ1), [SID.Q2]: one(camQ2), [SID.Q3]: one(camQ3),
  [SID.S1]: one(camS1), [SID.S2]: one(camS2), [SID.S3]: one(camS3), [SID.S4]: one(camS4), [SID.S5]: one(camS5),
  [SID.S6]: one(camS6), [SID.S7]: one(camS7), [SID.S8]: one(camS8), [SID.S9]: one(camS9), [SID.S10]: one(camS10),
  [SID.S11]: one(camS11), [SID.S12]: one(camS12), [SID.S13]: one(camS13), [SID.S14]: one(camS14), [SID.S15]: one(camS15),
  [SID.S16]: one(camS16), [SID.S17]: one(camS17), [SID.S18]: one(camS18), [SID.S19]: one(camS19),
  [SID.S20]: one(camS20),
  // the replays: the camera of the SOURCE shot at the remapped picture time (Clown.tsx draws them as the source shot;
  // these entries serve the tools, the sun cache and the motion measurements)
  [SID.E1]: one((f) => camQ1(pt(SID.E1, f))), [SID.E2]: one((f) => camQ3(pt(SID.E2, f))), [SID.E3]: one((f) => quizCam(pt(SID.E3, f))),
};
/** the quiz world's camera at its picture time (any of Q1 / Q2 / Q3 by t) */
export { quizCam };

// ---------------- depth of field (cInf = blur px at infinity @1080; 0 = all sharp) ----------------
const ivFocus = at(IVH), stopFocus = at(STH);
export const DOFS: Record<number, Dof[]> = {
  [SID.Q1]: [{ f: 0, cInf: 0 }],                                                             // the test is fair: all sharp
  [SID.Q2]: [{ f: 0, cInf: 1.5, focus: at(Q2T) }],
  [SID.Q3]: [{ f: 0, cInf: 5, focus: (f) => cq(f, 1.2) }],
  [SID.S1]: [{ f: 0, cInf: 7, focus: (f) => add(s1Guy(f), [0, 1.4, 0]) }],
  [SID.S2]: [{ f: 0, cInf: 6, focus: at(add(OH.atBoard, [0, 1.4, 0])) }],
  [SID.S3]: [{ f: 0, cInf: 3.5, focus: at(add(ODR.opening, [0, 1.5, 0.3])) }],   // ANIMATOR B (p3): Hyman's turn to the door is acting now, not a blurred lump (6 -> 3.5)
  [SID.S4]: [{ f: 0, cInf: 5, focus: at(add(OSt.inRoom, [-0.3, 1.2, 0])) }],
  [SID.S5]: [{ f: 0, cInf: 5, focus: at(add(OSt.inRoom, [-0.3, 1.3, 0])) }],
  // STORY-1 (p4): sharp, then from "in the middle" a mild lens blur focused on the clown, so the near phone walker crossing
  // the foreground is soft (the square behind softens a little too)
  [SID.S6]: [{ f: 0, cInf: 0.5, focus: (f) => { const c = s6Clown(f).p; return [c[0], 1.1, c[2]]; } }, { f: BEAT.middle - 16, dur: 14, cInf: 7.5, focus: (f) => { const c = s6Clown(f).p; return [c[0], 1.1, c[2]]; } }],
  [SID.S7]: [{ f: 0, cInf: 6, focus: at(IV7H) }],
  [SID.S8]: [{ f: 0, cInf: 9, focus: stopFocus }],
  [SID.S9]: [{ f: 0, cInf: 8, focus: at(PAIRC) }],
  [SID.S10]: [{ f: 0, cInf: 3.5, focus: stopFocus }],   // ANIMATOR B (p3): the far clown he points at must read (8 -> 3.5)
  // ANIMATOR B (p3, FIX2 D4): the SPEAKER stays sharp through "Sorry... what clown?" on a deeper focus (the waving clown
  // behind him still reads: ~4 px of blur, not 9); the rack to the clown comes only AFTER the line, for his honk
  [SID.S11]: [{ f: 0, cInf: 4.5, focus: stopFocus },
    { f: BEAT.whatClownEnd - 1, dur: 9, cInf: 8, focus: at(lerp3(STUDY.clownBy.from, STUDY.clownBy.to, 0.5)) }],
  [SID.S12]: [{ f: 0, cInf: 12, focus: at(CLIP) }, { f: S12G, dur: S12GD, cInf: 9, focus: ivFocus }],
  [SID.S13]: [{ f: 0, cInf: 7, focus: at(add(S13M, [0, 1.3, 0])) }],
  [SID.S14]: [{ f: 0, cInf: 5, focus: (f) => cam14T(f) }],   // ANIMATOR C (p4): focus rides the lens target (the walker + clown, then the dude)
  [SID.S15]: [{ f: 0, cInf: 8, focus: (f) => add(s15Hero(f), [0, 1.3, 0]) }],
  [SID.S16]: [{ f: 0, cInf: 7, focus: (f) => add(s16Hy(f), [0, 1.2, 0]) }],
  [SID.S17]: [{ f: 0, cInf: 12, focus: at(PEG) }, { f: S17G, dur: S17GD, cInf: 9, focus: at(add(S17T, [-0.15, 0, 0])) }],
  [SID.S18]: [{ f: 0, cInf: 7, focus: at(BILLS) }],
  [SID.S19]: [{ f: 0, cInf: 7, focus: at(S19T) }],
  [SID.S20]: [{ f: 0, cInf: 10, focus: at(B2) }],
  [SID.E1]: [{ f: 0, cInf: 0 }], [SID.E2]: [{ f: 0, cInf: 5, focus: (f) => cq(pt(SID.E2, f), 1.2) }], [SID.E3]: [{ f: 0, cInf: 0 }],
};
void TOTAL; void DUCKS; void lapPos; void drift; void CLOWN_H;

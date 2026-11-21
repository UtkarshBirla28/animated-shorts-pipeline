// GESTURE PRIMITIVES (owner CAST): the point-and-call curve, the gaze helper, the actor types. NO shot table, NO word
// timeline here: this module is safe to import from anywhere (benches, sets) without the film's import cycle.
import type { ArmTo, Arm, HandKind } from "../../../videos/clown/cast_people";
import type { P2 } from "../../../videos/clown/toon";
import * as PPL from "../../../videos/clown/cast_people";
import type { CPose } from "./people";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const eOut = (x: number) => { const c = clamp(x, 0, 1); return 1 - (1 - c) ** 3; };

/** what the card hands the actor every frame */
export type ActEnv = {
  t: number; f: number;
  /** heading vs the lens + the key light angle (filled by the card) */
  s: number; c: number; light: number; back: boolean;
  /** the AIM on the card (design units: the world aim cut with the card plane) and the head / right-shoulder anchors */
  aim: P2 | null; look: P2 | null; head: P2; r: number; u: number;
  /** the chest anchor, the shoulders' half spread and the head height (design units): for aimArm's foreshortening */
  chest?: P2; shX?: number; HH?: number;
  /** 0..1: how much the aim is TOWARD THE LENS (1 = he points at the camera): the arm foreshortens and the hand is drawn front-on */
  aimLens?: number;
  /** resting hand targets on the card (from world points), screen-agnostic: the figure's LEFT / RIGHT hand */
  restL: P2 | null; restR: P2 | null;
  seat?: number;
  /** a per-CARD seed (member.ts: from the card's name): idle-life phases differ between people of the same kind */
  seed?: number;
  /** v5: the TOUCH POINT of a round button as seen (member.ts, CastOpts.touchR): the cap's far rim at its top, i.e. the
   *  highest point of the dome on screen in this lens, where a fingertip on top of it stays visible */
  touch?: P2 | null;
  /** round 2 (lead, v10): the hall volunteers WAIT nervously: a hovering hand twitches and trembles, the eyes dart between
   *  the button and the lamp (moves.ts actBeats sets it for lab_a..lab_d; mButton hover reads it) */
  nervy?: number;
};
export type Actor = (e: ActEnv) => CPose;

// ---------------- gaze: eyes toward a card point (look / lookY in the toon's -1.4..1.4 range)
export const gazeTo = (e: ActEnv, pt: P2 | null, k = 1): { look: number; lookY: number } => {
  if (!pt) return { look: 0, lookY: 0 };
  const dx = pt[0] - e.head[0], dy = pt[1] - e.head[1], n = Math.hypot(dx, dy) || 1, near = clamp(n / (1.4 * e.r), 0.25, 1);
  return { look: clamp((dx / n) * 1.3 * near, -1.4, 1.4) * k, lookY: clamp((dy / n) * 1.2 * near, -1.3, 1.3) * k };
};
/** blend two gazes */
export const mixG = (a: { look: number; lookY: number }, b: { look: number; lookY: number }, k: number) => ({ look: a.look + (b.look - a.look) * k, lookY: a.lookY + (b.lookY - a.lookY) * k });

// ================================================================== THE POINT-AND-CALL (shisa kanko)
export type CallOpt = {
  /** frames: the NAME word start, its end, the STATUS word start, its end */
  name: number; nameEnd: number; status: number; statusEnd: number;
  /** the arm starts rising at this frame (default name - 10); `out: true` = already out at `rise` (frame 0 = the END of a snap) */
  rise?: number; out?: boolean;
  /** hold the final point until this frame, then go back to rest (default statusEnd + 26) */
  until?: number;
  /** the snap's overshoot (driver 0.04; the tourist's mock 0.16 with a wobble) */
  over?: number; wobble?: number;
  /** frames of the arm's first rise (default 6: with the 4 f anticipation a 10 f move). 32 = a slow rise that is ~half
   *  way on the cut and lands 22 f later (v3 s03); 14 = "the arm comes up and points (18 frames)" (v3 s24) */
  riseMove?: number;
  /** a LIMP call ("Bag... gone."): the last move is not a snap: the arm SAGS forward for 12 f, elbow soft, to ~60 % of
   *  full stretch, then locks out straight over 6 f at the driver's snap speed (v3 s24); no body punch until the lock-out */
  limp?: boolean;
  /** v4: the frame the hand goes back to the chest fist (default: 16 f before the snap); e.g. on a word of its own */
  earAt?: number;
};
/** THE GESTURE: on the NAME word the arm is straight with the index finger out; on the held beat the hand draws back
 *  beside the right ear (8 f, a loose fist); on the STATUS word it snaps out again (6 f, crisp stop, overshoot, 2 f
 *  settle, hold). Returns the aim blend k (0 = at the base target, 1 = full point), the base target, the hand shape and
 *  the snap's body accent */
export type CallState = { k: number; base: ArmTo | P2; hand: "point" | "fist" | "ball";
  /** the body accent: < 0 = the wind-up just before the snap (lean back a touch), > 0 = the snap's punch (0..1) */
  accent: number;
  /** 0..1: how far the hand is through its travel between the point and the ear (a bump: 0 at both ends). In a true
   *  profile the travel is lifted over the brow by this, so the glove never wipes across the eye */
  arc: number;
  phase: "rest" | "rise" | "name" | "ear" | "snap" | "hold" | "back" };
/** THE CALL'S CLOCK (frames), from the two words. RE-TIMING SAFE: whatever the take does,
 *   - the SNAP starts 2 f before the STATUS word and lands on it (6 f);
 *   - the hand is BACK BY THE EAR 0.4 s before that (12 f: the lead's 0.35-0.45 s), after a 7 f pull-back;
 *   - the straight-arm POINT before it is shown at least 12 f: the arm simply rises EARLIER when the two words are
 *     close (he points, then says the name), and holds through a long pause;
 *   - only when the words start less than 23 f apart does the ear hold get shorter (beatReport flags it) */
export const callTimes = (o: CallOpt) => {
  // v4 (BENCHMARK: hold, then SNAP): every move is 3 f, every pose holds; the snap lands ON the status word
  const snapAt = o.status - 2, earAt = o.earAt !== undefined && Number.isFinite(o.earAt) ? Math.max(o.name + 6, Math.min(o.earAt, snapAt - 6)) : Math.max(snapAt - 16, o.name + 6), earLen = 3;
  const rm = Math.min(o.riseMove ?? 3, 4), rise = o.out ? (o.rise ?? o.name - 10) : Math.min(o.rise ?? o.name - 4 - rm, earAt - 14 - rm);
  return { rise, earAt, earLen, snapAt, snapLen: o.limp ? 9 : 3, until: o.until ?? o.statusEnd + 26, dwell: snapAt - earAt - earLen };
};
export const callOut = (f: number, o: CallOpt, rest: ArmTo | P2): CallState => {
  const { rise, earAt, earLen, snapAt, snapLen, until } = callTimes(o), over = o.over ?? 0.04;
  if (f < rise && !o.out) return { k: 0, base: rest, hand: "ball", accent: 0, arc: 0, phase: "rest" };
  if (f < earAt) {
    if (o.out) { const q = f - rise; return { k: 1 + 0.03 * Math.max(0, 1 - q / 2), base: rest, hand: "point", accent: 0, arc: 0, phase: "name" }; }
    const mv = Math.min(o.riseMove ?? 3, 4), g = PPL.gesture(f, rise + 4, { ant: 1, move: mv, over: 0.03, settle: 2, antK: 0.02 });
    return { k: g, base: rest, hand: g > 0.4 ? "point" : "ball", accent: 0, arc: 0, phase: f < rise + 4 + mv ? "rise" : "name" };
  }
  if (f < snapAt) { // back to the ear (ease in-out), hold there as a loose fist; 3 f before the snap it WINDS UP (a little
    // further back: the anticipation that makes the snap read)
    const x = clamp((f - earAt) / earLen, 0, 1), q = sm(x), ant = sm((f - (snapAt - 3)) / 3);
    return { k: 1 - q - 0.06 * ant, base: "ear", hand: q > 0.5 ? "fist" : "point", accent: -0.6 * ant, arc: 0, phase: "ear" };   // (v4: no arc; the "ear" base is the chest-side fist, callArm)
  }
  if (f < until) { // the SNAP: fast out, overshoot, a 2 f settle (+ the mock's wobble)
    const q = (f - snapAt) / snapLen, a = f - snapAt - snapLen;
    if (o.limp) { // 12 f of sag to 60 %, then a 6 f lock-out (with the driver's small overshoot)
      const b = f - snapAt, kk = b < 6 ? -0.06 + 0.66 * sm(b / 6) : b < 9 ? 0.6 + (0.4 + over) * eOut((b - 6) / 3) : 1 + over * Math.max(0, 1 - (b - 9) / 2);
      return { k: kk, base: "ear", hand: b > 3 ? "point" : "fist", accent: b >= 6 && b < 12 ? 0.6 * Math.sin(Math.PI * clamp((b - 6) / 6, 0, 1)) : 0, arc: 0, phase: b < 9 ? "snap" : "hold" };
    }
    let k = q < 1 ? -0.09 + (1.09 + over) * eOut(q) : 1 + over * Math.max(0, 1 - a / 2);
    if (o.wobble && q >= 1) k += o.wobble * Math.sin(a * 1.7) * Math.exp(-a / 9);
    return { k, base: "ear", hand: q > 0.34 ? "point" : "fist", accent: q < 1.6 ? Math.sin(Math.PI * clamp(q / 1.6, 0, 1)) : 0, arc: 0, phase: q < 1 ? "snap" : "hold" };
  }
  const q = sm((f - until) / 3); // back to rest (3 f)
  return { k: 1 - q, base: rest, hand: q < 0.6 ? "point" : "ball", accent: 0, arc: 0, phase: q < 1 ? "back" : "rest" };
};

/** where the hand goes on the held beat "beside the right ear": in a TRUE profile the ear sits just behind the head's
 *  centre (the kit's "ear" target is the bean's side edge = the back of the skull from the side), so use a card point
 *  a little behind the ear: the cheek and the eye stay clear */
export const earTarget = (e: Pick<ActEnv, "s" | "c" | "head" | "r">): ArmTo | P2 => {
  if (Math.abs(e.s) <= 0.8) return "ear";
  const d = Math.sign(e.s); return [e.head[0] - d * 0.22 * e.r, e.head[1] + 0.16 * e.r];
};
type AimEnv = Pick<ActEnv, "s" | "c" | "head" | "r"> & Partial<Pick<ActEnv, "chest" | "shX" | "HH" | "back" | "aimLens" | "u">>;
/** an arm from aimArm. `lens` > 0 = it points at the lens (compose() -> CPose.lensPoint: the front-on hand).
 *  `ext` = WE draw this arm (people.ts armWrap), the kit only solves where its hand is: the arm is blended from the
 *  kit's bent arm to ONE STRAIGHT LINE shoulder -> wrist by `straight` (0 at rest / at the ear .. 1 on the point), the
 *  wrist is moved on by `by` x k (the forearm lengthened so the fingertip lands on a far target), and the hand `hand` is
 *  drawn along that same line: the index finger continues the forearm */
export type AimedArm = Arm & { lens?: number; ext?: { by: P2; k: number; hand: HandKind; straight: number; /** v5: the index finger's own screen direction (rad; the button press: straight DOWN), drawn as the long skin point hand */ fdir?: number };/** a hand ON a prop at the body (the button press): not an "arm out" gesture for the cast log */ touch?: boolean };
/** AIM AN ARM at a card point with the right FORESHORTENING. A far point (beyond the arm's reach on the card) = a
 *  straight arm along the line shoulder -> point (the kit's aim mode). A NEAR point (the target sits close to his
 *  shoulder on screen: he points INTO or OUT OF the picture, e.g. the driver seen from behind) = the hand goes TO the
 *  point: the fingertip lands on the target on screen and the arm reads foreshortened, never a full-length arm sticking
 *  out sideways. k blends from the rest target; left = the figure's left arm */
/** v4 RIG LIMITS (BENCHMARK 6.3): an arm is never longer than the rig, a hand never bigger than 1.1 */
export const STRETCH_MAX = 1.0, HS_MAX = 1.1;
/** is the straight arm S -> S + u * len clear of the face? The shoulder sits right under the big head, so the upper arm
 *  (the first 40 %) only has to stay off the face itself; the forearm and the HAND must stay one hand-width outside */
const armClear = (H: P2, r: number, R: number, S: P2, ux: number, uy: number, len: number) => {
  for (let i = 0; i <= 24; i++) { const t = (len * i) / 24, d = Math.hypot(S[0] + ux * t - H[0], S[1] + uy * t - H[1]); if (d < (i < 10 ? 1.02 * r : R)) return false; }
  return true;
};
/** FACE GUARD: the aim, turned away from the head (if needed) so the straight arm + hand from shoulder S never crosses
 *  the face and the hand stays one hand-width outside the head outline. Returns the (possibly turned) aim, same distance */
export const faceGuard = (e: Pick<ActEnv, "head" | "r"> & { u?: number }, S: P2, aim: P2, tip: number, reach: number): P2 => {
  const dx = aim[0] - S[0], dy = aim[1] - S[1], n = Math.hypot(dx, dy); if (n < 1e-6) return aim;
  const len = Math.min(n, reach + tip), R = 1.02 * e.r + 13 * (e.u ?? 1) * 1.1, H = e.head;
  const a0 = Math.atan2(dy, dx);
  if (armClear(H, e.r, R, S, dx / n, dy / n, len)) return aim;
  // turn away from the head: the sign that increases the angle between the arm and the shoulder -> head direction
  const cr = dx * (H[1] - S[1]) - dy * (H[0] - S[0]), sgn = cr > 0 ? -1 : 1;
  for (let deg = 2; deg <= 110; deg += 2) {
    const a = a0 + sgn * (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
    if (armClear(H, e.r, R, S, ux, uy, len)) return [S[0] + ux * n, S[1] + uy * n];
  }
  // nothing clears: the most-turned direction (never snap back to the face-crossing aim: that read as a jump, f119)
  const a = a0 + sgn * (110 * Math.PI) / 180; return [S[0] + Math.cos(a) * n, S[1] + Math.sin(a) * n];
};
export const aimArm = (e: AimEnv, rest: ArmTo | P2, aim: P2 | null, k: number, hand: HandKind, hs0 = 1.2, dy = 0, left = false, stretch0 = 1, gap = 0): AimedArm => {
  const hs = Math.min(hs0, HS_MAX), stretch = Math.min(stretch0, STRETCH_MAX);
  const HH = e.HH ?? 2.1 * e.r, ch = e.chest ?? [e.head[0], e.head[1] + 1.9 * e.r], back = e.back ?? e.c < -0.35;
  const prof = clamp((Math.abs(e.s) - 0.45) / 0.45, 0, 1), side = (back ? 1 : -1) * (left ? -1 : 1);
  const S: P2 = [ch[0] + side * (e.shX ?? 0.62 * e.r) * (1 - 0.62 * prof), ch[1] - 0.28 * HH];
  // no target: straight AHEAD along his heading (a figure seen side-on points the way it faces, never behind itself);
  // seen from the front / the back there is no "ahead" on the card: out to the arm's own side, a little up
  if (!aim) { if (Math.abs(e.s) > 0.3) aim = [S[0] + Math.sign(e.s) * 12 * HH, S[1] - 0.8 * HH]; else return { to: rest, to2: "point", k, hand, hs, front: true, dy }; }
  // (v4: NEVER a point at the lens: a target toward / past the lens is pointed at SIDEWAYS, out to the arm's own side)
  if ((e.aimLens ?? 0) > 0.8 && hand === "point") aim = [S[0] + side * 1.4 * HH, S[1] - 0.15 * HH];
  // THE FACE GUARD (v4, 2026-11-20 film drafts f850 / f1860: her point up at the lamp right above her ran straight
  // across her face). The big head sits right over the short arms, so a point steeper than ~50 deg crosses it. The arm
  // line (shoulder -> fingertip) must stay one HAND-WIDTH outside the head outline: if it does not, the direction turns
  // AWAY from the head (outward, keeping its length) by the least angle that clears it. Front, 3/4 and back views alike
  // PROFILE POINT AT A TARGET IN FRONT OF THE FACE (v5 04:10, the director's full pass v13 / v14: the hall volunteers seen
  // side-on point at their little lamp at face height just ahead of them: on screen the lamp sits ON the face, the arm ran
  // across the chin and the hand landed on the mouth, 363 hand-frames). The fingertip goes at least a hand-width + a
  // finger AHEAD of the face, no higher than a little under the eye line: the arm passes in front of the chin, not over it
  if (prof > 0.5 && hand === "point") {
    const fs = Math.sign(e.s) || 1, Hh = e.head, Rr = 1.02 * e.r + 13 * (e.u ?? 1) * 1.1, tipL = 22 * (e.u ?? 1) * Math.min(hs0, HS_MAX);
    // (04:20 stills f550-f640: the PROFILE head reaches further forward than the round head (the nose), and the shoulder
    // sits behind the face: the arm stays at CHIN height until it is well clear ahead of the nose)
    const ahead = (aim[0] - Hh[0]) * fs;
    if (aim[1] < Hh[1] + 1.0 * e.r && ahead < Rr + tipL + 0.8 * e.r) aim = [Hh[0] + fs * Math.max(ahead, Rr + tipL + 0.8 * e.r), Math.max(aim[1], Hh[1] + 1.0 * e.r)];
  }
  aim = faceGuard(e, S, aim, hand === "point" ? 22 * (e.u ?? 1) * Math.min(hs0, HS_MAX) : 0, 0.888 * HH * Math.max(1, Math.min(stretch0, STRETCH_MAX)));
  const dx = aim[0] - S[0], dyy = aim[1] - S[1], n = Math.hypot(dx, dyy) || 1, reach = 0.888 * HH, ux = dx / n, uy = dyy / n;
  // the WRIST stops one finger-length short of the target, so the FINGERTIP lands on it (a point hand's tip is ~22 u out)
  const tip = hand === "point" ? (back ? 14 : 22) * (e.u ?? 1) * hs : 0, m = Math.max(0, n - tip - Math.max(0, gap) * HH), sK = clamp(k, 0, 1);   // gap (head heights): the tip stops SHORT of the aim (frame 0: it leads to the bag, never covers it)
  // NEVER PAST THE CARD (FINAL v1 audit: frame 0's arm ran off the tourist's 600-unit canvas and the hand was CUT: a
  // plank with no hand): the wrist + the finger always stay inside x 24..576, y 20..980 of the design space
  const room = (p0: number, d: number, lo: number, hi: number) => (d < -1e-6 ? (p0 - lo) / -d : d > 1e-6 ? (hi - p0) / d : Infinity);
  const inCard = Math.max(0, Math.min(room(S[0], ux, 24, 576), room(S[1], uy, 20, 980)) - tip);
  if (m >= reach && inCard >= reach) { // beyond the arm: the kit's arm goes straight to full reach; with stretch > 1 the forearm runs on
    const mm = Math.min(m, Math.max(1, stretch) * reach, inCard);
    return { to: rest, aim, k, hand: "none", hs, front: true, dy, ext: { by: [ux * (mm - reach), uy * (mm - reach)], k, hand, straight: sK } };
  }
  // within the arm's length (he points INTO / OUT OF the picture): the hand goes there; we draw the arm straight and short
  // with a gap (frame 0 / s24: "a straight railway point that LEADS the eye") the arm is never a stub: a full straight
  // ruler even when the target is near (the tip may then reach the target: the set must keep it far enough on screen)
  const w = Math.min(Math.max(m, (gap > 0 ? 0.95 : 0.36) * reach), Math.max(0.36 * reach, inCard));
  return { to: rest, to2: [S[0] + ux * w, S[1] + uy * w], k, hand: "none", hs, front: true, dy, ext: { by: [0, 0], k, hand, straight: sK } };
};
/** THE POINTING ARM of a call-out state: aimed at a card point (none = straight ahead along the heading). In a true
 *  profile the hand's travel between the point and the ear is lifted over the brow (c.arc), so the glove never wipes
 *  across the eye */
export const callArm = (c: CallState, aim: P2 | null, e: AimEnv, hs = 1.15, stretch = 1, left = false, gap = 0, earPt?: P2): Arm => {
  // earPt: the "by the ear" pose at a card point of the caller's own (FINAL v1 audit, s24: OUTSIDE the head's outline at
  // chin height, so the hand never crosses the face on its way in or out)
  // v4: the held beat between the two words is a FIST AT THE CHEST on the arm's own side (never by the head: no hand
  // ever near a face); earPt overrides it
  const armScr = ((e.back ?? e.c < -0.35) ? 1 : -1) * (left ? -1 : 1), chest = e.chest ?? [e.head[0], e.head[1] + 1.9 * e.r], HHc = e.HH ?? 2.1 * e.r;
  const base = c.base === "ear" ? earPt ?? ([chest[0] + armScr * 0.42 * HHc, chest[1] - 0.12 * HHc] as P2) : c.base, dy = 0;
  return aimArm(e, base, aim, c.k, c.hand, hs, dy, left, stretch, gap);
};
/** where the tourist's PHONE hand goes while he films: front / back views = beside the chest on screen side `side`
 *  (lift 0..1 raises it to eye height: the mock, the selfie); a TRUE profile = held out in front of the face at eye
 *  height (edge-on), never against the mouth */
export const filmTarget = (e: Pick<ActEnv, "s" | "c" | "head" | "r">, side: -1 | 1, lift = 0, out = 0): P2 => {
  if (Math.abs(e.s) > 0.8) { const d = Math.sign(e.s); return [e.head[0] + d * (2.0 * e.r + out), e.head[1] + (0.66 - (lift < 0 ? 1.5 : 0.3) * lift) * e.r]; }   // lift < 0: low, in front of his belly (s05)
  return [300 + side * (118 + out), 470 - 90 * lift];
};

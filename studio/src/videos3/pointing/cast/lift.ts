// THE LIFT (owner CAST; s06, the lead's decision): his MUM HOLDS THE BOY UP at the cab window (a common sight on
// Japanese trains). He is raised ~0.3 m, her forearms are round his waist with her hands clasped on his belly, her face
// is behind his shoulder (warm, a little amused), his legs dangle, and he is FREE TO ACT: his beats (the copy-point 6
// frames after the driver, the cap drop / push, "check!") run as always.
//
// One call places both (cast.ts castLiftPair); the two pose edits can also be used alone through CastOpts.act.
// No timeline, no shot table here: the SET says when (k) and where (pos / yaw).
import type { KitCtx, V3 } from "../../../kit/core/ctx";
import type { CardBuilt } from "../../../kit/cards/card";
import { castCardOf, type CastOpts } from "./member";
import type { Actor } from "./gesture";
import type { CPose } from "./people";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** the pair's numbers (metres): how high he is held, how far behind him she stands, how far to the side her head is
 *  (so her face shows beside his head), how high his waist is above his soles */
export const LIFT = { liftM: 0.3, backM: 0.2, sideM: 0.3, waistM: 0.37, turn: 0.22 };   // sideM 0.24 -> 0.3 (2026-11-20): his head covered half her face from the cab, her back hid him from the car

export type LiftOpts = {
  /** the boy's FLOOR mark (where he would stand; the call raises him) */
  pos: (t: number) => V3;
  /** the way both face (toward the glass): world yaw = atan2(dx, dz) */
  yaw: (t: number) => number;
  /** what the boy points at / looks at (the same aim the driver has), his eyes if different */
  aim?: CastOpts["aim"]; look?: CastOpts["look"];
  /** 0 = he stands on the floor, 1 = held up (default: always 1). A hard cut may jump it */
  k?: (t: number) => number;
  /** metres he is raised at k = 1 (default LIFT.liftM) */
  liftM?: number;
  /** which side of him her head shows on: +1 = the pair's own RIGHT-hand side, -1 = their left (default +1).
   *  Seen from in front of them (the cab) +1 is screen LEFT of the boy; seen from behind it is screen RIGHT */
  side?: 1 | -1;
  /** mum's own mark + yaw + aim while k = 0 (default: the holding place, facing with him, eyes on him) */
  mumPos?: (t: number) => V3; mumYaw?: (t: number) => number; mumAim?: CastOpts["aim"];
  /** extra card options for each (px, glassPress, cardLook, cutY...) */
  kid?: Partial<CastOpts>; mum?: Partial<CastOpts>;
};
export type LiftPlace = { k: number; kid: V3; mum: V3; mumYaw: number; kidHead: V3; waistR: V3; waistL: V3 };
/** WHERE the two are at film time t (for the set's lenses / props): the boy's card mark (raised), mum's mark + yaw, his
 *  head centre, his waist's two flanks (her hands) */
export const liftPlace = (o: LiftOpts, t: number): LiftPlace => {
  const k = clamp(o.k ? o.k(t) : 1, 0, 1), p = o.pos(t), y = o.yaw(t), sd = o.side ?? 1, up = (o.liftM ?? LIFT.liftM) * k;
  const f: V3 = [Math.sin(y), 0, Math.cos(y)], r: V3 = [-Math.cos(y), 0, Math.sin(y)];      // forward, the figure's right
  const kid: V3 = [p[0], p[1] + up, p[2]];
  const hold: V3 = [p[0] - f[0] * LIFT.backM + r[0] * sd * LIFT.sideM, p[1], p[2] - f[2] * LIFT.backM + r[2] * sd * LIFT.sideM];
  const m0 = o.mumPos ? o.mumPos(t) : hold, mum: V3 = [m0[0] + (hold[0] - m0[0]) * k, m0[1] + (hold[1] - m0[1]) * k, m0[2] + (hold[2] - m0[2]) * k];
  const yawHold = y + sd * LIFT.turn, mumYaw = o.mumYaw && k < 0.5 ? o.mumYaw(t) : yawHold;   // turned a little toward him
  const wy = kid[1] + LIFT.waistM;
  return { k, kid, mum, mumYaw, kidHead: [kid[0], kid[1] + 0.86, kid[2]],
    waistR: [kid[0] + r[0] * 0.1 + f[0] * 0.04, wy, kid[2] + r[2] * 0.1 + f[2] * 0.04], waistL: [kid[0] - r[0] * 0.1 + f[0] * 0.04, wy, kid[2] - r[2] * 0.1 + f[2] * 0.04] };
};

/** THE BOY, HELD (a pose edit: CastOpts.act = (t, P) => heldPose(P, t, k)): her arms round his waist (people.ts draws
 *  them on his card: CPose.held), his legs dangle with a small lazy swing, a hop is only a wriggle in her arms */
export const heldPose = (P: CPose, t: number, k: number, o: { col?: string; skin?: string } = {}): CPose => {
  if (k < 0.02) return P;
  const sw = Math.sin(t * 3.3), sw2 = Math.sin(t * 3.3 + 2.1);
  return { ...P, held: { k, col: o.col, skin: o.skin ?? P.skin }, go: 0, feet: undefined, hop: (P.hop ?? 0) * 0.3, duck: 0,
    foot: { r: { fwd: 0.03 + 0.028 * sw * k, lat: -0.014 * k, lift: 0.015 * k, pitch: -0.6 * k }, l: { fwd: -0.012 + 0.028 * sw2 * k, lat: 0.014 * k, lift: 0.05 * k, pitch: -0.75 * k } } };
};
/** MUM, HOLDING (a pose edit): the set gives restL / restR = his waist (liftPlace().waistL / .waistR), so her hands go
 *  there; seen from behind her arms are in front of her body (hidden by her back, the elbows show); warm and a little
 *  amused; her head leans toward him. `toward` = the screen side he is on (+1 right): see castLiftPair */
export const holdingPose = (P: CPose, t: number, k: number, toward: 1 | -1 | 0 = 0): CPose => {
  if (k < 0.02) return P;
  const back = (P.c ?? 1) < -0.35;
  const arm = (a: CPose["armL"]): CPose["armL"] => (a ? { ...a, front: back ? false : true } : a);
  const calm = P.expr === undefined || P.expr === "polite";
  return { ...P, armL: arm(P.armL), armR: arm(P.armR), expr: calm ? "warm" : P.expr,
    face: calm ? { ...(P.face ?? {}), browUp: [3.5, 1.5] } : P.face,                     // one brow a touch higher: amused
    headTilt: (P.headTilt ?? 0) + toward * 5 * k, go: 0 };
};

/** build the two cards (cast.ts castLiftPair passes the film's actors) */
export const liftPairOf = async (ctx: KitCtx, o: LiftOpts, actors: { kid?: Actor; mum?: Actor }): Promise<{ kid: CardBuilt; mum: CardBuilt; place: (t: number) => LiftPlace }> => {
  let mt = NaN, mp: LiftPlace | null = null;
  const place = (t: number): LiftPlace => { if (t !== mt || !mp) { mp = liftPlace(o, t); mt = t; } return mp; };
  const sd = o.side ?? 1;
  const kid = await castCardOf(ctx, "kid", {
    aim: o.aim, look: o.look, ...(o.kid ?? {}), pos: (t) => place(t).kid, yaw: o.yaw,
    act: (t, P) => { const Q = heldPose(P, t, place(t).k); return o.kid?.act ? o.kid.act(t, Q) : Q; },
  }, actors.kid);
  const mum = await castCardOf(ctx, "kid_mum", {
    ...(o.mum ?? {}), pos: (t) => place(t).mum, yaw: (t) => place(t).mumYaw,
    aim: (t) => (place(t).k < 0.5 && o.mumAim ? o.mumAim(t) : place(t).kidHead), look: (t) => place(t).kidHead,
    restR: (t) => (place(t).k > 0.02 ? place(t).waistR : o.mum?.restR?.(t) ?? null), restL: (t) => (place(t).k > 0.02 ? place(t).waistL : o.mum?.restL?.(t) ?? null),
    // he is on her LEFT when she stands on the pair's right: seen from the front that is screen right (+1), from behind screen left
    act: (t, P) => { const Q = holdingPose(P, t, place(t).k, ((P.c ?? 1) >= 0 ? sd : -sd) as 1 | -1); return o.mum?.act ? o.mum.act(t, Q) : Q; },
  }, actors.mum);
  return { kid, mum, place };
};

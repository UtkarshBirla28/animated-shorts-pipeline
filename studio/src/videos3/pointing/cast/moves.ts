// THE MOVES (owner CAST): the reusable acting vocabulary of the "pointing" cast + the BEAT RUNNER.
//   A MOVE  = a pure function of (the card's env, cue FRAMES) -> an Act (arms, gaze, face, body accents). No shot table,
//             no word table in here: this module is safe to import from benches, sheets and sets.
//   A BEAT  = one row of DATA: { who, m: "<move>", at: "<cue>", ... }. Cues are WORD KEYS of the script ("signal",
//             "check#2", "green.end+6") or shot anchors ("@s05", "@s05.end-8") or plain frame numbers, resolved by a
//             Resolver (acting.ts gives the film's: timing.ts words + the shot table; benches give their own).
//   RE-TIMING to a new voice = nothing to do here: the beats follow their words. A NEW SCRIPT = edit beats.ts only.
// Animation rules built in: every gesture has anticipation / overshoot / settle (PPL.gesture), eyes lead the arm by 3 f,
// a half-blink straddles every face change, a point is never shorter than 12 f, holds keep breathing.
import * as PPL from "../../../videos/clown/cast_people";
import type { Arm, ArmTo, Gait } from "../../../videos/clown/cast_people";
import type { Expr, MouthK, P2 } from "../../../videos/clown/toon";
import type { CPose, FootP, Who } from "./people";
import { callOut, callTimes, callArm, aimArm, gazeTo, mixG, filmTarget, type ActEnv, type CallOpt, type AimedArm } from "./gesture";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const TAU = Math.PI * 2;
/** 1 inside [f0, f1], easing in over `a` frames and out over `b` */
const win = (f: number, f0: number, f1: number, a = 4, b = 6) => sm((f - f0) / a) * (1 - sm((f - f1) / b));
/** a half-blink straddling a face change at frame c (2 f) */
// the running beat's HARD CUTS (set by runBeat): the eyelid swap covers a change of expression inside a shot; ON a cut
// there is nothing to cover (it would shut his eyes on the last / first frame of the shot)
let CUT_A = NaN, CUT_B = NaN;
// v4 (BENCHMARK: "no half-lid flash frames"): a face change is a clean one-frame swap, no half-blink on it
const swapLid = (_f: number, _c: number) => 0;
void CUT_A;

// ================================================================== THE ACT (what a move returns) + THE COMPOSER
export type Gz = { look: number; lookY: number };
export type Act = {
  /** the figure's RIGHT / LEFT arm (null = the kit's own walking swing) */
  right?: Arm | null; left?: Arm | null;
  /** eyes: a card point, a raw gaze, or null = straight into the lens; blended in by gazeK (default 1) */
  gaze?: P2 | Gz | null; gazeK?: number;
  expr?: Expr;
  /** an acting mouth (a laugh beat, an "o"): the voice's visemes win while the character speaks */
  mouth?: MouthK;
  browUp?: [number, number]; wink?: number;
  /** additive body channels (deg, deg, deg, deg, m, breaths, deg) */
  nod?: number; tilt?: number; headTilt?: number; lean?: number; hop?: number; breath?: number; hatLag?: number;
  /** multiplied */
  stretch?: number;
  /** max'ed with the blinks */
  blink?: number;
  /** scales the idle life (a stunned freeze: 0.12). The smallest wins */
  lifeK?: number;
  /** the character is laughing (a speaking mouth then alternates with the laugh shape) / speaks small and flat /
   *  does NOT mouth the words the timeline gives him (his own voice replayed by his phone) */
  laughing?: boolean; quiet?: boolean; mute?: boolean;
  /** anything else of the pose (film, tongue, capDrop, foot, walk, go, gait, duck, seat ...): overrides */
  set?: Partial<CPose>;
};
export type Base = { seed: number; life: number; expr: Expr; handK: number; right: Arm | null; left: Arm | null; browUp?: [number, number];
  /** where the eyes rest between beats (a card point; the head leans a little with them): the mum's eyes follow her boy */
  gaze?: P2 | null; gazeK?: number };

const QUIET: Partial<Record<MouthK, MouthK>> = { laugh: "vE", vA: "vI", O: "o", vO: "vU", vE: "vI", grin: "vI", y1: "vI", y0: "vI" };
/** MERGE the acts (in order: later ones win on arms / face / gaze, numbers add) over the character's living base state */
export const compose = (e: ActEnv, base: Base, acts: (Act | null | undefined)[], voice?: { mouth?: MouthK }): CPose => {
  const f = e.f, seated = e.seat !== undefined;
  let lifeK = 1; for (const a of acts) if (a && a.lifeK !== undefined) lifeK = Math.min(lifeK, a.lifeK);
  const L = PPL.holdLife(f, base.seed, base.life * lifeK);
  let right = base.right, left = base.left, expr = base.expr, mouth: MouthK | undefined, browUp = base.browUp, wink: number | undefined;
  let gz: Gz = { look: L.look * 0.6, lookY: L.lookY * 0.6 }, held = 0;
  let nod = 0, tilt = L.tilt, headTilt = L.headTilt;
  // a resting eye-line (the mum on her boy): the eyes go there, the head leans and dips a little with them
  if (base.gaze) { const g0 = gazeTo(e, base.gaze), k0 = base.gazeK ?? 0.85; gz = mixG(gz, g0, k0); held = k0; headTilt += 3.2 * g0.look * k0; nod += 0.9 * Math.max(0, g0.lookY) * k0; }
  // (a stunned / deadpan stare does not blink by itself: only the beat's own slow blink plays)
  let lean = 0, hop = 0, breath = L.breath, hatLag = 0, stretch = 1, blink = lifeK < 0.5 ? 0 : PPL.blinkAt(f, base.seed);
  let laughing = false, quiet = false, mute = false;
  const set: Partial<CPose> = {};
  for (const a of acts) {
    if (!a) continue;
    if (a.right !== undefined) right = a.right;
    if (a.left !== undefined) left = a.left;
    if (a.gaze !== undefined) { const k = clamp(a.gazeK ?? 1, 0, 1), g = a.gaze === null ? { look: 0, lookY: 0 } : Array.isArray(a.gaze) ? gazeTo(e, a.gaze) : a.gaze; gz = mixG(gz, g, k); held = Math.max(held, k); }
    if (a.expr) expr = a.expr;
    if (a.mouth) mouth = a.mouth;
    if (a.browUp) browUp = a.browUp;
    if (a.wink !== undefined) wink = a.wink;
    nod += a.nod ?? 0; tilt += a.tilt ?? 0; headTilt += a.headTilt ?? 0; lean += a.lean ?? 0; hop += a.hop ?? 0; breath += a.breath ?? 0; hatLag += a.hatLag ?? 0;
    stretch *= a.stretch ?? 1; blink = Math.max(blink, a.blink ?? 0);
    laughing = laughing || !!a.laughing; quiet = quiet || !!a.quiet; mute = mute || !!a.mute;
    if (a.set) Object.assign(set, a.set);
  }
  // a hand pointing AT THE LENS (aimArm marks the arm): our front-on hand on that screen side
  for (const [a, scr] of [[right, e.back ? 1 : -1], [left, e.back ? -1 : 1]] as [AimedArm | null, -1 | 1][]) if (a && a.lens && a.lens > 0.03 && !set.lensPoint) set.lensPoint = { side: scr, k: a.lens, hs: a.hs };
  // a held gaze still breathes: a quarter of the idle darts stays on top of it
  gz = { look: gz.look + 0.25 * held * L.look, lookY: gz.lookY + 0.25 * held * L.lookY };
  // the mouth: the voice's visemes win (a laugh alternates with them; a quiet line uses the small shapes)
  let m = mouth;
  if (voice?.mouth && !mute) { m = voice.mouth; if (laughing) m = Math.floor(f / 3) % 2 ? "laugh" : m === "vM" ? "grin" : "vA"; if (quiet) m = QUIET[m] ?? m; if (set.tongue) set.tongue = 0; }
  const face = browUp || wink !== undefined ? { ...(browUp ? { browUp } : {}), ...(wink !== undefined ? { wink } : {}) } : undefined;
  const walking = (set.go ?? 0) > 0.02;
  return { breath, shift: seated || walking ? 0 : L.shift, tilt, headTilt, blink, look: gz.look, lookY: gz.lookY, expr, mouth: m, face, nod, lean, hop: hop || undefined, stretch,
    hatLag: hatLag || undefined, ...PPL.bodyArms(e.back, right, left), handK: base.handK, seat: e.seat, ...set };
};

// ================================================================== SHARED MOVES
export type CallStyle = "driver" | "kid" | "mock" | "plain";
/** THE POINT-AND-CALL. On the NAME word the arm is straight out with the index finger; the hand comes back beside the
 *  ear and WAITS there (0.35-0.45 s when the take leaves the room); it winds up 3 f and SNAPS out on the STATUS word
 *  (overshoot, 2 f settle), holds, returns. Eyes lead by 3 f and stay on the target; the body leans into the snap, the
 *  cap follows 2 f late. Styles: driver (crisp, firm brows), kid (the same 6 f LATE, tongue out, bigger overshoot),
 *  mock (the tourist: stiff, tall, chin up, a wobbling overshoot), plain (no face of its own: add a `face` beat) */
export const mCall = (e: ActEnv, o: CallOpt, style: CallStyle = "driver", rest: ArmTo | P2 = "low", late?: number, stretch = 1, x: { left?: boolean; gap?: number; lensF?: number; lensAim?: [number, number]; lensHs?: number; dirF?: number; dir?: [number, number]; ear?: [number, number]; earHand?: "fist" | "point" } = {}): Act | null => {
  const f = e.f - (late ?? (style === "kid" ? 6 : 0));
  const oo: CallOpt = { ...o, over: o.over ?? (style === "driver" ? 0.04 : style === "kid" ? 0.07 : style === "mock" ? 0.16 : 0.08), wobble: o.wobble ?? (style === "mock" ? 0.08 : 0) };
  const c = callOut(f, oo, rest);
  if (c.phase === "rest") return null;
  const { rise, snapAt } = callTimes(oo), lead = oo.out ? 1 : clamp((f - (rise - 3)) / 3, 0, 1), away = c.phase === "back" ? clamp(c.k, 0, 1) : 1;
  const acc = c.accent, acc2 = callOut(f - 2, oo, rest).accent, on = c.phase !== "rise" && c.phase !== "back";
  // LENS MODE (s03b, Block 13): from frame lensF on, the point goes FORWARD along his nose line, out past the lens: the
  // arm foreshortens and the front-on glove (lensHand) comes at us on his camera side; lensAim = where the fist sits,
  // in head heights from the chest (screen x, y). The eyes keep their own target (ahead)
  const lensOn = x.lensF !== undefined && Number.isFinite(x.lensF) && e.f >= x.lensF;
  const ch = e.chest ?? [e.head[0], e.head[1] + 1.9 * e.r], HHe = e.HH ?? 2.1 * e.r, la = x.lensAim ?? [-1.2, 0.4];
  // DIRECTION MODE (FINAL v1 audit, s03b): from frame dirF on, the arm points along a SCREEN direction from the chest
  // (head heights), 35-45 deg off the lens axis: the index finger reads in profile, never a ball at the lens
  const dirOn = x.dirF !== undefined && Number.isFinite(x.dirF) && e.f >= x.dirF && !!x.dir;
  const eA: ActEnv = lensOn ? { ...e, aimLens: 1, aim: [ch[0] + la[0] * HHe, ch[1] + la[1] * HHe] } : dirOn ? { ...e, aimLens: 0, aim: [ch[0] + x.dir![0] * HHe, ch[1] + x.dir![1] * HHe] } : e;
  // THE EAR POSE outside the head (s24): ear = [out, down] head radii from the head centre, on the arm's own screen side
  const armScr = (e.back ? 1 : -1) * (x.left ? -1 : 1), earPt: P2 | undefined = x.ear ? [e.head[0] + armScr * x.ear[0] * e.r, e.head[1] + x.ear[1] * e.r] : undefined;
  const cc = x.earHand && c.base === "ear" ? { ...c, hand: x.earHand } : c;
  const arm = callArm(cc, eA.aim, eA, (style === "driver" ? 1.2 : 1.35) * (lensOn ? x.lensHs ?? 1 : 1), stretch, !!x.left, x.gap ?? 0, earPt);
  const A: Act = { ...(x.left ? { left: arm } : { right: arm }), gaze: e.look ?? e.aim ?? { look: 1.15 * e.s, lookY: -0.12 }, gazeK: lead * away,
    stretch: 1 + 0.014 * acc, nod: -0.7 * Math.max(0, acc) + 0.5 * Math.max(0, -acc), lean: 3.2 * acc, hatLag: 6 * (acc2 - acc) };
  if (style === "driver") { if (on) { A.expr = "bright"; A.browUp = [-1.5, -1.5]; A.mouth = "dash"; A.lifeK = 0.45; A.quiet = true; } }   // (quiet: firm, small mouth shapes on his words: a wide viseme read as a grin, s03b)   // (lifeK < 0.5: no idle blink while he calls; s03b)   // focused, never a smile (his own words still move the mouth)
  else if (style === "kid") { A.expr = "bright"; A.browUp = [-4, -4]; A.set = { tongue: sm((f - rise) / 3) * (1 - sm((f - snapAt - 12) / 4)) }; }   // the tongue of concentration, back in after the snap
  else if (style === "mock") { A.expr = "stare"; A.browUp = [-3, -3]; A.mouth = "vE"; A.stretch = (A.stretch ?? 1) * (1 + 0.028 * away); A.nod = (A.nod ?? 0) - 1.4 * away; A.lifeK = 0.8;
    // (Block 14: the mock must MOVE: a cocky little hip swing all through it, the head bobbing to his own rhythm, a
    // showy shoulder roll into the snap)
    const sw = Math.sin((TAU * f) / 16) * away; A.tilt = (A.tilt ?? 0) + 3.4 * sw; A.headTilt = (A.headTilt ?? 0) + 4 * Math.sin((TAU * f) / 22 + 1) * away; A.lean = (A.lean ?? 0) + 2.2 * Math.sin((TAU * f) / 32) * away; }
  return A;
};
/** how far out a `point` beat's arm is at frame f (0 rest .. 1 out, with the anticipation dip and the overshoot): pure,
 *  so a PROP can ride the same curve (the frame-0 glove card: hands.ts lensGlove) */
export const pointK = (f: number, f0: number, f1: number, o: { move?: number; still?: boolean; jabs?: number } = {}) => {
  // v4: HOLD, then SNAP: 3 f out (a 3 % overshoot, 2 f settle), held, 3 f back
  let k = PPL.gesture(f, f0, { ant: 1, move: Math.min(o.move ?? 3, 4), over: o.still ? 0.01 : 0.03, settle: 2, antK: 0.02 }) * (1 - sm((f - f1) / 3));
  for (let i = 0; i < (o.jabs ?? 0); i++) k += 0.07 * PPL.bump(f, f0 + 12 + 9 * i, 2, 5) * (f < f1 ? 1 : 0);
  return k;
};
/** a calm single POINT at the aim (no call): anticipation, move, small overshoot, hold until f1, back. `reach` = the
 *  hand goes TO the aim (a hover beside a lamp) instead of pointing along it; `jabs` = extra stabs every 9 f */
export const mPoint = (e: ActEnv, f0: number, f1: number, o: { reach?: boolean; move?: number; still?: boolean; hs?: number; rest?: ArmTo | P2; jabs?: number; left?: boolean; noGaze?: boolean; stretch?: number; gap?: number; hy?: number; dir?: [number, number] } = {}): Act | null => {
  const f = e.f; if (f < f0 - 8 || f > f1 + 14) return null;
  const k = pointK(f, f0, f1, o);
  const rest = o.rest ?? "hang", hand = k > 0.45 ? "point" : "ball", hs = o.hs ?? 1.2;
  // dir: a SCREEN direction from the chest in head heights (when the set's world aim cannot land on his card, e.g. a
  // target between the lens and him: s20, the suitcase near the lens); hy: the target n head radii lower
  const chp = e.chest ?? [e.head[0], e.head[1] + 1.9 * e.r], HHp = e.HH ?? 2.1 * e.r;
  const aim: P2 | null = o.dir ? [chp[0] + o.dir[0] * HHp, chp[1] + o.dir[1] * HHp] : e.aim && o.hy ? [e.aim[0], e.aim[1] + o.hy * e.r] : e.aim;
  const arm: Arm = o.reach && aim ? { to: rest, to2: aim, k, hand, hs, front: true } : aimArm(e, rest, aim, k, hand, hs, 0, !!o.left, o.stretch ?? 1, o.gap ?? 0);
  const A: Act = o.left ? { left: arm } : { right: arm };
  if (!o.noGaze) { A.gaze = e.look ?? e.aim ?? { look: 1.1 * e.s, lookY: -0.1 }; A.gazeK = clamp((f - f0 + 3) / 3, 0, 1) * (1 - sm((f - f1) / 10)); }
  return A;
};
/** a small NOD (yes / "there it is"): 2 f up, 5 f down, 7 f back */
export const mNod = (e: ActEnv, f0: number, amt = 1): Act | null => {
  const t = e.f - f0; if (t < -3 || t > 16) return null;
  return { nod: amt * (-0.5 * PPL.bump(e.f, f0 - 3, 2, 2) + 1.8 * PPL.bump(e.f, f0, 4, 8)) };
};
/** LOOK at something for a while: the eyes dart there in 3 f, the head follows 2 f later, a blink on a big change.
 *  to = a card point / a raw gaze / null (the lens). head = how much the head turns with it (deg at full gaze) */
export const mLook = (e: ActEnv, f0: number, f1: number, to: P2 | Gz | null, head = 4): Act | null => {
  const f = e.f; if (f < f0 - 1 || f > f1 + 10) return null;
  const k = sm((f - f0) / 3) * (1 - sm((f - f1) / 4)), kh = sm((f - f0 - 2) / 8) * (1 - sm((f - f1 - 2) / 8));
  const g = to === null ? { look: 0, lookY: 0 } : Array.isArray(to) ? gazeTo(e, to) : to;
  return { gaze: g, gazeK: k, headTilt: head * g.look * 0.7 * kh, nod: 1.1 * g.lookY * kh * (head / 4), blink: Math.abs(g.look) + Math.abs(g.lookY) > 0.8 ? Math.max(swapLid(f, f0 + 1), swapLid(f, f1 + 1)) : 0 };
};
/** ALIVE (Block 14: no character frozen for more than ~12 frames): a living hold on top of whatever plays: weight
 *  shifts (body tilt), a drifting head, a slow lean, small nods, on irregular periods (amp 1 = clearly visible at phone
 *  size; the phase comes from the start frame so two characters never sway together) */
export const mAlive = (e: ActEnv, f0: number, f1: number, amp = 1): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 6) return null;
  const k = win(f, f0, f1, 6, 6) * amp, ph = (f0 * 0.37) % TAU;
  return { tilt: 2.4 * k * Math.sin((TAU * f) / 41 + ph), headTilt: k * (4 * Math.sin((TAU * f) / 57 + 1.7 * ph) + 1.8 * Math.sin((TAU * f) / 23 + ph)),
    lean: 1.6 * k * Math.sin((TAU * f) / 67 + 0.6 * ph), nod: 0.55 * k * Math.sin((TAU * f) / 29 + 2.1 * ph) };
};
/** PEER (v4, HORI's failing eyes): the head pushed FORWARD and down, the brows SCRUNCHED low and together, the eyes
 *  open (never slits), a slow small search left / right; snaps in 3 f, holds */
export const mPeer = (e: ActEnv, f0: number, f1: number, amt = 1): Act | null => {
  const f = e.f; if (f < f0 - 3 || f > f1 + 3) return null;
  const k = win(f, f0, f1, 3, 3) * amt, srch = Math.sin((TAU * (f - f0)) / 46);
  return { lean: 9 * k, nod: 1.8 * k, headTilt: 2.5 * k * srch, expr: f >= f0 && f < f1 ? "bright" : undefined, browUp: [-8 * k, -7 * k], mouth: f >= f0 && f < f1 ? "tight" : undefined,
    gaze: { look: 0.35 * srch, lookY: 0.15 }, gazeK: k, lifeK: 0.6 };
};
/** v4 BUTTON (the lab): HOVER = the finger held just ABOVE the button (aim), the hand still; TAP = one press at f0
 *  (2 f down, 2 f up), back to the hover; DOWN = the hand pressed and LEFT on the button (the press on the red) */
export const mButton = (e: ActEnv, f0: number, f1: number, mode: "hover" | "tap" | "down"): Act | null => {
  const f = e.f; if (!e.aim || f < f0 - 3 || f > f1 + 3) return null;
  const on = f >= f0 - 1 && f <= f1, up = e.r * 0.55;
  const d = mode === "down" ? 1 : mode === "tap" ? Math.max(0, 1 - Math.abs(f - f0 - 2) / 2) : 0;
  const T: P2 = [e.aim[0], e.aim[1] - up * (1 - d)];
  return on ? { right: { to: e.restR ?? "belly", to2: T, k: 1, hand: "point", hs: 1.05, front: true }, gaze: e.aim, gazeK: 0.5, nod: 0.25 * d } : null;
};
/** a HEAD SHAKE (amused disbelief): three quick swings over ~14 frames */
export const mShake = (e: ActEnv, f0: number): Act | null => { const t = e.f - f0; if (t < 0 || t > 16) return null; return { headTilt: 7 * Math.sin((TAU * t) / 7) * (1 - t / 16), blink: t > 1 && t < 4 ? 0.5 : 0 }; };
/** SCROLLING: the free (right) hand comes to the phone in his left hand and the thumb flicks up the screen */
export const mScroll = (e: ActEnv, f0: number, f1: number): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 8) return null;
  const k = win(f, f0, f1, 6, 7), side = filmSide(e), T = filmTarget(e, side, 0, 6), fl = Math.max(0, Math.sin((TAU * (f - f0)) / 9));
  return { right: { to: "hang", to2: [T[0] - side * 10, T[1] + 6 - 7 * fl], k, hand: "point", hs: 1.15, front: true }, nod: 0.3 * k * fl };
};
/** a FACE for a while (held by the author: keep it >= 12 f), a half-blink on each change */
export const mFace = (e: ActEnv, f0: number, f1: number, expr: Expr, o: { browUp?: number; mouth?: MouthK; still?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 1 || f >= f1 + 1) return null;
  const lid = o.still ? 0 : Math.max(swapLid(f, f0), swapLid(f, f1));
  if (f < f0 || f >= f1) return { blink: lid };
  // still: no half-blink on the change and NO idle blink while it holds (frame 0: a blink at f17 read as boredom)
  return { expr, mouth: o.mouth, browUp: o.browUp !== undefined ? [o.browUp, o.browUp] : undefined, blink: lid, ...(o.still ? { lifeK: 0.45 } : {}) };
};
/** a TAKE: 4 f squash + head dip, 3 f stretch + head up, settle (a blink on the way) */
export const mTake = (e: ActEnv, f0: number, amt = 1): Act | null => {
  const t = e.f - f0; if (t < 0 || t > 15) return null;
  const tk = PPL.takeAt(e.f, f0, amt); return { stretch: tk.stretch, nod: tk.nod, blink: t >= 3 && t < 6 ? [0.5, 1, 0.5][Math.floor(t - 3)] ?? 0 : 0 };
};

// ---------------- walking (the set moves the card by walkedM: the stance foot never slides)
/** how much of the gait's full step the figure is walking at frame f (0 standing .. 1): 8 f to start, 8 f to stop */
export const walkGo = (f: number, f0: number, f1: number) => sm((f - f0) / 8) * (1 - sm((f - (f1 - 8)) / 8));
/** METRES walked at frame f for a walk beat [f0, f1] in gait g (pure): move the card along its path by exactly this */
export const walkedM = (f: number, f0: number, f1: number, g: Gait = "walk") => {
  const v = PPL.gaitSpeed(g) / 30, a = Math.min(f, f1 + 1); let m = 0;
  for (let x = Math.floor(f0); x < a; x++) m += v * walkGo(x + 0.5, f0, f1);
  return m;
};
/** WALK from f0 to f1 (arms swing by themselves unless another beat holds them) */
export const mWalk = (e: ActEnv, f0: number, f1: number, g: Gait = "walk"): Act | null => {
  const f = e.f; if (f < f0 || f > f1 + 1) return null;
  const go = walkGo(f, f0, f1);
  return { right: null, left: null, set: { walk: PPL.walkPhase(walkedM(f, f0, f1, g), g), go, gait: g } };
};

// ================================================================== THE TOURIST
const filmSide = (e: ActEnv): -1 | 1 => (e.back ? -1 : 1);
/** FILMING: the phone up in his LEFT hand (k 0 = down at his side .. 1 = up), a small handheld drift; lift 0..1 raises
 *  it from chest to eye height (a selfie / the mock) */
export const mFilm = (e: ActEnv, f0: number, f1: number, o: { k?: number; lift?: number; tilt?: number; rec?: boolean; on?: boolean; low?: boolean; out?: number; hand?: "L" | "R" } = {}): Act | null => {
  const f = e.f; if (f < (o.on ? f0 : f0 - 8) || f > f1 + 10) return null;
  if (o.low) { // the phone DOWN in his hanging left hand (forgotten: frame 0), sinking a little as his arm goes slack
    // hand "R": the phone in his RIGHT hand (frame 0 / s24: the LEFT arm points across his chest, SCRIPT 1.1)
    const sink = sm((f - f0) / 40), R = o.hand === "R", arm: Arm = { to: "hang", hand: "grip", hs: 1.2, front: true, dy: R ? 6 : 2 + 5 * sink, dx: (R ? 10 * (e.back ? -1 : 1) : 0) + 1.2 * Math.sin(f / 13) };   // R: tucked in toward his hip (clear of the bag)
    return { ...(R ? { right: arm } : { left: arm }), set: { film: { k: 0.3, side: (R ? -filmSide(e) : filmSide(e)) as -1 | 1, tilt: R ? -172 : 168 + 8 * sink, rec: false, edge: R } } };   // R: hanging EDGE-ON at his hip (a slim strip): face-on it was a big cobalt slab in the caption band; held up at the waist it fought the point
  }
  const side = filmSide(e), up = (o.on ? 1 : PPL.gesture(f, f0, { ant: 3, move: 7, over: 0.08, settle: 8 })) * (1 - sm((f - f1) / 9)), k = (o.k ?? 1) * clamp(up, 0, 1.1);
  if (k < 0.04) return null;
  const T = filmTarget(e, side, o.lift ?? 0, o.out ?? 0);
  return { left: { to: "hang", to2: T, k: clamp(up, -0.1, 1.1), hand: "grip", hs: 1.2, front: true, dx: 1.6 * Math.sin(f / 11), dy: 1.4 * Math.sin(f / 7 + 1) },
    set: { film: { k, side, tilt: (o.tilt ?? 0) + 3.5 * Math.sin(f / 9), rec: o.rec } } };
};
/** THE BIG LAUGH: eyes shut happy, the mouth pumping, the shoulders bouncing at ~7 Hz, the head tipped back, a lean back,
 *  the free hand clutching his belly. amt 0.5 = a chuckle */
export const mLaugh = (e: ActEnv, f0: number, f1: number, amt = 1, o: { hand?: boolean; open?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 4 || f > f1 + 8) return null;
  const k = win(f, f0, f1, 4, 6) * amt, ls = PPL.laughShake(f, f0, f1, amt), on = f >= f0 && f < f1, sd = e.s >= 0 ? 1 : -1;
  const A: Act = { stretch: ls.stretch, nod: ls.nod, headTilt: ls.headTilt * sd * 0.6, lean: -3.5 * k, tilt: 1.2 * k * Math.sin((TAU * (f - f0)) / 8.6), blink: Math.max(swapLid(f, f0), swapLid(f, f1)), laughing: on };
  // the mouth pumps: a ROAR (amt >= 0.8) swings between the wide D and the tall jaw-drop (both big: the s02 still with
  // "laugh" / "vA" read as a smile at phone size, 2026-11-20); a chuckle stays small
  if (on) { A.expr = o.open ? "delightB" : "laughBig"; A.mouth = Math.floor(f / 3) % 2 ? "laugh" : amt >= 0.8 ? "jaw" : "vA"; }
  if (o.hand !== false && on) A.right = { to: "hang", to2: "belly", k: clamp(PPL.gesture(f, f0 + 2), -0.1, 1.1), hand: "open", hs: 1.25, front: true, dy: -3 * Math.abs(Math.sin((TAU * (f - f0)) / 8.6)) };
  return A;
};
/** "LOOK AT THIS GUY": the free arm jabs at the aim twice, a grin */
// (T-12: the jab must STOP SHORT of the glass it is aimed at: the tip holds a third of a head height off the aim; the
// arm is a straight ruler (stretch) so the stab reads at phone size)
export const mJab = (e: ActEnv, f0: number, f1: number): Act | null => mPoint(e, f0, f1, { jabs: 2, hs: 1.2, move: 5, stretch: 1.3, gap: 0.35, hy: -1.3 });   // (FINAL v1 audit s04: aimed a little HIGHER so it passes over the boy's cap, never his eye)
/** STUNNED: everything stops. A small take, then a blank stare straight into the lens, the arms slack, the phone sinking,
 *  the shoulders a touch lower; one slow blink after 0.8 s. The grin is gone */
export const mStun = (e: ActEnv, f0: number, f1: number, o: { toLens?: boolean; blinkF?: number; hands?: boolean; take?: number } = {}): Act | null => {
  const f = e.f; if (f < f0 - 1 || f > f1 + 6) return null;
  const fb = o.blinkF !== undefined && Number.isFinite(o.blinkF) ? o.blinkF : f0 + 24;      // THE slow blink (3 f shut, 4 f open): where the script puts it
  const k = win(f, f0, f1, 4, 6), tk = PPL.takeAt(f, f0, o.take ?? 0.55), slow = Math.max(PPL.bump(f, fb, 3, 4), PPL.bump(f, fb + 40, 3, 4));
  return { expr: f >= f0 && f < f1 ? "stare" : undefined, gaze: o.toLens === false ? undefined : null, gazeK: k, lifeK: 1 - 0.88 * k, stretch: tk.stretch * (1 - 0.012 * k), nod: tk.nod + 0.5 * k,
    browUp: [6 * k, 6 * k], blink: Math.max(swapLid(f, f0), swapLid(f, f1), slow), ...(o.hands === false ? {} : { right: { to: "hang", hand: "ball", hs: 1.2, dy: 2 * k } as Arm }) };
};
/** the HOOK'S progress at frame f (pure; the SET moves the suitcase with it): reach 0..1 = the foot going out to the
 *  wheel, drag 0..1 = pulling it in */
export const hookK = (f: number, f0: number) => ({ reach: PPL.gesture(f, f0 + 3, { ant: 3, move: 6, over: 0.06, settle: 4 }), drag: sm((f - f0 - 14) / 10) });
/** the `reach` of a hook beat from world positions: where the wheel is relative to the foot that will hook it, in HIS
 *  frame ([forward along his yaw, toward his right], metres). pos = his ground point, yaw = his body yaw (atan2(dx, dz)),
 *  wheel = the caster's ground point, k = his size factor (crownM / native, ~1). Legs reach ~0.3 m comfortably */
export const footReach = (pos: [number, number, number], yaw: number, wheel: [number, number, number], leg: "L" | "R" = "R", k = 1): [number, number] => {
  const vx = wheel[0] - pos[0], vz = wheel[2] - pos[2], fwd = vx * Math.sin(yaw) + vz * Math.cos(yaw), right = -vx * Math.cos(yaw) + vz * Math.sin(yaw);
  return [fwd / k, right / k - (leg === "R" ? 0.086 : -0.086)];
};
/** HOOK THE SUITCASE WHEEL WITH A FOOT, WITHOUT LOOKING: one leg feels out to the side / behind (`reach` = [forward,
 *  to his right] metres from where that foot stands), the toe hooks, it drags the wheel in by `drag` of the way, plants.
 *  His eyes and his hands never join in (whatever beat he is in goes on); the body counter-leans a little */
export const mHook = (e: ActEnv, f0: number, o: { leg?: "L" | "R"; reach?: [number, number]; drag?: number } = {}): Act | null => {
  const f = e.f; if (f < f0 - 2 || f > f0 + 40) return null;
  const leg = o.leg ?? "R", rc = o.reach ?? [-0.06, leg === "R" ? 0.3 : -0.3], dg = o.drag ?? 0.72, h = hookK(f, f0);
  const home = 1 - sm((f - f0 - 28) / 8), k = clamp(h.reach, -0.1, 1.1) * (1 - dg * h.drag) * home;
  const lift = 0.06 * Math.sin(Math.PI * clamp((f - f0) / 10, 0, 1)) + 0.012 * h.drag * (1 - h.drag) * 4;
  const foot: FootP = { fwd: rc[0] * k, lat: rc[1] * k, lift, pitch: -0.5 * clamp(h.reach, 0, 1) * (1 - h.drag) * home };
  const away = -Math.sign(rc[1] || 1) * (Math.abs(e.c) > 0.3 ? Math.sign(e.c) : 1);
  return { tilt: 2.6 * away * clamp(k, 0, 1), set: { duck: 0.16 * clamp(k, 0, 1), foot: leg === "R" ? { r: foot } : { l: foot } } };
};
/** LUNGE AND GRAB: a 3 f flinch back, then the whole body throws itself at the aim (the suitcase handle): a long step,
 *  the hips drop, the arm shoots out and grips; held until f1, then he straightens. Yaw him toward the bag in the set */
export const mLunge = (e: ActEnv, f0: number, f1: number): Act | null => {
  // T-16 (2026-11-20): a REAL lunge-and-grab: a 3 f wind-up (he sinks back, the arm cocks), the dive (5 f) lands the grip
  // on f0 + 8 (the row starts at "saves-8": the grab IS the word), then the FOLLOW-THROUGH: he hauls it back toward
  // himself from f0 + 13 (the lean swings from +22 deg into the bag to -10 deg pulling, the planted foot holds)
  const f = e.f; if (f < f0 - 4 || f > f1 + 14) return null;
  const k = PPL.gesture(f, f0, { ant: 3, move: 5, over: 0.12, settle: 7, antK: 0.3 }) * (1 - sm((f - f1) / 12)), kk = clamp(k, 0, 1.12), on = f >= f0 - 3 && f < f1;
  const pull = sm((f - f0 - 13) / 9) * (1 - sm((f - f1) / 12));
  return { lean: 22 * k * (1 - pull) - 10 * pull, nod: 1.2 * kk * (1 - 0.6 * pull), stretch: 1 + 0.03 * PPL.bump(f, f0, 3, 4) - 0.02 * pull, expr: on ? (f < f0 + 9 ? "gazeGasp" : "grimace") : undefined, blink: Math.max(swapLid(f, f0 - 3), swapLid(f, f1)),
    gaze: e.aim ?? undefined, gazeK: sm((f - f0 + 4) / 3) * (1 - sm((f - f1) / 6)),
    right: e.aim ? { to: "hang", to2: e.aim, k: k * (1 - 0.25 * pull), hand: "grip", hs: 1.35, front: true } : { to: "hang", to2: "saddle", k, hand: "grip", hs: 1.35, front: true },
    left: pull > 0.3 ? { to: "hang", to2: e.aim ?? "saddle", k: 0.85 * pull, hand: "grip", hs: 1.3, front: true } : { to: "hang", to2: "out", k: 0.75 * kk, hand: "open", hs: 1.25, flip: true },   // both hands on it for the haul
    set: { duck: 0.34 * kk * (1 - 0.4 * pull), foot: { r: { fwd: 0.4 * kk, lift: 0.07 * PPL.bump(f, f0, 2, 4) }, l: { fwd: -0.16 * kk - 0.06 * pull, pitch: -0.45 * kk } } } };
};
/** THE FINGER WAG ("Bad suitcase."): the arm half out at the aim, the index ticking side to side at ~3.3 Hz, a mock-stern
 *  face, the head dipping on each tick, the other hand on his hip */
export const mWag = (e: ActEnv, f0: number, f1: number, o: { hip?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 12) return null;
  const k = PPL.gesture(f, f0, { ant: 4, move: 6, over: 0.1, settle: 7 }) * (1 - sm((f - f1) / 10)), w = Math.sin((TAU * (f - f0)) / 9) * win(f, f0 + 5, f1, 3, 4), on = f >= f0 && f < f1;
  return { right: { ...aimArm(e, "hang", e.aim, 0.78 * k, k > 0.4 ? "point" : "ball", 1.4), ang: 30 * w, dx: 3.2 * w }, ...(o.hip === false ? {} : { left: { to: "hang", to2: "hip", k: clamp(k, 0, 1), hand: "ball", hs: 1.2 } as Arm }),   // hip: false = the other hand keeps its phone (C-7)
    gaze: e.aim ?? { look: 0.4 * e.s, lookY: 0.9 }, gazeK: clamp(k, 0, 1), expr: on ? "stern" : undefined, mouth: on ? "smirk1" : undefined, browUp: [-2 * k, -5 * k],
    lean: 6 * k, nod: 0.9 * k + 0.5 * Math.abs(w), headTilt: 3 * w, blink: Math.max(swapLid(f, f0), swapLid(f, f1)) };
};
/** TWO FINGER GUNS at the look target (the kid): the right draws first, the left 4 f later, each "fires" twice (a recoil
 *  kick), a wink on the first shot, a lean back, a little hop */
export const mGuns = (e: ActEnv, f0: number, f1: number, o: { recoil?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 12) return null;
  const out = 1 - sm((f - f1) / 10), [g1, g2] = PPL.gesture2(f, f0, { ant: 4, move: 5, over: 0.14, settle: 6 }, 4);
  const rk = o.recoil === false ? 0 : 1, pew = (d: number) => rk * (PPL.bump(f, f0 + 10 + d, 2, 4) + PPL.bump(f, f0 + 22 + d, 2, 4)), on = f >= f0 && f < f1, T = e.look ?? e.aim;
  // (2026-11-20, s15: aimed AT THE LENS both hands became front-on "lens hands" and read as two white blobs: when the
  // target is at the lens the two guns splay OUT and a little down to either side instead, two side-on finger guns)
  const atLens = (e.aimLens ?? 0) > 0.6 || !T, fr = e.back ? -1 : 1, eS = atLens ? { ...e, aimLens: 0 } : e;
  const tOf = (left: boolean): P2 | null => (atLens ? [e.head[0] + (left ? 1 : -1) * fr * 2.8 * e.r, e.head[1] + 2.3 * e.r] : T);
  const gun = (g: number, d: number, left = false): Arm => ({ ...aimArm(eS, "hang", tOf(left), (g - 0.1 * pew(d)) * out, g > 0.4 ? "point" : "ball", 1.4, 0, left, 1.3), ang: -22 * pew(d) });
  const hp = PPL.hopAt(f, f0 + 8, 0.05, 7);
  return { right: gun(g1, 0), left: gun(g2, 3, true), gaze: T ?? undefined, gazeK: clamp(g1, 0, 1) * out, expr: on ? "brightGrin" : undefined, wink: on && PPL.bump(f, f0 + 10, 2, 4) > 0.3 ? 1 : undefined,
    lean: -4 * clamp(g1, 0, 1) * out, hop: hp.hop, stretch: hp.stretch, headTilt: 3 * clamp(g1, 0, 1) * out * (e.s >= 0 ? -1 : 1), blink: Math.max(swapLid(f, f0), swapLid(f, f1)) };
};
/** "BAG... GONE.": the flat small ending. The face empties (deadpan), the shoulders sink, the voice's mouth goes small;
 *  with `point` the free hand does a HALF point at the aim: slow, low, no snap */
export const mDeadpan = (e: ActEnv, f0: number, f1: number, o: { point?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 1 || f > f1 + 6) return null;
  const k = win(f, f0, f1, 6, 6), on = f >= f0 && f < f1;
  const A: Act = { expr: on ? "deadpan" : undefined, lifeK: 1 - 0.75 * k, stretch: 1 - 0.016 * k, nod: 0.9 * k, quiet: on, blink: Math.max(swapLid(f, f0), swapLid(f, f1), PPL.bump(f, f0 + 20, 3, 5)) };
  if (o.point) { const g = sm((f - f0 - 4) / 16) * (1 - sm((f - f1) / 10)); A.right = aimArm(e, "hang", e.aim, 0.5 * g, g > 0.5 ? "point" : "ball", 1.25); A.gaze = e.aim ?? undefined; A.gazeK = g; }
  return A;
};
/** PAT IT LIKE A DOG ("Stay."): the hand goes down to the aim (the suitcase handle), flat, and pats n times; a small bow */
export const mPat = (e: ActEnv, f0: number, n = 2): Act | null => {
  const f = e.f, f1 = f0 + 8 + 8 * n; if (f < f0 - 6 || f > f1 + 12) return null;
  const k = PPL.gesture(f, f0, { ant: 4, move: 6, over: 0.06, settle: 5 }) * (1 - sm((f - f1) / 9)); let pat = 0;
  for (let i = 0; i < n; i++) pat += PPL.bump(f, f0 + 8 + 8 * i, 3, 4);
  return { right: e.aim ? { to: "hang", to2: e.aim, k, hand: "flat", hs: 1.35, front: true, dy: -7 + 7 * pat } : { to: "hang", to2: "low", k, hand: "flat", hs: 1.35, front: true, dy: 6 * pat },
    gaze: e.aim ?? { look: 0.3 * e.s, lookY: 0.9 }, gazeK: clamp(k, 0, 1), lean: 7 * clamp(k, 0, 1), nod: 0.8 * clamp(k, 0, 1) + 0.4 * pat };
};
export const mThumbsUp = (e: ActEnv, f0: number, f1: number): Act | null => (e.f < f0 - 6 || e.f > f1 + 12 ? null : { right: { ...PPL.thumbsUp(e.f, f0, f1), hs: 1.4 } });
export const mOverShoulder = (e: ActEnv, f0: number, f1: number): Act | null => (e.f < f0 - 6 || e.f > f1 + 12 ? null : { right: { ...PPL.overShoulder(e.f, f0, f1), hs: 1.3 } });
/** a SHRUG ("what's a finger gonna do"): both palms out and up, the shoulders up, the head tilted */
export const mShrug = (e: ActEnv, f0: number, f1: number): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 12) return null;
  const [a, b] = PPL.gesture2(f, f0, { over: 0.14 }, 3), out = 1 - sm((f - f1) / 9), k = clamp(a, 0, 1) * out;
  return { right: { to: "hang", to2: "out", k: a * out * 0.8, hand: "open", hs: 1.35, ang: -35 }, left: { to: "hang", to2: "out", k: b * out * 0.8, hand: "open", hs: 1.35, ang: -35 }, stretch: 1 + 0.02 * k, headTilt: 5 * k, nod: -0.5 * k };
};
export const mHop = (e: ActEnv, f0: number, h = 0.12): Act | null => { const t = e.f - f0; if (t < -3 || t > 24) return null; const q = PPL.hopAt(e.f, f0, h, 11); return { hop: q.hop, stretch: q.stretch }; };

// ================================================================== THE KID
/** THE URGENT POINT (the kid at the suitcase): a fast stab with a big overshoot, re-stabbing every 9 f, eyebrows UP, the
 *  mouth an O, bouncing on his toes, the other arm flapping; his eyes flick between the bag (aim) and the grown-up (look) */
export const mUrgent = (e: ActEnv, f0: number, f1: number, o: { shut?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 5 || f > f1 + 12) return null;
  const out = 1 - sm((f - f1) / 8), g = PPL.gesture(f, f0, { ant: 3, move: 4, over: 0.18, settle: 6, antK: 0.14 }), on = f >= f0 && f < f1, n = Math.max(0, Math.floor((f1 - f0 - 12) / 9));
  let k = g; for (let i = 0; i < n; i++) k += 0.08 * PPL.bump(f, f0 + 12 + 9 * i, 2, 5);
  const bounce = on ? Math.abs(Math.sin((Math.PI * (f - f0)) / 7)) : 0, toBag = Math.floor((f - f0) / 13) % 2 === 0 || !e.look;
  return { right: aimArm(e, "hang", e.aim, k * out, g > 0.35 ? "point" : "ball", 1.45), // the other arm WAVES high (never beside the pointing hand: one clear finger); seen side-on it goes up BEHIND his
    // head, so the open hand never covers his face
    // (2026-11-20, s14 still: on its way up through k ~0.3-0.6 the open hand crossed his FACE: now it is always well above
    // his head on the free side, k near 1, the wave is a small sway up there)
    left: { to: "hang", to2: Math.abs(e.s) > 0.5 ? [e.head[0] - Math.sign(e.s) * 1.0 * e.r, e.head[1] - 1.9 * e.r] : [e.head[0] + (e.back ? -1 : 1) * (1.25 + 0.15 * Math.sin((f - f0) * 0.9)) * e.r, e.head[1] - 2.1 * e.r],
      k: (0.92 + 0.08 * Math.sin((f - f0) * 0.9)) * clamp(g, 0, 1) * out, hand: "open", hs: 1.3, front: true },
    gaze: (toBag ? e.aim : e.look) ?? undefined, gazeK: clamp((f - f0 + 3) / 3, 0, 1) * out, expr: on ? (o.shut ? "bright" : "brightO") : undefined, mouth: on ? (o.shut ? "tight" : "O") : undefined, browUp: [8 * clamp(g, 0, 1) * out, 8 * clamp(g, 0, 1) * out],
    hop: 0.03 * bounce, stretch: 1 + 0.02 * clamp(g, 0, 1) * out, lean: 5 * clamp(g, 0, 1) * out, blink: Math.max(swapLid(f, f0), swapLid(f, f1)),
    // the too-big cap JUMPS on the start (a take) and rides high while he is alarmed: the raised eyebrows show under it
    set: { capDrop: -(0.34 * clamp(g, 0, 1) + 0.3 * PPL.bump(f, f0, 3, 6)) * out, capTilt: -7 - 5 * clamp(g, 0, 1) * out } };
};
/** the cap's slide at frame f for a drop at f0 held `hold` frames: 0 = on his head (a bit low, as always), 1 = over his
 *  eyes, < 0 = shoved too high for a moment */
export const capDropAt = (f: number, f0: number, hold = 16) => {
  const t = f - f0, p = f0 + hold; if (t < 0) return 0;
  if (f < p) return Math.min(1.06, (t / 4) ** 2) - 0.06 * PPL.bump(f, f0 + 4, 1, 3);                     // falls (gravity), a tiny bounce on his nose
  const q = f - p; return q < 5 ? 1 - 1.28 * (1 - (1 - q / 5) ** 3) : -0.28 * (1 - sm((q - 5) / 7));        // pushed up too far, settles
};
/** HIS CAP DROPS OVER HIS EYES AND HE PUSHES IT BACK UP: it slides down in 4 f (after a nod / a snap), he freezes blind
 *  (mouth a small o, the head weighed down), the back of his hand comes up and shoves it too high, it settles; two blinks */
export const mCapDrop = (e: ActEnv, f0: number, hold = 16, o: { left?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 1 || f > f0 + hold + 26) return null;
  const d = capDropAt(f, f0, hold), p = f0 + hold, blind = d > 0.5;
  const arm: Arm = { to: "hang", to2: "brow", k: PPL.gestureBack(f, p - 7, p + 9, { ant: 3, move: 6, over: 0.1, settle: 5 }), hand: "flat", hs: 1.35, front: true, dy: -6 * PPL.bump(f, p, 3, 5) };
  const A: Act = { nod: 1.3 * clamp(d, 0, 1) - 0.9 * PPL.bump(f, p + 1, 3, 6), mouth: blind ? "o" : undefined, lifeK: blind ? 0.3 : 1, blink: Math.max(PPL.bump(f, p + 8, 2, 2), PPL.bump(f, p + 15, 2, 2)),
    set: { capDrop: d, capTilt: -7 * (1 - clamp(d, 0, 1)) } };
  if (f > p - 9) { if (o.left) A.left = arm; else A.right = arm; }
  return A;
};
/** THE CAP PUSH (no drop first): the pointing hand goes up to the brim and shoves the too-big cap up (13 f), chin up */
export const mCapPush = (e: ActEnv, f0: number, o: { left?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f0 + 26) return null;
  const arm: Arm = { to: "hang", to2: "brow", k: PPL.gestureBack(f, f0, f0 + 13, { ant: 3, move: 5, over: 0.1, settle: 4 }), hand: "flat", hs: 1.35, front: true, dy: -6 * PPL.bump(f, f0 + 5, 3, 5) };
  const up = PPL.bump(f, f0 + 5, 3, 4) + 0.45 * sm((f - f0 - 12) / 6) * (1 - sm((f - f0 - 60) / 20));
  return { ...(o.left ? { left: arm } : { right: arm }), nod: -0.8 * clamp(up, 0, 1), set: { capDrop: -0.3 * clamp(up, 0, 1.2), capTilt: -7 + 4 * clamp(up, 0, 1) }, blink: PPL.bump(f, f0 + 9, 2, 2) };
};
/** A RUN OF BUTTON PRESSES (the lab volunteer who only LOOKS and presses): the finger stabs the aim (the button) every
 *  `per` frames, eyes on it, a small head dip with each one */
export const mPress = (e: ActEnv, f0: number, f1: number, per = 5): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 10) return null;
  const on = sm((f - f0 + 4) / 5) * (1 - sm((f - f1) / 8)), ph = Math.abs(Math.sin((Math.PI * (f - f0)) / per));
  const arm: Arm = e.aim ? { to: e.restR ?? "belly", to2: e.aim, k: on * (0.62 + 0.38 * ph), hand: "point", hs: 1.25, front: true } : { to: e.restR ?? "belly", to2: "point", k: on * (0.5 + 0.3 * ph), hand: "point", hs: 1.25, front: true };
  return { right: arm, gaze: e.aim ?? { look: 0.4 * e.s, lookY: 0.7 }, gazeK: on, nod: 0.5 * on * ph, expr: on > 0.5 ? "focusB" : undefined };
};
/** PROUD: the chest puffs, the chin goes up, fists on his hips */
export const mProud = (e: ActEnv, f0: number, f1: number, o: { hips?: boolean } = {}): Act | null => {
  const f = e.f; if (f < f0 - 5 || f > f1 + 12) return null;
  const cp = PPL.chestPuff(f, f0, f1), k = clamp(PPL.gestureBack(f, f0, f1), 0, 1), on = f >= f0 && f < f1;
  const A: Act = { breath: cp.breath, nod: cp.nod - 0.6 * k, stretch: cp.stretch, expr: on ? "proudB" : undefined, blink: Math.max(swapLid(f, f0), swapLid(f, f1)) };
  if (o.hips !== false) { A.right = { to: "hang", to2: "hip", k, hand: "fist", hs: 1.25 }; A.left = { to: "hang", to2: "hip", k: clamp(PPL.gestureBack(f, f0 + 3, f1 + 3), 0, 1), hand: "fist", hs: 1.25 }; }
  return A;
};
/** ARMS CROSSED, a frown (the kid disapproves) */
export const mFrown = (e: ActEnv, f0: number, f1: number): Act | null => {
  const f = e.f; if (f < f0 - 6 || f > f1 + 12) return null;
  const [a, b] = PPL.gesture2(f, f0, {}, 3), out = 1 - sm((f - f1) / 9), on = f >= f0 && f < f1;
  return { right: { to: "hang", to2: "hug", k: a * out, hand: "ball", hs: 1.2, front: true }, left: { to: "hang", to2: "hug", k: b * out, hand: "ball", hs: 1.2, dy: 4, front: true }, expr: on ? "stern" : undefined, nod: 0.6 * clamp(a, 0, 1) * out,
    blink: Math.max(swapLid(f, f0), swapLid(f, f1)) };
};

// ================================================================== BEATS (data rows) + THE RUNNER
/** a CUE: a frame number, or "<word key>[.end][+n|-n]" ("signal", "check#2", "green.end+6"), or "@<shot id>[.end][+-n]" */
export type Cue = string | number;
type T0 = { who: Who; at: Cue; until?: Cue };
export type Beat =
  | { who: Who; m: "call"; name: Cue; status: Cue; rise?: Cue; out?: Cue; until?: Cue; style?: CallStyle; rest?: ArmTo; over?: number; /** a slow limp last move instead of the snap ("Bag... gone.") */ limp?: boolean; /** frames of the first rise (default 6) */ riseMove?: number;
      /** ON TARGET: the forearm may lengthen up to this many arm lengths so the fingertip lands on the aim on screen (1 = never) */ stretch?: number;
      /** frames behind the words (the kid COPYING the driver: 6, the default of style "kid"; his own call: 0) */ late?: number;
      /** LENS MODE from this cue on: the point comes AT the lens (front-on glove), the fist at lensAim (head heights from the chest), size x lensHs */ lensFrom?: Cue; lensAim?: [number, number]; lensHs?: number;
      /** DIRECTION MODE from this cue on: the arm points along a screen direction from the chest (head heights) */ dirFrom?: Cue; dirAim?: [number, number];
      /** the ear pose at [out, down] head radii from the head centre (outside the head), and its hand shape */ ear?: [number, number]; earHand?: "fist" | "point";
      /** the LEFT arm calls (frame 0 / s24: across his chest) */ left?: boolean; /** the tip stops this many head heights SHORT of the aim */ gap?: number }
  | (T0 & { m: "point"; reach?: boolean; still?: boolean; move?: number; hs?: number; jabs?: number; left?: boolean; noGaze?: boolean; rest?: ArmTo; /** ON TARGET: see call.stretch */ stretch?: number; /** the tip stops this many head heights SHORT of the aim */ gap?: number; /** the target this many head radii BELOW the aim (- = above) */ hy?: number; /** a SCREEN direction from his chest, head heights [x, y] (overrides the aim) */ dir?: [number, number] })
  | (T0 & { m: "look"; to: "aim" | "look" | "lens" | "down" | "up" | "phone" | "phoneLow" | [number, number]; head?: number })
  | (T0 & { m: "face"; expr: Expr; browUp?: number; mouth?: MouthK; /** no blink while it holds */ still?: boolean })
  | (T0 & { m: "nod" | "take"; amt?: number })
  | (T0 & { m: "walk"; gait?: Gait })
  | (T0 & { m: "film"; k?: number; lift?: number; tilt?: number; rec?: boolean; /** already up on the first frame (after a cut): no rise */ on?: boolean; /** held DOWN at his side */ low?: boolean; /** design units further OUT from the body (arm half stretched) */ out?: number; /** the hand that holds it (default L) */ hand?: "L" | "R" })
  | (T0 & { m: "laugh"; amt?: number; hand?: boolean; /** eyes OPEN (giggling AT something he looks at) */ open?: boolean })
  | (T0 & { m: "hook"; leg?: "L" | "R"; reach?: [number, number]; drag?: number })
  | (T0 & { m: "deadpan"; point?: boolean })
  | (T0 & { m: "capDrop"; /** frames blind (default 16; or give `until`) */ hold?: number; left?: boolean })
  | (T0 & { m: "pat"; n?: number })
  | (T0 & { m: "press"; /** frames per press (default 5) */ per?: number })
  | (T0 & { m: "capPush"; left?: boolean })
  | (T0 & { m: "urgent"; /** mouth shut (v3 s14) */ shut?: boolean })
  | (T0 & { m: "guns"; /** false = a plain double point, no kick */ recoil?: boolean })
  | (T0 & { m: "stun"; /** false = the eyes stay where the other beats put them (default: straight into the lens) */ lens?: boolean; /** the cue of the one slow blink (default 24 f in) */ blink?: Cue; /** false = leave his arms to the other beats */ hands?: boolean; /** the take's size (default 0.55; 0 = the body never pops) */ take?: number })
  | (T0 & { m: "proud"; hips?: boolean })
  | (T0 & { m: "hop"; h?: number })
  | (T0 & { m: "wag"; /** false = the free hand does not go to his hip (it is filming) */ hip?: boolean })
  | (T0 & { m: "lap" })
  | (T0 & { m: "alive"; /** how much (1 = clearly visible) */ amp?: number })   /* Block 14: a living hold over the rows that play */
  | (T0 & { m: "shake" | "scroll" })
  | (T0 & { m: "peer"; amt?: number })
  | (T0 & { m: "hover" | "tap" | "down" })   /* v4 lab: the finger over / pressing / left on the button (aim = the button) */   /* v4: Hori's bad eyes: head forward, brows scrunched, eyes open */   /* the free (left) hand down in his lap: off the T-handle, so it never crosses his chest (s03b) */
  | (T0 & { m: "jab" | "lunge" | "thumbsUp" | "overShoulder" | "shrug" | "frown" | "quiet" | "tongue" | "mute" });
export type Resolver = {
  /** frames of a word key ("check#2") start / end; NaN when the script has no such word */
  word: (key: string) => number; wordEnd: (key: string) => number;
  /** [from, to) frames of a shot id; null when unknown */
  shot: (id: string) => [number, number] | null;
  /** the end frame of the shot that contains frame f (so an open-ended beat never leaks across a cut) */
  shotEnd: (f: number) => number;
  /** the first frame of the shot that contains frame f (optional: without it nothing is gated at the cuts) */
  shotStart?: (f: number) => number;
};
/** a cue -> frames (NaN = not in this script) */
export const cueF = (c: Cue | undefined, R: Resolver): number => {
  if (c === undefined) return NaN; if (typeof c === "number") return c;
  const m = /^(.*?)(\.end)?([+-]\d+(?:\.\d+)?)?$/.exec(c.trim()); if (!m) return NaN;
  const key = m[1], end = !!m[2], off = m[3] ? +m[3] : 0;
  if (key.startsWith("@")) { const s = R.shot(key.slice(1)); return s ? (end ? s[1] : s[0]) + off : NaN; }
  return (end ? R.wordEnd(key) : R.word(key)) + off;
};
/** default lengths (frames) of the moves that end by themselves */
const LEN: Partial<Record<Beat["m"], number>> = { tap: 5, point: 40, jab: 34, wag: 40, guns: 44, lunge: 30, thumbsUp: 40, overShoulder: 30, shrug: 34, urgent: 50, look: 15 };
export type Timed = { b: Beat; f0: number; f1: number; call?: CallOpt; ok: boolean; why?: string; y?: number;
  /** HARD-CUT GATES: the beat is not played before `gate` (the first frame of the shot its start cue belongs to: a
   *  pre-roll like "@s02-20" shapes the move but never shows in the shot before) nor from `stop` on (the end of the
   *  shot named by an "@sNN.end" until) */
  gate?: number; stop?: number;
  /** one extra resolved cue of the beat (stun: the frame of its slow blink) */
  x?: number };
/** the frame a cue is ANCHORED on (its word / its shot, without ".end" and the +-offset): the shot it belongs to */
const baseF = (c: Cue | undefined, R: Resolver): number => {
  if (c === undefined) return NaN; if (typeof c === "number") return c;
  const m = /^(.*?)(\.end)?([+-]\d+(?:\.\d+)?)?$/.exec(c.trim()); if (!m) return NaN;
  if (m[1].startsWith("@")) { const sh = R.shot(m[1].slice(1)); return sh ? (m[2] ? sh[1] - 1 : sh[0]) : NaN; }
  return R.word(m[1]);
};
const gates = (start: Cue | undefined, until: Cue | undefined, R: Resolver): { gate?: number; stop?: number } => {
  const b = baseF(start, R), gate = R.shotStart && Number.isFinite(b) ? R.shotStart(b) : undefined;
  let stop: number | undefined;
  if (typeof until === "string") { const m = /^@(.*?)\.end([+-]\d+(?:\.\d+)?)?$/.exec(until.trim()); if (m && !(m[2] && +m[2] > 0)) { const sh = R.shot(m[1]); if (sh) stop = sh[1]; } }
  return { gate, stop };
};
/** resolve every beat's cues once (lazy callers memoise this) */
export const timeBeats = (beats: Beat[], R: Resolver): Timed[] => beats.map((b) => {
  if (b.m === "call") {
    const name = cueF(b.name, R), status = cueF(b.status, R);
    const nameEnd = typeof b.name === "string" ? cueF(b.name + ".end", R) : name + 10, statusEnd = typeof b.status === "string" ? cueF(b.status + ".end", R) : status + 9;
    if (!Number.isFinite(name) || !Number.isFinite(status)) return { b, f0: NaN, f1: NaN, ok: false, why: `call: word ${!Number.isFinite(name) ? b.name : b.status} not in the script` };
    const out = cueF(b.out, R), rise = Number.isFinite(out) ? out : cueF(b.rise, R), until = cueF(b.until, R);
    const call: CallOpt = { name, nameEnd, status, statusEnd, out: Number.isFinite(out), rise: Number.isFinite(rise) ? rise : undefined, until: Number.isFinite(until) ? until : Math.min(statusEnd + 26, Math.max(statusEnd + 12, R.shotEnd(status) + 8)), over: b.over, limp: b.limp, riseMove: b.riseMove };
    const ct = callTimes(call), late = b.late ?? (b.style === "kid" ? 6 : 0);
    return { b, f0: ct.rise - 4, f1: call.until! + 14 + late, call, ok: true, ...gates(b.out ?? b.rise ?? b.name, b.until, R), x: b.lensFrom !== undefined ? cueF(b.lensFrom, R) : undefined, y: b.dirFrom !== undefined ? cueF(b.dirFrom, R) : undefined,
      why: ct.dwell < 9 ? `call ${b.name} -> ${b.status}: the words start ${(status - name).toFixed(0)} f apart, the hand is back by the ear only ${Math.max(0, ct.dwell).toFixed(0)} f (0.35-0.45 s wanted: leave >= 23 f between the two word starts)` : undefined };
  }
  const f0 = cueF(b.at, R); if (!Number.isFinite(f0)) return { b, f0: NaN, f1: NaN, ok: false, why: `${b.m}: cue ${b.at} not in the script` };
  const u = cueF(b.until, R), f1 = Number.isFinite(u) ? u : LEN[b.m] !== undefined ? f0 + LEN[b.m]! : R.shotEnd(f0);
  return { b, f0, f1, ok: true, ...gates(b.at, b.until, R), x: b.m === "stun" && b.blink !== undefined ? cueF(b.blink, R) : undefined, why: b.m === "point" && f1 - f0 < 12 ? `point at ${b.at}: ${(f1 - f0).toFixed(0)} f (< 12 f)` : undefined };
});
const DOWN: Gz = { look: 0.15, lookY: 1.0 }, UP: Gz = { look: 0, lookY: -0.9 };
/** ONE timed beat -> its Act at this frame (null = not playing) */
export const runBeat = (t: Timed, e: ActEnv): Act | null => {
  if (!t.ok) return null; const b = t.b, f = e.f;
  CUT_A = t.gate ?? NaN; CUT_B = t.stop ?? NaN;
  if (b.m === "call") return mCall(e, t.call!, b.style ?? "driver", b.rest ?? (b.style && b.style !== "driver" ? "hang" : e.restR ?? "low"), b.late, b.stretch, { left: b.left, gap: b.gap, lensF: t.x, lensAim: b.lensAim, lensHs: b.lensHs, dirF: b.dirFrom !== undefined ? t.y : undefined, dir: b.dirAim, ear: b.ear, earHand: b.earHand });
  const f0 = t.f0, f1 = t.f1;
  switch (b.m) {
    case "point": return mPoint(e, f0, f1, { reach: b.reach, still: b.still, move: b.move, hs: b.hs, jabs: b.jabs, left: b.left, noGaze: b.noGaze, stretch: b.stretch, gap: b.gap, hy: b.hy, dir: b.dir, rest: b.rest ?? e.restR ?? "hang" });
    case "look": return mLook(e, f0, f1, b.to === "aim" ? e.aim ?? { look: 1.1 * e.s, lookY: 0 } : b.to === "look" ? e.look ?? e.aim ?? null : b.to === "lens" ? null : b.to === "down" ? DOWN : b.to === "up" ? UP
      : b.to === "phone" ? { look: Math.abs(e.s) > 0.8 ? 0.9 * Math.sign(e.s) : 0.75 * (e.back ? -1 : 1), lookY: 0.5 }
      : b.to === "phoneLow" ? { look: Math.abs(e.s) > 0.8 ? 0.7 * Math.sign(e.s) : 0.35 * (e.back ? -1 : 1), lookY: 1.2 } : { look: b.to[0], lookY: b.to[1] }, b.head);
    case "face": return mFace(e, f0, f1, b.expr, { browUp: b.browUp, mouth: b.mouth, still: b.still });
    case "nod": return mNod(e, f0, b.amt);
    case "take": return mTake(e, f0, b.amt);
    case "walk": return mWalk(e, f0, f1, b.gait);
    case "film": return mFilm(e, f0, f1, b);
    case "laugh": return mLaugh(e, f0, f1, b.amt, { hand: b.hand, open: b.open });
    case "jab": return mJab(e, f0, f1);
    case "stun": return mStun(e, f0, f1, { toLens: b.lens, blinkF: t.x, hands: b.hands, take: b.take });
    case "pat": return mPat(e, f0, b.n);
    case "hook": return mHook(e, f0, b);
    case "lunge": return mLunge(e, f0, f1);
    case "alive": return mAlive(e, f0, f1, b.amp);
    case "shake": return mShake(e, f0);
    case "peer": return mPeer(e, f0, f1, b.amt);
    case "hover": case "tap": case "down": return mButton(e, f0, f1, b.m);
    case "scroll": return mScroll(e, f0, f1);
    case "lap": return f >= f0 - 4 && f <= f1 + 6 ? { left: { to: "low", hand: "ball", hs: 1.1 } } : null;
    case "wag": return mWag(e, f0, f1, { hip: b.hip });
    case "guns": return mGuns(e, f0, f1, { recoil: b.recoil });
    case "deadpan": return mDeadpan(e, f0, f1, { point: b.point });
    case "thumbsUp": return mThumbsUp(e, f0, f1);
    case "overShoulder": return mOverShoulder(e, f0, f1);
    case "shrug": return mShrug(e, f0, f1);
    case "hop": return mHop(e, f0, b.h);
    case "urgent": return mUrgent(e, f0, f1, { shut: b.shut });
    case "press": return mPress(e, f0, f1, b.per);
    case "capPush": return mCapPush(e, f0, { left: b.left });
    case "mute": return f >= f0 && f < f1 ? { mute: true } : null;
    case "capDrop": return mCapDrop(e, f0, b.hold ?? (b.until !== undefined ? Math.max(8, f1 - f0) : undefined), { left: b.left });
    case "proud": return mProud(e, f0, f1, { hips: b.hips });
    case "frown": return mFrown(e, f0, f1);
    case "quiet": return f >= f0 && f < f1 ? { quiet: true } : null;
    case "tongue": return f >= f0 - 2 && f < f1 ? { set: { tongue: sm((f - f0 + 2) / 3) * (1 - sm((f - f1 + 3) / 3)) } } : null;
  }
};

/** the living BASE STATE of each hero between beats (others: a plain polite hold) */
export const baseOf = (who: Who, e: ActEnv): Base => {
  switch (who) {
    case "driver": return { seed: 4, life: 0.55, expr: "listenB", handK: 1.05, right: { to: e.restR ?? "low", hand: "ball", hs: 1.1 }, left: { to: e.restL ?? "low", hand: "grip", hs: 1.1 } };
    case "tourist": return { seed: 7, life: 1, expr: "brightGrin", handK: 1.15, right: { to: e.restR ?? "hang", hand: "ball", hs: 1.25 }, left: { to: e.restL ?? "hang", hand: "ball", hs: 1.25 } };
    case "kid": return { seed: 2, life: 0.9, expr: "bright", handK: 1.15, right: { to: e.restR ?? "hang", hand: "ball", hs: 1.25 }, left: { to: e.restL ?? "hang", hand: e.restL ? "open" : "ball", hs: 1.25 } };
    // THE BOY'S MUM: her eyes rest on her boy (the set's `look`, else `aim`), her right hand on him when the set gives
    // restR (his shoulder / his backpack), her left on the tote's strap; a warm small smile, slower than the others
    case "kid_mum": return { seed: 5, life: 0.6, expr: "polite", handK: 1.1, gaze: e.look ?? e.aim, gazeK: 0.85,
      right: e.restR ? { to: e.restR, hand: "flat", hs: 1.15, front: true } : { to: "hang", hand: "ball", hs: 1.15 }, left: { to: e.restL ?? "strap", hand: "grip", hs: 1.1 } };
    case "volunteer": return { seed: 6, life: 0.6, expr: "focusB", handK: 1.1, right: { to: e.restR ?? "belly", hand: "point", hs: 1.2, front: true }, left: { to: e.restL ?? "seat", hand: "ball", hs: 1.2 } };
    default: return { seed: 9, life: 0.7, expr: "polite", handK: 1.1, right: { to: e.restR ?? "hang", hand: "ball" }, left: { to: e.restL ?? "hang", hand: "ball" } };
  }
};
/** THE RUNNER: a character's pose at this frame from its timed beats (in table order) */
export const actBeats = (who: Who, timed: Timed[], e: ActEnv, voice?: { mouth?: MouthK }): CPose => {
  const acts: (Act | null)[] = [];
  for (const t of timed) if (t.ok && t.b.who === who && e.f >= t.f0 - 16 && e.f <= t.f1 + 30 && (t.gate === undefined || e.f >= t.gate) && (t.stop === undefined || e.f < t.stop)) acts.push(runBeat(t, e));
  const P = compose(e, baseOf(who, e), acts, voice);
  if (who === "kid" && P.blush === undefined) P.blush = 0.35;
  return P;
};

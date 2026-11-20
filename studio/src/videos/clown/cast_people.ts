// THE CHARACTERS of "The Clown Nobody Saw" (owner CHAR). Reusable draw functions for every person of the film + the
// ACTING KIT (v2): pure functions of the frame that make them alive (gesture recipe, overlap, blinks, darts, expression
// tracks, talk cycles, phone chatter, moving holds, gaits, stops, the duck, the spin, waves, points, thumbs-ups, the peg
// clip, the clown's ride / honk / wave / wobble / brake). How to call everything: studio/out/clown/CHAR.md "v2 API".
//
// HOW A FIGURE IS BUILT (the channel style: a flat cartoon card, a big bean head, a blob torso, thin dark limbs):
//   - torso + head + face + hair + outfit detail: the kit's drawPerson (toon.ts), with its own legs and arms switched off;
//   - LEGS: a jointed 3D walk cycle (hip - knee - foot, fixed bone lengths) projected onto the card for the figure's
//     heading relative to the lens (s = sideways part, c = toward-the-lens part). The stance foot stays put (stride x
//     cadence = speed); GAITS (walk, stroll, phone, jog, skip, tiptoe) set the stride, the cadence, the bob (4-6 % of the
//     height, lowest 3-4 f after contact), the lean, the knee lift; the DUCK drops the hips, bends the knees, folds the
//     torso, tucks the head (0.30-0.35 m);
//   - ARMS: 2-bone IK with FIXED bone lengths (upper arm = forearm = ARM x the head height): a hand at the ear bends the
//     elbow, it never shortens the arm. Or FORWARD KINEMATICS (Arm.fk: two angles), blended from the IK pose by angle, so
//     waves / pumps / flails travel on arcs. Both arms are always the same length;
//   - HANDS (v2): skin-coloured mittens with an ink line, ~20 u across (u = 1 % of the head width): open (wave), point,
//     thumb (thumbs-up), pinch, fist, flat, grip (holding a phone / a clipboard / bills), ball (relaxed);
//   - props and costume (phones, headphones, the backpack, the clipboard, the clown suit, the horn) as layers.
// All drawing is in the 600 x 1000 card design space (soles at y 975, 1 unit = cast.ts SU = 2.16 mm).
import { Pen, drawPerson, rig, blobPts, thickAngle, rrect, mix, shade, INK, Outfit, PersonOpts, Expr, FaceX, P2, Rig, MouthK } from "./toon";
import * as FIT from "./cast_fits";
import * as FX from "./cast_fx";
import * as VFX from "./cast_vfx";

const UM = 1 / 0.00216;                       // design units per metre
const TAU = Math.PI * 2;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const L2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): P2[] => {
  const r = rad(rot), o: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); o.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]); }
  return o;
};
const rotP = (pts: P2[], d: number, c: P2): P2[] => { const a = rad(d), cs = Math.cos(a), sn = Math.sin(a); return pts.map(([x, y]) => [c[0] + (x - c[0]) * cs - (y - c[1]) * sn, c[1] + (x - c[0]) * sn + (y - c[1]) * cs]); };
/** a joint polyline a - e - b with the corner at e rounded */
const bent = (a: P2, e: P2, b: P2, r = 0.32): P2[] => {
  const p1 = L2(e, a, r), p2 = L2(e, b, r), o: P2[] = [a, p1];
  for (let i = 1; i < 6; i++) { const t = i / 6, w = 1 - t; o.push([w * w * p1[0] + 2 * w * t * e[0] + t * t * p2[0], w * w * p1[1] + 2 * w * t * e[1] + t * t * p2[1]]); }
  o.push(p2, b); return o;
};
/** 2-bone IK in the card plane: the elbow / knee of a limb from a to b with bone lengths l1, l2; `dir` picks the side
 *  the joint bends to */
const ik2 = (a: P2, b: P2, l1: number, l2: number, dir: P2): { e: P2; b: P2 } => {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-3;
  const mx = 0.995 * (l1 + l2), mn = Math.abs(l1 - l2) + 0.02 * (l1 + l2);
  if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; } else if (d < mn) { dx *= mn / d; dy *= mn / d; d = mn; }
  const k = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - k * k)), ux = dx / d, uy = dy / d;
  let nx = -uy, ny = ux; if (nx * dir[0] + ny * dir[1] < 0) { nx = -nx; ny = -ny; }
  return { e: [a[0] + ux * k + nx * h, a[1] + uy * k + ny * h], b: [a[0] + dx, a[1] + dy] };
};

// ================================================================== THE POSE
/** hand targets (relative to the body, mirrored by the arm's screen side). v2 adds: shoulder (a thumb over the shoulder),
 *  brow (a flat hand beside the head at brow height: "this high"), paw (sneaking paws at the chest), saddle (low and out:
 *  holding a unicycle's saddle), lift (raised high beside the head: holding up a hanger) */
export type ArmTo = "hang" | "ear" | "hip" | "pocket" | "chin" | "chest" | "belly" | "out" | "up" | "wave" | "raise" | "thumb" | "guard"
  | "talk" | "strap" | "seat" | "point" | "low" | "hug" | "write" | "clip" | "show"
  | "shoulder" | "brow" | "paw" | "saddle" | "lift";
/** hand shapes (v2: skin mittens ~20 u across; `ball` is the relaxed hand) */
export type HandKind = "ball" | "open" | "thumb" | "point" | "none" | "fist" | "pinch" | "flat" | "grip";
export type Prop =
  | { k: "phone"; col: string; /** p3: the screen's faint glow on the cheek (0..1; use ~0.6 in shade) */ glow?: number;
      /** p3 (D8): size multiplier (1 = 27 x 48 u). Far phone people: phoneSizeAt() / phoneSizeFor() give the floor */ size?: number }
  | { k: "cup" } | { k: "book"; col: string } | { k: "clipboard"; tilt?: number } | { k: "pencil" }
  /** a clothes peg in a pinch (open 0..1 spreads its jaws) */
  | { k: "peg"; open?: number }
  /** one bill (k = size, 1 = the world's 0.56 m bill) / a fan of n bills in the fist / n pegs in the fist */
  | { k: "bill"; size?: number } | { k: "bills"; n?: number; spread?: number; size?: number } | { k: "pegs"; n?: number }
  /** the clown's bulb horn: squeeze 0..1 squashes the bulb */
  | { k: "horn"; squeeze?: number }
  /** a unicycle held by the saddle (heading s, wheel angle spin, the hub's x offset lean in design units) */
  | { k: "unicycle"; s?: number; spin?: number; lean?: number }
  /** the garment bag held up by its hook (open 0..1 flings the flap toward screen side `side`, sway in degrees) */
  | { k: "garment"; open?: number; side?: 1 | -1; sway?: number; /** p3: the suit tumbling out (0..1 + a bounce; default 1) */ suit?: number }
  /** a mug (the mum's tea) */
  | { k: "mug"; col?: string; steam?: number };
export type Arm = {
  /** where the hand goes: a named target, or a point in card design units (default "hang") */
  to?: ArmTo | P2;
  /** blend toward a second target by k (0..1; the gesture recipe overshoots to ~1.13 and dips to ~-0.12) */
  to2?: ArmTo | P2; k?: number;
  /** offset of the hand in head units u (1 u = 1 % of the head width): small life, swings */
  dx?: number; dy?: number;
  /** draw the arm over the torso and the head (default: by target; hanging arms go behind the torso) */
  front?: boolean;
  hand?: HandKind;
  /** rotation of the hand (deg) relative to the forearm's line (the thumbs-up stays upright) */
  ang?: number;
  prop?: Prop;
  /** flip the elbow to the other side */
  flip?: boolean;
  /** FORWARD KINEMATICS: [upper arm, forearm] in degrees, body space: 0 = straight down, 90 = straight out to the arm's
   *  own screen side, 180 = straight up, negative = across the body. Both bones keep the arm length */
  fk?: [number, number];
  /** blend from the IK pose (to / to2 / k) to `fk` BY ANGLE (0..1, overshoot allowed): the hand travels on an arc */
  fkK?: number;
  /** AIM the whole arm at this card point: the hand goes to full reach on the line shoulder -> aim (k blends from `to`) */
  aim?: P2;
  /** hand size multiplier (1 = ~20 u gesture hands; wides may want 1.3-1.6) */
  hs?: number;
};
export type Gait = "walk" | "stroll" | "phone" | "jog" | "skip" | "tiptoe";
export type Pose = {
  /** the figure's heading relative to the lens: s = sideways part (+ = toward screen right), c = toward-the-lens part
   *  (+ = approaching). Default: standing square to the lens (s 0, c 1). cast.ts `orientSC` gives both. */
  s?: number; c?: number;
  /** force the view / the 3/4 turn of the face instead of deriving them from s, c */
  view?: "front" | "back"; facing?: -1 | 0 | 1;
  /** walk phase in CYCLES (= metres walked / the gait's stride, see walkPhase) and how much it walks (0 stands .. 1) */
  walk?: number; go?: number;
  /** the gait (default "walk"): stride, cadence, bob, lean, knee lift, arm swing */
  gait?: Gait;
  /** -0.15 (up on the toes) .. 0 upright .. 1 fully ducked (hips -0.17 m, knees bent, torso folded, chin tucked: the head
   *  ~0.32 m lower). duckAt() gives the curve */
  duck?: number;
  expr?: Expr; look?: number; lookY?: number; blink?: number;
  /** lip flaps (v1): -1 none, else a running counter. v2: prefer `mouth` (talkAt / phoneChat give it) */
  talk?: number;
  /** the mouth shape instead of the expression's own (a viseme from talkAt / phoneChat, a laugh beat) */
  mouth?: MouthK;
  breath?: number; tilt?: number; headTilt?: number; nod?: number; wind?: number; face?: FaceX; shift?: number; hairSwing?: number;
  /** the arms as SCREEN-left / SCREEN-right (as in the kit: in a front view screen-left is the figure's right arm) */
  armL?: Arm | null; armR?: Arm | null;
  /** canvas angle the key light comes from, the character seed (cast.ts fills both) */
  light?: number; seed?: number;
  /** all hands' size multiplier */
  handK?: number;
  /** extra horizontal squeeze of the card (1 = none): view flips, spins (spinAt / flipAt give it) */
  sq?: number;
  /** squash & stretch: vertical scale about the soles (1.08 = stretched; the width keeps the volume) */
  stretch?: number;
  /** a SMEAR frame (0..1): the figure stretched along the motion with two fading multiples behind it; smearDir = +1 moving
   *  toward screen right */
  smear?: number; smearDir?: number;
  /** extra forward lean (deg) into the heading's screen direction */
  lean?: number;
  /** the backpack's bounce (u, + = up) */
  pack?: number;
  /** headphones: one cup lifted off by the hand on that SCREEN side (k 0 on the ear .. 1 at the hand) */
  cupOff?: { side: -1 | 1; k: number };
  /** a pale edge along the upper contours (the professor: olive on brick) */
  rim?: string; rimK?: number;
  /** the hat (clown) lags / lifts: degrees, u */
  hatLag?: number; hatLift?: number;
  /** explicit FEET (right, left) in the body frame instead of the gait cycle: stopWalk gives them (a stop without slide) */
  feet?: [FootSt, FootSt];
  /** p3: a hop (metres off the ground: hopAt gives it with its squash / stretch) */
  hop?: number;
  /** p3 overlap channels: the lanyard card's swing (-1..1), coat tails / hems / tie flutter (-1..1), a headphone CABLE
   *  (u: when given, a cable hangs from the cup to the pocket and swings by it). overlapAll() feeds them all */
  cardSwing?: number; flutter?: number; cable?: number;
};
/** the v1 stride (= GAIT.walk.stride): metres per walk cycle (two steps) */
export const STRIDE = 1.04;
/** arm bone length in head heights (upper arm = forearm) */
const ARM = 0.46;

/** THE GAITS. stride = metres per cycle (2 steps), step = frames per step at the gait's natural speed (speed(g) m/s =
 *  stride / (2 step) x 30), bob = the hips' travel (m, peak to peak, lowest 3-4 f after contact), lean (deg), lift (m,
 *  swing-foot height), duty = stance share of a cycle per foot (< 0.5 = a flight phase), arm = swing scale, toe = on the
 *  toes, low = step phase of the lowest point, sink = hips lowered (m: a crouched sneak) */
type GaitDef = { stride: number; step: number; bob: number; lean: number; lift: number; duty: number; arm: number; toe: number; low: number; sink: number };
export const GAIT: Record<Gait, GaitDef> = {
  walk: { stride: 1.04, step: 15, bob: 0.075, lean: 4, lift: 0.09, duty: 0.5, arm: 1, toe: 0, low: 0.23, sink: 0 },
  stroll: { stride: 0.94, step: 20, bob: 0.055, lean: 2, lift: 0.07, duty: 0.5, arm: 0.7, toe: 0, low: 0.23, sink: 0 },
  phone: { stride: 0.9, step: 19, bob: 0.06, lean: 2.5, lift: 0.075, duty: 0.5, arm: 0.6, toe: 0, low: 0.23, sink: 0 },
  jog: { stride: 1.6, step: 10, bob: 0.1, lean: 8, lift: 0.17, duty: 0.36, arm: 1.3, toe: 0, low: 0.36, sink: 0.02 },
  skip: { stride: 1.4, step: 12, bob: 0.15, lean: 3, lift: 0.22, duty: 0.4, arm: 1.5, toe: 0, low: 0.4, sink: 0 },
  tiptoe: { stride: 0.6, step: 16, bob: 0.05, lean: 10, lift: 0.16, duty: 0.55, arm: 0, toe: 1, low: 0.25, sink: 0.07 },
};
/** the gait's natural speed (m/s) */
export const gaitSpeed = (g: Gait = "walk") => (GAIT[g].stride / (2 * GAIT[g].step)) * 30;
/** walk phase (cycles) for metres travelled in gait g: Pose.walk = walkPhase(m, g) (the stance foot never slides) */
export const walkPhase = (metres: number, g: Gait = "walk") => metres / GAIT[g].stride;
/** walk phase for a figure stepping at the gait's cadence without travelling (in place, or a camera that moves with it) */
export const walkInPlace = (f: number, g: Gait = "walk") => f / (2 * GAIT[g].step);

type Ctx = { R: Rig; u: number; back: boolean; facing: -1 | 0 | 1; s: number; c: number; light: number; o: Outfit; pose: Pose;
  /** head-space pen rotation (as the kit's), torso-space pen rotation */ headRot: number[] | null; bodyRot: number[] | null;
  /** the solved hands (card units), by screen side */ hands: { side: number; h: P2 }[] };
type Layer = (p: Pen, X: Ctx) => void;
export type Extras = { pre?: Layer; post?: Layer; top?: Layer; legCol?: [string, string]; legW?: number; shoe?: (p: Pen, heel: P2, toe: P2, u: number, near: boolean) => void;
  sleeve?: (p: Pen, pts: P2[], side: number, X: Ctx) => void; glove?: string;
  /** skip the walking legs (the caller draws its own: the cyclist on the pedals); the hips stay at standing height */
  noLegs?: boolean;
  /** raise the whole figure (metres: standing on a skateboard) */
  lift?: number };
/** MEASUREMENT PROBE (the test bench): when on, every drawFig records its arm bone lengths and feet (card units) */
export const probe: { on: boolean; arms: { side: number; up: number; fore: number }[]; feet: { lr: number; heel: P2; toe: P2 }[] } = { on: false, arms: [], feet: [] };

const viewOf = (P: Pose): { back: boolean; facing: -1 | 0 | 1 } => {
  const s = P.s ?? 0, c = P.c ?? 1;
  const back = P.view ? P.view === "back" : c < -0.35;
  /* from behind the head is NOT turned unless asked (the kit's 3/4-back cheek reads like an ear piece: unfair in a count) */
  return { back, facing: P.facing ?? (back ? 0 : Math.abs(s) > 0.28 ? (Math.sign(s) as -1 | 1) : 0) };
};
const kitOpts = (P: Pose, v: { back: boolean; facing: -1 | 0 | 1 }, extraTilt = 0, defExpr: Expr = "bright"): PersonOpts => ({
  view: v.back ? "back" : "front", facing: v.facing, mode: "stand", noLegs: true, expr: P.expr ?? defExpr, look: P.look ?? 0, lookY: P.lookY ?? 0,
  blink: P.blink ?? 0, talk: P.talk ?? -1, breath: P.breath ?? 0, tilt: (P.tilt ?? 0) + extraTilt, headTilt: P.headTilt ?? 0, nod: P.nod ?? 0, wind: P.wind ?? 0,
  face: P.mouth ? { ...(P.face ?? {}), mouth: P.mouth } : P.face, shift: P.shift, hairSwing: P.hairSwing, light: P.light, seed: P.seed ?? 1,
  rim: P.rim, rimK: P.rimK, cardSwing: P.cardSwing, flutter: P.flutter, hatLag: P.hatLag,
  hands: [{ a: "hang", hide: true }, { a: "hang", hide: true }],
});
/** the pen rotation the kit uses for the head (rotation about the chin + the body's lean) */
const headRotOf = (R: Rig): number[] | null => {
  const Ah = R.A + R.headTilt; if (!Ah) return null;
  const a = rad(R.A), cx = 300 - (R.chin - R.hipY) * Math.sin(a), cy = R.hipY + (R.chin - R.hipY) * Math.cos(a);
  return [rad(Ah), 300, R.chin, cx - 300, cy - R.chin];
};
/** a named hand target in BODY space (before the lean) for the arm on screen side `side` */
const armPt = (R: Rig, t: ArmTo, side: number): P2 => {
  const { T, tcx, chin, HH, hc, H, torsoBot } = R, S = R.sh(side), La = 2 * ARM * HH;
  switch (t) {
    case "hang": return [tcx + side * (1.1 * T.a + 6 * R.u), S[1] + 0.9 * La];
    case "ear": return [300 + side * (R.back ? 1.2 : 1.03) * H.a, hc + 0.14 * H.b];
    case "hip": return [tcx + side * 1.04 * T.a, torsoBot - 0.4 * HH];
    case "pocket": return [tcx + side * 0.92 * T.a, torsoBot - 0.1 * HH];
    case "chin": return [300 + side * 9 * R.u, hc + 0.96 * H.b];
    case "chest": return [tcx + side * 0.22 * T.a, chin + 0.42 * HH];
    case "belly": return [tcx + side * 0.28 * T.a, chin + 0.72 * HH];
    case "out": return [S[0] + side * 0.93 * La, S[1] + 0.08 * La];
    case "up": return [S[0] + side * 0.6 * La, S[1] - 0.74 * La];
    case "wave": return [S[0] + side * 0.46 * La, S[1] - 0.62 * La];
    case "raise": return [300 + side * 1.55 * H.a, hc - 0.2 * H.b];
    case "thumb": return [tcx + side * 1.5 * T.a, chin + 0.16 * HH];
    case "guard": return [300 + side * 0.72 * H.a, hc - 1.02 * H.b];
    case "talk": return [tcx + side * 1.55 * T.a, chin + 0.48 * HH];
    case "strap": return [tcx + side * 0.6 * T.a, chin + 0.3 * HH];
    case "seat": return [tcx + side * 0.55 * T.a, torsoBot + 0.2 * HH];
    case "point": return [S[0] + side * 0.97 * La, S[1] - 0.1 * La];
    case "low": return [tcx + side * 1.2 * T.a, chin + 0.86 * HH];
    case "hug": return [tcx - side * 0.1 * T.a, chin + 0.5 * HH];
    case "write": return [tcx + side * 0.05 * T.a, chin + 0.5 * HH];
    case "clip": return [tcx + side * 0.75 * T.a, chin + 0.62 * HH];
    case "show": return [S[0] + side * 0.68 * La, S[1] - 0.2 * La];
    case "shoulder": return [tcx + side * 1.3 * T.a, chin - 0.1 * HH];
    case "brow": return [300 + side * 1.42 * H.a, hc - 0.3 * H.b];
    case "paw": return [tcx + side * 0.5 * T.a, chin + 0.22 * HH];
    case "saddle": return [tcx + side * 1.55 * T.a, chin + 0.8 * HH];
    case "lift": return [tcx + side * 1.25 * T.a, chin - 0.48 * HH];
  }
};
const FRONT_TO: Partial<Record<ArmTo, boolean>> = { ear: true, chin: true, chest: true, belly: true, out: true, up: true, wave: true, raise: true, thumb: true, guard: true,
  talk: true, strap: true, point: true, hug: true, write: true, clip: true, low: true, hip: true, show: true, shoulder: true, brow: true, paw: true, saddle: true, lift: true };
const BACK_OVER: Partial<Record<ArmTo, boolean>> = { out: true, up: true, wave: true, raise: true, guard: true, point: true, thumb: true, show: true, shoulder: true, brow: true, lift: true, saddle: true };

// ================================================================== HANDS (v2)
const SKIN_H = "#f8f3ee", CREASE = "#b3a2c0";
type HPart = { t: "e"; c: P2; rx: number; ry: number } | { t: "c"; pts: P2[]; w: number } | { t: "r"; x0: number; y0: number; x1: number; y1: number; r: number };
/** draw a hand at the wrist h. dir = the forearm's direction (canvas radians); the fingers continue it (`ang` turns the
 *  hand), the thumb is on the side toward the body; the thumbs-up stays upright. z = size (1 = ~20 u gesture hands).
 *  Returns the fingertip (point: the index tip; pinch: where the thumb meets the index) */
const drawHand = (p: Pen, kind: HandKind, h: P2, u: number, side: number, ang: number, dir: number, glove?: string, z = 1): P2 => {
  if (kind === "none") return h;
  const v = u * z, ow = 1.45 * u * Math.max(0.85, Math.sqrt(z)), fill = glove ?? SKIN_H, line = glove ? "#c6bfd2" : CREASE;
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const up = kind === "thumb" ? -Math.PI / 2 + 0.2 * wrap(dir + Math.PI / 2) : dir;
  const a = up + rad(ang), ca = Math.cos(a), sa = Math.sin(a), ts = -side;
  /** local (x across, + = the thumb side; y along the fingers) -> card */
  const Lc = (x: number, y: number): P2 => [h[0] + x * ts * -sa * v + y * ca * v, h[1] + x * ts * ca * v + y * sa * v];
  const parts: HPart[] = [], creases: P2[][] = [];
  let tip: P2 = Lc(0, 10);
  const cap = (pts: [number, number][], w: number) => parts.push({ t: "c", pts: pts.map(([x, y]) => Lc(x, y)), w: w * v });
  const ov = (x: number, y: number, rx: number, ry: number) => parts.push({ t: "e", c: Lc(x, y), rx: rx * v, ry: ry * v });
  switch (kind) {
    case "open": { // an open palm (a wave): the palm, four spread fingers, the thumb out at 45 deg
      ov(0, 6.4, 6.6, 6.9);
      const fx = [3.9, 1.3, -1.3, -3.9], fl = [8.4, 9.6, 9.1, 7.4], fa = [11, 3, -5, -13];
      for (let i = 0; i < 4; i++) { const b: [number, number] = [fx[i], 10], t: [number, number] = [b[0] + fl[i] * Math.sin(rad(fa[i])), b[1] + fl[i] * Math.cos(rad(fa[i]))]; cap([b, t], 3.5); }
      cap([[5, 5], [10, 10.6]], 3.8); tip = Lc(1.3, 20); break;
    }
    case "point": { // a fist, the index out along the forearm, the thumb up on top
      ov(-0.4, 5.4, 6.4, 6.7); cap([[2.5, 8.5], [2.2, 20.5]], 3.9); cap([[5.2, 4.8], [6.8, 11.4]], 3.6);
      creases.push([Lc(-5, 8), Lc(-1, 10.6)], [Lc(-5.4, 4.8), Lc(-1.6, 6.6)]); tip = Lc(2.2, 22.4); break;
    }
    case "thumb": { // thumbs-up: an upright fist (knuckles to the lens), the thumb straight up on the body side
      parts.push({ t: "r", x0: -6.4 * v, y0: -3 * v, x1: 6.4 * v, y1: 8.6 * v, r: 3.6 * v }); cap([[3.3, 7.6], [3.3, 17.6]], 4.9);
      for (const y of [0.6, 3.4, 6.2]) creases.push([Lc(-6, y), Lc(1.2, y)]); tip = Lc(3.3, 19.6); break;
    }
    case "pinch": { // thumb and index tips touching (a clothes peg between them), the other fingers curled
      ov(-0.9, 4.6, 5.6, 5.8); cap([[1.8, 8.4], [0.8, 12.8], [2.6, 15.8]], 3.4); cap([[5.2, 5.4], [4.2, 10.4], [3.4, 15.2]], 3.7);
      creases.push([Lc(-4.8, 7.6), Lc(-1, 9.2)]); tip = Lc(3, 16.6); break;
    }
    case "fist": ov(0, 5.2, 6.7, 7); ov(4.8, 4.2, 2.7, 3.5); for (const x of [-3.6, -0.6, 2.4]) creases.push([Lc(x - 1.2, 10.4), Lc(x + 1, 11.1)]); tip = Lc(0, 12); break;
    case "grip": ov(0, 4.8, 6.1, 6.3); cap([[4.4, 3.4], [3, 9.2]], 3.3); creases.push([Lc(-4.6, 6.6), Lc(1.2, 7.8)], [Lc(-4.4, 3.8), Lc(1, 4.6)]); tip = Lc(0, 11); break;
    case "flat": { // a flat hand palm-down (its back to the lens): a long paddle with finger grooves, the thumb tucked
      parts.push({ t: "r", x0: -4.4 * v, y0: 0, x1: 4.4 * v, y1: 18 * v, r: 3.4 * v }); ov(4.8, 5.2, 2.4, 3.8);
      for (const x of [-1.5, 1.5]) creases.push([Lc(x, 12), Lc(x, 17)]); tip = Lc(0, 18.5); break;
    }
    default: ov(0, 4.4, 5.3, 5.7); ov(3.9, 3.2, 2.1, 2.9); tip = Lc(0, 9); break; // "ball": the relaxed hand
  }
  // one merged silhouette: every part in ink grown by the outline, then every fill
  const rect = (q: Extract<HPart, { t: "r" }>, grow: number): P2[] => rrect(q.x0 - grow, q.y0 - grow, q.x1 + grow, q.y1 + grow, q.r + grow).map(([x, y]) => Lc(x / v, y / v));
  for (const q of parts) {
    if (q.t === "e") p.poly(ell(q.c[0], q.c[1], q.rx + ow, q.ry + ow, deg(a) - 90, 22), INK, 0);
    else if (q.t === "c") p.stroke(q.pts, q.w + 2 * ow, INK);
    else p.poly(rect(q, ow), INK, 0);
  }
  for (const q of parts) {
    if (q.t === "e") p.poly(ell(q.c[0], q.c[1], q.rx, q.ry, deg(a) - 90, 22), fill, 0);
    else if (q.t === "c") p.stroke(q.pts, q.w, fill);
    else p.poly(rect(q, 0), fill, 0);
  }
  for (const cr of creases) p.stroke(cr, 0.95 * u * Math.sqrt(z), line);
  return tip;
};

/** a hand on its own (sheets, inserts, the crowd's custom figures): the same drawing as on the figures */
export const drawHandShape = (p: Pen, kind: HandKind, wrist: P2, u: number, side: number, dirDeg: number, ang = 0, z = 1, glove?: string) => drawHand(p, kind, wrist, u, side, ang, rad(dirDeg), glove, z);

// ---------------- props ----------------
/** p3 (D8): the LIME that replaced the white phone */
const PHONE_LIME = "#a2ee19";
/** p3 (D8): a phone's case is never white / cream (it must read against the off-white head AND the hand): a pale
 *  colour becomes the lime */
const phoneCol = (c: string): string => {
  const c6 = /^#[0-9a-f]{3}$/i.test(c) ? "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c, m = /^#([0-9a-f]{6})$/i.exec(c6); if (!m) return c;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mn > 150 && mx - mn < 70 ? PHONE_LIME : c;
};
const PROP_BEHIND: Partial<Record<Prop["k"], boolean>> = { horn: true, clipboard: true, book: true, bill: true, bills: true, unicycle: true, garment: true };
const drawProp = (p: Pen, pr: Prop, h: P2, u: number, side: number, ang: number, back: boolean, tip: P2) => {
  const R = (pts: P2[], a = ang) => rotP(pts, a, h);
  switch (pr.k) {
    case "phone": { // p3 (D8): a chunky smartphone, 27 x 48 u (x pr.size), in ONE SATURATED colour (never white / cream: a
      // pale colour becomes the lime) with a DARK keyline, a light inner rim and a dark camera block. It is drawn IN FRONT
      // of the hand: the hand grips its LOWER THIRD (the palm shows under it, three fingertips wrap its outer edge, the
      // thumb sits on the inner edge), so the upper two thirds are always clear of the fingers; ~70 % of it is outside the
      // head edge. The bottom inner corner stays in the hand when it grows (size floor for far phone people)
      const z = pr.size ?? 1, col = phoneCol(pr.col), a = -side * 9 + ang, w = 13.5 * u * z, t = 24 * u * z, cx = h[0] + side * (w - 8 * u), cy = h[1] - 5 * u - t;
      if (pr.glow && !back) { const gg = p.g, gx = h[0] - side * 14 * u, gy = h[1] - 6 * u, gr = gg.createRadialGradient(gx, gy, 0, gx, gy, 30 * u); gr.addColorStop(0, `rgba(150,225,255,${0.55 * pr.glow})`); gr.addColorStop(1, "rgba(150,225,255,0)");
        gg.save(); gg.fillStyle = gr; gg.beginPath(); gg.ellipse(gx, gy, 26 * u, 30 * u, 0, 0, TAU); gg.fill(); gg.restore(); }
      const kl = 3.1 * u * Math.max(1, Math.sqrt(z));
      p.poly(R(rrect(cx - w, cy - t, cx + w, cy + t, 5.4 * u * z), a), col, kl, "#15111d");
      p.poly(R(rrect(cx - w + 2.9 * u * z, cy - t + 2.9 * u * z, cx + w - 2.9 * u * z, cy + t - 2.9 * u * z, 3 * u * z), a), null, 1.7 * u * z, mix(col, "#ffffff", 0.55));
      // the camera block in the OUTER top corner (clear of the head), a light streak across the case
      const kx = cx + side * (w - 7.6 * u * z);
      p.poly(R(rrect(kx - 3.9 * u * z, cy - t + 4.6 * u * z, kx + 3.9 * u * z, cy - t + 14.6 * u * z, 2 * u * z), a), "#221d2c", 0.9 * u);
      p.dot(...R([[kx, cy - t + 7.6 * u * z]], a)[0], 1.5 * u * z, "#93a9d0"); p.dot(...R([[kx, cy - t + 11.6 * u * z]], a)[0], 1.2 * u * z, "#93a9d0");
      p.stroke(R([[cx - side * 6 * u * z, cy - 8 * u * z], [cx - side * 1 * u * z, cy + 3 * u * z]], a), 1.9 * u * z, mix(col, "#ffffff", 0.7));
      // the grip: three fingertips over the outer edge + the thumb on the inner edge, all inside the lower third
      for (let i = 0; i < 3; i++) { const q = R([[cx + side * (w - 1.6 * u), cy + t - (4.4 + 5.3 * i) * u]], a)[0]; p.poly(ell(q[0], q[1], 4.7 * u, 2.9 * u, a, 14), SKIN_H, 1.25 * u); }
      { const q = R([[cx - side * (w - 1.2 * u), cy + t - 8.6 * u]], a)[0]; p.poly(ell(q[0], q[1], 3.3 * u, 5 * u, a, 14), SKIN_H, 1.25 * u); }
      break;
    }
    case "cup": {
      p.poly(R([[h[0] - 7 * u, h[1] - 15 * u], [h[0] + 7 * u, h[1] - 15 * u], [h[0] + 5.2 * u, h[1] + 6 * u], [h[0] - 5.2 * u, h[1] + 6 * u]]), "#fbf6ec", 1.5 * u);
      p.poly(R(rrect(h[0] - 6.4 * u, h[1] - 8 * u, h[0] + 6.4 * u, h[1] + 0.5 * u, 0.5 * u)), "#b9783e", 1.1 * u);
      p.poly(R(rrect(h[0] - 8.2 * u, h[1] - 18.5 * u, h[0] + 8.2 * u, h[1] - 14.5 * u, 1.6 * u)), "#4a3a34", 1.2 * u);
      break;
    }
    case "book": {
      p.poly(R(rrect(h[0] - 15 * u, h[1] - 18 * u, h[0] + 13 * u, h[1] + 16 * u, 1.6 * u)), pr.col, 1.9 * u);
      p.poly(R(rrect(h[0] + 9 * u, h[1] - 16 * u, h[0] + 12 * u, h[1] + 14 * u, 0.5 * u)), "#fbf6ec", 0.8 * u);
      p.stroke(R([[h[0] - 9 * u, h[1] - 9 * u], [h[0] + 3 * u, h[1] - 9 * u]]), 2 * u, mix(pr.col, "#ffffff", 0.55));
      break;
    }
    case "clipboard": { // the study clipboard: a brown board, a white sheet with rows of ticks, a steel clip
      const a = ang + (pr.tilt ?? 0), bx = h[0] - side * 15 * u, by = h[1] - 8 * u;
      p.poly(R(rrect(bx - 17 * u, by - 27 * u, bx + 17 * u, by + 19 * u, 2.5 * u), a), "#a8743f", 2.1 * u);
      p.poly(R(rrect(bx - 14 * u, by - 22.5 * u, bx + 14 * u, by + 16 * u, 1 * u), a), "#fbf8ef", 1.2 * u);
      p.poly(R(rrect(bx - 7 * u, by - 30 * u, bx + 7 * u, by - 22.5 * u, 1.5 * u), a), "#b9bcc8", 1.5 * u);
      for (let r = 0; r < 5; r++) { p.stroke(R([[bx - 6 * u, by - 15 * u + r * 6.4 * u], [bx + (r % 2 ? 5 : 10) * u, by - 15 * u + r * 6.4 * u]], a), 1 * u, "#8a93a8");
        p.stroke(R([[bx - 11 * u, by - 15.6 * u + r * 6.4 * u], [bx - 9.6 * u, by - 14 * u + r * 6.4 * u], [bx - 7.6 * u, by - 17 * u + r * 6.4 * u]], a), 1 * u, r < 3 ? "#2f8a4a" : "#c8cbd6"); }
      break;
    }
    case "pencil": { const t0 = tip; p.band([[t0[0], t0[1] + 6 * u], [t0[0] + 1 * u, t0[1] - 14 * u]], "#f2c230", 3 * u, 0.9 * u, "round"); p.dot(t0[0] + 1 * u, t0[1] - 15 * u, 1.8 * u, "#e88a9a"); break; }
    case "peg": FX.drawPeg(p, [tip[0], tip[1] + 3 * u], u, ang * 0.3, pr.open ?? 0, 1); break;
    case "pegs": { const n = pr.n ?? 3; for (let i = 0; i < n; i++) FX.drawPeg(p, [h[0] + (i - (n - 1) / 2) * 4.6 * u, h[1] - 12 * u], u, 180 + (i - (n - 1) / 2) * 14, 0, 0.9); break; }
    case "bill": FX.drawBill(p, [h[0], h[1] - 14 * u], u, ang, (pr.size ?? 1) * 0.62, 0.3); break;
    case "bills": FX.drawBillsFan(p, h, u, pr.n ?? 3, ang, pr.spread ?? 28, (pr.size ?? 1) * 0.62); break;
    case "horn": { // a brass bulb horn: the black rubber bulb in the fist, the flared bell pointing out and up
      const q = clamp(pr.squeeze ?? 0, 0, 1), a = side * 34 + ang, bx = h[0], by = h[1];
      if (q > 0.3) for (const [d, w] of [[50, 9], [59, 13], [68, 17]] as const) {
        const arc: P2[] = []; for (let i = 0; i <= 8; i++) { const t = (i / 8 - 0.5) * 2; arc.push([bx + w * u * t, by - d * u + 3.2 * u * t * t]); }
        p.stroke(R(arc, a), 4.6 * u, INK); p.stroke(R(arc, a), 2.2 * u, "#fff2a8"); }
      const bell: P2[] = [[bx - 3.4 * u, by - 9 * u], [bx - 4.4 * u, by - 26 * u], [bx - 13 * u, by - 39 * u - 3 * u * q], [bx + 13 * u, by - 39 * u - 3 * u * q], [bx + 4.4 * u, by - 26 * u], [bx + 3.4 * u, by - 9 * u]];
      p.poly(R(bell, a), "#f2b632", 1.9 * u);
      p.poly(R(ell(bx, by - 39.5 * u - 3 * u * q, 13 * u, 3.6 * u), a), "#8a5a10", 1.5 * u);
      p.stroke(R([[bx - 1.4 * u, by - 12 * u], [bx - 2.4 * u, by - 26 * u], [bx - 8 * u, by - 35 * u]], a), 1.7 * u, "#fff2b8");
      p.poly(R(ell(bx, by + 1 * u, (10.5 + 4.2 * q) * u, (11.5 - 5 * q) * u), a), "#2a2230", 1.9 * u);   // the bulb squashes ~40 % on a squeeze
      p.stroke(R([[bx - 5 * u, by - 4 * u], [bx - 1 * u, by - 6.5 * u]], a), 1.6 * u, "#8a8598");
      break;
    }
    case "unicycle": FX.drawUnicycle(p, [h[0], h[1] - 2 * u], 975, pr.s ?? 1, pr.spin ?? 0, u, pr.lean ?? 0); break;
    case "garment": FX.drawGarmentBag(p, [h[0], h[1] - 4 * u], u, pr.open ?? 0, pr.side ?? (side > 0 ? 1 : -1), pr.sway ?? 0, pr.suit ?? 1); break;
    case "mug": FX.drawMug(p, [tip[0], tip[1] - 2 * u], u, pr.col, pr.steam ?? 0); break;
  }
};

// ---------------- legs: the projected 3D walk (gaits) ----------------
type LegSpec = { hip: number; len: number; phase: number; go: number; duck: number; rise: number; s: number; c: number; u: number; col: [string, string]; w: number; shoeCol: string;
  shoe?: Extras["shoe"]; back: boolean; gd: GaitDef; hipX: number; shift: number; feet?: [FootSt, FootSt] };
/** a foot in the body frame: forward metres, lift metres, pitch (rad, + = toe up) */
export type FootSt = [number, number, number];
/** the foot of one leg in the body frame at cycle phase ps (0..1). The pitch is continuous through the whole cycle
 *  (heel strike 0.5 -> flat -> toe-off -0.3 -> swing -> 0.5 at the next strike) */
const footAt = (ps: number, L: number, gd: GaitDef): FootSt => {
  const q = ps - Math.floor(ps), d = gd.duty, Ls = L * d;
  if (q < d) { const t = q / d; return [Ls / 2 - Ls * t, 0, gd.toe ? -0.55 : 0.5 * Math.max(0, 1 - t / 0.16) - 0.3 * sm((t - 0.8) / 0.2)]; }
  const t = (q - d) / (1 - d), e = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return [-Ls / 2 + Ls * e, gd.lift * Math.sin(Math.PI * t) ** 1.2, gd.toe ? -0.7 + 0.25 * Math.sin(Math.PI * t)
    : -0.75 * Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t) - 0.3 * (1 - sm(t / 0.2)) + 0.5 * sm((t - 0.7) / 0.3)];
};
/** card point of a body-frame point (forward, up, lateral-right in metres) */
const proj = (f: number, up: number, lat: number, s: number, c: number, hx = 0): P2 => [300 + (f * s - lat * c + hx) * UM, 975 - up * UM + f * c * 0.11 * UM];
/** the hips' drop for the gait at phase ph (m): lowest at the gait's `low` step phase (3-4 f after contact on a walk) */
const bobOf = (gd: GaitDef, ph: number, go: number) => { const sp = ((2 * ph) % 1 + 1) % 1; return gd.bob * go * (0.5 + 0.5 * Math.cos(TAU * (sp - gd.low))); };
const drawLegs = (p: Pen, G: LegSpec): number => {
  const gd = G.gd, L = gd.stride * G.go;   /* EXACTLY the gait stride (any leg length, ducking or not): walkPhase(metres) never slides */
  const hipH = G.hip - bobOf(gd, G.phase, G.go) - gd.sink * G.go - 0.15 * G.duck + 0.035 * G.rise, th = G.len / 2;
  const legs = ([1, -1] as const).map((lr) => { // lr = +1 the figure's RIGHT leg
    let [ff, fu, pitch] = G.feet ? G.feet[lr > 0 ? 0 : 1] : footAt(G.phase + (lr > 0 ? 0 : 0.5), L, gd);
    // the foot ROLLS: about the heel while the toe is up (strike), about the toe while the heel is up (toe-off): the
    // part on the ground never skids
    if (!gd.toe) { if (pitch > 0) { ff -= 0.04 * (1 - Math.cos(pitch)); fu += 0.04 * Math.sin(pitch); } else if (pitch < 0) { ff += 0.11 * (1 - Math.cos(pitch)); fu += 0.11 * Math.sin(-pitch); } }
    const ank = 0.045 + (gd.toe ? 0.045 * G.go : 0) + 0.05 * G.rise;
    // standing weight shift: the loaded leg straight under the hips, the free knee bends, its heel lifts a touch
    const free = Math.max(0, -G.shift * lr * Math.sign(G.c || 1)) * (1 - G.go);
    fu += 0.025 * free; if (G.rise > 0) pitch = -0.6 * G.rise;
    const hipP: [number, number] = [0, hipH], an: [number, number] = [ff, fu * (G.go > 0 ? 1 : 1) + ank];
    let dx = an[0] - hipP[0], dy = an[1] - hipP[1], d = Math.hypot(dx, dy); const mx = 0.997 * G.len;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    const k = d / 2, h = Math.sqrt(Math.max(0, th * th - k * k)), ux = dx / d, uy = dy / d;
    const knee: [number, number] = [hipP[0] + ux * k - uy * h, hipP[1] + uy * k + ux * h];   /* the knee bends FORWARD */
    const bend = h / th, latH = 0.074 * lr, latF = 0.086 * lr - lr * 0.012 * free, latK = (0.08 + 0.085 * bend) * lr;
    const P0 = proj(0, hipH, latH, G.s, G.c, G.hipX), PK = proj(knee[0], knee[1], latK, G.s, G.c, G.hipX * 0.5), PA = proj(hipP[0] + dx, hipP[1] + dy, latF, G.s, G.c);
    const cp = Math.cos(pitch), sp = Math.sin(pitch), toeOut = 0.075 * lr;
    const heel = proj(hipP[0] + dx - 0.04 * cp, hipP[1] + dy - ank - 0.04 * sp + 0.012, latF, G.s, G.c);   /* rigid with the foot */
    const toe = proj(hipP[0] + dx + 0.11 * cp, hipP[1] + dy - ank + 0.11 * sp + 0.012, latF + toeOut * Math.abs(G.c), G.s, G.c);
    return { lr, P0, PK, PA, heel, toe, depth: lr * G.s + 0.3 * (hipP[0] + dx) * G.c };
  }).sort((a, b) => a.depth - b.depth);
  legs.forEach((g, i) => {
    if (probe.on) { const M = p.g.getTransform(), a = M.transformPoint(new DOMPoint(g.heel[0], g.heel[1])), b = M.transformPoint(new DOMPoint(g.toe[0], g.toe[1])); probe.feet.push({ lr: g.lr, heel: [a.x, a.y], toe: [b.x, b.y] }); }
    const col = g.lr > 0 ? G.col[0] : G.col[1], pts = bent(g.P0, g.PK, g.PA, 0.3);
    if (G.w > 6.5 * G.u) p.band(pts, col, G.w, 1.5 * G.u, "round"); else p.stroke(pts, G.w, col);
    if (G.shoe) G.shoe(p, g.heel, g.toe, G.u, i === 1);
    else { if (G.shoeCol !== INK) p.stroke([g.heel, g.toe], 7.2 * G.u + 2.6, INK); p.stroke([g.heel, g.toe], 7.2 * G.u, G.shoeCol); }
  });
  return hipH;
};

// ---------------- arms: IK / FK / aim, solved once per figure ----------------
type Solved = { side: number; A: Arm; S: P2; e: P2; h: P2; front: boolean; named: string | null; dir: number };
const unfin = (R: Rig, q: P2): P2 => { const a = -rad(R.A), cs = Math.cos(a), sn = Math.sin(a), x = q[0] - 300, y = q[1] - R.hipY; return [300 + x * cs - y * sn, R.hipY + x * sn + y * cs]; };
const normA = (a: number) => ((((a + 90) % 360) + 360) % 360) - 90;
const solveArm = (R: Rig, A: Arm, side: number, back: boolean, La: number, frontDefault: (named: string | null) => boolean): Solved => {
  const u = R.u, base = (t: ArmTo | P2): P2 => (typeof t === "string" ? R.fin(armPt(R, t, side)) : t), S = R.fin(R.sh(side));
  let h = base(A.to ?? "hang");
  if (A.aim) { const dx = A.aim[0] - S[0], dy = A.aim[1] - S[1], n = Math.hypot(dx, dy) || 1, r = 1.93 * La; h = L2(h, [S[0] + (dx / n) * r, S[1] + (dy / n) * r], clamp(A.k ?? 1, -0.25, 1.25)); }
  else if (A.to2 !== undefined) h = L2(h, base(A.to2), clamp(A.k ?? 0, -0.25, 1.25));
  h = [h[0] + (A.dx ?? 0) * u, h[1] + (A.dy ?? 0) * u];
  const J = ik2(S, h, La, La, A.flip ? [-side * 0.5, -1] : [side * 0.45, 1]);
  let e = J.e, hh = J.b;
  if (A.fk) { // angle blend IK -> FK in body space (arcs, never a straight-line slide)
    const kk = A.fkK ?? 1, Sb = R.sh(side), eb = unfin(R, e), hb = unfin(R, hh);
    const angOf = (a: P2, b: P2) => normA(deg(Math.atan2(side * (b[0] - a[0]), b[1] - a[1])));
    const a1 = lerp(angOf(Sb, eb), A.fk[0], kk), a2 = lerp(angOf(eb, hb), A.fk[1], kk), d = (x: number): P2 => [side * Math.sin(rad(x)), Math.cos(rad(x))];
    const E: P2 = [Sb[0] + La * d(a1)[0], Sb[1] + La * d(a1)[1]], H: P2 = [E[0] + La * d(a2)[0], E[1] + La * d(a2)[1]];
    e = R.fin(E); hh = R.fin(H);
  }
  const tg = A.aim ? "point" : A.to2 !== undefined && (A.k ?? 0) > 0.5 ? A.to2 : A.to ?? "hang", named = typeof tg === "string" ? tg : null;
  const front = A.front ?? (A.fk && (A.fkK ?? 1) > 0.5 ? (back ? hh[1] < S[1] : true) : frontDefault(named));
  return { side, A, S, e, h: hh, front, named, dir: Math.atan2(hh[1] - e[1], hh[0] - e[0]) };
};
/** the default walking arm: FK swing opposite the legs with 1-2 f of drag, widest on the down; elbows bend on the
 *  forward swing; a jog pumps, a tiptoe holds paws up */
const swingArm = (side: number, figRight: boolean, P: Pose, gd: GaitDef): Arm => {
  const s = P.s ?? 0, c = P.c ?? 1, go = P.go ?? 0, ph = (P.walk ?? 0) - 0.045;
  const legF = (k: number) => footAt(ph + k, 1, gd)[0] / (gd.duty / 2);
  const sw = (figRight ? legF(0.5) : legF(0)) * go;   // + = this arm forward (its opposite leg is forward)
  if (gd.toe) return { to: "paw", dy: -2 * Math.sin(TAU * 2 * (P.walk ?? 0)), hand: "ball" };
  if (gd === GAIT.jog) return { fk: [12 + side * s * sw * 32 * gd.arm, 12 + side * s * (sw * 30 + 95) - (1 - Math.abs(s)) * 115], fkK: go, hand: "fist" };
  const a1 = 7 + side * s * sw * 30 * gd.arm - Math.abs(c) * Math.max(0, sw) * 7 * gd.arm;
  return { fk: [a1, a1 + side * s * (Math.max(0, sw) * 20 + 6) * gd.arm + (1 - Math.abs(s)) * 3], fkK: Math.min(1, go * 3), to: "hang", hand: "ball" };
};

// ================================================================== THE FIGURE
/** p3: a thin pale rim along the part of a contour that FACES the light (light = the canvas angle it comes from), just
 *  outside the ink line */
const sunRim = (p: Pen, pts: P2[], light: number, off: number, w: number, col = "#fff1d6") => {
  const n = pts.length; if (n < 6) return; let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x / n; cy += y / n; }
  const lit = pts.map(([x, y]) => Math.cos(Math.atan2(y - cy, x - cx) - light) > 0.35), s0 = lit.findIndex((v, i) => v && !lit[(i + n - 1) % n]); if (s0 < 0) return;
  const run: P2[] = []; for (let k = 0; k < n; k++) { const i = (s0 + k) % n; if (!lit[i]) break; const [x, y] = pts[i], d = Math.hypot(x - cx, y - cy) || 1; run.push([x + ((x - cx) / d) * off, y + ((y - cy) / d) * off]); }
  if (run.length > 2) { const g = p.g; g.save(); g.globalAlpha *= 0.8; p.stroke(run, w, col); g.restore(); }
};
/** a smear frame: the figure drawn once offscreen, laid down twice as fading multiples behind it, then stretched along
 *  the motion */
const smearDraw = (p: Pen, k: number, dir: number, fn: (q: Pen) => void) => {
  // p3 (D8): OPAQUE smear. The figure cards are lit alphaTest cards: the old see-through multiples were cut away in the
  // film (the spin read as a one-frame swap). Now: two trailing copies of the silhouette in flat pale tones, cut into
  // horizontal speed streaks (a comb), then the figure itself stretched along the motion. dir +1 = moving screen-right
  const g = p.g, T = g.getTransform(), W = g.canvas.width, H = g.canvas.height;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const cv = mk(), og = cv.getContext("2d")!; og.setTransform(T); fn(new Pen(og));
  const sc = Math.abs(T.a), ofs = 44 * sc * dir * k, cx = T.e + 300 * T.a, band = Math.max(4, Math.round(17 * sc));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (const [i, tone, duty] of [[2, "#e4dcf4", 0.3], [1, "#a999cf", 0.5]] as const) {
    const st = mk(), sg = st.getContext("2d")!;
    sg.drawImage(cv, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = tone; sg.fillRect(0, 0, W, H);
    sg.globalCompositeOperation = "destination-out"; sg.fillStyle = "#000";
    for (let y = ((i * 7) % band) - band; y < H; y += band) sg.fillRect(0, y + band * duty, W, band * (1 - duty));
    g.drawImage(st, -i * ofs, 0);
  }
  g.translate(cx - 0.5 * ofs, 0); g.scale(1 + 0.3 * k, 1); g.translate(-cx, 0); g.drawImage(cv, 0, 0);
  g.restore();
};
/** draw one person: outfit o, pose P, costume layers X */
export const drawFig = (p: Pen, o: Outfit, P0: Pose, X: Extras = {}) => {
  if ((P0.smear ?? 0) > 0.04) { smearDraw(p, Math.min(1, P0.smear!), P0.smearDir ?? 1, (q) => drawFig(q, o, { ...P0, smear: 0 }, X)); return; }
  const go = clamp(P0.go ?? 0, 0, 1), ph = P0.walk ?? 0, gd = GAIT[P0.gait ?? "walk"];
  // automatic WALK OVERLAP (callers can override): the hair swings with the steps 2-3 f late, the pack bounces after the hips
  // p3 (D8): twice as strong (it did not read in the film), the lanyard card and the coat hems join in, and while go
  // ramps (a stop / a start) the hair, the pack and the card swing on forward
  const ramp = 4 * go * (1 - go), fw = Math.sign(P0.s ?? 0) || 1;
  const P: Pose = { ...P0, hairSwing: P0.hairSwing ?? go * 8.5 * Math.sin(TAU * (ph - 0.08)) + 9 * ramp * fw, pack: P0.pack ?? go * 5 * Math.cos(TAU * (2 * ph - gd.low - 0.1)) + 4 * ramp,
    cardSwing: P0.cardSwing ?? go * 0.55 * Math.sin(TAU * (ph - 0.12)) + 0.7 * ramp * fw, flutter: P0.flutter ?? go * 0.5 * Math.sin(TAU * (2 * ph - 0.2)) };
  const g = p.g, v = viewOf(P), s = P.s ?? 0, c = P.c ?? 1;
  const dRaw = clamp(P.duck ?? 0, -0.3, 1.1), duck = Math.max(0, dRaw), rise = Math.max(0, -dRaw) / 0.12;
  const shift = clamp(P.shift ?? 0, -1, 1) * (1 - go);
  const lean = duck * 20 * s + go * gd.lean * s + (P.lean ?? 0) * s + (go ? 1.2 * Math.sin(TAU * ph) * Math.abs(c) : 0);
  const ko = kitOpts({ ...P, nod: (P.nod ?? 0) + 3.0 * duck + 0.6 * go * gd.lean / 4 * Math.abs(c) }, v, lean), R = rig(o, ko), u = R.u;
  // the card squeeze: where a heading-driven view flips front <-> back (a turn reads as a turn), times P.sq; stretch
  const sqAuto = P.view ? 1 : 1 - 0.32 * Math.exp(-(((c + 0.35) / 0.08) ** 2)), st = P.stretch ?? 1;
  g.save(); g.translate(300, 975 - (P.hop ?? 0) * UM); g.scale((sqAuto * (P.sq ?? 1)) / Math.sqrt(st), st); g.translate(-300, -975);
  // ---- legs ----
  if (X.lift) g.translate(0, -X.lift * UM);
  const kitHip = (975 - R.hipY) / UM, legLen = kitHip + 0.064 + (o.build === "tall" || o.build === "lanky" ? 0.01 : 0);
  const hipX = shift * 0.035 * Math.abs(c);
  const hipH = X.noLegs ? kitHip : drawLegs(p, { hip: kitHip, len: legLen, phase: ph, go, duck, rise, s, c, u, col: X.legCol ?? [mix(o.pants, INK, 0.62), mix(o.pants, INK, 0.62)], w: X.legW ?? 5.4 * u,
    shoeCol: o.shoes, shoe: X.shoe, back: v.back, gd, hipX, shift, feet: P.feet });
  // ---- upper body: the kit's hips land on the walk's hips; a duck folds the torso ----
  const fold = 1 - (0.05 + 0.1 * Math.abs(c)) * duck, dy = (kitHip - hipH) * UM;
  g.save(); g.translate(hipX * UM, R.hipY + dy); g.scale(1, fold); g.translate(0, -R.hipY);
  const La = ARM * R.HH;
  // in a PROFILE the shoulders foreshorten toward the body's centre line (the arms swing forward / back, not out like a
  // penguin's), and the walking arm on the far side goes behind the torso. The figure's RIGHT side faces the lens when
  // s > 0 (its right arm is screen-left in a front view, screen-right in a back view)
  const prof = clamp((Math.abs(s) - 0.45) / 0.45, 0, 1), kS = 1 - 0.62 * prof;
  const RS: Rig = prof > 0 ? { ...R, sh: (side: number): P2 => { const q = R.sh(side); return [R.tcx + (q[0] - R.tcx) * kS, q[1]]; } } : R;
  const arms = ([-1, 1] as const).map((side) => {
    const figRight = v.back ? side > 0 : side < 0, near = figRight === s > 0;
    const A: Arm = (side < 0 ? P.armL : P.armR) ?? { ...swingArm(side, figRight, P, gd), ...(Math.abs(s) > 0.3 ? { front: near } : {}) };
    return solveArm(RS, A, side, v.back, La, (named) => (v.back ? !!(named && BACK_OVER[named as ArmTo]) : named ? !!FRONT_TO[named as ArmTo] : true));
  });
  const Xc: Ctx = { R, u, back: v.back, facing: v.facing, s, c, light: ko.light ?? rad(-120), o, pose: P, headRot: headRotOf(R), bodyRot: R.A ? [rad(R.A), 300, R.hipY] : null,
    hands: arms.map((a) => ({ side: a.side, h: a.h })) };
  if (probe.on) for (const a of arms) probe.arms.push({ side: a.side, up: Math.hypot(a.e[0] - a.S[0], a.e[1] - a.S[1]) / R.HH, fore: Math.hypot(a.h[0] - a.e[0], a.h[1] - a.e[1]) / R.HH });
  const armCol = mix(o.cardigan ?? o.shirt, INK, 0.88);
  const drawArm = (a: Solved) => {
    const pts = bent(a.S, a.e, a.h, 0.34);
    const pr = a.A.prop, kind: HandKind = a.A.hand ?? (pr ? "grip" : "ball"), ang = a.A.ang ?? 0, z = (a.A.hs ?? 1) * (P.handK ?? 1);
    if (pr && pr.k === "unicycle") drawProp(p, pr, a.h, u, a.side, ang, v.back, a.h);
    if (X.sleeve) X.sleeve(p, pts, a.side, Xc); else p.stroke(pts, 5.6 * u, armCol);
    if (pr && pr.k !== "unicycle" && PROP_BEHIND[pr.k]) drawProp(p, pr, a.h, u, a.side, ang, v.back, a.h);
    const tip = drawHand(p, kind, a.h, u, a.side, ang, a.dir, X.glove, kind === "ball" ? Math.max(1, z * 0.9) : z);
    if (pr && !PROP_BEHIND[pr.k]) drawProp(p, pr, a.h, u, a.side, ang, v.back, tip);
  };
  p.rot = null;
  for (const a of arms) if (!a.front) drawArm(a);
  if (X.pre) X.pre(p, Xc);
  p.rot = null;
  drawPerson(p, o, ko);
  // p3: a soft cast shadow of the head on the chest (cloth shading), clipped to the torso, under the chin
  if (!v.back) notHead(p, Xc, () => { p.rot = Xc.bodyRot; const g2 = p.g; g2.save(); g2.globalAlpha = 0.16; p.clip(blobPts(R.tcx, R.tcy, R.T), () => p.poly(ell(300 + 6 * u, R.chin + 0.02 * R.HH, 0.86 * R.H.a, 0.2 * R.HH), "#3a1a5a", 0)); g2.restore(); });
  // p3: a RIM LIGHT on the edge toward the sun (the head, the torso): a thin warm line on the lit side only
  p.rot = Xc.headRot; sunRim(p, blobPts(300, R.hc, R.H), Xc.light, 1.1 * u, 1.5 * u);
  notHead(p, Xc, () => { p.rot = Xc.bodyRot; sunRim(p, blobPts(R.tcx, R.tcy, R.T), Xc.light, 1.1 * u, 1.4 * u); });
  p.rot = null;
  if (X.post) X.post(p, Xc);
  p.rot = null;
  for (const a of arms) if (a.front) drawArm(a);
  if (X.top) X.top(p, Xc);
  p.rot = null;
  g.restore(); g.restore();
};

// ================================================================== COSTUME LAYERS
/** run fn clipped to everything EXCEPT the head (a layer that sits on the torso, under the chin) */
const notHead = (p: Pen, X: Ctx, fn: () => void) => {
  const g = p.g, R = X.R; p.rot = X.headRot;
  const hp = blobPts(300, R.hc, R.H).map(([x, y]) => p.P(x, y)); p.rot = null;
  g.save(); g.beginPath(); g.rect(-400, -400, 1400, 1800);
  hp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip("evenodd");
  fn(); g.restore(); p.rot = null;
};
/** big over-ear headphones in `col`: the band over the crown, a cup on each side of the head (front and back views). v2:
 *  Pose.cupOff lifts one cup off the ear toward the hand on that screen side (the band arm stretches to it) */
const headphones = (col: string): Layer => (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc, off = X.pose.cupOff; p.rot = X.headRot;
  const band: P2[] = []; for (let i = 0; i <= 20; i++) { const t = Math.PI + (Math.PI * i) / 20; band.push([300 + 1.06 * H.a * Math.cos(t), hc - 0.1 * H.b + 1.05 * H.b * Math.sin(t)]); }
  p.band(band, shade(col, 0.55), 6.4 * u, 1.5 * u, "round");
  p.stroke(band.slice(5, 16).map(([x, y]) => [x, y - 1.2 * u] as P2), 1.5 * u, mix(col, "#ffffff", 0.5));
  const cup = (cx: number, cy: number, sd: number) => {
    p.poly(ell(cx, cy, 11.5 * u, 17 * u, sd * 6), col, 2.1 * u);
    p.poly(ell(cx + sd * 3.2 * u, cy, 6 * u, 12.5 * u, sd * 6), shade(col, 0.72), 1.3 * u);
    p.stroke([[cx - sd * 4.5 * u, cy - 10 * u], [cx - sd * 5.5 * u, cy + 2 * u]], 1.7 * u, mix(col, "#ffffff", 0.6));
  };
  if (X.pose.cable !== undefined && !X.back) { // p3: a cable from the screen-left cup down to the pocket, swinging
    const c0 = p.P(300 - 1.04 * H.a, hc + 0.3 * H.b), sw = X.pose.cable * u, c1: P2 = [R.tcx - 0.5 * R.T.a, R.torsoBot - 0.2 * R.HH], pts: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, w = 1 - t; pts.push([w * w * c0[0] + 2 * w * t * (c0[0] - 14 * u + sw) + t * t * c1[0], w * w * c0[1] + 2 * w * t * (c1[1] + 6 * u) + t * t * c1[1]]); }
    p.rot = null; p.stroke(pts, 2.6 * u, INK); p.stroke(pts, 1.2 * u, mix(col, "#ffffff", 0.3)); p.rot = X.headRot; }
  for (const sd of [-1, 1]) {
    const cx = 300 + sd * 1.04 * H.a, cy = hc + 0.08 * H.b;
    if (off && off.side === sd && off.k > 0.02) {
      const hand = X.hands.find((q) => q.side === sd);
      const ear = p.P(cx, cy), tgt: P2 = hand ? [hand.h[0] + sd * 2 * u, hand.h[1] - 9 * u] : ear, at = L2(ear, tgt, clamp(off.k, 0, 1.1)), bandEnd = p.P(band[sd < 0 ? 0 : 20][0], band[sd < 0 ? 0 : 20][1]);
      p.rot = null;
      p.band([bandEnd, L2(bandEnd, at, 0.5), at], shade(col, 0.55), 5 * u, 1.3 * u, "round");
      cup(at[0], at[1], sd);
      p.rot = X.headRot;
    } else cup(cx, cy, sd);
  }
  p.rot = null;
};
/** the hero's backpack: behind the torso in a front view (its sides + top show, straps over the shoulders are drawn in
 *  `post`), the whole pack on her back in a back view; Pose.pack bounces it (u) */
const packPre = (col: string): Layer => (p, X) => {
  if (X.back) return; const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, b = -(X.pose.pack ?? 0) * u; p.rot = X.bodyRot;
  p.poly(rrect(tcx - 1.2 * T.a, chin + 0.02 * HH + b, tcx + 1.2 * T.a, torsoBot - 0.16 * HH + b, 14 * u), col, 2.2 * u);
  p.rot = null;
};
const packPost = (col: string): Layer => (p, X) => {
  const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R, b = -(X.pose.pack ?? 0) * u;
  if (X.back) {
    p.rot = X.bodyRot;
    const pk = rrect(tcx - 0.86 * T.a, chin + 0.1 * HH + b, tcx + 0.86 * T.a, torsoBot - 0.1 * HH + b, 13 * u);
    p.gradFill(pk, col, shade(col, 0.78), X.light, 0.3); p.poly(pk, null, 2.3 * u);
    p.poly(rrect(tcx - 0.56 * T.a, chin + 0.52 * HH + b, tcx + 0.56 * T.a, torsoBot - 0.2 * HH + b, 7 * u), shade(col, 0.86), 1.6 * u);
    p.stroke([[tcx - 0.4 * T.a, chin + 0.6 * HH + b], [tcx + 0.4 * T.a, chin + 0.6 * HH + b]], 1.8 * u, "#fbf6ec");
    p.stroke([[tcx - 0.62 * T.a, chin + 0.26 * HH + b], [tcx + 0.62 * T.a, chin + 0.26 * HH + b]], 1.6 * u, shade(col, 0.6));
    p.band([[tcx - 7 * u, chin + 0.1 * HH + b], [tcx - 7 * u, chin + 0.02 * HH + b], [tcx + 7 * u, chin + 0.02 * HH + b], [tcx + 7 * u, chin + 0.1 * HH + b]], shade(col, 0.7), 3 * u, 1 * u, "round");
    p.rot = null; return;
  }
  notHead(p, X, () => { p.rot = X.bodyRot;
    for (const sd of [-1, 1]) p.band([[tcx + sd * 0.66 * T.a, chin - 0.04 * HH], [tcx + sd * 0.74 * T.a, chin + 0.2 * HH], [tcx + sd * 0.9 * T.a, chin + 0.5 * HH]], col, 6.6 * u, 1.4 * u, "round");
  });
};
/** a BOB's top: the kit draws a bob only at the sides (it was made for a hat): this adds the hair cap with a soft fringe */
const bobTop: Layer = (p, X) => {
  const { R, u } = X, H = R.H, hc = R.hc, col = X.o.hair ?? "#5a3b2a"; if (X.back) return; p.rot = X.headRot;
  const cut = hc - 0.5 * H.b, hp = blobPts(300, hc, H), top = hp.filter(([, y]) => y < cut).map(([x, y]) => [300 + (x - 300) * 1.04, hc + (y - hc) * 1.04] as P2);
  top.sort((a, b) => Math.atan2(a[1] - hc, a[0] - 300) - Math.atan2(b[1] - hc, b[0] - 300));
  const x0 = top[0][0], x1 = top[top.length - 1][0], fr: P2[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; fr.push([x1 + (x0 - x1) * t, cut + 5 * u * Math.sin(Math.PI * t) + (i % 2 ? 2.2 * u : 0)]); }
  const cap = [...top, ...fr];
  p.gradFill(cap, col, shade(col, 0.8), X.light, 0.4); p.poly(cap, null, 3.2 * u);
  p.arc(300 - 0.3 * H.a, hc - 0.72 * H.b, 16 * u, 7 * u, 200, 290, 2.6 * u, mix(col, "#ffffff", 0.5));
  p.rot = null;
};
/** the professor's bow tie */
const bowTie = (col: string): Layer => (p, X) => {
  if (X.back) return; const { R, u } = X; notHead(p, X, () => { p.rot = X.bodyRot; const cx = R.tcx, cy = R.chin + 0.075 * R.HH;
    for (const sd of [-1, 1]) p.poly([[cx, cy], [cx + sd * 12 * u, cy - 6.5 * u], [cx + sd * 12 * u, cy + 6.5 * u]], col, 1.5 * u);
    p.poly(ell(cx, cy, 3.4 * u, 3.8 * u), shade(col, 0.8), 1.2 * u); });
};
/** the professor's arms as tweed SLEEVES (a tube in the jacket colour with an ink rim and a white cuff) */
const tweedSleeve: NonNullable<Extras["sleeve"]> = (p, pts, _side, X) => {
  const u = X.u, n = pts.length;
  p.band(pts, X.o.shirt, 8.6 * u, 1.5 * u, "round");
  p.band([L2(pts[n - 1], pts[n - 2], 0.5), L2(pts[n - 1], pts[n - 2], 0.1)], "#f6f3ec", 8.2 * u, 1.2 * u, "round");
};
/** a sleeve in the cardigan / shirt colour (the student's overshirt, the interviewer's cardigan): readable arms */
const clothSleeve: NonNullable<Extras["sleeve"]> = (p, pts, _side, X) => { p.band(pts, X.o.cardigan ?? X.o.shirt, 7.4 * X.u, 1.4 * X.u, "round"); };
/** a varsity jacket seen from behind / in front: white hem stripe and a big plain number */
const varsity = (num: string): Layer => (p, X) => {
  const { R, u } = X, { T, tcx, chin, HH, torsoBot } = R;
  const body = blobPts(tcx, R.tcy, T);
  notHead(p, X, () => { p.rot = X.bodyRot; p.clip(body, () => {
    p.band([[tcx - 1.4 * T.a, torsoBot - 0.05 * HH], [tcx + 1.4 * T.a, torsoBot - 0.05 * HH]], "#f6f3ea", 0.07 * HH, 1 * u);
    p.stroke([[tcx - 1.4 * T.a, torsoBot - 0.05 * HH], [tcx + 1.4 * T.a, torsoBot - 0.05 * HH]], 1.6 * u, "#c8452c");
    if (X.back) p.text(num, tcx, chin + 0.5 * HH, 0.36 * HH, "#f6f3ea", "Arial Black");
    else { p.stroke([[tcx, chin + 0.1 * HH], [tcx, torsoBot]], 1.6 * u, shade(X.o.shirt, 0.6)); for (const k of [0.3, 0.5, 0.7]) p.dot(tcx + 3 * u, chin + k * HH, 2.2 * u, "#f6f3ea"); }
  }); });
};
/** a tee's round collar band (the dude) */
const teeCollar = (col: string): Layer => (p, X) => {
  if (X.back) return; const { R, u } = X;
  notHead(p, X, () => { p.rot = X.bodyRot; p.arc(R.tcx, R.chin - 0.02 * R.HH, 0.42 * R.T.a, 0.09 * R.HH, 15, 165, 3.4 * u, col); });
};

// ================================================================== THE CAST
export const C = {
  phoneRed: "#e9342c", phoneLime: PHONE_LIME, phoneYellow: "#ffd21a", phoneBlue: "#36b0ff", phonePink: "#ff5fae",
  /** p3 (D8): the WHITE phone became LIME (white on a white head and hand was invisible). The old name stays an alias */
  phoneWhite: PHONE_LIME,
  cansGreen: "#57d23a", cansOrange: "#ff8a1f", cansLime: "#8ee03a", pack: "#f28a1c", hair: FIT.CLOWN_HAIR,
};
/** the arm at the ear holding a phone: a grip hand on the lower third of a saturated phone (27 x 48 u x size) with a dark
 *  keyline, in front of the head edge. size: the SIZE FLOOR for far phone people (phoneSizeAt / phoneSizeFor) */
export const phoneArm = (col: string, dx = 0, dy = 0, size = 1): Arm => ({ to: "ear", prop: size !== 1 ? { k: "phone", col, size } : { k: "phone", col }, hand: "grip", dx, dy });
/** SIZE FLOOR: the phone size multiplier for a figure that is figPx tall ON SCREEN at 1080 x 1920 (a 1.62 m figure x its
 *  putFig scale), so its phone is still >= minPx wide (default 14 px at 1080). 1 for near figures, capped at 2.4 */
export const phoneSizeFor = (figPx: number, minPx = 14) => clamp(minPx / (0.0864 * Math.max(1, figPx)), 1, 2.4);
/** the same from the camera: depth = the figure's distance along the lens axis (E.scr(id, f, pos)[2]), tanHalfFov =
 *  E.camB(id, f).t, scale = the putFig scale */
export const phoneSizeAt = (depth: number, tanHalfFov: number, scale = 1, minPx = 14) => phoneSizeFor((1.62 * scale * 1920) / (2 * Math.max(0.1, depth) * tanHalfFov), minPx);

/** THE HERO ("phone girl"): teal hoodie, orange backpack, ponytail; her phone is YELLOW (phoneArm(C.phoneYellow)) */
export const drawHero = (p: Pen, P: Pose) => drawFig(p, FIT.HERO, P, { pre: packPre(C.pack), post: packPost(C.pack) });
/** her see-through "mind" (the copy that lifts out and goes into the call bubble): a warm wash + a pale halo */
export const drawMind = (p: Pen, P: Pose, alpha = 0.6) => asGhost(p, alpha, "#fff1c4", 0.32, (q) => drawHero(q, P), "#ffffff");
/** THE PHONE GUY (phone 1, RED phone): the man the film opens on; tall, sky-blue shirt, navy vest, red tie, glasses */
export const drawPhoneGuy = (p: Pen, P: Pose) => drawFig(p, FIT.PHONE_GUY, P);
/** v1 name of the phone guy (the same drawing) */
export const drawRed = drawPhoneGuy;
/** phone-walker 2 (WHITE phone): a green varsity jacket with a white 7, a navy cap */
export const drawWhite = (p: Pen, P: Pose) => drawFig(p, FIT.WHITE, P, { post: varsity("7") });
/** phone-walker 4 (SKY-BLUE phone): a round woman in a cream coat, a ginger bun */
export const drawBlue = (p: Pen, P: Pose) => drawFig(p, FIT.BLUE, P);
/** phone-walker 5 (PINK phone): a small woman, a navy dress with a white collar, a blonde bob */
export const drawPink = (p: Pen, P: Pose) => drawFig(p, FIT.PINK, P, { post: bobTop });
/** music listener 1: GREEN headphones, a grey hoodie, messy hair, tall */
export const drawM1 = (p: Pen, P: Pose) => drawFig(p, FIT.M1, P, { post: headphones(C.cansGreen) });
/** music listener 2: ORANGE headphones, a white tee, curly hair */
export const drawM2 = (p: Pen, P: Pose) => drawFig(p, FIT.M2, P, { post: headphones(C.cansOrange) });
/** THE HEADPHONES DUDE: LIME headphones, a cobalt tee, dark curls, tall (Pose.cupOff pulls one cup off) */
export const drawDude = (p: Pen, P: Pose) => drawFig(p, FIT.DUDE, P, { post: (q, X) => { teeCollar("#f4f6fb")(q, X); headphones(C.cansLime)(q, X); } });
/** the pair of friends: 0 = denim jacket + curls (gestures), 1 = pink cardigan + dark bob (mimes pedalling) */
export const drawFriend = (p: Pen, which: 0 | 1, P: Pose) => drawFig(p, which ? FIT.FRIEND_B : FIT.FRIEND_A, P, which ? { post: bobTop, sleeve: clothSleeve } : {});
/** the man walking alone with a coffee cup held low (navy cardigan, bald, a grey moustache) */
export const drawCoffee = (p: Pen, P: Pose) => drawFig(p, FIT.COFFEE, P);
/** the girl walking alone, a book hugged to her chest (a green dress, a dark bun) */
export const drawBook = (p: Pen, P: Pose) => drawFig(p, FIT.BOOK, P);
/** THE PROFESSOR (IRA HYMAN, a generic friendly professor, not a likeness): OLIVE tweed with a pale rim, a wine bow tie,
 *  round glasses, swept grey hair; tweed sleeves so his gestures read */
export const drawProf = (p: Pen, P: Pose) => drawFig(p, FIT.PROF, { rim: "#fff1d2", rimK: 0.9, ...P }, { post: bowTie("#8e2c48"), sleeve: tweedSleeve });
export const drawHyman = drawProf;
/** THE STUDENT (the clown's civilian self): lanky, the clown's orange hair, freckles, a purple overshirt on a yellow tee */
export const drawStudent = (p: Pen, P: Pose) => drawFig(p, FIT.STUDENT, { ...P, face: { freckles: 0.85, ...(P.face ?? {}) } }, { sleeve: clothSleeve });
/** the interviewers (lanyards; give them a clipboard prop): 0 = THE INTERVIEWER (tall, cream shirt, lilac cardigan),
 *  1 = small, navy vest + ponytail */
export const drawInterviewer = (p: Pen, which: 0 | 1, P: Pose) => drawFig(p, which ? FIT.ASK_B : FIT.ASK_A, P, which ? {} : { sleeve: clothSleeve });
/** THE MUM in the call bubble (rose cardigan, grey-streaked bun, half-moon glasses on a chain) */
export const drawMum = (p: Pen, P: Pose) => drawFig(p, FIT.MUM, P, { sleeve: clothSleeve });

// ================================================================== THE CLOWN ON THE UNICYCLE
export type ClownPose = Pose & {
  /** the wheel / crank angle in rad (metres ridden / WHEEL_R); the wheel radius in metres */
  spin: number; wheelR: number;
  /** roll of rider + unicycle about the tyre's contact point, degrees (+ = the top goes to screen right) */
  roll?: number;
  /** a hop: the tyre this many metres off the ground */
  hop?: number;
  /** the ruff's bounce (0..1, + = springs up) */
  ruff?: number;
  /** p3: the hat is OFF his head (a bit holds it in a hand: drawClownHat), one leg off its pedal and out to the side
   *  (0..1: the one-foot balance), the pom-pom buttons' bounce (u, + = up) */
  hatOff?: boolean; legOut?: number; pom?: number;
};
/** the clown's little purple HAT with its flower (c = the brim's centre, ang in degrees): on his head, or in a hand /
 *  in the air for a bit (ClownPose.hatOff hides the one on his head) */
export const drawClownHat = (p: Pen, c: P2, u: number, ang = 0) => {
  const hx = c[0], hy = c[1], Rh = (pts: P2[]) => rotP(pts, ang, [hx, hy + 2 * u]);
  p.poly(Rh(ell(hx, hy, 21 * u, 4.6 * u)), "#6a22b4", 1.6 * u);
  p.poly(Rh([[hx - 13 * u, hy - 1 * u], [hx - 11 * u, hy - 24 * u], [hx + 11 * u, hy - 24 * u], [hx + 13 * u, hy - 1 * u]]), "#a436f2", 1.8 * u);
  p.band(Rh([[hx - 12.4 * u, hy - 6 * u], [hx + 12.4 * u, hy - 6 * u]]), "#ffd21a", 4.4 * u, 0.9 * u);
  p.poly(Rh(ell(hx, hy - 24 * u, 11 * u, 2.8 * u)), mix("#a436f2", "#ffffff", 0.2), 1.4 * u);
  const fl = Rh([[hx + 10 * u, hy - 30 * u]])[0]; p.stroke(Rh([[hx + 7 * u, hy - 22 * u], [hx + 10 * u, hy - 30 * u]]), 1.6 * u, "#2f9e58");
  for (let k = 0; k < 5; k++) p.dot(fl[0] + 3.6 * u * Math.cos((k * TAU) / 5), fl[1] + 3.6 * u * Math.sin((k * TAU) / 5), 2.6 * u, "#ff5fae"); p.dot(fl[0], fl[1], 2.1 * u, "#ffd21a");
};
/** the clown's card is drawn at this scale inside the 600 x 1000 design (he is 2.1 m tall on the unicycle): place the
 *  card with scale 1 / CLOWN_K */
export const CLOWN_K = 0.74;
const SEAT = 0.93, CRANK = 0.125;
const PURPLE = "#a436f2", YELLOW = "#ffd21a", RED = "#e9342c";
export const drawClown = (p: Pen, P: ClownPose) => {
  if ((P.smear ?? 0) > 0.04) { smearDraw(p, Math.min(1, P.smear!), P.smearDir ?? 1, (q) => drawClown(q, { ...P, smear: 0 })); return; }
  const g = p.g, o = FIT.CLOWN, v = viewOf(P), s = P.s ?? 0, c = P.c ?? 1, Rw = P.wheelR, hop = P.hop ?? 0;
  const ko = kitOpts(P, v, 0, "brightGrin"), R = rig(o, ko), u = R.u, th = -P.spin;
  const sq = (P.view ? 1 : 1 - 0.32 * Math.exp(-(((c + 0.35) / 0.08) ** 2))) * (P.sq ?? 1), st = P.stretch ?? 1;
  g.save();
  g.translate(300, 975); g.scale(CLOWN_K, CLOWN_K); g.rotate(rad(P.roll ?? 0)); g.translate(0, -hop * UM); g.scale(sq / Math.sqrt(st), st); g.translate(-300, -975);
  const pj = (f: number, up: number, lat: number) => proj(f, up, lat, s, c);
  // ---- the two legs on the pedals (right leg = crank angle th, left = th + 180 deg) ----
  const legs = ([1, -1] as const).map((lr) => {
    const a = th + (lr > 0 ? 0 : Math.PI), ped: [number, number] = [CRANK * Math.cos(a), Rw + CRANK * Math.sin(a)];
    const lo = lr < 0 ? clamp(P.legOut ?? 0, 0, 1) : 0;
    const hip: [number, number] = [-0.03, SEAT], an: [number, number] = [ped[0] - 0.02 + 0.1 * lo, ped[1] + 0.06 + 0.3 * lo], T = 0.365;
    let dx = an[0] - hip[0], dy = an[1] - hip[1], d = Math.hypot(dx, dy); const mx = 0.995 * 2 * T; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    const k = d / 2, h = Math.sqrt(Math.max(0, T * T - k * k)), ux = dx / d, uy = dy / d, bend = h / T;
    const knee: [number, number] = [hip[0] + ux * k - uy * h, hip[1] + uy * k + ux * h];
    const pitch = -0.28 * Math.cos(a) - 0.1 + 0.5 * lo, cp = Math.cos(pitch), sp = Math.sin(pitch), latF = 0.118 * lr + lr * 0.34 * lo;
    return { lr, a, ped, depth: lr * s, P0: pj(hip[0], hip[1], 0.085 * lr), PK: pj(knee[0], knee[1], (0.1 + 0.13 * bend) * lr), PA: pj(an[0], an[1], latF),
      heel: pj(an[0] - 0.085 * cp, an[1] - 0.045 - 0.085 * sp, latF), toe: pj(an[0] + 0.2 * cp, an[1] - 0.04 + 0.2 * sp, latF + 0.05 * lr * Math.abs(c)),
      pedA: pj(ped[0], ped[1], 0.075 * lr), pedB: pj(ped[0], ped[1], 0.165 * lr), hubE: pj(0, Rw, 0.06 * lr) };
  }).sort((a, b) => a.depth - b.depth);
  const drawLeg = (L: (typeof legs)[number], near: boolean) => {
    const col = L.lr > 0 ? YELLOW : PURPLE;
    p.band([L.hubE, L.pedA], "#c9ccd6", 3.4 * u, 1.1 * u, "round");
    p.band([L.pedA, L.pedB], "#2a2230", 5.2 * u, 1 * u, "round");
    p.band(bent(L.P0, L.PK, L.PA, 0.3), near ? col : shade(col, 0.86), 10.5 * u, 1.6 * u, "round");
    const sh = near ? RED : shade(RED, 0.86);
    p.band([L.heel, L.toe], sh, 11 * u, 1.6 * u, "round");
    p.poly(ell(L.toe[0], L.toe[1] - 1.5 * u, 10.5 * u, 9.5 * u), sh, 1.6 * u);
    p.stroke([[L.toe[0] - 4 * u, L.toe[1] - 6.5 * u], [L.toe[0] + 1 * u, L.toe[1] - 7.5 * u]], 1.8 * u, "#ffb0a0");
    { const m = L2(L.heel, L.toe, 0.42); for (const sd of [-1, 1]) p.poly(ell(m[0] + sd * 3.4 * u, m[1] - 6.4 * u, 3.2 * u, 2 * u, sd * 28, 10), "#fdfbf6", 0.9 * u); p.dot(m[0], m[1] - 6 * u, 1.3 * u, "#fdfbf6"); }   // p3: a white lace bow
    p.band([L2(L.PA, L.PK, 0.12), L2(L.PA, L.PK, 0.2)], "#fbf6ec", 12.5 * u, 1.3 * u, "round");
  };
  const wheel = () => {
    const cx = 300, cy = 975 - Rw * UM, ry = Rw * UM, rx = Math.max(Math.abs(s) * ry, 0.05 * UM), edge = Math.abs(s) < 0.22;
    const tyre = ell(cx, cy, rx, ry, 0, 44);
    p.poly(tyre, edge ? "#2a2230" : "#f4f1e6", 0);
    if (!edge) {
      const rim = (a0: number, a1: number, col: string) => { const pts: P2[] = [[cx, cy]]; for (let i = 0; i <= 10; i++) { const a = a0 + ((a1 - a0) * i) / 10; pts.push([cx + rx * Math.cos(a) * Math.sign(s || 1), cy - ry * Math.sin(a)]); } p.poly(pts, col, 0); };
      for (let k = 0; k < 4; k++) rim(th + (k * Math.PI) / 2, th + (k * Math.PI) / 2 + Math.PI / 2, k % 2 ? "#ffd21a" : "#f4f1e6");
      p.poly(ell(cx, cy, rx * 0.8, ry * 0.8, 0, 40), "#cfe6f2", 0);
      for (let k = 0; k < 8; k++) { const a = th + (k * Math.PI) / 4; p.stroke([[cx, cy], [cx + rx * 0.82 * Math.cos(a) * Math.sign(s || 1), cy - ry * 0.82 * Math.sin(a)]], (k % 4 === 0 ? 3 : 1.6) * u, k % 4 === 0 ? "#e9342c" : "#7c8496"); }
      const va = th + 0.4; p.dot(cx + rx * 0.66 * Math.cos(va) * Math.sign(s || 1), cy - ry * 0.66 * Math.sin(va), 3.6 * u, "#ff8a1f");
      p.poly(ell(cx, cy, rx * 0.8, ry * 0.8, 0, 40), null, 1.6 * u);
    }
    p.poly(tyre, null, 7 * u, "#2a2230");
    p.poly(ell(cx, cy, Math.max(4 * u, 6 * u * Math.abs(s)), 6 * u), "#c9ccd6", 1.5 * u);
    const crown = pj(0, 2 * Rw + 0.05, 0), seat = pj(-0.02, SEAT - 0.05, 0);
    for (const lr of [-1, 1]) p.band([pj(0, Rw, 0.06 * lr), pj(0, 2 * Rw + 0.03, 0.045 * lr), crown], "#e9342c", 4.4 * u, 1.3 * u, "round");
    p.band([crown, seat], "#c9ccd6", 4.2 * u, 1.3 * u, "round");
    const sa = pj(-0.14, SEAT - 0.012, 0), sb = pj(0.15, SEAT - 0.004, 0), sw = Math.max(Math.abs(sb[0] - sa[0]) / 2, 0.075 * UM * Math.abs(c));
    p.poly(ell((sa[0] + sb[0]) / 2, seat[1] - 2 * u, sw, 7.5 * u), "#2a2230", 1.6 * u);
  };
  if (legs[0].depth < -0.05) drawLeg(legs[0], false);
  wheel();
  if (legs[0].depth >= -0.05) drawLeg(legs[0], Math.abs(s) < 0.3);
  drawLeg(legs[1], true);
  // ---- rider: the kit's torso + head on the saddle, the clown suit over it ----
  g.save(); g.translate(pj(-0.03, SEAT, 0)[0] - 300, 975 - SEAT * UM - R.hipY);
  const La = ARM * R.HH * 1.04;
  const arms = ([-1, 1] as const).map((side) => solveArm(R, (side < 0 ? P.armL : P.armR) ?? { to: "out", hand: "ball" }, side, v.back, La, (named) => (v.back ? !!(named && BACK_OVER[named as ArmTo]) : true)));
  const Xc: Ctx = { R, u, back: v.back, facing: v.facing, s, c, light: ko.light ?? rad(-120), o, pose: P, headRot: headRotOf(R), bodyRot: R.A ? [rad(R.A), 300, R.hipY] : null,
    hands: arms.map((a) => ({ side: a.side, h: a.h })) };
  if (probe.on) for (const a of arms) probe.arms.push({ side: a.side, up: Math.hypot(a.e[0] - a.S[0], a.e[1] - a.S[1]) / R.HH, fore: Math.hypot(a.h[0] - a.e[0], a.h[1] - a.e[1]) / R.HH });
  const { T, tcx, chin, HH, hc, H, torsoBot } = R, body = blobPts(tcx, R.tcy, T);
  const drawArm = (a: Solved) => {
    const figRight = v.back ? a.side > 0 : a.side < 0, col = figRight ? YELLOW : PURPLE, pts = bent(a.S, a.e, a.h, 0.34);
    p.band(pts, col, 10 * u, 1.6 * u, "round");
    const n = pts.length, w0 = pts[n - 2], w1 = pts[n - 1];
    p.band([L2(w1, w0, 0.55), L2(w1, w0, 0.1)], "#fbf6ec", 12.5 * u, 1.3 * u, "round");          // the ruffled white cuff
    const pr = a.A.prop, ang = a.A.ang ?? 0, kind: HandKind = a.A.hand ?? (pr ? "grip" : "ball"), z = (a.A.hs ?? 1) * (P.handK ?? 1);
    if (pr && PROP_BEHIND[pr.k]) drawProp(p, pr, a.h, u, a.side, ang, v.back, a.h);
    const tip = drawHand(p, kind, a.h, u, a.side, ang, a.dir, "#fdfbf6", kind === "ball" ? Math.max(1.1, z) : z * 1.08);
    if (pr && !PROP_BEHIND[pr.k]) drawProp(p, pr, a.h, u, a.side, ang, v.back, tip);
  };
  for (const a of arms) if (!a.front) drawArm(a);
  // the orange hair puffs BEHIND the head
  p.rot = Xc.headRot;
  for (const sd of [-1, 1]) for (const [dx, dy, r] of [[1.0, -0.3, 0.3], [1.16, 0.02, 0.34], [1.0, 0.32, 0.28]] as const)
    p.poly(ell(300 + sd * dx * H.a, hc + dy * H.b, r * H.a, r * H.a * 0.96), FIT.CLOWN_HAIR, 1.9 * u);
  p.rot = null;
  drawPerson(p, o, ko);
  // v2: the BACK of his head: the orange hair ring meeting round the back (the lower half), two curls, so a back view
  // reads as the clown (not a blank white disc)
  if (v.back) {
    p.rot = Xc.headRot;
    const hp = blobPts(300, hc, H);
    p.clip(hp, () => {
      // a curly orange mass over the back from the ears down, its top edge a row of curls dipping in the middle (the
      // white bald crown shows above it), darker curl arcs inside, a lavender nape shade at the bottom
      const band: P2[] = []; const n = 9;
      for (let i = 0; i <= n * 6; i++) { const t = i / (n * 6), x = 300 - 1.25 * H.a + 2.5 * H.a * t, cu = Math.abs(Math.sin(Math.PI * n * t));
        band.push([x, hc - 0.62 * H.b + 0.34 * H.b * Math.sin(Math.PI * t) ** 0.7 - 0.13 * H.b * cu]); }
      const mass = [...band, [300 + 1.3 * H.a, hc + 1.3 * H.b] as P2, [300 - 1.3 * H.a, hc + 1.3 * H.b] as P2];
      p.gradFill(mass, FIT.CLOWN_HAIR, shade(FIT.CLOWN_HAIR, 0.74), Xc.light, 0.3);
      p.stroke(band, 2.4 * u, INK);
      for (const [sx, sy] of [[-0.62, 0.05], [-0.2, 0.2], [0.24, 0.12], [0.66, 0.02], [-0.42, 0.55], [0.05, 0.62], [0.48, 0.5]] as const)
        p.arc(300 + sx * H.a, hc + sy * H.b, 10 * u, 7 * u, 200, 340, 1.8 * u, shade(FIT.CLOWN_HAIR, 0.66));
      p.arc(300 - 0.4 * H.a, hc - 0.6 * H.b, 18 * u, 8 * u, 200, 300, 2.4 * u, "#ffffff");
    });
    p.inkRing(hp, 4 * u, thickAngle(Xc.light));
    p.rot = null;
  }
  notHead(p, Xc, () => { p.rot = Xc.bodyRot;
    p.clip(body, () => { // the suit: one half purple, one half yellow (by the figure's side), big pom-pom buttons, patches
      const yL = v.back ? 1 : -1;
      p.poly([[tcx, chin - 0.4 * HH], [tcx + yL * 2 * T.a, chin - 0.4 * HH], [tcx + yL * 2 * T.a, torsoBot + 0.4 * HH], [tcx, torsoBot + 0.4 * HH]], YELLOW, 0);
      p.gradFill(body, "rgba(0,0,0,0)", "rgba(60,20,90,0.24)", Xc.light, 0.35);
      p.stroke([[tcx, chin], [tcx, torsoBot + 0.2 * HH]], 1.6 * u, "#6a22b4");
      for (const [dx, dy] of [[-0.55, 0.36], [-0.3, 0.78], [-0.68, 0.7]] as const) p.dot(tcx - yL * dx * T.a * -1, chin + dy * HH, 3.2 * u, PURPLE);
      for (const [dx, dy] of [[0.5, 0.42], [0.34, 0.82], [0.7, 0.72]] as const) p.dot(tcx - yL * dx * T.a, chin + dy * HH, 3.2 * u, YELLOW);
      if (!v.back) [0.34, 0.58, 0.82].forEach((k, i) => { const by = chin + k * HH - (P.pom ?? 0) * u * (1 - 0.3 * i); p.poly(ell(tcx, by, 6.6 * u, 6.6 * u), RED, 1.5 * u); p.dot(tcx - 2 * u, by - 2 * u, 1.8 * u, "#ffb0a0"); });
      else { p.poly(rotP(rrect(tcx - 7 * u, chin + 0.5 * HH - 7 * u, tcx + 7 * u, chin + 0.5 * HH + 7 * u, 1.5 * u), 45, [tcx, chin + 0.5 * HH]), RED, 1.5 * u); }
    });
    p.inkRing(body, 4 * u, thickAngle(Xc.light));
    // the ruffled collar: a ring of white scallops round the neck (Pose.ruff springs it)
    const cy = chin + 0.07 * HH - 2 * u * (P.ruff ?? 0), rx = 1.02 * T.a, ry = 0.17 * HH * (1 + 0.25 * (P.ruff ?? 0)), n = 9;
    for (let i = 0; i < n; i++) { const t = Math.PI * (i / (n - 1)), x = tcx + rx * Math.cos(t), y = cy + ry * Math.sin(t) * 0.9; p.poly(ell(x, y, 9.6 * u, 8.6 * u), i % 2 ? "#fff2a8" : "#fdfbf6", 1.6 * u); }
    p.band([[tcx - rx * 0.86, cy - 1 * u], [tcx, cy + ry * 0.5], [tcx + rx * 0.86, cy - 1 * u]], "#fdfbf6", 5 * u, 0, "round");
  });
  // the face paint + the little hat (Pose.hatLag tilts it, hatLift raises it)
  p.rot = Xc.headRot;
  if (!v.back) {
    const fx = 300 + 7 * u * v.facing + (P.face?.fdx ?? 0) * u, fy = hc + 10.5 * u + (P.face?.fdy ?? 0) * u;
    p.poly(ell(fx, fy, 8.6 * u, 8.2 * u), RED, 1.7 * u); p.dot(fx - 2.6 * u, fy - 2.8 * u, 2.2 * u, "#ffb0a0");
    for (const sd of [-1, 1]) { g.save(); g.globalAlpha = 0.55; p.poly(ell(fx + sd * 25 * u, fy + 6 * u, 6.5 * u, 4.6 * u), "#ff8f9c", 0); g.restore(); }
  }
  if (!P.hatOff) { const fs = (v.facing || 1) * (v.back ? -1 : 1); drawClownHat(p, [300 - 0.3 * H.a * fs, hc - 0.93 * H.b - (P.hatLift ?? 0) * u], u, -14 * fs + (P.hatLag ?? 0)); }
  p.rot = null;
  for (const a of arms) if (a.front) drawArm(a);
  g.restore(); g.restore();
  p.rot = null;
};

// ================================================================== GHOST + OUTLINE versions of any drawing
/** draw `fn` see-through: alpha 0..1 over the whole figure (no double-dark where limbs overlap), washed toward `tint` */
export const asGhost = (p: Pen, alpha: number, tint: string, wash: number, fn: (q: Pen) => void, halo?: string) => {
  const k0 = Math.abs(p.g.getTransform().a);
  const g = p.g, cv = document.createElement("canvas"); cv.width = g.canvas.width; cv.height = g.canvas.height;
  const og = cv.getContext("2d")!; og.setTransform(g.getTransform()); fn(new Pen(og));
  og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = "source-atop"; og.globalAlpha = wash; og.fillStyle = tint; og.fillRect(0, 0, cv.width, cv.height);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (halo) {
    const s = document.createElement("canvas"); s.width = cv.width; s.height = cv.height; const sg = s.getContext("2d")!;
    sg.drawImage(cv, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = halo; sg.fillRect(0, 0, s.width, s.height);
    const h = document.createElement("canvas"); h.width = cv.width; h.height = cv.height; const hg = h.getContext("2d")!, t = Math.max(1.5, 4.2 * k0);
    for (let i = 0; i < 12; i++) hg.drawImage(s, t * Math.cos((i * TAU) / 12), t * Math.sin((i * TAU) / 12));
    hg.globalCompositeOperation = "destination-out"; hg.drawImage(s, 0, 0);
    g.globalAlpha = Math.min(1, alpha * 1.35); g.drawImage(h, 0, 0);
  }
  g.globalAlpha = alpha; g.drawImage(cv, 0, 0); g.restore();
};
/** draw `fn` as a DOTTED OUTLINE only (the silhouette's edge in `col`, dashes; a faint fill inside) */
export const asOutline = (p: Pen, col: string, fill: number, dash: number, fn: (q: Pen) => void) => {
  const g = p.g, W = g.canvas.width, Hh = g.canvas.height, mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = Hh; return c; };
  const a = mk(), ag = a.getContext("2d")!; ag.setTransform(g.getTransform()); fn(new Pen(ag));
  ag.setTransform(1, 0, 0, 1, 0, 0); ag.globalCompositeOperation = "source-in"; ag.fillStyle = col; ag.fillRect(0, 0, W, Hh);
  const k = Math.abs(g.getTransform().a), t = Math.max(2, 5 * k), b = mk(), bg = b.getContext("2d")!;
  for (let i = 0; i < 12; i++) bg.drawImage(a, t * Math.cos((i * TAU) / 12), t * Math.sin((i * TAU) / 12));
  bg.globalCompositeOperation = "destination-out"; bg.drawImage(a, 0, 0);
  const per = Math.max(8, 26 * k); for (let y = -Hh; y < W + Hh; y += per) { bg.beginPath(); const o = (dash % 1) * per; bg.moveTo(y + o, 0); bg.lineTo(y + o + per * 0.42, 0); bg.lineTo(y + o + per * 0.42 - Hh, Hh); bg.lineTo(y + o - Hh, Hh); bg.closePath(); bg.fill(); }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = fill; g.drawImage(a, 0, 0); g.globalAlpha = 1; g.drawImage(b, 0, 0); g.restore();
};

// ================================================================== THE ACTING KIT (v2): pure functions of the frame
// Every function takes the frame (any clock: the video frame, a shot frame, a negative loop frame) and returns numbers or
// Pose parts to spread into a Pose. Nothing keeps state, so any frame renders on its own (chunked renders are safe).
const eo = (x: number) => { const c = clamp(x, 0, 1); return 1 - (1 - c) ** 3; };
const eio = (x: number) => { const c = clamp(x, 0, 1); return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2; };
/** deterministic hash in [0, 1) */
export const hash = (a: number, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
/** a soft bump 0 -> 1 -> 0: up over a frames from f0, down over b frames */
export const bump = (f: number, f0: number, a: number, b: number) => { const t = f - f0; return t < 0 ? 0 : t < a ? sm(t / a) : t < a + b ? 1 - sm((t - a) / b) : 0; };

export type GestOpt = { ant?: number; move?: number; over?: number; settle?: number; antK?: number };
/** THE GESTURE RECIPE: a value 0 -> 1 whose MOVE starts at f0. Anticipation `ant` f before it (dips to -antK, 10-15 %
 *  the other way), the move over `move` f (fast out, decelerating), an overshoot to 1 + over (10-16 %), a settle over
 *  `settle` f with a small undershoot. Defaults: ant 5, move 6, over 0.13, settle 9, antK 0.12. Use it as Arm.k (blend
 *  to -> to2), Arm.fkK (blend to an fk pose), or to drive any angle */
export const gesture = (f: number, f0: number, o: GestOpt = {}): number => {
  const ant = o.ant ?? 5, mv = o.move ?? 6, ov = o.over ?? 0.13, st = o.settle ?? 9, ak = o.antK ?? 0.12, t = f - f0;
  if (t <= -ant) return 0;
  if (t < 0) return -ak * eio((t + ant) / ant);
  if (t < mv) { const x = t / mv; return -ak + (1 + ov + ak) * (0.4 * sm(x) + 0.6 * eo(x)); }
  const s = (t - mv) / st; if (s >= 1) return 1;
  return 1 + ov * Math.cos(1.25 * Math.PI * s) * (1 - s);
};
/** a gesture up at f0 and back down at f1 (the return has its own small anticipation: the hand lifts before it drops) */
export const gestureBack = (f: number, f0: number, f1: number, o: GestOpt = {}, back: GestOpt = { ant: 4, move: 7, over: 0.08, settle: 8, antK: 0.08 }) =>
  gesture(f, f0, o) * (1 - gesture(f, f1, back));
/** two arms of one gesture, the second `off` frames late (never twinned): [first, second] */
export const gesture2 = (f: number, f0: number, o: GestOpt = {}, off = 4): [number, number] => [gesture(f, f0, o), gesture(f, f0 + off, o)];

export type FollowOpt = { lag?: number; hz?: number; zeta?: number; win?: number };
/** OVERLAP / FOLLOW-THROUGH: a damped spring chasing fn(t - lag) (default 2 f late, 2.2 Hz, damping 0.42 = ~20 %
 *  overshoot), integrated over the last `win` frames, so it is stateless. Returns the follower's value */
export const follow = (fn: (t: number) => number, f: number, o: FollowOpt = {}) => {
  const lag = o.lag ?? 2, w = (TAU * (o.hz ?? 2.2)) / 30, z = o.zeta ?? 0.42, win = o.win ?? 40;
  let x = fn(f - win - lag), vv = 0;
  for (let t = f - win + 1; t <= f; t++) { const a = w * w * (fn(t - lag) - x) - 2 * z * w * vv; vv += a; x += vv; }
  return x;
};
/** the secondary's OFFSET from its primary (follow - now) times gain: feed it to hairSwing (u), pack (u), hatLag (deg),
 *  a horn / cable / coat-tail angle. It is 0 at rest and swings 2-3 f late with a little overshoot on every start / stop */
export const lagOf = (fn: (t: number) => number, f: number, gain = 1, o: FollowOpt = {}) => gain * (follow(fn, f, o) - fn(f));

/** BLINKS: eyelid 0 open .. 1 shut. A blink every 2-4 s (seeded), 3 or 4 f long (half, shut, (shut), half); `force` adds
 *  blinks starting at those frames (head turns, thought changes, the spin) */
export const blinkAt = (f: number, seed: number, force: number[] = []) => {
  for (const s0 of force) { const k = Math.floor(f - s0); if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; }
  const P = 90, n0 = Math.floor(f / P);
  for (let n = n0 - 1; n <= n0 + 1; n++) {
    const s0 = n * P + Math.round((hash(seed * 13 + n, 5) - 0.5) * 40), len = hash(seed, n) < 0.5 ? 3 : 4, k = Math.floor(f - s0);
    if (k >= 0 && k < len) return (len === 4 ? [0.5, 1, 1, 0.5] : [0.5, 1, 0.5])[k];
  }
  return 0;
};
/** EYE DARTS in a hold: small look offsets that jump every 1.7-3 s in 3 f (seeded). Add to look / lookY */
export const dartAt = (f: number, seed: number, amp = 0.32): { look: number; lookY: number } => {
  const P = 52 + Math.floor(38 * hash(seed, 2)), x = f + hash(seed, 7) * P, n = Math.floor(x / P), t = x - n * P;
  const tg = (k: number): [number, number] => [amp * (2 * hash(seed * 7 + k, 1) - 1), 0.45 * amp * (2 * hash(seed * 7 + k, 3) - 1)];
  const a = tg(n - 1), b = tg(n), k = eio(t / 3);
  return { look: a[0] + (b[0] - a[0]) * k, lookY: a[1] + (b[1] - a[1]) * k };
};
/** a GAZE TRACK: [frame, look, lookY][] keys. The eyes dart to each new target in 3 f; `head` (-1..1) follows 2 f later
 *  over 8 f (use it for headTilt / facing hints / the head turn); `blink` = a blink on each big gaze change (> 0.8) */
export const lookAt = (f: number, keys: [number, number, number][]): { look: number; lookY: number; head: number; blink: number } => {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= f) i++;
  const cur = keys[i], prev = keys[Math.max(0, i - 1)], k = i === 0 ? 1 : eio((f - cur[0]) / 3), kh = i === 0 ? 1 : eio((f - cur[0] - 2) / 8);
  const big = Math.abs(cur[1] - prev[1]) + Math.abs(cur[2] - prev[2]) > 0.8, bt = Math.floor(f - cur[0]);
  return { look: lerp(prev[1], cur[1], k), lookY: lerp(prev[2], cur[2], k), head: lerp(prev[1], cur[1], kh), blink: i > 0 && big && bt >= 0 && bt < 4 ? [0.5, 1, 1, 0.5][bt] : 0 };
};
/** an EXPRESSION TRACK: [frame, expr][] keys. Each expression is held >= minHold frames (a key that comes sooner is pushed
 *  later: no 3 f flicker), a half-blink straddles every swap (2 f). Returns the expression and the lid to max() with
 *  the blinks */
export const faceAt = (f: number, keys: [number, Expr][], minHold = 12): { expr: Expr; lid: number } => {
  const ks: [number, Expr][] = [];
  for (const [k0, e] of keys) { const last = ks[ks.length - 1]; if (last && last[1] === e) continue; ks.push([last ? Math.max(k0, last[0] + minHold) : k0, e]); }
  let e = ks[0][1], lid = 0;
  for (let i = 0; i < ks.length; i++) { if (f >= ks[i][0]) e = ks[i][1]; if (i > 0) { const d = f - ks[i][0]; if (d >= -1 && d < 1) lid = 0.5; } }
  return { expr: e, lid };
};

/** THE TALK CYCLE for a character who speaks a line: mouth shapes stepping on syllables between f0 and f1 (a new shape
 *  every 3-5 f, a closed "M" every few syllables, shut over the last 2 f). amp = optional loudness per frame from f0
 *  (0..1, e.g. the line's RMS): loud = A / O, mid = E / I / U, quiet = M. Undefined outside the line */
export const talkAt = (f: number, f0: number, f1: number, seed = 1, amp?: number[]): MouthK | undefined => {
  if (f < f0 || f >= f1) return undefined;
  if (f1 - f <= 2) return "vM";
  let t = f0, k = 0;
  for (;;) { const len = 3 + Math.floor(hash(seed * 31 + k, 4) * 3); if (f < t + len) break; t += len; k++; }
  const a = amp ? amp[clamp(Math.floor(t - f0), 0, amp.length - 1)] ?? 0.5 : 0.3 + 0.7 * hash(seed + k * 1.7, 9);
  if (a < 0.14 || k % 5 === 4) return "vM";
  const pick = (arr: MouthK[]) => arr[Math.floor(hash(seed * 7 + k, 6) * arr.length)];
  return a > 0.62 ? pick(["vA", "vO", "vA", "vE"]) : pick(["vE", "vI", "vU", "vO", "vI"]);
};
/** THE PHONE MOUTH: phrases of chatter (36-68 f: visemes) and listening in between (a closed smile, one "mm-hm" nod:
 *  6 f down, 8 f up); now and then the listening starts with a 16 f laugh. Returns mouth (undefined = the expression's
 *  own), nod, laughing (swap the expr to "laughBig" while true: it lasts 16 f, so no flicker), talking */
export const phoneChat = (f: number, seed: number): { mouth?: MouthK; nod: number; laughing: boolean; talking: boolean } => {
  const P = 100, x = f + hash(seed, 1) * P, n = Math.floor(x / P), t = x - n * P, Lt = 36 + Math.floor(32 * hash(seed * 3 + n, 2));
  if (t < Lt) return { mouth: talkAt(t, 0, Lt, seed * 5 + n), nod: 0, laughing: false, talking: true };
  const lt = t - Lt, laughing = hash(seed * 3 + n, 5) < 0.3 && lt < 16, nodT = laughing ? 20 : (P - Lt) / 2 - 7;
  return { mouth: laughing ? "laugh" : undefined, nod: 1.3 * bump(lt, nodT, 6, 8) + (laughing ? 0.6 * Math.abs(Math.sin(TAU * lt / 8)) : 0), laughing, talking: false };
};
/** the FREE HAND of a talker (phone people, the interviewer): an open hand that moves to a new beat every 24-40 f with
 *  the gesture recipe (out, chest, low, palm up), small rhythm bounces while the mouth goes. Returns an Arm */
export const talkHand = (f: number, seed: number, talking = true): Arm => {
  // beats walk a fixed cycle of DIFFERENT poses (never the same twice in a row): out at the side, palm-up "show", in to
  // the chest, low and open; the hand turns, bounces with the syllables. While listening it sinks toward the low pose
  const P = 30, x = f + hash(seed, 4) * P, n = Math.floor(x / P), t = x - n * P;
  const TG: ArmTo[] = ["talk", "show", "chest", "talk", "low", "show"], off = Math.floor(hash(seed, 8) * TG.length), pick = (k: number) => TG[(((k + off) % TG.length) + TG.length) % TG.length];
  const to = pick(n - 1), to2 = talking ? pick(n) : "low", k = gesture(t, 6, { ant: 4, move: 6, over: 0.12, settle: 8 });
  return { to, to2, k, hand: "open", hs: 1.1, ang: 35 + 30 * Math.sin(TAU * (f / 47) + seed), dy: talking ? -2.6 * Math.abs(Math.sin(TAU * f / 9)) : 0 };
};
/** EYEBROWS UP (the professor hears "unicycle", the interviewer asks): both brows jump with the recipe, the screen-left one
 *  2 f ahead; held until f1. Returns FaceX.browUp (u) to merge into face */
export const browsUp = (f: number, f0: number, f1 = Infinity, amt = 7): [number, number] => {
  const k = (d: number) => (f1 < Infinity ? gestureBack(f, f0 + d, f1 + d, { ant: 3, move: 4, over: 0.2, settle: 7 }) : gesture(f, f0 + d, { ant: 3, move: 4, over: 0.2, settle: 7 }));
  return [amt * k(0), amt * k(2)];
};
/** the HEAD BOP to music (the headphones dude): a nod on every beat (bpm), a small side tilt every other beat, the
 *  shoulders follow 2 f late (tilt). Spread into the Pose */
export const bopAt = (f: number, bpm = 104, amt = 1): Pick<Pose, "nod" | "headTilt" | "tilt"> => {
  const per = (30 * 60) / bpm, ph = (f / per) % 1, ph2 = (f / (2 * per)) % 1;
  return { nod: amt * 1.5 * Math.max(0, Math.sin(Math.PI * ph)) ** 2, headTilt: amt * 4 * Math.sin(TAU * ph2), tilt: amt * 1.4 * Math.sin(TAU * ((f - 2) / (2 * per))) };
};
/** in a WIDE of the branch: the professor's hand carries a peg (pinched open per clipAt) up to `at` (the bill's top edge
 *  on his card, E.onCard of the world point) and clips it; the other hand holds the bill up to it (billArm) */
export const pegArm = (f: number, f0: number, at: P2): Arm => {
  const st = clipAt(f, f0), k = gestureBack(f, f0 - 16, f0 + 6, { move: 8, over: 0.08 });
  return { to: "hang", to2: at, k, hand: "pinch", hs: 1.25, prop: { k: "peg", open: st.open } };
};
export const billArm = (f: number, f0: number, at: P2): Arm => {
  const k = gestureBack(f, f0 - 22, f0 + 3, { move: 8, over: 0.06 });
  return { to: "hang", to2: [at[0], at[1] + 30], k, hand: "grip", hs: 1.2, prop: k > 0.05 && k < 1.5 && f < f0 + 3 ? { k: "bill", size: 1 } : undefined };
};
/** a figure's RIGHT and LEFT arms -> the SCREEN arms for its view (front: the right arm is screen-left; back: it is
 *  screen-right). Spread into the Pose: { ...PPL.bodyArms(back, PPL.phoneArm(col), PPL.talkHand(f, 4)) }. Use it on
 *  every turn so the phone stays at the same EAR (swap on a smear / squeeze frame) */
export const bodyArms = (back: boolean, right: Arm | null | undefined, left: Arm | null | undefined): Pick<Pose, "armL" | "armR"> =>
  back ? { armL: left, armR: right } : { armL: right, armR: left };

/** MOVING HOLD life for a standing figure: breath (+-1 = +-1.5 % torso, ~3.5 s), a weight shift every 3-5 s (the hips
 *  move 2-3 % onto the loaded leg over 24 f, the body sways onto it, the head counter-tilts), slow small head tilts,
 *  blinks, eye darts (look / lookY are DART offsets: add your gaze target to them). amt scales it all */
export const holdLife = (f: number, seed: number, amt = 1): Required<Pick<Pose, "breath" | "shift" | "tilt" | "headTilt" | "blink" | "look" | "lookY">> => {
  const breath = Math.sin(TAU * (f / 105) + TAU * hash(seed, 1));
  const P = 96 + Math.floor(54 * hash(seed, 2)), x = f + hash(seed, 3) * P, n = Math.floor(x / P), t = x - n * P;
  const side = (k: number) => (k % 2 ? 1 : -1) * (0.6 + 0.4 * hash(seed + k, 3));
  const shift = side(n - 1) + (side(n) - side(n - 1)) * eio(t / 24);
  const head = 1.5 * Math.sin(TAU * (f / 170) + 6 * hash(seed, 4)) + 0.6 * Math.sin(TAU * (f / 67) + 6 * hash(seed, 5));
  const d = dartAt(f, seed);
  return { breath: breath * amt, shift: shift * amt, tilt: 1.3 * shift * amt, headTilt: (-1.8 * shift + head) * amt, blink: blinkAt(f, seed), look: d.look * amt, lookY: d.lookY * amt };
};

/** a phone walker's slow side-to-side WEAVE (metres, add it across the path): +-amp over ~3.7 s with a slower drift */
export const weave = (f: number, seed: number, amp = 0.12) => amp * Math.sin(TAU * (f / 110) + TAU * hash(seed, 6)) + 0.35 * amp * Math.sin(TAU * (f / 47) + TAU * hash(seed, 7));
/** STOP WITH SETTLE: the last step plants at fStop. go fades 1 -> 0 over the last 8 f (the feet come together), the body
 *  carries on forward 5 deg for 3 f, rocks back to -2, settles by +17 f; a small dip on the plant. Spread: tilt is
 *  "forward" (multiply by the heading's screen side s), duck is the dip */
export const stopAt = (f: number, fStop: number): { go: number; tilt: number; duck: number } => {
  const t = f - fStop, go = t < -8 ? 1 : t < 0 ? 1 - eio((t + 8) / 8) : 0;
  const tilt = t < 0 ? 0 : t < 3 ? 5 * eo(t / 3) : t < 9 ? 5 - 7 * eio((t - 3) / 6) : t < 17 ? -2 + 2 * eio((t - 9) / 8) : 0;
  return { go, tilt, duck: 0.1 * bump(t, -1, 3, 8) };
};
/** a WALK THAT STOPS at fStop with no foot slide: { metres, walk, go, feet } where metres is the travel RELATIVE to the
 *  stop point (negative before it, 0 after: place the figure at stopPoint + heading * metres), walk / go / feet go into
 *  the Pose (the body slows over the last 8 f; every planted foot stays where it landed, the last steps land shorter,
 *  the feet end a little staggered). Keep passing `feet` after the stop. Pair with stopAt's tilt / duck */
export const stopWalk = (f: number, fStop: number, g: Gait = "walk"): { metres: number; walk: number; go: number; feet: [FootSt, FootSt] } => {
  const gd = GAIT[g], v = gaitSpeed(g) / 30, S = gd.stride, d = gd.duty, per = S / v, goOf = (x: number) => (x < -8 ? 1 : x < 0 ? 1 - eio((x + 8) / 8) : 0);
  const dist = (a: number, b: number) => { let m = 0; for (let x = a; x < b; x += 0.25) m += v * goOf(x + 0.125) * 0.25; return m; };   // travel from a to b
  const D = dist(-8, 0), mAt = (x: number) => (x <= -8 ? -D + (x + 8) * v : x >= 0 ? 0 : -dist(x, 0));
  const t = Math.min(f - fStop, 0), walk = t / per, land = (tt: number) => (S * Math.max(goOf(tt), 0.45) * d) / 2;   /* the last steps land >= 0.1 m ahead: the feet end staggered, never stacked */
  /* each foot: planted -> its offset is where it landed minus the body's travel since; swinging -> from where it left
     the ground to where it will land (that landing is shorter when the body is slowing) */
  const foot = (off: number): FootSt => {
    const ph = walk + off, n = Math.floor(ph), q = ph - n, tc = (n - off) * per, k = goOf(t);
    if (q < d) return [land(tc) - (mAt(t) - mAt(tc)), 0, footAt(ph, 1, gd)[2] * k];
    const tOff = tc + d * per, xOff = land(tc) - (mAt(tOff) - mAt(tc)), u = (q - d) / (1 - d), e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    return [xOff + (land(tc + per) - xOff) * e, gd.lift * k * Math.sin(Math.PI * u) ** 1.2, footAt(ph, 1, gd)[2] * k];
  };
  return { metres: mAt(t), walk, go: goOf(f - fStop), feet: [foot(0), foot(0.5)] };
};
/** START: a 4 f lean back (anticipation), then go ramps 0 -> 1 over 8 f with a forward lean. tilt is "forward" */
export const startAt = (f: number, fGo: number): { go: number; tilt: number } => {
  const t = f - fGo; if (t < -4) return { go: 0, tilt: 0 };
  if (t < 0) return { go: 0, tilt: -3 * eio((t + 4) / 4) };
  return { go: eio(t / 8), tilt: -3 + 7 * eio(t / 5) - 4 * eio((t - 5) / 10) };
};

export type DuckOpt = { lift?: number; drop?: number; hold?: number; rise?: number; amt?: number };
/** THE DUCK under something: lift 3 f (up on the toes, -0.12), drop 6 f, the lowest point held 8 f as a moving hold
 *  CENTRED on fLow (put fLow on the frame the head is under the thing), rise 9 f with a 5 % overshoot. Returns Pose.duck.
 *  The walk goes on through it. Pair with duckLag() for the hair / backpack / hat */
export const duckAt = (f: number, fLow: number, o: DuckOpt = {}) => {
  const Lf = o.lift ?? 3, D = o.drop ?? 6, Hd = o.hold ?? 8, Rs = o.rise ?? 9, A = o.amt ?? 1, t = f - fLow, t0 = -Hd / 2 - D - Lf;
  if (t < t0) return 0;
  if (t < t0 + Lf) return -0.12 * A * eio((t - t0) / Lf);
  if (t < -Hd / 2) return A * (-0.12 + 1.12 * eio((t - t0 - Lf) / D));
  if (t < Hd / 2) return A * (1 - 0.05 * Math.sin((Math.PI * (t + Hd / 2)) / Hd));
  if (t < Hd / 2 + Rs) return A * (1 - 1.05 * eio((t - Hd / 2) / Rs));
  const s = (t - Hd / 2 - Rs) / 8; return s < 1 ? -0.05 * A * (1 - eio(s)) : 0;
};
/** the hair / backpack overlap of a duck (u): pass to hairSwing (x ~1) and pack (x ~0.6) */
export const duckLag = (f: number, fLow: number, o: DuckOpt = {}, gain = 26) => lagOf((t) => duckAt(t, fLow, o), f, gain, { lag: 2, hz: 2.4, zeta: 0.4 });

export type SpinOpt = { from?: number; to?: number; wind?: number; turn?: number; over?: number; settle?: number; windDeg?: number;
  /** p3: false keeps the old angle-driven turn for a big turn too (default: turns of 120 deg or more are KEYED: spinAround) */ keyed?: boolean };
/** THE SPIN / TURN-AROUND IN PLACE. Heading angle (deg, 0 = facing the lens, 180 = back to the lens, + = turning toward
 *  screen right): a wind-up `wind` f (15 deg the wrong way), the turn over `turn` f (the turn STARTS at f0), an overshoot
 *  `over` deg, a settle `settle` f. The art swaps front -> 3/4 -> profile -> back as it passes (the features slide to the
 *  edge in profile), the card squashes with the speed, the fastest 1-2 frames smear, the hair whips 3 f late. A blink
 *  rides the turn. Spread the result into the Pose (it sets s, c, view, facing, sq, smear, smearDir, hairSwing, blink,
 *  face). Defaults: 0 -> 180, wind 5, turn 7, over 20, settle 9 */
export const spinAt = (f: number, f0: number, o: SpinOpt = {}): Pick<Pose, "s" | "c" | "view" | "facing" | "sq" | "smear" | "smearDir" | "hairSwing" | "blink" | "face" | "stretch" | "tilt"> & { angle: number } => {
  const a0 = o.from ?? 0, a1 = o.to ?? 180, W = o.wind ?? 5, T = o.turn ?? 7, OV = o.over ?? 20, S = o.settle ?? 9, dir = Math.sign(a1 - a0) || 1, wd = o.windDeg ?? 15;
  // p3 (D8): a big turn is KEYED frame by frame (3/4, smear frame, 3/4, overshoot): it popped back -> front in the film
  if (o.keyed !== false && Math.abs(a1 - a0) >= 120) return spinAround(f, f0, { from: a0, to: a1, wind: W, over: OV, settle: S });
  const ang = (t: number) => {
    if (t < -W) return a0;
    if (t < 0) return a0 - dir * wd * eio((t + W) / W);
    if (t < T) return a0 - dir * wd + (a1 + dir * OV - a0 + dir * wd) * sm(t / T);
    if (t < T + S) { const s = (t - T) / S; return a1 + dir * OV * Math.cos(1.2 * Math.PI * s) * (1 - s); }
    return a1;
  };
  const t = f - f0, th = ang(t), sp = Math.abs(ang(t + 0.5) - ang(t - 0.5)), r = rad(th), s = Math.sin(r), c = Math.cos(r);
  const back = c < -0.34, side = Math.abs(s) > 0.3 ? (Math.sign(s) as -1 | 1) : 0, prof = clamp((Math.abs(s) - 0.7) / 0.25, 0, 1);
  const turnK = clamp(sp / 45, 0, 1), wk = t < -W || t >= 2 ? 0 : t < 0 ? eio((t + W) / W) : 1 - t / 2;   // the wind-up: a lean against the turn + a 5 % squash
  return { angle: th, s, c, view: back ? "back" : "front", facing: side, sq: (1 - 0.3 * turnK) * (1 + 0.04 * wk), stretch: (1 + 0.05 * turnK) * (1 - 0.05 * wk), tilt: -dir * 5 * wk, smear: clamp((sp - 30) / 14, 0, 1), smearDir: -dir,
    hairSwing: lagOf(ang, f, -0.55 * dir, { lag: 3, hz: 1.8, zeta: 0.38 }), blink: t >= 1 && t < 4 ? [0.5, 1, 0.5][t - 1] ?? 0 : 0,
    face: prof > 0 && !back ? { fdx: side * 9 * prof } : undefined };
};
/** a normal TURN (head first, a small wind-up and overshoot): spinAt with wind 3, over 8 */
export const turnAt = (f: number, f0: number, from: number, to: number, dur = 8) => spinAt(f, f0, { from, to, wind: 3, turn: dur, over: 8, settle: 8, windDeg: 6, keyed: false });
/** a VIEW FLIP that is not a pose change (front <-> back when the heading crosses): 2 f squeeze to 55 %, the art swaps at
 *  fSwap, 3 f back to 100 %. Returns { view, sq } */
export const flipAt = (f: number, fSwap: number, from: "front" | "back" = "front"): { view: "front" | "back"; sq: number } => {
  const t = f - fSwap, to = from === "front" ? "back" : "front";
  return { view: t < 0 ? from : to, sq: t < -2 || t >= 3 ? 1 : t < 0 ? 1 - 0.45 * eio((t + 2) / 2) : 0.55 + 0.45 * eio(t / 3) };
};

// ---------------- GESTURE PRESETS (each returns an Arm; read CHAR.md for the frames) ----------------
/** a POINT with the whole arm aimed at `aim` (card design point; E.onCard gives it for a world point): wind-up, move,
 *  overshoot, settle; held, then (f1) back. Eyes should lead it by 3 f (lookAt) */
export const pointArm = (f: number, f0: number, aim: P2, f1 = Infinity, rest: ArmTo = "hang"): Arm =>
  ({ to: rest, aim, k: f1 < Infinity ? gestureBack(f, f0, f1) : gesture(f, f0), hand: "point", hs: 1.2 });
/** a THUMBS-UP at chest height (never near the ear), out from the body; a little pump on arrival */
export const thumbsUp = (f: number, f0: number, f1 = Infinity, rest: ArmTo = "hang"): Arm => {
  const k = f1 < Infinity ? gestureBack(f, f0, f1) : gesture(f, f0);
  return { to: rest, to2: "thumb", k, hand: "thumb", hs: 1.3, dy: -3 * bump(f, f0 + 6, 3, 6) };
};
/** the CHIN STROKE: the hand up to the chin (pinch), two slow strokes (6 u down and back, 14 f each); pair with
 *  headTilt +4 and an expr like "puzzled" / "focusB" */
export const chinStroke = (f: number, f0: number, f1 = Infinity): Arm => {
  const k = f1 < Infinity ? gestureBack(f, f0, f1) : gesture(f, f0, { move: 7, over: 0.08 });
  return { to: "hang", to2: "chin", k, hand: "pinch", hs: 1.15, ang: -20, dy: k > 0.8 ? 3 * (1 - Math.cos(TAU * Math.max(0, f - f0 - 8) / 28)) : 0 };
};
/** the FLAT HAND at head height ("right at head height"): the arm out to the side, the hand palm-down and LEVEL at eye
 *  height, well clear of the head (never a salute or a head scratch), a slow small bob */
export const flatHand = (f: number, f0: number, _side: number, f1 = Infinity): Arm => {
  const k = f1 < Infinity ? gestureBack(f, f0, f1, { move: 7, over: 0.1 }) : gesture(f, f0, { move: 7, over: 0.1 }), b = 2 * Math.sin(TAU * f / 40) * clamp(k, 0, 1);
  return { to: "hang", fk: [160 + b, 102 - b], fkK: k, hand: "flat", hs: 1.25 };
};
/** the THUMB BACK OVER THE SHOULDER (the dude: "the unicycle guy!"): the hand rises above the shoulder, the thumb jabs
 *  back twice */
export const overShoulder = (f: number, f0: number, f1 = Infinity): Arm => {
  const k = f1 < Infinity ? gestureBack(f, f0, f1) : gesture(f, f0, { over: 0.15 }), jab = 10 * bump(f, f0 + 12, 3, 5) + 10 * bump(f, f0 + 22, 3, 5);
  return { to: "hang", fk: [70 + jab * 0.3, 140 + jab], fkK: k, hand: "thumb", hs: 1.35, ang: -12 };   // the hand up and OUT by the shoulder (never near an ear)
};
/** WRITING on a clipboard held by the other hand: a pencil pinch that scribbles across and returns every 24 f */
export const writeArm = (f: number): Arm => {
  const t = f % 24, x = t < 18 ? -6 + 12 * (t / 18) : 6 - 12 * eio((t - 18) / 6);
  return { to: "write", dx: x, dy: 1.6 * Math.sin(TAU * f / 4.5) + (t < 18 ? 0 : -2), hand: "pinch", prop: { k: "pencil" }, ang: -30 };
};
/** the clipboard hand (hold it at the chest); tilt it up to show it */
export const clipboardArm = (tilt = 0): Arm => ({ to: "clip", prop: { k: "clipboard", tilt }, hand: "grip" });
/** the PEDAL MIME (the friend: "He was amazing!"). p3 (D8): it read as rolling fists (inside the torso, a fist over the
 *  mouth). Now the fists are OUT IN FRONT and wider than the body, each on its own circle half a turn apart, 14 f a turn,
 *  at belly height (the mouth stays clear); add pedalMimeBody() for the rocking shoulders. Returns [armL, armR] */
export const pedalMime = (f: number, f0: number, f1 = Infinity): [Arm, Arm] => {
  const k = f1 < Infinity ? gestureBack(f, f0, f1) : gesture(f, f0), kc = clamp(k, 0, 1), ph = (TAU * Math.max(0, f - f0)) / 14, r = 17 * kc;
  const arm = (side: number, o: number): Arm => ({ to: "hang", to2: "belly", k, dx: side * 42 * kc + side * 0.5 * r * Math.cos(ph + o), dy: -9 * kc + r * Math.sin(ph + o), hand: "fist", hs: 1.5, front: true });
  return [arm(-1, 0), arm(1, Math.PI)];
};
/** SNEAKING paws (the professor tiptoes with the bills and the pegs): both hands up at the chest, bouncing with the
 *  steps; [armL with the bills, armR with the pegs] */
export const sneakArms = (f: number, walk: number): [Arm, Arm] => {
  // the bills fan OUT to the side (never over the face), the pegs stick up out of the other fist
  const b = -2.4 * Math.abs(Math.sin(TAU * walk));
  return [{ to: "paw", dx: -16, dy: b + 8, hand: "grip", prop: { k: "bills", n: 3, size: 0.8 }, ang: -62 }, { to: "paw", dx: 8, dy: b + 6, hand: "grip", prop: { k: "pegs", n: 3 } }];
};
/** the HEADPHONE CUP OFF: the hand goes up to the cup (gesture), lifts it off the ear and holds it out. Returns the arm
 *  and Pose.cupOff */
export const cupOffArm = (f: number, f0: number, side: -1 | 1, f1 = Infinity): { arm: Arm; cupOff: { side: -1 | 1; k: number } } => {
  const reach = gesture(f, f0, { move: 6, over: 0.06 }), lift = f1 < Infinity ? gestureBack(f, f0 + 10, f1) : gesture(f, f0 + 10, { move: 6, over: 0.1 });
  const k = clamp(lift, 0, 1.2);
  return { arm: { to: "hang", to2: "ear", k: reach, dx: side * 30 * k, dy: 4 * k, hand: "grip", hs: 1.1 }, cupOff: { side, k: 0.95 * k } };
};
/** LEANING IN through a door (the student): the body tilts toward screen side `side`, the head tilts further, a slight
 *  rise. Spread into the Pose (k 0..1 from a gesture) */
export const leanIn = (k: number, side: number): Pick<Pose, "tilt" | "headTilt" | "nod"> => ({ tilt: side * 16 * k, headTilt: side * 7 * k, nod: -0.8 * k });
/** the GARMENT BAG FLING (the student: "...and a clown suit."): one hand holds the bag up by its hook (Arm with the
 *  garment prop), the other grabs the flap and flings it aside. Returns { hold, fling, open } (open feeds the prop) */
export const garmentFling = (f: number, f0: number, side: -1 | 1): { hold: Arm; fling: Arm; open: number } => {
  // the HOLD arm (screen side -side) raises the bag by its hook out to the side at head height, so it hangs beside him
  // (never over his face); the FLING arm (screen side `side`) reaches across to the bag's edge (the grab), then sweeps
  // out into a palm-up "ta-da" as the flap swings away from him
  const k = gesture(f, f0, { ant: 5, move: 5, over: 0.16, settle: 10, antK: 0.2 }), open = clamp(k, 0, 1.1), grab = gesture(f, f0 - 12, { ant: 3, move: 6, over: 0.05, settle: 4 });
  return { hold: { to: "hang", fk: [150, 122], fkK: gesture(f, f0 - 26, { move: 8, over: 0.08 }), hand: "grip", prop: { k: "garment", open, side: (-side) as 1 | -1, sway: side * 7 * bump(f, f0, 3, 14) } },
    fling: { to: "hang", to2: "hug", k: grab, dx: -side * 14 * clamp(grab, 0, 1), fk: [112, 128], fkK: clamp(k, -0.3, 1.2), hand: k > 0.25 ? "open" : "grip", hs: 1.15, ang: side * 25 }, open };
};

// ---------------- THE CLOWN'S ACTING ----------------
/** RIDING LIFE on top of the route: a wobble roll (+-3 deg, two rates), balancing arms out with a flutter, the hat 2 f late,
 *  blinks, darts, the default open-eyed grin. Spread into the ClownPose (roll ADDS to a lean the route gives) */
export const clownRide = (f: number, seed = 3): Pick<ClownPose, "roll" | "armL" | "armR" | "hatLag" | "blink" | "look" | "lookY" | "expr"> => {
  const rollF = (t: number) => 2.2 * Math.sin(TAU * (t / 41) + seed) + 1.1 * Math.sin(TAU * (t / 17) + 2 * seed);
  const d = dartAt(f, seed + 40, 0.3);
  return { roll: rollF(f), armL: { fk: [96 + 7 * Math.sin(TAU * f / 23), 104 + 12 * Math.sin(TAU * f / 19 + 1)], hand: "open", ang: 10 }, armR: { fk: [92 + 7 * Math.sin(TAU * f / 29 + 2), 98 + 12 * Math.sin(TAU * f / 21)], hand: "open", ang: 10 },
    hatLag: lagOf(rollF, f, -3.4), blink: blinkAt(f, seed + 40), look: d.look, lookY: d.lookY, expr: "brightGrin" };
};
/** IDLING by rocking on the spot: the wheel rolls back and forth (d metres: add d / WHEEL_R to spin, and d along his
 *  heading to his position), the rider counter-pitches */
export const clownRock = (f: number): { d: number; roll: number; tilt: number } => ({ d: 0.1 * Math.sin(TAU * f / 40), roll: 1.2 * Math.sin(TAU * f / 40 + 0.6), tilt: -3 * Math.cos(TAU * f / 40) });
/** THE HORN SQUEEZE at f0: the arm dips 4 f (anticipation), the bulb squashes (~40 %) for 3 f with a 6 deg kick of the arm,
 *  honk arcs, the hat and ruff bounce 2 f late. Returns the horn arm + hatLag + ruff */
export const clownHonk = (f: number, f0: number, rest: ArmTo = "show"): { arm: Arm; hatLag: number; ruff: number; squeeze: number } => {
  const t = f - f0, sq = t < 0 ? 0 : t < 3 ? 1 : t < 6 ? 1 - (t - 3) / 3 : 0;
  const kick = (x: number) => (x < f0 - 4 ? 0 : x < f0 ? 4 * eio((x - f0 + 4) / 4) : x < f0 + 3 ? 4 - 10 * eo((x - f0) / 3) : -6 + 6 * eio((x - f0 - 3) / 8));
  return { arm: { to: rest, dy: kick(f), hand: "grip", prop: { k: "horn", squeeze: sq } }, hatLag: lagOf(kick, f, 1.4), ruff: lagOf(kick, f, -0.08), squeeze: sq };
};
export type WaveOpt = { swings?: number; per?: number; raise?: number; down?: number; amp?: number };
/** THE WAVE (a real one, from the elbow): the arm rises in 8 f with a 12 % overshoot to above and outside the head, then
 *  the FOREARM swings on an arc (`per` f per swing, default 12, 2.5 swings, the last at 60 %), the hand lags the forearm
 *  by 2 f, the head tilts against the swing, the body leans 3 deg away; optional `down` = the frame it lowers. The swing
 *  starts at f0 (start the raise 8 f before the word). Returns { arm, headTilt, tilt } (tilt to ADD) */
export const waveArm = (f: number, f0: number, side: number, o: WaveOpt = {}): { arm: Arm; headTilt: number; tilt: number } => {
  const n = o.swings ?? 2.5, per = o.per ?? 12, R8 = o.raise ?? 8, amp = o.amp ?? 26;
  const raise = o.down !== undefined ? gestureBack(f, f0 - R8, o.down, { ant: 3, move: R8, over: 0.12, settle: 6 }) : gesture(f, f0 - R8, { ant: 3, move: R8, over: 0.12, settle: 6 });
  const env = (t: number) => (t < 0 ? 0 : t < per * (n - 0.5) ? 1 : t < per * n ? 0.6 : 0) * Math.min(1, t / 3);
  const swing = (t: number) => amp * env(t - f0) * Math.sin((Math.PI * (t - f0)) / per);
  // the elbow out to the side (124 deg), the forearm up-and-out (146 +- 26): the hand stays clear of the head and the
  // clown's hair puffs on both ends of the arc; the upper arm swings a little with it (a bigger arc)
  const a2 = (t: number) => 142 + swing(t);
  return { arm: { to: "hang", fk: [128 + 0.22 * swing(f), a2(f)], fkK: raise, hand: "open", hs: 1.15, ang: -side * (a2(f - 2) - a2(f)) * 0.8 },
    headTilt: -side * 4 * (swing(f) / amp) * clamp(raise, 0, 1), tilt: -side * 3 * clamp(raise, 0, 1) };
};
/** a WOBBLE AND SAVE (he nearly falls, flails, catches it): from f0 the roll tips 15 deg toward screen side `dir` over 9 f
 *  (accelerating), the arms windmill, a jaw drop; then the roll swings back past upright and settles by ~f0 + 40, a
 *  relieved laugh. Returns roll, both arms, expr (each held >= 12 f), hatLag */
export const clownWobble = (f: number, f0: number, dir: 1 | -1 = 1): { roll: number; armL: Arm; armR: Arm; expr: Expr; hatLag: number } => {
  const rollF = (x: number) => { const t = x - f0; if (t < 0) return 0; if (t < 9) return dir * 15 * (t / 9) ** 2; const s = t - 9; return dir * 15 * Math.cos(TAU * s / 22) * Math.exp(-s / 10); };
  const t = f - f0, fl = t >= 0 && t < 34 ? Math.min(1, t / 3) * (t < 26 ? 1 : 1 - (t - 26) / 8) : 0, w = TAU * t / 9;
  const arm = (o: number, side: number): Arm => ({ fk: [95 + fl * 70 * Math.sin(w + o), 110 + fl * 80 * Math.sin(w + o + 1.1)], hand: "open", ang: side * 10 });
  return { roll: rollF(f), armL: arm(0, -1), armR: arm(Math.PI, 1), expr: t >= 1 && t < 22 ? "jawDrop" : t >= 22 && t < 50 ? "laughBig" : "brightGrin", hatLag: lagOf(rollF, f, -1.5) };
};
/** BRAKING with a wobble (he rides up to the lens and stops): the rider pitches forward 12 deg (tilt, toward screen side
 *  `dir` = his travel) at f0 + 4, rocks back to -5, +2, settles by f0 + 26; the arms fling up then out; the wheel's
 *  extra travel after f0 is brakeTravel(). Returns tilt, roll, armL, armR */
export const clownBrake = (f: number, f0: number, dir: 1 | -1 = 1): { tilt: number; roll: number; armL: Arm; armR: Arm } => {
  const t = f - f0, pitch = t < 0 ? 0 : t < 4 ? 12 * eo(t / 4) : 12 * Math.cos(TAU * (t - 4) / 18) * Math.exp(-(t - 4) / 7);
  const k = gestureBack(f, f0 - 1, f0 + 16, { ant: 2, move: 5, over: 0.15, settle: 6 });
  const arm = (side: number, off: number): Arm => ({ to: "out", fk: [150 + off, 175 + off], fkK: k, hand: "open", ang: side * 15 });
  return { tilt: dir * pitch, roll: dir * 2 * Math.sin(TAU * Math.max(0, t) / 14) * Math.exp(-Math.max(0, t) / 10), armL: arm(-1, 0), armR: arm(1, -12) };
};
/** the wheel's travel (metres) after the brake at f0 from speed v (m/s): eases to a stop over n frames, then a 3 cm roll
 *  back and forward (the rock of a real stop) */
export const brakeTravel = (f: number, f0: number, v: number, n = 10) => {
  const t = f - f0; if (t <= 0) return (t * v) / 30;
  const stop = (v * n) / 30 / 2; if (t < n) return stop * (1 - (1 - t / n) ** 2);
  return stop - 0.03 * Math.sin((Math.PI * (t - n)) / 12) * Math.exp(-(t - n) / 14);
};
/** the lean INTO a circle (deg) at speed v (m/s) on radius r (m): roll toward the centre */
export const circleLean = (v: number, r: number) => clamp(deg(Math.atan((v * v) / (9.81 * Math.max(0.3, r)))), 0, 18);

// ---------------- THE PEG-CLIP INSERT (S17: the hands close-up) ----------------
export type ClipSt = { t: number; slide: number; open: number; move: number; snap: number; swing: number; relL: number; relR: number };
/** the peg-clip timing around f0 (the frame the peg SNAPS shut on the bill): the left hand lifts the bill to the twig
 *  (f0-20 .. f0-12), the right hand squeezes the peg open (4 f), carries it down onto the bill's edge (6 f), lets it snap
 *  shut (2 f, a 10 % squash); the bill swings 10 deg and settles over ~20 f; the left hand lets go at +2, the right at +5 */
export const clipAt = (f: number, f0: number): ClipSt => {
  const t = f - f0;
  return { t, slide: eio((t + 20) / 8), open: t < -12 ? 0 : t < -8 ? eio((t + 12) / 4) : t < -2 ? 1 : t < 0 ? 1 - eio((t + 2) / 2) : 0, move: eio((t + 8) / 6),
    snap: t >= 0 && t < 4 ? 1 - t / 4 : 0, swing: t < 0 ? 0 : 10 * Math.sin((TAU * t) / 16 + 0.5) * Math.exp(-t / 8), relL: clamp((t - 2) / 8, 0, 1), relR: clamp((t - 5) / 10, 0, 1) };
};
/** the wrist that puts a hand's fingertip on `tip` (the same geometry as drawHand) */
const wristFor = (kind: HandKind, tip: P2, u: number, side: number, dir: number, z: number): P2 => {
  const L: Partial<Record<HandKind, [number, number]>> = { pinch: [3, 16.6], grip: [0, 11], open: [1.3, 20], point: [2.2, 22.4] }, [x, y] = L[kind] ?? [0, 10];
  const v = u * z, ca = Math.cos(dir), sa = Math.sin(dir), ts = -side;
  return [tip[0] - (x * ts * -sa * v + y * ca * v), tip[1] - (x * ts * ca * v + y * sa * v)];
};
/** a sleeve coming in from off the card to a wrist (the professor's olive tweed + a white cuff) */
const insertSleeve = (p: Pen, w: P2, dir: number, u: number) => {
  const dx = Math.cos(dir), dy = Math.sin(dir), at = (d: number): P2 => [w[0] - dx * d, w[1] - dy * d];
  p.band([at(420), at(36)], FIT.PROF.shirt, 15 * u, 1.6 * u, "round");
  p.band([at(54), at(22)], "#f6f3ec", 14 * u, 1.3 * u, "butt");
};
/** the INSERT card (600 x 1000, the action between y ~150 and ~640): the branch across the top with a twig stub, the bill
 *  rising to it in the LEFT hand, the clothes peg pinched open in the RIGHT hand, carried down, snapped on the bill's
 *  edge (a squash), the bill swinging, the hands letting go one after the other. Big skin hands on tweed sleeves */
export const drawClipInsert = (p: Pen, st: ClipSt) => {
  const u = 5, peg0: P2 = [430, 168], peg1: P2 = [300, 292], peg = L2(peg0, peg1, st.move), billC: P2 = [300, 400 + 110 * (1 - st.slide)];
  // the branch (bark + a light top edge + leaves), the twig stub the peg grips
  p.band([[-60, 228], [160, 214], [300, 204], [460, 214], [660, 244]], "#6e4a32", 66, 6, "round");
  p.stroke([[-50, 205], [160, 192], [300, 182], [460, 191], [650, 220]], 7, "#a07a58");
  for (const [lx, ly, a] of [[90, 170, -28], [520, 176, 24], [210, 156, -10]] as const) p.poly(rotP(ell(lx, ly, 52, 20, 0, 20), a, [lx, ly]), "#5fa84a", 4);
  p.band([[302, 230], [300, 300]], "#6e4a32", 16, 4, "round");
  // the bill (it swings about the peg's bite once clipped)
  p.g.save(); p.g.translate(300, 330); p.g.rotate(rad(st.swing)); p.g.translate(-300, -330);
  FX.drawBill(p, billC, 2.4, 0, 1.2, 0.15);
  p.g.restore();
  // the left hand steadies the bill's left edge (lets go first, dropping away)
  const dL = rad(-38), tipL: P2 = [billC[0] - 132 - 60 * st.relL, billC[1] + 10 + 150 * st.relL];
  if (st.relL < 1) { const w = wristFor("grip", tipL, u, -1, dL, 2); insertSleeve(p, w, dL, u); drawHand(p, "grip", w, u, -1, 0, dL, undefined, 2); }
  // the peg (squashes 10 % on the snap)
  p.g.save(); p.g.translate(peg[0], peg[1]); p.g.scale(1 + 0.05 * st.snap, 1 - 0.1 * st.snap); p.g.translate(-peg[0], -peg[1]);
  FX.drawPeg(p, peg, u, 0, st.open, 1);
  p.g.restore();
  // the right hand pinches the peg's levers (top), then opens and pulls away up-right
  const dR = rad(150), tipR: P2 = [peg[0] + 6 + 150 * st.relR, peg[1] - 44 - 90 * st.relR], kind: HandKind = st.relR > 0.15 ? "open" : "pinch";
  const w = wristFor(kind, tipR, u, 1, dR, 2); insertSleeve(p, w, dR, u); drawHand(p, kind, w, u, 1, kind === "open" ? 25 * st.relR : 0, dR, undefined, 2);
};

// ================================================================== p3: ANCHORS (where things are on a figure's card)
/** card-space points of a posed figure (600 x 1000 design units), for effects / props / contact shadows. hands =
 *  [screen-left, screen-right]; u = the head unit ON THE CARD (pass it to VFX as o.u); r = the head's half width */
export type Anchors = { head: P2; crown: P2; mouth: P2; chin: P2; chest: P2; hands: [P2, P2]; feet: P2; u: number; r: number };
/** the anchors of any drawFig figure (outfit o, pose P): the same maths as the drawing, no canvas needed */
export const figAnchors = (o: Outfit, P: Pose, X: { lift?: number; noLegs?: boolean } = {}): Anchors => {
  const go = clamp(P.go ?? 0, 0, 1), ph = P.walk ?? 0, gd = GAIT[P.gait ?? "walk"], v = viewOf(P), s = P.s ?? 0, c = P.c ?? 1;
  const dRaw = clamp(P.duck ?? 0, -0.3, 1.1), duck = Math.max(0, dRaw), rise = Math.max(0, -dRaw) / 0.12, shift = clamp(P.shift ?? 0, -1, 1) * (1 - go);
  const lean = duck * 20 * s + go * gd.lean * s + (P.lean ?? 0) * s + (go ? 1.2 * Math.sin(TAU * ph) * Math.abs(c) : 0);
  const ko = kitOpts({ ...P, nod: (P.nod ?? 0) + 3.0 * duck + 0.6 * go * gd.lean / 4 * Math.abs(c) }, v, lean), R = rig(o, ko), u = R.u;
  const sqAuto = P.view ? 1 : 1 - 0.32 * Math.exp(-(((c + 0.35) / 0.08) ** 2)), st = P.stretch ?? 1, sx = (sqAuto * (P.sq ?? 1)) / Math.sqrt(st);
  const kitHip = (975 - R.hipY) / UM, hipH = X.noLegs ? kitHip : kitHip - bobOf(gd, ph, go) - gd.sink * go - 0.15 * duck + 0.035 * rise;
  const fold = 1 - (0.05 + 0.1 * Math.abs(c)) * duck, dy = (kitHip - hipH) * UM, hipX = shift * 0.035 * Math.abs(c) * UM, base = 975 - (P.hop ?? 0) * UM;
  const out = (q: P2): P2 => [300 + (q[0] + hipX - 300) * sx, base + (R.hipY + dy + (q[1] - R.hipY) * fold - (X.lift ?? 0) * UM - 975) * st];
  const body = (q: P2) => out(R.fin(q));
  const headP = (q: P2) => { const a = rad(R.headTilt), cs = Math.cos(a), sn = Math.sin(a), x = q[0] - 300, y = q[1] - R.chin; return body([300 + x * cs - y * sn, R.chin + x * sn + y * cs]); };
  const La = ARM * R.HH, prof = clamp((Math.abs(s) - 0.45) / 0.45, 0, 1), kS = 1 - 0.62 * prof;
  const RS: Rig = prof > 0 ? { ...R, sh: (side: number): P2 => { const q = R.sh(side); return [R.tcx + (q[0] - R.tcx) * kS, q[1]]; } } : R;
  const hands = ([-1, 1] as const).map((side) => { const figRight = v.back ? side > 0 : side < 0; return out(solveArm(RS, (side < 0 ? P.armL : P.armR) ?? swingArm(side, figRight, P, gd), side, v.back, La, () => true).h); }) as [P2, P2];
  return { head: headP([300, R.hc]), crown: headP([300, R.hc - R.H.b]), mouth: headP([300 + 8 * u * v.facing, R.hc + 22 * u]), chin: body([300, R.chin]), chest: body([R.tcx, R.chin + 0.42 * R.HH]),
    hands, feet: [300, base], u: u * sx, r: R.H.a * sx };
};
const WHO_FIT = { hero: FIT.HERO, phoneGuy: FIT.PHONE_GUY, white: FIT.WHITE, blue: FIT.BLUE, pink: FIT.PINK, prof: FIT.PROF, student: FIT.STUDENT, ask0: FIT.ASK_A, ask1: FIT.ASK_B, dude: FIT.DUDE,
  friend0: FIT.FRIEND_A, friend1: FIT.FRIEND_B, mum: FIT.MUM, m1: FIT.M1, m2: FIT.M2, coffee: FIT.COFFEE, book: FIT.BOOK };
/** the anchors of a cast member by name: hero phoneGuy white blue pink prof student ask0 ask1 dude friend0 friend1 mum m1 m2
 *  coffee book. VFX.bang(p, f, f0, [A.crown[0], A.crown[1] - 12 * A.u], { u: A.u }) */
export const anchors = (who: keyof typeof WHO_FIT, P: Pose): Anchors => figAnchors(WHO_FIT[who], P);
/** the CLOWN's anchors on his card (place effect cards with the same scale 1 / CLOWN_K): + hat (its middle), horn (the
 *  bell's mouth, if a hand holds the horn) and hornDir (the bell's direction in canvas degrees: feed VFX.honkRings), wheel
 *  (the tyre's contact point) */
export type ClownAnchors = Anchors & { hat: P2; horn?: P2; hornDir?: number; wheel: P2 };
export const clownAnchors = (P: ClownPose): ClownAnchors => {
  const o = FIT.CLOWN, v = viewOf(P), s = P.s ?? 0, c = P.c ?? 1, ko = kitOpts(P, v, 0, "brightGrin"), R = rig(o, ko), u = R.u;
  const sq = (P.view ? 1 : 1 - 0.32 * Math.exp(-(((c + 0.35) / 0.08) ** 2))) * (P.sq ?? 1), st = P.stretch ?? 1, sx = sq / Math.sqrt(st), ro = rad(P.roll ?? 0), hop = (P.hop ?? 0) * UM;
  const rdx = proj(-0.03, SEAT, 0, s, c)[0] - 300, rdy = 975 - SEAT * UM - R.hipY, cs0 = Math.cos(ro), sn0 = Math.sin(ro);
  const out = (q: P2): P2 => { const x = (q[0] + rdx - 300) * sx, y = (q[1] + rdy - 975) * st - hop; return [300 + CLOWN_K * (x * cs0 - y * sn0), 975 + CLOWN_K * (x * sn0 + y * cs0)]; };
  const body = (q: P2) => out(R.fin(q));
  const headP = (q: P2) => { const a = rad(R.headTilt), cs = Math.cos(a), sn = Math.sin(a), x = q[0] - 300, y = q[1] - R.chin; return body([300 + x * cs - y * sn, R.chin + x * sn + y * cs]); };
  const La = ARM * R.HH * 1.04, arms = ([-1, 1] as const).map((side) => solveArm(R, (side < 0 ? P.armL : P.armR) ?? { to: "out", hand: "ball" }, side, v.back, La, () => true));
  const hn = arms.find((a) => a.A.prop?.k === "horn"), fs = (v.facing || 1) * (v.back ? -1 : 1);
  let horn: P2 | undefined, hornDir: number | undefined;
  if (hn) { const a = hn.side * 34 + (hn.A.ang ?? 0); horn = out(rotP([[hn.h[0], hn.h[1] - 41 * u]], a, hn.h)[0]); hornDir = -90 + a + (P.roll ?? 0); }
  return { head: headP([300, R.hc]), crown: headP([300, R.hc - R.H.b]), mouth: headP([300 + 8 * u * v.facing, R.hc + 22 * u]), chin: body([300, R.chin]), chest: body([R.tcx, R.chin + 0.42 * R.HH]),
    hands: [out(arms[0].h), out(arms[1].h)], feet: [300, 975], wheel: [300, 975], hat: headP([300 - 0.3 * R.H.a * fs, R.hc - 0.93 * R.H.b - 12 * u - (P.hatLift ?? 0) * u]), horn, hornDir,
    u: u * CLOWN_K * sx, r: R.H.a * CLOWN_K * sx };
};
/** each FOOT in the body frame (right, left): metres forward, metres to the figure's right, metres off the ground. For a
 *  soft contact shadow under every foot: world = pos + heading * fwd + right * lat, strength ~ 1 - lift / 0.1 (E.blob) */
export const feetOf = (P: Pose): { fwd: number; lat: number; lift: number }[] => {
  const gd = GAIT[P.gait ?? "walk"], L = gd.stride * clamp(P.go ?? 0, 0, 1);
  return ([1, -1] as const).map((lr) => { const [ff, fu] = P.feet ? P.feet[lr > 0 ? 0 : 1] : footAt((P.walk ?? 0) + (lr > 0 ? 0 : 0.5), L, gd); return { fwd: ff, lat: 0.086 * lr, lift: fu }; });
};

// ================================================================== p3: SQUASH + STRETCH, TAKES, SECONDARY MOTION
// All return Pose parts to SPREAD into a pose (people or the clown). stretch = Pose.stretch (1 = none; the width keeps the
// volume). Combine two by multiplying their stretch.
/** a LAND SQUASH at f0 (the feet / the tyre hit): squash 14 % in 2 f, spring past 1 (+5 %) by +5, settle by +11 */
export const landSquash = (f: number, f0: number, amt = 1): { stretch: number } => {
  const t = f - f0; return { stretch: t < 0 ? 1 : t < 2 ? 1 - 0.14 * amt * eo(t / 2) : t < 5 ? 1 - 0.14 * amt + 0.19 * amt * eio((t - 2) / 3) : t < 11 ? 1 + 0.05 * amt * (1 - eio((t - 5) / 6)) : 1 };
};
/** a HOP: a 3 f anticipation squash, a launch stretch, h metres at the apex, `dur` f in the air, then a land squash. { hop,
 *  stretch }: both for people and the clown (his tyre leaves the ground) */
export const hopAt = (f: number, f0: number, h = 0.14, dur = 10): { hop: number; stretch: number } => {
  const t = f - f0; if (t < -3) return { hop: 0, stretch: 1 }; if (t < 0) return { hop: 0, stretch: 1 - 0.1 * eio((t + 3) / 3) };
  if (t < dur) { const k = t / dur; return { hop: h * 4 * k * (1 - k), stretch: 1 + 0.1 * (1 - k) * Math.cos((Math.PI * k) / 2) }; }
  return { hop: 0, stretch: landSquash(f, f0 + dur).stretch };
};
/** HEAD-TURN DRAG: the head arrives 2 f late and overshoots: feed it the body's turn / lean (deg) as a function of the
 *  frame, ADD the result to headTilt */
export const headDrag = (fn: (t: number) => number, f: number, gain = 0.6) => lagOf(fn, f, gain, { lag: 2, hz: 2.6, zeta: 0.5 });
/** the BODY JIGGLE of a honk at f0 (10-14 f): the body stretches and wobbles, the pom-poms bounce 2 f late, the ruff
 *  springs. { stretch, pom, ruff } (pom / ruff are the clown's) */
export const honkJiggle = (f: number, f0: number, amt = 1): { stretch: number; pom: number; ruff: number } => {
  const t = f - f0; if (t < 0 || t > 14) return { stretch: 1, pom: 0, ruff: 0 }; const d = Math.exp(-t / 5);
  return { stretch: 1 + 0.07 * amt * d * Math.sin((TAU * t) / 5 + 0.6), pom: 5 * amt * d * Math.sin((TAU * (t - 2)) / 6), ruff: 0.7 * amt * d * Math.abs(Math.sin((TAU * (t - 1)) / 7)) };
};
/** a TAKE at f0: anticipation DOWN 4 f (squash 10 %, the head dips), POP UP 3 f with a stretch (+13 %), settle 8 f. Pair it
 *  with the new expression at f0 + 4 and VFX.surpriseLines. { stretch, nod } */
export const takeAt = (f: number, f0: number, amt = 1): { stretch: number; nod: number } => {
  const t = f - f0; if (t < 0 || t > 15) return { stretch: 1, nod: 0 };
  if (t < 4) { const k = eio(t / 4); return { stretch: 1 - 0.1 * amt * k, nod: 1.6 * amt * k }; }
  if (t < 7) { const k = eo((t - 4) / 3); return { stretch: 1 - 0.1 * amt + 0.23 * amt * k, nod: 1.6 * amt - 2.8 * amt * k }; }
  const k = eio((t - 7) / 8); return { stretch: 1 + 0.13 * amt * (1 - k) * Math.cos(1.2 * Math.PI * k), nod: -1.2 * amt * (1 - k) };
};
/** a DOUBLE TAKE toward screen side dir: a casual look at f0 (6 f), back to the front at f0 + 9, then the head SNAPS
 *  back at f0 + 16 (3 f) with a take. { look, headTilt, stretch, nod, blink }; change the face at f0 + 17 */
export const doubleTake = (f: number, f0: number, dir = 1): { look: number; headTilt: number; stretch: number; nod: number; blink: number } => {
  const t = f - f0, a = t < 0 ? 0 : t < 6 ? eio(t / 6) : t < 9 ? 1 : t < 14 ? 1 - eio((t - 9) / 5) : t < 16 ? 0 : t < 19 ? 1.25 * eo((t - 16) / 3) : 1.25 - 0.25 * eio((t - 19) / 6);
  const tk = takeAt(f, f0 + 13);
  return { look: dir * 1.1 * Math.min(1.15, a), headTilt: dir * 5 * a, stretch: tk.stretch, nod: tk.nod, blink: t >= 15 && t < 18 ? [0.5, 1, 0.5][t - 15] ?? 0 : 0 };
};
/** a LAUGH SHAKE from f0 to f1: the shoulders bounce at ~7 Hz (stretch +-3.5 %), the head tips back and bobs. Pair with
 *  expr "laughBig" and VFX.laughTears. { stretch, nod, headTilt } (headTilt is "back": multiply by the facing side) */
export const laughShake = (f: number, f0: number, f1: number, amt = 1): { stretch: number; nod: number; headTilt: number } => {
  const k = sm((f - f0) / 4) * (1 - sm((f - f1) / 6)) * amt, w = (TAU * (f - f0)) / 4.3;
  return { stretch: 1 + 0.035 * k * Math.sin(w), nod: -1.1 * k + 0.7 * k * Math.sin(w + 1), headTilt: -4 * k };
};
/** a SHIVER from f0 to f1 (cold / fright / the horn right behind you): a fast small shake. { tilt, sq } */
export const shiver = (f: number, f0: number, f1: number, amt = 1): { tilt: number; sq: number } => {
  const k = sm((f - f0) / 3) * (1 - sm((f - f1) / 5)) * amt; return { tilt: 1.4 * k * Math.sin((TAU * f) / 2.6), sq: 1 + 0.03 * k * Math.sin((TAU * f) / 2.6 + 1.5) };
};
/** a PROUD CHEST PUFF up at f0 (down at f1): the chest swells, the chin lifts, the body grows 3 %. Pair with expr "proudB"
 *  and VFX.sparkles. { breath, nod, stretch } */
export const chestPuff = (f: number, f0: number, f1 = Infinity): { breath: number; nod: number; stretch: number } => {
  const k = f1 < Infinity ? gestureBack(f, f0, f1, { ant: 4, move: 6, over: 0.2, settle: 8 }) : gesture(f, f0, { ant: 4, move: 6, over: 0.2, settle: 8 });
  return { breath: 2.6 * k, nod: -1.1 * k, stretch: 1 + 0.03 * k };
};
/** OVERLAP FOR EVERYTHING THAT HANGS, from ONE driver: fn(t) = the body's sideways motion in u (its x on the card, or its
 *  tilt in degrees x 3) as a function of the frame. Returns every secondary channel, each 2-3 f late with its own
 *  overshoot: the ponytail / bob (hairSwing), the backpack (pack), the lanyard card (cardSwing), coat tails, hems and tie
 *  (flutter), the hat (hatLag), the headphone cable (cable; it only draws when you pass it). Spread it into the Pose */
export const overlapAll = (fn: (t: number) => number, f: number, gain = 1): Pick<Pose, "hairSwing" | "pack" | "cardSwing" | "flutter" | "hatLag" | "cable"> => {
  const d = lagOf(fn, f, gain, { lag: 2, hz: 2.2, zeta: 0.4 }), d2 = lagOf(fn, f, gain, { lag: 3, hz: 1.7, zeta: 0.34 });
  return { hairSwing: d2, pack: 0.5 * Math.abs(d), cardSwing: clamp(d / 7, -1, 1), flutter: clamp(d2 / 7, -1, 1), hatLag: 1.2 * d, cable: 1.4 * d2 };
};

// ================================================================== p3: THE CLOWN'S BITS (he is why people stay)
// Each bit is 24-56 f, readable at phone size, and returns { pose, props, len }: spread `pose` over his riding pose, draw
// him, then call props (the balls, the hat, the hankies...) on the same card. drawClownBit does both.
//   const bit = PPL.clownBit("juggle", f, f0);                         // f0 = the bit's first frame
//   const P: PPL.ClownPose = { ...route, ...PPL.clownRide(f), ...bit.pose };
//   E.putFig(out, cam, `clown|${E.fkey(P)}|${f}`, pos, (p) => PPL.drawClownBit(p, P, bit), { scale: 1 / PPL.CLOWN_K });
export type ClownBitName = "juggle" | "hatTip" | "hankies" | "balloon" | "oneFoot" | "trip" | "partyHorn" | "pigeonHat" | "bow" | "kiss" | "honk";
export type ClownBit = { pose: Partial<ClownPose>; props: (p: Pen, A: ClownAnchors, P: ClownPose) => void; len: number };
/** the bits' lengths in frames */
export const CLOWN_BITS: Record<ClownBitName, number> = { juggle: 48, hatTip: 42, hankies: 50, balloon: 56, oneFoot: 44, trip: 40, partyHorn: 36, pigeonHat: 52, bow: 44, kiss: 38, honk: 24 };
const ball = (p: Pen, c: P2, r: number, col: string) => { p.poly(ell(c[0], c[1], r, r, 0, 16), col, 0.28 * r); p.dot(c[0] - 0.32 * r, c[1] - 0.35 * r, 0.26 * r, "#ffffff"); };
/** a clown BIT at frame f (it starts at f0). side = the screen side of the arm that does it (1 = screen-right) */
export const clownBit = (name: ClownBitName, f: number, f0: number, side: 1 | -1 = 1): ClownBit => {
  const len = CLOWN_BITS[name], t = f - f0, none: ClownBit = { pose: {}, props: () => {}, len };
  if (t < -8 || t > len + 10) return none;
  const main = (a: Arm): Partial<ClownPose> => (side > 0 ? { armR: a } : { armL: a }), other = (a: Arm): Partial<ClownPose> => (side > 0 ? { armL: a } : { armR: a });
  const hand = (A: ClownAnchors) => A.hands[side > 0 ? 1 : 0];
  switch (name) {
    case "juggle": { // three balls in a cascade over his head, the eyes follow them
      const k = gestureBack(f, f0, f0 + len - 4, { move: 5 }), w = (TAU * t) / 12;
      return { len, pose: { armL: { to: "out", fk: [68, 142 + 14 * Math.sin(w)], fkK: k, hand: "open", ang: 20 }, armR: { to: "out", fk: [68, 142 - 14 * Math.sin(w)], fkK: k, hand: "open", ang: -20 },
          look: 0.6 * Math.sin(w / 2) * clamp(k, 0, 1), lookY: -0.9 * clamp(k, 0, 1), headTilt: 3 * Math.sin(w / 2), expr: "brightGrin" },
        props: (p, A) => { if (k < 0.6) return; const [L, R2] = A.hands, H = 112 * A.u;
          ["#e9342c", "#36b0ff", "#57d23a"].forEach((col, i) => { const s = (((t / 24 + i / 3) % 1) + 1) % 1, fwd = s < 0.5, q = fwd ? s / 0.5 : (s - 0.5) / 0.5, a = fwd ? L : R2, b = fwd ? R2 : L;
            ball(p, [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q - 12 * A.u - H * 4 * q * (1 - q)], 9 * A.u, col); }); } };
    }
    case "hatTip": { // he lifts the hat, spins it on a finger, nods, puts it back
      const up = gestureBack(f, f0, f0 + 36, { move: 6, over: 0.08 }), outK = gestureBack(f, f0 + 9, f0 + 28, { move: 6 }), off = t >= 8 && t < 37;
      return { len, pose: { ...main({ to: "out", fk: [150 - 28 * clamp(outK, 0, 1.1), 196 - 50 * clamp(outK, 0, 1.1)], fkK: up, hand: off ? "point" : "open", ang: off ? -side * 30 : 0 }), hatOff: off,
          nod: 1.6 * bump(f, f0 + 12, 6, 10), headTilt: -side * 4 * clamp(outK, 0, 1), expr: t > 10 && t < 30 ? "polite" : "brightGrin", face: t > 12 && t < 26 ? { wink: side } : undefined },
        props: (p, A) => { if (!off) return; const h = hand(A); drawClownHat(p, [h[0] + side * 2 * A.u, h[1] - 26 * A.u], A.u, 720 * eio((t - 9) / 20)); } };
    }
    case "hankies": { // a string of coloured handkerchiefs out of his chest, three tugs
      const steps = clamp((t - 6) / 8, 0, 3), k = (Math.floor(steps) + eo(steps - Math.floor(steps))) / 3, drop = Math.max(0, t - 42);
      return { len, pose: { ...main({ to: "chest", fk: [128, 150], fkK: clamp(k, 0, 1) * (1 - sm(drop / 6)), hand: "pinch" }), ...other({ to: "chest", dx: -side * 4, dy: 6, hand: "grip" }),
          look: side * 0.8 * k, lookY: -0.5 * k, expr: k > 0.7 ? "delightB" : "brightGrin", stretch: 1 + 0.04 * Math.sin(Math.PI * (steps - Math.floor(steps))) * (steps < 3 ? 1 : 0) },
        props: (p, A) => { if (t < 4) return; const h = hand(A), c0 = A.chest, n = Math.max(1, Math.round(k * 6)), cols = ["#e9342c", "#ffd21a", "#36b0ff", "#57d23a", "#ff5fae", "#ff8a1f"];
          const at = (q: number): P2 => [c0[0] + (h[0] - c0[0]) * q, c0[1] + (h[1] - c0[1]) * q + 22 * A.u * Math.sin(Math.PI * q) * (1 - 0.6 * k) + 0.5 * drop * drop * A.u * (1 - q)];
          const line: P2[] = []; for (let i = 0; i <= 12; i++) line.push(at(i / 12)); p.stroke(line, 1.3 * A.u, INK);
          for (let j = 0; j < n; j++) { const c = at((j + 0.6) / n), s2 = 7.5 * A.u; p.poly(rotP([[c[0] - s2, c[1]], [c[0], c[1] - s2], [c[0] + s2, c[1]], [c[0], c[1] + s2 * 1.5]], 14 * Math.sin(t / 3 + j), c), cols[j % 6], 1.3 * A.u); } } };
    }
    case "balloon": { // three puffs blow it up, he lets go, it squeals away
      const inK = gesture(f, f0, { move: 6, over: 0.05 }), puffs = clamp((t - 6) / 7, 0, 3), r = 5 + 22 * ((Math.floor(puffs) + eo(puffs - Math.floor(puffs))) / 3), go = t - 29, fly = go >= 0;
      return { len, pose: { ...main({ to: "out", to2: "chin", k: inK * (fly ? 1 - sm(go / 6) : 1), dx: side * 12, dy: 2, hand: "pinch" }), mouth: fly ? (go > 12 ? "laugh" : "vO") : puffs - Math.floor(puffs) < 0.5 && t > 6 ? "vU" : "vM",
          stretch: 1 + (fly ? 0 : 0.035 * Math.sin(Math.PI * (puffs - Math.floor(puffs)))), look: fly ? side * Math.min(1.2, go / 6) : side * 0.3, lookY: fly ? -0.9 : 0.2, expr: fly ? (go > 12 ? "laughBig" : "brightO") : "brightGrin",
          headTilt: fly ? side * 5 : 0 },
        props: (p, A) => { if (t < 5 || go > 24) return; const m = A.mouth, u = A.u;
          const c: P2 = fly ? [m[0] + side * (26 + 7.5 * go + 16 * Math.sin(go * 1.25)) * u, m[1] - (6 + 5.2 * go + 13 * Math.cos(go * 1.05)) * u] : [m[0] + side * (12 + r * 0.9) * u, m[1] - 2 * u], rr = (fly ? Math.max(4, 27 * (1 - go / 26)) : r) * u;
          if (fly) VFX.puff(p, f, f0 + 29 + 3 * Math.floor(go / 3), [c[0] - side * rr, c[1] + rr * 0.6], { u, dir: 100 });
          p.poly(ell(c[0], c[1], rr, rr * 1.12, fly ? 40 * Math.sin(go) : 0, 20), "#e9342c", 1.6 * u); p.arc(c[0] - 0.35 * rr, c[1] - 0.4 * rr, 0.4 * rr, 0.4 * rr, 190, 280, 1.4 * u, "#ffb0a0");
          p.poly([[c[0] - side * rr, c[1] + 1.5 * u], [c[0] - side * (rr + 4 * u), c[1] - 2 * u], [c[0] - side * (rr + 4 * u), c[1] + 4 * u]], "#c8241c", 1.1 * u); } };
    }
    case "oneFoot": { // one foot off its pedal and out, the arms windmill, he wobbles and grins
      const k = gestureBack(f, f0 + 2, f0 + 34, { move: 6 }), w = (TAU * t) / 13, kk = clamp(k, 0, 1);
      return { len, pose: { legOut: clamp(k, 0, 1.05), roll: 7 * kk * Math.sin((TAU * t) / 11), armL: { to: "out", fk: [100 + 38 * Math.sin(w), 112 + 46 * Math.sin(w + 1)], fkK: kk, hand: "open" },
          armR: { to: "out", fk: [100 - 38 * Math.sin(w), 112 - 46 * Math.sin(w + 1)], fkK: kk, hand: "open" }, expr: kk > 0.5 ? "thrillB" : "brightGrin", hatLag: 9 * kk * Math.sin((TAU * (t - 2)) / 11) }, props: () => {} };
    }
    case "trip": { // a pretend trip: he pitches forward, flails, catches it, "ta-da!"
      const pitch = t < 0 ? 0 : t < 5 ? 24 * eo(t / 5) : t < 20 ? 24 * Math.cos((TAU * (t - 5)) / 20) * Math.exp(-(t - 5) / 6) : 0, fl = t >= 0 && t < 18 ? Math.min(1, t / 2) * (1 - sm((t - 12) / 6)) : 0, ta = gesture(f, f0 + 20, { move: 5, over: 0.18 }), w = (TAU * t) / 7, tk = takeAt(f, f0 + 17);
      const arm = (sd: number, o2: number): Arm => ({ to: "out", fk: [110 + fl * 55 * Math.sin(w + o2) + 50 * clamp(ta, 0, 1.1), 125 + fl * 70 * Math.sin(w + o2 + 1) + 55 * clamp(ta, 0, 1.1) - (sd > 0 ? 14 : 0)], hand: "open" });
      return { len, pose: { tilt: side * pitch, hop: 0.05 * bump(f, f0, 3, 5), roll: side * 4 * fl * Math.sin(w), armL: arm(-1, 0), armR: arm(1, Math.PI), stretch: tk.stretch, nod: tk.nod,
          expr: t >= 1 && t < 17 ? "jawDrop" : t >= 17 ? "delightB" : "brightGrin", hatLag: -side * 0.7 * pitch, hatLift: 5 * bump(f, f0 + 1, 3, 8) }, props: (p, A) => { if (t >= 21) VFX.sparkles(p, f, A.head, { u: A.u, n: 4, r: 80, f0: f0 + 21 }); } };
    }
    case "partyHorn": { // a party blow-out unrolls with a toot and curls back
      const inK = gestureBack(f, f0, f0 + 30, { move: 5, over: 0.05 }), L = t < 6 ? 0 : t < 12 ? eo((t - 6) / 6) : t < 24 ? 1 : 1 - eio((t - 24) / 6);
      return { len, pose: { ...main({ to: "out", to2: "chin", k: inK, dx: side * 13, dy: 0, hand: "grip" }), mouth: L > 0.05 ? "vU" : undefined, stretch: 1 + 0.04 * L * Math.sin((TAU * t) / 5), expr: "brightGrin", face: L > 0.3 ? { blush: 1 } : undefined },
        props: (p, A) => { if (t < 4 || t > 32) return; const m = A.mouth, u = A.u, n = 12, pts: P2[] = [];
          for (let i = 0; i <= n; i++) { const q = i / n, curl = (1 - L) * q * q * 5.5, d = (8 + 46 * q * (0.25 + 0.75 * L)) * u; pts.push([m[0] + side * (d * Math.cos(curl) + 4 * u), m[1] - 1 * u - d * Math.sin(curl) * 0.9 - 2 * u * Math.sin(t / 2) * q * L]); }
          p.stroke(pts, 9 * u, INK); p.stroke(pts, 6.4 * u, "#ffd21a"); for (let i = 1; i < n; i += 2) p.stroke([pts[i], pts[i + 1]], 6.4 * u, "#e9342c");
          p.poly(ell(m[0] + side * 9 * u, m[1] - 1 * u, 4 * u, 5 * u, 0, 12), "#36b0ff", 1.2 * u);
          VFX.honkRings(p, f, f0 + 11, pts[n], { u, dir: side > 0 ? -15 : -165, n: 2, r: 34 }); } };
    }
    case "pigeonHat": { // a pigeon lands on his hat; he looks up at it cross-eyed; it pecks; it leaves
      const land = 12, away = 42, on = t >= land && t < away, kk = sm((t - land) / 3) * (1 - sm((t - away) / 4));
      return { len, pose: { lookY: -1.3 * kk, face: { cross: 0.95 * kk }, expr: t >= land + 2 && t < away ? (t < land + 20 ? "puzzled" : "brightO") : "brightGrin", hatLag: on ? 8 * Math.exp(-(t - land) / 5) * Math.sin((TAU * (t - land)) / 7) : 0,
          hatLift: on ? -2.5 * Math.exp(-(t - land) / 6) : 0, headTilt: 2 * kk * Math.sin(t / 5), stretch: 1 - 0.04 * bump(f, f0 + land, 2, 6) },
        props: (p, A) => { if (t < 0 || t > len) return; const u = A.u, k = 0.1 * u, g = p.g, e = t < land ? eo(t / land) : 1, lv = t >= away ? eio((t - away) / 9) : 0;
          const x = A.hat[0] + side * (70 * (1 - e) - 90 * lv) * u, y = A.hat[1] - 13 * u - (95 * (1 - e) + 80 * lv) * u, flying = t < land || t >= away;
          g.save(); g.translate(x, y); g.scale(side > 0 ? k : -k, k); g.translate(-300, -965);
          FX.drawPigeon(p, { run: 0, flap: flying ? 1 : 0, wing: t / 3.2, peck: bump(f, f0 + land + 10, 2, 3) + bump(f, f0 + land + 17, 2, 3), lift: flying ? 0.6 : 0 }); g.restore();
          if (t === land || t === land + 1) VFX.feathers(p, f, f0 + land, [x, y], { u, n: 2, ground: A.wheel[1], w: 80 }); } };
    }
    case "bow": { // a deep bow that nearly tips him over; he windmills and saves it
      const k = gestureBack(f, f0 + 2, f0 + 24, { move: 8, over: 0.08 }), tip = bump(f, f0 + 13, 7, 9), w = (TAU * t) / 8, fl = sm((t - 16) / 3) * (1 - sm((t - 30) / 5));
      return { len, pose: { tilt: side * 38 * clamp(k, -0.1, 1.1), nod: 2 * clamp(k, 0, 1), roll: -side * 11 * tip, ...main({ to: "out", to2: "belly", k: clamp(k, 0, 1) * (1 - fl), fk: [105 + 50 * Math.sin(w), 120 + 60 * Math.sin(w + 1)], fkK: fl, hand: "open" }),
          ...other({ to: "out", fk: [140 - 45 * fl * Math.sin(w), 118 - 60 * fl * Math.sin(w + 1)], fkK: Math.max(clamp(k, 0, 1), fl), hand: "open" }), hatLift: 6 * tip, hatLag: side * 22 * clamp(k, 0, 1),
          expr: t >= 14 && t < 28 ? "jawDrop" : t >= 28 ? "laughBig" : "polite" }, props: (p, A) => { if (t >= 13 && t < 24) VFX.sweat(p, f, f0 + 13, [A.head[0] - side * 0.8 * A.r, A.head[1] - 0.5 * A.r], { u: A.u, side: -side }); } };
    }
    case "kiss": { // a kiss blown to the lens: hand to the mouth, "mwah", the hand opens toward us, hearts fly
      const inK = gesture(f, f0, { move: 6, over: 0.05 }), outK = gestureBack(f, f0 + 11, f0 + 30, { ant: 2, move: 5, over: 0.15 });
      return { len, pose: { ...main({ to: "out", to2: "chin", k: inK, dx: side * 8, dy: -2, fk: [88, 104], fkK: clamp(outK, 0, 1.15), hand: outK > 0.2 ? "open" : "flat", hs: 1.15 }), mouth: t >= 5 && t < 13 ? "vU" : undefined,
          face: t >= 5 && t < 14 ? { wink: -side, blush: 1 } : { blush: 0.8 }, expr: t >= 13 ? "delightB" : "brightGrin", headTilt: side * 5 * clamp(outK, 0, 1), stretch: 1 + 0.05 * bump(f, f0 + 11, 2, 5) },
        props: (p, A) => { const h = hand(A); VFX.hearts(p, f, f0 + 12, [h[0] + side * 6 * A.u, h[1] - 14 * A.u], { u: A.u * 1.5, n: 4, rise: 2.2 }); } };
    }
    default: { // "honk": the squeeze, the kick, the rings, the jiggle
      const h = clownHonk(f, f0 + 5), j = honkJiggle(f, f0 + 5);
      return { len, pose: { ...main(h.arm), hatLag: h.hatLag, ruff: h.ruff + j.ruff, pom: j.pom, stretch: j.stretch, expr: "thrillB" },
        props: (p, A) => { if (A.horn) VFX.honkRings(p, f, f0 + 5, A.horn, { u: A.u, dir: A.hornDir ?? -45 }); } };
    }
  }
};
/** draw the clown doing a bit: the pose merged, then the bit's props on the same card */
export const drawClownBit = (p: Pen, P: ClownPose, bit: ClownBit) => { const Q: ClownPose = { ...P, ...bit.pose, face: { ...(P.face ?? {}), ...(bit.pose.face ?? {}) } }; drawClown(p, Q); bit.props(p, clownAnchors(Q), Q); };
/** the CLOWN's own overlap from ONE driver (fn(t) = his roll / lean in degrees, or his speed change x 10): the hat lags
 *  and settles, the ruff springs, the pom-pom buttons bounce a beat later, the horn's bell swings (hornAng: ADD it to the
 *  horn arm's `ang`). Spread into the ClownPose (it replaces clownRide's hatLag) */
export const clownOverlap = (fn: (t: number) => number, f: number, gain = 1): { hatLag: number; ruff: number; pom: number; hornAng: number } => {
  const d = lagOf(fn, f, gain, { lag: 2, hz: 2.3, zeta: 0.38 }), d2 = lagOf(fn, f, gain, { lag: 4, hz: 1.8, zeta: 0.34 });
  return { hatLag: -1.6 * d, ruff: clamp(Math.abs(d) / 6, 0, 1), pom: clamp(0.9 * d2, -6, 6), hornAng: 2.2 * d2 };
};

// ================================================================== p3 ADDENDUM (D8 / D9 of FIX2_PLAN, 2026-11-18)
// Turns that cannot pop (spinAround), overlap on stops, the suit reveal (the bag BESIDE him, on its own card), the pedal
// mime's body, the reach for a bill, the professor's office bits. All pure functions of the frame.

/** a design point of a figure's card as an offset from the figure's ground point: [metres toward SCREEN right, metres
 *  up] (x the putFig scale). World point = pos + cam.right * dx + up * dy: place a prop card at a hand, a bill at a head */
export const cardOffset = (pt: P2, scale = 1): [number, number] => [(pt[0] - 300) * 0.00216 * scale, (975 - pt[1]) * 0.00216 * scale];

/** OVERLAP ON A STOP / A START / ANY HIT at fAt: the hair, the pack, the lanyard card and the hems carry on and settle (a
 *  damped swing from 2 f before fAt, ~30 f). side = the heading's screen side (Math.sign(s) || 1), amt scales it.
 *  Spread into the Pose AFTER the walk fields (inside its window it replaces the automatic walk overlap) */
export const stopOverlap = (f: number, fAt: number, side = 1, amt = 1): Pick<Pose, "hairSwing" | "pack" | "cardSwing" | "flutter"> => {
  const t = f - fAt + 2; if (t < 0 || t > 34) return {};
  const w = (lag: number, per: number, tau: number) => { const x = t - lag; return x < 0 ? 0 : Math.exp(-x / tau) * Math.cos((TAU * x) / per) * sm(x / 2); };
  return { hairSwing: 14 * amt * side * w(1, 13, 9), pack: 7 * amt * w(2, 11, 7), cardSwing: 0.95 * amt * side * w(1, 12, 10), flutter: 0.8 * amt * w(0, 9, 8) };
};

export type SpinAroundOpt = {
  /** the heading before / after (deg: 0 = facing the lens, 180 = back to the lens, 90 = facing screen right). The turn
   *  goes the short way the numbers say (180 -> 0 passes 90: he comes round over screen RIGHT; -180 -> 0 over screen left) */
  from?: number; to?: number;
  /** wind-up frames (>= 4), overshoot (deg), settle frames (>= 6) */
  wind?: number; over?: number; settle?: number };
/** THE TURN-AROUND THAT CANNOT POP: one KEYED drawing per frame, so the 3/4 views and the smear are always there (the
 *  film's S13 flipped back -> front in one frame). f0 = the first frame of the turn:
 *    f0-wind .. f0-1  WIND-UP: 5 deg the wrong way, a 4 % squash, a lean against the turn
 *    f0               the start view, 82 % wide, leaning into the turn
 *    f0+1             3/4 of the start view, 60 % wide (from behind: the cheek, the brow, the glasses' arm), half a blink
 *    f0+2             THE SMEAR FRAME: side-on (the features at the leading edge), 45 % wide, stretched along the motion
 *                     with opaque speed streaks behind it, eyes shut
 *    f0+3             3/4 of the end view, 68 %, half a smear
 *    f0+4             the end view, 86 %, stretched 5 %
 *    f0+5             the OVERSHOOT (over deg past the end), then it swings back and settles over `settle` f
 *  The hair whips 3 f late. Returns spinAt's fields + back (pass it to bodyArms: the phone stays at the same EAR) + len.
 *  Spread into the Pose: { ...sp, ...PPL.bodyArms(sp.back, phoneArm, freeArm) }. spinAt() now uses it for every turn of
 *  120 deg or more */
export const spinAround = (f: number, f0: number, o: SpinAroundOpt = {}): Pick<Pose, "s" | "c" | "view" | "facing" | "sq" | "smear" | "smearDir" | "hairSwing" | "blink" | "face" | "stretch" | "tilt"> & { angle: number; back: boolean; len: number } => {
  const a0 = o.from ?? 180, a1 = o.to ?? 0, W = Math.max(4, o.wind ?? 4), OV = o.over ?? 18, S = Math.max(6, o.settle ?? 8), dir = Math.sign(a1 - a0) || 1, t = f - f0, wd = 5;
  const KA = [0, 0.12, 0.5, 0.78, 0.93, 1];                                                    // the turn's share at f0 .. f0+5: fastest across the smear frame
  const ang = (x: number): number => {
    if (x < -W) return a0;
    if (x < 0) return a0 - dir * wd * eio((x + W) / W);
    if (x < 5) { const i = Math.floor(x), q = x - i; return a0 - dir * wd + (a1 + dir * OV - a0 + dir * wd) * (KA[i] + (KA[i + 1] - KA[i]) * q); }
    if (x < 5 + S) { const q = (x - 5) / S; return a1 + dir * OV * Math.cos(1.25 * Math.PI * q) * (1 - q); }
    return a1;
  };
  const i = t < -0.5 ? -1 : t >= 5.5 ? 6 : Math.round(t), tk = i < 0 || i > 5 ? t : i;         // inside the turn every frame shows its KEY
  const th = ang(tk), r = rad(th), s = Math.sin(r), c = Math.cos(r), isBack = (a: number) => Math.cos(rad(a)) < -0.34;
  const own = (a: number): -1 | 0 | 1 => (Math.abs(Math.sin(rad(a))) > 0.3 ? (Math.sign(Math.sin(rad(a))) as -1 | 1) : 0);
  const b0 = isBack(a0), b1 = isBack(a1), ms = ((Math.sign(Math.sin(rad((a0 + a1) / 2))) || -dir) as -1 | 1);
  const back = i <= 1 ? b0 : i === 2 ? isBack(th) : b1, wk = t < -W || t >= 1 ? 0 : t < 0 ? eio((t + W) / W) : 1 - t;
  const SQ = [0.82, 0.6, 0.45, 0.68, 0.86, 1], ST = [0.98, 1.02, 1.07, 1.06, 1.05, 1.02], SM = [0, 0, 1, 0.5, 0, 0], BL = [0, 0.5, 1, 1, 0.4, 0];
  const k = i >= 0 && i <= 5 ? i : -1, facing: -1 | 0 | 1 = own(th) || (k === 1 || k === 2 ? ms : 0);
  const fdx = back ? 0 : k === 1 ? 7 * ms : k === 2 ? 13 * ms * Math.max(0.6, Math.abs(s)) : k === 3 ? 6 * facing : 0;
  return { angle: th, s, c, view: back ? "back" : "front", facing, sq: (k >= 0 ? SQ[k] : 1) * (1 + 0.04 * wk), stretch: (k >= 0 ? ST[k] : 1) * (1 - 0.04 * wk),
    tilt: -dir * 5 * wk + (k === 0 || k === 1 ? dir * 3 : 0), smear: k >= 0 ? SM[k] : 0, smearDir: b0 && !b1 ? -ms : ms,
    hairSwing: clamp(lagOf(ang, f, -0.8 * dir, { lag: 3, hz: 1.8, zeta: 0.38 }), -26, 26), blink: k >= 0 ? BL[k] : 0,
    face: fdx ? { fdx } : undefined, back, len: W + 5 + S };
};

/** the PEDAL MIME's body (spread into the Pose next to pedalMime's arms): the shoulders rock opposite the fists, a small
 *  bounce as if on a saddle */
export const pedalMimeBody = (f: number, f0: number, f1 = Infinity): Pick<Pose, "tilt" | "stretch" | "hop"> => {
  const k = clamp(f1 < Infinity ? gestureBack(f, f0, f1) : gesture(f, f0), 0, 1), ph = (TAU * Math.max(0, f - f0)) / 14;
  return { tilt: -4 * k * Math.sin(ph), stretch: 1 + 0.03 * k * Math.sin(2 * ph), hop: 0.016 * k * (1 + Math.sin(2 * ph - 1)) };
};

// ---------------- THE SUIT REVEAL (the student: "...and a clown suit.") ----------------
export type SuitReveal = { hold: Arm; fling: Arm; /** the flap 0..1 (+ a flutter) */ open: number; /** the suit tumbling out 0..1 (+ a bounce) */ suit: number;
  /** the bag's swing (deg) */ sway: number; /** the bag's hinge side (= -side) */ bagSide: 1 | -1; /** the body's lean (deg, Pose.tilt) and stretch */ tilt: number; stretch: number;
  /** index into Anchors.hands of the HOLD hand (the bag's hook hangs from it) */ hand: 0 | 1 };
/** THE SUIT REVEAL. The bag hangs BESIDE him on its hanger, at arm's length on screen side -side, clear of his body
 *  (never "on" him); the other hand (screen side `side`) does the fling. f0 = the frame the FLAP starts to move:
 *    f0-30 .. f0-22  the hold arm brings the bag up and out by its hook (start the shot later and it is already up)
 *    f0-7  .. f0-3   the fling hand reaches ACROSS to the flap's edge and grabs it: the ARM LEADS the flap by 7 f
 *    f0-3  .. f0     the anticipation: the hand tugs the edge back, he leans 4 deg AWAY from the bag
 *    f0    .. f0+7   the flap swings open over 7 f (a visible step every frame), then flutters
 *    f0+2  .. f0+8   the suit tumbles out 2 f late (its sleeves swing) and bounces once
 *    f0+1  .. f0+7   the hand lets go and sweeps out into a palm-up TA-DA (12 % overshoot, settles over 8 f)
 *  The bag does not fit on his 600-unit card: put it on its OWN card at the hold hand (CHAR.md has the 4 lines) with
 *  drawSuitBag. One expression track for the line: smug until f0-1, the proud grin from f0 */
export const suitReveal = (f: number, f0: number, side: 1 | -1 = 1): SuitReveal => {
  const t = f - f0, up = gesture(f, f0 - 30, { move: 8, over: 0.08 });
  const reach = gesture(f, f0 - 7, { ant: 2, move: 4, over: 0.04, settle: 3 }), pull = bump(f, f0 - 3, 3, 2), flick = bump(f, f0, 2, 3);
  const open = t < 0 ? 0 : t < 7 ? sm(t / 7) : 1 + 0.05 * Math.exp(-(t - 7) / 5) * Math.sin((TAU * (t - 7)) / 9);
  const tada = gesture(f, f0 + 1, { ant: 0, move: 6, over: 0.12, settle: 8 }), st = t - 2;
  const suit = st < 0 ? 0 : st < 6 ? eo(st / 6) : 1 + 0.14 * Math.exp(-(st - 6) / 6) * Math.sin((TAU * (st - 6)) / 10);
  return {
    hold: { to: "hang", fk: [120, 104], fkK: up, hand: "grip", front: true },
    fling: { to: "hang", to2: "hug", k: reach, dx: -side * (50 * clamp(reach, 0, 1) - 8 * pull + 9 * flick), dy: -12 * clamp(reach, 0, 1), fk: [112, 128], fkK: clamp(tada, -0.1, 1.2), hand: tada > 0.3 ? "open" : "grip", hs: 1.2, ang: side * 25, front: true },
    open, suit, sway: side * (4 * pull - 8 * bump(f, f0, 3, 12)) + 3 * Math.exp(-Math.max(0, t) / 14) * Math.sin(f / 5), bagSide: (-side) as 1 | -1,
    tilt: side * (4 * pull - 2.5 * bump(f, f0, 2, 6)), stretch: 1 + 0.04 * bump(f, f0, 3, 8), hand: side > 0 ? 0 : 1 };
};
/** the garment bag for suitReveal on ITS OWN card: hookY = the hold hand's card y (Anchors.hands[sr.hand][1]); the hook
 *  is drawn at x 300 */
export const drawSuitBag = (p: Pen, hookY: number, sr: SuitReveal, u = 2.4) => FX.drawGarmentBag(p, [300, hookY - 4 * u], u, sr.open, sr.bagSide, sr.sway, sr.suit);

// ---------------- THE REACH FOR A BILL ----------------
export type ReachBill = { arm: Arm; /** how much the eyes and the head are ON the bill (0..1): blend your gaze with it */ gaze: number;
  nod: number; headTilt: number; browUp: [number, number]; duck: number; stretch: number;
  /** the BILL's answer: its tilt (deg) and drop (u) while pinched and tugged, its swing after the release */ bill: { tilt: number; dy: number; held: boolean } };
/** A READABLE REACH for a hanging bill. at = the bill's LOWER CORNER on his card (card units: K.onFig / E.onCard of the
 *  world point), side = the screen side of the reaching arm, f0 = the hand starts to rise:
 *    f0-6 .. f0-1   the eyes go to the bill, the head tips back, the brows rise (the look LEADS the hand)
 *    f0   .. f0+8   the open hand (1.4x) rises IN FRONT of the body on its own side, up on the toes
 *    f0+9           the PINCH: the bill tilts 12 deg toward him
 *    f0+13, f0+24   two small TUGS: the bill dips and swings
 *    f1 (optional)  he lets go: the arm comes down, the bill swings and settles (~30 f)
 *  REACH: the arms are short (a hand straight up only gets to the CROWN), so the bill's corner must be beside his head,
 *  not above it: stand him half a step to the side of the bill.
 *  Spread nod / headTilt / duck / stretch into the Pose, set armL or armR, feed bill.tilt / bill.dy to the bill */
export const reachBill = (f: number, f0: number, at: P2, side: 1 | -1 = 1, f1 = Infinity): ReachBill => {
  const t = f - f0, G: GestOpt = { ant: 3, move: 7, over: 0.05, settle: 4 }, k = f1 < Infinity ? gestureBack(f, f0, f1, G) : gesture(f, f0, G), kc = clamp(k, 0, 1);
  const held = t >= 9 && f < f1, tug = bump(f, f0 + 13, 3, 5) + bump(f, f0 + 24, 3, 5), rel = f - f1;
  const gz = sm((t + 6) / 5) * (f1 < Infinity ? 1 - sm((rel - 4) / 6) : 1);
  return { arm: { to: "hang", to2: [at[0], at[1] + 6], k, dy: 4 * tug, hand: held ? "pinch" : "open", hs: 1.4, front: true },
    gaze: gz, nod: -1.7 * gz, headTilt: -side * 3 * gz, browUp: [6 * gz, 6 * gz], duck: -0.1 * kc, stretch: 1 + 0.03 * kc,
    bill: { tilt: held ? side * (12 * sm((t - 9) / 3) + 7 * tug) : rel > 0 ? side * 10 * Math.exp(-rel / 9) * Math.cos((TAU * rel) / 11) : 0, dy: held ? 3 * tug : 0, held } };
};

// ---------------- THE PROFESSOR'S OFFICE BITS ----------------
export type ProfBitName = "pace" | "tapBoard" | "crossOut" | "crumpleToss" | "takeUni" | "idea";
export type ProfBitOpt = {
  /** the screen side the board / the bin / the unicycle is on (default +1 = screen right) */ side?: 1 | -1;
  /** tapBoard, crossOut: the board point; crumpleToss: the bin's rim centre (card units) */ aim?: P2;
  /** crossOut: draw the strokes on his card (default true; false when the set's board shows them) */ mark?: boolean;
  /** crumpleToss: draw a waste bin at aim (default false: the set has one) */ bin?: boolean;
  /** takeUni: pop a "!" over his head (default false) */ bang?: boolean };
export type FigBit = { pose: Partial<Pose>; props: (p: Pen, A: Anchors, P: Pose) => void; len: number;
  /** pace: metres walked toward screen right (move him along the lens's right vector by it; 0 for the other bits) */ travel: number };
/** frames each office bit takes */
export const PROF_BITS: Record<ProfBitName, number> = { pace: 78, tapBoard: 40, crossOut: 46, crumpleToss: 62, takeUni: 38, idea: 48 };
/** a small wire waste bin (rim centre c, 46 x 56 u) */
export const drawBin = (p: Pen, c: P2, u: number) => {
  const w = 23 * u, h = 56 * u, body: P2[] = [[c[0] - w, c[1]], [c[0] + w, c[1]], [c[0] + 0.78 * w, c[1] + h], [c[0] - 0.78 * w, c[1] + h]];
  p.poly(body, "#8f97ab", 2 * u); p.clip(body, () => { for (let i = -3; i <= 3; i++) p.stroke([[c[0] + i * 7 * u, c[1]], [c[0] + i * 5.6 * u, c[1] + h]], 1.1 * u, "#5d6478");
    for (const y of [0.3, 0.62]) p.stroke([[c[0] - w, c[1] + y * h], [c[0] + w, c[1] + y * h]], 1.1 * u, "#5d6478"); });
  p.poly(ell(c[0], c[1], w, 5 * u, 0, 20), "#3c4254", 1.8 * u);
};
/** HYMAN'S OFFICE BITS (S2-S4: the thinker must think in motion). Each is a pose patch + props on his card + its length:
 *    pace         (78 f) hands clasped behind his back, head down: two steps toward `side`, a turn through the front, two
 *                 steps back, a turn to the lens. Move him by `travel` metres along the lens's right vector
 *    tapBoard     (40 f) the arm goes up to the board point `aim` (within reach: beside his head), taps it twice (f0+10, f0+18: a pop each), eyes on it, turns back
 *    crossOut     (46 f) strikes an idea out: two crossing strokes at `aim` (the marks are drawn unless mark: false), a "no" head shake
 *    crumpleToss  (62 f) reads a sheet, crumples it (8 f), winds up, tosses it at the bin (`aim` = the rim): the ball flies
 *                 14 f, bounces on the rim, drops in; his eyes follow it; a small proud nod
 *    takeUni      (38 f) the TAKE on the unicycle, MOUTH SHUT (the student is talking): a blink + squash, then head back,
 *                 brows up, surprise lines, a lean back; then he leans in to peer at it
 *    idea         (48 f) thinks (chin, eyes up), then the LIGHT BULB pings over his head at f0+14: a hop, the index
 *                 finger shoots up, sparkles
 *  Use: const bit = PPL.profBit("idea", f, f0); fig(..., (p) => PPL.drawProfBit(p, P, bit)). Outside its frames the
 *  bit's pose is empty (your own pose shows) */
export const profBit = (name: ProfBitName, f: number, f0: number, o: ProfBitOpt = {}): FigBit => {
  const t = f - f0, side = o.side ?? 1, len = PROF_BITS[name], none = () => {};
  if (t < 0 || t > len) return { pose: {}, props: none, len, travel: 0 };
  const two = (act: Arm | null, other: Arm | null): Pick<Pose, "armL" | "armR"> => (side > 0 ? { armR: act, armL: other } : { armL: act, armR: other });
  const hi = side > 0 ? 1 : 0;                                                                  // Anchors.hands index of the acting hand
  switch (name) {
    case "pace": {
      const v = gaitSpeed("walk") / 30, goA = (x: number) => (x < 0 ? 0 : x < 5 ? sm(x / 5) : x < 24 ? 1 : x < 30 ? 1 - sm((x - 24) / 6) : 0);
      const goOf = (x: number) => goA(x) + goA(x - 38), dist = (x: number) => { let m = 0; for (let q = 0; q < x; q += 0.5) m += v * goOf(q + 0.25) * 0.5; return m; };
      const D1 = dist(30), d = dist(t), m = t < 38 ? Math.min(d, D1) : D1 - (d - D1);
      const hd = t < 30 ? 78 : t < 38 ? 78 * Math.cos((Math.PI * (t - 30)) / 8) : t < 68 ? -78 : -78 * (1 - eio((t - 68) / 10));
      const a = rad(side * hd), turning = (t >= 30 && t < 38) || t >= 68, upK = bump(t, 28, 5, 8);
      return { len, travel: side * m, props: none, pose: { s: Math.sin(a), c: Math.cos(a), walk: walkPhase(d), go: goOf(t), gait: "walk", expr: upK > 0.5 ? "puzzled" : "focusB", nod: 1.5 - 2 * upK, lookY: 0.55 - 0.9 * upK, look: 0,
        sq: turning && t < 38 ? 1 - 0.12 * Math.sin((Math.PI * (t - 30)) / 8) : 1, tilt: 0,
        armL: { to: "hip", dx: 9, dy: 2, front: false, hand: "none" }, armR: { to: "hip", dx: -9, dy: 2, front: false, hand: "none" } } };
    }
    case "tapBoard": {
      const aim: P2 = o.aim ?? [300 + side * 170, 330], k = gestureBack(f, f0 + 1, f0 + 27, { ant: 3, move: 6, over: 0.06, settle: 4 }), kc = clamp(k, 0, 1);
      const tap = bump(t, 9, 2, 3) + bump(t, 17, 2, 3), on = sm((t - 1) / 5) * (1 - sm((t - 26) / 6));
      return { len, travel: 0, pose: { ...two({ to: "hang", to2: aim, k, dx: side * (-9 + 9 * tap) * kc, hand: "point", hs: 1.25, front: true }, { to: "hip", front: false }),
          look: side * 0.95 * on, lookY: -0.25 * on, headTilt: side * 3 * on, tilt: side * 2.5 * on + side * 1.2 * tap, facing: on > 0.5 ? side : 0, expr: "focusB", nod: 0.5 * tap },
        props: (p, A) => { const h = A.hands[hi], tip: P2 = [h[0] + side * 24 * A.u, h[1] - 4 * A.u]; for (const ft of [f0 + 10, f0 + 18]) VFX.popBurst(p, f, ft, tip, { r: 13, u: A.u }); } };
    }
    case "crossOut": {
      const aim: P2 = o.aim ?? [300 + side * 182, 335], L = 20 * 2.4, k = gestureBack(f, f0, f0 + 32, { ant: 3, move: 6, over: 0.04, settle: 3 });
      const A1: P2 = [aim[0] - L, aim[1] - L], B1: P2 = [aim[0] + L, aim[1] + L], A2: P2 = [aim[0] + L, aim[1] - L], B2: P2 = [aim[0] - L, aim[1] + L];
      const s1 = eio((t - 6) / 7), s2 = eio((t - 18) / 7), mv = eio((t - 13) / 5), lp = (a: P2, b: P2, q: number): P2 => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
      const pt = t < 13 ? lp(A1, B1, s1) : t < 18 ? lp(B1, A2, mv) : lp(A2, B2, s2), shake = t > 27 ? 4.5 * Math.sin((TAU * (t - 27)) / 8) * Math.exp(-(t - 27) / 9) : 0, on = sm(t / 5) * (1 - sm((t - 28) / 5));
      return { len, travel: 0, pose: { ...two({ to: "hang", to2: pt, k, hand: "pinch", prop: { k: "pencil" }, hs: 1.2, front: true }, { to: "hip", front: false }),
          look: side * 0.9 * on, lookY: -0.2 * on, facing: on > 0.5 ? side : 0, tilt: side * 2.5 * on, headTilt: shake, expr: t > 26 ? "worriedB" : "focusB", mouth: t > 26 ? "vM" : undefined },
        props: (p, A) => { if (o.mark === false) return; const w = 5.2 * A.u, col = "#d9241c";
          if (t > 6) p.stroke([A1, lp(A1, B1, s1)], w, col); if (t > 18) p.stroke([A2, lp(A2, B2, s2)], w, col); } };
    }
    case "crumpleToss": {
      const aim: P2 = o.aim ?? [300 + side * 205, 841], cr = sm((t - 8) / 9), wind = bump(t, 18, 5, 3), thr = gesture(f, f0 + 23, { ant: 0, move: 4, over: 0.14, settle: 6 }), fly = clamp((t - 26) / 14, 0, 1), inK = clamp((t - 40) / 7, 0, 1);
      const both = t < 18, jit = cr > 0 && cr < 1 ? 2.2 * Math.sin(t * 2.6) : 0;
      const hold = (sd: number): Arm => ({ to: "chest", dx: sd * (15 - 11 * cr) + jit * sd, dy: 6 - 3 * cr, hand: cr > 0.2 ? "fist" : "grip", front: true, hs: 1.1 });
      const thrower: Arm = both ? hold(side) : { to: "raise", dy: -8 * wind, dx: -side * 6 * wind, fk: [100, 96], fkK: clamp(thr, -0.1, 1.2) * (1 - sm((t - 36) / 8)), to2: "hip", k: sm((t - 36) / 8), hand: t < 26 ? "fist" : t < 40 ? "open" : "ball", hs: 1.2, front: true, ang: side * 10 };
      const other: Arm = both ? hold(-side) : { to: "chest", to2: "hip", k: sm((t - 18) / 6), dx: -side * 4, hand: "ball", front: true };
      const watch = sm((t - 25) / 4), nodY = bump(t, 47, 4, 8);
      return { len, travel: 0, pose: { ...two(thrower, other), expr: t < 8 ? "focusB" : t < 26 ? "worriedB" : t < 46 ? "focusB" : "smugB", mouth: t >= 8 && t < 26 ? "vM" : undefined,
          lookY: t < 18 ? 0.75 : -0.2 + 0.85 * fly, look: side * 0.85 * watch, tilt: -side * 4 * wind + side * 4 * bump(t, 23, 3, 9), stretch: 1 + 0.04 * bump(t, 23, 3, 6) - 0.03 * wind, nod: (t < 18 ? 0.8 : 0) + 1.2 * nodY, headTilt: side * 2 * watch },
        props: (p, A) => { const u = A.u, [hl, hr] = A.hands, mid: P2 = [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 8 * u], hand = A.hands[hi];
          if (o.bin) drawBin(p, aim, u);
          const ball = (c: P2, rr: number, spin: number) => { const pts: P2[] = []; for (let i = 0; i < 11; i++) { const a2 = (TAU * i) / 11 + spin, q = rr * (0.82 + 0.3 * hash(i, 7)); pts.push([c[0] + q * Math.cos(a2), c[1] + q * Math.sin(a2)]); }
            p.poly(pts, "#fbfaf4", 1.7 * u); p.stroke([[c[0] - 0.5 * rr, c[1] - 0.2 * rr], [c[0] + 0.1 * rr, c[1] + 0.1 * rr], [c[0] + 0.5 * rr, c[1] - 0.3 * rr]], 1 * u, "#b9b2c8"); };
          if (t < 18) { // the sheet: a page that shrinks into a wrinkled ball between the hands
            const w = (22 - 13 * cr) * u, h = (29 - 19 * cr) * u;
            if (cr < 0.55) { p.poly(rotP(rrect(mid[0] - w, mid[1] - h, mid[0] + w, mid[1] + h, 2 * u), 4 * jit, mid), "#fbfaf4", 1.7 * u); for (let i = 0; i < 4; i++) p.stroke([[mid[0] - 0.7 * w, mid[1] - 0.6 * h + i * 0.36 * h], [mid[0] + 0.6 * w, mid[1] - 0.6 * h + i * 0.36 * h]], 1 * u, "#9aa3bd"); }
            else ball(mid, 14 * u, 0.4 * t);
          } else if (t < 26) ball([hand[0], hand[1] - 10 * u], 13 * u, 0.3 * t);
          else if (t < 40) { const s0: P2 = [hand[0] + side * 6 * u, hand[1] - 10 * u]; ball([s0[0] + (aim[0] - s0[0]) * fly, s0[1] + (aim[1] - 14 * u - s0[1]) * fly - 70 * u * 4 * fly * (1 - fly) * 0.5], 13 * u, 0.7 * t); }
          else if (t < 47) ball([aim[0] - side * 3 * u * (1 - inK), aim[1] - 14 * u - 16 * u * Math.sin(Math.PI * inK) + 22 * u * inK * inK], 13 * u * (1 - 0.25 * inK), 0.5 * t);
          VFX.popBurst(p, f, f0 + 40, [aim[0], aim[1] - 6 * u], { r: 14, u }); } };
    }
    case "takeUni": {
      const tk = takeAt(f, f0 + 2, 1.2), up = bump(t, 3, 5, 22), peer = sm((t - 22) / 8), bu = 9 * up + 3 * peer;
      return { len, travel: 0, pose: { stretch: tk.stretch, nod: tk.nod + 1.1 * peer, tilt: -side * 3.5 * up * (1 - peer) + side * 4.5 * peer, headTilt: side * 2 * peer, expr: t < 3 ? "focusB" : "bright", mouth: "vM",
          blink: t < 3 ? 0.7 : 0, look: side * 0.9, lookY: 0.35 + 0.2 * peer, face: { browUp: [bu, bu] } },
        props: (p, A) => { VFX.surpriseLines(p, f, f0 + 4, A.head, { u: A.u }); if (o.bang) VFX.bang(p, f, f0 + 5, [A.crown[0], A.crown[1] - 14 * A.u], { u: A.u }); } };
    }
    case "idea": {
      const got = t >= 14, hp = hopAt(f, f0 + 14, 0.07, 9), fin = gesture(f, f0 + 14, { ant: 2, move: 5, over: 0.15, settle: 8 }), bu = got ? 8 * (1 - 0.4 * sm((t - 26) / 14)) : 2;
      const think: Arm = { to: "hang", to2: "chin", k: gestureBack(f, f0 - 6, f0 + 13), dy: 1.6 * Math.sin(t / 2.2), hand: "ball", front: true };
      const point: Arm = { to: "hang", to2: "up", k: fin, hand: "point", hs: 1.25, front: true, ang: -side * 12 };
      return { len, travel: 0, pose: { ...two(got ? point : { to: "hip", front: false }, think), hop: hp.hop, stretch: hp.stretch, expr: got ? "thrillB" : "puzzled", look: got ? 0 : -side * 0.55, lookY: got ? -0.15 : -0.75,
          headTilt: got ? side * 2 : -side * 4, nod: got ? -0.6 : 0.3, face: { browUp: [bu, bu] } },
        props: (p, A) => { const c: P2 = [A.crown[0], A.crown[1] - 32 * A.u]; VFX.bulb(p, f, f0 + 14, c, { u: A.u, hold: 28 }); if (got) VFX.sparkles(p, f, c, { f0: f0 + 15, r: 44, n: 5, u: A.u }); } };
    }
  }
};
/** draw the professor with an office bit: merges the bit's pose into P, draws him, then the bit's props on his card */
export const drawProfBit = (p: Pen, P: Pose, bit: FigBit) => { const Q: Pose = { ...P, ...bit.pose, face: { ...(P.face ?? {}), ...(bit.pose.face ?? {}) } }; drawProf(p, Q); bit.props(p, anchors("prof", Q), Q); };

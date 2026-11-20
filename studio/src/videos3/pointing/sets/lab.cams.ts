// CAMERA + LAYOUT + TIMING of set 'lab' (owner LAB, second build 2026-11-19 night, script v3).
// The film uses the lab as ONE picture, twice: the two glass jars (shots s17 and s19, with the one-second cutaway s18
// between them). No lab dialogue, no researcher, no wide.
//
// THE STAGE. The room is world-axis-aligned; the low sun comes through the big window in the -X wall (rig interiorWarm,
// shot rigOpts sunAz 95 / sunEl 25). The table, the two jar stations, the volunteer and the lens sit on a STAGE turned
// LAB.yaw (52 deg) inside the room, so at the end of the move the sun is a three-quarter BACKLIGHT from the left (about
// 43 deg off the lens axis: the house golden look; glass shows best that way) and neither jar stands in the other
// one's ball shadow. Stage frame (S2W below): x = to the right of the final lens, y = up, z = toward the final lens,
// origin = the floor point under the middle of the jar pair. The EYE jar is on the left (x < 0), the FINGER jar on the
// right.
//
// THE MOVE (one framing family, used twice; DIRECTOR requests L-1 + CAM-1: a calm real move, each shot >= 0.52 %/frame,
// never under 0.15, peak far under 4.2). Each shot is one slow arc round the jar pair that ENDS SQUARE on the jars,
// with a slow push-in (a dolly + a little zoom). s17, the EYE half, comes round from the LEFT (the EYE jar is the near
// one); s19, the FINGER half, comes round from the RIGHT (the FINGER jar is the near one). Both land on the same
// square two-jar picture: at the cutaway (six balls against an empty jar) and at the hold (six against one). The arc
// is what the speed gate measures (the room slides behind the jars) and it tells the story: the volunteer sits on the
// axis behind the pair, so in s17 she comes in from the left and slides behind the EYE jar while she only looks and
// presses, and in s19 she comes in from the right and is seen THROUGH the FINGER jar while she points and calls; at
// the end of both she sits in the gap between the jars.
//
// THE FRAME (1080 x 1920, at the end of each move): pictogram plates 12-24 % from the top, jars 26-58 %, the TRIES
// bars 59-65 % (the caption band 67-75 % is below them, on the sunlit table top), each jar ~26 % of the frame width,
// both bars inside 12-88 %. At the start of each move the same things are about a quarter smaller and all in frame.
//
// TIMES: nothing here is a typed film second. Everything hangs on the film's clock (../timeline.ts: the cuts of s17 /
// s19, the narrator's words, the melody's start), so the lab re-times itself when the real voice lands. The knobs that
// are left are in LAB_CUES ("HOW TO RE-TIME").
// NOTE: no import of ../cast or ../shots here (timeline.ts imports only words.ts + plan_words.ts: no cycle).
import type { CamState, V3 } from "../../../kit/core/ctx";
import { withShake } from "../../../kit/core/camera";
import type { ShotCam } from "../camkit";
import { FRAMES, S, EV, cutS, cutE } from "../timeline";

export const LAB = {
  /** the stage origin (world) and its yaw: the final lens looks along world (-sin yaw, 0, -cos yaw) */
  origin: [0.4, 0, 0.0] as V3, yaw: (52 * Math.PI) / 180,
  /** the room (world): min corner, size; the window wall is x = x0 */
  room: { x0: -2.6, z0: -3.6, w: 6.0, d: 7.0, h: 3.0 },
  /** the window in the -X wall (world z range, sill, height): its sun crosses the table; out of frame on the left,
   *  but for its jamb, which shows at the left edge in the first second of s19 */
  window: { z0: -0.2, z1: 2.55, sill: 0.9, h: 1.95 },
  /** a second window in the +Z wall behind the lens (world x range): no sun through it; it is the tall soft highlight
   *  in the left half of each jar and the daylight on the fronts */
  window2: { x0: -2.1, x1: 0.1 },
  /** stage: the work table (centred on x; its centre is zc toward the lens, so the jars stand near its far edge) */
  table: { w: 1.5, d: 1.5, h: 0.75, zc: 0.47 },       // deep: its near edge stays under the lens (the wide starts showed the floor)
  /** stage: the two stations (plinth + jar + pictogram plate), centres at x = -gap/2 (EYE) and +gap/2 (FINGER) */
  jar: { gap: 0.232, r: 0.075, h: 0.32 }, plinth: { w: 0.19, h: 0.06, d: 0.19 }, ballR: 0.036,
  /** stage: the volunteer on her stool (on the axis behind the pair, see THE MOVE), her small desk, the light-and-button box */
  volunteer: { x: -0.05, z: -2.62, seat: 0.4 }, desk: { dz: 0.42, w: 1.1, d: 0.6, h: 0.74 }, box: { dz: 0.48 },
};
/** stage -> world */
export const S2W = (x: number, y: number, z: number): V3 => {
  const c = Math.cos(LAB.yaw), s = Math.sin(LAB.yaw);
  return [LAB.origin[0] + x * c + z * s, LAB.origin[1] + y, LAB.origin[2] - x * s + z * c];
};

// ============================================================================================================
// HOW TO RE-TIME THE LAB (balls, bars, her presses, her call, the bubble)
//  Nothing to do when the voice lands: every time below comes from ../timeline.ts.
//   - use A = shot s17, use B = shot s19 (their cuts are rules on the words "tested", "looking", "when", "one");
//   - the six tinks of the EYE jar sit ON THE MELODY'S PULSES (EV.melody0 + k * pulse), the SIXTH on the first pulse
//     inside "looking..." (never later than `seenBeforeCut` before the cut to s18), the five before it one pulse apart;
//   - her fast run of presses (about three for each ball) fills the EYE bar from just after the cut to the sixth tink;
//   - her arm is straight on "pointed", the snap (and her speech bubble) on "loud";
//   - the single ball's tink = the first pulse inside "one" (the hold after it is the script's 0.41 s: the cut to s20);
//   - the FINGER bar fills to the same end mark between the cut and half a second before that tink.
//  The knobs: LAB_CUES. `pulse` must equal the melody's real pulse (today 12 pulses per 5.5 s phrase, the same number
//  as the caption layer's music note; SOUND publishes the real note times -> change it here and in Captions.tsx).
//  `eyeImpacts` / `fingerImpact` (film seconds) override everything, e.g. to follow the mixed track's own tinks.
//  The set logs the resolved plan once per render tab ("lab plan {...}"): its `tinks` are the SOUND cues.
export const LAB_CUES = {
  /** the melody's pulse (s) and how late a word's pulse may fall before its tink is no longer "on" the word */
  pulse: 5.5 / 12, onWord: 0.1,
  /** a tink must be on screen at least this long before the cut that ends its shot (s) */
  seenBeforeCut: 0.25,
  /** her run of presses: first press after the cut (s), last press before the sixth tink (s), how many */
  pressLead: 0.12, pressTail: 0.04, pressN: 18,
  /** the FINGER bar: starts after the cut (s), is full this long before the single tink (s) */
  fillLead: 0.2, fillTail: 0.5,
  eyeImpacts: null as number[] | null, fingerImpact: null as number | null,
};
export type LabPlan = { tA: number; durA: number; tB: number; durB: number; eyeImpacts: number[]; fingerImpact: number; presses: number[]; fillB: [number, number];
  callName: number; callStatus: number; source: string };
/** the first melody pulse that falls ON a word (not earlier than `onWord` before its start), kept `seen` before `cut` */
const pulseOn = (wordStart: number, cut: number) => {
  const C = LAB_CUES, k = Math.ceil((wordStart - C.onWord - EV.melody0) / C.pulse);
  let t = EV.melody0 + k * C.pulse;
  while (t > cut - C.seenBeforeCut) t -= C.pulse;
  return t;
};
/** the lab's events in FILM seconds, from the film's clock */
export const labPlan = (): LabPlan => {
  const C = LAB_CUES, tA = cutS("s17"), tB = cutS("s19"), durA = cutE("s17") - tA, durB = cutE("s19") - tB;
  const sixth = pulseOn(S("looking"), tA + durA);
  let eyeImpacts = C.eyeImpacts ?? Array.from({ length: 6 }, (_, k) => sixth - (5 - k) * C.pulse);
  // a very short take: never a tink before the picture is up (the pulse spacing gives way, the sixth stays)
  if (!C.eyeImpacts && eyeImpacts[0] < tA + 0.3) { const step = (sixth - (tA + 0.3)) / 5; eyeImpacts = eyeImpacts.map((_, k) => sixth - (5 - k) * step); }
  const fingerImpact = C.fingerImpact ?? pulseOn(S("one"), tB + durB);
  const p0 = tA + C.pressLead, p1 = eyeImpacts[5] - C.pressTail;
  const presses = Array.from({ length: C.pressN }, (_, k) => p0 + ((p1 - p0) * k) / (C.pressN - 1));
  const fillB: [number, number] = [tB + C.fillLead, Math.max(tB + C.fillLead + 0.8, fingerImpact - C.fillTail)];
  return { tA, durA, tB, durB, eyeImpacts, fingerImpact, presses, fillB, callName: S("pointed"), callStatus: S("loud"), source: "timeline.ts" };
};

// ---------------------------------------------------------------- the camera: one framing family, an arc per use
/** each shot's move: an arc of `arc` degrees round the jar pair that ends square (use A from the left, use B from the
 *  right), the distance, the lens height and the field of view from the first frame to the last. Measured with CORE's
 *  camSpeedStats on the script's plan (director's probe): s17 0.59 %/frame (min 0.56), s19 0.60 (min 0.56), peak
 *  0.64. About 0.025 %/frame per degree of arc: do not go under 18 degrees if the 0.52 floor must hold. */
/** Block 14 (the gate measures the PICTURE, not the lens): the arc alone hardly moved the picture (the jars stay
 *  central, the wall behind is plain), so the on-screen camera read 0.26 / 0.35 %/f. Now: a wider arc in s17 (`arcA`; the
 *  room behind slides past fast enough to read as parallax), a longer push-in (r 1.58 -> 1.22: the picture grows ~1.5x
 *  per shot) and a small drift of the aim (`drift`, stage m at the first frame, toward the side the lens comes from = toward her: the jar pair travels
 *  into the centre) */
export const LAB_MOVE = { arc: 20, arcA: 30, r: [1.4, 1.22], h: [1.13, 1.07], fov: [62, 46], lookY: [0.9, 0.887], fnum: 4.5, shake: 0.06, drift: [0, -0.03], driftA: -0.16, fovB: [66, 46],
  /** use B (s19) starts LOW and cranes up to the same end pose: with the lens near the jars' rim height, her head (on
   *  the axis 2.6 m behind) is seen under the FINGER plate, through the empty jar's glass, while she points and calls;
   *  the rise is held back (`riseQ`: smoothstep from q0 to q1) so it happens after the snap */
  hB: [0.98, 1.07], lookYB: [0.93, 0.887], riseQ: [0.42, 1.0] };
/** the lens at q = 0..1 through one use (`side` -1 = from the left, +1 = from the right), u = seconds into the shot
 *  (the handheld clock). Linear: a steady, calm speed from the cut in to the cut out; nothing eases to a stop. */
export const jarsLens = (q: number, side: -1 | 1, u: number): CamState => {
  const M = LAB_MOVE, k = Math.max(0, Math.min(1, q)), mix = (v: number[]) => v[0] + (v[1] - v[0]) * k;
  const a = (side * (side < 0 ? M.arcA : M.arc) * (1 - k) * Math.PI) / 180, r = mix(M.r), dk = 1 - k;
  // use B: the crane-up (held low through her call), use A: the plain linear descent
  const kr = side > 0 ? (() => { const x = Math.max(0, Math.min(1, (k - M.riseQ[0]) / (M.riseQ[1] - M.riseQ[0]))); return x * x * (3 - 2 * x); })() : k;
  const h = side > 0 ? M.hB[0] + (M.hB[1] - M.hB[0]) * kr : mix(M.h), lookY = side > 0 ? M.lookYB[0] + (M.lookYB[1] - M.lookYB[0]) * kr : mix(M.lookY);
  const c = withShake({ pos: S2W(Math.sin(a) * r, h, Math.cos(a) * r), look: S2W((side < 0 ? side * M.driftA : side * M.drift[0]) * dk, lookY + M.drift[1] * dk, 0), fov: side > 0 ? M.fovB[0] + (M.fovB[1] - M.fovB[0]) * k : mix(M.fov) }, u, M.shake, side < 0 ? 23 : 29);
  c.focus = Math.hypot(r, h - 0.97); c.fnum = M.fnum;
  return c;
};
/** the camera of a lab shot: a shot that starts at or after s19's cut is use B, any earlier one is use A; the move
 *  runs over the film's s17 / s19 frames (a bench shot outside them holds the nearer end pose) */
const jars: ShotCam = (from) => (t) => {
  const isB = from >= FRAMES.s19[0], id = isB ? "s19" : "s17", t0 = cutS(id), d = Math.max(0.1, cutE(id) - t0);
  return jarsLens((t - t0) / d, isB ? 1 : -1, Math.max(0, t - t0));
};
/** shot id -> the one framing: the director's film looks up "v3_<id>" in this table (cams.ts ownerCamV3), then the
 *  plain id */
export const CAMS_lab: Record<string, ShotCam> = { v3_s17: jars, v3_s19: jars, s17: jars, s19: jars };
export const MARKS_lab: Record<string, V3> = { v3_s17: S2W(0, 0, 0), v3_s19: S2W(0, 0, 0), s17: S2W(0, 0, 0), s19: S2W(0, 0, 0) };

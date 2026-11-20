// CONTRACT for "The Clown Nobody Saw" (clown). Two sets: the campus square + Hyman's office (LOOK v2). Every module reads
// its anchors from here, so the sets (sets_square.ts + square_*.ts, office.ts), the cast (cast.ts -> cast_quiz.ts /
// cast_story1.ts / cast_story2.ts), the cameras (cams_v2.ts) and the sound (timeline.json) agree on where things are and when.
// REBUILD v2: the quiz + story marks (COUNT, DUCKS, PHONES, clownQ, STUDY, STORY) are EDIT's; SQ / OFFICE are the sets'.
// Units: metres, y up, ground = 0. x = screen right in the OPENING framing, z = toward the opening camera (the opening
// camera sits at z +17 and looks along -z, so "far" = -z = north). Plain-text signs only, no logos, no real marks.
//
// WHY THE OPENING LENS IS LOW (1.25 m): the three bills must sit on CLEAN SKY, so they must hang ABOVE the lens; and the
// walkers must DUCK under the lowest one, so it must hang BELOW a head (cartoon adult: top 1.66 m). Lens at 1.25 m, the
// lowest bill's bottom edge at 1.47 m, the branch climbing steeply to the trunk: both hold. All standing heads sit on
// one line just above the horizon (y ~620-700 at 1080x1920), far above the caption band.
import { BEAT, TOTAL, SHOTS, hasLine } from "./beats";

export type V3 = [number, number, number];
export const FPS = 30;

// ---------------- light states (lights.ts merges look_square.ts; every name must exist there) ----------------
export type LightName =
  | "sq_day"    // the square on a sunny spring afternoon: warm key from the south-east, soft blue shade
  | "sq_call"   // the same light a little drained (shot 6: "your mind takes the call")
  | "office"    // (LOOK v2) Hyman's office: warm afternoon sun through the west window, soft plum-warm shade
  | "of_warm"   // (LOOK v2) the same light as "office" (an alias: both names work)
  | "sq_warm"   // (LOOK v2) the square an hour later (S6 relight): the sun a little lower and warmer
  | "sq_slow"   // (LOOK v2) the square for the slow-motion duck (S20): the day light a little cooler and softer
  ;
export type SetName = "square" | "office";

/** ONE world sun for every shot (direction TOWARD the sun): a spring-afternoon sun in the south-south-west, behind and
 *  a little left of the opening lens, 39 deg up. Shadows fall away from the opening lens, a little to screen right.
 *  Lenses that look north or east see lit faces; NO shot looks south (it would be backlit, and there is no south side). */
export const SUN: V3 = [-0.25, 0.62, 0.74];

// ---------------- THE SQUARE ----------------
export const SQ = {
  base: [0, 0, 0] as V3,
  /** the brick plaza (herringbone). West edge: a 2.2 m hedge + leafy trees for z > -9 (the background of the money
   *  close-up), a low wall with the open view (bay, far hills, clean sky) north of that. North: the LIBRARY (x > 1) with
   *  the CLOCK tower; east: the ARTS building (its west face at x 11). The south side is never seen. */
  plaza: { x0: -6.5, x1: 11, z0: -38, z1: 24 },
  /** THE SCULPTURE: a dark-blue cube (edge 1.8 m) standing on a corner, round cut-outs, resting on three brick piers
   *  (tops 1.55 m, on a circle of r 1.47 m). Its top is at ~3.7 m. Nothing may enter r < 1.85 m. */
  sculpture: { c: [2.0, 0, -6.4] as V3, edge: 1.8, pierR: 1.47, pierTop: 1.55, top: 3.72 },
  /** THE CLOWN'S LAP: a circle round the sculpture on the pale stone ring (CHAR: use lapPos / lapAngle below) */
  lap: { c: [2.0, 0, -6.4] as V3, r: 2.3 },
  /** THE TREE (left edge of the opening frame): trunk foot; the canopy is above 3 m, west and north of the trunk */
  tree: { trunk: [-2.55, 0, 5.9] as V3, r: 0.24 },
  /** THE BRANCH: its centre line from the trunk down to the tip over the path (radius 0.07 -> 0.025 m). It lies in the
   *  plane z ~ 5.5, so it crosses the path at right angles; walkers pass UNDER it along z. */
  branch: [[-2.5, 3.15, 5.85], [-2.22, 2.86, 5.62], [-1.98, 2.68, 5.5], [-1.36, 2.26, 5.5], [-0.74, 1.84, 5.5], [-0.45, 1.62, 5.38]] as V3[],
  /** THE THREE $1 BILLS: `peg` = the top-centre of the bill (where the wooden peg grips it), `yaw` = the way its face
   *  turns (0 = faces +z, the opening lens; they are turned a little toward +x, so the branch angle of shots 7-9 sees
   *  their faces too). Size w x h metres (cartoon scale: a bill is about one head wide). Bottom
   *  edges at 2.31 / 1.89 / 1.47 m. Bill 2 (index 2) is the LOWEST: people duck under it. They sway: use billSway(). */
  bill: { w: 0.56, h: 0.25 },
  bills: [
    { peg: [-1.98, 2.56, 5.5] as V3, yaw: 0.27 },
    { peg: [-1.36, 2.14, 5.5] as V3, yaw: 0.19 },
    { peg: [-0.74, 1.72, 5.5] as V3, yaw: 0.25 },
  ],
  /** THE TWO DUCK POINTS under the branch (feet). A = under the lowest bill (clearance 1.47 m: a 0.25-0.3 m dip),
   *  B = a step to the right, under the lowest bill's right half and the leafy tip (the same clearance). Both are crossed along z; a head must be below clearance(x) for
   *  |z - 5.5| < 0.4 m. */
  duck: { A: [-0.74, 0, 5.5] as V3, B: [-0.52, 0, 5.47] as V3 },
  /** THE PATH (the diagonal walkway; a band of cream-edged paving, 2.2 m wide): enters lower-left of the opening frame,
   *  passes under the branch at the duck point, swings left round the clown's lap and runs to the study corner. */
  path: [[-2.4, 0, 11.5], [-0.74, 0, 5.5], [-1.9, 0, 0.5], [-1.5, 0, -6.4], [-0.6, 0, -11.5], [2.6, 0, -16.0], [3.6, 0, -25.0]] as V3[],
  /** THE PROFESSOR'S SPOT during the opening (by the sculpture, just outside the lap, facing the path / the lens) */
  professor: [-0.5, 0, -2.6] as V3,
  /** THE STUDY CORNER: where the cross-path leaves the square, just OUTSIDE the right edge of the opening frame (near
   *  side, so shots 2 / 3 / 5 look north / east into the light with the clown small behind, and the tree stays out of
   *  frame). The folding table (top 0.74 m, 1.5 x 0.6 m; its "PSYCH STUDY" sign faces +z), the interviewers' marks,
   *  where a stopped walker stands. Shots 2 / 3: the lens is at [4.0, 1.35, 16.4] looking north, the group in the
   *  middle, the sculpture + the clown left behind them, the sign board over their heads. */
  study: {
    table: [4.3, 0, 8.6] as V3, tableYaw: 0,
    /** the standing sign board over the table (its centre; 1.0 x 0.4 m, faces +z): readable above people's heads */
    sign: [4.3, 2.12, 8.42] as V3,
    interviewers: [[4.85, 0, 10.9], [5.25, 0, 9.3]] as V3[],  // [0] steps up to the people leaving (in from frame right), [1] minds the table
    stop: [4.2, 0, 10.5] as V3,                 // the person being asked (shots 2, 3)
    pair: [[4.45, 0, 10.5], [3.85, 0, 10.3]] as V3[],        // the pair of friends (shots 2, 3)
    music: [3.4, 0, 10.25] as V3,               // the music listener bops up here (shot 3, second half; screen left of the pair)
  },
  /** THE HERO'S MARKS (shots 4-8) */
  hero: {
    /** shot 4 (tracking beside her, lens on the west side looking east): she walks north on the path beside the lap */
    s4: { from: [-1.82, 0, -1.6] as V3, to: [-1.2, 0, -8.8] as V3 },
    /** shot 5 (the turn-around at the study corner, staged in depth for the lens at [0.6, 1.3, 13.6]): the asker
     *  left-front, she in the middle, the clown 2 m behind her to the right-back */
    s5: { at: [4.89, 0, 10.19] as V3, asker: [3.85, 0, 10.32] as V3, clown: [6.82, 0, 9.73] as V3 },
    /** shot 6 (lens ahead of her, tracking backward): she walks SOUTH on the path toward the branch */
    s6: { from: [-1.66, 0, -4.0] as V3, to: [-1.88, 0, 0.3] as V3 },
    /** shot 8 (slow motion): she passes under the lowest bill at the duck point A, walking toward +z */
    s8: { from: [-0.98, 0, 4.45] as V3, to: [-0.52, 0, 6.4] as V3 },
  },
  /** shot 7: the person who stops and reads the note on bill 1 (the middle bill) stands here, looking up */
  reader: [-1.3, 0, 5.05] as V3,
  /** shot 7 (first beat): the professor clips the lowest bill from here: he stands behind it (north-west), facing the
   *  lens (which is south-east at [1.03, 1.2, 7.4]); the bill hangs over his brow, his eyes and smile show under it;
   *  his hands go up to the peg of bills[2] */
  clipper: [-1.25, 0, 4.95] as V3,
  /** the fountain (far back, centre-left) and the facade clock (on the library's clock tower, faces +z) */
  fountain: { c: [-3.4, 0, -22.5] as V3, r: 2.1 },
  clock: { c: [4.5, 8.6, -37.38] as V3, r: 1.2 },
  /** the banner lamp post at the right edge of the opening frame, and the channel's crow hidden on its arm */
  lamp: [2.4, 0, 4.4] as V3,
  crow: [1.98, 3.72, 4.4] as V3,
};

/** the puffy clouds round the square [x, y, z, width m] (world.ts; they drift a little, loop-safe). Placed so that the
 *  sky BEHIND THE BILLS in the opening framing stays clean: nothing in the wedge x / D -0.2 .. -0.04 below 9 deg. */
export const CLOUDS: [number, number, number, number][] = [
  [-18, 158, -640, 150], [200, 118, -620, 190], [330, 165, -540, 180], [-330, 300, -250, 200], [-600, 150, 120, 210],
  [620, 132, -60, 200], [600, 172, 230, 170], [100, 200, 640, 200],
];

// ---------------- THE LOOP CLOCK (binding for everything that moves in the set, and for CHAR) ----------------
/** the loop period in frames (= the film length): the state at frame TOTAL must equal the state at frame 0 */
export const LOOP = TOTAL;
/** frames since `enter` on the loop clock, 0..LOOP: a walker that enters at frame TOTAL - 90 is 90 f into the walk
 *  at frame 0 (so shot 9's walkers continue into shot 1) */
export const loopT = (f: number, enter = 0) => (((f - enter) % LOOP) + LOOP) % LOOP;
/** a phase with a WHOLE number of cycles over the loop: sin(loopPh(f, n) + ph) is the same at frame 0 and frame TOTAL */
export const loopPh = (f: number, n: number) => (2 * Math.PI * Math.max(1, Math.round(n)) * f) / LOOP;

// ---------------- THE BILLS' SWAY (the set and CHAR pose them from this one function) ----------------
/** the sway of bill i at VIDEO frame vf: `swing` = rotation about the peg's grip line (rad, + = the bottom edge toward
 *  the lens), `twist` = extra yaw (rad). Loop-safe. The slow-motion duck (shot 8) is CHAR's: the set adds a brush kick
 *  only where plan.billKick says so (none by default). */
export const billSway = (i: number, vf: number) => ({
  swing: 0.16 * Math.sin(loopPh(vf, 23 + 3 * i) + 1.3 * i) + 0.05 * Math.sin(loopPh(vf, 61 + 5 * i) + 2.1 * i),
  twist: 0.09 * Math.sin(loopPh(vf, 17 + 2 * i) + 0.7 + 2.3 * i) + 0.035 * Math.sin(loopPh(vf, 47 + 3 * i) + i),
});
/** the centre of bill i at rest (world) */
export const billCentre = (i: number): V3 => { const p = SQ.bills[i].peg; return [p[0], p[1] - SQ.bill.h / 2, p[2]]; };
/** the lowest thing over the path at world x on the branch line (bill bottoms, else the branch's leafy underside) */
export const clearance = (x: number) => {
  for (const b of SQ.bills) if (Math.abs(x - b.peg[0]) < SQ.bill.w / 2 + 0.05) return b.peg[1] - SQ.bill.h;
  const P = SQ.branch;
  for (let k = 0; k + 1 < P.length; k++) if (x >= P[k][0] && x <= P[k + 1][0]) { const u = (x - P[k][0]) / (P[k + 1][0] - P[k][0]); return P[k][1] + (P[k + 1][1] - P[k][1]) * u - 0.1; }
  return 9;
};

// ---------------- WALKER LANES (polylines on the ground; walk them with laneAt) ----------------
/** A = the path, near -> far (enters lower-left of the opening frame, DUCKS at SQ.duck.A after 6.2 m, swings left round
 *      the lap, runs on north to the library steps).
 *  B = the path, far -> near, a pace to the right of A (DUCKS at SQ.duck.B, leaves lower-left).
 *  C = the cross-path IN: enters at the RIGHT edge of the opening frame in the middle distance (from the study corner
 *      side), crosses in front of the lap to the path and follows it north (never under the branch).
 *  E = the way OUT ("people leaving"): south on the path beside the lap, then right along the cross-path, out of the
 *      opening frame at its right edge and on to the study corner.
 *  D = a far cross-walk behind the sculpture, right -> left (small figures: music listeners / the loner). */
export const LANES: Record<"A" | "B" | "C" | "D" | "E", V3[]> = {
  A: [[-2.4, 0, 11.5], [-0.74, 0, 5.5], [-1.9, 0, 0.5], [-1.5, 0, -6.4], [-0.6, 0, -11.5], [2.6, 0, -16.0], [3.6, 0, -25.0]],
  B: [[4.4, 0, -24.6], [3.3, 0, -15.6], [0.1, 0, -11.1], [-0.75, 0, -6.4], [-1.15, 0, 0.6], [-0.52, 0, 5.47], [-1.9, 0, 11.6]],
  C: [[4.3, 0, 3.3], [1.3, 0, 2.1], [-1.1, 0, 0.5], [-1.5, 0, -6.4], [-0.6, 0, -11.5], [2.6, 0, -16.0], [3.6, 0, -25.0]],
  D: [[10.4, 0, -12.2], [1.5, 0, -13.2], [-5.9, 0, -15.0]],
  E: [[-0.9, 0, -11.0], [-0.75, 0, -6.4], [-1.0, 0, 0.9], [1.4, 0, 2.6], [3.6, 0, 3.9], [4.3, 0, 9.4]],
};
export const laneLen = (pts: V3[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[2] - pts[i][2]), 0);
/** the point `s` metres along a lane (clamped) and the heading there (atan2(x, z) of travel, corners eased over 1.2 m) */
export const laneAt = (pts: V3[], s: number): { p: V3; heading: number } => {
  const seg = (q: number) => {
    let d = Math.max(0, q);
    for (let i = 0; i + 1 < pts.length; i++) {
      const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]);
      if (d <= L || i + 2 === pts.length) { const u = Math.min(1, d / L); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, 0, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * u] as V3; }
      d -= L;
    }
    return pts[pts.length - 1];
  };
  const a = seg(s - 0.6), b = seg(s + 0.6), m = seg(s);
  const p: V3 = [(a[0] + 2 * m[0] + b[0]) / 4, 0, (a[2] + 2 * m[2] + b[2]) / 4];
  return { p, heading: Math.atan2(b[0] - a[0], b[2] - a[2]) };
};
/** metres from the start of lane A / B to its duck point */
export const DUCK_S = { A: Math.hypot(SQ.duck.A[0] - LANES.A[0][0], SQ.duck.A[2] - LANES.A[0][2]),
  B: laneLen(LANES.B.slice(0, 6)) };

// ================================================================================================================
// REBUILD v2 (owner EDIT; BUILD_PLAN_v2.md): THE QUIZ (Q1-Q3, replayed by E1-E3 through remap.ts) + the STORY's marks.
// Cameras (cams_v2.ts) are built round these anchors; the three stage modules stage TO them. Times are BEAT words (or
// fractions of the count window), never literal frames. EDIT_V2.md has the screen spots for every shot.
// ================================================================================================================

// ---------------- THE COUNT (Q1): times ----------------
/** the count window: from the end of "Count the people on a phone." to "How many?" */
export const COUNT = { a: BEAT.jobEnd, b: BEAT.howMany };
/** a frame at fraction u of the count window */
export const cw = (u: number) => Math.round(COUNT.a + (COUNT.b - COUNT.a) * u);
/** walking pace (m per frame): 1.25 m/s; phone talkers walk slower and weave (Hyman 2010): use PACE_PHONE */
export const PACE = 1.25 / FPS;
export const PACE_PHONE = 0.95 / FPS;
/** THE TWO DUCKS (BUILD_PLAN_v2: at about 1/3 and 2/3 of the count). `t` = the frame the ducking head is LOWEST, exactly
 *  under the LOWEST bill (bills[2], bottom edge 1.47 m; the head dips to ~1.32 m); `who` = the PHONES index of the
 *  ducker; `at` = the feet then; `dir` = +1 walking toward the lens (south, +z), -1 away. While each duck happens the clown
 *  performs his gag on the RIGHT half of the frame (`gag`, at the clown route's key of that frame), so the eye is there.
 *  In Q1's camera at `t` the bill sits over the head (EDIT_V2.md: both in the upper half, whole, on clean sky). */
export const DUCKS = [
  /* ANIMATOR A: both duckers come TOWARD the lens from behind the branch (the bill stays drawn over them until they dip,
     their eyes forward and open to the lens for E3's freeze) and leave the bill's column while still low (ducker 1 back to
     the left, ducker 2 to the right), so no head covers a bill for more than a few frames; the head tops pass 5-11 px
     under bill 2's bottom edge (cast_quiz_plan.ts DUCK_OPT; out/clown/anim_quiz/duckcheck.mjs) */
  { t: cw(0.33), who: 2, at: [-0.85, 0, 5.5] as V3, dir: 1, gag: "wobble-save on the loop's far side: he nearly falls off, windmills both arms, saves it" },
  { t: cw(0.69), who: 3, at: [-0.5, 0, 5.47] as V3, dir: 1, gag: "on the loop's far end, riding east: he honks to SCREEN RIGHT at the re-landed pigeons; they flush up and away to the right" },
];
export const DUCK_F = DUCKS.map((d) => d.t);
export const MID_F = cw(1 / 2);
/** "Don't lose count.": the clown nearly rides into a pigeon flock (life, no hint): the flock sits here and flushes from
 *  BEAT.dontLose - 4 (a missing line falls back to the count's middle) */
export const PIGEON_F = hasLine("dontLose") ? BEAT.dontLose - 4 : cw(0.45);
/** (set below from the clown's route: 0.8 m ahead of him at PIGEON_F) */
export const PIGEON_FLOCK: V3 = [0, 0, 0];
/** THE FIVE PHONE PEOPLE, in count order (exactly five people hold a phone to the ear; nobody else holds anything near an
 *  ear; bright phones drawn in FRONT of the head). `t` = their most visible moment (E1's replay holds each one there, a
 *  number popping 1-5 over the head: see story.ts e1Pop); `at` = their feet at `t` (staged so the head sits at the screen
 *  spot EDIT_V2.md lists, never overlapping another phone person, never covering the bills); `phone` = phone colour;
 *  `lane` = a suggested route (LANES; the animator may bend it but must pass `at` at `t`); countable (whole figure + phone
 *  clear, >= 1.5 s) inside the count window. No. 0 is the frame-0 phone guy the clown honks at. */
export const PHONES = [
  /* ANIMATOR A: t moved so each E1 hold shows its person clear of the bills (LOOK flagged pop 2 beside the bills) and in
     count order; `at` = the feet on cast_quiz_plan.ts's routes at t (that module re-syncs them at load for any voice) */
  /* ANIMATOR A: count order = the order of the E1 holds: red, white, sky-blue (ducker 2), yellow (the hero), pink */
  /* EDIT p3 (FIX2 D2): t re-picked from the CURRENT staging with `node out/clown/v2/e1_pick.mjs` (whole figure inside
     x 60-888, nobody nearer over their head, front to the lens, upright = outside their own duck, the head not over a
     bill): the red phone guy at half the instruction (at cw(0.1) he stood at x 773-963, in the button column), the white
     one front-on before his duck, the sky-blue one front-on before hers (after it she is at x 710-890 under the clock
     tower: no room for her number), the hero and the pink one near the end of the count.
     Re-run the picker after any re-staging of the five and put its fractions here (they must increase).
     ANIMATOR A p3 (FIX2 part 1): the five re-staged (count order red, LIME, pink, sky-blue, yellow); the fractions below are
     the picker's on that staging (03:05). The lime, pink and yellow ones stand under the upper bills' columns, so no
     170 px badge fits straight above their heads there (the picker's headroom = false for those three).
     ANIMATOR A p3 part 2: count order red, PINK, LIME, sky-blue, yellow; t = the frames at which cast_quiz_pops.ts finds the
     cleanest badge spot (`node out/clown/anim_quiz/p3/pops.mjs`): the lime ducker is held after his duck (the pink one has
     left: clean space beside his head), the hero late (clean space beside her head). The pink one has no clean spot at
     any frame (the lime ducker stands or ducks right beside her; bills above): hers is the least covered one. */
  { t: Math.round(0.95 * COUNT.a), at: [0.3, 0, 7.95] as V3, phone: "#e8382f", lane: "frame-0 guy (red): on the clown's screen-left on frame 0 (the horn honks beside his head), strolls to his spot between the branch tip and the clown's lane, chats facing the lens until 20 % of the count, walks off right", note: "ANIMATOR A p3: the clown never crosses him" },
  { t: cw(0.248), at: [-1.6, 0, 6.7] as V3, phone: "#ff7fb8",   /* ANIMATOR A p4 (AUDIT_edit R6): held at 124, before the lime ducker dips beside her; her badge sits right on her head */  lane: "pink: comes out from behind the tree trunk during the instruction, stands chatting front-on at mid depth on the left (plain at phone size) to f 152 (p4), then walks off LEFT toward the lens corner (no back view)", note: "ANIMATOR A p3: mid depth, in front of the branch line, under no bill" },

  { t: cw(0.5), at: [-1.22, 0, 4.6] as V3, phone: "#a6e22e", lane: "ducker 1 (LIME phone; E1 holds him after his duck, walking out front-left, when the pink one has gone, was white: FIX2 D8): down the left-middle, cuts across under bill 2 (DUCKS[0]), back left past the tree", note: "ducker 1 (toward the lens)" },
  { t: cw(0.543), at: [0.2, 0, 4.3] as V3, phone: "#5cc6f2", lane: "ducker 2 (sky-blue): down the middle-right lane (right of the leafy tip), steps left under bill 2's right half as she dips (DUCKS[1]), out to the right, gone before Q2", note: "ducker 2 (toward the lens)" },
  { t: cw(0.87), at: [-1.45, 0, 6.3] as V3, phone: "#ffd23a", lane: "the hero (yellow): far-left group, strolls down the left side behind ducker 1, stands at mid depth on the left from ~76 % of the count and through Q2 / Q3", note: "ANIMATOR A p3: mid depth, plain at phone size for the last quarter of the count" },
];
/** EDIT p3 (FIX2 D6): THE COUNT'S FOREGROUND LAYER. Ground marks where NEAR things may stand in Q1 (and so in E1 / E2 /
 *  E3, which replay it): on every Q1 picture frame a thing of at most this half width `w` and height `h` (metres) on the
 *  mark covers none of the five phone people, never the clown (wheel to hat) and never the bills (+ 30 px). The lens
 *  passes them (it pushes from z 14.6 to 12.85 and trucks 1.1 m left), so they slide and grow against the plaza: the
 *  count's parallax anchor. Verified by `node out/clown/v2/q1_near.mjs` (re-run it after ANY change of the Q1 camera or
 *  of a phone person's route; `... q1_near.mjs search` prints the map of clean ground for other sizes).
 *  What the map says: only LOW things (<= 0.5 m) on the centre-left near ground are clean; nothing taller than a planter,
 *  nothing on the right (the red phone guy starts there, the sky-blue ducker leaves there), no post and NO NEAR WALKER
 *  may cross between COUNT.a and COUNT.b (at 2 m from this low lens a walker is a 500 px wide strip from top to bottom:
 *  it would wipe a phone person or the bills). Near walkers / leaves may cross before COUNT.a - 20 only. Keep the things
 *  plain (no sign, nothing pointing up at the tree) and soft (out of focus). */
export const Q1_NEAR: { id: string; p: V3; w: number; h: number; what: string }[] = [
  { id: "planter", p: [-1.0, 0, 11.5], w: 0.45, h: 0.5, what: "THE ANCHOR: a low planter box / bench end at the bottom left; the lens passes 1.4 m beside it by the end of the count" },
  { id: "low2", p: [-0.5, 0, 12.25], w: 0.45, h: 0.5, what: "a second low thing nearer the lens (a crate, a kerb stone, the planter's twin): leaves the frame's bottom mid-count" },
  { id: "small1", p: [-1.25, 0, 10.25], w: 0.25, h: 0.35, what: "something small further in (a potted shrub, a backpack on the ground, two pigeons)" },
  { id: "small2", p: [0.0, 0, 12.0], w: 0.25, h: 0.35, what: "something small by the lens path (a paper cup and leaves, a traffic cone lying down)" },
  { id: "early", p: [0.75, 0, 13.5], w: 0.25, h: 0.35, what: "seen only in the instruction and the count's first second (the lens passes it): a leaf pile, a kerb corner" },
];
/** the frame-0 phone guy's feet at frame 0 (PHONES[0]): ahead-left of the clown's horn, 2.5 m behind him, in the gap
 *  between the bills and the clown (ANIMATOR A: moved from [0.5, 0, 8.0], where he stood half behind the clown) */
export const P1_F0: V3 = [0.72, 0, 7.5];

// ---------------- THE CLOWN IN THE QUIZ (Q1 -> Q3): one route on the picture clock ----------------
// Frame 0: big (5.4 m from the lens), side-on, riding WEST (screen left) at 1.3 m/s while he honks at PHONES[0]; the lens
// dollies beside him (cams_v2.ts Q1). He swings NORTH (a right turn) up the plaza a metre right of the branch tip (never
// under the bills), loops through the right half of the frame for the count (the gags at DUCKS[k] and PIGEON_F are on his
// route there), keeps riding through Q2, and in Q3 rides straight up to the lens, brakes with a wobble at CLOWN_Q3_STOP on
// "You saw him", waves and honks. clownQ(f) gives the wheel's contact point, heading, speed and wheel spin; the animator adds
// the wobble, lean, pedalling, the horn and the wave on top, but keeps the route (the cameras follow it).
type CK = [number, number, number];                                   // [frame, x, z]
/** the count's LOOP (ANIMATOR A, 2026-11-17: replaces EDIT's narrow oval, on which he rode AWAY from the lens for most of
 *  the count and through the phone guy's spot). A round loop in the plaza's right half, far behind the phone people,
 *  ridden CLOCKWISE seen from above: north up its WEST side, east across the far end, south down its EAST side, west across
 *  the near end, ~1.65 m/s (leaning hard into it). He rides past in FRONT of the phone guy honking, up the middle-left, joins
 *  the west side heading north at `join`; the phase is set so that on DUCKS[0] he is on the far end (the wobble-save, side-on,
 *  ~230 px right of the duck), on PIGEON_F at the east side heading south (he rides into the flock toward the lens) and on
 *  DUCKS[1] on the east side again (the pigeon honk, ~300 px right of the duck); after the count he swings south toward
 *  Q2 / Q3. Phase 0 = the west point. */
export const OVAL = { c: [1.29, 0, 2.2] as V3, ax: 0.2, az: 0.62, lapF: 64, join: 0 };   /* ANIMATOR A p3 (AUDIT_test 1): was c 0.72, ax 0.48 */
OVAL.lapF = DUCKS[1].t - DUCKS[0].t;   /* p3: exactly one lap between the ducks (he is on the far end, riding east, at both) */
OVAL.join = Math.round(DUCKS[0].t - OVAL.lapF / 4);
const ovalAt = (f: number): [number, number] => { const ph = (2 * Math.PI * (f - OVAL.join)) / OVAL.lapF; return [OVAL.c[0] - OVAL.ax * Math.cos(ph), OVAL.c[2] - OVAL.az * Math.sin(ph)]; };
/** the ride's keys scale with the instruction's length (frames below are for a 90 f instruction, COUNT.a = 90) */
const RQ = (f: number) => Math.round((f * COUNT.a) / 90);
/** frame 0 -> RQ(20): EDIT's (the lens dollies beside him); then he rides right across in FRONT of the phone guy (honking
 *  in his face, no reaction) and up the middle-left to the loop (his left edge stays >= 40 px right of bill 2) */
const QR: CK[] = [[-30, 2.0, 9.78], [0, 1.55, 9.7], [RQ(12), 1.52, 9.62], [RQ(30), 1.36, 8.5], [RQ(52), 1.32, 6.9], [COUNT.a, 1.4, 5.0],
  [Math.round(COUNT.a + 0.12 * (COUNT.b - COUNT.a)), 1.42, 3.4]];   /* ANIMATOR A p3: see the note above OVAL */
for (let f = DUCKS[0].t - 6; f <= DUCKS[1].t + 16; f += 8) { const [x, z] = ovalAt(f); QR.push([f, x, z]); }
/* p3: after the second flush he leaves the loop and idles on the spot, face to the lens (room for a bit before "How many?") */
QR.push([DUCKS[1].t + 38, 1.07, 2.8], [COUNT.b - 4, 1.05, 2.92]);   /* (EDIT's flag: his bits inside x <= ~900 where the bills allow it) */
/* ANIMATOR A p4 (AUDIT_edit R5 / R10: he rode half in the Shorts button column, x 780-1050, from f 18 to the end of the
   count): every key after the opening honk slides WEST (screen-left in Q1's lens) by Q_SHIFT metres, ~40 px in the hook
   growing to ~100 px on the loop's first half and ~75 px from the second duck on (the bills' gap is the limit: >= 160 px
   from every bill on every Q1 frame, out/clown/anim_quiz/p4/geo.mjs). The first keys (frame 0 = the thumbnail, the honk
   at the phone guy's ear) and the Q2 / Q3 keys do not move */
const Q_SHIFT: [number, number][] = [[RQ(12), 0], [RQ(30), 0.24], [RQ(52), 0.42], [COUNT.a, 0.36], [Math.round(COUNT.a + 0.12 * (COUNT.b - COUNT.a)), 0.38],
  [DUCKS[0].t - 10, 0.5], [DUCKS[0].t, 0.57], [DUCKS[0].t + 30, 0.5], [DUCKS[0].t + 48, 0.42], [COUNT.b - 4, 0.33]];
const qShift = (f: number) => { const K = Q_SHIFT; if (f <= K[0][0]) return 0; for (let i = 1; i < K.length; i++) if (f <= K[i][0]) { const u = (f - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * u; } return f <= COUNT.b - 4 + 0.5 ? K[K.length - 1][1] : 0; };
const QR0: CK[] = QR.map((k) => [...k] as CK);   /* the unshifted keys (cams_v2.ts frames f 18 on them: the lens must not pan after him) */
for (const k of QR) if (k[0] > RQ(12) && k[0] <= COUNT.b - 4) k[1] -= qShift(k[0]);
/** where he brakes in Q3 (feet; ~4.2 m from Q3's lens: the clown ~55 % of the frame height) */
export const CLOWN_Q3_STOP: V3 = [0.85, 0, 9.55];
/* Q2 -> Q3: down the plaza toward the lens at ~2.3 m/s, then a real BRAKE: from youSaw - 14 he stops within 10 f at the
   stop mark (the last key: he rests there; cast_quiz adds the brake pitch and the 3 cm rock) */
QR.push([Math.round((COUNT.b + BEAT.youSaw) / 2), 0.98, 6.6], [BEAT.youSaw - 14, 0.88, 8.75], [BEAT.youSaw - 4, CLOWN_Q3_STOP[0], CLOWN_Q3_STOP[2]]);
/** Hermite through the keys (tangents from the neighbours, time-scaled): C1, so speed never jumps */
const herm = (K: CK[], f: number): [number, number] => {
  const n = K.length;
  if (f <= K[0][0]) { const d = [(K[1][1] - K[0][1]) / (K[1][0] - K[0][0]), (K[1][2] - K[0][2]) / (K[1][0] - K[0][0])]; return [K[0][1] + d[0] * (f - K[0][0]), K[0][2] + d[1] * (f - K[0][0])]; }
  if (f >= K[n - 1][0]) return [K[n - 1][1], K[n - 1][2]];
  let i = 0; while (i + 2 < n && f > K[i + 1][0]) i++;
  const tan = (j: number, c: 1 | 2) => {
    if (j === n - 1) return 0;   /* he comes to rest at the last key */
    const a = K[Math.max(0, j - 1)], b = K[Math.min(n - 1, j + 1)];
    return (b[c] - a[c]) / (b[0] - a[0]);
  };
  const h = K[i + 1][0] - K[i][0], u = (f - K[i][0]) / h, u2 = u * u, u3 = u2 * u;
  const H = (c: 1 | 2) => (2 * u3 - 3 * u2 + 1) * K[i][c] + (u3 - 2 * u2 + u) * h * tan(i, c) + (-2 * u3 + 3 * u2) * K[i + 1][c] + (u3 - u2) * h * tan(i + 1, c);
  return [H(1), H(2)];
};
/** the clown's wheel radius (m; cast_people.ts draws the wheel at this size) */
export const WHEEL_R = 0.31;
const QF0 = -60, QF1 = Math.ceil(QR[QR.length - 1][0]) + 60;
/** metres ridden from frame QF0, per whole frame (for the wheel spin) */
const QS: number[] = (() => { const o = [0]; let p = herm(QR, QF0); for (let f = QF0 + 1; f <= QF1; f++) { const q = herm(QR, f); o.push(o[o.length - 1] + Math.hypot(q[0] - p[0], q[1] - p[1])); p = q; } return o; })();
export type ClownState = { p: V3; heading: number; v: number; s: number; spin: number; onLap: boolean; ang: number;
  /** signed turn rate of the path (rad / m, + = his heading angle atan2(x, z) grows): the lean into a turn */ curv: number };
/** THE CLOWN of the quiz at picture frame f (Q1-Q3; E1-E3 replay it through remap.ts) */
export const clownQ = (f: number): ClownState => {
  const q = herm(QR, f), a = herm(QR, f - 0.5), b = herm(QR, f + 0.5), a2 = herm(QR, f - 3), b2 = herm(QR, f + 3);
  const v = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const h1 = Math.atan2(q[0] - a2[0], q[1] - a2[1]), h2 = Math.atan2(b2[0] - q[0], b2[1] - q[1]);
  let dh = h2 - h1; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
  const fc = Math.max(QF0, Math.min(QF1 - 1, f)), i = Math.floor(fc - QF0), s = QS[i] + (QS[i + 1] - QS[i]) * (fc - QF0 - i);
  const heading = v > 1e-4 ? Math.atan2(b[0] - a[0], b[1] - a[1]) : Math.atan2(b2[0] - a2[0], b2[1] - a2[1]);
  const seg = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
  return { p: [q[0], 0, q[1]], heading, v, s, spin: s / WHEEL_R, onLap: false, ang: Math.atan2(q[0] - SQ.lap.c[0], q[1] - SQ.lap.c[2]), curv: seg > 1e-3 ? dh / seg : 0 };
};
{ const a = clownQ(PIGEON_F), h = a.heading; PIGEON_FLOCK[0] = a.p[0] + 0.8 * Math.sin(h); PIGEON_FLOCK[2] = a.p[2] + 0.8 * Math.cos(h); }
/** ANIMATOR A p4: where he WAS before the p4 west shift (the opening framing of cams_v2.ts Q1 is built on it) */
export const clownQ0p = (f: number): V3 => { const q = herm(QR0, f); return [q[0], 0, q[1]]; };
/** kept name (export_plan.mjs, SOUND): the clown of the QUIZ world */
export const clownAt = clownQ;
/** the lap round the sculpture (story shots S6, S14): angle 0 = nearest the opening lens (+z), + = toward +x */
export const lapPos = (a: number): V3 => [SQ.lap.c[0] + SQ.lap.r * Math.sin(a), 0, SQ.lap.c[2] + SQ.lap.r * Math.cos(a)];
export const lapHeading = (a: number) => Math.atan2(-Math.cos(a), Math.sin(a));

// ---------------- THE STORY'S MARKS in the square (S1, S6-S20) ----------------
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** u through shot `key` (0 at its first frame, 1 at its last; clamped to -0.2 .. 1.2) at picture frame f */
const spanK = (key: string, f: number) => { const s = SHOTS.find((x) => x.key === key)!; return Math.max(-0.2, Math.min(1.2, (f - s.a) / (s.b - s.a))); };
/** the study corner of the v2 story (S7-S13): the table + sign stay SQ.study's; a walker STOPs here facing south-east, the
 *  INTERVIEWER (clipboard) stands at IV facing north-west; the PAIR stand at PAIR; PG = the phone guy's spot (= STOP) */
export const STUDY = {
  stop: [3.75, 0, 9.95] as V3, iv: [4.45, 0, 10.65] as V3, pair: [[3.45, 0, 9.85], [4.05, 0, 10.05]] as V3[],
  /** S7: the walker comes south from the square, WEST of the table (never through it), into the stop; the interviewer
   *  steps in from the table's south-east corner */
  walkIn: { from: [3.3, 0, 7.2] as V3, to: [3.75, 0, 9.95] as V3 }, ivFrom: [5.25, 0, 9.55] as V3,
  /** S11: the clown rides by BEHIND the phone guy, right to left, slowing to wave in the gap right of the guy's head
   *  (u 0.25-0.65 of the shot), then on behind him */
  clownBy: { from: [6.2, 0, 6.2] as V3, to: [3.3, 0, 5.7] as V3 },
  /** S13: the clown pulls up at the phone guy's LEFT (west) side, 1.1 m off, and honks; the guy spins LEFT (wind-up,
   *  6-8 f turn, overshoot) to face him, so his face turns 3/4 toward the S13 lens (south-west): the jaw drop reads */
  clownSide: [2.95, 0, 9.72] as V3,
};
export const STORY = {
  /** S1: a phone guy walks toward the lens chatting (big gestures); right behind him the clown circles honking and
   *  waving (circle centre / radius; one lap in ~3 s). He walks south 3.2 m over the shot. */
  s1: { from: [-0.35, 0, -0.9] as V3, to: [-0.15, 0, 2.1] as V3, circle: { c: [0.25, 0, -2.7] as V3, r: 0.85 } },
  /** S6: the high crane: the clown circles the sculpture on SQ.lap (anticlockwise seen from above), crowds cross the plaza
   *  (lanes A-E), the clock tower's hands sweep an hour (LOOK), the money tree at the left edge (honest, no emphasis) */
  s6: { lap: SQ.lap },
  /** S14: the headphone dude bops west -> east past the front of the sculpture, waves at the clown (on the lap's front),
   *  the clown waves back */
  s14: { from: [-1.6, 0, -2.4] as V3, to: [2.6, 0, -2.55] as V3, clownAt: -0.35 /* lap angle when he waves */ },
  /** S15: the hero phone walker walks SOUTH on the path toward the branch (behind the lens), slow, blank-eyed; the call
   *  bubble floats upper-left of her head */
  s15: { from: [-1.85, 0, -1.6] as V3, to: [-1.55, 0, 1.9] as V3 },
  /** S16: Hyman tiptoes south along the path toward the branch, three bills + pegs in his hands, sly looks */
  s16: { from: [-1.95, 0, -1.2] as V3, to: [-1.75, 0, 0.35] as V3 },
  /** S17: Hyman stands north-west of the LOWEST bill, facing the lens (south-east); his hands at bills[2].peg; then a flat
   *  hand at his own head height (1.66 m) beside it */
  s17: { at: [-1.25, 0, 4.95] as V3 },
  /** S18: three walkers along the path, far -> near (north -> south), dipping under the lowest bill one at a time,
   *  >= 18 f apart (limbo rhythm) */
  s18: { lane: "B" as const },
  /** S19: the no-phone walker STOPS under the middle / lowest bill, delighted, peers at the note; the phone walker ducks
   *  and walks on; the A-frame board (ON A PHONE: 6 in 100 / NO PHONE: 20 in 100) stands right of the path at `board`
   *  facing the lens */
  s19: { stopper: [-1.05, 0, 5.15] as V3, board: [0.0, 0, 6.3] as V3 },
  /** S20 (slow motion): the hero walks south under the lowest bill; her head is lowest exactly under it at
   *  pt(S20, BEAT.dodged) (remap.ts pt) */
  s20: { from: [-0.95, 0, 4.75] as V3, to: [-0.62, 0, 6.1] as V3 },
};
/** the walkers' feet along their marks in a shot (u = the shot's progress) */
export const markAt = (key: string, from: V3, to: V3, f: number): V3 => lerp3(from, to, spanK(key, f));

/** measured cartoon adult (toon.ts): hat top ~1.66 m, eyes ~1.29 m, chin ~1.08 m (standing) */
export const EYE = 1.29;
export const HEAD_TOP = 1.66;

// ---------------- THE OFFICE (LOOK v2; built by office.ts; shots S2-S5) ----------------
// Ira Hyman's office: one warm corner of a room 1 km south of the square (its own light state "office"). Local axes as
// the square's: x = screen right for a lens looking north (-z), y up, floor y = 0. The room: x -3.0 (the WINDOW wall,
// west) .. 3.5 (east wall), z -2.7 (the BACK wall: bookshelf, whiteboard, door) .. 3.4, ceiling 2.95. Cameras stay
// inside and look north / north-west / north-east (never south: the front wall is plain). All points are WORLD.
const OB: V3 = [0, 0, 1000];
const ofc = (d: V3): V3 => [OB[0] + d[0], OB[1] + d[1], OB[2] + d[2]];
/** direction TOWARD the office's key (the afternoon sun through the west window, 25 deg up, a little from the lens side) */
export const OFFICE_KEY: V3 = [-0.93, 0.24, 0.28];   /* LOOK v2: 14 deg up (late afternoon): the beams cross the room at head height and light Hyman at the board */
export const OFFICE = {
  base: OB,
  room: { x0: OB[0] - 3.0, x1: OB[0] + 3.5, z0: OB[2] - 2.7, z1: OB[2] + 3.4, h: 2.95 },
  /** the west window (in the plane x = room.x0): centre, width (along z), height; its sun patch lies on the floor round
   *  x 0.1 .. 3, z -2.7 .. -0.6 and climbs the back wall over the board's lower half; Hyman at the board stands in the
   *  beam from head to knees */
  window: { c: ofc([-3.0, 1.675, -1.05]), w: 2.0, h: 1.75 },
  /** the whiteboard on the back wall: centre of its face, size (m). It reads "DISTRACTION?" with two crossed-out
   *  doodles ("JUGGLING BEAR?", "MARCHING BAND?"); its writing faces +z */
  board: { c: ofc([0.25, 1.56, -2.665]), w: 2.0, h: 1.15 },
  /** HYMAN: feet at the board (a pace in front of its right half, turned 3/4 to a lens on the south-west), and where he
   *  turns to when the door opens (a step right, facing the door) */
  hyman: { atBoard: ofc([0.62, 0, -1.98]), turned: ofc([1.0, 0, -1.72]) },
  /** THE DOOR (back wall, right): an opening x 1.8 .. 2.75, height 2.12; the leaf hangs on its RIGHT jamb (`hinge`, the
   *  pivot line's foot) and swings INTO the room (yaw + = toward +z). officeDoorYaw(f) gives the leaf's yaw; it starts
   *  opening at `openF` (EDIT: set it from your beats, e.g. a few frames before "Then a student"; NaN = shut) */
  door: { hinge: ofc([2.75, 0, -2.66]), w: 0.95, h: 2.12, opening: ofc([2.275, 0, -2.7]), max: 1.6, openF: BEAT.thenAStudent - 2 as number /* EDIT v2: the crack starts as S3 dissolves in; fully open (~11 f) by "student", the lean */ },
  /** THE STUDENT: feet in the corridor just outside the door (he LEANS IN through the opening: head + shoulders past
   *  the jamb), then IN the room (S4 / S5) beside the door, and the line he rolls the unicycle along (corridor -> mark) */
  student: { lean: ofc([2.3, 0, -3.02]), leanHead: ofc([2.15, 1.62, -2.6]), inRoom: ofc([2.05, 0, -1.95]),
    uniFrom: ofc([2.3, 0, -3.3]), uniTo: ofc([1.55, 0, -1.55]) },
  /** the desk (front right: honey wood, books, a steaming mug, papers, a brass lamp); top height */
  desk: { c: ofc([2.3, 0, 0.6]), w: 1.5, d: 0.75, top: 0.76 },
  /** suggested lenses (pos, look, vertical fov deg), checked on stills: `wide` = the board, Hyman, the window light
   *  (S2), `close` = Hyman's chin-stroke at the board, `door` = the door + the board's right half (S3), `two` = Hyman
   *  left + the student by the door (S4 / S5) */
  cams: {
    wide: { pos: ofc([1.55, 1.42, 3.0]), look: ofc([-0.15, 1.3, -2.4]), fov: 44 },
    close: { pos: ofc([1.25, 1.5, 0.35]), look: ofc([0.45, 1.42, -2.2]), fov: 36 },
    door: { pos: ofc([-1.1, 1.45, 1.7]), look: ofc([2.05, 1.3, -2.6]), fov: 42 },
    two: { pos: ofc([0.3, 1.38, 2.2]), look: ofc([1.45, 1.3, -2.3]), fov: 42 },
  },
};
/** the door leaf's yaw (rad, 0 = shut, + = open into the room) at picture frame f, opening from f0: a 3 f crack, a
 *  fast 8 f swing that overshoots ~8 %, a damped settle (~20 f) at OFFICE.door.max */
export const officeDoorYaw = (f: number, f0: number = OFFICE.door.openF): number => {
  if (!Number.isFinite(f0) || f <= f0) return 0;
  const t = f - f0, M = OFFICE.door.max, c = (x: number) => Math.max(0, Math.min(1, x));
  if (t < 3) { const u = c(t / 3); return M * 0.05 * u * u * (3 - 2 * u); }
  if (t < 11) { const u = c((t - 3) / 8); return M * (0.05 + 1.03 * (1 - (1 - u) ** 3)); }
  return M * (1 + 0.08 * Math.exp(-(t - 11) / 5) * Math.cos((t - 11) * 0.55));
};

export const SETS: Record<SetName, V3> = { square: SQ.base, office: OFFICE.base };
/** exterior sets (sky, sun, clouds are theirs) */
export const EXTERIOR: Record<SetName, boolean> = { square: true, office: false };
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** place helper (set-local -> world; the square sits at the origin), also usable in `node scripts/project.mjs` */
export const sq = (d: V3) => add(SQ.base, d);

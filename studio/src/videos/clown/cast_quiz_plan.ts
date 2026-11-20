// THE QUIZ WORLD'S PLAN (owner ANIMATOR A, rebuild v2): who walks where and when in Q1-Q3 (and so in E1-E3, which replay
// / rewind them through remap.ts). PURE DATA + pure functions of the PICTURE frame f: no DOM, no drawing (cast_quiz.ts draws
// and acts them; out/clown/anim_quiz/check.mjs projects them through the film cameras to check the count's rules).
//
// Every time is a BEAT word or a fraction of the count window (COUNT / DUCKS / PIGEON_F of plan.ts), never a literal frame,
// so the staging follows the voice. Distances in metres (y up). Each walker has a polyline and TIMING KEYS (frame -> metres
// walked, a monotone cubic: speed changes are smooth and a flat stretch is a real stop); cast_quiz.ts feeds the metres to
// PPL.walkPhase, so the stance foot never slides. The quiz world starts at picture frame 0 (E3 rewinds exactly to 0 and
// never before), so walkers may already be mid-walk on frame 0.
//
// THE COUNT'S RULES (BUILD_PLAN_v2 law 10, SCRIPT_v6 "The quiz"):
//   - exactly FIVE people hold a phone to the ear: P1 red (THE PHONE GUY: frame 0, S1, S11, S13), P2 white, P3 yellow (THE
//     HERO), P4 sky-blue, P5 pink. Nobody else holds anything near an ear; nobody looks at a screen;
//   - the bills hang whole on the sky for the whole count: only the two duckers pass bill 2's column, from BEHIND the
//     branch (the bill drawn over them), dip under it, and leave the column to the right while still low;
//   - nothing points at the bills: the clown's gags are on the right at both ducks; nobody looks up.
import { COUNT, DUCKS, PHONES, type V3 } from "./plan";
import { BEAT } from "./beats";

const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** a frame at count fraction u (unrounded) */
export const cu = (u: number) => COUNT.a + (COUNT.b - COUNT.a) * u;
/** the instruction's frames scale with its length (numbers written for a 90 f instruction) */
export const RQ = (f: number) => (f * COUNT.a) / 90;

// ---------------------------------------------------------------- routes
export type Gait = "walk" | "stroll" | "phone" | "jog" | "skip" | "tiptoe";
/** a walker: polyline `pts`, timing keys [frame, metres] (monotone cubic, linear past the ends), drawn while the metres are
 *  inside [0, length] and the frame inside [fOn, fOff] (default always) */
export type Route = { pts: V3[]; keys: [number, number][]; gait: Gait; weave?: number; fOn?: number; fOff?: number;
  /** corner rounding (m, default 0.6); the duckers use a tight one so they pass EXACTLY through the duck point */ round?: number };
const segL = (pts: V3[]) => pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[2] - pts[i][2]));
export const routeLen = (r: Route) => segL(r.pts).reduce((a, b) => a + b, 0);
/** metres along pts to vertex k */
export const vS = (pts: V3[], k: number) => segL(pts).slice(0, k).reduce((a, b) => a + b, 0);
const rawAt = (pts: V3[], s: number): V3 => {
  let d = Math.max(0, s); const L = segL(pts);
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const u = Math.min(1, d / L[i]); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, 0, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * u]; } d -= L[i]; }
  return pts[pts.length - 1];
};
/** corners rounded over +-r metres (5 samples) */
const smoothAt = (pts: V3[], s: number, r = 0.6): V3 => {
  const q = [-r, -r / 2, 0, r / 2, r].map((d) => rawAt(pts, s + d)), w = [1, 2, 2, 2, 1];
  return [q.reduce((a, p, i) => a + w[i] * p[0], 0) / 8, 0, q.reduce((a, p, i) => a + w[i] * p[2], 0) / 8];
};
/** monotone cubic through [x, y] knots (Fritsch-Carlson), linear past the ends */
export const mono = (K: [number, number][], x: number) => {
  const n = K.length;
  if (n === 1) return K[0][1];
  if (x <= K[0][0]) return K[0][1] + (x - K[0][0]) * ((K[1][1] - K[0][1]) / (K[1][0] - K[0][0]));
  if (x >= K[n - 1][0]) return K[n - 1][1] + (x - K[n - 1][0]) * ((K[n - 1][1] - K[n - 2][1]) / (K[n - 1][0] - K[n - 2][0]));
  const d = K.slice(0, -1).map((k, i) => (K[i + 1][1] - k[1]) / (K[i + 1][0] - k[0]));
  const m = K.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  let i = 0; while (i + 2 < n && x > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], u = (x - K[i][0]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * K[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * K[i + 1][1] + (u3 - u2) * h * m[i + 1];
};
export const metresAt = (r: Route, f: number) => mono(r.keys, f);
/** speed (m/s) at f */
export const speedAt = (r: Route, f: number) => (metresAt(r, f + 0.5) - metresAt(r, f - 0.5)) * 30;
/** a walker's state at frame f: feet (with the phone weave), heading (atan2(x, z) of travel), metres walked, speed, drawn? */
export const routeAt = (r: Route, f: number, seed = 1) => {
  const s = metresAt(r, f), L = routeLen(r), on = s >= -0.01 && s <= L + 0.01 && f >= (r.fOn ?? -1e9) && f <= (r.fOff ?? 1e9);
  const R = r.round ?? 0.6, p = smoothAt(r.pts, s, R), a = smoothAt(r.pts, s - 0.2, R), b = smoothAt(r.pts, s + 0.2, R);
  const heading = Math.atan2(b[0] - a[0], b[2] - a[2]), v = speedAt(r, f);
  const w = (r.weave ?? 0) * clamp(v / 0.5, 0, 1) * (r.round !== undefined ? 0 : 1) * (Math.sin(TAU * (s / 2.4) + seed * 1.7) + 0.35 * Math.sin(TAU * (s / 1.1) + seed * 2.9));
  const pos: V3 = [p[0] + Math.cos(heading) * w, 0, p[2] - Math.sin(heading) * w];
  return { p: pos, heading, s, v, on };
};
/** timing keys from [frame, vertex index] pairs (+ optional [frame, -1, metres] raw metre keys) */
const K = (pts: V3[], ks: ([number, number] | [number, number, number])[]): [number, number][] =>
  ks.map((k) => [k[0], k[1] >= 0 ? vS(pts, k[1]) : (k[2] as number)]);
const route = (pts: V3[], ks: ([number, number] | [number, number, number])[], gait: Gait, extra: Partial<Route> = {}): Route => ({ pts, keys: K(pts, ks), gait, ...extra });

// ---------------------------------------------------------------- the cast of the quiz
export type QuizWho = "red" | "white" | "hero" | "blue" | "pink" | "dude" | "m2" | "friendA" | "friendB" | "coffee"
  | "dogwalker" | "skater" | "books" | "tote" | "elder" | "scarf" | "backpack" | "runner" | "beret" | "parka" | "cyclist";
export type QuizActor = { key: string; who: QuizWho; route: Route; seed: number; scale?: number;
  /** index into PHONES (the five) */ phone?: number;
  /** the duck (DUCKS index) this walker performs */ duck?: number;
  /** a decoy who NOTICES the clown (music listeners and pairs saw him): eyes / head on him, a wave, a point, a laugh */ sees?: boolean;
  /** the pair: the other one's key */ partner?: string };

/** the duck's shape for each ducker (cast_quiz.ts PPL.duckAt options): a long low pass so the head leaves the bill's column
 *  (to the right) before it comes up */
/** `shift`: the low hold's centre after DUCKS[k].t (ducker 1 stays low until his head has left bill 2's column) */
/* THE DUCKS MUST BE NEEDED (ANIMATOR C's measurements: the rig's real head tops are standard 1.52 m / round 1.47 m, and the
   lowest bill's bottom edge is 1.47 m, so at their own size the two duckers would pass under it standing). Both duckers are
   drawn 12 % larger (DUCK_SCALE: head top ~1.70 m, the bill's edge would cross the forehead) and dip ~0.36 m (a full duck), to ~1.36 m. */
export const DUCK_SCALE = 1.12;
export const DUCK_OPT = [{ lift: 3, drop: 6, hold: 28, rise: 10, amt: 1, shift: 8 }, { lift: 3, drop: 8, hold: 28, rise: 9, amt: 1, shift: -1 }];

const D0 = DUCKS[0], D1 = DUCKS[1];
/** P1 THE PHONE GUY (red phone, right ear): on frame 0 a step ahead-left of the clown's horn, strolling toward the lens,
 *  chatting, eyes on nothing; the clown rides right across in front of him honking (no reaction). He STOPS to chat (stands
 *  facing the lens, gestures, laughs: whole in frame, right of the clown's lane) from the end of the instruction to 20 % of
 *  the count, then walks off the right edge in ~1 s (before the clown reaches the loop's east side) */
/* p4: his stand is 0.2 m further west and he leaves ~15 f earlier: the clown now rides ~80-100 px further left (out of the
   Shorts button column), and the crossing on the way out is over before the wobble-save and before E3's pass (picture 120) */
const P1P: V3[] = [[0.72, 0, 7.5], [0.36, 0, 7.48], [-0.06, 0, 7.4], [1.15, 0, 8.35], [2.9, 0, 8.95]];
const P1R = route(P1P, [[0, 0, 0], [RQ(56), 2], [cu(0.14), 2, 0], [cu(0.14) + 19, 3], [cu(0.14) + 44, 4]], "walk", { round: 0.2 });   /* p3: off before the wobble (he crosses the clown's column on his way out) */
/** P2 (white phone, green varsity): DUCKER 1, toward the lens: down the far-left side, cuts across to dip under bill 2 on
 *  DUCKS[0].t, then curves back left (still low, out of the bill's column) and off past the near side of the tree */
const P2P: V3[] = [[-2.25, 0, 0.2], [-1.78, 0, 3.3], [-1.32, 0, 5.0], D0.at, [-1.25, 0, 6.35], [-2.2, 0, 7.0], [-3.6, 0, 7.6]];
const P2R = route(P2P, [[0, 0, 0], [D0.t, 3], [cu(0.62), 5], [cu(0.8), 6]], "walk", { round: 0.22 });
/** P3 THE HERO (yellow phone): strolling across the plaza's far middle from the left toward the right, chatting. She is in
 *  the clear (left of ducker 2's lane) for the first 22 % of the count, crosses behind that lane and the clown's loop, is
 *  clear again on the right from ~85 % of the count (her E1 hold at 91 %, after ducker 2 has left) where she stops to chat (whole in frame through Q2 / Q3) */
/* (fairness pass: as a far figure her phone was a 4 px sliver at 360x640. She now turns and comes DOWN the left-middle after
   ducker 1 has left it, and stands alone at mid depth, whole in frame, from ~62 % of the count to its end and through Q2) */
const P3P: V3[] = [[-3.5, 0, -1.2], [-3.0, 0, 1.5], [-2.3, 0, 3.6], [-1.6, 0, 5.0], [-1.45, 0, 6.3], [-1.45, 0, 6.32]];
const P3R = route(P3P, [[0, 0, 0], [cu(0.22), 1], [cu(0.44), 2], [cu(0.62), 3], [cu(0.76), 4], [cu(3), 4, 0]], "walk", { round: 0.3 });
/** P4 (sky-blue phone, cream coat): DUCKER 2, toward the lens: chatting on the spot in the far middle-right, then a brisk walk
 *  down the middle, dips under bill 2's right half on DUCKS[1].t, out to the right still low and on toward the lens-right */
const P4P: V3[] = [[-2.0, 0, -2.6], [-1.05, 0, -0.2], [-0.02, 0, 2.2], [-0.06, 0, 4.4], D1.at,   /* p4: the lane 0.2 m west (the clown rides further left now) */ [-0.02, 0, 5.98], [0.95, 0, 6.9], [2.2, 0, 8.2]];
const P4R = route(P4P, [[0, 0, 0], [cu(0.12), 1], [cu(0.34), 2], [D1.t, 4], [D1.t + 16, 5], [cu(0.9), 6], [cu(1.06), 7]], "walk", { round: 0.22, fOff: COUNT.b - 4 });   /* gone before Q2 (no phone walker after "How many?") */
/** P5 (pink phone, navy dress; PHONES[2] in p3's count order): she comes out from behind the tree trunk during the
 *  instruction, down to mid depth on the left (in front of the branch line, under no bill, clear of EDIT's foreground
 *  planter), stands there chatting, plain at phone size, for the first 30 % of the count, then strolls back behind the tree */
/* p4 (AUDIT_animation B1, the BLOCKER): she turned front -> back in ONE frame at f 137 -> 138, beside duck 1 and inside
   E3's slow pass (picture 120-146). Now she stands FRONT-ON until P5_GO (after the pass and the duck's low point) and
   leaves to the LEFT, toward the lens-left corner: a front-3/4 then profile walk (her heading always has c > 0), so there
   is no back view and no turn-around at all; she is out of frame ~25 f later, ahead of the lime ducker's own exit */
export const P5_GO = 152;
const P5P: V3[] = [[-2.9, 0, 5.3], [-2.2, 0, 6.2], [-1.6, 0, 6.7], [-1.62, 0, 6.72], [-2.35, 0, 7.05], [-3.35, 0, 7.5], [-4.4, 0, 7.95]];
const P5R = route(P5P, [[0, 0], [RQ(82), 2], [P5_GO, 2, 0], [P5_GO + 30, 4], [P5_GO + 54, 5], [P5_GO + 78, 6]], "walk", { round: 0.2 });

// ---- the DECOYS (no phones; music listeners and the pair SAW the clown: they react to him)
/** the headphones DUDE (lime cans; the S10 / S14 dude): bopping across the far plaza right -> left, waves at the clown */
/* (timed so his lime headphones are never right beside a phone person's head at the two duck frames) */
const DUDE = route([[5.6, 0, -5.6], [3.3, 0, -5.2], [3.28, 0, -5.2]], [[COUNT.b + 4, 0], [COUNT.b + 60, 1], [COUNT.b + 400, 1, 0]], "walk", { round: 0.2 });   /* p3 (AUDIT_test 6): never during the count: he strolls in on the far right in Q2 and stands there bopping (a thumbs-up at the clown) */
/** orange-cans listener: down the far right side toward the plaza's middle, head bobbing */
/* (p3: not in the quiz any more: no headphones near the phone people; the route is kept for reference) */
export const M2R = route([[2.5, 0, -9.0], [2.1, 0, -5.0], [1.9, 0, -3.2], [1.0, 0, -2.9], [-1.0, 0, -3.6], [-9.0, 0, -4.0]], [[COUNT.b + 6, 0], [COUNT.b + 330, 4]], "walk");   /* p3: no headphones in the count (AUDIT_test 6) */
/** the PAIR (the S9 friends): strolling in from the right in the middle distance, they stop to watch the clown, laugh, point */
const PAIR_A = route([[4.6, 0, -3.5], [2.55, 0, -3.25], [-2.0, 0, -2.95], [-9.0, 0, -2.6]], [[0, 0, 0.3], [cu(0.3), 1], [cu(0.42), 1, 0], [cu(1.2), 2], [cu(1.8), 3]], "stroll");
const PAIR_B = route([[4.95, 0, -3.95], [2.9, 0, -3.7], [-1.65, 0, -3.4], [-8.65, 0, -3.05]], [[0, 0, 0.3], [cu(0.3), 1], [cu(0.42), 1, 0], [cu(1.2), 2], [cu(1.8), 3]], "stroll");
/** the loner with a coffee, far back, right -> left */
const COFFEE = route([[3.6, 0, -7.5], [0.0, 0, -7.2], [-4.0, 0, -6.6]], [[0, 0, 0.8], [cu(1.3), 2]], "stroll");
/** the dog walker, far-middle, left -> right (the dog trots ahead on its red lead) */
const DOGW = route([[-4.5, 0, -5.8], [-1.0, 0, -6.2], [2.5, 0, -6.4], [5.0, 0, -6.4]], [[0, 0, 0.4], [cu(1.3), 3]], "stroll");
/** the skateboarder far back (fast, right -> left) */
const SKATE = route([[6.5, 0, -11.5], [-6.5, 0, -10.5]], [[cu(-0.1), 0], [cu(0.9), -1, 11.0]], "walk");
/** a runner jogging across the near band (lower right) */
/** far extras, both ways (books, tote, elder, scarf, backpack, beret, parka) */
const FAR = (pts: V3[], f0: number, v: number, gait: Gait = "walk") => route(pts, [[f0, 0], [f0 + (30 * 18) / v, -1, 18]], gait);

export const QUIZ_ACTORS: QuizActor[] = [
  { key: "p1", who: "red", route: P1R, seed: 11, phone: 0 },
  { key: "p2", who: "white", route: P2R, seed: 12, phone: 2, duck: 0, scale: DUCK_SCALE },
  { key: "p3", who: "hero", route: P3R, seed: 13, phone: 4 },
  { key: "p4", who: "blue", route: P4R, seed: 14, phone: 3, duck: 1, scale: DUCK_SCALE },
  { key: "p5", who: "pink", route: P5R, seed: 15, phone: 1 },
  { key: "dude", who: "dude", route: DUDE, seed: 21, sees: true },
  { key: "fa", who: "friendA", route: PAIR_A, seed: 23, sees: true, partner: "fb" },
  { key: "fb", who: "friendB", route: PAIR_B, seed: 24, sees: true, partner: "fa" },
  { key: "coffee", who: "coffee", route: COFFEE, seed: 25 },
  { key: "dog", who: "dogwalker", route: DOGW, seed: 26, sees: true },
  { key: "skate", who: "skater", route: SKATE, seed: 27 },
  { key: "books", who: "books", route: FAR([[-9.0, 0, -12.4], [9.0, 0, -13.2]], -60, 1.0), seed: 31 },
  { key: "tote", who: "tote", route: FAR([[9.0, 0, -9.6], [-9.0, 0, -8.9]], 20, 1.0), seed: 32 },
  { key: "elder", who: "elder", route: FAR([[-9.0, 0, -15.6], [9.0, 0, -15.0]], -120, 0.7, "stroll"), seed: 33 },
  { key: "scarf", who: "scarf", route: FAR([[9.0, 0, -17.0], [-9.0, 0, -17.6]], 60, 1.0), seed: 34 },
  { key: "backpack", who: "backpack", route: FAR([[3.0, 0, -22.0], [2.6, 0, -11.0]], -40, 1.0), seed: 35 },
  { key: "beret", who: "beret", route: FAR([[-9.0, 0, -8.5], [9.0, 0, -8.9]], 150, 1.0), seed: 36 },
  { key: "parka", who: "parka", route: FAR([[1.8, 0, -12.0], [2.6, 0, -24.0]], -30, 1.0), seed: 37 },
];
export const actor = (key: string) => QUIZ_ACTORS.find((a) => a.key === key)!;

// ---------------------------------------------------------------- the clown's gags (frames; his route is plan.ts clownQ)
export const GAG = {
  /** frame 0: the horn squeeze at the phone guy (the bulb squashed ON frame 0: the thumbnail) */
  honk0: -1,
  /** p3: the second pump of the opening honk, inside the 8-frame lead-in before "Quick test." */
  honk0b: RQ(7),
  /** p3: he shows his BACK only while he pedals off up the plaza (then he turns and rides backward, face to us) */
  backIn: RQ(22), backOut: RQ(58),
  /** a second honk right beside the phone guy's head as he rides round him (no reaction) */
  honk1: RQ(31),
  /** DUCKS[0]: the wobble-and-save (the tip peaks on the duck frame) */
  wobble: D0.t - 9,
  /** "Don't lose count." (plan.ts PIGEON_F): he nearly rides into the pigeon flock, which explodes up round him */
  flush: 0,
  /** DUCKS[1]: he honks at the re-landed pigeons; they flush again */
  honkPigeons: D1.t - 2,
  /** Q3: the brake, the wave, the honk with the wave */
  brake: BEAT.youSaw - 6, wave: BEAT.sawHim, honkWave: BEAT.right,
  /** p3 polish: a pigeon lands on his hat (the bit's first frame; it lands 12 f later, pecks, leaves at +42) */
  pigeonHat: cu(0.045),
  /** p3 polish: HIS JUGGLE (two balls + his horn): the horn leaves his hand at jugRel and is caught at jugCat; then the cheer
   *  honk, a button after "Five." */
  jugRel: COUNT.b - 16, jugCat: COUNT.b + 32, cheer: COUNT.b + 40,
};
void PHONES;

// ---------------------------------------------------------------- keep plan.ts's PHONES[k].at on these routes
/** E1 holds each phone person at PHONES[k].t and EDIT's replay punch-in pivots on PHONES[k].at: the feet there are the
 *  routes' (the literals in plan.ts are this timing's values; this keeps them right whatever the voice) */
PHONES.forEach((ph, k) => { const a = QUIZ_ACTORS.find((x) => x.phone === k); if (!a) return; const st = routeAt(a.route, ph.t, a.seed); ph.at[0] = st.p[0]; ph.at[1] = 0; ph.at[2] = st.p[2]; });

// CAMERAS of the shots on set 'jp_platform' (STATION owner), placed on the real layout (kit/rail/tokyo_platform.ts TP:
// platform top y = 0, track-1 edge x = 0, the train on +x heading -Z with its nose at z = 0, car 1's front doorway
// = THE BAG'S DOOR at z = 3.6, the vending machines at z 7.3 facing -Z, the canopy from z = 9.5).
// Seen from the platform the train leaves toward SCREEN LEFT (the platform is on the train's left, the driver's side).
// No ../shots or ../cast imports here (the shots -> cams -> sets cycle); ../timeline (the clock) is safe.
//
// ============================================================================================================
// THE SCRIPT SWITCH (one word). "v2" = the shot table of 2026-11-19 16:12 (bible v2: s07 s08 s09 s14 s18 s20 s21 s22).
// "v3" = the final v3 outline (sound/pointing/script_v3/shot_outline_v3.json: this set's shots s01 s07 s08 s09 s11 s12 s13
// s14 s15 s16a s16b s18 s20 s22 s23 s24, also under the ids v3_s01 ...). Flip it when shots.ts is regenerated for script v3: it selects BOTH this file's cameras and the set's
// PLATFORM_PLAN (sets/jp_platform.ts). The set warns in the page log when the switch and the table disagree.
export const SCRIPT = "v3" as "v2" | "v3";      // v3 since 2026-11-19 23:05 (the script is LOCKED; the other sets' cameras are v3 too)
// ============================================================================================================
import type { CamState, V3 } from "../../../kit/core/ctx";
import { shotCam, lowWideTrack, pullBack, followSide, povHandheld, EASE, withShake, type Ease } from "../../../kit/core/camera";
import type { ShotCam } from "../camkit";
import { cutS, cutE, EV, L as LOOP } from "../timeline";      // THE CLOCK (imports only words: safe at top level)

const D2R = Math.PI / 180;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const L3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** orbit with a moving target + radius: azimuth a0 -> a1 (deg; 0 = camera on +Z of the target, 90 = on +X) */
const orbitV = (p: { t0: V3; t1: V3; r: [number, number]; h: [number, number]; a0: number; a1: number; lookH: number; fov: number; ease?: Ease; shake?: number; seed?: number }) =>
  (d: number) => (u: number): CamState => {
    const k = EASE[p.ease ?? "inOut"](u / d), tg = L3(p.t0, p.t1, k), a = lerp(p.a0, p.a1, k) * D2R, r = lerp(p.r[0], p.r[1], k);
    const c: CamState = { pos: [tg[0] + Math.sin(a) * r, lerp(p.h[0], p.h[1], k), tg[2] + Math.cos(a) * r], look: [tg[0], tg[1] + p.lookH, tg[2]], fov: p.fov };
    return withShake(c, u, p.shake ?? 0, p.seed ?? 3);
  };
/** a gentle straight move from one lens to another (pos + look + fov), with a little handheld life */
const glide = (a: { pos: V3; look: V3; fov: number }, b: { pos: V3; look: V3; fov?: number }, o: { ease?: Ease; shake?: number; seed?: number } = {}) =>
  (d: number) => (u: number): CamState => {
    const k = EASE[o.ease ?? "inOut"](Math.max(0, Math.min(1, u / d)));
    return withShake({ pos: L3(a.pos, b.pos, k), look: L3(a.look, b.look, k), fov: lerp(a.fov, b.fov ?? a.fov, k) }, u, o.shake ?? 0.08, o.seed ?? 5);
  };
const DOOR: V3 = [0.07, 0, 3.6];
const AX: V3 = [-0.33, 0, 0.944];            // the plant / the payoff: the lens looks along the car side toward the cab end, ~19 deg onto the doors
// THE PLANT / THE PAYOFF: knee height, 0.5-0.9 m back from the tactile row, a slow slide + creep toward the cab end
const plant = (from: number, to: number) => shotCam(from, to, (d) => lowWideTrack({ subject: [-0.4, 0, 3.6], axis: AX, dist: [3.2, 2.7], side: [-0.45, 0.05], height: 0.55, lookH: 1.3, fov: 58, ease: "inOut", seed: 13 }, d));

// ---------------------------------------------------------------- script v2 (the bible's shot table)
const MARKS_V2: Record<string, V3> = {
  s07: [-0.4, 0, 3.6],     // car 1's FRONT door (the bag's door; ground point by the edge), station A
  s08: [0.4, 0, 3.6],      // car 1's front doorway (the bag), station B
  s09: [-1.6, 0, 1.15],    // the tourist filming the cab's side window
  s14: [-4.1, 0, 6.55],    // the tourist at the vending machines (TP.vendFront; the machines face -Z at z 7.3, the door + bag 5 m behind his right shoulder)
  s18: [-2.0, 0, 3.45],    // the tourist 2 m from the doorway, phone up
  s20: [-0.4, 0, 3.6],     // = s07 exactly
  s21: [0.075, 0, 3.6],    // car 1's front-door window (moves with the train)
  s22: [-1.45, 0, 6.2],    // the tourist's phone (POV), two steps toward the edge
};
const M = MARKS_V2;
const CAMS_V2: Record<string, ShotCam> = {
  s07: plant,
  s20: plant,
  // square to the front doorway, easing back as he hops out toward the lens (the bag stays centred)
  s08: (from, to) => shotCam(from, to, (d) => pullBack({ from: [-1.2, 1.35, 3.6], target: [0.4, 1.1, 3.6], amount: 1.375, rise: 0.3, fov: 55, ease: "inOut", seed: 14 }, d)),
  // from in front of the cab end: the tourist films the driver's window, the open doorway + bag behind him on the left
  s09: (from, to) => shotCam(from, to, orbitV({ t0: L3(M.s09, DOOR, 0.2), t1: L3(M.s09, DOOR, 0.22), r: [3.2, 3.2], h: [1.3, 1.3], a0: 155, a1: 200, lookH: 1.3, fov: 52, seed: 15 })),
  // (2026-11-19 evening: the vending corner moved to the kiosk's cab-end wall; from behind him (a 180) round his left
  // side to the red machine's corner (a 300): the lens then looks back over him at the open door + the bag)
  s14: (from, to) => shotCam(from, to, orbitV({ t0: [M.s14[0], 0, M.s14[2] + 0.3], t1: L3(M.s14, DOOR, 0.12), r: [2.3, 1.75], h: [1.35, 1.35], a0: 180, a1: 300, lookH: 1.3, fov: 54, seed: 20 })),
  // over his right shoulder (his phone) round to his laughing face with the REAL doorway + bag 2 m behind him
  s18: (from, to) => shotCam(from, to, orbitV({ t0: L3(M.s18, DOOR, 0.1), t1: L3(M.s18, DOOR, 0.2), r: [1.4, 1.6], h: [1.5, 1.5], a0: 145, a1: 240, lookH: 1.45, fov: 50, seed: 24 })),
  // trucking with car 1's front-door window as the train pulls away (0.6 -> 1.2 m/s); the platform columns slide behind
  s21: (from, to) => shotCam(from, to, (d) => followSide({ subject: (u) => [M.s21[0], 0, M.s21[2] - 0.15 - (0.6 * u + 0.3 * u * u)], side: -2.6, lead: 0.2, height: 1.25, lookH: 1.3, fov: 55, seed: 27 }, d)),
  // his phone POV: tilt down to his sneakers on the tactile row, then up to the tail at the vanishing point
  s22: (from, to) => shotCam(from, to, (d) => povHandheld({ from: [M.s22[0], 1.5, M.s22[2]], to: [M.s22[0] + 0.25, 1.5, M.s22[2] - 0.9], fov: 62, shake: 0.5, stepHz: 1.6, bob: 0.012, seed: 28,
    look: (u) => {
      const down = u < 0.75 ? EASE.inOut(u / 0.75) : 1 - EASE.inOut((u - 0.75) / 0.75);
      const pitch = (-2.5 - 28 * Math.max(0, down)) * D2R, x = M.s22[0] + 0.25 * Math.min(1, u / d), z = M.s22[2] - 0.9 * Math.min(1, u / d);
      return [x + 0.02, 1.5 + Math.tan(pitch) * 10, z - 10];
    } }, d)),
};

// ---------------------------------------------------------------- script v3 (LOCKED 2026-11-19: 25 shots, 16 here)
// sound/pointing/script_v3/shot_outline_v3.json; times from THE CLOCK (../timeline.ts: cuts, EV, L), never typed
// seconds. Every shot has a real, calm move (CORE's camSpeedStats: never under 0.15 %/frame; measured values in
// kit/rail/NOTES.md): arcs round the look point, slide-and-push; linear on purpose (an eased move stands still at the
// cuts). Keys exist both as "s07" and as "v3_s07".
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
/** the suitcase's mark in car 1's front doorway (the trailing half; the set's JP.bag is this point) */
const BAG: V3 = [0.32, 0.03, 3.9];
/** v3 marks: where things stand (PLATFORM_PLAN_V3 in the set reads the same numbers) */
export const V3M = {
  bag: BAG,
  /** FRAME 0 (s01) + THE LAST SHOT (s24) = ONE set-up across the loop seam (SCRIPT_v3 1.1 + 5.4), on a long lens
   *  (fov 21) from across the platform so the suitcase behind the door glass is as large as the frame allows (the
   *  yellow above the 0.34 m door-glass sill is 15 % of the frame height, 27 % with its raised handle; his face 19 %).
   *  The lens is 1.5 m high and looks a little DOWN: his face sits at ~31 % from the top, his fingertip + the handle +
   *  the yellow top in the MIDDLE (40-52 %), the whole yellow above the caption band (67-75 %).
   *  He stands on the RIGHT half; the door window slides LEFT (seen from this platform a leaving train always moves to
   *  screen left: the script's frame is the mirror image). ONE move: the lens dollies in at `v` m/s (his face 16 % of
   *  the frame height at the last shot's first frame, 19 % on frame 0, 21 % at 1.0 s, 28 % at the first cut) and slides
   *  toward -Z WITH the window, `orbit` deg/s round him (square on to the car side exactly on frame 0).
   *  `run0` = metres the train has run on frame 0 (it left at EV.glideB: `payoffRun`), `bagDz` = how far the suitcase
   *  is then from the line lens -> him (= at his fingertip). `xs` = where he sits across the frame (0..1) at the last
   *  shot's start / on frame 0 (the suitcase then fills the left half, its handle at his fingertip) / at the first cut; `lookY` = the height the lens aims at, at his distance. */
  frame0: {
    run0: 1.1, bagDz: 0.77, tourist: [-1.3, 0, BAG[2] - 1.1 + 0.77] as V3,     // bagDz 0.62 -> 0.77 (S-15, 2026-11-20): ~0.1 frame width of clear space between his shoulder and the suitcase's near edge, so his straight arm reads as a point with the tip just short of it
    camY: 1.5, fov: 21, d0: 7.0,   // LOOK TEST 2026-11-20: d0 5.53 -> 7.0 (the scene breathes: his head ~0.8x)
    v: 0.57, orbit: 5.6, lookY: [0.91, 1.07] as [number, number], xs: [0.7, 0.75, 0.6] as [number, number, number],
    /** the last shot's / the first shot's length (s): from the clock, so the set-up is the same on both sides of the seam for any voice */
    get lastLen() { return cutE("s24") - cutS("s24"); }, get firstLen() { return cutE("s01") - cutS("s01"); },
  },
  /** in THE BOY'S SHOT (s23) he stands this far (m, toward the cab end) from where the boy's window is at the end of the
   *  shot: the window is still coming toward him; the cut to the last shot (a wider lens, he 1 m further along) reads as
   *  the window reaching him */
  s23Lead: 0.45,
  /** HIS SPOT at station B from s12 to s20: 2.3 m from the bag, his back to it, facing the drinks machines (3 m on).
   *  `machine` = what the mock call points at (the white machine's front). */
  vend: { tourist: [-1.9, 0, 4.6] as V3, yaw: -0.64, machine: [-3.72, 1.4, 7.3] as V3 },
  /** the lens inside car 1 for the views out through the open doorway (s15, s18, s20): over the suitcase (near, lower
   *  left) and past the boy's cap (near, lower right) at him, 4.9 m away */
  inside: { cam: [2.55, 1.38, 2.5] as V3, look: [-1.85, 0.93, 4.75] as V3, fov: 29 },
};
/** THE PAYOFF TRAIN: metres car 1 has run (toward -Z) at film time t. It starts to glide at EV.glideB and has run
 *  exactly `run0` m when the film loops (t = L): one gentle constant acceleration, so the suitcase is at his fingertip
 *  on frame 0 for any voice timing. The set drives the train with this (s22, s23, s24 and s01 = t + L); the cameras
 *  that track the door window read it too. */
export const payoffAccel = () => (2 * V3M.frame0.run0) / Math.pow(Math.max(0.5, LOOP - EV.glideB), 2);
export const payoffRun = (t: number) => { const u = Math.max(0, t - EV.glideB); return 0.5 * payoffAccel() * u * u; };
/** the frame-0 set-up at `tau` seconds relative to FRAME 0 (the last shot = tau < 0, the first = 0 .. its length) */
export const frame0Cam = (tau: number): CamState => {
  const F = V3M.frame0, T = F.tourist, pre = F.lastLen, post = F.firstLen;
  const d = F.d0 - F.v * tau;                                                  // the push-in
  const a = -F.orbit * tau * D2R;                                              // the slide with the window (0 = square on, on frame 0)
  const right: V3 = [Math.sin(a), 0, Math.cos(a)];
  // he holds his place (a touch further right: the lens stays WITH the door window) for 0.8 s, then it eases back onto his face
  const xs = tau <= 0 ? lerp(F.xs[0], F.xs[1], sm(1 + tau / pre)) : tau < 0.8 ? F.xs[1] + 0.008 * (tau / 0.8) : lerp(F.xs[1] + 0.008, F.xs[2], sm((tau - 0.8) / Math.max(0.3, post - 0.8)));
  const lookY = lerp(F.lookY[0], F.lookY[1], sm(tau / post));
  const off = -(xs - 0.5) * 2 * d * Math.tan((F.fov * D2R) / 2) * (9 / 16);    // he sits at `xs` across the frame
  return withShake({ pos: [T[0] - d * Math.cos(a), F.camY, T[2] + d * Math.sin(a)], look: [T[0] + right[0] * off, lookY, T[2] + right[2] * off], fov: F.fov }, tau + 3, 0.03, 31);
};
/** a lens `dist` m from `look`, `az` deg off the square-on view of the car side (0 = looking +X at the train; + = the
 *  lens stands toward +Z, the train's rear; 90 = looking toward the cab end), `h` m high */
const sideLens = (look: V3, dist: number, az: number, h: number): V3 => [look[0] - dist * Math.cos(az * D2R), h, look[2] + dist * Math.sin(az * D2R)];
type Arc = { look: V3 | [V3, V3]; dist: [number, number]; az: [number, number]; h: number | [number, number]; fov: number | [number, number]; ease?: Ease; shake?: number; seed?: number;
  /** focus distance (m) at film time t (default: the look point) + the f-number */
  focus?: (t: number) => number; fnum?: number };
/** AN ARC: the lens swings round its look point from az[0] to az[1] while the distance (and the look point, the
 *  height, the lens) glide; linear unless `ease` says otherwise */
const arc = (p: Arc): ShotCam => (from, to) => {
  const cam = shotCam(from, to, (d) => (u: number): CamState => {
    const k = EASE[p.ease ?? "linear"](clamp01(u / d));
    const look = Array.isArray(p.look[0]) ? L3((p.look as [V3, V3])[0], (p.look as [V3, V3])[1], k) : (p.look as V3);
    const h = typeof p.h === "number" ? p.h : lerp(p.h[0], p.h[1], k), fov = typeof p.fov === "number" ? p.fov : lerp(p.fov[0], p.fov[1], k);
    return withShake({ pos: sideLens(look, lerp(p.dist[0], p.dist[1], k), lerp(p.az[0], p.az[1], k), h), look, fov }, u, p.shake ?? 0.05, p.seed ?? 5);
  });
  return p.focus ? (t) => ({ ...cam(t), focus: p.focus!(t), fnum: p.fnum ?? 4 }) : cam;
};
/** a straight LINEAR move between two lenses (slide + push + pan in one) */
const slide = (a: { pos: V3; look: V3; fov: number }, b: { pos: V3; look: V3; fov?: number }, shake = 0.05, seed = 5): ShotCam => (from, to) => shotCam(from, to, glide(a, b, { ease: "linear", shake, seed }));
// THE DOORWAY from the platform, "framed below the door header" (the outline): the lens (1.0 m high) aims LOW, so the
// header stays above the frame and the slabs + the tactile row fill the bottom quarter (under the captions). The door
// centre is z 3.6: the boy (his mum behind his shoulder) stands in its leading half (z 3.34), the suitcase in its
// trailing half (z 3.9).
const DL = (y: number, z = 3.6): V3 => [0.3, y, z];
// THE PLANT (s09, station A) = THE PAYOFF (s22, station B), the SAME lens: knee-high (0.55 m), three-quarter onto car
// 1's front door from the vending corner side; it trucks 1.95 m along the train toward the cab end and pans to hold: on
// the left a man on the platform (s09 the late salaryman, s22 the tourist, his back to the train), on the right the
// door: the boy + his mum behind the leading glass, the suitcase behind the trailing glass (yellow 11 % of the frame).
const plantV3 = slide({ pos: [-2.98, 0.55, 7.15], look: [-0.98, 1.2, 4.14], fov: 58 }, { pos: [-3.02, 0.55, 4.6], look: [-0.38, 1.2, 3.26] }, 0.05, 13);
/** the views out of car 1 through the open doorway (s15 / s18 / s20): `wide` deg more lens; the lens slides along the
 *  car from z0 to z1 (toward the cab end: the suitcase opens to the left of him), creeps `push` m toward the door and
 *  tilts from lookY y0 to y1 */
const insideCam = (wide: number, z: [number, number], push: number, y: [number, number], seed: number): ShotCam => { const I = V3M.inside;
  return slide({ pos: [I.cam[0], I.cam[1], z[0]], look: [I.look[0], y[0], I.look[2]], fov: I.fov + wide }, { pos: [I.cam[0] - push, I.cam[1], z[1]], look: [I.look[0], y[1], I.look[2]] }, 0.04, seed); };
/** the slow orbit round him at his spot (s13, s16a, s16b): the lens stands on the machines' side and looks BACK: he
 *  near on the left (his face + his phone), car 1's open doorway + the suitcase + the boy + his mum beyond on the
 *  right; as the lens swings west (az falls) the doorway closes in on his shoulder */
const ORB: V3 = [-1.2, 1.3, 4.35];
const V3_CAMS: Record<string, ShotCam> = {
  // 1 + 24: ONE set-up (the loop): 24 ends on the frame that 1 starts on
  s01: (from) => (t) => frame0Cam(t - from / 30),
  s24: (_from, to) => (t) => frame0Cam(t - to / 30),
  // 7 station A at car 1's front door, looking in (the stop, the doors open, the suitcase trundles to the threshold): a slow arc + ease in
  // (Block 14b: the gate saw 0.24 %/f on screen: an arc round the look point keeps the picture still) a TRUCK along the
  // car side + a little push: the door frame and the car body slide against the interior
  s07: slide({ pos: [-2.95, 1.0, 3.0], look: [0.3, 0.65, 3.1], fov: 42 }, { pos: [-2.7, 1.0, 3.8], look: [0.3, 0.65, 4.05] }, 0.05, 14),
  // 8 the cut-in (the boy's point, the lunge, the catch, the wag): the lens ends on the cab-end side, where he is in clear view
  // (Block 14b) the arc + the look point travelling toward the cab end with it: the picture slides, a small push
  s08: slide({ pos: [-2.75, 1.05, 4.12], look: [0.3, 0.92, 4.18], fov: 42 }, { pos: [-2.55, 1.05, 3.42], look: [0.3, 0.92, 3.3] }, 0.05, 16),
  // 9 THE PLANT (station A) / 22 THE PAYOFF (station B): the same lens
  s09: plantV3, s22: plantV3,
  // 11 station B (S-14, 2026-11-20: a NEW picture for the second stop, not s07's square doorway again): standing height
  // from the CAB-END side, the doorway in three-quarter (the boy, the bag and he all seen through the opening); he
  // parks the bag, pats it, hops out and walks away from the lens toward his spot. A linear slide + push
  s11: arc({ look: [[0.35, 0.47, 3.45], [0.35, 0.47, 4.05]], dist: [3.95, 3.3], az: [-56, -18], h: [1.64, 1.55], fov: 46, seed: 15 }),     // S-17: aimed lower so the suitcase sits above 64 % (out of the caption keep-out)
  // 12 "It stays." (S-14): LOW and CLOSE on the suitcase alone in the doorway (it is ~45 % of the frame height), the boy's
  // worried face + his mum beyond it on the left; a slow linear push
  s12: slide({ pos: [-1.6, 0.55, 4.55], look: [0.42, 0.78, 3.86], fov: 50 }, { pos: [-1.25, 0.56, 4.12], look: [0.42, 0.8, 3.5] }, 0.04, 17),
  // 13 the mock call at the drinks machines (the lens between him and the machines, looking back at him + the doorway)
  s13: slide({ pos: [-2.75, 1.42, 7.15], look: [-1.45, 1.15, 4.45], fov: 56 }, { pos: [-3.65, 1.38, 6.15], look: [-0.55, 1.15, 3.85] }, 0.05, 19),
  // 14 the doorway, tight, from the platform (the boy's urgent point at the suitcase): push + a small arc
  s14: arc({ look: DL(0.84, 3.5), dist: [2.0, 1.78], az: [6, -4], h: 0.98, fov: 42, seed: 18 }),      // the boy's whole face + his arm + the suitcase's near half and handle
  // 15 from inside the doorway, looking out at him (he turns and looks straight at the lens = the suitcase); 18 the
  // same a little wider (1.0 s); 20 the same with a slow push
  s15: insideCam(0, [3.02, 2.3], 0.75, [0.78, 1.02], 21),
  // 20 (S-13, 2026-11-20): his back (the one allowed) from LOW (0.55 m, below the boy's shoulder): the suitcase is the big
  // yellow shape lower left, the boy's pointing ARM comes in at mid height on the right (above the caption band) while
  // his head stays above the frame; the tourist's back beyond. A linear push + slide
  s20: slide({ pos: [2.65, 0.55, 3.1], look: [-1.85, 0.8, 5.15], fov: 30 }, { pos: [1.85, 0.55, 2.55], look: [-1.85, 0.74, 4.42], fov: 26.5 }, 0.04, 23),
  // 18 (S-12, 2026-11-20: NOT his back): low in the car behind the suitcase (its yellow big in the lower left), he
  // beyond the doorway at ~4 m in three-quarter, giggling into his phone; the boy beside the bag looking up at him
  s18: slide({ pos: [2.4, 0.82, 2.78], look: [-1.9, 1.04, 4.34], fov: 48 }, { pos: [1.8, 0.74, 3.16], look: [-1.9, 1.07, 4.46] }, 0.04, 22),
  // 16a the slow orbit: the focus goes to the doorway + the suitcase + the boy on "looked right at it" and back to his
  // phone-lit face on "his phone"; 16b the same orbit going on, one same-axis cut-in 1.3x closer (the lens narrows)
  s16a: arc({ look: [[-1.55, 1.3, 4.5], ORB], dist: [3.3, 3.1], az: [64, 43], h: 1.45, fov: [64, 58], seed: 24, fnum: 4,
    focus: (t) => lerp(2.4, 4.6, sm((t - EV.focusToBag) / 0.5) - sm((t - EV.focusBack) / 0.5)) }),
  s16b: arc({ look: [[-1.3, 1.3, 4.4], [-1.22, 1.3, 4.4]], dist: [2.8, 2.45], az: [43, 26], h: 1.45, fov: [39, 37.5], seed: 24 }),
  // 23 THE BOY'S SHOT ("Bag... check!"): a 34 deg lens square on car 1's door glass, the boy's window and the
  // suitcase's window filling the frame; it tracks the windows toward the cab end (the look point rides with the
  // train: payoffRun) while it pulls back 2 m, fast at first: the tourist's head comes in at the left edge and is
  // whole from about the middle of the shot ("check!"), with the boy's window closing in on it.
  // (S-9, 2026-11-20) it now STARTS 3.5 m from the glass (the boy's head ~18 % of the frame height on "Bag...", both
  // windows filling the frame, the tourist still out at the left), pulls back linearly to 6.3 m by 55 % of the shot
  // (his whole head in at the left on "check!", the boy ~12 %), then drifts on slowly (12 % of the travel) while the
  // window comes toward him. In a 9:16 frame that holds his head AND both windows the boy cannot be more than ~12 %.
  s23: (from, to) => (t) => {
    const u = clamp01((t - from / 30) / Math.max(1e-3, (to - from) / 30)), k = u < 0.6 ? (0.8 * u) / 0.6 : 0.8 + (0.2 * (u - 0.6)) / 0.4;     // (Block 14: calmer, the gate saw 2.27)
    const paneZ = 3.26 - payoffRun(t);                                         // the boy's window (its centre on the standing train: z 3.26)
    return withShake({ pos: [-3.6 - 2.5 * k, 1.42, 2.55], look: [0.08, 0.97, paneZ + lerp(0.3, 0.05, k)], fov: 34 }, t - from / 30, 0.04, 27);
  },
};
const V3_MARKS: Record<string, V3> = {
  s01: V3M.frame0.tourist, s24: V3M.frame0.tourist, s07: [0.4, 0, 3.6], s08: [0.4, 0, 3.6], s09: [-0.4, 0, 3.6], s22: [-0.4, 0, 3.6], s11: [0.4, 0, 3.6], s12: [0.4, 0, 3.6],
  s13: V3M.vend.tourist, s14: [0.4, 0, 3.6], s15: V3M.vend.tourist, s18: V3M.vend.tourist, s20: V3M.vend.tourist, s16a: V3M.vend.tourist, s16b: V3M.vend.tourist, s23: [0.075, 0, 3.6],
};
/** both id forms: "s07" and "v3_s07" */
const both = <T,>(m: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(m).flatMap(([k, v]) => [[k, v], ["v3_" + k, v]]));
export const CAMS_jp_platform_v3: Record<string, ShotCam> = both(V3_CAMS);
const MARKS_V3: Record<string, V3> = both(V3_MARKS);

export const CAMS_jp_platform: Record<string, ShotCam> = SCRIPT === "v3" ? CAMS_jp_platform_v3 : CAMS_V2;
export const MARKS_jp_platform: Record<string, V3> = SCRIPT === "v3" ? MARKS_V3 : MARKS_V2;

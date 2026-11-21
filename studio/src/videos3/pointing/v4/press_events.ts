// THE PICTURE EVENTS on the v4 clock (DIRECTOR, 2026-11-21, for SOUND's action sounds and anyone who keys on the picture):
// the moments the picture does something, in film seconds. Derived from the clock (EV, the words) and the owners' own
// exported timing, so a re-time or an owner's timing change moves the sounds by itself. Kept out of timeline.ts on
// purpose: these modules import the clock, so the clock must not import them (no import cycle). probe_v4.mjs json writes
// all of these under "EV" in briefs/v3/pointing/director/timeline_v4.json.
import { EV, FPS, S, cutS, cutE, FRAMES } from "./timeline";
import { GO_PRESS, RED_DOWN } from "../cast/beats_v4";
import { FIVE_PRESS } from "./sets/lab_hall";
import { restFrames } from "./camkit";

const tryS = (k: string) => { try { return S(k); } catch { return NaN; } };

// ---- the opening (CAST's press timing)
/** the six green presses: the fingertip on the dome = goN onset + lag + travel frames (cast/beats_v4 GO_PRESS) */
export const PRESS: number[] = EV.goFlashes.map((s, k) => {
  const p = GO_PRESS[k]; return p ? s + (p[0] + p[1]) / FPS : NaN;
});
/** how long the fingertip stays on the dome for each green press (frames) */
export const PRESS_HOLD_F: number[] = EV.goFlashes.map((_, k) => GO_PRESS[k]?.[2] ?? 0);
/** the red press: the hand starts down at red + start and lands travel frames later (about f179), and stays */
export const RED_PRESS: number = EV.red + (RED_DOWN.start + RED_DOWN.travel) / FPS;

// ---- the hall (LAB's lab_hall.ts)
/** v10b "Five press anyway.": the five hands LAND one after another (lab_hall FIVE_PRESS: from "five" + lead + k x gap,
 *  travel frames down); the X over each head pops on its landing */
export const FIVE_LAND: number[] = [0, 1, 2, 3, 4].map((k) => tryS("five#1") + (FIVE_PRESS.lead + k * FIVE_PRESS.gap + FIVE_PRESS.travel) / FPS);
/** v13 "point at the light, and say it.": the point wave, one volunteer after another, 3 frames apart from "point"
 *  (lab_hall: p0 = point#1 + 3 x i, each held 20 f); the first six are in the frame */
export const WAVE_POINT: number[] = Array.from({ length: 12 }, (_, i) => tryS("point#1") + (3 * i) / FPS);
/** v14 "Not one presses.": all twelve point at the red together on "Not" */
export const NOT_ONE: number = tryS("not#1");

// ---- the steam engine (TRAIN's steam.ts CAMS.v22: the lens slides from 9 m ahead to 9 m behind; the engine overtakes it)
/** v22: the engine is in the frame from the cut; it passes the lens about half way through the move */
export const ENGINE_IN: number = FRAMES.v22 ? cutS("v22") : NaN;
export const ENGINE_PASS: number = FRAMES.v22 ? cutS("v22") + 0.5 * (cutE("v22") - restFrames(FRAMES.v22[0], FRAMES.v22[1]) / FPS - cutS("v22")) : NaN;

// ---- New York (STATION's ny_station.ts: T_POINT = "conductors" - 0.1 s; doors T_POINT + 0.75 s, open 0.6 s; arm down +25 f)
/** v32: the conductor's point snaps (the point whoosh) */
export const NY_POINT: number = tryS("conductors#1") - 0.1;
/** v32: the doors START sliding (the chime + the slide) and are fully open 0.6 s later; his arm drops at +25 f */
export const NY_DOORS: number = NY_POINT + 0.75;
export const NY_DOORS_OPEN: number = NY_DOORS + 0.6;
export const NY_ARM_DROP: number = NY_POINT + 25 / FPS;

// ---- names SOUND reads (lead 2026-11-21 round 2; aliases kept beside the director's own names)
/** v10b: each X becomes visible ON its landing (lab_hall: popK(t, fiveLand(k))) */
export const X_POPS: number[] = FIVE_LAND;
/** v10b: the board shows "n OF 12" from the n-th landing: it flips 1->2 .. 4->5 on landings 2..5 (lab_hall nX) */
export const BOARD_FLIPS: number[] = FIVE_LAND.slice(1);
/** v16: the bored man's hand taps by itself: on "hand" and 12 f later (lab_hall tapper beats; PROVISIONAL until LAB's
 *  v16 re-stage lands: then the landing frames of its dome squash) */
export const AUTO_TAPS: number[] = [tryS("hand#1"), tryS("hand#1") + 12 / FPS];
/** v22: the white egrets lift off the paddy (steam.ts: t22 + 0.05 + i x 0.07, six birds); the first lift */
export const BIRDS_LIFT_EACH: number[] = [0, 1, 2, 3, 4, 5].map((i) => (FRAMES.v22 ? cutS("v22") : NaN) + 0.05 + i * 0.07);
export const BIRDS_LIFT: number = BIRDS_LIFT_EACH[0];
/** v36: the lamp turns GREEN on "point" (lab_plan: point#6) and goes dark at the start of the 12-frame tail (EV.loopTail) */
export const LOOP_LAMP_ON: number = tryS("point#6");
export const LOOP_LAMP_OFF: number = EV.loopTail;

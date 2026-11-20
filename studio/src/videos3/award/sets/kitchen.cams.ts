// CAMERAS of the shots on set 'kitchen' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_kitchen: Record<string, V3> = {
  "s01": [0, 0, 0],  // the fridge wall
  "s06": [0, 0, 0],  // the kitchen table
  "s07": [0, 0, 0],  // the fridge
  "s17": [0, 0, 0],  // the fridge, evening
  "s20": [0, 0, 0],  // the fridge, the same morning
  "s22": [0, 0, 0],  // the fridge wall = frame 0
};
export const CAMS_kitchen: Record<string, ShotCam> = {
  "s01": mk("pushIn", MARKS_kitchen["s01"], {"fov": 55, "height_m": 1.3, "dist_m": [2.6, 1.1], "ease": "inOut"}, 7),
  "s06": mk("macroTopDown", MARKS_kitchen["s06"], {"fov": 50, "height_m": 1.6, "ease": "inOut"}, 12),
  "s07": mk("orbit", MARKS_kitchen["s07"], {"fov": 50, "height_m": 1.3, "dist_m": [2.2, 1.8], "ease": "inOut", "a0": -40, "a1": 35}, 13),
  "s17": mk("orbit", MARKS_kitchen["s17"], {"fov": 45, "height_m": 1.35, "dist_m": [1.3, 1.3], "ease": "inOut", "a0": -45, "a1": 40}, 23),
  "s20": mk("pushIn", MARKS_kitchen["s20"], {"fov": 55, "height_m": 1.3, "dist_m": [1.6, 1.3], "ease": "inOut"}, 26),
  "s22": mk("pullBack", MARKS_kitchen["s22"], {"fov": 55, "height_m": 1.3, "dist_m": [2.3, 2.6], "ease": "out"}, 28),
};

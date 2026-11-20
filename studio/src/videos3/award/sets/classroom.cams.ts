// CAMERAS of the shots on set 'classroom' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_classroom: Record<string, V3> = {
  "s02": [0, 0, 0],  // the back of the class, the empty desk
  "s15": [0, 0, 0],  // the blue row
  "s16": [0, 0, 0],  // the wall calendar + the empty desk
  "s18": [0, 0, 0],  // the chalkboard
};
export const CAMS_classroom: Record<string, ShotCam> = {
  "s02": mk("pushIn", MARKS_classroom["s02"], {"fov": 60, "height_m": 1.0, "dist_m": [4.0, 2.6], "ease": "out"}, 8),
  "s15": mk("followSide", MARKS_classroom["s15"], {"fov": 55, "height_m": 1.0, "dist_m": [4.5, 4.5], "ease": "inOut", "walk_mps": 0.9}, 21),
  "s16": mk("pushIn", MARKS_classroom["s16"], {"fov": 55, "height_m": 1.3, "dist_m": [2.8, 1.3], "ease": "inOut"}, 22),
  "s18": mk("pushIn", MARKS_classroom["s18"], {"fov": 55, "height_m": 1.1, "dist_m": [3.0, 1.8], "ease": "inOut"}, 24),
};

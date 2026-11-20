// CAMERAS of the shots on set 'bedroom' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_bedroom: Record<string, V3> = {
  "s19": [0, 0, 0],  // the bed at dawn
  "s21": [0, 0, 0],  // the bedside table
};
export const CAMS_bedroom: Record<string, ShotCam> = {
  "s19": mk("craneDown", MARKS_bedroom["s19"], {"fov": 55, "height_m": 2.4, "dist_m": [2.4, 1.4], "ease": "inOut"}, 25),
  "s21": mk("pushIn", MARKS_bedroom["s21"], {"fov": 50, "height_m": 0.8, "dist_m": [1.0, 0.7], "ease": "out"}, 27),
};

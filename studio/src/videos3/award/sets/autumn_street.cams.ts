// CAMERAS of the shots on set 'autumn_street' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_autumn_street: Record<string, V3> = {
  "s03": [0, 0, 0],  // mid-street under the trees
  "s04": [0, 0, 0],  // along the street to the school fence
};
export const CAMS_autumn_street: Record<string, ShotCam> = {
  "s03": mk("lowWideTrack", MARKS_autumn_street["s03"], {"fov": 70, "height_m": 0.5, "dist_m": [3.4, 2.4], "ease": "inOut"}, 9),
  "s04": mk("followSide", MARKS_autumn_street["s04"], {"fov": 55, "height_m": 1.0, "dist_m": [5.0, 5.0], "ease": "linear", "walk_mps": 1.0}, 10),
};

// CAMERAS of the shots on set 'home_hall' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_home_hall: Record<string, V3> = {
  "s05": [0, 0, 0],  // the doormat
};
export const CAMS_home_hall: Record<string, ShotCam> = {
  "s05": mk("pushIn", MARKS_home_hall["s05"], {"fov": 72, "height_m": 0.2, "dist_m": [2.2, 0.8], "ease": "out"}, 11),
};

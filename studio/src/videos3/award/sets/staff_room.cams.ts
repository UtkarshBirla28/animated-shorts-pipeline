// CAMERAS of the shots on set 'staff_room' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_staff_room: Record<string, V3> = {
  "s13": [0, 0, 0],  // the whiteboard end
};
export const CAMS_staff_room: Record<string, ShotCam> = {
  "s13": mk("pullBack", MARKS_staff_room["s13"], {"fov": 60, "height_m": 1.5, "dist_m": [2.0, 5.5], "ease": "inOut"}, 19),
};

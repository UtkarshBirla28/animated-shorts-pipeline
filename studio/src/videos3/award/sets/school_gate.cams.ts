// CAMERAS of the shots on set 'school_gate' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_school_gate: Record<string, V3> = {
  "s14": [0, 0, 0],  // the gate
};
export const CAMS_school_gate: Record<string, ShotCam> = {
  "s14": mk("craneDown", MARKS_school_gate["s14"], {"fov": 60, "height_m": 3.5, "dist_m": [5.0, 3.5], "ease": "inOut"}, 20),
};

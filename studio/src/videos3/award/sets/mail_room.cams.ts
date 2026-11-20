// CAMERAS of the shots on set 'mail_room' (first pass from the bible's presets; this set's BUILDER owns this file:
// set each MARK from the set layout, tune params, keep the preset unless the bible changes). Check the speeds with
// node ../tools/v3/cam_speed.mjs --film src/videos3/award/film.ts (targets: tools/v3/targets.json).
import type { V3 } from "../../../kit/core/ctx";
import { mk, type ShotCam } from "../camkit";
export const MARKS_mail_room: Record<string, V3> = {
  "s08": [0, 0, 0],  // the stamping station
  "s09": [0, 0, 0],  // above the sorting table
  "s10": [0, 0, 0],  // the grey tray
  "s11": [0, 0, 0],  // the blue pile
  "s12": [0, 0, 0],  // the yellow pile
};
export const CAMS_mail_room: Record<string, ShotCam> = {
  "s08": mk("pullBack", MARKS_mail_room["s08"], {"fov": 55, "height_m": 1.2, "dist_m": [0.9, 4.5], "ease": "inOut"}, 14),
  "s09": mk("droneRise", MARKS_mail_room["s09"], {"fov": 60, "height_m": 2.4, "dist_m": [2.4, 4.0], "ease": "out", "rise": 2.5, "forward": -1.2}, 15),
  "s10": mk("pushIn", MARKS_mail_room["s10"], {"fov": 50, "height_m": 1.1, "ease": "linear", "dist_m": [2.2, 1.5]}, 16),
  "s11": mk("pullBack", MARKS_mail_room["s11"], {"fov": 45, "height_m": 1.15, "dist_m": [0.8, 1.9], "ease": "inOut"}, 17),
  "s12": mk("pushIn", MARKS_mail_room["s12"], {"fov": 50, "height_m": 1.2, "dist_m": [1.8, 0.9], "ease": "inOut"}, 18),
};

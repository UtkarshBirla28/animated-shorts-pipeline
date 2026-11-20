// LOOK of the hall + court (owner HALL; first pass by the LEAD): hall = the pivot's NEW colour world (a warm, chalky
// community hall: cream plaster, honey cork, soft sun through tall windows); court = calm pale daylight on blond wood.
import { ROOM, LightPreset, WorldLook, BloomLook, C3, SKY_NOON, CLOUD_DAY } from "./lightbase";
import type { GradeParams } from "./grade";
import type { InkLook } from "./ink";

// (sets_hall.ts aims its sun shafts + floor pane patches along these, so the painted light and the shafts agree)
export const KEY_HALL: C3 = [0.74, 0.43, 0.52];   // a low warm afternoon sun through the tall +x windows, front-right
export const KEY_COURT: C3 = [-0.7, 0.5, 0.5];    // soft daylight from the high left windows, front-left
export const LIGHTS: Record<string, LightPreset> = {
  hall: { ...ROOM, el: 34, key: KEY_HALL, lit: [1.85, 1.6, 1.24], shade: [0.48, 0.4, 0.56], lift: [0.03, 0.022, 0.036], lambert: 0.3, term: 0.14,
    charTint: [1.0, 0.95, 0.88], blob: [0.56, 0.44, 0.52], woodShade: [0.52, 0.4, 0.42], woodK: 0.5, fog: "#efe0c8" },
  court: { ...ROOM, el: 46, key: KEY_COURT, lit: [1.5, 1.46, 1.38], shade: [0.48, 0.46, 0.62], lift: [0.026, 0.026, 0.04], lambert: 0.32, term: 0.18,
    charTint: [0.99, 0.98, 0.98], sideTint: [0.92, 0.92, 0.98], blob: [0.52, 0.5, 0.62], woodShade: [0.56, 0.48, 0.56], woodK: 0.5, fog: "#e4e0d8" },
};
export const LOOK: Record<string, WorldLook> = {
  hall: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.04, 0.03, 0.02], sat: 1.0 },
  court: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.03, 0.03, 0.03], sat: 1.0 },
};
export const GRADES: Record<string, GradeParams> = {
  hall: { ky: [0.034, 0.1, 0.255, 0.54, 0.8, 0.935, 1], sat: [1.04, 1.12, 1.04], tintS: [0.022, 0.014], tintM: [-0.004, 0.004], tintH: [-0.012, 0.004],
    vig: [0.24, 0.4], ev: 0.06, vigCol: [0.4, 0.24, 0.2], floor: [34, 20, 28] },
  // fix3 (owner: blown judges): the top two knots down (.94 -> .905, .995 -> .955) and ev .06 -> .03, so whites sit under ~92 %
  court: { ky: [0.03, 0.096, 0.25, 0.54, 0.79, 0.905, 0.955], sat: [1.0, 1.06, 1.02], tintS: [0.03, 0.002], tintM: [0.002, 0.0], tintH: [-0.008, 0.002],
    vig: [0.2, 0.42], ev: 0.03, vigCol: [0.2, 0.2, 0.3], floor: [22, 22, 34] },
};
export const INK: Record<string, InkLook> = {
  hall: { color: "#2B1A16", concave: 0.25, surf: 0.3, ao: 0.72, aoTint: "#A8806E" },
  court: { color: "#2A2024", concave: 0.25, surf: 0.3, ao: 0.72, aoTint: "#8E8496" },
};
export const BLOOM: Record<string, BloomLook> = { hall: { th: 1.6, maxK: 1, i: 0.55 }, court: { th: 1.7, maxK: 1, i: 0.35 } };   // fix3: court bloom .5 -> .35 (the halo sat on the faces)

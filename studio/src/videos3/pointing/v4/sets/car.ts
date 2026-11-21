// v4 SET ENTRY 'car' (owner TRAIN; briefs/v3/pointing/V4_STRUCTURE.md): THE PACKED FRONT CAR, shot v21 ("Signal
// clear!"): a small kid at the left front window of the car, right behind the driver, copies his point (mouth open);
// commuters swaying at the straps, the straps swinging, the country streaming past the side windows. The build is
// ./today.ts (shared with the cab); the v3 car set (../../sets/car.ts) stays for the v3 film.
import { buildToday } from "./today";
import { type ShotCam, type View } from "../camkit";

export const build = buildToday({ lod: "far", kid: true, crowd: true, name: "set:car_v4" });

/** v21 (0.8 s, the shout): from the right half of the car front, the kid in PROFILE at the left partition window, his
 *  copying arm side-on toward the glass (the driver beyond it), mouth open; behind him (screen left) the packed car
 *  swaying at the straps, the country in the side windows. NO move (the shot is short): the director's rest. (From
 *  behind him, the arm hid behind his back: tried) */
/** (lead round 4: restaged) the lens further back and lower (the kid's eye height), the kid three-quarter toward us,
 *  WHOLE (feet above the caption band), his raised arm toward the glass on screen right, the driver beyond the left
 *  partition window just right of him, his white glove out at the green lamp */
export const VIEWS: Record<string, View> = {
  v21: { pos: [0.42, 1.32, 4.45], look: [-0.8, 0.74, 2.12], fov: 58, fnum: 5.6 },
};
const still = (v: View): ShotCam => () => () => ({ pos: v.pos, look: v.look, fov: v.fov, fnum: v.fnum ?? 8, focus: Math.hypot(v.look[0] - v.pos[0], v.look[1] - v.pos[1], v.look[2] - v.pos[2]) });
export const CAMS: Record<string, ShotCam> = { v21: still(VIEWS.v21) };

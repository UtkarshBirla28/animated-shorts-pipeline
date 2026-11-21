// v4 SET ENTRY 'cab' (owner TRAIN; briefs/v3/pointing/V4_STRUCTURE.md): TODAY'S CAB, shot v20 ("...point at their
// signals, and shout."): the driver (cap, white gloves) snaps a crisp side-on point at the GREEN signal that is IN the
// frame through the windscreen; the track and the country rushing at us, the speedometer needle, a mast shadow sweeping
// the cab. The build is ./today.ts (shared with the car); the v3 cab set (../../sets/cab.ts) stays for the v3 film.
import { buildToday, todayRun, lampOf, DRIVER_AT, SIDE } from "./today";
import { glideRest, type ShotCam, type View } from "../camkit";

/** THE LEAD'S CHOICE for v20 (one flag): false = the inside view through the cut-away partition (current), true = the
 *  SIDE-ON EXTERIOR (the driver in profile at his crew window points at a short green signal just ahead of the nose;
 *  the train creeps into a station). Both are built and keyed; flip this and nothing else */
export const V20_SIDE_ON = false;   // (fix round 2: inside over his shoulder: the glove against the bright windscreen, the signal ahead)   // (audit r1, 04:40: back to the INSIDE driver-cam: the side-on point was the weakest point of the film; real drivers point ahead through the windscreen)
export const build = V20_SIDE_ON
  ? buildToday({ lod: "near", kid: false, crowd: false, name: "set:cab_v4_side", sideOn: true })
  : buildToday({ lod: "near", kid: false, crowd: false, name: "set:cab_v4", cutaway: "v20" });

/** v20: THE picture of the film. The cab PARTITION is cut away for this shot (cabJP `partition`), the lens 2.3 m behind
 *  and 0.7 m right of the driver at shoulder height (nearer, his cartoon head filled a third of the frame): him (cap, navy, white gloves) on the left, his arm going sideways
 *  across the bright windscreen to the GREEN lamp up ahead on the right, the track streaming at us. A short push.
 *  (Without the cut-away the wall, his seat back and a portrait frame only ~35 deg wide hid him or the lamp: tried) */
export const VIEWS: Record<string, { a: View; b: View }> = {
  v20: {
    // (audit r1: one real push, 0.5 m, then the rest)
    // (R2b, lead 09:25: "turn the lens round him": behind-RIGHT of him, low: his face in PROFILE (he turns to the right-hand
    // signal) on the left third, the sleeve across the middle, the white glove on the bright windscreen, the green signal
    // beyond it on the right third; the head ~1/5; no ceiling slab)
    a: { pos: [0.28, 1.46, 4.2], look: [-0.72, 0.2, -1.2], fov: 56, fnum: 5.6 },
    b: { pos: [0.2, 1.45, 3.7], look: [-0.8, 0.2, -1.2], fov: 56, fnum: 5.6 },   // (r2b clip: the signal was just outside the right edge: lens left, aimed between his head (left third) and the signal (right third))
  },
};
/** the side-on lens: outside on the left, level with the cab, square to its side, 5 m out; it rides with the train
 *  (the cab steady, the country creeping behind); a breath of push */
export const VIEWS_SIDE: Record<string, { a: View; b: View }> = {
  // (lead round 4: ONE real glide, ~0.5 m toward the window + the signal (the DIRECTOR's probe: "v20 completely still"), then the rest)
  v20: { a: { pos: [-7.45, 1.36, 0.76], look: [-1.12, 1.3, 0.76], fov: 27.5, fnum: 8 }, b: { pos: [-7.0, 1.35, 0.76], look: [-1.12, 1.3, 0.76], fov: 25.5, fnum: 8 } },   // (lead 02:15: a LONG lens: driver, forearm, glove and lamp in one tight frame, head ~1/7; one push + zoom, then rest)   // (c1 clip: a slide forward pushed him off the right edge; cold f1022: the push centred at z 0.66 still cut his back: a straight 0.7 m push centred between the lamp and him)
};
export const CAMS: Record<string, ShotCam> = { v20: V20_SIDE_ON ? glideRest(VIEWS_SIDE.v20.a, VIEWS_SIDE.v20.b) : glideRest(VIEWS.v20.a, VIEWS.v20.b) };
void SIDE;
void todayRun; void lampOf; void DRIVER_AT;

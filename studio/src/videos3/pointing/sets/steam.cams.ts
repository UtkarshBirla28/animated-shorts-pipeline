// CAMERAS of set 'steam' (TRAIN owner). Set frame = the loco frame (kit/vehicles/steam_loco.ts): rail top y 0, the
// front buffer beam z 0, the cab z 6.25..7.95 (floor 1.38 m, roof 3.32), the tender z 8.25..14, the train runs -Z, the
// driver on the LEFT (x < 0). Every framing is ONE calm move that never stops + a little handheld (the cab shakes on a
// steam engine: a bit more than on the EMU). NAMED framings; the DIRECTOR maps the v4 shot ids onto them (BY_SHOT).
// Figures are small / medium on purpose (the look plan: no head over ~1/3 of the frame).
import type { V3 } from "../../../kit/core/ctx";
import type { ShotCam } from "../camkit";
import { glide, path, EZ } from "./cab.cams";
import { withShake } from "../../../kit/core/camera";

export const MARKS_steam: Record<string, V3> = {
  hori: [-0.62, 2.95, 6.95], fireman: [0.38, 2.9, 7.45], official: [0.05, 2.95, 7.85], firehole: [0, 1.86, 6.33], chimney: [0, 3.8, 0.8],
};
/** THE EVENT PICTURE as its own move: low (knee height) and close on the front three-quarter, the engine big and coming
 *  at us (buffer beam + smokebox large, wheels + rods readable), the horizon tilted a touch, the smoke streaming back over
 *  the top of the frame; the lens falls back a little as if the train outruns it */
const eventCam: ShotCam = (from, to) => (t) => {
  const u = t - from / 30, k = EZ.soft(u / Math.max(1e-3, (to - from) / 30));
  const p: V3 = [-8.4 - 0.3 * k, -0.6 + 0.12 * k, -8.6 + 1.6 * k], l: V3 = [-0.4, 1.75 + 0.1 * k, 1.6 + 0.6 * k];
  return withShake({ pos: p, look: l, fov: 40 - 1.5 * k, roll: -0.07 + 0.015 * k }, u, 0.12, 47);
};
export const FRAMES_steam = {
  // line 13: THE HARD CUT, the event picture (see eventCam)
  event: eventCam,
  // line 13: Hori leaning to the small round spectacle window, peering hard; the lens behind his left shoulder looks with
  // him through the glass at the semaphore, which stays SOFT (focus on him ~1 m, a wide aperture). A breath of push
  cabSide: glide({ p: [-0.8, 2.66, 8.25], l: [-0.86, 2.8, -40], fov: 44 }, { p: [-0.8, 2.66, 8.05], l: [-0.86, 2.8, -40], fov: 43 }, { shake: 0.14, seed: 61, focus: 1.6, fnum: 2.2 }),
  // lines 14-15: THE WIDE CAB, a side cut-away (the left side sheets hidden by the plan's `cutaway`): from beside the cab,
  // behind its left back corner: both men whole and medium, the firebox glow the warm centre, the green country and the
  // blue sky rushing past through the right side opening and over the tender, coal, steam, the shovel
  wideCab: glide({ p: [-3.35, 2.5, 10.0], l: [0.05, 2.12, 6.9], fov: 50 }, { p: [-3.25, 2.48, 9.75], l: [0.05, 2.12, 6.9], fov: 50 }, { shake: 0.18, seed: 67 }),
  // lines 15-16: THE COAL MAN LEANS OUT of the left opening, looks at the semaphore ahead and bellows "Clear!": from
  // outside, ahead and left, his grin in front three-quarter, the black boiler side + brass near right, smoke streaming
  coalOut: glide({ p: [-3.9, 3.0, 3.9], l: [-1.1, 2.8, 7.1], fov: 40 }, { p: [-3.7, 2.98, 4.2], l: [-1.1, 2.8, 7.1], fov: 39 }, { shake: 0.14, seed: 71 }),
  // line 17: THE BOSS squeezed into the cab's right back corner (dark suit, bowler, notebook), delighted: the same side
  // cut-away, a little wider and further back so all three read whole
  boss: glide({ p: [-3.5, 2.55, 10.4], l: [0.2, 2.15, 7.1], fov: 52 }, { p: [-3.4, 2.52, 10.1], l: [0.2, 2.15, 7.1], fov: 52 }, { shake: 0.18, seed: 53 }),
  // line 18: THE FUNNIEST PICTURE: Hori nose to the round glass, peering, and behind him the boss beams and nods. From
  // just outside the RIGHT side opening looking across the cab: Hori in profile at the left window (facing screen
  // right), the boss behind him in three-quarter; the country beyond the left opening. A slow push (hold it)
  noseGlass: glide({ p: [2.05, 2.85, 6.35], l: [-0.55, 2.6, 6.62], fov: 58 }, { p: [1.92, 2.84, 6.42], l: [-0.55, 2.6, 6.62], fov: 57 }, { shake: 0.12, seed: 79 }),
  // (older framings kept for reference)
  twoShot: glide({ p: [0.12, 2.95, 9.05], l: [-0.05, 2.25, 6.7], fov: 58 }, { p: [-0.05, 2.92, 8.85], l: [-0.05, 2.25, 6.7], fov: 57 }, { shake: 0.2, seed: 67 }),
  frame0: glide({ p: [-4.3, 2.75, 3.6], l: [-1.15, 2.85, 7.0], fov: 38 }, { p: [-4.1, 2.74, 3.9], l: [-1.15, 2.85, 7.0], fov: 37 }, { shake: 0.14, seed: 37 }),
};
/** v4 shot id -> framing: filled by the DIRECTOR when SCRIPT_v4's shot list lands (both "<id>" and "v3_<id>" forms) */
const BY_SHOT: Record<string, keyof typeof FRAMES_steam> = {};
export const CAMS_steam: Record<string, ShotCam> = Object.fromEntries(Object.entries(BY_SHOT).flatMap(([id, k]) => [[id, FRAMES_steam[k]], ["v3_" + id, FRAMES_steam[k]]]));

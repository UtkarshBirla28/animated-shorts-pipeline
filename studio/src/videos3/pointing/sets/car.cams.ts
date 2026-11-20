// CAMERAS of the shots on set 'car' (TRAIN owner). Set frame = the train frame of kit/vehicles with the CAR FLOOR at
// y = 0: car 1's cab partition at z = 2.15, its doors at z 3.6 / 8.42 / 13.24 / 18.06, the aisle |x| < 0.87 between the
// bench fronts (|x| < 1.40 inside a doorway), the strap rails at x = +-0.86, y 1.99 (ring bottoms 1.63), the hanging
// ads' lower edge 1.885, the ceiling 2.16-2.33. Staging (./train_stage.ts STAGE): the boy at the aisle half of the
// RIGHT partition window (0.62, 2.28), the tourist at its wall half, half a metre back (1.12, 2.62; from s05 a step
// further back, 2.95), mum by the left door (-1.0, 3.4), the suitcase at his knee, aisle side (0.64, 2.9), bumping the
// wall under the window (0.68, 2.42) under braking; at the second stop the suitcase alone on the ochre strip of the LEFT front doorway
// (-1.1, 3.6), the platform beyond (x < -1.55).
// Every framing is ONE calm move that never stops (./cab.cams glide / path) + a little handheld; NAMED and mapped to the
// locked outline's shot ids. Speeds (CORE camSpeedStats, % of the frame per frame): see kit/vehicles/NOTES.md.
import type { V3 } from "../../../kit/core/ctx";
import type { ShotCam } from "../camkit";
import { glide, path } from "./cab.cams";

export const MARKS_car: Record<string, V3> = {
  touristFace: [1.02, 1.38, 2.62],
  kidFace: [0.62, 1.0, 2.28],
  bagKnee: [0.64, 0.4, 2.9],
  bagDoor: [-1.1, 0.4, 3.6],
};
/** the car's framings (the locked outline's shot in brackets). The lens stays at x < 0.65: the train's forward (the cab
 *  end) is into the screen or screen LEFT, as on the platform, where it leaves to screen left */
export const FRAMES_car = {
  // [s02] THE MATCH CUT (the same man one minute earlier): the first 10 frames hold his laughing face exactly where
  // s01 leaves it (STATION's frame0Cam at its last frame: his eyes at 55 % of the width, 38 % of the height, the
  // frame 1.45 m high at his face = the lens 1.55 m from it at fov 50), drifting a breath. Frames 10-40: the lens eases
  // back down the aisle and sinks, fastest first (never over 4.2 %/f), to the whole yellow suitcase at his knee, the
  // boy at the glass; the suitcase is whole in frame by frame 20. Then it keeps creeping back. The end pose stops at
  // the first seats (z 5.2): no crowd card within 1.3 m ahead of it
  laugh: path([
    [0, { p: [0.52, 1.36, 4.09], l: [0.981, 1.206, 2.607], fov: 50 }],
    [10, { p: [0.51, 1.352, 4.135], l: [0.981, 1.206, 2.607], fov: 50 }, "linear"],
    [40, { p: [0.42, 0.95, 4.95], l: [0.9, 0.78, 2.72], fov: 50 }, "outQuad"],
    [1, { p: [0.36, 0.9, 5.17], l: [0.9, 0.74, 2.72], fov: 50 }, "linear"],
  ], { shake: 0.15, seed: 8 }),
  // [s04] the two-shot at the cab glass, in PROFILE from the aisle side (a long lens from the wall by the left door,
  // as far back as the car allows: cartoon heads are half a metre wide): the glass at the left edge, the boy's one
  // finger on it, his face turned up; right above and behind him the tourist's laughing face (~19 % of the frame
  // height) and his jab at the glass; the suitcase's top at his knee, bottom right. They face screen LEFT (the
  // train's forward). A slide toward the glass with a small push. Mum is by the left door, behind the lens
  // (Block 14b: a real lateral truck of 0.32 m along the glass with the look travelling with it, plus a small push: the gate
  // measured the old slide at 0.26 %/f on screen)
  twoShot: glide({ p: [-1.32, 1.2, 2.74], l: [1.0, 1.06, 2.66], fov: 44 }, { p: [-1.18, 1.18, 2.42], l: [1.0, 1.04, 2.36], fov: 42 }, { shake: 0.12, seed: 10 }),
  // [s05] a forward glide over the packed car that sinks and LANDS behind the suitcase by 60 % of the shot (before it
  // starts to creep back, EV.bagCreep), then slides on to his side of the aisle and sinks to knee height: the
  // suitcase's side and its two near wheels at frame left, his legs at frame right, the gap between shoe and wheel
  // across the frame (the right foot reaches to screen left, EV.footHook), his face and the phone in the top of the
  // frame (he does not look). It flies UNDER the hanging ads (lens below 1.8 m), in the aisle, clear of the cards
  aisleGlide: path([
    // high by the cab glass, looking back down the packed car (the sleeper at his strap, the students, the grandma,
    // the stroller), then a sink and a turn down to the tourist in the doorway zone; it LANDS at his knees, low and
    // in front of him, before the suitcase starts to creep (T-8: his shoe, the gap and the wheel across the frame, the
    // case's body behind the wheel, his face + phone at the top)
    [0, { p: [-0.25, 1.82, 2.5], l: [0.25, 1.35, 12], fov: 60 }],
    [0.45, { p: [0.15, 1.15, 2.48], l: [0.7, 0.95, 5.0], fov: 64 }, "soft"],
    [0.62, { p: [0.42, 0.78, 2.46], l: [0.82, 0.7, 3.7], fov: 76 }, "soft"],
    // (fov 80: the shoe + the wheel at ~79 % of the frame height, BELOW the caption keep-out 65.6-75 % and above the
    // Shorts title overlay (bottom 17 %); his bowed face in the top of the frame)
    [1, { p: [0.56, 0.72, 2.42], l: [0.86, 0.66, 3.7], fov: 80 }, "linear"],
  ], { shake: 0.12, seed: 9 }),
  // [s10] from the aisle (s02's set-up): the tourist to his own phone, a hand on the suitcase handle, the boy's frown
  // below; a slide to his side of the aisle with a push while the platform of station B slides in outside
  selfie: glide({ p: [-0.12, 1.44, 5.25], l: [0.88, 1.1, 2.85], fov: 54 }, { p: [0.5, 1.36, 4.6], l: [0.88, 1.1, 2.85], fov: 54 }, { shake: 0.2, seed: 14 }),
  // from INSIDE the doorway, the lens IS the suitcase (STATION's platform set films s15 / s18 / s20 this way with the
  // real platform outside; this one looks out at the lineside's lite platform)
  doorOut: glide({ p: [-0.36, 1.17, 3.78], l: [-3.9, 1.12, 3.3], fov: 62 }, { p: [-0.5, 1.14, 3.7], l: [-3.9, 1.14, 3.3], fov: 60 }, { shake: 0.1, seed: 15 }),
  // the doorway from inside, wide (the suitcase alone on the strip, the open door, the platform)
  doorWide: glide({ p: [0.85, 1.34, 5.05], l: [-1.2, 0.75, 3.55], fov: 58 }, { p: [0.55, 1.22, 4.6], l: [-1.2, 0.72, 3.55], fov: 58 }, { shake: 0.1, seed: 16 }),
  // down the aisle from the cab end (the whole packed car)
  aisle: glide({ p: [0.16, 1.52, 2.9], l: [0, 1.25, 12], fov: 62 }, { p: [0.06, 1.48, 3.5], l: [0, 1.25, 12], fov: 62 }, { shake: 0.12, seed: 18 }),
};
/** shot id -> framing, with EXACTLY the locked outline's ids: s02 the laugh, s04 the two-shot, s05 the glide to the
 *  creeping suitcase, s10 the car running in (s15 / s18 / s20, from inside the doorway, are in STATION's platform set).
 *  The DIRECTOR's cams.ts looks a shot up in the table of its OWN set, "v3_<id>" first, then the plain id: both forms
 *  are keyed, to the same camera. */
const BY_SHOT: Record<string, keyof typeof FRAMES_car> = { s02: "laugh", s04: "twoShot", s05: "aisleGlide", s10: "selfie" };
export const CAMS_car: Record<string, ShotCam> = Object.fromEntries(Object.entries(BY_SHOT).flatMap(([id, k]) => [[id, FRAMES_car[k]], ["v3_" + id, FRAMES_car[k]]]));

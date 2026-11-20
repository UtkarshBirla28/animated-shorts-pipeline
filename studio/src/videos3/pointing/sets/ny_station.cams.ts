// CAMERAS of the shots on set 'ny_station' (NYC owner). Layout (kit/subway/station.ts): tracks along X, platform top y 0,
// platform edge z 0 (platform on +z), the conductor's window stops at x 0 (car side z -0.12), the zebra board hangs at
// (0, 2.35, 0.95) facing the train, column lines at x = +-2.285 + k 4.57 (z 1.75). Speeds: node ../tools/v3/cam_speed.mjs.
// WIN_ny_station records each shot's [start, end] film seconds when shots.ts builds the cameras, so the set can act per
// shot (train arrival in s10, doors in s12, no board in s13) without importing shots.ts.
import type { V3 } from "../../../kit/core/ctx";
import { shotCam, lowWideTrack, pullBack } from "../../../kit/core/camera";
import type { ShotCam } from "../camkit";

export const WIN_ny_station: Record<string, [number, number]> = {};
const reg = (id: string, mk: ShotCam): ShotCam => (from, to) => { WIN_ny_station[id] = [from / 30, to / 30]; return mk(from, to); };

export const MARKS_ny_station: Record<string, V3> = {
  s10: [0, 0, -0.12],   // the platform point below the conductor's window when the train stops
  s12: [0.25, 0, 0.55], // between his head (leaning out) and the board: both stay in frame on the descent
  s13: [0.4, 1.6, 0.05], // the look point just right of his head (the shut door + riders come into frame on the pull back)
};
export const CAMS_ny_station: Record<string, ShotCam> = {
  // knee height by a column (the near column wipes out of frame left on the slide), the train glides in from the left
  s10: reg("s10", (from, to) => shotCam(from, to, (d) => lowWideTrack({ subject: MARKS_ny_station.s10, axis: [-0.75, 0, 1], dist: [4.0, 3.2], side: [-0.6, 0.6],
    height: 0.45, lookH: 1.4, fov: 62, ease: "inOut", shake: 0.05, seed: 16 }, d))),
  // the descending glide from high beside the board down to just behind his shoulder (board upper right, his head left)
  s12: reg("s12", (from, to) => shotCam(from, to, (d) => lowWideTrack({ subject: MARKS_ny_station.s12, axis: [-1, 0, 0.1], dist: [3.6, 2.3], side: [1.0, 0.3],
    height: [2.8, 1.65], lookH: 1.95, fov: 55, ease: "inOut", shake: 0.04, seed: 18 }, d))),
  // eases back from tight on him (left) to reveal the shut door and the waiting faces (right)
  s13: reg("s13", (from, to) => shotCam(from, to, (d) => pullBack({ from: [-0.6, 1.5, 1.45], target: MARKS_ny_station.s13, amount: 1.35, rise: 0.3, fov: 55, ease: "inOut", shake: 0.05, seed: 19 }, d))),
};

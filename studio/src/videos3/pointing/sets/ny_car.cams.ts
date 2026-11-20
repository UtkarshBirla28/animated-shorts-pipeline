// CAMERAS of the shots on set 'ny_car' (NYC owner). Layout: the car (kit/subway/train.ts) at the origin along X, floor
// y 0, side A (+z, the open doors) faces the tunnel wall at z 2.31; the hero doorway is the door at x 2.29.
// WIN_ny_car records the shot's [start, end] film seconds (see ny_station.cams.ts).
import type { V3 } from "../../../kit/core/ctx";
import { shotCam, lowWideTrack } from "../../../kit/core/camera";
import type { ShotCam } from "../camkit";

export const WIN_ny_car: Record<string, [number, number]> = {};
const reg = (id: string, mk: ShotCam): ShotCam => (from, to) => { WIN_ny_car[id] = [from / 30, to / 30]; return mk(from, to); };

export const MARKS_ny_car: Record<string, V3> = {
  s11: [2.05, 0, 1.12],   // the commuter at the open doorway (hand on the door pole)
};
export const CAMS_ny_car: Record<string, ShotCam> = {
  // a slow slide-and-push from the bench side toward the open doorway; ends medium on him, the wall filling the doorway
  s11: reg("s11", (from, to) => shotCam(from, to, (d) => lowWideTrack({ subject: MARKS_ny_car.s11, axis: [-1, 0, -0.55], dist: [3.2, 1.9], side: [-0.45, 0.35],
    height: 1.45, lookH: 1.35, fov: 55, ease: "inOut", shake: 0.05, seed: 17 }, d))),
};

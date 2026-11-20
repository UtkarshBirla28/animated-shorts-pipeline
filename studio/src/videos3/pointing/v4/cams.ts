// v4 CAMERAS (DIRECTOR): a v4 shot's camera = the set owner's camera for the shot id (CAMS["v4_<id>"] or CAMS["<id>"] in
// the set's camera table, re-exported by v4/sets/<set>.ts), else the director's default view of the set (camkit.ts),
// then the director's REST (camkit.withRest): every shot ends still.
import type { CamState } from "../../../kit/core/ctx";
import { DEFAULT_VIEW, pushRest, withRest, type ShotCam } from "./camkit";
import { CAMS as CAMS_cab } from "./sets/cab";
import { CAMS as CAMS_car } from "./sets/car";
import { CAMS as CAMS_jp_platform } from "./sets/jp_platform";
import { CAMS as CAMS_lab } from "./sets/lab";
import { CAMS as CAMS_kitchen } from "./sets/kitchen";
import { CAMS as CAMS_ny_station } from "./sets/ny_station";
import { CAMS as CAMS_steam } from "./sets/steam";

export const CAM_TABLES: Record<string, Record<string, ShotCam>> = {
  cab: CAMS_cab, car: CAMS_car, jp_platform: CAMS_jp_platform, lab: CAMS_lab, kitchen: CAMS_kitchen, ny_station: CAMS_ny_station, steam: CAMS_steam,
};
/** the owner's camera of a v4 shot, or null */
export const ownerCam = (id: string, set: string): ShotCam | null => CAM_TABLES[set]?.["v4_" + id] ?? CAM_TABLES[set]?.[id] ?? null;
/** the shot's camera, glide then rest; `missing` collects the shots on the director's default view */
export const camOf = (id: string, set: string, from: number, to: number, rest: number | undefined, missing: string[]): ((t: number) => CamState) => {
  const own = ownerCam(id, set);
  if (!own) missing.push(id);
  const sc: ShotCam = own ?? pushRest(DEFAULT_VIEW[set] ?? DEFAULT_VIEW.cab, 0.35, rest);
  return withRest(sc(from, to), from, to, rest);
};

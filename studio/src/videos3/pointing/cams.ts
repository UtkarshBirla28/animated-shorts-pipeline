// THE CAMERA OF EVERY SHOT (DIRECTOR): the merge of the set owners' camera tables. Each owner keeps its cameras in
// sets/<set>.cams.ts (re-exported through sets/<set>.ts, so a camera tweak re-renders only that set's shots). The
// owners key their v3 cameras as "v3_s07" and / or "s07"; some tables still carry bible-v2 ids ("s05" of the old
// table), so a shot's camera is looked up ONLY in the table of the shot's own set, the "v3_" key first.
// No ny_station / ny_car / kitchen here: New York and the kitchen are out of this film (their set files are kept).
import type { ShotCam } from "./camkit";
import { CAMS_cab } from "./sets/cab";
import { CAMS_car } from "./sets/car";
import { CAMS_jp_platform } from "./sets/jp_platform";
import { CAMS_lab } from "./sets/lab";

export const CAM_TABLES: Record<string, Record<string, ShotCam>> = { cab: CAMS_cab, car: CAMS_car, jp_platform: CAMS_jp_platform, lab: CAMS_lab };
/** the owner's v3 camera of a shot ("v3_<id>"), or null */
export const ownerCamV3 = (id: string, set: string): ShotCam | null => CAM_TABLES[set]?.["v3_" + id] ?? null;
/** the owner's camera under the plain id (v3 on the platform; on other sets it may be a bible-v2 camera of the same id) */
export const ownerCamPlain = (id: string, set: string): ShotCam | null => CAM_TABLES[set]?.[id] ?? null;

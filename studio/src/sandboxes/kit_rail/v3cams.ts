// STATION: the platform's own v3 cameras as a bare film (no sets, no cast), for CORE's camera-speed measure:
//   node tools/v3/cam_speed.mjs --film studio/src/sandboxes/kit_rail/v3cams.ts        (from the repo root)
// = sets/jp_platform.cams.ts WITHOUT the director's film-level layer (film.ts DIR_MOVE / DIR_REAIM).
import type { Film, ShotDef } from "../../kit/core/ctx";
import { CAMS_jp_platform_v3 } from "../../videos3/pointing/sets/jp_platform.cams";
import { FRAMES, SHOT_IDS, TOTAL } from "../../videos3/pointing/timeline";

const IDS = SHOT_IDS.filter((id) => CAMS_jp_platform_v3[id]);
export const FILM: Film = {
  slug: "kit_rail_v3cams", fps: 30, total: TOTAL, sets: {},
  shots: IDS.map((id): ShotDef => ({ id, from: FRAMES[id][0], to: FRAMES[id][1], set: "p", rig: "golden", cam: CAMS_jp_platform_v3[id](FRAMES[id][0], FRAMES[id][1]) })),
};

// v4 SET ENTRY 'jp_platform' (owned by the set's owner: see briefs/v3/pointing/V4_STRUCTURE.md). kit_render hashes this file's own
// import graph per set, so a fix here re-renders only this set's v4 shots. FIRST PASS: the v3 set + its camera table
// (v4 cameras are keyed by the v4 shot ids "v01".., or "v4_v01"..). An owner may replace the re-export with a v4 build
// (new staging on the v4 clock: import { cutS, S, FRAMES } from "../timeline") whenever ready; keep the names build / CAMS.
export { build_jp_platform as build, CAMS_jp_platform as CAMS } from "../../sets/jp_platform";

// THE v4 FILM of 'pointing' (DIRECTOR): the true story, one narrator. Shots = shot_plan.ts on the v4 clock (timeline.ts),
// cameras = cams.ts (owner camera or the director's default, always ending in a REST), sets = v4/sets/<set>.ts.
// Entry: src/videos3/pointing/v4/index.ts, composition PointingV4Kit, out/pointing_v4/. The v3 film (../film.ts) is untouched.
import type { Film, RigSpec, ShotDef } from "../../../kit/core/ctx";
import { SHOT_PLAN } from "./shot_plan";
import { FPS, FRAMES, TOTAL, TIMELINE_NOTES, WORD_SOURCE } from "./timeline";
import { camOf } from "./cams";
import { build as build_cab } from "./sets/cab";
import { build as build_car } from "./sets/car";
import { build as build_jp_platform } from "./sets/jp_platform";
import { build as build_lab } from "./sets/lab";
import { build as build_kitchen } from "./sets/kitchen";
import { build as build_ny_station } from "./sets/ny_station";
import { build as build_steam } from "./sets/steam";

/** the rig per set (owners and LOOK tune the light inside their sets; a shot may override with shot_plan `rig`) */
const RIG: Record<string, { rig: string; rigOpts?: Partial<RigSpec> }> = {
  cab: { rig: "golden" }, car: { rig: "golden" }, jp_platform: { rig: "golden" }, steam: { rig: "golden" },
  lab: { rig: "interiorWarm" }, kitchen: { rig: "interiorWarm" }, ny_station: { rig: "undergroundWarm" },
};
const missing: string[] = [];
export const SHOTS: ShotDef[] = SHOT_PLAN.map((p) => {
  const [from, to] = FRAMES[p.id], r = RIG[p.set] ?? { rig: "golden" };
  return { id: p.id, from, to, set: p.set, rig: p.rig ?? r.rig, ...(r.rigOpts ? { rigOpts: r.rigOpts } : {}), cam: camOf(p.id, p.set, from, to, p.rest, missing) };
});
if (typeof window !== "undefined") {
  console.warn(`[pointing v4] ${SHOTS.length} shots, ${TOTAL} f = ${(TOTAL / FPS).toFixed(2)} s, words from ${WORD_SOURCE}`);
  if (missing.length) console.warn(`[pointing v4] on the director's default view (no owner camera yet): ${missing.join(" ")}`);
  if (TIMELINE_NOTES.length) console.warn("[pointing v4] timeline: " + TIMELINE_NOTES.join(" | "));
}
export const MISSING_CAMS = missing;
export const FILM: Film = {
  slug: "pointing_v4", fps: 30, total: TOTAL, shots: SHOTS,
  sets: { cab: build_cab, car: build_car, jp_platform: build_jp_platform, lab: build_lab, kitchen: build_kitchen, ny_station: build_ny_station, steam: build_steam },
};

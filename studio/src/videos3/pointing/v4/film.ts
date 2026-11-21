// THE v4 FILM of 'pointing' (DIRECTOR): the true story, one narrator. Shots = shot_plan.ts on the v4 clock (timeline.ts),
// cameras = cams.ts (owner camera or the director's default, always ending in a REST), sets = v4/sets/<set>.ts.
// Entry: src/videos3/pointing/v4/index.ts, composition PointingV4Kit, out/pointing_v4/. The v3 film (../film.ts) is untouched.
import type { Film, RigSpec, ShotDef } from "../../../kit/core/ctx";
import { SHOT_PLAN } from "./shot_plan";
import { FPS, FRAMES, TOTAL, TIMELINE_NOTES, WORD_SOURCE } from "./timeline";
import { camOf } from "./cams";
import { withLook, SHOT_RIG } from "./look";   // LOOK v5 hooks (SET_LOOK per set, SHOT_RIG per shot), wired 2026-11-21 00:58
import { build as build_cab } from "./sets/cab";
import { build as build_car } from "./sets/car";
import { build as build_jp_platform } from "./sets/jp_platform";
import { build as build_lab } from "./sets/lab";
import { build as build_kitchen } from "./sets/kitchen";
import { build as build_ny_station } from "./sets/ny_station";
import { build as build_steam, RIGOPTS as RIGOPTS_steam } from "./sets/steam";

/** the rig per set (owners and LOOK tune the light inside their sets; a shot may override with shot_plan `rig`) */
const RIG: Record<string, { rig: string; rigOpts?: Partial<RigSpec> }> = {
  cab: { rig: "golden" }, car: { rig: "golden" }, jp_platform: { rig: "golden" }, steam: { rig: "golden" },
  lab: { rig: "interiorWarm" }, kitchen: { rig: "interiorWarm" }, ny_station: { rig: "undergroundWarm" },
};
/** the set owners' per-shot light (TRAIN's steam RIGOPTS: sun direction + exposure per shot), merged over the set rig,
 *  under LOOK's SHOT_RIG trims (wired 2026-11-21 02:25) */
const OWNER_RIG: Record<string, Partial<RigSpec>> = { ...RIGOPTS_steam };
const missing: string[] = [];
export const SHOTS: ShotDef[] = SHOT_PLAN.map((p) => {
  const [from, to] = FRAMES[p.id], r = RIG[p.set] ?? { rig: "golden" };
  return { id: p.id, from, to, set: p.set, rig: p.rig ?? r.rig, rigOpts: { ...(r.rigOpts ?? {}), ...(OWNER_RIG[p.id] ?? {}), ...(SHOT_RIG[p.id] ?? {}) }, cam: camOf(p.id, p.set, from, to, p.rest, missing, p.drift, p.freeze, p.driftMaxM) };
});
if (typeof window !== "undefined") {
  console.warn(`[pointing v4] ${SHOTS.length} shots, ${TOTAL} f = ${(TOTAL / FPS).toFixed(2)} s, words from ${WORD_SOURCE}`);
  if (missing.length) console.warn(`[pointing v4] on the director's default view (no owner camera yet): ${missing.join(" ")}`);
  if (TIMELINE_NOTES.length) console.warn("[pointing v4] timeline: " + TIMELINE_NOTES.join(" | "));
}
export const MISSING_CAMS = missing;
export const FILM: Film = {
  slug: "pointing_v4", fps: 30, total: TOTAL, shots: SHOTS,
  // every set through LOOK's withLook (SET_LOOK[set] runs once after the owner's build; empty-safe)
  sets: Object.fromEntries(Object.entries({ cab: build_cab, car: build_car, jp_platform: build_jp_platform, lab: build_lab, kitchen: build_kitchen,
    ny_station: build_ny_station, steam: build_steam }).map(([k, b]) => [k, withLook(k, b)])),
};

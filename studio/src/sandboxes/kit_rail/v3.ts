// STATION sandbox, second composition `KitRailV3` = THE TRUE-TIME STORYBOARD of script v3's 16 platform shots.
// It builds the platform set ONCE with the film's own shot table (../../videos3/pointing/shots.ts, times from the
// clock) and the film's own plan (PLATFORM_PLAN_V3), and shows chosen FILM frames with this set's own cameras
// (sets/jp_platform.cams.ts, without the director's film-level layer): sample k = sandbox frames 3k .. 3k + 2 = film
// frames F - 1, F, F + 1, so the still (frame 3k + 1) is film frame F exactly, with its real motion blur. The set, the
// train, the doors and CAST's acting all run at the remapped film time (the cast reads the same shots.ts / words).
//   node scripts/kit_render.mjs --entry src/sandboxes/kit_rail/index.ts --comp KitRailV3 --quality draft --frames 0-<3n-1> --conc 1 --out out/kit_rail_v3/
// The sample list is printed in the page log ("[kit_rail_v3] samples: ...").
import type { Film, CamState, ShotDef } from "../../kit/core/ctx";
import { buildPlatform, JP_RIG, PLATFORM_PLAN_V3 } from "../../videos3/pointing/sets/jp_platform";
import { CAMS_jp_platform_v3 } from "../../videos3/pointing/sets/jp_platform.cams";
import { SHOT_TABLE } from "../../videos3/pointing/shots";

/** where to look inside each shot: fractions of its length (0 = its first frame), or "f<n>" = n frames after its start */
const WHERE: Record<string, (number | string)[]> = {
  s01: ["f0", "f2", "f21", "f42", 0.97], s24: [0, 0.5, 0.96], s23: [0.08, 0.3, 0.55, 0.94], s22: [0.1, 0.45, 0.9], s09: [0.1, 0.45, 0.9],
  s07: [0.15, 0.45, 0.6, 0.75, 0.95], s08: ["f36", "f45", "f50", "f60", 0.9], s11: [0.25, 0.6, 0.92], s12: [0.2, 0.8], s13: [0.2, 0.8], s14: [0.5, 0.9],
  s15: ["f1", "f18", 0.5, 0.75, 0.95], s16a: [0.1, 0.55, 0.9], s16b: [0.1, 0.9], s18: [0.5], s20: [0.2, 0.5, 0.85],
};
const PER = 3;
type Sample = { id: string; shot: string; film: number; look: keyof typeof JP_RIG; cam: (t: number) => CamState };
export const SAMPLES: Sample[] = SHOT_TABLE.filter((r) => r.set === "jp_platform").flatMap((r) =>
  (WHERE[r.id] ?? [0.2, 0.8]).map((q): Sample => {
    const len = r.to - r.from, film = typeof q === "string" ? r.from + Math.min(len - 1, +q.slice(1)) : Math.min(r.to - 1, r.from + Math.round(q * (len - 1)));
    return { id: `${r.id}_f${film - r.from}`, shot: r.id, film, look: (r.look ?? "bag") as keyof typeof JP_RIG, cam: CAMS_jp_platform_v3[r.id](r.from, r.to) };
  }));
/** sandbox time -> film time (by FRAME: the shutter is centred, so the sub-frames just before a sample's first frame belong to that sample) */
const remap = (t: number): number => {
  const f = t * 30, k = Math.max(0, Math.min(SAMPLES.length - 1, Math.floor((Math.round(f) + 1e-6) / PER)));
  return (SAMPLES[k].film - 1 + (f - k * PER)) / 30;
};
if (typeof window !== "undefined") console.warn("[kit_rail_v3] samples: " + SAMPLES.map((s, k) => `${k}:${s.id}@${s.film}`).join(" "));
export const FILM_V3: Film = {
  slug: "kit_rail_v3", fps: 30, total: SAMPLES.length * PER,
  sets: { p: async (ctx) => { const b = await buildPlatform(ctx, { table: SHOT_TABLE, plan: PLATFORM_PLAN_V3 }); return { ...b, update: (t, cam) => b.update?.(remap(t), cam) }; } },
  shots: SAMPLES.map((s, k): ShotDef => ({ id: s.id, from: k * PER, to: k * PER + PER, set: "p", rig: "golden", rigOpts: JP_RIG[s.look] as ShotDef["rigOpts"], cam: (t) => s.cam(remap(t)) })),
};

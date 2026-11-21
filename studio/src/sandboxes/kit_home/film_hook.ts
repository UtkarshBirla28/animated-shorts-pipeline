// LAB sandbox film for v4 (owner LAB): LAB's v4 sets ALONE (the lab = booth + 1994 hall, videos3/pointing/v4/sets/lab.ts;
// the morning kitchen, v4/sets/kitchen.ts) on the FILM's own frames (v4/timeline.ts FRAMES): every lab / kitchen shot of
// the v4 plan with the FILM's own camera wrapper (cams.ts camOf: LAB's camera by role + the director's drift, freeze and
// rest), so a sandbox still at frame N is the film's frame N for every LAB shot; every other frame shows frame 0's lens held.
// Stills: node scripts/kit_render.mjs --entry src/sandboxes/kit_home/index.ts --comp KitHomeHook --quality draft --stills 0,60,..
import type { Film, ShotDef } from "../../kit/core/ctx";
import { build, VIEWS } from "../../videos3/pointing/v4/sets/lab";
import { build as buildKitchen } from "../../videos3/pointing/v4/sets/kitchen";
import { SHOT_PLAN } from "../../videos3/pointing/v4/shot_plan";
import { FRAMES, TOTAL } from "../../videos3/pointing/v4/timeline";
import { withRest, pushRest } from "../../videos3/pointing/v4/camkit";
import { camOf } from "../../videos3/pointing/v4/cams";

const filler = pushRest(VIEWS.A0, 0, 15);
const missing: string[] = [];
const shots: ShotDef[] = SHOT_PLAN.map((p) => {
  const [from, to] = FRAMES[p.id], kit = p.set === "kitchen", mine = kit || p.set === "lab";
  return { id: p.id, from, to, set: kit ? "kitchen4" : "lab4", rig: "interiorWarm",
    cam: mine ? camOf(p.id, p.set, from, to, p.rest, missing, p.drift, p.freeze) : withRest(filler(from, to), from, to, p.rest) };
});
export const HOOK_FILM: Film = { slug: "kit_home_hook", fps: 30, total: TOTAL, sets: { lab4: build, kitchen4: buildKitchen }, shots };

// LAB sandbox film for the v4 HOOK (owner LAB): the v4 lab set (videos3/pointing/v4/sets/lab.ts) on the hook's own clock
// (lab_plan.ts: the v4 clock's words when they exist, else the plan of the locked hook), without the film's other sets.
//   A    0 .. "Did"          frame 0, the green, the seven Go's (push-in), the red, the stillness
//   B    "Did" .. +1.45 s    her frozen stare up at the red lamp, the big red X
//   gap  (nothing)
//   loop 9.0 .. 11.2 s       the LAST shot: frame 0's lens, her arm up at the lamp, mouth open (here moved after the hook)
// Stills: node scripts/kit_render.mjs --entry src/sandboxes/kit_home/index.ts --comp KitHomeHook --quality draft --stills 0,..
import type { Film, ShotDef } from "../../kit/core/ctx";
import { build, camHookA, camHookB, camLoop } from "../../videos3/pointing/v4/sets/lab";
import { HOOK, fr } from "../../videos3/pointing/v4/sets/lab_plan";

if (HOOK.source === "plan") HOOK.loop = [9.0, 11.2];
const RIG = { sunAz: 95, sunEl: 25 };
const a1 = fr(HOOK.A[1]), b1 = fr(HOOK.B[1]), l0 = fr(HOOK.loop[0]), l1 = fr(HOOK.loop[1]);
const row = (id: string, from: number, to: number, cam: ShotDef["cam"]): ShotDef => ({ id, from, to, set: "lab4", rig: "interiorWarm", rigOpts: RIG, cam });
export const HOOK_FILM: Film = { slug: "kit_home_hook", fps: 30, total: Math.max(l1, b1) + 1, sets: { lab4: build },
  shots: [row("A", 0, a1, camHookA(0, a1)), row("B", a1, b1, camHookB(a1, b1)), ...(l0 > b1 ? [row("gap", b1, l0, camLoop(b1, l0))] : []), row("loop", Math.max(l0, b1), l1 + 1, camLoop(l0, l1))] };

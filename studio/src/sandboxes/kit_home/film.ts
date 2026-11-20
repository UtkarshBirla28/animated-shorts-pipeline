// LAB sandbox film (owner LAB): the film's own lab set + its own cameras ON THE FILM'S CLOCK (videos3/pointing/
// timeline.ts: the real frames of s17 / s19), without the film's other sets (a broken file of another set cannot break
// these stills, and the bundle is small).
//   pre   0 .. s17         nothing happens (never rendered; a Film must cover [0, total))
//   s17   the EYE half: six balls                      (script v3 plan: frames 1397-1502)
//   s18   the one-second cutaway (here the lens holds; not a lab shot in the film)
//   s19   the FINGER half: one ball, the hold          (script v3 plan: frames 1533-1637)
//   post  1 s of the end state (for stills)
// Stills (from studio/; --info prints the frames):
//   node scripts/kit_render.mjs --entry src/sandboxes/kit_home/index.ts --comp KitHomeLab --quality draft
//     --stills 1400,1460,1500,1540,1585,1625,1637 --out out/pointing/lab/        (then --quality final)
import type { Film, ShotDef } from "../../kit/core/ctx";
import { build_lab } from "../../videos3/pointing/sets/lab";
import { CAMS_lab } from "../../videos3/pointing/sets/lab.cams";
import { FRAMES } from "../../videos3/pointing/timeline";

const RIG = { sunAz: 95, sunEl: 25 };                                  // the film's shot table gives the lab this sun
const A = FRAMES.s17, G = FRAMES.s18, B = FRAMES.s19, END = B[1] + 30;
const cam = (from: number, to: number) => CAMS_lab.v3_s17(from, to);
const row = (id: string, from: number, to: number): ShotDef => ({ id, from, to, set: "lab", rig: "interiorWarm", rigOpts: RIG, cam: cam(from, to) });
export const LAB_FILM: Film = { slug: "kit_home_lab", fps: 30, total: END, sets: { lab: build_lab },
  shots: [row("pre", 0, A[0]), row("s17", A[0], A[1]), row("s18", G[0], G[1]), row("s19", B[0], B[1]), row("post", B[1], END)] };

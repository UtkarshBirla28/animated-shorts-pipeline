// THE v4 SHOT TEMPLATE (DIRECTOR): copy this file to v4/sets/<your set>.ts (keep the names `build` and `CAMS`), then
// change the marked lines. It compiles as it is (tsc) and is NOT in the film (film.ts does not import it).
// THE RULES OF A v4 SHOT (briefs/v3/pointing/V4_STRUCTURE.md, section 2):
//  1. ONE place, ONE action. People small or medium: a head at most a quarter of the frame height (only the shot plan's
//     `closeUp` shots may go bigger).
//  2. The action is 2-3 HELD POSES that SNAP (CAST's beats: "point" with still: true, "face" with still: true, "nod"),
//     cued on WORDS of the v4 script ("pointing#2", "@v19+4"), never on typed seconds. No reaching arms, no hand over a face,
//     points sideways at a thing IN the frame, never at the lens.
//  3. At least THREE background movers that are not the main figure (walkers in depth, a prop that turns or blinks,
//     the world outside a window). No floating dust specks.
//  4. The camera: ONE glide, then a REST (camkit.glideRest / pushRest / slideRest; film.ts freezes the last 15-40 frames
//     of every shot anyway). No constant creep, no handheld shake on a rest.
//  5. Captions sit in the band y 1260-1440 (65.6-75 % of the height): keep the action above 64 %.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../../kit/core/ctx";
import { castCardOf } from "../../cast/member";
import { actBeats, timeBeats, walkedM, type Beat } from "../../cast/moves";
import { build_jp_platform } from "../../sets/jp_platform";            // <- your set's geometry (or build your own)
import { R_V4 } from "../resolver";
import { FPS, cutS, cutE } from "../timeline";
import { pushRest, slideRest, type ShotCam } from "../camkit";

const SHOT = "v09";                                                     // <- the v4 shot id this staging is for
const inShot = (t: number) => t >= cutS(SHOT) && t < cutE(SHOT);
const AWAY: V3 = [-50, -10, -50];                                       // a card parked out of sight outside its shot

// (2) the action: three held poses that snap, cued on the script's words
const BEATS: Beat[] = [
  { who: "driver", m: "face", at: `@${SHOT}`, until: "pointing#1", expr: "focusB", still: true },        // pose 1: looks ahead
  { who: "driver", m: "point", at: "pointing#1", until: `@${SHOT}.end`, still: true },                   // pose 2: the point snaps, held
  { who: "driver", m: "face", at: "pointing#1+6", until: `@${SHOT}.end`, expr: "bright", still: true },  // pose 3: the face lands
  // (3) movers: two commuters walking in depth (CAST's walk cycle)
  { who: "volunteer", m: "walk", at: `@${SHOT}`, until: `@${SHOT}.end` },
  { who: "cook", m: "walk", at: `@${SHOT}+10`, until: `@${SHOT}.end`, gait: "stroll" },
];
const TIMED = timeBeats(BEATS, R_V4);

export const build = async (ctx: KitCtx): Promise<Built> => {
  const base = await build_jp_platform(ctx);
  const root = new THREE.Group(); root.add(base.object);
  const ups: ((t: number, cam: THREE.Camera) => void)[] = base.update ? [base.update] : [];
  const signal: V3 = [-4, 2.4, -12];                                                            // <- the thing he points at, IN the frame
  const add = async (who: "driver" | "volunteer" | "cook", pos: (t: number) => V3, yaw: number) => {
    const c = await castCardOf(ctx, who, { pos: (t) => (inShot(t) ? pos(t) : AWAY), yaw: () => yaw, aim: () => signal, look: () => signal, name: `${SHOT}_${who}` },
      (e) => actBeats(who, TIMED, e));
    root.add(c.object); if (c.update) ups.push(c.update);
  };
  await add("driver", () => [-0.4, 0, 4.0], -Math.PI / 2);                                       // medium, side-on
  const f0 = () => Math.round(cutS(SHOT) * FPS), f1 = () => Math.round(cutE(SHOT) * FPS);
  await add("volunteer", (t) => [2.5 - 0.6 * walkedM(t * FPS, f0(), f1()), 0, 9.0], -Math.PI / 2); // mover 1, far
  await add("cook", (t) => [-3.0 + 0.6 * walkedM(t * FPS, f0() + 10, f1(), "stroll"), 0, 11.5], Math.PI / 2); // mover 2, farther
  // mover 3: a prop that keeps moving (a departure-board light that blinks; any small mechanism will do)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb020 }));
  lamp.position.set(1.8, 3.1, 8.0); root.add(lamp);
  ups.push((t) => { lamp.visible = inShot(t) && Math.floor(t * 2) % 2 === 0; });
  return { ...base, object: root, update: (t, cam) => { for (const u of ups) u(t, cam); } };
};

// (4) the camera: one glide, then the rest (the director's withRest freezes the last frames of every shot as well)
export const CAMS: Record<string, ShotCam> = {
  [SHOT]: pushRest({ pos: [-3.8, 1.5, 7.5], look: [-0.4, 1.4, 4.0], fov: 46 }, 0.4, 24),
  // a parallax slide instead:  [SHOT]: slideRest({ pos: [-3.8, 1.5, 7.5], look: [-0.4, 1.4, 4.0], fov: 46 }, 0.5, 24),
};
void slideRest;

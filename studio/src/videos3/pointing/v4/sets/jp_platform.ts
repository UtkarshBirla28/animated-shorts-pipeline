// v4 SET ENTRY 'jp_platform' (STATION owner, 2026-11-20): TODAY, a bright train glides into a sunny Tokyo platform
// (SCRIPT_v4 line 11, "Which is why Japan's train drivers ...": shot v19 on the v4 clock, TRAIN's shot on STATION's
// platform). The place = the v3 builder `buildPlatform` (kit/rail tokyoPlatform + lineside + TRAIN's trainJP + CAST's
// crowd, walkers, pigeons) driven by a v4 table + plan: no suitcase, no boy, no tourist, no dust motes.
// THE TRAIN (TRAIN's): `arrive`, the nose stops at z 0 at `arriveAt` s into the shot, braking `arriveDec` m/s^2 so the
// last metres of the glide are inside the shot; doors stay shut in the shot. TRAIN may change the numbers in V4_PLAN.arrive
// (or ask STATION). Signs: the LED departure boards show DIGITS only (times, platform, cars) + a running chevron strip
// (the "ticking"), the hanging boards are pictograms (1, exit, stairs): no Japanese text anywhere in this lens.
// Shots are found on the SHOT PLAN by set, never by typed frames: any re-time or new script follows by itself.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../../kit/core/ctx";
import { buildPlatform, type PlanRow, type Row } from "../../sets/jp_platform";
import { castCard } from "../../../../kit/cards/adapters";
import * as fx from "../../../../kit/fx";
import { SHOT_PLAN } from "../shot_plan";
import { FRAMES, FPS } from "../timeline";
import { glideRest, type ShotCam, type View } from "../camkit";

const MINE = SHOT_PLAN.filter((p) => p.set === "jp_platform").map((p) => p.id);
const TABLE: Row[] = MINE.map((id) => ({ id, from: FRAMES[id][0], to: FRAMES[id][1] }));

/** what happens on the platform: the FIRST shot here is the arrival; any later one (a script revision) is the dwell */
export const V4_PLAN_ROWS = {
  arrive: {
    train: "arrive", arriveAt: 1.25, arriveDec: 4.2, arriveV0: 12, doorsAt: 99,
    bag: false, kid: false, mum: false, tourist: false,
    // two commuters crossing the near platform in depth (CAST crowd ids, real walk cycle): one toward the lens, one away
    passers: [
      { who: "studentB", from: [-3.9, 0, 9.5], to: [-4.4, 0, 1.0], at: -1.2, v: 1.25 },
      { who: "suitB", from: [-1.7, 0, 1.2], to: [-1.9, 0, 12.0], at: -0.4, v: 1.3 },
    ],
  } as PlanRow,
  dwell: { train: "dwell", bag: false, kid: false, mum: false, tourist: false } as PlanRow,
};
/** the nose stops 0.4 s AFTER the arrival shot ends, braking 3 m/s^2: inside the shot the face glides ~4 m and slows
 *  (1.2 m/s at the cut) instead of a hard stop. (Stopping at 72 % of the 1.33 s shot moved it only 1.9 m at 11 m from
 *  the lens: first, middle and last frames looked the same, pass 1.) Follows any shot length (the voice) by itself */
// (AUDIT ROUND 2: "the train is already parked": it now GLIDES ~10 m inside the shot, still moving ~3.6 m/s at the cut)
const arriveRow = (id: string): PlanRow => ({ ...V4_PLAN_ROWS.arrive, arriveDec: 4.0, arriveAt: (FRAMES[id][1] - FRAMES[id][0]) / FPS + 0.9 });
const PLAN: Record<string, PlanRow> = Object.fromEntries(MINE.map((id, k) => [id, k === 0 ? arriveRow(id) : V4_PLAN_ROWS.dwell]));

export const build = async (ctx: KitCtx): Promise<Built> => {
  const base = await buildPlatform(ctx, { table: TABLE, plan: PLAN, motes: false });
  const g = new THREE.Group(); g.name = "set:jp_platform_v4"; g.add(base.object);
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  // a pigeon pecking in the near foreground of the arrival lens (the builder's three are far down the platform)
  for (const [i, p] of ([[-2.3, 0, 0.6], [-4.6, 0, 3.2]] as V3[]).entries()) {
    const pg = await castCard(ctx, { who: "pigeon", pos: (t) => [p[0] + 0.04 * Math.sin(t * 0.8 + i), 0, p[2] - 0.1 * Math.floor(((t * 0.9 + i * 0.5) % 6) / 1.4)],
      yaw: (t) => (i ? 2.2 : -0.9) + 0.5 * Math.sin(t * 0.6 + i * 2), pose: (t) => { const ph = (t * 1.7 + i * 0.31) % 1; return { run: ph, flap: 0, wing: 0, peck: Math.max(0, Math.sin((t + i) * 5.0)) ** 6, lift: 0 }; }, px: 260 });
    g.add(pg.object); if (pg.update) ups.push(pg.update);
  }
  // FIX ROUND 1 ("the world must move"): a flock of pigeons wheels across the big sky of the arrival lens, right to left
  // over the line, during the arrival shot (the lens looks along +z from z -7.8: the sky is the top half of the frame)
  if (MINE.length) {
    const [a, b] = FRAMES[MINE[0]], t0 = a / FPS - 0.6, t1 = b / FPS + 0.8;
    const flock = fx.birds(ctx, { flock: { path: { from: [9, 6.5, 16], to: [-13, 9.5, 11], t0, t1, arc: 1.4 }, count: 9, spread: [3.2, 1.2, 2.4] }, size: 0.5, color: 0x3a3d48, seed: 23, flapHz: 6 });
    g.add(flock.object); if (flock.update) ups.push(flock.update);
  }
  return { ...base, object: g, update: (t, cam) => { base.update?.(t, cam); for (const u of ups) u(t, cam); } };
};

// ---------------------------------------------------------------- THE CAMERA (one glide, then the rest)
/** the arrival: from the open, sunny cab end of the island, 11 m BEYOND where the nose stops, looking back up the line:
 *  the train's face comes at us and stops (the line on the left of the frame, the platform, canopy, kiosk and walkers on
 *  the right); the look follows the face in (a pan of ~5 degrees), then rests. (The first lens stood beside the stop
 *  point and saw only the car side: a standing train, f925.) */
export const JP_VIEWS: Record<"arrive", [View, View]> = {
  // (z -7.8: in front of the driver's ITV monitor at z -9, which sat as a black block in the top corner at z -11.5, f920)
  // (AUDIT ROUND 1: the nose was cut by the left edge and the canopy shadows filled the lower third: aimed left + up)
  // (round 2: tighter on the train's face + cab, a LOWER lens: less bare floor)
  arrive: [{ pos: [-2.7, 1.05, -7.4], look: [0.2, 1.95, 16.0], fov: 46 }, { pos: [-2.6, 1.05, -7.2], look: [0.1, 1.8, 7.0], fov: 46 }],
};
const jpCam: ShotCam = (from, to) => { const [a, b] = JP_VIEWS.arrive; return glideRest(a, b, 20)(from, to); };
export const CAMS: Record<string, ShotCam> = Object.fromEntries(MINE.flatMap((id) => [[id, jpCam], ["v4_" + id, jpCam]]));


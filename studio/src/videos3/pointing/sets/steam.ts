// SET 'steam' of 'pointing' v4 (TRAIN owner): WHERE THE STORY BEGINS. A Japanese steam express of about 1910 (late
// Meiji, the Kobe Railway Bureau's lines) at speed through green rice country at golden hour: the 4-4-0 tender engine
// K-P40 (kit/vehicles/steam_loco.ts) stands at the origin and the world streams past (kit/vehicles/steam_world.ts):
// paddies, telegraph poles, thatched farmhouses in pine groves, hills, tall clouds, a lower-quadrant semaphore coming
// up on the left. In the OPEN CAB: the driver HORI (left side, leaning to the side opening, squinting ahead at the
// signal), his FIREMAN (shovelling coal from the tender into the glowing firehole), and in some shots an OFFICIAL of the
// bureau's locomotive section riding along with a notebook (at the back of the cab).
// Life (every picture has more than three moving things): the smoke plume rolling back, the safety valve's feather,
// the drain cocks, the wheels + rods, the fire's flicker + the firehole doors, the fireman's shovel, the landscape,
// the sleepers, the telegraph wires, the birds.
// CAST: the v4 crew cards "hori", "fireman" (the coal man), "official" (the boss). Cameras: ./steam.cams.ts (FRAMES_steam).
// Frame: y = 0 at the top of rail, the loco's front buffer beam at z = 0, the train runs toward -Z, the driver on the LEFT.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { steamLoco, LOCO, STEAM } from "../../../kit/vehicles/steam_loco";
import { steamWorld } from "../../../kit/vehicles/steam_world";
import { locoSmoke, valveSteam, drainCocks, wisp } from "../../../kit/vehicles/steam_fx";
// NOTE: no top-level import of ../cast (the shots -> cams -> sets cycle): the cast is loaded inside the builder.

/** the run: a steady ~43 km/h (12 m/s), the semaphore 170 m ahead at t = 0 (it passes the cab at ~14 s) */
export const STEAM_PLAN = { speed: 12, signalAt: 170, sunAz: 40, sunEl: 22 };
const dist = (t: number) => STEAM_PLAN.speed * t;
/** the world-space direction toward the sun for the set default (az from -Z toward -X, el above the horizon) */
export const sunDirOf = (az: number, el: number): V3 => { const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180; return [-Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]; };
/** the VIVID look (LOOK_PLAN.md, the look director's block) for this set: a strong golden sun, cool deep shadows, no haze */
export const STEAM_RIG = { fog: 0.0009, haze: 0.0001, warmth: 0.15, sunIntensity: 9.0, sunRGB: [1.0, 0.88, 0.72] as [number, number, number], skyLevel: 0.2, bgK: 0.68,
  sat: 1.75, shadowSat: 1.5, contrast: 0.36, gradeExpo: 1.18, hiTint: [1.015, 1.0, 0.975] as [number, number, number], loTint: [0.95, 0.99, 1.07] as [number, number, number],
  bloom: 0.32, bloomThreshold: 1.2, exposure: 0.74 };
/** marks for the lenses + the crew (set frame = loco frame) */
export const STEAM_MARKS = { ...LOCO, signal: (t: number): V3 => [-3.1, 6.0, -(STEAM_SHOW.crew(t).signal ?? STEAM_PLAN.signalAt - dist(t))] };
/** WHO STANDS WHERE at film time t (the DIRECTOR / a sandbox sets this before the set is built; marks in the loco frame,
 *  yaw = atan2(dx, dz) of where the body faces): Hori, the fireman, and whether the official rides (in the corner) */
export type CrewMark = { pos: V3; yaw: number; look?: V3 | null };
export type CrewPlan = { hori: CrewMark; fireman: CrewMark; official: CrewMark | null; shovel: boolean;
  /** the cab's left side sheets hidden (a cut-away for a lens beside the cab) */ cutaway?: boolean;
  /** the semaphore's distance ahead of the engine's front (m); default the steady approach from STEAM_PLAN */ signal?: number };
export const CREW_DEFAULT: CrewPlan = {
  hori: { pos: LOCO.driver, yaw: Math.PI - 0.25 }, fireman: { pos: LOCO.fireman, yaw: Math.PI - 0.3 }, official: null, shovel: true,
};
export const STEAM_SHOW: { crew: (t: number) => CrewPlan } = { crew: () => CREW_DEFAULT };
/** the shovel's cycle (s): scoop at the tender, swing, fire, back */
const SHOVEL_T = 2.6;
const shovelPhase = (t: number) => (t % SHOVEL_T) / SHOVEL_T;

export const build_steam = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:steam";
  const sun = sunDirOf(STEAM_PLAN.sunAz, STEAM_PLAN.sunEl);
  const world = await steamWorld(ctx, { dist, signalAhead: (t) => STEAM_SHOW.crew(t).signal ?? STEAM_PLAN.signalAt - dist(t), signalArm: () => 1 });
  g.add(world.object);
  // the firehole doors open when the shovel arrives at the fire
  const fireDoor = (t: number) => { const u = shovelPhase(t); return u > 0.38 && u < 0.72 ? 1 : 0.25; };
  const loco = await steamLoco(ctx, { run: dist, fireDoor, cutaway: (t) => !!STEAM_SHOW.crew(t).cutaway });
  g.add(loco.object);
  // smoke + steam (in the loco frame: the wind is the train's own speed, +Z)
  const smoke = locoSmoke(ctx, { pos: [0, STEAM.chimneyTop + 0.05, STEAM.chimneyZ], speed: STEAM_PLAN.speed * 0.92, sunDir: sun });
  const valve = valveSteam(ctx, { pos: LOCO.safetyValve, speed: STEAM_PLAN.speed * 0.9, sunDir: sun, on: (t) => 0.5 + 0.5 * Math.sin(t * 0.4) });
  const cocks = [1, -1].map((s) => drainCocks(ctx, { pos: [s * STEAM.cylX, STEAM.cylY - 0.38, STEAM.cylZ[0] + 0.15], side: s as 1 | -1, speed: STEAM_PLAN.speed * 0.8, sunDir: sun, on: () => 0.55 }));
  const leak = wisp(ctx, { pos: [0.32, 3.15, 6.05], speed: STEAM_PLAN.speed * 0.9, sunDir: sun });   // the whistle valve weeping (outside the cab: never in front of a cab lens)
  const fx = [smoke, valve, ...cocks, leak];
  for (const f of fx) g.add(f.object);
  // the fireman's shovel (a placeholder prop until CAST's fireman holds one): ash handle + a steel blade with coal
  const shovel = new THREE.Group();
  { const wood = new THREE.MeshStandardMaterial({ color: "#a07a4c", roughness: 0.7 }), steel = new THREE.MeshStandardMaterial({ color: "#6c7076", roughness: 0.45, metalness: 1 }), coal = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.6 });
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.9, 8), wood); h.rotation.x = Math.PI / 2; h.position.z = 0.45; shovel.add(h);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.3), steel); b.position.z = -0.12; shovel.add(b);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), coal); c.scale.set(1.1, 0.5, 1.2); c.position.set(0, 0.05, -0.12); c.name = "load"; shovel.add(c);
    shovel.traverse((m) => { (m as THREE.Mesh).castShadow = true; }); g.add(shovel); }
  const shovelAt = (t: number) => {
    const u = shovelPhase(t), ease = (x: number) => x * x * (3 - 2 * x);
    // 0-0.3 scoop at the tender (low, back), 0.3-0.5 swing to the firehole, 0.5-0.62 throw, 0.62-1 back
    const back = { p: new THREE.Vector3(0.45, 1.62, 8.15), r: -0.25 }, fire = { p: new THREE.Vector3(0.12, 1.86, 6.62), r: 0.15 };
    const k = u < 0.3 ? 0 : u < 0.5 ? ease((u - 0.3) / 0.2) : u < 0.62 ? 1 : 1 - ease((u - 0.62) / 0.38);
    shovel.position.lerpVectors(back.p, fire.p, k); shovel.position.y += Math.sin(k * Math.PI) * 0.18;
    shovel.rotation.set(back.r + (fire.r - back.r) * k, -0.25 * (1 - k), 0);
    const load = shovel.getObjectByName("load"); if (load) load.visible = u < 0.52;
  };
  // ---- the crew (CAST placeholders at their marks)
  const { castMember } = await import("../cast");
  const sig = STEAM_MARKS.signal;
  const plan = (t: number) => STEAM_SHOW.crew(t);
  // CAST's v4 crew: Hori (blue work coat, round glasses), the coal man (orange apron, soot, the shovel), the boss (dark
  // suit, bowler, the notebook). Hands stay on the lever / the shovel: aim null (the steam driver never points)
  const CREW = {
    hori: await castMember(ctx, "hori", { pos: (t) => plan(t).hori.pos, yaw: (t) => plan(t).hori.yaw, aim: () => null, look: (t) => plan(t).hori.look ?? sig(t), px: 1000 }),
    fireman: await castMember(ctx, "fireman", { pos: (t) => plan(t).fireman.pos, yaw: (t) => plan(t).fireman.yaw, aim: () => null, look: (t) => plan(t).fireman.look ?? null, px: 1000,
      act: (t, P) => (plan(t).shovel ? { ...P, hold: [{ k: "shovel", side: 1 }] } : P) }),
    official: await castMember(ctx, "official", { pos: (t) => plan(t).official?.pos ?? LOCO.official, yaw: (t) => plan(t).official?.yaw ?? Math.PI + 0.35, aim: () => null, look: (t) => plan(t).official?.look ?? LOCO.driver, px: 1000,
      act: (t, P) => ({ ...P, hold: [{ k: "notebook", side: 1 }, { k: "pen", side: -1 }] }) }),
  };
  for (const c of Object.values(CREW)) g.add(c.object);
  return {
    object: g,
    hints: { shadowCenter: [0, 0, 6], shadowExt: 22, probe: [0, 2.4, 7.0], groundAlbedo: [0.22, 0.34, 0.16], rigOpts: STEAM_RIG },
    update: (t, cam) => {
      world.update?.(t, cam); loco.update?.(t, cam); shovelAt(t);
      for (const f of fx) f.update?.(t, cam);
      CREW.hori.update?.(t, cam); CREW.fireman.update?.(t, cam);
      const on = !!plan(t).official; CREW.official.object.visible = on; if (on) CREW.official.update?.(t, cam);
      shovel.visible = false;   // (CAST's coal man carries his own shovel now; the 3D prop stays for a shot without him)
    },
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_steam, MARKS_steam, FRAMES_steam } from "./steam.cams";

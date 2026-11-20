// SET 'ny_car' of 'pointing' (NYC owner): inside a stainless New York car stopped in a tunnel (s11). The doors open
// onto a black tunnel wall 0.8 m away (board-formed concrete, soot, seepage, a cable run, one caged warm bulb in a
// niche, the blue emergency light, a stencilled "117"); the commuter steps to the gap, looks out, checks his phone map,
// looks back. Reusable parts: kit/subway/ (train.ts nyCar, tunnel.ts, life.ts). Light: nightPractical + two 3800 K
// ceiling LED strips (rect practicals), a shadowed spot spilling the car light out of the doorway onto the wall
// (his shadow on the concrete), the caged bulb (shadowed point, faint flicker), the blue light (dims once when a far
// train rumbles through).
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { nyCar, CAR } from "../../../kit/subway/train";
import { nyTunnelWall } from "../../../kit/subway/tunnel";
import { drips, lampMotes } from "../../../kit/subway/life";
import { LocalEnv } from "../../../kit/subway/mats";
import { addDecals } from "../../../kit/surfaces/decals";
import type { SurfMaterial } from "../../../kit/surfaces/materials";
import { WIN_ny_car as WIN } from "./ny_car.cams";
// cast.ts is imported lazily (see ny_station.ts: shots.ts -> cams.ts -> sets is an import cycle for cast/timing.ts)
type CastMod = typeof import("../cast");

const ease = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const local = (t: number) => { const w = WIN.s11; return w ? t - w[0] : t; };

export const build_ny_car = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:ny_car";
  const t0 = performance.now();
  const { castMember, crowdNY, wordT }: CastMod = await import("../cast");
  const car = await nyCar(ctx, { detail: "near", selfLit: 0, cab: false, interior: true, seed: 2 });
  g.add(car.object);
  // floor wear: grey scuffs + a coffee drip by the hero door (decals on the vinyl)
  const fm = car.mats.floor as SurfMaterial;
  if (fm.userData?.surf) addDecals(fm, [
    { type: "stain", at: [2.0, 0.95], size: [0.35, 0.22], rot: 0.6, opacity: 0.75, tint: [0.35, 0.22, 0.12] },
    { type: "wear", at: [2.29, 0.6], size: [1.3, 1.6], opacity: 0.5 }, { type: "wear", at: [-2.29, 0.6], size: [1.3, 1.6], opacity: 0.5 },
    { type: "stain", at: [0.4, -0.3], size: [1.2, 0.5], opacity: 0.35 }, { type: "stain", at: [3.6, 0.2], size: [0.9, 0.45], opacity: 0.3 },
  ]);
  const tun = await nyTunnelWall(ctx, { zWall: CAR.HW + 0.8, niche: { x: 3.45, y: 1.15 }, blue: { x: 4.75, y: 1.8 }, number: { x: 2.75, y: 0.85, digits: "117" } });
  g.add(tun.object);
  // lights: the two ceiling LED strips, the doorway spill spot (shadowed), the bulb + blue light come with the tunnel
  const lamps: import("../../../kit/core/ctx").Practical[] = [];
  if (ctx.practical) {
    for (const s of [-1, 1]) { const p = ctx.practical({ kind: "rect", pos: [0, 2.19, s * 0.62], target: [0, 0, s * 0.62], size: [15.5, 0.12], kelvin: 3800, lumens: 2200 * 1.6, bulb: false, seed: 30 + s }); g.add(p.object); lamps.push(p); }
    const spill = ctx.practical({ kind: "spot", pos: [2.29, 2.12, 0.55], target: [3.1, 0.85, CAR.HW + 0.8], kelvin: 3800, lumens: 1100, angle: 0.75, penumbra: 0.8, shadow: true, shadowNear: 0.2, bulb: false, seed: 33 });
    g.add(spill.object); lamps.push(spill);
  }
  const env = new LocalEnv(ctx.gl, new THREE.Vector3(0.5, 1.3, 0), ctx.quality === "draft" ? 64 : 128);
  env.apply(...car.envMats);
  // ---------------- people: the commuter at the doorway + two seated riders (side B benches)
  const noCapture: THREE.Object3D[] = [];
  const tDoors = (() => { try { return wordT("doors#3"); } catch { return (WIN.s11?.[0] ?? 0) + 0.4; } })();
  const com = await castMember(ctx, "ny_commuter", {
    pos: (t) => { const k = ease((t - tDoors - 0.2) / 0.9); return [1.55 + 0.5 * k, 0, 0.55 + 0.57 * k] as V3; },
    aim: () => [2.3, 1.45, CAR.HW + 0.8], restR: () => [2.29, 1.35, 0.0], px: 1400,
  });
  g.add(com.object); noCapture.push(com.object);
  let riders: Built | null = null;
  try {
    riders = await crowdNY(ctx, [
      { id: "nyRiderA", pos: [0.85, 0, 0.92], yaw: Math.PI, seated: 0.46, seed: 13 },
      { id: "nyRiderB", pos: [3.75, 0, 0.92], yaw: Math.PI, seated: 0.46, seed: 15 },
      { id: "nyRiderC", pos: [-0.6, 0, -0.95], seated: 0.46, seed: 17 },
    ]);
    g.add(riders.object); noCapture.push(riders.object);
  } catch (e) { console.warn("ny_car: crowdNY failed", e); }
  // ---------------- life: dust in the doorway light, a seepage drip by the niche, the blue light dims (far train)
  const motes = lampMotes(ctx, { box: [[1.4, 0.1, 0.8], [4.6, 2.5, CAR.HW + 0.76]], lamps: [tun.nichePos, [2.6, 1.6, 1.7], [3.2, 1.1, 2.15]], count: 900, radius: 0.9, seed: 31, size: 0.005, gain: 1.1 });
  g.add(motes.object); noCapture.push(motes.object);
  const drip = drips(ctx, [{ at: [3.02, 1.13, CAR.HW + 0.78], floorY: -0.42, period: 1.9, phase: 0.4, light: 0xffc890 }]);
  g.add(drip.object); noCapture.push(drip.object);
  console.warn(`ny_car built in ${(performance.now() - t0).toFixed(0)} ms`);
  return {
    object: g,
    hints: { shadowCenter: [1.5, 0, 0.8], shadowExt: 20, probe: [1.0, 1.4, 0.3], groundAlbedo: [0.3, 0.3, 0.31] },
    update: (t, cam) => {
      const u = local(t);
      // the doors slide open on "doors" (shut before), the amber indicators light
      const d = ease((t - tDoors + 0.15) / 0.85);
      car.setDoors(d); car.setIndicator(d > 0.05 ? 1 : 0);
      // a far train rumbles through the tunnel: the blue light dims once (~1.9-2.5 s into the shot)
      const dim = Math.exp(-Math.pow((u - 2.2) / 0.22, 2));
      tun.blue?.set(1 - 0.7 * dim); (tun.blueM as THREE.MeshBasicMaterial).color.setHex(0x3a6cff).multiplyScalar(4.0 * (1 - 0.7 * dim));
      if (!env.done) { for (const p of lamps) p.update(t); env.capture(ctx.scene, noCapture); }
      com.update?.(t, cam); riders?.update?.(t, cam); motes.update?.(t, cam); drip.update?.(t, cam);
    },
    dispose: () => env.dispose(),
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_ny_car, MARKS_ny_car } from "./ny_car.cams";

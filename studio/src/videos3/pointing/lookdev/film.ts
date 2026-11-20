// LOOKDEV (look director, 2026-11-20): every set of the film seen in two WIDE "scene" stills, under the film's own
// clock (so each set's people and train are where the film puts them at that time). The real FILM's shot table is
// copied; 12 of its shots are re-pointed at a set + a static wide lens. Render stills only, at the frames printed in
// LOOKDEV_FRAMES (the middle of each re-pointed shot). Nothing here is used by the film itself.
//   node scripts/kit_render.mjs --entry src/videos3/pointing/lookdev/index.ts --comp PointingLookdev --quality final --stills <frames> --out out/pointing/look_v2
import * as THREE from "three";
import type { Built, CamState, Film, KitCtx, RigSpec, ShotDef, V3 } from "../../../kit/core/ctx";
import { FILM } from "../film";
import { JP_RIG } from "../sets/jp_platform";
import { CAMS_kitchen } from "../sets/kitchen.cams";
import { build_kitchen } from "../sets/kitchen";
import { build_ny_station } from "../sets/ny_station";
import type { Who } from "../cast/people";
import { LAB_PAL, LAB_RIG, candy, glow, signalWash } from "../v4/look";
import { build_lab } from "../sets/lab";

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** a static wide lens: `pos` -> `look`, `fov`; crisp (f/11, focus on the look point) like his frames */
const lens = (pos: V3, look: V3, fov: number): ((t: number) => CamState) => {
  const c: CamState = { pos, look, fov, fnum: 11, focus: Math.hypot(...sub(look, pos)) };
  return () => c;
};
/** an owner's lens at a moment, moved `back` m along its own view line, raised `up` m, given `fov` */
const fromCam = (cam: (t: number) => CamState, t: number, back: number, fov: number, up = 0, lookUp = 0): ((t: number) => CamState) => {
  const c = cam(t), f = nrm(sub(c.look, c.pos));
  return lens([c.pos[0] - f[0] * back, c.pos[1] - f[1] * back + up, c.pos[2] - f[2] * back], [c.look[0], c.look[1] + lookUp, c.look[2]], fov);
};

/** placeholder figures (medium size) for the two parked sets, idle */
const withFigures = (build: (ctx: KitCtx) => Promise<Built>, figs: { who: Who; pos: V3; yaw?: number }[]) => async (ctx: KitCtx): Promise<Built> => {
  const b = await build(ctx);
  const ups: ((t: number, cam: THREE.Camera) => void)[] = b.update ? [b.update] : [];
  try {
    const { castCardOf } = await import("../cast/member");
    for (const f of figs) {
      const c = await castCardOf(ctx, f.who, { pos: () => f.pos, ...(f.yaw !== undefined ? { yaw: () => f.yaw! } : {}) });
      b.object.add(c.object); if (c.update) ups.push(c.update);
    }
  } catch (e) { console.warn("lookdev: no placeholder figures", e); }
  return { ...b, update: (t, cam) => { for (const u of ups) u(t, cam); } };
};

/** THE HOOK PLACEHOLDER in the lab (LOOK test only; LAB stages the real one): a big signal lamp on the back wall, one
 *  big button on a pedestal under it, the volunteer at the button, and the LOOK signal wash (green before LAMP_RED_AT,
 *  red after) */
const LAMP_X = 0.3, LAMP_RED_AT = 1480 / 30;
const labHook = async (ctx: KitCtx): Promise<Built> => {
  const b = await build_lab(ctx);
  const ups: ((t: number, cam: THREE.Camera) => void)[] = b.update ? [b.update] : [];
  const g = new THREE.Group(); g.name = "lookdev:labHook"; b.object.add(g);
  const z0 = -3.6;
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.26), candy(LAB_PAL.lampHousing, { rough: 0.4 })); housing.position.set(LAMP_X, 1.66, z0 + 0.14); g.add(housing);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.045, 16, 48), candy("#ff8a1f")); ring.position.set(LAMP_X, 1.66, z0 + 0.28); g.add(ring);
  const lensG = glow(LAB_PAL.lampGreen, 2.2), lensR = glow(LAB_PAL.lampRed, 2.2);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lensG); lens.rotation.x = Math.PI / 2; lens.scale.set(1, 0.35, 1); lens.position.set(LAMP_X, 1.66, z0 + 0.27); g.add(lens);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 32, 1, true, -Math.PI / 2, Math.PI), candy(LAB_PAL.lampVisor, { rough: 0.5 })); visor.rotation.x = Math.PI / 2; visor.position.set(LAMP_X, 1.66, z0 + 0.38); (visor.material as THREE.Material).side = THREE.DoubleSide; g.add(visor);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.92, 32), candy(LAB_PAL.buttonBase)); ped.position.set(LAMP_X, 0.46, -2.55); g.add(ped);
  const bring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), candy(LAB_PAL.buttonRing)); bring.position.set(LAMP_X, 0.945, -2.55); g.add(bring);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), candy(LAB_PAL.button, { rough: 0.22 })); cap.position.set(LAMP_X, 0.97, -2.55); g.add(cap);
  for (const o of [housing, ring, visor, ped, bring, cap]) { o.castShadow = true; o.receiveShadow = true; }
  const wash = signalWash(ctx, { pos: [LAMP_X, 1.7, z0 + 0.5], target: [LAMP_X, 0.4, -0.5], colorAt: (t) => (t < LAMP_RED_AT ? LAB_PAL.lampGreen : LAB_PAL.lampRed), gainAt: (t) => (t < LAMP_RED_AT ? 0.42 : 1.3), lumens: 3800 });
  g.add(wash.object); if (wash.update) ups.push(wash.update);
  ups.push((t) => { lens.material = t < LAMP_RED_AT ? lensG : lensR; });
  try {
    const { castCardOf } = await import("../cast/member");
    const v = await castCardOf(ctx, "volunteer", { pos: () => [LAMP_X + 0.42, 0, -2.25], yaw: () => -0.5 });
    g.add(v.object); if (v.update) ups.push(v.update);
  } catch (e) { console.warn("lookdev: no volunteer", e); }
  return { ...b, update: (t, cam) => { for (const u of ups) u(t, cam); } };
};

const byId = new Map(FILM.shots.map((s) => [s.id, s]));
const real = (id: string) => byId.get(id)!;
const mid = (id: string) => Math.round((real(id).from + real(id).to) / 2);
const tMid = (id: string) => mid(id) / 30;

type Over = { set: string; rig?: string; rigOpts?: Partial<RigSpec>; cam: (t: number) => CamState; label: string };
const kitchenCam = CAMS_kitchen.s15(1139, 1270);
/** the 12 lookdev views: real shot id -> what it shows now */
export const OVER: Record<string, Over> = {
  // the platform: two wides with sky (s16a's and s13's time: the train in, the tourist at the machines)
  s16a: { set: "jp_platform", rigOpts: JP_RIG.wide, label: "platform wide A", cam: lens([-6.2, 1.3, 1.2], [-0.4, 2.05, 6.5], 62) },
  s13: { set: "jp_platform", rigOpts: JP_RIG.wide, label: "platform wide B", cam: lens([-7.0, 2.1, 2.5], [0.5, 1.8, 6.5], 62) },
  // the packed car (s05 / s10 time)
  s05: { set: "car", rigOpts: real("s05").rigOpts, label: "car A", cam: lens([0.15, 1.6, 12.5], [0.0, 1.2, 2.5], 64) },
  s10: { set: "car", rigOpts: real("s10").rigOpts, label: "car B", cam: lens([0.9, 2.05, 10.5], [-0.4, 1.0, 3.5], 66) },
  // the cab (s03 / s21 time)
  s03: { set: "cab", rigOpts: real("s03").rigOpts, label: "cab A", cam: lens([0.55, 1.7, 2.0], [-0.45, 1.5, -0.6], 72) },
  s21: { set: "cab", rigOpts: real("s03b").rigOpts, label: "cab B", cam: lens([0.7, 1.3, 0.35], [-1.4, 1.35, 1.6], 66) },
  // the lab (s17 / s19 time)
  s17: { set: "lab", rig: "interiorWarm", rigOpts: LAB_RIG, label: "lab A (hook, green)", cam: lens([LAMP_X + 0.45, 1.2, 1.0], [LAMP_X, 1.45, -3.4], 58) },
  s19: { set: "lab", rig: "interiorWarm", rigOpts: LAB_RIG, label: "lab B (red wash)", cam: lens([-1.8, 1.4, 2.4], [0.6, 1.1, -3.0], 64) },
  // the kitchen (parked set; placeholder figures)
  s11: { set: "kitchen", rig: "nightPractical", rigOpts: { exposure: 4.6, warmth: 0.2, contrast: 0.34, sat: 1.75 }, label: "kitchen A", cam: fromCam(kitchenCam, 1150 / 30, 0, 72, 0.05, 0.1) },
  s12: { set: "kitchen", rig: "nightPractical", rigOpts: { exposure: 4.6, warmth: 0.2, contrast: 0.34, sat: 1.75 }, label: "kitchen B", cam: lens([1.6, 1.45, 1.6], [0.4, 0.95, -0.7], 70) },
  // the New York station (parked set; placeholder figures)
  s14: { set: "ny_station", rig: "undergroundWarm", label: "NY station A", cam: lens([-6.5, 2.1, 1.2], [2.0, 1.2, 3.2], 66) },
  s15: { set: "ny_station", rig: "undergroundWarm", label: "NY station B", cam: lens([3.5, 1.6, 0.5], [-1.0, 1.3, 4.5], 70) },
};
export const LOOKDEV_FRAMES = Object.keys(OVER).map((id) => ({ id, frame: mid(id), label: OVER[id].label }));

const shots: ShotDef[] = FILM.shots.map((s) => {
  const o = OVER[s.id]; if (!o) return s;
  return { id: s.id, from: s.from, to: s.to, set: o.set, rig: o.rig ?? "golden", ...(o.rigOpts ? { rigOpts: o.rigOpts } : {}), cam: o.cam };
});
export const LOOKDEV: Film = {
  ...FILM, slug: "pointing_lookdev", shots,
  sets: {
    ...FILM.sets,
    lab: labHook,
    kitchen: withFigures(build_kitchen, [{ who: "kid_mum", pos: [0.25, 0, 0.1] }, { who: "kid", pos: [0.95, 0, 0.55] }]),
    ny_station: withFigures(build_ny_station, [{ who: "tourist", pos: [1.3, 0, 1.4] }, { who: "ny_commuter", pos: [-1.6, 0, 2.1] }, { who: "nyRiderB", pos: [2.8, 0, 2.6] }]),
  },
};
if (typeof window !== "undefined") console.warn("[lookdev] frames: " + LOOKDEV_FRAMES.map((x) => `${x.label}=f${x.frame}`).join(", "));

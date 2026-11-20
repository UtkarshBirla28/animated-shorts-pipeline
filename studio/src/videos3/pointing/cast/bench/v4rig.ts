// CAST v4 RIG BENCH (2026-11-20): the new thin-ink-limb rig on a lit platform, MEDIUM size, three people per shot.
// Not part of the film; never imports the shot table.
//   node scripts/kit_render.mjs --entry src/videos3/pointing/cast/bench/v4rig.ts --comp PointingCastV4Rig --quality draft --stills 30,100,150,214,270 --out out/pointing_cast/v4rig/
//   hori   (0-60):    HORI peering (head forward, brows scrunched), his COAL MAN with the shovel, the BOSS with his notebook
//   point  (60-120):  THE ONE GESTURE: the modern driver's point-and-call from the SIDE, from BEHIND and FRONT 3/4
//                     (point on f66, the fist at the chest, the SNAP on f90, the hold)
//   shout  (120-180): Hori calls, the coal man shouts "Clear!" with a big grin, the boss is delighted
//   points (180-240): a lab volunteer points side-on at a lamp, the NY conductor points up, the stove person points "Off!"
//   walk   (240-300): the two New Yorkers (man, woman) and a volunteer walk
import * as THREE from "three";
import React from "react";
import { registerRoot } from "remotion";
import type { Film, KitCtx, Built, SetBuilder, V3 } from "../../../../kit/core/ctx";
import { KitComposition } from "../../../../kit/core/pipeline";
import { lockedWithDrift } from "../../../../kit/core/camera";
import { platform } from "../../../../kit/surfaces/ground";
import { castCardOf } from "../member";
import { actBeats, timeBeats, walkedM, type Beat, type Resolver } from "../moves";
import type { CPose, Who } from "../people";

const R = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: (f: number) => 60 * (Math.floor(f / 60) + 1), shotStart: (f: number) => 60 * Math.floor(f / 60) } as Resolver;
const N_SHOTS = 6, shotOf = (t: number) => Math.min(N_SHOTS - 1, Math.floor((t * 30) / 60));
// the hook's desk: her big button in front of her right hand, the lamp up on a pole to her right (screen left)
const BUTTON: V3 = [-0.17, 0.79, -3.15], LAMP: V3 = [-0.62, 1.75, -3.6], BUTTON_D: V3 = [0.78, 0.79, -3.15], LAMP_L: V3 = [-1.6, 1.5, -3.6];
const LEFT_FAR: V3 = [-7, 2.0, -6], UP: V3 = [0.5, 4.6, -4.5], DOWN_RIGHT: V3 = [2.6, 0.5, -3.6];
type Slot = { who: Who; x: number; yaw: number; tag: string; aim?: V3 };
const LINE: Slot[][] = [
  [{ who: "hori", x: -0.9, yaw: -0.5, tag: "a" }, { who: "fireman", x: 0.02, yaw: -0.3, tag: "a" }, { who: "official", x: 0.9, yaw: -0.45, tag: "a" }],
  [{ who: "driver", x: -0.9, yaw: -Math.PI / 2, tag: "side" }, { who: "driver", x: 0.02, yaw: Math.PI - 0.25, tag: "back" }, { who: "driver", x: 0.9, yaw: -0.62, tag: "q" }],
  [{ who: "hori", x: -0.9, yaw: -0.6, tag: "b" }, { who: "fireman", x: 0.02, yaw: -0.25, tag: "b" }, { who: "official", x: 0.9, yaw: -0.5, tag: "b" }],
  // (each points AWAY from the others: never an arm across a neighbour)
  [{ who: "volunteer", x: -0.62, yaw: -Math.PI / 2, tag: "c", aim: LEFT_FAR }, { who: "cook", x: 0.1, yaw: Math.PI / 2 - 0.2, tag: "c", aim: [0.9, 0.45, -3.2] }, { who: "ny_conductor", x: 0.9, yaw: Math.PI / 2 - 0.15, tag: "c", aim: [3.2, 1.35, -4.5] }],   // (side-on, level: in a true profile an UP point crosses the face)
  // (shot 4 = walk; shot 5 = the hook in the lab)
  [{ who: "prankA", x: -0.9, yaw: Math.PI / 2, tag: "w" }, { who: "prankB", x: 0.02, yaw: Math.PI / 2 - 0.15, tag: "w" }, { who: "volunteer", x: 0.9, yaw: -Math.PI / 2, tag: "w" }],
  [{ who: "lab_woman", x: 0.0, yaw: -0.45, tag: "h", aim: BUTTON }, { who: "lab_d", x: 0.95, yaw: -0.5, tag: "h", aim: BUTTON_D }],
];
const call = (who: Who, s: number): Beat => ({ who, m: "call", name: 60 * s + 6, status: 60 * s + 30, until: 60 * s + 58, style: "driver" });
const BEATS: Beat[] = [
  // hori: he peers (the bad eyes), the coal man leans on his shovel, the boss writes and smiles
  { who: "hori", m: "peer", at: 4, until: 58 }, { who: "fireman", m: "alive", at: 0, until: 59, amp: 0.7 }, { who: "fireman", m: "face", at: 0, until: 59, expr: "brightGrin", still: true },
  { who: "official", m: "alive", at: 0, until: 59, amp: 0.6 }, { who: "official", m: "face", at: 0, until: 59, expr: "polite", still: true },
  // point
  call("driver", 1),
  // shout
  call("hori", 2), { who: "hori", m: "face", at: 150, until: 176, expr: "bright", mouth: "y1", still: true },
  { who: "fireman", m: "face", at: 128, until: 178, expr: "brightGrin", mouth: "y1", still: true }, { who: "fireman", m: "nod", at: 130, amt: 1.2 },
  { who: "official", m: "face", at: 124, until: 178, expr: "delightB", still: true }, { who: "official", m: "nod", at: 140, amt: 1 },
  // points (side-on at things in frame, never at the lens)
  { who: "volunteer", m: "point", at: 186, until: 236, still: true }, { who: "volunteer", m: "face", at: 186, until: 236, expr: "focusB", still: true },
  { who: "ny_conductor", m: "point", at: 190, until: 236, still: true }, { who: "ny_conductor", m: "face", at: 190, until: 236, expr: "bright", mouth: "y0", still: true },
  { who: "cook", m: "point", at: 196, until: 236, still: true }, { who: "cook", m: "face", at: 196, until: 236, expr: "bright", mouth: "O", still: true },
  // hook (300-360): THE YOUNG WOMAN at the big button under the lamp: frame 0 = the finger ready, eyes wide on the lamp;
  // the presses; the hand DOWN on the red; frozen, shocked; then the side-on point at the lamp, mouth open
  { who: "lab_woman", m: "hover", at: 300, until: 318 }, { who: "lab_woman", m: "look", at: 300, until: 344, to: [-0.45, -0.9], head: 4 },
  { who: "lab_woman", m: "face", at: 300, until: 319, expr: "stare", browUp: 5, still: true },
  { who: "lab_woman", m: "tap", at: 319 }, { who: "lab_woman", m: "hover", at: 324, until: 325 }, { who: "lab_woman", m: "tap", at: 326 }, { who: "lab_woman", m: "hover", at: 331, until: 332 }, { who: "lab_woman", m: "tap", at: 333 },
  { who: "lab_woman", m: "face", at: 319, until: 338, expr: "focusB", still: true },
  { who: "lab_woman", m: "down", at: 338, until: 350 }, { who: "lab_woman", m: "face", at: 340, until: 351, expr: "stare", browUp: 9, mouth: "O", still: true },
  { who: "lab_woman", m: "point", at: 351, until: 359, still: true }, { who: "lab_woman", m: "face", at: 351, until: 359, expr: "brightO", mouth: "y2", still: true },
  { who: "lab_a", m: "hover", at: 300, until: 340 }, { who: "lab_a", m: "point", at: 342, until: 359, still: true }, { who: "lab_a", m: "face", at: 342, until: 359, expr: "brightO", mouth: "O", still: true },
  { who: "lab_d", m: "hover", at: 300, until: 336 }, { who: "lab_d", m: "down", at: 338, until: 359 }, { who: "lab_d", m: "face", at: 340, until: 359, expr: "stare", browUp: 9, mouth: "O", still: true },
  // walk
  { who: "prankA", m: "walk", at: 242, until: 298 }, { who: "prankB", m: "walk", at: 244, until: 298 }, { who: "volunteer", m: "walk", at: 246, until: 298, gait: "stroll" },
  { who: "prankA", m: "face", at: 240, until: 299, expr: "brightGrin", still: true }, { who: "prankB", m: "face", at: 240, until: 299, expr: "polite", still: true },
];
const TIMED = timeBeats(BEATS, R);
/** the props they hold in a shot (the coal man's shovel, the boss's notebook) */
const props = (who: Who) => (t: number, P: CPose): CPose => {
  const s = shotOf(t);
  if (who === "fireman" && s !== 2) return { ...P, hold: [{ k: "shovel", side: 1 }] };
  if (who === "official" && (s === 0 || s === 2)) return { ...P, hold: [{ k: "notebook", side: 1 }] };
  return P;
};

const buildRig: SetBuilder = async (ctx: KitCtx): Promise<Built> => {
  const root = new THREE.Group(); root.name = "castV4Rig";
  const kids: Built[] = [];
  const pf = await platform(ctx, { x0: -6, x1: 6, z0: -40, z1: 10, y: -1.1, h: 1.1, seed: 5 }); root.add(pf.object); kids.push(pf);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.86, 0.74, 0.55), roughness: 0.9 }));
  wall.position.set(0, 3.5, -9); wall.receiveShadow = true; root.add(wall);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.5), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.18, 0.42, 0.78), roughness: 0.8 }));
  stripe.position.set(0, 1.1, -8.98); root.add(stripe);
  // the hook's props (only the lab shot can see them: everyone else stands at z -3.5 behind nothing)
  const hk = new THREE.Group(); root.add(hk);
  const deskM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.93, 0.93, 0.9), roughness: 0.6 });
  for (const dx of [0, 0.95]) { const desk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.42), deskM); desk.position.set(-0.12 + dx, 0.37, -3.05); hk.add(desk); }
  const btnM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.95, 0.2, 0.18), roughness: 0.35, emissive: new THREE.Color(0.25, 0.02, 0.02) });
  for (const B of [BUTTON, BUTTON_D]) { const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 24), btnM); btn.position.set(B[0], 0.76, B[2]); hk.add(btn); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.75, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a44 })); pole.position.set(LAMP[0], 0.875, LAMP[2]); hk.add(pole);
  const lampM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.2, 0.9, 0.3), emissive: new THREE.Color(0.1, 0.8, 0.2), emissiveIntensity: 1.5 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), lampM); lamp.position.set(LAMP[0], LAMP[1], LAMP[2]); hk.add(lamp);
  kids.push({ object: hk, update: (t) => { hk.visible = shotOf(t) === 5; const red = t * 30 >= 337; lampM.color.setRGB(red ? 1 : 0.2, red ? 0.12 : 0.9, red ? 0.1 : 0.3); lampM.emissive.setRGB(red ? 1 : 0.1, red ? 0.05 : 0.8, red ? 0.04 : 0.2); } } as Built);
  for (let s = 0; s < LINE.length; s++) for (const sl of LINE[s]) {
    const walking = s === 4, dirX = Math.sin(sl.yaw);
    const pos = (t: number): V3 => { if (shotOf(t) !== s) return [-50, -10, -50]; const m = walking ? walkedM(t * 30, 60 * s + 2, 60 * s + 58) : 0; return [sl.x + dirX * m * 0.5, 0, -3.5]; };
    const aim0 = sl.aim ?? LEFT_FAR, hook = s === 5, seated = hook ? 0.47 : undefined;
    const aimF = (t: number): V3 => (hook && sl.who === "lab_woman" && t * 30 >= 350 ? LAMP : aim0);
    const b = await castCardOf(ctx, sl.who, { pos, yaw: () => sl.yaw, aim: aimF, look: () => (hook ? LAMP : aim0), seated, px: 1100, act: props(sl.who), name: `${sl.who}_${s}_${sl.tag}` },
      (e) => actBeats(sl.who, TIMED, e));
    root.add(b.object); kids.push(b);
  }
  return { object: root, update: (t, cam) => { for (const b of kids) b.update?.(t, cam); }, hints: { probe: [0, 1.2, -3] } };
};
// medium: the whole figure about half the frame height
const cam = (from: number) => (t: number) => lockedWithDrift({ pos: [0, 0.88, 1.6], look: [0, 0.8, -3.5], fov: 52, drift: [0, 0, 0], shake: 0 }, 2)(t - from / 30);
export const V4RIG: Film = {
  slug: "pointing_cast_v4rig", fps: 30, total: 60 * N_SHOTS, sets: { rig: buildRig },
  shots: ["hori", "point", "shout", "points", "walk", "hook"].map((id, i) => ({ id, from: 60 * i, to: 60 * i + 60, set: "rig", rig: "golden", rigOpts: { sunAz: 140, sunEl: 26 }, cam: cam(60 * i) })),
};
registerRoot(() => React.createElement(KitComposition, { id: "PointingCastV4Rig", film: V4RIG }));

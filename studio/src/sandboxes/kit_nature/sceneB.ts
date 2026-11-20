// kit_nature scene (b): a park corner with a small market, WIDE (eye-level 2.3 m, 40 mm-ish), same golden sun.
// Stalls on the cross path (coffee cart with steam, display shelves, crates, barrels, baskets, fruit, chalkboard),
// a cafe corner, picnic table, planters + flower beds, bushes, trees of two species, lamps / bins / hydrant / utility
// box, a covered car at the edge, litter, birds, falling leaves, motes, a smoke wisp from a brazier.
import * as THREE from "three";
import type { KitCtx, Built, V3 } from "../../kit/core/ctx";
import { sunDir, CROSS_Z } from "../lookpilot/shot";
import { lightScene, pilotGround } from "./base";
import { runUpdates, type KWorld, type KnProps } from "./pipe";
import { buildTrees, type TreeSpec } from "../../kit/nature/trees";
import { grass, weeds } from "../../kit/nature/grass";
import { hedge, bushes } from "../../kit/nature/hedge";
import { flowers } from "../../kit/nature/flowers";
import { scatter } from "../../kit/nature/ground_scatter";
import { plants } from "../../kit/nature/plants";
import { prop } from "../../kit/props/catalog";
import { motes, steam, smoke, embers } from "../../kit/fx/particles";
import { birds } from "../../kit/fx/birds";
import { debris } from "../../kit/fx/debris";

export const buildB = async (ctx: KitCtx, on: KnProps): Promise<KWorld> => {
  const scene = ctx.scene, root = new THREE.Group(); scene.add(root);
  await lightScene(ctx, [0, 0, -11], 26);
  await pilotGround(ctx, root);
  const modules: KWorld["modules"] = {};
  const ups: ((t: number, c: THREE.Camera) => void)[] = [];
  const add = (name: string, b: Built) => { root.add(b.object); (modules[name] ??= []).push(b.object); if (b.update) ups.push(b.update); };
  void sunDir;
  const Z = CROSS_Z;
  // ---- trees ----
  const T: TreeSpec[] = [
    { species: "jacaranda", pos: [-5.3, 0, -2.5], height: 11, seed: 21 },
    { species: "jacaranda", pos: [-6.0, 0, -18.5], height: 11.5, seed: 22 },
    { species: "jacaranda", pos: [5.5, 0, -19.5], height: 10.5, seed: 23 },
    { species: "jacaranda", pos: [11.5, 0, -7.0], height: 10, seed: 24 },
    { species: "small02", pos: [3.4, 0, -8.6], height: 4.6, seed: 25 },
    { species: "small02", pos: [-3.6, 0, -8.4], height: 4.2, seed: 26 },
    { species: "small02", pos: [8.6, 0, -15.8], height: 5, seed: 27 },
    { species: "jacaranda", pos: [-14, 0, -12], height: 11, seed: 28 },
    { species: "jacaranda", pos: [16, 0, -24], height: 11, seed: 29 },
    { species: "jacaranda", pos: [-9, 0, -32], height: 10, seed: 30 }, { species: "jacaranda", pos: [7, 0, -36], height: 10.5, seed: 31 },
  ];
  add("trees", await buildTrees(ctx, T));
  const lens: [number, number] = [1.5, -2.0];
  add("grass", await grass(ctx, { area: [{ rect: [1.3, -40, 16, 8] }, { rect: [-16, -40, -1.3, Z - 1.12] }, { rect: [-16, Z + 1.12, -2.2, 8] }],
    density: 800, falloff: { from: lens, near: 5, pow: 1.3, min: 0.12 }, seed: 31, dry: 0.2, realClumps: 0.5,
    avoid: [{ rect: [2.6, Z + 1.0, 7.6, Z + 4.2] }, { c: [9.2, -3.6], r: 1.6 }, { c: [-4.5, -5.5], r: 1.5 }] }));
  add("weeds", await weeds(ctx, { strips: [[[1.19, 6], [1.19, -30]], [[-12, Z + 1.13], [12, Z + 1.13]], [[-12, Z - 1.13], [12, Z - 1.13]]], perM: 30, plantsPerM: 0.6, seed: 12 }));
  add("hedge", await hedge(ctx, { path: [[-1.78, 6], [-1.78, Z + 1.3]], seed: 7 }));
  add("hedge", await hedge(ctx, { path: [[-1.78, Z - 1.3], [-1.78, -40]], seed: 8, leavesPerM2: 380 }));
  add("bushes", await bushes(ctx, [{ pos: [9.6, 0, -9.4], scale: 0.9 }, { pos: [11.2, 0, -12.6], scale: 0.75 }, { pos: [-4.0, 0, -15.4], scale: 0.7 }, { pos: [13.5, 0, -2.0], scale: 0.8 }], 4));
  add("flowers", await flowers(ctx, { area: [{ rect: [2.0, -6.5, 6.5, -4.6] }, { rect: [7.6, -12, 9.4, -9.0] }], density: 22, kinds: ["gazania", "periwinkle", "daisy", "daisy"], seed: 6 }));
  add("flowers", await flowers(ctx, { area: { rect: [1.3, -40, 16, 8] }, density: 3, kinds: ["daisy", "daisy", "dandelion"], seed: 9, falloff: { from: lens, near: 6, min: 0.1 } }));
  // ---- the market on the cross path (right of the main path) + cafe corner ----
  const P = async (name: string, pos: V3, rotY = 0, scale?: number) => add("props", await prop(ctx, name, { pos, rotY, scale }));
  await P("coffee_cart", [4.3, 0, Z + 0.1], Math.PI);
  await P("display_shelves", [6.8, 0, Z - 0.2], -Math.PI / 2);
  await P("crate_wood", [6.0, 0, Z + 0.75], 0.2); await P("crate_wood", [6.05, 0.35, Z + 0.72], -0.1);
  await P("crate_plastic", [7.6, 0, Z + 0.6], 0.5); await P("barrel_wine", [8.4, 0, Z - 0.3], 0.3);
  await P("basket_wicker", [5.9, 0.71, Z + 0.72], 0.4); await P("bananas", [6.1, 0.75, Z + 0.68], 1.1); await P("apple", [5.75, 0.76, Z + 0.8]);
  await P("chalkboard", [3.0, 0, Z + 1.2], 0.5); await P("box_cardboard", [8.9, 0, Z + 0.5], 0.8);
  await P("cafe_set", [3.6, 0, Z + 3.0], 0.6); await P("chair_plastic", [5.6, 0, Z + 2.6], -0.9); await P("cafe_table", [6.3, 0, Z + 3.4], 0.2);
  await P("tea_set", [6.3, 0.726, Z + 3.4], 0.4, 0.6);
  await P("picnic_table", [9.2, 0, -3.6], 1.2);
  await P("planter_long", [2.4, 0, -4.0], Math.PI / 2); await P("potted_tall", [2.5, 0, -2.6]); await P("potted", [9.9, 0, Z + 1.6]); await P("pot_clay", [3.3, 0, Z - 0.9]);
  await P("lamp_post", [1.62, 0, -6.0], -Math.PI / 2); await P("lamp_post", [1.62, 0, Z - 2.0], -Math.PI / 2); await P("lamp_garden", [10.6, 0, Z + 1.4]);
  await P("bin", [1.75, 0, -8.2], -Math.PI / 2); await P("trash_bag", [9.4, 0, Z + 0.9], 0.3); await P("hydrant", [-1.0, 0, Z + 1.6], 0.4);
  await P("utility_box", [12.2, 0, Z + 1.3], -0.3); await P("bench_slats", [-3.6, 0, Z + 1.55], Math.PI);
  await P("car_covered", [14.5, 0, Z - 3.5], 1.35); await P("hand_truck", [9.2, 0, Z - 0.6], -0.4); await P("bucket_wood", [3.6, 0, Z - 0.8], 0.2);
  await P("watering_can", [2.9, 0, -3.3], 0.8); await P("gnome", [9.9, 0, -9.8], -0.6); await P("boulder", [13.2, 0, -14], 0.5, 0.7);
  add("flowers", await plants(ctx, { model: "periwinkle_plant", points: Array.from({ length: 9 }, (_, i) => ({ pos: [2.27 + 0.26 * (i % 2), 0.36, -4.5 + i * 0.12] as V3, scale: 0.9 })), seed: 3 }));
  // ---- litter ----
  add("litter", await scatter(ctx, { area: [{ rect: [-12, Z - 1.1, 12, Z + 1.1] }, { rect: [-1.15, -30, 1.15, 6] }], kinds: [{ kind: "leaf", weight: 6 }, { kind: "pebble", weight: 2 }, { kind: "twig", weight: 1 }, { kind: "paper", weight: 0.3 }, { kind: "cap", weight: 0.3 }, { kind: "wrapper", weight: 0.3 }],
    density: 5, clump: 0.6, seed: 18 }));
  add("litter", await scatter(ctx, { area: { rect: [1.3, -24, 14, 6] }, kinds: [{ kind: "leaf", weight: 4 }, { kind: "leafGreen", weight: 1 }, { kind: "petal", weight: 1 }], density: 3, clump: 0.8, seed: 19 }));
  // ---- FX ----
  add("fx", motes(ctx, { box: [[-2, 0.2, -18], [12, 4.5, 4]], count: 3200 }));
  add("fx", steam(ctx, { pos: [4.0, 1.12, Z + 0.15] }));
  add("fx", smoke(ctx, { pos: [-6.5, 0.3, -27], count: 90, size: [0.3, 2.6] }));
  add("fx", embers(ctx, { pos: [-6.5, 0.3, -27], count: 30 }));
  add("fx", birds(ctx, { flock: { path: { center: [2, 13, -20], radius: 10, period: 14 }, count: 14, spread: [4, 1.5, 4] }, singles: [{ from: [-14, 9, -22], to: [16, 10, -28], t0: 0, t1: 5, arc: 1 }], seed: 5 }));
  add("fx", await debris(ctx, "falling", { box: [[-8, 4, -22], [8, 9, -2]], count: 50, seed: 4 }));
  add("fx", await debris(ctx, "blowing", { box: [[-10, 0, Z - 1.1], [10, 0, Z + 1.1]], count: 16, seed: 5 }));
  add("fx", await debris(ctx, "paper", { box: [[-8, 0, Z - 0.8], [8, 0, Z + 0.8]], count: 2, seed: 6 }));
  void on;
  // camera: a slow wide drift across the lawn toward the market (eye level, vertical FOV 58)
  const ease = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
  // (side-lit: looking across the market with the low sun on the left, not into it)
  const cam = (t: number) => { const u = ease(t / 5); return { pos: [0.45 + 0.45 * u, 1.9 - 0.05 * u, 1.2 - 1.3 * u] as V3, look: [5.4 - 0.3 * u, 0.9, Z - 0.4] as V3, fov: 58, roll: 0 }; };
  return {
    ctx, modules, haze: 0.0012,
    update: (t, c) => { for (const u of ups) u(t, c); runUpdates(ctx, t, c); },
    cam, focus: (t) => { const c = cam(t); return Math.hypot(c.pos[0] - 5.0, c.pos[1] - 1, c.pos[2] - Z); },
  };
};

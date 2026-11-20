// kit_nature scene (a): the pilot's low 25 mm backward track down the campus path (same camera, sun, ground, phone guy),
// dressed with NATURE's kit: real trees overhead, grass edges, hedge, leaf litter, props (bench, lamp, bin), dust, birds.
import * as THREE from "three";
import type { KitCtx, Built } from "../../kit/core/ctx";
import { camAt, focusAt, sunDir, CROSS_Z, charPos } from "../lookpilot/shot";
import { lightScene, pilotGround, heroCard } from "./base";
import { runUpdates, type KWorld, type KnProps } from "./pipe";
import { buildTrees, sunGap, type TreeSpec } from "../../kit/nature/trees";
import { grass, weeds } from "../../kit/nature/grass";
import { hedge } from "../../kit/nature/hedge";
import { flowers } from "../../kit/nature/flowers";
import { scatter } from "../../kit/nature/ground_scatter";
import { prop } from "../../kit/props/catalog";
import { motes, puffs, rain, sparks, fireflies, smoke, steam, WET } from "../../kit/fx/particles";
import { birds } from "../../kit/fx/birds";
import { debris } from "../../kit/fx/debris";

export const buildA = async (ctx: KitCtx, on: KnProps): Promise<KWorld> => {
  const scene = ctx.scene, root = new THREE.Group(); scene.add(root);
  await lightScene(ctx, [-1.5, 0, -10]);
  await pilotGround(ctx, root);
  const hero = heroCard(ctx, root);
  const modules: KWorld["modules"] = {};
  const ups: ((t: number, c: THREE.Camera) => void)[] = [hero.update];
  const add = (name: string, b: Built) => { root.add(b.object); (modules[name] ??= []).push(b.object); if (b.update) ups.push(b.update); };
  const L = sunDir();
  // ---- trees: left row (sun side, canopies over the path), right row (backlit framing), far-left row ----
  const gap = [...sunGap([0.3, 0, -1.0], L, 2.2), ...sunGap([0.3, 0, 1.5], L, 1.6)];
  const T: TreeSpec[] = [
    { species: "jacaranda", pos: [-5.0, 0, -2.5], height: 11, seed: 1, gaps: gap },
    { species: "jacaranda", pos: [-5.3, 0, -12.5], height: 11.5, seed: 2, gaps: gap },
    { species: "jacaranda", pos: [4.9, 0, -7.0], height: 10.5, seed: 3 },
    { species: "jacaranda", pos: [5.2, 0, -17.5], height: 11, seed: 5 },
    { species: "jacaranda", pos: [-5.1, 0, -23.0], height: 11, seed: 6 },
    { species: "jacaranda", pos: [4.8, 0, 3.5], height: 10, seed: 9 },
    { species: "jacaranda", pos: [-5.0, 0, 7.5], height: 10.5, seed: 4 },
    { species: "small02", pos: [2.9, 0, -12.2], height: 4.4, seed: 7 },
    { species: "jacaranda", pos: [-11.5, 0, -9.0], height: 11, seed: 8, gaps: gap },
    { species: "jacaranda", pos: [-5.2, 0, -34.0], height: 10.5, seed: 10 },
    { species: "jacaranda", pos: [5.0, 0, -29.0], height: 10, seed: 11 },
    { species: "small02", pos: [-12, 0, -45.0], height: 5, seed: 12 }, { species: "small02", pos: [12, 0, -50.0], height: 5.5, seed: 13 },
  ];
  add("trees", await buildTrees(ctx, T));
  const lens: [number, number] = [0.3, 0.5];
  // ---- grass: right lawn (dense near the lens), a strip left of the hedge base, the cross path edges ----
  add("grass", await grass(ctx, { area: [{ rect: [1.3, -48, 9.5, 7.5] }, { rect: [-1.42, -48, -1.29, 7.5] }, { rect: [-12, CROSS_Z + 1.12, 12, CROSS_Z + 1.5] }],
    density: 950, falloff: { from: lens, near: 5, pow: 1.2, min: 0.18 }, seed: 11, dry: 0.18, realClumps: 2.2,
    avoid: [{ c: [2.1, -3.6], r: 0.9 }, { c: [1.62, -7.4], r: 0.25 }, { c: [1.75, -5.3], r: 0.35 }] }));
  // ---- weeds in the kerb joints + the brick path's edge joints ----
  add("weeds", await weeds(ctx, { strips: [[[1.19, 7], [1.19, -40]], [[-1.19, 7], [-1.19, -40]]], width: 0.07, perM: 35, plantsPerM: 0.5, seed: 4, falloff: { from: lens, near: 4, pow: 1.3, min: 0.1 } }));
  // ---- hedge (left of the path, broken by the cross path) ----
  add("hedge", await hedge(ctx, { path: [[-1.78, 9], [-1.78, CROSS_Z + 1.3]], seed: 2 }));
  add("hedge", await hedge(ctx, { path: [[-1.78, CROSS_Z - 1.3], [-1.78, -60]], seed: 3, leavesPerM2: 380 }));
  // ---- daisies + dandelions in the lawn ----
  add("flowers", await flowers(ctx, { area: { rect: [1.35, -24, 7.5, 7] }, density: 9, kinds: ["daisy", "daisy", "daisy", "dandelion"], seed: 5, falloff: { from: lens, near: 4, min: 0.15 } }));
  // ---- leaf litter on the path + lawn edge, a few twigs / pebbles / a paper scrap ----
  add("litter", await scatter(ctx, { area: { rect: [-1.15, -30, 1.15, 6] }, kinds: [{ kind: "leaf", weight: 6 }, { kind: "leafGreen", weight: 1 }, { kind: "twig", weight: 1 }, { kind: "pebble", weight: 2 }, { kind: "petal", weight: 1 }],
    density: 7, clump: 0.6, seed: 8, falloff: { from: lens, near: 5, min: 0.12 }, avoid: [{ c: [0.35, -2.2], r: 0.5 }] }));
  add("litter", await scatter(ctx, { area: { rect: [-1.15, -12, 1.15, 4] }, kinds: ["paper", "wrapper", "cap"], density: 0.06, seed: 9 }));
  add("litter", await scatter(ctx, { area: { strip: [[1.3, 6], [1.3, -30]], width: 0.5 }, kinds: [{ kind: "leaf", weight: 5 }, { kind: "twig", weight: 1 }], density: 18, clump: 0.5, seed: 10 }));
  // ---- props: bench, lamp posts, bin ----
  add("props", await prop(ctx, "bench_slats", { pos: [2.1, 0, -3.6], rotY: -Math.PI / 2 }));
  add("props", await prop(ctx, "lamp_post", { pos: [1.62, 0, -7.4], rotY: -Math.PI / 2 }));
  add("props", await prop(ctx, "lamp_post", { pos: [1.62, 0, -27.0], rotY: -Math.PI / 2 }));
  add("props", await prop(ctx, "bin", { pos: [1.75, 0, -5.3], rotY: -Math.PI / 2 }));
  // ---- FX: sun dust, footstep puffs (his steps), birds (a flock crossing + one gliding), falling leaves ----
  add("fx", motes(ctx, { box: [[-3.2, 0.15, -14], [3.2, 3.8, 4]], count: 2600 }));
  const steps = Array.from({ length: 12 }, (_, i) => { const t = 0.18 + i * 0.53; const p = charPos(t); return { t, pos: [p[0] + (i % 2 ? 0.08 : -0.08), 0, p[2]] as [number, number, number], k: 0.5 }; });
  add("fx", puffs(ctx, { events: steps, perPuff: 6, color: 0xc8b49c, size: [0.03, 0.16], alpha: 0.14 }));
  add("fx", birds(ctx, { flock: { path: { from: [-14, 9, -22], to: [16, 12, -16], t0: 0.2, t1: 5.2, arc: 1.5 }, count: 9, spread: [3, 1.2, 2.5] }, singles: [{ center: [1, 11, -18], radius: 7, period: 11, phase: 1 }], size: 0.34, seed: 3 }));
  add("fx", await debris(ctx, "falling", { box: [[-4, 4, -14], [3, 8, 1]], count: 26, seed: 2 }));
  add("fx", await debris(ctx, "blowing", { box: [[-1.1, 0, -10], [1.1, 0, 3]], count: 10, seed: 3 }));
  // FX test (kn.cam = "fxtest"): rain + splashes + wet hook, sparks, fireflies, smoke, steam in the same view
  if (on.cam === "fxtest") {
    add("fxtest", rain(ctx, { box: [[-4, 0, -10], [4, 6, 3]], count: 4000 }));
    add("fxtest", sparks(ctx, { pos: [1.4, 0.9, -2.2], dir: [-0.4, 1, 0.3], count: 140 }));
    add("fxtest", fireflies(ctx, { box: [[-1.5, 0.3, -6], [2.5, 2.2, -1]], count: 50 }));
    add("fxtest", smoke(ctx, { pos: [-1.0, 0.95, -8], count: 120 }));
    add("fxtest", steam(ctx, { pos: [1.8, 0.95, -5.3] }));
    WET.value = 0.7;
  }
  return {
    ctx, modules, haze: 0.0012,
    update: (t, cam) => { for (const u of ups) u(t, cam); runUpdates(ctx, t, cam); },
    cam: (t) => { const c = camAt(t); return { pos: c.pos, look: c.look, fov: c.fov, roll: c.roll }; },
    focus: focusAt,
  };
};

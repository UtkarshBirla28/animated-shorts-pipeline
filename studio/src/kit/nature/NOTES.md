# kit/nature + kit/props + kit/fx (NATURE owner): NOTES

Status (2026-11-19, ~14:50): all modules exist, typecheck clean (`npx tsc --noEmit -p src/sandboxes/kit_nature/tsconfig.json`,
0 errors in nature / props / fx / the sandbox), proven in the sandbox scenes KnA (pilot path) and KnB (park market wide).
Costs and the comparison stills are in "Measured" below. Everything is a `async (ctx: KitCtx, opts) => Built` (or sync for
fx), pure function of t, seeded, no Math.random. Every patched material has its own `customProgramCacheKey`
("nature:*", "fx:*").

## Files
| file | what |
|---|---|
| `nature/wind.ts` | ONE wind field for everything: `WIND` (dir + strength), GLSL: `SWAY_GLSL` (tree sway: lean + side + branch + twig scales, gusts), `FLUTTER_GLSL` (leaf flap + shimmer), `COVERAGE_GLSL` (alpha boosted by mip level: far foliage does not erode), `TRANSLUCENT_GLSL` (backlit glow with the real sun shadow), `keyed()` |
| `nature/trees.ts` | `buildTrees(ctx, specs)`, `tree(ctx, spec)`, `sunGap(ground, sunDir, r)`, `TREE_SPECIES` |
| `nature/plants.ts` | `plants(ctx, { model, points })`: any CC0 plant model (each glTF child = a variant) instanced with wind / translucency |
| `nature/grass.ts` | `grass(ctx, opts)` (clumped blades, dry patches, distance falloff, real clumps option), `weeds(ctx, { strips })` |
| `nature/hedge.ts` | `hedge(ctx, { path })` (core + leaf shell with depth), `bushes(ctx, points)` (real shrub_02) |
| `nature/flowers.ts` | `flowers(ctx, { area, kinds, density })`: daisy cards + real gazania / periwinkle / dandelion |
| `nature/ground_scatter.ts` | `scatterPoints(opts)` (deterministic points), `scatter(ctx, { area, kinds, density, seed, avoid })` (litter), `vnoise`, `leafAtlas`, `curledLeafGeo` |
| `nature/index.ts` | re-exports |
| `props/catalog.ts` | `PROPS` (52 friendly names), `prop(ctx, name, { pos, rotY, scale })`, `props(ctx, list)`, `contactShadow(w, d)` |
| `fx/particles.ts` | `motes`, `puffs`, `smoke`, `steam`, `sparks`, `embers`, `fireflies`, `rain`, `wetHook` + `WET` |
| `fx/birds.ts` | `birds(ctx, { flock, singles })` |
| `fx/debris.ts` | `debris(ctx, "falling" \| "blowing" \| "paper", { box })` |
| `fx/index.ts` | re-exports |
| `nature/prep/*.py`, `props/prep/*.py` | OFFLINE asset prep (Blender 5.2 headless only as a prep tool, never shots) |

## API (short)
```ts
import { buildTrees, sunGap, grass, weeds, hedge, bushes, flowers, scatter, plants } from "../../kit/nature";
import { prop, props } from "../../kit/props/catalog";
import * as fx from "../../kit/fx";
const trees = await buildTrees(ctx, [
  { species: "jacaranda", pos: [-5, 0, -2.5], height: 11, seed: 1, gaps: sunGap([0.3, 0, -1], ctx.rig.sunDir, 2.2) },
  { species: "small02", pos: [3, 0, -12], height: 4.4, seed: 7 },
]);                                              // Built: object + update(t, cam) (LOD per sub-frame)
const lawn = await grass(ctx, { area: { rect: [1.3, -48, 9.5, 7.5] }, density: 950, falloff: { from: [0.3, 0.5], near: 5 }, dry: 0.18, realClumps: 2 });
const joints = await weeds(ctx, { strips: [[[1.19, 7], [1.19, -40]]], width: 0.07 });
const h = await hedge(ctx, { path: [[-1.78, 9], [-1.78, -11]], height: 0.95, width: 0.7 });
const f = await flowers(ctx, { area: { rect: [1.4, -24, 7.5, 7] }, kinds: ["daisy", "dandelion"], density: 9 });
const litter = await scatter(ctx, { area: { rect: [-1.15, -30, 1.15, 6] }, kinds: [{ kind: "leaf", weight: 6 }, "twig", "pebble"], density: 7, clump: 0.6, seed: 8, avoid: [{ c: [0.3, -2], r: 0.5 }] });
const bench = await prop(ctx, "bench_slats", { pos: [2.1, 0, -3.6], rotY: -Math.PI / 2 });
const dust = fx.motes(ctx, { box: [[-3, 0.15, -14], [3, 3.8, 4]] });
const flock = fx.birds(ctx, { flock: { path: { from: [-14, 9, -22], to: [16, 12, -16], t0: 0, t1: 5 }, count: 9 } });
// add each .object to the set; call each .update(t, cam) from the set's update (CORE's pipeline calls Built.update)
```
- Areas: `{ rect: [x0, z0, x1, z1] }`, `{ poly: [[x, z], ...] }`, `{ strip: [[x, z], ...], width }`. Avoid: `{ c: [x, z], r }`, rect, poly.
- Every FX takes `{ on, density (0..1 share of particles), seed }`; all FX are pure functions of t (events for puffs).
- `sunGap(ground, sunDir, r)`: crown gaps along the ray to the sun, so a walker steps into a sun patch at `ground`.
- `wetHook(material, key)` + `WET.value = 0..1`: darker, glossy ground (rain shots); SURFACES can call it on their materials.

## Trees: how they are made (closing the pilot's "streaky twig cards" gap)
- Source: Poly Haven `jacaranda_tree` (CC0, already local from the Blender pilot) and `tree_small_02` (2k blend).
  `export_gn_tree.py` opens the .blend, MUTES the geometry-nodes "Realize Instances" nodes, evaluates, and exports the
  tree's own leaf clusters as INSTANCES (jacaranda: 6,015 clusters of 5 kinds, 16-144 faces each; small02: 3,312 of 6
  kinds) + the trunk / branch meshes (+ decimated low twins) to a .glb, the instance transforms to `.inst.bin`.
- In three.js each tree = trunk + branches (real branch structure from the asset) + one InstancedMesh per cluster kind.
  Per tree (seeded): yaw, height, colour drift, crown holes (+ explicit world gaps), cluster thinning (`keep`), a
  low-frequency tint field over the crown, crown-depth AO per cluster (direction-binned crown shell), crown-outward bent
  normals (62 %), translucency toward the sun, coverage-preserving alpha, leaf colour edge padding (no dark mip fringes).
- Wind: tree-local sway field (height^1.5 x radial weight; lean + side sway + branch + twig scales, gusts) evaluated at the
  cluster's attachment point (clusters ride their branch) + a per-cluster flap / leaflet shimmer. Same code in the depth
  material: the leaf SHADOWS move.
- LOD: clusters are stored in a seeded random rank order, so a prefix = a random subset. Per sub-frame:
  `keep(d) = base x min(1, (near / d)^0.75)` (near 14 m), never below `minKeep`; the kept clusters scale by
  sqrt(base / keep) (coverage held). Wood swaps to the low meshes beyond `far` (38 m).
- SHADOW TWIN: the colour-pass leaves do not cast; a twin InstancedMesh (count 0 in the colour pass, `shadowKeep` 0.38 of
  the clusters, scaled up to keep the dapple density) is the only leaf caster in the sun and card shadow maps
  (onBeforeShadow / onAfterShadow set its count).

## Props catalogue (`PROPS`, 52 names on 46 CC0 Poly Haven assets, public/kit/props/, 128 MB)
street / park: bench_slats, bench_long, lamp_post (3.9 m), lamp_garden, bin, bin_rusty, trash_bag, hydrant, hydrant_old,
barrier, utility_box, manhole, fence_chainlink, payphone, car_covered, barrier_stump, boulder, rocks_moss, gnome |
cafe / market / yard: picnic_table, cafe_set, cafe_table, cafe_chair, chair_plastic, stool_folding, stool_wood,
coffee_cart, display_shelves, chalkboard (blank), crate_wood, crate_long, crate_plastic, box_cardboard, barrel_wine,
barrel_metal, basket_wicker, bucket_wood, watering_can, hand_truck, tyre, lantern, bananas, apple | plants in pots:
planter_box, planter_long, potted_tall, potted, pot_clay | hand props: tea_set, teapot, cup, clipboard.
Real-world scale from the assets (catalog.json: size per asset and per part). `prop()` keeps the named parts, centres
them on their footprint, puts the lowest point on the ground, sets cast / receive shadow, adds a contact-shadow blob.

## Plants (public/kit/plants/, 17 MB): weed_plant_02, dandelion_01, flower_gazania, periwinkle_plant, grass_medium_01,
fern_02, shrub_02 (all Poly Haven CC0, 1k glTF as downloaded).

## Licences: every asset has a row in `studio/public/kit/LICENSES.md` (owner NATURE).

## Measured (2026-11-19, GTX 1660 Ti via ANGLE, GPU shared with the Old Light session = noisy; probe = full pipeline A
## per sub-frame at 1080x1920, all on vs that module hidden, min of 3 interleaved rounds, 1-px readPixels sync)
| scene | all modules | trees | grass | weeds | hedge | bushes | flowers | props | litter | fx | frame, 8 sub-frames |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KnA pilot path (13 trees, 3 overhead) | 50.6 ms | 37.0 | 1.5 | ~0 | 3.7 | - | 0.5 | 0.5 | ~0 | 0.1 | 1,222 ms (incl. the hero card canvas redraw per sub-frame) |
| KnB park market wide (11 trees, 46 props) | 45.8 ms | 30.3 | 3.8 | ~0 | ~0 | 0.8 | 1.1 | 4.0 | 0.1 | ~0 | 378 ms |
- "all" includes the pilot base (ground, building, sky, N8AO, shafts, both 4096 sun maps). The budget (final <= 4 s / frame
  wall) is met with a wide margin: the whole NATURE dressing costs ~0.3-0.4 s per final frame (8 x ~45 ms). The pilot's
  procedural crowns + 185k blades + 67k hedge leaves cost ~0.3 s per SUB-frame in its notes.
- Trees dominate (overdraw of alpha leaves, as the Blender notes found); the shadow twin (38 % of the clusters) keeps
  their two shadow passes cheap. Near jacaranda ~0.3-0.45 M leaf triangles at keep 0.8; far trees fall to 12 %.
- Set builds: KnA 4-7 s, KnB 6-9 s (both under the 30 s limit; most of it is glb + texture decode, cached per tab).
- Draft still (540x960 screenshot of the 1080 canvas, 1 sub-frame): ~40-55 s wall per still through stills_locked incl.
  the bundle + page start (the slot queue adds more when the other session holds both slots). That is over the 25 s draft
  target: the time is the page start + world build + first-frame shader compile, not the GPU frame (~0.2 s).

## Comparison stills (studio/out/kit_nature/)
- `COMPARE_A_blender_pilot_kit.jpg`: Blender pilot still_f050 | three.js pilot still_050 | kit NATURE KnA f50 (8 sub-frames, 1080x1920).
- `A_final_50.jpg` (KnA f50, final), `B_final_60.jpg` (KnB f60, final), `fx_60.jpg` (FX test, `kn.cam = "fxtest"`: all shaders compile; rain streaks + splashes + wet
  pavers, sparks, fireflies, smoke, steam), earlier tests a1-a3 / b1-b3.

## Honest gaps
- Trees: 2 species only (jacaranda, small02). No baked impostor / billboard for far trees (far trees use the cluster LOD:
  12 % of the clusters, scaled up, + the low wood mesh; fine to ~60 m, not tested for a 300-tree skyline). The small02
  "trunk" node also carries some realized leaves (those do not LOD). Wind is a smooth procedural field (lean / sway /
  branch / twig + flutter), not a per-branch skeleton: no branch whips or hierarchy lag. Leaves still alpha-test (8x
  sub-frame jitter smooths edges; 1-sub-frame previews shimmer a little).
- Hedge leaves are the ambientCG beech-like LeafSet024 cards (reads as a clipped broadleaf hedge, not privet/box).
- Real grass clumps (grass_medium_01) read darker / spikier than the blades; use sparingly (realClumps 0.5-2 / m2).
- Props missing (no CC0 model found on Poly Haven, other sources not searched): an uncovered car (only `car_covered`),
  a bicycle, a mobile phone, books, market awnings / tents. `payphone` carries small Korean labels (text, not a brand).
- FX: birds are low-poly grey shapes (fine as background life, not a hero bird); debris loops on fixed cycles; rain /
  sparks / fireflies verified in one test still only; no splash on characters; footstep puffs need the walker's step
  events from the caller (`puffs({ events })`).
- Not yet run inside CORE's <KitFilm> (its pipeline was still in progress); the modules only use KitCtx (`ctx.sun` for the
  particles' sun visibility, `ctx.windT`, `ctx.assets`), so they should drop in. CORE's `n8ao.d.ts` makes
  `A.addPass(n8)` fail to typecheck (optional `setDepthTexture`); my sandbox casts around it, CORE's pipeline.tsx shows
  the same error.
- Probe numbers are noisy (shared GPU); treat them as +-30 %.
- FX test note: at WET 0.7 the pavers mirror the blue sky strongly; use WET 0.3-0.5 under a golden rig. Sparks were out
  of frame in that still (not visually checked).

## Render commands (from studio/)
`COMP=KnA ENTRY=src/sandboxes/kit_nature/index.ts PROPS='{"kn":{"mb":8,"probe":true}}' bash scripts/stills_locked.sh out/kit_nature/A_final_ 50 1`
(`KnB` = park market; `kn.mb` sub-frames, `kn.probe` logs GPU ms per module, `kn.off: "trees,grass"` hides modules,
`kn.cam: "fxtest"` adds rain / sparks / fireflies / smoke / steam + wet pavers to KnA).

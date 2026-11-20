# REAL-WORLD KIT ("rw kit"): the contract every builder follows (lead, 2026-11-19)

The owner chose **three.js only** for all future Shorts, with **Blender-level detail** ("you see the walking path, how
detailed it looks... not just this but all things"), a **much faster workflow**, and **every detail decided before the
build**. Proof of what is possible: the look pilot (`C:\Users\utkar\Desktop\animated-shorts-studio\lookpilot\`). Read
both `threejs/NOTES.md` and `blender/NOTES.md` first, and look at `lookpilot/preview/COMPARE_clown_threejs_blender_reference.jpg`,
the Blender stills `lookpilot/blender/still_f000.jpg` .. `still_f149.jpg` (the DETAIL target) and the three.js stills
`lookpilot/threejs/still_*.jpg` (the LOOK target: warm, bright, golden; the owner's pick).
Research behind it: `C:\Users\utkar\research_notes\ricksclips\LOOK_REPORT.md`.

The kit lives in `studio/src/kit/` and replaces the painted / inked world for NEW videos. Old films
(`studio/src/videos/*`) are never edited. Starting code: the pilot sandbox `studio/src/sandboxes/lookpilot/`
(`LookPilot.tsx` pipeline, `world.ts` set, `shaders.ts` PCSS / wind / card / shafts / accumulation / grade, `shot.ts`).
Copy from it freely; do not edit it (it is the frozen proof).

## Folders and owners (one owner per folder; never write in another owner's folder)
| folder | owner | what |
|---|---|---|
| `kit/core/` | CORE | render pipeline component, quality presets, light rigs + HDRI library, bounce / GI, camera grammar, asset loader + cache, perf logging, per-shot cached render scripts |
| `kit/surfaces/` | SURFACES | PBR material registry (anti-tiling, parallax / displacement, moss / dirt / wet / wear blends), ground kit, decals, building facade kit, interior room kit |
| `kit/nature/`, `kit/props/`, `kit/fx/` | NATURE | real tree meshes + wind, grass, hedges, flowers, leaf litter; CC0 prop catalog; dust / smoke / sparks / rain / footstep puffs / birds / blowing leaves |
| `kit/cards/` | CARDS | 2D characters inside the light: card material, dapple visibility, rim, bounce, form shading, shadow proxy, contact, foot occlusion, lamp tint |
| `tools/v3/`, `PIPELINE_V3.md`, `briefs/v3/` (repo root) | WORKFLOW | pre-production DETAIL BIBLE + validators, script linter, storyboard stills, animatic, per-shot cached renders (with CORE), automatic QA gates, new-short scaffold v3 |

Each owner also gets a test sandbox `studio/src/sandboxes/kit_<owner>/` (own `index.ts`, `Root.tsx`, `tsconfig.json`
that extends `../../../tsconfig.json` and includes its own folder + `../../kit/**/*`), rendered with
`COMP=<id> ENTRY=src/sandboxes/kit_<owner>/index.ts` like the pilot (see `lookpilot/threejs/NOTES.md`, "Render").

## Shared types: `kit/core/ctx.ts` (written by the lead; CORE may ADD fields, never rename or remove; tell the lead)
Every kit builder is `async (ctx: KitCtx, opts) => Built`. Units: metres, Y up, +Z toward the default camera. Time `t`
is seconds since film start; everything is a PURE function of `t` (seeded noise only, no Math.random / Date). Every
per-time change goes in `Built.update(t, cam)`, which the pipeline calls on every SUB-frame (motion blur). Colour
textures sRGB, data textures linear. Shadows: anything that should cast sets `castShadow`; the pipeline owns the
sun and the shadow maps. Until CORE's pipeline exists, test with a copy of the pilot's pipeline inside your sandbox.

## THE DETAIL STANDARD (what "Blender-level" means; every builder meets it, the validator checks it)
1. **Three scales of detail on every surface within 15 m of the lens:** macro (colour / wear variation over metres, so
   no tiling is visible), meso (real shape: displacement or parallax on ground and walls near the lens, bevels on hard
   edges, mortar / joints / planks with depth) and micro (normal + roughness maps, 2K near the lens).
2. **No bare primitives near the lens.** Nothing within 15 m reads as a plain box or plane: buildings get window
   insets, frames, sills, trims, gutters, a roof edge; kerbs get bevels and wear; floors get boards / tiles with gaps.
3. **Wear and ground truth:** dirt at the bottoms of walls and objects, moss or weeds in joints outdoors, scuffs on
   floors, stains, cracks, puddles where they fit; leaf litter / pebbles / paper scraps scattered (instanced) on grounds.
4. **Contact:** every object touching the ground has a contact shadow + AO; nothing floats; characters get a contact
   shadow and, on grass, blades in front of their feet.
5. **Real vegetation:** real tree meshes with branch structure and irregular crowns (CC0 models), wind that also moves
   the shadows; grass with density near the lens; hedges with leaf depth.
6. **Light you can feel:** the LOOK is the warm, bright, golden pilot look (the owner's pick): HDRI sky + a warm sun,
   soft contact-hardening shadows, AO, bounce light in shade, haze / shafts, bloom on highlights, AgX, a calm grade
   (mean chroma ~24, near-neutral shadows). Interiors and night use practical lights that really light the set.
7. **Life:** at least 3 things moving in every shot besides the camera (wind, people, birds, dust, cars, smoke...).
8. **Only the characters are drawn** (ink outlines only on the 2D cards); the world is never inked.

## Speed budget (the owner: "video time should be less"; GTX 1660 Ti 6 GB, 16 GB RAM shared with another session)
- final (1080x1920, 8 sub-frames): <= 4 s per frame wall for a full shot, so a 75-s film renders in <= 2.5 h;
  `final4` (4 sub-frames) about half that.
- preview (540x960, 1 sub-frame): <= 0.6 s per frame, so a whole-film animatic renders in <= 25 min.
- draft still (540x960, 1 sub-frame): <= 25 s including the page start.
- VRAM per render tab <= 2.5 GB; RAM per tab <= 1.5 GB. Set builds <= 30 s each, cached.
- Measure and log every module's cost (GPU ms per sub-frame at final quality) in your NOTES.md.

## House rules (binding)
- The PC is shared with another Claude session (Old Light / Universe) that renders its own videos. Stills ONLY via
  `bash scripts/stills_locked.sh ...` (2 slots machine-wide). Any multi-frame render: take the RAM token first
  (`source scripts/ram_token.sh; ram_take "<job>"; ...; ram_release`) and keep it short. Never kill another session's
  processes. One heavy process of yours at a time.
- Never `npm install` into `studio/`. Use only what is in `studio/node_modules` (three r175, @react-three/fiber,
  postprocessing 6.37.2, n8ao 1.10.3, the three/examples/jsm loaders and helpers). Check before using anything.
- CC0 assets only (Poly Haven, ambientCG; the `mcp__assets__polyhaven_*` / `mcp__assets__ambientcg_*` tools search and
  list files; download with curl to `studio/public/kit/<category>/<name>/`). Add each one to
  `studio/public/kit/LICENSES.md` (asset, source URL, author, licence). Prefer 1K-2K JPG; 4K only for hero grounds and
  HDRIs. Keep the whole kit under ~1.5 GB on disk.
- Typecheck your own tsconfig clean. Do not commit or push. Never play audio or video out loud. Save often, and keep a
  `NOTES.md` in your folder (what exists, the API, the cost, honest gaps) as you go: the connection drops sometimes.

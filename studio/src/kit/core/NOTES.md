# kit/core (CORE owner): NOTES + API

## STATUS (third CORE owner, 2026-11-19 21:25): round 3 done, nothing running, no RAM token or stills slot held
Typecheck clean (`npx tsc --noEmit -p src/sandboxes/kit_core/tsconfig.json`, which also covers every `kit/**` folder).
What round 3 changed is in "Round 3" near the bottom; the API sections below are up to date. In short:
- `lamp.set(0)` no longer hides the light (the recompile bug); the pipeline compiles a set's shaders BEFORE its first
  update; a documented + checked LIGHT BUDGET; glow-only fixtures (`light: false`).
- `Film.cardLight` now defaults to `"off"` (ctx.sunCard is null; kit/cards falls back to ctx.sun by itself).
- Lamp colours follow the rig's white balance (`wbKelvin`); interiorWarm / nightPractical less orange, night brighter.
- A set can adapt every rig to itself (`Built.hints.rigOpts`); `warmth`; `proc:dayRoom`; probe GI at draft too.
- K-K1 (screens + record UI) is unchanged: built, documented, proven in the sandbox, NOT used by the pointing film
  (script v3 has no phone shots; the lead dropped the film recipes at 20:47).
History: owner 1 built the kit (to 17:15), owner 2 took over at 17:40 and was paused at 17:44 before any edit.

## Files
| file | what |
|---|---|
| `ctx.ts` | the shared types (lead's contract + CORE's OPTIONAL additions: `LightRigState.ambient/bounce/fog*/practicalK`, `PracticalSpec` (+ `shadowNear`, `light`), `Practical`, `RigSpec` (+ `env`, `wbKelvin`, `warmth`), `KitCtx.sunCard/size/setId/practical/onFrame/renderAt`, `Built.hints` (+ `rigOpts`), `ShotDef.rigOpts/shadow/shutter/probe`, `Film.rigs/cardLight`) |
| `pipeline.tsx` | `<KitFilm film quality overlay />`, `KitComposition`, `useKitFrame()`, `QUALITY` presets, `LIGHT_BUDGET`, `excludeFromCardShadow()` |
| `shaders.ts` | PCSS patch (global, idempotent), `KIT_SEED` + `seeded()` / auto-seeding, accumulation (+ shafts), copy, `KitGrade` |
| `assets.ts` | `makeAssets()` -> `AssetLoader` (tex / pbr / hdri / gltf), caches across shots and sets |
| `rigs.ts` | `RIGS` (golden default, morning, noon, overcastWarm, dusk, interiorWarm, nightPractical, undergroundWarm), `resolveRig()`, `kelvin()`, `lampColor()`, `practical()`, `PROC_ENVS` / `envTexture()` |
| `screen.ts` | K-K1: `screen(ctx, spec)` = a phone / monitor screen showing this set through a second camera (live or a replay at another scene time), `LAYER_SCREEN_ONLY` / `LAYER_MAIN_ONLY`, `screenOnly()` / `mainOnly()` |
| `phone_ui.tsx` | K-K1: the record UI (red dot, timer, corner brackets): `<RecordUI t timer />` overlay for full-frame phone POVs + `drawRecordUI()` (the same drawing on a canvas, used by screens), `recTimer(t0, offsetS)` |
| `gi.ts` | bounce light: cube render of the built set -> `LightProbe` (SH) + cheap ground-bounce hemisphere |
| `camera.ts` | camera grammar (11 presets), `shotCam()`, seeded handheld shake, `camSpeedStats()` (on-screen speed, look_metrics formula) |
| `n8ao.d.ts` | the n8ao typing (do NOT copy the pilot's `n8ao.d.ts` into your sandbox: a second `declare module "n8ao"` = duplicate identifier) |
| `index.ts` | re-exports everything above |
Render script: `studio/scripts/kit_render.mjs` (hashing built in). Sandbox: `studio/src/sandboxes/kit_core/` (`film.ts`, `Root.tsx`, `sets/path.ts` + `sets/pilot_*.ts` = a COPY of the pilot world as a kit SetBuilder).

## Units and conventions (binding, from KIT_CONTRACT + these)
- Metres, Y up, +Z toward the default camera. `t` = FILM seconds everywhere (Built.update, ctx.onUpdate, ShotDef.cam).
- The pipeline owns: the sun (`ctx.sun`, directional, PCSS soft shadows), the optional card light (`ctx.sunCard`: null
  unless the film asks for it), scene.background / environment / fog, exposure, tone map, grade, bloom,
  AO, shafts, GI. Sets never add their own sun or touch renderer settings.
- **Card light (`Film.cardLight`; DEFAULT `"off"` since 2026-11-19 21:00, see "Round 3"):** `"off"` = `ctx.sunCard` is null
  and nothing is rendered for it. kit/cards needs no card light: its near cards use their own private character-free
  pass and its far cards / crowds read `ctx.sun`'s map when `ctx.sunCard` is null (that code was already there).
  `"map"` = ctx.sunCard exists but is NOT a scene light; its shadow map is rendered once per output frame by a hook mesh
  (sample `sunCard.shadow.map.texture` with `sunCard.shadow.matrix`). `"scene"` = the pilot's way: a zero-intensity scene
  light, so every lit shader has `directionalShadowMap[1]` = the card map AND pays a second PCSS lookup on every pixel
  (only for pilot-style cards that read [1]; the kit_core sandbox films set it). In every mode `directionalShadowMap[0]`
  is the sun. Do not add other shadow-casting directional lights.
- A rig with `sunIntensity: 0` (undergroundWarm) hides the sun (`ctx.sun.visible = false`): no sun shadow pass; read
  `ctx.sun.visible` / `intensity` before using its map.
- `ctx.rig` and `ctx.sun` are LIVE: the same objects are mutated when a shot with another rig starts. A set is built once
  and reused under several rigs, so read rig values in `update()` (cheap), not only at build time.
- Anything that casts sets `castShadow = true`; anything that should be lit by the bounce / IBL just uses
  MeshStandardMaterial / MeshPhysicalMaterial (Lambert / Phong work too). Custom ShaderMaterials that include
  `<shadowmap_pars_fragment>` get PCSS automatically.
- **onBeforeCompile hazard (three caches programs by `customProgramCacheKey()`, which defaults to the onBeforeCompile
  source text):** every material you patch with onBeforeCompile MUST set
  `m.customProgramCacheKey = () => "<owner>:<unique-name>"`, or two different patches with the same wrapper text share
  one compiled program. CORE's auto-seed wrapper keeps your key.
- Noise seed: the PCSS taps rotate per sub-frame through the `lpSeed` uniform. The pipeline auto-wraps EVERY material of a
  set after it is built (walks the scene), so you do not need to call `seeded()` yourself (calling it is harmless).
- Characters / their shadow proxies: a mesh that must cast into the SUN map but not into the CARD map (the pilot's card
  proxy) -> `excludeFromCardShadow(mesh, ctx)` (pipeline.tsx). The card mesh itself: `castShadow = false`.
- Everything is a pure function of t (seeded noise only). Wind: read `ctx.windT` (the pipeline sets it to `t + 3` per
  sub-frame, the pilot's offset).

## The film API (what WORKFLOW's scaffold writes)
```ts
// studio/src/videos3/<slug>/film.ts
import type { Film } from "../../kit/core/ctx";
import { shotCam, lowWideTrack, pushIn } from "../../kit/core/camera";
export const FILM: Film = { slug: "x", fps: 30, total: 180, sets: { path: buildPath }, shots: [
  { id: "s1", from: 0, to: 60, set: "path", rig: "golden", cam: shotCam(0, 60, (d) => lowWideTrack({ subject: [0, 1.1, -4] }, d)) },
  ...] };
// Root.tsx
import { KitComposition } from "../../kit/core/pipeline";
export const Root = () => <KitComposition id="XKit" film={FILM} overlay={(f) => <Captions frame={f.frame} />} />;
```
- `KitComposition` = a Remotion `<Composition>` 1080x1920 @30, `durationInFrames = film.total`, whose default props carry
  `kitShots` (id, from, to, set, rig + a signature of the shot's sampled camera and resolved rig): `kit_render.mjs` reads
  them through `selectComposition` (no Node bundling of film code).
- `<KitFilm film quality overlay />` can also be used directly inside your own composition component.
- inputProps (all optional) `{ kit: { quality: "draft"|"preview"|"final4"|"final", mb, ao, vol, gi, fnum, dbg, log, prof,
  exposure, cardLight, rig, rigOpts, pre } }`: `kit.quality` overrides the `quality` prop, so ONE composition renders every
  quality; `kit.rig` forces one rig on every shot (look checks); `kit.rigOpts` merges rig values over every shot's rig
  (LOOK EXPERIMENTS without touching code, e.g. `--props '{"rigOpts":{"fog":0.0035,"warmth":0.8}}'`; then write the
  numbers you like into your set's `hints.rigOpts` or the shot's rigOpts); `kit.prof` logs per-module costs
  (`kit-prof {...}`) once per tab (its timings now read a pixel back, so they are real on ANGLE); `kit.pre: false` =
  the old compile order (debug).
- Overlays (captions, titles) are React DOM above the canvas: `overlay={(f: KitFrameInfo) => ReactNode}` with
  `f = { frame, t, shot, shotIndex, local, quality }`, or call `useKitFrame()` inside any component rendered by `overlay`.

### Quality presets (`QUALITY` in pipeline.tsx)
| quality | sub-frames | meant for | sun / card shadow map | AO | shafts steps | PCSS taps (blocker / filter) | GI cube |
|---|---|---|---|---|---|---|---|
| draft | 1 | storyboard stills 540x960 | 2048 / 1024 | 6 samples, half res | 12 | 8 / 12 | 16 px probe (was: ground bounce only) |
| preview | 1 | animatic 540x960 | 2048 / 2048 | 8 samples, half res | 20 | 12 / 20 | 32 px probe |
| final4 | 4 | 1080x1920 | 4096 / 4096 | 12 samples, half res | 28 | 16 / 24 | 64 px probe |
| final | 8 | 1080x1920 | 4096 / 4096 | 16 samples, half res | 32 | 16 / 32 | 64 px probe |
Resolution is the Remotion `scale` (kit_render: draft / preview 0.5, final4 / final 1.0). Per sub-frame: thin-lens DOF
(Vogel disk), Halton sub-pixel AA, shutter-time motion blur, own PCSS / shaft noise seed; then bloom -> AgX -> grade on
the average. The sun map renders every sub-frame (moving leaf shadows stay motion-blurred); the card shadow map (only
with `cardLight: "map"` / `"scene"`) once per output frame (sub-frame 0).

## Assets (`assets.ts`, also `ctx.assets`)
- `tex(path, {srgb = true, repeat, anisotropy = 8})`: path relative to `studio/public/`. Cached by path + colour space;
  a `repeat` returns a clone sharing the GPU image.
- `pbr(name, res = "2k")`: folder `public/kit/surfaces/<name>/` (a name with a `/` is taken as a folder relative to
  public/, e.g. `"lookpilot/brick_pavement"`). Files, Poly Haven naming: `<name>_diff_<res>.jpg`, `<name>_nor_gl_<res>.jpg`,
  `<name>_arm_<res>.jpg`, optional `<name>_disp_<res>.(jpg|png)`. Optional `kit.json` in the folder:
  `{ "tileM": 2, "files": { "diff": "...", "nor": "...", "arm": "...", "disp": "..." } }` (paths relative to the folder,
  `<res>` is substituted). Res fallback order: asked, then lower, then higher. `tileM` default 1.
- `hdri(name, res = "2k")`: `public/kit/hdri/<name>_<res>.hdr` (float DataTexture, equirect mapping), cached.
- `gltf(path)`: path relative to public/. Cached; every call returns `SkeletonUtils.clone` (geometry + materials +
  textures shared; skinned meshes OK). Do not dispose shared geometry yourself.
- Licences: append a row to `public/kit/LICENSES.md` for every file you add.

## Rigs (`rigs.ts`)
`RIGS.golden` is the pilot's look (owner's pick, the default): je_gray_park 4k sky, sun az 48 / el 28, 7.2, sky level
0.33, fog 0.0068, haze 0.0012, grade expo 1.2 / sat 1.9. Others: `morning`, `noon`, `overcastWarm`, `dusk`,
`interiorWarm`, `nightPractical`, `undergroundWarm`. A shot's rig is resolved in this order (later wins):
`RIGS[name]` -> `film.rigs[name]` -> the SET's `Built.hints.rigOpts` (+ its `hints.groundAlbedo`) -> the shot's
`ShotDef.rigOpts` (e.g. `{ sunAz: 140 }` to keep the sun behind the subject on a reverse angle) -> `kit.rigOpts` from
the command line (look experiments).

**Golden on the pointing film's sets (round 3, looked at on `PointingKit` stills; golden's own numbers are unchanged):**
- `Built.hints.rigOpts` (new): a set adapts every rig it is shown under, in its own file. golden's fog 0.0068 was tuned
  on a 30 m park: on a long sight line it hides the world (transmittance 51 % at 100 m, 13 % at 300 m; the signal 700 m
  ahead of the cab cannot be seen). Tried once in the cab (s01 f20) with `fog: 0.0035`: the golden glow stays and the
  rails and masts read further down the line (`out/pointing_core/stills/prev_20.jpg` vs `prev_dayroom_20.jpg`; NOT a
  clean A/B: that run also swapped the IBL and TRAIN was editing the set). Rule of thumb: fog = 0.7 / (the distance
  in metres that must still read at half strength).
- `warmth` (new, default 0): the camera's white-balance trim for the whole picture, before bloom + the tone map (+1 =
  red +7 %, blue -10 %, same brightness). golden looks golden when the lens looks TOWARD the sun (haze glow, shafts,
  rim: the cab shot); a front- or side-lit shot of a white train under the same rig reads as clean midday daylight
  (s07 f550: mean red / blue of the picture 1.03, mean saturation 0.21; the pilot's stills: 1.45-1.52 and 0.41-0.44).
  Tested (preview stills `out/pointing_core/stills/prev_base_*`, `prev_warm_*`, `prev_warm16_*`):
  | shot | warmth 0 | warmth 0.8 | warmth 1.6 + exposure 0.93 |
  |---|---|---|---|
  | s07 f550, the platform wide (sky + the white train side) | 1.03 / sat 0.21 | 1.10 / 0.24 | 1.19 / 0.27: reads golden |
  | s08 f600, the doorway with the yellow suitcase | 1.37 / 0.30 | 1.47 / 0.35 | 1.60 / 0.41: warm, the tee turns cream |
  Advice: sky-heavy, front-lit platform wides `warmth` 1.0-1.6 (+ `exposure` 0.93: the sunlit train side is close to
  white); close shots that are already warm 0-0.8; backlit shots 0. For the suitcase as the ONE yellow thing keep the
  surroundings near neutral (`warmth` <= 0.8): warming everything turns the whites cream and the yellow stands out
  less. golden's own values were NOT changed (the owner's pick).
- Enclosed sets under a daylight rig: three's IBL is not blocked by a roof, so the outdoor HDRI's ground half lit the
  car's white ceiling mustard (final still 20:55). TRAIN has since given its interior materials their own environment
  maps (kit/vehicles `ownEnv`), which is the right fix (three ignores `material.envMapIntensity` unless the material has
  its own `envMap`). The lighter alternative for a wholly enclosed set is `hints.rigOpts: { env: "proc:dayRoom" }` (a
  near-neutral daylit room fill for everything in the set; the haze outside the windows keeps the drawn sky's colour).
- Draft now uses the same bounce probe as preview / final (see GI): a storyboard still shows the film's light.

Night / interiors (retuned 2026-11-19 ~17:00): three's IBL is NOT occluded by walls, so an outdoor sky HDRI lights a
closed room or a station blue. `RigSpec.env` now separates the IBL from the drawn sky: `"proc:warmDark"` (city glow /
tungsten bounce), `"proc:warmRoom"` (a lit room), `"proc:neutral"`, or another HDRI stem.
| rig | for | sky drawn | IBL | key light | exposure |
|---|---|---|---|---|---|
| `interiorWarm` | interiors by day (the lab) | je_gray_park through windows | proc:warmRoom, skyLevel 0.09 | the sun through the windows (7.2, 4600 K), practicals K 1.0, gi 2.0, lamps balanced at 4500 K | 2.4 |
| `nightPractical` | exterior night, night interiors with windows (the kitchen) | starry kloppenheim_02 | proc:warmDark, skyLevel 0.08 | a cool moon (0.45) + practicals K 0.5, lamps balanced at 3800 K | 3.0 |
| `undergroundWarm` | NO sun / moon, no sky (the NY station, the tunnel) | none | proc:warmDark, skyLevel 0.06, warm fog 0.011 | practicals only, K 0.6, lamps balanced at 3600 K | 2.8 |
Round 3 retune (quick + safe; New York and the kitchen left the pointing film, so only the lab was checked on a real
set): `interiorWarm` read too orange because of three things, all fixed: its sun was 3900 K (now 4600 K), its room fill
was orange (red / blue 1.2-1.8, now 1.1-1.5), and above all its lamps had no white balance (a 4000 K panel was drawn
1.0 / 0.62 / 0.38; now hue 1.0 / 0.88 / 0.76). The lab at f1324: pink-beige walls before, neutral grey walls and a white
table now; mean red / blue of the picture 1.68 -> 1.20, a little brighter (mean luminance 0.37 -> 0.42)
(`studio/out/pointing_core/stills/prev_lab2_1324.jpg` vs HOME's `out/pointing/home/stills/draft/f1324.jpg`).
`nightPractical` was too dark away from the lamps: fill 0.05 -> 0.08, moon 0.3 -> 0.45 (the drawn sky keeps its
brightness: bgK 0.62), a less orange dark fill, lamps balanced at 3800 K (a 2700 K bulb is amber 1.0 / 0.66 / 0.29, not
1.0 / 0.38 / 0.10). Checked on the sandbox only: the pilot path at night (`out/kit_core_rigs3/p_6.jpg` vs the old
`out/kit_core_rigs2/stills/preview/f6.jpg`): median luminance 0.011 -> 0.023, darkest tenth 0.0007 -> 0.0019, mean
red / blue 2.17 -> 1.81; the box room at night (`out/kit_core_room3/p_40.jpg`): median 0.004 -> 0.008, red / blue
6.2 -> 3.6 (that room has very dark walls: it stays dim). NOT re-rendered on the kitchen or the NY sets (both
parked): judge it when they come back.
For the NY station the bible says `nightPractical`: use `undergroundWarm` (or `rigOpts: { sunIntensity: 0, showSky: false }`)
so no moonlight leaks into an enclosed set through gaps in its shadow box.

Practical lights: `const lamp = ctx.practical!({ kind: "spot", pos: [1.6, 4.2, -7.4], target: [1.6, 0, -7.4], kelvin: 2700,
lumens: 6000, shadow: true })` then `set.add(lamp.object)`; `lamp.set(on)` dims it (call from update for a switch-on).
**`lamp.set(0)` is safe and free (fixed 2026-11-19 20:45):** an off lamp stays a scene light at intensity 0 (no shader
change) and its shadow map is not rendered while it is off. **Never switch a lamp with `.visible`** (on the light, its
group or any parent group): three compiles every lit shader for the exact number of lights, so a light that appears or
disappears makes every material of the set compile a new program (HOME_LAB measured 60-120 s stalls). To hide a
fixture, hide its MESH and call `lamp.set(0)`. The pipeline warns when it sees a hidden practical, when a set's first
update changes the light count, and when new programs are compiled mid-shot (`kit-recompile ...`).
Point lights shadow with a 6-face cube (costly): at most 2 shadowed practicals per set; spot shadows are cheap to
render (their compile cost is in the budget table below).
`shadowNear` (default 0.3 m) skips the lamp's own housing in its shadow. The rig's `practicalK` scales every lamp
(daylight rigs ~0.006, so a lamp is a bloom spot, not a light; reference: at K 1 an 800 lm bulb gives 0.25 at 2 m).
Lumens to start from: candle 12, small table lamp 400-800, range-hood lamp 300-500, ceiling strip per metre 800-1200,
street lamp 5000-8000, car-window spill = a `rect` practical (size of the window, 300-600 lm, no shadow).

### Light budget (measured 2026-11-19, GTX 1660 Ti, ANGLE / D3D11; sandbox `KitCoreLights`)
three writes EVERY scene light into EVERY lit shader of the set (one copy of the lighting code per light), so each
light costs twice: shader compile time at the start of every render tab, and GPU time on every lit pixel of every
sub-frame. **THE LIMIT per set (`LIGHT_BUDGET` in pipeline.tsx; over it the pipeline warns, it does not stop you):
at most 8 practicals that are real lights, of which at most 4 `rect` (aim for 1-2) and at most 2 with `shadow: true`
(the third and later lose their shadow).** The sun, the bounce probe and glow-only fixtures do not count.
| what one light costs | compile, per lit program | GPU per sub-frame, 1080x1920, lit full screen |
|---|---|---|
| no practicals (sun + bounce only) | 0.12-0.13 s | main pass 4.4 ms (the test hall) |
| a `rect` (area) light | + 0.09 s | + 0.27-0.35 ms |
| a `point` or `spot` light, no shadow | + 0.011-0.014 s | + 0.06-0.09 ms |
| a spot with `shadow: true` | + ~0.2 s (the soft-shadow code is copied in per shadowed light) | + its shadow map render (the set's casters once more per sub-frame) |
Compile time of a set ~ (its number of lit PROGRAMS) x the sum of the column: the test hall (12 programs): no lamps 1.6 s,
4 / 8 / 16 rect = 4.4 / 8.8 / 19.7 s, 16 point 3.3 s, 16 spot 3.8 s, the NY station's count (16 rect + 2 shadowed spots)
24.8 s. A real set has 40-150 programs: 16 rect lights there = minutes (NYC's station hung > 243 s). The new compile log
line prints the numbers for your set: `kit compile for set "x" / rig "y": N ms (pre + first updates + post; P programs;
lights: ...)`.
**How to light a row of fixtures (grouping):** make every fixture glow-only, `ctx.practical({ ..., light: false })`
(the emissive bulb / panel, the dimmer, the flicker and the bloom, but no scene light), or use your own emissive mesh,
and light the row with ONE long `rect` practical (`size: [row length, fixture width]`, `lumens` = one fixture x the
count, `bulb: false`). Measured: 16 ceiling panels as 16 rect lights = 19.7 s compile and + 4.3 ms per sub-frame;
the same 16 panels glow-only + 2 long rects = 2.8 s and + 0 ms, and the picture is the same to the eye
(`studio/out/kit_core_lights/d_3.jpg` vs `d_8.jpg`: floor luminance 0.188 vs 0.199, ceiling 0.237 vs 0.237; on a mirror
floor the long rect's reflection would be one strip, not 16 panels). A down-facing rect has `size[0]` along world X, `size[1]` along Z.
Also keep the number of PROGRAMS down: materials that share the same shader should share ONE
`customProgramCacheKey` (a key per patch, not per material instance), or every material compiles its own copy.

### Lamp colour = the rig's white balance (`RigSpec.wbKelvin`, 2026-11-19)
`kelvin(K)` is the colour on a 6500 K daylight camera: a 3800 K "warm white" LED strip came out orange (linear
1.0 / 0.58 / 0.34) and a 2700 K bulb deep orange (1.0 / 0.39 / 0.10); this is what made the car ceiling, the lab and
the night lamp pools read orange. Every rig now has a white balance for lamps: a lamp AT `wbKelvin` shows neutral
white, a warmer one warm, a cooler one blue-ish, like a real camera. Only the hue moves: the lamp keeps the luminance
it had, so nobody's `lumens` need re-tuning. golden 4500, morning 5000, noon 5200, overcastWarm 4800, dusk 4000,
interiorWarm 4500, nightPractical 3800, undergroundWarm 3600. Under golden a 3800 K strip now has the hue
1.0 / 0.83 / 0.67 (warm white) and a 2700 K bulb 1.0 / 0.55 / 0.19 (amber). Lamps given as `color` (not `kelvin`) are never re-balanced. For your own emissive fixtures use the same
colour: `import { lampColor } from "../../kit/core/rigs"; mat.color.copy(lampColor(3800, ctx.rig))` (read it in
`update()`: the rig is live).

## Screens (`screen.ts`, `phone_ui.tsx`: K-K1)
```ts
import { screen, mainOnly, screenOnly } from "../../kit/core/screen";
import { RecordUI, recTimer } from "../../kit/core/phone_ui";
const scr = screen(ctx, {
  size: [0.0665, 0.1455], corner: 0.0065,            // the glass (m); RT width per quality: 160 / 270 / 480 / 640 px
  cam: (t) => clipCam(t - 5.8),                      // the camera that "recorded" (film time)
  sceneTime: (t) => t - 5.8,                         // a REPLAY: the set as it was 5.8 s earlier (default live = t)
  active: (t) => t >= 53.3,                          // render only while it matters (otherwise holds its last image)
  ui: { timer: recTimer(47.5, 0) },                  // the record UI on the screen (false = none)
  hide: [handCard.object],                           // anything else the screen camera must not see
});
phoneBody.add(scr.mesh); mainOnly(phoneBody);        // the phone + the hand: main lens only
```
- Renders ONCE per output frame (ctx.onFrame, before the sub-frames) through `ctx.renderAt(tScene, cam, rt)`: every set
  update (cards, wind, trains, practicals) runs at tScene first and the cards face the screen camera; the following
  sub-frames run their own updates again. Plain scene render (HDR, the sun shadow map is re-rendered for tScene; no
  AO / shafts / bloom on the screen image), a filmic tone map in the screen shader, then the screen EMITS the image
  (`brightness` 0.9 = bright, not blown; `exposure` default = the rig's). Final / final4: 4x MSAA in the screen RT.
- Layers: `screenOnly(obj)` = only screen cameras see it (a RECORDED COPY of a character posed for the clip, e.g. the
  selfie pose at the vending machine that never happens in the main timeline); `mainOnly(obj)` = only the main lens (the
  phone body, the hand). The main camera sees layers 0 + MAIN_ONLY, screen cameras 0 + SCREEN_ONLY, the GI cube only 0.
- Full-frame phone POV (frame 0, the last shot): the main camera IS the phone; put `<RecordUI t={f.t} timer={...} />` in
  the KitFilm `overlay` for those shots (`opacity` slides it away). The screen texture uses the same `drawRecordUI`, so
  the screen in s18 and the full-frame POV match. Timer: `recTimer(t0, offsetS)` -> "00:12".

## GI (`gi.ts`)
Per (set, rig, probe point) the pipeline renders a small cube map of the built set from the probe point with the sky
and IBL switched off (so only sun-lit surfaces + lamps glow = first bounce), projects it to SH (`LightProbeGenerator`)
and puts it in the scene as a `LightProbe` (x rig.gi). EVERY quality uses the probe now (draft: 16 px faces, 57-60 ms
measured); the cheap ground-bounce hemisphere (sun irradiance x ground albedo, `Built.hints.groundAlbedo` when the set
gives one, else the rig's) is only the fallback when the probe is off or fails. Reason: the hemisphere assumes open sunlit
ground under everything, so at draft it lit every ceiling and canopy underside orange, and draft stills did not match
preview / final (builders were correcting materials against a light that is not in the film). During the cube render
point sprites (dust motes), sprites and additive glows are hidden (on a 16-64 px face a mote sized for the film lens
covers a large part of the picture and the bounce comes out far too bright; CARDS found this in its own probe).
Cached by key; refresh is automatic when the set, the rig or the probe point changes.
`ctx.rig.bounce` is set from the probe (the horizontal irradiance) for CARDS.

## Camera grammar (`camera.ts`)
Each preset is `(params, dur) => (u) => CamState` with `u` = seconds since the SHOT start; `shotCam(from, to, mk)` turns
it into a ShotDef cam (film time). Subjects can be a point or a function of `u`. Common params: `fov` (vertical deg),
`ease` ("inOut" | "out" | "in" | "linear"), `shake` (0..1 handheld amount), `seed`, `fnum`, `focus` (m or "subject").
Presets: `lowWideTrack`, `pushIn`, `pullBack`, `droneRise`, `craneDown`, `orbit`, `followSide`, `povHandheld`,
`macroTopDown`, `whipPan` (transition: `whipOut(cam, dur, {dir})` at a shot end + `whipIn(cam, {dir})` at the next
start; cut on the blur peak), `lockedWithDrift`. Helpers: `shotCam(from, to, mk)`, `onShot(from, filmTimeFn)` (a film-time
subject seen from shot time), `withShake`, `noise1`, `EASE`. `lowWideTrack.subject` / `followSide.subject` are GROUND
points (feet); `followSide.side` + = the subject's right. `camSpeedStats(cam, from, to, {bgDepth?, depthK?})` ->
`{ median, p90, mean, fastShare, stillShare, frames, perFrame }` in % of the frame per frame, the look_metrics.py formula
(similarity fit of projected points; centre shift as % of width / height + |ln scale| x 100). Targets (his NEW-8):
median >= 0.7, fast (> 1 %/f) ~ 40 %, still (< 0.15) <= 20 %; `speedVerdict(stats)`.
**Depth model (changed 14:35 after WORKFLOW's caveat):** default = a frame model: the central subject region (~10 % of an
8 x 14 grid) at the look distance, everything else at `bgDepth` (default 3 x the look distance, 5-60 m). An orbit /
follow around a centred subject now reads correctly (orbit r 4 m, 50 deg in 2 s: 1.80 %/f; the old uniform-depth model
read 0.01). `depthK: [..]` keeps the old uniform model (WORKFLOW's `cam_speed.mjs` passes [1, 2, 4] for orbits /
follows: still valid, now optional). Validated against look_metrics.py on the rendered test film: estimate median 1.05 %/f,
fast 55 %, still 7 % vs measured 1.04 %/f, 52 %, 9 %.

## Render script (`studio/scripts/kit_render.mjs`, run from studio/)
`node scripts/kit_render.mjs --entry <entry.ts> --comp <id> --quality draft|preview|final4|final --shots all|<id,id> --out out/<slug>/`
- renders each shot as its own chunk: `out/<slug>/shots/<quality>/<shotId>_<hash>.mp4`; hash = sha1 of (quality,
  extra props, the shot's kitShots signature (summary + sampled camera + resolved rig), the source files reachable from
  the entry except the film file, per-set files when the set lives in `sets/<setId>.ts(x)` next to the film); a changed
  shot gets a new hash and re-renders, unchanged shots are reused; stale hashes of the same shot are deleted.
- concatenates (stream copy) into `out/<slug>/<slug>_<quality>.mp4` when every shot has a current file.
- takes / refreshes / releases the RAM token itself (`RAM_ME=kit_<slug>` unless set), resumes after a kill (a shot is
  written to `.part` and renamed when complete), logs s/frame per shot to `out/<slug>/shots/<quality>/render_log.jsonl`.
- `--stills 0,45,120` renders stills through `scripts/stills_locked.sh` into `out/<slug>/stills/<quality>/f<frame>.jpg`.
- `--info` prints the composition's kitShots JSON (ids, frames, sets, rigs, signatures, camera speed stats) and exits.
- `--frames a-b` renders a test clip of absolute frames (not cached) to `out/<slug>/test/<quality>_<a>-<b>.mp4` and logs
  wall / steady-state s/frame + in-page render ms to `test/test_log.jsonl` (the timing probe).
- other flags: `--conc N` (tabs; default 2), `--props '<json>'` (merged into inputProps.kit, part of the hash), `--force`,
  `--film <film.ts>` (if the film file is not called film.ts), `--keep-browser-logs`.
- per-set hashing: only `sets/<setId>.ts(x)` next to the film file counts as a set's own entry (its import graph minus
  the shared files); anything a set reaches only through other files is in the shared hash (= re-renders every shot).
- one Chrome is opened per run and reused for every shot (`openBrowser` + `puppeteerInstance`); each shot still opens
  fresh tabs, so each shot pays the page start + set build + shader compile + GI once per tab (measured below).
- encoder: final / final4 = PNG frames, bt709, crf 15, x264 slow (render.mjs FINAL); draft / preview = JPEG frames,
  bt709, crf 18, x264 fast.

## Status / measured (2026-11-19; GTX 1660 Ti via ANGLE / D3D11, PC shared with another session)
Proof: `studio/src/sandboxes/kit_core/` (ENTRY `src/sandboxes/kit_core/index.ts`), compositions `KitCore` (the 3-shot,
6-s test film: s1 golden lowWideTrack, s2 golden followSide + whipOut, s3 dusk whipIn + droneRise, all on a COPY of the
pilot world), `KitCoreRigs` (7 one-frame shots, one per rig, same camera), `KitCoreRoom` (a small test interior:
interiorWarm by day, nightPractical at night, a table lamp + a sconce). Outputs under `studio/out/`:
`kit_core_test/kit_core_test_draft.mp4` (whole film, draft), `kit_core_test/test/final_<a>-<b>.mp4` (12 final frames per
shot), `kit_core_test/GI_before_after_f90.jpg` / `_f30.jpg`, `kit_core_rigs/RIG_SHEET.jpg`, `kit_core_room/ROOM_SHEET.jpg`,
contact sheets `kit_core_test/sheet_draft.jpg`, `sheet_whip.jpg`.

### What is proven
- `KitComposition` + `KitFilm`: lazy cached set build, shot lookup, rig switch inside one page (golden -> dusk), the shadow
  bug: shadows on every frame of every chunk (contact sheets), the overlay hook (the label is React DOM over the canvas).
- Accumulation at final (8 sub-frames): motion blur, thin-lens DOF (lens from the FOV, pilot calibration 72 deg = 25 mm),
  Halton AA, PCSS (tap counts per quality), N8AO, shafts (steps per quality), bloom -> AgX -> grade. The golden rig
  reproduces the pilot look: look_metrics.py on the draft film: mean chroma 23.1 (pilot 23.3, his 24.0), shadow chroma
  14.1 (pilot 14.4).
- kit_render.mjs: per-shot chunks + hash cache + concat + RAM token (taken per shot, released at the end) + `--stills`
  (limiter) + `--frames` (timing probe) + `--info` (kitShots JSON). Bundling once per run; one Chrome per run.
- Camera grammar + estimator: on the rendered test film, look_metrics.py measured cam median 1.04 %/f, fast 52 %, still
  9 %; camSpeedStats (frame model) predicted 1.05 %/f, 55 %, 7 % from the film code alone.
- GI: probe bake 90-300 ms (after the compile fix); in the shade (darkest 30 % of pixels) the probe lifts L* by ~2.1 and
  warms b* by ~3 (f90: L* 12.3 -> 14.4, b* 8.1 -> 11.2; f30: 7.4 -> 9.5, -1.6 -> 1.1) at gi 1.0; golden now uses gi 1.5,
  interiorWarm 2.0 (one bounce from one probe under-lights; see gaps).
- Practicals: the room's 800 lm table lamp lights the table, the shelf and the wall with a soft shadow; the shade glows.
- Test room (interiorWarm, gi 2.0): shade (darkest 40 %) L* 3.8 -> 4.8 with the probe; subtle, as one bounce from one
  probe is. Set disposal under memory pressure (LRU cap + JS heap > 1.1 GB) is implemented but was not exercised (the
  test films use one set each).

### Measured cost
| what | number |
|---|---|
| set build (pilot copy, cached assets per tab) | 0.8-3.7 s per tab (room 0.07-0.12 s) |
| shader compile per set + rig (compileAsync into the RT) | 1.2-4.2 s per tab |
| GI probe | 64 px: cube 11-171 ms + readback/SH 70-1260 ms (async GPU readback, waits for the GPU queue); before the compile fix the cube compiled shaders: 1.6-6 s |
| in-page render per output frame (kit-ms, incl. card canvas redraws) | draft / preview 11-15 ms; final (8 sub-frames, 1080x1920) median 100-144 ms |
| GPU per sub-frame at 1080x1920, final settings (gl.finish timing; noisy, 2 tabs share the GPU) | ~6-12 ms: sun shadow 1-2, AO 1-4, shafts 0.5-2, main pass 1-5; post 0.5 and card map ~1 once per frame; CPU updates (card canvas) 2-4 ms per sub-frame |
| draft, whole 180-f film, 2 tabs (after the compile fix, 15:20) | 0.21-0.32 s/frame wall per 60-f shot incl. start-up (steady 0.12-0.16); whole run 122 s incl. bundling + a 60-s wait for the RAM token (CARDS held it); before the fix 0.40-0.66 |
| final (8 sub-frames, 1080x1920, PNG + x264 slow), 2 tabs | after the fixes: 24 frames of s2 in 36.9 s = 1.54 s/frame incl. start-up, steady 1.11 s/frame, page render median 54 ms (start-up ~10 s). Before the fixes (12-f clips): steady 1.53 / 2.23 / 2.92, start-up 35-45 s |
| draft / preview still (stills limiter, incl. page start + build + compile + GI) | 7.5-14 s (budget 25 s) |
| VRAM | ~0.85 GB per final tab (nvidia-smi 3.8 GB total with 2 tabs + ~2 GB of other processes) |
Projection for a 75-s film (2,250 f, ~25 shots) on this set's complexity: final ~1.1-1.5 s/f x 2,250 + ~12 s x 25
shots = ~0.8-1.0 h (budget 2.5 h; heavier sets cost more GPU, but the GPU is not the bottleneck yet); preview / draft
~0.15 s/f + ~8 s per shot = ~9 min (budget 25 min). Shot cache proven: an unchanged re-run renders 0 shots (18 s incl.
bundling); changing one camera parameter of s2 re-rendered only s2 and re-concatenated the film. The wall time is now dominated by Remotion's PNG capture
and the x264-slow encode, not the GPU (the pilot's 2.4-2.7 s/frame in-page render is ~0.1 s here: the card light's
shadow map renders once per frame, the rest of the difference I cannot fully explain from the pilot's notes).

### Fixed during the build (worth knowing)
- R3F `dpr` default [1, 2] clamped Remotion's 0.5 scale to 1: previews rendered at 1080x1920 and were downscaled. KitFilm
  passes `dpr = devicePixelRatio`, so draft / preview really render 540x960.
- GI cube: nulling scene.environment / fog recompiled every material (14 s). Now only intensities / fog density change.
- compileAsync must run with the accumulation RT bound (linear-output programs), else nothing useful is precompiled.
- Practical shadow near plane defaults to 0.3 m (`shadowNear`): a lamp inside a lantern otherwise shadows its own pool.

### Round 2 (2026-11-19 16:15-17:10): screens, card light, night / interior rigs
- **K-K1 proven** (`KitCorePhone` in the sandbox: `sets/phone.ts`): p1 = the full-frame phone POV with `<RecordUI>`
  (red dot, 00:12, brackets); p2 = over the shoulder onto the phone in hand, its screen REPLAYING the scene 2.5 s earlier
  from the POV camera that recorded it (the phone guy and the pigeons at their earlier positions, the record UI counting
  00:13 -> 00:16), the live scene behind it. Preview: the screen reads (270 px); final: crisp (640 px + MSAA), see
  `studio/out/kit_core_phone/PHONE_SHEET_preview.jpg`, `stills/final/f70.jpg`. The screen image is pre-desaturated
  (x0.72) and exposed 1.7x so that after the film's AgX + grade it reads like a bright phone screen, not doubled.
  Cost: the screen render (640x1400, 4x MSAA, incl. the set updates at the replay time and a sun shadow pass) took
  27 ms on its first frame at final; over 24 final frames the in-page render median was 118 ms/frame WITH the screen
  (p2) vs 152 ms WITHOUT it (p1, a wider view), i.e. the screen is lost in the per-view variation (~20-30 ms per output
  frame, once, not per sub-frame). Wall time in that hour was 5.7-6.8 s/frame steady for BOTH clips (the PC was loaded
  by another session; the same kind of clip ran at 1.1 s/frame at 15:24): the wall numbers swing 5x with the other
  session's load, the in-page numbers do not.
- **(superseded by Round 3: the default is now `"off"`) Card light: decision = keep ctx.sunCard, but default `Film.cardLight: "map"`** (not a scene light; its map is
  rendered once per output frame by a hook mesh). Measured on the pilot set at final (1080x1920, one page, gl.finish
  timing): sub-frame 10.7 ms ("scene") vs 11.2 ms ("map") at f30, 6.6 vs 6.8 ms at f90: the second PCSS lookup is BELOW
  the noise here (most lit pixels exit after the 16 blocker taps), but it is a pure waste for every set that has no
  pilot-style card, and "map" keeps the character-free map for CARDS' far cards (they read `sunCard.shadow.map` when it
  exists, else the sun's). CARDS' near cards keep their private pass. So CARDS and the pipeline agree: nobody reads
  `directionalShadowMap[1]` except the kit_core sandbox's pilot copy, which sets `cardLight: "scene"`.
- **Rigs retuned:** `interiorWarm` IBL = proc:warmRoom (the outdoor sky lit closed rooms blue), `nightPractical` IBL =
  proc:warmDark + skyLevel 0.05 (was too dark without practicals; now a readable warm dark with a cool moon through
  windows), new `undergroundWarm` (no sun / moon / sky; for the NY station + tunnel). The drawn sky is now normalised by
  its own level (with a separate env the starry sky had been drawn far too bright). Stills:
  `studio/out/NIGHT_INTERIOR_SHEET.jpg` (room by day, room at night, room underground, the path at night).
  Not yet tuned against the NYC / HOME_LAB sets themselves: their builders had not published sets / notes when this was
  done (no `kit/subway/NOTES.md`, no `kit/home/NOTES.md` yet); the numbers to adjust per shot are rigOpts `skyLevel`,
  `exposure`, `practicalK`.
- **n8ao typing:** NATURE's report (optional `setDepthTexture` breaking `A.addPass(n8)`) was about the first version of
  `n8ao.d.ts`; it was fixed at ~13:50 (the member is gone). `kit_cards` / `kit_nature` typecheck with no kit/core or n8ao
  errors now; NATURE's cast in its sandbox can go.
- The pointing film's typecheck errors are all outside kit/core (kit/rail/ocs.ts, kit/vehicles/train_jp.ts, cast/,
  and `sets/car.cams.ts` / `sets/ny_station.cams.ts`: the scaffold's `mk()` types `height_m` as a number while the bible
  gives a range; CORE's `lowWideTrack.height` accepts `number | [number, number]`).

### Round 3 (2026-11-19 20:30-21:20): the off-lamp bug, the light budget, the card light, lamp white balance, golden on the film's sets
All measured on the GTX 1660 Ti (ANGLE / D3D11) while other sessions rendered; in-page numbers, a pixel read back as
the sync. Test films in the sandbox: `KitCoreLights` (one frame per light count), `KitCoreBlink` (the off-lamp test).
- **The off-lamp bug (fixed).** `practical().update` hid the light when its intensity reached 0
  (`light.visible = k > 1e-5`): the light count changed, so every material compiled a new program. Now the lamp stays
  a scene light at intensity 0 and only its shadow map stops being rendered. Proof: `KitCoreBlink` "blink" (a lamp at
  `set(0)` for 0.5 s, then on): 15 frames, in-page median 5 ms, no new program at the switch. HOME's workarounds
  (`light.set(s ? 1 : 2e-4)` in kit/home/lab.ts, `p.set(Math.max(on, 2e-4))` in kit/home/night.ts) are no longer
  needed (they still work; with them a shadowed lamp keeps rendering its shadow map while "off").
- **Compile order (fixed).** `activate()` compiled the set's shaders AFTER the first update. A set that renders inside
  its first update (NYC's reflection capture, CARDS' fill probes) then compiled every program one by one on the main
  thread, with the page frozen (the "Timed out evaluating page function" in NYC's log). Now: compileAsync, then the
  first update, then compileAsync again (catches what the update changed). Measured on 8 rect lights + a render in
  the first update: old order 14.4 s with the page blocked for 11.7 s; new order 7.0 s, the render inside the update
  0.29 s, never blocked.
- **The light budget** (numbers, the limit and the grouping recipe: "Light budget" under Rigs). On the film's own
  sets the formula holds: car 57 programs, sun + 3 rect: pre-compile 24.2 s (0.42 s per program); platform 79
  programs, sun + 3 rect: 34.5 s; after TRAIN dropped two of the three rect lights: platform 89 programs, 25.5 s.
  So with NO practicals the film's sets still pay ~0.25-0.3 s per program (SURFACES' parallax shaders are heavier than
  the test material): 19-35 s of compile per render tab, plus 4-11 s for the set's first update (not profiled; the cards' fill probes and atlases are the likely part).
- **New warnings (all once per set, all cheap):** over the light budget; a practical hidden with `.visible`; a first
  update that changed the shaders of many materials; `kit-recompile frame N ...` when new programs appear after a
  shot's first frame. Proven on `KitCoreBlink` "hide" (a lamp group hidden for 0.5 s): the first two fired.
- **Card light: DROPPED from the default path** (`Film.cardLight` default `"off"`). Measured at final on the film's
  sets with `"map"`: the card map costs 2.5 ms (car) / 2.1 ms (platform) once per output frame = under 1 % of a
  frame (8 sub-frames x ~40 ms there), plus a 4096 x 4096 map + depth = ~134 MB of VRAM (34 MB at preview). So it was
  never a per-pixel cost in "map" mode; but nobody reads it: kit/cards' near cards have their private pass and its far
  cards / crowds take `ctx.sun`'s map when `ctx.sunCard` is null. With "off" the far cards read the sun map that also
  holds the near characters' shadow proxies (a hero now shadows the crowd behind him, which is right; far cards have
  no proxy of their own, so no self-shadow). Car f300 "map" vs "off": no visible change on the crowd (not a clean A/B:
  TRAIN was editing between the two bundles). `"map"` and `"scene"` still work (the kit_core sandbox films use
  "scene" for the pilot-style card).
- **Draft GI = the probe** (16 px: 56-59 ms on the test hall; 32 px 94-200 ms and 64 px 177-215 ms on the film's sets), the probe hides point sprites / additive glows, `hints.groundAlbedo` is
  honoured by the fallback. **Lamp white balance**, **`hints.rigOpts`**, **`warmth`**, **`proc:dayRoom`**: see Rigs.
- `kit.prof` timings now end with a 1-pixel read-back (gl.finish returns early on ANGLE, CARDS' finding). Per sub-frame
  at final on the film's sets: car 40.7-42.8 ms, platform 39.5 ms (the main pass alone 23.5-24 ms; the per-module split
  was not usable: other sessions were on the GPU and the parts add up to more than the whole), CPU updates
  10.6-11.8 ms. That is ~0.33 s of GPU + ~0.09 s of updates per final frame: inside the 4 s budget.
- Typecheck at 21:23: the `kit_core`, `kit_cards` and `kit_nature` sandbox tsconfigs all pass with 0 errors, so the
  `n8ao.d.ts` fix holds (the cast in NATURE's sandbox and the old error line in kit/nature/NOTES.md can go). The film's
  own tsconfig (`src/videos3/pointing/tsconfig.json`) also passed with 0 errors at 21:24.
- Every cached shot chunk re-renders once after this round (kit/core files are part of every shot's hash).
- K-K1 still works after the pipeline changes (`KitCorePhone` f70, preview: the screen render 20.6 ms).
- Stills kept: `studio/out/pointing_core/stills/` (final_map_300 / final_map_600 / final_off_300, prev_*),
  `studio/out/kit_core_lights/` (d_3 = 16 rect lights, d_8 = the grouped version), `out/kit_core_rigs3/`,
  `out/kit_core_room3/`.
- **Requests to other owners (CORE cannot edit their folders):**
  - HOME (parked): the `2e-4` "never off" workarounds in kit/home/lab.ts and night.ts can become `set(0)`; look at the
    lab once under the new interiorWarm (walls / table were toned against the old orange).
  - NYC (parked): the station's 16 rect lights -> glow-only fixtures + 1-2 long rects per row (the recipe above);
    the capture inside the first update is fine now (the shaders are compiled before it).
  - TRAIN: the cab can set `hints: { rigOpts: { fog: 0.0035 } }` in `sets/cab.ts` if the far line should read; a
    light that is invisible under golden (a 40 lm instrument backlight at practicalK 0.006 gives ~0.01 next to a sky
    of 0.33) should be `light: false` or left out (each rect light costs ~0.09 s x the set's programs per render tab).
  - CARDS: NOTES "Integration with CORE": `ctx.sunCard` is null by default now; far cards / crowds read `ctx.sun`'s
    map (your existing fallback). The first update of the film's sets takes 4-11 s per render tab (the "first updates"
    number in the compile log). I did not profile what is inside it; the cards' fill probes and atlases are the
    likely part (`probe: "rig"` is free).
  - STATION / CAST / everyone: draft stills now carry the probe bounce instead of the orange hemisphere, and lamps are
    white-balanced: material tints made against the old look (a "neutral canopy underside") should be looked at once.
  - LEAD: per-shot `rigOpts: { warmth: ... }` for the platform wides (table under Rigs); frame 0's sun direction
    decides how golden it feels (toward the lens = haze glow and rim; from behind the lens = clean daylight).

### Honest gaps
- Set rebuild per shot chunk: every shot opens fresh render tabs, so each shot pays page start + set build + compile + GI
  (~5-8 s draft, ~10 s final per shot after the compile fix). Rendering several shots of the same set in one renderMedia call would save it.
- GI is ONE probe per shot (SH, no spatial variation): the canopy shade and open ground get the same bounce. An
  irradiance volume (probe grid) would fix it. Bounce is one bounce only (rig `gi` multipliers compensate by eye).
- Rigs other than golden were tuned on stills of the pilot set + the test room only: morning / noon / overcastWarm read
  right; dusk is very orange. interiorWarm was re-checked on the lab only; nightPractical / undergroundWarm's round-3
  values were NOT rendered on a real set (kitchen and New York are parked). The night rig needs practicals in the set
  to read (by design).
- The lamp white balance changes the HUE of every kelvin lamp in every rig (brightness kept). Sets whose builders
  tinted materials to fight the old orange (HOME's lab walls, STATION's canopy underside) may now look a little cold
  and should be looked at once.
- Draft stills changed for every set (the probe instead of the orange hemisphere): old drafts are not comparable.
- Start-up per render tab is dominated by shader compile (20-35 s on the film's sets) and repeats for every shot and
  every tab. Not fixed: Remotion gives each Chrome a fresh profile and deletes its shader cache, and kit_render opens
  new tabs per shot. Rendering consecutive shots of one set in one tab would save most of it.
- The light budget only warns. A set far over it (NYC's station: 16 rect) still takes minutes to compile.
- `kit-recompile` was not seen firing on a real stall (in the "hide" test both light states had been compiled at the
  start, so the switch itself was free); its logic is a simple program count.
- `warmth` and `hints.rigOpts` are tools: nobody uses them yet. golden's own values were not changed.
- Cards: the pilot card is a yaw-only billboard, so from a drone it foreshortens and in a profile followSide it still
  shows the front pose (CARDS' card kit / pose choice).
- The R3F shadows fix and the timing are proven in this sandbox only; a film with many sets / practicals has not run.
- Asset changes under public/ do not change the shot hash (use `--force`).
- A harmless ANGLE warning (X3595 "gradient instruction used in a loop") comes from one program (likely N8AO's loop).
- Screens: the screen image is a plain scene render (no AO, shafts, bloom, motion blur, DOF) once per output frame; it
  re-renders the sun shadow map for the screen time (cost included above). A replay is only as right as the set's
  updates are pure in t (the contract). A "recorded copy" that never happened in the main timeline (the selfie pose)
  must be built by CAST / STATION as a `screenOnly()` object; CORE does not pose characters.
- The night rigs were judged on the pilot path + a box test room, not on the NY station / kitchen sets.

# kit/vehicles (TRAIN owner, "pointing" film): NOTES + API

## V4 HANDOVER (TRAIN owner, 2026-11-20 ~09:00, laptop switched off; the next team continues from the files)
State: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` and `-p src/sandboxes/kit_vehicles/tsconfig.json` (run
from `studio/` ONLY) are 0 errors. No render of mine running, no stills slot, no RAM token. The last final batch
(KitSteam 30,90,150,270,330 at final) was STOPPED before it wrote anything: the finals on disk
(`out/kit_vehicles/steam/final_90/210/330.jpg`, 08:26) are of the OLDER framings.

**Built (new files only; everything procedural, NO texture / model / path outside the project folder is read):**
- `kit/vehicles/steam_loco.ts` (K-P40): a BLACK British-style 4-4-0 tender engine of the Kobe area ~1910, 1,067 mm,
  brass dome + safety valves + bands, red buffer beam, white tyre edges, buffers + link coupling, no lettering; wheels,
  coupling + connecting rods, crossheads, pistons driven by `run(t)`; open cab (roof, round spectacle windows, low side
  sheets), backhead (pressure gauge, water glasses, regulator, copper pipes, a flickering firehole whose doors follow
  `fireDoor(t)`), one point light for the fire glow; tender with coal; option `cutaway(t)` hides the cab's LEFT side
  sheets (a side cut-away view). Marks `STEAM`, `LOCO` (frame: rail top y 0, front buffer beam z 0, runs toward -Z,
  driver on the LEFT x < 0, cab floor 1.38 m, cab z 6.25..7.95, round windows at (+-0.82, 2.72, 6.25)).
- `kit/vehicles/steam_fx.ts`: GPU plumes, pure in time: `locoSmoke`, `valveSteam`, `drainCocks`, `wisp`, `plume`.
- `kit/vehicles/steam_world.ts`: the treadmill world (`dist(t)` moves it +Z): paddies (canvas texture, some flooded),
  embankment + ballast, wooden sleepers, telegraph poles + wires (RIGHT side), pines / cedars / round trees, minka with
  thatch, hills, clouds, birds; a lower-quadrant SEMAPHORE on the left (arm lowered 45 deg = clear, no lit lamp by day;
  `signalAt` or `signalAhead(t)`); the NEAR foreground: rice tufts in rows over a flooded strip + reeds + wild flowers
  on the LEFT, a raised path with 3 farmers in straw hats + a small red torii on the RIGHT (beyond the train).
- `videos3/pointing/sets/steam.ts` (`build_steam`, `STEAM_PLAN`, `STEAM_RIG` = the look director's vivid block,
  `STEAM_SHOW.crew(t)` = who stands where + `cutaway` + `signal` distance, `CREW_DEFAULT`): CAST's v4 cards "hori",
  "fireman" (shovel held), "official" (notebook + pen); aim null everywhere (THE STEAM DRIVER NEVER POINTS). NOT yet in
  `sets/index.ts` (the DIRECTOR's file) and `steam.cams.ts BY_SHOT` is EMPTY.
- `videos3/pointing/sets/steam.cams.ts` `FRAMES_steam`: `event` (low, close front 3/4, rolled; v22), `cabSide` (behind
  his shoulder through the round window, the semaphore soft; v23), `wideCab` (side cut-away; v24-v25), `coalOut`
  (the coal man leaning out, from outside front-left; v26-v27), `boss` (side cut-away; v28-v29), `noseGlass` (from
  outside the right opening across the cab: Hori at the round window + the boss behind; v30), + old `twoShot`, `frame0`.
- Sandbox: `sandboxes/kit_vehicles/film_steam.ts` + COMP `KitSteam` in `Root.tsx`: 6 rows x 60 frames = event,
  cabSide, wideCab, coalOut, boss, noseGlass (frame 30 + 60 k = row k mid-move); each row sets its crew, sun and
  exposure.

**The lead's feedback on STEAM_1..3 (to act on):**
- EVENT (v22): right direction, the engine is liked. Wants: a richer foreground (rice rows with water glints, a raised
  path with farmers turning to look, flowers / reeds near the lens, a shrine gate or thatched roof for scale), LOWER
  and CLOSER (buffer beam + smokebox big, wheels + rods readable, horizon tilted a touch, smoke over the top of the
  frame), SPEED (streaked sleepers / grass at the bottom edge, a wheel-rim blur, birds scattering). Status: the lens
  is now low over the left paddy with reeds / flowers in front (draft_30 of 08:4x reads); the last tweak (lens z -8.6,
  look z 1.6, so the smokebox is not cut at the left edge) is in code and NOT yet seen.
- CAB SHOTS: WIDE side cut-aways, both men whole and medium (heads <= 1/5 of the frame), the firebox glow the warm
  centre, bright country + sky through the openings, coal, steam, the shovel; NO dark void; the steam driver never
  points (hands on the lever). Status: `wideCab` / `boss` use the cut-away (draft_150 reads: Hori in blue + glasses,
  the coal man in orange, the fire); the boss row's official was hidden behind the right side sheet (moved to
  (0.18, 1.38, 7.6), not yet seen); the cab interior is still dark-ish: add light (a second fill or a brighter fire).
- LINE 18 (v30, the funniest picture): `noseGlass` reads in the draft (the boss with moustache facing us at left,
  Hori in profile with glasses at the right by the window); Hori's face was cut by the window structure: the lens was
  re-aimed (look z 6.62, fov 58), NOT yet seen. The table wants it from OUTSIDE the round window looking in: an
  alternative lens in front of the cab front plate at (-0.82, 2.72, 5.6) looking +Z through the window.

**Next steps, in order:**
1. Render the six rows as drafts, look at each:
   `ENTRY=src/sandboxes/kit_vehicles/index.ts COMP=KitSteam PROPS='{"kit":{"quality":"draft"}}' bash scripts/stills_locked.sh out/kit_vehicles/steam/draft_ 30,90,150,210,270,330 0.5`
   (from `studio/`; a draft still ~10-30 s each; one heavy process at a time).
2. Event: check the smokebox is whole; add speed (more birds lifting near the lens, the kit shutter streaks at final).
3. Cab cut-aways: lift the interior light; make sure no black side-sheet slab covers the right third (hide the RIGHT
   back pillar too for `boss`, or move the lens); the boss whole and facing us.
4. v30: try the outside-the-window lens; hold it (NO move).
5. v27 (coal man "CLEAR!"): `coalOut` 0.4 m closer as a cut-in; v29 the notebook push.
6. Finals of the best: `... PROPS='{"kit":{"quality":"final","prof":true}}' bash scripts/stills_locked.sh out/kit_vehicles/steam/final_ <frames> 1`
   -> `pointing_preview/STEAM_<n>_*.jpg`.
7. Map `BY_SHOT` in `steam.cams.ts` (v22 event, v23 cabSide, v24 wideCab, v25 wideCab, v26 coalOut, v27 coalOut,
   v28 boss, v29 boss, v30 noseGlass) once the DIRECTOR's v4 film (studio/src/videos3/pointing/v4/, V4_STRUCTURE.md)
   says how sets + cams are looked up; give each shot its crew plan (the sandbox rows hold the numbers).
8. TODAY v19-v21 (platform arrival, the modern cab point at a green signal, the kid copying at the front window):
   the existing `cab` / `car` sets (being recoloured by the LOOK director: ask before editing) + STATION's platform.

**Traps:** run tsc ONLY from `studio/`; a card's limbs live in the card's plane (a lens beside the cab sees the side
sheets in front of them: use `cutaway`); CAST picks front / profile / back from yaw vs lens; the cab wisp sits outside
(0.32, 3.15, 6.05) so no cab lens looks through it; the sandbox rows name their framings (change both when renaming).

## HANDOVER 2026-11-20 02:30 (TRAIN owner #4 -> the next owner; replaces the 00:35 block)
State of the tree: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` (from `studio/`) 0 errors after my last
edit. No render of mine running, no stills slot held, no RAM token, no temporary bundle / frame / copy left. The clock is
the REAL VOICE now (`words.ts`, 135 words): s02 81-140, s03 140-212, s04 212-262, s05 262-344, s06 344-416, s10 717-770,
s21 1676-1706 (EV: bagCreep 314, footHook 330, bagHome 342, brake 379, bagBump 392). Re-read them from timeline.ts.

**(1) Checked on draft stills** (`studio/out/kit_vehicles/v3/draft_<film frame>.jpg`, copies `pointing_preview/TRAIN_*`)
- s02 (T-3 face match + the lead's phone cut): `draft_81` (his mark 10 cm off the wall: STAGE.tourist x 1.02; the whole
  phone in frame; eyes ~55 % across / ~38 % down), `draft_90`, `draft_125` (the whole suitcase, the boy at the glass).
- s03 (T-11): camera `face` (cab.cams.ts `faceCam`; the sandbox row now uses it too: it used `behind` until 02:20, so
  every s03 still before that showed the OLD lens): from his right shoulder at shoulder height, the lamp 15 % down on
  the cut, a small orbit + push. `draft_140`, `draft_142`, `draft_165`, `draft_208`. T-13 (his FACE in s03) is NOT
  solved: see the note on `faceCam` (geometry + the speed budget; a full orbit measured 9.9 %/f peak and still only
  reached a 3/4 back view). His face needs its own cut-in (the DIRECTOR's call).
- s03b (02:50, the lead's decision, Block 13: the driver's FACE cut-in, f164-212 by `fr(S("signal") - 0.04)`; the
  DIRECTOR adds it to the clock): cab framing `faceFront`, keyed `s03b` / `v3_s03b` in cab.cams.ts BY_SHOT; the sandbox
  plays s03 f140-164 + s03b f164-212 (it switches to FRAMES.s03b by itself once that exists). Inside the cab ahead-right
  of him (~35 deg off his nose line), a straight push 0.52 / 0.58 %/f (own camSpeedStats; the director's probe cannot
  see s03b yet). cab.ts hides the riders, the suitcase and the motes during s03b. Drafts `draft_166`, `draft_190`,
  `draft_200`; FINAL `v3/final_200.jpg` = `pointing_preview/TRAIN_13_s03b_driver_face_FINAL.jpg` (face ~25.5 % of the
  height, eyes 34 % down, the glove ~58 %). Gaps: the key / rim on his face is soft (the card light is CAST's), the green
  lamp is behind this lens.
- FIX ROUND after the first full preview (03:00-03:40, Block 14 / 14b / 14c; the gate = `tools/v3/qa_gates.py` on a draft
  clip, `--no-loop`, shots json in clip frames): on-screen camera (gate) s03 1.37, s03b 0.78, s04 0.83 (was 0.26: a
  0.32 m lateral truck with the look travelling along), s05 1.05, s06 0.53 (was 0.25: a push THROUGH the partition
  window frame from further back); chroma s03 20.2, s03b 22.6, s04 30.4 (at warmth 1.2: the car set now 1.0 + exposure
  0.97), s05 21.8, s06 21.9 (cab set warmth 1.2). s21 re-aimed AGAIN: behind and above his right shoulder, the lens
  INSIDE the cab all shot (the preview's lens started behind the partition: a black mass for 0.4 s), fov 46: his cap +
  head in the left ~20 %, the glove at the DARK door lamp with its icon, ~15 % of the width (`draft_1680`, `draft_1700`);
  the lamp stays dark in s21 (the doors close after the shot: pilot lit ~f1753). "From above the desk in front of him"
  was tried and fails (the desk reads sideways, the lamp at the frame edge). s03 calmer for its new 0.8 s (C1 near C0).
  s03b stopped down to f/6.3 (the blur gate at final); the sandbox tests s03b at sunEl 11 (warmer face): the film's
  s03b uses the shot table's CAB (sunEl 20) unless the DIRECTOR changes it. s04: the boy's point raised to y 1.04 (it
  sat in the caption band with CAST's chest-height point).
- THE CAPTION KEEP-OUT (the director, binding for this film, 1080 x 1920): y 1260-1440 = 65.6-75.0 % of the height,
  middle 90 % of the width; beat action above 64 %, or floor action at 76-83 % (the Shorts title overlay covers the
  bottom ~17 %).
- s04 (T-7 / T-12): `draft_222`, `draft_250`: restaged for this shot only (`STAGE.kidS04` / `touristS04`, `inS04`):
  the tourist NEAR the lens on the aisle half (0.8, Z+0.58), yaw -2.45 (front / three-quarter), his laughing face
  ~30 % of the frame height, the straight jab up-left stopping at the glass frame (aim Z+0.22); the boy smaller
  behind him at the wall half (1.18, Z+0.22), CAST's horizontal point onto the glass, eyes UP at him (the set gives the
  boy `look` = the tourist's face); the suitcase's top bottom right; no mum. Lens: twoShot fov 44 from the left wall.
- s05 (T-8, THE FOOT HOOK): `draft_322` (landed), `draft_330` (the hook), `draft_340` (dragged home). Restaged for s05
  only: the lens looks BACK from the cab glass down the packed car (start high: the crowd), sinks and lands at his
  knees (fov 80, low, the look tilted so the shoe + wheel sit at ~78-82 % of the height: below the caption keep-out); he stands in the doorway zone (`touristS05` 0.6, Z+1.45) facing the cab end, the suitcase at
  his RIGHT on the wall half (`bagS05` 1.02, Z+1.42, the home from the s05 cut until the reset after the first stop).
  It creeps back AWAY from the lens until its front wheels are level with him: wheel and shoe at one depth, the case's
  body BEHIND them, so the sneaker reads IN FRONT of the case. The car set solves his yaw only within PI +- 0.9 (face
  to the lens). On `draft_320` / `draft_330` (02:10) CAST's "readDown" face shows: eyes down / shut, a smile: he does not look.
- s06 (T-9): `draft_360`, `draft_380`, `draft_398`: CAST's `castLiftPair` is wired in `sets/cab.ts` (side +1, the boy's
  floor mark = `kidAt`, `KID_LIFT` = 0, `lifted` exported from train_stage.ts, his contact shadow off): mum holds him
  up, his face ~22 % of the height, the copy-point / ear, mum's face at the left (LIFT.sideM 0.3), the suitcase rolls in
  from behind them (it starts at bagS05) and bumps at the window's bottom right; CAST's lensGlove (white glove, navy
  cuff) in the bottom-right corner (`a` 0.12 / `b` -0.29 in cab.ts). The end pose shifted 5 cm toward mum at 01:49
  (not yet seen on a still).
- s10: `draft_760`: the boy turned from the glass (yaw 0.64) frowning up at the tourist; the tourist's free hand on
  the suitcase handle (aim = the handle).
- s21 (T-10 / T-13): `draft_1692`, `draft_1704`: from behind and above his right shoulder (0.75 m back; nearer, his
  cartoon head fills the frame): cap + head in the left third, the navy sleeve + white glove pointing at the DARK
  door pilot lamp, which now shows a pale DOOR ICON (a flat decal over the lens: the old icon was wrapped round the
  dome's sphere UVs and never showed), the fingertip just below-left of the bezel (aim in cab.ts), bezel ~18 % of the
  width. His eyes are NOT in this frame (from in front the sloped panel faces away from any lens).
- The door order (`out/kit_vehicles/draft_28.jpg` lamp lit / `draft_46.jpg` out), frame 0 (`draft_21`), the doorway
  (`draft_1`) at 01:38 with the ochre #8c8468 (read mustard-ish on the inner strip: now #7e7c72, not yet on a still)
  and the car-side lamps at power 3.2 (tone-mapped ORANGE: now #ff0c04 at 2.0, not yet on a still).

**(2) In code, NOT on a still**: the ochre #7e7c72; the redder car-side lamps (#ff0c04 at 2.0); the s06 end framing 5 cm
toward mum; the frame-0 patch in the FILM's frame 0 (STATION's set; tested only on my replica, see (3)).

**(3) SAVED 02:00:32, the FRAME-0 patch** (STATION's report: the case pastel, the cap louder): door glass from 0.15 m
(dims `dwinY0`, was 0.34: the whole case shows), NO band on the door leaves (train_jp `leaf` band boxes removed),
clearer door glass (env 0.35 -> 0.15, opacity 0.045 -> 0.03), the suitcase #f6bb08 (was #f7cd12) with clearcoat 0.55
when it has no interior env. Tested on a temporary copy: `out/kit_vehicles/patchtest_frame0_final_21.jpg`: case chroma
0.62 -> 0.79 (STATION's frame 0 before: case 0.65, cap 0.84). STATION was asked to give its frame-0 suitcase
`interior: true`.

**(4) Next steps**
1. Render the film's frame 0 and 42 at final
   (`node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality final --stills 0,42
   --out out/pointing_train/`), measure the case's chroma against the cap (case region vs cap region, top-half chroma).
2. Draft clips of s02-s06 for your own eyes (`node scripts/kit_render.mjs --entry src/sandboxes/kit_vehicles/index.ts
   --comp KitVehiclesV3 --quality draft --frames 81-416 --out out/kit_vehicles/clip/`; it takes the RAM token: only
   when the lead allows), frame strips with ffmpeg, fix motion (the suitcase's jump from bagKnee to bagS05 at the s05
   cut shows as a caster flip + shiver for a frame; the hook; the brake roll; the doors).
3. Probe after every camera change: `node briefs/v3/pointing/director/probe.mjs cams`.

**(5) Traps** (the 00:35 list still holds; new ones)
- A card's foot / hand lives in the card's plane: a prop part NEARER the lens than the card hides the limb. For a
  hook, the hooked wheel must be at the card's depth and the prop's body behind it (s05's whole staging is that).
- CAST lands a hand on the aim's place ON SCREEN: an aim only 12 cm in front of a big cartoon head lands the hand on
  the face (s04 first try). Aim a point on the glass a little below / in front.
- The stills log piped through grep stays empty until the run ends: wait on the jpg's mtime instead.
- The hold: while the DIRECTOR renders, any save to sets/cab*, car*, train_plan, train_stage or kit/vehicles changes
  the opening's shot hashes: ask the lead before saving when a render is announced.
- The sandbox `KitVehiclesV3` (film_v3.ts ROWS) names its framings itself: when you change BY_SHOT in a cams file,
  change the ROW too, or your stills show the old lens (it cost a round on s03).

Status 2026-11-20 02:30 (TRAIN owner #4, took over ~00:40): the opening's train shots s02-s06 restaged and checked on
stills on the real-voice clock; s10 / s21 re-done; the frame-0 patch saved. Everything below this block is the earlier
owners' text, corrected where the 02:30 state differs (film sets section, proof list).

## What changed tonight (read this first if you used the 17:30 version)
- **Bug 1 fixed:** the cab face is now a real face (rounded corner posts, a silver lower face, a black glass panel
  with three open panes, an emerald surround + brow): you see THROUGH the windscreen from both sides.
- **The "flesh rectangle" on the desk** was the rect practical's glowing panel lying over the instruments, not a card.
  The kit now uses NO practical lights at all (0 lights in the light budget): see "Light".
- **Orange ceilings / blue floors / yellow lower body fixed:** three's sky IBL is not occluded and r175 ignores
  `material.envMapIntensity` for `scene.environment`. Interiors, the stainless body and the under-floor parts now carry
  their OWN environment maps (`mats.ts`: `carEnv`, `cabEnv`, `skyEnv`, `underEnv`).
- **Door glass is TALL and clear** (0.34-1.74 m above the floor, 0.46 m wide; not JR practice, a story need): the 75 cm
  yellow suitcase reads behind a closed door from the platform (frame 0).
- **The true door order is built in:** leaves meet -> each car's red car-side lamp goes out (`lampDelay` 0.3 s, then
  `doorDelay` 0.03 s per car) -> once the last is out the desk's door-closed pilot lamp lights (0.15 s later). The hero cab's
  pilot lamp follows `train.pilot(t)` by default. Lamps change ONLY with the doors.
- **The car-side lamp moved** to the fascia mid-car beside the blank destination panel (`D.lampY`, `D.lampDZ`).
- **New API:** `train.carFloor(k)`, `train.lampOn(k, side, t)`, `train.pilot(t)`, `FACE` (dims), `suitcase` options
  `interior` / `rolled` / `tMax` + `wheelWorld(i, t)` / `speed(t)`, `interiorJP` option `hangingAds`, `cabJP` option
  `lever`. Nothing was removed; `doorAt`, `doorOpen`, `doorCycle`, `departRun`, `arriveRun`, `CAB`, `DOORS_CAB` are as before.
- `windowsOf()` now leaves the door pockets blind (side windows 2.2 m wide): an open leaf never slides behind glass.
- **The suitcase is the only yellow:** the doorway floor strips and the door-edge strips inside are a worn ochre
  (`PAL.ochre` #8c8468), not yellow (STATION's note).
- **`lampBeacon` (beacon.ts):** a far lamp that must read at phone size: a glow with a PIXEL FLOOR (core 18 px, halo
  40 px of a 1920-high frame) on a black board that the haze does not lift. The cab + car sets put it on the green
  lamp of STATION's signal (the verifier's blocker).
- The RIGHT partition window's sill is 0.55 m (the left one, behind the driver, 0.80; they were 0.92): from the cab
  the boy's chest and arms and the top 20 cm of the 75 cm suitcase show over it (script s06). Not JR practice (a real
  sill is ~0.9 m): a story need, like the tall door glass.
- The emerald is deeper and duller (`PAL.emerald` #16573b, was #0e6c3f): the waist stripe was the second-loudest
  colour of frame 0, right behind the yellow suitcase (the director's T-6).
- The door-closed pilot lamp on the desk is a 6 cm lens with a pale DOOR pictogram (it reads dark and lit).

## Files
| file | what |
|---|---|
| `dims.ts` | every number of the generic E231 / E233 / E235-like wide-body car (gauge 1,067, floor 1.13 m above rail, 2.95 m wide, 20 m pitch, 1.3 m doors, door centres, windows, band heights, lamp place, bogie centres, cab depth, ceiling) + `FACE` (the cab face: plane, corner radius, panes, destination window, emergency door) |
| `geo.ts` | Parts bags merged per material (non-indexed, metre UVs, `aDirt` vec2: x = dirt, y = per-panel tint), rbox / cyl / disc / ring / tube / quad / quadB / quadN (winding fixed for you) / quadUV / arcWall / lathe / extrude / sphere, `gridHoles`, `dirt` / `dirtKey` / `tint` / `tintKey`, seeded rng / noise |
| `mats.ts` | procedural tileable normal + roughness maps (brush / peel / weave / ribs / satin), `vmat()` dirt- and tint-aware PBR (+ own environment, + a share of CORE's GI), `glass()` (PBR reflection over ~90 % transmission, optional smudge + breath-fog map), `smudgeMap()`, `lamp()` (emissive on / off), `screenMat()`, `canvasTex()`, the environments `roomEnv` / `carEnv` / `cabEnv` / `skyEnv` + `aimSkyEnv` / `underEnv` / `ownEnv`, `PAL` |
| `train_jp.ts` | K-P1 `trainJP(ctx, opts)`: the consist (bodies, face, doors, lamps, bogies + wheels, pantographs, LOD, interiors) + `doorCycle`, `departRun`, `arriveRun` |
| `interior_jp.ts` | K-P3 `interiorJP(ctx, opts)`: the car fit-out + `carSway(t)` |
| `cab_jp.ts` | K-P2 `cabJP(ctx, opts)` + `CAB` (marks: seat, head, speedometer, pilot lamp, watch, controller, partition windows, panel normal) |
| `suitcase.ts` | K-P27 `suitcase(ctx, opts)` + `SUITCASE` sizes |
| `beacon.ts` | `lampBeacon(ctx, { pos, corePx, haloPx, board, color, on })`: a far lamp with a screen-size floor + a black background board |
| `index.ts` | re-exports |
Sandbox: `studio/src/sandboxes/kit_vehicles/` (ENTRY `src/sandboxes/kit_vehicles/index.ts`): COMP `KitVehicles` = one
frame per framing of the parts (`film.ts` ROWS: 27 framings, exterior at a plain kit platform + the cab + the car on
the treadmill); COMP `KitVehiclesV3` = the FILM's own `cab` + `car` sets on the script v3 outline timings (`film_v3.ts`).

## Frame (binding for everyone who places a train)
Train frame: y = 0 at the TOP OF RAIL, the nose of car 1 at z = 0, the cars extend toward +Z, the train RUNS toward -Z,
x + = the train's right, the driver sits on the LEFT (x < 0). Car k (0-based) spans z = 20 k .. 20 k + 20; car-local
z' = z - 20 k. The car floor is at y = D.floor = 1.13 (a 1.1 m platform is ~3 cm lower). The film's cab / car sets put
the train group at y = -D.floor (floor at y = 0).

## API
```ts
import { trainJP, doorCycle, departRun } from "../../../kit/vehicles/train_jp";
const train = await trainJP(ctx, {
  cars: 10,                         // car 1 + car N are cab cars (the rear one faces backwards)
  band: "#16573b",                  // emerald (default, PAL.emerald); the passing line: PAL.orange / PAL.orangeDark as band / bandDark
  pantographs: [2, 4, 7, 9],        // 1-based, raised to the wire (5.15 m above rail)
  run: departRun(t0, 0.8, 22),      // metres moved toward -Z at film time t (pure); default 0
  doors: doorCycle({ side: "left", openAt: 0, closeAt: 18.4, dur: 1.6, startOpen: true }),   // (t) => { side, open 0..1 }
  lampDelay: 0.3, doorDelay: 0.03,  // the red car-side lamps go out lampDelay s after the leaves meet, + doorDelay per car
  lod: "auto", nearM: 32,           // per-car near / far geometry by camera distance
  interior: "auto", heroCars: [1],  // hero fit-out (interior_jp) in car 1, simple lit interiors elsewhere
  heroCab: true, cab: { speed, fog, brake, lever, pilot? }, interiorOpts: { sway, swayK, blinds, hangingAds },
});
train.object.position.set(trackX, railTopY, noseZ);   // + rotation.y = Math.PI to run toward +Z
set.add(train.object);  // update EVERY sub-frame: train.update(t, cam)
train.doorAt(k, i, "left")   // V3 in the train frame: door i (0..3) of car k on the FLOOR at the outer skin (cast marks)
train.doorOpen(k, side, t)   // 0..1
train.lampOn(k, side, t)     // 1 while car k's red car-side lamp is lit
train.pilot(t)               // 1 once EVERY car-side lamp is out (the desk's door-closed lamp; the hero cab uses it)
train.noseZ(t)               // -run(t)
train.carFloor(k)            // a Group riding with car k: origin = the car's front end ON THE FLOOR (y up, z' along the car)
train.hero.interior / train.hero.cab   // the Built of car 1's hero parts (update is already chained)
```
- **Things that ride the train** (the suitcase behind the door glass, cards inside the car): `train.carFloor(0).add(obj)`
  and give positions in CAR coordinates (floor y = 0, z' from the car's front end: door 1 of car 1 is at z' = 3.6,
  x = +-1.4). They then leave with the train by themselves. (A suitcase given a WORLD `pos(t)` that includes the
  train's run spins its wheels with the train: mount it, or pass `rolled`.)
- **Door order** (ja.wikipedia 車側灯 + 鉄道合図, the script's sources): `doors(t).open` reaches 0 = the leaves have
  met; car k's lamp goes out `lampDelay + doorDelay x k` s later (defaults 0.3 + 0.03 k: the script's "lamps out 0.3 s
  after the thump", a quick ripple down 10 cars; STATION's `doorDelay: 0.12` puts car 10's lamp 1.1 s later than
  car 1's, after the train has started to glide); `pilot(t)` turns 1 another 0.15 s after the LAST car's lamp. For "one
  door speed, 1.3 s open to shut": `doorCycle({ ..., closeDur: 1.3 })` (default closing = dur x 1.1). Opening: the lamps
  light the moment the leaves start to move. Inside the hero interior the red bar above each door BLINKS while the
  leaves move (the checked fact: ja.wikipedia E233) and is dark otherwise (`interiorOpts.doorLampOpen: 1` = steady
  while they stand open; not checked, so off by default).
- `suitcase(ctx, { pos, yaw, handle, tilt, casters, color, contact, scale, interior, rolled, tMax })`: every field a
  value or (t) => value. It ROLLS BY ITSELF: a 60 Hz path table of `pos(t)` (pure) gives the wheels their roll and
  the casters their trailing heading (kept when it stops), with a small shimmy and shell shiver at speed; the tag
  swings. `interior: true` = the shell reflects the car (carEnv) instead of the sky. Returns `wheelWorld(i, t)` (the
  world point of caster i, for a foot that hooks a wheel; order -x-z, -x+z, +x-z, +x+z) and `speed(t)`. Local frame:
  stands on y = 0, front +Z. 0.5 x 0.75 x 0.3 m shell (wheels 6.4 cm), handle grip 0.80..1.05 m.
- `interiorJP(ctx, { cab, doors, sway, swayK, blinds, hangingAds, seed, lights })` / `cabJP(ctx, { speed, pilot, fog,
  brake, lever, blind, lights })` can be used alone (car-local frame, floor y = 0): see their headers.
  `hangingAds: false` removes the blank hanging ads (their lower edge is at 1.885 m: a ceiling fly-through hits them).
- `lampBeacon(ctx, { pos: (t) => V3, face = [0, 0, 1], color = green, corePx = 18, haloPx = 40, coreM, haloM, board =
  [1.7, 2.6] | false, boardDy = -0.35, on, nearM = 4 })` -> Built (call `update(t, cam)` every sub-frame). Pixel sizes
  are of a 1920-high frame at any render size. The board is unlit black with fog off; hide it with `board: false` when
  the lamp already sits on a dark background.
- `carSway(t)` = the kit's default car rock signal (-1..1); the film passes CAST's `rockLag(t, lag).roll / 2.2` so the
  straps and the crowd sway together.
- `CAB` marks (car-local, floor y = 0): `driverSeat`, `driverHead`, `speedo`, `pilotLamp`, `watch`, `controller` (the
  T grip), `panelNormal`, `partitionZ`, `windowL` / `windowR` / `door` (the partition), `windscreenY`, `driverPane`.

## Light (why there is no practical in the kit)
- three's IBL is not occluded by walls, and in r175 `material.envMapIntensity` only works with `material.envMap`
  (for `scene.environment` it is replaced by `scene.environmentIntensity`). So inside a car the sky HDRI lit the
  ceiling with the park's ground (orange) and mirrored the sky in the floor (blue); under the car it lit the bogies
  from below; on the car sides it mirrored sunlit grass (olive).
- `roomEnv(ctx, spec)` renders a small box-room environment (128 x 64 float equirect -> CORE's `pmremOf`), cached:
  `carEnv` (white ceiling + the two LED strips, pale walls, the daylight window band broken by door piers, dark bench
  backs, the grey floor), `cabEnv` (the windscreen band ahead, side windows, a dim ceiling, the dark desk, the lit car
  behind), `underEnv` (daylight from the sides only, dark ballast below, the black floor above). `skyEnv` = a clean sky
  gradient with a warm glow toward the sun over a NEUTRAL ground, for the stainless body; `aimSkyEnv` turns it to the
  live rig's sun every update. `vmat({ envMap, env })` / `glass({ envMap })` / `ownEnv(material, env, k)` attach one.
- Own-environment materials take only 30 % (`giK`) of CORE's GI probe + bounce hemisphere (those are not occluded
  either: a platform probe paints a car ceiling orange), and switch their environment off while CORE bakes its GI cube
  (`scene.environmentIntensity === 0`), so the probe holds only sun-lit surfaces + the emissive strips.
- The LED strips, LCDs, dial faces, the pilot lamp, the car-side lamps, head / tail lights are EMISSIVE (they bloom).
  `interiorJP({ lights: true })` / `cabJP({ lights: true })` add RECT practicals (bulb off) if a set wants real light
  from them; default off = 0 lights from this kit, nothing to hide, no shader variants.
- Environments are day versions (`day = 1`). A night version is one argument away (`carEnv(ctx, 0)`), but nothing
  switches it by rig yet (the film only uses golden on these sets).

## Colours under the golden rig (learned the hard way)
A sunlit diffuse grey turns yellow-orange there (warm sun x grade saturation): greys lean cool, dirt is dark and nearly
neutral (`#2d2b28`), the suitcase yellow is a slightly green sunflower (`#f7cd12`) so it stays YELLOW, the emerald is
`#16573b` (twice deepened: the sunlit band went neon and fought the yellow suitcase). The door-side lamp's emissive power is 3.2 (at 9 it bloomed to pink-white).

## Research notes (what a train fan checks)
- Generic JR East "wide body" stainless commuter car (E231 / E233 / E235 family): 20 m, 2,950 mm wide, 4 double-leaf
  sliding doors per side at ~4.82 m pitch, 1,300 mm openings, floor ~1,130 mm above rail, 1,067 mm gauge, bolsterless
  bogies (13.8 m centres, 2.1 m wheelbase, 860 mm wheels, air springs), one roof air-con unit, single-arm pantographs on
  motor cars, a coloured line band under the windows + a thin header band, the RED car-side pilot lamp (車側灯) in the
  fascia, blank side + front destination displays here (made-up line: no text, no logos, no kana car numbers), dull
  (not mirror) stainless in panels, anti-fall plates between the cars.
- Face: an E235-like flat face with rounded corner posts and a coloured surround round black glass; three panes with
  the middle one in an emergency door (as on through-running stock); lights in the waist; a grey obstacle deflector,
  a close coupler with its electric head.
- Cab: desk on the left, the one-handle T master controller for the left hand, an analog speedometer between LCD
  panels, the door-closed pilot lamp on the desk, the pocket-watch holder (a classic JR detail), a timetable card
  holder, a roller sun blind, a radio handset, the cream partition with a window behind the driver, a door, and a big
  right-hand window (kids watch the driver from both).
- Interior: long 7-seat benches in green moquette, priority seats at the car ends in another colour with pictogram
  stickers and orange strap rings, white rounded-triangle rings, stainless rails / stanchions 2-3-2, white end
  partitions with a grab pole, luggage racks with frosted panels, two LCDs above each door, red door lamps, yellow floor
  strips at the doorways, blank hanging ads + blank frames over the windows, a glass gangway door.
- NOT checked against a source tonight (no web): whether JR East waist bands cross the door leaves (here they do, cut
  by the tall glass); the exact place of the 車側灯 on an E233 (here mid-car in the fascia).

## Film sets built on it (TRAIN owner): `videos3/pointing/sets/cab.ts`, `car.ts`, their `.cams.ts`, `train_plan.ts`, `train_stage.ts`
- **Every time comes from the DIRECTOR's clock** (`videos3/pointing/timeline.ts`: cuts `cutS(id)` / `FRAMES`, events
  `EV`, `DOOR_CLOSE_S`). No typed second is left in these files (requests ALL-1 / T-1): when the voice moves a cut the
  run, the doors, the suitcase and the cameras move with it.
- `train_plan.ts` = THE TIMETABLE of both sets: cruising 72 km/h (s02-s04), picking up speed from `cutS("s05")` to
  `EV.bagHome`, braking `EV.brake` .. `EV.stopA`, an UNSEEN 1.5 km skip while the first stop is filmed from the
  platform, the last metres into station B in s10, stopped at `EV.arriveB`; the left doors open from `EV.doorsOpenB`,
  close from `EV.chimeB` in `DOOR_CLOSE_S` (ONE door speed), lamps out at `EV.lampsOutB`, away at `EV.glideB`. The
  green signal stands `signalLead` 85 m ahead when s03 starts (~70 m when the glove is up, ~40 m at the cut).
- `train_stage.ts` = THE STAGING of both sets (one file, so a shot through the partition glass and a shot from the
  aisle show the same people in the same places): `STAGE` marks, `kidAt(t)` / `mumAt(t)`, `touristYawAt(t)`,
  `BAG_BEATS` + `bagAt(t)`, `KID_LIFT`. While running: the boy at the aisle half of the RIGHT partition window
  (0.62, 2.28), the tourist at its wall half, half a metre back (1.12, 2.62), the suitcase at his knee on the aisle
  side (0.72, 2.78), mum back by the cab door (-0.25, 3.0: never between a lens and the two). The tourist's heading
  per shot: back to the glass (s02), swinging round to it from `EV.phoneSwing` (12 frames), facing it (s04), turned
  away with his right foot beside the suitcase (s05), three-quarter to the glass (s06), to his phone (s10).
- **The suitcase** (`bagAt`): creeps back 0.3 m from `EV.bagCreep` to `EV.footHook`, is dragged home by CAST's own
  hook curve (`hookAt(t).drag`); the car set turns the tourist so CAST's right-foot reach lands on the suitcase's
  nearest wheel (it warns in the console if the wheel is more than 8 cm from the reach). Under the braking it rolls
  straight ahead to the wall under the window (`EV.brake` .. `EV.bagBump`, a 3 cm rebound). Unseen it is back at his
  knee for s10; from `EV.doorsOpenB` + 0.5 s it is wheeled to the ochre strip of the LEFT front doorway, parked by
  `EV.park`. The cab set builds the same suitcase (s06 sees its top through the glass).
- **s06, the lead's decision: mum lifts the boy up to the window.** The cab set calls CAST's `castLiftPair` (side +1:
  her head on the wall side) on `kidAt` (the floor mark) with `k = lifted(t)`; `KID_LIFT` is 0 (the call raises him).
  The car set still uses `mumAt` (mum's floor mark in s06 is unseen from the car). The driver's white glove in the near corner is CAST's `lensGlove` card, half a metre in front
  of the shot's own lens, riding his second call's curve.
- Both sets: a 2-car trainJP (car 1 = hero cab + hero interior), floor at y = 0, STATION's `lineside` treadmill with
  station B as `stations: [{ noseAt: stopAt }]` and its starting signal; a `lampBeacon` on the green lamp;
  `hints.rigOpts = { fog: 0.0035, haze: 0.0005 }` (the lead's fog; the lower sun haze is mine: looking into the low
  sun its in-scatter washed out everything past 60 m, the beacon's black board included). The platform people of
  station B ride the platform (they slide in with it in s10).
- **Cameras** (`cab.cams.ts`, `car.cams.ts`): NAMED framings, each ONE calm move that never stops (`glide` = one move,
  `path` = a few knots; eases `soft` / `outQuad`), keyed in `BY_SHOT` with the outline's ids, both as `s03` and
  `v3_s03` (the director's cams.ts asks `v3_<id>` first). Measured with the director's probe
  (`node briefs/v3/pointing/director/probe.mjs cams`, CORE camSpeedStats, % of the frame per frame, median / peak):
  at 02:25: s02 0.22 / 2.3 (the script's own hold - move - hold), s03 0.63 / 0.70, s04 0.73 / 0.76, s05 0.64 / 3.43,
  s06 0.58 / 0.67, s10 0.67 / 0.77, s21 0.21 / 0.24 (a hold in the script); film 0.568, no shot under 0.15.
  - car `s02` laugh: THE MATCH CUT. Frames 0-10 hold his face where s01 leaves it (measured on STATION's `frame0Cam`
    at its last frame: the frame 1.45 m high at his face, eye line 38 % down, 55 % across), frames 10-40 ease back and
    sink (fastest first) to the whole suitcase and the boy, then creep on. It ends at the first seats; the first
    right-hand seat is left empty (a head there filled a quarter of the frame).
  - cab `s03` behind: the frame is AIMED BY THE LAMP: the green lamp is in frame from the first frame and drifts from
    upper right to the middle while the lens orbits toward his right side and pushes in (fov 56 -> 50); the driver
    aims just under the lamp, so the glove comes up beside it and never covers it.
  - car `s04` twoShot (02:00): from the left wall, fov 44, with s04-only marks (`kidS04` / `touristS04`): the tourist
    NEAR the lens, three-quarter (yaw -2.45), his laughing face ~30 % of the height, the jab at the glass; the boy
    smaller behind him at the wall half, his point on the glass, eyes up at him; the suitcase's top bottom right.
  - car `s05` aisleGlide (02:00): from the cab glass looking BACK down the packed car, sinking to land at his knees
    (fov 80): s05-only marks `touristS05` / `bagS05`; the hooked wheel at his depth, the case's body behind it, shoe +
    wheel at ~78-82 % of the height (below the caption keep-out).
  - cab `s06` partition: the right partition window fills the frame; the boy held up at screen left, the suitcase's
    top rolling in along the window's bottom edge at screen right, the glove soft in the bottom-right corner.
  - car `s10` selfie: s02's set-up from the other side of the aisle, a slide with a push (the boy turns to frown up at
    him, the tourist's free hand on the handle); cab `s21` lampOver: from behind and above his right shoulder, his cap +
    head in the left third, the glove at the dark door lamp (its door icon is a decal), a breath of push (0.21 %/f).
  - cab `s03` face (`faceCam`): shoulder height, the lamp 15 % down on the cut, a small orbit (0.63 %/f); see T-13.
  - Without a shot: `FRAMES_cab` behindWide / profile / threeQ / lampClose / desk, `FRAMES_car` doorOut / doorWide /
    aisle. The lens stays on the aisle side, so the train's forward is into the screen or screen LEFT, as on the
    platform.
- s15 / s18 / s20 (from inside the doorway) are filmed in STATION's platform set, whose train carries the same hero
  interior. For STATION's platform shots: mount the suitcase / the boy behind the door glass with
  `train.carFloor(0).add(...)` in car coordinates (see API), so they leave with the train.
- Sandbox COMP `KitVehiclesV3` (`sandboxes/kit_vehicles/film_v3.ts`) plays these two sets on the clock's own shot
  frames (the extra framings fill the gaps), so a still of frame N there is frame N of the film.

## Proof / cost / gaps
**02:30 state (owner #4)**: the film sets' drafts `out/kit_vehicles/v3/draft_<film frame>.jpg` on the real-voice clock:
81, 90, 125 (s02), 140, 142, 165, 208 (s03), 222, 250 (s04), 320, 322, 330, 340 (s05), 360, 380, 398 (s06), 740, 760
(s10), 1692, 1704 (s21). Finals 02:05 at 1080 x 1920 (kit.prof, 8 sub-frames): `final_2` (face 3/4, sub-frame 14.5 ms,
29-32 s per still all in), `final_6` (bogie 18.5 ms), `final_13` (cab, the lit door lamp with its icon, 18.5 ms),
`final_17` (car interior 19.9 ms), `final_25` (cab 3/4, 17.3 ms); the film sets: `v3/final_165` (cab set 38.7 ms,
CPU updates 5.1 ms, 42 s all in), `v3/final_330` (car set 37.5 ms, CPU updates 56.7 ms = the cards, 52 s). The frame-0
patch: `patchtest_frame0_final_21.jpg` (case chroma 0.79). A draft still 33-75 s with the machine shared.
Honest look at the finals: a generic JR-East-style stainless EMU reads (face, band, doors, interior with straps,
LCDs, hanging ads, moquette benches); weak spots a train fan sees: the skirt / snowplough and coupler are plain blocks,
dirt near the bogies is faint at this distance, the windscreen shows almost no reflection, the desk is a simplified
console (no real one-handle master controller shape), the interior is very clean. Story-need departures: the door
glass now runs 0.15-1.74 m (was 0.34; real ~0.9-1.8), the right partition sill 0.55 m (real ~0.9), the band does not
cross the door leaves (that one is closer to E233 practice).

Stills only, through the limiter. Commands (from `studio/`):
`ENTRY=src/sandboxes/kit_vehicles/index.ts COMP=KitVehicles PROPS='{"kit":{"quality":"draft"}}' bash scripts/stills_locked.sh out/kit_vehicles/draft_ <frames> 0.5`
(final: `"quality":"final","prof":true`, scale 1; the film's two sets on the clock: `COMP=KitVehiclesV3`, prefix
`out/kit_vehicles/v3/draft_`, frame N = frame N of the film).
- **The parts** `studio/out/kit_vehicles/draft_<n>.jpg` (0-28, 46; rows in `sandboxes/kit_vehicles/film.ts`): exterior
  at a platform, face, bogie, roof, doors open / closing / closed, the car-side lamp, cab, desk, car, doorway, FRAME 0
  (21, 22), the door order (28 = leaves just met, lamp lit; 46 = 0.6 s later, lamp out). Most were rendered 22:30-23:10
  on 2026-11-19, BEFORE the ochre strips, the lower right partition sill and the duller emerald; 1, 7, 11, 15, 18, 21,
  23 after the first ochre. Finals: `final_21.jpg`, `final_1.jpg`, `final_17.jpg` (23:05), `final_2.jpg`,
  `final_26.jpg` (earlier).
- **The film's two sets** `studio/out/kit_vehicles/v3/draft_<frame>.jpg`, rendered 00:05-00:20 on 2026-11-20 with the
  clock's frames (s02 81-145, s03 145-212, s06 352-437): 81, 101, 125 (s02), 145, 165, 205 (s03), 385, 415, 432 (s06).
  They show the staging of 00:05: the suitcase's home was 12 cm further forward and 8 cm more to the wall than now.
- Copies for the owner: `C:\\Users\\utkar\\Desktop\\animated-shorts-studio\\pointing_preview\\TRAIN_1..4_*.jpg`.
- Before (20:35 at takeover): `out/kit_vehicles/before_2030_*.jpg`.

### Cost (GTX 1660 Ti / ANGLE D3D11, shared with other sessions; CORE's `kit.prof`; final = 1080 x 1920, 8 sub-frames)
Measured 22:30-23:10 on 2026-11-19 (before the restaging; the geometry is the same, the cab set has since gained the
suitcase + one glove card):
| what | measured |
|---|---|
| the parts alone (3-car train at a kit platform, or the 2-car train on a light lineside; no cast) | sub-frame 15.4-28.0 ms over 7 framings (main pass 12.4-19.6, AO 1.6-12.5, shafts 0-9.6, sun shadow 0.8-2.4); CPU updates 0.5-0.7 ms |
| the film's `car` set (2-car train + CAST's cards + the full lineside + station B) | sub-frame 33.2 / 39.2 ms (main 18.0-23.4, sun shadow 10.5-12.4, AO 7.1-8.3); CPU updates 16.5-30.3 ms (the cards, not the train) |
| the film's `cab` set | sub-frame 27.8 ms (main 17.1); CPU updates 6.1 ms |
| one final frame | parts ~0.2 s; the film sets ~0.4-0.55 s of GPU + updates (budget 4 s) |
| lights from this kit | 0 (budget 8 real / 4 rect / 2 shadowed) |
| shader programs | parts 36-45; the film sets 78-89 with CAST + the full lineside |
| compile per render tab | parts 7.8-10 s; the film sets 20-26 s |
| a draft still, all in | parts 16-25 s; the film sets 33-60 s at 23:00, 52-90 s after midnight with three sessions rendering |
| a final still, all in | parts 21-43 s; the film sets 51-66 s |
Triangles were not counted.

### Honest gaps (the open work is in the HANDOVER block at the top)
1. **Not a real JR car in four places, on purpose or unchecked:** tall door glass (0.34-1.74 m) and a 0.55 m sill on the
   right partition window (story needs); the waist band crosses the door leaves and the car-side lamp sits mid-car in
   the fascia (both unchecked against a source: no web tonight).
2. **Only car 1 has the hero cab + hero interior.** The rear cab is an empty shell; far cars show benches, a ceiling
   glow and poles. Crew door, cab door, gangway doors and the emergency door do not open; wipers parked; the pantograph
   does not bounce; destination displays are blank.
3. **Reflections are painted, not captured** (`skyEnv`, `carEnv`, `cabEnv`): no platform, people or suitcase in any
   reflection; day versions only. `giK` 0.3 was chosen by eye.
4. **The lampBeacon's black board only reads with the lower sun haze** (`hints.rigOpts.haze 0.0005`, both sets): at the
   golden rig's own haze the in-scatter toward the low sun lifts it to the background's brightness.
5. **2D cards against 3D props:** a card's foot or hand lives in the card's plane. The hook works because STAGE puts
   the suitcase's wheel level with the tourist; a lens far off his plane will show the toe beside the wheel, not on it.
6. **The UNSEEN 1.5 km skip** (`EV.stopA` + 2.5 s .. `EV.glideA` - 0.5 s) is a 300 m/s blur if a cab / car shot ever
   lands in that window.
7. **Draft stills alias** (brushed steel, louvres, gasket lines at 540 px); at final they hold.

# BUILD BRIEF for the "pointing" film (stage B, lead, 2026-11-19 16:15): read IN FULL before building

You build part of "Why Japanese Train Drivers Point at Nothing", the FIRST film on our new three.js real-world kit.
The owner wants every small detail right, Blender-level realism in a warm, bright, golden look, lots of life, and a
video people do not swipe. Work alone, do not ask questions, finish your part, report facts honestly.

## Read first (binding)
1. `studio/src/kit/KIT_CONTRACT.md`: THE DETAIL STANDARD (3 scales of detail, no bare primitives near the lens, wear,
   contact, life >= 3 moving things, only characters inked), the speed budget, the house rules.
2. The kit APIs: `studio/src/kit/core/NOTES.md` (KitFilm / KitComposition, quality presets, rigs + `ctx.practical`,
   GI, camera grammar `shotCam`, `kit_render.mjs`), `kit/surfaces/NOTES.md` (`surface()`, `ground`, `platform()`,
   `railTrack()`, `building()`, `room()`, decals, 37 sets incl. tactile_paving, subway_tiles, steel_brushed,
   vinyl_speckled, ballast, worktop_laminate, tunnel_concrete), `kit/nature/NOTES.md` (trees, grass, weeds, scatter,
   52 props, fx: motes / steam / smoke / sparks / birds / debris / rain), `kit/cards/NOTES.md` (`card()`, `castCard()`,
   `crowd()`, card light, shadows, foot grass). Use them; do not re-invent them. Never edit another owner's folder:
   if a kit module needs a change, write it in your report as a request.
3. The film plan: `briefs/v3/pointing/bible.json` (every shot: set, surfaces, props, life, fx, rig, camera, acting,
   sound events) and `briefs/v3/pointing/BIBLE_NOTES.md` (section 4 = the set build specs, 5 = character specs,
   6 = kit requests K-*, 10 = fact + culture guards: no Japanese text anywhere (pictograms / digits / arrows only), no
   logos, no platform doors, 1,067 mm gauge, the real door order), plus `briefs/v3/pointing/LEAD_DECISIONS.md`.
4. The scaffold you build into: `studio/src/videos3/pointing/` (`film.ts`, `shots.ts`, `sets/<set>.ts` +
   `sets/<set>.cams.ts`, `cast.ts`, `STARTED_FROM.md`) and `PIPELINE_V3.md` stage B. Each set file exports its
   `SetBuilder`; per-set cache hashing only recognises `sets/<id>.ts`.

## Ownership (one owner per file; nobody edits another owner's files)
| owner | builds | reusable parts go in | film files |
|---|---|---|---|
| TRAIN | K-P1 train exterior (generic emerald-stripe Tokyo commuter EMU, stainless body, doors with door-side lamps, windows, pantograph, bogies), K-P2 cab (desk, speedometer, door-closed lamp, pocket watch holder, controls, the window behind the cab), K-P3 packed car interior (straps, seats, poles, ads frames BLANK, door lamps, window light), K-P27 the big yellow rolling suitcase | `kit/vehicles/` (new) | `sets/cab.ts`, `sets/car.ts` + their `.cams.ts` |
| STATION | the Tokyo island platform (kit `platform()` + canopy K-P10, benches, bins, vending machine K-P7 with pictogram-only buttons, the camera monitor, pole clocks), lineside world: track (kit `railTrack()`, 1,067 mm), signals K-P4, overhead-wire masts K-P5, utility poles K-P26, embankment, houses; the TREADMILL world helper K-K2 (the train stays still, the world scrolls past; the cab set imports it) | `kit/rail/` (new) | `sets/jp_platform.ts` + `.cams.ts`, `kit/rail/lineside.ts` (used by TRAIN's cab) |
| NYC | the New York underground station (white tiles, columns, the black-and-white striped board, US tactile domes, platform edge), the NY subway car (generic stainless, no logos) and the dark tunnel | `kit/subway/` (new) | `sets/ny_station.ts`, `sets/ny_car.ts` + `.cams.ts` |
| HOME_LAB | the night kitchen (gas stove K-P15 with knobs, apartment door K-P18 with keys, range hood, fridge, wall clock, kettle, worktop) and the bright railway test lab (task board with lights + buttons, the two glass jars K-P20 with red balls, work table) | `kit/home/` (new) | `sets/kitchen.ts`, `sets/lab.ts` + `.cams.ts` |
| CAST | every character as our 2D cartoon cards (driver, tourist, kid, NY conductor, NY commuter, lab volunteer, researcher, commuters / crowd with strap pose + shared sway, true profile faces, the hand with keys), with the acting kit (poses, expressions, mouth shapes, the driver's point gesture timed to words) | `studio/src/videos3/pointing/cast/` | `cast.ts` (the film's cast entry) |
Sets place characters through CAST's API (`cast.ts`); until CAST publishes it (in `studio/src/videos3/pointing/cast/NOTES.md`, within its first hour), use `castCard(ctx, { who: "phoneGuy", ... })` placeholders at the right marks. STATION and TRAIN agree via files: TRAIN exports `trainJP(ctx, opts)` from `kit/vehicles/train_jp.ts`; STATION exports the lineside treadmill from `kit/rail/lineside.ts`; until each exists, use a box placeholder of the right size and swap at the end.

## Acceptance (each owner, before reporting)
- Draft stills of EVERY framing your sets appear in (the shot ids are in bible.json), via
  `node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality draft --stills <frames> --out out/pointing/`
  (check `kit/core/NOTES.md` for the exact flags) or `scripts/stills_locked.sh`; plus 2-3 FINAL-quality stills of your
  hero framings. Look at them yourself against the DETAIL STANDARD and the bible, fix, and repeat.
- Typecheck clean: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` (from `studio/`).
- `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/bible_validate.py briefs/v3/pointing/bible.json`
  still PASSES (from the repo root).
- Measured cost per sub-frame at final quality within the budget.
- A `NOTES.md` in your reusable folder (API, what exists, cost, honest gaps).

## House rules (binding, repeated)
- The PC is shared with another Claude session. Stills only through the limiter / kit_render (it handles the RAM
  token for multi-frame renders). No full-film renders: the lead runs those. One heavy process of yours at a time.
- The disk filled up today: never leave render bundles or frame dumps behind (the scripts now clean their bundles;
  delete your own temporary frames).
- Never `npm install`. CC0 assets only, each in `studio/public/kit/LICENSES.md`. Do not commit or push. Never play audio
  or video. Never edit the old films (`studio/src/videos/*`) or the kit owners' folders. Save often in small pieces
  (the connection drops sometimes).

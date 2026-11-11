# 01 — Process, rules, reference measurements and helper scripts

Study notes for the repo `mromidev/claude-animated-shorts` (read-only clone at
`<ROOT>\repo`). Slice: the process docs, the rules, the two measured reports
(motion, grade), the reference-study brief, the script example and the five helper scripts.

## Files read (every line)

| File | Lines | Notes |
|---|---|---|
| `SKILL.md` | 166 | the skill itself: pipeline, rules, final look values, gotchas |
| `README.md` | 33 | install + contents table |
| `LICENSE` | 15 | MIT, "Copyright (c) 2026 Mr omi" |
| `references/STYLE_BIBLE.md` | 44 | first (coarse) study of the 20 reference shorts |
| `references/reports/CONTEXT.md` | 55 | shared brief given to every measuring agent |
| `references/reports/motion.md` | 435 | camera + character-animation measurements and recipe |
| `references/reports/grade.md` | 380 | colour/tone measurements and the fitted grade |
| `templates/SCRIPT_example.md` | 22 | the bridge short's script v1 with facts |
| `templates/sandbox_index_example.tsx` | 7 | entry file for a look-pass sandbox |
| `templates/scripts/short_qa.py` | 78 | frame-by-frame QA of a final render |
| `templates/scripts/sbs_sheet.py` | 32 | side-by-side review sheet (ours vs reference) |
| `templates/scripts/bridge_merge.py` | 30 | merge sandbox files back into main |
| `templates/scripts/bridge-stills.mjs` | 21 | render chosen frames as JPEG stills |
| `templates/scripts/bridge_shots.py` | 19 | parse story.ts into shots.json for QA |

Also opened to check connections (not my slice, only the lines needed): `templates/bridge/story.ts` (lines 1-97 and
grep of keys/KICKS/DOF), `templates/bridge/grade.ts` (lines 90-179), `templates/bridge/Bridge.tsx` (imports, bloom,
composer), `templates/bridge/lights.ts` (sky/fog presets), `templates/bridge/ink.ts` (ink constants),
`templates/bridge/world.ts:17-24` (Kenney list), `templates/bridge/cast.ts` (blink), `templates/audio/cues.md` (mix facts).
Images looked at: all 38 `references/frames/*.jpg` (as a montage) and `references/sheets/short14_sheet.jpg`.

Image facts: `references/frames/` = 38 JPEGs, 540x960, named `shortNN_0060.jpg` (frame 60 = 2.0 s) and
`shortNN_0180.jpg` (frame 180 = 6.0 s). Shorts 15 and 17 have only the 0060 frame (20 + 18 = 38).
`references/sheets/` = 20 JPEGs, 1800x1920 = a 10 x 6 grid of 180x320 tiles = 60 frames per short, **sampled across the
whole video** (short14's sheet runs from the opening line to the last word "war."). They have the reference's
burned-in one-word captions. (STYLE_BIBLE's "each sheet = 2 s" talks about a different, private sheet set that is not in
the repo; see Bugs.)

---

## 0. What the repo is, in one paragraph

A Claude Code "skill" (a folder with a `SKILL.md` that Claude follows). It holds: the full source of one finished short
("The Bridge That Fell for a Song", 67.5 s, 2025 frames at 30 fps, 1080x1920, rendered at 1440x2560), the Python sound
generators, five helper scripts, and a private style study of 20 reference shorts from one channel (numbers, frames,
contact sheets). It does **not** include a Remotion project: no `package.json`, no `src/index.ts`, no `src/Root.tsx`,
no `public/` assets, no Kenney models, no voice files. You must supply those yourself.

---

## 1. End-to-end process (every step, every command, in order)

### 1.1 Setup and versions

- Install the skill: copy the repo folder to `~/.claude/skills/cartoon-3d-short/` (README.md:22). The frontmatter
  name is `cartoon-3d-short` (SKILL.md:2).
- Tools named: Remotion with `@remotion/three`, Node, Python 3, ffmpeg (README.md:23).
- Exact stack the bridge was built on (CONTEXT.md:29-30):
  - Remotion **4.0.290**
  - three **0.175**
  - @react-three/fiber **9.1.2**
  - @react-three/postprocessing **3.0.4**
  - postprocessing **6.37.2**
  - also used by the scripts: `@remotion/bundler`, `@remotion/renderer` (bridge-stills.mjs:7-8).
- Python libs used by the analysis/QA: numpy (2.4), PIL/Pillow (12), scipy (1.18); **no OpenCV** (CONTEXT.md:43).
  `short_qa.py` and `sbs_sheet.py` need only numpy + Pillow + ffmpeg/ffprobe on PATH.
- Browser for stills: Google Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, WebGL through ANGLE
  (`chromiumOptions: { gl: "angle" }`) (bridge-stills.mjs:11-12).
- Composition: id `BridgeShort`, 1080x1920, 30 fps, `durationInFrames = BRIDGE_FRAMES = TOTAL = 2025`
  (SKILL.md:9, sandbox_index_example.tsx:6, Bridge.tsx:23, story.ts:6).
- Kenney CC0 models must sit in `public/bridge/kenney/<name>.glb` (world.ts:24 loads them with `staticFile`). The 26 names
  (world.ts:17-19): tree_oak, tree_default, tree_detailed, tree_fat, tree_cone, tree-high-round, tree,
  plant_bushLarge, plant_bushDetailed, plant_bush, hedge, flower_redA, flower_yellowA, flower_purpleA, grass_large,
  grass, lily_large, lantern, cart, stall-red, stall-green, stall-bench, banner-red, banner-green, windmill, canoe.
  A missing model loads as `null` (`.catch(() => [n, null])`), so the render does not crash, the prop just vanishes.
  (My inference: these names match Kenney's "Nature Kit" plus "Fantasy Town Kit".)

### 1.2 Folder layout the skill assumes

```
~/.claude/skills/cartoon-3d-short/        <- this repo (SKILL.md, references/, templates/)
<your Remotion project>/                  <- NOT in the repo; an older unrelated project folder
  src/index.ts                            <- main entry (registerRoot) - passed to `remotion render`
  src/Root.tsx                            <- register compositions; add a new one next to BridgeShort
  src/videos/bridge/                      <- = templates/bridge/* (13 files)
  src/videos/<name>/                      <- copy of templates/bridge for a new short
  src/videos/<name>_{cam,world,mat,char,post}/   <- look-pass sandboxes (copies)
  src/sandboxes/<n>/index.tsx             <- one entry per sandbox (templates/sandbox_index_example.tsx)
  scripts/                                <- = templates/scripts/* (SKILL.md calls them as scripts/...)
  public/bridge/kenney/*.glb              <- Kenney props; public/ was ~1.3 GB in total
  out/<name>/                             <- stills (x_<frame>.jpg), video.mp4, qa/, per-sandbox REPORT.md
  out/bridge/shots.json                   <- written by bridge_shots.py (hard-coded path)
  backup/bridge_<YYYYmmdd_HHMMSS>/        <- written by bridge_merge.py
~/bridge-short/                           <- story/voice/sound folder (an older unrelated project folder
  SCRIPT.md                               <- facts + sources at the top, then the script
  voice/voice.wav, voice/words.json       <- narration + hand-fixed word timings
  audio/ timeline.py sfx_gen.py sfx.py music.py instruments.py dsp.py mix.py  (= templates/audio/*)
       -> mix.wav (48 kHz, 24-bit stereo, exact length), stem_voice/music/sfx.wav, cues.md
```

### 1.3 The pipeline (SKILL.md:29-80, 11 steps)

1. **Topic and facts** (SKILL.md:30-31). One surprising, true story with a *physical* cause and effect (so it can be
   shown), plus one everyday analogy that explains it. Write the facts with their source at the top of `SCRIPT.md`.
2. **Script** (SKILL.md:32-41). Target ~3.7 words/s, 55-70 s. Beat formula: Hook (absurd fact, one line) → Setting
   (year, place, pride) → Action (3-4 escalating beats) → Snap (it breaks) → Deadpan double line ("Luckily ... /
   Unluckily ...") → Explanation (one physics idea via an everyday analogy) → Consequence (the rule it created) →
   Callback twist (the ending). Never describe on screen what the viewer already sees.
3. **Voice** (SKILL.md:42-44). Record or generate `voice.wav`; make `words.json` (any speech-to-text with word times);
   put both in e.g. `~/bridge-short/voice/`; **hand-fix the word timings** — everything is timed to `words.json`.
4. **Shot plan in `story.ts`** (SKILL.md:45-53). Copy `templates/bridge/` to `src/videos/<name>/`, register a new
   composition next to `BridgeShort` in `src/Root.tsx`, rename it. Tables to fill:
   - `SHOTS`: `{ id, a, b, light: "day"|"golden", crowd, tau }` — a/b = first frame / end frame (exclusive), `tau` maps
     film time t (s) to story time (s). Bridge example: `{ id: 1, a: 0, b: 130, light: "day", crowd: "march", tau: (t) => 29.5 + t }`
     (story.ts:47; the hook shows a flash-forward to just before the snap at story time 34.62 s).
   - `XFADE`: crossfade length in frames at place/time changes, keyed by the *incoming* shot id; centred on the shot's
     `a` frame (story.ts:64, 69-75). Bridge: `{ 9: 6, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8 }`.
   - `FLASH_AT`: frame of the white flash after the hook (bridge: 130; 4 frames long).
   - `CAMS`: per-shot key list `{ f, dur?, cut?, s: f => { pos, look, fov, roll } }` (default glide `dur` 24).
   - `KICKS`: impact flip-shakes `[timeSeconds, gain]`.
   - `DOF` / `dofAt`: lens blur per beat. `FOREGROUND`: near framing props.
   - Rule: **every visual reaction lands 0-3 frames before its word.**
5. **World** (SKILL.md:54-59): `lights.ts` (LIGHTS + LOOK sky/river/cloud palette per light), `shade.ts` (two-tone
   shading, `untone()`), `build.ts` (town, houses, recoloured Kenney props, sight-line culling of anything blocking a
   camera), `paint.ts` (HD Canvas2D painted textures, seams painted as dark tints), `world.ts` (sky shader, fog = horizon
   colour, river, per-frame posing, sun frozen per shot and camera-relative).
6. **Characters** (SKILL.md:60-63): `toon.ts` (Canvas2D `Pen` API, 600x1000 design canvas, soles at y = 975, bean heads,
   stick limbs, plum variable-width outline, face library), `cast.ts` (camera-facing billboards, crowds, effect cards,
   blinks, walk cycles; all billboards on the `NOINK` layer), `cardshade.ts` (cards lit by the scene light, no emissive).
7. **Post** (SKILL.md:64-66): composer order **ink → lens pre → lens main → bloom → NEUTRAL tone map → grade**, MSAA 4.
   Every pixel-sized parameter scales with output height / 1920.
8. **Sound** (SKILL.md:67-70): event table → synthesized SFX + an original score ducked under the voice → `mix.wav`
   (48 kHz, exact length), stems, `cues.md`. **Lock the picture's time constants before making sound**; any later timing
   change means re-running the sound.
9. **Look checks** (SKILL.md:71-74):
   - `node scripts/bridge-stills.mjs out/<name>/x_ 100,400 0.5` (frames 100 and 400 at half scale).
   - `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx` renders a sandbox copy instead.
   - `python scripts/sbs_sheet.py out.jpg --ours ... --ref ...` for side-by-sides against reference frames.
   - Send 1-3 images to an "Opus max" verifier agent, ask for a ≤ 200-word verdict.
10. **Final render** (SKILL.md:75-79):
    - `npx remotion render src/index.ts <Comp> out/<name>/video.mp4 --codec h264 --crf 16 --scale 1.3333`
      (→ 1440x2560, "2K vertical").
    - Mux the real audio with `-map 0:v:0 -map 1:a:0` because Remotion writes a silent audio track. A full command
      (my reconstruction; only the `-map` part is in the skill):
      `ffmpeg -i out/<name>/video.mp4 -i ~/bridge-short/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest final.mp4`
    - QA: `python scripts/short_qa.py final.mp4 out/<name>/qa shots.json` (shots.json from `bridge_shots.py`).
    - Fix what it finds, then a "deep Opus audit".
11. **Deliver** (SKILL.md:80): `SendUserFile` the final mp4, update memory, write notes.

Timing facts: 2K renders run ~4 fps (~10 min for 67 s); stills at 0.5 take 3-8 s each after a ~40 s bundle
(SKILL.md:153). Final file with grain off ~250 MB (SKILL.md:154).

### 1.4 The look-match loop (SKILL.md:130-141) — how the bridge look was reached

1. **Measure the reference first.** One analysis agent per topic (motion, depth, textures, characters, lighting,
   outlines, grade); each writes *numbers, not adjectives* to `references/reports/<topic>.md`. Shared brief =
   CONTEXT.md. The reports become the source of truth.
2. **Sandboxes, one owner per file.** Copy the project folder to `src/videos/<name>_{cam,world,mat,char,post}`, each with
   an entry `src/sandboxes/<n>/index.tsx` (same as main, only the import path changed). Ownership:

   | Owner | Files | Scope |
   |---|---|---|
   | cam | story.ts | camera keys, cuts, kicks, DOF table, foreground props |
   | world | world.ts, lights.ts, shade.ts, grade.ts | sun, sky, fog, river, colour, grade |
   | mat | paint.ts, build.ts | painted textures, buildings, props |
   | char | toon.ts, cast.ts, cardshade.ts | character drawing, posing, card lighting, fx cards |
   | post | ink.ts, Bridge.tsx, lensblur.ts | outline pass, composer, lens blur, bloom |

   Agents edit only their files in their sandbox and render with
   `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx node scripts/bridge-stills.mjs out/<name>/<n>/x_ <frames> 0.5`.
3. **Merge**: `python scripts/bridge_merge.py [cam,world,mat,char,post]` (backs main up to `backup/bridge_<time>/`,
   copies owned files only) → `npx tsc --noEmit` (filter output to the project folder) → **re-sync every sandbox from
   main**: `cp -f src/videos/<name>/* src/videos/<name>_<n>/`.
4. **Verify** with a *fresh* Opus max agent: sheets via `sbs_sheet.py`; score each area /10 (colour day, colour golden,
   lighting, ink, textures, characters, depth, composition) + a numbered fix list with frame numbers. Map each fix to its
   file owner and resume that owner agent with `SendMessage` (keeps its context).
   Scores: round 1 = 5/3/4/5/4/7/4/6, round 2 = 5/4/5/6/4/7/6/6, end (after 4 rounds, SKILL.md:84-85) = colour day 7,
   golden 5-6, lighting 5-6, ink 6, textures 5-6, characters 7, depth 6-7, composition 6-7.
5. **Contracts** between owners are exported constants: `NOINK` (ink.ts, value 3 at ink.ts:29), `dofAt` / `FOREGROUND`
   (story.ts), `LIGHTS` / `LOOK` (lights.ts). Changing one means telling every owner who reads it.

---

## 2. Every rule in SKILL.md, classified

### 2A. Reference-material rules (ethics/legal; keep for any use)
- The reference videos are private study material: never upload, publish or send them (SKILL.md:13-14; CONTEXT.md:12).
- Never copy their scripts, characters or shots; story, characters and voice are always our own (SKILL.md:15;
  README.md:30; CONTEXT.md:9-10 "derive general rules and numbers, never trace or copy").
- Never say the channel's name in a voice-over or description (SKILL.md:16). (The repo scrubs the name everywhere to
  "the reference channel".)
- README.md:33: reference frames are included "for style study only".

### 2B. The ORIGINAL AUTHOR's personal rules (SKILL.md:18-27, labelled "User rules") — choices, not craft laws
| Rule | Comment |
|---|---|
| No captions or labels in the video | The reference HAS one-word burned-in captions (STYLE_BIBLE.md:9). This is the author's taste. STYLE_BIBLE.md:10: "no captions unless the user asks". Our channel may decide differently. |
| English only | taste |
| Voice: one steady tone | matches the reference (one fast, steady male narrator) |
| Jokes are researched real facts | taste, but good practice |
| Standard mix: music +3 dB, SFX −6 dB, voice unchanged | a relative trim on the author's mixer output, not an absolute level |
| Final export 2K vertical 1440x2560 (`--scale 1.3333`) | taste (reference is 1080x1920 / 720p) |
| "Opus max verifies every check" | depends on the author's Claude setup |
| Save after every step | workflow habit |
| "Just do it" once the script is approved | i.e. no more questions after script approval |

### 2C. Universal craft rules (from the measurements; keep these)
- Script beat formula + "never describe on screen what the viewer already sees" (SKILL.md:32-41).
- Everything timed to hand-fixed `words.json`; reactions land 0-3 f before the word (SKILL.md:44, 53).
- Lock picture timing before sound (SKILL.md:70).
- Pixel parameters scale with output height / 1920 (SKILL.md:66).
- Ink must be its own pass before blur (SKILL.md:146).
- Camera grammar, ink, colour, depth, character targets (sections 2D/2E below).
- The readability traps (2G).

### 2D. Final look values in the shipped template (SKILL.md:82-104)
- **Light presets** (`lights.ts`; sun camera-relative, frozen per shot):
  - day: sun az 75° / el 48°, lit `[1.58,1.5,1.33]`, shade `[.30,.29,.36]`, lift `[.05,.06,.11]` (cool tint only in
    shade); sky top `#3e7fd2` → horizon `#b8d0ec`; fog = horizon colour, 25 → 300 m; `uSat` 1.08; ~15 % blue haze past
    60 m. (Confirmed lights.ts:17-21: `top "#3e7fd2", hor "#b8d0ec", fog "#b8d0ec", fogNear 25, fogFar 300`.)
  - golden: az 6° / el 7° (low backlit sun), key toward `#FFB36B` ×1.5, violet-blue shade (facade ≈ `#444380`), sky
    `#ffc47c` → `#8a6f8a`, peach fog only past 50 m, sun disc `#ffcf9e` + bloom, contact blobs + real card shadows.
    (lights.ts:26-30 actually has `top "#6a4f8c", hor "#ffd08a", fog "#efb489", fogNear 50, fogFar 380` — see Bugs.)
  - az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right) (lights.ts:2).
- **Albedos** (`paint.ts`/`build.ts`): muted brick / cream / ochre / terracotta houses with plinth, cornice, sills,
  hoods, door step, chimney + pot; house heights 7 / 8.4 / 9.8 m; warm grey/beige stone (saturation −35 % from
  "storybook"); ochre wood deck C* ~51-58 with near-black seams; iron dark and desaturated. Never lemon, never lavender
  lit faces.
- **Ink** (`ink.ts`): colour `#030303`; width 5.1 px near (6 m) → 3.3 px far (90 m) at 1080x1920; creases ×0.8 from 35°;
  depth jumps from 1 %; fog tint 0.3 only far; character cards on layer `NOINK` (they carry their own plum ink).
- **Lens** (`lensblur.ts` + `dofAt`): cInf (blur-circle size at infinity, px at 1080 wide): hook/river close-up 15-16,
  close-ups 12-14, medium shots 10-12, park 7, golden sway 5, wides/aerials 0. Focus on the eyes of the front row.
- **Post** (`Bridge.tsx`): ink → lens pre → lens main → bloom (threshold 1.0, intensity .5, 6 levels, radius .6) →
  NEUTRAL tone map → grade; MSAA 4. Film grain exists but is OFF. (Confirmed Bridge.tsx:33:
  `BloomEffect({ blendFunction: ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 })`,
  Bridge.tsx:65 `<EffectComposer multisampling={4}>`.)
- **Characters**: bean heads h/w .94, plum ink `#241726`, eyes .26 W apart, no blush, 14 expressions; adults 3.5
  head-heights; walk bob 5 %, lean 1-7°, planted 0.8 m stride; blinks every 0.5-2.3 s; tight contact shadow ~.5 under the
  feet + a sun-direction tail by day; golden rim = inner only (never an offset outer copy).
- **Camera** (`story.ts`): cuts on big jumps; smootherstep glides 18-40 f; every hold creeps (no static hold ≥ 4 f);
  flip kicks decaying over 7 f on impacts; 4-4.6° rolls; foreground props in ~1/3 of shots.

### 2E. Look targets measured from the reference (SKILL.md:106-128)
- Ink: world lines ~3 px at 1080 wide, near-black `#0b0a0c`, nearly constant with distance; only silhouettes, depth
  jumps and normal creases; no line on wall/floor joins or the horizon; character cards never outlined by world ink.
  Character ink dark plum `#201628`-`#2f1d28`, thicker on the bottom/shadow side.
- Colour: day median luma ~.57; non-ink p5 ~.23 (no crushed blacks); lit chroma C* p90 ~55; day sky top ~`#5e93d9`,
  horizon 1.28x brighter. Golden: peach horizon `#ffd08a`, violet-blue shadows (never brown), backlit sun.
- Depth: DOF on ~1/3 of screen time (close-ups, medium shots, inserts), cInf 10-16 px at 1080, focus on the eyes;
  establishing/wide shots sharp. Fog = horizon colour, 25 → 420 m day, 20 → 360 m golden. Bloom only on HDR emissives,
  threshold 1.0.
- Camera: hard cuts on big jumps; everything else a smootherstep glide of 18-40 f, peak ≤ 25 px/f at 720p; every hold
  pushes in 0.15-0.35 %/f, 0.6 %/f on punch words; rolls 4-5°; no hand-held float; impact shakes flip sign every frame
  and decay over 7 f.
- Characters: ~3.5 head-heights tall, legs 1.4 HH; stick limbs ~0.055 of head width, ink-dot hands; bean head h/w ~0.93
  (narrower chin, pointier crown); no blush or eye highlights; faces at brightness ~.93; walk bob 3-7 %, lean 1-7°,
  planted feet; blinks every 0.5-2.3 s, 4 f long.

(Jargon: *luma* = brightness of the encoded pixel, 0 black to 1 white; *p5* = the value 5 % of pixels are below;
*C\** = Lab chroma, how colourful; *cInf* = blur size of things at infinite distance; *smootherstep* = an S-shaped
ease that starts and ends with zero speed and zero acceleration.)

### 2F. Gotchas (SKILL.md:143-154)
- Kenney nature-kit materials are teal: recolour by material name in build.ts.
- Cameras end up inside houses: the sight-line culler in build.ts/world.ts removes anything blocking any camera ray.
- Ink in the same merged effect pass as DOF gets overwritten → ink must be its own pass before blur.
- Pixel post params must scale: stills at 0.5, final at 1.333. **R3F clamps dpr to ≥ 1**, so `--scale 0.5` stills still
  render a 1080x1920 buffer.
- **Disk**: every Remotion bundle copies `public/` (~1.3 GB) into the temp folder (`remotion-webpack-bundle-*`) and
  never deletes it; 60+ GB filled the system drive, a render died with ENOSPC. Always render with
  `export TEMP='<big drive>/remotion-tmp' TMP='<big drive>/remotion-tmp'`. Ask the user before deleting old bundle
  folders. That folder also fills (~500 folders / 110 GB after 4 rounds): when a project is done and nothing renders,
  delete its `remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*` folders.
- In JS strings write `"<big drive>/remotion-tmp"`, never a backslash path (`\r` becomes a carriage return).
- Remotion writes a silent audio track → mux with `-map 0:v:0 -map 1:a:0`.
- Sub-agents can't write report files in that harness → ask for a ≤ 150-word final message, save it yourself to
  `out/<name>/<n>/REPORT.md`.
- Scratch `.ts` files inside `out/` break `tsc` → name them `.txt`.
- 2K renders ~4 fps; stills 3-8 s each after ~40 s bundling.
- Film grain at 2.5 % made the 2K file 910 MB instead of ~250 MB and turns to mush on YouTube; keep it off.

### 2G. Readability traps the verifier caught (SKILL.md:156-166) — check every new prop/shot
- One swing rope disappearing behind a kid reads as a HANGING → always two ropes to a wide plank, kid between them
  (`swingKid` in toon.ts), A-frame legs clear of the arc.
- Props/flotsam closer than ~2 m to the lens become huge cut-off blobs; re-check props whenever a camera moves.
- A foreground bush cut by the frame edge reads as a "green ball": a foreground prop must be recognisable or gone.
- Flags: red + yellow star/diamond reads as Vietnam's; use a period-correct flag (St George's cross for England 1831).
- Painted signs lit by a side sun go grey-blue and unreadable → unlit material on sign faces.
- Golden rim light as an offset outer copy turns hats into picture frames → inner rim only, head/torso only.
- Railings at chest height through characters → lens ~2.5 m up so rails cross legs, not torsos.
- Flat holds read as freezes in QA (frozen span ≥ 12 f) → every hold needs a creeping push-in.

---

## 3. STYLE_BIBLE.md (study of the latest 20 shorts, dated 2026-10-30)

Private inputs named (not in repo): `vids/` (720p, original English audio), `tx/` (transcripts),
`measure/summary.json`, `measure/<video>_sheets/` (30 fps sheets, each 2 s = 60 frames).

- **Format**: vertical 1080x1920 (published), 30 fps, 31-78 s (median ~60 s). Voice starts at frame 1-4: no intro,
  no logo, no outro, no call to action.
- **Voice**: one male narrator, fast and steady, 3.5-4.1 words/s (median 3.7); almost no pauses (word gaps > 0.25 s
  total < 1 s per video).
- **Loudness**: −14 LUFS integrated (LUFS = standard loudness unit), LRA ~2.4 LU (LRA = loudness range; 2.4 is very
  compressed). Music/SFX bed only ~5-10 dB below speech.
- **Captions** (reference): one word (sometimes 2-3) at a time, white bold sans, thin black outline, lower-middle, hard
  swap per word. OUR RULE: no captions unless the user asks.
- **Script formula (20/20 follow it)**:
  1. Hook = paradox stated as fact, sentence 1, no setup ("a person did something dumb/impossible with stakes", "If you X,
     you'd Y", "X is illegal, yet ..."), ~10-16 words.
  2. Setting in 1-2 lines, present tense, concrete details (time of day, a named everyman, numbers).
  3. Escalation 3-6 beats: others laugh/doubt/mock (short in-character dialogue lines), stakes climb; 1-2 exaggeration
     jokes per video ("so slow X, and X was ...").
  4. Mystery beat: a question or "Wait, ...?" (~1 per video).
  5. Pivot word **"You see,"** (14 of 20 videos) → the real mechanism, often via an everyday analogy ("Ever ...?",
     "think about the last time ...", "picture your body as ...").
  6. Ironic payoff in the last 1-2 sentences; video ends on the last word.
  - Two modes: story mode (third person "he", named everyman, present tense) and "Imagine you're..." second person.
  - Sentences ~13.5 words median, plain spoken English, contractions, jargon only if explained in the next clause.
- **Picture**: 2D flat cartoon characters (simple outlined faces, thin black outline, flat colours) in 3D toon worlds
  with hand-painted textures, saturated colour, thin black ink outlines on 3D geometry (edges + creases), soft DOF on
  backgrounds, warm key + blue/purple shadows, window light pools that also tint characters. Characters receive scene
  light/shadow (lit, not emissive) and cast ground shadows. Colour stats (per-video medians): luminance mean 0.43-0.54,
  std 0.21-0.29, p2 0.03-0.11, p98 0.9-1.0, saturation 0.38-0.65. Lighting changes with story beats (noon → sunset →
  night-blue for the explanation). Every sentence illustrated literally; props carry the joke.
- **Camera/editing (first, coarse measure — partly overturned by motion.md)**: hard cuts almost never (0-1 per video in
  12/20; most detected "cuts" are 4-frame flash effects); camera "holds ~80 % of frames"; moves are "ease-out bursts"
  peaking on frame 1 and decaying over ~8-10 f (720p px/f e.g. 6, 26, 12, 14, 6, 5, 2, 1). Transitions are continuous
  camera moves: follow an object (bullet, oil stream, ball), whip pans with motion blur, fly-through (window/porthole), or
  a 6-8 frame crossfade when changing place. Slow push-ins during holds; low camera heights; frequent dutch tilts.
- **Effects**: muzzle fire, glow/aura bursts, impact sparkles, splash sprites, speed lines, dust puffs, music notes,
  stars, light shafts — all flat 2D sprites composited into the 3D scene.

---

## 4. The script template (`templates/SCRIPT_example.md`)

Header: title, "original script v1 (2026-10-30)", format note "~55 s, ~3.7 words/s". Facts block with source
(Wikipedia, Broughton Suspension Bridge): Salford, 12 April 1831; 74 men of the 60th Rifle Corps marching four abreast;
felt the vibration, found it amusing, whistled and stepped to it; a badly forged single bolt in a stay-chain snapped; one
end fell 16-18 ft into the River Irwell (~2 ft deep); nobody killed, 20 injured; Army ordered troops to "break step".

Beat mapping (my analysis, line numbers of SCRIPT_example.md):

| Beat | Line | Text (start) | Words |
|---|---|---|---|
| Hook | 8 | "Seventy-four soldiers knocked down an iron bridge..." | 12 |
| Setting | 9 | "It's 1831, and the brand new bridge..." | 17 |
| Action 1-5 | 10-14 | marching four across / starts bouncing / "a normal person would slow down" / whistling / bounce gets bigger | 17, 9, 12, 19, 18 |
| Snap | 15 | "Then a single bolt snaps..." | 16 |
| Deadpan double | 16-17 | "Luckily, the river was only two feet deep." / "Unluckily, ..." (identical second half) | 8, 8 |
| Explanation (pivot "You see,") | 18-20 | rhythm a bridge likes; "Ever pushed a kid on a swing?"; men pushing the bridge like a swing | 13, 27, 11 |
| Consequence | 21 | "Nobody died, but the army made a rule: never cross a bridge in step." | 14 |
| Callback twist | 22 | "...cross every bridge like a crowd of tourists." | 17 |

Totals: 15 lines, **218 words**, median sentence 14 words (reference 13.5). At 3.7 w/s that is ~59 s; the finished
short is 67.5 s (2025 f), i.e. ~3.2 w/s overall, so the voice was slower than the target or had a tail.
`cues.md` confirms `mix.wav` = 3,240,000 samples = 67.500 s at 48 kHz.

Shot list from story.ts:47-61 (frames) + CONTEXT.md:24-25 (content):

| Shot | Frames | Light | Crowd | Content |
|---|---|---|---|---|
| 1 | 0-129 | day | march | hook, flash-forward (tau = 29.5 + t) |
| 2 | 130-282 | day | march | (towns) white flash at 130 |
| 3-7 | 283-986 | day | march | soldiers on the plank suspension bridge |
| 8 | 987-1133 | day | fall | bolt snaps, deck drops (SNAP 34.62 s, DROP0 36.35, DROP1 36.95) |
| 9-10 | 1134-1302 | day | water | soldiers sitting in the river (xfade 6 into 9) |
| 11-13 | 1303-1734 | golden | none/none/march | golden hour: bridge, park swing, side view (13: tau = t − 31) |
| 14 | 1735-1862 | day | bank | bank + officer hammering a sign |
| 15 | 1863-2024 | day | tourists | tourists strolling (towns), crane pull-out ending |

---

## 5. CONTEXT.md — how the reference was measured

- Goal statement: our 67 s short "looks flat, pastel and cheap" next to the reference; target quality and style:
  colourful, high contrast, "targeted" colours, black ink on the 3D world, painted textures, real shading on characters
  and world, deep blurred backgrounds, lively movement, better character shapes (heads not perfect circles).
- Reference material (private, not in the repo): 20 shorts at **720x1280, 30 fps**, files `references/vids/NN_<id>.mp4`
  (**01 = newest**). The only id that leaks is `01_Mz72MuPgnGY` (an 11-character YouTube video id, CONTEXT.md:16).
  Contact sheets `references/measure/NN_<id>_sheets/sNN.jpg` (each 2 s = 60 frames). Overview `references/refs_sheet.jpg`.
- Frame extraction: `ffmpeg -v error -ss 12.4 -i references/vids/01_Mz72MuPgnGY.mp4 -frames:v 1 out.png` (PNG for
  measuring, JPEG for viewing), crop/zoom with PIL nearest-neighbour for line widths.
- **Caption masking**: captions sit at roughly 60-74 % of frame height; mask that band before any statistic and do not
  mistake caption outlines for scene ink. (grade.md: at 540x960 caption text is rows 662-694 in 99.5 % of frames; rows
  650-706 removed. motion.md: camera tiles use bands 3-29 %, 29-56 %, 80-97 % of height.)
- Our state before the pass: stills in `<Remotion project>/out/bridge/test/` (`b_*.jpg`, `c_*.jpg`, 540x960, frame number
  in the name), sheets `sheet_c1.jpg`, `sheet_c2.jpg`. Old pipeline: emissive ≈ 0.36 cards (pasted-on look),
  alphaTest 0.5; ink = screen-space Laplacian of 1/viewZ only, threshold 0.06 (almost no lines); composer Ink → DOF →
  Bloom(0.3, threshold 0.86) → NEUTRAL, MSAA 4; Fog(90, 560); 4096 shadow map; heads perfect circles, thick uniform
  outline.
- Agent rules: don't render new stills, don't edit the Remotion project, don't pip-install, don't download tools.
- Deliverable per agent: work in `references/<topic>/`; report with measured tables over MANY frames from the 20 videos
  and the same measures on our stills, gap stated plainly, comparison-crop paths, an implementation recipe (exact values,
  hex, GLSL/TS, which file/function), top 5 changes by visual impact; final message ≤ 200 words + report path.

### 5.1 The 20 reference shorts — what can be mapped

No titles exist anywhere in the repo. Durations come from grade.md's per-video sample counts (every 15th frame = 0.5 s
each). Label counts D = day exterior, G = golden/sunset, N = night, I = interior, X = excluded (graphics, documents,
flashes, body interior, scope). Content = my reading of frames `shortNN_0060/0180.jpg` (caption word at that moment in
quotes) plus the subjects other reports name. Treat content as visual guesses.

| # | ≈ length | D/G/N/I/X | What it shows (frames 2 s / 6 s) | Named in reports |
|---|---|---|---|---|
| 01 (newest, id Mz72MuPgnGY) | 65 s | 54/0/56/19/1 | sailing/pirate ship, captain "steer"; night, sailor climbing rigging "And up" | sea/hull textures; v01 arm action |
| 02 | 64.5 s | 64/11/0/50/4 | brass spyglass over green fields "Well,"; card/casino table, dealer in green visor "The guy" | |
| 03 | 65.5 s | 69/5/20/5/32 | kid in beanie + glasses, huge ladder/track "it is"; night plaza, red button under glass dome "the" | kid walk ~12 f/step; crane pull-back; crowd still at 51 s |
| 04 | 56.5 s | 63/11/10/26/3 | Wild-West street, cowboy "After you."; cowboy at table with phone "off" | cowboy walk (main walk data) |
| 05 | 78 s | 22/0/90/33/11 | night storefront, bike crash "a bike."; bedtime with photo "bedtime" | lake sunset, dock edge |
| 06 | 63.5 s | 0/0/0/87/40 | lottery scratch card graphic ("Vault Buster"), number tickets "once." | blinks 6 in 4 s |
| 07 | 59.5 s | 12/31/46/23/7 | snowy night village with bell "The guy"; man in suit at window "He owed money" | vertical whip f58-90; snow mound |
| 08 | 58 s | 0/4/12/89/11 | close-up face in vignette "can,"; lottery shop "OUR WINNERS" "from the store." | snap zoom; cashier mouth |
| 09 | 60.5 s | 0/0/6/112/3 | office, two men at a desk "he's on"; night office towers "if they want" | whip f1334-1343 |
| 10 | 58.5 s | 12/0/24/73/8 | kitchen + wall phone, man in glasses "he's"; night couch "this." | officer (mouth, jump, turn, police cap) |
| 11 | 65 s | 14/30/26/60/0 | frog in a temple/vault with golden idol "open"; barred prison window at night "screaming" | |
| 12 | 63.5 s | 78/33/0/5/11 | ship deck, officer with "SHOT" crate "afford"; "CARCASS keep from flame" crate "the pirates" | rock arch, teal sea, blue soldier |
| 13 | 41 s | 63/4/3/0/12 | medieval village "Pardons" shop with queue "for hours"; "Pardon One Crime Next Week" notice | carriers walk ~9 f/step; whip f175-183; harbour |
| 14 | 45 s | 51/3/6/30/0 | two kingdoms at war 100 years; blacksmith's spear that pierces anything vs shield nothing pierces (whole sheet) | spear impact kick; soldiers formations; field |
| 15 | 34.5 s | 0/0/0/12/57 | "BRAIN NOT INCLUDED", body-interior/brain graphics "brain" | receding arches |
| 16 | 45.5 s | 0/0/53/38/0 | Japanese pachinko "PRIZE HALL", police officer "gets"; "prizes." | turns (front/back swaps) |
| 17 | 31 s | 0/0/0/38/24 | slot machine, SPIN button, cash "hundred," | |
| 18 | 40 s | 40/6/0/21/13 | "Crash Survivors Tuesday 7PM" support group "everything"; aerial city "in slow" | |
| 19 | 47.5 s | 10/24/0/54/7 | tall building with floor numbers "floors."; man at a desk "he avoided" | blinks 7 in 4 s |
| 20 | 39.5 s | 0/0/0/60/19 | brain in a glass jar under a bulb "part."; man on a stool holding a sign "balls." | sitter/sleeper idle (head loll) |

Totals: 2164 sampled frames = 552 D / 162 G / 352 N / 835 I / 263 X (matches grade.md). Range 31-78 s matches
STYLE_BIBLE. The motion study used all 32,337 frames (~18 min). Topics lean on money/gambling/lottery, law/crime
loopholes, history/war, body/brain science.

---

## 6. motion.md — every measured number

Units: px at **720x1280** (×1.5 for 1080x1920); f = frame at 30 fps. Reference: 20 shorts, 32,337 frames, caption band
excluded. Ours measured from the code (not rendered) with the same maths (`ourcam.py` runs a private copy of CAMS +
`run()` + `camAt()` through node).

### 6.1 Verdict (motion.md:9-25)
1. Our moves were 3-frame snaps (median peak 115 px/f, up to 488, 3 f attack); the reference glides symmetrically:
   ~10 f in, ~10 f out, ~23 f total, median peak 14-16 px/f. **STYLE_BIBLE's "ease-out burst" was wrong** — it came from
   an integer phase correlation blind to motion below ~4 px/f.
2. The reference camera is almost never still: 65 % of frames move; quiet frames still push in (0.14 %/f median); no
   hand-held float; impacts are 6-7 f kicks that flip sign every frame.
3. Characters animated **on ones** (a new drawing every frame), no line boil, no squash/stretch, no smears, no idle loops;
   acting beats land 0-3 f before the word.
4. Walks: bob 3-7 % of height (ours 1.7 %), lean 1° → 7° every step, a step = 9-12 f (ours 15 f, tourists 20-38 f),
   stance foot sticks (ours skated 13-60 % in side views).
5. Blinks every 0.5-2.3 s, 4 frames (half / shut / shut / half), plus one on every expression swap (ours every 4 s, only
   open/shut).

### 6.2 Method (motion.md:27-46) — scripts in `references/motion/scripts/` (not in repo)
- Camera (`cam2.py`, `camstats.py`, `camshape.py`): each frame fitted to the previous by a robust 9-tile sub-pixel
  phase-correlation similarity fit (translation, zoom, roll) at 360x640; tile bands 3-29 %, 29-56 %, 80-97 % of height;
  outlier tiles rejected; path integrated and smoothed with a Gaussian σ = 1.2 f. Speed = translation combined with
  zoom × 734 px (frame-corner radius). Classes: hold < 0.3 px/f, drift < 2, move ≥ 2. Bursts = local peaks ≥ 6 px/f;
  attack/release measured to 10 % of peak.
- Ours (`ours/dump.mjs`, `ourcam.py`): `camAt()` projected through a 5x5 point grid on the subject plane.
- Characters: 2-4 s contact sheets; NCC template tracking (`track.py`) compensated with background patches (`idle.py`,
  `walkstat.py`); frame-diff hold detection (`uniq.py`); eye-strip dark-pixel counts (`blink.py`); mouth blob area vs voice
  RMS at lags −4..+4 f (`mouth.py`).

### 6.3 Camera table, reference vs ours (motion.md:52-74)

| Measure | Reference median (range over 20) | Ours (before) |
|---|---|---|
| Hold (< 0.3 px/f) | 10 % (1-27 %) | 22 % |
| Drift (0.3-2 px/f) | 24 % (4-38 %) | 22 % |
| Move (≥ 2 px/f) | 65 % (34-94 %) | 55 % |
| Median speed | 3.6 px/f (1.3-12.9) | 2.9 |
| p90 speed | 16.9 px/f (9.7-29.4) | 28.1 |
| Moves per 10 s | 6.0 (2.9-8) | 2.2 |
| Move peak speed | 13.7 px/f (p25 5.9, p75 24.6, p90 36) | 115 (79-488) — 8x too fast |
| Attack (10 % → peak) | 10 f (p25 6, p75 18) | 3 f |
| Release (peak → 10 %) | 10 f (p25 6, p75 19) | 6 f |
| Attack/release ratio | 1.0; 62 % symmetric, 18 % ease-out, 20 % ease-in | 0.57 (quartic ease-out put 26-41 % of the move in frame 1) |
| Speed ±10 f from peak | 0.6 of peak (FWHM > 20 f) | 0.03-0.05 (FWHM ≈ 5 f) |
| Size of one move | 101 px, zoom 23 % | 331 px, zoom 46 % |
| Strong moves (peak ≥ 25) | attack 8 f, release 7 f; e.g. v14 f160-240: 1 → 38 px/f in 16 f, 12 f plateau, 13 f release | 3 f / 5-7 f |
| Zoom in quiet frames | active (≥ 0.05 %/f) in 70 % of frames, 83 % of those push IN; median 0.14 %/f, p75 0.34, p90 0.70 | active 55 %, 63 % in; median 0.06, p75 0.16 |
| Push-in runs (≥ 12 f) | 336 push-ins vs 180 pull-outs; median 35 f, +22 %, 0.61 %/f; slow ones (< 0.3 %/f): 25 f, +3.7 % | linear drift |
| Snap zoom / crane | v08 snap zoom 0.4 → 5.9 %/f (+38 % in 14 f); v03 crane pull-back up to −4.6 %/f, ~45 f accelerating, ~60 f slowing | 13 moves zooming up to 275 % or travelling 0.7-3.7 frame widths in 3-8 f |
| Roll moves | 3.2 per 10 s, median 3.6° over 18 f (p75 8.1°, p90 17.5°) | 3.0 per 10 s, ~2.5° over ~9 f (max 9.6°) |
| Hand-held float | none: high-frequency residual 0.08 px median (0.05-0.29) | 0.006 m sine (invisible) → delete |
| Impact shake | v14 spear: offset flips sign every frame (15 Hz), ~3 px (≈ 5 px/f), roll ±0.1-0.35°, gone in 6-8 f; push-in stops at the hit | 6.4 Hz sine, 15 f linear decay; bolt 28.7 px/f, deck→water 15.5, hammer 10.7 |
| Whip pans | 0.45 per minute (5 in 18 min); 45-93 px/f for 7-25 f, 2-3 f ramps, strong directional motion blur: v13 f175-183 (30 → 93 → 25), v07 f58-90 (~47 vertical), v09 f1334-1343 (peak 56) | none, but 13 un-blurred 79-488 px/f "fly" moves |
| Crowd beats | formations stand still while a crane/truck move supplies motion (v03 51 s, v14 0 s and 125 s) | marching column; townsfolk waving/hopping nonstop |

### 6.4 Our key moves and the fix (motion.md:76-108)
"Needed" = glide length keeping peak ≤ 25 px/f with smootherstep (**peak = 1.875 × distance / duration**, so keep
`dur ≥ 0.075 × distance` in 720p px). Rule: moves ≤ 360 px (half a frame width) and ≤ 40 % zoom → glide 18-40 f;
bigger → `cut: true` (delete keys that copy the previous shot's framing). Start each glide ~`dur/2` early so the fastest
frame lands where the snap was (judgment call).

| Key f | Shot | Move px | Zoom | Peak | Needed | Do |
|---|---|---|---|---|---|---|
| 48 | 1 | 129 | +64 % | 106 | 37 f | glide 37 |
| 88 | 1 | 338 | +34 % | 94 | 31 | glide 32 |
| 190 | 2 | 36 | +24 % | 37 | 13 | glide 18 |
| 246 | 2 | 97 | +26 % | 47 | 16 | glide 18 |
| 283 | 3 | 150 | +170 % | 164 | 94 | cut |
| 353 | 3 | 346 | +54 % | 112 | 40 | glide 40 |
| 444 | 4 | 1574 | −104 % | 373 | 120 | cut |
| 497 | 4 | 606 | +39 % | 80 | 50 | cut |
| 534 | 5 | 898 | −6 % | 203 | 68 | cut |
| 585 | 5 | 22 | +20 % | 35 | 11 | glide 18 |
| 643 | 6 | 486 | −39 % | 79 | 42 | cut |
| 717 | 6 | 317 | −126 % | 218 | 73 | cut |
| 768 | 6 | 254 | +38 % | 76 | 28 | glide 29 |
| 823 | 7 | 204 | −57 % | 84 | 35 | glide 35 (or cut) |
| 871 | 7 | 411 | +88 % | 159 | 58 | cut |
| 925 | 7 | 1437 | −1 % | 276 | 108 | cut |
| 987 | 8 | 2011 | −275 % | 427 | 160 | cut |
| 1039 | 8 | 2631 | +39 % | 488 | 198 | cut + kick on the snap |
| 1062 | 8 | 826 | −86 % | 230 | 78 | cut |
| 1099 | 8 | — | — | — | — | already a cut |
| 1217 | 10 | 57 | +24 % | 39 | 14 | glide 18 |
| 1560 | 12 | 49 | −35 % | 45 | 20 | glide 20 |
| 1685 | 13 | 1045 | +28 % | 115 | 80 | cut |
| 1770 | 14 | 1928 | +75 % | 392 | 150 | cut |
| 1905 | 15 | 15 | +46 % | 76 | 26 | glide 26 |
| 1962 | 15 | 164 | −153 % | 202 | 85 | crane pull-out from ~1935, 90 f to the end (peak ≈ 3 %/f) |

The shipped story.ts follows this: cut keys at f 497, 717, 871, 925, 1039, 1062, 1099, 1685, 1770, 1932
(story.ts:215-259).

### 6.5 Character animation table (motion.md:112-128)
- Drawing rate: on ones; static characters pixel-identical (mean abs diff 0.15 grey levels). Our tourists used
  `q(…, 24)` at 0.39-0.75 Hz = 1.7-3.2 f holds (on 2s/3s) → fix.
- Step time: 9-12 f/step (2.5-3.3 steps/s): v04 cowboy 10.6 f, v13 carriers ~9 f, v03 kid ~12 f. Ours: march 15 f
  (2 steps/s), tourists 20-38 f.
- Body bob p-p: 3-7 % of height, lowest at contact (cowboy 47 px on 617 px = 7.6 % = 0.32 head heights; carriers ~4 %;
  kid ~3 %). Ours: front march 14 u = 1.7 %, stroll 1.0 %; side 4.1 % at stomp 1.0 → 9.0 % at stomp 1.5.
- Lean: 1° at passing → 5-7° forward at contact, in phase with bob. Ours: side constant 3°, front none.
- Legs: thigh swings ±35-45°, knee rises until thigh nearly level at passing (high-knee strut). Ours: thigh
  30°×stomp + 16°×stomp×lift, knee 70°×stomp; front foot lift 60 u march / 27 u stroll. OK at stomp ≥ 1.35.
- Feet planted: stance foot ≤ 1.1 px/f while ground moves 7.2 px/f (v04 f649-651); soft blue-grey contact shadow.
  Ours skated 39 % (stomp 1.0), 20 % (1.35), 13 % (1.5), tourists ~60 %; legs 250 u = 0.54 m can't cover 0.8 m steps at
  1.6 m/s and 2 steps/s.
- Arms: noodle arms hang or hold props; not measurable. Ours front ±16 u (±4°), side ±90 u (±22°).
- Idle: none (frozen to 0.01-0.8 px over 32 f, v20 sitting); only acting idles, e.g. v20 sleeper head lolls 10-15° in
  8-10 f, holds ~20 f, returns. Ours: townsfolk wave 1.4 Hz, kid hops 1.1 Hz nonstop → too busy.
- Blinks: 3-4 f (half, shut ×1-2, half); gaps 0.2-2.3 s, typically 0.5-1.5 s (v19 7 blinks in 4 s, v06 6 in 4 s);
  blinks cover expression swaps. Ours: every 3.98 s, 4.3 f, open/shut.
- Mouths: change on ones (line, rect with teeth, open with tongue, wide), r ≈ 0.47 with voice RMS, mouth leads by 0-1 f
  (v10 officer). Ours: no talking characters.
- Reaction timing: change lands 0-3 f before word onset (v03 −1/−3, v10 0, v14 0); swaps instant (1 f). Ours ~2 f late.
- Anticipation/impact: jump 2-3 f crouch (v10); spear (v14) 3 f to lower, ~6 f held back, 1-frame thrust, impact flash
  + 4-5 f ring, contact on the word; no overshoot. Ours hammer: 6 f raise, 2 f hold, 3 f strike, 9 f burst.
- Line boil none; squash/stretch none; turns: real 3D bodies turn in 1-4 f (front→back ~2 f v16 759→761; back→front can
  be a 1-frame swap v16 801→802). Ours: billboards swap front↔side and mirror in 1 f when the camera crosses cos 0.57,
  even mid-glide → pops.

### 6.6 Recipe snippets (motion.md:154-390)
- `glide(u) = x³(x(6x − 15) + 10)` (smootherstep); `run()` blends key to key with `glide((f − k.f)/(k.dur ?? 24))`,
  `cut` keys jump (adopted at story.ts:97-105).
- `push(pos, look, f, f0, rate = 0.0025)`: dolly toward the look point, `k = (1 − rate)^(f − f0)`. Rates 0.0015-0.0035 on
  every hold; 0.006 for ~35 f on punch words ("pride of the whole town", "starts bouncing", the bolt line, "the best
  drilled soldiers"); push stops on impacts; emphasis rolls ±0.06-0.14 rad (3.6-8°) with dur ≥ 18; calm rolls
  ±0.02-0.06. (Shipped as `pushK(f, f0, rate, punch, n = 35)` returning `exp(−s)` with an 8-frame ramp in and out of the
  punch rate, story.ts:117-122.)
- `KICKS = [[SNAP,1],[DROP1,1.6],[59.79,0.5],[60.33,0.5],[61.69,0.7]]`; `kickAt`: for n = round((t − t0)·30) in
  0..6, `a += g·(n odd ? −1 : 1)·(1 − n/7)^1.5`. `camAt` shifts the look point sideways by
  `m = (3/640)·tan(fov/2)·L·a` metres (3 px at 720p per unit), up by 0.6·m, roll `+ a·0.004` rad (±0.23° per unit).
- March cadence: Option A `MARCH_HZ = 1.3` (2.6 steps/s = 11.5 f/step, skating within ±5 %); Option B keep 2 steps/s,
  stride ×1.25 at stomp ≥ 1.35 (slide ≤ 7 %), reframe shot 4 to 3/4 front. **Shipped: Option B** (story.ts:29
  `marchPhase` = 1 Hz cycle = 2 steps/s).
- `keyEnd(id, f)`: choose billboard front/side per key, not per frame.
- toon.ts: bob `20·cos(2·2π·phase)` march (5 %, 40 u p-p), `12·cos` stroll (3 %, 24 u), sit 170; side lean
  `4 + 3·cos(2·2π·phase)` march, `14·pose` push; `stride` option; half-lid eye drawing (lid 0.5).
- cast.ts: `LID = [0.5, 1, 1, 0.5]`; `lidAt` gaps `0.5 + 1.8·hh(...)` s; blink across swap times
  `SWAPS = {4: [16.17, 17.3], 5: [19.48, 20.6], 6: [21.9, 23.7], 7: [29.4, 30.6], 8: [SNAP]}`; `LEAD = 2/FPS`; tourist
  phase `q(((t − t0)·1.2 + hh(i,5)) % 1, 30)` (2.4 steps/s, 25 f cycle) with `stomp 0.82·sp`; extras gated by
  `CHEER = [[8.01 − LEAD, 9.45], [65.96 − LEAD, 67.5]]`; head `loll`: 12° in 9 f, hold 20 f, back in 9 f; `hammerK`: wind-up
  4 f (n −11..−7), held 7 f, hit at n ≥ 0, burst th..th + 5/FPS. (LID/lidAt adopted, cast.ts:173-175.)
- Whip blur (optional, ≤ 1 whip): a 12-tap directional blur Effect with `uniform vec2 vel` (camera screen motion
  f → f+1 in UV × 0.5 shutter).
- Top 5: (1) fly-snaps → cuts, rest → glides; (2) push in on every hold, rolls on emphasis; (3) walk mechanics; (4) blinks
  + 2 f reaction lead; (5) impact grammar (7 f flip kicks, held wind-up, 1-frame strike, 5 f burst, delete float).
  Next: frozen extras, stable billboard views, ≤ 1 blurred whip.
- Limits: ours computed not rendered; stride/slide approximate; walk data from few walkers; leg angles visual estimates.

---

## 7. grade.md — every measured number

### 7.1 Gap in plain words
Ours (day) vs reference: median Y' 0.436 vs 0.571; p99 0.783 vs 0.967 (no near-whites); non-ink p5 0.026 vs 0.234 (big
pure-black areas); lit C* p50 23 vs 34, p90 37 vs 55; vignette corner/centre 1.46 (corners brighter!) vs 0.86. Black
point ours (2,0,13) blue-black vs reference (35,19,20) warm-lifted. Golden: ours median 0.33 vs 0.52, HSV S p50 .71 vs .45
(orange soup), shadows brown (b* +11) vs violet (b* −6), missing the ~25 % share of violet/blue/magenta/rose.
A grade fixes tone curve, blacks, overall saturation, cast and vignette; it cannot fix pastel/dark albedo, brown/black
cast shadows, or missing hue families.

### 7.2 Method
- Reference: every 15th frame of all 20 videos = 2164 frames, decoded with
  `scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int` (default conversion was 1 level
  off), area-scaled to 540x960. Ours: 39 stills (28 day, 9 golden of shots 11-13, + dark bolt close-ups c_1000, c_1036).
- Y' = 0.2126 R' + 0.7152 G' + 0.0722 B' on sRGB-encoded values (luma, not linear luminance).
- Caption mask rows 650-706 (text at 662-694 in 99.5 % of frames); local contrast also drops ±5 rows.
- Ink mask: black top-hat (7x7 grey closing − Y' > 0.12) AND Y' < 0.30; "non-ink" drops ink dilated by 1 px.
- Metrics: Y' p1/5/25/50/75/95/99, mean, std; HSV S mean/p50/p90 over V > 0.15; Hasler-Süsstrunk colourfulness;
  local contrast = std(Y' − 9x9 box mean); saturation-weighted 12-bin hue histogram; Lab means per zone (shadows
  Y' < 0.3, mids, highlights Y' > 0.7); black point = mean RGB of darkest 0.5 %; vignette = mean Y' in 10 radius bins
  (r = 1 at corners), corner/centre (r ≥ 0.9 vs r < 0.3) and mid-row edge/centre; lit chroma C*ab p50/p90 over L* 40-85
  non-ink pixels.
- Clusters (manual labels from timeline strips, k-means as aid): D 552, G 162, N 352, I 835, X 263.

### 7.3 Main table (per-frame medians)

| metric | ref day | ref golden | ref night | ref interior | ref all | ours day | ours day +grade | ours golden | ours golden +grade |
|---|---|---|---|---|---|---|---|---|---|
| frames | 552 | 162 | 352 | 835 | 1901 | 28 | 28 | 9 | 9 |
| Y' p1 | .134 | .124 | .068 | .084 | .095 | .012 | .051 | .016 | .056 |
| Y' p5 | .205 | .180 | .087 | .121 | .137 | .026 | .071 | .072 | .138 |
| Y' p25 | .417 | .356 | .150 | .257 | .278 | .253 | .366 | .212 | .324 |
| Y' p50 | .571 | .516 | .243 | .448 | .449 | .436 | .577 | .329 | .467 |
| Y' p75 | .706 | .668 | .366 | .607 | .618 | .554 | .696 | .459 | .631 |
| Y' p95 | .895 | .828 | .669 | .870 | .857 | .746 | .844 | .688 | .778 |
| Y' p99 | .967 | .912 | .817 | .942 | .943 | .783 | .886 | .812 | .818 |
| Y' mean | .558 | .508 | .295 | .460 | .474 | .415 | .533 | .358 | .473 |
| Y' std | .202 | .182 | .176 | .221 | .205 | .213 | .228 | .195 | .197 |
| non-ink p5 | .234 | .211 | .088 | .129 | .151 | .026 | .071 | .090 | .166 |
| non-ink p50 | .583 | .526 | .244 | .459 | .463 | .451 | .599 | .329 | .467 |
| HSV S mean | .439 | .459 | .586 | .436 | .465 | .455 | .450 | .649 | .452 |
| HSV S p50 | .429 | .448 | .611 | .422 | .467 | .373 | .345 | .714 | .458 |
| HSV S p90 | .737 | .671 | .840 | .764 | .762 | .843 | .844 | .969 | .655 |
| colourfulness | 82.8 | 71.2 | 66.6 | 68.0 | 71.7 | 65.6 | 85.9 | 62.6 | 61.5 |
| C* lit p50 | 33.8 | 36.8 | 36.7 | 28.4 | 31.9 | 23.5 | 26.2 | 22.7 | 25.4 |
| C* lit p90 | 54.9 | 53.0 | 64.4 | 54.9 | 56.6 | 37.4 | 52.8 | 48.9 | 42.5 |
| local contrast | .072 | .051 | .048 | .066 | .062 | .063 | .072 | .035 | .042 |
| ink fraction | .026 | .019 | .018 | .025 | .023 | .048 | .048 | .015 | .015 |
| vignette corner/centre | .856 | .754 | .461 | .671 | .719 | 1.458 | 1.222 | 1.430 | 1.148 |
| vignette mid-edge/centre | .975 | .952 | .753 | .866 | .904 | 1.093 | 1.046 | .912 | .862 |

Zones (non-ink): shadow share day .17 / golden .20 / night .61 / interior .36; shadow a*/b* day +12.5/−2.5, golden
+19.1/−5.8, night +19.7/−33.1, interior +14.8/−2.5 (ours day +1.0/−3.2, golden +5.3/+11.4); shadow hue day 331° (rose),
golden 322°, night 239° (blue), interior 333°. Mids a*/b* day +4.0/+8.1, golden +19.4/+15.8, night +21.3/−32.4. Highlights
share day .28, golden .26; highlight a*/b* day −0.5/+6.2, golden +12.3/+23.3. Black point RGB: day 35,19,20; golden
48,16,22; night 9,10,38; interior 23,12,20 (ours 2,0,13 / 4,0,7). Darkest non-ink: day 40,27,33. White point: day
254,251,246; golden 254,240,220; night 242,230,236 (ours 230,206,218 / 240,201,170).

Hue histograms (S-weighted %, bins red 0°, orange 30°, yellow 60°, chartreuse 90°, green 120°, spring 150°, cyan 180°,
azure 210°, blue 240°, violet 270°, magenta 300°, rose 330°):
- ref day: shadows 25/26/1/1/1/0/5/13/17/3/3/6; mids 7/40/4/9/4/1/4/28/3/0/0/1; highlights 1/50/8/2/1/1/5/29/2/0/0/0.
- ref golden: shadows 29/14/0/0/0/0/0/8/12/14/9/12; mids 21/49/7/2/0/0/1/2/6/2/4/5; highlights 12/77/6/0/0/0/0/1/0/0/1/3.
- (ours day highlights were 76 % azure; ours golden mids 80 % orange, highlights 100 % orange.)

Radial vignette (mean Y' relative to centre, bins r 0-0.1 … 0.9-1.0):
- ref day 1.00, 1.00, 1.00, 1.02, 1.01, 1.00, 0.97, 0.95, 0.90, 0.86
- ref golden 1.01, 1.00, 1.00, 0.98, 0.97, 0.94, 0.89, 0.85, 0.80, 0.75
- ref night 1.06, 1.00, 0.94, 0.86, 0.79, 0.70, 0.62, 0.55, 0.51, 0.46
- ref interior 1.03, 1.00, 0.97, 0.94, 0.90, 0.85, 0.80, 0.77, 0.71, 0.67

Per-video day consistency: dark zone a* positive in all 13 videos with day frames; lifted warm black point; p99 ≥ 0.94.
Day ranges: median Y' 0.38-0.68, non-ink p5 0.09-0.38, lit C* p50 18-53, colourfulness 58-100. (Per-video rows: see the
table in grade.md:151-173; e.g. 01: Y' .39, C* 53/77, colourf. 99, corner .65; 12: Y' .57, C* 32/43, corner .99.)

### 7.4 Paint targets per hue (pooled; brightest 30 % of S > 0.25 pixels per 30° bin) — day reference
red #e85648 (L*56, C*69) 9 %; orange #e3b684 (77, 31) 38 %; yellow #d3c677 (80, 44) 3 %; chartreuse #7cbb48 (70, 66) 7 %;
green #58af47 (65, 66) 3 %; spring #93cdb6 (78, 24) 1 %; cyan #6dc7ce (75, 28) 5 %; azure #8fc4fa (77, 29) 27 %;
blue #6d76aa (51, 28) 5 %; violet #5d4c72 (36, 24) 1 %; magenta #713e74 (34, 43) 1 %; rose #733d56 (34, 25) 1 %.

Golden reference: red #f09a93 (71, 33) 20 %; orange #ffc590 (83, 37) 47 %; yellow #fee792 (92, 41) 5 %; chartreuse
#6e8f35 1 %; cyan #36aaae 1 %; azure #668cbe (58, 37) 4 %; blue #717be8 (54, 56) 7 %; violet #8967b1 (49, 48) 5 %;
magenta #a065a0 (50, 38) 5 %; rose #d588a5 (65, 34) 6 %.

### 7.5 Lit vs shadow on the same material (Otsu split)
ref 04 day sand lit #d2ac81 (L*73) / shadow #6a6d92 (L*47, b* −21) ratio 2.8; ref 18 pavement #edd8bf (87) / #7481b8
(55, b* −30) 3.1; ref 12 deck #e1c38d (80) / #5e6474 (42) 4.4; ref 04 golden sand #d28d4a (64) / #514d74 (35) 4.0.
Ours b_1900 deck #a76d30 / #452512 (brown, b* +19) 7.5. Reference shadow B channel is often higher than lit
(129 vs 146) → shadows are a *painted* colour, not a darker copy of the albedo.
Sky rows top 10 / 10-20 / 20-30 %: ref day #5997e2 (S .61) / #70adf1 / #82b8f5; ours #8db7e7 (S .39). Ref golden top
violet #937b80 (IQR #61426f-#da97a1), rows 20-40 % peach #d99d83.

### 7.6 The fitted grade (grade.md:253-289)
Model on sRGB-encoded values, identical in numpy and GLSL, in order:
1. Tone curve: one RGB monotone cubic Hermite (Fritsch-Carlson) through 7 knots x = 0, .1, .25, .5, .75, .9, 1; fitted to
   non-ink Y' quantiles; slope ≥ 0.35, y(1) = 1, black point Y' ≈ 0.035.
2. Saturation around Y' per zone; masks `wS = 1 − smoothstep(0, .55, Y')`, `wH = smoothstep(.45, 1, Y')`, `wM` = rest;
   bounded 0.6-1.6.
3. Three-way tint: zero-luma BT.709 Cb/Cr offset per zone; cap 28/255 per channel.
4. Vignette `× (1 − k·smoothstep(r0, 1, r))`; measured D k 0.06, r0 0.50; G k 0.11, r0 0.39 (used stronger).

| | DAY | GOLDEN |
|---|---|---|
| curve y at the 7 knots | 0.0345, 0.1828, 0.3812, 0.6605, 0.8814, 0.9631, 1 | 0.0311, 0.1877, 0.4017, 0.6754, 0.8750, 0.9582, 1 |
| tangents | 1.483, 1.404, 1.220, 0.987, 0.661, 0.435, 0.369 | 1.567, 1.498, 1.253, 0.924, 0.645, 0.472, 0.418 |
| saturation sh / mid / hi | 0.983 / 1.273 / 1.457 | 0.832 / 0.880 / 1.706 |
| shadow tint (Cb, Cr) | (−0.0291, +0.0411) warm red 20°, RGB (+16.5, −3.5, −13.8)/255 | (+0.0528, +0.0004) blue-violet 246°, RGB (+0.2, −2.6, +25.0)/255 |
| mid tint | (+0.0376, −0.0104) cool 230°, RGB (−4.2, −0.6, +17.8)/255 | (+0.0583, −0.0003) 245°, RGB (−0.1, −2.7, +27.6)/255 |
| highlight tint | (+0.0144, −0.0047), RGB (−1.9, −0.1, +6.8)/255 | 0 (fit was driven by only 754 pixels) |
| vignette k, r0 | 0.10, 0.45 | 0.16, 0.40 |

Golden is the weaker fit → `amount` 0.8. Shader uniforms: `gradeKy[7]`, `gradeKm[7]`, `gradeSat`, `gradeTintS/M/H`,
`gradeVig`, `gradeAmount`; vignette radius `r = length(uv·2 − 1)·0.70710678` (1 at corners). Grade must go AFTER the
NEUTRAL tone map (display-referred input 0..1); bloom stays before tone mapping.

**What actually ships** (grade.ts:152-173): the fitted presets above are kept as `GRADE_DAY`/`GRADE_GOLDEN`, but the
composer uses `GRADES = { day: GRADE_DAY2, golden: GRADE_GOLDEN2 }` — gentle S-curves re-fitted on the relit world:
- `GRADE_DAY2`: ky `[0, .1, .28, .6, .835, .945, 1]`, sat `[1.0, 1.05, 1.0]`, tintS `[0.01, 0.002]`, tintM 0,
  tintH `[0.006, 0]`, vig `[0.12, 0.45]`.
- `GRADE_GOLDEN2`: ky `[0, .09, .245, .54, .8, .93, 1]`, sat `[1.0, 1.12, 1.15]`, tintS `[0.02, 0.002]`, tintM 0,
  tintH `[−0.012, 0.006]`, vig `[0.2, 0.4]`.
- `GRADE_STRENGTH = { day: 1, golden: 1 }`, applied by `gradeFor(fx, light)`.

Re-fit procedure (scripts not in repo): `run_ours.py` → `samples.py` → `fit2.py day golden` → `emit_ts.py` →
`validate.py data/grade_params.json` (~5 min). Source-side suggestions: day `hor "#c4e0f7" → "#8fc0f2"`, sky exponent
`pow(h, 0.55) → pow(h, 0.4)`, golden `top "#5a66b8" → "#6a4f8c"`, `hor "#ffc48c" → "#f7a27e"`.

### 7.7 What a grade cannot fix (targets for lighting/texture work)
1. Cast shadows: target lit/shadow linear ratio 2.8-4.4:1 (median ~3.5 day, ~4 golden); shadow L* 42-55 day, ~35 golden,
   blue-violet b* −20 to −30 (#6a6d92, #7481b8, #5e6474; golden #514d74). Do it in the material, e.g.
   `outgoingLight = mix(outgoingLight, outgoingLight * 0.55 + vec3(0.20, 0.21, 0.36) * 0.35, 1.0 - sunVis)`.
2. Albedo: red #e85648, orange/wood #e3b684, yellow #d3c677, green #7fbc4e / #5ab04c (L* 65-70, C* 64), azure #93c6f9,
   blue #7980b0; lit C* p50 ≥ 32, p90 ≥ 55.
3. No black materials: coloured darks at L* 16-22 — navy #262c51, aubergine #2e2439, plum #3d2530, oxblood #4d2725.
   Ink ~2-2.6 % of pixels (ours 4.8 %), warm near-black cores ~(35,19,20).
4. Golden needs violet sky/shadow fill (`ground "#4f3f84"`) and red/rose accents (#f09a93, #d588a5) plus blue/violet
   (#717be8, #8967b1, #a065a0).
5. Characters: emissive ≤ 0.12 (was 0.36), let sun + hemisphere shade them.
Top 5: grade after tone map; recolour cast shadows; coloured darks + thinner ink; albedo chroma; golden-specific sky/fill.

---

## 8. The helper scripts (what, inputs/outputs, CLI)

All are meant to be copied into `<Remotion project>/scripts/` and run **from the project root** (relative paths).

### 8.1 `bridge-stills.mjs` — render chosen frames as JPEG stills
- CLI: `node scripts/bridge-stills.mjs <outPrefix> <frame,frame,...> [scale=0.5]`,
  e.g. `node scripts/bridge-stills.mjs out/<name>/x_ 100,400 0.5` → `out/<name>/x_100.jpg`, `x_400.jpg`.
- Env: `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx` (default `src/index.ts`); `REMOTION_TMP=<dir>` → creates it and sets
  `TEMP` and `TMP` to it (line 6).
- Steps: `bundle({ entryPoint, publicDir: path.resolve("public") })` once → `selectComposition({ id: "BridgeShort" })` →
  for each frame `renderStill({ imageFormat: "jpeg", jpegQuality: 88, scale, timeoutInMilliseconds: 180000 })`;
  browser `C:/Program Files/Google/Chrome/Application/chrome.exe`, `chromiumOptions: { gl: "angle" }`; prints browser
  errors/warnings (first 300 chars) and seconds per still.
- No way to pass `inputProps`, so Bridge.tsx's `getInputProps().post` toggles (`ink, lens, pre, bloom, grade, grain, dpr`)
  can't be changed from this script.

### 8.2 `sbs_sheet.py` — side-by-side review sheet
- CLI: `python scripts/sbs_sheet.py out.jpg --ours a.jpg b.jpg ... --ref r1.jpg r2.jpg ... [--h 640]`.
- Row 1 = ours, row 2 = reference, each image LANCZOS-resized to height h (default 640), 8 px white gaps between images,
  16 px between rows, white background, JPEG quality 88; prints path and size. Pillow only.

### 8.3 `bridge_shots.py` — story.ts → shots.json for QA
- CLI: `python scripts/bridge_shots.py [path/to/story.ts]` (default `src/videos/bridge/story.ts`).
- Regex-parses: shots `\{ id: (\d+), a: (\d+), b: (\w+),` (b = `TOTAL` resolved from `TOTAL = (\d+)`); `XFADE` map; `FLASH_AT`;
  cut keys `\{ f: (\d+), cut: true`; constants `SNAP|DROP0|DROP1`; the `KICKS` array.
- Writes **`out/bridge/shots.json`** (fixed path):
  `{"shots": [{id,a,b}], "xfade": [[a − x//2, a + x//2]], "flash": [FLASH_AT, FLASH_AT + 4], "planned": cuts [[f,f]] + kicks [[f0, f0 + 8]]}`
  with `f0 = round(t·30)`. Bridge output: 15 shots, xfades e.g. [1131, 1137], flash [130, 134], cuts 497…1932, kicks at
  f 1039, 1108, 1794, 1810, 1851.

### 8.4 `short_qa.py` — frame-by-frame QA of the final video
- CLI: `python scripts/short_qa.py <video.mp4> <outdir> [shots.json]`.
- Planned frames (ignored by the white/pop checks): every xfade/planned/flash window `range(a − 1, b + 1)` plus each
  shot boundary `(a − 1, a)`.
- Report lines:
  - `SPECS` from ffprobe (size, fps, nb_frames, duration, audio codec/rate/channels).
  - `LOUDNESS` from `ffmpeg -af ebur128=peak=true` (I, LRA, Peak lines). Targets from the reference: −14 LUFS, LRA ~2.4.
  - `SILENCES` from `silencedetect=n=-45dB:d=0.3`.
  - Decodes every frame at 180x320 (`flags=area`, rgb24). Per frame: luma mean/std/p2/p98 (Rec.709 weights), saturation
    mean (`(max − min)/max` where max > 0.06).
  - `diff[i]` = mean abs difference frame i → i+1 (0-255 scale). **Pop** = `diff > 3 × median(diff over ±8) + 1.0` and not
    planned. **Black** = mean luma < 0.04. **White** = mean luma > 0.93 and not planned. **Frozen** = runs of ≥ 12 frames
    with diff < 0.02. `MOTION`: mean diff and % of frames with diff < 0.3 ("held").
  - `PER SHOT`: medians of mean/std/p2/p98/sat per shot.
- Outputs in `<outdir>`: `report.md`, `perframe.npz` (diff + stats), `sheet_0000.jpg`, `sheet_0060.jpg`, … (10 x 6 tiles
  of 108x192, frame number in yellow on black, quality 85).

### 8.5 `bridge_merge.py` — merge look sandboxes into main
- CLI: `python scripts/bridge_merge.py [cam,world,mat,char,post]` (comma list; default all five).
- `ROOT = os.path.expanduser("your Remotion project")` (placeholder you must edit), `MAIN = ROOT/src/videos/bridge`,
  sandboxes `ROOT/src/videos/bridge_<box>`. Backs up MAIN to `ROOT/backup/bridge_<YYYYmmdd_HHMMSS>/` (full copy), then
  for each owned file: skip if missing in the sandbox, skip if byte-identical, else `shutil.copy2` into main and print.
  Ownership table = section 1.4 (comment: "round 2 ownership (round 1: world also owned paint/build, post owned grade)").

### 8.6 `sandbox_index_example.tsx` — sandbox entry
- Lives at `src/sandboxes/<n>/index.tsx`; imports `BridgeShort, BRIDGE_FRAMES` from `../../videos/bridge_world/Bridge`;
  registers `<Composition id="BridgeShort" … durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />` and calls
  `registerRoot(Root)` in the same file. Same composition id as main, so `bridge-stills.mjs` works on it unchanged.

---

## Bugs / contradictions

1. **STYLE_BIBLE camera grammar is wrong** and motion.md says so: "ease-out bursts, peak at the first frame" and "camera
   holds ~80 % of frames" (STYLE_BIBLE.md:36-37) vs measured symmetric ~23 f glides and only 10 % holds / 65 % moving
   (motion.md:11-16, 54-56). Trust motion.md and SKILL.md's targets.
2. **Hard cuts**: STYLE_BIBLE says the reference almost never hard-cuts (0-1 per video in 12/20); the shipped bridge has
   ~10 cut keys plus a flash and 6 crossfades (story.ts:215-259), following motion.md's "cut anything bigger than half a
   frame". The reference instead hides reframes with follow-object moves, blurred whips, fly-throughs and crossfades.
3. **Ink**: target "~3 px at 1080, near-black #0b0a0c, nearly constant with distance" (SKILL.md:108) and grade.md's "warm
   near-black cores ~(35,19,20)", ink 2-2.6 % of pixels — vs shipped `#030303`, 5.1 px near → 3.3 px far (ink.ts:52-53;
   ink.ts:4 says "widths x1.5"). The final is thicker, blacker and distance-dependent.
4. **Fog**: target day 25 → 420 m, golden 20 → 360 m (SKILL.md:115) vs shipped day 25 → 300 m, golden 50 → 380 m
   (lights.ts:21, 30).
5. **Golden sky**: SKILL.md:90 says sky `#ffc47c → #8a6f8a`; lights.ts:30 has `top "#6a4f8c", hor "#ffd08a"`.
6. **Grade**: grade.md presents the fitted `GRADE_DAY`/`GRADE_GOLDEN` and a recipe importing them (grade.md:319-328), but
   Bridge.tsx imports `GRADES, GRADE_STRENGTH, gradeFor` and ships the gentler `GRADE_DAY2`/`GRADE_GOLDEN2`. The comment at
   grade.ts:170-172 says strengths "day 0.65 / golden 0.45" land on target, but the code sets `{ day: 1, golden: 1 }`.
7. **Bean head ratio**: target h/w ~0.93 (SKILL.md:125) vs final .94 (SKILL.md:100). Minor.
8. **Rolls**: final "4-4.6°" (SKILL.md:104), targets "4-5°" (SKILL.md:120), motion.md recipe 3.6-8° on emphasis, story.ts
   comment "4-8°". Pick 4-8° for emphasis, ≤ 0.07 rad held tilt.
9. **March cadence**: motion.md recommends Option A (2.6 steps/s); shipped is Option B 2 steps/s (story.ts:29), slower
   than every measured reference walk (9-12 f/step).
10. **Script length**: SCRIPT_example header says "~55 s"; the finished short is 67.5 s; 218 words → ~3.2 w/s, below the
    3.7 w/s target.
11. **Path mismatches in SKILL.md**: "Shared brief: `compare/CONTEXT.md`" (SKILL.md:131) but the file is
    `references/reports/CONTEXT.md`; SKILL.md calls `scripts/...` and `templates/bridge/` "same as `src/videos/bridge/`" but
    the repo ships no project, no `src/Root.tsx`, no `src/index.ts`; "same `index.tsx` as main" (SKILL.md:132) yet a
    standard Remotion main is `index.ts` + `Root.tsx`.
12. **Missing referenced material**: `references/vids/`, `references/measure/`, `references/motion/…` scripts/plots,
    `references/grade/` (GradeEffect.ts, fit2.py, run_ours.py…), `refs_sheet.jpg`, `out/bridge/test/` are all named but not in
    the repo. The re-fit path in grade.md 5C is not runnable from the repo.
13. **Sheets**: README says `references/sheets/` = "60 frames each"; STYLE_BIBLE/CONTEXT describe 2 s sheets; the repo's
    sheets actually span the whole video (~1 frame per 0.5-1.3 s), so they can't be used for frame-level motion study.
14. **README "38 frames"** is correct only because shorts 15 and 17 lack a 0180 frame — no explanation given.
15. **README vs SKILL on temp**: README says set `REMOTION_TMP`; SKILL says export `TEMP`/`TMP` and claims
    "bridge-stills.mjs sets it itself" — it does so **only if `REMOTION_TMP` is set** (bridge-stills.mjs:6). The final
    `npx remotion render` does not read `REMOTION_TMP` at all; set TEMP/TMP in the shell for it.
16. **short_qa.py**
    - Line 25-26 precedence bug: `R.append(f"SPECS …" + ", ".join(…) if au else "NONE")` — with no audio stream the whole
      SPECS line becomes just `"NONE"` (video specs lost).
    - The usage comment says shots.json is a list `[{"id":1,...}, ...]`, but the code needs a dict with a `"shots"` key (a
      bare list crashes on `meta.get`).
    - A frozen run that lasts to the last frame is never reported (the run is only closed when motion resumes).
    - Black-frame and frozen checks ignore the planned list (intended flashes are white, so OK, but planned dips to black
      would be flagged).
    - Memory heavy: all frames at 180x320 → uint8 ~350 MB for 2025 frames, plus a float32 copy (~1.4 GB) and an int16
      copy (~700 MB) → ~2.5-3 GB RAM peak.
    - `diff < 0.02` on 0-255 means "almost bit-identical"; encoder noise can hide a visually frozen span.
17. **bridge_shots.py**
    - Output path hard-coded to `out/bridge/shots.json` even when parsing another story; the folder must exist (no
      `makedirs`).
    - Fragile regexes: a cut key written `{ f: 1932, dur: 3, cut: true` or a shot whose `b` is an expression won't match;
      a comment containing `XFADE ... = {` earlier in the file would be parsed instead.
    - Kicks use Python `round()` (banker's rounding: 36.95·30 = 1108.5 → 1108) while story.ts uses `Math.round` (→ 1109);
      the 8-frame window absorbs it.
18. **bridge_merge.py**
    - `ROOT = os.path.expanduser("your Remotion project")` is a placeholder; as written it resolves to a relative folder
      literally named "your Remotion project" and crashes.
    - Header says "four look sandboxes" and usage `[cam,world,char,post]`, but there are five owners (mat included).
    - Main and sandbox folder names are fixed to `bridge` / `bridge_<box>`; a new short needs edits.
    - Files the sandbox *deleted* are not removed from main; non-owned edits are silently dropped (by design).
    - Each run copies the full main folder into `backup/` (no clean-up).
19. **bridge-stills.mjs**
    - Comment line 4 ("C: is full, so keep bundles on D:") is the author's machine.
    - Static `import`s run before the `REMOTION_TMP` lines; this works only because Remotion reads the temp dir when
      `bundle()` is called. Setting TEMP/TMP before launching node is safer.
    - Composition id `BridgeShort` hard-coded; Chrome path hard-coded (fails on Mac/Linux or without Chrome there).
20. **sbs_sheet.py**: a path given before `--ours`/`--ref` → `KeyError: None`; no images at all → `max()` of an empty
    list crashes.
21. **R3F dpr clamp** (SKILL.md:147): `--scale 0.5` stills still render a full 1080x1920 buffer, so stills are not
    cheaper on the GPU, and pixel-size checks on stills must account for the 0.5 down-scale.

## Hard-coded paths & versions

- Versions: Remotion 4.0.290, three 0.175, @react-three/fiber 9.1.2, @react-three/postprocessing 3.0.4, postprocessing
  6.37.2 (CONTEXT.md:29-30; grade.md:295 "needs postprocessing 6.37.2 and three 0.175"); Python numpy 2.4, Pillow 12,
  scipy 1.18.
- Windows assumptions: Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (bridge-stills.mjs:11); ANGLE GL;
  `<big drive>/remotion-tmp` advice; "C: is full ... D:" comment; forward-slash rule for JS paths.
- Shell: SKILL uses POSIX (`export TEMP=…`, `cp -f`); on Windows use Git Bash, or PowerShell `$env:TEMP='D:/remotion-tmp'`.
- Fixed paths: `src/index.ts` default entry; `src/videos/bridge/story.ts` default for bridge_shots; `out/bridge/shots.json`
  output; `src/videos/bridge` and `src/videos/bridge_<box>` in bridge_merge; `backup/bridge_<time>/`;
  `public/bridge/kenney/<name>.glb` (world.ts:24); `~/bridge-short/voice/voice.wav` and `words.json`; `~/bridge-short/audio/`;
  sandbox import `../../videos/bridge_world/Bridge`.
- Placeholders to fill: `"your Remotion project"` (bridge_merge.py:6; also CONTEXT.md), `<big drive>`.
- Fixed numbers: 30 fps, 1080x1920 composition, `--scale 1.3333` → 1440x2560, `--crf 16`, h264, JPEG 88 stills, 180 s
  still timeout, QA sheets 60 frames/2 s, 48 kHz mix.
- Composition id `BridgeShort` everywhere (stills script, sandbox entry, Root).
- Dates: study 2026-10-30, script v1 2026-10-30, motion/grade passes 2026-10-31, "proven 2026-10-31".
- Author tooling: "Opus max" verifier agents, `SendMessage`, `SendUserFile`, a harness where sub-agents can't write files.

## What to change for a new story

1. **New project folder** (not the Codex ones): a fresh Remotion 4.0.290 project with the pinned three/R3F/postprocessing
   versions; copy `templates/bridge/*` → `src/videos/<name>/`, `templates/scripts/*` → `scripts/`, `templates/audio/*` →
   `<story folder>/audio/`. Add `src/index.ts` + `src/Root.tsx` registering a new composition id (e.g. `<Name>Short`),
   1080x1920, 30 fps, `durationInFrames = TOTAL`. Put the Kenney GLBs (or new kits) in `public/<name>/...` and update the
   `staticFile` path in world.ts.
2. **Scripts to edit**: `bridge-stills.mjs` (composition id → env var or argument; drop or parameterise the Chrome path;
   maybe add `inputProps`); `bridge_shots.py` (output path → `out/<name>/shots.json`, make the folder); `bridge_merge.py`
   (`ROOT`, `MAIN = src/videos/<name>`, sandbox prefix `<name>_`); sandbox `index.tsx` (import path and composition id);
   `short_qa.py` (fix the SPECS precedence bug, close a trailing frozen run).
3. **Story layer** (all bridge-specific): facts + sources + script in a new `SCRIPT.md` following the beat formula (hook
   10-16 words, "You see," pivot, deadpan double line, everyday analogy, callback ending, ~3.7 w/s, 55-70 s); new
   `voice.wav` + hand-fixed `words.json`; in story.ts replace `TOTAL`, `SHOTS` (ids, frames, light, crowd mode, tau),
   `XFADE`, `FLASH_AT`, `CAMS`, `KICKS`, `DOF`, `FOREGROUND`, and the bridge physics (`D0`, `HALF`, `COUNT = 74`,
   `FILES`, `ROW_GAP`, `PARK`, `front`, `marchPhase`, `SNAP/DROP0/DROP1`, `amp`, `stomp`, `bridgeState`). Crowd modes
   (`march|fall|water|bank|tourists|none`) are bridge-specific and need new ones in cast.ts.
4. **cast.ts timing tables tied to bridge words**: `SWAPS`, `CHEER` windows, `exprMarch` switch times, hammer `HITS` — all
   seconds from the bridge `words.json`; re-derive from the new words, keep `LEAD = 2/FPS`.
5. **World**: new layout in build.ts (town, props, sight-line culling), new painted textures in paint.ts; keep the light
   presets as a starting point; add new presets (night, interior) if the story needs them — the reference uses night 352
   and interior 835 of 2164 samples, and the grade only has day/golden. Measured targets exist for night/interior in
   grade.md (e.g. night median Y' .243, black point 9,10,38, shadow hue 239°, vignette corner .46; interior median .448,
   corner .67) to build new grades from.
6. **Characters**: new outfits/props/expressions in toon.ts using the same construction rules (3.5 HH adults, bean head
   ~0.93, plum ink, no blush, on-ones animation, 4-frame blinks every 0.5-2.3 s).
7. **Sound**: regenerate everything after locking picture timing: event table in timeline.py, music sections and
   section gains (cues.md lists bridge sections: hook, town, march, bounce, whistle, tension, sway, swing, march2, rule,
   tourists), exact length = TOTAL/30 s at 48 kHz; target −14 LUFS, LRA ~2-3.
8. **Decide our own channel rules** (the author's are optional): captions (reference uses one-word captions; the author
   bans them), 2K export, mix trims, verifier process.
9. **Re-check the readability traps** (section 2G) for every new prop and camera, and re-run the look-match loop with
   fresh verifier scores if the world changes a lot; re-fit or soften the grade after big lighting changes.
10. **Disk**: set TEMP/TMP (and `REMOTION_TMP`) to a big drive before any bundle or render; each bundle copies `public/`.

# REPO_KNOWLEDGE — `mromidev/claude-animated-shorts` (master synthesis)

Master notes for the read-only clone at `<ROOT>\repo`
(commit `e3b817b` "Add 20 reference contact sheets", 2026-11-01, author "Mr omi"; first commit `744b75f`).
Written 2026-11-10 from the nine slice notes in `study\repo\01_…09_…md`, the six older digests in
`C:\Users\utkar\claude-animated-shorts-study\`, and direct checks of the repo source (cited as `file:line`).
Paths without a folder are in `templates/bridge/` (TS) or `templates/audio/` (Python).

How to read this file: section 3 is the "how to make a short" recipe; section 4 is the style bible;
sections 5-6 explain the code; section 9 lists every known bug; section 11 is the checklist for a new story.
Words: **cInf** = blur-disc radius (px at 1080x1920) for things at infinite distance; **LU** = loudness
difference in dB; **tau** = story time (s) inside a shot; **NOINK** = three.js layer 3 that the ink pass skips;
**untone()** = inverse of the PBR-Neutral tone map, so a colour lands on screen exactly as written.

---

## 0. Local machine facts (checked 2026-11-10, read-only)

- The skill is already installed at `C:\Users\utkar\.claude\skills\cartoon-3d-short\` (same files as the repo, but its
  `SKILL.md` has an extra "Local setup on this PC (added 2026-11-09)" block). That block says: the earlier Remotion
  project is `an older unrelated project folder` (pinned remotion/@remotion/* 4.0.290, three 0.175.0, @react-three/fiber
  9.1.2, @react-three/postprocessing 3.0.4, postprocessing 6.37.2, **react 19.1.0**); all 26 Kenney GLBs (Nature Kit 2.1
  + Fantasy Town Kit) are in its `public/bridge/kenney/` **plus `Textures/colormap.png` (needed by the Fantasy Town
  GLBs)**; sound project `an older unrelated project folder\` has a Windows-TTS placeholder voice; stills take ~25 s each here
  (Chrome may use the Intel iGPU); `npx tsc --noEmit` shows 6 known harmless errors in `Bridge.tsx:66-72` (null children
  in EffectComposer); the day↔golden crossfade light bug was verified there; `SendUserFile` does not exist here.
- **Do not open, run or edit `an older unrelated project folder` or `an older unrelated project folder`** (Codex is working there).
  A new short needs its own new project folder (suggestion: inside `<ROOT>\`).
- Tools present now: Python 3.12.3 with numpy 2.2.6, scipy 1.13.1, Pillow 11.1.0 (user site-packages, so `python -I`
  cannot import them); ffmpeg/ffprobe 9.0.2 (winget, on PATH); Node 22.14.0 + npx. The older digest (2026-11-09) said
  numpy/scipy/ffmpeg were missing — that is outdated. The author used numpy 2.4 / Pillow 12 / scipy 1.18.

---

## 1. What the repo is and what it produces

A Claude Code **skill** (`SKILL.md`, frontmatter name `cartoon-3d-short`, MIT licence) for making 55-70 s vertical
(9:16) cartoon story shorts: flat 2D "bean-head" characters drawn with Canvas2D onto camera-facing cards, standing in a
procedurally built and hand-painted 3D world rendered by three.js inside Remotion (via `@remotion/three`), with a
screen-space ink-outline pass, thin-lens depth of field, bloom, PBR-Neutral tone mapping and a fitted colour grade;
narration is your own `voice.wav`; all sound effects, ambience and an original score are synthesised in pure
numpy/scipy and mixed to a fixed loudness. It ships the complete source of one finished short, **"The Bridge That Fell
for a Song"** (1831 Broughton suspension bridge, 74 marching soldiers; 2025 frames = 67.5 s at 30 fps, composition
1080x1920 id `BridgeShort`, final render `--scale 1.3333` = 1440x2560), the sound code, five helper scripts, and a
private measured style study of 20 shorts from one reference channel (8 reports, 38 frames, 20 contact sheets). It does
**not** ship a Remotion project (`package.json`, `src/index.ts`, `src/Root.tsx`), `public/` assets (Kenney GLBs), the
voice files, the reference videos, or any of the measurement scripts the reports mention.

---

## 2. Folder map (all 98 tracked files)

| Path | Lines / size | Job |
|---|---|---|
| `LICENSE` | 15 | MIT, "Copyright (c) 2026 Mr omi". Reference frames are "for style study only" (README). |
| `README.md` | 33 | Install (copy to `~/.claude/skills/cartoon-3d-short/`), needs Remotion + `@remotion/three`, Node, Python 3, ffmpeg; contents table; "set `REMOTION_TMP` to a big drive". |
| `SKILL.md` | 166 | The skill: 11-step pipeline (l.29-80), author "User rules" (l.18-27), final look values (l.82-104), measured look targets (l.106-128), look-match loop (l.130-141), gotchas (l.143-154), readability traps (l.156-166). |
| `references/STYLE_BIBLE.md` | 44 | First coarse study of the 20 shorts (2026-10-30): format, voice, loudness −14 LUFS, captions, script formula, picture, camera (camera part is wrong, see 9). |
| `references/reports/CONTEXT.md` | 55 | Brief given to the 7 measuring agents: goal, private inputs (720x1280 30 fps videos, 01 = newest, one leaked id `Mz72MuPgnGY`), caption masking, old pipeline state, deliverable format, versions. |
| `references/reports/motion.md` | 435 | Camera + character-animation measurements (32,337 frames) and the camera/animation recipe. |
| `references/reports/depth.md` | 556 | DOF, haze, sky, glow, composition (530 labelled frames) + thin-lens recipe. |
| `references/reports/lighting.md` | 603 | Key direction, same-surface shadow colour, shadow edges, heads under light, glows + two-tone recipe. |
| `references/reports/grade.md` | 380 | Colour/tone statistics (2164 frames, D/G/N/I/X), per-hue paint targets, the fitted 7-knot grade. |
| `references/reports/outlines.md` | 624 | World-ink measurements (66 edge scans) + the `InkPass` recipe (full source in appendix). |
| `references/reports/textures.md` | 978 | Surface measurements (planks, stone, roofs, water, sky, clouds), texel density, painter recipe (appendix). |
| `references/reports/characters.md` | 728 | Head contour fits, outline, faces, bodies, drawing spec + code recipe. |
| `references/frames/shortNN_0060.jpg` ×20 | 540x960 JPEG | Reference frame at **~12 s** of short NN (01-20). |
| `references/frames/shortNN_0180.jpg` ×18 | 540x960 JPEG | Reference frame at **~36 s** (none for 15 and 17: those videos are shorter than 36 s). |
| `references/sheets/shortNN_sheet.jpg` ×20 | 1800x1920 JPEG | 10x6 grid of 180x320 thumbnails = 60 frames spread over the **whole** video, burned-in captions visible. |
| `templates/SCRIPT_example.md` | 22 | Bridge script v1: facts + source, 15 lines, 218 words. |
| `templates/sandbox_index_example.tsx` | 7 | Entry for a look-pass sandbox: imports `../../videos/bridge_world/Bridge`, registers `BridgeShort` 1080x1920 30 fps, `registerRoot`. |
| `templates/bridge/Bridge.tsx` | 116 | Remotion component: kit loading, crossfade layers, white flash, ThreeCanvas, post chain, inputProps toggles. |
| `templates/bridge/story.ts` | 348 | Timeline: constants, bridge physics, SHOTS, XFADE, FLASH_AT, camera engine + all framings/keys, KICKS, DOF, FOREGROUND. |
| `templates/bridge/world.ts` | 578 | `World` class: sky, sun rig, fog, clouds, ground, river shader, bridge geometry + `poseBridge`, smoke, sign, swing, cast placement loop, `update()`. |
| `templates/bridge/build.ts` | 703 | Material cache `lam/toLambert`, geometry helpers, `Batch`, `Strand`, sight-line culling, cartoon trees, cloth banner, props, `house/houseDetail`, `buildTown`. |
| `templates/bridge/paint.ts` | 720 | All textures painted at run time on Canvas2D (`ctex` cache): legacy + HD painters, water mark data texture, cloud sprites. |
| `templates/bridge/lights.ts` | 63 | `LIGHTS` (day/golden light presets) and `LOOK` (sky stops, water, cloud colours, bounce, sat). |
| `templates/bridge/shade.ts` | 77 | Two-tone world shading patch (`twoTone`, `TONE`, `CHAR`, `LFB`) and `neutral()/untone()`. |
| `templates/bridge/cardshade.ts` | 85 | Character-card lighting patch `cardShade()` + multiply `blobMaterial()`. |
| `templates/bridge/toon.ts` | 909 | Canvas2D character painter: palette, outfits, `Pen` API, bean heads, 14 faces, hats, bodies (front/side/swing), fx sprites. |
| `templates/bridge/cast.ts` | 473 | Who is on screen per (shot, t): canvas `Pool`, `Actor`/`Fx` cards, blinks, views, light angle, crowds, officer, swing, contact shadows. |
| `templates/bridge/ink.ts` | 393 | `InkPass` (screen-space depth+normal outlines), `NOINK = 3`, `noInkFallback`. |
| `templates/bridge/lensblur.ts` | 139 | Thin-lens DOF `LensBlur` (pre + main gather passes) + `GrainEffect` (off). |
| `templates/bridge/grade.ts` | 179 | `GradeEffect` (7-knot curve, 3-zone sat, split tone, vignette), presets, `GRADES`, `GRADE_STRENGTH`, `gradeFor`. |
| `templates/audio/dsp.py` | 350 | DSP kit: filters, noise, envelopes, STFT shaping, modal synthesis, pan, reverb IR, BS.1770 meter, WAV I/O. 48 kHz only. |
| `templates/audio/instruments.py` | 291 | 15 synthesised instruments (brass, glock, vibes, music box, triangle, fife, whistle, snare, cymbal, timpani, brush, pluck, pad). |
| `templates/audio/music.py` | 389 | The bridge score: Bb major 120 bpm march, theme, chords, `SECTIONS`, `build()`, per-track balance + reverbs. |
| `templates/audio/sfx_gen.py` | 570 | ~35 SFX generators (creaks, metal, boots, whooshes, water, formant voices, crowds, nature, park/hammer/steps). |
| `templates/audio/sfx.py` | 348 | The bridge cue list (`Cue`, `cues()`, 358 cues) and the SFX renderer (`render(v_ref)`). |
| `templates/audio/timeline.py` | 169 | Hand-copied picture timeline (shots, events, camera distance, footfalls, tourist steps) for the sound. |
| `templates/audio/mix.py` | 354 | The only script you run: voice + ducked music + SFX → −15 LUFS, −1.2 dBTP limiter → `mix.wav`, stems, `cues.md`. |
| `templates/audio/cues.md` | 442 | **Generated** cue sheet of the bridge mix (loudness report, music map, 358 SFX rows). |
| `templates/scripts/bridge-stills.mjs` | 21 | Bundle once, render chosen frames as JPEG stills (Chrome + ANGLE). |
| `templates/scripts/sbs_sheet.py` | 32 | Side-by-side review sheet: row 1 ours, row 2 reference. |
| `templates/scripts/bridge_merge.py` | 30 | Copy each owner's files from look sandboxes back into main (with backup). |
| `templates/scripts/bridge_shots.py` | 19 | Regex-parse `story.ts` into `out/bridge/shots.json` for QA. |
| `templates/scripts/short_qa.py` | 78 | Frame-by-frame QA of a final mp4 (pops, black/white/frozen frames, loudness, silences, per-shot stats, sheets). |

Total: 3 root + STYLE_BIBLE + 8 reports + 38 frames + 20 sheets + 2 template examples + 13 bridge + 8 audio + 5 scripts = **98**.
Completeness: every file is covered by at least one slice note (section 12); nothing was left uncovered.

---

## 3. The pipeline for a NEW short (step by step)

### 3.0 One-time setup (nothing of this is in the repo)
1. **New Remotion project folder** (not the Codex folders). Pin exactly: `remotion`, `@remotion/three`, `@remotion/cli`,
   `@remotion/bundler`, `@remotion/renderer` **4.0.290**; `three` **0.175(.0)** + `@types/three`; `@react-three/fiber`
   **9.1.2**; `@react-three/postprocessing` **3.0.4**; `postprocessing` **6.37.2** (must be the same copy that
   @react-three/postprocessing uses, or `instanceof Pass/Effect` checks fail); `react`/`react-dom` 19.1.0 (local note).
   Never upgrade three: `shade.ts:25` throws if `lights_fragment_begin` text changes, and `cardshade.ts:74` fails
   silently. tsconfig needs `lib` ≥ ES2017 + DOM (`padStart`, canvas); `noUnusedLocals` trips on cast.ts unused imports.
2. Copy `templates/bridge/*` → `src/videos/<name>/`; `templates/scripts/*` → `<project>/scripts/`; write
   `src/index.ts` (`registerRoot`) and `src/Root.tsx` with
   `<Composition id="<Name>Short" component={...} durationInFrames={TOTAL} fps={30} width={1080} height={1920}/>`.
3. Assets: Kenney CC0 GLBs into `public/<name>/kenney/` (or keep `public/bridge/kenney/`) and change
   `staticFile("bridge/kenney/<n>.glb")` at `world.ts:24`. Copy `Textures/colormap.png` next to Fantasy Town GLBs.
   Only 11 of the 26 listed names are really drawn (`flower_redA/yellowA/purpleA, lily_large, lantern, cart, stall-red,
   stall-green, stall-bench, windmill, canoe`); trees/bushes/hedges/banners are procedural; missing files vanish silently.
4. **Disk:** every Remotion bundle copies `public/` (~1.3 GB) into `TEMP` and never deletes it (filled 60+ GB, ENOSPC).
   Before any bundle/render set `TEMP`, `TMP` (and `REMOTION_TMP` for the stills script) to a big-drive folder, using
   forward slashes in JS strings. Ask before deleting old `remotion-webpack-bundle-*` / `puppeteer_dev_chrome_profile-*`.
5. Sound folder layout: `<proj>/voice/voice.wav`, `<proj>/voice/words.json`, `<proj>/audio/` = the 7 `.py` files
   (copied from `templates/audio/`). Run with plain `python`, never `python -I`.

### 3.1 Topic and facts (SKILL.md:30-31)
One surprising **true** story with a physical cause → effect that can be shown, plus one everyday analogy. Write facts
with sources at the top of `SCRIPT.md` (the example cites Wikipedia, Broughton Suspension Bridge).

### 3.2 Script (SKILL.md:32-41, STYLE_BIBLE "script formula", 20/20 references follow it)
- 55-70 s at ~3.7 words/s (reference 3.5-4.1, median 3.7); sentences ~13.5 words; plain spoken English, contractions,
  jargon only if explained in the next clause. Never describe what the viewer already sees.
- Beats: **Hook** (paradox stated as fact, sentence 1, 10-16 words) → **Setting** (1-2 lines, year/place/pride,
  present tense, named everyman, numbers) → **Escalation** 3-6 beats (others doubt/mock, stakes climb, 1-2 exaggeration
  jokes) → optional **Mystery** "Wait…?" → **Snap** → deadpan double ("Luckily… / Unluckily…") → pivot **"You see,"**
  (14/20; "Well," also seen) + everyday analogy ("Ever…?") → **Consequence/rule** → **ironic callback** ending on the
  last word. Two modes: third-person story, or "Imagine you're…" second person.
- Example: 15 lines, 218 words, median 14 words/sentence; it says "~55 s" but the final is 67.5 s (~3.2 w/s).

### 3.3 Voice → `voice.wav` + hand-fixed `words.json` (SKILL.md:42-44)
- Record/generate; one steady male-style narrator in the reference, starts at frame 1-4, almost no pauses (total gaps
  > 0.25 s under 1 s per video).
- Convert to 48 kHz **integer** PCM (mix.py:62 asserts 48 kHz; `dsp.read_wav` cannot read float WAV):
  `ffmpeg -i in.wav -ar 48000 -c:a pcm_s24le <proj>/voice/voice.wav`.
- `words.json` = JSON array in time order, each object needs numeric `"s"` and `"e"` (seconds); the word text is
  never read by code (e.g. `[{"w":"Seventy-four","s":0.12,"e":0.71}, …]`). **Hand-fix every timing.**

### 3.4 Word → frame table
frame = round(seconds × 30). Everything in the picture is typed by hand from this table (no code reads
`words.json` except `mix.py` for ducking). `TOTAL` = last word end × 30 + a few frames (reference ends on the last word).

### 3.5 Shot plan in `story.ts` (SKILL.md:45-53)
Fill: `TOTAL`; `SHOTS` `{ id, a, b, light: "day"|"golden", crowd, tau }` (ids 1..N in order, `b` = next `a`, keep the
literal `{ id: N, a: N, b: N,` text for `bridge_shots.py`); `XFADE` (6-8 f at place/time changes, keyed by incoming id,
centred on `a`); `FLASH_AT` (4 white frames after the hook); `CAMS` keys `{ f, dur?, cut?, s }`; `KICKS`; `DOF`;
`FOREGROUND`; your story physics as pure functions of `tau`. Every reaction lands 0-3 f before its word. Details in 11.

### 3.6 World and characters
`lights.ts` (presets/sky), `shade.ts` (keep), `build.ts` (new layout + culling), `paint.ts` (new painters),
`world.ts` (ground, hero object, per-frame posing, sun per shot); `toon.ts` (outfits, hats, props, faces), `cast.ts`
(crowd modes, timing tables), `cardshade.ts` (zones if proportions change).

### 3.7 Stills QA and the look-match loop (SKILL.md:71-74, 130-141)
- Stills: `node scripts/bridge-stills.mjs out/<name>/x_ 100,400 0.5` → `out/<name>/x_100.jpg`… (JPEG q88, 180 s timeout,
  `selectComposition({id:"BridgeShort"})` hard-coded → edit for the new id). ~40 s bundle then 3-8 s per still on the
  author's PC (~25 s here). `--scale 0.5` still renders a full 1080x1920 buffer (R3F clamps dpr ≥ 1).
- Sandbox: `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx node scripts/bridge-stills.mjs out/<name>/<n>/x_ <frames> 0.5`.
- Side-by-side: `python scripts/sbs_sheet.py out.jpg --ours a.jpg b.jpg --ref r1.jpg r2.jpg [--h 640]`. Downscale our
  stills to 540x960 and mask the reference caption band (~0.64-0.76 H) before comparing; compare same light state.
- Look-match loop: one measuring agent per topic → 5 sandboxes `src/videos/<name>_{cam,world,mat,char,post}` with one
  owner per file (cam: story.ts · world: world/lights/shade/grade · mat: paint/build · char: toon/cast/cardshade ·
  post: ink/Bridge.tsx/lensblur) → `python scripts/bridge_merge.py cam,world,…` (edit `ROOT` first) →
  `npx tsc --noEmit` → re-sync sandboxes (`cp -f src/videos/<name>/* src/videos/<name>_<n>/`) → fresh verifier scores
  /10 (colour day, colour golden, lighting, ink, textures, characters, depth, composition). Bridge went 5/3/4/5/4/7/4/6 →
  final day 7, golden 5-6, lighting 5-6, ink 6, textures 5-6, characters 7, depth 6-7, composition 6-7 (4 rounds).
- Readability traps to re-check on every prop/shot (SKILL.md:156-166): single swing rope reads as a hanging (use two
  ropes); props < 2 m from the lens become cut-off blobs; cut-off foreground bush = "green ball"; flags with national
  meaning (red+yellow star read as Vietnam → St George's cross for 1831 England); side-lit signs go grey (unlit sign
  faces); offset outer rim turns hats into frames (inner rim only); chest-height rails through torsos (lens ~2.5 m);
  flat holds read as freezes (every hold creeps).

### 3.8 Lock the picture, then sound (SKILL.md:67-70)
Copy every time constant into `timeline.py` (SHOTS, XFADE, tau offsets, event times, camera distances); rewrite
`music.py` `build()` and `sfx.py` `cues()`; delete `<proj>/audio/_cache/`; run `python <proj>/audio/mix.py` →
`<proj>/audio/mix.wav` (48 kHz, stereo, 24-bit, exactly `TOTAL/30` s), `stem_voice/music/sfx.wav`, `cues.md`. Any later
picture timing change = edit timeline.py + delete `_cache` + re-run.

### 3.9 Final render, mux, QA (SKILL.md:75-80)
```
# TEMP/TMP on a big drive first (Git Bash: export TEMP=D:/remotion-tmp TMP=D:/remotion-tmp)
npx remotion render src/index.ts <Name>Short out/<name>/video.mp4 --codec h264 --crf 16 --scale 1.3333   # 1440x2560
#   (bridge-stills uses chromiumOptions gl:"angle"; add --gl=angle if the CLI render shows WebGL problems — not in repo)
ffmpeg -i out/<name>/video.mp4 -i <proj>/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/<name>/final.mp4
mkdir -p out/bridge && python scripts/bridge_shots.py src/videos/<name>/story.ts        # writes out/bridge/shots.json
python scripts/short_qa.py out/<name>/final.mp4 out/<name>/qa out/bridge/shots.json
```
`-map 0:v:0 -map 1:a:0` is required because Remotion writes a silent audio track (the rest of the ffmpeg line is a
reconstruction). 2K renders ~4 fps (~10 min) on the author's PC; grain off gives ~250 MB (2.5 % grain → 910 MB).
`short_qa.py` flags: pop = frame diff > 3 × local median (±8 f) + 1.0; black = mean luma < 0.04; white > 0.93; frozen
= ≥ 12 f with diff < 0.02 (0-255 scale); plus ebur128 loudness and `silencedetect=n=-45dB:d=0.3`; writes `report.md`,
`perframe.npz`, 60-frame sheets. Then "deep audit", deliver the mp4 path (SendUserFile does not exist here).

---

## 4. Style bible (measured reference target → shipped bridge value)

Units: px@720 = pixels on the 720x1280 reference (×1.5 for 1080); "f" = frame at 30 fps. "Shipped" = what the
templates render (after 4 reviewer rounds). Where they differ, the shipped value was a reviewer's taste choice,
not a measurement — see section 8.

| Area | Measured in the reference | Shipped in the bridge (file) |
|---|---|---|
| **Camera state** | hold 10 % / drift 24 % / move 65 % of frames; 6.0 moves per 10 s; median speed 3.6 px/f@720 | every hold creeps (no static hold ≥ 4 f; QA flags ≥ 12 f) (story.ts pushK) |
| **Move shape** | symmetric ease-in-out, ~10 f in + ~10 f out (~23 f), median peak 13.7 px/f@720 (p75 24.6, p90 36); typical move 101 px + 23 % zoom | smootherstep `x³(x(6x−15)+10)` glides 18-40 f (crane 93 f), default 24; peak = 1.875 × px / dur ⇒ dur ≥ 0.075 × move px; move > 360 px@720 or > 40 % zoom ⇒ `cut: true` (story.ts:89-113) |
| **Glide timing** | reactions land on the word | glide key `f = wordFrame − dur/2` (centred on the word; the whoosh peaks there); cuts on the word frame |
| **Push-in** | quiet-frame zoom median 0.14 %/f (p75 0.34, p90 0.70), 83 % push IN; push runs median 35 f, +22 %, 0.61 %/f | `pushK(f,f0,rate,punch,n=35)` returns `exp(−s)`: rate 0.0015-0.0035/f, punch 0.006 for ~30-35 f with 8 f ramps (S14b 0.004/24; S12a 0.001 is below the floor) (story.ts:117-122) |
| **Rolls / dutch** | roll moves 3.2 per 10 s, median 3.6° over 18 f (p75 8.1°); held dutch only 2 % of frames | keys hold ±0.02-0.04 rad; "roll through level" swings of 4-4.6° over 18-20 f (`rolled()`) |
| **Impact kick** | offset flips sign every frame, ~3 px@720, roll ±0.1-0.35°, gone in 6-8 f, push-in stops | `KICKS=[[SNAP,1],[DROP1,1.6],[59.79,.5],[60.33,.5],[61.69,.7]]`; n = floor((t−t0)·30), 7 f, `g·(±1)·(1−n/7)^1.5`; look shift `m=(3/640)·tan(fov/2)·L·a` sideways, +0.6·m up, roll +a·0.004 rad (story.ts:264-282) |
| **Whips** | 0.45 per minute, 45-93 px/f for 7-25 f, 2-3 f ramps, always heavy directional blur | none (no whip-blur effect shipped) |
| **Hand-held float** | none (residual 0.08 px) | deleted |
| **Cuts / transitions** | hard cuts almost never (0-1 per video in 12/20); reframes hidden by follow-the-object moves, blurred whips, fly-throughs, 6-8 f dissolves, circular irises/masks | 6 plain hard cuts at shot boundaries (2→3 … 7→8) + 1→2 hidden under the 4 f white flash at 130 + 9→10 invisible (shared camera) + 10 in-shot cut keys (497, 717, 871, 925, 1039, 1062, 1099, 1685, 1770; 1932 is a seamless hand-off into the crane) + 6 crossfades `XFADE {9:6,11:8,12:8,13:8,14:8,15:8}` |
| **Animation rate** | on ones, no line boil, no squash/stretch/smears, no idle loops (only acting idles: head loll 10-15° in 8-10 f, hold ~20 f) | on ones (poses quantised to 1/120); loll not implemented (`headTilt` unused) |
| **Walk** | step 9-12 f (2.5-3.3 steps/s); bob 3-7 % of height, lowest at contact; lean 1° passing → 5-7° contact; stance foot planted (≤ 1.1 px/f) | march 15 f/step (2 steps/s, `marchPhase` 1 Hz, story.ts:29); bob amplitude 0.025·tall (5 % p-p) march / 0.015 (3 % p-p) stroll (toon.ts:453-454); side lean 4+3cos(4πφ); planted stance foot + cycloid swing foot + 2-bone IK; tourists sp/1.4 Hz cycle (0.8-1.5 steps/s) |
| **Blinks / timing** | every 0.5-2.3 s (typ. 0.5-1.5), 3-4 f half/shut/shut/half, one on every expression swap; reactions 0-3 f before the word, 1 f swaps | `LID=[.5,1,1,.5]`, gaps `15+54·hash` f (0.5-2.3 s), `SWAPS` force a blink over planned swaps, `LEAD=2/30` (cast.ts:168-186) |
| **Strikes** | ~3 f lower, ~6 f held back, 1-frame strike on the word, impact flash + 4-5 f ring, no overshoot | `hammerK`: 4 f wind-up, 7 f hold, 1 f strike, 5 f burst (cast.ts:370-391) |
| **Mouths** | change on ones with the voice (r ≈ 0.47, lead 0-1 f) | **no lip-sync**; mouths change only with expressions |
| **Grade — day** | median Y' .571, p99 .967, non-ink p5 .234, lit C* p50 33.8 / p90 54.9, colourfulness 82.8, local contrast .072, vignette corner/centre .856, black point RGB (35,19,20), white (254,251,246), ink 2.6 % of pixels, shadow hue rose 331° | `GRADE_DAY2`: knots x 0,.1,.25,.5,.75,.9,1 → ky 0,.1,.28,.6,.835,.945,1; sat S/M/H 1/1.05/1; tintS (Cb .01, Cr .002), tintH (.006, 0); vignette k .12 r0 .45; strength 1 (grade.ts:152-173) |
| **Grade — golden** | median .516, p99 .912, black (48,16,22), violet shadows (b* −6), vignette .754; hues orange 47 %, red/rose ~20 %, blue/violet/magenta ~17 % | `GRADE_GOLDEN2`: ky 0,.09,.245,.54,.8,.93,1; sat 1/1.12/1.15; tintS (.02,.002), tintH (−.012,.006); vignette .2 @ .4 |
| **Grade — night / interior** (no preset yet) | night median .243, p5 .087, black (9,10,38), shadow hue 239°, vignette .46, HSV S p50 .61; interior median .448, black (23,12,20), vignette .67 | — (add presets) |
| **Fitted grade (unused)** | grade.md fit: DAY ky .0345,.1828,.3812,.6605,.8814,.9631,1; sat .983/1.273/1.457; vig .10@.45 · GOLDEN ky .0311,.1877,.4017,.6754,.875,.9582,1; sat .832/.880/1.706; vig .16@.40 | kept as `GRADE_DAY`/`GRADE_GOLDEN`, not used ("washed the new lighting out") |
| **Paint targets (day)** | red #e85648, orange/wood #e3b684, yellow #d3c677, green #7fbc4e/#5ab04c, azure #93c6f9, blue #7980b0; coloured darks L* 16-22: navy #262c51, aubergine #2e2439, plum #3d2530, oxblood #4d2725; never pure-black materials | warm cream/ochre/terracotta houses (`STYLES`), ochre deck #c99669…, warm stone (`STONE_PAL`), iron Phong #3d414c |
| **Day key light** | side/side-back from screen right, az ~50-70°, el ~40-55° (az 0 = sun ahead/backlight, 90 = screen right, 180 = behind camera) | `LIGHTS.day` az 75 el 48; sun camera-relative, frozen per shot (`shotSun`, mean view direction); `SUN_SHOT {2:{az120},11:{az−70,el8},12:{az−30,el18}}` (world.ts:67) |
| **Sunset key** | backlit in 10/15: az 0-40°, el 3-15°, long shadows toward camera | `LIGHTS.golden` az 6 el 7 (shots 11-12 overridden, only shot 13 backlit) |
| **Day shadow colour** | wood: ~0.5 × lit, same hue, a bit more saturated (lighting.md); ground: blue-violet, lit/shadow 2.8-4.4:1, L* 42-55, b* −20..−30, e.g. #6a6d92, #7481b8, #5e6474 (grade.md) | two-tone: lit `[1.58,1.5,1.33]`·(0.65+0.35 N·L), shade `[.30,.29,.36]`, additive lift `[.05,.06,.11]` only in shadow, term .2, sideK .84, uSat 1.08 (lights.ts:15-24, shade.ts:27-43) |
| **Sunset shadow** | violet-blue replacement colour, B ratio 1.35-3.04 (#db9044 → #5b5173) | golden lit `[1.5,.68,.24]` (≈#ffb36f), shade `[.15,.15,.3]`, lift `[.04,.06,.17]`, term .07, bounce `[.04,.02,0]`, uSat 1.1 |
| **Shadow edges / AO** | in-focus penumbra 3-12 px@720 (0.4-1.7 % of width); softness only from DOF; no SSAO; contact = ink line + blob | PCFSoft 4096², half-size Rr = clamp(1.15·dist+7, 12, 95) m (golden ≥ 30), bias −0.00025/−0.0006, normalBias 0.015/0.03 × Rr/12 |
| **Character ground shadow** | day: soft blob offset away from the sun, Y ratio .52-.74; sunset: long figure shadows | day: contact pool 0.52×0.4 m multiply `[.2,.21,.33]` + tail 0.72 m wide, length clamp(1.6/tan el, .5, 2.4) m, `[.42,.44,.62]`; golden: contact `[.24,.2,.33]` + real card shadows (cast.ts:203-222) |
| **Heads under light** | V .97 (never < .86) in every light, tinted by the light (day #f8f1ef, sunset #fddeb6, moon #b1ace7), side gradient ~14 % toward the key, top brighter, **no rim** | `cardShade`: tint mix(1,charTint,.55)/luma^.7, cast-shadow floor .86 (day)/.88 (golden), head grad min(charGrad·5.5,.4), torso bodyGrad·1.6, lavender far side, top +5 %, sun edge +4 %, gain 1.03 (~.93 V); **golden-only warm inner rim (0.95,0.52,0.16) ~2 px** (cardshade.ts:38-56) |
| **Glow / bloom** | only emissive sources; e-fold 14-21 px@720 = 21-31 px@1080; white faces/clouds never bloom; whites reach .97-1.0 | Bloom ADD, threshold 1.0, smoothing .2, intensity .5, mipmap levels 6, radius .6, mip chain on a 1080x1920 basis (first level 540x960) at any output size (Bridge.tsx:32-38); golden sun disc HDR (6.0,4.4,2.4), 1.7° radius at 900 m + additive halo 24° radius, alpha `.55e^{−(u/.25)²}+.35e^{−(u/.6)²}`, colour sunDisc×1.3 |
| **World ink** | 36/49 edges inked; ~3 px@1080 (depth jumps EW 3.09, silhouettes 3.04, creases 2.17, contacts 2.42), near-black #0b0a0c, crisp (10-90 % rise 1.45 px@720), nearly constant with distance (3.36→2.82→2.15 px); none on wall/floor joins, baseboards, sea horizon, character cards; texture seams are painted tints | `InkPass` DEF: #030303, 5.1 px at 6 m → 3.3 px at 90 m (log distance, × height/1920), creases ×0.8 from 35°→50°, depth jump 1 %→3 % of 1/z, concaveGain .7, farOpacity .95, fade 150-450 m, fog tint ×0.3 past 60 m, RMAX 9 (ink.ts:49-56) |
| **Character ink** | plum #201628-#2f1d28 (warms to #5d2c19 under orange light), ~5 % of head width, thick/thin p90/p10 2.9-3.5, thickest bottom-right (~64°); inner lines 0.6-0.9×, clothing 0.4× | INK #241726, w0 = 5u (u = W/100), `w(θ)=w0(1+0.45cos(θ−thick))` (2.6:1), `thickAngle=atan2(−sin L+0.8, −cos L)` (toon.ts:225) |
| **DOF** | on ~1/3 of screen time (CU 42 %, MS 21 %, FS 18 %, WS 24 %, inserts 46 % of frames); bg σ720 CU 4.2, MS 4.0, FS 2.7, WS 1.9 (disc radius ≈ 3σ: 12.5/12/8/5.7 px@1080); fg σ720 3.7-7.8; thin lens, saturates by ~3× focus distance; no focus pulls inside shots | `CoC = cInf·s·(1−focus/d)` (×1.2 in front, clamp 24 px), Vogel gather pre 16 taps (spread .287) + main 64 + 32 near taps (spread .958) ⇒ σ = 0.5 R; cInf hook 15, boots 14, MS 10-12, CU 14, river 16, golden sway 5, park 7, bank 8, officer 12, wides 0 → **58 % of frames blurred** (41 % at cInf ≥ 10) |
| **Foreground framers** | in 38-39 % of MS/CU (16 % of FS/WS), at 0.3-0.5 × focus distance, covering 10-25 % of a frame edge, blurred σ720 4-8 (15-24 px@1080) | only 2 entries (cart 1735-1770, bush 1411-1620) ≈ 12 % of frames |
| **Haze / fog** | fog colour = horizon; skyline ~40 % toward the horizon colour (dA .41 far vs .69 near), dark floor .15; haze colours day #94cefe, lavender cliffs #a7a3af, sunset #db9594/#d1a57c, night violet #877aea | linear `THREE.Fog`: day #b8d0ec 25→300 m, golden #efb489 50→380 m (recipe said 25→420 / 20→360) |
| **Sky** | day upper #5e93d9 (S .54) at ~20° over horizon #9fb6e6 (horizon/upper luminance 1.28); frame top #5997e2; golden horizon #ffd18a held to ~3°, upper mauve #9a7e7f (ratio 1.55); never mix blue with orange (goes grey) — rotate coral → pink → lilac | 5 stops by elevation through `untone()`: day #b8d0ec@0°, #9cbfea@3, #6a9fe0@8, #4f8cdb@16, #3373cc@40; golden #ffc47c@0, #f7ae78@4, #e8967c@10, #c4848e@20, #8a6f8a@40 (lights.ts:44-62) |
| **Clouds** | 3 tones (lit #fbf8f1, mid #e1e5f3, lavender underside #c3cbe9; golden #ffd2a8/#f2a08f/#a98fc4), lobes biggest in the middle, flat soft bottom, edge ramp 8-20 px, **no outline** (9/11) | `cloudHD` sprites (3 blurred layers), 9 planes at 620-740 m around the origin (world.ts) |
| **Water** | flat saturated gradient: lighter/cyan toward the horizon, darker near the camera (10-35 L* drop); sparse horizontal crests (far 1.5-5 %, mid ≤ 1.6 %, near ≤ 0.9 % of area, aspect 2-7) with a trough under each; no mirror reflections | shader by depression angle `f = 1−smoothstep(0,.42,dep)`, data-texture marks on 8 m / 40 m tiles blended 25-90 m, drift 0.35 m/s; **day colours reversed** (near #22a7b6 light, far #1a5596 dark, lights.ts:49) |
| **Textures** | flat colour fields; painted lines 3-5 px@1080, 0.7-0.9 × ink width, ≤ half its contrast; sunlit deck L* 72-80; timber in shade L* 27-35; iron never < L* 19 (matcap band on 25-30 %); stone C* 5-16 L* 60-73; terracotta roofs #dc8872/#c87563/#ec9c87 with 3.3 px joints, no per-tile ink; glass mid blue-violet #7b7ea0; grass #71b038; no grain | Canvas2D painters at ~1024 canvas px per UV unit: planks 1024 texels/m (8 boards per 2 m, 12 px near-black #1c0c05 gaps), stone 512/m, grass/roof/cobble 256/m, facades 72 px/m; texel rule px/m = 2954/D (vfov 36°), magnification M ≤ 3 working / ≤ 6 closest |
| **Characters** | adults 3.5 head-heights (head 1 : chin→torso-bottom 1.1 : legs 1.4), kids 2.7-3.0 with near-adult heads; bean head H/W .93, crown n 1.70, jaw n 2.26, egg −.125, asym +.10 to the facing side, tilt a few °; stroke legs .055 W, arms .05 W, ink-dot hands .08-.15 W (median .11), feet strokes .15-.25 W; no neck/ears/front nose/blush/catchlights; face luma .93, crescent to ×.88-.89; torso gradient to .55-.66; eyes .26 W apart on the centre line (lidded half-disc .18×.10-.12 W), brows .17 long at −.20 W, mouth +.19 W; ≤ 5 clothing elements; hats cover the top 25-40 % of the head; poses lean 3-8°, one arm busy | design canvas 600x1000, soles y 975, 1 unit = 0.00216 m (adult 1.68 m); `BUILD` adult {a 118, torso 1.1, legs 1.4, tw .8}, stout {118,1.15,1.32,.92}, kid {112,.85,1.0,.72}; headBlob b/a .94±.04, nTop 1.75, nBot 2.3, egg −.12, asym .06-.10, rot ±4°, noise .008; SKINS #ffe2c2 #f5c9a0 #ecd0b6 #c99067; SH_SKIN [.96,.86,.84], SH_CLOTH [.64,.66,.74]; 14 expressions; lid half-disc 0.14×0.06 W (smaller than measured, toon.ts:260) |
| **Composition** | shot mix CU 3 %, MS 27 %, FS 28 %, WS 12 %, EWS 8 %, inserts 22 %; head-top y .28 (CU) .35 (MS) .38 (FS) .50 (WS); horizon .45; camera height .79 × character (82 % eye level, ≤ 10-15 % low); fov 34-46°; frequent overheads, one-point corridors, POV, circle frames | fov 40 default (34-46), near .2, far 1500; low shots raised to 1.4 m |
| **Captions** (reference only) | 1-3 words, hard swap per word, fill #fcfcfc, very heavy sans (Montserrat Black class, a guess), black outline 2-4 px@540 + soft drop shadow, centred, box y .689-.723 H (baseline ~.716 H ≈ 1375 px@1920), ascender-baseline 2.8 % H (~53 px@1920), ~75 px em@1920, sentence case with punctuation, always on top | **none** (author rule) |
| **Pacing / content** | 31-78 s (newest shorts 56-65 s, one 78 s); a new camera set-up every ~2-3 s and a visible change (move/dissolve) about every second (35-50 big changes per 60 sheet thumbnails in the newer shorts); 6-12 locations; 2-4 light states; diegetic signs carry the keywords; explainer inserts (cut-away, blueprint, map, number grid, X-ray/HUD) in 12+ of 20; colour-coded sides; one saturated body colour + one signature item per character | 15 shots, 3 places (bridge, river, park), day → golden → day |
| **Loudness** | −14 LUFS integrated, LRA ~2.4 LU, bed only 5-10 dB under speech | −15.0 LUFS, −1.2 dBTP, LRA 2.6; music ~−10 LU under the voice per section; SFX events at naive − 6 LU |

---

## 5. Code architecture (picture)

### 5.1 Data flow per frame
```
Root.tsx <Composition id="BridgeShort" 1080x1920 30fps durationInFrames=TOTAL(2025)>
 └ BridgeShort (Bridge.tsx:105)  useKit(): delayRender until loadKit() (26 GLBs from public/bridge/kenney, errors → null)
    ├ flash overlay: f in [FLASH_AT, +4) → white at opacity 1/.75/.45/.2
    ├ background #cfe3f2 (stale, only visible on transparent frames)
    └ layersAt(f) (story.ts:69-75) → [{id,alpha}] ; crossfade: base = id−1 at alpha 1, over = id at (f−(a−x/2)+1)/(x+1)
       └ ShotView: <AbsoluteFill opacity> <ThreeCanvas 1080x1920 shadows gl={antialias:false,…} camera={fov 40, near .2, far 1500}>
          └ Inner (Bridge.tsx:49-92)  world = new World(kit)  (one per canvas; a crossfade "over" layer builds a whole new World)
             every render:  world.update(id, f, cam, scene) → look point
                            noInkFallback(world.root) ; lens.focus = max(.3, (focusPt−cam)·fwd) ; lens.cInf = dofAt(f).cInf
                            gradeFor(fx.grade, SHOTS[id−1].light) ; grain.seed = f
             <EffectComposer multisampling={4}>  InkPass → LensBlur.pre → LensBlur.main → [Bloom → ToneMapping NEUTRAL → Grade → Grain(off)]
```
- `world.update` (world.ts:349-459): `t=f/30`, `s=SHOTS[id−1]`, `tau=s.tau(t)`, `b=bridgeState(id,t)`, `L=LIGHTS[s.light]` →
  camera from `camAt(id,f)` (glides + kick) → sun from `shotSun` (mean view direction of the whole shot, cached; placed
  220 m from the look point) and the shadow box → writes the shared `TONE`/`CHAR` uniforms → sky stops, fog, water via
  `untone()` → golden sun disc/halo at 900 m → clouds face the camera → foreground props (only inside their range AND
  their shot) → `poseBridge` → smoke → `cast.stage(id,t,b,{pos,right})` → `Place[]`/`FxPlace[]` → frustum test →
  `Actor`/`Fx` cards → `pool.flush()` paints only new drawing keys → `bind()`.
- **Pure function of (shot id, frame).** No per-frame state (Remotion renders frames out of order, in parallel tabs).
- **Post order reason** (Bridge.tsx:2-7): ink before blur so lines blur with their object; bloom after blur so glows
  defocus; grade after the tone map (display-referred). `@react-three/postprocessing` merges plain Effects into one
  pass, gives CONVOLUTION effects (the lens) their own passes and never merges a `Pass` (ink). Ink inside a merged DOF
  pass gets overwritten — that was the original "no lines" bug.
- inputProps toggles: `getInputProps().post = {ink, lens, pre, bloom, grade, grain, dpr}` (all on except grain; tone
  map always on). `bridge-stills.mjs` cannot pass them (add `inputProps` to it if needed).
- Every pixel-sized parameter is given at 1080x1920 and multiplied by `height/1920` (ink widths, CoC, bloom, card rim,
  grain cell). Above ~2560 px tall, `RMAX 9` clips the near ink width and the card tiers become too small.

### 5.2 Responsibilities and key exports
| File | Key contents |
|---|---|
| story.ts | `FPS 30, TOTAL 2025, D0 6.0, HALF 27, FILES [−1.65,−.55,.55,1.65], ROW_GAP 1.3, COUNT 74, PARK [70,D0,−75]`; physics `front(tau)=26−1.6(tau−4.4)`, `marchPhase` (1 Hz, footfalls at 0 and .5), `SNAP 34.62, DROP0 36.35, DROP1 36.95, DROP_H 6.6`, `amp` table (0 @14.85 → .55 m @SNAP → 0 @SNAP+.35), `stomp` 1.0 @21.4 → 1.35 @27.4 → 1.5 @33, `shapeZ=cos(πz/54)`, `dropW`, `dropU` (gravity-like 0.6 s), `deckY`, `bridgeState`; `ShotDef {id,a,b,light,crowd,tau,towns?}`; `SHOTS`, `XFADE`, `FLASH_AT 130`, `shotAt`, `layersAt`; camera engine `glide, mix, full, run, pushK, dolly, zoom, rolled, kickAt, camAt, keyEnd (unused)`; framings `S1a…S15c` (S15c = 93 f quadratic-Bezier crane); `CAMS` (`CAMS[10]=CAMS[9]`); `DOF`, `dofAt` (cInf ramps linearly over dur, focus switches instantly), `focusAt` (unused); `FOREGROUND`; `ANCHOR`, `snapEnd` |
| cast.ts | `Pool` (key `${w}x${h}|${key}`, each key drawn once), `Actor` (card `PlaneGeometry(600·SU,1000·SU)` with soles at the origin, `cardShade(MeshLambert{alphaTest .5, DoubleSide})`, A2C off, custom depth material for shaped shadows, NOINK, renderOrder 1, `onBeforeRender` sets `CARD_K.uPx`), `Fx` (unlit / soft / multiply blob with mipmaps off, renderOrder .5), `SU 0.00216`, `tier(d)` (<3.2 m 1800x3000 k3 · <6.5 1080x1800 k1.8 · <16 480x800 k.8 · else 240x400 k.4), `findSun`, `light2D` (45° steps), `viewOf` (side view when cos < 0.57, mirror when walking screen-left, stride foreshortening in .05 steps, no back view), `LEAD, LID, lidAt, SWAPS`, `fkey` (numbers to 1/120), `person`, `blob`/`hexOf`, crowds (`column`, `sitters`, `flotsam`, `townsfolkAt`+`CHEER`, `tourists`, `officer`+`HITS`+`hammerK`, `park` with `SWING_T 1.55`/`PUSH0 48.79`), `stage()` (park hard-coded to id 12), `snapFx/splashFx/creakFx` |
| toon.ts | `INK #241726`, `SKINS`, `SH_SKIN/CLOTH/FELT` (applied in sRGB), colour helpers `mul/shade/mix` (#rrggbb only), `rnd`, `Outfit` (RIFLEMAN, OFFICER, KID, PARENT, `soldier(v)`, `townsfolk(v)`), `Pen` (`poly, ell, line, stroke, arc, dot, clip, band, shadedFill` radial crescent shift .45 r0 1.05 r1 1.25, `gradFill` flat .22, `inkRing` k .45), `blobPts` (72 points), `headBlob`, `thickAngle`, `FACE` (14 expressions: neutral, stern, grin, laugh, whistle, nervous, shock, relief, relief_open, dazed, pained, smile, smile_closed, lick), `faceFront/faceSide`, hats (`hatOn/hatBehind`: shako, shako_tall, cap, hair, tophat, bonnet), `BUILD`, `bodyFront` (march/stroll/stand/sit/fall; props icecream, carried shako, hammer), `bodySide` (march/stand/swing/push, IK), `swingKid` (700x2300 canvas, two ropes), fx sprites (`fxNote, fxBurst, fxSplash, fxStars, fxCreak, fxRing, fxSign, fxShadow` (blur 9 px), `fxContact, fxPlank, fxDrum`; unused `fxPuff, fxCloud, fxBlob`) |
| world.ts | `KENNEY` (26 names, :17-19), `loadKit` (:21-28), bridge constants (deck x ±2.5, z −30..30 sampled every .5 m, towers z ±27, chain `catY=8.5+8.1(z/27)²`, 82 posts, 41 ribs, 70 hangers, 94 pennants, 4 backstays, bolt at (−2.7, D0+.86, −37)), `SUN_SHOT` (:67), `sightLines()` (every 2nd frame of every shot, 5 rays, 9:16 hard-coded), `World` (sky sphere r 1100 BackSide NOINK, sun disc/halo, Hemisphere/sun 4096²/fill forced to 0, 9 clouds, ground batch, river shader, dynamic bridge, smoke at (−22,D0+30.6,−77) and (−80,D0+24.6,93), sign at `SIGN_AT`, swing actor, FOREGROUND), `shotSun`, `update`, `poseBridge`, `quadUp`, `wallQuad` |
| build.ts | `lam(key,make)` (two-tone Lambert cache, first call wins; `chainHD` special case ignores `make`), `toLambert` + `RECOLOR`/`GREENS` (teal Kenney materials recoloured by name), `quad/tri/boxGeo`, `Batch` (one merged mesh per material), `Strand` (box tube or real chain links, pitch 0.27 m, ≤ 440 links), `inTheWay` sight culling (module state `sight`), `VEG` → `addVeg` (round/fat/tall/cone/bush/hedge, `LEAF` palette; ignores yaw), cloth `bannerProp`, `prop`, `kitClone`, `STYLES` (8), `house` (gabled, ridge 0.42 d, eave h−.25, overhang .35) + `houseDetail`, `chapelTex`, `clockTex`, `flagTex` (St George's cross), `buildTown` (`rng(11)`: riverfront rows with fronts at |z| 36.5, main street x ±10, back rows, church, mill, 2 chimneys, factory house, 8 hills, trees, quay furniture, park) |
| paint.ts | `rng` (Park-Miller), `ctex(key,w,h,draw)` (cache, seed `key.length*131+charCode(0)`, sRGB, anisotropy 8, repeat), `rep`, `jit`, `dim`, `brickCol`; legacy painters (only `beam`, `bed`, `brick` still used); HD helpers `U, wrapX, wrap2, rr, blotch, grain, nail`; `planksHD` (2048² = 2 m), `beamHD`, `stoneHD` + `STONE_PAL` (overrides the args), `cobbleHD` (2048² = 8 m), `roofHD`, `grassHD` (#73b23d), `facadeHD` (72 px/m; floors 2.8 m, windows per floor floor(w/2.2), sill fl·2.8+.9, door slot floor(n/2)), `waterMarks/near/far` (R crest, G trough, B glint; NoColorSpace), `cloudHD` (own seed), `CLOUD_DAY/GOLD`, `chainHD` (dead) |
| lights.ts | `LightPreset` (az, el, lit, shade, lift, lambert, sideK, term, charTint, charShade, charGrad, bodyGrad, sideTint, blob*, actorShadow, top*, hor*, skyCurve*, fog, fogNear, fogFar, sunDisc, sunCol, sunI, sky, ground, hemiI, bias, normalBias; * = read by nobody), `LIGHTS {day, golden}`, `WorldLook` (sky stops c/e, water ×6 + shade, cloud ×3, bounce, sat), `LOOK` |
| shade.ts | `TONE` (`uLitCol, uShadeCol, uShadeLift, uLambert, uSideK, uTerm, uBounce, uSat`) and `CHAR` (`uCharTint, uCharShade, uGrad, uBodyGrad, uSideTint`) — **module singletons shared by every material in every canvas**; `LFB` (patched `lights_fragment_begin` writing `sunVis`; throws if three changed); `TWO_TONE` GLSL (indirect diffuse = 0; only the sun matters); `twoTone(m, liftK=1)` (cache key `twoTone5_<liftK>`; replaces any earlier `onBeforeCompile`); `neutral()` (exact Khronos PBR Neutral) and `untone()` (60 fixed-point iterations, cap .985) |
| cardshade.ts | `GRAD_K 5.5, GRAD_KB 1.6, TINT_K .55`, `uNorm .7`, `uGain 1.03`, `uPx`; head zone `smoothstep(.565,.6,v)`, head centre v .69 ± .11, torso band v .27-.57, half widths .2/.15 (standing 600x1000 adult only); golden rim auto-on when `1−charTint.b` is high; `cardShade(m)` (cache key `card9`, zeroes emissive); `blobMaterial` (dst×src multiply, polygonOffset −2) |
| ink.ts | `NOINK = 3`; `InkPass extends Pass` (needsSwap false, needsDepthTexture true): re-render world normals+depth with NOINK off and shadow autoUpdate off → mask (4 directions × r 1..RMAX 9; signed 2nd difference of 1/z for near-side depth edges; normal-angle creases at the same depth; concave × concaveGain; main-depth occlusion `zm < zc·0.985−0.03` keeps world ink off cards) → composite (1-2-1 tent AA, display-gamma blend, fog tint) → copy back; `set(options)`; `debug 1/2`; `noInkFallback` (Sprites/Points/Lines, custom-depth meshes, depthWrite-false, alpha-tested Basic → NOINK) |
| lensblur.ts | `LensBlur({maxCoC:24, nearScale:1.2})` with `.pre` (16 taps, spread .287, rot .61) and `.main` (64 taps, spread .958, 32 near taps); skipped when cInf < .25; fixed pattern, no per-pixel noise; `GrainEffect` (value noise, PCG hash, amount .025, cell 1.5 px, off) |
| grade.ts | `GradeEffect` uniforms `gradeKy[7], gradeKm[7], gradeSat, gradeTintS/M/H, gradeVig, gradeAmount`; Fritsch-Carlson tangents; BT.709 Cb/Cr basis; vignette `r=|uv·2−1|·0.7071`; presets `GRADE_DAY/GOLDEN` (dead), `GRADE_DAY2/GOLDEN2`; `GRADES`, `GRADE_STRENGTH {day 1, golden 1}`, `gradeFor` (one GradeEffect per canvas, so the grade itself crossfades correctly) |

### 5.3 Contracts between files (change them together)
- `NOINK = 3` (ink.ts) ↔ everything non-world (cards, fx, blobs, sky, clouds, smoke, sun sprites, sign face).
- `LIGHTS`/`LOOK` field names (lights.ts) ↔ world.ts, cast.ts (`CONTACT`, `LNAME`), grade.ts (`GRADES` keys). The
  `"day" | "golden"` union is hard-coded in lights.ts, grade.ts, story.ts `Light`, cast.ts and world.ts (`showSun`,
  golden Rr ≥ 30, cloud map switch, `s.light === "golden"` branches at world.ts:362, 380 and cast.ts:212).
- `dofAt` / `FOREGROUND` (story.ts) ↔ Bridge.tsx / world.ts; `FOREGROUND.kit` must be a `KENNEY` or `VEG` name.
- `SHOTS[id−1]` everywhere (ids must be 1..N in order); `layersAt` assumes the outgoing shot is `id−1`; every id needs
  a `CAMS[id]` entry; `ShotDef` lacks `sunAz/sunEl` types although world.ts:338 reads them through a cast.
- story.ts text format ↔ `bridge_shots.py` regexes (`{ id: N, a: N, b: N,`, `XFADE … = {…}`, `FLASH_AT = N`,
  `{ f: N, cut: true`, `(SNAP|DROP0|DROP1) = x`, `const KICKS … = [ … ];`).
- story.ts/cast.ts time constants ↔ `audio/timeline.py` (hand mirror); hammer `HITS` (cast.ts) are typed again in KICKS.
- One shadow-casting `DirectionalLight` = the sun = directional light index 0, its target = the camera look point
  (`findSun`, `LFB`). A second shadow caster would overwrite `sunVis`.
- Card proportions (600x1000, soles 975, head in the top third) ↔ cardshade.ts UV zones; swing card 700x2300 ↔
  world.ts `swingGeo` (`SU_SWING = 2.3/1830`) ↔ cast.ts `size [490,1610,.7]`.
- facadeHD window layout ↔ `houseDetail` sills/hoods (2.8 m floors, 2.2 m per window, sill +0.9 m).
- Chimney positions (build.ts:647-651) ↔ smoke tops (world.ts:301).

### 5.4 Render settings summary
1080x1920, 30 fps, final `--scale 1.3333` (1440x2560), h264 CRF 16; ThreeCanvas `antialias:false` + composer MSAA 4,
HalfFloat buffers, renderer tone mapping off (the composer does NEUTRAL); shadows PCFSoft 4096²; camera near .2 far
1500; cards tiered up to 1800x3000 for the 1440x2560 final; ~100 MB of GPU textures (five 2048² canvases ≈ 22 MB each
with mips); WebGL2 required (GLSL 3 arrays in ink, `uint` in grain); Canvas2D `ctx.filter = blur()` needs Chromium
(cloudHD, fxShadow). Stills: JPEG q88 via Chrome + ANGLE. Each crossfade mounts a second WebGL context and World.

---

## 6. Audio engine

### 6.1 Architecture
```
<proj>/voice/voice.wav (48 kHz int PCM) ─ load_voice(): mono → dual-mono, NO EQ/compression, pad/crop to N ─► v, v_ref = integrated(v)
<proj>/voice/words.json ─ speech_spans (merge gaps < 0.3 s) ─ duck_db: −3 dB, 80 ms pre / 120 ms post, att 70 ms, rel 450 ms
timeline.py (hand copy of story.ts/cast.ts: FPS 30, TOTAL 2025, SNAP/DROP0/DROP1, FLASH = frame 130, HITS, SWING_T,
             PUSH0/PUSHES, TOURIST_T0, SHOTS, XFADE, tau_of, AMP/STOMP, COLUMN_CAM, footfalls(), tourist_steps(),
             tourist_cam(), swing_amp_deg(), dist_fx(), hh() = same hash as cast.ts)
music.build() (15 tracks via instruments.py; ALWAYS runs) → music.render(): each track to −20 + TARGET LU, hall/yard
             reverb, HPF 30 Hz → cache _cache/music_raw.npy → × duck × section_db (MUSIC_TARGET LU under the voice per
             section, 0.4 s smoothing, hard switches at FLASH and 43.1 s) + DIPS
sfx.render(v_ref): for each Cue: gen() → pan (mono only) → cut → level match (event: max momentary; bed: integrated)
             to v_ref + naive (−6 for events) + extra → LPF → place at t − anchor → mono send → valley IR (RT60 1.1 s,
             seed 77, ×0.55) → HPF 25 Hz → fade 0.12 s → cache _cache/sfx.npy
mix0 = v + m + s → gain G to −15.0 LUFS ⇄ limiter (4× oversampled linked peak, centred 3 ms look-ahead min filter,
             80 ms release, ceiling −1.2 dBTP; ≤ 5 iterations to ±0.02 LU) → 30 ms fade → assert shape (2, N)
→ mix.wav (48 kHz, stereo, 24-bit, no dither, exactly N = TOTAL×1600 samples) + stem_voice/music/sfx.wav (at gain G,
  before the limiter) + cues.md (generated report) + ffmpeg ebur128 cross-check (optional)
```
- Pure Python 3 + numpy + scipy (`signal`, `ndimage`) + stdlib `wave`; no samples, no plugins, no network, no deletes.
  All 7 files must sit in one folder (bare-name imports). `SR = 48000` everywhere (K-weighting coefficients are the
  48 kHz set). Own BS.1770-4 meter: integrated 400 ms/100 ms hop, gates −70 abs / −10 rel; momentary 400 ms @ 10 ms;
  short-term 3 s; LRA p95−p10 (−20 rel gate); true peak via 4× `resample_poly`.
- Deterministic: music `R = rng(1831)` (+ chorus seeds 11/22/54, IR seeds 7/8); SFX `R = rng(1831)`, `rr()` sub-seeds
  in creation order, many fixed time-coded seeds (3462 = SNAP, 3695 = DROP1, 130 = flash frame). Reordering or adding
  calls changes every later random detail.
- Bridge result (cues.md): **−15.0 LUFS, −1.2 dBTP, LRA 2.6**, max momentary −9.0, max short-term −12.5; stems voice
  −15.4, music −25.8, SFX −29.1 LUFS; voice gain +1.20 dB; limiter max GR 1.45 dB on 3.53 % of samples; voice-over-bed
  margins 8.2-11.6 LU per section (water 18.1, no music); weak speech p10 margins in hook 0.7, rule 1.1, tourists 1.0 LU.

### 6.2 Level conventions
- `Cue(t, name, desc, gen, naive, kind="event", p, extra, lpf, send=.12, group, cut)`; `gen()` returns `(signal,
  anchor_s)`; `applied = naive + (−6 if event) + extra`; generator output gain is irrelevant (re-normalised), so a gain
  inside one generator (e.g. `hammer_hit(big)`) is a no-op.
- Bridge level ladder (naive, LU vs voice): biggest moment 0 (bolt snap) to −2 (splash); important hits −4..−6; medium
  actions −8..−12 (stomps −8, whooshes −11/−12); details −14..−20; beds −19 (water, music silent) to −30 (day air).
- Distance model `dist_fx(d)`: gain −14·log10(d/3.5) dB (d ≥ 3.5; stomps clamped −13, tourists −8), low-pass
  clip(17000·(3.5/d)^0.55, 1800, 17000) Hz, reverb send 0.06 + 0.45·clip(ln(d/3.5)/ln 25). 10 m → −6.4 dB, 9.5 kHz, .21;
  80 m → −19 dB, 3.0 kHz, .50. Stereo width of the column shrinks with clip(5/d, .15, 1).
- Music level per section `gain = Lv + MUSIC_TARGET − Lm`: hook −9.5, town −10.5, march −10, bounce −10, whistle −9.5,
  tension −10, sway −12, swing −11.5, march2 −10.5, rule −11.5, tourists −11 ("+3 dB music" = bed ~−10 instead of −13);
  dropout copies tension; DIPS (3.65-4.30 −3, 26.95-27.36 −2, 32.20-32.77 −4, 61.25-61.98 −3) keep quiet sentence-final
  words on top. Applied gains in the bridge: −7.6…−3.2 dB.

### 6.3 Score (music.py) — the bridge as a template of devices
Bb major, 120 bpm, quarter = 0.5 s = one footfall (= `marchPhase` grid); bars put on odd seconds so the dead stop lands
on "Then," at 33.0. Theme A 8 bars (MIDI 70-89) + pickup D5-Eb5-F5; chords Bb | F F Bb Bb | Cm Cm Eb Eb | F7 | Bb |
Eb Eb F F | Gm Gm Cm F7 | Bb; tuba oom on beats, horn pah on the &s. Sections: hook 0-4.33 · town 4.33-9 · march 9-15 ·
bounce 15-21 · whistle 21-27.43 · tension 27.43-33 · dropout 33-43.43 (silence) · sway 43.43-47.24 · swing 47.24-54 ·
march2 54-57.83 · rule 57.83-62 · tourists 62-67.5. Devices: tutti hook cut 45 ms before the white flash + "button"
chord on the flash frame; light → full band; tuba octave bounce when the bridge bounces (15.0); vamp bar for a key line
(21.0); diegetic whistling chorus (solo 22.25, 8 join 23.75-24.75, falter 29.22-29.5); F7 pedal + chromatic climb
F7-F#dim7-Gm-G#dim7 + snare roll + **dead stop at 32.985 (12 ms fade)**, silence through the disaster and the joke;
pad + vibes locked to the 0.7 Hz sway (vibes on each extreme 43.757…46.614); music-box waltz 3/4 at 116 bpm, one bar per
swing push (48.79/50.34/51.89/53.44); soft golden march reprise (6 whistlers); brass stabs + timpani I-V-I on the three
hammer blows (59.79 "rule", 60.33 "Never", 61.69 "step"); lazy swung tourist version (vibes, walking pizz, brushes),
final Bb chord at 67.0 on "tourists", fade 67.3-67.5. Track balance `TARGET` (LU vs −20): whistle 0, fife −3, glock −6,
tuba −2.5, pah −7.5, snare −5.5, cymbal −11, stab −3, timpani −5, pad −3.5, vibes −2, musicbox −1.5, pluck −4, brush −13,
triangle −15. Reverbs: hall `make_ir(1.5 s, seed 7, pre 18 ms, hf 1.4)` ×0.7; yard (whistle only, send .16)
`make_ir(0.9 s, seed 8, pre 8 ms, hf 1.8, early 110/190 ms)` ×0.8. Mood palettes from the same instruments: comic/military
= brass + snare + fife + glock; wonder = music box + glock + vibes + pad + triangle; mystery = low pad + long vibes +
timpani + minor key + low pluck; sad = pad + soft brass + sparse pluck/vibes; lazy ending = swung theme + walking pluck +
brushes.

### 6.4 Instrument catalogue (instruments.py)
| Instrument | Model, key numbers |
|---|---|
| `brass(f,dur,vel,kind=tuba/horn/stab/soft, scoop −22 c, rel .07)` | additive, ≤ 48 harmonics up to 2.4/5/7/1.5 kHz; brightness `bc=(1.8+6.5·vel·env^1.4)(×1.3 stab)`; formant bump 420/900/1100/380 Hz; attack 35/25/12/90 ms; lip scoop decays 30 ms; ±4 c drift; breath puff |
| `glock` | modal 1 : 2.756 : 5.404 : 8.933, taus scale (880/f)^.35, strike click |
| `vibes` | modes 1 : 3.98 : 9.9 (2.2 s), motor tremolo 5.2 Hz depth .25, optional damper |
| `musicbox` | tine modes 1 : 2 : 6.27 : 17.55, pluck click |
| `triangle` | 6 inharmonic modes 1, 2.71, 4.63, 6.02, 7.75, 9.4 at 1320 Hz + hiss |
| `fife` | sine + weak harmonics, 18 ms attack, +18 c onset overshoot, delayed vibrato 11 c @ 5.6 Hz, breath + chiff |
| `whistle(notes,…)` | phrase model at 1 kHz control rate: ±10 ms jitter, gate 93 %, legato if gap < 60 ms (tongued dip to .45), −70 c scoop on attacks, 16 ms portamento, 12/35 ms amp attack/release, vibrato 5.7 Hz 16 c on notes > .3 s, breath noise around the pitch (σ .09 oct), `falter` droop + fade |
| `snare`, `snare_roll` | head modes 196 Hz × 1/1.593/2.136/2.296/2.653, wires band 1.7-10.5 kHz, stick click; rolls 28 strokes/s |
| `cymbal` | 150 log-spaced partials 380-12,500 Hz, tau 1.6·(900/f)^.45, hiss, crash transient |
| `timpani` | modes 1, 1.504, 1.742, 2.0, 2.245, 2.494, pitch glide 2.5 %·vel, thump |
| `brush` | band noise 0.9-9 kHz, swish or tap |
| `pluck` | pizzicato: `|sin(πk·.17)|/k^(1.3−.6·bright)`, frequency-dependent decay, stiffness, finger thump |
| `pad` | 3 detuned saw voices (−7/0/+7 c) per note, panned L/C/R, slow LFOs, roll-off above `warm` (900 Hz) |

### 6.5 SFX catalogue (sfx_gen.py + sfx.py helpers)
| Sound | Function | Recipe in one line | Bridge naive |
|---|---|---|---|
| creak (wood/timber/chain/small metal) | `G.creak` | stick-slip impulse train through a resonator mode table (`WOOD 230-2800 Hz`, `TIMBER 95-1500`, `CHAIN 190-3400 high Q`, `SMALLMETAL 1850-6900`) | via others |
| clink / rattle | `G.clink`, `G.rattle` | 3-mode metal tick + click; random cloud of clinks (light 1.6-5.5 kHz / heavy 0.7-2.6 kHz) | −14 |
| boot / column stomp / deck flex | `G.boot`, `G.column_stomp` (30 boots flammed ±7 ms + 47-56 Hz deck boom + kit jingle, anchor .03), `G.deck_flex` | thump + plank modes + slap + hobnail | −8 / −10 |
| chain groan | `G.chain_groan` | rising chain stick-slip 20→46 Hz + 48-72 Hz moan, swells on beats | −10/−6/−4 |
| bolt strain / snap | `G.bolt_strain`, `G.bolt_snap` | high metal creak + tick; crack + two ringing halves (1760/2090 Hz, free-bar partials, Doppler drop) + thunk + jolt | −12..−9 / 0 |
| whoosh | `G.whoosh(dur, peak, f_lo, f_hi, width, tail, air)` | STFT log-Gaussian band sweeping up to the peak and back; early peak = burst (cuts), late = swell (crossfades, falls) | −11/−12/−8/−20 |
| chain whip | `G.chain_whip` | swish + rattle + clank (truncated, see bugs) | −4 |
| timber tear / wood crack | `G.timber_tear`, `G.wood_crack` | huge low creak + thickening splinter crackle; splinter burst + 52 Hz boom | −6 / −4 |
| bubbles / splash / water bed | `G.bubbles` (Minnaert plinks), `G.splash_big` (thump+slap+body+bubble cloud+spray), `G.water_bed` (flow+babble+rumble+sloshes+drips) | | −2 (×6) / −19 bed |
| voices | `G.vox` (additive source-filter, `VOW` F1-F4 table, `BWS` 85/110/160/220), `G.oof` (oof/ugh/oh/ow), `G.whoa` (unused), `G.babble`, `G.hurrah` (hur-RAH/hoo-RAY/HEY), `G.applause` | formant synthesis | −4 (12 oofs), −12/−18 groans |
| nature | `G.bird_chirps` (sparrow/blackbird), `G.crickets`, `G.breeze`, `G.flag_flutter` | | in beds |
| park / sign / steps | `G.swing_squeak` (eee fwd / aww back), `G.push_thump`, `G.hammer_hit`, `G.stroll_step` | | −12 / −14 / −5 / −9 |
| composites (sfx.py) | `_flash` (reverse swell peaking on the flash + 62 Hz whoomp), `_murmur` (N babblers men/women/kids), `_cheer` (26 hurrahs + 40-person applause), `_bounces`, `_scuffle`, `_splashes` (6 splashes 0-90 ms), `_oofs`, `_groans`, `_debris`, `_golden` bed, `amb_day` bed; `_whoas` unused | | −5 / −10 / −6 … |

Bridge cue list (358 rows): 5 beds (amb_day 0-37.2 −30, amb_water 36.95 +6.75 −19, amb_golden 43.3 +14.65 −29, amb_bank
57.7 +4.5 −26, amb_town 61.95 +5.55 −29; 0.1-0.25 s overlaps), 78 stomps (one per on-screen footfall), 56 deck flexes,
14 `whoosh_cam` (peak anchored on the cut/glide-centre frame: 48, 88, 283, 444, 534, 643, 717, 823, 987, 1062, 1685,
1770, 1905, 1962), 5 `whoosh_xfade` (first frame of each 8 f crossfade), flash stinger at frame 130, crowd murmur +
cheer on "pride of the whole town" (7.6 s), tension ladder (chain groan 28.9 → snap, swell after "groaning," 29.95,
4 bolt strains +1 dB each, 3 accelerating ticks), bolt snap = loudest cue, drop stack (timber tear peaking on DROP0,
fall_air peaking on DROP1, wood crack, 6 splashes, 12 oofs +20 ms, debris +100 ms), groans before "Unluckily", 5 sway
creaks on the sway extremes, 9 swing squeaks at the bottom of each arc (+8·log10(arc/50)), 4 push thumps on the waltz
downbeats, 3 hammer swishes + hits, 147 out-of-step tourist steps, town murmur. Design rules: lock picture first; every
on-screen footfall is a sound on the beat grid; distance sells space; whoosh on big camera changes (not on cuts that
coincide with impacts); silence as a tool (music dead stop, SFX carry the climax); layered impacts with tiny offsets;
foley locked to motion extremes; voice always on top (−6 rule + dips under quiet words).

---

## 7. The 20 reference shorts (for look study only — never copy, never publish, never name the channel)

Lengths from grade.md sample counts (every 15th frame = 0.5 s); D/G/N/I/X = day / golden / night / interior / excluded
samples. `vNN` in the reports = `shortNN`. 01 = newest. Titles matched from on-screen text (13 of the user's 16 titles
are among these; "This Tree Hates You", "What If Humans Invented Teleportation" and "Would You Upload Your Brain" are not).

| # | Title (09) | Length | D/G/N/I/X | Setting and look notes | Big changes / 60 thumbs |
|---|---|---|---|---|---|
| 01 | Why Sailors Carried Storm Oil | 65 s | 54/0/56/19/1 | sailing ship; day → stormy dusk → blue night storm with god rays → warm galley (brightest thumb .91) → storm; cook with toque, navy captain, polka-dot pirates; dutch tilts, follow-the-oil-stream move, dissolves | 43 |
| 02 | (not in list) "Milk Run 100-1" race bet with telescope signal | 64.5 s | 64/11/0/50/4 | Western town racetrack, betting parlour, deep red back room; telescope POV ring mask, circular iris transition, strong DOF | 47 (0 holds) |
| 03 | (not in list) ring town around a guarded red button | 65.5 s | 69/5/20/5/32 | concentric suburb inside a giant wall; overcast → night blue → orange dawn → green day; overheads, forced-perspective ladder, crane pull-back | 37 |
| 04 | Why the Second Draw Always Wins | 56.5 s | 63/11/10/26/3 | Wild-West street #197aef sky, sunset shoot-out, saloon poker table (red wallpaper), smartphone analogy inside the old world; low hero angles, bullet follow-cam, eye ECU match cut; strong DOF; cowboy walk is the main walk data | 42 |
| 05 | Every Memory Has a Price | 78 s | 22/0/90/33/11 | rainy night city, memory shop, pool day, golden dock, hospital; hooded buyer; macro inserts (gauge, ledger); huge cropped foreground face | 41 |
| 06 | (not in list) "Vault Buster" scratch-card pattern | 63.5 s | 0/0/0/87/40 | desk at night, lobby, store, full-frame ticket graphics, glowing number grids, map; graphic-heavy | 45 |
| 07 | What the Grave Bell Really Meant | 59.5 s | 12/31/46/23/7 | 1890s snowy village, cut-away of the ground with coffins, parlour, pink sunrise; snow night corner/centre .42; light stripe across eyes | 42 |
| 08 | (not in list) lottery clerk "Kyle" sting | 58 s | 0/4/12/89/11 | bait shop, pink-moon fantasy, teal claims office, high-key "OUR WINNERS" room (luma .74); spotlight iris (vignette .13) | 38 |
| 09 | The Job Nobody Wants in Japan | 60.5 s | 0/0/6/112/3 | green-tiled "CAREER DEVELOPMENT ROOM" with hard sunbeam, open office, night tower (sat .78, the most saturated frame) | 46 |
| 10 | The Burglar Who Only Moved Furniture | 58.5 s | 12/0/24/73/8 | suburban house; yellow kitchen + teal checker floor; top-down bed, fisheye peephole, headlamp flare; deep focus | 51 (most varied) |
| 11 | The Ancient Jar That Warned an Empire | 65 s | 14/30/26/60/0 | throne room; **realistic sculpted bronze jar/dragons/frogs with no ink**; crane over crowds, through bars, earth cross-section | 32 (26 mid) |
| 12 | Levels of Pirate Cannonballs | 63.5 s | 78/33/0/5/11 | honey deck, rock arches, turquoise sea, fort furnace, purple sunset; "levels" re-uses one deck composition | 39 |
| 13 | This Knight Found the Ultimate Loophole | 41 s | 63/4/3/0/12 | medieval market, "Pardons" stall, "Price of Sins" board, forest shafts, sunset; same stall set-up re-used; never dark | 38 (5 holds) |
| 14 | An Unstoppable Spear vs an Unbreakable Shield | 45 s | 51/3/6/30/0 | red vs teal kingdoms (colour-coded sides), "YEARS AT WAR 099", one-point path, aerial armies with haze, forge, blueprint "IMPOSSIBLE"; spear impact = the kick data | 22 (12 holds) |
| 15 | (not in list) how painkillers find the pain | 34.5 s | 0/0/0/12/57 | inside the body (red in 50/60 thumbs), "ACID SPA", "BRAIN NOT INCLUDED", receding arches corridor (ink width data) | 29 |
| 16 | The Window That Breaks Japan's Gambling Law | 45.5 s | 0/0/53/38/0 | Tokyo neon night, pachinko hall, prize counter, exchange window; tilt-shift miniature shot; corner/centre .25 | 27 |
| 17 | The Science Behind Slot Machines | 31 s | 0/0/0/38/24 | red-gold casino, machine interior, reel strip, wireframe cage; POV hand with $100, ~20° dutch, very shallow DOF; most "realistic 3D", few ink lines | 38 |
| 18 | (not in list) does time slow when scared (free-fall) | 40 s | 40/6/0/21/13 | free-fall tower, support group (least saturated .26), blueprint, flip-book POV; vertigo shots, big dutch angles | 48 |
| 19 | Why Humans Can't Pick Random Numbers | 47.5 s | 10/24/0/54/7 | desert town, accounts office, tower of numerals, golden sunset second half; magnifier circle frame; never dark | 32 |
| 20 | (not in list) Edison's steel-ball nap / hypnagogia | 39.5 s | 0/0/0/60/19 | dark stage room under one bulb (darkest sheet, luma .25), x-ray body, sleep-depth chart; locked symmetric frames | 16 (13 holds, most static) |

Style families: clean bright high-key (08, 09, 10, 13, 18, 19); rich lit 3D with bloom/rain/snow/shafts (01, 05, 07, 11,
16, 17, 02 interiors); graphic/diagram-heavy (06, 15, 20 + inserts in 14, 17, 19). Light-state palettes seen: day sky
#197aef/#368bf1; night #0d1a65 #1b2b91 #3042ba #455cdb with warm windows; sunset #f9c28b #e8ad8b #dc8549 + magenta-violet;
warm interiors #f1c166 #dc8549 #632b2f. Night-blue is used more for secret/tense beats than for "the explanation".
Faces change colour with emotion (green sick, red angry/burning). The user's own sheet of "This Tree Hates You" (in
`Desktop\yt short videos\_analysis\`, per the older digest) is the same channel and spends ~19 % of its 69 s on HUD
screens (X-ray, thermal camera, satellite "LIVE", cross-sections) — a newer look the repo's rules never mention.

Repo images: 38 frames (540x960, half the 1080 output, downscaled from 720p) at ~12 s and ~36 s; 20 sheets (whole
video, ~0.5-1.3 s apart, captions burned in). Mask the caption band (~0.64-0.76 H) before any colour statistic.

---

## 8. Rules that are the ORIGINAL AUTHOR's preferences (need the user's decision)

| Author rule (SKILL.md:18-27 and later rounds) | What the reference does / note | Decision needed |
|---|---|---|
| No captions or labels in the video | reference always has 1-3-word burned-in captions (spec in section 4) | captions on/off for our channel |
| English only | — | language(s) |
| Voice: one steady tone | matches the reference narrator | voice choice (TTS/recorded) |
| Jokes must be researched real facts | good practice | keep? |
| Standard mix: music +3 dB (bed ~−10 LU under voice), SFX −6 dB, voice unprocessed | reference bed 5-10 dB under speech | keep the trims? |
| Master −15 LUFS integrated (mix.py:20) | reference −14 LUFS | −14 or −15 |
| Final export 2K vertical 1440x2560 (`--scale 1.3333`) | reference published 1080x1920 (720p downloads) | export size (2K costs ~10 min/render) |
| "Opus max" verifier agent on every check; scores /10 per area | author's Claude setup | review process |
| Save after every step; "just do it" once the script is approved (pre-authorises autonomous rendering) | — | how much autonomy |
| Deliver with `SendUserFile` + update memory | `SendUserFile` does not exist here | delivery method |
| World ink ×1.5 thicker and pure black (5.1→3.3 px, #030303) | measured ~3 px, #0b0a0c | exact reference look or reviewer look |
| Golden warm inner rim on cards | measured: no rim | keep or drop |
| Hard cuts on big reframes (~10 cut keys) | reference almost never cuts; uses follow moves, whips, dissolves, irises | transition grammar |
| March cadence 2 steps/s (historical/sound reasons); tourists 0.8-1.5 steps/s | reference walks 2.5-3.3 steps/s | walk speed |
| DOF on 58 % of frames incl. the hook wide | reference ~1/3, wides sharp | how much blur |
| Grain off | reference has none | keep off (file size ×4) |
| 55-70 s target | newest references 56-65 s (one 78 s) | target length |

Universal craft rules to keep regardless: the script beat formula; timing everything to hand-fixed `words.json` with
reactions 0-3 f early; lock picture before sound; pixel params scale with height/1920; ink as its own pass before blur;
the measured camera/animation/colour/depth/character numbers (section 4); the readability traps (3.7); disk/TEMP care.
Reference-ethics rules (always keep): never upload/publish/send the reference videos or frames, never copy their
scripts, characters or shots, never name the channel; story, characters and voice are always our own.

---

## 9. Bugs, contradictions and gotchas

Severity: **H** = breaks output or misleads new work; **M** = visible quality issue or likely trap; **L** = cosmetic,
doc-only or dead code. "Verified" = checked against source in this pass.

### 9.1 Setup / scripts / docs
| Sev | Where | Problem → fix |
|---|---|---|
| H | repo | No Remotion project, no `package.json` (no version pins in the repo), no `src/index.ts`/`Root.tsx`, no GLBs, no voice → create them (3.0). |
| H | SKILL.md:143-151, README | Each bundle copies `public/` (~1.3 GB) to TEMP forever (60+ GB, ENOSPC) → TEMP/TMP/REMOTION_TMP on a big drive; `bridge-stills.mjs:6` only redirects TEMP when `REMOTION_TMP` is set; the final `npx remotion render` ignores `REMOTION_TMP`. |
| M | bridge-stills.mjs:11-12 | Hard-coded composition id `BridgeShort`, Chrome path `C:/Program Files/Google/Chrome/Application/chrome.exe`, `gl:"angle"`; no `inputProps` → parameterise. Line-4 comment ("C: is full… D:") is the author's machine. |
| M | bridge_merge.py:6 | `ROOT = expanduser("your Remotion project")` placeholder crashes; doc says 4 sandboxes (there are 5, incl. `mat`); folder names fixed to `bridge/bridge_<box>`; deletions not propagated; full backup copy every run. |
| M | bridge_shots.py | Output hard-coded to `out/bridge/shots.json`, no `makedirs`; fragile regexes (exact formatting); Python `round` (banker's) for kick frames while story.ts starts kicks at the first frame ≥ t (`floor(..+1e-6)`) — absorbed by the 8 f window. |
| M | short_qa.py:25-26 | Precedence bug: with no audio the whole SPECS line becomes "NONE"; usage comment says shots.json is a list but code needs `{"shots": …}`; a frozen run lasting to the last frame is never reported; ~2.5-3 GB RAM; `diff < 0.02` only catches near bit-identical frames. |
| L | sbs_sheet.py | `KeyError` if a path comes before `--ours/--ref`; `ValueError` with no images. |
| M | SKILL.md:147 | R3F clamps dpr ≥ 1: `--scale 0.5` stills still render 1080x1920 (not cheaper; pixel checks must account for the downscale). |
| L | SKILL.md:131 | "compare/CONTEXT.md" → real path `references/reports/CONTEXT.md`. |
| M | SKILL.md internal | Look targets vs final values disagree: ink ~3 px #0b0a0c (l.108) vs 5.1 px #030303 (l.94); fog 25→420/20→360 (l.115) vs 25→300 (l.88, = code); day "sky top #3e7fd2" quotes the dead `LIGHTS.top` (rendered top stop is #3373cc @ 40°); rolls 4-4.6° vs 4-5°; bean head .94 vs .93; "~15 % blue haze past 60 m" is just the linear fog (≈13 % at 60 m), no separate mechanism. "Final look values" = code truth. |
| M | STYLE_BIBLE.md:35-40 | Camera grammar wrong ("holds ~80 %", "ease-out bursts peaking on frame 1") — overturned by motion.md (10 % holds, symmetric ~23 f glides); also "frequent dutch tilts" (measured 2 %), "low camera heights" (82 % eye level), "thin outlines" (character outlines are bold, thicker than world ink), "p2 0.03-0.11 deep darks" (includes ink; non-ink p5 is .23). Missing from it: HUD/infographic inserts, in-world signs, circle frames, sweat drops, smug half-lid face. |
| M | CONTEXT.md:14, STYLE_BIBLE.md:3 | Describe 2-s/60-consecutive-frame sheets; the shipped sheets span the whole video (motion study from them is 15-40× off). Frame names `_0060/_0180` are undocumented (= ~12 s/~36 s). README:18 "full-size" frames are half size. |
| M | reports | All evidence folders, crops, measurement scripts (`references/{vids,measure,outlines,lighting,depth,grade,textures,characters,motion}/`, `fit2.py`, `run_auto.py`, `GradeEffect.ts`, `proto/paint_recipe.ts`…) are missing → no re-measuring, no grade re-fit from the repo. Report frame IDs (d01, 05_f2010…) cannot be traced. |
| M | depth.md 6.2 | Recipe snippet builds `new InkEffect()` (the broken old ink) → use `new InkPass(scene, camera)`. characters.md `bodyFrontV2` snippet rotates the head about the unrotated chin (head detaches) — shipped toon.ts fixed it. outlines.md says bloom → ink → DOF; shipped is ink → lens → bloom (safe only because threshold is 1.0). |
| L | SCRIPT_example.md | Says "~55 s"; final 67.5 s, 218 words ≈ 3.2 w/s (below 3.7). |
| M | ethics | Repo publishes 58 reference images and a source video id (`Mz72MuPgnGY`) despite CONTEXT.md:12 → never use them or traced copies in our videos. |
| L | toolchain | `npx tsc --noEmit`: 6 known harmless errors in Bridge.tsx:66-72 (local note); cast.ts:15 `LIGHTS` and cast.ts:8 `fxBlob` unused (fail `noUnusedLocals`); needs ES2017 lib (`padStart`). |
| L | Remotion CLI | The final render command has no `--gl` flag while stills force ANGLE; if headless WebGL fails, add `--gl=angle` (not in repo). |

### 9.2 Picture code
| Sev | Where | Problem → fix |
|---|---|---|
| H | shade.ts:7-17,49; cardshade.ts:70; world.ts:368-371; Bridge.tsx:76,112 | **Crossfade light leak (verified at code level; also verified by the 2026-11-09 session):** `TONE`/`CHAR` are module singletons written in React render; the incoming layer's `update()` runs last, both canvases draw later → the outgoing layer uses the incoming light at frames 1299-1306 (day→golden) and 1731-1738 (golden→day). Fix: set uniforms in `scene.onBeforeRender` per World (or a pre-composer `useFrame`), or clone uniforms per World (then stop sharing cached materials). |
| M | story.ts dofAt; Bridge.tsx:79-83 | DOF keyed by frame only: both crossfade layers use the same row (1134-1136 outgoing shot 8 gets cInf 16 on the river row; 1131-1133 incoming shot 9 is sharp; 1303-1306 outgoing shot 10 gets cInf 5). Focus switches instantly, cInf ramps linearly while glides are smootherstep. |
| M | story.ts:291-326 | DOF on 58 % of frames (41 % at cInf ≥ 10) vs target ~1/3 (verified by summing the table). |
| M | story.ts:334-348 | Only 2 foreground props (~12 % of frames) vs target ~1/3 of shots; comments at :319/:345 describe a non-existent officer bush. |
| M | story.ts:283-288; cast.ts:161-166 | `keyEnd()` unused → front↔side billboard swaps and mirror flips happen per frame, can pop mid-glide; no back view; turns are 1-frame swaps. |
| M | cast.ts:275 | **Verified:** whistle notes never show in shot 1 — `age = ((t − 21.9 + …) % 1.68)` is negative for t ≤ 4.33 s (JS `%` keeps the sign). Fix `((x % m) + m) % m`. |
| L | cast.ts:309-330 | Both flotsam shakos are off-screen in every frame of shots 9-10 (and < 2 m from the lens); comment describes pre-round-4 cameras. |
| M (plausible) | cast.ts:413, 424 | Park parent/swing kid compute painted light as mirrored while placed unmirrored (yaw π) → painted crescent/thick outline opposite the real sun used by cardShade. Check a still ~f1500. |
| L | cast.ts sitters | Expression swap at 1212 for all water sitters without a covering blink. |
| L | toon.ts bodySide | No props in side view → tourists' ice creams/shakos pop when the view flips. |
| M | cardshade.ts:17-35,49-52 | UV zones hard-coded for a standing 600x1000 adult: kids, sitters and the 700x2300 swing card get torso shading on heads and wrong rim tests. |
| M | cardshade.ts:74; shade.ts:25 | Only the `lights_fragment_begin` patch is guarded; the `outgoingLight` line replace and `#include` injections fail silently on a three upgrade; `vMapUv` used outside `#ifdef USE_MAP` (works only because every card has the 2x2 `blank` map). |
| M | shade.ts:38-40 | TWO_TONE throws away all non-sun diffuse light (point/spot/hemisphere) → no lantern/window pools on world or cards; add pool uniforms for night/interior stories. A second shadow-casting directional overwrites `sunVis`. |
| L | shade.ts:47-57; world.ts:276 | `twoTone()` replaces `onBeforeCompile` (not chained); chain material twoToned twice. |
| M | ink.ts:10-24 | Stale header comments describe the recipe (steps 1..6, 3.4→2.2 px, 0.64, ~50°, 0.75) not `DEF` (RMAX 9, 5.1→3.3, 0.8, 35°, 0.95). |
| M | ink.ts:135,173 | `depthLo` is both the depth-jump threshold and the crease same-depth tolerance (lowering it to .01 also drops creases on grazing far surfaces). |
| L | ink.ts:286,291,351 | `fogStart 60`/`fogInk .3` not settable via `set()`; fog tint only with `THREE.Fog`. `viewPos()` assumes a centred projection (no `setViewOffset`). |
| M | ink.ts:64-78 | Normal pass has no skinning/morph chunks → animated GLB characters inked at bind pose; vertex-displaced water must go on NOINK. |
| L | ink.ts:126; cast.ts:129-131 | RMAX 9 caps near width above ~2560 px tall (4K); card tiers sized for 1440x2560. |
| M | grade.ts:155,170-173 | Comments say strengths .65/.45 and day darks .1→.085; code has 1/1 and ky[1] .1. `GRADE_DAY/GOLDEN` fitted presets dead. Final curves start at black 0 (no lifted black in the curve; whether non-ink p5 ≈ .23 is reached is undocumented). |
| L | lights.ts:20-30 | Dead fields `blob`, `top`, `hor`, `skyCurve`; `sunCol/sunI/hemi` only affect Phong specular and smoke; `TONE` defaults (shade.ts:8) match neither preset; `LOOK.sky.e[0]` ignored. |
| M | lights.ts:49; world.ts:552-553 | **Verified:** day water gradient reversed vs the measurement (near #22a7b6 light → far #1a5596 dark; `wFarC` is the horizon). Golden follows the report. No report contains these hexes. |
| M | lights.ts:57; lights.ts:30 | Golden sky top stop #8a6f8a is C* ≈ 19 (fails textures.md's C* ≥ 40 rule — golden colour finished as the weakest score 5-6); golden fog #efb489 ≠ golden horizon #ffc47c despite "fog = horizon". |
| M | paint.ts:15 | `ctex` seed `key.length*131 + charCode(0)` → identical random layouts for equal-length keys with the same first letter (all `roofHD#xxxxxx`, `leafHD0-4`, many `facHDhf…`). Hash the whole key (cloudHD already uses its own seed). |
| M | paint.ts:349-361; world.ts:161-162 | `STONE_PAL` overrides caller colours for `stoneHD/towerHD/tstoneHD/wallHD/copeHD`; world.ts palettes are silently ignored → edit STONE_PAL or use a new key. |
| L | build.ts:20-25; world.ts:276-277; paint.ts:697-719 | `lam("chainHD")` ignores `make()` (map/DoubleSide ignored, `chainHD()` never painted); colour #7a8490 then overwritten with #8c847c; stale comments. |
| L | paint.ts:522/526 | facadeHD docstring 96 px/m, code 72 px/m. `roofHD` cache key ignores the slate flag (paint.ts:469). Shipped plank seams are 12 px near-black #1c0c05 and facade `INKL` rgba(40,30,40,.85) — against the measured "tint, ≤ half ink contrast" rule (deliberate, "survives mips"). |
| M | world.ts:17-28; build.ts:428-449 | 15 of 26 GLBs loaded but never drawn; `loadKit` swallows load errors and `prop()`/FOREGROUND skip missing models silently; Fantasy Town GLBs need `Textures/colormap.png`. |
| M | build.ts:238-255; world.ts:74-86 | Sight-line culling uses every camera of the film at build time and removes any house (5 rays) or prop/tree (centre ray) blocking any shot — silently; moving one camera can delete another shot's background. `sight` is module state, so `house()/prop()` outside `buildTown` are never culled. |
| L | build.ts:494, 551-554 | House cull box top `h + 0.42d + 1.2` covers the chimney box (`h+rh+1.1`) but not cap + pot (`h+rh+1.68`). |
| L | build.ts:434-435 | VEG plants ignore the requested yaw (hedges always along x); tree LOD by distance from the world origin, not the camera. |
| L | world.ts:258; build.ts:230, 645-646 | Deck side UVs upside down/squashed; box Strand 4th face mirrored; mill gables use the window facade; back walls/16 m factory stretch the 8 m side texture; flag normals not recomputed (world.ts:532-539); banner fold paint ~0.37 rad out of phase. |
| M | world.ts:67; lights.ts:26 | Golden "backlight" rule overridden on 2 of 3 golden shots (`SUN_SHOT` 11 az −70, 12 az −30/el 18). Sun halo radius 24° (~14× the disc) gives r50 ≈ 28-30 % of frame width vs measured 13-26 %. |
| L | cast.ts:206-207 | `LIGHTS.blob` unused; `CONTACT`/`TAIL` multiply colours darker and bluer than the measured day blob (Y .52-.74). |
| L | toon.ts:260; toon.ts inkRing | Lidded eye half-disc 0.14×0.06 W vs measured .18×.10-.12 W; outline k .45 gives 2.6:1 vs measured 2.9-3.5:1; report line-minimum (≥ 1.5/k units at tier .4) violated by 1.2-1.8u clothing/hair lines on far cards. |
| L | toon.ts:392; toon.ts:26-36; cast.ts:195 | `o.cap!`/`o.hair!` crash if a cap/hair hat has no colour; `mul/mix` parse `#rrggbb` only; the texture key uses `okey`, so two outfits with the same `okey` share drawings. |
| L | toon.ts:730; toon.ts fx | Comment says swing kid at 0.92 scale, code `k = 1.1`; `fxPuff/fxCloud/fxBlob` unused. |
| L | story.ts:45; world.ts:338 | `ShotDef` has no `sunAz/sunEl` → TS excess-property error if you write them in SHOTS (add to the type). |
| L | story.ts:176 | S12a push 0.001/f below the 0.0015 floor. |
| L | Bridge.tsx:63,111; cast.ts:66 | Only the ink pass is disposed on unmount; `ROOTS` and the canvas pool never shrink; each crossfade builds a full new World (heavy: dozens of canvases, ~5,700 sight rays; every Remotion tab builds its own copy); background #cfe3f2 is the old wrong fog colour. `world.update` runs in React render (would double-run under StrictMode in dev). |
| L | cast.ts:244,252 | Shot 8 soldiers switch to "stand" at SNAP+0.25 but keep sliding until SNAP+0.3. Dead: `BridgeState.collapsed`, `person().tierKey`, `Fx.soft`, `CamInfo.sun`, `focusAt`, crowd `"fall"` (logic keyed on id 8), world.ts:434 emissive branch. |
| L | lighting.md vs grade.md | Day shadow targets disagree (2:1 same hue vs 2.8-4.4:1 blue-violet); code follows grade.md; on-screen ratio never re-measured. |

### 9.3 Audio code
| Sev | Where | Problem → fix |
|---|---|---|
| H | mix.py:105-106,118 | **Verified (scipy 1.13.1 test):** a music section with no speech gets gain `Lv + target − Lm = −inf`; `ndimage.uniform_filter1d`'s running sum then turns it into **NaN for the whole rest of the curve** → NaN music → corrupt mix. Any instrumental intro/outro/pause section breaks. Fix: `if np.isfinite(Lm) and np.isfinite(Lv)` else an absolute level. |
| H | mix.py:48-56 | `cached()` reuses `_cache/music_raw.npy` / `_cache/sfx.npy` with no code/input hash (SFX levels also depend on the voice) → delete `<proj>/audio/_cache/` after ANY change. On an SFX cache hit cues.md prints planned levels in the "mix LUFS" column. |
| M | mix.py:216 | `music.build()` (all note synthesis) always runs; only `render()` is cached. |
| M | mix.py:102-120 | Section names/times hard-wired: `dropout` copies `tension`, sway switch at 43.1, hard switches `(T.FLASH, 43.1)`; a `SECTIONS` name missing from `MUSIC_TARGET` → KeyError. |
| L | mix.py:288,296,323,330 | `write_cues` text hard-coded (bridge title, "3,240,000 samples = 67.500 s", "Bb major, 120 bpm", hook footfall note). |
| M | timeline.py:75-85,149 | `COLUMN_CAM` and `tourist_cam` are rough, partly stale copies of story.ts (short eases where story.ts has 30-40 f glides or cuts; tourist crane keys 1905/1962 vs story 1890 dur 30 + 1932 cut + 93 f crane) → distance gain/LPF off by frames, tourist steps go quiet ~1.3 s early. Copy real key frames (dur 0 for cuts). |
| M | music.py:84; sfx.py:27-28,184 | Global RNG order dependence (any added/reordered call changes later random detail); `build()` reproducible once per process. |
| M | music.py:376-381 | Each track normalised over the whole film: a loud passage in one section makes that track quieter everywhere. |
| M | dsp.py:318-331; mix.py:62 | No float WAV support; voice must be 48 kHz (assert). |
| L | repo layout | Running in place looks for `templates/voice/`; `python -I` breaks bare-name imports. |
| M | sfx_gen.py:199-207 | `chain_whip` clank placed at 0.6 s in a 0.75 s buffer, clipped with no fade → likely click ~35.37 s. |
| L | sfx_gen.py:113,179 | `np.roll` delays wrap tails to the front (bolt_snap ring pre-echo ~5 %; stomp boom negligible). |
| L | sfx.py:330-335 | LPF applied after level matching → low-passed cues land under target (sway creak −1.4 dB). |
| L | sfx.py:168-172; sfx_gen.py:559 | `hammer_hit(big=1.25)` is a no-op (re-normalised); only naive −4 vs −5 makes blow 3 louder. |
| L | sfx.py:63,78,156 | "Everything stops on the white flash" — only stomps/deck flexes are cut; `bounce_first` adds two exactly-0.75 s arrays (fragile shapes); `tm > 53.95` check never fires. |
| L | sfx.py:325,342 | Pan ignored for stereo generators; reverb send is mono (ignores pan); events < 400 ms measured as energy over 400 ms (clicks pushed hotter). |
| L | instruments.py:143-145 etc. | whistle rests interpolate (comment says "last pitch"); dead params (`Band.add send`, `late={}`, `widen r`, `_env rel`, positive `brass fall` bends up, `sys` import, dropped `levels`); `_whoas/whoa`, `Cue.group`, `on_event`, `dsp.curve`, `dsp.norm_to`, `impulse_train` unused; pan-law mismatch (`dsp.pan` ×√2 vs `pad` cos/sin). |
| L | mix/cues | Hook "button" sits in the town section (gain 4.4 dB higher than the hook); low speech p10 margins in hook/rule/tourists; −15 LUFS vs reference −14; whoosh labels stale at 1685/823; hammer swish peaks 2.7 f before contact during the visual hold; motion.md:327's tourist cadence fix ((t−t0)·1.2 = 2.4 steps/s) was not applied (cast.ts:360 keeps sp/1.4). |

---

## 10. Cross-check with the older digests (`C:\Users\utkar\claude-animated-shorts-study\`, 2026-11-09)

The six older digests (`code_audio.md`, `code_characters_post.md`, `code_world_story.md`, `reference_images.md`,
`reports_motion_depth_lighting_grade.md`, `reports_outlines_characters_textures.md`) were read and compared.

### 10.1 What they had that the new slice notes missed (now folded into this file)
- Final DOF coverage is **58 %** of frames, not ~1/3; foreground props cover ~12 % of frames (sections 4, 9).
- section_db `−inf` becomes **NaN** for the rest of the curve (new notes said "−inf spreads") — verified (9.3).
- Inferred version floors: three ≥ r151 (`vMapUv`), r152 (`SRGBColorSpace`), r154 (`colorspace_fragment`), ~r162
  (Neutral tone map), but ≤ the r175 chunk text; postprocessing ≥ 6.35 (`ToneMappingMode.NEUTRAL`, `mipmapBlurPass`);
  duplicate `postprocessing` installs break `instanceof`; tsconfig ES2017 + DOM; unused imports vs `noUnusedLocals`.
- Fantasy Town GLBs may need their `Textures/colormap.png`; Nature-kit materials are what `RECOLOR` targets.
- `o.cap!`/`o.hair!` crash, `okey` collisions, `world.update` in React render (StrictMode), no back view, RMAX/tier
  limits for 4K, `addVeg` ignores yaw, `CAMS[id]` must exist, `ShotDef` lacks `sunAz/sunEl`, `lam()` keyed by name only,
  World constructor cost (~5,700 rays; per Remotion tab).
- Golden fog ≠ golden horizon; golden sky top C* 19 fails the C* ≥ 40 rule; lidded eye smaller than measured;
  textures.md (FWHM 4.1-5.8 px) and outlines.md (EW 3.1 px) disagree on world-ink width (different metrics); painted-line
  width disagrees three ways; iron "L* 16-22 in shade" comment vs the L* ≥ 19 floor; contacts missing from SKILL's ink
  look targets; "no line on wall/floor joins" rests on only 3 scans (short10_0060's kitchen shows lines on the cornice
  and baseboard, maybe convex mouldings) — use `concaveGain 0` indoors but check; textures assumes vfov 36° while the
  camera default is 40° (~11 % fewer px/m, texel targets slightly generous); report W = face fill inside the outline.
- SKILL.md directives that pre-authorise autonomy ("just do it", "SendUserFile + update memory", "Opus max verifies").
- Reference observations: night-blue is used for secret/tense beats more than for the explanation; "Well," is an
  alternative pivot word; faces change colour with emotion; colour-coded sides; circle frames; objects with faces;
  crowds of tiny copies; ceiling lamps as top-of-frame fillers; HUD inserts; the user's "This Tree Hates You" sheet is the
  same channel with ~19 % HUD-screen time; the user's "This Knight…" sheet = short13 frame for frame.
- Safety review: no network, no deletes, no `eval/exec/os.system`, one local ffmpeg subprocess; no prompt-injection
  text anywhere (comments about "CAM/CHAR/MAT/POST agent" are workflow notes).

### 10.2 Contradictions between sources and how they were resolved
| Topic | Claims | Resolution (evidence) |
|---|---|---|
| Frame names `_0060/_0180` | slice 01 and one old digest: frame 60/180 at 30 fps = 2 s / 6 s; slice 09 and old reference digest: ~12 s / ~36 s | **~12 s and ~36 s.** Shorts 15 and 17 (34.5 s and 31 s long) are the only ones without `_0180` — a 6 s frame would exist for every video; tile matching (09) and caption matching (old digest: short13 `_0060` "for hours" = 13 s on the user's sheet). |
| Sheet sampling | CONTEXT.md:14/STYLE_BIBLE.md:3 "2 s = 60 frames" vs README "60 frames each" | Shipped sheets span the whole video (caption words run first→last line). |
| Walk bob | slice 02 "2.5 % / 1.5 %" vs 06 "5 % / 3 %" | Same thing: amplitude 0.025·tall = 5 % peak-to-peak (toon.ts:453-454 comment "bob 5 % / 3 %"). |
| Bloom mip base | "pinned at 540x960" vs "forced to a 1920-high base" | Same thing: `mip.setSize(round(1920·w/h), 1920)` (Bridge.tsx:36) = 1080x1920 basis whose first mip level is 540x960. |
| Crossfade light leak | slice 05 "plausible" vs 04 "confirmed" | Confirmed at code level (evidence chain in 9.2) and verified by the 2026-11-09 session (installed SKILL.md note). |
| Golden sky colours | SKILL.md:90 "#ffc47c → #8a6f8a" vs lights.ts:30 "top #6a4f8c, hor #ffd08a" (flagged by 01) | SKILL.md is right for what renders: `LOOK.golden.sky` stops #ffc47c@0° … #8a6f8a@40° (lights.ts); `top/hor` are dead fields. For day SKILL quotes the dead `top #3e7fd2`; the rendered top stop is #3373cc. |
| Fog | 25→420 / 20→360 (depth.md, SKILL l.115) vs 25→300 / 50→380 | Code = lights.ts (25→300 day, 50→380 golden); world.ts constructor `Fog(…,25,420)` is overwritten every frame. |
| Ink | ~3 px #0b0a0c vs 5.1→3.3 px #030303 | Shipped = reviewer request ("~1.5× thicker, pure black", ink.ts:2-4). Measurement stays the reference truth (section 8 decision). |
| Composer order | outlines.md bloom → ink → DOF vs depth.md/shipped ink → lens → bloom | Shipped order works because bloom threshold 1.0 means only HDR emissives glow; check lines next to the sun disc/lamps. |
| Day shadow | lighting.md ~0.5× lit same hue vs grade.md blue-violet 2.8-4.4:1 | Both partly right (wood keeps its hue; ground/pavement goes blue-violet — short04 shows blue sand shadows). Code follows grade.md. |
| World axes | old world digest "x = across the river" | x runs **along** the river (flow +x), z across it; bridge deck along z (−30..30), near bank z < −30 (cameras, mill, park), far bank z > 30 (church). The old line's other half ("river runs along x") agrees. |
| House culling | old "culled up to the chimney top" vs new "cull box lower than the pot" | Cull top `h+0.42d+1.2` (build.ts:494) covers the chimney box (`h+rh+1.1`) but not cap+pot (`h+rh+1.68`, build.ts:551-554). |
| Inked clouds | old reference digest "puffy white inked clouds (short04_0060, short13_0060)" vs textures.md "9/11 clouds no outline" | short04_0060 inspected: soft white cloud, no ink outline → textures.md holds. |
| Character height | old reference digest eyeball "~3 heads tall, head 35-45 %" vs characters.md 3.5 HH from 15 full-body crops | Measured 3.5 HH (3.3-3.7) wins; shipped `BUILD` adult 3.5 HH. Old "outline mostly even" also loses to measured thick/thin 2.9-3.5. |
| Shot pacing | 09: "new composition every 1-2 s (35-50 big thumbnail changes)" vs old: "new set-up every 2-3 s (14-30 set-ups per sheet)" | Different metrics: big thumbnail changes include moves and dissolves within a set-up. Use both: new set-up ~2-3 s, visible change ~every 1 s (motion.md: 6 moves per 10 s). |
| Lengths | slice 01 (grade sample counts) vs 09 (tile-index estimates, ~3 s lower) | Grade counts are exact sample counts × 0.5 s → used in section 7. |
| Kick rounding | 01 "story.ts uses Math.round" | story.ts `kickAt` uses `floor((t−t0)·30 + 1e-6)` = first frame at/after the event (story.ts:270); bridge_shots uses Python `round`; motion.md's recipe used round. Harmless (8 f QA window). |
| Frames count | slice 03 "39 JPGs" | 38 (`git ls-files`). |
| Tool availability | old audio digest: numpy/scipy not installed, ffmpeg not on PATH | Outdated: numpy 2.2.6, scipy 1.13.1, Pillow 11.1.0, ffmpeg 9.0.2, Node 22.14.0 present (2026-11-10). |
| Tourist cadence | motion.md:327 recipe `(t−t0)·1.2` | Not applied; cast.ts:360 keeps `sp/1.4` Hz ("own pace kept (sound)") with on-ones quantisation. |

---

## 11. How to make a different story — checklist (file → what to change)

**A. Project and assets**
- [ ] New project folder + pinned versions (3.0); new composition id `<Name>Short`, `durationInFrames = TOTAL`.
- [ ] Rename `BridgeShort`/`BRIDGE_FRAMES` (Bridge.tsx) and the `"bridge kit"` delayRender label.
- [ ] `world.ts:17-24` `KENNEY` list + `staticFile` path; copy GLBs (+ `Textures/colormap.png`); add `RECOLOR` entries
  for off-palette material names (build.ts:33-35); new `VEG` kinds/`addVeg` branches for new plants (e.g. palms).
- [ ] Scripts: `bridge-stills.mjs` (comp id, Chrome path, `inputProps`), `bridge_shots.py` (output path + makedirs),
  `bridge_merge.py` (`ROOT`, `MAIN`, sandbox prefix), sandbox `index.tsx` (import path, id), `short_qa.py` (fix SPECS
  precedence + trailing frozen run).

**B. Script, voice, timing**
- [ ] `SCRIPT.md`: facts + sources, beat formula, ~3.7 w/s, 55-70 s.
- [ ] `voice/voice.wav` 48 kHz int PCM; hand-fixed `voice/words.json`; word → frame table.

**C. story.ts**
- [ ] `TOTAL`; replace bridge constants `D0, HALF, FILES, ROW_GAP, COUNT, PARK, ANCHOR` and physics `front, marchPhase,
  amp, stomp, shapeZ, dropW, dropU, DROP_H, SNAP/DROP0/DROP1, BridgeState/bridgeState, deckY, snapEnd` with the new
  subject's state as pure functions of `tau`.
- [ ] `SHOTS` (ids 1..N, `a/b` on word frames, `light`, new `crowd` modes, `tau` offsets for flash-forward/replay; add
  `sunAz/sunEl` to `ShotDef` if wanted), `XFADE` (6-8 f, first camera key ≥ x/2 frames before `a`), `FLASH_AT`.
- [ ] Framings `S…(f)` via `dolly`/`zoom` + `pushK(f, keyF, 0.0015-0.0035[, 0.006, 30-35])`; `CAMS` per id: glides
  18-40 f centred on words (`f = word − dur/2`, `dur ≥ 0.075 × move px@720`), `cut: true` for > 360 px / > 40 % zoom;
  rolls ±0.035-0.04 rad, "roll through level" on emphasis; lens ≥ 2 m from props; camera ~0.8 × character height;
  head-top y .28/.35/.38/.50; consider follow-object moves, dissolves and irises instead of cuts (reference style).
- [ ] `KICKS` (0.5 small, 1 snap, 1.6 slam; keep equal to cast.ts event lists); `DOF` rows (CU 12-16, MS 10-12, inserts
  10-14, wides 0, ~1/3 of screen time, focus on eyes; replace `eyes()/boots()` helpers); `FOREGROUND` (inside one shot,
  0.3-0.5 × focus, 10-25 % of an edge, recognisable, never over a face).

**D. World (world.ts, build.ts, paint.ts, lights.ts)**
- [ ] Replace `buildTown` with `buildX(root, kit, rays)` (one `Batch`, fixed `rng` seed, `sight = rays … sight = []`,
  exclusion zones); new `STYLES` palette (warm albedos — blue-violet shade turns greys lavender); `flatHouse()` if roofs
  are flat; keep facadeHD ↔ houseDetail layout in sync.
- [ ] Replace the bridge (world.ts:30-50, 247-298, `poseBridge` 461-540) with the new hero object; ground/water layout
  (world.ts:170-180, 221-245; `quadUp` needs z0 < z1, `wallQuad` y −0.6..D0); remove towers, anchorages, bolt, swing
  frame, sign (`fxSign`), smoke positions (world.ts:301), flag (`flagTex`) and banner emblem (check national meaning).
- [ ] Remove shot-id hacks: `SUN_SHOT` (world.ts:67), `id === 7/8/9/14/15` branches, creak/snap/splash fx, `CAMS[10]=CAMS[9]`,
  `bridgeState` id cases, cast.ts `id === 12` park.
- [ ] `lights.ts`: tune `LIGHTS` (az/el per light: day side light az ~75, sunset backlight az 0-40 el 3-15) and `LOOK`
  (5 sky stops by elevation 0-40°, fog = horizon colour, water 6 colours + shade or drop the river, clouds); new presets
  (night/interior/dawn) need new keys in `LIGHTS`, `LOOK`, `GRADES`, `GRADE_STRENGTH`, `CONTACT`, story.ts `Light`, and
  every `"golden"` branch; use grade.md/lighting.md night & interior numbers (night violet fog #877aea, moonlit heads
  #b1ace7, warm windows #f2d7a4, interior `concaveGain 0`, colour-replacement light patches). Local lights need new
  pool uniforms in TWO_TONE and CARD.
- [ ] `paint.ts`: new painters (rocks two-plane warm-lit/cool-shade, sand with cream pebble dabs, snow, interiors,
  matcap-banded metal) from `wrapX/wrap2/blotch/grain/nail/rr/jit`; texel density px/m = 2954/D, M ≤ 3 working / ≤ 6
  closest; unique `ctex` keys (fix the seed hash); edit `STONE_PAL` (not world.ts args).
- [ ] Fix before relying on them: crossfade TONE/CHAR leak, per-layer DOF, ctex seed, tree LOD from the camera, cloud
  ring centre if the action is far from the origin.

**E. Characters (toon.ts, cast.ts, cardshade.ts)**
- [ ] New `Outfit`s (unique `okey` each; ≤ 5 clothing elements; one saturated body colour + one signature item per
  main character); hats in `hatOn/hatBehind` (sit low over the top 25-40 %, base sag ~3u, brows −17u under a brim);
  props in `bodyFront` (and `bodySide`); poses (one arm busy, lean 3-8°, head tilt ±5°); expressions in `Expr` + `FACE`
  + eye/mouth switches; new `fx…` sprites (sweat drops, sparkles, speed lines…).
- [ ] Keep the construction: 3.5 HH adults, 2.85 HH kids, bean torso, stroke limbs, ink-dot hands, plum thick-thin
  outline, lidded eyes .26 W apart, no blush/catchlights; give named characters fixed unique head seeds (`seedOf` gives
  only 7); skins must land at luma ≥ .85 after the grade.
- [ ] Rewrite `stage()` and crowd modes; re-derive `SWAPS`, `exprMarch`-style switch times, `CHEER`, `HITS`, `PUSH0`,
  tourist `t0`, whistle base time from the new words (swap at word − `LEAD`, blink over every swap, incl. sitters).
- [ ] Talking close-ups need a new mouth-flap system (nothing exists). Turns: use `keyEnd()` to stop mid-glide pops.
- [ ] New proportions (kids, sitting, animals) → update cardshade.ts zones (head .565-.6, centre .69 ± .11, torso band
  .27-.57, half widths .2/.15, rim sample offsets) or pass them as uniforms; scale via `SU`/`scale`, not the drawing.

**F. Sound (after locking the picture)**
- [ ] `timeline.py`: FPS/TOTAL, SHOTS, XFADE, tau offsets, event constants, real camera-distance keys (dur 0 for cuts),
  motion-to-sound generators (footfalls/strokes on the beat grid), keep `fr, shot_t, shot_at, hh, easeout, dist_fx, words`.
- [ ] `music.py`: tempo `Q` from the picture's main rhythm, bar lines on key beats, new `THEME/PICKUP3/CHB/CH`, `SECTIONS`
  aligned to shots, `build()` from the devices in 6.3, `TARGET`, reverbs (room size to the world), seed.
- [ ] `sfx.py cues()`: beds per place/light (0.1-0.25 s overlaps), action cues on the picture rhythm with `dist_fx`,
  whoosh list from the new `CAMS` (cut frames, glide centres) and `XFADE` starts, word-synced reactions, a tension
  ladder → loudest hit → music dead stop; new generators for missing families (fire, engines, explosions, animals, glass,
  rain, doors, electricity) in the same style; new seeds and `desc` strings.
- [ ] `mix.py`: `MUSIC_TARGET` per section name; remove `dropout`/43.1/FLASH special cases; fix the no-speech NaN bug;
  re-derive `DIPS`; new `REPORT` rows; `write_cues` text; decide −14 vs −15 LUFS.
- [ ] Delete `_cache/`, run, check cues.md (integrated −15.0 or −14, TP ≤ −1.0, margins ~8-11 LU, speech p10 > ~2 LU),
  listen, mux, QA.

**G. Channel decisions (section 8)** — captions, language, mix trims, loudness, export size, ink/rim/cut style, autonomy.

---

## 12. Index

Slice notes (this study, 2026-11-10), all in `<ROOT>\study\repo\`:
1. `01_process_rules_scripts.md` — SKILL.md, README, LICENSE, STYLE_BIBLE, CONTEXT, motion.md, grade.md, SCRIPT example,
   sandbox entry, the 5 helper scripts; pipeline, rules, measured camera/animation and grade numbers.
2. `02_textures_characters.md` — textures.md, characters.md vs shipped paint.ts/toon.ts/cast.ts/cardshade.ts.
3. `03_outlines_lighting_depth.md` — outlines.md, lighting.md, depth.md vs shipped ink/lensblur/lights/shade/cardshade/Bridge.
4. `04_render_shaders.md` — every line of toon, ink, cardshade, shade, lensblur, grade, lights; crossfade bug proof.
5. `05_world_building.md` — paint.ts, build.ts, world.ts (coordinates, painters, town layout, bridge, update loop).
6. `06_cast_story_camera.md` — cast.ts, story.ts, Bridge.tsx (shots, framings, DOF table, crowds, word↔frame map,
   new-story timeline guide and skeleton).
7. `07_audio_music_mix.md` — dsp.py, instruments.py, music.py, mix.py, timeline.py.
8. `08_audio_sfx_cues.md` — sfx.py, sfx_gen.py, cues.md (full cue tables, SFX catalogue, sound-design rules).
9. `09_reference_images.md` — all 38 frames + 20 sheets (title map, per-short palettes, caption spec, pacing).

Older digests (2026-11-09) in `C:\Users\utkar\claude-animated-shorts-study\`: `code_audio.md`,
`code_characters_post.md`, `code_world_story.md`, `reference_images.md` (includes the user's own sheets comparison),
`reports_motion_depth_lighting_grade.md`, `reports_outlines_characters_textures.md`.

Installed skill copy (with the local-setup block): `C:\Users\utkar\.claude\skills\cartoon-3d-short\SKILL.md`.
Next study input (per the user): the videos in `C:\Users\utkar\Desktop\yt short videos` (notes folder
`<ROOT>\study\videos\`).

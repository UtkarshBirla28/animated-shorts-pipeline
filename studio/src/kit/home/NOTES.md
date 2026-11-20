# kit/home (HOME_LAB owner; LAB owner from 2026-11-19 night): NOTES + API

## V4 HANDOVER (LAB, 2026-11-20 08:55: the laptop is being switched off; a fresh team continues on another PC)
Nothing of mine is running: my last stills job was stopped (its stills slot is free). tsc 0 (kit_home sandbox) at 08:56. One new draft frame 0 from that stopped run: `studio/out/pointing/lab_v4/stills/draft/f0.jpg` (not looked at).
No RAM token held. No path outside the project folder is read by my code (all imports are inside `studio/src`).

**What exists (v4, the hook first)**
- `studio/src/videos3/pointing/v4/sets/lab_plan.ts` (NEW): the hook's clock. `HOOK` = { green, go[7], did, x, A, B, loop }
  from the v4 clock's words (`green#1`, `go#1..7`, `did#1`, `did#2`; shots found by the line TEXT: "tap your foot",
  "go. go", "did you tap", "now try again") or, while the clock still carries the older script, a PLAN of the locked hook
  (green 1.62 s, Go's 3.20 .. 5.97 s, the 7th RED, 0.5 s stillness, "Did" ~6.9 s, X ~7.5 s). `lampAt(t)` (dark / green
  flash per Go / red from Go 7), `buttonAt(t)` (the cap's glow per press), `xAt(t)` (the X's pop).
- `studio/src/videos3/pointing/v4/sets/lab.ts` (REPLACED the v3 re-export): the NEW v4 lab room, 12 x 10 m (x -6..6,
  z -7..3), windows in the left wall (sun: shot rigOpts sunAz 95 / sunEl 25), 4 ceiling panels. HER station: an orange
  desk, a yellow console with ONE big blue button (`bigButton`: the cap sinks + lights on each press), a stool; THE LAMP
  (`signalHead`: yellow housing, black visor, big lens, a halo, one point practical) on a pole + boom above-front of her.
  Behind: two rows of 3 volunteers (CAST placeholders suitA, studentA, officeRead, salaryRead, studentB, suitB) at coloured
  desks with blinking button boards (`taskBoard({ light: false })`), the researcher walking across at z -4.3, a red wall
  clock, plants. HER beats (numeric frames on HOOK): eyes wide on the lamp -> a press on each Go -> on the red the hand
  comes down and stays (`point` still at the button) -> 0.5 s later `stun` (frozen stare); the loop: `point` at the lamp
  + mouth open. The big red X: billboard at her focus distance, upper right of the frame, only in shot B.
  Cameras: `HOOK_VIEWS` A0 (FRAME 0: lamp 8-33 % from the top, her face 41-54 %, the button 57 %: all above the caption
  band) -> A1 (push-in through the Go run, rest on the red) ; B0 -> B1 (cut-in on her frozen stare, the lamp cropped top
  left) ; the loop = A0 held. `CAMS` maps each lab row of `v4/shot_plan.ts` to these by the LINE it plays (works when the
  director's new shot plan lands; until then no lab row matches and the film uses the default view).
  `PAL` at the top = stand-in strong colours until LOOK's `v4/look.ts` exists.
- `studio/src/kit/home/lab.ts`: `taskBoard({ light: false })` (a background board without a practical) + `mast` (from v3).
- Sandbox comp `KitHomeHook` (`studio/src/sandboxes/kit_home/film_hook.ts`, registered in `Root.tsx` next to KitHomeLab):
  the hook on its own clock (A, B, then the loop shot moved to 9.0-11.2 s).
- v3 untouched apart from: `sets/lab.ts` (v3) LOOK's materials (LOOK restored the table line its comment had hidden).

**Seen so far (draft stills, round 1, before the last fixes):** the green lamp reads strongly at phone size, the red
floods the room, the rows + researcher give depth. Fixed after that round but NOT yet seen on a still: the visor (was
on the bottom of the lens), a smaller halo, frame 0 composition (camera A0 + the lamp lowered to 1.86 m + the button on
a raised console, so everything sits above 64 %), A1 less close (her head was > 1/4 of the frame), the X placement,
her face "bright" (eyes wide) through the Go run (focusB read bored), the dark lens = an unlit green glass, room depth.

**The split with LOOK (approved by the lead):** LAB owns layout, props, staging, cameras of `sets/lab.ts`,
`sets/lab.cams.ts`, `v4/sets/lab.ts`, `v4/sets/lab_plan.ts`. LOOK owns `v4/look.ts` (palette, glossy candy materials, the
sun window, `signalWash()`): import it when it exists, replace `PAL` with its colours, let `signalWash()` replace the
point practical in `signalHead()` (called with the lamp position and `lampAt(t)`), and spread its `LAB_RIG` in the set's
`hints.rigOpts`. LOOK does not edit the layout or cameras.

**My rows** in `briefs/v3/pointing/SHOT_TABLE_v4.md` (the director's new table): v01-v18 and v36 (the hook = v01-v05;
the wide lab, 5 OF 12, the three again, the pointing row, 0 OF 12, the bored tapper, the kitchen, her point + tick; v36 =
the last shot = frame 0 with her arm up). The table on disk at 08:50 was still the OLD revision (v13-v24 lab); re-read it.

**Next steps, in order**
1. Draft stills of KitHomeHook: frames 0, 60, 150, 185, 215, 240, 300 (frame 0, green, mid run, the red, B start, the X,
   the loop). Check: lamp fills the top, her face medium (head <= 1/4), the button + press above 64 %, the visor on top,
   the X readable and clear of her face. Fix numbers in `HOOK_VIEWS` / `LAB4` (`scratchpad`-style projection: three.js
   `Vector3.project` with the view, as in the notes above).
2. Wire the hook to the director's new shot plan (v01-v05, v36): check `CAMS` picks them up (line texts) and that
   `lab_plan.ts` reads the real `go#k` words; if the lead wants each Go as a cut, split shot A by `HOOK.go`.
3. CAST requests: finger ready over a button; a PRESS that does not pull the eyes down (`mPress` sets the gaze to the
   button; she must keep staring at the lamp); a held press-down; the freeze (stare up, hand still on the button); the
   point up at an overhead lamp with the mouth open; a bored stare with a tapping hand. Swap the placeholders when CAST's
   new thin-line rig publishes.
4. Final stills to `pointing_preview/HOOK_v4_1_frame0.jpg`, `HOOK_v4_2_the_red.jpg`, `HOOK_v4_3_frozen_X.jpg`; message the lead.
5. Then (B) the wide lab (two rows of 12, the researcher at a big switch, a "1994" board, a counter 98-99-100, the red
   flood), (C) five hands + five X's + "5 OF 12", (D) three again + the clipboard drop, (E) the second row's pointing
   wave, (F) "0 OF 12", (G) the bored tapper, (H) her point + the green tick, (J) the kitchen fridge (`v4/sets/kitchen.ts`
   still re-exports the v3 kitchen). The room is laid out for it: widen the rows in `LAB4.rows` (12 a row).

**Render commands** (from `studio/`; stills go through the limiter, one heavy job at a time, `--conc 1` for clips):
- hook stills: `node scripts/kit_render.mjs --entry src/sandboxes/kit_home/index.ts --comp KitHomeHook --quality draft|final --stills 0,60,150,185,215,240,300 --out out/pointing/lab_v4/`
- hook clip: same with `--frames 0-260 --conc 1` (takes the RAM token itself)
- the film: `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --shots v01,v02 --conc 1 --out out/pointing_v4/`
- typecheck: `npx tsc --noEmit -p src/sandboxes/kit_home/tsconfig.json` and `-p src/videos3/pointing/tsconfig.json`


## FOR LOOK (LAB, 2026-11-20 08:50)
- The v4 lab is a NEW room in `videos3/pointing/v4/sets/lab.ts` (12 x 12 m, windows in the left wall x = -6, sun from
  -X: sunAz 95 / sunEl 25). Its colours sit in ONE block `PAL` at the top of that file (plain strong colours as stand-ins):
  swap them for v4/look.ts imports, or tell me the names and I wire them. The signal lamp's practical is in `signalHead()`
  (one point light at the lens): signalWash() can replace it; the lamp's state per time is `lampAt(t)` in lab_plan.ts.

## V4: done / next (LAB, newest first)
- 08:50 done: `v4/sets/lab_plan.ts` (the hook clock: seven Go's, green, red, X; v4 clock words or a plan), `v4/sets/lab.ts`
  (new v4 lab: the big signal lamp on a boom, ONE big button, her desk, two rows of 3 volunteers at blinking boards, a
  walking researcher, a ticking clock, plants; cameras A (frame 0 -> push-in -> rest on red), B (frozen stare + X), loop),
  sandbox comp `KitHomeHook` (`sandboxes/kit_home/film_hook.ts`). next: first draft stills, fix the framing, HOOK finals.

## FIX ROUND Block 14 / 14b (2026-11-20 03:45, LAB owner 3): the gate measures the PICTURE
The full preview's gate (`tools/v3/qa_gates.py`) read s17 / s19 as: on-screen camera 0.26 / 0.35 (want 0.5-2.0), life
0.058 / 0.106 (want >= 0.12), chroma 15.4 / 14.5 (want 18-30, "grey"). Fixed, measured on a draft clip of the sandbox
(`kit_render --frames 1356-1600 --quality draft`, then `qa_gates.py <clip> --shots=[s17 0-111, s19 141-245] --no-loop`):
| shot | cam %/f | life | chroma | shadow chroma | L* |
|---|---|---|---|---|---|
| s17 | 0.56 (was 0.26) | 0.336 (was 0.058) | 26.2 (was 15.4) | 25.2 (WARN, want <= 24) | 58.4 |
| s19 | 0.64 (was 0.35) | 0.235 (was 0.106) | 24.6 (was 14.5) | 26.3 (WARN) | 59.5 |
The blur gate still fails (0.20-0.26), as on every shot of the film (the lead: most likely the 540 px preview).
**Why the arc did not register:** the gate's camera is a similarity fit dominated by the BACKGROUND (`camdiag`: scale
0.20 = the zoom only, translation 0.10): a dolly only scales the near jars, and the orbit's yaw was cancelled by the aim
drift toward her. What moves the picture: ZOOM (fov) and a PAN that goes WITH the orbit.
- `LAB_MOVE`: r 1.40 -> 1.22, fov s17 62 -> 46 (`fov`), s19 66 -> 46 (`fovB`); s17 arc 30 deg (`arcA`) + an aim that
  starts 0.16 m AWAY from her (`driftA`, pans with the orbit; she enters from the left edge by ~1400); s19 arc 20, no
  drift (`drift[0]` 0: a drift toward her cancelled the orbit), its crane as before. The table is now 1.5 m deep
  (`LAB.table` d 1.5, zc 0.47: same far edge) so the wide starts show table, not floor. Probe (planned lens): s17 1.08 %/f (peak 1.33), s19 0.84 (peak 0.99). Film tsconfig 0 errors at 03:47.
  Cost of it: the first second of each shot is wider (the jars ~60 % of their end size; bars ~3 % of the frame height).
- LIFE: dust motes in the sun (`kfx.motes`, 650 in a box over the table + jars, lit only in the beam), the plants
  stir in gusts (amplitude x2.4). A steaming tea cup was tried and dropped (at the hold the steam sat inside the FINGER
  jar like smoke). NOTE the set's local `fx` (the FINGER jar's x) shadows a namespace import: kit/fx is `kfx`.
- WARMTH (`hints.rigOpts` + materials): sun 3600 K under the 4500 K white balance, hiTint warm / loTint cool (keeps the
  shadows near neutral), sat 1.62, exposure 1.04 (the warm table read L* 64 at 1.55), warm cream table top, the
  stock dayRoom IBL (the warm room IBL pushed the shadow chroma to 28-34). First try (3300 K, sat 1.8, warmRoom) read
  chroma 32.6, shadow chroma 34, L* 63.5: too orange.
Final stills (looked at): `studio/out/pointing/lab/stills/final/f1400 f1464 f1552 f1599.jpg`; the three
`pointing_preview/look_lab_*` stills were replaced with f1464 / f1599 / f1552.

## HANDOVER 2026-11-20 02:00 (LAB owner 3: the finishing job; nothing of mine is running, no RAM token held)
The director's clock moved at 00:47 (the real voice): s17 = frames 1356-1466, s19 = 1497-1600 (`probe.mjs table`). The lab
re-timed itself (labPlan): tinks 46.167 46.628 47.083 47.542 48.000 48.457 and 52.583 s; her call: name 50.24, snap
51.44 (frame 1543); the single tink = frame 1577; the cut to s20 at 53.37.
Kept outputs: final stills `studio/out/pointing/lab/stills/final/f1464 f1552 f1573 f1585 f1599.jpg` (s17 end - 2, the
snap + 9, the tink - 4 (ball in the air), mid-float of the bubble, the hold = s19 last - 1); logs `final4.log`,
`final5.log` (stills), `clip2.log` + `cost5.log` (draft clip, final cost). Draft clips + frame strips were deleted.
Preview stills (all three from the CURRENT build): `pointing_preview/look_lab_1_JARS_six_mistakes_just_looking_FINAL.jpg`
(= f1464), `look_lab_2_JARS_six_against_one_hold_FINAL.jpg` (= f1599; replaces the "re-render pending" file),
`look_lab_3_JARS_she_points_and_calls_bubble_FINAL.jpg` (= f1552).

**Done and checked (stills at final quality + a draft clip of s17 + s19 looked at as frame strips)**
- Typecheck: film `src/videos3/pointing/tsconfig.json` 0 errors at 00:36 and again at 01:35 after ALL of this round's
  edits (log `studio/out/pointing/lab/tsc_film.log`); sandbox `src/sandboxes/kit_home/tsconfig.json` 0 errors after the edits.
- The bubble: pops at her RIGHT on the snap (clear air right of the FINGER rod; tail to her mouth), floats LEFT then UP
  and lands over her head between the two plates with its tail turned DOWN (two textures cross-faded,
  `bubbleTex("left" | "down")`). Hold f1599: clear of both plates. In the float (about 5 frames round f1585) it touches
  the FINGER plate's lower-left corner.
- Her point and call are in view (s19): the lens now starts LOW and cranes up after the snap (`LAB_MOVE.hB / lookYB /
  riseQ`, use B only): during the call her head is UNDER the FINGER plate, seen through the empty jar's glass, instead
  of behind the plate. The lamp stands on its own post at her left as the lens sees her (`taskBoard({ mast })`): her
  arm goes sideways to it, toward the middle of the frame (f1552: green lamp, her hand at it, the bubble at her right).
  After her last press the lamp goes out (a lit lamp sat on the EYE jar's rim at the hold). Fixed on the way: a later
  trial lit the lamp red 0.15 s BEFORE her press (the held green now goes first in the trial list).
- The balls settle: `ballSim({ pile: { w: 0.12, e: 0.45 } })` (a ball that has landed is held by the wall and the balls
  under it; the one-pass solver used to treat it as free and swallow the bounce). Balls 3-6 now clack, hop 2.3-2.7 cm
  and roll into their pocket in ~0.4 s (seen in the clip); ball 2 lands on ball 1 while ball 1 is still finishing its
  own hop, so it only clacks and slides (5 frames). Same zigzag rest (countable); the 6th ball's hop peaks with its
  centre 6 mm under the rim (nothing leaves the jar). The SIXTH is still moving at the cut to s18 (8 mm above rest).
- The glass: (a) a rim glint (`glassJar` `rimK`: a thin additive torus on the bead, brightest toward the sun);
  (b) a REAL soft shadow: the wall casts into the sun map through a stochastic depth material (`ditherDepth`: 14 %
  face-on .. 80 % edge-on), so PCSS gives a light veil with darker edge lines, hard at the foot, softer away; the drawn
  multiply strip is off (`glassShadow({ mul: false })`), its caustic lines stay; (c) a hint of refraction (`jarGlass`
  `refrK` 0.4: toward the silhouette the room env is looked up along the refracted ray and covers the straight
  background): the jar edges now read as thick bent glass (her face fades into it at the edges).
- Cameras (`node briefs/v3/pointing/director/probe.mjs cams`, new clock): s17 median 0.568 %/frame (p90 0.601, peak
  0.613), s19 0.625 (p90 0.686, peak 0.689), still 0. In budget (>= 0.52, peak < 4.2).
- Thumbnail (270 px wide, f1599 and f1464): EYE plate and the hand + speech-bubble plate both readable, the two TRIES
  bars read as the same full bar (s17: full vs empty), six vs one countable. The hand plate is the weaker of the two
  (its fingers merge at 270 px; the dotted bubble carries it).

**Not done / next steps**
1. Requests L-1, L-2, L-3, ALL-1, CAM-1 are done in the code; `briefs/v3/pointing/SHOT_REQUESTS_v3.md` (director's
   file) may still list them OPEN.
2. s17: her eyes still sit behind / just under the EYE plate for most of the shot (s17 keeps the old high start; a low
   start there would put her face behind the growing ball column). Untouched.
3. If more polish is wanted: the 6th ball could land one pulse earlier (seenBeforeCut) so its settle finishes on screen;
   ball 2's settle (needs ball 1 to rest sooner, e.g. a lower floor restitution for the first ball's second hop).

**Traps (still true)**
- Stage coordinates vs world: cards / props / practicals take WORLD (`S2W`). The board is turned PI in the stage: its
  local +x is stage -x (the lamp post `mast.x 0.3` stands at stage x vx - 0.3).
- `LAB.volunteer` (x -0.05, z -2.62, seat 0.40) is tuned to both arcs AND to the s19 crane: move her and re-check
  the call frames (snap + 9) and the hold on stills.
- `LAB_MOVE.arc` under 18 degrees drops the shots under the 0.52 %/frame floor. The s19 crane adds a little speed.
- `ballSim` is chaotic in its options: `pile.w` 0.05 / 0.2 / 0.3 and other sleep thresholds give anything from 7 cm
  hops to none and can break the zigzag rest; probe the tracks in Node before changing (the probe used here bundles
  `kit/home/lab.ts` + `jars.ts` + `lab.cams.ts` with esbuild and prints rebound / settle / rest per ball).
- f/4.5 or smaller; 650 lm panels; the window z0; `sets/lab.ts` loads CAST as `../cast/member` + `../cast/moves`;
  `CAMS_lab` keys `v3_s17 v3_s19 s17 s19` only (see the older notes below).
- The director's clock moves: the frame numbers above are from 00:47. `probe.mjs table` before any still.
- This shell mangles quotes / backslashes in heredocs: write edit scripts with the Write tool, raw strings.

STATUS (LAB owner, 2026-11-20 02:00, script v3): the lab is ONE picture (the two counting jars), used twice: shots s17
and s19 of `videos3/pointing`. Built, looked at in draft and final stills, cost measured (below).
The night kitchen is OUT of this film: its modules (`clock.ts`, `keys.ts`, `door.ts`, `kitchen.ts`, `night.ts`,
`sets/kitchen.ts`) are parked exactly as the first owner left them (built, 10 draft framings rendered once, never
looked at closely, never final-rendered; `night.ts` still has the old "never 0" lamp workaround, harmless).

## Files
| file | what |
|---|---|
| `util.ts` | seeded rng, `rboxG` / `rboxC` (rounded boxes, metre UVs + wear attrs), `latheG`, `tubeG`, `cylG`, `merge`, `mesh`; procedural micro maps cached per tab: `peelNormal` (orange-peel paint / enamel), `brushedNormal`, `roughMap` (blotches, fingerprints, scratches); `pbr()` (MeshStandard / Physical with micro detail + its own program key), `glow()`, `canvasMat()`, `contactBlob()`, `kick()` (damped spring response); NEW `boxEnv(ctx, spec)` (a box room seen from one point as a PMREM: what glass and glossy things reflect) + `ownEnv(mat, env, k)` (a material's own environment, switched off while CORE bakes the GI cube) |
| `jars.ts` | NEW, the counting jars: `jarGlass()` (the glass material), `glassJar()`, `glassShadow()` (the jar's shadow + caustic lines on a sunlit top, follows the live sun), `jarStation()` (plinth + TRIES bar + pictogram plate on a retort stand + jar; `setBar(k)`), `drawPictogram()` (EYE / POINTING HAND + SPEECH BUBBLE / hand alone), `dropsForImpacts()` (release times so every ball's first tink lands on its cue). 2026-11-20: `glassJar` opts `shadow` (stochastic wall shadow, `ditherDepth`), `rimK` (rim glint), `refrK` (refraction hint, via `jarGlass({ refrK })`); `glassShadow({ mul: false })` = caustic lines only |
| `lab.ts` | `workTable` (K-P23; `plain: [r, g, b]` = a clean satin top instead of the speckled laminate), `taskBoard` (lamp `lamp(t)` 0 off / 1 red / 2 green / 3 yellow + a 50 lm practical, off = `set(0)`; buttons `press(i, t)`; `mast: { x, z, h }` = the lamp on its own post beside the box), `cable`, `cableCover`, `ballSim` + `redBalls` (baked rigid-body sim, pure in t; `rimGuard`; `pile: { w, e }` = a landed ball is held, so later balls bounce off the pile; own environment), `staticBalls`, `ballTray`, `whiteboard`, `binderShelf`, `pinboard`, `ceilingPanel` (rect practical), NEW `wainscot` (a panelled dado + rail), `conduit` (surface wiring + a socket box). The first build's `glassJar` (transmission glass + paper label) and `caustic` are gone |
| `clock.ts` | `wallClock(ctx, { pos, yaw, radius, rim, time0, face })`: real ticking second hand (60 ms step + overshoot), minute / hour hands, digits face, domed glass |
| `keys.ts` | `keyRing(ctx, { pos, yaw, kicks, inLock, charm })`: 3 keys + the emerald train charm on a ball chain, a 2.1 Hz damped pendulum per kick + per-item lag |
| `door.ts` | `apartmentDoor(ctx, { origin, yaw, at, w, h, thick, open(t), keys, keyKicks, hinge })` (K-P18) -> `{ leaf, leverWorld(t), keysPivot }` |
| `kitchen.ts` | `counterRun`, `gasHob` (K-P15, knobs `knob(i, t)`: 0 = straight UP = OFF), `rangeHood` (K-P16), `hoodLamp`, `kettle` (K-P25), `fridge` (K-P17), `dishRack`, `coirMat`, `coatHook` |
| `night.ts` | `nightCity`, `curtain`, `headlightSweep`, `moth` |
Film files of this owner: `videos3/pointing/sets/lab.ts` (the set), `sets/lab.cams.ts` (layout `LAB`, the camera
`LAB_MOVE`, the timing knobs `LAB_CUES`, `labPlan()`), `sets/kitchen*.ts` (parked). Sandbox: `sandboxes/kit_home/`
(`KitHomeLab` = the lab set alone on the film's clock; small bundle, no other owner's set in it).

## Conventions
- Every builder returns a Group in its OWN local frame (documented in its header); the set places it. Walls: local
  z = 0 the wall plane, +z into the room (the SURFACES room frames). Counter: x along the run, +z the front.
- Everything that changes is a pure function of film time t (no Math.random / Date); seeded noise only.
- Every material sets its own `customProgramCacheKey` ("home:*"); big surfaces use the SURFACES registry.
- No text: digits on clock faces, pictograms only.

## The counting jars (script v3): what the picture is
Two glass jars on a sunlit white table. Over each jar a white plate with a black pictogram: an EYE (just looking), a
POINTING HAND with a SPEECH BUBBLE (pointing and saying it out loud). In the front of each plinth a plain TRIES bar: a
round-button pictogram, a glowing fill, an end mark, no digits; both bars fill to the same mark (the same number of
tries). Six red balls drop into the EYE jar, one into the other. The volunteer is soft behind them at her box (one
lamp, three buttons): she only looks and presses in a fast run (s17), then points at the lamp, hand to the ear, snaps
(a speech bubble with the hand pictogram pops) and presses (s19). No researcher, no words, no chip.
- **Glass without three's transmission pass** (`jarGlass`): the reflection at full strength over the scene behind
  (blend ONE / ONE_MINUS_SRC_ALPHA), alpha from a fresnel term (clear in the middle, dense at the outline), a darker
  optically-thick edge, a tinted body in the thick base, inner + outer wall (two edge lines), a bead rim, a punt base.
  What it reflects is `boxEnv`: the lab itself from the jars' place (the sun window with its bars at the left edge of
  each jar, a second window behind the lens as the tall soft highlight, the ceiling panels on the rim, the sunlit
  table from below). The first build's transmission glass came out as milk under the rig's gradient IBL.
- **The balls** are 7.2 cm in a jar 13.3 cm wide inside: they can only sit left, right, left ... (a zigzag column), so
  all six stay visible and countable from the front; one ball in the other jar is unmistakably one. `ballSim` is the
  first owner's rigid-body sim (gravity, restitution 0.42 on glass / 0.45 ball on ball, Coulomb friction, rolling,
  1/1200 s steps, 240 Hz tracks). Each ball is released over the ball before it, 16 mm toward its own side: it lands,
  takes a small bounce and drops into its pocket; the first ball of a jar bounces ~12 cm and rolls to the wall. The
  wall also holds a ball up to 3 radii above the rim (`rimGuard`): nothing can leave a jar, nothing teeters.
- **(Before 2026-11-20 02:00; now `pile` gives balls 3-6 a 2-3 cm hop, see the handover) The pile was honest physics, so later balls clacked into place with little bounce** (a ball wedged between the wall
  and the ball below has nowhere to go). The visible motion per ball: 4-5 frames of fall with motion blur, the clack,
  a shove of the ball below; the single ball of the FINGER jar has the real bounce (two hops, a short roll).
- **Light**: rig interiorWarm with the set's own `hints.rigOpts` (exposure 1.55, haze 0.0004, bloom 0.3 at threshold
  1.35, IBL "proc:dayRoom" at 0.11, gi 0.9, contrast 0.33): the stock interior rig (exposure 2.4, haze 0.0028, bloom
  0.5) washed the first drafts out. The sun is the key (a three-quarter backlight at the end of each move), two 650 lm
  ceiling panels (rect practicals) fill the fronts; with 5200 lm panels the sun's shadows vanished (a rect light at
  that size out-shines a 7.2 sun on a table top).
- **Light budget**: sun + 2 rect practicals + the box lamp (a 50 lm point practical) + the room kit's 2 bounce point
  lights. 31 lit programs, compile 9-12 s per render tab.

## How the lab is timed (and re-timed)
Nothing is a typed film second. `labPlan()` (sets/lab.cams.ts) reads `videos3/pointing/timeline.ts`:
| event | rule |
|---|---|
| use A / use B | shots `s17` / `s19` (their cuts are the director's rules on "tested", "looking", "when", "one") |
| the six tinks of the EYE jar | on the melody's pulses (`EV.melody0 + k * LAB_CUES.pulse`); the SIXTH is the first pulse inside "looking..." (at least `seenBeforeCut` 0.25 s before the cut to s18), the five before it one pulse apart |
| her fast run (18 presses), the EYE bar | from 0.12 s after the cut to 0.04 s before the sixth tink; the bar steps on every press |
| her call | arm straight on "pointed", the snap + the speech bubble on "loud" (CAST's own call clock: ear 0.4 s before the snap) |
| the single tink of the FINGER jar | the first pulse inside "one" (on the plan 0.67 s before the cut to s20: the bounce and the hold are seen) |
| the FINGER bar | fills to the same end mark from 0.2 s after the cut to 0.5 s before that tink |
Release times are solved per ball (`dropsForImpacts`: the sim is re-run up to 5 times; error under 4 ms), because a
ball that lands on the pile falls a shorter way than the first one. Knobs: `LAB_CUES` (`pulse` = the melody's pulse,
today 5.5 s / 12 like the caption layer's music note; `eyeImpacts` / `fingerImpact` = explicit film seconds that win
over everything, e.g. the mixed track's own tinks). The set logs the resolved plan once per render tab:
`lab plan {"tinks":[...six + one...],"releases":[...],"settled":[...],"presses":[first,last,n],"fillB":[..],"call":[name,status]}`
= the SOUND cues. On the script's plan: tinks 47.51 47.97 48.43 48.89 49.35 49.80 and 53.93 s.

## The camera (sets/lab.cams.ts `LAB_MOVE`)
(2026-11-20: s19 now also CRANES: lens 0.98 -> 1.07 m, look 0.93 -> 0.887, held low until q 0.42 then a smoothstep; see the handover.)
One framing family, used twice: each shot is a 20 degree arc round the jar pair that ENDS SQUARE on the jars, with a
slow push-in (distance 1.40 -> 1.22 m, fov 51 -> 46, lens 1.13 -> 1.07 m high). s17 comes round from the left (the
EYE jar near), s19 from the right (the FINGER jar near). Measured with the director's probe (CORE camSpeedStats):
s17 median 0.59 %/frame, s19 0.60, peak 0.64, never under 0.55. The volunteer sits on the axis behind the pair, so the
arc brings her in from the left behind the EYE jar in s17 and from the right behind the FINGER jar in s19; she ends
in the gap between the jars both times. f/4.5: the pipeline's 8 lens samples show as 8 ghost copies of every sharp
line in the background at f/2.4 (see gaps).
Frame at the end of each move (1080 x 1920): plates 12-24 % from the top, jars 26-58 %, bars 59-65 % (the caption
band 67-75 % is below them), each jar ~26 % of the frame width, both bars inside 12-88 %.

## Measured (GTX 1660 Ti, ANGLE / D3D11, the PC shared with other renders; sandbox `KitHomeLab`)
| what | number |
|---|---|
| final sub-frame (1080 x 1920, 8 sub-frames), `kit-prof`, 9 stills | 19.2-22.2 ms: main pass 13.8-17.2, sun shadow 1.7-4.0, AO 2.0-5.8, shafts 0.5-4.6; post 1.3-2.0 once per frame; CPU updates 1.5-1.9 ms per sub-frame. A final frame = ~0.19 s in the page (budget 4 s) |
| final, 2026-11-20 02:00 (after the rim glint, the stochastic wall shadow, the refraction hint, the lamp post, the 2-face bubble): `kit_render --frames 1540-1555 --quality final`, 2 tabs | steady 1.04 s per frame wall (3.28 s/frame incl. bundle + page start for 16 frames), page render median 106 ms per frame (= ~13 ms per sub-frame; max 1.9 s = the first frame with compile). Budget 4 s per frame: in. No `kit-prof` split this time (the frames path does not print it) |
| final still, wall | 23-63 s each incl. page start (bundle 35-40 s once per run; the long ones while other renders ran) |
| draft still, wall | 20-43 s each |
| set build | 2.1-7.2 s (19-23 s twice, when another process held the CPU); the two ball sims take 0.2-0.3 s of it (measured in Node) |
| shader compile per tab | 9-12 s (31 programs; 1 dir, 3 point, 2 rect) |
| GI probe | 125-165 ms |
| typecheck `npx tsc --noEmit -p src/sandboxes/kit_home/tsconfig.json` | 0 errors, 1 min 40 s |

## Honest gaps
- **Refraction is a hint only** (`refrK`): the edge band shows the box-room environment along the refracted ray, not the real
  scene behind; the middle of the jar is still straight see-through. (Older note:) The glass shows what is behind it undistorted.
  Reflections, edge lines, the rim and the base carry the read. A real jar bends the picture near its edges.
- **(Fixed 2026-11-20: the wall casts a stochastic real shadow; the strip is off, the caustic lines are still drawn)** The glass shadow was a drawn strip (`glassShadow`: a multiply strip with edge lines + additive caustic lines along
  the sun's direction), not light traced through the glass. It is subtle at this exposure; rim + base cast real shadows.
- **Depth of field ghosts.** With 8 sub-frames the lens blur is 8 copies; at f/2.4 every sharp line behind the jars
  (the dado rail, her ink outlines, dust motes) showed as 8 lines / a ring of 8 dots. The lab uses f/4.5 (the volunteer
  is only a little soft) and has no dust motes. REQUEST to CORE: rotate the lens samples per frame (grain, not ghosts).
- **Ball 2 still only clacks and slides** (ball 1 is mid-hop under it); balls 3-6 hop. The pile creeps 1-4 mm in the
  first second of s19 (sub-pixel per frame). The 6th ball is still settling at the cut to s18.
- **(Fixed 2026-11-20, see the handover; it touches the FINGER plate's corner for ~5 frames mid-float)** The speech bubble was behind things for a moment: it pops beside her mouth in the gap between the jars, slides
  behind the EYE jar's top as the lens arcs, then is meant to float up between the two plates for the hold (its last
  places are not yet seen on a still: in the last finals it ended half behind the EYE plate).
- **(Fixed 2026-11-20: the s19 crane + the lamp post, see the handover)** Her "point" phase was at the right edge of the frame in s19 (she comes in from the right with the arc); the ear
  hold and the snap are seen through the FINGER jar. In s17 her eyes sit just under the EYE plate for about a second.
- The window's jamb and a plant show at the left edge for the first second of s19 (bright, soft): wanted as a daylight
  cue, but it is not there in s17.
- The walls are the room kit's plaster under sage paint: a few stains read as marks on a lab wall (soft behind the jars).
- (2026-11-20: a draft clip of s17 + s19 was rendered through kit_render --frames and looked at as frame strips.) Not rendered as motion: stills only (the lead runs films). The ball motion was checked as numbers (the sim's tracks)
  and in stills at a fall frame and at rest, not as a clip.
- The film path (PointingKit) was checked with stills of s17 / s19; the volunteer is driven from the set (her own
  beats on CAST's moves, numeric cues), not from CAST's `BEATS_V3` rows for "volunteer" (those can go).
- The kitchen is parked and unpolished (see the status line).

## Requests to other owners
- DIRECTOR: export the melody's pulse from `timeline.ts` (today `Captions.tsx MELODY_PULSE_S` and `LAB_CUES.pulse` are
  the same number typed twice). The lab is built for the shot rig `interiorWarm` with `sunAz 95 / sunEl 25`.
- CORE: per-frame rotation of the DOF lens samples (above).
- SOUND: the tinks are in the page log line `lab plan {...}`; the single ball's tink is the "brighter" one.
- CAST: `beats.ts` "volunteer" rows and `actVolunteer` are no longer used by the lab.
- SURFACES `room()`: a `doors[].leaf: false` option (the parked kitchen hides the kit's closed leaf by bounding box).

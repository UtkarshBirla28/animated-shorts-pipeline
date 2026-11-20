# V2 HANDOVER (look director, 2026-11-20 08:55; the project moves to another PC)

State: no render running, my stills slot released, my orphan bundle deleted, `npx tsc --noEmit -p
src/videos3/pointing/tsconfig.json` = 0 errors. Every path below is relative to `studio/` unless it says otherwise.

## Done per set (my numbers: `measure/measure.py` metrics on a 540x960 copy, caption band masked; target beige/grey
< 15 %, vivid (C* > 40) > 25 %, chroma ~30; his films 31-34 chroma, 8-12 % beige, 31-45 % vivid)
| set | state | numbers (chroma / beige / vivid) |
|---|---|---|
| lab | PASSES (preview, with my placeholder lamp + button + wash in the lookdev) | hook frame, lamp green 45.0 / 6 % / 66 %; lamp red 33.2 / 14 % / 26 % |
| platform wides | pass-ish (final) | A 34.8 / 12 % / 57 %; B 30.9 / 17 % / 39 % |
| car interior | wide passes chroma, beige high (white ceiling) | A 34.6 / 28 % / 37 % (final); B 8.8 / 66 % / 4 % = a CAMERA problem (ceiling + pole) |
| modern cab | improved, not passing | A 21.9 / 33 % / 13 %; B 24.6 / 8 % / 11 % (preview) |
| NY station | improved, not passing | A 22.6 / 27 % / 6 %; B 25.1 / 27 % / 10 % (preview, before the tile sat 1.4 + selfLit 0.9 + warmth 0.25 edits, which were NOT rendered yet) |
| kitchen | not passing | 23-24 / 39-49 % / 13-16 % (preview, before the wood carcass + cobalt backsplash edits, NOT rendered yet) |

## The agreed split (lead approved, relayed to LAB)
- LAB owns the LAYOUT of `src/videos3/pointing/sets/lab.ts`, `v4/sets/lab.ts`, `sets/lab.cams.ts` (staging, props,
  cameras). LOOK owns materials, colours and lights. My edits in `sets/lab.ts` are all marked "LOOK v2" (teal wall,
  blue floor, blue table top, exposure 1.35, motes hidden, one props block: 4 posters + red clock + coloured bins
  that LAB may move or delete).
- LOOK owns `src/videos3/pointing/v4/look.ts`; set owners IMPORT it. Same pattern for STATION (New York, lines 19-21)
  and TRAIN (cab / platform / car / steam).
- `v4/look.ts` exports: `LAB_PAL` (wall, wallBand, trim, wallTint, floorTint, floor, candy[6], boardFace, boardFrame,
  chairs[4], lampGreen, lampRed, lampOff, lampHousing, lampVisor, button, buttonRing, buttonBase, posterBg,
  posterInk, clockRim, pot), `LAB_RIG` (the lab's rigOpts under interiorWarm: spread into the lab's hints.rigOpts),
  `candy(hex, {rough, clearcoat})` (glossy clear-coat material), `glow(hex, intensity)` (emissive lens),
  `signalWash(ctx, { pos, target?, colorAt(t), gainAt?(t), lumens?, kind?, range?, shadow? })` (ONE coloured point
  light that washes the room; tested: lumens 3800, gain green 0.42 / red 1.3, lens glow 2.2), `NY_PAL` (tile tints,
  trainSelfLit 0.9, poster colours, line-bullet colours), `NY_RIG`, `DAY_GRADE`, type `WashOpts`.
- The working lab-hook example (how LAB should wire it): `src/videos3/pointing/lookdev/film.ts` `labHook`.

## Next steps, in order
1. LAB: build the real hook (big signal lamp top of frame, the young woman at one big button under it) with
   `candy()` / `glow()` / `signalWash()` + `LAB_RIG`; then LOOK re-measures the real v4 lab shots (target above).
   Still open in the lab: coloured chairs, candy button boards, plants, a warm window with blue sky.
2. New York (with STATION): render the pending edits (tile sat 1.4, train selfLit 0.9, warmth 0.25); then a red
   quarry-tile platform floor instead of the grey concrete (`kit/subway/station.ts` line ~55 `concrete_floor` tint
   [0.72, 0.7, 0.67]), the ceiling tint ([0.34, 0.32, 0.3]) lighter, coloured line bullets on the cars (NY_PAL.bullets),
   warm tungsten pools (the long rect per row is in; add 1-2 warm spots over the action).
3. The modern cab + the train at the sunny platform (line 11): cab A still has cream lineside apartments and a grey
   ceiling patch; render the cab after the house recolour (houses.ts WALLS / ROOFS) at final.
4. The kitchen (line 10, a morning fridge scene): it was lit as night; move it to a morning rig (golden through the
   window) and render the pending edits (wood carcass, cobalt backsplash, red doors, teal wall).
5. The car interior only through the front window (line 11).
6. TRAIN's steam stills: check them against the same numbers when they land in pointing_preview.

## Commands (from `studio/`)
- Lookdev stills (every set from a wide lens under the film's clock; frames = platform 1211 / 981, car 303 / 744,
  cab 152 / 1690, lab 1411 / 1549, kitchen 822 / 908, NY 1036 / 1101):
  `node scripts/kit_render.mjs --entry src/videos3/pointing/lookdev/index.ts --comp PointingLookdev --quality preview|final --stills 1411,1549 --out out/pointing/look_v2/<name>`
  (stills land in `out/pointing/look_v2/<name>/stills/<quality>/f<frame>.jpg`; ~30 s each at preview, NY ~70 s).
- The sheet + numbers: `PYTHONNOUSERSITE=1 ../tools/.venv/Scripts/python.exe -s out/pointing/look_test/measure/sets_sheet.py <stills dir> ../pointing_preview/LOOK_v2_sets_sheet.jpg --refs`
- Whole-video metrics: `out/pointing/look_test/measure/measure.py`; the look test pairs: `measure/pairs.py`.
- Note: the last final sheet (`pointing_preview/LOOK_v2_sets_sheet.jpg`) is from pass 1 for most sets; the lab, cab,
  NY and kitchen improvements after it are in the preview folders `out/pointing/look_v2/{cab2,p3,p4,lab2,lab3}`.

## Backups and outside paths
- Backups of every file I touched (original state before my first edit): `out/pointing/look_test/_backup/<same path>`
  (restore = copy back). New files of mine: `src/videos3/pointing/v4/look.ts`, `src/videos3/pointing/lookdev/*`.
- Paths OUTSIDE the project folder my work reads: the reference videos `C:\Users\utkar\Desktop\yt short videos\new_2026-11-19\`
  (measure.py VIDS) and the research notes `C:\Users\utkar\research_notes\ricksclips\`. The reference frames used by the
  sheets are already extracted inside the project (`out/pointing/look_test/measure/frames/`). No textures outside.
- Caution for anyone editing: a `//` comment appended mid-line silently cut code twice in this session (PAL line in
  `kit/vehicles/mats.ts`, the work-table line in `sets/lab.ts`; both fixed). Put comments on their own line.

---

# LOOK PLAN: from the look test to the whole film (look director, 2026-11-20)

Every file below was copied first to `studio/out/pointing/look_test/_backup/<same path>` (restore = copy back).
Nothing was committed. Typecheck (`npx tsc --noEmit -p src/videos3/pointing/tsconfig.json`) is clean after every edit.
Test stills: preview rounds `r1/`, `r2/`, `r3/` (+ `r*_pairs.jpg`), final quality `final/stills/final/`.

## 1. What changed (file, setting, old -> new)

### Light and grade
| file | setting | old | new | why |
|---|---|---|---|---|
| `src/videos3/pointing/sets/jp_platform.ts` | `JP_RIG` (all 4 presets now spread one `VIVID` block) | warmth 0.6-1.3, fog 0.003, haze 0.0003-0.0008, sun 7.2 (golden's), sunRGB golden [1, 0.86, 0.69], skyLevel 0.22-0.26, bgK 0.68-0.75, grade = golden (sat 1.9, contrast 0.24, hiTint [1.012, 1, 0.975], loTint [0.985, 1, 1.02]), sunEl 15-16, exposure 0.76-0.88 | warmth 0.1, fog 0.0012, haze 0.0001, sunIntensity 9.0, sunRGB [1, 0.9, 0.76], skyLevel 0.2, bgK 0.68, sat 1.75, shadowSat 1.5, contrast 0.36, gradeExpo 1.18, hiTint [1.015, 1, 0.975], loTint [0.95, 0.99, 1.07], bloom 0.32 / threshold 1.2, sunEl 19-20, exposure 0.66-0.76 | whites stay white, the sun is the golden thing, shadows go sky-cool, no veil, more punch |
| `src/videos3/pointing/shots.ts` | `CAB_FACE` (s03b) gets `VIVID_CAB`; `rigOpts` type widened to allow tint triples | { sunAz -35, sunEl 11 } (+ the cab set's warmth 1.2) | + warmth 0.15, exposure 0.8, haze 0.0002, contrast 0.36, sat 1.8, shadowSat 1.5, the same tints | the cab close-up was cream on cream |
| round 1 / 2 values tried and dropped | | | warm hiTint [1.035, 1, 0.94] + sunRGB [1, 0.84, 0.64] + skin #fdf2e6 | faces went PEACH (249, 206, 154) and the train cream; round 3 is the fix |

### World
| file | setting | old | new |
|---|---|---|---|
| `src/kit/vehicles/mats.ts` | `PAL.emerald / emeraldDark` | #16573b / #0d3d29 | #0e7a47 / #0a4a2b (a clear emerald) |
| `src/kit/vehicles/mats.ts` | `skyEnv` (what the stainless car mirrors) | zenith [0.2, 0.3, 0.5], horizon [0.6, 0.59, 0.56] | zenith [0.1, 0.24, 0.62], horizon [0.42, 0.55, 0.74] |
| `src/kit/vehicles/mats.ts` | `PAL.cream` (cab walls) / `PAL.deskGrey` (console) | #e2dccd / #34363a | #b5cdc8 pale mint-grey / #4a5662 blue-grey |
| `src/kit/vehicles/train_jp.ts` | stainless `steel` roughness | 0.8 | 0.45 (glossy panels) |
| `src/kit/vehicles/dims.ts` | `bandY0` / `lineY0..1` | 0.62 / 0.565-0.595 | 0.40 / 0.345-0.375 (the band is 40 cm, was 18 cm) |
| `src/kit/rail/tokyo_platform.ts` | `TP.slab` | tint [0.87, 0.88, 0.89], sat 0.28 | tint [0.92, 0.64, 0.5], sat 1.0 (terracotta) |

### Characters (cast/member.ts and cast/people.ts only; fits.ts untouched)
| file | setting | old | new |
|---|---|---|---|
| `cast/member.ts` | `CAST_LOOK` | gain 0.68, keyK 0.6, tintK 0.22, floorK 0.5, floorBackK 0.7, ceilK 1.5 (rim / form = kit default 1.0 / 3.2 px / 1) | gain 0.8, keyK 0.85, form 1.2, wrap 0.3, tintK 0.3, floorK 0.4, floorBackK 0.6, ceilK 1.6, rim 1.7, rimPx 4.4, shadeSat 0.45 |
| `cast/member.ts` | `CAST_SKIN` | #eef3fb (cooled for the warm rig) | #f7f5f3 near white |
| `cast/member.ts` | `DRIVER_LOOK` | (no gain) | + gain 0.66 (his close-up blew out) |
| `cast/member.ts` | `castCardOf` card `pos` / `yaw` | `o.pos`, `o.yaw` (sampled per SUB-frame) | read at the FRAME time (`frameT`): no intra-frame card motion = no see-through ghosts on fast moves (lead's request) |
| `cast/people.ts` | `LOOK_TOURIST` + `TOURIST_FIT` (new) | tee #bfc8d6, rib #8591a8, jeans #4f7fc4 as a band of 0.2 head heights, cap #6c2a27 | violet tee #6a3fc6, rib #3f2380, indigo jeans #2f5a9e up to 36 % of the torso, cap #b0282a, NEW YORK printed light |
| `cast/people.ts` | `LOOK_MUM` + `MUM_FIT` (new): trench, sleeves, held arms | trench #d8c3a0 beige | raspberry #b0405e |
| `cast/people.ts` | `backHairLayer` (new) on the tourist | back view = skin disc under the cap with a brown band | short brown hair over the back of the head under the cap, strands, nape |
| `cast/people.ts` | `CROWD` (new): 8 commuter specs (salarySleep, salaryRead, suitA, suitB, studentA, studentB, lateSalary, waitC) | suits #2e3340-#4a4d56 = black blobs from behind | mid-value navy / slate / grey / teal / burgundy / green / school blue coats |

Checked at final quality (`final/stills/final/f133, f138, f305, f845`; sheet `glitch/_after_four.jpg`): the
tourist is SOLID on the fast moves (f133, f305, f845 were see-through in the final) and his back view at f138 shows
hair under the cap. s13 f1001 (`glitch/f1001_pair.jpg`, preview): the passer-by who crosses on "CHECK!" is a teal coat
now, not a black blob; his hair from behind is still a very dark disc (the driver's back-of-head in s03 was NOT
re-checked; his cap from behind is drawn by `uniformCap`, so the "no cap" there is most likely the cap out of frame
or out of focus, not missing art). Side effect of the frame-time card place: a character riding the moving train
(the boy behind the glass in s22-s24) is now sharp while the window around him is motion-blurred: at the train's
glide speed that is a few pixels; look at s23 once at final.

### Cameras (test only; each one is a framing decision for the director / STATION to keep or not)
| file | shot | old | new |
|---|---|---|---|
| `sets/jp_platform.cams.ts` | `V3M.frame0.d0` (s01 + s24) | 5.53 | 7.0 |
| `sets/jp_platform.cams.ts` | `s08` | pos x -1.98 / -1.76, y 1.0 | -2.75 / -2.55, y 1.05 |
| `sets/jp_platform.cams.ts` | `s16a` | dist [3.0, 2.8], fov [55, 49] | dist [3.3, 3.1], fov [64, 58] (dist 4.4 put a vending-machine bottle and a canopy beam in front of the lens: round 1) |

## 2. What must still change to carry the look through the film

**Global (do once):**
- Car interior (s02, s04, s05, s10 and every look into the car: s07, s08, s11, s12, s14): the car set still has warmth
  1.0 in `car.ts hints.rigOpts`; set warmth 0.15-0.3 + the VIVID tints there, keep exposure. Give the interior one
  colour accent the eye can hold (the seat moquette `PAL.moquette` #245240 is already green: make it visible in
  frame; a warm 3800 K ceiling strip at a visible level). The laminate / ceiling stay white, NOT cream.
- Cab (s03, s06, s21): apply `VIVID_CAB` to `CAB` and `CAB_B` too, and LIFT them: s03 / s21 sit at L* 38 against 51-60
  around them (audit). Target L* 48-52: exposure s03 1.3 -> ~1.6, s21 2.1 -> ~2.5 under the new grade (test first), the
  mint-grey walls help. Drop the out-of-focus dust specks in cab shots (they read as lens dirt).
- Lab (s17, s19): the `interiorWarm` rig is still the old warm look: bring the same tints (hiTint / loTint), contrast
  0.34, warmth 0; recolour the olive wall to a clean light colour with one accent; dress the bare peach table that
  fills the bottom 45 % of s17 (a tray, papers, the jar labels) or raise the lens.
- One warmth for all neighbours: the per-shot hand warmth made s09 / s22 cool (b* 3.6) and s20 orange (b* 27.6).
  With VIVID every platform shot shares one white balance; check b* per shot after the re-render stays within
  +-5 of its neighbours.
- Sky in frame: today 34 % of frames show sky (his: 68-91 %). Platform lenses that look at the car side from
  standing height should rise or tilt so the top 15-25 % is sky over the train roof wherever the framing allows
  (s07, s09 / s22, s11, s13, s23, s24).
- Characters smaller and simpler (owner: "big figures with moving arms look glitchy"): no head over ~1/3 of the
  frame except the two deliberate close-ups (s01's punch-in, s03b), and prefer heads at 0.15-0.22 in medium shots.
  A smaller figure also hides the simple drawing and makes every arm move cover fewer pixels (less visible
  jitter). The crowd back views are still dark suit blobs (crowd atlas, cast/crowd.ts: not done in this test).

**Per shot (camera pull-back / widen so the scene breathes):**
| shot | head now | do |
|---|---|---|
| s01 / s24 (frame 0) | 0.28 -> 0.45 at hook B's punch-in | d0 7.0 kept from the test; keep the punch-in as the one deliberate close-up |
| s02 | 0.30 | widen ~15 % or pull back 0.5 m so the packed car shows |
| s03b | 0.45-0.5 | deliberate close-up: keep; give it a background with colour (the green lamp / the line through the windscreen at frame edge) |
| s04, s05, s10 | 0.22-0.30 | pull back 0.4-0.6 m; s05 / s10 must show the "packed" car (the audit: the car is empty) |
| s08 | 0.2 + a door pillar filling 25 % | test camera kept (pulled back 0.77 m); the tourist is still half out of the right edge on "BAD SUITCASE." (needs a small re-aim right) |
| s13, s14 | 0.22-0.25 | pull back 0.5 m |
| s16a | 0.25 | test camera kept (wider lens) |
| s16b | 0.40-0.45 | pull back to ~0.25 (dist 2.8 -> 3.4) or make it the punch it is meant to be with a background that has colour |
| s18, s20 | 0.2-0.25, s20's boy off frame with a pole arm | widen 10 % (audit) |

## 3. Cost to re-render

Measured on the last final (`out/pointing_final_B/shots/final/render_log.jsonl`): 26 shots, 1913 frames, **41.7
minutes** wall at final, conc 1 (1.31 s / frame including each shot's ~10 s start). Every change above is in a file
that is part of EVERY shot's hash (kit/core is untouched, but kit/vehicles, kit/rail, cast and the platform presets are
shared), so the whole film re-renders: ~42-45 min at final + the concat / mux, after a preview pass (~12 min at
preview, 0.5 scale) to check exposure continuity across cuts. Test stills cost ~35 s each at preview and ~60-90 s
each at final (each still rebuilds its set: 20-35 s of shader compile).

## 4. Honest gaps in the test

- See `pointing_preview/LOOK_TEST_before_after.jpg`: frame 0, the doorway and the wide are clearly more alive; the cab
  close-up (f200) only moved a little: the face is cleaner, but the frame is still a cream face over a dark navy body
  with little behind it. That shot needs a background with colour, not a grade.
- The car interior seen through the door (f595) is still mostly white / grey (chroma ~17-22): the interior set was
  not recoloured in this test (beyond the mum's coat).
- The stainless car side reads white now, not cream, but it still does not visibly MIRROR a blue sky the way his
  car paint does: the reflection is soft. A clear-coated painted body (a real colour, low roughness) would do it;
  stainless with brush marks never will.
- The characters are still flat cards with thick outlines; the rim / key help, but the gap to his "sit in the light"
  is shadows ON the cards (window bars, canopy stripes) and contact shadows, which this test did not touch.
- CAST was editing poses during the test, so poses differ between the before and after frames (not caused by me).

## 5. V2: every set in the vivid look (2026-11-20, look director): log

Lookdev film (renders any set from a wide lens under the film's clock, placeholder figures in the parked sets):
`src/videos3/pointing/lookdev/` (film.ts, Root.tsx, index.ts; comp `PointingLookdev`). Sheet:
`pointing_preview/LOOK_v2_sets_sheet.jpg` (+ `.json` numbers), script `look_test/measure/sets_sheet.py`. Backups of
every file touched: `look_test/_backup/` (as before).

- V2 done (pass 1, all checked by tsc): train = glossy painted pearl-white body (`train_jp.ts` steel: rough 0.16, metal 0,
  sky env 1.3) + emerald lower body (`dims.ts` bandY0 -0.02, line 0.80-0.835); car interior (`interior_jp.ts`): floor
  #c47a45, walls #cfe2f2, seats #2453b8, priority #d9542e, blinds #6fb0e6, saturated text-free posters; car + cab set
  rigOpts warmth 0.2 / 0.25 + vivid tints; `shots.ts` CAB / CAB_B / LAB take the vivid grade; cab PAL cream #8fd0bd,
  desk #2d5f78, laminate #a9d8e8; lab walls teal, floor blue, table blue; kitchen teal walls, red doors, wood floor,
  wood-tone worktop (`kit/home/kitchen.ts`); NY station light budget fixed (`kit/subway/station.ts`: glow-only fixtures
  + one long rect per row: compile 60-75 s instead of a 240 s timeout), teal lower tiles, red band.
- V2 numbers after pass 1 (final quality): platform A/B vivid 57 / 39 %, car A 37 %: PASS-ish; car B, cab A/B, lab,
  kitchen, NY: FAIL (vivid 0-16 %). Note for the director: car B (beige 66 %) is a camera problem (ceiling + pole).
- V2 next: cab (sky + green in the windscreen, coloured console light, a sun patch), lab (coloured objects), NY (warm
  light pools, yellow edge, coloured train bullets, posters), kitchen.
- V2 done (pass 2): cab: mint walls #5cbfa3 / lining #62c2a6, sky-blue ceiling #86b9e6, red seat, warm floor, NO motes
  (`cab.ts`), green lineside (`lineside.ts` lawn tints + grass tint/dry), colourful lineside houses (`houses.ts` WALLS /
  ROOFS). Cab A 21.9 / beige 33 % / vivid 13 %, cab B 24.6 / 8 % / 11 % (preview). Lab: text-free posters, a big red
  clock, coloured bins (`lab.ts` LOOK v2 block), deeper blue floor; motes cut (lab 650 -> 160, car 1400 -> 350, NY
  1400 -> 400); NY: posters + rigOpts (sat 1.85, contrast 0.34, exposure 3.3), deeper teal tiles.
- V2 next: measure lab / NY / kitchen after pass 2; then the kitchen (white cabinets + worktop dominate).
- V2 done (pass 3, v4 split agreed with LAB via the lead): `v4/look.ts` (LOOK-owned; LAB_PAL palette, LAB_RIG grade,
  candy() / glow() materials, signalWash() = ONE coloured point light that washes the room green / red, NY_RIG,
  DAY_GRADE). Motes hidden in lab / car / NY / cab (V4 rule 3). Bug fixed: a LOOK comment had hidden the lab's work-table
  line (restored). Lab hook placeholder in the lookdev (big lamp on the back wall, button pedestal, volunteer, wash):
  lab A (green) chroma 26.2 / beige 13 % / vivid 23 % (nearly passing); lab B (red) 22.3 / 12 % / 7 %.
- V2 next: wash retune (point light, gain green 0.55 / red 1.3, lens emissive 2.2), then NY with STATION (NY section of
  look.ts), then the platform/cab shot, the kitchen.
- V2 done (pass 4): LAB PASSES at preview: lab A hook (green) chroma 45.0 / beige 6 % / vivid 66 %; lab B (red wash)
  33.2 / 14 % / 26 % (wash = point light, lumens 3800, gain green 0.42 / red 1.3; lens glow 2.2). NY: NY_PAL in
  look.ts, train selfLit 0.5 -> 0.9 (`sets/ny_station.ts`).
- V2 next: final-quality stills of lab / cab / kitchen / NY -> the sheet; NY + kitchen passes.

# "Why Japanese Train Drivers Point at Nothing" (pointing): DETAIL BIBLE notes (plain words)

## v3 changes (DIRECTOR, 2026-11-19 night): READ THIS FIRST, everything below it is the v2 plan
The script was rewritten and LOCKED at 22:35 (`sound/pointing/SCRIPT_v3.md`, `script_v3/shot_outline_v3.json`,
`verify_final.md`). `bible.json` is RE-CUT to it; the v2 bible is kept as `bible_v2.json` (also `lint_v2.json`,
`validate_v2.json`). Sections 1-10 below still describe v2: use them only for what did not change (the look, the four
sets that stay, the character specs, the kit requests of those sets).
- **What the film is now:** ONE thread: a tourist's yellow suitcase rides away on a Tokyo train while he stands on the
  platform. Frame 0 shows the outcome (hook = candidate B), the body is candidate C. 131 spoken words, 25 lines, plan
  about 65 s (never over 70, never time-stretched).
- **25 shots, 4 places** (`s01 .. s24` with `s16a` / `s16b` = the outline's ids without `v3_`): the island platform
  (station A = s07-s09, station B = s11-s16b, s18, s20, s22-s24 and s01), the packed car (s02, s04, s05, s10), the cab
  (s03, s06, s21), the lab jars as ONE picture used twice (s17, s19).
- **OUT of the film:** New York (station + car), the night kitchen, the lab wide + the researcher, "Speed... check!",
  the thumbs-up, the phone-screen picture and its record UI (K-K1 is not used), the "-85 %" chip, the press counters,
  the lamp above the door. Their set files stay in the repo; the film does not reference them (`film.ts` sets: cab,
  car, jp_platform, lab). New York and the stove are in the pinned comment (SCRIPT_v3 section 9).
- **Frame 0 and the loop:** s01 = the tourist on platform B, stunned, his straight arm landing on frame 2, the fingertip
  at the yellow suitcase behind car 1's sliding door window. s24 is the SAME camera set-up one shot length earlier, so
  the loop is one continuous shot; the film ends 0.10 s after "gone.", 2 frames before the arm's lock-out lands. On
  this platform the train leaves to screen LEFT (the outline's frame mirrored: digits on signs forbid flipping).
- **Two hook exports as a film prop** (`film.ts`, `inputProps.kit.hook`): A = one shot to the first cut, B = a same-axis
  1.25x punch-in on "He is not.". The lead picks after the audit of the rendered openings.
- **Timing is not typed anywhere.** `studio/src/videos3/pointing/timeline.ts` turns the voice's words into the cuts
  (the script's own rules: cut 1 in the silence after "not.", cut 2 one frame before "finger" ...), the shared events
  `EV` (doors, lamps, glide, melody) and the loop length `L`. It reads `words.ts` when VOICE has written it and the
  plan (`plan_words.ts`) before. `shots.ts` is hand-written on it (do NOT run `new_short_v3.py --shots`). The bible's
  `est_t0` / `frames` are a print of that clock: after a re-time run
  `node briefs/v3/pointing/director/probe.mjs json briefs/v3/pointing/director/timeline_v3.json`,
  `node briefs/v3/pointing/director/probe.mjs cams briefs/v3/pointing/director/cams_v3.json`,
  `python briefs/v3/pointing/director/make_bible.py`, then the validator.
- **Cameras** are the set owners' v3 cameras (`sets/<set>.cams.ts`), measured with CORE's camSpeedStats on the REAL
  film (`cam_speed.mjs --film`, what the validator runs; per shot in `camera.measured`). `film.ts` adds the director's
  layer where an owner's camera is still under 0.25 %/f (a slow arc / push round the owner's framing) and tilts the
  frame-0 lens so the fingertip and the suitcase top clear the caption band. Planned freezes: none needed any more
  except the script's holds (see each shot's `camera.freeze_reason`).
- **Captions** are the script's own chunks (SCRIPT_v3 2.2 + 5.5) in `Captions.tsx`: 1-3 words, the narrator in sentence
  case, every character line in CAPS, the phone's replay in CAPS at 80 % with a phone pictogram, the last line small
  and lower-case, digits "1,000" / "6" / "1", call-outs build with the gesture, a music-note pictogram while the
  departure melody plays. The first caption ("His bag") is on screen from frame 0.
- **Fact + culture guards and sources** are SCRIPT_v3 section 6, copied into `bible.json` (`fact_guards`,
  `culture_guards`, `sources`). What changed against section 10 below: the door order is sourced from ja.wikipedia
  車側灯 + 鉄道合図 (the JTSB report only for "the conductor works the doors"); the number is cited to the labour
  ministry page (2.38 % / 0.38 %, four set-ups, shown as a ratio with two equal TRIES bars, no digits, no chip); the
  narrator never says "at nothing"; the green lamp is on screen beside the fingertip before the tourist speaks;
  "Doors..." is heard over the platform, never on the driver; ONE door speed (1.3 s); the boy is with his mum in every
  shot he is in.
- **Seven beats that must read at phone size** (each gets a full-size storyboard still and a verdict in
  `DIRECTOR_NOTES.md`): frame 0 with the 0.25 s flash test, shot 2's jump back in time, the no-look foot hook, the
  catch at the door, the boy's second point, the tourist's 0.7 s look that does not see, the two TRIES bars.
- **Open work** is not in this file: `SHOT_REQUESTS_v3.md` (per owner and shot id) and `DIRECTOR_NOTES.md`.
- **Validator (decide stage, 2026-11-20 00:05): PASS, 0 fail, 23 warn**: 25 shots, 42 framings, 64.9 s, one framing every 1.55 s. Camera on the film's REAL cameras: 0.54 %/f (camSpeedStats(film)); shots faster than 1 %/f: 7 % of the time (target ~30 %); still: 0 %. The warnings: the voice is not locked yet (F1); the film camera median is under the 0.7 target (WARN band 0.5-0.7); kit names without a published catalog entry (the train, the suitcase, the vending machine, the jars: all built, `tactile_paving_jp` / `brushed_stainless` are surfaces the rail kit made itself); three script-mandated shots under 1.2 s (s14 the boy's second point, s18 the cutaway, s21 the cab hold); close shots of the tourist over the 35-60 % subject band (s01, s02, s16b, s24); the 4-word-looking caption 'has 1,000 people' (3 chunks of text for 4 spoken words). Command: `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/bible_validate.py briefs/v3/pointing/bible.json --json=briefs/v3/pointing/validate.json`.

---

Planner, 2026-11-19. The source of truth is `briefs/v3/pointing/bible.json` (every field per shot). This file is the
same plan in plain words for the builders, SOUND, the kit owners and the owner at Gate 1. Script: `SCRIPT.md`
(= `sound/pointing/SCRIPT_v2.md`, locked for voice, lint PASS). Cameras were measured with CORE's `camSpeedStats`
on the planned presets (`cam_plan.json`; request in `cam_plan_request.json`). Validator: `validate.json`.
Nothing was rendered for this plan (no stills): the storyboard (A4) is the next step.

## 0. Status and numbers
- Validator (decide stage): **PASS, 0 fail, 16 warn**. Command: `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s
  tools/v3/bible_validate.py briefs/v3/pointing/bible.json` (also PASS with `--cam=briefs/v3/pointing/cam_plan.json`).
  The warnings: voice not locked yet (F1), 22 kit names that do not exist yet (all marked `new`, listed in section 6),
  4 surfaces that do not exist yet (tactile_paving_jp, tactile_domes_us, subway_tile, brushed_stainless), and 4 shots
  under 1.2 s on the linter's timing (s06, s07, s20, s21). Those 4 get 1.35-2.25 s once the voice gaps in section 7 are in.
- **22 shots, 34 framings, 7 sets, 4 light states.** On the linter's timing: 67.4 s, one framing every 1.98 s. With
  the voice gaps the shots add up to 73.9 s on the linter model; at James's real pace that is about **68.5 s (E gaps only)
  to 70 s (E + N)**. That is about 3 s longer than SCRIPT v2's own estimate (61-66 s). Section 7 says what to drop first.
- Camera: film median **0.74 %/f** (his 0.72; ours used to be 0.18-0.35). No shot is under 0.15 %/f. The peak is 1.54 %/f
  (the owner's calm cap is 4.2). 15 % of the time is faster than 1 %/f (the research target is ~30 %; kept lower on purpose
  for the owner's "not too fast"). There are no whips, and the only dissolve is into the kitchen.
- Life: 98 moving things over 22 shots, with at least 4 in every shot. 62 acting beats are keyed to words.
  There are 120 sound events, and every audible action has one (the validator checks this).

## 1. The 10 decisions that matter most
1. **Frame 0 = the thumbnail:** we look through the tourist's PHONE (red record dot, 00:12) and the cab partition glass.
   We see the driver's right profile and navy cap, and his WHITE glove mid-snap, silhouetted against the green embankment
   (not the sky). He points at a tiny green signal dot at the vanishing point of a dead-straight track. The boy's cheek
   and small pointing hand press on the glass at the lower left. The low sun comes from ahead-right and puts the glove in
   full sun. Face, glove and window are all in one frame (panel fix 8).
2. **The real cab gesture, timed to the words.** On the NAME word ("Signal") the arm is straight and the index finger
   points. On the held beat the hand draws back beside the right ear (8 f, a loose fist). On the STATUS word ("green!")
   the arm snaps out again (6 f): a crisp stop, a 4 % overshoot, then a hold. The eyes lead every point by 3 f. The boy
   copies 6 f late, with his tongue out. The same rhythm is used for every call-out, the tourist's mock and the boy's
   "Bag... check!".
3. **No platform doors.** We show a generic commuter line with an emerald stripe, not the Yamanote, where most stations
   now have platform doors. JR East says 162 stations by line have them; its Tokyo-area target is 330 by FY2033. So a
   platform without them is normal for many Tokyo lines. A second barrier between the lens and the doorway would also hide
   the bag at phone size.
4. **No Japanese text anywhere.** We use only pictograms, digits and arrows (platform "1" in a circle, prices, km posts,
   a stencil "117"). There are no logos, no brands, no route letters and no kana car numbers. The only words on screen
   are "NEW YORK" on the T-shirt, the captions and the "-85 %" chip. The departure melody is our own original.
5. **Real door logic, with a plant and a payoff in one identical framing.** The doors close, then the small RED car-side
   lamps go out, then the cab lamp lights and the driver calls it. s07 (the plant) and s20 (the payoff) use the same
   knee-high lens along the car side. The payoff adds the oblivious tourist in the foreground and the yellow bag behind
   car 1's door glass, with the boy pointing at it.
6. **Colour ownership.** The suitcase is the ONLY glossy sunflower yellow (#ffc21a) in every Japan shot. The tactile
   blocks are a matte, dirtier mustard (#d4ad3c) and stay low in frame near the bag. The cap is the only red on a person.
   The driver owns navy and the brightest white (the gloves); the train owns emerald (#1f9a5a).
7. **Cameras measured, not guessed.** The first probe read pure dolly pushes at 0.13-0.3 %/f, which is static on a phone.
   Every long shot became a slide-and-push (`lowWideTrack` with a side slide) or an orbit (0.7-1.2 %/f). Linear pushes
   are kept only for the short inserts (s04, s06). The phone-POV / kitchen-POV / last-shot cameras (`s01`, `s15`, `s22`)
   are low on the probe (0.19-0.28) because their real motion is the phone wobble, the walk and the tilt.
8. **A moving train without moving the camera grammar.** The train is fixed at the origin and the lineside world scrolls
   past it (a treadmill, pure in t). The masts' sun shadows sweep through the cab and the car about every 2.3 s, so the
   light itself is life. Train-fan details: 1,067 mm gauge, the driver on the LEFT, trains on the left track, signals on
   the left, a silver pocket watch in its desk holder, polished rail heads with rusty sides.
9. **The "why" picture.** His phone replays his own vending-machine selfie, and the yellow bag sits in the corner of the
   clip. The orbit goes from the screen round to his laughing face, with the REAL bag right behind him. This is "your eyes
   can look right at something... while your mind is somewhere else" without a diagram. It needs CORE's screen
   render-to-texture (K-K1).
10. **The loop.** s22 is shot through his phone with frame 0's record UI (timer 00:11; frame 0 reads 00:12). His finger
   enters from the lower right and points at the departing train at the glove's screen place and angle, then it cuts to
   frame 0. The receding train's motor whine crossfades into the cab whine, and the shout plus the glove snap land on
   frames 0-2. It is a match cut, not a pixel loop, so the qa_gates loop row may WARN.

Also decided: the kitchen POV starts already looking back down the hall at the stove, then walks to it. A 120 deg head
turn would break the 4.2 cap. The late salaryman at s07 stops short and gives up (no rushing the doors). The tourist
gives the driver a thumbs-up (s09): he is never mean.

## 2. The shot list in plain words
Times are the linter's estimates (`est_t0`). "+gaps" is the projected length with the section-7 voice gaps, on the linter model.

| shot | t (s) | len / +gaps | place | what you see | camera (measured %/f) | line |
|---|---|---|---|---|---|---|
| s01 | 0.0 | 1.4 / 1.4 | cab (through the partition) | FRAME 0: the phone view. The glove snaps at a tiny green dot, the boy copies at the glass | phone POV: lean-in + sway (0.28) | D "Signal... green!" T "Bro's..." |
| s02 | 1.4 | 4.9 / 5.0 | car, front end | the UI slides away. The tourist laughs, phone up, yellow suitcase at his knee, the boy pointing; the glide ends on his grin | slide + push (0.78) | T "...pointing at nothing!" N "Give him a minute. He'll be pointing too." |
| s03 | 6.2 | 5.5 / 5.5 | car, aisle | rise over the straps (the driver far beyond the glass), then glide backward over the packed car: the sleeping salaryman, students, grandma with furoshiki, stroller | fly-back slide (0.78) | N "And the man he's laughing at? He's got over a thousand people behind him..." |
| s04 | 11.8 | 1.7 / 2.0 | car, at the cab glass | the boy, nose and palm on the glass, points in sync with the driver, then a firm nod | linear push (0.56) | N "...and one tiny fan." |
| s05 | 13.5 | 3.5 / 3.8 | cab, desk | over the shoulder: the glove points at the speedometer (needle settles at 60), then orbits to his profile for the snap; the boy copies through the glass | 75 deg orbit (1.10) | N "So he points at the speed." D "Speed... check!" |
| s06 | 17.0 | 1.0 / 1.6 | cab, at a station | the glove rises and hovers at the unlit door lamp | linear push (0.58) | N "The doors." |
| s07 | 18.0 | 1.0 / 1.9 | platform A, edge, knee high | THE PLANT. The doors slide shut, the red side lamps go out, "closed!", the train starts; a late salaryman gives up | low wide track (1.14) | D "Doors... closed!" |
| s08 | 19.0 | 2.0 / 2.4 | platform B, car 1 front doorway | he parks the yellow suitcase inside the door, "Stay.", pats it, hops out; the bag alone in the doorway (at least 2 s) | ease back (0.69) | T "Stay. Be right back." |
| s09 | 21.0 | 2.5 / 2.5 | platform B, by the cab | he films the driver (who points ahead), turns to us with a thumb over his shoulder, then gives a thumbs-up; the bag in the doorway behind him | slow orbit (0.91) | T "Nobody does that in New York!" |
| s10 | 23.5 | 1.8 / 1.8 | NY station | HARD cut + sting: a stainless train glides in, the conductor leans out, a newspaper flaps, a rat scurries | low slide (0.70) | N "Actually, New York does." |
| s11 | 25.2 | 2.9 / 3.6 | NY car in a tunnel | doors open onto a black wall; a rider looks out, checks his phone map, looks back (held about 3.6 s) | slide + push (0.69) | N "Its subway doors kept opening... in tunnels." |
| s12 | 28.1 | 4.0 / 4.0 | NY station, mid-platform | from high by the zebra board down to the conductor's shoulder: he points at the striped board, and the doors open | descending glide (0.71) | N "So now, conductors must point at a striped board first." |
| s13 | 32.1 | 2.0 / 2.5 | NY station, next stop | no board: his finger hovers and searches, the doors stay shut, a woman taps her watch | ease back (0.70) | N "No board? No doors." |
| s14 | 34.1 | 3.9 / 4.0 | platform B, vending machine | a stiff mock-driver selfie at the vending machine, then orbit to the two-shot: his grin vs the boy frowning beside the bag; an orange train passes on track 2 | 90 deg orbit (1.17) | T "Vending machine... check! What's a finger gonna do, bro?" |
| s15 | 38.0 | 4.4 / 4.7 | kitchen, night | dissolve. POV: your hand on the open front door, keys with a green train charm; walk back down the hall to the gas hob: both knobs UP = off | POV walk (0.19) | N "Ever gone back home to check the stove... you'd already checked?" |
| s16 | 42.3 | 3.6 / 3.6 | lab | a bright lab: the volunteer at the light-and-button panel, the researcher with a clipboard, two big jars (eye / finger icons) | slide + push (0.73) | N "Japan's railway lab put it to a simple test." |
| s17 | 46.0 | 7.4 / 7.8 | lab, the jars | 6 red balls drop into the EYE jar (a tick each); she points and calls; 1 ball into the FINGER jar; hold on 6 vs 1 + the "-85 %" chip | 100 deg orbit ending square (0.74) | N "For every six mistakes people made just looking... they made about one by pointing and saying it out loud." |
| s18 | 53.3 | 5.9 / 6.1 | platform B | over his shoulder: his clip plays with the bag in its corner; orbit to his laughing face with the REAL bag behind him; the departure melody starts | 85 deg orbit (0.76) | N "You see, your eyes can look right at something... while your mind is somewhere else." |
| s19 | 59.2 | 4.4 / 4.4 | cab, at the station | profile: his eyes go to the dark lamp, the glove rises and lands beside it (s06's framing) | slide + push (0.71) | N "A finger and a shout drag your mind back to it." |
| s20 | 63.6 | 1.0 / 2.3 | platform B, edge, knee high | THE PAYOFF, s07's framing exactly: the tourist giggling at his phone in front; the doors shut with the bag behind car 1's door glass; lamps out; the train glides | low wide track (1.14) | D "Doors... closed!" |
| s21 | 64.6 | 1.0 / 1.4 | platform B | tracking the passing door window: the boy points at the suitcase, proud; the tourist's grin drains | follow side (1.26) | KID "Bag... check!" |
| s22 | 65.6 | 1.9 / 1.9 | platform B, phone POV | through his phone (00:09-00:11): tilt down to his sneakers on the yellow line, then up to the train's tail at the vanishing point; his finger enters and points. END, then cut to frame 0 | POV tilt + 2 steps (0.20) | T "Bag... gone." |

## 3. Locations and light states
7 sets: **cab** (golden), **car** (golden), **jp_platform** (golden; used for station A and station B), **ny_station**
(underground: nightPractical, warm lamps), **ny_car** (tunnel: nightPractical, a caged warm bulb plus one blue light),
**kitchen** (night: nightPractical, hood lamp, corridor light, street lamp), **lab** (day: interiorWarm). The Tokyo story
is set at evening-rush golden hour (sun elevation 18-22 deg early, 14 deg for s18-s22, so the light visibly drops toward
the payoff). Rig overrides per shot are in `light.rig_opts`.

## 4. The sets: build specs
Every set meets the DETAIL STANDARD in the bible (ground surface + meso + wear + scatter, surfaces, props, practicals,
ambience). The bible's `want` fields name the right surface where the kit only has a stand-in today.

### cab: the driver's cab (props/train_jp_cab, K-P2) + the lineside world as a treadmill
- The train is fixed at the origin heading -Z. The world (track, masts, signals, fence, cabinets, houses, laundry) scrolls
  toward +Z at 22 m/s (80 km/h) while running and stands still at stations. It is a pure function of t and wraps every 200 m.
- Cab: the driver's desk on the LEFT; a T-handle one-handle master controller (left hand); a round analog speedometer
  (0-120 km/h, white face, black digits, orange needle) between two small LCDs (abstract bars only); a twin-needle brake
  gauge; the round amber door-closed PILOT LAMP (4 cm, chrome bezel, door icon); a silver POCKET WATCH in a desk holder
  (its second hand moves); a timetable card holder (the card faces the driver); radio handset; a roller sun blind half
  down; parked wipers; the sliding side window; the cream partition wall with two windows and a door. The right window is
  where the phone and the boy are.
- Outside: a double track on 1,067 mm narrow gauge (K-S7), ballast (K-S1, stand-in gravel tinted grey), concrete
  sleepers every 0.6 m, polished rail heads with rusty sides, H-beam masts every 50 m with a beam spanning both tracks
  and wires with droppers (K-P5), a 3-light signal on the LEFT 700 m ahead showing green (K-P4; check the lamp order
  against ja.wikipedia 色灯式信号機 before modelling), a grey-green mesh fence (`modular_chainlink_fence`), relay cabinets
  (`utility_box_01`), cable troughs, km posts (digits only), embankment grass with dry patches, clipped shrubs, small
  trees, and low-rise houses with tiled roofs, balconies with laundry, and concrete utility poles with many wires (K-P26).
- Practicals: the console backlights (4000 K, 40 lm) and the pilot lamp (amber, lit only when the doors are closed).
  Light: golden, sunAz -35 / sunEl 20 (ahead-right, into the windscreen's right half: the glove in full sun).

### car: inside the packed front car (props/train_jp_interior, K-P3)
- 7-seat longitudinal benches in deep-green moquette (`fabric` #2f6b4a), with stainless dividers 2-3-2. The priority
  section is blue-grey, with PICTOGRAM stickers and ORANGE strap rings; elsewhere white rounded-triangle rings on grey
  straps. Stainless pipe racks with frosted panels; LCDs above the doors (a route-dot pictogram); RED door lamps above the
  doors; roller blinds (some half down); tall windows in the door leaves; the glass gangway door; plain pastel ad posters.
- Floor: speckled grey vinyl (K-S2; stand-in concrete_floor polished), with a thin YELLOW floor strip at every doorway.
- The crowd: one shared sway signal (the car's rock) plus a small lag per person; the straps swing with it.
- Practicals: two ceiling LED strips at 3800 K (the sun stripes stay the key light) and the LCDs.

### jp_platform: an open-air island platform (station A in s07, station B everywhere else)
- 60 x 60 cm precast slabs (`concrete_sidewalk`). A row of yellow tactile WARNING blocks (30 cm, 5 x 5 domes) sits 0.8 m
  from each edge, with an inner-line bar on the platform side (K-S4). Pale precast edge coping with a worn arris
  (`stone_trim`). Ballast and track below the edge.
- A canopy on cream H-beam columns every 8 m, with a corrugated roof, LED strips and a gutter (K-P10). Hanging pictogram
  boards only. A stair well with stainless rails and the guide-chime speaker. A drinks VENDING MACHINE (K-P7) by column C2
  near the cab end: plain cabinet, 3 rows of dummy bottles, red / blue hot-cold strips, digit prices, buttons that light,
  coin / note slots, an IC reader, the take-out flap; it hums. Benches of 4 bucket seats (orange / blue, K-P8);
  recycling bins with pictograms (K-P9); one CCTV monitor on a pole facing the driver (K-P11). Masts and wires; utility
  poles and trees beyond track 2.
- Train on track 1 (K-P1): 10 cars x 20 m, a stainless body, an emerald band, 4 doors per side per car, the small RED
  car-side lamp near the roofline of each car, a blank destination panel, no logos. A second consist with an ORANGE band
  passes on track 2 in s14.
- Sun: golden, sunAz 60-75 / sunEl 18, then 14 from s18. Canopy shadows stripe the platform, and the doorway with the bag
  sits in a sun stripe.

### ny_station: underground New York platform (s10, s12 with the board; s13 the next stop without it)
- Poured concrete platform with dozens of black gum spots; a yellow truncated-dome strip at the edge (K-S5). White 3 x 6 in
  subway tile in running bond with a plain coloured band and NO name (K-S6). Dark-green riveted I-beam columns every 4.5 m.
  A dark ceiling with conduit. Dark ballast, timber ties and a third rail with its cover board.
- The ZEBRA BOARD: a black-and-white striped wooden board (about 0.9 x 0.45 m, 10 cm vertical stripes) hung from the
  ceiling beam at 2.4 m at mid-platform, facing the train, square to the conductor's window. The sources say "a black and
  white striped board of wood situated in the middle of the platform and facing the train"; the size is our estimate.
  It is removed for s13.
- Train: generic stainless cars (K-P12), with the conductor's drop-down window mid-train; no logos, no route signs.
- Light: warm LED ceiling strips at 3200 K (one tube flickers), the train's window spill, and headlights on arrival.

### ny_car: inside a NY car stopped in a tunnel (s11)
- Brushed stainless walls (K-S3), blue-grey moulded benches, poles, warm LED strips, plain ad frames, a threshold plate.
- Through the open doors, 0.8 m away: a board-formed concrete wall with soot and seepage, a cable run on brackets every
  1.5 m, one caged warm bulb in a niche (2400 K, flickers a little), a blue light far down the tunnel, and a stencilled "117".

### kitchen: a small flat at night (s15)
- Room kit 3.0 x 4.6 x 2.5 m. The grey steel front door (lever, peephole, chain) is at the end of a 1.1 m entry hall.
  The counter runs along the hall's right wall, with the 2-burner gas hob 3.0 m from the door. The knobs are black with a
  white pointer, straight UP = off. There is a range hood with its lamp on, a cold kettle, a small white fridge with
  magnets, a wall clock above the door, a teapot set (`tea_set_01`), a herb pot (`potted_plant_02`), a dish rack,
  white backsplash tiles, and a coir mat. YOUR keys carry a small green train charm.
- Practicals: the hood lamp (2700 K, 400 lm, shadowed: the key light), the corridor light through the open door (3000 K,
  shadowed), and a street lamp outside the window (2100 K glow on the curtain and ceiling). Car headlights sweep the ceiling.

### lab: a bright simple railway test lab (s16-s17)
- Room kit 5 x 6 x 3 m, with one big window (3 x 1.6 m) on the left in warm daylight. White walls, polished concrete,
  a white work table (K-P23). The light-and-button panel: a grey box with ONE big round lamp (red / green / yellow) and 3
  big coloured buttons. Two thick glass jars, 25 x 15 cm (K-P20), with white paper labels carrying black ICONS (an EYE,
  and a FINGER + SPEECH BUBBLE). 7 glossy red 5 cm balls. The researcher's `clipboard`, the volunteer's
  `wooden_stool_01`, a blank whiteboard, binders with blank spines, and a plant on the sill.
- The jars must read at phone size at the final hold: each jar is about 30 % of the frame width, square to the lens.

## 5. Character design specs (2D cartoon cards, the clown film's style)
House style, from `studio/out/clown/CHAR.md` and `studio/src/videos/clown/cast_*.ts`:
- Flat bean-head people with ink outlines (#2c1e2a; the card kit re-lights the ink and never makes it pure black).
- Open "bright" eyes by default; hands are skin mittens with an ink line (about 20 u, `handK` 1.3-1.6 in wides).
- Equal upper arm and forearm; the gesture recipe (anticipation, move, overshoot, settle, at least 12-18 f); faces held
  at least 12 f (`faceAt`).
- One body colour plus one signature item per person; phones are a saturated case with a dark keyline, never white or
  cream.
- Only the cards are inked; the world never is. Heights: the native rig is 1.52 m standard, 1.45 small, 1.57 tall; the
  boy is rescaled with `crownM` to 1.12 m.

| who | build / height | colours | signature | key poses + faces | notes |
|---|---|---|---|---|---|
| **driver** | standard, seated | navy uniform #1f2a4a, white shirt, navy tie, gold buttons | crisp WHITE cotton gloves + navy cap (glossy black peak, thin gold band, a plain round gold badge with NO symbol) | seated at the desk, left glove on the T-handle; the point / ear / snap (index finger only, the other fingers curled, thumb tucked); focus, callOut, calm, smallNod | about 40, neat black hair, clean-shaven, a slim silver watch on the left wrist under the cuff. Views: right profile, 3/4 back-right, 3/4 front-right, left profile. Needs a TRUE profile face (K-C11) |
| **tourist** | tall | off-white tee #f4f1ea with "NEW YORK" in plain black block caps, mid-blue jeans, white sneakers with red laces | RED cap #e23a2e (forward, slight tilt) + the yellow spinner suitcase | phone up (cobalt case #2f6fe0), the jabbing "look at this guy" point, the stiff mock-driver salute pose, selfie arm, thumbs-up, skip-hop; laughBig, brightGrin, smugB, mockStiff, puzzled, blankDrop (the grin drains into a flat line) | 20s, stubble, big eyebrows, a gap-toothed grin (memorable at phone size). Loud and cheerful, never mean. Plus a separate big pointing-hand card for the s22 POV |
| **kid** | small, 1.12 m | sky-blue tee #5fb3e8 with a white collar trim, navy shorts, white socks, small red sneakers, a plain green backpack | a too-big navy TOY driver's cap (slips over one eyebrow) | cheek and palm on the glass, the point / ear / snap a beat late with his tongue out, arms-crossed frown, proud chin-up; serious, proud, frownB, worriedB, delight | about 6. Copies everything 6 f late. Says "Bag... check!" in the driver's rhythm |
| **kid_mum** | standard | beige trench #d8c3a0 | canvas tote | hand on her son's shoulder / a strap; warm, amused | dark bob; never on a phone |
| **ny_conductor** | standard (upper body in a window) | navy jacket / vest #24325a, light-blue shirt #a9c6e8 | reading glasses on a cord + a grey moustache | leaning out on his forearm, the right-index point at the board, the hover-and-search squint; deadpanPro, squint, firm | 50s, no cap, no patches. The window sill hides his lower body |
| **ny_commuter** | standard | grey hoodie #8a8f99, dark jeans | rust-orange beanie #c8643b + headphones round his neck | hand on the pole, leaning out, phone map in a red case, slow blinks; blank, puzzled, deadpan | the tunnel gag works muted |
| **volunteer** | standard, seated | lavender sweater #9b8ac9 | high ponytail | button press, "oops" wince, point + open "calling" mouth (silent: a speech bubble with a finger icon), proud nod | dramatized lab, generic |
| **researcher** | tall | white lab coat #f3f3f0 over a brick-red shirt | clipboard + round glasses | pen click, stopwatch, a satisfied tick; focused, pleased | grey hair, pen behind his ear; never a likeness |
| **jp_commuters** (crowd) | mixed | dark suits and coats, navy school blazers, one indigo furoshiki | - | the salaryman asleep at a strap (head bob, jerks awake, nods off), 2 students giggling behind a hand, a grandma (seated) with the furoshiki, a mum + stroller (a baby hand waves), office workers (paperback, phone, white masks, earbuds), the late salaryman (half-jog, stop, tie, watch) | NO food, NO makeup, NO phone calls; polite and quiet; everyone sways together |
| **ny_passengers** (crowd) | mixed | camel coat #7b6a58 on the watch-tapper | wristwatch | the watch tap through the door window, riders stepping off, a nose on the glass | no team logos |
| **pov_hand** | - | neutral skin #f0d6c0, grey sleeve cuff | keys + a small green train charm | grip the lever, let go, curl round the keys | a big foreground card with 4 fingers at this size |

## 6. Kit requests (also in `bible.json` -> `kit_requests`, with specs)
Priority: **highest** = the film cannot be built without it.

| id | owner | name | for shots | fallback | priority |
|---|---|---|---|---|---|
| K-P1 | NATURE (props) | train_jp_commuter: 20 m stainless 4-door EMU car, band colour param, animated doors, red car-side lamps, 10-car consist, near/far LOD, no logos | s07-s09, s14, s18, s20-s22 | none | highest |
| K-P2 | NATURE (props) | train_jp_cab: desk on the left, controller, analog speedometer, pilot lamp, pocket watch, partition with windows | s01, s04-s06, s19 | none | highest |
| K-P27 | NATURE (props) | suitcase_spinner: 75 cm sunflower-yellow glossy hard shell, telescopic handle, 4 spinner wheels, red tag | s02, s08, s09, s14, s18, s20, s21 | local | highest |
| K-C1 / K-C2 / K-C3 | CARDS | the driver, the tourist, the kid (specs in section 5) | most shots | none | highest |
| K-P3 | NATURE (props) | train_jp_interior: benches, straps (swing pivots), racks, LCDs, red door lamps, gangway door | s02-s04 | none | high |
| K-P4 / K-P5 | NATURE (props) | rail_signal_jp (3-light head; lamp order to check); ocs_mast_jp (masts + beam + wires, shadows) | s01, s05, s07, s20, s22 | local | high |
| K-P7 / K-P10 | NATURE (props) | vending_machine_jp (hero, s14); platform_canopy_jp | s07-s09, s14, s18, s20, s21 | local | high |
| K-P12 | NATURE (props) | train_ny_subway: stainless car, conductor's drop-down window, interior, no logos | s10-s13 | none | high |
| K-P20 | NATURE (props) | glass_jar_big: thick transmission glass, 25 x 15 cm, label area | s16, s17 | local MeshPhysical | high |
| K-S1 / K-S7 | SURFACES | ballast; track() builder (1,067 mm, concrete sleepers, rail profile, scroll offset; NY variant) | s01, s05, s07, s10, s20, s22 | gravel / local | high |
| K-S3 / K-S4 / K-S6 | SURFACES | brushed_stainless; tactile_paving_jp (domes + inner-line bar, matte mustard); subway_tile | NY shots, platform shots | painted_metal / decal / plaster | high |
| K-C5-C9, K-C11, K-C13 | CARDS | NY conductor, NY commuter, volunteer, researcher, crowd members + strap pose + sway input, TRUE profile faces, cards readable behind glass | many | - | high |
| K-K1 | CORE | screen render-to-texture with a layer mask (the phone replaying his clip, s18) | s18 | pre-rendered clip as a video texture | high |
| K-S2 / K-S5 / K-S8 | SURFACES | vinyl_floor; tactile_domes_us; painted_steel | various | concrete_floor / decal / painted_wall | medium |
| K-P15 / K-P18 / K-P26 | NATURE (props) | gas_stove (rotatable knobs); apartment_door (lever); utility_pole_jp | s15; skyline | local | medium |
| K-K2 | CORE or local | treadmill world helper | s01-s05 | local | medium |
| K-C10 / K-F2 | CARDS | the POV hand with keys; 2D pops (icon speech bubble, tick marks, chip) | s15, s17 | local | medium |
| K-P8 / K-P9 / K-P11 / K-P16 / K-P17 / K-P19 / K-P23 / K-P25 / K-C4 / K-C12 / K-F1 | various | benches, bins, CCTV monitor, range hood, fridge, wall clock, work table, kettle, kid's mum, the rat, breath fog | background | the kit's existing props or local | low |

What already exists and is used: surfaces `concrete_sidewalk`, `concrete_floor`, `gravel` (stand-in), `stone_trim`,
`painted_wall`, `fabric`, `corrugated_metal`, `concrete_wall`, `wood_floor`, `marble`; props `modular_chainlink_fence`,
`utility_box_01`, `clipboard`, `wooden_stool_01`, `potted_plant_02`, `tea_set_01`, `painted_wooden_bench`,
`metal_trash_can`; nature `grass`, `weeds`, `tree_small_02`, `plants` (shrub_02); fx `motes`, `birds`, `debris`;
cards `card`, `crowd`; CORE rigs golden / nightPractical / interiorWarm and the presets lowWideTrack, pushIn, pullBack,
orbit, followSide and povHandheld.

## 7. Voice gaps the picture needs (decide now so the voice never changes after Gate 1)
`voice.gaps.after` in the bible. Each word key follows the `starts_on` convention (the bare word, `#n` = its n-th
occurrence in the whole voice). The number is the minimum silence after that word, natural gap included.
**E** = essential, **N** = nice (drop first).

| after | min gap | why | |
|---|---|---|---|
| nothing | 0.35 s | his laugh tail | N |
| fan | 0.55 s | the boy's point lands + nod | N |
| check#1 (Speed... check!) | 0.6 s | the boy copies a beat late | E |
| doors#1 (The doors.) | 0.8 s | the station arrives, the glove hovers at the lamp | E |
| closed#1 (plant) | 1.1 s | the doors meet, the lamps go out, the train starts | E |
| Stay | 0.5 s | the pat | N |
| back | 0.4 s | the hop; the bag alone in the doorway at least 2 s | E |
| tunnels | 1.0 s | the sight gag held about 3.6 s | E |
| doors#4 (No doors.) | 0.7 s | the doors stay shut, the watch tap | E |
| check#2 (Vending... check!) | 0.4 s | the mock pose holds | N |
| checked | 0.6 s | the knobs read OFF | N |
| loud | 0.7 s | 6 vs 1 + the chip at phone size | E |
| else | 0.45 s | the departure melody starts in the clear | N |
| closed#2 (payoff) | 1.5 s | the doors shut on the bag, the train glides | E |
| check#4 (Bag... check!) | 0.6 s | the tourist's "after a beat" | E |
Tail after "gone.": 0.8 s (`tail_frames` 24). Frame 0: the shout starts within 2 f (no lead-in). If the assembled voice
runs past 70 s: drop the N gaps, then follow SCRIPT 5.2's cut order. Never time-stretch.

## 8. Sound design plan (SOUND works from this while the picture is built)
- **Voices.** James (narrator, the clown v6b settings). DRIVER (calm, crisp, firm, no accent on the English): every
  call-out is NAME, a held beat (0.35-0.45 s, the hand at the ear), then a clipped STATUS; reuse the plant take for the
  payoff if it is the best. TOURIST (New Yorker, 20s): a real laugh in "Bro's pointing at nothing!", warm to his bag, a
  stiff mock of the driver, small and flat on "Bag... gone." KID (about 6): "Bag... check!" in the driver's rhythm. Cast
  3 candidates each and pick by measurement (LESSONS 51).
- **Ambience beds** (one per set, in the bible):
  - cab: the VVVF motor whine with pitch steps on notches, wind at the seals, rail joints about every 1.1 s, rattle; when
    stopped, the compressor thump and the motor fan.
  - car: a low rumble, muffled joints, air-con, strap creaks, a polite murmur (no phone calls).
  - jp_platform: city hum, crows, the stair guide chime (an electronic bird chirp) far away, footsteps, the vending
    machine hum near it, a passing train on track 2; NO PA voice.
  - NY: an underground hum, echo, a distant rumble, a far turnstile; the tunnel's deep quiet and drips.
  - kitchen: fridge hum, clock tick, far traffic, the corridor hum.
  - lab: room tone, air-con, birds outside.
- **Signature sounds:**
  - the glove "fwip" (cotton, a crisp air whoosh) on every snap, starting exactly at frame 0;
  - the train's door chime (2 soft tones) plus the door rumble and a rubber "thump" as the leaves meet;
  - the brake release "pssh" and the motor whine rising on departure;
  - the NY door chime (two descending tones) and the wheel screech;
  - the suitcase: a caster squeak, wheels over the threshold, two pats on the shell;
  - keys and the train charm jingling;
  - the lab: a glass "tink" plus bounce-roll per ball on a steady beat, a brighter single tink for the finger jar, the
    lamp "bip", soft pops for the bubble and the chip;
  - the phone's tiny speaker playing his own "Vending machine... check!" in s18 (band-limited, -18 dB).
- **The departure melody.** Our own original 6-s jingle (glockenspiel + vibes, major, 6/8), played by the platform
  speakers from "else." (s18) through s19. It is in the style of Tokyo platform melodies, never a real one.
- **Music** (bible `music`):
  - No score in the first ~2.5 s. The motif enters under "Give" (pizzicato + marimba, 96 bpm).
  - A two-note marimba sting on every call-out snap; a pizzicato tip-toe for the bag plant.
  - A HARD sting into a New York walking bass + brushes; a mock muted-trumpet version at the vending machine.
  - A music-box hush for the stove; a counting pizzicato per ball, with glockenspiel for the one.
  - A pad that ducks -10 dB under the departure melody; the final phrase with the door thump on its downbeat.
  - A dead stop on "gone." Never a Japanese pastiche.
- **Mix.**
  - -14 LUFS, true peak at or below -2 dBTP, LRA 1.7-3.5 (qa_gates).
  - Call-outs are the loudest dialogue moments; the ambience ducks 4 dB under every line.
  - The loop seam: the receding motor whine crossfades into the cab whine over 8 f, and the shout plus the fwip land on
    frames 0-2.
  - Silent renders only; never play audio out loud (house rule).
- Every on-screen action has a sound event in its shot (`sound[]`, `for` = `acting:k` / `fx:k` / `life:k` / `amb`).
  Source codes: `lib` = the CC0 library, `el` = ElevenLabs SFX (confirm credits first), `synth` = our synth,
  `voice` = the voice track.

## 9. Captions (house style, `captions.mode = auto`, 1-3 words per chunk)
- Shouted call-outs are in CAPS: SIGNAL... GREEN! / SPEED... CHECK! / DOORS... CLOSED! / BAG... CHECK!, and also
  NOTHING! and NEW YORK!
- Digits on screen: "thousand" shows as "1,000", "six" as "6", "one" (in the answer) as "1".
- At most 3 words per chunk in the New York part.
- The small "-85 %" chip appears only on screen (s17, board, 44 px, held 3 s).
- Captions sit in the house band (y 1280-1440 at 1080 x 1920). The phone UI on s01 and s22 sits at the top, well clear of them.

## 10. Fact and culture guards (binding; in the bible)
Facts:
- 1,067 mm gauge; the driver and the signals on the left; no Shinkansen.
- Door order: the doors close, the car-side lamps go out, the cab lamp lights, the call (JTSB RI2015-3-1e: "the car side
  pilot lamp and the indicator lamp showing all doors were closed").
- English calls are dramatized (real calls name the aspect, e.g. shinko).
- The zebra board is mid-platform, facing the train, opposite the conductor's window; no board, no doors.
- The lab task is dramatized ("a simple task" only). 6 vs 1 = 2.38 vs 0.38 per 100 actions. Never "85 % of drivers".

Culture:
- No eating, no makeup, no phone calls on the train.
- No Japanese text, no logos, no brands.
- The tourist is likeable and never rude; the late salaryman does not rush the doors.
- No whips; the bag and the jars are readable at phone size.
- No Japanese musical pastiche.

Sources read for the details:
- [Wikipedia: Pointing and calling](https://en.wikipedia.org/wiki/Pointing_and_calling)
- [nippon.com: Pointing and Calling](https://www.nippon.com/en/japan-topics/g02575/)
- [Untapped Cities: what NYC conductors point at](https://www.untappedcities.com/nyc-fun-facts-what-are-nyc-subway-conductors-are-always-pointing-at/)
- [Mental Floss](https://www.mentalfloss.com/article/79767/what-are-subway-conductors-always-pointing)
- [JTSB report RI2015-3-1e](https://jtsb.mlit.go.jp/eng-rail_report/English/RI2015-3-1e.pdf) (car-side pilot lamp)
- [JR East platform safety](https://www.jreast.co.jp/en/company/csr/safe-cx/safety-efforts/platform/) (platform-door counts)
- [Wikipedia: Japanese railway signals](https://en.wikipedia.org/wiki/Japanese_railway_signals)

The hand-to-the-ear step of the gesture comes from common knowledge of the practice, as seen in driver videos: none of
the pages above describe it. Check it against a reference video description before the driver card is animated.

## 11. Owner questions for Gate 1 (`owner_questions` in the bible)
1. No Japanese text at all (pictograms / digits / arrows; the T-shirt says NEW YORK): confirm, or allow ONE checked made-up station name?
2. No platform doors (a generic emerald-stripe line, not the Yamanote): confirm?
3. The ending through his phone with frame 0's record UI (00:11 here, 00:12 at frame 0): keep the match cut on the finger?
4. Length about 68.5-70 s with the picture gaps (target 65): run longer, or apply the 5.2 cut list now?
5. An original departure melody in the Tokyo style: OK?

## 12. Honest gaps and risks
- **Unbuilt kit.** The kit has no train, cab, station, NY car, vending machine, jars or characters yet: 46 kit requests,
  22 new prop names. This film pays for a large share of the kit (the train set is reusable for later films). Until
  K-P1 / K-P2 / K-C1-C3 land, the storyboard (A4) can only show blockouts.
- **POV cameras.** The plan probe cannot model a POV yaw or tilt, so s01 / s15 / s22 read 0.19-0.28 %/f on the probe.
  Their real motion (the phone wobble, the walk, the tilt) is higher. Re-measure with `cam_speed.mjs --film` after the build.
- **Short call-out shots.** On the linter's timing s06 / s07 / s20 / s21 are 1.0 s (validator warnings). They depend on
  the section-7 gaps; if the voice lead drops E gaps, these shots get too short.
- **The loop.** It is a match cut (same UI, same vanishing point, a pointing hand in the same place), not identical
  pixels; the loop-diff gate will likely WARN.
- **Unchecked visual details.** I could not confirm the Japanese 3-light lamp order, the exact zebra-board size, or the
  hand-to-ear step from a primary source: all three are flagged above. The tactile "inner line" is from general
  knowledge (not confirmed in English sources).
- **Projected length.** About 68.5-70 s with the gaps, over the script's 61-66 s estimate.

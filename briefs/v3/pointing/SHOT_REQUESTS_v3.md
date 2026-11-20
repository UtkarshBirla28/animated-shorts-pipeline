# SHOT REQUESTS, script v3 (DIRECTOR -> the set owners; newest block at the bottom)

The director never edits an owner's files: what is missing or wrong is listed here, per owner and per shot id. Shot ids
are the outline's (`s01 .. s24`, `s16a`, `s16b`). Times are film seconds ON THE PLAN; the real ones come from
`studio/src/videos3/pointing/timeline.ts` (see request ALL-1). State: OPEN / DONE (who, when).

## THE CAPTION BAND (DIRECTOR, 02:05; binding for every owner; measured from `Captions.tsx`)
The captions do NOT sit at the bottom. They are the house look (CHANNEL_STYLE_BIBLE section 7): one line, centred,
its middle at y = 1349 of 1920 (70.3 % of the frame height from the top), whatever the size:
| caption size | the text's ink (with stroke + shadow) | in % of the frame height |
|---|---|---|
| normal, 76 px (narrator + character lines) | y 1300-1400 | **67.7-72.9 %** |
| phone replay, 61 px | y 1308-1392 | 68.1-72.5 % |
| small last line, 55 px | y 1311-1389 | 68.3-72.3 % |
| a long chunk auto-shrunk to 960 px wide | narrower, same middle | inside 67.7-72.9 % |
**Keep-out zone for anything the line names or the beat needs (a face, a hand, a fingertip, a foot, a wheel, the
suitcase's handle, a lamp, the shirt print): y 1260-1440 = 65.6-75.0 % of the height, across the middle 90 % of the
width.** Put the action ABOVE 64 % (y < 1230) or, for floor-level action, below 76 % (y > 1460) only if it is still
above the Shorts UI (the bottom ~17 % is covered by the title / channel overlay on a phone: nothing important below
y 1600 = 83 %). Frame 0: nothing in the band at all except the caption.
Decision (DIRECTOR): the band does NOT move for this film. Lower would sit under the Shorts title overlay and break the
channel's look; higher covers faces. The fixes go into the framing (T-11, T-14) and the shirt print (C-10).

## Block 1 (23:20, from reading the code; before any v3 still)

### ALL owners
- **ALL-1 (CLOSED: train_plan.ts, jp_platform.ts, lab.cams.ts and cast/crowd.ts all import ../timeline) read your times from the film's clock, not from typed seconds.** `videos3/pointing/timeline.ts`
  imports only words.ts + plan_words.ts, so a set file (and its `.cams.ts`) may import it at top level (no cycle). It
  gives `cutS(id)` / `cutE(id)` (a shot's start / end in film seconds), `FRAMES[id]`, `S("word#n")` / `E("word#n")` (a
  word's start / end), `EV` (shared events: `bagCreep`, `footHook`, `brake`, `bagBump`, `chimeA`, `doorsMeetA`,
  `lampsOutA`, `glideA`, `arriveB`, `doorsOpenB`, `chimeB`, `doorsMeetB`, `lampsOutB`, `glideB`, `melody0`, `melody1`,
  `punchIn` ...), `DOOR_CLOSE_S` (1.3) and the loop length `L`. When VOICE writes words.ts everything in it moves by
  itself; typed seconds do not.

### TRAIN (`sets/cab.ts`, `sets/car.ts`, `sets/train_plan.ts`, their cams, `kit/vehicles/`)
- **T-1 (DONE, TRAIN 23:09: train_plan.ts reads EV / cutS / DOOR_CLOSE_S) `sets/train_plan.ts` PLAN and `sets/car.ts` BAG_BEATS are typed film seconds of the plan** (8.93, 11.9,
  13.4, 15.05, 24.45, 24.88, 27.0, 27.25, 27.4, 58.12, 60.78; 10.45, 11.35, 11.85). Take them from `timeline.ts`:
  speed-up = `cutS("s05")`, brake = `EV.brake` .. `cutS("s07")`, moving again `cutS("s10")`, stop at B = `EV.arriveB`,
  doors open = `EV.doorsOpenB`, doors start to close = `EV.chimeB`, `closeDur` = `DOOR_CLOSE_S`, leave = `EV.glideB`;
  the suitcase: creep from `EV.bagCreep`, the drag home from CAST's `hookAt(t).drag` (the foot really moves it), the
  brake roll `EV.brake` -> `EV.bagBump`.
- **T-2 (CLOSED, TRAIN keys both forms now) cab / car cameras are keyed `v3_s03` ...**: fine, the film looks up `v3_<id>` first in the shot's own set.
  The bible-v2 keys in the same tables (`s01`, `s05`, `s06`, `s19`; `s02`, `s03`, `s04`) are never used now and can go.

### STATION (`sets/jp_platform.ts` + cams, `kit/rail/`)
- **S-1 (DONE, STATION 23:41: the payoff train is ONE motion s22 -> s23 -> s24 -> s01 from EV.glideB; s24 is `seamOf: "s01"`) the loop seam: s01 `departAt: -1.9` is a typed number.** The last shot's length follows the voice
  (`cutE("s24") - cutS("s24")`, 1.90 s on the plan). Use that length for s01's `departAt` (negative) and for
  `V3M.frame0.lastLen`, so the train and the camera are the same on both sides of the seam for any voice.
- **S-2 (CLOSED, STATION: `departAt: into("s09", EV.glideA)`, `hold: EV.glideA - EV.doorsMeetA`, the B twins) the plant and the payoff times** (`s09: departAt 2.7, hold 1.8`; `s22: departAt 2.46, hold 1.36`) from
  the clock: `departAt = EV.glideA - cutS("s09")`, `hold = EV.glideA - EV.doorsMeetA` (and the B twins), doors
  `dur` = `DOOR_CLOSE_S`.
- **S-3 (DONE, STATION ~23:40: mum stands behind the boy in the doorway shots, the late salaryman is in the plant; seen on stills f445-f700) the boy's mum and the late salaryman are not on the platform** (your own hand-over note). Mum
  (`castMember "kid_mum"`) beside the boy in s07-s09, s11-s14, s16a, s16b, s22, s23, her hand on him in s07, s08, s11,
  s12, s14; the late salaryman (crowd id `lateSalary`) in s09 only (he stops short and gives up).

### LAB (`sets/lab.ts` + cams)
- **L-1 (DONE, LAB 23:27: `v3_s17` / `v3_s19` with its own arc -27 -> -11 -> 0 deg; the director's lab fallback is unused) no v3 cameras yet (`v3_s17`, `v3_s19`).** Until they exist the film uses the director's fallback in
  `film.ts` (one slow arc over both halves, near square from the first frame, exactly square at the end of s19) and
  calls your old `s17` builder once only for its `LAB.t17 / dur17` side effect.
- **L-2 (DONE, LAB 23:27: labPlan() reads timeline.ts) the lab's words are now split over two shots**: "tested it. For every six mistakes people made just
  looking..." is s17, "when they pointed and said it out loud: about one." is s19 (the cutaway s18 sits between). Your
  `inS17` filter and the `t0 + x` fallbacks must be re-keyed (`S("every")`, `E("looking")`, `S("when")`, `S("loud")`,
  `S("one")` from timeline.ts).
- **L-3 (CLOSED, seen on stills f1400-f1632: two plates, two bars, 6 balls against 1, the bubble) the v3 jar picture** (outline s17 / s19): two TRIES bars (each >= 4 % of the frame height, a round-button
  pictogram at the left end, the same end mark, no digits), a fast run of presses on the EYE side (about three per
  ball), six balls on the melody's pulses with the sixth on "looking...", one point-and-call + one ball on "about one",
  no rim teeter, no chip, no researcher, no s16 wide.

### CAST (finished; for the lead to place)
- **C-1 (CLOSED, CAST: crowd.ts reads EV) `cast/crowd.ts` `runWin()` still reads shot "s06" with its v2 meaning** (the train stops at its end): in
  v3 the car also runs in s10 (24.9-27.0 s), where `rockAmp` is 0 now (no sway of the crowd / straps in s10).
  `timeline.ts` has the run windows: 0 .. `EV.stopA`, `EV.glideA` .. `EV.arriveB`.
- **C-2 (OPEN) until words.ts exists the cast's timing is shot-relative** (`timing.ts`: the first word of each shot
  0.03 s after the cut). Shots whose first word comes late (s08 +0.5 s, s09 +1.2 s, s12 +0.5 s, s15 +1.35 s, s22
  +0.15 s, s24 +0.28 s) act early until then. No action if the real words.ts lands tonight.

### SOUND
- **SND-1 (OPEN) cue times**: the picture's cuts and events are in `timeline.ts` (`EV`); a JSON copy is written by
  `node briefs/v3/pointing/director/probe.mjs json briefs/v3/pointing/director/timeline_v3.json` after every re-time.
- **SND-2 (OPEN) the departure melody's note times**: the music-note pictogram (Captions.tsx) pulses 12 times per
  5.5 s phrase from `EV.melody0` ("Japan's") for 11.0 s; if the melody's pulses differ, tell the director the period.

### VOICE
- **V-1 (info) the phone's replay (v3_r01)** may be in words.ts or not: timeline.ts takes it if it is there, else it
  places the replay 0.30 s before the end of "phone." with v3_t03's own rhythm.

## Block 2 (23:40, from the first v3 draft stills of the OPENING: `studio/out/pointing/director/sheetA.jpg`)

### CAST (URGENT: both are in the first 5 seconds)
- **C-3 (CLOSED, checked on stills f60 / f78 of 00:20: the blank stare at the lens, phone down) (was: blocks the opening render) s01, the last 0.7 s: he is LAUGHING with the phone up at 2.8 s** (still f84),
  where the script wants the blank face turned to the lens and one slow blink under "He is not.". Cause: the pre-roll
  of the NEXT shot's rows in `BEATS_V3` plays in s01's last frames: `film at "@s02-20"` and `laugh at "@s02-10"` come
  later in the table than `stun at "he#1-2" until "@s01.end"` and win. s02 is a hard cut to the same man: its rows must
  start AT `@s02` (or the s01 stun must win to `@s01.end`). Same pattern to check: `film at "@s10-12"` (s09 shows him
  behind the door glass), `film at "@s13-12"`, `deadpan at "@s24-8"` (s23 shows his head turning).
- **C-4 (CLOSED, checked on still f200 of 00:20: a white glove with a cuff, the index on the forearm's line, right under the lamp) s03, the glove reads as a bare hand holding ONE FINGER UP** (stills f148 / f170 / f206): seen from behind
  the hand is drawn upright at the end of a diagonal forearm, cream like skin. At phone size that is "the finger", not
  a point, on the very word "finger". Wanted: the index finger continues the forearm's line toward the lamp (pointing
  INTO the picture, at the lamp), the hand smaller than the forearm's near end (foreshortened), and the glove clearly
  WHITE with a cuff seam against the navy sleeve (under the golden rig it lands on the same cream as skin).
- **C-5 (DONE, CAST 23:40: the phone low in his left hand in s01) s01 frame 0: no phone in his left hand** (the script: the cobalt phone in his left hand, sinking
  out of the bottom of the frame). The free fist hangs at his side.

### TRAIN
- **T-3 (CLOSED, checked on stills f78 / f82: the same face, size and place across the cut) s02, the face match on cut 1.** s01 ends with his eyes at 55 % of the frame width and 38 % of its height,
  the face (brow to chin) about 25 % of the frame height (still f84; 28 % is the script's number). s02 opens with the
  eyes at 55 % / 51 % and the face 17 % (lens 1.98 m, fov 50). For the 10-frame hold: lens about 1.45 m from his face,
  aimed so his eyes sit at 38 % of the height (the same screen place and size), then the ease back.
- **T-4 (CLOSED, checked on still f105: the whole suitcase, the boy, no commuter in the lens; peak 2.6 %/f) s02, the lens ends inside the crowd.** From frame 20 a commuter's head and shoulder fill the right
  quarter of the frame, at the end 40 % of it, and a second head (brown bob) the left edge (stills f112, f142): the
  suitcase reads, the boy at the glass and the driver's back do not. Clear a lane: no crowd card within ~1.3 m of the
  lens end pose, or end the pull-back 0.5 m earlier. The move also peaks at 4.8 %/f (the script's cap is 4.2): a
  shorter travel fixes both.
- **T-5 (CLOSED, still f146: the green lamp is in frame on the cut; but see T-11) s03, the lamp is not in frame on the cut** (still f148: the glove 40 % up, no green lamp; it is there at
  f170 and f206, right beside the fingertip: good). The lamp must be on screen from the first frame of the shot
  (fact guard 2: it is the fair clue, before the tourist says "nothing").
- **T-6 (OPEN, small) the emerald waist stripe is the second-loudest colour in frame 0**, right behind the yellow
  suitcase (lead's note). If `PAL` allows: a duller / darker green for the low stripe beside the doors.

### DIRECTOR's camera layer (film.ts; for the owners to adopt, no action needed tonight)
The owners' v3 cameras are first-pass set-ups that barely move (CORE camSpeedStats 0.01-0.1 %/f; the rule is a calm
but ALWAYS-moving camera: no shot under 0.15 %/f, film median 0.7). `film.ts` therefore keeps each owner's framing as
the middle of a slow designed move (`DIR_MOVE`: an arc round the look point, a push, a truck) and tilts the frame-0
lens down so the fingertip and the suitcase top clear the caption band (`DIR_REAIM`). The layer steps aside by itself
for any shot whose own camera measures >= 0.25 %/f (LAB's arc already does). Measure with
`node briefs/v3/pointing/director/probe.mjs cams`. Current layer: s03 +12 deg (pivot 2 m ahead), s04 +11 deg, s06 -9,
s07 +16, s08 -12, s09 / s22 a 0.9 m longer slide, s10 +11, s11 -19, s12 +4, s13 -9, s14 +6, s15 +4 and a 12 % push,
s18 -3, s20 -5 and a 14 % push, s24 a 3 deg pan with the window.

## Block 3 (23:50, the rest of the opening: stills f218-f425, sheet `studio/out/pointing/director/sheetA2.jpg`)

### TRAIN (+ CAST where a pose is needed)
- **T-7 (MOSTLY CLOSED, still f240: his laughing profile large, the boy looking up at him; the finger jab and the boy's finger ON the glass still do not read: the glass side is washed out) s04 does not show its beat.** The frame is half filled by the BACK of mum's head (near, left);
  the tourist is cut by the right edge (cap brim, an arm, the phone), the boy is a strip of backpack, nothing reads
  through the glass (stills f218, f262; the director's +11 deg arc is on top of your lens, but both ends of it look
  the same). The shot is 1.7 s and must show three things at phone size: HIS LAUGHING FACE, his finger jab stopping
  short of the glass, the boy's ONE finger on the glass looking up at him. Mum belongs on the far side of the boy or
  behind them (screen right), never between the lens and the two; his face >= 20 % of the frame height.
- **T-8 (OPEN, opening) s05, the no-look foot hook is hidden by the suitcase** (still f345: the glide lands well, the
  yellow suitcase is big in the middle, but the hooked wheel and the sneaker are on its far side; a thin leg and a red
  shoe show at the left). One of the seven beats that must read. Land the lens a little to the side (or lower and
  nearer the wheel line) so the creeping gap between his shoe and the suitcase, then the toe on the wheel, are in
  clear profile, and keep his lower face in frame so "without looking" reads (eyes on his phone).
- **T-9 (CLOSED, still f395 of 00:20: mum lifts him, he fills the window pointing at the lens, tongue out, the yellow top at the right, the glove soft in the near corner) s06, the boy's copy cannot be seen.** Through the partition window only his cap and eyes show
  above the sill (he is 1.12 m tall, the sill is at ~1.0 m), his face is ~8 % of the frame height, his arms are below
  the sill, the suitcase top never enters the window, the lower half of the frame is blank cab wall and the driver's
  glove is not in the picture at all (stills f362, f400, f425). The shot is the boy's FIRST full copy, the suitcase's
  bump and the cap drop. Wanted: the boy's chest and both arms in the window (lift him: mum holds him up, or he
  stands on the heater ledge under the window: say which, CAST), the lens much nearer the glass (his face >= 15 % of
  the frame height, the window filling the frame), the white glove soft in a near corner, the yellow top rolling in
  along the window's bottom edge.

### For the lead
- The seven beats on the opening side, honest state at 23:50: frame 0 READS; shot 2's jump back does NOT read yet
  (face not matched, a commuter fills the frame: T-3 / T-4); the foot hook does NOT read yet (T-8).

## Block 4 (23:55, the camera-speed budget, measured on the owners' new moves)

Thank you for the moves: the director's layer is now only on s15, s18, s20 (it steps aside at 0.25 %/f). Measured now
(`node briefs/v3/pointing/director/probe.mjs cams`, CORE camSpeedStats, %/f): s01 0.87, s02 0.16 (peak 2.8: good),
s03 0.56, s04 0.32, s05 0.94 (peak 3.6), s06 0.34, s07 0.56, s08 0.44, s09 0.41, s10 0.54, s11 0.56, s12 0.55,
s13 0.30, s14 0.95, s15 0.32, s16a 0.26, s16b 0.39, s17 0.37, s18 0.26, s19 0.29, s20 0.30, s21 0.67, s22 0.42,
s23 0.17, s24 0.49. No shot is under 0.15 any more.
- **CAM-1 (CLOSED 00:28: film number 0.56 %/f, 75 % of the time at >= 0.5; the validator PASSES with F11 as a warning) (STATION + TRAIN + LAB) the FILM number still fails the validator**: the duration-weighted median of the
  shot medians is 0.41 %/f (FAIL under 0.5, target 0.7); only 33 % of the film's time is in shots at >= 0.5. To pass,
  more than half of the film's time must be in shots at >= 0.5 %/f. The cheapest way: s08 (0.44), s09 + s22 (0.41 /
  0.42, the same lens: keep them identical), s24 (0.49) and s16a + s16b (0.26 / 0.39; the old orbit measured 1.2 / 1.4)
  each to >= 0.52. That is 51 -> 62 % of the time. s17 / s19 (0.37 / 0.29) and s04 / s06 would be the margin.
- **CAM-2 (CLOSED: s23 measures 1.05 again) (STATION) s23 dropped to 0.17 %/f** (it was 1.14 as a truck with the door window): the script has the
  lens TRACKING the window toward the tourist; it also has to hold his whole head from 62.3 s.
- **CAM-3 (CLOSED: s21 is 0.09 now, the bible carries it as a planned freeze) (TRAIN) s21 is a HOLD in the script** ("the glove already straight ... he says nothing", 1.0 s): 0.67 %/f
  is a lot of move for a held breath; a breath of push (0.15-0.25) is enough. The bible carries `freeze` for it.

## Block 5 (00:00, notes while the storyboard renders)
- **C-6 (CLOSED per CAST's report 00:22, not re-checked by the director) (CAST, one line) `cast/beats.ts` line ~134: a row is swallowed by a comment.** `{ who: "tourist", m: "film",
  at: "@s02", ... on: true },     // (on: up from the first frame ...) { who: "tourist", m: "look", at: "@s02", until:
  "at#1", to: "phone" },`: the `look ... to: "phone"` row now sits INSIDE the `//` comment, so in s02 he no longer
  looks at his own phone (the selfie). Put it on its own line.
- **DIRECTOR (done)**: the frame-0 tilt (`DIR_REAIM`) is removed from film.ts: STATION's new long lens frames the
  fingertip and the yellow top in the middle by itself.
- Doorway shots s07 / s08 / s09 on the new stills (f445-f700): they READ (the doors opening, the suitcase at the
  threshold with its handle up, the boy's arm on it with mum behind him, the tourist's eyes popping, "BAD SUITCASE."
  with the wag, the plant with the late salaryman giving up). Still to see: the catch itself (two wheels over the
  gap) at "saves".

## Block 6 (00:10, stills f740-f1150 of the storyboard: `studio/out/pointing/director/sheetB2.jpg`)
What READS now (no action): s09 the plant's end (the salaryman gives up), s10 (the selfie, the suitcase at his knee,
"GONNA DO?"), s11 ("Second stop." / "STAY." with the bag parked in the doorway), s12 (the bag alone, the boy's worried
face, mum's hand: "It stays."), s13 (his mock point with the doorway, the bag, the boy and mum behind him).

### STATION
- **S-7 (OPEN, one of the seven beats) s15: his face is never seen.** From inside the doorway the tourist stands 2.6 m
  out with his BACK to the lens for the whole shot (stills f1105 at the look, f1150 at "GETS IT!"): the card shows the
  back of his head. The shot IS his face: he turns to the lens, his eyes hold on it 0.7 s (face >= 15 % of the frame
  height), then the grin and the double point. His body must be turned toward the doorway (three-quarter front to
  this lens) from the first frame of the turn. Also the boy's cap and the back of his head fill the lower middle of
  the frame (about 40 % of it) and overlap the tourist: the outline wants only the suitcase's yellow edge in one near
  corner and the boy's ARM in the other. Same lens in s18 / s20 (his back is right there: he is giggling at his phone).
- **S-8 (OPEN) s14: the boy's face is cut by the left frame edge** (still f1075: half a face, the arm and the suitcase
  read well). 0.25 m of pan / slide to the left puts his whole face (eyebrows up, mouth shut) in frame. With that the
  1.10 s reads; the director keeps 1.10 s (no 1.40 s allowance).

### CAST
- **C-7 (CLOSED per CAST's report 00:22; NOT re-checked on a still) s13: the phone sits beside his ear** (stills f990, f1040): it reads as a phone CALL. He films
  himself: the phone out in front of him at chest-to-chin height, arm half stretched, its back to the lens.

## Block 7 (00:25, the last third of the storyboard: `studio/out/pointing/director/sheetB3.jpg`, `sheetB4.jpg`)
What READS now (no action): s16a / s16b (he in front at his phone, the doorway + the yellow bag + the boy + mum behind
him; the phone pictogram on the replay caption), s17 / s19 (two jars, EYE 6 balls against FINGER 1, both bars equally
full, the speech bubble, the music note), s18 (the cutaway: his back, the bag in the near corner), s20 (the boy's arm
pointing at the bag, his back beyond), s22 THE PAYOFF (he giggles in front, the doors shut on the bag behind the
glass, the train glides), s24 (flat face, hand by the ear, then the arm out at the suitcase behind the glass: the
last frame matches frame 0's picture).

### TRAIN
- **T-10 (OPEN) s21: the dark door lamp cannot be found.** The driver's profile is cut by the left frame edge (half a
  face), his arm points at the desk, and the instruments are small at the right: nothing says "door lamp" (still
  f1735). The outline: the lamp with its DOOR PICTOGRAM at least 6 % of the frame width, at his fingertip, his eyes on
  it. It is a 1 s hold: one clear thing to see.

### STATION
- **S-9 (OPEN) s23: the boy does not read in the door window.** Mum's head and the suitcase show behind the glass, the
  boy is a small dark figure in the next pane (stills f1860, f1888), so "Bag... check!" has no visible speaker and
  his point is lost. He needs to be the bright, clear thing in the window (nearer the glass, lit, his arm on the
  suitcase beside him, the lens nearer the window). The tourist half (his head turning on "check!", eyes wide) reads.
- **S-10 (info) the phone at his cheek in s16a / s22 reads a little like a phone CALL** (same as C-7): for CAST.

## Block 8 (00:35, the opening re-checked on the 00:20 state: stills in `studio/out/pointing/director/sbC/`; HAND-OVER state)
Closed on these stills: C-3, C-4, T-3, T-4, T-5, T-9 (see the lines above). Still open in the opening:
- **T-8 (OPEN, one of the seven beats) s05: the foot hook is still not in the picture** (still f340: the suitcase fills
  the left half, he is behind a pole, no sneaker and no wheel contact in view).
- **T-11 (OPEN, new; TRAIN + CAST) s03, on the cut the glove sits INSIDE the caption band** (still f146: the glove is at
  ~70 % of the frame height, exactly under "at a finger."): the word and the thing it names cover each other for the
  first ~0.5 s. The glove must be above 62 % of the frame height from the cut's first frame (start it higher / more
  raised, or aim the lens lower).
- **T-7 (rest)**: the jab that stops short of the glass and the boy's finger ON the glass.
- **T-6, T-10, S-7 (STATION added a turn `TURN15` after the still: unverified), S-8, S-9** as written above.

### All request ids at the hand-over (00:35)
CLOSED: ALL-1, T-1, T-2, T-3, T-4, T-5, T-9, S-1, S-2, S-3, L-1, L-2, L-3, C-1, C-3, C-4, C-5, C-6 (by report), C-7 (by
report), CAM-1, CAM-2, CAM-3.
OPEN: T-6 (the green stripe, small), T-7 (rest), T-8 (foot hook), T-10 (s21 door lamp), T-11 (glove under the
caption), S-7 (s15 his face; fix unverified), S-8 (s14 boy's face cut), S-9 (s23 boy in the window), S-10 = C-7
(phone like a call in s16a / s22: check), C-2 (goes away when words.ts lands), SND-1 + SND-2 (SOUND: cue times from
timeline_v3.json; the melody's pulse), V-1 (info).
NOT YET RELAYED to the owners by the lead: block 7 (T-10, S-9, S-10) and block 8 (T-11).

## Block 9 (00:45, the NEW director, from the lead's read of the storyboard sheet + my own; turned into requests)
The lead read `pointing_preview/storyboard_v3_all_25_shots.jpg` as a stranger on a phone. I agree with all five
points; where the script itself asks for the opposite (s18 / s20 are written as "his back"), the lead's rule wins:
**at most ONE of s15 / s18 / s20 may show the back of his head, and it is s20** (the boy's arm points at the bag
while the man's back is turned: the one picture where "his back" IS the beat).

### STATION (+ CAST for the poses)
- **S-11 (OPEN, one of the seven beats; replaces / extends S-7) s15 "This kid gets it!": his FACE, and his eyes land
  on the bag.** From inside the doorway: he is three-quarter FRONT to the lens from the shot's first frame, his face
  >= 15 % of the frame height, in the upper half, clear of the caption band (bottom 23 %). The 0.7 s look: his eyes
  visibly move TO the yellow suitcase (pupils toward the near corner where its yellow edge is), hold 0.7 s, then come
  back to the lens with the grin and the double point. The boy is his ARM only in the other near corner (no cap or
  head filling the lower middle: today the cap + head are ~40 % of the frame). Check on stills at the cut, the look
  (cut + ~0.6 s), "GETS IT!".
- **S-12 (OPEN) s18 (1.0 s cutaway inside the jars beat): NOT his back.** A different picture from s15 / s20: e.g.
  low beside the bag (its yellow side big in the near frame edge), him beyond at 3 m in three-quarter front,
  giggling into his phone (shoulders shaking, eyes on the phone, NOT on the bag), the boy's face looking from the bag
  up to him. One read in 1 s: "the bag right there, he only sees his phone".
- **S-13 (OPEN) s20 keeps his back** (the one allowed), but the boy's pointing ARM + the yellow suitcase must be the
  big shapes, the cap brim small at an edge (not the 40 % cap of today).
- **S-14 (OPEN, PLAYBOOK rule 16: never the same picture several times in a row) s07 / s08 / s11 / s12 are four
  near-identical framings of the same door from the platform** (boy + mum left, suitcase right, same height, same
  size). Keep s07 / s08 (the first stop) as they are; give the SECOND stop new pictures: s11 ("Second stop. / STAY. /
  BE RIGHT BACK.") from a different SIDE and height (e.g. along the car, the doorway in three-quarter, him patting
  the bag in profile), and s12 ("It stays.") LOW and CLOSE on the suitcase alone in the doorway (the bag >= 35 % of
  the frame height, the boy's worried face + mum's hand small above / beyond it). s14 then reads as the tight boy
  insert it is (and S-8: his whole face in frame).
- **S-15 (OPEN, frame 0 = the thumbnail; with TRAIN for the suitcase's place in the car and CAST for the arm) the
  yellow suitcase must be the FIRST thing the eye finds in frame 0**: whole, clear of the frame edge and of his arm,
  at least as big on screen as his red cap (today on the sheet's f0 it is cut by the left edge / about the cap's size
  and the cap wins), his fingertip LEADING to it (a straight arm, the tip just short of the bag; today the forearm
  bends and the hand sits over the bag's top). Also SCRIPT 1.1: the arm crosses his chest and covers the NEW YORK
  lettering (today the lettering is the second-loudest thing in the frame). Judged again on the real opening clip
  (not the still): `studio/out/pointing/audit/` after the opening render.
- **S-16 (info) s09 / s22 / s23 share one platform wide**: s09 + s22 on one lens is the script's rule (the plant and
  the payoff) and stays; s23 must differ from s22 (S-9: tighter on the door window, the boy bright in it).

### TRAIN (+ CAST)
- **T-12 (OPEN, = the rest of T-7, raised by the lead) s04 "AT NOTHING!": his LAUGHING FACE and the JAB.** On the sheet
  (f240) the boy's cap fills the lower-left and the tourist is a profile at the edge. Wanted: the tourist's laughing
  face >= 20 % of the frame height, three-quarter (not edge-on profile), his finger jab toward the glass reading as a
  jab (arm out, stopping short of the glass), the boy's one raised finger smaller beside him, no cap over a third of
  the frame.
- **T-13 (OPEN, the lead's note 5) the driver, the title's subject, is on screen only in s03 and s21 (plus soft in
  s06): make them count.** s03: the point-and-call must be crisp and big (glove + face both in frame, the glove's
  snap readable, the green lamp beside the fingertip, warm golden cab light on the glove and the cuff). s21: T-10
  (the door lamp with its pictogram >= 6 % of the width at his fingertip, his face whole, not cut by the edge).

## Block 10 (01:40, status on the REAL voice clock: words.ts final, 1913 f = 63.77 s)
- **C-2 CLOSED** (words.ts landed 00:48, final 01:25: every one of 136 tokens is on the voice; the cast acts the real words).
- **ALL-1 (lab), CAM-1 (lab), L-1, L-2, L-3: CLOSED** (LAB's final report 01:33, `kit/home/NOTES.md`; s17 f1356-1466 0.568 %/f,
  s19 f1497-1600 0.625). LAB's own honest gaps, for the full-preview audit: the sixth ball still settling at the cut to s18;
  her eyes behind the EYE plate for most of s17; the hand + bubble plate weak at 270 px.
- **TRAIN reports PASS on its draft stills (01:03-01:15)**: T-7 / T-12 s04 (laughing face ~30 %, the jab short of the glass),
  T-8 s05 (shoe to the front wheel at f330, dragged home by f340, above the caption band), T-9 s06 (castLiftPair), T-11
  s03 (glove 50-66 % down, lamp ~17 % down). The director closes them only on the real opening clip (Block 11).
- **CAST's first-5-seconds round (01:35)**: frame 0 = LEFT arm straight across his chest (covers NEW YORK), cap red toned
  down to #c4473c; s02 a roar; s03 the thumb tucked; s04 a horizontal finger on the glass; s05 head bowed to a low phone;
  s06 mum's sleeves + hands. Open finds passed to TRAIN: s02 the phone clipped by a vertical line; s21 the driver not in
  frame at all (adds to T-10).
- The clock: ONSET_FIX in timeline.ts is now a no-op (words.ts carries VOICE's measured onsets). Cuts: 0, 81, 140, 212,
  262, 344, 416, 509, 623, 717, 770, 874, 943, 1020, 1053, 1150, 1272, 1356, 1467, 1497, 1601, 1676, 1706, 1799, 1855; end 1913.

## Block 11 (02:00, the OPENING on real frames: `studio/out/pointing/opening_v3_A.mp4` / `_B.mp4`, audit in `studio/out/pointing/audit/`)
Hook A = code of 01:40 (s01-s06); hook B s01-s02 = code of 01:53. Closed on the clip: **T-3** (face match on cut 1, both
hooks), **T-4**, **T-7 / T-12** (s04 laughing 3/4 face + jab + boy smaller), **T-9** (s06 lift + copy), **C-3**, **C-4**
(tucked thumb: one finger), **S-15 half** (suitcase whole, off the edge, fingertip just short of the handle).
Still OPEN, with the exact fix:
- **C-8 (CAST, URGENT, both hooks) s01 f52-f62: the whole tourist card jumps UP ~10 % of the frame height and back**, and his
  eyes flick half-lidded (f50-52) -> wide (f54-62) -> half-lidded (f64). One blank wide stare from the head turn on
  "He" to the cut, one slow blink at ~2.4 s, the card never leaves its mark. (STATION found it too; CAST is on it.)
- **S-15 rest (CAST + TRAIN)**: the cap still wins on colour (STATION: chroma 0.79 vs 0.59): darker cap, deeper yellow,
  lower sill, softer emerald (as agreed). The arm runs ABOVE the NEW YORK letters; SCRIPT 1.1 wants it across them.
- **T-11 (TRAIN, still open, 3 frames)** s03 f140-f142: the glove is inside the caption band ("at a finger." over the
  hand); clear from f145. Start the glove higher (its top at <= 55 % of the height on the cut) or the lens lower.
- **T-14 (TRAIN + CAST) s05 f322-f343: the shoe-to-wheel contact sits exactly behind the caption "behind him."**
  (contact at ~62-72 % of the height, the caption at ~66-70 %). Put the contact at <= 58 %: lens lower / tilt down.
  The eyes-down face (CAST 01:43) is not in this render: check on the next.
- **C-9 (CAST, small) s03 f175-f185: the glove at the ear reads as a round white ball** (the cupped hand seen end-on).
- **C-10 / T-15 (small): caption over shirt text**: "All he did" sits on NEW YORK in s02 (both hooks) and "He is not."
  on it in hook B's punch-in; at 0-0.5 s the blue phone sits behind "His bag". The director checks the caption height
  in Captions.tsx before the full preview (no owner change needed if moving the caption fixes it).
- **T-13** stands: s03 never shows the driver's face, only his dark back and a small glove.

## Block 12 (02:20, THE SEVEN BEATS on draft stills of the ~02:04 code, final clock: `studio/out/pointing/director/sbE/stills/draft/`)
| beat | frames | verdict |
|---|---|---|
| 1 frame 0 | f0 | READS, better: emerald band gone, suitcase big and whole, NEW YORK washed, fingertip short of the handle. Not yet in this still: CAST's cap #6c2a27 + the upright phone (02:09). The suitcase's bottom-right corner and the phone touch the caption band ("His bag"). |
| 2 shot 2's jump back | clip f81-f120 | READS (face match clean, roar, whole suitcase by f110) |
| 3 the foot hook (s05) | clip f322-f343 | HALF: the contact is behind the caption "behind him." and his eyes look at the lens (T-14 + CAST's eyes-down pending) |
| 4 the catch at the door (s08) | f560, f575 | HALF: the boy's arm on the bag + the man's gritted teeth read as a struggle, but no tip over the gap and no lunge is visible at "saves" |
| 5 the boy's second point (s14) | f1035 | READS (S-8 closed: his whole face in frame, the arm to the handle) |
| 6 the 0.7 s look (s15) | f1065, f1086, f1122 | HALF: his FACE to the lens now (S-11 half closed), the suitcase big in the near corner, the boy's arm in the other; but his eyes never visibly go TO the bag: f1086 is a half-lidded smug glance. "GETS IT!" + double point reads |
| 7 the TRIES bars | f1450, f1590 | READS (6 against 1, both bars full, the bubble) |
Also on these stills: s11 f800 a new picture (side view of the doorway, the bag in it: S-14 closed) but the bag's lower half sits in the caption band; s12 f900 low + close on the suitcase (S-14 closed); s18 f1480 low behind the bag, him beyond giggling into his phone, the boy's face (S-12 CLOSED); s20 f1640 his back (the one allowed), bag + the boy's arm read, the cap brim still ~15 % (S-13 nearly); s23 f1810 / f1835 the boy bright in the window, the head turn (S-9 CLOSED).
Requests:
- **C-11 (CAST) s15 the look: the pupils go DOWN-LEFT onto the suitcase's yellow top, eyes WIDE (not half-lidded), held
  0.7 s (EV.look0 f1065 -> EV.look1 f1086), then snap back to the lens before "This kid" (f1106).** Today the look reads
  as a smug sideways glance at nothing.
- **T-16 (TRAIN / STATION, whoever owns the s07-s08 bag motion) s08: show the TIP.** Between "off..." (f495-508) and
  "saves" (f555) the suitcase must visibly tilt out over the door gap (>= 15 deg, one wheel off the edge) and the
  tourist's lunge + grab must be in frame; at "saves" (f555-568) the boy's finger on it, the bag swinging back upright.
- **S-17 (STATION, small) s11 f800: lift the doorway so the suitcase sits above 64 % of the height** (the caption
  "Second stop." covers its lower half).

## Block 13 (02:38, LEAD DECISION -> spec) s03 splits: s03 (the glove insert) + NEW s03b (the driver's FACE: point-and-call)
Why: the driver, the title's subject, is never seen face-on (T-13); TRAIN showed one lens cannot hold his profile and
the far green lamp in a vertical frame. So two pictures, cut on "Signal...".
**Times (the real clock; the cut is final only after the full-preview audit judges the 0.8 s insert):**
- s03 = f140 -> f164 (4.67-5.47 s, 0.80 s): TRAIN's current `face` lens from his right shoulder (T-11 fixed): the white
  glove rising beside the green lamp on "at a finger." (finger 4.69-5.32). Unchanged.
- **s03b = f164 -> f212 (5.47-7.07 s, 1.60 s)**, rule `fr(S("signal") - 0.04)` (one frame before "Signal..." 5.50);
  s04 stays at f212. ids like s16a / s16b, so every `@s03` anchor keeps working; s03b gets its own `v3_s03b` camera.
**s03b picture (TRAIN = cab set + `v3_s03b` lens + light; CAST = the driver's acting):**
- Lens: inside the cab, ahead of him and to his right (windscreen side), looking back at his face 30-40 deg off his
  nose line: FRONT THREE-QUARTER. His face 25-30 % of the frame height, eyes at 33-38 % from the top, cap brim whole.
  A slow push-in, 0.5-0.7 %/f, no orbit (peak <= 1.5 %/f).
- Light: the low golden sun through the windscreen as a warm key / rim on his cheek, cap badge and the WHITE glove
  (golden rig, the same sunAz as s03 so the two cuts match); the cab interior soft behind him (side window with the
  world scrolling past = the train is moving).
- Acting (CAST, on the real words): at the cut the glove is at full stretch; on "Signal..." (5.50) the hand comes back
  to beside his ear (index up, the beat: eyes still locked far ahead, past the lens), mouth on "Signal..."; on
  "green!" (6.415) the SNAP: the arm thrusts out past the lens's side (fingertip at about 45 % height, off-centre to the
  side the lamp is on), crisp 4-6 frames, 3-4 % overshoot; then the calm, proud hold to the cut (eyes forward, a tiny
  nod). Calm and exact, not comic. The glove and his face stay ABOVE 64 % (the caption band).
- Keep it his shot alone: no tourist, no boy (they are in s04 a moment later).
**DIRECTOR (after this preview, in the fix round):** `timeline.ts` SHOT_IDS + RULES (s03 ends at s03b's rule),
`shots.ts` (s03b row: cab, golden, line "(D) Signal... green!"), `film.ts` / `cams.ts` (look up `v3_s03b`), then probe,
bible, the validator. That is a shared-file change: every shot re-renders in the next preview round.

## Block 14 (03:10, THE FULL PREVIEW: `studio/out/pointing/pointing_v3_preview.mp4` = `pointing_preview/VIDEO_full_draft_v3.mp4`, 1913 f, mix.wav of 02:10; code frozen at 02:36)
**Gates** (`tools/v3/qa_gates.py`, `studio/out/pointing/pointing_v3_preview_gates/`): PASS specs, film life 0.205, chroma 22.6,
LOOP SEAM (19.96 vs limit 31.1), loudness -14.0, true peak -2.7, LRA 3.5, captions on 100 % of 135 words. FAIL film camera
median 0.39 (want >= 0.6; the probe's planned 0.575 does not reach the screen). Per shot, the gate's on-screen camera:
s04 0.26, s06 0.25, s07 0.24, s08 0.27, s09 0.46, s11 0.21, s12 0.39, s13 0.18, s15 0.21, s16a 0.49, s17 0.26, s19 0.35,
s20 0.33, s21 0.27, s22 0.39, s24 0.41 (want 0.5-2.0); s23 2.27 (over). Life under 0.12: s09 0.068, s12 0.05, s13 0.032,
s16a 0.010, s17 0.058, s19 0.106. Brightness L* over 60 on most platform shots (s01 65.9, s09 67.4, s12 66.4, s16b 67.4,
s24 67.4): washed; chroma under 18 in s03 14.3, s05 13.3, s06 15.1, s10 16.1, s17 15.4, s19 14.5, s21 12.4 (grey interiors);
s21 L* 28.9 (dark). The blur gate fails on EVERY shot (0.11-0.43 vs 0.08) incl. calm ones: most likely the 540-px preview
(half resolution + JPEG frames), not the scenes: re-check on a final4 test before acting on it.
**Shot by shot (does it show its beat / life / camera / the yellow focal / the seam)** - frames are the real clock:
- s01 READS (arm across NEW, washed YORK, bag gone by 0.8 s, the stare); camera 0.67. Too bright (L* 66).
- s02 READS (face match, roar, whole suitcase). s03 READS (glove + green lamp; "SIGNAL... GREEN!"): grey (chroma 14).
- s04 READS (laughing face, jab, the boy): the camera barely moves on screen (0.26).
- s05 READS, small: the crowd glide, then eyes down on the phone while the shoe hooks the wheel (shoe ~4 % of the frame).
- s06 READS (the lift, the copy, the hand at the ear); camera 0.25, grey.
- s07 HALF: at "tries to" (f486) a commuter in the centre hides the suitcase's move; camera 0.24.
- s08 READS NOW: the bag tips out (f548-f555), the grab, upright by f570, "BAD SUITCASE." wag (T-16 closed on the clip).
- s09 READS (the plant: the salaryman, the doors, the three behind the glass) but L* 67 glare, life 0.07 (static until the glide).
- s10 READS. s11 READS (new side view; S-17 closed). s12 READS (low on the bag) but life 0.05, L* 66.
- s13 READS (the mock "VENDING MACHINE... CHECK!") but life 0.03, camera 0.18: a frozen picture for 2.6 s.
- s14 READS (the boy's whole face, arm to the bag). s15 READS (C-11 closed: f1075 his eyes go down-left to the bag, then the
  grin and the double point); camera 0.21.
- s16a DOES NOT LIVE: 4.1 s of an almost unchanged picture (life 0.010, the lowest of the film): his giggle and the
  background never move. s16b READS ("WHAT'S A FINGER" with the phone pictogram), L* 67.
- s17 / s19 READ (6 against 1, bars, bubble; LAB's own gaps: the volunteer half hidden behind the plates); life 0.06 / 0.11,
  camera 0.26 / 0.35, grey (chroma 15).
- s18 READS (the bag, him beyond on his phone, the boy's face: S-12 closed).
- s20 READS (his back, the bag huge, the boy's arm: S-13 closed).
- **s21 DOES NOT READ**: f1675-f1688 a black shape fills most of the frame (L* 29), then the glove points at the console;
  no driver, no door lamp pictogram to find.
- s22 READS (the payoff: doors shut on the bag behind him); camera 0.39. s23 READS (the boy bright in the window, the head turn).
- s24 + THE SEAM READ: f1904 hand at the ear, f1910 the lock-out, f1912 -> f0 the same picture (arm, bag behind the glass).
**The yellow suitcase** is the focal colour wherever it should be (s01, s02, s05, s07-s16, s18, s20, s22-s24).
**s03 split (Block 13) confirmed**: the glove insert reads in its first 0.8 s (f140-f163: glove beside the lamp by f162), so
s03 = f140-f164 and s03b from f164 stand.
### Fix list per owner (the next preview round)
- **TRAIN**: s21 T-10/T-17: no black foreground pass; the driver's glove + face + the dark door lamp with its pictogram
  (>= 6 % of the width) readable from the first frame, L* >= 40. s03b (Block 13). On-screen camera >= 0.5 %/f in s04, s06,
  s10 (move the lens, not only the target). Warmer cab / car (chroma >= 18 in s03, s05, s06, s10: more golden sun in).
- **CAST** (+ STATION for life): s16a: his giggle must MOVE (shoulders shake, the phone tips, two head bobs), the boy looks
  from the bag to him, mum's small smile, one passer-by: 3 moving things. s13: the mock call must move (the stiff arm snap,
  the head turn to the machine). s12: the boy's eyes + mum's look + one passer-by.
- **STATION**: brightness: platform shots L* 60-67 -> <= 60 (less exposure / less haze glare in s01, s09, s12, s16b, s22, s24;
  keep the warm golden). On-screen camera >= 0.5 %/f in s07, s08, s11, s12, s13, s15, s20, s22, s24 (a real drift / push /
  arc of the lens, not a slow re-aim). s07: keep the commuter out of the centre at "tries to" (f480-f500). s23: calm the
  move (2.27 -> <= 2.0 %/f).
- **LAB**: s17 / s19: on-screen camera >= 0.5 and life >= 0.12 (the volunteer's presses + the balls already move: add her
  head / the plates' light / a small arc of the lens); warmer (chroma >= 18).
- **DIRECTOR**: the s03b clock change (timeline / shots / film / cams) when TRAIN + CAST have the lens and the acting.

### Block 14b (03:12) AIM AT THE GATE, NOT THE PROBE: per-shot ON-SCREEN camera (qa_gates "cam", %/frame of the picture) -> how to raise it
The probe (`camSpeedStats`) measures the lens path; the gate measures how much the PICTURE moves. A slow re-aim at a far
point, a push at a long lens or a move toward a flat wall barely moves the picture. Target per shot 0.5-2.0 (film >= 0.6).
Check on a short draft clip: `node scripts/kit_render.mjs ... --quality draft --frames a-b` then
`tools/v3/qa_gates.py <clip> --shots=<[{"id":..,"from":0,"to":n}] json> --no-loop` (about 1-2 min).
| shot | gate now | probe | how to raise it (one line) |
|---|---|---|---|
| s04 (TRAIN) | 0.26 | 0.73 | the director's layer is on it: give it a real lateral truck (0.3 m) past the strap pole / seat edge in the near frame |
| s06 (TRAIN) | 0.25 | 0.53 | a slow push THROUGH the partition window frame (the frame edge must slide), not a re-aim |
| s07 (STATION) | 0.24 | 0.58 | truck along the car side 0.4 m so the door frame + pole slide against the interior |
| s08 (STATION) | 0.27 | 0.58 | a low push-in toward the doorway with a near object (pole, bench edge, the tactile strip) crossing |
| s09 (STATION) | 0.46 | 0.53 | knee-high dolly along the car (the plant): 0.3 m more travel, the near platform edge visible |
| s10 (TRAIN) | 0.74 | 0.67 | ok |
| s11 (STATION) | 0.21 | 0.34 | the standing arc: double the arc angle, keep a near pole in frame for parallax |
| s12 (STATION) | 0.39 | 0.34 | a low slide past the suitcase (it is near the lens: 0.15 m of slide moves it a lot) |
| s13 (STATION) | 0.18 | 0.41 | a slow arc round him with the vending machine's lights sliding behind |
| s15 (STATION) | 0.21 | 0.29 | a slow push from inside the doorway with the door frame edge sliding out of frame |
| s16a (STATION) | 0.49 | 0.55 | the planned slow ORBIT (script: "a slow orbit; focus pull to the bag and back"): 10-15 deg |
| s17 / s19 (LAB) | 0.26 / 0.35 | 0.57 / 0.63 | the arc needs a NEAR layer (plant, plate edge, table corner) so it reads as parallax |
| s20 (STATION) | 0.33 | 0.36 | a slow push past the suitcase edge (near) toward his back |
| s21 (TRAIN) | 0.27 | 0.23 | it is a planned 1-s HOLD in the script: a gentle 0.3-0.5 push is enough; first make it READ |
| s22 (STATION) | 0.39 | 0.54 | the payoff glide: keep it, add 0.2 m of dolly so the platform edge slides |
| s23 (STATION) | 2.27 | 1.45 | CALMER: <= 2.0 (shorter track or longer lens) |
| s24 (STATION) | 0.41 | 0.59 | frame 0's push-in with the drift right (SCRIPT 1.1: 0.76 %/f in 0-1 s): more drift |
| s01 0.67, s02 0.71, s03 0.82 (now 0.8 s long: probe 1.85), s05 1.26, s14 0.57, s16b 0.59, s18 1.46 | ok | | s03: the old 2.4-s move now runs in 0.8 s (probe 1.85 %/f, peak 2.07): TRAIN may calm it |

### Block 14c (03:30) THE BLUR GATE SETTLED (same 20 frames rendered at preview and at final, `studio/out/pointing/test/`)
| frames | preview blur | final blur | note |
|---|---|---|---|
| s22 f1740-1759 | 0.121 | **0.023** PASS | same code both |
| s03b f170-189 | 0.487 | **0.155** FAIL | same code; the face lens's shallow depth of field (soft cab behind him) |
| s13 f960-979 | 0.167 (03:07 code) | **0.034** PASS (03:29 code) | code changed between the two (camera 0.23 -> 0.60, L* 62.8 -> 51.2) |
VERDICT: the preview's blur failures are the 540-px preview, NOT the scenes: nobody acts on the blur gate from a preview.
At final, only shallow-focus shots can fail it (s03b 0.155): TRAIN may stop the s03b lens down (f/4 -> f/8) or accept it as
the one portrait shot (the gate's WARN band is <= 0.128). Also: "busy" rises at full res (s13 6.3 -> 9.4): judge busy on the final.
Final cost measured: steady 2.4-2.8 s/frame (wall 4.7-7.2 s/f on 20-frame clips incl. start-up): the whole film (1913 f,
26 shots) about 1.6-2.0 h at final, unattended.

## Block 15 (04:15, ROUND 2 = the HOOK-B film: `pointing_preview/VIDEO_full_draft_v3_round2 (hook B).mp4`, 1913 f, mix.wav 03:54)
Code: everything saved by 03:43 (bundle) + s03b re-rendered at 04:05 with CAST's 03:49 glove tweak. Gates
(`studio/out/pointing/pointing_v3_preview_r2B_gates/`): FILM PASS on all 9: on-screen camera **0.67** (was 0.39), life 0.293,
chroma 24.5, seam 22.8 vs 36.8, -14.0 LUFS, TP -2.7, LRA 3.5, captions 100 %. Per shot, ignoring blur / busy (preview size,
Block 14c): camera under 0.5 in s06 0.46, s15 0.37, s17 0.48, s21 0.46, s24 0.47 (small); life s16a 0.107 (just under 0.12),
s21 0.08; L* s03 35.8, s21 26.1 (dark cab), s12 / s16b / s20 / s24 60.5-60.9 (a hair over); shadow chroma 24-28 on most
platform shots and 31-33 in s16b / s20 (the warm golden look + the big yellow suitcase: accepted as the house look).
Shot by shot: all 26 READ except two HALF:
- **s20 HALF (STATION + CAST)**: the boy's arm comes in from the right edge and points at the tourist's BACK (hand at about
  x 0.40-0.45, y 0.40), not at the yellow suitcase at the left: aim the finger DOWN-LEFT at the suitcase's top / handle.
- **s21 HALF (TRAIN)**: reads as "a white glove points at a dark round lamp with a door icon" (good), but the cab is dark
  (L* 26) and only the back edge of his head shows: +exposure on this shot (L* >= 38) so the glove, sleeve and lamp ring read.
Hook B checked on the film: the punch-in at f51 holds his eyes in place, NO body pop (f48-f80 steady; C-8 closed), the face
matches across cut 1. s03 (0.8 s) glove beside the green lamp, s03b the driver's warm face, the glove above the caption band
after CAST's 03:49 tweak (f192-f211). The seam f1912 -> f0 is the same picture. Opening clips re-exported from this render.

## Block 16 (05:12, THE FINAL: `studio/out/pointing/pointing_FINAL_1080x1920.mp4`, hook B, code of 04:24, mix.wav 03:54)
Gates on the final: the film PASSES all 9 (camera 0.70, life 0.277, chroma 22.3, seam 23.7 vs 37.6, -14.0 LUFS, TP -2.8,
LRA 3.5, captions 100 %). Every shot tells its beat at full size (sheet `studio/out/pointing/upload/_final_sheet_all_shots.jpg`).
Shot-level gate misses, none a story failure (post-release / next-film notes, not blockers):
- "busy" 8.8-10.3 on most platform / car shots (s01, s07, s08, s10, s11, s12, s13, s14, s16a, s23, s24): the detailed sets at
  full resolution; the gate's 7.5 was measured on simpler films.
- camera a little under 0.5 in s13 0.49, s15 0.38, s21 0.46, s24 0.44 (STATION / TRAIN).
- s16a life 0.10 (CAST + STATION); s21 chroma 15.9 (grey cab, L* now 41); s20 chroma 30.6 / shadow 29.1 (the huge yellow
  suitcase); s16b shadow chroma 30.7; blur 0.09-0.145 in s03 (the windscreen haze) and s21.
- s03b: the foreshortened near glove reads as a white blob/fist, not a pointing finger (CAST, a later touch).
- s20: the boy's hand at the suitcase reads a little like a fist (CAST, a later touch).

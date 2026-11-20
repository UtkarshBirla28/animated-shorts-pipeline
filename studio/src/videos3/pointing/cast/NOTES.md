# pointing / cast (CAST owner): NOTES + API

## V4 HANDOVER (2026-11-20 08:55, laptop switched off; a fresh team continues)
STATE: tsc 0 (08:53); no render, no stills slot, no RAM token held by CAST. The v4 film = studio/src/videos3/pointing/v4/
(DIRECTOR); cast code = this folder. Read "ACTING RULES on this rig" and "V4 RIG: done / next" below first.
BUILT (code, compiling):
- THE v4 RIG: thin dark INK-LINE arms for everyone (people.ts `inkArm`, INK_ARM_W 5.0; driver: navy line + small white
  cuff + white glove at hand size), small mitten hands; gesture.ts STRETCH_MAX 1.0, HS_MAX 1.1, never a point at the lens
  (turned sideways), the point-and-call = hold-and-snap (3 f moves, the held beat a FIST AT THE CHEST, never by the head);
  moves.ts point snaps in 3 f; no half-lid flash frames (swapLid = 0); hands.ts lensGlove RETIRED (empty card); the card's
  place / turn sampled at the frame time (no ghosts; member.ts).
- PEOPLE (fits.ts outfits + people.ts SPECS): `lab_woman` (THE YOUNG WOMAN: coral-red sweater, white collar, ponytail,
  big eyes), `lab_a`..`lab_d` (lab people, a = blue man, b = teal man, c = mustard man, d = purple woman with a bob),
  `researcher_v4` (lab coat, glasses), `pyjamas`, `hori` (indigo work jacket, black railway cap, moustache, round glasses),
  `fireman` (the coal man: rust overalls, rolled sleeves, flat cap, soot layer, `hold: shovel`), `official` (the boss:
  dark suit, red tie, BOWLER layer, moustache, `hold: notebook`), `driver` (today's), `ny_conductor` (no glasses cord),
  `prankA` / `prankB` (the two New Yorkers: man in a tomato hoodie, woman in sky blue with a ponytail), `cook` (unused now).
- MOVES (moves.ts, beat `m`): `hover` / `tap` / `down` (the finger over / one 4 f press / left on the button; aim = the
  button), `peer` (Hori: head forward, brows scrunched low, eyes OPEN), `alive` (a living hold), `shake`, `scroll`, `lap`,
  face `still: true` (no blink while held), laugh `open: true`, call options `ear` / `earHand` / `dirFrom` / `dirAim` /
  `lensFrom` (lens mode now disabled by the rig), point `gap` / `hy` / `dir`.
- beats_v4.ts: BEATS_V4 (NOT WIRED YET): the young woman (v01 hover + wide eyes, taps on go#1..go#6, down on go#7, v05
  frozen shock, v18 point + say, v36 = frame 0 + arm up + mouth open), researcher, driver + kid (v20/v21), Hori (v23 peer,
  v24 shout, v30 peer), coal man (v25-v27), boss (v28-v30), NY conductor (v32, v35 deadpan -> grin), New Yorkers (v33),
  pyjamas (v17). Cues on v4/resolver.ts R_V4 (word keys "go#n", "signal#1/2", "clear#1/2/3"; "@vNN").
- THE CAST LOG (for tools/v3/gates_v4.py --cast): member.ts prints "CASTLOG {f, who, op, head, hands, armOut}" (0..1
  frame coords, drawn + on-frame cards only) when the render has `--props '{"castlog":1}'`; extract with
  `python studio/src/videos3/pointing/cast/bench/castlog_extract.py <render.log ...> <out.json>`. Tested on the bench.
- BENCH: bench/v4rig.ts (comp PointingCastV4Rig): 6 shots of 60 f: hori / point (driver side, back, 3/4) / shout /
  points / walk / hook (the young woman at a desk with a button and a lamp that turns red at f337).
- SHEET v1: pointing_preview/cast_v4_rig_sheet.jpg (08:27; WITHOUT the young woman yet).
NOT BUILT / NOT SEEN:
- the young woman's press / shock / point-and-say stills (f321 rendered, f345 / f356 not: the run was stopped by the
  switch-off); the sheet with her on it; the lab rows' per-person wave offsets (24 cards); a sign-holding pose for the
  New Yorkers (arms up to the set's restL / restR); a v4 castMember entry; the pyjama stripes; Hori's peer seen up close.
NEXT, IN ORDER:
1. Render her stills: `cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/cast/bench/v4rig.ts --comp
   PointingCastV4Rig --quality draft --stills 310,321,345,356 --out out/pointing_cast/v4rig/` (look at 270 px; fix).
2. The sheet: all bench stills (30,70,84,100,155,214,270 + 310,321,345,356) + anti-theft / clown frames (ffmpeg from
   studio/out/antitheft/antitheft_FINAL_1080x1920.mp4 at 33.2 s and studio/out/clown/upload/clown_FINAL_1080x1920.mp4
   at 53.5 s) composed with PIL into pointing_preview/cast_v4_rig_sheet.jpg.
3. Wire BEATS_V4: in cast.ts add `castMemberV4(ctx, who, opts)` = castCardOf(ctx, who, opts, (e) => actBeats(who,
   timedV4(), e)) with `timedV4 = () => (T ??= timeBeats(BEATS_V4, R_V4))` (import R_V4 from ../v4/resolver; keep it
   lazy: nothing in cast/ reads a table at import time). Tell LAB / TRAIN / STATION the call and the aims per shot.
4. Lab rows: a helper that gives each of the 24 cards an outfit (lab_a..lab_d) and a per-person frame offset for the
   pointing wave (v13) and the five / three presses (v10 / v11).
5. Render the v4 film with the cast log (`--props '{"castlog":1}'`), extract, run gates_v4.py --cast.
PATHS OUTSIDE THE PROJECT: none read by the code or the bench. My scratch scripts (probes, patch) were in the session
scratchpad only and are not needed: `bench/probe_beats.txt` is the no-GPU probe (copy to a .ts, esbuild, node).

## V4 RIG: done / next (2026-11-20, the true-story rewrite; newest line last)
- done 06:39: thin INK-LINE arms for everyone (people.ts inkArm, INK_ARM_W 5.0; driver: navy line + small white cuff);
  gesture.ts STRETCH_MAX 1.0 / HS_MAX 1.1, no point at the lens (sideways instead), call = hold-and-snap (3 f moves,
  the held beat a FIST AT THE CHEST, never by the head); moves.ts point snaps in 3 f; swapLid = 0 (no half-lid flashes);
  hands.ts lensGlove RETIRED (an empty card); new cast in fits.ts + people.ts SPECS: hori, fireman, official, cook,
  prankA, prankB (+ soot layer, shovel / notebook props); bench/v4rig.ts (comp PointingCastV4Rig, 4 shots x 3 people).
- done 06:42: first v4rig draft stills (out/pointing_cast/v4rig/stills/draft/f30 f68 f82 f100 f155 f210): thin limbs read.
- done 08:02: move `peer` (Hori: head forward, brows scrunched low, eyes OPEN, a slow search); the boss = dark suit,
  red tie, BOWLER layer (people.ts `bowler`), moustache, notebook; prankA / prankB = the two New Yorkers (man, woman);
  the stove person in a mustard coat. tsc clean.
- done 08:06: bench/v4rig.ts = 5 shots (hori / point / shout / points / walk), camera closer (medium); rendering drafts.
- done 08:10: bench lineup spread (each person points AWAY from the others), camera back to medium; NY conductor
  without the glasses cord (it drew an orange ring round his face). Re-rendering the 7 bench stills.
- done 08:17: bench framing fov 52, three people at x -0.9 / 0 / 0.9 (arms stay in frame). Rendering.
- done 08:27: pointing_preview/cast_v4_rig_sheet.jpg (7 bench stills + anti-theft 33.2 s + clown 53.5 s side by side).
- done 08:30: the CAST LOG for the director's gates_v4.py: member.ts castCardOf prints "CASTLOG {f, who, op, head, hands,
  armOut}" (0..1 frame coords) once per card per film frame when the render passes `--props '{"castlog":1}'
  --keep-browser-logs`; bench/castlog_extract.py <log...> <out.json> turns the lines into the --cast JSON.
- done 08:34: the YOUNG WOMAN `lab_woman` (coral-red sweater, white collar, ponytail, big eyes), lab people lab_a..lab_d,
  researcher_v4, pyjamas (fits.ts + people.ts); moves `hover` / `tap` / `down` (the finger over / pressing / left on the
  button, aim = the button); cast log only for drawn, on-frame cards; bench shot "hook" (300-360) with a desk, buttons
  and a lamp that turns red at f337. Rendering f310 f321 f345 f356.
- next: SCRIPT_v4 (LOCKED, 22 lines): the YOUNG WOMAN volunteer first (seated at a big button under a lamp: ready /
  7 presses / hand down on RED / frozen shock / side-on point + mouth open / last shot = frame 0 + arm up + mouth open),
  the 24 lab people, the researcher; then driver, Hori, coal man, boss; New York; the pyjama person at the fridge.
- (older) next: SCRIPT_v4 rev 4 cast
  (kid copying the point + puzzled tourist, researcher, 24 lab people (6 women), pyjama person at a fridge).
- next (was): Hori's bad eyes = scrunched brows + head forward (never slit eyes); coal man soot + grin "Clear!"; the boss
  (dark suit, BOWLER, notebook, delighted); the two New Yorkers (man + woman, sign); stove person in a coat; bigger
  sheet framing; cast_v4_rig_sheet.jpg + side-by-side with anti-theft.

## ACTING RULES on this rig (learned on the pointing film, 2026-11-20; the brief for new shots)
SAFE (reads at phone size, tested on lit stills):
- Characters SMALL or MEDIUM (head <= 1/4 of the frame height); a pose that snaps in 4-8 f and HOLDS; `alive` on every hold.
- A straight-arm point in front 3/4, side or back view, the arm at RIG LENGTH (stretch <= 1.3; gesture.ts keeps the wrist
  inside the card), the hand ON the arm's line (driver: `drawPointGlove`, long along the forearm, cuff; the boy: the same
  hand in skin). The target 35-90 deg off the lens axis, the pointing SHOULDER inside the frame (>= ~30 % in from the edge).
- The point-and-call: point on the name -> hand back BESIDE THE HEAD as a fist / a closed glove with the index out
  (call `ear` OUTSIDE the head outline, at or below chin height, `earHand`) -> snap on the status, 4 % overshoot, hold.
  Driver: `quiet` firm mouth shapes, no idle blink while calling. From behind (s03 style) the gloved arm into the picture.
- Faces: shock = "stare" + browUp 9 + mouth "o"; flat loss = "deadpan"; laugh with eyes open = laugh `open: true`
  (delightB); eyes down on a phone = face "readDown" + gaze down; any held face that must not blink: face `still`.
- Phone: at CHEST height in front of him (film `lift` -0.6, `out` toward the centre), screen to him, eyes down on it.
- A cross-chest point (frame 0) works when the target is on the far side: the arm covers the shirt print.
GLITCH (always reads wrong; avoid or fix before rendering):
- A stretched forearm (stretch > 1.3) = a plank / a grey pole; past the card edge the hand is CUT (handless arm).
- A point straight AT the lens = a white ball / "he points at me" / a wave, at any size. Front-on hands only small.
- Any hand or finger crossing a face; a single upright finger near a face (= a middle finger / a nose-pick); the kit's
  default ear target in a 3/4 view puts the hand over the eye.
- An open palm by the head = a wave. A fist in a white glove = a white ball (use the flat glove / the point glove).
- An arm reaching in from off screen = a pole. The shoulder must be in frame.
- A phone at the cheek = a phone call; a phone at face height hides the face.
- A "take" (squash-stretch) on a medium / close body = the whole card jumps; use `take: 0` in close shots.
- Eyes shut (laughBig) when the line is about his eyes; a half-blink on every face change (use `still`).
- Fast moves / turns at FINAL quality: see-through / double cards (sub-frame motion of the card; needs member.ts to sample
  pos / yaw at the frame time); a turn through |s| ~ 0.8 pops between the 3/4 face and the profile head.
- Kit back views: the 3/4-back head of a capped man is a blank skin face; back-view crowd members are black blobs.
- In a TRUE PROFILE a point ABOVE shoulder height crosses the face (the arm starts behind the head): profile points
  level or down only; up-points only from a 3/4 or back view with the arm on the outer side.
- Two characters closer than ~60-80 px on screen: a jab over an eye, a grip at a mouth. Keep them apart.

## HANDOVER 02:35 (2026-11-20, 3rd owner): the current state
Tree: tsc clean (01:36). The REAL v3 voice is in (`words.ts` 00:47, 135 words, TOTAL 1912 f): `timing.ts` follows it by
itself; the probe and the beats storyboard (`out/pointing_cast/beats/b_0..2.jpg`, 02:05) say "all line up".
`voice_sync.py` was run on `sound/pointing/voice/words.json` (it only rewrites `voice_v1.ts`, which nothing reads).
SAVE HOLD (lead, 01:45): the DIRECTOR renders the opening from the code of 01:40; every save in `cast/` re-renders all six
opening shots. The hold ended 02:00 ("opening is out"); the later saves are listed in (4). Tell the lead before saving.

### (1) Done AND looked at on a lit still (frames on the real-voice clock)
- FRAME 0 (S-15, C-5): the tourist points with his LEFT arm ACROSS HIS CHEST (from this lens the bag is on his right
  side: only the near arm can cross and cover the NEW YORK print), one straight ruler arm from the near shoulder,
  a smaller hand (hs 1.05), landing on frame 2 (`@s01-5`, pointK peaks 7 f after f0); the phone hangs in his RIGHT
  hand (`film low hand: "R"`, the stun keeps off his arms: `hands: false`). s24's call uses the same arm (`left`,
  the loop). `F0_GAP` 0.3 head heights: the tip stops short when the bag is far; when it is near, the arm is still a
  full straight ruler (gesture.ts `aimArm` gap mode) and the tip lands at the handle. FINAL still
  `out/pointing_cast/film/stills/final/f2.jpg` (copy `pointing_preview/cast_v3_1a_FRAME0_...FINAL.jpg`): reads "a
  man pointing at a yellow suitcase behind the door glass". The arm passes just ABOVE the lettering at f2 (covers the
  top of NEW at f40 / f76). Cap red `#e23a2e` -> `#c4473c` -> `#963a34` -> `#6c2a27` (fits.ts, see (4)).
- C-3: f76 FINAL = blank stare into the lens, phone low; blink f70-75 on "not". f84 FINAL = s02 a ROAR (moves.ts
  `mLaugh`: amt >= 0.8 swings "laugh" <-> "jaw"; with "vA" it read as a smile). s02 head turns 9 deg to the phone.
- C-4 glove (s03, f170 / f206 draft): the thumb lay forward and read as a SECOND raised finger (a V / rude sign): now a
  short pad tucked on the hand's edge, the index longer + thicker (draw_hands.ts `drawPointGlove`). Reads: one white
  index finger + cuff on the navy forearm's line at the green lamp. s06's lens glove (f380, f400) = a soft white
  glove in the near corner, blobby but white. CAST_WHITE on the platform: no glove of ours is on the platform in v3.
- T-12 s04 (f240): his laughing 3/4 face + a straight JAB that stops short of the glass (`mJab`: stretch 1.6, gap 0.35).
  The boy's "one finger on the glass" sat in front of his face and read as a finger at his nose / a rude finger: now a
  horizontal point at chest height onto the glass (`point hy: 1.3` = the target 1.3 head radii lower).
- C-6 (s02 look at the phone): the row is on its own line; the laugh's shut eyes hide the gaze, the head turns.
- C-7: s10 (f745) phone held up and out at face height on his side (the wag no longer steals the phone hand:
  `wag hip: false`), s13 (f990) phone out in front during the mock call. Both read as filming, not a call.
- s05 foot hook (lead note, f300 / f335): phone low-ish in front, head bowed, the face `readDown` (eyes drawn looking
  DOWN, a wide smile) for the whole shot. Reads "absorbed, never looks". (The `readDown` face is saved 01:43, after the
  director's 01:40 cut: his first opening clips have only the gaze shift, which still read "eyes at the lens".)
- s06 THE LIFT in the film (TRAIN wired `castLiftPair` in cab.ts; `KID_LIFT` = 0 in train_stage.ts, checked): mum's
  forearms are now slim trench SLEEVES a shade deeper than the coat, a fold line, a darker cuff band + strap, real hands
  spread on his belly (people.ts `heldArms`); `LIFT.sideM` 0.24 -> 0.3. Draft f380 / f400.
- s14 urgent (f1040): the waving hand is always ABOVE his head (it crossed his face on the way up).
- s15 the 0.7 s look: superseded by C-11 in (4) (f1075: wide empty stare, pupils down-left on the bag).
- s24 "Bag... gone." (f1908): flat lidded face, small "o", the limp half point at the bag, phone low in the right hand.
- Mum sheet `out/pointing_cast/sheet/p_7.jpg`: the bob in profile pulled back (profile.ts): the face and eye show.
- Lift sheet `p_8.jpg` (before sideM 0.3): reads front / 3/4 / side-on; from behind her back hides him (sideM 0.3 helps).

### (2) Done, NOT looked at on a still
- The mum sheet + lift sheet after the second bob tweak and sideM 0.3 (rendered before them).
- The s15 double point (`guns`, f1105 earlier): the hands came at the lens as two white blobs at his chest: weak.

### (3) Verdicts on the seven beats (honest, draft stills)
1. no-look foot hook s05 f335: READS (eyes down, smile, the leg out to the wheel); the wheel contact is small.
2. lunge-and-grab s08 f562: DOES NOT READ as a lunge: he stands BEHIND the bag (gritted teeth, a hand on the handle);
   the lens has the bag between him and us. Staging (STATION): side-on to the catch.
3. the boy's urgent second point s14 f1040: READS (long straight arm to the handle, mouth shut, hand up high).
4. the 0.7 s look s15 f1072: HALF (calm face, eyes toward the bag; the pupil shift is small at phone size).
5. "Bag... gone." s24 f1908: READS (flat face, limp point at the bag behind the glass).
(+ frame 0 and the s02 roar: READ at final.)

### (4) Saved after the hold (02:00-02:09; the opening clips of 01:40 do NOT have them)
- 02:00:29 (the queued patch, `scratch/cast3/queued_patch.py`): C-8 s01 stun `take: 0` (the take stretched his whole
  card 0.93 -> 1.06 in f53-61: "the card jumps 10 %"; probe: stretch flat 0.988 f49-70; finals f56 / f76 show no pop);
  THE SEAM: a `face` "stare" row on s24's last 7 frames + the right-hand phone at a constant height on both sides;
  s15 the look's face `polite` + `mouth: "dash"` (blank), the boy's still point @s15+26 .. end; S-10 the s16a-s23
  phone `out: 24`; new options `stun take`, `wag hip`, `film hand`, `point hy`, `call left / gap`, `look phoneLow`.
  CAREFUL: never end an edited row line with a `//` comment when another row follows on that line (the C-6 pattern;
  the patch's first draft commented out the s24 `look` row; the probe caught it).
- 02:01-02:02 C-9: `draw_hands.ts drawFlatGlove` + people.ts `armWrap`: the driver's NON-pointing hand on an aimed arm
  (by his ear between the words, the wind-up) is a flat white glove (four fingers, thumb, cuff + seam), from behind
  too; the kit's white fist read as a WHITE BALL. Not yet on a lit still (draft f180 queued behind the limiter).
- 02:02:23 C-10: the NEW YORK print smaller (15.5u -> 11.5u), higher (chin + 0.24 HH), washed (55 % toward the tee).
- 02:09:19 the cap `#963a34` -> `#6c2a27` (both #c4473c and #963a34 rendered CLIPPED at (255, 84-104, 42-54) under the
  golden key + grade); the frame-0 / s24 phone held UPRIGHT at his hip (`film low hand "R"`: dy 4, tilt -6): hanging, it
  sat in the caption keep-out band (y 1260-1440 of 1920) behind "His bag". Both need a frame-0 FINAL (f2) to confirm.
- 02:21 C-11 s15: look @s15..+11 to the lens, then @s15+12..+33 a raw gaze hard down-LEFT ([-1.05, 1.0], head 7) with
  the "stare" face (wide, empty), the grin only with the guns. T-16 `mLunge` rewritten: 3 f wind-up, 5 f dive, the
  grip lands on the WORD "saves" (row at "saves-8"), the haul back from saves+5 (lean +22 -> -10 deg, both hands on
  the handle), to "it#1.end+12". STATION tips the bag over the gap at "saves" and drags it back from saves+5.
- 02:27 the frame-0 / s24 phone hangs at his hip EDGE-ON (`film.edge`, a slim strip; people.ts filmPhone): face-on at
  the hip it was a cobalt slab in the caption band, raised to the waist (02:23) it fought the point. FINAL f2 / f76
  (02:33, with TRAIN's / STATION's new frame 0): the yellow suitcase is the brightest thing, the deep brick cap reads
  red but quieter, the straight cross-chest arm ends at the bag's near top corner, the strip is quiet, captions clear.
- 02:40-02:50 (Block 13, s03b the driver's FACE; + the two weak spots):
  - `drawLensPoint` (draw_hands.ts) redrawn: a squarer fist, three curled-finger ROLLS, a long thumb pad, the index a
    foreshortened TUBE to the side with a big round pad. The s06 corner glove now reads as a gloved hand (f380); every
    front-on lens hand uses it.
  - `mGuns`: when the target is at the lens the two guns splay out and down to either side as side-on finger guns
    (s15 f1100 / f1110; before: two white blobs at his chest).
  - Driver: `mCall` style "driver" sets lifeK 0.45 while calling (no idle blink mid-call); beats: a `polite` face from
    "green.end-1" (the one half-blink comes AFTER the call), a small nod at "green+9", and NEW move `lap` (his left
    hand off the T-handle, down at his lap, "signal-1" .. "@s04": from the front it crossed his chest under the point).
  - On the clock: the cut f164 = arm at full stretch; ear 172-178, held 178-189 (0.37 s); snap 191-196 (4 % over),
    "green" 192-209. All on word cues, nothing to change when the director adds "@s03b".
  - 03:00 (lead: "he must point where he looks"): call option `lensFrom` (+ `lensAim` [x, y] head heights from the
    chest, `lensHs`): from that cue the call's arm targets the LENS (aimLens 1): the front-on glove comes at us on his
    camera side (screen left), his eyes keep their own target ahead. s03b row: `lensFrom: "signal-1", lensAim: [-0.9,
    -0.3], lensHs: 1.35` (03:50: the glove, cuff included, above 64 % for the whole snap + hold). member.ts `DRIVER_LOOK` (key 0.95, rim 1.8 / 4.8 px, form 1.15, floor 0.42) on every driver card.
    FINAL f197 = `pointing_preview/cast_v3_s03b_driver_calls_green_FINAL.jpg`.
  - Bench until the clock has s03b: `cast/bench/s03b_index.ts` (comp PointingCastS03b: the real cab set + TRAIN's
    `faceFront` lens on the film clock). Stills: `out/pointing_cast/s03b/stills/{draft,final}/`.
- 03:07 (Block 14, the preview's LIFE gate: s16a 0.010, s13 0.03, s12 0.05, s09 0.07): new moves `alive` (amp: weight
  shift, head drift, lean, small nods on irregular periods, phase from its start frame), `shake` (a head shake),
  `scroll` (the free hand at the phone, the thumb flicking); the mock call ("mock" style) now swings its hips, bobs
  its head and rolls into the snap (lifeK 0.8 instead of 0.3). Beat block "LIFE" at the end of BEATS_V3: s09, s12,
  s13, s16a(-s16b) for the tourist, the boy and mum, with changing eyelines (the boy bag <-> man), giggles, a hop.
  Probe (no GPU): in those four shots nobody holds a pose for even 1 frame (summed body change 0.6-2.7 units/frame).
  RULE (lead): at least three things moving at any moment, no character frozen for more than ~12 frames.
- 04:17 (Block 15, s20): the boy's long point at the suitcase ran off his 0.6-wide card canvas and was CUT, so it
  stopped at the tourist's back. member.ts castCardOf: the KID's canvas is 1.1 wide (the design space keeps its scale
  and its centre: setTransform(h/1000, ..., (w - 0.6 h) / 2)); the s20 row `stretch: 4` on the world aim: the finger
  lands ON the suitcase (f1630 / f1650; s14 f1040 unchanged). New point option `dir` (a screen direction from the chest)
  exists but is unused.
- 05:17-05:26 (after the FINAL, the director at full size): (1) s03b's near glove read as a WHITE BLOB: `drawLensPoint`
  redrawn as a cotton glove front-on (soft shading, stitched darts on a glove only, the curled fingers as one block with
  deep cool creases + knuckle bumps, a round-ended thumb pad, a LONG index finger with two joint creases, up and out,
  its round tip nearest), the cuff seam; s03b `lensAim [-0.55, -0.3], lensHs 1.12` so the whole glove incl. the tip is
  in frame, above 64 %, off his eyes and mouth. (2) s20's hand read as a FIST: the boy's straight points now use the
  long-along-the-arm pointing hand in skin (people.ts armWrap `skinPoint`), s20 `hs: 2.0`. FINALs f197 / f203 / f1650.
CAPTION BAND (DIRECTOR, binding): one centred line, middle y 1349 of 1920; keep anything a beat needs out of y
1260-1440 (65.6-75 %), action above 64 %, the bottom ~17 % is under the Shorts title overlay.

### (5) Requests to other owners
- STATION: frame 0: open ~0.1 frame width between his shoulder and the bag's near edge so the tip falls SHORT of the
  bag (S-15); s08 the catch side-on (beat 2); s15 / S-11 his face nearer the lens (eyes are small).
- TRAIN: s21 (f1690) the driver is not in frame (T-10); s02 the selfie phone was cut by a vertical line at the right
  edge in one still (the card plane meeting the car wall), not in the final f84.

### (6) Traps (still true)
- `kit_render.mjs` HANGS on the 2D comps (`PointingCastSheet`, `PointingCastBeats`): use `stills_locked.sh` with
  COMP / ENTRY / PROPS for those (sheet page n: `COMP=PointingCastSheet ENTRY=src/videos3/pointing/cast/bench/index.ts
  PROPS='{"page":"all"}' bash scripts/stills_locked.sh out/pointing_cast/sheet/p_ 8 1`; pages 0-8 = main faces others
  acting crowd tourist kiddriver mum lift). kit_render only for `PointingKit` and `PointingCastBench`.
- The machine is full: bundle 30-110 s, a draft film still 40-90 s, a final still 60-200 s. A foreground shell call over
  ~170 s is moved to the background: wait in loops of <= 120 s.
- (old) The machine is full: bundle 40-110 s, a draft film still 60-90 s. A log piped through grep shows nothing until the
  render ends. Commands over ~170 s go to the background: start renders in the background and wait with an
  `until grep -q "== done" log; do sleep 6; done` loop.
- A bash heredoc with backticks fails: write Python edit scripts with the Write tool. Tonight's scripts and backups
  are in the session scratchpad `castB/r2/` (ed_gate, ed_arm, ed_glove, ed_glove2, ed_lift, ed_sheet_lift, ed_c67,
  ed_lid, ed_lid2; `people.pre_lift.ts`).
- Save the EXPORTING file first: a broken import between two cast files stops everyone's renders.
- THE PROBE (no GPU, 10 s): `cast/bench/probe_beats.txt` is a .ts script: copy it to the scratchpad as `probe.ts`,
  `node_modules/.bin/esbuild probe.ts --bundle --platform=node --format=cjs --outfile=probe.cjs --loader:.png=empty
  --loader:.jpg=empty --loader:.glb=empty`, `node probe.cjs`, delete the .cjs. It prints a character's pose per frame
  (expr, phone, blink, eyes, arms), `beatReport()` and each row's f0 / f1 / gate / stop.
- HARD-CUT GATES (`moves.ts timeBeats` -> `Timed.gate / .stop`, enforced in `actBeats`): gate = the first frame of
  the shot the START cue is anchored on (its word or its "@shot", the +-offset ignored); stop = the end of the shot
  only when `until` is "@sNN.end" with no positive offset ("@s24.end+30" has no stop). A `call` takes its gate from
  `out ?? rise ?? name`. A row that must run across cuts on purpose names the last shot in `until`.
- `aimArm` now returns `hand: "none"` + `ext` for every aimed point: the arm and the hand are drawn by `people.ts
  armWrap` through the kit's sleeve callback (straight line shoulder -> wrist, the driver's glove = `draw_hands.ts
  drawPointGlove`). Code that looks for a "point" hand in `X.hands` will not find one.
- `CAST_WHITE` #c9dcff is tuned for the CAB (its light is R/B 1.29 warm, the grade doubles saturation): elsewhere the
  glove may read light blue. Skin and glove must never land on the same cream.
- `castLiftPair` raises the boy itself: with it `KID_LIFT` in `sets/train_stage.ts` (TRAIN's file) must be 0, or he
  is 0.6 m up. His card's contact shadow floats with the card: pass `kid: { shadow: false }` if the floor is in shot.
- Three `remotion-webpack-bundle-*` folders from 22:55 sit in the system temp. I do not know whose they are and did
  not delete them. I stopped my own stuck kit_render (the sheet, 00:21); nothing else was touched.
- Round 1: my `.bak` backups were briefly written to the shared scratchpad root and may have replaced same-named files
  of other agents.

## THE LIFT (s06, T-9): mum holds the boy up at the cab window
```ts
import { castLiftPair } from "../cast";
const { kid, mum, place } = await castLiftPair(ctx, {
  pos: (t) => BOY_FLOOR_MARK,          // where he would STAND (the call raises him: LIFT.liftM = 0.3 m at k = 1)
  yaw: () => Math.PI,                  // the way both face (toward the glass)
  aim: aimOf,                          // what he points at (the driver's own aim): his beats do the copy-point, the cap drop
  k: (t) => (lifted(t) ? 1 : 0),       // 0 = on the floor, 1 = held up (default always 1; a hard cut may jump it)
  side: 1,                             // her head shows on the pair's own RIGHT (+1) or left (-1) of him.
                                       // facing yaw PI their right is +x. From the cab +1 is screen LEFT of the boy
  mumPos: (t) => STAGE.mum, mumYaw, mumAim,   // optional: her own mark / yaw / aim while k = 0
  kid: { glassPress: 1, px: 1200 }, mum: { px: 900 },   // extra card options for each
});
g.add(kid.object); g.add(mum.object);  // update both every sub-frame; place(t) -> { k, kid, mum, mumYaw, kidHead, waistL, waistR }
```
- What it does: the boy's card is raised, his legs dangle, HIS card draws her forearms round his waist and her clasped
  hands on his belly (`CPose.held`, people.ts `heldArms`: front / side-on / from behind). Mum stands `LIFT.backM` 0.2 m
  behind him and `LIFT.sideM` 0.3 m to the side, turned 0.22 rad toward him, hands at his waist, eyes on him, a warm
  face; seen from behind her arms are hidden in front of her body.
- The small way (keep your own marks): `castMember(ctx, "kid", { ..., act: (t, P) => heldPose(P, t, k) })` and
  `castMember(ctx, "kid_mum", { ..., restL: waistL, restR: waistR, look: kidHead, act: (t, P) => holdingPose(P, t, k,
  toward) })` (`heldPose`, `holdingPose`, `liftPlace`, `LIFT` are exported from cast.ts; code in `cast/lift.ts`).

The acting of the heroes is DATA (`beats.ts` BEATS_V3, live since 2026-11-19 23:15) on a move library (`moves.ts`): a new
voice needs nothing (timing reads the film clock), a new script = one table.

## RULE: cast never reads the shot table at import time
`shots.ts -> cams.ts -> sets/<set>.ts -> ../cast -> cast/*` is an import CYCLE. Anything in `cast/` (and `cast.ts`) that
reads `SHOT_TABLE` (shots.ts), `WORDS` (words.ts) or `FILM` (film.ts) does it INSIDE a function, never at module top
level (`timing.ts getToks()`, `acting.ts filmBeats()`, `crowd.ts runWin()` are lazy + memoised). `gesture.ts`,
`moves.ts`, `beats.ts`, `people.ts`, `profile.ts`, `member.ts` never import the shot table at all (benches use them).

## The one call: a character as a lit card that ACTS THE FILM BY ITSELF
```ts
import { castMember } from "../cast";          // from sets/<set>.ts (await import("../cast") inside the builder)
const drv = await castMember(ctx, "driver", {
  pos: (t) => [-0.55, 0, -1.2],     // ground point under the feet (seated: the floor under the seat front), metres
  yaw: () => Math.PI,               // the way the BODY faces (world yaw = atan2(dx, dz)); default: faces the lens
  aim: (t) => SIGNAL_POS,           // the world point he POINTS at in this shot (signal, dial, lamp, the bag, the kid...)
  look: (t) => KID_HEAD,            // the world point his EYES go to when a beat says "look" (default = aim)
  seated: true,                     // driver: hips on a 0.47 m seat, thighs forward (a number = the seat height)
});
set.add(drv.object);                // and call drv.update(t, cam) from your Built.update on EVERY sub-frame
```
- `who`: `driver` `tourist` `kid` (the beat table) · `kid_mum` `ny_conductor` `ny_commuter` `volunteer` `researcher`
  (LEGACY per-shot code, script v2 words; not in the v3 film, kept, not polished) · the crowd ids below.
- The set gives WHERE (pos / yaw) and WHAT (aim / look per shot, as functions of t); the beat table gives WHEN and HOW.
- `aim` is a WORLD point. On the card it becomes: the point where the lens sees the target through the card's plane
  (the finger lands on the target ON SCREEN; a target close to his shoulder on screen = a foreshortened arm, e.g. the
  driver seen from behind), or, when the lens cannot bring it onto the card (behind the lens, or far off to the side of
  a figure filmed in profile), the arm's true 3D direction flattened onto the card. Never "nowhere".
- Mouths: only the speaker's own words move his mouth (visemes from the letters of each word, lips closed between
  words, big shapes on shouted words, small flat shapes inside a `quiet` / `deadpan` beat, a laugh mixes in).
- Optional: `restL` / `restR` (world points for resting hands: the T-handle, a pole, the glass), `act: (t, P) => P`
  (edit the pose), `pose: (t, info) => CPose` (replace the acting), `px` (canvas px, default 1500), `crownM`, `lodM`,
  `shadow`, `onGrass`, `cardLook`, `cutY`, `glassPress` (kid on the glass 0..1), `profile` (force a true profile), `name`.
- Returns the kit's `CardBuilt` (object, update, dispose, canvas, info()).
- The arms are short (the house bean rig: a straight arm is ~0.2 m): a lunge or a grab only reaches what is within
  ~0.25 m of his shoulder after the lean. Put him 0.5 m from the bag and yaw him at it (see `lunge`).
- More options: `skin` (the colour the card draws skin with, default `CAST_SKIN`), `lensHand: false` (no on-card hand
  when he points at the lens: a `lensGlove` card plays it, see "Frame 0").

## The lit look of the cast (member.ts `CAST_LOOK`, `CAST_SKIN`, `CAST_WHITE`)
The golden rig's sun is orange and its grade doubles the saturation: with the cards kit's default light a pale cartoon
face came out TAN (measured on the bench: (208,164,126)). Every cast card (heroes, crowd, the glove card) now uses
`CAST_LOOK` (more of the untinted fill, less key, brighter, a higher floor in shade and backlight) and DRAWS skin a
little cool (`CAST_SKIN` #eef3fb instead of the sheet's #f8f3ee; the driver's gloves `CAST_WHITE` #c9dcff, tuned in the cab), which lands
on a light warm cream ((229,204,174)) that matches between characters in sun and in shade. The 2D sheet keeps the house
off-white. If a rig or `rigOpts.warmth` changes a lot, re-check one lit still: these three constants are the only knobs
(per card: `cardLook`, `skin`). A proper fix would be a key-desaturation term in kit/cards (request, see the gaps).

## Frame 0 of the v3 film (the tourist, s01 = s24's camera)
The LEFT arm across his chest (`point left: true, gap: F0_GAP, stretch: 2.4, hs: 1.05` at `@s01-5`, peak on f2), the phone
low in the RIGHT hand (`film low: true, hand: "R"`), the stun with `hands: false`; s24's `call bag#3 ... left: true, gap:
F0_GAP` is the same arm (the loop). With `gap` the aimed arm is never shorter than a full straight arm (gesture.ts).

## A hand that comes AT THE LENS (the bench's driver frame 0; s06's glove card)
- When a character's `aim` is the lens (or just past it), the arm foreshortens by itself and the hand is drawn FRONT-ON
  on the card (a fist + the fingertip coming at us, growing as it comes out): automatic, small.
- For the hero frame use the foreground card: `lensGlove(ctx, { who: "driver" | "tourist" | "kid", pos, k, sizeM, from,
  side })` (hands.ts): the same drawing as a card of its own ~0.5 m in front of the lens, so the real depth of field
  softens it. `k(t)` = how far out it is: `callKAt(who, t, n)` (a `call` beat) or `pointKAt(who, t, n)` (a `point`
  beat), so the glove rides the arm's own curve; pass `lensHand: false` to that character's `castMember`. Recipe that
  gives "the glove a quarter of the frame height, the face sharp above it" at fov 40: `sizeM: 0.22`, the card's foot
  0.52-0.62 m along the view axis from the lens, 0.215 m below it, 0.035 m to the arm's side (bench shot `frame0`).

## THE ACTING = beats.ts (data) on moves.ts (the moves)
One row = one piece of acting: `{ who, m: "<move>", at: "<cue>", until?: "<cue>", ...options }`.
- A CUE is a word key of the script, the bible's `starts_on` convention: `"signal"`, `"check#2"` (the 2nd "check" of the
  film), with `.end` and `+n` / `-n` frames: `"green.end+6"`, `"fan-4"`; or a shot anchor `"@s05"`, `"@s05.end-8"`; or a
  frame number. `until` left out = the move's own length, or the end of the shot it starts in.
- Rows of one character merge in table order: later rows win on arms / face / eyes; nods, leans, hops add up. Between
  beats everyone lives: breath, blinks every 2-4 s, eye darts, weight shifts, small head tilts (`baseOf`).
- A row whose word is not in the script does not play, and is listed by `beatReport()`.

| move `m` | what plays | options |
|---|---|---|
| `call` | THE POINT-AND-CALL: straight-arm point on `name`, hand back by the ear 0.4 s, 3 f wind-up, snap on `status` (overshoot, settle), hold, back. Eyes lead 3 f, the body leans into the snap, the cap follows | `name`, `status` (word cues), `style`: `driver` (crisp, focused) / `kid` (6 f LATE, tongue out; `late: 0` for his own call) / `mock` (stiff, tall, wobbling overshoot) / `plain`; `out: "@s01"` (already pointing on that frame), `rise`, `riseMove` (a slow first rise), `limp`, `until`, `stretch` (the forearm may run on up to n arm lengths to land on target), `left` (the LEFT arm calls: across the chest), `gap` (the tip stops n head heights SHORT of the aim) |
| `point` | a calm single point at the aim | `reach` (hover AT the aim; `hy` = n head radii below it), `still`, `jabs`, `hs`, `left`, `noGaze`, `stretch`, `gap` |
| `look` | eyes dart there in 3 f, the head follows, a blink | `to`: `aim` / `look` / `lens` / `down` / `up` / `phone` / `[look, lookY]`; `head` (deg) |
| `face` | an expression for a while (a half-blink on each change) | `expr`, `browUp`, `mouth` |
| `nod`, `take`, `hop` | a nod / a squash-and-stretch take / a hop | `amt`, `h` |
| `walk` | walks (arms swing); the SET moves the card by `walkedAt(who, t)` metres so the feet never slide | `gait` |
| `film` | TOURIST: the phone up in his left hand | `k`, `lift` (chest -> eye height), `out` (further from the body), `tilt`, `rec`, `on` (up from the first frame), `low` (down at his side), `hand: "R"` (low, in the RIGHT hand: frame 0 / s24) |
| `laugh` | the big laugh: eyes shut, mouth pumping (amt >= 0.8: wide D <-> tall jaw-drop, a ROAR; less: a chuckle), shoulders bouncing, head back, hand on the belly | `amt`, `hand: false` |
| `jab` | "look at this guy": the free arm stabs at the aim twice, a straight arm that STOPS SHORT of it (gap 0.35) | |
| `stun` | everything stops: a small take, a blank stare INTO THE LENS, arms slack, one slow blink | `lens: false`, `blink` (cue), `hands: false` (leave the arms to other rows) |
| `hook` | hooks the suitcase wheel with a foot WITHOUT LOOKING: the leg feels out, the toe hooks, drags it in, plants; eyes and hands never join in. The set slides the bag with `hookAt(t).drag` | `leg`, `reach: [fwd, toHisRight]` m, `drag` |
| `lunge` | a 3 f flinch, then the whole body dives at the aim (the handle): long step, hips drop, the arm grips | |
| `wag` | "Bad suitcase.": the index ticking at the aim, mock-stern, the other hand on his hip | |
| `guns` | two finger guns at the `look` target: draw, two recoils each, a wink, a little hop | `recoil: false` = a plain double point |
| `deadpan` | "Bag... gone.": the face empties, the shoulders sink, small flat mouth shapes | `point` (a slow half point at the aim); for the real thing add a `call` with `limp: true` (arm up on the name, ear, then a slow limp reach instead of the snap) |
| `pat` | "Stay.": the flat hand goes down to the aim (the handle) and pats it like a dog, a small bow | `n` |
| `thumbsUp`, `overShoulder`, `shrug` | the v2 bits | |
| `urgent` | KID: a fast stab at the aim, re-stabbing, eyebrows UP (the cap jumps), mouth an O, bouncing, the other arm waving high, eyes flick between the bag and the grown-up (`look`) | `shut: true` = mouth shut |
| `capDrop` | KID: the cap slides over his eyes, he freezes blind, the back of his hand shoves it too high, it settles | `hold` (frames blind, default 16), `left` |
| `proud` | chest out, chin up, fists on his hips | `hips: false` |
| `frown` | arms crossed, a frown | |
| `capPush` | KID: the pointing hand shoves his cap up (13 f), chin up (no drop first) | `left` |
| `press` | VOLUNTEER: a fast run of button presses at the aim, eyes on it | `per` (frames per press) |
| `quiet`, `tongue`, `mute` | small mouth shapes for a line / the tongue of concentration / do NOT mouth the words the timeline gives him (his own voice replayed by his phone) | |

The moves are also plain functions (`MOVES.mCall(e, ...)`, `mLunge`, ...) returning an `Act`; `MOVES.compose` merges them.
For a set that syncs a PROP to the acting (all pure in t, from cast.ts): `hookAt(t)` -> `{ reach, drag }` (slide the
suitcase by `drag`), `walkedAt(who, t)` -> metres, `beatWin(who, "lunge")` -> `[f0, f1]`, `callKAt(who, t, n)` /
`pointKAt(who, t, n)` -> the arm's 0..1, `capDropAt(f, f0, hold)`. The bench film (`bench/film.ts`) shows each one.

## RE-TIMING (the reason for the table)
1. NEW VOICE TAKE: nothing to run. `timing.ts` reads THE FILM'S CLOCK (`../timeline.ts`, DIRECTOR): the real voice
   (`words.ts`, VOICE) as soon as it has words, else the plan. Every cue, gate, mouth and beat moves at the next bundle.
   (`voice_sync.py` / `voice_v1.ts` are the v2 route: kept, NOT read by anything. Running it is harmless.)
2. NEW SCRIPT: edit `BEATS_V3` in `beats.ts` (word keys + `@sNN` anchors; the outline's ids s01-s24 with s16a / s16b).
3. CHECK, by numbers (10 s, no GPU): THE PROBE (see "Traps": `bench/probe_beats.txt`) prints `beatReport()` and every
   row's f0 / f1 / gate / stop. By picture: `COMP=PointingCastBeats ENTRY=src/videos3/pointing/cast/bench/beats_index.ts
   bash scripts/stills_locked.sh out/pointing_cast/beats/b_ 0,1,2 1` (frame 0 driver, 1 tourist, 2 kid): every beat at its
   key frame on the real timing, red lines = `beatReport()` (a missing word, a call whose two words start < 23 f apart,
   a point under 12 f). NEVER through kit_render (it hangs on the 2D comps).

## Heights (sole to crown) and marks
driver 1.52 (standard; seated: crown ~1.27 m above the floor), tourist 1.57 (tall; red cap adds ~4 cm), kid 1.12
(toy cap +5 cm), kid_mum 1.52, ny_conductor 1.52, ny_commuter 1.52 (beanie +3 cm), volunteer 1.52 (seated on a 0.62 m
stool: crown ~1.40), researcher 1.57. A standing hand on a STRAP: the ring centre at crown + 0.16 m (standard 1.68 m) and
0.10-0.18 m to the figure's side. Seat height for `seated`: 0.47 m (desk chair / bench); the stool: pass `seated: 0.62`.

## Crowd (many people, one draw): `crowdJP` / `crowdNY`
```ts
import { crowdJP, crowdNY, trainRock } from "../cast";
const car = await crowdJP(ctx, [
  { id: "salarySleep", pos: [0.4, 0, -3], strap: true },          // asleep at a strap: head bob, jerk awake on "thousand"
  { id: "studentA", pos: [1.1, 0, -4.2] }, { id: "studentB", pos: [1.4, 0, -4.3] },   // giggle behind a hand
  { id: "grandma", pos: [-1.2, 0, -5], seated: true },           // indigo furoshiki on her lap, pats it on "people"
  { id: "mumStroller", pos: [0.8, 0, -6.5] },                    // + the stroller, a baby hand waves
  { id: "officeRead", ... }, { id: "officePhone", ... }, { id: "officeMask", ... }, { id: "suitA", ... }, { id: "suitB", ... },
], { sway: true });                // the shared train rock (trainRock) with a per-person lag
set.add(car.object); car.update(t, cam)
```
JP ids: `salarySleep` `salaryRead` `officeRead` `officePhone` (reads a phone, never a call) `officeMask` `suitA` `suitB`
`studentA` `studentB` `grandma` `mumStroller` `lateSalary` (platform: half-jog, stops short at the doors on "closed!",
sighs, tie, watch) `waitA` `waitB` `waitC` (platform, standing). NY ids: `watchTapper` `nyRiderA` `nyRiderB` `nyRiderC`
`nyLeaver`. Member fields: `id`, `pos` (V3 or (t) => V3), `yaw`, `strap`, `seated`, `seed`, `aim`.
The crowd's four timed bits still read script v2 words in `crowd.ts` (`thousand`, `people`, `closed#1`, `doors#4`): with
a script that lacks them the people simply keep their living hold (no error). Not moved to the beat table yet.
`trainRock(t)` -> `{ roll, lat }` (deg, m): THE car's rock, pure in t (0 at stations). TRAIN: swing your straps with
`rockLag(t, 0.12)` and everyone sways together.

## Hands and pops (v2; the kitchen POV is not in the v3 film)
- `povHand(ctx, { pos, yaw?, ... })`: YOUR hand in s15 (grey cuff, 4 fingers, the keys + the green train charm).
- `pointHand(ctx, { pos, ... })`: the tourist's index finger entering the phone view (slow, small, no snap).
- `drawCallBubble` / `drawTick` / `drawChip` (2D pops for the lab, K-F2): canvas draw helpers for a `card()` or an overlay.

## Timing helpers (`timing.ts`, also re-exported from cast.ts)
`wordT("Signal")`, `wordT("check#2")`, `wordEnd("green")` -> film seconds. `speakingAt(who, t)`, `mouthAt(who, t)`,
`voiceSource()`, `getToks()` (every script word with its speaker and time).

## Files
| file | what |
|---|---|
| `../cast.ts` | the film entry: `castMember`, `crowdJP`, `crowdNY`, `povHand`, `pointHand`, `trainRock`, `rockLag`, timing, `MOVES`, `BEATS`, `beatReport`, `beatWin`, `walkedAt`, `hookAt`, `CAST` data |
| `fits.ts` | the outfits + colour ownership |
| `people.ts` | `drawWho(pen, who, pose)`: front / 3-4 / back via the clown cast's drawFig + our costume layers (uniform cap, NEW YORK tee, toy cap with `capDrop`, bob tops...), OUR standing legs (`standLegs`: straight in profile, `foot` overrides for a hook / a lunge, `duck`), seated legs; TRUE profile via `profile.ts`; `anchorsOf`, `SPECS`, `CPose` |
| `profile.ts` | the true profile head: nose, one bold eye, ear, the MOUTH (open shapes = a notch in the silhouette with teeth / tongue and a dropping jaw; closed shapes = a line), hair, uniform cap / ball cap / beanie / glasses in profile |
| `gesture.ts` | primitives: `callTimes` / `callOut` (the point-and-call clock), `callArm`, `aimArm` (foreshortened aiming), `earTarget`, `filmTarget`, `gazeTo`, the `ActEnv` / `Actor` types. NO shot table |
| `moves.ts` | THE MOVES (`mCall` `mPoint` `mLook` `mLaugh` `mStun` `mHook` `mLunge` `mWag` `mGuns` `mDeadpan` `mUrgent` `mCapDrop` `mProud` ...), `compose`, the `Beat` type, `timeBeats` / `runBeat` / `actBeats` (the runner). NO shot table |
| `beats.ts` | THE BEAT TABLE (data): `BEATS_V3` (live), `BEATS_V2` (old script, kept); `F0_GAP` (frame 0's tip gap) |
| `lift.ts` | THE LIFT (s06): `liftPlace`, `heldPose`, `holdingPose`, `LIFT`, `liftPairOf` (cast.ts `castLiftPair`) |
| `acting.ts` | the film glue: the resolver (words + shots, lazy), `filmBeats`, `beatReport`, `beatWin`, `walkedAt`, `hookAt`, `ACTORS`; the LEGACY per-shot actors of the dropped characters |
| `member.ts` | `castCardOf(ctx, who, opts, actor?)`: the card wrapper; `worldToCard`, `aimToCard`, `lookToCard`. NO shot table |
| `timing.ts` | the word timeline from `../timeline.ts` (lazy) + lip-sync visemes. (`voice_v1.ts` / `voice_sync.py`: the v2 route, unused) |
| `crowd.ts` | the JP / NY crowd members (strap pose, shared sway) on the kit's `crowd()` |
| `draw_hands.ts` / `hands.ts` | the hand + pop drawings / their timed cards |
| `bench/` | `index.ts`: the character SHEET (2D, `PointingCastSheet`, 9 pages) + the lit BENCH film (`PointingCastBench`, 4 shots, the real runner on demo beats); never imports shots.ts. `beats_index.ts`: the beats storyboard (`PointingCastBeats`; imports the shot table) |

## Benches
- Sheet (2D, 5-15 s a page after a ~35 s bundle): `COMP=PointingCastSheet ENTRY=src/videos3/pointing/cast/bench/index.ts
  PROPS='{"page":"all"}' bash scripts/stills_locked.sh out/pointing_cast/sheet/p_ 0,1,2,3,4,5,6,7,8 1` (frame n = page:
  main / faces / others / acting / crowd / tourist / kiddriver / mum / lift).
- Lit bench: `node scripts/kit_render.mjs --entry src/videos3/pointing/cast/bench/index.ts --comp PointingCastBench
  --quality draft --stills 14,40,87,97,140,150,205,215 --out out/pointing_cast/bench/` (then `--quality final`;
  `--frames 30-41 --quality final` = the cost clip).

## Status / cost / honest gaps (round 1, 2026-11-19 22:40: history; the current state is the HANDOVER block at the top)
DONE and looked at: 7 sheet pages (`studio/out/pointing_cast/sheet/p_0..6.jpg`, copies in `pointing_preview/cast_1..7_*.jpg`),
lit bench stills at draft (`out/pointing_cast/bench/stills/draft/`) and final (`.../stills/final/f40 f87 f97 f150 f205
f246.jpg`), a final-quality clip (`out/pointing_cast/bench/test/final_30-41.mp4`), the beats storyboard on the real
film timeline (`out/pointing_cast/beats/b_0..2.jpg`: the v2 table; beatReport flags the driver's three calls in the
1 s shots s01 / s07 / s20, whose two words start 12-17 f apart there). tsc on the whole pointing project: 0 errors.

Fixed tonight (what the stills showed): the profile mouth was a painted red spot -> a real open notch with teeth; the
profile eye had lashes; standing profile legs were a curtsy with crossed feet -> our own standing legs; the tourist's
phone sat on his mouth in profile; the hand wiped across the eye on its way to the ear; a figure with no reachable aim
pointed BEHIND itself in profile; bob-haired women were bald on top; the tourist's tee was his skin colour (lead) -> a
grey tee with a collar, short sleeves, bare arms, jeans; faces went tan in the golden light (lead) -> CAST_LOOK +
CAST_SKIN; at FINAL quality every moving pose was a double exposure (the frame quantiser used floor while the kit
centres its sub-frames: fixed with round) and the pose JSON changed on every sub-frame (8 canvas redraws per frame:
now one pose per film frame).

Cost (GTX 1660 Ti, the PC shared with two other renders the whole evening, so wall times are pessimistic):
- sheet page (2D, 2400 x 1600): 3-7 s each after a 7-45 s bundle;
- draft lit still (540 x 960, 1 sub-frame): 14-43 s each;
- final lit still (1080 x 1920, 8 sub-frames), three 1500 px heroes + the glove card + the suitcase + the platform:
  18-53 s each; in-page render of that one frame 0.58-1.56 s (it was 3.3-3.7 s before the one-pose-per-frame fix);
- final clip, frames 30-41 of the trio (2 tabs): 63 s wall = 5.25 s / frame with start-up, 3.68 s / frame steady,
  in-page render median 76 ms per output frame (8 sub-frames; rendered WITH the one-pose-per-frame fix). The same six
  final stills before / after that fix: 3.3-3.7 s -> 0.58-1.56 s in-page for the frame (the machine load differed
  between the two runs, so read it as an indication, not a clean A / B).
- Not measured: the cast's share alone (no cast-free run of the bench), and a quiet machine.

Honest gaps:
- `BEATS_V3` is written from the FINAL v3 script files and its cues exist in them, but it has never run on a v3
  timeline (shots.ts is v2): the TIMING of its rows (offsets, holds, overlaps) is untested, and `capPush`, `press`,
  `mute`, `riseMove`, `guns recoil: false`, `urgent shut` were added for it without a still of their own.
- The film's frame 0 is now the TOURIST on the platform (v3); the bench's `frame0` shot shows the DRIVER's glove
  at the lens (the alternate hook). Both use the same parts; the tourist version was only drawn on the sheet.
- The foreground glove card must be placed by the set (recipe above); nothing checks that it does not cover the face.
- Arms are short (the house rig): a straight-arm point is ~0.2 m, so in a wide the gesture is small; a lunge only
  reaches a handle within ~0.25 m of the shoulder; "pat" does not touch a handle that is further.
- The hook: the beat's `reach` is in his frame; the set must put the wheel there (`footReach(pos, yaw, wheel)` gives
  it) and slide the bag with `hookAt(t).drag`. Only tried on the bench with numbers set by hand.
- Lip-sync is from the letters of each word (no phonemes, no audio): fine for the short lines here; a long word may
  open on the wrong beat. The narrator has no mouth.
- Expressions: no automatic 12 f minimum hold across overlapping beats (the author's job; a half-blink covers each
  change). `mFace` beats shorter than 12 f are not flagged by beatReport.
- The true profile switches in at |s| > 0.8: a figure that TURNS through that angle pops between the kit's 3/4 face and
  our profile head. The 3/4 BACK head is the kit's.
- Lit skin: three constants tuned on the golden rig (sun 20-24 deg, default warmth) on the open platform. Not checked:
  the cab and the car interiors, `interiorWarm` (the lab), `rigOpts.warmth` up to 1.6. In backlight / shade the faces
  are a little grey. REQUEST to CARDS: a key-desaturation (or key-tint) term in the card shader, then CAST_SKIN can go.
- Kit behaviour we live with: cards do not shadow each other; the drawing changes at 30 fps (the card's travel is
  motion-blurred, the pose is not); the crowd atlas is redrawn on its own clock.
- The crowd's four timed bits still read v2 words inside crowd.ts; the dropped characters (NY conductor, NY commuter,
  researcher, the kitchen hand, the mum) keep their v2 per-shot code (NaN-safe: a missing word = they just stand and
  live). The volunteer has v3 rows in `BEATS_V3`.
- Not done: the kid's backpack / hair follow-through on hops, a per-character walk style, phoneme visemes, a check of
  `bible_validate` (skipped on the lead's word: the bible is being revised).

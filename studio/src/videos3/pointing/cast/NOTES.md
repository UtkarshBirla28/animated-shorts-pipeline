# pointing / cast (CAST owner): NOTES + API

## FROM LOOK
- 2026-11-21 02:31 (LOOK, lead-approved): kit/cards/cardlight.ts `rimEdge()` only: rim offset at least 2 px, three alpha samples averaged, softer alpha step (fixes the white DASHED rim on far figures at 0.5 scale). Backup: studio/out/pointing/look_test/_backup/v5/cardlight_0300.ts. Take your pixel-identical "before" frames AFTER this change.

## PAUSED 2026-11-21 ~10:00 (CAST) - READ THIS FIRST. tsc 0; no render / token / stills slot of mine running
Read LEAD_DECISIONS_R2.md + studio/out/pointing_v4/audit_r3/FIX_LIST_CAST.md (status block at its end) + the "FOR CAST"
tops of kit/rail/NOTES.md (STATION), kit/home/NOTES.md (LAB), kit/vehicles/NOTES.md (TRAIN).
**PALE CARD / SHADOW CASTER (lead's priority):** v23 Hori's card steps paler at f1209 and stays. NOT the lazy redraw
(cardlazy:0 shows it too). The card's private sun-visibility map (kit/cards/cardlight.ts renderVis) changes: through
f1208 the card is in the cab's shadow, at f1209 the right half is suddenly lit (hard vertical edge); the map's fit
(ctr, R) is identical every frame. Needs 1 frame of in-page history (a 3-frame clip f1208-1210 shows it; a still
doesn't). v20's driver dips dark for single frames every 3-4 f (08:01 frames f969-1031). Suspects: the streaming
scenery (kit/vehicles/steam_world.ts: wrapZ poles, InstancedMesh trees / stakes moved every frame). LEADING THEORY,
CODED BUT NOT TESTED: three culls an InstancedMesh caster by a bounding sphere computed once; moving instances leave it
and the whole mesh drops out of the pass at once. cardlight.ts renderVis now recomputes every instanced caster's
sphere before the pass. Reproduce / test: `--frames 1206-1210 --props '{"carddbg":1}'` (card debug view 1: red = lit,
green = shadow; 3 = light only) and face tone per frame with scratchpad facetone.py (box 0.3,0.52,0.5,0.62). Caster
log: `--props '{"cardvis":1}' --keep-browser-logs` prints CARDVIS (fit) + CARDVISC (casters added / removed per
pass; TEST ONLY, remove both debug blocks from cardlight.ts + member.ts when done). If the instanced fix does not
remove the f1209 step: give TRAIN a flag (e.g. userData.noCardShadow on streaming scenery) and skip those in renderVis.
Then check v20 v23 and the other moving-world shots (v19 v22 v24-v30 v31).
**CODED, NOT YET SEEN ON A CLIP:** v35 conductor point drawn OVER the sill cut (people.ts armWrap lifts the toon's cutY
clip for the sleeve + hand: the "1-3 px line" was the clip) + hand 1.25x; conductor focusB -> open eyes; New Yorkers
SILENT laugh (mLaugh silent: closed grin, no flaps, small shake) + hop x0.3; Hori never blinks and never has lids
(member.ts, brows >= 0); everyone else blinks open / shut only; peer lean 8 f in / 8 f out, v23 / v30 rows start 10 f
before the cut (held past v23's end); hook: hover 0.6 r, GO_PRESS 3 down eased-in / 2 on / 3 (or 2) up, v05 blink
@v05+6, eyes to her finger on "tap?", tremble, "O" until "Did" then tight; face-tint cap (cardlight.ts light 50 %
desaturated; tell LOOK the final value); free NY arm hidden behind the sign; plain navy conductor cap.
**NOT STARTED:** ink outline (crisp near-black ~3 px at 1080), EYEBROWS (hat wearers: boss, conductor, coal man,
drivers lose them under the brim), acted faces (smug / side-eye / alarm / delight) on boss, coal man, conductor, the
New Yorkers, bored volunteer; v10 creeping hand; v16 fingertip on dome; v17 head tilt + bowl; v25 coal man head turn;
v28 boss bouncing / clapping; v33 woman; v36 / v13 checks on LAB's new lenses.
**WAITS ON OTHERS:** STATION: v35 aim at "HERE" a hand-width short, New Yorkers' look rows (to the conductor on his
point, then to each other), drop `laugh` or keep it (now silent); LAB: v36 aim in front of the housing, v13 high lamps
+ mouth wave rows, v10 creeping-hand station; TRAIN: v20 profile lens, v28 re-stage, streaming-scenery flag if needed.

## FIX ROUND 2 (audit_r3, lead 08:45: LEAD_DECISIONS_R2.md + audit_r3/FIX_LIST_CAST.md)
- done 09:35 (code, tsc 0; clips pending the RAM token): v35 conductor point drawn OVER the sill cut (people.ts: the
  toon clipped the sleeve + hand below cutY: the "1-3 px line"), hand 1.25x; conductor focusB -> open eyes; New Yorkers
  SILENT laugh (moves.ts mLaugh silent: closed grin, no mouth flap, small shake) + hop x0.3 (no bob); hori: never
  blinks, never lids (brows >= 0); everyone: blinks open/shut only (no half-lids); peer lean 8 f in / 8 f out, v23 / v30
  rows start 10 f before the cut; hook: hover 0.6 r (a hand-height), presses 3 down eased-IN / 2 on / 3 up (GO_PRESS,
  lag + travel kept), v05 blink @v05+6, eyes to her finger on "tap?", tremble, "O" until "Did" then tight; face-tint
  cap in cardlight.ts (light 50 % desaturated); pale-card hunt: NOT the lazy redraw (eager shows the step too): the
  card's key-light visibility map changes at f1209 (debug view carddbg 1); caster hunt running (cardvis log).
- next: v23 caster result -> lead; clips v01-v05 v23 v25 v30 v35 v36 v13; drawing (ink / brows / faces).

## ROUND 2 (2026-11-21 07:20, lead's list after the 06:23 second draft; gates_v4/gates_v4.md)
- done 07:20: (1) New Yorkers: the arm with no grip point goes to the belly BEHIND the torso (moves.ts mHold), nothing
  crosses the sign's words; (2) conductor cap plain navy (people.ts uniformCap(..., plain): no gold band, silver badge;
  profile hat band dark navy); (3) v10 nervous hover for lab_a..d (moves.ts nervy: 3-f twitch every 13-19 f, tremble,
  eyes dart to the lamp) + v10b SLAM curve on their timed "down" (LAB's rows already press one after another, gap 6 f);
  (4)/(5)/(6) v15: the logged lab_a/b/c/d at f647+ were HIDDEN row-1 cards (rowG[1].visible = false): member.ts cast log
  now skips a card whose parent is hidden; v18 point 4 f later + 2 f shorter. v36 not moved (LAB's aim switch, see report)
- done 07:45: draft shots v10 v10b v15 v18 v33-v35 rendered with the cast log (out/pointing_cast/r2shots/), checked.
  NY free arm now HIDDEN (any arm behind the sign threw its shadow on the words; armWrap `hide`); profile cap: no gold
  glint; prankB grip clearance +0.12 r. Merged recount (out/pointing_cast/castlog_merged_r2.json): arm-out 17.3 %,
  own-face 0 in reshot shots. Ticked in audit_r1/FIX_LIST_CAST.md "CAST STATUS 07:45". No render / token held.
- next: v36 point later once LAB moves the aim switch to point#6-3; otherwise wait for the lead

## R1 HANDOVER (2026-11-21 05:45, CAST #3) - READ THIS FIRST (fix round 1; the V7 block below still holds)
STATE: tsc 0. No render / token / slot of mine running. Clips: out/pointing_cast/r1clip/test/ (v03, v04-v05, v36 at
05:20), stills sleeve1/ sleeve2/ smear/ v5hall4/. Sheet: pointing_preview/CAST_R1_sleeve_arm_before_after (DRAFT).jpg.
**DONE (seen on draft stills / clips):**
- SLEEVE ARM (people.ts armWrap + sleeveOf, SLEEVE_W 12 u): every pointing arm (and her press arm) is a sleeve band in the
  top's colour, cuff, the long point hand (index along the arm, thumb on top); driver navy + white glove (1.18x),
  conductor navy + bare hand, kid bare arm; kit "reach" points get the band too. Seen: v20 f990 f1002, v18 f880, v13 f560,
  v35 f1910, v36 f2030, v21 f1043. Thin ink lines stay for the other arms.
- v13 / v14 own face: 0 (mButton never follows a "button" above the mouth / side-on above the shoulder; aimArm keeps a
  side-on point at chin height until clear of the nose). The PRESS: lamp first, then the finger (beats_v4 GO_PRESS lag /
  travel / hold / up, eased, no teleport; seen every frame f105-173); the red: hover lifted, down over 5 f from v04's first
  frame, lands f179, in-between "o" f181, shock O f182 (seen f174-197); no idle blink through the Go run + red (a blink
  hit f176-178). Green: mouth shut. Hori: NO glasses (fits.ts + people.ts), v24 f1262 eyes open (freeze row). Shout
  mouths end at their cut (v24 / v27), boss smiles shut in v28-v30. Driver v20: two fwd profile points (no ear beat),
  big shout mouth y1 from "Signal". v36: hover at the button, point on point#6, LOOP TAIL: from ev:loopTail the hand eases
  8 f back into the hover (mButton blendFrom), frame-0 face 2 f in; moves.ts setLoopWrap = idle life + blinks on the
  film-start clock from the tail (seam). Idle life ~1.6x bigger (lead: life 6.9 % vs refs 13-17 %). fwd = always the
  front arm. Forehead smear: gone on fresh f0 / f1990 / f2040 (LAB took the researcher out).
**NEEDED FROM OTHERS:** LAB: at ev:loopTail switch her aim back to the BUTTON (btnV) and her look to the dark lamp, as on
  frame 0 (now the aim stays on the red lamp, so the hover has no button and the hand vanishes f2054-2065); LAB's dome
  dip must follow beats_v4 GO_PRESS / RED_DOWN (exported: ON the dome from goN + lag + travel for hold frames; red from
  ev:red+6); v12 researcher card on its own pole (LAB rows). STATION: the New Yorkers' hands on the sign's top corners
  (their cards are behind the sign: hands must be drawn in front or the sign held lower). LOOK: none open from me.
**OPEN (mine):** v21 kid pop f1052-1055 (not reproduced yet), v29 notebook hands, eyeline flip v04 -> v05, every-frame
  check of v20 / v13 / v14 / v35 clips with the sleeve, the arm-out recount (the sleeve does not change it).
**NOT DONE on purpose:** the film-time clock (the diagnosis was wrong: two clock-pinned runs still differ after ~20 f).
- done 06:10 (lead's open blockers): NY sign: moves.ts `mHold` (both hands grip CastOpts restL / restR; arms are sleeves:
  a kit arm ending in a grip hand gets the sleeve band) and actBeats gives prankA / prankB the hold automatically whenever
  STATION passes onSign rest points (STATION's HANDS now grip the sign's TOP edge). v29: a visible hand on the pad's
  bottom edge + a hand round the pen (people.ts heldProps). v05 eyeline: a fixed up-left gaze, no blink on the swap
  (look `noBlink`). Kit "reach" points (the conductor) get the sleeve band. Running: whole-shot clips
  out/pointing_cast/r1shots/ (v05 v13 v14 v18 v20 v21 v29 v31-v36) with the cast log.
- next: every 2nd frame of those clips (pops, arms across faces), the v21 kid pop, arm-out recount, tick the list, report.
- done 06:50: whole-shot clips r1shots/ (v05 v13 v14 v18 v20 v21 v29 v31-v36) looked at (every 2nd frame; v21 every frame):
  NY: both New Yorkers grip the sign's top edge with sleeve arms (v33 / v34), the conductor's navy sleeve reaches the board
  (v32) and the sign (v35); v29 hands on pad + pen; v21 hop removed (it was the pop); v05 gaze fixed; v18 mouth shut.
  Cast log (merged with the 03:54 pass): arm-out 20.8 %, own face 330 = the New Yorkers' grips at chin height -> mHold
  slides a grip out of the head outline. Trims: v18 point from "Pointing" end to wait+8, v20 point 28 f. fwd only when
  not seen from behind (TRAIN's v20 is now from behind him). Running: r1shots2/ (v18 v20 v21 v33 v34 v35) to re-check.
- next: look at r1shots2, recount, report.
- done 07:00: r1shots2 (v18 v20 v21 v33 v34 v35) + recount (castlog_merged_r1b.json = the 03:54 pass with my re-rendered
  shots swapped in): arm-out 19.7 % (v20 65 f, v32 62, v18 56, v36 45, v14 43, v13 36, v35 26, v21 22, v31 20); own
  face 3 near-edge hand-frames (v14 f617 1.0 r, v35 f1925 0.89 r) from 330. Card rim 1.7 -> 0.6 (LOOK #17; DRIVER 0.65):
  stills rim/ f0 f182 f560 f1285 f1836: faces keep their edge (the bold contour). v20 is now filmed from BEHIND the driver
  (TRAIN): his arm reads as a thin line up-right the whole shot (counted as arm-out): needs TRAIN's final lens.
- next: TRAIN's v20 lens; LAB v14 (empty chairs in frame), v12 card hold; STATION v32 trim; LAB loop-tail aim.

## V7 HANDOVER (2026-11-21 04:05, CAST #3) - READ THIS FIRST (the V6 block below still holds for the look + the press)
STATE: tsc 0. No CAST render, stills job, RAM token, stills slot, part file or pinned bundle copy of mine left.
**LIVE since the director's full draft pass (03:23):**
- CARD SPEED (kit/cards/card.ts `lazy`, member.ts passes it; switch `--props '{"cardlazy":0}'` = the old behaviour): a
  cast card that is beyond lodM AND outside the lens's view (sphere 1.5x its half diagonal + 1 m) is not redrawn; it is
  drawn the moment it can be seen, and before ANY other camera draws it (mesh.onBeforeRender: the shot's GI probe cube).
  Draft s/frame A -> B: v02 1.99 -> 0.32, v03 1.82 -> 0.16-0.56, v04 1.78 -> 0.11, v05 0.76 -> 0.23, v18 0.96 -> 0.26;
  the full pass ran booth / steam shots at 0.13-0.2 s/frame. Proof: "done 03:40" below (stills 10/13 bit-identical,
  f272 <= 4 levels on 0.5 % px; cast log identical, a row per card per frame). Lead ACCEPTED it (04:00).
- Acting: v18 point held to wait#1+12 (seen f903: arm up with the tick); v36a stare (seen f1967: wide eyes); kid v21
  proud closed grin (seen f1043); NY skins warm (seen f1786); v24 Hori: f1262 / f1263 STILL SHUT in the full pass (his
  idle blink fell on v24's first frames) -> 04:00 freeze 0.29 @v24-3 .. clear#2.end (stops the idle blink): NOT yet seen.
**NOT DONE, on purpose (tell the lead):** the "film-time clock" for the AO pass. My 03:05 diagnosis was WRONG: N8AO sets
  its "time" uniform from performance.now() but none of its shaders read it; two detclock runs of v03 still differ
  after ~20 frames (ab7 D1 vs D2: 0/69 identical, max 75), exactly like two plain runs. The pipeline's run-to-run drift in
  sequential renders (identical for the first ~20 frames, then diverging; stills are repeatable) has another cause, not
  found (suspects: GPU / ANGLE state, the X3595 "undefined derivative" shaders). `detclock` stays a harmless test switch.
**OPEN:**
1. v18 + v36 (LAB): full pass f880, f903, f2020: her arm line still ends at the lamp housing's lower-right corner, the
   HAND is hidden behind the housing (the 02:10 lamp move did not clear it on these frames).
2. v24 f1262: re-check Hori's eyes after the 04:00 freeze row (one still or the next pass).
3. Arm-out: the director's full pass has the cast log (out/pointing_v4/castlog_v4_draft.json, 2006 of 2054 frames:
   the 48 missing are v23b 1214-1261, the round-window POV with no person in frame = correct): run castgate.py on it.

## V6 HANDOVER (2026-11-21 01:55, CAST #3 on the laptop)
STATE: tsc 0. No CAST render or stills job running, no RAM token or stills slot of mine, no part file.
COLD CHECK done on fresh bundles: v5cold/ (14 stills), v5face/ + v5face2/ (every face she uses + Hori, coal man, boss,
conductor, kid, driver), clip v5clip2/ (v03-v05 re-rendered 01:45 with every fix, every frame of v03 looked at).
**DONE + SEEN on draft renders (details in the dated lines of "V5 ON THE LAPTOP" below):**
- THE PRESS rewritten (lead 22:55, OPENING_AUDIT_v5): long skin point hand, index STRAIGHT DOWN every frame (ext.fdir),
  fingertip on the dome's far rim as seen (member.ts touchOf / CastOpts.touchR, default 0.12 m for her), ON the dome
  goN+1..goN+5 = LAB's buttonDipAt, hover 0.28 r above, slides sideways off her face, the ink forearm runs on past the
  kit reach. The red: hand down full on v04's first frame (f174), shock face (ohWide + "O") from f176, frozen; v05 hand
  still at the dome. Clip v01-v05 + v36a: out/pointing_cast/v5clip/shots/draft/ (looked at: v03 every frame, rest
  every 2nd / 4th). Cast log works on a whole-shot render (castlog_v5clip.json).
- v5 LOOK: bold outer ink contour (member.ts drawInked, 3.2 du), bigger eyes (toon.ts FaceX.eyeK, additive; people.ts
  EYE_V5; her brows capped under the fringe, browMin -24), CAST_LOOK rimPx 4.4 -> 2.4 (DRIVER 4.8 -> 2.6). The hair clip
  tried at 23:30 was REMOVED at 01:00 (it read as an orange slash over her brows in v05). `--props '{"castV5":0}'` = old look.
- kid v21: `fwd` profile point on the near arm, face visible on TRAIN's new lens; coal man v26 shades with the LEFT hand.
- Sheet: pointing_preview/CAST_v5_stills_0150 (DRAFT).jpg (opening every 2nd frame, before / after, key poses).
- 01:00 the lead's "orange stripe over her brows" = my hair clip: REMOVED; her brows capped under the fringe (browMin -24).
**OPEN, in order:**
1. v18 + v36 (LAB): on LAB's newest lens the lamp HOUSING stands between her hand and the lens: the point's hand is drawn
   behind it (cold f880, f2020: no hand). LAB: move the lamp off her shoulder line or give an aim just outside the
   housing's lower-right corner; then re-check 880 / 2020 (+ every 2nd frame of v18 / v36).
2. ARM-OUT recount: NOT re-measured (a full draft film is ~2.5 s/frame here = 85 min of RAM token). Estimate from the
   18:55 log: 519 f -> about 455 f = 22 % after the CAST cuts (v18 86 -> 43, v20 53 -> ~32); LAB / STATION cuts (v13,
   v14, v07, v12, v32, v35) are needed for <= 16 %. Measure in the lead's draft film pass: film_v4.py with
   `--props '{"castlog":1}' --keep-browser-logs`, then castlog_extract.py + castgate.py (commands below).
3. v04: lab_d sits right behind her pressing hand (hand 0.88 r from lab_d's face, castgate WARN): LAB nudges lab_d.
4. The hover in LAB's lowest lenses (v02 / v36a) sits a little high above the dome: fine at phone size; re-check after
   any LAB lens change (stills 0, 52, 115, 1948).
5. Driver v20 side-on reads (glove beyond his face at the lamp's height) but is small; kid v21 arm runs along a grey
   rail (TRAIN); coal man / far figures: a white DASHED rim on the contour (pre-existing, card shader: LOOK).
6. Old list items still open: New Yorkers' sign hands inside their head outline (STATION), heads > 25 % (lens owners).

- done 02:25 (LEAD: card speed): CARDPROF (member.ts, --props {"cardprof":1}) on lab f60-79 and hall f380-399: EVERY frame
  all 28 cast cards redraw (37.8 Mpx of canvas): the 24 hall volunteers + hall researcher redraw in the BOOTH shots although
  they stand 40 m away, off the frame; in the hall the 4 booth cards likewise. Held poses never hold: the idle life + lens
  glides change every visible card's pose each frame (a real drawing change). FIX (pixel-identical by construction):
  kit/cards/card.ts CardOpts.lazy = a key change on a card that is beyond lodM (no shadow proxies) AND outside the lens's
  frustum (sphere 1.5x the half diagonal + 1 m) is only remembered; drawn when it can be seen, from the pose its key was
  made from (member.ts keyP). member.ts passes lazy (switch --props {"cardlazy":0} = old behaviour for the A/B).
  Acting (lead 02:20): Hori v23 peer ends at v23b (v24 f1262 opened with crushed brows = slit eyes); the kid v21 keeps his
  mouth SHUT in a proud grin (proudB) while the driver shouts.
- next: A/B runs (scratchpad cast/ab_runs.sh -> out/pointing_cast/ab/): draft clips 105-200 + 40-104 (KIT_PROFILE), noise
  baseline A vs A2, draft stills A A2 B, preview clip 160-185 + stills A B; then pixel compare + s/frame.

- done 02:30 (acting, lead + LAB): v18 point held to wait#1+12 (it dropped before the green tick); v36a face = stare
  (wide white eyes) + freeze 0.29 (no idle blink; read half-lidded). NOT in the A/B bundle (pinned copy
  _remotion-tmp/cast_ab_bundle, built 02:22 with the lazy cards + the Hori / kid fixes).

- done 02:50 (card speed): first A/B (pinned bundle, draft, f105-200 + f40-104): lazy B = 2.006 -> 0.265 s/frame (v03) and
  1.991 -> 0.318 (v02) steady, BUT B was not pixel-identical: A vs A2 (same code twice) identical on f105-125 while A vs B
  differed there (mean 0.8-2.5, max 58): the shot's GI bounce-probe cube capture (core/gi.ts bakeProbe) renders the whole
  set, cards included, and saw the 25 undrawn hall cards. FIX card.ts: a lazy card flushes its pending drawing in
  mesh.onBeforeRender for ANY camera other than the lens of its last update (probe / reflection captures). NY skins:
  prankA #b9794e, prankB #f1c39a, conductor #f4dcc5 (member.ts SKIN_OF) + the conductor's bare skin point hand
  (people.ts armWrap skinPoint): re-check after LOOK batch 2 (warm face fill).
- next: phase 1 whole-shot A / A2 / B (scratchpad cast/ab2.sh -> out/pointing_cast/ab2/), cast-log A/B (ab3.sh), then
  phase 2 stills after LOOK batch 2.

- done 03:05 (card speed): phase 1 (after the GI-probe fix): v03 A 1.82 / B 0.563 s/frame, v04 A 1.775 / B 0.108;
  pixels: A vs A2 (old code twice) are NOT repeatable any more (mean 2.3, never identical): CAUSE FOUND: N8AO (node_modules
  n8ao) feeds performance.now() into its noise ("time" uniform of the AO pass + its denoise blur): the AO grain depends on
  how long each frame took, so ANY speed-up changes the grain. Test-only switch member.ts  (performance.now() =
  the film time of the frame) makes the grain a function of the frame. Running: ab4.sh (A, A2, B whole shots + preview)
  on the pinned bundle 09072d4b (copy _remotion-tmp/cast_ab_bundle).

- done 03:40 (card speed, PROOF; pinned bundle 09072d4b): (1) old code twice with detclock (N8AO clock = film time):
  v04 whole shot BYTE-IDENTICAL A vs A2 (without it A vs A2 differ: mean 2.3/255, 3.7 % px > 8). (2) STILLS (each its own
  JPEG, no x264 spreading), detclock, A / B / A2 on f0 110 133 175 227 272 390 629 995 1285 1505 1852 2040: B = A
  bit-identical on 10/13; f1285 + f1505 (steam) differ in A vs A2 too (steam is not repeatable: Math.random in
  steam_loco); f272 (hall) B differs in 0.5 % of px by at most 4 levels, scattered single JPEG blocks, no object.
  (3) mp4 clips with detclock: v04 f174 identical, then zero-mean grain mean <= 1.24/255 (x264 mb-tree spreads any tiny
  change over the whole picture: the clip compare overstates). (4) CAST LOG: v05 (48 f frozen hold) + v18 (86 f) A vs B:
  144 / 258 rows, a row for every card on every frame in both, 0 rows different. (5) SPEED (draft, steady s/frame, A ->
  B): v02 1.99 -> 0.32, v03 1.82 -> 0.16-0.56, v04 1.78 -> 0.11, v05 0.76 -> 0.23, v18 0.96 -> 0.26; the hall (24 cards
  on screen) gains little. LEFT OUT: smaller canvases by screen size (not pixel-identical); the blur needs nothing (it
  only runs on a redraw). Switches: cardlazy 0 = old behaviour; detclock 1 = test only.
  Acting landed before the director's full pass (03:23): v24 Hori explicit open-eyed face + half peer on f1259-1263, kid
  proud grin, v18 point to wait+12, v36a stare, NY skins + the conductor's bare skin hand. NOT yet seen on a frame.

- done 04:50 FIX ROUND 1 (lead): (4) v13 / v14 own-face (363 hand-frames in the full pass) = the hall volunteers' HOVER
  arm: LAB's set aims them at their little lamp while they point, and mButton followed it up to the face. mButton now
  rests when the "button" is above the mouth or (side-on) above the shoulder line; aimArm keeps a side-on point at chin
  height until it is clear ahead of the nose. Stills f550 f580 f605 f640 (v5hall4): castgate own face 0. (5) v36: hover
  at the button, the point snaps up on point#6 (f2012; hover row after the point row wins to point#6-4: one snap, armdbg
  f2004 hover, f2008 k 0.88, f2016 full). (1) v36 "coat through her head": LAB took the researcher out; the pale band on
  the LEFT of her face is STILL there on f2000 / f2016 (no card behind her now): it is light (the card rim / a lamp), LOOK.
  v18 / v36 hand still behind the lamp housing (f2016). v24 Hori f1262 eyes OPEN (v5hall still). Hori idle-blink freeze.
  The film-time clock: NOT landed (wrong diagnosis, see V7 block). member.ts `armdbg` debug prop added (prints a card's arms).
- next: (3) v20 mouth on "Signal" + drop the ear beat; (2) the SLEEVE pointing arm; (6) idle life check on a clip.

## V5 ON THE LAPTOP (CAST #3, 2026-11-20 from 22:20; newest line last; the render PC now)
- done 22:50: v5 LOOK (lead: "theirs thicker outlines, more face detail; ours plain"): member.ts `drawInked` = a bold
  OUTER ink contour (silhouette stamped in a 16-way ring, 3.2 du main cast / 2.6 hall volunteers; CastOpts.inkOut);
  toon.ts (shared kit, ADDITIVE, default 1) FaceX.eyeK = eyes drawn bigger about their centre, brows ride up; people.ts
  EYE_V5 (her 1.22, driver 1.12, ...). Switch `--props '{"castV5":0}'` = the old drawing for before / after sheets.
  moves.ts mPoint `fwd` = a PROFILE point along the heading on the NEAR arm (whatever side the lens is on); the kid's
  v21 row uses it (fwd [1.15, -0.3]). tsc 0.
- next: stills v5a (out/pointing_cast/v5a/) -> look -> before set (castV5 0) -> sheet; then the Go-run + red clip.
- done 23:15: v5a stills LOOKED AT (f0 109 157 175 196 230 620 800 880 995 1040 1285 1380 1505 2020): bolder contour +
  bigger eyes read; the sun-side RIM washed the new contour pale -> CAST_LOOK rimPx 4.4 -> 2.4 (DRIVER_LOOK 4.8 -> 2.6).
  v20 side-on (TRAIN's dir wiring) f995: the glove points screen-left beyond his face at the lamp's height: reads, small.
  v21 f1040: the kid's FACE now visible (TRAIN's new lens), the fwd arm straight out screen-right (runs along a grey
  rail at the same height: TRAIN). v26 f1380: shade hand hidden behind his head from behind -> mShade back view 1.5 r out.
  LEAD 22:55 (OPENING_AUDIT_v5: "THE PRESS IS BACKWARDS", a sideways finger in the air on each Go, a fist on the dome
  between): mButton REWRITTEN: the long skin point hand with the index STRAIGHT DOWN on every frame (ext.fdir, people.ts
  armWrap), hover = tip 0.5 r above the dome's top edge, tap = ON the dome goN+1..goN+3 (cued ON ev:goN now), the whole
  hand slides sideways off her face (never a finger bend); the red: down full on ev:red+1, face ohWide + "O" on ev:red+3
  (2 f after the hand lands), freeze from red+3. Backups: scratchpad moves.ts.bak, toon.ts.bak.
- next: stills v5b (0 52 108 110 115 175 177 230 1380 1948), then the DRAFT CLIP f100-200 (RAM token), every frame.
- done 23:45: v5b / v5c stills: the press f108 READS (fingertip down on the dome's top edge); the hover floated at her
  cheek (a 0.95 HH reach clamp: the dome stands in front of her, so it lands far down her card) -> the ink forearm runs on
  (ext.by past the kit's 0.888 HH); on LAB's new big-dome lens (v5c) the tip at "aim - 0.12 r" hid INSIDE the dome
  (f1948) -> member.ts `touchOf` / CastOpts.touchR (default 0.12 m for her) = the cap's FAR RIM as seen (ActEnv.touch),
  mButton lands there. TAP_D now ON the dome goN+1..goN+5 = LAB's buttonDipAt (tap LEN 8). Her yellow HAIR CLIP
  (people.ts hairClip). Coal man v26: the right hand was cut by the frame edge -> the LEFT hand shades. f177 (red+4):
  ohWide + "O" reads.
- next: stills v5d (0 108 115 1948 1380), then the clip v01-v05 + v36a with the cast log (RAM token).
- done 00:20: v5d stills (hover slid beside her cheek: hover gap 0.42 -> 0.28 r). DRAFT CLIP v01-v05 + v36a with the cast
  log (out/pointing_cast/v5clip/shots/draft/, log v5clip.log; ~2.5 s/frame on this PC, 23 min). LOOKED AT: v01 every
  4th, v02 every 4th, v03 EVERY frame (crop of hand + dome), v04 + v05 every 2nd + full 174 176 184 198 230. THE PRESS
  READS: six presses, each fingertip-down on the dome's top edge on goN+1..+5 (108-112, 121-125, 134-138, 145-150,
  155-160, 164-168), hover just above between, no sideways finger, no pop, nothing through the button; the red: hand ON
  the dome from f174 (v04's first frame), smirk on 174-175, the ohWide "O" from 176, frozen; v05 hand still at the dome.
  CAST LOG ON A WHOLE-SHOT RENDER WORKS (castlog_v5clip.json, 695 rows; castgate: arm out 0, own face 0, see-through 0;
  WARN her hand 0.88 r from lab_d's face in v04 (lab_d sits right behind her hand: LAB); heads 0.29-0.33 in v01-v03 /
  v36a = LAB's new close lens (the lead's "biggest face in the film"): the gate calls it FAIL unless marked close-up).
- next: cold stills v5cold + before (castV5 0) -> CAST_v5 sheet -> handover block.
- done 01:00 (LEAD relay of the DIRECTOR's v05 bug "an ORANGE SLASH across her brows"): it was MY yellow hair clip, which
  on the close lenses sat on her fringe right over the brows: REMOVED. Second find on the same zooms (f0 f52 f176 f190
  f210): with eyeK 1.22 her raised brows (browUp 6-11) went up INTO her dark fringe and read as pale rings: SPECS
  lab_woman face browMin -24 (a brow ceiling under the fringe line). Other faces checked on v5face/ (f1030 kid + driver,
  f1190 / f1285 Hori, f1410 coal man, f1505 boss, f1690 conductor): no stray stroke, no non-ink colour on face lines.
- next: v5face2 (0 52 157 190 210 915 1948 2040) = her brows after the ceiling; rebuild the CAST_v5 sheet; report.
- done 01:20: v5face2 LOOKED AT (zooms of f0 ready, f52 green, f157 sure, f190 shock, f210 v05, f915 grin, f1948 v36a,
  f2040 v36): two clean dark brow strokes on skin in every face, nothing orange on her forehead (the lead's 01:15
  "orange double stripe" = the removed clip; the 00:49 / 00:52 renders predate the fix). Sheet:
  pointing_preview/CAST_v5_stills_0110 (DRAFT).jpg. Running: v03-v05 re-render with the fixes (out/pointing_cast/v5clip2/).

## V5 HANDOVER (2026-11-20 evening, new PC -> next PC) - READ THIS FIRST
STATE at 19:25: no render / stills job of CAST running, no RAM token, stills slot freed, no part file / temp bundle.
tsc: 0 errors in cast/* (the only tsc errors at hand-over time were in STATION's v4/sets/ny_station.ts, mid-edit).
**DONE + CHECKED (on draft stills / draft shot renders, every 2nd frame for the opening):**
- The young woman (`lab_woman`), BEATS_V4 rows on the director's EV events ("ev:lampGreen", "ev:go1".."ev:go6",
  "ev:red", "ev:xPop"; moves.ts `setEventCues`, registered by beats_v4.ts): frame-0 hover, eyes widen on green, six
  presses (fingertip on the dome, hand back up), faces unsure -> steady -> sure, the hand down on the red, `freeze`,
  X; v36a ready pose; v18 point only on "Pointing and saying it" then down; v36 arm up first to last frame, mouth open
  on "say". Lamp is up-LEFT of her (LAB 18:50): her right arm (screen left) points up-left at the RED lens.
- Moves: mButton = straight ink arm + finger bent down (continuous bisection keeps the wrist a hand-width off her face),
  `freeze`, `write` (boss notebook "RULE" + underline), `shade` (coal man), mPoint `auto` (arm on the aim's side),
  call `earFrom` (fist to the chest on a cue: driver v20 on "shout"), gesture.ts `faceGuard` in every aimed point.
- Looks: NY conductor navy jacket + navy cap, no glasses; the kid bare hair + yellow tee + backpack (no peaked cap);
  pyjamas = cream top with bold red stripes, piped collar, red trousers, pink slippers.
- Cast log: member.ts prints CASTLOG with `--props '{"castlog":1}' --keep-browser-logs`; bench/castlog_extract.py;
  bench/castgate.py = the DIRECTOR's gates_v4 card tests (inscribed ellipse + 5 %, own face FAIL / other WARN, arm-out
  12 / 16 %). Full-film log of the 18:19 draft: out/pointing_cast/castlog_v4_full.json (arm-out 25.3 % then; per
  character + per shot in the 18:55 line below).
- Frames checked: see the dated lines below (round 5 f0..f1400, cold f0..f2053, booth f0..f2053, v4booth_clip every 2nd
  frame of v01-v05, press stills f109 f117 f119 f123 f135 f147 f157 f163 f175 (hand visible on every press after the
  19:20 fix), v17 f800 (stripes read)).
**HALF-DONE (code saved + compiling, NOT yet seen on a render):**
- moves.ts `compose`: DEFAULT IDLE LIFE under every hold (block "DEFAULT IDLE LIFE"), idle blinks under `still` faces
  (only a freeze < 0.3 stops them), per-card seed `e.seed` (gesture.ts ActEnv.seed, member.ts `cardSeed` from the card
  name). Check it does not blur any snap and that the v04 / v05 freeze stays dead still.
- moves.ts `mShade` + beats_v4.ts fireman row "shade" @v26-3 .. clear#3-2: not seen on a still.
- The 19:20 press rework (mButton bisection) seen on stills only, not yet in motion.
**OPEN, in order (the lead's latest messages; nothing cancelled):**
1. Draft clip of the last 20 frames of v02, v07, v08, v10b, v14, v25, v33 (idle life visible, snaps intact, freeze
   still); then v01-v05 every 2nd frame again (the press rework in motion).
2. v20 side-on (TRAIN flag `V20_SIDE_ON` in v4/sets/cab.ts, staging v4/sets/today.ts `sideOn`, driver on his LEFT arm,
   faces screen-LEFT): his arm never leaves his silhouette. Needed: a PROFILE point that leaves the body, near arm
   straight forward at shoulder height toward the lit green lens, glove beyond his face inside the window glass, thumb
   visible, ~25-30 f, then the fist at the chest on "shout" (forearm across the chest, under the chin line). Likely
   route: call `dirFrom` / `dirAim` (screen direction, e.g. dirAim [-1.4, -0.05] when he faces screen-left) set by TRAIN's
   sideOn map, or an automatic "profile: point along the heading" in aimArm. Stills: 975 995 1005 (v20).
3. v21 the kid: a big kid-sized copy of the same profile point, whole arm out, held (row: point dir [1.0,-0.55] left).
4. v26 coal man shading his eyes (row written) on TRAIN's lens: stills 1365 1380 1392.
5. Arm-out share (lead accepts ~15-16 %): after LAB's wave holds (v13 ~20 f each, v14 keeps all), STATION's v32 ~30 f /
   v35 ~25 f, LAB's v07 / v12 reaches ~15 f: a fresh full-film cast log -> castgate per character.
6. New Yorkers v33-v35: their sign hands sit INSIDE their own head outline (247 hand-frames, FAIL) + the sign over
   prankB's face: with STATION (restL / restR on the sign edges below chin height).
7. LAB is moving frame 0's lens in (lamp big upper-left, her head + shoulders, the button): re-check the opening rows on
   the new lens; v17 re-check when LAB / LOOK note the big cereal box + morning palette.
8. Heads > 25 % (re-measure on new lenses): v08 lab_b 0.264, v16 lab_a 0.253 (LAB); v23 hori 0.258, v27 fireman 0.26
   (TRAIN). Hall crowd hands over others' faces (depth overlaps, WARN) in v06 v08 v10b v12 v13 (LAB).
9. Second cold render-ready pass over every BEATS_V4 row (incl. the hall through LAB's rows, kitchen, the NY trio
   through STATION's set), frames listed here.
**COMMANDS (Git Bash, from studio/):**
- tsc: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json`
- beat-table probe (no GPU): esbuild a .ts that imports cast/v4.ts `beatReportV4()` (see the scratch pattern in
  bench/probe_beats.txt), `node_modules/.bin/esbuild x.ts --bundle --platform=node --format=cjs --outfile=x.cjs
  --loader:.png=empty --loader:.jpg=empty --loader:.glb=empty`
- stills: `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft
  --props '{"castlog":1}' --stills <frames> --out out/pointing_cast/<name>/`
- shots: `RAM_ME=CAST node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit
  --quality draft --shots <ids> --conc 1 --props '{"castlog":1}' --keep-browser-logs --out out/pointing_cast/<name>/
  > out/pointing_cast/<name>.log 2>&1`
- log + gates: `python studio/src/videos3/pointing/cast/bench/castlog_extract.py <log> <out.json>`;
  `node briefs/v3/pointing/director/probe_v4.mjs json out/pointing_cast/shots_v4.json`;
  `python studio/src/videos3/pointing/cast/bench/castgate.py <out.json> out/pointing_cast/shots_v4.json 2054`
  (python = `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 <ROOT>/tools/.venv/Scripts/python.exe -s`)
- frames: `node briefs/v3/pointing/director/probe_v4.mjs` (shot table on the clock).

## NEW PC (2026-11-20 afternoon, CAST #2): done / next (newest last; read this first after a restart)
- done 16:05: the young woman WIRED. LAB's v4 lab.ts already builds `lab_woman` with `timeBeats(BEATS_V4, R_V4)`. New
  EVENT CUES "ev:<name>[+-n]" (moves.ts `setEventCues`, registered by beats_v4.ts from the director's v4/timeline.ts EV:
  ev:lampGreen, ev:go1..ev:go6, ev:red, ev:redBeatEnd, ev:xPop, ev:loopPoint): any resolver reads them, so LAB's R_V4
  call works unchanged. Her rows (beats_v4.ts): hover from frame 0 (rows start at "@v01-6", the gate hides the pre-roll),
  eyes on the lamp (look row), widen + finger lifts a hair on ev:lampGreen, one press per green flash (tap at
  "ev:goN-1": full on goN+1/+2, back up by +5), faces unsure -> steady -> sure (smugB) every two presses, "down" on
  ev:red (2 f snap, stays), FREEZE (new move `freeze`, lifeK 0) from ev:red+4, v05 frozen stare (lifeK 0.12). mButton no
  longer pulls the eyes to the button. cast/v4.ts: `castMemberV4`, `labWomanV4`, `timedV4`, `beatReportV4`.
  Probe (no GPU): every lab_woman row resolves; the press curve per frame is right.
- done 15:40: film draft stills f0 50 90 97 116 139 155 168 185 215 850 1830 1860 (out/pointing_cast/v4film/stills/
  draft/, on the 08:25 plan clock). SEEN, BAD: (1) the hover = a single finger standing UP beside her face (a middle
  finger) in f0 / f97 / f155 / f168; (2) v18 f850 + v36 f1860: the point up at the lamp right above her runs straight
  ACROSS HER FACE; (3) press 5 face smugB reads sleepy; (4) v02 f50 her head 29 % of the height (not a close-up: LAB's
  G0 lens). GOOD: frame 0 head 18 %, eyes wide up on the lamp, the freeze face (f168 / f215) reads "caught".
- done 15:55: FIXES. gesture.ts `faceGuard` inside aimArm (EVERY point of every character): the straight arm + hand
  turns away from the head until it is one hand-width outside the head outline. mButton = one straight ink line from the
  shoulder along the line to the dome, the index continuing it (never up); hover = tip 0.42 r short, the press slides it
  on. Sure face = bright, brows -3, smirk. Driver: ONE call "point#2" -> "clear#1" (was a 10 f chest hold = a pop); kid
  call "shout#1" -> "clear#1" (6 f late); coal man looks up on "shouted#1" (v25); boss nods on loved / made / rule#2 /
  knew. 2D check page: Sheet "woman" (`COMP=PointingCastSheet ... PROPS='{"page":"woman"}'`): her beats on the real
  clock + point-up tests. The real voice is in (words.ts, 192 words): every cue moved by itself (go#1 89 -> 107).
- done 16:20: round 3 film stills (out/pointing_cast/v4film2/, real voice clock). THE PRESS NOW READS: mButton puts
  the FINGERTIP on the dome with the index bent DOWN (65 % from the arm line to straight down, `ang`), the hand lifted
  straight up by g between presses; f0 (finger ready just above the dome), f174 / f190 (hand down on the red, frozen
  "o"), f230 (X + frozen stare + hand still on the button) read. faceGuard fixed (the shoulder sits inside the head
  circle: only the forearm + hand must clear by a hand-width): v36 f1890 the arm goes up-left at ~55 deg, hand clear of
  the face, BUT it points at the wall clock more than at the lamp (the lamp is straight above her: LAB request).
  Weak: f108 / f156 the full press hand is small and the lit cap is the same cream as her skin (LOOK / LAB: keep the
  cap red when it lights). Hover lowered (g 0.34 r, green lift 0.18: f52's hover sat at her cheek).
  CAST LOG: stills render with `--props '{"castlog":1}'` -> `bench/castlog_extract.py` -> `bench/castgate.py <log>
  <shots.json>` (the 4 card gates without a video). Round 3: no see-through, no big heads; the press arm is now
  `touch` (not "arm out"); "hand in a head box" FAILS on f156-174 although the hand is beside the dome, outside the
  round head: the gate's head BOX includes the corners under the chin (DIRECTOR: test an ellipse).
- done 16:35: round 4 (v4film4/; the run died at f1880: the film is now 1846 f long; pick frames from
  `probe_v4.mjs json`). The fingertip now aims 0.12 r ABOVE the aim (on the cap's top edge as seen: the dome hides
  what is drawn of her card inside its outline). Round 5 running (out/pointing_cast/v4film5/): first / middle / last
  + every held pose of v01-v05, v18, v36, v20, v21, v23-v30.
- done 17:00: ROUND 5 LOOKED AT (out/pointing_cast/v4film5/stills/draft/, 36 frames; film 1846 f):
  OPENING v01 f0 f20 f39 | v02 f41 f52 f104 | v03 f109 (press 1) f115 (hover) f135 (press 3) f157 (press 5) f171 |
  v04 f173 (hand coming down on the red) f175 (on the dome) f194 (frozen) | v05 f196 f218 f240 (X).
  READS: finger ready just above the dome with the index pointing DOWN; every press = the fingertip on the dome's top
  edge, hand clearly above it (f135 / f157 best); the red: the hand down on the dome, the sure smirk on the cut, then
  the frozen "o" stare up at the red lamp with the hand left on the button (f194-f240). No hand on a face, no raised
  finger, nothing see-through, her head 18-25 % (v05 is a close-up). LAB: in v05 the caption "Did you tap?" sits over
  her hand on the button (band 65.6-75 %).
  NOT YET: v18 f770 f800 f838 + v36 f1760 f1800 f1844: the arm goes up-left at ~55 deg (faceGuard), clear of her face,
  but in v36 it points at the WALL CLOCK, not the lamp (the lamp is straight above her: LAB request). An upright index
  at the end of a 55 deg arm; judge it on the clip.
  TRAIN (v20 f885 f910 f935, v21 f940 f950 f959, v23 f1060, v24 f1140, v25 f1180, v27 f1255, v28 f1300, v29 f1350, v30
  f1400): v20 the seat back hides the driver, his point is a speck of glove (TRAIN lens); v21 the driver's hands sit
  behind the kid's head (never seen) and the kid's chest-fist from behind reads as a raised fist by his head; the coal
  man's "Clear!" mouth (y1) read as a scared gasp: now `laugh` (huge grin). Heads over 25 % outside close-ups (cast
  log): driver v20 0.26-0.30 (back of the head), kid v21 0.28, hori 0.29, fireman 0.28, boss v29 0.34 (TRAIN lenses).
  CAST LOG round 5 (castlog_stills_round5.json, castgate.py): "hand in a head box" = 10 lab_woman frames, all OUTSIDE
  her head ellipse (distance 1.32 radii: the box corner under the chin) + 6 driver-behind-the-kid frames (v21).
- done 17:10: DRAFT CLIPS of v01-v05 (out/pointing_cast/v4clip/shots/draft/), every 2nd frame looked at
  (pointing_preview/cast_v4_opening_1_the_six_presses_every_2nd_frame (draft).jpg, ..._2_red_freeze_X_...jpg): six clean
  presses on the flashes (finger down on the dome, back up between), the face steps unsure -> steady -> sure, the hand
  comes down on the red cut (f172 half, f174 on the dome), dead still f176-f194, X pops f226, nothing pops between
  frames. Fixed after the clip: v02's hover sat beside her mouth (low lens, dome high on screen): the hover never lifts
  the hand above her chin line now (re-rendered v02: hand at the dome's rim, off the face). v27 re-rendered: the coal
  man's CLEAR! is a big open grin now (TRAIN: the caption "CLEAR!" sits on his chin in that lens).
  RIG SHEET: pointing_preview/cast_v4_rig_sheet_2_with_the_young_woman (draft).jpg (her 8 film frames, the crew in the
  film, the bench, anti-theft + clown). Script: bench/rig_sheet_v4.py.
- done 17:25: the opening with the cast log on the 17:05 clock: out/pointing_cast/castlog_opening_prev_clock.json (482
  rows, f0-240: her + the researcher every frame). FINAL CLOCK (2054 f, 38 shots) in: hook times all from EV (red 173);
  NEW rows v36a (frame 0's ready pose: hover + eyes on the dark lamp); v36's point is up from its first frame. Every
  BEATS_V4 row resolves on the final clock (probe). Started: the cold render of v01-v05 + v18 + v36a + v36 with the cast
  log (out/pointing_cast/v4final/), waiting for the RAM token.
- done 17:45 (lead's notes from STATION + TRAIN): NY conductor = navy jacket over a light-blue collar, navy uniform cap,
  dark hair + dark moustache, no glasses (fits.ts / people.ts; was grey + glasses); BEATS_V4's NY rows DELETED (STATION's
  word-cued beats in ny_station.ts are the one source); the KID: bare messy hair, bright yellow tee, green backpack (no
  more toy peaked cap = no "second driver"), his v21 copy-point is OUT from the shot's first frame + a jab/hop on "clear"
  (the chest-fist hold was hidden by his back); Hori v24 mouth = the tall jaw-drop shout from "Signal" to after "clear";
  `peer` leans 20 deg (was 9) + head down a touch; the boss v29 = NEW move `write`: the notebook open at his chest with a
  big "RULE", pen scribbles, the red underline on "rule#2" (people.ts heldProps draws the open notebook when P.note).
  NY stills f1600-f1935 (out/pointing_cast/v4ny/): the conductor now reads navy + cap; STATION: in v32 the caption sits
  on his face; his face is lit pale grey under the underground rig (LOOK).
- done 17:55: TRAIN stills on the final clock (out/pointing_cast/v4train/ v4train2/ v4train3/): v20 f990 f1015 the
  driver's white glove points side-on at the green signal (TRAIN's opened cab): READS. v23 f1180 f1190 Hori leans to the
  window (peer 20 deg). v24 f1285 his mouth open on the shout. v25 f1340, v27 f1410 (big grin CLEAR!) read. v29 f1505
  f1518: the open notebook at his chest, "RULE" readable, the red underline on "rule" (page now 50 u wide). v30 f1550
  f1560 read. NOT YET: v21 the kid: he reads as a kid now (bare hair, yellow tee, backpack), but his copy-point does not
  show: his right arm was the far one (hidden), his left arm now points but the green door frame in front of him hides
  the hand (TRAIN: give him clear space to his front-right, the cab window there, or turn the lens).
- done 18:20: COLD PASS (fresh bundle, final clock 2054 f) on stills, out/pointing_cast/v4cold/ (+ v4cold2/3):
  v01 f0 f39 | v02 f40 f104 | v03 f105 f109 (press 1) f157 (press 5) f172 f173 (last frame: the red press starting) |
  v04 f175 | v05 f196 f197 f230 (X) f244 | v18 f838 f880 f922 | v36a f1948 f1966 f1985 | v36 f1987 f2012 f2053.
  Opening READS (hover, presses, hand down on the red, freeze, X; caption now under the dome). v36a: the ready pose
  (finger over the dome, eyes up), clean. v18 / v36: TRIED the arm on the lamp's side (`auto`, new mPoint option):
  her hand landed on the RESEARCHER's face in the window behind her (f880, f2012) = zero tolerance; back to the right
  arm up-left (hand by the wall clock, clear of every face). Cast log of these stills (castlog_cold_stills.json): no
  hand within 1.15 head radii of any head (the gate's box flags the press hand at 1.30 radii: box corner), heads
  0.18-0.25, nothing see-through.
- done 18:30: the cold SHOT render (v4final/) never got the RAM token in 65 min (LAB / TRAIN / STATION renders):
  STOPPED (no process, no bundle, no part file left). tsc 0; every BEATS_V4 row resolves on the final clock (probe).
  RENDER-READY (CAST side): v01-v05, v36a. NOT render-ready: v18 + v36 (the point goes up-left at the wall clock, not at
  the lamp: LAB must move the lamp / aim / the researcher's window), v21 (the kid's point hidden by the door frame:
  TRAIN). Kitchen v17 (pyjamas) not staged by LAB yet; the 1994 hall (v06-v16) people are acted by LAB's own rows in
  lab_hall.ts on my moves (hover / tap / down now = the straight finger-down press; point = faceGuard).
- 18:26 running: the WHOLE FILM at draft with the cast log (lead's word, 18:18): out/pointing_cast/v4full/ (log
  v4full.log, RAM token "CAST kit v4full"; ~0.7 s/frame, ~25 min). After it: castlog_extract -> castlog_v4_full.json,
  castgate (per-character arm-out share, head sizes per shot), sheets of every 2nd frame of the cast shots. Waiting for
  LAB's "lamp moved for the point" line, then v18 / v36 = the screen-RIGHT arm at the RED lens (lead decision).
- 18:40 done: LAB's "LAMP MOVED FOR THE POINT" read (lamp up-LEFT of her, red = the inner lens 48 deg above her
  screen-left shoulder, researcher + clock out of the arm's path): her right arm (screen left, the default) points at
  it; v36's mouth now opens on "say" (was "point"). Kitchen v17 staged by LAB: my pyjamas rows play as they are.
  next: after the full render, cold stills of the NEW booth (the full render's lab shots predate the move).
- 18:55 done: WHOLE FILM draft with the cast log (out/pointing_cast/v4full/v4full_draft.mp4, 2054 f, 38 shots; render log
  clean: no page error / NaN), CAST LOG = out/pointing_cast/castlog_v4_full.json (13,343 rows). castgate (2054 f):
  ARM OUT 519 f = 25.3 % (want < 10). Per character: lab_woman 154 f 7.5 %, lab_b 4.9, ny_conductor 4.8, lab_a 4.8,
  lab_d 4.6, lab_c 4.5, researcher_v4 3.8, driver 3.5, kid 1.7. Per shot: v18 86, v36 68, v13 55, v20 53, v32 49, v35 48,
  v14 47, v07 42, v12 35, v21 34, v33 2. Hand inside a head (ellipse +12 %): OWN face only the New Yorkers v33-v35
  (their sign hands at head height, 38-74 f each); OTHER faces = the hall crowd overlapping in depth (v06 v08 v10b v12
  v13), v07 a volunteer's hand on the researcher's head. Heads > 25 % outside close-ups: v08 lab_b 0.264, v16 lab_a
  0.253 (LAB), v23 hori 0.258, v27 fireman 0.26 (TRAIN), v34 ny_conductor 0.311 + prankB 0.277 (STATION; v34 is marked
  closeUp for the sign). Nothing see-through.
  NEW BOOTH stills (out/pointing_cast/v4booth/: f0 f52 f109 f157 f175 f196 f230 f244 | v17 f770 f800 f835 | v18 f838
  f880 f922 | v36a f1948 | v36 f1987 f2020 f2053): her right arm now points up-left AT the red lens, side-on, nothing
  behind it, clear of her face; v36 mouth open on "say it"; kitchen pyjamas at the open fridge, blank stare: read.
  next: the lead decides the arm-out cuts (story points alone are ~20 %); v13's wave does not read from the aisle lens
  (LAB); the New Yorkers' sign hands + the sign over prankB's face (STATION).
- 19:10 done (LEAD's arm-out decision, accept ~15-16 %): v18 her point only on "Pointing and saying it" (@v18-4 ..
  it#2.end, 43 f), then the arm snaps down, face "tight" until the tick on "wait", grin; v20 the driver's call gets
  `earFrom: "shout#1-2"` (new call option: the hand goes to the chest fist on that cue): point 969-1001 (32 f), fist
  1004-1038, snap on "clear" 1039-1041 (probe). v36 unchanged (arm up first to last frame). v13's 20 f wave holds are
  LAB's rows (lab_hall.ts p0 .. END -> p0 .. p0 + 20). next: the opening + v18 / v36a / v36 / v20 / v21 shot render with
  the cast log on the NEW booth (queued for the RAM token), every 2nd frame; then a fresh full-film cast log when LAB /
  STATION have cut their holds -> castgate per character.
- 19:25 done: the NEW-BOOTH shot render (out/pointing_cast/v4booth_clip/, v01-v05 v18 v36a v36 v20 v21 + cast log
  castlog_booth_clip.json): every 2nd frame of v03 looked at: presses 1 (f107-117) read, then at f119 her hand JUMPED
  behind the dome (castlog: hand 0.57 -> 0.67 of the width in one frame) and stayed hidden: with the button now right
  under her chin, the wrist sat at her chin, faceGuard swung it aside and then gave up. FIX (moves.ts mButton): the
  finger bends down only as far as keeps the wrist a hand-width off her face (continuous bisection, no steps), the hover
  lifts only as far as stays clear (the rest backs off along the arm line); gesture.ts faceGuard never snaps back to
  the face-crossing aim (returns its most-turned direction). PYJAMAS: cream top with bold red stripes, white piped
  collar + buttons, red trousers, pink slippers (people.ts pyjamaTop, fits.ts). castgate.py = the DIRECTOR's gates_v4
  test now (inscribed ellipse + 5 %; own face FAIL, other WARN; arm-out 12 / 16 %): on the 18:19 log it gives his
  numbers (25.3 %, 247 own-face hand-frames = the New Yorkers' sign hands v33-v35).
  next: stills of v03 (new press) + v17 (pyjamas), then a v02-v05 shot render.
- (older) next: when the token is free: `RAM_ME=CAST node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts
  --comp PointingV4Kit --quality draft --shots v01,v02,v03,v04,v05,v18,v36a,v36,v20,v21,v24,v29 --conc 1 --props
  '{"castlog":1}' --keep-browser-logs --out out/pointing_cast/v4final/ > out/pointing_cast/v4final.log 2>&1`, sheets of
  every 2nd frame (scratchpad clipsheet.py pattern: ffmpeg frames + PIL), castlog_extract + castgate on its log.

### REQUESTS from CAST (16:35; also in the report to the lead)
- LAB (lab.ts): (1) v18 + v36 her point at the lamp: the lamp hangs STRAIGHT ABOVE her on screen, so a point at it
  must cross her face (this rig: big head over short arms); faceGuard turns the arm out to ~55 deg up-left, where it
  points at the wall clock. Put the lamp (or the lens) so the lamp's near edge sits up-LEFT of her right shoulder at
  <= 50 deg above the horizontal on screen, at least 1.5 head widths left of her head (v36 must stay the frame-0 lens:
  so it is the lamp, or her stool, that moves). (2) the press: keep the dome's top at least ~1.3 head radii from her
  right shoulder on screen and BELOW it (it is now); the lit cap turns cream = her skin colour (f108 / f156: the hand
  vanishes on it): keep the cap red / orange when it lights (or LOOK). (3) `HOOK.x` is "she#1" now (fine).
- DIRECTOR (gates_v4.py): "hand inside a head box" uses the square box round the round head; the press hand sits in
  the box's lower corner beside her chin, outside the head (f156-f174 round 3): please test an ELLIPSE (the box's
  inscribed ellipse, padded 5 %), or I can log a `face` ellipse in the cast log rows.
- DIRECTOR (RENDER_ON_OTHER_PC.md): the film render there should pass `--props '{"castlog":1}' --keep-browser-logs`
  and keep its log; then `python studio/src/videos3/pointing/cast/bench/castlog_extract.py <log> castlog_v4.json` and
  `gates_v4.py ... --cast=castlog_v4.json`.
- STATION (ny_station.ts) casts its own beats on F(seconds) frames (fine: derived from words); BEATS_V4's NY rows are
  unused. Kitchen v17 is still the v3 re-export: `pyjamas` waits for LAB's staging.

### CHECK IN THE RENDER (only motion shows these)
- v03: six presses, each a 3 f snap down (tip on the dome on the beep) and back up; no pop between hover and press.
- v02: the finger lifts a hair on "green" (1 frame swap, small).
- v04: the hand comes DOWN on the red cut (frame 1 half way, frame 2 on the dome), then a dead stop (no breath, no
  dart) to the end of v04; v05 a breath you can just see; no blink anywhere from the red to the end of v05.
- the face swaps (v02 wide -> wider, v03 three steps, v04 sure -> frozen) are one-frame swaps, no half-blink.
- v36 -> v01 loop cut: the arm drops from the up-left point to the hover in one cut.
- v20 -> v21: the driver's point holds through "signals", fist at the chest ~0.5 s before "clear", snap on "clear";
  the kid snaps 6 f after him.

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

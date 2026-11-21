# DIRECTOR NOTES: "Why Japanese Train Drivers Point at Nothing", script v3 (film owner)

## PAUSED 2026-11-21 ~10:00 (DIRECTOR; the owner leaves, the laptop may shut down; a new session starts from here)
STATE: nothing of mine running, no RAM token of mine; tsc 0; `retime_v4.py --no-script` ALL CHECKS PASS (2066 f =
68.87 s, 38 shots); captions probe ALL PASS. Clock, captions and gates are mine; the hook pictures wait on LAB + CAST.
DONE THIS ROUND (audit round 2, lead's audit_r3/LEAD_DECISIONS_R2.md; my status list audit_r3/FIX_LIST_DIRECTOR_DONE.md):
- Caption breaks (v4/captions_plan.ts): BREAK_BEFORE (on#1 have#1 makes#1 had#1 must#1), THROUGH_CUT lines L01 L07 L13
  (their chunks run across a cut), chunks <= 6 words / 30 chars never ending on a function word: "Tap your foot" / "on
  every green light."; "Twelve others" / "have to point at the light,"; "Pointing and saying it" / "makes your hand
  wait."; "a steam-train driver's eyes" / "had gone bad."; "New York copied the pointing:"; "subway conductors" / "must
  point at a striped board.". Probe exempts THROUGH_CUT lines and shouts from the straddle check.
- Caption places CAP_POS: hook band y 0.74 for v01-v05; v10 0.78, v12 0.76, v17 0.72, v20 0.74, v27 0.70, v31 0.74; all
  others the film band 0.68. SAFE = {yMax 0.80, xMax 0.90}.
- The X (director graphic, Captions.tsx): X_POS (0.205, 0.23), X_W 0.34 = the empty LEFT wall of LAB's new frontal v05
  (spec in FOR LAB below): RE-MEASURE on LAB's real v05 (LAB 09:50 says v05 is "front-left": check the wall box).
- Cameras (shot_plan): v03 rest 0 (LAB's one accelerating dolly runs to the cut; LAB 09:50 built it u^2); v04 v05 v08
  v36a rest 0 with a LINEAR creep to the cut (cams.ts); hall drift caps 0.5 m; v12 drift 0.15 (cap 1.0); v24 cap 0.3.
- Gates (tools/v3/gates_v4.py): hold PASS 7-20 % / WARN 5-7 %; safe area (captions / GO! / X boxes + cast hands vs y 0.80
  / x 0.90); frozen runs; caption over face (FAIL) / hand (WARN); loop seam; arm-out WARN 16 / FAIL 18. qa_gates --v4.
- EV for SOUND (v4/press_events.ts -> timeline_v4.json "EV", rule-based): press, redPress, fiveLand, xPops, boardFlips,
  wavePoint, notOne, autoTaps (PROVISIONAL), birdsLift(+Each), engineIn, enginePass, nyPoint, nyDoors = doorsOpen,
  nyDoorsOpen, nyArmDrop, loopLampOn, loopLampOff. Listed under "FOR SOUND, round 2". SOUND was told "events in".
WAITS ON OTHERS: LAB's hook re-stage (09:50: code first pass done, stills / clips next; its "FOR DIRECTOR" block with the
dome y in v01-v05 and the v05 empty wall); CAST's hook acting (FOR CAST below); LAB re-stages v10 v13 v14 v15 v16 v36a v36;
TRAIN v20 v22 v25 v28-v30; STATION v31-v35.
NEXT, in order: (1) when LAB + CAST report the hook: `opening_v4.py --quality=draft --no-copy`, then look at EVERY frame of
f0-260 beside the reference openings (each cut 1.5x size or 30 deg; button above the 0.74 band; X 15 px clear of her head
and off the lamp; GO! pulses beside the lamp: re-measure GO_POS for the new v03 / v04 lenses); fix CAP_POS / X_POS /
GO_POS. (2) For each re-staged shot as its owner lands it (v10 v13 v14 v16 v20 v22 v25 v28-v30 v35 v36): probe_cams_v4
(glide then rest, or rest 0 for continuous moves), the caption gate on a fresh cast log for a height with no face and no
acting hand (62-78 %, inside the safe area); split v22 in two if TRAIN's moving engine cannot carry 2.9 s; v33-v35 three
sizes / angles. (3) Re-point autoTaps to LAB's new v16 dome-squash frames, loopLampOn/Off to LAB's new v36 rule, check
the NY / v22 rules still match STATION / TRAIN. (4) The optional v16 thought bubble only if it reads in one glance.
(5) Tick audit_r3/FIX_LIST_DIRECTOR_DONE.md; short report; the lead runs pass 4.

## THE HOOK, FIX ROUND 2 (DIRECTOR leads; lead's LEAD_DECISIONS_R2 section 2; written 08:40, read this before you start)
Clock (unchanged): v01 f0-39, v02 f40-104, v03 f105-173, v04 f174-196, v05 f197-244. Events (seconds, x30 = frames):
lampGreen 1.58 (f47.4), Go onsets 3.56 4.02 4.44 4.82 5.16 5.46, red 5.78 (f173.4, v04 starts f174), redPress 5.98 (f179.4),
"Did" 6.67 (f200), "tap?" 6.95 (f208.5), "She" 7.51 (f225.3: the X pops). Fractions below are of the 1080 x 1920 frame,
x from the left, y from the top.
SAFE AREA (every shot of the film, lead 08:50): nothing that matters (faces, hands, buttons, signs, boards, the X, the
tick, captions) below y 0.80 or right of x 0.90: the Shorts app covers the bottom 15-20 % and the right 10 %. THE RULE: every cut changes the picture size by 1.5x or more OR the angle by 30 deg or
more. CAPTIONS IN THE HOOK sit in a band centred at y 0.74 (0.72-0.76): nothing that matters may enter y 0.70-0.78 in
v01-v04; v05 has its own place (below).

### FOR LAB (lenses, set, button, lamp; `lab.ts` ROLE_CAMS + props)
- v01 (frame 0 = the loop's last frame: keep the layout lamp-left / her-right / button-below): lamp WHOLE, 35-40 % of the
  width, both lenses, dark, at least 10 px (0.01) from every edge for the whole shot (aim the push between lamp and
  face); her head 0.20-0.25 of the height, right of centre; the button dome centred at y 0.55-0.60 and its bottom rim
  above y 0.68; the flat blue desk front under 12 % of the frame (lower the lens or raise the desk line); nothing but
  desk top / desk front in y 0.70-0.78. Camera: a slow push of about 1.15x over the shot, no sideways drift.
- v02 (NEW ANGLE: a low insert looking UP at the lamp, 30+ deg below v01's axis): the lamp fills the top half (lamp
  width >= 60 % of the frame, its lenses whole); her face SMALL below it (head 0.10-0.14 of the height) looking up at
  it, head inside y 0.48-0.68; the lens turns green ON EV.lampGreen (f47-48) as a visible event; y 0.70-0.78 shows only
  her shoulders / desk edge (no face, no hand, no dome). Camera: slow push about 1.1x, then rest (my rest rule).
- v03 (NEW ANGLE: three-quarter SIDE view, about 45 deg round from v01, from her right): her hand and the button BIG in
  the lower half (dome width >= 35 % of the frame, dome centre y 0.55-0.62), the lamp above / behind them in the same
  frame (upper third, its green flashes plainly seen), her face between (head inside y 0.25-0.50). ONE steady
  ACCELERATING dolly-in of about 1.3x over the shot (ease-in only: slow at f105, fastest at f173, no rest: I set
  rest: 0), NO sideways kick or bump per press (at most a 1-2 % scale bump on a beat, or none), lamp housing never cut
  by an edge. The dome SQUASHES 15-20 % on every contact (CAST's GO_PRESS contact frames) with its rim lit. Keep
  y 0.70-0.78 free of the hand / dome at the end of the push (the GO! pulses sit beside the lamp: I place them).
- v04 (THE RED, a hard cut): at least 1.6x tighter than v03's last frame (head height x1.6): the RED lamp, her face,
  her hand and nothing else (no desk front, no cabinet); her finger HIGH on f174 (CAST), the dome squash + a CONTACT
  FLASH at EV.redPress (f179-180); the red room light. Camera: slow continuous push to the cut (rest: 0, mine).
- v05 (FRONTAL close-up, at least as tight as v04) (CORRECTED 08:50, lead): her face about y 0.08-0.42 (centred x
  0.50-0.62), her hand on the pressed button about y 0.48-0.66, the caption band at y 0.72-0.76 BELOW the button on the
  desk front (the same band as v01-v04: the captions never jump). The RED lamp at the upper RIGHT (behind / above her
  right shoulder, left of x 0.90), so the LEFT wall x 0.03-0.38, y 0.06-0.40 stays EMPTY: my X lands there (about 35 %
  of the width, 15 px clear of her head). Camera: slow continuous push to the cut (rest: 0, mine). Two people behind may
  turn to look (keep them out of the X area).
- v01-v05 and v36: the green cabinet / prop beside her goes neutral (grey or wood) so it is not green in the red flood.
- Tell me under "FOR DIRECTOR" in your notes: the final y of the dome top / bottom in v01-v05 and the empty wall box in
  v05, so I can check the caption band and place the X and the GO! pulses.

### FOR CAST (acting; `beats_v4.ts`, moves)
- v01: eyes UP on the lamp, wide and eager (brows up), finger cocked a full hand-height above the dome, still (no
  settling move from frame 0: frame 0 = the loop tail's end).
- v02: eyes on the lamp; on green (f47-48) brows jump up, a small eager smile; finger stays cocked.
- v03: each press: start a full hand-height above the dome; 3 f down (ease-in), 2 f of contact (LAB squashes the dome),
  3 f up; no one-frame drops; no snap of the hand towards her chin at the end; the face goes from careful to sure (a
  small smug smile by Go 5-6).
- v04: the finger HIGH on f174 (a hand-height above the dome), down over f175-179 (ease-in), landing on EV.redPress
  (f179.4) and staying; the smile-then-big-"O" arc stays (the "O" about f181-182).
- v05 (her hand on the pressed button now at y 0.48-0.66): a HARD blink about f203 (2 f, no half-lid in-betweens); on "tap?" (f208-212) her eyes flick DOWN to her own
  finger on the button and back up; a 1-2 px head tremble through the shot; the big "O" only through the silent stop
  (to f199); from "Did" (f200) a small tight mouth (a wobbly line), shock carried by eyes and brows. Mouth shut under the
  narration. Her hand stays on the button (the proof), never over her face.

## PASS 2 BATCH (DIRECTOR, after the lead's pass 2 at 06:23)
- Caption places from the caption gate on pass 2's cast log (heights with no face + no hand under the text): v10 y 0.78,
  v17 0.72, v20 0.74 (off the driver's pointing glove), v27 0.70, v31 0.74; the rest stays in the 68 % band. v14 has
  faces at every height (LAB moves the action). THE X moved to (0.25, 0.27): left of her close face (head x 0.44-0.92),
  above her hand (y 0.53) - LAB to confirm the free area on pass 3 frames.
- Frozen runs: v08 and v36a get rest: 0 (a continuous creep); no-rest shots now creep LINEARLY to the cut (cams.ts) so the
  camera never slows to a stop (probe: v04 v05 v08 v36a rest 1 f); v05 drift 0.06 -> 0.10. Camera-still 26.4 %.
- qa_gates --v4 (film_v4 passes it): the v3 picture limits (camera 0.5-2.0, chroma 18-30, blur, still, life, brightness,
  its own seam and band-only caption reader) are INFO; real gates kept: specs, loudness, true peak, LRA.
- tsc 0, retime ALL CHECKS PASS, captions ALL PASS.

## FOR SOUND, round 2 (DIRECTOR, 2026-11-21 ~09:10): the picture's action events are in the clock json
`briefs/v3/pointing/director/timeline_v4.json` -> "EV" (seconds; x30 = frames), computed in
`studio/src/videos3/pointing/v4/press_events.ts` from the words + the owners' own timing (they move by themselves):
- `fiveLand` [5]: v10b, each of the five hands LANDS on its button (the slam + its X pop): 15.608 15.808 16.008 16.208
  16.408 (f468 474 480 486 492) = "five" + (FIVE_PRESS.lead 3 + k x gap 6 + travel 4) f.
- `wavePoint` [12]: v13, the point wave, one volunteer every 3 f from "point" (18.18 .. 19.28; the first six are in
  the frame); `notOne` 20.10 (f603): v14, all twelve point at the red together.
- `engineIn` 35.233 (f1057, v22's cut: the engine is already thundering in) and `enginePass` 36.483 (f1094.5: it
  passes the lens half way through the move): give the entrance its weight there.
- `nyPoint` 55.15 (f1654.5: the conductor's point snaps: the whoosh), `nyDoors` 55.90 (f1677: the doors START sliding:
  chime + slide), `nyDoorsOpen` 56.50 (f1695), `nyArmDrop` 55.983 (f1679.5).
- SOUND'S NAMES (lead 09:20, aliases beside mine; all computed from the owners' rules, never typed frames):
  `xPops` [5] = the X visible on each landing (f468.2 474.2 480.2 486.2 492.3); `boardFlips` [4] = 1->2 .. 4->5 on
  landings 2-5 (f474.2 .. 492.3); `fiveLand` [5]; `autoTaps` [2] = v16 taps on "hand" and +12 f (f706.6 718.6:
  PROVISIONAL, LAB's v16 re-stage may change the taps: I re-point when it lands); `birdsLift` (f1058.5, the first egret;
  `birdsLiftEach` [6]); `engineIn` (f1057); `enginePass` (f1094.5); `nyPoint` (f1654.5); `doorsOpen` = `nyDoors`
  (f1677, the doors START); `nyDoorsOpen` (f1695); `loopLampOn` (f2012.1, green on "point") / `loopLampOff` (f2051.2,
  the tail starts).
- unchanged: `press` [6], `pressHoldF`, `redPress` (opening), `lampGreen`, `goFlashes`, `red`, `redCut`, `xPop`,
  `loopTail`. The NY and v22 values mirror STATION's / TRAIN's rules (ny_station T_POINT / T_OPEN, steam CAMS.v22): if
  they change those, tell me and I re-point these.

## FOR SOUND (DIRECTOR, 2026-11-21 ~05:50 PC clock)
- PRESS EVENTS EXPORTED: `briefs/v3/pointing/director/timeline_v4.json` -> "EV" now carries every clock event (seconds) plus
  `press` (6 green presses: the fingertip lands on the dome), `pressHoldF` (frames on the dome), `redPress`. Source:
  `studio/src/videos3/pointing/v4/press_events.ts` = EV.goFlashes[n] + (lag + travel) / 30 from CAST's GO_PRESS, and
  EV.red + (start + travel) / 30 from RED_DOWN. Values now: press 3.7933 4.2533 4.6067 4.9867 5.2933 5.5933 s
  (f113.8 127.6 138.2 149.6 158.8 167.8 = 7 7 5 5 4 4 f after each Go onset: CAST's numbers, not 2-3 f), redPress 5.98 s
  (f179.4). They move by themselves with a re-time or a CAST timing change (retime_v4.py rewrites the json).
- SHOUTS RE-IMPORTED: words.ts regenerated with tools/gen_words_ts.py from voice_v4 (only D "Signal" 34.13 / "clear!" 34.68
  and C "Clear!" 46.60 moved); clock 2066 f unchanged; v21 cut f1033 (9 f into "Signal"), v27 f1388 (10 f before
  "Clear!"); retime ALL CHECKS PASS, captions ALL PASS ("SIGNAL CLEAR!" one caption through the J-cut). The mix is 2066 f:
  film_v4's apad is now harmless (nothing to pad).

## LAPTOP = RENDER SYSTEM (DIRECTOR #4, from 2026-11-20 22:24; renders HERE, draft only, one at a time, RAM token)
- done 22:35 STEP 1: `briefs/v3/pointing/RENDER_HERE.md` replaces `_handover/RENDER_ON_OTHER_PC.md` (marked SUPERSEDED);
  compare_films.py: office fallback path removed; no "Administrator"/"POINTING_V4_HANDOVER" left in my tools, opening_v4,
  film_v4, gates_v4, qa_gates (LM_PATH = ~/research_notes, exists here), sheet_from_video, castlog_extract (all compile).
  film_v4.py now renders SHOT BY SHOT (--batch-frames=240 per kit_render call, --gap=70 s between calls for the token,
  --shots=), and builds a PARTIAL film (black for shots with no current chunk) so audits run on what renders.
  Speed here at draft: v01 1.8 s/f, v02 2.7 s/f (lab set; office GT 740 did steam at 0.14 s/f): watch this.
- done 22:55 STEP 2: OPENING_AUDIT_v5.md (lead's 22:41 draft; every frame 104-200 cropped). Top bugs: CAST press inverted
  (hand lifts into a sideways one-finger point ON each Go, lands as a fist 4-5 f late); LAB v03 crops head + lens; v04
  wider than v03, v01/v02 and v04/v05 jump cuts, X small + far; LOOK red reads orange; hold 36 %, moving area 4.3 %
  (refs 13-20). Mine: v02 drift -0.30 -> +0.10 (tsc 0). Interim report sent to the lead.
- done 23:10 LEAD DECISION "GO!" captions: captions_plan.ts GO_PULSES/goAt (7 pulses, onset -> word end, < next Go; the
  7th starts ON the red cut f174), Captions.tsx draws "GO!" 150 px in the house band with a 3-f 1.15 -> 1 snap;
  probe_captions_v4 checks them (f107-119 f121-132 f133-144 f145-154 f155-163 f164-172 f174-185). ALL PASS, tsc 0.
  First film pass (22:57) stopped before it rendered (shared files changed); restarted 23:10 ->
  render_logs/film_pass_draft_2310.out.
- done 23:52 probe_cams_v4 (director/cams_v4_now.json): camera-still 40.6 % -> 36.9 % (TRAIN glides in; STATION lenses
  0.4-0.8 %/f WITH my drift still on top; LAB v03 0.80 %/f). QUEUED for after the pass's render (shot_plan.ts and
  captions_plan.ts are SHARED files: editing them mid-pass makes every rendered chunk stale): drift v02 0.10 -> 0.22,
  v21 0.08 -> 0.18, v23b 0.14 -> 0.25, v24 0.08 -> 0.20, v27 0.05 -> 0.12, v30 -0.16 -> -0.28; remove/halve my drift on
  v31 v33 v34 v35 once STATION writes "cameras done"; GO pulses: cap at 8 f and >= 3 f off before the next Go (now
  on almost continuously, 1-2 f gaps). Pass findings so far (v05-v09 chunks 23:41): v05 orange slash over her brows
  (CAST), X overlaps her cheek (LAB), v07 researcher's face cut by the right edge (LAB), v09 hall red now reads ALARM red.
- done 00:25 (lead's order) film pass STOPPED after v15 (chunks v01-v15 kept, token released, my bundle deleted).
  Replaced by a SMOKE stills pass (114 frames, first/mid/last of every shot) -> studio/out/pointing_v4/smoke/
  (smoke_stills.log; sheet script scratchpad smoke_sheet.py); queued behind the limiter at 00:30.
- done 00:50 SHARED BATCH (lead "apply now"): drifts v02 0.22, v21 0.18, v23b 0.25, v24 0.20, v27 0.12, v30 -0.28; GO
  pulses GO_MAX 8 f, GO_OFF 3 f (f107-115 f121-129 f133-141 f145-152 f155-161 f164-170 f174-182); probe_captions
  checks both. tsc 0, retime_v4 ALL CHECKS PASS, captions ALL PASS. probe_cams: camera-still 37.2 % (cams_v4_0050.json).
  NOTE: 38 rests x ~16 f = ~30 % camera-still BY RULE + v04/v05 freeze 3.5 %: the camera share cannot reach 12-20 %;
  the HOLD gate (picture still) can, only with movers alive through the rests (owners' LIFE items).
  RULE FROM NOW: collect shared-file edits (shot_plan, captions_plan, timeline, camkit, film, Captions) and apply them in
  batches on the lead's word; the lead FREEZES shared files before the full draft pass and the preview.
- done 00:58 film.ts: withLook(k, build) on every set + rigOpts merge SHOT_RIG[p.id] (LOOK v5 hooks); tsc 0. look.ts
  is now a SHARED file (film.ts imports it). LAB's 00:49 opening: hold 25.8 % (was 38.8), moving area 6.9 % (was 4.3).
- READY, NOT APPLIED (next shared batch, lead 01:25): scratchpad batch2_go_pos.py = GO! pulses 130 px at a fixed place per
  shot beside / under the signal head: GO_POS v03 [0.17, 0.51], v04 [0.155, 0.35] (centres, fractions of the frame,
  measured on smoke stills f105 f139 f173 f174 f185), fallback [0.5, 0.8125]; probe_captions prints the positions.
  Run: cd studio/src/videos3/pointing/v4 && <venv python> -s <scratchpad>/batch2_go_pos.py; then tsc + probe_captions +
  a still at f110 / f176 to check the place. Re-measure if LAB moves the v03 / v04 lens again.
- done 01:45 smoke stills STOPPED at 46/114 (v01-v17 first frame; ~35-55 s per still: each still recompiles the lab
  shaders 15-31 s) to free the slot for the opening; log: no error / NaN / missing texture; CONTEXT_LOST x2 (teardown).
  Partial sheet scratchpad op/smoke_partial.jpg. Bugs seen: v05 "Did you tap?" over her hand / the button edge (LAB),
  v08 mid/last: the hall has no ceiling, the HDRI trees show at the top (LAB).
- done 01:58 BATCH 2 applied (LAB 01:35 lens fix + CAST press/stripe done): GO_POS v03 [0.18, 0.53], v04 [0.2, 0.49]
  (re-measured on director_checks/go_pos stills f110 f139 f172 f176 f186), 130 px; tsc 0, probe_captions ALL PASS.
  Opening draft render + audit started 02:00 (render_logs/opening_draft_0200.out).
- QUEUED for batch 3 (shared): closeUp: true on v01 v02 v03 v36a v36 (lead 02:05: deliberate close-ups of the hook face;
  v04 v05 already); v36a caption off her hand if LAB asks. Film pass to-do (lead): arm-out % from the cast log per shot
  (CAST estimate ~22 %, ceiling 16 %) -> list the shots that carry most of it (LAB, STATION trim).
- done 02:20 OPENING RE-AUDIT (02:11 draft): moving area 7.8 %, hold 26.3 % / gates 23.8 % (freeze v04 82 / v05 68 %),
  whole-frame 43.8 %; press right every frame, GO! under the signal head, red on the 7th Go. Open: LOOK face blow-out
  between flashes; LAB headless researcher v03, v05 X on her head + captions over the rim. OPENING_AUDIT_v5.md re-audit.
- done 02:35 BATCH 3: closeUp v01 v02 v03 v36a v36; v21 lead -0.3 (J-cut, cut f1035, 9 f into "Signal"); shout chunks
  split at cuts ("SIGNAL" | "CLEAR!"); film.ts OWNER_RIG = steam RIGOPTS (set < owner < LOOK SHOT_RIG); cams.ts drift
  capped DRIFT_MAX_M 0.6 m (ShotPlan.driftMaxM; hall v06 v08 v09 v10 v10b v13 v14 = 1.5); probe_cams prints DRIFT (m).
  tsc 0, retime ALL PASS, captions ALL PASS, camera-still 37.4 %. Smoke part 2 (remaining stills) started 02:37 ->
  smoke/smoke_stills_2.log.
- done 02:50 BATCH 4: v02 drift 0.22 -> 0.10 (LAB: lit lens hit the left edge); v12 drift +0.15 (LAB's new v12 lens is
  completely still); per-shot caption places captions_plan CAP_POS (v02 x 0.30: clear of her pointing hand; v05 y 0.83:
  under the button rim, on the console; centre fractions; Captions.tsx keeps text 40 px inside) - v05 to re-check when
  LAB gives the free area / the X's new place. tsc 0, retime ALL PASS, captions ALL PASS. probe_cams 02:40 (before v12
  drift): camera-still 37.8 %; slow (< 0.15 %/f): v02 0.09, v08 0.12, v10 0.095, v15 0.088, v13 0.149, v23b 0.137,
  v17 0.146; v03 now 1.25 %/f (peak 1.93: fast, fine for the Go-run pressure).
- done 03:00 BATCH 5: drift REMOVED on v31 v33 v34 v35 (STATION cameras final: 0.51 0.80 0.33 0.35 0.29 %/f, 21-f rests);
  tsc 0; camera-still 37.1 %; v12 now 0.156 %/f. Arm-out: count STATION's 84-f board point (v32) in the draft pass.
- done 02:40 (clock) SMOKE 114/114: pointing_preview/SMOKE_v5_all_38_shots_0236 (DRAFT).jpg; logs: 0 errors / NaN / missing / 404 /
  NOT PLAYED; lab shader compile 15-31 s per still (pipeline). Reported to the lead.
- done BATCH 6 (clock ~02:58): freeze OFF on v04 v05 (LAB creep + breathing red; v04 rest 20 removed), v08 drift -0.2 -> +0.1,
  v12 driftMaxM 1.0, CAP_POS v36a {x 0.7, y 0.17} (LAB free area: wall above her head); tsc 0, retime + captions ALL PASS;
  camera-still 34.7 % (cams_v4_0300b.json). film_v4.py --fresh-logs added. Opening re-render started (opening_draft_0305.out).
- done 03:15 OPENING (03:11 draft, batch 6): gates hold 18.9 % PASS (compare 17.2), moving area 9.4 %, whole-frame 47.5 %,
  rests PASS on the camera probe (opening_v4.py now passes --cams). Render 0.17 s/f steady. Open: GO! in v03 covers the
  purple volunteer's face from f148 (LAB moves him, or I move the pulse).
- done 04:05 FULL DRAFT FILM PASS (03:23-04:05): briefs/v3/pointing/director/DRAFT_PASS_v5.md. hold 18.0 % PASS, whole-frame
  41.1 % PASS, rests PASS; FAIL arm-out 22.1 % (v18 v36 v20 v32 v14 v13...), own-face 363 (v13/v14 rows), big faces 66
  (v29 v14 v27); moving area 6.9 % (refs 13-17). Bugs: v36 researcher shows THROUGH her head (flicker), v10b "7 OF 12",
  v20 point + shout mouth weak, v18 point weak, loop seam. Logs clean (1 beat warning v20). Reported to the lead.
- done ROUND 1 (04:25): camkit restFrames 10-14 f (6-8 under 1.2 s; max 35 %), easeGlide = half smoothstep + half
  ease-out (moves start ON the cut); gates_v4 camera-rest need 10 / 6 f in sync; closeUp v27 v29. tsc 0, retime +
  captions ALL PASS; camera-still 37.1 -> 28.4 % (cams_v4_r1.json), no shot without its rest. Loop seam: the cameras
  match exactly (v36 f2040-2053 = v01 f0); the jump is her raised point arm + caption + lamp chase; "it." ends f2051,
  3 f before the end: proposal to the lead (TAIL 12 f for an arm drop, needs SOUND, or frame 0 starts arm-up).
- done 04:40 LOOP TAIL (lead option B): timeline.ts TAIL_S 0.49 -> 2066 f = 68.87 s; EV.loopTail (it#5 end, f2051),
  EV.loopTailClear (f2060: last caption clears, captions_plan last chunk ends TOTAL-6); gates_v4 LOOP SEAM gate (last
  frame vs f0, caption band out, <= p75 film step; pass 1 = 11.98 vs 6.15 FAIL); film_v4 mux pads audio (apad
  -shortest) until SOUND re-mixes. Frames sent to LAB + CAST (arm down f2052-2061, f2061-2065 = frame 0).
- done 05:10 AUDIT R1 (FIX_LIST_DIRECTOR): captions = ONE band CAP_Y 0.68 (per-shot places removed), chunks <= 5 units /
  26 chars split never ending on a function word nor starting on a particle (55 chunks), SNAP 8, shouts ONE chunk through
  the J-cut ("SIGNAL CLEAR!"), cuts v16 on your#2, v29 on and#4; GO! pulses 6 f (7th 12 f), growing 1.0 -> 1.4, kept 40 px
  inside; THE X = director graphic (captions_plan X_POS [0.7, 0.2] placeholder, 45 % width, red + white/black outline,
  overshoot 0.3-0.8-1.15-0.96-1) -> LAB retires its 3D X; v04 + v05 rest: 0 (continuous creep, drift 0.05 / 0.06);
  hall drifts capped 0.5 m, v14 drift off, v24 cap 0.3 m. gates_v4: + no frozen run > 3 f, + caption over face (FAIL) /
  hand (WARN) via probe_captions --json boxes + cast log, + rest exempt for rest:0. tsc 0, retime + captions ALL PASS,
  camera-still 29.5 %. NOTE: the v36 "patch" was LOOK's sun window panes (fixed in look batch 3), not the researcher.
- done v27 lengthened (lead #14: no merge): v27 lead 0.35 -> v26 1359-1388 (29 f), v27 1388-1420 (32 f: starts 6 f
  before the end of "man." as he turns), v28 from 1420; retime + captions ALL PASS. Shortest shots now v09 20 f, v21 22 f, v04 23 f.
- next: draft pass 2 when the owners report (film_v4.py --quality=draft --no-copy --fresh-logs --gap=20).
- next: smoke sheet (all 114) + log read -> lead (+ pointing_preview copy); the full draft film pass after the lead's
  FREEZE (arm-out % per shot from the cast log). OLD next line: audit the opening; then finish the smoke (68 stills
  left: v17-v36) when the token queue is quiet.

## NEW PC (DIRECTOR #3, from 2026-11-20 15:20; owner's order 15:35: NO VIDEO RENDERS HERE, only tsc / probes / --info / a few draft stills)
- done 15:24 STEP A (re-time on the cut script): make_v4_script.py (21 lines, 192 words), shot_plan.ts: v11 CUT (ids NOT
  renumbered), NEW v23b (his view: the blurry signal, from "eyes" #1) so v23 stays < 3.5 s on the real voice, v23 on "the#4",
  v26 on "coal#1", v28 on "boss#1" (v27 "Clear!" now 1.03 s), v32 doors on a time offset (STATION's T_OPEN). PLAN CLOCK:
  1892 f = 63.07 s at 3.25 w/s, 36 shots, longest v36 2.97 s, shortest v04/v09 0.67 s. timeline_v4.json + SHOT_TABLE_v4.md
  regenerated, kit_render --info OK (36 shots, 1892 f), tsc 0. CAST: beats_v4.ts still cues "@v11" (dead: tell CAST).
- done 15:30 STEP B: compare_films.py REFDIR is now found by itself ($REF_SHORTS_DIR, else <ROOT>/../yt short videos, else
  _external/...); all 5 preferred refs + anti-theft + clown found; test run (anti-theft as "ours", --max) OK in 5 s. No old
  path left in my tools. NOT MINE, broken here: tools/v3/qa_gates.py LM_PATH = C:\Users\utkar\research_notes\... (lead).
- done 15:55 ONE-PASS RE-TIME (owner 15:50: a revised narration may drop in): `director/retime_v4.py [--src=<lines json>]
  [--no-script]` = make_v4_script -> probe json -> CHECKS (rules resolve, every line has a shot, 0.6-3.5 s, < 70 s, owners'
  cue words + @shots still exist) -> shot table -> tsc; exit 1 on any FAIL. A NEW TEXT needs exactly: (1) lines_v4.json
  (or a v5 json via --src), (2) retime_v4.py, (3) fix ONLY v4/shot_plan.ts on its FAIL/WARN lines (+ staging rows in
  make_shot_table_v4.py for new ids), (4) retime_v4.py again until "ALL CHECKS PASS". A new VOICE: retime_v4.py --no-script.
  Today: ALL CHECKS PASS (WARN: CAST's beats_v4.ts cues @v11).
- done 16:00 C part 1: cut rules fixed so the opening reads: v02 cuts 0.25 s BEFORE "green" (the dark lamp lights in the
  cut-in, first picture change 1.33 s); v04 lead -0.017 (its first frame is never before the red word: was 1 f of GREEN on
  the "hard cut to red"). timeline EV: redBeatEnd = "Did" onset; new EV.redCut (v04's first frame). LAB's lab_plan now
  reads EV (X on "She", same as SOUND's sting). Tools for the other PC: opening_v4.py (default audio
  sound/pointing/audio/opening_v4_mix.wav; --clip=<mp4> = audit only, tested here on the 08:47 test clip), NEW film_v4.py
  (render all + mux sound/pointing/audio/mix_v4.wav + gates_v4 / qa_gates / compare / storyboard; --clip audit only),
  sheet_from_video.py --tl=<timeline json>, probe_opening_v4.mjs (EV + LAB HOOK + opening cuts). Guide for the owner:
  `_handover/RENDER_ON_OTHER_PC.md`.
- done 16:10 VOICE's provisional words.ts landed: retime_v4.py --no-script: 1911 f = 63.70 s (real opening + plan rest),
  ALL CHECKS PASS. Opening on the real voice: v01 0-40, v02 40-105, v03 105-172, v04 172-195 (red 5.72 s), v05 195-241
  (X 7.45 s), v06 241-310. Go 3.56..5.72, beat 0.50 s (Go! ends 6.11, "Did" 6.61).
- STILLS ROUND 1 (draft, 15:33, before CAST wired her; studio/out/pointing_v4/director_checks/opening_stills_round1.jpg):
  (1) LAB: the desk front is near-BLACK and fills the bottom third of frame 0 (caption sits on black); v01-v03 lower 35-45 %
  black. (2) CAST: her "finger ready" is ONE RAISED FINGER, back of the hand to us = reads as a middle finger (f0, f30, f100,
  f150; at the red f156/f170 it is at her CHIN with a smug face = flipping us off). Must be: hand flat over the button,
  index finger pointing DOWN at it, side-on, thumb visible. (3) LOOK: the green wash turns her whole face solid green
  (v02/v03): tint the room, keep her face at most a light green rim. (4) LAB: v02 framing puts her face IN the caption band
  ("green light." over her mouth). (5) LAB/LOOK: the lamp is two dark lenses side by side = reads as speakers / binoculars at
  frame 0; a vertical head (red over green) or a faint idle glow reads "signal" in 0.25 s. (6) v04: the red lamp's lens is
  dark with a red rim (the light is the room, not the lens); the hand must be ON the button at the red. Good: bright
  colourful room, researcher behind glass, blinking lamp row, the red X pops on time, v05 frozen face reads.
- STILLS ROUND 2 (draft, real opening voice, CAST wired; director_checks/opening_stills_round2.jpg + r2_f0_f172_f232.jpg):
  BETTER: desk front now bright blue (no black), no middle finger (the hand points sideways), the lamp reads green / red,
  v04's FIRST frame is red (redCut fix works), the room floods red, the X pops by 7.73 s, captions on time, smug -> frozen
  "o" face arc reads. STILL WRONG: (1) CAST: her hand never touches the button in any still: the finger points sideways to
  screen-left at chin / chest height, ~120 px above the button, and her thin arm line loops across her collar under her
  chin (reads as a strap; hand within a hand-width of the face at f0). "Finger ready over the button" and "hand comes down
  ON it" do not read. (2) LOOK: her whole face still solid green in v02/v03. (3) LAB: v02/v03 head ~30 % of the height
  (not closeUp; rule <= 25 %); in v04/v05 the button sits in the caption band (65-72 %), "She did." covers it.
  (4) LAB/LOOK: frame-0 lamp = two dark round lenses side by side (speakers / binoculars) until it lights; give an idle glow.
  (5) v03 push-in too slow to feel (--info median 0.061 %/f).
- STILLS ROUND 3 (f122 = go#2 full press, f176 = just after the red; director_checks/r3_f122_f176.jpg; taken while LOOK /
  LAB / CAST were mid-edit, look.ts 15:56): REGRESSION: her face blown out WHITE, the room yellow, the lamp housing blue,
  the "green" lens reads cyan and the "red" lens PINK/magenta: neither reads as a signal colour; no hand on the button at
  the full-press frame (her arm is not visible at all). Re-shoot both when LOOK says its pass is done.
- done 16:20 report to the lead. next: on the lead's word re-shoot stills 0,45,52,109,122,166,172,176,200,232 (one
  kit_render --stills call, ~3-4 min with the slots shared), then the opening goes to the other PC (RENDER_ON_OTHER_PC.md).

- done (evening) RE-TIME ON THE LOCKED Ricks-style TEXT: make_v4_script 21 lines, 185 words. shot_plan.ts: v08 a#2, v19
  so#1 (was which#1), v22 = line:L13 (hard cut on "But"), v23 the#5, v26 to#2 ("to his coal man.": he LOOKS at the
  semaphore, then v27 "Clear!"), v32 subway#1. Same 36 ids. PLAN CLOCK (--plan): 1828 f = 60.93 s, shots 0.67-2.97 s,
  ALL CHECKS PASS. Staging: 1994 board BIG >= 1 s in v06 (+ behind the researcher in v07; "1994" is no longer spoken),
  nobody in the steam cab points, coal man looks before he shouts, ONE man + ONE woman hold the sign, no Japanese text /
  logos / brands anywhere. probe_v4.mjs + retime_v4.py got `--plan` (ignore words.ts). VOICE's PROVISIONAL words.ts
  still holds the OLD wording after line 3 (its matcher shifts L11-L22 by 2.46 s: 1902 f): the shot table is on the PLAN.
  Dead owner cues (sent to the lead): LAB lab_plan ROLE_RULES wide1994 "in 1994" -> "japan's railway lab", counter
  word a#3 -> a#2, watched "just watched" -> "just watch", card "extra rule" -> "others have to", notOne "not one
  pressed" -> "not one presses"; SOUND cues_v4 W(5,"pressed") -> W(5,"press"), score_v4 (11,"which") -> (11,"so").
  CAST, TRAIN (steam/today), STATION (ny_station), kitchen, lab_hall, look: all resolve.
- next: when VOICE installs the real voice of the locked text: retime_v4.py --no-script (no --plan); fix rules if it FAILs.
- done (evening) REAL VOICE (185 words): FINAL CLOCK 2054 f = 68.47 s, 38 shots (0.67-3.23 s), ALL CHECKS PASS, tsc 0.
  NEW v10b (word:five#1, 460-509: closer on the same row, five hands slam, X's, board 5 OF 12; v10 = 398-460 the row
  watching) and NEW v36a (line:L22, 1947-1986: "Now try again." on v02's cut-in lens, lamp dark again); v36 now from
  "this#2" (1986-2054, frame-0 lens, loop match on the last frame). Opening on the real voice: green 1.58, Go 3.56 4.02
  4.44 4.82 5.16 5.46, red 5.78 (v04 first frame 174 = 5.80 s, red), beat 6.17 -> 6.67 (= "Did", redBeatEnd), X 7.51
  ("She"), cuts v01 0-40 / v02 40-105 / v03 105-174 / v04 174-197 / v05 197-245 / v06 245-289 (1994 board 1.47 s).
  LAB's lab_plan already finds v10b (five#1), v10 (watch#1), v36a (loopA try#1), v36 (loop time#1). RENDER guide updated.
- done (evening) CAPTION BUG (STATION's frame check: v31/v33/v35 first frame showed the previous caption). CAUSE: the old
  Captions.tsx held each chunk until the NEXT chunk's start (= its first word - 2 f), but a line cut is 3 f before the
  word (lead 0.10) -> the old chunk hung 1 f into the new shot; a word cut is 1 f before the word -> the new chunk came
  up 1 f EARLY in the old shot; and chunks were cut at punctuation only, so mid-line cuts ("every signal to | his",
  "So Japan's train | drivers") put one chunk across a cut. The old rule straddled 34 of 37 cuts. FIX: new
  `v4/captions_plan.ts` (pure; Captions.tsx only draws): chunks also break at every cut, a chunk comes up ON the cut when
  the cut is in its 2-f lead or <= 6 f before its word, and ends at the first cut after its last word starts. v28 now
  cuts on line:L17 (lead 0.05; v27 "Clear!" 1396-1420 = 0.80 s, v28 1420-1494) so "His" is not a 6-f chunk alone.
  PROBE `director/probe_captions_v4.mjs [--all]` (now inside retime_v4.py): 76 chunks, 37 cuts, 0 straddles, none late,
  shortest 9 f, no caption from the first Go to the end of v04. ALL CHECKS PASS, tsc 0.
- done (evening) after LAB's lab_hall / lamp move: retime_v4.py --no-script = ALL CHECKS PASS, 0 WARN (captions incl.).
  gates_v4.py: face test = ellipse INSCRIBED in the head box, in pixels, +5 % (HEAD_PAD; CAST's castgate must use the
  same), split into OWN face (FAIL; identity = the same card, crowds share names) and ANOTHER face (WARN: no depth in the
  log); near misses 1.05-1.25 radii listed; ARM OUT: PASS <= 12 %, WARN 12-16 %, FAIL > 16 % + share per character
  and per shot. film_v4.py: render with --props '{"castlog":1}' --keep-browser-logs -> render_logs/render_<q>_<time>.log
  -> castlog_extract.py -> castlog_v4_<q>.json (newest log wins per frame) -> gates_v4 --cast; qa_gates --words default
  sound/pointing/voice_v4/words.json. RENDER guide updated. DRY CHECK for the draft film pass: --info with the castlog
  props 2054 f / 38 shots; mix_v4.wav 68.4667 s = 2054 f (a mux test gives video 2054 f = audio 68.4667 s); the audit
  half run with --clip on CAST's v4full_draft.mp4 + its log: gates_v4, qa_gates, compare (4 sheets + frame 0), storyboard
  all ran, 2.5 min. The render half (kit_render via Popen + log) is NOT exercised until the lead's go.
- done (evening) HOLD FRAMES (46 % on CAST's draft; want 12-20 %): NEW probe `director/probe_cams_v4.mjs [json <out>]`
  (per frame camera speed via kit camSpeedStats; per shot travel, trailing rest, still share; before/after in
  director/cams_v4_before.json / cams_v4_after.json). Camera rules: camkit.restFrames = 15-20 f (8-10 f under 1.2 s,
  default 15, max 40 %), easeGlide = one smoothstep (the double one had long near-zero ends); shot plan `freeze`
  (v04, v05) and `drift` (director push / pull on top of the owner lens, cams.ts withDrift, same ease window):
  v02 -0.30, v06 +0.08, v07 +0.12, v08 -0.20, v09 +0.08, v10 +0.10, v10b +0.22, v13 +0.14, v14 +0.20, v16 -0.14,
  v17 +0.18, v21 +0.08, v23b +0.14, v24 +0.08, v27 +0.05, v30 -0.16, v31 +0.18, v33 +0.18, v34 +0.08, v35 +0.16,
  v36a -0.18 (pulls where a face is near 1/4 or the frame is tight). End-frame stills (director_checks/drift_end_frames.jpg):
  no geometry break. CAMERA-STILL 67.5 % -> 42.2 %; estimated video hold 46 % -> ~26 % (estimate: old per-shot
  hold/still ratio x new still share). The rest needs LIFE IN THE RESTS (movers), not more camera: 38 rests x 15 f =
  28 % of the film is camera-still by rule; a rest is a hold only if < 1 % of the picture moves. gates_v4 --cams:
  "every shot RESTS" judged on the camera probe (0 of 38 without a rest); picture-never-settles listed as INFO
  (v03 Go flashes; v20 v21 v24-v30 moving world). film_v4.py runs the probe and passes --cams.
  OWNER REQUESTS: LAB v01 0.14 %/f, v15 0.085 (push to the face: make it a 0.4 m slide), v18 0.058 (herPoint glide too
  short: rest 37 f; a 0.3-0.4 m arc or slide; a push crops her head at the right edge), v36 0.127: own glides >= 0.25 %/f
  mean; movers ALIVE through the rests in v02 v04 v05 v07 v08 v09 v10b v14 v23 v36a (lamps blink, researcher writes,
  clock, idle breathing; these held 75-100 %). TRAIN: v20 is now fully still (cab.ts 19:09): glide 0.3 %/f + rest; v23
  0.108, v25 0.085, v26 0.053 (moves 6 f only), v28 0.087: >= 0.2 %/f; no cab SHAKE in the last 15 f of the steam-cab
  shots (v24-v30: the picture never settles, 8-17 of 24 cells move). STATION: v31 v32 v33 v35 own glides ~0.09-0.19
  %/f: >= 0.25 %/f, then I remove my drift; movers alive through the rests (holds 42-64 % there).
- next: on the lead's go (cwd <ROOT>, Git Bash): `RAM_ME=director PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8
  tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/film_v4.py --quality=draft --no-copy`

## CHECK IN THE RENDER (only judgeable in motion; audit these on the clip that comes back from the other PC)
- frame 0 -> 0.25 s: nothing settles or pops in the first frames (her pose held from frame 0, no camera jolt).
- the lamp lights GREEN ~7 f after the v02 cut (seen as an event, not as a flicker); every Go flash and press land on the
  beep (press full 1-2 f after each Go onset); the flash decay reads as a blink, not a strobe.
- v03 push-in: steady, felt as pressure (--info on the real clock: median 0.061 %/f, p90 0.285: probably TOO SLOW to feel;
  table asks ~0.6 %/f), then rests before the red cut.
- v04 HARD CUT TO RED: first frame red, hand comes down in a 2-f snap, then nothing moves in her for the 0.5 s beat
  (room tone only); no caption pops one frame before the v05 cut ("Did you tap?" comes up 2 f before "Did").
- v05: the X pop is a 4-f scale snap with the sting; she does not blink; no hand near her face.
- the loop: v36's last frame -> frame 0 is a match cut (same lens, arm drops to "finger ready"), no jump.
- whole film: hold frames 8-20 %, whole-frame motion < 60 %, every shot moves then RESTS (gates_v4), no shot > 3.5 s,
  arm-out < 10 % of frames, no see-through card, no pops > 3 %/frame (contact sheets every 2nd frame).
- sound vs picture: the narrator at 0.05 s; the red stab exactly on v04's first frame; the beat silent.

## V4 HANDOVER (DIRECTOR #2, 2026-11-20 08:55; the project moves to another PC; nothing of mine runs, no RAM token held)
State: every file whole, `tsc` 0 at 08:53. Repo root = `<ROOT>` (was C:\Users\utkar\Desktop\animated-shorts-studio).
**WHAT EXISTS (v4 = the true story, LOCKED script sound/pointing/SCRIPT_v4.md + sound/pointing/script_v4/lines_v4.json, 22 lines)**
- The v4 film next to v3 (v3 untouched): `studio/src/videos3/pointing/v4/` = index.ts, Root.tsx (comp **PointingV4Kit**),
  FilmView.tsx, film.ts, timeline.ts (THE CLOCK + `EV` of the opening: lampGreen, goFlashes go#1..6, red go#7, redBeatEnd,
  xPop she#1, loopPoint point#6), shot_plan.ts (36 shots v01..v36, cuts = rules on words), script.ts + plan_words.ts
  (GENERATED), words.ts (placeholder: VOICE writes it), resolver.ts (R_V4 for CAST beats), camkit.ts (glide-then-REST,
  default view per set), cams.ts, Captions.tsx, sets/<set>.ts (owner entries = re-exports of the v3 sets for now),
  sets/_template_example.ts (the shot template; compiles; not in the film).
- Docs: `briefs/v3/pointing/V4_STRUCTURE.md` (files, owners, template rules), `briefs/v3/pointing/SHOT_TABLE_v4.md`
  (36 shots: cut word, lines, owner, people sizes, held poses + cues, 3 movers, camera glide + rest, captions).
  Plan length 2063 f = 68.77 s at 3.25 w/s (0.77 s over the 68 s target; the real voice decides; cut line 6 first if over).
- Tools: `briefs/v3/pointing/director/make_v4_script.py`, `probe_v4.mjs`, `make_shot_table_v4.py`, `opening_v4.py`;
  `tools/v3/gates_v4.py`, `tools/v3/compare_films.py`.
**HALF-DONE**
- Opening pipeline TEST at draft (08:34-08:48) with a STAND-IN sound (v3 hook_0-12s.wav), --no-copy: the render of v01-v06
  worked (studio/out/pointing_v4/shots/draft/, opening_v4.mp4, opening_audit/ strip, go_run, gates_v4); the compare step was
  stopped at the handover (compare/ incomplete). These frames show the v3 lab (LAB has not staged v4 yet): NOT for review.
- Sets are still v3 re-exports: LAB / TRAIN / STATION must write their v4 staging (template) and cameras keyed v01..v36.
- gates_v4's four card gates need CAST's per-frame log (format in the gates_v4.py header): requested, not delivered.
**NEXT STEPS, in order (THE OPENING FIRST)**
1. VOICE installs the v4 voice into `studio/src/videos3/pointing/v4/words.ts` (the 7 "Go" onsets as words); SOUND writes
   the opening mix. Then (cwd `<ROOT>`): `node briefs/v3/pointing/director/probe_v4.mjs json briefs/v3/pointing/director/timeline_v4.json`
   and `python briefs/v3/pointing/director/make_shot_table_v4.py` (if the text changed first: `python briefs/v3/pointing/director/make_v4_script.py`).
2. LAB stages v01-v05 (+ v06) in `studio/src/videos3/pointing/v4/sets/lab.ts` (+ cameras v01..), CAST the young woman's poses
   (cues from `v4/resolver.ts`, events from `v4/timeline.ts` EV). Check on draft stills (cwd `<ROOT>/studio`):
   `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --stills 0,30,60,100,160,190 --out out/pointing_v4/`
3. THE OPENING (cwd `<ROOT>`): `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/opening_v4.py --audio=<SOUND's opening mix .wav> --quality=preview`
   -> studio/out/pointing_v4/opening_v4.mp4 + pointing_preview/VIDEO_v4_opening.mp4 + studio/out/pointing_v4/opening_audit/
   (strip_0-8s.jpg, go_run.jpg, opening_audit.json, gates_v4.md, compare/). Judge: frame 0 in 0.25 s (lamp, face, button),
   narrator at 0.05 s, first picture change ~1.5 s (<= 2.3), the push-in through the Go run, the red on a hard cut, the held
   beat 0.5 s, her frozen face, no gap over 0.5 s except the beat. Report to the lead before anything else is built.
4. The rest of the film shot by shot (TRAIN v19-v30, STATION v31-v35, LAB v06-v18 + v36 loop match), then a full preview:
   cwd `<ROOT>/studio`: `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality preview --shots all --conc 1 --out out/pointing_v4/`
   (-> out/pointing_v4/pointing_v4_preview.mp4), mux the mix (ffmpeg -map 0:v -map 1:a -c:v copy -c:a aac), then (cwd `<ROOT>`):
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/gates_v4.py <mp4> --shots=briefs/v3/pointing/director/timeline_v4.json --cast=<CAST's log> --out=<dir>`
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/qa_gates.py <mp4> --shots=<shots json> --words=<voice words.json> --out=<dir>` (loudness, peak, LRA, captions, seam, chroma; ignore its camera gate for v4)
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/compare_films.py <mp4> --out=<dir> [--step=2.5] [--max=<s>]`
   storyboard sheet: `tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/sheet_from_video.py <mp4> <out.jpg>` (v3 clock: use a v4 copy or pass timeline_v4.json; it reads director/timeline_v3.json today).
**TOOLS / VERSIONS USED HERE**: node v22.14.0 (+ studio/node_modules: remotion, esbuild, three; never npm install), Python 3.12.3 in
`tools/.venv` (numpy, Pillow; run with PYTHONNOUSERSITE=1 ... -s), ffmpeg + ffprobe 9.0.2 (gyan.dev full build) on PATH, Git Bash.
**PATHS OUTSIDE THE PROJECT (copy them or fix the scripts on the new PC)**
- `C:/Users/utkar/Desktop/yt short videos/` (+ `new_2026-11-19/`): the reference Shorts. compare_films.py (REFDIR, line ~22) reads
  "Why Perfect Railroads Don't Work", "The Ancient Jar That Warned an Empire", "The Job Nobody Wants in Japan" (then "How One
  Cart Stopped an Entire Army", "Why Sailors Carried Storm Oil"); also the benchmark's motion.py reads that folder.
- Our own films compare_films.py reads INSIDE the project: studio/out/antitheft/antitheft_FINAL_1080x1920.mp4,
  studio/out/clown/upload/clown_FINAL_1080x1920.mp4 (+ reference frames in sound/pointing/hook_lab/strips/, studio/out/pointing/benchmark/).
- `C:/Users/utkar/Desktop/RAM_TOKEN.txt`: the RAM token (studio/scripts/ram_token.sh, RAM_TOKEN= line 7; kit_render uses it).
- `C:/Windows/Fonts/arialbd.ttf`, `arial.ttf`: labels in opening_v4.py, compare_films.py, sheet_from_video.py, sheet.py,
  audit_opening.py, qa_gates.py (fall back to PIL's default font if missing). Caption font = studio/public/fonts/Montserrat.ttf (inside).
- Absolute "C:/Users/utkar/Desktop/animated-shorts-studio/..." in studio/out/pointing/benchmark/animation/tools/motion.py (B, S);
  scratch helpers only: none of the v4 tools above hard-code the project path (they resolve it from their own location).
- Research notes: `C:\Users\utkar\research_notes\devenseenath\PLAYBOOK.md` (hook rules 3.1, checklist 8),
  `C:\Users\utkar\research_notes\ricksclips\` (script craft). Memory notes live in the user's Claude profile, not in the repo.

## V4 PREP (DIRECTOR #2, from 08:00; network unstable: two lines after every finished step)
- done 08:20: `director/make_v4_script.py` (SCRIPT_v4.md table or lines_v4.json -> `videos3/pointing/v4/script.ts` LINES with
  caption chunks + `v4/plan_words.ts` at 3.5 w/s; line ids L01..; ran on revision 2: 25 lines, 221 words, 67.5 s planned).
- done 08:12: `v4/timeline.ts` (the clock: plan or v4/words.ts, cuts = SHOT_PLAN rules "line:Lnn" / "word:key#n"),
  `v4/shot_plan.ts` (26 shots v01..v26, first pass on revision 2), `v4/words.ts` placeholder (VOICE), `director/probe_v4.mjs`
  (table: 2029 f = 67.6 s planned). tsc 0.
- done 08:15: ITEM 1 + 2: `v4/` = camkit (glideRest/pushRest/slideRest/withRest + default view per set), cams, film,
  Captions, FilmView, Root (comp PointingV4Kit, kit_render --info OK: 26 shots 2029 f), index, resolver (R_V4 for CAST beats),
  `v4/sets/<set>.ts` wrappers (build + CAMS, per-set hashing), `v4/sets/_template_example.ts` (compiles). Map + template:
  `briefs/v3/pointing/V4_STRUCTURE.md`. tsc 0.
- done 08:20: ITEM 3 `tools/v3/gates_v4.py` (holds 8-20 %, whole-frame < 60 %, every shot moves-then-RESTS, no 2-s
  one-thing shot, no shot > 3.5 s; card gates from CAST's per-frame log: arm-out < 10 %, no hand in a face box, no
  see-through card, faces <= 1/4 outside closeUp). On FINAL v1 it reproduces the benchmark (holds 0.0, wide 83.5, 25/26 no rest).
- done 08:25: ITEM 4 `tools/v3/compare_films.py <our.mp4> [--out=]`: sheets every 2.5 s (ours | anti-theft | clown | 3 refs),
  frame-0 sheet, compare_table.md (length, cuts, avg shot, moving area, hold, whole-frame, one-thing, L*, chroma, shadow
  chroma, saturation). Test run on v1 DONE (6.5 min): studio/out/pointing/compare_v1/ (4 sheets + frame0 + table).
- done 08:25: SHOT TABLE on SCRIPT_v4.md REVISION 4 (23 lines): v4/shot_plan.ts = 32 shots v01..v32 (opens + ends on the
  steam cab; none over 3.5 s), `briefs/v3/pointing/SHOT_TABLE_v4.md` GENERATED by director/make_shot_table_v4.py (staging
  dict inside) from director/timeline_v4.json (probe_v4.mjs json). 2036 f = 67.9 s on the plan. tsc 0.
- done 08:31: LOCKED SCRIPT (lines_v4.json, 22 lines; the trap first, frame 0 = the lab lamp + the young woman): make_v4_script.py
  now reads numeric ids, plans at 3.25 w/s from 0.05 s, the GO GRID (7 onsets, gaps 0.46 -> 0.26 s, + a 0.5 s held beat),
  no caption words on the Go run. shot_plan.ts = 36 shots v01..v36 (none over 3.5 s), SHOT_TABLE_v4.md regenerated (staging for
  all 36). Plan 2063 f = 68.77 s at 3.25 w/s (0.77 over the 68 s target; joins 0.15 s). v4/timeline.ts EV: lampGreen,
  goFlashes (go#1..6), red (go#7), redBeatEnd, xPop (she#1), loopPoint (point#6). tsc 0.
- done 08:34: `director/opening_v4.py --audio=<opening mix> [--quality=] [--shots=] [--no-render] [--no-copy]`: tsc, clock,
  kit_render v01-v06 (--conc 1), concat + mux (never silent) -> studio/out/pointing_v4/opening_v4.mp4 (+ pointing_preview/
  VIDEO_v4_opening.mp4), audit -> studio/out/pointing_v4/opening_audit/ (strip 0-8 s, go_run.jpg, opening_audit.json, gates_v4,
  compare/ at 0.5 s over 8 s vs anti-theft / clown / refs). compare_films.py got --max. PIPELINE TEST running (draft, v3 hook
  wav as a stand-in, --no-copy); per-set hashing confirmed (lab, kitchen, jp_platform, cab, car, steam, ny_station).
- next: read the test, message the lead "the opening can be rendered".
- done 08:28: lead messaged (items 1-4 + table). NEXT: on the lead's word (script locked / VOICE installs v4/words.ts):
  make_v4_script.py (if words changed) -> probe_v4.mjs json -> make_shot_table_v4.py.
- (older line:) next was: ITEM 4 the comparison harness; then SHOT_TABLE_v4.md
  from SCRIPT_v4.md revision 3 (opens + ends on the steam cab; 32-36 shots, none over 3.5 s).

## NOW (DIRECTOR #2, 05:12): THE FINAL IS DONE
**NEXT STEP:** none for the film; the owner uploads in Studio with `studio/out/pointing/upload/UPLOAD_KIT.md`
(paste the clown Short's link into the description). Post-release touches: Block 16 of SHOT_REQUESTS.
- FINAL: `studio/out/pointing/pointing_FINAL_1080x1920.mp4` (copies: `studio/out/pointing/upload/`,
  `pointing_preview/VIDEO_FINAL_1080x1920 (hook B).mp4`). 1913 f, 1080x1920, AAC 384k. Rendered 04:24-05:07 (2547 s,
  0.57-2.07 s/f wall per shot). Gates `studio/out/pointing/pointing_FINAL_gates/`: film PASS 9/9. Upload kit + 3 covers in
  `studio/out/pointing/upload/`.

**NEXT STEP:** when `studio/out/pointing/director/final_B_main.log` says "done" (expected 06:15-06:30): the final is
`studio/out/pointing/pointing_FINAL_1080x1920.mp4` (hook B, mix.wav 03:54, AAC 384k), gates `studio/out/pointing/pointing_FINAL_gates/`.
Then: full-size frames of every shot (sheet_from_video.py + fsheet), s03b blur at final, 3 covers into
`studio/out/pointing/upload/` (frame 0 + two others), copy the mp4 to upload/ and pointing_preview/, finish
`upload/UPLOAD_KIT.md` section 9, message the lead. A failing shot: fix, re-render ONLY it (`--shots <id>` with the same
props/out), then concat by hand (like r2B_concat.txt) and re-mux.
- Started 04:24:10 by `bash briefs/v3/pointing/director/final_B.sh` (detached; node pid 24848 at start). Code frozen 04:24.
- 04:20 shots.ts: s03 exposure 1.3 (L* 36.9), s21 exposure 2.1 (L* 38.4). s20 / s14 checked on draft stills 04:23 (sbG).
**NEXT STEP:** the lead decides stage E. Director's verdict: READY FOR STAGE E after two small fixes checked on draft stills
(s20 the boy's finger at the bag; s21 exposure), no third full preview needed. Stage E = `cd studio && node
scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality final --shots all --conc 1
--props '{"hook":"B"}' --out out/pointing_final_B/` (~1.6-2.0 h), mux mix.wav (AAC 384k, no -shortest), qa_gates on the final.
- 04:05 ROUND 2 (hook B film) out: `pointing_preview/VIDEO_full_draft_v3_round2 (hook B).mp4`, sheet
  `pointing_preview/storyboard_v3_all_26_shots_round2.jpg`, gates `studio/out/pointing/pointing_v3_preview_r2B_gates/`
  (film: all PASS, camera 0.67), opening clips re-exported (A = hook-A s01/s02 of 04:03 + the round-2 rest). Block 15.
  Chunks: hook B all 26 in `studio/out/pointing_hookB/shots/preview/` (s03b newer than the rest: hand concat list
  `studio/out/pointing/director/r2B_concat.txt`). s03b sunEl 11 in shots.ts (CAB_FACE); s03 kept at 20 (its green-lamp read
  was proven at 20; the 0.8-s cut between two cab views does not show the sun height).
- 03:31 BLUR GATE settled (Block 14c): preview blur = the 540-px preview (s22 0.121 -> final 0.023, s13 -> 0.034); at final
  only s03b fails (0.155, shallow focus). Final cost: steady 2.4-2.8 s/f -> whole film ~1.6-2.0 h. Test clips:
  `studio/out/pointing/test/`. Block 14b = per-shot on-screen camera targets. Owner delegated approval to the lead: stage E
  starts when round-2 gates + the director's audit pass and the lead says go.
- OPEN for the director: s03b / s03 `sunEl` 11 in shots.ts META (CAB rigOpts) when TRAIN confirms (lead relays).
**NEXT STEP:** the preview ROUND 2 when the lead relays "all saved" after the Block 14 fix list (TRAIN s21 + v3_s03b lens +
camera/warmth; CAST s16a / s13 / s12 life + the s03b acting; STATION exposure + on-screen camera + s07 + s23; LAB s17 / s19):
`bash briefs/v3/pointing/director/full_preview.sh` (tsc, clock check, all 26 shots at --conc 1, mux mix.wav, copy to
pointing_preview/VIDEO_full_draft_v3.mp4, qa_gates), then `sheet_from_video.py` for the storyboard sheet, then the shot audit
against Block 14 (gates: on-screen camera >= 0.5 per shot / film >= 0.6, life >= 0.12, L* 40-60, chroma 18-30).
- 03:05 s03 SPLIT in the clock (LEAD decision, spec = Block 13): s03 f140-164 (the glove insert), s03b f164-212 (the driver's
  face). timeline.ts SHOT_IDS + RULES (`s03b: fr(S("signal") - 0.04)`), shots.ts META, film.ts `S03_WHOLE`: until TRAIN's
  `v3_s03b` exists, s03 AND s03b run TRAIN's s03 lens over the old whole span (picture identical to the pre-split s03); it steps
  aside by itself when `v3_s03b` lands. make_bible.py has s03b; bible PASS 0 fail / 24 warn; tsc 0 (03:04). 26 shots now.
  SOUND's film_clock now also sees "v3_s03b".
- 03:00 FULL PREVIEW v1: `pointing_preview/VIDEO_full_draft_v3.mp4` (= `studio/out/pointing/pointing_v3_preview.mp4`, 1913 f,
  mix.wav 02:10, code of 02:36). 25 shots in 1407 s. Gates: seam, loudness -14.0, TP -2.7, LRA 3.5, captions 100 % PASS; film
  on-screen camera 0.39 FAIL; life fails s09 s12 s13 s16a s17 s19; L* > 60 on platform shots; chroma < 18 in cab/car/lab;
  blur fails everywhere (probably the 540-px preview). Audit + fix list = Block 14. Storyboard sheet rebuilt from the film:
  `pointing_preview/storyboard_v3_all_25_shots.jpg` (tool `director/sheet_from_video.py`).
- 02:20 seven beats: all READ on the film now (foot hook small; the look just). Block 12.
- 02:00 THE OPENING: `pointing_preview/VIDEO_opening_hook_A/B ...mp4` + read-me; lead picked B (after C-8, fixed by CAST 02:02).
  NOTE: those two clips are the 01:40 / 01:53 code; the full preview of 03:00 is newer (C-8 fixed, frame-0 colours) but is
  hook A. A hook-B re-export needs `kit_render --shots s01,s02 --props '{"hook":"B"}' --out out/pointing_hookB/` + assemble_opening.py.
- Clock: TOTAL 1913 f = 63.77 s; cuts 0 81 140 164(s03b) 212 262 344 416 509 623 719 770 874 943 1020 1053 1150 1272 1356 1467
  1497 1601 1675 1706 1799 1855. ONSET_FIX = { "what's#1": 24.195 } only. Caption band = top of SHOT_REQUESTS.

## HANDOVER 2026-11-20 00:40 (DIRECTOR -> the fresh DIRECTOR; nothing of mine is running, no stills slot, no RAM token)
**NEXT STEP:** step 4.1 below (the opening render of both hook exports), as soon as the fresh TRAIN owner has closed
T-7 (rest) / T-8 / T-11, or when the lead says "render now". Everything compiles (`npx tsc --noEmit -p
src/videos3/pointing/tsconfig.json`, exit 0 at 00:33). I was told NOT to edit any owner's file and I did not, except
the one allowed line in `cast/beats.ts` (`BEATS = BEATS_V3`) and running CAST's own tool `cast/voice_sync.py` (it
rewrites `cast/voice_v1.ts`).

### 1. What runs and is checked
- **`studio/src/videos3/pointing/timeline.ts`** (THE CLOCK): the script's 26 lines + caption chunks, every word timed,
  each cut a rule on words, shared events `EV`, `TOTAL`, `L`. Source now: `plan_words.ts` = VOICE's REAL opening words
  (23 words, through "nothing!") + the plan shifted by -0.19 s. Cut 1 = frame 81 (2.70 s), cut 2 = frame 145 (4.83 s):
  the same frames VOICE wrote in `opening_words.json`. Plan total 1948 f = 64.93 s. TESTED offline on a synthetic
  real-voice words.ts (digits "6" / "1,000" / "1.", no replay words, two words missing): it matches line by line and
  reports what it could not find in `TIMELINE_NOTES`.
- **`shots.ts`**: the 25 shots with exactly the outline's ids (s01..s24, s16a, s16b), frames from the clock, `line` with
  speaker tags for CAST, `look` = STATION's JP_RIG preset per platform shot. No camera / set import (no cycle).
- **`cams.ts` + `film.ts`**: a shot's camera = the owner's `v3_<id>` (then the plain id) from the table of its own set.
  The director's motion layer (`DIR_MOVE`) is still in film.ts but is on NO shot now: it steps aside for any camera that
  measures >= 0.25 %/f, and the owners gave every shot its own move. `DIR_REAIM`, `DIR_FALLBACK`, `DIR_OVERRIDE` are
  empty / unused (the lab has its own v3 cameras). Sets in the film: cab, car, jp_platform, lab.
- **Hook prop**: `inputProps.kit.hook` = "A" (default: one shot to cut 1) or "B" (a same-axis 1.25x punch-in on "He",
  frame 51, his eyes kept in place; shot 2's 10-frame face hold carries the same 1.25x and gives it back during its
  move, so the face matches across cut 1 in both). CHECKED only by numbers (the probe); NOT yet seen on a still.
- **`Captions.tsx`**: the script's chunks, CAPS for characters, the building call-outs ("SIGNAL..." then "SIGNAL...
  GREEN!"), the phone pictogram, the small last line, the music note, auto-fit to 960 px. Seen on the stills: all good.
- **Bible v3**: `bible.json` PASSES the validator at 00:28 (0 fail, 23 warn; film camera 0.54 %/f by the validator's
  count, 0.56 by the probe; s21 is a planned freeze = the script's hold). script_lint on the v3 lines: PASS
  (`SCRIPT_v3_lint.md`, `lint.json`; v2 files kept as `*_v2.json`). `BIBLE_NOTES.md` has the "v3 changes" block.
  The bible is GENERATED: `director/make_bible.py` (it locks `voice` by itself once the clock runs on words.ts).
  Its `storyboard.still` fields are empty, so only the `decide` stage passes (gate1 / build would ask for stills).
- **`director/probe.mjs`** (no render, ~5 s): `table`, `caps`, `json <out>`, `cams [<out>]` (every shot's speed, the
  FILM line, which shots carry the director's layer).
- **Cast**: `BEATS = BEATS_V3`; the beat report printed in my render logs was EMPTY (no red lines). I did NOT render
  CAST's own `PointingCastBeats` check sheet.
- NOT run, written only: `director/assemble_opening.py` and `director/audit_opening.py` (the first run is their test).

### 2. The storyboard
`pointing_preview/storyboard_v3_all_25_shots.jpg`: 51 draft stills, every shot, shot id + time + frame + line under
each. Stills: `studio/out/pointing/director/sbC/stills/draft/` (s01-s06, 13 stills, state of 00:20, AFTER CAST's and
most of TRAIN's fixes) and `.../sbB/stills/draft/` (s07-s24, 38 stills, state of 23:43; rendered on the timeline before
the opening words: frame f there is frame f - 6 now, the sheet tool takes `dir@-6`). Older sheets referenced by the
requests: `studio/out/pointing/director/sheetA.jpg`, `sheetA2.jpg` (the opening BEFORE the fixes), `sheetB2/3/4.jpg`.
Verdict per shot, as a stranger on a phone:

| shot | reads? | note |
|---|---|---|
| s01 | READS | f0: stunned man, straight arm, fingertip on the yellow suitcase behind the door glass, phone low; f42 bag gone; f60 / f78 blank face to the lens |
| s02 | READS | f82 the same face on the cut; f105 the whole suitcase at his knee, the boy; f140 the phone swung to the glass |
| s03 | READS, one flaw | f200 white glove under the green lamp; f146 the lamp is there on the cut BUT the glove sits under the caption "at a finger." (T-11) |
| s04 | HALF | his laughing profile + the boy looking up; the jab and the boy's finger on the glass do not read (T-7 rest) |
| s05 | glide READS, hook DOES NOT | no sneaker / wheel in view at f340 (T-8) |
| s06 | READS | mum lifts the boy, he points at the lens, the yellow top, the glove in the corner (f395) |
| s07 | READS | doors open, the suitcase at the threshold with its handle up, his back |
| s08 | READS, catch HALF | boy's arm on the bag, his eyes pop, "BAD SUITCASE." + wag; the tip over the gap and the lunge were not caught on a still |
| s09 | READS | the plant: doors, the late salaryman gives up |
| s10 | READS | selfie, suitcase at his knee |
| s11 | READS | the bag parked in the doorway, "STAY." |
| s12 | READS | the bag alone, the boy's worried face, mum's hand |
| s13 | READS | his mock point, doorway + bag + boy + mum behind him (phone at his ear on that still: C-7, reported fixed) |
| s14 | READS | boy's arm on the big suitcase; his face is cut by the left edge (S-8). 1.10 s kept |
| s15 | DOES NOT READ | his back to the lens for the whole shot, the boy's cap fills 40 % (S-7; STATION added a turn afterwards: unverified) |
| s16a, s16b | READ | he at his phone in front, doorway + bag + boy + mum behind; the phone pictogram caption |
| s17, s19 | READ | two jars, 6 balls against 1, both bars equally full, the bubble, the music note |
| s18 | READS | the cutaway: bag in the near corner, his back |
| s20 | READS | the boy's arm pointing at the bag, his back beyond |
| s21 | DOES NOT READ | a profile cut by the frame edge pointing at a desk; no door lamp to find (T-10) |
| s22 | READS | the payoff: he giggles in front, the doors shut on the bag, the glide |
| s23 | HALF | his head turns, eyes wide: reads; the boy in the window is a dark speck (S-9) |
| s24 | READS | flat face, hand by the ear, the arm out at the suitcase: the last frame is frame 0's picture |

**The seven beats** (full-size stills in `pointing_preview/storyboard_v3_beat_*.jpg`):
1. Frame 0: READS. My own 0.25 s read: "a man in a red cap pointing at a yellow suitcase in a train doorway". Honest
   limits: no 5-person flash test was run; the red cap is the loudest colour, the yellow second, the green stripe
   third and right behind the bag (T-6), so the yellow is NOT the one focal colour: the eye goes cap -> arm -> yellow;
   that it is LOST needs the first half second (the slide) and "His bag / on that train.".
2. Shot 2's jump back: READS (face matched on the cut, the whole suitcase by ~0.8 s into the shot).
3. The no-look foot hook: DOES NOT READ (T-8).
4. The catch at the door: HALF (the boy's point, the eyes popping and the wag read; the suitcase tipping over the gap
   and the lunge are not proven: render a still at "saves", frame ~585).
5. The boy's second point: READS in 1.10 s once his face is in frame (S-8).
6. The 0.7 s look that does not see: DOES NOT READ on the last still (S-7).
7. The two TRIES bars: READ (6 against 1, bars equally full; they are ~4 % of the frame height, at the limit).

### 3. SHOT_REQUESTS_v3.md (8 blocks; the list of every id is at its end)
CLOSED: ALL-1, T-1, T-2, T-3, T-4, T-5, T-9, S-1, S-2, S-3, L-1, L-2, L-3, C-1, C-3, C-4, C-5, C-6 (by report), C-7 (by
report), CAM-1, CAM-2, CAM-3.
OPEN: T-6 (green stripe, small), T-7 (rest: jab + finger on the glass), T-8 (foot hook), T-10 (s21 door lamp), T-11
(s03 glove under the caption on the cut), S-7 (s15 his face; verify), S-8 (s14 face cut), S-9 (s23 boy in the window),
S-10 (= C-7 in s16a / s22: check), C-2 (gone when words.ts lands), SND-1, SND-2, V-1 (info).
Not yet relayed to the owners: block 7 (T-10, S-9, S-10) and block 8 (T-11).

### 4. Next steps, in order (Git Bash, repo root unless said)
**4.1 The opening, both hook exports with sound** (deadline: when TRAIN closes T-3 / T-4 / T-7 / T-8 / T-9; T-3, T-4,
T-9 are closed, T-7 half, T-8 open):
```bash
cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json && cd ..        # must be silent
node briefs/v3/pointing/director/probe.mjs table | head -9                            # cut 1 = f81, cut 2 = f145
# a) check the fixes on draft stills (0 78 = s01, 82 = s02, 146 = s03, 240 = s04, 340 = s05, 395 = s06; 50 / 51 = hook B's punch)
cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality draft --stills 0,78,82,146,240,340,395 --out out/pointing/director/sbD/
node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality draft --stills 50,51,78,82,92 --props '{"hook":"B"}' --out out/pointing/director/sbD_hookB/
# b) preview chunks: hook A s01-s06 into the film's cache, hook B s01 + s02 into ITS OWN folder
node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots s01,s02,s03,s04,s05,s06 --out out/pointing/
node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots s01,s02 --props '{"hook":"B"}' --out out/pointing_hookB/
# c) sound + the two files + the copies in pointing_preview (SOUND's 0-12 s mix on the REAL opening voice exists since 00:04)
cd .. && PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/assemble_opening.py --audio sound/pointing/audio/hook_0-12s_opening.wav --tag "voice + SOUND's 0-12 s mix"
#    (voice alone, 8.76 s: --audio sound/pointing/voice/_v3/_opening/voice.wav)
# d) the audit on the real frames (numbers + two frame sheets + flash_A.jpg in studio/out/pointing/audit/)
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/audit_opening.py
```
Outputs: `studio/out/pointing/opening_v3_A.mp4`, `opening_v3_B.mp4`, copies `pointing_preview/VIDEO_opening_hook_A (one
shot).mp4` and `VIDEO_opening_hook_B (punch-in).mp4` (the picture s01-s06 is 14.57 s, the mix 12.0 s: the clips are cut
to the shorter one, never silent). Then LOOK at `studio/out/pointing/audit/opening_A_frames.jpg` / `opening_B_frames.jpg`
against SCRIPT_v3 section 1 and PLAYBOOK 3.1 (frame-0 focal point, motion from frame 1, words by 3 s / 5 s = 10 / 17
on the real voice, first cut 2.70 s in A and 1.72 s in B, clarity with the sound off), report honestly, and write
`pointing_preview/VIDEO_opening_READ_ME_known_issues.txt` (the lead asked for it: the open requests of section 3 that
touch 0-12 s). The lead picks the hook. Message the lead (SendMessage to main) when the two clips exist.

**4.2 When VOICE writes `videos3/pointing/words.ts`** (its full build was in `sound/pointing/voice/_v3/` at 00:16, not
installed yet): nothing to edit.
```bash
node briefs/v3/pointing/director/probe.mjs table        # the source line must say "words.ts (the real voice: N words)", notes: none
node briefs/v3/pointing/director/probe.mjs json briefs/v3/pointing/director/timeline_v3.json
node briefs/v3/pointing/director/probe.mjs cams briefs/v3/pointing/director/cams_v3.json
python briefs/v3/pointing/director/make_bible.py
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s tools/v3/bible_validate.py briefs/v3/pointing/bible.json --json=briefs/v3/pointing/validate.json
```
Tell the lead the REAL total (the `TOTAL ... f = ... s` line; over 66.0 s the script's cut order 4.3 applies, over
70.0 s refuse) and any `notes`. Every chunk re-renders after this (words.ts is in every shot's hash).

**4.3 The full preview** (PIPELINE_V3 stage C; after 4.2, with the per-shot cache):
```bash
cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots all --out out/pointing/     # -> out/pointing/pointing_preview.mp4
cd .. && ffmpeg -v error -y -i studio/out/pointing/pointing_preview.mp4 -i "sound/pointing/audio/<SOUND's full mix>.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k studio/out/pointing/pointing_v3_preview.mp4
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/qa_gates.py studio/out/pointing/pointing_v3_preview.mp4 --words=sound/pointing/voice/words.json --out=studio/out/pointing/pointing_v3_preview_gates
```

**4.4 Storyboard stills still owed**: the catch at "saves" (frame ~585), s15 after STATION's turn (frames ~1095, 1140),
s21, s23 and s14 after their fixes, hook B at frames 50 / 51. Re-make the sheet:
`tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/sheet.py pointing_preview/storyboard_v3_all_25_shots.jpg 9 250 "studio/out/pointing/director/sbB/stills/draft@-6" studio/out/pointing/director/sbC/stills/draft <new folders>`.

### 5. Traps
- **kit_render deletes a shot's other chunks** when it renders that shot: hook B always into `out/pointing_hookB/`.
- **Every shot re-renders** when a SHARED file changes: timeline.ts, shots.ts, cams.ts, Captions.tsx, plan_words.ts,
  words.ts, anything in cast/ or kit/. `film.ts` is the exception (its cameras are in each shot's signature) and a
  set's own files only re-render that set's shots. So: do not re-run `make_plan.py` after the opening is rendered
  unless the words changed, and expect a full re-render when words.ts lands.
- **A broken import between two owner files stops every render** (batch B died once on `greenLampOf`): tsc first.
- **The opening-words splice**: `make_plan.py --opening <json>` replaces the plan's first lines with VOICE's real
  times and shifts the rest by the difference at the join; then run CAST's `voice_sync.py
  briefs/v3/pointing/director/plan_words.json`, or the cast acts the old words. Without `--opening` it writes the pure
  plan again (cut 1 back at frame 91).
- **Until words.ts exists the cast's timing is shot-relative** (the first word of each shot 0.03 s after the cut):
  acting in shots whose first word comes late (s08, s09, s12, s15, s22, s24) is early on the stills.
- **Never run `tools/v3/new_short_v3.py pointing --shots`** (it overwrites shots.ts with typed frames) and do not use
  `tools/v3/storyboard.mjs` for this film (it reads the bible's framings and rewrites bible.json).
- Hook B's match in shot 2 uses TRAIN's `MARKS_car.touristFace`; its punch in shot 1 uses STATION's
  `MARKS_jp_platform.s01` + an eye height of 1.27 m (a guess from a still: check the two hook-B stills).
- `probe.mjs caps` is a hand copy of the Captions rule (the film's own `CAPS` is the truth).
- Stills cost 35-70 s each while three or four renderers share the GPU (51 stills took about 55 min of wall time);
  nothing was rendered at preview quality by me, so there is NO measured preview s/frame for this film yet, and NO
  opening clip and NO audit of real frames exist yet.
- The owners edit live: measure the cameras again before trusting the bible's numbers (`probe.mjs cams`).
- SOUND's cue sheet computes its own cuts (cut 1 at frame 92 on its stand-in): request SND-1 asks it to read
  `briefs/v3/pointing/director/timeline_v3.json`; one frame of difference at most today.


## What exists (film-level files, all DIRECTOR-owned)
| file | what |
|---|---|
| `studio/src/videos3/pointing/timeline.ts` | THE CLOCK: the script's lines + caption chunks, every word timed (words.ts when VOICE has written it, else plan_words.ts), each CUT as a rule on words, the shared EVENTS (`EV`: doors, lamps, glide, melody ...), `TOTAL`, the loop length `L`. Imports only words.ts + plan_words.ts: any set may import it at top level |
| `studio/src/videos3/pointing/plan_words.ts` | GENERATED by `briefs/v3/pointing/director/make_plan.py` (the script's planned word times; `--opening <json>` splices VOICE's real opening words in) |
| `studio/src/videos3/pointing/shots.ts` | THE SHOT TABLE: 25 shots, ids exactly `s01 .. s24` with `s16a` / `s16b`, frames from timeline.ts, place / light / beat, `line` with speaker tags for CAST. No camera or set import (no cycle) |
| `studio/src/videos3/pointing/cams.ts` | the owners' camera tables by set (`v3_<id>` first) |
| `studio/src/videos3/pointing/film.ts` | the assembly: owner camera -> director fallback / override -> the HOOK prop -> ShotDef; sets = cab, car, jp_platform, lab (no New York, no kitchen) |
| `studio/src/videos3/pointing/Captions.tsx` | the script's own caption chunks (1-3 words, CAPS for characters, the phone pictogram, the small last line, the music note) |
| `briefs/v3/pointing/director/probe.mjs` | prints the table / captions / camera speeds from the film code (no render) |
| `briefs/v3/pointing/SHOT_REQUESTS_v3.md` | everything that is missing or wrong in another owner's files, per owner and shot id |

## How the film re-times itself
- `timeline.ts` matches the script's lines to `words.ts` (line by line, in order). When VOICE writes words.ts, every cut,
  caption, event and `TOTAL` follow at the next bundle; nothing to edit. The probe shows the result:
  `node briefs/v3/pointing/director/probe.mjs table`.
- Until then: `python briefs/v3/pointing/director/make_plan.py` (plan) or `... --opening sound/pointing/voice/_v3/opening_words.json`
  (real opening + shifted plan), then `python studio/src/videos3/pointing/cast/voice_sync.py briefs/v3/pointing/director/plan_words.json`
  so the cast acts the same words (CAST's documented re-time step; its timing is shot-relative until words.ts exists:
  the first word of each shot sits 0.03 s after the cut, so acting cues in shots whose first word comes late (s08, s09,
  s12, s15, s22, s24) are EARLY until the real words.ts lands).

## The two hook exports
`film.ts` reads `inputProps.kit.hook`: A (default) = one shot to the first cut; B = a same-axis 1.25x punch-in on "He"
(frame-switched, the tourist's eyes keep their screen place). Render B into its own folder:
`node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots s01 --props '{"hook":"B"}' --out out/pointing_hookB/`

## Log
- 22:50-23:20 read everything; wrote timeline / shots / cams / film / Captions; tsc clean (1 m 27 s); `BEATS = BEATS_V3`
  flipped in cast/beats.ts (the one-line switch); cast/voice_v1.ts re-made from the PLAN words with CAST's own
  voice_sync.py. STATION had already flipped `SCRIPT = "v3"` at 23:05.
- 23:20-23:45 first stills: frame 0 reads; added `DIR_REAIM` (frame-0 tilt) and the DIRECTOR'S MOTION LAYER (`DIR_MOVE`,
  steps aside when an owner's camera measures >= 0.25 %/f) to film.ts; bible generator + linted v3 script
  (`SCRIPT_v3_lint.md`, lint.json = v3, the v2 files kept as `bible_v2.json`, `lint_v2.json`, `validate_v2.json`);
  requests blocks 2 + 3 (CAST pre-roll bug in s01, the glove, s02 match + crowd, s04 / s05 / s06 compositions). The
  lead relayed them: CAST, TRAIN and STATION are fixing; the lead approved the motion layer as the safety net.
- 23:45-00:40 storyboard: batch A re-done as `sbC` (the opening after the fixes), batch B (s07-s24), the sheet +
  the seven beat stills in `pointing_preview/`; requests blocks 4-8 (camera budget, s15 / s14 / s21 / s23, the glove
  under the caption); VOICE's real opening words spliced in (cut 1 f81, cut 2 f145; 10 words by 3 s, 17 by 5 s);
  the frame-0 tilt removed (STATION re-built the lens); hook B extended to shot 2's face hold; bible v3 PASS;
  hand-over ordered by the lead at 00:35 (model switch) before the opening render: see HANDOVER at the top.

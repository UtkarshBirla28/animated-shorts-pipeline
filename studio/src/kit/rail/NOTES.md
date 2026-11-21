# kit/rail (STATION owner, "pointing" film): NOTES + API

## PAUSED 2026-11-21 ~10:00 (STATION #3) - READ THIS FIRST
STATE: my files whole, `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` = 0 (09:50, whole project). No render,
RAM token or stills slot of mine (the r3f job was stopped mid-way, its dead slot1 removed, token released). My files:
`studio/src/videos3/pointing/v4/sets/ny_station.ts`, `v4/sets/jp_platform.ts`, `kit/rail/vending.ts`. Probe tools:
`studio/out/pointing_v4/ny/tools/` (nycam.mjs, nyproj.mjs: the probe's "head" sits ~10-15 % LEFT of where the card
renders; sheet.py; r3*.sh render scripts). Latest stills: `out/pointing_v4/ny/r3f/stills/draft/` (24 of 27; no v35
grin frames, no clips). Last sheet: `pointing_preview/STATION_r3_stills_0918 (DRAFT).jpg`.
CODED + SEEN FIXED (fresh stills r3e / r3f; whole-shot clips of THIS code NOT rendered yet):
- v19 train glides ~10 m in the shot, still moving at the cut; lens tighter + lower (stills).
- v31 opens on the arriving train with him in his window; v32 shoulders in the window; v32 point reads.
- v33 / v34 / v35 three different pictures (high wide / frontal close / low medium); v34 sign unchanged and readable.
- v33 they start 1.4 m away, the lift takes 11 f, his head is off the right edge (r3f f1790).
- The foreground bench + box are out of v31 / v33; the open-mouth laugh beats are out.
- v35 the push-in plays (r3f f1880 -> f1900 -> f1912: bigger, ends as the point lands, then holds).
CODED, NOT YET CHECKED / NOT GOOD:
- v35: the hand still LANDS ON "HERE" (r3f f1900 / f1912) even with gap 0.9 aimed at the word: next try aim at a point
  in the air 0.15 m right of the sign's near edge at "HERE" height (and/or ask CAST for a shorter reach); the grin and
  the hold after the push are not seen (no f1925-f1946 stills of this code).
- v32 doors: the previous car's door (x -3.56) has a warm interior box + a passenger inside; NOT seen reading on any
  frame (r3f f1700 / f1720 show no visible opening): the door is small/far beside the board. A real fix needs a lens
  that holds a door near him (his own door x 1.69 is beside the lens) - not started.
- Whole-shot draft clips of v19, v31-v35 on this code: not rendered (tools/r3f.sh runs stills then clips; run it).
NOT STARTED from the lead's 09:30 message: the v32 door "wide, near him, contrast" re-stage (above); a cream tile strip.
DOOR FRAMES for DIRECTOR / SOUND (sent): point ~f1655, doors start ~f1677 (T_POINT + 0.75 s), arm drops ~f1680.
FOR CAST (see the "FOR CAST" block below; unchanged): big bare hand + one finger stopping a hand-width short in v35, a
bigger grin, open eyes in v32 (focusB droops), a silent laugh for the couple (mouths shut), prankB clearly a woman,
the two looking at HIM when he points (lead asked CAST).

## AUDIT ROUND 2 work (lead 08:20; list studio/out/pointing_v4/audit_r3/FIX_LIST_STATION.md)
- done 08:50 (code, probe-checked; my files compile, shot_plan.ts has a DIRECTOR mid-edit error): v35 re-staged (sign 0.12
  m nearer him, the two closer, lens LOW (y 1.15) + level: no empty floor, him head ~15 % at x ~0.72-0.75, sign words
  above the caption band, push in toward hand + sign); safe area kept (important things x <= 0.90, y <= 0.80);
  v32 timing: point on "conductors" f~1655, held 25 f, DOORS START 0.75 s after the point (~f1677, TELL DIRECTOR /
  SOUND), arm drops as they slide; v31 his window in frame from the first frame, the train glides the last 0.6 m;
  conductor raised 0.15 m (shoulders above the sill); v33 = a high wide (different from v34 close / v35 low), they
  start 1.4 m away, lift over 11 f; open-mouth laugh beats removed; foreground bench + box; commuters crossing in
  depth in v31 / v33 lanes.
- done 09:20: r3 / r3b / r3c / r3d / r3e stills looked at (sheet pointing_preview/STATION_r3_stills_0918 (DRAFT).jpg).
  Fixed on the way: the green column stood in front of the v33 / v35 lenses (lenses now at x <= 2.2); the payoff aim sat
  below the window sill after raising him (arm vanished) -> aimed at the sign's near TOP corner pulled toward him (navy
  sleeve + hand now reach the sign); v33 / v35 wider so his head is off the right edge; v19: train glides ~10 m in the
  shot (still moving at the cut), lens tighter + lower. r3e whole-shot clips queued for the RAM token.
  TICKS (FIX_LIST_STATION audit_r3): 1/2/9 v35 point + grin: navy sleeve arm + hand to the sign, held 25 f, grin -
  BETTER, hand still brushes "HERE" and the grin is small (CAST); 3/11 v31 opens on the arriving train with him in
  frame - DONE; 4 shoulders in the window - DONE, commuters only far/small, no tile strip (lenses face the train);
  5/6/7/12 doors ~0.75 s after the point (f~1677) - code DONE, the opening still reads weakly on frames; eyes - CAST;
  8/17 one hand each on its own corner - DONE, woman look - CAST; 10 v19 - DONE (glide, tighter, lower);
  13 v33 nearer + 11 f lift - DONE.
- done 09:40 (lead 09:30): v35 PUSH-IN camera (payoffCam: ~1.4x push ending as the point lands, then a hold through
  deadpan + grin); fingertip aimed at "HERE" with gap 0.9 (stops short); v32 door: the previous car's door (x -3.56,
  seen beside the board) gets a warm interior box + a passenger standing inside as the leaves slide; foreground
  bench + box removed; v33 wider (his head off the right edge). Note: my probe's "head" sits ~10-15 % left of where the
  card renders (lean): keep probe head <= ~72.
- next: r3f (tools/r3f.sh -> out/pointing_v4/ny/r3f/: 27 stills then clips v19 v31-v35) -> 180 px check -> sheet -> report.

## FOR CAST (audit round 2, STATION #3, 2026-11-21 08:30) - what STATION needs, in order
1. v35 PAYOFF POINT (ny_conductor, beat `point` at F(T_PPOINT) ~f1898, held 25 f, `auto: true`, aim = the sign's near top
   corner pulled toward him, `gap` small): the NAVY SLEEVE arm with a BIG BARE hand (hs ~1.3) and ONE extended finger,
   the arm coming DOWN-LEFT at the sign, the fingertip stopping a hand-width short of the sign edge; drawn at the
   sleeve's full thickness (not a 1-3 px line); no hand over his own face. Held still >= 12 f, then the arm drops.
2. v35 GRIN (face beat `brightGrin` from T_GRIN ~f1926): a big, clear grin (teeth / wide mouth) that reads on a head
   ~15 % of the frame height; no blink on the swap.
3. The conductor's BODY in his window: STATION now raises him so his SHOULDERS sit above the sill (pos y +0.15, cut at
   the sill): please make sure his card shows navy shoulders / chest under the head (not a head on a stick) at that cut.
4. v32: his eyes must not droop shut: the `focusB` face reads as half-closed eyes (audit). An open-eyed "focused"
   expression name I can use, or make focusB open-eyed.
5. The New Yorkers' LAUGH (v35, from the grin): mouths SHUT (a silent laugh: shoulders shaking, eyes squeezed, closed
   grin), never mouths moving under the narrator. STATION will drop its `laugh` beats and keep `brightGrin` until you
   give a silent-laugh move name. Bonus: the two turn to each other for ~8 f after the grin.
6. prankB is clearly a WOMAN at phone size (long hair / ponytail, a distinct silhouette); one hand each stays on its
   own top corner of the sign (STATION's HANDS: prankA L at (-0.46, 0.42), prankB R at (0.46, 0.42) in sign metres).

## AUDIT ROUND 1 (lead 04:30; list: studio/out/pointing_v4/audit_r1/FIX_LIST_STATION.md) - STATION #3
- done 04:55 (code, tsc 0; backup out/pointing_v4/ny/tools/ny_station_before_audit1.ts): LAYOUT v6: v32-v35 lenses
  look UP-TRAIN from down-train near the edge (the platform in depth behind the action, not the train side); board +
  sign turned to them (S_LENS); v31 stays the platform wide (two different pictures for v31 / v32: no jump cut).
  v31: point on "pointing" (lead's latest), drop after "point" (~f1700), doors open on "striped board" (the previous
  car's door behind the board in v32; a rider steps out of it and walks off up-train). v35 lens: conductor head ~19-20 %
  of the height, sign readable beside him, the two behind it. Sign carried tipped at hip height, LIFTED (up 0.27 m +
  upright over 9 f, small overshoot) = no edge-on stick (item 4 / v33 f1760 was the flat sign seen edge-on). Car:
  silver steel + ONE cobalt stripe + yellow belt/door/window surrounds (the big cobalt bands are gone); the coloured
  line discs removed (facts: route bullets); the white door-glow box removed (the car's own lit interior shows).
  Walker lanes moved into the visible depth strip. Caption band 66-70 %: sign bottoms aimed above ~62 %.
- done 05:10: a1 stills looked at (out/pointing_v4/ny/a1/sheet.jpg): v31 wide + the new navy SLEEVE arm (CAST's) point
  reads; v32 close on board + hand + his profile (different picture from v31); v33 they walk TOWARD the lens carrying
  the tipped sign, lift it; v34 big; v35 him big (head ~20 %), arm to the sign. Fixed after: v35 hand landed on "HERE"
  -> aimed at the sign's near edge (gap 0.3); v33 / v35 heads cut by the edges -> fov 68 / 58; the couple LAUGH on his
  grin (CAST "laugh", eyes open); v19 lens aimed left + up (nose whole, less shadow floor); v19 flock seen crossing (r1).
- done 05:55: a2 clips looked at (out/pointing_v4/ny/a2/v3x_sheet.jpg): v33 walk-in toward the lens + lift reads; v35
  the navy sleeve arm shows but its hand lay ON "HERE" and the conductor sat at the edge; v32's far door hid behind the
  board. Fixed: board-day board out to z 1.0 (the previous car's door now shows BETWEEN board and conductor in v32);
  v32 = an arc push (0.30 %/f); v35 aim 0.22 m OUTSIDE the sign's near edge (gap 0.05), the man moved inboard (his face
  sat over the hand), lens wider + bigger move (0.25 %/f); CAST's ask: the couple's hands now grip the sign's TOP edge
  (their cards stand behind the sign: side-edge hands were hidden); vending headers recoloured (facts: cola look).
- done 06:05: a3 clips looked at (out/pointing_v4/ny/a3/: v35_big.jpg, v32_big.jpg + sheets): THE PAYOFF READS (him
  big at the right, navy sleeve arm + hand reaching the sign's edge, the words readable, the couple above). Fixed after:
  hand still touched "HERE" -> aim 0.35 m outside the near edge at mid height; a hand at the sign's top middle sat
  under a chin + the laugh put her hand to her mouth -> hands on the top corners + side edges, laugh hand: false;
  v32's stepping-out rider crossed the conductor's face -> off; nyRiderC (a dark back under the board in v32) -> v31
  wide only; v34 saw the conductor's face at the right edge + sign bottom in the band -> lens moved round (+z) + lower;
  dressing props (bench, bins, utility box, coffee cart) in the visible up-train strip.
- done 06:25: a4 fresh stills (out/pointing_v4/ny/a4s/sheet.jpg; the a4 clips starved 40 min for the RAM token, stopped):
  payoff reads (big conductor, sleeve arm to the sign, couple laughing on the grin), v33 carry + lift, v34 big. Fixed:
  a side-edge hand covered "ARE" -> each New Yorker grips a TOP + a BOTTOM corner (CAST's hold uses these); v34's first
  frame showed half the conductor's face -> lens round + looking left. Lead 06:15: board point = "conductors" ->
  "striped" (~54 f, v32 only; v31 he looks at the board), doors open on the lowered arm at v32's end.
- done 06:45: a5 stills + clips looked at (out/pointing_v4/ny/a5/, sheet pointing_preview/STATION_r1_stills_0550
  (DRAFT).jpg); a6 / a7 stills (hand checks). Found + fixed: the payoff aim "outside the edge" ran INTO the car wall
  (arm vanished in a5) -> near top corner pulled 0.2 m toward him (a7 f1905/f1915: navy arm + hand reach the sign's
  edge, words readable, deadpan; grin + laugh at f1940); CAST draws the couple's hands IN FRONT of the sign, so any
  hand below the top edge covered letters -> all four hands on the top corners and the sign's words inset to 76 % of
  its width (margin for the hands).
- done 06:15 ROUND 1 DONE: fresh stills + whole-shot draft clips on the current tree (out/pointing_v4/ny/r1f/ v19 v31 v32,
  out/pointing_v4/ny/r1g/ v33 v34 v35; logs: 0 errors / 404 / NaN), every 2nd frame looked at. Sheet:
  pointing_preview/STATION_r1_stills_0612 (DRAFT).jpg. One hand each on its own top corner (a second hand crossed the
  words). tsc 0.
  STILL OPEN: (1) CAST draws each New Yorker's FREE arm (thin ink line) IN FRONT of the sign: in v34 it crosses
  "IF" / "DEAD" and at v34's first frames a sleeve crosses "POINT" (CAST: draw the free arm behind the sign or on the
  hip); (2) v32's door opening is small (behind/beside the board, far); (3) the ceiling + walls still read sky-blue
  (LOOK); (4) v19 minor items (canopy ring pictogram, shadows) only partly done; (5) arm-out: board point ~54 f (v32),
  payoff 25 f (v35).
- done 06:30 (lead round 2): the line across "IF" / "DEAD" in v34 = the New Yorkers' card edges meeting the tilted
  sign -> both stand 7 cm further back. Clips out/pointing_v4/ny/r2/ (v33 v34 v35, log clean) looked at: v34 every 2nd
  frame clean (no line over the words), v33 lift every 2nd frame clean, v35 point + grin clean. tsc 0. "v34 clean" sent.
- next: wait for the third full draft / the lead.

## FIX ROUND 1 (lead 04:00, after the first full draft; STATION #3)
- done 04:20: (1) ARM-OUT: the board point now snaps on "conductors" (v32 ~f1655) and drops as "striped board" starts
  (~f1709): ~54 f instead of ~84 (v31 now has no arm out: he looks at the board); the doors open on the lowered arm.
  (read the lead's "come down right after the words striped board" + "saves ~30 f" this way; flag if wrong). v35 stays.
  (3) LIFE: the train rocks on its springs while gliding, settles with a damped bounce, dips as the doors open, breathes
  in the rests (trainBob, the conductor rides with it); pigeons hop now and then; on the prank day two pigeons TAKE OFF
  as the two walk in and the one by their feet hops clear; a rider STEPS OUT of his car after the doors open (v32 rest,
  walks off +x); v34's walkers now in view behind the two; v19: a flock of 9 pigeons crosses the sky. Probe: every
  up-train platform lane is OFF-frame in v31/v32/v33/v35 (the lenses look at the train side): no "people crossing in
  depth" possible there without crossing the action; a 2nd train on track 2 is hidden by ours. tsc 0.
  (2) CAST's sleeve arm not landed yet (ny_conductor still inkArm) -> re-check v31 v32 v35 when it does.
- next: draft clips out/pointing_v4/ny/r1/ (v19 v31-v35) -> every 2nd frame -> fix -> report.

## V6 HANDOVER (STATION #3, 2026-11-21 02:25, owner's laptop). READ THIS FIRST.
STATE: `v4/sets/ny_station.ts` = LAYOUT v5 + LIVERY (whole, tsc 0, retime_v4.py ALL CHECKS PASS at 00:38; no clock
change since). Probes (no render): `out/pointing_v4/ny/tools/nycam.mjs` (my own camera speeds, no director drift) and
`nyproj.mjs` (projects NY_PTS through my lenses; run from studio/). Backup of the pre-v5 file: tools/ny_station_before_v5.ts.
DONE + LOOKED AT (fresh cold stills cold6 / cold7 / cold8, logs clean): the board point reads in ONE glance in the first
NY shot (v31: train stops at the board, sideways point on "pointing", held across the cut into v32, drops after
"point", THEN the doors open warm-lit); v35 conductor whole in his yellow-framed window, level arm to the sign with a gap,
sign readable, both faces, grin; v34 sign big + spelt right, clear of captions; invented livery (cobalt body, yellow
belt + door + window surrounds); no foreground figure; own glides v31 0.51 / v32 0.80 / v33 0.33 / v34 0.35 / v35 0.29
%/f, each + a 21 f rest (=> DIRECTOR can remove his drift on v31 v33 v34 v35: STATION cameras done).
Final sheet: `pointing_preview/STATION_v5_stills_0221 (DRAFT).jpg`. LOOK numbers: out/pointing_v4/ny/cold6|7|8/look_sheet.jpg.
COLD CLIPS DONE 02:30: cold8 whole-shot draft clips v19 v31-v35 (out/pointing_v4/ny/cold8/shots/draft/, log: 0 errors,
0 404, 0 NaN), every 2nd frame looked at (cold8/v19_sheet .. v35_sheet.jpg): v19 glide in; v31 train in, stops, point
on "pointing"; v32 point held through the glide, arm down ~1703, THEN the doors open warm-lit; v33 walk-in side-on,
flip up, faces whole; v34 readable all through the arc; v35 level point ~1898-1923, grin ~1926, man's hop.
No render, token or stills slot of mine running.
OPEN: (1) pigeons sometimes clipped by the bottom/left frame edge (life only); (2) colour still short of LOOK's target: beige 16-27 %, vivid
9-45 % (v32 end + v34/v35 weakest; the beige is the white card faces, the ceiling conduits, the window glow; the red floor
counts as "in-between"); (3) v19 (Japan) beige 31 %, untouched this round; (4) arm-out: the board point now holds
~84 f (1619-1703) + the payoff 25 f.

## V5 WORK on the owner's laptop (STATION #3, 2026-11-20 from 22:25; GTX 1660 Ti = render system)
- done 22:30: read the brief + V5 handover; tsc 0; own-camera probe (scratchpad nycam.mjs, no director drift): v31 0.093,
  v32 0.187, v33 0.087, v34 0.150, v35 0.093 %/f -> all under 0.25. Baseline stills -> out/pointing_v4/ny/v5a/.
- done 23:10: v5a looked at (out/pointing_v4/ny/v5a/, 11 stills): v31 the board HID the conductor (cap peeking over it);
  v32 the board read as a blurred far wall feature, the hand touched its corner, the door = a white panel at the edge, he
  still pointed at 1715; v34 man's head cut top-left; v35 him cut by the right edge. -> LAYOUT v5 in v4/sets/ny_station.ts
  (backup: scratchpad ny_station_before_v5.ts): every lens on the platform down-train + out, looking back up the train;
  board at [-0.75, 1.72, 0.5] up-train of him (prank day +0.3 m), sign right under it; he points SIDEWAYS (auto arm) on
  "pointing" in v31, held across the cut to v32, drops after "point" (T_DROP), doors open after; the two walk in along
  the platform from the left (side-on); own glides now v31 0.43, v32 0.79, v33 0.38, v34 0.36, v35 0.30 %/f + 21 f rests;
  the sign trembles while held. Probe without render: scratchpad nyproj.mjs (projects NY_PTS through my lenses).
- done 23:40: v5b stills looked at (out/pointing_v4/ny/v5b/sheet1.jpg, sheet2a/2b.jpg): v31/v32 POINT READS in one
  glance (striped board left, arm, face); doors open as a lit doorway + a rider at v32's end; v35 READS (him whole in his
  window, arm to the sign, sign readable, board above the two); v34 big + readable. Found + fixed: hand on the board's /
  sign's corner (gap 0.3/0.35 -> 0.55); pigeons huge in the foreground (moved to the platform edge, mid-ground); v33 /
  v35 the two stood in profile with her face behind his head (sign + two turned 2/3 toward the lenses, wider apart);
  v35 rest cut the man at the left (look x -0.6).
- done 00:05: v5c looked at (sheetA/B in out/pointing_v4/ny/v5c/): the two now side by side, faces frontal, sign between
  them; v32 end = a lit open doorway with a rider stepping in (reads as a door); v34 reads big. Fixed after: his finger
  stood VERTICAL pointing 29 deg up at the board (a raised finger) -> board y 1.52 (level point), prank board +0.4;
  v33 conductor cut by the right edge + sign bottom ~66 % -> arrive look right + lower, fov 62; v35 hand ON the sign's
  edge -> gap 0.85; v35 rest cut both edges -> fov 63; her landing crouch hid her face behind the sign -> no hop for her,
  no sign lift on the grin; pigeons moved again.
- done 00:30: v5d looked at (out/pointing_v4/ny/v5d/sheet.jpg, big.jpg): the board point is now a sideways finger at
  the board (v31 1625, v32 1641); v35 1910 level arm, hand short of the sign with a gap, deadpan, both faces; 1940 grin.
  Fixed after: her mouth behind the sign top at 1940 -> she stands at the sign's far end (man unchanged: at the near end
  he sat in the conductor's hand line, probe); v34 end cut both heads -> v34 = a sideways arc around the sign (0.43 %/f).
- done 00:20: v31 clip (out/pointing_v4/ny/v5clips/v31_sheet.jpg, every 2nd frame): train glides in and stops ~f1601,
  he comes out from behind the near green column (a foreground wipe), points ~f1619, holds; pigeon pecks through the
  rest. Found: in the wide the board's stripes melt into the car's window band behind it -> a black rim round the
  board (kit board child, v4_ny_board_rim). v32-v35 clips waiting for the RAM token (cast / director rendering).
- done 00:40: clips v32-v35 looked at every 2nd frame (out/pointing_v4/ny/v5clips/v3x_sheet.jpg): v32 point held,
  glide back-right, arm drops ~1703, THEN the door opens warm-lit ~1706-1722 and riders step in; v33 they walk in
  side-on from the left carrying the sign flat, flip it up, faces frontal; v34 readable throughout the arc; v35 point
  ~1898-1923 (thin level arm, gap), grin ~1926, man hops. Fixed after: riders flank the door (one on his side, in frame,
  not a blurred head at the right edge); a pigeon swept the v32 bottom edge + a big pigeon 1 m from the v34 lens
  (moved); v33 man at the left edge (fov 66); v35 rest cut the left person (fov 67, look left, she at 0.44). v5e stills
  stopped (superseded). retime_v4.py ALL CHECKS PASS, tsc 0 (00:38).
- 00:55 LEAD'S NEW ORDER (LOOK all-shots sheet 00:52: NY is the greyest part: beige 26-43 %, vivid 6-23 %): less bare
  steel + an invented coloured livery, conductor medium, no dark foreground figure, the sign bigger in v33 / v35, keep
  pigeons; measure with LOOK's allshots_sheet.py (beige < 15 %, vivid > 25 %, chroma >= 28). The cold5 pass (old code,
  still waiting for the token) was STOPPED.
- done 01:10: LIVERY in ny_station.ts (meshes in `bullets`, ride with the train; no real scheme copied): cobalt lower
  body between the doors (y 0.02-0.76), warm-yellow belt stripe, warm-yellow door surrounds + a yellow frame round his
  window. Riders only in the v32 picture, waiting BEYOND his door (+x) (the "beanie man" was nyRiderA moved to his side
  of the door at 00:35: out). Sign 0.96 x 0.70 (c y 0.8), hands at its edges +-0.48; the two closer to its plane.
  Tighter lenses: v31 (head ~12 %), v32 start (head ~16 %), v33, v35. Own glides: v31 0.51, v32 0.78, v33 0.33, v34
  0.43, v35 0.29 %/f, 21 f rests.
- done 01:45: v5f looked at + measured (LOOK's allshots_sheet.py -> out/pointing_v4/ny/v5f/look_sheet.jpg; beige map
  beigemap.jpg): the livery reads (cobalt + yellow, the steel now light grey, the board's black rim strong), conductor
  medium (v31 / v32 start), sign bigger. Numbers: v31 C27 b25 % v39 %, v32 start b22 v40, v32 end b31 v8 (floor + steel),
  v33 b22 v24, v34 b27 v25, v35 b21 v19. Beige = the bare upper steel, the ceiling conduits/fixtures, the WHITE
  card faces (cast, not mine) and the window glow; the red floor counts as "in-between" (not vivid). -> cobalt over the
  upper body too (window tops to the eave); a pigeon off the frame edge.
- done 01:58: v5g (out/pointing_v4/ny/v5g/look_sheet.jpg): with the cobalt upper body: v31 C31 b18 % v40 %, v33 C27
  b17 v25, v35 C27 b17 v21, v32 end b26 v9 (floor + window glow + ceiling conduits) -> v32's end lens lowered (y 1.2,
  less floor). tsc 0.
- done 02:15: COLD stills cold6 (24 fresh stills, log clean: no error / 404 / NaN; out/pointing_v4/ny/cold6/look_sheet.jpg
  with LOOK's numbers). NY now: v31 point frames C31 b18 % v40 %, v32 start b16 v41-45 (PASS-level colour), v33 b17
  v25, v34 b22-25 v26-32, v35 b17-23 v21-24, v32 end b26 v9-13 (weakest). v19 b31 v33-35 (platform, unchanged).
  Fixed after: v34 crowns cut by the top -> fov 73-75; v32 end lens lowered (y 1.0, looking up: less floor, more blue
  ceiling; board, him and the opening door still in one frame). cold6 clips stopped (pre-fix code).
- done 02:20: cold7 stills (out/pointing_v4/ny/cold7/look_sheet.jpg): v34 heads whole now (b23-24 v24-31); v32 end
  still b27 v11 and the boarding rider = a dark blurred blob at the right edge (f1735) -> both boarding riders REMOVED
  (boardPath gone); the doors + warm car carry the beat. cold7 clips stopped (pre-fix); my RAM token released.
- next: cold8 (scratchpad cold8.sh -> out/pointing_v4/ny/cold8/: stills 1716 1735, then clips v19 v31-v35) -> look
  every 2nd frame -> final sheet -> report.

## V5 HANDOVER (2026-11-20 evening, new PC -> next PC; STATION #2, written 19:25)
STATE: every file of mine whole; `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` = 0 (19:25, whole project).
No render, stills job, RAM token or stills slot of mine running or held; no part files. Final clock 2054 f = 68.47 s.
My files: `studio/src/videos3/pointing/v4/sets/ny_station.ts` (v31-v35), `v4/sets/jp_platform.ts` (v19),
`videos3/pointing/sets/jp_platform.ts` (v3 builder: + `arriveDec/arriveV0`, `motes` opts), kit/rail (`houses.ts`,
`signal.ts` toNonIndexed guards), `studio/public/kit/surfaces/tunnel_concrete/kit.json` (added, tileM 2.0).
**DONE AND CHECKED (frames looked at, stills + whole-shot draft clips every 2nd frame):**
- v19 (JP): sunny platform, the green train's face glides in (stops 0.4 s after the cut, 3 m/s^2), walkers, pigeons,
  digits / pictograms only. Clip 18:40 (out/pointing_v4/ny/final/clips/).
- NY look = LOOK's (nyLook(st.mats, st.object), NY_LIGHT, NY_RIG, steel train selfLit, warm face light). Bright.
- v31 wide (train glides in, conductor at the window, riders, pigeon); v32 SIDE lens: he is side-on, head ~1/5, points
  (left arm, gap 0.2) at the board hanging close on his point line (BOARD_NEAR, v32 only), holds 1.0 s, arm drops, THEN
  the doors open with a warm lit interior glowing up behind his car's door (`doorGlowM`); v33 the two walk in 3/4 and
  snap the chest-high sign up (faces above it); v34 the sign big + readable, faces whole; v35 he points (25 f, gap 0.35)
  at the sign's top line, arm drops, grin + the man's hop.
- Frames checked on the final clock: stills out/pointing_v4/ny/final/ (923 946 968 1577 1608 1638 1639 1695 1720 1735
  1736 1750 1790 1805 1806 1843 1879 1880 1910 1935 1946), out/pointing_v4/ny/final3/ (1700 1730 1790 1843 1910 1935),
  out/pointing_v4/ny/r11/ (1608 1660 1700 1730 1790 1910 1935); clips v32-v35 out/pointing_v4/ny/final3/clips/ (19:05).
  Logs: 0 errors, 0 404.
**HALF-DONE (code saved + compiling, NOT yet seen on a frame):** in `v4/sets/ny_station.ts`: (a) the near board only in
the v32 picture (`update()`: `picAt(t) === "side" ? BOARD_NEAR : NYV4.board`; r11 showed it hiding his window in the
v31 wide); (b) `gap: 0.2` on the v32 point and `gap: 0.35` on the v35 point (BEATS) so the white hand shows in the clear
before the board / sign (r11: v35's hand landed on the sign edge).
**OPEN LIST, in order (the lead's + DIRECTOR's latest messages; nothing cancelled):**
1. Stills of the half-done items: v31 1608 (conductor visible, board not in front of him), v32 1700 (hand just short of
   the board), v35 1910 (whole head + a clear arm line, the white hand against the wall / beside the sign).
2. DIRECTOR camera request: raise MY glides on v31, v32, v33, v35 from 0.09-0.19 %/frame to >= 0.25 %/frame, each ending
   in a 15-20 f rest (`NY_VIEWS` A -> B pairs + `glideRest(a, b, 20)` in `nyCam`); then write "STATION cameras done" here
   so the DIRECTOR removes his added drift.
3. Movers alive THROUGH the rests (42-64 % of my frames were held): the pigeon, a far rider, a flickering fixture, the
   train's lit windows, the sign trembling in their hands, a blink; check with draft clips of each shot's last 20 frames.
4. Keep the sign's bottom edge at or above 62 % in v33 / v35 (r11: ~61-63 %, at the edge).
5. Second cold render-ready pass: tsc 0, `retime_v4.py --no-script` checks, fresh stills (first / middle / last + every
   held pose) + whole-shot draft clips of all six shots, every 2nd frame looked at, logs read; frames list here; a
   final sheet in pointing_preview/ (current: station_v4_NY_v31-v35_DRAFT_stills.jpg, station_v4_JP_v19_DRAFT_stills.jpg).
6. Still open from before: v35's conductor is medium-small (~13 % head); v32's door glow to confirm at phone size.
**CHECK IN THE RENDER:** v19 glide speed; v31 train eases in, conductor glued to his window; v32 point -> hold -> drop
-> door glow (order obvious at speed); v33 the 2-frame sign flip; v34 no shimmer on the marker text; v35 the arm line at
final resolution, the one-frame grin swap, the hop.
**COMMANDS (Git Bash, from `<ROOT>/studio`):**
- tsc: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json`
- frames of my shots: `node ../briefs/v3/pointing/director/probe_v4.mjs | grep -E "ny_station|jp_platform"`
- stills: `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --stills 1608,1700,1910 --out out/pointing_v4/ny/next/`
- draft clips (RAM token): `RAM_ME=STATION node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --shots v19,v31,v32,v33,v34,v35 --conc 1 --out out/pointing_v4/ny/next/`
- every-2nd-frame sheet: `ffmpeg -i <clip> -vf "select='not(mod(n\,2))',scale=180:-1,tile=8x6" -frames:v 1 sheet.jpg`
- retime checks (from `<ROOT>`): `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/retime_v4.py --no-script`

## NEW PC (STATION #2, 2026-11-20 from 15:40; stills loop allowed by the owner, NO clips)
Stills: `studio/out/pointing_v4/ny/stills/draft/f<frame>.jpg` (frames move with the voice; find shots with
`node briefs/v3/pointing/director/probe_v4.mjs | grep -E "ny_station|jp_platform"`). Cues are words/events only.
- done 15:55: checked the old fixes (f1645/1715/1790): sign shot reads; "under" = two huge backs of heads; payoff saw
  the sign edge-on. Rebuilt: doors open on T_POINT + 0.45 s (no "open" word now), the board moved 0.55 m along the
  platform + yawed 35 deg (BOARD_YAW) so the platform lenses see it frontal, wide lens off the column line, medium lens
  at ~50 deg to the board, the sign turned square to the conductor on the payoff (SIGN_PAY_YAW) + a -x payoff lens.
- done 16:10: round 2 stills: v31 wide (board + conductor + riders + pigeon) OK, v32 board reads but his RIGHT arm crossed
  his face -> point beat `left: true`; v33 sign hidden behind the man -> sign 1.0 x 0.74 at z 1.25, the two at +-0.55,
  behind-right lens; v34 reads at a glance; v35 READS (he points right at the sign, both grin). Train now glides in on
  v31 (`slideIn`, 3 m/s^2). JP platform v4 entry written (`v4/sets/jp_platform.ts`: v3 builder, plan row `arrive`
  braking 4.2 m/s^2, no bag/boy/tourist, `motes: false`, two passers, two near pigeons, one pan-then-rest lens).
- done 16:35 (REAL VOICE in: v19 897-953, v31 1513-1561, v32 1561-1619, v33 1619-1690, v34 1690-1762, v35 1762-1822):
  round 3: v32 left-arm point clear of his face, board reads, doors shut at the point and open after (f1595/f1615);
  v35 reads (f1785); v34 reads; v33 had a looping walker filling a quarter of the frame; v19 saw only the car side.
  Fixed: walkers dealt per PICTURE (`START`, no wrap inside a shot), a waiting commuter + a pigeon in the v33 frame,
  hands on the sign (`restL`/`restR` from `onSign`), sign carried flat face-down then snaps up (4 f), v19 lens moved
  11 m beyond the stop point looking back at the oncoming face.
- done 16:55: rounds 4-5 looked at: v19 shows the train's face gliding in (ITV block removed by moving the lens to
  z -7.8), v31 clean, v33 carry (flat, hands on it) then sign up between them with the conductor above, v34 + v35 read.
  The STORY revision ("subway conductors must point at a striped board", v19 now 1.30 s) is followed by the word
  finders; v19's stop now = 72 % of its shot. Sheet: `pointing_preview/station_v4_NY_v31-v35_DRAFT_stills.jpg`.
- done 17:00 (owner's "no bugs" order): retime_v4.py --no-script ALL CHECKS PASS (no warning on my files). Cold read +
  pass 1 found and FIXED: (1) v32 picture chosen by a word: after the revision v32 cut on "subway" and got the WIDE
  (f1585) -> pictures now by line + shot order; (2) state switches on word times, not cuts: riders vanished + doors
  snapped shut in v32's last 3 frames, the sign swung 52 deg in v34's last 9 frames -> `cutOf` (switch half a frame
  before the cut); (3) conductor still pointing in v33's first frames -> point ends at BS; (4) line-bullet discs did
  not ride with the gliding train -> `bullets` group; (5) walkers re-dealt on raw time -> by frame (no shutter ghost);
  (6) 216x THREE "already non-indexed" warnings from kit/rail houses.ts:67 + signal.ts:77 -> guarded; (7) v19 train
  moved only 1.9 m -> stops 0.4 s after the cut at 3 m/s^2 (~4 m of glide in the shot).
  Pass 1 frames looked at (real voice 61.53 s; out/pointing_v4/ny/cold/stills/draft/): v19 840 860 879 | v31 1430 1453
  1475 | v32 1476 1515(point) 1545(doors open) 1553 | v33 1554 1570(carry) 1600(up) 1624 | v34 1625 1661 1696 |
  v35 1697 1725(point) 1750(grin) 1756. Left in the log: 21x 404 `tunnel_concrete/kit.json` (optional file, library
  tileM 2.0 used: harmless; asset folder not mine -> asked).
- done 17:05: whole-shot DRAFT clips v19 v31 v32 v33 v34 v35 (out/pointing_v4/ny/shots_test/shots/draft/), every 2nd
  frame looked at on sheets: v19 glide in reads; v31 train eases in, disc rides with it; v32 point snaps ~1510 + holds,
  doors open ~1526-1540 ONLY after it, rider steps in, no pop at the end; v33 walk-in carrying flat, flip up in 2 f
  (1584-1586), conductor between their heads; v34 steady + readable all 2.4 s; v35 no point at first, point ~1715, grin
  + hop ~1745. Found in motion + FIXED: conductor's head touching / cut by the left edge in v32 (look x 0.4 -> 0.22) and
  v35 (fov 64, look z 0.74). LOOK's hand-off: `nyLook(st.mats)` added (warm red floor, sea-green ceiling). The 404:
  tunnel_concrete was complete except its optional kit.json (the only folder of 38 without one; meta.json + library
  say tileM 2.0) -> wrote `public/kit/surfaces/tunnel_concrete/kit.json` {"tileM": 2.0}. Every surface my sets use
  exists (14 checked). Not mine, for the DIRECTOR: the first frame of v31 (1430) and v35 (1697) still shows the previous
  line's caption.
- done 17:15 COLD PASS (fresh render, nothing cached; real voice 61.53 s; out/pointing_v4/ny/cold3/stills/draft/,
  log out/pointing_v4/ny/cold3.log): FRAMES CHECKED v19 840 860 879 | v31 1430 1453 1475 | v32 1476 1515 (point held,
  doors shut) 1545 (doors open) 1553 | v33 1554 1570 (carry) 1600 (sign up) 1624 | v34 1625 1661 1696 | v35 1697 1725
  (point, deadpan) 1750 (grin, hop) 1756. All clean: sign POINT HERE / IF YOU ARE / DEAD SEXY spelt right + readable,
  board a clear black-and-white striped board, no hand over a face, no arm or head cut by an edge (v32 / v35 lens
  fixes confirmed), no see-through card, captions clear of the action, no Japanese text / logo (JP signs: digits +
  pictograms only). LOG: 0 errors, 0 404 (kit.json fixed); 4x per JP build "toNonIndexed: already non-indexed" from
  kit/surfaces/ground.ts:293 (`railTrack`, not my file; harmless; one-line guard asked of its owner). tsc 0;
  retime_v4.py ALL CHECKS PASS. Preview: pointing_preview/station_v4_NY_v31-v35_DRAFT_stills.jpg,
  pointing_preview/station_v4_JP_v19_DRAFT_stills.jpg.
- done 17:30: cold draft clips v31-v35 (out/pointing_v4/ny/shots_cold/shots/draft/, log shots_cold.log: 0 warnings,
  0 errors, 0 404), every 2nd frame looked at: all as above, the v32 / v35 lens fixes hold in motion. v19's cold clip:
  shots_test (16:52, arrival + houses fix already in). RENDER-READY from STATION's side: v19, v31, v32, v33, v34, v35.
- (superseded 18:15 by the lead's review: station dark + murky; v32 point unreadable; v33 backs; v35 tiny.)
- done 18:50 NEW LAYOUT on the final clock (2054 f = 68.47 s; v31 1577-1639, v32 1639-1736, v33 1736-1806, v34
  1806-1880, v35 1880-1947; point f1686, doors f1700-1718, flip f1765, payoff point f1898, grin f1926):
  the SIDE lenses stand down the train near the edge looking back at his window: he is side-on, medium. Board out in
  front of his window at x -0.5, y 1.25 (ON his level point line: CAST's side-on point stays level; a 2 m board got a
  point at nothing, r6/r7), turned 40 deg to the side lens, scale 0.85. Sign + the two turned the same way (SIGN_YAW
  -0.7): 3/4 faces to the side lens; they walk in from the back of the platform. v32 = ONE glide from tight on the point
  (head ~1/5) back to show his car's door opening at the right edge. Riders only in the v31 wide (in v32 they stood on
  the point line / in front of the lens). Walker lanes per picture. Exposure 3.3 -> 3.9 (LOOK told).
  Stills r6-r9: out/pointing_v4/ny/r6..r9/. v32 point now reads (arm a straight line to the striped board, head ~22 %,
  hand + board 35-57 % of the height); v33 faces visible; v35 him side-on pointing at a readable sign, both grinning.
- done 18:20: LOOK's five changes in v4/sets/ny_station.ts (nyLook(st.mats, st.object); NY_LIGHT lumens/kelvin;
  rigOpts {...NY_RIG} (my 3.9 exposure bump dropped); train selfLit NY_LIGHT.trainSelfLit, brushed steel kept, NO
  nyTrainLook; warm point light on his face riding with the train). v32 glide ends closer (head ~19 %, his door open at
  the right edge). Cold stills on the final clock: out/pointing_v4/ny/final/stills/draft/ (21 frames, log stills.log).
  Clips of all six queued behind CAST's token by scratchpad final_pass.sh -> out/pointing_v4/ny/final/clips/.
- done 18:30: final cold stills looked at (frames v19 923 946 968 | v31 1577 1608 1638 | v32 1639 1695 1720 1735 |
  v33 1736 1750 1790 1805 | v34 1806 1843 1879 | v35 1880 1910 1935 1946): bright (sky-blue ceiling, green columns,
  cream tile behind the people in v33-v35, red floor, clean steel train); v32 side-on point at the striped board (head
  ~19 %, hand + board 36-55 %, caption clear); v33 faces 3/4; v34 reads; v35 framed like v32, sign readable, grin + hop.
  Fixed: a waiting commuter stood dark mid-frame in v33's first frames (nyRiderC out of that picture). New sheets in
  pointing_preview/ (station_v4_NY_v31-v35_DRAFT_stills.jpg, station_v4_JP_v19_DRAFT_stills.jpg).
- done 18:45: six clips (out/pointing_v4/ny/final/clips/, logs clean: 0 errors, 0 404) looked at every 2nd frame:
  v32 point ~1687 held, glide smooth; v33 walk-in 3/4 + 2-frame flip 1766-1768; v34 steady; v35 point, grin + hop.
  Fixed after: a v32 walker ended under the board by his hand (side lane -> x -15); nyRiderC out of v33. CAST 18:40:
  sign to chest height (SC y 0.85; hands on its side edges below the chins: faces fully visible), the v32 point holds
  T_HOLD 1.0 s then drops and ONLY THEN the doors open (T_OPEN = point + 1.0), the v35 point holds 25 f then drops
  before the grin; v33/v34/v35 lenses re-aimed for the lower sign. CAST deleted its NY rows: this set is the one source.
- done 18:55: stills after CAST's notes (out/pointing_v4/ny/final3/stills/draft/ 1700 1730 1790 1843 1910 1935):
  faces fully above the chest-high sign in v33-v35; v32 point held, then arm down, then doors. FIXED: the payoff point
  was invisible (aimed at the sign's centre the arm fell below the sill cut) -> aim at its top line; v33/v35 lenses
  tilted so the sign's bottom edge stays at ~63-65 % (borderline, clear of the caption text). Sheet refreshed.
- done 19:10: clips v32-v35 after CAST's notes (out/pointing_v4/ny/final3/clips/shots/draft/, log clean) every 2nd
  frame: v32 point 1687-1716 held, arm down, doors open after (faint at the right edge), no walker near the board;
  v33 walk-in 3/4, flip 1766-1768, faces clear of the sign; v34 steady + readable; v35 thin arm line to the sign
  1902-1922, drop, grin + hop 1926-1942. v19 + v31 clips: out/pointing_v4/ny/final/clips/ (18:40, unchanged since).
  OPEN (honest): v32's doors read weakly against the bright steel car; v35's conductor is medium-small (~13 % head);
  the sign's bottom edge sits at ~63-65 % in v33/v35 (clear of the caption text, at the band's edge).
- done 19:20 (lead 19:15): v32 board CLOSER on the board-line day (BOARD_NEAR [-0.25, 1.25, 0.5], full size 0.9 m;
  prank day keeps NYV4.board, clear of the man), glide end look z 0.15 (the door further in frame); the DOOR READS: a
  warm lit BackSide box inside his car behind its door (`doorGlowM`, dim shut -> warm 1.6x as the leaves slide, rides
  with the train); v35 lens look z 0.32 + fov 64 (his head + arm inside the frame), v33/v35 look lower (sign bottom
  >= 62 % target). tsc 0 on the whole project (CAST / TRAIN mid-edit errors gone).
- next: r11 stills (1608 1660 1700 1730 1790 1910 1935), then the second cold pass + clips of all six + sheet.

**ASKED OF OTHER OWNERS (through the lead):**
- CAST: (a) the set plays its OWN word-cued beats for ny_conductor / prankA / prankB (`BEATS` in v4/sets/ny_station.ts:
  board point on "point" with `left: true`, payoff point on "conductors", grin on the payoff's "point"); CAST's
  beats_v4.ts NY rows (@v32+4 ...) are not used: say if you want them merged. (b) the two hold the sign through
  `restL` / `restR` (world points on the sign's back, `HANDS`): check the hands land on its edges and the arms do not
  cross a face. (c) the board point is a raised index finger: is the thumb visible (no back-of-hand single finger)?
  (d) the conductor reads as an old man with glasses: brief says navy uniform, no gloves (collar reads navy: OK?).
- LOOK: the NY car reads dark green with red blobs, not a lit stainless car; the NY ceiling + floor are brown / grey
  (beige-grey share); v19 platform floor is terracotta (reads warm, good).
- TRAIN: v19's train is the v3 builder's trainJP on plan row `V4_PLAN_ROWS.arrive` in v4/sets/jp_platform.ts
  (arriveAt 1.25 s, arriveDec 4.2 m/s^2, doors shut in the shot): change the numbers there or tell STATION.
- DIRECTOR: SHOT_TABLE_v4.md v32 still says "before the doors open" / [open#1]: the doors now open 0.45 s after the
  point (set event, `T_OPEN`). v19 + v31..v35 cameras are the set's `CAMS` (one per picture, glide then 20 f rest).

**CHECK IN THE RENDER (only motion can show these; for the owner's renders on the other PC):**
1. v19: the train's face glides in and stops (arrive braking 4.2 m/s^2, stop 1.25 s into the shot) without looking like a
   slide; the LED chevrons run; the two passers walk in depth; the pan lands and rests.
2. v31: the NY train's last metres (3 m/s^2, stop ~1.3 s after the line starts) read as arriving; the conductor card
   stays glued to his window while it moves.
3. v32: the point SNAPS on "point" and holds; the doors start 0.45 s later and slide 0.6 s; the riders step in after
   (order point -> doors must be obvious at speed).
4. v33: the two walk in carrying the sign flat; the 4-frame flip up reads as "turned it up", not a pop; their hands stay
   on the sign during the carry and the flip.
5. v34: the sign steady and readable in under a second (marker text at final quality, no shimmer); the 80 -> 76 fov push
   gentle.
6. v35: the deadpan -> grin swap on one frame; the two hop (14 f) and the sign bobs 4 cm on the grin; his arm still.
7. Every NY shot: flickering tube, drip, walkers re-dealt at cuts (no pop inside a shot), pigeons pecking.

## V4 HANDOVER (STATION, 2026-11-20 ~09:05: laptop shut down, the project moves to another PC)
State: every file whole and compiling (`npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` exit 0 after the last
save). Nothing of mine running; no RAM token, no stills slot held (an `out/.stills_slots/slot1` dir was present at
shutdown and is NOT mine: if stale on the new PC, delete it).

**Built for the New York lines (SCRIPT_v4 locked lines 19-21; shots v31-v35 on the v4 clock):**
- `studio/src/videos3/pointing/v4/sets/ny_station.ts`: a real v4 build (no longer the v3 re-export). Uses kit/subway
  (`nyStation`, `nyTrain`, `LocalEnv`, `stutter`, `drips`) + CAST (`ny_conductor`, `prankA` = the man, `prankB` = the
  woman, NY crowd ids as commuters, the `pigeon` card). The three lines are found by their WORDS in `TOKS` (board line =
  "conductors"+"board", sign line = "sexy", payoff = the next line with "conductors"+"point"), so any re-time or line
  renumbering follows. Events: the conductor's point snaps on "point" (board line) and holds; the doors open only after
  it (`T_OPEN`); the two walk in under the board at the sign line's start; the sign is big from the sign's own words;
  payoff: he points at the sign (deadpan) from "conductors", grin + the two hop on "point". The cardboard sign is OUR
  canvas texture (POINT HERE / IF YOU ARE / DEAD SEXY, each line fitted to 88 % of the width). Coloured line-bullet discs
  on the car sides (no letters). No dust motes. Exports `build`, `CAMS`, `NYV4` (marks), `NY_VIEWS` (cameras).
- CAMERAS: one per PICTURE, chosen by the shot's start time (`pictureOf`): `wide` (v31), `medium` (conductor + board,
  v32), `under` (the two walk in, v33), `sign` (frontal from the platform edge on the train side, the sign big, v34),
  `payoff` (side-on: he points at the sign, the two beyond, v35). Each = `camkit.glideRest(a, b, 20)`. `CAMS` is keyed by
  every SHOT_PLAN id on set ny_station ("vNN" and "v4_vNN").
- LIGHT BUDGET (never exceed: 18 lights hung the D3D11 shader compile before): kit/subway/station.ts (LOOK's v2) = every
  lamp fixture GLOW-ONLY (emissive, no light) + ONE long rect light per fixture row + the failing tube + 2 shadowed key
  spots; this set adds exactly ONE window-spill rect (size [8, 0.85]). Never add a light per prop or per fixture.
- SHOT_TABLE_v4.md rows (regenerated by the director): v31 "New York copied the pointing:" (1628-1675), v32 "conductors
  must point at this board before the doors open." (1675-1771), v33 "So two New Yorkers held up a sign:" (1771-1842),
  v34 "Point here if you are dead sexy." (1842-1914), v35 "And the conductors had to point." (1914-1974), on the PLAN
  words (they move with the real voice).

**Looked at:** one round of draft stills (08:35, `studio/out/pointing_v4/ny/stills/draft/f1640 .. f1965.jpg`, rows
`../rowA.jpg`, `../rowB.jpg`). Found and FIXED in code afterwards, NOT yet re-rendered: the two New Yorkers showed
during the board line (window bug: now `inBoard` / `inPrank` split at the sign line's start); a green column filled the
`under` lens (moved); the sign text ran off its edges and sat in the caption band (refitted, sign smaller and higher,
lens re-aimed); the payoff lens had the woman's back filling half the frame and no visible point (new side-on lens, aim
at the sign's top); a walker brushed the wide lens (lanes moved). Seen OK: the sign shot reads big; the wide shows the
train + conductor + board + pigeons.

**Next steps, in order:**
1. Draft stills again (frames move with the voice; on the plan: v31 1640, 1668; v32 1700, 1745, 1768; v33 1785, 1835;
   v34 1860, 1905; v35 1925, 1965):
   `cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --stills 1640,1668,1700,1745,1768,1785,1835,1860,1905,1925,1965 --conc 1 --out out/pointing_v4/ny/`
   (current frames: `node briefs/v3/pointing/director/probe_v4.mjs | grep ny_station`).
2. Check: the point lands on the board in v32 and the doors open only after it; the sign fully readable and above
   y 64 % in v34; the conductor side-on pointing at the sign, deadpan then grin, in v35; heads <= 1/4 of the frame;
   >= 3 movers per shot; captions clear (keep-out y 1260-1440).
3. Tell CAST the poses still needed: the two HOLDING the sign up with both hands (today their arms are hidden behind it),
   a small cheer; the conductor's side-on point UP at the board and forward-down at the sign from inside the window
   (check his arm is not cut by `cutY`). Tell LOOK: the train reads dark green with red blobs, not a lit stainless car;
   the station measured vivid 2-4 % (LOOK owns materials and light).
4. A short draft clip of v31-v35 (`--frames <v31 start>-<v35 end>`; kit_render takes the RAM token) and the gate:
   `tools/v3/qa_gates.py <clip> --shots=<json> --no-loop`.
5. FINAL stills to `pointing_preview/NY_v4_1.jpg ..` (one per picture): `kit_render ... --quality final --stills ...`.

**Paths outside the project folder:** none in the code. My measuring helpers lived in this session's scratchpad
(`sbgate.py`, `proj.py`, `col.py`: gone with the laptop). `tools/v3/qa_gates.py` reads
`C:/Users/utkar/research_notes/ricksclips/look/scripts/look_metrics.py` (its LM_PATH).

## HANDOVER 2026-11-20 01:55 IST (4th STATION owner -> the next one)
State: every file saved and compiling (`npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` exit 0 after every edit,
last at ~01:40 after the bagDz save). `SCRIPT = "v3"`. The REAL voice is in (words.ts, 135 words, 1912 f = 63.73 s): every time of this set
follows it by itself (plan + cameras read timeline.ts; `payoffAccel()` re-solves the frame-0 chain for the new L).
Temporary frames deleted except the storyboard stills `out/kit_rail_v3/f/` (f_00 .. f_45, the CURRENT storyboard on the
real clock; f_00 / f_43 .. f_45 already show bagDz 0.77) and `final/F_1.jpg`, `F_10.jpg`. No RAM token, no stills
slot held. The lead asked (01:45) for NO saves to the two set files while the director renders hook A / B.

**(1) Done this round AND looked at on a draft still (true-time storyboard `KitRailV3`, 46 samples, real voice)**
- Opened the previous owner's unopened stills: `final/F_10.jpg` (1.4 s: the suitcase has left the frame, his arm still
  out, the car streams past: reads), `chk/d_67.jpg` (s14: the boy's whole face, his point lands on the suitcase; his
  other hand is at his MOUTH: CAST), `chk/d_73.jpg` (s15 at 70 %: face to the lens, double point, but the boy's cap +
  head filled the lower right: fixed below).
- **Door marks** (kit/rail `tokyo_platform.ts` `DOOR_MARK_COL` = `#4a6458`, a worn dull green): the saturated green
  under his feet in frame 0 is gone (frame 0's saturated-green area 3.6 % -> 1.3 %, the rest is TRAIN's emerald band).
  Every platform shot is quieter at the bottom.
- **s07 people step off** (plan `leavers`, new): two commuters (crowd cards `suitB`, `studentB`, real walk cycle) stand
  inside the door, step off as the doors are half open, walk toward the lens and peel off toward the cab end; the
  suitcase trundles after them. The boy + mum stand a step deeper on the cab-end side in s07 (out of the lane).
- **s09 / s22 (S-9 first half)**: the boy (+ mum behind him) now stands 0.22 m behind the LEADING door glass
  (`KID_GLASS`): from the knee-high three-quarter lens he stays inside the leading window for the whole truck; s09 also
  moves the tourist to just behind the suitcase, so the plant shows all three behind the glass (boy + mum | tourist +
  bag). Seen on f_13 .. f_15, f_36 .. f_38.
- **s23 (S-9, S-16)**: the lens STARTS 3.5 m from the glass (boy's face ~19-20 % of the frame height on "Bag...", both
  windows filling the frame), pulls back linearly to 6.3 m by 55 % of the shot (his whole head in at the left on
  "check!", the boy ~12-15 %), then drifts. In a 9:16 frame that holds his head AND both windows the boy cannot be more
  than ~12 % (geometry, section 8). The boy is 0.4 m behind the glass. f_39 .. f_42.
- **s15 (S-11 / S-7)**: he is turned to the lens from the FIRST frame (`TURN15`, yaw 1.42), face ~19 % in the upper
  half, eyes go to the lower left (the suitcase) on the look sample; turns back over the last 0.45 s. The boy shuffles
  with the lens slide (`kidEdge`) so his cap never enters. f_25 .. f_27.
- **s18 (S-12)**: NOT his back any more: a new lens low in the car behind the suitcase (yellow big lower left), he
  beyond the doorway in three-quarter giggling into his phone, the boy in profile at the right looking at him. f_33.
- **s20 (S-13)**: his back (the one allowed), the boy moved nearer the frame edge than s15 (his arm should reach in;
  NOT yet confirmed on a still after the last move to z 3.08 -> 2.82).
- **s11 + s12 (S-14)**: s11 is now a standing-height ARC from the cab-end side (the doorway in three-quarter: the boy,
  the bag and he all through the opening; he walks away from the lens); s12 is LOW (0.55 m) and close on the suitcase
  (~45-50 % of the frame height), the boy's worried face beyond. f_16 .. f_20. s07 / s08 unchanged.
- **Cameras**: own moves on every platform shot >= 0.25 %/f (no director layer on any platform shot; the layer is only
  on s04, TRAIN's). `node briefs/v3/pointing/director/probe.mjs cams` at ~01:20: FILM 0.568 %/f, 65-71 % of the time in
  shots >= 0.5, nothing under 0.15. Own: s01 0.93, s07 0.58, s08 0.58, s09 0.53, s11 0.41, s12 0.34, s13 0.41,
  s14 0.89, s15 0.29, s16a 0.55, s16b 0.70, s18 0.29, s20 0.36, s22 0.53, s23 1.45 (peak 2.5), s24 0.59 (peak 0.69).

- **FRAME 0 (S-15)**: `V3M.frame0.bagDz` 0.62 -> 0.77 (his mark z 3.42 -> 3.57): ~0.1 frame width of clear space
  between his shoulder and the suitcase's near edge. FINAL stills (real voice, CAST's new cross-chest LEFT arm):
  `out/kit_rail_v3/final/F_1.jpg` (frame 0) + `F_10.jpg` (1.4 s), copies in `pointing_preview/look_platform_1_*` and
  `look_platform_1b_*`. Frame 0: the suitcase whole above the sill, mid-left, clear of the edge, 4.9 % of the frame
  (the cap 2.8 %), his fingertip at its near top corner, nothing but his legs + phone in the caption band.
- **MOVING picture, seen as frame strips** (film `PointingKit` draft clips of frames 1706-1911 = s22-s24 and 0-80 = s01,
  director layer included; clips deleted after looking): the doors shut on the bag, the side lamps, the glide, the
  train's gentle payoff acceleration; s23 starts big on the boy, his head enters by "check!"; s24 -> s01 is ONE
  continuous picture (the last 7 frames of s24 and the first 8 of s01: same lens, same size, the window keeps sliding
  left, the arm lands). Two things move wrongly, both CAST: (a) frames ~53-61 of s01 the whole tourist card jumps up
  ~10 % of the frame height and back in 0.3 s (around "is not."/ the blink); (b) his face snaps from s24's half-lidded
  "flat" to frame 0's wide eyes across the seam (the script's two expressions, but a snap in a continuous shot).

**(2) Done, NOT yet looked at**: s20 after the last boy move (z 3.08 -> 2.82); s11's ARC version after the last
speed fix is on the storyboard (f_16 .. f_18) but s18 / s12 / s11 were never seen MOVING; s07's leavers only as stills.

**(1b) Follow-up 02:00-02:35 (saved whole, film tsc 0 after each save)**
- Suitcase `interior: true` (reflects the car, not the sky). With TRAIN's / CAST's 02:00 saves, FINAL frame 0
  (`final/F_1.jpg`, also in pointing_preview): the WHOLE case behind the lowered glass, 5.8 % of the frame vs the brick
  cap 2.6 %, value 0.97 vs 0.75, chroma 0.54 vs 0.65. Seam (film draft, s24's last 7 -> s01's first 8): continuous.
- T-16 s08: plan `bag.tilt` (new Mark field, suitcase `tilt`): rolls out, swivels +0.85 rad, leans 0.3 rad, the lean
  PEAKS on `S("saves")`, yanked back saves+5 f .. +14 f (CAST's grip cue). Draft still `chk/s08_34.jpg`: reads.
- S-17 s11: the arc aims at y 0.47: the suitcase sits at ~35-60 % (above the caption keep-out 65.6-75 %).
- S-13 s20: a LOW lens (0.55 m): the bag big lower left, the boy's arm at mid height, his cap above the frame.
- s15: the boy back at the edge (3.0 -> 2.7): nearer, his cap brim was ~25 % of the frame and the arm sat under the
  caption band; the shot's beat is his face. The suitcase is at his LOWER-LEFT on screen (CAST's gaze is right).

**(1c) Block 14 fix round 03:15-03:40 (after the first full preview; the gate measures the RENDERED picture)**
- Measure like the gate: `scratchpad`-style script = look_metrics `sim_fit` (on-screen camera %/f) + `local_motion`
  (life) + `lab_stats` (L*) on the storyboard's consecutive frames 3k+1 -> 3k+2 (calibrated: s14 0.70 vs gate 0.57,
  s18 1.36 vs 1.46, s16b 0.56 vs 0.59). The probe (`camSpeedStats`) does NOT predict the screen: an arc round the look
  point keeps the subject still (gate ~0.2 where the probe said 0.5); a pure truck reads on screen but the probe
  calls it ~0.15 (and the director's layer then adds its own move): use a truck WITH a little pan or a fov change.
- Exposure: JP_RIG `bag` exposure 0.8, `frame0` 0.76, `wide` 0.84, `west` 0.88, all with skyLevel 0.22-0.26 and bgK
  0.68-0.75 (the white car mirrors the sky): storyboard L* 50-61 (was 63-67 in the preview gate).
- On-screen camera (storyboard, before the last s20 / s24 tweak): s07 0.83, s08 0.67, s09 0.72, s11 0.71, s12 0.72,
  s13 0.50, s15 0.50, s16a 0.56, s20 1.45, s22 0.53, s23 1.56 (was 2.27), s24 0.47 (orbit then raised 4.6 -> 5.6 deg/s).
- s07: the leavers step off the LEADING side and turn to the cab end at once (the suitcase clear in the trailing half).
- LIFE: plan `passers` (straight walks): s09 a commuter toward the knee-high lens; s12 a passenger in car 1's aisle;
  s13 two (one along the edge behind him, one up the far side); s16a two beyond him on his left (not over the doorway).
- s20: the boy further aside (`kidEdge` 3.1 -> 2.55): the tourist's back, the bag big left, the boy's ARM in from the
  right at mid height; slide + pan + fov 30 -> 26.5 (probe 0.37, own move: no director layer).

**(3) Open**
- S-15 (frame 0): the suitcase is whole above the sill, mid-frame, larger in area than the cap (4.6 % vs 3.0 % of the
  frame) but the CAP still wins the eye: chroma 0.79 (sat 0.86) vs the bag 0.56 (sat 0.59, it reads pastel behind the
  glass in the low sun). Not fixable in this set without hiding his face: requests to CAST (cap tone) and TRAIN (bag
  colour, glass, sill). "Fingertip just short of the bag" was tried (aim `bagNear`): the card arm BENDS at his chest
  (the arm is ~0.2 m), reverted to `aim: "bag"` (straight arm, hand over the bag's top).
- The arm crossing his chest over NEW YORK: CAST (which arm points / how it is drawn), not a set setting.
- s15: his expression on the look is a grin, not the blank 0.7 s look (CAST beat timing).

**(4) Traps** (unchanged from the last owner, plus two)
- Patch files with the Write tool or ONE python script; run the film tsc after every edit (a broken set file stops
  every owner's renders: the lead's rule since 00:50).
- A `Monitor` / until-loop that waits for `f_45.jpg` fires at once if the OLD stills are still there: wait for the
  job's own exit line instead.
- Frame 0 is a chain: `run0` -> `bagDz` -> his z -> `xs`; change one and re-look at the seam frames. Keep camera moves
  linear (`slide`, `arc`); the director's layer returns on any shot under 0.25 %/f by CORE's camSpeedStats (a slide that
  keeps the look point on the subject can measure ~0.2 even with 1.5 m of travel: use `arc`).
- In s23 he stands 1 m nearer the cab end than in s24 (on purpose).

Status 2026-11-20 00:25 IST (3rd STATION owner): **script v3 is LIVE on this set** (`SCRIPT = "v3"`). The 16 platform
shots have their v3 cameras and plan, every time comes from the film's clock (`videos3/pointing/timeline.ts`), and the
whole run was looked at twice as a TRUE-TIME draft storyboard with CAST's real acting (42 film frames, section 3):
`studio/out/kit_rail_v3/f/` (`f_00` .. `f_41`, strips `strip_00` .. `strip_06`). Camera speeds measured with CORE's
`camSpeedStats` (section 2, the shot table): no platform shot under 0.25 %/frame, the film's duration-weighted median
0.56. Typecheck clean for this owner's files. Earlier stills (the place itself, before v3): `studio/out/kit_rail/f2/`
(final, every scout framing), `out/kit_rail/final/`, `out/kit_rail/lite/` (the treadmill's station). Honest gaps: section 8.

| file | what |
|---|---|
| `tokyo_platform.ts` | **the Tokyo island platform as ONE reusable part** + its layout marks `TP` (new) |
| `furniture.ts` | kiosk, LED departure board, door marks, stop marker, column kit, poster stands, light poles (new) |
| `vending.ts` | K-P7 the drinks vending machine with a real display case (new) |
| `station.ts` | island (hero / lite), canopy K-P10, benches K-P8, bins K-P9, ITV K-P11, clock, pictogram boards, stair well |
| `lineside.ts` | K-K2 the treadmill world (`lineside`, `odometer`) |
| `track.ts` `ocs.ts` `signal.ts` `poles.ts` `houses.ts` | track, overhead line K-P5, signal K-P4, utility poles K-P26, houses |
| `util.ts` | merged parts, materials, canvas textures, thin wires, cloth |
| film: `videos3/pointing/sets/jp_platform.ts` + `.cams.ts` | the set (plan table, light presets) + its cameras (v2 and v3) |
| sandbox: `sandboxes/kit_rail/` | `KitRail` = the location scout (20 framings), `KitRailV3` = the v3 platform storyboard |

## 1. The place (hero frame, metres)
Platform top y = 0. Our emerald train stands on track 1 (centre x = +1.55, rail top y = -1.1) with its NOSE at z = 0,
the cars toward +Z, heading -Z. The island runs from x = 0 (the track-1 edge) to x = -9 (the track-2 edge, track 2 at
x = -10.55), z = -14 (the cab end) .. +206. **Seen from the platform the train leaves toward SCREEN LEFT** (the platform
is on the train's left = the driver's side, as the bible fixed it).
- **The cab end (z < 9.5) is open to the sky**: full low sun on car 1's front door (z = 3.6, THE BAG'S DOOR), on whoever
  stands at the edge and on the vending corner. The canopy covers z = 9.5 .. 146 (clear polycarbonate bays = sun stripes).
- **The vending corner**: a steel-panel kiosk (x -5.3 .. -3.18, z 8.1 .. 12.3) with two machines under its awning on the
  cab-end wall, fronts at z = 7.3 facing -Z (white at x -3.72, red at x -4.76). A customer faces +Z, so car 1's front
  door and the bag are ~5 m behind his right shoulder: a lens at the red machine's west corner sees him on the left and
  the open doorway + the bag on the right (`V3M.vend`).
- Also there: door marks at every door (car . door digits, arrows, queue lines), the driver's stop marker (a "10"
  diamond at the nose), two light poles (one with the platform-number board), the ITV monitor at the tip, LED departure
  boards (digits, a running chevron row), clocks (17:32 + film time), pictogram boards, column plates + emergency-stop
  boxes + horn speakers, poster stands (pictures only), benches, recycling bins, a stair well, end railings.
- The world: track 1 + 2 with ballast, sleepers, rails, stains, weeds; overhead-line portals every 50 m (shifted so no
  mast shadow crosses the hero corner), ONE green starting signal 48 m beyond the nose, troughs, fences, a grassy bank,
  roads, utility poles with sagging wires, houses (2 floors and 16 m back on the sun side, blocks up to 4 floors with
  laundry on the other), bushes, a tree per 200 m.
- No Japanese text anywhere: pictograms, digits and arrows only. No platform doors. No logos.
- **The yellow suitcase is the only yellow of its kind**: the tactile rows are a worn ochre (sat 0.42) and sit low in a
  doorway frame; the stop marker is white on black, emergency boxes are grey with a red button, LED digits are amber /
  green / red, bench seats blue + pale grey, pole guards dulled. (TRAIN's yellow door-edge strips and threshold line
  inside the car are the remaining yellows next to the bag: see Requests.)

## 2. The film set: `sets/jp_platform.ts`
`build_jp_platform` (the film's SetBuilder) = `buildPlatform(ctx, { table: SHOT_TABLE })`. Sandboxes call
`buildPlatform(ctx, { table, plan })` with their own shot table + plan.

### The plan table (the script can change without touching the builder)
What happens in each shot is `PLATFORM_PLAN[shotId]`; **a shot that is not in the table gets the DWELL state** (the
train stands with its left doors open, the bag in car 1's front doorway, the boy beside it, the tourist 2 m from the
door with his back to it).
```ts
type PlanRow = {
  seamOf?: string;     // THE LOOP SEAM: this shot IS that shot's set-up, earlier (its last frame is followed by that shot's first frame): s24 = { seamOf: "s01" }
  train?: "dwell" | "arrive" | "depart" | "roll" | "gone";
  arriveAt?: number;   // arrive: s after the shot start when it comes to rest (default 1.0; negative = it already stands)
  doorsAt?: number;    // arrive: s after the shot start when the doors start to open (default 0.5 s after the stop); they take 1.5 s
  departAt?: number;   // depart: s after the shot start when it starts to roll (default 1.0; NEGATIVE = already rolling)
  accel?: number;      // depart: m/s^2 (default 0.8; the payoff train uses payoffAccel() = ~0.12, see below)
  hold?: number;       // depart: s between the leaves meeting and the first roll (default 0.12); the leaves take DOOR_CLOSE_S (1.3 s, timeline.ts)
  pass?: boolean; passAt?: number;      // the orange train passes on track 2 (built only when a row asks for it)
  tourist?: Mark | false;               // where he stands (false = not on the platform)
  bag?: boolean | Mark; kid?: boolean | Mark;   // true = JP.bag / JP.kid in the doorway; a Mark = their own (always riding the train)
  mum?: boolean | Mark;                 // the boy's mum: behind his shoulder by default (JP.mumOff), her own Mark, or false
  late?: boolean;                       // the late salaryman (CAST's crowd card) is on the platform in this shot (s09 only)
};
type Mark = { pos: V3 | ((u) => V3); yaw?: number | ((u) => number); aim?: V3 | null | "bag" | ((u) => V3); ride?: boolean };   // u = s since the shot start
```
- `roll` continues the depart shot before it. **A `roll` shot with NO depart shot before it continues the film's LAST
  depart shot one film length earlier** = the loop: `s01: { train: "roll" }` is the payoff train at film time + L.
  `gone` puts the tail 300 m down the line (the contact wire rings).
- `seamOf` rows play their target row shifted so that their END is the target's START (train, doors, every mark at
  u < 0): the last shot and shot 1 are one continuous picture for any film length.
- `aim: "bag"` = the suitcase's handle wherever the train has taken it (frame 0: his arm follows it away).
- `ride: true` = the mark is ON the train (the tourist behind the door glass in THE PLANT); positions are always written
  in platform coordinates for the standing train.
- State switches by FRAME, not by raw time (the pipeline's shutter is centred on the frame: on the first frame of a shot
  half the sub-frames sample times before the cut; switching by `t >= shotStart` ghosts the old state into that frame).

### Script v3 on this set (the plan + the cameras; everything from the clock)
`PLATFORM_PLAN_V3` (sets/jp_platform.ts) and `CAMS_jp_platform_v3` (sets/jp_platform.cams.ts) import
`videos3/pointing/timeline.ts` at top level: `cutS / cutE`, the events `EV` (`stopA`, `chimeA`, `doorsMeetA`, `glideA`,
`arriveB`, `doorsOpenB`, `chimeB`, `doorsMeetB`, `glideB`, `look0`, `focusToBag`, `focusBack`), words (`S("saves")`,
`E("it#1")`, `S("stay")`, `S("right#1")`, `S("suitcase#1")`, `E("off")`), `DOOR_CLOSE_S` and `L`. No typed film seconds
are left; when the voice lands the plan and the cameras move with it (seen tonight: the table re-timed while I worked).

**THE PAYOFF TRAIN is ONE motion** through s22 -> s23 -> s24 -> (the loop) -> s01: it starts to glide at `EV.glideB`
with a gentle constant acceleration `payoffAccel()` = 2 x run0 / (L - EV.glideB)^2 (about 0.12 m/s^2; `payoffRun(t)` in
the cams file, used by the set AND by the cameras that track the door window), chosen so that it has run exactly
`V3M.frame0.run0` (1.1 m) when the film loops: **the suitcase is at his fingertip on frame 0 for any voice timing.**
A real 0.8 m/s^2 would take the door window across the frame-0 lens in 0.3 s.

| shot | what the set does | the lens (all LINEAR moves: an eased move stands still at the cuts) | %/f |
|---|---|---|---|
| s01 + s24 | ONE set-up across the seam. He stands at `V3M.frame0.tourist` on the right half, `aim: "bag"`; the door window passes behind him in s24, the suitcase is at his fingertip on frame 0 and out of frame by ~1.2 s | `frame0Cam(tau)`: fov 21 from 5.5 m, 1.5 m high, looking a little down; dollies in 0.57 m/s (his face 16 % -> 19 % on frame 0 -> 28 %) and slides toward the cab end with the window 3.2 deg/s round him, square on to the car exactly on frame 0. Frame 0: face at 31 % from the top, fingertip on the handle at 43 %, the yellow 47-65 % (above the caption band 67-75 %) | 0.93 / 0.59 |
| s07 | station A: stops (`EV.stopA`), doors open, the bag trundles to the threshold on "His suitcase tries to get off" | the doorway from the platform, framed below the door header: arc 20 deg + ease in | 0.56 |
| s08 | he lunges on "saves", hauls it in after "it" | the cut-in: arc 25 deg the other way | 0.58 |
| s09 | THE PLANT: doors on `EV.chimeA`, meet, the call, glide `EV.glideA`; the late salaryman stops short | `plantV3`: knee-high three-quarter onto the door, a 1.95 m truck toward the cab end + pan | 0.53 |
| s11 | station B: stops, doors (`EV.doorsOpenB`), he wheels the bag in place, pats on "Stay.", hops out on "right", walks to his spot | the doorway again: arc 22 deg, easing back | 0.56 |
| s12 | the bag alone, the boy, mum behind his shoulder | cut-in: arc 14 deg + push | 0.55 |
| s13 | he at `V3M.vend.tourist` (2.3 m from the bag, his back to it), `aim` = the white machine | the lens between him and the machines looking back: he left, the doorway + bag + boy + mum right; a 20 deg arc | 0.43 |
| s14 | the boy's urgent point | tight: push + arc; the boy's whole face, his arm, the suitcase's near half + handle | 0.95 |
| s15 | he TURNS to the lens in the first 0.4 s (`EV.look0`), looks straight at it (= the suitcase), the double point, turns back in the last 0.45 s (the set turns his body: a card cannot turn its head that far). The boy and mum step to the cab-end side (`KID_ASIDE`, `MUM_ASIDE`) | from inside car 1 through the open doorway (fov 29): the suitcase lower left, the boy's cap brim / hand lower right, he in the middle (face ~15 %), the red drinks machine behind him; slide 0.47 m + creep + tilt | 0.30 |
| s16a | at his spot, phone up | the slow orbit (21 deg, 55 -> 49 deg lens): he left, the doorway closing in on his shoulder; focus to the doorway on `EV.focusToBag`, back on `EV.focusBack` | 0.55 |
| s16b | the finger wiggle | the same orbit going on (17 deg), the lens 1.3x tighter: the suitcase over his shoulder | 0.63 |
| s18, s20 | his BACK, shoulders shaking; s20 the boy's arm comes in from the right and points at the suitcase | s15's lens, a little wider / a slow push | 0.26 / 0.34 |
| s22 | THE PAYOFF: s09's lens exactly; he stands where frame 0 will find him, his back to the train; doors on `EV.chimeB`, glide `EV.glideB` | `plantV3` | 0.54 |
| s23 | THE BOY'S SHOT: he stands `V3M.s23Lead` (0.5 m) ahead of where the boy's window ends the shot | fov 34 square on the door glass (the boy's window + the suitcase's window fill the frame), tracking the windows while it pulls back 2 m, fast at first: his head comes in at the left edge, whole from about the middle of the shot | 1.05 (peak 1.9) |
Measure without rendering: `node tools/v3/cam_speed.mjs --film studio/src/sandboxes/kit_rail/v3cams.ts` (this set's
cameras alone) or `node briefs/v3/pointing/director/probe.mjs cams` (the whole film).

### The script switch (ONE word)
`sets/jp_platform.cams.ts`: `export const SCRIPT = "v3" as "v2" | "v3"` (v3 since 2026-11-19 23:05). It selects the
cameras AND the plan; `"v2"` = the old bible-v2 table (cameras s07 s08 s09 s14 s18 s20 s21 s22, `PLATFORM_PLAN_V2`),
kept only so the old table still builds. The v3 keys exist as `s07` and as `v3_s07`. s15 / s18 / s20 (from inside the
doorway) are shot in THIS set (the lens stands inside car 1's hero interior), not in the `car` set.

### The light (`JP_RIG`, rigOpts over `golden`)
| preset | for | values |
|---|---|---|
| `JP_RIG.wide` (= the set's own `hints.rigOpts`) | platform wides | fog 0.003, haze 0.0008, warmth 1.3, exposure 0.93 |
| `JP_RIG.bag` | every shot where the yellow suitcase is the focal point | sunAz 66, sunEl 16, fog 0.003, haze 0.0006, warmth 0.8 |
| `JP_RIG.frame0` | the film's frame 0 + last shot | sunAz 68, sunEl 15, fog 0.003, haze 0.0004, warmth 0.8 |
| `JP_RIG.west` | lenses that look across track 2 into the low sun | fog 0.003, haze 0.0003, warmth 0.6, exposure 0.93 |
The shot table must carry `rigOpts: JP_RIG.bag` / `.frame0` for those shots (the set hint is the warm wide look).
The sun must stay south of west for platform shots (sunAz 60-75): it lights the car side, the doorway and faces at
the edge from three-quarter front for lenses that look east. A sun north of west (sunAz > 95) leaves the stainless car
side grey (it mirrors empty sky): tried, rejected. golden's own fog (0.0068) hides the signal at 50 m: the set lowers it.

### Marks
`JP` (sets/jp_platform.ts): `door1Z` 3.6, `doorway`, `bag`, `kid`, `vend`, `vendFront`, `driverSeat`, `cabWindow`, `itv`,
`signal` (the lit green lamp), `tactileX`, `canopyX`, `canopyZ0`. `TP` (kit/rail/tokyo_platform.ts) = the layout itself.
`V3M` (sets/jp_platform.cams.ts) = the v3 set-ups: `bag` [0.32, 0.03, 3.9] (= `JP.bag`, close behind the door glass),
`frame0` (`run0` 1.1, `bagDz` 0.62, `tourist` [-1.3, 0, 3.42], lens numbers, `lastLen` / `firstLen` from the clock),
`s23Lead`, `vend` (`tourist` [-1.9, 0, 4.6], `yaw`, `machine`), `inside` (the lens in car 1). `JP.kid` [0.6, 0.03, 3.34]
(the leading half of the doorway = the leading door window), `JP.mumOff` [0.32, 0, -0.22] (behind his shoulder: her
face shows above his cap, in the same door window when the doors are shut).

## 3. The location scout + the TRUE-TIME v3 storyboard (`sandboxes/kit_rail`)
```
cd studio
node scripts/kit_render.mjs --entry src/sandboxes/kit_rail/index.ts --comp KitRail --quality draft --frames 0-89 --conc 1 --out out/kit_rail/
node scripts/kit_render.mjs --entry src/sandboxes/kit_rail/index.ts --comp KitRailV3 --quality draft --frames 0-125 --conc 1 --keep-browser-logs --out out/kit_rail_v3/
ffmpeg -i out/kit_rail_v3/test/draft_0-125.mp4 -vf "select='eq(mod(n\,3)\,1)'" -fps_mode vfr -start_number 0 -q:v 2 out/kit_rail_v3/f/f_%02d.jpg
```
`KitRailV3` (v3.ts) = **the storyboard of the film's platform shots at their real film times, from ONE set build**
(about 3 min at draft): it builds the set with the film's own shot table and plan, and remaps time so that sample k
(sandbox frames 3k .. 3k + 2) shows film frames F - 1, F, F + 1: the still (frame 3k + 1) is film frame F exactly,
with the train, the doors and CAST's acting at that moment and real motion blur. Which frames: the `WHERE` table in
v3.ts (fractions of a shot or "f<n>"); the page log prints the list ("[kit_rail_v3] samples: 0:s01_f0@0 ..."). It uses
this set's own cameras (no director layer, no other set), so it keeps working while other owners' files are mid-edit.
Single stills: `ENTRY=src/sandboxes/kit_rail/index.ts COMP=KitRailV3 [PROPS='{"kit":{"quality":"final"}}'] bash
scripts/stills_locked.sh out/kit_rail_v3/chk/d_ <3k+1,...> 1` (frame 1 = the film's frame 0).
`KitRail` (film.ts) = the LOCATION SCOUT: 20 framings of the place, 3 frames each (the still = frame 3k + 1), then a
24-frame real shot ("run", frames 60-83, the cost probe), then the treadmill's lite station from a stopped cab's eye
(frames 84-89). `v3cams.ts` = this set's v3 cameras as a bare film for `tools/v3/cam_speed.mjs --film`.

## 4. The reusable parts
```ts
import { tokyoPlatform, TP, trainDoorsZ } from "kit/rail/tokyo_platform";
const tp = await tokyoPlatform(ctx, { hero: true, lens, cars: 10 });   // hero: displaced world-space slabs (must not move)
set.add(tp.object);  // update: tp.update(t) (vending LEDs, ITV, clocks, LED boards)
// hero: false = the same place with metre-UV surfaces that can scroll (what `lineside` puts at a station)
```
| part | API |
|---|---|
| `kiosk(ctx, { x0, x1, z0, z1, top })` | steel-panel hut: plinth, ribbed panels + cover strips, ribbon window with a lit blind (-X), staff door + lamp (+Z), awning + strip light (-Z: the machines stand under it), extinguisher box + timetable (digits) + route diagram + emergency intercom (+X), roof slab, fascia, gutter + downpipe, AC unit + vent |
| `vendingMachine(ctx, { pos, yaw, seed, body })` | 1.02 x 0.78 x 1.9 m, front +Z: a lit display case with 27 cans / PET bottles as geometry behind glass, price rails (digits, hot / cold bars, buttons whose LEDs chase), coin + note slots, IC reader (wave pictogram), coin return, take-out port, header sign with drink pictograms, side vents, lock. `update(t)` |
| `ledBoard({ pos, yaw, hangTo, seed })` | double-faced LED departure indicator: two departures (time, platform, cars: digits + colon) and a running chevron row. `update(t)` |
| `doorMarks(doors, { x, top, color })` | painted door marks from `trainDoorsZ(cars)`: line-colour bar, two arrows, car . door digits, two worn queue lines; one atlas, one draw |
| `stopMarker({ pos, num })` | the driver's stop-position diamond with the car count, facing +Z |
| `columnKit(colZ, { x, top })` | numbered plates, emergency-stop boxes (red mushroom button, red / white strip, conduit), horn speakers |
| `posterStand({ pos, yaw, seed })` | double-sided lit ad panel (4 pictures, no text) |
| `lightPole({ pos, yaw, board })` | platform light pole for an uncovered end: T arm, two LED heads, speaker, optional pictogram board |
| `islandPlatform` / `islandLite` | the island: SURFACES `platform()` x 2 back to back (hero) / metre-UV strips (lite; `slab`, `tactile` colours) |
| `canopy(ctx, { xc, halfW, top, z0, z1, colZ, clear })` | H-beam columns every 8 m, cantilever rafters + knee braces, purlins, corrugated deck with clear bays, barge boards + ridge cap at both ends, gutters, downpipes along the rafters and down the columns, LED strip housings (glow only) |
| `bench` `bins` `stairWell` `itvMonitor` `poleClock` `boardTex` | as before (benches blue + pale grey now) |

## 5. The treadmill (K-K2): the train stays still, the world scrolls past
```ts
import { lineside, odometer } from "../../../kit/rail/lineside";
// the train's odometer = metres travelled at FILM time t (pure): a piecewise-linear speed profile (t s, v m/s)
const dist = odometer([{ t: 0, v: 22 }, { t: 15.8, v: 22 }, { t: 17.0, v: 0 }, { t: 999, v: 0 }]);
const world = await lineside(ctx, {
  dist,                         // (t) => metres; the world moves toward +Z by dist(t)
  railTop: 0,                   // y of OUR rail heads in your frame (the cab set passes -D.floor)
  // optional (defaults shown):
  tracks: [0, 3.8],             // track centre x's: ours + the opposing main on our RIGHT (left-hand running)
  signals: [{ at: 700, aspect: "G" }],   // odometer metres; on the LEFT of tracks[0]. ONE by default (two in line read as a double dot)
  stations: [],                 // [{ noseAt }] = the film's Tokyo platform (lite) on our LEFT, placed so the train's NOSE stands at odometer
                                //   `noseAt` (platform from 14 m ahead of the nose to length - 14 behind it, as in the hero set).
                                //   Older form [{ at }] = the odometer of the platform's FRONT tip (= noseAt + 14).
  ahead: 1600, behind: 140,     // world extent (m)
  bankH: 2.2,                   // the grassy cutting bank on the left
  houses: { setback: [0, 0], maxFloors: [5, 5] },   // [left, right]: push tall houses back from a low side sun
  trees: 3, treeLod: { near: 10, far: 30, minKeep: 0.1 },   // real trees per 200 m tile (they are most of the world's triangles)
  off: [],                      // "grass" | "trees" | "houses" | "poles" | "ocs" | "fence"
  seed: 1,
});
set.add(world.object);          // in the set's update (EVERY sub-frame): world.update(t, cam)
```
Returns `Built & { railTop, formation, period, z(at, t), mastPhase(t) }` (`z` = world z of an odometer position; a
portal passes every 2.27 s at 22 m/s). What scrolls: 60 m track tiles (SURFACES `railTrack()` with metre-UV ballast +
stains), a cheap far track, 200 m tiles (portals + catenary, troughs, fences, relay cabinets, the bank, the gravel
between far-apart tracks, roads, yards out to the haze, poles + wires, houses, bushes, trees), signals + km posts
(digits) + stations at absolute positions. The signal's lit lamp keeps a glow of at least 1.3 % of the frame height
at any distance and is not fogged: a small, clear green dot (700 m out in the cab shots).

Signal lamp order (K-P4): built GREEN top, YELLOW middle, RED bottom. CHECKED 22:25 against ja.wikipedia's own diagram
of the 3-lamp head (the file `Japanese_railway_signal_3_clear.svg` on the page 日本の鉄道信号, section 三灯式: three lamps, the
lit green one is the TOP one; looked at the rendered image and at the SVG source, cy 100 of 100 / 230 / 360). So the
kit's 3-lamp order is right by that diagram. It is a diagram, not a photograph: a photo check is still open. (Do not
copy the 4- and 5-lamp heads from it: those are yellow / red / yellow / green and yellow / yellow / red / yellow / green
from the top, green at the BOTTOM: bestcarweb.jp photo captions.) In the platform set only the lit lamp reads (48 m).

## 6. Measured (GTX 1660 Ti, PC shared with other builders; numbers swing with their load)
Set `jp_platform` (the whole place + the 10-car train + cast), sandbox `KitRail`, one render tab:
| what | number |
|---|---|
| set build | 6-21 s at draft, 12-34 s at final (the low numbers = the PC to itself; the budget is 30 s). Parts at draft: lineside 1.9 s, platform 0.9 s, train 2.0 s, orange train 0.9 s (only when a `pass` shot exists), cast 0.1 s, fx 0.2 s |
| shader compile | 20-28 s at draft, 38-48 s at final: 89 programs (pre 19-30 s + the first update 0.2 s draft / 12-17 s final, which is the cards) |
| triangles / meshes | 18.6 M / 2,116 (lineside 9.8 M / 784, platform 1.7 M / 144, train 3.6 M / 625, orange train 3.1 M / 495). Before tonight: 33 M (9 real trees = 17 M, rounded boxes on houses = 2.3 M) |
| **final, a continuous shot** (frames 60-83 = the train pulling out past a pushing lens, 1080x1920, 8 sub-frames) | **1.87 s per frame wall** steady (budget 4), page render median 590 ms per frame = 74 ms per sub-frame |
| GPU per sub-frame at final (kit-prof, gl.finish) | 27-34 ms: main pass 17-19, AO 6-11, sun shadow 2-8, shafts 0-2, post 1.6. The same at 540x960: the main pass is bound by draw calls (2,100 meshes), not by pixels |
| CPU updates per sub-frame at final (the set's own timer) | 20.5 ms: **crowd (9 commuters, one atlas) 14.5**, tourist + kid + driver cards 1.9, 4 walker cards 1.9, 3 pigeons 1.1, train 0.9, lineside 0.06, platform props 0.04, fx 0.09 |
| final, the scout itself (a cut every 3 frames: a GI probe + every card redrawn at each cut) | 4.2 s per frame wall steady, page median 1,222 ms |
| draft (540x960, 1 sub-frame) | 0.40-0.63 s per frame wall steady, page median 64-82 ms; the whole 84-frame scout in 55-115 s including bundling, build and compile |
| GI probe per shot | 250-650 ms (64 px at final, 16 px at draft) |
Where the time goes and what would cut it: (1) the crowd's 14.5 ms per sub-frame is redraw work in kit/cards `crowd()`
(its pose time is still FLOORED, so every member is drawn twice per frame; see Requests); (2) the main pass is draw-call
bound: the train alone is 625 meshes; (3) 89 programs: kit surfaces compile one program per (surface, feature set).

## 7. Requests to other owners
**New 2026-11-20 01:55 (4th owner)**
- CAST: (1) s01 frames ~53-61: the tourist card jumps up ~10 % of the frame height and back (0.3 s) around "is not."
  / the blink: a whole-card bob in a held shot. (2) The seam: s24's last frames are half-lidded "flat", frame 0 is
  wide-eyed: a snap inside one continuous shot (ease the eyes open over the last ~6 frames of s24, or keep frame 0
  flat until frame ~3). (3) s15: on the 0.7 s look he grins; the script wants a blank look first, then the grin.
  (4) s14 (still d_67): the boy's free hand sits over his MOUTH (reads "oops"), not by the ear. (5) Frame 0: the cap
  is now #c4473c in fits.ts but under the golden sun it still renders at chroma 0.79 vs the suitcase's 0.59 (F_1):
  it still wins the eye; a darker / less orange red (value ~0.6) would let the yellow win. (6) The arm cannot stop
  "just short" of the bag: with the target nearer him it BENDS at the chest (aim `bagNear` tried and reverted).
- TRAIN: (1) Frame 0's suitcase reads pastel (sat 0.59-0.65, value 0.92) behind the door glass in the low sun: a
  deeper sunflower (sat ~0.85, value ~0.85) and / or less veil on the door glass would make it the loudest colour.
  (2) A lower door-glass sill (0.15 m) would show the WHOLE case, not the top 0.41 m. (3) T-6 (the emerald band right
  behind the yellow) is still open: the band is now the only saturated green in frame 0 (1.4 % of the frame).
- DIRECTOR: S-9 / S-11 / S-12 / S-13 / S-14 / S-15 / S-16 done on this side as described in the HANDOVER (S-13 not
  yet confirmed on a still). The platform shots no longer need the motion layer (all own moves >= 0.25 %/f).

- **DIRECTOR**: (1) the platform's own cameras now carry their moves and the frame-0 aim (2026-11-20 00:10: the
  director's layer is on no platform shot). (2) Frame 0 is the mirror image of the script's words (the train leaves to
  screen LEFT on this platform: he is on the right half, he points left). Mirroring the picture is not an option
  (digits on door marks, LED boards, clocks, prices). (3) Hook B's punch-in anchor `EYES_S01` reads
  `MARKS_jp_platform.s01` = his mark: still right ([-1.3, 0, 3.42]).
- **CAST**: (1) the late salaryman is back, in s09 only (`late: true`; his own one-card crowd so he can be hidden); he
  stops at [-0.95, 0, 2.75] on `EV.doorsMeetA`. (2) s13: the phone sits beside his ear (the director's C-7).
  (3) frame 0: the arm is not yet locked out on frame 0 (it is "two frames from full stretch", as scripted) and lands
  on frame 2: fine. (4) the boy seen from behind (s15 / s18 / s20) is mostly cap: he is placed at the frame edge.
- **TRAIN**: (1) `sets/cab.ts` passes `stations: [{ at: R.stopAt + 12 }]`: fine (the platform's front tip is then 12 m
  ahead of the nose and the platform lies alongside, as you meant); `noseAt: R.stopAt` is the exact form (door marks
  line up with the doors). (2) The yellow door-edge strips on the far doors and the yellow threshold line sit right
  behind / under the suitcase in every doorway shot: a dull amber or grey would keep the bag the only yellow.
  (3) the door-leaf glass is 0.46 m wide and starts 0.34 m above the floor: behind a CLOSED door the 0.5 x 0.75 m
  suitcase shows as a 0.46 x 0.41 m yellow block + its handle (frame 0: 15 % of the frame height on a 21 deg lens,
  the most this door allows with his face at 19 %). A lower sill (0.15 m) would show the whole case. (4) the
  emerald waist band is right behind the yellow in frame 0 (the director's T-6).
- **CORE**: the centred shutter samples 0.25 frame BEFORE a shot's first frame: anything that switches state by
  `t >= shot start` (cast marks, a train state, a visibility flag) is half-blended with the previous shot's state on
  that frame at final quality (seen here as see-through figures and a ghost train; fixed in this set by switching on
  the rounded frame). Clamping the sub-frame times to the shot's own range would fix it for everyone.
- **CAST**: crowd members `officeRead` / `officePhone` / `officeMask` always raise a strap arm (car poses): not usable
  on a platform; a walking pose for crowd members would let walkers go in the atlas (4 walkers are own cards now).

## 8. Honest gaps
- **Script v3 on this set was looked at as draft stills only** (42 true-time film frames, twice), not as moving
  picture and not at final quality except frame 0 (see the status line). Timings follow the clock; nothing was
  fine-tuned by eye against the real voice (it was still landing).
- **Frame 0**: the suitcase behind the closed door is as large as TRAIN's door glass allows (see Requests); the boy is
  a sliver at the left edge on frame 0 (he and his mum are in full view in the last shot until ~0.4 s before the seam).
  A green door-position mark ("^ 1 . 1") lies under his feet at 88-95 % of the frame height (under the UI band).
- **Continuity cheats, on purpose**: (a) in s23 he stands 1 m nearer the cab end than in s24 / s01, so the boy's window
  is "still coming" in the boy's shot and has just passed him when the last shot starts (a square long lens cannot
  show the boy and a head in front of him otherwise); (b) between s20 and s22 (one cab shot in between) he moves from
  his spot by the machines (z 4.6) to in front of the door (z 3.42); (c) in s15 / s18 / s20 the boy and his mum stand
  0.35 m to the cab-end side of their s14 marks so they do not cover him from the lens inside the car.
- (2026-11-20: s07 leavers, s09 / s22 boy in the leading window and s23's tighter start are DONE, see the HANDOVER; the
  next lines are the old state) **s07: nobody steps off the train** (the outline's commuters walking off and the briefcase that nudges the bag are
  not built: the bag just trundles to the threshold on its words). **s23: the kid's face is ~8 % of the frame height**
  (the frame must also hold the tourist's whole head and the suitcase's window); the pull-back is 2 m in 1.8 s (peak
  1.9 %/f, inside the cap). **s09 / s22**: behind the closed glass the boy is half hidden by the door-leaf frame from
  this three-quarter lens (mum and the yellow read); a sun glint sits on the door glass above the suitcase in s22.
- **s16a's focus pull** is in the camera (`focus` + `fnum 4`) but does not show at draft quality: not judged.
- **Frame 0 is mirrored against the draft**: the train leaves to screen LEFT here (he stands on the right half, the door
  window with the bag slides left). The draft says right. Not fixable in this set without mirroring digits.
- **The vending shot cannot hold everything**: in a 9:16 frame (about 33 deg wide) the machine fronts, his face and the
  far doorway do not fit together. Two set-ups exist: from behind him (the machines glow, no bag in frame) and from the
  machine's corner (his face + the doorway + the bag, no machine in frame). v3 s13 uses the second.
- **See-through figures at final**: two causes found. (a) State switched by raw time on a shot's first frame: fixed in
  this set (frame-rounded). (b) Card drawings floored to the previous frame for half the sub-frames: CAST fixed its
  member cards tonight (ROUND); kit/cards `crowd()` still floors, so the 9 crowd commuters can still double-expose on
  frames where their pose changes. Not mine to edit.
- **Signal lamp order**: the 3-lamp order (green on top) matches ja.wikipedia's diagram, not yet a photograph (section 5).
- **Cost**: set build is over the 30 s budget at final when other builders render (34 s; 12 s alone); compile 38-48 s
  per tab at final; draw calls are high (2,116 meshes).
- **The lite station on the treadmill** (what the cab / car sets stop at) now uses the hero layout; checked from a
  stopped cab's eye in the scout (frames 84-89: the tip, the ITV, the signal dot; the kiosk + machines + door marks)
  and through three film cab stills, not from every cab framing and not at final quality.
- A soft lattice of light and shade lies on the slabs at the cab end at sunAz 66 (it looks like the chain-link fence's
  shadow stretched by the low sun, but that fence should not reach the platform by my numbers). It reads as evening
  dapple and stays off the doorway; its source is not pinned down.
- The bank beside the track reads golden-green now (it was mustard and flat in the cab stills); at draft quality the
  grass blades still look like speckle from a moving cab.
- Not judged up close: the houses (plain boxes now, 11+ m from any lens), the stair well (a simple opening with
  steps), the track-2 side of the platform, the far platform beyond car 3.
- Lenses that look west into the low sun need `JP_RIG.west`; even then the far bank is a soft silhouette.
- The canopy deck's underside still reads a little tan in shade (bounce from the sunlit slabs); under `JP_RIG.wide`
  (warmth 1.3) the slabs go terracotta again: that is the warm look, not the neutral one of the suitcase shots.
- The late salaryman is off the platform (see Requests). Walkers are four extra cards (CAST's crowd has no walk pose).
  Pigeons are CARDS' cartoon pigeon (it reads like a duck up close): kept away from the hero corner.
- No sound, no departure melody, no announcements: not this owner's part.

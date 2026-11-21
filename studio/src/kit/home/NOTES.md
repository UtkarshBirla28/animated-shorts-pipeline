# kit/home (HOME_LAB owner; LAB owner from 2026-11-19 night): NOTES + API

## PAUSED 2026-11-21 ~10:00 (LAB, fix round 2). Tree compiles (tsc 0). No render running, RAM token released.
Clips checked (every 2nd/3rd frame, 180 px): out/pointing/lab_r3/shots/draft (09:15-09:27, all 18 re-staged LAB shots).
Coded AFTER that clip and NOT yet seen (the lab_r3b render was stopped at its start): v02 lens (look 0.08/1.4, fov 88),
v03 desk props (notebook + stopwatch left front), v06 strip mesh hidden, v08 98 / 99 / 100 times (ca, ca+0.4, max(hundred,
ca+0.8)), v13 / v14 / v15 / v16 new lenses, v14 board 1.8x at [HX-0.4, 2.45, -7.2], v17 KVIEW, v36 loopAim x +0.46.
NEXT on resume: render --shots v02,v03,v06,v08,v13,v14,v15,v16,v17,v36 --out out/pointing/lab_r3b/ and sheet them with
scratchpad clipsheet.sh (or ffmpeg select every 2nd frame, scale=180:-1); then the sheet LAB_r3_stills_<HHMM> (DRAFT).jpg.
In LEAD_DECISIONS_R2 order:
- 2 HOOK (coded + seen on lab_r3): deep console (front z +0.15, blue front ~10-13 %); v01 A0 frontal-left: lamp ~0.33 W whole,
  head ~0.24, dome ~0.55-0.66, slow push, clipboard + pencil in the bottom; v03 3/4 side from her right, ONE accelerating
  dolly (u^2, no rest); v04 from her LEFT front (red lens, face ~0.37, arm to the dome: reads); v05 front-left, higher;
  dome squash 18 % + flash on contact; green 2nd station gone. NOT met (set geometry, lamp sits right above the button):
  v02 head is ~0.3 not 0.10-0.14 (lamp ~0.46 W); v05 is not frontal and the LEFT wall is the lamp: the X's free wall in v05
  is only above her head (~x 0.35-0.85, y 0.02-0.14). Needs a DIRECTOR call (or a set change: lamp higher / further left,
  button nearer her: tested in scratchpad hk.mjs, it breaks frame 0's size spec).
- 3 HALL: one lamp placement HIGH (1.95 m, left-front of each person) [seen]; v10 four of row 1 medium + slow push [seen,
  faces small ~0.1]; v10b X 0.52, board 1..5 [seen; slams = CAST]; v13 arms held to "Not", mouths O in a wave on "say it"
  [seen on lab_r3 with the OLD wide lens: people too small; new close lens NOT seen]; v14 front 3/4 + board big/straight
  [seen with OLD lens: row small, floor big; new lens NOT seen]; v15 his own red lamp at eye level, others dark [seen; new
  higher lens NOT seen]; v16 [lab_r3 failed: face big, no lamp, orange front; new lens NOT seen]; v06 lower + ceiling
  panels [seen: ceiling still ~30 %; strip hidden NOT seen]; v08 flip [seen 98 -> 100, 99 too short; new times NOT seen];
  v17 face clear of the fridge wall + glow 0.16 [seen; box cut at the left edge -> KVIEW NOT seen].
- 7 END: v36 lamp GREEN on point#6, dark from EV.loopTail, last frame = frame 0 [seen]; finger over the housing's right
  edge in front of it (not behind) [seen; clear-air aim NOT seen]; v36a from her left, ponytail shows [seen].
- WAITING ON CAST: see FOR CAST below (presses, v10 creeping hand, v10b slams, v13 arms up into the high lamps, v15/v16
  hand on the desk / on the dome). WAITING ON DIRECTOR: v02 / v05 specs vs the set (above); v04 + v16 are close-ups (faces
  over 1/4); captions: v03 dome ends ~0.68, v15 button ~0.60.

## 09:50 done (code, tsc 0): FIX R2 first pass on every LAB re-stage (stills rendering, then whole-shot clips)
- hook: deep console (front edge z +0.15: blue front ~13 %); A0 frontal-left (lamp ~0.33 W, dome y ~0.6); v02 low wide
  insert from the lamp side; v03 3/4 side from her right, ONE accelerating dolly (u^2, no rest); v04 from her LEFT front
  (head ~0.36); v05 front-left; dome squashes 18 % + flashes on contact; green 2nd station removed; desk clipboard + pencil.
- hall: ONE lamp placement, HIGH (1.95 m, left-front of each person); v10 four of row 1 in a medium; v13 lower/closer,
  points held to "Not", mouths open in a wave on "say it"; v14 front 3/4, 0 OF 12 big + square to the lens; v15 his OWN red
  lamp at eye level (others dark); v16 hand + dome close; v06 lower/closer + ceiling panels; v08 98/99/100 flip.
- end: v36 lamp GREEN from "point" to the tail, finger stops in front of / beside the housing; v36a from her left (ponytail).
- kitchen: he stands 0.22 m further from the fridge wall; the fridge glow cut to 0.16, the pool low.
next: look at the stills, fix, then whole-shot clips; geometry limits for the DIRECTOR (v02 / v05) in FOR DIRECTOR.

## FOR CAST (08:40, fix round 2: what each new LAB picture needs from you; LAB sets lenses, props, aim / look points, timing)
- v01 frame 0 (also the last frame): her eyes UP on the lamp (I give look = the lamp's centre), wide and eager, finger cocked
  a full hand-height above the dome (I keep aim = the dome; please a big hover lift for frame0 / loop roles).
- v02: low insert looking UP at the lamp: her face small at the bottom, eyes on the lamp (look = lamp).
- v03: side three-quarter, hand + button BIG in the lower half: the press as the lead wrote (a hand-height up, 3 down eased,
  2 on the dome, 3 up, no 1-frame drops, no snap to the chin). I squash the dome 15-20 % + light its rim on your contact
  frames (from GO_PRESS: keep lag / travel / hold / up there as the truth).
- v04: 1.6x tighter; finger HIGH on the first frame, down over 5 f, landing on EV.redPress (I dip + flash the dome there).
- v05: frontal close-up: blink ~6 f in, eyes flick down to her finger on "tap?", small tight mouth from "Did".
- v10 (re-staged): a low 3/4 medium along row 1: four faces big. All hands hover; ONE hand (row 1 station 3, the third face
  from the lens) creeps down towards its dome over ~15 f from "watch" and is pulled back over ~6 f; a swallow; eyes dart
  (I move their look points: lamp <-> button).
- v10b: hands hovering ~15 cm up at the cut (as v10 left them); then FIVE slams one after another, far to near: HALL.five =
  [1, 3, 5, 7, 9], press k at F(five#1) + 3 + 6 k, travel 4 f (FIVE_PRESS in lab_hall.ts): please a wind-up + BIG travel,
  landing on that frame; I dip + flash the dome, pop the X over that head and tick the board on the landing.
- v13 (re-staged): the lamps now stand HIGH (lens ~1.9 m, above every head, a little ahead): every arm rises up into clear air
  to its own lamp; the points STAY out to the end of the shot; mouths open in a wave on "say it" (I key face beats
  mouth O at say#1 + 3 k; this is the one place in the hall where mouths move).
- v14 (re-staged): front 3/4: the same high red lamps in frame, all arms raised at them, untouched buttons in front.
- v15: he looks at HIS red lamp (I put it in his eyeline, beside his head, in frame), bored and blank; hand down on the desk.
- v16 (re-staged): his tapping hand BIG on the dome, fingertip touching on each tap (I give the dome a squash + spring on
  the hand / brain taps), red lamp above, his bored face soft above the hand. The hand must never sink behind the desk.
- v17: he leans in beside the open door with his whole head in clear air (I move him / the fridge); a head tilt; an empty
  bowl in his hand if you can hold one (I can add the bowl prop: tell me the hand point).
- v36: her point ends IN FRONT of the housing beside the red lens (I set aim to a point in front of and beside the lens,
  like v18); the lamp turns green on "point", her mouth opens on "say it"; arm down in the 12-frame tail, last frame =
  frame 0. v36a: her ponytail must show (she read as a boy).

## 07:30 done (LAB r2, tsc 0): checked on whole-shot clips out/pointing/lab_r2 + lab_r2b (v05 v08 v09 v10 v10b v13 v14 v15
v16 v36a) every 3rd frame; sheet pointing_preview/LAB_r2_stills_0729 (DRAFT).jpg. Extra: v09's cut frame was still blue (the
red now snaps to the word's frame); v10b board hidden until the first landing, counts 1-5 in red.
next: waiting for the lead. Open: v15 his hand still at his chest (CAST moving it to the desk; my lens shows desk + button);
the hot floor glow under the nearest hall lamp (LOOK); finger twitch / swallow in v10 and slams in v10b (CAST, see FOR CAST).

## 07:25 done (code, tsc 0; clips rendering): lead 07:00 decision + GATES R2
- v09: station lenses toneMapped=false, steady saturated red (breathing 0.8-1.0), no on/off blink from "red" to "anyway";
  lens re-aimed so the counter's 101 (blinking) sits right of the 1994 board.
- v10: TWO rows of six (ROW_SHOTS.watched z -2.0 + watched2 z -3.2, half a step over); row 2 stares too; eyes dart to the
  button now and then (sin gate); lens pushRest(... fov 64, 0.45 m, rest 0) = a push that never stops.
- v10b: FIVE_PRESS {lead 3, gap 6, travel 4} (exported): press k = HALL.five[k] starts F(five)+3+6k, lands 4 f later; its
  dome dips over the travel, its X pops and the board counts on the landing.
- v13: alive amp 0.8 for row 2 from "point"; each waits looking at the neighbour who points first.
- GATES R2: v08 push never stops + counter digit flicker; v36a slow push (rest 0); v14 aimed lower (heads above the band),
  0 OF 12 board lowered; v15 pulled back (face < 1/4, hand + button in frame); v16 aimed lower (hand + button above the
  band, head out); v05 lab_d hidden (her face turned into the band at the right edge).
next: check every 3rd frame of out/pointing/lab_r2 clips, sheet LAB_r2_stills, report.

## FOR CAST (07:25, v10b "Five press anyway.")
The five are row 1 (r = 0) stations HALL.five = [1, 3, 5, 7, 9], laid out left to right in the v10b lens (k = 0..4, far to
near). Order: k = 0 first. Press k: m "down" at F(five#1) + 3 + 6 k, travel 4 f (FIVE_PRESS in lab_hall.ts), then held
down; face "stare" + mouth O on the landing. Make each a SLAM (a wind-up before the cue frame is welcome: keep the landing
frame), I key the dome dip, the X pop and the board count to the landing. v10: every hand hovers; a swallow / a finger
twitch on the hovering hands would help the held breath (I only dart their eyes to the button).

## V9 HANDOVER (LAB ROUND 1 DONE, 06:50): sheet pointing_preview/LAB_v5_stills_0549 (DRAFT).jpg (cold stills r32/r34, logs clean)
done: AUDIT R1 list (status block at the end of out/pointing_v4/audit_r1/FIX_LIST_LAB.md); fix4 whole-shot clips of all 20 LAB
shots + fix5/fix6 re-renders (v02 v08 v10b v12 v14 v15 v17 v36) looked at every 3rd frame. Since 06:00: kitchen box was not
added (a comment swallowed g.add): fixed; fridge light lowered (it burnt the box white); v08 counter wider (whole) and the back
score HIDDEN until "anyway" (was a blank white panel); FIVE_ROW z -4.5 -> -3.3 (out of the red wash: no white face) + lens;
v15 wider; G0 back 0.3 m (her head off the right edge); LOOK: hall red starts exactly on "red#1" (no early red in v10); no
bulb strips anywhere (v18 too); CAST 06:10: v14 lens from the back-left corner (the whole row of six fills it, backs, untouched
buttons, red lamps, 0 OF 12), v12 researcher HOLDS the card (m:"hold", restL/restR on its edges, no pole); loop tail clip:
from EV.loopTail her hand comes down from the lamp to the hover, visible every frame; seam last->f0 = 3.14 (f0->f1 = 5.22).
next: not done: #21/#22 v10 green-to-red (story decision); v13 more life; mouths/slams = CAST. Waiting for the 2nd full draft.

## V8 HANDOVER (LAB DONE, 03:10): sheet pointing_preview/LAB_v5_stills_0309 (DRAFT).jpg (cold stills r31, render log clean)
Since V7: v10 = five of row 1 across from the side-FRONT (three-quarter faces watching their lit lamps, whole, the
nearest inside the right edge; its cut 1994 board hidden); v10b lens nudged (nearest person inside). Test clip
studio/out/pointing/lab_v5_clip/test/draft_176-235.mp4 (freeze dropped by the director) looked at every 3rd frame: v04
creeps in onto her face + the red lens, v05 her frozen face, the X pops with a bounce beside her hand. Not visible at
that size: the glow's breathing; the volunteer behind her turning (hidden behind the hero's head in the F0 lens).
Remaining: LOOK's light pass on f0 / f2053; CAST: point held through the tick (f905), v36a eyes.

## V7 HANDOVER (LAB, 02:55): sheet pointing_preview/LAB_v5_stills_0253 (DRAFT).jpg (cold stills r26)
DONE since 02:25: v03 researcher out; v04 creep + glow breath (needs the director to drop `freeze`); v05 X by her hand,
lab_d + researcher turn to her on "She"; rows ACROSS seen from the side for v10 (six of row 1), v10b (the five, X above
each, 5 OF 12 board), v13 / v14 (six of row 2, 0 OF 12 board); v07 against a teal pinboard (window removed), a
chest-high hazard switch; v08 lens inside the hall after the pull; glides on v02 (crane up), v08, v10, v15.
STILL WRONG (r26): v10 and v10b: the nearest person touches the right frame edge (pull the side lens back ~0.3 m or
look ~0.2 m further +x); the side-lens projection under-estimates near heads (~1.5x): check every move with a still.
v04 / v05 still frozen until the director drops `freeze`.

## 06:00 done (code, tsc 0): CAST 05:50: the dome dips with her finger (lab.ts domeDip from cast/beats_v4 GO_PRESS /
RED_DOWN); the loop tail (EV.loopTail): her aim back to the button, look to the dark lamp; v12 card pole gone. Hall
dressed (teal wainscot, text-free posters, racks with amber / blue LEDs, yellow floor tape). next: whole-shot clips
out/pointing/lab_v5_fix4 (all 20 LAB shots, queued behind other owners' renders), look at every 3rd frame, fix, report.

## FOR DIRECTOR (05:40)
- v05 X: my 3D X is OFF. Free area for your drawn X: upper right over the window, centre x 0.70, y 0.17 (a 45 %-wide
  X spans y ~0.05-0.30; her head starts at ~0.30 in the new higher v05 lens: y 0.20 may touch her hair; 0.17 is safe).
- v14 has its own move now (push 0.6 m from behind the row). v04 / v05: the lens creeps, the red glow breathes.
- fix2 clip check (v01-v07, every 3rd frame): one room for the whole hook (wall lamp on its post, window, no carpet),
  no bulb strips, the lamp reads OFF; v02 cut-in had the lit lens + her head at the edges -> widened (fix3 rendering).

## AUDIT ROUND 1 (FIX_LIST_LAB.md), 05:20: code done (tsc 0), whole-shot clips rendering -> out/pointing/lab_v5_fix2/
- booth: bulb strips (wall + console) removed; lamp OFF reads OFF (no idle glow); no hoods (the torn notch); halo
  sorted normally + smaller (it drew over her face); a dark post under the lamp (mount); v02 + v36a = cut-in from
  frame 0's side (same room); lab_d also out of v02; v05 lens higher, X beside the button (never on the hand).
- hall: back-wall score blank until "anyway", no ghost 888, counter 97 until 98-99-100; lamps saturated (no blown
  bulb); dome dip x2; X over each presser's head; row-2 lamps on posts 0.8 m ahead at 1.6 m (arms forward + up);
  v14 from behind (untouched buttons, the 0 OF 12 board in front); v08 = the counter big; v09 new angle;
  v15 = face + red lamp; v16 = close on the hand on the button.
- kitchen: a real box (depth, flap, slight turn), no glow, top shelf; the cat removed.
- NOT done yet: hall dressing (#20 racks / posters / wainscot), v10 green-to-red (#21/#22: script decision), v13 wave life.
- NOT mine: the see-through face card (#1/#3 root: card opacity / depth write) -> CAST / pipeline.

## FIX ROUND 1 CHECKED (04:40): whole-shot draft clips out/pointing/lab_v5_fix1/shots/draft (v01 v10b v13 v14 v18 v36a v36),
every 3rd frame looked at: v36 + v36a clean (no card through her head, nobody behind her); v10b board blank -> 1..5 with
the X pops; v13 / v14 points go forward-down to the lamps in front of the desks (no arm across a face), faces small;
v18 new lens: hand and lit lens in one glance (first try cut her head on the right: lens pulled back, re-checking).
FOR CAST: v36 starts with a HORIZONTAL point at the button (your point beat runs from the shot start while my aim is
still the button): start the point on "point" (point#6), hand at the button before; end with the arm coming DOWN to the
button in the last ~8 f (the loop seam); v18: start the point later, hold it past the green tick.

## FIX ROUND 1 (LAB, 04:20; code done, LAB files tsc-clean; renders wait for STATION's ny_station.ts syntax error)
- (1) BLOCKER v36: the researcher is out of the booth for good; lab_d out of every frame-0-family lens (v01 v18 v36a v36).
- (2) v10b board: blank, then counts 1..5 with the X pops (never "?"/"7").
- (3) v18: new lens P0/P1 from her right front (the arm across the plain wall to the lit lens) - to check on frames.
- (4) loop seam: clouds (2 laps per film), wall + console lamp chases (repeat with the film), clock (one lap of the second
  hand per film) are loop-exact; lamp dark both ends; nobody behind her. CAST: her arm must come DOWN to the button in
  v36's last frames (or the director cuts on it).
- (5) v36: her aim stays on the button until "point" (point#6); CAST: raise the point there; v18 point later + held past the tick.
- (6) v13 / v14: row 2's lamps stand in FRONT of each desk, lower, so the points go forward and down (no arm across a face).
- (7) v14 lens back. (8) life: the hall's red lamps blink in their own rhythms.

## FOR DIRECTOR (LAB, 03:25): v03 VOLUNTEER: PREPARED, NOT YET SAVED (lead: never during your film pass)
The purple volunteer (lab_d) whose face sat under the GO! pulse in v03 (x 0.05-0.30, y ~0.50 from f148) is taken out
of the Go-run shot, as she already is in v04. It is a one-line change in v4/sets/lab.ts (`vol2Hidden` += goRun). To
apply it after your render: from studio/, run
`PYTHONNOUSERSITE=1 ../tools/.venv/Scripts/python.exe -s C:/Users/utkar/AppData/Local/Temp/claude/e039aa327812b850/122d7bae-7fec-4ee7-9141-c86c2c37750e/scratchpad/lab5/e32.py`
(session scratchpad: it may be gone), or edit by hand in the line `const vol2Hidden = ...`:
`const vol2Hidden = (t: number) => inRole(t, "red") || inRole(t, "goRun");`. Then run tsc and check f150 / f172.
Her empty little desk + lamp stay in the background (no face under the pulse).

## FOR DIRECTOR (LAB, 03:00; frame fractions 0..1, x from the left, y from the top)
- CAPTION FREE AREAS: v05 ("Did you tap?" / "She did."): the console front x 0.08-0.92, y 0.80-0.93 is free (only the
  blinking console lamps; her hand, the dome and the X are above y 0.75): y 0.83 is right. v36a ("Now try again."):
  the button fills the bottom (y 0.75-1.0) and her hand is at y ~0.65-0.80; free = the wall / window above her head,
  x 0.45-0.95, y 0.06-0.28.
- PLEASE: drop `freeze` on v04 and v05 (LAB's v04 lens now creeps 0.16 m onto her face + the red lens with an 8-frame
  rest; v05 has a small glide F0 -> F1); v02 drift 0.22 -> 0.1 (at +0.22 the lit green lens reaches the left edge);
  v08: the old lens left the hall under your -0.2 pull (no ceiling): the new lens stays inside (pulled end z 5.6,
  y 3.9), but a small push (+0.1) would be safer still.
- Lenses moved (re-run probe_cams_v4): every booth lens, v07, v08, v10, v10b, v12, v13, v14, v15, v16, v17.

## V6 HANDOVER UPDATE (02:25): final sheet pointing_preview/LAB_v5_stills_0224 (DRAFT).jpg (cold stills r16/r18/r19/r23).
Since the block below: lamp at z -1.12 (her point hand now drawn in front of the housing: f880, f2020, f2053 checked);
v02 G0 / Go-run R1 / v04 D0 re-aimed so the LIT lens is whole (r19 f60 f150 f172, r23 f180); v05 = frame 0's side
with the X above her head (r19 f235); v10b five-in-a-row across (r18 f490); researcher paces behind her (loop-safe),
hidden in v04 with lab_d. STILL OPEN: v02 lit lens touches the left edge at the END of the director's +0.22 push (ask
0.1); v10 is a staggered column; frame 0 / loop light pass (LOOK); CAST: her point drops before the tick (f905), v36a
half-lidded eyes; re-render the opening clip (opening_v4.py) once CAST + director changes are in.

## V6 HANDOVER (LAB, laptop, 2026-11-21 ~01:00): read this first, then the V5 WORK LOG below
STATE: tsc 0. Code done for the lead's opening orders (OPENING_AUDIT_v5): low 3/4 opening, upright lamp, big button on a
0.70 m console, real v02 cut-in, Go-run dolly that keeps head + lenses whole and the dome above the GO! band, v04 tighter
red, v05 its own close-up with a big X, the dome dips; booth life (sky window + drifting clouds, researcher walks in on
v01 / out on v36, second volunteer, console + wall lamp chases, red pulse); LOOK's v5 booth light wired (labPanelK,
idle lens + cap glow, sky dims per lamp state). Hall: 4 m tall, columns +-0.95 from z 0.6; one-row shots hide the other
column (rowG); no lens cuts a head (lab5/hc2.mjs, start + after the drift). Kitchen: LOOK's palette/rig/glow/pool, a
family-size box square to the lens, her side-on beside the fridge, the cupboard door over the fridge, the cat in front.
LATER (01:15): LOOK's lab.ts lines wired (lit red lens redK/redBody, lens envK/rough, panel diffuser glow x labPanelK,
idle lens + cap glow); light budget = 8 (the control room and its panel are gone). v10b = THE FIVE IN A ROW ACROSS
(lab_hall FIVE_ROW: the five pressers' stations move into one row across at z -4.5 for the v10b shot only, the rest
hidden; an X above each head; a "5 OF 12" board centred above them; heads ~8-9 %: the most 9:16 allows for 5 across).
v08 tilted down (less ceiling). Opening clip done: pointing_preview/OPENING_v5_strip_0050 (DRAFT).jpg.
OPEN (in order): (1) CAST: the hover hand = a raised single finger by her chin (all opening shots); her point in v18
drops before the tick (f905 arms down); v36a eyes half-lidded; (2) re-render the opening (opening_v4.py) after LOOK's
lines + CAST's hand fix, look at strip + go_run; (3) v10 is still a staggered column (a queue) of 12: whole heads but
overlapping ~50 %; a row of 12 across cannot keep heads apart in 9:16; (4) LOOK: one more light pass on frame 0 and the
loop frame once framing is final (20 % beige measured: her face, the clock, the window).
Scratchpad tools (session-only): lab5/proj.mjs, lay.mjs (booth), hc2.mjs (hall heads/boards), s3-s10 (lens searches).

## V5 WORK LOG (laptop, 2026-11-20 night; newest first; two lines per step)
- 02:45 done (code, tsc 0): director 02:11 + lead 02:30: v04 creeps (pushRest 0.16, rest 8: DIRECTOR must drop
  `freeze` on v04 / v05), red glow breathes in the beat, v05 X by her hand, lab_d + researcher turn to look at her on
  "She"; researcher hidden in v03; ROWS ACROSS seen from the side (lab_hall ROW_SHOTS / layoutOff): v10 six of row 1,
  v10b the five, v13 / v14 six of row 2 (+ a "0 OF 12" stand); v07: the window behind him removed, a teal pinboard,
  a chest-high switch with a hazard panel, a fat yellow handle and a lamp that lights on "trap". next: r24 stills.
- 02:10 done (code, tsc 0): CAST 01:50: the lamp hangs at z -1.3 (behind her card plane) so her pointing hand is drawn
  in front of the housing (v18 / v36); the loop aims at the red lens like line 11; lab_d hidden in v04; v05 = frame 0's
  side again (callback) with the X big above her head (the reverse angle lost the lamp, r17 f200); v02 G0 less oblique
  (DIRECTOR: please v02 drift 0.22 -> 0.1); v10b row across looked at (r17 f490): five whole, five X's, 5 OF 12 reads.
  next: r18 check (f0 60 150 180 235 490 680 880 905 1965 2020 2053), final sheet, report.
- 01:35 done (code, tsc 0): lead 01:20: the LIT lens whole whenever lit: G0 (v02, through the director's new +0.22
  push), R1 (Go-run end), D0 (v04 red, head ~36 %) re-aimed; v05 is now a REVERSE angle (camera at her right, low: her
  frozen profile staring at the red lamp, the lamp whole, the X at the left); the researcher paces toward the back
  wall and back behind her right shoulder (period = film / 14: loop-safe). next: r16 (hall+kitchen) then r17 opening.
- 00:55 done: opening clip rendered (opening_v4.py draft, studio/out/pointing_v4/opening_v4.mp4 + opening_audit/),
  strip + go_run looked at: every Go lands with the lit lens and her head whole, dome top above the GO! pulse, red tight;
  sheet pointing_preview/OPENING_v5_strip_0050 (DRAFT).jpg. Director's notes fixed in code: v05 X clear of her cheek (over
  her hand), v10b X's over the buttons + a "5 OF 12" stand in its lens, researcher stands (no walk) in frame 0, kitchen
  lens nudged. next: cold stills r15 -> LAB_v5_stills sheet, report.
- 00:35 done: r13 hall + kitchen + loop looked at (f262 310 348 388 430 490 525 570 620 680 740 800 880 1965 2053):
  no head cut by an edge in any hall shot, heads 7-17 %; hall red now deep (LOOK's dim). Fixed after r13: v12 counter
  cut, v13 score/1994 cut (1994 hidden in the wave shot), v14 '994' cut, kitchen box bigger (0.40 x 0.54) + her
  profile, the red strip chases. next: opening clip (opening_v4.py draft, waiting for CAST's token), then stills r14.
- 00:20 done: r13 opening stills looked at (f0 26 60 108 150 172 180 235): frame 0 FULL (upright lamp upper left, her
  face centre, big button, sky window + clouds, clock, lamp strip, console lights, 2nd volunteer); v02 a real cut-in;
  Go-run push keeps head + lenses whole, dome top 63-65 %; v04 red tight (lens huge, face ~35 %); v05 face ~45 % + big X.
  NOT good: CAST's hover hand = a raised single finger by her chin (all shots); researcher walked off-frame (x fixed).
- 00:05 done (code, tsc 0; stills r13 queued): OPENING recomposed (upright lamp, button 1.3x on a 0.70 m console,
  low 3/4 lenses A0/G0/R0->R1/D0/F0/P0, the X big beside her face, the dome dips, sky window + clouds, researcher walks
  in/out, second volunteer); KITCHEN (LOOK's palette/rig/glow/pool, box 0.32x0.46 square on, person beside the fridge);
  HALL (4 m tall, columns +-0.95 from z 0.6, one-row shots hide the other column, all lenses checked: no cut heads).
  next: look at r13, fix, then the opening clip with opening_v4.py (RAM_ME=lab) and the OPENING_v5 strip.
- 23:20 done: lead's opening orders read (briefs/v3/pointing/OPENING_AUDIT_v5.md): RECOMPOSE the opening as a low 3/4
  view (button big in front, her head + shoulders behind, lamp big above/beside, depth behind). Projection tools in the
  session scratchpad lab5/ (proj.mjs, lay.mjs, s3-s5 searches). Horizontal lamp + her side by side cannot fill 9:16
  (lamp <= ~58 % wide with her head 18 %); testing a VERTICAL two-lens head (green top, red below). next: build it.
- 23:00 done: sandbox film_hook.ts now uses the film's camOf (drift + freeze), so sandbox stills = film frames;
  lab_plan red pulse; lab_hall: LOOK's HALL_RED + redRoomDim, wash pulse, 'alive' on every volunteer (tsc 0).
  r11 cold stills (out/pointing/lab_v5_r11) looked at: hall heads cut at edges (v08, v10b, v13, v14), kitchen
  person huge + box small. next: opening first (lead), then kitchen, then hall.

## V5 HANDOVER (2026-11-20 evening, new PC -> next PC) — LAB (the booth, the 1994 hall, the kitchen)
STATE: nothing of LAB's is running (last render stopped, tree killed, no part files, RAM token released, no stills
slot). tsc: `src/sandboxes/kit_home/tsconfig.json` 0; `src/videos3/pointing/tsconfig.json` errors ONLY in
`v4/sets/ny_station.ts` (STATION's file, mid-edit at 19:21), none in LAB's files. NO half-done code edit of mine:
the last code edits (frame-0 lens, desk 1.0 m, lamp scale 0.8, v02 cut-in, tick, kitchen box + fov 46) compile and
were checked on cold stills r10.
FILES (LAB): `studio/src/videos3/pointing/v4/sets/lab.ts` (booth: layout LAB4, props, lenses VIEWS + ROLE_CAMS, the hall
lenses too), `lab_plan.ts` (EV-driven times; shots found by ROLE = the lab shot containing a key word; lampAt /
buttonAt / xAt / stripAt), `lab_hall.ts` (the 1994 hall, 40 m along +X: two columns of 12, boards, switch, card, X's,
red washes), `kitchen.ts` (morning kitchen v17); sandbox `studio/src/sandboxes/kit_home/film_hook.ts` (comp
KitHomeHook = LAB's sets on the film's own frames).
DONE + CHECKED (draft): the opening v01-v05 (lamp OFF at f0, green alone f60, Go flash green only f108, gap both dark
f118, red cut f180 red lens whole, X f235), the lead's point layout (lamp up-left, red lens ~51 deg on screen above her
shoulder in frame 0 / v36; f905 point + tick; f2053 = f0's lens, loop seam OK), the hall (v06-v16 incl. v10b), the
kitchen (f800 cereal box reads). Frames checked: every 2nd frame of every LAB shot in shots5/shots6 (19:00 code) and
cold stills r10 (f0 60 108 118 180 235 905 2053 800, 20:10 code). The opening shots after the 20:10 lens change were
NOT yet re-rendered whole (shots7 was stopped).
OPEN LIST, in order (all from the coordinator's last messages; none cancelled):
1. LIFE THROUGH THE RESTS (DIRECTOR's gate: v02 v04 v05 v07 v08 v09 v10b v14 v36a change < 1 % for most frames):
   planned, NOT started: (a) `lab_plan.ts lampAt`: while red, flash = decay + 0.25*(0.5+0.5*sin(t*6)) (the red lens
   pulses in v04 / v05 / v09); (b) `lab.ts build`: the signal head sways a little on its rods (rotation.z ~0.01 rad,
   sin), a small desk fan (spinning, oscillating) on the left desk corner; (c) `lab_hall.ts`: add an "alive" beat (amp
   ~0.6) to every volunteer (in `ready`), the red washes' gainAt pulse (1.3 + 0.25*sin(t*5)); then a draft clip of each
   shot's LAST 20 frames: something must visibly move in every one.
2. GLIDES too slow (`lab.ts ROLE_CAMS`): frame0 pushRest(V.A0, 0.3) -> 0.6 (>= 0.25 %/f); bored (v15) pushRest -> a
   0.4 m slideRest; herPoint (v18) P0 -> P1: make P1 a 0.35 m sideways slide (pos x +0.35, same look); loop (v36):
   `loopIn` offset 0.35 -> 0.7 m, keep landing exactly on A0. Tell the DIRECTOR which lenses moved; write
   "LAB cameras + life done" in these notes (he re-runs his probe; run nothing of his chain).
3. Lead 19:30 items 2-4 (v10b / v14 / v13 as a ROW ACROSS the frame): NOT done. With two 12-deep columns no lens
   separates the heads (searched ~1600 lenses, best pairwise ratio 0.6; scratchpad lab/search2.mjs). Needs a lead
   decision + a build: a short bench row of 6-8 volunteers across (side by side, seen a little from above, a 3/4 so
   the row runs diagonally), used by v10b (five X's over five heads with gaps, 5 OF 12 big in frame), v14 (arms out
   side-on at red lamps, untouched buttons, 0 OF 12 big, the booth's alarm red: take LOOK's hall red), v13 (the wave,
   each point 20 f). Hall red is still pastel salmon (LOOK to give values).
4. Re-render the opening (v01-v05, v18, v36a, v36) + v17 whole at draft after 1-2; check the six presses (CAST's hand
   lands on the dome), the red cut, the X, the loop seam (v36 last frame vs v01 first frame), every 2nd frame.
5. Frame 0 honest state: better (lamp ~50 % wide upper-left, face right, button ~57 %, desk top + desk front panel, no
   floor) but still less striking than the reference frame 0s; head ~0.17 of the height (lead asked ~1/5).
6. A new preview sheet under a new name in `pointing_preview/` (the last one is
   `LAB_v4_opening_hall_kitchen_vs_reference (DRAFT).jpg`, from the 19:00 code: its frame 0 is out of date).
COMMANDS (Git Bash, from `studio/`):
- tsc: `npx tsc --noEmit -p src/sandboxes/kit_home/tsconfig.json` and `-p src/videos3/pointing/tsconfig.json`
- stills: `RAM_ME=LAB node scripts/kit_render.mjs --entry src/sandboxes/kit_home/index.ts --comp KitHomeHook --quality draft --stills 0,60,108,118,180,235,905,2053,800 --out out/pointing/lab_v4/`
- whole shots (one batch at a time, RAM token): same with `--shots v01,v02,v03,v04,v05,v18,v36a,v36 --conc 1`
- test clip: same with `--frames a-b --conc 1` (draft only)
- the clock: `node ../briefs/v3/pointing/director/probe_v4.mjs` (from the project root: `node briefs/v3/pointing/director/probe_v4.mjs`)
- sheets of every 2nd frame: scratchpad scripts (`lab/clipsheet.sh`, `lab/shotsheets.sh`, projections `lab/booth4.mjs`,
  `lab/walls.mjs`) were in the old session scratchpad and will NOT travel with the zip: re-create (ffmpeg select
  not(mod(n,2)) + drawtext + tile; a pinhole projection of world points for a view {pos, look, fov}).

## LAB on the NEW PC (2026-11-20 afternoon; newest first). Two lines per finished step: done / next.
- 20:15 done: r9 stills showed the 1.3 m desk as a giant orange plane and v02's green lens cut by the frame edge;
  fixed (desk 1.0 m deep: a strip of top + the front panel at the bottom; lamp (-0.36, 1.46, -0.7) scale 0.8; A0 pos
  (-0.06, 1.95, 2.5); v02 G0 = the whole lamp big + her eyes at the right edge; the v18 tick moved clear of her hair;
  kitchen fov 46). Cold stills r10 looked at: f0 (lamp OFF, ~50 % wide, upper-left; face right; button ~57 %), f60 (the
  green, a clear cut-in), f108 (Go flash, green only), f118 (both dark), f180 (red cut, red lens whole), f235 (X),
  f905 (point + tick), f2053 (loop = f0's lens), f800 (kitchen: the red cereal box with the bowl now reads on the
  shelf). On-screen point angle in frame 0 / v36 ~51 deg (lead: about 50). Whole-shot check shots7 running.
- 19:50 done (lead's 19:30 list, code + projections, tsc 0; stills r9 running): FRAME 0 tightened: she at x 0.33,
  the lamp at (-0.38, 1.46, -0.7) scale 0.85, the desk 1.3 m deep (its front edge at the bottom of the frame: desk top
  only, no floor); A0 = high and close: lamp ~60 % of the width upper-left, head 0.20, dome 53-60 %, the red lens 48.6 deg
  above her shoulder ON SCREEN (lab/booth4.mjs); v02 G0 a tighter cut-in (lamp ~80 % wide, head ~0.25); R0/R1, D0,
  F0/F1, P0/P1 re-aimed (the point lens P0 at 50 deg on screen). Kitchen: a big LOUD red cereal box (bowl heaped with
  flakes, spoon, sunburst; no text) alone on the middle shelf, turned to the lens; KVIEW re-aimed so the box is near
  the centre; kettle + steam moved into frame; the cat now crosses the floor in front of her. Items 2-4 (v10b / v14 /
  v13 as a ROW ACROSS the frame): NOT done: with two 12-deep columns no lens separates the heads (best pairwise ratio
  0.6 = heads overlap ~40 %, searched over ~1600 lenses, lab/search2.mjs; more spacing does not help); needs a lead
  decision: a short bench row of 6-8 across built for those three shots (heads ~0.10 of the height at best in 9:16).
- 19:20 done: shots5 (v01-v05, v18, v36a, v36) + shots6 (v06-v17) rendered at draft from a fresh bundle, render log
  clean (no error, no CAST failure, no NaN); every 2nd frame looked at on sheets (scratchpad lab/shots/*.jpg); the
  sheet `pointing_preview/LAB_v4_opening_hall_kitchen_vs_reference (DRAFT).jpg`. Frames that prove LOOK's / the lead's
  points: f0 lamp OFF; f70 green alone; f108 a Go flash, green only; f118 gap, both dark; f180 the red cut (red lens
  whole); f235 the X; f905 her point at the red lens; f2053 = f0's lens (loop). Hall red f620: now salmon-red, no more
  magenta, but still pale. NOT GOOD YET: frame 0 is flatter and busier than the references (lamp only ~45 % wide,
  the flat blue desk + floor fill the bottom 40 %); v13 wave does not read (arms small / unclear at phone size); v10b
  shows the X's overlapping in a deep column (not countable as five); hall red still pastel; v12 card is fine but the
  researcher stands at the frame edge. next (whoever continues): a tighter frame 0 (lamp bigger at the price of a
  steeper point, or the camera closer + lower desk), v13 from the side of the column with CAST's travelling wave, v10b
  the five X's on one side-on row, LOOK's hall red.
- CHECK IN THE RENDER (owner's PC): the six green flashes on the Go words; the red cut; the X pop; the v01 push; the
  counter 1..97 then 98-99-100 and 101; the five presses + X's in v10b; the wave; the loop cut v36 -> v01; the cat,
  kettle steam and cupboard door in v17.
- 19:10 done (CAST's 19:05 list, code, tsc 0; renders queued in shots6): hall desks STAGGERED (every other one 0.14 m
  left / right: heads no longer stack down a column); each station's lamp now on a floor post BESIDE the person (their
  left, screen right, shoulder height): the wave's points are side-on arms in the front lenses; the wave travels front
  to back, each point held 20 f, then all twelve point again on "Not"; the researcher's switch reach and card point cut
  to 15 f each; switch + researcher moved well in front of the rows (v07 lens follows; board still whole); v08 fov 50
  (lab_b's head was 0.264); v15 / v16 lenses nudged back (lab_a 0.253).
- 19:00 done: stills r8 of the new booth (f0 / 60 / 108 / 118 / 180 / 235 / 905 / 2053, cold start) looked at: f0 lamp
  OFF (tinted glass, no glow), lamp up-left, face right, button in front; f60 green lit alone; f108 a Go flash, green
  only; f118 the gap, BOTH lenses dark; f180 the red cut, red lens whole; f235 the X on the wall between lamp and face;
  f905 her point up-left at the red lens, side-on, nothing behind the arm, the tick top-right; f2053 = frame 0's lens
  with her arm up (loop seam OK). Not good yet: frame 0's lamp is smaller than before (about 45 % of the width, at
  30-44 % of the height): the 50-degree rule keeps it beside her, scale 0.9 already breaks 50 deg; the red lens' centre
  burnt pink (red lit now 0.3). Queued (waits for CAST's token): shots5 = v01-v05, v18, v36a, v36; shots6 = the hall +
  kitchen. next: sheets of both, preview sheet, report.
- 18:50 done: LAMP MOVED FOR THE POINT (CAST: re-check now). Booth layout (v4/sets/lab.ts LAB4): she sits at x 0.38
  (right of centre), the signal head hangs up and to her LEFT at (-0.45, 1.5, -0.8), scale 0.8: the RED lens (the inner
  one) is 48 deg above her screen-left shoulder, so her right arm (screen left) points up-left at it, side-on; the
  observation window + researcher moved far right (x 2.4 / 2.6: out of the opening's lenses and out of the arm's path),
  the wall clock top-left (-1.2, 2.35), the lamp strip top-right (y 2.45): nothing behind the raised arm (projection
  script lab/booth2.mjs). The button is in front of her (0.15, 0.82, -0.66). Frame 0 = this diagonal (lamp up-left,
  face right, button in front); all opening lenses re-aimed (A0, G0, R0/R1, D0, F0/F1, P0/P1; v36 lands on A0); the X
  sits on the wall between the lamp and her head (frame 62 % / 20 %), the tick above-right of her head (80 % / 22 %).
  The lit button cap stays red (glow 0.9 / 0.05 / 0.02). KITCHEN v17 IS STAGED (v4/sets/kitchen.ts, for CAST): the
  person in pyjamas at KIT.person (-0.35, 0, -1.0), yaw -1.19 (3/4, facing the open fridge at screen left), aim = look =
  the cereal box on the fridge's middle shelf (-1.25, 1.17, -1.64); my one extra beat: a "tired" blink on "cereal#1";
  CAST's v17 rows (look at aim, blank face) play as they are. next: stills r8 of the new opening, then a render of the
  changed shots only.
- 18:30 state after the network drop: my shots4 render was stopped (tree killed, RAM token released, no part files);
  tsc 0. Code has (not yet rendered): OFF lens = LOOK off x 0.4, no emission (frame 0 lamp OFF; both lenses dark between
  Go flashes); hall red: ceiling + floor switch to a warm neutral during the red (no pink-magenta), hall floor x 0.62,
  strip light x 0.7, bounce x 0.5; v10b high lens with the score board; v12 from above (board whole above his head);
  v15 / v16 from above; mini buttons glow red when pressed. next: LEAD DECISION (move the lamp for her point), then a
  render of only the changed shots when the token is free.
- 17:55 done: whole-shot DRAFT renders of every LAB shot on the final clock (sandbox KitHomeHook = the film's frames;
  chunks in studio/out/pointing/lab_v4/shots/draft/, every 2nd frame on sheets in the session scratchpad lab/shots/).
  Round 1 (shots1, 16:55 code) and round 2 (shots2, 17:27 code) looked at frame by frame; fixes from them: lens domes
  were back-face culled (latheG faces inward: DoubleSide; the mini lamps never lit before); lit lens burnt white-pink
  (LIT_K 0.45, lens colour = its own hue); OFF lenses too bright (LOOK off x 0.7, no emission); the 1994 board / counter
  / score were CUT by the frame edge or half hidden by a head in v08 / v14 / v15 / v16 ("94", "994", "10"): board
  moved to x -1.0, counter + ONE score board at x 2.6 (the board flips 5 OF 12 on "anyway", 0 OF 12 on "not"), the clock
  onto the side wall; every hall lens checked with a projection script (lab/walls.mjs: each back-wall item IN / out /
  CUT per lens) and v15 / v16 shot from above (board out of frame); v10b (new, "Five") held high over row 1 with the X's
  beside each head drawn on top; v12 card on its own post, the researcher points at it side-on (CAST's "hold up" put his
  hand at his mouth); v13 wave from the aisle side (points go AWAY from the lens); the switch is only visible in its own
  shots; v09's first frame was not yet red (red now from the shot's cut). Loop seam checked: v36's last frame = v01's
  first frame (same lens, the arm drops) - lab/seam.jpg. next: shots3 (all fixes), sheets, preview sheet, report.
- 17:05 done: test clips (draft, sandbox, every 2nd frame on sheets in the scratchpad): 140-199 (Go run + the cut to
  red): the flashes were too long and the RED lens glowed dimly between them -> flashes 0.17-0.25 s, NO glow on any
  dark lens (lead: frame 0 = a lamp that is OFF: tinted glass, no emission); 205-245 (the X pops on "She", f225-227,
  clear of her face); 355-410 (v09 red room, v10 five X's): the front score stands blocked v06 / v09 / v15 -> the score
  boards moved onto the back wall; the big switch hidden outside its shots (it stood in v10's foreground). LOOK's
  hand-off taken: LAB4_RIG, LAB4_LENS values, the lens seat = the lens glass, HALL_LOOK (sky-blue hall ceiling, 1500 lm
  strip, red washes at 1.7 m); v04 D0 + v05 F0/F1 re-framed so the RED lens is whole; the desk front got one orange
  band (same desk in every shot). next: whole-shot draft renders of all 18 LAB shots (cold start), sheets, fixes.
- 16:55 done: roles now found by CONTAINED WORDS (lab_plan ROLE_RULES: a list of candidate words per role, e.g. counter =
  the lab shot holding "hundred#1"): survives the STORY rewrite (present tense, "In 1994" gone) with no edit; the green
  TICK pops on "wait" in her point shot (v18); the idle glow only when no lens is lit; exposure 1.55 (yellow walls read
  ochre at 1.35); hall: h 3.0, switch moved front-LEFT, lever swings in the lens plane, researcher side-on beside it,
  out of the wave / "not one" shots; X's lower (1.72 m) beside each head; two red washes (26 klm) for the hall flood;
  v08 / v15 / v16 lenses re-aimed; kitchen: person 3/4 (yaw -1.19) clear of the cereal box, kettle + steam in frame,
  the cat walks along the counter (out of the caption band). next: stills r7, the sheet, report.
- REQUESTS (in the report to the lead): CAST: v18 her LEFT arm (screen right) up at the RED lens (today the right arm
  points up-left at the green side); v36 the same arm up (the loop); a "write" move for the researcher behind the glass;
  24 hall faces from more than 4 outfits (the rows read as clones); hover pose = finger down over the dome. LOOK:
  LAB4_RIG blew her face out (r5 f80 / f185 / f235): judge the light on the new booth (set uses LAB_RIG + exposure 1.55,
  sun 95 / 25); the green wash (labWash green 0.32 / 0.45) is too weak for "green spills over her face and the room";
  a kitchen palette (KPAL in v4/sets/kitchen.ts is LAB's stand-in). DIRECTOR: none blocking.
- 16:25 done: DIRECTOR's round-2 must-fixes: (1) v02 G0 + v03 R1 framed for a head <= 25 % (projection 22 / 25 %);
  (2) v04 D0 + v05 F0/F1 re-aimed: the dome at 60-61 % (above the 64 % line); (3) the lamp: dark housing + navy
  backplate with a white rim, and an IDLE glow: each lens glows dim in its own colour at frame 0 (green left, red right);
  (4) v03 push-in R0 (z 2.75) -> R1 (z 1.6): head 17 -> 25 %. LOOK's LAB4_RIG (exposure 1.75, sun 13 deg) blew her face
  white and washed out the green and the red on stills f0 / f80 / f185 / f235 (r5): the set uses LAB_RIG + sun 95 / 25
  again (LOOK's palette, surfaces, ceiling lumens and labWash kept). The HALL re-laid as an EXAM HALL seen from the
  front (two columns of 12 running away from the lens: portrait frames hold all 24); score stands at the far ends.
  next: stills r6 (0 ... 1900), the sheet in pointing_preview, report.
- 15:55 done: LOOK's LAB4 package wired (yellow walls, cobalt lamp + button base, red cap, labWash two lights, LAB4_RIG);
  the 1994 HALL built (`v4/sets/lab_hall.ts`, 40 m along +X: 2 x 12 stations with a mini signal + one button each, 24
  CAST cards, "1994" board, LED counter 1..97 then 98/99/100 on "hundred", 101 on "red", score stands 5 OF 12 / 0 OF 12,
  the big knife switch flipping on "trap", the card with the pointing hand, 5 X's on "Five", the red flood); the new
  morning KITCHEN (`v4/sets/kitchen.ts`: open lit fridge + cereal box, kettle steam, cat walking, swinging cupboard door,
  clock). Cameras for every lab role + the kitchen. next: stills of all of them, fix, sheet in pointing_preview.
- 15:40 done: the opening REBUILT in `v4/sets/lab.ts` + `lab_plan.ts`: a test BOOTH (partition with an observation window,
  the researcher behind the glass writing, the wall clock, a strip of 9 blinking lamps), a horizontal two-lens SIGNAL
  HEAD (green left, red right, hoods, orange backplate, hung from the ceiling: no stand), a big red dome BUTTON on a navy
  drum, the desk with a plain blue front (the caption band sits on it); LOOK's `LAB_PAL` / `LAB_RIG` / `signalWash`;
  times = timeline `EV`; shots found by ROLE (line / word of their cut rule), cameras per role (v01 push+rest, v02 held
  cut-in, v03 push-in, v04 / v05 held close-ups, v18 glide, v36 glides BACK INTO frame 0's lens). Sandbox `KitHomeHook`
  now = the lab set alone on the FILM's frames (film_hook.ts). next: stills loop on f0 / 60 / 117 / 160 / 210.
- CHECK IN THE RENDER (motion only, the owner renders on the other PC): v01 push (0.3 m) then rest; the six green flashes
  on the Go words + the button's sink + glow per press; the red flood (panels drop to 35 %); the lamp strip blinking
  idly, then all red from the red; the researcher's writing nods + his look up at the red; the clock's second hand;
  the X's pop (0.2 s overshoot); v36 -> v01 loop cut (same lens, arm drops).

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

# kit/vehicles (TRAIN owner, "pointing" film): NOTES + API

## PAUSED 2026-11-21 ~10:00 (TRAIN #3) - READ THIS FIRST
STATE: every TRAIN file whole, tsc 0 (film + sandbox kit_vehicles, 09:58). No render / RAM token / stills slot of mine
(the last steam pass was stopped while waiting for the token: nothing half-written). Clips of my shots:
`out/pointing_v4_train/shots/draft/`; last sheet `pointing_preview/TRAIN_r3_stills_0859 (DRAFT).jpg` (older than below).
**Lead 09:15 list, status:**
- v20 PROFILE view: CODED + SEEN on a whole clip (09:35, train_shots26): lens behind-right inside the cab (cab.ts
  VIEWS.v20), driver turned toward a signal on the RIGHT of the track (today.ts SIGNAL_SIDE = 1, DRIVER_YAW, own
  signalJP mirrored at x +3), face in profile, sleeve + white glove across the bright windscreen, mouth open on
  "Signal". Then signal lead 88 -> 70 m (bigger): CODED, NOT seen. v21 rendered with it (kid copies; NOT re-checked).
- v23b semaphore as the SUBJECT: CODED + SEEN (train_shots25 pass, 09:30): a stand-in on the line through the window,
  sharp 0.3 s then a two-copy double image; boiler low.
- v28 broken line: CODED + SEEN once (09:30: from over the tender: Hori profile out of the left side, coal man at the
  firehole, boss foreground right); then lens moved (boss was cut by the right edge, too much dark floor): CODED, NOT seen.
- tighter cab framing v24 / v25: v24 SEEN ok; v25 tightened (SEEN) then Hori's cap off the left edge: CODED, NOT seen.
- v26 semaphore growing (18 m on the cut): CODED + SEEN ok.
- true black engine (steam_loco paint #0f0f10, duller clearcoat): CODED + SEEN (v22 / v26 read black now).
**Next:** one draft pass of v20 v21 v22-v30 (`--shots v20,v21,v22,v23,v23b,v24,v25,v26,v27,v28,v29,v30`), look at
every 2nd frame + 180 px wide, then the sheet `TRAIN_r3b_stills_<HHMM> (DRAFT).jpg` and the report to the lead.
**CAST's finding to check:** the streaming scenery may cast strobing shadows on the cards (v20, v23): look for
flicker on the faces frame to frame; if so, the lineside / steam-world shadow casters (trees, poles) near the lens
may need castShadow off in those shots.
**FOR CAST:** see the "FOR CAST (R2b, 09:50)" block below (v20 profile point, v28 three directions) + the fix-round-2
block (v25 shovel + head turn, v28 clapping, v30 eyes open no blink, v23 lean over 6-8 f).

## V6 HANDOVER (2026-11-21 ~01:55, laptop; TRAIN #3) - READ THIS FIRST
**DONE R2 (09:15):** sheet `pointing_preview/TRAIN_r3_stills_0859 (DRAFT).jpg` (pass 2; v20 + v23b re-rendered
after it: v20 framed left a touch, v23b through the window centre at the semaphore: sharp 0.3 s, then a two-copy
double image); FIX_LIST_TRAIN.md ticked; retime ALL CHECKS PASS; tsc clean in TRAIN files (an error sits in the
DIRECTOR's shot_plan.ts). No render / slot / token of mine left. NEXT: v20 cap at the left edge + ceiling; v23b
semaphore bigger; v19 (STATION's lens); CAST's acting rows for v25 / v28 / v30.
**FOR CAST (R2b, 09:50: supersedes the v20 / v28 lines below):**
- v20: the lens is now behind-RIGHT of him inside the cab; he is turned toward a signal on the RIGHT of the track
  (yaw PI - 1.1) so his face shows in PROFILE facing screen right; his RIGHT arm (auto) points along the world aim
  (a touch above the lamp) = across the middle of the frame, the white glove on the bright windscreen. Mouth open from
  "Signal" (as now). Please keep his eyes on the lamp and the glove 1.35x.
- v28: from over the tender looking forward: Hori far left at his window turned to his LEFT side (yaw -PI/2, profile),
  shouting out of the side opening; the coal man by the firehole (0.55, 6.7) facing it, BENT low over the shovel
  (a low pose); the boss foreground right in profile facing Hori (yaw -2.13), delighted: clapping + small bounces.
  Nobody looks at the lens.
**FOR CAST (fix round 2, 08:45, TRAIN's new pictures; TRAIN stages, CAST acts):**
- v20: INSIDE over his right shoulder again (lead R2: the light windscreen behind the glove, a real signal 48 m
  ahead): the driver's point uses the WORLD aim now (no `dir`, no `fwd`: today.ts clears fwd for the driver), so the
  2D sleeve goes from his shoulder to the signal's place on screen; please keep `gap` so the glove stops short of
  the lamp, glove 1.35x. His point holds from "point" to the end of v21 (TRAIN merges your two rows).
- v21: the driver = the same world aim (his level point at the same signal, seen through the windscreen); the kid's
  copy `fwd` [1.05, -0.6] (TRAIN's CAR_AIM.kid), mouth shut.
- v25 (RE-STAGE, wide side cut-away from the left): Hori front-left, 3/4 to us, SHOUTING toward the coal man
  (mouth open on "So he shouted"); the coal man back-right, 3/4 to us, MID-SHOVEL at the firehole (shovel swing),
  then turning his head to look down the line ahead (screen LEFT) on "signal". Fire glow on him.
- v26: NO people (the view down the line). The coal man's `shade` row no longer shows.
- v27: the coal man turns to us in the first 5 frames (TRAIN's yaw), then the "CLEAR!" grin (keep).
- v28 (RE-STAGE, from outside the RIGHT side): three men: the boss wedged into the back-right corner nearest us,
  3/4, DELIGHTED: bouncing + clapping (a clap every ~8 f, small hops) on "loved it"; the coal man in the middle
  shovelling (facing screen right = the firehole); Hori at his window far side, turned back toward us shouting.
- v30 (RE-STAGE): Hori's FACE big in the foreground, 3/4 front (the lens sits by the front plate, right of him),
  eyes OPEN, never blinking, looking ahead (toward the window = just past the lens on screen right); the boss small
  behind him, beaming, a slow proud nod on "knew".
- Steam driver: never blinks (lead R2). v23: the lean acted over 6-8 frames.
**FIX ROUND 2 (09:05) done in code, render next:** v20 INSIDE over his shoulder with the WORLD aim (auto arm, gap
0.25), held to v21's end; v21 driver = the same world aim; v22 pass-by lens (CAMS.v22: the engine overtakes the lens
while it pans, low horizon); v23b aimed at the semaphore, the REAL semaphore sharp for 0.3 s then a two-copy soft
double image drifting apart; v25 the wide side cut-away (both whole, coal man 3/4 mid-shovel, fire 2.2); v26 the view
down the line only (no people, semaphore 30 m on the cut); v27 coal man 15 cm back (rail off his body), lower lens;
v28 three-shot from outside the RIGHT side (boss wedged in the back-right corner nearest us); v30 by the front plate:
Hori's face big, boss small behind; steam wisps roll across every cab shot; the fire door eases (v23 light pop).
v19 is STATION's camera (jp_platform.ts): asked the lead. (tsc: only an error in the DIRECTOR's shot_plan.ts.)
**09:25 (R2 pass 1 looked at, first / middle / last of all 12):** good: v20 sleeve + glove up toward the green signal
across the windscreen, v21, v22 (the engine overtakes the lens: front -> cab -> tender), v23 (the brass window rim by
his face, the fire), v25 both whole, v26 the line only, v29, v30 Hori's face big. Fixed after it: v23b's far look
point let the DIRECTOR's drift push the lens out through the window again (near look point on the same line); the cab
wisps crossed faces in v24 / v25 (now above the roof line); v28 the boss's face cut by the left edge (lens back); v30
the boss was out of frame (now behind Hori's left shoulder); v20 closer (his whole head, less ceiling). Pass 2:
train_shots22.log.
**LATEST (06:15, lead's urgent v20):** v20 is SIDE-ON again (`V20_SIDE_ON = true`): his face in profile in the crew
window (sill 0.72), CAST's navy sleeve + white glove OUT in direction mode (SIDE.dirAim [-1.45, -0.95], his near/left
arm) from "point" to the cut, level with a real signal head (black backplate with a white rim, dark upper lens, lit
GREEN lower lens under hoods, x0.75) at lampY 1.5 m above the floor just ahead of his pane; long lens fov 27.5 -> 25.5;
the world slides behind at 2.5 m/s. Whole shot rendered + every 2nd frame looked at (scratchpad train_v20_e2b.jpg);
frame: `pointing_preview/TRAIN_v20_point_0548 (DRAFT).jpg`. FOR CAST: the side-on point uses `dir` (screen direction,
head heights from the chest) [-1.45, -0.95] = up-left, glove level with the lamp centre (1.5 m above the car floor);
the inside build uses INSIDE_AIM, the car build CAR_AIM.driver. The sheet TRAIN_v5_stills_0530 still shows the INSIDE
v20 of pass 16 (superseded).
**05:50 (audit round 1):** v20 is the INSIDE driver-cam again (`V20_SIDE_ON = false`; the side-on build is
kept behind the flag): CAST's sleeve arm in direction mode (today.ts INSIDE_AIM) up-right across the windscreen to a
signal 48 m ahead; ONE held driver point from "point" to the end of v21 on every lens (CAST's two fwd rows merged,
today.ts). Steam: v22 wide (whole engine, blue sky, plume, no poles); v23 3/4 from behind-right outside (cutawayR,
brass window rims); v23b fov 74 + a dark blurred semaphore 24 m ahead + steam wisps; v24 wider; v25 from the fall plate
(the fire the warm centre); v26 semaphore 15 m + 3/4-rear lens; v27 low lens + the coal man's 5-frame turn on the cut
(crewAt); v28 front corner low + level, coal man apart from the boss, no poles; v29 boss + notebook (face whole); v30
from the right side. Coal = one heap; cab liner dark umber; fire per shot (`fire`); cab sway (shake, enveloped).
OPEN: FIX_LIST_TRAIN items for others: glasses (CAST), "RULE" -> scribbles + the hand on the notebook (CAST), engine
navy -> black + green field-sky in v27 (LOOK); v19 is STATION's. Last pass: train_shots16.log (waits on the token).
**06:00 (pass 16 done, log clean; sheet `pointing_preview/TRAIN_v5_stills_<HHMM> (DRAFT).jpg`):** motion (my
train_motion.py, share of pixels changing per frame pair, caption band masked): v20 14, v21 21, v22 23, v23 24, v23b
29 (wisps: no frozen pairs now; it was 21 %), v24 21, v25 19, v26 22, v27 16, v28 24, v29 13, v30 36 %. LEAD 05:55:
the cab INSIDE two-tone: steam_loco `cabInnerUpper` (buff #e2cfa4 upper walls, spectacle band + roof underside),
dark umber below; outside black. Steam pass: train_shots17.log.
**EARLIER (03:10):** sheet `pointing_preview/TRAIN_v5_stills_0306 (DRAFT).jpg` (whole-shot draft renders on the new
clock: v20 969-1034, v21 1035-1056); tsc 0 (film + sandbox); retime_v4 ALL CHECKS PASS (02:40); no render / slot /
token of mine left. Beige (LOOK's beigemap.py on the mid frames, scratchpad train_beige_final.jpg): v20 36 % (the
white upper car body: LOOK, a tint or a band), v21 9, v22 12, v23 15, v23b 43 (misted glass + sky: the idea), v24 13,
v25 16, v26 22, v27 13, v28 7, v29 5, v30 26. Fire: per-shot `fire` in v4/sets/steam.ts STAGE (the floor glows orange
in v23 / v25 / v30; the men's card faces barely take the light: the glow sprite sits behind Hori's legs in the
side views). The lines dated below are the history.
**FIX ROUND 1 (04:10, after the first full draft, audit_r1):** v20 the glove sat on the crew window's sill line:
kits now take a 3rd crewWindow value = the sill height (trainJP + cabJP), v20 sill 0.72 (was 0.98); the world behind
v20 slides at 2.5 m/s (SIDE.worldSpeed) while the lamp creeps (its post foot is below the frame). Steam cab lenses
v23 / v24 / v25 / v28 / v30 get a small cab sway (shake 0.35-0.5, swells in, dies before the rest). CAST builds the
uniform-sleeve arm (lead). Render: train_shots11.log (first try failed on STATION's half-saved ny_station.ts).
**AUDIT R1 (04:45, FIX_LIST_TRAIN.md):** v20 BACK INSIDE (`V20_SIDE_ON = false`): the driver-cam over his right
shoulder, partition + seat back hidden, his arm across the bright windscreen to a real signal head 48 m ahead (was
82), one 0.5 m push. v21: the driver HOLDS the same world-aim point (no fist before v21 ends; earFrom "@v21.end+30").
Steam: cab liner dark umber (#3b2a20, facts: black engine); poles hideable (`noPoles`: v22, v28); v22 wider (the whole
engine + plume); v23 over his shoulder at the round window; v23b fov 74 (the whole porthole), darker + bigger blurred
semaphore 24 m ahead; v24 wider (no head at an edge); v25 from behind over the fall plate (fire centre, Hori turned
shouting, the coal man looks up); v26 semaphore 15 m on the cut + a 3/4-rear lens; v27 low lens (sky behind him);
v28 lower + level (roof edge), coal man further from the boss; v30 Hori back in frame. Stills: train_stills_a1.log.
**05:05 (a1 stills looked at):** v22 now the whole engine, blue sky, white plume, no pole: good. v24 both heads inside:
good. v20 inside: his world-aim arm hid in his back again -> DIRECTION MODE inside too (INSIDE_AIM [1.55, -0.7]: his
right arm up-right across the windscreen toward the signal in the right pane), lens 0.6 m further back (head ~1/5).
v23 from straight behind: his head hid the window -> 3/4 from the fireman's side (profile + window). v25 wider (Hori's
face at the edge), coal man further right. v27 (DIRECTOR: now opens on "man."): the coal man turns from the line to
us in its first 5 frames (crewAt, cued on the cut), then grins. Pass: train_shots13.log (retries on others' files).
**05:25 (pass 13 looked at, every shot first / middle / last):** good: v21 (kid's face + raised copy, driver's arm up
behind the glass), v22, v23b (whole porthole), v24, v26, v27 (turns from the line to us, then grins), v28, v29, v30.
Fixed: v20 showed NO point: CAST changed the driver to two `point` rows with `fwd` (a gap between "shout" and
"clear"): today.ts now plays ONE held point from "point" to the end of v21 in direction mode (fwd cleared) on every
lens; v23 inside put his head at 40 %: lens outside the right side (cutawayR); v25's lower half was the dark tender
front: lens over the fall plate, fov 70. Render v20 v21 v23 v25: train_shots14.log.
**05:45 (passes 14-15 looked at):** v20 now SHOWS the point: CAST's navy sleeve arm + white glove up-right across the
windscreen toward the green signal (INSIDE_AIM [1.25, -1.25]: at [1.55, -0.7] the glove stopped over the desk, under
the caption band). v25 from the fall plate: the fire is the warm centre (firehole + gauge glowing between the men).
v23 3/4 from behind-right, outside (cutawayR): his profile peering at the plate; the window hid behind his nose ->
brass rims on both spectacle windows (steam_loco), Hori 17 cm back from the plate. Final pass: train_shots16.log.
STATE: every TRAIN file whole; tsc 0 (film + sandbox kit_vehicles); retime_v4.py --no-script ALL CHECKS PASS (23:58);
no stills slot / RAM token / render of mine left (check: the last job was `--shots v20,v30`, train_shots5.log).
SHEET: `pointing_preview/TRAIN_v5_stills_0146 (DRAFT).jpg` = first / middle / last frame of all 12 shots from the
pass-4 draft shot renders (`out/pointing_v4_train/shots/draft/`), + v20 / v30 re-rendered after it (see below).
**Shots now (v20-v30):** v20 SIDE-ON EXTERIOR (`V20_SIDE_ON = true`): the driver in his crew window, the near arm +
white glove OUT at the green lamp for the whole shot (CAST call in direction mode `SIDE.dirAim`, no chest fist in
this lens), one 0.7 m push, then rest. v21 the kid three-quarter to us (face + open mouth), his copy-point raised to
the right (CAST `fwd` set from CAR_AIM.kid), the driver beyond the glass with his glove up-left (seat back hidden in
the car build: cabJP `seatBack`). v22 the event + stakes / water glints / egrets. v23 wide side cut-away, Hori
peering at the plate. v23b his view (near look point: the DIRECTOR's drift no longer pushes through the plate). v24
CLOSE two-shot, his shout toward us. v25 the ONE wide side cut-away (two men face each other). v26 the coal man
leaning out at the semaphore. v27 his grin. v28 from the front corner looking back: the boss + coal man, country
behind. v29 the notebook close, RULE + underline. v30 from outside the RIGHT side (kit `cutawayR`): Hori in profile
nose to his plate + the boss beaming behind him. Shake (v22 / v23b) swells in + dies out; no shot starts or ends shaking.
**Frames checked** (stills + clips, every 2nd frame on the clip sheets + first / middle / last): see the dated lines
below (rounds 1-3 stills, clips c1, cold stills 36 frames, r5 stills, pass-4 clips).
**NOT GOOD YET / for others:** CAST: v20 the glove is small at phone size (a bigger hand or a longer arm in his
side-on call would make the point "proud"); v24 first frame (f1262) Hori's eyes read as a squint on the turn (fact
rule: never slit eyes); v21 the kid's copy is near level (fwd -0.6 asked; CAST's `fwd` maths turns it flatter);
v26 the coal man is seen from behind (his shade reads only as a raised arm). LOOK: beige by beigemap.py before the
DIRECTOR's wrap: v20 33 % (white car body), v22 25, v23 28, v23b 35, v24 18, v25 29, v26 35, v27 18, v28 14, v29 30,
v30 37 % (sky, white smoke, white card faces); the fire glow inside the cab is weak (the firehole faces back: from the
side it is edge-on; a warmer glow on the floor / men would make it the "warm centre"); CAR_COLORS (today.ts) are
values for LOOK to tune. DIRECTOR: `withDrift` is a share of the LOOK distance: any owner lens with a far look point
(v23b had 47 m) is pushed metres through walls; RIGOPTS in v4/sets/steam.ts still unread by film.ts.
**02:00 (lead via CAST):** v21 the kid's thin ink arm ran along the chrome handrail under the partition window: kit
cabJP `passengerRails: false` in the car build (today.ts). v21 re-render queued (train_shots6.log; the DIRECTOR held
the token): STOPPED (token busy); checked instead on cold stills f1023 / f1040 / f1056
(out/pointing_v4_train_v21/stills/draft/): rail gone, the kid's arm reads on the orange partition. Still weak: the
driver's raised glove beyond the glass sits next to the black radio handset (reads half like "holding a phone"); a
grey wall handrail at the left edge ends at the kid's head (interior_jp: drop or move it next). Sheet now
`pointing_preview/TRAIN_v5_stills_0214 (DRAFT).jpg` (v21 row = these stills). No render / slot / token of mine left.
**02:25 (lead's 4 points after sheet 0214):** v20 = a LONG lens (fov ~16, 7 m out): driver card moved to the glass
(x -1.12), the lamp a small head (x0.62) just ahead of his pane level with the glove, glove dirAim [-1.6, -0.3],
creep 0.05 m/s (geometry: side-on with the lamp beside him, a portrait frame fits head + arm + gap + lamp only at a
head of ~1/7; at 1/5 the lamp cannot be in frame). v20 / v21: radio handset off (cabJP `handset`), car front-zone
wall handrails off (interiorJP `frontRails`). v29: the notebook + hands, face out of frame. Fire: steam_loco fire light
x2.4 brighter + wider + a flickering warm floor pool before the firehole. tsc 0. Stills: out/pointing_v4_train_r6/.
**02:40:** r6 / r7 stills (out/pointing_v4_train_r6/, _r7/): v20 at fov 16 put his head at ~28 % and the glove into
the lamp's halo; now fov 25 -> 23 (head ~1/6), lamp z 0.3 + a smaller halo: forearm + white glove cross the window
toward the whole lamp with a gap (f975 / f1000 / f1020). v29: "face out of frame" was impossible (the page sits right
under his chin): face whole + notebook (head ~1/3; the cab is too short to go wider), coal man AWAY. v21 f1040: rail +
handset gone. Fire pool visible on the floor in v23 / v25 (subtle). retime_v4 ALL CHECKS PASS (02:40). Final draft
pass of the 12 shots queued (train_shots7.log).
**02:50 (lead / DIRECTOR batch 3):** the 40 coal lumps scattered over the cab floor (black blobs in v24 / v25 / v28)
are now ONE low heap on the shovel plate by the tender (steam_loco). DIRECTOR now merges my RIGOPTS per shot and caps
the drift in metres: v24's 0.6 m push stays outside the cab (lens behind-left, beside the tender), v30's 0.6 m pull
goes further out from the right side (no wall behind it). Pass 7 stopped (old bundle); pass 8 queued (train_shots8.log).
**03:05:** pass 8 clean (coal now one heap, v28 shows it). The DIRECTOR re-timed: v20 = 969-1035 (ends on "Signal"),
v21 = 1035-1057: the side-on call's fist now only from "@v21" (`earFrom`), so the glove is OUT for all of v20 (clip
checked every 3rd frame, the mouth opens on "SIGNAL"). FIRE (LOOK: the strength is mine): steam_loco `fireK(t)` (x the
light, the floor pool, + a warm spill light on the men and an additive glow at the firehole when > 1), CrewPlan
`fire`: v23 2.2, v25 2.2, v28 1.6, v30 2.0 (v24 stays 1: already strong). Steam pass queued (train_shots10.log).
**Next:** after the DIRECTOR's set wrap: LOOK's measuring (`out/pointing/look_test/v5/beigemap.py`) on fresh stills of
v20-v30; one more cold draft pass of the 12 shots; the arm-out recount with CAST.

## ROUND 4 ON THE LAPTOP (TRAIN #3, 2026-11-20 from 22:20; newest line last)
- done 22:45: `V20_SIDE_ON = true`; today.ts side-on driver call in CAST's DIRECTION MODE (`dirFrom` = the point cue,
  `dirAim` = SIDE.dirAim [-1.5, -0.35]: the near arm straight out ahead); v20 side lens = one 0.5 m push. steam.ts:
  v23 / v24 / v25 / v28 / v29 / v30 re-staged as WIDE SIDE CUT-AWAYS (lens outside the left side, `cutaway: true`),
  v26 slide 0.7 m, shake (v22, v23b) swells in + dies out (never starts / ends shaking). tsc 0. Backups of the round-3
  files: scratchpad steam_v4_before_r4.ts, cab.ts, today.ts, car.ts.
- next: draft stills 972..1572 (out/pointing_v4_train/stills/draft/), look, fix; then v21 (kid's face) + v22 foreground.
- done 23:10: round-1 stills looked at: v20 side-on POINT READS (glove level with the green lamp, f972 / f992); v21 kid
  turned 3/4 (KID_YAW) = his face + open mouth read (f1032 / f1048) but the driver beyond the glass hid behind his red
  seat; steam cut-aways read (green country + sky, both men) but heads ~21 % and the drain-cock fog filled the bottom
  third: lenses pulled back ~25 %, `cocks: 0` in the cab shots, frame centred forward (Hori's face was at the left
  edge in v23 / v30). v20: lamp 1.15 -> 1.3, dirAim [-1.45, -0.72] (a prouder, higher arm), lens 0.5 m further out.
  v21 lens raised to 1.32 (over the driver's seat back). v22: boundary stakes + water glints (steam_world). tsc 0.
- next: round-2 stills (stills2.log), then draft clips v20 / v21 / v23 / v30.
- done 23:40: round-2 stills looked at (f975 990 1015 1030 1048 1062 1100 1138 1146 1200 1216 1240 1285 1330 1450
  1510 1540). Fixed: BUG v23b: the DIRECTOR's drift (+0.14 x the look distance) pushed the lens 6.6 m out through the
  front plate (its look point was 47 m ahead): look point now 0.66 m ahead on the same line; Hori's flat card went
  through the front plate (face cut, v23 / v30): Hori z 6.62 -> 6.76..6.8; cab lenses 13 % closer (heads ~14 %);
  v22 stakes nearer the reeds, shorter (one filled the frame like a pole); v21: cabJP `seatBack` option (kit) hides
  the driver's seat back + headrest in the car build (they hid his body + glove from the kid's lens); kid no glassPress.
- next: round-3 stills (train_stills3.log), then draft clips.
- done 00:05: round-3 stills looked at (f980 1030 1050 1080 1120 1150 1205 1218 1255 1340 1460 1512 1530 1570): v20
  reads (glove level with the lamp), v23 / v25 / v28 / v30 wide cut-aways read (v30: Hori's profile with glasses at
  the plate + the boss beaming behind: both faces), v23b window back in frame, v22 stakes fine. v21: the driver now
  shows (seat back gone) but his world point ran into the picture: today.ts car build = driver call in DIRECTION MODE
  from "@v21" (CAR_AIM.driver up-left over the kid's window), the kid's copy dir CAR_AIM.kid (raised, up-right).
  v29: Hori AWAY (his body was cut by the left edge).
- next: draft render of all 12 shots (RAM token), every 2nd frame + first / middle / last.
- done 00:20: glides (DIRECTOR's probe_cams_v4): v23 0.11 -> 0.26 %/f, v25 0.14 -> 0.37, v26 0.12 -> 0.19, v28
  0.10 -> 0.25 (a slide along the cab + the push), v20 a slide added. TRAIN cameras done except v24 / v27 / v30 /
  v23b / v21 (still lenses: the DIRECTOR's drift). tsc 0. Draft render of the 12 shots queued (train_shots1.log,
  out/pointing_v4_train/shots/draft/).
  (clock note: the "00:05 / 00:20" stamps above were really ~23:25 / ~23:40)
- done 23:55 (draft clips c1, all 12 shots, every 2nd frame + first / middle / last, scratchpad train_c1/): log clean
  (no error, NaN, unplayed beat). Seen + fixed: v20 the slide pushed him off the right edge (now a straight 0.7 m
  push); v21 CAST's new `fwd` on the kid's point overrides `dir` + "@v21" did not switch the driver's call mode (now
  `fwd` for the kid, the call's own cue + his left arm for the driver); v23 / v30 Hori's peer head went into the
  plate shadow (z 6.92 / 6.9; v30 yaw -(P-0.3), was ambiguous P); v25 first frame had Hori's face at the edge (slide
  re-aimed); v26 pulled back + no drain-cock puffs; v22 stakes every 9 m (every 4.6 m they strobed). Good as is: v23
  wide two-shot, v23b, v24 (his shout toward us), v27, v28 (three men, the boss beaming), v29 RULE, v30 both faces.
- next: draft pass 2 (train_shots2.log), look again, then the sheet in pointing_preview/.
- done 00:40: COLD-START stills (fresh bundle, out/pointing_v4_train_cold/stills/draft/, first / middle / last of all
  12 shots: f969 996 1022 1023 1040 1056 1057 1100 1143 1144 1179 1213 1214 1238 1261 1262 1283 1304 1305 1332 1358
  1359 1377 1395 1396 1408 1419 1420 1457 1493 1494 1509 1523 1524 1550 1576). Log clean. Steam v22-v30 hold up.
  Fixed after it: v20 the push still cut his back at the last frame (lens centred z 0.8 now); v21 the driver's raised
  glove met the kid's hand over the kid's head (CAR_AIM.driver straight up over his own shoulder, the kid's copy
  lower). Pass 2 was stopped (its bundle was older); pass 3 queued (train_shots3.log). Other owners hold the token.
- done 01:05 (LEAD 00:55 "five shots, one picture"): v25 keeps the wide side cut-away; v24 = a closer two-shot (waist
  up, his face toward the behind-left lens); v28 = inside from the front-left corner looking back (Hori behind the
  lens, the boss in the back-right corner, the coal man at the tender, country behind); v29 = the notebook close
  ("RULE"); v30 = from outside the RIGHT side looking in (kit: steam_loco `cutawayR`, CrewPlan.cutawayR): Hori big in
  profile at his plate + the boss beaming behind, both faces ~1/4. v20 side-on: `earFrom` removed in that lens (the
  glove stays OUT for the whole shot; the fist comes after the cut). v21: kid x -1.06, driver's arm 45 deg up-left.
  tsc 0 (film + sandbox). Stills queued (train_stills5.log).
- done 01:20: stills r5 (f1000 1018 1036 1052 1262 1285 1304 1420 1460 1493 1494 1509 1523 1524 1550 1576): the five
  shots are now five pictures (v24 close two-shot shouting at us, v28 front-corner looking back at the boss + coal
  man with trees / sky, v29 notebook close, v30 from the right side). Fixed: v29 "RULE" was cut by the right edge +
  his face ~45 % (re-aimed on the page, further back); v30 the boss stood nearer the lens than Hori (now behind him,
  x -0.98); v28 the coal man's head cut by the right edge; v20 lens 0.5 m closer (the glove read small).
- next: pass 4 clips (train_shots4.log) -> every 2nd frame + first / middle / last -> the sheet in pointing_preview/.

## V5 HANDOVER (2026-11-20 evening, new PC -> next PC; TRAIN #2)
STATE: every TRAIN file whole. tsc on src/videos3/pointing/tsconfig.json shows NO error in TRAIN files (at 19:25 the
only errors were STATION's half-edited v4/sets/ny_station.ts, lines 323-325); sandbox tsconfig 0. No render, no stills
slot, no RAM token of mine (my last v20 draft clip was stopped while waiting for the token: nothing written).
**DONE + CHECKED (draft shot renders, every 2nd frame + first / middle / last on the final clock 2054 f):** v20 inside
version (partition cut-away), v21-v30 + v23b. Frames: see "done 18:00" below; later stills f971-f1040 (v20 side-on /
v21), f1180-f1550 (v23-v30), clips v20 / v21 / v23 / v27 at 18:30-19:05. Sheets: pointing_preview/
TRAIN_v4_steam_and_today_v20-v30_DRAFT_stills_round2.jpg, TRAIN_v20_compare_inside_vs_sideon_DRAFT.jpg.
**FILES:** v4/sets/steam.ts (STAGE, VIEWS, crewAt, CAMS), v4/sets/today.ts (buildToday: inside + side-on + car colours,
SIDE, CAR_COLORS), v4/sets/cab.ts (flag `V20_SIDE_ON`, VIEWS / VIEWS_SIDE), v4/sets/car.ts; sets/steam.ts
(buildSteamWith); kit: steam_loco.ts (cabInner, cabFill, needle), steam_world.ts (signalVisible), steam_fx.ts, cab_jp.ts
(partition, carFace / doorPanel, crewWindow), train_jp.ts (crewWindow), interior_jp.ts (colors).
**HALF-DONE (exact):** v20 SIDE-ON (lead's decision: it becomes v20 as soon as the arm reads). `V20_SIDE_ON = false` in
v4/sets/cab.ts (the inside version is the checked one). Side-on state in v4/sets/today.ts (`SIDE`, `sideOn` branch of
buildToday) + cab.ts `VIEWS_SIDE`: the crew window widened to one pane (SIDE.crewWindow [0.5, 1.38]), the driver at
z 1.25, ONE-lens green signal at the cab's front corner (lamp y 1.15, face turned to the lens), aim = straight forward
(`sideAim`), no extinguisher / red flag behind him (cab_jp `crewWindow`). On stills f975 / f990 (before the last
tweaks) the white glove DOES point forward-left toward the lamp, then the fist on "shout" (f1015). The LAST tweaks
(lamp 1.25 -> 1.15, lens closer x -4.75 fov 44, extinguisher off) are NOT yet seen on a frame.
**OPEN, in order (from the lead's latest messages; none cancelled):**
1. v20 side-on: render it (flag true), check every 2nd frame: the glove clearly beyond his face, level with the green
   lamp, a short gap, snap -> hold 25-30 f -> fist on "shout"; the window frame never cuts the hand; head ~1/5 of the
   height; then set `V20_SIDE_ON = true`, tsc, retime_v4.py --no-script, and a 3-frame sheet (before / held / fist) in
   pointing_preview/. Give v20 one glide ~0.3 %/frame (a slow push toward window + signal, e.g. 0.6 m) then a 15-20 f
   rest: VIEWS_SIDE.v20 a -> b is only 0.12 m now (the DIRECTOR's probe: "v20 completely still").
2. DIRECTOR's camera probe: raise glides to >= 0.2 %/frame on v23 (0.11), v25 (0.085), v26 (0.053, moves only ~6 f),
   v28 (0.087) in v4/sets/steam.ts VIEWS (bigger a -> b distances / fov change). His note "no cab shake in the last
   15 f of v24-v30": my v24-v30 lenses have NO shake (only v22 0.1 and v23b 0.22, frozen at the rest by `lens()` +
   film.ts withRest); the motion his cells see in the rests is the world streaming, smoke and CAST's `alive`: tell him.
   Then write "TRAIN cameras done" here.
3. v21: the kid's copy-point bigger (CAST); the driver beyond the glass mid-point on the cut (check the beat timing on
   a still at v21's first frame); the car now coloured (CAR_COLORS: LOOK may tune / move to look.ts).
4. v26: the coal man's hand shading his eyes (CAST); side-on with the post in frame is not possible (geometry).
5. Re-check all my shots on cold stills with CAST's latest (Hori's 20 deg lean v23 / v30, the open shout v24, the grin
   v27, RULE notebook v29, the kid's yellow tee).
**COMMANDS (Git Bash, from studio/, `export RAM_ME=TRAIN`):**
- tsc: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` and `-p src/sandboxes/kit_vehicles/tsconfig.json`
- frames of my shots: `cd .. && node briefs/v3/pointing/director/probe_v4.mjs | grep -E "steam|cab |car "`
- stills: `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --stills <f,f> --out out/pointing_v4/`
  (-> out/pointing_v4/stills/draft/f<frame>.jpg)
- a whole shot at draft: `... --quality draft --shots v20 --conc 1 --out out/pointing_v4/` (-> out/pointing_v4/shots/draft/v20_<hash>.mp4),
  sheet: `ffmpeg -i <mp4> -vf "select=not(mod(n\,2)),scale=240:426,tile=7x4" -frames:v 1 <sheet.jpg>`
- checks: `cd .. && PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/retime_v4.py --no-script`
- the beat log: any `[today]` / `[steam v4]` warning line in a render log = a beat that does not resolve.

## V4 ON THE NEW PC (TRAIN #2, 2026-11-20 from 15:30; newest line last)
- done 15:55: steam staged on the v4 ids in `videos3/pointing/v4/sets/steam.ts` (STAGE per shot, CAST's BEATS_V4 on the
  crew via castCardOf, CAMS v22-v30 + v23b, soft-blur semaphore + misted round glass for v23b, white egrets in v22,
  RIGOPTS per shot for the DIRECTOR); `sets/steam.ts` = `buildSteamWith({crew, cast})`; kit: warm red cab liners, a
  cab fill light, a trembling gauge needle, whiter smoke shade, `signalVisible`. Today's train: `v4/sets/today.ts`
  (shared), `v4/sets/cab.ts` (v20), `v4/sets/car.ts` (v21). tsc 0.
- next: draft stills round 2 (all 12 shots), fix, repeat; v19 = STATION's set (request in the report).
- done 16:20: rounds 1-2 of draft stills (out/pointing_v4/stills/draft/f<frame>.jpg): v23 lens moved to the
  fireman's side (Hori in PROFILE with glasses; behind him he showed his back), v30 = v23's lens again (bookend; from
  outside the round window the boss hid behind the plate), v24 from the back of the cab, v26 straight behind the coal
  man (the 3/4 lens lost him: portrait frames are only ~35 deg wide), v20 moved INSIDE the cab (the first lens sat
  behind the partition: no driver), v21 the kid at the LEFT partition window behind the driver.
- next: round 3 stills, the sheet in pointing_preview/.
- done 17:45: rounds 3-8 of stills + TWO draft renders of all my shots (v20..v30 + v23b, `out/pointing_v4/shots/
  draft/<id>_<hash>.mp4`; the second from a cold start after the last fixes except v20 / v29 lens tweaks, which were
  checked on stills f990 f1015 f1510). Every 2nd frame looked at on sheets (scratchpad train_sheets/<id>.jpg), first /
  middle / last frame of every shot (train_sheets/fml_all.jpg). Fixes from them: drain-cock steam hidden in v22
  (the plume's on() only fades young puffs: `cocks: 0` now hides the object), v22 lens raised the engine out of the
  caption band, Hori moved back 14 cm (the front plate's liner cut his face), the boss + coal man both whole in v28,
  v29 pulled back (the boss's head was ~1/3 of the frame), v21 re-staged in profile. Log: no error, no NaN, no beat
  "NOT PLAYED" (a `[today]` / `[steam v4]` warning line prints any beat that does not resolve). retime_v4.py
  --no-script: ALL CHECKS PASS (38 shots; my ids unchanged). Sheet: pointing_preview/TRAIN_v4_steam_and_today_v20-v30_DRAFT_stills.jpg.
- next: v20 (see OPEN), then the boss's notebook + the kid's point from CAST.

- done 18:40 (lead's round 2): v20 = the cab PARTITION cut away (kit/vehicles/cab_jp.ts `partition: (t) => boolean`,
  the partition is its own mesh "cab-partition"; v4/sets/today.ts `cutaway: "v20"` hides it only in v20 +-0.05 s), the
  lens 2.3 m behind / 0.7 m right of the driver: cap + seat + his white glove's arm across the bright windscreen to the
  GREEN lamp (lamp ~48 %, glove ~55 % of the height). Heads pulled back: v24 (from the tender, higher), v28 / v29 (fov
  76 / 70 from the front-left corner), v30 (the boss beside Hori, same depth). v23 lens moved back to show the front
  plate + the window beside his profile (the lean itself = CAST's stronger `peer`). v26: the semaphore 26 m ahead on
  the cut, big at the left, the coal man whole at the right (side-on with the post in frame is not possible: see
  geometry). BUG FIXED: a shot's semaphore stood still with the train (crewAt now brings it closer at 12 m/s).
- done 18:00: FINAL COLD RENDER on the final clock (2054 f): all 12 of my shots re-rendered at draft (0 cached):
  v20 969-1022, v21 1023-1056, v22 1057-1143, v23 1144-1213, v23b 1214-1261, v24 1262-1304, v25 1305-1358, v26
  1359-1395, v27 1396-1419, v28 1420-1493, v29 1494-1523, v30 1524-1576. FRAMES CHECKED: every 2nd frame of each
  (scratchpad train_sheets/c3_<id>.jpg) + first / middle / last (fml3_all.jpg) + stills f1000 f1180 f1290 f1385 f1460
  f1510 f1550. tsc 0 (film + sandbox), retime_v4.py ALL CHECKS PASS, no error / NaN / unplayed beat in the logs.
  Sheet: pointing_preview/TRAIN_v4_steam_and_today_v20-v30_DRAFT_stills_round2.jpg.
- next: CAST's poses (the kid's copy-point, Hori's lean, the coal man's hand shading his eyes), then re-check v21 / v23
  / v26 on stills.
- done 19:05 (lead round 3): v20 SIDE-ON EXTERIOR built behind ONE flag `V20_SIDE_ON` in v4/sets/cab.ts (default
  false = the inside cut-away version). Side-on = today.ts `sideOn`: a 0.3 m/s station glide, the driver moved into
  the crew window (z 1.15), a LOW lineside signal (lamp 1.55 m above the floor, its lit face turned toward the lens,
  gliding with the ground), no wires / poles (edge-on they aliased into streaks), CAST's point + call on his LEFT
  (near) arm. Draft clip of the whole shot looked at: the driver's profile + the green lamp read, but HIS ARM NEVER
  SHOWS in the crew window (the point + the call fist stay inside his silhouette). The inside version shows the snap,
  the hold (~frames 2-36) and the fist. Comparison: pointing_preview/TRAIN_v20_compare_inside_vs_sideon_DRAFT.jpg.
  v21: the car coloured (CAR_COLORS in today.ts: orange partition face, teal door, warm walls, red seats, orange rings
  on blue straps; kit options interiorJP `colors`, cabJP `carFace` / `doorPanel`), the kid moved to the left part of
  the window, a lens behind-right of him (his hand clear of the door post); the commuter whose face filled the lens
  moved. v27 framed higher + wider (face 33-47 % of the height, head ~17 %); v23 lens wider (head under 1/4).
  BUG noted: trainJP `run` MOVES the train (do not pass it with a treadmill world).

**OPEN (honest; the v20 item is superseded by 18:40 above):**
- v20 is NOT good yet: from the car through the partition the driver is half hidden by his seat back + the wall,
  and his pointing glove does not read (it is in front of his body from behind). The fix I would make next: put the
  cab PARTITION into its own mesh in kit/vehicles/cab_jp.ts (`partition: (t) => boolean`) and hide it in v20, then a
  lens ~1 m behind his right shoulder holds him (cap, navy, glove) + the green lamp in one portrait frame.
- v21: the kid's copy-point does not show (arms down in every frame; CAST's kid "call" beat resolves without a
  warning). v24: Hori's mouth is not wide on "Signal clear!". v29: no notebook in the boss's hand (pen only).
  v23 "peer" reads only as a plain profile. These are CAST's poses.
- v30 deviates from the table ("from outside the round window"): from outside, the boss is hidden behind the
  front plate (tried); it is v23's lens again, the boss beaming behind Hori (a bookend).
- RIGOPTS per shot are exported from v4/sets/steam.ts but film.ts does not read them (optional: the stills look
  right on the set's own rig).

**GEOMETRY LESSON (portrait 9:16):** at fov 60 the frame is only ~35 deg wide. A driver in PROFILE and a signal straight
ahead cannot share one frame from inside a cab (they are 40-75 deg apart from any lens that fits in the cab). v20 is
therefore the classic driver-cam picture: his cap + white glove from behind his right shoulder, the arm going sideways
up to the green lamp in the windscreen. Profile faces live in v23 / v24 / v25 / v30 (steam), where the "thing" is the
round window beside him.

**CHECK IN THE RENDER (only motion shows these; the owner renders on the other PC):**
- v20 the point SNAPS on "point" (3 f) and holds; the call fist on "Signal clear!" lands in v21; the speedo needle
  trembles; mast shadows sweep the cab (sun direction!); the green lamp grows as it nears (19 m/s, 82 m lead).
- v21 (0.77 s) the kid's copy-point reads in under half a second; the straps / crowd sway; no pop on the cut.
- v22 wheels + rods turn at 12 m/s (no strobing at 30 fps); the smoke streams back over the frame top; the egrets
  lift in the first second and cross the frame; the reeds / flowers streak at final (shutter); the glide then rest.
- v23 Hori's "peer" (head forward, brows down, eyes open) reads in profile; country streams past the left opening.
- v23b the blur stand-in BREATHES once (soft -> less soft -> soft) and never looks sharp; the cab shake is small;
  at final the DOF (focus 0.62 m, f/1.4) softens the whole world; preview has NO depth of field (mb 1).
- v24 the turn + "Signal clear!" mouth is on the word; v25 the coal man's freeze on "signal#3".
- v26 the semaphore (arm lowered 45 deg = clear) visibly approaches; v27 "Clear!" face on the word.
- v28-v30 the boss's nods on his cues; nothing pops at the cuts v28 -> v29 (same people, new lens).
- every shot: the camera glides, then RESTS (film.ts withRest); no cab shake left in a rest.

## V4 HANDOVER (TRAIN owner, 2026-11-20 ~09:00, laptop switched off; the next team continues from the files)
State: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` and `-p src/sandboxes/kit_vehicles/tsconfig.json` (run
from `studio/` ONLY) are 0 errors. No render of mine running, no stills slot, no RAM token. The last final batch
(KitSteam 30,90,150,270,330 at final) was STOPPED before it wrote anything: the finals on disk
(`out/kit_vehicles/steam/final_90/210/330.jpg`, 08:26) are of the OLDER framings.

**Built (new files only; everything procedural, NO texture / model / path outside the project folder is read):**
- `kit/vehicles/steam_loco.ts` (K-P40): a BLACK British-style 4-4-0 tender engine of the Kobe area ~1910, 1,067 mm,
  brass dome + safety valves + bands, red buffer beam, white tyre edges, buffers + link coupling, no lettering; wheels,
  coupling + connecting rods, crossheads, pistons driven by `run(t)`; open cab (roof, round spectacle windows, low side
  sheets), backhead (pressure gauge, water glasses, regulator, copper pipes, a flickering firehole whose doors follow
  `fireDoor(t)`), one point light for the fire glow; tender with coal; option `cutaway(t)` hides the cab's LEFT side
  sheets (a side cut-away view). Marks `STEAM`, `LOCO` (frame: rail top y 0, front buffer beam z 0, runs toward -Z,
  driver on the LEFT x < 0, cab floor 1.38 m, cab z 6.25..7.95, round windows at (+-0.82, 2.72, 6.25)).
- `kit/vehicles/steam_fx.ts`: GPU plumes, pure in time: `locoSmoke`, `valveSteam`, `drainCocks`, `wisp`, `plume`.
- `kit/vehicles/steam_world.ts`: the treadmill world (`dist(t)` moves it +Z): paddies (canvas texture, some flooded),
  embankment + ballast, wooden sleepers, telegraph poles + wires (RIGHT side), pines / cedars / round trees, minka with
  thatch, hills, clouds, birds; a lower-quadrant SEMAPHORE on the left (arm lowered 45 deg = clear, no lit lamp by day;
  `signalAt` or `signalAhead(t)`); the NEAR foreground: rice tufts in rows over a flooded strip + reeds + wild flowers
  on the LEFT, a raised path with 3 farmers in straw hats + a small red torii on the RIGHT (beyond the train).
- `videos3/pointing/sets/steam.ts` (`build_steam`, `STEAM_PLAN`, `STEAM_RIG` = the look director's vivid block,
  `STEAM_SHOW.crew(t)` = who stands where + `cutaway` + `signal` distance, `CREW_DEFAULT`): CAST's v4 cards "hori",
  "fireman" (shovel held), "official" (notebook + pen); aim null everywhere (THE STEAM DRIVER NEVER POINTS). NOT yet in
  `sets/index.ts` (the DIRECTOR's file) and `steam.cams.ts BY_SHOT` is EMPTY.
- `videos3/pointing/sets/steam.cams.ts` `FRAMES_steam`: `event` (low, close front 3/4, rolled; v22), `cabSide` (behind
  his shoulder through the round window, the semaphore soft; v23), `wideCab` (side cut-away; v24-v25), `coalOut`
  (the coal man leaning out, from outside front-left; v26-v27), `boss` (side cut-away; v28-v29), `noseGlass` (from
  outside the right opening across the cab: Hori at the round window + the boss behind; v30), + old `twoShot`, `frame0`.
- Sandbox: `sandboxes/kit_vehicles/film_steam.ts` + COMP `KitSteam` in `Root.tsx`: 6 rows x 60 frames = event,
  cabSide, wideCab, coalOut, boss, noseGlass (frame 30 + 60 k = row k mid-move); each row sets its crew, sun and
  exposure.

**The lead's feedback on STEAM_1..3 (to act on):**
- EVENT (v22): right direction, the engine is liked. Wants: a richer foreground (rice rows with water glints, a raised
  path with farmers turning to look, flowers / reeds near the lens, a shrine gate or thatched roof for scale), LOWER
  and CLOSER (buffer beam + smokebox big, wheels + rods readable, horizon tilted a touch, smoke over the top of the
  frame), SPEED (streaked sleepers / grass at the bottom edge, a wheel-rim blur, birds scattering). Status: the lens
  is now low over the left paddy with reeds / flowers in front (draft_30 of 08:4x reads); the last tweak (lens z -8.6,
  look z 1.6, so the smokebox is not cut at the left edge) is in code and NOT yet seen.
- CAB SHOTS: WIDE side cut-aways, both men whole and medium (heads <= 1/5 of the frame), the firebox glow the warm
  centre, bright country + sky through the openings, coal, steam, the shovel; NO dark void; the steam driver never
  points (hands on the lever). Status: `wideCab` / `boss` use the cut-away (draft_150 reads: Hori in blue + glasses,
  the coal man in orange, the fire); the boss row's official was hidden behind the right side sheet (moved to
  (0.18, 1.38, 7.6), not yet seen); the cab interior is still dark-ish: add light (a second fill or a brighter fire).
- LINE 18 (v30, the funniest picture): `noseGlass` reads in the draft (the boss with moustache facing us at left,
  Hori in profile with glasses at the right by the window); Hori's face was cut by the window structure: the lens was
  re-aimed (look z 6.62, fov 58), NOT yet seen. The table wants it from OUTSIDE the round window looking in: an
  alternative lens in front of the cab front plate at (-0.82, 2.72, 5.6) looking +Z through the window.

**Next steps, in order:**
1. Render the six rows as drafts, look at each:
   `ENTRY=src/sandboxes/kit_vehicles/index.ts COMP=KitSteam PROPS='{"kit":{"quality":"draft"}}' bash scripts/stills_locked.sh out/kit_vehicles/steam/draft_ 30,90,150,210,270,330 0.5`
   (from `studio/`; a draft still ~10-30 s each; one heavy process at a time).
2. Event: check the smokebox is whole; add speed (more birds lifting near the lens, the kit shutter streaks at final).
3. Cab cut-aways: lift the interior light; make sure no black side-sheet slab covers the right third (hide the RIGHT
   back pillar too for `boss`, or move the lens); the boss whole and facing us.
4. v30: try the outside-the-window lens; hold it (NO move).
5. v27 (coal man "CLEAR!"): `coalOut` 0.4 m closer as a cut-in; v29 the notebook push.
6. Finals of the best: `... PROPS='{"kit":{"quality":"final","prof":true}}' bash scripts/stills_locked.sh out/kit_vehicles/steam/final_ <frames> 1`
   -> `pointing_preview/STEAM_<n>_*.jpg`.
7. Map `BY_SHOT` in `steam.cams.ts` (v22 event, v23 cabSide, v24 wideCab, v25 wideCab, v26 coalOut, v27 coalOut,
   v28 boss, v29 boss, v30 noseGlass) once the DIRECTOR's v4 film (studio/src/videos3/pointing/v4/, V4_STRUCTURE.md)
   says how sets + cams are looked up; give each shot its crew plan (the sandbox rows hold the numbers).
8. TODAY v19-v21 (platform arrival, the modern cab point at a green signal, the kid copying at the front window):
   the existing `cab` / `car` sets (being recoloured by the LOOK director: ask before editing) + STATION's platform.

**Traps:** run tsc ONLY from `studio/`; a card's limbs live in the card's plane (a lens beside the cab sees the side
sheets in front of them: use `cutaway`); CAST picks front / profile / back from yaw vs lens; the cab wisp sits outside
(0.32, 3.15, 6.05) so no cab lens looks through it; the sandbox rows name their framings (change both when renaming).

## HANDOVER 2026-11-20 02:30 (TRAIN owner #4 -> the next owner; replaces the 00:35 block)
State of the tree: `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` (from `studio/`) 0 errors after my last
edit. No render of mine running, no stills slot held, no RAM token, no temporary bundle / frame / copy left. The clock is
the REAL VOICE now (`words.ts`, 135 words): s02 81-140, s03 140-212, s04 212-262, s05 262-344, s06 344-416, s10 717-770,
s21 1676-1706 (EV: bagCreep 314, footHook 330, bagHome 342, brake 379, bagBump 392). Re-read them from timeline.ts.

**(1) Checked on draft stills** (`studio/out/kit_vehicles/v3/draft_<film frame>.jpg`, copies `pointing_preview/TRAIN_*`)
- s02 (T-3 face match + the lead's phone cut): `draft_81` (his mark 10 cm off the wall: STAGE.tourist x 1.02; the whole
  phone in frame; eyes ~55 % across / ~38 % down), `draft_90`, `draft_125` (the whole suitcase, the boy at the glass).
- s03 (T-11): camera `face` (cab.cams.ts `faceCam`; the sandbox row now uses it too: it used `behind` until 02:20, so
  every s03 still before that showed the OLD lens): from his right shoulder at shoulder height, the lamp 15 % down on
  the cut, a small orbit + push. `draft_140`, `draft_142`, `draft_165`, `draft_208`. T-13 (his FACE in s03) is NOT
  solved: see the note on `faceCam` (geometry + the speed budget; a full orbit measured 9.9 %/f peak and still only
  reached a 3/4 back view). His face needs its own cut-in (the DIRECTOR's call).
- s03b (02:50, the lead's decision, Block 13: the driver's FACE cut-in, f164-212 by `fr(S("signal") - 0.04)`; the
  DIRECTOR adds it to the clock): cab framing `faceFront`, keyed `s03b` / `v3_s03b` in cab.cams.ts BY_SHOT; the sandbox
  plays s03 f140-164 + s03b f164-212 (it switches to FRAMES.s03b by itself once that exists). Inside the cab ahead-right
  of him (~35 deg off his nose line), a straight push 0.52 / 0.58 %/f (own camSpeedStats; the director's probe cannot
  see s03b yet). cab.ts hides the riders, the suitcase and the motes during s03b. Drafts `draft_166`, `draft_190`,
  `draft_200`; FINAL `v3/final_200.jpg` = `pointing_preview/TRAIN_13_s03b_driver_face_FINAL.jpg` (face ~25.5 % of the
  height, eyes 34 % down, the glove ~58 %). Gaps: the key / rim on his face is soft (the card light is CAST's), the green
  lamp is behind this lens.
- FIX ROUND after the first full preview (03:00-03:40, Block 14 / 14b / 14c; the gate = `tools/v3/qa_gates.py` on a draft
  clip, `--no-loop`, shots json in clip frames): on-screen camera (gate) s03 1.37, s03b 0.78, s04 0.83 (was 0.26: a
  0.32 m lateral truck with the look travelling along), s05 1.05, s06 0.53 (was 0.25: a push THROUGH the partition
  window frame from further back); chroma s03 20.2, s03b 22.6, s04 30.4 (at warmth 1.2: the car set now 1.0 + exposure
  0.97), s05 21.8, s06 21.9 (cab set warmth 1.2). s21 re-aimed AGAIN: behind and above his right shoulder, the lens
  INSIDE the cab all shot (the preview's lens started behind the partition: a black mass for 0.4 s), fov 46: his cap +
  head in the left ~20 %, the glove at the DARK door lamp with its icon, ~15 % of the width (`draft_1680`, `draft_1700`);
  the lamp stays dark in s21 (the doors close after the shot: pilot lit ~f1753). "From above the desk in front of him"
  was tried and fails (the desk reads sideways, the lamp at the frame edge). s03 calmer for its new 0.8 s (C1 near C0).
  s03b stopped down to f/6.3 (the blur gate at final); the sandbox tests s03b at sunEl 11 (warmer face): the film's
  s03b uses the shot table's CAB (sunEl 20) unless the DIRECTOR changes it. s04: the boy's point raised to y 1.04 (it
  sat in the caption band with CAST's chest-height point).
- THE CAPTION KEEP-OUT (the director, binding for this film, 1080 x 1920): y 1260-1440 = 65.6-75.0 % of the height,
  middle 90 % of the width; beat action above 64 %, or floor action at 76-83 % (the Shorts title overlay covers the
  bottom ~17 %).
- s04 (T-7 / T-12): `draft_222`, `draft_250`: restaged for this shot only (`STAGE.kidS04` / `touristS04`, `inS04`):
  the tourist NEAR the lens on the aisle half (0.8, Z+0.58), yaw -2.45 (front / three-quarter), his laughing face
  ~30 % of the frame height, the straight jab up-left stopping at the glass frame (aim Z+0.22); the boy smaller
  behind him at the wall half (1.18, Z+0.22), CAST's horizontal point onto the glass, eyes UP at him (the set gives the
  boy `look` = the tourist's face); the suitcase's top bottom right; no mum. Lens: twoShot fov 44 from the left wall.
- s05 (T-8, THE FOOT HOOK): `draft_322` (landed), `draft_330` (the hook), `draft_340` (dragged home). Restaged for s05
  only: the lens looks BACK from the cab glass down the packed car (start high: the crowd), sinks and lands at his
  knees (fov 80, low, the look tilted so the shoe + wheel sit at ~78-82 % of the height: below the caption keep-out); he stands in the doorway zone (`touristS05` 0.6, Z+1.45) facing the cab end, the suitcase at
  his RIGHT on the wall half (`bagS05` 1.02, Z+1.42, the home from the s05 cut until the reset after the first stop).
  It creeps back AWAY from the lens until its front wheels are level with him: wheel and shoe at one depth, the case's
  body BEHIND them, so the sneaker reads IN FRONT of the case. The car set solves his yaw only within PI +- 0.9 (face
  to the lens). On `draft_320` / `draft_330` (02:10) CAST's "readDown" face shows: eyes down / shut, a smile: he does not look.
- s06 (T-9): `draft_360`, `draft_380`, `draft_398`: CAST's `castLiftPair` is wired in `sets/cab.ts` (side +1, the boy's
  floor mark = `kidAt`, `KID_LIFT` = 0, `lifted` exported from train_stage.ts, his contact shadow off): mum holds him
  up, his face ~22 % of the height, the copy-point / ear, mum's face at the left (LIFT.sideM 0.3), the suitcase rolls in
  from behind them (it starts at bagS05) and bumps at the window's bottom right; CAST's lensGlove (white glove, navy
  cuff) in the bottom-right corner (`a` 0.12 / `b` -0.29 in cab.ts). The end pose shifted 5 cm toward mum at 01:49
  (not yet seen on a still).
- s10: `draft_760`: the boy turned from the glass (yaw 0.64) frowning up at the tourist; the tourist's free hand on
  the suitcase handle (aim = the handle).
- s21 (T-10 / T-13): `draft_1692`, `draft_1704`: from behind and above his right shoulder (0.75 m back; nearer, his
  cartoon head fills the frame): cap + head in the left third, the navy sleeve + white glove pointing at the DARK
  door pilot lamp, which now shows a pale DOOR ICON (a flat decal over the lens: the old icon was wrapped round the
  dome's sphere UVs and never showed), the fingertip just below-left of the bezel (aim in cab.ts), bezel ~18 % of the
  width. His eyes are NOT in this frame (from in front the sloped panel faces away from any lens).
- The door order (`out/kit_vehicles/draft_28.jpg` lamp lit / `draft_46.jpg` out), frame 0 (`draft_21`), the doorway
  (`draft_1`) at 01:38 with the ochre #8c8468 (read mustard-ish on the inner strip: now #7e7c72, not yet on a still)
  and the car-side lamps at power 3.2 (tone-mapped ORANGE: now #ff0c04 at 2.0, not yet on a still).

**(2) In code, NOT on a still**: the ochre #7e7c72; the redder car-side lamps (#ff0c04 at 2.0); the s06 end framing 5 cm
toward mum; the frame-0 patch in the FILM's frame 0 (STATION's set; tested only on my replica, see (3)).

**(3) SAVED 02:00:32, the FRAME-0 patch** (STATION's report: the case pastel, the cap louder): door glass from 0.15 m
(dims `dwinY0`, was 0.34: the whole case shows), NO band on the door leaves (train_jp `leaf` band boxes removed),
clearer door glass (env 0.35 -> 0.15, opacity 0.045 -> 0.03), the suitcase #f6bb08 (was #f7cd12) with clearcoat 0.55
when it has no interior env. Tested on a temporary copy: `out/kit_vehicles/patchtest_frame0_final_21.jpg`: case chroma
0.62 -> 0.79 (STATION's frame 0 before: case 0.65, cap 0.84). STATION was asked to give its frame-0 suitcase
`interior: true`.

**(4) Next steps**
1. Render the film's frame 0 and 42 at final
   (`node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality final --stills 0,42
   --out out/pointing_train/`), measure the case's chroma against the cap (case region vs cap region, top-half chroma).
2. Draft clips of s02-s06 for your own eyes (`node scripts/kit_render.mjs --entry src/sandboxes/kit_vehicles/index.ts
   --comp KitVehiclesV3 --quality draft --frames 81-416 --out out/kit_vehicles/clip/`; it takes the RAM token: only
   when the lead allows), frame strips with ffmpeg, fix motion (the suitcase's jump from bagKnee to bagS05 at the s05
   cut shows as a caster flip + shiver for a frame; the hook; the brake roll; the doors).
3. Probe after every camera change: `node briefs/v3/pointing/director/probe.mjs cams`.

**(5) Traps** (the 00:35 list still holds; new ones)
- A card's foot / hand lives in the card's plane: a prop part NEARER the lens than the card hides the limb. For a
  hook, the hooked wheel must be at the card's depth and the prop's body behind it (s05's whole staging is that).
- CAST lands a hand on the aim's place ON SCREEN: an aim only 12 cm in front of a big cartoon head lands the hand on
  the face (s04 first try). Aim a point on the glass a little below / in front.
- The stills log piped through grep stays empty until the run ends: wait on the jpg's mtime instead.
- The hold: while the DIRECTOR renders, any save to sets/cab*, car*, train_plan, train_stage or kit/vehicles changes
  the opening's shot hashes: ask the lead before saving when a render is announced.
- The sandbox `KitVehiclesV3` (film_v3.ts ROWS) names its framings itself: when you change BY_SHOT in a cams file,
  change the ROW too, or your stills show the old lens (it cost a round on s03).

Status 2026-11-20 02:30 (TRAIN owner #4, took over ~00:40): the opening's train shots s02-s06 restaged and checked on
stills on the real-voice clock; s10 / s21 re-done; the frame-0 patch saved. Everything below this block is the earlier
owners' text, corrected where the 02:30 state differs (film sets section, proof list).

## What changed tonight (read this first if you used the 17:30 version)
- **Bug 1 fixed:** the cab face is now a real face (rounded corner posts, a silver lower face, a black glass panel
  with three open panes, an emerald surround + brow): you see THROUGH the windscreen from both sides.
- **The "flesh rectangle" on the desk** was the rect practical's glowing panel lying over the instruments, not a card.
  The kit now uses NO practical lights at all (0 lights in the light budget): see "Light".
- **Orange ceilings / blue floors / yellow lower body fixed:** three's sky IBL is not occluded and r175 ignores
  `material.envMapIntensity` for `scene.environment`. Interiors, the stainless body and the under-floor parts now carry
  their OWN environment maps (`mats.ts`: `carEnv`, `cabEnv`, `skyEnv`, `underEnv`).
- **Door glass is TALL and clear** (0.34-1.74 m above the floor, 0.46 m wide; not JR practice, a story need): the 75 cm
  yellow suitcase reads behind a closed door from the platform (frame 0).
- **The true door order is built in:** leaves meet -> each car's red car-side lamp goes out (`lampDelay` 0.3 s, then
  `doorDelay` 0.03 s per car) -> once the last is out the desk's door-closed pilot lamp lights (0.15 s later). The hero cab's
  pilot lamp follows `train.pilot(t)` by default. Lamps change ONLY with the doors.
- **The car-side lamp moved** to the fascia mid-car beside the blank destination panel (`D.lampY`, `D.lampDZ`).
- **New API:** `train.carFloor(k)`, `train.lampOn(k, side, t)`, `train.pilot(t)`, `FACE` (dims), `suitcase` options
  `interior` / `rolled` / `tMax` + `wheelWorld(i, t)` / `speed(t)`, `interiorJP` option `hangingAds`, `cabJP` option
  `lever`. Nothing was removed; `doorAt`, `doorOpen`, `doorCycle`, `departRun`, `arriveRun`, `CAB`, `DOORS_CAB` are as before.
- `windowsOf()` now leaves the door pockets blind (side windows 2.2 m wide): an open leaf never slides behind glass.
- **The suitcase is the only yellow:** the doorway floor strips and the door-edge strips inside are a worn ochre
  (`PAL.ochre` #8c8468), not yellow (STATION's note).
- **`lampBeacon` (beacon.ts):** a far lamp that must read at phone size: a glow with a PIXEL FLOOR (core 18 px, halo
  40 px of a 1920-high frame) on a black board that the haze does not lift. The cab + car sets put it on the green
  lamp of STATION's signal (the verifier's blocker).
- The RIGHT partition window's sill is 0.55 m (the left one, behind the driver, 0.80; they were 0.92): from the cab
  the boy's chest and arms and the top 20 cm of the 75 cm suitcase show over it (script s06). Not JR practice (a real
  sill is ~0.9 m): a story need, like the tall door glass.
- The emerald is deeper and duller (`PAL.emerald` #16573b, was #0e6c3f): the waist stripe was the second-loudest
  colour of frame 0, right behind the yellow suitcase (the director's T-6).
- The door-closed pilot lamp on the desk is a 6 cm lens with a pale DOOR pictogram (it reads dark and lit).

## Files
| file | what |
|---|---|
| `dims.ts` | every number of the generic E231 / E233 / E235-like wide-body car (gauge 1,067, floor 1.13 m above rail, 2.95 m wide, 20 m pitch, 1.3 m doors, door centres, windows, band heights, lamp place, bogie centres, cab depth, ceiling) + `FACE` (the cab face: plane, corner radius, panes, destination window, emergency door) |
| `geo.ts` | Parts bags merged per material (non-indexed, metre UVs, `aDirt` vec2: x = dirt, y = per-panel tint), rbox / cyl / disc / ring / tube / quad / quadB / quadN (winding fixed for you) / quadUV / arcWall / lathe / extrude / sphere, `gridHoles`, `dirt` / `dirtKey` / `tint` / `tintKey`, seeded rng / noise |
| `mats.ts` | procedural tileable normal + roughness maps (brush / peel / weave / ribs / satin), `vmat()` dirt- and tint-aware PBR (+ own environment, + a share of CORE's GI), `glass()` (PBR reflection over ~90 % transmission, optional smudge + breath-fog map), `smudgeMap()`, `lamp()` (emissive on / off), `screenMat()`, `canvasTex()`, the environments `roomEnv` / `carEnv` / `cabEnv` / `skyEnv` + `aimSkyEnv` / `underEnv` / `ownEnv`, `PAL` |
| `train_jp.ts` | K-P1 `trainJP(ctx, opts)`: the consist (bodies, face, doors, lamps, bogies + wheels, pantographs, LOD, interiors) + `doorCycle`, `departRun`, `arriveRun` |
| `interior_jp.ts` | K-P3 `interiorJP(ctx, opts)`: the car fit-out + `carSway(t)` |
| `cab_jp.ts` | K-P2 `cabJP(ctx, opts)` + `CAB` (marks: seat, head, speedometer, pilot lamp, watch, controller, partition windows, panel normal) |
| `suitcase.ts` | K-P27 `suitcase(ctx, opts)` + `SUITCASE` sizes |
| `beacon.ts` | `lampBeacon(ctx, { pos, corePx, haloPx, board, color, on })`: a far lamp with a screen-size floor + a black background board |
| `index.ts` | re-exports |
Sandbox: `studio/src/sandboxes/kit_vehicles/` (ENTRY `src/sandboxes/kit_vehicles/index.ts`): COMP `KitVehicles` = one
frame per framing of the parts (`film.ts` ROWS: 27 framings, exterior at a plain kit platform + the cab + the car on
the treadmill); COMP `KitVehiclesV3` = the FILM's own `cab` + `car` sets on the script v3 outline timings (`film_v3.ts`).

## Frame (binding for everyone who places a train)
Train frame: y = 0 at the TOP OF RAIL, the nose of car 1 at z = 0, the cars extend toward +Z, the train RUNS toward -Z,
x + = the train's right, the driver sits on the LEFT (x < 0). Car k (0-based) spans z = 20 k .. 20 k + 20; car-local
z' = z - 20 k. The car floor is at y = D.floor = 1.13 (a 1.1 m platform is ~3 cm lower). The film's cab / car sets put
the train group at y = -D.floor (floor at y = 0).

## API
```ts
import { trainJP, doorCycle, departRun } from "../../../kit/vehicles/train_jp";
const train = await trainJP(ctx, {
  cars: 10,                         // car 1 + car N are cab cars (the rear one faces backwards)
  band: "#16573b",                  // emerald (default, PAL.emerald); the passing line: PAL.orange / PAL.orangeDark as band / bandDark
  pantographs: [2, 4, 7, 9],        // 1-based, raised to the wire (5.15 m above rail)
  run: departRun(t0, 0.8, 22),      // metres moved toward -Z at film time t (pure); default 0
  doors: doorCycle({ side: "left", openAt: 0, closeAt: 18.4, dur: 1.6, startOpen: true }),   // (t) => { side, open 0..1 }
  lampDelay: 0.3, doorDelay: 0.03,  // the red car-side lamps go out lampDelay s after the leaves meet, + doorDelay per car
  lod: "auto", nearM: 32,           // per-car near / far geometry by camera distance
  interior: "auto", heroCars: [1],  // hero fit-out (interior_jp) in car 1, simple lit interiors elsewhere
  heroCab: true, cab: { speed, fog, brake, lever, pilot? }, interiorOpts: { sway, swayK, blinds, hangingAds },
});
train.object.position.set(trackX, railTopY, noseZ);   // + rotation.y = Math.PI to run toward +Z
set.add(train.object);  // update EVERY sub-frame: train.update(t, cam)
train.doorAt(k, i, "left")   // V3 in the train frame: door i (0..3) of car k on the FLOOR at the outer skin (cast marks)
train.doorOpen(k, side, t)   // 0..1
train.lampOn(k, side, t)     // 1 while car k's red car-side lamp is lit
train.pilot(t)               // 1 once EVERY car-side lamp is out (the desk's door-closed lamp; the hero cab uses it)
train.noseZ(t)               // -run(t)
train.carFloor(k)            // a Group riding with car k: origin = the car's front end ON THE FLOOR (y up, z' along the car)
train.hero.interior / train.hero.cab   // the Built of car 1's hero parts (update is already chained)
```
- **Things that ride the train** (the suitcase behind the door glass, cards inside the car): `train.carFloor(0).add(obj)`
  and give positions in CAR coordinates (floor y = 0, z' from the car's front end: door 1 of car 1 is at z' = 3.6,
  x = +-1.4). They then leave with the train by themselves. (A suitcase given a WORLD `pos(t)` that includes the
  train's run spins its wheels with the train: mount it, or pass `rolled`.)
- **Door order** (ja.wikipedia 車側灯 + 鉄道合図, the script's sources): `doors(t).open` reaches 0 = the leaves have
  met; car k's lamp goes out `lampDelay + doorDelay x k` s later (defaults 0.3 + 0.03 k: the script's "lamps out 0.3 s
  after the thump", a quick ripple down 10 cars; STATION's `doorDelay: 0.12` puts car 10's lamp 1.1 s later than
  car 1's, after the train has started to glide); `pilot(t)` turns 1 another 0.15 s after the LAST car's lamp. For "one
  door speed, 1.3 s open to shut": `doorCycle({ ..., closeDur: 1.3 })` (default closing = dur x 1.1). Opening: the lamps
  light the moment the leaves start to move. Inside the hero interior the red bar above each door BLINKS while the
  leaves move (the checked fact: ja.wikipedia E233) and is dark otherwise (`interiorOpts.doorLampOpen: 1` = steady
  while they stand open; not checked, so off by default).
- `suitcase(ctx, { pos, yaw, handle, tilt, casters, color, contact, scale, interior, rolled, tMax })`: every field a
  value or (t) => value. It ROLLS BY ITSELF: a 60 Hz path table of `pos(t)` (pure) gives the wheels their roll and
  the casters their trailing heading (kept when it stops), with a small shimmy and shell shiver at speed; the tag
  swings. `interior: true` = the shell reflects the car (carEnv) instead of the sky. Returns `wheelWorld(i, t)` (the
  world point of caster i, for a foot that hooks a wheel; order -x-z, -x+z, +x-z, +x+z) and `speed(t)`. Local frame:
  stands on y = 0, front +Z. 0.5 x 0.75 x 0.3 m shell (wheels 6.4 cm), handle grip 0.80..1.05 m.
- `interiorJP(ctx, { cab, doors, sway, swayK, blinds, hangingAds, seed, lights })` / `cabJP(ctx, { speed, pilot, fog,
  brake, lever, blind, lights })` can be used alone (car-local frame, floor y = 0): see their headers.
  `hangingAds: false` removes the blank hanging ads (their lower edge is at 1.885 m: a ceiling fly-through hits them).
- `lampBeacon(ctx, { pos: (t) => V3, face = [0, 0, 1], color = green, corePx = 18, haloPx = 40, coreM, haloM, board =
  [1.7, 2.6] | false, boardDy = -0.35, on, nearM = 4 })` -> Built (call `update(t, cam)` every sub-frame). Pixel sizes
  are of a 1920-high frame at any render size. The board is unlit black with fog off; hide it with `board: false` when
  the lamp already sits on a dark background.
- `carSway(t)` = the kit's default car rock signal (-1..1); the film passes CAST's `rockLag(t, lag).roll / 2.2` so the
  straps and the crowd sway together.
- `CAB` marks (car-local, floor y = 0): `driverSeat`, `driverHead`, `speedo`, `pilotLamp`, `watch`, `controller` (the
  T grip), `panelNormal`, `partitionZ`, `windowL` / `windowR` / `door` (the partition), `windscreenY`, `driverPane`.

## Light (why there is no practical in the kit)
- three's IBL is not occluded by walls, and in r175 `material.envMapIntensity` only works with `material.envMap`
  (for `scene.environment` it is replaced by `scene.environmentIntensity`). So inside a car the sky HDRI lit the
  ceiling with the park's ground (orange) and mirrored the sky in the floor (blue); under the car it lit the bogies
  from below; on the car sides it mirrored sunlit grass (olive).
- `roomEnv(ctx, spec)` renders a small box-room environment (128 x 64 float equirect -> CORE's `pmremOf`), cached:
  `carEnv` (white ceiling + the two LED strips, pale walls, the daylight window band broken by door piers, dark bench
  backs, the grey floor), `cabEnv` (the windscreen band ahead, side windows, a dim ceiling, the dark desk, the lit car
  behind), `underEnv` (daylight from the sides only, dark ballast below, the black floor above). `skyEnv` = a clean sky
  gradient with a warm glow toward the sun over a NEUTRAL ground, for the stainless body; `aimSkyEnv` turns it to the
  live rig's sun every update. `vmat({ envMap, env })` / `glass({ envMap })` / `ownEnv(material, env, k)` attach one.
- Own-environment materials take only 30 % (`giK`) of CORE's GI probe + bounce hemisphere (those are not occluded
  either: a platform probe paints a car ceiling orange), and switch their environment off while CORE bakes its GI cube
  (`scene.environmentIntensity === 0`), so the probe holds only sun-lit surfaces + the emissive strips.
- The LED strips, LCDs, dial faces, the pilot lamp, the car-side lamps, head / tail lights are EMISSIVE (they bloom).
  `interiorJP({ lights: true })` / `cabJP({ lights: true })` add RECT practicals (bulb off) if a set wants real light
  from them; default off = 0 lights from this kit, nothing to hide, no shader variants.
- Environments are day versions (`day = 1`). A night version is one argument away (`carEnv(ctx, 0)`), but nothing
  switches it by rig yet (the film only uses golden on these sets).

## Colours under the golden rig (learned the hard way)
A sunlit diffuse grey turns yellow-orange there (warm sun x grade saturation): greys lean cool, dirt is dark and nearly
neutral (`#2d2b28`), the suitcase yellow is a slightly green sunflower (`#f7cd12`) so it stays YELLOW, the emerald is
`#16573b` (twice deepened: the sunlit band went neon and fought the yellow suitcase). The door-side lamp's emissive power is 3.2 (at 9 it bloomed to pink-white).

## Research notes (what a train fan checks)
- Generic JR East "wide body" stainless commuter car (E231 / E233 / E235 family): 20 m, 2,950 mm wide, 4 double-leaf
  sliding doors per side at ~4.82 m pitch, 1,300 mm openings, floor ~1,130 mm above rail, 1,067 mm gauge, bolsterless
  bogies (13.8 m centres, 2.1 m wheelbase, 860 mm wheels, air springs), one roof air-con unit, single-arm pantographs on
  motor cars, a coloured line band under the windows + a thin header band, the RED car-side pilot lamp (車側灯) in the
  fascia, blank side + front destination displays here (made-up line: no text, no logos, no kana car numbers), dull
  (not mirror) stainless in panels, anti-fall plates between the cars.
- Face: an E235-like flat face with rounded corner posts and a coloured surround round black glass; three panes with
  the middle one in an emergency door (as on through-running stock); lights in the waist; a grey obstacle deflector,
  a close coupler with its electric head.
- Cab: desk on the left, the one-handle T master controller for the left hand, an analog speedometer between LCD
  panels, the door-closed pilot lamp on the desk, the pocket-watch holder (a classic JR detail), a timetable card
  holder, a roller sun blind, a radio handset, the cream partition with a window behind the driver, a door, and a big
  right-hand window (kids watch the driver from both).
- Interior: long 7-seat benches in green moquette, priority seats at the car ends in another colour with pictogram
  stickers and orange strap rings, white rounded-triangle rings, stainless rails / stanchions 2-3-2, white end
  partitions with a grab pole, luggage racks with frosted panels, two LCDs above each door, red door lamps, yellow floor
  strips at the doorways, blank hanging ads + blank frames over the windows, a glass gangway door.
- NOT checked against a source tonight (no web): whether JR East waist bands cross the door leaves (here they do, cut
  by the tall glass); the exact place of the 車側灯 on an E233 (here mid-car in the fascia).

## Film sets built on it (TRAIN owner): `videos3/pointing/sets/cab.ts`, `car.ts`, their `.cams.ts`, `train_plan.ts`, `train_stage.ts`
- **Every time comes from the DIRECTOR's clock** (`videos3/pointing/timeline.ts`: cuts `cutS(id)` / `FRAMES`, events
  `EV`, `DOOR_CLOSE_S`). No typed second is left in these files (requests ALL-1 / T-1): when the voice moves a cut the
  run, the doors, the suitcase and the cameras move with it.
- `train_plan.ts` = THE TIMETABLE of both sets: cruising 72 km/h (s02-s04), picking up speed from `cutS("s05")` to
  `EV.bagHome`, braking `EV.brake` .. `EV.stopA`, an UNSEEN 1.5 km skip while the first stop is filmed from the
  platform, the last metres into station B in s10, stopped at `EV.arriveB`; the left doors open from `EV.doorsOpenB`,
  close from `EV.chimeB` in `DOOR_CLOSE_S` (ONE door speed), lamps out at `EV.lampsOutB`, away at `EV.glideB`. The
  green signal stands `signalLead` 85 m ahead when s03 starts (~70 m when the glove is up, ~40 m at the cut).
- `train_stage.ts` = THE STAGING of both sets (one file, so a shot through the partition glass and a shot from the
  aisle show the same people in the same places): `STAGE` marks, `kidAt(t)` / `mumAt(t)`, `touristYawAt(t)`,
  `BAG_BEATS` + `bagAt(t)`, `KID_LIFT`. While running: the boy at the aisle half of the RIGHT partition window
  (0.62, 2.28), the tourist at its wall half, half a metre back (1.12, 2.62), the suitcase at his knee on the aisle
  side (0.72, 2.78), mum back by the cab door (-0.25, 3.0: never between a lens and the two). The tourist's heading
  per shot: back to the glass (s02), swinging round to it from `EV.phoneSwing` (12 frames), facing it (s04), turned
  away with his right foot beside the suitcase (s05), three-quarter to the glass (s06), to his phone (s10).
- **The suitcase** (`bagAt`): creeps back 0.3 m from `EV.bagCreep` to `EV.footHook`, is dragged home by CAST's own
  hook curve (`hookAt(t).drag`); the car set turns the tourist so CAST's right-foot reach lands on the suitcase's
  nearest wheel (it warns in the console if the wheel is more than 8 cm from the reach). Under the braking it rolls
  straight ahead to the wall under the window (`EV.brake` .. `EV.bagBump`, a 3 cm rebound). Unseen it is back at his
  knee for s10; from `EV.doorsOpenB` + 0.5 s it is wheeled to the ochre strip of the LEFT front doorway, parked by
  `EV.park`. The cab set builds the same suitcase (s06 sees its top through the glass).
- **s06, the lead's decision: mum lifts the boy up to the window.** The cab set calls CAST's `castLiftPair` (side +1:
  her head on the wall side) on `kidAt` (the floor mark) with `k = lifted(t)`; `KID_LIFT` is 0 (the call raises him).
  The car set still uses `mumAt` (mum's floor mark in s06 is unseen from the car). The driver's white glove in the near corner is CAST's `lensGlove` card, half a metre in front
  of the shot's own lens, riding his second call's curve.
- Both sets: a 2-car trainJP (car 1 = hero cab + hero interior), floor at y = 0, STATION's `lineside` treadmill with
  station B as `stations: [{ noseAt: stopAt }]` and its starting signal; a `lampBeacon` on the green lamp;
  `hints.rigOpts = { fog: 0.0035, haze: 0.0005 }` (the lead's fog; the lower sun haze is mine: looking into the low
  sun its in-scatter washed out everything past 60 m, the beacon's black board included). The platform people of
  station B ride the platform (they slide in with it in s10).
- **Cameras** (`cab.cams.ts`, `car.cams.ts`): NAMED framings, each ONE calm move that never stops (`glide` = one move,
  `path` = a few knots; eases `soft` / `outQuad`), keyed in `BY_SHOT` with the outline's ids, both as `s03` and
  `v3_s03` (the director's cams.ts asks `v3_<id>` first). Measured with the director's probe
  (`node briefs/v3/pointing/director/probe.mjs cams`, CORE camSpeedStats, % of the frame per frame, median / peak):
  at 02:25: s02 0.22 / 2.3 (the script's own hold - move - hold), s03 0.63 / 0.70, s04 0.73 / 0.76, s05 0.64 / 3.43,
  s06 0.58 / 0.67, s10 0.67 / 0.77, s21 0.21 / 0.24 (a hold in the script); film 0.568, no shot under 0.15.
  - car `s02` laugh: THE MATCH CUT. Frames 0-10 hold his face where s01 leaves it (measured on STATION's `frame0Cam`
    at its last frame: the frame 1.45 m high at his face, eye line 38 % down, 55 % across), frames 10-40 ease back and
    sink (fastest first) to the whole suitcase and the boy, then creep on. It ends at the first seats; the first
    right-hand seat is left empty (a head there filled a quarter of the frame).
  - cab `s03` behind: the frame is AIMED BY THE LAMP: the green lamp is in frame from the first frame and drifts from
    upper right to the middle while the lens orbits toward his right side and pushes in (fov 56 -> 50); the driver
    aims just under the lamp, so the glove comes up beside it and never covers it.
  - car `s04` twoShot (02:00): from the left wall, fov 44, with s04-only marks (`kidS04` / `touristS04`): the tourist
    NEAR the lens, three-quarter (yaw -2.45), his laughing face ~30 % of the height, the jab at the glass; the boy
    smaller behind him at the wall half, his point on the glass, eyes up at him; the suitcase's top bottom right.
  - car `s05` aisleGlide (02:00): from the cab glass looking BACK down the packed car, sinking to land at his knees
    (fov 80): s05-only marks `touristS05` / `bagS05`; the hooked wheel at his depth, the case's body behind it, shoe +
    wheel at ~78-82 % of the height (below the caption keep-out).
  - cab `s06` partition: the right partition window fills the frame; the boy held up at screen left, the suitcase's
    top rolling in along the window's bottom edge at screen right, the glove soft in the bottom-right corner.
  - car `s10` selfie: s02's set-up from the other side of the aisle, a slide with a push (the boy turns to frown up at
    him, the tourist's free hand on the handle); cab `s21` lampOver: from behind and above his right shoulder, his cap +
    head in the left third, the glove at the dark door lamp (its door icon is a decal), a breath of push (0.21 %/f).
  - cab `s03` face (`faceCam`): shoulder height, the lamp 15 % down on the cut, a small orbit (0.63 %/f); see T-13.
  - Without a shot: `FRAMES_cab` behindWide / profile / threeQ / lampClose / desk, `FRAMES_car` doorOut / doorWide /
    aisle. The lens stays on the aisle side, so the train's forward is into the screen or screen LEFT, as on the
    platform.
- s15 / s18 / s20 (from inside the doorway) are filmed in STATION's platform set, whose train carries the same hero
  interior. For STATION's platform shots: mount the suitcase / the boy behind the door glass with
  `train.carFloor(0).add(...)` in car coordinates (see API), so they leave with the train.
- Sandbox COMP `KitVehiclesV3` (`sandboxes/kit_vehicles/film_v3.ts`) plays these two sets on the clock's own shot
  frames (the extra framings fill the gaps), so a still of frame N there is frame N of the film.

## Proof / cost / gaps
**02:30 state (owner #4)**: the film sets' drafts `out/kit_vehicles/v3/draft_<film frame>.jpg` on the real-voice clock:
81, 90, 125 (s02), 140, 142, 165, 208 (s03), 222, 250 (s04), 320, 322, 330, 340 (s05), 360, 380, 398 (s06), 740, 760
(s10), 1692, 1704 (s21). Finals 02:05 at 1080 x 1920 (kit.prof, 8 sub-frames): `final_2` (face 3/4, sub-frame 14.5 ms,
29-32 s per still all in), `final_6` (bogie 18.5 ms), `final_13` (cab, the lit door lamp with its icon, 18.5 ms),
`final_17` (car interior 19.9 ms), `final_25` (cab 3/4, 17.3 ms); the film sets: `v3/final_165` (cab set 38.7 ms,
CPU updates 5.1 ms, 42 s all in), `v3/final_330` (car set 37.5 ms, CPU updates 56.7 ms = the cards, 52 s). The frame-0
patch: `patchtest_frame0_final_21.jpg` (case chroma 0.79). A draft still 33-75 s with the machine shared.
Honest look at the finals: a generic JR-East-style stainless EMU reads (face, band, doors, interior with straps,
LCDs, hanging ads, moquette benches); weak spots a train fan sees: the skirt / snowplough and coupler are plain blocks,
dirt near the bogies is faint at this distance, the windscreen shows almost no reflection, the desk is a simplified
console (no real one-handle master controller shape), the interior is very clean. Story-need departures: the door
glass now runs 0.15-1.74 m (was 0.34; real ~0.9-1.8), the right partition sill 0.55 m (real ~0.9), the band does not
cross the door leaves (that one is closer to E233 practice).

Stills only, through the limiter. Commands (from `studio/`):
`ENTRY=src/sandboxes/kit_vehicles/index.ts COMP=KitVehicles PROPS='{"kit":{"quality":"draft"}}' bash scripts/stills_locked.sh out/kit_vehicles/draft_ <frames> 0.5`
(final: `"quality":"final","prof":true`, scale 1; the film's two sets on the clock: `COMP=KitVehiclesV3`, prefix
`out/kit_vehicles/v3/draft_`, frame N = frame N of the film).
- **The parts** `studio/out/kit_vehicles/draft_<n>.jpg` (0-28, 46; rows in `sandboxes/kit_vehicles/film.ts`): exterior
  at a platform, face, bogie, roof, doors open / closing / closed, the car-side lamp, cab, desk, car, doorway, FRAME 0
  (21, 22), the door order (28 = leaves just met, lamp lit; 46 = 0.6 s later, lamp out). Most were rendered 22:30-23:10
  on 2026-11-19, BEFORE the ochre strips, the lower right partition sill and the duller emerald; 1, 7, 11, 15, 18, 21,
  23 after the first ochre. Finals: `final_21.jpg`, `final_1.jpg`, `final_17.jpg` (23:05), `final_2.jpg`,
  `final_26.jpg` (earlier).
- **The film's two sets** `studio/out/kit_vehicles/v3/draft_<frame>.jpg`, rendered 00:05-00:20 on 2026-11-20 with the
  clock's frames (s02 81-145, s03 145-212, s06 352-437): 81, 101, 125 (s02), 145, 165, 205 (s03), 385, 415, 432 (s06).
  They show the staging of 00:05: the suitcase's home was 12 cm further forward and 8 cm more to the wall than now.
- Copies for the owner: `C:\\Users\\utkar\\Desktop\\animated-shorts-studio\\pointing_preview\\TRAIN_1..4_*.jpg`.
- Before (20:35 at takeover): `out/kit_vehicles/before_2030_*.jpg`.

### Cost (GTX 1660 Ti / ANGLE D3D11, shared with other sessions; CORE's `kit.prof`; final = 1080 x 1920, 8 sub-frames)
Measured 22:30-23:10 on 2026-11-19 (before the restaging; the geometry is the same, the cab set has since gained the
suitcase + one glove card):
| what | measured |
|---|---|
| the parts alone (3-car train at a kit platform, or the 2-car train on a light lineside; no cast) | sub-frame 15.4-28.0 ms over 7 framings (main pass 12.4-19.6, AO 1.6-12.5, shafts 0-9.6, sun shadow 0.8-2.4); CPU updates 0.5-0.7 ms |
| the film's `car` set (2-car train + CAST's cards + the full lineside + station B) | sub-frame 33.2 / 39.2 ms (main 18.0-23.4, sun shadow 10.5-12.4, AO 7.1-8.3); CPU updates 16.5-30.3 ms (the cards, not the train) |
| the film's `cab` set | sub-frame 27.8 ms (main 17.1); CPU updates 6.1 ms |
| one final frame | parts ~0.2 s; the film sets ~0.4-0.55 s of GPU + updates (budget 4 s) |
| lights from this kit | 0 (budget 8 real / 4 rect / 2 shadowed) |
| shader programs | parts 36-45; the film sets 78-89 with CAST + the full lineside |
| compile per render tab | parts 7.8-10 s; the film sets 20-26 s |
| a draft still, all in | parts 16-25 s; the film sets 33-60 s at 23:00, 52-90 s after midnight with three sessions rendering |
| a final still, all in | parts 21-43 s; the film sets 51-66 s |
Triangles were not counted.

### Honest gaps (the open work is in the HANDOVER block at the top)
1. **Not a real JR car in four places, on purpose or unchecked:** tall door glass (0.34-1.74 m) and a 0.55 m sill on the
   right partition window (story needs); the waist band crosses the door leaves and the car-side lamp sits mid-car in
   the fascia (both unchecked against a source: no web tonight).
2. **Only car 1 has the hero cab + hero interior.** The rear cab is an empty shell; far cars show benches, a ceiling
   glow and poles. Crew door, cab door, gangway doors and the emergency door do not open; wipers parked; the pantograph
   does not bounce; destination displays are blank.
3. **Reflections are painted, not captured** (`skyEnv`, `carEnv`, `cabEnv`): no platform, people or suitcase in any
   reflection; day versions only. `giK` 0.3 was chosen by eye.
4. **The lampBeacon's black board only reads with the lower sun haze** (`hints.rigOpts.haze 0.0005`, both sets): at the
   golden rig's own haze the in-scatter toward the low sun lifts it to the background's brightness.
5. **2D cards against 3D props:** a card's foot or hand lives in the card's plane. The hook works because STAGE puts
   the suitcase's wheel level with the tourist; a lens far off his plane will show the toe beside the wheel, not on it.
6. **The UNSEEN 1.5 km skip** (`EV.stopA` + 2.5 s .. `EV.glideA` - 0.5 s) is a 300 m/s blur if a cab / car shot ever
   lands in that window.
7. **Draft stills alias** (brushed steel, louvres, gasket lines at 540 px); at final they hold.

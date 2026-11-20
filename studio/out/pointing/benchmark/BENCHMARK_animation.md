# BENCHMARK: animation, motion and glitches. "Why Japanese Train Drivers Point at Nothing" (rejected)

Reviewer lens: ANIMATION, MOTION AND GLITCHES. Date 2026-11-20.
Film checked: `studio/out/pointing/pointing_FINAL_1080x1920.mp4` (1913 frames, 63.8 s, 30 fps).
Compared with: our anti-theft, clown, salad oil and typo finals, and 24 reference Shorts (1M-35M views).

**Verdict in one line:** the owner is right. This film does not have too little motion. It has the wrong kind. The whole
picture shimmers and drifts in every frame, while the characters stay frozen like posters and one long beige arm swings
around. Seven times the arm or hand makes an ugly or rude shape (a raised single finger, a plank with no hand, a white
blob fist at the lens, a pole with no body). Score for animation: **2.5 / 10**. Our anti-theft: **7.5**. The reference
channel: **9**.

All scratch evidence is in `studio/out/pointing/benchmark/animation/`:
- `frames/` every 2nd frame at 540 px (957 frames), `sheets/` the same frames as 52 labelled sheets, one set per shot (all looked at)
- `worst/` 10 strips of the 10 worst moments (named 01 ... 10, listed in section 3)
- `strips/` 0.5 s strips of antitheft, clown, saladoil and 6 reference Shorts; `refx/ref_hands.jpg`, `refx/ours_hands.jpg` arm and hand comparisons
- `tools/motion.json` measured motion for all 29 films; scripts `sheets.py`, `motion.py`, `strips.py`, `worst.py`

---

## 1. The numbers first

Measured on every frame (108 x 192 px grey). "Moving area" = share of the picture (top 58 %, above the captions) whose
pixels change by more than 14 levels from the frame before. "Hold frames" = frames where under 1 % of the picture changes,
i.e. a real still beat. "Whole-frame motion" = frames where 12+ of 24 picture cells move at once (camera drift, shimmer).

| film | length s | moving area mean % | hold frames % | whole-frame motion % |
|---|---|---|---|---|
| **POINTING (rejected)** | 63.8 | **16.4** | **0.0** | **83.4 (highest of all 29 films)** |
| antitheft (our best, 91.5 % viewed) | 83.9 | 7.8 | 15.6 | 34.5 |
| saladoil | 86.9 | 7.8 | 27.3 | 28.4 |
| typo | 84.8 | 8.9 | 17.5 | 34.3 |
| clown | 74.9 | 13.4 | 0.0 | 57.1 |
| 24 reference Shorts, median | ~60 | ~13.9 | ~11.5 (range 3.2-30.8) | ~55 |
| Ancient Jar (35M) | 64.8 | 13.0 | 11.8 | 55.0 |
| Perfect Railroads (30M) | 65.2 | 17.0 | 7.1 | 56.7 |
| Job Nobody Wants in Japan (18M) | 60.5 | 13.2 | 4.9 | 63.3 |
| Storm Oil (16M) | 64.6 | 15.1 | 7.9 | 63.8 |

What this says, plainly:
1. **We move MORE pixels than our best film and as many as the references, and it still looks dead.** So "add more
   motion" is the wrong fix. The motion we have is noise: camera creep, drift, floating dust specks and depth-of-field
   breathing in 83 % of frames (references 55 %, anti-theft 34.5 %).
2. **Zero hold frames.** Every one of the 24 references has real still beats (median 11.5 % of the film). Anti-theft has
   15.6 %. We have none: nothing ever lands and rests, so nothing reads as a pose or a joke. The references get their life
   from *events* (a cut to a new place, a pose snap, a prop doing something, a crowd moving), then they rest.
3. **Per shot, the low-motion shots are exactly the ones the owner calls "focusing on one thing"** (moving area per shot):
   s09 3.8 %, s17 6.0 %, s19 6.6 %, s21 7.4 %, s22 7.8 %, s16b 10.9 %, s16a 12.1 %. In those shots one small thing moves
   (red balls, a mouth, a glove) and the rest of the frame only drifts.

Arm use (counted on the shot sheets): an arm is stuck out away from the body for about **658 of 1913 frames (34 %, ~22 s)**:
s01 81 f, s03 24, s03b 48, s04 50, s08 ~60, s13 77, s14 33, s15 ~60, s16b ~50, s20 74, s21 31, s23 ~30, s24 ~40.
In 240 sampled reference frames (0.5 s apart, 6 Shorts) a free arm held out from the body appears in **about 10 (~4 %)**,
and each time it is short, thin and brief (Jar 5.0 s "run.", Railroads 20.0-21.0 s handshake, Pink Cell 20.5-21.5 s
stopwatch). The acting code confirms it: `videos3/pointing/cast/beats.ts` has **119 acting beats, 17 "point" + 15 "call"
= 32 arm-out gestures in 64 s, one every 2 s**, with arm `stretch` factors of 1.3 (x4), 1.7, 3 and **4** and hand scale
`hs` up to **2.0**. The film is built around one gesture, so one gesture is all the viewer sees.

---

## 2. Full glitch catalogue (every shot, from the 957-frame sheets)

Visibility = how clearly a normal viewer sees it at phone size (high / medium / low).

| # | shot | frames (time) | what you see | visible at phone size | root cause guess |
|---|---|---|---|---|---|
| 1 | s01 | 0-80 (0-2.7 s) | Tourist's arm is a straight beige **plank** from the shoulder to the left edge. From f16 the hand is out of frame: a cut-off pole aimed at a blank cream train wall (f20-48). Head and body are dead still, only the train slides behind. | high (it is the hook) | arm aimed at a fixed world point + tight framing (head ~27 % of height); arm length not capped |
| 2 | s01 | 17-19 | half-lid blink on frame 1-second: the face looks bored, not shocked | medium | idle blink on the video clock, not placed by hand |
| 3 | s01->s02 | 80/81 | face jumps ~150 px down and ~100 px sideways across the cut | medium | no eye-trace match between shots |
| 4 | s02 | 130 | whole tourist card is ~50 % transparent: background seen through his face | high | crossfade between two cards / sub-frame blur accumulation on cards |
| 5 | s02 | 134 | turn to profile: a different-looking man (sideburns), the **forearm goes straight into his open mouth** | high | profile card drawn separately; arm path not checked against the head |
| 6 | s02 | 136-138 | smear of 3-4 overlapping outlines (ghost), then the back of the head is a blank skin disc | high | card crossfade + motion blur on cards; no back-of-head drawing |
| 7 | s03 | 140-163 | driver's out-of-focus back of head = a flat brown disc filling the left quarter; dust specks look like dirt on the lens (also in the craft audit) | medium | near-lens card with no cap/hair; particle FX |
| 8 | s03b | 164-172, 192-210 | driver faces the lens and points AT us: the glove foreshortens into a **giant white fist** over a third of the frame, overlapping his face | high | `lensGlove` foreground card + point aimed at the lens axis |
| 9 | s03b | 174-180 | "hand by the ear" is an open white palm by the face with a grin = **waving hello** | high | `earHand` pose reads as a wave |
| 10 | s03b | 207-211 | half-lid smug frames: eyes flicker | medium | expression keys too close together |
| 11 | s04 | 220-252 (7.3-8.4 s) | tourist's raised arm with **one upright finger, back of hand to camera, held over the boy's head for ~1 s** = reads as a raised middle finger; at f224 the arm passes over the boy's eye like a poke | high | "jab/point up" pose with index finger only, staged above another character |
| 12 | s05 | 300-312 | tourist turns see-through passing the lens (craft audit; seen in f302) | medium | card motion blur accumulation |
| 13 | s07 | 467-468 | commuter jumps from behind the door leaf to in front of it (craft audit) | low | draw order flips |
| 14 | s08 | 510-546 (17.0-18.2 s) | suitcase fills ~55 % of the frame; the tourist is frozen behind it; the boy is a sliver at the left edge on "the boy's finger" | high | framing on the prop, not on the action |
| 15 | s08 | 546-556 | tourist's body jumps up and forward in 2-4 frames (the lunge) with his arm vanishing behind the handle; the save happens off screen | high | lunge as a position tween, no anticipation pose |
| 16 | s08 | 585-621 | the "BAD SUITCASE" wag happens half out of the right edge (audit) | medium | framing |
| 17 | s10 | 731-757 | suitcase grip at the boy's mouth; tourist's hand touching his face (audit) | medium | characters overlapped, no spacing rule |
| 18 | s11 | 840 | tourist's face shows **three overlapping sets of eyes** (double exposure) | high | crossfade/blur on a card flip |
| 19 | s11 | 842-850 (28.1-28.3 s) | he turns into a **translucent ghost and slides through the closed door glass**; legs dissolve | high | motion blur + card behind the door leaf, no step-out animation |
| 20 | s12 | 874-942 | boy and mum read as two stacked heads; boy's eyes flicker half-lid (f890-894); nobody moves except the camera push | medium | blocking; idle expression flicker |
| 21 | s13 | 950-1018 (31.7-34.0 s) | tourist's left arm crosses his chest as a **big foreshortened white fist** in front of his body, aimed at the lens; there is no vending machine in frame; f990-1018 a faceless **black blob** commuter wipes across the boy and bag | high | point aimed at lens; back-view crowd card drawn as a black silhouette |
| 22 | s14 | 1024-1052 | boy's "hand by the ear": his **forearm lies across his face** (eye to cap) for ~0.9 s; the other arm is a long straight rod to the bag; mum's head sits right behind his | high | ear pose drawn on the near side of the face; arm `stretch` |
| 23 | s15 | 1084-1110 | a disembodied foreground glove (the kid's hand) floats in the bottom-right corner with no arm or body | medium | foreground glove card |
| 24 | s15 | 1088-1138 (36.3-37.9 s) | tourist in a **T-pose / scarecrow**: both arms straight out for 1.7 s | high | "shrug/guns" pose held too long, arms at full length |
| 25 | s15 | 1092->1094 | tourist **pops**: jumps up ~10 % of the frame height and grows ~12 % in 2 frames | high | position/scale key with no ease (or a camera key) |
| 26 | s15 | 1140-1148 | profile turn = a different man; f1144 ghost double exposure; f1146 blank back of head | high | same as #5-6 |
| 27 | s16a | 1150-1270 (38.3-42.3 s) | **4.07 s** of the tourist standing with the phone at his ear, eyes shut, grin. Only the mouth and a tiny hand twitch move. Words: "his eyes looked right at it" while his eyes are closed. Boy and bag tiny in the right edge | high (boredom) | one long take with no event, no cut, no background life |
| 28 | s16a->s16b | 1271/1272 | same angle, just bigger: a **jump cut** | medium | push replaced by a cut |
| 29 | s16b | 1282-1330 | a floating beige fist hangs cut by the left frame edge (his other hand, foreshortened), not attached to anything visible | high | `call` arm reaching toward lens in a close-up |
| 30 | s16b | 1278, 1322, 1352-1354 | half-lid / sleepy expression frames flash in and out | medium | expression keys every few frames |
| 31 | s17 + s19 | 1356-1466, 1497-1600 (7.2 s) | lab: the only motion is 1 cm red balls dropping into a jar. Balls **appear from nowhere** above the frame (f1378, 1394, 1408, 1424, 1438, 1572). The volunteer who "points and says it out loud" is hidden behind the jars, so the action the words describe is never shown. Lower 45 % is empty table | high (boredom) | experiment shown as a prop counter, not as a person doing it |
| 32 | s18 | 1468-1480 | the boy's red shoes smear into a flat red streak on the platform: looks like a **blood puddle** | medium | foot card squashed by the low lens / motion blur |
| 33 | s20 | 1612-1674 (53.7-55.8 s) | the kid's arm is a **600+ px grey pole** from the right edge with a hand, no boy attached, crossing the tourist's back; tourist seen from behind | high | `hs: 2.0`, `stretch: 1.3` on the kid's point, boy outside frame |
| 34 | s21 | 1676-1704 | a dark glove held still on the console for 1 s; only dust specks move | low-medium | hold with no secondary motion |
| 35 | s22 | 1706-1798 (3.1 s) | tourist laughs on the phone on stilt legs; the only motion is a head bob; flare sits on the window with the boy and bag | medium | single action, no background event |
| 36 | s23 | 1815-1853 | the boy's payoff "BAG... CHECK!" is **hidden behind the tourist's phone and hand**; tourist is half cut by the left edge; eyes flicker (f1828-1830, f1842) | high | blocking; phone hand on the boy's side |
| 37 | s24 | 1880-1906 (62.7-63.5 s) | "hand by the ear": the **back of his hand with one finger up crosses his face** (f1900-1906) = a middle finger or nose-pick, on the last frames before the loop | high | ear pose routed across the face |
| 38 | all | whole film | arms are thick pale-beige tubes with visible elbow joints (wooden mannequin) and big white glove hands; on a beige shirt and a cream train they read as sticks or planks | high | new v3 cast style (see section 4) |
| 39 | all | whole film | characters' mouths grin or flap while the NARRATOR speaks (s16a, s22), so it is unclear who talks | medium | talk/laugh cycle not tied to the speaker |
| 40 | all | whole film | zero hold frames: everything drifts all the time (section 1) | high (feel) | camera creep + particles + DOF on every shot |

---

## 3. The 10 worst moments (strips in `studio/out/pointing/benchmark/animation/worst/`)

| rank | file | frames | why it is the worst |
|---|---|---|---|
| 1 | `01_s04_middle_finger_over_boy.jpg` | 214-252 | at 7.3-8.4 s the tourist holds one upright finger over the boy's head for over a second. Anyone reads it as a rude gesture at a child. |
| 2 | `02_s24_finger_across_face_at_loop.jpg` | 1880-1906 | the last half second (the loop seam, the most re-watched frames) shows a middle finger / nose-pick across his face. |
| 3 | `03_s02_turn_double_exposure_arm_in_mouth.jpg` | 128-138 | see-through body (f130), arm into the mouth (f134), multi-outline ghost (f136), blank back of the head (f138), in 0.3 s at 4.3 s. |
| 4 | `04_s11_ghost_tourist_floats_out.jpg` | 836-850 | three sets of eyes, then a transparent man sliding through a closed glass door. |
| 5 | `05_s03b_driver_white_blob_fist.jpg` | 164-208 | the film's subject (the driver's point) is a white blob punching at the lens, then a wave. The first clear view of the gesture is unreadable. |
| 6 | `06_s01_handless_plank_arm_hook.jpg` | 0-70 | the hook: from 0.5 s the "pointing arm" is a handless plank aimed at a blank wall; nothing else in the frame moves. |
| 7 | `07_s15_tpose_scarecrow_and_ghost_turn.jpg` | 1084-1144 | T-pose for 1.7 s, a pop (f1092->1094), a floating glove, then another ghost turn. |
| 8 | `08_s20_rod_arm_no_body.jpg` | 1610-1660 | a 600 px pole with a hand and no child. |
| 9 | `09_s16a_s16b_dead_4s_and_floating_fist.jpg` | 1150-1326 | 4 s of a man standing still with a phone, then a jump cut to a close-up with a fist floating at the frame edge. |
| 10 | `10_s17_s19_lab_only_balls_move.jpg` | 1356-1590 | 7.2 s where the only thing that moves is small red balls falling from nowhere. |

---

## 4. How the better films move (evidence)

Strips: `animation/strips/antitheft_*.jpg`, `clown_*.jpg`, `saladoil_*.jpg`, `ref_jar_*`, `ref_japanjob_*`,
`ref_railroads_*`, `ref_pinkcell_*`, `ref_burglar_*`, `ref_stormoil_*`. Side by side: `refx/ref_hands.jpg` (6 reference
gestures) and `refx/ours_hands.jpg` (clown 13.2 s, antitheft 24.0 s, clown 53.5 s, antitheft 33.2 s, pointing f1110, f966).

### 4.1 Arms and hands
| | references | our anti-theft / clown | pointing (rejected) |
|---|---|---|---|
| limb drawing | thin dark ink lines, about outline weight | thin dark ink lines (clown 53.5 s, antitheft 33.2 s) | thick pale-beige tubes with elbow joints, about 3-4x thicker, same colour as shirt and train |
| hand | small simple mitten / ball | small mitten | big white glove, scaled up to 2.0x (`hs`) |
| arm length | short; a reach is about one body width | short | stretched up to 4x (`stretch: 4` in beats.ts); rods of 600+ px |
| how often an arm is out | ~4 % of sampled frames | rare; arms hold props (clipboard 40-42 s, bill, phone) | 34 % of frames |
| direction | sideways, in profile or 3/4, never at the lens | sideways | often straight at the lens (s03b, s13, s16b) = foreshortened blobs |
| crossing the face | never seen in the sampled frames | never seen | 6 times (#5, #11, #21, #22, #36, #37) |
| what the hand does | touches a prop or body: stopwatch (Pink Cell 20.5 s), handshake (Railroads 20.0 s), gift box (Japan job 14-16 s), a cannonball held at the chest (Storm Oil 24.6 s) | holds props: sign test clipboard, dollar bill, phone | points at things, often at nothing in frame |

The one reference point gesture I found (Jar, 5.0 s, "run."): a thin black arm raised beside the head, index up, the hand
outside the head outline, held under a second, then a CUT. That is the whole recipe for a point.

### 4.2 Bodies and poses
- References hold a pose, then **snap** to the next one (Pink Cell 25.0-28.5 s: the inmate's flex pose is held for 3 s while
  red cracks run over the wall; 31-37 s the arm-wrestle pose is held while the guard's face swaps). Life comes from the
  face swap, the VFX and the cut, not from limbs swinging.
- Our anti-theft does the same: the woman's arms stay under her dress; at 22-26 s she leans and whispers with a small hand
  at her mouth; the fiancé's face swaps (calm, sweat, shock). Held poses, 1-frame face swaps, no ghosting.
- Pointing does the opposite: bodies are planted (s16a, s22, s13), and the arm tweens continuously with overshoot, so the
  limb is always mid-flight. Mid-flight frames are where the rude shapes, planks and blobs live.

### 4.3 Turns
- References and our older films **cut on a turn** or swap the card on one frame. In the sampled strips no reference shows a
  character turning on screen as a blend.
- Pointing blends cards with blur on 4 turns (f130-138, f840-850, f1140-1146, f300-312): every one is a ghost.

### 4.4 Size in frame and framing
- References: in mediums the whole figure is about 35-60 % of the frame height, with the hands inside the frame; close-ups
  are short (Jar 1.0-2.0 s dragon, Japan job 15.0-16.0 s) and are of a face or a prop, not of a gesture.
- Pointing: the hook frames the head at ~27 % of the height and the arm leaves the frame (s01); s03b's driver fills ~85 %
  of the frame with a glove at the lens; s16b's head fills half the width with a fist cut by the edge; s20 shows only the arm.
  When the card is that big, any gesture leaves the frame and reads as "an arm going somewhere".

### 4.5 What else moves in each shot
| film / shot type | what moves besides the main character |
|---|---|
| antitheft wides (8.0-9.5 s, 17-20 s) | birds crossing the sky, a crowd of tourists, a pile of wood growing, signs |
| clown plaza (0-17 s) | pigeons on the ground in almost every frame, a dog (6.0 s), crowd walkers, flags, falling petals |
| Jar (8-12 s, 15-16 s) | eight dragon heads, a frog, a hall full of soldiers, a city crowd |
| Railroads (20-40 s) | steam, a crane, a train gliding, flags, a crowd with newspapers, a moving horizon |
| Storm Oil (27-40 s) | waves, rain, a ship rolling, oil pouring, ropes swinging |
| **pointing platform shots** (s01, s13, s16a, s22, s24) | **one commuter now and then; dust specks; nothing else** |
| **pointing lab** (s17, s19) | **red balls only** |

### 4.6 Speech and faces
- Style bible (16 references): "no mouth movement on narration"; faces change by 1-frame expression swaps.
- Pointing: the tourist grins and flaps while the narrator talks (s16a f1154-1270, s22), and half-lid frames flash in and
  out of held faces (#2, #10, #20, #30, #36), which reads as eye flicker.

---

## 5. Root causes in how we made it

1. **A procedural acting system with no taste limits.** 119 beats, 32 arm-out gestures in 64 s, arms allowed to stretch up
   to 4x and hands to scale 2x so they always "reach" the target. The code makes an arm reach anything; nobody stopped it
   from becoming a plank.
2. **A new cast style.** The v3 cast switched from the thin ink limbs of anti-theft and clown (which the references also
   use) to thick beige tube arms with white gloves. Thick, low-contrast, jointed tubes look like wooden mannequin arms and
   foreshorten into blobs.
3. **The script made one gesture the whole film**, and the staging aimed it at the lens (driver s03b, tourist s13, s16b).
   A point at the lens is the hardest thing to draw on a flat card.
4. **Card turns done as blends** (crossfade + sub-frame motion blur on cards) instead of a one-frame swap or a cut.
5. **Camera never rests**: creep, drift, particles and DOF on every frame (0 % hold frames), so the screen is busy with
   noise while nothing happens.
6. **No background life plan** for the platform and lab sets, unlike lesson 49 ("at least three moving background things
   per shot") which clown followed and pointing did not.
7. **Checking on sample stills.** The storyboard sandbox (`sandboxes/kit_rail/v3.ts`) samples 2-5 frames per shot; the
   glitches live in the frames between poses (turns, arm paths). Three audits named most of these problems (MUST_FIX_v2)
   and the film still went to the owner with them.

---

## 6. Exact rules and changes

### 6.1 Acting to remove or simplify
| shot | now | change to |
|---|---|---|
| s01 / s24 (hook + loop) | handless plank aimed at a blank wall; middle-finger ear pose | Thin arm, real length, hand always in frame, pointing sideways at the suitcase that is IN frame. Delete the "hand by the ear" pose entirely. Shocked face on f0. |
| s03b | white fist at the lens, wave | Profile or 3/4 driver; thin arm up and out to screen-left at the green lamp that is in frame; held still 12-15 f; mouth closed; then CUT. No `lensGlove`. |
| s04 | one finger raised over the boy's head | Remove. The tourist laughs with BOTH hands on his belly or holding his phone toward the driver (prop action, not a point). |
| s08 | save happens behind a giant suitcase | Wide enough to see boy, arm and bag; the boy's point is a short arm held still; tourist's eyes follow, then a snap pose of him grabbing the bag (2-3 poses, not a tween). |
| s13 | fist across chest at the lens, black blob passer-by | Vending machine in frame; a side-on short point; passer-by gets a coat colour and walks BEHIND him. |
| s14 | forearm across the boy's face, rod arm | Boy points side-on with a short arm; no ear pose; mum offset 80-120 px. |
| s15 | T-pose 1.7 s, pop, ghost turn | One shrug pose (hands at shoulder height, close to the body) held 15 f; no scale/position pop; cut instead of turning. |
| s16a / s16b | 4 s of standing, then jump cut and floating fist | Split into 3 framings of 1.2-1.5 s each (his face looking at the phone screen / the phone screen with the clip / the boy and bag behind him, reverse). No hand reaching to the lens. |
| s20 | 600 px pole arm, no boy | Boy in frame (shoulder, cap, arm); arm no longer than the rig; or cut to the boy's face and then to the bag. |
| s23 | phone hides the payoff | Phone in the screen-left hand; the boy's face and point fully visible. |
| s17 / s19 | balls fall from nowhere for 7.2 s | Show the volunteer pointing and talking side-on (thin arm, held pose), the ball dropped BY a visible hand, push in so jars are ~60 % of height; cut between volunteer and jars every ~1.5 s. |

### 6.2 Where to cut away instead of animating
- Every turn (f130-138, f840-850, f1140-1146): cut to the next angle on the turn, or swap the card on one frame.
- Every big arm move: show the start pose, cut, show the end pose held (references do exactly this: Jar 5.0 s).
- The "save" (s08), the "hop out" (s11) and the final realisation (s24): use 2-3 strong held poses joined by cuts or 2-4 f
  snaps, not long tweens.

### 6.3 Rules for the cast rig
- Limbs drawn as thin dark ink lines (as in anti-theft and clown), hands small mittens. No tube arms, no white gloves except
  on the driver, and his glove at hand-size 1.0.
- `stretch` max 1.0 (arms never longer than the rig). `hs` max 1.1.
- No hand ever crosses a face (own or another character's): keep the hand at least one hand-width outside the head outline.
- No single raised finger with the back of the hand to camera. Pointing hand = thumb visible, finger sideways.
- Never point at the lens. Points go sideways (profile or 3/4) at something visible in the frame.
- At most one arm-out gesture every ~6 s on screen (refs ~4 % of frames; target under 10 %), each held 10-20 f.
- The hand stays inside the frame for any shot where the arm is visible; if not, reframe or cut.
- Card swaps on one frame; no motion blur or crossfade on character cards (opaque only).
- Mouths move only on that character's own lines; never on the narrator's.
- Expression changes at most every ~20 f inside a held pose; no half-lid flash frames.

### 6.4 Framing
- Medium shots: whole body 35-60 % of frame height, hands inside the frame.
- Close-ups: face or prop only, 1-1.5 s, held still; never a close-up of a gesture toward the lens.
- Two-shots: faces offset 80-120 px, nobody stacked behind a head.

### 6.5 What must move in the background, per shot type
| shot type | minimum life (at least 3 per shot, lesson 49) |
|---|---|
| platform wide / medium | 2-3 commuters walking in depth with colour, a pigeon or two, a departure board ticking, a train sliding in the far track, a station staff member |
| inside the car | standing commuters swaying, straps swinging, the landscape passing in the windows, a newspaper page turning |
| driver's cab | signals passing outside, wipers or reflections, speedo needle, a light blinking |
| lab | the volunteer's face and arm, a researcher with a clipboard writing, a timer counting, a second volunteer in the background |
- And the camera must REST: target 10-15 % hold frames (refs median 11.5 %, anti-theft 15.6 %), with moves that are clean
  glides between rests, not constant creep. Remove the floating dust specks in the cab and lab.

### 6.6 Process
- Check every 2nd frame of every shot on contact sheets before showing anyone, not 2-5 sample stills per shot. A glitch
  list must be zero for: hand over face, single finger, transparent character, arm cut by the frame edge, pop > 3 % per frame.
- Run `tools/motion.py` (this folder): hold frames 8-20 %, whole-frame motion under 60 %.

---

## 7. Can it be saved?

**ONLY WITH A REWRITE OF THE ACTING AND STAGING.** The sets, light and train are usable, but 16 of the 26 shots carry
one or more high-visibility glitches and the whole film's motion style (one stretched arm, frozen bodies, a drifting
camera) is the wrong idea. Polishing the current beats cannot fix that. Re-block every character shot with thin limbs,
held poses, cuts on turns and background life, and the film can reach the anti-theft level.

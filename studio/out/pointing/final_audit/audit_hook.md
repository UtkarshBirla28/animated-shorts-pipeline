# Hook audit: frames 0-212 (0-7.07 s) plus the loop seam

Film: `studio/out/pointing/pointing_FINAL_1080x1920.mp4` (1913 f, 63.77 s). Independent auditor, lens = HOOK FORENSICS.
Nothing was played out loud. Picture judged from extracted frames; sound by measurement only.

Scratch work: `studio/out/pointing/final_audit/hook/`
- `frames/f0000-f0212.jpg`: every frame 0-212 at full size; `seam/t1880-t1912.jpg` (the tail; t1913+ = f0+)
- `thumb270_f0.png`: frame 0 at feed size (270 px)
- strips: `strips/hook_f000-023.jpg` ... `hook_f144-167.jpg` (every frame 0-167), `hook_f168-212.jpg`,
  `punchin_f49-52.jpg`, `cut1_f79-82.jpg`, `turn_f132-137.jpg`, `cut2_f138-141.jpg`, `s03b_f164_176_186_196.jpg`,
  `s03b_blinks_f206-212.jpg`, `seam_f1880-1912_then_0-20.jpg`, `seam_f1904_1910_1912_0.jpg`
- `hm/`: the hook lab's own `hook_measure.py` run on this film (same method as OPENINGS_DATA), strip `hm/strips/pointing-final.jpg`
- `measure.py`, `blobs.py`, `perframe_0_212.json`, `hm/metrics.txt`: the numbers below

## 1. Verdict in five lines

1. The measurable craft of the opening is now at hit level: voice at 0.07 s, 10 words by 3 s / 17 by 5 s, longest gap 0.155 s, first cut 1.70 s, 3 cuts in 0-5 s, 29 % of the frame changing per frame in 0-1 s (his median 25 %, his top 6: 30 %). It is the first of our openings to pass every number in OPENINGS_DATA.
2. Frame 0 is good: one face (head 27 % of the frame height), a straight point and his eyes both aimed at a big yellow suitcase (24 % of frame height, chroma 62 against a frame median of 20). It is the only saturated yellow.
3. The weak spot is time: the suitcase leaves the frame by f16-f20 (0.55-0.67 s). The script planned 1.4 s. From 0.67 s to 2.70 s (2 s) the picture is a man pointing at a blank cream car side. The loss is told by the caption more than shown.
4. The face at frame 0 reads as "mildly puzzled", not as shock. The driver's first clear point (s03b) is aimed at the lens and reads as a white blob, and his "hand by the ear" is an open palm, so it looks like a wave and a grin.
5. The seam is one continuous picture and sound. But on the "Bag..." beat just before it (f1900-1907), his hand-by-the-ear pose puts one upright finger in front of his nose. At phone size that reads as a middle finger or nose-picking.

Not at its ceiling yet, but close. I estimate about 74-78 % stay past 3 s as it is, and about 78-82 % with fixes 1-3 below.
That 78-82 % is about the ceiling for this story and topic.

## 2. Frame 0 (and the 270 px feed thumbnail)

- **Eye path (0.25 s):** (1) the big face and maroon cap, upper right; (2) along the arm and the down-left gaze to (3) the yellow suitcase, middle left; (4) the caption "His bag". The cobalt phone runs straight through the caption (phone x 525-590, y 1210-1450; caption y 1320-1390).
- **What a stranger says from frame 0 alone:** "a man in a red cap pointing at a yellow suitcase in a doorway". Whether it is a *train* is weak in the still. The car side is a cream wall with a door. The green body stripe only shows at the right edge (x > 1000). The platform cues sit inside YouTube's bottom overlay: the tactile strip is at y≈1650-1700 and the "1·1" marker at y≈1800, both under the 83 % line.
- **From frames 0-45:** the door slides left from f1 and the suitcase whooshes out of frame left (yellow area 8.1 % → 1.8 % by f24). The arm follows it off-frame, and car after car with the green stripe streams behind him. With the captions "His bag / on that train." a stranger can say "his bag left on a train without him". With no captions it is "a man pointing as a train goes by". **Pass with captions; borderline without.**
- **Measurements, frame 0:**
  - L* 57.3, L sd 25.5: bright and contrasty. His median is 49.
  - Chroma 23.3. His median is 25.6, his top 6 is 33.6 and our last five averaged 35.6. The cream car side (#e5c6a0, 41 % of pixels) dulls it.
  - Suitcase blob: x 106-456, y 919-1384 → 24.2 % of the frame height, 32 % of the width, 6.75 % of the area, chroma 62, L* 85.
  - Cap: 10.1 % of the height, 47 % of the width, chroma 62, but L* 28 (maroon, dark). Head from cap top to chin is about 27 % of the frame height (the script planned 19 %).
  - Red tag on the handle: not visible. "YORK" is readable on the shirt (the arm covers "NEW").
- **Expression:** the brows are slightly knit, the eyes look down-left and the mouth is a small flat line. It reads as "hm?", not as loss. A blink with half lids at f17-19, then the long half-lid at f49-52 and f64-70, read as bored or unimpressed. That works for the deadpan "He is not.", but nothing in 0-0.5 s sells "oh no".
- **The boy** (the script's rewatch detail in the door window at frame 0) has left the frame by f0. He is in the window at f1880-1906 only.

## 3. Per-frame change against OPENINGS_DATA (method: 270x480 grey, caption band 60-82 % masked, |ΔY| > 6)

| window | median share of pixels changing per frame | min |
|---|---|---|
| 0-1 s | **0.294** (his 24: 0.25, top 6: 0.30, our old five: 0.11) | 0.244 |
| 1-2 s | 0.292 | 0.262 |
| 2-3 s | 0.254 | 0.187 |
| 1-3 s (hook lab script) | 0.28 (his 0.29, top 6: 0.41) | |
| 3-4 s | 0.371 | 0.262 |
| 4-5 s | 0.287 | 0.211 |
| 5-7 s | 0.229 | 0.126 |
| s03b 165-211 | 0.208 | 0.126 |

- No frame in 0-212 has less than 10 % change.
- Hook-lab camera: 0-1 s 0.548 %/f (his median 0.76, floor 0.23); 1-3 s 0.817 %/f (his median 0.99, top 1.61); 3-5 s 1.40 %/f.
- Push-in: cap width 503 → 564 px in 1 s (1.12x, rule 17 passes), then 1.25x at the f51 punch-in.
- Honest note: after f20 most of the 0-3 s change is the train's side streaming behind him (background), not story action. It holds the eye, but it is not new information.
- Transitions found: f51 (1.70 s, punch-in), f81 (2.70 s, cut 1), f140 (4.67 s, cut 2), f164 (5.47 s), f212 (7.07 s, the first frame of a dissolve into s04). Soft events at 3.3 s and 4.47 s are the pull-back and the turn.

## 4. Sound and words (measured)

- First sound at 0.00 s: the motor whine is under the picture from frame 0, RMS -30 dBFS in the first 50 ms. "His" starts at 0.07 s and peaks at -12 dBFS at 0.10-0.15 s.
- Level 0-0.5 s: -17.7 dBFS. Level 0.5-3 s: -15.3 dBFS (his median -15.7). The clown's was -23.
- **Words started by 3.0 s: 10** ("All" at 2.78). **By 5.0 s: 17** ("finger" at 4.69). His floor is 9/14, his median 11.5/19, his top 6 11/17.5. **Pass.**
- Longest gap in 0-5 s: **0.155 s** (laugh → at). The others are 0.15 s.
- Words in 3 s bins across the film: 0-3:10, 3-6:8, 6-9:7, 9-12:9, 12-15:8, 15-18:9, 18-21:5, 21-24:2, 24-27:7, 27-30:6, 30-33:2, 33-36:1, 36-39:6, 39-42:10, 42-45:10, 45-48:8, 48-51:6, 51-54:8, 54-57:7, 57-60:2, 60-63:3, 63-64:1.
- Words in 5 s bins: 0-5:17, 5-10:11, 10-15:14, 15-20:14, 20-25:6, 25-30:9, 30-35:3, 35-40:9, 40-45:17, 45-50:11, 50-55:15, 55-60:5, 60-64:4. The thin bins (20-25, 30-35) are designed picture beats and are outside this lens.

## 5. Captions against the action under them

| caption | frames | action | match |
|---|---|---|---|
| His bag | 0-16 | the suitcase in the door window, his point on it | yes |
| on that train. | 17-48 | the suitcase whooshing out left, the train streaming | yes (the suitcase is gone from f20, so "that train" is the wall) |
| He is not. | 49-80 | the punch-in, the deadpan, eyes to the lens | yes, strong |
| All he did | 81-101 | the same face roaring with laughter into his phone | yes, strong |
| was laugh | 102-131 | the laugh continues; the suitcase rises into frame | yes |
| at a finger. | 132-163 | f132-139 he turns his back (no finger yet); f140-163 the glove at the screen, then at the green lamp | yes, 8 frames early |
| SIGNAL... / SIGNAL... GREEN! | 163-212 | the driver to the lens: point, open-palm "wave", point | half: the green lamp is not in s03b; on mute the point is at the viewer |

Captions lead the voice by about 2 frames throughout (fine). They sit at about 70 %, clear of the bottom overlay.
At f0-48 the cobalt phone crosses the caption.

## 6. The joins

- **Punch-in f50 → f51:** scale 1.25x about the point (732, 612). The eyes are at about (650-690, 630-648), so they move under 20 px. **No pop.** It lands on a half-lid (f49-52) and the eyes snap open to the lens at f53: a good beat.
- **Cut 1 f80 → f81 (the face match):** the size matches (cap width 857 → 876 px). The eyes drop about 150 px (8 % of the frame height) and move about 100 px left. It is a hard emotional cut (blank → roaring laugh), so it plays as a cut, not as a match. It is readable, but not the "same place on screen" the script promised.
- **The turn f133-136:** the front card and the profile card cross-dissolve, giving 2 frames of visible double exposure (f133, f136). At speed it reads as a smear. f137-139 show the back of his head: brown hair over a featureless skin oval (a slightly odd "blank face").
- **s02 content:** the laugh is great. The suitcase rises huge in the foreground (39 % of the frame height by f120, chroma 75). The boy is the back of a head with a navy toy cap: readable as a kid, mostly hidden. The cab glass and driver are not visible from this angle, so the turn reads as "turns away with his phone" until cut 2 explains it.
- **Cut 2 f139 → f140:** over the driver's right shoulder. The glove starts at the cab's bar-graph screen (f140-141) and rises to the green lamp by about f147.
  - Lamp: core 45x24-29 px, halo about 75 px. That meets the spec, but it sits on bright hazy sky, not on dark. On the 270 px thumbnail it is a 6 px dot.
  - The near-lens back of the driver's head is a flat brown disc filling the left 25 % of the frame (gate: s03 blur 0.145 FAIL). His navy cap is not visible from behind (continuity with s03b).
  - The glove has a doubled outline (motion ghost, f150-163). White "dust" specks drift over the console and read as dirt.
- **s03b f164-212 (the driver close-up):**
  - The face is likeable and clear: round, determined brows, cap with a gold badge, buttons. Good.
  - The near point (f164-170 and f191-212) is foreshortened straight at the lens, so the index finger becomes a round ball on a white mitten. **At phone size it is a white blob, not a pointing finger.** At f196 it covers the left edge and his cheek.
  - The "hand by the ear" (f175-190) is an open palm facing the camera with a big open grin (f173-180). **It reads as the driver waving hello at us**, not checking.
  - Eyelids drop to a smug half-lid at f207-208 and again at f211 (a flicker).
  - Gate: busy 7.5 (borderline).

## 7. The seam (f1890-1912 → f0-20)

- **Picture:** one continuous set-up. The door window with the suitcase slides right to left behind him in the last shot and is at his fingertip at f0. Light, camera move and scale all continue. MAD per frame: 17-21 across f1900-1912, 24.9 at f1912 → f0, 17.5 at f0 → f1. The bump is the arm's snap and the caption swap. Gate: seam 23.69 against a local step of 14.24 (pass).
- **Action:** his arm sags (f1908-1911) and locks out, and frame 0 is the point landing. It is one move. **Pass.**
- **Sound:** the bed is continuous (the last samples are about 0.07 full scale, the first about 0.06, both at -30 dBFS in 50 ms windows). "gone." ends at 63.65 s, so 0.12 s of bed, then "His" at 0.07 s. **Pass.**
- **Problem:** the beat before it, f1900-1907 (63.33-63.57 s). The "hand by the ear" pose puts the back of his hand in front of his nose with ONE upright finger (see `seam_f1904_1910_1912_0.jpg`, t1904). It reads as a middle finger or as nose-picking, and it sits on the most rewatched seconds of the film.
- The boy and mum are in the left window until f1906 and then leave, so they are not in frame 0.

## 8. Scorecards (one line each)

### HOOK_RESEARCH 20 rules
1. Mid-action frame 0 — PASS: the arm lands and the door slides from f1; 29 % change.
2. One subject — PASS: face + arm + suitcase form one chain; the background is clean.
3. Result first — PASS: "His bag is on that train. He is not." ends at 2.63 s.
4. Nameable question by 2 s — PASS: "how did he lose it?", sharpened at 4.7 s ("laugh at a finger?").
5. New angle — PASS: it leads with the tourist and the bag, not "Japanese drivers point".
6. Face with emotion / pointing hand at the hook object — PARTIAL: the point and gaze are on target; the emotion is weak ("hm?").
7. Someone with something to lose by 3 s — PASS: the bag is already lost.
8. No logo, title or intro — PASS.
9. Sound by 0.2 s, voice by 0.5 s — PASS (0.00 / 0.07 s).
10. Works on mute — PASS with captions; the picture alone loses the suitcase at 0.6 s.
11. ≤5 words in 0-1.5 s — PASS: "His bag" + "on that train." = 5 (plus "YORK" on the shirt).
12. Bright frame 0, one colour singleton — PASS: L* 57, the suitcase is the only yellow. Overall chroma 23 is below the hits' top tier.
13. No quiz / "you" question — PASS.
14. A doubter about to be proven wrong — PASS: the laughing tourist on screen at 2.70 s.
15. Surprise by 3 s — PASS: the deadpan "He is not." and the cut to the laugh.
16. Second hook at 3-5 s — PASS: the laugh, the giant suitcase, the finger at 4.67 s.
17. Push-in in the first second — PASS: 1.12x in 1 s, then a 1.25x punch-in.
18. A number or odd detail in 0-5 s — PARTIAL: no number; "laugh at a finger" is the odd detail.
19. No narration over a static picture — PASS: minimum change 19 % in 0-5 s.
20. The ending flows into frame 0 — PASS: continuous picture and sound.

### OPENINGS_DATA 10 patterns
1. Voice in frames 1-3, narrator first — PASS (0.07 s).
2. No dead air (≤0.54 s) — PASS (0.155 s).
3. ≥9 / ≥14 words — PASS (10 / 17).
4. First sentence states an odd outcome as fact, ends ≤5.5 s — PASS (6 words, ends 1.57 s, like "They painted the jail cell pink.").
5. Cut early and often — PASS: first at 1.70 s, 3 in 0-5 s.
6. Camera never still — PASS, mid-tier (0.55 / 0.82 %/f against a median of 0.76 / 0.99).
7. Something moves from frame 1 — PASS (29 % changing per frame at 0-1 s).
8. Frame 0 = a face doing the odd act — PASS: face, hands on the act, act visible; eyes off camera (like the 35M jar).
9. A second force by 3 s — PARTIAL: the departing train is the force; no second character until 4.67 s.
10. A topic you already know — PASS (a train, a suitcase, a phone).

### PLAYBOOK rules 1-11
1. Anti-hook, inside the action — PASS.
2. One focal point — PASS.
3. Moves from frame 1, camera never still — PASS.
4. Voice in 0.1 s — PASS.
5. 9 / 14 words, no gap over 0.5 s — PASS.
6. Strange result as fact, done by 4-5 s — PASS.
7. Idea lands by about 3 s — PASS for "he lost his bag". The pointing topic lands at 4.7-8.7 s.
8. Stake or pushback by 3 s — PASS: the stake is the bag; pushback (his mockery) is shown at 2.7 s.
9. First cut by 1-2 s — PASS (1.70 s).
10. Specific words — PARTIAL: plain "bag" and "train"; the colour and object are carried by the picture.
11. Works with sound off — PASS with captions.

## 9. Five changes that would most raise "stayed past 3 s" (most valuable first)

1. **Keep the suitcase in shot to about 1.2-1.4 s (f0-f40) instead of 0.55 s.**
   - Problem: it exits at f16-20 because the frame-0 framing is tighter than planned (head 27 % against 19 %) and the window moves about 45 px/f.
   - Fix (DIRECTOR/TRAIN): pull the camera back so the head is about 21 % at f0, and add a yaw track that follows the door window at about 70 % of its screen speed from f0 to f30, easing out by f45. The suitcase then stays beside his fingertip as it pulls away.
   - Then keep the push to about 28 % by f80 (the punch-in can stay). Run the same rig on s24 at film time + L, so the track's ease-in sits in s24's last 6 frames and the seam stays continuous.
   - Keep the caption change ("on that train.") on the moment the yellow touches the frame edge.
2. **Make frame 0 read as loss.**
   - Problem: f0-f20 read as "hm?".
   - Fix (CAST): raise the brows and widen the eyes, with a small "o" mouth on f0-f20 (the "o" card is already used at f1908-1909, so the seam matches). Ease to the flat deadpan by f30.
   - Move the f17-19 blink later (to about f58) so the first second has no lowered lids.
3. **Fix the driver's point in s03b (f164-172, f191-212) and the "wave" (f173-190).**
   - Fix (CAST): rotate the point 35-45° off the lens axis, up and to screen-left toward where the lamp would be, so the index finger reads in profile.
   - On the held beat, use a closed hand by the ear with the index finger still out, not an open palm.
   - Keep the mouth firm (closed or a small flat shape) on the beat instead of the open grin.
   - Remove the half-lid frames f207-208 and f211.
4. **Remove the middle-finger read at the seam (f1900-1907).**
   - Fix (CAST): put the "hand by the ear" outside the head silhouette, beside the ear at cap height, with the index finger pointing forward (toward the window), so no single upright finger crosses his face.
   - This is the most re-watched second of the film.
5. **Make "train" readable in the frame-0 still.**
   - Fix (TRAIN/STATION): carry the green body stripe across the door panel at y≈900-1000, so the cream + green JR signature sits next to the suitcase.
   - Tilt the camera about 4° down, or raise the platform plane, so the yellow tactile strip lands at about 76-80 % height, above the overlay. Check the caption still clears it.
   - Optional: lift chroma on the cream car side so frame-0 chroma reaches about 28-30.

Smaller, nice to have:
- Line up cut 1 (move s02's opening framing up about 150 px and right about 100 px so the laughing eyes land where the blank eyes were).
- Clean the f133/f136 card double exposures (a hard pose swap or a 2-frame smear).
- Give the driver's cap to the s03 back-of-head.
- Thin the white dust specks in s03.
- Move the phone hand at f0-48 so it does not cross the caption.
- Put the lamp on a darker backing (a tunnel mouth or tree shadow).

## 10. Is it at its ceiling?

Measured pacing and density are already at the hits' level, so there is little left in words, cuts or motion. The remaining gains are clarity gains in the picture:
- how long the hook object stays on screen,
- the readability of the emotion,
- the driver's gesture,
- a clean seam pose.

Fixes 1-4 are a few hours of CAST and camera work and need no new voice. After them, the hook is about at the ceiling for this story. The topic (a tourist, a suitcase, a train) is universal, but the opening has no second character on screen by 3 s, which is the top hits' strongest separator. Only a re-staging could add one (for example the boy pointing in the window at frame 0, as the script planned).

# OPENING AUDIT v5 (DIRECTOR, 2026-11-20 22:50): the lead's DRAFT opening on the laptop

Clip: `studio/out/pointing_v4/opening_v4.mp4` (22:41, draft 540x960, 248 frames = 8.27 s, cut to the opening mix;
shots v01-v06 rendered 22:23-22:40 on the 22:20 code). Frames looked at: every 3rd frame 0-104, EVERY frame 104-200
(crops of the hand + button and of the face), every 2nd frame 170-247, frame 0 at full size; the lead's
`opening_audit/` (strip, go_run, gates_v4, compare table + sheet 1 vs anti-theft, clown and three Ricks Clips
openings) and the hook-lab strips (`sound/pointing/hook_lab/strips/`: Railroads, anti-theft, clown). Nothing played.
My sheets: scratchpad `op/A_0-104.jpg`, `B_go_100-172.jpg`, `C_red_170-247.jpg`, `E2_press.jpg`, `E3_press_zoom.jpg`.

## Second by second (what a viewer sees)

| time | shot | picture | verdict |
|---|---|---|---|
| 0-1 s | v01 | Front-on, flat: an apricot wall (top quarter empty but for a clock cut by the top-left edge and a strip of small coloured lamps cut by the top-right edge), the two-lens signal (green + red lenses, dim) left of centre, the girl's head and shoulders right (head ~0.2 of the height), her fist resting on a red dome button; the bottom 40 % is the teal desk top + a big plain BLUE desk front + carpet. Caption "Tap your foot" on the desk top. Only motion: a blink at f18, the far lamp row, a 0.14 %/f push. | Reads in 0.25 s as "signal + girl + button" (better than round 1-3: no black, no binoculars, no middle finger). But it is a static stage set seen head-on: no depth, no angle, nobody else, 40 % empty furniture. Next to Ricks' Railroads f0 (track perspective, smoke, a man mid-action) and Job Nobody Wants f0 (low angle, the big FIRE button close to the lens, moody light) it looks like a still. |
| 1-2 s | v01 -> v02 (cut 1.33 s) | The cut-in is almost the SAME framing (lamp and girl a little lower, a grey ceiling strip appears): reads as a jump cut, not a cut-in. On "green" (f47) the left lens lights green and the whole room washes yellow-green; her mouth goes "o", brows up. | Green on the word: GOOD (f48, 1 f after the onset). Cut-in: BAD (no size change). |
| 2-3 s | v02 | Held: lamp green, room green, her "o" face. The shot pulled OUT (my drift -0.30) so it converges back toward v01's size; it does not rest long enough (gate: 12 f still, want 15). | Static 2 s on one idea; caption "green light." / "Only green." fine. |
| 3-4 s | v02 -> v03 (cut 3.50 s) | Lamp goes dark at f102; cut to a closer, lower lens: lamp left, her face right, the button centre, bottom 45 % empty teal desk with a green specular glare. Go#1 flash f108 (onset 106.8). | Flash on time. Composition: lamp and her head pushed to the two frame edges, the middle and the bottom are desk. |
| 4-5 s | v03 | Go#2-#4 flashes f122 / f134 / f146 (all 0-1 f after the beep); a real push-in you can feel; her brows go from unsure to steady. | Flash sync GOOD; push-in GOOD. BUG: as it pushes, her head is CUT by the right edge (f124-172) and the green lens is CUT by the left edge (from ~f146). BUG: the press (below). No caption for 3.1 s (3.50-6.60 s). |
| 5-6 s | v03 -> v04 (cut 5.80 s, f174) | Go#5 f156, Go#6 f164 flashes on time; smug smile by f150. The hard cut to red lands on the 7th "Go!" (onset 173.4, first red frame 174): GOOD. But v04 is WIDER than the end of v03 (back to a medium with the desk front), the room is orange-pink rather than alarm red and the lit red lens reads salmon. Her face is half-lidded smug for f176 only, then "o" from f177 (a 1-f expression pop). | Red on the 7th Go: PASS. Its punch: weak (pull-back + orange red). |
| 6-7 s | v04 -> v05 (cut 6.57 s) | The held beat: nothing moves in her (freeze), lamp red. v05 is again almost the SAME framing as v04 (second jump cut). "Did you tap?" up at f198 (word f200). | Beat silent and still: PASS. Jump cut: BAD. |
| 7-8 s | v05 -> v06 (cut 8.17 s) | "She did." f224; a red X pops f228-230 (word f225): but the X is SMALL (~1/10 of the width) and sits up by the far lamp strip, far from her, not "a big red X beside her". f246: the 1994 hall, the "1994" board big and readable, two columns of volunteers. | X on time, too small and in the wrong place. v06 reads. |

## The press (CAST): the main bug of the Go run
Every frame 104-200 cropped: between the Go words her hand rests as a FIST ON the dome (f112-119, f125-131, f137-143);
just before each "Go" it LIFTS into a raised hand with ONE finger pointing sideways at screen-left, at chest height
(f105-111, f119-124, f132-136, f144-148, f154-159, f164-168), and comes back DOWN onto the dome 4-5 f AFTER the onset
(f112 for Go#1 at 106.8, f125 for Go#2 at 120.6). So on every flash and beep she is pointing in the air, and the
"press" lands 0.15 s after the beep, as a fist. It reads as "she points at the flash", not "she presses on every Go";
the raised single finger is on the zero-tolerance list. The dome never goes down.
FIX (CAST, `cast/moves.ts mButton` + the go rows of `beats_v4.ts`): between Gos the hand HOVERS a hand-width above the
dome, index finger bent DOWN at it (never a sideways finger); on each `ev:goN` the hand comes DOWN and touches the dome
1-2 f after the onset (a 3-f snap), stays 3-4 f, lifts back to the hover. On `ev:red` the same down-move, then frozen ON
the dome. LAB: the dome travels down ~30 % under the touch (`lab.ts`/`lab_plan buttonAt`), so the press reads at 1/4 s.

## Numbers (gates_v4 + compare_films on the opening, 0-8 s)
- hold frames 36.1 % (FAIL; want 8-20; refs 0.9-15.2, anti-theft 7.5); moving area 4.3 % of the picture (refs
  13.2-20.4, anti-theft 11.1): our opening moves a quarter to a third as much as the references.
- every shot moves then rests: v02 rest 12 f (want 15), v03 4 f (planned 6 f before the red cut: accepted for v03).
- chroma 48 (refs 20-38): colourful enough, maybe hot; L* 60 (bright): GOOD.
- measured "cuts" at 3.57, 4.03, 4.47, 4.83, 5.17, 5.47 s are the Go flashes (whole-room wash): they read as six
  hits, which is what we want; keep the decay (6-7 f) so it is a blink, not a strobe.
- frame 0 -> 1 change 1.15 (no pop at the start): PASS. First word 0.05 s: PASS. First picture change 1.33 s: PASS.

## Frame 0 and the first 3 s next to the references
Railroads (30 M views): a person mid-action in a deep space (track perspective, a train in a tunnel, smoke), the
camera low, the caption over a busy picture; a new picture by 2 s. Ancient Jar: a character beside a big strange
object, a hard cut to a gold dragon at 0.9 s. Job Nobody Wants: the closest cousin of ours: a BIG red FIRE button close
to a low lens, a microphone, dark blue moody light, a cut every ~1 s. Anti-theft (ours, best): a huge readable sign
with a number fills the top half, the woman in front, a thought bubble at 3 s. Clown: a busy sunny square, a clown on
a unicycle, crowd, pigeons all moving.
OURS: legible but the flattest and stillest of the six: a head-on wall, no depth, the button small and far, 40 % empty
desk, one person, nothing in the background moving except a lamp strip; 0-3.5 s shows the same picture three times
(v01, v02 cut-in that does not cut in, v02 green). It would lose the 3-second swipe against every reference here.
What would lift it (LAB lenses, LOOK light): a 3/4 LOW angle with the button BIG in the foreground (her finger over it),
the lamp big above her, the researcher behind glass and a second desk / lamps in depth behind her; v02 a real cut-in
on the lamp (the lamp fills the top half, her face small under it) so 1.33 s is a visible new picture.

## Fixes, by owner (in order of importance)
1. CAST: the press (above): hover with the finger DOWN, touch on the beat 1-2 f after each Go, no sideways single
   finger; no 1-f smug half-lid at f176 (go straight from "sure" to the frozen "o" on the red, or hold the smug face
   >= 6 f before the freeze).
2. LAB (v03 lens, `lab.ts` ROLE_CAMS for the Go run): keep her whole head and the whole lamp inside the frame through
   the push (both are cut from ~f124 / ~f146); fill the bottom: lower the lens or tilt down so the button + her hand sit
   at 45-55 % and the empty desk top is under 25 %.
3. LAB (v04 / v05 lenses): v04 must be CLOSER than v03's last frame (her face + hand + the red lamp, as the table
   says), not a pull-back to the v01 medium; v05 either a clearly tighter close on her frozen face or the same lens as
   v04 with no cut (a jump cut now). LAB (`xAt`): the X BIG (~1/3 of the width) beside her face, not by the lamp strip.
4. LOOK + LAB: the red must read as ALARM red, not orange-pink (the lit red lens salmon, the walls orange): take LOOK's
   HALL_RED / redRoomDim idea for the booth on `ev:red` (dim the warm key, red wash 0.55+, lens envK 0.12).
5. LAB (v01 / v02): v02 a real cut-in (lamp big in the top half); frame 0 composition (above); clock and lamp strip not
   cut by the top edges; movers alive in the rests (lamp sway, researcher, fan: LAB open list item 1).
6. DIRECTOR (mine, DONE 22:50): v02 drift -0.30 (a pull-out that undid the cut-in and left a 12-f rest) -> +0.10 push.
   Re-render v02 to check. Captions in the Go run: none for 3.1 s by my captions_plan rule; every reference keeps a
   caption on screen. LEAD DECISION asked: a single big word "GO!" per beat (on each onset, gone before the next), or
   keep the clean frame. I keep the rule until the lead says.

---

# RE-AUDIT 02:20 (DIRECTOR): the opening with LAB's recomposition (01:35 lens fix), CAST's press, LOOK's light, GO! v2

Clip: `studio/out/pointing_v4/opening_v4.mp4` (02:11, draft, rendered 01:57-02:09 by the DIRECTOR on the 01:58 code:
batch 2 = GO! pulses 130 px under the signal head, GO_POS v03 [0.18, 0.53] v04 [0.2, 0.49], 8 f max, 3 f dark before
the next Go). Frames looked at: every 3rd 0-104, every 2nd 100-245, EVERY frame 104-200 (hand + button crop), f0-3,
the compare frame-0 sheet. My sheets: scratchpad `op2/`.

## Numbers (0-8 s) next to the references
| | 22:41 | 00:49 (LAB) | 02:11 (now) | anti-theft | clown | refs (Railroads / Jar / Job) |
|---|---|---|---|---|---|---|
| moving area % | 4.3 | 6.9 | **7.8** | 11.1 | 6.9 | 13.2 / 18.0 / 20.4 |
| hold % (compare) | 38.8 | 25.8 | **26.3** | 7.5 | 0.0 | 6.4 / 15.2 / 0.9 |
| hold % (gates_v4) | 36.1 | 23.4 | **23.8** (FAIL, want 8-20) | | | |
| whole-frame % | 25.7 | 33.0 | **43.8** (PASS < 60) | 39.7 | 18.0 | 33.5 / 46.0 / 85.1 |
| chroma | 48.3 | 38.9 | **36.6** | 30.9 | 31.6 | 38.2 / 19.7 / 28.4 |
The hold left is the designed freeze: v04 81.8 % and v05 68.1 % (the red beat + the frozen face). v01-v03 hold 0-15 %.
Gate "moves then rests": v02 rests 7 f, v03 1 f (the Go run runs to the red cut by design; v02 = my +0.22 push + LAB's
lens: acceptable, it cuts on the beat).

## What is GOOD now
- Frame 0 reads in 0.25 s and stands with the references: upright signal (green over red) upper left, her face close,
  the big red button in the foreground, a window, wall lamps, console chase lights; the camera moves from frame 0 (a
  steady 4 levels/frame change, no pop, no settle).
- v02 is a real cut-in (low, from the side of the lamp): the lens lights green ON "green" (f48 for the word at 47.4).
- Go run: all six flashes 0-1 f after the beep; the hand hovers with the index finger DOWN and touches the dome on each
  Go (no sideways finger, checked every frame 104-172); the push-in keeps her head and both lenses whole.
- GO! sits under the signal head every beat, never on her eyes, hand or the button; on the 7th beat it is right beside
  the big RED lamp (f174-181): the trap reads with the sound off.
- The red cut lands on the 7th Go (f174), true alarm red (no salmon), v04 tighter than v03, smug -> frozen "o" face.
- v05 is its own picture (wider, the lamp, the console), the X pops on "She" (f228-230).

## Still wrong (owner)
1. LOOK: her FACE blows out to near-white whenever the lamp is dark between flashes (f106, f116-120, f128-132,
   f140-144, f152-154, f170-172) and is normal under the green: a white face pulsing against the flashes. Also slightly
   washed in v01 (f12-f33).
2. LAB: the researcher pacing behind her in v03 (f140-172) has his HEAD hidden behind the lamp housing: a headless white
   coat moving behind her shoulder. Keep his head visible (or keep him out of the Go-run lens).
3. LAB: v05's X sits on the top of her head / hair (f230-244), not by her hand as ordered; and "Did you tap?" / "She
   did." sit across the button rim (the dome is in the caption band in v05).
4. LAB/CAST: v02 "green light." / "Only green." touch her pointing hand at the right end of the caption (f48-102).
5. The red room in v04 lights her face pink-white (readable), fine; v05 her face is evenly lit: OK.

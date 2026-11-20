# SOUND EVENTS v2: "The Clown Nobody Saw" (rebuild, script v6)

Written by `mix.py` on 2026-11-18 01:12 from the mix it just made (effects key `0db2e06ec1b6`). Film: 2117 frames = 70.567 s = 3387200 samples at 48 kHz. Nothing was played: every number here is measured.

## 1. Where the cues come from
The cue list is data-driven. `sfx.py` reads the three animators' files at mix time and its table `MAP` turns each cue name into a real sound of the library (CC0 recordings and ElevenLabs sound-effect generations; sources in `CREDITS.txt`), rotating takes across repeats. Levels are LU under the voice (the event's loudest 0.4 s); `near` in the cue sets the level, `pan` the place.

| file | cues | sounded | not sounded |
|---|---|---|---|
| `studio/out/clown/anim_quiz/sound_cues.json` (saved 00:52) | 53 | 41 | 12 |
| `studio/out/clown/anim_story1/sound_cues.json` (saved 23:26) | 74 | 28 | 46 |
| `studio/out/clown/anim_story2/sound_cues.json` (saved 00:23) | 76 | 60 | 16 |

Of the 203 cue lines: 58 events, 58 footsteps, 13 loop / roll cues are sounded; 39 were thinned ("fewer, better": 70 events sound in the whole film, the own moments included), 4 were held back by the quiz rule, 17 are too far to hear on their own, 14 are silent by design or carried by another cue, 0 are empty, and **0 have a name the table does not know** (section 7).

## 2. Events (70): frame, sound, level, pan, picture action
`sync` = where the sound's sync point (its onset; its peak for a whoosh) landed against the picture frame, in frames (+ = late). The mix stops if a cue is more than 1 frame early or 2 late. `own` = a moment keyed to the timeline by `sfx.py`, not from a cue file.

| frame | time | shot | cue | sound file(s) | level LU (set / measured) | pan | sync f | picture action |
|---|---|---|---|---|---|---|---|---|
| 0 | 0:00.00 | Q1 | honk: the bulb horn | horn_4#1 + horn_5#1 (two squeezes, tuned to A) | -10.0 / -17.6 | +0.37 | +0.00 (onset) | frame 0: the clown squeezes his bulb horn AT the phone guy (the thumbnail; the first word lands in 0.2 s) |
| 22 | 0:00.73 | Q1 | honk: the bulb horn | horn_2#3 + horn_4#1 (two squeezes, tuned to A) | -10.8 / -14.5 | +0.22 | +0.00 (onset) | second honk: he rides right across in front of the phone guy honking in his face (no reaction) |
| 37 | 0:01.23 | Q1 | honk: the bulb horn | horn_4#2 + horn_2#3 (two squeezes, tuned to A) | -12.2 / -20.0 | +0.08 | +0.00 (onset) | riding away up the plaza (back view): horn held high, a honk at the far crowd |
| 62 | 0:02.07 | Q1 | chip_in (own): the chip 'PHONES: ?' pops in (a small pop, on the right) | fs-824189-pop-in-sfx | -23.0 / -27.7 | +0.35 | +0.00 (onset) | Overlays.tsx: CHIP_IN = BEAT.jobEnd - 2 |
| 104 | 0:03.47 | Q1 | honk: the bulb horn | horn_5#1 + horn_4#2 (two squeezes, tuned to A) | -16.5 / -16.5 | +0.20 | +0.00 (onset) | a cheery honk at passers as he rides up the middle |
| 124 | 0:04.13 | Q1 | clown_wobble: wheel scuff, a yelp, a relieved laugh | skid_2 + yelp_1 + laugh_m_1 | -24.0 / -24.0 | +0.24 | +0.00 (anchor) | DUCKS[0] gag: the wobble-and-save (wheel scuff, a yelp 'whoa!' f+1, relieved laugh f+22) |
| 149 | 0:04.97 | Q1 | pigeon_flush: a pigeon's burst of wing flaps | pigeon_1 | -24.5 / -24.8 | +0.50 | +0.00 (onset) | 'Don't lose count.': he nearly rides into the pigeon flock; six birds explode up round him (wing claps) |
| 151 | 0:05.03 | Q1 | clown_yelp: a startled yelp | yelp_2 | -23.4 / -30.2 | +0.50 | +0.00 (onset) | his flinch (jaw drop), then a laugh at f+14 |
| 163 | 0:05.43 | Q1 | dog_paws: a small dog's claws on brick | dog_paws_1 | -21.1 / -22.2 | -0.20 | +0.00 (onset) | a small terrier darts across the near ground left -> right (claws patter on brick, 40 f) |
| 169 | 0:05.63 | Q1 | dog_yap: two happy yaps | dog_yap_1 | -17.6 / -24.3 | -0.06 | +0.00 (onset) | two happy yaps as it chases the near pigeons |
| 174 | 0:05.80 | Q1 | honk: the bulb horn | horn_4#1 + horn_5#1 (two squeezes, tuned to A) | -16.2 / -23.8 | +0.27 | +0.00 (onset) | a honk after the flying pigeons |
| 175 | 0:05.83 | Q1 | pigeon_flush: a pigeon's burst of wing flaps | pigeon_2 | -16.6 / -17.0 | +0.42 | +0.00 (onset) | near pigeons (group B) burst up and away from the dog; group A flutters and settles |
| 207 | 0:06.90 | Q1 | honk: the bulb horn | horn_2#3 + horn_4#1 (two squeezes, tuned to A) | -16.9 / -16.9 | +0.49 | +0.00 (onset) | DUCKS[1] gag: he honks at the re-landed pigeons |
| 211 | 0:07.03 | Q1 | pigeon_flush: a pigeon's burst of wing flaps | pigeon_3 | -25.2 / -25.2 | +0.49 | +0.00 (onset) | the flock flushes again, up and away over the far plaza |
| 298 | 0:09.93 | Q2 | chip_flip (own): the chip flips (a card flick) | fs393811 | -20.0 / -21.8 | +0.35 | +0.00 (onset) | Overlays.tsx: FLIP = BEAT.five - 2 (8 f) |
| 302 | 0:10.07 | Q2 | five_ding (own): the BIG 5 shows: a bright triangle ding (on top of the score's sting on 'Five.') | fs-349504-triangle-open-04 | -13.5 / -17.1 | +0.35 | +0.00 (onset) | Overlays.tsx: the chip shows the big gold 5 from FLIP + 4 |
| 332 | 0:11.07 | Q3 | pigeon_flush: a pigeon's burst of wing flaps | pigeon_1 | -18.0 / -18.5 | -0.58 | +0.00 (onset) | Q3: the near pigeons scatter as he brakes into them |
| 348 | 0:11.60 | Q3 | brake_skid: a tyre skid + the saddle's creak | skid_1 + squeak_2#2 | -13.5 / -16.6 | +0.00 | +0.00 (anchor) | Q3: he brakes hard at the stop mark (tyre skid on brick, a creak of the saddle on the pitch forward, 3 cm rock back) |
| 376 | 0:12.53 | Q3 | honk: the bulb horn | horn_4#2 + horn_2#3 (two squeezes, tuned to A) | -9.1 / -16.9 | +0.00 | +0.00 (onset) | Q3: THE WAVE HONK with the other hand on 'right?' |
| 435 | 0:14.50 | S1 | honk: the bulb horn | horn_5#1 + horn_4#2 (two squeezes, tuned to A) | -16.5 / -24.2 | +0.36 | +0.00 (onset) | the clown squeezes his bulb horn |
| 473 | 0:15.77 | S1 | bell_ring: a small brass hand bell | hand_bell_1 | -22.6 / -27.7 | +0.54 | +0.00 (onset) | the clown rings his little brass hand bell high over his head, ding-a-ling (to f 485) |
| 486 | 0:16.20 | S1 | unicycle_brake: a tyre scuff + one low, sad honk | skid_2 + one low horn squeeze tuned to D | -16.8 / -24.7 | +0.30 | +0.00 (anchor) | the clown gives up: his tyre scuffs to a stop, the bell clunks down (a sad little honk would be funny here) |
| 579 | 0:19.30 | S2 | marker_tap: a finger tap on the whiteboard | fs745291 | -22.0 / -25.2 | -0.31 | +0.00 (onset) | the second tap |
| 630 | 0:21.00 | S2 | door_latch: the door: latch click, then the swing's soft creak | door_open_1 | -17.0 / -19.1 | -0.07 | +0.00 (onset) | the office door's latch clicks |
| 698 | 0:23.27 | S4 | unicycle_rock: a saddle squeak | squeak_1#3 | -25.4 / -28.7 | +0.18 | +0.00 (onset) | a squeak as he rocks the unicycle |
| 706 | 0:23.53 | S4 | unicycle_rock: a saddle squeak | squeak_2#1 | -25.3 / -28.5 | +0.19 | +0.00 (onset) | a squeak as he rocks it back |
| 716 | 0:23.87 | S5 | garment_rustle: the garment bag's crinkle | bag_rustle_1 | -21.0 / -22.5 | +0.37 | +0.00 (onset) | the garment bag rustles as it swings up against him (the cut) |
| 723 | 0:24.10 | S5 | zip_rip: the zip ripped open | zip_1 | -18.0 / -21.0 | +0.37 | +0.00 (onset) | the bag's flap is ripped open |
| 731 | 0:24.37 | S5 | garment_fling: the bag flung open: a body whoosh + crinkle | fs830856 + bag_rustle_2 | -14.5 / -14.9 | +0.41 | +0.00 (anchor) | the garment bag's flap is flung open (a whoosh + a zip rip just before) |
| 788 | 0:26.27 | S6 | honk: the bulb horn | horn_5#1 (one squeeze, tuned to A) | -19.4 / -27.0 | +0.45 | +0.00 (onset) | the clown squeezes his bulb horn |
| 1129 | 0:37.63 | S11 | honk: the bulb horn | horn_2#3 + horn_4#1 (two squeezes, tuned to A) | -16.5 / -24.3 | +0.14 | +0.00 (onset) | the clown squeezes his bulb horn |
| 1187 | 0:39.57 | S12 | pencil_tick: one pencil check mark | pencil_one_1 | -17.0 / -18.7 | -0.09 | +0.00 (onset) | S12 the interviewer's pencil ticks doodle 1 (one stroke) |
| 1193 | 0:39.77 | S12 | pencil_cross: the two strokes of a pencil cross | pencil_cross_1#1 + pencil_cross_1#2 | -17.5 / -18.7 | -0.09 | +0.00 (anchor) | S12 the interviewer's pencil crosses doodle 2 (two strokes) |
| 1202 | 0:40.07 | S12 | pencil_cross: the two strokes of a pencil cross | pencil_cross_1#3 + pencil_cross_1#4 | -17.5 / -18.5 | -0.09 | +0.00 (anchor) | S12 the interviewer's pencil crosses doodle 3 (two strokes) |
| 1209 | 0:40.30 | S12 | pencil_cross: the two strokes of a pencil cross | pencil_cross_1#5 + pencil_cross_1#6 | -17.5 / -18.7 | -0.09 | +0.00 (anchor) | S12 the interviewer's pencil crosses doodle 4 (two strokes) |
| 1228 | 0:40.93 | S13 | honk: the bulb horn | horn_4#2 + horn_2#3 (two squeezes, tuned to A) | -10.0 / -17.8 | -0.38 | +0.00 (onset) | S13 the clown squeezes his horn right behind the phone guy |
| 1234 | 0:41.13 | S13 | spin_whoosh: a shoe scuff + a short body whoosh | spin_scuff_1 + fs-786514-swoosh-v2 | -15.5 / -16.7 | +0.30 | +0.00 (anchor) | S13 the phone guy spins round (7 f turn, smear) |
| 1241 | 0:41.37 | S13 | jaw_drop: a small comic hit | woodblock + bass pizzicato D2 (own instruments) + impact_1 | -15.0 / -15.4 | +0.30 | +0.00 (onset) | S13 the take: his jaw drops, his free hand flings out |
| 1261 | 0:42.03 | S13 | honk: the bulb horn | horn_5#1 + horn_4#2 (two squeezes, tuned to A) | -10.0 / -17.7 | -0.38 | +0.00 (onset) | S13 the clown honks again, waving |
| 1340 | 0:44.67 | S14 | honk: the bulb horn | horn_4#1 + horn_5#1 (two squeezes, tuned to A) | -14.6 / -22.1 | +0.09 | +0.00 (onset) | S14 the clown honks at the dude (behind, mid distance) |
| 1352 | 0:45.07 | S14 | honk: the bulb horn | horn_2#3 + horn_4#1 (two squeezes, tuned to A) | -14.6 / -22.4 | +0.09 | +0.00 (onset) | S14 the clown honks at the dude (behind, mid distance) |
| 1412 | 0:47.07 | S15 | mind_lift: a soft rising sweep | fs810485 | -17.0 / -19.4 | +0.09 | +0.00 (onset) | S15 her see-through mind lifts out of her head (a soft rising shimmer) |
| 1452 | 0:48.40 | S15 | bubble_pop: a warm pop | fs-258269-mouth-pop + fs-447910-plop | -17.0 / -17.0 | -0.42 | +0.00 (anchor) | S15 her mind arrives in the call bubble (a warm pop) |
| 1593 | 0:53.10 | S17 | peg_snap: the wooden peg snapping shut | peg_3 | -12.5 / -15.5 | +0.04 | +0.00 (onset) | S17 the peg SNAPS shut on the bill |
| 1594 | 0:53.13 | S17 | bill_flutter: a paper bill's flick | bill_flick_1 | -18.0 / -21.1 | +0.04 | +0.00 (onset) | S17 the bill swings after the snap |
| 1663 | 0:55.43 | S17 | bill_flutter: a paper bill's flick | bill_flick_2 | -21.0 / -24.3 | -0.09 | +0.00 (onset) | S17 his flat hand brushes the bill's bottom edge |
| 1689 | 0:56.30 | S18 | duck: a cloth swish + leaves brushed | duck_cloth_1 + leaf_brush_1 | -15.5 / -18.3 | +0.30 | +0.00 (anchor) | S18 scarf ducks under the lowest bill (wince) |
| 1696 | 0:56.53 | S18 | bill_flutter: a paper bill's flick | bill_flick_3 | -21.0 / -24.3 | +0.30 | +0.00 (onset) | S18 the bill brushed as the head passes |
| 1713 | 0:57.10 | S18 | duck: a cloth swish + leaves brushed | duck_cloth_2 + leaf_brush_2 | -15.5 / -18.4 | +0.30 | +0.00 (anchor) | S18 parka ducks under the lowest bill (limbo lean) |
| 1720 | 0:57.33 | S18 | bill_flutter: a paper bill's flick | bill_flick_1 | -21.0 / -24.1 | +0.30 | +0.00 (onset) | S18 the bill brushed as the head passes |
| 1733 | 0:57.77 | S18 | duck: a cloth swish + leaves brushed | duck_cloth_3 + leaf_brush_3 | -15.5 / -18.2 | +0.30 | +0.00 (anchor) | S18 elder ducks under the lowest bill (crouch-walk) |
| 1740 | 0:58.00 | S18 | bill_flutter: a paper bill's flick | bill_flick_2 | -21.0 / -24.0 | +0.30 | +0.00 (onset) | S18 the bill brushed as the head passes |
| 1753 | 0:58.43 | S19 | duck: a cloth swish + leaves brushed | duck_cloth_4 + leaf_brush_1 | -17.5 / -20.8 | +0.04 | +0.00 (anchor) | S19 the phone guy (red phone) ducks under the bill without looking, still chatting |
| 1759 | 0:58.63 | S19 | bill_flutter: a paper bill's flick | bill_flick_3 | -23.0 / -26.3 | +0.04 | +0.00 (onset) | S19 the bill rustles over his head |
| 1778 | 0:59.27 | S19 | stop: a shoe scuff | spin_scuff_2 | -19.0 / -23.3 | -0.34 | +0.00 (onset) | S19 the stopper's last step: she stops dead (shoe scuff) |
| 1782 | 0:59.40 | S19 | double_take: a small gasp | gasp_f_1 | -20.0 / -27.5 | -0.34 | +0.00 (onset) | S19 her double-take at the money (a little gasp) |
| 1825 | 1:00.83 | S19 | bill_touch: a paper flick | bill_flick_3 | -18.0 / -19.9 | -0.17 | +0.00 (onset) | S19 she touches the bill, delighted (paper flick) |
| 1877 | 1:02.57 | S20 | bill_brush_slow: ONE deep soft whoosh + paper dragging through hair, slowed | fs-683096-woosh + bill_hair_1 | -13.0 / -13.2 | +0.00 | +0.00 (anchor) | S20 the bill brushes her hair and swings (slowed paper rustle) |
| 1908 | 1:03.60 | S20 | bubble_laugh: a tiny muffled laugh (phone-speaker band) | laugh_f_1 (slowed to 0.45x, low-passed 1700 Hz) | -25.0 / -32.3 | -0.38 | +0.00 (onset) | S20 her mind laughs in the call bubble above her (warm, muffled) |
| 1970 | 1:05.67 | E1 | count_pip (own): E1: count pip 1 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note D6 (own instrument) + pop_2 | -16.0 / -20.4 | -0.15 | +0.00 (anchor) | Overlays.tsx: the gold number 1 pops over the held phone person (story.ts e1Pop) |
| 1981 | 1:06.03 | E1 | count_pip (own): E1: count pip 2 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note E6 (own instrument) + pop_2 | -15.5 / -19.2 | -0.07 | +0.00 (anchor) | Overlays.tsx: the gold number 2 pops over the held phone person (story.ts e1Pop) |
| 1992 | 1:06.40 | E1 | count_pip (own): E1: count pip 3 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note F6 (own instrument) + pop_2 | -15.0 / -18.5 | +0.01 | +0.00 (anchor) | Overlays.tsx: the gold number 3 pops over the held phone person (story.ts e1Pop) |
| 2003 | 1:06.77 | E1 | count_pip (own): E1: count pip 4 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note G6 (own instrument) + pop_2 | -14.5 / -17.7 | +0.09 | +0.00 (anchor) | Overlays.tsx: the gold number 4 pops over the held phone person (story.ts e1Pop) |
| 2014 | 1:07.13 | E1 | count_pip (own): E1: count pip 5 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note A6 (own instrument) + pop_2 | -14.0 / -17.0 | +0.17 | +0.00 (anchor) | Overlays.tsx: the gold number 5 pops over the held phone person (story.ts e1Pop) |
| 2024 | 1:07.47 | E2 | brake_skid: a tyre skid + the saddle's creak | skid_2 + squeak_3#1 | -16.4 / -20.8 | +0.00 | +0.00 (anchor) | E2 replay of the Q3 brake (picture time 348) |
| 2052 | 1:08.40 | E2 | honk: the bulb horn | horn_2#3 (one squeeze, tuned to A) | -12.4 / -16.9 | +0.00 | +0.00 (onset) | E2 replay: the wave honk (picture time 376) |
| 2061 | 1:08.70 | E3 | tape_rewind (own): E3: the tape REWINDS (a real VCR whirr, fast then slowing into the freeze; the score's own reversed quiz music runs with it) | tape_rewind_1 | -19.0 / -23.2 | +0.00 | +0.09 (onset) | remap.ts REW: the rewind from the hard cut to the first duck |
| 2077 | 1:09.23 | E3 | freeze_hit (own): E3: the picture FREEZES on the first duck: a soft muted thump + the VCR's clunk (no record scratch) | kenney-impact-impactsoft-heavy-000 + tape_stop_1 + freeze_hit_3 | -13.5 / -13.7 | +0.00 | +0.00 (anchor) | remap.ts REW: the hold starts (the ring begins to draw) |
| 2080 | 1:09.33 | E3 | ring_glint (own): E3: the gold ring draws on round the bills: a glassy glint | kenney-interface-glass-001 | -17.0 / -19.9 | -0.25 | +0.00 (onset) | Overlays.tsx: the ring draws on over the first 10 f of the hold |
| 2095 | 1:09.83 | E3 | tape_rewind_on (own): E3: the tape rewinds ON to frame 0 and stops on the LAST SAMPLE of the film (the loop seam) | tape_rewind_2 | -19.0 / -21.7 | +0.00 | +0.17 (onset) | remap.ts REW: the second rewind, landing on frame 0 at TOTAL |

## 3. Loops and long sounds (9)
| frames | time | shot | cue | sound file(s) | level LU | pan | picture action |
|---|---|---|---|---|---|---|---|
| 0-126 | 0:00.00 | Q1 | phone_chatter_bed: one side of a phone call, muffled and wordless | murmur_m_2 | -29.1 | +0.13 | p1 (red) on the call: a murmur of one side of a phone talk, 0..126 |
| 0-43 | 0:00.00 | Q1 | unicycle_near: the unicycle near the lens: the tyre rolling on brick + a pedal squeak on each listed half turn | tyre_roll_1 + squeak takes | -25.7 | +0.23 | a pedal squeak (every half crank turn while he is near) |
| 296-348 | 0:09.87 | Q2 | unicycle_near: the unicycle near the lens: the tyre rolling on brick + a pedal squeak on each listed half turn | tyre_roll_1 + squeak takes | -25.6 | +0.05 | a pedal squeak (every half crank turn while he is near) |
| 393-513 | 0:13.10 | S1 | unicycle_wheel_loop: the tyre rolling on brick | tyre_roll_1 | -33.3 | +0.59 | the clown's wheel ticking + tyre on brick behind the phone guy (to f 513) |
| 668-695 | 0:22.27 | S3 | unicycle_roll: the tyre rolling in on floorboards | tyre_roll_1 | -29.0 | +0.21 | the unicycle's tyre rolls in on the floorboards (to f 695) |
| 760-760 | 0:25.33 | S6 | clock_hour (own): the tower clock spins through the hour (a soft ratchet whirr, top right) | clock_1 | -25.0 | +0.50 | sets: the clock's hands spin one hour over 'So for one hour' (BEAT.soFor - 4 .. hourEnd + 6) |
| 1011-1079 | 0:33.70 | S10 | headphone_off: tinny music leaking from the lifted headphone cup | headphones_1 | -29.0 | +0.09 | he lifts one headphone cup off (a tinny music leak from it until the shot ends) |
| 1079-1135 | 0:35.97 | S11 | unicycle_wheel_loop: the tyre rolling on brick | tyre_roll_2 | -33.7 | +0.23 | the clown's wheel rolling by behind the phone guy (to f 1135) |
| 1454-1504 | 0:48.47 | S15 | bubble_pop_bed: tiny muffled chatter inside the call bubble | murmur_gib_f_1 | -33.0 | -0.42 | tiny muffled chatter inside the call bubble |

## 4. Footsteps: 58 steps of 15 walkers
One recorded step on every frame the animators list, one shoe per walker, takes rotating, the level following the distance only (no step is accented).

| shot | walker | shoe | steps on frames | level LU | pan | worst sync f |
|---|---|---|---|---|---|---|
| Q1 | p1 | step_slow | 32, 120 | -28.7 .. -28.3 | +0.40 .. +0.79 | 0.00 |
| Q1 | p2 | step_soft | 111, 153, 169, 184 | -31.1 .. -29.0 | -0.20 .. -0.20 | 0.00 |
| Q1 | p4 | step_slow | 180, 193, 218, 229, 240, 251 | -31.0 .. -28.4 | +0.03 .. +0.72 | 0.00 |
| Q2 | p4 | step_slow | 290, 305 | -26.9 .. -26.9 | +0.59 .. +0.85 | 0.00 |
| S1 | the phone guy: a | step_slow | 411, 429, 447, 465, 483, 501 | -32.0 .. -30.5 | -0.26 .. -0.14 | 0.00 |
| S4 | the student: a | step_hard | 680 | -32.3 .. -32.3 | +0.31 .. +0.31 | 0.00 |
| S7 | friend a (denim): a | step_slow | 840, 855 | -32.3 .. -31.8 | +0.19 .. +0.24 | 0.00 |
| S7 | the interviewer: a | step_hard | 845, 860 | -31.0 .. -30.6 | +0.75 .. +0.85 | 0.00 |
| S7 | friend b (pink): a | step_slow | 852 | -31.1 .. -31.1 | -0.13 .. -0.13 | 0.00 |
| S14 | the headphone dude | step_soft | 1285, 1300, 1315, 1330, 1345, 1360, 1375 | -30.0 .. -29.4 | -0.38 .. -0.38 | 0.00 |
| S15 | the hero | step_slow | 1385, 1402, 1420, 1437, 1454, 1472, 1489 | -28.8 .. -28.2 | +0.13 .. +0.13 | 0.00 |
| S16 | hyman | step_soft | 1516, 1534, 1552, 1570 | -28.6 .. -28.0 | +0.00 .. +0.00 | 0.00 |
| S18 | parka | step_slow | 1687, 1698, 1710, 1721, 1733, 1744 | -30.0 .. -29.4 | +0.26 .. +0.26 | 0.00 |
| S18 | scarf | step_slow | 1689, 1701, 1712, 1724 | -30.0 .. -29.4 | +0.26 .. +0.26 | 0.00 |
| S18 | elder | step_slow | 1702, 1715, 1728, 1741 | -30.0 .. -29.4 | +0.26 .. +0.26 | 0.00 |

## 5. The living bed
| layer | level LU | what |
|---|---|---|
| (rotation) | 0.0 | THE QUIZ RULE: the bed loop is rotated by 47.80 s so both duck windows fall on its calmest stretches (largest level rise over 60 ms in a window 13.2 dB before, 6.5 dB after) |
| square | -27.5 | the campus square: a light breeze in leaves, songbirds, a far fountain (real ambience takes, looped with long crossfades); per shot dB: Q1 +1.5, Q2 +1.0, Q3 +0.5, S6 +2.0, S12 -2.0, S16 -1.0, S17 -2.0, S18 -1.0, S19 -1.0, S20 -3.0, E1 -1.0, E2 -1.0, E3 -4.0 |
| crowd | -31.0 | a far, friendly, wordless crowd murmur (livelier in the count and the high wide, shut out under the tree); per shot dB: Q1 +2.0, Q2 +1.5, S6 +2.5, S7 +1.0, S15 -3.0, S16 -5.0, S17 -6.0, S18 -4.0, S19 -4.0, S20 -6.0 |
| room | -37.0 | the office (S2-S5): a warm quiet room tone |
| tick | -32.0 | the office wall clock: 8 soft ticks, one every 1.0 s (two real click takes: tick, tock), a little right, in the room's own reverb |

The square bed is dulled once her mind is in the call (S15, from its relight) and in the slow motion (S20), is band-limited "on tape" in E3, dips for the breath before "Did you see the money?", and is loop-safe (its last sample runs into its first). The office bed replaces it under S2-S5, crossfaded on the picture's dissolves.

## 6. Listed by the animators, not sounded (74), with the reason
| frame | shot | cue | why | the animator's note |
|---|---|---|---|---|
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p2 (white) on the call: a murmur of one side of a phone talk, 0..196 |
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p3 (hero) on the call: a murmur of one side of a phone talk, 0..276 |
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p4 (blue) on the call: a murmur of one side of a phone talk, 0..262 |
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p5 (pink) on the call: a murmur of one side of a phone talk, 0..276 |
| 124 | Q1 | footstep | THE QUIZ RULE: it would still sound in the window of the duck at f 133 (only 2 f of room): only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p2 (white) footstep on brick + phone chatter murmur under it |
| 129 | Q1 | laugh_far | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 133: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | the pair stop and point at the clown, laughing (far, quiet) |
| 133 | Q1 | duck_SILENT | THE QUIZ RULE: the two ducks of the count are silent | DUCK 1: a phone person dips under bill 2 (feet only, NO accent, no swish: nothing points at the money) |
| 138 | Q1 | footstep | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 133: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p2 (white) footstep on brick + phone chatter murmur under it |
| 205 | Q1 | footstep | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 209: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p4 (blue) footstep on brick + phone chatter murmur under it |
| 209 | Q1 | duck_SILENT | THE QUIZ RULE: the two ducks of the count are silent | DUCK 2: a phone person dips under bill 2 (feet only, NO accent, no swish: nothing points at the money) |
| 353 | Q3 | whoosh_small | over the budget of 67 events (lowest priority first) | Q3: the wave's arm rises (a soft cloth swish) |
| 403 | S1 | pigeon_flush | over the budget of 67 events (lowest priority first) | a pigeon flaps up from the ground |
| 412 | S1 | pigeon_flush | thinned: under 24 f after the last kept 'pigeon_flush' | a pigeon flaps up from the ground |
| 436 | S1 | bike_pass | too far to hear on its own (near 0.11 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 441 | S1 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 445 | S1 | honk | thinned: under 12 f after the last kept 'honk' | the clown squeezes his bulb horn |
| 454 | S1 | skateboard_pass | too far to hear on its own (near 0.09 < 0.3): it is in the crowd bed | a skateboarder rolls through the background |
| 457 | S1 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 470 | S1 | laugh | held back: 3 f from 'bell_ring' (higher priority) | the clown laughs |
| 471 | S1 | laugh | thinned: under 30 f after the last kept 'laugh' | the phone guy laughs |
| 473 | S1 | honk | held back: 0 f from 'bell_ring' (higher priority) | the clown squeezes his bulb horn |
| 481 | S1 | honk | thinned: under 12 f after the last kept 'honk' | the clown squeezes his bulb horn |
| 493 | S1 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 572 | S2 | marker_tap | over the budget of 67 events (lowest priority first) | Hyman taps the whiteboard with a finger |
| 581 | S2 | sigh | over the budget of 67 events (lowest priority first) | Hyman's sigh (shoulders up, then down) |
| 634 | S2 | door_swing | inside door_latch's take (the latch, then the creak of the swing) | the door swings open into the room (a soft creak) |
| 642 | S3 | door_stop | over the budget of 67 events (lowest priority first) | the door bumps its stop |
| 736 | S5 | hands_rub | over the budget of 67 events (lowest priority first) | Hyman rubs his hands in glee (to suit end) |
| 757 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 781 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 793 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 805 | S6 | pigeon_flush | too far to hear on its own (near 0.07 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 817 | S6 | pigeon_flush | too far to hear on its own (near 0.07 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 819 | S6 | honk | thinned: at most 1 'honk' in a shot | the clown squeezes his bulb horn |
| 825 | S6 | pigeon_flush | too far to hear on its own (near 0.07 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 825 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 829 | S6 | bike_pass | too far to hear on its own (near 0.06 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 832 | S6 | pigeon_flush | too far to hear on its own (near 0.07 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 836 | S6 | pigeon_flush | too far to hear on its own (near 0.07 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 838 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 838 | S6 | skateboard_pass | too far to hear on its own (near 0.05 < 0.3): it is in the crowd bed | a skateboarder rolls through the background |
| 873 | S7 | bike_pass | too far to hear on its own (near 0.10 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 889 | S8 | pigeon_flush | over the budget of 67 events (lowest priority first) | a pigeon flaps up from the ground |
| 920 | S8 | bike_pass | too far to hear on its own (near 0.18 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 926 | S8 | laugh | a second voice under a character's line (the dialogue stays clean) | friend B (pink) laughs |
| 943 | S9 | pencil_scribble | over the budget of 67 events (lowest priority first) | the interviewer's pencil on the clipboard |
| 967 | S9 | pencil_scribble | over the budget of 67 events (lowest priority first) | the interviewer's pencil on the clipboard |
| 969 | S9 | laugh | a second voice under a character's line (the dialogue stays clean) | friend A (denim) laughs |
| 971 | S9 | hand_clap | over the budget of 67 events (lowest priority first) | friend A claps along (light, 3 claps) |
| 975 | S9 | laugh | a second voice under a character's line (the dialogue stays clean) | friend B (pink) laughs |
| 980 | S9 | hand_clap | over the budget of 67 events (lowest priority first) | friend A claps along (light, 3 claps) |
| 989 | S9 | hand_clap | over the budget of 67 events (lowest priority first) | friend A claps along (light, 3 claps) |
| 991 | S9 | pencil_scribble | thinned: at most 2 'pencil_scribble' in a shot | the interviewer's pencil on the clipboard |
| 1046 | S10 | skateboard_pass | too far to hear on its own (near 0.16 < 0.3): it is in the crowd bed | a skateboarder rolls through the background |
| 1090 | S11 | pigeon_flush | over the budget of 67 events (lowest priority first) | a pigeon flaps up from the ground |
| 1133 | S11 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 1134 | S11 | bike_pass | too far to hear on its own (near 0.06 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 1214 | S12 | brows_up | over the budget of 67 events (lowest priority first) | S12 she looks up, eyebrows up (incredulous): a soft 'hm!' breath only, no voice |
| 1230 | S13 | pigeon_flush | held back: 2 f from 'honk' (higher priority) | S13 the pigeons by the clown's wheel flush on the honk |
| 1299 | S14 | pigeon_flush | over the budget of 67 events (lowest priority first) | S14 pigeons in the dude's path flutter aside |
| 1312 | S14 | notice | a look: no sound | S14 the dude spots the clown (eyes up, brows) |
| 1326 | S14 | wave | a wave: no sound | S14 the dude waves at the clown |
| 1333 | S14 | wave_back | a wave: no sound | S14 the clown waves back |
| 1361 | S14 | tap_cup | over the budget of 67 events (lowest priority first) | S14 the dude taps his headphone cup, sly look |
| 1406 | S15 | signal_on | carried by the mind's rising sweep 6 frames later | S15 the wavy phone-signal line draws out toward the bubble |
| 1483 | S15 | bubble_laugh | over the budget of 67 events (lowest priority first) | S15 inside the bubble: she and her mum laugh (tiny, muffled, warm) |
| 1520 | S16 | sly_look | a look: no sound | S16 Hyman glances left |
| 1537 | S16 | sly_look | a look: no sound | S16 Hyman glances right |
| 1585 | S17 | peg_squeeze | over the budget of 67 events (lowest priority first) | S17 the peg pinched open (a wooden creak) |
| 1628 | S17 | pat_head | over the budget of 67 events (lowest priority first) | S17 Hyman pats the top of his head (head height) |
| 1860 | S20 | duck_slow | over the budget of 67 events (lowest priority first) | S20 SLOW MOTION: the hero dips under the bill (slowed whoosh, low) |
| 1889 | S20 | rise_slow | over the budget of 67 events (lowest priority first) | S20 she rises out of the dip and walks on, still chatting (cloth rustle, slowed) |
| 1915 | S20 | bubble_laugh | thinned: under 30 f after the last kept 'bubble_laugh' | S20 the mind laughs again on 'minds' (oblivious) |
| 2029 | E2 | whoosh_small | over the budget of 67 events (lowest priority first) | E2 replay: the wave's arm rises (picture time 353) |

## 7. Unmapped cue names (0 cues)
None: every cue name in the three files has an entry in `sfx.py MAP`.

## 8. Measurements of the mix
| check | target | measured | |
|---|---|---|---|
| length | 2117 f = 3387200 samples | 3387200 samples | pass |
| integrated loudness | -14 LUFS +-0.5 | -14.01 LUFS | pass |
| true peak | <= -2 dBTP | -2.90 dBTP | pass |
| loudness range | (report) | 4.4 LU; momentary max -9.4, short-term max -12.6 LUFS | |
| limiter | (report) | max gain reduction 1.62 dB, over 0.5 dB for 2.08 % of the film | |
| stems | (report) | voice -14.0, score -32.7, effects -34.7, bed -42.0 LUFS | |
| score | one master gain | +0.22 dB on `music_v2.wav` (it follows the voice chain's own level change; no per-section levelling) | |
| speech margin, every word (1-4 kHz, voice over everything else) | >= 7 dB | lowest 7.4 dB of 177 words | pass |
| character lines vs narrator (same margin) | as clear | characters: median 26.7 dB, lowest 15.2 dB (24 words); narrator: median 17.7 dB, lowest 7.4 dB | pass |
| sync direction | every cue -1 .. +2 f | 128 picture-synced cues: +0.00 .. +0.17 f; 0 outside | pass |
| mono fold-down | small loss | 0.01 LU (side is -27.3 dB under mid) | pass |
| phone speaker (400 Hz high-pass) | (report) | the mix loses 2.79 LU (voice 2.8, score 5.1, effects 0.7, bed 3.3 LU): the voice keeps its lead | |
| loop seam: sample jump | no click | 0.00559 (typical step near the end 0.02337, near the start 0.08115) | pass |
| loop seam: last 0.3 s into first 0.3 s | (report) | mix -29.2 -> -17.8 dBFS; voice -41.5 -> -18.2; music -29.9 -> -31.4; sfx -39.9 -> -35.7; amb -48.3 -> -39.4 | |

ffmpeg ebur128 on `mix.wav` (cross-check):
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.4 LUFS
  Loudness range:
    LRA:         4.4 LU
    Threshold: -34.4 LUFS
    LRA low:   -17.9 LUFS
    LRA high:  -13.5 LUFS
  True peak:
    Peak:       -2.9 dBFS
```
The eight words with the lowest speech margin: "a" @ 1.64 s 7.4 dB, "lose" @ 5.48 s 7.8 dB, "for" @ 25.56 s 7.9 dB, "Only" @ 59.01 s 8.1 dB, "noticed" @ 45.11 s 8.1 dB, "him." @ 41.92 s 8.2 dB, "a" @ 21.39 s 8.2 dB, "pulls" @ 47.13 s 8.3 dB.
Words whose bed was dipped to reach the margin: "a" @ 1.64 s (read -1.5 dB, beds' 1-4 kHz -10.0 dB), "a" @ 21.39 s (read -2.2 dB, beds' 1-4 kHz -10.7 dB), "only" @ 39.44 s (read 7.2 dB, beds' 1-4 kHz -1.3 dB), "him." @ 41.92 s (read 3.9 dB, beds' 1-4 kHz -4.6 dB), "pulls" @ 47.13 s (read 5.4 dB, beds' 1-4 kHz -3.1 dB), "it." @ 57.76 s (read 4.3 dB, beds' 1-4 kHz -4.2 dB), "a" @ 58.31 s (read -0.8 dB, beds' 1-4 kHz -9.3 dB), "Only" @ 59.01 s (read 5.7 dB, beds' 1-4 kHz -2.8 dB), "for" @ 60.80 s (read 7.0 dB, beds' 1-4 kHz -1.5 dB), "it." @ 63.07 s (read 6.7 dB, beds' 1-4 kHz -1.8 dB), "phones." @ 66.58 s (read 3.3 dB, beds' 1-4 kHz -5.2 dB), "You" @ 67.23 s (read 6.2 dB, beds' 1-4 kHz -2.3 dB).

Voice lines after the leveller (loudness of each line; the narrator's median line is the reference):

| line | speaker | time | before LUFS | gain dB | after LUFS | text |
|---|---|---|---|---|---|---|
| n01 | N | 0.07-2.12 | -18.1 | +0.3 | -17.8 | Quick test. Count the people on a phone. |
| n02 | N | 5.12-6.21 | -18.8 | +0.7 | -18.1 | Don't lose count. |
| n03 | N | 9.12-9.61 | -18.5 | +0.5 | -17.9 | How many? |
| n04 | N | 10.01-10.69 | -20.2 | +2.4 | -18.4 | Five. |
| n05 | N | 10.81-12.85 | -18.1 | +0.3 | -17.9 | And the clown? You saw him, right? |
| n06 | N | 12.99-16.84 | -17.5 | +0.0 | -17.5 | In a real experiment, most people on a phone call never saw  |
| n07 | N | 17.00-22.23 | -17.4 | +0.0 | -17.4 | Psychologist Ira Hyman needed a distraction nobody could mis |
| s01 | STUDENT | 22.37-23.68 | -16.9 | +0.0 | -17.1 | I own a unicycle. |
| s02 | STUDENT | 23.93-24.98 | -17.6 | +0.7 | -17.4 | ...and a clown suit. |
| n08 | N | 25.14-29.05 | -17.4 | +0.0 | -17.4 | So for one hour, the clown rode circles in the middle of cam |
| i01 | INTERVIEWER | 29.20-30.79 | -17.5 | +0.5 | -17.0 | Did you see anything unusual? |
| f01 | FRIEND | 31.21-33.47 | -17.4 | +0.0 | -17.5 | The clown? He was amazing! |
| h01 | HEADPHONES | 33.58-35.74 | -17.2 | +0.0 | -17.2 | Dude, the unicycle guy! |
| p01 | PHONE_GUY | 35.85-37.58 | -19.5 | +2.3 | -17.8 | Sorry... what clown? |
| n10 | N | 37.72-42.13 | -17.1 | +0.0 | -17.1 | Even asked straight out, only {1/one} in {4/four} people on  |
| n12 | N | 42.30-45.76 | -17.4 | +0.0 | -17.4 | Here's the weird part: people listening to music noticed him |
| n13 | N | 45.92-49.86 | -17.3 | +0.0 | -17.3 | You see, a call pulls your mind toward someone who isn't the |
| n14 | N | 50.02-55.80 | -17.4 | +0.0 | -17.4 | So Hyman tried something sneakier. He hung dollar bills on a |
| n15 | N | 55.97-57.92 | -17.4 | +0.0 | -17.5 | Nearly everyone ducked under it. |
| n16 | N | 58.08-61.42 | -17.7 | +0.0 | -17.7 | On a phone? Only {6/six} in {100/a hundred} stopped for the  |
| n17 | N | 61.72-65.33 | -17.0 | +0.0 | -17.1 | Their bodies dodged it. Their minds never saw it. |
| n18 | N | 65.50-68.42 | -17.5 | +0.0 | -17.6 | You counted five phones. You saw the clown. |
| n19 | N | 68.78-70.34 | -17.1 | +2.0 | -15.1 | Did you see the money? |

## 9. Proof for the quiz hard rule
The two ducks of the count are at film frames 133, 209 (EDIT_V2 section 5: 1/3 and 2/3 of the count window). Round each one lies a window of +-6 frames (0.4 s). The rule, as `sfx.py hard_rule()` enforces it (the mix stops if it is broken):
- In all of Q1 there is no sound of the classes bill, chime, cloth, ding, duck, glint, leaf, peg, rustle, shimmer, swish, whoosh.
- Inside a window no sound may come from the ducker or from anyone else on the square (no cloth, step, rustle, paper, chime, laugh or murmur): such a sound never starts in a window; one that starts before it is cut so that it has ended before the window, or is not sounded when there is no room; and that whole bus is gated to digital silence inside the window.
- The lead's rule of 2026-11-18: the ONLY sounds allowed inside a window are the clown's, the pigeons' and the dog's (bell_ring, brake_skid, clown_wobble, clown_yelp, dog_yap, honk, pigeon_flush), and only when panned at +0.10 or further right. They happen on the right of the frame, away from the money (upper-left): fair misdirection away from the bills. They keep their normal level (set by `near`), never boosted.
- Nothing in Q1 sits further left than pan -0.20 (the bills are upper-left); the animators' pans are clamped there.

Measured in the written stems:

Levels are K-weighted (as loudness is heard). Each window is read against every other window of the same length in Q1 ("louder than x %": 50 % = an ordinary moment of the count, near 100 % would be an accent). "Rise" = the largest climb of the 30 ms level over 60 ms inside the window (a new sound starting shows as a large rise), again against the other windows. The score is read BEFORE its dips under the words (they lower the narrated stretches and would make the unspoken count look loud), and against the same slice of its groove two beats earlier and later.

| duck frame | window | everything but the clown / pigeons / dog | the clown's / pigeons' / dog's sounds heard in the window | their L-R | bed level (Q1 p10 / median / p90) | bed louder than | bed rise (above x % of windows) | bed L-R (all Q1) | score level (Q1 p10 / median / p90) | score louder than | same slice two beats before / after | score L-R (all Q1) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 133 | 127-139 | peak 0.0000000 (digital silence) | clown_wobble from f 124 (pan +0.24, -24.0 LU) | -3.3 dB (leans right) | -41.0 dB (-44.1 / -41.3 / -39.9) | 53 % | 3.8 dB (55 %) | -0.12 dB (-0.03) | -33.4 dB (-37.9 / -33.7 / -30.0) | 55 % | -31.4 / -33.1 dB | -0.36 dB (-0.40) |
| 209 | 203-215 | peak 0.0000000 (digital silence) | honk from f 207 (pan +0.49, -16.9 LU); pigeon_flush from f 211 (pan +0.49, -25.2 LU) | -7.7 dB (leans right) | -40.7 dB (-44.1 / -41.2 / -39.9) | 66 % | 2.3 dB (6 %) | +0.27 dB (-0.03) | -28.8 dB (-37.9 / -34.0 / -30.7) | 97 % | -30.4 / -27.8 dB | -0.28 dB (-0.40) |

Read with care: at the duck at f 209 the score is louder than 97 % of Q1's windows. That is the score's own build (every bar of the count is a little louder than the one before, toward "How many?"), not an accent on the duck: the same slice of the groove two beats earlier reads -30.4 dB and two beats later -27.8 dB, with this window (-28.8 dB) between or beside them. Only an ear can say whether the build itself draws attention there.

Every animator cue within 20 frames of a duck, and what became of it:

| frame | cue | status | reason |
|---|---|---|---|
| 120 | footstep | step | sounded (it lies outside both windows) |
| 124 | clown_wobble | play | sounded (it lies outside both windows) |
| 124 | footstep | rule | THE QUIZ RULE: it would still sound in the window of the duck at f 133 (only 2 f of room): only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 129 | laugh_far | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 133: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 133 | duck_SILENT | silent | THE QUIZ RULE: the two ducks of the count are silent |
| 138 | footstep | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 133: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 149 | pigeon_flush | play | sounded (it lies outside both windows) |
| 151 | clown_yelp | play | sounded (it lies outside both windows) |
| 153 | footstep | step | sounded (it lies outside both windows) |
| 193 | footstep | step | sounded (it lies outside both windows) |
| 205 | footstep | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 209: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 207 | honk | play | sounded (it lies outside both windows) |
| 209 | duck_SILENT | silent | THE QUIZ RULE: the two ducks of the count are silent |
| 211 | pigeon_flush | play | sounded (it lies outside both windows) |
| 218 | footstep | step | sounded (it lies outside both windows) |
| 229 | footstep | step | sounded (it lies outside both windows) |

The bed and the score are continuous through both windows. The bed is a seamless loop of real ambience (it has bird calls in it): it is ROTATED so that both windows fall on its calmest stretches (section 5). The score was changed for this rule in phase B (`music.py`): in the first version both ducks fell on a bar line (the harmony's step, a louder bar, a celesta spark, and the second clarinet phrase's entry). The bars now start on beats 2, 6, 10 and 14, so every step falls between the ducks; no spark and no phrase note starts in a window; the ostinato is spread evenly left and right. Only the steady pulse (pizzicato 8ths, the bass every two beats, the clock, the shaker) runs through.

## 10. Five timestamps for the owner's headphones
1. **0:00.00 - 0:12.87, the quiz.** The frame-0 honk under "Quick test."; the count (lively; at the two ducks, 0:04.43 and 0:06.97, only the clown's gag and the pigeons sound, on the right); the chip flip and the ding on "Five." at 0:10.07; the wave honk on "right?".
2. **0:20.90 - 0:25.23, the office.** The room tone and the clock's tick, the door, the unicycle's squeaks, then the bag: rustle, zip, the fling at 0:24.33 and the score's hit on "suit." at 0:24.60.
3. **0:29.20 - 0:38.07, the four character lines.** Are they as clear as the narrator? Only light foley under them; the honk just after "what clown?".
4. **0:52.73 - 0:58.17, the money.** The peg's snap (the first money sound of the film) with the bill's flick, then the three ducks in rhythm: cloth, leaves, a flick each.
5. **1:01.83 - 1:10.57, the ending.** The slow motion (everything dulled, one deep whoosh as the bill brushes her hair), the five rising pips from 1:05.67, the breath before "Did you see the money?", the tape rewind from 1:08.70, the freeze hit and the glint at 1:09.23, the rewind on, and the stop on the last sample (then the loop: the honk of frame 0).

## 11. What only an ear can judge
- Whether the generated effects sound real in context (the door, the zip, the dog, the laughs and gasps are ElevenLabs generations that were only measured).
- Whether the horn on A sits well against the score in every section, and whether the count feels lively rather than busy.
- Whether the VCR whirr under "Did you see the money?" reads as a tape rewind, and whether the freeze hit and glint are soft enough.
- Whether the character lines sit in the same space as the narrator (they are levelled, not re-recorded).

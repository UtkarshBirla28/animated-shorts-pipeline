# SOUND EVENTS v2: "The Clown Nobody Saw" (rebuild, script v6)

Written by `mix.py` on 2026-11-18 23:56 from the mix it just made (effects key `8d0cb40deabd`). Film: 2246 frames = 74.867 s = 3593600 samples at 48 kHz. Nothing was played: every number here is measured.

## p4: the final acting round (2026-11-18, the picture only; the sound of p3 is kept)

The owner approved p3's sound and narration; this round follows the picture. The three animators regenerated their cue files after a final acting round (quiz 75 cues, 55 sounded, story1 131 cues, 80 sounded, story2 115 cues, 91 sounded); `timeline.json` was re-exported (still 2246 f).

- **24 new cue names mapped** (unmapped: 0), quiet, no new ElevenLabs credits: `phew_blow` (a short breath), `take_boing`, `eye_pop` (small high boings), `take_gasp` (a tiny tick of Hyman's glasses: no male gasp take), `cloth_grab`, `timelapse_whoosh`, `phone_laugh` (a laugh in the phone band, S6 and S14), `pen_tap`, `whip_pan` (a short soft air-swish whose PEAK sits on the cut frame the animator names), `phone_chatter` (muffled loops, S14 and S18), `unicycle_off` (a wheel creak), `reach`, `bill_pinch` (paper snap + a small glint), `bill_tug` (paper flap + the peg's creak), `giggle`, `bubble_swell`, `bill_flutter_slow`. Silent by choice: `cheek_puff`, `sly_hmm`, `snap_zoom` (it lands on a character's word), `squint` (the '?' carries it), `glance`, `cheer` (his hop and honks carry it), `pigeon_strut`.
- `hop` / `land` read their text: the clown's unicycle hop is a small boing, its landing a tyre thump + a squeak (S13); a person's landing stays two soft steps.
- **Quiz rule:** the new hook wink's sparkle ting (Q1 f 30) is a chime, so it is silent (`ting`, `sparkle`, `ping` added to the classes banned in Q1); Q3's wink ting (f 390) sounds. The plaza honks moved with the picture (f 94, f 121). Both duck windows: everything but the clown / pigeons / dog is digital silence.
- **The breath before "Their bodies dodged it."**: S19's second tug and the giggle would start in it, so they are held back (rule); the first tug and the pinch play.
- Budget 110 -> 150 events (keeps everything p3 sounded plus the new acting); honk gap 8 -> 6 f (S13's and S14's honk pairs are 7 f apart: each squeeze sounds). S5: the score's comic hit stays on 25.000 s: with the flash gone it now keys on the suit's spring, the picture's 'reveal hit' (f 750); Hyman's jaw drop on "suit." is 5 dB softer; the S8 twinkle on "The clown?" 3 dB softer.
- **Measured:** -14.01 LUFS, -2.90 dBTP, LRA 3.5 LU, 2246 f = 3593600 samples, mono loss -0.01 LU, lowest word margin 7.6 dB, sync 219 cues +0.00 .. +0.16 f (0 outside); `check_audio.py`: 22 of 22 checks pass
- The score (`music_v2.wav`) is unchanged: its inputs (voice, length, duck windows, the E3 cut / hold, the suit hit at 25.000 s) are the same as in p3.

## 0. p3: the polish round (2026-11-18, voice v6b, picture re-timed to 2246 f)

What changed since preview 2, item by item against the p2 sound audit (`studio/out/clown/audit_p2/AUDIT_sound.md`) and the lead's D11 (`studio/out/clown/FIX2_PLAN.md`). Every number is measured in the written stems by `_p3/verify_p3.py` (`_p3/verify_p3.json`); nothing was played.

**Inputs.** The three cue files were regenerated from the current picture code (`anim_quiz/cues.mjs`, `anim_story1/tools/cues.mjs`, `anim_story2/cues.mjs`; no generator failed, no warp was needed); the stale ones are kept as `sound_cues_p2.json`. 263 cue lines; 47 new cue names (the polish kit and the new gags) were added to `sfx.py MAP`; unmapped now: 0. `music.py` was re-run on the new voice (sections keyed to the line times, as designed).

| audit item | p2 (audit) | p3 (measured) | what was done |
|---|---|---|---|
| B1 the frame-0 honk | -17.6 LU, its first squeeze 60 ms, then the voice | -6.0 LU; sfx peak -8.6 dBFS in 0-0.34 s, -26.0 dBFS in the 30 ms after "Quick" starts; first 10 ms -11.1 dBFS | `B_open_honk`: the picture pumps the horn twice in the 0.34 s lead-in (frame 0 and f 6, honk rings on both), so two squeezes: the first on sample 0, the second on the second pump, both over before "Quick", no word carve |
| B1 the count | -29.3 / -28.4 LUFS in the two narration-free stretches; short-term min -29.4 | mix -23.5 / -21.9 LUFS (score -24.6 / -22.8, effects -29.5 / -29.4); short-term min -23.8 LUFS for the whole film | `mix.py COUNT_LIFT`: score +6 dB, effects +4 dB, ONE flat stretch 2.44-9.33 s (from "phone." to "How many?"; 150 ms ramps at its two ends only). In the count an effect that starts on a narrator word sits 4 dB lower (`Q1_WORD_DB`) |
| M4 S1's racket | honks at 445 / 481 (p2 f) not sounded; bell -27.7 LU (buried); sad honk -24.7 | honk 452: -17.6 LU, best band 10.4 dB; honk 462: -17.7 LU, best band 8.6 dB; bell_ring 490: -15.0 LU, best band 16.9 dB; honk 498: -17.7 LU, best band 1.8 dB; unicycle_brake 504: -17.2 LU, best band 8.1 dB | single squeezes on every visible squeeze (`HONK_SINGLE_F`), the 490 squeeze stays under the bell; `SHOT_DB` compensates the word carve (the audit's targets are measured levels); the bell's carve is lighter (1.2-3.5 kHz) |
| M5 rumble | 30 % of the effects stem under 90 Hz | 13.7 % | an 80 Hz 12 dB/oct high-pass on the effects bus, except the freeze hit, the jaw-drop and the slow whoosh (`SFX_HP`, `LOW_OK`) |
| M5 pigeons | sub-bass thumps (95 % of energy under 82-352 Hz) | pigeon_land f 93: best band 3.8 dB at 794 Hz; pigeon_leave f 123: best band 17.0 dB at 4000 Hz; pigeon_scatter f 157: best band 21.1 dB at 1000 Hz; pigeon_scatter f 183: best band -8.2 dB at 8000 Hz; pigeon_flush f 220: best band 24.6 dB at 2520 Hz; pigeon_scatter f 292: best band 4.5 dB at 1587 Hz | three new bright wing-clap generations (`pigeon_b`), 0.5-6 kHz share -1.5 to -8 dB (`_p3/measure_new.txt`) |
| M5 featured footsteps | best band: S1 -7.6, S14 -3.7, S15 -3.1, S16 -14.3 dB | S1 the phone guy: a +0.6; S14 the headphone dude +3.9; S15 the hero +1.3; S16 hyman +2.8; S18 elder -3.2; S18 parka -0.5; S18 scarf +2.4 dB | the soft / slow shoes measured as thumps under 90 Hz: crisp sneaker takes (new generation) and the hard takes instead, every step high-passed at 120 Hz, a heel-scuff layer (new generation, 2-5 kHz) under each, the featured walkers +9 dB |
| M6 density | 11.4 s with no event (S8-S10 digital silence); S18 9.5 cues/s | S9 5 events (claps); S18 6 events + 6 steps in 2.1 s = 5.7 cues/s; no stretch over 5 s without a cue | the claps are back (the budget is 110 events), the S18 animator already lists two steps per walker; the shoes follow its text (leather / sneaker / soft) |
| m1 the five pips | 1 f early each | on 2048, 2062, 2076, 2090, 2104 (timeline e1.holds[k].pop), sync error +0.00, +0.00, +0.00, +0.00, +0.00 f | read from `timeline.json e1` instead of the remap; carved deeper under "five phones." |
| m2 the ding before the 5 | ding 1-3 f before the 5 reads | ding on f 312 (FLIP + 6, the 5 at 71 % of its height), error +0.00 f; chip flip on f 307 (FLIP + 1), chip-in f 71 | keyed to the overlay's own formulas |
| m3 the comic hit | 7 f after the suit is seen | the hit's attack (raw score) at 25.000 s = f 750.0 (+6.0 dB in 5 ms, to -29.8 dBFS); the bag opens on f 750; the harp glissando leading into it starts rising at 24.93 s; the word "suit." follows at 25.20 s | `music.py bag_open_t()` reads STORY-1's flash_snap cue |
| M1 the mind-blow line's air | 0.27 s before, 0.12 s after; score 4 LU under the money section | 0.50 s before, 0.50 s after (the new voice); in the breath before it: score RMS -113.2 dBFS, effects peak -240.0 dBFS (digital silence), mix RMS -53.8 dBFS; score under the line -40.7 LUFS = -8.4 LU under the money section | the score stops dead after "money."; the effects are gated and the bed dips 8 dB in that breath (`sfx.mind_hush`); `mindblow` target -27.5 LU under the voice (was -23.5) |
| D2 / D11 E3 | rewind, freeze, rewind | cut 71.633 s (in the hush: voice peak -53.4 dBFS before "Did"); tape whirr + the score's reversed quiz music from the cut (score -30.6 dBFS RMS); the hold 73.20-74.53 s: soft freeze hit peak -17.5 dBFS, glint on the ring's completion (73.467 s) peak -22.9 dBFS; over "money?" effects -240.0 dBFS, bed -240.0 dBFS, the score's swell -34.5 LUFS; the rewind to the seam effects -36.9 dBFS RMS; seam jump 0.01147 | freeze hit -17 LU (was -13.5) and cut before "money?"; the swell's own growth compressed so it is a soft swell under the word (it measured -57.7 LUFS there in the first p3 run) |
| m6 honk copies | f 1129 / 1352 correlated 1.00 | every honk +-0.2 semitones and up to 8 % shorter, seeded per cue (`varied`) | |
| m7 faint events | spin whoosh / jaw drop bodies at 125 Hz | a bright chop layer on the spin (-6 dB), a comic boing on the jaw drop | |

**New effects (the animators' polish kit and gags, D9):** confetti (generated), the light-bulb 'idea' ping, sparkles / twinkles / the wink 'ting' (glockenspiel + celesta in the score's key), '?' and '!' pops, the juggling pats (Q1, S6, S14), dust puffs under the brakes, the note crumpled and its tock on the board, sheets fluttering off the pin board, the suit's boing, Hyman's whistle (F6 -> D6), the jogger, the freeze, the stopper's gasp and swat, the unseen clown's wheel in S15 and his '?' + sad half honk, a far bark. Silent by design: the '!' pings in Q1 (THE QUIZ RULE bans chimes there), the camera flash (carried by the score's hit), the nose pop (the fifth effect in 6 frames), looks and waves.

**ElevenLabs:** 179 credits (account counter 36955 -> 37134), 11 takes of 8 sounds (`el_batch_p3.py`, log `_el/credits_p3.json`); 3 failed their measurement and are in `samples_reject.json` (`pigeon_settle_1` and `juggle_1`: sub-bass thumps; `idea_ping_1`: near-silent). The key is read at run time by `tools/el_api.py` and was never printed or stored.

**Master:** -14.01 LUFS, -2.90 dBTP, LRA 3.5 LU, 2246 f = 3593600 samples, mono loss -0.01 LU, lowest word margin 7.3 dB (narrator median 16.9, characters median 24.5), sync 164 cues +0.00 .. +0.16 f, 0 outside.

## 1. Where the cues come from
The cue list is data-driven. `sfx.py` reads the three animators' files at mix time and its table `MAP` turns each cue name into a real sound of the library (CC0 recordings and ElevenLabs sound-effect generations; sources in `CREDITS.txt`), rotating takes across repeats. Levels are LU under the voice (the event's loudest 0.4 s); `near` in the cue sets the level, `pan` the place.

| file | cues | sounded | not sounded |
|---|---|---|---|
| `studio/out/clown/anim_quiz/sound_cues.json` (saved 22:48) | 75 | 55 | 20 |
| `studio/out/clown/anim_story1/sound_cues.json` (saved 22:45) | 131 | 80 | 51 |
| `studio/out/clown/anim_story2/sound_cues.json` (saved 23:20) | 115 | 91 | 24 |

Of the 321 cue lines: 141 events, 66 footsteps, 19 loop / roll cues are sounded; 45 were thinned ("fewer, better": 153 events sound in the whole film, the own moments included), 9 were held back by the quiz rule, 15 are too far to hear on their own, 26 are silent by design or carried by another cue, 0 are empty, and **0 have a name the table does not know** (section 7).

## 2. Events (153): frame, sound, level, pan, picture action
`sync` = where the sound's sync point (its onset; its peak for a whoosh) landed against the picture frame, in frames (+ = late). The mix stops if a cue is more than 1 frame early or 2 late. `own` = a moment keyed to the timeline by `sfx.py`, not from a cue file.

| frame | time | shot | cue | sound file(s) | level LU (set / measured) | pan | sync f | picture action |
|---|---|---|---|---|---|---|---|---|
| 0 | 0:00.00 | Q1 | honk: the bulb horn | horn_4#1 (frame 0) + horn_5#1 (f 6), two squeezes tuned to A, over by the first word | -6.0 / -6.0 | +0.52 | +0.00 (onset) | frame 0: the clown pumps his bulb horn right beside the phone guy's head (the thumbnail; the squeeze is ON frame 0) |
| 71 | 0:02.37 | Q1 | chip_in (own): the chip 'PHONES: ?' pops in (a small pop, on the right) | fs-824189-pop-in-sfx | -23.0 / -29.2 | +0.35 | +0.00 (onset) | Overlays.tsx: CHIP_IN = BEAT.jobEnd - 2 (drawn from + 1) |
| 93 | 0:03.10 | Q1 | pigeon_land: a pigeon landing on his hat: a short flutter, then two tiny pecks | pigeon_b_3 + fs384187 + fs721514 | -25.0 / -25.0 | +0.47 | +0.00 (anchor) | a pigeon lands on his hat as he rides backward up the plaza (a soft flutter + a tiny thump; it pecks the hat at +10 and +17: two taps; he goes cross-eyed) |
| 94 | 0:03.13 | Q1 | honk: the bulb horn | horn_2#3 + horn_4#1 (two squeezes, tuned to A) | -16.0 / -16.0 | +0.47 | +0.00 (onset) | riding backward up the plaza, face to us: a honk with the horn held high (screen right), as the pigeon lands on his hat |
| 121 | 0:04.03 | Q1 | honk: the bulb horn | horn_4#2 + horn_2#3 (two squeezes, tuned to A) | -17.1 / -17.2 | +0.37 | +0.00 (onset) | a second cheery honk, horn high (right after the phone guy has walked off past him) |
| 123 | 0:04.10 | Q1 | pigeon_leave: the pigeon flutters off his hat | pigeon_b_1 | -27.0 / -27.0 | +0.37 | +0.00 (onset) | the pigeon flutters off his hat to the upper right |
| 132 | 0:04.40 | Q1 | clown_wobble: wheel scuff, a yelp, a relieved laugh | skid_2 + yelp_1 + laugh_m_1 | -24.0 / -24.0 | +0.34 | +0.00 (anchor) | DUCKS[0] gag: the wobble-and-save at the loop's far end (wheel scuff, a yelp 'whoa!' f+1, relieved laugh f+22) |
| 151 | 0:05.03 | Q1 | phew_blow: his relieved 'phew' (a short breath out) | man_sigh_2 | -28.0 / -28.0 | +0.41 | +0.00 (onset) | ...and BLOWS it out: a relieved 'phew' (a little puff cloud floats off to the right) |
| 157 | 0:05.23 | Q1 | pigeon_scatter: pigeons scattering low: a flurry of wing claps | pigeon_b_2 | -20.4 / -20.9 | +0.48 | +0.00 (onset) | 'Don't lose count.': he rides into the pigeon flock; six birds burst LOW past his wheel and settle a metre away (a flurry of wing claps, no climb) |
| 159 | 0:05.30 | Q1 | clown_yelp: a startled yelp | yelp_2 | -23.5 / -30.3 | +0.44 | +0.00 (onset) | his flinch (jaw drop), then a laugh at f+14 |
| 166 | 0:05.53 | Q1 | tyre_land: a small rubbery boing (his hop lands) | boing_1 | -29.6 / -33.8 | +0.45 | +0.00 (onset) | he lands from the little hop (a rubbery boing, small) |
| 171 | 0:05.70 | Q1 | dog_paws: a small dog's claws on brick | dog_paws_1 | -25.0 / -26.1 | -0.20 | +0.00 (onset) | a small terrier bounds across the near ground left -> right (paws in pairs on brick, a bounding rhythm, 40 f) |
| 177 | 0:05.90 | Q1 | dog_yap: two happy yaps | dog_yap_1 | -21.5 / -28.2 | +0.07 | +0.00 (onset) | two happy yaps as it chases the near pigeons |
| 182 | 0:06.07 | Q1 | honk: the bulb horn | horn_5#1 + horn_4#2 (two squeezes, tuned to A) | -20.1 / -27.8 | +0.42 | +0.00 (onset) | a honk after the scattered pigeons, horn high |
| 183 | 0:06.10 | Q1 | pigeon_scatter: pigeons scattering low: a flurry of wing claps | pigeon_b_3 | -21.0 / -24.0 | +0.58 | +0.00 (onset) | near pigeons (group B) scatter low to the left away from the dog; group A hops and settles |
| 215 | 0:07.17 | Q1 | honk: the bulb horn | horn_5#1 (one squeeze, tuned to A) | -17.0 / -17.0 | +0.42 | +0.00 (onset) | DUCKS[1] gag: he honks to screen right at the re-landed pigeons |
| 220 | 0:07.33 | Q1 | pigeon_flush: a pigeon's burst of bright wing claps | pigeon_b_1 | -19.0 / -19.0 | +0.59 | +0.00 (onset) | the flock takes off, up and away to the right over the far plaza |
| 224 | 0:07.47 | Q1 | honk: the bulb horn | horn_4#1 (one squeeze, tuned to A) | -16.9 / -16.9 | +0.48 | +0.00 (onset) | a second pump at the pigeons |
| 266 | 0:08.87 | Q1 | juggle: the juggle: a soft pat on every catch | (synthesized palm pats, one a catch) | -25.8 / -25.8 | +0.44 | +0.00 (anchor) | HIS JUGGLE: two balls and his own horn in a cascade over his head, on the spot before 'How many?' and on into Q2 as he rides at the lens: a soft whup on every throw (one every 4 f), the brass horn's tiny ting when it is caught at the end |
| 292 | 0:09.73 | Q2 | pigeon_scatter: pigeons scattering low: a flurry of wing claps | pigeon_b_1 | -17.0 / -18.5 | -0.82 | +0.00 (onset) | Q2: the near pigeons scatter low to both sides as he starts toward the lens (none is left when he brakes) |
| 307 | 0:10.23 | Q2 | chip_flip (own): the chip flips (a card flick) | fs393811 | -20.0 / -23.5 | +0.35 | +0.00 (onset) | Overlays.tsx: FLIP = BEAT.five - 2 (8 f; it moves from + 1) |
| 312 | 0:10.40 | Q2 | five_ding (own): the BIG 5 shows: a bright triangle ding (on top of the score's sting on 'Five.') | fs-349504-triangle-open-04 | -12.5 / -16.1 | +0.35 | +0.00 (onset) | Overlays.tsx: the big gold 5 reads from FLIP + 6 (71 % of its height, popping) |
| 314 | 0:10.47 | Q2 | catch: he catches the horn: a slap + a tiny brass ting | (synthesized pat + a glockenspiel A7) | -24.0 / -28.5 | +0.08 | +0.00 (anchor) | he catches the horn (a small slap + ting) |
| 322 | 0:10.73 | Q2 | honk: the bulb horn | horn_4#2 + horn_2#3 (two squeezes, tuned to A) | -11.6 / -15.8 | +0.08 | +0.00 (onset) | Q2: the CHEER honk right after 'Five.' (he has just caught the horn), horn high on screen right |
| 366 | 0:12.20 | Q3 | brake_skid: a tyre skid + the saddle's creak | skid_1 + squeak_2#2 | -13.5 / -16.6 | +0.00 | +0.00 (anchor) | Q3: he brakes hard at the stop mark (tyre skid on brick, a creak of the saddle on the pitch forward, a squash, 3 cm rock back; then he rocks on the spot) |
| 367 | 0:12.23 | Q3 | dust_puff: a soft dust puff | (synthesized dust puff) | -25.0 / -28.0 | +0.00 | +0.00 (onset) | Q3: a puff of dust at the tyre as he brakes (soft, under the skid) |
| 390 | 0:13.00 | Q3 | wink_ting: a tiny 'ting' on his wink | (glockenspiel E7, own instrument) | -24.0 / -27.1 | +0.00 | +0.00 (onset) | Q3 'right?': the WINK (+ two brow waggles) before the puffed-cheek honk; E2 replays its start |
| 394 | 0:13.13 | Q3 | honk: the bulb horn | horn_5#1 + horn_4#2 (two squeezes, tuned to A) | -9.1 / -16.8 | +0.00 | +0.00 (onset) | Q3: THE WAVE HONK with the other hand on 'right?' |
| 452 | 0:15.07 | S1 | honk: the bulb horn | horn_5#1 (one squeeze, tuned to A) | -10.0 / -17.6 | +0.34 | +0.00 (onset) | the clown squeezes his bulb horn |
| 462 | 0:15.40 | S1 | honk: the bulb horn | horn_4#1 (one squeeze, tuned to A) | -10.0 / -17.7 | +0.50 | +0.00 (onset) | the clown squeezes his bulb horn |
| 490 | 0:16.33 | S1 | bell_ring: a small brass hand bell | hand_bell_1 | -12.6 / -15.0 | +0.56 | +0.00 (onset) | the clown rings his little brass hand bell high over his head, ding-a-ling (to f 503) |
| 498 | 0:16.60 | S1 | honk: the bulb horn | horn_2#3 (one squeeze, tuned to A) | -9.7 / -17.7 | +0.46 | +0.00 (onset) | the clown squeezes his bulb horn |
| 504 | 0:16.80 | S1 | unicycle_brake: a tyre scuff + one low, sad honk | skid_2 + one low horn squeeze tuned to D | -9.3 / -17.2 | +0.30 | +0.00 (anchor) | the clown gives up: his tyre scuffs to a stop, the bell clunks down (a sad little honk would be funny here) |
| 504 | 0:16.80 | S1 | dust_puff: a soft dust puff | (synthesized dust puff) | -25.0 / -28.3 | +0.31 | +0.00 (onset) | a skid puff of dust under the clown's tyre as he brakes |
| 537 | 0:17.90 | S2 | marker_tap: a finger tap on the whiteboard | fs745291 | -22.0 / -25.2 | -0.14 | +0.00 (onset) | Hyman taps the whiteboard under DISTRACTION? with his marker |
| 545 | 0:18.17 | S2 | marker_tap: a finger tap on the whiteboard | fs745291 | -22.0 / -25.2 | -0.13 | +0.00 (onset) | the second tap |
| 550 | 0:18.33 | S2 | sigh: a man's sigh | man_sigh_1 | -23.0 / -25.8 | -0.11 | +0.00 (onset) | Hyman shakes his head and sighs (shoulders up, then down) |
| 597 | 0:19.90 | S2 | paper_rustle: a note pulled out of a pocket | page_slide_1 | -25.0 / -27.7 | +0.16 | +0.00 (onset) | he pulls a note out of his breast pocket |
| 604 | 0:20.13 | S2 | paper_crumple: the note crumpled in his fist | paper_crumple_1 | -21.0 / -24.3 | +0.17 | +0.00 (onset) | he crumples the note in his fist (to f 609) |
| 614 | 0:20.47 | S2 | paper_throw: a light whoosh of the lob | fs-683101-quick-woosh | -26.0 / -30.7 | +0.16 | +0.00 (peak) | he lobs the paper ball at the board (a light whoosh) |
| 620 | 0:20.67 | S2 | paper_hit: the paper ball's soft tock on the whiteboard | fs745291 | -21.0 / -24.2 | -0.14 | +0.00 (onset) | the paper ball bounces off the whiteboard (a soft tock) |
| 648 | 0:21.60 | S2 | door_latch: the door: latch click, then the swing's soft creak | door_open_1 | -19.0 / -21.1 | -0.07 | +0.00 (onset) | the office door's latch clicks |
| 666 | 0:22.20 | S3 | take_gasp: a tiny tick of his glasses jumping (no male gasp take; a female one would be wrong on Hyman) | fs384187 | -26.0 / -28.7 | -0.31 | +0.00 (onset) | Hyman's take as the student leans in (a small gasp, his glasses jump) |
| 704 | 0:23.47 | S4 | sparkle: a sparkle twinkle | glockenspiel + celesta A6 D7 E7 (own instruments) | -24.0 / -28.1 | +0.18 | +0.00 (onset) | a twinkle on the unicycle as he shows it off |
| 705 | 0:23.50 | S4 | take_boing: a small comic boing (his take) | boing_1 | -25.0 / -28.4 | -0.40 | +0.00 (onset) | Hyman's take on "unicycle": eyes wide, glasses jump, mouth shut (a boing) |
| 716 | 0:23.87 | S4 | unicycle_rock: a saddle squeak | squeak_1#3 | -25.4 / -28.7 | +0.18 | +0.00 (onset) | a squeak as he rocks the unicycle |
| 724 | 0:24.13 | S4 | unicycle_rock: a saddle squeak | squeak_2#1 | -25.3 / -28.5 | +0.19 | +0.00 (onset) | a squeak as he rocks it back |
| 734 | 0:24.47 | S5 | garment_rustle: the garment bag's crinkle | bag_rustle_1 | -21.0 / -22.7 | +0.09 | +0.00 (onset) | the zipped garment bag swings on its hanger beside him (the cut) |
| 741 | 0:24.70 | S5 | cloth_grab: his hand grabs the bag's flap (a short crinkle) | bag_rustle_1 | -25.0 / -26.9 | -0.03 | +0.00 (onset) | his hand grabs the bag's flap edge (a cloth rustle, a tug back at f 745) |
| 748 | 0:24.93 | S5 | garment_fling: the bag flung open: a body whoosh + crinkle | fs830856 + bag_rustle_2 | -14.5 / -14.9 | -0.06 | +0.00 (anchor) | the bag's flap swings open (a cloth whoosh, to f 755) |
| 750 | 0:25.00 | S5 | suit_spring: the suit springs out: a comic boing | boing_3 | -21.0 / -25.5 | -0.07 | +0.00 (onset) | the clown suit tumbles out of the bag and bounces once (a boing / the reveal hit, settles by f 762) |
| 752 | 0:25.07 | S5 | confetti_pop: a confetti popper: a pop and a papery shower | confetti_1 | -20.0 / -21.8 | -0.07 | +0.00 (onset) | confetti bursts out of the bag's mouth and flutters down (settles by f 798) |
| 756 | 0:25.20 | S5 | jaw_drop: a small comic hit | woodblock + bass pizzicato D2 (own instruments) + impact_1 + boing_2 | -20.0 / -20.7 | -0.61 | +0.00 (onset) | Hyman's jaw drops, his glasses jump (a comic gasp / boing) |
| 756 | 0:25.20 | S5 | sparkle: a sparkle twinkle | glockenspiel + celesta A6 D7 E7 (own instruments) | -24.0 / -28.1 | -0.07 | +0.00 (onset) | sparkles twinkle round the clown suit (to the cut) |
| 765 | 0:25.50 | S5 | bulb_ping: the light bulb's 'idea' ping | a switch click + glockenspiel A6 / E7 (own instrument) | -19.0 / -22.9 | -0.62 | +0.00 (onset) | the light bulb pings on over Hyman's head (his idea), AFTER his jaw drop |
| 777 | 0:25.90 | S6 | hop_land: his little hop lands (a soft knock) | fs745291 | -25.0 / -28.6 | -0.59 | +0.00 (onset) | Hyman's little hop of glee lands |
| 805 | 0:26.83 | S6 | honk: the bulb horn | horn_4#2 (one squeeze, tuned to A) | -16.0 / -23.8 | +0.25 | +0.00 (onset) | the clown squeezes his bulb horn |
| 813 | 0:27.10 | S6 | laugh: a short laugh | laugh_f_1 | -25.6 / -32.2 | -0.31 | +0.00 (onset) | the pink-phone blonde (S6) laughs |
| 829 | 0:27.63 | S6 | timelapse_whoosh: a soft whoosh of the time-lapse trails | cam_whoosh_m_1 | -28.0 / -31.6 | -0.08 | +0.00 (onset) | three time-lapse afterimages trail him round his circle + his tyre track glints on the brick (a whooshy shimmer, to f 853) |
| 840 | 0:28.00 | S6 | gasp: a small delighted gasp | gasp_f_1 | -21.0 / -28.5 | -0.52 | +0.00 (onset) | the beret woman stops dead and gasps at the clown ("!") |
| 852 | 0:28.40 | S6 | hand_clap: a light hand clap | (synthesized hand clap) | -22.6 / -27.0 | -0.55 | +0.00 (onset) | the beret woman claps for him: the hands meet on this frame |
| 858 | 0:28.60 | S6 | honk: the bulb horn | horn_5#1 (one squeeze, tuned to A) | -16.2 / -23.9 | -0.07 | +0.00 (onset) | the clown squeezes his bulb horn |
| 859 | 0:28.63 | S6 | phone_laugh: a short laugh into her phone (muffled, phone band) | laugh_f_1 | -25.0 / -31.9 | +0.85 | +0.00 (onset) | the pink-phone blonde LAUGHS into her call right on the honk (she never looks) |
| 866 | 0:28.87 | S6 | question_pop: a '?' pop | (synthesized rising 'bwoop?') | -22.0 / -25.2 | +0.06 | +0.00 (onset) | a "?" pops over the clown: she did not even look |
| 868 | 0:28.93 | S6 | hand_clap: a light hand clap | (synthesized hand clap) | -22.5 / -27.1 | -0.59 | +0.00 (onset) | the beret woman claps for him: the hands meet on this frame |
| 872 | 0:29.07 | S6 | bystander_laugh: a bystander's far, light laugh | crowd_laugh_1 | -27.0 / -34.9 | -0.60 | +0.00 (onset) | the beret woman laughs and hops with delight |
| 876 | 0:29.20 | S6 | juggle_loop: the juggle as he laps: soft pats | (synthesized palm pats, one a catch) | -24.7 / -25.9 | +0.42 | +0.00 (anchor) | the clown juggles three balls as he laps (soft pats, to the cut) |
| 884 | 0:29.47 | S6 | hand_clap: a light hand clap | (synthesized hand clap) | -22.4 / -27.2 | -0.63 | +0.00 (onset) | the beret woman claps for him: the hands meet on this frame |
| 925 | 0:30.83 | S7 | pen_tap: a pen tap on the clipboard | fs788933 | -27.0 / -29.1 | +0.17 | +0.00 (onset) | the interviewer taps her clipboard with the pen |
| 931 | 0:31.03 | S7 | pen_tap: a pen tap on the clipboard | fs721514 | -27.0 / -29.0 | +0.18 | +0.00 (onset) | the second tap |
| 944 | 0:31.47 | S8 | whip_pan: a short soft air-swish on the whip-pan (its peak on the cut) | fs-683101-quick-woosh | -28.0 / -31.7 | +0.85 | +0.00 (peak) | a whip-pan WHOOSH across the cut S7 -> S8 (peaks on f 944) |
| 955 | 0:31.83 | S8 | sparkle: a sparkle twinkle | glockenspiel + celesta A6 D7 E7 (own instruments) | -27.0 / -31.1 | -0.17 | +0.00 (onset) | a twinkle of recognition by friend B's eyes on "The clown?" |
| 989 | 0:32.97 | S9 | hand_clap: a light hand clap | (synthesized hand clap) | -22.3 / -26.9 | +0.14 | +0.00 (onset) | friend A claps along (light): the hands meet on this frame |
| 998 | 0:33.27 | S9 | hand_clap: a light hand clap | (synthesized hand clap) | -21.8 / -26.3 | +0.37 | +0.00 (onset) | friend A claps along (light): the hands meet on this frame |
| 1007 | 0:33.57 | S9 | hand_clap: a light hand clap | (synthesized hand clap) | -21.7 / -26.4 | +0.38 | +0.00 (onset) | friend A claps along (light): the hands meet on this frame |
| 1016 | 0:33.87 | S9 | hand_clap: a light hand clap | (synthesized hand clap) | -21.5 / -26.2 | +0.39 | +0.00 (onset) | friend A claps along (light): the hands meet on this frame |
| 1025 | 0:34.17 | S9 | hand_clap: a light hand clap | (synthesized hand clap) | -21.4 / -25.9 | +0.22 | +0.00 (onset) | friend A claps along (light): the hands meet on this frame |
| 1081 | 0:36.03 | S10 | honk: the bulb horn | horn_4#1 (one squeeze, tuned to A) | -19.0 / -26.6 | +0.48 | +0.00 (onset) | the clown squeezes his bulb horn |
| 1096 | 0:36.53 | S11 | whip_pan: a short soft air-swish on the whip-pan (its peak on the cut) | fs-127197-fast-simple-chop-5-aif | -28.0 / -28.7 | -0.85 | +0.00 (peak) | a whip-pan WHOOSH across the cut S10 -> S11 (peaks on f 1096) |
| 1121 | 0:37.37 | S11 | question_pop: a '?' pop | (synthesized rising 'bwoop?') | -22.0 / -25.2 | -0.34 | +0.00 (onset) | a "?" pops over the phone guy's head |
| 1141 | 0:38.03 | S11 | surprise_pop: a '!' pop | pop_3 + a bright blip (synth) | -23.0 / -26.5 | +0.50 | +0.00 (onset) | the team member's FULL double take: a "!" pops over her head, jaw drop (a boing) |
| 1147 | 0:38.23 | S11 | honk: the bulb horn | horn_2#3 (one squeeze, tuned to A) | -16.5 / -24.5 | +0.15 | +0.00 (onset) | the clown squeezes his bulb horn |
| 1151 | 0:38.37 | S11 | pencil_scribble: pencil strokes on the clipboard | pencil_cross_1#1 + pencil_cross_1#2 + pencil_cross_1#3 | -24.5 / -25.6 | -0.09 | +0.00 (anchor) | S12 her pencil quickly draws phone person 1 (head, body, legs, arms, the phone: one fast scribble, 9 f) |
| 1171 | 0:39.03 | S12 | pencil_scribble: pencil strokes on the clipboard | pencil_cross_1#2 + pencil_cross_1#3 + pencil_cross_1#4 | -24.5 / -25.5 | -0.09 | +0.00 (anchor) | S12 her pencil quickly draws phone person 3 (head, body, legs, arms, the phone: one fast scribble, 9 f) |
| 1200 | 0:40.00 | S12 | pencil_tap: a pencil tap on the page | fs788933 | -24.0 / -25.7 | -0.13 | +0.00 (onset) | S12 on 'only' her pencil taps the first phone person once |
| 1205 | 0:40.17 | S12 | pencil_tick: one pencil check mark | pencil_one_1 | -17.0 / -18.7 | -0.09 | +0.00 (onset) | S12 the interviewer's pencil ticks doodle 1 (one stroke) |
| 1211 | 0:40.37 | S12 | pencil_cross: the two strokes of a pencil cross | pencil_cross_1#1 + pencil_cross_1#2 | -17.5 / -18.7 | -0.09 | +0.00 (anchor) | S12 the interviewer's pencil crosses doodle 2 (two strokes) |
| 1220 | 0:40.67 | S12 | pencil_cross: the two strokes of a pencil cross | pencil_cross_1#3 + pencil_cross_1#4 | -17.5 / -18.5 | -0.09 | +0.00 (anchor) | S12 the interviewer's pencil crosses doodle 3 (two strokes) |
| 1227 | 0:40.90 | S12 | pencil_cross: the two strokes of a pencil cross | pencil_cross_1#5 + pencil_cross_1#6 | -17.5 / -18.7 | -0.09 | +0.00 (anchor) | S12 the interviewer's pencil crosses doodle 4 (two strokes) |
| 1233 | 0:41.10 | S12 | one_in_four: the big red '1 in 4' lands on the page (a soft thump) | stamp_1 | -18.0 / -18.3 | +0.00 | +0.00 (onset) | S12 the big red '1 in 4' lands on the page, three dashes flick out each side (a marker squeak / soft thump) |
| 1243 | 0:41.43 | S12 | pencil_tap: a pencil tap on the page | fs721514 | -24.0 / -26.0 | -0.26 | +0.00 (onset) | S12 her pencil taps the page beside the '1' (twice: 'see?') |
| 1249 | 0:41.63 | S12 | pencil_tap: a pencil tap on the page | kit-tick | -24.0 / -28.5 | -0.26 | +0.00 (onset) | S12 her pencil taps the page beside the '1' (twice: 'see?') |
| 1258 | 0:41.93 | S12 | brows_up: a soft 'hm' | hm_f_1 | -23.0 / -27.3 | +0.00 | +0.00 (onset) | S12 she looks up as the lens rises to her face, eyebrows up (incredulous): a soft 'hm!' breath only, no voice |
| 1297 | 0:43.23 | S13 | honk: the bulb horn | horn_4#2 (one squeeze, tuned to A) | -10.0 / -17.8 | -0.38 | +0.00 (onset) | S13 the clown squeezes his horn right behind the phone guy |
| 1303 | 0:43.43 | S13 | spin_whoosh: a shoe scuff + a short body whoosh + a bright chop | spin_scuff_1 + fs-786514-swoosh-v2 + fs-127197-fast-simple-chop-5-aif | -17.0 / -18.2 | +0.30 | +0.00 (anchor) | S13 the phone guy spins round (5 f keyed turn, the smear frame on +2) |
| 1312 | 0:43.73 | S13 | jaw_drop: a small comic hit | woodblock + bass pizzicato D2 (own instruments) + impact_2 + boing_1 | -15.0 / -15.6 | +0.30 | +0.00 (onset) | S13 the take: his jaw drops with a '!' and surprise ticks, his free hand flings out (a comic 'boing' / gasp) |
| 1321 | 0:44.03 | S13 | honk: the bulb horn | horn_5#1 (one squeeze, tuned to A) | -10.0 / -17.6 | -0.38 | +0.00 (onset) | S13 the clown's double honk overhead, first of two |
| 1328 | 0:44.27 | S13 | honk: the bulb horn | horn_4#1 (one squeeze, tuned to A) | -10.0 / -17.7 | -0.38 | +0.00 (onset) | S13 the clown's double honk overhead, second of two |
| 1353 | 0:45.10 | S14 | honk: the bulb horn | horn_2#3 (one squeeze, tuned to A) | -11.3 / -19.3 | +0.00 | +0.00 (onset) | S14 the clown honks at the phone walker (as she comes): she never looks |
| 1361 | 0:45.37 | S14 | honk: the bulb horn | horn_4#2 (one squeeze, tuned to A) | -11.3 / -19.1 | +0.00 | +0.00 (onset) | S14 the clown honks at the phone walker (right over her head as she passes under him): she never looks |
| 1363 | 0:45.43 | S14 | phone_laugh: a short laugh into her phone (muffled, phone band) | laugh_f_1 | -25.0 / -31.9 | +0.00 | +0.00 (onset) | S14 the phone walker laughs into her call (a short muffled laugh) right as he honks over her head |
| 1377 | 0:45.90 | S14 | give_up: a '?' pop + a sad half honk | a '?' pop (synth) + one low horn squeeze cut short (D, -1 st) | -18.0 / -21.3 | +0.13 | +0.00 (anchor) | S14 she is gone: the clown gives up, a '?' pops over his hat (a sad little horn sag / deflating squeak) |
| 1389 | 0:46.30 | S14 | unicycle_off: a slow, dejected wheel creak | squeak_1#2 | -26.0 / -29.5 | +0.17 | +0.00 (onset) | S14 he turns and rides off slowly, dejected (wheel creak) |
| 1427 | 0:47.57 | S14 | eye_pop: a cartoon eye-pop boing (small, high) | boing_3 | -23.0 / -26.3 | +0.26 | +0.00 (onset) | S14 the clown's eyes POP (someone sees him!): cartoon 'boing' |
| 1435 | 0:47.83 | S14 | honk: the bulb horn | horn_5#1 (one squeeze, tuned to A) | -12.6 / -20.2 | +0.26 | +0.00 (onset) | S14 the clown's happy honk overhead (first of two) |
| 1442 | 0:48.07 | S14 | honk: the bulb horn | horn_4#1 (one squeeze, tuned to A) | -12.6 / -20.3 | +0.26 | +0.00 (onset) | S14 the clown's happy honk overhead (second of two) |
| 1484 | 0:49.47 | S15 | mind_lift: a soft rising sweep | fs810485 | -17.0 / -19.4 | +0.09 | +0.00 (onset) | S15 her see-through mind lifts out of her head (a soft rising shimmer) |
| 1524 | 0:50.80 | S15 | bubble_pop: a warm pop | fs-258269-mouth-pop + fs-447910-plop | -17.0 / -17.0 | -0.42 | +0.00 (anchor) | S15 her mind arrives in the call bubble (a warm pop) |
| 1525 | 0:50.83 | S15 | twinkle: twinkles round the bubble | glockenspiel + celesta D7 F7 A7 | -25.0 / -28.5 | -0.42 | +0.00 (onset) | S15 twinkles round the bubble as her mind lands in the kitchen (soft chime, with the pop) |
| 1539 | 0:51.30 | S15 | honk: the bulb horn | horn_2#3 (one squeeze, tuned to A) | -13.2 / -21.3 | +0.30 | +0.00 (onset) | S15 he honks at her ear, waving (she never turns) |
| 1550 | 0:51.67 | S15 | honk: the bulb horn | horn_4#2 (one squeeze, tuned to A) | -13.2 / -21.1 | +0.30 | +0.00 (onset) | S15 he honks again, bouncing for attention |
| 1554 | 0:51.80 | S15 | give_up: a '?' pop + a sad half honk | a '?' pop (synth) + one low horn squeeze cut short (D, -1 st) | -18.0 / -25.4 | +0.17 | +0.00 (anchor) | S15 on 'isn't there' he gives up: a '?' pops over his hat, a sad little horn sag (half honk), he peels off behind her |
| 1595 | 0:53.17 | S16 | jogger_pass: a jogger's quick steps passing behind him | step_hard x 4 (a jogger passing, right to left) | -24.0 / -25.6 | +0.26 | +0.00 (onset) | S16 a jogger runs by right behind him (quick steps, right to left) |
| 1600 | 0:53.33 | S16 | freeze: he freezes and whips the bills behind his back: a swish + a paper flick | duck_cloth_3 + bill_flick_2 | -20.0 / -23.1 | +0.00 | +0.00 (anchor) | S16 Hyman FREEZES on one leg and whips the bills behind his back (a little gasp / paper rustle) |
| 1606 | 0:53.53 | S16 | sweat_drop: a tiny 'plip' of the sweat drop | fs-447910-plop | -26.0 / -29.9 | -0.04 | +0.00 (onset) | S16 one sweat drop pops at his temple (a tiny 'plip') |
| 1611 | 0:53.70 | S16 | whistle: an innocent two-note whistle | (synthesized two-note whistle, F6 D6) | -24.0 / -35.0 | +0.00 | +0.00 (onset) | S16 he looks at the sky and whistles innocently (two notes, notes float from his lips) until the jogger is gone |
| 1627 | 0:54.23 | S16 | bills_twinkle: the bills' glassy 'ting' | kenney-interface-glass-001 | -23.0 / -25.9 | -0.09 | +0.00 (onset) | S16 the bills come back out with a twinkle (a small glassy 'ting') |
| 1657 | 0:55.23 | S17 | peg_squeeze: a small wooden creak | squeak_3#1 | -27.0 / -31.0 | +0.04 | +0.00 (onset) | S17 the peg pinched open (a wooden creak) |
| 1665 | 0:55.50 | S17 | peg_snap: the wooden peg snapping shut | peg_3 | -12.5 / -15.5 | +0.04 | +0.00 (onset) | S17 the peg SNAPS shut on the bill |
| 1666 | 0:55.53 | S17 | bill_flutter: a paper bill's flick | bill_flick_1 | -18.0 / -21.1 | +0.04 | +0.00 (onset) | S17 the bill swings after the snap |
| 1702 | 0:56.73 | S17 | stop: a shoe scuff | spin_scuff_2 | -19.0 / -23.3 | -0.34 | +0.00 (onset) | S17 Hyman stops beside the bill (a small shoe scuff), turns to us |
| 1708 | 0:56.93 | S17 | pat_head: two soft pats | fs745291 + fs745291 | -24.0 / -27.4 | -0.34 | +0.00 (anchor) | S17 Hyman pats the top of his head (head height) |
| 1735 | 0:57.83 | S17 | bill_flutter: a paper bill's flick | bill_flick_2 | -21.0 / -24.3 | -0.09 | +0.00 (onset) | S17 his flat hand brushes the bill's bottom edge |
| 1742 | 0:58.07 | S17 | wink_ting: a tiny 'ting' on his wink | (glockenspiel E7, own instrument) | -24.0 / -26.3 | -0.26 | +0.00 (onset) | S17 Hyman winks at us, a twinkle at his eye (a tiny 'ting') |
| 1758 | 0:58.60 | S18 | duck: a cloth swish + leaves brushed | duck_cloth_1 + leaf_brush_1 | -15.5 / -18.3 | +0.34 | +0.00 (anchor) | S18 scarf ducks under the lowest bill (a wince) |
| 1763 | 0:58.77 | S18 | bill_flutter: a paper bill's flick | bill_flick_3 | -20.0 / -23.3 | +0.34 | +0.00 (onset) | S18 scarf's head pushes the bill: it swings (paper flap) |
| 1786 | 0:59.53 | S18 | duck: a cloth swish + leaves brushed | duck_cloth_2 + leaf_brush_2 | -15.5 / -18.4 | +0.22 | +0.00 (anchor) | S18 parka ducks under the lowest bill (a lean-back limbo) |
| 1791 | 0:59.70 | S18 | bill_flutter: a paper bill's flick | bill_flick_1 | -20.0 / -23.1 | +0.22 | +0.00 (onset) | S18 parka's head pushes the bill: it swings (paper flap) |
| 1803 | 1:00.10 | S18 | duck: a cloth swish + leaves brushed | duck_cloth_3 + leaf_brush_3 | -15.5 / -18.3 | +0.13 | +0.00 (anchor) | S18 elder ducks under the lowest bill (a quick dip holding his cap down, ON THE PHONE the whole way, never looking up) |
| 1808 | 1:00.27 | S18 | bill_flutter: a paper bill's flick | bill_flick_2 | -20.0 / -21.7 | +0.13 | +0.00 (onset) | S18 elder's head pushes the bill: it swings (paper flap) |
| 1825 | 1:00.83 | S19 | duck: a cloth swish + leaves brushed | duck_cloth_4 + leaf_brush_1 | -17.5 / -20.8 | +0.04 | +0.00 (anchor) | S19 the phone guy (red phone) ducks under the bill without looking, still chatting |
| 1829 | 1:00.97 | S19 | bill_flutter: a paper bill's flick | bill_flick_3 | -21.0 / -24.2 | +0.04 | +0.00 (onset) | S19 his head pushes the bill: it swings hard (paper flap) |
| 1888 | 1:02.93 | S19 | stop: a shoe scuff | spin_scuff_1 | -19.0 / -22.8 | -0.21 | +0.00 (onset) | S19 the no-phone walker's last step: she stops dead under the bill on 'stopped' (shoe scuff) |
| 1890 | 1:03.00 | S19 | gasp: a small delighted gasp | gasp_f_2 | -21.0 / -27.1 | -0.21 | +0.00 (onset) | S19 she stares up at the money (a little delighted gasp) |
| 1896 | 1:03.20 | S19 | reach: a cloth swish as she reaches up | duck_cloth_3 | -26.0 / -29.1 | -0.17 | +0.00 (peak) | S19 she reaches up on her toes for the bill (cloth swish) |
| 1905 | 1:03.50 | S19 | bill_pinch: her fingers pinch the bill: a crisp paper snap + a small glint | bill_flick_1 + kenney-interface-glass-001 | -18.0 / -20.9 | -0.09 | +0.00 (anchor) | S19 her fingers PINCH the bill's corner on 'money' (a crisp paper snap) + a money glint 'ting' |
| 1909 | 1:03.63 | S19 | bill_tug: a tug: a paper flap + the peg's creak | bill_flick_2 + squeak_3#1 | -21.0 / -24.7 | -0.09 | +0.00 (anchor) | S19 she tugs the bill (first tug: paper flap, the peg creaks) |
| 1938 | 1:04.60 | S20 | duck_slow: a cloth swish, slowed | duck_cloth_4 (slowed to 0.45x, low-passed 1700 Hz) | -22.0 / -25.2 | +0.00 | +0.00 (peak) | S20 SLOW MOTION: the hero dips under the bill (slowed whoosh, low) |
| 1954 | 1:05.13 | S20 | bill_brush_slow: ONE deep soft whoosh + paper dragging through hair, slowed | fs-683096-woosh + bill_hair_1 | -13.0 / -13.2 | +0.09 | +0.00 (anchor) | S20 her hair drags the bill: it lifts and swings on behind her head (slowed paper rustle) |
| 1986 | 1:06.20 | S20 | bubble_laugh: a tiny muffled laugh (phone-speaker band) | laugh_f_1 (slowed to 0.45x, low-passed 1700 Hz) | -25.0 / -32.3 | -0.42 | +0.00 (onset) | S20 her mind laughs in the call bubble beside her (warm, muffled) |
| 1998 | 1:06.60 | S20 | bill_flutter_slow: a slowed paper flap in the gust | bill_flick_3 (slowed to 0.45x, low-passed 1700 Hz) | -25.0 / -26.4 | +0.09 | +0.00 (onset) | S20 a gust swings the bill right over her head (slowed paper flap) |
| 2020 | 1:07.33 | S20 | bubble_laugh: a tiny muffled laugh (phone-speaker band) | laugh_f_1 (slowed to 0.45x, low-passed 1700 Hz) | -25.0 / -26.4 | -0.42 | +0.00 (onset) | S20 the mind laughs on 'saw it' (warm, muffled, oblivious) |
| 2048 | 1:08.27 | E1 | count_pip (own): E1: count pip 1 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note D6 (own instrument) + pop_2 | -17.5 / -20.2 | -0.15 | +0.00 (anchor) | Overlays.tsx: the gold number 1 pops over the held phone person (story.ts e1Pop) |
| 2062 | 1:08.73 | E1 | count_pip (own): E1: count pip 2 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note E6 (own instrument) + pop_2 | -17.2 / -23.8 | -0.07 | +0.00 (anchor) | Overlays.tsx: the gold number 2 pops over the held phone person (story.ts e1Pop) |
| 2076 | 1:09.20 | E1 | count_pip (own): E1: count pip 3 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note F6 (own instrument) + pop_2 | -17.0 / -23.3 | +0.01 | +0.00 (anchor) | Overlays.tsx: the gold number 3 pops over the held phone person (story.ts e1Pop) |
| 2090 | 1:09.67 | E1 | count_pip (own): E1: count pip 4 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note G6 (own instrument) + pop_2 | -16.8 / -22.8 | +0.09 | +0.00 (anchor) | Overlays.tsx: the gold number 4 pops over the held phone person (story.ts e1Pop) |
| 2104 | 1:10.13 | E1 | count_pip (own): E1: count pip 5 of 5 (a glockenspiel note of a rising line + a small pop) | glockenspiel note A6 (own instrument) + pop_2 | -16.5 / -22.4 | +0.17 | +0.00 (anchor) | Overlays.tsx: the gold number 5 pops over the held phone person (story.ts e1Pop) |
| 2121 | 1:10.70 | E2 | brake_skid: a tyre skid + the saddle's creak | skid_2 + squeak_3#1 | -16.4 / -20.8 | +0.00 | +0.00 (anchor) | E2 replay of the Q3 brake (picture time 366) |
| 2126 | 1:10.87 | E2 | whoosh_small: a soft cloth swish | duck_cloth_3 | -25.4 / -28.5 | +0.00 | +0.00 (peak) | E2 replay: the wave's arm rises (picture time 371) |
| 2149 | 1:11.63 | E3 | tape_rewind (own): E3: the tape REWINDS from the hard cut in the hush (a real VCR whirr scrubbing under 'Did you see the', slowing into the hold; the score's own reversed quiz music runs with it) | tape_rewind_1 | -19.0 / -20.6 | +0.00 | +0.09 (onset) | timeline e3: rewind1 (cut .. hold) |
| 2196 | 1:13.20 | E3 | freeze_hit (own): E3: the hold begins on the first duck: a soft muted thump + the VCR's clunk (no record scratch) | kenney-impact-impactsoft-heavy-000 + tape_stop_1 + freeze_hit_3 | -17.0 / -18.3 | +0.00 | +0.00 (anchor) | timeline e3: hold start |
| 2204 | 1:13.47 | E3 | ring_glint (own): E3: the gold double ring completes round the bills: a short glassy glint | kenney-interface-glass-001 | -19.0 / -22.7 | -0.25 | +0.00 (onset) | timeline e3: ring_full |
| 2236 | 1:14.53 | E3 | tape_rewind_on (own): E3: the tape rewinds ON to frame 0 and stops on the LAST SAMPLE of the film (the loop seam) | tape_rewind_2 | -19.0 / -19.0 | +0.00 | +0.16 (onset) | remap.ts REW: the second rewind, landing on frame 0 at TOTAL |

## 3. Loops and long sounds (16)
| frames | time | shot | cue | sound file(s) | level LU | pan | picture action |
|---|---|---|---|---|---|---|---|
| 0-124 | 0:00.00 | Q1 | phone_chatter_bed: one side of a phone call, muffled and wordless | murmur_m_2 | -29.1 | +0.14 | p1 (red) on the call: a murmur of one side of a phone talk, 0..124 |
| 0-134 | 0:00.00 | Q1 | phone_chatter_bed: one side of a phone call, muffled and wordless | murmur_f_1 | -31.7 | -0.20 | p5 (pink) on the call: a murmur of one side of a phone talk, 0..182 |
| 0-42 | 0:00.00 | Q1 | unicycle_near: the unicycle near the lens: the tyre rolling on brick + a pedal squeak on each listed half turn | tyre_roll_1 + squeak takes | -25.8 | +0.44 | a pedal squeak (every half crank turn while he is near) |
| 311-366 | 0:10.37 | Q2 | unicycle_near: the unicycle near the lens: the tyre rolling on brick + a pedal squeak on each listed half turn | tyre_roll_1 + squeak takes | -25.5 | +0.05 | a pedal squeak (every half crank turn while he is near) |
| 411-531 | 0:13.70 | S1 | unicycle_wheel_loop: the tyre rolling on brick | tyre_roll_1 | -33.3 | +0.59 | the clown's wheel ticking + tyre on brick behind the phone guy (to f 531) |
| 652-694 | 0:21.73 | S2 | paper_flutter: a few sheets fluttering down off the pin board | bills_bed_1 | -32.0 | -0.18 | a few sheets lift off the pin board in the door's draught and flutter down (to f 694) |
| 686-713 | 0:22.87 | S3 | unicycle_roll: the tyre rolling in on floorboards | tyre_roll_1 | -29.0 | +0.21 | the unicycle's tyre rolls in on the floorboards (to f 713) |
| 775-897 | 0:25.83 | S6 | unicycle_wheel_loop: the tyre rolling on brick | tyre_roll_2 | -31.9 | -0.08 | the clown's wheel whirring round his tight circle, fast (slows f 843..873, to f 897) |
| 778-778 | 0:25.93 | S6 | clock_hour (own): the tower clock spins through the hour (a soft ratchet whirr, top right) | clock_1 | -25.0 | +0.50 | sets: the clock's hands spin one hour over 'So for one hour' (BEAT.soFor - 4 .. hourEnd + 6) |
| 1037-1096 | 0:34.57 | S10 | headphone_off: tinny music leaking from the lifted headphone cup | headphones_1 | -29.0 | -0.22 | he hooks one headphone cup off his ear (a tinny music leak from it until the shot ends) |
| 1096-1152 | 0:36.53 | S11 | unicycle_wheel_loop: the tyre rolling on brick | tyre_roll_1 | -33.7 | -0.49 | the clown's wheel rolling by behind the phone guy (to f 1152) |
| 1345-1452 | 0:44.83 | S14 | phone_chatter: muffled, wordless phone chatter | murmur_gib_f_1 | -32.0 | +0.09 | S14 the phone walker's muffled chatter into her call (blah-blah, under the voice) until she leaves the frame |
| 1385-1452 | 0:46.17 | S14 | headphone_music: tinny music leaking from his headphones (the floating notes) | headphones_1 | -31.0 | -0.38 | S14 tinny music leaks from the dude's headphones as he walks in (notes float off them; duck it under the voice) |
| 1524-1560 | 0:50.80 | S15 | unicycle_in: the unseen clown's wheel rolling in behind her | tyre_roll_1 | -28.5 | +0.51 | S15 the UNSEEN clown's unicycle whirrs in from the right behind her and keeps pace (wheel + pedals) |
| 1526-1575 | 0:50.87 | S15 | bubble_pop_bed: tiny muffled chatter inside the call bubble | murmur_gib_f_1 | -33.0 | -0.42 | tiny muffled chatter inside the call bubble |
| 1784-1817 | 0:59.47 | S18 | phone_chatter: muffled, wordless phone chatter | murmur_m_2 | -32.0 | +0.13 | S18 the third walker chats into his phone as he comes and goes under the bill (muffled, under the voice) |

## 4. Footsteps: 66 steps of 19 walkers
One recorded step on every frame the animators list, one shoe per walker, takes rotating, the level following the distance only (no step is accented).

| shot | walker | shoe | steps on frames | level LU | pan | worst sync f |
|---|---|---|---|---|---|---|
| Q1 | p1 | step_hard | 24, 108, 113, 118 | -29.3 .. -28.0 | -0.03 .. +0.71 | 0.00 |
| Q1 | p5 | step_hard | 29, 44, 163, 178 | -31.1 .. -28.9 | -0.20 .. -0.20 | 0.00 |
| Q1 | p2 | sneaker | 160, 176, 192 | -29.6 .. -28.7 | -0.20 .. -0.20 | 0.00 |
| Q1 | p4 | sneaker | 189, 201, 224, 236, 247, 258 | -31.0 .. -28.4 | +0.12 .. +0.82 | 0.00 |
| Q1 | p3 | step_hard | 196, 229 | -30.6 .. -29.4 | -0.20 .. -0.20 | 0.00 |
| S1 | the phone guy: a | step_hard | 429, 447, 465, 483, 501, 519 | -23.0 .. -21.5 | -0.26 .. -0.14 | 0.00 |
| S2 | hyman: a | step_hard | 570 | -32.0 .. -32.0 | -0.12 .. -0.12 | 0.00 |
| S3 | hyman: a | step_hard | 664 | -29.5 .. -29.5 | -0.72 .. -0.72 | 0.00 |
| S4 | the student: a | step_hard | 698 | -32.3 .. -32.3 | +0.31 .. +0.31 | 0.00 |
| S6 | the pink-phone blonde (s6): a | step_hard | 776, 795, 814, 833, 852, 871, 890 | -34.7 .. -33.7 | -0.59 .. +0.52 | 0.00 |
| S6 | the lime-phone man crossing near the lens (s6): a | step_hard | 837, 852, 867, 882 | -32.3 .. -31.4 | -0.85 .. +0.25 | 0.00 |
| S14 | the phone walker's brisk | sneaker | 1353, 1368, 1383, 1398 | -22.2 .. -21.6 | +0.09 .. +0.09 | 0.00 |
| S14 | the headphone dude | sneaker | 1393, 1408, 1423, 1438 | -21.0 .. -20.4 | -0.38 .. -0.38 | 0.00 |
| S15 | the hero | sneaker | 1456, 1473, 1491, 1508, 1525, 1543, 1560 | -19.8 .. -19.2 | +0.13 .. +0.13 | 0.00 |
| S16 | hyman | sneaker | 1578, 1594, 1630, 1644 | -20.6 .. -20.0 | +0.00 .. +0.00 | 0.00 |
| S17 | hyman | step_hard | 1680, 1695 | -30.6 .. -30.0 | -0.38 .. -0.38 | 0.00 |
| S18 | scarf | step_hard | 1758, 1768 | -30.0 .. -29.4 | +0.34 .. +0.34 | 0.00 |
| S18 | parka | sneaker | 1783, 1793 | -30.0 .. -29.4 | +0.22 .. +0.22 | 0.00 |
| S18 | elder | sneaker | 1797, 1810 | -30.0 .. -29.4 | +0.13 .. +0.13 | 0.00 |

## 5. The living bed
| layer | level LU | what |
|---|---|---|
| (rotation) | 0.0 | THE QUIZ RULE: the bed loop is rotated by 52.35 s so both duck windows fall on its calmest stretches (largest level rise over 60 ms in a window 13.1 dB before, 6.5 dB after) |
| square | -27.5 | the campus square: a light breeze in leaves, songbirds, a far fountain (real ambience takes, looped with long crossfades); per shot dB: Q1 +1.5, Q2 +1.0, Q3 +0.5, S6 +2.0, S12 -2.0, S16 -1.0, S17 -2.0, S18 -1.0, S19 -1.0, S20 -3.0, E1 -1.0, E2 -1.0, E3 -4.0 |
| crowd | -31.0 | a far, friendly, wordless crowd murmur (livelier in the count and the high wide, shut out under the tree); per shot dB: Q1 +2.0, Q2 +1.5, S6 +2.5, S7 +1.0, S15 -3.0, S16 -5.0, S17 -6.0, S18 -4.0, S19 -4.0, S20 -6.0 |
| room | -37.0 | the office (S2-S5): a warm quiet room tone |
| tick | -32.0 | the office wall clock: 8 soft ticks, one every 1.0 s (two real click takes: tick, tock), a little right, in the room's own reverb |

The square bed is dulled once her mind is in the call (S15, from its relight) and in the slow motion (S20), is band-limited "on tape" in E3, dips for the breath before "Did you see the money?", and is loop-safe (its last sample runs into its first). The office bed replaces it under S2-S5, crossfaded on the picture's dissolves.

## 6. Listed by the animators, not sounded (95), with the reason
| frame | shot | cue | why | the animator's note |
|---|---|---|---|---|
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p2 (white) on the call: a murmur of one side of a phone talk, 0..206 |
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p3 (hero) on the call: a murmur of one side of a phone talk, 0..284 |
| 0 | Q1 | phone_chatter_bed | too far to hear on its own (near 0.00 < 0.3): it is in the crowd bed | p4 (blue) on the call: a murmur of one side of a phone talk, 0..264 |
| 6 | Q1 | honk | the second squeeze of the frame-0 honk-honk (one event in the lead-in, over before 'Quick') | the second pump of the opening honk, still in the lead-in before 'Quick test.' (no reaction from the phone guy |
| 30 | Q1 | wink_ting | THE QUIZ RULE: no 'ting' sound anywhere in Q1 | Q1 hook: a cheeky WINK to the lens on 'Count the people' (two brow waggles): a tiny sparkle ting or a lip clic |
| 116 | Q1 | pigeon_scurry | far and quiet (tiny claws on brick, near 0.30): it is in the bed | the flock scurries in on foot from the right edge behind him (tiny claws, a coo or two; quiet) |
| 131 | Q1 | footstep | THE QUIZ RULE: it would still sound in the window of the duck at f 141 (only 3 f of room): only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p2 (white) footstep on brick + phone chatter murmur under it |
| 135 | Q1 | surprise_ping | THE QUIZ RULE: no chime or ping anywhere in Q1; his yelp and the wobble's scuff carry the take | his take on the wobble: a tiny '!' ping (surprise lines + a '!' pop over his hat) |
| 137 | Q1 | laugh_far | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 141: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | the pair stop on the far right and one points at the clown, both laughing (far, quiet) |
| 141 | Q1 | duck_SILENT | THE QUIZ RULE: the two ducks of the count are silent | DUCK 1: a phone person dips under bill 2 (feet only, NO accent, no swish: nothing points at the money) |
| 145 | Q1 | footstep | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 141: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p2 (white) footstep on brick + phone chatter murmur under it |
| 146 | Q1 | cheek_puff | a look (his puffed cheeks): the 'phew' 5 frames later carries it | after the wobble-save: he puffs his cheeks (relief)... |
| 158 | Q1 | dog_bark_far | over the budget of 150 events (lowest priority first) | FAR background: the dog walker's dog lunges at the scattering pigeons, the lead snaps taut (one far bark, very |
| 159 | Q1 | surprise_ping | THE QUIZ RULE: no chime or ping anywhere in Q1; his yelp and the wobble's scuff carry the take | his take on the pigeon flock: a tiny '!' ping |
| 203 | Q1 | sly_hmm | 'a tiny heh or nothing': nothing (it sits 8 frames before duck 2's window) | MISCHIEF before the pigeon honk: a sly side-eye at the re-landed birds (a tiny 'heh' or nothing) |
| 207 | Q1 | footstep | THE QUIZ RULE: it would still sound in the window of the duck at f 217 (only 3 f of room): only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p3 (hero) footstep on brick + phone chatter murmur under it |
| 212 | Q1 | footstep | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 217: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p4 (blue) footstep on brick + phone chatter murmur under it |
| 216 | Q1 | footstep | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 217: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there | p3 (hero) footstep on brick + phone chatter murmur under it |
| 217 | Q1 | duck_SILENT | THE QUIZ RULE: the two ducks of the count are silent | DUCK 2: a phone person dips under bill 2 (feet only, NO accent, no swish: nothing points at the money) |
| 371 | Q3 | whoosh_small | over the budget of 150 events (lowest priority first) | Q3: the wave's arm rises (a soft cloth swish) |
| 421 | S1 | pigeon_flush | over the budget of 150 events (lowest priority first) | a pigeon flaps up from the ground |
| 430 | S1 | pigeon_flush | thinned: under 24 f after the last kept 'pigeon_flush' | a pigeon flaps up from the ground |
| 454 | S1 | bike_pass | too far to hear on its own (near 0.11 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 459 | S1 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 472 | S1 | skateboard_pass | too far to hear on its own (near 0.09 < 0.3): it is in the crowd bed | a skateboarder rolls through the background |
| 475 | S1 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 488 | S1 | laugh | held back: 2 f from 'bell_ring' (higher priority) | the phone guy laughs |
| 488 | S1 | laugh | thinned: under 30 f after the last kept 'laugh' | the clown laughs |
| 490 | S1 | honk | held back: 0 f from 'bell_ring' (higher priority) | the clown squeezes his bulb horn |
| 511 | S1 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 590 | S2 | marker_jab | over the budget of 150 events (lowest priority first) | he jabs the marker at the title (a small air whoosh) |
| 597 | S2 | marker_jab | held back: 0 f from 'paper_rustle' (higher priority) | the second jab |
| 652 | S2 | door_swing | inside door_latch's take (the latch, then the creak of the swing) | the door swings open into the room (a soft creak) |
| 660 | S3 | door_stop | over the budget of 150 events (lowest priority first) | the door bumps its stop |
| 767 | S5 | hands_rub | over the budget of 150 events (lowest priority first) | Hyman rubs his fists in glee (to the cut) |
| 775 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 783 | S6 | pigeon_flush | over the budget of 150 events (lowest priority first) | a pigeon flaps up from the ground |
| 798 | S6 | pigeon_flush | thinned: under 24 f after the last kept 'pigeon_flush' | a pigeon flaps up from the ground |
| 799 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 823 | S6 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 832 | S6 | bike_pass | too far to hear on its own (near 0.11 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 843 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 844 | S6 | pigeon_flush | too far to hear on its own (near 0.19 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 859 | S6 | laugh | thinned: at most 1 'laugh' in a shot | the pink-phone blonde (S6) laughs |
| 860 | S6 | hand_clap | held back: 2 f from 'honk' (higher priority) | the beret woman claps for him: the hands meet on this frame |
| 870 | S6 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 871 | S6 | skateboard_pass | too far to hear on its own (near 0.11 < 0.3): it is in the crowd bed | a skateboarder rolls through the background |
| 876 | S6 | hand_clap | held back: 0 f from 'juggle_loop' (higher priority) | the beret woman claps for him: the hands meet on this frame |
| 885 | S6 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 887 | S6 | frisbee_throw | about 40 m away in the high wide (near 0.05): under the bed's level | a frisbee whooshes across |
| 927 | S7 | bike_pass | too far to hear on its own (near 0.08 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 945 | S8 | laugh | a second voice under a character's line (the dialogue stays clean) | friend B (pink) laughs |
| 954 | S8 | pigeon_flush | over the budget of 150 events (lowest priority first) | a pigeon flaps up from the ground |
| 982 | S8 | bike_pass | too far to hear on its own (near 0.18 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 986 | S9 | whip_pan | held back: 3 f from 'hand_clap' (higher priority) | a whip-pan WHOOSH across the cut S8 -> S9 (peaks on f 986) |
| 992 | S9 | snap_zoom | the 4 f punch-in lands ON a character's word ('amazing!', 'guy!'): no sound over it | a 4 f snap punch-in on "amazing!" (a short zoom whoosh / pop) |
| 999 | S9 | laugh | a second voice under a character's line (the dialogue stays clean) | friend A (denim) laughs |
| 1013 | S9 | laugh | a second voice under a character's line (the dialogue stays clean) | friend B (pink) laughs |
| 1028 | S10 | whip_pan | held back: 3 f from 'hand_clap' (higher priority) | a whip-pan WHOOSH across the cut S9 -> S10 (peaks on f 1028) |
| 1054 | S10 | thumb_jab | over the budget of 150 events (lowest priority first) | his thumb jerks back at the clown (a small whoosh) |
| 1075 | S10 | pigeon_flush | too far to hear on its own (near 0.17 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 1077 | S10 | thumb_jab | over the budget of 150 events (lowest priority first) | the second jerk of the thumb |
| 1077 | S10 | snap_zoom | the 4 f punch-in lands ON a character's word ('amazing!', 'guy!'): no sound over it | a 4 f snap punch-in on "guy!" (a short zoom whoosh / pop) |
| 1083 | S10 | skateboard_pass | too far to hear on its own (near 0.14 < 0.3): it is in the crowd bed | a skateboarder rolls through the background |
| 1085 | S10 | pigeon_flush | too far to hear on its own (near 0.19 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 1090 | S10 | pigeon_flush | too far to hear on its own (near 0.19 < 0.2): it is in the crowd bed | a pigeon flaps up from the ground |
| 1107 | S11 | pigeon_flush | over the budget of 150 events (lowest priority first) | a pigeon flaps up from the ground |
| 1120 | S11 | squint | carried by the '?' pop one frame later | the phone guy squints left-right (a tiny comic 'hmm?' eye dart, to f 1135) |
| 1124 | S11 | glance | 'a tiny chair creak / nothing': nothing | the team member glances at the clown (a tiny chair creak / nothing) |
| 1151 | S11 | pigeon_flush | thinned: at most 1 'pigeon_flush' in a shot | a pigeon flaps up from the ground |
| 1151 | S11 | bike_pass | too far to hear on its own (near 0.06 < 0.3): it is in the crowd bed | a cyclist rides through the background (freewheel tick, a ding) |
| 1161 | S12 | pencil_scribble | thinned: under 20 f after the last kept 'pencil_scribble' | S12 her pencil quickly draws phone person 2 (head, body, legs, arms, the phone: one fast scribble, 9 f) |
| 1185 | S12 | pencil_scribble | thinned: under 20 f after the last kept 'pencil_scribble' | S12 her pencil quickly draws phone person 4 (head, body, legs, arms, the phone: one fast scribble, 9 f) |
| 1299 | S13 | pigeon_flush | held back: 2 f from 'honk' (higher priority) | S13 the pigeons by the clown's wheel flush on the honk |
| 1313 | S13 | eye_pop | held back: 1 f from 'jaw_drop' (higher priority) | S13 the clown's eyes POP (finally seen!): a cartoon 'boing' / eye-pop squeak |
| 1317 | S13 | hop | over the budget of 150 events (lowest priority first) | S13 the clown hops his unicycle for joy, both arms up (a springy boing + wheel creak; lands ~10 f later) |
| 1317 | S13 | cheer | his silent cheer, 'under the voice': the hop's boing and the two honks carry his joy | S13 the clown's ecstatic silent cheer (a tiny 'woo!' breath or kazoo flourish, under the voice) |
| 1327 | S13 | land | held back: 1 f from 'honk' (higher priority) | S13 the unicycle lands (tyre thump, a squeak) |
| 1347 | S14 | wave | a wave: no sound | S14 the clown waves big at the phone walker as she comes (cloth flap) |
| 1387 | S14 | pigeon_flush | held back: 2 f from 'unicycle_off' (higher priority) | S14 pigeons in the dude's path flutter aside |
| 1406 | S14 | notice | a look: no sound | S14 the dude spots the clown: a 'whoa' take, a '!' pops (a short comic 'whup' / record scratch of the music) |
| 1417 | S14 | wave | a wave: no sound | S14 the dude raises his hand and waves big at the clown on 'noticed' |
| 1431 | S14 | hop | over the budget of 150 events (lowest priority first) | S14 the clown hops his unicycle for joy, both arms up (springy boing; lands ~10 f later) |
| 1444 | S14 | wave_back | a wave: no sound | S14 the clown waves back at the dude (cloth flap) |
| 1478 | S15 | signal_on | carried by the mind's rising sweep 6 frames later | S15 the wavy phone-signal line draws out toward the bubble |
| 1555 | S15 | bubble_laugh | held back: 1 f from 'give_up' (higher priority) | S15 inside the bubble: she and her mum laugh (tiny, muffled, warm) |
| 1579 | S16 | pigeon_strut | tiny claw taps under 'So Hyman tried something sneakier.': too small to hear; his own tiptoes carry the rhythm | S16 a pigeon tiptoes after Hyman, copying him (tiny claw taps on his rhythm; it freezes when he freezes) |
| 1583 | S16 | sly_look | a look: no sound | S16 Hyman glances left |
| 1633 | S16 | brow_waggle | a look: no sound | S16 the bills come back out: smug brow waggle, he sneaks on |
| 1912 | S19 | giggle | the breath before 'Their bodies dodged it.' stays silent (it would start in it or be cut by it) | S19 she giggles, hunched with glee, holding the money (a tiny delighted giggle, no words) |
| 1920 | S19 | bill_tug | the breath before 'Their bodies dodged it.' stays silent (it would start in it or be cut by it) | S19 she tugs the bill (second tug: paper flap, the peg creaks) |
| 1967 | S20 | rise_slow | over the budget of 150 events (lowest priority first) | S20 she rises out of the dip and walks on, still chatting (cloth rustle, slowed) |
| 1984 | S20 | bubble_swell | held back: 2 f from 'bubble_laugh' (higher priority) | S20 the call bubble swells and drifts in as the lens rises (a soft warm swell, slowed) |
| 1993 | S20 | bubble_laugh | thinned: under 30 f after the last kept 'bubble_laugh' | S20 the mind laughs again on 'minds' (oblivious) |
| 2007 | S20 | petal_land | over the budget of 150 events (lowest priority first) | S20 a petal lands on her nose on 'never saw it'; she does not blink (a tiny soft tick) |

## 7. Unmapped cue names (0 cues)
None: every cue name in the three files has an entry in `sfx.py MAP`.

## 8. Measurements of the mix
| check | target | measured | |
|---|---|---|---|
| length | 2246 f = 3593600 samples | 3593600 samples | pass |
| integrated loudness | -14 LUFS +-0.5 | -14.01 LUFS | pass |
| true peak | <= -2 dBTP | -2.90 dBTP | pass |
| loudness range | (report) | 3.5 LU; momentary max -7.7, short-term max -12.3 LUFS | |
| limiter | (report) | max gain reduction 1.78 dB, over 0.5 dB for 3.48 % of the film | |
| stems | (report) | voice -13.8, score -30.4, effects -33.3, bed -41.7 LUFS | |
| score | one master gain | +0.27 dB on `music_v2.wav` (it follows the voice chain's own level change; no per-section levelling) | |
| speech margin, every word (1-4 kHz, voice over everything else) | >= 7 dB | lowest 7.6 dB of 182 words | pass |
| character lines vs narrator (same margin) | as clear | characters: median 24.4 dB, lowest 14.1 dB (24 words); narrator: median 16.0 dB, lowest 7.6 dB | pass |
| sync direction | every cue -1 .. +2 f | 219 picture-synced cues: +0.00 .. +0.16 f; 0 outside | pass |
| mono fold-down | small loss | -0.01 LU (side is -25.9 dB under mid) | pass |
| phone speaker (400 Hz high-pass) | (report) | the mix loses 2.78 LU (voice 2.8, score 5.1, effects 0.8, bed 3.3 LU): the voice keeps its lead | |
| loop seam: sample jump | no click | 0.01149 (typical step near the end 0.03327, near the start 0.10804) | pass |
| loop seam: last 0.3 s into first 0.3 s | (report) | mix -30.7 -> -22.8 dBFS; voice -140.0 -> -140.0; music -32.2 -> -31.0; sfx -36.7 -> -23.5; amb -47.5 -> -38.2 | |

ffmpeg ebur128 on `mix.wav` (cross-check):
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.2 LUFS
  Loudness range:
    LRA:         3.5 LU
    Threshold: -34.3 LUFS
    LRA low:   -16.9 LUFS
    LRA high:  -13.3 LUFS
  True peak:
    Peak:       -2.9 dBFS
```
The eight words with the lowest speech margin: "the" @ 45.03 s 7.6 dB, "to" @ 44.01 s 7.6 dB, "who" @ 51.38 s 7.6 dB, "for" @ 26.16 s 7.8 dB, "for" @ 63.20 s 7.9 dB, "the" @ 28.59 s 8.0 dB, "lose" @ 5.75 s 8.0 dB, "Only" @ 61.40 s 8.0 dB.
Words whose bed was dipped to reach the margin: "a" @ 1.91 s (read 7.1 dB, beds' 1-4 kHz -1.4 dB), "lose" @ 5.75 s (read 5.1 dB, beds' 1-4 kHz -3.4 dB), "most" @ 15.12 s (read 2.4 dB, beds' 1-4 kHz -6.1 dB), "people" @ 15.45 s (read 6.7 dB, beds' 1-4 kHz -1.8 dB), "a" @ 21.98 s (read -0.4 dB, beds' 1-4 kHz -8.9 dB), "only" @ 40.03 s (read 7.1 dB, beds' 1-4 kHz -1.4 dB), "to" @ 44.01 s (read -1.0 dB, beds' 1-4 kHz -9.5 dB), "the" @ 45.03 s (read -0.1 dB, beds' 1-4 kHz -8.6 dB), "weird" @ 45.23 s (read 4.7 dB, beds' 1-4 kHz -3.8 dB), "listening" @ 46.45 s (read 6.7 dB, beds' 1-4 kHz -1.8 dB), "noticed" @ 47.51 s (read 3.5 dB, beds' 1-4 kHz -5.0 dB), "him." @ 47.92 s (read 3.8 dB, beds' 1-4 kHz -4.7 dB), "pulls" @ 49.52 s (read 4.6 dB, beds' 1-4 kHz -3.9 dB), "who" @ 51.38 s (read -1.5 dB, beds' 1-4 kHz -10.0 dB), "isn't" @ 51.55 s (read 6.7 dB, beds' 1-4 kHz -1.8 dB), "it." @ 60.16 s (read 6.4 dB, beds' 1-4 kHz -2.1 dB), "a" @ 60.70 s (read -1.1 dB, beds' 1-4 kHz -9.6 dB), "for" @ 63.20 s (read 2.8 dB, beds' 1-4 kHz -5.7 dB), "it." @ 65.67 s (read 6.4 dB, beds' 1-4 kHz -2.1 dB), "phones." @ 69.68 s (read 3.8 dB, beds' 1-4 kHz -4.7 dB).

Voice lines after the leveller (loudness of each line; the narrator's median line is the reference):

| line | speaker | time | before LUFS | gain dB | after LUFS | text |
|---|---|---|---|---|---|---|
| n01 | N | 0.34-2.39 | -18.1 | +0.4 | -17.7 | Quick test. Count the people on a phone. |
| n02 | N | 5.39-6.48 | -18.7 | +0.7 | -18.1 | Don't lose count. |
| n03 | N | 9.39-9.88 | -18.4 | +0.5 | -17.9 | How many? |
| n04 | N | 10.28-10.96 | -20.2 | +2.4 | -18.4 | Five. |
| n05 | N | 11.41-13.45 | -18.0 | +0.3 | -17.8 | And the clown? You saw him, right? |
| n06 | N | 13.59-17.43 | -17.4 | +0.0 | -17.4 | In a real experiment, most people on a phone call never saw  |
| n07 | N | 17.59-22.82 | -17.3 | +0.0 | -17.3 | Psychologist Ira Hyman needed a distraction nobody could mis |
| s01 | STUDENT | 22.96-24.27 | -16.9 | +0.0 | -17.1 | I own a unicycle. |
| s02 | STUDENT | 24.52-25.58 | -17.6 | +0.7 | -17.3 | ...and a clown suit. |
| n08 | N | 25.74-29.64 | -17.4 | +0.0 | -17.4 | So for one hour, the clown rode circles in the middle of cam |
| i01 | INTERVIEWER | 29.80-31.39 | -17.4 | +0.5 | -16.9 | Did you see anything unusual? |
| f01 | FRIEND | 31.80-34.06 | -17.4 | +0.5 | -17.0 | The clown? He was amazing! |
| h01 | HEADPHONES | 34.17-36.34 | -17.1 | +0.0 | -17.1 | Dude, the unicycle guy! |
| p01 | PHONE_GUY | 36.45-38.17 | -19.4 | +2.3 | -17.8 | Sorry... what clown? |
| n10 | N | 38.31-42.73 | -17.1 | +0.0 | -17.1 | Even asked straight out, only {1/one} in {4/four} people on  |
| n11 | N | 42.88-44.52 | -17.1 | +0.0 | -17.1 | Many spun around to look. |
| n12 | N | 44.69-48.16 | -17.4 | +0.0 | -17.4 | Here's the weird part: people listening to music noticed him |
| n13 | N | 48.31-52.26 | -17.2 | +0.0 | -17.2 | You see, a call pulls your mind toward someone who isn't the |
| n14 | N | 52.41-58.20 | -17.4 | +0.0 | -17.4 | So Hyman tried something sneakier. He hung dollar bills on a |
| n15 | N | 58.36-60.31 | -17.4 | +0.0 | -17.4 | Nearly everyone ducked under it. |
| n16 | N | 60.48-63.81 | -17.6 | +0.0 | -17.7 | On a phone? Only {6/six} in {100/a hundred} stopped for the  |
| n17 | N | 64.32-67.94 | -16.9 | +0.0 | -17.1 | Their bodies dodged it. Their minds never saw it. |
| n18 | N | 68.44-71.58 | -17.6 | +0.0 | -17.6 | You counted five phones. You saw the clown. |
| n19 | N | 71.93-74.08 | -16.1 | +1.4 | -14.7 | Did you see the money? |

## 9. Proof for the quiz hard rule
The two ducks of the count are at film frames 141, 217 (EDIT_V2 section 5: 1/3 and 2/3 of the count window). Round each one lies a window of +-6 frames (0.4 s). The rule, as `sfx.py hard_rule()` enforces it (the mix stops if it is broken):
- In all of Q1 there is no sound of the classes bill, chime, cloth, ding, duck, glint, leaf, peg, ping, rustle, shimmer, sparkle, swish, ting, whoosh.
- Inside a window no sound may come from the ducker or from anyone else on the square (no cloth, step, rustle, paper, chime, laugh or murmur): such a sound never starts in a window; one that starts before it is cut so that it has ended before the window, or is not sounded when there is no room; and that whole bus is gated to digital silence inside the window.
- The lead's rule of 2026-11-18: the ONLY sounds allowed inside a window are the clown's, the pigeons' and the dog's (bell_ring, brake_skid, clown_wobble, clown_yelp, dog_yap, honk, pigeon_flush, pigeon_land, pigeon_leave, pigeon_scatter, tyre_land), and only when panned at +0.10 or further right. They happen on the right of the frame, away from the money (upper-left): fair misdirection away from the bills. They keep their normal level (set by `near`), never boosted.
- Nothing in Q1 sits further left than pan -0.20 (the bills are upper-left); the animators' pans are clamped there.

Measured in the written stems:

Levels are K-weighted (as loudness is heard). Each window is read against every other window of the same length in Q1 ("louder than x %": 50 % = an ordinary moment of the count, near 100 % would be an accent). "Rise" = the largest climb of the 30 ms level over 60 ms inside the window (a new sound starting shows as a large rise), again against the other windows. The score is read BEFORE its dips under the words (they lower the narrated stretches and would make the unspoken count look loud), and against the same slice of its groove two beats earlier and later.

| duck frame | window | everything but the clown / pigeons / dog | the clown's / pigeons' / dog's sounds heard in the window | their L-R | bed level (Q1 p10 / median / p90) | bed louder than | bed rise (above x % of windows) | bed L-R (all Q1) | score level (Q1 p10 / median / p90) | score louder than | same slice two beats before / after | score L-R (all Q1) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 141 | 135-147 | peak 0.0000000 (digital silence) | clown_wobble from f 132 (pan +0.34, -24.0 LU) | -4.8 dB (leans right) | -41.0 dB (-43.9 / -41.0 / -39.7) | 50 % | 3.8 dB (54 %) | -0.14 dB (-0.02) | -26.0 dB (-37.8 / -28.6 / -24.0) | 74 % | -24.4 / -25.7 dB | +0.33 dB (-0.46) |
| 217 | 211-223 | peak 0.0000000 (digital silence) | honk from f 215 (pan +0.42, -17.0 LU); pigeon_flush from f 220 (pan +0.59, -19.0 LU) | -7.6 dB (leans right) | -40.6 dB (-43.9 / -41.0 / -39.7) | 62 % | 2.3 dB (6 %) | +0.32 dB (-0.02) | -23.0 dB (-37.9 / -28.8 / -24.7) | 96 % | -24.7 / -22.2 dB | -0.47 dB (-0.46) |

Read with care: at the duck at f 217 the score is louder than 96 % of Q1's windows. That is the score's own build (every bar of the count is a little louder than the one before, toward "How many?"), not an accent on the duck: the same slice of the groove two beats earlier reads -24.7 dB and two beats later -22.2 dB, with this window (-23.0 dB) between or beside them. Only an ear can say whether the build itself draws attention there.

Every animator cue within 20 frames of a duck, and what became of it:

| frame | cue | status | reason |
|---|---|---|---|
| 121 | honk | play | sounded (it lies outside both windows) |
| 123 | pigeon_leave | play | sounded (it lies outside both windows) |
| 131 | footstep | rule | THE QUIZ RULE: it would still sound in the window of the duck at f 141 (only 3 f of room): only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 132 | clown_wobble | play | sounded (it lies outside both windows) |
| 135 | surprise_ping | silent | THE QUIZ RULE: no chime or ping anywhere in Q1; his yelp and the wobble's scuff carry the take |
| 137 | laugh_far | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 141: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 141 | duck_SILENT | silent | THE QUIZ RULE: the two ducks of the count are silent |
| 145 | footstep | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 141: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 146 | cheek_puff | silent | a look (his puffed cheeks): the 'phew' 5 frames later carries it |
| 151 | phew_blow | play | sounded (it lies outside both windows) |
| 157 | pigeon_scatter | play | sounded (it lies outside both windows) |
| 158 | dog_bark_far | thin | over the budget of 150 events (lowest priority first) |
| 159 | clown_yelp | play | sounded (it lies outside both windows) |
| 159 | surprise_ping | silent | THE QUIZ RULE: no chime or ping anywhere in Q1; his yelp and the wobble's scuff carry the take |
| 160 | footstep | step | sounded (it lies outside both windows) |
| 201 | footstep | step | sounded (it lies outside both windows) |
| 203 | sly_hmm | silent | 'a tiny heh or nothing': nothing (it sits 8 frames before duck 2's window) |
| 207 | footstep | rule | THE QUIZ RULE: it would still sound in the window of the duck at f 217 (only 3 f of room): only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 212 | footstep | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 217: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 215 | honk | play | sounded (it lies outside both windows) |
| 216 | footstep | rule | THE QUIZ RULE: inside the window (+-6 f) of the duck at f 217: only the clown, the pigeons or the dog, panned at +0.10 or further right, may sound there |
| 217 | duck_SILENT | silent | THE QUIZ RULE: the two ducks of the count are silent |
| 220 | pigeon_flush | play | sounded (it lies outside both windows) |
| 224 | honk | play | sounded (it lies outside both windows) |
| 224 | footstep | step | sounded (it lies outside both windows) |
| 229 | footstep | step | sounded (it lies outside both windows) |
| 236 | footstep | step | sounded (it lies outside both windows) |

The bed and the score are continuous through both windows. The bed is a seamless loop of real ambience (it has bird calls in it): it is ROTATED so that both windows fall on its calmest stretches (section 5). The score was changed for this rule in phase B (`music.py`): in the first version both ducks fell on a bar line (the harmony's step, a louder bar, a celesta spark, and the second clarinet phrase's entry). The bars now start on beats 2, 6, 10 and 14, so every step falls between the ducks; no spark and no phrase note starts in a window; the ostinato is spread evenly left and right. Only the steady pulse (pizzicato 8ths, the bass every two beats, the clock, the shaker) runs through.

## 10. Five timestamps for the owner's headphones
1. **0:00.00 - 0:13.43, the hook and the count.** Is the frame-0 honk-honk (two squeezes in the 0.34 s before "Quick test.") heard, from a cold start and on the loop? After "phone." does the count stay alive (score and effects lifted, flat, from "phone." to "How many?")? The pigeons (0:05.23, 0:06.10, 0:07.33): flaps now, or still thumps? At the two ducks, 0:04.70 and 0:07.23: does anything point at the bills? The ding on the big 5 at 0:10.40; the wave honk on "right?".
2. **0:13.70 - 0:25.83, S1 and the office.** In S1 count the honks (three single squeezes) and hear the bell; then the office gags (the crumpled note, its tock on the board, the door), and the reveal: zip, the bag flung open with the score's comic hit ON the opening (0:25.00), confetti, the suit's boing, sparkles, the light-bulb ping on Hyman. Busy or funny? Is "clown suit." still clear?
3. **0:29.80 - 0:44.53, the interviews and "Many spun around to look."** The claps under "He was amazing!", the '?' and '!' pops, the restored line's spin with the score leaving its D floor for one bar.
4. **0:53.13 - 1:04.33, the money and the breath.** Hyman's jogger, freeze and whistle; the peg's snap; the three ducks (two steps each now); the stopper's swat; then does everything stop dead after "...stopped for the money.", with 0.5 s of real silence before "Their bodies dodged it."?
5. **1:04.43 - 1:14.87, the ending.** The near-silent mind-blow line, the five rising pips from 1:08.27, the hard cut into the tape rewind in the hush (1:11.63), the hold: a soft freeze hit at 1:13.20 and the glint as the ring completes (1:13.47), nothing but the score's swell over "money?", the short rewind to the seam and the stop on the last sample (then the loop: the honk-honk of frame 0).

## 11. What only an ear can judge
- Whether the generated effects sound real in context (the door, the zip, the dog, the laughs and gasps are ElevenLabs generations that were only measured).
- Whether the horn on A sits well against the score in every section, and whether the count feels lively rather than busy.
- Whether the VCR whirr under "Did you see the money?" reads as a tape rewind, and whether the freeze hit and glint are soft enough.
- Whether the character lines sit in the same space as the narrator (they are levelled, not re-recorded).
- p3: whether the synthesized polish effects (the juggling pats, the '?' / '!' pops, the twinkles, the light-bulb ping, the whistle, the dust puff) sound like cartoon effects or like test tones; whether the new pigeon, sneaker, scuff, confetti and crumple generations sound real in context.
- p3: whether the S5 reveal (zip, fling + the score's hit, confetti, boing, sparkle, ping in 0.37 s under the student's "clown") reads as one funny burst or as clutter.

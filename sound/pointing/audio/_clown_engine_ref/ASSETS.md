# The real-effects library of "The Clown Nobody Saw"

Written by `assets_list.py` from `samples_measured.json` (`el_measure.py`), the generation logs and the CC0 source list. Nothing here was listened to: every number is a measurement. `samples.py` plays these through `sfx.smp()`, `sfx.honk_gen()`, `sfx.mix_parts()` and `samples.step_track()`; a take marked NOT USED is skipped automatically (`samples_reject.json`; add your own after listening under `manual`).

Sources: **CC0** = a Creative Commons 0 recording copied from the sound-effects reference library into `_lib/` (author and link in the table and in `CREDITS.txt`; no credit required). **EL** = an ElevenLabs sound-effect generation made for this film (`_el/`; SFX only, never voice; 10 credits per second). The files are 48 kHz mono 24-bit wav (decoded with 3 / 6 dB of headroom); the engine normalises each to its own peak, so 'file peak' only tells how quiet the source came back.

Columns: length of the file; pieces = how many single events `samples.py` cuts out of it (steps, strokes, squeezes); onset = where the sound starts in the file (the engine lands the ONSET, or the peak of a whoosh, on the picture frame, not the start of the file); centroid = spectral centre; top3 = share of the energy in the three strongest partials (a bare oscillator is ~0.95+, a recorded noise-like sound under 0.3).

## `step_soft`: one step, soft rubber-soled sneakers on brick
Usable takes right now: **41** (cut into single events by onset).

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `step_soft_1` | 4.00 | 10 | EL: "Footsteps of one person in soft rubber-soled sneakers walking at a relaxed pace on outdoor brick paving, eight..." | 40 | -19.2 | 284 | 436 | 0.16 | ok; events 62 dB clear of each other; recogniser hears: nothing (only its stock phrase for non-speech audio) |
| `step_soft_2` | 4.00 | 12 | EL: "Footsteps of one person in soft rubber-soled sneakers walking at a relaxed pace on outdoor brick paving, eight..." | 40 | -19.6 | 56 | 320 | 0.36 | ok; events 52 dB clear of each other; recogniser hears: nothing (only its stock phrase for non-speech audio) |
| `step_soft_3` | 4.00 | 19 | EL: "Footsteps of one person in soft rubber-soled sneakers walking at a relaxed pace on outdoor brick paving, eight..." | 40 | -20.6 | 2 | 412 | 0.16 | ok; events 22 dB clear of each other; recogniser hears: nothing (only its stock phrase for non-speech audio) |

## `step_hard`: one step, hard leather soles on brick
Usable takes right now: **22** (cut into single events by onset).

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `step_hard_1` | 4.00 | 9 | EL: "Footsteps of one person in hard leather-soled shoes walking briskly on outdoor brick pavement, eight clear sep..." | 40 | -14.2 | 49 | 476 | 0.13 | ok; events 58 dB clear of each other; recogniser hears: nothing (only its stock phrase for non-speech audio) |
| `step_hard_2` | 4.00 | 8 | EL: "Footsteps of one person in hard leather-soled shoes walking briskly on outdoor brick pavement, eight clear sep..." | 40 | -12.3 | 193 | 838 | 0.09 | ok; events 66 dB clear of each other; recogniser hears: nothing |
| `step_hard_3` | 4.00 | 5 | EL: "Footsteps of one person in hard leather-soled shoes walking briskly on outdoor brick pavement, eight clear sep..." | 40 | -12.7 | 66 | 579 | 0.08 | ok; events 68 dB clear of each other; recogniser hears: nothing |

## `step_slow`: one slow strolling step, canvas shoes on brick
Usable takes right now: **23** (cut into single events by onset).

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `step_slow_1` | 4.00 | 15 | EL: "Slow strolling footsteps of one person in canvas shoes on brick paving, six separate steps with long gaps, clo..." | 40 | -15.1 | 181 | 196 | 0.28 | ok; events 37 dB clear of each other; recogniser hears: nothing (only its stock phrase for non-speech audio) |
| `step_slow_2` | 4.00 | 8 | EL: "Slow strolling footsteps of one person in canvas shoes on brick paving, six separate steps with long gaps, clo..." | 40 | -10.4 | 626 | 154 | 0.33 | ok; events 65 dB clear of each other; recogniser hears: nothing (only its stock phrase for non-speech audio) |

## `pencil_tick`: one pencil check mark (stroke + flick)
Usable takes right now: **55** (cut into single events by onset).

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `pencil_ticks_1` | 3.00 | 19 | EL: "A pencil making seven quick separate check marks on paper on a wooden clipboard, small gaps between the stroke..." | 30 | -28.2 | 3 | 7752 | 0.08 | ok; events 19 dB clear of each other |
| `pencil_ticks_2` | 3.00 | 17 | EL: "A pencil making seven quick separate check marks on paper on a wooden clipboard, small gaps between the stroke..." | 30 | -29.0 | 2 | 6033 | 0.08 | ok; events 17 dB clear of each other |
| `pencil_ticks_3` | 3.00 | 19 | EL: "A pencil making seven quick separate check marks on paper on a wooden clipboard, small gaps between the stroke..." | 30 | -27.2 | 39 | 5908 | 0.04 | ok; events 18 dB clear of each other |

## `pencil_cross`: one pencil stroke of an X
Usable takes right now: **27** (cut into single events by onset).

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `pencil_cross_1` | 2.00 | 9 | EL: "A pencil drawing three quick X marks on paper on a clipboard, each X is two short strokes, very close micropho..." | 20 | -21.4 | 135 | 9157 | 0.03 | ok; events 23 dB clear of each other |
| `pencil_cross_2` | 2.00 | 7 | EL: "A pencil drawing three quick X marks on paper on a clipboard, each X is two short strokes, very close micropho..." | 20 | -18.3 | 217 | 10126 | 0.01 | ok; events 19 dB clear of each other |
| `pencil_cross_3` | 2.00 | 11 | EL: "A pencil drawing three quick X marks on paper on a clipboard, each X is two short strokes, very close micropho..." | 20 | -19.2 | 15 | 9056 | 0.04 | ok; events 21 dB clear of each other |

## `pencil_one`: one firm single check mark
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `pencil_one_1` | 1.00 | 1 | EL: "One firm pencil check mark drawn on paper on a clipboard, a single stroke with a flick, very close microphone,..." | 10 | -21.3 | 89 | 6846 | 0.06 | ok |
| `pencil_one_2` | 1.00 | 1 | EL: "One firm pencil check mark drawn on paper on a clipboard, a single stroke with a flick, very close microphone,..." | 10 | -10.6 | 5 | 7270 | 0.04 | ok |

## `page_slide`: a page / card sliding in (CC0 swipe, then two generated slide-and-tap takes)
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-702773-swipe-wav` | 0.84 | 1 | CC0, LilMati ([source](https://freesound.org/people/LilMati/sounds/702773/)) | 0 | -10.3 | 2 | 4020 | 0.17 | ok |
| `page_slide_1` | 1.00 | 1 | EL: "A sheet of paper on a clipboard slides quickly in and lands with one soft tap on a table, close microphone, dr..." | 10 | -10.9 | 68 | 6349 | 0.01 | ok |
| `page_slide_2` | 1.00 | 1 | EL: "A sheet of paper on a clipboard slides quickly in and lands with one soft tap on a table, close microphone, dr..." | 10 | -15.2 | 26 | 6124 | 0.01 | ok |

## `page_land`: a page / card landing: a soft knock
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs745291` | 0.26 | 1 | CC0, SamsterBirdies ([source](https://freesound.org/people/SamsterBirdies/sounds/745291/)) | 0 | -9.9 | 2 | 1126 | 0.22 | ok |

## `peg`: a wooden clothes peg snapping shut
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `peg_3` | 0.48 | 1 | EL: "One wooden clothespin snapping shut, a small sharp wooden click with a tiny spring ring, very close microphone..." | 5 | -2.0 | 68 | 3354 | 0.05 | ok |
| `peg_2` | 0.48 | 1 | EL: "One wooden clothespin snapping shut, a small sharp wooden click with a tiny spring ring, very close microphone..." | 5 | -3.3 | 24 | 2874 | 0.07 | ok |
| `peg_1` | 0.48 | 0 | EL: "One wooden clothespin snapping shut, a small sharp wooden click with a tiny spring ring, very close microphone..." | 5 | -55.4 | 1 | 2400 | 0.27 | NOT USED: near-silent file (peak -55.4 dBFS): no real event, poor signal-to-noise |

## `bill_flick`: one paper banknote flapping once
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `bill_flick_1` | 1.00 | 1 | EL: "A single paper banknote flapping once as it swings on a clip, one short crisp paper flick, close microphone, d..." | 10 | -11.8 | 94 | 1709 | 0.05 | ok |
| `bill_flick_2` | 1.00 | 1 | EL: "A single paper banknote flapping once as it swings on a clip, one short crisp paper flick, close microphone, d..." | 10 | -7.3 | 141 | 2276 | 0.06 | ok |
| `bill_flick_3` | 1.00 | 1 | EL: "A single paper banknote flapping once as it swings on a clip, one short crisp paper flick, close microphone, d..." | 10 | -9.2 | 14 | 3189 | 0.03 | ok |

## `bills_bed`: banknotes fluttering gently (a loopable bed)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `bills_bed_1` | 5.00 | 1 | EL: "Three paper banknotes fluttering gently in a light breeze, soft crisp paper rustle, steady and quiet, close mi..." | 50 | -28.8 | 1511 | 3736 | 0.03 | ok; recogniser hears: nothing (only its stock phrase for non-speech audio) |
| `bills_bed_2` | 5.00 | 1 | EL: "Three paper banknotes fluttering gently in a light breeze, soft crisp paper rustle, steady and quiet, close mi..." | 50 | -15.8 | 2518 | 2550 | 0.03 | ok; recogniser hears: nothing (only its stock phrase for non-speech audio) |

## `bill_hair`: paper dragging slowly through hair
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `bill_hair_1` | 1.48 | 1 | EL: "A sheet of paper dragging slowly across long hair, soft and close, slow, dry, no background noise, no voices" | 15 | -37.9 | 11 | 6534 | 0.01 | ok |
| `bill_hair_2` | 1.48 | 1 | EL: "A sheet of paper dragging slowly across long hair, soft and close, slow, dry, no background noise, no voices" | 15 | -31.0 | 8 | 6489 | 0.01 | ok |

## `stamp`: a rubber stamp thumped onto paper
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `stamp_1` | 0.48 | 1 | EL: "One rubber stamp thumped down on a sheet of paper on a wooden desk, short and dull, very close microphone, dry..." | 5 | -18.4 | 0 | 221 | 0.54 | ok |
| `stamp_2` | 0.48 | 1 | EL: "One rubber stamp thumped down on a sheet of paper on a wooden desk, short and dull, very close microphone, dry..." | 5 | -4.9 | 2 | 750 | 0.58 | ok |

## `duck_cloth`: a quick cloth swish of a person ducking
Usable takes right now: **4**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `duck_cloth_1` | 0.68 | 1 | EL: "A person ducking quickly, one short soft cloth swish of a jacket, close microphone, dry, no background noise, ..." | 7 | -3.0 | 6 | 1854 | 0.11 | ok |
| `duck_cloth_2` | 0.68 | 1 | EL: "A person ducking quickly, one short soft cloth swish of a jacket, close microphone, dry, no background noise, ..." | 7 | -3.6 | 33 | 1684 | 0.17 | ok |
| `duck_cloth_3` | 0.68 | 1 | EL: "A person ducking quickly, one short soft cloth swish of a jacket, close microphone, dry, no background noise, ..." | 7 | -2.6 | 1 | 1880 | 0.14 | ok |
| `duck_cloth_4` | 0.68 | 1 | EL: "A person ducking quickly, one short soft cloth swish of a jacket, close microphone, dry, no background noise, ..." | 7 | -2.4 | 5 | 2301 | 0.14 | ok |

## `leaf_brush`: a head brushing under fresh leaves
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `leaf_brush_1` | 0.80 | 1 | EL: "A head brushing once under a leafy branch, a short soft rustle of fresh leaves, close microphone, dry, no wind..." | 8 | -19.8 | 24 | 6906 | 0.01 | ok |
| `leaf_brush_2` | 0.80 | 1 | EL: "A head brushing once under a leafy branch, a short soft rustle of fresh leaves, close microphone, dry, no wind..." | 8 | -22.8 | 10 | 7384 | 0.02 | ok |
| `leaf_brush_3` | 0.80 | 1 | EL: "A head brushing once under a leafy branch, a short soft rustle of fresh leaves, close microphone, dry, no wind..." | 8 | -24.0 | 16 | 6640 | 0.01 | ok |

## `whoosh_body`: short body-move whooshes, six different real ones
Usable takes right now: **6**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-127197-fast-simple-chop-5-aif` | 0.48 | 1 | CC0, dave.des ([source](https://freesound.org/people/dave.des/sounds/127197/)) | 0 | -9.6 | 14 | 319 | 0.21 | ok |
| `fs830856` | 0.40 | 1 | CC0, MeanRaccoon ([source](https://freesound.org/people/MeanRaccoon/sounds/830856/)) | 0 | -10.1 | 82 | 104 | 0.61 | ok |
| `kit-whoosh` | 0.42 | 1 | CC0, qubodup ([source](https://freesound.org/people/qubodup/sounds/60013/)) | 0 | -10.4 | 42 | 377 | 0.26 | ok |
| `fs-786514-swoosh-v2` | 0.30 | 1 | CC0, migoreng1 ([source](https://freesound.org/people/migoreng1/sounds/786514/)) | 0 | -5.3 | 1 | 350 | 0.09 | ok |
| `fs393811` | 0.17 | 1 | CC0, deleted_user_6479820 ([source](https://freesound.org/people/deleted_user_6479820/sounds/393811/)) | 0 | -6.8 | 6 | 1799 | 0.24 | ok |
| `fs-683101-quick-woosh` | 0.28 | 1 | CC0, florianreichelt ([source](https://freesound.org/people/florianreichelt/sounds/683101/)) | 0 | -12.3 | 9 | 925 | 0.36 | ok |

## `spin_scuff`: a shoe scuff + cloth as someone spins round
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `spin_scuff_1` | 0.68 | 1 | EL: "A quick shoe scuff on pavement as a person spins around on the spot, with a short cloth swish, close microphon..." | 7 | -22.5 | 4 | 2018 | 0.06 | ok |
| `spin_scuff_2` | 0.68 | 1 | EL: "A quick shoe scuff on pavement as a person spins around on the spot, with a short cloth swish, close microphon..." | 7 | -5.9 | 2 | 1043 | 0.16 | ok |

## `pigeon`: a pigeon taking off: a burst of wing flaps
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `pigeon_1` | 1.48 | 1 | EL: "A single pigeon takes off from the ground, a short burst of five wing flaps, close microphone, dry, no backgro..." | 15 | -3.2 | 3 | 276 | 0.30 | ok |
| `pigeon_2` | 1.48 | 1 | EL: "A single pigeon takes off from the ground, a short burst of five wing flaps, close microphone, dry, no backgro..." | 15 | -3.4 | 6 | 353 | 0.51 | ok |
| `pigeon_3` | 1.48 | 1 | EL: "A single pigeon takes off from the ground, a short burst of five wing flaps, close microphone, dry, no backgro..." | 15 | -3.2 | 2 | 204 | 0.45 | ok |

## `horn`: bulb-horn honk-honk takes at five different pitches (see honk())
Usable takes right now: **9**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `horn_low_1` | 0.60 | 1 | EL: "Two short honks from a big old brass bulb horn with a deep low pitch, honk-honk, close, dry, no reverb, no bac..." | 6 | -3.0 | 2 | 1395 | 0.67 | ok; squeezes 361 Hz, 364 Hz |
| `horn_low_2` | 0.60 | 1 | EL: "Two short honks from a big old brass bulb horn with a deep low pitch, honk-honk, close, dry, no reverb, no bac..." | 6 | -3.2 | 21 | 1377 | 0.54 | ok; squeezes 358 Hz, 361 Hz |
| `horn_low_3` | 0.60 | 1 | EL: "Two short honks from a big old brass bulb horn with a deep low pitch, honk-honk, close, dry, no reverb, no bac..." | 6 | -3.1 | 44 | 1446 | 0.53 | ok; squeezes 361 Hz, 361 Hz |
| `horn_b` | 0.60 | 1 | EL: "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, n..." | 6 | -2.7 | 1 | 2208 | 0.27 | ok; squeezes 552 Hz, 565 Hz |
| `horn_1` | 0.60 | 1 | EL: "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, n..." | 6 | -3.0 | 3 | 2098 | 0.26 | ok; squeezes 615 Hz, 585 Hz |
| `horn_3` | 0.60 | 1 | EL: "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, n..." | 6 | -3.0 | 1 | 2232 | 0.29 | ok; squeezes 686 Hz, 716 Hz |
| `horn_2` | 0.60 | 1 | EL: "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, n..." | 6 | -3.0 | 1 | 2135 | 0.34 | ok; squeezes 738 Hz, 727 Hz, 814 Hz |
| `horn_5` | 0.60 | 1 | EL: "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, n..." | 6 | -2.9 | 30 | 2375 | 0.24 | ok; squeezes 828 Hz |
| `horn_4` | 0.60 | 1 | EL: "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, n..." | 6 | -3.9 | 50 | 2142 | 0.26 | ok; squeezes 923 Hz, 941 Hz |

## `tyre_roll`: a small rubber tyre rolling on brick (a loopable bed)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `tyre_roll_1` | 4.00 | 1 | EL: "A small rubber bicycle tyre rolling steadily over brick paving, a soft continuous rolling patter, no squeak, n..." | 40 | -3.3 | 138 | 1489 | 0.07 | ok; recogniser hears: nothing |
| `tyre_roll_2` | 4.00 | 1 | EL: "A small rubber bicycle tyre rolling steadily over brick paving, a soft continuous rolling patter, no squeak, n..." | 40 | -7.1 | 220 | 1834 | 0.10 | ok; recogniser hears: nothing (only its stock phrase for non-speech audio) |

## `squeak`: one soft saddle / pedal squeak
Usable takes right now: **10** (cut into single events by onset).

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `squeak_1` | 1.48 | 3 | EL: "Two soft short squeaks of a bicycle saddle spring, gentle and slow, close microphone, dry, no background noise" | 15 | -23.2 | 33 | 1580 | 0.12 | ok; events 21 dB clear of each other |
| `squeak_2` | 1.48 | 2 | EL: "Two soft short squeaks of a bicycle saddle spring, gentle and slow, close microphone, dry, no background noise" | 15 | -14.4 | 103 | 1868 | 0.28 | ok |
| `squeak_3` | 1.48 | 2 | EL: "Two soft short squeaks of a bicycle saddle spring, gentle and slow, close microphone, dry, no background noise" | 15 | -22.0 | 127 | 2101 | 0.28 | ok |
| `squeak_a` | 0.80 | 3 | EL: "A rusty bicycle pedal squeaking, three slow rhythmic squeaks, close, dry, no background" | 8 | -11.4 | 2 | 2969 | 0.25 | ok; events 13 dB clear of each other |

## `boing`: a soft comic boing
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `boing_3` | 0.68 | 1 | EL: "A soft comic cartoon boing, a small rubbery spring, short, dry, no reverb, no background" | 7 | -8.1 | 1 | 1320 | 0.16 | ok |
| `boing_2` | 0.68 | 1 | EL: "A soft comic cartoon boing, a small rubbery spring, short, dry, no reverb, no background" | 7 | -9.8 | 1 | 1132 | 0.28 | ok |
| `boing_1` | 0.68 | 1 | EL: "A soft comic cartoon boing, a small rubbery spring, short, dry, no reverb, no background" | 7 | -19.4 | 3 | 1252 | 0.15 | ok |

## `murmur_f`: a woman on a phone, muffled and wordless (always played through the 250-1500 Hz muffle)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `murmur_gib_f_1` | 4.00 | 1 | EL: "A woman mumbling nonsense gibberish syllables in a steady chatty rhythm, like a muffled cartoon adult voice go..." | 40 | -16.7 | 3 | 562 | 0.31 | ok; recogniser hears: nothing |
| `murmur_f_1` | 4.00 | 1 | EL: "A woman talking quietly on a phone heard through a wall, muffled wordless mumbling, calm, completely unintelli..." | 40 | -33.5 | 551 | 302 | 0.32 | ok; recogniser hears: Hmm... Hmm... |
| `murmur_f_2` | 4.00 | 0 | EL: "A woman talking quietly on a phone heard through a wall, muffled wordless mumbling, calm, completely unintelli..." | 40 | -43.2 | 718 | 262 | 0.35 | NOT USED: near-silent file (peak -43.2 dBFS): no real event, poor signal-to-noise |

## `murmur_m`: a man on a phone, muffled and wordless (always played through the muffle)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `murmur_gib_m_1` | 4.00 | 0 | EL: "A man mumbling nonsense gibberish syllables in a steady chatty rhythm, like a muffled cartoon adult voice goin..." | 40 | -4.5 | 49 | 755 | 0.11 | NOT USED: reads as words: -wah -wah -wah -wah -wah -wah -wah -wah |
| `murmur_m_2` | 4.00 | 1 | EL: "A man talking quietly on a phone heard through a wall, muffled wordless mumbling, calm, completely unintelligi..." | 40 | -22.9 | 1089 | 201 | 0.52 | ok; recogniser hears: Mmm, hmm, hmm, hmm. |
| `murmur_m_1` | 4.00 | 0 | EL: "A man talking quietly on a phone heard through a wall, muffled wordless mumbling, calm, completely unintelligi..." | 40 | -20.5 | 902 | 1010 | 0.22 | NOT USED: reads as words: ahead, I'm in it. |

## `crowd`: soft far campus crowd murmur (a loopable bed)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `crowd_1` | 10.00 | 1 | EL: "Soft distant crowd murmur of students on a sunny outdoor campus square, friendly wordless walla, light, no mus..." | 100 | -37.4 | 120 | 645 | 0.07 | ok; recogniser hears: nothing |
| `crowd_2` | 10.00 | 0 | EL: "Soft distant crowd murmur of students on a sunny outdoor campus square, friendly wordless walla, light, no mus..." | 100 | -41.3 | 87 | 573 | 0.10 | NOT USED: clear words: think idea to you I don't. That's I |

## `crowd_ooh`: a small group's soft surprised 'ooh'
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `crowd_ooh_1` | 1.48 | 1 | EL: "A small group of people outdoors react with one soft surprised 'ooh', friendly, short, a few metres away, no w..." | 15 | -3.1 | 4 | 635 | 0.15 | ok; recogniser hears: Oh |
| `crowd_ooh_2` | 1.48 | 1 | EL: "A small group of people outdoors react with one soft surprised 'ooh', friendly, short, a few metres away, no w..." | 15 | -3.5 | 2 | 600 | 0.23 | ok; recogniser hears: BOOM! |

## `crowd_laugh`: a small group's short warm laugh
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `crowd_laugh_1` | 1.48 | 1 | EL: "A small group of friends share one short warm laugh outdoors, a light chuckle, a few metres away, no words, no..." | 15 | -4.3 | 42 | 1006 | 0.10 | ok; recogniser hears: Ha ha ha ha ha |
| `crowd_laugh_2` | 1.48 | 1 | EL: "A small group of friends share one short warm laugh outdoors, a light chuckle, a few metres away, no words, no..." | 15 | -8.3 | 46 | 419 | 0.26 | ok; recogniser hears: Ha ha ha ha ha ha |

## `square_amb`: sunny campus square ambience: breeze in leaves, songbirds, a far fountain (a loopable bed)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `square_amb_1` | 15.00 | 1 | EL: "Sunny spring campus square ambience, a light breeze in fresh leaves, a few songbirds, a small fountain far awa..." | 150 | -29.4 | 8 | 1053 | 0.37 | ok; recogniser hears: nothing |
| `square_amb_2` | 15.00 | 1 | EL: "Sunny spring campus square ambience, a light breeze in fresh leaves, a few songbirds, a small fountain far awa..." | 150 | -19.2 | 7 | 2277 | 0.28 | ok; recogniser hears: nothing |

## `clock`: a tower clock mechanism whirring, then a tock
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `clock_1` | 2.48 | 1 | EL: "An old tower clock mechanism spinning fast, a soft ratcheting gear whirr for two seconds, then one soft wooden..." | 25 | -6.2 | 11 | 7181 | 0.04 | ok |
| `clock_2` | 2.48 | 1 | EL: "An old tower clock mechanism spinning fast, a soft ratcheting gear whirr for two seconds, then one soft wooden..." | 25 | -2.1 | 40 | 7102 | 0.06 | ok |

## `headphones`: tinny music leaking from headphones
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `headphones_1` | 1.48 | 1 | EL: "Tinny music leaking from big headphones heard from outside, a faint fast hi-hat and beat, thin and quiet, no b..." | 15 | -5.1 | 3 | 8264 | 0.08 | ok; recogniser hears: nothing (only its stock phrase for non-speech audio) |
| `headphones_2` | 1.48 | 1 | EL: "Tinny music leaking from big headphones heard from outside, a faint fast hi-hat and beat, thin and quiet, no b..." | 15 | -3.6 | 140 | 2252 | 0.59 | ok; recogniser hears: nothing (only its stock phrase for non-speech audio) |

## `cam_whoosh_s`: camera whoosh, short (~0.4-0.5 s)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-816262-broomstick-whoosh-3-quiet-okm1` | 0.36 | 1 | CC0, Sadiquecat ([source](https://freesound.org/people/Sadiquecat/sounds/816262/)) | 0 | -5.8 | 7 | 121 | 0.87 | ok |
| `cam_whoosh_s_1` | 0.48 | 1 | EL: "A very short soft airy camera whoosh, a quick smooth swish of air, clean, dry, no impact, no bass rumble, no b..." | 5 | -3.2 | 33 | 243 | 0.76 | ok |

## `cam_whoosh_m`: camera whoosh, medium (~0.85 s)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-702773-swipe-wav` | 0.84 | 1 | CC0, LilMati ([source](https://freesound.org/people/LilMati/sounds/702773/)) | 0 | -10.3 | 2 | 4020 | 0.17 | ok |
| `cam_whoosh_m_1` | 0.88 | 1 | EL: "A soft airy camera whoosh, a smooth swish of air passing the microphone, medium length, clean, dry, no impact,..." | 9 | -3.3 | 108 | 901 | 0.14 | ok |

## `cam_whoosh_l`: camera whoosh, long (1.6-4 s)
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-169867-swoosh` | 2.14 | 1 | CC0, Halgrimm ([source](https://freesound.org/people/Halgrimm/sounds/169867/)) | 0 | -6.1 | 444 | 312 | 0.37 | ok |
| `cam_whoosh_l_1` | 1.60 | 1 | EL: "A long slow soft airy camera whoosh, a smooth gliding swish of air, clean, dry, no impact, no bass rumble, no ..." | 16 | -3.8 | 360 | 481 | 0.16 | ok |
| `fs-264777-swoosh` | 4.00 | 1 | CC0, Shinplaster ([source](https://freesound.org/people/Shinplaster/sounds/264777/)) | 0 | -5.9 | 286 | 84 | 0.86 | ok |

## `whoosh_mind`: a wide analog sweep (something floating away)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs810485` | 0.59 | 1 | CC0, CVLTIV8R ([source](https://freesound.org/people/CVLTIV8R/sounds/810485/)) | 0 | -10.8 | 1 | 2083 | 0.36 | ok |

## `whoosh_slow`: a slow deep woosh with a 0.39 s rise (slow motion)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-683096-woosh` | 1.50 | 1 | CC0, florianreichelt ([source](https://freesound.org/people/florianreichelt/sounds/683096/)) | 0 | -9.9 | 226 | 173 | 0.52 | ok |

## `drone`: a soft low tension drone (a loopable bed)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `drone_b_1` | 5.00 | 1 | EL: "A low sustained synth drone, warm, full and clearly audible at a steady level, a deep hum with slow gentle mov..." | 50 | -6.1 | 162 | 101 | 0.88 | ok; recogniser hears: nothing |
| `drone_1` | 6.00 | 0 | EL: "A soft low tension drone, a quiet warm sustained hum with slow gentle movement, mysterious but playful, steady..." | 60 | -61.5 | 17 | 233 | 0.82 | NOT USED: near-silent file (peak -61.5 dBFS): no real event, poor signal-to-noise |
| `drone_2` | 6.00 | 0 | EL: "A soft low tension drone, a quiet warm sustained hum with slow gentle movement, mysterious but playful, steady..." | 60 | -61.1 | 522 | 136 | 0.73 | NOT USED: near-silent file (peak -61.1 dBFS): no real event, poor signal-to-noise |

## `low_riser`: a soft low riser, 3.5 s (END it on a hit)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `low_riser_1` | 3.48 | 1 | EL: "A soft low riser, a gentle swelling tone rising slowly in pitch over three seconds, building quiet tension, no..." | 35 | -3.6 | 1838 | 105 | 0.78 | ok |
| `low_riser_2` | 3.48 | 1 | EL: "A soft low riser, a gentle swelling tone rising slowly in pitch over three seconds, building quiet tension, no..." | 35 | -3.2 | 948 | 149 | 0.33 | ok |

## `riser`: CC0 risers, 2.5 s and 6 s (END on a hit)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-685256-riser-sound-effect-short-wav` | 2.46 | 1 | CC0, syntheffects ([source](https://freesound.org/people/syntheffects/sounds/685256/)) | 0 | -9.0 | 631 | 1286 | 0.05 | ok |
| `fs-396161-scary-hits-risers-001` | 5.97 | 1 | CC0, Xinematix ([source](https://freesound.org/people/Xinematix/sounds/396161/)) | 0 | -10.8 | 2529 | 478 | 0.58 | ok |

## `shimmer`: a rising magical shimmer ending in a soft bloom, 4.5 s
Usable takes right now: **3**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `shimmer_1` | 4.48 | 1 | EL: "A magical rising shimmer, glassy chimes and airy sparkle swelling upward over four seconds and ending in a sof..." | 45 | -6.8 | 836 | 6965 | 0.29 | ok; recogniser hears: nothing |
| `shimmer_2` | 4.48 | 1 | EL: "A magical rising shimmer, glassy chimes and airy sparkle swelling upward over four seconds and ending in a sof..." | 45 | -3.5 | 441 | 6617 | 0.09 | ok; recogniser hears: nothing |
| `shimmer_3` | 4.48 | 1 | EL: "A magical rising shimmer, glassy chimes and airy sparkle swelling upward over four seconds and ending in a sof..." | 45 | -6.2 | 1075 | 6159 | 0.26 | ok; recogniser hears: nothing |

## `impact`: a soft low impact / whump
Usable takes right now: **4**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `impact_1` | 1.00 | 1 | EL: "A soft low cinematic whump, one gentle deep thud with a warm body, short, no sub rumble, no long reverb tail, ..." | 10 | -24.1 | 2 | 86 | 0.83 | ok |
| `impact_2` | 1.00 | 1 | EL: "A soft low cinematic whump, one gentle deep thud with a warm body, short, no sub rumble, no long reverb tail, ..." | 10 | -25.4 | 1 | 86 | 0.81 | ok |
| `impact_3` | 1.00 | 1 | EL: "A soft low cinematic whump, one gentle deep thud with a warm body, short, no sub rumble, no long reverb tail, ..." | 10 | -14.1 | 47 | 132 | 0.66 | ok |
| `kit-impact` | 0.27 | 1 | CC0, peoplearehappy ([source](https://freesound.org/people/peoplearehappy/sounds/841274/)) | 0 | -6.0 | 4 | 96 | 0.86 | ok |

## `freeze_hit`: a freeze-frame hit: a muted thump (+ a tiny ping in the generated takes), no record scratch
Usable takes right now: **5**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `freeze_hit_1` | 0.80 | 0 | EL: "A short soft freeze-frame hit, one muted thump with a tiny glassy ping as time stops, clean, no record scratch..." | 8 | -43.4 | 1 | 212 | 0.97 | NOT USED: near-silent file (peak -43.4 dBFS): no real event, poor signal-to-noise |
| `freeze_hit_2` | 0.80 | 1 | EL: "A short soft freeze-frame hit, one muted thump with a tiny glassy ping as time stops, clean, no record scratch..." | 8 | -38.7 | 2 | 335 | 0.99 | ok |
| `freeze_hit_3` | 0.80 | 1 | EL: "A short soft freeze-frame hit, one muted thump with a tiny glassy ping as time stops, clean, no record scratch..." | 8 | -30.7 | 1 | 218 | 0.97 | ok |
| `kenney-impact-impactsoft-heavy-000` | 0.53 | 1 | CC0, Kenney ([source](https://kenney.nl/assets/impact-sounds)) | 0 | -5.9 | 1 | 96 | 0.98 | ok |
| `kenney-impact-impactsoft-heavy-001` | 0.57 | 1 | CC0, Kenney ([source](https://kenney.nl/assets/impact-sounds)) | 0 | -5.9 | 1 | 91 | 0.99 | ok |
| `fs524817` | 0.75 | 1 | CC0, DeVern ([source](https://freesound.org/people/DeVern/sounds/524817/)) | 0 | -9.0 | 11 | 140 | 0.45 | ok |

## `chime`: a happy little rising chime
Usable takes right now: **4**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `chime_1` | 1.00 | 1 | EL: "A happy little three-note rising chime on a glockenspiel, bright and sweet, short, clean, no reverb, no backgr..." | 10 | -28.5 | 1 | 2094 | 0.70 | ok |
| `chime_2` | 1.00 | 1 | EL: "A happy little three-note rising chime on a glockenspiel, bright and sweet, short, clean, no reverb, no backgr..." | 10 | -27.7 | 2 | 1551 | 0.82 | ok |
| `chime_3` | 1.00 | 1 | EL: "A happy little three-note rising chime on a glockenspiel, bright and sweet, short, clean, no reverb, no backgr..." | 10 | -17.2 | 1 | 2364 | 0.70 | ok |
| `kenney-interface-confirmation-002` | 0.54 | 1 | CC0, Kenney ([source](https://kenney.nl/assets/interface-sounds)) | 0 | -5.9 | 1 | 2196 | 0.38 | ok |

## `glint`: a glassy glint
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `kenney-interface-glass-001` | 0.27 | 1 | CC0, Kenney ([source](https://kenney.nl/assets/interface-sounds)) | 0 | -5.9 | 0 | 1929 | 0.78 | ok |

## `triangle`: a struck open triangle (an 'answer' ding)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-349504-triangle-open-04` | 3.54 | 1 | CC0, cabled_mess ([source](https://freesound.org/people/cabled_mess/sounds/349504/)) | 0 | -6.8 | 0 | 3955 | 0.75 | ok |

## `pop`: a small pop for text / a title
Usable takes right now: **5**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-824189-pop-in-sfx` | 0.21 | 1 | CC0, Sadiquecat ([source](https://freesound.org/people/Sadiquecat/sounds/824189/)) | 0 | -9.4 | 61 | 897 | 0.15 | ok |
| `pop_2` | 0.48 | 1 | EL: "One small soft cartoon pop, a bubbly blip as a title appears, short, clean, dry, no background" | 5 | -3.3 | 16 | 786 | 0.09 | ok |
| `pop_1` | 0.48 | 1 | EL: "One small soft cartoon pop, a bubbly blip as a title appears, short, clean, dry, no background" | 5 | -3.4 | 77 | 508 | 0.24 | ok |
| `pop_3` | 0.48 | 1 | EL: "One small soft cartoon pop, a bubbly blip as a title appears, short, clean, dry, no background" | 5 | -3.4 | 30 | 588 | 0.17 | ok |
| `kit-pop` | 0.11 | 1 | CC0, ethernel0 ([source](https://freesound.org/people/ethernel0/sounds/776016/)) | 0 | -5.8 | 1 | 1071 | 0.40 | ok |

## `plop`: a tiny plop
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-447910-plop` | 0.24 | 1 | CC0, Breviceps ([source](https://freesound.org/people/Breviceps/sounds/447910/)) | 0 | -5.5 | 2 | 1283 | 0.58 | ok |

## `mouth_pop`: an organic low mouth pop
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs-258269-mouth-pop` | 0.26 | 1 | CC0, jcallison ([source](https://freesound.org/people/jcallison/sounds/258269/)) | 0 | -9.2 | 2 | 660 | 0.25 | ok |

## `flick`: a very short flick
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs393811` | 0.17 | 1 | CC0, deleted_user_6479820 ([source](https://freesound.org/people/deleted_user_6479820/sounds/393811/)) | 0 | -6.8 | 6 | 1799 | 0.24 | ok |

## `tick`: five different real ticks / clicks
Usable takes right now: **5**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `fs384187` | 0.07 | 1 | CC0, malle99 ([source](https://freesound.org/people/malle99/sounds/384187/)) | 0 | -9.4 | 22 | 2765 | 0.32 | ok |
| `kit-click` | 0.09 | 1 | CC0, adh.dreaming ([source](https://freesound.org/people/adh.dreaming/sounds/671105/)) | 0 | -9.4 | 1 | 6487 | 0.05 | ok |
| `fs788933` | 0.12 | 1 | CC0, Mediasaur ([source](https://freesound.org/people/Mediasaur/sounds/788933/)) | 0 | -7.0 | 3 | 7268 | 0.05 | ok |
| `fs721514` | 0.02 | 1 | CC0, BaggoNotes ([source](https://freesound.org/people/BaggoNotes/sounds/721514/)) | 0 | -6.9 | 0 | 1324 | 0.28 | ok |
| `kit-tick` | 0.02 | 1 | CC0, Squirrel_404 ([source](https://freesound.org/people/Squirrel_404/sounds/683048/)) | 0 | -6.1 | 0 | 5134 | 0.52 | ok |

## `tape_rewind`: a VHS tape rewinding fast in a VCR: motor whirr + tape chatter
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `tape_rewind_1` | 3.00 | 1 | EL: "A VHS video cassette tape rewinding at high speed inside a VCR, a fast mechanical motor whirr with light tape ..." | 30 | -16.9 | 216 | 6482 | 0.05 | ok |
| `tape_rewind_2` | 3.00 | 1 | EL: "A VHS video cassette tape rewinding at high speed inside a VCR, a fast mechanical motor whirr with light tape ..." | 30 | -7.2 | 2822 | 5080 | 0.06 | ok |

## `tape_stop`: a VCR mechanism stopping: one short click-clunk
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `tape_stop_1` | 0.60 | 1 | EL: "A VCR tape mechanism stopping abruptly, one short mechanical click-clunk, close, dry, no music, no voices" | 6 | -6.6 | 15 | 7389 | 0.07 | ok |
| `tape_stop_2` | 0.60 | 1 | EL: "A VCR tape mechanism stopping abruptly, one short mechanical click-clunk, close, dry, no music, no voices" | 6 | -5.3 | 13 | 7475 | 0.03 | ok |

## `door_open`: an office door: the latch clicks, then the door swings with a soft creak
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `door_open_1` | 1.48 | 1 | EL: "A wooden office door: the latch clicks, then the door swings open with a soft short creak, indoors, close, no ..." | 15 | -13.1 | 2 | 3880 | 0.06 | ok |
| `door_open_2` | 1.48 | 1 | EL: "A wooden office door: the latch clicks, then the door swings open with a soft short creak, indoors, close, no ..." | 15 | -17.2 | 13 | 1754 | 0.11 | ok |

## `zip`: a garment bag's zipper ripped open
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `zip_1` | 0.60 | 1 | EL: "A zipper on a garment bag ripped open fast, one quick zip, close microphone, dry, no reverb, no background noi..." | 6 | -3.6 | 50 | 2363 | 0.15 | ok |
| `zip_2` | 0.60 | 1 | EL: "A zipper on a garment bag ripped open fast, one quick zip, close microphone, dry, no reverb, no background noi..." | 6 | -6.6 | 8 | 3653 | 0.12 | ok |

## `bag_rustle`: a plastic garment bag swung up: a short crinkly rustle
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `bag_rustle_1` | 0.80 | 1 | EL: "A plastic garment bag swung up quickly, a short crinkly rustle, close microphone, dry, no reverb, no backgroun..." | 8 | -17.3 | 86 | 5461 | 0.03 | ok |
| `bag_rustle_2` | 0.80 | 1 | EL: "A plastic garment bag swung up quickly, a short crinkly rustle, close microphone, dry, no reverb, no backgroun..." | 8 | -13.0 | 133 | 4783 | 0.04 | ok |

## `dog_yap`: a small terrier's two happy yaps
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `dog_yap_1` | 1.00 | 1 | EL: "A small terrier dog gives two short happy yaps, outdoors, a few metres away, dry, no other sounds, no music, n..." | 10 | -2.8 | 1 | 1356 | 0.29 | ok |
| `dog_yap_2` | 1.00 | 1 | EL: "A small terrier dog gives two short happy yaps, outdoors, a few metres away, dry, no other sounds, no music, n..." | 10 | -3.2 | 131 | 1372 | 0.27 | ok |

## `dog_paws`: a small dog running across brick: quick light claws
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `dog_paws_1` | 1.48 | 1 | EL: "A small dog running fast across brick paving, quick light claws pattering, close, dry, no barking, no panting,..." | 15 | -3.9 | 31 | 2074 | 0.12 | ok |

## `skid`: a small rubber tyre skidding to a stop on brick
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `skid_1` | 0.80 | 1 | EL: "A small rubber bicycle tyre skids to a quick stop on brick paving, one short chirpy skid, close microphone, dr..." | 8 | -2.4 | 8 | 1524 | 0.13 | ok |
| `skid_2` | 0.80 | 1 | EL: "A small rubber bicycle tyre skids to a quick stop on brick paving, one short chirpy skid, close microphone, dr..." | 8 | -2.9 | 2 | 1136 | 0.23 | ok |

## `man_sigh`: a man's short thoughtful sigh (wordless)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `man_sigh_1` | 1.20 | 1 | EL: "A middle-aged man lets out one short thoughtful sigh through his nose, close, dry, no words, no music" | 12 | -3.6 | 2 | 209 | 0.39 | ok; recogniser hears: Hmm |
| `man_sigh_2` | 1.20 | 1 | EL: "A middle-aged man lets out one short thoughtful sigh through his nose, close, dry, no words, no music" | 12 | -5.8 | 26 | 206 | 0.72 | ok; recogniser hears: Hmm |

## `gasp_f`: a young woman's small surprised gasp (wordless)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `gasp_f_1` | 0.80 | 1 | EL: "A young woman's small surprised gasp, one short quick intake of breath, close, dry, no words, no music" | 8 | -4.6 | 1 | 1230 | 0.13 | ok; recogniser hears: Oh |
| `gasp_f_2` | 0.80 | 1 | EL: "A young woman's small surprised gasp, one short quick intake of breath, close, dry, no words, no music" | 8 | -3.2 | 1 | 725 | 0.21 | ok; recogniser hears: Oh |

## `hm_f`: a woman's short surprised 'hm' (closed lips)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `hm_f_1` | 0.60 | 1 | EL: "A woman's short surprised 'hm' with closed lips, rising, close, dry, no words, no music" | 6 | -3.3 | 2 | 307 | 0.24 | ok; recogniser hears: Hmm |
| `hm_f_2` | 0.60 | 1 | EL: "A woman's short surprised 'hm' with closed lips, rising, close, dry, no words, no music" | 6 | -16.4 | 33 | 268 | 0.30 | ok; recogniser hears: Hmm |

## `laugh_m`: a man's short cheerful chuckle (wordless)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `laugh_m_1` | 1.20 | 1 | EL: "A man's short cheerful goofy chuckle, a friendly clown laughing, outdoors a few metres away, no words, no musi..." | 12 | -3.0 | 77 | 1038 | 0.29 | ok; recogniser hears: Ha ha ha ha ha! |
| `laugh_m_2` | 1.20 | 1 | EL: "A man's short cheerful goofy chuckle, a friendly clown laughing, outdoors a few metres away, no words, no musi..." | 12 | -3.5 | 80 | 479 | 0.50 | ok; recogniser hears: Ha ha ha ha ha ha! |

## `laugh_f`: a young woman's short delighted giggle (wordless)
Usable takes right now: **1**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `laugh_f_1` | 1.20 | 1 | EL: "A young woman's short delighted giggle, outdoors a few metres away, no words, no music" | 12 | -2.8 | 37 | 673 | 0.40 | ok; recogniser hears: Heh heh heh heh. |
| `laugh_f_2` | 1.20 | 0 | EL: "A young woman's short delighted giggle, outdoors a few metres away, no words, no music" | 12 | -3.2 | 76 | 413 | 0.48 | NOT USED: clear words: he he he |

## `yelp`: a man's short comic startled yelp (wordless)
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `yelp_1` | 0.80 | 1 | EL: "A man's short comic startled yelp, wordless, surprised, outdoors a few metres away, no words, no music" | 8 | -3.5 | 4 | 856 | 0.13 | ok; recogniser hears: Oh |
| `yelp_2` | 0.80 | 1 | EL: "A man's short comic startled yelp, wordless, surprised, outdoors a few metres away, no words, no music" | 8 | -3.0 | 2 | 720 | 0.17 | ok; recogniser hears: Oh |

## `hand_bell`: a small brass hand bell: ding-a-ling
Usable takes right now: **2**.

| file | length s | pieces | source / licence | credits | file peak dBFS | onset ms | centroid Hz | top3 | status |
|---|---|---|---|---|---|---|---|---|---|
| `hand_bell_1` | 1.20 | 1 | EL: "A small brass hand bell rung quickly three times, a bright ding-a-ling, short, close, dry, no reverb, no backg..." | 12 | -4.5 | 1 | 5826 | 0.33 | ok |
| `hand_bell_2` | 1.20 | 1 | EL: "A small brass hand bell rung quickly three times, a bright ding-a-ling, short, close, dry, no reverb, no backg..." | 12 | -4.5 | 10 | 6162 | 0.29 | ok |

## Generated but not in the registry (measurement references only)
- `horn_a` (1.0 s): "Clown bicycle bulb horn, two quick squeezes, honk honk, close, dry, no background"
- `horn_c` (0.48 s): "One short honk of a rubber bulb clown horn, close, dry, no reverb"

## Credits
- Fix round 1: 99 generations, 238.4 s of sound = **2384 credits** at the measured 10 credits per second (cap 2,500). The account's own counter moved 2451 in the same window; the account is shared, so that figure can include other work.
- First cut: 4 generations (horn_a, horn_b, horn_c, squeak_a), 2.9 s, 29 credits by the counter.
- CC0 recordings: no cost, no credit required; re-check each source page before publishing (`CREDITS.txt`).

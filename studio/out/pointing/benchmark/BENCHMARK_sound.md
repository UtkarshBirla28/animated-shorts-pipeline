# BENCHMARK: SOUND. "Why Japanese Train Drivers Point at Nothing" against our earlier films and the reference channel

Lens: sound, by measurement only. Nothing was played out loud. Every number below comes from the final mp4s (audio extracted to 48 kHz WAV), from our own stems where we have them, and from faster-whisper "medium" word times run on the FINAL audio of all 13 films with the same settings.
Scratch data, scripts and the full tables: `studio/out/pointing/benchmark/sound/` (`data/table.md`, `data/*.metrics.json`, `data/pointing_checks.json`, `data/ours_extra.json`, `scripts/`).

Films measured:
- **Ours (5):** pointing (rejected), clown (the owner loved its narration and sound, 1.4k views), anti-theft (best: 24.6k views, 91.5 % viewed), salad oil (7.4k), typo ("ok not great").
- **Reference (8):** Job Nobody Wants in Japan (18M), Burglar Who Only Moved Furniture (10M), Sailors Carried Storm Oil (16M), Window That Breaks Japan's Gambling Law (16M), Perfect Railroads Don't Work (30M), Pink Prison Cell (11M), One Cart Stopped an Army (9.2M), Drivers Started Filming the Road (4.7M).

Our stems add up to the final audio (correlation 0.998-1.000 for all 5 films), so the stem numbers describe exactly what viewers hear.

---

## 0. The verdict in five lines

1. **The loudness numbers are fine and they hid everything else.** All 13 films sit at -14.0 to -14.3 LUFS. The mix "passed" every gate we wrote. Our gates measured the wrong things.
2. **There is not enough voice.** The film has 131 words in 63.8 s (2.05 words/s). The references have 218-246 words (3.34-4.09 words/s, median 3.68). The narrator talks for only **29.9 s of 63.8 s (47 %)**. In clown he talks for 52.1 of 74.9 s (70 %); in anti-theft for 69.4 of 83.9 s (83 %). The references have no voice gap longer than 0.54 s; this film has five over 1.0 s.
3. **The narrator does not sound like one person telling one story.** His pitch jumps a median **6.5 semitones from one line to the next**. Clown: 3.8. Anti-theft: 3.7. Typo: 3.0. The references (all speakers, sentence to sentence): 1.1-3.5. The first three lines go 227 Hz, then 107 Hz, then 235 Hz.
4. **The music is chopped into 32 cues in 61 s.** That is a new cue every 1.9 s. It has a steady beat in only 6 of its 20 six-second windows (clown: 20 of 23). It sits 21.8 dB under the voice, the lowest of our five films. Clown had 14 sections, a steady 103/118/100 BPM pulse, and started on frame 0.
5. **The bed is train noise, not fun.** The ambience is the loudest of all our films (-36.0 LUFS against -40.8 to -42.2). A steady ~1 kHz motor tone, right in the voice's own band, sounds for 29.5 s of the film. Effects are few, loud and dull: 47 onsets against 117 in clown, 7.4 per 10 s against 15.6. The tourist's payoff laugh is **one recording played three times** (48.95 s, 56.9 s, 59.15 s; correlation 0.97-1.00).

Sound score: **new film 3/10, clown (our best sound) 6.5/10, the reference channel 8.5/10.**

---

## 1. The big comparison table (same method for all 13 films)

Short names: P = pointing (rejected), CL = clown, AT = anti-theft, SO = salad oil, TY = typo; R1 job, R2 burglar, R3 storm oil, R4 window, R5 railroads, R6 pink cell, R7 cart, R8 dash cam.

### 1a. Loudness and pace

| metric | P | CL | AT | SO | TY | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| length s | 63.8 | 74.9 | 83.9 | 86.9 | 84.8 | 60.6 | 58.4 | 64.6 | 45.1 | 65.2 | 65.3 | 66.9 | 62.3 |
| integrated LUFS | -14.0 | -14.0 | -14.0 | -14.0 | -14.1 | -14.1 | -14.1 | -14.0 | -14.3 | -14.1 | -14.2 | -14.1 | -14.1 |
| loudness range LU | **3.5** | 3.5 | 1.8 | 2.3 | 2.0 | 1.8 | 1.7 | 2.4 | 2.4 | 3.2 | 2.2 | 2.9 | 2.2 |
| true peak dBTP | -2.8 | -2.9 | -2.1 | -2.8 | -2.8 | -2.1 | -2.1 | -2.1 | -1.3 | -2.2 | -1.9 | -2.0 | -1.9 |
| words heard (whisper) | **131** | 182 | 199 | 216 | 202 | 224 | 239 | 246 | 160 | 218 | 238 | 235 | 237 |
| words / s over the film | **2.05** | 2.43 | 2.37 | 2.48 | 2.38 | 3.70 | 4.09 | 3.81 | 3.55 | 3.34 | 3.65 | 3.51 | 3.80 |
| words / s inside sentences (median) | 2.79 | 3.06 | 2.61 | 2.94 | 2.79 | 3.84 | 4.25 | 3.85 | 3.62 | 3.40 | 3.65 | 3.60 | 3.96 |
| pace swing between sentences (sd, w/s) | **0.95** | 0.70 | 0.50 | 0.53 | 0.78 | 0.65 | 0.50 | 0.52 | 0.54 | 0.66 | 0.48 | 0.39 | 0.44 |
| voice gaps > 0.3 s | 18 | 13 | 19 | 20 | 18 | 0 | 0 | 0 | 3 | 0 | 3 | 3 | 1 |
| voice gaps > 0.6 s | **8** | 4 | 3 | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| voice gaps > 1.0 s | **5** | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| total gap time (gaps > 0.3 s) s | **14.8** | 11.2 | 9.5 | 8.1 | 9.5 | 0 | 0 | 0 | 1.4 | 0 | 1.0 | 1.0 | 0.3 |
| longest gap s | **2.68** (33.68-36.36) | 3.08 (quiz count) | 1.24 | 0.66 | 1.36 | 0.26 | 0.26 | 0.28 | 0.54 | 0.22 | 0.36 | 0.38 | 0.34 |
| seconds with no voice in a 0.4 s window | **6.7** | 5.9 | 1.5 | 0.5 | 2.6 | 0 | 0 | 0 | 0.1 | 0 | 0 | 0 | 0 |
| dead air (no voice AND mix 12 LU under the average) s | **2.1** | 0.9 | 0.5 | 0.4 | 0.8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| quiet floor inside speech (p10 of 100 ms frames vs p75) dB | **-17.1** | -11.5 | -15.9 | -13.2 | -14.6 | -9.4 | -9.1 | -8.5 | -7.8 | -9.3 | -9.0 | -8.4 | -8.8 |
| whisper word confidence | 0.93 | 0.97 | 0.93 | 0.96 | 0.95 | 0.96 | 0.97 | 0.97 | 0.98 | 0.96 | 0.97 | 0.97 | 0.98 |

How to read the "quiet floor" row: it shows how far the quietest moments inside the talking fall below the talking itself. The references sit at -8 to -9 dB: a continuous wall of compressed voice plus bed, with no holes. This film sits at -17.1 dB, the deepest holes of all 13 films.

### 1b. The voice: pitch and expression

| metric | P | CL | AT | SO | TY | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| f0 median of sentences Hz | 175 | 196 | 172 | 189 | 196 | 189 | 180 | 213 | 211 | 205 | 204 | 214 | 200 |
| f0 range over the film (p5-p95) st | 19.5 | 19.6 | 18.9 | 17.3 | 15.8 | 16.4 | 17.4 | 15.2 | 16.2 | 16.8 | 16.4 | 15.5 | 16.5 |
| f0 range inside a sentence (median) st | 11.5 | 12.1 | 14.6 | 12.7 | 12.8 | 13.2 | 13.4 | 11.4 | 12.9 | 13.0 | 13.7 | 11.2 | 11.2 |
| **pitch jump sentence to sentence (median) st** | **7.0** | 4.3 | 2.9 | 4.3 | 2.8 | 3.0 | 3.3 | 2.9 | 2.2 | 3.4 | 2.4 | 3.5 | 1.1 |
| sentences > 5 st away from the film's median | **11 of 20** | 9 of 26 | 5 of 16 | 5 of 28 | 1 of 23 | 1 of 16 | 0 of 14 | 0 of 15 | 0 of 11 | 2 of 18 | 2 of 13 | 1 of 13 | 2 of 16 |
| word loudness swing inside a sentence (sd dB) | 2.0 | 1.9 | 2.5 | 2.7 | 2.4 | 2.5 | 2.8 | 2.5 | 2.3 | 2.5 | 2.3 | 2.5 | 2.7 |
| sentence loudness swing (sd dB) | **1.7** | 0.6 | 0.9 | 1.0 | 1.0 | 0.8 | 0.7 | 0.9 | 0.8 | 1.2 | 1.4 | 0.9 | 0.7 |

The narrator alone (our films, by the speaker field of `phrases.json`, pitch on the voice stem):

| | P | CL | AT | SO | TY |
|---|---|---|---|---|---|
| narrator lines | 12 | 17 | 28 | 34 | 28 |
| narrator seconds / film | **29.9 / 63.8 (47 %)** | 52.1 / 74.9 (70 %) | 69.4 / 83.9 (83 %) | 76.5 / 86.9 (88 %) | 73.3 / 84.8 (86 %) |
| **narrator line-to-line pitch jump (median)** | **6.5 st** | 3.8 st | 3.7 st | 5.8 st | 3.0 st |
| narrator jumps over 6 st | 7 of 11 | 2 of 16 | 8 of 27 | 15 of 33 | 7 of 27 |
| "you / your" said to the viewer | 2 | 7 | | | |

The new narrator's line medians, in order: 227, 107, 235, 194, 282, 167, 263, 259, 159, 226, 175, 172 Hz. Three lines sit at 259-282 Hz. That is a male narrator pushed near a shout ("So he checks with a finger and a shout." 282 Hz at 4.33 words/s, the fastest line). The next line drops to 167 Hz. Clown's narrator moves in smaller steps, and asks the viewer things. Its 10 measured sentence ends: 7 rising, 0 falling, 3 flat ("How many?", "You saw him, right?", "Did you see the money?"). The new film's 12 measured ends: 0 rising, 4 falling, 8 flat.

### 1c. The bed: music, effects, ambience (our films, from the stems)

| metric | P | CL | AT | SO | TY |
|---|---|---|---|---|---|
| voice stem LUFS | -13.6 | -13.8 | -14.0 | -14.0 | -14.0 |
| music stem LUFS | -31.4 | -30.4 | -32.8 | -32.4 | -32.4 |
| **music under the voice while talking (median dB)** | **-21.8** | -20.3 | -18.9 | -18.7 | -18.6 |
| music silent (runs over 0.5 s) | 5.4 s: **0.0-2.7**, 21.1-22.7, 55.9-57.0 | **0 s** | 6.6 s | 6.6 s | 4.5 s |
| music cues / sections | **32 cues + a melody in 61 s** (one per 1.9 s) | 14 sections in 74.9 s (one per 5.3 s) | | | |
| six-second windows with a clear beat | **6 of 20** (122, 143, 143, 158, 130, 130 BPM) | 20 of 23 (103 x5, 118 x7, 176 x2, 70, 100-102 x5, 113) | 12 of 26 (109-118) | 16 of 27 | 26 of 27 (98-125) |
| music level jumps > 6 dB per minute | **24.5** | 6.4 | 12.2 | 6.9 | 8.5 |
| music brightness (centroid Hz) | 523 | 406 | 460 | 354 | 289 |
| effects stem LUFS | **-27.2** (loudest) | -33.3 | -32.8 | -33.6 | -39.7 |
| effects under the voice while talking (median dB) | **-19.5** | -23.1 | -30.4 | -25.0 | -30.4 |
| effect onsets in the film | **47** | 117 | 125 | 248 | 217 |
| effect onsets per 10 s | **7.4** | 15.6 | 14.9 | 28.5 | 25.6 |
| effect onset level vs the voice (median / p90) dB | -22.0 / -15.8 | -24.8 / -16.7 | -27.3 / -15.0 | -26.7 / -17.9 | -34.0 / -24.8 |
| effect brightness at the onset (centroid Hz) | **1389** | 1959 | 2836 | 1049 | 3096 |
| **ambience stem LUFS** | **-36.0** | -41.7 | -42.2 | -40.8 | -41.8 |
| ambience under the voice while talking dB | **-23.8** | -29.1 | -29.2 | -28.4 | -28.0 |
| seconds with a steady tone (800-6000 Hz, > 25 dB over its neighbours) in effects + ambience | **27.0 s at ~1058 Hz** | 21.8 s at ~1541 Hz | 7.2 s | 11.2 s | 4.8 s |
| voice-over-bed margin in 0.5-4 kHz per line (median / worst) dB | 16.1 / **6.8** | 17.3 / 11.0 | | | |

### 1d. Spectrum and width of the whole mix (all 13), in dB relative to the 400-2000 Hz band

| band | P | CL | AT | SO | TY | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| < 120 Hz (body) | **-10.7** | -8.1 | -6.3 | -8.8 | -8.5 | -5.8 | -5.1 | -7.1 | -7.5 | -7.3 | -4.4 | -6.1 | -6.2 |
| 120-400 Hz (warmth) | **+1.6** | +3.3 | +2.9 | +2.5 | +3.6 | +4.8 | +4.5 | +4.8 | +3.5 | +5.4 | +5.0 | +5.1 | +5.4 |
| 2-5 kHz (presence / harshness) | **-6.9** | -7.9 | -7.4 | -9.8 | -7.2 | -8.6 | -8.0 | -8.4 | -7.8 | -8.0 | -8.0 | -8.4 | -7.7 |
| 5-10 kHz | -8.9 | -7.7 | -5.5 | -9.7 | -6.1 | -6.4 | -6.5 | -6.6 | -5.5 | -6.6 | -6.1 | -4.7 | -6.1 |
| 10-16 kHz (air) | **-17.3** | -16.2 | -11.6 | -18.1 | -14.9 | -8.9 | -9.9 | -9.2 | -8.6 | -10.0 | -9.7 | -8.2 | -9.5 |
| spectral centroid Hz | **854** | 634 | 640 | 561 | 608 | 631 | 651 | 635 | 737 | 614 | 656 | 678 | 676 |
| side vs mid dB (width) | -19.8 | -25.9 | -26.2 | -27.7 | -27.8 | -29.7 | -23.8 | -27.5 | -26.6 | -23.9 | -25.5 | -20.9 | -27.4 |

Plain reading: **the new film is the thinnest and the most "middle-only" mix of all 13.** It has the least body below 120 Hz, the least warmth at 120-400 Hz and the highest centroid (854 Hz against 561-737). It is also among the dullest at the top (10-16 kHz -17.3 dB; the references -8 to -10). That is the sound of a small, boxy, honky speaker: all middle, with no warmth under it and no sparkle over it. The references are warm (their loudest band is 120-400 Hz, +3.5 to +5.4) and airy. The new film is also the widest of our films (side -19.8 dB; effects -4.8, ambience -3.9). That is not the problem, but it is the opposite of the references' centred, dry sound.

### 1e. The character voices (from the voice stem; spectrum relative to 400-2000 Hz)

| film / speaker | seconds | f0 median Hz | 120-400 Hz | 5-10 kHz | 10-16 kHz | 50 ms loudness spread p90-p10 dB |
|---|---|---|---|---|---|---|
| P narrator (James) | 31.7 | 210 | +2.5 | -7.4 | -15.8 | 19.3 |
| **P driver (Masaki)** | 5.1 | 159 | +0.5 | **-20.9** | **-27.7** | **38.6** |
| **P tourist (Flackoo)** | 11.7 | 138 | -1.7 | **-16.5** | **-26.4** | 25.3 |
| P kid (Kavya) | 1.4 | 228 | **-12.8** | -12.0 | -24.8 | 33.9 |
| CL narrator (James) | 52.8 | 196 | +3.6 | -7.4 | -16.3 | 16.9 |
| CL student / interviewer / friend / headphones / phone guy | 1.6-2.4 each | 239 / 286 / 300 / 189 / 133 | -2.2 to +3.3 | -7.2 to -14.9 | -16.4 to -21.6 | 9.4 to 20.7 |

The driver and the tourist are the two voices the film leans on. Both are **10-11 dB duller than the narrator above 10 kHz**: muffled, like a phone line. They are only 2.4 semitones apart in pitch (159 / 138 Hz), so they are easy to mix up. The audits already found that viewers give "DOORS... CLOSED!" to whoever is on screen. Their lines are full of holes (spread 25-39 dB against 9-21 dB for clown's people). The reason is that they are built as "word... [silence] ...WORD!" (see 2.3).

---

## 2. What exactly the clown mix did that this one does not

| | clown (loved) | pointing (rejected) | difference |
|---|---|---|---|
| first 0.3 s | music -31.2 dBFS and a hit -24.3 dBFS on frame 0; voice at 0.34 s | voice at 0.07 s, one rail click, ambience -42.7; **music digital silence until 2.70 s** | clown opens with a tune; pointing opens dry |
| narration share | 70 % of the film, 17 narrator lines | 47 %, 12 lines; the rest is 14 shouted or short character lines and holes | half the story is missing from the voice |
| narrator continuity | median pitch step 3.8 st between lines | 6.5 st | sounds like 12 separate takes, which is what it is (best take per line) |
| narrator talks to you | 7 "you / your"; 7 of 10 measured sentence ends rise (questions) | 2 "you / your"; 0 of 12 rise | clown plays a game with the viewer; pointing reports at him |
| music | 14 sections, each a steady groove (103 BPM quiz, 118 BPM ride, 100-102 BPM money); one level all the way (-30 to -37 dBFS after the quiz, 6.4 jumps per minute); never silent | 32 cues; a clear beat in 6 of 20 windows; 24.5 jumps per minute; silent 0-2.7, 21.1-22.7, 55.9-57.0 | clown has a pulse you can feel; pointing has a string of stings |
| music level | -20.3 dB under the voice; the quiz at -16 LU | -21.8 dB; most cues -19 to -24 LU | pointing's music is 1.5-3 dB lower and broken up, so it reads as "no music" |
| effects | 117 onsets, quiet (-33.3 LUFS, -23.1 dB under the voice), bright (1959 Hz) | 47 onsets, loud (-27.2 LUFS, -19.5 dB under), dull (1389 Hz) | clown = many small, light, funny details; pointing = a few heavy thumps and trains |
| ambience | -41.7 LUFS, -29.1 dB under the voice | -36.0 LUFS, -23.8 dB under, plus a 1 kHz motor tone for 29.5 s | pointing's bed is mostly train noise |
| warmth | mix 120-400 Hz +3.3, < 120 Hz -8.1 | +1.6, -10.7 | pointing is thinner |
| voice margin over the bed, 0.5-4 kHz | median 17.3 dB, worst 11.0 | median 16.1, worst **6.8** ("He is not.", 1.72 s), then 8.2 / 10.3 / 10.2 on the last three lines | the payoff is the most covered part of the film |
| ending | last 2 s at -15.0 dBFS (the rewind swell), music stops on the last sample | last 2 s at **-20.8 dBFS**, the quietest ending of all 13 films; "Bag... gone." is the quietest line (-19.8 dBFS, 3.7 dB under the narrator) | the punchline whimpers |

---

## 3. What is wrong with the new film's sound, ranked, with evidence

### 1. The voice track tells too little of the story: half the film is not narrated
- 131 words in 63.8 s. The references average 3.68 words/s (218-246 words). Our earlier films: 182-216 words.
- The narrator speaks 29.9 s (47 %). There are 18 gaps over 0.3 s, 8 over 0.6 s and 5 over 1.0 s. The references have 0-3 gaps over 0.3 s and none over 0.6 s.
- The holes: 33.68-36.36 (2.68 s; mix down to -42.0 dBFS at 35.75), 20.40-22.10 (1.70 s, -38.5 dBFS at 22.5), 42.62-44.04 (1.42 s), 30.72-32.02 (1.30 s), 48.90-49.96 (1.06 s), 59.26-60.10 (0.84 s).
- The audits flagged the 2.78 s hole. NOTES.md section E says the fix was "PREPARED, NOT DONE". It shipped as it was.
- This is the owner's "script is shit" heard through the speakers. The references never stop talking; this film stops 18 times.

### 2. The narrator jumps between moods line by line, so there is no storyteller
- Line medians: 227 -> 107 -> 235 Hz across the first 2.6 s ("His bag is on that train." / "He is not." / "All he did was laugh...": -13.1 st, then +13.5 st). Later: 282 Hz ("So he checks with a finger and a shout.", 11.54 s) -> 167 Hz ("First stop.", 14.12 s) -> 263 Hz ("His suitcase tries to get off...", 15.25 s).
- Median step 6.5 st, 7 of 11 steps over 6 st. Clown: 3.8 st, 2 of 16. References: 1.1-3.5 st across all sentences.
- Pace swings too: the sentence pace sd is 0.95 words/s, the highest of all 13 (references 0.39-0.66). "So he checks with a finger and a shout." runs at 4.33 words/s, the next line at 2.26.
- Cause (voice_info.json): every line is a separate best-of take (`v3_n04/t4`, `v3_n05/t4`, `v3_n0608/t5`, `v3_n11/t3`...). Each was chosen by its own score with no rule for continuity with its neighbours.

### 3. The music is 32 stings, not a score
- From the CUE_SHEET: 32 cues plus the departure melody. Most are 1-3 s long: "question" 1.5 s, "call1" 1.8 s, "breath" 1.4 s, "hope" 1.3 s, "dare" 0.7 s, "glideB" 0.7 s.
- Measured: a clear beat in 6 of 20 windows, and the tempo wanders (122, 143, 158, 130 BPM). The level jumps more than 6 dB from one second to the next 24.5 times a minute (clown 6.4).
- At the cuts the music steps by -23.3 dB (s05, 8.73 s), -13.8 (s06), -12.1 (s17), -10.7 (s19), -47.0 (s21, 55.83 s, out) and +79 (s22, back in).
- There is no music for the first 2.70 s, the most important seconds of the film. Clown, anti-theft and salad oil all have music under frame 0.
- It is the lowest music of our five films while the voice talks (-21.8 dB under it). A listener hears "no music, then a plink, then nothing". That is "no fun at all".

### 4. The bed is loud train noise with a whine in the voice's own band
- The ambience is the loudest of our films (-36.0 LUFS against -40.8 to -42.2) and only 23.8 dB under the voice (clown 29.1).
- A steady 0.8-1.3 kHz tone (the motor whine, the ElevenLabs departure and the cab hum) sounds for 29.5 s: 0.25-1.50, 3.50-7.00, 14.75-16.00, 20.25-21.75 (up to -29 dBFS), **23.50-27.00 (up to -24 dBFS)**, 46.25-48.75, 51.50-53.50, **59.25-63.75 (up to -23.5 dBFS)**.
- A pure tone at 1 kHz is the most noticeable sound the ear can hear, and it sits exactly where the narrator's vowels live.
- It is NOT a piercing 2-5 kHz whine. The effects plus ambience never come within 8.9 dB of the voice's 2-5 kHz level (loudest at 59.5 s). It is a dull, steady 1 kHz drone under the story, which is just as tiring.

### 5. The payoff is the worst-mixed moment of the film
- Voice margin over the bed in 0.5-4 kHz: "Doors... closed!" (57.01 s) 8.2 dB, "Bag... check!" (60.04) 10.3 dB, "Bag... gone." (62.12) 10.2 dB. The film's median is 16.1 dB; clown's worst line is 11.0.
- In 2-5 kHz, the effects come within 8.9-12.3 dB of the voice at 59.0-59.5 s, and the music within 5.7-9.4 dB at 61.0-61.5 s (the "call5" celesta + glockenspiel cue at -12.5 LU right on the kid's "check!").
- "Bag... gone." is the quietest line (-19.8 dBFS RMS, 3.7 dB under the narrator), its pitch is flat (range 1.0 st), and it sits on top of the -23.5 dBFS departure whine. The last 2 s measure -20.8 dBFS, the quietest ending of all 13 films (references -15.2 to -18.7).

### 6. The same laugh is pasted three times
- The tourist's laugh at 48.95 s (s18) is the same recording as the laughs at 56.9 s and 59.15 s. Correlation in the laughs stem is 1.00 / 1.00; in the final voice stem, 48.95 against 59.15 is 0.97.
- The fragments at 57.9 / 58.4 s repeat at 60.15 / 60.65 s (0.99-1.00).
- So in the payoff (56.9-61.0 s) the listener hears one 0.8 s laugh three times, 2.25 s apart. That is the canned, robotic sound the owner called fake.
- The s16a giggles (38.3-42.4 s) are a second take of the same laugh session.
- The hook also lays the tourist's laugh under the narrator (2.75-4.55 s, 12.7 dB under him, with more 2-5 kHz than his voice: share -7.5 dB against -16.2). So the first sentence the viewer must understand has a second voice talking over it.

### 7. One cadence, six times: "Signal... GREEN!", "Doors... CLOSED!" x2, "Vending machine... CHECK!", "Bag... CHECK!", "Bag... gone."
- Each has a true digital-silence hole in the middle: 0.385, 0.44, 1.03, 0.355, 0.37 and 0.47 s (voice_info.json `silences_inside_lines`). The narrator does it too: "laugh... at" 0.155 s, "looking... when" 1.00 s.
- These holes are why the driver's 50 ms loudness spread is 38.6 dB and the kid's 33.9 dB. The line goes word, silence, shouted word.
- The same rhythm six times in 63 s is a formula the ear tires of. Clown never repeats a cadence.

### 8. Effects are few, loud, dull and hard-panned
- There are 47 onsets (7.4 per 10 s), the fewest of our films (clown 117, anti-theft 125, salad oil 248, typo 217). Yet the effects stem is the loudest (-27.2 LUFS; the others -32.8 to -39.7).
- In the voice gaps, the mix has 19.2 transient onsets per 10 s of gap, the lowest of all 13 films (clown 35.2; references 33.8-64.8).
- They are dull (onset centroid 1389 Hz; clown 1959, anti-theft 2836): thumps, rolls, train joints and doors rather than crisp cartoon detail. They are also panned wide (effects side -4.8 dB against -10.8 to -17.6 in our other films).
- So the film sounds like a train documentary, not a cartoon.

### 9. Character voices are muffled and too alike
- Driver (Masaki) 10-16 kHz -27.7 dB, tourist (Flackoo) -26.4 dB, against the narrator's -15.8.
- Their pitches are 159 and 138 Hz (2.4 st apart).
- The kid (Kavya, a library "cute character" voice) has almost no warmth (120-400 Hz -12.8 dB) and jumps to about 400 Hz on "Bag... check!".
- None of them sounds like the narrator's world. Clown's five extra voices spread over 133-300 Hz and are speakers in a conversation, not callers.

### 10. The opening is dry and has a covered second line
- 0.0-2.7 s: voice, a rail click (-11 LU) and ambience at -42.7 dBFS. No music: the music stem is digital silence until 2.70 s.
- "He is not." (1.72 s) has only 6.8 dB over the bed in 0.5-4 kHz, the worst margin in the film. The rail clicks and the departure whine sit under the hook's turn.
- The references put the strange claim in one clean, warm, continuous sentence (Railroads: "He sawed gaps into a railroad every 39 feet.", 0.00-3.16 s, no hole).

### 11. Smaller faults
- **The phone replay is still lost.** Whisper on the FINAL film does not hear "What's a finger gonna do?" (42.47-43.80 s) at all. The transcript goes from "...on his phone." (42.62) straight to "Japan's railway lab" (44.04). It counts 131 words; the script has 136.
- **Abrupt ambience switches at cuts** (100 ms before vs after): s11 25.67 s -7.1 dB, s17 45.20 -7.4, s18 48.90 +11.4, s19 49.90 -10.3, s20 53.37 +7.7, s23 59.97 -6.0. Lab, platform, lab, platform within 8 s is choppy on the ear as well as on screen.
- **Word ends cut short:** four lines fall 30 dB within 10-15 ms of their end: "off..." (16.95 s), "back." (28.68), "it!" (37.88), "it." (45.91). The usual is 35-90 ms. Every line also ends in true digital silence ("every cut inside true silence with 8 ms fades"), so there is no room tone joining the voice together.
- **LRA 3.5 LU**: the widest with clown; the references are 1.7-3.2 (median 2.2).
- **Low whisper confidence words:** "check." 32.84 s p 0.30 ("Vending machine... check!"), "One," 52.52 s p 0.19 ("about one": the lab's key number), "it" 28.78 s p 0.17.
- **No click problems:** the sample-step ratio at all 25 cuts is 0.02-1.8, with no clicks of note. Loudness and true peak are within spec. These were never the problem.

---

## 4. Exact changes

### Changes that need the voice and script redone (the big ones)
1. **Rewrite for 195-220 spoken words in 60-65 s.** At least 75 % narrator time; at least 3.3 words/s over the film. No voice gap over 0.35 s except ONE designed beat of at most 0.8 s, before the payoff.
   - The 2.68 s, 1.70 s, 1.42 s, 1.30 s and 1.06 s holes must go. Today's 16.0 s of "silence and picture only" (voice_info) must come down to about 4 s.
2. **Re-record James in paragraphs, not lines.**
   - One take covers 3-5 sentences: the hook (0-5 s), the setup, the two stops, the "You see" explanation, the payoff. Pick takes by continuity: the narrator's line-to-line pitch step at most 3.5 st median, no step over 6 st except at "You see,".
   - Keep his centre near 175-200 Hz. No line over 240 Hz median: today 263 / 259 / 282 Hz on n07, n08, n05.
   - Direction: warm, amused, talking TO the viewer. At least 5 questions or "you" lines (clown had 7) and some rising ends.
   - Use one tag style for the whole film (e.g. [mischievously] for the story, [lowered voice] only for "You see,"). Do not use a different tag per line.
3. **Cut the "X... Y!" calls from six to two:** one plant ("Doors... closed!" at about 22 s) and one payoff.
   - Inner pause at most 0.25 s, not 0.36-1.03 s.
   - Drop "Signal... green!" or say it in the narrator's sentence ("...he points at the green light and shouts it").
   - Drop "Vending machine... check!" (no machine on screen anyway, per the panel audit).
   - Drop or rewrite "Bag... check!" / "Bag... gone." so the last line is a narrator line with the twist. The references end on the narrator's last word, 0.02-0.28 s before the end.
4. **Character voices:**
   - The tourist and the driver must differ by at least 5 semitones and sound full-band. Their 10-16 kHz must be within 6 dB of the narrator's; today it is 10-11 dB under.
   - Recast the tourist brighter and higher (target 180-220 Hz) or the driver lower and calmer (target 110-130 Hz), and record without lo-fi colouring.
   - Each speaking character needs at least 2 natural conversational lines, not calls only.
5. **Laughs:** record or choose at least 4 different laugh takes, and never play the same file twice. Today the clip at 48.95 s returns at 56.9 s and 59.15 s.
   - No laugh under narrator words in the hook (2.75-4.55 s): move it into the gap after "...at a finger." or drop it to -20 dB under the narrator.

### Changes in the mix (can be done on any voice)
6. **Music: a real score.**
   - 5-7 sections, each at least 6 s, each with ONE steady tempo: for example 104 BPM bouncy pizzicato + marimba for the setup and the stops, half-time for "You see," and a 110-120 BPM build into the payoff. Clown's map (14 sections, 103 / 118 / 100 BPM) is the model.
   - Start on frame 0, not at 2.70 s.
   - Level -17 to -18 LU under the voice while talking: raise the whole score about +4 dB from today's -21.8. Bed level jumps of at most 8 per minute (today 24.5).
   - At most 4 hits (the plant, the save, "You see", the payoff), and ONE full stop (just before the payoff line).
   - Delete the 1-2 s micro-cues: question, breath, hope, dare, glideA, glideB, blow_trem and the five separate CALL motifs.
7. **Ambience down, whine out.**
   - All train beds -5 to -6 dB (target ambience stem -41 to -42 LUFS, at least 28 dB under the voice).
   - Put a narrow cut (-10 dB, Q ~8) on the motor tone ridge at 0.9-1.2 kHz in `beds.py` / `foley.depart`, or keep the whine only inside the two departures (23.47-27.0 s and 59.3 s onward).
   - Even there, keep the whine at least 15 dB under the voice in 0.5-4 kHz. Today it reaches -24 / -23.5 dBFS against a voice at about -16 to -20 dBFS RMS.
8. **The payoff, 56.9-63.77 s.** Duck the departing train, the doors and the "call5" music 6 dB under every word, so all three last lines have at least 15 dB margin in 0.5-4 kHz (today 8.2 / 10.3 / 10.2).
   - Raise "Bag... gone." (or whatever the last line becomes) by +4 dB, so the last 2 s sit at -16 to -18 dBFS like the references (today -20.8).
9. **Effects: double the count, halve the weight.**
   - Lower the effects stem by about 5 dB (-27.2 -> -32/-33 LUFS, at least 25 dB under the voice).
   - Add light, bright details on every visible action, aiming for 110-130 onsets (15-20 per 10 s; today 47): footsteps, bag wheels on tiles, phone taps, cap flips, cartoon accents on gestures, crowd bits.
   - Aim for an onset centroid near 2-3 kHz (today 1389 Hz). Cut the heavy train joints and door thuds by 4 dB.
   - Pan effects narrower (side about -12 dB, like clown's -10.8).
10. **Warmth and air on the master.**
    - Today's mix measures (relative to 400-2000 Hz): < 120 Hz -10.7, 120-400 Hz +1.6, 10-16 kHz -17.3, centroid 854 Hz.
    - Targets: < 120 Hz about -6.5, 120-400 Hz about +4.5, 10-16 kHz about -11 to -12, centroid 620-680 Hz, matching the references.
    - Get there with a music bass line (pizzicato or upright bass carrying the groove), +2 dB at 200 Hz on the narrator, a little shaker / celesta air in the score, and less 1 kHz ambience. The EQ is a supplement to fixing the sources, not a substitute.
11. **Voice density.**
    - Level the narrator more tightly (a 3:1 compressor + slow leveller), so its 50 ms loudness spread drops from 19.3 dB to about 14 dB and the in-speech floor rises from -17.1 dB to about -11 dB (clown -11.5; references -8 to -9).
    - LRA target 2.0-2.5 LU (today 3.5).
    - Put room tone at about -60 dBFS between voice units instead of digital silence. Give every line end a natural 40-90 ms tail ("off..." 16.95, "back." 28.68, "it!" 37.88, "it." 45.91 are cut at 10-15 ms).
12. **Ambience across cuts:** cross-fade beds over 150-250 ms at s11, s17, s18, s19, s20 and s23, and keep the step under 4 dB (today -7.1 to +11.4).
13. **The phone replay:** either cut it, or make it audible in a full-film pass: +3 dB more, the bed ducked 6 dB, and checked with whisper on the WHOLE final film, not on a line window.

---

## 5. Why the references are better, in one table

| what they do | evidence | what we did |
|---|---|---|
| never stop talking | 0-3 gaps over 0.3 s, longest 0.22-0.54 s, 3.34-4.09 words/s | 18 gaps, longest 2.68 s, 2.05 words/s |
| one steady storyteller | sentence-to-sentence pitch step 1.1-3.5 st; 0-2 sentences over 5 st from the median | 7.0 st; 11 of 20 sentences |
| a dense, warm, compressed wall | in-speech floor -7.8 to -9.4 dB; 120-400 Hz the loudest band (+3.5 to +5.4); LRA 1.7-3.2 | -17.1 dB; +1.6; LRA 3.5 |
| air on top | 10-16 kHz -8.2 to -10.0 dB | -17.3 dB |
| quiet steady bed, effects in the gaps | bed about 18 dB under the voice, flat (style bible 10.1); 33.8-64.8 onsets per 10 s of gap | music -21.8 dB and chopped; 19.2 onsets per 10 s of gap |
| end on the narrator's last word, full level | tail 0.02-0.28 s; last 2 s -15.2 to -18.7 dBFS | tail 0.23 s, but the last 2 s at -20.8 dBFS on a flat, small character line |

---

## 6. Rules for every future film (sound)

1. A sound gate that only checks LUFS, true peak and sync is not a sound gate. Every mix must also pass these, measured on the FINAL file against clown and two references:
   - words/s at least 3.2;
   - longest voice gap at most 0.8 s;
   - narrator share at least 75 %;
   - narrator pitch step at most 3.5 st median;
   - music under the voice -16 to -19 dB with at most 8 level jumps over 6 dB per minute;
   - a clear beat in at least 70 % of six-second windows;
   - ambience at least 28 dB under the voice;
   - steady-tone time in effects + ambience at most 8 s;
   - effects 12-25 onsets per 10 s;
   - in-speech floor at -12 dB or higher;
   - mix centroid 600-700 Hz;
   - 120-400 Hz at least +3 dB;
   - every line at least 12 dB over the bed in 0.5-4 kHz;
   - the last 2 s at -18 dBFS or louder.
2. Record the narrator in paragraphs and pick takes by continuity with their neighbours, never line by line by a per-line score.
3. Music is a score of 5-7 sections with one tempo each, starting on frame 0. Never a cue per shot or per gesture.
4. Realism never beats fun: no recorded or generated machine bed may sit louder than -40 LUFS, and no steady tone may live at 0.8-1.5 kHz under the voice.
5. Never reuse a laugh, a shout or a giggle file within one film. Check with cross-correlation (fail at 0.9 or more).
6. At most two catchphrase calls per film, and never with a pause over 0.25 s inside the line.
7. The payoff gets the cleanest mix in the film, not the busiest: duck everything 6 dB under the last three lines.
8. Before showing any cut, run this benchmark (`studio/out/pointing/benchmark/sound/scripts/`) and put the table next to clown and two references. LESSONS #50 already said to compare with the earlier finals; it was not done here.

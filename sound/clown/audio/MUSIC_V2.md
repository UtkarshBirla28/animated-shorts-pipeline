# SCORE v2: "The Clown Nobody Saw" (rebuild, SCRIPT_v6.md)

File: `sound/clown/audio/music_v2.wav`. It is 48 kHz stereo 24-bit, 3,395,200 samples = 70.733 s = 2,122 frames. That is the voice (3,383,520 samples = 70.49 s, 2,115 frames rounded up) plus a 7-frame tail. Made by `music.py` (run `python -s music.py`, about 55 s). Nothing was listened to: every statement below is a measurement or a design intention, and the intentions are marked.

## Source and licence
- **The score is original and was synthesized in this repo.** The notes are written in `music.py` and the instruments are modelled in numpy / scipy in `instruments.py` (pizzicato string section, bowed strings, harp, celesta, glockenspiel, vibes, bassoon, clarinet, muted trumpet, upright bass, piano, woodblock, shaker, brushes, snaps). No samples are used, there is no third-party music, and no known tune is quoted: every motif was written for this film. It needs no licence or credit.
- Cut 1's circus score is kept, unused, as `music_cut1.py` for history.

### ElevenLabs Music was evaluated first and not used
Licence check on ElevenLabs' official pages (17 Nov 2026):
- [Music Terms](https://elevenlabs.io/music-terms) and [Eleven Music model-specific terms](https://elevenlabs.io/eleven-music-model-specific-terms), both "Last updated: 09 October 2026":
  - Starter Media Rights: "All online and offline commercial use permitted, except film, TV, radio, and Studio Games".
  - "No Attribution Required".
  - "Music Streaming Distribution: Prohibited", defined as "making Output available on a music streaming platform". YouTube is not named.
  - Syncing output to audiovisual content is part of Media Rights.
  - Limits: "For Individual Use Only", 17 minutes of generation and 30 minutes of download per month, and no lossless / 192 kbps downloads listed for Starter (the API nevertheless returned `pcm_48000`).
  - Section 4.4 asks users to follow a platform's AI-disclosure rules.
  - Reading: a monetised YouTube video made by an individual is allowed. That is my reading, not legal advice.
- [Pricing](https://elevenlabs.io/pricing): "Eleven Music 900 credits per minute"; Starter lists "Music commercial use".
- API used: [compose](https://elevenlabs.io/docs/api-reference/music/compose) with model `music_v2_5` and a chunked composition plan (`music_el.py`). The key was read at run time by `tools/el_api.py` and never printed or stored.

**Credits:** 426 of the 3,000 cap. The counter went 29,036 -> 29,462 (the voice log's last entry, 08:10, also reads 29,462, so nothing else was spent in between). That is two generations of the same 17 s test plan, 213 credits each, about 12.5 credits per second.
- The first take came back (HTTP 200) but my script could not save it: its output folder did not exist yet. That bug is fixed, and the take is logged as `test_1_LOST` in `_music/credits.jsonl`.
- The second take is `_music/test_2.wav`.
- A full 71 s score would have cost about 890 credits.

**Why it was not used: it measured worse than our engine on what the brief asks for** (numbers in the tables below):
1. **It is very dark.** The 4-8 kHz share is -36.5 dB and 8-16 kHz is -55.1 dB, against -19.4 / -20.1 for salad oil and -28.1 / -42.6 for cut 1. In the count section it is -47.5 / -58.0, and the half-second spectral centroid sat at 117-380 Hz: a bass pulse with no celesta sparkle. The brief asks for the 2-8 kHz air band to be alive, and an EQ cannot add energy 35 dB below the rest.
2. **It did not follow the section map.** The third section, the turn into intrigue, came back as 6 s of digital silence (-83 to -101 dBFS): the model ended the piece at about 11 s. The script needs hits placed to the word (a sting on "Five.", a hit on "suit.", a hush, a rewind, a stop at the seam); the engine places those on the voice's word times exactly.
3. Not a failure, for the record: no vocals (the recogniser heard nothing), side -10.4 dB, true peak -0.6 dBTP, LRA 4.5.

The brief allowed one short test. A second test with a different prompt (for example a plain prompt instead of a composition plan, asking for celesta and a bright high end) would cost about 210 credits; I did not run it.

## Section map (times read from the voice at run time: `sound/clown/voice/phrases.json` and `words.json`)
A rebuilt voice only needs `python -s music.py`. Frames are at 30 fps.

| s | frame | section | what the music does |
|---|---|---|---|
| 0.00 | 0 | QUIZ | 106 BPM, 4 bars from frame 0; a ticking woodblock clock (tick / tock), a staccato pizzicato ostinato over a D pedal with an inner line creeping up a semitone a bar (A Bb B C#), celesta sparks, shaker 8ths then 16ths from 'Don't lose count.', a sly clarinet + glockenspiel phrase only in the narration-free stretches of the count |
| 9.06 | 272 | ANSWER | the clock stops on a held tremolo A7sus4 ('How many?'); a bright D-major-add9 sting ON 'Five.' (pizz rolled up, glockenspiel, triangle); a light pizz walk under 'And the clown? You saw him, right?'; a two-note glockenspiel wink in the breath after 'right?' |
| 12.99 | 390 | THE TURN | hard cut: the floor drops; a soft low piano D, a bowed bass D, cold high string harmonics (A E), a falling celesta line F E D C# (unresolved); a low bassoon A leads into the office |
| 17.00 | 510 | ORIGIN | 104 BPM; office mischief: a creeping staccato pizz bass (D C Bb A G A Bb C#), brushes on the off-beats, a sneaky staccato bassoon line under the narration; 'I own a unicycle.': a pizz arpeggio up and a glockenspiel ping |
| 23.93 | 718 | SUIT | '...and a clown': the music holds its breath (one high tremolo); 'suit.': a COMIC HIT in Bb major (a harp glissando lands on a pizz chord, a short clean muted-trumpet stab, glockenspiel, bass, a snap) |
| 25.14 | 754 | RIDE | 118 BPM; the hour of riding: a bouncy syncopated bass, harp + pizz 8th arpeggios (Bbmaj7 F/A Gm7 C7sus), brushes on 2 and 4, shaker 16ths, a light clock tick, a glockenspiel line |
| 29.20 | 876 | INTERVIEWS | 118 BPM; light and quick, out of the dialogue's way: off-beat pizz dabs, a soft bass, shaker; tiny glockenspiel dabs only in the breaths between the four voices; it STOPS under 'Sorry... what clown?' (one held harmonic) and a low pizz + bassoon 'plonk' buttons it |
| 37.72 | 1132 | THE NUMBER | 79 BPM, half-time; incredulous: a held Gm(add9)/D, an A7sus tremolo from '1 in 4', a half-time bass, a questioning celesta (A D E, unresolved) after 'straight out,' |
| 42.30 | 1269 | MYSTERY | 70 BPM; hushed, leaning in: soft tremolo strings (Dm(maj7) -> Bbmaj7#11 on 'music' -> Gm6/Bb on 'You see,' -> A7b9 on 'someone'), harp harmonics one a beat, a soft heartbeat bass, the celesta mystery motif (D F E C#) after 'weird part:' and after 'You see,' |
| 50.02 | 1501 | MONEY | 103 BPM, 5 bars; sneaky tiptoe: a staccato pizz figure (quarters, then all 8ths from bar 3) doubled by a staccato bassoon, finger snaps from 'sneakier.', shaker from 'Nearly everyone', a falling pizz dip on 'ducked', a celesta counter-line; an A7 tremolo swells from 'On a phone?' and the whole band STOPS dead after 'money.' |
| 61.72 | 1852 | MIND-BLOW | almost everything drops: a soft low piano D, glassy string harmonics (A D E), three slow celesta notes; on 'minds' the harmony turns to a Bb colour (wonder) |
| 65.50 | 1965 | END | 122 BPM; a quick build on the quiz's ostinato (faster, rising, clock + shaker), a rising tremolo, glockenspiel pings on 'five' and 'clown'; CUT DEAD after 'clown.' |
| 68.44 | 2053 | HUSH | silence |
| 68.78 | 2063 | REWIND | a tape rewind of the quiz music (reversed, fast, pitching down) under 'Did you see the'; a reversed-reverb SWELL of the frame-0 chord through 'money?' to the seam; the music STOPS on the last sample (frame 0's downbeat answers it) |

Section spans, levelled against the voice by `music.py` (SECTION_TARGET, LU under the voice):

| section | from s | to s | target LU under the voice | gain applied dB |
|---|---|---|---|---|
| quiz | 0.000 | 9.060 | 16.0 | -15.4 |
| answer | 9.060 | 12.990 | 17.0 | -16.4 |
| turn | 12.990 | 16.995 | 20.0 | -22.0 |
| origin | 16.995 | 23.915 | 18.0 | -13.3 |
| suit | 23.915 | 25.145 | 14.0 | -19.8 |
| ride | 25.145 | 29.205 | 16.5 | -16.3 |
| interviews | 29.205 | 37.720 | 21.0 | -12.1 |
| number | 37.720 | 42.295 | 20.0 | -15.9 |
| mystery | 42.295 | 50.020 | 22.0 | -17.5 |
| money | 50.020 | 61.450 | 18.0 | -15.7 |
| mindblow | 61.720 | 65.495 | 23.5 | -13.5 |
| end | 65.495 | 68.445 | 16.0 | -16.9 |
| hush | 68.445 | 68.775 | silence | - |
| rewind | 68.775 | 70.733 | 19.0 | -10.4 |

Design choices (intentions; an ear has to confirm them):
- **Character:** a small mystery-chamber ensemble in a warm hall, in D minor. It turns to a bright major for the jokes: D major on "Five.", Bb major on the clown suit, F / Bb for the ride.
- **Percussion:** soft only (woodblock clock, seed shaker, brushes, finger snaps); no drum kit.
- **Phone speakers:** the bass line is doubled an octave up by cello pizzicato and lightly saturated, so it reads through a 400 Hz high-pass.
- **Width:** instruments are placed in an orchestral seating with constant-power pans, plus a stereo hall. There is no phase widening, so the mono fold-down loses almost nothing.
- **Air:** a +5 dB high shelf at 5 kHz on the bus. The quiet sections also carry the bow's breath on high harmonics and brush circles in the mystery.
- **Hard edges:** every cut (the turn, the held breath before "suit", the stop after "money.", the hush) cuts the hall reverb too. The score is rendered in five groups, each gated at its own edges.
- **The loop:** the music stops on the last sample with only a 3 ms de-click. The final swell is the reversed hall tail of the very chord that frame 0 starts on, so the loop lands on its own downbeat.

## Measurements
Measured by `music_v2_report.py` on `music_v2.wav` (70.733 s = 2122 frames, 3395200 samples, 48 kHz stereo 24-bit), levelled against `voice/voice.wav` as delivered (-17.5 LUFS). Nothing was listened to.

### Whole file against the references
| | integrated LUFS | LRA | true peak | side re mid dB | L/R corr | mono fold-down loss LU | 400 Hz high-pass loss LU | bass harmonics (250-700 Hz re 40-160 Hz) dB |
|---|---|---|---|---|---|---|---|---|
| score v2 (music_v2.wav) | -35.8 | 5.7 | -17.6 | -12.0 | 0.881 | -0.25 | -4.5 | -2.7 |
| saladoil score (approved) | -32.4 | 3.9 | -16.1 | -14.7 | 0.935 | -0.17 | -5.6 | -4.0 |
| clown cut-1 circus score (rejected) | -33.6 | 3.7 | -17.6 | -18.7 | 0.974 | -0.06 | -5.8 | -3.8 |
| ElevenLabs Music test (17 s) | -15.2 | 4.5 | -0.6 | -10.4 | 0.832 | -0.35 | -8.4 | -3.2 |

Octave-band shares (dB re each file's own 31 Hz-16 kHz total, so files at different levels compare):

| | 31 | 63 | 125 | 250 | 500 | 1k | 2k | 4k (2.8-5.6k: 4-8k octave) | 8k (8-16k) |
|---|---|---|---|---|---|---|---|---|---|
| score v2 (music_v2.wav) | -13.2 | -4.8 | -6.2 | -6.9 | -10.7 | -11.9 | -20.7 | -20.0 | -20.3 |
| saladoil score (approved) | -10.2 | -3.5 | -8.2 | -6.6 | -14.3 | -16.4 | -23.6 | -19.4 | -20.1 |
| clown cut-1 circus score (rejected) | -16.9 | -3.3 | -6.8 | -7.6 | -10.1 | -15.5 | -25.1 | -28.1 | -42.6 |
| ElevenLabs Music test (17 s) | -37.3 | -3.4 | -5.7 | -6.1 | -15.7 | -24.6 | -30.4 | -36.5 | -55.1 |

### Per section: level under the voice, air, width
music and voice = integrated LUFS over the section's span (the voice as delivered); 'under' = voice - music (target in brackets).

| section | span s | music LUFS | voice LUFS | under the voice LU | 4-8 kHz share dB | 8-16 kHz share dB | side re mid dB |
|---|---|---|---|---|---|---|---|
| quiz | 0.00-9.06 | -34.1 | -18.1 | 16.0 (16.0) | -19.2 | -18.7 | -12.7 |
| answer | 9.06-12.99 | -35.2 | -18.2 | 17.0 (17.0) | -24.4 | -39.1 | -12.4 |
| turn | 12.99-17.00 | -37.3 | -17.3 | 20.0 (20.0) | -41.4 | -43.5 | -17.0 |
| origin | 17.00-23.91 | -35.4 | -17.4 | 18.0 (18.0) | -21.1 | -22.0 | -14.1 |
| suit | 23.91-25.14 | -31.9 | -17.9 | 14.0 (14.0) | -21.6 | -38.6 | -11.1 |
| ride | 25.14-29.20 | -33.8 | -17.3 | 16.5 (16.5) | -17.4 | -17.3 | -12.3 |
| interviews | 29.20-37.72 | -38.8 | -17.8 | 21.0 (21.0) | -18.2 | -18.4 | -13.9 |
| number | 37.72-42.30 | -37.2 | -17.2 | 20.0 (20.0) | -33.6 | -35.6 | -9.7 |
| mystery | 42.30-50.02 | -39.4 | -17.4 | 22.0 (22.0) | -15.1 | -15.9 | -10.4 |
| money | 50.02-61.45 | -35.4 | -17.4 | 18.0 (18.0) | -20.5 | -20.3 | -11.5 |
| mindblow | 61.72-65.50 | -39.4 | -15.9 | 23.5 (23.5) | -30.1 | -31.0 | -7.5 |
| end | 65.50-68.44 | -33.4 | -17.4 | 16.0 (16.0) | -19.2 | -19.4 | -13.8 |
| rewind | 68.78-70.73 | -35.2 | -16.2 | 19.0 (19.0) | -21.9 | -26.3 | -6.5 |

### The seam, the hush, the cuts
- Loop seam: the last 50 ms are -34.8 dBFS (the swell at full), the first 50 ms -32.8 dBFS (the quiz downbeat: first note at 1.4 ms); the music stops on the last sample (a 3 ms de-click only); sample jump across the seam 0.00000 against a 99th-percentile sample step of 0.00381 in the last 0.3 s.
- The hush (68.44-68.78 s): digital silence.
- Where the music actually changes (spectral novelty peak within +-1 s of each planned section edge): answer 9.1 -> 9.2 s; turn 13.0 -> 12.4 s; origin 17.0 -> 18.0 s; suit 23.9 -> 23.9 s; ride 25.1 -> 24.4 s; interviews 29.2 -> 30.2 s; number 37.7 -> 37.6 s; mystery 42.3 -> 42.4 s; money 50.0 -> 51.0 s; mindblow 61.7 -> 61.7 s; end 65.5 -> 65.6 s; hush 68.4 -> 68.5 s; rewind 68.8 -> 68.6 s.
- Tempo read from onsets: 103.4 BPM overall (the regions run 104-122 BPM, see the section map).

### The ElevenLabs Music test, measured the same way
- 17.0 s planned in three sections (count / answer / turn): 17.04 s delivered, -15.2 LUFS, true peak -0.6 dBTP, side -10.4 dB.
  - the count (0-9.1 s): -15.6 LUFS, 4-8 kHz share -47.5 dB, 8-16 kHz -58.0 dB
  - the answer (9.1-13.0 s): -13.7 LUFS, 4-8 kHz share -30.1 dB, 8-16 kHz -50.8 dB
  - the turn (13.0-17.0 s): -inf LUFS, 4-8 kHz share -11.5 dB, 8-16 kHz -11.9 dB
  - recogniser hears: nothing (no vocals)


## What only an ear can judge
- Whether the synthesized pizzicato, strings, harp and bassoon sound premium or plastic. They measure like real instruments in band balance and width, but realism is not measurable.
- Whether the quiz feels like a ticking game show without being cheesy. The woodblock tick / tock in 8ths is the riskiest element; its level is the `tick` row of `TRACKS` in `music.py`.
- Whether the comic hit on "suit." is funny and not goofy (harp glissando + pizz chord + a short clean muted-trumpet stab; the first-cut doit was removed).
- Whether the tape rewind reads as a rewind under "Did you see the", and whether the swell into the seam loops cleanly into frame 0's downbeat and honk.
- Whether the turn (12.99 s) and the mind-blow (61.72 s) feel like the floor dropping or like a mistake. Both are deliberately dark: 4-8 kHz share -41 and -30 dB.

## Notes for phase B (the mix)
- **Level:** `music_v2.wav` is already levelled per section against `voice/voice.wav` as delivered (about 18.3 LU under it overall). Raise both by the same master gain. `mix.py`'s own per-section music levelling and its `MUSIC_TARGET` names are cut 1's: in phase B, either read `music_v2.wav` as the music stem and skip `section_db`, or call `music.build()` / `music.render(b, level_to_voice=False)` and re-target.
- **Ducking:** not applied. The mix's speech duck and 1-4 kHz band duck still apply.
- **Narration-free count stretches (2.1-5.1 s, 6.2-9.1 s):** the score carries the count there. The mix may lift the music there; it is already about 2.5 dB louder because no duck applies.
- **Length:** the film length is `ceil(voice) + 7` frames until a v6 `timeline.json` exists. `music.film_frames()` switches to the timeline automatically once its total is within 4 frames.
- `music.py` imports nothing from `timeline.py` (cut 1's timeline is still the exported one).

## Files
- `music_v2.wav` (the score), `music_v2_map.json` (sections, cues, gains), `music.py` (the score), `instruments.py` (new: `pizz_section`, `strings`, `bassoon`, `harp`, `shaker`, `saturate`)
- `music_measure.py` and `music_v2_report.py` (the measurements); `_music/music_v2_measure.md`
- `music_el.py` (the ElevenLabs Music helper), `_music/test_2.wav` and `_music/credits.jsonl` (the test and its credits)
- `music_cut1.py` (cut 1's score, unused)

## Phase B changes to the score (2026-11-18)
The score was accepted at the end of phase A. Phase B then needed four changes in `music.py`. The notes, instruments, section map and section levels are otherwise the same; `music_v2.wav` was rendered again (the 2,122-frame render of phase A is kept as `_music/music_v2_2122f.wav`).

1. **Length.** The file is now 3,387,200 samples = 2,117 frames, the exact length of the v6 timeline (the film ends 7 frames after the last word, not 7 frames after the voice file). `music.py` takes the length from `timeline.json` when it is within 12 frames of the voice.
2. **The tape rewind stops at the picture's freeze.** E3 rewinds for 16 frames, freezes for 18 frames on the first duck, then rewinds on. The score's reversed quiz music now ends where the freeze starts (69.23 s) instead of running through it; the swell under "money?" is unchanged and still stops on the last sample.
3. **The quiz rule.** The two ducks of the count are at 4.43 s and 6.97 s. In the phase A version both fell on a bar line of the quiz music: the inner line stepped up there, the bar got louder, a celesta spark rang, and the second clarinet phrase entered on the second duck. Now:
   - the bars start on beats 2, 6, 10 and 14 (a two-beat pick-up from frame 0), so every step of the harmony and of the level falls between the ducks;
   - celesta sparks ring only at frame 0, 3.40 s and 7.92 s (none under the narrator, none within 0.2 s of a duck);
   - the first clarinet and glockenspiel phrase starts as "phone." ends (2.12 s) and is over before the first duck; the second starts at 7.22 s, after the second duck;
   - the bass stays on D until the last two beats (A, the dominant before "How many?");
   - the pizzicato ostinato is spread evenly left and right (it sat left of centre before; the bills are upper-left), and the clarinet moved from left to slightly right.
   Only the steady pulse (pizzicato 8ths, bass every two beats, the clock, the shaker) runs through the ducks.
4. **Nothing else.** The sections after the quiz are note for note as in phase A.

Measured in the final mix (`SOUND_EVENTS_V2.md` section 9): at the first duck the score is an ordinary moment of the count (louder than 55 % of the count's other 0.4 s windows). At the second duck it is louder than 97 % of them, because the count builds bar by bar by design; the same slice of the groove two beats earlier and later reads within 1.6 dB of it. Whether that build draws attention at the second duck is for an ear to judge; if it does, the fix is to hold the last bar's level flat (one number in `music.py`).

## p3 changes (2026-11-18, voice v6b, 2246 frames)
`music.py` was re-run on the new voice; the score is again exactly the film's length (3,593,600 samples = 2,246 frames). The section map was checked against the new line times (`music_v2_map.json`):

| section | s | what was checked / changed |
|---|---|---|
| quiz | 0.00-9.33 | the first clarinet + glockenspiel phrase now starts after "phone." ENDS (2.42 s; the 0.34 s lead-in had moved it under the word); bar lines at 1.17 / 3.50 / 5.83 / 8.17 s, both duck windows (4.50-4.90, 7.03-7.43 s) between them; no spark or phrase note in a window. The count's +6 dB lift is applied in the mix (`mix.py COUNT_LIFT`, one flat stretch), not here |
| number | 38.32-42.89 | now ends on "Many" (S13's hard cut): the held chords release in 0.07 s there |
| **spun** (new) | 42.89-44.69 | the restored "Many spun around to look.": a staccato Bb-major pizz chord on "Many", a quick harp glissando up on "spun around", a held Bbmaj7 tremolo under "to look." (the score leaves its D floor for one bar: the audit's p1) |
| suit | 24.51-25.74 | the comic hit moved from the word "suit." to the BAG OPENING (STORY-1's flash_snap cue, f 750 = 25.00 s; `bag_open_t()`); target -15 LU under the voice (was -14: it now sits under the student's "clown") |
| money | 52.42-63.85 | stops dead after "...stopped for the money." (63.82 s): digital silence until "Their" (64.32 s) |
| mindblow | 64.32-68.44 | target -27.5 LU under the voice (was -23.5): measured 8.4 LU under the money section (near-silence); the last celesta note rings into the 0.5 s after "saw it.", no new onset |
| end | 68.44-71.60 | unchanged; cut dead after "clown." |
| rewind | 71.63-74.87 | the reversed quiz music now starts ON E3's hard cut (71.633 s, in the hush) with the picture's rewind and the tape whirr, not on "Did"; it stops where the hold starts (73.20 s). The swell of the frame-0 chord: its reversed tail grew ~40 dB over 1.8 s, so under "money?" it measured -57.7 LUFS in the first p3 run; its growth is now compressed (divided by 92 % of its own envelope, a 0.5 -> 1 rise), so it is a soft swell under "money?" (raw -37.8 LUFS, the voice -10.3) and still lands at frame 0's level at the seam (-36.7 vs -37.5 LUFS), stopping on the last sample |

Tracks are float32 now (half the memory; the PC was shared with a render).

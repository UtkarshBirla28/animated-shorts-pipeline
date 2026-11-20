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

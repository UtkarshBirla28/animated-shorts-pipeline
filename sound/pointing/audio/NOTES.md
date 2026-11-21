# pointing: SOUND notes (owner: the sound agent, 2026-11-19)

## AUDIT ROUND 1 FIXES (SOUND #3, 2026-11-21, laptop): done / next
- 04:50 done (step 1, the new clock): `mix_v4.py --probe` (re-probes the DIRECTOR's timeline.ts into `_clock_v4.json`): 2066 f = 68.867 s, mix exactly 3,305,600 samples; loop section counted back from L on the hook's beat and NOT cut at L (its ring folds onto frame 0), a held A7 + pickup over the last beat; the END bed rings to the last sample (no fade); room tone under the 0.49 s tail (no digital zero). Cues follow the clock (EV words / shots); press clicks = Go onset + 2.5 f (PRESS_LAG), red press = red + 4.5 f (no EV for presses yet: asked of the DIRECTOR). Before-audit mix kept: `mix_v4_2054f_before_audit.wav`, stems + report in `_before_audit/`, sources as `_*_before_audit.py.bak`.
- next: the five majors re-measured (red hit, steam engine, shouts, line 22, + minors), the gate, mp3.
- 05:15 done (step 2, the majors + fix lists; mix_report_v4.json has `hook.red_hit` and `hook.loop_join` now): RED (hook_v4: boom 90->38 Hz saturated + louder stab/recorded hit + crack 2.5-6 kHz, cut dead at the end of "Go!"; Go 7 -1 dB) 200 ms after the red -21.5 dBFS vs -28.5..-29.9 for the green Gos (was -28.7), < 150 Hz -23.8 vs -32.6 (was -32.5), 30-150 Hz -23.7, crack band -28.1, the loudest non-voice event of the film (next: -23.5 at 21.47, the line-8 hit). STEAM (cues_v4: the recorded pass + a synthesized run with rail joints for ALL of v22 on sfx, the fields air on amb, 0.2 s cross-fade into the cab beds v23-v31 with wheels + fire): v22 effects -38..-43 dBFS every 0.25 s (was -43 then -76 / zero), ambience never zero 35.2-52.6 (min -55.3; was digital zero 35.5-37.9), all beds min -41.1. STEAM MUSIC (tiptoe + held strings / bassoon): < -55 dBFS in 0 % of talking frames (was 33 %), voice-music median 18.7 dB (was 30.5). SHOUTS (voice: D = v4_D t7, C = v4_C t5, see voice/NOTES.md; mix: +2.6 char lift + SHOUT_GAIN, cab room): RMS D -15.8 / H -16.3 / C -15.7 vs neighbours -17.0..-18.2 (was 0 dB lift). LINE 22: unchanged (voice notes: every take drops 6.6-10 st). Minors: "She did." 12.7 dB (was 11.4), line 11a 15.4 (13.2), music steps up at section changes <= 2.9 dB (7.8 / 6.4 / 5.1; the only bigger change is the designed hit after line 21 decaying), brakes out of the pause before "subway" (-79 dBFS there, was -44), last 2 s -18.0 dBFS (last sentence +2.3 dB), loop join: sample step 0.008, last 50 ms -29.1 vs first -28.3 (was -41.4 vs -30.3), ambience -47.5 -> -49.9 across the seam, no digital zero. -14.0 LUFS, -2.9 dBTP, LRA 2.2. Gate reads voice_v4/phrases.json (sentences) for the v4 film now.
- next: the gate (sound_gate.py --tag v4), the opening refresh (--opening), mp3s.
- 05:17 done (steps 3-5): credits 34,974 -> 35,064 (90, all on the 8 shout takes; no SFX bought). Two whisper pauses: music -4 / -3 dB in the gaps after "pointing:" and "sign:" (MUSIC_DUCK_GAPS), the sign crinkle moved off '"Point'. GATE `sound_gate.py --tag v4` (sentence phrases, whisper medium): 21 of 22 (was 20 of 22): pitch step 2.9 st PASS (was 4.0 per line), longest gap 0.56, worst sentence 12.6 dB, last 2 s -18.0, -14.0 LUFS / LRA 2.2 / -2.9 dBTP; only FAIL words/s 2.73 (the narrator's pace; owner asked for slower). Whisper hears "SIGNAL CLEAR!" twice and "CLEAR!" as shouts; still invents "In addition," (p 0.08-0.13) in the 0.29 s pause after "pointing:" (voice -62 dBFS there, sfx -79, music ducked: a recogniser artefact, nothing audible) and gives '"Point' p 0.05 (the narrator's quote voice). Files: `mix_v4.wav` = 2066 f exactly (3,305,600 samples, 24-bit), `mix_v4_2054f_before_audit.wav` kept, `opening_v4_mix.wav` refreshed (8.17 s; there the master's partial-voice limiter touches beep 6 by 1.0 dB, film mix 0.24), owner mp3 `pointing_preview/SOUND_v5_full_mix_after_audit (draft).mp3`.
- next (for the DIRECTOR / lead, nothing running): (1) export EV.press[6] + EV.redPress (finger landings) so the clicks read the picture instead of PRESS_LAG 2.5 f / RED_PRESS_LAG 4.5 f in hook_v4.py; (2) re-import the two moved shout words into v4/words.ts if the mouths should follow (voice_v4/shout_swap.json); then re-run `mix_v4.py --probe` and `--opening --probe` (one command each, ~3 min).
- 05:25 done (lead: press events): clock_v4 reads the DIRECTOR's "EV" block (timeline_v4.json; a --probe json has none, so it takes his EV on the same 2066 f clock); hook_v4: BEEP on EV.goFlashes (the Go onsets), CLICK on EV.press[0..5] (4-7 f later), red click on EV.redPress (5.98 s), red hit still on the red cut; mix_report hook.clicks = every click onset within 0.0 f of its event (7 of 7); 0 drift voice/clock after the shout re-import; mix_v4.wav 2066 f; opening + mp3s refreshed. Use `mix_v4.py` WITHOUT --probe now (retime_v4.py keeps timeline_v4.json + EV current).
- next: nothing running; re-run `mix_v4.py` and `mix_v4.py --opening` after any re-time or CAST press-timing change.
- 09:05 done (AUDIT r2 level work, NOT time-locked: the picture is being re-staged): `mix_v4.make_heard` measures every SEEN action the auditor's way (effects 1-8 kHz vs voice+music+amb, 80 ms from the cue; 49 cues incl. the 7 press clicks), carves music + ambience 1-8 kHz under it (<= 8 dB) and lifts the cue (<= 22 dB) with two guards: its peak 3 dB under the voice's peak there (no limiter hits) and no SENTENCE under 12.6 dB over the beds. Median -20.4 -> -6.4 dB; 23 of 49 within 5.5 dB of the rest (before 6); every sentence >= 12.7 dB. Brighter, low-crest clicks (her dome; v16 auto-taps = bright plastic, were all < 1 kHz); v10b re-sheeted ONE BY ONE (X pop + slam 1.5 f before + flap per flip) on `EV.xPops` / `EV.boardFlips` (provisional fallback: the 08:01 picture's offsets from the v10b cut); v22 entrance whistle + 3 big chuffs (sfx 50 ms peak -29.8 vs music -35.6, was -37 / -32.7; the tiptoe's first bar -3 dB); birds on EV.birdsLift (fallback v22 + 0.17 s); boing cut; sting -2 dB more ("She did." 13.9); red: beds 200 ms -18.0 (was -21.4), overall 250 ms -15.0 vs Go beats -15.4..-15.9 (the voice's "Go!" dominates; Go 7 now -2 dB); train glide lv -17; doors / chime on EV.doorsOpen (fallback). Still masked (on words, guards hold them): Go 3-5 clicks -8, counter ticks -10..-13, kitchen door -14, cat -17, chime -13, the sign lift -21 (the crinkle in the pause next to it is +1.6).
- next: on the lead's "events locked": `mix_v4.py` + `--opening` once (all v10b / taps / doors / birds / engine cues read EV; the dropped list in mix_report names any EV still missing), then move the still-masked cues into voice gaps where the new picture allows (doors + chime into the gap after "board.").

## NEW PC: done / next (SOUND #2, 2026-11-20)
- 16:00 done (step 1, the opening): everything now hangs on `clock_v4.py` (the DIRECTOR's timeline_v4.json + the voice's words, re-cut on the voice when they drift). `hook_v4.py` rebuilt to the lead's brief (groove from frame 0 on the Go grid, the run on A7 with a climbing pizz, 6 identical green beeps, the RED hit = stab + ElevenLabs hit t2 + crack + her late click, the held beat at true zero, the room back 40 ms before "Did", the sting + X pop on "She"). `cues_v4.py` re-sheeted on shots / words (83 cues, every [cue] of the shot table). `mix_v4.py` = the v4 mix. ONE COMMAND: `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/mix_v4.py --opening --voice=sound/pointing/voice_v4_opening/voice.wav --words=sound/pointing/voice_v4_opening/words.json` -> `sound/pointing/audio/mix_opening_v4.wav` (the DIRECTOR's `--audio=`). ElevenLabs batch 1 (opening): red_hit x3, x_sting x3, lamp_on x2, lab_room x1 (`sfx_eleven.py`; lab_room came back near-silent: unusable).
- next: the opening gate (`sound_gate.py --tag opening_v4 --opening`, clown + 2 refs cut to the same seconds), fix what fails, then the full film on the voice.
- 16:30 done (step 3 on the opening): `sound_gate.py --opening` measures our opening next to the SAME first seconds of clown + R_railroads + R_jobjapan (the benchmark's analyze.py on the cut). Fixed by measurement: opening cut at v05's end (8.07 s, the voice's end), narrator EQ lifted (the v4 takes are dull: raw 10-16 kHz -29 dB), 6:1 voice compressor (the Go run keeps 3:1: a hard squeeze lifts its grid-cut tails), groove not ducked under the run, effects -1.5..-3 dB, the beep's ring 24 ms (a longer pure-tone ring counted as a second onset). 19-20 of 23 pass; left: narrator pitch step (VOICE: "Did you tap?" ~140 Hz after the Go run ~257 Hz), in-speech floor (-16 vs clown -14, refs -7/-8: the Go run's gaps), air 10-16 kHz (-12.4, rule -12), music level on the edge. Output names for the DIRECTOR: `opening_v4_mix.wav` (= mix_opening_v4.wav) and `mix_v4.wav`. Go tails: `go_check.py` (Go 4-6 cut by the grid; the beep sits on each cut at the tail's own level, Go 6's cut at -15 dB goes straight into "Go!" + the red hit).
- next: the full film through `mix.py` (wired: it hands over to mix_v4.py; `--v3` = old), the music gate on its stem, then the full voice from VOICE (`sound/pointing/voice_v4/voice.wav` + words.json: mix_v4.py picks them up by itself).
- 16:50 done (step 2): the full film on the evening clock (61.53 s, plan words after line 3) through `mix.py` -> `mix_v4.wav` (+ stems, CUE_SHEET_v4.md, sound_times_v4.json, stem_music_v4.json): 7 sections (hook 135 grid / lab 112 / why 109 half-time / today 118 / steam 100 tiptoe / new york 117 build / loop 135), 96 cues, payoff lines 20-22 with every bed 6 dB down. Line 18's music stop dropped (one full stop only: the held beat). Music gate on the film stem 8 of 8 (beat 0.84 vs clown 0.87, 4.9 jumps/min vs 6.4, 18.9 LU under, warmth +5.3). Opening gate 21 of 23. Keys fixed for the locked text: W(5,"press"), today = (11,"so"); unresolved words are now reported, not silent.
- 17:00 done (step 4, the lead's go): ElevenLabs batch 2 bought (14 sounds, 27 takes), 17 takes kept in cues_v4.REC_FOR, the rest rejected by measurement (list below). Full film re-mixed with them: `mix_v4.wav` 61.533 s = the clock's 1846 f exactly; steady tone in effects + ambience 1.5 s over the film (rule <= 8 s: the dark steam / subway beds pass in context). The full voice is NOT in `sound/pointing/voice_v4/` yet: stopped here as the lead asked.
- 17:45 done (the full real voice, 68.47 s = 2054 f): `mix.py` (no arguments) -> `mix_v4.wav` exactly 2054 f, 0 drift voice / clock (185 of 185 words); opening refreshed -> `opening_v4_mix.wav` (8.17 s); owner mp3s `pointing_preview/SOUND_v4_full_mix (draft).mp3` + `SOUND_v4_opening_mix (draft).mp3`. Changes for the gate: fewer effect onsets (the point wave 12 -> 7, birds / pigeon / steps fewer, the steam pass 2.4 s, the subway arrival 2.0 s, the glide 1.6 s), the last line +2 dB and half the payoff duck (last 2 s -17.8 dBFS), narrator compressor threshold 40 -> 33 % (floor -10.8), shouts brightened (CHAR_EQ_V4: D and H now match the narrator at 10-16 kHz; the coal man's take has nothing up there), hook music 17.5 LU. New shots: v10b board on "anyway", v36a lamp tick + the lab room from v36a. Film gate 20 of 22 (fails: words/s 2.75, narrator pitch step 4.0: the voice / script). Opening 21 of 23 (fails: pitch step 4.9, floor -14.1 = clown). Music gate 8 of 8. Re-run 17:37 on the DIRECTOR's 17:30 clock (v28 at line 17): 0 drift, mix_v4.wav 2054.0 f.
- next (on resume, in this order): (1) `tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/mix.py` (no arguments: it finds voice_v4/voice.wav + words.json; check the DIRECTOR re-timed timeline_v4.json on that voice first, so the clock shows 0 drift and the length is the final clock's); (2) the same with `--opening` (refreshes opening_v4_mix.wav from the full voice's opening); (3) `sound_gate.py --tag v4` (film gate next to clown + R_railroads + R_jobjapan) and `--tag opening_v4 --opening`; (4) ffmpeg mix_v4.wav -> `pointing_preview/SOUND_v4_full_mix (draft).mp3`. Old wording of this step: when VOICE installs `sound/pointing/voice_v4/` run `tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/mix.py` (no arguments: it finds voice.wav + words.json there), then `sound_gate.py --tag v4` (the full film gate, whisper medium, minutes) and fix what fails; then the second ElevenLabs batch (list below) if the lead agrees.

### The ElevenLabs list (step 4; the key is in since 15:55, SOUND cap 1,200 credits, about 10 credits per second)
Run each with `tools/.venv/Scripts/python.exe -s sound/pointing/audio/sfx_eleven.py <name> <s> <takes> "<prompt>"`, `pt_credits.py sound_<label>` before and after.
BOUGHT 15:46 (opening, 182 credits by the counter: 32,835 -> 33,017; 1,018 of the cap left): red_hit 1.0 s x3 (t2 used: the body of the red hit), x_sting 1.2 s x3 (kept as alternates: the synthesized in-key sting stays), lamp_on 0.8 s x2 (t2 used under the bip), lab_room 10 s x1 (near-silent, unusable).
NOT bought on purpose: the Go beeps (a synthesized 1760 Hz tone is exact in pitch, level and timing, identical six times) and the MUSIC (it must ride the voice's accelerating Go grid, stop dead on a sample for the held beat and re-time with the clock: generated music cannot).
BOUGHT 16:52 (batch 2, the lead's go; counter 34,068 -> 34,686, about 570 of it SOUND's; SOUND total about 750 of 1,200): the 14 below, 27 takes.
KEPT (cues_v4.REC_FOR; the synthesized sound stays as the fallback): switch_t1, counter_t2 (first click), flapboard_t1/t2 (counter 101, boards, departure board), fridge_t2, cereal_t1, glide_in_t2, steam_pass_t2 (the hard cut; no tone), steam_cab_t1 (the cab bed), whistle_t1, shovel_t1/t2, subway_in_t2, doors_open_t1, cardboard_t1/t2.
REJECTED (cues_v4.REJECTED): lab_room2_t1 (near-silent again, -71 dBFS: the room stays synthesized), subway_in_t1 (a ~1 kHz squeal), fridge_t1 (thump, no clink), glide_in_t1 (hiss only), steam_pass_t1 (thinner), whistle_t2, doors_open_t2 (thump only); spares: cereal_t2, switch_t2, counter_t1.
WATCH: steam_cab_t1 and subway_in_t2 read as 'steady tone' 0.8-1.2 kHz by the gate's detector (dark recordings: partly the spectral slope); if the film gate's steady-tone row fails, drop them from REC_FOR.
The list as bought:
| name | s x takes | prompt |
|---|---|---|
| lab_room2 | 8 x1 | "Quiet bright laboratory room tone, clearly audible: steady soft air-conditioning hiss and a gentle electrical hum, a little distant shuffling. No voices, no beeps, no music." |
| switch | 0.8 x2 | "A big old electrical lever switch thrown hard: a chunky metal clunk with a short spring twang. Dry, close." |
| counter | 0.6 x2 | "A mechanical tally counter clicking over three times quickly: small dry plastic flicks." |
| flapboard | 1.0 x2 | "A split-flap information board flipping: a quick rattling cascade of small plastic flaps, then stop." |
| fridge | 1.2 x2 | "A kitchen fridge door opening: the rubber seal unsticking, a glass jar clinking on the shelf. Close, dry." |
| cereal | 0.8 x2 | "A cardboard cereal box shaken once: a short dry rattle of flakes." |
| glide_in | 3.0 x2 | "A modern Japanese commuter train gliding into a sunny platform and stopping smoothly with a soft air-brake sigh. No announcement, no melody, no voices." |
| steam_pass | 4.0 x2 | "A 1910 black steam locomotive thundering past through open fields: heavy rhythmic chuffs, clanking side rods, a rush of steam, passing close then moving away. No whistle, no voices." |
| steam_cab | 8.0 x1 | "Inside the cab of an old steam locomotive at speed: a steady muffled chuff rhythm, the firebox roaring softly, metal rattles. No voices, no whistle." |
| whistle | 1.2 x2 | "An old steam locomotive whistle: one bright breathy blast, short." |
| shovel | 1.0 x2 | "A coal shovel scraping into a pile of coal and throwing it into a firebox: a gritty scrape and a rattle." |
| subway_in | 4.0 x2 | "A New York subway train pulling into an underground station: rumbling wheels, a long gentle brake squeal, stopping. No announcement, no voices." |
| doors_open | 1.5 x2 | "Subway car doors sliding open: a quick mechanical slide and a soft thump. No chime, no voices." |
| cardboard | 0.8 x2 | "A big cardboard sign lifted up quickly: a hollow flap and a crinkle." |

## V4 HANDOVER (2026-11-20, the laptop is switched off; a fresh team continues on another PC)

Nothing of mine is running. Nothing was ever played out loud: every statement is a measurement.
All paths are relative to the studio root `animated-shorts-studio/` unless written in full.

### What exists (all in sound/pointing/audio/)
- `score_v4.py`: the v4 SCORE ENGINE (clown's method).
  - Section map `V4_SECTIONS` on SCRIPT_v4's 22 lines: hook 1-3 (hook_v4) / lab 4-8 (from "She did.") / why 9-11 / today (11 "which"..12) / steam 13-18 / newyork 19-21 / loop 22.
  - Hits after lines 8 and 21; a comic button after line 10; line 18 dry. The loop section is counted back from L on the hook's beat.
  - `v4_map(lines, words, L)` and `film_score(...)` re-time it from the voice. `plan_lines()` gives PLAN times from script_v4/lines_v4.json.
  - Test: `--test` (a 60 s map) -> `_score_v4_test.wav`. `--film-plan` (the whole film on plan times, 70.2 s) -> `_score_v4_film_plan.wav` + `.json`.
  - Music gate on the film-plan score: PASS 8 of 8 (beat share 0.86, 6.8 jumps / min, 15.7 LU under the voice, centroid 390 Hz).
- `hook_v4.py`: the HOOK.
  - A groove from frame 0 that the seven "Go"s ride: the pre-beats are the first Go gap, fitted to whole beats back to frame 0. Chords Dm Bb Gm A7; the Go run lands on the A7 bar.
  - A 1760 Hz beep + a soft click on EVERY Go, identical on all seven.
  - On the red: the music and the hall cut dead, a low soft thud, room tone only.
  - The sting on "She did.", then the groove returns (the lab, 112 BPM).
  - Test: `--test` -> `_hook_v4_test.wav` (+ `_music`, `_fx`, `.json`). It is in the owner's preview folder as "SOUND_TEST_hook_first_10s (no voice yet).mp3".
- `cues_v4.py`: the v4 CUE SHEET on line / word anchors, with new synthesized sounds.
  - Lab: room, counter ticks, presses, red X's, a clipboard, chairs. Kitchen: fridge, door, cereal.
  - Platform + cab: air, crows, a glove snap. Steam: a 4 s thunder at the hard cut, then the duller cab chuff, a whistle, the shovel.
  - New York: rumble, brakes, our two-tone door chime, the sign.
  - Test: `python -s cues_v4.py` -> `_v4_plan_bed.wav` (+ `_sfx`, `_amb`, `_music`). Measured: 17.5 effect onsets / 10 s, onset centroid 1822 Hz (both inside the rules).
  - NOT yet on the director's v4 clock / CAST beats: it uses the voice's words only.
- `mix_targets.py`: ambience trim (28 LU under the voice), effects bright + trim (21 LU), a 0.8-1.5 kHz tone suppressor under words, room tone, the 3:1 narrator compressor (set in mix.py), and the master tone match. ON by default in mix.py; `--v3-targets` turns it off.
- `sound_gate.py`: the real gate (BENCHMARK section 6), next to clown + two references. `--music file.wav` gates a score alone. Baseline on the rejected v3 content: 7 of 22.
- `film_clock.mjs`: reads the director's timeline.ts / CAST's beats (v3; check it on the v4 clock).

### The lead's decisions (keep them)
- The music is SILENT through "Did you tap?": the question hangs in room tone.
- The sting lands on "She did." exactly as built, then the groove returns.
- (OUT OF DATE, audit r1: there is NO beep on Go 7 by the shot table: six identical green beeps, then the red hit.) The six beeps are identical in level and pitch: check that no limiter changes them.
- The beep and click must never mask the word "Go" (1760 Hz sits clear of the voice; measure it once the voice is in).
- If James's line 1 runs past about 2.83 s, RE-FIT the pre-beats to the real first "Go" (the engine does this: whole beats back to frame 0). Never squeeze the voice.
- No laughs anywhere. Machines only on story events. Light and bright effects.

### Next steps, in order
1. When VOICE installs v4 into `sound/pointing/voice/` (`voice.wav`, `words.json` / `words_spoken.json` with the seven Go onsets of line 2 as words, `phrases.json`):
   - make the voice's lines / words the input of `score_v4.film_score` and `cues_v4.render`;
   - lines = phrases in film order (22), words = words.json.
2. Wire v4 into `mix.py`:
   - replace the v3 `build_buses()` (cues.py / beds.py / score.py) with `score_v4.film_score` (music bus; the hook's beeps / clicks / thud go to sfx) and `cues_v4.render` (sfx + amb buses);
   - keep the voice chain, the phone-free voice (v4 has no replay and no laughs), mix_targets, the master and the reports.
   - The v3 machinery (tl.py, cues.py, beds.py, score.py, fold / CUT1 extended time) is v3-specific. For v4 the loop is handled inside score_v4 (the tail folds onto frame 0).
3. When the director regenerates the v4 clock: move the cue anchors that belong to pictures onto shots / CAST beats (`tl.EVT` / `tl.CAST` style, film_clock.mjs). Make the ambience cross-fade 150-250 ms at the cuts.
4. Run, each ALONE (4-core machine; never two heavy jobs at once). Working directory: the studio root `animated-shorts-studio/`:
   - `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/mix.py > sound/pointing/audio/_mix.log 2>&1`
   - `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/sound_gate.py > sound/pointing/audio/_gate.log 2>&1` (whisper medium on CPU: several minutes)
   - `... sound/pointing/audio/line_check.py <line ids> --pad 0.1` (does a line read in the finished mix)
   - Tests, from `sound/pointing/audio/`:
     - `../../../tools/.venv/Scripts/python.exe -s hook_v4.py --test`
     - `... score_v4.py --film-plan`
     - `... sound_gate.py --music _score_v4_film_plan.wav`
     - `... cues_v4.py`
5. Iterate until the gate PASSES. Check the hook's seven beeps, the 0.5 s stop and the loop seam (line 22 into frame 0). Then message the lead.

### Files OUTSIDE sound/pointing/ that the mix, score and gate read (copy them to the new PC)
- `tools/.venv/` (the Python venv; recreate it if the path changes): Python 3.12.3, numpy 2.5.4, scipy 1.18.1, soundfile 0.14.0, faster-whisper 1.2.1, ctranslate2 4.8.5.
- `studio/out/pointing/benchmark/sound/`:
  - `scripts/analyze.py` (sound_gate imports it);
  - `data/*.metrics.json` (clown + the 8 references' measures: the gate's comparison columns);
  - `wav/*.wav` (the final audio of our 5 films + the 8 reference Shorts, only needed to re-measure).
- `sound/clown/audio/stem_music.wav` and `stem_voice.wav` (the music gate's reference).
- The benchmark also measured `sound/<clown|antitheft|saladoil|typo>/audio/stem_*.wav` and `.../voice/phrases.json`. Only needed to re-run the benchmark.
- `studio/src/videos3/pointing/` (timeline.ts, words.ts, cast/, sets/, shots.ts) and `studio/node_modules/` (esbuild): `film_clock.mjs` bundles them. Node v22.14.0.
- `studio/src/videos/clown/` and `studio/src/kit/` (imported by the film's cast and sets when film_clock bundles them).
- Inside this folder, but large: `sound/pointing/audio/_lib/*.wav` (the CC0 recordings + the ElevenLabs effects `emu_jp_eleven.wav`, `door_jp_eleven.wav`, `giggle_x02_t2.wav`) and `_lib/_sources.json`; `sound/pointing/audio/_eleven/` (all takes + `credits_log.jsonl`).
- `sound/pointing/voice/` (the installed voice; `takes/` for unused takes).
- Whisper models (Hugging Face cache): `C:\Users\utkar\.cache\huggingface\hub\models--Systran--faster-whisper-medium` (the gate) and `...--faster-whisper-small` (speech_check / line_check / sfx_speech). They download again on first use if missing.
- ffmpeg on PATH (ebur128, AAC check, rubberband filter used once for `emu_jp_eleven.wav`).

### ElevenLabs
- Sound effects went through the ElevenLabs MCP server (user scope); 275 credits spent, logged in `_eleven/credits_log.jsonl`. `tools/el_api.py` reads the API key at run time:
  - first from the file `~/.secrets/elevenlabs_api_key`;
  - else from `~/.claude.json` (mcpServers.elevenlabs.env);
  - the env var `EL_KEY_FILE` can point to another key file.
  - Never copy a key into the repo.

## v4 (2026-11-20, after the owner's verdict "sound is shit" and the benchmark `studio/out/pointing/benchmark/BENCHMARK_sound.md`: 3/10 against clown 6.5, the references 8.5)

The film is rewritten (SCRIPT_v4: a true story, ONE narrator, about 200 words, no AI laughs). Everything below the line
"STATE 2026-11-20" describes the rejected v3 film and stays as history.

### THE RECORDING RULE for the VOICE owner (from the benchmark: pitch jumped 6.5 st line to line because takes were picked line by line)
1. Record the narrator in PARAGRAPHS: one take covers 3-5 sentences (the hook; the setup; each place; the "why"; the payoff). Never one line per take.
2. Pick takes by CONTINUITY with their neighbours, never by a per-line score:
   - the narrator's line-to-line pitch step at most 3.5 st median, no step over 6 st (one exception allowed for a designed turn);
   - the centre near 175-200 Hz, no line over 240 Hz median;
   - pace steady: sentence words/s sd at most 0.6; at least 3.3 words/s over the film.
3. One direction tag style for the whole film (e.g. [warm, amused, to the viewer]); no tag per line. At least 5 lines spoken TO the viewer (questions / "you"), some rising ends.
4. No digital silence inside a take: keep the take's own room between sentences (cut at most at 0.35 s pauses), every line end gets its natural 40-90 ms tail.
5. Never reuse a laugh / shout file; at most two "X... Y!" calls, with an inner pause of at most 0.25 s.
6. The sound gate checks all of this on the final file (`sound_gate.py`): words/s, the longest gap, narrator share, pitch steps.

### THE SOUND GATE: `sound_gate.py` (new)
- `python -s sound_gate.py [--tag x]` measures the FINISHED mix with the benchmark's own analyze.py (same windows, same thresholds, whisper medium).
  It prints each number next to clown and two references, and FAILS unless every rule of BENCHMARK section 6 holds:
  - voice: words/s >= 3.2, longest gap <= 0.8 s, narrator share >= 75 %, narrator pitch step <= 3.5 st;
  - music: -16..-19.5 dB under the voice, <= 8 level jumps per minute, a clear beat in >= 70 % of 6 s windows;
  - beds: ambience <= -28 dB under the voice and <= -40 LUFS, steady tone in effects + ambience <= 8 s;
  - effects: 12-25 onsets / 10 s, <= -25 dB under the voice, onset centroid 1.8-3.2 kHz;
  - mix: in-speech floor >= -12 dB, centroid 600-700 Hz, 120-400 Hz >= +3 dB, 10-16 kHz >= -12 dB, every line >= 12 dB over the bed in 0.5-4 kHz;
  - ending and loudness: last 2 s >= -18 dBFS, -14 LUFS, LRA <= 3.2, true peak <= -1 dBTP.
- `python -s sound_gate.py --music score.wav` gates a SCORE alone against clown's music stem.
  Rules: music from frame 0, no silent run over 0.8 s, beat share >= 70 %, <= 8 jumps / min, 15-19.5 LU under the voice, centroid 250-700 Hz, warmth >= 0 dB, 5-7 sections of >= 6 s.
- Results: `sound_gate.json` / `sound_gate_music.json`. Exit code 0 = PASS.

### THE SCORE ENGINE v4: `score_v4.py` (new; replaces the 32-cue score.py for v4)
- A section map of 5-7 sections, each >= 6 s, ONE tempo each: the tempo is fitted to whole bars within 6 %.
- Grooves: `bounce`, `tiptoe`, `halftime`, `build`, made of the clown chamber band: pizz section, upright-bass pizz (saturated + an octave above for phones), marimba, harp, celesta / glock, shaker / woodblock / brushes / snaps, bowed strings for holds.
- Hits: at most 4, each 3 LU over its section. ONE full stop.
- Each section is levelled to its own LU under the voice (16.5-19).
- Music from frame 0. The last bar ends on the film's last sample, and its hall tail folds onto frame 0 (the loop).
- Test: `python -s score_v4.py --test` renders a 60 s test map (hook 104 bounce / setup 104 bounce / stops 104 tiptoe / why 104 half-time / build 115 / payoff 105 + a stop).
  - Gate result (2026-11-20): PASS 8 of 8 against clown's music stem.
  - Beat share 0.84 (clown 0.87), jumps 4.0 / min (clown 6.4), 15.8 LU under the voice (clown 16.6), centroid 400 Hz (clown 406), warmth +2.1 dB (clown +3.9).
  - The half-time "why" windows read as no clear beat (0.15-0.18), by design.

### THE MIX TARGETS: `mix_targets.py` (new; on by default in mix.py, `--v3-targets` turns them off)
After the buses are automated, and before the master:
- the ambience stem is trimmed to 28 LU under the voice;
- the effects are brightened (+3 dB at 3.5 kHz, -3 dB under 180 Hz) and trimmed to 21 LU under the voice;
- an STFT tone suppressor cuts steady 0.8-1.5 kHz tones (12 dB over the local spectrum) by 12 dB while words sound;
- room tone at 46 LU under the voice replaces digital silence in the voice stem;
- the narrator compressor is 3:1 (was 2:1);
- a master tone match (applied identically to every stem, so the stems still add up): low shelf 110 Hz, bell 230 Hz, high shelf 11 kHz, moving the mix toward the references' bands (clamped).

Baseline: the REJECTED v3 content mixed with these targets (`mix_v4t.wav`), through `sound_gate.py --tag v4t`: 7 of 22 pass.
- The ambience is now -41.5 LUFS, 29.0 dB under the voice (passes; it was -36.0 / 23.8).
- Effects: 27.7 dB under the voice, onset centroid 1865 Hz (both pass; they were 19.5 / 1389).
- Warmth 120-400 Hz: +3.6 dB (passes).
- Still failing, because they belong to the v3 voice and score:
  - words/s 2.02, longest gap 2.64 s, narrator share 0.50, narrator pitch step 4.8 st;
  - the v3 music (21.6 jumps / min, beat 0.35) and the v3 effect count (6.0 / 10 s);
  - the in-speech floor (-18.8), the line margin (10.5), the last 2 s (-21.0), LRA (4.4);
  - centroid 726, air -14.5, steady tone 12.5 s (the suppressor acts only under words).
- These are for the v4 content to fix: the v4 voice, the v4 score map and the v4 cue sheet.

### THE v4 SCORE MAP (drafted on SCRIPT_v4_draft.md, 06:40): `score_v4.V4_SECTIONS` / `v4_map(lines, words, L)`
- Sections, each starting at its first line: hook (lines 1-3) 104 bounce; hori (4-10) 100 tiptoe; lab (11-17) 108 bounce; why (18-22) 104 half-time; newyork (23-26) 112 build.
- Hits after lines 9 ("squinting"), 17 ("not one"), 22 (the punchline) and 26 (the last word).
- THE stop: line 14, from "Then..." to "red", as the script's delivery note asks.
- Not wired into mix.py yet: that waits for lines_v4.json and the v4 voice.

## STATE 2026-11-20 (second sound owner; replaces the 00:30 handover block)

Nothing was ever played out loud. Every number below is a measurement. Paths are under `sound/pointing/audio/` unless written in full.
Python: `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s`, from the studio root. Log to a file, never pipe into `head`.

### (A) THE SHOTS AND ACTIONS NOW COME FROM THE FILM (new)

- `film_clock.mjs` (node, uses the studio's own esbuild, writes nothing in the studio) runs the DIRECTOR's
  `studio/src/videos3/pointing/timeline.ts` (cuts, EV events, ONSET_FIX), the lab set's `labPlan()` (sets/lab.cams.ts) and
  CAST's beat table (`cast/beats.ts` through `cast/acting.ts`: every point, call, ear and snap, in frames). It does this on THE SAME voice the
  mix uses: `<voice>/words.json` stands in for `words.ts` (what `tools/gen_words_ts.py` writes into words.ts), so the sound and
  the picture agree even before the director regenerates words.ts. `node film_clock.mjs` alone prints the film as it stands.
- `tl.py` calls it on import (cached in `_cache/film_clock_<key>.json`; the key = every .ts of the film + the voice's words.json),
  takes the shot table from it (`SHOT_SRC` = "the film's timeline.ts"), and exposes two anchor functions to every cue expression:
  `EVT('brake', <fallback anchor>)` = `EV.brake`, and `CAST('driver', 'call', 'checks', 'snap', <fallback>)` = when that move lands
  (part: `lock`, `f0`, `f1`, `out`, `ear`, `snap`, `push`; a call's `snap` = snapAt + snapLen (+ the kid's 6 f late); a point's `lock` = f0 + move).
  If node or the film breaks, `tl.summary()` prints "!! THE FILM'S CLOCK COULD NOT BE READ" and the old rules are used (`PT_NO_FILM=1` forces that).
- `tl.summary()` lists every cut that differs from the old rule copy (`tl.CUT_RULES`, kept only as the fallback).
- `cues.py`: the door / train / suitcase events ride `EVT(...)` (glideA/B, chimeA/B, lampsOutA/B, stopA, doorsOpenB, bagCreep, footHook,
  brake, bagBump, phoneSwing). The doors OPEN in 1.5 s (the platform set's door cycle), they close in 1.3 s. Every snap, point, ear,
  jab, guns, hook, pat, hop, cap drop / push rides `CAST(...)`. The lab = `labPlan()` itself (6 tinks, 18 presses, both bars). The melody's
  pulse = the film's (`LAB_CUES.pulse` = 5.5/12, the same as the caption's music note), from `EV.melody0`.
- `score.py`: THE CALL motifs and the action hits (creep, hook, brake, bump, pats, the boy's silent point) use the same anchors (`SNAP_*`, `CREEP`... in cues.py).
- `mix.py`'s cache key includes `tl.FILM_KEY`: a change in the film re-renders the stages that depend on it.

Cuts that differed (the old copy -> the film, on the v3 voice):
- **Cut 2** (s03): 4.837 -> **4.667 s = f140**. The director's ONSET_FIX table puts "finger" at 4.69 (the measured /f/), against 4.87 in words.json.
- s16b: 42.465 -> 42.400 (f1272). s17: 45.240 -> 45.200 (f1356). Everything else is the same frame (cut 1 = f81 = 2.700 s; it was 2.710 unrounded).
- Actions that moved the most: driver's s06 snap 12.57 -> 13.42 s (now ON "shout", as CAST plays it); kid's s06 copy 13.02 -> 13.62;
  cap drop 13.58 -> 12.71; brake 12.95 -> 12.64; bag bump 13.50 -> 13.06; station-A doors open 15.59 -> 16.17 (and 1.5 s long);
  station-B doors 26.68 -> 27.27; s08 kid's snap 17.33 -> 17.00; s19 snap 51.22 -> 51.57; s24 arm 62.12 -> 61.70; pats 27.61 -> 27.25.

### (B) MEASURED (mix_v3, 01:04, the v3 voice build in `sound/pointing/voice/_v3`, film clock as of 00:55)

- -14.00 LUFS integrated, true peak -2.90 dBTP, LRA 3.6 LU (ffmpeg: I -14.0, LRA 3.6, TP -2.9). After AAC 256k: I -14.0, TP -2.8 dBTP.
- Stems: voice -13.7, music -31.7, sfx -27.9, amb -36.2 LUFS; they sum to the pre-limiter mix within 2.2e-16. Master limiter max 1.51 dB.
- Hook 0-12 s: -13.6 LUFS; no music before cut 1 (digital silence).
- Loop seam: sample jump 0.0093 against a p99 step of 0.0189 before it; effects 40 ms before / after -30.8 / -32.2 dBFS, ambience -41.3 / -41.0.
- check_mix: 79 sharp cues, 77 inside -1 f .. +2 f. The two outside are overlaps, not late cues: s14.step's window holds the boy's
  louder snap 0.10 s later, and s17.press16 sits 54 ms after ball 5 (the lab set's own timing). s09.lamps shows no rise: by design it is soft under the doors.
  Harshness: everything else peaks 7.0 dB under the voice's loud consonants at 2.5-6 kHz; 0 moments within 6 dB.
- (Section C has the word-margin and limiter findings.)
- `line_check.py` on the final mix.wav (and stem_voice.wav), heard: v3_t07 "Bag gone", v3_k01 "Bag check!",
  v3_n08 "And the boy's finger saves it", v3_n04 "But that driver has a thousand people behind him." (log `_line_check.log`).

### (C) THE OPEN ITEMS OF THE 00:30 HANDOVER, SETTLED

- **"the" of v3_n08 (17.64 s, -10.1 dB)** is a meter artefact of the word times. In voice.wav, 17.64-17.73 is the decay into a 20 ms gap before "boy's":
  -59 to -79 dB in 1-4 kHz, against -26 to -37 dB for the words around it. The spoken "the" is the end of the "...and" window (17.56-17.64),
  which has a 12.8 dB margin in 1-4 kHz (19 dB in 200-1000 Hz). Nothing covers it.
- **"a" of v3_n04 (9.89 s)**: the take nearly drops it. In voice.wav it is -39 to -44 dBFS full band and -58 to -64 dB in 1-4 kHz, about 35 dB under "has" and "thousand".
  It is a weak schwa with almost nothing in 1-4 kHz, so the meter's 1-4 kHz margin means little.
  `line_check.py` (whisper on the FINISHED mix) hears "But that driver has a thousand people behind him." and "And the boy's finger saves it":
  both words read through the mix.
- **Voice peak limiter 8.6 dB** was one word: "finger" of v3_t03 (24.68 s, the tourist's lifted line; then "check!" 6.0, "Bag..." 5.9, "This" 5.9).
  `VPEAK_CREST` 9.5 -> 10.5 (see the last mix's numbers below).
- **LRA 3.6 vs the gate's 3.5**: from the designed quiet (s14 no voice, s18 / s21 the held beats, "Bag... gone." small by design). Left as a WARN.

### (D) AUTHENTICITY (what was replaced, what is still generic)

- **Crows: now JAPANESE.** These are jungle crows recorded in a Sapporo park (`_lib/crows_sapporo.wav`, Freesound 390250 by pflanigan, CC0, in LICENSES.md).
  The caws were cut by measurement: `crow_1` 9.30-9.70 s, `crow_2` 4.93-5.30, `crow_3` 19.85-20.40 (top 1.1-1.25 kHz, the round "kaa"). The far-crows bed of
  platform B is the same file, low-passed at 3.2 kHz. The European files (crow_caw_1/2, crows_cawing) stay in `_lib/` unused.
  The speech check flags `crows_far` and `crow_2` "SPEECH?" because whisper writes the caws as あ / "A, A, A" on the caw times. No human voice:
  probe_ride shows no speech-band swing outside the caws, and the en 0-2 s line has no_speech 0.59 over a -48 dBFS floor. Reviewed in speech_check.json.
- Downloaded and NOT used yet (CC0, in `_lib/`, listed as unused in LICENSES.md):
  - `birds_kashiwa.wav` (361918): Japanese birds near Kashiwa, with car / engine tags and a steady 188-211 Hz tone. It could replace the Belgian sparrows after a speech check and an ear.
  - `platform_kashiwa.wav` (361913): a JR platform, 310 s. It has announcements and jingles. Train passes at 4-12 s and 280-310 s, but no clean departure whine was found by measurement, so it is not used.
- **ElevenLabs sound effects (lead-approved, cap 600 credits; 275 spent).** Counter 37134 before, 37409 after. Every prompt and the counter are in `_eleven/credits_log.jsonl`;
  all takes are in `_eleven/` (mp3 + 48 kHz wav); `emu_measure.py` and `sfx_speech.py` are the measuring tools.
  - **The departing train** (4 takes, 5 s each, 50 credits each). Measured with `emu_measure.py` (the strongest tones per 0.25 s, the tracked ridge):
    - take 2 has a clean tone from frame 1 that rises 891 -> 1043 Hz (+17 %) over 3.5 s at 24 dB prominence, tonal 100 % of the time;
    - take 1 rises 973 -> 1125 Hz but fades out by 3.75 s;
    - takes 3 and 4 are weakly tonal (53 % / 42 %).
    - The OLD departure (Australian EMU + motor) is FLAT: 1102 Hz +0 %, then 2203 -> 2250 Hz (+2 %).
    - Take 2 is used, stretched to 0.76x tempo with ffmpeg rubberband (6.58 s; ridge 891 -> 1137 Hz, +28 %), as `_lib/emu_jp_eleven.wav` (lib cut `emu_jp`).
    - It replaces the Australian whine in `foley.depart` (`DEPART_WHINE`). Our motor model stays under it at -8 dB (`MOTOR_DB`, carrier 1000 Hz).
      Measured on the payoff's own timing: JP alone rises +12 %, JP + motor -8 dB rises +16 % over 5 s, against the old -2 %.
      The Australian recording's roar of passing cars and the clatter bed still take over from 4.67 s, as before.
    - The recogniser hears no speech in takes 1 and 2.
  - **The closing doors** (3 takes, 2.5 s each, 25 credits each).
    - take 3 has one continuous slide of about 1.5 s, ONE thud (low band -11 dB) as the leaves meet, and no tone over 6.9 dB prominence;
    - take 1 has a 0.35 s gap before its thud;
    - take 2 is a whoosh, then clicks.
    - Take 3 is used, cut from 0.20 s so the slide is the film's 1.3 s, with the meet at 1.30 s, as `_lib/door_jp_eleven.wav` (lib cut `door_jp`).
      It plays for every closing (`foley.DOOR_CLOSE`), with our synthesized slide 12 dB under it (`SYNTH_UNDER_DB`). The openings stay synthesized. No speech in any of the 3 takes.
  - Both are in LICENSES.md as "ElevenLabs (generated)", with their prompts. They are not CC0.
- **Still generic, honestly:**
  - The roar of the passing cars (after the whine) is still the Australian recording.
  - The sparrows are Belgian (house / tree sparrows chirp alike at bed level).
  - The vending machine is a non-Japanese compressor hum.
  - The door chime is OUR two notes, not JR's.
  - The PA murmur is synthetic and wordless on purpose. The car interior IS a Tokyo recording (JR Chuo Line).
  - The ElevenLabs train and doors are generated: "Japanese" by prompt and by the measured rising whine, not by a recording made in Tokyo.

### (E) THE FINAL RUN (01:33, untagged, the INSTALLED voice in `sound/pointing/voice/` + the film's timeline.ts)

- Files: `mix.wav` (63.767 s = **1913 f**: timeline.ts TOTAL = round((63.65 + 0.10) * 30); voice.wav is 63.750 s), `stem_*.wav`, `hook_0-12s.wav` (+ .mp3), `hook_0-12s_ME.wav`,
  `mix_preview.mp3`, `CUE_SHEET.md`, `sound_times.json`, `mix_report.json`, `LICENSES.md`. Log `_mix.log`; check `_check.log`.
- **-14.01 LUFS, true peak -2.90 dBTP, LRA 3.46 LU** (ffmpeg I -14.0, LRA 3.5, TP -2.9), inside the gate. After AAC 256k: I -14.0, TP **-2.7 dBTP**.
  Master limiter max 2.27 dB, > 0.5 dB on 4.8 % of samples (it was 0.7 % with VPEAK_CREST 9.5). This is the price of the lighter voice limiter:
  7.6 dB max now, against 8.6. Stems: voice -13.5, music -31.5, sfx -27.7, amb -36.0 LUFS; they sum to the pre-limiter mix within 3.3e-16.
- Hook 0-12 s: -13.6 LUFS, no music before cut 1. Cut 1 f81, cut 2 f140.
- **Loop seam**: jump 0.0086 against a p99 step of 0.0170. Without the voice, 60 ms before / after: -30.7 / -30.5 dBFS. Effects 40 ms: -31.2 / -31.3. Ambience: -39.5 / -40.4. Music silent on both sides.
- Word margins: median 19.4 dB, p10 8.0, 25 dips. Under 7 dB: only the two artefacts of (C) ("a" 2.4 dB with the voice at -59 dB; "the" -10.3 dB with the voice at -68.5 dB).
- Sync: 77 of 79 sharp cues in the window; the two others are the overlaps of (B). Harshness -7.1 dB, 0 moments.

- **Re-run at 01:57, with the ElevenLabs train and doors (section D).** This is the current mix.wav.
  - -14.01 LUFS, true peak -2.90 dBTP, LRA 3.5. After AAC 256k: -14.0 LUFS, true peak -2.8 dBTP.
  - Master limiter max 2.21 dB, > 0.5 dB on 3.5 % of samples. Stems: voice -13.6, music -31.5, sfx -27.0, amb -36.1 LUFS.
  - Hook -13.7 LUFS.
  - Loop seam: jump 0.0048 against a p99 step of 0.0384. Effects 40 ms either side: -27.0 / -26.8 dBFS. Without the voice, 60 ms either side: -27.4 / -26.3 dBFS.
  - The payoff whine in stem_sfx, every 0.5 s from the glide (59.3 s) through the seam: 891, 902, 938, 938, 938, 938, 949, 961, 1008, 1043, 1043 Hz.
    The passing cars' roar follows: 1277-1336 Hz.
  - Sync is the same as before (77 of 79 cues, the two known overlaps).
- **Re-run at 02:10 on the FINAL film clock (timeline.ts of 02:02) and VOICE's hand-measured body onsets.** This is the current mix.wav.
  - Cuts (film_clock.mjs): 0 81 140 212 262 344 416 509 623 719 770 874 943 1020 1053 1150 1272 1356 1467 1497 1601 1675 1706 1799 1855, end 1913 f.
  - 87 cast beats.
  - -14.01 LUFS, true peak -2.90 dBTP, LRA 3.5. After AAC: -14.0 LUFS, true peak -2.7 dBTP. Hook -13.7 LUFS.
  - Loop seam: jump 0.0048 against a p99 step of 0.0385. Effects 40 ms either side: -27.0 / -26.8 dBFS.
  - Sync: 77 of 79 cues (the known overlaps). No clear rise for two soft cues:
    - s09.lamps (soft by design);
    - s10.handle (-27 LU, 58 ms after the s10 cut, at the edge of the plant's departure).

- **Re-run at 03:21: the NEW shot s03b** (the driver's face close-up, f164-212; s03 is now f140-164). This is the current mix.wav.
  - `tl.py` now takes the shot LIST from the film, so a new shot needs only a `PLACE` entry (s03b = cab).
  - `beds.py`: the cab bed covers s03 + s03b as ONE span. The ambience in 20 ms steps over the cut reads -36 to -39 dBFS, with no step.
  - New cues: s03b.hum (`foley.cab_hum`, synthesized instrument-panel hum, -31 LU, 0.12 s fade-in) and s03b.ear (CAST's ear, f171.5).
  - s03b.snap (CAST's snap at full stretch, f196; the whoosh starts f193) at -9 LU, with `fwip(crisp=1.0)` (a tight bright burst on the lock, a shorter tail).
    Peak -8.7 dBFS, 2 kHz+ peak -9.3 dBFS: the sharpest effect of the opening (the next is rail click 0: -10.9 / -19.3).
    At -7.5 LU it drove the master limiter to 2.8 dB, so it was lowered. The master limiter's 2.45 dB max is now the shouted "green!" (voice peak -2.6 dBFS) under the snap; elsewhere at most 1.4 dB.
  - The s03 music cue runs on unchanged through the cut.
  - Numbers: -14.01 LUFS, true peak -2.90 dBTP, LRA 3.5. After AAC: -14.0 LUFS, true peak -2.7. Hook -13.7 LUFS.
  - Seam: jump 0.0048 against a p99 step of 0.0385; effects 40 ms either side -27.0 / -26.8 dBFS. Sync: 77 of 79 (the known overlaps).

- **Re-run at 03:45 (the fix round: TRAIN's s21, CAST's LIFE block, STATION's walkers).** This is the current mix.wav. 159 event cues, 205 in all.
  - s21: `s21.hum` (cab_hum, -30) and `s21.point` (cloth, -29).
  - s22.pilot: a relay tick, -31 LU, low-passed at 1.8 kHz, at EV.lampsOutB + 5 f = f1752.8.
  - s16a: shake, notification blip, 4 thumb taps, a walker.
  - s13: hip, bob, roll, a walker.
  - Walkers `*.walk*` in s09 / s12 / s13 / s16a at -31..-33 LU.
  - Numbers: -14.01 LUFS, true peak -2.90 dBTP, LRA 3.5. After AAC: -14.0 LUFS, -2.7 dBTP. Seam: jump 0.0048.
  - Sync: 97 of 101; the misses are walkers under louder story sounds, plus the two known overlaps.
  - The departure melody still ends on EV.melody1 (54.88 s), before s21.

- **Re-run at 03:54: the s16a giggles.** This is the current mix.wav.
  - Source: the tourist's UNUSED take `voice/takes/v3_x02/t2`, as `_lib/giggle_x02_t2.wav` (lib cuts `giggle_a` 0.06-1.08 and `giggle_b` 1.63-2.72).
    The build uses only x02/t1 0.84-2.74, in s18. It is in LICENSES.md as ElevenLabs-generated (the voice's own take, no new credit).
  - Cues `s16a.giggle1` and `s16a.giggle2` sit on CAST's laughs @s16a+6 and @s16a+92, at -15 / -16 LU.
    `foley.giggle`: 220 Hz-2.6 kHz, far air, panned -0.35.
  - Measured: 21.6 / 22.8 dB under the narrator (RMS), 25.0 / 22.8 dB in 1-4 kHz. No v3_n11 word needed a dip.
  - `line_check.py v3_n11` on mix.wav: word for word.
  - Numbers: -14.01 LUFS, true peak -2.90 dBTP, LRA 3.5; after AAC -2.7 dBTP; seam jump 0.0048; sync 97 of 101.

- **Re-run at 05:46: the audit's SOUND must-fix, the phone's replay (v3_r01, s16b).** This is the current mix.wav.
  - mix.py loads `stems/phone.wav` on its own (`PHONE`) and gives it `REPLAY_LIFT_DB` +4.5, plus `REPLAY_EQ` +3 dB (a bell at 1.8 kHz, Q 0.55) over the build's band-pass.
    It has its own peak limit (voice ceiling - 3 dB).
  - The beds step down `REPLAY_DUCK_DB` -4 dB under the replay (0.12 s ramps).
  - Audit window 42.72-43.85: replay -23.0 dBFS RMS (was -27.8), 7.5 dB under the narrator (was 12.4); music under it -44.0.
  - `line_check.py v3_n11 v3_r01 v3_n12` on mix.wav: all three word for word.
  - Numbers: -14.01 LUFS, true peak -2.90 dBTP, LRA 3.5; after AAC -2.7 dBTP; seam jump 0.0048; sync 97 of 101.
- PREPARED, NOT DONE (waits for the director's re-cut of s14 / s15): the 2.78 s voice gap at 33.66-36.44 s.
  - The boy's fwip goes up (s14.snap about -6 LU, crisp).
  - Hold the bed at about -20 dBFS through the gap: re-tune the s15 look dip and the GAP lift.
  - A tense pluck sits on the point.
  - Target: no half second under -28 dBFS.

### (F) ONE COMMAND (a new voice or a re-cut re-times everything)

```
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/mix.py > sound/pointing/audio/_mix.log 2>&1
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s -u sound/pointing/audio/check_mix.py > sound/pointing/audio/_check.log 2>&1
```
The words come from the installed voice; the cuts, EV events, cast moves and lab come from the film (film_clock.mjs, on the same words).
Read the first lines of `_mix.log`: the film clock line, any "!! THE FILM'S CLOCK COULD NOT BE READ", and the cut-difference line.
Then `line_check.py v3_t07 ...` (whisper on lines of the finished mix) and `speech_check.py` (recordings). Run each of these ALONE: the machine is 4 cores and is shared with the renders.

### (G) TRAPS (kept from the first owner, still true)

- Never run `speech_check.py` / `line_check.py` and `mix.py` together. A tool call waiting more than about 170 s is moved to the background: wait for `exit` in the log.
- Do not pipe these scripts into `head` / `sed -n` in Git Bash: redirect to a file.
- Nothing is placed by clock time. Everything before cut 1 lives AFTER the film's end in extended time (`cues.X`) and is folded back by `mix.fold`.
- Cache keys are taken when `mix.py` starts. After changing a file that is not in `mix.STAGE_FILES` (e.g. `beds.py` is in it; `score.py` too), use `--no-cache` or delete `_cache/`.
- Whisper answers noise with stock phrases, and crows with vowels: read the JSON before trusting a "SPEECH?".
- `PT_VOICE=<folder>` + `--tag name` = a test run on another voice folder; the untagged files are only for the installed voice.

---

Film: "Why Japanese Train Drivers Point at Nothing", script v3 FINAL (`sound/pointing/SCRIPT_v3.md`).
Nothing here was played out loud. Every choice was made from the script, from descriptions and from measurements.

STATUS: see the STATE block at the top (sections A-G), rewritten after the final run of 2026-11-20 01:33.

## 1. What is in this folder

| file | what it is |
|---|---|
| `tl.py` | THE TIMELINE. Resolves anchors: a voice line (`v3_n03.s`), a word (`v3_n03:finger.s`), a shot (`s07.a`), `L`, `CUT1`. Words come from the voice's `words_spoken.json` / `words.json`; with no v3 voice yet, from the planned times in `script_v3/voice_lines_v3.json`. Shots, EV events, cast moves and the lab come from the film's own timeline.ts via `film_clock.mjs` (fallbacks: `timeline.json`, then the script's cut rules). `python -s tl.py` prints the whole timeline. |
| `film_clock.mjs` | THE FILM'S CLOCK (node): runs the director's timeline.ts, the lab's labPlan() and CAST's beat table on the mix's voice and prints cuts / EV / tinks / moves as JSON (tl.py calls it; cached in `_cache/film_clock_*.json`). |
| `line_check.py` | whisper on given voice lines of the FINISHED mix and of the voice stem: does each line still read? |
| `cues.py` | THE CUE SHEET (the source). One row per effect event: anchor, sound, level in LU under the voice, pan, the picture action, the feeling. No absolute times anywhere. Also the rule that puts the six balls on the melody's pulses. `python -s cues.py` prints it resolved. |
| `foley.py` | every sound a cue can name (glove snap, suitcase, doors, train, steps, jars...). Recordings + synthesis. `python -s foley.py` renders each one once and prints its length and level. |
| `beds.py` | the ambience beds: one continuous bed per scene, heard through each shot's perspective (platform A, platform B, the packed car, the cab, the doorway from inside, the cab at the stop, the lab). |
| `score.py` | the music: the underscore (33 cues, one colour per emotional beat) and OUR departure melody. |
| `mix.py` | the mix: voice chain, buses, ducks, the loop fold, master, stems, reports. |
| `mixlib.py` | the engine parts ported from the clown film's audited mix (voice compressor, de-esser, tone, band duck, limiter, meters). |
| `lib.py` + `_lib/` | the CC0 recordings and the named cuts used from each (`_lib/_sources.json` = author, URL, licence of every file). |
| `fs_fetch.py` | fetches a CC0 sound from Freesound (it refuses anything whose page does not link the CC0 deed). `_dl/` = the raw downloads. |
| `probe_lib.py`, `probe_events.py`, `probe_tones.py`, `probe_ride.py` | the measuring tools the cuts were chosen with (level maps, event lists, tone tracks, a speech-likeness index). |
| `speech_check.py` -> `speech_check.json` | runs a speech recogniser over the field-recording cuts: no announcement and no words may be in the film. |
| `check_mix.py` -> `check_mix.json` | measures a finished mix: sync of every sharp cue, the hook in 0.25 s steps, the loop seam, harshness, loudness before and after AAC. |
| `melody_check.py` -> `departure_melody.wav` | prints the melody's notes and checks that the rendered pitches are the written ones. |
| `standin_voice.py` -> `_standin_voice/` | the stand-in voice used before the v3 voice landed (v1 audio at the v3 planned times). Never for the film. |
| `dsp.py`, `instruments.py`, `sfx_gen.py` | the studio's generic DSP, instruments and synth effects (unchanged copies). |
| `_clown_engine_ref/` | the scaffold's copies of the clown engine (they do not run here; reference only). |
| OUTPUT `mix.wav` | the final mix, 48 kHz stereo 24-bit, exactly the film's length. |
| OUTPUT `stem_voice.wav`, `stem_sfx.wav`, `stem_amb.wav`, `stem_music.wav` | the stems at mix gain. They sum to the mix before the master limiter (error printed by every run). The departure melody is in the MUSIC stem. |
| OUTPUT `hook_0-12s.wav` (+ `.mp3`), `hook_0-12s_ME.wav` | the first 12 s of the mix, and the same without the voice. |
| OUTPUT `mix_preview.mp3` | for muxing a preview. |
| OUTPUT `mix_report.json` | every number: loudness, stems, per-line voice gains, word margins, per-shot levels, music sections, the loop seam, the melody grid. |
| OUTPUT `CUE_SHEET.md` | the cue sheet as a document, with the seconds and frames the anchors resolve to. Written by every mix. |
| OUTPUT `sound_times.json` | for the picture: every cue's time and frame, the shots, the door events, the melody's pulses and the six ball times. |
| OUTPUT `LICENSES.md` | every recorded file: title, author, URL, licence, used or not. Written by every mix. |

A `--tag name` run writes `mix_name.wav`, `stem_*_name.wav`, `mix_report_name.json` and so on (the stand-in runs are `_standin`).

## 2. How to re-time and re-mix

One command, from the studio root:

```
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/pointing/audio/mix.py
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/pointing/audio/check_mix.py
```

- **A new voice** (`sound/pointing/voice/voice.wav` + `words_spoken.json` or `words.json`, and `stems/` if the build writes them): just run it again. Every cue, bed, music cue and the melody move with the words. The film's length is the voice file's length when it is within 0.5 s of "gone." + 0.10 s, else "gone." + 0.10 s.
- **The lead's real cuts**: automatic (film_clock.mjs reads timeline.ts). Fallback only: `timeline.json` here: `{"fps": 30, "total": <frames>, "shots": [{"id": "v3_s01", "a": 0, "b": 91}, ...]}` (ids v3_s01 .. v3_s24 with v3_s16a / v3_s16b; `b` = last frame, inclusive). Without it the cuts follow the script's rules in `tl.CUT_RULES` (cut 1 in the silence after "not.", cut 2 one frame before "finger", and so on).
- **One cue is early or late against the animation**: write `picture_events.json` here: `{"s05.hook": 11.42}` (seconds), or an anchor expression `{"s05.hook": "v3_n04.s + 2.50"}`, or `null` to mute a cue. The cue ids are in `CUE_SHEET.md`.
- **A level**: `lv` in `cues.py` (events), `BED_LV` in `beds.py` (beds), the `lv` of each `P(...)` in `score.py` (music), `LV` in `score.melody` (the melody per place).
- **Another voice folder** (tests): `PT_VOICE=<folder>` in front of the command. `--no-cache` ignores `_cache/` (delete `_cache/` after engine changes that the keys cannot see).
- 16 GB machine: do not run a render and `mix.py` at once. A mix takes 1.5 to 4 minutes.

## 3. How it is built (the decisions)

- **Anchors, not times.** A cue reads `"v3_n08:saves.s"` (the catch lands on the word "saves") or `"v3_t02.e + 1.30"` (the doors meet 1.30 s after the nod). `tl.py` turns that into seconds from the voice that is installed.
- **The loop seam is one piece of sound.** The mix is built on an extended time line: shot 1 (0 s to the first cut) is rendered AFTER the film's end, as the continuation of the last shot, then folded back onto the start. So the departing train (one continuous event from its brake release at the payoff to the first cut), the platform B bed and the tourist's arm snap (its air starts 0.09 s before the end, its lock lands on frame 2 with the rail click) cross the seam without any edit. The ducks are keyed on the hook's words on both sides, and the master limiter computes its gain on the looped signal. The music is silent on both sides (it stops dead on "gone." and enters on cut 1). Checked by `check_mix.py` section 3.
- **Real things are recordings.** The train's departure is a recorded EMU with real inverter tones (1102 / 2203 / 3305 Hz); the car is a recorded JR Chuo Line interior; the suitcase is recorded suitcases (one of them in a Tokyo station), its threshold is recorded luggage wheels on a metal plate; steps, cloth, plastic knocks, glass, buttons, crows, sparrows, people, the vending machine and the standing train are recordings. Synthesis shapes and times them, and stands alone only where we must own the sound: the door chime, the departure melody, the wordless PA murmur, the guide chirp, and where no clean recording exists: the door's roll and thump (a recorded thud is layered in), the rail-joint clicks, the relay click, the motor model.
- **The motor model** (`foley.motor`) follows the train's speed: an asynchronous carrier at 1102 Hz (the pitch of the recording, so they never beat) with side tones that spread as the train speeds up, then the stepping pulse modes, over gear and slot tones that rise with speed. It runs under the recording at the departures, and inside the car and the cab it tells the story: power on under "a thousand people" (the suitcase creeps), the brake under "a finger and a shout" (the suitcase rolls forward), the start notes after the plant.
- **Nothing real from a real station.** No announcement, no Japanese words, no real station melody, no real door chime. The PA murmur is a vowel-only synthetic voice; the door chime is our own two notes (G5, D6) twice; the melody is ours (below). The field recordings were checked for speech (section 5).
- **The departure melody** is written in `score.py` (`MELODY`): D major, 3/4, four bars: `A5 F#5 A5 D6 | B5 G5 B5 E6 | F#6 E6 D6 B5 A5 | D6`, glockenspiel + celesta over vibes, played twice, the second pass with an octave sparkle and a last high D. It was composed here from nothing; it is not an arrangement of any station melody. It starts on "Japan's", stops before "drag", and its beat (the phrase / 12) is the clock for the six balls and for the music-note pictogram (`sound_times.json` -> `melody`). It sounds through horn speakers and the open air on the platform, duller and louder from inside the doorway (the 1 s cutaway), and faint and nearly dry under the lab's jars.
- **The score** has one small idea, THE POINT (a rising arpeggio) and THE CALL (two notes, a rising fourth, the rhythm of "Signal... green!"), and plays it in a different colour for each emotional beat of script 5.2. THE CALL lands on every call-out snap (marimba for the driver, celesta + glockenspiel for the boy, a trumpet fanfare for the vending machine) and upside down on the payoff's "...closed!". No music before cut 1, in the 0.7 s look, or in the cab's held breath. It stops dead on "gone.".
- **The voice always wins.** Voice chain = the clown film's (high-pass, gentle compressor, de-esser, tone, line leveller, peak limiter). While a word is spoken the 1-4 kHz band of the music, effects and ambience dips; then every word is measured against everything else in that band, and anything under 7 dB gets a further dip under that word. In pauses the world comes up (so a silence never reads as a drop-out on a phone), except in the designed dead air.
- **Levels are relative to the voice** (LU under it), so the mix does not change character when the voice's level does.

## 4. Sources and licences

`LICENSES.md` (written by every mix) lists every recorded file with its Freesound page, author and licence: all CC0 1.0. `fs_fetch.py` opened each sound's own page on 2026-11-19 and refused anything without the CC0 link. No ElevenLabs sound-effect credit was spent. No third-party music.

## 5. Checks that were run (by measurement)

Filled in by the last section from the latest runs: loudness, true peak, word margins, sync, the loop seam, speech in the recordings, harshness.

## 6. Honest gaps

- **Nobody has heard this.** Every cut of every recording was chosen from its description and from level / spectrum / event maps. A recording can be something other than its description says. The owner's ear is the real test; the first things to listen for are in the last section.
- **Recordings are not Japanese where none was clean.** The departing train is an Australian EMU (it does have the modern inverter whine), the door thud is from another train, the sparrows are Belgian, the vending machine is not Japanese. (The crows ARE Japanese since 2026-11-20: section D.) Japanese recordings from real platforms carry announcements and real melodies, which the film must not use. The car interior IS a Tokyo recording (JR Chuo Line, a stretch after its announcement ends).
- **The doors' slide and the rail-joint clicks are mostly synthesized** (LESSON 53: bare synthesis scored low). A clean CC0 recording of a Japanese commuter door closing without its chime would be better. Candidates for ElevenLabs sound effects IF the owner allows a few credits (about 10 credits per second, so roughly 150-250 in all): (1) a commuter train's sliding doors closing with a soft rubber thump, no chime, 3 s; (2) one crisp rail-joint click-clack of a slow train, 2 s; (3) a cotton-gloved hand snapping out to point, 1 s; (4) a hard-shell suitcase's spinner wheels rolling slowly on a train floor then over a metal threshold, 4 s. None was generated.
- **The picture does not exist yet.** Cue times follow the script's times for each action (written against the voice). When the animation lands, anything off is moved with `picture_events.json`; `check_mix.py` then re-checks the sync.
- **Musical taste cannot be measured.** The score and the melody are correct on paper (key, rhythm, pitches verified) and sit 18-20 LU under the voice; whether they are charming is for the owner's ear.

# V4 HANDOVER (2026-11-20 08:55, voice owner; the laptop is being switched off, a fresh team continues on another PC)

Nothing of mine is running: the last probe was stopped, and no paid request is in flight. No lock or token is held.

## Credits
- Counter **32,745 / 40,000** at 08:52 (`credits_log.jsonl`, label v4_handover). It lags a few minutes.
- Approved stop **38,500**, so 5,755 are left.
- v4 spent so far: 30,877 -> 32,745 = 1,868 credits, about 0.36 credits per character.
- Log `pt_credits.py <label>` before and after every batch.

## Script
- LOCKED: `sound/pointing/SCRIPT_v4.md` (+ `script_v4/lines_v4.json`).
- Model text and plan: `sound/pointing/script_v4/voice_v4.json`:
  - 5 paragraphs: p1 = lines 1+3, p2 = 4-8, p3 = 9-11, p4 = 13, 15, 17, 18, p5 = 19-22; tag [amused];
  - the "Go" run after p1:2: 7 single "Go" takes on a grid with gaps 0.46 0.42 0.38 0.34 0.30 0.26 s, then a 0.5 s held beat;
  - shouts: D after p3:4, H after p4:2, C after p4:3;
  - gaps 0.15 s (sentences) / 0.22 s (paragraphs), lead 0.05 s.
- Still missing in that file:
  - the "run" entry needs `"takes": [7 Go take names]` (for example six of t1-t8 "Go." + one of t9-t12 "Go!");
  - each shout needs a `"take"` and a real `"voice"`.

## Takes that exist (under `sound/pointing/voice/takes/`)
Each take is tN.mp3 + .json (alignment) + .meta.json; .p4.json = probed.

| folder | takes | state |
|---|---|---|
| v4_p1 | t1-t3 [amused] (probed); t4 [warmly] 0.5 and t5 untagged 0.5 (NOT probed) | t1-t3 fail continuity: centre 217-226 Hz, "Only green." 236-243 Hz, "Did you tap?" 129-136 Hz, a 10 st step |
| v4_p2 | t1-t3 [amused] (probed; t1 CLIPEND); t4 [briskly], original punctuation; t5 [amused] and t6 [briskly], joined punctuation ("A hundred lights, then red. Twelve people just watched, five pressed anyway."); t4-t6 NOT probed | t1-t3 are SLOW: 2.34-2.41 w/s, 20.3-20.8 s for 49 words; centre 146-181 Hz. The "twelve" wrong word is Whisper writing "12" (fixed in pt4_lib; the probe re-compares stored hearings) |
| v4_p3 | t1-t3, probed | good: centre 174-179 Hz, step median 1.2-2.4 st, 2.9-3.0 w/s, 13.7-14.3 s |
| v4_p4 | t1-t3, probed | good: centre 170-188 Hz, steps 3.7-4.7 st (max 5.7-6.4), 3.4 w/s, 16.6-17.0 s |
| v4_p5 | t1-t3, probed | centre 171-183 Hz, step median 3.2-4.2 st, but "Now try again." sits at 216-248 Hz (max step 7.8-10 st); 2.95-3.1 w/s, 15.6-16.2 s |
| v4_go | t1-t8 "Go." (229-265 Hz) and t9-t12 "Go!" (269-317 Hz), all probed | pick 7 by pitch and energy. Most are CLIPSTART (the sound starts at once). That is harmless for a word laid on a grid, and the run does not go through pt4_chain, which would reject clipped takes |
| v4_C (coal man, Taro UznIBkKIQe3ZG2tGydre) | t1-t3 "Clear!", probed | OK: 309-325 Hz, 0.47-0.58 s, no inner pause. t3 is best for pitch separation |
| v4_D (today's driver) | t1-t6, NOT probed by pt4 (measured by hand) | Samurai TlxVR97quVHvTxE8Qkcm: t1 257 / t2 193 Hz. Hideo FMgBdHe1YV2Xi0B9anXW: t3 269 / **t4 233 Hz, bright, no pause: best**. Mat pX0Ocua80UVkykZYq5ci: t5 281 / t6 199 Hz |
| v4_H (steam driver) | t1-t6 shouted (measured by hand: 202-279 Hz, too high); **t7-t12 firm low calls, not measured yet** | t7-t12: Gregory 8TMmdpPgqHKvDOGYP2lN and David rSLmFOTRq9g87aTxSUr6, "[gruffly] / [low voice] / [firmly] Signal clear.". Need one at about 110-125 Hz |

- Voices added to My Voices for v4 (free): PT4 Driver Samurai, PT4 Mat, PT4 Steam Gregory, PT4 Steam David (`voices_added.json`).
- Library previews with pitch and air: `takes/cast_v4.json`, `takes/previews_v4/` (tool: `pt4_cast.py`).

## FINDINGS the next team must act on
1. **LENGTH: the script will NOT fit 68 s at James's measured pace.**
   - The round-1 paragraph takes add up to about 71.5 s (speech plus their own pauses).
   - Add the Go run (2.5 s), the beat (0.5 s), three shouts and the joins: about **78-80 s**. The hard limit is 70 s.
   - Even with p2 at 3.0 w/s the film is about 73 s.
   - James reads 2.9-3.4 words/s INSIDE sentences, and 2.4 on p2's short countdown sentences. The lead's 3.2-3.3 was counted over the whole film.
   - Tell the lead before building: cut lines (line 6 first, then more), or accept a brisker read. p2 t4-t6 test [briskly] and joined punctuation; probe them first.
2. **Shout pitch slots:** every tested voice SHOUTING "Signal clear!" lands at 193-281 Hz, deep voices included, not at 100 / 135 Hz. A layout that works:
   - narrator about 165-175 Hz;
   - D about 230 Hz (Hideo t4, 233 Hz);
   - C about 320 Hz (Taro t3, 325 Hz: 5.8 st above D);
   - H LOW: a firm call at about 125 Hz or less (one of v4_H t7-t12, still to measure).
   - Each shout must stay at least 5 st from the narrator centre and from the other shouts.
3. **"Full band" test for 1-2 word shouts:** the 10-16 kHz test depends on the sounds in the word ("Clear!" and "Go" have no s). The air gate in pt4_verify may need a voiced-frame version: 6-12 kHz against 1-3 kHz in voiced frames. Measured that way: narrator about -14 dB, Hideo -17, Taro -27 to -29.

## Exact commands to continue (Git Bash, from `sound/pointing/voice/`)
```
export PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8; PY="../../../tools/.venv/Scripts/python.exe -s"
$PY pt_credits.py <label>                     # before / after every paid batch
$PY pt4_probe.py v4_p1 v4_p2 v4_p3 v4_p4 v4_p5 v4_go v4_C v4_D v4_H   # probes only the missing takes
# new takes, if needed:
#   $PY pt4_jobs.py r3 --only p2,p5 --takes 2 --start 7
#   $PY pt_gen.py jobs/v4_r3.json --dry        (then the same without --dry)
# edit ../script_v4/voice_v4.json: run.takes = [...7 Go take names...]; shouts D/H/C "take" + "voice"
$PY pt4_chain.py                              # -> takes/v4_chain.json (best chain + 4 next)
$PY pt4_build.py --out ../voice_v4_build
$PY pt4_verify.py --dir ../voice_v4_build
```
**Not yet done in pt4_build (add before the final build):**
- (a) Map each sentence to its SCRIPT LINE id ("L01".."L22") in phrases.json / words_spoken.json, by cumulative word counts against script_v4/lines_v4.json. Write the script's own tokens into words.json.
- (b) take() measures loudness with BS.1770 on the take's speech. For the 0.3 s "Go" words, tile the word to 1.2 s or more before measuring (or match RMS); otherwise the gain is wrong.
- (c) The run code (run_piece) is written but has never been executed.

**INSTALL (the director's path):**
1. The finished folder is `sound/pointing/voice_v4/` (voice.wav, words.json, phrases.json ...).
2. From the repo root: `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/gen_words_ts.py sound/pointing/voice_v4 studio/src/videos3/pointing/v4/words.ts --force`
3. Tell the DIRECTOR: he runs `briefs/v3/pointing/director/make_v4_script.py` and `probe_v4.mjs`.
4. Typecheck: `cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json`.
5. Previews for the owner: `pointing_preview/voice_v4_FULL (trap script).mp3` and `voice_v4_hook_0-8s.mp3` (lines 1-3), for example with pt3_owner_mp3.py --dir/--out (-16 LUFS).

## Environment (what the tools need; some of it lives OUTSIDE the project folder)
- **Python:** `tools/.venv` (numpy 2.5.4, scipy 1.18.1, faster-whisper 1.2.1, ctranslate2 4.8.5); ffmpeg and ffprobe on PATH.
- **Whisper:** faster-whisper model **"medium"**.
  - It runs on the GPU (CUDA, float16) when it loads, otherwise CPU int8 (4 threads) automatically. `PT_WHISPER_DEVICE=cpu` forces CPU.
  - The CUDA 12 libraries are OUTSIDE the project, in `~/.cache/pt_cuda12/nvidia/{cublas,cudnn}`. Install with: `pip install --no-deps --target ~/.cache/pt_cuda12 nvidia-cublas-cu12==12.4.5.8 nvidia-cudnn-cu12==9.1.0.70`.
  - The model files are in the Hugging Face cache (~/.cache/huggingface) and download on first use.
- **ElevenLabs API key:** `tools/el_api.py` reads it from the file **~/.secrets/elevenlabs_api_key**, or from the file named by the env var **EL_KEY_FILE**, else from ~/.claude.json mcpServers.elevenlabs.env **ELEVENLABS_API_KEY**. All of these are outside the project folder: copy the key file to the new PC, never into the repo.
- **Voices:** they live in the account's My Voices (James QhpsGjDKZmM9qRYdMhBD + the PT4 voices above). Nothing to copy.

---

# V4 PLAN: one narrator, paragraph takes (2026-11-20, voice owner). NO credits spent until the lead sends the final text.

## Tools (all in this folder, next to pt3_*; tested end to end on copies of old takes, test files removed)
| tool | what |
|---|---|
| `pt4_lib.py` | per-SENTENCE measure (f0 median, pace, loudness, end contour, tail), chain summary, the lead's v4 gates |
| `pt4_measure.py <voice dir>...` | the same numbers on any finished voice (target row: `takes/v4_target_row.json`) |
| `pt4_jobs.py import <txt>` / `r1` / `shouts` | script JSON `../script_v4/voice_v4.json` (paragraphs separated by a blank line; `SHOUT <who>: <text>`); jobs with N takes per paragraph, neighbours as previous / next text; prints characters + credits |
| `pt_gen.py jobs/v4_<round>.json [--dry]` | pays (never twice: an existing mp3 is skipped); log `pt_credits.py` before / after every batch |
| `pt4_probe.py [all]` | every take, sentence by sentence (+ Whisper on the GPU) -> `takes/v4_pN/tK.p4.json` |
| `pt4_chain.py` | the CHAIN: beam search over paragraphs (whole takes + one-cut splices at sentence ends), scored on the steps between neighbouring sentences + the gates -> `takes/v4_chain.json` |
| `pt4_build.py --out _v4` | one gain per take, cuts only at sentence ends (40-90 ms tails), planned gaps (sentence 0.20, paragraph 0.25, one beat <= 0.8 s), shouts placed by `"after": "p2:3"`, room tone under everything (no digital silence), clip-gain dips for peaks, Whisper word times -> voice.wav, stems/dialogue.wav, words.json, words_spoken.json, phrases.json, _build.json |
| `pt4_verify.py --dir _v4` | all gates on the built file (continuity, gaps, every word heard, no digital silence, tails, loudness, peak, shouts: 1-2 words, no pause > 0.25 s, full band, >= 5 st apart) |
Then the v3 install path (`pt3_install.py --dir _v4` after copying its gate files, gen_words_ts, voice_sync, tsc); the opening / body split is not needed for v4 unless the lead asks.

## Target row (pt4_measure, narrator sentences only)
| | centre Hz | line medians Hz | step median st | steps > 6 st | pace median w/s (sd) | gap median s |
|---|---|---|---|---|---|---|
| lead's v4 gate | 175-200 | <= 240 | <= 3.5 | 0 | 3.4-3.7 (<= 0.6) | 0.15-0.30 |
| clown (loved) | 176 | 121-325 | 3.37 | 3 | 3.19 (0.71) | 0.16 |
| antitheft (best views) | 151 | 116-281 | 3.46 | 5 | 2.60 (0.60) | 0.32 |
| pointing v3 (rejected) | 169 | 105-266 | 7.17 | 9 | 3.28 (0.55) | 0.40 |
Honest note: James on eleven_v4 has never measured 3.4-3.7 w/s over a whole read (clown 3.19, v3 3.28); the brisk pace must come from the text.

## First settings (from the clown build and this film's logs)
- eleven_v4, James (QhpsGjDKZmM9qRYdMhBD), similarity 0.75. **v4 ignores speed** (clown: same seed at 1.0 and 1.2 = the identical take) and has **no style**: pace is steered by the TEXT only. No time-stretch, ever.
- r1 = 3 takes per paragraph: A stability 0.35, B 0.5, C 0.35 with another seed (clown's chosen takes were mostly 0.35; 0.5 is steadier in pitch).
- ONE tag for the whole film, at the start of every paragraph: **[amused]** (clown c11 "[amused] Nearly everyone ducked..." sat 168-215 Hz). Second choice [mischievously] (clown c10: 149-182 Hz). Avoid [slowly] (121-128 Hz, 2.4 w/s), [excited] / [delighted] / [incredulous] (the 219-325 Hz jumps), [flatly] / [deadpan] (the 105 Hz drop of "He is not.").
- Text for a brisk, even read: no "..." (every ellipsis gave a 0.3-1.0 s hole and a slow line), no dashes; a comma only where a breath is wanted; sentences of about 8-14 words; questions where a rising end is wanted; CAPS on one word per paragraph at most.
- If a paragraph reads slow (< 3.4 w/s) or jumps, round 2 changes the punctuation / splits a long sentence, never the audio.

## Shouts (4 one/two-word lines; all >= 5 st from each other and from the narrator's ~185 Hz, full band)
Pitch slots that satisfy the rule: about 100 Hz and about 135 Hz (low side), about 250 Hz and about 335 Hz (high side).
Measured voices in the account (take medians, 4-10 kHz band vs 100-1000 Hz; the narrator is about -12 dB):
- coal man "Clear!" ~250 Hz: Taro (248 Hz, -7.8 dB, bright, full band) or Hideo / Kei (228-232 Hz: too close to the narrator).
- stove person "Off!" ~335 Hz: Kiran (290-325 Hz, -4.7 dB) or Kavya (268-296 Hz, -2.5 dB), pushed up by a shout.
- modern driver "Signal clear!" ~135 Hz: Masaki's calls sit at 126-131 Hz but he is DULL (-26.5 dB; the benchmark: 10-16 kHz 12 dB under the narrator) -> fails "full band". To find: a low, full-band male, from free library previews (pt_add.py --previews costs nothing).
- steam driver "Signal clear!" ~100 Hz: an older, deep male (none in the account yet): free library previews.
Shout takes: 2-3 each (about 15 characters each).

## Credit plan (real counter checked 08:19: **30,877 / 40,000**, the same as the lead's figure; new stop 38,500 = 7,623 credits)
eleven_v4 bills about **0.40 credits per character** on this account (v3: 2,466 credits for 6,166 characters; alt round: 223 for 555).
So the lead's "about 7,000" buys about 17,000 characters, not 7,000.
| batch | characters | credits (0.40/char; plan on 1.0/char if the counter disagrees) |
|---|---|---|
| r1: 3 takes x 5 paragraphs (~1,250 chars per read) | 3,750 | ~1,500 |
| r2: 2-3 more takes for the 2 weakest paragraphs / joins | ~1,000 | ~400 |
| r3 (only if a gate still fails): 1 take per paragraph with changed punctuation | ~1,250 | ~500 |
| shouts: 4 x 3 takes | ~180 | ~75 |
| planned total | ~6,200 | ~2,500 -> counter ~33,400 |
| reserve under the 38,500 stop | | ~5,100 |
Rule: `pt_credits.py` before and after every batch; stop and report if a batch costs more than 0.5 credits per character.

# V4 PREP (one narrator, paragraph takes; the lead's order 2026-11-20). NO credits until the final text arrives.

## V4 PREP: done / next
- 08:00 done: nothing yet (started; no pt4_* file existed).
- 08:03 done: real counter 30,877 / 40,000 (= the lead's figure; new stop 38,500 -> 7,623 usable). Read BENCHMARK_sound.md + audio/NOTES.md THE RECORDING RULE. Clown facts: eleven_v4 IGNORES speed (same seed at 1.0 / 1.2 = identical take) and has no style; clown used stability 0.5 / 0.35, one short tag per beat.
- 08:20 done: pt4_lib.py + pt4_measure.py written and run (takes/v4_target_row.json). TARGET ROW per sentence, narrator only:
  clown: centre 176 Hz, step median 3.37 st (3 steps > 6), lines 121-325 Hz, pace median 3.19 w/s sd 0.71, gaps median 0.16 s, ends 13 rise / 10 fall.
  antitheft: centre 151 Hz, step 3.46 st (5 > 6), 116-281 Hz, pace 2.60 sd 0.60, gaps median 0.32. pointing v3: step 7.17 st (9 > 6), 105-266 Hz, pace 3.28.
- 08:35 done: pt4_jobs.py (script JSON or `import <txt>`; r1 = 3 takes/paragraph A 0.35 / B 0.5 / C 0.35 new seed; shouts) and pt4_probe.py (per-sentence spans, f0, pace, tail, pause, Whisper GPU) written; probe tested on old takes (takes/v4_ptest = copies, delete at the end).
- 08:45 done: pt4_chain.py written + smoke-tested (beam search over paragraphs; options = whole takes + one-cut splices at sentence ends; exact re-score on the whole chain; -> takes/v4_chain.json).
- 09:10 done: pt4_build.py (cuts at sentence ends, 40-90 ms tails, planned gaps, one beat, shouts by "after", room tone under all, clip-gain dips, Whisper word times) + pt4_verify.py written; END-TO-END TEST passed on copies of old takes (takes/v4_ptest*, v4_xt, _v4test: delete at the end). eleven_v4 takes are digitally clean in their pauses -> room tone = pink-ish -64 dBFS.
- 09:20 done: V4 PLAN block written at the top (tools, target row, first settings, shout slots + casting, credit plan; counter 30,877).
- 08:31 done: script LOCKED (SCRIPT_v4.md); ../script_v4/voice_v4.json written (5 paragraphs, Go run after p1:2 with 0.5 s beat, shouts D after p3:4, H after p4:2, C after p4:3; gaps 0.15 / 0.22). PAID r1 (15 paragraph takes, 3,258 chars) + 12 "Go" takes + 3 coal-man (Taro) "Clear!" takes: counter 30,877 -> 32,081 (1,204 credits, 0.36/char).
- next: probe running (takes/probe_v4_r1.txt); cast D (~135 Hz bright) and H (~100 Hz old deep) from free library previews; extend pt4_build for the Go grid + line ids; chain; build into ../voice_v4.

# v3 VOICE: FINAL, INSTALLED (2026-11-20 01:30, voice owner)

State in one line: the SCRIPT v3 voice is built in `_v3/`, VERIFY PASSED + ACCEPT PASSED, INSTALLED into this folder
(`INSTALLED.json`), `studio/src/videos3/pointing/words.ts` + `cast/voice_v1.ts` regenerated, film typecheck clean, owner mp3
written. **63.750 s** (voice end frame 1910 at 30 fps; "gone." ends 63.65 s). No cut order (rule starts at 66.0 s). No stretch
anywhere. Nothing was played. The v1 track in `_full/` is untouched.

## Picks (under `takes/`; the build reads `takes/picks_v3.json` + `script_v3/voice_lines_v3.json` + `pt_timing_v3.json`)

p = Whisper word probability, each line cut out alone from the assembled DIALOGUE stem (verify, `takes/verify_v3.txt`).

| id | take | numbers |
|---|---|---|
| v3_n01-n03 | `v3_hook/t13` (one take) | n01 1.50 s 238 Hz p 0.78-0.99; n02 "He is not." 0.915 s, 105 Hz = -14.2 st, sd 3.2 st, p he 0.82 / is 0.98 / not 0.96; n03 2.54 s 241 Hz (+14.4 st), p 0.90-1.00 |
| v3_x01 | `v3_x01/t1` 0.10-3.72 (laugh) | hook bed cut 1 -> cut 2 at -12 dB; phone giggle under n11 at -18 dB |
| v3_d01 | REUSE `cast_d/masaki1` 0.065-1.41 | signal 0.79 / green 0.91; beat 0.385 s |
| v3_t01 | `v3_t01/t5` | he's 0.86, 0.94-1.00 the rest; 0.35 s of his own laugh before "He's" |
| v3_n04 | `v3_n04/t4` | 2.58 s, lowest p 0.76 |
| v3_n05 | `v3_n05/t4` | 2.17 s, lowest p 0.67 |
| v3_n06-n08 | `v3_n0608/t5` | first 0.82 / stop 0.83; n07 0.77-1.00; n08 "and" 0.49 (warning, heard right) |
| v3_t02 | `v3_t02/t1` | bad 0.65 / suitcase 0.87 |
| v3_d02 | REUSE `ch_d03/t3` 0.095-1.53 | doors 0.80 / closed 0.97, beat 0.535 s |
| v3_t03 (+ r01) | `v3_t03/t1` | 0.89-0.98; replay on the phone stem 0.90-0.99, only "What's" under "phone." (0.225 s) |
| v3_n09-n10 | `v3_n0910/t3` | second 0.84 / stop 0.77; it 0.68 / stays 0.94, 1.5 dB under on purpose |
| v3_t04 | REUSE `ch_t02/t3` | 0.84-1.00 |
| v3_t05 | REUSE `ch_t04/t2` | vending 0.84 / machine 0.67 / check 0.95, beat 0.355 s |
| v3_t06 | `v3_t06/t1` | 0.81-1.00 |
| v3_n11 | `v3_n11/t3` | 0.81-1.00, clear in the mix too |
| v3_n12 | REUSE `c08c/t1` 0.095-2.135 | 0.74-1.00 |
| v3_n13 | `v3_n13/t3` | six 0.59 (0.31 s long = confirmed), when 0.47 (warning, after the 1.00 s cutaway), about 0.87 / one 0.94 assembled (0.45 in the take: t1 0.46, t2 0.47, t4 0.62 but six 0.45 + a rising end, so t3 stays) |
| v3_x02 | `v3_x02/t1` 0.84-2.74 (giggle) | |
| v3_n14 | `v3_n14/t1` | 0.86-1.00 |
| v3_d03 | REUSE `ch_d04/t4` 0.08-1.64 | doors 0.78 / closed 0.63; 1.03 s between the words |
| v3_k01 | REUSE `ch_k01/t5` 0.12-1.475 | bag 0.79 / check 0.70; beat 0.37 s |
| **v3_t07** | **NEW `v3_t07/t2`** (replaces the reused `ch_t06/t4`) | bag 0.63 / gone 0.95; 104 Hz, range 2.6 st, end -0.6 st; beat 0.47 s; 1.6 dB under the narrator median; ends 63.65, film ends 0.10 s later. t1 / t3: bag 0.61; t4 heard "Dag" |

Reused v1 takes in the film (7): d01, d02, d03, k01, t04, t05, n12.

**"Bag... gone." and the tone-colour check.** All three new `[flatly]` takes are as dark as the reuse (hi band -26 to -27 dB
against 100-1000 Hz; mean MFCC distance to the other tourist lines 9.1-9.9 against the reuse's 9.09; the 4th take, `[defeated]`,
is brighter but says "Dag"). So the dark colour comes from the flat, quiet delivery of this line, not from v1 against v3. t2 was
picked because it is the clearest (bag 0.63). With t2 as a NEW unit the tone check passes (`_v3/tone_check.json`: t04 7.33,
t05 5.75 against a limit of 10.49; n12 3.85 against 8.38).
**Driver and kid (all v1 takes, nothing new to compare with):** measured level, room and brightness, no re-record.
- Level: every line is within 1.5 LU of the median (d01 +0.01, d02 / d03 about 0, k01 +0.28).
- Room: the noise floor in their own silences is -65 to -70 dB under the speech, and the decay after the last word is 50-205 ms.
  The new takes measure -65 to -70 dB and 40-280 ms.
- Brightness: Masaki is darker than every new take (hi -26 to -30 dB against -4 to -20; centroid 425-853 Hz). The kid is brighter
  (mid +7.5 dB, centroid 1849 Hz). Both follow their voices (126-178 Hz calm male, 283 Hz child). v1 against v3 conditions are the
  same: for the two voices that have both kinds of take (James n12, Flackoo t04 / t05), the reused takes sit inside the spread of
  the new ones.

## Gates (takes/verify_v3.txt; _v3/accept.json, voice_info.json, hook_gate.json)

- Format 48 kHz stereo 24-bit; lead 0.070 s, tail 0.100 s; the stems sum to voice.wav (max error 2.4e-7).
- All 27 planned pauses are on plan as true silence. Audible frames in pause middles: 0.00 s.
- Peak -1.08 dBFS, -1.03 dBTP (4x), no clipping. Integrated loudness -17.68 LUFS (ffmpeg -17.7, LRA 4.1); dialogue -17.54. Every
  line is within 1.5 LU.
- Every line is heard word for word; every flagged line has all words >= 0.6. Warnings only: n08 "and" 0.49, n13 "when" 0.47.
- Whole-file pass: "case" after "Bad suitcase." is the 20 s window seam (the word spans 19.62-20.37 s). "drag" was heard as
  "dragged" in the whole file but as "drag" (0.92) on the line alone. The thin replay missing in the full mix is intentional.
- Hook gate PASS: "not" 2.05 (limit 2.70), "laugh" 3.72 (limit 4.50), "finger" 4.69 (prefer by 5.00), longest gap 0.155 s
  (limit 0.20). 10 words by 3 s, 17 by 5 s. "He is not." 0.915 s, which is shorter than the script's 1.05-1.20 s.
- Call rhythm: every call is >= 1.3 s with a beat >= 0.35 s. Tone check passed.

## Word times: what changed in this round (pt3_build.py, pt_timing_v3.json)

1. "Word after a held beat" rule (the handover fix) is now working. Its first version cut the search window at the estimate, so
   "closed!" (payoff) landed inside the silence at 58.505 s, "check!" (kid) at 60.69 and "when" at 49.77. It now searches past
   the estimate. Every word after a silence was checked against the energy: "green!" 6.415 (was 6.53 / 6.68), "closed!" 58.68,
   "check!" 60.955, "when" 49.89.
2. **Measured onsets in the opening** (`pt_timing_v3.json` "word_onsets_measured", unit-relative, applied only within 0.25 s of
   the build's own estimate, and each move is listed in `_build.json` word_timing.moves). They were read by hand from 10 ms frames
   (level, >3 kHz and <400 Hz energy share, spectral peak, f0), because Whisper had put the start on the vowel:
   - bag 0.37->0.26 (b closure), is 0.58->0.62, on 0.71->0.74, that 0.80->0.89, train 1.14->1.03 (shared t closure, split);
   - is 1.81->1.89, not 2.23->2.05 (the /n/ right after the /z/);
   - he 3.14->3.07 (/h/), did 3.35->3.26 (d closure), a 4.71->4.535, finger 4.87->4.69 (/f/);
   - nothing 8.04->7.98.
   **Cut 2 follows them: 4.657 s** (was 4.837), and the hook laugh bed now runs 2.71-4.657.
3. **Body pass (2026-11-20, the lead's order): measured the onsets of the words that the cuts (timeline.ts RULES), the EV
   events and the beats.ts cues are anchored on, plus the first word of every line.** voice.wav and the stems stay
   bit-identical (sha256 14a1b22b... / 78a091f1... / d06a971e... / f4529059...). Moved:
   - people 10.48->10.41, behind 10.72->10.68;
   - finger#2 12.54->12.39 (/f/), shout 13.29->13.21 (/sh/);
   - finger#3 18.17->18.05 (/f/ after the /z/ of "boy's"), saves 18.51->18.48;
   - phone 42.31->42.26, pointed 50.24->50.17, loud 51.44->51.40, back#2 55.89->55.86.
   Ambiguous, left: "tested" 45.24 (t closure 45.17, burst 45.22), "drag" 54.87 (one t+d closure 54.79-54.92), "Be" 27.89
   (voicing from 27.865).
   "What's" (v3_t03) really starts 24.195, not 24.145, but this is NOT applied: in this build that word places the phone
   replay, so moving it changed voice.wav from 42.385 s on (tried, reverted).
   **For the DIRECTOR: "What's" (v3_t03, `what's#1`) really starts 0.05 s later than words.ts says: 24.195 s, not 24.145
   (the laugh pre-roll ends in a near-silent dip 24.15-24.19, the /w/ starts at 24.20). To put cut s10 on the real onset,
   use S("what's#1") + 0.05 in timeline.ts.**
   Not measured: the remaining non-anchor words in the body, and the replay's words on the phone stem.
   INSTALLED at the lead's go (2026-11-20): pt3_install.py, words.ts + cast/voice_v1.ts regenerated, film typecheck exit 0;
   63.750 s, voice end frame 1910; voice.wav bit-identical to the previous install (sha256 14a1b22b...).
4. Known caption mismatch: words.json captions "a thousand" as the single token "1,000" (v3_n04). It is kept as it is; the
   DIRECTOR's line matcher accepts it.

## Alternate hook (v3_a01 + v3_a02): `v3_alt/t17`, borderline

17 James takes + 2 of the fallback wording were measured. The comma takes (t6-t11) are heard right ("tourist" p 0.77-0.84),
but a comma always costs 0.3-0.45 s of breathy hold that is not true silence, so the build cannot cut it: "suitcase." ends
5.27-5.44 s. The no-comma takes (t1-t5, t12-t16) are in time but heard as "tourists". t17 ("The TOURIST laughing at him...",
stability 0.35, round 4) passes the alternate gate: "suitcase." ends 4.98 s, longest gap 0.145 s. But "tourist" is borderline:
heard right with p 0.46 on its sentence cut, and as "tourists" on the build's unit cut; "He" is 0.58. Built in `_v3/_alt/`
(candidate builds in `_v3/_altc/`). No more takes were recorded: the 6-take cap is used.

## Files

- Installed here: voice.wav, words.json (135 caption tokens), words_spoken.json (136 incl. the replay), phrases.json (26),
  captions.json (the script's 60 chunks), _build.json, voice_info.json, accept.json, hook_gate.json, tone_check.json,
  opening_words.json (the real opening word times + cuts), stems/, segments/.
- Segments: opening_lead 8.734 s; body 55.016 s (cut in the silence before v3_n04, 0.081 s before "But"); opening_alt 8.544 s;
  full_with_alt_opening 63.56 s (body 0.19 s earlier).
- Owner mp3: `pointing_preview/voice_5_FULL_VOICE_v3 (final script).mp3`, 63.75 s, -16.0 LUFS (ebur128), true peak -1.2 dBFS.
  `pt3_owner_mp3.py` now measures the mp3 itself: the encode had read -16.27 when the wav was measured instead.

## Credits

Counter **30,877 / 40,000** at 01:24 (label v3_final; the counter can run a few minutes late). This job started at 28,411:
**2,466 used** in all. This round: 30,654 -> 30,877 = **223** (one batch: 6 alternate-hook takes, 555 characters, `jobs/v3_alt4.json`).
**Left under the 33,400 hard stop: 2,523.** v3 takes: 98, 6,166 characters.

## How to rebuild (nothing is paid; the per-unit Whisper passes are cached in takes/_unit_whisper_cache.json)

```
cd C:/Users/utkar/Desktop/animated-shorts-studio/sound/pointing/voice
export PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8; PY="../../../tools/.venv/Scripts/python.exe -s"
$PY pt3_build.py --out _v3                       # ~4 min
$PY pt3_tone.py --dir _v3
$PY pt3_verify.py --dir _v3 > takes/verify_v3.txt 2>&1        # must end VERIFY PASSED / ACCEPT PASSED
$PY pt3_gate.py _v3 && $PY pt3_opening_words.py _v3 "FINAL"
$PY pt3_build.py --lines alt --out _v3/_alt      # picks hold v3_a01/v3_a02 = v3_alt/t17
$PY pt3_split.py
$PY pt_credits.py <label>; $PY pt3_info.py 28411 <counter> --dir _v3
$PY pt3_install.py
cd ../../..; PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/gen_words_ts.py sound/pointing/voice studio/src/videos3/pointing/words.ts --force
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s studio/src/videos3/pointing/cast/voice_sync.py sound/pointing/voice/words.json
cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json
cd ../sound/pointing/voice && $PY pt3_owner_mp3.py
```
If a pick changes, the measured onsets in pt_timing_v3.json are unit-relative: re-measure them for a new hook take (the build
refuses a value more than 0.25 s from its own estimate and prints it).

Traps that still hold: v3 ids start with `v3_`, and the `pt_*.py` tools (no 3) are v1. `cast_d/masaki1` must only be used as
its 0.065-1.41 cut. A new paid take needs a NEW take name (pt_gen.py skips existing mp3s). `_v3/_opening`, `_v3/_hook_cand`
and `_v3/_altc` are scratch builds.

---

PAUSED 17:31 (owner asked to pause heavy work; no process of mine is running): next step = 1) fix the word-END rule in
pt_build.py (an interior word ends at the first true-silence run >= 8 frames = 40 ms, so "Speed" ended at its /p/
closure, "opening" / "looking" at the dip before "-ing": require >= 0.10 s, or the run that reaches the next word);
2) in pt_accept.py exempt the intentional laugh (t01 unit on -> "Bro's") from the breath check; 3) probe takes/ch_t01b
(4 new Flackoo t01 takes, already generated) and pick one with "Bro's" p >= 0.6 (current ch_t01/t1: 0.56); 4) rebuild
`pt_build.py --drop t04 --out _full`, then pt_verify.py --dir _full, pt_accept.py _full; 5) install _full/* into this
folder (voice.wav, words.json, words_spoken.json, phrases.json, _build.json, voice_info.json), pt_split.py (opening /
body segments), pt_info.py <21827> <counter now>, tools/gen_words_ts.py ... --force, tools/v3/new_short_v3.py pointing
--shots; 6) remove the losing voices (pt_add.py --remove ...), finish this file, report.
State at the pause: `_full/` = v1 track, 65.52 s (cut order 1-3 applied; uncut 70.07 s), VERIFY PASSED, ACCEPT FAILED only
on the 2 items above ("Bro's" 0.56; 1.04 s "audible in pause middles" = 0.43 s laugh + 3 word tails, NOT breaths:
takes/accept_v1.txt). studio/out/pointing/voicetest/pointing_voice_v1.mp3 = that v1 track (listenable now) + the 3
auditions_*.mp3 reels. Credits: counter 26,012 / 40,000 (start 21,827).

# pointing: VOICE notes (owner: the voice agent, 2026-11-19)

STATUS: superseded by the v3 voice at the top (this section and the PAUSED note above it are the v1 history).

## Toolchain (this folder; ported from the clown v6 / v6b voice the owner loved)
| file | what |
|---|---|
| pt_lib.py | the script v2 lines (24 lines, speakers N / D / T / KID, caption markup), measurement helpers (true silence, BS.1770, f0, whisper) |
| pt_add.py | adds library voices to My Voices (`--previews` = free library previews, `--remove` only removes voices it added); log `voices_added.json` |
| pt_jobs.py | take plans -> jobs/*.json (narr, cast, chars) |
| pt_gen.py | ElevenLabs with-timestamps, never pays twice; every call logged in takes/gen_log.jsonl |
| pt_probe.py / pt_cast.py | per-take measurements (whisper, f0, end contour, edges, timbre MFCC, vocal-tract length) |
| pt_vtl.py | vocal-tract length from LPC formants: separates a real child from an adult doing a high voice |
| pt_timing.json | the pause plan (true silence between every two lines, from the picture column), with a reason per pause |
| pt_build.py | assembles voice.wav + words.json + words_spoken.json + phrases.json + _build.json (gains + cuts in silence only) |
| pt_verify.py / pt_accept.py | end-to-end check + the accept gates |
| pt_credits.py | logs the account counter to credits_log.jsonl |

## Whisper on the GPU (new in this film)
The CPU was 100 % busy (another session's measurements, renders, explorer), and the clown setting (faster-whisper
medium, CPU int8) took ~3.8 min per take (4 passes, each a 30 s window) = 3+ h for the auditions. pt_lib.whisper now
runs the SAME medium model on the GTX 1660 Ti (float16): 4 s per pass, probabilities within 0.02 of the CPU run
(kei1: Signal 0.86 vs 0.88, green 0.91 vs 0.91). CUDA 12 cuBLAS + cuDNN 9 come from NVIDIA's PyPI wheels
(nvidia-cublas-cu12 12.4.5.8, nvidia-cudnn-cu12 9.1.0.70, sha256 checked against PyPI) installed privately in
`~/.cache/pt_cuda12` (NOT into the shared tools/.venv); pt_lib adds their bin folders to the DLL path. It falls back to
the CPU automatically, or with `PT_WHISPER_DEVICE=cpu`.

## Credits
| when | counter | used |
|---|---|---|
| start | 21,827 / 40,000 | |
| after round 1 (36 narrator + 53 audition takes, 4,992 chars) | 24,540 | 2,713 |

## Casting notes so far
- Kid pre-screen (free library previews, pt_vtl.py): every library "kid" voice is an adult. Calibration on premade voices:
  adult women 14.7-16.6 cm, adult men 17.5-18.7 cm on this estimator. Teddy 18.6 / Valf 19.0 = adult men pitching up
  (300-346 Hz); Austin 117 Hz / Ryan 127 Hz = adult-pitch men (removed). Round 2: Piku 15.6, Chutki 16.3, Kiran 16.8,
  Kavya 17.7, Munni 18.0 (female kid-character voices, f0 235-300 Hz). A real 6-year-old would read about 12-13.5 cm here.
- ElevenLabs Voice Design refuses a child voice: POST /text-to-voice/design with "a small six-year-old boy..." returned
  403 blocked_generation ("this prompt potentially doesn't follow our safety guidelines"). Not worked around. So the KID
  is an adult performing a child (the normal animation casting); the pick prefers the shortest measured vocal tract
  with a child's pitch, and the owner's ear decides (auditions_kid.mp3).

## Casting decisions (round 1 auditions, measured; takes/probe_r1.txt, takes/quick_r1.txt)
Auditions: each candidate's own lines, 2-3 takes (driver: the three call-outs in one take, [firmly] 0.5 / 0.35 +
untagged; tourist: "[laughing] Bro's pointing at nothing! [excited] Nobody does that in New York!" x2 + "Bag... gone."
[deadpan] / [flatly]; kid: "Bag... check!" [proudly] 0.5 / 0.35 + untagged). Whisper p = lowest word p of the line cut out
alone. MFCC = mean MFCC 2-13 distance (timbre fingerprint); James's own takes sit ~3 apart.

| role | pick | why (numbers) | runners-up |
|---|---|---|---|
| DRIVER | **Masaki** (2Jg786yPJ6zSdiI0EAAH, "Calm Japanese Narrator") | clear on every call (masaki3 untagged p 0.80 / 0.86 / 0.80; masaki1 "Signal! Green!" 0.86, a firm falling end -13 st), calm (f0 sd 1.9-2.0 st on "Speed check"), timbre well away from James (MFCC 6.3-6.8, f0 181-220 vs James 175 Hz) and from the tourist (5.9) | Kei: near-native English and clear untagged (0.84 / 0.87 / 0.73), but the closest timbre to James (MFCC 3.0 untagged): risk of "the narrator again". Taro: most distinct (MFCC 10+) but his library voice is "a distinct Japanese accent" + upbeat (the script forbids an accent). Hideo: tagged takes unclear on "Signal green" (p 0.23-0.31), "typical Japanese pronunciation" |
| TOURIST | **Flackoo** (3lqN2QjRfNc5KxYJLLOR, young New York) | the liveliest laugh line (f0 range 12.8-13.3 st, ends rising +6 to +9 st), the flattest, smallest "Bag... gone." of all (range 2.7 st, sd 1.1, 14 dB quieter raw than his laugh line, p 0.60), distinct from James (MFCC 6.9) and Masaki (5.9) | Peter (NY, slight Brooklyn): clearest "Nobody does that in New York!" (0.82-0.84) but "Bag gone" p 0.40-0.48 and not flat (7.7-10 st). Gus: timbre closest to James (MFCC 3.4). Jerry B (California surfer): compressed dynamics (11-13 dB) and "Bag gone" p 0.32-0.39. Hal: "Nobody does that..." p 0.48 / CLIPEND |
| KID | **Kavya** (bA58y3FqVI6b6gTNh0oT, "Cute & Engaging Character") | the most child-like pitch of the clear takes (292-296 Hz; a 6-year-old is ~250-330), clear (kavya2 p 0.71, kavya1 0.66), the shortest in-take vocal tract of the female kid voices (15.6 cm) | Chutki2 (p 0.70, 271 Hz, a proud rising end +3.4 st): the alternative if the owner hears Kavya as too soft. Munni 0.62-0.67, Piku 0.54-0.61, Kiran (kiran1 was heard as an expletive), Teddy / Valf = adult men pitching up (preview vocal tract 18.6 / 19.0 cm) |

Library-voice facts that changed the plan: untagged kid takes with "Doors... closed!" as previous_text twice SPOKE the
context ("Doors closed.", "Dog, check!"): the final kid takes are all tagged. The driver's "[firmly]" tag rushes "Speed
check" (p 0.39-0.53): the final driver takes lead with untagged reads.

Audition reels for the owner (each take gained to -18 LUFS, 1.2 s apart, winner first; index in takes/auditions_<role>.json):
`studio/out/pointing/voicetest/auditions_driver.mp3` (masaki 0.3 s, kei 12.3, hideo 24.3, taro 36.3),
`auditions_tourist.mp3` (flackoo 0.3 / 5.6, peter 8.6 / 13.9, gus 16.8 / 22.2, hal 25.3 / 30.7, jerryb 33.8 / 39.2),
`auditions_kid.mp3` (kavya 0.3 + 2.9, chutki 5.6, munni 8.3, piku 11.0, teddy 13.8, valf 16.6).

## Opening = a separate, swappable segment (the lead, 2026-11-19 16:20)
The owner is re-engineering the first 3-5 s (a hook lab). d01 "Signal... green!", t01 "Bro's pointing at nothing!",
n01 "Give him a minute...", maybe n02 "And the man he's laughing at?..." may change. The current opening is recorded
for comparison, and the build also writes the opening (d01..n02) and the body (n03..t06) as separate segments.

## Next
probe + cast tables (takes/probe_cast.txt, takes/cast_r1.txt, takes/probe_narr.txt) -> pick the cast -> pt_jobs.py chars ...

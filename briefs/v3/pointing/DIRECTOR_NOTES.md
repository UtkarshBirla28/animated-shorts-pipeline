# DIRECTOR NOTES: "Why Japanese Train Drivers Point at Nothing", script v3 (film owner)

## V4 HANDOVER (DIRECTOR #2, 2026-11-20 08:55; the project moves to another PC; nothing of mine runs, no RAM token held)
State: every file whole, `tsc` 0 at 08:53. Repo root = `<ROOT>` (was C:\Users\utkar\Desktop\animated-shorts-studio).
**WHAT EXISTS (v4 = the true story, LOCKED script sound/pointing/SCRIPT_v4.md + sound/pointing/script_v4/lines_v4.json, 22 lines)**
- The v4 film next to v3 (v3 untouched): `studio/src/videos3/pointing/v4/` = index.ts, Root.tsx (comp **PointingV4Kit**),
  FilmView.tsx, film.ts, timeline.ts (THE CLOCK + `EV` of the opening: lampGreen, goFlashes go#1..6, red go#7, redBeatEnd,
  xPop she#1, loopPoint point#6), shot_plan.ts (36 shots v01..v36, cuts = rules on words), script.ts + plan_words.ts
  (GENERATED), words.ts (placeholder: VOICE writes it), resolver.ts (R_V4 for CAST beats), camkit.ts (glide-then-REST,
  default view per set), cams.ts, Captions.tsx, sets/<set>.ts (owner entries = re-exports of the v3 sets for now),
  sets/_template_example.ts (the shot template; compiles; not in the film).
- Docs: `briefs/v3/pointing/V4_STRUCTURE.md` (files, owners, template rules), `briefs/v3/pointing/SHOT_TABLE_v4.md`
  (36 shots: cut word, lines, owner, people sizes, held poses + cues, 3 movers, camera glide + rest, captions).
  Plan length 2063 f = 68.77 s at 3.25 w/s (0.77 s over the 68 s target; the real voice decides; cut line 6 first if over).
- Tools: `briefs/v3/pointing/director/make_v4_script.py`, `probe_v4.mjs`, `make_shot_table_v4.py`, `opening_v4.py`;
  `tools/v3/gates_v4.py`, `tools/v3/compare_films.py`.
**HALF-DONE**
- Opening pipeline TEST at draft (08:34-08:48) with a STAND-IN sound (v3 hook_0-12s.wav), --no-copy: the render of v01-v06
  worked (studio/out/pointing_v4/shots/draft/, opening_v4.mp4, opening_audit/ strip, go_run, gates_v4); the compare step was
  stopped at the handover (compare/ incomplete). These frames show the v3 lab (LAB has not staged v4 yet): NOT for review.
- Sets are still v3 re-exports: LAB / TRAIN / STATION must write their v4 staging (template) and cameras keyed v01..v36.
- gates_v4's four card gates need CAST's per-frame log (format in the gates_v4.py header): requested, not delivered.
**NEXT STEPS, in order (THE OPENING FIRST)**
1. VOICE installs the v4 voice into `studio/src/videos3/pointing/v4/words.ts` (the 7 "Go" onsets as words); SOUND writes
   the opening mix. Then (cwd `<ROOT>`): `node briefs/v3/pointing/director/probe_v4.mjs json briefs/v3/pointing/director/timeline_v4.json`
   and `python briefs/v3/pointing/director/make_shot_table_v4.py` (if the text changed first: `python briefs/v3/pointing/director/make_v4_script.py`).
2. LAB stages v01-v05 (+ v06) in `studio/src/videos3/pointing/v4/sets/lab.ts` (+ cameras v01..), CAST the young woman's poses
   (cues from `v4/resolver.ts`, events from `v4/timeline.ts` EV). Check on draft stills (cwd `<ROOT>/studio`):
   `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --stills 0,30,60,100,160,190 --out out/pointing_v4/`
3. THE OPENING (cwd `<ROOT>`): `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/opening_v4.py --audio=<SOUND's opening mix .wav> --quality=preview`
   -> studio/out/pointing_v4/opening_v4.mp4 + pointing_preview/VIDEO_v4_opening.mp4 + studio/out/pointing_v4/opening_audit/
   (strip_0-8s.jpg, go_run.jpg, opening_audit.json, gates_v4.md, compare/). Judge: frame 0 in 0.25 s (lamp, face, button),
   narrator at 0.05 s, first picture change ~1.5 s (<= 2.3), the push-in through the Go run, the red on a hard cut, the held
   beat 0.5 s, her frozen face, no gap over 0.5 s except the beat. Report to the lead before anything else is built.
4. The rest of the film shot by shot (TRAIN v19-v30, STATION v31-v35, LAB v06-v18 + v36 loop match), then a full preview:
   cwd `<ROOT>/studio`: `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality preview --shots all --conc 1 --out out/pointing_v4/`
   (-> out/pointing_v4/pointing_v4_preview.mp4), mux the mix (ffmpeg -map 0:v -map 1:a -c:v copy -c:a aac), then (cwd `<ROOT>`):
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/gates_v4.py <mp4> --shots=briefs/v3/pointing/director/timeline_v4.json --cast=<CAST's log> --out=<dir>`
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/qa_gates.py <mp4> --shots=<shots json> --words=<voice words.json> --out=<dir>` (loudness, peak, LRA, captions, seam, chroma; ignore its camera gate for v4)
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/compare_films.py <mp4> --out=<dir> [--step=2.5] [--max=<s>]`
   storyboard sheet: `tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/sheet_from_video.py <mp4> <out.jpg>` (v3 clock: use a v4 copy or pass timeline_v4.json; it reads director/timeline_v3.json today).
**TOOLS / VERSIONS USED HERE**: node v22.14.0 (+ studio/node_modules: remotion, esbuild, three; never npm install), Python 3.12.3 in
`tools/.venv` (numpy, Pillow; run with PYTHONNOUSERSITE=1 ... -s), ffmpeg + ffprobe 9.0.2 (gyan.dev full build) on PATH, Git Bash.
**PATHS OUTSIDE THE PROJECT (copy them or fix the scripts on the new PC)**
- `C:/Users/utkar/Desktop/yt short videos/` (+ `new_2026-11-19/`): the reference Shorts. compare_films.py (REFDIR, line ~22) reads
  "Why Perfect Railroads Don't Work", "The Ancient Jar That Warned an Empire", "The Job Nobody Wants in Japan" (then "How One
  Cart Stopped an Entire Army", "Why Sailors Carried Storm Oil"); also the benchmark's motion.py reads that folder.
- Our own films compare_films.py reads INSIDE the project: studio/out/antitheft/antitheft_FINAL_1080x1920.mp4,
  studio/out/clown/upload/clown_FINAL_1080x1920.mp4 (+ reference frames in sound/pointing/hook_lab/strips/, studio/out/pointing/benchmark/).
- `C:/Users/utkar/Desktop/RAM_TOKEN.txt`: the RAM token (studio/scripts/ram_token.sh, RAM_TOKEN= line 7; kit_render uses it).
- `C:/Windows/Fonts/arialbd.ttf`, `arial.ttf`: labels in opening_v4.py, compare_films.py, sheet_from_video.py, sheet.py,
  audit_opening.py, qa_gates.py (fall back to PIL's default font if missing). Caption font = studio/public/fonts/Montserrat.ttf (inside).
- Absolute "C:/Users/utkar/Desktop/animated-shorts-studio/..." in studio/out/pointing/benchmark/animation/tools/motion.py (B, S);
  scratch helpers only: none of the v4 tools above hard-code the project path (they resolve it from their own location).
- Research notes: `C:\Users\utkar\research_notes\devenseenath\PLAYBOOK.md` (hook rules 3.1, checklist 8),
  `C:\Users\utkar\research_notes\ricksclips\` (script craft). Memory notes live in the user's Claude profile, not in the repo.

## V4 PREP (DIRECTOR #2, from 08:00; network unstable: two lines after every finished step)
- done 08:20: `director/make_v4_script.py` (SCRIPT_v4.md table or lines_v4.json -> `videos3/pointing/v4/script.ts` LINES with
  caption chunks + `v4/plan_words.ts` at 3.5 w/s; line ids L01..; ran on revision 2: 25 lines, 221 words, 67.5 s planned).
- done 08:12: `v4/timeline.ts` (the clock: plan or v4/words.ts, cuts = SHOT_PLAN rules "line:Lnn" / "word:key#n"),
  `v4/shot_plan.ts` (26 shots v01..v26, first pass on revision 2), `v4/words.ts` placeholder (VOICE), `director/probe_v4.mjs`
  (table: 2029 f = 67.6 s planned). tsc 0.
- done 08:15: ITEM 1 + 2: `v4/` = camkit (glideRest/pushRest/slideRest/withRest + default view per set), cams, film,
  Captions, FilmView, Root (comp PointingV4Kit, kit_render --info OK: 26 shots 2029 f), index, resolver (R_V4 for CAST beats),
  `v4/sets/<set>.ts` wrappers (build + CAMS, per-set hashing), `v4/sets/_template_example.ts` (compiles). Map + template:
  `briefs/v3/pointing/V4_STRUCTURE.md`. tsc 0.
- done 08:20: ITEM 3 `tools/v3/gates_v4.py` (holds 8-20 %, whole-frame < 60 %, every shot moves-then-RESTS, no 2-s
  one-thing shot, no shot > 3.5 s; card gates from CAST's per-frame log: arm-out < 10 %, no hand in a face box, no
  see-through card, faces <= 1/4 outside closeUp). On FINAL v1 it reproduces the benchmark (holds 0.0, wide 83.5, 25/26 no rest).
- done 08:25: ITEM 4 `tools/v3/compare_films.py <our.mp4> [--out=]`: sheets every 2.5 s (ours | anti-theft | clown | 3 refs),
  frame-0 sheet, compare_table.md (length, cuts, avg shot, moving area, hold, whole-frame, one-thing, L*, chroma, shadow
  chroma, saturation). Test run on v1 DONE (6.5 min): studio/out/pointing/compare_v1/ (4 sheets + frame0 + table).
- done 08:25: SHOT TABLE on SCRIPT_v4.md REVISION 4 (23 lines): v4/shot_plan.ts = 32 shots v01..v32 (opens + ends on the
  steam cab; none over 3.5 s), `briefs/v3/pointing/SHOT_TABLE_v4.md` GENERATED by director/make_shot_table_v4.py (staging
  dict inside) from director/timeline_v4.json (probe_v4.mjs json). 2036 f = 67.9 s on the plan. tsc 0.
- done 08:31: LOCKED SCRIPT (lines_v4.json, 22 lines; the trap first, frame 0 = the lab lamp + the young woman): make_v4_script.py
  now reads numeric ids, plans at 3.25 w/s from 0.05 s, the GO GRID (7 onsets, gaps 0.46 -> 0.26 s, + a 0.5 s held beat),
  no caption words on the Go run. shot_plan.ts = 36 shots v01..v36 (none over 3.5 s), SHOT_TABLE_v4.md regenerated (staging for
  all 36). Plan 2063 f = 68.77 s at 3.25 w/s (0.77 over the 68 s target; joins 0.15 s). v4/timeline.ts EV: lampGreen,
  goFlashes (go#1..6), red (go#7), redBeatEnd, xPop (she#1), loopPoint (point#6). tsc 0.
- done 08:34: `director/opening_v4.py --audio=<opening mix> [--quality=] [--shots=] [--no-render] [--no-copy]`: tsc, clock,
  kit_render v01-v06 (--conc 1), concat + mux (never silent) -> studio/out/pointing_v4/opening_v4.mp4 (+ pointing_preview/
  VIDEO_v4_opening.mp4), audit -> studio/out/pointing_v4/opening_audit/ (strip 0-8 s, go_run.jpg, opening_audit.json, gates_v4,
  compare/ at 0.5 s over 8 s vs anti-theft / clown / refs). compare_films.py got --max. PIPELINE TEST running (draft, v3 hook
  wav as a stand-in, --no-copy); per-set hashing confirmed (lab, kitchen, jp_platform, cab, car, steam, ny_station).
- next: read the test, message the lead "the opening can be rendered".
- done 08:28: lead messaged (items 1-4 + table). NEXT: on the lead's word (script locked / VOICE installs v4/words.ts):
  make_v4_script.py (if words changed) -> probe_v4.mjs json -> make_shot_table_v4.py.
- (older line:) next was: ITEM 4 the comparison harness; then SHOT_TABLE_v4.md
  from SCRIPT_v4.md revision 3 (opens + ends on the steam cab; 32-36 shots, none over 3.5 s).

## NOW (DIRECTOR #2, 05:12): THE FINAL IS DONE
**NEXT STEP:** none for the film; the owner uploads in Studio with `studio/out/pointing/upload/UPLOAD_KIT.md`
(paste the clown Short's link into the description). Post-release touches: Block 16 of SHOT_REQUESTS.
- FINAL: `studio/out/pointing/pointing_FINAL_1080x1920.mp4` (copies: `studio/out/pointing/upload/`,
  `pointing_preview/VIDEO_FINAL_1080x1920 (hook B).mp4`). 1913 f, 1080x1920, AAC 384k. Rendered 04:24-05:07 (2547 s,
  0.57-2.07 s/f wall per shot). Gates `studio/out/pointing/pointing_FINAL_gates/`: film PASS 9/9. Upload kit + 3 covers in
  `studio/out/pointing/upload/`.

**NEXT STEP:** when `studio/out/pointing/director/final_B_main.log` says "done" (expected 06:15-06:30): the final is
`studio/out/pointing/pointing_FINAL_1080x1920.mp4` (hook B, mix.wav 03:54, AAC 384k), gates `studio/out/pointing/pointing_FINAL_gates/`.
Then: full-size frames of every shot (sheet_from_video.py + fsheet), s03b blur at final, 3 covers into
`studio/out/pointing/upload/` (frame 0 + two others), copy the mp4 to upload/ and pointing_preview/, finish
`upload/UPLOAD_KIT.md` section 9, message the lead. A failing shot: fix, re-render ONLY it (`--shots <id>` with the same
props/out), then concat by hand (like r2B_concat.txt) and re-mux.
- Started 04:24:10 by `bash briefs/v3/pointing/director/final_B.sh` (detached; node pid 24848 at start). Code frozen 04:24.
- 04:20 shots.ts: s03 exposure 1.3 (L* 36.9), s21 exposure 2.1 (L* 38.4). s20 / s14 checked on draft stills 04:23 (sbG).
**NEXT STEP:** the lead decides stage E. Director's verdict: READY FOR STAGE E after two small fixes checked on draft stills
(s20 the boy's finger at the bag; s21 exposure), no third full preview needed. Stage E = `cd studio && node
scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality final --shots all --conc 1
--props '{"hook":"B"}' --out out/pointing_final_B/` (~1.6-2.0 h), mux mix.wav (AAC 384k, no -shortest), qa_gates on the final.
- 04:05 ROUND 2 (hook B film) out: `pointing_preview/VIDEO_full_draft_v3_round2 (hook B).mp4`, sheet
  `pointing_preview/storyboard_v3_all_26_shots_round2.jpg`, gates `studio/out/pointing/pointing_v3_preview_r2B_gates/`
  (film: all PASS, camera 0.67), opening clips re-exported (A = hook-A s01/s02 of 04:03 + the round-2 rest). Block 15.
  Chunks: hook B all 26 in `studio/out/pointing_hookB/shots/preview/` (s03b newer than the rest: hand concat list
  `studio/out/pointing/director/r2B_concat.txt`). s03b sunEl 11 in shots.ts (CAB_FACE); s03 kept at 20 (its green-lamp read
  was proven at 20; the 0.8-s cut between two cab views does not show the sun height).
- 03:31 BLUR GATE settled (Block 14c): preview blur = the 540-px preview (s22 0.121 -> final 0.023, s13 -> 0.034); at final
  only s03b fails (0.155, shallow focus). Final cost: steady 2.4-2.8 s/f -> whole film ~1.6-2.0 h. Test clips:
  `studio/out/pointing/test/`. Block 14b = per-shot on-screen camera targets. Owner delegated approval to the lead: stage E
  starts when round-2 gates + the director's audit pass and the lead says go.
- OPEN for the director: s03b / s03 `sunEl` 11 in shots.ts META (CAB rigOpts) when TRAIN confirms (lead relays).
**NEXT STEP:** the preview ROUND 2 when the lead relays "all saved" after the Block 14 fix list (TRAIN s21 + v3_s03b lens +
camera/warmth; CAST s16a / s13 / s12 life + the s03b acting; STATION exposure + on-screen camera + s07 + s23; LAB s17 / s19):
`bash briefs/v3/pointing/director/full_preview.sh` (tsc, clock check, all 26 shots at --conc 1, mux mix.wav, copy to
pointing_preview/VIDEO_full_draft_v3.mp4, qa_gates), then `sheet_from_video.py` for the storyboard sheet, then the shot audit
against Block 14 (gates: on-screen camera >= 0.5 per shot / film >= 0.6, life >= 0.12, L* 40-60, chroma 18-30).
- 03:05 s03 SPLIT in the clock (LEAD decision, spec = Block 13): s03 f140-164 (the glove insert), s03b f164-212 (the driver's
  face). timeline.ts SHOT_IDS + RULES (`s03b: fr(S("signal") - 0.04)`), shots.ts META, film.ts `S03_WHOLE`: until TRAIN's
  `v3_s03b` exists, s03 AND s03b run TRAIN's s03 lens over the old whole span (picture identical to the pre-split s03); it steps
  aside by itself when `v3_s03b` lands. make_bible.py has s03b; bible PASS 0 fail / 24 warn; tsc 0 (03:04). 26 shots now.
  SOUND's film_clock now also sees "v3_s03b".
- 03:00 FULL PREVIEW v1: `pointing_preview/VIDEO_full_draft_v3.mp4` (= `studio/out/pointing/pointing_v3_preview.mp4`, 1913 f,
  mix.wav 02:10, code of 02:36). 25 shots in 1407 s. Gates: seam, loudness -14.0, TP -2.7, LRA 3.5, captions 100 % PASS; film
  on-screen camera 0.39 FAIL; life fails s09 s12 s13 s16a s17 s19; L* > 60 on platform shots; chroma < 18 in cab/car/lab;
  blur fails everywhere (probably the 540-px preview). Audit + fix list = Block 14. Storyboard sheet rebuilt from the film:
  `pointing_preview/storyboard_v3_all_25_shots.jpg` (tool `director/sheet_from_video.py`).
- 02:20 seven beats: all READ on the film now (foot hook small; the look just). Block 12.
- 02:00 THE OPENING: `pointing_preview/VIDEO_opening_hook_A/B ...mp4` + read-me; lead picked B (after C-8, fixed by CAST 02:02).
  NOTE: those two clips are the 01:40 / 01:53 code; the full preview of 03:00 is newer (C-8 fixed, frame-0 colours) but is
  hook A. A hook-B re-export needs `kit_render --shots s01,s02 --props '{"hook":"B"}' --out out/pointing_hookB/` + assemble_opening.py.
- Clock: TOTAL 1913 f = 63.77 s; cuts 0 81 140 164(s03b) 212 262 344 416 509 623 719 770 874 943 1020 1053 1150 1272 1356 1467
  1497 1601 1675 1706 1799 1855. ONSET_FIX = { "what's#1": 24.195 } only. Caption band = top of SHOT_REQUESTS.

## HANDOVER 2026-11-20 00:40 (DIRECTOR -> the fresh DIRECTOR; nothing of mine is running, no stills slot, no RAM token)
**NEXT STEP:** step 4.1 below (the opening render of both hook exports), as soon as the fresh TRAIN owner has closed
T-7 (rest) / T-8 / T-11, or when the lead says "render now". Everything compiles (`npx tsc --noEmit -p
src/videos3/pointing/tsconfig.json`, exit 0 at 00:33). I was told NOT to edit any owner's file and I did not, except
the one allowed line in `cast/beats.ts` (`BEATS = BEATS_V3`) and running CAST's own tool `cast/voice_sync.py` (it
rewrites `cast/voice_v1.ts`).

### 1. What runs and is checked
- **`studio/src/videos3/pointing/timeline.ts`** (THE CLOCK): the script's 26 lines + caption chunks, every word timed,
  each cut a rule on words, shared events `EV`, `TOTAL`, `L`. Source now: `plan_words.ts` = VOICE's REAL opening words
  (23 words, through "nothing!") + the plan shifted by -0.19 s. Cut 1 = frame 81 (2.70 s), cut 2 = frame 145 (4.83 s):
  the same frames VOICE wrote in `opening_words.json`. Plan total 1948 f = 64.93 s. TESTED offline on a synthetic
  real-voice words.ts (digits "6" / "1,000" / "1.", no replay words, two words missing): it matches line by line and
  reports what it could not find in `TIMELINE_NOTES`.
- **`shots.ts`**: the 25 shots with exactly the outline's ids (s01..s24, s16a, s16b), frames from the clock, `line` with
  speaker tags for CAST, `look` = STATION's JP_RIG preset per platform shot. No camera / set import (no cycle).
- **`cams.ts` + `film.ts`**: a shot's camera = the owner's `v3_<id>` (then the plain id) from the table of its own set.
  The director's motion layer (`DIR_MOVE`) is still in film.ts but is on NO shot now: it steps aside for any camera that
  measures >= 0.25 %/f, and the owners gave every shot its own move. `DIR_REAIM`, `DIR_FALLBACK`, `DIR_OVERRIDE` are
  empty / unused (the lab has its own v3 cameras). Sets in the film: cab, car, jp_platform, lab.
- **Hook prop**: `inputProps.kit.hook` = "A" (default: one shot to cut 1) or "B" (a same-axis 1.25x punch-in on "He",
  frame 51, his eyes kept in place; shot 2's 10-frame face hold carries the same 1.25x and gives it back during its
  move, so the face matches across cut 1 in both). CHECKED only by numbers (the probe); NOT yet seen on a still.
- **`Captions.tsx`**: the script's chunks, CAPS for characters, the building call-outs ("SIGNAL..." then "SIGNAL...
  GREEN!"), the phone pictogram, the small last line, the music note, auto-fit to 960 px. Seen on the stills: all good.
- **Bible v3**: `bible.json` PASSES the validator at 00:28 (0 fail, 23 warn; film camera 0.54 %/f by the validator's
  count, 0.56 by the probe; s21 is a planned freeze = the script's hold). script_lint on the v3 lines: PASS
  (`SCRIPT_v3_lint.md`, `lint.json`; v2 files kept as `*_v2.json`). `BIBLE_NOTES.md` has the "v3 changes" block.
  The bible is GENERATED: `director/make_bible.py` (it locks `voice` by itself once the clock runs on words.ts).
  Its `storyboard.still` fields are empty, so only the `decide` stage passes (gate1 / build would ask for stills).
- **`director/probe.mjs`** (no render, ~5 s): `table`, `caps`, `json <out>`, `cams [<out>]` (every shot's speed, the
  FILM line, which shots carry the director's layer).
- **Cast**: `BEATS = BEATS_V3`; the beat report printed in my render logs was EMPTY (no red lines). I did NOT render
  CAST's own `PointingCastBeats` check sheet.
- NOT run, written only: `director/assemble_opening.py` and `director/audit_opening.py` (the first run is their test).

### 2. The storyboard
`pointing_preview/storyboard_v3_all_25_shots.jpg`: 51 draft stills, every shot, shot id + time + frame + line under
each. Stills: `studio/out/pointing/director/sbC/stills/draft/` (s01-s06, 13 stills, state of 00:20, AFTER CAST's and
most of TRAIN's fixes) and `.../sbB/stills/draft/` (s07-s24, 38 stills, state of 23:43; rendered on the timeline before
the opening words: frame f there is frame f - 6 now, the sheet tool takes `dir@-6`). Older sheets referenced by the
requests: `studio/out/pointing/director/sheetA.jpg`, `sheetA2.jpg` (the opening BEFORE the fixes), `sheetB2/3/4.jpg`.
Verdict per shot, as a stranger on a phone:

| shot | reads? | note |
|---|---|---|
| s01 | READS | f0: stunned man, straight arm, fingertip on the yellow suitcase behind the door glass, phone low; f42 bag gone; f60 / f78 blank face to the lens |
| s02 | READS | f82 the same face on the cut; f105 the whole suitcase at his knee, the boy; f140 the phone swung to the glass |
| s03 | READS, one flaw | f200 white glove under the green lamp; f146 the lamp is there on the cut BUT the glove sits under the caption "at a finger." (T-11) |
| s04 | HALF | his laughing profile + the boy looking up; the jab and the boy's finger on the glass do not read (T-7 rest) |
| s05 | glide READS, hook DOES NOT | no sneaker / wheel in view at f340 (T-8) |
| s06 | READS | mum lifts the boy, he points at the lens, the yellow top, the glove in the corner (f395) |
| s07 | READS | doors open, the suitcase at the threshold with its handle up, his back |
| s08 | READS, catch HALF | boy's arm on the bag, his eyes pop, "BAD SUITCASE." + wag; the tip over the gap and the lunge were not caught on a still |
| s09 | READS | the plant: doors, the late salaryman gives up |
| s10 | READS | selfie, suitcase at his knee |
| s11 | READS | the bag parked in the doorway, "STAY." |
| s12 | READS | the bag alone, the boy's worried face, mum's hand |
| s13 | READS | his mock point, doorway + bag + boy + mum behind him (phone at his ear on that still: C-7, reported fixed) |
| s14 | READS | boy's arm on the big suitcase; his face is cut by the left edge (S-8). 1.10 s kept |
| s15 | DOES NOT READ | his back to the lens for the whole shot, the boy's cap fills 40 % (S-7; STATION added a turn afterwards: unverified) |
| s16a, s16b | READ | he at his phone in front, doorway + bag + boy + mum behind; the phone pictogram caption |
| s17, s19 | READ | two jars, 6 balls against 1, both bars equally full, the bubble, the music note |
| s18 | READS | the cutaway: bag in the near corner, his back |
| s20 | READS | the boy's arm pointing at the bag, his back beyond |
| s21 | DOES NOT READ | a profile cut by the frame edge pointing at a desk; no door lamp to find (T-10) |
| s22 | READS | the payoff: he giggles in front, the doors shut on the bag, the glide |
| s23 | HALF | his head turns, eyes wide: reads; the boy in the window is a dark speck (S-9) |
| s24 | READS | flat face, hand by the ear, the arm out at the suitcase: the last frame is frame 0's picture |

**The seven beats** (full-size stills in `pointing_preview/storyboard_v3_beat_*.jpg`):
1. Frame 0: READS. My own 0.25 s read: "a man in a red cap pointing at a yellow suitcase in a train doorway". Honest
   limits: no 5-person flash test was run; the red cap is the loudest colour, the yellow second, the green stripe
   third and right behind the bag (T-6), so the yellow is NOT the one focal colour: the eye goes cap -> arm -> yellow;
   that it is LOST needs the first half second (the slide) and "His bag / on that train.".
2. Shot 2's jump back: READS (face matched on the cut, the whole suitcase by ~0.8 s into the shot).
3. The no-look foot hook: DOES NOT READ (T-8).
4. The catch at the door: HALF (the boy's point, the eyes popping and the wag read; the suitcase tipping over the gap
   and the lunge are not proven: render a still at "saves", frame ~585).
5. The boy's second point: READS in 1.10 s once his face is in frame (S-8).
6. The 0.7 s look that does not see: DOES NOT READ on the last still (S-7).
7. The two TRIES bars: READ (6 against 1, bars equally full; they are ~4 % of the frame height, at the limit).

### 3. SHOT_REQUESTS_v3.md (8 blocks; the list of every id is at its end)
CLOSED: ALL-1, T-1, T-2, T-3, T-4, T-5, T-9, S-1, S-2, S-3, L-1, L-2, L-3, C-1, C-3, C-4, C-5, C-6 (by report), C-7 (by
report), CAM-1, CAM-2, CAM-3.
OPEN: T-6 (green stripe, small), T-7 (rest: jab + finger on the glass), T-8 (foot hook), T-10 (s21 door lamp), T-11
(s03 glove under the caption on the cut), S-7 (s15 his face; verify), S-8 (s14 face cut), S-9 (s23 boy in the window),
S-10 (= C-7 in s16a / s22: check), C-2 (gone when words.ts lands), SND-1, SND-2, V-1 (info).
Not yet relayed to the owners: block 7 (T-10, S-9, S-10) and block 8 (T-11).

### 4. Next steps, in order (Git Bash, repo root unless said)
**4.1 The opening, both hook exports with sound** (deadline: when TRAIN closes T-3 / T-4 / T-7 / T-8 / T-9; T-3, T-4,
T-9 are closed, T-7 half, T-8 open):
```bash
cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json && cd ..        # must be silent
node briefs/v3/pointing/director/probe.mjs table | head -9                            # cut 1 = f81, cut 2 = f145
# a) check the fixes on draft stills (0 78 = s01, 82 = s02, 146 = s03, 240 = s04, 340 = s05, 395 = s06; 50 / 51 = hook B's punch)
cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality draft --stills 0,78,82,146,240,340,395 --out out/pointing/director/sbD/
node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality draft --stills 50,51,78,82,92 --props '{"hook":"B"}' --out out/pointing/director/sbD_hookB/
# b) preview chunks: hook A s01-s06 into the film's cache, hook B s01 + s02 into ITS OWN folder
node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots s01,s02,s03,s04,s05,s06 --out out/pointing/
node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots s01,s02 --props '{"hook":"B"}' --out out/pointing_hookB/
# c) sound + the two files + the copies in pointing_preview (SOUND's 0-12 s mix on the REAL opening voice exists since 00:04)
cd .. && PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/assemble_opening.py --audio sound/pointing/audio/hook_0-12s_opening.wav --tag "voice + SOUND's 0-12 s mix"
#    (voice alone, 8.76 s: --audio sound/pointing/voice/_v3/_opening/voice.wav)
# d) the audit on the real frames (numbers + two frame sheets + flash_A.jpg in studio/out/pointing/audit/)
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/audit_opening.py
```
Outputs: `studio/out/pointing/opening_v3_A.mp4`, `opening_v3_B.mp4`, copies `pointing_preview/VIDEO_opening_hook_A (one
shot).mp4` and `VIDEO_opening_hook_B (punch-in).mp4` (the picture s01-s06 is 14.57 s, the mix 12.0 s: the clips are cut
to the shorter one, never silent). Then LOOK at `studio/out/pointing/audit/opening_A_frames.jpg` / `opening_B_frames.jpg`
against SCRIPT_v3 section 1 and PLAYBOOK 3.1 (frame-0 focal point, motion from frame 1, words by 3 s / 5 s = 10 / 17
on the real voice, first cut 2.70 s in A and 1.72 s in B, clarity with the sound off), report honestly, and write
`pointing_preview/VIDEO_opening_READ_ME_known_issues.txt` (the lead asked for it: the open requests of section 3 that
touch 0-12 s). The lead picks the hook. Message the lead (SendMessage to main) when the two clips exist.

**4.2 When VOICE writes `videos3/pointing/words.ts`** (its full build was in `sound/pointing/voice/_v3/` at 00:16, not
installed yet): nothing to edit.
```bash
node briefs/v3/pointing/director/probe.mjs table        # the source line must say "words.ts (the real voice: N words)", notes: none
node briefs/v3/pointing/director/probe.mjs json briefs/v3/pointing/director/timeline_v3.json
node briefs/v3/pointing/director/probe.mjs cams briefs/v3/pointing/director/cams_v3.json
python briefs/v3/pointing/director/make_bible.py
PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s tools/v3/bible_validate.py briefs/v3/pointing/bible.json --json=briefs/v3/pointing/validate.json
```
Tell the lead the REAL total (the `TOTAL ... f = ... s` line; over 66.0 s the script's cut order 4.3 applies, over
70.0 s refuse) and any `notes`. Every chunk re-renders after this (words.ts is in every shot's hash).

**4.3 The full preview** (PIPELINE_V3 stage C; after 4.2, with the per-shot cache):
```bash
cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots all --out out/pointing/     # -> out/pointing/pointing_preview.mp4
cd .. && ffmpeg -v error -y -i studio/out/pointing/pointing_preview.mp4 -i "sound/pointing/audio/<SOUND's full mix>.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k studio/out/pointing/pointing_v3_preview.mp4
PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/v3/qa_gates.py studio/out/pointing/pointing_v3_preview.mp4 --words=sound/pointing/voice/words.json --out=studio/out/pointing/pointing_v3_preview_gates
```

**4.4 Storyboard stills still owed**: the catch at "saves" (frame ~585), s15 after STATION's turn (frames ~1095, 1140),
s21, s23 and s14 after their fixes, hook B at frames 50 / 51. Re-make the sheet:
`tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/sheet.py pointing_preview/storyboard_v3_all_25_shots.jpg 9 250 "studio/out/pointing/director/sbB/stills/draft@-6" studio/out/pointing/director/sbC/stills/draft <new folders>`.

### 5. Traps
- **kit_render deletes a shot's other chunks** when it renders that shot: hook B always into `out/pointing_hookB/`.
- **Every shot re-renders** when a SHARED file changes: timeline.ts, shots.ts, cams.ts, Captions.tsx, plan_words.ts,
  words.ts, anything in cast/ or kit/. `film.ts` is the exception (its cameras are in each shot's signature) and a
  set's own files only re-render that set's shots. So: do not re-run `make_plan.py` after the opening is rendered
  unless the words changed, and expect a full re-render when words.ts lands.
- **A broken import between two owner files stops every render** (batch B died once on `greenLampOf`): tsc first.
- **The opening-words splice**: `make_plan.py --opening <json>` replaces the plan's first lines with VOICE's real
  times and shifts the rest by the difference at the join; then run CAST's `voice_sync.py
  briefs/v3/pointing/director/plan_words.json`, or the cast acts the old words. Without `--opening` it writes the pure
  plan again (cut 1 back at frame 91).
- **Until words.ts exists the cast's timing is shot-relative** (the first word of each shot 0.03 s after the cut):
  acting in shots whose first word comes late (s08, s09, s12, s15, s22, s24) is early on the stills.
- **Never run `tools/v3/new_short_v3.py pointing --shots`** (it overwrites shots.ts with typed frames) and do not use
  `tools/v3/storyboard.mjs` for this film (it reads the bible's framings and rewrites bible.json).
- Hook B's match in shot 2 uses TRAIN's `MARKS_car.touristFace`; its punch in shot 1 uses STATION's
  `MARKS_jp_platform.s01` + an eye height of 1.27 m (a guess from a still: check the two hook-B stills).
- `probe.mjs caps` is a hand copy of the Captions rule (the film's own `CAPS` is the truth).
- Stills cost 35-70 s each while three or four renderers share the GPU (51 stills took about 55 min of wall time);
  nothing was rendered at preview quality by me, so there is NO measured preview s/frame for this film yet, and NO
  opening clip and NO audit of real frames exist yet.
- The owners edit live: measure the cameras again before trusting the bible's numbers (`probe.mjs cams`).
- SOUND's cue sheet computes its own cuts (cut 1 at frame 92 on its stand-in): request SND-1 asks it to read
  `briefs/v3/pointing/director/timeline_v3.json`; one frame of difference at most today.


## What exists (film-level files, all DIRECTOR-owned)
| file | what |
|---|---|
| `studio/src/videos3/pointing/timeline.ts` | THE CLOCK: the script's lines + caption chunks, every word timed (words.ts when VOICE has written it, else plan_words.ts), each CUT as a rule on words, the shared EVENTS (`EV`: doors, lamps, glide, melody ...), `TOTAL`, the loop length `L`. Imports only words.ts + plan_words.ts: any set may import it at top level |
| `studio/src/videos3/pointing/plan_words.ts` | GENERATED by `briefs/v3/pointing/director/make_plan.py` (the script's planned word times; `--opening <json>` splices VOICE's real opening words in) |
| `studio/src/videos3/pointing/shots.ts` | THE SHOT TABLE: 25 shots, ids exactly `s01 .. s24` with `s16a` / `s16b`, frames from timeline.ts, place / light / beat, `line` with speaker tags for CAST. No camera or set import (no cycle) |
| `studio/src/videos3/pointing/cams.ts` | the owners' camera tables by set (`v3_<id>` first) |
| `studio/src/videos3/pointing/film.ts` | the assembly: owner camera -> director fallback / override -> the HOOK prop -> ShotDef; sets = cab, car, jp_platform, lab (no New York, no kitchen) |
| `studio/src/videos3/pointing/Captions.tsx` | the script's own caption chunks (1-3 words, CAPS for characters, the phone pictogram, the small last line, the music note) |
| `briefs/v3/pointing/director/probe.mjs` | prints the table / captions / camera speeds from the film code (no render) |
| `briefs/v3/pointing/SHOT_REQUESTS_v3.md` | everything that is missing or wrong in another owner's files, per owner and shot id |

## How the film re-times itself
- `timeline.ts` matches the script's lines to `words.ts` (line by line, in order). When VOICE writes words.ts, every cut,
  caption, event and `TOTAL` follow at the next bundle; nothing to edit. The probe shows the result:
  `node briefs/v3/pointing/director/probe.mjs table`.
- Until then: `python briefs/v3/pointing/director/make_plan.py` (plan) or `... --opening sound/pointing/voice/_v3/opening_words.json`
  (real opening + shifted plan), then `python studio/src/videos3/pointing/cast/voice_sync.py briefs/v3/pointing/director/plan_words.json`
  so the cast acts the same words (CAST's documented re-time step; its timing is shot-relative until words.ts exists:
  the first word of each shot sits 0.03 s after the cut, so acting cues in shots whose first word comes late (s08, s09,
  s12, s15, s22, s24) are EARLY until the real words.ts lands).

## The two hook exports
`film.ts` reads `inputProps.kit.hook`: A (default) = one shot to the first cut; B = a same-axis 1.25x punch-in on "He"
(frame-switched, the tourist's eyes keep their screen place). Render B into its own folder:
`node scripts/kit_render.mjs --entry src/videos3/pointing/index.ts --comp PointingKit --quality preview --shots s01 --props '{"hook":"B"}' --out out/pointing_hookB/`

## Log
- 22:50-23:20 read everything; wrote timeline / shots / cams / film / Captions; tsc clean (1 m 27 s); `BEATS = BEATS_V3`
  flipped in cast/beats.ts (the one-line switch); cast/voice_v1.ts re-made from the PLAN words with CAST's own
  voice_sync.py. STATION had already flipped `SCRIPT = "v3"` at 23:05.
- 23:20-23:45 first stills: frame 0 reads; added `DIR_REAIM` (frame-0 tilt) and the DIRECTOR'S MOTION LAYER (`DIR_MOVE`,
  steps aside when an owner's camera measures >= 0.25 %/f) to film.ts; bible generator + linted v3 script
  (`SCRIPT_v3_lint.md`, lint.json = v3, the v2 files kept as `bible_v2.json`, `lint_v2.json`, `validate_v2.json`);
  requests blocks 2 + 3 (CAST pre-roll bug in s01, the glove, s02 match + crowd, s04 / s05 / s06 compositions). The
  lead relayed them: CAST, TRAIN and STATION are fixing; the lead approved the motion layer as the safety net.
- 23:45-00:40 storyboard: batch A re-done as `sbC` (the opening after the fixes), batch B (s07-s24), the sheet +
  the seven beat stills in `pointing_preview/`; requests blocks 4-8 (camera budget, s15 / s14 / s21 / s23, the glove
  under the caption); VOICE's real opening words spliced in (cut 1 f81, cut 2 f145; 10 words by 3 s, 17 by 5 s);
  the frame-0 tilt removed (STATION re-built the lens); hook B extended to shot 2's face hold; bible v3 PASS;
  hand-over ordered by the lead at 00:35 (model switch) before the opening render: see HANDOVER at the top.

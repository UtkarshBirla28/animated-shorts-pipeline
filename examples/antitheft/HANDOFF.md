# HANDOFF (2026-11-10 ~23:20): antitheft short, fix round 2 merge + ElevenLabs voice switch

The user will restart Claude Code after fix round 2 so the ElevenLabs MCP (user scope, `claude mcp get elevenlabs`:
uvx elevenlabs-mcp, ELEVENLABS_MCP_BASE_PATH=C:/Users/utkar/Desktop/elevenlabs-output) loads. Paid library voices are OK
(user said so). Starter plan (30k credits/month; v3 = 1 credit/char; our script ~1,250 chars).

## Fix round 2 (workflow wf_f7557437-e27, journal under ~/.claude/projects/C--Users-utkar/<session>/subagents/workflows/)
- MERGED by LEAD at 23:15: world_ext (sets_ext, paint), world_int (sets_int, lights, shade), char (toon, cast,
  cardshade), post (AntiTheft.tsx, Captions, grade, lensblur). Reports: studio/out/antitheft/rA2_fix_reports_partial.txt.
- Applied after merge: sets_int pours only scoops n=0,1 (CHAR's bait scoop 1618 draws its own chips); the I'M RETURNING
  note moved 0.15 m left; sets_ext raven bracket top y 1.8; AntiTheft.tsx GLINT_CORE=false, twinkles tw1=g+2, tw2=g.
- CAM (story.ts) was still rendering its check at 23:16: when done, `bash scripts/sandbox.sh merge cam story.ts`, then
  apply in story.ts (verify each with `node scripts/project.mjs '<expr>'`):
  1. KICKS: add [BEAT.pct8 / FPS, 1.6, 6]; move the mailed kick to (BEAT.mailed + 3) / FPS (the parcel lands at 1734).
  2. Shot 5: CHAR moved the fiance to [1.07,0,1.55]: look x +0.3 on all keys (his head must not be cut on the right).
  3. Shot 8 insert (key 0): pos tt([1.6,0.8,-0.75]) look tt([0.6,0.55,-3.2]) fov 38, creep 0.003 (asst2 kneels at
     tt([0.15,0,-3.45]) now) -- only if CAM's new insert does not already frame asst1's head + the chip.
  4. Shot 9: reader A at tt([-2.45,0,0.9]); reader B at tt([0.65,0,0.8]) -> B-hold keys +0.35 m x (key 3 pos
     tt([0.3,1.45,4.3]) look tt([0.1,1.55,0]); 'removed' pos tt([0.07,1.32,4.0]) look tt([0.02,1.38,0])).
  5. Shot 11: the manySteal key at BEAT.manySteal - 8, dur 30 (the walk is seen wide).
  6. Shot 14: the BEAT.pieces-6 key -> hold(sr([2.15,1.4,2.7]), sr([0.7,0.7,-0.95]), 48, BEAT.pieces + 34, 0.002);
     re-check the mailed key against it.
  7. Shot 1: MCU1 look y 1.0 -> 1.22 (glint rock + star clear of the caption band) if CAM did not.
  8. Shot 15: one dusk practical (lamp post bulb [3.18,3.97,-6] or goosenecks [+-0.4,4.29,0.235]) behind the tourist
     >= 20 f (POST's bokeh). Shot 2: the trail group at [-15.3..-16.45,0,-25.1..-25.7], photographer [-14.7,0,-23.9]
     (flash 171) should be in the crane's frame. Shot 12: the near-black foreground pupil head (1424-1490).
  Then: tsc; node scripts/export_timeline.mjs; node scripts/audio_probe.mjs; add to sound/antitheft/audio/
  picture_events.json: touristA_pick_10 1072, scoops_14 [1693, 1713.67] (+ the bait scoop 1618), vista_flash 171 if
  the photographer is in frame; cd sound/antitheft/audio && python mix.py; render preview3 with
  `bash scripts/render_chunks.sh out/antitheft/preview3_silent 0.5 2 0-619 620-1239 1240-1857` (auto-restart if
  killed: user's standing instruction) and mux with -c:a aac -b:a 256k.

## Voice switch to ElevenLabs (after restart)
- Reference profile (study/CHANNEL_STYLE_BIBLE.md section 9): one bright animated storyteller, F0 median ~195 Hz
  (174-211), p10-p90 ~14 semitones, 3.69 w/s, punch words +5..+9 st, secret lines -5 st, dry, warm low-mids, no breaths;
  character lines = same voice +2..+9 st. Current Kokoro v3: 152 Hz, 11.2 st (tools/voice_match.py; dist 1.72).
- Tool: tools/voice_match.py <folder> scores preview clips vs that profile (lower distance = closer).
- Plan: search_voice_library (free) -> download preview_url mp3s to study/voices/previews/ -> voice_match.py -> top
  4-5 -> generate 2 audition lines (hook + whisper) per candidate with eleven_v3 (~1k credits total) into
  study/voices/auditions/ -> USER LISTENS AND PICKS (Claude cannot hear) -> full script line by line with v3 audio tags
  ([whispers] on the whisper line, [excited]/[curious] etc.), 2-3 takes per line, respell Cialdini "Chal-dee-nee",
  48 kHz WAV -> words.json (API timestamps if available, else faster-whisper + refine_onsets.py) ->
  tools/gen_words_ts.py -> words.ts -> BEAT moves automatically; fix the few hard-coded frames in cast.ts / sets_*.ts
  (grep for 4-digit frame numbers) -> export_timeline -> mix.py. Keep 54-62 s.
- A headless `claude -p` library search was started at 23:00 (output study/voices/library_raw.txt); it may be killed
  by the restart: just re-run the search with the MCP tools directly.

## UPDATE 23:28 -- fix round 2 FULLY MERGED (all 6 owners) + LEAD requests applied; mix done (-14.0 LUFS, -2.9 dBTP)
- CAM story.ts merged (new helpers; shots 2/8/12 rebuilt; creep at P0 0.45 %/f). Reports: rA2_fix_reports.txt / .json.
- LEAD applied: cast.ts FI5 back on TH.fiance (CAM's shot-5 two-shot needs it), shot-13 red-cap tourist tt([-0.2,0,1.5]);
  plan.ts BP.signFloat y 2.5, TH.tourist [-0.05,0,1.85] (15->16 true match dissolve); KICKS parcel at mailed+3 + a 1.6
  kick on pct8; picture_events.json photo_13 null, scoops_14 [1693, 1713.67]; export_timeline + audio_probe + mix.py run.
- NEXT (right after the restart): render preview3 (`bash scripts/render_chunks.sh out/antitheft/preview3_silent 0.5 2
  0-619 620-1239 1240-1857`, then mux with mix.wav) while doing the ElevenLabs voice research. Audit A3 after the new
  voice is in (so the audit hears the final voice).
- NOT applied (put into fix round 3): see carryover_r3.md.

## THE LOOP CONTINUES (user confirmed 23:30): after the restart do BOTH
1. Scoring loop: preview3 -> audit A3 (audit_workflow.js, args {video: studio\out\antitheft\preview3.mp4, round: "A3"})
   -> tools/audit_digest.py -> fix round 3 (fix_workflow.js with notes + carryover_r3.md) -> merge -> preview4 -> audit
   ... until every shot scores >= 8, then final render 1080x1920 (render_chunks.sh at scale 1, crf 16-18, conc 2), mux
   (-map 0:v:0 -map 1:a:0 -c:a aac -b:a 256k), QA (loudness, captions, loop seam), deliver + memory.
2. ElevenLabs voice: library search -> voice_match.py ranking -> 4-5 auditions -> user picks -> full voice -> retime ->
   mix. Run audit A3 on a preview WITH the new voice if the voice is ready in time; never hold the visual loop for it.
Tell the user the score table after every audit. Restart killed renders automatically (standing instruction).

## UPDATE 2026-11-11 01:40 -- VOICE = ElevenLabs "James - Conversational, Energetic, Punchy" on eleven_v4 (user approved)
- Voice audit (tools/voice_audit.py, 11 auditions in study/voices/aud + aud_v4): winner James v4 8.99 (174 Hz, 14.9 st,
  question +8.8 st, "8%!" +7.1 st, real whisper). Library voices were added via tools/el_api.py (key read from
  ~/.claude.json at run time, never printed). Slots used 9/10 ("AT ..." voices). ~6k of 40k credits used.
- USER RULES: never time-stretch the voice (feedback_voice_quality_first); the video may run ~68-72 s instead of 62;
  final render ONLY after picture AND sound audits pass, recheck again and again (feedback_finish_only_after_audits).
- Takes: sound/antitheft/voice/takes/james_v4/{bNN.mp3 (t1, stab .5), t2/ (stab .5), t3/ (stab .4)}; texts bNN.txt.
  tools/beat_select.py james_v4 james_best -> best take per beat (clarity, acting, consistency) -> takes/james_best/.
  Then: python -s sound/antitheft/voice/eleven_build.py --takes=james_best --tag=eleven_v4:james --thr=0.10 (NO tempo)
  -> takes/james_best/_assembled/{voice.wav, words.json, phrases.json}.
- RE-TIME WITHOUT TOUCHING PICTURE CODE (247 hard-coded frames): tools/voice_warp.py <old words.json> <new dir> [--audio]
  -> studio/src/videos/antitheft/voicewarp.ts (VOICE_TOTAL, WARP new->old float frames, VOICE_WORDS) + audio warp.json.
  Integration after the fix-round-3 merge:
  1. run mix.py once in OLD units (old Kokoro voice still in place) -> picture_events_used.json (old frames);
  2. copy the old voice files to voice/_kokoro_v3/ (eleven_build --final does this), put the James files in voice/;
  3. python -s tools/voice_warp.py voice/_kokoro_v3/words.json voice --audio (timeline.json -> new frames, every cue
     mapped into picture_events.json, tumbleweeds mapped; originals kept as *_old.json);
  4. AntiTheft.tsx: `import { VOICE_TOTAL, WARP } from "./voicewarp"`, ANTITHEFT_FRAMES = VOICE_TOTAL,
     `const f = on.frames?.length ? ... : WARP[Math.min(cf, WARP.length - 1)]` (scene clock), Captions frame={cf};
     Captions.tsx: use VOICE_WORDS + VOICE_TOTAL instead of WORDS + TOTAL;
  5. fractional-frame fixes: cast.ts pop() helpers index arrays with f - t0 (use Math.floor), cast.ts `f === BEAT.otherHalf`
     -> Math.round(f) ===; grep for other `[..][f - ` patterns;
  6. tsc, mix.py (new units), render preview4 (render_chunks.sh, ranges up to VOICE_TOTAL-1), audit A4 incl. the new
     SOUND + VOICE auditor (id 99; owner VOICE = me: re-take lines with el_api.py tts ... eleven_v4).
  NOTE for later fix rounds: audit frame numbers are NEW video frames; owners work in OLD frames: old = WARP[new].

## UPDATE 02:35 -- fix round 3 FULLY merged; James narration installed (voice/_kokoro_v3 = old take); time-map live
- voicewarp.ts (VOICE_TOTAL 2256 = 75.2 s, WARP, VOICE_WORDS, toNew) + sound/antitheft/audio/warp.json; AntiTheft.tsx renders
  the scene at WARP[vf], Captions use VOICE_WORDS on vf; timeline.py fr()/bt()/shot_at() map picture frames -> voice time;
  sfx.py whistle/removed/fr patched; audio_probe.mjs evaluates BEAT/SHOTS/CUE; gen_words_ts.py refuses an ElevenLabs take.
- tools/timeline_video.py writes timeline_video.json (VIDEO frames) for auditors; both workflow prompts explain the 2 clocks.
- audit_workflow.js has a SOUND + VOICE auditor (id 99, owner VOICE = LEAD re-takes lines via tools/el_api.py tts).
- Running at 02:35: mix.py (James) + preview4 render (chunks 0-751, 752-1503, 1504-2255). Next: mux -> audit A4 -> fix round 4
  (notes: carryover_r4.md) -> ... until every shot >= 8 AND the sound passes; then final render (scale 1) + QA.

## UPDATE 04:40 -- narration round 2 (A4 VOICE list) DONE, waiting for fix round 4 (wf_5c011af1-5e1) to merge
- 48 directed takes (takes/james_r2, 4 per beat: stab .5/.4 x style 0/.3) + b01 re-takes (james_r2b; the long tag in round-2 b01
  LEAKED 'you can hear' into the audio: keep v4 tags short). tools/beat_select2.py (clarity incl. min word p, narrator 180 Hz
  +-3 st, contour, breathy tail, pace, acting) -> per-beat pick across BOTH rounds -> takes/james_final (R1: b02, b05; rest R2;
  b01 = james_r2b t1 by LEAD override). eleven_build.py --breath (new): pauses gated to silence with energy-refined word edges.
  Final read: takes/james_final/_assembled (79.8 s, 2.58 w/s). Listening copies: studio/out/antitheft/voicetest/*.mp3.
- v4 ignores pacing tags (2.5-2.8 w/s whatever the tag); speed 1.2 is the API max -> the film is ~80 s (user told; option B =
  the first read takes/james_best/_assembled, 74.9 s). audit_workflow.js now tells auditors to judge pace by contrast.
- AT MERGE: copy takes/james_final/_assembled/* to voice/ (keep voice/_kokoro_v3 = the picture clock's words);
  python -s tools/voice_warp.py sound/antitheft/voice/_kokoro_v3/words.json sound/antitheft/voice ; mix.py ; timeline_video.py ;
  render preview5 (VOICE_TOTAL frames, 3 chunks) ; audit A5.

## UPDATE 05:30 -- fix round 4 merged; FINAL narration installed (80.0 s); time-map v2; preview5 rendering
- Video 2416 f (80.5 s); picture clock 1864 f. Next: mux preview5 -> audit A5 (prompt now judges pace by contrast) ->
  fix round 5 (notes: carryover_r5.md) -> ... until every shot >= 8 AND the sound passes -> final render (scale 1) + QA.

## UPDATE 06:40 -- audit A5 = shots 7.1 / film 7.0 / SOUND 6.5; fix round 5 running (wf_aae5aeb5-7cb)
- LEAD fixed before round 5: ctx.vf / cast VF plumbing (AntiTheft ShotView -> Inner -> world.update(vf) -> ctx.vf, stage(.., vf));
  sfx.py compound offsets via T.fr (flaps, tumble contacts, LED ticks, chalk, car/raven); picture_events bubble_out 'sign1-5';
  eleven_build.py edges: 2-tier speech test (<= 0.18 s from a word edge: > 3 % peak or audible/fricative; farther: > 12 %
  peak) so weak consonants are kept and breaths gated; INNER beat 0.30 s after 'You see,'; GAP_OVERRIDE 26 (thieves -> It);
  refine_onsets.py now also moves starts LATER when Whisper folded a pause in (caption P1).
- b10 re-takes (james_r3) all scored lower; b10 is sibilance-bright by content (+7..+9 dB on every take): keep R2's take.
- NEXT: build4 of james_final -> check pauses (breath audible time), install to voice/, refine_onsets, voice_warp, mix,
  timeline_video; after round 5 merges: render preview6 -> audit A6.

## UPDATE 08:56 -- after 2 quick session restarts
- Fix round 5 (wf_aae5aeb5-7cb): AUDIO + POST done (cached); CAM, CHAR, WORLD-EXT, WORLD-INT resumed (sandboxes hold their
  partial edits from 07:46-07:49). If it stops again: Workflow({scriptPath: fix_workflow.js, resumeFromRunId: wf_aae5aeb5-7cb,
  args: <same A5 args as the HANDOFF 06:40 launch>}).
- Voice: the A5 'onset clipping' root cause was STOP CLOSURES: ref_on/ref_end stopped at the silent 't' of four|t|een,
  psy|ch|ologist, tes|t|ed. eleven_build.py now crosses silent gaps <= 0.10 s when speech resumes (CLOSURE = 10); edges use a
  2-tier test (<= 0.18 s from the word: > 6 % peak or > -40 dBFS above 3 kHz; farther: > 12 % peak) so breaths stay gated.
  Verified on beat 3: '14' now starts at 3.71 s (was 3.93, 'four' gated). Rebuild = build6.log; acceptance = tools/voice_accept.py
  (accept6.log: Whisper must hear fourteen / psychologist / tested / please / twice clearly; breaths in pause middles ~0 s).
- THEN: copy takes/james_final/_assembled/* to voice/, refine_onsets.py, tools/voice_warp.py (kokoro words -> voice),
  mix.py, tools/timeline_video.py; after round 5 merges: render preview6 (VOICE_TOTAL frames, 3 chunks) -> audit A6.

## UPDATE 2026-11-11 10:10 -- mix6 done; fix round 5 re-resumed; pipeline repo pushed
- mix6 (build6 narration, 2520 f = 84.0 s): -14.02 LUFS, TP -2.9 dBTP, LRA 2.03; timeline_video.json written.
  NOTE: run python with tools/.venv/Scripts/python.exe (system python under -s has no numpy).
- Fix round 5 resumed at ~09:35: the workflow scripts now parse args given as a JSON string
  (const ARGS = typeof args === 'string' ? JSON.parse(args) : args). The exact A5 args are saved in the session
  scratchpad fix5_launch.json. AUDIO + POST are cached; CAM, CHAR, WORLD-EXT, WORLD-INT are running.
- Reusable package: Desktop/animated-shorts-pipeline -> PRIVATE https://github.com/UtkarshBirla28/animated-shorts-pipeline
  (push an update with the final code after the video passes).
- NEXT: when round 5 finishes: merge + lead_requests -> tsc -> export_timeline (picture clock) -> voice_warp
  (kokoro words -> voice) if the timeline changed -> mix -> timeline_video -> preview6 (chunks 0-839 840-1679 1680-2519)
  -> audit A6.

## UPDATE 2026-11-11 21:15 -- session was down 09:45-21:05; fix round 5 resumed again (task wzjkip1lk)
- Exact args: studio/out/antitheft/args_fix5.json (pass that object verbatim on any resume). AUDIO + POST cached.
- POST MERGED at 21:12 (AntiTheft.tsx, Captions.tsx, grade.ts, lensblur.ts); main tsc clean (only the 6 Bridge errors).
  Reports: studio/out/antitheft/rA5_fix_reports_partial.json.
- AFTER CAM merges story.ts, apply: SHOTS[3].relight = [{ f: BEAT.vandalized - 2, to: 'dim', dur: 10 }, { f: BEAT.timeEnd - 6, to: 'noon', dur: 18 }].
- Carry to round 6 if the owners did not do them: stamp impact 2-3 video f BEFORE 'per-' (poseStamp impact at
  BEAT.permission - 2); shot-8 stopwatch press in frame (x 600-760, y 520-640); raven ruffle shot 6 -> honest+12; a
  shot-12 pupil laugh face under 'The other half'; WORLD-EXT export ledShownAt(); WORLD-INT export sunsetPoint();
  POST re-measure the shot-14 night grade after WORLD-INT's night_int change; the far-mesa pale discs (shots 7-8).

## UPDATE 2026-11-11 22:15 -- FIX ROUND 5 COMPLETE + FULLY MERGED; preview6 building (task b0pvndeck)
- Merged: cam story.ts, char toon/cast/cardshade, world_ext sets_ext/paint, world_int sets_int/lights/shade (POST at
  21:12; AUDIO edits in place). Reports: rA5_fix_reports.json / .txt. LEAD edits applied (see carryover_r6.md top).
  Main tsc clean.
- Running: export_timeline -> probes -> mix.py -> timeline_video -> render_chunks preview6_silent (0-839 840-1679
  1680-2519, auto-retry x4) -> mux preview6.mp4. Log: studio/out/antitheft/preview6_build.log (ends PREVIEW6_DONE).
- NEXT: audit A6 = Workflow(audit_workflow.js, args = args_A6.json verbatim) -> audit_digest -> scores to the user
  -> fix round 6 with carryover_r6.md.

## UPDATE 22:45 -- preview6 DONE (84.0 s, 540x960 + mix); audit A6 running: wf_9be43f75-df9 (task w6xurp47a)
- Resume if stopped: Workflow({scriptPath: audit_workflow.js, resumeFromRunId: "wf_9be43f75-df9", args: args_A6.json}).
- Then: tools/audit_digest.py <that run's journal.jsonl> studio/out/antitheft/audit_A6 -> scores to the user -> fix round 6
  (fix_workflow.js; args_fix6.json = round A6, video preview6, notes + carryover_r6.md).

## UPDATE 23:50 -- AUDIT A6: shots 7.2 / film 7.7 / sound 7.0 (shot 5 = 8; lowest 1 and 8 = 6.5). FIX ROUND 6 running
- Digest: studio/out/antitheft/audit_A6/ (SCORES.md, fixes_*.md). plan.ts: TH.heap14 + TH.pock[] added (shot-4 gags).
- Fix round 6: wf_5d3aa8c0-9c2 (task wthrxr2np), args = args_fix6.json VERBATIM (resume with the same object).
- LEAD voice work this round: build a re-assembly into takes/james_final/_assembled ONLY (do not install until the round
  is merged): longer pause before 'almost' and between 'rules.' and 'We'; re-takes for P2 lines need user OK on credits.
- 00:20 VOICE (user approved ~3.3k credits): 20 re-takes in takes/james_r4 (b01 b07 b09 b10 b12; t1 stab .45, t2 .35,
  t3 .45+style .3, t4 .35+style .3; t5 = the current final take). Credits before: 7,979 / 40,000 used.
  Selection: beat_select2.py james_r4 james_r4_best --only=1,7,9,10,12 (running, task b0lxqn43c).
  Pauses: voice_build.GAP_OVERRIDE += {1: .45, 9: .48, 16: .49, 17: .51, 20: .42, 22: .385, 28: .45}; eleven_build.INNER
  += {(25,'hears'): .30, (31,'stolen'): .30, (2,'to'): .26, (21,'copy'): .15} (backups *.bak_a6). voice_accept FLAG
  extended. NEXT: james_final2 = james_final + r4 winners -> eleven_build --takes=james_final2 --tag=eleven_v4:james
  --thr=0.10 --breath -> voice_accept -> voice-only mp3 for the user -> install AFTER fix round 6 merges ->
  refine_onsets -> voice_warp (kokoro words -> voice) -> mix -> timeline_video -> preview7.
- 01:00 VOICE: targeted word probe (scratchpad word_probe.py) -> only b09 improved (james_r4/t4: 'each' +3.2 st).
  b01 new takes ~4 st lower than the read; b07 'Please' / b10 'Half' Whisper p ~0.02 in EVERY take incl. the old one,
  only on the quoted word (unquoted 'half' p 1.00) = quote-mark artifact; b12 new takes misheard. Building
  takes/james_final2 (= james_final + b09 t4) with the A6 pauses: build.log / accept.log there (task bhrgnig6j).
- 00:35 VOICE READY (not installed): takes/james_final2/_assembled = james_final + b09 t4, A6 pauses, then
  tools/insert_pause.py (NEW: eleven_build only SHORTENS pauses; this inserts true silence) for visitors|almost 0.40,
  to|steal 0.26 (#1), sign|and 0.35, wood|it 0.35, vanished|with 0.36 -> 85.23 s. Backup: _assembled/_before_pauses/.
  accept: equal/better than build6 (permission .95, twice .97, half .86, each .97; breath 0.25 s). Listening copy:
  studio/out/antitheft/voicetest/JAMES_A6_voice_only.mp3. Credits used 9,071 / 40,000.
  INSTALL after fix round 6 merges: cp _assembled/{voice.wav,words.json,phrases.json,voice_info.json} -> voice/ ;
  refine_onsets.py ; tools/voice_warp.py sound/antitheft/voice/_kokoro_v3/words.json sound/antitheft/voice ; mix ;
  timeline_video ; preview7.

## UPDATE 2026-11-12 01:25 -- FIX ROUND 6 COMPLETE + MERGED; A6 narration INSTALLED; preview7 building (task bzpycc2fg)
- Merged all 5 sandboxes (+ AUDIO in place). Reports rA6_fix_reports.json/.txt. LEAD edits + open items: carryover_r7.md.
- studio/out/antitheft/build_preview7.sh = the whole chain: export_timeline -> backup build6 voice to
  takes/james_final/_installed_build6 -> install james_final2 -> refine_onsets -> voice_warp -> mix -> timeline_video ->
  render_chunks preview7 (thirds of warp.json new_total, auto-retry x4) -> mux. Log preview7_build.log (PREVIEW7_DONE).
- NEXT: audit A7 (audit_workflow.js, args {"round":"A7","video":"studio\out\antitheft\preview7.mp4"} -> args_A7.json).
- 01:40 BUG CAUGHT + FIXED: refine_onsets.py reads voice/words_whisper.json (the RAW copy) when it exists. The stale
  build6 copy made the first warp 2520 f with OLD word times. Fix: words_whisper.json = the pause-shifted assembled
  words; insert_pause.py now also shifts words_whisper.json. Re-run (task bsd7zzv8s): warp 1864 -> 2571 f (85.70 s),
  anchor error median 0.14 f, max 1.20 f. RULE: when installing a new voice, ALWAYS copy its words.json over
  words_whisper.json too (or delete it) before refine_onsets.py.

## UPDATE 01:30 -- preview7 DONE (85.7 s, 2571 f; mix -14.0 LUFS / -2.9 dBTP / LRA 2.1). AUDIT A7 running: wf_84d42703-c3f
- Resume if stopped: Workflow(audit_workflow.js, resumeFromRunId wf_84d42703-c3f, args = args_A7.json verbatim).
- Then digest -> audit_A7, scores to the user, fix round 7 (args_fix7.json; carryover_r7.md + A7 lists).

## UPDATE 01:55 -- USER FEEDBACK on preview7 (user asleep; said "take your own decision, select best things and approve, complete everything")
- Loves the animation, characters, expressions and environments. BUT: too FAST (character movement, scene/framing changes,
  can't read small boards), some shots too close; dialogue/story could be clearer; board texts too wordy; add funny +
  mystery moments. Memory: feedback_shorts_pacing_clarity.md.
- DECISIONS (LEAD):
  1) SCRIPT v2 (voice_build.P; backups *.bak_v1script). Only beats 1, 3, 7, 8 change:
     b01 "She'd never stolen anything. Not even a paperclip. Then she read one sign... and wanted to steal."
     b03 'It said... "Warning! 14 tons stolen every year... one small piece at a time."'
     b07 'One sign said: "Please don't take the wood." The other said: "Many visitors take the wood."'
     b08 'With "please don't," only 2% of the pieces vanished. With "many visitors"... almost 8%.'
     INNER += (0,'anything') .30, (7,'said') .35.
  2) BOARDS: main board = WARNING! / 14 TONS STOLEN / EVERY YEAR / ONE SMALL PIECE AT A TIME; Sign A = PLEASE DON'T TAKE
     THE WOOD.; Sign B (+ blueprint panel, shot 13) = MANY VISITORS TAKE THE WOOD.
  3) Fix round 7 = A7 lists + the user's pacing directive (calmer camera, longer holds, wider, slower gestures, readable
     boards) + the new board texts + deliberate funny / mystery beats.
  4) audit_workflow.js USER DIRECTION added (judge followability first; never ask for more cuts/whips).
- Voice v2: 16 takes in takes/james_v2s (b01 b03 b07 b08), selection running (task bgs327b0d -> james_v2s_best).
  tools/voice_warp.py v3 now pairs words by text when the script changes (difflib + beat edges + optional
  sound/antitheft/audio/warp_anchors.json); regression on the current voice = IDENTICAL voicewarp.ts.
- 02:10 VOICE v2 ASSEMBLED (not installed yet; A7 is still reading the current voice files): takes/james_v2 (picks in
  pick.json) -> _assembled, + insert_pause (10 specs, pauses.log) -> 83.29 s, 198 words; accept OK (breath 0.16 s).
  Listening copy: studio/out/antitheft/voicetest/JAMES_v2script_voice_only.mp3.
  INSTALL after A7: cp _assembled/{voice.wav,words.json,phrases.json,voice_info.json} voice/ AND words.json ->
  voice/words_whisper.json ; refine_onsets ; voice_warp (v3 text pairing: check the 'no new word' beats, add
  sound/antitheft/audio/warp_anchors.json e.g. old 'vandalized' -> new 'Warning') ; then the fix round 7 sandboxes.

## UPDATE 02:35 -- AUDIT A7: shots 7.1 / film 7.5 / SOUND 8.0 (PASS). VOICE v2 INSTALLED. FIX ROUND 7 running
- A7 digest: studio/out/antitheft/audit_A7/. VOICE P1 'wood? not audible' was a Whisper merge ('Baitwood'): the audio is
  there; words fixed by splitting bait/wood at the closure (scratchpad install_v2.py). Install: voice/_pre_v2 backup;
  refine_onsets; then AUDIO's timeline._acoustic_words() pass (33 starts moved) -> voice/words.json
  (words_refined.json = before the acoustic pass).
- Warp v3 (text pairing) + sound/antitheft/audio/warp_anchors.json [[35,34],[105,102]] (old 'vandalized' -> new
  '"Warning!', old 'Another' -> new 'The'): 1864 -> 2516 f (83.87 s), 95 anchors, error median 0.14 / max 0.92 f.
  Fast windows (slope > 1.1): video 449-478, 915-941, 1286-1335, 1464-1474 (told the owners).
- audit_workflow.js now carries the USER DIRECTION (followability first).
- Fix round 7: wf_1cc80c6c-fb0 (task wvbxhooyb), args = args_fix7.json VERBATIM.
- NEXT: merge -> mix -> timeline_video -> preview8 (2516 f: 0-838 839-1677 1678-2515) -> audit A8 (args round A8,
  video preview8) -> ...

## UPDATE 05:05 -- FIX ROUND 7 COMPLETE + MERGED (user pacing direction applied); preview8 building (task bystmthut)
- CAM: every move <= ~1.6 %/f, only 2 small comic snaps ('now', 'twice'), ~36 framings (was ~58), 4 straight cuts in
  shots 8/9/10/12 (APPROVED by LEAD), dissolves 9-12 f. New boards: WARNING! / 14 TONS STOLEN / EVERY YEAR / ONE SMALL
  PIECE / AT A TIME; Sign A PLEASE DON'T TAKE THE WOOD.; Sign B MANY VISITORS / TAKE THE WOOD. Shot 6 mystery beat.
- Reports rA7_fix_reports.json/.txt; LEAD edits + open items: carryover_r8.md.
- build_preview8.sh: export_timeline -> mix.py (probes) -> timeline_video -> preview8 (thirds, auto-retry) -> mux.
- NEXT: audit A8 = Workflow(audit_workflow.js, args = args_A8.json) -> digest -> fix round 8 (carryover_r8.md).

## UPDATE 04:25 (real clock; the 05:05 stamp above is wrong) -- preview8 DONE (83.87 s, 2516 f; mix -14.0 LUFS / -2.9 dBTP)
- AUDIT A8 running: wf_96bacdd7-7e1 (task wyboscqdd). Resume: audit_workflow.js + resumeFromRunId + args_A8.json.
- Sheet: preview8_sheet.jpg (new short boards read clearly; shot 6 '?' marks; calmer, wider framings).

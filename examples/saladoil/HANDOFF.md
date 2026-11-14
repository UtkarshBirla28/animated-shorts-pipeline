# HANDOFF: saladoil "The Oil Tanks That Were Mostly Water" (short #2)

User (2026-11-13, going to sleep): "start your work ... complete the video". Run the full antitheft-quality process
(voice first, contract, build, previews, audit/fix loop until good scores) and deliver the final video. Workflows may
run for hours. The user also asked to DELETE useless files: done (cleanup_2026-11-13.log in the studio root, ~4.2 GB
freed; kept the final antitheft video, its source, the final takes, docs).

## Setup (2026-11-13 ~00:45)
- The studio tools are now SHORT-aware (ported from the pipeline repo):
  - tools/short_cfg.py, tools/new_short.py, studio/scripts/short.mjs, the generic sandbox.sh;
  - patched voice_warp (v3 + --identity), beat_select2 (per-script acting hook), voice_accept, timeline_video,
    export_timeline, audio probes, stills/render, project*.mjs.
- tools/new_short.py saladoil SaladOil -> studio/src/videos/saladoil (SaladOil.tsx, SaladOilShort), sound/saladoil,
  .short.json = saladoil.
- Brief: briefs/saladoil.md (= sound/saladoil/SCRIPT.md).
- Voice tables: sound/saladoil/voice/voice_build.py P (35 phrases, 14 beats); eleven_build.py BEATS / INNER
  {(0,'150million') .40, (17,'inside') .50, (23,'hatch') .20}; acting.py (per-script acting checks).

## Voice (James QhpsGjDKZmM9qRYdMhBD, eleven_v4) -- VOICE FIRST
- 56 takes: sound/saladoil/voice/takes/james_s1 (t1 stab .5, t2 .4, t3 .5 + style .3, t4 .4 + style .3), 1,418 chars per
  set. Credits used before: 9,763 / 40,000.
- Selection: beat_select2.py james_s1 james_s1_best --f0=180 (log takes/james_s1/select.log).
- NEXT: targeted word probe -> picks into takes/james_s1_final -> eleven_build --takes=james_s1_final
  --tag=eleven_v4:james --thr=0.10 --breath -> insert_pause (true silence: dollars...|against .40, thought.|Banks,
  shout:|Ninety .30, full!|So .40, coming.|So .40, tank?|Then .45, inside|was .55, water.|You .45, America.|When .45,
  name?|Warren .40, Buffett.|The .45, fake.|The .40) -> voice_accept (FLAG ninety, percent, inside, buffett, angelis)
  -> install (+ words.json over words_whisper.json!) -> refine_onsets -> timeline._acoustic_words pass
  -> gen_words_ts -> words.ts.
- The shout's metal-tank echo and slight pitch-up happen in the MIX (AUDIO), never by stretching the voice.

## Then
1. Contract agent: BUILD_PLAN.md, plan.ts, story.ts (BEAT from words, SHOTS, calm CAMS, P0 = the hatch view = the last
   frame), world.ts, compiling STUB sets/cast, lights; export_timeline; voice_warp --identity.
2. Build round 1 (workflow, 5 owners) -> merge -> mix -> preview1 -> audit A1 -> fix rounds ... -> final 1080x1920 + QA.
- 01:40 selection done (select.log). Picks = james_s1_best (b01 t1, b02 t1, b03 t3, b04 t4, b05 t4, b06 t3, b07 t3,
  b09 t2, b10 t3, b11 t1, b12 t3, b13 t2, b14 t3) + b08 from takes/james_s1b/t3 ('[quietly] Inside... was mostly water.':
  voiced, F0 124 Hz, -30 dB; the first b08 takes with [hushed] were fully WHISPERED, no pitch). Quote-mark artifact again
  on '"90' (p 0.10). -> takes/james_s1_final; build + insert_pause + accept running (task bqt23o3xe).
- 02:05 the first assembly = 92.7 s (2.49 w/s) > 72 s -> the USER'S CUT LIST applied in order (all 3): P12 'Somehow, the
  money kept coming.' OUT, P28 -> 'When it came out, American Express shares crashed.', P4 'Or so everyone thought.' OUT
  (BEATS b02 [2,3], b05 [9,10,11]). Speed stays 1.0 (voice quality first, no stretch). Re-takes james_s1c (b02 b05 b12)
  -> select -> james_s1_final -> rebuild + pauses + accept (task br8frhguj). Expect ~86-87 s.
- 02:30 VOICE INSTALLED: 87.24 s, 212 words, 33 phrases (P4 and P12 cut); refine_onsets + acoustic pass (26 starts);
  words.ts generated (voice end frame 2613). Listening copy: studio/out/saladoil/saladoil_voice_only.mp3. Accept:
  key words clear (the low p values were voice_accept's 20 s window edges and quote marks; checked per segment).
- Contract agent launched (instructions: studio/out/saladoil/contract_prompt.md -> contract_report.md).
- Build round prepared: workflows/{build,audit,fix}.js + LESSONS.md + PIPELINE.md copied into the studio root;
  args: studio/out/saladoil/args_build.json (pass VERBATIM; resume with the same object).
  BEFORE launching: cd studio && for n in world_ext world_int char post; do bash scripts/sandbox.sh make $n; done

## UPDATE 2026-11-14 ~00:30 (new LEAD session; the user: "do everything yourself, same quality and flow, no approvals")
- FACT FIX (TIME 1965): Tino's OWN men climbed + shouted "90% full" DOWN to the Amexco inspector ON THE GROUND (the old
  script had the inspector climbing). Re-voiced ONLY b03 b04 b05 b06 (takes/james_s2, 4 takes each, ~1.5k credits):
  P6 "American Express sent inspectors to check.", P7 "But Tino's own men would climb up, drop a tape inside, and shout down:",
  NEW P35 "And the inspector, on the ground... believed them." (spoken first in beat 5: BEATS (5,[35,9,10,11])),
  P13 "But what if someone did look inside?". Picks: b03 t2, b04 t4, b05 t2, b06 t3 (james_s2_best) -> james_s2_final
  (others = james_s1_final). Backups: voice_build.py/eleven_build.py/acting.py .bak_s1, voice/_prev_s1/.
- Voice INSTALLED: 89.80 s, 215 words (pauses: takes/james_s2_final/pauses.log; accept.log OK, low p only at the 20 s
  window edges + the '"90' quote artifact). refine_onsets + acoustic pass (28) -> words.ts (VOICE_END 2690).
  Listening copy: studio/out/saladoil/saladoil_voice_only.mp3 (old script copy: *_s1_oldscript.mp3).
- briefs/saladoil.md = sound/saladoil/SCRIPT.md = briefs/salad_oil_brief.md content (the as-voiced script).
- story.ts BEAT updated (sent/check, butTinos..down, andInspector/ground/believed, someone/look/insideQ); tsc clean;
  timeline 16 shots, 2712 f (90.4 s); voice_warp --identity done.
- Contract finishing agent launched (studio/out/saladoil/contract_prompt2.md -> contract_report.md + BUILD_PLAN.md + stills
  in studio/out/saladoil/contract/).
- args_build.json UPDATED for the fact fix (old copy args_build_s1_oldscript.json). No build run was ever launched.
- NEXT: after the contract: cd studio && for n in world_ext world_int char post; do bash scripts/sandbox.sh make $n; done
  -> Workflow scriptPath workflows/build.js with args_build.json -> merge -> mix -> preview1 -> audit A1 -> fix loop.
- ~01:05 contract DONE (contract_report.md, BUILD_PLAN.md, stills in out/saladoil/contract/, sheet_contract.jpg; frame 0 ==
  frame 2711 byte-identical). Sandboxes made (world_ext world_int char post).
- BUILD ROUND 1 RUNNING: Workflow run wf_b7176fe9-c2a (task wpg2fn3zf), scriptPath workflows/build.js, args =
  studio/out/saladoil/args_build.json (pass VERBATIM as the object to resume: resumeFromRunId wf_b7176fe9-c2a).
  Journal: ~/.claude/projects/C--Users-utkar/122d7bae-7fec-4ee7-9141-c86c2c37750e/subagents/workflows/wf_b7176fe9-c2a/
- NEXT after the build: merge (PIPELINE.md stage 4) -> lead_requests -> tsc/export_timeline/probes -> mix -> preview1.

## UPDATE 2026-11-14 ~02:30 - build round 1 done, merged, preview1 rendering
- Build run wf_b7176fe9-c2a: 5/5 owners OK (2.6M tokens, 85 min). Reports: task output wpg2fn3zf; summary in the scratchpad.
- Merged world_ext, world_int, char, post (no ownership overlap). tsc clean. AUDIO mixed: -14.0 LUFS, LRA 2.4, TP -2.9.
- LEAD fixes at merge: 3 word onsets (against 183, fullShout 784, insideQ ~1208; words_pre_onsetfix.json = backup),
  SUN_WORLD, S3A/S13A/S15B looks, DOF CAFE, shot-4 push S4M before "Ninety", TK.counter.c, CU.fish.z (story/plan .bak_b1).
- scripts/audio_probe.mjs is antitheft-only (tumbleweeds): skip it for saladoil. audio_cast_probe.mjs works.
- Check stills: merge1/sheetA.jpg, sheetB.jpg (loop seam OK). Cross-owner decisions: carryover_r1.md.
- USER (2026-11-14): "run again and again ... i want average score of 8 out of 10 don't stop till than" -> loop audit/fix
  autonomously until AVERAGE shot score >= 8 (film, sound >= 8 too). args_A1.json written; audit A1 runs on preview1.mp4.
- 02:45 preview1.mp4 done (540x960, 2712 f, muxed with mix.wav); sheet preview1_sheet.jpg. Audit A1 = run wf_cfeeab30-d88
  (task wy8vp2r27), args_A1.json. Next: audit_digest.py <journal> studio/out/saladoil/audit_A1, then LEAD items + fix round 1.
- 03:15 AUDIT A1 (wf_cfeeab30-d88): shots mean 6.1, film 7.0, sound 7.5 (lowest 6: 5.0, 9: 5.5, 8: 5.6, 15: 5.8).
  audit_A1/SCORES.md + fixes_*.md.
- LEAD after A1: RE-VOICE. b06 = james_s4 b06_C_1 (no tag), b07 = james_s3/t2, b08 = james_s4 b08_A_2 (no tag,
  voiced). Assembled takes/james_s3_final + pauses (ground .58, inside?|then .70, bust|lenders .45, inside|was .55,
  water|you .85, hatch|it .45) -> 91.01 s; installed (old in voice/_prev_s2); onsets hand-fixed (against, full,
  look/inside?, Inside/was/mostly/water; backup words_s3_preonsetfix.json). Film 2748 f. Mix -14.0 / LRA 2.4 / TP -2.9.
  NOTE: every [quietly]/[hushed]/[curious] tag made James whisper or creak; untagged takes were the voiced ones.
  plan.ts A1 anchors (backup plan.ts.bak_A1). Frame map audit_A1/old_to_new_frames.json. carryover_r1.md updated.
- 03:35 FIX ROUND 1 = run wf_bfa77530-4ac (task w0oul94xq), args_fix1.json, 6 owners incl. CAM (sandboxes synced).
- ~05:00 FIX ROUND 1 DONE (6/6 owners, 3.5M tokens, 86 min). Reports: journal of wf_bfa77530-4ac (extract:
  tool-results bsk6ptfl3.txt in the session). Merged world_ext, world_int, char, post, cam (CAM story.ts touched only
  camera/DOF helpers; checked by diff). tsc clean (bridge/ errors are old, not ours).
  LEAD at merge: plan TK.counter.c [0.45,12.3,3.35], TF.notice [1.15,3,16.07] (sets_ext NOTICE = TF.notice), BK.cashTo
  [0.78,0.785,-0.55] (sets_int cash rides cast.ts cashSlide), CU.fish.y 4.7 (cast FISH_Y = CU.fish.y), TR.tino added,
  ST.people[0]; sets_ext: ONE lightning schedule = POST's (S9.a-7, bust-2, checked-8; set lift x0.55), shot-4 tape from
  drop+12 / PLUNK drop+30 (cast REEL4_A drop+12), shot-7 ring BL = insideQEnd, LOANS flaps roll million+8 -> ~135;
  sets_int: easel pointer removed. sound/saladoil/audio/picture_events.json overrides (yard_4 on the shot-4 HARD CUT 804,
  vendor null, pigeons crashed2+2, blub waterEnd+3, cafe_life on CHAR's loops). args_A2.json written.
  Shot 4 now has ONE hard cut at 804 (CAM): accepted (told the auditors in args_A2 user_decisions).
- 05:05 the first preview2 render + the mix were killed (low memory: they ran together); the killed shell's script kept
  rendering old chunks into the same list -> a 4580-frame concat. FIXED: relaunched sequentially (6 chunks, conc 2, then
  mix), rebuilt preview2_silent_chunks.txt from the 6 new chunks. LESSON: never run a render and mix.py together; after a
  reaped render, kill its leftover node/chrome (user-data-dir under animated-shorts-studio) before relaunching.
- 05:32 preview2.mp4 (540x960, 2748 f, 91.6 s) + preview2_sheet.jpg. Mix -14.0 LUFS / LRA 2.6 / TP -2.9, probes all real.
  carryover_r2.md drafted (LEAD merge notes + open cross-owner requests). AUDIT A2 = run wf_14a29387-f15 (task wb5flfis2),
  args_A2.json. Next: audit_digest.py <journal> studio/out/saladoil/audit_A2 -> scores -> LEAD items -> fix round 2.
- 06:00 AUDIT A2 (wf_14a29387-f15): shots mean 6.84 (A1 6.1), film 7.6, sound 7.8 (whole-film auditor: 8.0). Lowest:
  8 (6.0), 6/7/9/12 (6.5). audit_A2/SCORES.md + fixes_*.md.
- LEAD after A2: voice re-takes james_s6 (b01 hook, b07 turn, 6 settings, tools/_gen_s6.sh) REJECTED: eleven_v4
  ignores speed, all longer. Instead 2 silence inserts on the installed voice (_r2_edit; old install in voice/_prev_s3):
  more|And 0.38, out|The 0.50 -> 91.44 s, FILM 2761 f (92.03 s). ORDER MATTERS: gen_words_ts -> export_timeline ->
  voice_warp --identity (it reads timeline.json's total) -> export_timeline again. audit_A2/old_to_new_frames.json.
  plan.ts A2 (bak plan.ts.bak_A2): PR.valves y 0.62, PR.workers x -2.65/+1.85, OF.slip x 0.53. carryover_r2.md (A2
  decisions on top). Sandboxes synced. FIX ROUND 2 = run wf_9edfd0ce-2b9 (task wqizhkwf7), args_fix2.json.
- ~07:45 FIX ROUND 2 DONE (6/6, 3.5M tokens, 80 min). Reports extracted to scratchpad fix2_reports.txt. Merged all 5
  sandboxes (CAM story.ts camera-only). LEAD at merge: plan TF.notice [1.33,3.2,16.07] (doc; sets_ext has a literal),
  BK.cashTo [0.1,0.785,-0.45], PR.workers[1] [1.15,0,-2.95] (cast WORKERS13 = PR.workers), ST.people[0] [1.55,0,-2.45],
  CU.sign = sets_int SIGN12; cast RC_P/RC_N on the new receipt tilt, shot-12 fish rides sets_int's fill curve; sets_int
  kitchen cloud = cast shakeMix; sets_ext PLUNK = drop + 36. picture_events.json: car_14/fence_2 null, flags_2 [307],
  gull_7 soHow+4, pour_12 fill+2..+53, cafe card trusted+10. Not applied (to carryover_r3): CHAR tick timing, shot-9
  climber size (CAM vs CHAR), shot-14 sedan placement, voice P3 inserts (clock kept at 2761), loop landing P3 (seam rule).

# HANDOFF: Why Japanese Train Drivers Point at Nothing (pointing) - v3 (PIPELINE_V3.md). Update at EVERY step: state, running jobs + run IDs + args files, next command.

| stage | state | evidence |
|---|---|---|
| A0 scaffold | done | studio/src/videos3/pointing/ |
| A1 script + lint | | briefs/v3/pointing/SCRIPT.md, lint.json |
| A2 voice (locked) | | sound/pointing/voice/, studio/out/pointing/voicetest/ |
| A3 bible + validate | done 2026-11-19 (planner): decide-stage PASS, 0 fail / 16 warn; 22 shots, 34 framings, 7 sets; cameras measured with camSpeedStats(plan) (film median 0.74 %/f); voice gaps for A2 in bible.voice.gaps; 46 kit_requests. Next: A2 applies the gaps, then `new_short_v3.py pointing --shots`, then A4 storyboard | briefs/v3/pointing/bible.json, BIBLE_NOTES.md, validate.json, cam_plan.json |
| A4 storyboard | | studio/out/pointing/storyboard_draft.jpg |
| A5 OWNER GATE 1 | | |
| B build | | workflows/v3 build_v3 run id, args file |
| C animatic + gates + audit, OWNER GATE 2 | | studio/out/pointing/pointing_preview.mp4, gates |
| D polish | | |
| E final + QA + upload kit | | studio/out/pointing/upload/ |

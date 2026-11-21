# OPENCODE BRIEF: short #3 "typo" (binding for every phase)

You are the builder of a real YouTube Short in `C:\Users\utkar\Desktop\animated-shorts-studio` (the "studio").
A coordinator (Claude Code) gives you one PHASE at a time and checks your result. Work autonomously; never ask questions.
Quality bar: the same as the finished salad-oil short (`studio/out/saladoil/upload/saladoil_FINAL_v2_1080x1920.mp4`,
engine `studio/src/videos/saladoil`, sound `sound/saladoil`). REUSE that engine and everything you can from it.

## Read first (once per session)
1. `sound/typo/SCRIPT.md`: the script (HOOK v2 is binding), facts, beats, characters, safety. Never change facts.
2. `C:\Users\utkar\Desktop\animated-shorts-pipeline\.claude\skills\animated-story-short\SKILL.md`, `...\PIPELINE.md`,
   `...\LESSONS.md` (lessons 1-46: every one was paid for; follow them).
3. `study/CHANNEL_STYLE_BIBLE.md` (captions spec, bell-glide cameras, colour, characters).
4. The saladoil code you copy from: `studio/src/videos/saladoil/*` (story.ts = beats/shots/cameras, plan.ts = anchors,
   sets_ext.ts / sets_int.ts = sets, cast.ts + toon.ts + cardshade.ts = characters, SaladOil.tsx + Captions.tsx +
   HookTitle.tsx + grade.ts + ink.ts + lensblur.ts = post), `sound/saladoil/audio/*` (mix.py, sfx.py, music.py, probe.py,
   picture_events.json), `sound/saladoil/voice/*` + `tools/el_api.py, beat_select2.py, voice_accept.py, gen_words_ts.py,
   voice_warp.py, tighten_pauses.py, cut_head.py, insert_pause.py`, `studio/scripts/*` (stills.mjs, render_chunks.sh,
   export_timeline.mjs, audio_cast_probe.mjs, short_qa.py, project.mjs).

## Hard rules
- Python: `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s ...`. Node/Remotion 4.0.290 and
  three r175 are pinned: never upgrade, never `npm install` anything.
- NEVER print, log or copy the ElevenLabs API key (tools/el_api.py reads it from ~/.claude.json itself).
- Touch only `studio/src/videos/typo*`, `studio/src/sandboxes/*typo*`, `studio/out/typo/`, `sound/typo/`, and
  `studio/src/Root.tsx` (register the comp). NEVER edit saladoil / antitheft / bridge files, other folders, git remotes,
  or anything cloud. No git push.
- Never play audio. The PC has 16 GB RAM: one render at a time, concurrency <= 2, stills in batches of <= 12 at scale
  0.5; after any killed render, kill leftover node/chrome processes whose command line contains animated-shorts-studio.
- Long renders: use `bash studio/scripts/render_chunks.sh` (resumable chunks). Previews at scale 0.5, final at 1.
- Safety (SCRIPT.md): no real logos (Mizuho / TSE / J-Com names as plain text only), the 27-year-old buyer is generic
  and unnamed, never say or show shares "sold for one yen" (an ORDER at ¥1; trades at the price floor).

## Craft rules (the user's standing direction, binding)
- PACING: framings hold 2.5-4 s with a gentle creep; camera moves are slow bells (peak <= 45 px/f at 1080, distance /
  zoom interpolated so the scale change is even), never through geometry; dissolves 10-12 f; at most one hard cut.
- ACTING: gestures >= 12-18 f with anticipation and settle; expressions held >= 12 f; no 1-3 f pose pops; gaze goes to
  the action (the screen, the key, each other), never a long stare into the lens. Lip flaps ONLY on "Cancel it!".
- BOARDS: <= 6 words, caps >= 40 px at 1080, fully in frame, held >= 1.5-2.5 s. Faces AND boards never inside the
  caption band (y 1280-1440 at 1080x1920).
- LOOP: frame 0 and the last frame are bit-identical (finger over the glowing ENTER key). Check it after every change.
- HOOK: the first 3-5 s must be the most dynamic, readable, curious part of the film (see SCRIPT.md HOOK v2).
- Every funny beat ("Easy mistake.", the two "Nothing.", the notice board) and the mystery beat land on a held, settled
  frame. Every shot has life (a small loop of motion somewhere), depth (foreground / mid / background) and a clear
  focal point.

## Reporting (keeps the coordinator's cost low)
At the end of each phase write `sound/typo/reports/<PHASE>.md`, max ~60 lines: what you built, numbers measured,
what is still weak (honest), stills / sheet paths (one contact sheet `studio/out/typo/<PHASE>_sheet.jpg`, 1 row per
~8 frames, 180x320 cells, is enough), and anything the coordinator must decide. Your final chat reply = that file's path
plus 5 lines of summary.

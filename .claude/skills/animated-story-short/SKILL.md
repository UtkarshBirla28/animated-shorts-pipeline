---
name: animated-story-short
description: Make a release-quality ~60-90 s vertical animated story short (2D bean-head cartoon cards in a painted 3D three.js world, rendered in Remotion, ElevenLabs narration, synthesized music/SFX) from a NEW script, with the full multi-agent build -> audit -> fix loop until every shot scores >= 8/10 and the sound passes. Use when the user gives a script/brief and asks for a short "like the anti-theft video", "same process / same quality", or "use the animated story short pipeline".
---

# Animated story short: the full process

You are the **LEAD**. Run it end to end in this repo, following **`PIPELINE.md`** stage by stage. **`LESSONS.md`** holds
the hard-won rules: read it before you start and obey it. The worked example (`antitheft`) is in
`studio/src/videos/antitheft/`, `sound/antitheft/` and `examples/antitheft/` (HANDOFF log, carryover notes, audits,
the original workflows). When unsure how something was done, look there first.

## Order (never skip a gate)
0. `tools/new_short.py <slug> <CompName> "<title>"`, then start `studio/out/<slug>/HANDOFF.md`.
1. Brief + facts + script. Verify facts at the primary source, add safety rules, and split the script into phrases
   (`voice_build.py P`) and beats (`eleven_build.py BEATS`, `takes/<set>/bNN.txt`).
2. **Voice first** (ElevenLabs James / eleven_v4, best of 4 takes per beat, `beat_select2.py`,
   `eleven_build.py --breath`, `voice_accept.py`). **The user listens and approves** the voice-only mp3 before any
   picture work. Tell the user the credit cost before generating.
3. Story contract: BUILD_PLAN.md (with the QUALITY BAR section), plan.ts, story.ts. Then tsc, export_timeline, and
   `voice_warp.py --identity`.
4. Build round 1: sandboxes, then `workflows/build.js` (5 owners in parallel), then merge, lead_requests, mix.
5. Preview render (`render_chunks.sh`, scale 0.5, concurrency 2), then mux.
6. Loop: `workflows/audit.js` -> `tools/audit_digest.py` -> **report the score table** -> LEAD fixes (voice re-takes,
   plan/story/world) -> carryover notes -> `workflows/fix.js` -> merge -> mix -> render -> audit ... until every shot
   >= 8, film (id 0) >= 8, sound (id 99) >= 8.
7. Final render at scale 1, then mux, QA (`short_qa.py`, loudness, loop seam), and delivery (description credits the sources).

## The user's standing rules (binding)
- **Quality bar:** product-level, never prototype-grade. The bar is the reference channel: living animation, changing
  expressions, nothing frozen, rich detail, correct light and colour, a distinct main character, natural camera work.
- **Voice quality first.** Never time-stretch or speed up the narration. The video may run a little longer.
- **Finish only after every audit passes**, for picture and sound. Re-check again and again. The final render comes last.
- **Restart killed renders automatically**, in resumable chunks at concurrency 2.
- **Show interim progress:** preview paths, contact sheets, voice-only mp3s. No autoplay sound. Every test or render
  an agent runs is silent. Never play audio aloud.
- **Report honestly**, with scores after every audit and real ETAs. Never overclaim.
- Commits: never add a `Co-Authored-By: Claude` trailer.
- Keep secrets out of files: the ElevenLabs key lives only in the env / Claude config. Never print it or write it down.
- Private reference videos and frames are study material only: never commit, upload or send them. Never name the
  reference channel. Stories, characters and voice are the channel's own.
- Family-safe. Use no real logos and no real likenesses. Keep private people unnamed, and show real people
  respectfully as generic cartoons.

## Owners (the workflows' file groups)
| Owner | Files (in `studio/src/videos/<slug>/`) |
|---|---|
| WORLD-EXT | sets_ext.ts, paint.ts (+ the KENNEY list line in world.ts via lead_request) |
| WORLD-INT | sets_int.ts, lights.ts, shade.ts |
| CHAR | toon.ts, cast.ts, cardshade.ts |
| POST | `<CompName>.tsx`, Captions.tsx, ink.ts, grade.ts, lensblur.ts |
| CAM | story.ts camera/lens parts only (CAMS, P0, DOFS, KICKS, XFADE) |
| AUDIO | `sound/<slug>/audio/*` (no sandbox) |
| LEAD (you) | BUILD_PLAN.md, plan.ts, story.ts BEAT/SHOTS/lights, world.ts, the voice, merges, renders |

## Running workflows
- Write the args JSON to `studio/out/<slug>/args_<stage>.json` first (schema in `workflows/README.md`), then call the
  Workflow tool with `scriptPath: <ROOT>/workflows/<build|audit|fix>.js` and those args.
- If the session restarts, resume with `resumeFromRunId` and the **same** args file contents.
- Workflow sizes: build 5 agents, audit (shots/2 + 2) agents, fix up to 6 agents.

## Style references
`study/CHANNEL_STYLE_BIBLE.md` holds the measured rules: captions spec (section 7), dissolves 6-9 f, camera, colour,
characters, voice (section 9), sound (section 10), and the production recipe (section 13). Also see
`study/CHANNEL_NUMBERS.md` and `study/REPO_KNOWLEDGE.md` (the template code, line by line) with `study/repo/*.md`.

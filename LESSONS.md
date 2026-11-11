# LESSONS: hard-won rules from the first short (read before every stage)

Each lesson is a real failure from the antitheft build, its cause, and the rule that prevents it.

## Voice
1. **The voice comes first.** Building the picture on a temporary voice forced a whole time-map layer later
   (`voicewarp.ts`, a fractional picture clock, every SFX remapped). For a new short, finish and approve the voice
   before Stage 3.
2. **Never time-stretch or speed the voice to fit a length.** This is the user's rule: quality comes first, and a
   slightly longer film is fine. eleven_v4 honours `speed` only up to 1.2 and **ignores pacing tags**. Its pace is
   about 2.5-2.8 words/s, whatever you write.
3. **Keep v4 audio tags short.** A long direction tag leaked into the audio as spoken words ("you can hear").
   Use one short tag per beat, e.g. `[stage whisper]`, `[excited]`.
4. **Library voices must be added to My Voices** before the API can use them. Otherwise it returns `voice_not_found`.
   Use `el_api.py add`. An account has 10 voice slots.
5. **Stop closures cause clipped onsets.** The silent "t" in four|t|een, psy|ch|ologist and tes|t|ed made the edge
   finder stop early and cut the start of the word ("Teen tons"). `eleven_build.py` now crosses silent gaps of up to
   0.10 s when speech resumes, and uses a 2-tier edge test:
   - within 0.18 s of a word: > 6 % of its peak, or > -40 dBFS above 3 kHz (fricatives);
   - farther away: > 12 % of its peak.
   This keeps weak consonants and still gates breaths out.
6. **Whisper's word starts are 100-200 ms late, and it sometimes folds a pause into a word.** Run `refine_onsets.py`
   (it moves starts both earlier and later) or captions show up 7-12 frames off.
7. **Measure, then let the user listen.** Claude cannot hear. Every voice decision is measured (Whisper p, F0, tilt,
   pace, breath time), and the user approves the voice-only mp3.
8. Some beats are bright in sibilance because of their content (lots of s/z). Re-takes do not fix that. Accept the
   best take and let the mix de-esser handle it.

## Picture clock and life
9. **Idle life runs on the video clock; story actions run on the picture clock.** Breath, sway, blinks, wind, birds and
   flicker use `ctx.vf` (cast.ts `VF`). Gestures and expression swaps keyed to words use `f` / `BEAT`. Otherwise
   stretching the timeline freezes holds and turns blinks into 10-frame eye closures.
10. **Loop seam rule:** frame 0 and the last frame must be identical. Every periodic idle term on the video clock must
    make a WHOLE number of cycles over the total (`round(hz * TOTAL / 30)` cycles). Hashed random events (blinks) must
    not fall in the first or last 6 frames. Check by rendering frame 0 and the last frame and diffing them.
11. **A fractional clock breaks array lookups.** If `f` can be fractional (any time-map), floor it before indexing
    arrays and use +-0.7 windows instead of `f === BEAT.x`.
12. Sound timing must go through the same clock as the picture. `bt()` and every compound offset (flaps, hops,
    ticks) go through `T.fr()`, and ambience weights go through the warp. One stray `* FR` put a whole flap sequence
    out of sync.

## Rendering and machine limits
13. **Render in chunks, concurrency 2, resumable** (`scripts/render_chunks.sh`). A full render at concurrency 3+ was
    killed for low memory. If a render dies, relaunch it automatically: the `.done` markers skip finished chunks.
14. Use one heavy render at a time. Agents render stills and short clips at modest settings. Never run a render while
    another GPU-heavy app (a game build, Blender) is running.
15. Rendering uses system Chrome with ANGLE (`CHROME` env overrides the path). The pins are three 0.175 and Remotion
    4.0.290. Never run `npx remotion upgrade`.
16. Run Python from `tools/.venv` with `PYTHONNOUSERSITE=1 ... -s`. The system Python under `-s` lacks numpy.
17. Delete `sound/<slug>/audio/_cache` after big engine changes. Old cached stems survive otherwise.

## Workflows and sessions
18. **Save every workflow's args to a JSON file before launching** (`studio/out/<slug>/args_*.json`). A resume reuses
    finished agents only when the prompts are byte-identical. One stray `}` turned the args into a plain string and
    the run failed at once. The scripts accept an args object or a JSON string.
19. Sessions restart. Keep `studio/out/<slug>/HANDOFF.md` current: what runs, run IDs, args files, the next command.
    After a restart, resume with `Workflow({scriptPath, resumeFromRunId, args})`.
20. Owners edit only their own files in their own sandbox. Everything that crosses files (plan.ts anchors, story.ts
    BEAT/SHOTS, world.ts) is a `lead_request` the LEAD applies after the merge.
21. Agents' self-grades are not evidence. Judge by the audit's sheets/strips and by rendered frames you look at.
22. Expect the score to climb about 0.3-1.0 per round. If a shot stalls for 2 rounds, look at its evidence yourself
    and change the approach (new staging or framing, not more props).

## Look and content
23. **Check every real-world symbol.** A flag looked like Egypt's instead of the US flag. Verify flags, signage
    conventions and landmarks against photos. Use no real logos, no agency or university marks, and no real likenesses.
24. Big round mounds read as pyramids. The silhouettes of the place must read correctly at phone size.
25. Each place gets one sun direction (story.ts sun pins), and the loop frame must light like frame 0. During a
    dissolve, each layer keeps its own light, grade, ink tint and DOF.
26. Keep faces and key actions out of the bottom ~23 % of the frame (Shorts UI) and out of the caption band.
27. Write block comments in world.ts. An inline `//` comment once swallowed the rest of a line.
28. Private reference videos and frames are for study only: never commit, upload or send them. Never name the
    reference channel in anything public. The story, characters and voice are the channel's own.

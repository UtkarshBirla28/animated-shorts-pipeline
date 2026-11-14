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

8b. **`eleven_build.py` can only SHORTEN a pause.** When a take's own pause is shorter than the script needs
    (the '...' before a reveal), use `tools/insert_pause.py <assembled dir> "wordA|wordB|0.40"`. It inserts true silence
    in the quiet middle and shifts every later word. Measure pauses as TRUE silence (-45 dBFS runs), not from Whisper
    word edges: the edges hide 0.1-0.3 s.
8c. **When installing a new voice, overwrite `voice/words_whisper.json` too** (or delete it). `refine_onsets.py` refines
    from that raw copy when it exists, so a stale copy silently puts the OLD word times on the NEW audio.
8d. **Whisper p is low on a quoted word's first token** (e.g. `"Please`, `"Half`) in EVERY take. That is a quote-mark
    artifact: compare it with the same word unquoted before spending credits on a re-take.

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

## From rounds 6-8 (2026-11-12)
29. **Calm beats busy.** Chasing the reference's ~1.7 s-per-picture rhythm (whips, snaps, crash punch-ins) made the film
    feel too fast to follow. The user's standing direction:
    - framings hold 2.5-4 s with a gentle creep, zoom <= ~1.5 %/f, at most 2 comic snaps per film;
    - boards stay on screen >= 1.5-2.5 s at a readable size, gestures take >= 12-18 f;
    - nothing tighter than an MCU except a clean insert;
    - a straight cut beats a fast swing.
    The film went from ~58 framings to ~36, and the scores went UP.
30. **Short boards, clear lines.** Board/sign text <= ~6-8 words, narrated exactly as written. Script lines short and
    plain. Plan one funny beat and one mystery beat on purpose.
31. **Changing the script after the picture exists:** `tools/voice_warp.py` v3 pairs old/new words by text.
    - Pin renamed beat words in `sound/<short>/audio/warp_anchors.json`.
    - Check the slope windows > 1.1 it prints: the picture runs faster there, so key the actions in those windows to the video clock.
32. **Whisper merges two words** ("Baitwood"). The DP alignment then parks the second word in the following silence:
    the caption shows late, and an auditor may report the word as "missing". Look at the energy, then split the times at the closure.
33. **Budget the usage limit.**
    - Cost per loop: a fix round ~2.5-3.4 M subagent tokens, an audit ~2.1-2.6 M; one loop ~5-6 M.
    - The weekly limit stopped audit A8 mid-way, with 3 of 10 auditors failed. Plan the rounds you can afford.
    - Keep HANDOFF.md + args files current, so the loop resumes exactly after the reset.

## From the salad oil short (2026-11-14, `saladoil`)
34. **The bar is the AVERAGE.** The user's rule: keep looping audit -> fix until the average shot score is >= 8, with film
    and sound >= 8 each. Report the score table after every audit. Typical gain per round: +0.7 early, +0.2-0.4 later.
    If two rounds in a row gain < 0.2, tell the user honestly instead of looping forever.
35. **The user's pacing direction overrides the style bible's cut rhythm.** Dissolves stay 10-12 f (not 6-9 f). Camera
    moves are slow bells (peak <= ~45 px/f at 1080), with distance / zoom interpolated so the screen-scale change is
    even (log distance for pull-outs: a linear distance move whips at the start). Every board the viewer must read has
    caps >= 40 px, stays whole in frame and >= 1.5-2.5 s on screen. Faces AND boards stay out of the caption band (y 1280-1440 at 1080x1920).
    One deliberate hard cut per film is fine. Tell the auditors in the args `user_decisions`.
36. **ElevenLabs eleven_v4 ignores the `speed` setting** (1.08-1.15 gave LONGER takes). Delivery tags such as
    [quietly], [hushed] and [curious] make James whisper or creak: use UNTAGGED text and punctuation (`...`, `!`) for
    delivery. A rising question end could not be produced in 30+ takes: accept it rather than burn credits.
37. **To lengthen a pause, do not re-record:** run `tools/insert_pause.py` on a COPY of the installed voice folder
    (voice.wav, words.json, phrases.json, voice_info.json). Every hand-fixed onset is kept and shifted, and Whisper never re-runs.
38. **After any voice change, run the steps in this order:** `gen_words_ts.py` -> `export_timeline.mjs` -> `voice_warp.py --identity`
    (it reads the total from timeline.json) -> `export_timeline.mjs` again. Then check `VOICE_TOTAL` == the timeline total,
    or the loop seam breaks. Write an `audit_A<n>/old_to_new_frames.json` map for the fixers.
39. **Whisper onset errors recur on the same takes.** Check the energy profile of key words ('against', 'full!',
    'inside?', the reveal) after every reassembly and re-patch words.json by hand.
40. **16 GB RAM: never run a render and `mix.py` at the same time.** Claude Code reaps background jobs under memory
    pressure. Chain them in ONE background command: render chunks -> mix -> mux. Use 6 chunks of ~460 f at
    concurrency 2. After a reaped render, kill its leftover node / chrome (user-data-dir under the studio) BEFORE relaunching.
    The killed shell's script can keep rendering and corrupt the chunk list: rebuild `<prefix>_chunks.txt` and check the frame count.
41. **The LEAD settles cross-owner requests at every merge** (plan.ts anchors, small cross-file edits, `picture_events.json`
    overrides for sounds whose picture source moved or does not exist) and writes them at the top of `carryover_r<n>.md`
    with the binding decisions. Then the next fix round's agents agree.
42. **Look at merged stills before every preview render** (2-3 per shot, plus frame 0 vs the last frame). A P1 that
    did not land (a cropped head, a board cut by the frame) is cheaper to fix by hand than to send through another audit round.
43. **Check the mix probes after the merge** (`picture_events_used.json` `_probes`). When an owner rewrites a function,
    a probe falls back to old frames: override that cue in `picture_events.json` with the real frames.
44. **Inline `//` comments swallow code in one-line edits.** In scripted replacements use `/* */` mid-line.

45. Pace without re-takes: if the read feels slow, SHORTEN (never remove) the pauses with `tools/tighten_pauses.py <voice dir> <new dir> --factor 0.65 --floor 0.22 "a|b|0.5"` (keep the dramatic beats near 0.45-0.52 s), install it with gen_words_ts --force -> export_timeline -> voice_warp --identity -> export_timeline, and map any literal frames in picture_events.json. Salad oil went 92.0 -> 88.6 s and the auditor found no dead air left.
46. One light whole-video audit (one agent, about 12 images) is a cheap final check when the token budget is low; the full 10-agent audit is for the improvement loop.

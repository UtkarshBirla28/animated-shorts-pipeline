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

## From the clown short (2026-11-17/18, `clown`): cut 1 was REJECTED by the owner, then rebuilt
47. **Story first; a quiz is only a hook.** Cut 1 was designed as a viewer test and the test's fairness rules drove
    everything (one locked 21 s shot, the story narrated WHILE the viewer counted). The owner: "looks like an image",
    "no life", "dialogues are so bad", "I would swipe". The rebuild: a fast quiz hook (~9 s), THEN the story in the hit's
    shape (strange claim, funny origin, real people talking in their own voices, a mystery, "You see,", escalating
    reveals, the twist as the last line). Never narrate story while the viewer must do a task.
48. **The camera moves in every frame, and it is MEASURED.** `studio/out/clown/v2/measure_cam.mjs` evaluates the camera
    of every film frame and reports px/frame per shot; no frame under 0.5 px/f except a deliberate freeze. A new framing
    about every 2.5 s; the first shot rides WITH the main character from frame 0.
49. **Life is a rule, not a polish pass:** at least three moving background things per shot (crowd kit walkers, pigeons
    that flush when someone passes, a dog, a skater, a frisbee), the focal character 35-60 % of the frame height, no
    bare-ground lower half (low lens + near props / pigeons / shadows).
50. **Compare cut 1 with the earlier finals side by side BEFORE showing it** (frames of saladoil / antitheft next to
    ours). Six audits scored cut 1 at 4.7-6; the owner's verdict was harsher than any of them. Audit the IDEA (static?
    story or quiz? would I swipe?) before auditing the polish.
51. **Characters who speak get their own voices and moving mouths.** Narrator: James on eleven_v4 with performance tags,
    best of 4 takes per chunk with neighbouring lines as context. Character lines: cast 3 candidates per role, pick by
    measurement (clarity, pitch / timbre distance from the others, no lo-fi), 4+ takes each. `phrases.json` carries a
    `speaker` field; `gen_words_ts.py` passes it through; the talk cycle runs only on the speaker's own line.
52. **Rig heights vs props.** The cards' real head heights are 1.45 / 1.52 / 1.57 m (small / standard / tall), not the
    1.66 m some plans assume. A "duck under the branch" only reads if the standing head would hit it: use the tall build
    or a 12-15 % scale-up for the ducker, and check on stills that the head top passes below the edge.
53. **Real effects, data-driven cues.** Bare synthesized effects scored 4.5 / 10. Build a library (ElevenLabs sound
    effects cost ~10 credits per second; CC0 recordings from the sound-effects skill), measure every take (reject silent,
    clipped or word-like ones), and let each animator write `sound_cues.json` ([{frame, name, what, pan, near}]) from the
    staging code; `sfx.py` maps names to samples at mix time and reports anything unmapped. A sync-direction check
    fails the mix if a cue is more than 1 f early or 2 f late.
54. **Misdirection is allowed, pointing is not.** In a "did you notice" film nothing may point at the hidden thing, but
    sounds and gags on the OTHER side of the frame are fair and keep the scene alive; do not silence a visible honk.
55. **Two Claude sessions on one 16 GB PC take turns:** `studio/scripts/ram_token.sh` (`ram_take` / `ram_release`, token
    `C:\Users\utkar\Desktop\RAM_TOKEN.txt`), agreed with the other session by message; light work continues without the
    token. While waiting, do the light work the project still needs.
56. **Network drops kill agents, not work.** Resume a dead agent with SendMessage (it keeps its transcript); tell agents
    to save often; keep `RESUME_HERE.md` current. Subagents cannot write report files named REPORT.md: the hand-back
    message is the report.
57. **A killed script chain can keep running** and render without the lock; kill stray `render_chunks.sh` / `render.mjs`
    processes after stopping an agent, and delete chunk files without a `.done` marker.
58. **Final renders use `FINAL=1`** (PNG frames, bt709, crf 15, x264 slow): the default sends every frame through JPEG
    quality 80 before encoding.
59. **Never hard-code frame ranges in render scripts.** The preview script still had preview 2's chunk list
    (0-2116) after the voice made the film 2246 frames, so the ending was silently not rendered. Derive the chunks
    from `timeline.json`'s `total` (run_p2.sh / run_final.sh now do), and check the rendered frame count against it.
60. **Never edit a shell script while it is running:** bash reads it as it goes, so an edit mid-run corrupts the
    lines it has not reached yet (the preview's mux step broke: "aac: command not found"). Edit, then re-run.

## From the Ricks Clips study (2026-11-19): read before writing or designing the next short
61. **Script craft** (`C:\Users\utkar\research_notes\ricksclips\SCRIPT_REPORT.md` section 5): line 1 = a strange action
    you can picture with the reason hidden; a hero with a want and a risk; a DOUBTER proven wrong; the answer held to
    60-75 %; every step "So..." (a choice) or "But..." (a setback); at most ~4 spoken numbers, no names / years in the
    voice; one gauge; one loop line; a short physical "why" said once; an ironic last picture that pays off a planted
    detail, ending on the last word. Use the 15-rule checklist before voicing. Keep every fact true.
62. **Look** (`...\ricksclips\LOOK_REPORT.md`): his new look = cartoon cards inside a game-engine-lit world. Our gaps:
    camera 2-4x too slow, too little self-moving detail, toon-painted materials, ink on the world, light you cannot
    see, too much depth-of-field blur, too few locations. Run the first-week pilot (camera presets, HDRI, PBR world
    textures, soft shadows + AO, cards in the light, grade) on a 10-s test shot before building the next film.
63. **Disk guard (2026-11-19).** Every Remotion `bundle()` copies all of `studio/public` (~1 GB with the kit) into
    `_remotion-tmp`; 2,500 leftover bundles (65 GB) filled C: to 0 bytes mid-day, truncating files. `stills.mjs`,
    `render.mjs` and `kit_render.mjs` now delete their bundle on exit and sweep bundles older than 12 h at start. Any
    new script that calls `bundle()` must do the same. Check `df -h /c` before long renders.

## From the pointing short (2026-11-19/21, `pointing` v4 "the trap"): SHELVED by the owner before any preview
Owner, 2026-11-21 09:40: "this script is not good at all ... keep all the learning ... next video we will make it more
good". All files are kept (studio/src/videos3/pointing/, briefs/v3/pointing/, sound/pointing/, studio/out/pointing_v4/
incl. the audit reports in audit_r1 and audit_r3). FINAL v1 (rejected 1/10) and every v4 draft must NOT be uploaded.
64. **The story decides everything; lock it only when it beats a Ricks Clips script in blind reads.** v4 had three
    stories stapled together (a 1994 lab test, a steam driver with bad eyes, a New York prank) plus a game on the
    viewer. Blind readers kept ranking at least one Ricks script above ours and said New York felt stapled on. One
    spine: one person (or group), one object, one twist, one payoff, as in our hit (anti-theft) and the channel data
    ([[project_one_small_thing_story_data]]). Do not start building until the script wins.
65. **Every line needs ONE picture that can actually be drawn and read in one glance at phone size.** The lines that
    cost the most rounds were abstract: "your hand stops waiting for your brain", "eyes had gone bad", "loved it,
    and made it a rule", a game the viewer plays with his foot. Before writing a line, sketch its picture; if the
    picture needs a caption to explain it, change the line.
66. **Scope kills quality.** 38 shots (mean 1.8 s) across 7 sets (lab booth, 1994 hall, kitchen, platform, modern
    cab, steam engine, New York subway) with ~20 characters for a 69-s film. Each set was built shallow and each
    shot staged in a hurry. Anti-theft (our best) has 6 shots; Ricks has 15-19 cuts and few locations. Next film:
    1-2 main sets, 12-20 shots, more held key poses.
67. **Removing glitches does not make a film good.** After fix round 1 the glitches were mostly gone (83 findings
    fixed) but the audit scores rose only ~1 point: what was left was STAGING and ACTING: key pictures that do not
    show their point, a hook that is one composition shown four times, people lined up facing the lens, empty
    bottom thirds, soft blank characters (no brows, brown bloomed outline, faces tinted by the room). Storyboard
    every key picture at 180 px wide BEFORE building sets.
68. **Staging rules learned (apply in every shot):** nothing that matters below y 0.80 or right of x 0.90 (the Shorts
    UI covers it); every cut changes size by 1.5x or angle by 30 degrees (else it reads as a zoom glitch); nobody
    lines up facing the lens; a pointing hand stops a hand-width SHORT of what it points at (touching reads as
    holding); arms drawn over sills and window frames (a toon sill clipped the conductor's arm to a 1-3 px line);
    the payoff shot pushes in on the action; a sleeve arm in the clothing colour with a clear hand reads, a thin
    stick arm does not; mouths shut under narration.
69. **Characters next to the reference look soft.** Keep cards OUT of the bloom (crisp near-black ink, ~3 px at 1080),
    cap how much a coloured room tints a face (~50 %), give everyone eyebrows and 3-4 acted faces (smug, side-eye,
    alarm, delight). Do this on the first test shot, not after the film is built.
70. **Judge only rendered film frames, never stills alone.** Stills differ from the film: the kit takes its light
    probe at a shot's first frame, and a card's private shadow map can lose a caster mid-shot (an instanced
    streaming tree / pole culled with a stale bounding sphere) so a whole card jumps paler or strobes dark; only a
    whole-shot clip shows it. Cut the film into frames and per-shot sheets (`briefs/v3/pointing/director/
    audit_sheets.py`) and audit those.
71. **The audit machine works; reuse it.** Seven independent lenses (hook, glitch hunt x2, first-time viewer,
    side-by-side with anti-theft / clown / Ricks, sound by measurement, facts and on-screen text) plus a sceptic that
    re-checks every serious finding on the frames (Workflow script under `.claude/projects/.../workflows/scripts/
    pointing-v4-audit-round-2-*.js`; reports in `studio/out/pointing_v4/audit_r1`, `audit_r3`). Run it on the FIRST
    rough draft, not late. Scores: 7 = our best film, 9 = the reference.
72. **Sound: seen actions get buried.** Cues on the right frame were still 10-38 dB under voice + music in their own
    band. Carve music under each cue and lift the cue (never the voice); better, time actions into the gaps between
    words when the picture is planned. The red-hit style accent cannot beat a shouted word on the same beat.
73. **Pipeline speed that stays:** shared Remotion bundle + per-shot chunk cache + one stills slot while a video
    renders + cards redrawn only when their drawing changes -> draft ~0.17 s/frame (was 2.7-3.6). `--conc 2` gives
    different pixels and no gain. One render slot (RAM token) is the real bottleneck for a 7-agent team.
74. **Team and limits:** owners per set (LAB / TRAIN / STATION) + CAST + LOOK + DIRECTOR + SOUND with per-owner fix
    lists and "PAUSED / done / next" blocks in their notes survived two machine moves and a usage limit. The Opus
    weekly limit was hit mid-build (06:20): big multi-agent rounds cost a lot; plan the story first so the
    expensive build happens once.
75. **Speed of the working folder (2026-11-21).** The type check took ~25 s and every agent ran it after every edit:
    `incremental: true` + `tsBuildInfoFile` (under `studio/node_modules/.cache/tsc/`) brings repeat checks to ~6 s.
    The project is not a git repo, so ripgrep (Claude Code's Grep / Glob) searched ~55,000 files incl. frames,
    packages and temp bundles: the `.ignore` / `.rgignore` at the root cut that to ~7,000. Keep both when the folder
    is copied; give every new film's tsconfig the two incremental lines.

# HANDOVER: finish the Short "the trap" (pointing v4) on this PC

Written by the lead on 2026-11-20 at 09:00, when the owner switched off the first laptop and moved the project.
You (Claude Code on the new PC) are the LEAD now. You orchestrate subagents; the owner watches previews.
No conversation history came with the files: everything you need is written down in the files listed here.

## 0. In one paragraph

Channel "One Small Thing": ~60 s animated cartoon story Shorts (2D cartoon card characters in a colourful 3D world,
one narrator, true stories). Short #6 is about Japanese train drivers pointing at signals. Its first version
(FINAL v1) was rejected by the owner at 1/10 ("script is shit, sound is shit, animation is so glitchy, no fun, old
videos were better"). It was rebuilt from the story up. The new script is LOCKED, the team was mid-build (voice,
characters, sets, sound) when the laptop went off. Your job: finish the round-2 PREVIEW, compare it side by side
with our older films and the reference channel, audit, fix, and show the owner the preview. No "final" before the
owner has seen and liked a preview. Never upload anything.

## 1. Read these first, in this order (about 15 minutes)

1. `briefs/v3/pointing/LEAD_DECISIONS.md`: the last four blocks (from "OWNER'S FULL VERDICT ON FINAL v1").
2. `sound/pointing/SCRIPT_v4.md`: the LOCKED script, its pictures and its facts table.
3. `briefs/v3/pointing/V2_VISION.md`: why v1 failed and the rules for the new film. (One number in it is wrong:
   anti-theft is about 81 s at 2.6 words a second, not 58 s.)
4. `studio/out/pointing/benchmark/BENCHMARK_story.md`, `_sound.md`, `_animation.md`: the measured comparison with
   our older films and the reference; the rules at the end of each are binding.
5. `briefs/v3/pointing/V4_STRUCTURE.md` and `SHOT_TABLE_v4.md`: where the v4 film lives and the 36 shots.
6. `_handover/memory/`: the owner's standing rules (see section 6). `feedback_pointing_final_look_rejected.md` first.
7. `PIPELINE_V3.md`, `LESSONS.md`, `studio/src/kit/KIT_CONTRACT.md` when you need the pipeline itself.

## 2. Where each owner stopped (each wrote a "V4 HANDOVER" block at the top of its notes)

| role | notes file with the handover block | state in one line |
|---|---|---|
| DIRECTOR | `briefs/v3/pointing/DIRECTOR_NOTES.md` | v4 film scaffold done (`studio/src/videos3/pointing/v4/`, composition `PointingV4Kit`), 36-shot table on the locked script, new gates `tools/v3/gates_v4.py`, comparison harness `tools/v3/compare_films.py`; the "opening v4" render command was being built; no v4 frame rendered yet |
| VOICE | `sound/pointing/voice/NOTES.md` | paragraph takes paid and saved (`voice/takes/v4_*`), tools `pt4_*.py`; NOT built or installed; two findings to act on (section 3) |
| CAST | `studio/src/videos3/pointing/cast/NOTES.md` | new rig (thin ink-line limbs, held poses that snap), the hook's young woman `lab_woman`, lab people, Hori, coal man, boss, driver, conductor, the two New Yorkers; cast log for the gates; the v4 beat table is not wired into the sets; rig sheet lacks the young woman |
| LAB (lab + kitchen) | `studio/src/kit/home/NOTES.md` | new hook room `v4/sets/lab.ts` + `lab_plan.ts`, sandbox `KitHomeHook`; fixes after the first draft stills not checked; not attached to shots v01-v05, v36 yet |
| TRAIN (steam, modern cab, train, car) | `studio/src/kit/vehicles/NOTES.md` | steam engine set built (`kit/vehicles/steam_*.ts`, `sets/steam.ts`, sandbox `KitSteam`); lead's feedback on the stills is in the notes; modern-train shot v19-v21 not started |
| STATION (New York) | `studio/src/kit/rail/NOTES.md` | `v4/sets/ny_station.ts` for v31-v35 built; fixes after draft stills not re-rendered |
| LOOK (colour, light) | `studio/out/pointing/look_test/LOOK_PLAN.md` | `v4/look.ts` (palettes, candy materials, sun window, `signalWash()`); lab passes its numbers on a stand-in; cab, New York, kitchen not passing yet |
| SOUND | `sound/pointing/audio/NOTES.md` | `score_v4.py`, `hook_v4.py`, `cues_v4.py`, `mix_targets.py`, `sound_gate.py` exist; v4 not yet wired into `mix.py` |

Split agreed between LOOK and the set owners: the set owner owns layout, props, staging and cameras; LOOK owns
materials, colours and light through `v4/look.ts`, which the set imports.

## 3. The work, in order

**A. Fix the length first (lead's job, 20 minutes).** VOICE measured James (the narrator voice) at 2.9-3.4 words a
second inside sentences and 2.4 on the short countdown sentences, so the locked script comes out at about 78-80 s.
The owner's hard limit is 70 s; aim for 66-68 s. Do not time-stretch the voice, ever. Recommended, in this order:
1. Probe the brisker takes that already exist for paragraph 2 (`v4_p2` t4-t6); a brisk p2 saves about 4 s.
2. Cut line 6 ("Ten lights later, three of them did it again."): about 3 s.
3. Tighten: line 13 -> "And where did it come from? The story goes, a steam-train driver's eyes had gone bad.";
   line 15 -> "So he shouted every signal to his coal man, who shouted back."; line 19 -> "New York copied the
   pointing: conductors must point at this board."; six "Go" instead of seven.
4. If it is still over 68 s, cut the cereal line (10) last: readers liked it.
Keep every wording rule in the script's facts table. After any text change: update `sound/pointing/SCRIPT_v4.md`,
`script_v4/lines_v4.json`, `script_v4/voice_v4.json`, re-record only the changed paragraphs (credits: counter was
32,745 of 40,000; stop at 38,500), then the director regenerates the clock.

**B. Voice.** Follow VOICE's handover: pick the takes by continuity (`pt4_chain.py`), finish the three notes on
`pt4_build.py`, choose the shouts with the pitch layout it found (driver about 230 Hz, coal man about 320 Hz, steam
driver low, about 125 Hz), build, verify, install to `studio/src/videos3/pointing/v4/words.ts`. Put the voice in
`pointing_preview/` for the owner.

**C. The opening first (lines 1-3, shots v01-v05, about 8 s).** Build it, render it with the real voice and the
hook sound, and audit it as frames and sound next to the reference openings (`sound/pointing/hook_lab/strips/`,
`tools/v3/compare_films.py` frame-0 sheet) before building the rest. The owner's rule: the first 3-5 seconds decide
everything. Frame 0: a big signal lamp, a young woman at one big button, readable in a quarter second.

**D. All 36 shots**, each owner on its rows of `SHOT_TABLE_v4.md`; CAST serves every set; LOOK passes each set.
Rules that fix what the owner hated: people small or medium (a head at most a quarter of the frame height outside
marked close-ups); held poses that snap; arms out under 10 % of frames; no hand across a face; nothing pointing at
the lens; a camera that glides and then rests; at least three things moving in every shot; vivid colour (beige and
grey under 15 % of the frame); no shot over 3.5 s.

**E. Sound.** Wire v4 into `mix.py`, cue sheet on the director's clock, mix, then `sound_gate.py` must pass next to
the clown film and two reference Shorts.

**F. Preview, compare, audit, fix (the step that was skipped in v1).** Render the preview; run `gates_v4.py` (with
the cast log) and `compare_films.py` (ours next to anti-theft, clown and three reference Shorts); launch several
independent audit agents (hook, story and fun, picture and glitches, sound) that look at the real frames and listen
by measurement; fix; repeat until it stands next to our older films. Only then show the owner
(`pointing_preview/`). He said: "do many audits and fix".

**G. Title and upload kit** are still to do for the new shape (the old title was "Why Japanese Train Drivers Point
at Nothing"). The owner uploads himself in YouTube Studio.

## 4. How to run the team

- Launch one subagent per role from section 2 with the Agent tool, model `opus`, effort `high` (the owner's
  current choice). Each brief: the role, "read your V4 HANDOVER block in <notes file>, the locked script, the
  shot table and the benchmark rules, then continue from 'next'", the house rules below, and "write two lines of
  notes after each finished step".
- The owner allowed more agents and workflows to go faster. Renders are the bottleneck: one render at a time
  (`--conc 1`), guarded by the RAM token (`studio/scripts/ram_token.sh`) and the stills limiter
  (`studio/scripts/stills_locked.sh`). Delete stale files in `studio/out/.stills_slots/` first.
- House rules for every agent: save files whole and compiling; run
  `npx tsc --noEmit -p src/videos3/pointing/tsconfig.json` from `studio/` after each edit; never run a render and
  leave temp bundles; never play audio or video out loud; never `npm install` new packages (only `npm ci`);
  no secrets in files; set owners never edit each other's files.
- If an agent dies from a network error, restart it from its notes without asking.

## 5. This PC versus the old one

- The old project path was `C:\Users\utkar\Desktop\animated-shorts-studio`. Notes and reports quote that path;
  read them as "the project root". Only two code files hold an absolute path: `tools/v3/compare_films.py`
  (`REFDIR`, the reference Shorts) and `studio/scripts/ram_token.sh` (`RAM_TOKEN`). `SETUP_NEW_PC.ps1` rewrites
  both for this PC; check them.
- Reference Shorts: on the old PC in `Desktop\yt short videos\`; here wherever setup put `_external/yt short videos`.
- Research notes: on the old PC in `C:\Users\utkar\research_notes\`; here `_external/research_notes` (setup copies
  it to `~/research_notes`). Readers of scripts used `research_notes/ricksclips/transcripts/`.
- ElevenLabs key: `tools/el_api.py` reads `~/.secrets/elevenlabs_api_key` (or the file named by `EL_KEY_FILE`).
  It is not in the zip. If the owner brought the key file, setup installs it; if not, ask him for it once.
  Sound effects on the old PC went through an ElevenLabs MCP server; here call the API through `tools/el_api.py`.
- Whisper (word timing) downloads its model on first use; with no NVIDIA card it runs on the CPU, slower.
- A weaker graphics card makes renders slower, not wrong. Use draft or preview quality while building.
- Left on the old laptop on purpose (not needed): node_modules, Python venvs, render caches, the rejected FINAL v1
  video, old voice takes of the dropped story (`sound/pointing/voice/_v3`), other films' working files.
- The code is also on GitHub: private repo `UtkarshBirla28/animated-shorts-pipeline`, branch `pointing-v4`
  (code and text only, no media). Commits there: the owner's identity, never a Claude co-author line.

## 6. The owner, and his standing rules (full text in `_handover/memory/`)

- He writes short, fast messages with typos; answer in plain, simple English, short, no jargon.
- He wants to SEE progress: put stills, voice and videos in `pointing_preview/` as they exist and say honestly
  what is good and what is not. Never overclaim; never call something final before he has seen a preview.
- You approve the pipeline gates yourself (script, voice, storyboard); do not quiz him; diagnose by your own audits.
- The hook (first 3-5 s) is designed and audited first. Goal: a great hook, a great video, 100k-200k views.
- AI voices only, as real as possible; never time-stretch; best of several takes. Film 60-70 s, 70 s hard limit.
- Warm, bright, colourful look. Story + a play-along hook + a moving camera + life in every shot.
- Compare every draft side by side with our best film and the reference channel (Ricks Clips) before showing it.
- Any failure (render killed, agent died): clean up and restart automatically; finish only after audits pass.
- Never upload through the API; never commit or push unless asked; no Claude co-author trailer; test runs silent.
- Research completely rather than fast. Keep his priority order when he sets one.

## 7. File map

| what | where |
|---|---|
| locked script, facts, reader reviews | `sound/pointing/SCRIPT_v4.md`, `FACTS_v4.md`, `script_v4/` |
| lead's log (state of play) | `briefs/v3/pointing/LEAD_DECISIONS.md` |
| v4 film code | `studio/src/videos3/pointing/v4/` (old v3 film beside it, still renders, dead) |
| the 3D kit | `studio/src/kit/` (+ assets in `studio/public/kit/`) |
| render scripts | `studio/scripts/` (`kit_render.mjs`, `stills.mjs`, `stills_locked.sh`, `ram_token.sh`) |
| tools | `tools/` and `tools/v3/` (`gates_v4.py`, `compare_films.py`, `qa_gates.py`, `gen_words_ts.py`) |
| voice | `sound/pointing/voice/` (takes in `takes/v4_*`), installed voice goes to `sound/pointing/voice_v4/` |
| sound | `sound/pointing/audio/` |
| hook research | `sound/pointing/hook_lab/` (HOOK_RESEARCH.md, OPENINGS_DATA.md, strips) |
| Shorts playbook | `_external/research_notes/devenseenath/PLAYBOOK.md` |
| our older films (yardsticks) | `studio/out/antitheft/antitheft_FINAL_1080x1920.mp4`, `studio/out/clown/upload/clown_FINAL_1080x1920.mp4`, scripts in `sound/antitheft/SCRIPT.md`, `sound/clown/SCRIPT_v6.md` |
| what the owner has seen | `pointing_preview/` |
| v1 audits (what went wrong, in detail) | `studio/out/pointing/final_audit/`, `studio/out/pointing/look_test/DIAGNOSIS.md` |

## 8. What the owner was last told

Round-2 preview "this evening" (2026-11-20, about 8-9 pm) on the old laptop; then he had to leave and moved the
project. He has heard the new music test and the hook sound test and seen three steam stills and the rig sheet.
He has read the locked script (trap first) and did not object. He has not been told yet that the script is about
10 s too long at the narrator's real pace: tell him when you report the cut.

# PIPELINE v3: a Short on the real-world kit, every detail decided BEFORE the build (WORKFLOW owner, 2026-11-19)

The owner: "optimise our workflow, it takes so much time... taking more tokens is also fine but video time should be less
and quality video should come; it should decide all detailings before only". This replaces PIPELINE.md for NEW films
built on the three.js kit (`studio/src/kit/`, contract `studio/src/kit/KIT_CONTRACT.md`). PIPELINE.md stays the reference
for the voice / sound / mix / QA tools, which v3 keeps unchanged. Old films are never touched.

Commands: Git Bash, repo root `<ROOT>` = `C:\Users\utkar\Desktop\animated-shorts-studio`. Python always
`PY="PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s"`. Tools: `tools/v3/` (see `tools/v3/NOTES.md`). Workflows:
`workflows/v3/` (run with the Workflow tool: `scriptPath: <ROOT>/workflows/v3/<name>.js`, args saved to
`studio/out/<slug>/args_<stage>.json` FIRST: a resume reuses finished agents only with byte-identical args).

## The shape in one picture
```
A DECIDE ──────────────────────────────────────────────┐   B BUILD          C ANIMATIC            D POLISH        E FINAL
 A0 scaffold  A1 script+lint  A2 VOICE (locked)        │    builders x5     preview (cached      only failing     final render
              A3 DETAIL BIBLE (parallel, from est)     │    + SOUND in      shots) + mix         shots, from      (unattended)
              A4 storyboard stills (every framing)     │    parallel        + QA GATES           the per-shot     + QA + kit
              A5 OWNER GATE 1 (script+voice+board) ────┘    + validators    + ONE deep audit     cache            upload kit
                                                                            + OWNER GATE 2
```
Nothing is built before Gate 1, nothing is polished before Gate 2, and the final render runs only after the gates PASS
and the owner approves.

## The owner's rules (binding at every stage)
- Voice quality first: James on eleven_v4, best of 4 takes per beat, measured; never time-stretch; the film may run longer.
- Finish only after the audits pass (memory `feedback_finish_only_after_audits`), but the AUTOMATIC gates do the numeric
  part, so one deep audit per round is enough.
- Story first (a quiz only as a hook), short plain lines, a funny beat and a mystery beat; calm but always-moving camera,
  a new framing about every 2.5 s, >= 3 moving things per shot, boards <= 6-8 words held 1.5-2.5 s, warm bright golden look.
- Previews the owner can watch: the storyboard sheet (Gate 1) and the animatic (Gate 2); every render silent; never play
  audio or video; renders muted.
- RAM-token protocol (LESSONS 55): `source studio/scripts/ram_token.sh; ram_take "<job>"; ...; ram_release` for every
  multi-frame render (kit_render.mjs does it itself); stills only through the 2 machine-wide slots
  (`studio/scripts/stills_locked.sh`, which storyboard.mjs and kit_render --stills use); one heavy process at a time; never
  touch the other session's processes. Any failure (memory, network): clean up and resume automatically.
- Never `npm install` into studio/, never edit `studio/src/kit/*` from a film, do not commit or push.

---

## Stage A: DECIDE (about 3.5-4.5 h wall; the owner's time at Gate 1 not counted)

### A0 scaffold (5 min)
```bash
$PY tools/v3/new_short_v3.py <slug> "<Video title>"      # picture studio/src/videos3/<slug>/, sound/<slug>/, briefs/v3/<slug>/
```
Writes `film.ts` (FILM: Film), `shots.ts` (GENERATED from the bible), `camkit.ts` + `cams.ts` + `sets/<set>.cams.ts`
(first-pass CORE camera presets per set), `sets/<set>.ts` (BLOCKOUT builders: the real PBR ground + placeholders, enough
for the draft storyboard), `cast.ts`, `words.ts` (placeholder), `Captions.tsx` (house style), `FilmView.tsx`
(`<KitFilm film={FILM} overlay=captions />`; not `Film.tsx`: on Windows `./Film` resolves to `film.ts`), `Root.tsx`
(`KitComposition id <Pascal>Kit`), `index.ts`, `tsconfig.json`; the generic sound engine of the newest film (clown: real
samples with sync points, the sync-direction check, check_audio) + `LIBRARY.md` (the CC0 and ElevenLabs libraries by
reference); the voice tools; `briefs/v3/<slug>/SCRIPT.md`, `bible.json`, `HANDOFF.md`. Keep HANDOFF.md current at every
step (state, run IDs, args files, the next command): sessions restart.

### A1 script, linted (30-45 min; workflow `decide.js` stage "script", 1 agent)
`briefs/v3/<slug>/SCRIPT.md` in the playbook table (`| s | Beat | Speaker | Line |`; example `briefs/v3/award/SCRIPT.md`),
written to `C:\Users\utkar\research_notes\ricksclips\SCRIPT_REPORT.md` section 5 (beat template, 15-rule checklist, hooks,
titles). The agent loops until
```bash
$PY tools/v3/script_lint.py briefs/v3/<slug>/SCRIPT.md --target=65 --json=briefs/v3/<slug>/lint.json     # VERDICT: PASS
```
(length + pace for the target with our measured James pace, hook <= 16 words with no date / name / statistic, <= 4 spoken
numbers, no names / years, a doubter by 30 %, a 2-6-word loop line at 40-65 %, the answer at 60-75 %, <= 12-15 s after
it, a <= 3-sentence why, nothing after the payoff; line numbers on every FAIL), then ticks the 6 MANUAL rules in the
file. The LEAD re-checks every fact against its primary source.

### A2 VOICE FIRST, locked before any picture timing (1-2 h; LEAD; ElevenLabs credits: tell the owner the cost first)
Exactly PIPELINE.md stage 2 (4 directed takes per beat, `tools/beat_select2.py`, `eleven_build.py --breath`,
`tools/voice_accept.py`, character voices cast 3 candidates each (LESSONS 51), `refine_onsets.py`,
`tools/gen_words_ts.py sound/<slug>/voice studio/src/videos3/<slug>/words.ts`). NEW in v3: the pauses the picture needs
(before the reveal, after a number, the lead-in for the opening sound) are decided HERE from the bible's beats and made
with `tools/insert_pause.py`, so the voice never changes after Gate 1 (the clown film re-voiced after the build: v6 ->
v6b, shift tables, a re-time of every shot). Then `$PY tools/v3/new_short_v3.py <slug> --shots` maps every shot's
`starts_on` word to frames. **A2 runs in parallel with A3**: the bible is written on the linter's time estimates and
only its frame numbers change when the voice lands.

### A3 the DETAIL BIBLE (1.5-2 h; workflow `decide.js` stage "bible": 1 planner, 4-6 detail agents in parallel, 1 merger)
`briefs/v3/<slug>/bible.json` (format `briefs/v3/BIBLE_TEMPLATE.json`; worked example `briefs/v3/award/bible.json`, 8
sets, 22 shots, 35 framings) holds EVERY decision: per set the place, ground surface + meso + wear + scatter, surfaces,
props, vegetation, practicals, ambience, build time; per shot the beat and line, `starts_on`, set + location, transition,
**framings** (a new one about every 2.5 s, subject height), **camera** (a CORE preset + params + planned speed), **light**
(rig + practicals), **surfaces near the lens** (meso + wear), **props, vegetation, life (>= 3 moving things), fx,
acting** (who, on which word, the visible verb, the expression, >= 12 f), **boards** (<= 6 words, hold, size),
**captions**, **sound events** (one for every action / fx / audible life item + the ambience); the music plan; the loop.
Names come from the kit menus (CORE NOTES: 7 rigs, 11 camera presets; SURFACES: the `public/kit/surfaces/` sets +
`ground / interior / facade`; NATURE: trees, plants, props, fx; CARDS: `card / castCard / crowd`); a thing the kit lacks
is `"new": true` (a kit request for its owner) or `"local": true` (built in the film's `sets/`).
The detail agents write `briefs/v3/<slug>/parts/<group>.json`; `tools/v3/bible_merge.py` merges them (no two agents
ever edit the bible), then
```bash
$PY tools/v3/bible_validate.py briefs/v3/<slug>/bible.json --json=briefs/v3/<slug>/validate.json        # VERDICT: PASS
$PY tools/v3/render_estimate.py briefs/v3/<slug>/bible.json                                            # hours per quality
```
The validator checks the DETAIL STANDARD (three scales near the lens, no bare primitives, wear + ground truth, contact,
real vegetation, a rig per shot, practicals indoors, life >= 3, only the cast inked) and the research targets (>= 5
locations or a reason, a framing every <= 2.5 s, <= 2 snaps, boards and captions short, a sound event for every action),
and MEASURES every planned camera with CORE's `camSpeedStats` (`tools/v3/cam_speed.mjs --plan`, later `--film`):
film median >= 0.7 %/f, no shot under 0.15 %/f unless it is a planned freeze, peak <= 4.2 %/f (the owner's calm cap). On
the award example it caught 5 camera mistakes in a hand-written plan (a push whose distance grew = 0.01 %/f, follows at
2.4-2.8 %/f). Thresholds: `tools/v3/targets.json` (one file, each with its source).

### A4 storyboard stills of every framing (30-60 min; the same workflow's storyboard agent)
```bash
node tools/v3/storyboard.mjs --slug <slug>          # CORE kit_render.mjs --stills, draft quality, ~14-25 s per still
```
One draft still per framing from the blockout sets with the real cameras, light rigs and PBR grounds, and a numbered
contact sheet (`studio/out/<slug>/storyboard_draft.jpg`: shot id, beat, seconds, the framing and its line under each
frame); the still paths go into the bible. The agent looks at the sheet, fixes framings that do not read at phone size
(cams files + bible), re-runs those stills (`--shots s03,s07 --force`), then `bible_validate.py --stage=gate1`.

### A5 OWNER GATE 1 (the owner's 10-30 min)
The owner gets: the script (and the lint table), the voice-only mp3 (`studio/out/<slug>/voicetest/`), the storyboard
sheet, the 3-5 decisions to confirm (the agent's `owner_questions`), the title options, and the render estimate. Changes
go into SCRIPT.md / the voice / the bible NOW (cheap); after Gate 1 the bible changes only through the LEAD, logged in
its `CHANGES`. This is where the clown film's cut 1 (static, a quiz instead of a story) would have been stopped before
6.7 h of building.

## Stage B: BUILD (about 3-3.5 h wall; workflow `build_v3.js`)
One BUILDER per set group (4-6 groups from the planner, balanced by shot count) + one SOUND agent, all in parallel:
- builders own only `sets/<set>.ts` + `sets/<set>.cams.ts` of their sets (no shared file, no merge step): blockout ->
  the kit (SURFACES ground / interior / facade, NATURE props / vegetation / fx, CARDS cast + crowds), real subject marks,
  acting on the words, `sound_cues.json` from their staging code;
- validators BEFORE any shared render, each reported: typecheck (`npx tsc --noEmit -p src/videos3/<slug>/tsconfig.json`),
  `bible_validate.py --only=<their shots> --stage=build`, `cam_speed.mjs --film`, their draft stills, ONE preview clip of
  their shots (`kit_render.mjs --quality preview --shots <ids>`: these files ARE the animatic's cache), `qa_gates.py` on
  each shot;
- SOUND works from the bible (every sound event, the ambience, the music plan keyed to the words) while the picture is
  built: the sample map, the score, the beds, `mix.py` reading the builders' cue files. The clown film did its sound after
  the picture lock.
An integrator then checks the whole film (typecheck, validate --stage=build, film camera speeds, frame 0 == the last
frame) and lists the lead_requests. kit_render.mjs hashes each set's own import graph, and every set file re-exports its
cameras, so a fix on one set re-renders only that set's shots.

## Stage C: ANIMATIC + gates + ONE deep audit (about 1.5-2 h; workflow `audit_v3.js`)
```bash
cd studio && node scripts/kit_render.mjs --entry src/videos3/<slug>/index.ts --comp <Pascal>Kit --quality preview --shots all --out out/<slug>/
#   unchanged shots come from the builders' cache; the rest render at <= 0.6 s/frame; -> out/<slug>/<slug>_preview.mp4
cd .. && PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/<slug>/audio/mix.py      # after the render
ffmpeg -v error -y -i studio/out/<slug>/<slug>_preview.mp4 -i sound/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k studio/out/<slug>/<slug>_preview_mix.mp4
$PY tools/v3/qa_gates.py studio/out/<slug>/<slug>_preview_mix.mp4 --shots=<shots json> --words=sound/<slug>/voice/words.json --out=studio/out/<slug>/<slug>_preview_gates
```
`qa_gates.py` gives a gate table in about 1 minute (49 s for a 75-s film): per shot the camera median / still share, own
motion ("life"), chroma, shadow chroma, blur, busy-ness, brightness, frozen frames (the look_metrics.py functions, same
formulas), and for the film the loudness / true peak / LRA, the loop seam and captions on every word. Checked against the
research: on the clown preview it reproduces LOOK_REPORT's clown numbers exactly (0.24 %/f, chroma 32.2, own motion 0.158);
the look pilot passes the look gates (chroma 23.6, shadow chroma 13, blur 1.4 %). Then ONE deep audit with three lenses
in parallel on the same animatic + gates: the director / first-time viewer (would I swipe, story, acting, edit), look +
motion (the DETAIL STANDARD on frames, starting from the failing gates), sound + voice (measured). It returns a score per
shot and the fixes per set group (`fixes`, `failing`). **OWNER GATE 2**: the owner watches the animatic with sound.

## Stage D: POLISH, only the failing shots (1.5-2 h per round; 1 round planned, 2 at most; workflow `polish_v3.js`)
Shots that fail a gate or score < 8 (and the owner's notes) go to the set-group owner that built them; it fixes, looks
at draft stills, re-renders ONLY those shots (`kit_render.mjs --shots <ids>`: the per-shot cache keeps all others),
re-runs `qa_gates.py --only`; SOUND re-mixes after the renders (never a mix and a render at once: 16 GB). Then the LEAD
re-concatenates (kit_render concats when every shot is current), re-runs the gates (1 min) and has the director lens
look at the re-done shots only. No full re-audit unless a gate fails again.

## Stage E: FINAL (2-3 h, unattended; LEAD)
```bash
cd studio && node scripts/kit_render.mjs --entry src/videos3/<slug>/index.ts --comp <Pascal>Kit --quality final --shots all --out out/<slug>/
```
(final = 8 sub-frames, <= 4 s/frame: about 2.6 h for a 76-s film on the 1660 Ti; `final4` about 1.6 h if the owner accepts
the slightly rougher motion blur), mux with the final mix (AAC 384k, no `-shortest`), `qa_gates.py` on the final (the
look gates + 1080x1920 30 fps + -14 LUFS / <= -2 dBTP + the loop + captions), `studio/scripts/short_qa.py` for the frame
dump and contact sheets, the real-frame checks (LESSONS 57-59: frame count == TOTAL, no stale chunk), covers, the
upload kit (title, description with the sources, pinned comment, "not made for kids" when needed).

---

## Hours: v3 against the clown film (measured)
The clown film ("The Clown Nobody Saw", 74.9 s), measured from its file timestamps (an hour-by-hour histogram of every
file it wrote) and `studio/out/clown/RESUME_HERE.md`: started 16 Nov 22:47, delivered 19 Nov 01:05 = 50 h on the calendar
with **about 25 h of active work** in three sessions (22:47-09:55, 22:45-08:45, 21:00-01:05; the gaps are owner pauses
and a usage-limit stop).

| clown film (old engine) | hours | what happened |
|---|---|---|
| cut 1: script v4, voice, world, characters, sound, preview 1, 6 audits | 6.7 | REJECTED by the owner (static, a quiz instead of a story) |
| rebuild design: script v6, plan v2, voice v6, edit skeleton, look, design, SFX library, music | 4.4 | decisions made a second time |
| 3 animators finish + sound phase B + preview 2 (17 min render) | 2.7 | |
| 6 audits of preview 2 | 1.0 | |
| fix round 2: voice v6b re-take -> every shot re-timed (shift table), edit / look / design / 3 animators, preview 3 (39 min) | 6.1 | ~2 h lost to a usage-limit kill + the re-time |
| audits of preview 3 + the owner's verdict | 1.0 | |
| fix round 3 (acting) + preview 4 (29 min) | 2.4 | |
| final render (33 min) + QA + upload kit | 1.0 | |
| **total** | **~25.3** | renders were only ~2 h of it (8 %); re-work rounds ~13 h; audits ~3 h |

| v3 stage | wall hours | notes |
|---|---|---|
| A DECIDE (A0-A4; A2 voice parallel with A3 bible) | 3.5-4.5 | + the owner's Gate 1 |
| B BUILD (5 builders + SOUND parallel, validators, integrator) | 3.0-3.5 | GPU clips queue on the RAM token |
| C ANIMATIC (cached preview, mix, gates, 1 deep audit) | 1.5-2.0 | + the owner's Gate 2 |
| D POLISH (1 round, 2 at most) | 1.5-3.5 | only failing shots re-render |
| E FINAL (render unattended + QA + kit) | 2.0-3.0 | final 2.6 h / final4 1.6 h |
| **total** | **11.5-16.5 (typical ~13-14)** | about half the clown film's 25.3 h, with ~2.6 h of it an unattended render |

Honest caveats: these v3 hours are planned, not measured (the kit is being finished today; the first v3 film will also
pay for kit gaps: the award example still has 40-odd names the kit has not published yet). The kit's final render is
about 4x slower per frame than the old engine (2.6 h vs 33 min), so v3 saves its time in decisions and re-work, not in
rendering, and it must never re-render the whole film at final quality more than once.

## What saves the time (the changes, in numbers)
1. **Decide first + Gate 1 on a storyboard** (script lint, locked voice, the validated bible, stills of every framing
   before any build): the clown film lost 6.7 h to a rejected cut 1 and another ~3 h to a re-voice + re-time after the
   build. Estimated saving 6-9 h.
2. **Parallel builders from one bible, on reusable kit parts** (no per-film world / look / design owners; each builder
   owns its set files, no merge step): the clown film's design + look + world + 3 animator passes took ~10 h in
   sequence; v3 builds in ~3 h. Saving 4-6 h.
3. **Per-shot cache + polish of failing shots only** (kit_render hashes each shot and each set's own files; the builders'
   preview clips are the animatic): a polish round re-renders ~6 shots (~11 min) instead of the whole film (29-39 min per
   preview, ~2.6 h at final quality), and only those owners work. Fix rounds of 6.1 h and 2.4 h become ~1.5-2 h. Saving 3-5 h.
4. **Automatic gates + ONE deep audit** (qa_gates: ~1 min, numbers per shot; 3 lenses instead of 6 lenses x 3 rounds):
   audits fall from ~3 h to ~1 h, and the agents' tokens go to fixing, not to re-measuring. Saving ~2 h.
5. **Voice locked first with its pauses, and SOUND in parallel with the picture** (the bible lists every sound event and
   the music plan): no shift tables, no post-lock sound pass. Saving ~2-3 h.
Also: resume-safe workflows (args files, every agent saves to disk, one automatic "continue from disk" retry for a dead
agent) against the clown film's lost night (the usage-limit kill) and dropped connections.

## When something is missing from the kit
`bible_validate.py` lists every name that is not in a published catalog ("KIT NAMES ... kit requests"). Before Gate 1 the
LEAD sends that list to the kit owners (or marks items `local`, built in the film's `sets/`). With `--stage=build` or
`--strict-catalog`, unknown names FAIL.

## Notes for the kit owners (from building these tools against your APIs)
- CORE: `camSpeedStats` reads an orbit / follow around a centred subject as almost still (0.01-0.02 %/f), because the
  0.7x and 2x points cancel in the similarity fit; a real frame is mostly background. `cam_speed.mjs` reports a
  background-weighted median (`depthK [1, 2, 4]`) for those presets. Worth a look in `camera.ts`.
- CORE: kit_render treats only `sets/<setId>.ts` import graphs as per-set; the v3 scaffold re-exports each set's cameras
  from its set file so a camera tweak stays per-set. Keep that rule (or also treat `sets/<setId>.*.ts` as per-set).
- SURFACES / NATURE / CARDS: a `catalog.json` in your folder (`{"surfaces": [...], "props": [...], "fx": [...],
  "cards": [...]}`) makes the validator exact; until then it reads your public/kit folders and the backticked names in
  your NOTES.md.

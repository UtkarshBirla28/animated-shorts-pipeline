# PIPELINE: from a script to a finished short

This is the exact process used for "The Anti-Theft Sign That Made People Steal" (the worked example in this repo),
written so it can be repeated for any new script. Claude Code runs it as the **LEAD**: it writes the story contract,
makes the voice, runs the builder / auditor / fixer workflows, merges their work, renders, and loops until the bar is met.

Paths are relative to the repo root (`<ROOT>`). Commands are Git Bash. Python always runs from the private venv:

```bash
PY="tools/.venv/Scripts/python.exe"        # created by setup/setup.ps1 ; always run it as: PYTHONNOUSERSITE=1 $PY -s ...
```

Every tool works on the **current short**, set in `.short.json` by `tools/new_short.py` (override with `SHORT=<slug>`).

---

## The bar (do not stop before it)

- **Picture:** every shot scores **>= 8/10 overall** in an audit (8 = matches the reference channel). The whole-film
  score (id 0) is **>= 8** too.
- **Sound:** the sound + voice score (id 99) is **>= 8**. The master hits **-14 LUFS**, true peak **<= -2 dBTP** and LRA
  **1.7-3.1**, with the music about **-18 LU** under the voice. Every SFX lands 0-3 frames from its picture event.
- **Voice:** a natural read with pitch movement and pauses in the right places. No time-stretching, ever. No breaths
  in the pauses and no clipped consonants. Whisper must hear every flagged word clearly.
- The final render (1080x1920) happens **only after** all of that passes. Re-check, then re-check again.

Typical trajectory: A1 4.8 -> A2 5.8 -> A3 6.6 -> A4 6.8 -> A5 7.1. Plan for 6-8 audit rounds. Each round takes about
1-2 h (fixers) plus a render (about 20-30 min at half scale) plus an audit (about 30-45 min).

---

## Stage 0: start the short (5 min)

```bash
PYTHONNOUSERSITE=1 $PY -s tools/new_short.py <slug> <CompName> "<Video title>"
#   e.g. tools/new_short.py moon_heist MoonHeist "The Heist That Stole the Moon"
```
This copies the example's picture engine to `studio/src/videos/<slug>/` (`<CompName>.tsx`), registers the composition,
copies the sound engine and voice tools to `sound/<slug>/`, creates `briefs/<slug>.md` and `studio/out/<slug>/`, and
writes `.short.json`. Read `studio/src/videos/<slug>/STARTED_FROM.md`: engine files stay, story files get replaced.

Start a running log at `studio/out/<slug>/HANDOFF.md` now and update it at every step: state, running jobs, workflow
run IDs + the args file, and the next command. Sessions restart. The log is how work resumes.

## Stage 1: brief, facts, script (LEAD, 30-60 min)

1. Fill `briefs/<slug>.md` (template: `briefs/TEMPLATE.md`; example: `briefs/examples/anti_theft_sign_brief.md`):
   length, voice, music mood, loop frame, **facts with sources**, the script, and **safety rules** (who must not be
   named, what must not be shown, no logos, family-safe).
2. Check every fact against its primary source (web research). Put the facts at the top of `sound/<slug>/SCRIPT.md`
   with links. The video description must credit the source paper or book.
3. Shape the script for the channel style (`study/CHANNEL_STYLE_BIBLE.md` sections 2-3 and 11): a hook in under
   3 s, a mystery question, the test, the reveal, a pivot ("You see,"), an analogy, a twist, and a last line that
   loops to frame 0. Use short punchy lines and digits in captions (14, 2%, 8%).
4. Split it into **phrases** and **beats**:
   - `sound/<slug>/voice/voice_build.py` -> `P = [(markup, gap_after_s, beat, style), ...]`. Markup can be
     `{display|spoken}`, e.g. `{200|two hundred}`. Style is `None` or `"whisper"`.
   - `sound/<slug>/voice/eleven_build.py` -> `BEATS = [(beat_no, [phrase indices]), ...]` (10-14 beats of 1-4 phrases)
     and `INNER` (an extra pause inside a phrase, e.g. after "You see,"). Delete the example's `SHORT_ANALOGY` special
     case in `markup()`.
   - One text file per beat: `sound/<slug>/voice/takes/<set>/bNN.txt`. Use the spoken text with at most ONE short
     eleven_v4 audio tag, e.g. `[stage whisper]`. Long tags leak into the audio as spoken words.

## Stage 2: VOICE FIRST (LEAD, 1-3 h, uses ElevenLabs credits)

The picture is timed from the final voice, so the voice must be finished before any picture work. The old example
had to re-time a finished picture to a new voice (`tools/voice_warp.py`). A new short avoids that by doing the voice first.

1. **Voice choice.** The default is ElevenLabs **"James - Conversational, Energetic, Punchy"** on **eleven_v4**
   (voice id `QhpsGjDKZmM9qRYdMhBD`). It won the 11-voice audit (`study/voices/`): 174 Hz, 14.9 semitone range, a
   real whisper, and questions that rise. On a new ElevenLabs account, add it to My Voices first:
   `PYTHONNOUSERSITE=1 $PY -s tools/el_api.py shared "James Conversational Energetic Punchy" 5`, then
   `PYTHONNOUSERSITE=1 $PY -s tools/el_api.py add <public_owner_id> QhpsGjDKZmM9qRYdMhBD "AT James"`.
   For a different voice, follow the audition flow in `docs/voice_audition.md`.
2. **Takes.** Make 4 directed takes per beat: stability 0.5 / 0.4 x style 0 / 0.3, speed 1.0 (v4 max 1.2), model
   eleven_v4. Each call is `tools/el_api.py tts <voice_id> eleven_v4 <out.mp3> <text.txt> <stab> <speed> <style>`,
   and it writes the mp3 plus timestamps. Cost is about 1 credit per character: a 1.3k-character script x 4 takes is
   about 5-6k credits. **Tell the user the credit cost before generating.**
3. **Pick the best take per beat** by measurement:
   `PYTHONNOUSERSITE=1 $PY -s tools/beat_select2.py <src> <name>_final --f0=180`. Both arguments are folder names under
   `sound/<slug>/voice/takes/`, and `--only=3,5` re-scores only some beats. Edit its `acting()` checks for the new
   script's beats (which word should rise, which line is a whisper, where the excitement goes). Copy a different
   round's take into `<name>_final/` when you override a pick, and log why in HANDOFF.md.
4. **Assemble:** `PYTHONNOUSERSITE=1 $PY -s sound/<slug>/voice/eleven_build.py --takes=<name>_final --tag=eleven_v4:james --thr=0.10 --breath`
   writes `takes/<name>_final/_assembled/` (voice.wav, words.json, phrases.json, voice_info.json). It gates breaths
   out of the pauses, keeps weak consonants, crosses stop closures, and never changes the tempo.
5. **Accept:** set `FLAG` in `tools/voice_accept.py` to this script's hard words, then run
   `PYTHONNOUSERSITE=1 $PY -s tools/voice_accept.py sound/<slug>/voice/takes/<name>_final/_assembled`.
   - Gate: every flagged word has Whisper p >= 0.6.
   - Gate: there are 0.0 s of audible frames in the pause middles.
   - If a word fails, re-take only that beat with a different stability or style, or a respelling such as "Chal-dee-nee".
6. **Install + time:** copy `_assembled/*` into `sound/<slug>/voice/`, then run:
   ```bash
   PYTHONNOUSERSITE=1 $PY -s sound/<slug>/voice/refine_onsets.py          # snap word starts to the real onsets (both ways)
   PYTHONNOUSERSITE=1 $PY -s tools/gen_words_ts.py sound/<slug>/voice studio/src/videos/<slug>/words.ts
   ```
7. **The user listens.** Claude cannot hear. Export a voice-only mp3 to `studio/out/<slug>/voicetest/`, give the user
   the path, and wait for an OK. The user's rule: voice quality comes first. The film may run longer, but never
   time-stretch the voice.

## Stage 3: the story contract (LEAD, 1-2 h)

Write these in `studio/src/videos/<slug>/`. The example files show the format, so read them first.
- `BUILD_PLAN.md`: the shot table (id, set, light, framing, action per BEAT word, sound events), the files-and-owners
  list, global look, characters (one body colour + one signature item each, a distinct main character), exterior and
  interior details, sound events, safety, and the **QUALITY BAR** section (copy the example's QUALITY BAR v2 + ROUND 2+
  directive, then adapt the place). Owners build only what this file says.
- `plan.ts`: every world anchor (character marks, hero props, sign positions, `LightName` list).
- `story.ts`: `BEAT` (named frames from words.ts), `SHOTS` (a..b per shot, set, light, relights), first-pass `CAMS`
  (story.ts helpers: `hold`, `glide`, bell crane, creep), `DOFS`, `KICKS`, `XFADE` (7-9 f), `TAIL` (about 20 f after
  the last word), and P0 (frame 0 = last frame: the video loops).
- Then:
  ```bash
  cd studio && npx tsc --noEmit && node scripts/export_timeline.mjs && cd ..
  PYTHONNOUSERSITE=1 $PY -s tools/voice_warp.py sound/<slug>/voice/words.json sound/<slug>/voice --identity
  ```
  `--identity` writes an identity time-map, because the picture already runs on the final voice.

## Stage 4: build round 1 (workflow, 1-2 h)

```bash
cd studio && for n in world_ext world_int char post cam; do bash scripts/sandbox.sh make $n; done
```
Write the args to `studio/out/<slug>/args_build.json` (schema: `workflows/README.md`), then run the Workflow tool with
`scriptPath: <ROOT>/workflows/build.js` and those args. **Save the args file first.** A resumed run must get
byte-identical args to reuse finished agents.

Merge each owner when its report is back, and read the `lead_requests`:
```bash
bash scripts/sandbox.sh merge world_ext sets_ext.ts paint.ts
bash scripts/sandbox.sh merge world_int sets_int.ts lights.ts shade.ts
bash scripts/sandbox.sh merge char toon.ts cast.ts cardshade.ts
bash scripts/sandbox.sh merge post <CompName>.tsx Captions.tsx ink.ts grade.ts lensblur.ts
npx tsc --noEmit && node scripts/export_timeline.mjs && node scripts/audio_probe.mjs && node scripts/audio_cast_probe.mjs
cd ../sound/<slug>/audio && PYTHONNOUSERSITE=1 ../../../$PY -s mix.py      # delete audio/_cache after big changes
```
Apply the lead_requests yourself (plan.ts / story.ts / world.ts). Verify framings without a render using
`node scripts/project.mjs '<expr>'`.

## Stage 5: preview render (20-40 min)

```bash
cd studio
TOTAL=$(node -e "console.log(require('../sound/$SHORT/audio/timeline.json').total)")    # or read it from timeline.json
bash scripts/render_chunks.sh out/<slug>/previewN_silent 0.5 2 0-<T/3> <T/3+1>-<2T/3> <2T/3+1>-<TOTAL-1>
ffmpeg -v error -y -i out/<slug>/previewN_silent.mp4 -i ../sound/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 \
       -c:v copy -c:a aac -b:a 256k -shortest out/<slug>/previewN.mp4
```
- Chunks run one process each, so memory is freed between them. A killed run resumes from the `.done` markers.
  If a render dies (low memory), restart it automatically. That is the user's standing rule.
- Never run two big renders at once, and never run a render alongside another GPU-heavy app.
- Give the user the preview path, plus a contact sheet (`tools/sheet.py`), so they can watch progress.

## Stage 6: the audit -> fix loop (repeat until the bar)

1. **Audit:** write `studio/out/<slug>/args_A<n>.json` (round "A<n>", video = the new preview, shots = shot count),
   then run the Workflow tool with `scriptPath: <ROOT>/workflows/audit.js`. It starts 2-shot auditors, a whole-film
   auditor (id 0) and a sound + voice auditor (id 99).
2. **Digest:** `PYTHONNOUSERSITE=1 $PY -s tools/audit_digest.py <journal.jsonl> studio/out/<slug>/audit_A<n>`. It writes
   `SCORES.md` + `fixes_<OWNER>.md`. The journal is at
   `~/.claude/projects/<project>/<session>/subagents/workflows/<run id>/journal.jsonl`.
   **Tell the user the score table** (mean, film, sound, the lowest shots).
3. **LEAD items first:** fix the VOICE list yourself (re-take named lines, re-assemble, re-accept, re-install, then
   refine_onsets -> gen_words_ts -> export_timeline -> mix), plus plan.ts / story.ts / world.ts items. Write
   `studio/out/<slug>/carryover_r<n>.md` with what the owners must know (new plumbing, decisions, numbers).
4. **Fix round:** `bash scripts/sandbox.sh sync <name>` for each owner, then write `args_fix<n>.json` (notes + per-owner
   pointers to their `fixes_<OWNER>.md` + carryover; CAM gets `fixes_LEAD.md`). Run `workflows/fix.js`.
5. **Merge + integrate:** sandbox merges, lead_requests, tsc, export_timeline, audio probes, mix, then render preview
   N+1 and go back to step 1.
6. Stop only when every shot overall >= 8, film >= 8 and sound >= 8. If a score stalls for 2 rounds, look at the
   evidence sheets yourself and change the approach. Do not just re-send the same list.

## Stage 7: final render, QA, delivery

```bash
cd studio && bash scripts/render_chunks.sh out/<slug>/final_silent 1 2 <chunks...>     # scale 1 = 1080x1920
ffmpeg -v error -y -i out/<slug>/final_silent.mp4 -i ../sound/<slug>/audio/mix.wav -map 0:v:0 -map 1:a:0 \
       -c:v copy -c:a aac -b:a 256k -shortest out/<slug>/<slug>_final.mp4
PYTHONNOUSERSITE=1 ../$PY -s scripts/short_qa.py out/<slug>/<slug>_final.mp4 out/<slug>/qa
```
QA gates:
- 1080x1920, 30 fps, h264 + aac.
- Loudness -14 LUFS, true peak <= -2 dBTP (after AAC).
- No black, frozen or popped frames.
- Loop seam: the last frame equals frame 0, and the sound across the seam is clean.
- Captions on every word.

Then deliver:
- Hand over the file and a description that credits the sources.
- Update HANDOFF.md.
- Copy the finished short's code back into this repo if it should become the next worked example.

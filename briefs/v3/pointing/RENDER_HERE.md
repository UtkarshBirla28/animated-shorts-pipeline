# How to render "the trap" (pointing v4) HERE, on the owner's laptop (the render system)

Written by the DIRECTOR, 2026-11-20 22:30. Replaces `_handover/RENDER_ON_OTHER_PC.md` (written for carrying the
project to another PC; nothing is copied between PCs any more: every command below runs IN PLACE, in this folder).

- Project root `<ROOT>` = `C:/Users/utkar/Desktop/animated-shorts-studio` (Git Bash: `/c/Users/utkar/Desktop/animated-shorts-studio`).
- Graphics: GeForce GTX 1660 Ti (6 GB). RAM: **16 GB = ONE render at a time, never two.** Every render goes through
  the RAM token (`studio/scripts/ram_token.sh`, token file `/c/Users/utkar/Desktop/RAM_TOKEN.txt`); set
  `RAM_ME=<your role>`; stills go through the stills limiter (2 slots). Never leave a render or a temp bundle behind.
- Use **Git Bash** for every command (in PowerShell `bash` is WSL and breaks the token). Never play audio or video out
  loud: look at frames (ffmpeg contact sheets) and numbers.
- Quality: **DRAFT** for every test and for the draft film pass; **PREVIEW** only on the lead's word (the opening
  first, then the film); never final before the owner has seen and liked a preview.
- Measured speed here (draft, 2026-11-20 22:25, lab set): v01 1.8 s/frame, v02 2.7 s/frame (steady). The office PC's
  GT 740 did the steam shots at 0.11-0.14 s/frame, so the lab set is the slow one. Plan with about 2-3 s/frame in the
  lab until measured otherwise (the opening's 289 frames: about 10-13 minutes; the whole film at draft: 40-90 minutes,
  rendered SHOT BY SHOT so other owners get the token between calls).

Every command below starts from `<ROOT>` with:

    cd /c/Users/utkar/Desktop/animated-shorts-studio
    export RAM_ME=<your role> PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8
    PY="tools/.venv/Scripts/python.exe -s"

## 0. Before any render

| check | command | must say |
|---|---|---|
| types | `(cd studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json)` | nothing (exit 0) |
| the clock | `$PY briefs/v3/pointing/director/retime_v4.py --no-script` | `ALL CHECKS PASS` (38 shots, 2066 f = 68.87 s since the loop tail, 2026-11-21) |
| voice timing | `studio/src/videos3/pointing/v4/words.ts` | the real voice (installed) |
| opening sound | `sound/pointing/audio/opening_v4_mix.wav` | exists |
| film sound | `sound/pointing/audio/mix_v4.wav` | exists; 2066 f after SOUND re-mixes on the loop-tail clock (until then film_v4 pads the 2054-f mix with silence) |
| token free | `cat /c/Users/utkar/Desktop/RAM_TOKEN.txt` | "No such file" or your own role (else kit_render waits for it) |

## 1. THE OPENING (v01-v06, lines 1-3, the hook)

    $PY briefs/v3/pointing/director/opening_v4.py --quality=draft --no-copy      # a test (bug hunt)
    $PY briefs/v3/pointing/director/opening_v4.py --quality=preview              # ONLY on the lead's word

What it does: tsc, the clock (`probe_v4.mjs json`), kit_render of v01-v06 one shot after the other (`--conc 1`,
finished chunks reused), concat + the opening mix, then the audit.
- Output: `studio/out/pointing_v4/opening_v4.mp4`; without `--no-copy` also `pointing_preview/VIDEO_v4_opening.mp4`
  (only a PREVIEW goes there); `studio/out/pointing_v4/opening_audit/` = `strip_0-8s.jpg`, `go_run.jpg`,
  `opening_audit.json` (hook numbers + measured cuts), `gates_v4.md`, `compare/` (vs anti-theft, clown and the
  reference openings at 0.5 s steps + `compare_frame0.jpg`); shot chunks in `studio/out/pointing_v4/shots/<quality>/`.
- Audit only, no render: `$PY briefs/v3/pointing/director/opening_v4.py --clip=<an opening mp4>`.
- Look at the frames yourself (never play it): every 2nd frame of the Go run and the red cut, e.g.
  `ffmpeg -v error -i studio/out/pointing_v4/opening_v4.mp4 -vf "select='between(n,100,200)*not(mod(n,2))',scale=180:-1,tile=10x5" -frames:v 1 -fps_mode vfr <scratch>/go_run_sheet.jpg`

## 2. THE DRAFT FILM PASS (bug hunt; not shown to the owner)

    $PY briefs/v3/pointing/director/film_v4.py --quality=draft --no-copy

What it does: tsc + the clock; renders the 38 shots SHOT BY SHOT: one kit_render call per group of consecutive shots
of at most 240 frames (`--batch-frames=240`; `--batch-frames=1` = one shot per call), each call holds the RAM token
only while it renders and waits `--gap=70` s after it so a waiting owner can take the token; every call writes its
own console log `studio/out/pointing_v4/render_logs/render_draft_<time>_<n>.log` (with CAST's per-frame log:
`--props '{"castlog":1}' --keep-browser-logs`); `castlog_extract.py` merges them (newest row per frame) into
`studio/out/pointing_v4/castlog_v4_draft.json`; then the mux with `mix_v4.wav` and the audits.
- `--shots=v19,v20,...` limits the render; `--no-render` = mux + audits from the chunks already there;
  `--clip=<film mp4>` = audits only.
- If some shots have no current chunk (not built yet, or their render failed), the tool builds a PARTIAL film with
  BLACK frames of the right length for them (`studio/out/pointing_v4/pointing_v4_draft_PARTIAL_mix.mp4`) and prints
  which shots are black; the clock, the sound and the gates still line up; the black shots fail their gates (expected).
- Output: `studio/out/pointing_v4/pointing_v4_draft_mix.mp4` (or `..._PARTIAL_mix.mp4`),
  `studio/out/pointing_v4/film_audit/` = `cams_v4.json` (probe_cams_v4), `gates_v4/` (with the cast log), `qa_gates/`
  (loudness, peak, LRA, captions, seam, chroma; ignore its camera gate for v4), `compare/` (anti-theft, clown, 3
  reference Shorts every 2.5 s + frame 0), `storyboard.jpg` (2 frames per shot).
- READ THE RENDER LOGS for errors and new warnings: `grep -n -i -E "error|nan|warn|missing|not found|unresolved|origin" studio/out/pointing_v4/render_logs/render_draft_*.log | grep -v CASTLOG`.

## 3. THE PROPER PREVIEW (only when the lead says the film is ready)

    $PY briefs/v3/pointing/director/film_v4.py --quality=preview

Same as step 2 at preview quality; without `--no-copy` the film is copied to `pointing_preview/VIDEO_v4_full_preview.mp4`.
Before it: the lead's bug hunt on all 38 shots, a clean draft pass (step 2) and the motion audits.

## 4. One shot changed?

The same command again. Each shot chunk carries a fingerprint of its own code (set file + shared files + quality), so
only the changed shots render; a fix in one set re-renders only that set's shots. A whole shot for a test:
`(cd studio && node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp PointingV4Kit --quality draft --shots v06,v07 --conc 1 --out out/pointing_v4/)`;
a short clip: `... --frames 100-160` (not cached; `out/pointing_v4/test/`); stills: `... --stills 0,45,122`.

## 5. If something goes wrong

- A type error, or a red error from kit_render: stop, keep the log (`render_logs/`), tell the lead.
- "ram_token: held by '<role>' ... waiting": another owner renders; wait (never delete someone else's token unless it
  is older than 100 minutes: then it is stale and taken over by itself).
- Killed (power, Ctrl-C, low memory): run the same command again; finished chunks are kept; delete a leftover
  `*.part.mp4` in `studio/out/pointing_v4/shots/<quality>/` and any `_remotion-tmp` bundle folder.
- "the opening mix ... is missing" / "the film mix ... is missing": SOUND's file is not there.
- Final (upload) quality is not in this file on purpose.

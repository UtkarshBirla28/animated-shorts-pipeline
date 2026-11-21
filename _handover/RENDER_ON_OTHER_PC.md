# SUPERSEDED 2026-11-20 22:30: the laptop is the render system now; use `briefs/v3/pointing/RENDER_HERE.md`
# (same commands, run in place, no copying). This file is kept only as the record of the office-PC hand-over.

# How to render "the trap" (pointing v4) on your other PC

Written by the DIRECTOR. Kept up to date: read the date line before you start.
**Last update: 2026-11-20 evening (script LOCKED, REAL VOICE installed).** State: the clock is final on the real voice:
2054 frames = 68.47 s, 38 shots (none over 3.5 s), under the 70 s limit. The OPENING (shots v01-v06) is ready to render as soon as three things exist (see step 0).
The full film is NOT ready yet: the train and New York shots are still being built.

You do not need Claude on the other PC. You copy the folder, run one setup, paste the commands, and bring the results
back here. Nothing is uploaded anywhere. Nothing plays out loud.

---

## 0. Before you render: check these three files exist (on THIS PC first)

| what | file | who makes it |
|---|---|---|
| the real voice timing | `studio/src/videos3/pointing/v4/words.ts` (the real voice: INSTALLED) | VOICE |
| the opening sound | `sound/pointing/audio/opening_v4_mix.wav` | SOUND |
| the full film sound (only for step 3) | `sound/pointing/audio/mix_v4.wav` | SOUND |

If the lead says "the opening is ready to render", these exist. (The voice is in; only the two sound files may still
be missing.)

## 1. Copy the project to the other PC (every time the team changed something)

1. On THIS PC, zip the folder `C:\Users\Administrator\Desktop\POINTING_V4_HANDOVER\animated-shorts-studio`
   but LEAVE OUT these big folders (they are rebuilt or not needed):
   `studio\node_modules`, `tools\.venv`, `_remotion-tmp`, `studio\out\antitheft`, `studio\out\clown`, `studio\out\pointing`.
   (Keep `studio\out\pointing_v4`: it holds the finished shot pieces, so nothing renders twice.)
2. On the other PC, unzip it to any folder, for example `Desktop\pointing_render\animated-shorts-studio`.
   If an older copy is already there, unzip over it (replace files).

## 2. One-time setup on the other PC

Needs: Git for Windows (it brings **Git Bash**), Node 20 or 22, Python 3.12, ffmpeg on PATH, Google Chrome.
An NVIDIA graphics card makes it much faster (the old laptop's GTX 1660 Ti is fine).

In **PowerShell**, inside the project folder:

    powershell -ExecutionPolicy Bypass -File _handover\setup\SETUP_NEW_PC.ps1

It installs the packages (a few minutes) and ends with "ALL GOOD" or a short list of notes. Notes about the reference
Shorts, research notes or the ElevenLabs key do not matter for rendering. A type-check error DOES matter: stop and
tell me.

From here on, use **Git Bash** (not PowerShell) for every command. Open Git Bash in the project folder
(right-click the folder, "Open Git Bash here").

## 3. Render THE OPENING first (about 10-20 minutes)

Paste this in Git Bash, in the project folder:

    export RAM_ME=owner PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8
    tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/opening_v4.py --quality=preview

What it does: type check, the clock, renders shots v01-v06 at preview quality one at a time, joins them, puts the
opening sound under them, then makes the check pictures.

- Time: about 1.5-3 s per frame on a GTX 1660 Ti, 289 frames: about 8-15 minutes, plus 1-2 minutes of checks.
- If it stops (power, crash, Ctrl-C): just paste the same command again. Finished shots are kept and reused.
- Output:
  - `studio/out/pointing_v4/opening_v4.mp4` (the opening with sound) and a copy in `pointing_preview/VIDEO_v4_opening.mp4`
  - `studio/out/pointing_v4/opening_audit/` (strip pictures, the Go run, numbers, the comparison with the reference openings)
  - `studio/out/pointing_v4/shots/preview/` (one piece per shot)

**Bring back to this PC** (copy into the same places here, replace files):
`studio/out/pointing_v4/opening_v4.mp4`, the folder `studio/out/pointing_v4/opening_audit/`, the folder
`studio/out/pointing_v4/shots/preview/`, and `pointing_preview/VIDEO_v4_opening.mp4`.
Then tell the lead "opening is back". We audit it here (frames and numbers only) before anything else is rendered.

## 4. The FULL PREVIEW (only when the lead says the film is ready; about 1-1.5 hours)

Same Git Bash window, project folder:

    export RAM_ME=owner PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8
    tools/.venv/Scripts/python.exe -s briefs/v3/pointing/director/film_v4.py --quality=preview

What it does: type check, the clock, renders all 38 shots one at a time (`--conc 1`; a shot already rendered with
the same code is reused), joins them, puts the film sound under them (`sound/pointing/audio/mix_v4.wav`), then the
checks: our own gates, the comparison with anti-theft, clown and the reference Shorts, and a storyboard sheet.

The render also writes the characters' per-frame log (it runs kit_render with `--props '{"castlog":1}'
--keep-browser-logs`; the screen output goes to `studio/out/pointing_v4/render_logs/`), and turns it into
`studio/out/pointing_v4/castlog_v4_preview.json` with CAST's `castlog_extract.py`, so the gates can check arms and
hands from the same render. You do not type any of this: it is inside the one command above.
(Done by hand it would be: `cd studio`, `node scripts/kit_render.mjs --entry src/videos3/pointing/v4/index.ts --comp
PointingV4Kit --quality preview --shots all --conc 1 --props '{"castlog":1}' --keep-browser-logs --out out/pointing_v4/
> out/pointing_v4/render_logs/render_preview.log 2>&1`, then `cd ..` and
`tools/.venv/Scripts/python.exe -s studio/src/videos3/pointing/cast/bench/castlog_extract.py
studio/out/pointing_v4/render_logs/render_preview.log studio/out/pointing_v4/castlog_v4_preview.json`.)

- Time: 2,054 frames at 1.5-3 s per frame: about 50-100 minutes, plus about 10 minutes of checks.
- If it stops: paste the same command again. Finished shots are kept.
- If the comparison step says it found no reference Shorts: that is fine on that PC (we run it again here).
- Output:
  - `studio/out/pointing_v4/pointing_v4_preview_mix.mp4` (the film with sound), copy in
    `pointing_preview/VIDEO_v4_full_preview.mp4`
  - `studio/out/pointing_v4/film_audit/` (gates, comparison sheets, storyboard)

**Bring back to this PC**: `studio/out/pointing_v4/pointing_v4_preview_mix.mp4`, `studio/out/pointing_v4/pointing_v4_preview.mp4`,
the folders `studio/out/pointing_v4/film_audit/`, `studio/out/pointing_v4/render_logs/` and
`studio/out/pointing_v4/shots/preview/`, the file `studio/out/pointing_v4/castlog_v4_preview.json`, and
`pointing_preview/VIDEO_v4_full_preview.mp4`. Tell the lead "full preview is back".

## 5. Only one shot changed? (after the team fixes something)

Copy the project again (step 1), then the same command as before. Only the changed shots render again (each shot
piece has a fingerprint of its own code); the rest is reused. A fix to one set re-renders only that set's shots.

## 6. If something goes wrong

- "type check" errors, or a red error from `kit_render`: copy the last 30 lines of the Git Bash window into a text file
  in `pointing_preview/` (for example `render_error.txt`), bring it back, and tell the lead.
- "the opening mix ... is missing" / "the film mix ... is missing": the sound file from step 0 is not there yet.
- Do not use PowerShell for the render commands (its `bash` is a different program and breaks the render lock).
- The final (upload) render is NOT in this file on purpose: no final before you have seen and liked a preview.

# THIS PC NOW (lead #3, 2026-11-20 22:20): BACK ON THE OWNER'S LAPTOP, WHICH IS THE RENDER SYSTEM. READ THIS BLOCK FIRST.

The office PC's work (the V5 handover zip) is merged into this folder. Everything below this block was written for the
office PC: its ORDERS OF THE OWNER, the render-ready checklist and the house rules still hold; its paths and its
"no video renders here" lines do NOT.

- Project root `<ROOT>` = `C:/Users/utkar/Desktop/animated-shorts-studio` (Git Bash:
  `/c/Users/utkar/Desktop/animated-shorts-studio`). Reference Shorts: `C:/Users/utkar/Desktop/yt short videos`.
  Research notes: `C:/Users/utkar/research_notes` (the new Ricks Clips transcripts and narration stats are copied in).
- Graphics card: GeForce GTX 1660 Ti (6 GB), 16 GB RAM. RENDERS ARE DONE HERE NOW: draft quality for every test
  (stills, test clips, whole shots, the draft film pass); PREVIEW quality only when the lead says so (the opening
  first, then the film); never final. ONE video render at a time (`--conc 1`, the RAM token in
  `studio/scripts/ram_token.sh`, set `RAM_ME=<your role>`); stills through the stills limiter (2 slots). 16 GB is
  tight: never run two renders at once. Look at the frames of everything you render. Never leave a render or a temp
  bundle behind. Never play audio or video out loud.
- Use the Bash tool (Git Bash) for node / render / python. Python:
  `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 <ROOT>/tools/.venv/Scripts/python.exe -s ...`. Whisper has the GPU here.
- The ElevenLabs key is in `~/.secrets/elevenlabs_api_key` (the voice account; counter 34,974 / 40,000 at 19:25; stop
  38,500). Only VOICE and SOUND, only with the lead's word, logged with `pt_credits.py`.
- State: script LOCKED, real voice installed (2054 f = 68.47 s, 38 shots), sound mixed (`mix_v4.wav`,
  `opening_v4_mix.wav`), tsc 0 and `retime_v4.py --no-script` ALL CHECKS PASS on this PC (22:20). The PICTURES are not
  render-ready: continue from the "V5 HANDOVER" block at the top of your own notes file (your open list, in order).
- Order of work: (1) the OPENING v01-v06 render-ready first; the lead renders it and audits it next to the reference
  openings; (2) every owner finishes its open list with stills and draft clips; (3) the lead's bug hunt on all 38
  shots, the DRAFT film pass, motion audits next to anti-theft, clown and Ricks Clips, fixes; (4) the proper PREVIEW
  render; (5) the owner sees it. Nothing is called final before that.

## RENDER SPEED (pipeline, 00:30)
- Same commands, same pictures. kit_render / stills / render now share ONE Remotion bundle per source state
  (`_remotion-tmp/kitbundles/`, public/ hard-linked, no 567 MB copy; one builder, others wait) and kit_render's source
  hashing is one esbuild run (cached) instead of 9: shot hashes byte-identical, cached shot pieces stay valid.
- Stills: ONE stills slot while a video render holds the RAM token (two otherwise); queued calls print why. Measured
  under full load: bundle 82 s -> 46 s cold / ~1 s warm (but any src edit by anyone makes a new bundle), hashing 60 s ->
  12-20 s (0 s when nothing changed), still render 46+24 s -> 30+16 s. Old scripts kept as `scripts/*.bak_0029`.
- (01:55) Stills limiter is now FIRST COME FIRST SERVED (tickets in `out/.stills_slots/q`), waits up to 2 h (was 30 min),
  slots carry an owner file and are freed when their process dies. One Chrome serves all stills of a call (pixel-
  identical; saves ~10-15 s per extra still). Leaked Chrome profiles in `_remotion-tmp` are swept (408 -> ~80).
  Keep `--conc 1`: conc 2 changes lab pixels and is not faster. New option: `kit_render --dry-run` (which shots are cached).
- (02:50) OPT-IN `KIT_STILLS_PAGE=reuse` (env, also through `kit_render --stills`): one page for all stills of a call;
  10 lab stills 2.3-4.9 s each after the first (vs 11-33 s), but NOT bit-identical to the default (small light
  differences on heads / lamps, sheet `briefs/v3/pointing/pipeline/stills_page_reuse_vs_fresh.jpg`). Quick looks only;
  the default is unchanged.

---

# TEAM BRIEF for the office PC (lead #2, 2026-11-20 15:20). Every agent reads this before its own notes.

## OWNER'S ORDER 15:35: NO VIDEO RENDERS ON THIS PC
The owner renders on his other system. On this PC: story, code, voice, sound and everything else that needs no
render. Allowed here: the type check, probes with no render (`probe_v4.mjs`, `kit_render --info`), and a FEW single
DRAFT stills (about 10 s each) to check a pose, a layout or a colour. Not allowed here: any video clip (no
`opening_v4.py` render, no `--shots`, no `--frames`, no preview or final quality). The DIRECTOR keeps one file,
`_handover/RENDER_ON_OTHER_PC.md`, with the exact commands the owner runs on the other system and what to bring
back. Whatever can only be judged in motion goes on a "check in the render" list in your notes.

## OWNER (16:45): LOW-QUALITY RENDERS FOR TESTING AND FIXES ARE FINE
"u do render which are needed for your testing and fixes ... images whatever low quality render is fine so u can fix
bugs". So at DRAFT quality you may render whatever you need to find and fix bugs: stills, test clips, your whole
shots (`--shots v06,v07`), one render at a time (RAM token, `--conc 1`). This replaces the "about 60 frames" limit
below. Preview and final quality stay for the owner's other system. Look at the frames of everything you render.

## OWNER'S ORDER (evening): RENDER-READY MEANS NO BUGS; SMALL TEST RENDERS ARE ALLOWED
"when we are rendering i need things without any bugs ... check code again and again ... take SS or do some very
small small rendering if needed to check for some particular things". So:
- Besides stills you may now render SHORT DRAFT TEST CLIPS to check one particular thing in motion (a press, a
  snap, a flash, a cut, a door, the loop): `kit_render --quality draft --frames a-b`, at most about 60 frames a
  clip, one at a time (RAM token, `RAM_ME=<role>`, `--conc 1`), then LOOK at its frames (extract every 2nd frame
  with ffmpeg into a sheet). Never preview or final quality here, never the whole film without the lead's word.
- Your shots are "render-ready" only when: tsc 0; `retime_v4.py` checks pass; every one of your shots has been
  looked at on at least its first, middle and last frame AND on each held pose; the render log shows no error and
  no new warning for your set (missing texture, NaN, shader error, a cue that does not resolve, a character at the
  origin); nothing from the zero-tolerance list (hand over a face, single raised finger, see-through card, arm cut
  by the frame edge, stretched arm, pop, caption over the action, misspelt or unreadable board text).
- After your own pass, check again from a cold start (a fresh render of the stills, not cached ones), and write
  the list of frames you checked in your notes. The lead runs an independent bug hunt on every shot after you.

## THE VOICE KEY IS IN PLACE (15:55)
`~/.secrets/elevenlabs_api_key` is installed and is the right account (counter 32,745 / 40,000; stop at 38,500).
The "no paid call" rule below is lifted ONLY for VOICE and SOUND, inside the budgets the lead gave them, with
`pt_credits.py <label>` logged before and after every paid batch. The narrator's paragraph re-record waits for the
lead's script decision (v4 or the Ricks-style v5). Nobody else makes paid calls. Never print or copy the key.

## OWNER'S ORDER 15:50: STILLS ARE VERY IMPORTANT; THE STORY LIKE RICKS CLIPS
"take images and write fixes code": draft stills are not rationed any more. Work in a loop: render a draft still,
LOOK at it, fix the code, render again, until the picture is right. Still no video clips here.
The owner also wants the story and the narration to be like the reference channel Ricks Clips
(youtube.com/@RicksClips3000) and based on our own studies. A STORY agent is checking the locked narration against
it now; the narration may be revised (same places and pictures where possible). Build your shots so a re-time is
cheap: cues on words and events, nothing hard-coded to frame numbers.

## Where things are
- Project root `<ROOT>` = `C:\Users\Administrator\Desktop\POINTING_V4_HANDOVER\animated-shorts-studio`
  (Git Bash: `/c/Users/Administrator/Desktop/POINTING_V4_HANDOVER/animated-shorts-studio`). Notes that quote
  `C:\Users\utkar\Desktop\animated-shorts-studio` mean `<ROOT>`.
- Reference Shorts: `<ROOT>\..\yt short videos`. Research notes: `C:\Users\Administrator\research_notes`
  (`devenseenath/PLAYBOOK.md`, `ricksclips/`).
- Read: `_handover/HANDOVER.md`, the last block of `briefs/v3/pointing/LEAD_DECISIONS.md` (state of play, the
  LENGTH CUT), `sound/pointing/SCRIPT_v4.md`, `briefs/v3/pointing/SHOT_TABLE_v4.md`, `V4_STRUCTURE.md`, the rules
  at the end of `studio/out/pointing/benchmark/BENCHMARK_*.md` for your trade, then the "V4 HANDOVER" block at the
  top of your own notes file. Continue from its "next".

## This PC
- Use the **Bash tool (Git Bash)** for every node / render / python command. In PowerShell `bash` is WSL and breaks
  the RAM token and the stills limiter.
- Python: `PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 <ROOT>/tools/.venv/Scripts/python.exe -s ...`. Node 22, ffmpeg 9.
- Graphics card: GeForce GT 740 through ANGLE. It works (a draft still takes about 10 s plus the bundle; about
  0.4 s per draft frame). Build and check at DRAFT quality; preview quality only for a clip the lead asked for.
- 24 GB RAM, 6 cores. ONE video render at a time (`--conc 1`, the RAM token in `studio/scripts/ram_token.sh`; set
  `RAM_ME=<your role>`); stills through the stills limiter (2 slots). Never leave a render or a temp bundle behind.
- Whisper runs on the CPU here (slow but fine).
- **No ElevenLabs key on this PC yet. NO paid ElevenLabs call (voice, sound effects, music) by anyone** until the
  lead says the key is in place. `tools/el_api.py` would silently use an old, nearly empty account. Work with the
  takes and sound files that exist.

## The script changed at 15:20 (length cut)
Line 6 is cut; lines 13, 15, 19 are shorter (see SCRIPT_v4.md). Line ids are not renumbered. Shot v11 goes. The
DIRECTOR regenerates the clock and the shot table first; until then the shot table still shows the 08:25 text.

## Order of work
The OPENING first: shots v01-v05 (lines 1-3, about 8 s). Frame 0 must read in a quarter of a second: a big signal
lamp, a young woman at one big button. Nothing else is shown to the owner before the opening stands next to the
reference openings.

## House rules
- Save files whole and compiling. After each edit: `cd <ROOT>/studio && npx tsc --noEmit -p src/videos3/pointing/tsconfig.json`.
- Owners never edit each other's files; ask the lead (in your report) when you need a change in someone else's file.
- Never `npm install` (only `npm ci`). No secrets in files. Never commit, push or upload. Never play audio or video
  out loud (measure and look at frames instead).
- What fixes the owner's 1/10: people small or medium (a head at most a quarter of the frame height outside marked
  close-ups); held poses that snap; arms out under 10 % of frames; no hand across a face; nothing pointing at the
  lens; a camera that glides and then rests; at least three things moving in every shot; vivid, warm, bright colour
  (beige and grey under 15 % of the frame); no shot over 3.5 s.
- Look at your own rendered frames before you report. Say honestly what is good and what is not.
- Write two lines of notes ("done ... / next ...") at the top block of your notes file after each finished step, so
  a restart can continue. Put anything the owner could look at in `pointing_preview/` with a clear name.
- Your final report to the lead: short. What is done, what you checked on real frames or by measurement, what is not
  good yet, what you need from another owner, and where the files are.

# DRAFT FILM PASS v5 (DIRECTOR, 2026-11-21 03:23-04:05): the whole film on this laptop, draft quality

Command (cwd <ROOT>, Git Bash): `RAM_ME=director PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s
briefs/v3/pointing/director/film_v4.py --quality=draft --no-copy --fresh-logs --gap=20` (11 kit_render calls of whole
shots, each shot rendered from its own first frame; render 03:23-03:54, ~0.1-1.3 s/frame; audits to 04:05).
Not for the owner (a bug-hunt draft).

## Files
- film with sound: `studio/out/pointing_v4/pointing_v4_draft_mix.mp4` (2054 f, 68.47 s, mix_v4.wav); silent:
  `studio/out/pointing_v4/pointing_v4_draft.mp4`; per-shot pieces: `studio/out/pointing_v4/shots/draft/<id>_<hash>.mp4`.
- audits: `studio/out/pointing_v4/film_audit/` = `gates_v4/gates_v4.md` (+ .json), `qa_gates/gates.md`,
  `compare/compare_table.md` + `compare_sheet_1..4.jpg` + `compare_frame0.jpg`, `storyboard.jpg`, `cams_v4.json`.
- cast log: `studio/out/pointing_v4/castlog_v4_draft.json` (10,656 rows, 2006 of 2054 frames: the 48 without rows are
  v23b, his view through the window, no character in it = expected). Console logs: `studio/out/pointing_v4/render_logs/
  render_draft_20261121_*.log` (+ `film_pass_draft_full.out`).

## Logs
0 page errors, 0 NaN, 0 missing texture / 404, no character at the origin, no unresolved cue. One beat warning:
`[today] beat driver call: call point#2 -> clear#1: ... the hand is back by the ear only 3 f (leave >= 23 f between the
two word starts) (f 959-1071)` (CAST/TRAIN: the driver's call in v20 has no time to bring the hand to the ear).
Routine only: ANGLE X3595 shader warning, kit compile / GI notes.

## Gates (gates_v4 with the cast log + the camera probe)
| gate | value | result | carried by (owner) |
|---|---|---|---|
| hold frames | 18.0 % | PASS (8-20) | highest: v10 87 %, v05 66 %, v07 51 %, v09 47 %, v12 46 %, v06 44 % (LAB life in rests) |
| whole-frame motion | 41.1 % | PASS (< 60) | |
| every shot moves, then rests (camera) | 0 of 38 without | PASS | |
| one small thing > 2 s | 0 | PASS | |
| shot over 3.5 s | 0 | PASS | |
| arm out from the body | 22.1 % | FAIL (<= 16) | v18 78 f (91 %), v36 68 f (100 %), v20 65 f (98 %), v32 64 f (66 %), v14 43 f, v13 36 f, v35 26 f, v21 22 f, v31 20 f, v07 16 f, v12 16 f; by character lab_woman 7.1, ny_conductor 5.4, driver 4.0, lab_a/b 3.7, lab_c/d 3.1 % (LAB + CAST for v18 v36 v13 v14 v07 v12; TRAIN + CAST v20 v21; STATION v31 v32 v35) |
| hand inside its OWN face | 363 hand-frames | FAIL | v13 + v14 only: the side-on rows, every volunteer's pointing arm crosses his own face in profile (lab_a 142, lab_b 85, lab_d 89, lab_c 47) (CAST point aim + LAB row lens) |
| hand over ANOTHER face (2D) | 12,382 | WARN | hall crowds v06 v16 v15 v08 v09 v12 (no depth in the log: check behind-head cases on frames) |
| see-through card | 0 | PASS (but see the v36 bug below) | |
| face <= 1/4 height (outside close-ups) | 66 card-frames | FAIL | v29 official 30 f, v14 lab_c 23 f, v27 fireman 13 f (TRAIN v27 v29, LAB v14) |

qa_gates (sound + legacy look gates): loudness -14.0 LUFS PASS, true peak -2.9 dBTP PASS, LRA 1.6 WARN (1.7-3.5),
loop seam 14.72 WARN (> 10.66: v36 last frame vs frame 0 not a clean match: LAB), captions on words 91 % WARN (its
reader only looks in the house band: the 7 GO! pulses and the moved captions of v02 / v05 / v36a are not seen: NOT a
real miss). Its v3 per-shot camera / chroma / blur gates are not v4 targets (ignore, as agreed).

## Whole film next to ours and the references (compare_films, motion over the whole length)
| film | length | cuts | avg shot | moving area % | hold % | whole-frame % | chroma |
|---|---|---|---|---|---|---|---|
| pointing v4 draft | 68.47 | 36 | 1.85 | **6.9** | **17.1** | 42.0 | 36.9 |
| anti-theft | 83.87 | 5 | 13.98 | 7.8 | 15.6 | 34.5 | 30.3 |
| clown | 74.87 | 15 | 4.68 | 13.4 | 0.0 | 57.1 | 28.1 |
| Railroads (ref) | 65.22 | 19 | 3.26 | 17.0 | 7.1 | 56.7 | 35.6 |
| Ancient Jar (ref) | 64.9 | 6 | 9.26 | 13.0 | 11.8 | 55.0 | 26.9 |
| Job Nobody Wants (ref) | 60.56 | 15 | 3.78 | 13.2 | 4.9 | 63.3 | 28.8 |
Hold is inside the target and close to anti-theft; the MOVING AREA is half the references' (6.9 vs 13-17): the
picture moves in small places. That is the biggest gap left (LAB / TRAIN / STATION life and bigger character moves).

## Bugs seen on the rendered frames (sheets cut from the film itself)
1. CAST + LAB, v36 (f1986-2053, the LOOP): a pale flickering patch over the left side of her face / fringe, moving
   every frame: the researcher's white coat walking out behind her shows THROUGH her head card (a card-on-card
   transparency / sort problem; the cast-log see-through gate cannot see it). Zero-tolerance list. Check v18 and v01
   for the same when he walks in.
2. CAST + LAB, v13 / v14: the side-on rows point with an arm line drawn across their own faces (the own-face FAIL).
3. CAST + TRAIN, v20: the driver's point does not read (hand hidden under the window edge until f1034); his mouth opens
   only a little on "Signal" (f1026-1034): the J-cut needs a clearly open shout mouth.
4. LAB, v10b: the board reads "7 OF 12" at f475 before "5 OF 12" at f497 (wrong number on screen).
5. LAB, v18: her point arm is a thin line beside her head, no hand visible: the point does not read.
6. LAB, loop: v36's last frame vs frame 0 (qa seam 14.7): the lens is not yet on frame 0's at the last frame.
7. Arm-out 22 %: the shots above; the lead's ceiling is 16 % = about 120 frames to cut.
No stale or wrong character frame seen in the frames I checked after CAST's card speed change (every frame of v20-v21,
v36's last 14 frames, every 3rd of v13-v14 and v32, the storyboard): the bugs above are staging / sorting, not stale
drawings; the v36 patch should be re-checked by CAST with the speed change on and off.

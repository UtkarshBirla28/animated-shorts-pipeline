# Carry-over into fix round 1 (build round 1 cross-owner requests, settled by the LEAD at merge, 2026-11-14)

## AFTER AUDIT A1 (2026-11-14 ~03:30), applied by the LEAD before this fix round (do not redo)
- **RE-VOICE** (audit A1 VOICE list): new takes for the mystery line "But what if someone did look inside?" (voiced at
  narration level, fuller; it still ends with a natural rise-fall), the turn "Then, in November 1963..." (brisker) and
  the reveal "Inside... was mostly water." (now VOICED, low ~140 Hz, no whisper). Pauses lengthened (true silence, no
  stretch): ground|believed 0.58 s, inside?|Then 0.70, bust.|Lenders 0.45, Inside...|was 0.55, water.|You see 0.85,
  hatch,|it 0.45. **The film is now 2748 f (91.6 s).** words.ts / timeline.json / voicewarp (identity) regenerated;
  mix re-run. **The A1 audit cites the OLD clock (2712 f):** frames <= 880 unchanged; later frames moved about +5
  (880-1165), +3..+7 (1165-1240), +11..+14 (1240-1440), +17..+19 (1440-1530), +15..+36 (the reveal, 1530-1605), +31
  (1605-1935), +36/37 (1935-end). Per-word map: studio\out\saladoil\audit_A1\old_to_new_frames.json. Key everything to
  BEAT names / PW(), never to literal frames.
- **plan.ts (A1):** TK.tapeKneel [-0.36, 11, 4.8], tape4Top [-0.16, 11.52, 5.12], tape4In [-0.06, 10.62, 5.3] (shot 4: he
  kneels on the FAR side of the hatch, facing the camera over it, no rail post across him); TF.tino [-0.2, 0, 12.8]
  (shot 2: just inside the open gate, under the sign); TF.valve [-1.75, 1.2, 12.1] (the dripping valve now sits on a
  pipe riser at Tino's left, a pipe run going back to the hero tank: WORLD-EXT builds the riser + pipe, the drip falls to
  a small puddle beside Tino's feet); TF.lenderFile (4 lenders, x -1.4 / -0.5 / 0.4 / 1.3 at z 14.5) + TF.lenderFileTo
  (z 8.5) (shot 9: they walk in through the gate toward the tank; the old pair + climber stay as the far layer);
  BK.tinoChart [-1.05, 0, -1.95] (shot 6: Tino stands at the chart's right edge and brags as TINO'S OIL grows);
  TR.board.c y 3.7 and front traders at x -1.7 / +1.7 (shot 8); OF.slip z -0.72 (shot 15, out of the caption band).
- Old picture-event frames in this file below (stamps 929/959/990, valves 1986/2045/2075, paper 2252/2268, bottle 1675)
  are OLD-clock numbers: use the NEW frames in the "NEW FRAMES" line at the end of this file.

Applied by the LEAD at merge (do not redo):
- **Word onsets corrected** (measured on voice.wav): "$150 million..." ends 5.48 s, "against" starts 6.11 s (BEAT.against
  148 -> 183); '"90%' ends 25.95, "full!" starts 26.13 s (**BEAT.fullShout 768 -> 784**: anything keyed on fullShout now
  fires 16 f later; the ninety..shoutEnd window 756-796 is unchanged); "inside?" starts 40.24 s (BEAT.insideQ -> 1207/1208).
  words.ts / timeline.json regenerated; 2712 f total unchanged.
- story.ts SUN_WORLD = { 1: -63, 16: -63, 4: 30, 7: 30, 2: 40, 9: 40, 14: -55 } (camera-side tank walls sun-lit cream).
- story.ts S3A look bk([0.12, 1.1, -1.2]) (the whole OIL RECEIPT in frame); S13A look pr([-3.9, 1.75, -4.2]) (SATURDAY
  nearer centre); S15B look of([0.0, 1.62, -2.5]) (the smile above the captions); DOFS 15 CAFE = of([-0.2, 1.55, -5.27]).
- **Shot 4 has a new framing A2**: S4M = { pos tk([2.9, 12.6, 10.9]), look tk([0.5, 11.7, 6.5]), fov 42 }, ONE 40 f push
  from V(BEAT.inside1) + 6 (~707) to ~747 (settled ~9 f before "Ninety"), a medium of the tank man at the rail for the shout;
  then the 72 f crane down (R4_V = andInspector - 10) to the ground two-shot as before. cast.ts aims through camAt, so it follows.
- plan.ts TK.counter.c = [0.75, 12.05, 4.6]; CU.fish.z = 0.12.
- Merged check stills (all 16 shots): studio/out/saladoil/merge1/sheetA.jpg, sheetB.jpg. Loop seam frame 0 == 2711.

## Decisions on overlapping requests (binding)
- **ONE tape reel.** Shots 1/16: CHAR's reel on the tank man's belt wins. WORLD-EXT hides its 3D reel at TK.tapeTop in
  shots 1/16 and makes the world tape the same yellow #f2c230, 4-5 cm wide, so card tape and world tape read as one
  continuous tape. Shot 4: WORLD-EXT's 3D reel IN HIS HAND (BEAT.drop - 1 .. BEAT.shout - 8) stays; CHAR hides the belt
  reel during exactly that window (he unclipped it). Keep frame 0 == frame 2711 (check after the change).
- **Stamp:** the banker holds the stamp (CHAR). WORLD-INT hides the 3D rubber stamp in shots 3 and 5 and keeps the ink pad.
  Shot 3: the slam lands on BEAT.money (APPROVED mark at money + 2, as now). Shot 5: CHAR replaces the floor(VF/14)%2 cycle
  with stamp landings on frames 929.1, 959.4, 989.6 (the score's beats; AUDIO's thumps are there). WORLD-INT drops a fresh
  stamped receipt on the pile at each landing (no self-hopping stamp).
- **Cafe people (shot 15):** CHAR's animated cafe people (cast.ts, window plane) win. WORLD-INT removes its 6 cafe cards
  from sets_int.ts and the painted people from slCafeView, and paints the cafe floor / counter line in the bottom ~8 % of
  the picture so CHAR's people stand on it. The DOF rack target is now the painted cafe layer; CHAR's people sit at the
  window plane, so CHAR: move them to the cafe layer depth (office-local z -5.27, scaled to match) so the rack sharpens them.
- **Kitchen bottle (shot 11):** WORLD-INT moves the whole bottle with cast.ts's exported bottleShake(f) (x += dx, y += dy,
  rotation.z about the base). AUDIO keys the shake sound to bottleShake's real window (read cast.ts; put it in
  picture_events.json).
- **Pump room valves (shot 13):** WORLD-INT spins wheel k with cast.ts valveAngle(k, f). CHAR times the turns to start at
  ~1986, 2045 and 2075 (AUDIO's squeaks) or exports the frames; AUDIO then sets picture_events.json to the real frames.
- **Shot 4 climb sound:** CHAR lands the tank man's contacts at 628.5, 642, 655.5 (top flight), 669 (over the rim, "up"),
  676 / 682 (roof steps), 687 (kneel, drop + 6), 724 / 731 (stand + step), 741 (hand on the rail) where the animation
  allows; otherwise CHAR writes the real contact frames into its report and AUDIO puts them in picture_events.json
  (names climb_4, roof_4, stand_4, rail_4).

## WORLD-EXT
- The items above (reel, tape colour / width). Keep the dawn harbour plane and the rim-lit skyline below ~2.0 linear in
  their brightest channel (POST: the stub harbour strip passed the 2.2 bloom key and bloomed flat across shot 1).
- The newspaper spin-in: first seen 2252, lands 2268 (AUDIO's whoosh). The plumb weight touches the oil ~705. A ship must be
  visible in the shot-1 harbour ~185 (AUDIO's far horn) or tell AUDIO to set horn_1 null.

## WORLD-INT
- **Exterior light presets** (dawn_gold, noon, late, storm, street_grey) were tuned only on the stub sets: retune them
  now on the real merged exteriors (shots 1, 2, 4, 7, 9, 14, 16). Render your own stills of those shots.
- Pump room: warmer (real amber lamp pools, copper / rust pipes, a warm pool across the workers' backs; they read pure
  blue). Merge stills show it now reads lavender-pink: aim for a night blue with clearly warm pools.
- Bank pre-grade ~0.5 stop dark, street ~+0.4 stop (POST measurement on stubs; re-check with POST's grade in place).
- Practical bulbs: MeshBasicMaterial, opaque, radius < 0.3 m, brightest channel 2-4; windows / boards / paper <= 1.3.
- Cutaway oil top: the same rich gold as the tank-top oil (~#F2B62E), not pale lemon.

## CHAR
- The items above (belt reel window, stamp landings, cafe depth, valve turns, climb contacts). fullShout moved to 784.
- Kitchen (shot 11) in the merge still at 1700: the gripping hand reads as a big dark glove with a red sleeve and covers
  the bottle; make it a smaller, friendlier cartoon hand (skin / white glove), gripping the bottle's neck so the oil layer
  stays visible.

## POST
- Re-measure every grade's exposure on the MERGED sets (your numbers came from stubs): bank, street, trading, pump night.
- Captions: the onset fixes are now in words.ts itself; remove the ONSET_FIX overrides if they double-correct.

## AUDIO
- After CHAR / WORLD-INT / WORLD-EXT report their real frames, update picture_events.json (climb_4, stamps, bottle
  shake, valves, paper spin, plunk 705) and re-run mix.py. fullShout moved to 784: re-check the shout echo window.
- Do NOT add transition whooshes.

## NEW FRAMES (current 2748 f clock, from sound/saladoil/audio/picture_events_used.json after the re-voice mix)
stamp_3 490 (on 'money'); climb_4 628.5 / 642 / 655.5; roof_4 676 / 682; plunk_4 705; stand_4 724 / 731; rail_4 741
(shot 4 frames before 880 did not move); **stamps_5 933.1 / 963.4 / 993.6** (the score's beats: CHAR lands the stamps
here); shake_11 1706 (ever + 4); **valves_13 2023 / 2085 / 2113** (squeaks); spin_14 2290 -> land 2306 (cameOut-based);
flaps_1 75..103 (AUDIO moves it when WORLD-EXT re-times the roll). If your code keys these to BEAT expressions they move
by themselves; AUDIO re-reads the real picture frames after the merge.

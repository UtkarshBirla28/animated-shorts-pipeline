# Carryover into fix round 8 (from the round-7 reports, not yet done)

Applied by the LEAD at the round-7 merge (05:00):
- sets_ext poseHeap14: v0 = toNew(PW(8, "year")) + 23. The heap now lands in the pause after 'every year...' (~video 550), on CAM's HELD heap wide.
- story.ts:
  - SHOTS[3].relight[0] dur 18 (WORLD-EXT).
  - SUN_WORLD[15] -128 (WORLD-INT: low dusk key behind-left of the tourist).
- CAM's 4 straight cuts inside shots 8 / 9 / 10 / 12 (video 1090 / 1256 / 1456 / 1964) are APPROVED. The user's calm/readable direction beats the no-hard-cut rule.

## CAM
- Shot 4: CHAR asked for the couple two-shot held to >= video 470 (the 'Warning!' reaction), and for the PIECE4 glint ([-0.98, 0.35, 0.2], ~video 612) in frame above the caption.
- Shot 6: stop the crane-up ~60 px earlier, so her thoughtful 3/4 face (from ~859) stays in frame to 'steal?' + 6 (~902).
- Shot 9: hold the Sign B MS through reader B's pocket (lift ~1311, pocket 1313-1317, pats 1321/1327). The pull-out starts >= 1330.
- Shot 10: keep the crowd medium until >= V(BEAT.pct8) + 4 (~1521). The crowd gag: chips up 1485-1497, pocket 1499-1503, pats 1505/1511, unison look-away 1514-1526.
- Shot 11: aim ~0.25 m higher in ~1681-1840, so the EVERYONE ELSE label and the 7.92 % note stay whole.
- Shot 6 mystery: POST's dip ramps over 50 video f from V(BEAT.but) + 6. Land the slow push in that window.
- Shot 4: the heap shake fires only if TH.heap14 is in frame on its landing (now ~550).

## CHAR
- Shot 4: in the heap wide (video ~550-633) only TH.pock[1] is in frame. Give HIM the 3-beat pocket gag on 'one small piece at a time' (look around ~556-572, slip it in 574-590, guilty pat + grin 592-612). pock[0] / pock[2] are off-frame.
- First frames after the 4 cuts are settled (no pose pops for 6 f): reader B @1256, the Sign B crowd @1456, the honest student @1964. The raven's A->B glide must not cross the 1256 cut: start it after 1258, or land it by ~1262.
- Shot 10: two rows ~0.6 m apart, the middle three crouch ~0.5 m on the pocket beat. The pictogram stays >= 80 px above their heads.
- Shot 12: a seated pupil at ~CL + [-1.55, 0, -0.25] doing the whisper/copy on 'cheated.' (OTS12C framing).
- Shot 1: anchor the paperclip bubble ~0.15 m higher / right. It covers ONE SMALL PIECE / AT A TIME. on the new board.
- Shot 6: with the lens behind her, the 'thoughtful' face must be a lost-profile head turn toward camera-left on 'honest'.
- Dusk card rim (WORLD-INT): cardshade mode 2 rimW 3.2 -> 4.0 px, #FFB070, on the key (screen-left) side. Re-check after SUN_WORLD[15] = -128.
- Shot 11: if the visitor's stop spot or size changes, tell WORLD-INT (MAN11_HEAD).

## WORLD-EXT
- The TH.flip counter shows '14 TONS/YEAR' in shot 15 but '- -' in shot 16, so it pops in the 15->16 dissolve. Show '- -' in shot 15's last ~25 video f. Frame 0 needs '- -'.
- Shot 4 heap dust puffs within ~1 m of the lens show as big white discs: keep them >= 2.5 m from the lens, or cap their opacity at 0.4 when nearer than 2 m.
- Export HEAP14_LAND_V / STAMP_F for POST.
- Shot 10 gag: a paper receipt '-7.92 %' curls out of Sign B's LED box on the cha-ching (~video 1517).
- Heap wide foreground (TH z +6.5..+8.5): chips rolling toward the lens after the landing, a dust skirt, a sage clump.
- Shot 8->9: the old panel at SWAP_LEAN ghosts through reader A in the dissolve. Hide/slide it behind the post line from SHOTS[7].b - 6.
- Shot 7: the wren hop h1 = BEAT.professor - 6, so the hop is on screen.

## WORLD-INT
- Shot 12: draw the full stop of 'HALF THIS CLASS CHEATED.' ~8 video f later, so the teacher's glare is a held 20 f beat (CHAR turns her front).
- Shot 6 mystery light: an exposure drop of ~12-15 % across the question (a cloud shadow over the board from 'honest' to 'steal?', or a darker 'late').
- Shot 14: keep the BAD LUCK EVER SINCE note above the caption band in the pile MS (the BAIT insert is gone).
- Do not lift the dim key / ambient while POST's dim grade compensates (see POST).

## POST
- Shot 6: a gentle vignette (~-8 % corners) easing in from toV(BEAT.honest) - 4 over 26 f, held to the 6->7 dissolve.
- Remove the obsolete shot-1 dive shutter hack (~line 922).
- The 6->7 and 15->16 dissolves are clamped at ~7-8 f by the shot lifetimes (s.a +- 4 picture f). Leave them unless CAM / CHAR / WORLD extend those lifetimes.
- Re-measure:
  - the trailhead plaza (#D49771, C 34);
  - the stamp sole (sunset multiply);
  - the dim board (soft multiply #CCC4B8).

## AUDIO
- The whip / dive / punch whooshes have no picture any more: mix.py's camera probe re-check must drop them.
- Optional pops on the two comic snaps ('now' ~775, 'twice' ~2473).
- New picture cues:
  - the shot-11 panel slides in from the right and lands with a chalk puff;
  - the flip counter on the video clock;
  - the shot-5 tumbleweed;
  - the cast events from CHAR's report (rA7_fix_reports.txt).
- Re-run audio_cast_probe on the merged film.
- Optional register-bell visual: POST/WORLD-EXT double-flash the 7.92 % digits.

## LEAD / VOICE
- Whisper p is low (dry take) on '"Warning!' (quote mark), 'want' (29.34 s, 0.03), '"Please' (quote mark), 'other.' (56.19 s, heard as 'Here,').
  - 'want' and 'other.' are real candidates for a listen / re-take if A8 flags them.
  - Prefer a re-take of beat 9 only if the auditors say 'each other.' is unclear.

# Carry-over into fix round 2 (answers audit A2 of preview2; settled by the LEAD, 2026-11-14)

## AFTER AUDIT A2 (shots 6.8, film 7.6, sound 7.8), applied by the LEAD before this round (do not redo)
- **CLOCK +13 f: the film is now 2761 f (92.03 s).** Two silence inserts in the installed voice (no re-take, no
  stretch; every hand-fixed onset kept): 'more.|And' 0.19 -> 0.38 s (the repeat lands: +6 f from ~967) and
  'out?|The' 0.26 -> 0.50 s (the bottle holds before the rise: +13 f from ~1752). words.ts / voicewarp (identity,
  VOICE_TOTAL 2761) / timeline.json regenerated. **The A2 audit cites the OLD 2748 f clock:** frames <= 967 unchanged,
  967-1752 +6, after 1752 +13; per word: studio\out\saladoil\audit_A2\old_to_new_frames.json. Key everything to BEAT.
- **Voice re-takes tried and rejected:** 6 untagged variants each of the hook (b01) and 'Then, in November...' (b07)
  at speed 1.08-1.15: eleven_v4 ignores speed, every hook take was LONGER (7.9-8.2 s vs 7.84 s) and every b07 longer
  (10 s vs 8.96 s). The current takes stay. 'inside?' stays (30+ takes never rose). So the remaining VOICE items go to
  AUDIO as rides (below).
- **plan.ts (A2):** PR.valves y 1.2 -> 0.62 (the wheels sit BELOW the blob's path: top rim ~1.26 m < its feet 1.42 m;
  WORLD-INT mounts each wheel on a short stem from the lower pipe run; CHAR's workers pull at that height);
  PR.workers x -2.65 / +1.85 (0.35 m outside each wheel, a 3/4 back view); OF.slip x 0.28 -> 0.53 (the BUY slip clear
  of the centred caption box; CAM re-aims S15B so the desk props sit above the caption band).

## Decisions on A2 items that cross owners (binding)
- **Shot 9, 'Lenders finally checked the tanks.' (A2 P1):** the CHECK must be visible. The far climber on the No. 7
  stair is the hero of that line: CAM frames the stair foot at screen x 0.55-0.70 W; CHAR starts him at the foot at
  BEAT.lenders - 6, makes him >= 12 % of frame height and clearly ABOVE the umbrella line (screen y < 0.46 H) by
  BEAT.checked, a flashlight aimed up at the roof; CHAR routes the walking file toward the drums at screen right (not
  into the stair foot) so nothing occludes him. WORLD-EXT moves / adds what the stair needs (TF.ladder may move:
  ask in lead_requests with the value).
- **Shot 13 valves:** the new PR.valves / PR.workers above; zero blob / wheel overlap across 2087-2217 (new clock).
- **Shot 15 props in the caption band:** OF.slip moved (above); CAM re-aims S15B (look y ~1.27, pos y ~1.46) and S15W
  (look x ~-0.12) so neither the BUY slip nor the headline ever sits in y 1280-1440 at 1080 under a caption.
- **Shot 2 Tino size:** do NOT move TF.tino (the valve riser is built beside him). CAM tightens S2A (sign still whole) so
  Tino is ~19-21 % of the frame height on 'Meet Tino'; CHAR gives the ta-da an overshoot + settle and small bounces on
  'Tino' / 'De Angelis'.
- **AUDIO voice rides (instead of re-takes):** +2 dB on 'top.', 'America.' and the second 'crashed.' (the bwomp body
  3 f later or -3 dB under the word); +1.5 dB on 'mostly water.' in the hook; 'And more.' keeps a +1.5..2 dB ride
  (the new 0.38 s beat before it does part of the escalation); the pencil tick on the real tick frames (CHAR's);
  the 2470 cha-ching needs its visible source (the BUY slip written on 'bought') or moves onto it.
- Dissolves stay 10-12 f. The shot-4 hard cut stays.

## (from the fix-1 merge)

## Applied by the LEAD at the fix-1 merge (do not redo)
- plan.ts: TK.counter.c [0.45, 12.3, 3.35] (not visible at P0 / shot 16; posts grow from the roof to c.y + 0.1 by
  themselves); TF.notice [1.15, 3.0, 16.07] and sets_ext NOTICE = TF.notice (no extra offset); BK.cashTo
  [0.78, 0.785, -0.55]; CU.fish.y 4.7 (cast.ts FISH_Y = CU.fish.y); TR.tino [-0.55, 0, 0.95] (cast.ts TR_TINO = TR.tino);
  ST.people[0] [1.25, 0, -2.45] (= CHAR's READER).
- **Lightning, ONE schedule (binding): POST's FLASHES** = SHOTS[8].a - 7 (shots 8 + 9), BEAT.bust - 2 (the big one, on
  the BANKRUPT slap), BEAT.checked - 8 (far). sets_ext.ts flashAt now uses the same three frames (bolt sprite + storm
  deck / haze lift at x0.55, because POST already lifts the whole frame). AUDIO lightning_9 = [[1400,0],[1429,0],[1482,1]].
- Shot 4 tape: the world reel, tape and bob show from BEAT.drop + 12 (he reaches the far-side kneel at drop + 13), the
  tape pays out to PLUNK = BEAT.drop + 30; cast.ts REEL4_A = BEAT.drop + 12.
- Shot 4 has ONE hard cut at 804 (CAM): accepted. AUDIO's yard bed swaps on the cut (picture_events.json yard_4 [801, 809]).
- Shot 7: the oil ring starts at BL = BEAT.insideQEnd (one pop, with CHAR's bubble).
- Shot 1: the LOANS flaps roll from BEAT.million + 8 and land by ~135 (the crane has settled).
- sets_int.ts: the shot-3 cash rides cast.ts cashSlide (x and z); the shot-6 easel's leaning pointer is removed
  (Tino holds his own). The shot-6 clock already steps every whole second (clock_6 is right).
- sound/saladoil/audio/picture_events.json (LEAD overrides): vendor_14 null (no vendor), pigeons_14 "crashed2+2" (the
  board pigeon flies at crashed2 + 2), blub_10 "waterEnd+3" (CHAR's blub), cafe_life_15 on CHAR's idle loops
  (laugh 2551, card 2554, cup 2572). AUDIO: keep these unless the picture changes.
- Loop seam on the merge: frame 0 == frame 2747 (pixel-identical, merge2/m_0 vs m_2747).
- Merged stills: studio/out/saladoil/merge2/sheetA.jpg, sheetB.jpg, sheetC.jpg.

## Open cross-owner requests from fix round 1 (do them this round)
- **WORLD-INT lights.ts storm** (WORLD-EXT's numbers for a saturated blue storm on the real set): lit [0.82, 0.92, 1.12],
  shade [0.34, 0.44, 0.78], fog '#6f80a8', sky.c ['#8f9cb8','#7f8eae','#6a7aa0','#56678f','#45557d'], look.sat 1.05.
- **WORLD-EXT sets_ext.ts storm** (WORLD-INT): darken the wet albedo (ground x0.65, lower 3 m of the hero tank x0.8 with a
  vertical gloss sheen) so shot 9 reaches mid-frame L* 40-46. **Late (shot 7):** oil sheen emissive ~1.15.
- **WORLD-INT noon** (shots 2, 4): sky #1F80F7 (top) -> #98C0F3 (horizon), tank-wall shade toward #6E73B8 (25-30 % darker);
  POST measured noon at L* 67-72 against 58-66.
- **WORLD-INT dawn** (shots 1 / 16): sky #FBC48E (horizon) -> #F7A3B7 -> #8FA6E8 (zenith). POST: check that the golden
  grade does not push the P0 roof back to orange (the set applies a cool steel tint under dawn_gold / late). Frame 0 must
  still equal the last frame.
- **Kitchen (shot 11):** the bottle oil must be the rich #F7B733 (not #FFE4A1 cream) so POST's gold key reads.
- **WORLD-INT shot 6:** chart titles ('ALL US OIL' / 'TINO'S OIL') ~20 % bigger (cap height >= 0.1 m). **Shot 12:** the
  LOOKS FULL board ~20 % bigger (0.72 m wide); in the merge still at 1990 ('full.') it is CROPPED off the top of frame:
  CAM keep it fully in frame and readable from ~1975 to the end of shot 12.
- **CHAR shot 10 fish:** hidden behind the murk until ~BEAT.mostly + 10, then swims in above the caption band (y < 1320 at
  1080x1920); a startled 6 f flip on the slosh. Shot 12: fade / swim the fish in on 'add' (no pop).
- **POST:** re-measure every grade on the merged pre-grade (pump_night, storm, bank_warm, kitchen, trading, noon) after
  the light changes; trading chroma was 17.5 (< 20).
- **WORLD-EXT shot 1:** keep the tug / freighter and its smoke plume clearly in frame 165-198 (AUDIO's horn_1).
- **CAM:** match dissolves 5->6, 7->8, 12->13 not done; shot 13 blob small and worker heads cross it (2105-2112,
  2175-2195); shot 14 headline poster ~25 % smaller than before (letters ~45 px).

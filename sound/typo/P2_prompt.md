PHASE P2: VOICE TOUCH-UPS + TIMELINE + CAMERAS + ALL SETS. First read sound/typo/OPENCODE_BRIEF.md and everything it lists under "Read first", then sound/typo/reports/P1.md (what phase 1 built).

0. Voice (coordinator decisions, binding):
   a. CUT the line "Each one costs around 600,000 yen." from the assembled voice (keep a natural ~0.3 s gap between "shares." and "At Mizuho"), shift every later word / phrase, never stretch. Target ~84 s.
   b. The boss's "Cancel it!" gets its OWN voice: pick an older, gruffer male voice from the ElevenLabs library (not James), eleven_v4, 4 shouted takes, best one by the same checks, spliced in at the same spot with the same surrounding pauses (<= 300 credits). Keep James's narration untouched.
   c. Regenerate words.json / phrases.json / words.ts; export the timeline (studio/scripts/export_timeline.mjs) and keep VOICE_TOTAL == the timeline total (voice_warp --identity as in saladoil).
1. story.ts: a BEAT map keyed to words (PW / PWE, never literal frames) and SHOTS for every beat in SCRIPT.md (HOOK v2 for 0-6 s), about 13-15 shots, dissolves 10-12 f, the LAST shot ends on the exact frame-0 framing (finger over the glowing ENTER key). One camera per shot following the craft rules (holds 2.5-4 s with a creep, slow bell glides <= 45 px/f; the hook pull-out may be the fastest move, still <= 45 px/f). Use saladoil's camera helpers (fr, cruise, logGlide, via, dofAt).
2. SETS (the main work of this phase): build every environment in SCRIPT.md, in the channel's painted-3D-with-ink look, with depth (fore / mid / back), life (small loops: monitor flicker, ticker scroll, steam from tea, ceiling fan, traffic), and the right light per beat:
   - the hero KEYBOARD with a big glowing ENTER key + the blue ORDER SCREEN (QTY / PRICE boxes, readable digits) - it opens and closes the film, make it beautiful;
   - the Mizuho trading room (2005: rows of desks, 2-4 flat monitors each, curly-cord phones, paper stacks, wall clock ~9:27, window with Tokyo towers; cool blue light + warm desk lamps; red warning pools in the cancel beat; low orange evening light for the bill);
   - the Tokyo street (grey towers, bare December cherry trees, a white taxi, salarymen) gliding into the exchange LOBBY with a big round glass TICKER WALL of scrolling green / red numbers and a FLOOR bar for the crash;
   - the museum pedestal with one tidy 14,500 stack + room for the 41-stack tower;
   - the small tidy apartment (three monitors, cup noodle) and the buyers montage windows (office, grandma's room, internet cafe);
   - the warm chalky community-hall NOTICE BOARD set (cork board, tear-off tabs);
   - the pale wood-panelled Tokyo COURTROOM (three judges' bench, evidence table, no gavel).
   Reuse saladoil's sets code structure, paint.ts / shade.ts / lights.ts patterns and toon look; replace its oil-farm content. Plain-text names only, no logos.
3. Characters: place simple posed characters (the toon card system from saladoil cast.ts / toon.ts) where each shot needs them, so the framings are right. Full acting is P3, but faces must already be outside the caption band.
4. Check: tsc clean; render stills (2 per shot) at 0.5 in batches; contact sheet studio/out/typo/P2_sheet.jpg; loop seam frame 0 == last frame. Fix what looks empty, flat or unreadable before you report.
5. Report P2 (sound/typo/reports/P2.md).

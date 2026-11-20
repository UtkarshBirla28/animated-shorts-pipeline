# Final audit: CRAFT, LOOK AND DEFECTS (independent)

Film: `studio/out/pointing/pointing_FINAL_1080x1920.mp4` (1080x1920, 30 fps, 1913 f, 63.77 s).
Auditor key: `craft`. Scratch: `studio/out/pointing/final_audit/craft/`
(`frames/` 5 full-size frames per shot + `sXX_keys.jpg` montages + `pair_*.jpg`; `strips/sXX_strip.jpg` every 4th
frame per shot; `thumbs/` 270 px phone-size key frames + `_phone_size_all_270.jpg`; `zoom/` defect crops;
`framestats.json` per-frame L*/a*/b*/diff; `whisper.json` + `whisper_run.py` / `whisper_clip.py`).
Nothing was played out loud. No project file was edited.

**Verdict: POLISH THEN UPLOAD.** Score 62/100. The story reads, the plant/payoff framings work, the look is
mostly warm and bright. But the last 0.3 s before the loop shows a one-finger-up hand in front of his face that
reads as a middle finger, the hook arm is a handless plank for a second, the boy's payoff call is hidden behind the
phone, and the dare's replay is buried under the bed. Those are visible to a normal viewer and sit on the hook,
the payoff and the loop.

---

## 1. Measurements

### 1.1 Exposure and colour per shot (Lab at 270x480, mean over the shot)

| shot | L* | a* | b* | jump in L* at the cut | note |
|---|---|---|---|---|---|
| s01 | 56.4 | 5.3 | 17.8 | (seam: last 57.9 vs first 57.6) | pale beige-on-beige frame 0; chroma 24.1 (top-6 frame-0 median 33.6) |
| s02 | 51.0 | 6.4 | 14.4 | -3.6 | |
| **s03** | **38.5** | 5.0 | 11.9 | **-13.2** | cab dark, black console |
| s03b | 41.6 | 5.4 | 9.8 | -2.9 | dark-ish, cool |
| s04 | 57.7 | 6.4 | 20.1 | **+14.5** | |
| s05 | 52.5 | 4.8 | 11.3 | -5.1 | grey-white car, chroma 16.5 |
| s06 | 58.9 | 4.0 | 16.4 | +7.6 | |
| s07 | 52.0 | 5.4 | 17.3 | -3.8 | |
| s08 | 60.3 | 4.1 | 22.3 | +2.5 | |
| **s09** | 55.8 | 3.4 | **3.7** | +1.6 | blue-sky cool, clashes with warm s08/s10 |
| s10 | 52.0 | 4.6 | 15.2 | -5.4 | |
| s11 | 50.5 | 3.3 | 17.5 | -1.7 | |
| s12 | 61.0 | 3.0 | 22.2 | +7.0 | |
| s13 | 49.5 | 5.0 | 8.0 | -9.6 | cool |
| s14 | 54.2 | 3.4 | 18.9 | +2.7 | |
| s15 | 49.5 | 8.9 | 19.3 | -6.5 | |
| s16a | 51.3 | 4.7 | 8.5 | +8.5 | cool |
| s16b | 58.0 | 7.3 | 12.8 | +4.6 | hazy, washed train top right (gate shadow chroma 30.7) |
| s17 | 61.3 | 3.4 | 22.0 | -0.7 | bright, warm (lab fixed in light, not in detail) |
| s18 | 56.8 | 5.4 | 15.0 | -3.7 | |
| s19 | 63.0 | 4.2 | 20.6 | +5.0 | |
| **s20** | 59.7 | 8.3 | **27.6** | -1.4 | orange cast (gate chroma 30.6, L* 60.3) |
| **s21** | **38.0** | 3.7 | 11.0 | **-13.5** | cab dark again |
| **s22** | 54.9 | 4.1 | **3.6** | **+16.8** | blue-sky cool |
| s23 | 55.0 | 4.5 | 15.9 | -2.5 | |
| s24 | 58.3 | 5.6 | 17.7 | +4.0 | |

The four exposure jumps a viewer will feel: s02->s03 (-13), s03b->s04 (+14.5), s20->s21 (-13.5), s21->s22 (+16.8).
The cab shots s03/s21 are still the darkest shots in the film, as before. The lab (s17/s19) is now bright and warm.
s09/s22 (the plant and the payoff) are the two coolest shots (b* 3.6-3.7 vs 15-22 around them).

### 1.2 The automatic gates of this final (read, not re-run)
13 FAIL / 10 WARN. Camera under 0.5 %/f: s13 0.49, s15 0.38, s21 0.46, s24 0.44. Life under 0.12: s16a 0.10.
"busy" over 7.5 in 14 shots. Blur over 0.08 in 15 shots (s03 0.145, s21 0.137). Film-level: loudness -14.0 LUFS,
TP -2.8, LRA 3.5, loop seam pass, captions 100 %.

### 1.3 Hook counts (from words.json)
Voice at 0.07 s. 10 words by 3.0 s ("All" 2.78), 17 by 5.0 s ("finger" 4.69). Longest gap 0-5 s: 0.15 s.
Cuts: same-axis cut-in at f51 (1.70 s), cut 1 at f81 (2.70 s), cut 2 at f140 (4.67 s). All hook number rules pass.

### 1.4 Sound levels (RMS, mono 16 kHz)
| span | dBFS |
|---|---|
| narrator, "His mind was on his phone." 41.27-42.70 | -15.4 |
| **phone replay "What's a finger gonna do?" 42.72-43.85** | **-27.8** (12.4 dB under the narrator; script: about 8 dB) |
| music/air bed alone 34.0-36.3 | -28.7 |
| narrator "Japan's railway lab tested it." | -15.8 |
| kid "Bag... check!" | -19.0 |
| tourist "Bag... gone." | -19.9 (4.5 dB under; script allows 6) |

The phone replay sits at the level of the bed, so on a phone speaker it is a murmur.

---

## 2. Whisper check (faster-whisper small.en, CPU, int8, beam 5)

Full pass, then each doubtful span again on its own (`whisper_clip.py`).

| time | script | heard (full pass) | heard (isolated) | verdict |
|---|---|---|---|---|
| 21.97-23.4 | DOORS... CLOSED! (plant) | "Doors." / "**Clothes.**" | "Doors closed." p0.48 | weak final /d/: soft but understandable in context |
| 27.1-28.7 | STAY. BE RIGHT BACK. | "Stay. Be right back." | "Stay be(p0.11) right back" | "be" is swallowed; minor |
| **42.72-43.85** | WHAT'S A FINGER GONNA DO? (phone replay) | **not heard at all** | "What's **the** finger gonna do?" p0.52-0.98 | **buried: -27.8 dBFS. Must fix (SOUND)** |
| 57.0-63.7 | DOORS... CLOSED! / BAG... CHECK! / bag... gone. | "Doors. closed(p0.08) bag check(p0.13) bag(0.41) gone" | "Doors. Closed." 0.71; "Bag, check!" 0.90/0.92; "Bag gone" 0.54/0.88 | heard right in isolation; dense mix makes the full pass shaky; OK |

Every other line was heard exactly as written (hook, "Signal! Green!", "He's pointing at nothing!", the thousand
people line, the finger-and-shout line, both stop lines, "His suitcase tries to get off", "And the boy's finger
saves it", "Bad suitcase", "What's a finger gonna do?" (t03), "It stays", "Vending machine, check", "This kid
gets it", "You see, his eyes looked right at it. His mind was on his phone.", "Japan's railway lab tested it.",
the lab sentence, "about one", "A finger and a shout drag your mind back.").

---

## 3. Shot by shot

Life = the gate's strong-own-motion figure; count = things I saw moving in the strip.

| shot | frames | score | one line |
|---|---|---|---|
| s01 | 0-81 | 6 | Frame 0 reads at 270 px ("man pointing at a yellow suitcase in a train door"), but the suitcase is gone by f20 (0.67 s, script 1.4 s) and from f20 to f50 his arm is a stretched plank with NO hand (flat cut end at x≈88, zoom/s01_hands.png), pointing at a blank train wall. Beige figure on beige train, low chroma. Blink and cut-in work. 3 movers (arm, train, camera). |
| s02 | 81-140 | 7 | The blank-face to roaring-laugh cut is the best cut in the film; pull-back to the suitcase is smooth. The boy's face is hidden behind the suitcase (f105-138). f131-136: the tourist double-exposes during the card turn (doubled NEW YORK at f131, see-through body at f133, multi-outline smear at f136; zoom/s02_turn_131_136.png). |
| s03 | 140-164 | 5 | The glove rising to the green lamp reads. L* 38.5 (-13 vs s02); the lower half is a black console slab; the left third is the driver's back-of-head card, an out-of-focus brown blob with a pale rim; out-of-focus dust specks look like dirt on the lens over the dark console. |
| s03b | 164-212 | 6 | Expressive driver, clear name/beat/snap timing. The point is a huge foreshortened white glove blob over the left of his face (f164-172, f192-210); the green lamp is not in this shot, so "GREEN!" has nothing to point at on screen. |
| s04 | 212-262 | 6.5 | Good laugh, the boy looking up; the boy's one finger reads. f220-228: the tourist's jab hand passes over the boy's cap brim and eye (looks like a poke in the head; zoom/s04_hands.png). The upright one-finger hand at f237-260 is borderline at phone size. No glove/lamp through the glass. |
| s05 | 262-344 | 6.5 | Crowd glide and the foot hook on the wheel read well. Grey car, chroma 16.5. The tourist passes the lens semi-transparent (f300-312, background seen through his torso; zoom/s05_ghost_300_310.png). Crowd are rows of stick-leg cards; sleeper/stroller details too small to read. |
| s06 | 344-416 | 7 | Charming: the boy's copy, the cap dropping over his eyes and the push-up all read. Left 40 % is a bare beige wall with one red button near the lens; the car behind the boy is empty (s05 was "packed"). Driver glove foreground soft but fine. |
| s07 | 416-509 | 6.5 | Stop, doors, people off, suitcase trundles to the threshold: clear. f467->468 a commuter pops from behind the door leaf to in front of it in one frame. Boy and mum absent. |
| s08 | 509-623 | 6 | The boy's point and the catch read (f549-561 the case tips, he grabs). A plain white door pillar fills 25 % of the frame centre f509-545. "BAD SUITCASE." plays while the tourist is half out of the right edge (f585-621): the joke lands on the boy's face, not on the wag. |
| s09 | 623-719 | 7.5 | Clean plant: three cards readable behind the glass, doors meet, the late salaryman gives up. Coolest grade in the film (b* 3.7) between warm s08/s10. |
| s10 | 719-770 | 6 | Boy's frown reads. f731-757: the suitcase grip sits at the boy's mouth and the tourist's hand on it touches his face (zoom/s10_f731_boyhandle.png). The finger wiggle is not visible. The "moving, packed" car is empty. |
| s11 | 770-874 | 6.5 | Doors open, he parks it, pats, hops out: reads. f840-850 the hop is a see-through ghost (door frame visible through his body and legs; zoom/s11_hop_840_850.png). Big bare platform floor in the lower third. |
| s12 | 874-943 | 6 | Suitcase alone, the boy's worried wobble mouth: good. Mum's acting beat is lost: her face is behind the boy's cap the whole shot (only her hair shows), so it reads as a stack of heads. |
| s13 | 943-1020 | 5 | No vending machine in the frame (it first appears in s15), so "VENDING MACHINE... CHECK!" points at the lens with a foreshortened white fist. Camera 0.49 %/f. f991-1019: a black back-view commuter card walks between him and the doorway and hides the suitcase and the boy exactly on "CHECK!" (zoom/s13_black_figure.png). |
| s14 | 1020-1053 | 6 | Boy points at the suitcase, mouth shut: reads. His other forearm crosses his own face (f1028-1051); he looks confused rather than urgent. Mum's face cut by the cap again. |
| s15 | 1053-1150 | 7 | The look into the lens works (face ~16 %, held); vending machine now visible; double point reads. f1093->1094 the tourist's pose/position pops. The boy's cap brim near the lens is a big dark soft blob. Camera 0.38 %/f. |
| s16a | 1150-1272 | 5.5 | Phone held flat against his cheek: reads as "on a call", not "absorbed in his clip". Life 0.10 (lowest), 4.1 s of a near-static medium shot. The doorway trio behind reads. |
| s16b | 1272-1356 | 6.5 | Close, smug, the music note appears. f1293-1314 the finger wiggle is a big soft fist at the left edge. Top-right train is hazy and washed out. |
| s17 | 1356-1467 | 6 | Six balls, the EYE bar filling, the icons: all read at 270 px. Bright and warm now. But the bottom 45 % is a bare, flat peach table right at the lens; the volunteer is hidden behind the EYE jar and its sign (f1439-1465); olive walls are drab. |
| s18 | 1467-1497 | 6.5 | Cutaway reads (bag, boy, tourist laughing at his phone). He faces the camera instead of showing his back. The boy's profile fills the right third. |
| s19 | 1497-1601 | 6.5 | One ball, 6 against 1, both bars full: clear payoff. Same bare table; the volunteer is now on the right (she was left/behind in s17). |
| s20 | 1601-1675 | 5 | The boy is off frame; his arm is a 600+ px grey pole crossing the frame and the tourist's body (f1619-1673), which reads as a stick, not a child's arm. Orange cast (b* 27.6). Tourist's back reads. |
| s21 | 1675-1706 | 4.5 | Hold on the glove at the door lamp: lamp reads small. L* 38 (-13.5 / +16.8 around it), black console, brown back-of-head blob in the left third, dust specks; camera 0.46 %/f. Weakest look in the film. |
| s22 | 1706-1799 | 7.5 | Payoff reads: tourist in front, boy and bag behind the glass, doors close, train goes. The sun flare sits on the boy/bag window on "...CLOSED!" (f1770-1785). Cool sky grade. |
| s23 | 1799-1855 | 5.5 | His head turn and drained grin read. But the boy's "Bag... check!" is hidden: the tourist's phone and hand cover the boy's face and arm from f1815 to the cut. |
| s24 | 1855-1913 | 4 | The loop seam itself is good (f1911 -> f0 match). But f1899-1907 his hand passes in front of his face with one upright finger, back of the hand to camera: at phone size it reads as a middle finger at the lens (zoom/s24_hand_face.png, f1904), and at f1900 the finger pokes his eye. f1869: the rising hand sits at his belt line. |

Strongest moments: the s01->s02 cut from blank stare to roaring laugh (f81); s06 the boy's copy and the cap
falling over his eyes; s09/s22 the plant/payoff framing with three readable cards behind the glass; s15 the look
straight into the lens; s19 the single ball landing against six.

---

## 4. Defect list (frame, phone-size visibility, owner, fix)

| # | shot | frames | defect | visible at phone size | owner | exact fix |
|---|---|---|---|---|---|---|
| 1 | s24 | 1899-1907 | hand in front of face, one upright finger, back of hand to camera: reads as a middle finger; f1900 finger in his eye | HIGH (it is the frame the loop returns from) | CAST | Keep the "beside the ear" pose OUTSIDE the head silhouette (hand at least 60 px right of the head outline), and route the ear-to-stretch arc forward and out to screen-left below chin level, never across the face; use the pointing-hand card with thumb visible, palm three-quarter, for the whole path. |
| 2 | s01 | 20-50 | stretched forearm with no hand (flat cut end) pointing at a blank wall; suitcase gone at f20 | HIGH (inside the hook) | CAST + TRAIN | Lock forearm length to the rig length so the hand card stays on; slow the door window so the suitcase stays in frame to about f42 (1.4 s, as scripted) and the fingertip stays on it. |
| 3 | s23 | 1815-1853 | the boy's payoff call hidden behind the tourist's phone and hand | HIGH (payoff 2) | CAST / DIRECTOR | Enter the tourist 120-150 px further left or put the phone in his screen-left hand, so the boy's face, pointing arm, hand-to-ear and snap stay clear from f1810 to the cut. |
| 4 | s02, s05, s11 | 131-136; 300-312; 840-850 | see-through / double-exposed tourist on fast moves (card crossfade and accumulated blur) | MEDIUM | DIRECTOR (render) | Swap character cards on a single frame (no crossfade); turn off frame-accumulation blur for character cards, or blur them only along their own silhouette (opaque). |
| 5 | s16b audio | 42.72-43.85 s | phone replay at -27.8 dBFS RMS, 12.4 dB under the narrator, at bed level; Whisper misses it | MEDIUM (the dare the lab answers) | SOUND | Raise the replay +4.5 dB to ~-23 dBFS (8 dB under), duck the bed 4 dB under it, keep the phone band-pass but lift 1-3 kHz by 3 dB. |
| 6 | s03, s21 | 140-164; 1675-1706 | cab 13-17 L* darker than neighbours; black console slab; brown head blob; lens-dirt specks | MEDIUM (dark flash twice) | DIRECTOR + TRAIN | Lift cab exposure to L* ~50 (+0.6 EV), warm grade to b* ~16, give the console warm dark-grey brushed metal + windshield bounce light, drop the out-of-focus dust in cab shots, and either sharpen the driver's head card or crop it to a thin edge. |
| 7 | s20 | 1619-1673 | boy's arm is a long grey pole across frame and tourist, boy off frame | MEDIUM | CAST | Widen 10 % or move the boy so his shoulder and cap brim are inside the right edge; cap the arm at rig length. |
| 8 | s13 | 991-1019 | black back-view commuter crosses in front of doorway on "CHECK!", hiding bag and boy | MEDIUM | STATION (crowd) | Route that commuter behind the tourist on the far side, or time the crossing to f945-975, so the doorway trio is clear on "CHECK!". |
| 9 | s13 | 943-1020 | no vending machine in frame; point is a fist at the lens | MEDIUM on mute | STATION + CAST | Frame the machine at screen left (as in s15) and turn his point to it (side-on arm, not at lens). |
| 10 | s17, s19 | 1356-1601 | bottom 45 % a bare flat peach table at the lens | LOW-MEDIUM (owner's detail rule) | LAB | Raise the camera/tilt down less, or dress the near table: clipboard, stopwatch, the button box with cable, a mug, wood grain/wear; the jars should fill ~60 % of the frame height. |
| 11 | s12, s14, s16a, s22, s23, s24 | many | mum's face stacked exactly above/behind the boy's cap; her s12 acting beat invisible | LOW-MEDIUM | CAST | Offset mum 80-120 px to the boy's side so her whole face clears his cap; in s12 her look-and-smile must be fully visible. |
| 12 | s04 | 220-228 | tourist's jab hand passes over the boy's cap and eye | LOW-MEDIUM | CAST | End the jab 60 px above the boy's cap; layer the boy in front if they overlap. |
| 13 | s10 | 731-757 | suitcase grip at the boy's mouth, tourist's hand touching his face | LOW-MEDIUM | CAST | Move the suitcase 80 px right or the boy 60 px left. |
| 14 | s08 | 585-621 | "BAD SUITCASE." wag at the frame edge, tourist half out | LOW-MEDIUM | DIRECTOR | Hold the tourist and suitcase in frame for the wag; let the pan to the boy start after "SUITCASE." (f600). |
| 15 | s03b | 164-172, 192-210 | point is a giant white glove blob over his face, no lamp | LOW-MEDIUM | CAST | Turn the point 30-45 deg off-lens so the finger silhouette reads; add the green lamp's glow at frame edge. |
| 16 | s16a | 1150-1272 | phone against cheek reads as a phone call; life 0.10 | LOW-MEDIUM | CAST | Hold the phone at chest height, screen to him, eyes down at it; add strap sway, a passer-by, a pigeon. |
| 17 | s09, s22 | 623-719; 1706-1799 | blue-sky cool grade (b* 3.6-3.7) between warm shots | LOW | DIRECTOR | Warm the grade (+8-10 b*) toward golden hour; keep the sky but lower the sun. |
| 18 | s22 | 1770-1785 | sun flare sits on the boy/bag window on "...CLOSED!" | LOW | STATION | Move the sun or the flare 150 px up/left off the door window. |
| 19 | s07 | 467-468 | commuter pops from behind the door leaf to in front of it | LOW | TRAIN / CAST | Fix the layer order across the door leaf. |
| 20 | s15 | 1093-1094 | tourist pose and position pop | LOW | CAST | 2-frame in-between. |
| 21 | captions | e.g. 1385-1460, 960-1010, 1830-1855 | longest chunks reach x≈1005-1010 at 70 % height, into the right-rail buttons | LOW | DIRECTOR | Cap a caption chunk at 820 px wide. |
| 22 | plant line | 22.86 s | "CLOSED!" (plant) soft final /d/, heard as "Clothes" | LOW | SOUND | +2 dB at 2-4 kHz on that word, or the better take. |

---

## 5. Top 10 fixes, ranked

1. s24 f1899-1907: the hand crossing his face (middle-finger read, eye poke). CAST.
2. s01 f20-50: handless plank arm and early suitcase exit inside the hook. CAST + TRAIN.
3. s23 f1815-1853: the boy's "Bag... check!" hidden behind the phone. CAST/DIRECTOR.
4. Ghosting on fast moves, s02 f131-136, s05 f300-312, s11 f840-850. DIRECTOR (render).
5. Phone replay 42.72-43.85 s buried 12 dB under. SOUND.
6. Cab shots s03/s21: dark, flat black console, head blob, lens specks. DIRECTOR + TRAIN.
7. s20: the pole arm. CAST.
8. s13: black commuter over the doorway on "CHECK!" and no vending machine in frame. STATION + CAST.
9. s17/s19: bare near table. LAB.
10. Mum's face stacked behind the boy's cap (s12 beat lost). CAST.

---

## 6. Predictions (honest, craft lens)

- Stayed past 3 s: ~70 % (the hook's words and first cut are strong; frame 0 is pale and the pointing arm loses
  its target after 0.67 s).
- Average viewed: ~72 % on this cut; a few points more after fixes 1-5.
- The middle-finger read at the loop point is the one defect that could actively hurt (comments about it, or a
  viewer reporting it), so it is fix number one even though it lasts only 9 frames.

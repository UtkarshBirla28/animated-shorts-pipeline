# Why "pointing" looks bad: diagnosis (look director, 2026-11-20)

The short answer: **the film is beige.** Almost half of every frame is a washed, low-colour mid tone (cream train,
cream faces, grey-brown tiles, a grey T-shirt, a pale sky). The reference channel and our own clown film keep that
share near 10 %. On top of that the characters are big, flat, cream cut-outs that sit ON the picture, not in its light.

Evidence sheet: `COMPARE_ours_vs_reference.jpg` (rows: 3 of his new videos, our clown, our pointing final; every tile
has its own numbers). Measurement script: `measure/measure.py` (1 frame per second at 540x960, real CIE L*a*b*, the
caption band, rows 52-82 %, masked out). Raw numbers: `measure/summary.json`, per frame `measure/<video>_frames.json`.

## The numbers (median over the whole video)

| | ours: pointing | ours: clown | his: drivers | his: coasters | his: railroads |
|---|---|---|---|---|---|
| mean colour strength (chroma C*) | **22.0** | 31.8 | 31.3 | 33.5 | 32.4 |
| share of the frame that is beige / grey (L* 45-92, C* < 22) | **40 %** | 11 % | 10 % | 8 % | 12 % |
| share of the frame that is vivid (C* > 40) | **8 %** | 26 % | 31 % | 45 % | 34 % |
| clean whites (L* > 82, C* < 14) | 2 % | 7 % | 5 % | 3 % | 3 % |
| contrast (L* spread) | 21.9 | 25.1 | 22.8 | 18.0 | 19.2 |
| colour in the shadows (darkest quarter) | 19.9 | 27.8 | 23.9 | 23.4 | 25.5 |
| frames that show sky | **34 %** | 79 % | 83 % | 91 % | 68 % |
| the sky's colour (median) | **#6380a2, C* 21** (grey-blue) | #65a9e4, C* 37 | **#2691e7, C* 51** | #3986d3, C* 47 | #7190c4, C* 31 |

(His storm video "the instinct that makes you crash" is muted on purpose: chroma 16.5. His muted looks are a choice
for one story; ours is muted everywhere.)

Note on older research: `research_notes/ricksclips/LOOK_REPORT.md` measured his new look as CALMER than our earlier
films (chroma 24 vs our 30-32) and advised calmer colour. On this measure his new videos are 31-34, the same as our
clown. I do not know which colour space that script used, so I cannot say which number is right, but the direction
matters: the pointing film went much further down (22) than either, into beige. Calmer than the clown was never the
target; cleaner was.

## Why it looks bad, ranked

1. **Beige everywhere (colour).** 40 % of the picture is beige / grey against ~10 % for him and for our clown; only 8 %
   is vivid against 26-45 %. Where it comes from, measured on the four test frames: the white train side comes out
   **(230, 203, 174)** (cream, not white), faces **(249, 206, 154)** (peach), the tiles **(189, 157, 121)** (tan).
   Causes, in order: (a) the platform presets warmed the WHOLE picture (`warmth` 0.6-1.3) on top of an orange sun and a
   warm highlight tint, so every white turned cream; (b) the stainless car mirrored a grey-beige horizon in its own
   reflection map (`skyEnv`: horizon 0.6 / 0.59 / 0.56); (c) the platform slabs were set to grey at 28 % saturation;
   (d) the tourist wears a light grey tee (#bfc8d6) over cream skin: the biggest shape in most frames is grey on beige.
2. **No sky, and a grey sky when there is one.** Sky is in 34 % of our frames against 68-91 % of his, and ours is a
   grey-blue (C* 21) against his deep blue (C* 47-51). The presets cut the drawn sky (bgK 0.68-0.75, skyLevel
   0.22-0.26) to pass an older brightness gate, and the haze / fog veil (fog 0.003, haze up to 0.0008) greys the far
   world. Most of our shots look AT the train side or INTO the car, so the sky is simply out of frame.
3. **Big flat faces (framing).** Head height (including the cap) as a share of the frame, judged by eye from the
   final contact sheet (+-0.05): s01 0.28 rising to 0.45 at the punch-in, s02 0.30, s03b 0.45-0.5, s04 0.25,
   s05 0.25-0.3, s10 0.22, s13 0.22, s14 0.25, s16a 0.25, **s16b 0.40-0.45**, s20 0.25 (cut by the edge); only s07,
   s09, s11, s12, s22 keep heads at 0.10-0.12. His heads are 0.15-0.20 in close shots and 0.05-0.10 in wides, and
   the place fills the rest. A big cream bean at 1080 px also shows how simple the drawing is (thick outlines, a
   flat fill), which reads as crude next to a realistic world.
4. **The characters sit on the light, not in it.** The cast card look was tuned to keep faces pale in the warm rig
   (keyK 0.6, floor 0.5: little sun shaping, no visible rim, almost no shade side), so a figure has the same flat
   cream all over while the world behind it has sun and shadow. That is the "sticker" effect.
5. **The tourist reads as a grey egg in blue underwear.** Grey tee, the jeans drawn as a thin band at the hips
   (0.2 of a head height), stick legs: the silhouette is one grey bean. (The kid and the driver read fine.)
6. **Flat contrast is NOT the main problem, but the light has no direction in the warm haze.** The global L* spread is
   normal (21.9 vs his 18-23); what is missing is colour contrast: golden light against cool shadow, a white against a
   blue. Everything sits in one warm cream key. Shadow colour is low (19.9 vs 23-28).
7. **Plain big surfaces.** When the camera is close, a blank cream car panel, a blank cream door pillar (s08: 25 % of
   the frame), the cab's cream walls and a black console (s03 / s21 at L* 38 against 51-60 around them: a dark flash
   at four cuts), and the lab's bare peach table (bottom 45 % of s17) fill the frame with nothing.

Also from the lead's audit, belonging to the look: frame 0's chroma 23-24 (hit Shorts' frame-0 median 33.6);
s09 / s22 are the coolest shots (b* 3.6) between warm neighbours (b* 15-22) and s20 has an orange cast (b* 27.6):
the warmth jumps at cuts because each shot was warmed by hand; out-of-focus dust specks read as dirt on the lens.

## What the look test changed, in one line each (details: LOOK_PLAN.md)

Neutral white balance with a golden sun and cool sky-blue shadows; no haze; more contrast; a darker, bluer drawn
sky; a glossy train that mirrors a blue sky with a wide emerald band; terracotta platform tiles; a violet tee, indigo
jeans up to the lower third and a true red cap for the tourist; a raspberry coat for the mum; near-white skin with a
real sun key, rim and shade side; a cool mint-grey cab with a blue-grey console; two of the four test cameras pulled
back / widened so the place shows.

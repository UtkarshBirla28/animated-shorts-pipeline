# 02 - Textures and Characters (study notes)

Slice: `references/reports/textures.md` and `references/reports/characters.md` of the repo
`mromidev/claude-animated-shorts` (read-only clone at `<ROOT>\repo`).

## Files read

| File | Lines | How much read |
|---|---|---|
| `references/reports/textures.md` | 978 | every line (1-978) |
| `references/reports/characters.md` | 728 | every line (1-728) |
| `references/reports/CONTEXT.md` | 55 | every line (shared brief the two reports were written against) |
| `references/STYLE_BIBLE.md` | 44 | every line (style summary the reports refer to) |
| `templates/bridge/toon.ts` | 909 | lines 1-750 (all character code; 750-909 are fx sprites) - to check what was actually shipped |
| `templates/bridge/paint.ts` | 720 | lines 1-40 and 255-720 (all HD painters) - to check shipped textures |
| `templates/bridge/cast.ts` | 473 | lines 1-240 + grep of the rest (card placement, blinks, light) |
| `templates/bridge/cardshade.ts` | 85 | every line (how character cards are lit in 3D) |
| `templates/bridge/lights.ts` | 63 | every line (shipped sky / water / cloud colours) |
| `templates/bridge/world.ts` | 578 | lines 540-564 + grep (water shader, sky, iron) |
| `SKILL.md` | 166 | grep only, for the character summary lines 100-128 |

Images: none in my slice. The reports point at many PNG/JSON/script files under `references/textures/` and
`references/characters/`, but **those folders are NOT in the repo** (the repo `references/` only has
`STYLE_BIBLE.md`, `frames/` (38 jpgs), `reports/`, `sheets/` (20 jpgs)). So every "see `side/sbs_planks.png`"
style pointer in the reports is a dead link here.

---

## 0. What these two reports are

- Both are "look-match" studies. An agent measured 20 private reference shorts (720x1280, 30 fps, not in the repo)
  and compared them with test stills of the user's own short "The Bridge That Fell for a Song" (1831 Broughton
  bridge, 74 marching soldiers). Output: numbers, gaps, and a code recipe.
- They were written BEFORE the final code. The shipped `templates/bridge/*.ts` implement most of the recipes, but
  several values were re-tuned later (comments say "MAT pass", "MAT round 3", "review round 2-4"). Where the shipped
  code differs, the shipped code is what renders. See section C.
- Story, characters and voice are "ours". Only general construction rules were taken from the reference; nothing
  is traced or copied (characters.md:5).

### Jargon used below (short definitions)

- **L\*** = lightness 0 (black) .. 100 (white) in CIE Lab colour space. **C\*** = chroma (colourfulness; 0 = grey).
  **h** = hue angle in degrees. **ΔL\*** = lightness difference.
- **FWHM** = width of a dark painted line measured at half its darkness depth (textures.md:35).
- **Edge (10-90 %)** = how many pixels the line's side takes to go from 10 % to 90 % of its contrast. Bigger = blurrier.
- **px/m**, **texels/m** = screen pixels / texture pixels per metre of surface. **M** = screen pixels per texel
  (magnification). High M = blurry texture.
- **Clusters** = k-means (k = 4) colour groups in Lab, given as colour : area share.
- **W** = head width (the face fill inside the outline). **HH** = head height. **u** = 1 % of W.
- **Canvas angle**: 0° = right, 90° = down (y grows downward in Canvas2D). `light` = canvas angle the light comes FROM.
- **Design units**: characters are drawn on a 600 x 1000 canvas, soles at y = 975. In 3D, 1 unit = 0.00216 m
  (`cast.ts:61 SU = 0.00216`), so the card is 1.296 m x 2.16 m.
- **Billboard / card**: a flat plane in the 3D scene that turns to face the camera, carrying the 2D drawing as a texture.
- **Superellipse**: a shape `|x|^n + |y|^n = 1`. n = 2 is an ellipse; n < 2 is pointier; n > 2 is boxier/fuller.
- **Mipmaps**: smaller pre-shrunk copies of a texture used when it is far away; thin lines can vanish in them.

---

# PART A - TEXTURES (textures.md)

## A1. The core rule in one paragraph (textures.md:6-16)

The reference paints every surface as **a few flat colour fields**. Painted lines (board gaps, mortar, tile joints)
are **thin, 3-5 px at 1080p**. Sun and shade sit in a **narrow, bright, saturated** range. Only big shapes vary in
tone. No photographic grain.

Our old surfaces failed in five ways:
1. **Too dark**: our deck L\* 50 vs reference L\* 72-80. Iron and side beams L\* 3-7 vs reference never below L\* 19.
2. **Too dull**: our sky C\* 22-29 vs reference 40-89. Our golden sky was grey-mauve C\* 16-19.
3. **Lines too heavy and blurry**: gaps/mortar 1.5-2.5x wider; edge ramps 4-6 px.
4. **Water wrong**: ripple marks spread evenly at 4-12 % of the area, vertical streaks, no depth gradient.
5. **Flat clouds**: one tone; reference uses 3 tones with a lavender underside.

## A2. Method (textures.md:21-42)

- Reference: 91 frames from 14 videos (01 02 03 04 05 07 08 10 11 12 13 14 18 19). Frame names `VV_SS.s`
  = video number, second (e.g. `01_25.5` = video 01 at 25.5 s). 99 crops (+2x copies), 30 zoom crops.
  79 + 14 surface patches, 40 line profiles, 11 water regions, 17 sky spans, 11 cloud crops.
- Ours: 61 test stills, 540x960 JPEG previews.
- **All pixel numbers are converted to 1080x1920.** Reference (720p) x1.5, ours x2. Our stills carry ~2 px of upscale blur.
- **Captions**: the reference has burned-in one-word captions at **rows 874-934 of 1280**. Water stats mask rows
  760-952. (Our own rule: no captions unless the user asks - STYLE_BIBLE.md:10.)
- Colour: sRGB hex; L\*/C\* in CIE Lab D65.

## A3. Measured surface rules (reference vs ours)

### A3.1 Deck planks (textures.md:60-78)

| Item | Reference | Our old version |
|---|---|---|
| Sunlit board | #f8bb60 (64 %) / #dea04b; #e28c29 / #db983e; #ffab49 / #fe983b; muted ship deck #cd9a66 / #bf8c5c. **Median L\* 61-74, C\* 35-68** | #b77a37 / #a46826, L\* 50-54, C\* 47 (20-25 L\* too dark) |
| Shade | rigging/wheel shadow bands #7d4e1c / #875c27; porch under roof #916351 / #a27864, L\* 45 | - |
| Golden hour | dock #c18d61 / #a57651, L\* 51; deck #805345 / #714c46, L\* 35 | #8a440a / #663107 with 32 % #1f0904, L\* 20 |
| Board-to-board L\* std | **1.2-4.2** | 5-6 (too varied) |
| Within-board L\* std (grain) | **1.3-2.6**, broad, soft | 2-3; dark bezier strokes at alpha 0.35 read as extra gaps |
| Gap width / board pitch | **core ~3.3 %, FWHM 4.6-5.5 %** | core 6.5 %, FWHM ~12 % |
| Gap FWHM at 1080 | near 3.6-4.8 px; mid/far 3.3-3.5 px (they fade, not thin); extreme close 7.7 px | near 5.0-6.6, mid/far 7.5-9.1 px |
| Gap colour / depth | **#571e00 / #591e00 / #6b2903; ΔL\* 40-48 in sun**, 17-37 in shade/golden/DOF | #582e02 / #703f05; ΔL\* 16-21 |
| Board edges | sunlit lip **+4..+7 L\*** one side, shaded lip **-3..-6** other side | flat |
| Details | small dark nails, rare knot rings, butt joints | 2 nails per board at fixed x |
| Edge ramp | 3.2-3.3 px near, 4.8 px extreme close | 3.6-4.9 px |
| Fine noise (hf) | 0.5-0.8 | 0.7-0.8 (same - keep clean) |

### A3.2 Wood walls, hulls, beams (textures.md:80-89)
- Painted clapboard: aqua #a0c5c5 with lines #72a0aa / #57797a, FWHM 3.0-3.1 px, ΔL\* 15-19, **every 23-28 px**; purple #7a3c70 with 4.1 px lines.
- Painted hull: #d33414 (66 %) / #b82e10, C\* 77, almost no lines.
- Timber in shade / lamp light: #692c1a / #883b1c (L\* 30); #642717 / #411513 (L\* 27).
- Ours: side beam #231001 L\* 6.7 = flat black band. **Rule: timber in shade L\* 27-35, never black.**

### A3.3 Stone, brick, slabs (textures.md:91-100)
- Blocks: bridge wall #c2b2a5 (44 %) / #9a8c7f (35 %) + #f4e2c6 highlights; castle #cdbdb0 / #9c908f, shade #533f47;
  flagstones #c4b6b3 / #b5a8a5 / #a79998; plaza slabs #eadabc / #d7c5aa. **C\* 5-16, L\* 60-73** (near-neutral, light).
- Mortar: #87796c FWHM 3.6 px depth 14; #6c5b52 2.8 px depth 21; #807270 4.5 px depth 20; edge 2.1-2.9 px.
  Ours was #503f26, 5.4 px (far 9.4 px), darker and browner.
- Block shading: light top bevel ~+5 L\*, dark bottom ~-3 L\*. Detail: dark/light speckles 2-4 px, hairline cracks, chipped corners.
- Brick: #cf5e30 (40 %) / #dca55f, **light mortar #f6d9b1 (35 %)**, L\* 67. Ours bricks were 1.2 m long (oversized).
- Cobbles: the reference has **none** (ground = flat slabs or dirt with pebble dabs). Ours were a "polka-dot" grid of
  ellipses with dark rims (#c3b18f / #756446 / #3d2d17, L\* std 20, line fraction 0.13).

### A3.4 Facades, windows (textures.md:102-111)
- Walls: cream plaster #f3e6d2, salmon #e58e6e, red #df585d, timber #804937 / #785248; aqua clapboard
  #a3cdc7 / #b4dbd4 with trim #fceed5, L\* 81. Ours: #879590 / #4f4347 / near-black #0b0d18, L\* 40.
- Window trim: white/cream #d6dfcf / #fceed5, thin dark outline.
- Glass: **mid-tone blue-violet #7b7ea0 / #6670b0**, reflections #a9c2d2 / #9ebacd, **two diagonal glints**. Never near-black.
- Shutters: louvred, violet-blue #816e89 / #5a5f9a, slat lines. Curtains: pink #f0d5df / #f5c0c8 in some windows.
- Crisp trim lines ~3 px at 1080. Ours: 48 px/m = soft.

### A3.5 Roofs (textures.md:113-122)
- Terracotta #dc8872 (41 %) / #c87563 (31 %) / #ec9c87 (26 %), L\* 64, **joints 3.3 px, ΔL\* 10, no outline per tile**.
  Ours: #92391b family L\* ~40, joints 9.4 px, ΔL\* 15, ink outline on every tile.
- Slate from above: #bdbfc6 / #dbe0e9, darks #9292a4 / #705960, L\* 74. Thatch: #d49934 / #f0bd59 with #80593d streaks.
- Sunset snowy #fab8b8; night cone roof #2e5ccd.

### A3.6 Grass (textures.md:124-131)
- Sun: #71b038 (44 %) / #7dbf3f (42 %) / #588646, L\* 66, C\* 64; #75b43b / #5da12e; plaza #488e2e L\* 53.
  Ours #70b13b matched hue and level.
- Variation: **broad** (low-frequency variance 5.7-10, autocorrelation 16-40 px at 1080). Ours fine noise only (6 px).
- Shadow: teal #305c54. Details: sparse white/yellow/orange flowers and dabs, short tuft strokes.

### A3.7 Sand / dirt (textures.md:133-143)
- Western sand #b0937f (L\* 63, std 3.7); town road #c58b43 / #cc9247; castle road #b99260; golden road #e3b46b / #ce9c5d.
- **Shadows on ground turn blue-violet (#4b3c5a) or warm mauve (#806154).** Only detail: sparse cream pebble dabs.

### A3.8 Rocks (textures.md:145-153)
- Two flat planes: warm lit face + cool shade face, almost no lines (line fraction 0-0.04).
  Sea cliffs lit #caae98 / shade #60737c; pillars #ddc0a6 / #868784; sunset mountain #feb682 / #a67f99; pebbles #bf9d7f / #745a55.
- No rock recipe was written (bridge had no rocks). **A new story with rocks must write its own painter from these numbers.**

### A3.9 Metal / iron (textures.md:155-165)
- Cannon: bright band #e8e7df (30 %), #8790a6 (27 %), #586076 (23 %), darkest #282f41 (20 %, **L\* 19**).
- Riveted hull: #596474 (84 %), rivets #2d3442 with highlight #f1ddb2.
- Rule: iron is painted like a **matcap** (a fake fixed highlight): blue-grey mids, **a broad bright band on 25-30 %
  of the area, darks stop at L\* 19**. Ours rendered L\* 3.

### A3.10 Painted lines vs geometry ink (textures.md:167-178)

| Line | Reference FWHM / edge / ΔL\* (px @1080) |
|---|---|
| Plank gaps near | 3.6-4.8 / 2.5-3.3 / 25-48 |
| Mortar | 2.8-4.5 / 2.1-2.9 / 14-21 |
| Tile joints | 3.3 / 2.7 / 10 |
| Clapboard | 3.0-4.1 / 2.2-4.0 / 15-19 |
| Geometry ink outlines (scale) | 4.1-5.8 / 2.7-3.8 / 23-55, colour #32221f / #4c3234 |

**Rule: painted texture lines are 0.7-0.9x the ink outline width and about half its contrast, so surfaces never
compete with silhouettes.**

### A3.11 Water (textures.md:180-216)
Reference, 11 regions. Gradient stops far -> near (examples):
- teal sea #1194b6, #087fa2, #05678f, #035077; azure #81acf1 -> #27a4ff; harbour #1e70bb -> #0d4e97;
  river from above #8fb8d3 -> #7c9ebc; sunset lake #77a5c3, #4482b3, #396362, #5c87a8; dusk #262246 -> #040a2d;
  night #1c6ec8 -> #083a7c.
- Crest area far / mid / near: e.g. 1.9 / 0.2 / 0.0 %, 4.9 / 1.6 / 0.9 %. Marks per 100x100 px: 0.24-2 (sunset reflections 10.5).
- Crest size 6-52 px wide x 1.5-10 px tall, aspect 1.5-7.5, angle within ±9°. Crest +7..+13 L\*; trough -8..-11 L\*.

What the reference does:
- **Flat saturated vertical gradient: lighter and more cyan toward the horizon, darker and deeper near the camera.
  Top-to-bottom drop 10-35 L\*.**
- Marks sparse, horizontal on screen (aspect 2-7, angle ±9°), thinning toward camera: **~1.5-5 % far, 0-1.6 % mid, 0-0.9 % near**.
- Each crest (+8..+13 L\*) has a dark trough right under it (-8..-9 L\*).
- A few long thin glints 1-3 px x 30-100 px.
- **No mirrored reflections.** Sunset lake only shows sky colour + warm light blobs.
Ours: no gradient, marks 2-10x too dense near, vertical streaks (aspect 0.7) in side views, golden water a dull navy #213b4e (L\* 24, C\* 14).

### A3.12 Sky (textures.md:218-230)
- Day stops (top of frame -> horizon): #59abff, #208cfb, #3e9bff, #66baff (C\* 49-58); #0b6ced, #0f7af9, #1881fd (54-76);
  #266ac1 -> #2a88df; #5ba8f0 -> #82c4fc; #4d96d5, #7fbcf1 then haze #d7e0e6; #0a4ce6, #1975fd, #4991fc (61-89).
  Ours #8ab6e7 -> #a0c3e9 (C\* 22-29).
- Golden/sunset: coral #d27472, #e27d7c, #fda77d, #ffca83 (C\* 43); lilac->pink #c18dde, #eb9ede, #feb0c6; magenta
  #312384, #70339f, #ec5080; blue->cream->peach #508bce, #d5cdbd, #f0bd97. Ours dusty mauve #ab89a1..#ca9d97 (C\* 16-19).
- Dusk/night: #365296 -> #a59ba9; #1849b4 -> #1857c8 (C\* 66-69).
- **Why ours was pale**: shader `mix(hor, top, pow(h, 0.55))`, h = sin(elevation). A level camera with vfov 36° only
  sees elevations 0-18°, so frame top = 52 % mix (#7cb5ec); the saturated top never shows.
  **Rule: put colour stops at the elevations the lens actually sees (0-30°).**
- **Why our golden was grey**: mixing blue #5a66b8 with orange #ffc48c passes through grey. **Rule: rotate the hue
  through coral -> pink -> lilac instead of mixing blue with orange.**

### A3.13 Clouds (textures.md:232-248)

| Cloud | Lit crown | Mid | Underside | Edge ramp |
|---|---|---|---|---|
| day | #f1f6fc / #f2f6fb (L\* 97) | #e5edf9 | #cfe3fc / #ada7ad | 8.6-10.6 px |
| big cumulus | #faedd7 warm (63 %) | #dadae9 (30 %) | **#b6c1f2 lavender-blue** (7 %), bottom third 12.5 % vs top 0.3 % | 16.2 px |
| big cumulus | #fbfafd | #ecedf6 | #d1d4e1 (47 %) | 19.5 px |
| bands | #ece6e8 / #e2e8f1 | #e6e1e4 / #d3dae8 | #d6d6e0 / #c7cedf | 3.3-8.4 px |
| small crisp | #f9eedc / #f7fafe | #ebebec | #d1d8e5 / #ccd6e9 | 1.9-2.1 px + **-13 L\* ink rim** |
| dusk puffs | #daa07e | #9e96ab | #7b88af | 13.4 px |
| sunset | #f99a84 | #ea827c | #cf727c | 25.2 px |

Shape: chain of round lobes, **biggest in the middle**, cauliflower crown, **flat bottom**, 100-640 px wide at 1080.
**9 of 11 clouds have no outline**; only small far crisp clouds get an ink rim.

## A4. Texel density (textures.md:250-289)

- Screen density for the lens (vfov 36° on 1080x1920, surface facing camera): **px/m = 1920 / (2·D·tan 18°) = 2954 / D**.
  Along a grazing surface multiply by sin(grazing angle).
- Table: D 0.5 m -> 5908 px/m; 1 -> 2954; 2 -> 1477; 5 -> 591; 10 -> 295; 20 -> 148; 50 -> 59; 100 -> 30.
- Reference magnification estimated from edge ramps: `ramp ≈ sqrt((0.8 M)² + 1.5²)`. Mortar/clapboard M ≈ 2-3,
  near plank gaps M ≈ 3.7, extreme close deck M ≈ 5.7.
- **Target: M ≤ 6 at the closest lens, M ≤ 3 at working distances. Required texels/m = px/m / M.**

| Surface | Old | Typical D | Recipe |
|---|---|---|---|
| Deck top | 512 px / 4 m = 128 /m | 0.5-3 m (lens 0.36 m above deck, grazing ~18°) | `planksHD` 2048 px / 2 m = **1024 /m** (M 5.8 at 0.5 m, 2.9 at 1 m), anisotropy 16 |
| Deck side beam | 85 /m | 1-5 m | `beamHD` 1024 / 3 m = 341 /m along, 512 /m vertical |
| Tower blocks | 256 /m | 3-60 m | `stoneHD` 1024 / 2 m = **512 /m** |
| Quay wall | 128 /m | 5-40 m | `stoneHD` on 4 m tile = 256 /m (0.5 m blocks) |
| Cobbles | 128 /m | 3-30 m | `cobbleHD` 1024 / 4 m = 256 /m |
| Grass | 128 /m | 3-60 m | `grassHD` 1024 / 4 m = 256 /m |
| Roofs | 128 /m | 15-200 m | `roofHD` 1024 / 4 m = 256 /m (no ink) |
| Facades | 48 px/m | 15-100 m | `facadeHD` **96 px/m**, cap 2048 px per side (72 px/m allowed if memory is tight) |
| Chain | 256 /m | 1-10 m | `chainHD` 1024 / 2 m = 512 /m |
| Water | 64 /m | 6-500 m | 2 bands: 1024 / 8 m near, 1024 / 40 m far |
| Clouds | 600x300 per 110-185 m sprite | 620-740 m | `cloudHD` 1024x512 (~1 texel per px) |

Memory (RGBA + mips): planksHD 22 MB; each 1024² 5.6 MB (towers, cope, wall, cobbles, grass, 5 roof colours, 2 water ≈ 75 MB);
beam + chain + 8 cloud sprites ≈ 25 MB; facades at 96 px/m ≈ 4 MB per 10x10 m front.

## A5. Painter recipe (textures.md:291-312 and appendix 490-978)

Stack assumed: three.js 0.175, Lambert materials, `CanvasTexture` via `ctex`. No image files; everything is drawn
procedurally with Canvas2D and a seeded random `rng`.

### Shared helpers (appendix, textures.md:499-553) - signatures
- `pick<T>(r, a: T[])` random element; `U(r, a, b)` uniform in [a, b]; `TAU = 2π`.
- `wrapX(W, x, w, fn)` - draws again one tile over when [x, x+w] crosses an edge (seamless in x).
- `wrap2(W, H, x, y, rad, fn)` - same in x and y for scattered marks.
- `rr(g, x, y, w, h, k)` - rounded-rect path.
- `blotch(g, x, y, rad, sx, rgb, a)` - soft radial-gradient ellipse stretched sx along x (broad tone drift).
- `grain(g, r, W, x, y, len, amp, lw, col)` - long soft wavy wood-grain stroke, n = max(2, round(len/180)) quad segments.
- `nail(g, x, y, rad, col = "#3a2212")` - dark dot + glint rgba(255,240,215,0.55) at (-0.32r, -0.32r), radius 0.36r.
- In the repo, `ctex(key, w, h, draw)` is `paint.ts:10`: caches by key, canvas -> `THREE.CanvasTexture`,
  `colorSpace = SRGBColorSpace`, `anisotropy = 8`, `RepeatWrapping`, seeded with `rng(key.length * 131 + key.charCodeAt(0))`.

### Painters (report values)

| Painter | Canvas | Covers | Key values |
|---|---|---|---|
| `planksHD()` | 2048² | 2x2 m, 8 boards of 256 px (0.25 m) | fills #efbd82 #e8b47a #f4c58b #e3ae74 #ecb97e (L\* 75-82); 5 drift blotches/board r 120-260, x3 stretch, α 0.08-0.12; 10 grain strokes 500-1500 px, amp 2-7, lw 1.5-3.5, rgba(140,82,36,.13) or light rgba(255,238,205,.14); knot on 35 % of boards; 3 wear blotches; sunlit lip 3 px rgba(255,238,200,.35); shaded lip 18 px gradient to rgba(80,35,10,.24); 1 butt joint/board (6 px #66300f) + 4 nails r 5; joist nails at x 512 and 1536; **gaps 8 px #66300f + 1 px rim rgba(102,48,15,.5)** (~4 % of pitch) |
| `beamHD()` | 1024x512 | 3x1 m | 7 timbers (0.143 m) #a8743f #9e6b39 #b07a44; 6 grain strokes α 0.12-0.16; top lip rgba(255,235,195,.30); bottom 12 px shade rgba(60,28,8,.26); seams #4a2510 3 px; 1 joint/timber with 2 bolts #2f2a2a r 7 |
| `stoneHD(key, cols, mortar)` | 1024² | 2 m tile, 0.25 m courses (RH 128 px) | default cols #ddd0bf #d3c5b3 #e5d9c9 #cabba8, mortar #a39584; joint 7 px (5.5 %); blocks 200-360 px running bond (row offset 140 + 0-60); radius 5; per-block ±7 % tone; top bevel 6 px α .22; left 4 px α .10; bottom 5 px rgba(70,55,45,.14); 16 speckles r 1-2.2 (60 % dark); cracks on 15 % of blocks |
| `cobbleHD()` | 1024² | 4 m, 24 courses of 0.167 m | joints #8c7e69; setts 48-72 px, radius 7-12; cols #c4baa8 #b9ae9b #cfc5b3 #b3a793 #c9bfae #bdb4a6; gradient top-left light α .20 -> bottom-right dark α .16; **no rim**; 14 damp patches |
| `roofHD(col, slate)` | 1024² | 4 m, 0.25 m courses (64 px) | tiles 77 px (slate 52); ±10 % tone/tile; pan gradient light-left dark-right; joint 2 px α .22; lower-lip light 3 px; course shadow 5 px rgba(55,22,18,.32); 18 weathering blotches; **no ink outline** |
| `grassHD()` | 1024² | 4 m | base #73b23d; 16 patches r 120-320 (#8cc650 / #5c9a30 α .35); 1400 V-tufts 7-16 px lw 2 (~90/m²); 12 flowers r 3.5 (#f7f3e8 #f4d24a #f3a9bb) with yellow centre r 1.3 (~0.75/m²) |
| `facadeHD(key, wm, hm, o)` | 96 px/m (cap 2048) | wall wm x hm m | plaster blotches r 0.4-1.5 m α .05-.07; 4 hairline cracks; plinth 0.45 m; timber #6e4a30 0.18 m with posts; floors every 2.8 m; windows 0.85x1.25 m, nWin = floor(wm/2.2); trim #f7f2e8 0.08 m with 1.5 px rgba(60,45,40,.6); **glass gradient #8d9cdb -> #5761a8**; 2 glints at 45° (0.07 / 0.035 m, white α .5); curtains on 35 % (#f5c4c8 #f3e3c6 #d7e6cf); louvred shutters 0.45 m wide, slats every 0.06 m; door 1.1x2.1 m arched #7a4a2c; brick 0.25x0.085 m on #e9d3b4 |
| `waterMarks(key, nCrest, nGlint)` -> `waterNear()` (28, 5) / `waterFar()` (220, 30) | 1024² DATA texture (R crest, G trough, B glint) | 8 m and 40 m | arcs 18-44 px, sag 0.3-0.45 w, lw 3-5, **random rotation**; trough at +1.5 lw (0.9x width); glints 40-140 x 1.2-2.4 px; `globalCompositeOperation = "lighter"`. **Must set `colorSpace = THREE.NoColorSpace`** (it is data, not colour) |
| `cloudHD(seed, pal)` | 1024x512 | one sprite | 6-9 lobes, radius (60 + 110·sin(πt)^0.8)·U(0.75,1.15) (biggest in middle), + n/2 crown lobes r 60-110; 3 layers: underside (blur 6), mid shifted (-.04, -.12)r x0.9 (blur 8), lit shifted (-.10, -.26)r x0.72 (blur 10); flat bottom fade 24 px at base y 400; own seed `rng(seed*7919+17)` |
| `CLOUD_DAY` / `CLOUD_GOLD` | | | day lit #fbf8f1 mid #e1e5f3 shade #c3cbe9; gold lit #ffd2a8 mid #f2a08f shade #a98fc4 |
| `chainHD()` | 256x1024 | 4 faces x 2 m, link pitch 128 px (0.25 m) | bg #262c3e; face-on rings lw 15 #5f6880 with #20263a edges; highlight arc lw 5 #d4d6de (upper left); glint #fbfaf4; edge-on links #56607a with stripe #c9ccd6 |
| `SKY` | | | day #d8ecf7 (0°), #8ccbf8 (3°), #4aa3f2 (12°), #2a7fe6 (30°+); golden #ffd08a (0°), #ffad7e (4°), #e9849a (14°), #8c78c4 (32°+) |

Also `skyAt(p, el)` (textures.md:967-977): CPU copy of the sky interpolation for previews. It converts stops to
linear RGB, smoothsteps between elevations, converts back to sRGB.

## A6. Integration steps written in the report (as of the study; line numbers refer to the OLD code)

`world.ts` (textures.md:314-399):
1. Deck top uv: `ZS.flatMap((z) => [0, z / 2, 2.5, z / 2])`; material `lam("planksHD", () => ({ map: planksHD() }))`; `map.anisotropy = 16`.
2. Deck side: own `lam("deckSide", () => ({ map: beamHD() }))`. Do not swap `M.wood` (posts/ribs/rails use box UVs).
   Lift `beam()` base `#6b4428 -> #a8743f`, strokes `rgba(40,22,12,.45) lw 2 -> rgba(85,48,20,.16) lw 2-3`.
3. `M.grass = grassHD()`, `M.cobble = cobbleHD()`,
   `M.wall = stoneHD("wallHD", ["#c9bcaa","#bfb19f","#d1c5b4","#b8aa97"], "#958776")`,
   `M.cope = stoneHD("copeHD", ["#e6dccd","#ddd3c3","#ece4d6","#d6cbba"], "#aea293")`, `M.tower = stoneHD("towerHD")`,
   **`M.iron` #2c2f36 -> #4b5468**, chain map `rep(chainHD(), 1, 1)`.
4. Water shader (below). 5. Sky shader (below). 6. Clouds: two sets `cloudHD(i % 4, CLOUD_DAY)` / `CLOUD_GOLD`;
   swap per light; drop the old `#ffd6b8` multiply tint; sprite aspect 2:1.

`build.ts` (textures.md:401-408): `facade -> facadeHD`; `roof(col) -> roofHD(col, col === "#5b6470")`; roof palette
lift #b5503c -> #d27a62, #8a4a3a -> #b8644f, #a35a3a -> #c9775a, #6b5a7a -> #8e7aa0, slate #5b6470 -> #8f97a8;
church tower `stoneHD("tstoneHD", ["#e2d8c2","#d6cbb2","#ece3cf","#cfc4aa"], "#a99d8b")`.

### Water shader (textures.md:333-368) - the important maths
Patched into `MeshLambertMaterial({ transparent: true, opacity: 0.9 })` via `onBeforeCompile`.
Uniforms: `wNear, wMid, wFar, wCrest, wTrough, wGlint` (vec3 colours), `wNearTex, wFarTex` (sampler2D), `wTime` (float).
```glsl
vec3 V = vWP - cameraPosition; float d = length(V);
float dep = asin(clamp(-V.y / d, 0.0, 1.0));        // depression angle of the view ray
float f = 1.0 - smoothstep(0.0, 0.42, dep);         // 1 at the horizon .. 0 at 24 deg down
vec3 c = mix(mix(wNear, wMid, smoothstep(0.0, 0.55, f)), wFar, smoothstep(0.55, 1.0, f));
vec2 p = vWP.xz + vec2(0.35 * wTime, 0.0);          // river drifts 0.35 m/s along +x
vec4 mk = mix(texture2D(wNearTex, p / 8.0), texture2D(wFarTex, p / 40.0 + 0.37), smoothstep(25.0, 90.0, d));
c = mix(c, wTrough, mk.g * 0.6); c = mix(c, wCrest, mk.r * 0.7); c = mix(c, wGlint, mk.b * (0.3 + 0.5 * f));
```
Mesh: `quadUp(-900, 900, -30, 30, 1, 1, -D0)`. Per frame: `wTime = t`, set 6 colours from the light preset.
Why random-rotated short arcs: foreshortening alone makes them horizontal dashes from ANY heading (aspect = 1/sin(grazing) = 3.4 at 17°, 5.8 at 10°).

| Preset | wNear | wMid | wFar | wCrest | wTrough | wGlint |
|---|---|---|---|---|---|---|
| day | #0c5a8c | #1679ad | #2a9cc8 | #5fcfe6 | #0a4774 | #e8fbff |
| golden | #23306a | #3e5594 | #b98a9e | #d9a088 | #1a2350 | #ffe2b0 |

### Sky shader (textures.md:377-396)
`ShaderMaterial` on a BackSide sphere, uniforms `c0..c3` (vec3) and `e` (vec3 of radians). Fragment:
`el = asin(vP.y)`, then `mix(c0,c1,smoothstep(0,e.x,el))`, `mix(c,c2,smoothstep(e.x,e.y,el))`,
`mix(c,c3,smoothstep(e.y,e.z,el))`. `depthWrite: false, fog: false`. Fog colour should sit near `c0`
(day #d8ecf7, golden #ffd08a).

## A7. On-screen rules and acceptance checks (textures.md:410-451)

Shot rules:
- **Sunlit deck L\* 72-80 on screen.** Albedo-to-screen transfer measured ≈ **-8 L\*, +7 C\***. So with that pipeline use
  lighter fills `["#fdd3a0","#f7ca96","#ffdaa8","#f2c48e","#fad09b"]` (L\* 82-89). Raise albedo before raising the sun.
- **Shade: timber L\* 27-35, deck shade ~45, iron ≥ L\* 19. Only ink and gap cores may go darker.**
- **Painted lines 3-5 px at 1080 and ≤ half the ink outline's contrast.**

Acceptance after first render: deck sunlit L\* 72-80, C\* 35-55, hue 70-78°; deck gaps FWHM 3.5-5 px near, ΔL\* 40-48,
≤ 5 % of pitch; water ≥ 10 L\* drop, crest area far 1.5-5 % / mid ≤ 1.6 % / near ≤ 0.9 %, aspect 3-6; sky day top C\* ≥ 45;
golden C\* ≥ 40 on every stop, no grey midband; clouds 3 tones, underside L\* 79-86, hue 250-280°, edge ramp 8-20 px;
iron darkest 10 % L\* ≥ 18 with bright band; mortar/tile joints FWHM ≤ 4 px.

Prototype (CPU preview 540x960, 4x4 supersampled; camera 6 m above water, pitch 8°, vfov 36°): day gradient
#2e9dc8 -> #0c5a8c, crest 1.6 / 1.0 / 0.8 %, 1.64-1.75 marks per 100², width 10 px (p90 28-30), aspect 3-4, crest ΔL\* +12.3..+12.6.
Widen arcs ~20 % if they look small. Deck from 0.36 m lens: boards L\* 74-76, gaps 2-4 % of pitch.

## A8. Top changes by impact (textures.md:453-477)
1. Sky gradient (sky covers 20-35 % of wide frames). 2. River water (20-40 % of river shots). 3. Deck planks.
4. Stone (neutral light blocks C\* ~10 L\* ~75, thinner lighter mortar ΔL\* ~18, staggered setts). 5. Iron and timber out of black.
Then 6 facadeHD, 7 roofHD, 8 cloudHD, 9 grassHD.

Caveats (textures.md:479-488): our stills were 540p (≈2 px blur in edge numbers); screen colour = albedo x light x grade,
so **keep the on-screen targets and re-tune albedos whenever lighting/grade changes**; cobble and chain recipes follow
general rules, not a measured counterpart; CPU previews had no mipmaps or lighting.

---

# PART B - CHARACTERS (characters.md)

## B1. The diagnosis (characters.md:7-21)
- Coverage: 96 frames from all 20 videos; 38 head-contour fits from 19 videos (23 front + 8 three-quarter usable);
  15 full-body crops from 9 videos; 3 of our stills.
- **Heads**: the reference heads are actually ROUNDER than ours: H/W **0.93** (slightly wider than tall). Ours were
  tall ellipses H/W 1.17. The hand-drawn look comes from: slightly pointed crown + fuller jaw narrowing to the chin,
  ~10 % left/right asymmetry, a few degrees of tilt, a plum outline ~3x thicker on the bottom/shadow side, eyes and
  mouth shifted to the facing side, **no blush, no eye catchlights**.
- **Bodies**: reference adults ≈ **3.5 head-heights** tall: bean torso on long legs drawn as **single thin ink strokes**,
  **ink-dot hands**. Ours were 2.7 HH, limbs ~5x too thick, skin-ball hands, big oval boots = "chibi sticker".

## B2. Head contour model (characters.md:33-52)

Formula (fit model, also used to draw):
```
X = sgn(c)|c|^(2/n), Y = sgn(s)|s|^(2/n)       // c = cos t, s = sin t; n = n_top for upper half, n_bot lower half
X *= (1 + egg*Y) * (1 + asym*sgn(X))           // egg < 0 = narrower chin; asym = one side wider
x = a*X, y = b*Y, then rotate by rot
```

| Param | Reference front median (IQR), n=23 | "Reliable 10" | 3/4 view n=8 | Old ours |
|---|---|---|---|---|
| H/W | **0.93** (0.83-1.01) | 0.96 | 1.04 | 1.17 |
| egg | **-0.125** (-0.15..-0.04) | -0.12 | 0.00 | 0 |
| n_top (crown) | **1.70** (1.40-1.97) | 1.76 | 2.31 | 2 |
| n_bot (jaw) | **2.26** (2.08-2.52) | 2.27 | 1.88 | 2 |
| asym | **+0.10** (0.05-0.12) | +0.10 | ±0.1 | 0 |
| tilt rot | -1° (-8.6..+3.0) per character | ±2.5° | **+19°** | 0 |
| contour wobble RMS | 1.0 % W | 1.2 % | 0.7 % | 0 |

Rules: the silhouette bulges on the side the face turns to; eyes/mouth shift to that same side;
**mean eye-pair shift +0.08 W** (range +0.03..+0.13).

## B3. Outline / ink (characters.md:54-63)
- Median width **5.0 % W** (reliable 10), 5.9 % W (all 23), IQR 4.8-6.9 %. Ours 4.9 % in design, 3.3-4.6 % on screen.
- **Thick/thin ratio around one head (p90/p10) 2.9-3.5** (IQR 2.5-4.2). Ours ~1.0-1.25.
- Width by direction (normalised to the head median; canvas angles): top-right (-68°) **0.65**, top-left (-112°) 0.74,
  left-up (-158°) 0.88, right-up (-22°) 1.02, right-down (22°) 1.05, **bottom-right (68°) 1.11**, bottom-left (112°) 1.00,
  left-down (158°) 0.73.
- **Thickest point clusters at 50-90°, median 64° (bottom-right).** It moves to the left-bottom when light comes from
  the right (one head: left 20 px vs right 7 px on a 361 px head).
- **Ink colour: dark plum #201628 .. #2f1d28** (median core rgb 47,29,40). Under orange light it warms to #5d2c19..#6e3e30.
  Ours crushed to #0a0014 on screen -> lift toward #2a1b28.
- Inner lines (brows, mouth, clothing) ≈ 0.6-0.9x the outline; clothing seams/pockets ≈ 0.4x.

## B4. Face colour and shading (characters.md:65-74)
- Fill: white **#fef9f6 / #e7edf5-#fffcfc**; cream/skin **#ffe0b4, #f6b988, #e9c8ae**; **median luma 0.93** (0.76-1.0).
  Ours rendered #af9886 (luma 0.62) and #e8c5a5 (0.81).
- Shading: **soft crescent** on the side away from the light. Flat to r ≈ 0.6R, then falls over 0.6 -> 0.8R to
  **0.88-0.89x** the lit value. Angular FWHM ≈ 150° around the shadow direction (mostly 45-105°). Not a hard cel edge.
- Shadow tint: white heads x(0.92, 0.90, 0.96) = lavender (#fffcfc -> #f1e6f0); skin x(0.96, 0.86, 0.84) (#ffe7bd -> #f5c69f).
  Follows scene light.
- Texture/grain: none. **Blush: 0 of ~40 faces. Catchlights: 0 of ~40.** (One character had freckle/stubble dots.)

## B5. Facial features (÷ W; y from head centre, + = down) (characters.md:76-89)

| Feature | Reference (13 heads) | Old ours |
|---|---|---|
| Eye spacing centre-to-centre | **0.26** (0.19-0.28) | 0.38 (45 % too wide) |
| Eye height | **0.00** (-0.06..+0.03) | +0.025 |
| Default eye | **lidded half-disc**: lid line 0.18 wide + dark half-disc below (0.18 x 0.10-0.12) = deadpan. Also flat dashes 0.16-0.18 x 0.03-0.05; dot eyes as vertical ovals ≈ 0.09 x 0.13 | round dot 0.107 + white highlight |
| Shock eyes | white sclera circles **0.21-0.24 diameter**, almost touching (gap ≈ 0.02); pupils ≈ 0.06 | 0.17 x 0.2, gap 0.2 |
| Brows | **0.17-0.18 long x 0.045-0.055 thick, tapered, at y -0.20**; often one brow higher (skeptical) | 0.17 x 0.037 uniform at -0.12 |
| Mouth position | **y +0.19** (0.17-0.31), x shifted to facing side | +0.24 centred |
| Neutral mouth | short dash **0.09-0.14 x 0.04-0.06**, often tilted (smirk) | 0.18 x 0.033 |
| Grin / open | 0.22-0.42 x 0.10-0.17 with white **teeth box** + ink dividers; O-mouth 0.19-0.21 x 0.24-0.29 | D 0.28 x 0.18 + tongue |
| Mouth interior | **#54212a / #5c222b** | #5a1e28 |
| Nose / ears | none in front view; 3/4: small nose tick on facing side; hair wraps back of head | potato bump nose |

## B6. Bodies (characters.md:91-154)

Proportions (HH units, measured to head top under any hat):

| Figure | Total HH | Chin -> torso bottom | Torso bottom -> sole | Torso width / W |
|---|---|---|---|---|
| woman | 3.66 | 1.14 | 1.51 | 0.74 |
| bald man | 3.5 | 1.05 | 1.48 | 0.90 |
| hat man | ~3.4 | 1.12 | 1.39 | 0.97 |
| dad | 3.3 | 0.90 | 1.39 | 0.85 |
| coat | 3.45 | - | - | 0.80 |
| cap guy | 3.3 | 1.17 | 1.18 | 0.69 |
| walker 3/4 | 3.6 | 1.10 | 1.54 | 0.68 |
| uniform soldier | ~3.6 | 1.06 | ~1.4 | 0.71 |
| robe | 3.5 | 2.0 (robe) | 0.48 | 0.87 |
| sitting | - | 1.23 | - | 0.58 |
| **adult median** | **3.5 (3.3-3.7)** | **1.1 (0.9-1.23)** | **1.4 (1.2-1.54)** | **0.80 (0.58-0.97)** |
| kids (x3) | **2.7-3.0** | 0.7-1.0 | 1.0-1.15 | 0.47-0.84 |
| old ours | 2.7 | 0.83 | 0.86 | 0.77 |

Limbs (÷ W):
- **Legs: one ink stroke 0.05-0.08 W (median 0.055)**, no knees, slight curve, **A-stance (feet ≈ 0.45 W apart, hips ≈ 0.3 W)**.
  Close-ups sometimes show a thin outlined tube of the same total width. Old ours 0.28 W (5x).
- **Arms: ink stroke ≈ 0.05 W**, start inside the torso sides, no shoulders or elbows. Old 0.25 W.
- **Hands: filled ink dots 0.08-0.15 W (median ≈ 0.11)**, no fingers; props held by the dot. Old 0.23 W skin balls.
- **Feet: short round-capped strokes 0.15-0.25 W long, ≈ 0.07 W thick**, pointing outward (front) or forward (side). Old boot ovals 0.39 x 0.26 W.
- **Neck: none; the head overlaps the torso top.**

Torso: vertical **bean/capsule**, top narrower and hidden under the head, **widest at 60-70 % of its height**, bottom fully
round (radius ≈ half the width), same thick-thin outline. Old ours: rounded rectangle radius 58 (0.33 width) = boxy.

Torso shading: **much stronger than faces - lit side 1.0 -> shadow side 0.55-0.66 as a smooth gradient.** About half
have a **light rim (0.8-0.97) just inside the shadow-side edge**. Old ours: flat + hard 30-unit dark band at the bottom.

Clothing: **at most ~5 elements per torso** (buttons dots 0.04-0.06 W, pocket, belt, tie, collar, stripes), flat fills
with thin inner lines (≈ 0.4x outline). Soldier: 4 brass dots, dark belt with small buckle, soft cap.

Hats: **sit low, covering the top 25-40 % of the head**; base edge follows the skull as a shallow "smile" curve
(sag ≈ 0.05 W); tilt with the head; same outline; brim sticks out on the facing side.
Props: held by dot hands on thin arms, outlined at ≈ 0.6-1.0x weight.

Poses: **torso lean 3-8°; head tilt typically ±5° (3/4 views up to 19°); one arm usually doing something (pointing,
holding, raised) while the other hangs; feet turned outward; rarely perfectly symmetric.**

Ground shadows: real 3D cast shadows of the cards (long at sunset) + soft dark contact blobs under the feet.
Recommended blob **0.5 W x 0.06 W, alpha 0.3, blurred**.

Side / 3/4 views: features slide **0.1-0.15 W** toward the facing side; small nose tick; hair/hat wraps the back;
torso becomes a narrower bean (≈ 0.6 W); legs still two thin strokes, **far leg darker**.

## B7. Drawing spec (design canvas 600 x 1000, soles at y = 975) (characters.md:167-349)

### Builds

| Build | Used for | Head a / b (W x HH) | Chin -> torso bottom | Legs | Total | Torso width |
|---|---|---|---|---|---|---|
| adult | riflemen, parent, townsfolk | 118 / 111 (236 x 222) | 1.10 HH = 244 | 1.40 HH = 311 | **3.5 HH**, crown y ≈ 198 | 0.80 W = 189 |
| stout | officer | 118 / 111 | 1.15 HH = 255 | 1.32 HH = 293 | 3.47 HH | 0.92 W = 217, rounder belly |
| kid | kid | 112 / 108 (224 x 216) | 0.85 HH = 184 | 1.00 HH = 216 | **2.85 HH**, crown y ≈ 359 | 0.72 W = 161 |

Kid heads are almost adult-sized; only the body is shorter. In metres (SU 0.00216): adult head width 0.51 m,
adult height 777 units = 1.68 m, kid 616 units = 1.33 m.

### Head contour per character (seeded by `who.i`)

| Param | Front base | Per-character spread | Side view | 3/4 view |
|---|---|---|---|---|
| b/a | 0.94 | ±0.04 | 0.94 | 1.02 |
| egg | -0.12 | ±0.03 | -0.10 | 0 |
| nTop | 1.75 | ±0.15 | 1.8 | 2.2 |
| nBot | 2.30 | ±0.15 | 2.3 | 1.9 |
| asym | +0.08 x facing (random sign when facing = 0) | 0.06-0.10 | **+0.12** (jaw toward the front) | +0.08 |
| rot | ±4° random | - | +3° | ±12° toward facing side |
| noise | 0.8 % radius, harmonics 2-4, seeded phases | - | same | same |

### Line weights (u = 1 % of W ≈ 2.36 units for adults)

| Line | Width | Rule |
|---|---|---|
| head + torso outline | **w0 = 5u ≈ 11.8** | `w(θ) = w0·(1 + 0.45·cos(θ - θthick))` -> thin 6.5, thick 17.1; `θthick = atan2(-sin(light) + 0.8, -cos(light))` = 65° for upper-left light |
| hats, props | 0.85 x w0, uniform, round joins | |
| legs | 5.8u ≈ 13.7, colour `mix(pants, INK, 0.55)` | no tube/rim; slight bow |
| feet | 7.5u ≈ 17.7 thick, 16u ≈ 38 long | outward in front, forward in side |
| arms | 5.2u ≈ 12.3, colour `mix(jacket, INK, 0.5)` | back arm before torso, front arm after |
| hands | ink dot r = 5.5u ≈ 13 | |
| brows | tapered 5u inner -> 2.5u outer, 17u long | |
| eye lid / dash / arcs | 3.8u | |
| mouth line | 4u | |
| clothing internal lines | 1.5-1.8u | |

**Minimum line width: at texture tier k = 0.4, keep every line ≥ 1.5 / k design units (≈ 4) so it survives mipmapping.**

### Colours

| Role | Hex |
|---|---|
| INK | **#241726** (replaces #221f2e) |
| skins | **#ffe2c2, #f5c9a0, #ecd0b6, #c99067** (must land at luma ≥ 0.85 on screen) |
| skin shadow | `mul(skin, [0.96, 0.86, 0.84])`, e.g. #ffe2c2 -> #f5c2a3 |
| pale "townsfolk white" head | #fbf8f4, shadow `mul(..., [0.92, 0.90, 0.96])` = #e7dfea (lavender) |
| rifle-green coatee | #357650, shadow `mul(..., SH_CLOTH)` = #234e3b |
| cross belts | #f1efe6, rim INK 1.8u |
| buttons | rifleman #d9dde0 (pewter); officer #e8c45a (brass) |
| trousers / leg strokes | #3d4440 -> stroke #2f2b32 |
| boots / feet | INK; kid #f4f1ea with ink rim |
| shako | body #3a3d47, shadow #24262d, peak #16171b, badge #c9ccd2, tuft #2b7a4b; officer band #e8c45a |
| officer sash / moustache | #c0353a / #4a3020 |
| kid | jacket #f08a2c, pants #3b5b9a, cap #e2453c (brim x0.8) |
| parent | coat #7b5ac9, hair #5a3b2a, shoes #5a3b2a |
| mouth / tongue / sclera / sweat | #5a1e28 / #e86e78 / #ffffff / #9fd4ff |
| CHEEK #f3aa98 | **drop** (reference has no blush) |

### Face library (characters.md:232-258; code 490-557)

Layout: eyes at `x = cx + 7u·facing ± 13u` (shock ±12u), `y = cy`; brows `y = cy - 20u` (**-17u under a brim**);
mouth `x = cx + 8u·facing, y = cy + 20u`. Eyes `[back, front]`, brows `[inner, outer]` in u (+ = down).

| Expr | Eyes | Brows | Mouth |
|---|---|---|---|
| neutral | lid (rx 7u, ry 6u half-disc under 18u lid line) | [0, -1] | dash 11u, tilted 0.8u (smirk) |
| stern | lid | [+3, -2] (V) | frown arc 13 x 3.5u |
| grin | happy ∩ arcs 16 x 6u | [-3, -3] | D 24 x 8u + white teeth band 3u |
| laugh | squeeze > < | [-4, -4] | open D 32 x 11u + tongue |
| whistle | closed dashes | [-2, -4] | small "o" 7 x 8u, shifted +4u |
| nervous | small ovals 6 x 9u | [-3, +2] (worried) | wave 18u amp 1.5u + sweat drop (#9fd4ff at cx+40u, cy-22u) |
| shock | white circles 22u almost touching, pupils r 3u | raised arcs -7u | tall O 18 x 22u |
| relief | happy ∩ | [-2, +1] | wide smile arc 22 x 6u |
| relief_open | happy ∩ | [-2, +1] | D 24 x 8u |
| dazed | spirals r ≈ 8u | [-3, +2] | small wave |
| pained | squeeze (back) + lid (front) | [-3, +2] | teeth box 24 x 8u, 3 dividers |
| smile | dot ovals 7.6 x 11u | [0, -1] | smirk arc 14 x 4u |
| smile_closed | happy ∩ | [0, -1] | smile arc 16 x 4.5u |
| lick | dot ovals, look sideways | [0, -1] | smile + tongue 7 x 9u at corner |

Across all: **no blush, no catchlights**. Optional quirk: facing-side brow 2u higher (skeptical).
Eye kinds in code: `dot` (ell 3.8u x 5.5u), `small` (3u x 4.4u), `lid`, `happy` (arc 200-340°, 8u x 6u, +3u), `dash`
(±8.5u), `squeeze` (chevron ±6u x ±5u), `shock` (ell 11u white, ink 2.6u, pupil r 3u offset -1.5u·side, +1.5u),
`spiral` (14 points, r growing 0.55u per step, lw 2.4u). `look` shifts pupils by `look * 3u`.

### Body construction, front view (characters.md:260-278)
Draw order: 1 legs + feet; 2 both arms + dot hands (from behind the bean; an arm goes after the torso only when its
hand is in front holding a prop); 3 torso: shaded fill -> clothing clipped to torso -> ink ring; 4 head: shaded fill ->
ink ring; 5 hat; 6 face last (brows may overlap a brim).
Placement:
- Hips at `torsoBot - 0.12 HH`, x ±15u; feet at x ±22u.
- **Arms hang OUTSIDE the bean**: shoulder (±0.85·Ta, chin + 0.12 HH); elbow ±(1.12·Ta + 4u), y + 0.48 HH; hand 3u further out at chin + 1.04 HH.
  (First preview put arms inside the torso and they vanished behind it.)
- Torso blob: `a = (tw/2)·W/1.06, b = (torsoBot - (chin - 0.25 HH))/2, nTop 2.2, nBot 2.6, egg +0.12, asym 0.04·facing`.
- Body lean: rotate everything above the hips 3-6°; **marchers alternate ±2° with the step**.

### Side view (characters.md:280-287)
- Head: same blob, asym +0.12, rot +3°.
- Face: one eye at hx + 27u, y = hy. Brow taper from [ex-7u, ey-20u] to [ex+8u, ey-21u]. Mouth dash [hx+26u, hy+21u] -> [hx+36u, hy+20u].
  Nose tick [hx+44u, hy+4u] -> [hx+47u, hy+9u] -> [hx+43u, hy+10u] at 3u. **No skin bump nose, no ear.**
- Torso: bean a = 0.31 W, egg +0.10, asym +0.06 (belly forward), lean +4° when marching.
- Legs: thigh = shin = 0.72 HH (160), stroke 5.8u. **Far leg `mix(pants, INK, 0.75)`, near leg 0.55.** Feet 16u forward.
- Arm: one 5.2u stroke, length 0.95 HH, swinging ±30°, dot hand. Shako peak = forward wedge 16u, tuft front-top.

### Shading layer (characters.md:289-304)
- Head: flat fill, then soft crescent (shape in shadow colour, then a copy shifted toward the light by **0.30R**, base colour,
  `blur(0.09R)`, clipped). Full shadow only in the outer ~30 % on the far side, fading by ±75-110°.
  Multipliers SH_SKIN [0.96, 0.86, 0.84] / SH_WHITE [0.92, 0.90, 0.96].
- Torso: same but broader: shift **0.55R, blur 0.18R, SH_CLOTH [0.64, 0.66, 0.74]**; optional 2u rim light
  `mix(jacket, #ffffff, 0.45)` at 55 % alpha.
- Light direction: per shot in cast.ts, **quantised to 45°**; outline thick side = `thickAngle(light)`.
- Grain: off (≤ 2 % multiply noise if ever wanted). **Not a hard cel step.**

### Cast-specific numbers (characters.md:306-349)
- **Riflemen (1831)**: adult; coatee #357650; two 5.5u white cross belts from (±0.75·Ta, chin - 0.05 HH) to (∓0.8·Ta, torsoBot - 0.1 HH),
  clipped to torso; optional 7u pewter plate; 4 pewter buttons r 2.2u spaced 0.2 HH, shifted 2u to facing side.
  **Shako**: base 0.25 HH below crown, half-width 46u, base sags 3u; bell top half-width 52u; height 0.56 HH (≈ 124);
  fill #3a3d47 with crescent; peak half-ellipse 34u x 0.045 HH #16171b; badge 6u ring #c9ccd2; tuft r 7u #2b7a4b;
  tilts ±2° extra. **Rifle**: wood band 5u #7a4b2a (rim 1.5u) from (300+30u, torsoBot - 0.05 HH) up past the crown by
  0.35 HH; steel 2.4u #8d949c over top 40 %; front hand on the stock at 45 % height. Moustache (skins 1, 3): two tapered
  commas 9u, 4u -> 1.5u, #4a3426 / #2a201a, total ≈ 0.36 W.
- **Officer**: stout; `shako_tall` 0.66 HH with gold band 0.06 HH at 0.07 HH below top; crimson sash 0.13 HH band at
  torsoBot - 0.32 HH, knot on facing side; sword 3u silver band (rim 1.2u) from back hip at 25°; handlebar moustache two
  10u tapers 5u -> 1.5u #4a3020; default stern (lid eyes + V brow).
- **Kid**: 2.85 HH; orange bean 0.72 W; blue trouser strokes; white shoe strokes with 1.5u rim. Cap = head crown above
  0.30 HH pushed out 3 %, #e2453c; front peak half-ellipse 32u x 0.06 HH, x0.8 shade, shifted 4u to facing side
  (a side wedge brim covered an eye, so dropped). Swing seat offset: hip y ≈ 975 - 1.0·216 - 0.12·216 ≈ 733 -> seat `rope + 20 - 733·0.92`.
- **Parent**: adult, purple coat, brown shoes; hair = crown above 0.42 HH pushed out 3 %, #5a3b2a, 3 scallops on the
  lower edge, 1-2 ink strands at 1.2u, part on the facing side.
- **Townsfolk**: adult. **Top hat**: base half-width 0.31 W, seated 0.22 HH below crown, 0.8 HH tall, slight flare,
  brim ellipse 0.45 W x 0.05 HH, band = coat x0.9. **Bonnet**: blob 1.15x the head drawn behind it, 7u brim band arc over
  the forehead, 2u ribbon under the chin. **Dress**: bell bean (egg +0.35, nBot 3) from chin - 0.2 HH to 0.35 HH above
  soles, two short ink ankle strokes below.

## B8. Implementation recipe (characters.md:353-670) - signatures and key code

Where changes go: `toon.ts` (INK, SKINS, CHEEK unused; `Outfit.build?: "adult"|"stout"|"kid"`; Pen methods `clip`,
`shadedFill`, `inkRing`, `band`, `rimLight`; helpers `mix`, `mul`, `rnd`, `Blob`, `blobPts`, `headBlob`, `thickAngle`,
`taper`, `rotPts`; `faceFront -> faceV2 + FACE`; `hatFront -> hatV2`; `bodyFront -> bodyFrontV2`; `bodySide` per side spec;
`FrontOpts`/`SideOpts` get `light?, facing?: -1|0|1, seed?`) and `cast.ts` (`person()` passes `seed: who.i`, `facing`,
`light: light2D(cam, sunDir, mirror)`; these enter the texture cache key through `fkey()` automatically).

Card material note (characters.md:368): old faces rendered at luma 0.62-0.81 because of `MeshLambert + emissiveIntensity 0.36`.
Target **≥ 0.85 lit, ≈ 0.75 in shade** (e.g. `emissiveIntensity 0.75` with `color 0x808080`). Shipped code solved this
differently (see C2: `cardshade.ts`).

Key signatures (all in toon.ts style):
```ts
export const mul = (c: string, m: [number, number, number]) => string;   // per-channel multiply of a hex colour
export const mix = (a: string, b: string, t: number) => string;           // hex lerp
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
export type Blob = { a; b; nTop; nBot; egg; asym; rot; noise; seed };     // all numbers
export const blobPts = (cx, cy, B: Blob, n = 96): P2[];   // clockwise on screen: right -> down -> left -> up
//   e = 2 / (s < 0 ? nTop : nBot); noise r = 1 + noise*(cos(2t+ph0) + 0.7cos(3t+ph1) + 0.5cos(4t+ph2))
export const headBlob = (seed, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed });
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => void;   // quad + round end dots
// Pen methods
clip(pts, fn)
shadedFill(pts, base, shadow, light, R, shift = 0.3, soft = 0.09)   // report version: blur filter
inkRing(pts, w0, thick, k = 0.45, col = INK)                         // variable-width ring, even-odd fill
band(pts, fill, w, rim)                                              // strap: ink stroke w+2rim, then fill stroke w
rimLight(pts, col, light, w, alpha = 0.55)
export const faceV2 = (p, cx, cy, W, expr, facing = 0, look = 0, blink = false, brim = false) => void;
const BUILD = { adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 }, stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
                kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 } };
export const bodyFrontV2 = (p, o, { phase, expr, mode = "march", look, blink, lift = 60, tilt, headTilt, light = rad(-135), facing, seed = 1 }) => void;
const light2D = (cam, sunDir, mirror = false) =>
  Math.round(Math.atan2(-sunDir.y, sunDir.dot(cam.right) * (mirror ? -1 : 1)) / (Math.PI / 4)) * (Math.PI / 4);
```
Report bodyFrontV2 animation numbers: march bob `5·cos(2·2π·phase)` units (stroll 3); leg lift `max(0, sin(2π(phase + ph)))·L`
with L = lift (march), 0.45·lift (stroll), 0 (stand); legs phase offsets 0 and 0.5; arm swing `sin(2π·phase)` moves the
hand `swing·14u` sideways and up by `|swing|·8u`.

Notes (characters.md:667-670): `ctx.filter = "blur()"` works in Chromium canvases (what Remotion renders with).
Texture draws are cached per key, so the blur is paid once per pose / light / expression. Light shift rotates with
`p.rot`; negligible under 8°.

## B9. Top 5 character changes (characters.md:674-696)
1. Build + limbs: adults 3.5 HH (1 : 1.1 : 1.4), kid 2.85; legs 0.058 W strokes, arms 0.052 W, hands 0.055 W (radius) ink dots, feet 0.16 W; bean torso.
2. Head contour: superellipse bean H/W 0.94, egg -0.12, nTop 1.75 / nBot 2.3, 8 % bulge, tilt ±4°, seed variation, 0.8 % noise.
   **The fix is NOT "less round"; it is taper + asymmetry + tilt.**
3. Thick-thin plum outline: INK #241726, w0 = 5 % W, `1 + 0.45·cos(θ - θthick)`.
4. Face library: eyes 0.26 W apart, lidded deadpan default, shock 0.22 W almost touching, no blush, no catchlights,
   tapered brows at -0.20 W, small mouths at +0.20 W, features slide 0.07-0.08 W to the facing side.
5. Value and shading: faces luma ≥ 0.85; soft crescent x0.89; torso gradient -> x0.6 with optional rim; grain off.

---

# PART C - How it is actually built in the shipped templates (connection notes)

## C1. Shipped texture values vs the report (paint.ts / world.ts / lights.ts)

| Thing | Report | Shipped code |
|---|---|---|
| planksHD fills | #efbd82.. (L\* 75-82) or lighter #fdd3a0.. | **ochre #c99669 #c18e64 #d19f6e #bb8961 #c69466 #c79b6f** (Lab L 61-69, C\* 31-35) with `jit()` ±5 % - because the later grade lifts deck chroma ~x1.4 and hue ~+10° (paint.ts:271-275) |
| plank gaps | 8 px #66300f + 1 px rim (~4 %) | **GAP = 12 px near-black #1c0c05 + 3 px rim rgba(40,18,8,.6)** (~5 % of pitch, "survives mips") (paint.ts:270, 312-315) |
| plank grain | 10 strokes α .13-.14 | 18 strokes α .2-.3 + 4 darker figure lines rgba(70,32,10,.4) lw 3.5 |
| butt joint / nails | #66300f / #3a2212 | #24110a 7 px / nails #22140c |
| stoneHD palette | caller's cols | **`STONE_PAL` per key overrides the caller's cols** (paint.ts:349-361): stoneHD/towerHD #d6c4a8.. mortar #a08e76; tstoneHD #e2d5bc.. #a69881; wallHD #c3b198.. #887762; copeHD #e5d9c1.. #a99982 (warm, saturation -35 %) |
| stoneHD size | 1024² | 2048² at repeat 0.5 for towerHD, tstoneHD, wallHD, stoneHD (same texel density, fewer repeats) + grime blotches (14 per 1024²), rain streaks (8), 160 pits |
| cobbleHD | 1024² = 4 m, 24 courses | **2048² = 8 m at repeat 0.5, 48 courses**, joints #867967, 7 warmer cols, 40 patches, 260 pebble dabs |
| facadeHD | 96 px/m | **72 px/m** (`Math.min(72, 2048 / max(wm, hm))`) + soot blotches on brick |
| M.iron | #4b5468 Lambert | **MeshPhongMaterial #3d414c, specular #8a8a8a, shininess 60**, wrapped by `twoTone(..., 0.15)` (world.ts:165) |
| chainHD | navy #262c3e / #5f6880 | slate #4a5160 / #8a93a3 / #e4e6ea; only a fallback - chains are real link geometry now |
| Sky | 4 stops `SKY.day` e [3,12,30] | **5 stops** in `lights.ts LOOK`: day #b8d0ec #9cbfea #6a9fe0 #4f8cdb #3373cc at [0,3,8,16,40]°; golden #ffc47c #f7ae78 #e8967c #c4848e #8a6f8a at [0,4,10,20,40]° |
| Water colours | day near #0c5a8c ... far #2a9cc8 | `LOOK.day.water`: **near #22a7b6, mid #167fb2, far #1a5596**, crest #7ddfe8, trough #0e4a80, glint #ffffff; golden near #1e3a6e mid #355f96 far #d4a48e crest #d9a088 trough #16294f glint #ffe2b0. Colours are pre-inverted through the tone map (`untone`) |
| Water shader | as A6 | same maths (world.ts:548-559), uniforms renamed `wNearC/wMidC/wFarC` + `wShade` |
| Clouds | CLOUD_DAY / CLOUD_GOLD | same values, read from `LOOK.*.cloud` |
| ctex anisotropy | 16 for deck/water | ctex default 8; deck + water set 16 |

## C2. Shipped character code vs the report (toon.ts / cast.ts / cardshade.ts)

- `INK #241726`, `SKIN #ffe2c2`, `SKINS`, `SH_SKIN`, `SH_CLOTH`, `BUILD`, `headBlob`, `thickAngle`, `inkRing`, `band`,
  `FACE` table: **identical to the report** (toon.ts:6-57, 145-249, 429-433). There is no SH_WHITE in shipped code;
  a new `SH_FELT [0.62, 0.62, 0.7]` is used for hats/hair.
- `blobPts` default n = **72** points (report 96).
- `shadedFill` changed: **radial gradient** centred `shift·R` toward the light, `shift = 0.45, r0 = 1.05, r1 = 1.25`
  (flat to ~0.6R on far side, full shadow by ~0.8R) - no blur filter (toon.ts:124-132).
- Torsos use a NEW `gradFill(pts, base, shadow, light, flat = 0.22)`: linear gradient along the light, lit edge = base,
  far edge = shadow (toon.ts:134-143). `rimLight` from the report is not in shipped code.
- Default light `DEF_LIGHT = rad(-120)` (report used -135).
- Blink is a number 0..1 (`lidOf`): half-lid kinds `slit` (lid) and `shockHalf`; dot/small eyes become `lid` at half,
  everything becomes `dash` when shut except happy/squeeze/spiral (toon.ts:250-253).
- Moustache drawn in the face function: two tapers from (mx ± 1.5u, cy + 12.5u) to (mx ± 15u or ±19u stout, ...), 4.5u
  (stout 5.5u) -> 1.6u.
- Hats: `hatBehind` (bonnet #e9cf8f blob 1.17 x 1.13 of the head) and `hatOn` (shako, shako_tall, cap, hair, tophat
  #2e2a36 with band = jacket x0.9 at 0.14 HH, bonnet brim #d6b46a). Cap no longer counts as a brim for brow height.
- Props: `Prop = null | "icecream" | "shako" | ["hammer", 0..1]`; `wave` arm; rifle at the order from
  (300+47u, torsoBot+0.12 HH) to (300+64u, crown-0.32 HH).
- Modes: front `march | stroll | stand | sit | fall` (+ dress), side `march | stand | swing | push`.
- **Walk cycle (front)**: bob amplitude `0.025·tall` (march) / `0.015·tall` (stroll), lowest at contact
  (`cos(2·2π·phase)`); leg lift `lift·1.25` (march) / `lift·0.55` (stroll), default lift 60; upper body sways
  ±1.6° (march) / ±1.0° (stroll) about the hips; head rotation composed with body rotation via `rotAbout` + post-translation.
- **Walk cycle (side)**: stride `370·stride` units (= 0.8 m, 1.6 m/s at 2 steps/s); stance foot slides back at walking
  speed; swing foot follows a cycloid (`x = -S/2 + S·s - (S/π)·sin(2πs)`), lift `max(22, 40 + 70·(stomp - 1))`;
  hip height from the stance leg with 3.5 % knee give; two-bone IK (`ik()`), knee forward; lean `4 + 3·cos(2·2π·phase)`
  (7° at contact, 1° at passing); far leg `mix(pants, INK, 0.75)`, far arm `mix(jacket, INK, 0.68)`; arms swing ±30°.
  Story timing: `marchPhase(tau)` 1 Hz cycle = 2 steps/s, footfalls at phase 0 and 0.5 (story.ts:29).
- **Blinks** (cast.ts:168-185): `LID = [0.5, 1, 1, 0.5]` = 4-frame blink (half / shut / shut / half); next blink
  `15 + 54·hash` frames later = **0.5-2.3 s**; a blink is forced on every expression swap (`SWAPS` times per shot) so the
  shut frames hide the change; expression/action changes land `LEAD = 2/FPS` (2 frames) before the word onset.
  Whistlers do not blink.
- **No lip-sync.** Neither report mentions it and the code has no phoneme/mouth-flap logic. Mouths only change with the
  expression, which is switched on story beats (e.g. `exprMarch` per shot id, cast.ts:227-238).
- **Card placement in 3D** (cast.ts): drawing pooled per unique key (`Pool.req/flush`); plane `600·SU x 1000·SU` translated
  so the design sole line (y 975) sits at the object origin; **yaw-only billboards**, `rotation.order = "YXZ"`;
  `MeshLambertMaterial({ alphaTest: 0.5, side: DoubleSide })` patched by `cardShade()`; `alphaToCoverage = false`
  (it left 1 px seams on blurred far cards); custom depth material for shadows; `renderOrder 1`; on the `NOINK` layer so
  the world ink pass does not outline the quad. Resolution tiers by distance: d < 3.2 m -> 1800x3000 (k 3.0);
  < 6.5 -> 1080x1800 (1.8); < 16 -> 480x800 (0.8); else 240x400 (0.4) (sized for a 1440x2560 final).
  Head shapes: `seedOf(i) = ((i·5 + 3) % 7) + 1` = only 7 head shapes so in-step marchers share canvases.
  View: side view when `cos < 0.57` between walk direction and camera; mirrored when walking toward screen-left.
  Light on the drawing: `light2D(cam, mirror)` from the scene sun (`findSun` writes into `SUN` each stage), quantised to 45°.
- **Card lighting** (cardshade.ts): no emissive; scene tint `mix(1, uCharTint, 0.55)` normalised by luma^0.7; cast-shadow
  floor `charShade` (~0.86-0.88); side gradient toward the real sun (head `min(charGrad·5.5, 0.4)`, torso `bodyGrad·1.6`),
  far side tinted `sideTint` (lavender); top +5 % on the head when sun is high; +4 % lift on the sun side; gain 1.03;
  golden-only inner warm rim (0.95, 0.52, 0.16) on the outermost ~2 px of skin/torso facing the sun.
  Preset values: day charTint [1.0, 0.94, 0.92], charShade 0.86, charGrad 0.07, bodyGrad 0.2, sideTint [0.92, 0.90, 0.96];
  golden [1.0, 0.78, 0.56], 0.88, 0.1, 0.25, [0.85, 0.80, 0.95] (lights.ts:19, 28).
- **Contact shadow** (cast.ts:203-222): multiply blob, blue-violet `CONTACT` day [0.2, 0.21, 0.33], golden [0.24, 0.2, 0.33],
  size 0.52 x 0.4 (x scale) m; by day also a soft tail `TAIL [0.42, 0.44, 0.62]` stretched away from the sun, length
  `clamp(1.6 / tan(sun elevation), 0.5, 2.4)` m; golden casts real card shadows instead (`actorShadow: true`).
  Blob textures have mipmaps OFF (they fade at grazing views otherwise).

---

## Bugs / contradictions

1. **Day water gradient is reversed in the shipped look.** textures.md measured "lighter and more cyan toward the horizon,
   darker near the camera" and recommends day wNear #0c5a8c (dark) .. wFar #2a9cc8 (light). Shipped `lights.ts:49` has
   near #22a7b6 (light teal) and far #1a5596 (dark navy). In the shader `wFarC` is used at the horizon (f = 1). Golden
   follows the report direction. Either a deliberate later re-tune with no note, or a mistake. Check on a render.
2. **`stoneHD` silently ignores the caller's colours** for keys in `STONE_PAL` (paint.ts:359-360). `world.ts:161-162`
   still passes custom `wallHD` / `copeHD` palettes that never get used. A new story that calls
   `stoneHD("wallHD", myColours)` will not get `myColours`. Use a new key name.
3. **ctex seeding collides.** `rng(key.length * 131 + key.charCodeAt(0))` (paint.ts:15): any two keys with the same length
   and first letter get the same random stream. Every `roofHD#xxxxxx` key (13 chars, starts "r") draws an identical tile
   pattern; facade keys like `facHDhf0_10_8` vs `facHDhf1_10_8` are identical too. cloudHD works around it with its own
   seed (paint.ts:668). For variety, seed from a real string hash.
4. **Report bodyFrontV2 head rotation bug** (characters.md:585, 608): the torso rotates about `(300, torsoBot)` but the head
   then rotates about the UNROTATED chin `(300, chin)`, so with `tilt ≠ 0` the head detaches from the torso. Shipped code
   fixes it with `rotAbout` + post-translation (toon.ts:595-596). Do not copy the report snippet as-is.
5. **Outline ratio does not match its own measurement.** `1 + 0.45·cos` gives thick/thin = 1.45 / 0.55 = **2.6:1**, while the
   measured p90/p10 is 2.9-3.5 (characters.md:59, 199). k ≈ 0.5-0.55 would match 3:1.
6. **Line minimum vs line spec.** characters.md:210 says every line ≥ 1.5/k ≈ 3.75 design units at tier k = 0.4, but its
   own spec has clothing lines 1.5-1.8u (3.5-4.2 units), hair strands 1.2u (2.8 units), ink rims 1.5u: some fall below
   the minimum and vanish on far cards.
7. **Hand size wording.** §1.5 measures hand dots as 0.08-0.15 W (diameter, median 0.11); §4 says "hands 0.055 W ink
   dots" which is the radius (r = 5.5u). Easy to misread as half size.
8. **Plank gap advice vs shipped.** Report: "gaps half as wide and twice as dark, ~4 % of pitch, ΔL\* 40-48, #66300f".
   Shipped: 12 px near-black #1c0c05 + 3 px rims = 18/256 ≈ 7 % total band (core 4.7 %), much darker than the measured
   #571e00-#6b2903. It is a deliberate "survive mipmaps" choice but contradicts the measured reference contrast.
9. **Two different "lighter fill" sets in the same report**: §5.4 says use `#fdd3a0..` (L\* 82-89); the appendix default is
   `#efbd82..` (L\* 75-82); shipped uses darker ochre `#c99669..`. The right albedo depends on the current grade; always
   re-measure on screen.
10. **`M.iron`**: report says #4b5468 (to keep iron ≥ L\* 19); shipped uses darker #3d414c Phong. Check the L\* ≥ 19 rule on renders.
11. **Facade density**: report target 96 px/m; shipped 72 px/m (the report's own fallback). Fine, but close-ups of houses will be softer.
12. Report `shadedFill` uses `g.filter = blur()` (Chromium-only canvas feature); shipped swapped to a radial gradient,
    so the "0.30R shift / 0.09R blur" numbers in the report are no longer the live ones (live: shift 0.45, ramp 1.05-1.25R).
13. Report `hatV2` passes `brim = true` for caps (brows drop to -17u); shipped excludes caps. Minor.
14. The water recipe comment says `waterNear` is "~0.3 % crest area" while the acceptance target for near is ≤ 0.9 % and the
    prototype measured 0.8 % near (mix of near/far textures). Not a bug, but the comment number is not the on-screen number.
15. **Dead references**: both reports cite `references/textures/...`, `references/characters/...`, `data/*.json`,
    `scripts/*.py`, `proto/paint_recipe.ts` (which imports from a non-existent `./shim`), `tscheck/check.ts`. None are in
    the repo. The acceptance checks (§5.5) say "re-run `scripts/measure_patches.py` / `water.py` / `sky.py`" - those
    scripts are not shipped, so the checks cannot be re-run as written. `templates/scripts/short_qa.py` and
    `sbs_sheet.py` exist instead (other slice).

## Hard-coded paths & versions

- `your Remotion project` is a placeholder for the user's Remotion project path (textures.md:4, 27; characters.md:4).
  Old stills at `your Remotion project/out/bridge/test/` (b_\*.jpg, c_\*.jpg, 540x960). Source dir `src/videos/bridge/`.
- `reel-kit/src/videos/bridge/paint.ts` - the original project name (textures.md:493-495, 869).
- `references/textures/` and `references/characters/` sub-folders (side/, crops/, data/, scripts/, proto/, mosaic/, tscheck/) - not shipped.
- Reference videos `references/vids/NN_<id>.mp4`, contact sheets `references/measure/...` (CONTEXT.md:13-15) - not shipped.
- Versions assumed: **three.js 0.175**, **Remotion 4.0.290**, @react-three/fiber 9.1.2, @react-three/postprocessing 3.0.4,
  postprocessing 6.37.2 (CONTEXT.md:29-30). Tools used for the study: python numpy 2.4, PIL 12, scipy 1.18, ffmpeg.
- Render assumptions: composition 1080x1920 30 fps; character tiers sized for a 1440x2560 final (cast.ts:129).
- Lens assumptions baked into numbers: **vfov 36°** (texel table, sky stop elevations, water depression 0.42 rad ≈ 24°);
  deck lens 0.36 m above deck; caption band rows 874-934 of 1280 (reference only).
- Canvas features assumed: Chromium canvas (`ctx.filter = "blur()"` in cloudHD and the report shadedFill) - Remotion's
  headless Chrome. Would break in Firefox/Safari previews.
- Old-code line numbers in textures.md §5.2-5.3 (world.ts 102-107, 127-134, 185-188, 194, 209, 217, 279, 282-283;
  build.ts 196, 204-205, 286, 300-301) and characters.md (cast.ts line 65) refer to the PRE-study files and do not match
  the shipped templates.
- Bridge-specific constants inside the recipes: river flow 0.35 m/s along +x, water quad x -900..900, z -30..30,
  `D0` deck height 6.0 m, swing hip 733, `SWAPS` blink times (16.17, 17.3, 19.48 ... s), `SIGN_AT`, etc.

## What to change for a new story

Textures / world:
1. **Reuse the rules, not the bridge palette.** Keep: flat colour fields; painted lines 3-5 px at 1080 and ≤ half ink
   contrast; shade never black (timber L\* 27-35, iron ≥ 19); saturated sky (C\* ≥ 45 day, ≥ 40 sunset, hue rotating
   through coral/pink/lilac); 3-tone clouds with lavender underside and no outline; water deep near / light far with
   sparse horizontal marks thinning toward camera; blue-violet ground shadows.
2. **Write new painters for new surfaces** with the shared helpers (`wrapX`, `wrap2`, `blotch`, `grain`, `nail`, `rr`,
   `jit`): e.g. rocks (two flat planes, warm lit #caae98-ish / cool shade #60737c-ish, no lines), sand (#b0937f, std ~3.7,
   cream pebble dabs), snow, interiors, metal hulls (matcap band 25-30 %), clapboard (lines every 23-28 px).
3. **Pick texel density from the lens**: `px/m = 2954 / D` (vfov 36°); texels/m = px/m / M with M ≤ 3 at working distance,
   ≤ 6 for the closest shot. Budget memory: 2048² ≈ 22 MB, 1024² ≈ 5.6 MB.
4. **New ctex keys**: give every new texture a unique key, and do not rely on `STONE_PAL` keys if you want your own colours.
   Consider replacing the ctex seed with a string hash so roofs/facades of different colours are not identical.
5. **New light presets**: add entries to `LIGHTS` and `LOOK` (sky 5 stops by elevation, water 6 colours + shade, cloud
   palette) - e.g. "night-blue for the explanation" beat (STYLE_BIBLE.md:31). Re-tune albedos to hit the on-screen targets
   after the grade (the transfer was about -8 L\*, +7 C\* before the grade; ~x1.4 chroma, +10° hue after).
6. Re-run the acceptance table (A7) on first renders with whatever QA script exists (`templates/scripts/short_qa.py`).

Characters:
1. **New outfits** = new `Outfit` objects (jacket, pants, boots, hat, belt, buttons, sash, moustache, skin, cap, hair,
   dress, build). Keep ≤ 5 clothing elements per torso, flat fills, inner lines ≈ 0.4x outline.
2. **Keep the construction**: adults 3.5 HH (1 : 1.1 : 1.4), kids 2.85 HH with near-adult heads, stout 3.47 HH; bean torso;
   single-stroke limbs (legs 5.8u, arms 5.2u), ink-dot hands r 5.5u, foot strokes 16u x 7.5u; no neck, no ears, no
   blush, no catchlights; plum INK #241726 thick-thin outline weighted away from light; lidded deadpan default eyes
   0.26 W apart; features slid 7-8u to the facing side.
3. **New hats/props**: add a branch to `hatOn` / `hatBehind` and to `Prop`. Rules: hat sits low over the top 25-40 % of the
   head, base sags ~3u following the skull, tilts with the head ±2°, outline 0.85 x w0, brim out on the facing side;
   brows drop to -17u under a brim. Props are held by the dot hand, outline 0.6-1.0x.
4. **New poses** (pointing, holding, raised arm): add to the arm builder in `bodyFront`; rule "one arm busy, one hangs";
   torso lean 3-8°, head tilt ±5°; feet outward; avoid mirror symmetry.
5. **New expressions**: add to `Expr`, `FACE` (eyes [back, front], brows [inner, outer], mouth kind) and the eye/mouth
   switch. Swap expressions on story beats 2 frames before the word, and force a blink across the swap.
6. **Story timing per shot**: rewrite `exprMarch`-style functions and `SWAPS` (blink-on-swap times) in cast.ts for the
   new script. Blinks stay automatic (0.5-2.3 s, 4 frames). There is no lip-sync; if the new story needs talking close-ups,
   that is NEW work (a mouth-flap driven by the voice track's word timings would have to be added).
7. **Head variety**: `seedOf` gives only 7 head shapes (for crowds sharing canvases). For a small cast of named
   characters give each a fixed unique seed; per-character spreads are b/a ±0.04, egg ±0.03, nTop/nBot ±0.15, rot ±4°.
8. **Skin tones**: SKINS #ffe2c2, #f5c9a0, #ecd0b6, #c99067 must land at luma ≥ 0.85 on screen; check after grade.
   Add more tones if the story needs them, with the SH_SKIN shadow multiply.
9. **Lighting of cards**: keep `cardShade()`; new light presets need charTint / charShade / charGrad / bodyGrad / sideTint.
   Keep contact blobs (and real card shadows at low sun).
10. Scale: 1 design unit = 0.00216 m. If the new world has a different human scale (giants, kids-only cast, animals),
    change `SU` per character via `scale`, not the drawing proportions.

# 05 - World building: `paint.ts`, `build.ts`, `world.ts`

Repo: `mromidev/claude-animated-shorts`, read-only clone at `<ROOT>\repo`.
All paths below are relative to `templates/bridge/` unless stated. `file:line` refers to the clone as read on 2026-11-10.

## Files read

| File | Lines | How read |
|---|---|---|
| `templates/bridge/paint.ts` | 720 | every line (slice) |
| `templates/bridge/build.ts` | 703 | every line (slice) |
| `templates/bridge/world.ts` | 578 | every line (slice) |
| `templates/bridge/story.ts` | 348 | every line (constants, cameras, FOREGROUND the world reads) |
| `templates/bridge/shade.ts` | 77 | every line (`twoTone`, `TONE`, `CHAR`, `LFB`, `untone`) |
| `templates/bridge/lights.ts` | 63 | every line (`LIGHTS`, `LOOK`) |
| `templates/bridge/Bridge.tsx` | 116 | every line (how `World` is created and driven) |
| `templates/bridge/cast.ts` | 473 | lines 1-125, 225 + grep (Pool, Actor, Fx, Place/FxPlace types, SIGN_AT, SU_SWING) |
| `templates/bridge/ink.ts` | 393 | lines 1-60, 370-393 (NOINK layer, `noInkFallback`) |
| `templates/bridge/toon.ts` | 909 | lines 72-100, 826-860 (`Pen.ell`, `fxSign`) |
| `references/reports/textures.md` | 489+ | lines 250-489 (texel density table, painter recipe the HD painters came from) |
| `SKILL.md` | - | lines 40-80, 135-160 (world steps, gotchas) |
| `README.md` | 33 | all |
| `references/reports/CONTEXT.md` | - | lines 20-50 (stack versions) |

---

## 0. The big picture in one page

- **What these three files do.** They build the whole 3D place the cartoon cards stand in.
  - `paint.ts` paints every surface texture on an HTML canvas (Canvas2D) at run time. No image files.
  - `build.ts` holds generic geometry helpers (quads, boxes, a merger called `Batch`, a "tube along a path" called `Strand`), the cartoon trees, the cloth banner, the Kenney prop loader glue, the house builder, and `buildTown()` (the whole town on both river banks).
  - `world.ts` holds the `World` class: sky, sun, fog, clouds, ground, river, the suspension bridge (rebuilt every frame from story physics), park swing frame, smoke, a sign, the cast cards, and the per-frame `update()`.
- **Who calls whom.**
  - `Bridge.tsx:52` does `new World(kit)` once per canvas, after `loadKit()` (world.ts:21) resolves.
  - `Bridge.tsx:76` calls `world.update(id, f, camera, scene)` every frame. It returns the camera look point.
  - `world.ts` imports `build.ts` (geometry + town), `paint.ts` (textures), `shade.ts` (two-tone lighting), `lights.ts` (presets), `ink.ts` (NOINK layer), `cast.ts` (cards), `story.ts` (timeline + bridge physics + cameras).
  - `build.ts` imports only `story.ts` (for `D0`), `paint.ts` and `shade.ts`.
  - `paint.ts` imports only `three`.
- **Everything is deterministic.** Random numbers come from a seeded generator (`rng`). `update()` is a pure function of shot id + frame. That is what lets Remotion render any frame in any order.
- **Lighting model.** Every world material is passed through `twoTone()` (shade.ts:47). It replaces three.js lighting with "albedo x mix(shadeColour, litColour, sunTerm)". So the hemisphere light and the fill light do nothing on world materials (indirect light is set to 0). Only the sun (directional light 0) and its shadow map matter.
- **Ink lines.** The ink pass (ink.ts) outlines everything on camera layer 0. Things that must not be outlined (sky, clouds, smoke, sun sprites, cards, the sign face) are put on layer `NOINK = 3` (ink.ts:29).

### World coordinate system (bridge story)

- Units are metres. `y` is up.
- `x` runs ALONG the river. The river flows toward +x (water marks drift +x at 0.35 m/s, world.ts:554).
- `z` runs ACROSS the river. The bridge deck runs along z from -30 to +30.
- The **near bank** is z < 0 (most cameras, the mill, the park, the bolt). The **far bank** is z > 0 (church, windmill, second chimney).
- Heights: `D0 = 6.0` (story.ts:7) is the bank top AND the deck height. Water surface y = 0. River bed y = -0.6. So the stone embankment is 6.6 m tall and the river is 0.6 m deep.

```
                 z (far bank, church at x 18..30, z 51..84; windmill 98,72; chimney 2 at -80,93)
                 ^
   back rows     |  houses fronts on main street at |x| = 6 (houses centred at x = +-10)
   z +56..+102   |
   riverfront    |  house fronts at z = +36.5 (house centre z = +40.5)
   quay cobbles  |  z +30 .. +36.5 (lanterns z 31.0, trees z 33.6, stalls z ~34)
   =====wall=====|=====  parapet z 30..30.5, gap |x| < 4.6 for the bridge
   river y=0     |  bridge deck x -2.5..2.5, towers at z = +-27, anchorages z = +-37
   =====wall=====|=====  parapet z -30.5..-30
   quay cobbles  |  z -36.5 .. -30 (stalls/cart at z ~-34, sign at 2.25,-30.9)
   riverfront    |  house fronts at z = -36.5
   back rows     |  park x 46..96, z -100..-49 (swing PARK = 70, D0, -75); mill x -58..-28, z -82..-70
                 +--------------------------------------> x (river flows +x)
```

---

## 1. `paint.ts` - painted textures (720 lines)

### 1.1 Core helpers (paint.ts:5-38)

- `rng(seed)` (paint.ts:5-8). Seeded random generator.
  - Start state: `s = (seed * 9301 + 49297) % 233280 || 1`.
  - Each call: `s = (s * 16807) % 2147483647` (the classic "Park-Miller" generator), returns `(s - 1) / 2147483646`, a number in [0, 1).
- `ctex(key, w, h, draw)` (paint.ts:10-23). Makes or reuses a canvas texture.
  - Cache: a module `Map<string, CanvasTexture>`. Same key = same texture object, painted once. **The first caller's size and draw function win.**
  - Seed: `rng(key.length * 131 + key.charCodeAt(0))` (paint.ts:15). See bug B1: keys with equal length and equal first letter get the same random pattern.
  - Texture settings: `colorSpace = SRGBColorSpace`, `anisotropy = 8`, `wrapS = wrapT = RepeatWrapping`. Mipmaps are three's default (on).
- `rep(t, x, y)` (paint.ts:25-27). Clones a texture and sets its own `repeat`. Used for brick chimneys (`rep(brick(), 1, 1)`, `rep(brick(), 2, 8)`) and the (unused) chain map.
- `pick(r, arr)` (paint.ts:28). Random element.
- `INKL = "rgba(40,30,40,0.85)"` (paint.ts:29). Old painted ink line colour. Used only by the legacy painters and the legacy facade.
- `jit(r, hex, dv = 0.1, dh = 5, ds = 0.15)` (paint.ts:33-38). Per-tile colour jitter in HSL: lightness x (1 +- dv), hue +- dh degrees, saturation x (1 +- ds). Lightness capped at 0.97. Returns a css hex. Purpose (comment): break visible tiling of bricks / cobbles / blocks with about +-10 % per tile.
- `dim(hex, k)` (paint.ts:131-135). Scales HSL lightness by k, capped at 0.92.
- `brickCol(r)` (paint.ts:126-129). One brick colour: `jit` of one of `#c0583a #b44f35 #c8643f #a94a33 #cf6e45 #b9603f` with dv 0.24, dh 6, ds 0.15. Then 12 % chance `dim(c, 0.68)` (dark clinker), 10 % chance `dim(c, 1.22)` (sun-bleached).

### 1.2 Legacy painters (v1, mostly dead code) (paint.ts:40-205)

These are the first-round textures. Most were replaced by the "HD" painters. Usage was checked with grep over all templates.

| Function | Canvas | What it paints | Used? |
|---|---|---|---|
| `grass()` :40 | 512x512 | base `#79b950`; 70 soft ellipse patches `rgba(96,160,60,.35)`/`rgba(140,205,95,.3)`; 2600 blade strokes 5-13 px, lw 2, `#5f9c3d #8fcc5f #6aa844 #9ad46a`; 30 flower dots r 3 `#fff7d0 #ffe066 #ffb3c8` | dead |
| `cobble()` :52 | 512x512 | base `#8f7b5c`; 16x16 ellipse cobbles ~13x12 px `#cbb68f #bfa982 #d6c39c #b49f79`, dark rim `rgba(70,55,40,.8)` lw 2.5, highlight | dead |
| `stone(key, cols)` :63 | 512x512 | mortar `#5d5446`; 8 courses of 64 px, blocks 90-160 px, top light band, specks | dead |
| `planks()` :78 | 512x512 | 16 boards x 32 px `#c68a52 #b97c46 #d39a5f #bf8550`, grain, seam `#4a2f1c`, nails `#3b2618` | dead |
| `beam()` :90 | 256x256 | base `#a8743f`, 22 grain beziers `rgba(85,48,20,.16)` lw 2.5 | **used**: `M.wood` (world.ts:167) for posts, ribs, rails, swing frame, sign, flag pole |
| `water()` :96 | 512x512 | blue gradient `#3d92da/#3487d0`, 90 ripple strokes, 40 white dashes | dead |
| `bed()` :108 | 512x512 | base `#a88f62`, 260 pebble ellipses `#8f7a52 #bca37a #9c8a66 #7d6c4c` | **used**: `M.bed` river bed (world.ts:168) |
| `roof(col)` :113 | 512x512 | dark `#3b2a2a` ground, 16 rows of 64x32 tiles with INKL outline | dead |
| `brick()` :136 | 512x512 | mortar `#e6d3b3`; 16 rows x 8 bricks of 60x28 px (`brickCol`), drawn twice (ox 0 and -512) so it tiles in x; light top lip `rgba(255,235,210,.16)` 3 px, dark bottom `rgba(70,30,20,.14)` 3 px; 9 soot blotches r 30-100 wrapped in x and y | **used**: house chimneys (build.ts:511), mill/factory chimneys (build.ts:647) |
| `chainTex()` :158 | 128x512 | 8 chain links, `#2c2f36` / `#565c66` | dead |
| `facade(key, wm, hm, o)` :169 | 48 px/m | old plaster/brick facade with ink windows | dead (replaced by `facadeHD`) |

### 1.3 HD helper functions (paint.ts:207-261)

The HD painters came from `references/reports/textures.md` section 5 (the "paint_recipe.ts" prototype, printed in that report's appendix).

- `U(r, a, b)` = random in [a, b]. `TAU = 2*PI`.
- `wrapX(W, x, w, fn)` (:214). Runs `fn(x)`; if the mark crosses the right edge also `fn(x - W)`; if it starts left of 0 also `fn(x + W)`. Makes marks tile seamlessly in x.
- `wrap2(W, H, x, y, rad, fn)` (:220). Same idea in x and y (9 offsets), only where the copy overlaps the canvas.
- `rr(g, x, y, w, h, k)` (:227). Rounded-rectangle path, corner radius clamped to half the side.
- `blotch(g, x, y, rad, sx, rgb, a)` (:236). Soft radial-gradient spot, stretched `sx` in x, alpha `a` in the middle to 0 at the edge. This is the main "broad painterly variation" tool.
- `grain(g, r, W, x, y, len, amp, lw, col)` (:244). A long wavy wood-grain line made of quadratic curves, one segment per ~180 px, random y offsets drawn once so the wrapped copy matches.
- `nail(g, x, y, rad, col = "#3a2212")` (:258). Dark dot plus a small light glint `rgba(255,240,215,0.55)` up-left.

### 1.4 HD painters (the ones in use)

A rule used everywhere: **about 1024 canvas px per UV unit**. Each surface's UV is set in metres / tile size in build.ts / world.ts. The texel density target came from textures.md section 4: on-screen magnification M <= 6 px per texel at the closest lens, <= 3 at working distance. Screen density at vfov 36 deg on 1080x1920 is `2954 / D` px/m (D = distance in m).

#### `planksHD()` - deck top (paint.ts:269-316)

- Canvas 2048x2048 = 2 m x 2 m = **1024 texels/m**. `anisotropy` raised to 16 in world.ts:267.
- Canvas y runs along the bridge (z). 8 boards of `B = 256` px = 0.25 m. Boards run across the deck (transverse).
- Fill per board: `jit(pick(fills), 0.05, 3, 0.08)` from `#c99669 #c18e64 #d19f6e #bb8961 #c69466 #c79b6f` (ochre/tan; the comment explains the grade lifts chroma ~1.4x and hue ~+10 deg, so these land as "ochre wood" on screen).
- Per board, clipped to the board:
  1. 5 broad tone blotches along the board (r 120-260, stretch 3, light `255,236,200` a 0.12 or dark `110,60,25` a 0.10).
  2. 18 grain strokes (len 500-1600, amp 2-8, lw 2-4; 25 % light `rgba(255,232,195,0.2)`, else `rgba(95,48,18,0.3)`).
  3. 4 longer darker figure lines (len 900-1900, amp 4-10, lw 3.5, `rgba(70,32,10,0.4)`).
  4. Knot on 35 % of boards (ring + fill + outline in browns).
  5. 3 wear blotches `120,70,30` a 0.06.
  6. Edges: sunlit lip 3 px `rgba(255,238,200,0.35)`; shaded lip 18 px gradient to `rgba(80,35,10,0.24)`.
  7. One butt joint per board (7 px `#24110a` + 2 px light line), 2x2 nails r 5 `#22140c` beside it; joist nails at x 512 and 1536 (every 1 m).
- Last: seams between boards: `GAP = 12` px near-black core `#1c0c05` plus a 3 px rim `rgba(40,18,8,0.6)` each side (~5 % of pitch, survives mipmaps).

#### `beamHD()` - deck side beams (paint.ts:320-340)

- Canvas 1024x512 = 3 m along x 1 m tall. 7 timbers, `T = 512/7` px (0.143 m).
- Fills `#a8743f #9e6b39 #b07a44`; 6 grain strokes per timber (30 % light `rgba(255,232,190,0.12)`, else `rgba(85,48,20,0.16)`); top light band 3 px `rgba(255,235,195,0.30)`; bottom 12 px shade to `rgba(60,28,8,0.26)`; one joint `#4a2510` 4 px + 2 bolts r 7 `#2f2a2a`; seam between timbers 3 px `#4a2510`.
- Comment: the old side rendered `#231001` (L* 7, "black hole"); reference timber in shade is L* 27-34.

#### `stoneHD(key, cols, mortar)` - ashlar blocks (paint.ts:349-415)

- `STONE_PAL` (:349-355) **overrides** the `cols` and `mortar` arguments when the key is listed:

| key | block colours | mortar | used by |
|---|---|---|---|
| `stoneHD` | `#d6c4a8 #cbb89c #decfb5 #c2ae91 #d0bea2` | `#a08e76` | nobody (default key) |
| `towerHD` | same as stoneHD | `#a08e76` | bridge towers (world.ts:163) |
| `tstoneHD` | `#e2d5bc #d7c8ac #e9dec9 #ccbca1` | `#a69881` | church tower + gables (build.ts:623) |
| `wallHD` | `#c3b198 #b8a68b #cdbda3 #af9c83 #beac94` | `#887762` | river embankment walls (world.ts:161) |
| `copeHD` | `#e5d9c1 #dbcdb5 #ebe1ce #d3c4ac` | `#a99982` | parapets, string course, anchorages (world.ts:162), house plinths (build.ts:520) |

- History in comments: MAT pass made palettes warm (neutral greys turned lavender, because the two-tone shade colour is blue-violet); round 3 cut saturation 35 %.
- `STONE_BIG = {towerHD, tstoneHD, wallHD, stoneHD}` (:357): painted on 2048x2048 and shown at `repeat 0.5`. Others on 1024x1024 at repeat 1. Either way, 1024 px per UV unit. `t.repeat.set(1024 / S, 1024 / S)` (:413) is set on the cached texture each call.
- Algorithm (:362-412):
  - Fill mortar. Courses `RH = 128` px tall, joint `J = 7` px.
  - Each course: random block widths 200-360 px, then all stretched by `k = S / sum` so the course closes exactly on the tile width. Start offset `(row % 2) * 140 + U(0, 60)` (running bond).
  - Each block (wrapped in x): rounded rect r 5 in `jit(col, 0.1, 5, 0.18)`; a +-tone overlay; top bevel 6 px `rgba(255,252,245,0.22)`; left bevel 4 px a 0.10; bottom shade 5 px `rgba(70,55,45,0.14)`; 16 speckles r 1-2.2 (60 % dark `rgba(95,82,72,0.38)`, else white a 0.35); 15 % get a 4-point hairline crack `rgba(110,90,70,0.45)` lw 1.2.
  - Grime (scaled by `n = (S/1024)^2`): 14n soft blotches r 50-170 (75 % dark `105,82,55` a 0.07-0.13, else light a 0.09); 8n rain streaks (w 8-26, h 90-300, gradient `rgba(95,75,52,0.14)` to 0); 160n pits r 1.2-3.
- Scale on screen: boxGeo tile 2 m -> 512 texels/m, 0.25 m courses (bridge towers, parapets). 4 m tile -> 256 texels/m, 0.5 m courses (embankment wall, church tower which uses tile 4).

#### `cobbleHD()` - quay setts (paint.ts:420-464)

- Canvas 2048x2048 = 8 m at `repeat 0.5` (UV unit = 4 m) -> 256 texels/m.
- Joint colour fill `#867967`. `N = 48` courses, `CH = 42.7` px (0.167 m), joint `J = 5`.
- Sett widths 48-72 px (0.19-0.28 m), stretched to close the course; corner radius 7-12; colour `jit(pick(cols), 0.1, 6, 0.2)` from `#c4b6a0 #b8aa93 #cdc1ab #af9f88 #c7baa3 #bdb19b #b8ad9c`; small y jitter +-1.5 px; inner diagonal gradient light top-left `rgba(255,250,240,0.20)` to dark bottom-right `rgba(70,58,45,0.16)`; 3 specks r 1.4; **no outline ring** (the old version's dark rims read as polka dots).
- 40 damp / bleached patches r 60-220; 260 pebbles/grit dabs rx 2-5 (40 % dark).

#### `roofHD(col, slate = false)` - roof tiles / slates (paint.ts:469-493)

- Canvas 1024x1024 = 4 m (256 texels/m). Cache key `"roofHD" + col` (the slate flag is NOT in the key).
- Fill `col`. Courses `C = 64` px (0.25 m). Tile width `TW = 77` px (0.3 m), slate 52 px (0.2 m). Row offset half a tile + U(-6, 6).
- Per tile: tone +-10 % (light `rgba(255,240,225,...)` / dark `rgba(60,25,20,...)`); "rounded pan" gradient light-left to dark-right; 2 px soft joint.
- Per course: lower-lip light 3 px at `y + C - 9`; course shadow 5 px at `y + C - 5` (`rgba(55,22,18,0.32)`, slate `rgba(15,20,30,0.32)`).
- 18 weathering blotches `70,60,40` a 0.08.
- Canvas y runs DOWN the slope. In build.ts the roof quad has v = 0 at the eave and v = 1 at the ridge; with three's default `flipY` that puts canvas top at the ridge, which matches.
- No per-tile ink (reference joints are only 3.3 px, dL* 10).

#### `grassHD()` - lawns and banks (paint.ts:498-520)

- Canvas 1024x1024 = 4 m (256 texels/m).
- Base `#73b23d`. 16 broad patches r 120-320 (light `140,198,80` / dark `92,154,48`, a 0.35, stretch 1.4).
- 1400 V-shaped tufts (h 7-16 px, lean +-3, lw 2; 40 % light `rgba(165,218,98,0.35)`, else `rgba(78,138,38,0.45)`), about 90 per m2.
- 12 flowers r 3.5 from `#f7f3e8 #f4d24a #f3a9bb #f7f3e8`, centre dot `rgba(240,190,60,0.9)` r 1.3.

#### `facadeHD(key, wm, hm, o)` - house walls with windows (paint.ts:525-620)

- Options `o = { wall, shutter, door?, timber?, brick? }`. Cache key `"facHD" + key`.
- Pixel density `PX = Math.min(72, 2048 / Math.max(wm, hm))` (:526) -> **72 px/m** (capped so no side is over 2048 px). The docstring at :522 still says 96 px/m (bug B4).
- Canvas size `round(wm*PX) x round(hm*PX)`. Examples: 7x7 m house front 504x504; 9x9.8 m 648x706; side 8x8.4 m 576x605; mill 30x13 m -> PX 68.3 -> 2048x888; 16x9.8 m factory house 1152x706.
- Wall:
  - Brick mode: mortar `#e9d3b4`, real-size bricks 0.25 x 0.085 m in running bond, 1 px gap each side, colour `brickCol`; soot blotches `round(wm*hm/12)+3`, r 0.4-1.4 m, `70,40,30` a 0.06-0.12.
  - Plaster mode: fill `o.wall`; `round(wm*hm/3)+6` blotches r 0.4-1.5 m (light white a 0.07 / dark `120,90,60` a 0.05); 4 hairline cracks `rgba(120,100,80,0.35)` lw 1.
- Layout rules (shared with build.ts `houseDetail`, keep them in sync):
  - `floors = max(1, floor(hm / 2.8))` (2.8 m per floor).
  - `nWin = max(1, floor(wm / 2.2))` windows per floor, centred at `(i + 0.5) * W / nWin`.
  - Sill line of floor fl at `fl * 2.8 + 0.9` m above the bottom.
  - Door (if `o.door`): ground floor, window slot `i = floor(nWin / 2)`.
- Plinth band 0.45 m `rgba(70,55,45,0.28)` + 2 px line.
- Timber frame (if `o.timber`): beams 0.18 m `#6e4a30` with dark stroke + light top line: left, right, top edges, a beam at each floor line, and posts between windows on the upper floors.
- Door: 1.1 x 2.1 m round-topped; light stone frame 0.1 m `#e9e2d4`; door `#7a4a2c` with vertical planks every 0.14 m; brass knob = `nail` r 0.035 m `#d9b04a`.
- Window: 0.85 x 1.25 m; white trim 0.08 m `#f7f2e8` with thin `rgba(60,45,40,0.6)` line; louvred shutters 0.45 m wide in `o.shutter`, slats every 0.06 m; glass vertical gradient `#8d9cdb` to `#5761a8` (mid-tone blue-violet, never black); curtains on 35 % (`#f5c4c8 #f3e3c6 #d7e6cf`, two triangles from the top corners); two 45 deg glints (0.07 m and 0.035 m wide, white a 0.5); mullion cross 0.04 m; sill `#ebe3d4` 0.07 m + shadow 0.03 m.

#### `waterMarks(key, nCrest, nGlint)`, `waterNear()`, `waterFar()` - river data texture (paint.ts:630-658)

- NOT a colour image. A **data texture**: R = crest, G = trough, B = glint. world.ts sets `colorSpace = NoColorSpace` (world.ts:224). Canvas 1024x1024.
- Black fill, `globalCompositeOperation = "lighter"` so channels add.
- Crest arcs: width 18-44 px, sag 0.3-0.45 x width, line 3-5 px, random rotation 0..PI. Red arc, then a green trough arc `1.5 x lw` under it at 0.9x width.
- Glints: straight blue lines 40-140 px long, 1.2-2.4 px wide, random angle.
- `waterNear()` = 28 crests + 5 glints (~0.3 % crest area). Sampled at 8 m tiles near the camera.
- `waterFar()` = 220 crests + 30 glints (~2.5 %). Sampled at 40 m tiles far away.
- Why random angles: foreshortening alone makes them look like horizontal dashes from any heading (aspect = 1 / sin(grazing angle)).

#### `cloudHD(seed, pal = CLOUD_DAY)` - cloud sprites (paint.ts:660-692)

- Palettes: `CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" }`, `CLOUD_GOLD = { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" }`. world.ts actually passes `LOOK.day.cloud` / `LOOK.golden.cloud` from lights.ts (same values).
- Canvas 1024x512. Cache key `cloudHD_${pal.lit}_${seed}`. Uses its OWN generator `rng(seed * 7919 + 17)` (comment: equal-length keys would otherwise share shapes).
- Shape: 6-9 lobes in a row from x 150 to 874, radius `(60 + 110 * sin(PI t)^0.8) * U(0.75, 1.15)` (biggest in the middle), sitting on `base = 400`; plus `floor(n/2)` crown lobes r 60-110 about 150 px higher.
- Three blurred layers (Canvas2D `filter = blur(px)`): underside tone full size blur 6; mid tone shifted (-0.04, -0.12) x radius, 0.9x size, blur 8; lit tone shifted (-0.1, -0.26), 0.72x, blur 10.
- Flat soft bottom: `destination-in` with a gradient opaque above y 382, clear below y 406.

#### `chainHD()` - chain strip texture (paint.ts:697-719)

- Canvas 256x1024 = 4 faces side by side x 2 m. Slate iron: bg `#4a5160`, face-on rings lw 15 `#8a93a3` (22x58 px), edge lines `#3a404d`, highlight arc `#e4e6ea`, glint `#fbfaf4`; edge-on links `#7d8696` with stripe `#d9dce3`. Link pitch 128 px = 0.25 m.
- **Never painted at run time** (bug B3): the chain material is created inside `lam("chainHD")` which ignores its `make()` callback, so `chainHD()` is never called. The chain is real link geometry instead (`Strand` link mode).

### 1.5 Texture inventory actually in use

| ctex key | Size (px) | Metres per canvas | Texels/m | Material key / where |
|---|---|---|---|---|
| `planksHD` | 2048^2 | 2 x 2 | 1024 | `planksHD` deck top |
| `beamHD` | 1024x512 | 3 x 1 | 341 / 512 | `deckSide` |
| `beam` | 256^2 | 1 face / box tile | - | `wood` posts, ribs, rails, swing, sign, flag pole |
| `bed` | 512^2 | 8 | 64 | `bed` river bed |
| `grassHD` | 1024^2 | 4 | 256 | `grassHD` banks |
| `cobbleHD` | 2048^2 (rep 0.5) | 8 | 256 | `cobbleHD` quays + main street |
| `wallHD` | 2048^2 (rep 0.5) | 8 (4 m UV) | 256 | embankment |
| `copeHD` | 1024^2 | 2 (2 m UV) | 512 | parapets, string course, anchor blocks, house plinths |
| `towerHD` | 2048^2 (rep 0.5) | 4 (2 m UV) | 512 | bridge towers |
| `tstoneHD` | 2048^2 (rep 0.5) | 8 (4 m UV) | 256 | church tower |
| `roofHD<col>` | 1024^2 | 4 | 256 | 5 roof colours |
| `facHDhf<si>_<w>_<h>`, `facHDhs<si>_<h>`, `facHDmill`, `facHDmills` | 72 px/m | 1 per wall | 72 | house fronts / sides, mill |
| `brick` | 512^2 | 2 (tile 2) / chimney wrap | - | chimneys |
| `waterMarksnear`, `waterMarksfar` | 1024^2 | 8 / 40 | - | water shader data |
| `cloudHD_<lit>_<k>` x 8 | 1024x512 | sprite | - | 4 day + 4 golden cloud maps |
| `leafHD0..4` (build.ts) | 256x128 | unit sphere | - | tree lobes |
| `bannerHD<col>` (build.ts) | 256x700 | cloth | - | banner |
| `chapel`, `clock`, `flagStGeorge` (build.ts) | 512^2, 256^2, 256x160 | - | - | church nave, clock, tower flags |
| `sunDisc`, `sunHalo`, `smoke`, `sign` (world.ts) | 128^2, 256^2, 256^2, 700x520 | - | - | sprites, smoke, sign |

Approximate GPU memory (textures.md 4): each 2048^2 ~22 MB with mips (5 of them: planksHD, cobbleHD, wallHD, towerHD, tstoneHD), each 1024^2 ~5.6 MB. During a crossfade two WebGL contexts each upload their own copy.

---

## 2. `build.ts` - geometry helpers, vegetation, props, houses, town (703 lines)

### 2.1 Types and shared materials (build.ts:10-46)

- `Kit = Record<string, THREE.Object3D>` (:10): GLB scenes by name.
- `V(x, y, z)` (:11): shorthand for `new THREE.Vector3`.
- `lam(key, make)` (:17-30): **material cache**. Returns `twoTone(new MeshLambertMaterial(make()))`, cached by key in a module Map. First call wins.
  - Special case `key === "chainHD"` (:20-25): ignores `make()`; makes `twoTone(new MeshPhongMaterial({ color: "#7a8490", specular: "#6c727b", shininess: 30 }))` and adds it to `CHAIN_MATS` (a WeakSet). A `Strand` built with a material in `CHAIN_MATS` switches to real chain-link geometry.
- `toLambert(m)` (:37-46): converts every Kenney GLB material into a two-tone Lambert, cached by the source material's uuid. Keeps `map`, `side`, `alphaTest`. Recolours by material NAME:
  - `leafsGreen` -> cycles `GREENS = ["#62ae4c", "#56a447", "#72b853"]`.
  - `RECOLOR = { grass: "#6aab4f", leafsDark: "#4a9142", woodBark: "#8a5a3c", woodInner: "#e8cfa4", wood: "#a8724a", woodDark: "#7a4f33", dirt: "#8a6a4a", stone: "#b7b4ad" }`.
  - Anything else keeps its GLB colour (or white).
  - Reason (comment): "the nature kit ships a teal palette; our valley wants storybook greens and browns".

### 2.2 Geometry pieces (build.ts:49-85)

- `f32(attr)` (:49): copies any (also interleaved) attribute into a plain `Float32BufferAttribute`.
- `quad(a, b, c, d, u1 = 1, v1 = 1, u0 = 0, v0 = 0)` (:55): two triangles, flat normal = `(b - a) x (d - a)`. Give the corners counter-clockwise as seen from the front. UV `(u0,v0)` at a, `(u1,v0)` at b, `(u1,v1)` at c, `(u0,v1)` at d. To tile a texture every T metres pass `u1 = width / T`, `v1 = height / T`.
- `tri(a, b, c)` (:63): one triangle, flat normal, UV (0,0) (1,0) (0.5,1).
- `boxGeo(min, max, tile = 0, bottom = false)` (:72): axis-aligned box from 5 quads (+z, -z, -x, +x, +y), plus -y if `bottom`. `tile` = metres per texture repeat (0 = one image per face). Merged with `mergeGeometries`.

### 2.3 `Batch` - merge everything static (build.ts:88-116)

- `add(geo, mat, matrix?)`: makes a non-indexed copy with only `position`, `normal` (computed if missing) and `uv` (zeros if missing), applies the matrix, and files it under its material.
- `addObject(o, matrix)`: walks a GLB scene, adds every mesh with its world matrix and `toLambert(material[0])`.
- `build(parent, cast = true)`: one merged `Mesh` per material; `castShadow = cast`, `receiveShadow = true`, `matrixAutoUpdate = false`. Clears itself.
- Effect: the whole town becomes roughly one draw call per material (~100). The merged meshes are huge, so frustum culling does almost nothing (fine for this scene size).

### 2.4 `Strand` - a tube along a path, rebuilt every frame (build.ts:118-236)

`new Strand(n, w, h, mat, tile = 1, cast = true)`; call `set(points)` each frame.

- **Box mode** (any normal material): `n` path samples x 4 corner vertices; cross-section `w` wide x `h` tall. Side vector `S = T x up`, normal `N = S x T`. Corner normals are diagonal (so the box shades like a rounded tube). UV `u = k / 4` around, `v = length / tile` along. Used for the 4 deck rails (`M.wood`, tile 3).
- **Link mode** (material in `CHAIN_MATS`): real interlocking chain links.
  - `linkTemplate(h)` (:123-138): a stadium-shaped ring tube, 16 centre-line samples x 6 tube sides (`LNS = 16, LNR = 6`), smooth normals. Sizes: outer width `ow = 0.85 h`, wire radius `rb = 0.14 ow`, outer length `ol = 1.62 ow`, pitch `ol - 4 rb`. With `h = 0.3`: ow 0.255 m, rb 0.036 m, ol 0.413 m, **pitch 0.27 m**.
  - Up to `maxLinks = 440` links (index buffer pre-built), draw range = links used.
  - `setLinks()` (:175-210): measures the polyline, places `floor(total / pitch)` links centred along it, even links in plane (T, N) (vertical), odd links in (T, S) (horizontal). `w` is ignored in this mode; UVs stay zero (no texture).
  - The main chain (~56 m) uses ~207 links; each backstay (~14 m) ~52.

### 2.5 Sight-line culling (build.ts:238-255)

- `Ray = { o, d, len, core }` (:240). `o` = lens position, `d` = forward + a screen offset (unit forward component), `len` = distance to the look point, `core` = the centre ray.
- Module variable `sight: Ray[]` (:241). `buildTown()` sets it, and resets it to `[]` at the end.
- `inTheWay(x0, x1, y0, y1, z0, z1, coreOnly = false)` (:243-255): slab ray-box test of every ray against a box. `true` = something on screen would be hidden, so the caller skips that object.
  - Houses test all 5 rays per camera sample (centre, +-0.6 horizontal, +0.6 up, -0.4 down; world.ts:82).
  - Props, trees, banners test only the core ray, so small things can still frame a shot.
- Rays only reach the look point, so things behind the subject are kept.
- **This is why the town changes when cameras change.** Every house or prop that blocks any camera at any frame of any shot simply is not built. Nothing is logged.

### 2.6 Cartoon vegetation (build.ts:257-366)

Kenney's faceted trees and box hedges were replaced by rounded "storybook" shapes (smooth spheres) so the ink pass draws clean outlines and the two-tone sun gives each lobe a lit cap and a cool belly.

- `VEG` (:262): Kenney name -> kind. `tree_oak, tree_default, tree_detailed` -> `round`; `tree_fat` -> `fat`; `tree-high-round, tree` -> `tall`; `tree_cone` -> `cone`; `plant_bushLarge, plant_bushDetailed, plant_bush` -> `bush`; `hedge` -> `hedge`.
- `LEAF = ["#5aa83c", "#4c9a37", "#69b545", "#55a243", "#3f8f3c"]` (:266).
- `leafTex(i)` (:269): 256x128 equirect-style canvas for a unit sphere: vertical gradient (top = base `offsetHSL(0.012, 0.03, 0.08)`, bottom `offsetHSL(-0.015, 0, -0.08)`), 46 soft leaf-clump arcs (light `rgba(225,255,170,0.22)` mostly on top, dark `rgba(20,70,30,0.2)`), wrapped in x.
- `leafMat(i) = lam("leafHD"+i, map leafTex(i))`; `barkMat() = lam("barkHD", color "#8f5d3b")`.
- Geometry cache `vegGeo`:
  - `lobeGeo(q)`: `SphereGeometry(1, [20,14,10][q], [14,10,7][q])` (q = detail 0 near .. 2 far).
  - `trunkGeo()`: open `CylinderGeometry(0.6, 1, 1, 10)` moved up so its base is at 0.
  - `hedgeGeo()`: `BoxGeometry(1,1,1, 18,10,10)` bent into an exact rounded box with per-axis radii `R = [0.106, 0.29, 0.385]` (unit space; ~0.35 m ends, ~0.45 m top/sides at 3.3 x 1.56 x 1.17 m), flat bottom.
- `vegRad(kind, h)` (:325): half-width for culling: hedge 1.7, bush 0.85h, tall 0.2h, cone 0.27h, fat 0.44h, round 0.39h.
- `addVeg(b, kind, x, y, z, h, seed, q = 0)` (:327-366). Each lobe gets a random yaw, scale `(r, 0.9 r, r)` by default. Leaf material: cone -> LEAF[4], hedge -> LEAF[1], else random 0..3.

| kind | trunk height / radius | lobes |
|---|---|---|
| round | 0.48h / 0.055h | centre r 0.26h at 0.64h; ring of 4 at 0.18h out, r 0.17-0.21h; top r 0.17h at +0.17h |
| fat | 0.40h / 0.055h | centre r 0.29h at 0.58h; ring of 5 at 0.22h, r 0.19-0.23h; top r 0.19h |
| tall | 0.34h / 0.045h | stacked r 0.17h at 0.47h, 0.15h at 0.65h, 0.11h at 0.82h (stretched 1.25-1.3 in y); ring of 3 at 0.55h |
| cone | 0.20h / 0.05h | 4 flattened stacked lobes: 0.26h at 0.3h (sy 0.62), 0.2h at 0.5h, 0.14h at 0.68h, 0.08h at 0.84h |
| bush | none | centre r 0.5h at 0.46h; ring of 3 at 0.42h out, r 0.32-0.38h |
| hedge | none | one rounded box 3.3 m long x (h+0.06) x max(0.9, 0.78h) |

### 2.7 Painted cloth banner (build.ts:368-422)

- Replaces the Kenney banner (a flat, hot red plate). Colours `BANNER_COL = { "banner-red": "#b8553a", "banner-green": "#4f8a5a" }`, fallback `#b4524b`.
- Constants: `FOLD = 0.27` m fold period, `CLOTH_W = 1.1`, `CLOTH_H = 2.6`.
- `bannerTex(col)` 256x700: vertical gradient, painted fold shading `sin(x/W * (CLOTH_W/FOLD) * 2PI)`, top hem, ochre border `#d1aa5c` lw 9, thin dark lines, a light disc `#efe2c2` with an ochre diamond emblem at y 250.
- `bannerGeo()`: `PlaneGeometry(1.1, 2.6, 16, 20)`, top edge at y 0, swallow-tail hem (notch 0.42 m), folds `z = (0.025 + 0.055 t) sin(2PI x / 0.27 + 0.6) + 0.04 t^2` (t = 0 top .. 1 bottom), normals recomputed.
- `bannerProp(b, name, x0, y, z0, h, yaw0)`: pole offset `0.4 * (h / 0.84)` toward `(cos yaw0, -sin yaw0)` (where the Kenney plate hung). Pole cylinder r 0.045/0.06 `#6e4b33`; gold ball r 0.1 `#c9a24e`; crossbar r 0.03 at h - 0.18; two gold finials; cloth at h - 0.2, 0.1 m in front, double-sided.

### 2.8 Props (build.ts:424-471)

- `prop(b, kit, name, x, y, z, h, yaw = 0)` (:428):
  1. `banner*` -> `bannerProp`.
  2. Name in `VEG` -> cartoon plant via `addVeg` (core-ray culled). Detail: `q = 2` if distance from world origin > 200 m, `q = 1` if |z| > 45 and distance > 60, else 0. Seed `x*92.7 + z*31.3 + yaw*1000`.
  3. Otherwise a Kenney GLB: scale `s = h / bboxHeight`, culling radius = half the larger of x/z extent x s, base moved to y. Merged into the batch with two-tone materials. Missing GLB -> silently skipped.
- `kitClone(kit, name, h)` (:449): same, but returns a standalone `Group` (no culling, no merge, shadows not cast). Used by world.ts for the camera FOREGROUND framing props (bushes, cart) that are meant to sit in front of the lens.
- **Consequence:** the GLB files for all VEG names and banners are loaded but never used (bug B5).

### 2.9 Houses (build.ts:473-555)

`STYLES` (:479-488), index `si % 8`:

| si | wall | shutter | roof | flags | note |
|---|---|---|---|---|---|
| 0 | `#ecdab2` | `#3f6fb5` | `#d27a62` | | cream |
| 1 | `#d8a95f` | `#2f6a43` | `#b8644f` | | ochre |
| 2 | `#c47a5c` | `#2f5f6a` | `#8f97a8` | | muted brick-red plaster, slate roof |
| 3 | `#efdcb8` | `#2f5f6a` | `#c9775a` | timber | cream timber frame |
| 4 | `#ddbd78` | `#5a3b2a` | `#d27a62` | | straw ochre |
| 5 | `#cc9a6c` | `#3f6fb5` | `#8e7aa0` | | terracotta sand, purple roof |
| 6 | `#e2c49a` | `#8c3b4a` | `#c9775a` | | warm sandstone |
| 7 | `#e3d2b8` | `#2f6a43` | `#8f97a8` | brick | brick, slate roof |

- Colour history in comments: near-neutral walls rendered lavender in shade (the shade colour multiplies by blue-violet), so walls were warmed and then desaturated.
- `roofMat(col) = lam("roof"+col, { map: roofHD(col, col === "#8f97a8"), side: DoubleSide })` (:489). `#8f97a8` is the only slate colour.

`house(b, x, z, yaw, w, d, h, si, y = D0)` (:492-513). A gabled house. Front faces local +z; ridge along local x.

1. Cull: box of half-size `(w or d)/2 + 0.6` (swapped when `|sin yaw| > 0.5`), height `h + 0.42 d + 1.2`, all 5 rays.
2. Materials: front `facadeHD("hf{si}_{w}_{h}", w, h, {...style, door: true})`; sides `facadeHD("hs{si}_{h}", 8, h, style)` (always an 8 m wide layout); gable colour `st.wall` (brick style uses `#c8643f`).
3. Walls: 4 quads (front, back, left, right), each UV 0..1 (one texture per face; back stretches the 8 m side texture over w).
4. Gables: 2 triangles to ridge height `rh = 0.42 d` (3.36 m for d = 8).
5. Roof: 2 quads from the eave at `h - 0.25`, overhang `o = 0.35` m, to the ridge at `h + rh`; UV `ru = (w + 0.7) / 4`, `rv = slopeLength / 4` (4 m tiles).
6. Chimney: brick box 0.8 x 0.8 from `h + 0.3 rh` to `h + rh + 1.1`, at local x `+-0.45 hw` (side flips with `si % 2`), z `-0.35 hd`.
7. `houseDetail()`.

`houseDetail(b, m, w, d, h, rh, chx)` (:523-555) adds real 3D relief (round 4) using a unit box `UB` scaled by `ub()`:

- Stone plinth box `copeHD` 7 cm proud, y -0.05..0.45.
- Cornice under the eaves `#efe3c8` ("trimStone"), y `h-0.52..h-0.25`, 12-17 cm proud on all 4 sides.
- For every facade window (same layout rule as facadeHD): a sill box (y `yb-0.2..yb-0.08`, 0.14 deep, 1.2 m wide) and a lintel hood (y `yb+1.33..yb+1.43`, 0.08 deep, 1.1 m wide). `yb = fl * 2.8 + 0.9`.
- Front door: stone step 1.64 m wide, 0.5 m out, 0.2 m tall; door hood at 2.3-2.44 m, 0.34 m deep.
- Back and side walls use `wins(8, ...)` = the 8 m side layout (3 windows).
- Chimney cap `#9a8778` 1.04 m square x 0.16 m; pot cylinder r 0.13/0.16 x 0.42 m `#b8684a`.

### 2.10 Painted extras (build.ts:557-581)

- `chapelTex()` 512^2: cream `#e9e0cc` with faint course lines every 32 px; two tall arched windows (navy glass `#33406b`, ink stroke 6 px, light streak, `#d9c9a0` cross bars) at x 128 and 384. Tiled every 6 m on the nave -> a window every 3 m.
- `clockTex()` 256^2: face `#f7f1e1`, rim `#221f2e` 12 px, 12 tick marks, two hands. Alpha-tested (alphaTest 0.5) so the round face cuts out.
- `flagTex()` 256x160 (exported): **St George's cross** (England, 1831): field `#f4f0e6`, red `#c8323a` bars 36 px wide (horizontal y 62-98, vertical x 110-146). Comment: the earlier red flag with a yellow diamond "read as Vietnam's flag".

### 2.11 `buildTown(root, kit, rays = [])` - the town layout (build.ts:583-703)

- One `Batch`, its own generator `rng(11)` (fully repeatable), `sight = rays`.
- Zones that keep houses/trees out:
  - `inPark`: z < 0, x 46..96, z -100..-49 (around the swing).
  - `inMill`: z < 0, x -66..-14, z -90..-54.
  - `inChurch`: z > 0 and (x 10..38, z 46..84) or (x 86..110, z 60..84) (second box = windmill).
- For each bank (`bank = -1` near, `+1` far), `away = bank > 0 ? PI : 0` so fronts face the river:
  1. **Riverfront rows** (:595-602): for each side of the bridge, x from 8.5 to 134: width 7 or 9, wall height 7 / 8.4 / 9.8, depth 8, centre `(sx * (x + w/2), bank * 40.5)` -> fronts on the quay at |z| = 36.5. Gap 2.5 m with 25 % chance else 0.25 m. Random style 0..7.
  2. **Main street** (:604-611): houses at x = +-10 facing the street (yaw `+-PI/2`, fronts at |x| = 6), z from 46 to 150, skipped inside church zones. Gap 3 m with 20 % chance else 0.3 m.
  3. **Back rows** (:613-620): for zf in 52, 66, 80, 96: x from 17-21 to 124, z = `bank * (zf + 4 + 0..2)`, 78 % chance, skipping park/mill/church. Spacing `w + 1..5`.
- **Church** (far bank, :623-635):
  - Nave box x 18.5..29.5, y D0..D0+9, z 57..80, `chapelTex` tiled every 6 m.
  - Slate roof quads (eaves D0+8.8 at x 18.1/29.9, ridge D0+13.5 at x 24, z 57..80.4, UV 6x2).
  - Gable triangles in `tstoneHD`.
  - Tower box x 21.4..26.6, y D0..D0+19, z 51.6..57 (tile 4), cornice x 21.1..26.9, y D0+18.6..19.4.
  - Spire `ConeGeometry(4.0, 13, 4)` turned 45 deg (square pyramid), base at D0+19.4, centre (24, D0+25.9, 54.3), slate material.
  - Clock quad 2.2 x 2.2 m at z 51.55, x 22.9..25.1, y D0+12.4..14.6, facing -z (toward the near bank).
- **Mill** (near bank, :637-646): brick `facadeHD("mill", 30, 13, { wall: "#b5543c", shutter: "#3b3f52", brick: true })` front/back at z -70 / -82, x -58..-28; sides `facadeHD("mills", 12, 13, ...)` at x -58 / -28; slate roof eaves D0+12.8 (z -69.6 / -82.4), ridge D0+16.5 at z -76, UV 8x2; gables also use the side facade (bug B8).
- **Chimneys** (:647-651): open brick cylinders r 0.95 top / 1.35 bottom, `rep(brick(), 2, 8)`, with a soot ring `#4a3442` (r 1.15/1.1, 1.3 m) on top:
  - (-22, -77) height 30 (beside the mill),
  - (-80, 93) height 24 (far bank).
  - world.ts smoke tops are hard-coded to match: (-22, D0+30.6, -77) and (-80, D0+24.6, 93).
- **Factory house** (:652): `house(b, -80, 100, PI, 16, 10, 9.8, 7)` (brick style, by chimney 2).
- **Hills** (:654-658): upper-half spheres (`SphereGeometry(1, 28, 14, 0, 2PI, 0, PI/2)`) scaled (sx, sy, sz), base at D0 - 2, colours cycling `#78b257`, `#6aa24e`, `#8bbf63`:

| x | z | sx | sy (height) | sz |
|---|---|---|---|---|
| -360 | 250 | 190 | 52 | 120 |
| 140 | 380 | 240 | 64 | 140 |
| 430 | 150 | 170 | 48 | 130 |
| -440 | -130 | 190 | 44 | 150 |
| -90 | -390 | 250 | 58 | 140 |
| 320 | -330 | 210 | 54 | 130 |
| 520 | -60 | 160 | 40 | 120 |
| -560 | 60 | 200 | 46 | 140 |

- **Trees** (:660-670), kinds from `["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree-high-round", "tree"]`:
  - Quay rows: every 22 m from x -130 to 130 (skip |x| <= 12), z = +-33.6, height 7-9.5 m.
  - 140 scattered: x in +-260, |z| 48..268, height 7-11 m, skipping zones and |x| < 16 (main street).
  - 60 on the hills: ring radius 230..390 (x stretched 1.3), height 12-18 m, kinds cone / default / oak.
- **Quay furniture** (:672-688):
  - Lanterns every 12 m from x -126 to 126 (skip |x| <= 5) at z = +-31.0, h 2.8.
  - One red banner per bank at (5.4, +-31.6), h 3.6, facing the river.
  - Market: stall-red (-14, -34) h 3.2; stall-green (-21.5, -34.4) yaw 0.1; cart (17, -34) h 2.2 yaw 1.2 (moved 3.5 m in round 4, it was a grey "mushroom" in shot 11); stall-bench (20, -32.2) h 1.0; stall-green (16, 34) yaw PI; stall-red (23.5, 34.3) yaw PI; cart (-15, 33.6) yaw 2.4.
  - Windmill (98, 72) h 16 yaw -0.6.
  - Canoes on the water at y 0.02: (-19, 27.6) yaw 1.5 and (31, -28.2) yaw -1.4, h 0.7.
  - 14 lily pads y 0.03, x in +-60, |z| 27.2..29.4, h 0.08.
- **Park** (:689-700): 7 named trees (oak 58,-66 h 9.5; fat 84,-64 h 8; detailed 54,-84 h 9; default 88,-86 h 9; oak 79,-95 h 10; high-round 61,-94 h 9; default 92,-73 h 8.5); hedge row along z = -57 from x 50 to 92 every 3.2 m, h 1.5; 5 bushes h 1.3; 26 flowers (red/yellow/purple A, h 0.5) in x 56..86, z -60..-92, none within 4 m of (70, -75); bench (76.5, -79.5) yaw PI; lantern (64.5, -71). Comment: grass tufts were dropped because "inked grass tufts read as green boxes".
- `b.build(root)`, then `sight = []`.

---

## 3. `world.ts` - the scene and the per-frame update (578 lines)

### 3.1 Assets: Kenney GLBs (world.ts:16-28)

- `KENNEY` (:17-19), 26 names: `tree_oak, tree_default, tree_detailed, tree_fat, tree_cone, tree-high-round, tree, plant_bushLarge, plant_bushDetailed, plant_bush, hedge, flower_redA, flower_yellowA, flower_purpleA, grass_large, grass, lily_large, lantern, cart, stall-red, stall-green, stall-bench, banner-red, banner-green, windmill, canoe`.
- `loadKit()` (:21-28): one shared promise; `GLTFLoader.loadAsync(staticFile("bridge/kenney/<name>.glb"))` for each; failures become `null` and are dropped silently.
- Path: Remotion's `public/` folder -> `public/bridge/kenney/<name>.glb`. **The GLBs are not in this repo.** Names look like Kenney's CC0 "Nature Kit" (underscore names, material names `leafsGreen`, `woodBark`...) and "Fantasy Town Kit" (dash names: lantern, cart, stall-*, banner-*, windmill, hedge, tree, tree-high-round). The repo does not say which kits; that is an inference.
- **Actually used GLBs** (because VEG kinds and banners are drawn procedurally): `flower_redA, flower_yellowA, flower_purpleA, lily_large, lantern, cart, stall-red, stall-green, stall-bench, windmill, canoe` (11 of 26). `grass` and `grass_large` are loaded but never placed.
- `Bridge.tsx:42-47` holds the Remotion render with `delayRender("bridge kit")` until the kit loads.

### 3.2 Bridge constants (world.ts:30-50)

| Name | Value | Meaning |
|---|---|---|
| `NZ` | 121 | deck samples, every 0.5 m |
| `ZS` | -30 .. 30 step 0.5 | deck sample z |
| `POSTS` | 41 at -30 + 1.5k | rail posts + under-deck ribs |
| `HANG` | 35 at -25.5 + 1.5k | hangers (vertical rods) |
| `CZ` | 73 at -27 + 0.75k | main chain path samples |
| `FLAGS` | 47 at -25.3 + 1.1k | bunting pennants |
| `catY(z)` | `8.5 + 8.1 (z/27)^2` | intact chain height (parabola): 8.5 at mid-span (2.5 m over the planks), 16.6 at the towers |
| `chainY(z, b)` | `intact + bounce*shapeZ*0.85`, lerped toward `deckY + 0.3` by `drop * dropW(z)` | chain height with bounce / collapse |
| `BOLT` | `[ANCHOR.x, ANCHOR.y + 0.24, ANCHOR.z]` = (-2.7, D0+0.86, -37) | the bolt that snaps |
| `TOP` | 16.6 | chain height at the tower saddles |

- `beamBetween(a, b, th)` (:45): a square box of side `th` stretched from a to b (used for the swing frame).
- Story physics it reads (story.ts): `deckY(z, b) = D0 + bounce*shapeZ(z) - drop*6.6*dropW(z)`, `shapeZ(z) = cos(PI z / 54)` inside the towers, `dropW(z) = smooth((20 - z) / 26)` (near half falls), `snapEnd(snap)` (free end of the snapped backstay).

### 3.3 Small textures and per-shot sun overrides (world.ts:51-71)

- `discTex()` 128^2: solid white disc with a soft rim (radial gradient r 58 -> 64).
- `haloTex()` 256^2 ImageData: alpha `0.55 exp(-(u/0.25)^2) + 0.35 exp(-(u/0.6)^2)`, faded to 0 from u 0.8 to 1.
- `SUN_SHOT = { 2: { az: 120 }, 11: { az: -70, el: 8 }, 12: { az: -30, el: 18 } }` (:67): per-shot sun angles (degrees). A `sunAz`/`sunEl` field on a ShotDef would win, but `ShotDef` does not declare them (cast at :338).
- `smokeTex()` 256^2: four grey ellipses `#8f8d96 #a3a1aa #8f8d96 #b4b2ba` drawn with `Pen.ell` (no outline).

### 3.4 `sightLines()` (world.ts:74-86)

- For every shot, every 2nd frame from `a - 8` to `b + 8`: camera from `camAt(id, f)`.
- 5 rays per sample: centre (core), +-0.6 of the half-width, +0.6 and -0.4 of the half-height. Half-height tangent `ty = tan(fov/2)`, half-width `tx = ty * 9/16` (portrait frame hard-coded).
- Passed to `buildTown()` (world.ts:219). Note: the bridge, towers, ground, swing frame are built before and are never culled.

### 3.5 `World` constructor (world.ts:115-326)

**Sky + light (:117-154)**

- Sky: `SphereGeometry(1100, 48, 24)` with a `ShaderMaterial` (BackSide, no depth write, no fog), renderOrder -1, NOINK layer, follows the camera every frame.
  - Fragment: elevation `el = asin(dir.y)`; 5 colours c0..c4 blended with `smoothstep` at elevations `0, e.x, e.y, e.z, e.w` (radians). The first stop is fixed at 0 deg; `LOOK.sky.e[0]` is never read.
  - Colours come from `LOOK[light].sky` (lights.ts): day `#b8d0ec #9cbfea #6a9fe0 #4f8cdb #3373cc` at 0/3/8/16/40 deg; golden `#ffc47c #f7ae78 #e8967c #c4848e #8a6f8a` at 0/4/10/20/40 deg. Written through `untone()` (shade.ts:71) so that after the PBR-Neutral tone map they land on the exact on-screen colour.
- Sun disc sprite: HDR colour (6.0, 4.4, 2.4) so it blooms; renderOrder -0.5. Halo sprite: additive, renderOrder 5. Both NOINK, both golden-only.
- Lights: `HemisphereLight("#cfe6ff", "#6c5c8c", 1.1)`, sun `DirectionalLight("#fff0d6", 2.6)` with `castShadow` and a **4096 x 4096** shadow map, fill `DirectionalLight("#9fb8ff", 0.35)`. All overwritten per frame; fill intensity is set to 0.
- Clouds: 4 day + 4 golden `cloudHD` maps. 9 planes: angle `i/9 * 2PI + 0.3`, distance `620 + (i % 3) * 60` from the world origin, height `120 + (i % 4) * 38`, width `130 + (i % 4) * 30` (height = width / 2). `MeshBasicMaterial` colour 1.1 (slightly HDR), transparent, no depth write, no fog, NOINK.

**Static ground batch (:156-218)** - one `Batch`, built into the root:

- Materials `M` (all two-tone):
  - `grass` = `grassHD`, `cobble` = `cobbleHD`, `wall` = `stoneHD("wallHD", ...)`, `cope` = `stoneHD("copeHD", ...)`, `tower` = `stoneHD("towerHD")`.
  - `iron` = `twoTone(MeshPhong { color "#3d414c", specular "#8a8a8a", shininess 60 }, 0.15)`.
  - `steel` = `twoTone(MeshPhong { "#7d8088", "#b0b0b0", 45 }, 0.15)` (bolts, eyes).
  - `wood` = `beam()`, `bed` = `bed()`, `sand` = colour `#e2c992`.
- Per bank `s = -1, +1`:
  - Grass: `quadUp` x -900..900, |z| 30..900, UV (450, 217.5) = 4 m tiles.
  - Quay cobbles: x -160..160, |z| 30..36.5, 1.2 cm up, UV (80, 1.625).
  - Main street cobbles: x -6..6, |z| 36.5..170, UV (3, 33.375).
  - Embankment wall: `wallQuad` at z = +-30 from y -0.6 to D0, x +-900, facing the river, 4 m tiles.
  - Parapet: `copeHD` boxes x -600..-4.6 and 4.6..600, y D0..D0+0.75, 0.5 m thick; plus a coping slab x +-600, y D0-0.05..D0+0.02, z 29.4..30.6.
- River bed: x +-900, z -30..30 at y -0.6, UV (225, 7.5) = 8 m tiles.
- **Towers** at z = +-27 (:182-195): two columns per tower at x = +-3.35 (box 1.4 x 1.6, y -0.6..15.6, `towerHD` tile 2); plinths 1.9 x 2.1, y -0.6..1.1; a near-flush string course (1 cm proud) at D0+3.0..3.45 (comment: an 8 cm ledge aliased into a lit dashed line); square pyramid caps (`ConeGeometry(0.98, 1.5, 4)` turned 45 deg) on 17.9..19.4; lintel x +-4.05, y 15.6..17.4; cornice `copeHD` x +-4.3, y 17.4..17.9; iron chain saddles at x +-2.7 (0.44 x 0.7 x 1.84, y 16.25..16.95); wooden flag pole 0.14 m square, y 17.9..21.4.
- **Anchorages** at z = +-37, x = +-2.7 (:196-207): `copeHD` block 2 x 0.9 x 2.6 (y D0-0.4..D0+0.5); iron base plate; two iron cheek plates; a steel bolt (r 0.075, 0.62 long, along x) + steel eye ring (torus r 0.17, tube 0.05) at y D0+0.86. The near-left one (x < 0, z < 0) is skipped here because it is the dynamic bolt.
- **Swing frame** at `PARK = (70, D0, -75)` (:213-217): two A-frames at z +-2.2, legs from (70, D0+3) out to x 70 +-3.0 at ground, thickness 0.15; top bar along z (+-2.35) at height 3, thickness 0.17; a sand circle r 3.4 (1.2 cm up). Comment: the A legs must clear the swing arc on screen.
- `b.build(R)`, then `buildTown(R, kit, sightLines())`.

**Water (:221-245)** - its own mesh `quadUp(-900, 900, -30, 30, 1, 1, -D0)` at y = 0, `receiveShadow = true`.

- `MeshLambertMaterial` white, patched in `onBeforeCompile` (cache key `"river1"`). Uniforms `this.WU`: `wNearC, wMidC, wFarC, wCrest, wTrough, wGlint` (colours), `wShade` (Vector3, default 0.5, 0.56, 0.72), `wNearTex`, `wFarTex`, `wTime`.
- Vertex: passes world position `vWP`.
- Fragment (`WATER_COL`, world.ts:548-559) replaces `<map_fragment>`:
  1. `wDep = asin(-V.y / |V|)`: how far below the horizon the view ray points.
  2. `wf = 1 - smoothstep(0, 0.42, wDep)`: 1 at the horizon, 0 at 24 deg down.
  3. Colour = near -> mid over wf 0..0.55, mid -> far over 0.55..1.
  4. Marks: `mix(texture(near, wp/8), texture(far, wp/40 + 0.37), smoothstep(25, 90, distance))`, `wp = xz + (0.35 t, 0)`.
  5. `mix` toward trough by G*0.6, crest by R*0.7, glint by B*(0.3 + 0.5 wf).
- Lighting: captures the sun shadow (`sunVis`) with shade.ts `LFB`, then `directDiffuse = colour * mix(wShade, 1, sunVis)`, indirect = 0. So water ignores the sun angle: full colour in sun, times `wShade` in shadow (that is how the bridge shadow shows on the water).
- Colours per light from `LOOK[light].water` (lights.ts): day near `#22a7b6`, mid `#167fb2`, far `#1a5596`, crest `#7ddfe8`, trough `#0e4a80`, glint `#ffffff`, shade (0.5, 0.56, 0.72). Golden near `#1e3a6e`, mid `#355f96`, far `#d4a48e`, crest `#d9a088`, trough `#16294f`, glint `#ffe2b0`, shade (0.42, 0.46, 0.72). All passed through `untone()`.

**Bridge - dynamic (:247-298)**

- Deck top: custom geometry, 2 vertices per z sample at x = +-2.5 (deck 5 m wide), UV `[0, z/2, 2.5, z/2]` (2 m tiles), `planksHD` material, anisotropy 16.
- Deck side: 6 vertices per sample (left face, right face, bottom), 0.45 m deep, UV u = z/3, `beamHD` material.
- Instanced meshes (all cast + receive shadows, no frustum culling):
  - `posts`: 82 boxes 0.11 x 1.12 x 0.11 at x = +-2.42.
  - `ribs`: 41 boxes 5.7 x 0.26 x 0.24, 0.58 m under the deck.
  - `hangers`: 70 cylinders r 0.035 (5 sides), unit height, at x = +-2.62, scaled to chain height.
  - `bunting`: 94 triangle pennants (0.34 wide, 0.42 tall), double-sided `lam("pennant")`, per-instance colours cycling `#d23b3b #f3d35a #3f6fb5 #f7f1e1 #2f8a4f`.
- Strands: 4 rails (`M.wood`, sizes 0.1/0.1, 0.07/0.07, 0.1/0.1, 0.07/0.07, tile 3) at x +-2.42, heights 1.08 and 0.6 over the deck; 2 main chains (link mode, h 0.3) at x +-2.7; 4 backstays (18 points each, link mode).
- Chain material: `twoTone(lam("chainHD", ...), 0.15)` then `color.set("#8c847c")` (:276-277). See bug B3.
- Bolt: two half cylinders (r 0.075, 0.31 long) `boltA`, `boltB` + the eye torus, all steel, all cast shadows.
- Tower flags: `PlaneGeometry(1.7, 1.0, 12, 1)` with `flagTex`, double-sided, at (0, 20.75, +-27).

**Smoke (:299-307)**: 7 puffs at (-22, D0+30.6, -77) and 6 at (-80, D0+24.6, 93); each its own `MeshLambertMaterial` (map `smokeTex`, transparent, no depth write), NOINK.

**Sign (:308-317)**: shots 14-15. Face `PlaneGeometry(1.4, 1.04)` `MeshBasicMaterial` (unlit; when lit it went grey-blue) with `ctex("sign", 700, 520, fxSign)` (a text-free "no marching in step on the bridge" pictogram from toon.ts), colour `0xe6e6e6`, alphaTest 0.5, NOINK, at `SIGN_AT = (2.25, D0, -30.9)` (cast.ts:372), y D0+1.62, turned PI. Wooden back board 1.46 x 1.1 x 0.06 and two posts 0.12 x 2.15 at x +-0.52.

**Swing + foreground (:318-325)**:

- `this.swing = new Actor(R, swingGeo)`. `swingGeo` (world.ts:561) is a plane `700 * SU_SWING x 2300 * SU_SWING` (0.88 x 2.89 m; `SU_SWING = 2.3 / 1830` m per drawing unit) moved down so the pivot is near its top.
- `FOREGROUND` (story.ts:339): `kitClone(kit, fg.kit, fg.s)` placed at `fg.pos`, yaw `fg.yaw`, hidden by default. Bridge story uses a cart (-3.8, D0, -38) for frames 1735-1770 and a bush (69.65, D0, -79.4) for 1411-1620.

### 3.6 `shotSun(id, s, L)` - camera-relative sun (world.ts:329-344)

- Averages the camera's horizontal forward direction over the shot (every 3rd frame).
- Turns it by azimuth `az` toward screen right (`az` 0 = sun straight ahead = backlight, +90 = screen right, 180 = behind the camera), then lifts it by elevation `el`.
- Priority: `ShotDef.sunAz/sunEl` > `SUN_SHOT[id]` > `LIGHTS[light].az/el` (day az 75 el 48; golden az 6 el 7).
- Cached per shot id. So the sun is frozen for the whole shot and always lights the shot from a pleasing angle, not from a fixed world direction.

### 3.7 `update(id, f, cam, scene)` - every frame (world.ts:349-459)

1. Time: `t = f / FPS` (30), shot `s = SHOTS[id - 1]`, story time `tau = s.tau(t)`, bridge state `b = bridgeState(id, t)`, preset `L = LIGHTS[s.light]`.
2. Camera from `camAt(id, f)`: position, `lookAt`, `rotateZ(roll)`, fov; near 0.2, far 1500. Enables layer NOINK on the camera.
3. Light rig:
   - Hemisphere colour/ground/intensity from L (only matters for non-two-tone materials such as smoke).
   - Sun colour and intensity from L. Sun placed 220 m from the look point along `sunDir`, target = look point.
   - Shadow box half-size `Rr = clamp(dist * 1.15 + 7, 12, 95)` (golden at least 30, because low sun throws long shadows); shadow near 20, far 480; `bias = L.bias`; `normalBias = L.normalBias * Rr / 12`.
   - Two-tone uniforms (shade.ts `TONE`): `uLitCol, uShadeCol, uShadeLift, uLambert, uSideK, uTerm, uBounce, uSat`. Card uniforms (`CHAR`): `uCharTint, uCharShade, uGrad, uBodyGrad, uSideTint`.
4. Sky colours + stops, sky follows the camera. Fog = `untone(L.fog)`, near `L.fogNear`, far `L.fogFar` (day 25..300, golden 50..380); `scene.fog = this.fog`, `scene.background = null`.
5. Golden only: sun disc at camera + 900 m along `sunDir`, size `2 * 900 * tan(1.7 deg)`; halo size `2 * 900 * tan(24 deg)`, colour `L.sunDisc * 1.3`.
6. Clouds: yaw toward the camera (`lookAt(cam.x, cloud.y, cam.z)`), map switched to the day or golden set.
7. Water uniforms from `LOOK[light].water`, `wTime = t`.
8. Foreground objects visible only inside their frame range AND inside the current shot (so a crossfade layer never shows another shot's foreground).
9. `poseBridge(b, t, tau, id)`.
10. `sign.visible = id >= 14`.
11. Smoke: phase `u = (t * 0.11 + k) % 1`; size `3 + 9u`; drifts `-18u` in x, rises `13u + 4u^2`, `+3u` in z; faces the camera; opacity `0.85 (1 - u)^1.2`.
12. Cast: `stage(id, t, b, { pos, right })` from cast.ts gives `places` (characters) and `fx` (effect cards).
    - Shot 8: `snapFx` at BOLT, `splashFx`, and `creakFx` between tau 33.1 and SNAP. Shot 7 after t 28.9: `creakFx` on the chain ahead of the front row.
    - Each place: frustum test (sphere r 3.5 around the body, except the swing); reuse an `Actor` from a growing list; `pool.req(key, w, h, k, draw)` (default canvas `[300, 500, 0.5]`); position; yaw toward the camera unless given; mirror by negative x scale; `castShadow = L.actorShadow` (golden only).
    - Each fx: frustum test; `Fx` card; flat (on the ground, rotated -90 deg in x) or camera-facing; scale (w, h).
    - Unused actors / fx are hidden; `pool.flush()` paints only new drawings; then `bind()` swaps textures.
13. Returns the look point (Bridge.tsx uses it as the default focus for lens blur).

### 3.8 `poseBridge(b, t, tau, id)` (world.ts:461-540)

- Deck: y from `deckY` per sample; top normal `(0, 1, -slope) / |...|` with a central difference; side faces 0.45 m deep.
- Posts and ribs follow the deck. Rails at x +-2.42 at deck + 1.08 and + 0.6. Chains at x +-2.7 along `chainY` over CZ. Hangers from the deck up to the chain.
- Bunting at `chainY - 0.1`, hidden (scale 0) where the intact chain is less than 3.3 m above the deck (|z| < ~8.5 m) so pennants never cover the soldiers' hats. Decided on the intact curve so none pop during the fall.
- Backstays (18 points): far pair = simple sag (dip 0.5 m) from (x, 16.6, 27) to (x, D0+0.86, 37). Near-right: sag blended with a drape over the wall (`drape`) by `smooth(drop)`. Near-left: whips from the snapped bolt end (`snapEnd`, extra dip `0.25 + 0.6 sin(PI snap)`), then drapes to (-3.3, D0+0.12, -33.2). Before the snap, in shot 8, the bolt jerks with each footfall: `jerk = 0.06 * bounce`.
- Bolt halves: whole until the snap; then ballistic flight with g = 9.8 from BOLT, velocities (-2.4, 4.4, 1.1) spin 17 and (2.1, 3.7, -0.9) spin -14, stop on landing (`tl` solves the fall to D0+0.08); shots >= 9 show them landed (ts = 9 s); shot 15 shows the bolt whole (rebuilt bridge).
- Tower flags wave: `x = -1.7u`, `y = +-0.5 + 0.05 u sin(4t - 3u)`, `z = 0.24 u sin(5.5t - 5u + z0)`. Normals are not recomputed.

### 3.9 Helper geometry at the bottom (world.ts:561-578)

- `quadUp(x0, x1, z0, z1, u, v, dy = 0)`: upward-facing rectangle at `y = D0 + dy` with UV 0..u, 0..v. Needs `z0 < z1`.
- `wallQuad(x0, x1, z, dir)`: vertical rectangle from y -0.6 to D0 at z, normal (0, 0, dir), 4 m tiles. Swap x0/x1 to flip the facing.

### 3.10 Scene graph summary (children of `world.root`, in creation order)

1. Sky sphere (NOINK, renderOrder -1).
2. Sun disc (NOINK, -0.5), sun halo (NOINK, 5, additive).
3. Hemisphere light, sun + target, fill + target.
4. 9 cloud planes (NOINK).
5. Static batch meshes: grass, cobbles, embankment, parapets, bed, towers, anchorages, swing frame (one mesh per material).
6. Town batch meshes from `buildTown` (one mesh per material).
7. Water mesh.
8. Deck top + deck side meshes.
9. Instanced posts (82), ribs (41), hangers (70), bunting (94).
10. 4 rail strands, 2 chain strands, 4 backstay strands.
11. Bolt halves A/B, eye ring.
12. 2 tower flags.
13. 13 smoke puffs (NOINK).
14. Sign group (face NOINK, back board, 2 posts).
15. Swing actor card (NOINK), then FOREGROUND groups (hidden).
16. Lazily: character `Actor` cards and `Fx` cards (all NOINK).

---

## 4. Bugs / contradictions

Severity: (H) visible or misleading for new work, (M) minor visual / waste, (L) cosmetic or doc-only. "Confirmed" = clear from the code; "plausible" = needs a render or runtime check.

- **B1 (M, confirmed) Weak texture seeding.** `ctex` seeds with `key.length * 131 + key.charCodeAt(0)` (paint.ts:15). Keys with the same length and first letter get the exact same random layout:
  - all five `roofHD#xxxxxx` keys (13 chars) -> identical tile tones and weathering;
  - `leafHD0..4` -> identical leaf dabs;
  - many facade keys, e.g. `facHDhf0_9_8.4` and `facHDhf3_7_9.8` (14 chars) -> same blotches, cracks and which windows get curtains.
  - `cloudHD` works around it with its own seed (paint.ts:668), which proves the issue was known. Fix: hash the whole key (e.g. FNV-1a) before `rng`.
- **B2 (M, confirmed) `stoneHD` ignores its arguments for listed keys.** `STONE_PAL[key]` overrides `cols` and `mortar` (paint.ts:359-360). world.ts:161-162 passes custom colours for `wallHD` and `copeHD`; they are silently thrown away. Anyone retuning stone colours in world.ts will see no change. Edit `STONE_PAL` instead, or use a new key.
- **B3 (M, confirmed) The chain material contradicts itself.**
  - `lam("chainHD", make)` never calls `make()` (build.ts:20-25), so the `map: rep(chainHD(), 1, 1)` and `side: DoubleSide` passed in world.ts:276 are ignored and `chainHD()` (paint.ts:697-719) is dead code.
  - `twoTone()` runs twice on the same material (once in `lam` with liftK 1, again in world.ts:276 with 0.15). The second call replaces the first; harmless but confusing.
  - build.ts:21-23 says the chain is "slate blue-grey `#7a8490`", but world.ts:277 then sets `#8c847c` (warm grey), and its comment "multiplier on the painted links" is stale (there is no texture).
- **B4 (L, confirmed) facadeHD density doc vs code.** Docstring paint.ts:522 says 96 px/m; code paint.ts:526 uses 72 px/m (the inline comment explains why). textures.md also says 96.
- **B5 (M, confirmed) 15 of 26 GLBs load for nothing.** All `VEG` names (11), both banners and `grass`/`grass_large` are fetched and parsed (world.ts:17-19) but `prop()`/`kitClone()` draw those procedurally or never place them. Only 11 GLBs are used. `loadKit` also swallows load errors (world.ts:24), so a missing lantern or stall simply vanishes with no warning.
- **B6 (L, confirmed) Deck side texture upside down and squashed.** Side UVs put v = 0 at the deck top and v = 0.3 at the bottom of a 0.45 m face (world.ts:258). With three's flipY, the lit "top lip" of each timber in `beamHD` ends up at the bottom, and 0.45 m shows 0.3 m of a texture that paint.ts:318 says is "height in m".
- **B7 (L, plausible) Box-mode Strand UV seam and grain direction.** The 4 corner vertices are shared, so the 4th face maps u from 0.75 back to 0 (a squeezed, mirrored strip) (build.ts:230). Also `beam()` grain runs along canvas x = around the rail, so rail grain runs across the rail instead of along it.
- **B8 (L, plausible) Mill gables use the window facade.** build.ts:645-646 maps the whole 12 x 13 m `mills` facade (5 windows x 4 floors) onto a 12 x 3.5 m triangle with UV (0,0)(1,0)(0.5,1): squashed windows in the gable if it is ever seen.
- **B9 (L, confirmed) Back walls and the 16 m house stretch the 8 m side layout.** Back walls reuse the 8 m side texture over 7 or 9 m. The factory house `house(b, -80, 100, PI, 16, 10, 9.8, 7)` shares `hs7_9.8` with normal houses, so its 10 m sides and 16 m back show stretched windows, while `houseDetail` puts fixed 1.2 m sills under them.
- **B10 (L, confirmed) House cull box shorter than the chimney.** `house()` culls up to `h + 0.42 d + 1.2` (build.ts:494) but the chimney pot reaches `h + rh + 1.68`. A pot can poke into a sight line.
- **B11 (M, plausible) Shared global lighting uniforms during crossfades.** `TONE` and `CHAR` (shade.ts) are module globals that every two-tone material shares. During a crossfade Bridge.tsx renders two `ShotView`s, each with its own `World`; both `update()` calls run in the same React render, so the second one's light preset (e.g. golden) likely ends up in both canvases when they draw. Affects day/golden crossfades (XFADE at shots 11 and 14). Needs a frame check at those crossfades; a fix is to re-apply the uniforms in an `onBeforeRender` hook per canvas.
- **B12 (L, confirmed) Dead initial values.** Constructor Fog `("#bccbec", 25, 420)`, sun `("#fff0d6", 2.6)`, hemisphere `("#cfe6ff", "#6c5c8c", 1.1)`, fill `0.35` are all overwritten every frame (fill is set to 0). `LightPreset.top`, `.hor`, `.skyCurve` (lights.ts) are not read by world.ts (the sky uses `LOOK.sky`). `LOOK.sky.e[0]` is ignored by the sky shader (first stop is fixed at 0 deg).
- **B13 (L, confirmed) `roofHD` cache key ignores `slate`.** `ctex("roofHD" + col, ...)` (paint.ts:469): calling `roofHD(c, true)` after `roofHD(c, false)` returns the tile version.
- **B14 (L, confirmed) Flag normals not updated** after the wave deformation (world.ts:532-539), so lighting on the flags stays flat.
- **B15 (L, confirmed) LOD by distance from the world origin.** `prop()` picks tree lobe detail by `hypot(x, z)` from (0, 0) (build.ts:434-435), not from the cameras. Fine for this story because all cameras are near the bridge; wrong for a story whose action is far from the origin.
- **B16 (L, confirmed) Stale docs.** `references/reports/CONTEXT.md` still describes `Fog(90, 560)`, emissive cards and old textures. Comments point at files not shipped (`compare/textures/proto/paint_recipe.ts`, "reel-kit"); the recipe itself is printed in `textures.md`'s appendix.
- **B17 (L, confirmed) `sight` is module state.** `inTheWay` only works inside `buildTown()` (which sets and clears `sight`). Calling `house()` or `prop()` from new code outside `buildTown` silently disables culling.
- **B18 (L) Banner fold paint is ~0.37 rad out of phase** with the geometry folds (`+0.6` offset in bannerGeo vs none in bannerTex). Cosmetic.

---

## 5. Hard-coded paths & versions

- **GLB path:** `staticFile("bridge/kenney/<name>.glb")` (world.ts:24) -> `<Remotion project>/public/bridge/kenney/<name>.glb`. The files are NOT in this repo; you must get the Kenney CC0 kits (most likely Nature Kit + Fantasy Town Kit) and copy the 26 (really 11 used) files with these exact names. Material names must match `RECOLOR` keys for recolouring to work.
- **Remotion dependency inside the world:** `import { staticFile } from "remotion"` (world.ts:6). `World` cannot run outside Remotion without changing that line.
- **three.js import paths and shader patches:**
  - `three/examples/jsm/loaders/GLTFLoader.js` (world.ts:5), `three/examples/jsm/utils/BufferGeometryUtils.js` (build.ts:5).
  - The water shader and `twoTone` patch three's built-in shader chunks by name (`<common>`, `<project_vertex>`, `<map_fragment>`, `<lights_fragment_begin>`, `<lights_fragment_end>`); shade.ts:21-25 string-replaces exact text inside `lights_fragment_begin` and throws `"shade.ts: three lights_fragment_begin changed"` if three changes it.
  - Stack pinned (CONTEXT.md): Remotion 4.0.290, three 0.175, @react-three/fiber 9.1.2, @react-three/postprocessing 3.0.4, postprocessing 6.37.2. Upgrading three is the most likely thing to break the world.
- **Browser-only code:** `document.createElement("canvas")` in `ctex` (paint.ts:13) and `ImageData` in `haloTex`; `CanvasRenderingContext2D.filter = "blur(px)"` in `cloudHD` (paint.ts:680) needs Chromium (Remotion's headless Chrome is fine; Safari ignores it). These textures cannot be generated in plain Node.
- **Output frame assumptions:** portrait 9:16 in `sightLines` (`tx = ty * 9/16`, world.ts:81); Bridge.tsx canvas 1080x1920.
- **Fixed render constants:** camera near 0.2 / far 1500 (world.ts:354), sky radius 1100, sun 220 m from focus, sun disc at 900 m, shadow map 4096^2, shadow near 20 / far 480, shadow half-size 12..95 m, fps 30 (story.ts), program cache keys `"river1"` and `"twoTone5_<liftK>"`.
- **Story constants baked into the world:** `D0 = 6.0`, the river band |z| < 30, water at y 0, bed at y -0.6 (also in `wallQuad`), bridge x +-2.5 / z +-30, towers at +-27, anchorages at +-37, parapet gap |x| < 4.6, chimney/smoke coordinates, `PARK`, `SIGN_AT`, `ANCHOR`/`BOLT`.
- **Hard-coded shot ids in world.ts:** `SUN_SHOT` {2, 11, 12}; `id === 8` (snap/splash/creak fx, bolt jerk); `id === 7 && t > 28.9` (chain creak); `id >= 14` (sign); `id === 15` (bolt whole again); `id >= 9` (bolt halves landed). story.ts `bridgeState` also special-cases ids 8-15.
- **Historical / national content:** `flagTex()` is England's St George's cross for an 1831 English story; church, mill, chimneys and brick terraces are a northern-English town.
- **No OS-specific file paths** in these three files. (The OS/disk gotchas live in SKILL.md and the render scripts.)

---

## 6. What to change for a new story

### 6.1 What is generic and reusable as is

- `paint.ts`: `rng`, `ctex`, `rep`, `jit`, `dim`, the HD helpers (`U`, `wrapX`, `wrap2`, `rr`, `blotch`, `grain`, `nail`) and every HD painter as a technique. `cloudHD`, `waterMarks`, `grassHD`, `stoneHD`, `cobbleHD`, `roofHD`, `facadeHD`, `planksHD`, `beamHD` all take colours or keys and can be reused with new palettes.
- `build.ts`: `lam`, `toLambert`, `quad`, `tri`, `boxGeo`, `Batch`, `Strand` (ropes, rails, chains, cables, vines), `inTheWay` sight-line culling, `addVeg` cartoon trees/bushes/hedges, `bannerProp`, `prop`, `kitClone`, `house` + `houseDetail`.
- `world.ts`: the sky shader + `LOOK` stops, sun disc/halo, the camera-relative frozen sun (`shotSun`), the shadow fit, fog = horizon colour, the cloud ring, the water shader (any river, lake or sea), smoke puffs, the foreground toggling, and the whole cast/fx loop at the end of `update()`.

### 6.2 What is bridge-story specific and must be replaced

1. **The set itself.** Write a new `buildX(root, kit, rays)` in place of `buildTown()` (build.ts:588-703). Keep the pattern: one `Batch`, a fixed `rng(seed)`, `sight = rays` at the start and `sight = []` at the end, exclusion zones like `inPark`, then `b.build(root)`.
2. **The hero structure.** Everything between world.ts:247 and :298 plus `poseBridge()` (world.ts:461-540) and the bridge constants (world.ts:30-50) is the suspension bridge. Replace it with the new story's moving/hero object (a boat, a cart, a tower, a machine). Keep the method: fixed vertex buffers + `InstancedMesh` + `Strand`, positions computed in a pure function of story state, `needsUpdate = true` each frame.
3. **Ground and water layout.** world.ts:170-180 assumes a river band |z| < 30 between two banks at height `D0`. For no river: one `quadUp` grass plane, drop the bed, walls, parapets and the water mesh. For a lake or sea: keep the water mesh and change its rectangle. Remember `quadUp` needs `z0 < z1`, and `wallQuad` has y -0.6..D0 hard-coded.
4. **Towers, anchorages, swing frame, sign** (world.ts:181-217, 308-318) are story props. Remove or swap. The sign's picture is `fxSign` in toon.ts.
5. **Shot-id special cases.** Remove or rewrite `SUN_SHOT`, the `id === 7/8/9/14/15` branches in `update()` and `poseBridge()`, and the `creakFx`/`snapFx`/`splashFx` calls (cast.ts).
6. **Smoke sources** (world.ts:301) must match the new chimneys / fires / volcanoes.
7. **Flags and emblems.** Replace `flagTex()` (build.ts:577) and the banner emblem (build.ts:387-391) with the new place's flag, or a neutral design. Check every painted symbol for unwanted national meaning (the bridge team once drew a flag that "read as Vietnam's flag").
8. **Architecture.** Replace `STYLES` (build.ts:479-488) with the new place's wall/shutter/roof palette. `house()` only makes pitched gabled roofs. For flat roofs (Indian, Middle Eastern, desert towns), add a `flatHouse()` that reuses the walls + `houseDetail` and adds a parapet box and a roof slab instead of the gable triangles and roof quads. Keep the facadeHD layout rule (2.8 m floors, 2.2 m per window, sill at +0.9 m) in sync with `houseDetail`.
9. **Church, mill, factory house, hills, park** (build.ts:622-700) are all hand-placed for this town. Re-place for the new map. Hills: keep the half-sphere trick, change the table and colours (`#78b257 #6aa24e #8bbf63`).
10. **Props.** Update `KENNEY` (world.ts:17) to the GLBs the new world needs, drop the unused ones, and copy them to `public/bridge/kenney/` (or change the `staticFile` path to e.g. `"<story>/kenney/"`). Add recolour entries to `RECOLOR` (build.ts:34) for any new teal or off-palette material names. Add cartoon kinds to `VEG` if new plant names should be drawn procedurally (e.g. palms would need a new `addVeg` branch).
11. **Story coupling.** `D0`, `PARK`, `ANCHOR`, `SIGN_AT`, `FOREGROUND`, `SHOTS` and `camAt` come from story.ts / cast.ts. Change them together; world.ts imports about 20 names from story.ts.

### 6.3 What to retune (no structural change)

- **Light and sky** (lights.ts, read by world.ts): `LIGHTS.day/golden` sun angle, colours, fog near/far; `LOOK.sky` five stops; `LOOK.water` six colours + shade; `LOOK.cloud`. Night or rain would need a new preset key in both records plus the `Light` type in story.ts; `update()` already indexes by `s.light`, but `showSun` is golden-only and the cloud map switch assumes only `"day" | "golden"`.
- **Stone colours:** edit `STONE_PAL` in paint.ts (not the world.ts arguments, see B2).
- **Ground textures:** `grassHD` base `#73b23d`; for sand, dirt or snow, copy `grassHD` and change base, patch colours and replace tufts with pebbles or footprints. Keep 1024 px = 4 m.
- **Wood:** `planksHD` fills, `beamHD` fills, `beam()` base `#a8743f`.
- **Water:** mark density via `waterMarks("near", 28, 5)` / `("far", 220, 30)`, drift speed `0.35` and tile sizes 8 m / 40 m in `WATER_COL`.
- **Warm albedos.** The shade colour is blue-violet, so near-neutral greys turn lavender in shadow. Keep walls and stone warm (ochre, cream, terracotta), as the comments in paint.ts:346-348 and build.ts:475-478 say.

### 6.4 Checks for a new world

- Change the seed formula in `ctex` (B1) before adding many same-length keys, or give keys distinctive lengths.
- After changing cameras, re-check which houses/props were culled by the sight lines (nothing is logged). A quick debug: count calls that return early from `house()`/`prop()`.
- Props closer than about 2 m to a lens become huge blurred blobs (SKILL.md gotcha). Re-check props near every moved camera.
- Put anything camera-facing, transparent or unlit on layer `NOINK`, or `noInkFallback` (ink.ts:382) will try to guess.
- Keep texel density: about 1024 px per UV unit, UV unit sized so the closest lens sees <= 6 screen px per texel (textures.md section 4: `px/m = 2954 / distance`).
- If a new world puts the action far from the origin, fix the tree LOD distance (B15) and move the cloud ring (clouds are placed around (0, 0)).

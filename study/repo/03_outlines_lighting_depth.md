# Slice 03: ink outlines, lighting, depth (study notes)

Repo: `mromidev/claude-animated-shorts`, read-only clone at `<ROOT>\repo`.
Paths below are relative to that repo root.

## Files read

| File | Lines | How read |
|---|---|---|
| `references/reports/outlines.md` | 624 | every line (slice file) |
| `references/reports/lighting.md` | 603 | every line (slice file) |
| `references/reports/depth.md` | 556 | every line (slice file) |
| `references/reports/CONTEXT.md` | 55 | every line (the shared brief all three reports were written against) |
| `templates/bridge/ink.ts` | 393 | every line (shipped version of the outlines recipe) |
| `templates/bridge/lensblur.ts` | 139 | every line (shipped version of the depth recipe 6.1) |
| `templates/bridge/lights.ts` | 63 | every line (shipped version of lighting recipe 9.1) |
| `templates/bridge/shade.ts` | 77 | every line (shipped version of lighting recipe 9.2, world part) |
| `templates/bridge/cardshade.ts` | 85 | every line (shipped version of lighting recipe 9.2 card part + 9.5) |
| `templates/bridge/Bridge.tsx` | 116 | every line (composer order) |
| `templates/bridge/world.ts` | 578 | lines 40-139 and 330-459, plus grep (sun rig, fog, sky, sun disc/halo) |
| `templates/bridge/cast.ts` | 473 | lines 200-224, plus grep (contact blobs, NOINK, card material) |
| `templates/bridge/paint.ts` | 720 | lines 305-324, plus grep (INKL stroke, plank seams) |
| `templates/bridge/story.ts` | 348 | grep of lines 45-61 and 291-330 (SHOTS lights, DOF table) |
| `templates/bridge/build.ts` | 703 | grep only (twoTone wiring, metal) |
| `SKILL.md` | 166 | lines 80-166 + grep (final look values, gotchas) |
| `references/STYLE_BIBLE.md` | 44 | every line |

No images were opened. The reports name many crop and sheet images (`references/outlines/...`, `references/lighting/...`,
`references/depth/...`), but **those folders are not in the repo** (see Bugs).

---

## 0. What these three reports are (read this first)

- They are **measurement reports**. The authors were "look-match" agents. Each one compared 20 reference shorts from
  a reference channel (720x1280, 30 fps) with stills of our first render of "The Bridge That Fell for a Song"
  (540x960 stills, frame number in the name, e.g. `b_1900`, `c_1450`). They turned what they saw into numbers and a
  recipe for our code. CONTEXT.md is the brief they all got.
- Story setting the numbers came from: 1831 Broughton suspension bridge, 74 marching soldiers. Shots 1-7 day march,
  8 bolt snaps, 9-10 soldiers in the river, 11-13 golden hour, 14 bank + officer, 15 tourists (CONTEXT.md:21-25).
- The **templates in `templates/bridge/` are the shipped result after 4 verifier rounds**. They started from these
  recipes and then changed many values. So: the reports give the *measured target and the reasoning*; the templates
  give the *values that were finally used*. Where they differ, both are listed below. SKILL.md:83 says to start every
  new short from `templates/bridge/`.
- Stack the recipes target (CONTEXT.md:29): Remotion 4.0.290, three 0.175, @react-three/fiber 9.1.2,
  @react-three/postprocessing 3.0.4, postprocessing 6.37.2, composition 1080x1920 30 fps.
- Tools the agents had: python (numpy 2.4, PIL 12, scipy 1.18, no OpenCV), ffmpeg. No pip installs, no downloads.
- Caption band: the reference has burned-in one-word captions (white bold, black outline) at 60-74 % of frame height
  (outlines/lighting) or 55-86 % (depth.md:41). That band was masked out of every statistic.

### Jargon used below (short definitions)

- **px @720 / @1080**: a pixel size measured on a 720-wide or 1080-wide frame. 720 → 1080 is ×1.5. Our 540 stills → 1080 is ×2.
- **luma / Y**: brightness of a pixel (0-255 luma, or 0-1 Y). **Linear light**: brightness before the sRGB gamma curve.
- **EW (equivalent width)**: line width computed as (area of the dark dip) / (background luma − 12). Does not change when a line is blurred.
- **FWHM**: full width at half maximum, the width of a line at half its darkness.
- **10-90 % rise**: how many pixels an edge takes to go from 10 % to 90 % of its step. Measures sharpness.
- **Silhouette / depth jump**: an outline where one object is in front of something farther away (or the sky).
- **Crease**: a corner on one object (box corner, wall top). **Convex** = sticks out; **concave** = inner corner (object meets floor).
- **Billboard / card**: a flat plane with a character drawing that turns to face the camera.
- **Effect vs Pass** (postprocessing lib): an *Effect* is a small shader that R3F's `<EffectComposer>` merges with its neighbours into one *EffectPass*; a *Pass* is a separate render step that is never merged.
- **CoC (circle of confusion)**: the radius of the blur disc a point gets from depth of field (DOF).
- **sigma (σ)**: blur amount as the standard deviation of a Gaussian, here in 720p px. Conversion used everywhere: **blur-disc radius at 1080p ≈ 3 × sigma720** (a uniform disc has σ = R/2, then ×1.5 for 1080; depth.md:6).
- **Thin lens**: the physical camera-lens formula; blur grows as |1 − focus/distance|.
- **e-fold**: the distance over which a glow falls to 1/e (about 37 %) of its start value.
- **Airlight / horizon colour (A)**: the colour of the sky just above the skyline; haze pulls far objects toward it.
- **Tone mapping (PBR Neutral)**: the curve that squeezes HDR light values into screen values. Its toe subtracts a little from very dark channels; its shoulder starts compressing above 0.76 linear.
- **MSAA 4**: 4-sample anti-aliasing of the main render.
- **Shadow acne**: speckled self-shadowing on surfaces; fixed with `bias` / `normalBias`.
- **PCF soft shadow map**: three.js default soft-edged shadow filtering (`PCFSoftShadowMap`).

---

## 1. OUTLINES (ink lines on the 3D world) — outlines.md

### 1.1 The gap (outlines.md:6-15)

- Reference: **36 of 49 scanned geometry edges (74 %) carry a black line.** Lines are **~3 px wide at 1080p**,
  near-black in focus, crisp (only anti-aliased), and **about the same width on screen at any distance**. DOF later
  blurs them with the background.
- Ours (before): **0 of 20 scans** across the same kinds of edges show a line. The lines seen in our frames were only
  the characters' own Canvas2D outlines and texture strokes.

### 1.2 How it was measured (outlines.md:19-25)

- Perpendicular luma scans through single edges, averaged over 5 px across the scan, sampled every 0.25 px.
- "Line present" = at least 35 % darker than the lighter side AND FWHM ≤ 5 px at 720p.
- Scripts named (not in repo): `scanline.py`, `scans.py`, `scan_defs.py` (66 reference scans), `ours_scan_defs.py`
  (20 of ours), `rise.py`, `density.py`, `edgeink.py`, `lineprof.py` (first pass, 32 boxes). Raw results `results/*.json|csv`.

### 1.3 Reference numbers per edge type (outlines.md:29-38; 66 scans, 8 videos + 6 more in first pass)

| Edge type | Scans | With line | EW @1080 median (IQR) | FWHM @1080 | Core luma | Core RGB |
|---|---|---|---|---|---|---|
| Depth jump (object vs farther object) | 26 | 19 | **3.09** (2.38-4.46) | 3.4 | 19 | (48,13,9) |
| Silhouette vs sky | 8 | 6 | **3.04** (2.06-3.73) | 3.4 | 51 | (68,46,38) |
| Convex crease (same object) | 10 | 8 | **2.17** (1.85-3.16) | 3.2 | 34 | (50,29,10) |
| Contact (object meets floor/ground) | 5 | 3 | **2.42** (1.70-3.04) | 3.4 | 30 | (58,24,17) |
| Painted texture line (planks, tiles, grout) | 7 | 1 | 3.66 (soft) | 6.4 | 68 | (111,60,17) |
| Expected but ABSENT: wall/floor join, baseboard, sea horizon | 3 | **0** | – | – | – | – |
| Character outline (drawn, not 3D) | 5 | 4 | 4.57 (3.57-5.17) | 5.4 | 41 | (42,40,33) |
| Caption outline (calibration only) | 2 | 2 | 5.87 | 5.4 | 0 | (0,0,0) |

Findings (outlines.md:40-56):
- **Colour:** black / near-black. In-focus near lines reach luma 0-10 (video 15 arch core 6-7). The coloured core RGB
  values are artefacts of 4:2:0 chroma subsampling (video compression smears surface colour into 2-3 px lines) and of
  DOF/haze on far lines. **Use neutral near-black `#0b0a0c`.**
- **Softness:** 10-90 % rise of world lines = **1.45 px @720** (median, n = 46 flanks) vs 1.58 px for the crisp vector
  captions. So lines are as sharp as the encode allows. They go soft only where DOF blurs the background (v12 rock
  arch, v07 near snow mound).
- **Distance:** median EW near / mid / far = **3.09 / 2.82 / 3.04 px** (n = 17 / 15 / 4). Clean series in v15 receding
  arches: **3.36 → 2.82 → 2.15 px** with core luma **7 → 16 → 50**, while the arch shrinks ~4x. So width is nearly
  constant on screen, thins and lightens a little far away, and does **not** scale with perspective.
- **No double lines.** World ink never draws a box around character cards. Characters are not outlined twice; their
  own drawn strokes are thicker (4.6 px).
- **Which edges get lines:** silhouettes, depth jumps, convex creases, object contacts. **Not**: room-shell concave
  joins (wall/floor, baseboard) and the sea horizon. Contacts look like the object's own contour meeting the floor
  (barrel/deck 3.7 px, stump/floor); weak for walls standing on grass.
- **Texture lines are painted, not ink.** Plank seams, tile grout, ceiling grids are soft, wide, *tinted* dark bands
  (core luma ~68, dark brown on wood). They scale with perspective and blur with DOF. Only 1 of 7 passes the line test.

### 1.4 Ours before, same scans (outlines.md:59-76)

| Edge type | Scans | With line |
|---|---|---|
| Silhouette vs sky (tower cone, parapets, roof) | 6 | 0 |
| Depth jump (lamp posts vs water, wheel rim, far towers) | 10 | 0 |
| Convex crease (quay wall top, railing box, deck beam) | 3 | 0 |
| Contact (plinth on cobble) | 1 | 0 |

Whole frames (all 20 reference videos, one frame every 3 s ≈ 357 frames; 39 of our stills; 540x960 scale):

| Metric | Reference | Ours | Ours, world-only shots |
|---|---|---|---|
| Dark-stroke pixels, line % / black % | 1.70 / 0.81 | 1.95 / 0.96 | – |
| Share of strong edges with ink on them | **45.1 %** | **33.4 %** | **27.4 %** (6-23 % on world-only shots) |

Our stroke density only *looked* similar because of character outlines and painted facade strokes.

### 1.5 Technique decision (outlines.md:78-89)

- Lines sit on **geometry edges**, have **nearly constant screen width** (3.4 → 2.2 px near → far), are anti-aliased
  and crisp, near-black, applied **before** DOF, and **not drawn on character cards**. Looks like Blender
  Freestyle / Grease Pencil Line Art (constant-pixel contour + crease + border lines) composited before DOF.
- **Not an inverted hull** (the "scaled-up back-face shell" trick): a hull only gives silhouettes, scales with
  perspective, cannot draw creases or contacts, and would outline the billboards.
- **Our equivalent:** a screen-space **depth + normal edge pass** on a world-only normal/depth buffer: scale-normalised
  depth test + normal-angle test, width set by sampling radius, anti-aliased, composited before DOF. Painted texture
  lines stay in `paint.ts`.

### 1.6 Why the old `ink.ts` showed nothing (outlines.md:91-104) — lessons that apply to any new pipeline

1. **DOF erased it.** R3F's `<EffectComposer>` merges consecutive Effects into one EffectPass, so Ink, DOF, Bloom and
   Tone ran in one shader. DOF output = `inputColor*(1-cocFar) + colorFar`, and `colorFar` is blurred from the
   EffectPass *input* buffer, which has no ink. Wherever CoC > 0 the ink was replaced by un-inked blur.
2. **Creases and contacts are invisible to a Laplacian of 1/z.** On a plane it is 0. Across a box corner it is only
   |tanθ1 − tanθ2| / f_px, with f = **2637 px for a 40° FOV at 1920 px**. For a 45° corner that is **7.6e-4, 79x
   below the old 0.06 threshold**. Only real depth jumps could fire.
3. **Two-sided Laplacian** put half of each line on the far side (sky/background), which DOF then erased; what was
   left was ≤ 2 px.
4. **`farFade` 130-260 m** removed towers and hills completely.
5. **Colour `#221f2e` at strength 0.92 blended in linear light** gave a grey core (luma 60-80) and a line ~30 % thinner.

### 1.7 The InkPass recipe (outlines.md:106-145, full source outlines.md:267-623)

Architecture:
- `export const NOINK = 3;` — the three.js layer for things that must never be outlined (outlines.md:294).
- `class InkPass extends Pass` (not an Effect) so R3F never merges it with DOF. `needsSwap = false`: it composites
  into a temp target and copies back into the input buffer (colour only), so the composer's depth texture is kept.
  `needsDepthTexture = true` gives it the main depth for the "character in front" test.
- Constructor calls `camera.layers.enable(NOINK)` so the main render and shadow maps still include NOINK objects.
- Render targets:
  - `rt`: world normals + depth. HalfFloat, Nearest filter, no mipmaps, `samples: 0` (no MSAA),
    `DepthTexture(UnsignedIntType)`.
  - `maskRT`: UnsignedByte, Nearest, no depth.
  - `tmpRT`: HalfFloat, Linear, no depth.
- Per frame, `render()` does 4 steps (outlines.md:574-615):
  1. Re-render the scene with `cam.layers.disable(NOINK)`, `scene.overrideMaterial = normalMat`,
     `scene.background = null`, `renderer.shadowMap.autoUpdate = false` (shadow maps are not re-rendered), clear colour
     `0x000000, 0`. All state is restored afterwards.
  2. Edge mask into `maskRT` (full screen quad). Uniforms set each frame: `cNear = cam.near`, `cFar = cam.far`,
     `p00 = projectionMatrix.elements[0]`, `p11 = elements[5]`.
  3. Composite into `tmpRT`.
  4. Copy back into `inputBuffer` (or screen if `renderToScreen`), with `#include <colorspace_fragment>`.
- Normal material (`NORMAL_VERT`/`NORMAL_FRAG`): outputs view-space normal in rgb, coverage 1 in a. Works for Mesh and
  InstancedMesh. If a geometry has no normals it uses `normalize(cross(dFdx(vV), dFdy(vV)))`. Back faces of
  double-sided planes flip the normal (`gl_FrontFacing`). `onBeforeRender` copies each object's `map` + `alphaTest`
  (also per geometry group for multi-material meshes) into uniforms `tCut`, `cut`, `cutUv`, so alpha cut-outs (sign
  board, church clock) keep their shape. Verified: a round alpha-tested disc gets a round outline.
- Mask shader math (`MASK_FRAG`, outlines.md:356-441):
  - Skip if `tNormal.a < 0.5` (sky/empty): ink lives on the near object only.
  - **Occlusion by characters:** take min main depth over the pixel and 4 neighbours; if
    `zm < zc * 0.985 - 0.03` → no ink (a billboard is in front). No double lines, no rectangles.
  - Distance factor `t = clamp(log(zc / dNear) / log(dFar / dNear), 0, 1)` (log distance).
  - Silhouette width `w = mix(wNear, wFar, t)`; crease half-width `hc = 0.5 * w * creaseScale`.
  - Loop over **4 directions** `(1,0) (0,1) (1,1) (1,-1)` with lengths `1, 1, 1.41421, 1.41421`, radius r = 1..`RMAX`
    (**6** in the recipe). Pixel-centre distance `d = (r - 0.5) * SLEN`.
  - Continuous coverage `cw = clamp(w + 0.5 - d, 0, 1)`, `ch = clamp(hc + 0.5 - d, 0, 1)`: no width popping,
    built-in AA. Early `break` when both are ≤ 0.
  - **Depth edge:** signed 2nd difference of 1/z, scale-normalised: `s = (1/z1 + 1/z2 - 2/zc) / (1/zc)`. Exactly 0 on
    any plane (no false lines on grazing floors). Only the **near side** is inked:
    `eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw)`. Thin ropes and poles become solid lines.
  - **Crease edge** `crease()`: neighbour must have coverage and be at the same depth (`|zq - zc| ≤ zc * depthLo`,
    i.e. 2 % in the recipe). Strength `k = 1 - smoothstep(cosHi, cosLo, dot(n0, nq))`. If the neighbour's view
    position is in front of this pixel's tangent plane (`dot(viewPos(uq,zq) - P0, n0) > 0`) it is a **concave** fold
    and `k *= concaveGain`. Two-sided.
  - Final `ink = max(eD, eN) * strength * mix(1, farOpacity, t) * (1 - smoothstep(fadeNear, fadeFar, zc))`.
- Composite (`COMP_FRAG`, outlines.md:443-463):
  - 3x3 **1-2-1 tent** filter over the mask (weights 4 centre, 2 sides, 1 corners, /16) = anti-aliasing.
  - Blend in **display gamma**, like Canvas2D: `g = pow(c, 1/2.2)`; `out = pow(mix(g, pow(inkColor, 1/2.2), a), 2.2)`.
    Reason: a linear-light blend reads ~30 % thinner, so measured widths would not match coverage widths.
  - `debug = 1` shows the mask, `debug = 2` shows world normals.
- Live tuning: `ink.set({ widthNear: 4.2, concaveGain: 0.5 })` (outlines.md:550-560).
- Cost: one extra world render + full-res mask with "≤ 96 depth fetches per pixel" (really 4 dirs × 6 r × (2 depth +
  2 normal) = 96 texture fetches). **~30-60 ms per frame** in the toy harness; fine for Remotion offline render.
- Measured in the toy scene: silhouette EW **3.7 / 3.2 / 2.6 / 1.5 / 1.1 px at 3 / 12 / 25 / 90 / 200 m** (1080p);
  creases **2.3 → 0.9 px**. Reference: 3.4 → 2.8 → 2.2 px silhouettes, 2.2 px creases.

### 1.8 Ink options: recipe defaults vs shipped `ink.ts` (outlines.md:203-213, 314-319; ink.ts:49-56)

| Option | Meaning | Recipe default | Recipe sensible range | **Shipped ink.ts** |
|---|---|---|---|---|
| `color` | ink colour (sRGB) | `#0b0a0c` | neutral near-black | **`#030303`** |
| `strength` | max opacity | 1.0 | 0.9-1.0 | 1.0 |
| `widthNear` | silhouette px at `distNear` (1080x1920) | 3.4 | 3.0-4.0 | **5.1** (×1.5 "round 2") |
| `widthFar` | px at `distFar` | 2.2 | 1.8-2.6 | **3.3** |
| `distNear` / `distFar` | m | 6 / 90 | – | 6 / 90 |
| `creaseScale` | crease width / silhouette width | 0.64 | 0.55-0.75 | **0.8** ("round 3: building corners") |
| `depthLo` / `depthHi` | relative 1/z jump start / full | 0.02 / 0.05 | raise if floors get lines | **0.01 / 0.03** |
| `angleLo` / `angleHi` | crease angle start / full (deg) | 50 / 65 | 40-60 / 60-75 | **35 / 50** ("roof eaves") |
| `concaveGain` | contact / inner-corner strength | 0.7 | 0 indoors, 0.5-0.8 outdoors | 0.7 |
| `farOpacity` | opacity at 90 m | 0.75 | 0.6-0.9 | **0.95** |
| `fadeNear` / `fadeFar` | far fade-out (m) | 150 / 450 | keep far towers inked | 150 / 450 |
| `RMAX` (shader) | max sampling radius px | 6 | – | **9** (headroom at 1440x2560) |
| `pxScale` (shader) | output px per 1080x1920 px | (none) | – | **height / 1920**, set in `setSize` |
| fog tint | ink fades toward fog colour | (depth.md: ×0.6 from fogNear) | – | **×0.3 (`fogInk`), only past `fogStart` 60 m** |

Shipped widths in numbers (my calculation from the shipped formula, 1080x1920): silhouettes 5.1 px at ≤ 6 m,
~4.6 px at 12 m, ~4.2 px at 25 m, 3.3 px at ≥ 90 m; creases (two-sided total = w × 0.8) 4.1 px near → 2.6 px far.
At 1440x2560 multiply by 1.333 (5.1 → 6.8 px). The shipped header comment (ink.ts:2-4) says the reviewer asked for
"world outlines ~1.5x thicker, pure black on every silhouette".

Shipped extra (ink.ts:180-210): mask green channel stores `fogK = clamp((zc - max(fog.near, 60)) / (fog.far - that), 0, 1)`;
composite takes the max fogK over the pixel + 4 neighbours and uses `inkC = mix(inkColor, fogColor, fk * 0.3)`.
`fogRange` / `fogColor` are read from `scene.fog` every frame (ink.ts:350-352).

### 1.9 Composer wiring (outlines.md:146-180) vs shipped (Bridge.tsx:55-73)

Recipe (outlines.md):
```tsx
<EffectComposer multisampling={4}>
  <primitive object={fx.bloom} />  {/* 1. own EffectPass: bloom from the un-inked image */}
  <primitive object={fx.ink} />    {/* 2. InkPass (a Pass, never merged) */}
  <primitive object={fx.dof} />    {/* 3. DOF + tone merged: DOF blurs the lines too */}
  <primitive object={fx.tone} />
</EffectComposer>
```
- Recipe DOF: `new DepthOfFieldEffect(camera, { worldFocusRange: 4, bokehScale: 2, resolutionScale: 0.5 })`.
  Recipe bloom: `{ intensity: 0.3, luminanceThreshold: 0.86, luminanceSmoothing: 0.1, mipmapBlur: true }`. Tone NEUTRAL.
- **Order reasoning: bloom → ink → DOF + tone.** If bloom runs after ink, the halo lifts line cores (core 0 → 53) and
  thins lines 22-28 % near bright sky. With bloom first: EW 3.65, core 0.
- **Keep `multisampling={4}`.** With `multisampling={0}` the bloom-first order creates a depth-texture feedback loop;
  then use ink → dof → bloom → tone and raise bloom `luminanceThreshold` to ≥ 0.95.
- Old per-frame DOF code kept: `worldFocusRange = max(2.5, dist*0.55)`.
- `fx.ink.dispose()` in a `useEffect` cleanup.

Shipped (Bridge.tsx): **InkPass → LensBlur pre → LensBlur main → Bloom (ADD blend) + NEUTRAL tone + Grade (one merged
EffectPass) → optional Grain**, MSAA 4. Bloom is after the DOF "so glows defocus with their source". The bloom
threshold is 1.0 (not 0.86), so lit surfaces never bloom and the outlines.md core-lifting problem does not trigger.
SKILL.md:146 records the key gotcha: "Ink in the same merged effect pass as DOF gets overwritten. Ink must be its own
pass before the blur."

### 1.10 NOINK layer rules (outlines.md:182-199)

- `this.mesh.layers.set(NOINK)` on every Actor and Fx mesh (cast.ts constructors) → no rectangle outlines on cards,
  no holes in world lines.
- `this.sky.layers.set(NOINK)` (gradient sky sphere), every cloud sprite, every smoke card. Optional: the hammered sign
  board (it has its own drawn outline).
- `layers.set` does **not** propagate to children: use `g.traverse(o => o.layers.set(NOINK))` for groups.
- Water stays on layer 0 (quay/water contact lines). If water uses vertex displacement in a custom shader, put it on
  NOINK or the occlusion test drops lines on wave crests.
- Every `THREE.Line` and `Points` object goes on NOINK.
- Lazily created actors/effects go through the Actor/Fx constructors, so they are covered automatically.
- Shipped adds a safety net `noInkFallback(root)` (ink.ts:382-393), called every frame in Bridge.tsx:77: anything that
  is a Sprite/Points/Line, has a `customDepthMaterial` (cast actors), has any `depthWrite === false` material, or is an
  alpha-tested `MeshBasicMaterial` goes on NOINK.
- Shipped world.ts puts sky (line 133), sun disc + halo (139), clouds (152), and some boards (305, 311) on NOINK and
  calls `cam.layers.enable(NOINK)` each frame (356).

### 1.11 Painted texture lines (outlines.md:218-231)

- Paint into textures (`paint.ts`): deck plank seams and butt joints, quay/bridge stone mortar, roof tile rows, facade
  window and shutter frames, cobble gaps.
- Colour = **local colour × 0.35-0.45, alpha 0.8-0.9** (wood seams ≈ (111,60,17) on lighter brown, core luma ~60-70).
- Width chosen to land at **1.2-2 px at 1080p** at the typical shot distance:
  texture px = screen px × (texels per metre) / (screen px per metre).
- **Never paint a border along an edge that is also a geometry edge** (box edges, plank ends at a beam). InkPass
  already draws it; doing both gives the double line the reference never has.
- The facade `INKL` stroke `rgba(40,30,40,0.85)` should become a warmer tint of the facade colour, lighter than the
  geometry ink. (Shipped paint.ts:29 still has `INKL = "rgba(40,30,40,0.85)"`, used at lines 118, 189, 195.)
- Shipped plank seams (paint.ts:312-315) are **near-black** `#1c0c05` with a `rgba(40,18,8,0.6)` soft rim, "12 px core
  + 3 px rim (~5 % of the pitch: survives mips)" — the opposite of this rule (see Bugs).

### 1.12 Outlines top 5 (outlines.md:249-263)

1. Swap InkEffect for InkPass and order the composer so ink is before DOF. "No lines vs lines everywhere."
2. Normal-based creases and contacts (about a third of the reference's lines).
3. Reference widths/colour: silhouettes 3.4 → 2.2 px (6 → 90 m, log distance), creases ×0.64, `#0b0a0c`, strength
   1.0, display-gamma blend, far opacity 0.75, fade 150-450 m instead of 130-260 m.
4. NOINK layer for billboards, effect cards, sky, clouds, smoke + alpha cut-out support. Characters keep their own
   4.6 px drawn outline.
5. Painted texture lines in `paint.ts`, never duplicating geometry edges.

### 1.13 Test harness named in the report (not in repo)

`test/main.ts` + `test/index.html` (bundle `test/bundle.js`), URL params `?debug=1|2`, `?dof=0`, `?ink=0`,
`?bloomfirst=1`, `?calib=1`, `?crop=x,y,w,h`. Shots: `test/shots/harness_final.jpg`, `harness_mask.jpg`,
`harness_cutout_disc_4x.jpg`. Sheets: `sheets/final_crops_1..3.jpg` (76 crops from 14 videos, 64x64 px at 4x
nearest), `sheets/side_by_side.jpg` (7 pairs: roof vs sky, shed vs sky, barrel depth jump, wall-top crease,
window-frame crease, contact, far arch), `sheets/scan_01..09.jpg`, `ours_01..03.jpg`, `pass1_01..04.jpg`,
`v01..v20.jpg`, `crops/` (118 crops).

### 1.14 Ink build rules (actionable)

- World ink = its own **Pass**, placed **before** any blur. Never put it in a merged EffectPass with DOF.
- Ink on: silhouettes, depth jumps (near side only), convex creases, object-on-ground contacts.
  Ink off: wall/floor joins, baseboards, sea horizon, character cards, sky, clouds, smoke, sprites.
- Width constant on screen (log-distance falloff only). Measured target ≈ 3 px @1080 (3.4 → 2.2 px from 6 → 90 m);
  shipped taste = 5.1 → 3.3 px. Always multiply by `height / 1920` for other output sizes.
- Colour near-black neutral (`#0b0a0c` measured, `#030303` shipped), strength 1.0, display-gamma blend, 1-2-1 tent AA.
- Far: keep lines to 450 m (fade 150-450 m), opacity 0.75-0.95 at 90 m, tint toward fog colour only far away.
- Interiors: `concaveGain = 0` (the reference has no inner-corner lines indoors).
- Characters carry their own drawn outline (~4.6 px @1080 in the reference; plum `#201628`-`#2f1d28` per SKILL.md:109).
- Texture seams are painted tints, never drawn where geometry ink already is.

---

## 2. LIGHTING — lighting.md

### 2.1 Data and method (lighting.md:3-44)

- 67 reference study frames (20 videos, 720x1280, captions masked), 539 frames sampled every 2 s for grade stats,
  36 of our stills (540x960).
- Frame IDs: `d##` day, `s##` sunset, `n##` night, `i##` interior.
- Same-surface pairs: lit and shade patches on one material (hand boxes M, P rows; Otsu 2-cluster split of
  log-luminance R, Q rows — Otsu = automatic threshold that splits pixels into two groups). Averaged in linear light,
  ratios per channel.
- Shadow edges: logistic fit (soft-L1) across the edge; 10-90 % width = 4.394·σ.
- Heads: pale round blobs inside a dark ring; 30 reference heads checked by eye. Plane fit of linear luminance gives
  `grad_lr` (left-right change across the head as a fraction of its mean) and `grad_tb` (top-bottom).
- Model: `scripts/model.py` = three r175 Lambert + hemisphere + directional → PBR-Neutral → sRGB. It reproduced our
  shadows (slab predicted `#687175` vs measured `#616868`; rail-post deck `#52391f` vs `#5a3b12`) and was then used to
  solve new values. **Recipe values are starting points; tune them with the calibration loop (2.12.9).**

### 2.2 The gap in one table (lighting.md:9-22)

| What | Reference | Ours (before) |
|---|---|---|
| Day shadow, shade/lit on same surface | Y **0.49-0.52** on wood (0.37-0.65 overall). Per channel R .54-.56, G .46-.50, B .47-.50: slightly redder and **more** saturated (+.02-.13) | Y **0.25-0.38**; deck B ratio .11-.18 (muddy orange); paving goes grey (sat .17 → .07, hue 40° → 176°). ~2x too dark |
| Sunset shadow | Y **0.15-0.27**. R .08-.15, G .16-.30, **B 1.35-3.04**: violet-blue shadow on orange ground (`#db9044` → `#5b5173`). Impossible with additive light = a stylised shadow colour | Golden ground V .30-.47, sat .74-.95 dark olive/brown, no light/shadow pattern |
| Key direction vs camera | Day: 6/20 side-back from screen right (az ~50-70°), 7 frontal-soft (facades), 2 top. Sunset: **10/15 backlit** (az 0-40°, el ~3-15°), long shadows toward camera | 29/41 camera keys front-lit (sun 116-163° from view axis), 9 side, 3 back; golden 114-156° (no backlight) |
| In-focus shadow edges (10-90 %, px @720) | 3-12 px. Foreground 16-124 px soft only because of DOF | 3-10 px (same range) |
| Contact / AO | No SSAO look. Contact = ink line + cast/blob shadow. Small props: short ramp (bowl 25 % darker, gone in 8 px) | none |
| Character ground shadow | Day: soft **blob** offset away from the sun, Y ratio .52-.74, edge 3-12 px. Sunset: long soft figure shadows | Hard full-silhouette card shadows (rifles, legs) |
| Heads | V **.97** (.86-1.0) in every light; sat .03 day → .23 sunset → .21 night; side gradient \|lr\| **.14** (.05-.36) toward key; top brighter (tb −.11); rim 1.03 (= none) | V .82 (.65-.92); shade heads grey `#ae9786` (V .68); golden `#bd7c48` / `#a46d41` (sat .61-.62, V .64-.74); gradient .008 (flat) |
| Day sky top | `#238bf4` / `#0a6beb` / `#377ff1` / `#5ca3e0` (sat .59-.96) over pale horizon (`#b5d9fb`-`#f1e3d4`) | `#8bb5e6` top, `#9abfe9` low (sat .34-.40) |
| Grade (day) | L* p2 15.5, p98 95.3, vivid .28, dark hue 39° C 12 (warm darks) | L* p2 1.2, p98 79.6, vivid .05, dark C 4 (grey darks) |
| Specular | Only on metal: copper pot (d01), cannon (d12), armour (d15), iron ball (d20) | none (all Lambert) |

### 2.3 Key light direction (lighting.md:46-103)

Az measured from the view axis: **0° = sun straight ahead (backlight), 90° = side, 180° = behind camera.** ±15°.

| Frame | Scene | Key | az | el | Notes (shade colour / lights / haze / spec / rim) |
|---|---|---|---|---|---|
| d01 | ship deck | right-back | ~60 | ~45 | warm wood shade (R02 Y .37); blue-grey island haze; big soft highlight on copper pot; no rim |
| d02 | chef on deck | left | ~100 L | ~40 | mast lit left, dark right (M06 Y .07 deep form shadow) |
| d03 | deck wide | upper-right-back | ~50 | ~50 | sun patches through rigging 7-12 px crisp; dark warm shade (R01 Y .28); navy sky top |
| d04 | race track | right, slightly back | ~70 | ~40 | horse shadow lower-left |
| d05 | town from above | top | – | ~65 | very short shadows; strong blue haze on hills `#94cefe` |
| d07 | plaza | front-top soft | ~150 | ~55 | large soft off-screen shadow; blue-grey stone shade |
| d08 | grass + crowd | soft front | ~160 | ~60 | almost no cast shadows |
| d09 | western street | right | ~95 | ~60 | left facades lit; small blob under figure; horizon `#b5d9fb`; DOF |
| d10 | cowboy close | right-front | ~120 | ~55 | facades lit from right |
| d12 | deck + cannon | right-back | ~60 | ~50 | warm shade (R03 Y .49); lavender cliffs `#a7a3af`; cannon highlight |
| d13 | deck characters | right | ~70 | ~55 | blob offset left of feet; warm (R04 Y .52) |
| d14 | chest | right | ~70 | ~50 | chest shadow left; warm (R05 Y .49) |
| d15 | market knight | front-top soft | ~160 | ~60 | canopy shadow only; armour highlights |
| d16 | field king | flat | – | – | almost none; horizon `#e5e7f2` |
| d17 | steel grating | front-top | ~150 | ~60 | soft shadows behind figures; bluish shade on grey metal (M02 B .81) |
| d18 | house door | front | ~170 | ~50 | evenly lit facade |
| d19 | castle gate | front-top | ~160 | ~60 | even facade; small wall torches |
| d20 | fort grass | high | – | ~65 | round blob under soldier; green shade (R06 Y .65); black ball highlight |
| s01 | western riders | ahead, in frame | ~5 | ~8 | long shadows toward camera; violet (M01 B ×2.95); dust haze; bloom, no rim lines |
| s02 | western street | ahead | ~10 | ~8 | violet (R07 B ×3.0); orange haze |
| s03 | fallen | ahead-right | ~20 | ~10 | violet (R08 B ×2.8) |
| s04 | two characters | ahead | ~10 | ~10 | long figure shadows on sand; violet (R09 B ×1.35); blue-violet blurred facade |
| s05 | hill | ahead-left (behind castle) | ~20 | ~15 | backlit jar, lavender shade side; fire + lantern; pink haze `#db9594` |
| s06 | palace | left, frame edge | ~40 | ~15 | backlit; lantern; peach haze `#d1a57c` |
| s07 | deck | behind characters | ~10 | ~10 | characters flat-lit, glowing fuse; purple sky |
| s09 | road | ahead, at horizon | 0 | ~3 | long shadows; sun glow core 90 px, r50 188 px |
| s11 | interior window | ahead (window behind figure) | ~10 | low | figure shadow on floor toward camera; warm-neutral (M05 Y .51) |
| s13 | dawn street | ahead (sun top, ring halo) | ~10 | ~25 | heavy orange haze |
| s15 | field haze | front-ish soft | – | ~30 | crate shadow (DOF-soft); brown-violet (R10 B .66) |
| n02 | night town | blue ambient | – | – | warm windows, street lamps |
| n04 | night western | warm lamp right | – | – | boot shadow purple; shade (.47, .51, **.91**) |
| n06 | lanterns on snow | lanterns + door | – | – | glow G04 |
| n07 | moonlit field | moon top-left | – | – | violet ambient, moon glow |
| n08 | castle wall | moon top + torch | – | – | head tinted lavender `#b1ace7` |
| n09 | blacksmith | foggy moon behind | – | – | violet fog `#877aea`, warm windows |
| i02 | room | sun shaft from window left | – | – | dusty soft edge (48 px); shade orange-warmer than the pale shaft |
| i08 | moonlit room | window | – | – | **window light pattern crosses the face** |
| i10 | office | sun patch on wall | – | – | yellow patch on green wall (M04 B ×4.85) = colour replacement |
| i11 | wall sconce | warm lamp top-left | – | – | glow G10 |
| i15/i16 | bare bulb | overhead | – | – | pool of light |

Ours before: `LIGHTS.day.sun` (−0.45, 0.8, −0.4), el 53°. Of 41 camera keys: 29 front (>115°), 9 side (87-115°),
3 back (<60°, shot 4 only). Golden keys 114-156° (none backlit). Sun on screen right in 38 of 41 keys.

### 2.4 Shadow colour on the same surface (lighting.md:105-142; ratios = shade/lit, linear, per channel)

| ID | Frame | Surface | Lit | Shade | R | G | B | Y | Hue lit→shade | Sat lit→shade |
|---|---|---|---|---|---|---|---|---|---|---|
| R02 | d01 | deck, rail shadow | `#e8b471` | `#9f6f39` | .43 | .34 | .25 | .37 | 34→31 | .51→.64 |
| R03 | d12 | deck, carriage shadow | `#c08e5d` | `#936240` | .55 | .46 | .47 | .49 | 30→25 | .52→.56 |
| R04 | d13 | deck, blob under character | `#cb9563` | `#9c6c46` | .56 | .50 | .48 | .52 | 29→27 | .51→.55 |
| R05 | d14 | deck, chest shadow | `#d19c65` | `#9f6d48` | .54 | .46 | .50 | .49 | 31→26 | .52→.54 |
| R01 | d03 | deck under sails (deep) | `#d6933d` | `#785221` | .28 | .29 | .32 | .28 | 34→34 | .71→.72 |
| R06 | d20 | grass, soldier blob | `#6ca937` | `#518c27` | .55 | .66 | .53 | .65 | 92→95 | .67→.72 |
| M02 | d17 | steel grating | `#444a54` | `#32384c` | .56 | .58 | .81 | .60 | 217→226 | .19→.34 |
| M06 | d02 | mast, lit vs turned-away (form) | `#de9c41` | `#3e2b1d` | .07 | .07 | .24 | .07 | 35→25 | .71→.53 |
| M01 | s01 | sand, long shadow (sunset) | `#db9044` | `#5b5173` | .15 | .30 | **2.95** | .27 | 30→258 | .69→.29 |
| R07 | s02 | sand, long shadow | `#da9043` | `#524e73` | .12 | .27 | **3.04** | .24 | 30→247 | .69→.32 |
| R08 | s03 | sand, long shadow | `#df9545` | `#524e72` | .11 | .25 | **2.82** | .22 | 31→246 | .69→.32 |
| R09 | s04 | sand, figures' shadow | `#bc7d52` | `#38325f` | .08 | .16 | **1.35** | .15 | 25→248 | .56→.47 |
| R10 | s15 | dirt path, crate (hazy) | `#bd874a` | `#6e4e3c` | .31 | .32 | .66 | .32 | 32→22 | .61→.46 |
| M05 | s11 | cream floor, figure (sunset interior) | `#dfc5a8` | `#ab8e81` | .55 | .49 | .56 | .51 | 31→20 | .25→.25 |
| M03 | i02 | floor, sun shaft vs room | `#fdf6cc` | `#cda479` | .62 | .40 | .32 | .45 | 52→30 | .19→.41 |
| M04 | i10 | green wall, sun patch vs wall | `#d6c33b` | `#76b27f` | .27 | .82 | **4.85** | .69 | 53→129 | .73→.34 |
| R11 | n04 | night sand under warm lamp | `#a77065` | `#765161` | .47 | .51 | .91 | .51 | 9→334 | .39→.31 |
| Q01 | ours b_1900 | deck, rail posts (day) | `#a67041` | `#5a3b12` | .27 | .27 | .11 | .27 | 28→34 | .61→.80 |
| Q02 | ours b_100 | deck, soldier band | `#b37736` | `#794913` | .42 | .36 | .18 | .38 | 31→32 | .70→.84 |
| P01 | ours b_1810 | paving, sign shadow | `#ccc0a9` | `#616868` | .20 | .26 | .35 | .25 | 40→176 | .17→.07 |
| P02 | ours b_2010 | river, bridge shadow | `#3f7db7` | `#0f4b87` | .09 | .34 | .51 | .36 | 209→210 | .65→.89 |

Why ours looked like that (lighting.md:133-136): our shade was hemisphere + fill only = physically (0.28, 0.36, 0.50)
of the lit value; the PBR-Neutral toe subtracts `x − 6.25x²` from every channel whose minimum is below 0.08, which
crushes the small blue channel of warm shadows and greys stone; at golden the 14.5° sun adds little to flat ground,
so ground is shade-level everywhere.

**Rules (lighting.md:138-142):**
- **Day:** shadow ≈ **0.5 × lit**, same hue as the surface, a little more saturated (warm on wood, green on grass,
  bluish only on grey metal).
- **Sunset:** shadow = **violet-blue replacement colour** (blue up to 3x the lit blue).
- **Interiors:** light patches are colour replacements too (yellow patch on a green wall).
- These ratios need a shader that **mixes a lit colour and a shadow colour**; light intensities alone cannot do it.

### 2.5 Shadow edges, contact, AO (lighting.md:144-193)

Penumbra 10-90 % width, px @720:

| ID | Frame | Edge | Width | In focus? |
|---|---|---|---|---|
| new | d03 | sun patch through rigging, top / right | 7.1 / 12.5 | yes |
| E05 | d13 | blob under character | 9.2 | yes |
| E06/new | d20 | soldier blob side / lower | 11.5 / 2.8 | yes |
| new | d14 | chest shadow side | 5.0 | yes |
| E01-E03 | s01-s03 | long sunset shadows near frame bottom | 15.8 / 20.2 / 57.4 | no (foreground DOF) |
| E10 | s15 | crate shadow, foreground | 39.0 | no (DOF) |
| E11 | s11 | figure shadow on floor | 69.2 | no (DOF) |
| E12 | s04 | figures' shadow on sand | 123.8 | no (DOF) |
| E09 | i02 | sun-shaft edge (dusty) | 48.1 | volumetric |
| O01 | ours b_1900 | rail-post shadow | 10.0 | – |
| O02 | ours b_1810 | sign shadow | 2.9 | – |

Excluded fits: E04, E07, E08, O03, O04. **Result: in-focus shadows are crisp, 0.4-1.7 % of frame width. Keep a crisp
shadow map; softness comes from lens blur, not a big light.**

Contact / AO (px @720 after the ink line):

| ID | Frame | Contact | Darkening | Back to 90 % at |
|---|---|---|---|---|
| C01 | i01 | bowl on counter | 25 % | 8 px |
| – | d11 | boardwalk → sand | black gap, then soft ramp | 11 px |
| C03 | d14 | chest base on deck | ink line only | 3 px |
| C04 | d16 | box base on ground | none | 2 px |
| – | d12 | bucket on deck | none | 0 |
| C02 | i12 | under counter lip | none (face slightly brighter) | 1 px |
| – | i10 | wall toward floor | 15 % over 110 px (lighting, not AO) | – |

**No SSAO.** Contact = ink line + cast or blob shadow.

Character ground shadows: day = soft elliptical blob offset away from the sun (d13, d20, d09), Y ratio .52-.74
(R04 .52, R06 .65, E05 .63, E06 .74), edge 3-12 px. Sunset = long soft figure silhouettes (s04, s11), DOF-softened.
Interiors often no shadow at all (i14 forge, d17 grating).

### 2.6 Characters (flat cards) under scene light (lighting.md:195-227)

| Set | n | V median [range] | Sat median | \|grad_lr\| median | grad_tb | Rim |
|---|---|---|---|---|---|---|
| ref day | 10 | .97 [.95-1.0] | .03 [.01-.09] | .114 [.05-.20] | −.12 | 1.02 |
| ref sunset | 2 | .99 | .23 [.18-.28] | .168 | −.06 | 1.03 |
| ref night | 6 | .98 [.88-.99] | .21 [.02-.26] | .119 [.03-.36] | −.13 | 1.04 |
| ref interior | 12 | .97 [.86-1.0] | .14 [.01-.29] | .174 [.005-.36] | −.11 | 1.03 |
| **ref all** | 30 | **.97 [.86-1.0]** | .08 | **.142** | **−.109** | 1.03 (no rim) |
| ours lit | 11 | .90 [.84-.92] | .31 | .011 | +.015 | 1.02 |
| ours shade | 8 | .69 [.65-.70] | .24 | .018 | −.002 | 1.03 |
| ours golden | 2 | .64-.74 | .61-.62 | – | – | – |

Measured head colours (white albedo, so = light colour): day `#f8f1ef`, `#f7f1f0`; sunset `#fddeb6`, `#fde7d0`;
warm lamp `#fcdfbd`, `#fbdeb5`; moonlight `#b1ace7`, `#edd9f7`; window light `#d9b5e7` (i08: bright window stripe
crosses the face).

Rules: heads never below V .86; take scene light colour as a tint; soft side gradient toward the key (~14 % across
the head) and a slightly brighter top; receive shadows and light patterns but only dim a little; **no rim line**.
characters.md adds a soft crescent on the shadow side (0.88-0.89x, lavender ×(0.92, 0.90, 0.96)) and a stronger torso
gradient (1.0 → 0.55-0.66). Ours before: flat, the "pasted-on" look came from emissive 0.36.

### 2.7 Local lights, glow, specular, rim, haze (lighting.md:229-256)

Glows (px @720 from brightest point; r50 / r10 = where glow excess falls to 50 % / 10 %):

| Source | Core | r50 | r10 | Core / glow colour |
|---|---|---|---|---|
| street lamps n02 | 4-8 | 12 | 18-42 | `#ffeac8` / `#e1baac` |
| lit window n05 | 8 | 34 | 114 | `#f2d7a4` / `#e9bf8a` |
| paper lantern n06 | 24 | 42 | 46 | `#fac777` / `#efb56a` |
| moon n07 / n08 / n09 (fog) | 20 / 10 / 14 | 30 / 38 / 32 | 64 / 108 / 144 | `#e6eef7` / `#bdd4f7` |
| wall lamp n12 | 2 | 4 | 24 | `#f8d5c8` |
| ship lantern i01 | 28 | 34 | – | `#f4e8d8` / `#e8cda3` |
| sconce i11 | 32 | 68 | 204 | `#f5efe9` / `#e7c8a4` |
| bare bulbs i15 / i16 | 10 / 30 | 18 / 34 | 66 / 78 | `#e0d4c5` |
| setting sun s09 | 90 | **188** | – | `#e6cfc3` / `#e5c195` |
| low sun s13 | 58 | 94 | 164 | `#fceecf` / `#fbddae` |
| candle i07 | 6 | 42 | 174 | `#fef7f0` / `#e8b57e` |

- Our film needed only the golden sun: glow **r50 ≈ 13-26 % of frame width at the frame edge**.
- **Specular:** only metal props, one soft broad highlight. Wood, ground, characters: none.
- **Rim / back light:** none on heads (rim 1.02-1.04). Sunset backlight shows as bloom and haze around silhouettes.
- **Haze colours:** day distance blue (hills `#94cefe`, cliffs lavender `#a7a3af`); sunset pink/peach (castle
  `#db9594`, palace `#d1a57c`); night fog violet `#877aea`.

### 2.8 Grade numbers from the lighting (lighting.md:258-270)

| Set | n | L* p2 | L* p50 | L* p98 | Vivid (C*>40) | Dark band hue / C | Bright band hue / C | split_b (warm brights − darks) |
|---|---|---|---|---|---|---|---|---|
| ref day | 20 | 15.5 | 63.7 | 95.3 | .28 | 39° / 12.4 | 79° / 6.7 | −0.2 |
| ref sunset | 15 | 15.7 | 59.2 | 92.1 | .28 | 8° / 15.4 (magenta-red) | 60° / 37.0 | **+26** |
| ref night | 14 | 8.3 | 32.2 | 83.8 | .45 | 300° / 33.3 (violet) | 320° / 20.5 | +17 |
| ref interior | 18 | 6.1 | 33.5 | 91.6 | .20 | 330° / 15.4 | 53° / 19.1 | +22 |
| ref all | 539 | 10.2 | 48.7 | 92.2 | .23 | 340° / 15.1 | 44° / 10.0 | +11 |
| ours day | 28 | **1.2** | 48.6 | **79.6** | **.05** | 2° / 4.1 | 268° / 2.8 | 0.7 |
| ours golden | 9 | 3.2 | 37.1 | 73.2 | .24 | 57° / 12.7 (orange) | 46° / 21.2 | 4.2 |

### 2.9 Recipe for our stack (lighting.md:287-583)

Idea: every world material gets **two-tone** shading `albedo × mix(shadeCol, litCol, sunTerm)` where
`sunTerm = shadowMapVisibility × softTerminator(N·L)`; cards get their own light-tint + bright floor + side gradient,
no emissive; the **sun is placed relative to each shot's camera and frozen for the whole shot**.

#### 2.9.1 `lights.ts` preset type (lighting.md:303-315, identical field names in shipped lights.ts:5-14)

```ts
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
```
`lit/shade/lift` are LINEAR RGB multipliers (may exceed 1).

#### 2.9.2 Preset values: recipe (lighting.md:316-335) vs shipped (lights.ts:15-34)

| Field | Day recipe | **Day shipped** | Golden recipe | **Golden shipped** |
|---|---|---|---|---|
| az / el (deg) | 75 / 48 | 75 / 48 | 15 / 9 | **6 / 7** |
| lit | [1.54, 1.47, 1.35] | **[1.58, 1.5, 1.33]** | [1.42, 0.79, 0.48] | **[1.5, 0.68, 0.24]** |
| shade | [0.80, 0.71, 0.83] | **[0.3, 0.29, 0.36]** | [0.176, 0.206, 0.72] | **[0.15, 0.15, 0.3]** |
| lift | [0, 0, 0] | **[0.05, 0.06, 0.11]** | [0.035, 0.03, 0.075] | **[0.04, 0.06, 0.17]** |
| lambert / sideK / term | 0.35 / 0.82 / 0.2 | 0.35 / **0.84** / 0.2 | 0.35 / 0.82 / 0.07 | same |
| charTint | [1.0, 0.94, 0.92] | same | [1.0, 0.78, 0.56] | same |
| charShade / charGrad / bodyGrad | 0.86 / 0.07 / 0.2 | same | 0.88 / 0.1 / 0.25 | same |
| sideTint | [0.92, 0.90, 0.96] | same | [0.85, 0.80, 0.95] | same |
| blob | [0.62, 0.58, 0.58] | same (**unused**, see Bugs) | [0.75, 0.74, 0.9] | same (unused) |
| actorShadow | false | false | true | true |
| top | `#4284d3` | **`#3e7fd2`** | `#443876` | **`#6a4f8c`** |
| hor | `#c9cdee` | **`#b8d0ec`** | `#ffd08a` | `#ffd08a` |
| skyCurve | [0.0, 0.5, 0.6] | same (sky now from LOOK) | [0.05, 0.6, 1.0] | same |
| fog | `#b0c0e8` | **`#b8d0ec`** (= horizon) | `#f4c68c` | **`#efb489`** |
| fogNear / fogFar (m) | 25 / 420 | 25 / **300** | 20 / 360 | **50 / 380** |
| sunDisc | `#000000` | same | `#ffd9a0` | **`#ffcf9e`** |
| sunCol / sunI | `#fff3e0` / 2.3 | `#fff3e0` / **2.8** | `#ffab5e` / 5.5 | same |
| sky / ground (hemisphere) | `#dcecff` / `#b49a78` | same | `#b9a4e0` / `#7a5a6a` | **`#d8b0b8` / `#8a6a60`** |
| hemiI | 0.9 | **0.55** | 0.5 | 0.5 |
| bias / normalBias | −0.00025 / 0.015 | same | −0.0006 / 0.03 | same |

Shipped also adds `LOOK` (lights.ts:36-63): 5-stop sky by elevation, river colours, cloud palette, `bounce`, `sat`:
- Day sky stops `#b8d0ec @0°, #9cbfea @3°, #6a9fe0 @8°, #4f8cdb @16°, #3373cc @40°`; water near `#22a7b6`, mid
  `#167fb2`, far `#1a5596`, crest `#7ddfe8`, trough `#0e4a80`, glint `#ffffff`, shade [0.5, 0.56, 0.72]; cloud lit
  `#fbf8f1`, mid `#e1e5f3`, shade `#c3cbe9`; bounce [0,0,0]; sat 1.08.
- Golden sky stops `#ffc47c @0°, #f7ae78 @4°, #e8967c @10°, #c4848e @20°, #8a6f8a @40°`; water near `#1e3a6e`, mid
  `#355f96`, far `#d4a48e`, crest `#d9a088`, trough `#16294f`, glint `#ffe2b0`, shade [0.42, 0.46, 0.72]; cloud lit
  `#ffd2a8`, mid `#f2a08f`, shade `#a98fc4`; bounce [0.04, 0.02, 0.0]; sat 1.1.
- All LOOK colours are on-screen targets; world.ts writes them through `untone()` (inverse of the Neutral tone map,
  shade.ts:59-77: toe offset −0.04 linear, shoulder from 0.76, 60 fixed-point iterations, clamp 0.985).

Predicted results of the recipe preset (lighting.md:338-347, model incl. Neutral tone map):

| Material | Day lit | Day shade | Day Y ratio | Golden lit | Golden shade | Golden Y ratio |
|---|---|---|---|---|---|---|
| wood (deck) | `#db9349` | `#a76832` | .50 (ref `#c08e5d`/`#936240`) | `#bd6010` | `#45232e` | .14 |
| sand | `#f2d291` | `#c7a57b` | .60 | `#dc9244` | `#565072` | .25 (ref `#db9044`/`#5b5173`) |
| stone/paving | `#efdfbf` | `#bfaba3` | .57 | `#d49864` | `#515598` | .28 |
| grass | `#82c44f` | `#5d8f37` | .50 (ref `#6ca937`/`#518c27`) | `#708213` | `#14483a` | .26 |
| brick wall in shade | – | `#973114` | – | – | `#450620` + lift → plum | – |

Preset notes (lighting.md:349-352):
- Per-shot override: allow `sunAz?` / `sunEl?` per shot in `SHOTS` when a facade must be front-lit (e.g. shot 2 town
  wide az 120). Shipped: `SUN_SHOT = { 2: { az: 120 }, 11: { az: -70, el: 8 }, 12: { az: -30, el: 18 } }` in
  world.ts:67; a `sunAz/sunEl` on the ShotDef wins over it (world.ts:338-339).
- Golden az 15 / el 9 puts the sun just outside the right frame edge for every golden camera; halo enters frame; 2 m
  cards cast ~13 m shadows toward the camera (2 / tan 9° ≈ 12.6 m).
- Head tints are for WHITE heads. With peach skin `#f7d6b6` use golden [1.0, 0.88, 0.76], day [1.0, 0.97, 0.96] so
  head saturation stays ≤ .37 instead of .46. (Shipped handles this with `TINT_K = 0.55` instead, cardshade.ts:15.)

#### 2.9.3 Two-tone world shader `shade.ts` (lighting.md:354-404; shipped shade.ts:1-57)

- Captures the sun shadow visibility inside three's own light loop by string-patching
  `THREE.ShaderChunk.lights_fragment_begin`: replaces
  `directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]` with
  `sunVis = ...` and appends `directLight.color *= sunVis;`. Throws `"shade.ts: three lights_fragment_begin changed"`
  if the patch fails. Assumes **directional light 0 = the sun = the only shadow caster** (three sorts shadow casters
  first); only the unrolled index 0 compiles the shadow block.
- Shader (recipe):
  ```glsl
  vec3 sunV = directionalLights[0].direction;                // view space, toward the sun
  vec3 upV = normalize((viewMatrix * vec4(0,1,0,0)).xyz);
  float ndl = max(dot(geometryNormal, sunV), 0.0);
  float sunTerm = sunVis * smoothstep(0.0, uTerm, ndl);       // 0 = cast/form shadow, 1 = lit
  float skyK = mix(uSideK, 1.0, 0.5 + 0.5*dot(geometryNormal, upV)); // up-facing a bit brighter
  vec3 lit = uLitCol * mix(1.0, ndl, uLambert);               // keep some cosine modelling
  reflectedLight.directDiffuse = diffuseColor.rgb * mix(uShadeCol, lit, sunTerm) * skyK + uShadeLift*(1.0 - sunTerm);
  reflectedLight.indirectDiffuse = vec3(0.0);                 // hemisphere/fill no longer used
  ```
- Uniforms: `uLitCol, uShadeCol, uShadeLift (vec3), uLambert, uSideK, uTerm (float)`. Inject after `#include <common>`;
  `float sunVis = 1.0;` + LFB replaces `#include <lights_fragment_begin>`; TWO_TONE appended after
  `#include <lights_fragment_end>`. `customProgramCacheKey = "twoTone1"`.
- `twoTone()` works on MeshLambertMaterial or MeshPhongMaterial (Phong keeps its specular, which is masked by shadow
  because the sun colour was multiplied by sunVis).
- Shipped differences: adds `uBounce` (warm bounce on shaded faces turned toward the lens, golden only) and `uSat`
  (albedo saturation around luminance, `alb = mix(luma, rgb, uSat)`), a per-material `LIFT_K` define (`twoTone(m, liftK)`,
  e.g. 0.15 for iron/steel/chain), and cache key `"twoTone5_" + liftK`.

#### 2.9.4 Card shader `cardShade()` (lighting.md:406-444; shipped cardshade.ts)

Recipe: kills emissive (`emissive 0x000000, emissiveIntensity 0, emissiveMap null`), replaces three's
`vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;` with:
- `outgoingLight = diffuseColor.rgb * uCharTint`
- `side = clamp(sunV.x * 1.4, -1, 1)` (+ = sun on screen right)
- `u = clamp((vMapUv.x - 0.5) / 0.21, -1, 1) * sign(dFdx(vMapUv.x) + 1e-7)` (handles mirrored cards)
- `t = u * side` (+1 = edge facing the sun); `head = smoothstep(0.55, 0.62, vMapUv.y)`; `g = mix(uBodyGrad, uGrad, head)`
- `dark = smoothstep(0.1, 1.0, -t)`; `sideK = mix(1, uSideTint, dark * (g/uGrad) * 0.5)`
- `top = 1 + 0.055 * clamp((vMapUv.y - 0.72)/0.15, -1, 1) * clamp(dot(sunV, upV)*2, 0, 1) * head`
- `lift = 1 + 0.03 * max(t, 0)`
- `outgoingLight *= mix(uCharShade, 1.0, sunVis) * (1 - g*dark) * sideK * top * lift`
- Predicted with skin `#f7d6b6`: day lit head `#ecc6a4` (V .93), in shadow `#e2bb9c` (V .89) vs old `#ae9786` (V .68);
  head ~−14 % at far edge; torso −20 to −25 %. UV split 0.55-0.62 and head centre 0.72 assume the 600x1000 card with
  the head in the top third.

Shipped cardshade.ts values: `GRAD_K = 5.5` (head gradient = charGrad × 5.5, capped 0.4), `GRAD_KB = 1.6` (torso),
`TINT_K = 0.55` (only 55 % of the preset tint), tint normalised by `pow(luma, uNorm=0.7)` so faces keep the same value
day and golden, `uGain = 1.03`, head zone `smoothstep(0.565, 0.6, v)`, head centre v .69 (half height .11), half widths
0.2 head / 0.15 torso, `side = sign(sunV.x) * smoothstep(0, 0.35, |sunV.x|)` (saturates so even a near-frontal sun
shades one side), `dark = smoothstep(-0.15, 0.9, -t)`, `top` +5 %, `lift` +4 %. **Plus a golden-only warm INNER rim**
`vec3(0.95, 0.52, 0.16)`, ~2 px at 1080 on the sun-facing edge of head skin or torso only (cardshade.ts:38-56).
Cache key `"card9"`.

#### 2.9.5 Where to apply (lighting.md:446-453; shipped build.ts/world.ts)

- `lam()`: `twoTone(new THREE.MeshLambertMaterial(make()))`; `toLambert()` same. Water `MeshLambertMaterial` too, so the
  bridge shadow on the river takes the shade colour.
- Metal highlight (recipe): iron `MeshPhongMaterial({ color "#2c2f36", specular "#8a8a8a", shininess 60 })`, steel
  `{ "#9aa3b3", "#b0b0b0", 45 }`. Shipped: iron `#3d414c` / `#8a8a8a` / 60, steel `#7d8088` / `#b0b0b0` / 45 (world.ts:165-166),
  chain Phong `#7a8490` / `#6c727b` / 30 (build.ts:23).

#### 2.9.6 Sun rig per shot (lighting.md:455-498; shipped world.ts:330-387)

Camera-relative sun formula:
```ts
// f = horizontal forward of the shot camera (normalised), screen right = (-fz, fx)
const hx = fx*Math.cos(az) - fz*Math.sin(az), hz = fz*Math.cos(az) + fx*Math.sin(az);
const sunDir = new THREE.Vector3(hx*Math.cos(el), Math.sin(el), hz*Math.cos(el));
sun.position.copy(focus).addScaledVector(sunDir, 220); sun.target.position.copy(focus);
```
- Recipe uses the camera at the shot's **first frame** (`camAt(id, s.a)`). Shipped `shotSun()` **averages** the
  horizontal forward over the whole shot (every 3rd frame) and caches per shot id.
- Shadow frustum: `Rr = clamp(dist * 1.15 + 7, 12, 95)`; `normalBias = L.normalBias * (Rr / 12)`.
  Shipped shadow camera: left/right/top/bottom ±Rr, near 20, far 480. Golden: recipe `max(Rr, 16)`; **shipped
  `max(Rr, 30)`** ("el 7: 2 m cards throw ~16 m shadows, houses much longer").
- `this.fill.intensity = 0` (two-tone ignores fill). Hemisphere still set from preset (only affects unpatched materials).
- Per frame copy preset into TONE/CHAR uniforms.

#### 2.9.7 Contact blobs (lighting.md:462-519) vs shipped (cast.ts:203-222)

Recipe: one `InstancedMesh` of 160 unit planes, multiply decal (`CustomBlending`, `AddEquation`, `ZeroFactor` src,
`SrcColorFactor` dst, `polygonOffset -2/-2`, `depthWrite false`), `renderOrder 0.5`; actors `renderOrder 1`.
Fragment: `m = 1 - smoothstep(0.72, 1.0, r)`, colour `mix(1, uRatio, m)`. Ellipse **0.7 × 1.1 m**, offset **0.25 m
away from the sun**, long axis along the shadow, y + 0.012. Multiply = `L.blob` (day Y ≈ .59). Soft rim = outer 28 %
of radius ≈ 0.1 m ≈ 10-14 px @720 in a medium shot. Skip `crowd: "water"` shots and swing riders.
Day: cards do NOT cast (az 75 sun is only 15° off the card plane → thin sliver). Golden: cards cast long silhouettes +
a light contact blob.

Shipped: blobs are flat effect cards with `blobMaterial()` (same multiply blend, cardshade.ts:80-85), two parts:
- **Contact pool** 0.52 × 0.4 m × scale, offset 0.03 m away from sun, y + 0.022, colour `CONTACT.day [0.2, 0.21, 0.33]`,
  `CONTACT.golden [0.24, 0.2, 0.33]` (blue-violet, "~.5 on screen at the core").
- **Day tail** width 0.72 m, length `clamp(1.6 / tan(el), 0.5, 2.4)` m × scale (= 1.44 m at el 48°), plane height
  `len + 0.55`, centre offset `0.3 × h` away from sun, y + 0.018, colour `TAIL [0.42, 0.44, 0.62]`.
- Strength factor k: `hexOf(c, k)` = 1 − (1 − v)·k, then sRGB.
- Swing card always casts a real shadow (`p.geo === "swing" ? true : L.actorShadow`, world.ts:435).

#### 2.9.8 Card material, shadow map, AO (lighting.md:522-563)

- Card: `cardShade(new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: DoubleSide }))`, `receiveShadow = true`
  (dims only to 0.86-0.88), `renderOrder = 1`, no emissiveMap. Recipe `alphaToCoverage = true`; **shipped false**
  ("A2C + MSAA left 1 px sky-depth seams on blurred far cards", cast.ts:74). `customDepthMaterial` (RGBADepthPacking,
  alphaTest 0.5) unchanged.
- Shadow map: keep PCFSoftShadowMap (`<ThreeCanvas shadows>`), **mapSize 4096**; texel = 2Rr/4096 (6 mm close-up,
  4.6 cm wide). In-focus edges 3-10 px @720. **No PCSS, no big blur radii.**
- Bias: day `bias −0.00025`, `normalBias 0.015·Rr/12`; golden (sun 9°) `bias −0.0006`, `normalBias 0.03·Rr/12`.
  With two-tone colours acne shows as **violet speckles**; check the swing shot first.
- Optional softer shadows: `<ThreeCanvas shadows="variance">`, `sun.shadow.radius = 3`, `sun.shadow.blurSamples = 12`.
- **Do not add SSAOEffect** (needs a NormalPass = second full scene render that ignores alpha-tested cards; adds
  grime). If ever needed indoors: `new SSAOEffect(camera, normalPass.texture, { worldDistanceThreshold: 1,
  worldDistanceFalloff: 0.3, worldProximityThreshold: 0.4, worldProximityFalloff: 0.1, intensity: 1.2, radius: 0.05,
  samples: 9, rings: 4, luminanceInfluence: 0.7, resolutionScale: 0.5, color: new Color("#5b4a6a") })`.

#### 2.9.9 Calibration loop (lighting.md:565-583)

1. Render test stills b_100, b_1810, b_1900, c_1450, b_1500, b_1680, c_1745.
2. In `references/lighting`: `python scripts/run_auto.py` (Q01/Q02), `python scripts/run_pairs.py` (P01/P02; boxes are
   pixel coordinates, re-pick if framing moved), `python scripts/heads_ours.py`, `python scripts/grade.py`.
   (These scripts are **not in the repo**.)
3. Targets:

| Measure | Target |
|---|---|
| Day deck/paving shade/lit Y | **.45-.55**; per channel R ≥ G ≈ B; sat not lower than lit |
| Golden ground lit | V ≥ .75, hue 25-35° |
| Golden shade | B ratio ≥ 1.3 (aim 2-3), hue 240-260° |
| Heads | V ≥ .86 everywhere, \|grad_lr\| .10-.17, grad_tb −.05 to −.13 |
| Day dark-band chroma | C ≥ 10, hue 20-60° |
| Sunset split_b | ≥ +15 |

If a ratio misses, scale that channel of `shade` by target/measured and repeat; ~2 rounds (Neutral toe is non-linear).

### 2.10 Lighting top 5 (lighting.md:585-595)

1. Two-tone shadow colours (`shade.ts` + `twoTone()` in `lam`/`toLambert`): day shade Y .25-.38 → ~.50 with saturation
   kept; golden shade violet-blue (B ≈ 3x lit).
2. Golden as backlight: camera-relative sun az 15° / el 9° + sunset sky and sun disc → long shadows toward camera, lit
   ground V ≥ .75, violet shade, sun glow at frame edge.
3. Card shading (`cardShade()`): heads V .68 → .89 in shade, golden sat .62 → ~.3.
4. Day key from the side, frozen per shot (az 75 / el 48) instead of flat front light in 29/41 keys.
5. Character ground shadows: offset soft multiply blobs (Y ~.6); card shadow casting off by day, on at golden.
   Sky/fog rank next to #4; metal highlights are small.

### 2.11 Lighting build rules (actionable)

- Use two-tone shading on every world material: `albedo × mix(shade, lit, sunTerm)`, hemisphere/fill off.
- Day: key from the side/side-back (az ~75°, el ~48°), shadow ≈ 0.5 × lit in the surface's own hue (measured target).
- Sunset/golden: **backlight** (az 0-40°, el 3-15°; shipped 6°/7°), violet-blue shadow colour (B 1.35-3x lit),
  orange lit ground V ≥ .75, sun disc + halo at frame edge, long card shadows toward camera.
- Night: blue/violet ambient, warm windows/lamps as emissive glows; violet fog `#877aea`; moonlit heads lavender `#b1ace7`.
- Interiors: light patches as colour replacements, often no character ground shadow, no inner-corner ink.
- Shadows crisp (3-12 px @720 in focus); let DOF soften the foreground. No SSAO.
- Heads V ≥ .86 in every light, tinted by the light colour, ~14 % side gradient toward the sun, top +5 %.
- Specular only on metal (one soft broad highlight).
- Freeze the sun per shot; re-aim it per shot with `sunAz`/`sunEl` when a facade must read.

---

## 3. DEPTH (depth of field, haze, glow, framing) — depth.md

### 3.1 The gap (depth.md:8-21; reference 539 frames every 2 s, ours 56 test stills)

| Cue | Reference | Ours (before) |
|---|---|---|
| Background DOF | On in ~1/3 of shots. When on, bg sigma720: CU 4.2, MS 4.0, FS 2.7, WS 1.9 | bg sigma720 0.71-0.99, excess over subject ≤ 0.71 (median 0.48): **no visible DOF**; built-in `DepthOfFieldEffect` caps blur at `bokehScale` px (0.9-2.2 px) |
| Foreground blur | 20 % of frames have a near foreground object, blurred to sigma720 3.7-7.8 | almost none; b_200 tourist heads sharp (0.96) |
| Rack focus | none inside shots; whole-frame blur pulses (sigma 3.6-5) of 0.3-1 s at some cuts | none (transition-level only) |
| Aerial perspective | skyline objects 40 % closer to horizon colour than near ones (dA 0.41 vs 0.69); darkest far pixels lifted to 15 % of horizon colour | far *further* from horizon colour (0.80 vs 0.70); dark floor 0.02. `Fog(#cfe3f2, 90, 560)` hardly reaches the town (40-200 m) |
| Sky gradient (day) | horizon/upper-sky luminance **1.28**; upper `#5e93d9` (S .54), horizon `#9fb6e6` (S .32) | 1.04; upper `#8cb6e7` (S .39), horizon `#9abfe8` |
| Sky (golden) | **1.55** (n = 3); upper `#9a7e7f` mauve, horizon `#ffd18a` yellow-orange | 1.05; upper `#b5919f`, horizon `#cfa197` muddy pink |
| Glow | emissive sources only (moon, lamp, fire, sun): e-fold 14-21 px @720, +0.23-0.50 of (source − bg) at the edge. White faces never glow: hot edges are *sharper* (0.38) than normal (0.52) | nothing reaches threshold: p99.9 luminance 0.81, max 0.85 → bloom inert |
| Camera height | median 0.79 × character height; 82 % eye level, 11 % high, 3 % low, 3 % top-down | median 0.80 × but 29 % of shots below 0.5 × |
| Headroom / horizon | head top y = 0.28 CU, 0.35 MS, 0.38 FS, 0.50 WS; horizon 0.45 | 0.33-0.41; horizon 0.43-0.48 (OK) |
| FOV | not reliably measurable | 34-46°, median 40 (keep) |

### 3.2 DOF method (depth.md:36-45)

- Edge-spread fit at every strong edge: `a + b·Φ((t−t0)/σ) + c·t` (Φ = Gaussian step) with batched
  Levenberg-Marquardt; keep fits with relative RMS ≤ 0.07; detection at scales 1, 2, 4; validated on synthetic edges
  sigma 0.6-16.
- Per frame: 40 px tiles, 30th percentile of their edges; "above head" = median tile above the labelled head top.
- All 539 frames hand-labelled (type, head top/feet, horizon, camera height, foreground, bg distance, dutch).
- Curated boxes on 47 reference frames and 22 of our stills: subject (S), background (B), foreground (F).

### 3.3 How often and how strong (depth.md:47-62; 530 non-transition frames)

| Type | n | Share with DOF on (bg σ720 > 1.2) | bg σ720 when on, median (IQR) | Disc radius @1080 | Share > 1.0 overall |
|---|---|---|---|---|---|
| CU | 12 | 42 % | 4.2 (2.8-4.4) | ~12.5 px | 58 % |
| MS | 121 | 21 % | 4.0 (1.9-4.9) | ~12 px | 29 % |
| FS | 131 | 18 % | 2.7 (2.0-3.4) | ~8 px | 23 % |
| WS | 55 | 24 % | 1.9 (1.4-2.5) | ~5.7 px | 25 % |
| Inserts (tile p80) | 117 | 46 % | 2.8 | ~8.3 px | – |
| All | 530 | – | above-head median 0.57 (IQR 0.38-1.07, p90 2.75) | – | 27 % |

- Sharp baseline: 10th percentile edge sigma per frame = 0.33 (IQR 0.30-0.37). Blur is a deliberate per-shot choice.
- Per video: above-head median from 0.38 (videos 09, 10: 0-5 % blurred) to 2.12 (video 04: 64 % blurred).
- **DOF is not a fixed lens.** FS with far background: median 0.62 (20 % > 1.0, 0 % > 2.0). MS with near wall 0.60
  (30 % > 1.0). DOF is switched on for chosen beats (intimate CU/MS, inserts, foreground-framed shots) and off for
  establishing and most full shots.

Measured examples (sigma720, p30 of each box; depth.md:64-79):

| Frame | Type | Subject | Background | Foreground |
|---|---|---|---|---|
| 05_f2010 | MS | 0.30 | 6.97 (photo wall) | – |
| 13_f0930 | CU | 0.34 | 5.33 (forest, hazed) | – |
| 05_f2250 | MS | – | 4.92 | – |
| 08_f0210 | MS over-shoulder | 0.36 | 4.53 | 3.71 (head in front) |
| 11_f0150 / 03_f0810 | MS | sharp | 3.16 / 2.76 | – |
| 03_f0930 / 04_f0210 / 04_f0390 / 04_f0330 | FS | ~0.35 | 2.80 / 2.54 / 2.35 / 1.85-2.74 | ground 10.8 (04_f0210) |
| 17_f0270 | MS | 0.44 | 1.77 | **7.79** (slot machines) |
| 16_f0990 | MS | 0.29 | 0.32 (sharp booth) | **5.52** (cat) |
| 14_f0030 / 01_f0210 / 07_f0750 | FS | sharp | 0.99 / 0.96 / 0.75 | – |
| 16_f0150 / 14_f0390 | WS | sharp | 1.27 / 0.74 | – |
| 10_f1650 | CU | 3.26 | 3.42 | focus on a foreground key |
| 01_f0570 | FS | 1.81 (near character) | focus on far ship | – |

Ours (21 stills with S+B): subject 0.60-1.02 (median 0.76), background 0.71-0.99 (median 0.89); excess
`sqrt(B² − S²)` median 0.48, max 0.71. Because our stills are half resolution, only B − S differences are fair.

### 3.4 How blur grows behind the subject (depth.md:88-94)

- **Thin lens with saturation: CoC(d) = C∞ · |1 − F/d|** (F = focus distance).
- Crowd 03_f1830: heads 200 → 135 → 110 → 70 px (distance ratio 1 → 1.5 → 1.8 → 2.9) have sigma 0.33 → 0.33 → 1.14-1.31
  → 1.55. Thin lens with C∞ = 2.4 sigma predicts 0, 0.8, 1.07, 1.58.
- **Saturation:** western street (video 04 at 6 s): every building from mid to far sits at sigma 1.85-2.0. Blur reaches
  its limit within ~3× the focus distance and then stays flat.
- Near walls (~1 m behind a character) blur much less than sky/town; this falls out of thin-lens geometry.

### 3.5 Rack focus (depth.md:95-106)

Checked windows: video 04 frames 100-220, video 10 frames 1600-1700, video 01 frames 540-620 (6 horizontal bands per
frame). **No focus pulls inside shots.** Video 04: a new shot starts with the whole frame at sigma 3.6 for 0.8 s, then
1.8 for 1.1 s, then a whip pan. Video 10: a push-in blurs the whole frame to sigma 4-5 for 0.8 s, then cuts to sharp.
These are transition blurs (motion report), not DOF.

### 3.6 Why the built-in DOF failed (depth.md:108-120)

postprocessing 6.37.2 `DepthOfFieldEffect`: CoC = `smoothstep(0, focusRange, |d − F|)` in world units; bokeh = 64-tap
Vogel disc of radius `coc × bokehScale × texelSize`; materials sized to the full 1080x1920 buffer → **max disc radius
= `bokehScale` px**. Our 2.2 / 1.5 / 0.9 px = sigma720 ≈ 0.7 / 0.5 / 0.3, below the sharp baseline. Raising
bokehScale to 8-20 px: 64 taps over 20 px look grainy; the far buffer is premultiplied by CoC without renormalising
(dark halos); smoothstep CoC under-blurs foreground (at d = F/2 it gives 0.16 where the thin lens gives 1.0).
**Replace with a thin-lens gather effect.**

### 3.7 Atmosphere (depth.md:124-155)

Method (`scripts/atmos.py`, not in repo): sky mask = smooth (|∇L| < 0.01/px), bright (L > 0.35) region connected to
the top edge; skyline = median lowest sky pixel per column; "upper" = median colour of top 15 % of visible sky;
"low" = band just above the skyline (= airlight A). Haze below skyline in 5 bands (0-4, 4-10, 10-20, 20-35, 35-100 %
of frame height below it): **dark floor** = p10 of normalised dark channel `minfilter(min_c I_c / A_c)` (0 = full
ink/shadow, 1 = all lifted to horizon colour) and **dA** = RGB distance from band median colour to A. Reference: 40
exteriors with labelled horizon; ours: 43 stills with sky.

| Metric | Ref day (n 37) | Ours day (n 30) | Ref golden (n 3) | Ours golden (n 13) |
|---|---|---|---|---|
| Upper sky | **`#5e93d9`**, L .53, S .54 | `#8cb6e7`, L .69, S .39 | **`#9a7e7f`**, L .55 | `#b5919f`, L .60 |
| Sky above skyline | **`#9fb6e6`**, L .72, S .32 | `#9abfe8`, L .73, S .34 | **`#ffd18a`**, L .84 | `#cfa197`, L .67 |
| Low/upper luminance | **1.28** (1.18-1.40) | 1.04 (1.01-1.05) | **1.55** (1.49-1.87) | 1.05 |
| Dark floor just below skyline | 0.15 (0-0.24) | 0.02 | 0.12 | 0.00 |
| dA far band → near band | **0.41 → 0.69** | 0.80 → 0.70 | 0.60 → 0.78 | 0.77 → 0.82 |
| Band colour just below skyline | `#b2b0a1` pale grey-beige | `#7c4d4b` dark brick red | `#be755f` | `#87270b` |

Meaning (depth.md:150-155):
- Day reference: skyline objects blended ~40 % toward horizon colour (k ≈ 1 − 0.41/0.69); their ink and shadows lift
  ~15 %; near objects keep full colour.
- Old fog 90 → 560 m = 0 at 70 m, 0.085 at 130 m, 0.19 at 180 m; colour `#cfe3f2` pale cyan did not match horizon.
- Reference sky keeps a pale horizon and reaches deep saturated blue within ~20° elevation. Old shader
  `mix(hor, top, pow(h, 0.55))` (h = sin(elevation)) hit ~50 % at the top of a 40° frame → all one pale blue.
- Old golden sky was muddy because the orange horizon was already 30-40 % mixed with purple-blue at the skyline.

### 3.8 Bloom and glow (depth.md:159-203)

- Edge widths: reference hot edges (local max L ≥ 0.95) sigma 0.38 vs normal (0.45-0.85) 0.52; per-frame hot/normal
  0.80, only 2 % of frames > 1.5. **White surfaces (heads, eyes, walls, white clouds) do not bloom.** Ours: 1.01; no hot
  pixels at all.
- Emissive sources (radial profile from centroid of L ≥ 0.85 blob; excess = (L − bg)/(L_src − bg)):

| Source | Disc r0 (px720) | Excess r0+4 | r0+10 | r0+20 | r0+40 | e-fold (px720) |
|---|---|---|---|---|---|---|
| Moon 11_f1350 | 38 | 0.37 | 0.32 | 0.22 | 0.10 | 19.6 |
| Moon 11_f1050 | 40 | 0.23 | 0.21 | 0.15 | 0.05 | 18.0 |
| Ceiling lamp 05_f0210 | 42 | 0.46 | 0.38 | 0.30 | 0.14 | 20.9 |
| Fireball 12_f0930 | 36 | 0.42 | 0.23 | – | 0.05 | 14.4 |
| Sun 11_f0930 | 58 | 0.50 | 0.49 | 0.41 | 0.11 | 19.7 |

- **Target glow:** broad flat halo, excess 0.25-0.5 at the edge, still 0.15-0.4 at +20 px (720p), e-fold 14-21 px
  @720 = **21-31 px @1080 (~1.5 % of frame height)**. Sun scene washes 7 % of the frame to L ≥ 0.93.
- Peak white: reference p99.9 luminance 0.99, max 1.0 in nearly every frame; ours p99.9 0.81, max 0.85 (p90 of frames
  0.97). Nothing crossed `luminanceThreshold 0.86` → invisible bloom (an exposure issue for the grade report).
- Mipmap bloom calibration (numpy port of MipmapBlurPass: 13-tap downsample inner 4 at 0.125 / outer 9 at 1/18, 9-tap
  tent upsample, `mix(down[i], up, radius)`, half-res output; g(d) = glow d px @1080 outside a 60 px source):

| levels | radius | g(4) | g(20) | g(60) | g(150) | e-fold (px1080) |
|---|---|---|---|---|---|---|
| 8 (old) | 0.85 | 0.14 | 0.049 | 0.017 | 0.0067 | 40 (long thin tail) |
| 6 | 0.5 | 0.13 | 0.022 | 0.004 | 0.0004 | 24.5 |
| **6** | **0.6** | ~0.15 | ~0.04 | ~0.011 | ~0.001 | **~30** |
| 6 | 0.7 | 0.18 | 0.057 | 0.019 | 0.002 | 35 |
| 5 | 0.85 | 0.26 | 0.124 | 0.022 | 0.00001 | 21 |

**levels 6, radius 0.6** matches. The reference halo is flatter near the source than any mip kernel → add an
additive glow sprite for big sources. Small sparks (r0 6 px) get only g(4) ≈ 0.045 → need much higher HDR value.

### 3.9 Composition (depth.md:207-256)

Shot mix (530 labelled frames):

| Type | Share | Head-top y (IQR) | Visible character height | Feet y | Foreground object |
|---|---|---|---|---|---|
| CU | 3 % | 0.28 (0.21-0.35) | 0.65 | cut | 39 % |
| MS | 27 % | 0.35 (0.25-0.38) | 0.50 | cut at ~0.80 | 38 % (s 46, b 9) |
| FS | 28 % | 0.38 (0.35-0.42) | 0.35 (0.27-0.45) | 0.75 | 16 % |
| WS | 12 % | 0.50 (0.42-0.55) | 0.15 | 0.64 | 16 % |
| EWS | 8 % | 0.51 | 0.10 | 0.59 | 5 % |
| Inserts | 22 % | – | – | – | 9 % |

- Horizon (FS/WS/EWS) y = 0.45 (IQR 0.39-0.50). Background distance: near wall 58 %, mid 23 %, far 20 %.
  **Dutch tilt 2 % (11 of 530).** Characters in the vertical middle; caption over their lower body.
- Camera height: labels eye level 82 %, high 11 %, low 3.4 %, top-down 3.2 %. From horizon geometry (34 level FS/WS/EWS):
  height = (feet − horizon)/(feet − head) = **0.79 × character height** (IQR 0.67-1.00); 10 % below 0.5×; high shots
  1.5-1.9×.
- Ours: median 1.6 m above deck = 0.80× (match) but 29 % below 0.5× (f48 0.6 m, f88 0.4 m, f353/f440 0.36 m, f823 0.7 m,
  f1685 0.8 m); 47 % at 1.0-2.2 m. Card height 2.0-2.1 m with `SU = 0.00216` (design units → metres).
- Ours vs targets: MS (f585/640/925/984) head top 0.35-0.40, full-height equivalent 0.74-0.77 = match; FS (f283, f768,
  f1729, f1857) head top 0.29-0.41, height 0.32-0.41 = match; horizon 0.42-0.49 = match; foreground objects ≈ none
  (ref 38 % of MS/CU); inserts ~3 (anchor, snap, boots) vs 22 % — inserts carry most reference DOF.
- FOV: vanishing-point method (RANSAC, f² = −(v1−c)·(v2−c)) failed (c_1800 estimated 25° vs true 42°; reference 1-73°).
  **Keep fov 34-46°.**

### 3.10 Depth top 5 (depth.md:260-281)

1. DOF on chosen shots: thin-lens gather, C∞ 12-14 px (CU/MS/inserts), 8 (FS when used), 5 (WS when used); foreground
   15-24 px; focus on the subject's eyes.
2. Aerial perspective: fog colour = horizon colour; linear fog 25 → 420 m (day), 20 → 360 m (golden); skyline pulled
   20-40 % toward horizon; fog-tinted ink.
3. Sky gradient: deep upper blue `#5e93d9` at ~20° elevation, pale horizon (luminance ratio 1.28); golden: bright
   `#ffd08a` horizon holding to ~3°, then mauve/indigo.
4. Foreground framing objects in ~1/3 of MS/CU: rail post, chain link, flag, spectator's shoulder or hat, at 0.3-0.5 ×
   focus distance, covering 10-25 % of a frame edge → blurred to 4-8 sigma720.
5. Glow only on emissive sources and real whites: bloom threshold 1.0, levels 6, radius 0.6, intensity 0.5; emissive
   HDR ×3 (sun, lamps, fire), ×8 sparks. Pair with exposure fix so white heads and clouds reach 0.97-1.0.
   Minor: raise f48 and f823 to ~1.4 m so < 15 % of shots are low-angle.

### 3.11 Depth recipe (depth.md:285-523) and shipped versions

#### 3.11.1 Thin-lens DOF `lensblur.ts`

Recipe (depth.md:291-366): one `Effect` with `EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION` (R3F-postprocessing
3.0.4 puts any CONVOLUTION effect in its own EffectPass). Uniforms `focus` (m, along view axis), `cInf` (px, radius at
infinity, 0 = off), `nearScale` (default 1.2), `maxCoC` (default 24 px). Defines TAPS 64, NEAR_TAPS 32,
GOLDEN 2.39996323.
```glsl
float cocAt(float d) { float c = cInf * (1.0 - focus / max(d, 1e-3)); if (c < 0.0) c *= nearScale;
                       return clamp(c, -maxCoC, maxCoC); }
```
- Pass 1: gather the pixel's own disc (64 Vogel taps, `rr = sqrt((i+0.5)/TAPS) * r0`, angle `i*GOLDEN + rot`). A
  sample farther than the pixel may not spread wider than this pixel's CoC (`if (ds > d0) rs = min(rs, r0)`) → sharp
  subjects keep clean silhouettes. Weight `w = clamp(rs - rr + 0.5, 0, 1)`; centre weight 1.
- Pass 2 (near field): 32 taps out to maxCoC, skip taps already inside r0 and anything not in front
  (`ds >= d0 * 0.97`); blend by coverage `cov += w * maxCoC² / max(rs², 1)`, `col = mix(col, fg/fw, clamp(cov/NEAR_TAPS))`.
- Recipe uses a per-pixel random rotation `hash12(gl_FragCoord.xy) * 2π`.
- Skip if `cInf < 0.25`. Sky (depth 1.0 = far plane 1500 m) gets the full cInf → soft clouds in DOF shots.
- Cost ~96 taps × 2 fetches per pixel at 1080x1920.
- Quick fallback with built-in effect: `new DepthOfFieldEffect(camera, { resolutionScale: 1 })`,
  `worldFocusRange = 2 * focus`, `bokehScale = cInf` (approximates far side; under-blurs foreground; grain and dark
  rims above 8 px).

Shipped lensblur.ts: **two passes** `LensBlur.pre` (16 taps, spread 0.287 × CoC, rot 0.61, no near taps) + `main`
(64 taps, spread 0.958, 32 near taps, rot 0) — "pre + main together = a disc of sigma CoC/2", 1024 effective taps,
**no per-pixel noise** (no grain, no flicker). All px sizes × `resolution.y / 1920`. Result renormalised by accepted
weights. Also contains `GrainEffect` (off by default).

#### 3.11.2 Wiring (depth.md:375-396; shipped Bridge.tsx:78-83)

```ts
const d = dofAt(f);
cam.getWorldDirection(fwd);
if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);       // default focus = camera look target
fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));    // view-axis distance, not Euclidean
fx.lens.cInf = d.cInf;
```
Recipe bloom: `new BloomEffect({ intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true,
levels: 6, radius: 0.6 })`. Shipped identical plus `blendFunction: BlendFunction.ADD` ("HDR-safe; SCREEN darkens
values > 1") and a patched `mipmapBlurPass.setSize` so the MIP chain always starts at 540x960-equivalent (glow size
stays the same relative to frame at 540/1080/1440 widths).

#### 3.11.3 DOF table in `story.ts` (recipe depth.md:398-436; shipped story.ts:291-326)

```ts
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyes  = (id: number) => (f: number): V3 => [0, D0 + 1.6, Fz(id, f)];   // eye height 1.6 m above deck D0
const boots = (id: number) => (f: number): V3 => [0, D0 + 0.3, Fz(id, f)];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;      // linear ramp from previous cInf over dur frames
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
```
Recipe entries (frame: cInf, focus): 0:0 establishing; 88 (dur 9): 12 eyes(1); 126: 0; 353 (dur 10): 16 boots(3);
440: 16 boots(4); 444 (dur 13): 0; 534 (dur 13): 10 eyes(5); 585 (dur 10): 12 eyes(5); 640: 12 eyes(6);
643 (dur 11): 14 look; 717 (dur 12): 0; 871 (dur 11): 8; 925 (dur 11): 12 eyes(7); 984: 12 eyes(8); 987 (dur 12): 14
anchor insert; 1039 (dur 8): 10 snap insert; 1062 (dur 18): 0; 1770 (dur 12): 10 officer; 1857: 0; 1905 (dur 10): 10;
1962 (dur 24): 0. ≈ 35 % of screen time with DOF.

Shipped entries: 0: 15 eyes(1) (hook wide: front row sharp, town ~13 px); 30 (dur 37): 15 eyes(1); 72 (dur 32): 15
boots(1); 130: 0 (town aerial under the flash); 333 (dur 40): 14 boots(3); 444: 0; 534: 10 eyes(5); 576 (dur 18): 12
eyes(5); 643: 14 look; 717: 0; 925: 12 eyes(7); 987: 14 (bolt); 1039: 10; 1062: 0; 1134: 16 focus [0.6, 0.6, −21.6]
(river sitters); 1303: 5 (golden sway); 1411: 7 (park, "mild so the facade ink holds"); 1620: 0 (golden march);
1735: 8 (bank, foreground cart); 1770: 12 focus [3.35, D0 + 1.6, −31.55] (officer's eyes); 1863: 0 (tourists).
SKILL.md:96-97 summary: hook/river CU 15-16, close-ups 12-14, MS 10-12, park 7, golden sway 5, wides/aerials 0.

Notes (depth.md:438-441): if a shot reads too soft, halve cInf before turning it off; reference "on" shots never go
below sigma720 1.2 (~4 px radius). Foreground object at 0.3-0.5 × focus distance with nearScale 1.2 lands at
15-24 px (= 4-8 sigma720). Worked check: cInf 12, object at 0.5F → |1 − 2| × 12 × 1.2 = 14.4 px; at 0.3F → 33.6 px,
clamped to maxCoC 24.

#### 3.11.4 Glow sources (depth.md:443-458) vs shipped

- HDR colours (composer buffer is half-float; R3F postprocessing turns renderer tone mapping off).
- Big sources: `new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.6, 2.0) })` for the golden sun disc,
  lanterns, fire. Sparks: `(8, 6, 3)` (e.g. the bolt snap). Expected edge excess 3 × 0.5 × g(4) ≈ 0.22 linear.
- Flat halo sprite: additive `Sprite`, radius **2.2 × source radius**, alpha `0.35 × exp(−(r/(1.1·r_src))²)`,
  `AdditiveBlending`, `depthWrite: false`, `fog: false`.
- Whites must reach 0.97-1.0 (exposure in grade report).
- Shipped world.ts:52-64, 135-139, 380-387: sun disc sprite colour **(6.0, 4.4, 2.4)**, angular radius 1.7°
  (`scale = 2·900·tan 1.7°`, placed at `cam + sunDir × 900`), canvas radial gradient soft rim from 58/64 to 64/64 px;
  halo sprite angular radius **24°** (≈ 14× the disc), alpha `0.55·exp(−(u/0.25)²) + 0.35·exp(−(u/0.6)²)` faded to 0
  over u 0.8-1.0, colour `L.sunDisc × 1.3`, additive, renderOrder 5; disc renderOrder −0.5. Golden shots only.

#### 3.11.5 Fog and sky (depth.md:460-510)

Recipe sky shader (h = `vP.y` = sin(elevation)):
```glsl
float k = pow(clamp((h - curve.x) / (curve.y - curve.x), 0.0, 1.0), curve.z);
gl_FragColor = vec4(mix(hor, top, k), 1.0);
```
Day: `top #4284d3, hor #c9cdee, skyCurve [0, 0.5, 0.6], fog #b0c0e8, 25 → 420 m`. Golden: `top #443876, hor #ffd08a,
skyCurve [0.05, 0.6, 1.0], fog #f4c68c, 20 → 360 m`. Checks: day #a0b7e6 at 4°, #5e93d9 at 20°; golden stays #ffd08a
to 3°, #9c807f at 20° (ref #9a7e7f). NEUTRAL compresses linear values above 0.76 → check one still per light.
Shipped replaced this with the 5-stop elevation shader (world.ts:119-131, smoothstep between stops, stops written via
`untone()`), sky sphere radius 1100, BackSide, `depthWrite false`, `fog false`, follows camera.

Recipe fog amounts (linear 25 → 420 m): soldiers ≤ 15 m: 0; far tower ~57 m: 0.08; far-bank riverfront 70 m: 0.11;
back rows 100-140 m: 0.19-0.29; main street 180 m: 0.39; aerial town 250 m: 0.57. (Shipped day 25 → 300 m gives,
by my calculation, 0.12 / 0.16 / 0.27-0.42 / 0.56 / 0.82 at those distances — clearly stronger haze.)

Fog-tinted ink (recipe):
```glsl
float fogK = clamp((dist - fogNear) / (fogFar - fogNear), 0.0, 1.0);
vec3 inkC = mix(ink, fogColor, fogK * 0.6);
```
and raise `farFade` to ~600. Shipped: ×0.3, starting at max(fogNear, 60 m), fade still 150-450 m (see 1.8).

#### 3.11.6 Composition rules for CAMS (depth.md:512-523)

- Head top y ≈ 0.28 CU, 0.35 MS, 0.38 FS, 0.50 WS; horizon 0.40-0.50; fov 34-46.
- Camera height default 0.7-1.0 × character height = **1.4-2.0 m above the deck**; keep deliberate low beats (boots
  f353/440, f88); raise f48 (0.6 → 1.4 m) and f823 (0.7 → 1.4 m) → low shots 29 % → ~15 %.
- Foreground framing in ~1/3 of MS/CU (e.g. f534, f585, f925, f1770): near object at 0.3-0.5 × focus distance,
  10-25 % of a frame edge (ref 38 % of MS/CU, sigma720 4-8).
- Dutch tilt: ≤ 0.05 rad, on at most 2-3 shots.
- **No focus pulls inside shots.** Change DOF only at cuts or ramp it with camera moves (`dur`).

### 3.12 Depth build rules (actionable)

- DOF on ~1/3 of screen time only: CU 12-16 px, MS 10-12, inserts 10-14, FS 8 (rare), WS 5 (rare), establishing/aerial 0.
  (px = disc radius at infinity, 1080x1920; σ720 = px / 3.)
- Thin lens `CoC = cInf·|1 − focus/d|`, ×1.2 in front, clamp 24 px, focus on the eyes (view-axis distance).
- Foreground framers at 0.3-0.5 × focus distance, 10-25 % of one frame edge, recognisable (not a "green ball").
- Fog colour = horizon colour, linear, starts 20-50 m, ends 300-420 m; far ink lifts ~15 %; darkest far pixels lifted to
  ~15 % of horizon colour.
- Sky: pale horizon, deep saturated blue by ~20° elevation (luminance ratio ~1.28); golden: `#ffd08a` horizon to ~3°,
  then rose/mauve (ratio ~1.55).
- Bloom only above 1.0 (HDR emissives): levels 6, radius 0.6, intensity 0.5; big sources ×3 HDR + flat halo sprite,
  sparks ×8; white faces must stay crisp.
- Camera height ~0.8 × character height; head-top / horizon lines as above; fov 34-46°; dutch ≤ 2-3 shots.

---

## 4. One-page cheat sheet (shipped values first, measured target in brackets)

| Item | Value |
|---|---|
| World ink colour | `#030303` [`#0b0a0c`] |
| World ink width @1080x1920 | 5.1 px at 6 m → 3.3 px at 90 m, log distance [3.4 → 2.2] |
| Crease width | ×0.8 of silhouette [×0.64], from 35° to 50° [50°-65°] |
| Depth-jump threshold | 1 % → 3 % [2 % → 5 %] of relative 1/z |
| Contacts | concaveGain 0.7 outdoors, 0 indoors |
| Far ink | opacity 0.95 at 90 m [0.75], fade 150-450 m, fog tint ×0.3 past 60 m [×0.6 from fogNear] |
| Character ink | own drawn stroke ~4.6 px @1080, plum `#201628`-`#2f1d28`; never world-inked (NOINK = layer 3) |
| Day sun | camera-relative az 75°, el 48°, `#fff3e0` × 2.8 |
| Golden sun | az 6°, el 7° (backlit) [15° / 9°], `#ffab5e` × 5.5, disc HDR (6, 4.4, 2.4) + 24° halo |
| Day shade | albedo × [0.3, 0.29, 0.36] + lift [0.05, 0.06, 0.11] [target Y ratio .45-.55, same hue] |
| Golden shade | albedo × [0.15, 0.15, 0.3] + lift [0.04, 0.06, 0.17] [B ratio 1.35-3x, hue 240-260°] |
| Card floor in shadow | 0.86 day / 0.88 golden; heads V ≥ .86 |
| Head side gradient | ~14 % toward sun, top +5 %, lavender far side |
| Day ground shadow | blue-violet contact pool 0.52 × 0.4 m + tail 0.72 m wide, 1.6/tan(el) long (0.5-2.4 m) |
| Golden ground shadow | real card shadows (shadow frustum ≥ 30 m) + contact pool |
| Shadow map | PCF soft, 4096², Rr = clamp(1.15·dist + 7, 12, 95); bias −0.00025/−0.0006; normalBias 0.015/0.03 × Rr/12 |
| AO | none |
| DOF | thin lens, maxCoC 24, nearScale 1.2, cInf per beat 0-16 px |
| Fog | day `#b8d0ec` 25 → 300 m [420]; golden `#efb489` 50 → 380 m [20 → 360] |
| Bloom | ADD, threshold 1.0, smoothing 0.2, intensity 0.5, levels 6, radius 0.6, mip chain fixed at 540x960 |
| Composer | InkPass → lens pre → lens main → bloom + NEUTRAL tone + grade (merged) → (grain off), MSAA 4 |
| Camera | fov 40 default (34-46), near 0.2, far 1500; height ~1.6 m (0.8×) |

---

## Bugs / contradictions

1. **Missing evidence folders.** All three reports point to `references/outlines/`, `references/lighting/`,
   `references/depth/` (scripts, CSVs, crops, the toy test harness, `sun_vs_cam.txt`, `labels.csv`, etc.) and
   `references/vids/`, `references/measure/`, `references/refs_sheet.jpg` (CONTEXT.md:13-16). **None of these exist in
   the repo.** Only `references/frames/` (39 JPGs), `references/sheets/` (20 JPGs), the reports and STYLE_BIBLE.md
   ship. The calibration loop in lighting.md 9.8 (`run_auto.py`, `run_pairs.py`, `heads_ours.py`, `grade.py`) cannot
   be run as written.
2. **Composer order conflicts between reports.** outlines.md 5.2 says **bloom → ink → DOF + tone** (bloom after ink lifts
   line cores 0 → 53 and thins lines 22-28 %). depth.md 6.1/6.2 says the lens goes "after ink, before bloom". The
   shipped Bridge.tsx follows depth.md (ink → lens → bloom). It only works because bloom threshold is 1.0 so lit
   surfaces never bloom; any HDR source next to an inked edge (sun halo behind a roof) can still lift/thin that line.
3. **depth.md 6.2 code still builds `ink: new InkEffect()`** — the OLD Laplacian effect that outlines.md proved cannot
   work. Copying depth.md's snippet verbatim would bring the broken ink back. Use `new InkPass(scene, camera)`.
4. **Stale comments in shipped ink.ts:10-18.** The header says "pixel steps 1..6", "3.4 px at 6 m -> 2.2 px at 90 m",
   "opacity to 0.75", "~0.64*width", "~50 deg"; the real DEF values are RMAX 9, 5.1 → 3.3 px, 0.95, 0.8, 35°. The
   "verified EW 3.7 / 3.2 / 2.6 / 1.5 / 1.1 px" line (ink.ts:24) was measured for the recipe values, not the shipped ones.
5. **`depthLo` is used twice in the ink mask.** It is the depth-jump start threshold AND the "same depth" gate for
   creases (`abs(zq - zc) > zc * depthLo` → not a crease). Shipped lowered it 0.02 → 0.01, which also makes the crease
   gate twice as strict: on grazing surfaces at radius up to 9 px the neighbour depth easily differs by > 1 %, so
   creases there can drop out. Tuning one silently changes the other.
6. **Measured target vs shipped ink width/colour.** Reference ≈ 3 px `#0b0a0c`; shipped 5.1 px `#030303` (reviewer
   taste). SKILL.md itself contradicts itself: "Look targets" (SKILL.md:108) say ~3 px `#0b0a0c`, "Final look values"
   (SKILL.md:94) say 5.1 px `#030303`.
7. **Painted seams contradict outlines.md 5.5.** The report says seams are tints (local × 0.35-0.45, luma ~60-70, never
   black). Shipped plank seams are near-black `#1c0c05` 12 px cores (paint.ts:312-315), and SKILL.md:93 says
   "near-black seams". Facade `INKL` is still `rgba(40,30,40,0.85)` though the report asked for a warmer facade tint.
8. **Day shade far darker than the measured rule.** lighting.md: day shade ≈ 0.5 × lit, same hue (recipe shade
   [0.80, 0.71, 0.83]). Shipped shade [0.3, 0.29, 0.36] + a blue-heavy lift [0.05, 0.06, 0.11] ("cool tint ONLY in
   shade", SKILL.md:87). On paper shade/lit ≈ 0.19-0.25 before lift and grade; the report also says bluish shade only
   on grey metal. Whether the grade restores Y .45-.55 is not shown in these files — re-measure before trusting it.
9. **"No rim" vs shipped golden rim.** lighting.md 5/6: no rim line on heads in any light (rim 1.02-1.04). Shipped
   cardshade.ts adds a golden-only warm inner rim `(0.95, 0.52, 0.16)` ~2 px; SKILL.md:102,164 endorse it (inner only).
10. **Golden backlight broken on two of three golden shots.** Recipe/preset: golden az 6-15° (backlit). Shipped
    `SUN_SHOT` sets shot 11 to az −70 (side light from screen left) and shot 12 to az −30, el 18. Fine as art direction,
    but it contradicts "golden = backlight" in lighting.md top-5 #2.
11. **`LightPreset.blob` is dead.** lights.ts still defines `blob` for both presets, but no code reads it; cast.ts uses
    its own hard-coded `CONTACT` / `TAIL` colours (cast.ts:206-207), which are blue-violet and darker (~.2-.33 multiply)
    than the measured day blob Y .52-.74 and the recipe [0.62, 0.58, 0.58].
12. **Sun frozen per shot: first frame vs average.** lighting.md 9.4 uses the camera at the shot's first frame;
    shipped `shotSun()` averages the forward vector across the shot. On long orbiting moves these give different suns.
13. **Fog numbers disagree in 3 places.** depth.md / SKILL.md:115 look target: day 25 → 420, golden 20 → 360. Shipped
    lights.ts: day 25 → 300, golden 50 → 380. SKILL.md:88 final values say 25 → 300 (matches code).
14. **Sun halo size vs measured target.** lighting.md 6: golden sun glow r50 ≈ 13-26 % of frame width; depth.md 6.4:
    halo radius 2.2 × source radius. Shipped halo radius is 24° (≈ 14× the 1.7° disc). My rough calculation: the
    shipped alpha falls to half at u ≈ 0.275 → ~7° from the sun centre → about 28-30 % of the frame width (horizontal
    FOV 23.1° at vertical fov 40 and 9:16) — slightly above the measured band, and far bigger than depth.md's 2.2× rule.
15. **Dutch tilt conflict.** STYLE_BIBLE.md:40 says "frequent dutch tilts for drama/falls"; depth.md measured dutch
    tilt in only 2 % of frames (11/530) and recommends ≤ 2-3 shots. SKILL.md:104,120 says "4-4.6° rolls" / "Rolls of 4-5°".
16. **Recipe `alphaToCoverage = true` (lighting.md 9.5) was reverted** in shipped cast.ts:74/92 because A2C + MSAA left
    1 px sky-depth seams on blurred far cards. Do not re-enable it.
17. **Small counting slips in lighting.md:** "Day: 6/20 frames side-back" but only 18 day rows are listed (no d06, d11);
    "7 frontal-soft" matches 6 rows at az ≥ 150° plus one at 120°. Not important, but numbers are approximate.
18. **"≤ 96 depth fetches per pixel"** (outlines.md:215) is really 48 depth + 48 normal fetches at RMAX 6; at shipped
    RMAX 9 it is up to 144 fetches per pixel (cost grows ~1.5x).
19. **Bridge.tsx:111 background `#cfe3f2`** is the old pale-cyan fog colour depth.md called wrong. Only visible if a
    canvas is transparent (crossfade frames); harmless but stale.
20. **cardShade UV zones are hard-coded to the 600x1000 card** (head v 0.565-0.6, centre .69, half widths .2/.15;
    rim samples at fixed UV offsets 0.027/0.016 and 0.067/0.04). Any new character proportion breaks the gradient and
    rim zones silently.

## Hard-coded paths & versions

- Version pins the recipes were written and verified against (CONTEXT.md:29, outlines.md:106, lighting.md:287,
  depth.md:285): **Remotion 4.0.290, three 0.175 (r175), @react-three/fiber 9.1.2, @react-three/postprocessing 3.0.4,
  postprocessing 6.37.2.** The shader patches depend on these:
  - shade.ts string-replaces exact three r175 chunk text in `lights_fragment_begin` (throws if three changes it).
  - cardShade replaces the exact line `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;` — no guard; on a three upgrade it fails silently (card goes back to unlit Lambert output).
  - InkPass depends on postprocessing's `Pass` API (`needsSwap`, `needsDepthTexture`, `setDepthTexture`, `setSize`, `renderToScreen`) and R3F postprocessing's merge behaviour (Effects merged, Passes separate, CONVOLUTION effects isolated).
  - lensblur relies on `getViewZ`, `readDepth`, `texelSize`, `resolution`, `inputBuffer` provided by EffectPass.
  - Bloom patch overrides `b.mipmapBlurPass.setSize` (private-ish API of postprocessing 6.37).
- Python tool versions used for measurements: numpy 2.4, PIL 12, scipy 1.18, no OpenCV (CONTEXT.md:43).
- Placeholder path `your Remotion project` (CONTEXT.md:22-42; reports) = the user's Remotion project root (on this
  machine that was `an older unrelated project folder` per memory — do not touch it while Codex works there).
  Paths named: `out/bridge/test/` (stills `b_*.jpg`, `c_*.jpg`, `sheet_c1.jpg`, `sheet_c2.jpg`),
  `src/videos/bridge/` (ink.ts, story.ts, world.ts, build.ts, paint.ts, toon.ts, cast.ts, Bridge.tsx).
- Composition: `BridgeShort` 1080x1920 30 fps; final render 1440x2560 (`--scale 1.333`); stills at `--scale 0.5` still
  render a 1080x1920 buffer because R3F clamps dpr ≥ 1 (SKILL.md:147).
- Constants tied to the bridge scene: camera `near 0.2`, `far 1500` (ink `cNear/cFar` defaults, lens sky depth);
  sky sphere radius 1100; sun at focus + 220 m; sun disc at 900 m; shadow camera near 20 / far 480; `NOINK = 3`;
  ink `distNear 6`, `distFar 90`, `fogStart 60`; deck height `D0`, eye height `D0 + 1.6`, boots `D0 + 0.3`;
  `SU = 0.00216` m per design unit; card 600x1000 with soles at y = 975.
- Reference video specifics baked into numbers: 720x1280 @30 fps, 4:2:0 chroma, caption band 60-74 % (55-86 % in depth).
- OS: reports are OS-neutral; SKILL.md gotchas mention Windows temp folders (`<big drive>/remotion-tmp`) and the
  `"\r"` escape trap in JS strings (SKILL.md:148-149).

## What to change for a new story

Keep (style constants that are not story-specific):
- InkPass, lensblur, two-tone shade.ts, cardShade, bloom settings, composer order, NOINK contract, untone(), shadow-map
  method. These encode the look, not the bridge.

Must change per story:
1. **Light presets (`lights.ts`).** Add presets for the new times of day. The type only allows `"day" | "golden"`;
   a night or interior story needs new keys (e.g. `night`, `interior`) in `LIGHTS`, `LOOK`, `CONTACT` (cast.ts),
   `GRADES`/`GRADE_STRENGTH` (grade.ts), cloud maps, and every `s.light === "golden"` branch (world.ts:362, 380;
   cast.ts:212). Use the measured targets:
   - Night: L* p2 8.3, p50 32.2, p98 83.8, vivid .45, dark band hue 300° C 33 (violet), split_b +17; violet fog `#877aea`;
     moonlit head tint `#b1ace7` / `#edd9f7`; warm windows `#f2d7a4` (core 8, r50 34, r10 114 px@720); street lamp
     core 4-8 / r50 12; night shade ratio (.47, .51, .91).
   - Interior: L* p2 6.1, p50 33.5, p98 91.6, dark hue 330°, split_b +22; window/sun patches as colour replacements
     (M04: B ×4.85); `concaveGain = 0`; often no ground shadow; sconce glow r50 68 / r10 204; candle r50 42 / r10 174.
   - Sunset/day: use the preset tables above.
2. **Per-shot sun (`SUN_SHOT` in world.ts:67 and/or `sunAz`/`sunEl` on ShotDefs).** The current overrides are for
   bridge shots 2, 11, 12 — delete or rewrite them for the new shot list. Pick az per shot: side/side-back by day,
   backlit for sunset, front (~120°) only where a facade must read.
3. **DOF table (`story.ts` DOF/dofAt).** Rewrite every entry for the new frame numbers and beats; keep ~1/3 of screen
   time blurred (CU/MS/inserts), focus functions (`eyes`, `boots`) depend on `D0` and `Fz(id, f)` from the bridge
   march — replace with the new subject positions.
4. **Foreground framers** (`FOREGROUND` in story.ts, `fgs` in world.ts): new props at 0.3-0.5 × focus distance in ~1/3
   of MS/CU, ≥ ~2 m from the lens, recognisable when blurred.
5. **Sky/fog/river colours (`LOOK`).** River colours only make sense if there is water; for desert/forest/city change
   `water` or drop it, and re-pick horizon/fog colours (fog = horizon colour). Day haze target: far band pulled ~40 %
   toward horizon, dark floor ~0.15.
6. **Ink exceptions for the new world:** indoor scenes → `concaveGain 0`; any custom vertex-displaced surface, Line,
   Points, sprite, sky dome, cloud, smoke, particle → NOINK. Signs/boards with their own drawn border → NOINK.
   Re-check `fadeNear/fadeFar` (150-450 m) and `distFar` (90 m) against the new world scale (a room is 5 m, a valley
   is 2 km).
7. **Painted texture lines** in paint.ts for the new materials: seams/mortar/grout as tints (×0.35-0.45, 1.2-2 px at
   shot distance) — or follow the shipped near-black wood seams if that look is wanted; never paint along a geometry
   edge.
8. **Character cards.** If proportions change (not 600x1000 with head in the top third), update cardshade.ts head zone
   (0.565-0.6), head centre (.69), half widths (.2/.15) and rim sample offsets; and `SU`, card size, sole line.
   If skin is not peach `#f7d6b6`, re-check `TINT_K` and the head saturation cap (≤ .37).
9. **Glow sources.** Emissive story props (lanterns, fire, screens, magic) need HDR colours (×3 big, ×8 sparks) and,
   for big ones, a flat additive halo; whites in lit scenes must reach 0.97-1.0 via exposure/grade, not bloom.
10. **Camera framing (CAMS).** Keep head top 0.28/0.35/0.38/0.50 (CU/MS/FS/WS), horizon 0.40-0.50, fov 34-46, camera
    ~0.8 × character height, < 15 % low shots, dutch on ≤ 2-3 shots; inserts carry most DOF (~22 % of reference frames).
11. **Shadow frustum.** `Rr = clamp(1.15·dist + 7, 12, 95)` and the golden `max(Rr, 30)` assume a town-scale scene with
    2 m cards. Low suns need Rr ≥ card height / tan(el) (2 m at 7° ≈ 16 m) plus building shadows.
12. **Calibrate on the first render.** Re-measure day shade/lit Y (.45-.55), golden shade B ratio (≥ 1.3), heads V ≥ .86
    with |grad_lr| .10-.17, ink EW, and background sigma on DOF shots — the original measurement scripts are not in the
    repo, so they must be rewritten (method details are in sections 1.2, 2.1, 3.2, 3.7 above).

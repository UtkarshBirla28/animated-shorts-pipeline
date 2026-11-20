# kit/surfaces (SURFACES owner): NOTES + API

Status (2026-11-19, ~15:45): all six modules written, typecheck clean (`npx tsc --noEmit -p
src/sandboxes/kit_surfaces/tsconfig.json`); rendered through CORE's pipeline (`KitComposition`) in
`sandboxes/kit_surfaces/`. Proof stills + measured costs: see "Proof" and "Cost" at the bottom.

## Files
| file | what |
|---|---|
| `library.ts` | `LIBRARY` (30 CC0 sets: tile size, kind, relief, defaults), `SurfName`, `SURF_NAMES` |
| `materials.ts` | `surface(ctx, name, opts)` -> `SurfMaterial`, `surfaceTextures()`, `setSurfAttrs()`, `MAX_DECALS`, `SURF_DECAL_TEX` |
| `surf_glsl.ts`, `surf_eval.ts` | the injected GLSL (declarations, vertex displacement, hex bombing, POM, self-shadow, the surface evaluation) |
| `ground.ts` | `patchGeometry` / `groundMesh` (graded tessellated patches), `kerbGeometry` / `kerbMesh`, `boxUVsAndWear`, `path`, `street`, `plaza`, `lawn`, `dirtTrack`, `interiorFloor`, `farGround`, `rng` |
| `decals.ts` | `addDecals(mat, specs)`, `scatterWear(mat, rect, mix, seed)`, `decalAtlas()`, `paintLines()`, `manhole()`, `drainGrate()` |
| `facade.ts` | `facade(ctx, opts)` (near / far LOD), `glassMaterial()` (sky reflection + interior mapping), geometry helpers `rbox`, `quadZ`, `reveal`, `wallWithHoles`, `glassQuad` |
| `interior.ts` | `room(ctx, opts)` |
| `tools/*.py` | `fetch_surfaces.py` (Poly Haven download), `cellmap.py` (per-brick ID maps), `hgtmap.py` (kit height maps) |

## Library (all Poly Haven CC0; rows in `public/kit/LICENSES.md`; files in `public/kit/surfaces/<name>/`)
Names (kit name <- Poly Haven id, tile m): brick_pavers <- short_bricks_floor 1.94 (the Blender pilot's set) | herringbone_pavers
<- herringbone_pavement 2.0 | cobbles <- cobblestone_floor_08 2.0 | asphalt <- asphalt_02 3.0 | concrete_sidewalk <-
concrete_pavement 1.8 | concrete_floor <- concrete_floor_worn_001 3.0 | gravel <- gravel_stones 2.0 | dirt_path <- dirt_floor
2.07 | sand <- sand_01 1.5 | rock <- rock_face_03 2.7 | lawn_soil <- leafy_grass 2.0 | leaf_litter <- forest_leaves_02 3.0 |
planks <- weathered_planks 2.0 | wood_floor <- wood_floor_worn 2.0 | floor_tiles <- floor_tiles_06 3.0 (checker marble) |
carpet <- dirty_carpet 0.6 | plaster <- plastered_wall_04 3.2 | painted_wall <- painted_plaster_wall 2.0 | brick_wall <-
brick_wall_09 2.01 | painted_brick <- painted_brick 1.8 | stone_wall <- stone_wall 2.0 | stone_trim <- sandstone_blocks_08 3.0
| roof_tiles <- clay_roof_tiles_02 2.5 | roof_slates <- roof_slates_02 3.0 | corrugated_metal <- corrugated_iron 1.12 |
painted_metal <- painted_metal_shutter 2.0 | rusty_metal <- rusty_metal_02 1.0 | marble <- marble_01 1.5 | fabric <-
fabric_pattern_07 0.4 | concrete_wall <- concrete_wall_008 2.71. Wallpaper = a canvas pattern over `plaster` (interior.ts).
2K + 1K for the 16 near-lens sets, 1K for the rest; 213 MB on disk. Each folder: `<n>_{diff,nor_gl,arm,disp}_<res>.jpg`,
`kit.json` (`tileM`, read by CORE's `assets.pbr`), `meta.json` (source, authors). The 14 CELL sets also have
`<n>_cell_1k.png` + `<n>_hgt_1k.png` (ours, derived from the scans by tools/cellmap.py + hgtmap.py).

### kinds
- **cell** (pavers, cobbles, setts, slabs, bricks, stones, tiles, planks, boards, roof tiles / slates, marble, trim): the
  cell map gives every brick a stable 16-bit id + a wrap code (a brick crossing the texture border keeps ONE identity)
  + distance to the joint. The shader hashes (tile index, id) -> per-brick value / hue / roughness / height jitter + a few
  "odd" replaced bricks: every repeat of the texture gets different bricks, so the tiling vanishes. The kit height map
  (`_hgt_1k`) is a rounded bevel from the joint distance + 15-30 % of the scan's own detail: crisp, deep joints that match
  the displacement, the self-shadow and an extra normal from the height (whiteout-blended with the scan normal).
- **hex** (asphalt, concrete, gravel, dirt, sand, rock, soil, leaf litter, plaster, paint, rust, carpet, concrete wall):
  hex-tile bombing (Mikkelsen 2022): 3 randomly rotated / offset samples per pixel, contrast + height weighted.
- **plain** (corrugated / painted metal, fabric: directional patterns): one sample + macro noise.
All kinds: macro colour / roughness / hue noise in METRES (seeded), so no repeat shows at 25 mm low angles.

## API
```ts
import { surface } from "../kit/surfaces/materials";
const m = await surface(ctx, "brick_pavers", {
  uv: "xz",            // "xz" world ground (default) | "uv" geometry uv in METRES | "xy" / "zy" world wall planes
  displace: true,      // real vertex displacement: needs a tessellated mesh with aSurf.z > 0 (ground.ts patches set it)
  pom: true,           // OR parallax occlusion mapping (walls / flat near planes), 20 steps, fades out by 7 m
  selfShadow: 0.85,    // height-field sun self-shadow (default on with displace / pom; off in draft / preview)
  tint, value, rough, normal, ao, cavity, metal, tileM, rot, offset, seed, res: "2k" | "1k", side, anti: "none",
  macro: { amount, scaleM, rough, hue }, cells: { value, hue, rough, odd, heightM }, joints: { lo, hi, dark },
  moss: { amount, scaleM, edge, weeds, color }, dirt: { joints, bottom, heightM, baseY, edge, grime, streaks, color },
  wet: { wetness, puddles, scaleM, level }, wear: { edges, polish, centre, chips },
  blend: { with: "gravel", mask: "noise" | "attr" | "both", scaleM, contrast, bias, tint, tileM, rough },
});
```
- Returns a `MeshStandardMaterial` (so PCSS sun shadows, card-light map, N8AO, IBL, the GI light probe, practicals and
  the accumulation all just work). `m.userData.surf` = { name, def, tileM, reliefM, uvMode, U (uniforms), decals, syncDecals }.
  Program cache keys are `surfaces:<name>:<defines>`. Res default: 2k at final / final4 when the set has it, else 1k.
- Per-vertex attributes (all optional, missing = 0): `aSurf` vec3 = (edge 0..1: moss / dirt toward borders, centre 0..1:
  polished walking line, displacement weight), `aWear` (bevel / arris wear 0..1), `aBlendW` (blend toward set 2).
  `setSurfAttrs(geometry, (x, y, z, i) => [edge, centre, disp, wear], blend?)` writes them; `boxUVsAndWear(g)` gives box-
  projected metre UVs + wear on rounded arrises (kerbs, sills, trims).
- Wall-bottom dirt uses WORLD y (`dirt.baseY` = the ground height). Everything is a pure function of position + seed.

### ground.ts
- `groundMesh(mat, { rect: [x0, x1, z0, z1], y?: number | (x, z) => y, lens?: { points: [x, z][] }, fine = 0.016, k =
  0.0075, coarse = 0.4, edges?, blend?, displace? })`: a graded grid, 1.6 cm at the lens growing with distance; the
  displacement weight fades out where the grid is coarser than 2.4-5 cm (no aliasing). Grounds never cast shadows.
- `kerbMesh(mat, { from: [x, z], to: [x, z], w, h, sink?, y0?, len = 0.9, gap = 6 mm, r = arris radius, jitter })`:
  segmented hand-laid stones (rounded boxes, tiny random lift / yaw), merged, worn arrises.
- `path(ctx, { x, width, z0, z1, surface = "brick_pavers", surfaceOpts, lens, edging, edgingGaps, seed })` -> `{ object, mats: { paving, edging } }`
- `street(ctx, { x0, x1, z0, z1, lens, kerbH = 0.12, kerbW, gutterW, camber, sidewalk: [l, r], road / walk / kerb / gutter
  sets, markings: { centre, edges, zebraZ, color }, wet, kerbGaps: { left, right } })` -> `{ object, mats: { road, gutter, kerb, walk }, roadY(x) }`.
  Build along Z; turn the group for other directions (xz surfaces sample WORLD space, so textures stay continuous).
- `plaza`, `lawn` (soil + undulation; NATURE adds blades), `dirtTrack` (dirt + gravel ruts by height blend, puddles),
  `interiorFloor`, `farGround` (flat, 1k, cheap).

### decals.ts
- `addDecals(mat, [{ type, at, size: [along, across], rot, opacity, variant, tint, param }])`, max 16 per material.
  `at` = world x, z for "xz" grounds; metre-UV (local x, y) for "uv" walls. Types: `stain`, `oil`, `puddle` (real water
  in the surface: dark, mirror-smooth, flat normal), `crack` (darkens + joins the joint mask: collects dirt / moss),
  `paint`, `leaves` (tannin leaf prints), `wear` (clean polished patch), `streak` (drips under sills; top = source),
  `moss`. They are evaluated in the surface shader before lighting: they follow displacement and get sun / shadow / AO.
- `scatterWear(mat, rect, { stain: 3, crack: 2, ... }, seed)`.
- `paintLines(ctx, [{ a, b, w, color }], { y: roadY })`: worn lit floating quads (road markings, follow the camber).
- `manhole({ at, r })` (cast-iron disc: raised rings + diamond tread normal map, frame ring), `drainGrate({ at, w, l, rot })`
  (slotted alpha-cut grate over a real dark pit).

### facade.ts
`facade(ctx, { origin, yaw, width, floors, floorH = 3.1, groundH, bays, seed, wall, wallOpts, trim = "stone_trim", plinth,
window: "sash" | "casement" | "modern", frameColor, shop: true | { awning: [c1, c2] | false, fascia }, door: bayIndex,
roof: "parapet" | "cornice", downpipes, lod: "near" | "far", litShare, interior })` -> `{ object, mats: { wall, trim, plinth }, windows }`.
Local frame: x along the facade, y up, +z out of the wall; yaw -PI/2 = facing -X, PI = facing -Z, PI/2 = facing +X.
Near: real holes + reveals (0.14-0.2 m), frames / sashes / glazing bars / mullions, sills with a drip, flat / keystone
lintels or moulded surrounds, string courses, plinth, quoins, cornice or parapet + coping, downpipes (brackets, hopper,
shoe), door with panels + fanlight + steps, or a shop front (stall riser, glazing + mullions + transom, recessed door,
blank fascia, pilasters, striped awning with a scalloped valance that casts shadow). Streak decals under the sills.
Glass: `glassMaterial()` = low-roughness PBR (reflects the sky IBL, sun glints) + interior mapping (room box: back / side
walls, floor boards, ceiling, a furniture band, a picture, depth darkening, curtains / blinds, optional lamp glow per
`litShare`), all seeded per window. Far: flat wall + interior-mapped glass + sills / trims / cornice only.

### interior.ts
`room(ctx, { origin: min corner, w, d, h = 2.9, thick, floor = "wood_floor", floorOpts, wall = "plaster", wallTint,
wallpaper: { wall, colors, repeatM }, windows: [{ wall, at, w, h, sill, curtains }], doors: [{ wall, at, w, h, color }],
lamps: [{ x, z, drop, lumens, kelvin, shadow }], art: [{ wall, at, y, w, h }], shelf: { wall, at, y, len }, radiator,
trimColor, seed, lens })` -> `{ object, mats: { wall, floor, ceiling, paper? }, lamps: Practical[], hints }`.
Walls are real thickness with openings; the glass casts no shadow (the sun comes in, the walls / ceiling slab cast).
Lamps use `ctx.practical` (CORE, rig-aware, flicker) and fall back to a PointLight when it is missing. Use the returned
`hints` (shadow box on the room) as the set's `Built.hints`.

## Gotchas found
- three copies `map`, `alphaTest` and `side` from an object's MAIN material onto its customDepthMaterial in the shadow
  pass: a shadow-only alpha caster needs those on the main material too (else it casts nothing / a solid sheet).
- Cell maps must be NEAREST without mipmaps (ids); everything else is mip-mapped. Per-brick variation fades out when a
  pixel covers more than ~8-20 cell texels (no id shimmer at distance; macro noise carries the far field).

## Proof (sandbox `src/sandboxes/kit_surfaces/`, through CORE's `KitComposition`, quality final = 1080x1920, 8 sub-frames)
Render: `PROPS='{"kit":{"quality":"final","prof":true},"surf":{"probe":true}}' COMP=KitSurfaces ENTRY=src/sandboxes/kit_surfaces/index.ts bash scripts/stills_locked.sh out/kit_surfaces/final_ 50,150,160 1`
(`surf.hide: ["gobo" | "facade" | "ground" | "decals" | "interior"]` hides a module; `surf.probe` logs `surf-prof`).
- (a) `studio/out/kit_surfaces/final_50.jpg` = the pilot path at the pilot camera (frame 50, knee height, 25 mm), and the
  side-by-side `studio/out/kit_surfaces/COMPARE_path_blender_LEFT_threejs_RIGHT.jpg` (Blender still_f050 left, ours right,
  + a crop of the near path). Set: `set_path.ts` (displaced pavers, edging, cross path, decals, lawn soil, a 2-facade
  building corner + roof, far LOD building, a shadow-only gobo canopy standing in for NATURE's trees).
- (b) `studio/out/kit_surfaces/final_150.jpg` street corner (`set_street.ts`): cambered asphalt with cracks / oil /
  puddles / wear, sett gutters, segmented kerbs + corner stones, slab sidewalks, centre dashes + zebra, manhole + drains,
  corner building (shop front with awning on one face, brick + door + steps on the other), far LOD blocks.
- (c) `studio/out/kit_surfaces/final_160.jpg` interior (`set_room.ts`, rig interiorWarm + sunAz 100 / el 27): the sun
  through the window onto displaced floorboards, a shadowed practical pendant lamp (ctx.practical), papered back wall,
  plaster walls, skirting, crown moulding, curtains, radiator, art, shelf + books, door; a far house outside.
- Preview sheet of all three: `studio/out/kit_surfaces/p_sheet.jpg`.

## Cost (GTX 1660 Ti / ANGLE D3D11, 1080x1920, gl.finish-timed)
| set | CORE kit-prof sub-frame (whole pipeline) | main pass | surf-prof scene render (main + shadow maps) | module deltas (hide one) | surface shader vs plain PBR | tris | set build |
|---|---|---|---|---|---|---|---|
| (a) path | 3.0 ms | 1.6 ms | 4.7 ms | ground 2.5, facade 4.0, gobo 2.2 | +3.7 ms | 643k | 2.2 s |
| (b) street | 4.5 ms | 2.4 ms | 7.4 ms | ground 4.2, decals 4.5, facade 6.0 | +4.6 ms | 1.01 M | 3.1 s |
| (c) room | 3.5 ms | 0.8 ms | 6.2 ms | interior 4.9, ground (floor) 2.8, facade (outside) 2.2 | +3.1 ms | 133k | 1.3 s |
Honest note on the numbers: the hide-one deltas are NOT additive (they sum to more than the full render): with n = 4
repeats and the GPU shared with another session they carry ~1-2 ms of noise each; read them as upper bounds. The
reliable figure is CORE's whole sub-frame (3-4.5 ms) = ~25-40 ms of GPU per final 8-sub-frame output frame, far under the
4 s budget (the logged ~0.7-1.2 s per still frame is the first-frame cost incl. program compile / warm-up; shader compile
per set + rig is 12-14 s once). Draft / preview: self-shadow off, POM 10 steps. Disk: 216 MB (30 sets).

## Honest gaps (what still reads fake / missing)
- Pavers vs Blender: our bricks have crisper bevels, deeper joints and more brick-to-brick variation than the Blender
  still, but they look NEWER and too regular: every brick is a perfect rectangle on a straight grid (no rotated / sunken /
  chipped individual bricks beyond a ~2.5 mm height jitter), the colour is more saturated orange under the golden grade,
  and moss / dirt in the joints is subtle at this distance. Blender's set reads more weathered (stains, scuffed tops).
  Next: per-brick tilt (store a centroid in the cell map), stronger joint dirt, a "weathered" preset.
- Cell maps are auto-detected from the scans: good for brick_pavers, brick_wall, painted_brick, planks, wood_floor,
  concrete_sidewalk, roof_slates, cobbles; rough for stone_wall / herringbone (some stones merged into one cell = shared
  colour), floor_tiles / marble (some 2-tile cells). Debug sheets came from tools/cellmap.py (re-run with other params).
- Hex sets (asphalt, plaster...) get no vertex displacement (the vertex stage cannot hex-bomb); asphalt relief is normal
  + self-AO only. Self-shadow is off on hex sets.
- Facade: one plane per face (no wall thickness at an open edge; put two facades at a corner + a roof slab, as in
  set_path). Interior mapping rooms are simple (walls / floor / ceiling / one furniture band / one picture / curtains),
  fine at 5+ m, flat up close. No balconies, bay windows, pitched roofs or chimneys yet. Awning is a smooth sheet (no cloth
  sim). Window glass has no dirt map.
- Interior: no real bounce from the sun patch onto the walls (CORE's GI probe is one SH point, so the window wall stays
  dark); the wood floor reads too orange under interiorWarm (tint it down per shot); curtains are sine sheets.
- Decals: max 16 projected decals per material (more = make a second material or use quads); painted lines are floating
  quads (not displaced; fine on asphalt, which is not displaced).
- The dapple in (a) is a shadow-only gobo (sandbox stand-in), not NATURE's trees.

## Polish round 2 (2026-11-19, after the lead's review)
### Pavers weathered toward the Blender path (`surf_eval.ts`, library `brick_pavers`)
- Per-brick TILT about each brick's centroid (new `<n>_cen_1k.png`, tools/cenmap.py; vertex displacement + the shading
  normal, so the low sun catches every brick a little differently) + height jitter; outlines warped by low-frequency
  noise (`sWarp`: 3 mm), so bricks are no longer perfect rectangles.
- Odd bricks: half dark / burnt, half sun-bleached (paler, greyer); ~1.2 % missing bricks (a sunk hole of soil + moss),
  ~4 % cracked through the middle (the crack joins the joint mask: dirt and moss collect in it); ~40 % of bricks have
  chipped arrises (lower, rough, dirt-filled chunks along the joint).
- Joint grime much darker (`joints.dark` 0.75, `dirt.joints` 0.85 in set (a)) + more moss / weeds; dust toward the
  edges (`dirt.dust`, uses the aSurf edge factor); muted colour: new `sat` option (albedo saturation, pavers 0.42) + a
  less orange tint. Measured on the near path (mean RGB of the bottom of the frame): Blender sat 0.27, G/R 0.80; v1 0.53 /
  0.63; v2 0.38 / 0.72 (v3 a little lower again). Contrast is still higher than Blender's (the Blender frame is mostly in
  shade; ours has the gobo dapple + darker joints).
- New `SurfaceOpts`: `sat`, `cells.{tilt, missing, cracked, chipped, warpM}`, `dirt.dust`; library fields `cellV2`, `warpM`, `sat`, `dust`.
### Facades
- `building(ctx, { x0, z0, w, d, y, floors, floorH, groundH, front: "+z" | "-z" | "+x" | "-x", main, sides, back, roof, wall, seed, lod })`:
  a CLOSED building (four facades meeting at quoined corners + a roof slab inside the parapet / cornice). The main side
  gets `main` (shop / door), the flanks `sides` (fewer bays, no door by default), the back `back` (far LOD by default).
  Use it instead of single `facade()` calls whenever a side can be seen. `facade()` now accepts `bays: 0` (blank wall).
- Fake rooms: a mid-room furniture layer with real parallax against the back wall (sofa / armchair band, a floor lamp
  with a glowing shade, a plant), a warm lamp pool on the back wall in ~half the rooms, curtains half drawn more often
  with folds.
### Room
- Floor desaturated + cooled (`sat` 0.45, tint [0.7, 0.7, 0.76], roughness x1.25 in set (c)); `room({ bounce })` adds a
  warm-neutral PointLight fill 1.5 m in front of each window, 0.55 m up, intensity = bounce (default 0.1) x the LIVE rig
  sun intensity (stands in for the sun patch's bounce; CORE's GI probe is one SH point).
### New library sets for "Why Japanese Train Drivers Point at Nothing"
| kit name | source | tileM | notes |
|---|---|---|---|
| tactile_paving | ambientCG TactilePaving005 | 1.5 (5 x 30 cm blocks) | yellow GUIDANCE bars; `rot: PI/2` runs the bars along a platform |
| subway_tiles | ambientCG Tiles036 | 1.5 | white 15 cm glazed tiles; use dirt.bottom / grime / streaks |
| steel_brushed | ambientCG Metal012 | 1.0 | metal 1 (poles, panels, handrails, kitchen) |
| vinyl_speckled | ambientCG Terrazzo005 | 1.0 | train floor: tinted grey-blue, sat 0.6 (hex bombed) |
| ballast | ambientCG Gravel040 | 3.2 | grey crushed stone (scaled up so stones read 3-6 cm) |
| worktop_laminate | ambientCG Granite002A | 1.0 | granite-look laminate (roughness x6 = satin) |
| tunnel_concrete | Poly Haven concrete_wall_006 | 2.0 | dark grimy concrete (grime / streaks / bottom dirt) |
ambientCG zips were repacked into the kit naming (arm = AO / roughness / metalness), see tools/fetch_acg.py (the
layout is the same as the Poly Haven sets). Platform concrete with a painted edge line
is a BUILDER, not a texture:
- `platform(ctx, { x0, x1, z0, z1, y, h = 1.1, lens })`: slab paving (displaced) at height h, the yellow tactile strip
  0.8 m back from the edge, a bevelled concrete coping, a painted white edge line (paintLines), a grimy recessed front
  wall (tunnel_concrete) under the coping; track on the x0 side.
- `railTrack(ctx, { x, z0, z1, gauge = 1.067 (JR narrow gauge; 1.435 Shinkansen), y, lens })`: ballast bed with sloped
  shoulders, bevelled grimy concrete sleepers every 0.6 m (hand-laid jitter), clip plates, rails (rusty foot / web,
  polished head). Returns `railTopY`.
- Proof still (d) `studio/out/kit_surfaces/v3_170.jpg` (`set_train.ts`): platform + track + tiled wall + steel pillar + tunnel wall.

### Incident: disk full (15:5x)
C: hit 0 bytes free during this round (Remotion bundles in `_remotion-tmp`: every stills run copies all of
studio/public into a new bundle). One write of mine failed and truncated `library.ts` to 0 bytes; it was rewritten in
full from my session and typechecks. Reported to the lead.

### Proof v3 + cost after the polish round (final quality, 1080x1920, 8 sub-frames; GPU shared with other renders)
Stills: `out/kit_surfaces/v3_50.jpg` (a), `v3_150.jpg` (b), `v3_160.jpg` (c), `v3_170.jpg` (d train); comparison
`out/kit_surfaces/COMPARE_path_v3_blender_LEFT_threejs_RIGHT.jpg` (v2: `COMPARE_path_v2_...`, v1: `COMPARE_path_blender_...`); sheet `v3_sheet.jpg`.
| set | CORE sub-frame | main pass | surface shader extra | tris | set build |
|---|---|---|---|---|---|
| (a) path | 3.8 ms | 2.1 ms | +6.6 ms (probe, noisy) | 667k | 8.0 s (cold) |
| (b) street | 5.8 ms | 3.2 ms | +7.6 ms | 1.11 M | 6.1 s |
| (c) room | 4.1 ms | 2.4 ms | +5.7 ms | 133k | 5.6 s |
| (d) train | 2.5 ms | 1.0 ms | +3.7 ms | 556k | 4.2 s |
The extra cell lookups (centroid map, warp) cost ~0.5-1 ms per sub-frame on the paver sets; the rest of the rise vs v1
is GPU contention (other sessions were rendering). Still ~30-50 ms GPU per final output frame (budget 4 s).
Brick colour on the near path (mean RGB, bottom of frame): Blender sat 0.27 / G/R 0.80; ours v3 sat 0.35 / G/R 0.74.

### Still open after round 2 (honest)
- The pavers read close to the Blender path now (muted colour, dark joints, tilted / chipped / odd bricks) but the
  contrast is higher and the joints are a bit too regular in width; the few missing / cracked bricks are hard to spot at
  this framing (raise `cells.missing` / `cracked` for a featured close-up).
- Room (c): the window wall is lifted by the bounce fill, but the floor still reads warm-orange: most of it is the
  interiorWarm light (3900 K sun + 2700 K lamp) through the golden grade, not the albedo; a cooler interior rig or a
  per-shot grade would fix it.
- Train (d): tactile strip, edge line, coping, rails and sleepers read; the ballast reads more like fine gravel than
  4-6 cm stones from 3 m (a scattered-stone instanced layer, NATURE / props style, would fix it); two 404s in the log are
  the loader probing for missing optional files (fine).

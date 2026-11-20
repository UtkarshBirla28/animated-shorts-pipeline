# kit/cards (CARDS owner): NOTES + API

Status: WORKING (2026-11-19 15:45): all six stills + the walk draft rendered, costs measured (below). Tested in `studio/src/sandboxes/kit_cards/`
inside a copy of the pilot pipeline (CORE's `pipeline.tsx` was not ready when this was built).

## Files
| file | what |
|---|---|
| `card.ts` | `card(ctx, opts)`: any canvas drawing as a lit card (+ shadows, contact, grass, LOD) |
| `cardlight.ts` | `CardLight` (one per scene): the character-free sun visibility pass, local GI probes, the card material |
| `shadow.ts` | proxies (one per shadow-casting light) + contact / AO blobs |
| `grass.ts` | world-fixed blades round the feet (`onGrass`) |
| `crowd.ts` | `crowd(ctx, { members })`: many background cards in ONE atlas + one instanced draw |
| `adapters.ts` | `castCard(ctx, { who, pose, pos })` for every clown-film character, pose helpers, `nativeCrownM` |

## API
```ts
import { card } from "../../kit/cards/card";
import { castCard, phoneWalkPose, holdPose, crowdPoseAt, castDraw, poseKey } from "../../kit/cards/adapters";
import { crowd } from "../../kit/cards/crowd";

// any drawing: draw(c2d, t, w, h, info) paints a w x h canvas (soles at soleY, crown at crownY, fractions from the top)
const b = await card(ctx, { draw, px: 1500, heightM: 1.57, pos: (t) => [x, 0, z], yaw?, face?: "camera" | "yaw",
  shadow?: true, onGrass?: false | true | { radius, height }, key?: (t, info) => string, feet?, mirror?, lodM?: 14, look?, dbg? });
set.add(b.object); // and call b.update(t, cam) from the set's Built.update on EVERY sub-frame

// a cast member (the clown film's drawing code, read-only): s / c / light come from the card's geometry
const guy = await castCard(ctx, { who: "phoneGuy", pos: path, pose: (t) => phoneWalkPose(t, metres(t)) });
// who: hero phoneGuy white blue pink prof student ask0 ask1 dude friend0 friend1 mum m1 m2 coffee book | clown | pigeon | "crowd:<CrowdId>"
```
`info` (CardDrawInfo) = `{ cam, s, c, heading, pos, dist, lightAng, t }`: s / c = heading vs the lens (cast Pose.s / .c),
`lightAng` = the key light's canvas angle (cast Pose.light, snapped to 45 deg like cast.ts `light2D`).
Heights (native rig, sole to crown, measured from the cast's own anchors): small 1.45 (hero, pink, ask1, friend1, book),
round 1.472 (blue, mum, coffee), standard 1.518 (white, prof, friend0, m2), tall 1.572 (phoneGuy, ask0, dude, m1),
lanky 1.615 (student); clown 2.08 to the hat on the unicycle. `crownM` rescales one figure.

`look` (CardLook, defaults in `DEFAULT_LOOK`): gain 0.5 (card vs the world's physical light), keyK, form 1, wrap 0.5,
floorK 0.3, ceilK 1.35, rim 1 / rimPx 3.2, inkK 0.05, shadeSat 0.22, tintK 0.6, fogK 0.55, bulgeM 0.12, groundAO 0.3.
`dbg`: 1 sun visibility (red lit / green shade), 2 form normals, 3 light only, 4 bulge height.

## Integration with CORE (kit/core, read 2026-11-19)
- `configureCards(ctx, { source, probe, mapSize, look })` (cardlight.ts) before the first card, else defaults.
- **Visibility source.** Near cards: `source: "private"` (default) = our tight per-sub-frame pass (below);
  `source: "sunCard"` = CORE's `ctx.sunCard` map (character-free, rendered once per output frame by CORE, no extra pass;
  coarser texels, the dapple is not motion-blurred across sub-frames). Far cards (LOD, crowd) read `ctx.sunCard` when it
  exists (no proxies in it), else `ctx.sun`'s map.
- **Proxies** draw only into their own light's shadow camera, so they are already excluded from `ctx.sunCard` (no need to
  call `excludeFromCardShadow`), and the card light (`ctx.sunCard`, intensity 0) never gets a proxy.
- **Fill.** `probe: "capture"` (default) = our local cube probes (sky + bounce); `probe: "rig"` = CORE's
  `ctx.rig.ambient` (E on an up-facing surface) + `ctx.rig.bounce` (E on a vertical surface from the ground) as a two-tone
  SH sky, free (default for quality "draft" when the rig carries `ambient`). CORE's scene LightProbe is NOT added on top
  (our capture already contains the bounce).
- **Practicals** (`ctx.practical`) are three Point / Spot lights: lit + rimmed automatically; shadowed ones get a proxy.
- Programs: the card material is a ShaderMaterial (no onBeforeCompile); the foot grass sets `customProgramCacheKey`.

## How the light on a card works
1. **Character-free sun visibility, per sub-frame.** `CardLight` owns a private DirectionalLight that is NEVER added to
   the scene (so no other material pays for it). Its ortho frustum is fitted round the near cards at this sub-frame
   (2.2 m minimum half size, texel-snapped: ~2 mm texels on a 2048 map), and it is rendered with three's own
   `WebGLShadowMap` (so wind, alpha-tested leaves, window bars use their real depth materials), from a hook mesh that
   draws first in the scene's next render (three's shadow pass needs a live render state). Proxies skip it, cards never
   cast, so the dapple / bars land on the card with no self-shadow. The card samples it with PCSS (12 blocker + 24 filter
   taps, sun 0.5 deg, contact-hardening), at a point pushed forward by the bulge (shadows wrap round the body).
   **CORE note:** this replaces `ctx.sunCard` for cards: CARDS does not read it. A scene-wide second shadowed
   directional light makes EVERY lit fragment of the set evaluate a second PCSS lookup; if no one else needs it, CORE can
   drop it (or keep `castShadow` off) and save that cost. If it stays, the proxies already skip it.
2. **Fill = a local GI probe.** Per 1.5 m ground cell, captured lazily the first time a card needs it: 6 x 16 px renders
   of the set from chest height (cards hidden, wind frozen at 0, dense non-casting grass / flowers hidden for speed),
   projected to L2 SH, bilinear between the 4 cells round the card. Point sprites and additive glows are hidden during the
   capture (bug found: the pilot's dust motes, sized for the 1080 lens, flooded a 16 px face and made the fill 10x too
   bright, which flattened every shadow on the card). It holds the sky AND the bounce (sunlit bricks under
   him, the sun patch on a floor, a lamp-lit wall at night). Deterministic per cell (pure in t).
3. **Every three light of the scene** (lights: true ShaderMaterial): directional (the sun x visibility), point / spot
   (three's own falloff + cone: CORE's `practical()` lamps work without glue), hemisphere, ambient.
4. **Form shading.** Each redraw blurs the drawing's alpha twice (canvas `filter: blur`, into 1/4-res canvases:
   sigma ~0.7 % and ~3 % of the card height = limb-scale and head / body-scale roundness). Central differences give a
   soft bulge normal (big-blob normals only where the figure is wide: thin limbs keep their own small roundness, no
   grey hands). Lambert with wrap.
5. **Exposure guard.** Total light >= floorK x the strongest light's unoccluded key (smooth max: faces readable in shade /
   backlight) and soft-compressed above ceilK x it (no blown faces in full sun). Shade gets a small saturation lift and
   the fill's tint is only partly applied (tintK): a cartoon shadow is a deeper hue of the same colour, never grey.
6. **Rim.** A crisp edge test along the screen direction of the sun and of the strongest lamp (the next pixels toward the
   light are outside the drawing), stronger when the light is behind, x visibility.
7. **Ink.** Pixels near the cast's INK colour (#2c1e2a) are re-lit at albedo inkK (0.05): the outline takes the local
   light (slightly lit, warm in the sun, cool in shade), never pure black.
8. Fog on the card x fogK (0.55): the card stays a touch crisper than the set in haze.

## Shadows (`shadow.ts`)
- One invisible PROXY per shadow-casting light that reaches the card (sun; each shadowed spot / point lamp within its
  range), turned square to that light. It draws only into its own light's shadow pass (onBeforeShadow empties its draw
  range for any other shadow camera). three r175 copies map / alphaTest / side from the object's material into the
  depth material, so the proxy's colourless material carries the card texture + alphaTest + DoubleSide. Night: the
  street lamp's spot casts his silhouette on the pavement and up the wall.
- CONTACT: 3 multiply blobs (instanced): a wide faint body AO + one per foot from the pose's feet (PPL.feetOf: the lifted
  foot's blob fades), so the stance foot is anchored.
- LOD: beyond `lodM` (14 m) no proxies; the card reads the scene sun's own shadow map (which then has no self-shadow for
  it) and the private pass is not fitted round it.

## Crowd (`crowd.ts`)
All members in one atlas canvas (cell 220 px tall default, ~60 per 2048 atlas), one instanced draw, the far LOD
(scene sun map, no proxies), one shared probe at the crowd's centre, instanced contact blobs, redraw at <= `fps` (pure:
quantised draw time) and only when a member's key changes.

## Grass at the feet (`grass.ts`)
~1,250 instanced blades max on a world-fixed hashed grid (5.5 cm pitch, 2 per cell) within 0.62 m of the card's ground
point, 8-19 cm tall, fading to zero at the radius (no popping, no sliding). MeshStandardMaterial + ctx.windT wind,
`customProgramCacheKey = "cards:footGrass"`. When NATURE's lawn exists it does the field; this only thickens the feet.

## Adapters
`castCard` wraps `card` for every drawable of the clown film (imported read-only: cast_people / cast_crowd / cast_fx /
cast_fits / toon): it sets the 600 x 1000 design space, the native scale (1 unit = 2.16 mm), the redraw key (the pose
JSON), the feet for the contact blobs, and fills Pose.s / .c / .light from the card. The clown gets the 1/CLOWN_K card,
the pigeon a 0.34 card. Pose helpers: `phoneWalkPose`, `holdPose`, `crowdPoseAt`, `pathMetres`.

## Sandbox + proofs (`studio/src/sandboxes/kit_cards/`)
`KitCards.tsx` = a copy of the pilot pipeline (sub-frame accumulation, thin-lens DOF, N8AO, shafts, bloom, AgX, grade)
with a test KitCtx; `world_path.ts` = the pilot's campus set copied with the sun / fog as parameters and its cards
removed; `sets.ts` = a test interior (barred window + lamp) and a night street (sodium spot + moon). Run from studio/:
`COMP=KitCards ENTRY=src/sandboxes/kit_cards/index.ts PROPS='{"kc":{"st":"a","mb":8}}' bash scripts/stills_locked.sh out/kit_cards/x_ 30 1`
props kc: `st` a | b | c | d | e | f | walk | pilot | crowd | vscan, `mb` sub-frames, `dbg` 1-6 (card debug views:
visibility, normals, light, bulge, key only, fill only), `meas` (GPU timer log, multi-frame renders only), `nocards`,
`novis`, `freeze`, `flat` (form / rim / floor / ink off: a flat-card comparison), `top: [x, z]` (look down at the ground
light from 4.4 m), `bz` (b's position along the path). Outputs in `studio/out/kit_cards/`:
- `final_a_30.jpg` full golden sun (reverse angle on the pilot's sun patch) + a 14-member atlas crowd behind him
- `final_b_30.jpg` leaf dapple across his face (a sparse low branch 2.6 m toward the sun)
- `final_c_30.jpg` backlit in thick haze (the pilot's direction, fog 0.0125, shafts 0.0034)
- `final_d_30.jpg` interior: window-bar shadows across him, a warm floor lamp behind
- `final_e_30.jpg` night: sodium street lamp (spot, shadowed: his silhouette from the lamp), moonlight, a lit window
- `final_f_30.jpg` on the lawn: shoes sunk in blades
- `pilot_vs_kit_f100.jpg` the pilot's own frame 100 (its card) next to the same set + camera + acting with the kit card
- `walk_shade_to_sun_draft.mp4` (3 s, frames 15-104 of the pilot shot, 1 sub-frame, 540 x 960), `walk_strip.jpg`
- debug sheets: `cmp_b5dbg.jpg` (vis / light), `cmp_t9.jpg` (interior visibility: bars on the body), `vscan_30.jpg`

## Costs (measured 2026-11-19, GTX 1660 Ti via ANGLE / D3D11, 1080 x 1920 drawing buffer)
GPU = EXT_disjoint_timer_query_webgl2 around one sub-frame's scene render (RenderPass incl. shadow passes + N8AO + the
shaft / accumulation pass), the pilot's campus set, the pilot's walking phone guy (1500 px card), 30-frame runs, median:
| variant | GPU ms / sub-frame | reads as |
|---|---|---|
| no cards (`nocards`) | 17.3 | the set alone |
| hero card, drawing FROZEN (`freeze`: no redraw, no upload; private pass, card shading, proxy, blobs all on) | 17.6 | the card light itself: ~0.3 ms |
| hero card, private pass SKIPPED (`novis`), redrawn every sub-frame | 39.6 | |
| hero card, everything on, redrawn every sub-frame (the walk) | 62.2 (p10 44.7, p90 102.8); a 2nd run while another session used the GPU: 124.6 | timer queries count contention |
So the light / shadow side is nearly free (tight private frustum: < 1 ms); the cost is the DRAWING: the canvas redraw
(Skia on the GPU process) + its upload with mipmaps + the two blurred form fields, ~25-45 ms GPU per sub-frame for one
1500 px hero, noisy. CPU side per redraw (canvas commands + blurs, performance.now): 1.9-5 ms.
- Final (8 sub-frames, the drawing changes every sub-frame): ~0.35-0.5 s of GPU per frame for one hero; preview (1):
  ~0.06 s. Inside the speed budget (4 s / 0.6 s per frame) but the biggest card cost: pass a `key` that changes less often
  (e.g. quantise the pose time to 1/60 s) or a smaller `px` for mid / far figures.
- Probe captures: one-time per 1.5 m cell, ~70-450 ms each (6 x 16 px renders + a readback stall); a walker needs 4-8
  cells (0.2-2.5 s per render tab, once). `probe: "rig"` costs nothing.
- Draft still wall (stills_locked, 1 sub-frame, page start included): 8-20 s. 8-sub-frame full-res stills: 8-20 s.
- The walk draft (90 frames, 1 sub-frame, scale 0.5, 1 tab, x264): 48 s wall = 0.53 s / frame incl. bundle + encode.
- `gl.finish()` timings (the `sub-frame ... ms` numbers in the sandbox log) are NOT reliable on ANGLE: ignore them.

## Disk hazard found (2026-11-19 15:30)
C: hit 0 bytes free during this work: every Remotion `bundle()` (each `stills.mjs` / `render.mjs` call) copies the
whole `studio/public/` folder (now ~530 MB with the kit assets) into a new `../_remotion-tmp/remotion-webpack-bundle-*`
dir and nothing deletes it; 909 such dirs had piled up since Nov 14 (all sessions). I deleted only my own 43 (they hold
"kitcards build"), which freed 19.7 GB. The rest needs the lead's decision (old ones are safe to delete; a cached
bundle per entry, or a cleanup at the end of stills.mjs / render.mjs, would stop it).

## Honest gaps (2026-11-19)
- **Form shading is deliberately soft.** It reads in side / three-quarter sun (head and body get a terminator gradient)
  and in dapple; in flat frontal sun the card is still close to flat (by design: the flat cartoon colours stay
  readable). Thin parts get only limb-scale roundness. No painted normal maps per figure.
- **Cards do not shadow other near cards.** The private pass excludes every card (that is what removes the
  self-shadow), so two near characters never shadow each other; far cards (LOD / crowd) DO receive near cards'
  silhouettes through the scene sun map. A per-card exclusion (one map per card) would fix it at N x the pass cost.
- **Lamps are not occluded on the card.** Point / spot lights light the card with three's falloff + cone but no
  shadow test (a lamp behind a wall still lights him). Their proxies DO cast his shadow on the set.
- **Proxy silhouettes are the front drawing** turned square to each light: a profile walker casts a front-view
  silhouette (as in the pilot).
- **The probe is static per cell** (wind frozen, characters hidden) and costs ~250-350 ms per 1.5 m cell the first
  time a card stands there (6 renders + a GPU readback stall): ~1-2.5 s per render tab at start-up for a walker.
  Flickering practicals are not re-captured. `probe: "rig"` (CORE's ambient / bounce) is free but flat.
- **Haze in front of a card** is CORE's shafts pass (screen space); the card only reduces its own fog (fogK). A card in
  very thick backlit haze still lifts toward the haze colour (readable in the (c) still, not immune).
- **Rim** is a screen-space edge test (3.2 px at 1080): on cards under ~120 px tall it can flicker between frames.
- **Ink detection** is by colour distance to the cast's INK (#2c1e2a); near-black hair (#1c1820) is partly treated as
  ink (lit at the ink albedo: slightly lighter than its own albedo, harmless).
- **Night still (e):** the sodium proxy works (2 proxies: moon + lamp), but in this framing his lamp silhouette on the
  wall is not clearly legible, and sodium on the cream face reads very orange (keys keep their full colour; add a
  `keyTint` if that is too strong). **Walk:** walking out of canopy shade into a BACK sun changes his front only a little
  (physically right: his front stays in his own shade), the change reads through the rim, the warm reflector fill and his
  shadow appearing on the bricks; front / side suns show it much more (stills a, b, d).
- **Foot grass** is our own small tuft system (NATURE's grass did not exist yet); it does not bend away from the feet.
- Measuring: `gl.finish()`-based timings are NOT reliable on ANGLE / D3D11 (finish returns early); GPU numbers below come
  from EXT_disjoint_timer_query_webgl2 on multi-frame renders.

- 2026-11-19 22:55 (lead): crowd.ts quantises card time with Math.round (was floor). With the kit's centred shutter, floor put the early sub-frames on the previous drawing, so crowd cards double-exposed at final and were redrawn twice per frame (found by STATION; CAST fixed the same thing in its member cards). Also from CORE round 3: `ctx.sunCard` is null by default now (`Film.cardLight` = "off"); far cards and crowds fall back to `ctx.sun`.

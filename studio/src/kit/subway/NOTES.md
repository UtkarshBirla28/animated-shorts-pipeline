# kit/subway (NYC owner, "pointing" film): NOTES + API

PAUSED 17:45 (lead's second pause). None of my processes are running, and I hold no RAM token or stills slot.
DIAGNOSIS (17:43): frame 748 hangs every time. The set builds in 6.5 s, then the page's main thread blocks for over 243 s.
The likely cause is shader compile time. Each lit material in ny_station sees 18 lights (14 rect + 2 spot + 2 spill
rect). three.js unrolls each light loop (the rect loop per light), and on top of that come the surface POM loops. ANGLE's
D3D11 compile of programs that size takes minutes. The LocalEnv cube capture in the first update() is the first thing
that compiles them.
NEXT STEP (exact): in kit/subway/station.ts, the "lamp fixtures" section:
- Keep every fixture as an emissive diffuser (`diff` mesh, `diffOff`, never a light). Give the failing tube its OWN
  emissive mesh and material, scaled by `stutter()` in the set's update.
- Light the set with a few LONG rect practicals instead. The edge row (z 0.85) becomes 2 runs, [focus0 + 2, flickX - 0.7]
  and [flickX + 0.7, focus1], each with size [len, 0.2] and lumens = lm * len / 2.285. Add 1 small rect for the failing
  tube (that is `flicker`). The middle row (z 3.7) becomes 1 run, [focus0 + 4, focus1 - 2], with lumens = lm * len / 4.57.
- Keep the 2 shadowed key spots.
- In sets/ny_station.ts, make the window spill 1 rect (size [8, 0.85]) instead of 2.
That gives about 7 lights per material (ny_car already has 5). Then set `lampPos` for lampMotes from the fixture positions
(not the lights).
Then: run `bash /c/Users/utkar/AppData/Local/Temp/claude/e039aa327812b850/122d7bae-7fec-4ee7-9141-c86c2c37750e/scratchpad/nyc_stills.sh out/pointing/nyc/d2_ 748 draft`
(it waits until every .ts parses, then calls stills_locked with COMP=KitSubway and ENTRY=src/sandboxes/kit_subway/index.ts;
if the scratchpad is gone, call stills_locked by hand). If it still hangs, bisect (the env.capture call, then the cast
calls). Then render the draft stills of every framing: 712 and 748 (s10), 800 and 830 (s11), 850 and 903 (s12), 945, 968
and 1015 (s13). Then fix what they show, render 3 FINAL stills with "prof":true (748, 830, 945), run bible_validate, and
write the report.
Code state: kit/subway/{tex,mats,geo,train,station,tunnel,life}.ts, sets/ny_station(.cams).ts and sets/ny_car(.cams).ts
are written and typecheck clean (sandbox tsconfig + film tsconfig).

Status (2026-11-19 ~17:30): first build, written. The stills, costs and gaps are in the sections at the bottom.
Used by `studio/src/videos3/pointing/sets/ny_station.ts` (s10, s12, s13) and `sets/ny_car.ts` (s11). Test sandbox:
`studio/src/sandboxes/kit_subway/`: the two NY sets only, at the film's own frame numbers, without importing shots.ts:
`COMP=KitSubway ENTRY=src/sandboxes/kit_subway/index.ts PROPS='{"kit":{"quality":"draft"}}' bash scripts/stills_locked.sh out/pointing/nyc/d_ 712,800 0.5`

## Files
| file | what |
|---|---|
| `station.ts` | `nyStation(ctx, opts)`: a New York underground side platform + 2 tracks (see the header for everything in it) |
| `train.ts` | `nyCar(ctx, opts)`: one generic stainless R-type car (exterior + interior, doors, conductor's drop window); `nyTrain(ctx, opts)`: a consist; `CAR` dimensions |
| `tunnel.ts` | `nyTunnelWall(ctx, opts)`: the tunnel wall a stopped car opens onto (niche + caged bulb, cables, blue light, stencil) |
| `life.ts` | `stutter(t)` failing tube, `drips()` drops + ripples, `lampMotes()` lamp-lit dust, `ratCard()` the inked rat |
| `mats.ts` | `paintedSteel()` chipped gloss paint, `plain` / `metal` / `emissive` / `glass`, `LocalEnv` (cube capture -> PMREM envMap) |
| `tex.ts` | procedural CC0 PBR textures: `subwayTile()` 3 x 6 in running bond, `domeStrip()` US truncated domes, `boardForm()`, `swapSurf()`, canvas `zebraFace`, `posterTex`, `stencilTex`, `blobTex`, `ringTex` |
| `geo.ts` | `Parts` (merge per material key: rounded boxes with metre UVs, quads, cylinders, tubes, cables), `iSection`, `iBeam`, `rivets` |
No downloaded assets: every texture here is generated (ours, CC0 by construction); the bench / bin are kit props (NATURE).

## API
```ts
import { nyStation } from "../../../kit/subway/station";
import { nyTrain, nyCar, CAR } from "../../../kit/subway/train";
import { nyTunnelWall } from "../../../kit/subway/tunnel";
import { stutter, drips, lampMotes, ratCard } from "../../../kit/subway/life";
import { LocalEnv } from "../../../kit/subway/mats";
const st = await nyStation(ctx, { focus: [-14, 10], board: { x: 0, z: 0.95, y: 2.35 }, lens, lumens: 2000, kelvin: 3200 });
//   -> { object, lamps (rect practicals), lampPos, flicker (the failing tube's Practical), keySpot, keySpot2, board (Group, pivot at the hanger), props, colXs, colZ, D, CY, mats, envMats }
const train = await nyTrain(ctx, { cars: 4, condCar: 1, z: -0.12 - CAR.HW, selfLit: 0.5 });
//   train.place(x): the conductor's window centre at world x; train.cond.setWindow(0..1); car.setDoors(0..1); car.setIndicator(0..1)
const env = new LocalEnv(ctx.gl, new THREE.Vector3(0, 1.45, 1.0), 128); env.apply(...train.envMats, ...st.envMats);
//   in the first update(): env.capture(ctx.scene, [objects to leave out: train, cards, particles])
```
World frame of the station: tracks along X, platform top y 0, edge z 0, platform on +z to `depth` (5.6), ceiling 3.4;
track 1 centre z -1.63 (car side z -0.12), columns at x = +-2.285 + k 4.57 (z 1.75 on the platform, z -3.55 between the
tracks), far track wall z -7.4. Car local frame: x along the car, y up from the floor, +z = side A (opens).

## Facts used (web + general knowledge, 2026-11-19)
- The zebra board ("conductor indication board"): a wooden black-and-white board mid-platform, facing the train; when the
  train is berthed right it is directly in front of the conductor's window, and he points at it before opening the
  doors (Untapped Cities, Mental Floss, 6sqft). Conductors are seen pointing UP at it: hung overhead near the edge.
  Size and stripe direction are not in the sources: we keep the bible's 0.9 x 0.45 m, 10 cm vertical stripes.
- NYC B-division car: 60 ft (18.35 m) x ~10 ft (3.02 m), 4 double doors per side (~50 in openings), roof ~12 ft above
  the rail, platform level = car floor; the conductor works mid-train from a cab at a car end with a drop-down side
  window; amber door-indicator lights at the eaves; fluted stainless lower panels on the R-type family.
- Stations: white glazed 3 x 6 in tile in running bond, a coloured tile band (names omitted), riveted steel I-beam columns
  ~15 ft apart, low concrete ceilings with conduit, warm-white lamp rows (bible: warm LED, never green), yellow 24 in
  truncated-dome strip at the edge, standard gauge 1,435 mm, timber ties, third rail on the side away from the platform
  under a timber cover board; tunnels have blue lights over the emergency alarm / power-removal boxes.

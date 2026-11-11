# 06 — Cast, story timeline, camera and the Remotion composition

Slice: `templates/bridge/cast.ts`, `templates/bridge/story.ts`, `templates/bridge/Bridge.tsx`
(repo = `<ROOT>\repo`, read-only study copy of `mromidev/claude-animated-shorts`).

## Files read

| File | Lines | How much |
|---|---|---|
| `templates/bridge/cast.ts` | 473 | every line (slice) |
| `templates/bridge/story.ts` | 348 | every line (slice) |
| `templates/bridge/Bridge.tsx` | 116 | every line (slice) |
| `templates/bridge/toon.ts` | 909 | every line (the drawing code cast.ts calls) |
| `templates/bridge/world.ts` | 578 | every line (the code that calls `stage()`, `camAt()`, `bridgeState()`) |
| `templates/bridge/cardshade.ts` | 85 | every line (card material used by `Actor`) |
| `templates/bridge/lensblur.ts` | 139 | every line (DOF used by Bridge.tsx) |
| `templates/bridge/lights.ts` | 63 | every line |
| `templates/bridge/shade.ts` | 77 | every line |
| `templates/bridge/grade.ts` | 179 | lines 110-179 (GradeEffect, presets, `gradeFor`) + export list |
| `templates/bridge/ink.ts` | 393 | lines 1-40 and 215-393 (`NOINK`, `InkPass` class, `noInkFallback`) |
| `templates/sandbox_index_example.tsx` | 7 | every line (how the composition is registered) |
| `templates/SCRIPT_example.md` | 22 | every line (the voice script the timeline is cut to) |
| `templates/audio/timeline.py` | 169 | every line (Python mirror of story.ts) |
| `templates/audio/cues.md` | 442 | lines 1-60 |
| `templates/scripts/bridge_shots.py` | 19 | every line (parses story.ts) |
| `templates/scripts/bridge-stills.mjs` | 21 | every line |
| `templates/scripts/short_qa.py` | 78 | every line |
| `SKILL.md` | 166 | every line |
| `README.md` | 33 | every line |
| `references/reports/motion.md` | 435 | every line (camera + animation grammar the code implements) |
| `references/STYLE_BIBLE.md` | 44 | every line |
| `references/reports/characters.md` | 728 | lines 650-674 + keyword grep |

No images were opened for this slice.

---

## 0. The mental model in one page

- The whole film is a **pure function of (shot id, frame number)**. Nothing carries state from one frame to the next.
  Remotion may render frames out of order and in parallel browser tabs, so this rule matters.
- `story.ts` says **what happens when**: the shot list (frame ranges), "story time" `tau` per shot, the story physics
  (column position, bridge bounce, collapse), every camera key, impact shakes ("kicks"), the depth-of-field table and
  the foreground props.
- `cast.ts` says **who is on screen and in which pose**: for shot `id` at time `t` it returns a list of character
  "cards" (flat textured planes) and effect cards. Each card asks for a canvas drawing by a text key. A pool draws
  each distinct key once and shares the canvas texture.
- `toon.ts` does the actual Canvas2D drawing (heads, faces, bodies, hats, props, effects) in a 600 x 1000 "design space".
- `world.ts` (not in this slice) builds the 3D place and, every frame, poses the camera from `camAt()`, the bridge from
  `bridgeState()`, and places the cards from `stage()`.
- `Bridge.tsx` is the Remotion component: it mounts three.js through `@remotion/three` (`ThreeCanvas`), runs the
  post-processing chain (ink → lens blur → bloom + tone map + grade), and does crossfades and the white flash.

World axes (used by every number below):
- `+y` is up. The river runs along `x`. The bridge deck runs along `z` from -30 to +30 at height `D0 = 6.0` m.
- Towers at `z = ±27` (`HALF = 27`), stone columns at `x = ±3.35`. Anchorages behind the towers at `z = ±37`.
- Water surface `y = 0`. River bed `y = -0.6` (so the water is 0.6 m = "two feet" deep).
- The column marches from `+z` toward `-z` at 1.6 m/s. Most cameras sit at negative `z` and look toward `+z`.
  For such a camera, **screen-right is world `-x`** (this matters for mirroring and light).
- The park swing is far away at `PARK = [70, 6, -75]`.

---

## 1. `Bridge.tsx` — the Remotion composition (116 lines)

### 1.1 What the file exports
- `BRIDGE_FRAMES = TOTAL` (Bridge.tsx:23) = 2025 frames = 67.5 s at 30 fps.
- `BridgeShort` (Bridge.tsx:105) — the root component of the video.
- The composition itself is registered **outside this file**, in the user's Remotion project `src/Root.tsx`
  (or a sandbox `index.tsx`). The example (sandbox_index_example.tsx:6):
  ```tsx
  <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  ```
  - Size 1080 x 1920 (vertical 9:16). fps 30 is typed as a literal here and must equal `FPS = 30` in story.ts.
  - Final 2K render: `--scale 1.3333` gives 1440 x 2560 (SKILL.md:25, :76).

### 1.2 Mount sequence (top to bottom)
1. `BridgeShort` (Bridge.tsx:105-116)
   - `useKit()` (Bridge.tsx:42-47): calls `delayRender("bridge kit")` once, then `loadKit()` from world.ts
     (loads 26 Kenney `.glb` models from `public/bridge/kenney/*.glb`), then `continueRender`. Until the kit is
     loaded the component returns `null`.
   - White flash: `flash = f in [FLASH_AT, FLASH_AT+4) ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0` (Bridge.tsx:109).
     `FLASH_AT = 130`, so frames 130-133 get a white overlay at opacity 1 / .75 / .45 / .2.
   - Background `#cfe3f2` (light sky blue) on the outer `AbsoluteFill` (Bridge.tsx:111). Only visible if the canvas
     is transparent somewhere (normally the sky sphere covers everything).
   - `layersAt(f).map(...)` (Bridge.tsx:112): one `ShotView` per layer. React key `"base"` for the first layer,
     `"over"` for the second. So:
     - Normal frames: one canvas (`base`) with the current shot id.
     - Crossfade frames: `base` = previous shot at alpha 1, `over` = next shot at alpha < 1 (a second, brand-new
       ThreeCanvas with its own `World`).
     - After the fade, `base` simply switches its `id` prop to the new shot (same canvas, same World), and `over`
       unmounts.
2. `ShotView` (Bridge.tsx:96-103): `<AbsoluteFill style={{opacity: alpha}}>` around
   ```tsx
   <ThreeCanvas width={1080} height={1920} [dpr] shadows
     gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
     camera={{ fov: 40, near: 0.2, far: 1500 }}>
     <Inner id={id} kit={kit} />
   </ThreeCanvas>
   ```
   - `antialias: false` because anti-aliasing is done by the composer (MSAA 4).
   - `shadows` turns on three.js shadow maps (the sun casts 4096 x 4096 shadows, set in world.ts).
   - `dpr` is only forced when `getInputProps().post.dpr` is set (test stills only; Bridge.tsx:94-95).
     The comment says R3F clamps dpr to ≥ 1, so a `--scale 0.5` still still renders a 1080 x 1920 buffer.
3. `Inner` (Bridge.tsx:49-92) runs inside the R3F canvas:
   - `f = useCurrentFrame()`; `camera`, `scene` from `useThree()`.
   - `world = useMemo(() => new World(kit), [kit])` — the whole 3D place, built once per canvas.
   - `fx = useMemo(...)` (Bridge.tsx:55-62) creates the post effects once:
     - `ink: new InkPass(scene, camera)` — world ink lines (own Pass).
     - `lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 })` — two passes `lens.pre` and `lens.main`.
     - `bloom: makeBloom()`.
     - `tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })`.
     - `grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day)`.
     - `grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 })` — OFF by default (it quadrupled file size: 910 MB vs ~250 MB).
   - `useEffect(() => () => fx.ink.dispose(), [fx])` — only the ink pass is disposed on unmount.
   - Every render (= every frame) it does, in order (Bridge.tsx:75-85):
     1. `target.copy(world.update(id, f, cam, scene))` — poses camera, light, bridge, cast; returns the camera look point.
     2. `noInkFallback(world.root)` — safety net: puts any card-like mesh on the `NOINK` layer (layer 3).
     3. Depth of field: `d = dofAt(f)`; focus point = `d.focus(f)` or the look point; `fx.lens.focus = max(0.3,
        (focusPoint - cam.position) · cameraForward)` (distance along the view axis, metres); `fx.lens.cInf = d.cInf`.
     4. `gradeFor(fx.grade, SHOTS[id - 1].light)` — switches the grade preset when the light changes day ↔ golden.
     5. `fx.grain.seed = f` — deterministic grain per frame.
   - Returns `<primitive object={world.root} dispose={null} />` plus the composer.

### 1.3 Post-processing chain (Bridge.tsx:64-74)
```tsx
<EffectComposer multisampling={4}>
  {ink}  {lens.pre}  {lens.main}  {bloom}  {tone}  {grade}  {grain}
</EffectComposer>
```
- Order: **InkPass → lens pre (16 taps) → lens main (64 + 32 near taps) → bloom → NEUTRAL tone map → grade → (grain)**.
- `@react-three/postprocessing` merges neighbouring plain Effects into one EffectPass. The two lens effects are
  CONVOLUTION effects, so each gets its own pass. InkPass is a `Pass`, so it is always its own pass. Bloom + tone + grade
  (+ grain) end up as one merged EffectPass (header comment Bridge.tsx:3-4).
- Why this order (Bridge.tsx:5-7):
  - Ink before DOF: lines blur together with what they belong to. (SKILL.md gotcha: ink inside the merged DOF pass got
    overwritten.)
  - Bloom after DOF: glows defocus with their source.
  - Grade after tone mapping: the grade is "display-referred" (works on final screen values).
- Every pixel-sized parameter is given at 1080 x 1920 and scaled by `output height / 1920` (ink widths, lens CoC,
  bloom size, card rim, grain cell). So 0.5x stills and the 1440 x 2560 final match.
- A/B toggles for test stills (Bridge.tsx:26-27): `getInputProps().post = { ink, lens, pre, bloom, grade, grain, dpr }`.
  Defaults: everything `true` except `grain: false`. The tone map has no toggle (always on).

### 1.4 Bloom (Bridge.tsx:32-38)
```ts
new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2,
                  mipmapBlur: true, levels: 6, radius: 0.6 })
mip.setSize = (w, h) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
```
- Threshold 1.0 = only HDR emissive things bloom (the golden sun disc `Color(6.0, 4.4, 2.4)` in world.ts).
- ADD blend (the comment says SCREEN darkens values > 1).
- The `setSize` override makes the blur mip chain always start from a 1080 x 1920 basis (first level 540 x 960),
  whatever the real output size, so the glow has the same size relative to the frame (~30 px e-fold at 1080p).

### 1.5 Lens blur numbers used here (lensblur.ts)
- Circle-of-confusion radius (px at 1080 x 1920) = `cInf * |1 - focus / depth|`; ×`nearScale` (1.2) in front of the
  focus plane; clamped to `maxCoC` (24). `cInf < 0.25` = pass-through (sharp).
- `pre`: 16 taps, spread 0.287, rot 0.61. `main`: 64 taps, spread 0.958, 32 near-field taps.

### 1.6 Crossfades in practice
- A crossfade is two complete renders stacked with CSS opacity. Each layer has its own World, camera, sun, DOF and grade.
- The `over` canvas builds a **whole new World** (town, sight-line culling, textures) the first time it mounts.
  That is slow but happens only 6 times.
- `dofAt(f)` is keyed by frame only, so both layers use the same DOF row (see Bugs).

---

## 2. `story.ts` — the timeline (348 lines)

### 2.1 Constants (story.ts:5-13)
| Name | Value | Meaning |
|---|---|---|
| `FPS` | 30 | frames per second |
| `TOTAL` | 2025 | total frames = 67.5 s |
| `D0` | 6.0 | bank top + deck height (m) |
| `HALF` | 27 | towers at z = ±27 (span 54 m) |
| `FILES` | [-1.65, -0.55, 0.55, 1.65] | x of the 4 marching files ("four across") |
| `ROW_GAP` | 1.3 | metres between rows |
| `COUNT` | 74 | soldiers (19 rows; the last row has 2) |
| `PARK` | [70, D0, -75] | swing pivot base (x, ground y, z) |
| `V3` | `[number, number, number]` | type |

### 2.2 Easing helpers (story.ts:15-25, 99)
| Function | Formula | Used for |
|---|---|---|
| `clamp01(x)` | `max(0, min(1, x))` | everywhere |
| `smooth(x)` | smoothstep `u²(3 - 2u)` | soft ramps (DOF, hammer, swing amp, park step) |
| `easeOut(u)` | quartic `1 - (1 - u)⁴` | only the snapped cable end `snapEnd()` |
| `lin(pts, x)` | piecewise-linear table, clamps at both ends | `amp()`, `stomp()` |
| `glide(u)` | smootherstep `x³(x(6x - 15) + 10)` | **every camera glide** (symmetric ease-in-out) |

- Smootherstep peak speed = 1.875 × distance / duration (story.ts:89-90). Use it to size glides (see the guide).

### 2.3 Story physics (story.ts:27-40) — all functions of story time `tau` (seconds)
- `front(tau) = 26 - 1.6 * (tau - 4.4)`: z of the front row. z = 26 at tau 4.4, moving -z at 1.6 m/s.
  - At `SNAP` (34.62) the front row is at z = -22.35. The column stops at `SNAP + 0.3` (z = -22.83).
- `marchPhase(tau) = ((tau % 1) + 1) % 1`: 1 Hz cycle = 2 steps/s; footfalls at phase 0 and 0.5.
  - Step length = 1.6 m/s ÷ 2 steps/s = 0.8 m. This equals `stride 1` in toon.ts (370 design units × 0.00216 = 0.799 m).
- Event times: `SNAP = 34.62` (bolt snaps), `DROP0 = 36.35` (deck starts to fall), `DROP1 = 36.95` (deck hits the water).
- `amp(tau)` — bounce amplitude (m), linear table:
  `[14.85, 0] [17.8, .07] [21.4, .13] [27.4, .26] [33.0, .46] [SNAP, .55] [SNAP + .35, 0]`.
- `stomp(tau)` — how hard they stomp (multiplier): `[21.4, 1.0] [27.4, 1.35] [33, 1.5]` ("a little harder every step").
- `shapeZ(z) = cos(πz / (2·27))` for |z| < 27, else 0 — first bending mode of the deck (biggest in the middle).
- `dropW(z) = smooth((20 - z) / 26)` — 1 for z ≤ -6, 0 for z ≥ 20: how much of the drop each point of the deck takes.
- `dropU(tau)` — 0 before DROP0, then `((tau - DROP0) / 0.6)²` capped at 1 (falls like gravity in 0.6 s).
- `DROP_H = 6.6` — deck falls from y 6.0 to -0.6 (river bed).
- `BridgeState = { bounce, drop, snap, collapsed }`.
- `deckY(z, b) = D0 + b.bounce * shapeZ(z) - b.drop * DROP_H * dropW(z)`.

### 2.4 The shot list (story.ts:43-62)
`ShotDef = { id, a, b, light: "day"|"golden", crowd: "march"|"fall"|"water"|"bank"|"tourists"|"none", tau: (t) => number, towns?: boolean }`.
`a` = first frame, `b` = end frame (exclusive). `t` = video time in seconds = f / 30.

| id | a-b (frames) | seconds | light | crowd | tau | towns | voice line (SCRIPT_example.md) |
|---|---|---|---|---|---|---|---|
| 1 | 0-130 | 0.00-4.33 | day | march | `29.5 + t` (flash-forward to the climax) | | "Seventy-four soldiers knocked down an iron bridge just by walking across it." |
| 2 | 130-283 | 4.33-9.43 | day | march | t | yes | "It's 1831 ... pride of the whole town." |
| 3 | 283-444 | 9.43-14.80 | day | march | t | | "The men are marching home four across, every boot ..." |
| 4 | 444-534 | 14.80-17.80 | day | march | t | | "Halfway over, the bridge starts bouncing under their feet." |
| 5 | 534-643 | 17.80-21.43 | day | march | t | | "A normal person would slow down, but these guys think it's hilarious." |
| 6 | 643-823 | 21.43-27.43 | day | march | t | | "Somebody starts whistling ... a little harder every step." |
| 7 | 823-987 | 27.43-32.90 | day | march | t | | "The bounce gets bigger, the chains start groaning, and nobody wants to be the one who breaks step." |
| 8 | 987-1134 | 32.90-37.80 | day | fall | t | | "Then a single bolt snaps, and the whole end of the bridge drops into the river." |
| 9 | 1134-1212 | 37.80-40.40 | day | water | t | | "Luckily, the river was only two feet deep." |
| 10 | 1212-1303 | 40.40-43.43 | day | water | t | | "Unluckily, the river was only two feet deep." |
| 11 | 1303-1411 | 43.43-47.03 | golden | none | t | | "You see, every bridge has a rhythm it naturally likes to sway at." |
| 12 | 1411-1620 | 47.03-54.00 | golden | none (park) | t | | "Ever pushed a kid on a swing? ... higher and higher." |
| 13 | 1620-1735 | 54.00-57.83 | golden | march | `t - 31` (replay of tau 23-26.8) | | "Seventy-four men stepping together were pushing that bridge like a swing." |
| 14 | 1735-1863 | 57.83-62.10 | day | bank | t | | "Nobody died, but the army made a rule: never cross a bridge in step." |
| 15 | 1863-2025 | 62.10-67.50 | day | tourists | t | yes | "So now, the best drilled soldiers in the world cross every bridge like a crowd of tourists." |

- Shot ids must equal `index + 1`: code everywhere uses `SHOTS[id - 1]`.
- `tau` lets a shot show a different story moment from the video clock: shot 1 is a flash-forward (front row z -14.2 → -21.1
  with big bounce), shot 13 replays the march (front z -3.8 → -9.9) in golden light.
- `shotAt(f)` (story.ts:67) = the shot whose `[a, b)` contains f, else the last shot.

### 2.5 Crossfades and flash (story.ts:63-75)
- `XFADE = { 9: 6, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8 }` — crossfade length in frames at the START of those shots.
  Shots 3-8 and 10 start with hard cuts (or no visible cut: 9 → 10 share one camera).
- `FLASH_AT = 130` — the 4-frame white flash after the hook (start of shot 2). Covers the cut.
- `layersAt(f)`: if `f in [s.a - x/2, s.a + x/2)` → `[{id: s.id - 1, alpha: 1}, {id: s.id, alpha: (f - (s.a - x/2) + 1) / (x + 1)}]`.
  - x = 8: frames a-4 … a+3, alpha 1/9 … 8/9. x = 6: frames a-3 … a+2, alpha 1/7 … 6/7.
  - The previous shot is rendered a few frames past its `b`; the next shot a few frames before its `a`.
    So **camera keys of crossfaded shots start before `a`** (shot 9 key at 1128, shot 11 at 1295, 12 at 1405,
    13 at 1614, 14 at 1729, 15 at 1857; shot 2 at 126 under the flash).
  - It assumes the outgoing shot is `id - 1`.

### 2.6 Bridge state per shot (story.ts:77-86)
| Shots | bounce | drop | snap | collapsed |
|---|---|---|---|---|
| 9, 10, 14 | 0 | 1 | 1 | true |
| 11 (golden sway) | `0.75 * sin(2π · 0.7 · (t - 43.4))` (0.7 Hz, ±0.75 m) | 0 | 0 | false |
| 12, 15 (park, rebuilt bridge) | 0 | 0 | 0 | false |
| 8 | march bounce | `dropU(tau)` | `clamp01((tau - SNAP) / 0.7)` | `tau ≥ DROP1` |
| others (1-7, 13) | `-amp(tau) * cos(4π · marchPhase(tau))` | 0 | 0 | false |
- The march bounce is 2 Hz (once per step) and is lowest (deck dips) on every footfall.
- `collapsed` is never read by anything (dead field).

### 2.7 Camera system (story.ts:88-130)
Header grammar (story.ts:89-94), measured from the reference (motion.md):
- every move = symmetric smootherstep glide of 18-40 f; peak speed = 1.875 × distance / dur; dur ≥ 0.075 × (move in
  720p px) keeps the peak near the reference 14-25 px/f;
- a reframe bigger than ~half a frame width or 40 % zoom = hard cut on its key frame;
- glides are **centred on the old snap frame** (the word), so a glide key starts `dur/2` earlier; the sound whoosh peaks
  at that centre;
- holds push in: 0.15-0.35 %/f, ~0.6 %/f for ~35 f on punch words;
- rolls of 4-8° over ≥ 18 f on emphasis beats; held tilt ≤ 0.07 rad;
- impacts = 7-frame kicks that flip sign every frame; no hand-held float.

Types:
```ts
export type Cam = { pos: V3; look: V3; fov: number; roll: number };   // fov = vertical degrees, roll = radians
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key  = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
```
- `full(c)` fills defaults `fov 40, roll 0`.
- `mix(a, b, k)` — straight linear blend of pos, look, fov and roll.
- `run(keys, f)` (story.ts:105-113):
  ```ts
  let cur = full(keys[0].s(f));                 // first key is used even if f < keys[0].f
  for (const k of keys.slice(1)) { if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24))); }
  ```
  - A glide blends from the **live** previous framing to the **live** next framing. Both keep pushing in while blending.
  - Default glide length 24 f.
- `T(f) = f / 30`. `Fz(id, f) = front(SHOTS[id-1].tau(T(f)))` — z of the front row in that shot at that frame.
  March framings are written relative to `F`, so the camera **rides with the column** (a tracking shot).
- `pushK(f, f0, rate, punch = 0, n = 35)` (story.ts:117-122):
  - `s = rate * max(0, f - f0)`; if `punch > rate`, add `(punch - rate) * w(i)` for the first `min(x, n)` frames, where
    `w` ramps up over 8 f, holds, ramps down over the last 8 f (trapezoid). Returns `exp(-s)`.
  - Meaning: a factor < 1 that shrinks the camera distance (dolly) or `tan(fov/2)` (zoom), so the subject grows by about
    `rate` per frame. Example: rate 0.0025 = 0.25 %/f. Punch 0.006 for 35 f adds ~13 %.
- `dolly(pos, look, k, rest)` — camera slides toward the look point: `pos' = look + (pos - look) * k`.
- `zoom(pos, look, fov, k, rest)` — camera stays still; `fov' = 2·atan(tan(fov/2) · k)` (in degrees). Used when the lens
  sits next to towers, hangers or houses and must not move into them.
- `rolled(s, roll)` — same framing, different roll (for "roll through level" keys).
- `ANCHOR = [-2.7, D0 + 0.62, -37]` — near-left anchorage where the bolt lives.
- `snapEnd(snap)` — free end of the snapped backstay: `u = easeOut(snap)`,
  `[ANCHOR.x - 0.6u, ANCHOR.y + 5.5u - 2u², ANCHOR.z + 4.5u]` (whips up ~3.5 m and toward the bridge).

### 2.8 Every framing (story.ts:139-196)
`F` = `Fz(shot, f)`. All y values are absolute (D0 = 6). "push" = `pushK(f, f0, rate[, punch, n])`.

| Name | Kind | pos | look | fov | roll | push |
|---|---|---|---|---|---|---|
| S1a | dolly | [7.5, D0+2.6, F-13] | [0, D0+2.4, F+5] | 44 | 0 | (0, .0025) |
| S1b | dolly | [1.4, D0+1.4, F-7.2] | [0, D0+1.7, F+1.5] | 40 | -0.04 | (30, .002) |
| S1c | dolly | [-0.9, D0+0.4, F-4.2] | [0, D0+0.55, F+0.8] | 38 | +0.04 | (72, .003) |
| S2a | zoom | [17, 13, -52] | [0, 9, 4] | 44 | 0 | (126, .002) |
| S2b | zoom | [10, 10.5, -42] | [0, 8, 8] | 42 | 0 | (181, .002) |
| S2c | zoom | [5, 10, -31] | [0, 8.6, 30] | 40 | 0 | (237, .0015, punch .006, 35) "pride of the whole town" |
| S3a | dolly | [1.1, D0+1.45, F-6.2] | [0, D0+1.3, F+0.6] | 40 | 0 | (283, .0025) |
| S3b | dolly | [0.5, D0+0.36, F-3.5] | [0, D0+0.3, F+0.4] | 36 | 0 | (333, .0018) boots CU |
| S4a | dolly | [13, D0+2.4, F+7] | [0, D0+1.2, F+7] | 40 | 0 | (444, .002) side view |
| S4b | dolly | [9.5, D0+1.2, F+5.5] | [0, D0+0.95, F+5.5] | 38 | -0.035 | (497, .0015, punch .006, 30) |
| S5a | dolly | [0.3, D0+1.8, F-4.7] | [0, D0+1.55, F+1.2] | 38 | 0 | (534, .0025) |
| S5b | dolly | [-0.5, D0+1.7, F-3.5] | [0, D0+1.6, F+0.6] | 36 | +0.04 | (576, .002) |
| S6a | dolly | [0.8, D0+1.95, F-2.5] | [0.55, D0+1.85, F] | 34 | 0 | (643, .003) whistler CU (soldier i = 2) |
| S6b | dolly | [5.5, D0+5.5, F-9] | [0, D0+0.8, F+7] | 44 | -0.03 | (717, .002) high wide |
| S6c | zoom | [3, D0+1.1, F-6.2] | [0, D0+0.8, F+2] | 40 | +0.04 | (754, .003) lens 0.38 m outside the hangers |
| S7a | zoom | [-3.0, D0+1.4, F-11] | [0, D0+1.7, F+3] | 46 | -0.03 | (823, .002) |
| S7b | dolly | [-5.4, D0+4.6, F-2.0] | [-2.7, D0+3.4, F+2.5] | 40 | +0.02 | (871, .003) chain close-up |
| S7c | dolly | [0, D0+1.8, F-3.7] | [0, D0+1.75, F+0.3] | 36 | 0 | (925, .0025) nervous front row |
| S8a | dolly | [-2.35, D0+1.25, -38.9] | [-2.7, D0+0.92, -37] (anchor +0.3) | 34 | 0 | (987, .0025, punch .006, 35) "a single bolt" |
| S8b | custom | `u = glide((f-1039)/22)`: [0.9, D0+2.2+0.3u, -41.2-0.4u] | [-2.9-0.2u, ANCHOR.y+1.6+1.0u, -35+1.2u] | 38 | +0.04 | none (tilts up after the whip) |
| S8c | dolly | [4.5, 15, -45] | [0, 3.2, -14] | 42 | 0 | (1062, .0025) aerial |
| S8d | dolly | [7.5, 2.4, -25] | [0, 2.0, -17.5] | 44 | -0.04 | (1099, .002) down at the water |
| S9a | dolly | [1.5, 0.55, -24.6] | [0, 0.62, -18] | 40 | -0.03 | (1128, .0018) lens at face height, 3 m from row 1 |
| S10a | dolly | [0.9, 0.5, -24.2] | [0, 0.65, -19] | 37 | +0.04 | (1208, .0018) |
| S11a | zoom | [14, 10.5, -47] | [-1, 7, -4] | 40 | 0 | (1295, .0016) golden sway wide |
| S12a | dolly | [70.55, D0+1.5, -83] | [70.55, D0+1.75, -75] | 40 | 0 | (1405, .001) |
| S12b | dolly | [68.4, D0+1.9, -84.5] | [70.4, D0+1.95, -75] | 42 | 0 | (1546, .0015) 3/4 from the parent's side |
| S13a | dolly | [5.75, D0+2.45, F+3.1] | [0, D0+1.5, F+6.5] | 44 | 0 | (1614, .002) 3/4 from ahead |
| S13b | dolly | [4.8, D0+2.45, F+4] | [0, D0+1.3, F+4] | 40 | 0 | (1685, .0025) |
| S14a | dolly | [-4.7, D0+1.5, -40.4] | [-4.6, D0+0.85, -33] | 42 | 0 | (1729, .002) dazed soldiers |
| S14b | zoom | [1.3, D0+1.6, -36.6] | [2.9, D0+1.3, -31.2] | 42 | 0 | (1770, .0025, punch .004, 24) officer |
| S15a | dolly | [1.7, D0+1.75, -15.5] | [0, D0+1.5, -9] | 40 | 0 | (1857, .0025) |
| S15b | dolly | [-1.3, D0+1.6, -13] | [0, D0+1.5, -7.5] | 38 | 0 | (1890, .0015, punch .006, 32) "best drilled" |
| S15c | crane | quadratic Bezier from `S15b(1932).pos` via C=[0, 18, -16] to B=[17, 15, -44] | lerp from `S15b(1932).look` to L=[0, 7, 2] | 38 → 44 | 0 | `s = glide((f-1932)/93)` |

Notes:
- S13 comment: lens ~2.45 m over the deck and 3-4 m outside the rail, so the near rail crosses legs, not torsos.
- S15c: the crane starts exactly where S15b is at 1932 (so the "cut" there is seamless) and ends at frame 2025 (the last
  frame); the fastest point is ~1978, the sound whoosh is at 1962.

### 2.9 The camera keys per shot (story.ts:198-262) with their word cues (from the code comments)
| Shot | Keys `{f, dur, cut}` → framing | Cue |
|---|---|---|
| 1 | 0 → S1a; 30 dur 37 → S1b; 72 dur 32 → S1c | glides centred on 48 ("knock down") and 88 ("just"); roll -0.04 → +0.04 (4.6°) |
| 2 | 126 → S2a; 181 dur 18 → S2b; 237 dur 18 → S2c | centred 190 and 246; S2c punch on "pride of the whole town" |
| 3 | 283 → S3a (cut); 333 dur 40 → S3b | centred on 353 "every boot" |
| 4 | 444 → S4a (cut "Halfway"); 497 cut → S4b ("bouncing"); 497 dur 20 → `rolled(S4b, 0.035)` | roll -0.035 → +0.035 (4°) through level |
| 5 | 534 → S5a (cut "A normal person"); 576 dur 18 → S5b; 600 dur 20 → `rolled(S5b, -0.035)` | centred 585; "think it's hilarious" roll back 4.3° |
| 6 | 643 → S6a (cut, whistler); 717 cut → S6b ("whole column"); 754 dur 29 → S6c | centred 768 "a little harder every step" |
| 7 | 823 → S7a ("The bounce gets bigger"); 871 cut → S7b ("chains"); 925 cut → S7c ("nobody") | |
| 8 | 987 → S8a (bolt); 1039 cut → S8b (snap + kick); 1062 cut → S8c (aerial); 1099 cut → S8d ("drops", kick at the slam) | |
| 9 & 10 | 1128 → S9a; 1208 dur 18 → S10a | `CAMS[10] = CAMS[9]`: no visible cut at 1212; centred 1217 "Unluckily" |
| 11 | 1295 → S11a | one push-in |
| 12 | 1405 → S12a; 1546 dur 28 → S12b | centred 1560 "higher and higher" (pull-back) |
| 13 | 1614 → S13a; 1685 cut → S13b | "pushing" |
| 14 | 1729 → S14a; 1770 cut → S14b | cut to the officer; kicks on the 3 hammer blows |
| 15 | 1857 → S15a; 1890 dur 30 → S15b; 1932 cut → S15c | centred 1905 "best drilled"; crane to the end |

### 2.10 Impact kicks (story.ts:264-282)
```ts
const KICKS: [number, number][] = [[SNAP, 1], [DROP1, 1.6], [59.79, 0.5], [60.33, 0.5], [61.69, 0.7]];  // [time s, gain]
kickAt(t): n = floor((t - t0) * 30 + 1e-6); if 0 <= n < 7: a += g * (n odd ? -1 : +1) * (1 - n/7)^1.5
```
- Starts on the first frame at/after the event, flips sign every frame, gone after 7 frames.
- `camAt(id, f)`: `c = run(CAMS[id], f)`; if `a != 0`, shift the look point sideways (horizontal, perpendicular to the view)
  by `m = (3/640) · tan(fov/2) · L · a` metres (L = look distance) — that is 3 px at 720p per unit gain — and up by `0.6 m`;
  add `a · 0.004` rad to roll (~0.23° per unit).
- The last three kick times duplicate `HITS` in cast.ts (hammer blows). They are typed twice by hand.

### 2.11 `keyEnd(id, f)` (story.ts:283-288)
- Returns the frame where the current key's move finishes: `k.f + (cut ? 0 : dur ?? 24)`, at least f.
- Meant (motion.md 5.1e) to pick billboard front/side views per key instead of per frame. **It is exported but never used.**

### 2.12 Depth of field table (story.ts:290-327)
`Dof = { f, dur?, cInf, focus?: (f) => V3 }`. `cInf` = blur radius in px at 1080 x 1920 for things at infinity
(0 = sharp). Rows switch on cuts (no `dur`) or ramp linearly from the previous row over `dur` frames (same f/dur as a glide).
`focus` missing = the camera look point.
Helpers: `eyes(id) = [0, D0 + 1.6, Fz(id, f)]`, `boots(id) = [0, D0 + 0.3, Fz(id, f)]` (front row).

| f | dur | cInf | focus | Comment |
|---|---|---|---|---|
| 0 | | 15 | eyes(1) | hook wide |
| 30 | 37 | 15 | eyes(1) | eye-level MS |
| 72 | 32 | 15 | boots(1) | boot level |
| 130 | | 0 | | town aerial |
| 333 | 40 | 14 | boots(3) | boots CU (ramps with the glide) |
| 444 | | 0 | | side views |
| 534 | | 10 | eyes(5) | MS faces |
| 576 | 18 | 12 | eyes(5) | closer MS |
| 643 | | 14 | look | whistler CU |
| 717 | | 0 | | high wide … chain close-up |
| 925 | | 12 | eyes(7) | MS "nobody" |
| 987 | | 14 | look | bolt insert |
| 1039 | | 10 | look | snap insert |
| 1062 | | 0 | | aerial + water drop |
| 1134 | | 16 | [0.6, 0.6, -21.6] | river sitters (shots 9-10) |
| 1303 | | 5 | look | golden sway |
| 1411 | | 7 | look | park |
| 1620 | | 0 | | golden march |
| 1735 | | 8 | look | bank (cart in front) |
| 1770 | | 12 | [3.35, D0+1.6, -31.55] | officer's eyes |
| 1863 | | 0 | | tourists + crane |

- `dofAt(f)`: finds the last row with `f ≥ row.f`; `cInf = prev.cInf + (row.cInf - prev.cInf) · min(1, (f - row.f)/dur)`;
  `focus` = the row's focus with **no ramp** (switches instantly).
- `focusAt(id, f)` — exported helper; Bridge.tsx does the same thing itself, so it is unused.
- SKILL.md target: DOF on about 1/3 of screen time; CU 12-16, MS 10-12, wides 0.

### 2.13 Foreground props (story.ts:334-348)
`Fg = { a, b, kit, pos, s?, yaw? }` — a Kenney model shown while `a ≤ f < b`, base at `pos`, height `s` m.
| a-b | kit | pos | s | yaw | Use |
|---|---|---|---|---|---|
| 1735-1770 | `cart` | [-3.8, D0, -38.0] | 0.85 | 0.6 | bottom-left corner of S14a (~2.6 m from the lens) |
| 1411-1620 | `plant_bushDetailed` | [69.65, D0, -79.4] | 1.2 | 0.4 | bottom-right of the park shots |
- Rules in the comments: 0.3-0.5 × focus distance; cover 10-25 % of one frame edge; never a face; must stay inside ONE shot
  (world.ts hides an entry outside its own shot, so crossfade layers never show it); they skip the sight-line culler.
- Kenney bushes are sparse: size was fitted with an ellipsoid at 0.55 × bounding-box width.

---

## 3. Voice word ↔ frame map (reconstructed from code comments)

The picture code **never reads `words.json`**. Every time below was copied by hand from the hand-fixed `words.json`
(story.ts:1 points to `~/bridge-short/voice/words.json`). Only the audio mix (`mix.py`) reads words.json (for ducking).
frame = round(seconds × 30). "(inferred)" = not stated in a comment.

| Frame | Seconds | Word / event | Used in |
|---|---|---|---|
| 0 | 0.00 | "Seventy-four soldiers…" | shot 1 |
| 48 | 1.60 | "knock(ed) down" | S1b glide centre |
| 88 | 2.93 | "just" | S1c glide centre |
| 130 | 4.33 | "It's 1831…" | shot 2 + white flash |
| 240 | 8.01 | "pride of the whole town" | townsfolk cheer window starts (CHEER) |
| 283 | 9.43 | "The men are marching…" | shot 3 |
| 353 | 11.77 | "every boot" | S3b centre |
| 444 | 14.80 | "Halfway" | shot 4 |
| 485 | 16.17 | (inferred "starts") | soldiers shock/nervous swap |
| 497 | 16.57 | "bouncing" | cut S4b + roll |
| 519 | 17.30 | (inferred end of sentence) | back to neutral |
| 534 | 17.80 | "A normal person" | shot 5 |
| 584 | 19.48 | (inferred "but these guys") | grin swap |
| 600-618 | 20.0-20.6 | "think it's hilarious" | roll back; laugh swap at 20.6 |
| 643 | 21.43 | "Somebody starts whistling" | shot 6 |
| 657 | 21.90 | whistling starts | soldier 2 whistles, notes clock |
| 711 | 23.70 | (inferred "whole column stomps") | more whistlers + laughs |
| 717 | 23.90 | "whole column" | cut S6b |
| 768 | 25.60 | "a little harder every step" | S6c centre |
| 823 | 27.43 | "The bounce gets bigger" | shot 7 |
| 867 | 28.90 | chain creak marks start | world.ts |
| 871 | 29.03 | "chains" | cut S7b |
| 882 / 918 | 29.40 / 30.60 | (inferred "groaning" / "nobody wants") | nervous swaps, look left |
| 925 | 30.83 | "nobody" | cut S7c |
| 987 | 32.90 | "Then a single bolt" | shot 8; bolt creak from 33.1 s |
| 1039 | 34.63 | "snaps" (SNAP 34.62) | cut S8b, kick 1, burst |
| 1062 | 35.40 | aerial | cut S8c |
| 1090.5 | 36.35 | DROP0 | deck starts falling |
| 1099 | 36.63 | "drops" | cut S8d |
| 1108.5 | 36.95 | DROP1 | slam, kick 1.6, splashes |
| 1134 | 37.80 | "Luckily…" | shot 9 |
| 1212 / 1217 | 40.40 / 40.57 | "Unluckily" | shot 10 / S10a centre |
| 1303 | 43.43 | "You see, every bridge…" | shot 11; sway clock t0 = 43.4 |
| 1411 | 47.03 | "Ever pushed a kid…" | shot 12 |
| 1464 | 48.79 | first push (`PUSH0`) | swing |
| 1560 | 52.00 | "higher and higher" | S12b centre |
| 1620 | 54.00 | "Seventy-four men stepping…" | shot 13 |
| 1685 | 56.17 | "pushing" | cut S13b |
| 1735 | 57.83 | "Nobody died…" | shot 14 |
| 1770 | 59.00 | cut to the officer | S14b |
| 1794 / 1810 / 1851 | 59.79 / 60.33 / 61.69 | "rule" / "Never" / "step" (music.py cue) | hammer blows, kicks, bursts |
| 1863 | 62.10 | "So now, the best drilled…" | shot 15; tourists clock t0 = 62.08 |
| 1905 | 63.50 | "best drilled" | S15b centre |
| 1932 / 1962 | 64.40 / 65.40 | crane start / whoosh | S15c |
| 1979 | 65.96 | "like a crowd of tourists" | CHEER window 2 |
| 2025 | 67.50 | end | TOTAL |

---

## 4. `cast.ts` — characters and effect cards (473 lines)

### 4.1 Imports and contracts (cast.ts:6-17)
- From toon.ts: `Pen`, `bodyFront`, `bodySide`, `swingKid`, `soldier`, `townsfolk`, `OFFICER`, `KID`, `PARENT`, effects
  `fxNote, fxBurst, fxSplash, fxStars, fxCreak, fxRing, fxBlob (unused), fxShadow, fxContact, fxPlank, fxDrum`,
  types `Outfit, Expr, FrontOpts, SideOpts`.
- From story.ts: `FPS, D0, FILES, ROW_GAP, COUNT, PARK, SHOTS, SNAP, DROP0, DROP1, DROP_H, V3, front, marchPhase, stomp,
  deckY, dropW, dropU, shapeZ, smooth, clamp01, BridgeState`.
- `LIGHTS` (imported, not used directly), `NOINK` (layer 3) from ink.ts, `cardShade, blobMaterial, CARD_K` from cardshade.ts.
- Header (cast.ts:1-5): characters are **yaw-only billboards** (they turn around the vertical axis only, to face the
  camera), shaded by `cardShade()`; standing ones get a soft multiply contact blob; effects are unlit cards; cards,
  effects and blobs live on layer `NOINK` so the world ink pass never outlines their rectangles.

### 4.2 Canvas pool (cast.ts:19-57)
- `Entry = { cv: canvas, tex: CanvasTexture, w, h }`. `makeEntry(w, h)`: new canvas, `tex.colorSpace = SRGBColorSpace`,
  `anisotropy = 8`.
- `Req = { key, w, h, k, draw, tex? }`.
- `Pool.req(key, w, h, k, draw)`: stores a request with full key `` `${w}x${h}|${key}` `` (so size is part of the key).
- `Pool.flush()` once per frame (called by world.ts after all requests):
  1. groups requests by key;
  2. any live entry not wanted this frame moves to the `free` list;
  3. for each wanted key with no live entry: reuse a free entry of the same w x h or make a new one; clear it;
     `setTransform(k, 0, 0, k, 0, 0)` (scale design units to pixels); `draw(new Pen(g))`; `tex.needsUpdate = true`;
  4. every request with that key gets the same `tex`.
- Effect: 74 marching soldiers in step share a few canvases (header: 7 head shapes × 4 outfits). A drawing is redrawn
  only when its key changes. Free canvases are kept forever (never disposed).

### 4.3 Card meshes (cast.ts:59-110)
- `blank` = 2 x 2 canvas texture. Every material starts with `map: blank` so the shader always compiles with
  `USE_MAP` (swapping maps later never needs a recompile).
- `SU = 0.00216` m per design unit (1000 units = 2.16 m). `SU_SWING = 2.3 / 1830` (swing canvas: rope of 1830 units = 2.3 m).
- `BODY` geometry: `PlaneGeometry(600·SU, 1000·SU)` = 1.296 m × 2.16 m, translated up by `(975 - 500)·SU`, so design
  y = 975 (the soles) sits at the mesh origin. **Put a card at a ground point and its feet stand there.**
- `CARD` = unit plane for effects (scaled to `w × h` metres).
- `ROOTS` — every parent that holds actors (used to find the scene's sun).
- `class Actor` (cast.ts:70-86):
  - material `cardShade(new MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: DoubleSide }))`; `alphaToCoverage = false`
    (A2C + MSAA left 1 px seams on blurred far cards).
  - `customDepthMaterial` = `MeshDepthMaterial({ depthPacking: RGBADepthPacking, map, alphaTest: 0.5 })` so shadows have
    the character's cut-out shape.
  - `onBeforeRender` sets `CARD_K.uPx = renderTarget.height / 1920` (golden rim width in output pixels).
  - `castShadow = false` (world.ts turns it on in golden light), `receiveShadow = true`, `rotation.order = "YXZ"`
    (yaw first, then roll), `renderOrder = 1`, `layers.set(NOINK)`.
  - `bind()` puts the pooled texture into both materials.
- `class Fx` (cast.ts:88-110): three materials:
  - `mat` — unlit `MeshBasicMaterial`, `alphaTest 0.5` (hard cut-out ink drawings);
  - `soft` — transparent, `depthWrite: false` (dust/mist) — **never used in the bridge** (no FxPlace sets `soft`);
  - `blob` — `blobMaterial()`: multiply blend (`dst × src`), no depth write, no fog, `polygonOffset -2`.
  - `bind()`: if the key contains `"|blob|"`, switch to the blob material, turn **mipmaps off** (at grazing angles the
    mip chain averaged the blob with its white surround and it faded), `renderOrder 0.5`. Otherwise `renderOrder 0`.
- Draw order in the opaque list: world (0) → blobs (0.5) → character cards (1).

### 4.4 Placement types (cast.ts:112-119, 225)
```ts
Place   = { key, draw, x, y, z, scale?, mirror?, yaw?, geo?: "body" | "swing", roll?, size?: [w, h, k] };
FxPlace = { key, cw, ch, draw, x, y, z, w, h, flat?, rot?, soft? };   // cw x ch canvas px; w x h metres
CamInfo = { pos: Vector3; right: Vector3; sun?: Vector3 };             // right = camera screen-right in world space
Stage   = { places: Place[]; fx: FxPlace[] };
```

### 4.5 Small helpers (cast.ts:121-131)
- `hh(i, s)` = fract(sin(i·127.1 + s·311.7) · 43758.5453) — deterministic random in [0, 1). The same hash exists in
  toon.ts (`rnd`) and timeline.py (`hh`), so audio can reproduce per-soldier values.
- `q(v, n = 120)` — round to 1/n (keeps the number of distinct texture keys small).
- `SOLDIER[v] = soldier(v)`, `BARE[v] = soldier(v, { hat: null })` (v = 0-3), `FOLK[v] = townsfolk(v)` (v = 0-5).
- `vOf(i) = (i·7 + (i >> 2)) % 4` — outfit variant per soldier. `seedOf(i) = ((i·5 + 3) % 7) + 1` — head-shape seed 1-7.
- `tier(d)` — texture size by distance `d` (m, divided by the card scale), "sized for the 1440 x 2560 final":

| distance d | canvas | design scale k |
|---|---|---|
| < 3.2 m | 1800 x 3000 | 3.0 |
| < 6.5 m | 1080 x 1800 | 1.8 |
| < 16 m | 480 x 800 | 0.8 |
| ≥ 16 m | 240 x 400 | 0.4 |

### 4.6 Light direction for the painted drawings (cast.ts:133-159)
- `SUN` (module global) starts as `normalize(0.5, 0.75, -0.4)` and is overwritten every `stage()` call by `findSun()`.
- `findSun(cam, out)`: if `cam.sun` is given use it (world.ts never gives it). Otherwise search all `ROOTS` that are
  attached to a scene, take each root's shadow-casting `DirectionalLight`, and pick the one whose target lies closest to
  this camera's view axis (`|d · right| / |d|`). Direction = `light.position - light.target.position`. (Hack so two worlds
  in a crossfade each find their own sun; the own sun always wins because its target IS this camera's look point.)
- `light2D(cam, mirror)`: `sx = SUN · cam.right × (mirror ? -1 : 1)`, `sy = -SUN.y`; returns `atan2(sy, sx)` rounded to
  45° steps = the canvas angle the light comes FROM (canvas y points down). 45° steps keep the texture cache small.
  This angle drives the painted crescent (`shadedFill`/`gradFill`) and the thick side of the outline (`thickAngle`).
- `LNAME` (module global) = current shot light "day"/"golden", set in `stage()`.

### 4.7 Turning: front vs side view and mirroring (cast.ts:161-166)
```ts
viewOf(cam, x, z, dx, dz):                  // (dx, dz) = walking direction
  c = cos(angle between walk direction and the direction to the camera)
  side   = c < 0.57                         // camera more than ~55° off the walker's front → side view
  mirror = (dx·right.x + dz·right.z) < 0    // walking toward screen-left → flip the side drawing (it faces screen-right)
  fs     = round(sqrt(1 - c²) · 20) / 20     // stride foreshortening (sin of the angle), in 0.05 steps
```
- There is no back view and no in-between turn: the swap front ↔ side and the mirror flip happen in one frame
  (the reference turns in 1-4 f, motion.md:128). With `keyEnd` unused, a swap can happen in the middle of a glide.
- Mirroring is done on the mesh (`scale.x = -1`), not in the drawing, so mirrored and plain soldiers share a canvas;
  only the light angle is flipped (`light2D(cam, true)`).
- Falling and sitting soldiers always use the front view.

### 4.8 Life: blinks and reaction timing (cast.ts:168-186)
- `LEAD = 2 / FPS` (2 frames): expression and action changes land 0-3 f **before** the word (reference measurement).
- `LID = [0.5, 1, 1, 0.5]` — a blink lasts 4 frames: half / shut / shut / half.
- `SWAPS` — times (s) of planned expression swaps per shot: `{4: [16.17, 17.3], 5: [19.48, 20.6], 6: [21.9, 23.7],
  7: [29.4, 30.6], 8: [SNAP]}`.
- `lidAt(t, i, swaps = [])` (returns 0 open … 1 shut):
  1. `f = round(t · 30)`. For each swap: `k = f - round((ts - LEAD) · 30) + 1`; if `0 ≤ k < 4` return `LID[k]`.
     So the blink starts 1 frame before the swap frame and the two shut frames hide the face change.
  2. Otherwise natural blinks: start `s = round(-60 · hh(i, 9))` frames, then repeatedly `s += round(15 + 54 · hh(i·31 + n, 13))`
     (gaps 15-69 f = 0.5-2.3 s, up to 400 blinks); return `LID[f - s]` inside a blink.
- `fkey(o)` = `JSON.stringify` with every number rounded to 1/120 — turns pose options into the texture key.
- In toon.ts a lid value becomes an eye shape: `lid ≥ 1` → "dash" (closed line) except happy/squeeze/spiral eyes, which
  never close; `0 < lid < 1` → half-lid variants (dot/small → lid, lid → slit, shock → shockHalf).

### 4.9 `person()` — one character card (cast.ts:188-201)
```ts
type Who = { i: number; o: Outfit; okey: string };   // okey MUST uniquely name the outfit (it is in the texture key)
person(cam, who, x, y, z, view, fo: FrontOpts, so: SideOpts, scale = 1):
  d = |cam.pos - (x, y + 1.2, z)| / scale;  [w, h, k] = tier(d)
  mirror = view.side && view.mirror;  light = light2D(cam, mirror);  seed = seedOf(who.i)
  key = view.side ? `S|${okey}|${fkey({...so, light, seed})}` : `F|${okey}|${fkey({...fo, light, seed})}`
  draw = side ? bodySide(p, o, s2) : bodyFront(p, o, f2);  size = [w, h, k]
```
- Returns also `tierKey` (never read).

### 4.10 Ground shadows (cast.ts:203-222)
- `CONTACT = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] }` (linear multiply ratios, blue-violet);
  `TAIL = [0.42, 0.44, 0.62]`.
- `hexOf(c, k)` = sRGB hex of `1 - (1 - v)·k` (k < 1 = lighter). Computed values: contact day `#7c7e9b`, golden `#867c9b`,
  tail `#adb1ce`; `WATERLINE = hexOf([0.3, 0.36, 0.52], 1)` = `#95a2bf`.
- `blob(out, x, y, z, sc = 1, k = 1)`:
  - direction away from the sun on the ground `(ox, oz)`; `rot = atan2(-ox, -oz)` (canvas top points away from the sun).
  - **Day only** (cards cast no real shadow by day): a soft tail card `blob|shadow|<hex>` 128 x 256 (`fxShadow`):
    `len = clamp(1.6 / tan(elevation), 0.5, 2.4) · sc`, `h = len + 0.55·sc`, offset `c = 0.3·h` away from the sun
    (feet at v = 0.2 of the card), `w = 0.72·sc`, at `y + 0.018`, flat.
  - Always: a tight contact pool `blob|contact|<hex>` 128 x 128 (`fxContact`), `w = 0.52·sc`, `h = 0.4·sc`, at `y + 0.022`,
    offset 3 cm from the sun.
  - Golden light: no tail, because world.ts turns on real card shadows (`L.actorShadow`).

### 4.11 Expressions of the marching column per shot — `exprMarch(id, t, i, tau)` (cast.ts:227-239)
`lau = i % 3 == 0` (laughers), `whi = i % 5 == 1` (whistlers), `L = LEAD`. Returns `{ expr, look }` (look -1 = eyes left).
| Shot | Rule |
|---|---|
| 1 | lau → laugh; whi → whistle; else grin |
| 2, 3 | i%4==3 → smile_closed; odd → neutral; else stern |
| 4 | t < 16.17-L: odd neutral / even stern; t < 17.3-L: lau shock / others nervous; then neutral |
| 5 | t < 19.48-L neutral; t < 20.6-L grin; then odd laugh / even grin |
| 6 | whistle if (i == 2 and t > 21.9-L) or (t > 23.7-L and i%4 == 1); else laugh if t > 23.7-L and lau; else grin |
| 7 | t < 29.4-L: lau laugh / grin; t < 30.6-L: odd nervous / even grin, look -1; then nervous |
| 8 | tau < SNAP-L nervous, else shock; look -1 while tau < SNAP + 0.6 (looking at the bolt) |
| default (13) | whi → whistle, else grin |

### 4.12 The marching column — `column(id, t, b, cam, out)` (cast.ts:241-284), shots 1-8 and 13
- `tau = s.tau(t)`; in shot 8 the walk clock stops at `SNAP + 0.3`. `F = front(walkT)`, `ph = marchPhase(walkT)`,
  `st = stomp(tau)`. `falling = id == 8 && tau ≥ DROP0`.
- For `i = 0 … 73`: `row = i >> 2`; `x0 = FILES[i & 3] ± 0.04` jitter; `z = F + row·1.3 ± 0.05`;
  `y = |z| ≤ 30 ? deckY(z, b) : D0` (on the deck, or on the bank road).
- Mode: `"stand"` in shot 8 from `SNAP + 0.25`, else `"march"`.
- Falling (shot 8, tau ≥ DROP0): soldiers lag the deck by 0.13 s (`lagY = D0 + bounce·shapeZ - dropU(tau - 0.13)·6.6·dropW`,
  `y = max(deck, lagY)` = cartoon hang time); x spreads by `(hh(i,3) - 0.5)·0.7·u`; mode `"fall"` until `DROP1 + 0.13`, then
  `"sit"`; tilt `(hh(i,4) - 0.5)·50·u` degrees while falling; sitting expression: `i % 3 ? "dazed" : "shock"`.
- `view = viewOf(cam, x, z, 0, -1)` (walking -z); fall/sit force the front view.
- `blink = expr != "whistle" ? lidAt(t, i, SWAPS[id]) : 0`.
- Front options: `{ phase (march only), expr, mode, look, blink, lift: 60·st, tilt }`.
- Side options: `{ phase, expr, mode: march | stand, blink, stomp: st, stride: view.fs }` — stride 1 = 0.8 m steps at
  2 steps/s, so the stance foot keeps pace with the column (no skating), shortened by the view angle.
- Contact blob for march/stand.
- Whistled notes (cast.ts:272-282): for whistlers in shots 6, 1, 13 within 16 m of the camera, 4 notes each:
  `age = ((t - 21.9 + n·0.42 + hh(i,5)) % 1.68) / 1.68`; pop-in over the first 1/7, fade over the last 18 %;
  position `x + right·(0.16 + 0.32·age + 0.05·sin)`, `y + 1.5 + 0.85·age`, `z - 0.1`; size `0.17 × 0.2 m × pop`;
  key `note0`/`note1`, canvas 220 x 260. (Shot 1 never shows notes — see Bugs.)

### 4.13 Sitters — `sitters(cam, t, out, spots, exprs, stars, water)` (cast.ts:286-307)
- Every 3rd sitter (`i % 3 == 1`) is bare-headed (`BARE`), outfit variant `vOf(i + 3)`.
- Water bob `0.03·sin(2.2t + i)` m. Front view, mode `"sit"`, `blink = lidAt(t, i)` (no swap list), look 0.
- Stars (`fxStars`, 420 x 210, 0.75 × 0.375 m, 1.3 m above): circling, `u = (0.9t + hh(i)) % 1`.
- In water: an expanding ring (`fxRing`, 600 x 600, 2 × 2 m, flat at y 0.03), a darker waterline blob (`WATERLINE`,
  0.7 × 0.5 m at y 0.034 + bob·0.3); bare sitters have their hat floating beside them (`shakoAlone`, 0.42 m, bobbing).
- On the bank: a puddle (`puddle`, 300 x 150, 1.5 × 0.75 m) and a contact blob (`sc 1.05, k 0.8`).
- `stage()` crowds:
  - **water** (shots 9-10): 40 sitters at `x = FILES[i&3]·1.12 ± 0.3`, `y = -0.6` (river bed, so the lower body is under
    the opaque water at y = 0), `z = -21.6 + (i>>2)·1.6 ± 0.35`. Shot 9 "Luckily": `relief, relief_open, smile, relief`;
    shot 10 "Unluckily": `pained, dazed, pained, dazed`, stars on `i % 4 == 1`. Plus `flotsam()`.
  - **bank** (shot 14): 9 fixed spots around x -7.2 … -1.9, z -31.6 … -35.6, expressions `dazed, relief, smile_closed,
    pained`, stars on `i % 4 == 0`. Plus `officer()`.

### 4.14 Flotsam (cast.ts:309-330)
- `FLOAT` = two floating shakos: `{x -0.25, z -22.5, s 0.46, r 0.6}` and `{x 0.95, z -24.6, s 0.42, r 0.25}`.
  (A drum and a near plank were removed: cut by the frame edge they read as blobs.)
- Each bobs `0.03·sin(1.9t + 1.7i)`, rocks `r + 0.08·sin(1.3t + i)`, sits at `y = 0.28·h + bob`, with its own ring.
- With the round-4 river cameras both pieces are outside the frame (see Bugs #2), so in the final film this code shows nothing.
- Frame-width reminder: a 9:16 frame with vertical fov 40° is only ±11.6° wide horizontally (tan = tan(20°)·9/16 = 0.205).
  At 3 m from the lens that is only ±0.6 m of width.
- Drawings: `shakoAlone` (200 x 200: body `#3a3d47`, peak `#16171b`, plate `#c9ccd2`, tuft `#2b7a4b`),
  `puddle` (300 x 150: `#6f97c6` with highlight `#a9c9ea`), `fxPlank` 320 x 110, `fxDrum` 260 x 240.

### 4.15 Townsfolk (cast.ts:332-349) — shots 2 and 15 (`towns: true`)
- `CHEER = [[8.01 - LEAD, 9.45], [65.96 - LEAD, 67.5]]` ("pride of the whole town", "like a crowd of tourists").
  Extras hold perfectly still and only cheer inside these windows (reference crowds are frozen).
- 26 spots: 13 per bank (`z = ±(31.6 + 3.2·hh)`), alternating sides of the road, `|x| = 5.2 + (k>>1)·1.7 + 0.6·hh` (5.2-15.8 m).
- Every 5th (`i % 5 == 2`) is a kid (`KID`, card scale 0.72, hops `max(0, sin(7t + i))·0.18 m` during a cheer).
- Expressions cycle `smile, grin, laugh, smile_closed`. Waving arm `q(sin(9t + 1.3i), 30)` during a cheer, except `i % 3 == 2`.
- Seed index `i + 200`, blink `lidAt(t, i + 40)`, front view only, contact blob (lighter `k 0.6` while hopping).

### 4.16 Tourists (cast.ts:351-368) — shot 15
- `t0 = 62.08`. 24 soldiers stroll out of step toward -z: speed `sp = 0.55 + 0.5·hh(i)` m/s,
  `z = -4 + 28·i/24 + 1.5·hh - sp·(t - t0)`, `x = ±2 m` random.
- Every 5th (`i % 5 == 2`) is bare-headed and carries his shako; `i % 7 == 3` holds an ice cream and licks it 45 % of the time.
- Expressions `lick` or cycle `smile, smile_closed, grin, smile`. Eyes look around: `round(1.2·sin(0.8t + 1.7i))` clamped to ±1.
- `phase = q(((t - t0)·sp/1.4 + hh(i,5)) % 1, 120)` — cadence `sp/1.4` Hz, so each step is 0.7 m; poses on ones (1/120 steps).
- Front: mode `"stroll"` with prop. Side: mode `"march"`, `stomp 0.55`, `stride 0.875 · view.fs` (0.875 × 0.8 m = 0.7 m).

### 4.17 The officer and the hammer (cast.ts:370-391) — shot 14
- `HITS = [59.79, 60.33, 61.69]` (s). `SIGN_AT = [2.25, D0, -30.9]` (world.ts builds the sign there).
- `hammerK(t)` (0 = hammer up, 1 = struck): for each hit, `n = (t - th)·30` frames to contact;
  `-11 ≤ n < -7` → wind up over 4 f (`1 - smooth((n + 11)/4)`); `-7 ≤ n < 0` → held up 7 f; `n ≥ 0` → struck (1-frame strike).
- Officer card at `(3.35, D0, -31.55)`, front view, `stern`, `facing: 1`, `prop: ["hammer", q(hammerK, 30)]`, blink `lidAt(t, 99)`,
  blob scale 1.1.
- Burst (`fxBurst`, 500 x 500, 0.9 m) at `(2.95, D0 + 1.55, -31.0)` for 5 frames after each hit.

### 4.18 The park swing (cast.ts:393-426) — shot 12
- `SWING_T = 1.55` s period, `PUSH0 = 48.79`; pushes at 48.79, 50.34, 51.89, 53.44.
- `swingAmp(t) = 6 + Σ 11·smooth((t - tp)/0.3)` degrees → 6° growing to 50° after four pushes.
- `swingAngle(t) = -amp·cos(2π(t - PUSH0)/SWING_T)` radians → at each push the swing is at the back end (`-amp`).
- `kidBack(th)` — world (x, y) of the kid's back (local `(-0.083, -2.174)` m from the pivot, card yawed by π).
- `pushSpot(k)` — where the parent stands for push k so the arms are about straight when the hands reach the kid's back:
  `cy = 975 - (by - D0)/SU` (back height in the parent's design units), `dy = cy - 515`,
  `dx = sqrt(max(120², 222² - dy²))`, `px = bx + (53 + dx)·SU`, `hand = [353 + dx, cy]`.
- `park()`:
  - swing card: key `swing|kick|expr|light|lid`, `geo: "swing"`, at `(PARK.x, PARK.y + 2.88, PARK.z)`, `yaw π`, `roll = swingAngle`,
    `draw = swingKid(p, KID, kick, expr, light, lid)`, `size [490, 1610, 0.7]` (= the 700 x 2300 swing canvas × 0.7).
    Leg kick `q(0.35 + 0.55·sin(phase), 40)`. Face by amplitude: < 0.35 rad smile, < 0.6 grin, else laugh.
  - parent: side view `mode "push"`, `pose` = triangle peaking 0.05 s before each push (half-width 0.32 s), grin when
    pose > 0.3; steps back to the next push spot between pushes (`smooth` over `SWING_T - 0.7`); placed with
    `mirror: false, yaw: π`; contact blob.
  - The swing card is never frustum-culled and always casts a shadow.

### 4.19 `stage(id, t, b, cam)` — the dispatcher (cast.ts:428-453)
1. `LNAME = SHOTS[id-1].light`; `findSun(cam, SUN)`.
2. crowd `"march"` or `"fall"` → `column()`.
3. `towns` → `townsfolkAt()`.
4. crowd `"water"` → 40 sitters + `flotsam()`.
5. crowd `"bank"` → 9 sitters + `officer()`.
6. crowd `"tourists"` → `tourists()`.
7. `id === 12` → `park()` (hard-coded id, not a crowd mode).
- Shot 11 has no characters at all.

### 4.20 One-off effects called by world.ts (cast.ts:455-473)
| Function | When | Card |
|---|---|---|
| `snapFx(tau, at, out)` | SNAP ≤ tau < SNAP + 0.45 | `bigburst<u>` fxBurst 500 x 500, 1.5 m, at the bolt + (0, 0.12, -0.15) |
| `splashFx(tau, out)` | 1.1 s after DROP1 | six `splash<u>` fxSplash 800 x 800, `7·s` m, at fixed (x, z, s): (-2.9,-24,1) (2.9,-21,.9) (-2.9,-15,.85) (2.9,-9,.8) (0,-27.5,1.2) (-2.9,-5,.6), `y = 2.6·s` (drawing base on the water line) |
| `creakFx(t, pts, out, size = 0.8)` | world.ts: shot 7 after 28.9 s (on the chain, size 0.8); shot 8 for tau 33.1-SNAP (at the bolt, size 0.3) | `creak<u>` fxCreak 300 x 300, `u = q((1.3t + 0.37i) % 1, 30)` |

---

## 5. What `toon.ts` gives cast.ts (the drawing side, summarised)

Design space: 600 x 1000 units, soles at y = 975, card centre x = 300. Canvas y points down.

### 5.1 Palette and shading constants
- `INK #241726` (plum outline), `SKIN #ffe2c2`, mouth `#5a1e28`, tongue `#e86e78`, white `#ffffff`.
- Shadow multipliers: skin `[.96, .86, .84]`, cloth `[.64, .66, .74]`, felt `[.62, .62, .70]`.
- `SKINS = [#ffe2c2, #f5c9a0, #ecd0b6, #c99067]`.

### 5.2 Outfits (the cast)
| Outfit | jacket | pants | boots | hat | extras | build |
|---|---|---|---|---|---|---|
| `RIFLEMAN` / `soldier(v)` | #357650 | #3d4440 | INK | shako | belt #f1efe6, buttons #d9dde0, rifle; skin SKINS[v%4]; moustache v=1 #4a3426, v=3 #2a201a | adult |
| `OFFICER` | #357650 | #3d4440 | INK | shako_tall (gold band #e8c45a) | buttons #e8c45a, sash #c0353a, sword, moustache #4a3020, no rifle, no belt | stout |
| `KID` | #f08a2c | #3b5b9a | #f4f1ea | cap #e2453c | | kid |
| `PARENT` | #7b5ac9 | #3b3f52 | #5a3b2a | hair #5a3b2a | | adult |
| `townsfolk(v)` | [#3f6fb5, #8c3b4a, #5d7a3a, #b5653f, #2f5f6a, #7b5ac9][v%6] | #3b3f52 | #4a3426 | odd v: bonnet + dress [#d9a441, #c25a7a, #5a8fc2][v%3]; even v: tophat #2e2a36 | skin SKINS[v%4] | adult |

`BUILD`: adult `{a 118, torso 1.1, legs 1.4, tw .8}`, stout `{118, 1.15, 1.32, .92}`, kid `{112, .85, 1.0, .72}`
(`a` = head half-width in units; torso/legs in head-heights). Heights: adult ≈ 3.5 head-heights ≈ 776 units ≈ 1.68 m;
kid ≈ 600 units ≈ 1.30 m (× 0.72 card scale in the town = 0.93 m).

### 5.3 Heads and faces
- Head = superellipse "bean" (`headBlob`): H/W 0.94 ±0.04, crown exponent 1.75, jaw 2.3, chin taper -0.12, 6-10 % bulge
  toward the facing side, tilt ±4°, tiny noise; varies by `seed` (1-7 for soldiers).
- Outline = thick-thin ink ring (`inkRing`), thickest away from the light and toward the ground (`thickAngle`).
- Painted shading: `shadedFill` (radial crescent on heads), `gradFill` (linear gradient on torsos) from the `light` angle.
- 14 expressions (`FACE` table, toon.ts:234-249):

| Expr | eyes (back, front) | brows (inner, outer offset) | mouth |
|---|---|---|---|
| neutral | lid, lid | 0, -1 | dash |
| stern | lid, lid | 3, -2 | frown |
| grin | happy, happy | -3, -3 | grin (open D with teeth) |
| laugh | squeeze, squeeze | -4, -4 | laugh (big D + tongue) |
| whistle | dash, dash | -2, -4 | o |
| nervous | small, small | -3, 2 | wave (+ sweat drop #9fd4ff) |
| shock | shock (white ring), shock | -7, -6 (arched) | O |
| relief | happy, happy | -2, 1 | smileWide |
| relief_open | happy, happy | -2, 1 | grin |
| dazed | spiral, spiral | -3, 2 | wave |
| pained | squeeze, lid | -3, 2 | teeth |
| smile | dot, dot | 0, -1 | smirk |
| smile_closed | happy, happy | 0, -1 | smile |
| lick | dot, dot | 0, -1 | lick (smile + tongue) |

- Front face: `u = W/100`; eyes ±13u (12u for shock) around `cx + 7u·facing`; brows 20u up (17u under a brim); mouth 20u
  down, slid 8u toward facing. Side face: one eye at +27u, nose tick, mouth at +33u. No blush, no eye highlights.
- `look` (-1/0/1) shifts the pupils 3u.

### 5.4 Bodies and animation formulas
- `bodyFront(p, o, FrontOpts)`; `FrontOpts = { phase, expr, mode: march|stroll|stand|sit|fall, look, blink, lift, prop,
  tilt, headTilt, wave, light, facing, seed }`.
  - Bob: march `0.025·tall·cos(4π·phase)` (5 % peak-to-peak), stroll `0.015·tall` (3 %); lowest at contact.
  - Feet lift `max(0, sin(2π(phase + side)))·L`, `L = lift·1.25` (march, lift = 60·stomp) or `lift·0.55` (stroll).
  - Upper-body sway 1.6° (march) / 1.0° (stroll) per step, plus `tilt`; head can add `headTilt` (never used by cast.ts).
  - Rifle "at the order" by the right hip; sword at 25°; props: `icecream`, carried `shako`, `["hammer", k]`
    (hammer angle `-70° + 105°·k`); `wave` raises the right arm.
  - Sit: legs forward, hands on knees, torso low. Fall: legs and arms flung out.
- `bodySide(p, o, SideOpts)`; `SideOpts = { phase, expr, mode: march|stand|swing|push, blink, stomp, pose, stride, light,
  seed, hand }`.
  - March: step `S = 370·stride` units; stance foot slides back at exactly walking speed (planted), swing foot follows a
    cycloid (lands at zero speed), lift `max(22, 40 + 70·(stomp - 1))`; hip height from the leg length (with 3.5 % knee give);
    lean `4 + 3·cos(4π·phase)` = 7° at contact, 1° at passing; arms swing ±30°; rifle at the slope over the shoulder.
  - Push: lean `14·pose`, near hand reaches toward `hand` (canvas units) by `pose`.
  - Swing: seated, legs kick by `pose` (60°·pose).
- `swingKid(p, o, kick, expr, light, blink)`: 700 x 2300 canvas, pivot (350, 20), rope 1830 units, two ropes `#a07a4c`
  (width 10) to a plank 150-550 `#b5653f`, kid drawn with `bodySide(mode "swing")` at scale `k = 1.1`, seed 5.
- No squash/stretch, no smears, no line boil, no idle loops (all by design: the reference has none).

### 5.5 Effect drawings (toon.ts:747-909)
`fxNote` (220x260), `fxBurst` (500x500, 10 rays `#fff3b0`), `fxSplash` (800x800, `#bfe8ff`/`#6cc0f0`), `fxPuff` (300x300,
unused), `fxStars` (420x210, `#ffd84a`), `fxCreak` (300x300), `fxRing` (600x600, `#f6fcff`/`#cfe8fa`), `fxSign` (700x520,
used by world.ts for the rule sign), `fxCloud` (unused), `fxShadow` (128x256, blurred 9 px), `fxContact` (128x128),
`fxPlank`, `fxDrum`, `fxBlob` (unused).

---

## 6. How world.ts uses this slice every frame (world.ts:349-458)

1. `t = f/30`, `s = SHOTS[id-1]`, `tau = s.tau(t)`, `b = bridgeState(id, t)`, `L = LIGHTS[s.light]`.
2. Camera from `camAt(id, f)`: `position`, `lookAt(look)`, `rotateZ(roll)`, `fov`, near 0.2, far 1500.
3. Sun: camera-relative and **frozen per shot** — the average view direction of all of the shot's camera frames
   (sampled every 3 f from `camAt`), turned by `az` toward screen-right and lifted by `el` (day az 75 / el 48, golden az 6 /
   el 7; per-shot overrides `SUN_SHOT = {2: {az 120}, 11: {az -70, el 8}, 12: {az -30, el 18}}`, or `sunAz/sunEl` on a ShotDef).
   Sun placed 220 m from the look point; shadow box radius `clamp(1.15·dist + 7, 12, 95)` (≥ 30 in golden).
4. Sight lines for the house culler are built once from `camAt` of every shot frame range `[a - 8, b + 8)` every 2 frames,
   5 rays each. **Moving a camera key changes which houses get removed.**
5. Foreground props visible only inside `[a, b)` AND inside the current shot.
6. Bridge posed from `b`; rule sign visible for `id ≥ 14`; bolt halves fly off after the snap (whole again in shot 15).
7. `st = stage(id, t, b, {pos: cam.position, right})`; shot 8 adds `snapFx`, `splashFx`, bolt creaks; shot 7 adds chain creaks.
8. Cards: frustum test (sphere radius 3.5 m at `y + 1.1·scale`; the swing is never culled); `yaw = p.yaw ??
   atan2(cam.x - x, cam.z - z)` (faces the camera position); `scale = (mirror ? -s : s, s, s)`; `castShadow = swing ? true :
   L.actorShadow` (false by day, true in golden). Effects: frustum test; flat ones `rotation (-π/2, 0, rot)`; others copy the
   camera quaternion then `rotateZ(rot)` (fully screen-parallel). Then `pool.flush()` and `bind()`.

---

## 7. Guide: how to author a NEW story timeline

### Step 1 — words.json → a frame table
1. Get `voice.wav` and word timings `words.json` (any speech-to-text with word times). Hand-fix them (SKILL.md:42-44).
2. Make a table: word, start s, **frame = round(start × 30)**. Everything in the picture is copied by hand from this table.
3. `TOTAL` = frame of the last word's end + a few frames (the reference ends on the last word; the bridge is 2025 f = 67.5 s).
   `BRIDGE_FRAMES = TOTAL` sets the composition length.
4. Script pace ~3.7 words/s, 55-70 s (SKILL.md:32).

### Step 2 — the shot list (`SHOTS`)
- One shot per place or time-of-day or story beat. `a` = the frame of the beat's first word (or 0-3 f before it);
  `b` = next shot's `a`. Last shot `b: TOTAL`.
- Keep the exact formatting `{ id: 1, a: 0, b: 130, ...` — `scripts/bridge_shots.py` reads SHOTS, XFADE, FLASH_AT,
  `{ f: N, cut: true` and KICKS from story.ts **with regexes**.
- `id` must be 1, 2, 3 … in order.
- `light`: `"day"` or `"golden"` (only these two presets exist in lights.ts / grade.ts).
- `crowd`: pick a mode your `stage()` understands (add new modes to the `Crowd` type and to `stage()`).
- `tau`: story clock. Use `(t) => t` normally. Use an offset for a flash-forward hook (`29.5 + t` showed the climax first)
  or a replay (`t - 31`).

### Step 3 — transitions
- `XFADE[id] = 6-8` frames at place or time changes (reference: 6-8 frame dissolves).
- `FLASH_AT` = first frame after the hook (4 white frames 1 / .75 / .45 / .2).
- Everything else is a hard cut or a continuous camera move. Two shots can share one camera (`CAMS[10] = CAMS[9]`) to
  change the crowd without a visible cut.
- For every crossfaded shot, start its first camera key at least `XFADE/2` frames (bridge: 6-8) before `a`.

### Step 4 — story physics as pure functions
- Write positions and states as functions of `tau` only (like `front`, `marchPhase`, `amp`, `dropU`). No variables that
  change over frames.
- Put event times (snap, drop, impacts) as named constants in seconds. Copy them into `timeline.py` for the sound.

### Step 5 — camera keys (`CAMS`)
- For each shot, an array of keys `{ f, dur?, cut?, s: (f) => Shot }`. Write each framing as a function using
  `dolly(pos, look, pushK(f, f0, rate[, punch, n]), { fov, roll })` or `zoom(pos, look, fov, pushK(...), { roll })`.
  `f0` = the key's own start frame. Use `zoom` when the lens is next to walls/towers; `dolly` elsewhere.
- Frame moving subjects relative to their position (like `Fz(id, f)` for the column front) to ride with them.
- Decide cut or glide with the 720p numbers (motion.md 2.2, story.ts:89-91):
  - move ≤ ~360 px (half a frame width) and ≤ 40 % zoom → **glide**; `dur` 18-40 f, `dur ≥ 0.075 × move px`
    (peak = 1.875 × px / dur, keep ≤ 25 px/f, ~15 typical);
  - bigger → `cut: true` on the word's frame.
- Glide timing: put the **middle** of the glide on the word: `key.f = wordFrame - dur/2`.
- Every key must keep pushing in (QA flags a frozen span ≥ 12 f; SKILL.md says no static hold ≥ 4 f):
  rate 0.0015-0.0035 per frame; punch words `punch 0.006, n ≈ 30-35`.
- Rolls: keys carry ±0.02-0.04 rad; on an emphasis word glide the roll through level with
  `{ f: X, dur: 18-20, s: rolled(Sxx, +0.035) }` (≈ 4°). Keep held tilt ≤ 0.07 rad.
- Avoid putting the lens < 2 m from any prop or card (cut-off blobs at the frame edge).
- Rails/railings at chest height: lift the lens to ~2.5 m so rails cross legs, not torsos.

### Step 6 — impacts
- Add `[eventSeconds, gain]` to `KICKS`: 0.5 small hit, 1 snap, 1.6 big slam. 7 frames, flips sign every frame.
- If cast.ts has the same event (like `HITS`), keep the numbers equal in both files (story.ts cannot import cast.ts:
  cast.ts already imports story.ts).

### Step 7 — depth of field (`DOF`)
- One row per framing change, `f` = the key's frame (cuts) or the same `f`/`dur` as its glide (ramps).
- `cInf`: close-ups 12-16, medium shots 10-12, soft park-like 7, mild 5, wides/aerials/establishing 0.
- `focus`: the subject's eyes (e.g. `[x, ground + 1.6, z]`), or leave it out to focus on the look point.
- DOF only switches by frame (not by shot), so check crossfade frames.

### Step 8 — foreground props (`FOREGROUND`)
- Only in about 1/3 of shots; inside one shot's frame range; 0.3-0.5 × focus distance; 10-25 % of one frame edge;
  never over a face; must read as an object (a bush cut by the frame reads as a "green ball").

### Step 9 — character beats (cast.ts)
- Expression swaps at `wordSeconds - LEAD` (2 frames early). Put the same swap time into `SWAPS[shotId]` so a blink
  hides the swap.
- Actions: wind-up 4 f, hold 7 f, 1-frame strike on the word onset, 5-frame burst (`hammerK` pattern).
- Background extras stay frozen except inside cue windows (`CHEER` pattern).
- Every new outfit needs a unique `okey` string (it is part of the texture key).

### Step 10 — lock and mirror
- Lock picture timing before making sound (SKILL.md:70). Copy every time into `templates/audio/timeline.py`
  (`SHOTS`, `XFADE`, `tau_of`, `AMP`, `STOMP`, event times, `COLUMN_CAM`, `tourist_cam` …).
- Run `python scripts/bridge_shots.py src/videos/<name>/story.ts` to make `shots.json` for `short_qa.py`.
- Check stills at key frames: `node scripts/bridge-stills.mjs out/<name>/x_ 100,400 0.5`.

### Skeleton for a new `story.ts`
```ts
export const FPS = 30;
export const TOTAL = 1980;                       // last word end (s) × 30 + a few frames
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 126, light: "day", crowd: "hero", tau: (t) => 40 + t },   // hook = flash-forward
  { id: 2, a: 126, b: 300, light: "day", crowd: "hero", tau: (t) => t },
  { id: 3, a: 300, b: 470, light: "golden", crowd: "none", tau: (t) => t },
  // ...
  { id: 9, a: 1800, b: TOTAL, light: "day", crowd: "crowd", tau: (t) => t },
];
export const XFADE: Record<number, number> = { 3: 8 };
export const FLASH_AT = 126;

const S1a = (f: number) => dolly([4, 2.2, -9], [0, 1.6, 0], pushK(f, 0, 0.0025), { fov: 44 });
const S1b = (f: number) => dolly([1, 1.5, -4], [0, 1.5, 0], pushK(f, 36, 0.002, 0.006, 32), { fov: 38, roll: -0.04 });
const S2a = (f: number) => zoom([20, 12, -40], [0, 4, 0], 42, pushK(f, 122, 0.002));
const S3a = (f: number) => dolly([3, 1.8, -7], [0, 1.4, 0], pushK(f, 292, 0.0018), { fov: 40 });  // starts a - 8 (xfade)

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 36, dur: 24, s: S1b }],     // glide centred on the word at frame 48
  2: [{ f: 122, s: S2a }],                              // starts under the flash
  3: [{ f: 292, s: S3a }],
};
const KICKS: [number, number][] = [[12.4, 1]];
export const DOF: Dof[] = [{ f: 0, cInf: 14 }, { f: 126, cInf: 0 }, { f: 300, cInf: 10 }];
export const FOREGROUND: Fg[] = [];
```

---

## 8. Bugs / contradictions

1. **CONFIRMED — no whistle notes in shot 1.** cast.ts:273-277 includes `id === 1`, but `age = ((t - 21.9 + n·0.42 + hh) % 1.68) / 1.68`
   is negative for every t in shot 1 (t ≤ 4.33 s; JS `%` keeps the sign), so `pop ≤ 0.02` and every note is skipped.
   Fix: use `((x % 1.68) + 1.68) % 1.68` or a shot-relative clock.
2. **CONFIRMED (by projecting the camera maths) — the flotsam is never on screen; comment is stale.** `FLOAT[1]` is at
   z = -24.6 (cast.ts:314), level with the S9a lens (z -24.6, pushing to -23.7) and behind the S10a lens (z -24.2).
   `FLOAT[0]` (x -0.25, z -22.5) projects to normalised screen x ≈ +2.5 … +4.5 (the frame edge is ±1) in every frame of
   shots 9-10, i.e. far off the right edge of the narrow 9:16 frame, and its ring too (nearest edge ≈ 1.6). The comment at
   cast.ts:309-310 ("so the bottom of the frame is not empty", "cameras z -27 / -25.4 looking +z") describes the cameras
   before round 4. It is also only 1.4-2.7 m from the lens (the SKILL.md:159 "< 2 m" trap). For a new river shot,
   re-place props using the projection, not the comment.
3. **PLAUSIBLE — park light is mirrored.** The parent (cast.ts:424, via `person(..., {side: true, mirror: true})`) and the
   swing (cast.ts:413, `light2D(cam, true)`) compute the painted light as if mirrored, but both cards are placed
   `mirror: false, yaw: π`, and the park cameras look along +z (screen-right = world -x = canvas right). So the painted
   crescent and thick outline sit on the side opposite to the real sun used by `cardShade` (gradient and golden rim).
   Check with a still of frame ~1500.
4. **CONFIRMED (unused) / PLAUSIBLE (visible) — billboard turns can pop mid-glide.** `keyEnd()` (story.ts:284) is exported
   for choosing views per key (motion.md 5.1e) but world.ts never uses it; `viewOf()` runs per frame on the live camera.
5. **PLAUSIBLE — DOF row bleeds into the outgoing crossfade layer.** `dofAt(f)` ignores the shot id. At frames 1134-1136
   (shot 8 → 9 fade) the outgoing shot 8 layer uses `cInf 16` with focus `[0.6, 0.6, -21.6]` (the river row), not its own.
6. **Minor — DOF focus jumps.** `dofAt` ramps `cInf` over `dur` but switches `focus` instantly (e.g. frame 72: eyes → boots).
7. **Stale comments — foreground bush for the officer.** story.ts:345 describes a bush under the sign post for S14b, and the
   DOF row at 1770 says "bush in front", but `FOREGROUND` has no such entry.
8. **Contradiction — swap without a blink.** The rule "a blink across every expression swap" is not applied to sitters: the
   9 → 10 change at frame 1212 swaps every water sitter from happy to hurt with `lidAt(t, i)` (no swap list).
9. **PLAUSIBLE — tourists' props pop.** Ice creams and carried shakos exist only in `bodyFront`; `bodySide` has no props, so
   a tourist drops/regains his prop whenever his view flips front ↔ side.
10. **Duplicated constants (easy to desync).** Hammer times live in cast.ts `HITS`, story.ts `KICKS` (literals), and
    audio/timeline.py `HITS`. Shots/XFADE/tau/AMP/STOMP/SNAP/PUSH0/TOURIST_T0 are hand-mirrored in timeline.py.
    timeline.py's `tourist_cam` (glide at 1905 over 10 f, crane at 1962 over 24 f) and `COLUMN_CAM` are rough copies and
    already differ from story.ts (S15b glide 1890 over 30 f, crane from 1932 over 93 f).
11. **toon.ts comment vs code.** swingKid says "kid drawn at 0.92 scale" (toon.ts:730) but uses `k = 1.1` (toon.ts:732).
12. **Grammar breaks.** `S12a` pushes at 0.001/f (story.ts:176), below the 0.0015-0.0035 minimum in the header.
13. **Docs disagree on the camera grammar.** STYLE_BIBLE.md:35-37 says "hard cuts almost never", holds ~80 %, "ease-out bursts";
    motion.md:11-14 says that measurement was wrong, and story.ts follows motion.md (cuts on big reframes, smootherstep glides).
    SKILL.md "Rolls of 4-5°" means the total swing (e.g. -0.04 → +0.04 rad); single keys hold only ±0.035-0.04 rad (2-2.3°).
14. **grade.ts comment vs value.** grade.ts:170-172 says day 0.65 / golden 0.45, but `GRADE_STRENGTH = {day: 1, golden: 1}`.
15. **Fog numbers disagree** (outside the slice, affects the look): SKILL.md says day fog "25→300 m" (line 88) and
    "25→420 m" (line 115); world.ts creates `Fog(…, 25, 420)` but every frame sets lights.ts `fogNear 25 / fogFar 300` (day).
16. **Dead code / unused things.** `BridgeState.collapsed`; `person().tierKey`; `fxBlob` import; the `Fx.soft` material
    path; `CamInfo.sun`; `focusAt()`; `Crowd "fall"` behaves like `"march"` (the fall logic is keyed on `id === 8`);
    world.ts:434 legacy emissive tint (`emissiveMap` is always null after `cardShade`).
17. **Small resource leaks.** Bridge.tsx only disposes the ink pass (lens, bloom, grade, grain are never disposed when a
    crossfade canvas unmounts); `ROOTS` never drops detached worlds; the canvas pool never frees canvases.
18. **Trivial.** In shot 8 soldiers switch to "stand" at `SNAP + 0.25` but keep sliding until `SNAP + 0.3` (8 cm).
19. **Fragile sun lookup.** `findSun()` traverses every attached world root each frame and relies on the sun target being
    the camera look point (true in world.ts today). Pass `cam.sun` from world.ts to make it explicit.

---

## 9. Hard-coded paths, OS assumptions and versions

- story.ts:1 comment: voice timings at `~/bridge-short/voice/words.json` (bridge project folder; nothing reads it in the picture).
- Kenney models: world.ts `staticFile("bridge/kenney/<name>.glb")` → `public/bridge/kenney/*.glb` (26 files, **not in the repo**:
  tree_oak, tree_default, tree_detailed, tree_fat, tree_cone, tree-high-round, tree, plant_bushLarge, plant_bushDetailed,
  plant_bush, hedge, flower_redA/yellowA/purpleA, grass_large, grass, lily_large, lantern, cart, stall-red, stall-green,
  stall-bench, banner-red, banner-green, windmill, canoe). `FOREGROUND.kit` names must be in that list.
- Frame size 1080 x 1920 hard-coded in `ShotView` (Bridge.tsx:98), in the composition registration, and as the reference for
  every pixel parameter (`/1920` in Bridge.tsx bloom, cast.ts `uPx`, ink.ts, lensblur.ts).
- fps 30 hard-coded twice: story.ts `FPS = 30` and the `<Composition fps={30}>` literal (sandbox example).
- Composition id `"BridgeShort"` hard-coded in `scripts/bridge-stills.mjs`.
- `scripts/bridge-stills.mjs`: Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (Windows), `gl: "angle"`,
  `REMOTION_TMP` env var for the temp folder.
- `scripts/bridge_shots.py`: default input `src/videos/bridge/story.ts`, output always `out/bridge/shots.json`; regexes
  depend on story.ts formatting.
- Sandbox example imports `../../videos/bridge_world/Bridge`.
- **No `package.json` in the repo → no version pins at all.** Implied requirements (from the APIs used): `remotion` +
  `@remotion/three` (`ThreeCanvas`), `@react-three/fiber` (`useThree`), `@react-three/postprocessing` (`EffectComposer` with
  `multisampling`), `postprocessing` with `ToneMappingMode.NEUTRAL` and `BloomEffect.mipmapBlurPass`, a recent three.js
  (`texture.colorSpace`, `SRGBColorSpace`, `vMapUv` in shaders, `MeshDepthMaterial` `RGBADepthPacking`). shade.ts throws if three's
  `lights_fragment_begin` shader chunk text changes, so **a three.js upgrade can break the build**. Pin the versions of the
  Remotion project that rendered the bridge before reusing.
- Shader cache keys `"card9"` (cardshade.ts), `"river1"`, `"twoTone5_…"`: bump them if you edit those shaders.
- World geometry is baked into cast.ts numbers: deck z ±30, D0 6, files, bank spots (±31.6-35.6), officer (3.35, -31.55),
  burst (2.95, D0 + 1.55, -31.0), splash positions, sitter rows (z -21.6 …), `PARK`, `SIGN_AT`, `ANCHOR`.

---

## 10. What to change for a NEW story (different topic, characters, world)

### story.ts
- Replace `TOTAL`, all world constants (`D0`, `HALF`, `FILES`, `ROW_GAP`, `COUNT`, `PARK`, `ANCHOR`), the story physics
  (`front`, `marchPhase`, `amp`, `stomp`, `shapeZ`, `dropW`, `dropU`, `DROP_H`, `SNAP/DROP0/DROP1`) and `BridgeState`/`bridgeState()`
  with your own subject's state (or a generic `{ k1, k2 }` per shot).
- New `SHOTS` (ids 1…n), `Crowd` modes, `XFADE`, `FLASH_AT`, every `S…` framing, `CAMS`, `KICKS`, `DOF`, `FOREGROUND`.
- Keep the camera toolkit as is: `glide`, `mix`, `full`, `run`, `pushK`, `dolly`, `zoom`, `rolled`, `kickAt`, `camAt`, `dofAt`, `keyEnd`.
- Keep the formatting `bridge_shots.py` parses, or update its regexes.

### cast.ts
- Keep the machinery: `Pool`, `Actor`, `Fx`, `Place/FxPlace/CamInfo/Stage`, `hh`, `q`, `tier`, `findSun`, `light2D`, `viewOf`,
  `LEAD`, `LID`, `lidAt`, `fkey`, `person`, `blob`, `hexOf`.
- Replace the roles: `SOLDIER/BARE/FOLK`, `vOf`, `exprMarch`, `SWAPS`, `column`, `sitters`, `FLOAT/flotsam`, `CHEER/townsfolkAt`,
  `tourists`, `HITS/SIGN_AT/hammerK/officer`, `SWING_T/PUSH0/swingAmp/swingAngle/kidBack/pushSpot/park`, and the one-off
  effects `snapFx/splashFx/creakFx`.
- Rewrite `stage()` for your crowd modes; remove `id === 12` style hacks or move them to `ShotDef` fields.
- Give every new outfit a unique `okey`. Add `SWAPS` entries for every planned expression change.

### toon.ts (character look)
- New outfits as `Outfit` objects (jacket/pants/boots/hat/extras/build). New hats need code in `hatOn`/`hatBehind`.
- New props need code in `bodyFront` (and `bodySide` if side views are used — the bridge has none there).
- New expressions: add to the `Expr` type and the `FACE` table. New effect drawings: add `fx…` functions with their canvas size.
- Keep the style constants (INK `#241726`, shading multipliers, head blob, outline, no blush/highlights).

### world.ts (calls into this slice — change together)
- Shot-id hacks: `SUN_SHOT` ids 2/11/12; `sign.visible = id >= 14`; bolt logic `id === 15`; effects for `id === 8` and `id === 7`
  with times 28.9 / 33.1; `poseBridge` reads `BridgeState`.
- The sight-line culler and `shotSun` sample `camAt` for every shot, so they adapt automatically to new cameras.

### Bridge.tsx
- Rename `BridgeShort`/`BRIDGE_FRAMES` and register a new composition (new `id`) next to the old one in `src/Root.tsx`.
- Keep the post chain and its order; only `gradeFor(..., SHOTS[id-1].light)` needs new light names if you add presets
  (then add them to lights.ts `LIGHTS/LOOK` and grade.ts `GRADES/GRADE_STRENGTH`).
- Change the flash/crossfade logic only if you want other transitions (e.g. a blurred whip, motion.md 5.4).

### Sound side
- Re-mirror every time constant in `templates/audio/timeline.py` and re-run the whole sound pipeline after the picture is locked.

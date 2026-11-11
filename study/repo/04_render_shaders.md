# 04 — Render look: shaders, light rig, ink, lens blur, grade

Slice `04_render_shaders` of the study of `mromidev/claude-animated-shorts`, cloned read-only at
`<ROOT>\repo`. All paths below are relative to `repo/templates/bridge/`
unless written in full. `file:N` means line N of that file.

## Files read

| File | Lines | How it was read |
|---|---|---|
| `templates/bridge/toon.ts` | 909 | every line (3 chunks) |
| `templates/bridge/ink.ts` | 393 | every line |
| `templates/bridge/cardshade.ts` | 85 | every line |
| `templates/bridge/shade.ts` | 77 | every line |
| `templates/bridge/lensblur.ts` | 139 | every line |
| `templates/bridge/grade.ts` | 179 | every line |
| `templates/bridge/lights.ts` | 63 | every line |
| context: `templates/bridge/Bridge.tsx` | 116 | every line (composer order, crossfade layers) |
| context: `templates/bridge/cast.ts` | 473 | every line (how cards use cardShade/toon) |
| context: `templates/bridge/world.ts` | 578 | lines 1-459 (light rig, uniform writes, sky, water, materials) |
| context: `templates/bridge/story.ts` | 348 | lines 1-130 (SHOTS, XFADE, layersAt) |
| context: `templates/bridge/build.ts` | 703 | lines 1-60 (material cache `lam()`, `toLambert()`) |
| context: `references/reports/outlines.md` | 624 | every line (ink measurements + original recipe) |
| context: `references/reports/depth.md` | 556 | every line (DOF, bloom, fog, sky measurements + recipe) |
| context: `references/reports/lighting.md` | 603 | lines 1-120 and 286-603 (measurements, recipe 9.x) |
| context: `references/reports/grade.md` | 380 | lines 1-70 and 240-380 (targets, fitted presets, recipe) |
| context: `references/STYLE_BIBLE.md` | 44 | every line |
| context: `SKILL.md` | 166 | grep + lines 84-100, 140-166 (final values, gotchas) |

Words used below:
- **Uniform** = a value the JavaScript side hands to a shader (GPU program). Same value for every pixel of a draw.
- **Linear** = light-intensity numbers (double = twice the light). **sRGB / display / gamma** = the numbers a screen
  shows (#hex colours are sRGB). three.js converts sRGB textures and `new Color("#hex")` to linear for you.
- **HDR** = linear values above 1.0 (allowed in the half-float buffers used here).
- **Tone map** = the curve that squeezes HDR linear values into 0..1. Here it is Khronos **PBR Neutral**.
- **Pass / EffectPass** = one full-screen step of the post chain (`postprocessing` library v6.37.2).
- **CoC** = circle of confusion = the blur-disc radius of the depth of field, in pixels.
- **Card** = a flat rectangle in 3D that carries a 2D character drawing (a billboard that turns to the camera).

---

## 0. The whole look in one picture

There is **no cel-shading ramp anywhere** (no quantised "toon bands"). The look comes from:
1. **World**: a smooth *two-tone* light model: `albedo x mix(shadeColour, litColour, sunTerm)`, where `sunTerm` =
   real shadow-map visibility x a soft N·L terminator (`shade.ts`).
2. **Characters**: 2D drawings painted with Canvas2D (`toon.ts`) with their own plum outline and *painted* soft
   crescent shadows, put on cards and lightly re-lit by `cardshade.ts`.
3. **Ink lines on the 3D world**: a screen-space depth + normal edge detector (`ink.ts`). NOT an inverted hull.
4. **Thin-lens depth of field** as two gather passes (`lensblur.ts`).
5. **Bloom** only on HDR emissives, **PBR-Neutral tone map**, then a fitted **colour grade** (`grade.ts`).

Per frame, inside each `Inner` component (`Bridge.tsx:49-92`):

```
world.update(id, f, cam, scene)          world.ts:349  poses scene, writes TONE/CHAR uniforms (shade.ts singletons),
                                                         sky/fog/water uniforms (per World), sun position + shadow box
noInkFallback(world.root)                ink.ts:382    safety: cards/sky/no-depth things -> layer NOINK (3)
lens.focus / lens.cInf from dofAt(f)     Bridge.tsx:79-83
gradeFor(fx.grade, shot.light)           grade.ts:175
-------------------------------------------------- GPU, in the R3F frame loop -------------------------------
main render  -> composer buffer (HalfFloat, MSAA 4 samples, shadows = PCFSoft, sun shadow map 4096^2)
  world meshes      : twoTone() Lambert / Phong          (shade.ts)
  character cards   : cardShade() Lambert, alphaTest .5  (cardshade.ts, drawings from toon.ts)
  effect cards      : MeshBasicMaterial (unlit) ; contact blobs : multiply blend (cardshade.ts blobMaterial)
  sky sphere        : ShaderMaterial gradient (world.ts:119)  ; water: own Lambert patch (world.ts:230)
1. InkPass                (ink.ts)       own Pass, re-renders world normals+depth, draws ink into the buffer
2. LensBlur pre           (lensblur.ts)  EffectPass (16 taps)
3. LensBlur main          (lensblur.ts)  EffectPass (64 disc taps + 32 near-field taps)
4. one merged EffectPass: Bloom (ADD) -> ToneMapping NEUTRAL -> GradeEffect -> [GrainEffect, OFF by default]
-> screen (sRGB)
```
Composer order is written in `Bridge.tsx:65-73`; the reason (ink before DOF so lines blur with what they belong to;
bloom after DOF so glows defocus; grade after the tone map because it is display-referred) is in `Bridge.tsx:2-7`.

---

## 1. `lights.ts` — light presets (63 lines)

Two presets only: `"day"` and `"golden"` (`lights.ts:15`). The sun is **camera-relative and frozen per shot**
(`lights.ts:1-3`): `az` = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight,
+90 = screen right, 180 = behind camera), `el` = elevation in degrees. `world.ts:329-344` (`shotSun`) averages the
camera's look direction over the shot (every 3rd frame), turns it by `az`, lifts it by `el`, and caches it per shot
id. Per-shot overrides: `SUN_SHOT` in `world.ts:67` = `{2: {az:120}, 11: {az:-70, el:8}, 12: {az:-30, el:18}}`,
and optional `sunAz/sunEl` on a ShotDef (`world.ts:338-339`).

### 1.1 `LIGHTS` (type `LightPreset`, `lights.ts:7-14`)

| Field | day | golden | Who reads it | Notes |
|---|---|---|---|---|
| `az`, `el` | 75, 48 | 6, 7 | world.ts:339 `shotSun` | day = side-slightly-back from screen right; golden = low backlight |
| `lit` (linear RGB mult.) | [1.58, 1.5, 1.33] | [1.5, 0.68, 0.24] | TONE.uLitCol (world.ts:368) | golden lit hue ≈ #ffb36f (orange key) |
| `shade` | [0.3, 0.29, 0.36] | [0.15, 0.15, 0.3] | TONE.uShadeCol | shade/lit ratio day ≈ (0.19, 0.19, 0.27); golden ≈ (0.10, 0.22, **1.25**) = blue-violet shadow |
| `lift` (additive, NOT x albedo) | [0.05, 0.06, 0.11] | [0.04, 0.06, 0.17] | TONE.uShadeLift | cool fill added only in shadow |
| `lambert` | 0.35 | 0.35 | TONE.uLambert | how much N·L modelling stays in the lit tone |
| `sideK` | 0.84 | 0.82 | TONE.uSideK | brightness of down-facing faces (vertical ≈ midway) |
| `term` | 0.2 | 0.07 | TONE.uTerm | terminator width in N·L units; golden is sharper because el 7° makes N·L small |
| `charTint` | [1.0, 0.94, 0.92] | [1.0, 0.78, 0.56] | CHAR.uCharTint (world.ts:370) | measured light colour on WHITE heads; applied at 55 % (TINT_K) |
| `charShade` | 0.86 | 0.88 | CHAR.uCharShade | card brightness inside a cast shadow ("bright floor") |
| `charGrad` | 0.07 | 0.1 | CHAR.uGrad | head side-gradient (x GRAD_K 5.5, capped .4) |
| `bodyGrad` | 0.2 | 0.25 | CHAR.uBodyGrad | torso side-gradient (x GRAD_KB 1.6) |
| `sideTint` | [0.92, 0.90, 0.96] | [0.85, 0.80, 0.95] | CHAR.uSideTint | lavender far side of cards |
| `blob` | [0.62, 0.58, 0.58] | [0.75, 0.74, 0.9] | **nobody** | DEAD. cast.ts uses its own `CONTACT` / `TAIL` constants (cast.ts:206-207) |
| `actorShadow` | false | true | world.ts:435 | golden: cards cast real silhouettes; day: blobs only |
| `top`, `hor`, `skyCurve` | #3e7fd2, #b8d0ec, [0,.5,.6] | #6a4f8c, #ffd08a, [.05,.6,1] | **nobody** | DEAD. Sky now uses `LOOK.sky` 5 stops |
| `fog`, `fogNear`, `fogFar` | #b8d0ec, 25, 300 | #efb489, 50, 380 | world.ts:378 (`untone` -> linear fog) | three.js linear `Fog`; also tints far ink (ink.ts) |
| `sunDisc` | #000000 | #ffcf9e | world.ts:386 halo colour x1.3 | disc/halo shown only in golden (world.ts:380) |
| `sunCol`, `sunI` | #fff3e0, 2.8 | #ffab5e, 5.5 | world.ts:360, three DirectionalLight | does NOT change twoTone diffuse; only Phong specular (iron/steel/chain) and unpatched Lambert (smoke) |
| `sky`, `ground`, `hemiI` | #dcecff, #b49a78, 0.55 | #d8b0b8, #8a6a60, 0.5 | world.ts:359 HemisphereLight | twoTone and cards zero the indirect light, so this only affects unpatched materials (smoke cards) |
| `bias`, `normalBias` | -0.00025, 0.015 | -0.0006, 0.03 | world.ts:366 | normalBias is scaled by `Rr/12` (shadow box half-size) |

Shadow box (world.ts:361-366): half-size `Rr = clamp(dist*1.15 + 7, 12, 95)` m around the camera's look point,
golden `Rr >= 30` (long shadows at el 7°). Sun placed 220 m from the focus, shadow near 20 / far 480,
mapSize 4096 (world.ts:143). A `fill` DirectionalLight exists but intensity is forced to 0 (world.ts:367).

### 1.2 `LOOK` (type `WorldLook`, `lights.ts:38-63`) — world-only colours, all ON-SCREEN targets (pre-grade)

`world.ts` runs every one of these through `untone()` (shade.ts) so that after the Neutral tone map the pixel
shows exactly this hex (before the grade).

| Field | day | golden |
|---|---|---|
| `sky.c` / `sky.e` (deg) | #b8d0ec@0, #9cbfea@3, #6a9fe0@8, #4f8cdb@16, #3373cc@40 | #ffc47c@0, #f7ae78@4, #e8967c@10, #c4848e@20, #8a6f8a@40 |
| `water` near/mid/far | #22a7b6 / #167fb2 / #1a5596 | #1e3a6e / #355f96 / #d4a48e |
| `water` crest/trough/glint | #7ddfe8 / #0e4a80 / #ffffff | #d9a088 / #16294f / #ffe2b0 |
| `water.shade` (x in shadow) | [0.5, 0.56, 0.72] | [0.42, 0.46, 0.72] |
| `cloud` lit/mid/shade | #fbf8f1 / #e1e5f3 / #c3cbe9 | #ffd2a8 / #f2a08f / #a98fc4 |
| `bounce` (shade.ts uBounce) | [0, 0, 0] | [0.04, 0.02, 0.0] |
| `sat` (shade.ts uSat) | 1.08 | 1.1 |

Sky shader (world.ts:119-131): `el = asin(dir.y)`; four `smoothstep` mixes c0→c1 over [0, e1], c1→c2 over
[e1, e2], c2→c3 over [e2, e3], c3→c4 over [e3, e4]. Sphere radius 1100, BackSide, `depthWrite:false`,
`renderOrder -1`, layer NOINK, follows the camera (world.ts:377).

---

## 2. `shade.ts` — two-tone world shading + tone-map inversion (77 lines)

### 2.1 Shared uniform objects (module singletons!)
`TONE` (`shade.ts:7-12`) — defaults (always overwritten each frame by world.ts:368-369):

| Uniform | Default | Set from |
|---|---|---|
| `uLitCol` vec3 | (1.5, 1.44, 1.32) | LIGHTS.lit |
| `uShadeCol` vec3 | (0.6, 0.58, 0.86) | LIGHTS.shade |
| `uShadeLift` vec3 | (0, 0, 0) | LIGHTS.lift |
| `uLambert` | 0.35 | LIGHTS.lambert |
| `uSideK` | 0.84 | LIGHTS.sideK |
| `uTerm` | 0.2 | LIGHTS.term |
| `uBounce` vec3 | (0, 0, 0) | LOOK.bounce |
| `uSat` | 1 | LOOK.sat |

`CHAR` (`shade.ts:14-17`): `uCharTint` (1, 0.94, 0.92), `uCharShade` 0.86, `uGrad` 0.07, `uBodyGrad` 0.2,
`uSideTint` (0.92, 0.9, 0.96). Set from LIGHTS by world.ts:370-371.

Both objects are **assigned by reference** into every compiled program (`Object.assign(sh.uniforms, TONE)`,
shade.ts:49; `Object.assign(sh.uniforms, CHAR, CARD_K)`, cardshade.ts:70). So there is ONE light state for every
material in every canvas. See section 11 (crossfade bug).

### 2.2 `LFB` — capturing the sun's shadow visibility (`shade.ts:21-25`)
It takes three.js r175's `ShaderChunk.lights_fragment_begin` text and rewrites the directional-shadow line:
- before: `directLight.color *= (directLight.visible && receiveShadow) ? getShadow(directionalShadowMap[i] ...) : 1.0;`
- after: `sunVis = (...) ? getShadow(...) : 1.0;  directLight.color *= sunVis;`

Because three sorts shadow-casting lights first and only the unrolled loop index `< NUM_DIR_LIGHT_SHADOWS` (= 1,
only the sun casts) compiles the shadow block, `sunVis` is written exactly once, by the sun. Every patched shader
first declares `float sunVis = 1.0;` (shade.ts:52, cardshade.ts:73). `shade.ts:25` throws if three's chunk text
changed — the only guard of its kind.

### 2.3 `TWO_TONE` GLSL, step by step (`shade.ts:27-43`), injected AFTER `#include <lights_fragment_end>`
Runs only `#if NUM_DIR_LIGHTS > 0`.
1. `sunV = directionalLights[0].direction` — view-space unit vector toward the sun (light 0 = the sun).
2. `upV = normalize((viewMatrix * vec4(0,1,0,0)).xyz)` — world up in view space.
3. `ndl = max(dot(geometryNormal, sunV), 0)`.
4. `sunTerm = sunVis * smoothstep(0, uTerm, ndl)` — 0 = cast or form shadow, 1 = lit. The terminator is a soft
   ramp from N·L 0 to `uTerm` (day 0.2 ≈ the last 11.5° before grazing; golden 0.07 ≈ 4°).
5. `skyK = mix(uSideK, 1, 0.5 + 0.5*dot(N, up))` — up faces x1, walls x(1+sideK)/2 ≈ 0.92, down faces x sideK.
6. `lit = uLitCol * mix(1, ndl, uLambert)` — lit = litCol x (0.65 + 0.35·N·L).
7. `facing = max(dot(N, geometryViewDir), 0)` — 1 when the face looks at the lens.
8. `alb = max(mix(vec3(luma(diffuseColor)), diffuseColor, uSat), 0)` — albedo saturation around Rec.709 luma.
9. `directDiffuse = alb * ( mix(uShadeCol, lit, sunTerm) * skyK + uBounce * facing * clamp(1 - N·up, 0, 1) * (1 - sunTerm) ) + uShadeLift * LIFT_K * (1 - sunTerm)`.
   - `uBounce`: warm bounce on shaded, camera-facing, non-up faces (golden only).
   - `uShadeLift * LIFT_K`: an **additive** cool fill in shadow (not multiplied by albedo), so even black albedo
     gets a coloured dark. `LIFT_K` is a per-material `#define` (default 1; iron/steel/chain use 0.15,
     world.ts:165-166, 276).
10. `indirectDiffuse = 0` — hemisphere light and ambient are thrown away.

Kept from three: emissive and **specular** (MeshPhong) — specular uses `directLight.color` which already carries
`sunVis`, so highlights vanish in shadow. Thrown away: every other light's diffuse (point, spot, extra
directionals). Fog is still applied later by three's `fog_fragment`.

`twoTone(m, liftK = 1)` (`shade.ts:47-57`): sets `onBeforeCompile` (replaces any earlier one — not chained),
injects `DECL` (uniform declarations + `#define LIFT_K`), the `LFB`, and `TWO_TONE`; cache key
`"twoTone5_" + liftK.toFixed(3)`. Used by `lam()` and `toLambert()` in build.ts:17-46 (all world materials are
shared through module caches `mats` / `lamOf`) and directly in world.ts for iron, steel, chain.

Worked example (day, up-facing ground, sun el 48° so N·L = 0.743): lit = 1.58 x (0.65 + 0.35 x 0.743) ≈ **1.44**
x albedo; in shadow = **0.30** x albedo + (0.05, 0.06, 0.11). Before the tone map that is a ~4-5 : 1 lit/shadow
ratio on mid albedo.

### 2.4 Tone-map inversion: `neutral()` and `untone()` (`shade.ts:59-77`)
- `neutral(c)` is an exact JS copy of Khronos PBR Neutral: `x = min(r,g,b)`; `offset = x < 0.08 ? x - 6.25x² : 0.04`;
  subtract; if `peak = max < 0.76` return; else `d = 0.24`, `newPeak = 1 - d²/(peak + d - 0.76)`, scale to newPeak,
  desaturate toward white by `g = 1 - 1/(0.15·(peak - newPeak) + 1)`.
- `untone(target, out)`: target hex → linear (three's Color does sRGB→linear), each channel capped at 0.985
  (Neutral never reaches 1), then **60 fixed-point iterations** `c += target - neutral(c)` (clamped ≥ 0).
  Returns the linear value that the Neutral curve maps onto the target.
- Used for every self-lit colour whose on-screen value is a target: sky stops, fog, river colours (world.ts:374-396).
- It inverts ONLY the tone map, not the grade that follows. So `LOOK` hexes are "after tone map, before grade".

---

## 3. `cardshade.ts` — lighting the character cards (85 lines)

Card material = `MeshLambertMaterial({ map, alphaTest: 0.5, side: DoubleSide })` (cast.ts:73),
`alphaToCoverage = false` (cast.ts:74, "A2C + MSAA left 1 px sky-depth seams"), `receiveShadow = true`,
`castShadow` = LIGHTS.actorShadow (world.ts:435; the swing always casts), `renderOrder 1` (after blobs),
layer NOINK, a `customDepthMaterial` (RGBADepthPacking, alphaTest 0.5) so card shadows have the drawing's shape.
The drawing texture is a `CanvasTexture` in `SRGBColorSpace`, anisotropy 8 (cast.ts:26).

### 3.1 Constants (`cardshade.ts:12-15, 64`)
| Name | Value | Meaning |
|---|---|---|
| `GRAD_K` | 5.5 | head gradient = charGrad x 5.5, capped at 0.4 linear ("~14 % on screen after tone map/grade") |
| `GRAD_KB` | 1.6 | torso gradient = bodyGrad x 1.6 ("~10-15 % form shade on screen") |
| `TINT_K` | 0.55 | share of the preset light tint applied (keeps peach skin clean) |
| `uNorm` | 0.7 | exponent of the luma normalisation of the tint |
| `uGain` | 1.03 | overall gain ("faces ~.93 V") |
| `uPx` | 0.5 default | render height / 1920; set per draw in `Actor.mesh.onBeforeRender` (cast.ts:79) |

`CARD_K` is also a shared module object (fine: all canvases are the same size).

### 3.2 `CARD` GLSL, step by step (`cardshade.ts:19-59`)
It **replaces** three's line `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;`
(cardshade.ts:74). So no real light intensity reaches a card — only the sun's *direction* and *shadow visibility*.
1. `tintK = mix(1, uCharTint, uTintK)`; `tintK /= pow(max(luma(tintK), 0.2), uNorm)` (keeps face value about the
   same in day and golden). Result: day ≈ (1.019, 0.986, 0.974), golden ≈ (1.080, 0.949, 0.819).
   Note: `mix(1, tint, 0.55)` gives day (1, .967, .956) and golden (1, .879, .758) — exactly the "peach skin" tints
   that lighting.md 9.1 recommends.
2. `outgoingLight = diffuseColor.rgb * tintK` (texture colour x tint).
3. Inside `#if NUM_DIR_LIGHTS > 0`:
   - `side = sign(sunV.x) * smoothstep(0, 0.35, |sunV.x|)` — + = sun on screen right; saturates so a nearly
     frontal sun still shades one side.
   - `head = smoothstep(0.565, 0.6, vMapUv.y)` — head zone (v = 1 is the card top). `hw = mix(0.15, 0.2, head)` =
     half width in UV (torso ~89 units, head ~118 units of the 600-unit card).
   - `uu = clamp((u - 0.5)/hw, -1, 1) * sign(dFdx(u) + 1e-7)` — -1..1 screen left..right; the `dFdx` sign makes
     mirrored cards (negative x-scale) work.
   - `t = uu * side` — +1 = edge facing the sun.
   - `g = mix(uBodyGrad*uGradKB, min(uGrad*uGradK, 0.4), head)` → day head 0.385 / torso 0.32; golden 0.4 / 0.4.
   - `dark = smoothstep(-0.15, 0.9, -t)` — far-side ramp.
   - `sideK = mix(1, uSideTint, dark * clamp(g / max(min(uGrad*uGradK, .4), 1e-3), 0, 1.5) * 0.5)` — lavender far
     side (weight 0.5 on heads, 0.42 on day torsos).
   - `top = 1 + 0.05 * clamp((v - 0.69)/0.11, -1, 1) * clamp(2·dot(sunV, upV), 0, 1) * head` — top of head up to
     +5 % when the sun is high (head centre v .69, half height .11).
   - `lift = 1 + 0.04 * smoothstep(0, 0.9, t)` — sun-facing edge +4 %.
   - `outgoingLight *= mix(uCharShade, 1, sunVis) * (1 - g*dark) * sideK * top * lift * uGain`.
     In a cast shadow the card only dims to 0.86 (day) / 0.88 (golden).
4. **Golden warm inner rim** (`cardshade.ts:38-56`, only `#ifdef USE_MAP`):
   - `warm = smoothstep(0.2, 0.4, 1 - uCharTint.b)` → day 0 (1-.92 = .08), golden 1 (1-.56 = .44). So any preset
     with a warm (low-blue) charTint turns the rim on automatically.
   - `sl = length(sunV.xy)`; `d2` = its 2D direction; `duv = 2*uPx*(d2.x*dFdx(uv) + d2.y*dFdy(uv))` = the UV step
     of 2 output pixels (at 1080x1920) toward the sun on screen.
   - `edge = step(texture(map, uv + duv).a, 0.5)` — 1 if 2 px toward the sun is already outside the drawing.
   - `c1` sampled ~16 design units inward (`dirU * (0.027, 0.016)`), `c2` ~40 units inward (`(0.067, 0.04)`).
   - `skin` test: c1 opaque, r ≥ 0.3, r ≥ b + 0.12, g ≤ r + 0.02 (linear values) — catches all four SKINS.
   - `torso` test: v in [0.27, 0.57], c1 and c2 opaque, max channel ≥ 0.04 (thick parts only; skips rifles, legs, hats).
   - `rim = warm * smoothstep(0.1, 0.4, sl) * edge * max(skin*head, torso) * mix(0.6, 1, sunVis)`;
     `outgoingLight += vec3(0.95, 0.52, 0.16) * rim`.
   - With the golden default az 6° the sun's screen-space xy length is small (~0.16), so the rim is weak
     (smoothstep ≈ 0.09); it is strong in shots 11-12 thanks to SUN_SHOT az -70 / -30.
5. `cardShade(m)` (`cardshade.ts:67-78`) also zeroes `emissive`; cache key `"card9"`.
6. Cards still get three's **fog** (MeshLambert default `fog: true`).

### 3.3 `blobMaterial(map)` — ground contact shadows (`cardshade.ts:81-85`)
`MeshBasicMaterial` with custom blending `dst = dst x src` (ZeroFactor / SrcColorFactor, AddEquation) =
**multiply**; `transparent: false`, `depthWrite: false`, `fog: false`, `toneMapped: false`, polygonOffset -2/-2,
DoubleSide. Drawn at `renderOrder 0.5` (after ground at 0, before cards at 1; cast.ts:106). The textures come from
`toon.ts fxShadow / fxContact` with colours that are "sRGB-encoded linear multiply ratios": cast.ts `hexOf`
encodes `1-(1-v)*k` to sRGB, the texture is decoded back to linear on sampling, so the multiply factor is `v`.
Day contact = (0.2, 0.21, 0.33), golden (0.24, 0.2, 0.33), day tail (0.42, 0.44, 0.62) (cast.ts:206-207).

---

## 4. `toon.ts` — the 2D character painter (909 lines)

This is NOT a shader file. It draws the cast and all 2D effects onto `<canvas>` with Canvas2D. `cast.ts` keeps one
canvas per distinct drawing and uploads it as the card texture. The "toon look" of characters is painted here.

### 4.1 Design space and palette
- Design space **600 x 1000 units**, soles at **y = 975** (`toon.ts:5`); the canvas transform scales it (cast.ts
  tiers: 1800x3000 @3.0 under 3.2 m, 1080x1800 @1.8 under 6.5 m, 480x800 @0.8 under 16 m, 240x400 @0.4 beyond).
  1000 units = 2.16 m (`SU = 0.00216` m/unit, cast.ts:61).
- `INK = #241726` dark plum (characters.md: reference core #201628…#2f1d28) — all character outlines.
- `SKIN = #ffe2c2`; `SKINS = [#ffe2c2, #f5c9a0, #ecd0b6, #c99067]`; `WHITE #ffffff`; `MOUTH #5a1e28`; `TONGUE #e86e78`.
- Shadow multipliers, applied in **sRGB** space by `mul()` (matches how they were measured from hex pairs):
  `SH_SKIN [0.96, 0.86, 0.84]`, `SH_CLOTH [0.64, 0.66, 0.74]`, `SH_FELT [0.62, 0.62, 0.7]` (`toon.ts:12-14`).
- Colour helpers: `mul(hex, [r,g,b])`, `shade(hex, k)`, `mix(a, b, t)` (sRGB lerp) (`toon.ts:26-36`).
- `rnd(seed, k)` = `fract(sin(seed*127.1 + k*311.7)*43758.5453)` — deterministic per-character randomness (`toon.ts:38`).

### 4.2 Outfits (all story-specific)
`Outfit` fields (`toon.ts:17-21`): jacket, pants, boots, hat ("shako" | "shako_tall" | "cap" | "hair" | "tophat" |
"bonnet" | null), belt, buttons, rifle, sash, sword, moustache, skin, head, cap, hair, dress, build.
- `RIFLEMAN` jacket #357650, pants #3d4440, boots INK, shako, belt #f1efe6, buttons #d9dde0, rifle.
- `OFFICER` = rifleman + shako_tall, buttons #e8c45a, sash #c0353a, sword, moustache #4a3020, no rifle/belt, stout.
- `KID` jacket #f08a2c, pants #3b5b9a, boots #f4f1ea, cap #e2453c, build kid.
- `PARENT` jacket #7b5ac9, pants #3b3f52, boots #5a3b2a, hair #5a3b2a.
- `soldier(v)`: skin `SKINS[v%4]`, moustache #4a3426 (v%4 = 1) or #2a201a (v%4 = 3).
- `townsfolk(v)`: coats [#3f6fb5, #8c3b4a, #5d7a3a, #b5653f, #2f5f6a, #7b5ac9]; odd v = bonnet + dress
  [#d9a441, #c25a7a, #5a8fc2][v%3], even v = top hat.
- `BUILD` (`toon.ts:429-433`): adult {a 118, torso 1.1, legs 1.4, tw 0.8}; stout {118, 1.15, 1.32, 0.92};
  kid {112, 0.85, 1.0, 0.72}. `a` = head half-width in units; torso/legs in head-heights; tw = torso width / W.

### 4.3 `Pen` drawing API (`toon.ts:72-169`)
- `ol = 12` default outline width (design units). `rot = [angle, cx, cy, dx?, dy?]` = rotation applied to every point.
- `poly(pts, fill, ol?)` fill + INK stroke (round joins). `ell(...)` ellipse polygon (48 segments). `line()` thick
  limb with an INK rim `w + 2·ol·0.9`. `stroke()`, `arc()`, `dot()`, `clip()`, `band()` (strap with thin INK rim).
- **`shadedFill(pts, base, shadow, light, R, shift=.45, r0=1.05, r1=1.25)`** — the painted crescent: a radial
  gradient centred `shift·R` toward the light; base colour out to `r0·R` from that centre, shadow colour at `r1·R`.
  On the far side that means flat to ~0.6 R from the real centre, full shadow by ~0.8 R (matches characters.md:
  "flat out to r≈0.6R, falls off 0.6→0.8R"). Used on heads, hats, bonnets.
- **`gradFill(pts, base, shadow, light, flat=.22)`** — linear gradient along the light direction across the shape:
  base for the first 22 %, shadow at the far edge. Used on torsos and dresses.
- **`inkRing(pts, w0, thick, k=.45)`** — the thick-thin outline: width `w0·(1 + k·cos(θ - thick))`, θ measured from
  the contour centroid, drawn as an even-odd ring half inside, half outside the contour. Thick/thin ratio
  (1.45/0.55) = **2.64** (reference 2.9-3.5).
- `thickAngle(light) = atan2(-sin(light) + 0.8, -cos(light))` (`toon.ts:225`) — thickest side away from the light
  and pulled toward the ground. With the light from the upper left (-135°, the value cast.ts quantises to) it gives
  **64.9°** = bottom-right (reference octant max at +68°). `DEF_LIGHT = -120°` (gives 73°).
- `light` = canvas angle the light comes FROM; cast.ts `light2D` projects the scene sun onto the card and
  **quantises it to 45° steps** (cast.ts:156-159) so drawings can be cached.

### 4.4 Heads and faces
- `blobPts(cx, cy, Blob)` (`toon.ts:200-213`): superellipse with separate crown/jaw exponents (`2/nTop` for the upper
  half, `2/nBot` for the lower), egg taper `X *= 1 + egg·Y`, one-side bulge `1 + asym·sign(X)`, low-frequency noise
  (cos 2t, 3t, 4t with seeded phases), rotation. 72 points, clockwise on screen.
- `headBlob(seed, a=118, facing)` (`toon.ts:216-222`): b = a·(0.94 ± 0.04); nTop 1.75 ± 0.15; nBot 2.3 ± 0.15;
  egg -0.12 ± 0.03; asym 0.06-0.10 toward the facing side; tilt ±4°; noise 0.008.
- Outline width on heads/torsos `ow = 5u` where `u = W/100` (1 % of head width; adult W = 236 → u = 2.36 units →
  ow ≈ 11.8 units ≈ 2.5 cm in the world).
- `FACE` table (`toon.ts:234-249`), 14 expressions: neutral, stern, grin, laugh, whistle, nervous, shock, relief,
  relief_open, dazed, pained, smile, smile_closed, lick. Each = [back eye, front eye] kind, [inner, outer] brow
  offsets, mouth kind. Eye kinds: dot, small, lid, slit, happy, dash, squeeze, shock, shockHalf, spiral. Mouth kinds:
  dash, frown, smirk, smile, smileWide, grin, laugh (D-mouth with teeth band + tongue), o, O, wave, teeth, lick.
- Blinks: `lid` 0..1 → `eyeKind` closes eyes to "dash" at 1, half-lids at 0 < lid < 1 (`toon.ts:250-253`).
- `faceFront` (`toon.ts:308-325`): eyes 13u (12u for shock) each side of a centre slid 7u toward `facing`, brows
  20u up (17u under a brim), mouth 20u down, moustache tapers, nervous sweat drop #9fd4ff. No blush, no catchlights.
- `faceSide` (`toon.ts:328-339`): one eye at +27u, nose tick, mouth at +33u scaled 0.62.

### 4.5 Hats (`toon.ts:341-422`)
shako (body #3a3d47 / shadow #24262d, peak #16171b, badge #c9ccd2, green tuft #2b7a4b), shako_tall (+ gold band
#e8c45a), cap and hair (cut from the head contour at 0.3 / 0.42 of head height, hair gets a scalloped edge), top hat
(#2e2a36 with a jacket-coloured band), bonnet (#e9cf8f, brim #d6b46a, drawn partly behind the head).

### 4.6 Bodies
- `bodyFront(p, outfit, FrontOpts)` (`toon.ts:447-605`) modes march / stroll / stand / sit / fall. Bob 2.5 % of
  height (march) / 1.5 % (stroll), lowest at contact (phase 0, 0.5). Legs `mix(pants, INK, .55)` 5.8u wide, feet
  7.5u, arms `mix(jacket, INK, .5)` 5.2u with 5.5u ink-dot hands. Upper body sways ±1.6° (march) about the hips.
  Draw order: legs → rifle/sword/back arms → torso (gradFill + belts/sash/buttons clipped + inkRing) → front arms
  and props (icecream, hammer [strike 0..1], carried shako) → head (rotates with body + own tilt): hat-behind →
  head shadedFill + inkRing → hat → face.
- `bodySide(p, outfit, SideOpts)` (`toon.ts:627-728`): march with a planted stance foot sliding back at walking speed,
  cycloid swing foot, two-bone IK knees (`ik`, `toon.ts:616`), stride unit 370 units = 0.8 m, lean 4 + 3·cos(4π·phase)
  (7° at contact, 1° at passing); modes stand, swing (kid on swing, hip at SWING_HIP 733), push (parent).
- `swingKid` (`toon.ts:731-745`): 700 x 2300 canvas, pivot (350, 20), rope 1830 units, two ropes to a plank so it
  never reads as a hanging (SKILL.md readability trap), kid at 1.1 scale.

### 4.7 Effects (canvas sizes are fixed per function)
fxNote (music note), fxBurst 500² (impact star, t 0..1), fxSplash 800², fxPuff 300² (UNUSED), fxStars 420x210,
fxCreak 300², fxRing 600² (water rings), fxSign 700x520 (bridge-specific "no marching in step" sign, red #d42f2f X),
fxCloud 600x300 (UNUSED), fxShadow 128x256 (blurred multiply tail; uses `ctx.filter = "blur(9px)"`),
fxContact 128² (tight multiply pool), fxPlank 320x110, fxDrum 260x240, fxBlob 128² (UNUSED, imported by cast.ts only).

---

## 5. `ink.ts` — ink lines on the 3D world (393 lines)

### 5.1 Method (plain words)
Not an inverted hull, not Sobel on colour. It is a **screen-space edge detector on a world-only normal + depth
buffer**, drawn as a separate `Pass` before the depth of field:
1. Re-render the WORLD ONLY (camera layer 0; layer `NOINK = 3` turned off) with one override material that writes
   view-space normals (rgb) and coverage (a = 1), plus a depth texture. Characters, effect cards, sky, clouds, smoke
   live on NOINK, so they never get rectangle outlines.
2. Edge mask: for every pixel walk 1..RMAX px along 4 directions (x, y, both diagonals):
   - **depth edges**: signed 2nd difference of 1/z. It is exactly 0 on any plane (no false lines on grazing floors).
     Only the NEAR side of a jump gets ink, as a band `w` px wide (silhouettes, object vs object, thin ropes).
   - **creases**: normal angle to a neighbour at the same depth; two-sided; concave folds weaker.
   - Coverage is continuous in the width → no width popping, built-in anti-aliasing.
   - No world ink where the main depth buffer has something nearer (a character card in front).
3. Composite: 3x3 tent filter (anti-aliasing), ink colour blended in **display gamma** (like Canvas2D), optional
   fog tint far away, written back into the composer's colour buffer (depth untouched).

### 5.2 Options and defaults — final code vs original recipe vs reference

| Option (uniform) | Final `DEF` (ink.ts:49-56) | outlines.md recipe | Reference measured |
|---|---|---|---|
| `color` (compMat.inkColor) | **#030303** | #0b0a0c | near-black, in-focus core luma 0-10 |
| `strength` | 1.0 | 1.0 | – |
| `widthNear` (wNear) px @1080x1920 at `distNear` | **5.1** at 6 m | 3.4 | silhouettes EW ~3.1 px (3.36 near) |
| `widthFar` (wFar) at `distFar` | **3.3** at 90 m | 2.2 | 2.15-2.8 far |
| `creaseScale` | **0.8** | 0.64 | creases EW 2.17 px |
| `depthLo` / `depthHi` | **0.01 / 0.03** | 0.02 / 0.05 | – |
| `angleLo` / `angleHi` (→ cosLo/cosHi) | **35° / 50°** (0.819 / 0.643) | 50° / 65° | – |
| `concaveGain` | 0.7 | 0.7 | contacts weak, room-shell joins none |
| `farOpacity` | **0.95** | 0.75 | far lines lighten to core ~50 |
| `fadeNear` / `fadeFar` (m) | 150 / 450 | 150 / 450 | – |
| `pxScale` (not an option) | height/1920 (ink.ts:321) | – | – |
| `fogStart` (not an option) | 60 m (ink.ts:286) | – | far ink lifts ~15 % |
| `fogInk` (not an option) | 0.3 (ink.ts:291) | 0.6 (depth.md) | – |
| `RMAX` (#define) | **9** (ink.ts:126) | 6 | – |

The round-2/3 reviewer asked for "world outlines ~1.5x thicker, pure black" (ink.ts:50-54), so the final lines are
deliberately THICKER than the measured reference (5.1 px vs ~3.1 px).

Derived line widths (silhouette, `w = mix(wNear, wFar, t)·pxScale`, `t = clamp(log(z/6)/log(90/6))`):
3-6 m 5.1 px · 12 m 4.64 · 25 m 4.15 · 50 m 3.69 · 90 m+ 3.3 (at 1080x1920). At 1440x2560 multiply by 1.333
(6.8 px near). At 540x960 stills x0.5. Crease total width = w x 0.8 (half width `hc = 0.5·w·creaseScale` each side).
Opacity x `mix(1, 0.95, t)` x `(1 - smoothstep(150, 450, z))`.

### 5.3 Shaders
- `FS_VERT` (ink.ts:58-60): full-screen triangle-pair, `gl_Position = vec4(position.xy, 0, 1)`.
- `NORMAL_VERT` (ink.ts:64-78): three chunks `beginnormal_vertex`, `defaultnormal_vertex` (handles InstancedMesh),
  `begin_vertex`, `project_vertex`; outputs view normal `vN`, view position `vV`, cut-out UV `vCut = cutUv·uv`.
  **No skinning / morph chunks** (animated GLB characters would be drawn in bind pose here).
- `NORMAL_FRAG` (ink.ts:79-91): discards where `cut > 0 && texture(tCut, vCut).a < cut` (keeps alpha-cut shapes);
  normal = `normalize(cross(dFdx(vV), dFdy(vV)))` if the mesh has no normals, else `normalize(vN)` flipped for back
  faces (`gl_FrontFacing`); writes `vec4(n, 1)`.
  `normalMat.onBeforeRender` (ink.ts:266-275) copies each object's `map` + `alphaTest` (per geometry group) into
  `tCut / cut / cutUv` — so the church clock / sign keep their cut-out outline.
- `MASK_FRAG` (ink.ts:93-183), uniforms: tNormal, tDepth, tMainDepth, texel, cNear (0.2), cFar (1500), p00, p11
  (projection matrix [0] and [5], set per frame), wNear, wFar, dNear, dFar, creaseScale, depthLo, depthHi, cosLo,
  cosHi, concaveGain, farOpacity, fadeNear, fadeFar, strength, useMain, pxScale, fogRange (fog near/far), fogStart.
  - `dist(t, uv) = -perspectiveDepthToViewZ(textureLod(t, uv, 0).x, cNear, cFar)` — metres along the view axis.
  - `viewPos(uv, d)` rebuilds the view-space position (assumes a symmetric, centred projection).
  - main(): skip if `nc.a < 0.5` (sky/empty → no ink); main-depth occlusion: min of 5 taps (centre + 4
    neighbours) of the composer depth; `if (zm < zc·0.985 - 0.03)` → no ink (something ≥ 1.5 % + 3 cm nearer).
  - Loop `a` = 4 directions (`STEP` (1,0),(0,1),(1,1),(1,-1); `SLEN` 1, 1, 1.414, 1.414), `r = 1..RMAX`:
    `d = (r - 0.5)·SLEN`; `cw = clamp(w + 0.5 - d, 0, 1)`; `ch = clamp(hc + 0.5 - d, 0, 1)`; break when both ≤ 0.
    Depth: `s = (1/z1 + 1/z2 - 2/zc)/(1/zc)`; `eD = max(eD, smoothstep(depthLo, depthHi, -s)·cw)` (−s ≈ the one-sided
    relative depth jump, so lines start at a 1 % jump and are full at 3 %).
    Crease (`crease()`, ink.ts:133-139): ignore if neighbour is sky or `|zq - zc| > zc·depthLo` (so `depthLo` is ALSO
    the "same depth" tolerance); `k = 1 - smoothstep(cosHi, cosLo, n0·nq)`; × `concaveGain` if the neighbour lies in
    front of this pixel's tangent plane (`dot(viewPos(uq) - P0, n0) > 0`).
  - Output `vec4(ink, fogK, 0, 1)` into an 8-bit RGBA target; `fogK = clamp((z - max(fogNear, 60))/(fogFar - that))`.
    Day: 0 at 60 m, 0.17 at 100 m, 0.58 at 200 m, 1 at 300 m. Golden: 0.13 at 100 m, 0.44 at 200 m, 1 at 380 m.
- `COMP_FRAG` (ink.ts:185-211): `a` = 1-2-1 tent (weights 4/2/1, /16) of the mask R; `debug 1` = mask view,
  `debug 2` = normal view; `fk` = max of G over centre + 4 neighbours; `inkC = mix(inkColor, fogColor, fk·fogInk)`;
  `out = pow(mix(pow(c, 1/2.2), pow(inkC, 1/2.2), a), 2.2)` (gamma blend so the measured width = coverage width;
  a linear blend "reads ~30 % thinner").
- `COPY_FRAG` (ink.ts:213-219): copies the temp target back, with `#include <colorspace_fragment>`.

### 5.4 `InkPass.render()` (ink.ts:324-368)
Save autoClear, shadow autoUpdate, layers, overrideMaterial, background, clear colour → disable NOINK, set
`scene.overrideMaterial = normalMat`, `background = null`, **`shadowMap.autoUpdate = false`** (shadows are not
re-rendered), clear to (0,0,0,0), render into `rt` → restore everything → set cNear/cFar/p00/p11 and fog uniforms
(only for `THREE.Fog`, not FogExp2) → mask into `maskRT` → composite into `tmpRT` → copy into `inputBuffer` (or the
screen if `renderToScreen`). `needsSwap = false`, `needsDepthTexture = true`; `setDepthTexture` hands in the
composer depth (`useMain = 1`). Targets (ink.ts:247-259): `rt` HalfFloat RGBA + UnsignedInt DepthTexture, Nearest,
samples 0; `maskRT` UnsignedByte, Nearest; `tmpRT` HalfFloat, Linear. All resized to the output in `setSize`.
`set(options)` (ink.ts:300-309) live-tunes widths/thresholds/colour (not fogStart/fogInk). `debug` = 0/1/2.

### 5.5 `noInkFallback(root)` (ink.ts:382-393)
Called every frame on `world.root` (Bridge.tsx:77). For every Mesh/Sprite/Points/Line not already exactly on
NOINK: move it to NOINK if it has a `customDepthMaterial` (cards), is a Sprite/Points/Line, has any material with
`depthWrite === false` (sky, clouds, smoke, soft fx, blobs), or any `MeshBasicMaterial` with `alphaTest > 0`
(effect cards, the sign board). Note: `layers.set` replaces the mask; it does not touch children.

---

## 6. `lensblur.ts` — thin-lens depth of field + film grain (139 lines)

### 6.1 Formula (`lensblur.ts:17-28`)
`s = resolution.y / 1920` (all px values are specified at 1080x1920 and scaled).
`cocAt(d) = clamp(cInf·s·(1 - focus/d) [× nearScale if negative], ±maxCoC·s)`.
- `focus` (m, along the view axis; default 10) — set per frame: `max(0.3, (focusPoint - camPos)·camForward)`
  (Bridge.tsx:82). Focus point = `dofAt(f).focus(f)` or the camera's look target.
- `cInf` (px radius at infinity; 0 = off) from `dofAt(f)` (story.ts DOF table). Whole effect is skipped when
  `cInf < 0.25` (lensblur.ts:31).
- `nearScale` 1.2 (extra blur in front of focus), `maxCoC` 24 px (Bridge.tsx:57).
- Sky has depth 1 = far plane 1500 m → full `cInf`.

### 6.2 Gather algorithm (`mainImage`, lensblur.ts:30-68)
1. `r0 = |coc(d0)|`, `R = r0·SPREAD`. Start `acc = own colour`, `wsum = 1`.
2. If `R > 0.5`: `TAPS` samples on a **Vogel / golden-angle spiral** (`rr = sqrt((i+.5)/TAPS)·R`,
   `angle = i·2.39996 + ROT`). For each sample: `rs = |coc(ds)|·SPREAD`; if the sample is farther than this pixel,
   `rs = min(rs, R)` (background never bleeds over a nearer pixel = clean silhouettes, no halo); weight
   `w = clamp(rs - rr + 0.5, 0, 1)` ("does the sample's own disc reach me?"); renormalise by `wsum`.
3. `#if NEAR_TAPS > 0` (main stage only): 32 samples over the full `M = maxCoC·s` disc, skipping `rr ≤ R`, only
   samples nearer than `0.97·d0`; `w = clamp(|coc(ds)| - rr + 0.5)`; coverage `cov += w·M²/max(rs², 1)`;
   `col = mix(col, fg/fw, clamp(cov/NEAR_TAPS))` → a blurred foreground spreads over sharper pixels behind it.
4. Fixed pattern, **no per-pixel noise** (the depth.md recipe used a per-pixel hash rotation; removed) → no grain,
   no frame-to-frame flicker.

### 6.3 Two stages (`lensblur.ts:70-72`, `LensBlur` class 94-104)
- `PRE`: 16 taps, SPREAD 0.287, no near taps, ROT 0.61.
- `MAIN`: 64 taps, SPREAD 0.958, 32 near taps, ROT 0.
- Disc of 0.958 R convolved with disc of 0.287 R → total sigma = sqrt(0.479² + 0.1435²)·R = **0.500·R** (a uniform
  disc of radius R has sigma R/2). The pre pass fills the gaps between the 64 main taps (≈ 1024 effective taps).
- Both are `EffectAttribute.DEPTH | CONVOLUTION`, so R3F postprocessing gives each its own EffectPass.
- Setting `lens.focus` / `lens.cInf` sets both stages.

### 6.4 `GrainEffect` (lensblur.ts:106-139) — OFF by default (`post.grain: false`, Bridge.tsx:27)
Monochrome value noise in display gamma: cell `cellPx` 1.5 px @1080 (scaled), lattice hashed with PCG and the frame
number (`seed = f`, Bridge.tsx:85, deterministic), smoothstep interpolation, std normalised by 0.2145, amount 0.025,
weight `0.25 + 0.75·clamp(4l(1-l))` (less in deep black and near white). Needs WebGL2 (`uint`). SKILL.md: grain made
the 2K file 910 MB instead of ~250 MB; the reference has none.

---

## 7. `grade.ts` — colour grade (179 lines)

### 7.1 Shader (`grade.ts:18-65`), runs after the Neutral tone map, on display values
1. `src = encode(linear)` — exact sRGB encode (clamped 0..1).
2. Tone curve per channel: monotone cubic Hermite through 7 knots at x = 0, .1, .25, .5, .75, .9, 1
   (`gradeKy[7]` values, `gradeKm[7]` tangents from `monoTangents`, Fritsch-Carlson, grade.ts:75-85).
3. Saturation around luma Y' (Rec.709 weights on encoded values), 3 zones: `wS = 1 - smoothstep(0, .55, y)`,
   `wH = smoothstep(.45, 1, y)`, `wM = 1 - wS - wH`; `s = sat.y + (sat.x - sat.y)wS + (sat.z - sat.y)wH`.
4. Split tone: `c += wS·tintS + wM·tintM + wH·tintH`, each tint a zero-luma RGB offset built from (Cb, Cr) with
   BT.709 basis `E_CB = (0, -0.18733, 1.8556)`, `E_CR = (1.5748, -0.46813, 0)` (grade.ts:68-71).
5. Vignette: `r = length(uv·2 - 1)·0.7071` (1 at the corners, elliptical in pixels); `c *= 1 - k·smoothstep(r0, 1, r)`.
6. Clamp, `out = decode(mix(src, c, gradeAmount))`.

### 7.2 Presets
| Preset | ky (x = 0,.1,.25,.5,.75,.9,1) | sat S/M/H | tint S / M / H (Cb, Cr) | vignette k, r0 | Used? |
|---|---|---|---|---|---|
| `GRADE_DAY` (fit2.py fit to old stills) | .0345 .1828 .3812 .6605 .8814 .9631 1 | .9831 1.2727 1.4573 | (-.0291,.0411) (.0376,-.0104) (.0144,-.0047) | .10, .45 | no (kept for reference) |
| `GRADE_GOLDEN` (fit) | .0311 .1877 .4017 .6754 .875 .9582 1 | .8316 .8799 1.7061 | (.0528,.0004) (.0583,-.0003) (0,0) | .16, .40 | no |
| **`GRADE_DAY2`** (round-2 hand re-fit) | 0 .1 .28 .6 .835 .945 1 | 1.0 1.05 1.0 | (.01,.002) (0,0) (.006,0) | .12, .45 | **yes** |
| **`GRADE_GOLDEN2`** | 0 .09 .245 .54 .8 .93 1 | 1.0 1.12 1.15 | (.02,.002) (0,0) (-.012,.006) | .20, .40 | **yes** |

Computed tangents: DAY2 [1.0, 1.0843, 1.2354, 1.084, 0.8155, 0.6226, 0.55]; GOLDEN2 [0.9, 0.9577, 1.0958, 1.1056,
0.9383, 0.769, 0.7]. Tint offsets in /255: DAY2 shadows (+0.8, -0.7, +4.7) (faint violet), highlights (0, -0.3, +2.8);
GOLDEN2 shadows (+0.8, -1.2, +9.5) (blue-violet), highlights (+2.4, -0.1, -5.7) (orange).
`GRADES = {day: DAY2, golden: GOLDEN2}` (grade.ts:169); `GRADE_STRENGTH = {day: 1, golden: 1}` (grade.ts:173).
`GradeEffect.set(p, q?, t)` can blend two presets (unused by Bridge). `gradeFor(fx, light)` (grade.ts:175-179) calls
`set` only when the light changes (cached on `fx._light`) and sets `amount` every frame.
Each `Inner` (crossfade layer) owns its own GradeEffect, so grade presets DO crossfade correctly.

---

## 8. Composer wiring that these files depend on (`Bridge.tsx`)

- `<ThreeCanvas width=1080 height=1920 shadows gl={{antialias:false, stencil:false, powerPreference:"high-performance", toneMappingExposure:1.0}} camera={{fov:40, near:0.2, far:1500}}>` (Bridge.tsx:98-99).
  `post.dpr` input prop forces the buffer size for test stills (R3F clamps dpr ≥ 1).
- `<EffectComposer multisampling={4}>` (MSAA 4; R3F postprocessing uses a HalfFloat buffer and turns the renderer's own
  tone mapping off).
- Order: ink → lens.pre → lens.main → bloom → tone (NEUTRAL) → grade → grain. Toggles via Remotion inputProps
  `{ post: { ink, lens, pre, bloom, grade, grain } }` — defaults all true except grain (Bridge.tsx:26-27).
- Bloom (Bridge.tsx:32-38): `BloomEffect({ blendFunction: ADD, intensity 0.5, luminanceThreshold 1.0, luminanceSmoothing 0.2, mipmapBlur true, levels 6, radius 0.6 })`;
  its mip chain is forced to a 1920-high base whatever the output size (so the glow is ~1.5 % of frame height at any
  resolution). Threshold 1.0 = only HDR emissives glow (sun disc colour (6.0, 4.4, 2.4), world.ts:135; additive
  halo sprite). White faces never bloom (reference rule).
- Crossfades: `layersAt(f)` (story.ts:69-75) returns `[{id: s.id-1, alpha 1}, {id: s.id, alpha (f - (s.a - x/2) + 1)/(x+1)}]`
  for `XFADE = {9:6, 11:8, 12:8, 13:8, 14:8, 15:8}` frames; each layer is its own `ThreeCanvas` + `Inner` + `World`
  (Bridge.tsx:112), stacked with CSS opacity. White flash at frame 130 for 4 frames (opacity 1, .75, .45, .2).

---

## 9. How the code maps to the measured reference style

| Look element | Reference measurement (reports) | Code | Match? |
|---|---|---|---|
| World ink width | ~3.1 px @1080 silhouettes, 2.2 creases, near-constant on screen (outlines.md 2.1) | 5.1 → 3.3 px log-distance, creases x0.8 | thicker on purpose (reviewer) |
| World ink colour | near-black, use #0b0a0c | #030303 | darker on purpose ("pure black") |
| Ink before DOF | lines blur with background | InkPass before LensBlur | yes |
| No ink on cards, no doubles | world ink never boxes cards | NOINK layer + main-depth occlusion | yes |
| No lines on wall/floor joins, horizon | none in reference | concaveGain 0.7 still draws concave folds; sea horizon has no geometry edge | partly (interiors would need concaveGain 0) |
| Far ink lift | ~15 % toward horizon colour | fog tint x0.3 beyond 60 m | yes |
| Character ink | plum #201628-#2f1d28, thick/thin 2.9-3.5, thick bottom-right | #241726, ratio 2.64, thickAngle 64.9° | close |
| Head crescent | flat to 0.6R, falls to 0.88-0.89x by 0.8R | shadedFill shift .45, r0 1.05, r1 1.25, SH_SKIN luma ≈ .87 | yes |
| Head value | V ≈ .97 in every light, side gradient ~14 % | uGain 1.03, tint normalised, head g .385-.4 | yes (by design comments) |
| Rim light | heads "rim 1.03 (none)"; "no rim lines" at sunset | golden warm inner rim added | **deviation** (review choice) |
| Day key | side-back az 50-70°, el 40-55° | az 75, el 48 | yes |
| Sunset key | backlit az 0-40°, el 3-15° | az 6, el 7 | yes |
| Day shadow ratio | lighting.md: shade/lit Y .49-.52 (≈2:1); grade.md: lit/shadow 2.8-4.4:1 | shade .30 vs lit ~1.44 (≈4-5:1 + additive lift) | follows grade.md, darker than lighting.md (the two reports disagree) |
| Sunset shadow | violet-blue, B ratio 1.35-3.04 | B .30/.24 = 1.25 + lift .17 | yes after lift |
| Character ground shadow | day soft blobs, sunset long figure shadows | day contact + tail blobs, golden real card shadows | yes |
| DOF | on ~1/3 of shots, cInf CU 12-14, MS 10-12, FS 8, WS 5; thin-lens shape | thin-lens gather, maxCoC 24, nearScale 1.2, table in story.ts | yes |
| Bloom | emissive only, e-fold 21-31 px @1080 | threshold 1.0, levels 6, radius .6 | yes |
| Fog | fog colour = horizon, day 25→420 m, golden 20→360 | day #b8d0ec 25→300, golden #efb489 50→380 | tuned |
| Day sky | upper #5e93d9 at ~20°, horizon #9fb6e6 | 5 stops #b8d0ec → #3373cc | deeper on purpose (survives grade) |
| Grade | day median Y' .571, golden .52, vignette D k .06 / G .11 | DAY2/GOLDEN2 gentle S-curves, vig .12 / .20 | hand re-fit |
| Grain | none measured | off by default | yes |

---

## 10. Performance knobs (cost per frame at 1440x2560)

- **InkPass**: one extra full world render (normals + depth, no shadows re-render), then a full-res mask with up to
  4 dirs x RMAX 9 steps x (2 depth + up to 2 normal fetches) + 5 main-depth fetches; the loop breaks early once
  coverage is 0 (for 5.1 px: ~6 straight + 4 diagonal steps). Knobs: `RMAX`, widths, `fadeFar`, `creaseScale` (0 =
  no normal fetches), `post.ink: false`. outlines.md: ~30-60 ms/frame in the toy harness.
- **LensBlur**: pre 16 taps + main 64 + 32 near taps (2 fetches each). Fully skipped when `cInf < 0.25`. Knobs:
  `TAPS/NEAR_TAPS` in `PRE/MAIN`, `maxCoC`, `post.pre: false`.
- **Bloom**: 6 mip levels from a 540x960-equivalent base; cheap.
- **MSAA 4** on the half-float composer buffer.
- **Shadow map 4096²** PCFSoft (world.ts:143).
- **Grain**: shader is cheap but quadruples video file size — keep off.
- **Card canvases** up to 1800x3000 per close character (cast.ts tier) — memory/upload cost.
- **`noInkFallback`** traverses the whole scene every frame (cheap but O(objects)).
- Every crossfade mounts a second `ThreeCanvas` (new WebGL context + new `World` + shader compiles + texture uploads).
- SKILL.md: 2K renders run ~4 fps (~10 min for 67 s); stills at 0.5 scale 3-8 s each after a ~40 s bundle.

---

## 11. Verified: day ↔ golden crossfade draws the outgoing layer with the incoming light

**Verdict: CONFIRMED at the code level.** The only caveat is GPU-draw timing, explained below.

Evidence chain:
1. `TONE` and `CHAR` are module-level singletons (`shade.ts:7-12`, `shade.ts:14-17`).
2. Every world material shares the SAME uniform objects: `Object.assign(sh.uniforms, TONE)` (`shade.ts:49`); every
   card: `Object.assign(sh.uniforms, CHAR, CARD_K)` (`cardshade.ts:70`). World materials are also shared objects via
   the `mats`/`lamOf` caches (`build.ts:14-46`).
3. The only writer is `World.update()` → `TONE.* = LIGHTS[s.light]…`, `CHAR.* = …` (`world.ts:368-371`), called
   in the **React render body** of each `Inner` (`Bridge.tsx:76`). Nothing restores them before a canvas draws
   (no `scene.onBeforeRender`, no `useFrame` hook writes them).
4. During a crossfade two `ShotView`s are rendered in order: base = outgoing shot `s.id - 1`, then over = incoming
   shot `s.id` (`story.ts:72`, `Bridge.tsx:112`). So the over layer's `update()` runs last and wins.
5. The GPU draws happen later, in R3F's frame loop (the EffectComposer renders in `useFrame`; @remotion/three is
   not in this repo, but it drives R3F by invalidating the canvas on frame change rather than drawing inside the
   React render), after both `Inner` bodies have run. Both canvases therefore draw with
   the INCOMING shot's TONE/CHAR values. (If some scheduler ever drew canvas A before canvas B's `Inner` ran, the
   bug would not show on that frame — so the result even depends on timing, which is itself a defect.)
6. What stays correct per layer: sky stops, fog, water colours (`this.skyMat`, `this.fog`, `this.WU` are per World),
   sun direction and shadows (per World / per renderer), the grade preset (one GradeEffect per Inner), lens blur.

Affected frames (shots from `story.ts:55-60`, XFADE from `story.ts:64`):
- **10 (day) → 11 (golden)**: frames **1299-1306** (`s.a = 1303`, x = 8). The outgoing day river shot is drawn with
  golden world tones (lit [1.5, .68, .24], shade [.15, .15, .3]), golden card tint and the golden warm rim
  (`warm` = 1 because uCharTint.b = .56) — under a day sky, day fog and day grade. Because the base layer has alpha 1
  for the whole fade, the day shot visibly "pops" orange at frame 1299.
- **13 (golden) → 14 (day)**: frames **1731-1738** (`s.a = 1735`). The outgoing golden shot loses its orange/violet
  lighting and rim, under its golden sky and grade.
- Same-light crossfades (8→9 day, 11→12, 12→13 golden, 14→15 day) are unaffected (same values).

Suggested fix (not applied — read-only study): write TONE/CHAR right before each canvas draws, e.g. store the
preset on the World and set the uniforms in `scene.onBeforeRender` (three calls it at the start of every
`renderer.render(scene, …)`, i.e. the composer's RenderPass), or in a `useFrame` with a priority that runs before the
composer. Alternatively give each World its own cloned uniform objects (but then materials must not be shared
between Worlds, because `build.ts` caches them module-wide). Verify by rendering frames 1300 and 1732 with
`post.grade: false` and comparing to frames 1298 and 1730.

---

## Bugs / contradictions

1. **Crossfade light leak** — see section 11 (shade.ts:7-17 + world.ts:368-371 + Bridge.tsx:76,112 + story.ts:72).
2. **Stale header comments in ink.ts:14-17** still describe the recipe ("crease … ~50 deg", "~0.64*width",
   "3.4 px at 6 m -> 2.2 px at 90 m", "opacity to 0.75"), while `DEF` is 35-50°, 0.8, 5.1→3.3 px, 0.95 (ink.ts:52-55).
   Also "pixel steps 1..6" (ink.ts:10) vs `RMAX 9` (ink.ts:126).
3. **`depthLo` has two jobs** (ink.ts:135 and 173): depth-jump start AND the "same depth" tolerance for creases.
   Lowering it to 0.01 also drops crease detection between neighbours more than 1 % apart in depth (grazing
   far surfaces). Tune them separately if creases vanish on far roofs.
4. **`fogStart` (60 m) and `fogInk` (0.3)** are not in `InkOptions` and not settable by `ink.set()` (ink.ts:286, 291).
   Fog tint only works with `THREE.Fog` (linear), not `FogExp2` (ink.ts:351).
5. **grade.ts:170-173 comment contradicts code**: says "day 0.65 / golden 0.45 land at .54-.62 / ~.52", but
   `GRADE_STRENGTH = { day: 1, golden: 1 }`.
6. **grade.ts:155 comment** says the day preset presses "darks (.1 -> .085)", but `GRADE_DAY2.ky[1] = 0.1`
   (grade.ts:158). The golden comment (.1 → .09, .5 → .54) does match.
7. **grade.ts:3-5 comment** says the presets were fitted to old stills and "will over-correct" — true for
   `GRADE_DAY/GOLDEN`, which are now unused (`GRADES` uses DAY2/GOLDEN2). Dead presets kept in the file.
8. **Dead fields in `LIGHTS`**: `blob` (cast.ts uses its own CONTACT/TAIL), `top`, `hor`, `skyCurve` (sky uses
   `LOOK.sky`). SKILL.md:87 even quotes "sky top #3e7fd2" — that is the unused `top` field, not the real sky
   (real top stop is `#3373cc` at 40°). `sunCol/sunI/sky/ground/hemiI` look important but barely matter (only
   Phong specular and smoke).
9. **`TONE` defaults** (shade.ts:8, e.g. shade (0.6, 0.58, 0.86)) match neither preset; harmless because world.ts
   overwrites them every frame, but misleading as documentation.
10. **Card zones are hard-coded for a standing adult** on the 600x1000 card (cardshade.ts:17-18, 28-35, 49-52):
    head v ≥ 0.565-0.6, head centre v .69, torso band v .27-.57. A kid's head (chin v ≈ .42, head centre ≈ .52)
    and every *sitting* character (head centre ≈ .42) get torso-zone shading (wrong width, bodyGrad, no `top`, and the
    golden rim uses the torso test on the head). The swing card (700x2300 canvas, different geometry) does not
    match the zones at all.
11. **Only the LFB patch is guarded** (shade.ts:25). The other `.replace()` targets (`#include <common>`,
    `#include <lights_fragment_end>`, and the exact `vec3 outgoingLight = …` line in cardshade.ts:74) fail SILENTLY
    if three.js changes them: the material would render with stock Lambert and no error.
12. **CARD uses `vMapUv` outside `#ifdef USE_MAP`** (cardshade.ts:28-35): a card material without a map would not
    compile. Cards always get at least the 2x2 `blank` texture (cast.ts:60), so it works today.
13. **The golden rim contradicts the reference** (lighting.md table: heads "rim 1.03 (none)", sunset "no rim lines");
    it was added by review. Keep or drop consciously.
14. **Day shadow darkness**: lighting.md targets shade/lit Y .45-.55 (≈2:1) while grade.md targets 2.8-4.4:1; the code
    (shade .30 vs lit ≈1.44, plus additive lift) follows the darker grade.md side. The reports contradict each other.
15. **Ink is thicker than measured** (5.1 px vs ~3.1 px) and grade.md wanted ink at 2-2.6 % of pixels; reviewer
    preference won. Note it if a new story wants the exact reference look.
16. **TWO_TONE throws away all non-sun diffuse light** (shade.ts:38-40): point/spot lights (lanterns, windows) and
    the hemisphere light do nothing on world materials; cards ignore every light except the sun direction + shadow.
    A second shadow-casting directional light would overwrite `sunVis` (last unrolled index wins).
17. **`twoTone()` replaces `onBeforeCompile`**: world.ts:276 wraps the already-twoToned cached `chainHD` material again
    (build.ts:23) — works only because the second call fully replaces the first; any other `onBeforeCompile` set
    earlier is lost silently.
18. **InkPass normal pass has no skinning/morph support** (ink.ts:64-78): animated (skinned) GLB models would get ink
    drawn at their bind pose. Vertex-displaced water would also mismatch (outlines.md 5.3: put it on NOINK).
19. **`viewPos()` assumes a centred symmetric projection** (ink.ts:130): `camera.setViewOffset` / lens shift breaks
    the concave test.
20. **toon.ts dead code**: `fxPuff`, `fxCloud`, `fxBlob` are never used (fxBlob is imported by cast.ts:8 but not
    called).
20b. **toon.ts:730 comment says the swing kid is "drawn at 0.92 scale"**, but the code uses `k = 1.1`
    (toon.ts:732, applied at 740-741).
21. **Minor**: duplicated trailing comment on cardshade.ts:27; Bridge.tsx:63 disposes only the ink pass (not lens,
    bloom, grade, grain) when an Inner unmounts. Related (cast.ts, outside this slice): `ROOTS` (cast.ts:66) never
    removes World roots, so every crossfade's World stays referenced.

## Hard-coded paths & versions

- **Version pins** (references/reports/CONTEXT.md:29-30, depth.md:285, grade.md:295): three **0.175** (r175),
  postprocessing **6.37.2**, @react-three/postprocessing **3.0.4**, @react-three/fiber **9.1.2**, Remotion
  **4.0.290**. Code depends on:
  - three r175 chunk text and variable names: `lights_fragment_begin` shadow line (shade.ts:22-24), `geometryNormal`,
    `geometryViewDir` (shade.ts:32-37), `vMapUv` (cardshade.ts), the MeshLambert `outgoingLight` line
    (cardshade.ts:74), `perspectiveDepthToViewZ` from `<packing>` (ink.ts:129), `<colorspace_fragment>` (ink.ts:218).
  - postprocessing 6.37 Effect API: `mainImage(inputColor, uv[, depth], out)`, `getViewZ`, `readDepth`, `texelSize`,
    `resolution`, `inputBuffer`, `EffectAttribute.DEPTH | CONVOLUTION`, Pass API `needsDepthTexture`,
    `setDepthTexture`, `needsSwap`, `renderToScreen`.
  - @react-three/postprocessing 3.0.4 behaviour: CONVOLUTION effects get their own EffectPass; a `Pass` primitive is
    kept separate (this is why ink and lens blur are not merged with bloom/tone/grade).
  - **WebGL2 / GLSL ES 3.00**: array constructors (ink.ts:124-125), `textureLod`, `uint` + bit ops (PCG grain).
- **Resolution constants**: every pixel size is specified at **1080x1920** and scaled by `height / 1920`
  (ink.ts:321, lensblur.ts:32 and 119, cast.ts:79 → cardshade `uPx`, Bridge.tsx:36 bloom). Final renders at
  1440x2560 (scale 1.333), stills at 0.5.
- **Layer number** `NOINK = 3` (ink.ts:29) — a contract with cast.ts and world.ts.
- **Camera clip** defaults cNear 0.2 / cFar 1500 (ink.ts:281) — overwritten from the camera each frame; world.ts:354
  forces near 0.2 / far 1500 every frame anyway.
- **Ink fog constants**: fogStart 60 m, fogInk 0.3 (ink.ts:286, 291).
- **Card UV zones** for the 600x1000 adult card (cardshade.ts:17-18, 28-35, 49-52).
- **Program cache keys** `"card9"` (cardshade.ts:76), `"twoTone5_" + liftK` (shade.ts:55).
- **Referenced files that are NOT in the repo** (private study workspace of the author): `references/grade/GradeEffect.ts`,
  `scripts/grade.py`, `scripts/fit2.py`, `scripts/emit_ts.py` (grade.ts:1, 9, 73, 94; grade.md 5.C re-fit loop
  `run_ours.py → samples.py → fit2.py → emit_ts.py → validate.py`), `references/outlines/` test harness,
  `references/lighting/scripts/model.py`. The grade can NOT be re-fitted with this repo alone.
- **OS / browser assumptions**: none of these 7 files touch the file system. They need a browser: `document` canvases
  (cast.ts), Canvas2D `ctx.filter = "blur(9px)"` in `fxShadow` (toon.ts:866) — Chromium (Remotion's headless Chrome)
  supports it; older Safari does not.

## What to change for a new story

1. **New time-of-day / place presets** (night, interior, overcast, dawn). The `"day" | "golden"` union is hard-coded
   in: `LIGHTS`, `LOOK` (lights.ts), `GRADES`, `GRADE_STRENGTH`, `gradeFor` (grade.ts), `Light` in story.ts:43,
   `CONTACT` + `LNAME` in cast.ts, and world.ts (`tint`, `showSun = light === "golden"`, golden `Rr ≥ 30`, cloud maps).
   Add every field of `LightPreset` + `WorldLook` + a grade preset for each new light.
2. **Local lights** (lanterns, window pools, fire — the style bible's "light pools that also tint the characters"):
   `TWO_TONE` discards them. Either keep three's `directDiffuse` from non-sun lights and add it to the two-tone
   result, or add explicit "pool" uniforms (position, radius, colour) to `TWO_TONE` and `CARD`. Cards need the same
   pool tint.
3. **Fix the crossfade leak** (section 11) before using any crossfade between different lights.
4. **Character look** (toon.ts): new `Outfit` constants (jacket/pants/boots/hat colours), new hat types in `hatOn`,
   new props in `bodyFront` (front-arm props), new expressions in `FACE`, new effect canvases (copy the `fx*` pattern;
   `fxSign` is bridge-only). Keep `INK #241726`, the crescent (`shadedFill`) and the thick-thin `inkRing` — they are
   the measured character style.
5. **New body proportions or poses** (kids, sitting, animals): update the card zones in `cardshade.ts`
   (head v 0.565-0.6, centre .69, half height .11, torso band .27-.57, half widths .15/.2), or better pass the zones
   per card as uniforms.
6. **Ink tuning per story**: `fx.ink.set({...})` or edit `DEF` — interiors `concaveGain: 0` (reference has no
   wall/floor lines), exact reference look `widthNear 3.4, widthFar 2.2, color #0b0a0c, creaseScale 0.64`. Put any
   new camera-facing sprite, sky, cloud, smoke, `Line`/`Points`, or displaced water on `NOINK`.
   Skinned/animated 3D models need skinning chunks added to `NORMAL_VERT`.
7. **Sun per shot**: set `az/el` in the preset, override per shot with `SUN_SHOT` (world.ts:67) or `sunAz/sunEl`.
   Day: side light from screen right; sunset: backlight az 0-40°, el 3-15°.
8. **Sky / fog / water** colours are on-screen targets: keep writing them through `untone()`. Fog colour = horizon
   colour. If the new world has no river, the `water` block is unused.
9. **DOF**: write a new `DOF` table in story.ts (cInf ~12-16 CU, 10-12 MS, 5-8 wide, 0 for establishing; ~1/3 of
   screen time), focus on the eyes. `maxCoC 24`, `nearScale 1.2` usually stay.
10. **Grade**: start from `GRADE_DAY2` / `GRADE_GOLDEN2`, check median Y' (day ~.57, golden ~.52), non-ink p5 ~.23,
    vignette. The fitting scripts are not in the repo, so hand-tune `ky`, `sat`, tints, `vig`, or `GRADE_STRENGTH`.
11. **Bloom**: only things above 1.0 linear glow (threshold 1.0). Give new emissives HDR colours (×3 big sources,
    ×8 sparks — depth.md 6.4); keep faces and white walls below 1.
12. **Performance**: for drafts use stills at 0.5 scale, `post: { ink: false, pre: false }` for quick checks; keep grain off.

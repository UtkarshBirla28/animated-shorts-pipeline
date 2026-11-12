// Light states for the antitheft short (plan.ts LightName). Exterior suns are CAMERA-RELATIVE and frozen per shot
// (world.ts): az = degrees from the shot camera's mean forward axis (0 = straight ahead = backlight, +90 = screen
// right, 180 = behind the camera), el = elevation. Interiors set `key` instead: a WORLD-space direction toward the
// window / desk lamp, so the window prints its light patches in the same place whatever the camera does (a shot whose
// camera turns round would otherwise swing a camera-relative key through the room).
// lit / shade / lift are LINEAR RGB multipliers for shade.ts (may exceed 1). Colours of the sky, fog and clouds are
// ON-SCREEN targets (world.ts pre-inverts the Neutral tone map with untone()).
// Tuned (WORLD-INT) against study/CHANNEL_STYLE_BIBLE.md section 6: day shadow ~0.45-0.5 x lit with a blue-violet cast
// on the red-tan floor (warm bounce on vertical faces), saturated deep-blue zenith over a pale hazy horizon (fog =
// horizon colour), golden/sunset violet-blue replacement shadows, dusk blue with a warm horizon band, night storeroom
// deep blue shade + one warm lamp key, warm classroom window light. Character faces stay off-white in every state
// (charTint is applied at 55 % and luminance-normalised in cardshade.ts: no lavender or orange-saturated faces).
import type { LightName } from "./plan";
type C3 = [number, number, number];

export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cardshade.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  fog: string; fogNear: number; fogFar: number; sunDisc: string; showSun: boolean;   // depth / sun disc
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
  /** grade family used by grade.ts until per-light grades exist */
  grade: "day" | "golden" | "night";
  /** interiors only: WORLD-space direction TOWARD the key light (replaces the camera-relative az / el sun).
   *  el must still roughly match it (world.ts widens the shadow fit for el < 15). */
  key?: C3;
  /** round 2 extras (shade.ts TONE_X, written per World by sets_int.ts): warm backlight rim on vertical faces (linear
   *  rgb, 0 = off) and the shade / lift used instead of shade / lift on dark warm (wood) albedo, mixed by woodK */
  rim: C3; woodShade: C3; woodLift: C3; woodK: number;
  /** round 5: additive sky fill on every two-tone face, lit and shaded (shade.ts TONE_X uFill, linear rgb x albedo) */
  fill?: C3;
};
export type WorldLook = {
  sky: { c: string[]; e: number[] };   // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  bounce: C3; sat: number;             // shade.ts uBounce / uSat
  cloud: { lit: string; mid: string; shade: string };
};

const DAY: LightPreset = {
  az: 70, el: 58,
  lit: [1.6, 1.5, 1.32], shade: [0.42, 0.44, 0.8], lift: [0.012, 0.018, 0.05], lambert: 0.35, sideK: 0.84, term: 0.2,
  charTint: [1.0, 0.96, 0.93], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.9, 0.97],
  blob: [0.6, 0.58, 0.66], actorShadow: false,
  fog: "#d3e1ef", fogNear: 50, fogFar: 750, sunDisc: "#000000", showSun: false,
  sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
  bias: -0.00025, normalBias: 0.015, grade: "day",
  rim: [0.25, 0.22, 0.17], woodShade: [0.5, 0.42, 0.62], woodLift: [0.012, 0.014, 0.034], woodK: 0.5,
};
const GOLD: LightPreset = {
  az: 6, el: 7,
  lit: [1.55, 0.8, 0.36], shade: [0.15, 0.15, 0.32], lift: [0.04, 0.055, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
  charTint: [1.0, 0.84, 0.66], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.86, 0.82, 0.96],
  blob: [0.72, 0.7, 0.88], actorShadow: true,
  fog: "#f1b98e", fogNear: 60, fogFar: 650, sunDisc: "#ffcf9e", showSun: true,
  sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
  bias: -0.0006, normalBias: 0.03, grade: "golden",
  rim: [3.4, 1.45, 0.42], woodShade: [0.3, 0.2, 0.27], woodLift: [0.035, 0.03, 0.07], woodK: 1,
};

/** interior keys (world space, toward the light): classroom = a low morning sun (~10 deg) through the south window
 *  band behind the students, so pane patches, mullion bars and the long shadows of desks, pupils and teacher fall
 *  across the floor onto the lower board wall; storeroom = the desk lamp (from screen left, a little toward the lens
 *  so the CONSCIENCE PILE stencil and the letters catch it; shade.ts ZONE 0 turns it into the lamp's spot) */
export const KEY_CLASSROOM: C3 = [-0.22, 0.17, 0.96];
export const KEY_STOREROOM: C3 = [-0.782, 0.58, -0.227]; // round 2: from the swing-arm lamp head (sets_int.ts LAMP_HEAD) down onto the crate top

export const LIGHTS: Record<LightName, LightPreset> = {
  // bright desert noon: high side-back sun from screen right, crisp blue-violet ground shade
  // round 7 (A6 P2 shot 1: only a contact blob under her, faint noon shadows): the cards cast their silhouettes at noon
  // too (the trailhead sun is side-back, so each card throws a slim violet shadow across the paving), dim the same so the
  // relight never pops them
  noon: { ...DAY, actorShadow: true },
  // "vandalized": same direction, key and sky ~20 % down, a little greyer
  // round 4 (A3 P2: mean saturation 70 -> 44, hazy lifted shadows, a muddy grey-lavender counter insert): the value
  // drop stays (~20 %) but the colour does not go: the shade turns VIOLET (#3A2E5A class: more red, less green than
  // noon's blue shade, so the orange floor reads plum-brown, not grey), the lift is violet and small, albedo
  // saturation goes UP (look sat 1.02 -> 1.15) and the fog is ~40 % thinner and bluer (no grey haze)
  // round 5 (A4 P3: the dim turned the dark posts / board frame magenta-plum #52133A): the drop is a cool-VIOLET
  // ambient now (green kept level with red, no magenta bias), the key -20 %, and brown wood keeps its own WARM
  // shade (#4A2E24-#5A3A22 class in the cloud shadow) instead of the lavender multiplier
  // round 7 (A6 P2: the dip read as a different, wine-coloured sign: board hue ~340, a grey sky, frame chroma 28 -> 19):
  // the KEY keeps noon's warm-neutral hue at -22 % (noon lit x 0.78), only the SHADOW turns more lavender (blue up,
  // red / green level, no magenta), the wood keeps a warm-neutral shade, the sky keeps noon's saturated blue one step
  // darker (LOOK.dim) and the fog is a clean pale blue; the cloud band itself is warm-neutral on wood (shade.ts)
  dim: { ...DAY, actorShadow: true, lit: [1.25, 1.17, 1.03], shade: [0.36, 0.355, 0.7], lift: [0.012, 0.012, 0.04], charTint: [0.99, 0.96, 0.94], fog: "#c8d9ef", fogNear: 80, fogFar: 1150, sunI: 2.2,
    woodShade: [0.46, 0.44, 0.4], woodLift: [0.01, 0.008, 0.006], woodK: 0.9 },
  // mystery relight: warmer, sun ~24 deg, longer shadows, amber haze
  // round 2: sun swings round to the back-right and drops (az 95 -> 32, el 24 -> 18) during the relight, so the posts
  // and the couple throw long blue-violet shadows toward the lens; warm orange rim on the sun-side edges
  // round 5 (A4 P3: the relight read mostly on the ground): the sun drops further (el 18 -> 12) so the post shadows rake
  // toward the lens across the paving while it relights, a warmer key, the sky / clouds go warm in LOOK.late
  // round 6 (A5 P3: the relight read mostly in the sky): the key goes to a warm #F2B880-class orange (r : g : b ~
  // 1 : .55 : .25), so the paving, posts and couple visibly turn amber while the shadows stretch (el 58 -> 12); the
  // board's two gooseneck lamps flick on late in the shot (sets_int.ts LightFx, video ~860)
  // round 8 (A7 P3: a milky sky top #7A99D2 fading to cream, lifted blacks p5 L* 17-21 against 10-14 in shot 5; user: shot 6
  // must be a MYSTERY beat with the light dropping a little): a saturated #FFB46A key (r : g : b ~ 1 : .47 : .15, ~11 %
  // less luminance than before) at ~20 deg, a plum-violet shade (#5F4A7A class on the far sides), the black point down to
  // ~(30, 18, 36) (lift / 2.5), and a clean #5A86D6 sky top over a #F3C98F horizon (LOOK.late); the board face stays warm
  late: { ...DAY, az: 32, el: 20, lit: [1.88, 0.88, 0.29], shade: [0.31, 0.25, 0.6], lift: [0.012, 0.007, 0.03], term: 0.12,
    charTint: [1.0, 0.85, 0.64], sideTint: [0.82, 0.77, 0.95], fog: "#f0c8a0", fogNear: 60, fogFar: 820, sunCol: "#ffb46a", actorShadow: true, blob: [0.58, 0.52, 0.72],
    rim: [2.2, 1.0, 0.3], woodShade: [0.42, 0.3, 0.42], woodLift: [0.02, 0.016, 0.045], woodK: 0.85 },
  // the test: early morning, low golden sun from the right-back (long shadows toward the lens), cool lavender shade
  // round 2: warmer key (#FFD9A0), lavender ambient -20 %, fog -30 %; the shade is less blue so brown wood reads
  // plum-brown (#4E3444 class) and the wood class gets its own warm shade (shade.ts WOOD); warm rim on the posts
  // round 4 (A3 P2: the professor showed only a contact blob): the cards cast their silhouettes in this state (stated
  // explicitly; GOLD already had it); the shot-7 sun turn to the back-right (az ~35) is the LEAD's SHOTS[6].sunAz
  // round 5 (A4 P2: 'morning' read as plain noon, b* ~5 against noon's -1.4, so the 9 -> 10 time dissolve showed no
  // change): a golden #FFD49A key at ~0.9 of noon's value, el 14 (long shadows kept), violet #6E6AA8-class shade, warm
  // haze fog #EBC9A8, and a peach-horizon -> pale-blue sky with gold-lit clouds (LOOK.morning); noon stays white + blue
  // round 8 (A7 P3 shot 9: faces read neutral white, the warmth only on the floor): the card tint pushed toward #FBE3CC
  morning: { ...GOLD, az: 62, el: 14, lit: [1.74, 1.16, 0.57], shade: [0.36, 0.33, 0.62], lift: [0.03, 0.03, 0.11], term: 0.1, showSun: false,
    charTint: [1.0, 0.82, 0.6], sideTint: [0.88, 0.85, 0.98], fog: "#ebc9a8", fogNear: 70, fogFar: 800, sunCol: "#ffd49a", grade: "golden", blob: [0.66, 0.62, 0.82],
    actorShadow: true, rim: [2.4, 1.2, 0.42], woodShade: [0.47, 0.33, 0.4], woodLift: [0.016, 0.012, 0.026], woodK: 1, fill: [0.02, 0.012, 0.0] },
  // permission: backlit golden sunset (story.ts forces az 0 / el 6), violet-blue replacement shade, sun disc
  // round 2: the sun disc, halo and god rays are drawn by sets_int.ts (LightFx) so the disc can peek past Sign B's
  // edge instead of hiding behind it; warm rim on posts, LED box and board frame; wood keeps a warm violet-brown shade
  // round 3 (A2): plum-violet replacement shade (hue ~290-300 on the orange floor after the grade, ~25 % less saturated
  // than the old navy): more red in the shade multiplier, less blue lift; contrast kept by value, not saturation
  sunset: { ...GOLD, showSun: false, charTint: [1.0, 0.84, 0.64], shade: [0.2, 0.175, 0.42], lift: [0.036, 0.03, 0.1], blob: [0.74, 0.68, 0.86] }, // measured on stills: ground shadow hue 271 -> ~290
  // twist exterior: blue hour, warm horizon band, cool body light; faces stay warm-white
  // round 2: warmer card key (charTint blue < .7 turns cardshade's rim orange-gold) and a lavender far side (#B8B4D8)
  // round 3 (A2: muddy night-blue wash, L* 35, b* -22): +0.3 EV, a mauve-plum shade instead of navy (coral -> mauve
  // horizon band in LOOK.dusk), lavender far side (#C8B0E2), warm horizon rim; the practicals are WORLD-EXT's lamps
  // round 4 (A3 P2: a uniform pink-lavender haze, sky = ground = shade, low contrast, no cast shadows): a real BLUE
  // HOUR. Cool blue-violet shade (#4A4F8E class on the paving) with a small blue lift (no plum haze), a low warm key
  // from screen LEFT (az -72, el 14: soft shadows ~4x the object height falling right / toward the lens), a warm
  // rim on the key-side edges, faces warm-white with a cool far side; the deep-blue sky over a coral band is LOOK.dusk
  // round 5 (A4 P2: still an orange sunset: bright saturated orange ground, no light direction, no long shadows): the
  // key -25 % and rose (#F0B48A class), a LOW sun (el 7) ahead-right of the lens so posts and people throw long violet
  // shadows raking toward camera-left, a blue-violet sky fill on everything (uFill: the lit ground reads rose-mauve
  // #B47C78 class, the shade #6C5A8C class), and warm practical pools from the board's two gooseneck lamps + the lot
  // lamp (sets_int.ts pools 9-11, dusk only)
  // round 7 (A6 P3: the whole floor still lit uniform golden-hour orange under a starry blue-hour sky; nothing motivates
  // it): the key -30 % and ROSE (#E7A08A class: r : g : b ~ 1 : .45 : .32), the blue-violet ambient (#5A5CA8 class) +15 %
  // and a little more blue fill, so the far floor falls into blue; the warm ground and the tourist's warm side now come
  // from the board's two gooseneck lamps (sets_int.ts: a ~3 m warm #FFC27A ground pool under each, pools 12-13)
  // round 8 (A7 P2 shot 15: an even violet wash, no readable key direction, no cast shadows on the pebble floor): the shade
  // was BRIGHTER than the grazing key on the ground (lum ~.35 vs ~.25, plus the blue fill on both), so no shadow could
  // read. Now the ground's lit side is ~2x the shade (shadow opacity ~.5): a stronger ROSE-CORAL key (#F0A070 class, r : g
  // : b ~ 1 : .46 : .32) that the grazing floor takes at ~75 % (lambert .3), a deep violet shade (#4F256D-#6C4F73 class on
  // the paving, r over g: no navy) with half the blue fill and a small lift, the sun a little higher (el 10: posts and
  // people throw ~6x long violet shadows), a hotter key-side rim; faces keep their warm-white tint
  dusk: { ...GOLD, az: 48, el: 10, lit: [1.25, 0.58, 0.4], shade: [0.21, 0.165, 0.5], lift: [0.02, 0.016, 0.075], term: 0.1, lambert: 0.3,
    charTint: [1.0, 0.88, 0.76], sideTint: [0.8, 0.76, 1.0], fog: "#9a8cb8", fogNear: 90, fogFar: 950, sunDisc: "#ffb07a", sunCol: "#f0a070", sunI: 1.9, showSun: false, blob: [0.46, 0.4, 0.74],
    sky: "#6e6ab8", ground: "#5a4a70", rim: [2.0, 0.92, 0.46], woodShade: [0.3, 0.22, 0.4], woodLift: [0.024, 0.018, 0.06], fill: [0.055, 0.05, 0.19] },
  // storeroom at night: deep saturated blue shade, one warm desk-lamp key (world-fixed; faded with distance from the
  // lamp in shade.ts so the far corners stay blue), warm-white faces with a cool far side
  // round 3 (A2: darkest shot, one blue hue): +0.25 EV ambient (shade / lift x1.19, still saturated blue), lamp key
  // +30 %; sets_int.ts adds a lantern + pile pools so ~25 % of the frame is warm
  // round 5 (A4 P2: one blue-lavender note, b* -41..-47, mean L* 29-30, ~14 % warm pixels): the night shade is a
  // little less saturated and +0.2 EV (still deep blue), a faint warm fill so the mids lift, warmer card key; the warm
  // practicals (hanging work bulb, lamp, flickering lantern) are pools in sets_int.ts
  // round 6 (A5 P2: pastel lavender haze, a* +18..+20, b* -2..-18, magenta darks; the walls #48386E-#7D80BD): the warm
  // pine x a blue multiplier was the violet. The night shade is now a ROYAL BLUE with green above red (no magenta: shade
  // r .06 < g .13), the lift small and blue, and LOOK.night_int.sat 0.5 greys the warm albedo before the light colours
  // it (so the planks take the night's hue in the shade and the lamp's in the pools; chips / labels / cards are
  // emissive or unlit and keep their colour). Target: walls in shade #2E3F9A-#3B4BD1, whole frame L* ~38, b* -20..-28
  night_int: { ...GOLD, az: -60, el: 35, key: KEY_STOREROOM, lit: [2.5, 1.48, 0.62], shade: [0.06, 0.13, 0.9], lift: [0.004, 0.014, 0.08], lambert: 0.25, term: 0.12,
    fill: [0.0, 0.004, 0.02],
    sideK: 0.86, charTint: [1.0, 0.85, 0.7], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.25, sideTint: [0.84, 0.85, 1.0],
    blob: [0.55, 0.58, 0.85], fog: "#10183a", fogNear: 400, fogFar: 1500, showSun: false, sunCol: "#ffc27a", actorShadow: true, grade: "night",
    bias: -0.0004, normalBias: 0.02, rim: [0.5, 0.26, 0.08], woodK: 0 },
  // classroom: warm late-morning sun through the east window band (patches + mullion / blind shadows), warm cream shade
  // round 2: -0.2 EV, warmer + 10 % saturated key, deeper warm shade so the window patches (and the +30 % pools in
  // sets_int.ts) read as pools of sun on the floor
  classroom: { ...DAY, az: 180, el: 16, key: KEY_CLASSROOM, lit: [1.52, 1.25, 0.84], shade: [0.5, 0.42, 0.39], lift: [0.03, 0.022, 0.032], lambert: 0.3,
    sideK: 0.9, term: 0.15, charTint: [1.0, 0.93, 0.83], charShade: 0.88, sideTint: [0.93, 0.89, 0.95], blob: [0.7, 0.62, 0.6], actorShadow: true,
    fog: "#e9dcc8", fogNear: 400, fogFar: 1500, bias: -0.0005, normalBias: 0.03, rim: [0.35, 0.22, 0.1], woodK: 0 },
  // explainer: flat cool blueprint (lines and labels are unlit); the paper floor is lit flat so characters and the
  // floating sign cast soft blue shadows on it; fog = the backdrop blue so the floor runs into an endless stage
  // round 5 (A4: ~1 stop brighter and flatter than the reference blueprints, no contact shadows read): the paper is lit
  // ~0.78 x (deep #1D4590 class), shadows a deeper navy so the cards, the floating panel and the desk props sit down
  blueprint: { ...DAY, az: 40, el: 55, lit: [0.78, 0.8, 0.86], shade: [0.42, 0.48, 0.74], lift: [0.0, 0.008, 0.03], lambert: 0.0, sideK: 1.0, term: 0.2,
    charTint: [0.95, 0.97, 1.03], charShade: 0.86, sideTint: [0.9, 0.92, 1.0], blob: [0.4, 0.48, 0.74], actorShadow: true, // round 3: darker navy contact blobs (A2)
    fog: "#153a81", fogNear: 13, fogFar: 62, rim: [0, 0, 0], woodK: 0 },
};

const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#bcc4ea" };     // lavender undersides
const CLOUD_GOLD = { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" };
export const LOOK: Record<LightName, WorldLook> = {
  // pale hazy horizon -> saturated deep blue zenith (bible 6.2: #1F80F7-#3FA1F5 top over #B5D9FB-#E6E3ED)
  noon: { sky: { c: ["#d3e1ef", "#aecff2", "#72adf1", "#3f90ee", "#1c72e4"], e: [0, 3, 9, 20, 50] }, cloud: CLOUD_DAY, bounce: [0.07, 0.035, 0.0], sat: 1.1 },
  // round 4: a clean, deeper blue (no grey), violet cloud undersides, albedo saturation up (A3 P2)
  // round 7 (A6 P2: a grey dim sky, chroma at the bible's floor): noon's own saturated blues, ~12 % darker, no grey
  dim: { sky: { c: ["#c8d9ef", "#9ec4ef", "#5f9eec", "#2f80e6", "#1464d4"], e: [0, 3, 9, 20, 50] }, cloud: { lit: "#eceaf4", mid: "#cdcbe6", shade: "#a09ccf" }, bounce: [0.06, 0.03, 0], sat: 1.1 }, // round 5: 1.15 -> 1.08 (the dark wood went red-maroon); round 7: 1.1 (= noon; the wood shade is warm-neutral now)
  // round 5: the warm horizon stop lifted to ~6 deg (it shows under the board), a warmer mid sky, gold-topped clouds
  // round 8 (A7 P3): the visible top is a clean #5A86D6 by ~30 deg (no milky cream fade), a short peach -> lilac blend low
  late: { sky: { c: ["#f3c98f", "#ecc29c", "#b9b4cc", "#7d9ad6", "#5a86d6"], e: [0, 4, 9, 16, 30] }, cloud: { lit: "#ffd9b0", mid: "#f2c2b0", shade: "#a890c8" }, bounce: [0.09, 0.04, 0], sat: 1.16 },
  // round 3 (A2: washed grey-blue top, cream clouds): crisp clean blue from ~10 deg up (#3F86D8) over a peach horizon
  // (#F3C9A0); white clouds with a peach-gold lit side and lavender undersides
  // round 5 (A4 P2): early morning, not noon: peach horizon #F6C9A0 -> rose haze -> pale soft blue #7FB4F0 at the
  // zenith (no saturated noon blue anywhere), clouds gold-lit with lavender undersides
  // round 8 (A7 P3 shot 9: the MS sky's upper 30 % a pale hazy blue-lavender): a peach band (#F4C9A0) held to ~9 deg (it
  // clears the mesas: ~25 % of the visible sky), a rose-lilac blend, and a deeper ~#6E95D6 top by ~28 deg (a morning blue, still softer than noon's)
  morning: { sky: { c: ["#f6c49a", "#f4c9a0", "#e8c4b4", "#a6b4da", "#6e95d6"], e: [0, 9, 14, 21, 32] }, cloud: { lit: "#ffe4c6", mid: "#f4d0c8", shade: "#a69ad2" }, bounce: [0.08, 0.04, 0], sat: 1.14 },
  sunset: { sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#7f6a92"], e: [0, 4, 10, 20, 40] }, cloud: CLOUD_GOLD, bounce: [0.05, 0.02, 0], sat: 1.12 },
  // round 3: coral -> mauve -> plum horizon band (#E67968 -> #B45F83 -> #4F256D), deep indigo zenith
  // round 4 (A3 P2): blue hour. Coral horizon band #F08A6A (0-3 deg) -> a short rose / violet blend -> deep blue
  // #2C3D7A from ~16 deg up; clouds: warm-lit rims, violet mids, blue undersides
  // round 8 (A7 P2: no warm afterglow at the horizon): a wider warm afterglow band (#F2A07A -> #E67968) over the lowest
  // ~10 % of the sky seen between the posts, then mauve -> violet -> the deep blue (the lavender far badlands = fog stand in front)
  dusk: { sky: { c: ["#f2a07a", "#e67968", "#a0709e", "#4e5a92", "#2c3d7a"], e: [0, 4.5, 10, 18, 34] }, cloud: { lit: "#f6a88c", mid: "#8c7aa8", shade: "#38457e" }, bounce: [0.05, 0.025, 0.02], sat: 1.02 }, // round 5: albedo saturation down (the orange floor)
  night_int: { sky: { c: ["#1a2450", "#16204a", "#121a40", "#0e1636", "#0a102c"], e: [0, 4, 10, 20, 40] }, cloud: { lit: "#3a4270", mid: "#2c3360", shade: "#1e2450" }, bounce: [0.0, 0.0, 0.03], sat: 0.5 }, // round 6: albedo greyed (see LIGHTS.night_int)
  classroom: { sky: { c: ["#d3e1ef", "#aecff2", "#72adf1", "#3f90ee", "#1c72e4"], e: [0, 3, 9, 20, 50] }, cloud: CLOUD_DAY, bounce: [0.05, 0.035, 0.012], sat: 1.06 },
  blueprint: { sky: { c: ["#153a81", "#14367a", "#11306e", "#0d2860", "#0a2050"], e: [0, 4, 10, 20, 40] }, cloud: CLOUD_DAY, bounce: [0, 0, 0], sat: 1.0 },
};

// ---------------- blending (in-shot relights) ----------------
export type LightState = LightPreset & { look: WorldLook; name: LightName };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const l3 = (a: C3, b: C3, k: number): C3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lhex = (a: string, b: string, k: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, "0")).join("");
};
export const blendLight = (a: LightName, b: LightName, k: number): LightState => {
  const A = LIGHTS[a], B = LIGHTS[b], LA = LOOK[a], LB = LOOK[b];
  if (k <= 0 || a === b) return { ...A, look: LA, name: a };
  if (k >= 1) return { ...B, look: LB, name: b };
  const out = { ...A } as LightPreset;
  for (const key of new Set([...Object.keys(A), ...Object.keys(B)]) as Set<keyof LightPreset>) {
    const va = A[key], vb = B[key];
    if (typeof va === "number" && typeof vb === "number") (out as Record<string, unknown>)[key] = lerp(va, vb, k);
    else if (Array.isArray(va) && Array.isArray(vb)) (out as Record<string, unknown>)[key] = l3(va as C3, vb as C3, k);
    else if (typeof va === "string" && typeof vb === "string" && va.startsWith("#")) (out as Record<string, unknown>)[key] = lhex(va, vb, k);
    else (out as Record<string, unknown>)[key] = k < 0.5 ? va : vb;
  }
  // round 6b (A5 P3 shot 6: the noon -> late relight read in the sky only; the ground leaves the frame ~40 % into the
  // relight): in a noon -> late blend the SUN leads: elevation, azimuth, key / shade / rim colour and the card tint run
  // on a fast-out ease (1 - (1 - k)^3: ~55 % done when the sky is ~25 % done), so the posts' and the couple's shadows
  // visibly stretch toward the lens and the paving turns amber while it is still in frame; the sky / fog / clouds keep
  // the slow blend (shot 6's sun is side-on, sunAz 77, so the card silhouettes stay on the existing k >= .5 switch)
  if (a === "noon" && b === "late") {
    const ke = 1 - (1 - k) ** 3;
    out.el = lerp(A.el, B.el, ke); out.az = lerp(A.az, B.az, ke);
    out.lit = l3(A.lit, B.lit, ke); out.shade = l3(A.shade, B.shade, ke); out.lift = l3(A.lift, B.lift, ke); out.rim = l3(A.rim, B.rim, ke);
    out.sunCol = lhex(A.sunCol, B.sunCol, ke); out.charTint = l3(A.charTint, B.charTint, ke);
  }
  const look: WorldLook = {
    sky: { c: LA.sky.c.map((c, i) => lhex(c, LB.sky.c[i], k)), e: LA.sky.e.map((e, i) => lerp(e, LB.sky.e[i], k)) },
    bounce: l3(LA.bounce, LB.bounce, k), sat: lerp(LA.sat, LB.sat, k),
    cloud: { lit: lhex(LA.cloud.lit, LB.cloud.lit, k), mid: lhex(LA.cloud.mid, LB.cloud.mid, k), shade: lhex(LA.cloud.shade, LB.cloud.shade, k) },
  };
  return { ...out, look, name: k < 0.5 ? a : b };
};

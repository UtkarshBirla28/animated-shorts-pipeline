// Light states for the saladoil short (plan.ts LightName). FIRST-PASS palettes from study/CHANNEL_STYLE_BIBLE.md section 6
// (the WORLD-INT owner tunes them on real frames). Exterior suns are CAMERA-RELATIVE and frozen per shot (world.ts):
// az = degrees from the shot camera's mean forward axis (0 = straight ahead = backlight, +90 = screen right, 180 = behind
// the camera), el = elevation; story.ts SUN_WORLD pins one WORLD heading per place, so az here only matters for shots
// without a pin. Interiors set `key` instead: a WORLD-space direction toward the window / lamp, so a turning camera never
// swings the light through the room.
// lit / shade / lift are LINEAR RGB multipliers for shade.ts (may exceed 1). Colours of the sky, fog and clouds are
// ON-SCREEN targets (world.ts pre-inverts the Neutral tone map with untone()). Rules kept from the antitheft tuning:
// shadows are never neutral (blue-violet by day, violet at dawn / late, plum-brown in warm rooms, royal blue at night),
// fog = horizon colour, faces stay off-white (charTint is applied at ~55 % and luminance-normalised in cardshade.ts).
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
  /** grade family (kept for tools; grade.ts has one preset per light) */
  grade: "day" | "golden" | "night";
  /** interiors only: WORLD-space direction TOWARD the key light (replaces the camera-relative az / el sun).
   *  el must still roughly match it (world.ts widens the shadow fit for el < 15). */
  key?: C3;
  /** shade.ts TONE_X extras (written per World by sets_int.ts's hook): warm backlight rim on vertical faces (linear rgb,
   *  0 = off) and the shade / lift used instead of shade / lift on dark warm (wood) albedo, mixed by woodK */
  rim: C3; woodShade: C3; woodLift: C3; woodK: number;
  /** additive sky fill on every two-tone face, lit and shaded (shade.ts TONE_X uFill, linear rgb x albedo) */
  fill?: C3;
};
export type WorldLook = {
  sky: { c: string[]; e: number[] };   // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  bounce: C3; sat: number;             // shade.ts uBounce / uSat
  cloud: { lit: string; mid: string; shade: string };
};

// fix round 1 (A1 P2 shot 2: the noon landing was washed, p5 L* 27): a deeper, more saturated blue-violet shade and less
// lift, so the cream tanks keep real noon contrast and Tino's grey suit sits on a clear light / dark ground
const DAY: LightPreset = {
  az: 70, el: 58,
  lit: [1.62, 1.5, 1.3], shade: [0.33, 0.36, 0.8], lift: [0.006, 0.01, 0.036], lambert: 0.35, sideK: 0.82, term: 0.2,
  charTint: [1.0, 0.96, 0.93], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.9, 0.97],
  blob: [0.6, 0.58, 0.66], actorShadow: true,
  fog: "#d3e1ef", fogNear: 60, fogFar: 760, sunDisc: "#000000", showSun: false,
  sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
  bias: -0.00025, normalBias: 0.015, grade: "day",
  rim: [0.25, 0.22, 0.17], woodShade: [0.5, 0.42, 0.62], woodLift: [0.012, 0.014, 0.034], woodK: 0.5,
};
// fix round 1 (A1 shot 1: the roof was the same orange as the oil): a peachier, less saturated dawn key, so the cream
// roof reads apricot-cream and the oil stays the one saturated gold in the hook / loop frames
const GOLD: LightPreset = {
  az: 30, el: 9,
  lit: [1.58, 1.0, 0.58], shade: [0.2, 0.18, 0.42], lift: [0.04, 0.045, 0.14], lambert: 0.35, sideK: 0.82, term: 0.08,
  charTint: [1.0, 0.84, 0.66], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.86, 0.82, 0.96],
  blob: [0.72, 0.68, 0.86], actorShadow: true,
  fog: "#f2c39a", fogNear: 80, fogFar: 820, sunDisc: "#ffd2a0", showSun: true,
  sunCol: "#ffb066", sunI: 4.5, sky: "#e0b8b8", ground: "#8a6a60", hemiI: 0.5,
  bias: -0.0006, normalBias: 0.03, grade: "golden",
  rim: [2.6, 1.25, 0.4], woodShade: [0.32, 0.22, 0.3], woodLift: [0.03, 0.026, 0.06], woodK: 1,
};
/** a warm interior base (bible 6.2 "warm interior": L* 36-42, chroma 30-35, plum-brown darks) */
const ROOM: LightPreset = {
  ...DAY, az: 0, el: 35, lit: [1.55, 1.27, 0.88], shade: [0.48, 0.38, 0.38], lift: [0.03, 0.02, 0.03], lambert: 0.3,
  sideK: 0.9, term: 0.15, charTint: [1.0, 0.93, 0.83], charShade: 0.88, sideTint: [0.93, 0.89, 0.95], blob: [0.7, 0.62, 0.6],
  fog: "#e9dcc8", fogNear: 400, fogFar: 1500, bias: -0.0005, normalBias: 0.03, rim: [0, 0, 0], woodShade: [0.52, 0.4, 0.38], woodLift: [0.02, 0.012, 0.01], woodK: 0.6,
};

/** interior keys (world space, toward the light). The room shells do not cast (sets_int.ts), so each key lights the
 *  room as a soft directional and the PROPS throw readable shadows; practical lamps / windows are shade.ts pools. */
export const KEY_BANK: C3 = [-0.45, 0.75, 0.48];     // soft daylight from camera-left-front: stacks / stamp / easel shadows fall back-right
export const KEY_TRADING: C3 = [0.78, 0.5, 0.38];    // the tall east windows (stormy daylight, screen right)
export const KEY_CUTAWAY: C3 = [-0.35, 0.75, 0.56];  // flat diagram key from the front-top-left
export const KEY_KITCHEN: C3 = [0.79, 0.57, 0.2];    // fix r1: low golden sun (~35 deg) through the side window, screen right: the bottle's shadow falls LEFT across the cloth (walls still lit)
export const KEY_PUMP: C3 = [0.1, 0.95, 0.3];        // the two work lamps over the pipes (shade.ts ZONE 0 / 1 limit it to their spots)
export const KEY_OFFICE: C3 = [-0.6, 0.55, 0.58];    // a side window at camera-left-front; the back window is a warm pool + shafts
/** fix r1 (A1 P2 shot 14): the overcast street had NO directional component (its pinned sun sat behind the facade, so
 *  every visible face was in one flat shade). A soft cool key from the upper LEFT FRONT (world space, like an interior
 *  key) so the awning, kiosk and people throw soft blue-violet shadows onto the facade and pavement */
export const KEY_STREET: C3 = [-0.52, 0.64, 0.56];

export const LIGHTS: Record<LightName, LightPreset> = {
  // the hook / loop: a low golden dawn sun over the harbour (story.ts pins it behind-right of the shot-1 wide: backlight,
  // long violet shadows toward the lens), a warm peach key, violet shade, a warm rim on the rails and the tank edge.
  // fix r2 (A2 P3 shot 1: the criss-cross rail shadows read cold cobalt #564F95 against the dawn gold): the shade moves
  // toward PLUM-violet (#5F4757..#6A4E7E class: more red, less blue) and lifts a little (rail-shadow contrast ~-15 %)
  dawn_gold: { ...GOLD, shade: [0.27, 0.2, 0.34], lift: [0.052, 0.042, 0.1] },
  // bright noon: high side-back sun, crisp blue-violet ground shade, cream tanks with blue shade sides.
  // fix r2 (carryover / A2 P3 shots 2 + 4: noon measured L* 67-72, chroma 23.6, b* +1): exposure -5 %, the tank-wall
  // shade ~28 % darker toward #6E73B8, less lift, so noon lands at L* 58-64 with chroma >= 27
  noon: { ...DAY, lit: [1.54, 1.425, 1.235], shade: [0.235, 0.265, 0.74], lift: [0.004, 0.007, 0.03], fog: "#a6c7f2" },
  // the mystery: a warm low sun (~20 deg), long shadows, violet shade. fix r1 (A1 P2 shot 7): the key ~30 % less
  // saturated, so the lit roof reads honey-cream (#E8C48A class) under violet shade and the oil is the only saturated gold
  // fix r2 (A2 P2 shot 7: one beige-sepia wash, the turn unread): the key warmer (#FFB066 class) and ~0.12 EV lower so
  // the gold oil pops by contrast; a deeper saturated violet shade (#5A4A9A class); el 20 (the noon -> late blend drops
  // the sun ~38 deg with the fast-out ease, so the rail shadows stretch)
  late: { ...DAY, az: 32, el: 20, lit: [1.64, 1.12, 0.62], shade: [0.27, 0.22, 0.6], lift: [0.01, 0.006, 0.03], term: 0.12,
    charTint: [1.0, 0.89, 0.74], sideTint: [0.84, 0.8, 0.96], fog: "#ecc9a8", fogNear: 70, fogFar: 820, sunCol: "#ffc684", blob: [0.56, 0.5, 0.72],
    rim: [1.8, 1.0, 0.42], woodShade: [0.42, 0.3, 0.42], woodLift: [0.02, 0.016, 0.045], woodK: 0.85 },
  // the rain. fix r1 (A1 P1 shot 9: washed grey daylight, L* 50 C* 13): a saturated blue storm (bible #343FAA / #3852CE
  // family), darker key, deep blue shade, a cool lift; WORLD-EXT darkens the wet albedo. Target L* 40-46, C* 24-30, b* -15..-22
  // fix r2 (carryover, WORLD-EXT's numbers for a saturated blue storm on the real set): a brighter cool key over a
  // deeper blue shade, a blue-slate fog; WORLD-EXT darkens the wet albedo so mid-frame lands at L* 40-46
  storm: { ...DAY, az: 40, el: 55, lit: [0.82, 0.92, 1.12], shade: [0.34, 0.44, 0.78], lift: [0.014, 0.018, 0.058], lambert: 0.42, sideK: 0.88, term: 0.32,
    charTint: [0.9, 0.94, 1.02], sideTint: [0.84, 0.88, 1.0], blob: [0.42, 0.46, 0.66], actorShadow: false,
    fog: "#6f80a8", fogNear: 22, fogFar: 330, sunCol: "#c8d2ea", sunI: 1.0, sky: "#7a86a6", ground: "#3a4058", rim: [0, 0, 0], woodK: 0.4 },
  // warm wood-panelled bank office. fix r1 (A1 P2 shot 5: one flat orange wash, chroma 42 / b* +29): a less orange key,
  // plum-brown shade, a cool window counter-light from screen left + the green lamp pool (sets_int.ts pools)
  // fix r2 (A2 P2 shots 3 / 5: still one orange note, b* +24, chroma 35-37; target b* +17..+20, chroma ~32): a cooler
  // key (blue +9 %), the shade pulled to PLUM (#3A2030 class), wood shade plum-brown; the cool window light and the
  // venetian-blind stripes are sets_int.ts pools / decals
  bank_warm: { ...ROOM, el: 48, key: KEY_BANK, lit: [1.38, 1.17, 0.98], shade: [0.41, 0.28, 0.42], lift: [0.026, 0.014, 0.034], lambert: 0.34, sideK: 0.86, term: 0.16,
    charTint: [1.0, 0.96, 0.91], sideTint: [0.9, 0.87, 0.97], blob: [0.54, 0.4, 0.5], woodShade: [0.47, 0.31, 0.38], woodLift: [0.026, 0.012, 0.02], woodK: 0.7 },
  // the trading floor. fix r1 (A1 P2 shot 8: neutral grey, ceiling #717171): cool stormy daylight key, LAVENDER shade
  // (#5E5A78 class) on green-grey walls, the warm globe pools + cool window shafts in sets_int.ts
  // fix r2 (A2 P2 shot 8: a flat teal-grey haze; white shirts lavender, Tino's grey suit blue): a whiter key from the
  // tall windows (#B8C8D8 class, 30 deg, screen right), the card tint ~30 % less cool (shirts >= 85 % luminance, the
  // grey suit neutral), deeper lavender shade for contrast; the warm pendant POOLS on desks + floor are sets_int.ts
  trading: { ...ROOM, el: 30, key: KEY_TRADING, lit: [1.2, 1.23, 1.26], shade: [0.36, 0.34, 0.54], lift: [0.014, 0.012, 0.032], lambert: 0.38, term: 0.2, charTint: [1.0, 0.99, 1.0],
    sideTint: [0.92, 0.91, 0.97], blob: [0.44, 0.42, 0.6], fog: "#7e8a90", woodShade: [0.46, 0.34, 0.38], woodLift: [0.02, 0.012, 0.018], woodK: 0.6 },
  // the cutaway diagram: cool flat light on the shell / floor (the water and oil are self-lit shaders), soft navy shade
  // fix r2 (A2 P2 #22 shot 12: the hatch hold washed + the collar shadow faint): a slightly warm key from the upper left,
  // a ~50 % lavender shade so the collar / lid / sign posts cast readable shadows on the cream roof
  cutaway: { ...DAY, az: 0, el: 48, key: KEY_CUTAWAY, lit: [1.16, 1.14, 1.12], shade: [0.5, 0.48, 0.74], lift: [0.01, 0.016, 0.044], lambert: 0.26, sideK: 0.95, term: 0.25,
    charTint: [0.97, 0.99, 1.03], sideTint: [0.9, 0.92, 1.0], blob: [0.42, 0.5, 0.74], fog: "#284a82", fogNear: 18, fogFar: 62, rim: [0, 0, 0], woodK: 0 },
  // the pivot kitchen: a NEW warm colour world. fix r1 (A1 P2 shot 11: flat, no window key): a golden low sun from the
  // side window (KEY_KITCHEN) and violet-plum shade, so the bottle throws a readable shadow across the cloth
  // fix r2 (A2: the kitchen ran too hot, b* +37 / chroma 48; A2 P2: no readable sun direction): a stronger, LESS orange
  // key (b 0.98 -> 1.16) against a darker violet-plum shade, so the window side reads as a sun and the shadow side cools;
  // the sun patch on the cloth + the warm bounce round the window are sets_int.ts pools
  kitchen: { ...ROOM, el: 35, key: KEY_KITCHEN, lit: [1.84, 1.64, 1.3], shade: [0.48, 0.42, 0.66], lift: [0.026, 0.02, 0.036], lambert: 0.34, term: 0.12, charTint: [1.0, 0.96, 0.9],
    blob: [0.56, 0.44, 0.6], woodShade: [0.56, 0.42, 0.44], woodK: 0.5 },
  // the pump room at night. fix r1 (A1 P1 shot 13: read as dusk, lavender walls L* 65-75): a much darker ROYAL-BLUE
  // shade (#2E3A8E-#45509E on screen) and almost no lift; the warmth lives ONLY in the lamp spots (shade.ts ZONE) and in
  // tight, strong amber pools (sets_int.ts), so the darks stay blue and the pools read warm (no lavender mix)
  pump_night: { ...GOLD, az: 0, el: 70, key: KEY_PUMP, lit: [2.4, 1.42, 0.6], shade: [0.07, 0.12, 0.52], lift: [0.004, 0.01, 0.05], lambert: 0.3, term: 0.12,
    fill: [0.0, 0.003, 0.014], sideK: 0.84, charTint: [1.0, 0.88, 0.75], charShade: 0.84, charGrad: 0.09, bodyGrad: 0.25, sideTint: [0.78, 0.82, 1.0],
    blob: [0.38, 0.44, 0.8], fog: "#10183a", fogNear: 400, fogFar: 1500, showSun: false, sunCol: "#ffc27a", grade: "night",
    bias: -0.0004, normalBias: 0.02, rim: [0, 0, 0], woodK: 0 },
  // the fallout street: overcast slate. fix r1 (A1 P2 shot 14): a soft cool key from the upper-left front (KEY_STREET,
  // world space) over slate-blue shade, so the awning, kiosk and people cast soft blue-violet shadows
  // fix r2 (A2 P2 shot 14: flat and milky, C* ~22): a slightly warm key (sun behind thin cloud) over a cooler
  // blue-violet shade (#5A6690 class) for a key / fill split, more cosine modelling on the facade
  street_grey: { ...DAY, az: 50, el: 40, key: KEY_STREET, lit: [1.22, 1.18, 1.16], shade: [0.42, 0.47, 0.72], lift: [0.012, 0.016, 0.036], lambert: 0.44, sideK: 0.86, term: 0.24,
    charTint: [0.97, 0.97, 1.0], sideTint: [0.88, 0.89, 0.98], blob: [0.5, 0.52, 0.66], actorShadow: true,
    fog: "#b4bac4", fogNear: 40, fogFar: 420, sunCol: "#e8ecf2", sunI: 1.4, rim: [0, 0, 0], woodK: 0.3, bias: -0.0005, normalBias: 0.02 },
  // the investor's office: warm sunny side-window key, warm cream shade; the back window is a warm pool + shafts
  // fix r2 (A2 P2 shot 15: one orange note, b* +31 vs the bible's +17-21 / A2 colour: office runs hot): a less orange
  // key, the shade pushed toward PLUM ([0.52, 0.44, 0.5]) so the shadows carry violet; the mullion light patch + the sun
  // shaft are sets_int.ts shapes
  office_sun: { ...ROOM, el: 33, key: KEY_OFFICE, lit: [1.56, 1.4, 1.18], shade: [0.52, 0.44, 0.5], lift: [0.03, 0.024, 0.03], lambert: 0.32, term: 0.15, charTint: [1.0, 0.95, 0.88],
    blob: [0.6, 0.5, 0.54], woodShade: [0.56, 0.42, 0.44], woodK: 0.55 },
  // ... warmed and brightened on "Warren Buffett" (the music swell). fix r1 (A1 P3: +7 % only): a clearly warmer key
  // (toward #FFD9A0) and warmer shade; sets_int.ts adds the sun shaft + motes as a SHAPE
  // fix r2 (A2 P1 shot 15: the swell turned into a milky wash, L* 56 -> 69, p5 L* 21 -> 26): NO extra lift (the same as
  // office_sun), a gentler key, a less hot card tint; the warmth shows as LIGHT (the shaft, the window rim, motes)
  office_glow: { ...ROOM, el: 33, key: KEY_OFFICE, lit: [1.62, 1.38, 1.04], shade: [0.54, 0.45, 0.5], lift: [0.03, 0.024, 0.026], lambert: 0.32, term: 0.15, charTint: [1.0, 0.93, 0.82],
    blob: [0.6, 0.5, 0.52], woodShade: [0.6, 0.45, 0.44], woodK: 0.55 },
};

const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#bcc4ea" };     // lavender undersides
const CLOUD_GOLD = { lit: "#ffd9b0", mid: "#f2b0a0", shade: "#a98fc4" };
const SKY_NOON = { c: ["#d3e1ef", "#aecff2", "#72adf1", "#3f90ee", "#1c72e4"], e: [0, 3, 9, 20, 50] };
/** fix r2 (carryover, A2 P3: noon looked grey next to dawn / bank): a saturated noon sky #98C0F3 (horizon) -> #1F80F7 */
const SKY_NOON2 = { c: ["#98c0f3", "#82b4f4", "#5c9ef5", "#3a8ef6", "#1f80f7"], e: [0, 3, 9, 20, 50] };
export const LOOK: Record<LightName, WorldLook> = {
  // peach harbour horizon -> rose -> lilac -> a soft morning blue (bible 6.2 golden / dawn)
  // fix r2 (carryover): #FBC48E (horizon) -> #F7A3B7 -> #8FA6E8 (zenith)
  dawn_gold: { sky: { c: ["#fbc48e", "#f9b3a0", "#f7a3b7", "#c4a5d2", "#8fa6e8"], e: [0, 4, 10, 20, 40] }, cloud: CLOUD_GOLD, bounce: [0.08, 0.04, 0], sat: 1.12 },
  // pale hazy horizon -> saturated deep blue zenith (bible 6.2 day: #1F80F7-#3FA1F5 over #B5D9FB-#E6E3ED)
  noon: { sky: SKY_NOON2, cloud: CLOUD_DAY, bounce: [0.07, 0.035, 0.0], sat: 1.14 },
  late: { sky: { c: ["#f3c98f", "#ecc29c", "#b9b4cc", "#7d9ad6", "#5a86d6"], e: [0, 4, 9, 16, 30] }, cloud: { lit: "#ffd9b0", mid: "#f2c2b0", shade: "#a890c8" }, bounce: [0.09, 0.04, 0], sat: 1.16 },
  // fix r1 (A1 P1): a dark blue storm sky (#6a7696 horizon -> #2f3a5c zenith) with heavy slate-blue cloud mass
  // fix r2 (carryover, WORLD-EXT's storm numbers): sky #8f9cb8 (horizon) -> #45557d, sat 1.05
  storm: { sky: { c: ["#8f9cb8", "#7f8eae", "#6a7aa0", "#56678f", "#45557d"], e: [0, 4, 10, 20, 40] }, cloud: { lit: "#8f9bb8", mid: "#5a6688", shade: "#333d5e" }, bounce: [0, 0, 0.012], sat: 1.05 },
  bank_warm: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.03, 0.02, 0.016], sat: 0.95 },
  trading: { sky: { c: ["#a7b0bf", "#98a2b3", "#858fa2", "#6f7a8e", "#5a6479"], e: [0, 4, 10, 20, 40] }, cloud: { lit: "#b9c0cc", mid: "#8e97a8", shade: "#5f687c" }, bounce: [0.01, 0.01, 0.02], sat: 1.08 },
  // the diagram backdrop: deep water blue (#153A81 / #224974 family)
  cutaway: { sky: { c: ["#2c4f86", "#2a4a80", "#244274", "#1d3966", "#163058"], e: [0, 4, 10, 20, 40] }, cloud: CLOUD_DAY, bounce: [0, 0, 0], sat: 1.04 },
  // fix r2 (A2: kitchen b* +37, chroma 48): world saturation 1.1 -> 1.0, a cooler bounce
  kitchen: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.03, 0.03, 0.025], sat: 0.94 },
  pump_night: { sky: { c: ["#1a2450", "#16204a", "#121a40", "#0e1636", "#0a102c"], e: [0, 4, 10, 20, 40] }, cloud: { lit: "#3a4270", mid: "#2c3360", shade: "#1e2450" }, bounce: [0, 0, 0.02], sat: 0.85 },
  // fix r2 (A2 P2 shot 14: C* ~22, flat milky): sat 1.0 -> 1.08 (the brick toward C* ~35)
  street_grey: { sky: { c: ["#c4c9d1", "#b4bac4", "#a2a9b6", "#8f98a8", "#7c8698"], e: [0, 4, 10, 20, 40] }, cloud: { lit: "#d6dae0", mid: "#b2b8c2", shade: "#8a92a2" }, bounce: [0.01, 0.01, 0.02], sat: 1.08 },
  // fix r2 (A2: office b* +32): sat 1.08 / 1.12 -> 1.0 / 1.04, a cooler bounce
  office_sun: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.03, 0.03, 0.025], sat: 0.95 },
  office_glow: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.04, 0.035, 0.022], sat: 0.98 },
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
  // in a noon -> late blend the SUN leads (fast-out ease): the shadows visibly stretch and the steel turns amber while the
  // sky / fog / clouds keep the slow blend (antitheft round 6b)
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

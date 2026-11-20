// Light-preset TYPES and the shared base presets (from the saladoil engine). The per-owner look files (look_*.ts) build
// their light states from these; lights.ts merges them into LIGHTS / LOOK (every plan.ts LightName must be present).
// lit / shade / lift are LINEAR RGB multipliers for shade.ts (may exceed 1). Sky / fog / cloud colours are ON-SCREEN
// targets. Rules: shadows are never neutral (blue-violet by day, plum in warm rooms, royal blue at night), fog = horizon
// colour, faces stay off-white (charTint is applied at ~55 % and luminance-normalised in cardshade.ts).
export type C3 = [number, number, number];

export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cardshade.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  fog: string; fogNear: number; fogFar: number; sunDisc: string; showSun: boolean;   // depth / sun disc
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
  grade: "day" | "golden" | "night";
  /** interiors only: WORLD-space direction TOWARD the key light (replaces the camera-relative az / el sun) */
  key?: C3;
  /** shade.ts TONE_X extras: warm backlight rim on vertical faces, the wood shade / lift (mixed by woodK) */
  rim: C3; woodShade: C3; woodLift: C3; woodK: number;
  /** additive sky fill on every two-tone face (linear rgb x albedo) */
  fill?: C3;
};
export type WorldLook = {
  sky: { c: string[]; e: number[] };   // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  bounce: C3; sat: number;             // shade.ts uBounce / uSat
  cloud: { lit: string; mid: string; shade: string };
};

/** clear day exterior base */
export const DAY: LightPreset = {
  az: 70, el: 58,
  lit: [1.62, 1.5, 1.3], shade: [0.33, 0.36, 0.8], lift: [0.006, 0.01, 0.036], lambert: 0.35, sideK: 0.82, term: 0.2,
  charTint: [1.0, 0.96, 0.93], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.9, 0.97],
  blob: [0.6, 0.58, 0.66], actorShadow: true,
  fog: "#d3e1ef", fogNear: 60, fogFar: 760, sunDisc: "#000000", showSun: false,
  sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
  bias: -0.00025, normalBias: 0.015, grade: "day",
  rim: [0.25, 0.22, 0.17], woodShade: [0.5, 0.42, 0.62], woodLift: [0.012, 0.014, 0.034], woodK: 0.5,
};
/** a low golden sun base */
export const GOLD: LightPreset = {
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
export const ROOM: LightPreset = {
  ...DAY, az: 0, el: 35, lit: [1.55, 1.27, 0.88], shade: [0.48, 0.38, 0.38], lift: [0.03, 0.02, 0.03], lambert: 0.3,
  sideK: 0.9, term: 0.15, charTint: [1.0, 0.93, 0.83], charShade: 0.88, sideTint: [0.93, 0.89, 0.95], blob: [0.7, 0.62, 0.6],
  fog: "#e9dcc8", fogNear: 400, fogFar: 1500, bias: -0.0005, normalBias: 0.03, rim: [0, 0, 0], woodShade: [0.52, 0.4, 0.38], woodLift: [0.02, 0.012, 0.01], woodK: 0.6,
};
export const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#bcc4ea" };
export const SKY_NOON = { c: ["#d3e1ef", "#aecff2", "#72adf1", "#3f90ee", "#1c72e4"], e: [0, 3, 9, 20, 50] };
/** bloom per light (Typo.tsx): th = key threshold (linear HDR), maxK = max-channel share of the key, i = strength */
export type BloomLook = { th: number; maxK: number; i: number };

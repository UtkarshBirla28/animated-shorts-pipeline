// LOOK of the Tokyo sets (owner TOKYO; first pass by the LEAD): street_day (a bright December day, low winter sun),
// lobby (the exchange atrium: cool white + the ticker glow), lobby_red (the crash: the ticker wall turns red), museum
// (the lobby dimmed, one warm spotlight on the pedestal).
import { DAY, ROOM, LightPreset, WorldLook, BloomLook, C3, CLOUD_DAY } from "./lightbase";
import type { GradeParams } from "./grade";
import type { InkLook } from "./ink";

export const KEY_LOBBY: C3 = [0.35, 0.82, 0.45];      // the atrium skylight / glass front (high, from the front-right)
const LOBBY: LightPreset = { ...ROOM, el: 55, key: KEY_LOBBY, lit: [1.42, 1.46, 1.52], shade: [0.46, 0.5, 0.72], lift: [0.024, 0.03, 0.05], lambert: 0.32,
  sideK: 0.9, term: 0.2, charTint: [0.99, 1.0, 1.02], sideTint: [0.9, 0.93, 1.0], blob: [0.5, 0.54, 0.7], fog: "#c8d2e0", woodK: 0.3 };
export const LIGHTS: Record<string, LightPreset> = {
  // December: the sun is low (~24 deg) even at midday; a crisp blue sky, long cool shadows
  // TOKYO: a WORLD-space key (the low winter sun from the front-left, ~24 deg) instead of the camera-relative sun, so
  // the exchange front (it faces +z) is lit and the trees rake long shadows across the sidewalk onto the stone
  street_day: { ...DAY, az: 60, el: 24, key: [-0.6, 0.42, 0.68], lit: [1.6, 1.46, 1.26], shade: [0.36, 0.4, 0.78], lift: [0.012, 0.016, 0.044], fog: "#c9d8ea", fogNear: 24, fogFar: 330 },
  lobby: LOBBY,
  lobby_red: { ...LOBBY, lit: [1.36, 0.9, 0.9], shade: [0.34, 0.28, 0.52], charTint: [1.0, 0.9, 0.9], blob: [0.5, 0.38, 0.52] },
  // the museum: the key stands in for the spot over the pedestal (masked to its cone by a set ZONE), the rest in shade
  museum: { ...LOBBY, key: [0.16, 0.95, 0.27], lit: [1.5, 1.28, 0.98], shade: [0.34, 0.36, 0.56], lift: [0.03, 0.032, 0.05], charTint: [0.96, 0.96, 1.0] },
};
const SKY_DEC = { c: ["#d8e4f0", "#bcd4f0", "#8cb8ee", "#5f9cea", "#3a82e2"], e: [0, 3, 9, 20, 50] };
const SKY_IN = { c: ["#c8d2e0", "#b8c4d6", "#a4b2c8", "#90a0ba", "#7c8eac"], e: [0, 4, 10, 20, 40] };
export const LOOK: Record<string, WorldLook> = {
  street_day: { sky: SKY_DEC, cloud: CLOUD_DAY, bounce: [0.05, 0.04, 0.02], sat: 1.1 },
  lobby: { sky: SKY_IN, cloud: CLOUD_DAY, bounce: [0.02, 0.03, 0.03], sat: 1.04 },
  lobby_red: { sky: SKY_IN, cloud: CLOUD_DAY, bounce: [0.04, 0.008, 0.01], sat: 1.06 },
  museum: { sky: SKY_IN, cloud: CLOUD_DAY, bounce: [0.01, 0.01, 0.016], sat: 1.0 },
};
const G_DAY: GradeParams = { ky: [0.024, 0.08, 0.215, 0.5, 0.8, 0.94, 0.995], sat: [1.12, 1.22, 1.08], tintS: [0.024, 0.006], tintM: [0.0, 0.0], tintH: [-0.012, 0.004],
  vig: [0.16, 0.42], floor: [22, 22, 42], ev: -0.04 };
const G_LOBBY: GradeParams = { ky: [0.028, 0.09, 0.24, 0.53, 0.8, 0.935, 0.99], sat: [1.08, 1.16, 1.06], tintS: [0.03, -0.008], tintM: [0.006, -0.004], tintH: [-0.01, 0.002],
  vig: [0.22, 0.42], ev: 0.06, floor: [16, 22, 34] };
export const GRADES: Record<string, GradeParams> = {
  street_day: G_DAY,
  lobby: G_LOBBY,
  lobby_red: { ...G_LOBBY, tintM: [-0.004, 0.02], vigCol: [0.3, 0.06, 0.1], vig: [0.3, 0.38] },
  museum: { ...G_LOBBY, ev: 0.25, vig: [0.3, 0.3], vigCol: [0.08, 0.08, 0.2], floor: [12, 14, 30] },
};
export const INK: Record<string, InkLook> = {
  street_day: { color: "#1A1D40", concave: 0.5, surf: 0.3, ao: 0.72, aoTint: "#7C84C0" },
  lobby: { color: "#1C1E3A", concave: 0.3, surf: 0.3, ao: 0.7, aoTint: "#6E7EAE" },
  lobby_red: { color: "#2A1426", concave: 0.3, surf: 0.3, ao: 0.72, aoTint: "#8A4A6E" },
  museum: { color: "#1A1A34", concave: 0.3, surf: 0.3, ao: 0.74, aoTint: "#4E5A92" },
};
export const BLOOM: Record<string, BloomLook> = {
  street_day: { th: 1.7, maxK: 1, i: 0.5 }, lobby: { th: 1.3, maxK: 1, i: 0.6 }, lobby_red: { th: 1.25, maxK: 1, i: 0.7 }, museum: { th: 1.3, maxK: 1, i: 0.65 },
};

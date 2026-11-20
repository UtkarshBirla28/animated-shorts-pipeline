// LOOK of the trading room (owners TRADING + DESK; first pass by the LEAD): light states, world look, grade, ink and
// bloom for desk_am (the 2005 morning: cool window light from the -z window wall + warm desk lamps), desk_dim (the
// mystery), alarm_red (the cancel beat), desk_eve (the bill: low orange light through the blinds).
import { ROOM, GOLD, LightPreset, WorldLook, BloomLook, C3 } from "./lightbase";
import type { GradeParams } from "./grade";
import type { InkLook } from "./ink";

/** the window wall is on -z: the key comes from there (world space, toward the light), a little from screen left */
export const KEY_TRADING_AM: C3 = [-0.25, 0.62, -0.74];
export const KEY_TRADING_EVE: C3 = [-0.45, 0.24, -0.86];
const AM: LightPreset = { ...ROOM, el: 38, key: KEY_TRADING_AM, lit: [1.46, 1.38, 1.22], shade: [0.38, 0.42, 0.74], lift: [0.02, 0.022, 0.04], lambert: 0.34,
  sideK: 0.88, term: 0.18, charTint: [0.98, 0.99, 1.02], sideTint: [0.9, 0.92, 1.0], blob: [0.5, 0.52, 0.68], fog: "#9fb2cc",
  woodShade: [0.5, 0.42, 0.52], woodLift: [0.02, 0.016, 0.03], woodK: 0.8 };   // fix2 (audit 3): a warmer key, a bluer shade, more wood
export const LIGHTS: Record<string, LightPreset> = {
  desk_am: AM,
  desk_dim: { ...AM, lit: [0.96, 1.02, 1.18], shade: [0.3, 0.32, 0.56], lift: [0.012, 0.014, 0.034], charTint: [0.94, 0.96, 1.04] },
  alarm_red: { ...AM, lit: [1.62, 0.54, 0.48], shade: [0.36, 0.11, 0.21], lift: [0.03, 0.006, 0.02], charTint: [1.0, 0.84, 0.82], sideTint: [0.92, 0.82, 0.96], blob: [0.5, 0.36, 0.5] },
  desk_eve: { ...GOLD, az: 0, el: 12, key: KEY_TRADING_EVE, lit: [1.5, 0.98, 0.56], shade: [0.5, 0.36, 0.48], lift: [0.05, 0.03, 0.045], lambert: 0.32, term: 0.12,
    charTint: [1.0, 0.88, 0.74], sideTint: [0.86, 0.82, 0.96], fog: "#e8b896", fogNear: 400, fogFar: 1500, showSun: false, rim: [0, 0, 0], woodK: 0.8,
    woodShade: [0.42, 0.3, 0.38], woodLift: [0.03, 0.02, 0.03] },
};
const SKY_AM = { c: ["#c7d6e8", "#b3c9e4", "#93b4e0", "#729cd8", "#5a88d0"], e: [0, 4, 10, 20, 40] };
const SKY_EVE = { c: ["#ffc890", "#f6aa86", "#d68e9a", "#9a84b4", "#6a76b0"], e: [0, 4, 10, 20, 40] };
const CLOUD = { lit: "#eef2f8", mid: "#cdd6e6", shade: "#a8b4d0" };
export const LOOK: Record<string, WorldLook> = {
  desk_am: { sky: SKY_AM, cloud: CLOUD, bounce: [0.02, 0.024, 0.03], sat: 1.04 },
  desk_dim: { sky: SKY_AM, cloud: CLOUD, bounce: [0.01, 0.012, 0.022], sat: 1.0 },
  alarm_red: { sky: SKY_AM, cloud: CLOUD, bounce: [0.03, 0.006, 0.01], sat: 1.06 },
  desk_eve: { sky: SKY_EVE, cloud: { lit: "#ffd9b0", mid: "#f2b0a0", shade: "#a98fc4" }, bounce: [0.05, 0.03, 0.01], sat: 1.06 },
};
const G_AM: GradeParams = { ky: [0.03, 0.095, 0.25, 0.54, 0.8, 0.935, 0.99], sat: [1.2, 1.3, 1.1], tintS: [0.02, -0.004], tintM: [0.004, 0.0], tintH: [-0.014, 0.006],
  vig: [0.28, 0.4], ev: 0.08, vigCol: [0.12, 0.16, 0.3], floor: [16, 20, 38] };
export const GRADES: Record<string, GradeParams> = {
  desk_am: G_AM,
  desk_dim: { ...G_AM, ev: -0.05, vig: [0.34, 0.34], sat: [1.08, 1.12, 1.04], tintS: [0.04, -0.004] },
  alarm_red: { ...G_AM, ev: 0.0, sat: [1.14, 1.24, 1.08], tintS: [0.03, 0.012], tintM: [-0.004, 0.022], vig: [0.32, 0.36], vigCol: [0.3, 0.06, 0.12], floor: [24, 10, 30] },
  desk_eve: { ky: [0.03, 0.09, 0.24, 0.53, 0.81, 0.94, 0.99], sat: [1.04, 1.14, 1.06], tintS: [0.032, 0.012], tintM: [-0.02, 0.008], tintH: [-0.024, 0.01],
    vig: [0.26, 0.38], vigCol: [0.42, 0.22, 0.2], floor: [38, 24, 40], ev: 0.12 },
};
export const INK: Record<string, InkLook> = {
  desk_am: { color: "#1C1E3A", concave: 0.25, surf: 0.3, ao: 0.72, aoTint: "#6E7AAE" },
  desk_dim: { color: "#1A1C36", concave: 0.25, surf: 0.3, ao: 0.74, aoTint: "#5E6AA0" },
  alarm_red: { color: "#2A1426", concave: 0.25, surf: 0.3, ao: 0.74, aoTint: "#8A4A6E" },
  desk_eve: { color: "#2B1A22", concave: 0.25, surf: 0.3, ao: 0.72, aoTint: "#9A7488" },
};
export const BLOOM: Record<string, BloomLook> = {
  desk_am: { th: 1.4, maxK: 1, i: 0.6 }, desk_dim: { th: 1.3, maxK: 1, i: 0.7 }, alarm_red: { th: 1.35, maxK: 1, i: 0.7 }, desk_eve: { th: 1.6, maxK: 0.8, i: 0.55 },
};

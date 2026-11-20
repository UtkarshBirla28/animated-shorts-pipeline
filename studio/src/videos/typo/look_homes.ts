// LOOK of the homes set (owner HOMES): homes = a warm late-morning sun raking low into a cut-open building from the
// street side (front-left), so it reaches deep into the rooms (the slab above prints a soft shadow band across each back
// wall); each room adds its own practical pool (fluorescent, washi lamp, neon, ceiling light) and the screens' glow.
import { ROOM, LightPreset, WorldLook, BloomLook, C3, SKY_NOON, CLOUD_DAY } from "./lightbase";
import type { GradeParams } from "./grade";
import type { InkLook } from "./ink";

export const KEY_HOMES: C3 = [-0.3, 0.27, 0.92];   // low warm sun from the front, a little left (the cut face), el ~16 deg
export const LIGHTS: Record<string, LightPreset> = {
  homes: { ...ROOM, el: 16, key: KEY_HOMES, lit: [1.62, 1.34, 0.98], shade: [0.56, 0.45, 0.48], lift: [0.03, 0.022, 0.034], lambert: 0.3, term: 0.16,
    charTint: [1.0, 0.95, 0.88], blob: [0.6, 0.5, 0.56], woodShade: [0.52, 0.4, 0.44], woodK: 0.6, fog: "#e6d8c6" },
};
export const LOOK: Record<string, WorldLook> = {
  homes: { sky: SKY_NOON, cloud: CLOUD_DAY, bounce: [0.04, 0.032, 0.026], sat: 1.06 },
};
export const GRADES: Record<string, GradeParams> = {
  homes: { ky: [0.032, 0.1, 0.26, 0.55, 0.81, 0.94, 1], sat: [1.04, 1.1, 1.02], tintS: [0.03, 0.01], tintM: [0.0, 0.004], tintH: [-0.012, 0.004],
    vig: [0.24, 0.4], ev: 0.14, vigCol: [0.3, 0.2, 0.24], floor: [28, 18, 30] },
};
export const INK: Record<string, InkLook> = {
  homes: { color: "#2A1A26", concave: 0.25, surf: 0.3, ao: 0.72, aoTint: "#9C7A86" },
};
export const BLOOM: Record<string, BloomLook> = { homes: { th: 1.45, maxK: 1, i: 0.6 } };

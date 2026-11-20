// LOOK of the campus square (owner WORLD): sq_day (a sunny spring afternoon: warm key, soft blue shade, saturated but
// not garish; the set's palette stays in brick reds, greens, blues, cream and teal so the clown's purple + yellow can be
// the most saturated thing in frame) and sq_call (the same light a little drained: "your mind takes the call").
// ONE world sun (plan.ts SUN) for every shot, so every angle inside the square lights the same way.
import { DAY, ROOM, LightPreset, WorldLook, BloomLook, CLOUD_DAY } from "./lightbase";
import type { GradeParams } from "./grade";
import type { InkLook } from "./ink";
import { SUN, OFFICE_KEY } from "./plan";

const SQ_DAY: LightPreset = { ...DAY, az: 60, el: 39, key: SUN,
  lit: [1.66, 1.5, 1.24], shade: [0.54, 0.55, 0.92], lift: [0.018, 0.022, 0.052],   /* p3: was shade [0.4, 0.44, 0.84], lift [0.008, 0.012, 0.04] */ lambert: 0.32, sideK: 0.84, term: 0.2,
  charTint: [1.0, 0.965, 0.93], charShade: 0.87, sideTint: [0.92, 0.91, 0.98], blob: [0.58, 0.56, 0.7],
  fog: "#d4e2ee", fogNear: 38, fogFar: 560,   /* LOOK v2: more air (was 70 / 900): the far lawn and facades take ~20 % haze */ rim: [0.2, 0.17, 0.12], woodShade: [0.52, 0.42, 0.56], woodK: 0.5 };
/** (LOOK v2) Hyman's office: the afternoon sun rakes in low through the west window (plan.ts OFFICE_KEY), a honey key and
 *  a warm plum-rose shade (never grey), lifted by office.ts's warm bounce pools; softer than the square */
const OF_WARM: LightPreset = { ...ROOM, az: 0, el: 25, key: OFFICE_KEY,
  lit: [1.98, 1.56, 1.04], shade: [0.55, 0.44, 0.48], lift: [0.03, 0.02, 0.026], lambert: 0.3, sideK: 0.9, term: 0.16,
  charTint: [1.0, 0.95, 0.87], charShade: 0.88, sideTint: [0.94, 0.9, 0.95], blob: [0.62, 0.52, 0.54],
  fog: "#e9dcc8", fogNear: 400, fogFar: 1500, rim: [0, 0, 0], woodShade: [0.6, 0.47, 0.44], woodLift: [0.02, 0.012, 0.01], woodK: 0.6 };
export const LIGHTS: Record<string, LightPreset> = {
  sq_day: SQ_DAY,
  sq_call: { ...SQ_DAY, lit: [1.46, 1.4, 1.3], shade: [0.42, 0.45, 0.74], charTint: [0.98, 0.97, 0.97] },
  office: OF_WARM,
  /** S20 slow motion: the same sun a touch cooler and softer (the grade adds the cool vignette) */
  /** S6 relight (an hour passes): the same sun a little lower and warmer */
  sq_warm: { ...SQ_DAY, lit: [1.92, 1.44, 0.92], shade: [0.46, 0.4, 0.76], charTint: [1.0, 0.93, 0.83] },   /* p3: clearly later and warmer */
  sq_slow: { ...SQ_DAY, lit: [1.56, 1.48, 1.34], shade: [0.42, 0.47, 0.82], charTint: [0.98, 0.97, 0.98] },
};
/** a clean spring sky: pale at the horizon (the far hills sit in it), deep cobalt overhead */
const SKY_SPRING = { c: ["#d6e8f6", "#b4d6f6", "#7db8f4", "#4a98ee", "#2a78e0"], e: [0, 3, 10, 24, 55] };
export const LOOK: Record<string, WorldLook> = {
  sq_day: { sky: SKY_SPRING, cloud: CLOUD_DAY, bounce: [0.07, 0.035, 0.02], sat: 1.02 },   /* LOOK v2: 1.12 -> 1.02 (the world, never the cards) */
  sq_call: { sky: { c: ["#d4e0ea", "#bccfe2", "#94b4d8", "#7098cc", "#5684c0"], e: [0, 3, 10, 24, 55] }, cloud: CLOUD_DAY, bounce: [0.03, 0.02, 0.02], sat: 0.72 },
  /** the office: a warm hazy afternoon sky over the trees outside the window */
  office: { sky: { c: ["#f2e2c8", "#e4dcd0", "#bcd2e6", "#8cb6e2", "#6a9ed8"], e: [0, 4, 12, 26, 55] }, cloud: CLOUD_DAY, bounce: [0.05, 0.035, 0.025], sat: 1.04 },
  sq_warm: { sky: { c: ["#f6e2c2", "#d8dce6", "#98c0ee", "#62a0e8", "#4084dc"], e: [0, 4, 12, 26, 55] }, cloud: CLOUD_DAY, bounce: [0.1, 0.045, 0.02], sat: 1.0 },
  sq_slow: { sky: SKY_SPRING, cloud: CLOUD_DAY, bounce: [0.06, 0.035, 0.025], sat: 1.0 },
};
const G_DAY: GradeParams = { ky: [0.022, 0.078, 0.215, 0.505, 0.805, 0.942, 0.995], sat: [1.1, 1.2, 1.08], tintS: [0.022, 0.004], tintM: [-0.002, 0.004], tintH: [-0.012, 0.006],
  vig: [0.26, 0.3], vigCol: [0.3, 0.26, 0.44], floor: [20, 20, 40], ev: -0.02 };   /* LOOK v2: a soft violet vignette (corners ~0.85 of the centre) */
export const GRADES: Record<string, GradeParams> = {
  sq_day: G_DAY,
  sq_call: { ...G_DAY, sat: [0.78, 0.74, 0.8], tintM: [0.006, -0.004], vig: [0.26, 0.4], vigCol: [0.16, 0.2, 0.34] },
  /** the office: plum-rose darks, honey highlights, a warm vignette leaning toward the window side */
  office: { ky: [0.034, 0.1, 0.255, 0.54, 0.8, 0.935, 1], sat: [1.02, 1.06, 1.0], tintS: [0.03, 0.012], tintM: [-0.002, 0.004], tintH: [-0.014, 0.006],
    vig: [0.26, 0.38], ev: 0.06, vigCol: [0.4, 0.24, 0.22], floor: [32, 20, 28] },
  /** S6 an hour later: warmer mids / highlights */
  sq_warm: { ...G_DAY, tintM: [-0.022, 0.018], tintH: [-0.034, 0.02] },
  /** S20 slow motion: a touch cooler (Cb + in the mids / highlights), the saturation a hair down, a soft blue vignette */
  sq_slow: { ...G_DAY, sat: [1.0, 1.06, 1.0], tintM: [0.012, -0.006], tintH: [0.004, -0.004], vig: [0.3, 0.34], vigCol: [0.22, 0.26, 0.42], ev: -0.04 },
};
export const INK: Record<string, InkLook> = {
  sq_day: { color: "#2A1C34", concave: 0.45, surf: 0.3, ao: 0.7, aoTint: "#7E7CC2" },
  sq_call: { color: "#2A2238", concave: 0.45, surf: 0.3, ao: 0.66, aoTint: "#8488B8" },
  office: { color: "#2B1A1E", concave: 0.3, surf: 0.3, ao: 0.72, aoTint: "#A27E80" },
  sq_warm: { color: "#2C1C30", concave: 0.45, surf: 0.3, ao: 0.7, aoTint: "#8A7CB8" },
  sq_slow: { color: "#2A1E38", concave: 0.45, surf: 0.3, ao: 0.7, aoTint: "#7E80C6" },
};
export const BLOOM: Record<string, BloomLook> = {
  sq_day: { th: 1.75, maxK: 1, i: 0.5 }, sq_call: { th: 1.75, maxK: 1, i: 0.45 },
  office: { th: 1.55, maxK: 1, i: 0.55 }, sq_warm: { th: 1.75, maxK: 1, i: 0.5 }, sq_slow: { th: 1.75, maxK: 1, i: 0.45 },
};

/* "of_warm" = "office" (an alias: the shot table may use either name) */
for (const T of [LIGHTS, LOOK, GRADES, INK, BLOOM] as Record<string, unknown>[]) T.of_warm = T.office;

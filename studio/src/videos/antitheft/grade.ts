// Colour grade (antitheft POST pass, 2026-11-10): the template's GradeEffect (references/grade/GradeEffect.ts) plus ONE
// preset per light state (plan.ts LightName: noon, dim, late, morning, sunset, dusk, night_int, classroom, blueprint),
// hand-set against CHANNEL_STYLE_BIBLE 6.1 / 6.2 / 13.E-35 (mean L* ~47, chroma ~29, coloured darks, vignette corner /
// centre day ~.86, golden ~.75, night ~.46). gradeFor(fx, a, b, k) blends two presets with lightAt's relight factor,
// and every crossfade layer (its own Inner / GradeEffect) grades with its own shot's light.
// The fitted GRADE_DAY / GRADE_GOLDEN below are the template's (fitted to the old unlit bridge stills) and unused.
// GradeEffect: the fitted reference-style colour grade as a postprocessing 6.37 Effect.
// Put it LAST in the EffectComposer, after ToneMappingEffect. It works on display-referred values: the input (linear,
// already tone-mapped to 0..1) is encoded to sRGB, graded exactly like scripts/grade.py (validated on our stills), and
// decoded back to linear for the composer's output encoding.
//   1. RGB tone curve: monotone cubic Hermite through 7 knots at x = 0, .1, .25, .5, .75, .9, 1
//   2. saturation around luma Y' (Rec.709 weights on the encoded values), separately for shadows / mids / highlights
//   3. 3-way tint (split tone): zero-luma RGB offsets in shadows, mids, highlights
//   4. vignette: x (1 - k * smoothstep(r0, 1, r)), r = elliptical radius, corners = 1
// `amount` blends the whole grade (0 = bypass) so it can be dialled back once lighting/albedo work brightens the render.
import { Effect, BlendFunction } from "postprocessing";
import { Uniform, Vector3, Vector2, Vector4 } from "three";
import type { LightName } from "./plan";
import { SHOTS } from "./story";

const frag = /* glsl */ `
uniform float gradeKy[7];
uniform float gradeKm[7];
uniform vec3 gradeSat;      // x = shadows, y = mids, z = highlights
uniform vec3 gradeTintS;    // zero-luma RGB offsets (sRGB-encoded units)
uniform vec3 gradeTintM;
uniform vec3 gradeTintH;
uniform vec2 gradeVig;      // x = strength k, y = start radius r0
uniform vec3 gradeVigCol;   // what the vignette darkens TOWARD (display RGB multiplier; 0,0,0 = plain darkening)
uniform float gradeEV;      // exposure (stops) on the display-linear input, before the curve
uniform vec4 gradeBand;     // hue band: centre (deg, HSV), half width (deg), saturation x, hue shift (deg, - = toward red)
uniform float gradeBandV;   // band value x (round 4: deepens the band's colour, e.g. the night planks)
uniform vec4 gradeBandG;    // band gates (round 4): luma window lo, hi (lo < 0 = the old zone weights), chroma gate lo, hi
uniform vec4 gradeGrad;     // ground grad: x = strength, y = top of the ramp (uv.y from the bottom), z = band highlight weight
uniform vec3 gradeGradCol;  // what the ground grad darkens toward (display RGB multiplier)
uniform vec4 gradeFloor;    // round 5: coloured black floor (display RGB), w = 1 on: a soft toe, never a flat lift
uniform vec3 gradeVTop;     // round 5: vertical split tint: zero-luma RGB offset at the top ...
uniform vec3 gradeVBot;     // ... and at the bottom of the frame
uniform vec2 gradeVRange;   // the ramp (uv.y from the bottom): bottom tint below x, top tint above y
uniform vec2 gradeVigC;     // round 5: vignette centre (uv), so a CU vignette can hold the face / the tag
uniform float gradeAmount;

vec3 gradeEncode(vec3 c) {   // linear -> sRGB
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 gradeDecode(vec3 c) {   // sRGB -> linear
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
float gradeHermite(float v, float x0, float x1, float y0, float y1, float m0, float m1) {
  float h = x1 - x0, t = (v - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2.0 * t3 - 3.0 * t2 + 1.0) * y0 + (t3 - 2.0 * t2 + t) * h * m0 + (-2.0 * t3 + 3.0 * t2) * y1 + (t3 - t2) * h * m1;
}
float gradeCurve(float v) {
  v = clamp(v, 0.0, 1.0);
  if (v < 0.1)  return gradeHermite(v, 0.0, 0.1, gradeKy[0], gradeKy[1], gradeKm[0], gradeKm[1]);
  if (v < 0.25) return gradeHermite(v, 0.1, 0.25, gradeKy[1], gradeKy[2], gradeKm[1], gradeKm[2]);
  if (v < 0.5)  return gradeHermite(v, 0.25, 0.5, gradeKy[2], gradeKy[3], gradeKm[2], gradeKm[3]);
  if (v < 0.75) return gradeHermite(v, 0.5, 0.75, gradeKy[3], gradeKy[4], gradeKm[3], gradeKm[4]);
  if (v < 0.9)  return gradeHermite(v, 0.75, 0.9, gradeKy[4], gradeKy[5], gradeKm[4], gradeKm[5]);
  return gradeHermite(v, 0.9, 1.0, gradeKy[5], gradeKy[6], gradeKm[5], gradeKm[6]);
}

float gradeHue(vec3 c, out float chroma) {   // HSV hue in degrees (0 = red, 30 = orange, 60 = yellow)
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), d = mx - mn;
  chroma = d;
  if (d < 1e-5) return 0.0;
  float h = mx == c.r ? mod((c.g - c.b) / d, 6.0) : (mx == c.g ? (c.b - c.r) / d + 2.0 : (c.r - c.g) / d + 4.0);
  return 60.0 * h;
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 src = gradeEncode(inputColor.rgb);
  vec3 c = gradeEncode(inputColor.rgb * exp2(gradeEV));
  c = vec3(gradeCurve(c.r), gradeCurve(c.g), gradeCurve(c.b));
  const vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float y = dot(c, W);
  float wS = 1.0 - smoothstep(0.0, 0.55, y);
  float wH = smoothstep(0.45, 1.0, y);
  float wM = 1.0 - wS - wH;
  float s = gradeSat.y + (gradeSat.x - gradeSat.y) * wS + (gradeSat.z - gradeSat.y) * wH;
  // hue band (round 3): one hue range (e.g. the pumpkin-orange morning floor) gets its own saturation and a small hue
  // turn, in the mid-tones only (the gold highlights and the sky keep their colour), gated by chroma (greys untouched)
  // round 4: an optional luma window (gradeBandG.xy, display luma after the curve) replaces the zone weights, so a band
  // can act on the mid-light floor only (L* ~45-70) and leave the dark wood / the sunlit gold alone, and a chroma gate
  // (gradeBandG.zw) keeps the low-chroma khaki / greys out of it
  float wb = 0.0;
  if (gradeBand.y > 0.0) {
    float ch, hd = abs(mod(gradeHue(c, ch) - gradeBand.x + 180.0, 360.0) - 180.0);
    float wz = gradeBandG.x < 0.0 ? (wM + 0.35 * wS + gradeGrad.z * wH)
      : smoothstep(gradeBandG.x - 0.1, gradeBandG.x + 0.04, y) * (1.0 - smoothstep(gradeBandG.y - 0.04, gradeBandG.y + 0.1, y));
    wb = (1.0 - smoothstep(0.55 * gradeBand.y, gradeBand.y, hd)) * smoothstep(gradeBandG.z, gradeBandG.w, ch) * wz;
    s *= mix(1.0, gradeBand.z, wb);
  }
  c = vec3(y) + s * (c - vec3(y));
  if (wb > 0.0 && gradeBand.w != 0.0) {   // turn the band's chroma about the luma axis (Rec.709 Cb / Cr plane)
    float cb = (c.b - y) / 1.8556, cr = (c.r - y) / 1.5748, t = radians(gradeBand.w) * wb, cs = cos(t), sn = sin(t);
    float cb2 = cb * cs - cr * sn, cr2 = cb * sn + cr * cs;
    float R = y + 1.5748 * cr2, B = y + 1.8556 * cb2;
    c = vec3(R, (y - 0.2126 * R - 0.0722 * B) / 0.7152, B);
  }
  if (wb > 0.0) c *= mix(1.0, gradeBandV, wb);
  c += wS * gradeTintS + wM * gradeTintM + wH * gradeTintH;
  if (gradeVRange.y > gradeVRange.x) c += mix(gradeVBot, gradeVTop, smoothstep(gradeVRange.x, gradeVRange.y, uv.y));
  vec2 p = (uv - gradeVigC) * 2.0;
  float r = length(p) * 0.70710678;
  c *= mix(vec3(1.0), gradeVigCol, gradeVig.x * smoothstep(gradeVig.y, 1.0, r));
  if (gradeGrad.x > 0.0) c *= mix(vec3(1.0), gradeGradCol, gradeGrad.x * smoothstep(gradeGrad.y, 0.0, uv.y));
  c = clamp(c, 0.0, 1.0);
  // round 5 (audit A4 FILM P3: the darkest pixels were ~(10,3,9), green crushed to 0 by the shadow tints): a soft
  // coloured toe on LUMA, y' = (y^3 + yf^3)^(1/3), the lift added in the floor's own colour: black -> the floor colour,
  // mids untouched (+1 level at 2x the floor luma), and a saturated dark (brown sign letters, navy wood) keeps its hue
  // (a per-channel toe turned the blueprint sign's brown text purple), so the ink and the deepest shade read as
  // coloured darks like the references' (35,19,20) / (31,25,45)
  if (gradeFloor.w > 0.5) {
    float yc = dot(c, W), yf = max(dot(gradeFloor.rgb, W), 1e-4);
    c += (pow(yc * yc * yc + yf * yf * yf, 1.0 / 3.0) - yc) * gradeFloor.rgb / yf;
  }
  outputColor = vec4(gradeDecode(mix(src, c, gradeAmount)), inputColor.a);
}`;

// BT.709 zero-luma chroma basis (sRGB-encoded units): unit Cb and unit Cr as RGB offsets with Y' unchanged
const E_CB: [number, number, number] = [0.0, -0.18733, 1.8556];
const E_CR: [number, number, number] = [1.5748, -0.46813, 0.0];
export const tintRGB = (cb: number, cr: number) =>
  new Vector3(cb * E_CB[0] + cr * E_CR[0], cb * E_CB[1] + cr * E_CR[1], cb * E_CB[2] + cr * E_CR[2]);

/** Fritsch-Carlson monotone tangents for the 7 fixed knots (same as scripts/grade.py `tangents`) */
export const KX = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
export function monoTangents(ky: number[]): number[] {
  const n = KX.length, h: number[] = [], d: number[] = [], m = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) { h.push(KX[k + 1] - KX[k]); d.push((ky[k + 1] - ky[k]) / h[k]); }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) { m[k] = 0; continue; }
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
  }
  return m;
}

export type GradeParams = {
  ky: number[];                                  // 7 curve values at KX
  sat: [number, number, number];                 // shadows, mids, highlights
  tintS: [number, number]; tintM: [number, number]; tintH: [number, number];   // (Cb, Cr) per zone
  vig: [number, number];                         // strength, start radius
  /** round 3: the colour the vignette darkens toward (display RGB multiplier, default [0,0,0] = plain darkening; a
   *  warm golden vignette is e.g. [0.42, 0.24, 0.06]: blue falls fastest, red slowest) */
  vigCol?: [number, number, number];
  /** round 3: exposure in stops on the display-linear input before the curve (default 0) */
  ev?: number;
  /** round 3: hue band [centre deg (HSV), half width deg, saturation x, hue turn deg (- = toward red)] (default off) */
  band?: [number, number, number, number];
  /** round 3: how much the band also acts in the highlights (0 = mids / shadows only) */
  bandH?: number;
  /** round 4: band gates [luma lo, luma hi, chroma lo, chroma hi] (display units; luma lo < 0 = the zone weights) */
  bandG?: [number, number, number, number];
  /** round 4: value x inside the band (1 = off) */
  bandV?: number;
  /** round 3: ground grad [strength, ramp top (uv.y from the bottom)] darkening the lower frame toward gradCol */
  grad?: [number, number]; gradCol?: [number, number, number];
  /** round 5: coloured black floor (display RGB 0..255) */
  floor?: [number, number, number];
  /** round 5: vertical split tint [top Cb, top Cr, bottom Cb, bottom Cr, ramp bottom y, ramp top y] (uv.y from the bottom) */
  vgrad?: [number, number, number, number, number, number];
  /** round 5: vignette centre (uv, y from the bottom; default [0.5, 0.5]) */
  vigC?: [number, number];
};
const VG0: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
const GRADCOL0: [number, number, number] = [0, 0, 0];
const VIG0: [number, number, number] = [0, 0, 0];
const BAND0: [number, number, number, number] = [30, 0, 1, 0];
const BANDG0: [number, number, number, number] = [-1, 2, 0.04, 0.14];

// __GRADES__ (fitted by scripts/fit2.py, written by scripts/emit_ts.py)
export const GRADE_DAY: GradeParams = {
  ky: [0.0345, 0.1828, 0.3812, 0.6605, 0.8814, 0.9631, 1],   // tangents: [1.4831, 1.4038, 1.2198, 0.9867, 0.6608, 0.4346, 0.3693]
  sat: [0.9831, 1.2727, 1.4573],
  tintS: [-0.0291, 0.0411], tintM: [0.0376, -0.0104], tintH: [0.0144, -0.0047],
  vig: [0.1, 0.45],
};
//   shadows tint: hue 20 deg, RGB offset (+16.5, -3.5, -13.8)/255
//   mids tint: hue 230 deg, RGB offset (-4.2, -0.6, +17.8)/255
//   highlights tint: hue 228 deg, RGB offset (-1.9, -0.1, +6.8)/255
export const GRADE_GOLDEN: GradeParams = {
  ky: [0.0311, 0.1877, 0.4017, 0.6754, 0.875, 0.9582, 1],   // tangents: [1.5667, 1.498, 1.2526, 0.9235, 0.6445, 0.4724, 0.4183]
  sat: [0.8316, 0.8799, 1.7061],
  tintS: [0.0528, 0.0004], tintM: [0.0583, -0.0003], tintH: [0, 0],
  vig: [0.16, 0.4],
};
//   shadows tint: hue 246 deg, RGB offset (+0.2, -2.6, +25.0)/255
//   mids tint: hue 245 deg, RGB offset (-0.1, -2.7, +27.6)/255
//   highlights tint: hue 0 deg, RGB offset (+0.0, -0.0, +0.0)/255

/** blend two hue bands: same band -> lerp; one side off -> keep the live band's hue / width and fade sat and turn to 1 / 0 */
const blendBand = (a: GradeParams["band"], b: GradeParams["band"], t: number): [number, number, number, number] => {
  const A = a && a[1] > 0 ? a : null, B = b && b[1] > 0 ? b : null;
  if (!A && !B) return BAND0;
  const P = A ?? [B![0], B![1], 1, 0], Q = B ?? [A![0], A![1], 1, 0];
  return [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, P[2] + (Q[2] - P[2]) * t, P[3] + (Q[3] - P[3]) * t];
};
export class GradeEffect extends Effect {
  constructor(p: GradeParams, amount = 1) {
    super("GradeEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["gradeKy", new Uniform(p.ky.slice())],
        ["gradeKm", new Uniform(monoTangents(p.ky))],
        ["gradeSat", new Uniform(new Vector3(...p.sat))],
        ["gradeTintS", new Uniform(tintRGB(...p.tintS))],
        ["gradeTintM", new Uniform(tintRGB(...p.tintM))],
        ["gradeTintH", new Uniform(tintRGB(...p.tintH))],
        ["gradeVig", new Uniform(new Vector2(...p.vig))],
        ["gradeVigCol", new Uniform(new Vector3(...(p.vigCol ?? VIG0)))],
        ["gradeEV", new Uniform(p.ev ?? 0)],
        ["gradeBand", new Uniform(new Vector4(...(p.band ?? BAND0)))],
        ["gradeBandG", new Uniform(new Vector4(...(p.bandG ?? BANDG0)))],
        ["gradeBandV", new Uniform(p.bandV ?? 1)],
        ["gradeGrad", new Uniform(new Vector4((p.grad ?? [0, 0.3])[0], (p.grad ?? [0, 0.3])[1], p.bandH ?? 0, 0))],
        ["gradeGradCol", new Uniform(new Vector3(...(p.gradCol ?? GRADCOL0)))],
        ["gradeFloor", new Uniform(new Vector4())], ["gradeVTop", new Uniform(new Vector3())], ["gradeVBot", new Uniform(new Vector3())],
        ["gradeVRange", new Uniform(new Vector2())], ["gradeVigC", new Uniform(new Vector2(0.5, 0.5))],
        ["gradeAmount", new Uniform(amount)],
      ]),
    });
  }
  /** switch preset per shot (day <-> golden) or blend two presets during a crossfade/time-of-day change */
  set(p: GradeParams, q?: GradeParams, t = 0) {
    const L = (a: number, b: number) => a + (b - a) * t;
    const r: GradeParams = q ? {
      ky: p.ky.map((v, i) => L(v, q.ky[i])),
      sat: [L(p.sat[0], q.sat[0]), L(p.sat[1], q.sat[1]), L(p.sat[2], q.sat[2])],
      tintS: [L(p.tintS[0], q.tintS[0]), L(p.tintS[1], q.tintS[1])], tintM: [L(p.tintM[0], q.tintM[0]), L(p.tintM[1], q.tintM[1])],
      tintH: [L(p.tintH[0], q.tintH[0]), L(p.tintH[1], q.tintH[1])], vig: [L(p.vig[0], q.vig[0]), L(p.vig[1], q.vig[1])],
      vigCol: [0, 1, 2].map((i) => L((p.vigCol ?? VIG0)[i], (q.vigCol ?? VIG0)[i])) as [number, number, number],
      ev: L(p.ev ?? 0, q.ev ?? 0),
      // a band blends by its strength: an "off" side (half width 0) keeps the other side's band and fades its effect
      band: blendBand(p.band, q.band, t), bandH: L(p.bandH ?? 0, q.bandH ?? 0),
      // gates: an "off" band side takes the live side's gates (so the gate never jumps while that band fades)
      bandV: L(p.bandV ?? 1, q.bandV ?? 1),
      bandG: [0, 1, 2, 3].map((i) => L(((p.band && p.band[1] > 0 ? p.bandG : q.bandG) ?? BANDG0)[i], ((q.band && q.band[1] > 0 ? q.bandG : p.bandG) ?? BANDG0)[i])) as [number, number, number, number],
      grad: [L((p.grad ?? [0, 0.3])[0], (q.grad ?? [0, 0.3])[0]), L((p.grad ?? [0, 0.3])[1], (q.grad ?? [0, 0.3])[1])],
      gradCol: [0, 1, 2].map((i) => L((p.gradCol ?? GRADCOL0)[i], (q.gradCol ?? GRADCOL0)[i])) as [number, number, number],
      // a side without a floor blends from black (0 = no lift); vgrad / vigC blend from off / the centre
      floor: (p.floor || q.floor) ? [0, 1, 2].map((i) => L((p.floor ?? [0, 0, 0])[i], (q.floor ?? [0, 0, 0])[i])) as [number, number, number] : undefined,
      vgrad: (p.vgrad || q.vgrad) ? [0, 1, 2, 3, 4, 5].map((i) => i < 4 ? L((p.vgrad ?? VG0)[i], (q.vgrad ?? VG0)[i]) : ((p.vgrad ?? q.vgrad)!)[i]) as GradeParams["vgrad"] : undefined,
      vigC: [L((p.vigC ?? [0.5, 0.5])[0], (q.vigC ?? [0.5, 0.5])[0]), L((p.vigC ?? [0.5, 0.5])[1], (q.vigC ?? [0.5, 0.5])[1])],
    } : p;
    const u = this.uniforms;
    u.get("gradeKy")!.value = r.ky.slice();
    u.get("gradeKm")!.value = monoTangents(r.ky);
    (u.get("gradeSat")!.value as Vector3).set(...r.sat);
    u.get("gradeTintS")!.value = tintRGB(...r.tintS);
    u.get("gradeTintM")!.value = tintRGB(...r.tintM);
    u.get("gradeTintH")!.value = tintRGB(...r.tintH);
    (u.get("gradeVig")!.value as Vector2).set(...r.vig);
    (u.get("gradeVigCol")!.value as Vector3).set(...(r.vigCol ?? VIG0));
    u.get("gradeEV")!.value = r.ev ?? 0;
    (u.get("gradeBand")!.value as Vector4).set(...(r.band ?? BAND0));
    (u.get("gradeBandG")!.value as Vector4).set(...(r.bandG ?? BANDG0));
    u.get("gradeBandV")!.value = r.bandV ?? 1;
    (u.get("gradeGrad")!.value as Vector4).set((r.grad ?? [0, 0.3])[0], (r.grad ?? [0, 0.3])[1], r.bandH ?? 0, 0);
    (u.get("gradeGradCol")!.value as Vector3).set(...(r.gradCol ?? GRADCOL0));
    const fl = r.floor; (u.get("gradeFloor")!.value as Vector4).set(fl ? fl[0] / 255 : 0, fl ? fl[1] / 255 : 0, fl ? fl[2] / 255 : 0, fl ? 1 : 0);
    const vg = r.vgrad ?? VG0;
    (u.get("gradeVTop")!.value as Vector3).copy(tintRGB(vg[0], vg[1])); (u.get("gradeVBot")!.value as Vector3).copy(tintRGB(vg[2], vg[3]));
    (u.get("gradeVRange")!.value as Vector2).set(vg[4], vg[5]);
    (u.get("gradeVigC")!.value as Vector2).set(...(r.vigC ?? [0.5, 0.5]));
  }
  get amount() { return this.uniforms.get("gradeAmount")!.value as number; }
  set amount(v: number) { this.uniforms.get("gradeAmount")!.value = v; }
}

/** Presets per light (plain objects: edit freely). All gentle: the lights (lights.ts) do the heavy lifting; the grade
 *  adds the shared "print": a soft S, coloured darks (ky[0] > 0 + a shadow tint, never #000), a mood tint in the
 *  highlights and a vignette per mood (day ~13 %, golden ~22-26 %, dusk ~32 %, night ~42 % at the corners; round 2).
 *  Tints are (Cb, Cr) zero-luma offsets: +Cb = blue, -Cb = yellow, +Cr = red, -Cr = green. */
// day: a soft S (mids only +.065: the desert floor is already bright), faintly violet darks (bible: shadows never
// neutral); lights.ts carries the warmth, the grade does not add more
// round 5 (audit A4 FILM P3): every preset gets a coloured black floor (day plum-brown ~(32,20,24), night navy, blueprint
// deep blue), so the ink and the deepest shade never crush to ~(10,3,9)
const NOON: GradeParams = {
  ky: [0.03, 0.105, 0.27, 0.565, 0.82, 0.942, 1],
  sat: [1.04, 1.06, 1.05],
  tintS: [0.016, 0.01], tintM: [0, 0], tintH: [-0.006, 0.002],
  vig: [0.13, 0.42], floor: [30, 24, 6],
};
export const GRADES: Record<LightName, GradeParams> = {
  noon: NOON,
  // the dread dip on "vandalized": the lights drop ~20 %; the grade only cools the darks and closes in a little
  // round 4 (audit A3 WORLD-INT P2: "dim" loses ~37 % saturation and reads muddy grey-lavender; "skip the grade's dim
  // desaturation"): the grade no longer desaturates dim at all (noon's saturation), it only lowers the curve, cools the
  // darks a touch toward violet and closes in
  dim: { ...NOON, ky: [0.03, 0.1, 0.262, 0.55, 0.805, 0.935, 1], sat: [1.05, 1.08, 1.03], tintS: [0.026, 0.012], vig: [0.18, 0.4] },
  // late afternoon: warmer highlights, violet-blue darks
  late: { ...NOON, sat: [1.04, 1.06, 1.02], tintS: [0.022, 0.012], tintM: [-0.002, 0.003], tintH: [-0.01, 0.006], vig: [0.17, 0.4] },
  // early morning: the light is already gold (lights.ts), so the grade keeps the highlights neutral and pushes the
  // long shadows violet (gold vs violet, never gold vs cyan), mids a touch lower so the low sun reads as early
  // round 2 (audit A1: morning chroma 22-26, b* +4..+10, no gold): mids / highlights +12 / +8 % saturation and a gold
  // (-Cb, +Cr) tint in mids and highlights; darks stay violet. Simulated on real ungraded frames 700 / 900 / 1000:
  // chroma 23-24 -> 26-27, b* +5..+15 -> +9..+19. Half of the gap only: WORLD-INT warms the morning key itself.
  // round 3 (audit A2: shot 8's wide is a pumpkin floor, chroma 37-42 / b* +27; shots 7 / 9 sit at b* +10..+15): a
  // mild pull on the orange band (HSV 19-47 deg, mids only: the gold highlights and the sky keep their colour) and a
  // GOLDEN vignette (darkens toward amber, not grey: shot 9's "warm vignette"); shot 8 takes a stronger band below
  // round 4 (audit A3: the morning floor is HSV ~31 deg / sat .74, (195,124,50), in all of shots 7-9): the band now
  // works through a luma window (display luma .36-.80 = the sunlit floor; the dark sign wood and the gold rims stay out)
  // and a chroma gate (khaki vests / greys stay out): -14 % on the floor in every morning shot, shot 8 more below
  // round 5 (audit A4 P2 / P3 shots 7 -> 8: shot 7's floor #BA6F34 (C ~51) vs shot 8's #91644F (C ~25), two different times
  // of day on one set; shot 8 milky, L* sd ~17): ONE morning grade for 7, 8 and 9 (the shot 8 / 9 floor trims are gone):
  // the floor band -26 % and turned 3 deg toward red (target floor ~#B06C44 in both), the S-curve ~12 % steeper (mid slope
  // 1.10 -> 1.23), a plum black floor ~#2B1A26 (the milky veil itself was the lens glows: AntiTheft.tsx cuts them)
  morning: { ky: [0.03, 0.078, 0.218, 0.535, 0.83, 0.95, 1], sat: [1.04, 1.14, 1.08], tintS: [0.028, 0.014], tintM: [-0.01, 0.006], tintH: [-0.016, 0.008], vig: [0.26, 0.38],
    band: [26, 18, 0.66, 1], bandG: [0.3, 0.86, 0.18, 0.42], vigCol: [0.34, 0.2, 0.06], floor: [30, 28, 16] },
  // backlit golden sunset: deeper S, violet darks, warm highlights, heavier vignette (corner ~.77 from the grade)
  // round 2: warmer mids / highlights (frames 1560 / 1600: b* +9.5 -> +12, reference golden +12..+26), corner ~.74
  // round 3 (audit A2 ADD: a 10-15 % golden vignette): the same corner strength, but it darkens toward amber-rose
  sunset: { ky: [0.035, 0.092, 0.24, 0.535, 0.8, 0.93, 1], sat: [1.02, 1.08, 1.08], tintS: [0.028, 0.016], tintM: [-0.01, 0.01], tintH: [-0.02, 0.012], vig: [0.28, 0.35],
    vigCol: [0.4, 0.2, 0.1], floor: [30, 22, 10] },
  // blue hour: navy-violet darks, rose highlights
  // round 2: rosier highlights and a stronger dusk vignette (corner / centre ~.68, audit asked ~.70)
  // round 3 (audit A2 ADD: a deeper dusk vignette, ~0.6 corner / centre, to hold the CU on the tag): stronger and
  // toward deep violet (WORLD-INT lifts the dusk exposure +0.3 EV this round, so the centre gets brighter)
  // round 4 (audit A3 WORLD-INT P2: the dusk state is a flat pink-lavender haze; POST: +10 % contrast so the orange
  // shirt and the tag pop): a steeper S (mid slope 1.15 -> 1.27), a little more mid saturation, the highlights less rose
  // round 5 (audit A4 ADD shot 15): a vertical dusk split (the lower third warmer, the top a cooler violet) and the
  // vignette centred a touch high, on the face / tag of the MCU; a navy-violet black floor
  dusk: { ky: [0.03, 0.082, 0.222, 0.53, 0.808, 0.935, 1], sat: [1.04, 1.1, 1.04], tintS: [0.032, 0.008], tintM: [0.004, 0.003], tintH: [-0.012, 0.01], vig: [0.4, 0.3],
    vigCol: [0.12, 0.06, 0.24], floor: [16, 22, 30], vgrad: [0.022, 0.008, -0.02, 0.012, 0.28, 0.72], vigC: [0.5, 0.54] },
  // night interior: lifted NAVY blacks (bible black point ~(9,10,38)), blue shade, warm lamp highlights, strong
  // vignette (~34 % at the corners from the grade; the rest of the bible's night .46 comes from the lamp pool)
  // round 4 (audit A3 P2: lavender and milky, not night-blue: L* 33-40, chroma 33-35, b* -13..-15, a* +19 everywhere;
  // the bible night is chroma 41-78, b* -24..-41; wall planks should read #2A3580 / #1F328E): the violet band (HSV
  // 200-324) turns 20 deg toward blue (Cb/Cr plane) with +75 % saturation and -14 % value in the shadows and mids
  // (first pass +30 % / no value cut: b* -14 -> -21, C 34 -> 39, the planks still lavender-grey) (luma < .6: the warm
  // lantern pool, the moonbeam and the cream notes are outside the band or the window), a navy shadow / mid tint with
  // less red (-Cr), and slightly deeper darks (the black point stays navy, never #000)
  night_int: { ky: [0.042, 0.108, 0.255, 0.535, 0.8, 0.932, 1], sat: [1.1, 1.06, 1.0], tintS: [0.038, -0.014], tintM: [0.014, -0.012], tintH: [-0.016, 0.01], vig: [0.44, 0.3],
    band: [262, 62, 1.75, -20], bandG: [0.0, 0.6, 0.03, 0.1], bandV: 0.86, vigCol: [0.04, 0.05, 0.16], floor: [18, 22, 30] }, // round 2: corner .58 (+ lamp pool -> ~.5); round 4: darkens toward navy; round 5: navy floor
  // warm interior daylight: deeper and richer (bible warm interior L* 36-42, chroma 30-35), plum-brown darks (bible
  // black ~(23,12,20)), creamy highlights, interior vignette (bible .67)
  // round 2 (audit: L* 49 / chroma 23.5 vs warm interior L* 36-42 / chroma 30-35): mids down, +6 % saturation, warmer
  // mids; frames 1450 / 1500 simulate chroma 24 -> 25.5, b* +12 -> +14.5 (WORLD-INT also drops the room -0.2 EV)
  // round 3 (re-measured on preview2: L* 40-49, chroma 25-30, b* +18..+22 vs warm interior L* 36-42 / chroma 30-35):
  // -0.15 EV, +5 % mid saturation, the corner / centre at ~.70 (WORLD-INT's ask) darkening toward plum-brown
  classroom: { ky: [0.035, 0.092, 0.238, 0.52, 0.78, 0.925, 1], sat: [1.06, 1.22, 1.06], tintS: [0.008, 0.02], tintM: [-0.012, 0.007], tintH: [-0.014, 0.006], vig: [0.32, 0.34],
    ev: -0.15, vigCol: [0.22, 0.1, 0.1], floor: [20, 16, 8] },
  // blueprint: flat cool diagram, crisp chalk whites, deep blue darks, light vignette; a little LESS saturated than
  // the render (the blue set is already near the bible's #153A81 / #224974 chroma)
  // round 5 (audit A4 P2 shot 11: ~1 stop brighter and more saturated than the reference blueprints, floor #1858BA vs
  // #153A81 / #1D3C64, no vignette): -0.35 EV, saturation 0.92, a navy vignette (corner / centre ~.72) and a deep-blue
  // black floor; the chalk lines glow (AntiTheft.tsx lineGlow) and the man's orange / the cream sign stay as they are
  // (first pass: -0.35 EV / sat 0.92 on everything + a per-channel floor: the cream sign went cool grey and its brown
  // text purple) -> the exposure and saturation cut act on the BLUE band only (HSV 173-263 deg, chroma-gated: the white
  // lines, the cream face, the orange shirt and the faces are outside it): value x .8, saturation x .9
  blueprint: { ky: [0.03, 0.095, 0.25, 0.535, 0.8, 0.935, 1], sat: [0.96, 0.94, 0.92], tintS: [0.02, -0.004], tintM: [0, 0], tintH: [0, 0], vig: [0.28, 0.32],
    band: [218, 45, 0.9, 0], bandG: [0.0, 0.85, 0.05, 0.15], bandV: 0.8, vigCol: [0.05, 0.1, 0.26], floor: [10, 20, 44] },
};
/** One strength (0..1, the effect's `amount`) per preset; all full: the presets are already gentle. */
export const GRADE_STRENGTH: Record<LightName, number> = {
  noon: 1, dim: 1, late: 1, morning: 1, sunset: 1, dusk: 1, night_int: 1, classroom: 1, blueprint: 1,
};
/** Per-shot trims on top of the light preset (round 2): relative, so an in-shot relight still blends underneath.
 *  ky: added to the curve knots; sat: multiplies (shadows, mids, highlights); tint*: added (Cb, Cr); vig: added.
 *  Shots 1 and 16 stay untrimmed (frame 0 = the last frame). */
export type GradeTrim = { ky?: number[]; sat?: [number, number, number]; tintS?: [number, number]; tintM?: [number, number]; tintH?: [number, number]; vig?: [number, number];
  /** round 3: ev is ADDED; band and vigCol REPLACE the preset's */
  ev?: number; band?: [number, number, number, number]; bandH?: number; vigCol?: [number, number, number];
  grad?: [number, number]; gradCol?: [number, number, number];
  /** round 4: the band's gates (replace the preset's while the trim's band acts) */
  bandG?: [number, number, number, number];
  /** round 5: these REPLACE the preset's (vgrad's tints scale with the trim weight) */
  floor?: [number, number, number]; vgrad?: [number, number, number, number, number, number]; vigC?: [number, number] };
export const SHOT_TRIM: Record<number, GradeTrim> = {
  // the vista (audit A1 P3: flat and hazy, L* sd 13.7, darkest 1 % only RGB 47/45/58, saturated orange floor): deeper
  // S, less yellow mids / highlights, a 16 % vignette. With AtmosEffect's dehaze, frame 160 simulates L* 70 -> 66,
  // sd 14.3 -> 16.3, darkest 1 % (52,31,43) -> (37,16,43), b* +40 -> +36 (the floor colour itself is WORLD-EXT's fix).
  // round 5 (audit A4 P3: the vista wide is a little flat, L* sd 19.0 vs ~21): the S a touch steeper (the 0.25 knot down,
  // the 0.75 knot up), L* stays ~60
  2: { ky: [-0.012, -0.058, -0.105, -0.06, 0.028, 0.012, 0], sat: [1.0, 0.95, 0.952], tintS: [0.006, 0.002], tintM: [0.012, 0], tintH: [0.01, 0], vig: [0.03, -0.02] },
  3: { ky: [-0.008, -0.016, -0.022, -0.018, -0.008, -0.003, 0], sat: [1.0, 0.97, 0.976], tintM: [0.006, 0], tintH: [0.005, 0] },
  // round 3, shot 8 (audit A2 P2: the trails wide is a pumpkin Sahara, chroma 37-42 / b* +27 at 818 / 832, floor
  // median (206,149,83) = HSV 36 deg / sat .60; the park floor is #D7A57A / #C98E62 = 26-27 deg / sat .43-.51): the
  // orange band -18 % saturation and turned 7 deg toward red in the mids; highlights (gold rims, sky) untouched
  // (first pass 0.82 / -7 moved b* only +27 -> +24: now 0.68 / -10, and half strength in the sunlit highlights too,
  // since the floor itself is the bright half of the frame)
  // round 4 (audit A3 P2: the floor is still pumpkin at 776-866, floor C 43-58, HSV sat .66-.83; target floor C ~35):
  // -40 % on the floor band for the WHOLE shot through the luma window (the dark JASPER / LONG LOGS wood, the khaki vests
  // and the violet shadows are outside it); shot 9 opens on the same strength (8 -> 9 match dissolve) and lets it go
  // (first pass 0.6 / -8 deg: floor C 58 -> 40, a* +20 = still pink-orange: now 0.5, turned +3 deg toward yellow, the
  // window up to .88 so the sunlit patch by Sign A comes too; target the park floor #D7A57A / #C98E62, C 29-33)
  // round 5: shots 8 / 9 take the plain morning grade (shots 7 -> 8 -> 9 match on one set and light)
  // round 3, shot 10 (audit A2 P2: the brightest, least saturated shot, L* 71.6 / chroma 21 vs film 51.6 / 30, on the
  // results beat): -0.2 EV, +15 % saturation, a slight warm shift (b* +3 -> ~+5); WORLD-EXT warms the paving too
  // (first pass -0.2 EV / +15 % moved L* 70.5 -> 66.8, chroma 19.9 -> 22.2 only: the pale paving fills the bottom third)
  // -> -0.3 EV, +20 % mids, and a warm ground grad (the lower 38 % darkens up to 16 % toward sand-brown, like a
  // graduated ND: the chalky paving settles, the caption band gets a darker bed, sky / signs / faces are untouched)
  // round 4 (audit A3 P3: still the brightest, most washed shot, L* 63.4 / chroma 28 vs the noon trailhead L* 49-60):
  // another -0.1 EV and +6 % saturation (the horizon haze -15 % is AtmosEffect's dehaze in AntiTheft.tsx SHOT_POST)
  // (first pass -0.4 EV / +6 %: L* 61 -> 59.6, chroma 26 -> 27: the sky and the pale paving dominate) -> -0.5 EV, +10 %
  10: { ev: -0.5, sat: [1.16, 1.32, 1.25], tintM: [-0.008, 0.003], tintH: [-0.004, 0.001], vig: [0.04, -0.02], grad: [0.16, 0.38], gradCol: [0.62, 0.42, 0.24] },
};
/** round 3: a trim can ramp in / out inside its shot (weight 0..1 by frame); shots not listed take their trim fully */
const smooth01 = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
// round 4: keyed to SHOTS only (no frame numbers: a voice re-time moves them). Shot 8 takes its floor pull for the whole
// shot (the floor fills every framing of it); shot 9 opens at full strength (its first frame = shot 8's last) and eases
// back to the plain morning band over its first 40 f, while the camera glides off the wide onto Sign A
export const TRIM_WEIGHT: Record<number, (f: number) => number> = {};
void smooth01; void SHOTS;
const trimmed = (p: GradeParams, t?: GradeTrim, w = 1): GradeParams => {
  if (!t || w <= 0) return p;
  const add2 = (x: [number, number], y?: [number, number]): [number, number] => (y ? [x[0] + w * y[0], x[1] + w * y[1]] : x);
  const pb = p.band && p.band[1] > 0 ? p.band : null;
  const band: GradeParams["band"] = t.band
    ? (pb && w < 1 ? [pb[0] + (t.band[0] - pb[0]) * w, pb[1] + (t.band[1] - pb[1]) * w, pb[2] + (t.band[2] - pb[2]) * w, pb[3] + (t.band[3] - pb[3]) * w]
      : [t.band[0], t.band[1], 1 + (t.band[2] - 1) * w, t.band[3] * w])
    : p.band;
  return {
    ky: t.ky ? p.ky.map((v, i) => Math.min(1, Math.max(0, v + w * (t.ky![i] ?? 0)))) : p.ky,
    sat: t.sat ? [p.sat[0] * (1 + (t.sat[0] - 1) * w), p.sat[1] * (1 + (t.sat[1] - 1) * w), p.sat[2] * (1 + (t.sat[2] - 1) * w)] : p.sat,
    tintS: add2(p.tintS, t.tintS), tintM: add2(p.tintM, t.tintM), tintH: add2(p.tintH, t.tintH), vig: add2(p.vig, t.vig),
    ev: (p.ev ?? 0) + w * (t.ev ?? 0), band, bandH: t.bandH !== undefined ? (p.bandH ?? 0) + (t.bandH - (p.bandH ?? 0)) * w : p.bandH,
    bandG: t.band && t.bandG ? (p.bandG && pb ? [0, 1, 2, 3].map((i) => p.bandG![i] + (t.bandG![i] - p.bandG![i]) * w) as [number, number, number, number] : t.bandG) : p.bandG,
    bandV: p.bandV, vigCol: t.vigCol ?? p.vigCol, grad: t.grad ? [t.grad[0] * w, t.grad[1]] : p.grad, gradCol: t.gradCol ?? p.gradCol,
    floor: t.floor ?? p.floor, vigC: t.vigC ?? p.vigC,
    vgrad: t.vgrad ? [t.vgrad[0] * w, t.vgrad[1] * w, t.vgrad[2] * w, t.vgrad[3] * w, t.vgrad[4], t.vgrad[5]] : p.vgrad,
  };
};
/** Apply light a -> b at k (lightAt's relight blend; a === b or k = 0 for a plain shot) plus the shot's trim. Only
 *  touches the uniforms when the blend changes. */
export function gradeFor(fx: GradeEffect, a: LightName, b: LightName = a, k = 0, shot = 0, f = 0) {
  const tag = fx as unknown as { _light?: string };
  const w = TRIM_WEIGHT[shot] ? TRIM_WEIGHT[shot](f) : 1;
  const key = `${shot}:${w.toFixed(4)}:` + (k <= 0 || a === b ? a : k >= 1 ? b : `${a}>${b}@${k.toFixed(4)}`);
  if (tag._light !== key) {
    const t = SHOT_TRIM[shot];
    if (k <= 0 || a === b) fx.set(trimmed(GRADES[a], t, w)); else if (k >= 1) fx.set(trimmed(GRADES[b], t, w));
    else fx.set(trimmed(GRADES[a], t, w), trimmed(GRADES[b], t, w), k);
    tag._light = key;
  }
  fx.amount = GRADE_STRENGTH[a] + (GRADE_STRENGTH[b] - GRADE_STRENGTH[a]) * Math.max(0, Math.min(1, k));
}

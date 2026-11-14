// Colour grade (owner POST; the antitheft engine, presets re-set for saladoil by POST 2026-11-14 against measured stills):
// the template's GradeEffect (references/grade/GradeEffect.ts) plus ONE preset per light state (plan.ts LightName:
// dawn_gold, noon, late, storm, bank_warm, trading, cutaway, kitchen, pump_night, street_grey, office_sun, office_glow),
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
import { BEAT } from "./story";

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
uniform vec4 gradeMul;      // round 6: linear gain before the curve: rgb on darks / mids, w on highlights (sky, clouds)
uniform vec2 gradeMulR;     // ... the display-luma ramp from the rgb gain to the w gain
uniform vec2 gradeBandC;    // round 6: the band fades out again between these chromas (saturated gems stay out)
uniform vec2 gradeBandT;    // round 6: hue attractor: the turn scales with (hue - x) / y (clamped -1..1): hues AT x stay put
uniform vec4 gradeTop;      // round 7: top vignette: x = strength, y = ramp start (uv.y from the bottom), z = corner weight (0 = even
                            // across the width, 1 = the corners only), w = highlight sparing (0..1)
uniform vec3 gradeTopCol;   // ... what it darkens toward (display RGB multiplier)
uniform vec4 gradeRay;      // round 7: god-ray fan in DISPLAY space: xy = origin (uv), z = strength (0 = off), w = radial e-fold
                            // (frame heights); gradeRayPh = sway phase (rad)
uniform vec3 gradeRayCol;
uniform float gradeRayPh;
uniform vec4 gradeFlash;    // saladoil fix r1: lightning: rgb = colour x strength (display units), w = sky-only weight (0 = whole frame)
uniform vec4 gradeFlashG;   // saladoil fix r2: the lightning's bounce on the wet ground: rgb = colour x strength, w = top of the ground ramp (uv.y)
uniform float gradeBandK;   // saladoil fix r2: how much the 3-way tints are held off the band's pixels (0 = tints act everywhere)
uniform vec4 gradeEdge;     // saladoil fix r2: an additive edge tint (rgb = zero-luma offset x strength), w = start radius
uniform vec4 gradeMote;     // saladoil fix r1: dust motes: x = strength (0 = off), y = time (video f), z = count (<= 32), w = size x
uniform vec4 gradeMoteR;    // ... the region they drift in (uv, y from the bottom): x0, y0, x1, y1
uniform vec3 gradeMoteC;    // ... their colour (display RGB)
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
  // round 6 (audit A5 P2 shot 4 dim): an even linear gain that eases to its own highlight gain (sky / clouds)
  vec3 gm = mix(gradeMul.rgb, vec3(gradeMul.w), smoothstep(gradeMulR.x, gradeMulR.y, dot(src, vec3(0.2126, 0.7152, 0.0722))));
  vec3 c = gradeEncode(inputColor.rgb * gm * exp2(gradeEV));
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
  float wb = 0.0, hb = 0.0;
  if (gradeBand.y > 0.0) {
    float ch; hb = gradeHue(c, ch);
    float hd = abs(mod(hb - gradeBand.x + 180.0, 360.0) - 180.0);
    float wz = gradeBandG.x < 0.0 ? (wM + 0.35 * wS + gradeGrad.z * wH)
      : smoothstep(gradeBandG.x - 0.1, gradeBandG.x + 0.04, y) * (1.0 - smoothstep(gradeBandG.y - 0.04, gradeBandG.y + 0.1, y));
    wb = (1.0 - smoothstep(0.55 * gradeBand.y, gradeBand.y, hd)) * smoothstep(gradeBandG.z, gradeBandG.w, ch) * wz
       * (1.0 - smoothstep(gradeBandC.x, gradeBandC.y, ch));
    s *= mix(1.0, gradeBand.z, wb);
  }
  c = vec3(y) + s * (c - vec3(y));
  if (wb > 0.0 && gradeBand.w != 0.0) {   // turn the band's chroma about the luma axis (Rec.709 Cb / Cr plane)
    float att = gradeBandT.y > 0.0 ? clamp((mod(hb - gradeBandT.x + 180.0, 360.0) - 180.0) / gradeBandT.y, -1.0, 1.0) : 1.0;
    float cb = (c.b - y) / 1.8556, cr = (c.r - y) / 1.5748, t = radians(gradeBand.w) * wb * att, cs = cos(t), sn = sin(t);
    float cb2 = cb * cs - cr * sn, cr2 = cb * sn + cr * cs;
    float R = y + 1.5748 * cr2, B = y + 1.8556 * cb2;
    c = vec3(R, (y - 0.2126 * R - 0.0722 * B) / 0.7152, B);
  }
  if (wb > 0.0) c *= mix(1.0, gradeBandV, wb);
  // saladoil fix r2 (audit A2 P2 shot 8: the trading floor's teal tints turned Tino's grey suit and the white shirts blue-
  // lavender): the band can hold the 3-way tints off its own pixels, so the lavender-grey cards stay neutral while the
  // walls and the floor keep the room's green-teal
  c += (1.0 - gradeBandK * wb) * (wS * gradeTintS + wM * gradeTintM + wH * gradeTintH);
  if (gradeVRange.y > gradeVRange.x) c += mix(gradeVBot, gradeVTop, smoothstep(gradeVRange.x, gradeVRange.y, uv.y));
  vec2 p = (uv - gradeVigC) * 2.0;
  float r = length(p) * 0.70710678;
  c *= mix(vec3(1.0), gradeVigCol, gradeVig.x * smoothstep(gradeVig.y, 1.0, r));
  // saladoil fix r2 (audit A2 ADD shot 10): a light underwater edge: the frame's edges turn a few % cooler (cyan-blue)
  if (gradeEdge.r != 0.0 || gradeEdge.g != 0.0 || gradeEdge.b != 0.0) c += gradeEdge.rgb * smoothstep(gradeEdge.w, 1.0, length((uv - 0.5) * 2.0) * 0.70710678);
  // round 7: the ground grad can spare the highlights (gradeGrad.w 0..1): it then deepens the shade and the mids of the
  // lower frame (a local contrast lift toward its colour, e.g. shot 6's violet late shade) and leaves the lit tops alone
  if (gradeGrad.x > 0.0) c *= mix(vec3(1.0), gradeGradCol, gradeGrad.x * smoothstep(gradeGrad.y, 0.0, uv.y)
    * mix(1.0, 1.0 - smoothstep(0.3, 0.78, dot(c, W)), gradeGrad.w));
  // round 7 (audit A6 P3 shot 13: the top fifth of the final framing is a flat peach glare): a warm TOP vignette, strongest
  // in the top corners, so the glare falls off into the frame's edges
  if (gradeTop.x > 0.0) {
    float kt = gradeTop.x * smoothstep(gradeTop.y, 1.0, uv.y) * mix(1.0, smoothstep(0.08, 0.5, abs(uv.x - 0.5)), gradeTop.z)
      * mix(1.0, 1.0 - smoothstep(0.55, 0.95, dot(c, W)), gradeTop.w);
    c *= mix(vec3(1.0), gradeTopCol, kt);
  }
  // round 7 (audit A6 P3 shot 13: the top fifth of the payoff framing is a flat peach glare): five soft god rays fanning UP
  // from the sunset disc, added AFTER the tone map (a lens-pass glow added to the HDR glare, ~2.5 linear, vanished into
  // the tone curve's shoulder: +1 level), on the bright glare only (luma-gated: the dark LED box, the raven and the ink stay
  // clean) and above the disc only (the rays point 52-140 deg: the sign and the faces lie below it). Wedges (angular
  // gaussians) widen with distance like real shafts; a slow sway on the video clock.
  if (gradeRay.z > 0.0) {
    vec2 dr = (uv - gradeRay.xy) * vec2(0.5625, 1.0);
    float rr = length(dr), an = atan(dr.y, dr.x), sw = 0.012 * sin(gradeRayPh);
    float m = 0.85 * exp(-pow((an - 1.2217 - sw) / 0.05, 2.0)) + exp(-pow((an - 1.6581 + sw) / 0.065, 2.0))
            + 0.8 * exp(-pow((an - 2.1293 - sw) / 0.045, 2.0)) + 0.5 * exp(-pow((an - 0.9076 + sw) / 0.028, 2.0))
            + 0.5 * exp(-pow((an - 2.4435 - sw) / 0.028, 2.0));
    float rad = smoothstep(0.015, 0.07, rr) * exp(-rr / gradeRay.w);
    c += gradeRay.z * m * rad * smoothstep(0.4, 0.66, dot(c, W)) * gradeRayCol;
  }
  // saladoil fix r1 (audit A1 P2 shot 9: thunder with no lightning): a cool-white lightning flash, added in display space so
  // it lands the same on every exposure; brighter on the brighter (wet, sky-facing) surfaces, never a flat white veil.
  // w = 1 is the 1 f sky-only pre-glow (the upper frame lights before the ground)
  if (gradeFlash.r + gradeFlash.g + gradeFlash.b > 0.0) {
    float fy = dot(c, W);
    c += gradeFlash.rgb * (0.45 + 0.55 * smoothstep(0.1, 0.8, fy)) * mix(1.0, smoothstep(0.45, 0.85, uv.y), gradeFlash.w);
  }
  // saladoil fix r2 (audit A2 ADD shot 9): the flash BOUNCES off the wet ground: the lower frame's brighter pixels (the wet
  // reflections, puddles and splashes) glint cool-white, a steep luma weight so the dark asphalt stays dark
  if (gradeFlashG.r + gradeFlashG.g + gradeFlashG.b > 0.0) {
    float fy = dot(c, W);
    c += gradeFlashG.rgb * smoothstep(gradeFlashG.w, 0.02, uv.y) * pow(smoothstep(0.22, 0.72, fy), 1.8);
  }
  // saladoil fix r1 (audit A1 ADD shot 15): dust motes turning in the window light: up to 32 soft specks (~3-7 px @1080 at w 1.4),
  // each drifting ~0.3 px per video frame with a slow wander and a twinkle as it turns; they fade at the region's edges
  // (so the wrap never pops) and over the brightest pixels (a speck is only seen against a darker ground)
  if (gradeMote.x > 0.0) {
    vec2 px = uv * vec2(1080.0, 1920.0), r0 = gradeMoteR.xy * vec2(1080.0, 1920.0), sz = (gradeMoteR.zw - gradeMoteR.xy) * vec2(1080.0, 1920.0);
    float acc = 0.0, t = gradeMote.y;
    for (int i = 0; i < 32; i++) {   // (r1: a FIXED 32-step loop, no uniform-bounded break: ANGLE / D3D dropped the motes on
      float fi = float(i);             //  some frames with the break; the count is a per-mote mask instead)
      float on = step(fi + 0.5, gradeMote.z);
      // (r1: exact low-discrepancy sequences, NOT fract(sin(x) * 43758): that hash came out different whenever the merged
      // effect pass recompiled, so the motes jumped to new places on some frames)
      float h1 = fract(fi * 0.6180340 + 0.13), h2 = fract(fi * 0.7548777 + 0.37);
      float h3 = fract(fi * 0.5698403 + 0.71), h4 = fract(fi * 0.8329436 + 0.53);
      vec2 drift = vec2(0.08 + 0.14 * h3 - 0.11, 0.16 + 0.14 * h1) * t
        + vec2(6.0 * sin(t * (0.021 + 0.012 * h2) + 6.283 * h4), 4.0 * cos(t * (0.017 + 0.01 * h1) + 6.283 * h3));
      vec2 q = mod(vec2(h1, h2) * sz + drift, sz), pos = r0 + q;
      float edge = smoothstep(0.0, 60.0, q.x) * smoothstep(0.0, 60.0, sz.x - q.x) * smoothstep(0.0, 80.0, q.y) * smoothstep(0.0, 80.0, sz.y - q.y);
      float rad = (2.0 + 3.2 * h3 * h3) * gradeMote.w;   // (r1: >= ~2.8 px @1080 so an h264 B-frame never drops a speck)
      vec2 d = px - pos;
      float a = exp(-dot(d, d) / (rad * rad));
      acc += on * a * edge * (0.55 + 0.45 * sin(t * (0.05 + 0.06 * h2) + 6.283 * h1)) * (0.5 + 0.5 * h4);
    }
    c += gradeMote.x * acc * gradeMoteC * (1.0 - 0.5 * smoothstep(0.62, 0.95, dot(c, W)));
  }
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
  /** round 6: linear gain before the curve [r, g, b, highlight gain, ramp lo, ramp hi] (display luma of the input) */
  mul?: [number, number, number, number, number, number];
  /** round 6: the band fades out between these chromas (display units; default off) */
  bandC?: [number, number];
  /** round 6: hue attractor [target hue deg, span deg]: the band's turn x clamp((hue - target) / span), so hues at the
   *  target stay put and hues either side turn toward it (default off) */
  bandT?: [number, number];
  /** round 7: the ground grad spares the highlights by this much (0..1, default 0) */
  gradS?: number;
  /** round 7: top vignette [strength, ramp start (uv.y from the bottom), corner weight 0..1, highlight sparing 0..1] */
  top?: [number, number, number, number]; topCol?: [number, number, number];
  /** saladoil fix r2: how much the 3-way tints are held off the band's own pixels (0..1, default 0) */
  bandK?: number;
  /** saladoil fix r2: an additive edge tint [Cb, Cr, strength, start radius] (e.g. a cool underwater edge) */
  edge?: [number, number, number, number];
};
const MUL0: [number, number, number, number, number, number] = [1, 1, 1, 1, 0.45, 0.8];
const BANDC0: [number, number] = [2, 3];
const BANDT0: [number, number] = [0, 0];
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
/** round 8: the blend of two presets at t (exported so scratch tools can simulate the exact uniforms GradeEffect.set uploads) */
export const blendParams = (p: GradeParams, q?: GradeParams, t = 0): GradeParams => {
  const L = (a: number, b: number) => a + (b - a) * t;
  return q ? {
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
    // round 6: the gain blends from 1 (off); the chroma gate follows the live band's side, like bandG
    mul: (p.mul || q.mul) ? [0, 1, 2, 3, 4, 5].map((i) => i < 4 ? L((p.mul ?? MUL0)[i], (q.mul ?? MUL0)[i]) : ((p.mul ?? q.mul)!)[i]) as GradeParams["mul"] : undefined,
    bandC: [0, 1].map((i) => L(((p.band && p.band[1] > 0 ? p.bandC : q.bandC) ?? BANDC0)[i], ((q.band && q.band[1] > 0 ? q.bandC : p.bandC) ?? BANDC0)[i])) as [number, number],
    bandT: (p.bandT || q.bandT) ? (p.band && p.band[1] > 0 && p.bandT && q.band && q.band[1] > 0 && q.bandT
      ? [L(p.bandT[0], q.bandT[0]), L(p.bandT[1], q.bandT[1])] : (p.bandT ?? q.bandT)) : undefined,
    // round 7: the grad's highlight sparing follows the side that has a grad; the top vignette blends from off
    gradS: (p.grad && p.grad[0] > 0) && (q.grad && q.grad[0] > 0) ? L(p.gradS ?? 0, q.gradS ?? 0) : (q.grad && q.grad[0] > 0 ? q.gradS : p.gradS),
    top: (p.top || q.top) ? [L((p.top ?? [0, 0, 0, 0])[0], (q.top ?? [0, 0, 0, 0])[0]), ...((q.top ?? p.top)!).slice(1)] as GradeParams["top"] : undefined,
    topCol: (p.top || q.top) ? [0, 1, 2].map((i) => L((p.topCol ?? [1, 1, 1])[i], (q.topCol ?? [1, 1, 1])[i])) as [number, number, number] : undefined,
    // fix r2: the tint hold follows the band's strength like bandG; the edge tint blends from off
    bandK: L(p.band && p.band[1] > 0 ? p.bandK ?? 0 : q.bandK ?? 0, q.band && q.band[1] > 0 ? q.bandK ?? 0 : p.bandK ?? 0),
    edge: (p.edge || q.edge) ? [L((p.edge ?? [0, 0, 0, 0])[0], (q.edge ?? [0, 0, 0, 0])[0]), L((p.edge ?? [0, 0, 0, 0])[1], (q.edge ?? [0, 0, 0, 0])[1]),
      L((p.edge ?? [0, 0, 0, 0])[2], (q.edge ?? [0, 0, 0, 0])[2]), (p.edge ?? q.edge)![3]] : undefined,
  } : p;
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
        ["gradeGrad", new Uniform(new Vector4((p.grad ?? [0, 0.3])[0], (p.grad ?? [0, 0.3])[1], p.bandH ?? 0, p.gradS ?? 0))],
        ["gradeGradCol", new Uniform(new Vector3(...(p.gradCol ?? GRADCOL0)))],
        ["gradeFloor", new Uniform(new Vector4())], ["gradeVTop", new Uniform(new Vector3())], ["gradeVBot", new Uniform(new Vector3())],
        ["gradeVRange", new Uniform(new Vector2())], ["gradeVigC", new Uniform(new Vector2(0.5, 0.5))],
        ["gradeMul", new Uniform(new Vector4(1, 1, 1, 1))], ["gradeMulR", new Uniform(new Vector2(0.45, 0.8))], ["gradeBandC", new Uniform(new Vector2(2, 3))], ["gradeBandT", new Uniform(new Vector2(0, 0))],
        ["gradeTop", new Uniform(new Vector4())], ["gradeTopCol", new Uniform(new Vector3(1, 1, 1))],
        ["gradeRay", new Uniform(new Vector4())], ["gradeRayCol", new Uniform(new Vector3(1, 0.85, 0.65))], ["gradeRayPh", new Uniform(0)],
        ["gradeFlash", new Uniform(new Vector4())], ["gradeMote", new Uniform(new Vector4())], ["gradeMoteR", new Uniform(new Vector4(0, 0, 1, 1))],
        ["gradeMoteC", new Uniform(new Vector3(1, 0.9, 0.72))],
        ["gradeFlashG", new Uniform(new Vector4())], ["gradeBandK", new Uniform(0)], ["gradeEdge", new Uniform(new Vector4())],
        ["gradeAmount", new Uniform(amount)],
      ]),
    });
  }
  /** switch preset per shot (day <-> golden) or blend two presets during a crossfade/time-of-day change */
  set(p: GradeParams, q?: GradeParams, t = 0) {
    const r = blendParams(p, q, t);
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
    (u.get("gradeGrad")!.value as Vector4).set((r.grad ?? [0, 0.3])[0], (r.grad ?? [0, 0.3])[1], r.bandH ?? 0, r.gradS ?? 0);
    const tp = r.top ?? [0, 0, 0, 0]; (u.get("gradeTop")!.value as Vector4).set(tp[0], tp[1], tp[2], tp[3]);
    (u.get("gradeTopCol")!.value as Vector3).set(...(r.topCol ?? [1, 1, 1]));
    (u.get("gradeGradCol")!.value as Vector3).set(...(r.gradCol ?? GRADCOL0));
    const fl = r.floor; (u.get("gradeFloor")!.value as Vector4).set(fl ? fl[0] / 255 : 0, fl ? fl[1] / 255 : 0, fl ? fl[2] / 255 : 0, fl ? 1 : 0);
    const vg = r.vgrad ?? VG0;
    (u.get("gradeVTop")!.value as Vector3).copy(tintRGB(vg[0], vg[1])); (u.get("gradeVBot")!.value as Vector3).copy(tintRGB(vg[2], vg[3]));
    (u.get("gradeVRange")!.value as Vector2).set(vg[4], vg[5]);
    (u.get("gradeVigC")!.value as Vector2).set(...(r.vigC ?? [0.5, 0.5]));
    const mu = r.mul ?? MUL0;
    (u.get("gradeMul")!.value as Vector4).set(mu[0], mu[1], mu[2], mu[3]); (u.get("gradeMulR")!.value as Vector2).set(mu[4], mu[5]);
    (u.get("gradeBandC")!.value as Vector2).set(...(r.bandC ?? BANDC0));
    (u.get("gradeBandT")!.value as Vector2).set(...(r.bandT ?? BANDT0));
    u.get("gradeBandK")!.value = r.band && r.band[1] > 0 ? r.bandK ?? 0 : 0;
    const ed = r.edge ?? [0, 0, 0, 0], et = tintRGB(ed[0], ed[1]).multiplyScalar(ed[2]);
    (u.get("gradeEdge")!.value as Vector4).set(et.x, et.y, et.z, ed[3]);
    this.base = { ev: r.ev ?? 0, vig: [r.vig[0], r.vig[1]], vigC: [...(r.vigC ?? [0.5, 0.5])] as [number, number] };
  }
  /** fix r3: the preset values set() last uploaded (the per-frame adjust() works on top of them) */
  private base: { ev: number; vig: [number, number]; vigC: [number, number] } = { ev: 0, vig: [0, 0.4], vigC: [0.5, 0.5] };
  /** saladoil fix r3: per-FRAME adjustments on top of the cached preset (gradeFor only re-uploads when the light / trim key
   *  changes, so SaladOil.tsx calls this on EVERY frame, zeros included): dEv stops added to the exposure; dVig / dR0 added
   *  to the vignette strength / start radius; the vignette centre moved toward c (uv, y up) by cw (0..1). Pure function of
   *  its inputs: the same inputs give bit-identical uniforms (the loop seam) */
  adjust(dEv = 0, dVig = 0, dR0 = 0, c: [number, number] | null = null, cw = 0) {
    const u = this.uniforms, b = this.base;
    u.get("gradeEV")!.value = b.ev + dEv;
    (u.get("gradeVig")!.value as Vector2).set(b.vig[0] + dVig, b.vig[1] + dR0);
    (u.get("gradeVigC")!.value as Vector2).set(c ? b.vigC[0] + (c[0] - b.vigC[0]) * cw : b.vigC[0], c ? b.vigC[1] + (c[1] - b.vigC[1]) * cw : b.vigC[1]);
  }
  /** round 7: this frame's display-space god-ray fan (origin uv, strength 0 = off, radial e-fold in frame heights, sway phase) */
  rays(o: [number, number] | null, k = 0, efold = 0.45, ph = 0) {
    (this.uniforms.get("gradeRay")!.value as Vector4).set(o ? o[0] : 0, o ? o[1] : 0, o ? k : 0, efold);
    this.uniforms.get("gradeRayPh")!.value = ph;
  }
  /** saladoil fix r1: this frame's lightning (display RGB colour, strength = display units added at full weight, sky = 0..1
   *  sky-only weight); strength 0 = off */
  flash(col: [number, number, number], k: number, sky = 0) {
    (this.uniforms.get("gradeFlash")!.value as Vector4).set(col[0] * k, col[1] * k, col[2] * k, sky);
  }
  /** saladoil fix r2: the lightning's bounce on the wet ground (display RGB colour, strength, top of the ground ramp uv.y) */
  flashGround(col: [number, number, number], k: number, top = 0.42) {
    (this.uniforms.get("gradeFlashG")!.value as Vector4).set(col[0] * k, col[1] * k, col[2] * k, top);
  }
  /** saladoil fix r1: dust motes (strength 0 = off; t = the VIDEO frame; region uv [x0, y0, x1, y1], y from the bottom) */
  motes(k: number, t = 0, n = 26, size = 1, region: [number, number, number, number] = [0, 0, 1, 1], col: [number, number, number] = [1, 0.9, 0.72]) {
    (this.uniforms.get("gradeMote")!.value as Vector4).set(k, t, Math.min(32, n), size);
    (this.uniforms.get("gradeMoteR")!.value as Vector4).set(...region);
    (this.uniforms.get("gradeMoteC")!.value as Vector3).set(...col);
  }
  get amount() { return this.uniforms.get("gradeAmount")!.value as number; }
  set amount(v: number) { this.uniforms.get("gradeAmount")!.value = v; }
}

/** Presets per light (plain objects: edit freely). The lights (lights.ts) do the heavy lifting; the grade is the shared
 *  "print" of the film: a soft S per mood, coloured darks (a coloured black floor + a shadow tint, never #000), a mood
 *  tint in the highlights and a vignette per mood (bible 6.1 / 6.6: day corner ~.86, golden ~.75, interior ~.67, night
 *  ~.46). Tints are (Cb, Cr) zero-luma offsets: +Cb = blue, -Cb = yellow, +Cr = red, -Cr = green.
 *  saladoil targets (bible 6.2 per mood; the whole film mean L* ~47, chroma ~29, contrast sd ~21):
 *    dawn_gold  L* 50-60, C* 30-40, b* +15..+30   golden, violet darks, rose-gold vignette
 *    noon       L* 58-66, C* 25-35                 the cream tanks with real contrast, blue-violet darks
 *    late       L* 52-58, C* 30                    amber highlights, violet darks
 *    storm      L* 40-46, C* 24-30, b* ~-20       (fix r1) the reference's saturated storm blue, wet blue-violet darks
 *    bank_warm  L* 38-46, C* 28-35, b* +12..+20    mahogany + brass, plum-brown darks
 *    trading    L* 40-48, C* 20+                   (fix r1) green-teal walls, warm pendant pools, white shirts pop
 *    cutaway    L* 42-48, C* 40-50                 the clean diagram: navy + clear blue + the gold band
 *    kitchen    L* 55-62, C* 35-42                 the pivot's sunny new world (the brightest interior)
 *    pump_night L* 32-40, C* 40-55, b* -25..-40    royal-blue shade + warm lamp pools (not a blue wash)
 *    street_grey L* 42-50, C* 20+                  (fix r1) overcast slate-blue, warm windows / faces, red on the story boards
 *    office_sun L* 48-54, C* 26-32 -> office_glow L* 54-60 (warmer, the "Warren Buffett" swell) */
// FIX ROUND 1 (audit A1, measured on the MERGED preview1 frames, simulated in numpy on the ungraded merged render and
// checked against preview1 to +-0.3 L*): noon +12 % mid contrast, +10 % saturation, -0.1 stop (A1: L* 67-73 / C* 20-25
// against the plan's 58-66 / 25-35; faces stay at luma .92-.96); the bank a little less orange (shots 3 / 5 measured
// C* 37-43, b* +25-30 against the reference's warm interior 30-35 / +17-21)
const NOON: GradeParams = {
  ky: [0.024, 0.078, 0.212, 0.5, 0.805, 0.945, 0.995],
  sat: [1.14, 1.25, 1.1],
  tintS: [0.02, 0.008], tintM: [0.0, 0.0], tintH: [-0.008, 0.003],
  vig: [0.15, 0.42], floor: [24, 20, 42], ev: -0.1,
};
/** the warm wood room (bank): plum-brown darks, warm highlights */
const ROOM_G: GradeParams = { ky: [0.035, 0.1, 0.255, 0.54, 0.8, 0.935, 1], sat: [1.0, 1.06, 1.02], tintS: [0.016, 0.016], tintM: [-0.002, 0.004], tintH: [-0.01, 0.004],
  vig: [0.24, 0.4], ev: 0.24, vigCol: [0.36, 0.2, 0.16], floor: [32, 18, 24] };
/** the investor's office (fix r1: its own preset, no longer tied to the bank): honey wood, cream walls (A1 C* 39, b* +31)
 *  FIX ROUND 2 (audit A2 P3 FILM: the office ran hot, b* +31-32 against the warm-interior reference +17-21 / max +24;
 *  WORLD-INT P2 shot 15: one orange note, no violet in the shade): an orange BAND (hue 28 +-18, x0.8) calms the honey wood
 *  and the cream walls, the yellow BUY slip (hue ~50) and the cafe's colours lie outside it and keep their colour; plum
 *  shadows (+Cb +Cr) and neutral-cool mids; the vignette leans toward the window (light from behind him). Simulated on the
 *  merged 2458 / 2573: b* +31 -> +24, C* 38 -> 32, L* 55 -> 54 */
// FIX ROUND 3 (audit A3 shot 15, lighting 6.5 / colour 7: "one orange note"): the shade turns from plum to a cooler
// blue-violet (tintS +Cr .022 -> .006, +Cb .032 -> .05) and the highlights a touch more honey, so the warm window light and
// the cool shade pull apart (complementary, like the reference's warm interiors) instead of one orange wash
const OFFICE_G: GradeParams = { ky: [0.035, 0.1, 0.255, 0.54, 0.8, 0.935, 1], sat: [0.98, 1.0, 0.98], tintS: [0.05, 0.006], tintM: [0.008, 0.004], tintH: [-0.016, 0.004],
  vig: [0.22, 0.42], ev: 0.04, vigCol: [0.34, 0.2, 0.2], floor: [32, 18, 30], band: [28, 18, 0.8, 0], vigC: [0.5, 0.56] };
const GOLD_G: GradeParams = { ky: [0.03, 0.08, 0.222, 0.53, 0.825, 0.945, 0.975], sat: [1.04, 1.16, 1.08], tintS: [0.032, 0.012], tintM: [-0.026, 0.008], tintH: [-0.022, 0.01],
  vig: [0.24, 0.36], vigCol: [0.42, 0.22, 0.2], floor: [34, 20, 38],
  // a rose-plum TOP vignette (the dawn glare over the harbour fell off flat; corners first, the gold highlights spared)
  top: [0.2, 0.6, 0.45, 0.45], topCol: [0.66, 0.44, 0.58] };
export const GRADES: Record<LightName, GradeParams> = {
  // golden dawn on the tank top (hook + loop): gold mids / highlights, violet darks, a warm rose vignette
  dawn_gold: GOLD_G,
  noon: NOON,
  // the mystery's late sun: warmer highlights, violet darks, a closer warm vignette (the mood turning)
  // fix r1 (audit A1 P2 shot 7: the late relight turned the roof burnt orange and the gold oil sank into it): an orange
  // BAND calms the mid-light, mid-chroma oranges (the roof, the rim) to x0.72 while the rich oil gold (display chroma > .8)
  // is left alone, so the oil stays the one saturated gold in frame. Simulated on the merged 1225: C* 51 -> 45, b* +40 -> +34
  // fix r2 (audit A2 P2 shot 7, WORLD-INT: "a uniform beige-sepia wash", the turn of the light unseen): the warm highlight
  // tint is halved (the sepia on the cream roof) and the mids lean violet; the light TURNS by a vertical split that fades
  // in with the relight: the far roof (top of frame) peach, the near roof and the shade (bottom) violet. Simulated on the
  // merged 1231: b* +16 -> +14, the rose top / violet bottom visible, the oil disc untouched (it is centred)
  // FIX ROUND 3 (audit A3 shot 7, lighting / colour 6.5: "a saturated blue-violet LATTICE of rail shadows (#5B366C-#674383)
  // over ~45 % of the roof, purple crayon scribble or a cage; the lit roof stays muddy khaki, the frame slides to a mauve
  // 131/86/90"): measured on the ungraded preview3 render, the lattice is display hue ~262, chroma .21, luma .25 and my
  // A2 grade pushed it to chroma .29 (the violet shadow / mid tints + the violet bottom split) while the orange band
  // (x0.72) took the honey out of the lit roof. Now: the orange band is gone; a VIOLET band (hue 272 +-40, shadows / mids,
  // chroma .05-.5) halves the lattice's saturation and lifts it x1.3, holding the shadow tints off it (bandK .85), so the
  // rail shadows read as soft slate-plum evening shade, not crayon; the mids are neutral, the highlights honey, the bottom
  // split nearly neutral (the top keeps its peach), a warm amber-brown vignette (SaladOil.tsx centres it on the hatch as the
  // light turns: the reflected face is framed). Simulated on the ungraded 1240 (checked against preview3 to +-0.5 L*):
  // lattice #4A2972 -> #4F3C61, the lit roof #B28E71 -> #BA8E59, frame 130/85/89 (L* 41, a* +21, b* +5, mauve) ->
  // 137/91/70 (L* 43, a* +17, b* +18); WORLD-INT's warmer, lighter 'late' key lands it nearer their 150/110/95 target.
  late: { ...NOON, sat: [1.06, 1.1, 1.06], tintS: [0.022, 0.01], tintM: [-0.004, 0.004], tintH: [-0.014, 0.006], vig: [0.3, 0.3], vigCol: [0.36, 0.2, 0.16],
    floor: [30, 20, 40], band: [272, 40, 0.5, 0], bandG: [0.06, 0.7, 0.05, 0.14], bandC: [0.5, 0.7], bandV: 1.3, bandK: 0.85,
    vgrad: [-0.016, 0.01, 0.006, 0.002, 0.18, 0.82], ev: -0.04 },
  // the rain (fix r1, audit A1 P2: the storm read flat grey, C* 12.6, and the old preset desaturated it further): the
  // reference's SATURATED storm blue: blue-violet darks (floor #10142C), cool-white rain highlights, a deep blue vignette.
  // Simulated on the merged 1445 / 1500: L* 51 -> 46, C* 13 -> 24, b* -11 -> -21
  // FIX ROUND 3 (re-measured on preview3: since WORLD-EXT's darker wet albedo the storm sits at L* 32-33, below the
  // plan's 40-46, with the 'Lenders finally checked the tanks' stair climber blue-on-blue in the dark): +0.16 stop and a
  // slightly lifted low-mid (knots .085 / .222 / .48 -> .097 / .238 / .49), the hue and the saturated storm blue unchanged.
  // Simulated on the ungraded 1425 / 1450 / 1500 / 1520: L* 31.6-33.1 -> 34.2-35.7, b* -29..-31 kept, the climber and the
  // lenders' coats one step lighter against the tank wall (CAM's tilt-up takes the dark road out of the frame)
  storm: { ky: [0.03, 0.097, 0.238, 0.49, 0.755, 0.905, 0.975], sat: [1.26, 1.42, 1.12], tintS: [0.062, -0.03], tintM: [0.046, -0.026], tintH: [0.016, -0.008],
    vig: [0.3, 0.4], vigCol: [0.1, 0.12, 0.3], floor: [16, 20, 44], ev: 0.1 },
  bank_warm: ROOM_G,
  // the trading floor (fix r1, audit A1 P2: neutral grey, C* 12): deep green-teal walls and darks, the white shirts and the
  // globe pendants warm (#FFD2A0 side), a teal vignette ~0.75 corner / centre. Simulated on the merged 1330: C* 12 -> 17
  // (WORLD-INT's green-grey walls + warm globes carry it past 20)
  // fix r2 (audit A2 P2 shot 8, WORLD-INT: "a flat teal-grey haze; the white shirts render lavender-grey and Tino's grey
  // suit reads blue-lavender"): saturation +8 % (+17 % on the walls: the band takes the cards back down), the lifted blacks down ~6 % (floor #0C1616, the toe lower), and a BAND on
  // the lavender-blue greys (hue 240 +-50, chroma < 0.26: the card shading of the suits, shirts and faces) that both
  // desaturates them (x0.2) and holds the teal tints off them (bandK 0.95), so Tino's suit samples neutral grey (merged
  // 1336: b* -18 / -28 -> -5 / -8, shirts -11 -> -2) while the walls, the floor and the board keep the room's green-teal
  // (the navy jackets and the red / green ties, chroma > 0.26, stay out of the band). Simulated: L* 40 -> 39, p5 9.9 -> 8.5
  // FIX ROUND 3 (audit A3 shot 8, lighting / colour 6.5: "a murky teal monochrome, mean RGB 74/99/84; the pendants cast no
  // pools; Tino's shadow side goes navy"): the teal now lives in the SHADOWS only (complementary split: teal shade, warm
  // cream light): the mid tint's green halved (-.052 -> -.03), the highlights warmer (the white shirts, the globe pendants
  // and the lamp pools WORLD-INT adds read cream-amber), mid saturation 1.9 -> 1.62, +0.04 stop, the floor grad eased
  // (.32 -> .22) so the new lamp pools on the tiles survive, and the lavender-grey band now covers the whole luma range
  // (bandG luma window 0..1: the shadow side of Tino's grey suit is held neutral too, not only his mids). Simulated on the
  // ungraded 1336 / 1392: RGB 70/95/82 -> 77/95/80, a* -9.8 -> -8.2 (less green), b* +5 -> +7, L* 38 (WORLD-INT's +0.3 EV
  // ambient carries the rest toward their luma 110-115 target)
  trading: { ky: [0.025, 0.094, 0.26, 0.55, 0.8, 0.93, 0.99], sat: [1.5, 1.62, 1.24], tintS: [0.026, -0.05], tintM: [0.004, -0.03], tintH: [-0.05, 0.024],
    vig: [0.26, 0.4], ev: 0.34, vigCol: [0.1, 0.2, 0.18], floor: [12, 22, 22],
    band: [240, 50, 0.2, 0], bandG: [0.0, 1.0, 0.0, 0.02], bandC: [0.16, 0.26], bandK: 0.95, bandH: 1.0,
    // + a deep-teal GROUND grad: the empty tile floor (A2: "the lower ~30 % is empty teal tile") falls into shade
    grad: [0.22, 0.34], gradCol: [0.55, 0.66, 0.66], gradS: 0.4 },
  // the cutaway diagram: deep navy darks, crisp highlights, the gold band keeps its colour
  // + a GOLD band: the oil (pale lemon in the flat diagram light) is pushed back to the film's rich hero gold, so the hatch
  // view "looks full" with the same gold as frame 0 (mid-light yellows only; the blue water and the red cut edges stay)
  cutaway: { ky: [0.03, 0.095, 0.25, 0.535, 0.8, 0.935, 1], sat: [1.0, 1.04, 1.02], tintS: [0.02, -0.004], tintM: [0, 0], tintH: [0, 0], vig: [0.24, 0.34],
    vigCol: [0.05, 0.1, 0.26], floor: [10, 20, 44], band: [47, 24, 1.55, -5], bandG: [0.42, 1.05, 0.08, 0.2], bandV: 0.93,
    bandC: [0.55, 0.8] },   // (already-rich golds, chroma > .8, are left alone)
  // the pivot kitchen (fix r1: the merged kitchen measured L* 75, C* 24, p5 L* 44 = milky, against the plan's L* 55-62,
  // C* 35-42): -0.36 stop, richer mids, a firmer S and a warm vignette. Simulated on the merged 1815: L* 75 -> 66, C* 24 -> 30
  // fix r2 (audit A2 P3 FILM: the kitchen ran hot, b* +37 / C* 48, "yellows go orange and the bottle's gold has less to
  // stand out against"): a red-orange BAND (hue 14 +-22, x0.6, turned 6 deg toward red: the orange check cloth reads
  // red-cream, the orange bowl and the peach walls calm down) that stops short of the oil's gold (hue ~36: kept, its display
  // chroma .61 -> .57 while everything round it drops), plum shadows, -0.08 stop more, and the vignette's centre toward the
  // sunny window (upper right), so the light has a side. Simulated on the merged 1706 / 1793 / 1828: b* +36 -> +25..+26,
  // C* 46-48 -> 36-38, L* 62-65 -> 59-62
  // FIX ROUND 3 (audit A3 shot 11, lighting 6.5: "flat and even, no golden window key"; p5 L* 31 = milky darks): a firmer
  // toe (knots .088 / .23 -> .074 / .212: the darks drop ~3 L*, the highlights stay) and the vignette pulled harder toward
  // the sunny window (centre .58 -> .66 up-right, start .42 -> .3, .26 -> .32), so the light falls off away from the window
  // and the frame has a lit side and a shade side; +0.04 stop back so the mids keep L* ~56. Simulated on the ungraded 1694 /
  // 1828: p5 L* 31 / 34 -> 28 / 30, the window side unchanged, the lower-left table edge -5 L*
  kitchen: { ky: [0.026, 0.074, 0.212, 0.505, 0.785, 0.93, 0.995], sat: [1.14, 1.3, 1.06], tintS: [0.024, 0.012], tintM: [0.006, 0.002], tintH: [-0.004, 0.002],
    vig: [0.32, 0.3], ev: -0.4, vigCol: [0.42, 0.22, 0.2], floor: [34, 18, 28], band: [14, 22, 0.6, -6], vigC: [0.66, 0.66],
    // + a warm-plum ground grad: the blurred gingham drape at the bottom (LEAD P3: "carries no story") falls into the
    // table's own shade (-2.3 L* on the bottom third, lit pixels spared), so the eye stays on the bottle
    grad: [0.28, 0.32], gradCol: [0.66, 0.5, 0.52], gradS: 0.3 },
  // the pump room at NIGHT (fix r1, audit A1 P2: milky and pastel, L* 55, b* +2, no night vignette): the old blue-desaturating
  // band and the +0.3 stop lift are gone; navy darks (floor #1A1D40), the lavender-pink shade turned toward royal blue
  // (+Cb, -Cr), amber lamp highlights, a firmer S (+12 % mid contrast) and a deep night vignette (~0.58 corner / centre).
  // Exposure itself stays with WORLD-INT's lights (they drop the ambient): simulated on the merged 2060 / 2250:
  // L* 45 / 54 -> 40 / 48, b* -9 / +1 -> -22 / -11
  pump_night: { ky: [0.03, 0.09, 0.225, 0.52, 0.81, 0.94, 1], sat: [1.1, 1.14, 1.06], tintS: [0.07, -0.05], tintM: [0.045, -0.034], tintH: [-0.03, 0.012],
    vig: [0.44, 0.28], vigCol: [0.08, 0.09, 0.26], floor: [26, 29, 64],
    // fix r2 (audit A2 shot 13: "the bottom 28-35 % is an empty, flat, electric-blue floor, C* 60-65"): a ground grad that
    // darkens the floor and drops its BLUE fastest (x0.46 vs 0.7 red), so the electric blue settles to a deep navy; lit
    // pixels (lamp pools, the workers' lit sides) are spared
    grad: [0.45, 0.34], gradCol: [0.7, 0.66, 0.46], gradS: 0.5 },
  // the fallout street (fix r1, audit A1 P2: grey, C* 13): slate-blue darks and warm highlights (the shop windows, the
  // faces) so the green newsstand and the red boards sit in colour, not in grey. Simulated on the merged 2370: C* 15 -> 20
  street_grey: { ky: [0.03, 0.1, 0.262, 0.55, 0.8, 0.93, 0.985], sat: [1.2, 1.35, 1.1], tintS: [0.04, -0.03], tintM: [0.016, -0.014], tintH: [-0.032, 0.012],
    vig: [0.24, 0.4], ev: 0.22, vigCol: [0.12, 0.14, 0.26], floor: [18, 20, 40],
    // fix r2 (audit A2 shot 14: "the bottom 30 % is blank sidewalk slabs ... a milky sidewalk"): a slate ground grad
    grad: [0.34, 0.34], gradCol: [0.66, 0.68, 0.78], gradS: 0.25 },
  office_sun: OFFICE_G,
  // "Warren Buffett": the room warms and brightens with the music swell (fix r1: A1 measured only +7 % luma; now ~+0.2 stop,
  // a warmer cream highlight and a softer, warmer vignette)
  // fix r2 (WORLD-INT P1 shot 15, audit A2: the swell turned into a milky wash, L* 56.5 -> 68.8, p5 21 -> 26): ev 0.26 ->
  // 0.1 (WORLD-INT asked 0.12; 0.1 with its lights.ts office_glow cut lands ~L* 59-60), the warmth as colour, not haze:
  // warmer cream highlights over the same plum shade; the orange band a little lighter (x0.86) so the room still WARMS.
  // Simulated on the merged 2633 (before WORLD-INT's light cut): L* 67.7 -> 64.6, b* +36 -> +29, p5 22.8 -> 21
  // FIX ROUND 3 (audit A3 P3 shot 15: "the glow still lifts the blacks at the end of the push, p5 L* 18.1 -> 20.8, mean
  // 54.4 -> 58.6 at 2636; the window starts to go milky"; target at 2636 L* <= 57, p5 <= 19, C* >= 35): ev .1 -> -.04, the
  // black floor a little lower (#201A1E -> #1B0F19) and the orange band x.86 -> x.92 (the colour stays as the light drops).
  // Simulated on the ungraded 2636: L* 58.4 -> 56.2, p5 21.0 -> 19.1, C* 36.1 -> 35.9, the window p95 95.3 -> 92.7; with
  // the shot-15 ground grad (SHOT_TRIM[15]) and mid sat 1.06 -> 1.1, rendered: L* 55.4, p5 17.3, C* 35.8
  office_glow: { ...OFFICE_G, ev: -0.04, sat: [1.0, 1.1, 1.03], tintM: [-0.004, 0.008], tintH: [-0.03, 0.01], vig: [0.18, 0.46], vigCol: [0.44, 0.26, 0.18],
    band: [28, 18, 0.92, 0], floor: [27, 15, 25] },
};
/** One strength (0..1, the effect's `amount`) per preset; all full. */
export const GRADE_STRENGTH: Record<LightName, number> = {
  dawn_gold: 1, noon: 1, late: 1, storm: 1, bank_warm: 1, trading: 1, cutaway: 1, kitchen: 1, pump_night: 1, street_grey: 1, office_sun: 1, office_glow: 1,
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
  floor?: [number, number, number]; vgrad?: [number, number, number, number, number, number]; vigC?: [number, number];
  /** round 7: these REPLACE the preset's (top's strength and the grad's sparing scale with the trim weight) */
  gradS?: number; top?: [number, number, number, number]; topCol?: [number, number, number];
  /** saladoil fix r2: the edge tint REPLACES the preset's (its strength scales with the trim weight) */
  edge?: [number, number, number, number] };
/** per-shot trims (shots 1 and LAST stay untrimmed: frame 0 = the last frame) */
export const SHOT_TRIM: Record<number, GradeTrim> = {
  // shot 6, the easel chart (fix r1, audit A1 P2: b* +26, C* 37, contrast sd 31: the white board jumped off dark orange
  // wood): cooler (b* -6..-8), chroma x ~0.85, the darks lifted ~5 L* toward plum #2B1A26 and the paper rolled off below
  // clip. Simulated on the merged 1150: L* 48 -> 49, sd 31 -> 28, C* 37 -> 28, b* +26 -> +18 (the board itself sits at
  // L* ~95, so the content keeps sd ~27)
  // fix r2 (audit A2 shot 6 "dead bands: a flat mauve ceiling (top ~200 px) and ~35 % empty green carpet"): a plum
  // GROUND grad on the carpet (highlights spared) and a plum TOP vignette on the ceiling, so both bands fall into shade and
  // the chart + Tino sit in the lit middle
  6: { ky: [0.05, 0.05, 0.035, 0.005, -0.02, -0.035, -0.05], sat: [0.94, 0.925, 0.9], tintS: [0.006, -0.004], tintM: [0.008, -0.002], tintH: [0.01, -0.004],
    floor: [43, 26, 38], grad: [0.38, 0.36], gradCol: [0.62, 0.5, 0.55], gradS: 0.35, top: [0.22, 0.86, 0.2, 0.4], topCol: [0.6, 0.48, 0.55] },
  // fix r2 (WORLD-INT P2 shots 3 / 5: the flat, empty bottom third, a plain desk front): the same plum ground grad, so the
  // desk front reads as foreground in shade under the lit desk top (the boards / plaques sit above the ramp)
  3: { grad: [0.3, 0.36], gradCol: [0.62, 0.5, 0.55], gradS: 0.35 },
  // shot 5, the cash stacks (fix r1: the most orange bank frame, A1 C* 43, b* +30): a light trim, mids x0.94 and a touch
  // cooler (WORLD-INT's lamp pool and cool window light do the rest)
  5: { sat: [0.96, 0.94, 0.96], tintM: [0.006, -0.002], tintS: [0.004, 0], grad: [0.28, 0.34], gradCol: [0.62, 0.5, 0.55], gradS: 0.35 },
  // fix r2 (audit A2 FILM: noon shot 4 is bright, L* 68.5; WORLD-INT: "the cream wall + gravel wash out" under a warm haze):
  // -0.18 stop, the cream highlights rolled a little lower, the warm haze cooled (+Cb in the mids / highlights, bluer
  // shade). Simulated on the merged 700 / 760 / 860: L* 69.6 / 65.5 / 68.7 -> 64.6 / 60.8 / 63.5, b* +16 / +12 / +22 ->
  // +14 / +9 / +19 (WORLD-INT's noon exposure -5 % lands it ~1-2 L* lower still, inside 58-64)
  4: { ev: -0.18, ky: [0, 0, 0, 0, -0.012, -0.008, 0], tintM: [0.008, 0], tintH: [0.006, 0], tintS: [0.008, 0.002] },
  // fix r2 (WORLD-INT P3: shot 2's noon farm "a little grey", C* 23.6): +10 % mid saturation. Merged 300 / 440: C* 23.6 /
  // 25.6 -> 25.1 / 27.4 (WORLD-INT's deeper noon sky adds the rest)
  2: { sat: [1.05, 1.1, 1.05] },
  // fix r2 (audit A2 ADD shot 10): a light underwater edge, the frame's edges ~6-8 % cooler (cyan-blue); the blueprint paper
  // grain on the navy grid is SaladOil.tsx SHOT_POST (world-anchored, never on the fish)
  10: { edge: [0.04, -0.014, 1, 0.3] },
  // fix r2 (audit A2 P2 shot 12: the hatch hold "reads washed and high-key", L* 68): from the crane up to the hatch the cream
  // roof drops -0.1 stop with a slightly firmer top and +10 % saturation, so the gold disc stands out (the cross-section
  // half of the shot is untouched: TRIM_WEIGHT ramps it in over the crane). Merged 2003: L* 68.4 -> 66.3
  12: { ev: -0.1, ky: [0, 0, 0, 0, -0.01, -0.012, -0.01], sat: [1.05, 1.1, 1.06] },
  // fix r3 (shot 7): the late preset's VIOLET band (see GRADES.late) on BOTH sides of the noon -> late relight, at the trim
  // weight below: the world's rail shadows turn violet early in the 70 f relight (1198-1212 measured purple while the
  // preset blend was only half way), so the band runs ahead of the light and the lattice never reads as crayon
  7: { band: [272, 40, 0.5, 0], bandG: [0.06, 0.7, 0.05, 0.14] },
  // fix r3 (audit A3 shot 15, lighting 6.5 "flat: no light shapes from the sunny window"; WORLD-INT P2 "the bottom third of
  // the MS is a bare desk front"): the light now falls off from the window toward the lens: a cool-plum GROUND grad on the
  // desk front and the rug (lit pixels spared, so WORLD-INT's window patches on the rug stay bright), the same treatment
  // as the bank's desk front (shots 3 / 5). Simulated on the ungraded 2458 / 2575 / 2636: the bottom third -2.1..-2.6 L*,
  // p5 18.0 / 16.3 / 19.1 -> 16.9 / 15.4 / 17.3, the face, the headline and the BUY slip (all above the ramp) untouched
  15: { grad: [0.34, 0.36], gradCol: [0.6, 0.52, 0.64], gradS: 0.35 },
};
/** round 3: a trim can ramp in / out inside its shot (weight 0..1 by frame); shots not listed take their trim fully */
const smooth01 = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
// keyed to SHOTS / BEAT names only (no frame numbers: a voice re-time moves them)
export const TRIM_WEIGHT: Record<number, (f: number) => number> = {
  // shot 12's hatch-hold trim eases in across the crane up to the hatch (no step; the cross-section half keeps its look)
  12: (f) => smooth01((f - BEAT.oilIn) / 60),
  // shot 7: the violet band is fully on ~26 f into the relight ('someone' - 20 = the relight's start)
  7: (f) => smooth01((f - (BEAT.someone - 20)) / 26),
};
/** a second trim layer with its own weight (by picture frame f) */
export const SHOT_TRIM_B: Record<number, { t: GradeTrim; w: (f: number) => number }> = {};
void smooth01;
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
    floor: t.floor ?? p.floor, vigC: t.vigC ?? p.vigC, mul: p.mul, bandC: p.bandC, bandT: p.bandT,
    gradS: t.gradS ?? p.gradS, top: t.top ? [t.top[0] * w, t.top[1], t.top[2], t.top[3]] : p.top, topCol: t.topCol ?? p.topCol,
    vgrad: t.vgrad ? [t.vgrad[0] * w, t.vgrad[1] * w, t.vgrad[2] * w, t.vgrad[3] * w, t.vgrad[4], t.vgrad[5]] : p.vgrad,
    bandK: p.bandK, edge: t.edge ? [t.edge[0], t.edge[1], t.edge[2] * w, t.edge[3]] : p.edge,
  };
};
/** Apply light a -> b at k (lightAt's relight blend; a === b or k = 0 for a plain shot) plus the shot's trim. Only
 *  touches the uniforms when the blend changes. */
/** round 8: one preset (+ its shot trims) as gradeFor applies it: the shot's own trim at TRIM_WEIGHT, then the second
 *  trim layer (SHOT_TRIM_B, e.g. shot 6's mystery dip) at its own weight */
const withTrims = (p: GradeParams, shot: number, f: number) => {
  const w = TRIM_WEIGHT[shot] ? TRIM_WEIGHT[shot](f) : 1, B = SHOT_TRIM_B[shot];
  const q = trimmed(p, SHOT_TRIM[shot], w);
  return B ? trimmed(q, B.t, B.w(f)) : q;
};
/** round 8: the exact parameters gradeFor uploads for light a -> b at k, shot, picture frame f (exported for scratch
 *  simulation tools; gradeFor itself goes through it) */
export const paramsFor = (a: LightName, b: LightName = a, k = 0, shot = 0, f = 0): GradeParams =>
  k <= 0 || a === b ? withTrims(GRADES[a], shot, f) : k >= 1 ? withTrims(GRADES[b], shot, f) : blendParams(withTrims(GRADES[a], shot, f), withTrims(GRADES[b], shot, f), k);
export function gradeFor(fx: GradeEffect, a: LightName, b: LightName = a, k = 0, shot = 0, f = 0) {
  const tag = fx as unknown as { _light?: string };
  const w = TRIM_WEIGHT[shot] ? TRIM_WEIGHT[shot](f) : 1, wb = SHOT_TRIM_B[shot] ? SHOT_TRIM_B[shot].w(f) : 0;
  const key = `${shot}:${w.toFixed(4)}:${wb.toFixed(4)}:` + (k <= 0 || a === b ? a : k >= 1 ? b : `${a}>${b}@${k.toFixed(4)}`);
  if (tag._light !== key) {
    const r = paramsFor(a, b, k, shot, f);
    fx.set(r);
    tag._light = key;
  }
  fx.amount = GRADE_STRENGTH[a] + (GRADE_STRENGTH[b] - GRADE_STRENGTH[a]) * Math.max(0, Math.min(1, k));
}

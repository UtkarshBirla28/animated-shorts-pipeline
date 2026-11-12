// Thin-lens depth of field for the reference's soft backgrounds (reports/depth.md 6.1), as two deterministic gather
// passes. CoC radius (px at 1080x1920) = cInf * |1 - focus / depth|, x nearScale in front of the focus plane,
// clamped to maxCoC. Every pixel size is multiplied in the shader by (output height / 1920), so the picture is the
// same at 540, 1080 and 1440 widths.
//   pre  : 16-tap gather over 0.29 x the CoC. It fills the gaps between the main taps, so the composite kernel is a
//          smooth disc (1024 effective taps) instead of 64 visible copies of every edge.
//   main : 64-tap Vogel disc over 0.96 x the CoC (pre + main together = a disc of sigma CoC/2), plus a 32-tap near
//          field gather that lets a blurred foreground spread over sharper pixels behind it.
// Occlusion rules (no halos, no dark rims): a sample counts only if its own CoC reaches this pixel, a farther sample
// may never spread wider than this pixel's own CoC (sharp subjects keep clean silhouettes), and the result is
// renormalised by the accepted weights. Fixed sample pattern, no per-pixel noise: no grain, no frame-to-frame flicker.
// Both passes are CONVOLUTION effects, so R3F's <EffectComposer> gives each its own EffectPass.
import { Effect, EffectAttribute, BlendFunction } from "postprocessing";
import type { BloomEffect } from "postprocessing";
import { Uniform, Matrix4, Vector2, Vector3, Vector4, Texture } from "three";

const frag = /* glsl */ `
uniform float focus;      // focus distance along the view axis (m)
uniform float cInf;       // blur-disc radius (px at 1080x1920) of things at infinity; 0 = off
uniform float nearScale;  // extra blur for things in front of the focus plane
uniform float maxCoC;     // px at 1080x1920
#define GOLDEN 2.39996323

float cocAt(float d, float s) {               // signed CoC radius in output px
  float c = cInf * s * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC * s, maxCoC * s);
}
float distAt(vec2 uv) { return -getViewZ(readDepth(uv)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (cInf < 0.25) { outputColor = inputColor; return; }
  float s = resolution.y / 1920.0;             // output px per 1080x1920 px
  float d0 = -getViewZ(depth);
  float r0 = abs(cocAt(d0, s));
  float R = r0 * SPREAD;
  vec3 acc = inputColor.rgb; float wsum = 1.0;
  if (R > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * R;
      float a = float(i) * GOLDEN + ROT;
      vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
      float ds = distAt(suv);
      float rs = abs(cocAt(ds, s)) * SPREAD;
      if (ds > d0) rs = min(rs, R);            // background never bleeds over a nearer pixel
      float w = clamp(rs - rr + 0.5, 0.0, 1.0); // does the sample's disc reach us?
      acc += texture2D(inputBuffer, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * s;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;                      // already covered by the disc gather
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;              // only things in front of us
    float rs = abs(cocAt(ds, s));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(inputBuffer, suv).rgb * w; fw += w;
    cov += w * (M * M) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
#endif
  outputColor = vec4(col, inputColor.a);
}`;

type Stage = { taps: number; spread: number; nearTaps: number; rot: number };
const PRE: Stage = { taps: 16, spread: 0.287, nearTaps: 0, rot: 0.61 };
const MAIN: Stage = { taps: 64, spread: 0.958, nearTaps: 32, rot: 0 };

export class LensBlurEffect extends Effect {
  constructor({ maxCoC = 24, nearScale = 1.2, stage = MAIN }: { maxCoC?: number; nearScale?: number; stage?: Stage } = {}) {
    super("LensBlurEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      defines: new Map<string, string>([
        ["TAPS", String(stage.taps)], ["SPREAD", stage.spread.toFixed(4)], ["NEAR_TAPS", String(stage.nearTaps)], ["ROT", stage.rot.toFixed(4)],
      ]),
      uniforms: new Map<string, Uniform>([
        ["focus", new Uniform(10)], ["cInf", new Uniform(0)], ["nearScale", new Uniform(nearScale)], ["maxCoC", new Uniform(maxCoC)],
      ]),
    });
  }
  set focus(v: number) { this.uniforms.get("focus")!.value = v; }
  get focus() { return this.uniforms.get("focus")!.value as number; }
  set cInf(v: number) { this.uniforms.get("cInf")!.value = v; }
  get cInf() { return this.uniforms.get("cInf")!.value as number; }
}

/** The pair of passes the composer needs (pre first, then main); set focus / cInf once per frame on this object. */
export class LensBlur {
  readonly pre: LensBlurEffect;
  readonly main: LensBlurEffect;
  constructor({ maxCoC = 24, nearScale = 1.2 } = {}) {
    this.pre = new LensBlurEffect({ maxCoC, nearScale, stage: PRE });
    this.main = new LensBlurEffect({ maxCoC, nearScale, stage: MAIN });
  }
  set focus(v: number) { this.pre.focus = v; this.main.focus = v; }
  set cInf(v: number) { this.pre.cInf = v; this.main.cInf = v; }
  dispose() { this.pre.dispose(); this.main.dispose(); }
}

// ---------------- film grain (end of the chain, after the grade) ----------------
// Monochrome value-noise grain in display (gamma) space, std ~2.5 % of the display value in the mid-tones, less in
// deep blacks (ink stays black) and near white. Deterministic: the lattice is hashed with the frame number (PCG),
// so the same frame always renders the same grain (no shimmer between identical frames) and the grain moves from
// frame to frame like film. Grain cell size is given in px at 1080x1920 and scaled by output height / 1920, so the
// grain looks the same at 1080 and 1440 (a --scale 0.5 still averages it down by the browser's downscale).
const grainFrag = /* glsl */ `
uniform float seed;      // frame number
uniform float amount;    // std of the grain in display units (0.025 = 2.5 %)
uniform float cellPx;    // grain cell size in px at 1080x1920
uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float h3(ivec2 c, uint k) { return float(pcg(uint(c.x) + pcg(uint(c.y) + pcg(k)))) * (1.0 / 4294967295.0) - 0.5; }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv * resolution / (cellPx * resolution.y / 1920.0);
  ivec2 i = ivec2(floor(p)); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  uint k = uint(seed + 0.5) * 2654435761u + 1013904223u;
  float n = mix(mix(h3(i, k), h3(i + ivec2(1, 0), k), f.x), mix(h3(i + ivec2(0, 1), k), h3(i + ivec2(1, 1), k), f.x), f.y);
  vec3 g = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2));             // display-like space
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  float w = 0.25 + 0.75 * clamp(4.0 * l * (1.0 - l), 0.0, 1.0);      // less grain in deep black and near white
  g = max(g + n * (amount / 0.2145) * w, 0.0);                        // 0.2145 = std of the smoothed lattice noise
  outputColor = vec4(pow(g, vec3(2.2)), inputColor.a);
}`;

export class GrainEffect extends Effect {
  constructor({ amount = 0.025, cellPx = 1.5 }: { amount?: number; cellPx?: number } = {}) {
    super("GrainEffect", grainFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([["seed", new Uniform(0)], ["amount", new Uniform(amount)], ["cellPx", new Uniform(cellPx)]]),
    });
  }
  set seed(v: number) { this.uniforms.get("seed")!.value = v; }
  set amount(v: number) { this.uniforms.get("amount")!.value = v; }
}

// ======================================================================================================================
// Round 2 (POST): atmosphere, camera motion blur, lens glows and the bloom bright-pass. All deterministic: every input
// is a uniform set from (shot id, frame) in AntiTheft.tsx; no clocks, no random numbers (fixed hashes of pixel / world
// coordinates only). Pixel sizes are given in px at 1080x1920 and the shaders work in those units, so 540 / 1080 / 1440
// renders look the same.

// ---------------- atmosphere: dehaze, heat shimmer, blueprint paper (depth-aware, before the lens blur) ----------------
//  dehaze  : three.js linear Fog mixes c = mix(obj, fog, f) with f = smoothstep(near, far, viewDepth) in linear HDR. With
//            the fog colour and range of THIS layer's scene the mix inverts exactly: obj = (c - f fog) / (1 - f). Moving
//            the fog factor to f (1 - s) is c' = c + g (c - fog), g = s f / (1 - f), capped (far, nearly fogged geometry
//            would amplify noise) and ramped in by distance. Sky / clouds (no depth written) are never touched.
//  shimmer : 1-2 px heat-haze warp of the far band near the horizon (noon wides): two sine fields in screen px,
//            0.5 Hz upward drift, gated by distance (and the sky right above the horizon), weighted by a gaussian band
//            around the horizon line the CPU projects for this frame. A displaced sample must itself be far, so near
//            silhouettes are never dragged.
//  paper   : blueprint paper fibres + mottling on WORLD surfaces (world position from depth, triplanar by the surface
//            normal from derivatives), never on character cards (main depth nearer than the ink pass's world depth).
const atmosFrag = /* glsl */ `
uniform sampler2D tWorldDepth;
uniform float useWorld;
uniform vec3 fogCol;
uniform vec2 fogRange;
uniform vec4 dehaze;        // strength, ramp start (m), ramp end (m), max gain
uniform vec2 dehazeFar;     // the dehaze fades back out between these distances (m): far domes keep their aerial haze
uniform vec3 haze;          // extra aerial haze toward the fog (= horizon) colour: strength, ramp start (m), ramp end (m)
uniform vec4 hazeCol;       // round 4: rgb = the haze colour instead of the fog colour (w = 1 on), e.g. a warm late-sun haze
uniform float skySat;       // saturation x on sky pixels only (1 = off)
uniform vec4 skyDeep;       // round 4: sky pixels in a band ABOVE the horizon: saturation +x, value -y, horizon uv.y, band height (uv)
uniform vec4 shimmer;       // amplitude (px @1080), horizon (uv.y), band half height (uv), seconds
uniform vec2 shimmerRange;  // distance ramp (m)
uniform float paper;        // paper texture strength (0 = off)
uniform vec3 lineGlow;      // round 5: chalk-line glow: target luminance, max saturation, min luminance (x = 0: off)
uniform float skyGradK;     // round 7: sky re-gradient strength (0 = off)
uniform vec3 skyS0, skyS1, skyS2, skyS3, skyS4; uniform vec4 skySE;   // the world's sky stops this frame (world.ts sky shader)
uniform vec3 skyT0, skyT1, skyT2, skyT3, skyT4; uniform vec4 skyTE;   // the target stops (same ramp, radians)
uniform mat4 camWorld;
uniform vec2 proj;          // projection p00, p11
#define SKY_DEPTH 0.999995
float atH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float atN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(atH(i), atH(i + vec2(1.0, 0.0)), f.x), mix(atH(i + vec2(0.0, 1.0)), atH(i + vec2(1.0, 1.0)), f.x), f.y); }
float paperAt(vec2 p) {
  float fib = 0.55 * atN(vec2(p.x * 9.0, p.y * 70.0)) + 0.45 * atN(vec2(p.x * 23.0 + 3.1, p.y * 160.0));
  float crs = atN(vec2(p.y * 11.0 + 7.7, p.x * 85.0));
  float mot = 0.6 * atN(p * 1.3) + 0.4 * atN(p * 3.7 + 1.9);
  return 0.45 * (fib - 0.5) + 0.25 * (crs - 0.5) + 0.55 * (mot - 0.5);
}
vec3 skyRampS(float el) {   // world.ts sky shader, verbatim
  vec3 c = mix(skyS0, skyS1, smoothstep(0.0, skySE.x, el)); c = mix(c, skyS2, smoothstep(skySE.x, skySE.y, el));
  c = mix(c, skyS3, smoothstep(skySE.y, skySE.z, el)); return mix(c, skyS4, smoothstep(skySE.z, skySE.w, el)); }
vec3 skyRampT(float el) {
  vec3 c = mix(skyT0, skyT1, smoothstep(0.0, skyTE.x, el)); c = mix(c, skyT2, smoothstep(skyTE.x, skyTE.y, el));
  c = mix(c, skyT3, smoothstep(skyTE.y, skyTE.z, el)); return mix(c, skyT4, smoothstep(skyTE.z, skyTE.w, el)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float d = -getViewZ(depth);
  bool sky = depth >= SKY_DEPTH;
  // round 7 (audit A6 P3 shot 9: the morning sky is a flat pale grey-blue ~#B8C4D8, no deep blue at the top, no gold at the
  // horizon): sky pixels (the sky sphere + the clouds, which write no depth) are re-graded by elevation: each pixel's view
  // ray gives its elevation, the world's own sky ramp S(el) is evaluated exactly as world.ts draws it, and the pixel takes
  // the ratio T(el) / S(el) to the target ramp, so the plain sky lands ON the target and the clouds keep their own shapes
  // and shading (their bright lit tops are spared: they keep the low sun's gold). The ratio is relative to the LIVE
  // world stops, so a world-side sky change toward the same target fades this out by itself (never doubles).
  if (sky && skyGradK > 0.0) {
    vec2 n = uv * 2.0 - 1.0;
    vec3 dir = normalize(mat3(camWorld) * vec3(n.x / proj.x, n.y / proj.y, -1.0));
    float el = asin(clamp(dir.y, -1.0, 1.0));
    vec3 S = skyRampS(el), T = skyRampT(el);
    float ls = dot(S, vec3(0.2126, 0.7152, 0.0722)), lc = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float w = skyGradK * (1.0 - 0.75 * smoothstep(1.08 * ls + 0.02, 1.3 * ls + 0.12, lc));
    c *= mix(vec3(1.0), clamp(T / max(S, vec3(1e-4)), vec3(0.2), vec3(3.0)), w);
  }
  float pt = 0.0;
  if (paper > 0.0) {          // uniform branch: derivatives are safe here
    vec2 n = uv * 2.0 - 1.0;
    vec3 W = (camWorld * vec4(n.x * d / proj.x, n.y * d / proj.y, -d, 1.0)).xyz;
    vec3 N = normalize(cross(dFdx(W), dFdy(W)) + 1e-6);
    vec3 a = abs(N); a = a * a; a = a * a; a /= (a.x + a.y + a.z + 1e-5);
    pt = a.y * paperAt(W.xz) + a.z * paperAt(W.xy) + a.x * paperAt(W.zy);
  }
  if (shimmer.x > 0.0) {
    float band = (uv.y - shimmer.y) / shimmer.z;
    float w = exp(-band * band) * (sky ? 1.0 : smoothstep(shimmerRange.x, shimmerRange.y, d));
    if (w > 0.003) {
      vec2 p = uv * vec2(1080.0, 1920.0);
      float t = shimmer.w;
      float s = 0.6 * sin(6.2831853 * (p.y / 7.0 + 0.5 * t) + 1.7 * sin(6.2831853 * (p.x / 95.0 - 0.21 * t)))
              + 0.4 * sin(6.2831853 * (p.y / 17.0 - 0.37 * t + p.x / 260.0));
      vec2 suv = uv + vec2(s, 0.3 * s) * (shimmer.x * w) / vec2(1080.0, 1920.0);
      float ds = readDepth(suv);
      if (ds >= SKY_DEPTH || -getViewZ(ds) > shimmerRange.x) c = texture2D(inputBuffer, suv).rgb;
    }
  }
  if (dehaze.x > 0.0 && !sky) {
    float f = smoothstep(fogRange.x, fogRange.y, d);
    float g = min(dehaze.x * smoothstep(dehaze.y, dehaze.z, d) * f / max(1.0 - f, 1e-3), dehaze.w);
    g *= 1.0 - smoothstep(dehazeFar.x, dehazeFar.y, d);
    c = max(c + g * (c - fogCol), vec3(0.0));
  }
  if (haze.x > 0.0 && !sky) c = mix(c, hazeCol.w > 0.5 ? hazeCol.rgb : fogCol, haze.x * smoothstep(haze.y, haze.z, d));
  if (sky && skySat != 1.0) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = max(vec3(l) + skySat * (c - vec3(l)), vec3(0.0)); }
  if (sky && skyDeep.w > 0.0) {   // the pale milky band right above the horizon: richer and a little deeper
    float t = (uv.y - skyDeep.z) / skyDeep.w, wk = t > -0.15 ? exp(-max(t, 0.0) * max(t, 0.0) * 2.2) * smoothstep(-0.15, 0.05, t) : 0.0;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = max(vec3(l) + (1.0 + skyDeep.x * wk) * (c - vec3(l)), vec3(0.0)) * (1.0 - skyDeep.y * wk);
  }
  if (paper > 0.0 && !sky) {
    bool card = false;
    if (useWorld > 0.5) card = d < -getViewZ(texture2D(tWorldDepth, uv).x) * 0.985 - 0.03;
    if (!card) c *= 1.0 + paper * pt;
  }
  // round 5 (audit A4 P2 shot 11: the chalk lines are flat white with almost no bloom): near-white, low-saturation WORLD
  // pixels (the chalk lines, the white labels) are lifted to a target luminance above the bloom threshold, so they glow
  // like the reference's #BDDEF3 lines; character cards (nearer than the world-only depth), the cream sign face and the
  // orange shirt (saturated) are left alone. Target-based: a line WORLD-INT already made emissive is lifted less.
  if (lineGlow.x > 0.0 && !sky) {
    bool cardL = useWorld > 0.5 && d < -getViewZ(texture2D(tWorldDepth, uv).x) * 0.985 - 0.03;
    if (!cardL) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)), mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
      float s = (mx - mn) / max(mx, 1e-4);
      float w = smoothstep(lineGlow.z, lineGlow.z + 0.15, l) * (1.0 - smoothstep(0.6 * lineGlow.y, lineGlow.y, s))
              * smoothstep(-0.02, 0.04, c.b - c.r);   // cool whites only (the chalk); the cream sign face is warm
      c *= mix(1.0, max(1.0, lineGlow.x / max(l, 1e-3)), w);
    }
  }
  outputColor = vec4(c, inputColor.a);
}`;

export type AtmosParams = {
  dehaze?: [number, number, number, number];           // strength, ramp start m, ramp end m, max gain
  dehazeFar?: [number, number];                        // the dehaze fades out again between these distances (m)
  haze?: [number, number, number];                     // aerial haze toward the fog colour: strength, ramp start m, end m
  /** round 4: the haze colour (linear rgb) instead of the fog colour */
  hazeCol?: [number, number, number];
  skySat?: number;                                     // saturation x on the sky only
  /** round 4: deepen the pale sky band above the horizon: [saturation +x, value -y, band height (uv)]; needs skyHorizon */
  skyDeep?: [number, number, number]; skyHorizon?: number;
  shimmer?: { amp: number; d0: number; d1: number; band: number; horizon: number; t: number };
  paper?: number;
  /** round 5: chalk-line glow [target luminance (linear), max saturation, min luminance]: needs the world depth */
  lineGlow?: [number, number, number];
  /** round 7: sky re-gradient: strength, the world's live sky stops (5 linear colours + 4 ramp elevations, radians) and
   *  the target stops (same layout) */
  skyGrad?: { k: number; src: { c: Color3[]; e: [number, number, number, number] }; dst: { c: Color3[]; e: [number, number, number, number] } };
};
type Color3 = { r: number; g: number; b: number };
export class AtmosEffect extends Effect {
  constructor() {
    super("AtmosEffect", atmosFrag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["tWorldDepth", new Uniform(null)], ["useWorld", new Uniform(0)], ["fogCol", new Uniform(new Vector3())], ["fogRange", new Uniform(new Vector2(0, 1))],
        ["dehaze", new Uniform(new Vector4())], ["shimmer", new Uniform(new Vector4())], ["shimmerRange", new Uniform(new Vector2(150, 300))],
        ["dehazeFar", new Uniform(new Vector2(1e5, 2e5))], ["haze", new Uniform(new Vector3())], ["skySat", new Uniform(1)],
        ["hazeCol", new Uniform(new Vector4())], ["skyDeep", new Uniform(new Vector4())],
        ["paper", new Uniform(0)], ["camWorld", new Uniform(new Matrix4())], ["proj", new Uniform(new Vector2(1, 1))],
        ["lineGlow", new Uniform(new Vector3())],
        ["skyGradK", new Uniform(0)], ["skySE", new Uniform(new Vector4(1, 2, 3, 4))], ["skyTE", new Uniform(new Vector4(1, 2, 3, 4))],
        ...[0, 1, 2, 3, 4].flatMap((i) => [[`skyS${i}`, new Uniform(new Vector3())], [`skyT${i}`, new Uniform(new Vector3())]] as [string, Uniform][]),
      ]),
    });
  }
  /** per frame: this layer's fog (scene.fog), camera, world depth (InkPass.worldDepth) and the shot's parameters */
  set(p: AtmosParams, fog: { color: { r: number; g: number; b: number }; near: number; far: number } | null, camWorld: Matrix4,
    proj: [number, number], worldDepth: Texture | null) {
    const u = this.uniforms;
    if (fog) { (u.get("fogCol")!.value as Vector3).set(fog.color.r, fog.color.g, fog.color.b); (u.get("fogRange")!.value as Vector2).set(fog.near, fog.far); }
    const dh = p.dehaze && fog ? p.dehaze : [0, 0, 1, 0];
    (u.get("dehaze")!.value as Vector4).set(dh[0], dh[1], dh[2], dh[3]);
    const df = p.dehazeFar ?? [1e5, 2e5];
    (u.get("dehazeFar")!.value as Vector2).set(df[0], df[1]);
    const hz = p.haze && fog ? p.haze : [0, 0, 1];
    (u.get("haze")!.value as Vector3).set(hz[0], hz[1], hz[2]);
    u.get("skySat")!.value = p.skySat ?? 1;
    const hc = p.hazeCol; (u.get("hazeCol")!.value as Vector4).set(hc ? hc[0] : 0, hc ? hc[1] : 0, hc ? hc[2] : 0, hc ? 1 : 0);
    const sd = p.skyDeep; (u.get("skyDeep")!.value as Vector4).set(sd ? sd[0] : 0, sd ? sd[1] : 0, p.skyHorizon ?? 0.5, sd && p.skyHorizon !== undefined ? sd[2] : 0);
    const sh = p.shimmer;
    (u.get("shimmer")!.value as Vector4).set(sh ? sh.amp : 0, sh ? sh.horizon : 0.5, sh ? sh.band : 0.05, sh ? sh.t : 0);
    if (sh) (u.get("shimmerRange")!.value as Vector2).set(sh.d0, sh.d1);
    u.get("paper")!.value = worldDepth ? p.paper ?? 0 : 0;
    const lg = worldDepth ? p.lineGlow : undefined;
    (u.get("lineGlow")!.value as Vector3).set(lg ? lg[0] : 0, lg ? lg[1] : 0, lg ? lg[2] : 0);
    u.get("tWorldDepth")!.value = worldDepth; u.get("useWorld")!.value = worldDepth ? 1 : 0;
    const sg = p.skyGrad; u.get("skyGradK")!.value = sg ? sg.k : 0;
    if (sg) {
      (u.get("skySE")!.value as Vector4).set(...sg.src.e); (u.get("skyTE")!.value as Vector4).set(...sg.dst.e);
      for (let i = 0; i < 5; i++) { const a = sg.src.c[i], b = sg.dst.c[i]; (u.get(`skyS${i}`)!.value as Vector3).set(a.r, a.g, a.b); (u.get(`skyT${i}`)!.value as Vector3).set(b.r, b.g, b.b); }
    }
    (u.get("camWorld")!.value as Matrix4).copy(camWorld);
    (u.get("proj")!.value as Vector2).set(proj[0], proj[1]);
  }
}

// ---------------- camera motion blur (after the lens blur, before bloom) ----------------
// Reprojects every pixel (depth -> world) with the camera of frame f + 0.5 (story.ts camAt is pure, so the next camera
// is exact; f + 0.5 stays in the same impact-kick bucket, so the 1-frame kick jitter is never smeared). Blur vector =
// per-frame screen velocity x shutter (in frames), minus a knee so slow glides and creeps stay crisp, capped at maxLen
// px @1080; 24 tent-weighted taps (round 6; 16 box taps before) with a fixed interleaved-gradient jitter (static per
// pixel, no frame noise). Off (amount 0) on
// frames whose fastest probe moves less than the knee.
// Round 5 (audit A4 P2 shot 12 + the carry-over caps): `amount` is the SIGNED scale from the sampled camera to one VIDEO
// frame of motion (AntiTheft.tsx: warp rate / (2 x sample step)), so the blur follows the real on-screen speed of the
// ElevenLabs re-time; maxLen is set per frame (caps on the shot 10 punch, the shot 12 swing, the shot 13 snap, the
// shot 15 pull); maxLenCard caps the blur on CHARACTER CARDS (main depth nearer than the ink pass's world-only depth),
// and while it is lower than maxLen a world pixel's taps that land on a card are dropped, so a sharp face never smears
// into the blurred room behind it.
const mblurFrag = /* glsl */ `
uniform mat4 camWorld;
uniform mat4 nextVP;
uniform vec2 proj;
uniform float shutter;
uniform float knee;
uniform float maxLen;
uniform float maxLenCard;
uniform float amount;
uniform sampler2D tWorldDepth;
uniform float useWorld;
bool mbCard(vec2 s, float dz) { return -getViewZ(dz) < -getViewZ(texture2D(tWorldDepth, s).x) * 0.985 - 0.03; }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  outputColor = inputColor;
  if (amount == 0.0) return;
  float d = min(-getViewZ(depth), 1400.0);
  vec2 n = uv * 2.0 - 1.0;
  vec4 W = camWorld * vec4(n.x * d / proj.x, n.y * d / proj.y, -d, 1.0);
  vec4 q = nextVP * W;
  if (q.w <= 1e-4) return;
  vec2 vel = (q.xy / q.w * 0.5 + 0.5 - uv) * (2.0 * shutter * amount);
  float L = length(vel * vec2(1080.0, 1920.0));
  bool guard = useWorld > 0.5 && maxLenCard < maxLen;
  bool card = guard && mbCard(uv, depth);
  float L2 = min(max(L - knee, 0.0), card ? maxLenCard : maxLen);
  if (L2 < 0.5) return;
  vel *= L2 / L;
  // round 6 (audit A5 P2 shot 12: the whip landing showed 2-3 discrete ghost copies of the card outlines): a BOX kernel
  // turns a thin dark ink line into a flat band with two hard ends, which reads as a doubled outline. Now a TENT kernel
  // (weight 1 - |x|) over 1.3 x the blur length (the same mean smear), 24 taps: a line smears into one soft streak
  vel *= 1.3;
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 24; i++) {
    float x = (float(i) + j) / 24.0 - 0.5;
    vec2 s = uv + vel * x;
    float w = 1.0 - 2.0 * abs(x);
    if (guard && !card) { vec2 sc = clamp(s, vec2(0.001), vec2(0.999)); if (mbCard(sc, readDepth(sc))) w = 0.0; }
    acc += texture2D(inputBuffer, s).rgb * w; wsum += w;
  }
  outputColor = vec4(wsum > 0.25 ? acc / wsum : inputColor.rgb, inputColor.a);
}`;
export class MotionBlurEffect extends Effect {
  constructor({ shutter = 0.22, knee = 3, maxLen = 48 } = {}) {
    super("MotionBlurEffect", mblurFrag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ["camWorld", new Uniform(new Matrix4())], ["nextVP", new Uniform(new Matrix4())], ["proj", new Uniform(new Vector2(1, 1))],
        ["shutter", new Uniform(shutter)], ["knee", new Uniform(knee)], ["maxLen", new Uniform(maxLen)], ["amount", new Uniform(0)],
        ["maxLenCard", new Uniform(maxLen)], ["tWorldDepth", new Uniform(null)], ["useWorld", new Uniform(0)],
      ]),
    });
    this.baseMax = maxLen;
  }
  /** the default blur cap (px @1080) the per-frame caps start from */
  readonly baseMax: number;
  get knee() { return this.uniforms.get("knee")!.value as number; }
  get shutter() { return this.uniforms.get("shutter")!.value as number; }
  /** round 3: per-frame shutter (frames of exposure): light blur on glides, ~180 deg on whips (AntiTheft.tsx) */
  set shutter(v: number) { this.uniforms.get("shutter")!.value = v; }
  /** round 5: per-frame blur caps (px @1080): everything / character cards; the world-only depth for the card test */
  caps(maxLen: number, maxLenCard: number, worldDepth: Texture | null) {
    const u = this.uniforms;
    u.get("maxLen")!.value = maxLen; u.get("maxLenCard")!.value = Math.min(maxLen, maxLenCard);
    u.get("tWorldDepth")!.value = worldDepth; u.get("useWorld")!.value = worldDepth ? 1 : 0;
  }
  set(amount: number, camWorld: Matrix4, nextVP: Matrix4, proj: [number, number]) {
    const u = this.uniforms;
    u.get("amount")!.value = amount;
    (u.get("camWorld")!.value as Matrix4).copy(camWorld);
    (u.get("nextVP")!.value as Matrix4).copy(nextVP);
    (u.get("proj")!.value as Vector2).set(proj[0], proj[1]);
  }
}

// ---------------- lens glows: soft glows, 4-point twinkles, anamorphic streaks, horizon band, bokeh, god rays ----------------
// Up to LFX_N light sources per frame, each projected from a WORLD anchor by AntiTheft.tsx (glint on the rainbow rock,
// LED lock pulses, the stamp impact, the lamp bulb and moon, the dusk horizon, the sunset sun). Added in linear HDR
// before the tone map (so the Neutral curve rolls them off like real glare). Occlusion: 5 depth taps around the source
// against its own distance (source hidden behind a post or a character = no glow); minVis keeps a little spill.
//   kind 0 glow   : p1, p2 = radii x / y (px), gaussian core + soft exponential tail
//   kind 1 star   : p1 = arm e-fold (px), p2 = core radius, p3 = arm half width
//   kind 2 streak : p1 = e-fold length (px), p2 = half thickness (gaussian)
//   kind 3 band   : p1 = half height (px); weight p2 on things nearer than p3 m (horizon glow stays on the far world)
//   kind 4 bokeh  : p1 = disc radius (px), p2 = edge softness (px), p3 = rim brightness (0..1): the defocused disc of a
//                   point light (round 3: dusk practicals behind the CU)
//   kind 5 led    : (round 4, audit A3 P2 shot 10: the "8%" glow turned the whole LED box orange) an LED counter face:
//                   p1, p2 = half width / height of the face (px), p3 = halo e-fold (px). The halo (colour) is added
//                   ONLY outside the face rectangle; inside it the face is pulled toward near-black #140C0A (lfD.y =
//                   strength), which also clears the bloom haze the digits spread over it, while the lit digits keep
//                   their value (x lfD.w gain) and take a temperature (lfD.z: - = cooler crimson, + = hot red-orange)
//   kind 6 ghost  : (round 4) a soft hexagonal lens ghost: p1 = radius (px), p2 = edge softness (px), p3 = rim (0..1);
//                   its visibility is probed at lfD.yz (the sun's uv, at distance lfA.z) so it dies with the sun
//   kind 7 burst  : (round 6, audit A5 P3 shot 13: the climax slam had no impact FX) a cartoon impact: an elliptical ring
//                   (p1, p2 = radii x / y px, p3 = ring thickness px) plus N radial streaks (lfD.y = N) from lfD.z to lfD.w
//                   x the ring radius (each streak's length hashed 0.82-1.18 x), additive
//   kind 8 puff   : (round 6) a soft noisy dust puff painted OVER the picture (alpha-over, not additive): p1, p2 = radii
//                   (px), p3 = noise cell (px); lfD.y = opacity, lfD.z = noise seed; colour = the dust colour (linear)
// Round 3 per-pixel occlusion (occ, metres): a source is never painted on pixels nearer than (its distance - occ), so a
// sharp character standing in front of the glint rock or of a blurred lamp stays clean (audit A2: the rock streak
// crossed her dress). 0 = off: lens artefacts of the glass itself (the sun streak) keep crossing everything.
// God rays (round 3, the sunset sun behind Sign B): every pixel marches GR_TAPS depth taps toward the sun's screen
// point and counts the open SKY it passes near the sun (radial weight e-fold grP.x px), so posts, sign edges and heads
// cut dark shafts out of a warm additive glow; a fixed per-pixel jitter hides the tap steps (no frame noise). The sky
// itself gets only 15 % (sets_int.ts already draws the sun halo and a fan of rays there): the shafts fall on the air in
// front of the sign, the posts, the people and the ground.
export const LFX_N = 32; // round 4: 12 -> 16 (shot 15: band + tag swell + 7 dusk practicals x 2); round 5: 24 (shot 13: + 10 lens-dust specks); round 7: 32 (shot 13: + god-ray quads + the impact pulse; shot 12: chalk glints)
const lensFxFrag = /* glsl */ `
#define LFX_N ${LFX_N}
#define GR_TAPS 32
#define SKY_DEPTH 0.999995
uniform vec4 lfA[LFX_N];   // uv.x, uv.y, source distance (m; 0 = no occlusion test), kind
uniform vec4 lfB[LFX_N];   // linear HDR colour x intensity, rotation (rad)
uniform vec4 lfC[LFX_N];   // p1, p2, p3, minVis
uniform vec4 lfD[LFX_N];   // per-pixel occlusion margin (m, 0 = off), kind 5: face strength / temperature / digit gain,
                           // kind 6: the visibility probe uv (yz); kinds 0-4: w = dark protection (0..1, round 5)
uniform int lfN;
uniform vec2 grSun;        // sun screen uv (may lie outside 0..1)
uniform vec3 grCol;        // linear HDR colour x strength (0 = off)
uniform vec2 grP;          // radial e-fold around the sun (px), march length (fraction of the way to the sun)
uniform float grDark;      // round 5: dark protection of the god-ray veil (0 = off .. 1 = no veil on black)
uniform vec4 lfScan;       // round 6: LED face scanlines: x = strength (0 = off), y = line period (px @1080), z = phase (rad),
                           // w = rolling bright band strength
uniform vec4 grM;          // round 4: x = mode (0 = open SKY lets light through, 1 = BRIGHT pixels do, e.g. a window,
                           // 2 = everything FARTHER than y metres does: near posts / people cut shadow shafts),
                           // y = mode-1 luminance threshold (linear) / mode-2 distance, z = weight of the rays on sky pixels,
                           // w = march length cap (px @1080, 0 = none)
float lfVis(vec2 c, float d0) {
  if (d0 <= 0.0) return 1.0;
  float v = 0.0, m = 0.15 + 0.03 * d0;
  for (int k = 0; k < 5; k++) {
    vec2 o = vec2(k == 1 ? 1.0 : (k == 2 ? -1.0 : 0.0), k == 3 ? 1.0 : (k == 4 ? -1.0 : 0.0)) * (3.0 / vec2(1080.0, 1920.0));
    float dz = readDepth(c + o);
    v += (dz >= SKY_DEPTH || -getViewZ(dz) > d0 - m) ? 0.2 : 0.0;
  }
  return v;
}
float lfHex(vec2 q, float r) {   // signed distance to a flat-topped hexagon of inner radius r
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  q = abs(q); q -= 2.0 * min(dot(k.xy, q), 0.0) * k.xy; q -= vec2(clamp(q.x, -k.z * r, k.z * r), r);
  return length(q) * sign(q.y);
}
float atHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float atNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(atHash(i), atHash(i + vec2(1.0, 0.0)), f.x), mix(atHash(i + vec2(0.0, 1.0)), atHash(i + vec2(1.0, 1.0)), f.x), f.y); }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec3 add = vec3(0.0);
  vec3 base = inputColor.rgb;
  vec2 p = uv * vec2(1080.0, 1920.0);
  float dHere = depth >= SKY_DEPTH ? 1e4 : -getViewZ(depth);
  for (int i = 0; i < LFX_N; i++) {
    if (i >= lfN) break;
    vec4 A = lfA[i], B = lfB[i], C = lfC[i], D = lfD[i];
    vec2 dp = p - A.xy * vec2(1080.0, 1920.0);
    float cs = cos(B.w), sn = sin(B.w);
    vec2 r = vec2(cs * dp.x + sn * dp.y, -sn * dp.x + cs * dp.y);
    float k = 0.0;
    if (A.w < 0.5) { vec2 q = r / C.xy; float e = dot(q, q); k = exp(-e) + 0.25 * exp(-1.5 * sqrt(e)); }
    else if (A.w < 1.5) k = exp(-dot(r, r) / (C.y * C.y)) + exp(-abs(r.x) / C.x - r.y * r.y / (C.z * C.z)) + exp(-abs(r.y) / C.x - r.x * r.x / (C.z * C.z));
    else if (A.w < 2.5) k = exp(-abs(r.x) / C.x - r.y * r.y / (C.y * C.y));
    else if (A.w < 3.5) k = exp(-r.y * r.y / (C.x * C.x)) * mix(C.y, 1.0, smoothstep(0.4 * C.z, C.z, dHere));
    else if (A.w < 4.5) { float l = length(r); k = (1.0 - smoothstep(C.x - C.y, C.x + C.y, l)) * (0.8 + C.z * smoothstep(C.x - 3.0 * C.y, C.x - C.y, l)); }
    else if (A.w < 5.5) {
      vec2 q = abs(r) - C.xy;
      float o = length(max(q, 0.0)), inside = 1.0 - smoothstep(-1.5, 0.75, max(q.x, q.y));
      // only the face's own surface (nothing nearer, e.g. a head in front of the box)
      float atFace = A.z > 0.0 ? smoothstep(A.z - 0.45, A.z - 0.25, dHere) * (1.0 - smoothstep(A.z + 0.25, A.z + 0.45, dHere)) : 1.0;
      float fw = inside * atFace;
      if (fw > 0.0) {
        float m = max(base.r, max(base.g, base.b)), dig = smoothstep(0.45, 1.3, m);
        vec3 face = mix(base, vec3(0.0070, 0.0037, 0.0030) + 0.12 * base, 0.85 * D.y * fw);   // the unlit face / glass / haze
        float red = smoothstep(0.45, 0.15, base.g / max(base.r, 1e-3));                      // the red digits, not the amber label
        float t = D.z;
        vec3 mulT = t >= 0.0 ? vec3(1.0, 1.0 + 2.2 * t, 1.0 + 0.3 * t) : vec3(1.0, 1.0 + 0.5 * t, 1.0 - 5.0 * t);
        vec3 lit = base * mix(vec3(1.0), mulT, red * fw) * mix(1.0, D.w, fw);
        if (lfScan.x > 0.0) {   // round 6 (audit A5 ADD shot 10): dot-matrix scanlines + a slow bright band rolling down
          float sl = 0.5 + 0.5 * sin(6.2831853 * r.y / lfScan.y + lfScan.z);
          float band = exp(-pow(fract(r.y / (14.0 * lfScan.y) - 0.07 * lfScan.z) - 0.5, 2.0) * 40.0);
          lit *= mix(1.0, (1.0 - lfScan.x * sl) * (1.0 + lfScan.w * band), fw);
        }
        base = mix(face, lit, dig);
      }
      k = exp(-o / C.z) * smoothstep(-0.75, 1.5, max(q.x, q.y));
    }
    else if (A.w < 6.5) { float hd = lfHex(r, C.x); k = (1.0 - smoothstep(-C.y, C.y, hd)) * (0.7 + C.z * smoothstep(-3.0 * C.y, -C.y, hd)); }
    else if (A.w < 7.5) {
      vec2 q = r / C.xy; float rho = length(q), Rm = 0.5 * (C.x + C.y);
      float ring = exp(-pow((rho - 1.0) * Rm / C.z, 2.0));
      float N = max(D.y, 1.0), seg = 6.2831853 / N, ang = atan(q.y, q.x);
      float id = floor((ang - 0.21) / seg + 0.5), a0 = id * seg + 0.21;
      float hs = fract(sin(mod(id, N) * 91.7 + 3.1) * 43758.5453);
      float outer = D.w * (0.82 + 0.36 * hs), inner = D.z * (0.96 + 0.08 * hs);
      float dperp = abs(sin(ang - a0)) * length(r), along = clamp((rho - inner) / max(outer - inner, 1e-3), 0.0, 1.0);
      float th = C.z * (0.75 - 0.45 * along);   // a tapered stroke, thick at the root
      float streak = exp(-dperp * dperp / (th * th + 0.25)) * smoothstep(inner, inner + 0.05, rho) * (1.0 - smoothstep(outer - 0.1, outer, rho));
      k = ring + 0.9 * streak;
    }
    else {   // kind 8 puff: alpha-over
      vec2 q = r / C.xy; float e = dot(q, q);
      vec2 np = r / C.z + D.z;
      float n = 0.6 * atNoise(np) + 0.4 * atNoise(np * 2.3 + 7.1);
      float a = exp(-1.8 * e) * smoothstep(0.25, 0.75, n + 0.35 - 0.25 * e);
      if (D.x > 0.0 && A.z > 0.0) a *= smoothstep(A.z - 2.0 * D.x, A.z - D.x, dHere);
      base = mix(base, B.rgb, clamp(a * D.y, 0.0, 1.0));
      continue;
    }
    if (k < 1e-4) continue;
    if (D.x > 0.0 && A.z > 0.0) k *= smoothstep(A.z - 2.0 * D.x, A.z - D.x, dHere);
    // round 5 (audit A4 P2 shot 8: the morning veil made the frame milky): a wide glow can keep off the darks, so the
    // long violet shadows and the ink stay deep while the lit floor takes the warmth
    if (A.w < 4.5 && D.w > 0.0) k *= mix(1.0 - D.w, 1.0, smoothstep(0.0, 0.3, dot(base, vec3(0.2126, 0.7152, 0.0722))));
    add += B.rgb * k * mix(C.w, 1.0, lfVis(A.w > 5.5 && A.w < 6.5 ? D.yz : A.xy, A.z));
  }
  if (grCol.r + grCol.g + grCol.b > 0.0) {
    vec2 dv = grSun - uv;
    // round 4: an off-screen sun (the low morning sun far right) caps the march at grM.w px, so the taps stay on and
    // just past the frame edge (where the sky / the posts are) instead of running out to the sun's far-off point
    if (grM.w > 0.0) { float Lp = length(dv * grP.y * vec2(1080.0, 1920.0)); if (Lp > grM.w) dv *= grM.w / Lp; }
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float acc = 0.0;
    for (int i = 0; i < GR_TAPS; i++) {
      vec2 s = uv + dv * ((float(i) + j) / float(GR_TAPS)) * grP.y;
      float w = exp(-length((s - grSun) * vec2(1080.0, 1920.0)) / grP.x);
      if (w < 0.004) continue;
      vec2 sc = clamp(s, vec2(0.001), vec2(0.999));
      float dz = readDepth(sc);
      float open = grM.x < 0.5 ? (dz >= SKY_DEPTH ? 1.0 : 0.0)
        : grM.x < 1.5 ? smoothstep(grM.y, 1.7 * grM.y, dot(texture2D(inputBuffer, sc).rgb, vec3(0.2126, 0.7152, 0.0722)))
        : (dz >= SKY_DEPTH ? 1.0 : grM.y > 0.0 ? smoothstep(grM.y, 1.6 * grM.y, -getViewZ(dz))   // mode 2: the far world lets it through
          : smoothstep(-grM.y, 0.3 - grM.y, -getViewZ(dz)));   // (y < 0: a narrow 0.3 m step at -y m, e.g. just behind a wall)
      acc += open * w;
    }
    float gDark = mix(1.0 - grDark, 1.0, smoothstep(0.0, 0.3, dot(base, vec3(0.2126, 0.7152, 0.0722))));
    add += grCol * acc / float(GR_TAPS) * (depth >= SKY_DEPTH ? grM.z : gDark); // the sky keeps WORLD-INT's fan rays + halo
  }
  outputColor = vec4(base + add, inputColor.a);
}`;
export type LensSrc = { uv: [number, number]; dist: number; kind: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; col: [number, number, number]; rot?: number; p: [number, number, number?]; minVis?: number;
  /** round 6, kind 7: [streak count, streak start, streak end] (x the ring radius); kind 8: [opacity, noise seed] */
  burst?: [number, number, number]; puff?: [number, number];
  /** round 3: per-pixel occlusion margin (m): never paint pixels nearer than dist - occ (0 / unset = off) */
  occ?: number;
  /** round 4, kind 5: [face strength 0..1, digit temperature -1..1, digit gain]; kind 6: the visibility probe uv */
  led?: [number, number, number]; probe?: [number, number];
  /** round 5, kinds 0-4: dark protection 0..1 (the glow fades on dark pixels: 1 = none on black) */
  dark?: number };
/** god rays: the sun's screen uv, colour x strength (linear HDR), radial e-fold (px), march length (0..1); round 4:
 *  mode "sky" (open sky lets the light through, default) or "bright" (pixels brighter than th do: a night window),
 *  skyW = how much of the rays also lands on sky pixels (default .15) */
export type GodRays = { uv: [number, number]; col: [number, number, number]; fall: number; len: number; mode?: "sky" | "bright" | "far"; th?: number; skyW?: number;
  /** round 4: cap of the march length (px @1080, 0 = none) for a far off-screen sun */
  maxPx?: number;
  /** round 5: dark protection of the veil (0..1) */
  dark?: number };
export class LensFxEffect extends Effect {
  constructor() {
    super("LensFxEffect", lensFxFrag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["lfA", new Uniform(Array.from({ length: LFX_N }, () => new Vector4()))],
        ["lfB", new Uniform(Array.from({ length: LFX_N }, () => new Vector4()))],
        ["lfC", new Uniform(Array.from({ length: LFX_N }, () => new Vector4(1, 1, 1, 0)))],
        ["lfD", new Uniform(Array.from({ length: LFX_N }, () => new Vector4()))],
        ["lfN", new Uniform(0)],
        ["grSun", new Uniform(new Vector2(0.5, 0.5))], ["grCol", new Uniform(new Vector3())], ["grP", new Uniform(new Vector2(200, 1))],
        ["grM", new Uniform(new Vector4(0, 1, 0.15, 0))], ["grDark", new Uniform(0)], ["lfScan", new Uniform(new Vector4())],
      ]),
    });
  }
  /** round 6: LED face scanlines for this frame (strength 0 = off; period px @1080; phase rad; rolling band strength) */
  scan(strength: number, period = 6, phase = 0, band = 0) { (this.uniforms.get("lfScan")!.value as Vector4).set(strength, period, phase, band); }
  set(src: LensSrc[], rays?: GodRays | null) {
    const A = this.uniforms.get("lfA")!.value as Vector4[], B = this.uniforms.get("lfB")!.value as Vector4[], C = this.uniforms.get("lfC")!.value as Vector4[];
    const D = this.uniforms.get("lfD")!.value as Vector4[];
    const n = Math.min(LFX_N, src.length);
    for (let i = 0; i < n; i++) {
      const s = src[i];
      A[i].set(s.uv[0], s.uv[1], s.dist, s.kind); B[i].set(s.col[0], s.col[1], s.col[2], s.rot ?? 0);
      C[i].set(Math.max(1e-3, s.p[0]), Math.max(1e-3, s.p[1]), s.kind === 4 || s.kind === 6 ? Math.max(0, s.p[2] ?? 0) : Math.max(1e-3, s.p[2] ?? 1), s.minVis ?? 0);
      if (s.kind === 5) D[i].set(s.occ ?? 0, s.led?.[0] ?? 0.8, s.led?.[1] ?? 0, s.led?.[2] ?? 1);
      else if (s.kind === 6) D[i].set(0, s.probe?.[0] ?? s.uv[0], s.probe?.[1] ?? s.uv[1], 0);
      else if (s.kind === 7) D[i].set(s.occ ?? 0, s.burst?.[0] ?? 14, s.burst?.[1] ?? 1.1, s.burst?.[2] ?? 1.6);
      else if (s.kind === 8) D[i].set(s.occ ?? 0, s.puff?.[0] ?? 0.6, s.puff?.[1] ?? 0, 0);
      else D[i].set(s.occ ?? 0, 0, 0, s.dark ?? 0);
    }
    this.uniforms.get("lfN")!.value = n;
    const gc = rays ? rays.col : [0, 0, 0];
    (this.uniforms.get("grCol")!.value as Vector3).set(gc[0], gc[1], gc[2]);
    if (rays) {
      (this.uniforms.get("grSun")!.value as Vector2).set(rays.uv[0], rays.uv[1]); (this.uniforms.get("grP")!.value as Vector2).set(rays.fall, rays.len);
      (this.uniforms.get("grM")!.value as Vector4).set(rays.mode === "bright" ? 1 : rays.mode === "far" ? 2 : 0, rays.th ?? 1, rays.skyW ?? 0.15, rays.maxPx ?? 0);
      this.uniforms.get("grDark")!.value = rays.dark ?? 0;
    }
  }
}

// ---------------- bloom bright-pass ----------------
// postprocessing's luminance key never lets a saturated emissive through: the red LED digits (linear (2.4, .1, .05))
// have luminance .58 < 1. This key blends luminance with the max channel (maxK 0..1), so coloured emissives bloom
// while white faces, cream sign faces and clouds (all <= 1.0 in every channel) still never do.
const brightFrag = /* glsl */ `
#include <common>
uniform highp sampler2D inputBuffer;
uniform float threshold;
uniform float smoothing;
uniform float maxK;
varying vec2 vUv;
void main() {
  vec4 texel = texture2D(inputBuffer, vUv);
  float l = mix(luminance(texel.rgb), max(texel.r, max(texel.g, texel.b)), maxK);
  l = smoothstep(threshold, threshold + smoothing, l) * l;
  gl_FragColor = vec4(texel.rgb * clamp(l, 0.0, 1.0), l);
}`;
/** swap the bloom's luminance key for the colour-aware key above; returns a setter for (threshold, smoothing, maxK) */
export const brightPass = (bloom: BloomEffect) => {
  const m = bloom.luminanceMaterial;
  m.uniforms.maxK = new Uniform(0);
  m.fragmentShader = brightFrag;
  m.needsUpdate = true;
  return (threshold: number, smoothing: number, maxK: number) => {
    m.uniforms.threshold.value = threshold; m.uniforms.smoothing.value = smoothing; m.uniforms.maxK.value = maxK;
  };
};

// ---------------- QA: show what the bright-pass key lets through (magenta) over a grey image ----------------
const hotFrag = /* glsl */ `
uniform float threshold;
uniform float maxK;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = mix(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(c.r, max(c.g, c.b)), maxK);
  float y = dot(min(c, vec3(1.0)), vec3(0.2126, 0.7152, 0.0722)) * 0.6;
  outputColor = vec4(l > threshold ? vec3(1.0, 0.0, 1.0) * (0.5 + 0.5 * smoothstep(threshold, threshold * 2.0, l)) : vec3(y), inputColor.a);
}`;
export class HotEffect extends Effect {
  constructor() {
    super("HotEffect", hotFrag, { blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([["threshold", new Uniform(1)], ["maxK", new Uniform(1)]]) });
  }
  set(threshold: number, maxK: number) { this.uniforms.get("threshold")!.value = threshold; this.uniforms.get("maxK")!.value = maxK; }
}

// Ink outlines for the 3D world (antitheft POST pass, 2026-11-10), matched to CHANNEL_STYLE_BIBLE 5.2 / 13.E-32:
// ~3 px @1080 at mid distance (2-4), up to ~6-7 px on props right in front of the lens, ~2 px far; a DARK TINT, not
// black (wood/day brown #2B1A12, general plum #2A1A26, night navy #1A1D40), per light state (INK_LOOK below, set per
// frame from AntiTheft.tsx with lightAt's relight blend), plus a little of the surface's own darkened colour; no ink
// on sky / clouds (NOINK layer), none on far terrain (distance fade 90 -> 260 m) and almost none on geometry the lens
// blur dissolves (fade by the same thin-lens CoC as lensblur.ts). Widths scale with the output height (pxScale).
// Per-object opt-out: mesh.userData.ink = 0 (badlands terrain, mesa backdrops, painted far cards) keeps the mesh in
// the depth/normal buffer, so it still hides lines behind it and props in front of it still get their silhouette, but
// the mesh itself never carries a line (0.5 = half-strength lines). The normal pass culls like each mesh's material
// (FrontSide / BackSide / DoubleSide), so lines never appear where the visible render shows sky through a back face.
//
// How it works
//  1. Re-render the WORLD ONLY (camera layer 0) into a non-MSAA target: view-space normal (rgb), coverage (a) and
//     a depth texture. Character billboards, effect cards, sky, clouds and smoke live on layer NOINK, so they never
//     get rectangle outlines and never cut holes into the world's lines.
//  2. Edge mask (full resolution), pixel steps 1..RMAX along x, y and both diagonals:
//       depth  - signed 2nd difference of 1/z (exactly 0 on any plane, so no grazing-angle false lines) -> only the
//                NEAR side of a depth jump is inked, as a band `width` px wide (silhouettes vs sky, object vs object);
//       crease - normal angle 35-50 deg to a neighbour at the same depth, two-sided band ~0.75*width px wide,
//                concave folds (object meets ground, inner corners, room-shell joins) at `concaveGain`;
//       coverage is continuous in the width (no width popping when the camera moves); the width follows two
//       log-distance segments: 6.5 px at 0.8 m -> 3.2 px at 4 m -> 1.8 px at 90 m;
//       no ink where the main depth buffer has something nearer than the world (characters / cards in front).
//  2b. Contact shadows (round 2, see AO_FRAG): coloured screen-space AO from the same world buffer, half res.
//  3. Composite: coloured contact-shadow multiply, then the 3x3 tent-filtered mask (anti-aliasing), ink blended in display gamma (like Canvas2D), written back
//     into the input buffer (colour only; the composer's depth texture stays intact). The ink colour is pre-inverted
//     through the Neutral tone map (untone) so it lands on its hex before the grade. This is a Pass (not an Effect),
//     so R3F's <EffectComposer> keeps it as its own pass BEFORE the DOF: the lens blur then softens the lines too.
import * as THREE from "three";
import { Pass } from "postprocessing";
import { untone } from "./shade";
import type { LightName } from "./plan";

/** Layer for things that must never be outlined (camera-facing sprites, sky, clouds, smoke). */
export const NOINK = 3;

export type InkOptions = {
  color?: THREE.ColorRepresentation; // sRGB hex of the ink (on-screen target before the grade)
  strength?: number; // max opacity
  widthNear?: number; // silhouette / depth-jump line width in px at distNear (1080x1920 output)
  widthMid?: number; // ... at distMid
  widthFar?: number; // ... at distFar
  distNear?: number; // m
  distMid?: number; // m
  distFar?: number; // m
  surfTint?: number; // 0..1: how much of the surface's own darkened colour goes into the ink (brown on wood, ...)
  blurFadeLo?: number; // lens CoC (px @1080) where the ink starts to fade (things the DOF dissolves lose their lines)
  blurFadeHi?: number; // ... where it reaches blurFadeMin
  blurFadeMin?: number; // ink opacity left on fully blurred geometry
  creaseScale?: number; // crease line width / silhouette line width
  depthLo?: number; // relative depth jump (1 - z_near / z_far) where lines start
  depthHi?: number; // ... where they are full strength
  angleLo?: number; // crease angle (deg) where lines start
  angleHi?: number; // ... where they are full strength
  concaveGain?: number; // strength of concave folds (object meets ground, inner corners)
  farOpacity?: number; // opacity multiplier reached at distFar
  fadeNear?: number; // m: start of the far fade-out
  fadeFar?: number; // m: lines gone
};

const DEF: Required<InkOptions> = {
  // bible 13.E-32: ~3 px at mid distance (the shipped bridge 5.1 -> 3.3 px #030303 was ~1.5x too thick and too black)
  color: "#2B1A12", strength: 1.0, surfTint: 0.3,
  widthNear: 6.5, widthMid: 3.2, widthFar: 1.8, distNear: 0.8, distMid: 4, distFar: 90, creaseScale: 0.75,
  depthLo: 0.01, depthHi: 0.03, angleLo: 35, angleHi: 50, concaveGain: 0.55, // depth jumps from 1 %; creases from 35 deg
  farOpacity: 0.85, fadeNear: 90, fadeFar: 260, // far badlands / mesa silhouettes carry no ink (bible 5.2)
  blurFadeLo: 3, blurFadeHi: 11, blurFadeMin: 0.3,
};

/** Ink look per light state (bible 5.2): ink colour (on-screen hex), concave-fold strength (room-shell joins are not
 *  inked in the reference interiors), surface-colour share. Blended during in-shot relights like lightAt.
 *  ao / aoTint (round 2): screen-space CONTACT shadows from the world normal + depth buffer the ink already renders
 *  (under logs, shrubs, rocks, props, posts, in room corners and under desks). The shadow is a COLOURED multiply in
 *  display space (bible 6.1: shadows never neutral): ao = strength at full occlusion, aoTint = the multiply colour. */
export type InkLook = { color: string; concave: number; surf: number; ao: number; aoTint: string };
export const INK_LOOK: Record<LightName, InkLook> = {
  noon: { color: "#2B1A12", concave: 0.55, surf: 0.3, ao: 0.72, aoTint: "#7F86BC" },      // desert day: wood / day brown; lavender-blue contact shade (#61719D family)
  dim: { color: "#2B1A14", concave: 0.55, surf: 0.3, ao: 0.72, aoTint: "#7C84BA" },
  late: { color: "#2D1A14", concave: 0.55, surf: 0.3, ao: 0.72, aoTint: "#8A80B8" },
  morning: { color: "#2B1A1C", concave: 0.55, surf: 0.3, ao: 0.72, aoTint: "#857EC0" },   // low gold sun, cool shade: brown leaning plum; violet contact shade
  sunset: { color: "#2A1A26", concave: 0.55, surf: 0.25, ao: 0.7, aoTint: "#8A72A8" },   // backlit violet world: general plum
  dusk: { color: "#231B36", concave: 0.55, surf: 0.25, ao: 0.66, aoTint: "#7470AE" },     // blue hour: plum -> navy
  night_int: { color: "#1A1D40", concave: 0.25, surf: 0.2, ao: 0.66, aoTint: "#6066AE" }, // night navy, no wall/floor lines
  classroom: { color: "#2B1A12", concave: 0.25, surf: 0.3, ao: 0.72, aoTint: "#9A7A74" }, // warm wooden room: brown, no wall/floor lines; plum-brown corners
  blueprint: { color: "#0D2348", concave: 0.35, surf: 0.15, ao: 0.4, aoTint: "#5672BE" }, // blue-on-blue diagram space
};

/** "#rrggbb" -> raw [0..1] display values (no colour-space conversion) */
const hex3 = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// world-only normal pass (scene.overrideMaterial); works for Mesh and InstancedMesh. Cut-out materials
// (map + alphaTest, e.g. the sign board, the church clock) keep their shape: see onBeforeRender in the constructor.
const NORMAL_VERT = /* glsl */ `
#include <common>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`;
const NORMAL_FRAG = /* glsl */ `
uniform sampler2D tCut;
uniform float cut;
uniform float inkW;   // this object's ink weight (mesh.userData.ink, default 1): 0 = never inked, still occludes
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));   // geometry without normals
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);            // back faces of double-sided planes
  gl_FragColor = vec4(n, 0.5 + 0.5 * inkW);   // alpha < .5 = empty (sky); .5..1 = world, ink weight 0..1
}`;

const MASK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wMid;
uniform float wFar;
uniform float dNear;
uniform float dMid;
uniform float dFar;
uniform float lensFocus;  // lensblur.ts focus distance (m) and cInf (px @1080): fade ink where the DOF dissolves it
uniform float lensCInf;
uniform vec3 blurFade;    // CoC lo, CoC hi (px @1080), opacity left
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float strength;
uniform float useMain;
uniform float pxScale;   // output px per 1080x1920 px
uniform vec2 fogRange;   // scene fog near / far (m); far <= near = no fog tint
uniform float fogStart;  // ink stays pure black up to here (m), then tints toward the fog colour
varying vec2 vUv;

// pixel steps along x, y and both diagonals, and their length in px
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9   // covers 6.5 px x pxScale 1.333 = 8.7 px at 1440x2560

// textureLod: explicit LOD inside loops (nearest-filtered targets, no derivatives needed)
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

// crease strength between this pixel (n0, P0) and a neighbour
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;       // sky / depth jump: not a crease
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;        // neighbour in front of our tangent plane: concave
  return k;
}

void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }          // sky / empty: ink lives on the near object only
  float zc = dist(tDepth, vUv);

  // characters, cards etc. (not in the world buffer) in front of this pixel: no world ink over them
  if (useMain > 0.5) {
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  // two log-distance segments: wNear at dNear -> wMid at dMid -> wFar at dFar (t = 0..1 over the far segment)
  float tn = clamp(log(zc / dNear) / log(dMid / dNear), 0.0, 1.0);
  float t = clamp(log(zc / dMid) / log(dFar / dMid), 0.0, 1.0);
  float w = (zc < dMid ? mix(wNear, wMid, tn) : mix(wMid, wFar, t)) * pxScale; // silhouette width (output px), near side only
  float hc = 0.5 * w * creaseScale;                  // crease line half width (px), drawn on both faces
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];          // distance of this pixel's centre to an edge first seen at r
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);       // continuous coverage -> no width popping, built-in AA
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      // depth jump: this pixel is in front of its neighbours (2nd difference of 1/z < 0; exactly 0 on planes)
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      // crease: normal turns towards a neighbour at the same depth
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }

  float wObj = clamp((nc.a - 0.5) * 2.0, 0.0, 1.0);  // per-object ink weight (terrain / backdrops: 0)
  float ink = max(eD, eN) * strength * wObj * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  if (lensCInf > 0.25) {                             // same thin-lens CoC as lensblur.ts (px @1080)
    float coc = lensCInf * abs(1.0 - lensFocus / max(zc, 1e-3));
    ink *= mix(1.0, blurFade.z, smoothstep(blurFade.x, blurFade.y, coc));
  }
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`;

// contact shadows (round 2): alchemy-style screen-space AO on the WORLD-ONLY normal + depth buffer, half resolution,
// 12 taps on a golden spiral rotated by a 4x4 Bayer pattern, then a depth-aware 4x4 box that cancels the pattern.
// Radius = aoRadius.x + aoRadius.y * distance (m), clamped to aoMaxPx (px @1080), so the shade is a soft ~40-110 px
// contact band at any distance and vanishes on the far badlands (no AO where the radius is under 1.5 px). Range check
// (samples farther than the radius count 0): no dark halos behind silhouettes. Sky and cards in front: 0.
const AO_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform vec2 aoRadius;
uniform float aoMaxPx;
uniform float pxScale;
uniform float useMain;
varying vec2 vUv;
#define AO_TAPS 12
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0, 1e4, 0.0, 1.0); return; }
  float zc = dist(tDepth, vUv);
  if (useMain > 0.5 && dist(tMainDepth, vUv) < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0, zc, 0.0, 1.0); return; }
  float pxPerM = p11 * 0.5 / (texel.y * zc);
  float R = aoRadius.x + aoRadius.y * zc;
  float rpx = min(R * pxPerM, aoMaxPx * pxScale);
  if (rpx < 1.5) { gl_FragColor = vec4(0.0, zc, 0.0, 1.0); return; }
  R = rpx / pxPerM;
  vec3 P = viewPos(vUv, zc);
  vec3 N = normalize(nc.xyz);
  float jit = bayer4(gl_FragCoord.xy);
  float occ = 0.0;
  for (int i = 0; i < AO_TAPS; i++) {
    float fi = float(i);
    float r = (fi + 0.5 + 0.5 * fract(jit * 3.7)) / float(AO_TAPS);
    float a = fi * 2.39996323 + jit * 6.2831853;
    vec2 uq = vUv + vec2(cos(a), sin(a)) * r * rpx * texel;
    float zq = dist(tDepth, uq);
    vec3 v = viewPos(uq, zq) - P;
    float d2 = dot(v, v);
    float nd = dot(v, N) * inversesqrt(d2 + 1e-8);
    occ += max(0.0, nd - 0.1) * max(0.0, 1.0 - d2 / (R * R));
  }
  gl_FragColor = vec4(1.0 - exp(-10.0 * occ / float(AO_TAPS)), zc, 0.0, 1.0);
}`;

const AO_BLUR_FRAG = /* glsl */ `
uniform sampler2D tAO;
uniform vec2 aoTexel;
varying vec2 vUv;
void main() {
  vec2 c = textureLod(tAO, vUv, 0.0).rg;
  float sum = 0.0, w = 0.0;
  for (int y = -2; y < 2; y++) for (int x = -2; x < 2; x++) {
    vec2 s = textureLod(tAO, vUv + vec2(float(x), float(y)) * aoTexel, 0.0).rg;
    float k = step(abs(s.g - c.g), 0.05 * c.g + 0.04);
    sum += s.r * k; w += k;
  }
  gl_FragColor = vec4(sum / max(w, 1.0), c.g, 0.0, 1.0);
}`;

const COMP_FRAG = /* glsl */ `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 inkColor;
uniform vec3 fogColor;
uniform float fogInk;   // how far fully fogged ink moves toward the fog colour (0.3)
uniform float surfTint; // share of the surface's own darkened colour in the ink (display space)
uniform sampler2D tAO;  // blurred half-res contact shadow (r)
uniform vec3 aoTint;    // display-space multiply colour at full occlusion
uniform float aoK;      // strength (0 = off)
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;   // 1-2-1 tent = anti-aliasing
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); return; }               // mask only
  if (debug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).xyz * 0.5 + 0.5, 1.0); return; } // world normals
  if (debug == 3) { gl_FragColor = vec4(vec3(1.0 - texture2D(tAO, vUv).r), 1.0); return; }        // contact shadow
  // blend in display (gamma) space like Canvas2D does for the character drawings: coverage -> darkness is linear
  // on screen, so the measured line widths equal the coverage widths (a linear-light blend reads ~30 % thinner)
  float fk = texture2D(tMask, vUv).g;                       // fog amount of the line (max over the AA footprint)
  fk = max(fk, max(texture2D(tMask, vUv + vec2(texel.x, 0.0)).g, texture2D(tMask, vUv - vec2(texel.x, 0.0)).g));
  fk = max(fk, max(texture2D(tMask, vUv + vec2(0.0, texel.y)).g, texture2D(tMask, vUv - vec2(0.0, texel.y)).g));
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  if (aoK > 0.0) g *= mix(vec3(1.0), aoTint, clamp(texture2D(tAO, vUv).r * aoK, 0.0, 1.0)); // coloured contact shade
  // dark tint of the surface under the line (brown on wood, slate on rock, ...): its display colour x .26,
  // pushed a little more saturated, mixed into the light's ink colour
  vec3 gs = clamp(g, 0.0, 1.0);
  float gl = dot(gs, vec3(0.2126, 0.7152, 0.0722));
  vec3 surfDark = clamp(mix(vec3(gl), gs, 1.35), 0.0, 1.0) * 0.26;
  vec3 inkG = mix(pow(inkColor, vec3(1.0 / 2.2)), surfDark, surfTint);
  inkG = mix(inkG, pow(fogColor, vec3(1.0 / 2.2)), fk * fogInk);
  gl_FragColor = vec4(pow(mix(g, inkG, a), vec3(2.2)), c.a);
}`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
  #include <colorspace_fragment>
}`;

export class InkPass extends Pass {
  /** 0 = normal, 1 = show the ink mask, 2 = show the world normal buffer, 3 = show the contact shadow */
  debug = 0;
  /** global contact-shadow multiplier (QA toggle post.ao); the per-light strength comes from INK_LOOK */
  aoScale = 1;
  private world: THREE.Scene;
  private cam: THREE.PerspectiveCamera;
  private rt: THREE.WebGLRenderTarget;
  private maskRT: THREE.WebGLRenderTarget;
  private tmpRT: THREE.WebGLRenderTarget;
  private normalMat: THREE.ShaderMaterial;
  private maskMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private copyMat: THREE.ShaderMaterial;
  private aoRT: THREE.WebGLRenderTarget;
  private aoBlurRT: THREE.WebGLRenderTarget;
  private aoMat: THREE.ShaderMaterial;
  private aoBlurMat: THREE.ShaderMaterial;
  private aoLook = 0;
  private fsScene = new THREE.Scene();
  private fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private clearCol = new THREE.Color();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, options: InkOptions = {}) {
    super("InkPass");
    const o = { ...DEF, ...options };
    this.world = scene;
    this.cam = camera;
    this.cam.layers.enable(NOINK); // the main render still shows the NOINK layer (and its shadows)
    this.needsSwap = false; // writes back into the input buffer (keeps the composer's depth texture intact)
    this.needsDepthTexture = true;

    this.rt = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: true, samples: 0,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.maskRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: false,
    });
    this.tmpRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: false,
    });
    // contact shadow targets (half resolution): r = occlusion, g = distance (for the depth-aware blur)
    this.aoRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false,
    });
    this.aoBlurRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false,
    });

    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: NORMAL_VERT, fragmentShader: NORMAL_FRAG, side: THREE.DoubleSide,
      uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() }, inkW: { value: 1 } },
    });
    // per object: copy the original material's cut-out (map + alphaTest) so alpha-tested world planes keep their shape
    this.normalMat.onBeforeRender = (_r, _s, _c, _g, object, group) => {
      const mat = (object as THREE.Mesh).material as THREE.Material | THREE.Material[];
      const gi = (group as unknown as { materialIndex?: number } | null)?.materialIndex ?? 0; // geometry group at runtime
      const src = (Array.isArray(mat) ? mat[gi] : mat) as THREE.MeshLambertMaterial;
      const u = this.normalMat.uniforms;
      // cull exactly like the visible render: a FrontSide box seen through its open bottom (boxGeo without `bottom`)
      // must not get a line where the main render shows sky (measured: a detached line 4-5 px under the stub board)
      this.normalMat.side = src?.side ?? THREE.FrontSide;
      const w = (object.userData as { ink?: number }).ink;
      u.inkW.value = w === undefined ? 1 : Math.max(0, Math.min(1, w));
      const map = src && src.alphaTest > 0 ? src.map : null;
      u.tCut.value = map; u.cut.value = map ? src.alphaTest : 0;
      if (map) { map.updateMatrix(); (u.cutUv.value as THREE.Matrix3).copy(map.matrix); }
      this.normalMat.uniformsNeedUpdate = true;
    };
    const fs = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const texel = new THREE.Vector2(1, 1);
    this.maskMat = fs(MASK_FRAG, {
      tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMainDepth: { value: null },
      texel: { value: texel }, cNear: { value: 0.2 }, cFar: { value: 1500 }, p00: { value: 1 }, p11: { value: 1 },
      wNear: { value: o.widthNear }, wMid: { value: o.widthMid }, wFar: { value: o.widthFar },
      dNear: { value: o.distNear }, dMid: { value: o.distMid }, dFar: { value: o.distFar },
      lensFocus: { value: 10 }, lensCInf: { value: 0 }, blurFade: { value: new THREE.Vector3(o.blurFadeLo, o.blurFadeHi, o.blurFadeMin) },
      creaseScale: { value: o.creaseScale }, depthLo: { value: o.depthLo }, depthHi: { value: o.depthHi },
      cosLo: { value: Math.cos((o.angleLo * Math.PI) / 180) }, cosHi: { value: Math.cos((o.angleHi * Math.PI) / 180) },
      concaveGain: { value: o.concaveGain }, farOpacity: { value: o.farOpacity },
      fadeNear: { value: o.fadeNear }, fadeFar: { value: o.fadeFar }, strength: { value: o.strength }, useMain: { value: 0 }, pxScale: { value: 1 }, fogRange: { value: new THREE.Vector2(0, 0) }, fogStart: { value: 60 },
    });
    this.compMat = fs(COMP_FRAG, {
      inputBuffer: { value: null }, tMask: { value: this.maskRT.texture }, tNormal: { value: this.rt.texture },
      texel: { value: texel }, inkColor: { value: untone(o.color) }, debug: { value: 0 },
      fogColor: { value: new THREE.Color() }, fogInk: { value: 0.3 }, surfTint: { value: o.surfTint },
      tAO: { value: this.aoBlurRT.texture }, aoTint: { value: new THREE.Color(1, 1, 1) }, aoK: { value: 0 },
    });
    const mu = this.maskMat.uniforms; // shared uniform objects: camera terms are set once per frame on the mask
    this.aoMat = fs(AO_FRAG, {
      tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMainDepth: mu.tMainDepth, texel: mu.texel,
      cNear: mu.cNear, cFar: mu.cFar, p00: mu.p00, p11: mu.p11, pxScale: mu.pxScale, useMain: mu.useMain,
      aoRadius: { value: new THREE.Vector2(0.3, 0.035) }, aoMaxPx: { value: 110 },
    });
    this.aoBlurMat = fs(AO_BLUR_FRAG, { tAO: { value: this.aoRT.texture }, aoTexel: { value: new THREE.Vector2(1, 1) } });
    this.copyMat = fs(COPY_FRAG, { tSrc: { value: this.tmpRT.texture } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.maskMat);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
  }

  /** live tuning, e.g. ink.set({ widthMid: 3.0, concaveGain: 0.5 }) */
  set(options: InkOptions) {
    const u = this.maskMat.uniforms;
    const map: [keyof InkOptions, string][] = [["widthNear", "wNear"], ["widthMid", "wMid"], ["widthFar", "wFar"],
      ["distNear", "dNear"], ["distMid", "dMid"], ["distFar", "dFar"],
      ["creaseScale", "creaseScale"], ["depthLo", "depthLo"], ["depthHi", "depthHi"], ["concaveGain", "concaveGain"],
      ["farOpacity", "farOpacity"], ["fadeNear", "fadeNear"], ["fadeFar", "fadeFar"], ["strength", "strength"]];
    for (const [k, n] of map) if (options[k] !== undefined) u[n].value = options[k];
    if (options.angleLo !== undefined) u.cosLo.value = Math.cos((options.angleLo * Math.PI) / 180);
    if (options.angleHi !== undefined) u.cosHi.value = Math.cos((options.angleHi * Math.PI) / 180);
    if (options.color !== undefined) untone(options.color, this.compMat.uniforms.inkColor.value as THREE.Color);
    if (options.surfTint !== undefined) this.compMat.uniforms.surfTint.value = options.surfTint;
    const bf = u.blurFade.value as THREE.Vector3;
    if (options.blurFadeLo !== undefined) bf.x = options.blurFadeLo;
    if (options.blurFadeHi !== undefined) bf.y = options.blurFadeHi;
    if (options.blurFadeMin !== undefined) bf.z = options.blurFadeMin;
  }

  /** per-frame ink look of this layer: light a -> b at k (lightAt's relight blend), so every crossfade layer and every
   *  in-shot relight inks with its own light. Only touches the colour when it changes. */
  look(a: LightName, b: LightName, k: number) {
    const A = INK_LOOK[a], B = INK_LOOK[b], L = (x: number, y: number) => x + (y - x) * k;
    const key = `${a}|${b}|${k.toFixed(3)}`;
    if (this.lookKey !== key) {
      this.lookKey = key;
      const ca = new THREE.Color(A.color), cb = new THREE.Color(B.color);   // blend the on-screen hexes (sRGB-ish)
      const hex = new THREE.Color().setRGB(L(ca.r, cb.r), L(ca.g, cb.g), L(ca.b, cb.b));
      untone(hex, this.compMat.uniforms.inkColor.value as THREE.Color);
    }
    this.maskMat.uniforms.concaveGain.value = L(A.concave, B.concave);
    this.compMat.uniforms.surfTint.value = L(A.surf, B.surf);
    const ta = hex3(A.aoTint), tb = hex3(B.aoTint); // display-space multiply (raw hex / 255), blended as hex
    (this.compMat.uniforms.aoTint.value as THREE.Color).setRGB(L(ta[0], tb[0]), L(ta[1], tb[1]), L(ta[2], tb[2]), THREE.LinearSRGBColorSpace);
    this.aoLook = L(A.ao, B.ao);
  }
  /** the world-only depth texture of the last render (atmosphere / paper effects use it to skip character cards) */
  get worldDepth() { return this.rt.depthTexture; }
  private lookKey = "";

  /** the lens blur of this frame (lensblur.ts focus / cInf), so lines on geometry the DOF dissolves fade out */
  lens(focus: number, cInf: number) {
    this.maskMat.uniforms.lensFocus.value = focus;
    this.maskMat.uniforms.lensCInf.value = cInf;
  }

  override setDepthTexture(depthTexture: THREE.Texture) {
    this.maskMat.uniforms.tMainDepth.value = depthTexture ?? null;
    this.maskMat.uniforms.useMain.value = depthTexture ? 1 : 0;
  }

  override setSize(width: number, height: number) {
    this.rt.setSize(width, height);
    this.maskRT.setSize(width, height);
    this.tmpRT.setSize(width, height);
    const hw = Math.max(1, Math.ceil(width / 2)), hh = Math.max(1, Math.ceil(height / 2));
    this.aoRT.setSize(hw, hh); this.aoBlurRT.setSize(hw, hh);
    (this.aoBlurMat.uniforms.aoTexel.value as THREE.Vector2).set(1 / hw, 1 / hh);
    (this.maskMat.uniforms.texel.value as THREE.Vector2).set(1 / width, 1 / height);
    this.maskMat.uniforms.pxScale.value = height / 1920; // widths are specified at 1080x1920
  }

  override render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    const scene = this.world, cam = this.cam;
    const autoClear = renderer.autoClear, shadowAuto = renderer.shadowMap.autoUpdate;
    const mask = cam.layers.mask, override = scene.overrideMaterial, background = scene.background;
    renderer.getClearColor(this.clearCol);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;

    // 1) world-only normals + depth (no characters / sprites / sky; shadow maps are not re-rendered)
    cam.layers.disable(NOINK);
    scene.overrideMaterial = this.normalMat;
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    cam.layers.mask = mask;
    scene.overrideMaterial = override;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(this.clearCol, clearAlpha);

    // 2) edge mask
    const u = this.maskMat.uniforms, e = cam.projectionMatrix.elements;
    u.cNear.value = cam.near; u.cFar.value = cam.far; u.p00.value = e[0]; u.p11.value = e[5];
    const fog = scene.fog as THREE.Fog | null;
    if (fog && (fog as THREE.Fog).isFog) { (u.fogRange.value as THREE.Vector2).set(fog.near, fog.far); (this.compMat.uniforms.fogColor.value as THREE.Color).copy(fog.color); }
    else (u.fogRange.value as THREE.Vector2).set(0, 0);
    this.quad.material = this.maskMat;
    renderer.setRenderTarget(this.maskRT);
    renderer.render(this.fsScene, this.fsCam);

    // 2b) contact shadows (half res) + depth-aware 4x4 blur
    const aoK = this.aoLook * this.aoScale;
    this.compMat.uniforms.aoK.value = aoK;
    if (aoK > 0 || this.debug === 3) {
      this.quad.material = this.aoMat;
      renderer.setRenderTarget(this.aoRT);
      renderer.render(this.fsScene, this.fsCam);
      this.quad.material = this.aoBlurMat;
      renderer.setRenderTarget(this.aoBlurRT);
      renderer.render(this.fsScene, this.fsCam);
    }

    // 3) composite into a temp target, 4) copy back into the input buffer (colour only; depth untouched)
    this.compMat.uniforms.inputBuffer.value = inputBuffer.texture;
    this.compMat.uniforms.debug.value = this.debug;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.tmpRT);
    renderer.render(this.fsScene, this.fsCam);
    this.quad.material = this.copyMat;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.render(this.fsScene, this.fsCam);

    renderer.autoClear = autoClear;
  }

  override dispose() {
    this.rt.depthTexture?.dispose();
    this.rt.dispose(); this.maskRT.dispose(); this.tmpRT.dispose(); this.aoRT.dispose(); this.aoBlurRT.dispose();
    this.normalMat.dispose(); this.maskMat.dispose(); this.compMat.dispose(); this.copyMat.dispose(); this.aoMat.dispose(); this.aoBlurMat.dispose();
    this.quad.geometry.dispose();
  }
}

/** Safety net for the NOINK contract (CHAR / WORLD put cards, sky, clouds and smoke on NOINK themselves): anything
 *  that does not write depth in the main render (sky sphere, cloud and smoke cards, soft effect sprites) and every
 *  camera-facing billboard (meshes with a customDepthMaterial cut-out = cast actors; alpha-tested MeshBasicMaterial
 *  effect cards) goes on NOINK. Idempotent, cheap (one traversal), safe to call every frame. */
export function noInkFallback(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(m.isMesh || (o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine)) return;
    if (o.layers.mask === 1 << NOINK) return;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[];
    const card = !!m.customDepthMaterial || (o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine;
    const noDepth = mats.some((x) => x && x.depthWrite === false);
    const basicCut = mats.some((x) => x && (x as THREE.MeshBasicMaterial).isMeshBasicMaterial && x.alphaTest > 0);
    if (card || noDepth || basicCut) o.layers.set(NOINK);
  });
}

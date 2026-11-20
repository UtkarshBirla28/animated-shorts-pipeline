// REAL-WORLD KIT core shaders (from the look pilot, studio/src/sandboxes/lookpilot/shaders.ts, frozen there):
// PCSS soft sun shadows patched into three's shadow chunk (global, idempotent), the per-sub-frame noise seed + PCSS tap
// counts every lit material receives (auto-wrapped by the pipeline), the accumulation pass (sub-frame motion blur + lens
// DOF + AA, with the ray-marched sun shafts), a copy pass and the calm filmic grade.
import * as THREE from "three";
import { Effect, BlendFunction, Pass } from "postprocessing";

// ================================================================ shared per-sub-frame uniforms
/** rotates the PCSS / shaft noise per sub-frame (the accumulation averages it away) */
export const KIT_SEED = { value: 0 };
/** PCSS taps (blocker, filter) for the current quality */
export const KIT_TAPS = { value: new THREE.Vector2(16, 32) };

// ================================================================ PCSS (directional / spot, PCF path)
// A light with shadow.radius > 50 uses PCSS: penumbra (texels) = (receiver depth - mean blocker depth) * (radius - 50).
// Vogel-disk taps rotated per pixel (interleaved gradient noise + the per-sub-frame seed). Lights with radius <= 50 keep
// three's normal PCF (spot / point practicals: radius = softness in texels).
const PCSS = /* glsl */ `
uniform float lpSeed;
uniform vec2 lpTaps;
float lpIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
vec2 lpVogel( int i, float n, float s, float c ) {
  float r = sqrt( ( float( i ) + 0.5 ) / n ), th = float( i ) * 2.39996;
  vec2 p = vec2( cos( th ), sin( th ) ) * r;
  return vec2( p.x * c - p.y * s, p.x * s + p.y * c );
}
float lpPCSS( sampler2D sm, vec2 size, float K, vec4 sc ) {
  vec2 texel = 1.0 / size;
  float zR = sc.z;
  int nB = lpTaps.x > 0.5 ? int( lpTaps.x ) : 16;
  int nF = lpTaps.y > 0.5 ? int( lpTaps.y ) : 32;
  float fB = float( nB ), fF = float( nF );
  float ang = 6.2831853 * lpIGN( gl_FragCoord.xy + vec2( 17.0, 59.0 ) * lpSeed );
  float sA = sin( ang ), cA = cos( ang );
  float Rs = clamp( K * 0.12, 3.0, 36.0 );
  float sum = 0.0, n = 0.0;
  for ( int i = 0; i < 32; i ++ ) {
    if ( i >= nB ) break;
    float d = unpackRGBAToDepth( textureLod( sm, sc.xy + lpVogel( i, fB, sA, cA ) * Rs * texel, 0.0 ) );
    if ( d < zR ) { sum += d; n += 1.0; }
  }
  if ( n < 0.5 ) return 1.0;
  float pen = clamp( ( zR - sum / n ) * K, 1.2, 36.0 );
  float lit = 0.0;
  for ( int i = 0; i < 64; i ++ ) {
    if ( i >= nF ) break;
    lit += step( zR, unpackRGBAToDepth( textureLod( sm, sc.xy + lpVogel( i, fF, cA, sA ) * pen * texel, 0.0 ) ) );
  }
  return lit / fF;
}
`;
let patched = false;
/** patch three's PCF shadow chunk with PCSS (once per bundle; the pipeline calls it at import) */
export const patchShadowChunk = () => {
  if (patched) return;
  patched = true;
  let s = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (s.includes("lpPCSS")) return;
  s = s.replace("float getShadow( sampler2D shadowMap,", PCSS + "\n\tfloat getShadow( sampler2D shadowMap,");
  s = s.replace("#if defined( SHADOWMAP_TYPE_PCF )\n", "#if defined( SHADOWMAP_TYPE_PCF )\n if ( shadowRadius > 50.0 ) { shadow = lpPCSS( shadowMap, shadowMapSize, shadowRadius - 50.0, shadowCoord ); } else {\n");
  s = s.replace("#elif defined( SHADOWMAP_TYPE_PCF_SOFT )", "}\n#elif defined( SHADOWMAP_TYPE_PCF_SOFT )");
  if (!s.includes("lpPCSS( shadowMap")) console.error("kit: PCSS patch did not apply (three shadow chunk changed?)");
  THREE.ShaderChunk.shadowmap_pars_fragment = s;
};
patchShadowChunk();

/** give a material the shared seed + tap uniforms (keeps its program cache key). `extra` runs after the original
 *  onBeforeCompile. Idempotent. The pipeline calls this on EVERY material of a built set, so builders rarely need it. */
export const seeded = <T extends THREE.Material>(m: T, extra?: (sh: THREE.WebGLProgramParametersWithUniforms, r: THREE.WebGLRenderer) => void): T => {
  const ud = m.userData as { kitSeeded?: boolean };
  if (ud.kitSeeded && !extra) return m;
  const prev = m.onBeforeCompile;
  const key = m.customProgramCacheKey();
  m.onBeforeCompile = function (this: THREE.Material, sh, r) {
    sh.uniforms.lpSeed = KIT_SEED; sh.uniforms.lpTaps = KIT_TAPS;
    prev.call(this, sh, r);
    extra?.(sh, r);
  };
  // the default key is the onBeforeCompile source: keep the ORIGINAL one (+ a tag when `extra` adds code)
  const k2 = extra ? key + "|x:" + extra.toString().length + ":" + hashStr(extra.toString()) : key;
  m.customProgramCacheKey = () => k2;
  ud.kitSeeded = true;
  return m;
};
const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
/** walk an object and seed every material (the pipeline does this after each set build) */
export const seedAll = (root: THREE.Object3D) => {
  let n = 0;
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const x of Array.isArray(m) ? m : [m]) { if (!(x.userData as { kitSeeded?: boolean }).kitSeeded) { seeded(x); n++; } }
  });
  return n;
};

// ================================================================ ACCUMULATION (+ ray-marched sun shafts) + COPY
// Shafts: single scattering through a thin ground haze, `steps` jittered samples to the scene depth (max 34 m), testing
// the real sun shadow map at each step (shafts follow the actual leaf gaps / trunks), Henyey-Greenstein g 0.7.
const ACC_FRAG = /* glsl */ `
uniform sampler2D tIn; uniform sampler2D tDepth; uniform float w; uniform float volOn; uniform float steps;
uniform sampler2D tShadow; uniform mat4 shadowMat; uniform mat4 projInv; uniform mat4 camWorld;
uniform vec3 sunDirW; uniform vec3 sunCol; uniform float density; uniform float seed; uniform float maxDist;
varying vec2 vUv;
float lpUnpack( const in vec4 v ) { return dot( v, vec4( ( 255.0 / 256.0 ) / vec3( 1.0, 256.0, 65536.0 ), 1.0 / 16777216.0 ) ); }
float vIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
float sunVis( vec3 p ) {
  vec4 sc = shadowMat * vec4( p, 1.0 );
  sc.xyz /= sc.w;
  if ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 ) return 1.0;
  return step( sc.z - 0.0015, lpUnpack( textureLod( tShadow, sc.xy, 0.0 ) ) );
}
void main() {
  vec3 col = texture2D( tIn, vUv ).rgb;
  if ( volOn > 0.5 ) {
    float depth = texture2D( tDepth, vUv ).r;
    vec4 vp = projInv * vec4( vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 ); vp /= vp.w;
    float dist = depth >= 0.99999 ? maxDist : min( length( vp.xyz ), maxDist );
    vec3 ro = ( camWorld * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
    vec3 rd = normalize( ( camWorld * vec4( vp.xyz, 0.0 ) ).xyz );
    int N = int( steps );
    float dt = dist / steps, j = vIGN( gl_FragCoord.xy + vec2( 23.0, 71.0 ) * seed ), acc = 0.0;
    for ( int i = 0; i < 64; i ++ ) {
      if ( i >= N ) break;
      vec3 p = ro + rd * ( ( float( i ) + j ) * dt );
      acc += ( 0.25 + smoothstep( 0.3, 2.5, p.y ) * exp( - max( p.y - 2.5, 0.0 ) / 4.0 ) ) * sunVis( p ) * dt;
    }
    float mu = dot( rd, sunDirW ), g = 0.7;
    float hg = ( 1.0 - g * g ) / ( 4.0 * 3.14159 * pow( 1.0 + g * g - 2.0 * g * mu, 1.5 ) );
    col += sunCol * density * acc * hg * 12.566;
  }
  gl_FragColor = vec4( col * w, 1.0 );
}`;
const quadVert = /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4( position.xy, 1.0, 1.0 ); }`;
export class AccumPass extends Pass {
  target: THREE.WebGLRenderTarget; first = true; weight = 1; vol = true;
  readonly mat: THREE.ShaderMaterial;
  constructor(target: THREE.WebGLRenderTarget) {
    super("KitAccumPass");
    this.target = target;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tIn: { value: null }, tDepth: { value: null }, w: { value: 1 }, volOn: { value: 1 }, steps: { value: 32 },
        tShadow: { value: null }, shadowMat: { value: new THREE.Matrix4() }, projInv: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
        sunDirW: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, density: { value: 0.002 }, seed: { value: 0 }, maxDist: { value: 34 } },
      vertexShader: quadVert, fragmentShader: ACC_FRAG,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, depthTest: false, depthWrite: false });
    this.fullscreenMaterial = this.mat;
    this.needsSwap = false;
    this.needsDepthTexture = true;
  }
  setDepthTexture(t: THREE.Texture) { this.mat.uniforms.tDepth.value = t; }
  setVolume(light: THREE.DirectionalLight, cam: THREE.PerspectiveCamera, sunCol: THREE.Color, density: number, seed: number, steps: number) {
    const u = this.mat.uniforms;
    u.tShadow.value = light.shadow.map ? light.shadow.map.texture : null;
    (u.shadowMat.value as THREE.Matrix4).copy(light.shadow.matrix);
    (u.projInv.value as THREE.Matrix4).copy(cam.projectionMatrixInverse);
    (u.camWorld.value as THREE.Matrix4).copy(cam.matrixWorld);
    (u.sunDirW.value as THREE.Vector3).copy(light.position).sub(light.target.position).normalize();
    (u.sunCol.value as THREE.Color).copy(sunCol);
    u.density.value = density; u.seed.value = seed; u.steps.value = steps;
  }
  render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    this.mat.uniforms.tIn.value = inputBuffer.texture;
    this.mat.uniforms.w.value = this.weight;
    this.mat.uniforms.volOn.value = this.vol && this.mat.uniforms.tShadow.value && this.mat.uniforms.density.value > 0 ? 1 : 0;
    renderer.setRenderTarget(this.target);
    if (this.first) { renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); this.first = false; }
    renderer.render(this.scene, this.camera);
  }
}
export class CopyFromPass extends Pass {
  private mat: THREE.ShaderMaterial;
  constructor(tex: THREE.Texture) {
    super("KitCopyFromPass");
    // uGain = the camera's white-balance trim (RigSpec.warmth), on the scene-linear average before bloom + the tone map
    this.mat = new THREE.ShaderMaterial({ uniforms: { tIn: { value: tex }, uGain: { value: new THREE.Vector3(1, 1, 1) } }, vertexShader: quadVert,
      fragmentShader: `uniform sampler2D tIn; uniform vec3 uGain; varying vec2 vUv; void main() { gl_FragColor = vec4( texture2D( tIn, vUv ).rgb * uGain, 1.0 ); }`, depthTest: false, depthWrite: false });
    this.fullscreenMaterial = this.mat;
    this.needsSwap = true;
  }
  /** warmth: + warmer / - cooler (1 = red +7 %, blue -10 %), luminance kept */
  setWarmth(w: number) {
    const r = 1 + 0.07 * w, b = 1 - 0.10 * w, y = 0.2126 * r + 0.7152 + 0.0722 * b;
    (this.mat.uniforms.uGain.value as THREE.Vector3).set(r / y, 1 / y, b / y);
  }
  render(renderer: THREE.WebGLRenderer, _in: THREE.WebGLRenderTarget, outputBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}

// ================================================================ CALM FILMIC GRADE (after AgX, display-referred)
// A gentle S curve, a saturation trim (separate in the shadows), warm highlights / near-neutral shadows, a soft vignette
// and a very fine grain. Pilot golden: sat 1.9, shadowSat 1.35, contrast 0.24, vig 0.2, grain 0.012, expo 1.2.
const gradeFrag = /* glsl */ `
uniform float sat; uniform float shadowSat; uniform float contrast; uniform float vig; uniform float grain; uniform float seed; uniform float expo;
uniform vec3 hiTint; uniform vec3 loTint;
float gH( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void mainImage( const in vec4 inputColor, const in vec2 uv, out vec4 outputColor ) {
  vec3 c = max( inputColor.rgb * expo, 0.0 );
  vec3 d = pow( c, vec3( 1.0 / 2.2 ) );
  vec3 s = d + contrast * ( d - 0.42 ) * ( 1.0 - abs( d - 0.42 ) * 1.6 );
  s = clamp( s, 0.0, 1.0 );
  float ls = dot( s, vec3( 0.2126, 0.7152, 0.0722 ) );
  float satK = mix( shadowSat, sat, smoothstep( 0.08, 0.45, ls ) );
  s = mix( vec3( ls ), s, satK );
  s *= mix( loTint, hiTint, smoothstep( 0.2, 0.85, ls ) );
  vec2 q = uv - 0.5; q.x *= 0.5625 * 1.6;
  s *= 1.0 - vig * smoothstep( 0.25, 0.85, length( q ) );
  s += grain * ( gH( uv * 1920.0 + seed ) - 0.5 ) * ( 0.6 + 0.4 * ( 1.0 - ls ) );
  outputColor = vec4( pow( max( s, 0.0 ), vec3( 2.2 ) ), inputColor.a );
}`;
export type GradeParams = { sat: number; shadowSat: number; contrast: number; vig: number; grain: number; expo: number; hiTint: [number, number, number]; loTint: [number, number, number] };
export class KitGrade extends Effect {
  constructor() {
    super("KitGrade", gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["sat", new THREE.Uniform(1.9)], ["shadowSat", new THREE.Uniform(1.35)], ["contrast", new THREE.Uniform(0.24)], ["vig", new THREE.Uniform(0.2)],
        ["grain", new THREE.Uniform(0.012)], ["seed", new THREE.Uniform(0)], ["expo", new THREE.Uniform(1.2)],
        ["hiTint", new THREE.Uniform(new THREE.Vector3(1.012, 1.0, 0.975))], ["loTint", new THREE.Uniform(new THREE.Vector3(0.985, 1.0, 1.02))],
      ]),
    });
  }
  u(name: string) { return this.uniforms.get(name)!; }
  set(p: GradeParams) {
    this.u("sat").value = p.sat; this.u("shadowSat").value = p.shadowSat; this.u("contrast").value = p.contrast; this.u("vig").value = p.vig;
    this.u("grain").value = p.grain; this.u("expo").value = p.expo;
    (this.u("hiTint").value as THREE.Vector3).set(...p.hiTint); (this.u("loTint").value as THREE.Vector3).set(...p.loTint);
  }
}

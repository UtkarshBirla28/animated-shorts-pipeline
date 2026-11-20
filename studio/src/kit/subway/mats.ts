// KIT / SUBWAY: materials. `paintedSteel()` = gloss-painted steel with procedural chips (paint gone at knee height /
// on arrises, showing red-oxide primer and rust), a grime ring at the base and a screen-space bump at the chip edges;
// `metal()` / `plain()` = cheap PBR with stable program keys; `glass()` = see-through glazing that reflects the local
// environment; `LocalEnv` = a cube capture of the built set (PMREM) used as the envMap of stainless / glass / gloss
// paint, because underground the rig's HDRI sky must not be what the train reflects.
import * as THREE from "three";

type C3 = [number, number, number];
const col = (c: C3 | THREE.ColorRepresentation) => (Array.isArray(c) ? new THREE.Color(c[0], c[1], c[2]) : new THREE.Color(c));

export const plain = (c: C3 | THREE.ColorRepresentation, rough = 0.6, metal = 0, key = "plain", extra: THREE.MeshStandardMaterialParameters = {}) => {
  const m = new THREE.MeshStandardMaterial({ color: col(c), roughness: rough, metalness: metal, ...extra });
  m.customProgramCacheKey = () => "subway:" + key;
  return m;
};
export const metal = (c: C3 | THREE.ColorRepresentation, rough = 0.3, extra: THREE.MeshStandardMaterialParameters = {}) => plain(c, rough, 1, "metal", extra);
export const emissive = (c: C3 | THREE.ColorRepresentation, k = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(k), toneMapped: false, fog: false });
  return m;
};

const NOISE = /* glsl */ `
float psH( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float psN( vec3 x ) { vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( psH( i ), psH( i + vec3( 1, 0, 0 ) ), f.x ), mix( psH( i + vec3( 0, 1, 0 ) ), psH( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( psH( i + vec3( 0, 0, 1 ) ), psH( i + vec3( 1, 0, 1 ) ), f.x ), mix( psH( i + vec3( 0, 1, 1 ) ), psH( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z ); }
float psFbm( vec3 p ) { return 0.55 * psN( p ) + 0.3 * psN( p * 2.13 + 7.1 ) + 0.15 * psN( p * 4.37 + 3.3 ); }
vec3 psBump( vec3 sp, vec3 sn, float h ) {
  vec3 sx = dFdx( sp ), sy = dFdy( sp ), r1 = cross( sy, sn ), r2 = cross( sn, sx ); float det = dot( sx, r1 );
  vec3 g = sign( det ) * ( dFdx( h ) * r1 + dFdy( h ) * r2 ); return normalize( abs( det ) * sn - g ); }
`;

export type PaintOpts = {
  color: C3 | THREE.ColorRepresentation;
  rough?: number;
  /** chips: overall share (0..1), the band (world y relative to baseY) where they concentrate + its boost */
  chips?: number; band?: [number, number]; bandK?: number;
  chipColor?: C3; rust?: number;
  /** base grime: height (m above baseY), strength; general grime noise */
  baseY?: number; grimeH?: number; grime?: number; dirt?: number;
  /** chip noise frequency (1/m) */
  freq?: number;
  seed?: number;
  key: string;
};
/** gloss paint on steel with chips + grime (world-space, pure function of position) */
export const paintedSteel = (o: PaintOpts) => {
  const U = {
    psCol: { value: col(o.color) }, psChip: { value: new THREE.Vector4(o.chips ?? 0.12, o.band?.[0] ?? 0.25, o.band?.[1] ?? 0.95, o.bandK ?? 2.5) },
    psChipC: { value: col(o.chipColor ?? [0.32, 0.12, 0.07]) }, psMisc: { value: new THREE.Vector4(o.baseY ?? 0, o.grimeH ?? 0.22, o.grime ?? 0.7, o.dirt ?? 0.25) },
    psF: { value: new THREE.Vector4(o.freq ?? 22, o.seed ?? 1, o.rust ?? 0.5, o.rough ?? 0.32) },
  };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPsW;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  { vec4 w = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    w = instanceMatrix * w;
  #endif
    vPsW = ( modelMatrix * w ).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vPsW; uniform vec3 psCol; uniform vec4 psChip; uniform vec3 psChipC; uniform vec4 psMisc; uniform vec4 psF;
float psChipM; float psGrime; float psRust;
` + NOISE)
      .replace("#include <color_fragment>", `#include <color_fragment>
  { vec3 p = vPsW * psF.x + psF.y * 13.7; float yr = vPsW.y - psMisc.x;
    float band = smoothstep( psChip.y - 0.15, psChip.y, yr ) * ( 1.0 - smoothstep( psChip.z, psChip.z + 0.25, yr ) );
    float amt = psChip.x * ( 1.0 + psChip.w * band );
    float n = psFbm( p ) + 0.25 * psN( p * 9.0 );
    psChipM = smoothstep( 1.02 - amt * 0.55, 1.05 - amt * 0.55, n );
    psRust = psChipM * smoothstep( 0.4, 0.75, psN( p * 3.1 + 5.0 ) ) * psF.z;
    float gN = psFbm( vPsW * 3.0 + 2.0 );
    psGrime = clamp( ( 1.0 - smoothstep( 0.0, psMisc.y, yr ) ) * psMisc.z + gN * psMisc.w * 0.5, 0.0, 1.0 );
    vec3 c = psCol * ( 0.92 + 0.16 * psN( vPsW * 1.3 ) );
    c = mix( c, mix( psChipC, vec3( 0.26, 0.14, 0.07 ), psRust ), psChipM );
    c = mix( c, c * vec3( 0.32, 0.28, 0.24 ), psGrime );
    diffuseColor.rgb = c; }`)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = mix( mix( psF.w, 0.78, psChipM ), 0.85, psGrime * 0.7 );")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n  normal = psBump( -vViewPosition, normal, psChipM * 0.0012 );");
  };
  m.customProgramCacheKey = () => "subway:paint:" + o.key;
  m.userData.U = U;
  return m;
};

/** see-through glazing that reflects the local env (set `envMap` via LocalEnv.apply) */
export const glass = (tint: C3 = [0.04, 0.045, 0.05], opacity = 0.32, key = "glass") => {
  const m = new THREE.MeshStandardMaterial({ color: col(tint), roughness: 0.04, metalness: 0.0, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide });
  m.customProgramCacheKey = () => "subway:" + key;
  return m;
};

/** a cube capture of the built set from one point, PMREM-filtered, used as envMap by the registered materials. The
 *  PMREM target exists from build time (so the program never changes); `capture()` fills it once (call from the first
 *  update, when the lamps are lit by the live rig). Hidden objects (e.g. the train itself) are left out. */
export class LocalEnv {
  rt: THREE.WebGLCubeRenderTarget; cam: THREE.CubeCamera; pm: THREE.PMREMGenerator; out: THREE.WebGLRenderTarget; done = false; mats: THREE.MeshStandardMaterial[] = [];
  constructor(public gl: THREE.WebGLRenderer, public pos: THREE.Vector3, size = 128) {
    this.rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    this.cam = new THREE.CubeCamera(0.05, 200, this.rt); this.cam.position.copy(pos);
    this.pm = new THREE.PMREMGenerator(gl);
    this.out = this.pm.fromCubemap(this.rt.texture);
  }
  apply(...ms: THREE.Material[]) { for (const m of ms) { const s = m as THREE.MeshStandardMaterial; s.envMap = this.out.texture; this.mats.push(s); } }
  capture(scene: THREE.Scene, hide: THREE.Object3D[] = []) {
    if (this.done) return; this.done = true;
    const vis = hide.map((o) => o.visible); hide.forEach((o) => (o.visible = false));
    // the env-mapped materials see themselves black during the capture (no feedback); the fog is kept
    const envs = this.mats.map((m) => m.envMapIntensity); this.mats.forEach((m) => (m.envMapIntensity = 0));
    const prevRT = this.gl.getRenderTarget();
    this.cam.updateMatrixWorld(true);
    this.cam.update(this.gl, scene);
    this.pm.fromCubemap(this.rt.texture, this.out);
    this.gl.setRenderTarget(prevRT);
    this.mats.forEach((m, i) => (m.envMapIntensity = envs[i]));
    hide.forEach((o, i) => (o.visible = vis[i]));
  }
  dispose() { this.rt.dispose(); this.out.dispose(); this.pm.dispose(); }
}

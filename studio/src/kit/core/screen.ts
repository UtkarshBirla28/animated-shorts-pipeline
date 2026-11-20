// REAL-WORLD KIT screen render-to-texture (K-K1): a second camera renders THIS set (live, or as it was at another scene
// time: a replay) into a texture shown on a phone / monitor screen in the scene, with the phone record UI composited on
// top (the same drawing as the full-frame <RecordUI /> overlay, core/phone_ui.tsx).
//  - once per OUTPUT frame (ctx.onFrame), before the sub-frames; the set's updates run at the screen's scene time first
//    (ctx.renderAt), so a replay shows the characters / wind / trains exactly as they were at that time;
//  - layer mask: objects on LAYER_SCREEN_ONLY appear only on screens (a "recorded copy" of a character posed for the
//    clip), objects on LAYER_MAIN_ONLY only in the main lens (the phone body, the hand holding it); `hide` hides more;
//  - cheap at preview (270 px wide, no MSAA), crisp at final (640 px, 4x MSAA); a simple filmic tone map in the screen
//    shader, then the screen EMITS that image (brightness ~0.9 = bright, readable, not blown under the kit's AgX);
//  - glass: rounded corners, a faint sheen + a procedural thumb smudge.
import * as THREE from "three";
import type { CamState, KitCtx, Quality } from "./ctx";
import { drawRecordUI, type RecordUIOpts } from "./phone_ui";

/** visible ONLY to screen cameras (a recorded copy of a character, a clip-only prop) */
export const LAYER_SCREEN_ONLY = 5;
/** visible ONLY to the main lens (the phone body / its screen, the hand holding the phone) */
export const LAYER_MAIN_ONLY = 6;
const setLayer = (o: THREE.Object3D, l: number) => { o.traverse((c) => c.layers.set(l)); return o; };
export const screenOnly = (o: THREE.Object3D) => setLayer(o, LAYER_SCREEN_ONLY);
export const mainOnly = (o: THREE.Object3D) => setLayer(o, LAYER_MAIN_ONLY);

export type ScreenSpec = {
  /** the glass size in metres (default a phone: 0.068 x 0.148) and the corner radius (m, default 0.008) */
  size?: [number, number];
  corner?: number;
  /** render-target WIDTH in px per quality (height follows the aspect). Default draft 160 / preview 270 / final4 480 / final 640 */
  res?: Partial<Record<Quality, number>>;
  /** the screen camera at FILM time t (e.g. the selfie camera of the clip) */
  cam: (t: number) => CamState;
  /** the scene time the screen shows at film time t (default: live = t). A replay: (t) => clipT0 + (t - shotT0) */
  sceneTime?: (t: number) => number;
  /** when the screen renders (film time); otherwise it holds its last image (dark until the first render) */
  active?: (t: number) => boolean;
  /** objects hidden in the screen render (the screen mesh itself is always hidden) */
  hide?: THREE.Object3D[];
  /** the record UI drawn into the image (false = none) */
  ui?: RecordUIOpts | false;
  /** scene-linear white of the screen (default 1.0) and the screen camera's exposure (default 1.7 x the rig's) */
  brightness?: number;
  exposure?: number;
  /** thumb smudge / sheen amount 0..1 (default 0.35) */
  smudge?: number;
  seed?: number;
};
export type Screen = {
  /** the glass plane (add it to your phone; faces +Z of its parent, centred) */
  mesh: THREE.Mesh;
  rt: THREE.WebGLRenderTarget;
  camera: THREE.PerspectiveCamera;
  /** ms of the last screen render (scene + UI), for the cost log */
  lastMs: () => number;
  dispose: () => void;
};

const RES: Record<Quality, number> = { draft: 160, preview: 270, final4: 480, final: 640 };

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;
const FRAG = /* glsl */ `
uniform sampler2D tScene; uniform sampler2D tUI; uniform float uExpo; uniform float uBright; uniform float uSmudge; uniform float uHas;
uniform vec2 uSize; uniform float uCorner; uniform float uSeed;
varying vec2 vUv;
vec3 filmic( vec3 x ) { x = max( x, 0.0 ); return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }
float h21( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float vn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( h21( i ), h21( i + vec2( 1, 0 ) ), f.x ), mix( h21( i + vec2( 0, 1 ) ), h21( i + vec2( 1, 1 ) ), f.x ), f.y ); }
void main() {
  // rounded rectangle (metres)
  vec2 p = ( vUv - 0.5 ) * uSize, hb = 0.5 * uSize - uCorner, d = abs( p ) - hb;
  if ( length( max( d, 0.0 ) ) - uCorner + min( max( d.x, d.y ), 0.0 ) > 0.0 ) discard;
  vec3 c = filmic( texture2D( tScene, vUv ).rgb * uExpo );
  // the kit's grade re-saturates the whole frame (sat ~1.9 after AgX): pre-desaturate the screen image so it is not doubled
  c = mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, 0.72 );
  c = pow( c, vec3( 2.2 ) ) * uHas;                                                       // display image -> linear
  vec4 ui = texture2D( tUI, vUv );                                                        // sRGB texture: linear here
  c = mix( c, ui.rgb, ui.a );
  // glass: a thumb smudge (an oval of fine streaks low-right) + a faint diagonal sheen
  vec2 q = vUv * vec2( uSize.x / uSize.y, 1.0 );
  float sm = smoothstep( 0.22, 0.0, length( ( vUv - vec2( 0.66, 0.3 ) ) * vec2( 1.0, 1.6 ) ) ) * ( 0.5 + 0.5 * vn( q * 90.0 + uSeed ) ) * ( 0.6 + 0.4 * vn( vec2( q.x * 6.0, q.y * 140.0 ) + uSeed ) );
  float sheen = smoothstep( 0.0, 1.0, 1.0 - abs( vUv.x * 0.7 + vUv.y * 0.5 - 0.75 ) * 3.0 ) * 0.035;
  c = c + vec3( 0.06, 0.06, 0.065 ) * sm * uSmudge + sheen * uSmudge;
  gl_FragColor = vec4( c * uBright, 1.0 );
}`;

/** a screen that shows this set through a second camera. Add `.mesh` to your phone / monitor. */
export const screen = (ctx: KitCtx, spec: ScreenSpec): Screen => {
  const [sw, sh] = spec.size ?? [0.068, 0.148];
  const W = Math.round(spec.res?.[ctx.quality] ?? RES[ctx.quality]), H = Math.round(W * (sh / sw));
  const finalQ = ctx.quality === "final" || ctx.quality === "final4";
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true, samples: finalQ ? 4 : 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  rt.texture.name = "kit-screen";
  const camera = new THREE.PerspectiveCamera(60, sw / sh, 0.03, 2500);
  camera.layers.set(0); camera.layers.enable(LAYER_SCREEN_ONLY);
  // the UI canvas (drawn per frame; only re-uploaded when its text / blink state changes)
  const cv = document.createElement("canvas"); cv.width = Math.min(1024, W * 2); cv.height = Math.round(cv.width * (sh / sw));
  const g = cv.getContext("2d")!;
  const uiTex = new THREE.CanvasTexture(cv); uiTex.colorSpace = THREE.SRGBColorSpace;
  const U = { tScene: { value: rt.texture as THREE.Texture }, tUI: { value: uiTex as THREE.Texture }, uExpo: { value: 1 }, uBright: { value: spec.brightness ?? 1.0 },
    uSmudge: { value: spec.smudge ?? 0.35 }, uHas: { value: 0 }, uSize: { value: new THREE.Vector2(sw, sh) }, uCorner: { value: spec.corner ?? 0.008 }, uSeed: { value: (spec.seed ?? 1) * 17.3 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, fog: false, toneMapped: false });
  mat.customProgramCacheKey = () => "core:screen";
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
  mesh.name = "kit-screen"; mesh.castShadow = false; mesh.receiveShadow = false;
  mainOnly(mesh);
  let uiKey = "", ms = 0, logged = false;
  const drawUI = (t: number) => {
    if (spec.ui === false) { if (uiKey !== "none") { g.clearRect(0, 0, cv.width, cv.height); uiTex.needsUpdate = true; uiKey = "none"; } return; }
    const o = spec.ui ?? {};
    const key = `${typeof o.timer === "function" ? o.timer(t) : o.timer}|${o.blink ? Math.round(t * 10) : 0}|${o.opacity ?? 1}`;
    if (key === uiKey) return;
    uiKey = key;
    g.clearRect(0, 0, cv.width, cv.height);
    drawRecordUI(g, cv.width, cv.height, t, o);
    uiTex.needsUpdate = true;
  };
  const place = (c: CamState) => {
    camera.fov = c.fov; camera.aspect = sw / sh; camera.updateProjectionMatrix();
    camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.lookAt(...c.look); if (c.roll) camera.rotateZ(c.roll);
    camera.updateMatrixWorld();
  };
  ctx.onFrame?.((t) => {
    drawUI(t);
    if (spec.active && !spec.active(t)) return;
    if (!ctx.renderAt) return;
    const t0 = performance.now();
    place(spec.cam(t));
    U.uExpo.value = spec.exposure ?? (ctx.rig.exposure ?? 1) * 1.7;   // a phone's auto-exposure runs brighter than the film's
    ctx.renderAt(spec.sceneTime ? spec.sceneTime(t) : t, camera, rt, { hide: [mesh, ...(spec.hide ?? [])] });
    U.uHas.value = 1;
    ms = performance.now() - t0;
    if (!logged) { logged = true; console.warn(`kit-screen ${W}x${H}${finalQ ? " msaa4" : ""}: ${ms.toFixed(1)} ms (first render, incl. set updates at the screen time)`); }
  });
  if (!ctx.onFrame) console.warn("kit screen: this pipeline has no ctx.onFrame (not CORE's KitFilm?): the screen stays dark");
  return { mesh, rt, camera, lastMs: () => ms, dispose: () => { rt.dispose(); uiTex.dispose(); mat.dispose(); mesh.geometry.dispose(); } };
};

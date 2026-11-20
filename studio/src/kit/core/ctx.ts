// REAL-WORLD KIT: shared types (the contract; see ../KIT_CONTRACT.md). CORE may ADD fields; never rename or remove.
import type * as THREE from "three";

export type V3 = [number, number, number];
export type Quality = "draft" | "preview" | "final4" | "final";

export type PbrSet = {
  map: THREE.Texture;              // sRGB albedo
  normalMap: THREE.Texture;        // linear, OpenGL convention
  arm?: THREE.Texture;             // linear: R = AO, G = roughness, B = metalness (Poly Haven "arm")
  disp?: THREE.Texture;            // linear height (parallax / displacement / joint masks)
  tileM: number;                   // metres one texture repeat covers in the real world
};

export interface AssetLoader {
  /** a texture under studio/public (path relative to public/), cached */
  tex(path: string, opts?: { srgb?: boolean; repeat?: [number, number]; anisotropy?: number }): Promise<THREE.Texture>;
  /** a PBR set from studio/public/kit/surfaces/<name>/ at a resolution (falls back to what exists), cached */
  pbr(name: string, res?: "1k" | "2k" | "4k"): Promise<PbrSet>;
  /** an equirect HDRI from studio/public/kit/hdri/<name>_<res>.hdr, cached */
  hdri(name: string, res?: "1k" | "2k" | "4k"): Promise<THREE.DataTexture>;
  /** a glTF / glb scene (cloned per call; geometry + textures shared), cached */
  gltf(path: string): Promise<THREE.Group>;
}

export type LightRigState = {
  name: string;                    // e.g. "golden", "morning", "overcastWarm", "interiorWarm", "nightPractical", "dusk"
  sunDir: V3;                      // unit vector FROM the scene TOWARD the sun
  sunColor: THREE.Color;
  sunIntensity: number;
  exposure: number;
  hazeDensity: number;             // shafts / fog density
  // ---- CORE additions (2026-11-19; all optional so hand-made test ctx objects still typecheck). The pipeline fills
  // every one of them and MUTATES this object in place when a shot with another rig starts: read them in update().
  /** linear sky irradiance colour x intensity on an up-facing surface (cards: their sky / ambient term) */
  ambient?: THREE.Color;
  /** linear warm bounce off the ground onto a vertical surface (cards: their bounce term); from gi.ts when the probe runs */
  bounce?: THREE.Color;
  /** fog: exponential density (1/m) and colour (linear, already scaled to the sky) */
  fogDensity?: number;
  fogColor?: THREE.Color;
  /** scene.environmentIntensity the rig chose (IBL) */
  envIntensity?: number;
  /** how bright practical lamps read under this rig (1 = interior / night reference; ~0.05 in full sun) */
  practicalK?: number;
  /** true for interiorWarm / nightPractical: practicals are the key light */
  night?: boolean;
  interior?: boolean;
  /** the rig's white balance for lamps (K); rigs.ts `lampColor(K, rig)` gives the colour a lamp of K kelvin shows */
  wbKelvin?: number;
};

/** a lamp that really lights the set (rigs.ts `practical(ctx, spec)`; also `ctx.practical(spec)`) */
export type PracticalSpec = {
  kind: "point" | "spot" | "rect";
  pos: V3;
  /** spot / rect: the point it aims at (default straight down) */
  target?: V3;
  /** colour as a temperature (K, wins over `color`): 1900 candle, 2700 warm bulb, 3200 halogen, 4000 neutral, 5600 day */
  kelvin?: number;
  color?: THREE.ColorRepresentation;
  /** bulb output in lumens (60 W incandescent ~ 800 lm, street lamp ~ 6000 lm, candle ~ 12 lm); scaled by rig.practicalK */
  lumens?: number;
  /** metres where it fades to zero (default: sqrt(lumens) * 0.45, min 4 m) */
  range?: number;
  /** spot: cone half-angle (rad, default 0.75) and penumbra (0..1, default 0.6) */
  angle?: number;
  penumbra?: number;
  /** rect: panel size in metres (a window / softbox / screen; no shadows) */
  size?: [number, number];
  /** soft shadows: spot = one map (cheap), point = 6-face cube (expensive). Max 2 shadowed practicals per set */
  shadow?: boolean;
  /** shadow camera near plane (m, default 0.3): occluders closer to the bulb (the lamp's own housing / lantern glass)
   *  are ignored; otherwise a lamp inside a lantern shadows its whole pool */
  shadowNear?: number;
  /** draw an emissive bulb / panel that blooms (default true for point + spot) */
  bulb?: boolean | { radius?: number };
  /** false = a GLOW-ONLY fixture: the emissive bulb / panel (dimmer, flicker and bloom as usual) but NO scene light, so
   *  it costs nothing in the shaders and does not count in the light budget (core NOTES "Light budget"). Use it for every
   *  fixture of a row and light the row with ONE long `rect` practical. `Practical.light` is then a detached light
   *  (never in the scene; safe to poke) */
  light?: boolean;
  /** 0..1 seeded flicker (candle 0.25, fire 0.45, neon 0.05) */
  flicker?: number;
  seed?: number;
};
export type Practical = {
  light: THREE.PointLight | THREE.SpotLight | THREE.RectAreaLight;
  /** the group to add to your set (light + target + bulb) */
  object: THREE.Object3D;
  bulb?: THREE.Mesh;
  /** 0..1 dimmer (pure function of t: call it from update). 0 is safe and free: the lamp stays a scene light at
   *  intensity 0 (no shader change) and its shadow map is not rendered while it is off. NEVER switch a lamp with
   *  `.visible` (on the light, its group or any parent): that changes the light count = every material recompiles */
  set: (on: number) => void;
  /** per-sub-frame flicker; the pipeline calls it for you when the practical was made with ctx.practical */
  update: (t: number) => void;
};

/** a light rig (rigs.ts RIGS[name]); a shot can override any field with `ShotDef.rigOpts` */
export type RigSpec = {
  name: string;
  /** HDRI file stem under public/kit/hdri/ (e.g. "je_gray_park"), its background res, and whether it is drawn as the sky */
  hdri: string;
  /** the IBL source if not the sky HDRI: another HDRI stem, or a procedural environment "proc:warmDark" (night interiors,
   *  underground), "proc:warmRoom" (interiors by day), "proc:neutral" (rigs.ts PROC_ENVS) */
  env?: string;
  hdriRes?: "1k" | "2k" | "4k";
  envRes?: "1k" | "2k";
  showSky?: boolean;
  /** sun: azimuth (deg, from the default camera's forward -Z toward screen-left -X) and elevation (deg) */
  sunAz: number;
  sunEl: number;
  /** sun colour as a temperature (K) or an sRGB triple, intensity (pilot golden: 7.2), apparent diameter (deg) */
  sunKelvin?: number;
  sunRGB?: [number, number, number];
  sunIntensity: number;
  sunDiamDeg?: number;
  /** mean sky radiance the IBL is normalised to (pilot golden 0.33) and the background / env balance */
  skyLevel: number;
  bgK?: number;
  /** extra rotation of the HDRI about Y (deg) after its sun is aligned with ours */
  hdriRotDeg?: number;
  /** fog density (1/m, pilot 0.0068) and a multiplier on the HDRI's horizon colour */
  fog: number;
  fogTint?: [number, number, number];
  /** shafts: haze density (pilot 0.0012) */
  haze: number;
  /** HDRI clamp (radiance) for the IBL / for the drawn sky (default: 30x / 100x the sky's median); pilot golden 12 / 40 */
  clampEnv?: number;
  clampBg?: number;
  /** linear exposure BEFORE bloom + AgX (golden 1.0; interiors / night go up) */
  exposure: number;
  /** the camera's white-balance trim for the WHOLE picture, before bloom + the tone map: + = warmer (1 = red +7 %,
   *  blue -10 %, same brightness), - = cooler. Default 0 (golden as the pilot). For a front- or side-lit golden shot that
   *  reads like plain daylight try 0.5-1; a backlit hazy shot is warm enough at 0 */
  warmth?: number;
  /** grade (after AgX): display multiplier (pilot 1.2), saturation, shadow saturation, contrast, vignette, grain, tints */
  gradeExpo?: number;
  sat?: number;
  shadowSat?: number;
  contrast?: number;
  vig?: number;
  grain?: number;
  hiTint?: [number, number, number];
  loTint?: [number, number, number];
  /** bloom: intensity, threshold (linear) */
  bloom?: number;
  bloomThreshold?: number;
  /** bounce: probe GI strength (1 = physical) and the cheap ground-bounce fallback albedo */
  gi?: number;
  groundAlbedo?: [number, number, number];
  practicalK?: number;
  night?: boolean;
  interior?: boolean;
  /** the camera's WHITE BALANCE for practical lamps given in kelvin (K): a lamp at this temperature shows neutral
   *  white, a warmer one warm, a cooler one blue-ish, as on a real camera. Without it a 3800 K "warm white" LED strip
   *  is drawn as it looks on a 6500 K daylight camera: orange. Only the HUE moves (the lamp keeps its brightness).
   *  Lamps given as an explicit `color` are never re-balanced */
  wbKelvin?: number;
};

export type KitCtx = {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  quality: Quality;
  assets: AssetLoader;
  sun: THREE.DirectionalLight | null;
  rig: LightRigState;
  seed: number;
  /** the wind clock uniform shared by every wind shader (set by the pipeline per sub-frame) */
  windT: { value: number };
  /** register a per-sub-frame update (the pipeline calls all of them with the sub-frame time) */
  onUpdate: (fn: (t: number, cam: THREE.Camera) => void) => void;
  // ---- CORE additions (optional) ----
  /** the CARD light: a sun twin whose shadow map holds the world but not the characters (pilot `sunCard`). NULL BY DEFAULT
   *  since 2026-11-19 21:00 (Film.cardLight "off": nobody needs it; kit/cards far cards then read ctx.sun's map). Film.cardLight
   *  "map": NOT a scene light; its map (shadow.map / shadow.matrix) is rendered once per output frame. "scene":
   *  a zero-intensity scene light, directionalShadowMap[1] in shaders. Hide a caster from it with core `excludeFromCardShadow` */
  sunCard?: THREE.DirectionalLight | null;
  /** drawing-buffer size in px (540x960 draft / preview, 1080x1920 final) */
  size?: { w: number; h: number };
  fps?: 30;
  /** the set id being built */
  setId?: string;
  /** a practical lamp tied to the live rig (flicker + rig.practicalK handled by the pipeline) */
  practical?: (spec: PracticalSpec) => Practical;
  /** register a once-per-OUTPUT-frame hook (before the sub-frames; t = the frame's time). Screens render here. */
  onFrame?: (fn: (t: number, frame: number) => void) => void;
  /** render THIS set as it is at scene time `tScene` from `cam` into `target` (linear HDR): every set update runs at
   *  tScene first (the following sub-frames run their own updates again, so nothing needs restoring). Uses the screen
   *  layer mask (core/screen.ts LAYER_SCREEN_ONLY visible, LAYER_MAIN_ONLY hidden). For screens / mirrors / replays. */
  renderAt?: (tScene: number, cam: THREE.Camera, target: THREE.WebGLRenderTarget, opts?: { hide?: THREE.Object3D[]; clear?: THREE.Color }) => void;
};

export type Built = {
  object: THREE.Object3D;
  update?: (t: number, cam: THREE.Camera) => void;
  dispose?: () => void;
  /** optional: GPU cost measured by the builder (ms per sub-frame at final quality) */
  costMs?: number;
  // ---- CORE additions (optional) ----
  /** hints for the pipeline: the sun shadow box (centre on the ground + half-size in m, default: fit to each shot's
   *  camera), the GI probe point, the ground albedo for the cheap bounce term */
  hints?: { shadowCenter?: V3; shadowExt?: number; probe?: V3; groundAlbedo?: [number, number, number];
    /** how THIS set adapts every rig it is shown under (merged over the rig, under the shot's own rigOpts). For an
     *  enclosed set under a daylight rig (a cab, a car interior): three's IBL is not blocked by walls, so the outdoor sky
     *  lights the ceiling and the floor from inside; e.g. `{ env: "proc:warmRoom", skyLevel: 0.2 }` */
    rigOpts?: Partial<RigSpec> };
};

export type CamState = { pos: V3; look: V3; fov: number; roll?: number; focus?: number; fnum?: number };

/** one shot of a film: frames [from, to) at 30 fps; sets are built once per `set` id and reused across shots.
 *  `cam(t)` receives FILM time t (seconds since film start), like every update; camera.ts `shotCam` adapts a preset. */
export type ShotDef = {
  id: string;
  from: number;
  to: number;
  set: string;
  rig: string;
  cam: (t: number) => CamState;
  // ---- CORE additions (optional) ----
  /** per-shot rig overrides (e.g. { sunAz: 120 } for a reverse angle) */
  rigOpts?: Partial<RigSpec>;
  /** the sun shadow box for this shot (default: Built.hints, else fit to the camera path) */
  shadow?: { center?: V3; ext?: number };
  /** shutter (fraction of the frame, default 0.5 = 180 deg) */
  shutter?: number;
  /** the GI probe point for this shot (default: Built.hints.probe, else 1.2 m above the shot's mean look point); false = off */
  probe?: V3 | false;
};

export type SetBuilder = (ctx: KitCtx) => Promise<Built>;

/** a whole v3 film: what `studio/src/videos3/<slug>/film.ts` exports as FILM and CORE's <KitFilm film={FILM} /> renders */
export type Film = {
  slug: string;
  fps: 30;
  total: number;                    // frames
  shots: ShotDef[];                 // contiguous, sorted, covering [0, total)
  sets: Record<string, SetBuilder>; // set id -> builder (sets hold their own characters / props / fx as Built children)
  // ---- CORE additions (optional) ----
  /** extra / overriding rigs by name (merged over rigs.ts RIGS) */
  rigs?: Record<string, RigSpec>;
  /** the character-free card light (ctx.sunCard). "off" (DEFAULT since 2026-11-19 21:00) = ctx.sunCard is null: kit/cards
   *  needs no card light (near cards have their own private pass, far cards / crowds read ctx.sun's map). "map" = its
   *  shadow map only, rendered once per output frame, NOT a scene light (measured 2.1-2.5 ms per output frame on the
   *  pointing film's sets at final + ~134 MB of VRAM); "scene" = the pilot's way (a zero-intensity scene light:
   *  directionalShadowMap[1] in every lit shader, a second PCSS lookup on every pixel; only for pilot-style cards) */
  cardLight?: "map" | "scene" | "off";
};

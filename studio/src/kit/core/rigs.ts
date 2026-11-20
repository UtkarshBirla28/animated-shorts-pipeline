// REAL-WORLD KIT light rigs: HDRI sky + IBL, one sun (or moon), haze, exposure and grade per time of day, plus the
// practical-light API (lamps that really light the set). `golden` is the look pilot's warm bright late-afternoon look
// (the owner's pick) and the default. All HDRIs CC0 Poly Haven (public/kit/LICENSES.md).
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { LightRigState, Practical, PracticalSpec, Quality, RigSpec, V3 } from "./ctx";

const TAU = Math.PI * 2;
/** sRGB triple (0..1) -> linear Color */
export const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

/** colour temperature (K) -> LINEAR colour, max channel 1 (Tanner Helland fit, 1000-40000 K) */
export const kelvin = (K: number) => {
  const t = Math.max(1000, Math.min(40000, K)) / 100;
  let r: number, g: number, b: number;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); b = 255; }
  const c = srgb(Math.min(255, Math.max(0, r)) / 255, Math.min(255, Math.max(0, g)) / 255, Math.min(255, Math.max(0, b)) / 255);
  const m = Math.max(c.r, c.g, c.b) || 1;
  return c.multiplyScalar(1 / m);
};

// ================================================================ THE RIGS
// sunAz: degrees from the default camera's forward (-Z) toward screen-left (-X); sunEl: degrees above the horizon.
export const RIGS: Record<string, RigSpec> = {
  /** the pilot look: warm low sun behind-left of the subject, warm glow / shafts, calm grade (owner's pick) */
  golden: { name: "golden", hdri: "je_gray_park", hdriRes: "4k", envRes: "2k", showSky: true, clampEnv: 12, clampBg: 40,
    sunAz: 48, sunEl: 28, sunRGB: [1.0, 0.86, 0.69], sunIntensity: 7.2, sunDiamDeg: 0.62, skyLevel: 0.33, bgK: 1.05,
    fog: 0.0068, haze: 0.0012, exposure: 1.0, gradeExpo: 1.2, sat: 1.9, shadowSat: 1.35, contrast: 0.24, vig: 0.2, grain: 0.012,
    hiTint: [1.012, 1.0, 0.975], loTint: [0.985, 1.0, 1.02], bloom: 0.42, bloomThreshold: 1.05, gi: 1.5, groundAlbedo: [0.34, 0.24, 0.18], practicalK: 0.006, wbKelvin: 4500 },
  /** fresh morning: cooler, higher-key sky, a lower whiter sun, a little mist */
  morning: { name: "morning", hdri: "rustig_koppie_puresky", hdriRes: "2k", envRes: "2k", showSky: true,
    sunAz: 62, sunEl: 20, sunKelvin: 4600, sunIntensity: 6.6, sunDiamDeg: 0.62, skyLevel: 0.40, bgK: 1.0,
    fog: 0.0058, fogTint: [1.0, 1.0, 1.04], haze: 0.0016, exposure: 1.0, gradeExpo: 1.15, sat: 1.75, shadowSat: 1.3, contrast: 0.22, vig: 0.18, grain: 0.012,
    hiTint: [1.008, 1.0, 0.985], loTint: [0.98, 1.0, 1.03], bloom: 0.36, bloomThreshold: 1.1, gi: 1.0, groundAlbedo: [0.3, 0.26, 0.22], practicalK: 0.006, wbKelvin: 5000 },
  /** high noon: short hard shadows, bright neutral light, little haze */
  noon: { name: "noon", hdri: "kloofendal_43d_clear_puresky", hdriRes: "2k", envRes: "2k", showSky: true,
    sunAz: 25, sunEl: 64, sunKelvin: 5600, sunIntensity: 8.0, sunDiamDeg: 0.55, skyLevel: 0.42, bgK: 0.95,
    fog: 0.004, haze: 0.0005, exposure: 0.92, gradeExpo: 1.1, sat: 1.6, shadowSat: 1.25, contrast: 0.2, vig: 0.15, grain: 0.01,
    hiTint: [1.005, 1.0, 0.99], loTint: [0.99, 1.0, 1.015], bloom: 0.3, bloomThreshold: 1.2, gi: 1.0, groundAlbedo: [0.32, 0.27, 0.22], practicalK: 0.004, wbKelvin: 5200 },
  /** soft warm overcast: a weak, very wide sun (soft shadows), a bright sky does most of the lighting */
  overcastWarm: { name: "overcastWarm", hdri: "overcast_soil_puresky", hdriRes: "2k", envRes: "2k", showSky: true,
    sunAz: 48, sunEl: 38, sunKelvin: 4700, sunIntensity: 1.5, sunDiamDeg: 7.0, skyLevel: 0.85, bgK: 0.9,
    fog: 0.0095, fogTint: [1.02, 1.0, 0.97], haze: 0.0003, exposure: 1.05, gradeExpo: 1.2, sat: 1.8, shadowSat: 1.35, contrast: 0.26, vig: 0.2, grain: 0.012,
    hiTint: [1.02, 1.0, 0.965], loTint: [0.99, 1.0, 1.01], bloom: 0.28, bloomThreshold: 1.2, gi: 1.0, groundAlbedo: [0.3, 0.26, 0.22], practicalK: 0.02, wbKelvin: 4800 },
  /** dusk: the sun on the horizon, deep orange, long shadows, a dimmer violet sky, lamps start to matter */
  dusk: { name: "dusk", hdri: "qwantani_dusk_2_puresky", hdriRes: "2k", envRes: "2k", showSky: true,
    sunAz: 55, sunEl: 7, sunKelvin: 2500, sunIntensity: 4.6, sunDiamDeg: 0.7, skyLevel: 0.17, bgK: 1.0,
    fog: 0.0075, fogTint: [1.05, 0.96, 0.92], haze: 0.0022, exposure: 1.35, gradeExpo: 1.2, sat: 1.8, shadowSat: 1.3, contrast: 0.25, vig: 0.24, grain: 0.013,
    hiTint: [1.03, 0.99, 0.94], loTint: [0.97, 0.99, 1.05], bloom: 0.5, bloomThreshold: 1.0, gi: 1.0, groundAlbedo: [0.32, 0.24, 0.18], practicalK: 0.12, wbKelvin: 4000 },
  /** warm interior by day: sun through the windows, a low IBL fill (IBL is not occluded by walls), lamps on, strong bounce.
   *  Round 3 (it read too orange): the sun 3900 -> 4600 K, a nearly neutral room fill, golden's highlight tint, lamps
   *  white-balanced at 4500 K like golden (a 4000 K ceiling panel is warm white, not orange) */
  interiorWarm: { name: "interiorWarm", hdri: "je_gray_park", env: "proc:warmRoom", hdriRes: "2k", envRes: "2k", showSky: true, clampEnv: 12, clampBg: 40,
    sunAz: 58, sunEl: 26, sunKelvin: 4600, sunIntensity: 7.2, sunDiamDeg: 0.62, skyLevel: 0.09, bgK: 4.5,
    fog: 0.0, haze: 0.0028, exposure: 2.4, gradeExpo: 1.2, sat: 1.7, shadowSat: 1.3, contrast: 0.24, vig: 0.24, grain: 0.013,
    hiTint: [1.012, 1.0, 0.975], loTint: [0.985, 1.0, 1.02], bloom: 0.5, bloomThreshold: 1.1, gi: 2.0, groundAlbedo: [0.36, 0.28, 0.22], practicalK: 1.0, interior: true, wbKelvin: 4500 },
  /** night: a cool moon, a starry sky, practical lamps are the key light (warm pools), blue shadows.
   *  Round 3 (too dark away from the lamps, lamps too orange): fill 0.05 -> 0.08, moon 0.3 -> 0.45, a less orange dark
   *  fill, lamps white-balanced at 3800 K (a 2700 K bulb is amber, not deep orange) */
  nightPractical: { name: "nightPractical", hdri: "kloppenheim_02_puresky", env: "proc:warmDark", hdriRes: "2k", envRes: "2k", showSky: true,
    sunAz: 120, sunEl: 34, sunRGB: [0.7, 0.78, 1.0], sunIntensity: 0.45, sunDiamDeg: 0.55, skyLevel: 0.08, bgK: 0.62,
    fog: 0.009, fogTint: [0.85, 0.92, 1.15], haze: 0.0, exposure: 3.0, gradeExpo: 1.15, sat: 1.5, shadowSat: 1.2, contrast: 0.22, vig: 0.28, grain: 0.016,
    hiTint: [1.02, 1.0, 0.965], loTint: [0.95, 1.0, 1.09], bloom: 0.62, bloomThreshold: 0.9, gi: 1.0, groundAlbedo: [0.3, 0.26, 0.24], practicalK: 0.5, night: true, wbKelvin: 3800 },
  /** underground / windowless at night: NO sun or moon (no sun shadow pass), no sky, a warm low fill, practicals are
   *  the only key (the NY station, the tunnel, a windowless corridor). Never green fluorescent. */
  undergroundWarm: { name: "undergroundWarm", hdri: "kloppenheim_02_puresky", env: "proc:warmDark", hdriRes: "2k", envRes: "2k", showSky: false,
    sunAz: 120, sunEl: 60, sunRGB: [1, 0.9, 0.8], sunIntensity: 0, sunDiamDeg: 0.6, skyLevel: 0.06, bgK: 1.0,
    fog: 0.011, fogTint: [1.0, 0.9, 0.78], haze: 0.0, exposure: 2.8, gradeExpo: 1.15, sat: 1.55, shadowSat: 1.2, contrast: 0.22, vig: 0.26, grain: 0.015,
    hiTint: [1.03, 1.0, 0.95], loTint: [0.99, 0.99, 1.02], bloom: 0.6, bloomThreshold: 0.9, gi: 1.5, groundAlbedo: [0.3, 0.26, 0.22], practicalK: 0.6, night: true, interior: true, wbKelvin: 3600 },
};
export const DEFAULT_RIG = "golden";

// ================================================================ procedural environments (rig.env = "proc:<name>")
// A vertical gradient (zenith / horizon / ground, linear) as a small float equirect: the IBL of interiors and nights
// (three's IBL is NOT occluded by walls, so an outdoor sky lights a closed room blue; a warm room / city-glow environment
// is the right fill). Absolute level does not matter: the rig's skyLevel normalises it.
export const PROC_ENVS: Record<string, { zenith: [number, number, number]; horizon: [number, number, number]; ground: [number, number, number] }> = {
  // round 3: both were orange (red / blue up to 1.8 for the room, 2.3 for the dark); now 1.1-1.5 and 1.45-1.65
  warmDark: { zenith: [0.09, 0.075, 0.062], horizon: [0.28, 0.225, 0.17], ground: [0.115, 0.092, 0.075] },
  warmRoom: { zenith: [0.86, 0.83, 0.78], horizon: [0.78, 0.70, 0.60], ground: [0.42, 0.35, 0.28] },
  // a daylit interior with big windows (a train car, a cab) under a DAYLIGHT rig: near neutral, a touch warm. Use it from
  // the set: Built.hints.rigOpts = { env: "proc:dayRoom" } (the outdoor HDRI is not blocked by the roof or the floor: its
  // green-brown ground half painted the car's white ceiling mustard)
  dayRoom: { zenith: [0.90, 0.88, 0.84], horizon: [0.84, 0.80, 0.74], ground: [0.52, 0.48, 0.44] },
  neutral: { zenith: [0.8, 0.8, 0.8], horizon: [0.7, 0.7, 0.7], ground: [0.4, 0.4, 0.4] },
};
const procCache = new Map<string, THREE.DataTexture>();
/** a procedural environment texture ("proc:warmDark" | "proc:warmRoom" | "proc:neutral"), cached */
export const envTexture = (name: string): THREE.DataTexture => {
  const key = name.replace(/^proc:/, "");
  let t = procCache.get(key);
  if (t) return t;
  const P = PROC_ENVS[key] ?? PROC_ENVS.neutral;
  const W = 64, H = 32, d = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const el = Math.PI / 2 - (Math.PI * (y + 0.5)) / H, sn = Math.sin(el);   // row 0 = zenith (flipY, like the HDR loader)
    const c = sn >= 0 ? P.horizon.map((h, i) => h + (P.zenith[i] - h) * Math.pow(sn, 0.6)) : P.horizon.map((h, i) => h + (P.ground[i] - h) * Math.pow(-sn, 0.4));
    for (let x = 0; x < W; x++) d.set([c[0], c[1], c[2], 1], (y * W + x) * 4);
  }
  t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
  t.mapping = THREE.EquirectangularReflectionMapping; t.flipY = true; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.colorSpace = THREE.LinearSRGBColorSpace; t.name = `proc:${key}`; t.needsUpdate = true;
  procCache.set(key, t);
  return t;
};

/** a rig by name (film.rigs override RIGS), with the shot's overrides merged on top */
export const resolveRig = (name: string, filmRigs?: Record<string, RigSpec>, opts?: Partial<RigSpec>, setOpts?: Partial<RigSpec>): RigSpec => {
  const base = filmRigs?.[name] ?? RIGS[name];
  if (!base) { console.error(`kit rigs: unknown rig "${name}", using golden`); }
  // order: the rig, then the SET's own adaptation (Built.hints.rigOpts), then the shot's rigOpts (the shot wins)
  return { ...(base ?? RIGS[DEFAULT_RIG]), ...(setOpts ?? {}), ...(opts ?? {}) };
};
const lumaOf = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
/** the LINEAR colour a lamp of `K` kelvin shows under a rig's white balance (`rig.wbKelvin`; none = the physical colour
 *  on a 6500 K camera, as `kelvin(K)`). Same luminance as kelvin(K): the white balance moves the hue, not the brightness.
 *  practical() uses it; use it for your own emissive fixtures so they match the light they give. */
export const lampColor = (K: number, rig?: { wbKelvin?: number } | null, out = new THREE.Color()): THREE.Color => {
  const c = kelvin(K), wb = rig?.wbKelvin;
  if (!wb) return out.copy(c);
  const w = kelvin(wb), y0 = lumaOf(c);
  out.setRGB(c.r / w.r, c.g / w.g, c.b / w.b);
  return out.multiplyScalar(y0 / Math.max(lumaOf(out), 1e-6));
};
/** unit vector toward the sun of a rig */
export const sunDirOf = (r: Pick<RigSpec, "sunAz" | "sunEl">): V3 => {
  const a = (r.sunAz * Math.PI) / 180, e = (r.sunEl * Math.PI) / 180;
  return [-Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)];
};
export const sunColorOf = (r: RigSpec) => (r.sunRGB ? srgb(...r.sunRGB) : kelvin(r.sunKelvin ?? 5000));

// ================================================================ HDRI analysis (sun azimuth, sky level, horizon)
export type SkyInfo = { sunAz: number; meanSky: number; horizon: THREE.Color; skyCol: THREE.Color; median: number };
const skyInfo = new WeakMap<THREE.DataTexture, SkyInfo>();
/** scan an equirect float HDRI once: find its sun (brightest texel), clamp the radiance to `clampTo` (default 30x the
 *  upper-hemisphere median) IN PLACE (the real sun is our directional light), measure the cosine-weighted mean sky, the
 *  horizon colour (haze) and the mean sky colour (cards' ambient) */
export const scanSky = (t: THREE.DataTexture, clampTo?: number, clampK = 30): SkyInfo => {
  const have = skyInfo.get(t);
  if (have) return have;
  const { width: W, height: H } = t.image as { width: number; height: number };
  const d = (t.image as unknown as { data: Float32Array }).data;
  const lum = (i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  // pass 1: brightest texel + a log histogram of the upper hemisphere (median)
  let best = 0, bi = 0;
  const bins = new Float64Array(256); let bn = 0;
  for (let y = 0; y < H / 2; y++) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4, l = lum(i);
    if (l > best) { best = l; bi = y * W + x; }
    const b = Math.max(0, Math.min(255, Math.round((Math.log2(Math.max(l, 1e-6)) + 20) * 6)));
    bins[b]++; bn++;
  }
  let acc = 0, mb = 0;
  for (let b = 0; b < 256; b++) { acc += bins[b]; if (acc >= bn / 2) { mb = b; break; } }
  const median = Math.pow(2, mb / 6 - 20);
  const cl = clampTo ?? median * clampK;
  // pass 2: clamp + cosine-weighted mean + horizon + sky colour
  let sum = 0, n = 0, hn = 0; const hz = [0, 0, 0], sc = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, l = lum(i);
    if (l > cl) { const k = cl / l; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
    const v = 1 - (y + 0.5) / H;                        // flipY: data row 0 = top of the sky
    if (v > 0.5) {
      const w = Math.cos((v - 0.5) * Math.PI);
      sum += lum(i) * w; n += w;
      sc[0] += d[i] * w; sc[1] += d[i + 1] * w; sc[2] += d[i + 2] * w;
    }
    if (v > 0.51 && v < 0.54) { hz[0] += d[i]; hz[1] += d[i + 1]; hz[2] += d[i + 2]; hn++; }
  }
  t.needsUpdate = true;
  const u = ((bi % W) + 0.5) / W;
  const skyCol = new THREE.Color(sc[0], sc[1], sc[2]);
  const sl = 0.2126 * skyCol.r + 0.7152 * skyCol.g + 0.0722 * skyCol.b || 1;
  skyCol.multiplyScalar(1 / sl);
  const info: SkyInfo = { sunAz: (u - 0.5) * TAU, meanSky: sum / Math.max(n, 1e-6), horizon: new THREE.Color(hz[0] / hn, hz[1] / hn, hz[2] / hn), skyCol, median };
  skyInfo.set(t, info);
  return info;
};

/** PMREM environment per HDRI texture (cached) */
const pmremCache = new WeakMap<THREE.Texture, THREE.Texture>();
export const pmremOf = (gl: THREE.WebGLRenderer, t: THREE.DataTexture) => {
  let e = pmremCache.get(t);
  if (!e) { const pm = new THREE.PMREMGenerator(gl); e = pm.fromEquirectangular(t).texture; pm.dispose(); pmremCache.set(t, e); }
  return e;
};

/** the live state the pipeline writes into ctx.rig for a resolved rig (sun dir / colour / levels; ambient from the sky) */
export const fillRigState = (st: LightRigState, r: RigSpec, sky: SkyInfo | null, fogSky?: SkyInfo | null) => {
  st.name = r.name;
  st.sunDir = sunDirOf(r);
  st.sunColor = (st.sunColor ?? new THREE.Color()).copy(sunColorOf(r));
  st.sunIntensity = r.sunIntensity;
  st.exposure = r.exposure;
  st.hazeDensity = r.haze;
  st.fogDensity = r.fog;
  const envK = sky ? r.skyLevel / Math.max(sky.meanSky, 1e-4) : 1;
  st.envIntensity = envK;
  // the haze takes the colour of `sky` (the IBL source), or of `fogSky` when the caller passes one (a daylight rig whose
  // IBL was swapped for a room fill still has the DRAWN sky's haze outside the windows)
  const fs = fogSky ?? sky, fogK = fogSky ? r.skyLevel / Math.max(fogSky.meanSky, 1e-4) : envK;
  st.fogColor = (st.fogColor ?? new THREE.Color()).copy(fs ? fs.horizon : new THREE.Color(0.6, 0.65, 0.7)).multiplyScalar(fogK);
  if (r.fogTint) st.fogColor.multiply(new THREE.Color(...r.fogTint));
  st.ambient = (st.ambient ?? new THREE.Color()).copy(sky ? sky.skyCol : new THREE.Color(0.9, 1, 1.15)).multiplyScalar(r.skyLevel * 0.8);
  // until the GI probe runs: the cheap ground bounce (ground albedo x sun on the ground x 1/2 for a vertical surface)
  const g = r.groundAlbedo ?? [0.3, 0.25, 0.2];
  const e = Math.max(0, Math.sin((r.sunEl * Math.PI) / 180)) * r.sunIntensity * 0.5;
  st.bounce = (st.bounce ?? new THREE.Color()).setRGB(g[0], g[1], g[2]).multiply(st.sunColor).multiplyScalar(e * 0.5 + r.skyLevel * 0.3);
  st.practicalK = r.practicalK ?? 0.01;
  st.night = !!r.night; st.interior = !!r.interior;
  st.wbKelvin = r.wbKelvin;
  return st;
};

// ================================================================ PRACTICAL LIGHTS
/** scene units per candela at practicalK 1: a 800 lm bulb (64 cd) gives 0.25 at 2 m, ~ golden's sky fill on the ground */
export const PRACTICAL_UNIT = 0.0156;
let rectInit = false;
const flick = (t: number, seed: number, amt: number) => {
  if (!amt) return 1;
  const s = seed * 12.9898;
  const n = 0.5 * Math.sin(t * 7.3 + s) + 0.3 * Math.sin(t * 13.7 + s * 2.1) + 0.2 * Math.sin(t * 23.9 + s * 3.7) + 0.15 * Math.sin(t * 41.3 + s * 5.3);
  return Math.max(0.2, 1 + amt * n * 0.8);
};
/** a lamp that really lights the set. `rig` is read live on every update (so a set reused under another rig adapts).
 *  quality picks the shadow map size. Point shadows cost a 6-face cube per sub-frame: use spots for cheap soft shadows. */
export const practical = (rig: LightRigState, spec: PracticalSpec, quality: Quality = "final"): Practical => {
  // the lamp colour: a kelvin lamp is re-balanced LIVE to the rig's white balance (a set is reused under several rigs);
  // an explicit colour is taken as it is
  const col = spec.kelvin ? lampColor(spec.kelvin, rig) : new THREE.Color(spec.color ?? 0xffd9a8);
  let wbNow: number | undefined = spec.kelvin ? rig.wbKelvin : undefined;
  const lm = spec.lumens ?? 800;
  const range = spec.range ?? Math.max(4, Math.sqrt(lm) * 0.45);
  const g = new THREE.Group(); g.name = `practical:${spec.kind}`;
  const tgt = new THREE.Vector3(...(spec.target ?? [spec.pos[0], 0, spec.pos[2]]));
  let light: THREE.PointLight | THREE.SpotLight | THREE.RectAreaLight;
  let cd = lm / (4 * Math.PI);
  const big = quality === "final" || quality === "final4";
  if (spec.kind === "spot") {
    const ang = spec.angle ?? 0.75;
    cd = lm / (TAU * (1 - Math.cos(ang)));
    const s = new THREE.SpotLight(col, 0, range, ang, spec.penumbra ?? 0.6, 2);
    s.position.set(...spec.pos); s.target.position.copy(tgt); g.add(s.target);
    if (spec.shadow) {
      s.castShadow = true; s.shadow.mapSize.set(big ? 1024 : 512, big ? 1024 : 512); s.shadow.radius = 4;
      s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; s.shadow.camera.near = spec.shadowNear ?? 0.3; s.shadow.camera.far = range;
    }
    light = s;
  } else if (spec.kind === "rect") {
    if (!rectInit) { RectAreaLightUniformsLib.init(); rectInit = true; }
    const [w, h] = spec.size ?? [1, 1];
    cd = lm / (Math.PI * w * h);                                   // luminance (nits) of the panel
    const r = new THREE.RectAreaLight(col, 0, w, h);
    r.position.set(...spec.pos); r.lookAt(tgt);
    light = r;
  } else {
    const p = new THREE.PointLight(col, 0, range, 2);
    p.position.set(...spec.pos);
    if (spec.shadow) {
      p.castShadow = true; p.shadow.mapSize.set(big ? 512 : 256, big ? 512 : 256); p.shadow.radius = 3;
      p.shadow.bias = -0.002; p.shadow.normalBias = 0.02; p.shadow.camera.near = spec.shadowNear ?? 0.3; p.shadow.camera.far = range;
    }
    light = p;
  }
  light.name = "practical";
  // spec.light === false: a glow-only fixture (bulb / panel only). The light object is still returned (detached, never
  // rendered) so code that pokes `.light.color` keeps working.
  const real = spec.light !== false;
  if (real) g.add(light); else { light.castShadow = false; g.name += ":glow"; }
  // the emissive bulb / panel (HDR: blooms)
  let bulb: THREE.Mesh | undefined;
  const bulbMat = new THREE.MeshBasicMaterial({ color: col.clone(), toneMapped: false, fog: false });
  if (spec.bulb !== false) {
    if (spec.kind === "rect") {
      const [w, h] = spec.size ?? [1, 1];
      bulb = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bulbMat);
      bulb.position.copy(light.position); bulb.lookAt(tgt);
    } else {
      const rad = (typeof spec.bulb === "object" && spec.bulb.radius) || 0.035;
      bulb = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 8), bulbMat);
      bulb.position.set(...spec.pos);
    }
    bulb.castShadow = false; bulb.receiveShadow = false; bulb.name = "practical-bulb";
    g.add(bulb);
  }
  let on = 1;
  const update = (t: number) => {
    if (spec.kelvin && rig.wbKelvin !== wbNow) { wbNow = rig.wbKelvin; lampColor(spec.kelvin, rig, col); light.color.copy(col); }   // only when the rig changes
    const k = (rig.practicalK ?? 0.01) * on * flick(t, spec.seed ?? 1, spec.flicker ?? 0);
    const lit = k > 1e-5;
    // An OFF lamp stays a visible scene light at intensity 0. NEVER hide it: three builds every lit program for the
    // exact number of lights of each kind, so a light that appears / disappears makes every material of the set compile
    // a new program (60-120 s stalls measured by HOME_LAB). Intensity is only a uniform.
    light.intensity = lit ? cd * PRACTICAL_UNIT * k : 0;
    // ...and while it is off its shadow map is not re-rendered (a point lamp = 6 faces per sub-frame). The flag is only
    // read by three's shadow pass (no program change); the map is rendered again in the same frame the lamp comes back.
    if (light.castShadow && light.shadow) (light.shadow as THREE.LightShadow).autoUpdate = lit;
    // the bulb's own glow: bright enough to bloom when the lamp is on, readable (dim warm) when it is off
    if (bulb) bulbMat.color.copy(col).multiplyScalar(on > 0.01 ? 0.6 + 6 * Math.min(1, k * 2) * on : 0.25);
  };
  update(0);
  return { light, object: g, bulb, set: (k: number) => { on = Math.max(0, k); }, update };
};

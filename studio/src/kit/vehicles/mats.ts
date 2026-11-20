// kit/vehicles (TRAIN owner): materials. Procedural tileable maps (computed once per page, cached): brushed stainless,
// orange-peel paint, fabric weave, ribbed rubber, plus a "dirt-aware" MeshStandardMaterial (per-vertex aDirt darkens /
// roughens / de-metals: grime near the bogies, scuffs at the bottoms) and the vehicle glass (full-strength PBR
// reflection over ~90 % transmission: blend ONE / ONE_MINUS_SRC_ALPHA, with smudge / fog maps). Every patched material
// sets its own customProgramCacheKey ("vehicles:*"). UVs are metres (geo.ts), so `tile` = metres per map repeat.
import * as THREE from "three";
import type { KitCtx } from "../core/ctx";
import { pmremOf } from "../core/rigs";
import { rng } from "./geo";

type MapSet = { nor: THREE.DataTexture; rough: THREE.DataTexture };
const cache = new Map<string, MapSet>();

/** a tileable height field -> normal map (RG = xy, B = z) + a roughness field */
const fieldToMaps = (W: number, H: number, h: Float32Array, rough: Float32Array, k: number): MapSet => {
  const nor = new Uint8Array(W * H * 4), ro = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const dx = h[y * W + ((x + 1) % W)] - h[y * W + ((x - 1 + W) % W)];
    const dy = h[((y + 1) % H) * W + x] - h[((y - 1 + H) % H) * W + x];
    let nx = -dx * k, ny = -dy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    nor[i * 4] = (nx * 0.5 + 0.5) * 255; nor[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; nor[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; nor[i * 4 + 3] = 255;
    const r = Math.max(0, Math.min(1, rough[i])) * 255; ro[i * 4] = 255; ro[i * 4 + 1] = r; ro[i * 4 + 2] = 0; ro[i * 4 + 3] = 255;
  }
  const mk = (d: Uint8Array) => {
    const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8;
    t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
  };
  return { nor: mk(nor), rough: mk(ro) };
};
/** smooth tileable value noise on a W x H grid with `cells` cells */
const tnoise = (W: number, H: number, cx: number, cy: number, R: () => number) => {
  const g = new Float32Array(cx * cy).map(() => R());
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = (x / W) * cx, fy = (y / H) * cy, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g[(iy % cy) * cx + (ix % cx)], b = g[(iy % cy) * cx + ((ix + 1) % cx)], c = g[((iy + 1) % cy) * cx + (ix % cx)], d = g[((iy + 1) % cy) * cx + ((ix + 1) % cx)];
    out[y * W + x] = (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  }
  return out;
};
export type MapKind = "brush" | "peel" | "weave" | "ribs" | "satin" | "none";
/** the procedural normal + roughness maps of one kind (cached) */
export const vmaps = (kind: Exclude<MapKind, "none">): MapSet => {
  const have = cache.get(kind); if (have) return have;
  const R = rng(kind.length * 977 + 13);
  let out: MapSet;
  if (kind === "brush") {
    // brushed stainless: fine streaks along U (the car's length), a few longer scratches, roughness streaky 0.22..0.42
    const W = 1024, H = 256, h = new Float32Array(W * H), ro = new Float32Array(W * H);
    const rows = new Float32Array(H).map(() => R() - 0.5), rows2 = new Float32Array(H).map(() => R() - 0.5);
    const lo = tnoise(W, H, 8, 4, R);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, mod = 0.6 + 0.4 * Math.sin((x / W) * Math.PI * 2 * 3 + rows2[y] * 6);
      h[i] = rows[y] * 0.6 * mod + rows2[(y + 3) % H] * 0.25;
      ro[i] = 0.3 + rows[y] * 0.04 + (lo[i] - 0.5) * 0.07;
    }
    for (let s = 0; s < 40; s++) { const y = (R() * H) | 0, x0 = (R() * W) | 0, L = (60 + R() * 300) | 0; for (let x = 0; x < L; x++) { const i = y * W + ((x0 + x) % W); h[i] -= 0.8; ro[i] += 0.05; } }
    out = fieldToMaps(W, H, h, ro, 0.9);
  } else if (kind === "peel") {
    // orange-peel paint: soft bumps ~2-4 mm at a 0.25 m tile, roughness 0.4..0.5
    const W = 512, H = 512, a = tnoise(W, H, 64, 64, R), b = tnoise(W, H, 23, 23, R), h = new Float32Array(W * H), ro = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { h[i] = a[i] * 0.7 + b[i] * 0.3; ro[i] = 0.42 + (b[i] - 0.5) * 0.12; }
    out = fieldToMaps(W, H, h, ro, 2.2);
  } else if (kind === "weave") {
    // moquette pile: a fine twill + fuzz (tile 0.05 m), rough 0.9
    const W = 256, H = 256, f = tnoise(W, H, 64, 64, R), h = new Float32Array(W * H), ro = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, tw = Math.sin(((x + y) / W) * Math.PI * 2 * 32) * 0.5 + 0.5;
      h[i] = tw * 0.5 + f[i] * 0.6; ro[i] = 0.88 + (f[i] - 0.5) * 0.1;
    }
    out = fieldToMaps(W, H, h, ro, 3.0);
  } else if (kind === "satin") {
    // satin laminate / moulded plastic: a very fine grain (tile 0.2 m), roughness 0.38..0.48, almost flat
    const W = 256, H = 256, a = tnoise(W, H, 128, 128, R), b = tnoise(W, H, 9, 9, R), h = new Float32Array(W * H), ro = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { h[i] = a[i] * 0.5 + b[i] * 0.5; ro[i] = 0.42 + (a[i] - 0.5) * 0.06 + (b[i] - 0.5) * 0.08; }
    out = fieldToMaps(W, H, h, ro, 0.8);
  } else {
    // ribbed rubber mat / step plate: ribs along U every 1/16 of the tile
    const W = 256, H = 256, f = tnoise(W, H, 32, 32, R), h = new Float32Array(W * H), ro = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, r = Math.abs(Math.sin((y / H) * Math.PI * 16));
      h[i] = Math.pow(r, 0.4) + f[i] * 0.15; ro[i] = 0.75 + (f[i] - 0.5) * 0.15 - r * 0.08;
    }
    out = fieldToMaps(W, H, h, ro, 4.0);
  }
  cache.set(kind, out);
  return out;
};

export type VMatOpts = {
  color: THREE.ColorRepresentation;
  rough: number;
  metal?: number;
  map?: MapKind;
  /** metres per map repeat (UVs are metres) */
  tile?: number;
  normalScale?: number;
  /** what aDirt = 1 turns the surface into (sRGB colour, roughness) */
  dirtColor?: THREE.ColorRepresentation;
  dirtRough?: number;
  env?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  side?: THREE.Side;
  /** sRGB colour map (overrides color's texture); UVs as given by the geometry */
  albedo?: THREE.Texture;
  /** use vertex aDirt (default true) */
  useDirt?: boolean;
  /** an own environment (a PMREM from roomEnv): interiors. three r175 IGNORES envMapIntensity for scene.environment,
   *  so `env` only works together with `envMap` */
  envMap?: THREE.Texture | null;
  /** how much the per-panel tint (aDirt.y, -1..1) changes the value / the roughness (default 0.07 / 0.12) */
  tintK?: number; tintRough?: number;
  /** an extra roughness map (tileable canvas, G channel), e.g. floor scuffs; overrides the kind's map */
  roughMap?: THREE.Texture;
  /** own-environment materials: the share of CORE's GI probe + bounce hemisphere they take (default 0.3) */
  giK?: number;
};
const matCache = new Map<string, THREE.MeshStandardMaterial>();
/** a dirt-aware PBR material (cached by its options + key) */
export const vmat = (key: string, o: VMatOpts): THREE.MeshStandardMaterial => {
  const ck = key + JSON.stringify({ ...o, albedo: o.albedo ? o.albedo.uuid : null, envMap: o.envMap ? o.envMap.uuid : null, roughMap: o.roughMap ? o.roughMap.uuid : null });
  const have = matCache.get(ck); if (have) return have;
  const m = new THREE.MeshStandardMaterial({ color: o.color, roughness: o.rough, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide,
    envMapIntensity: o.env ?? 1, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1 });
  if (o.albedo) m.map = o.albedo;
  if (o.envMap) ownEnv(m, o.envMap, o.env ?? 1);
  const kind = o.map ?? "none";
  if (kind !== "none") {
    const ms = vmaps(kind), rep = 1 / (o.tile ?? 0.25);
    const n = ms.nor.clone(); n.repeat.set(rep, rep); n.needsUpdate = true;
    const r = ms.rough.clone(); r.repeat.set(rep, rep); r.needsUpdate = true;
    m.normalMap = n; m.normalScale.setScalar(o.normalScale ?? 0.5);
    m.roughnessMap = r; m.roughness = o.rough / 0.42;   // the maps sit around 0.3-0.45: scale so the mean ~ o.rough
    if (kind === "weave" || kind === "ribs") m.roughness = o.rough / 0.85;
  }
  if (o.roughMap) { m.roughnessMap = o.roughMap; m.roughness = 1; }
  // shader hooks: (d) the dirt + panel-tint attribute, (g) own-environment materials take only a share of CORE's GI
  // probe / bounce hemisphere (those are not occluded either: a platform probe would paint a car ceiling orange)
  const useDirt = o.useDirt !== false, hasEnv = !!o.envMap;
  if (useDirt || hasEnv) {
    const dc = new THREE.Color(o.dirtColor ?? 0x2b2926);
    const U = { uDirtCol: { value: dc }, uDirtRough: { value: o.dirtRough ?? 0.85 }, uTintK: { value: new THREE.Vector2(o.tintK ?? 0.07, o.tintRough ?? 0.12) }, uGiK: { value: o.giK ?? 0.3 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      if (useDirt) {
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 aDirt;\nvarying vec2 vDirt;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDirt = aDirt;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vDirt;\nuniform vec3 uDirtCol;\nuniform float uDirtRough;\nuniform vec2 uTintK;")
          .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix( diffuseColor.rgb * ( 1.0 + vDirt.y * uTintK.x ), uDirtCol, vDirt.x );")
          .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nroughnessFactor = mix( clamp( roughnessFactor * ( 1.0 - vDirt.y * uTintK.y ), 0.03, 1.0 ), uDirtRough, vDirt.x );\nmetalnessFactor = mix( metalnessFactor, 0.0, vDirt.x * 0.6 );");
      }
      if (hasEnv) sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uGiK;")
        .replace("#include <lights_fragment_begin>", "#include <lights_fragment_begin>\n#if defined( RE_IndirectDiffuse )\nirradiance *= uGiK;\n#endif");
    };
    m.customProgramCacheKey = () => `vehicles:${useDirt ? "d" : ""}${hasEnv ? "g" : ""}`;
  }
  m.name = "veh:" + key;
  matCache.set(ck, m);
  return m;
};

// ---------------------------------------------------------------- own environments (interiors)
/** give a material its OWN environment map (a PMREM). three's IBL is not occluded: inside a car the sky HDRI would
 *  light the ceiling with the park's ground and mirror the sky in the floor. The intensity drops to 0 while CORE bakes
 *  its GI cube (it sets scene.environmentIntensity = 0 for a first-bounce-only render), so draft and final agree. */
export const ownEnv = (m: THREE.MeshStandardMaterial, env: THREE.Texture, k = 1) => {
  m.envMap = env; m.envMapIntensity = k; m.userData.envK = k;
  m.onBeforeRender = (_r, scene) => { m.envMapIntensity = (scene as THREE.Scene).environmentIntensity === 0 ? 0 : (m.userData.envK as number); };
  return m;
};
export type EnvFace = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
type RGB = [number, number, number];
/** a rectangle of light / colour on a room face. a = the first free axis (x faces: z; y faces: x; z faces: x), b = the
 *  second (x faces: y; y faces: z; z faces: y); all in metres relative to the EYE point */
export type EnvPatch = { face: EnvFace; a0: number; a1: number; b0: number; b1: number; rgb: RGB };
export type RoomEnvSpec = {
  key: string;
  /** the box round the eye point: x -hx..hx, y -down..up, z -front..back (metres) */
  hx: number; up: number; down: number; front: number; back: number;
  /** base radiance (scene-linear) per face */
  base: Record<EnvFace, RGB>;
  patches: EnvPatch[];
};
const envCache = new Map<string, THREE.Texture>();
/** a box-room environment as a PMREM (cached by key): each direction takes the radiance of the wall point it hits.
 *  128 x 64 float equirect (row 0 = nadir, flipY off), then CORE's pmremOf. Radiance is absolute scene-linear (golden:
 *  the sky is ~0.33, a sunlit pale wall ~1.5). */
export const roomEnv = (ctx: KitCtx, spec: RoomEnvSpec): THREE.Texture => {
  const have = envCache.get(spec.key); if (have) return have;
  const W = 128, H = 64, d = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const el = ((y + 0.5) / H - 0.5) * Math.PI, ce = Math.cos(el), se = Math.sin(el);
    for (let x = 0; x < W; x++) {
      const ph = ((x + 0.5) / W - 0.5) * Math.PI * 2, dx = ce * Math.cos(ph), dy = se, dz = ce * Math.sin(ph);
      // the first wall hit from the eye
      const tx = dx > 1e-6 ? spec.hx / dx : dx < -1e-6 ? -spec.hx / dx : 1e9;
      const ty = dy > 1e-6 ? spec.up / dy : dy < -1e-6 ? -spec.down / dy : 1e9;
      const tz = dz > 1e-6 ? spec.back / dz : dz < -1e-6 ? -spec.front / dz : 1e9;
      const t = Math.min(tx, ty, tz), px = dx * t, py = dy * t, pz = dz * t;
      let face: EnvFace, a: number, b: number;
      if (t === tx) { face = dx > 0 ? "+x" : "-x"; a = pz; b = py; } else if (t === ty) { face = dy > 0 ? "+y" : "-y"; a = px; b = pz; } else { face = dz > 0 ? "+z" : "-z"; a = px; b = py; }
      let c = spec.base[face];
      for (const p of spec.patches) if (p.face === face && a >= p.a0 && a <= p.a1 && b >= p.b0 && b <= p.b1) c = p.rgb;
      d.set([c[0], c[1], c[2], 1], (y * W + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.flipY = false; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.LinearSRGBColorSpace; tex.name = `veh-env:${spec.key}`; tex.needsUpdate = true;
  const pm = pmremOf(ctx.gl, tex);
  envCache.set(spec.key, pm);
  return pm;
};
const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
/** the passenger car's environment seen from the aisle at 1.25 m: white ceiling with the two LED strips, pale walls,
 *  a daylight window band broken by the door piers, dark bench backs, the grey floor. `day` 1 = daylight outside
 *  (0 = night: black windows), `sunSide` +1 / -1 = which windows carry the warm low sun (0 = neither) */
export const carEnv = (ctx: KitCtx, day = 1, sunSide = 0): THREE.Texture => {
  const eye = 1.25, hx = 1.4, up = 2.3 - eye, down = eye, L = 12;
  const wall: RGB = [0.27, 0.265, 0.25], ceil: RGB = [0.34, 0.335, 0.32], floor: RGB = [0.13, 0.13, 0.135], seat: RGB = [0.05, 0.085, 0.06];
  const dayC: RGB = mul([1.25, 1.2, 1.12], day), sunC: RGB = mul([2.3, 1.85, 1.3], day), led: RGB = [5.5, 5.3, 4.9];
  const patches: EnvPatch[] = [];
  for (const s of [1, -1]) {
    const face: EnvFace = s > 0 ? "+x" : "-x";
    patches.push({ face, a0: -L, a1: L, b0: -down, b1: 1.0 - eye, rgb: seat });                              // benches + bench backs
    for (let k = -3; k <= 3; k++) {                                                                           // windows between the doors (4.82 m bays)
      const c = k * 4.82;
      patches.push({ face, a0: c + 0.95, a1: c + 3.87, b0: 0.9 - eye, b1: 1.8 - eye, rgb: s === sunSide ? sunC : dayC });
      patches.push({ face, a0: c - 0.5, a1: c + 0.5, b0: 0.4 - eye, b1: 1.74 - eye, rgb: mul(s === sunSide ? sunC : dayC, 0.8) });   // the door glass
      patches.push({ face, a0: c - 0.65, a1: c + 0.65, b0: -down, b1: 0.4 - eye, rgb: [0.2, 0.2, 0.2] });      // door bottoms (stainless)
    }
    patches.push({ face: "+y", a0: s * 0.56 - 0.06, a1: s * 0.56 + 0.06, b0: -L, b1: L, rgb: led });          // the LED strips
  }
  return roomEnv(ctx, { key: `car:${day}:${sunSide}`, hx, up, down, front: L, back: L,
    base: { "+x": wall, "-x": wall, "+y": ceil, "-y": floor, "+z": mul(wall, 0.8), "-z": mul(wall, 0.8) }, patches });
};
/** the cab's environment seen from the driver's head: the windscreen band ahead (-z), the side windows, a dim cream
 *  ceiling, the dark desk below, the lit car through the partition windows behind */
export const cabEnv = (ctx: KitCtx, day = 1): THREE.Texture => {
  const eye = 1.3, hx = 1.4, up = 2.22 - eye, down = eye, front = 1.3, back = 0.75;
  const wall: RGB = [0.2, 0.195, 0.18], ceil: RGB = [0.2, 0.195, 0.18], floor: RGB = [0.1, 0.098, 0.095];
  const sky: RGB = mul([1.5, 1.45, 1.35], day), low: RGB = mul([0.75, 0.7, 0.6], day);
  const patches: EnvPatch[] = [
    { face: "-z", a0: -1.3, a1: 1.3, b0: 1.45 - eye, b1: 2.02 - eye, rgb: sky },                // the windscreen: sky half
    { face: "-z", a0: -1.3, a1: 1.3, b0: 0.98 - eye, b1: 1.45 - eye, rgb: low },                // the windscreen: track / lineside half
    { face: "-z", a0: -1.4, a1: 1.4, b0: -down, b1: 0.95 - eye, rgb: [0.07, 0.07, 0.072] },      // the desk
    { face: "+x", a0: -0.75, a1: 0.0, b0: 0.98 - eye, b1: 1.86 - eye, rgb: mul(sky, 0.8) },      // the crew windows
    { face: "-x", a0: -0.75, a1: 0.0, b0: 0.98 - eye, b1: 1.86 - eye, rgb: mul(sky, 0.8) },
    { face: "+z", a0: -1.3, a1: -0.44, b0: 0.8 - eye, b1: 1.86 - eye, rgb: [0.3, 0.3, 0.28] },   // the partition windows (the lit car)
    { face: "+z", a0: 0.44, a1: 1.3, b0: 0.8 - eye, b1: 1.86 - eye, rgb: [0.3, 0.3, 0.28] },
  ];
  return roomEnv(ctx, { key: `cab:${day}`, hx, up, down, front, back,
    base: { "+x": wall, "-x": wall, "+y": ceil, "-y": floor, "+z": wall, "-z": wall }, patches });
};

/** the stainless body's environment: a clean sky gradient + a warm glow toward the sun (authored toward +X; the train
 *  turns it to the rig's sun with `aimSkyEnv`) over a NEUTRAL grey ground. The sky HDRI's own ground is sunlit grass:
 *  mirrored in a car side it paints the lower body olive-yellow. Radiance ~ the golden rig's sky level. */
export const skyEnv = (ctx: KitCtx): THREE.Texture => {
  const have = envCache.get("sky"); if (have) return have;
  const W = 128, H = 64, d = new Float32Array(W * H * 4);
  // LOOK TEST 2026-11-20: a deep blue sky to mirror (was zen [0.2, 0.3, 0.5], hor [0.6, 0.59, 0.56]: the car side
  // mirrored a grey-beige horizon = the "white-grey train")
  const zen: RGB = [0.1, 0.24, 0.62], hor: RGB = [0.42, 0.55, 0.74], glow: RGB = [0.95, 0.72, 0.44], gnd: RGB = [0.135, 0.13, 0.125];
  const sx = Math.cos(0.33), sy = Math.sin(0.33);
  for (let y = 0; y < H; y++) {
    const el = ((y + 0.5) / H - 0.5) * Math.PI, ce = Math.cos(el), se = Math.sin(el);
    for (let x = 0; x < W; x++) {
      const ph = ((x + 0.5) / W - 0.5) * Math.PI * 2, dx = ce * Math.cos(ph), dy = se;
      const toSun = Math.max(0, dx * sx + dy * sy), c: RGB = [0, 0, 0];
      if (dy >= 0) { const t = Math.pow(dy, 0.45), g = Math.pow(toSun, 5); for (let i = 0; i < 3; i++) c[i] = hor[i] * (1 - t) + zen[i] * t + glow[i] * g; }
      else { const k = (0.75 + 0.25 * (1 + dy)) * (1 + 0.5 * Math.pow(Math.max(0, dx), 2)), h = Math.pow(1 + dy, 12); for (let i = 0; i < 3; i++) c[i] = gnd[i] * k * (1 - h) + hor[i] * 0.6 * h; }
      d.set([c[0], c[1], c[2], 1], (y * W + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.flipY = false; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.LinearSRGBColorSpace; tex.name = "veh-env:sky"; tex.needsUpdate = true;
  const pm = pmremOf(ctx.gl, tex);
  envCache.set("sky", pm);
  return pm;
};
/** turn skyEnv materials so their warm glow sits under the live rig's sun (call from update: the rig changes per
 *  shot). The environment is looked up in WORLD space, so the train's own yaw does not matter. */
export const aimSkyEnv = (ctx: KitCtx, mats: THREE.MeshStandardMaterial[]) => {
  const s = ctx.rig.sunDir, a = Math.atan2(-s[2], s[0]);
  for (const m of mats) m.envMapRotation.y = a;
};
/** under the car (bogies, equipment boxes, wheels, the side sill): daylight only from the sides, dark ballast below,
 *  the black floor above (the sky IBL would light a car's underside with the HDRI's bright ground) */
export const underEnv = (ctx: KitCtx, day = 1): THREE.Texture => {
  const side: RGB = mul([0.34, 0.34, 0.36], day), low: RGB = mul([0.1, 0.092, 0.085], day);
  const patches: EnvPatch[] = [];
  for (const face of ["+x", "-x"] as EnvFace[]) patches.push({ face, a0: -8, a1: 8, b0: -0.6, b1: -0.08, rgb: low });
  return roomEnv(ctx, { key: `under:${day}`, hx: 1.7, up: 0.45, down: 0.6, front: 8, back: 8,
    base: { "+x": side, "-x": side, "+y": [0.012, 0.012, 0.012], "-y": mul([0.055, 0.05, 0.045], day), "+z": mul([0.05, 0.05, 0.05], day), "-z": mul([0.05, 0.05, 0.05], day) }, patches });
};

// ---------------------------------------------------------------- glass
export type GlassOpts = { tint?: THREE.ColorRepresentation; opacity?: number; rough?: number; smudge?: THREE.Texture; side?: THREE.Side; env?: number; envMap?: THREE.Texture | null };
const glassCache = new Map<string, THREE.MeshStandardMaterial>();
/** vehicle glass: the PBR reflection at full strength (fresnel from three's BRDF), the scene behind transmitted by
 *  (1 - alpha); an optional smudge map (R = smudge / fog amount, used as extra alpha + roughness). Never casts shadows. */
export const glass = (key: string, o: GlassOpts = {}) => {
  const ck = key + JSON.stringify({ ...o, smudge: o.smudge?.uuid ?? null, envMap: o.envMap?.uuid ?? null }); const have = glassCache.get(ck); if (have) return have;
  const m = new THREE.MeshStandardMaterial({ color: o.tint ?? 0x0b0d0e, roughness: o.rough ?? 0.03, metalness: 0, transparent: true, depthWrite: false,
    opacity: o.opacity ?? 0.1, side: o.side ?? THREE.DoubleSide, envMapIntensity: o.env ?? 1 });
  if (o.envMap) ownEnv(m, o.envMap, o.env ?? 1);
  m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
  const U = { uSmudge: { value: o.smudge ?? null }, uFog: { value: 0 }, uHasSmudge: { value: o.smudge ? 1 : 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGUv;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvGUv = uv;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vGUv;\nuniform sampler2D uSmudge;\nuniform float uFog;\nuniform float uHasSmudge;\nfloat gSm = 0.0;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nif ( uHasSmudge > 0.5 ) { vec4 sm = texture2D( uSmudge, vGUv ); gSm = clamp( sm.r + sm.g * uFog, 0.0, 1.0 ); roughnessFactor = mix( roughnessFactor, 0.55, gSm ); }")
      .replace("#include <opaque_fragment>", "diffuseColor.a = clamp( diffuseColor.a + gSm * 0.28, 0.0, 1.0 );\noutgoingLight += vec3( 0.55, 0.53, 0.5 ) * gSm * 0.08 * ( 1.0 - diffuseColor.a );\n#include <opaque_fragment>");
  };
  m.customProgramCacheKey = () => "vehicles:glass";
  m.userData.U = U;
  m.name = "veh-glass:" + key;
  glassCache.set(ck, m);
  return m;
};

/** a canvas smudge map for a pane (R = permanent smudges / prints, G = breath-fog mask driven by uFog) */
export const smudgeMap = (seed: number, o: { prints?: [number, number, number][]; fog?: [number, number, number]; wiper?: boolean; bugs?: number; dust?: number } = {}) => {
  const W = 256, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const R = rng(seed);
  const blob = (x: number, y: number, r: number, a: number, ch: "r" | "g") => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = ch === "r" ? `rgba(255,0,0,${a})` : `rgba(0,255,0,${a})`;
    gr.addColorStop(0, c); gr.addColorStop(1, ch === "r" ? "rgba(255,0,0,0)" : "rgba(0,255,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  g.globalCompositeOperation = "lighter";
  // overall faint dust film, denser at the bottom
  const dust = o.dust ?? 0.12;
  for (let i = 0; i < 260; i++) { const y = H * Math.pow(R(), 0.6); blob(R() * W, y, 6 + R() * 18, dust * 0.25 * (y / H), "r"); }
  for (const [u, v, s] of o.prints ?? []) {
    // a palm / nose print: a cluster of soft ovals + finger streaks
    const x = u * W, y = (1 - v) * H;
    for (let i = 0; i < 9; i++) blob(x + (R() - 0.5) * 22 * s, y + (R() - 0.5) * 18 * s, (5 + R() * 9) * s, 0.22, "r");
    for (let f = 0; f < 4; f++) { const a = -1.1 + f * 0.45; for (let j = 0; j < 5; j++) blob(x + Math.cos(a) * (14 + j * 5) * s, y - Math.sin(-a + Math.PI) * 0 - Math.abs(Math.sin(a)) * (14 + j * 5) * s, 3.5 * s, 0.16, "r"); }
  }
  if (o.fog) { const [u, v, s] = o.fog; blob(u * W, (1 - v) * H, 34 * s, 0.9, "g"); blob(u * W, (1 - v) * H + 6, 22 * s, 0.6, "g"); }
  if (o.wiper) {
    // two dusty wiper arcs (the swept area is CLEANER: dust outside the arcs)
    g.globalCompositeOperation = "source-over";
    for (const cx of [0.3, 0.75]) { g.strokeStyle = "rgba(60,0,0,0.5)"; g.lineWidth = 3; g.beginPath(); g.arc(cx * W, H * 1.02, W * 0.38, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.globalCompositeOperation = "lighter";
  }
  for (let i = 0; i < (o.bugs ?? 0); i++) blob(R() * W, H * (0.82 + R() * 0.16), 1.5 + R() * 2, 0.8, "r");
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
};

// ---------------------------------------------------------------- emissive lamps / screens
/** a lamp material whose glow is set per frame: lamp.userData.set(on 0..1) */
export const lamp = (key: string, color: THREE.ColorRepresentation, off: THREE.ColorRepresentation, power = 6) => {
  const m = new THREE.MeshStandardMaterial({ color: off, roughness: 0.18, metalness: 0, emissive: color, emissiveIntensity: 0, envMapIntensity: 1.2 });
  m.name = "veh-lamp:" + key;
  m.userData.set = (on: number) => { m.emissiveIntensity = power * Math.max(0, Math.min(1, on)); };
  m.customProgramCacheKey = () => "vehicles:lamp";
  return m;
};
/** a screen / dial material from a canvas (emissive = the canvas x intensity, lit too) */
export const screenMat = (key: string, tex: THREE.Texture, glow = 1.2, rough = 0.25) => {
  const m = new THREE.MeshStandardMaterial({ color: 0x111111, map: tex, roughness: rough, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow });
  m.name = "veh-screen:" + key;
  return m;
};
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return t;
};

// ---------------------------------------------------------------- the shared palette (sRGB)
export const PAL = {
  // LOOK TEST 2026-11-20: emerald was #16573b / #0d3d29 (read near-black olive at distance)
  emerald: "#0e7a47", emeraldDark: "#0a4a2b", orange: "#e8792a", orangeDark: "#b5541a",
  stainless: "#bcc0c5", roofGrey: "#7e8286", bogie: "#2c2d30", under: "#232426", rubber: "#0d0d0e",
  // LOOK TEST 2026-11-20: cab walls cream #e2dccd -> pale mint-grey (beige behind the beige face), console #34363a -> blue-grey
  // LOOK v2: a clearer mint wall, a deep teal-blue desk (look test 1: #b5cdc8 / #4a5662 still read grey); the cab's
  // car-side panels light blue (laminate was #e6e4de; the car interior sets its own colours in interior_jp.ts)
  cream: "#5cbfa3", deskGrey: "#2d5f78", deskBlue: "#34363a", laminate: "#a9d8e8", ceiling: "#f4f3ef", moquette: "#245240", priority: "#5f7896",
  // `ochre` = the worn grey-amber of the doorway floor strips and the door-edge strips: the film's yellow suitcase must
  // be the ONLY yellow of its kind (`yellow` is kept for other films)
  floor: "#787a7e", yellow: "#f2c21a", ochre: "#7e7c72", chrome: "#d9dcdf", facePaint: "#c9cccf",
};

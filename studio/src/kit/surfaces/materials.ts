// SURFACES: the PBR material registry. `await surface(ctx, "brick_pavers", opts)` returns a MeshStandardMaterial with the
// kit surface shader injected (surf_glsl.ts + surf_eval.ts): world / metre UVs at the set's real tile size, anti-tiling
// (hex bombing for unstructured sets, per-brick variation from the cell map for structured ones, macro noise for all),
// real vertex displacement on tessellated near patches (`aSurf.z` weight, see ground.ts) or POM, height-field sun
// self-shadow, joint masks for moss / weeds / dirt, wall-bottom dirt, edge / bevel wear, wetness + puddles, a height
// blend of two sets and up to 16 projected decals (decals.ts). Lighting stays three's PBR: PCSS shadows, N8AO, IBL,
// the GI probe, practicals and the accumulation all work unchanged. Pure function of position + seed.
import * as THREE from "three";
import type { KitCtx } from "../core/ctx";
import { LIBRARY, type SurfName, type SurfDef } from "./library";
import { SURF_VERT_PARS, SURF_VERT_MAIN, SURF_FRAG_PARS } from "./surf_glsl";
import { SURF_EVAL } from "./surf_eval";

export { LIBRARY, SURF_NAMES, type SurfName } from "./library";
type C3 = [number, number, number];
type Col = THREE.ColorRepresentation | C3;

export type SurfaceOpts = {
  /** texture resolution (default: 2k when the set has it and quality is final / final4, else 1k) */
  res?: "2k" | "1k";
  /** surface coordinates: "xz" world ground (default), "uv" geometry uv in METRES, "xy" / "zy" world wall planes */
  uv?: "xz" | "uv" | "xy" | "zy";
  /** override the real-world repeat size (m), rotate the pattern (rad), shift it (m) */
  tileM?: number; rot?: number; offset?: [number, number];
  /** colour multiplier (sRGB colour or linear triple), overall value, roughness / normal / AO strength multipliers */
  tint?: Col; value?: number; rough?: number; normal?: number; ao?: number; cavity?: number; metal?: number;
  /** real vertex displacement (needs a tessellated mesh with aSurf.z > 0, e.g. ground.ts near patches) */
  displace?: boolean | { reliefM?: number };
  /** parallax occlusion mapping (walls / flat near planes): scale = relief multiplier, steps, fade distance m */
  pom?: boolean | { scale?: number; steps?: number; fadeM?: number };
  /** height-field self-shadow toward the sun (0..1, default 0.85 when displace or pom is on) */
  selfShadow?: number;
  macro?: { amount?: number; scaleM?: number; rough?: number; hue?: number };
  cells?: { value?: number; hue?: number; rough?: number; odd?: number; heightM?: number; tilt?: number; missing?: number; cracked?: number; chipped?: number; warpM?: number };
  /** albedo saturation (1 = the scan) */
  sat?: number;
  joints?: { lo?: number; hi?: number; dark?: number };
  moss?: { amount?: number; scaleM?: number; edge?: number; weeds?: number; color?: Col };
  dirt?: { joints?: number; bottom?: number; heightM?: number; baseY?: number; edge?: number; grime?: number; streaks?: number; dust?: number; color?: Col };
  wet?: { wetness?: number; puddles?: number; scaleM?: number; level?: number };
  wear?: { edges?: number; polish?: number; centre?: number; chips?: number };
  /** height blend toward a second set: mask "noise" (patches), "attr" (aBlendW per vertex) or "both" */
  blend?: { with: SurfName; mask?: "noise" | "attr" | "both"; scaleM?: number; contrast?: number; bias?: number; tint?: Col; tileM?: number; rough?: number };
  /** "none" turns hex bombing off (patterned albedo swaps such as wallpaper) */
  anti?: "auto" | "none";
  /** extra seed (decorrelates two materials of the same set) */
  seed?: number;
  side?: THREE.Side;
};

export const MAX_DECALS = 16;
/** the shared decal atlas (decals.ts fills it; a 1x1 transparent texture until then) */
export const SURF_DECAL_TEX: { value: THREE.Texture } = { value: (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); t.needsUpdate = true; return t; })() };

export type SurfState = {
  name: SurfName; def: SurfDef; tileM: number; reliefM: number; uvMode: "xz" | "uv" | "xy" | "zy";
  U: Record<string, THREE.IUniform>;
  /** decal slots (decals.ts writes them; call `syncDecals()` after changing) */
  decals: { a: THREE.Vector4; b: THREE.Vector4; c: THREE.Vector4 }[];
  syncDecals: () => void;
};
export type SurfMaterial = THREE.MeshStandardMaterial & { userData: { surf: SurfState } };

const lin = (c: Col): THREE.Color => Array.isArray(c) ? new THREE.Color(c[0], c[1], c[2]) : new THREE.Color(c);
const flat = (r: number, g: number, b: number, a = 255) => { const t = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1); t.needsUpdate = true; return t; };
const GREY = flat(200, 200, 200), ARM1 = flat(255, 230, 0), NORM = flat(128, 128, 255), CELL0 = flat(1, 0, 40, 255), CEN0 = flat(128, 128, 0, 255);
const prep = (t: THREE.Texture, aniso = 8) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.max(t.anisotropy, aniso); return t; };

// the directional-light loop gets the height-field self-shadow on light 0 (the sun)
let LFB_SURF = "";
const lightsChunk = () => {
  if (LFB_SURF) return LFB_SURF;
  const s = THREE.ShaderChunk.lights_fragment_begin, i0 = s.indexOf("DirectionalLight directionalLight;"), i1 = s.indexOf("RE_Direct( directLight", i0);
  LFB_SURF = i0 < 0 || i1 < 0 ? s : s.slice(0, i1) + "#if ( UNROLLED_LOOP_INDEX == 0 )\n\t\tdirectLight.color *= sSunSelf( directLight.direction );\n\t\t#endif\n\t\t" + s.slice(i1);
  if (LFB_SURF === s) console.error("surfaces: lights chunk patch did not apply");
  return LFB_SURF;
};
const AO_CHUNK = /* glsl */ `
{
  float ambientOcclusion = S.ao;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
  #endif
}`;

type Tex4 = { alb: THREE.Texture; nor: THREE.Texture; arm: THREE.Texture; hgt: THREE.Texture; cell: THREE.Texture | null; cen: THREE.Texture | null; hN: [number, number] };
const texCache = new Map<string, Promise<Tex4>>();
/** the textures of one set (cached per name + res): albedo, normal, arm, height (kit hgt for cell sets) and the cell map */
export const surfaceTextures = (ctx: KitCtx, name: SurfName, res: "2k" | "1k"): Promise<Tex4> => {
  const key = name + ":" + res;
  let p = texCache.get(key);
  if (!p) {
    const def = LIBRARY[name] as SurfDef;
    p = (async () => {
      const set = await ctx.assets.pbr(name, def.res.includes(res) ? res : def.res[0]);
      let hgt: THREE.Texture = set.disp ?? GREY, cell: THREE.Texture | null = null, cen: THREE.Texture | null = null, hN: [number, number] = def.h ?? [0, 1];
      if (def.kind === "cell") {
        const [h, c, ce] = await Promise.all([
          ctx.assets.tex(`kit/surfaces/${name}/${name}_hgt_1k.png`, { srgb: false }),
          ctx.assets.tex(`kit/surfaces/${name}/${name}_cell_1k.png`, { srgb: false, anisotropy: 1 }),
          ctx.assets.tex(`kit/surfaces/${name}/${name}_cen_1k.png`, { srgb: false, anisotropy: 1 })]);
        hgt = h; cell = c; cen = ce; hN = [0, 1];
        for (const t of [c, ce]) { t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.anisotropy = 1; t.needsUpdate = true; prep(t, 1); }
      }
      if (!set.disp && def.kind !== "cell") hN = [0, 1];
      return { alb: prep(set.map), nor: prep(set.normalMap), arm: prep(set.arm ?? ARM1), hgt: prep(hgt), cell, cen, hN };
    })();
    texCache.set(key, p);
  }
  return p;
};

let matCount = 0;
/** make a kit surface material (cheap: textures are shared per set + resolution; each call is its own material with its
 *  own decal slots and options) */
export const surface = async (ctx: KitCtx, name: SurfName, o: SurfaceOpts = {}): Promise<SurfMaterial> => {
  const def = LIBRARY[name] as SurfDef;
  if (!def) throw new Error(`surfaces: unknown surface "${name}"`);
  const hiQ = ctx.quality === "final" || ctx.quality === "final4";
  const res = o.res ?? (hiQ && def.res.includes("2k") ? "2k" : "1k");
  const T = await surfaceTextures(ctx, name, res);
  const tileM = o.tileM ?? def.tileM, rot = o.rot ?? 0, reliefM = (typeof o.displace === "object" && o.displace.reliefM) || def.reliefM;
  const seed = ((ctx.seed * 7919 + (o.seed ?? 0) * 104729 + (matCount++) * 0) % 997) + 0.5 + (o.seed ?? 0) * 3.7;
  const cs = Math.cos(rot) / tileM, sn = Math.sin(rot) / tileM;
  const tint = lin(o.tint ?? def.tint ?? [1, 1, 1]).multiplyScalar(o.value ?? 1);
  const mac = def.macro ?? [0.1, 4, 0.1, 0.3], cv = def.cellVar ?? [0, 0, 0, 0], jt = def.joint ?? [0.12, 0.45, 0.3];
  const pomOn = !!o.pom, dispOn = !!o.displace;
  const pom = typeof o.pom === "object" ? o.pom : {};
  const selfK = o.selfShadow ?? (pomOn || dispOn ? 0.85 : 0);
  const draft = ctx.quality === "draft" || ctx.quality === "preview";
  const mossC = lin(o.moss?.color ?? [0.07, 0.1, 0.025]), dirtC = lin(o.dirt?.color ?? [0.16, 0.12, 0.08]);
  const decals: SurfState["decals"] = [];
  const dA: THREE.Vector4[] = [], dB: THREE.Vector4[] = [], dC: THREE.Vector4[] = [];
  for (let i = 0; i < MAX_DECALS; i++) { dA.push(new THREE.Vector4()); dB.push(new THREE.Vector4(1, 1, 0, 0)); dC.push(new THREE.Vector4(1, 1, 1, 0)); }
  const U: Record<string, THREE.IUniform> = {
    sAlb: { value: T.alb }, sNor: { value: T.nor }, sArm: { value: T.arm }, sHgt: { value: T.hgt }, sCell: { value: T.cell ?? CELL0 },
    sCen: { value: T.cen ?? CEN0 },
    sCellV2: { value: new THREE.Vector4(o.cells?.tilt ?? def.cellV2?.[0] ?? 0.01, o.cells?.missing ?? def.cellV2?.[1] ?? 0, o.cells?.cracked ?? def.cellV2?.[2] ?? 0.01, o.cells?.chipped ?? def.cellV2?.[3] ?? 0.25) },
    sWarp: { value: (o.cells?.warpM ?? def.warpM ?? 0.0015) / tileM },
    sSat: { value: o.sat ?? def.sat ?? 1 },
    sXf: { value: new THREE.Vector4(cs, sn, (o.offset?.[0] ?? 0) / tileM + ((seed * 0.37) % 1), (o.offset?.[1] ?? 0) / tileM + ((seed * 0.61) % 1)) },
    sSeed: { value: seed },
    sDispV: { value: new THREE.Vector4(reliefM, o.cells?.heightM ?? def.cellHeightM ?? 0, T.hN[0], 1 / Math.max(1e-3, T.hN[1] - T.hN[0])) },
    sCol: { value: new THREE.Vector4(tint.r, tint.g, tint.b, o.cavity ?? def.cavity ?? 0.25) },
    sMat: { value: new THREE.Vector4((o.rough ?? 1) * (def.rough ?? 1), (o.normal ?? 1) * (def.normal ?? 1), o.ao ?? def.ao ?? 1, o.metal ?? def.metal ?? 0) },
    sMacro: { value: new THREE.Vector4(o.macro?.amount ?? mac[0], 1 / (o.macro?.scaleM ?? mac[1]), o.macro?.rough ?? mac[2], o.macro?.hue ?? mac[3]) },
    sCellV: { value: new THREE.Vector4(o.cells?.value ?? cv[0], o.cells?.hue ?? cv[1], o.cells?.rough ?? cv[2], o.cells?.odd ?? cv[3]) },
    sJoint: { value: new THREE.Vector4(o.joints?.lo ?? jt[0], o.joints?.hi ?? jt[1], o.joints?.dark ?? jt[2], def.hexRot ?? 0) },
    sMoss: { value: new THREE.Vector4(o.moss?.amount ?? def.moss ?? 0, 1 / (o.moss?.scaleM ?? 0.9), o.moss?.edge ?? 0.35, o.moss?.weeds ?? (def.moss ?? 0) * 0.6) },
    sMossC: { value: mossC },
    sDirt: { value: new THREE.Vector4(o.dirt?.joints ?? def.dirt ?? 0.3, o.dirt?.bottom ?? 0, o.dirt?.heightM ?? 0.6, o.dirt?.baseY ?? 0) },
    sDirt2: { value: new THREE.Vector4(o.dirt?.edge ?? 0.25, o.dirt?.grime ?? 0.08, o.dirt?.streaks ?? 0, o.dirt?.dust ?? def.dust ?? 0) },
    sDirtC: { value: dirtC },
    sWet: { value: new THREE.Vector4(o.wet?.wetness ?? 0, o.wet?.puddles ?? 0, 1 / (o.wet?.scaleM ?? 2.5), o.wet?.level ?? 0.62) },
    sWear: { value: new THREE.Vector4(o.wear?.edges ?? 0.6, o.wear?.polish ?? 0.25, o.wear?.centre ?? 0.5, o.wear?.chips ?? 0.5) },
    sPom: { value: new THREE.Vector4((pom.scale ?? 1) * reliefM / tileM, draft ? 10 : (pom.steps ?? 20), selfK, pom.fadeM ?? (dispOn ? 9 : 7)) },
    sPoro: { value: def.porosity },
    sDispUV: { value: reliefM / tileM },
    sDcTex: SURF_DECAL_TEX, sDcN: { value: 0 }, sDcA: { value: dA }, sDcB: { value: dB }, sDcC: { value: dC },
  };
  const defines: Record<string, string | number> = { S_UV: { xz: 0, uv: 1, xy: 2, zy: 3 }[o.uv ?? "xz"], S_MAXD: MAX_DECALS, S_DECALS: 1 };
  if (def.kind === "cell") { defines.S_CELL = 1; defines.S_HGTN = 1; }
  if (def.kind === "hex" && o.anti !== "none") defines.S_HEX = 1;
  if (dispOn) defines.S_DISP = 1;
  if (pomOn && !dispOn) defines.S_POM = 1;
  if (selfK > 0 && def.kind !== "hex" && !draft) defines.S_SELF = 1;
  if (o.blend) {
    const b = o.blend, d2 = LIBRARY[b.with] as SurfDef, T2 = await surfaceTextures(ctx, b.with, res);
    const t2 = b.tileM ?? d2.tileM, tint2 = lin(b.tint ?? d2.tint ?? [1, 1, 1]);
    Object.assign(U, {
      sAlb2: { value: T2.alb }, sNor2: { value: T2.nor }, sArm2: { value: T2.arm }, sHgt2: { value: T2.hgt },
      sXf2: { value: new THREE.Vector4(1 / t2, 0, (seed * 0.13) % 1, (seed * 0.29) % 1) }, sCol2: { value: new THREE.Vector4(tint2.r, tint2.g, tint2.b, 0) },
      sMat2: { value: new THREE.Vector4((b.rough ?? 1) * (d2.rough ?? 1), d2.normal ?? 1, 1, d2.metal ?? 0) },
      sBlend: { value: new THREE.Vector4({ noise: 1, attr: 2, both: 3 }[b.mask ?? "noise"], 1 / (b.scaleM ?? 3), b.contrast ?? 0.18, b.bias ?? 0.5) },
      sHgt2N: { value: new THREE.Vector2(T2.hN[0], 1 / Math.max(1e-3, T2.hN[1] - T2.hN[0])) },
    });
    defines.S_BLEND = 1;
  }
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1, side: o.side ?? THREE.FrontSide }) as SurfMaterial;
  m.defines = { ...(m.defines ?? {}), ...defines };
  const key = "surfaces:" + name + ":" + Object.entries(defines).map(([k, v]) => k + v).sort().join(",");
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\n" + SURF_VERT_PARS)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + SURF_VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <clipping_planes_pars_fragment>", "#include <clipping_planes_pars_fragment>\n" + SURF_FRAG_PARS + SURF_EVAL)
      .replace("#include <map_fragment>", "sEval();\n\tdiffuseColor.rgb *= S.alb;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = roughness * S.rough;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = metalness * S.metal;")
      .replace("#include <normal_fragment_maps>", "normal = normalize( sF * S.nrm );")
      .replace("#include <lights_fragment_begin>", lightsChunk())
      .replace("#include <aomap_fragment>", AO_CHUNK);
  };
  m.customProgramCacheKey = () => key;
  const st: SurfState = {
    name, def, tileM, reliefM, U, decals, uvMode: o.uv ?? "xz",
    syncDecals: () => {
      const n = Math.min(MAX_DECALS, decals.length);
      for (let i = 0; i < n; i++) { dA[i].copy(decals[i].a); dB[i].copy(decals[i].b); dC[i].copy(decals[i].c); }
      U.sDcN.value = n;
    },
  };
  m.userData.surf = st;
  m.name = "surf:" + name;
  return m;
};

/** per-vertex surface attributes for builders: aSurf = (edge, centre, displacement weight), aWear, aBlendW */
export const setSurfAttrs = (g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, i: number) => [number, number, number, number], blend?: (x: number, y: number, z: number) => number) => {
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = p.count;
  const a = new Float32Array(n * 3), w = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = fn(p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2]; w[i] = v[3];
    if (blend) b[i] = blend(p.getX(i), p.getY(i), p.getZ(i));
  }
  g.setAttribute("aSurf", new THREE.BufferAttribute(a, 3));
  g.setAttribute("aWear", new THREE.BufferAttribute(w, 1));
  if (blend) g.setAttribute("aBlendW", new THREE.BufferAttribute(b, 1));
  return g;
};

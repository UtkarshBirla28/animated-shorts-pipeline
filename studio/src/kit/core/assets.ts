// REAL-WORLD KIT asset loader (the AssetLoader of ctx.ts). Everything is cached for the life of the page (a Remotion
// render tab), so a texture / HDRI / model used by several sets or shots is fetched, decoded and uploaded once.
// Layout under studio/public/: kit/hdri/<name>_<res>.hdr, kit/surfaces/<name>/... (Poly Haven naming or kit.json),
// any other path for tex() / gltf().
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { staticFile } from "remotion";
import type { AssetLoader, PbrSet } from "./ctx";

type Res = "1k" | "2k" | "4k";
const RES_ORDER: Record<Res, Res[]> = { "1k": ["1k", "2k", "4k"], "2k": ["2k", "1k", "4k"], "4k": ["4k", "2k", "1k"] };
const url = (p: string) => staticFile(p.replace(/^\/+/, ""));

/** per-page caches (shared by every loader instance) */
const texCache = new Map<string, Promise<THREE.Texture>>();
const pbrCache = new Map<string, Promise<PbrSet>>();
const hdrCache = new Map<string, Promise<THREE.DataTexture>>();
const gltfCache = new Map<string, Promise<GLTF>>();
const existsCache = new Map<string, Promise<boolean>>();
const jsonCache = new Map<string, Promise<unknown>>();
const stats = { tex: 0, hdr: 0, gltf: 0, bytesGuess: 0 };
export const assetStats = () => ({ ...stats, cachedTex: texCache.size, cachedHdr: hdrCache.size, cachedGltf: gltfCache.size });

/** does a public file exist? (HEAD request, cached) */
export const exists = (p: string) => {
  let e = existsCache.get(p);
  if (!e) {
    e = fetch(url(p), { method: "HEAD" }).then((r) => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html")).catch(() => false);
    existsCache.set(p, e);
  }
  return e;
};
const getJson = (p: string) => {
  let j = jsonCache.get(p);
  if (!j) { j = fetch(url(p)).then((r) => (r.ok ? r.json() : null)).catch(() => null); jsonCache.set(p, j); }
  return j;
};

const tl = new THREE.TextureLoader();
const baseTex = (path: string, srgb: boolean) => {
  const key = `${path}|${srgb ? "s" : "l"}`;
  let p = texCache.get(key);
  if (!p) {
    p = tl.loadAsync(url(path)).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.name = path; stats.tex++;
      return t;
    });
    p.catch(() => texCache.delete(key));
    texCache.set(key, p);
  }
  return p;
};

/** an equirect HDRI as a float DataTexture (EquirectangularReflectionMapping). The pixel data stays readable on
 *  `tex.image.data` (rigs.ts scans it for the sun and the sky level). */
const loadHdr = (path: string) => {
  let p = hdrCache.get(path);
  if (!p) {
    p = new RGBELoader().setDataType(THREE.FloatType).loadAsync(url(path)).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping; t.name = path; stats.hdr++;
      return t;
    });
    p.catch(() => hdrCache.delete(path));
    hdrCache.set(path, p);
  }
  return p;
};

type PbrJson = { tileM?: number; files?: { diff?: string; nor?: string; arm?: string; disp?: string } };

export const makeAssets = (gl?: THREE.WebGLRenderer): AssetLoader => {
  const maxAniso = gl ? gl.capabilities.getMaxAnisotropy() : 8;
  const tex: AssetLoader["tex"] = async (path, opts = {}) => {
    const t = await baseTex(path, opts.srgb !== false);
    if (!opts.repeat && opts.anisotropy === undefined) return t;
    const c = t.clone();                       // shares t.source: one GPU upload
    if (opts.repeat) c.repeat.set(opts.repeat[0], opts.repeat[1]);
    if (opts.anisotropy !== undefined) c.anisotropy = Math.min(opts.anisotropy, maxAniso);
    c.needsUpdate = true;
    return c;
  };
  const pbr: AssetLoader["pbr"] = (name, res = "2k") => {
    const key = `${name}|${res}`;
    let p = pbrCache.get(key);
    if (!p) {
      p = (async () => {
        const dir = name.includes("/") ? name.replace(/\/+$/, "") : `kit/surfaces/${name}`;
        const stem = dir.split("/").pop()!;
        const meta = ((await getJson(`${dir}/kit.json`)) ?? {}) as PbrJson;
        const pat = (k: "diff" | "nor" | "arm" | "disp", r: Res) => {
          const f = meta.files?.[k];
          if (f) return `${dir}/${f.replace(/<res>/g, r)}`;
          return `${dir}/${stem}_${k === "nor" ? "nor_gl" : k}_${r}.jpg`;
        };
        // first resolution (in fallback order) whose albedo exists
        let use: Res | null = null;
        for (const r of RES_ORDER[res]) if (await exists(pat("diff", r))) { use = r; break; }
        if (!use) throw new Error(`kit assets: no PBR set "${name}" (looked for ${pat("diff", res)})`);
        const r = use;
        const opt = async (k: "arm" | "disp") => {
          const p1 = pat(k, r);
          if (await exists(p1)) return baseTex(p1, false);
          if (k === "disp") { const p2 = p1.replace(/\.jpg$/, ".png"); if (await exists(p2)) return baseTex(p2, false); }
          return undefined;
        };
        const [map, normalMap, arm, disp] = await Promise.all([baseTex(pat("diff", r), true), baseTex(pat("nor", r), false), opt("arm"), opt("disp")]);
        const set: PbrSet = { map, normalMap, tileM: meta.tileM ?? 1 };
        if (arm) set.arm = arm;
        if (disp) set.disp = disp;
        return set;
      })();
      p.catch(() => pbrCache.delete(key));
      pbrCache.set(key, p);
    }
    return p;
  };
  const hdri: AssetLoader["hdri"] = async (name, res = "2k") => {
    for (const r of RES_ORDER[res]) {
      const path = `kit/hdri/${name}_${r}.hdr`;
      if (await exists(path)) return loadHdr(path);
    }
    throw new Error(`kit assets: no HDRI "${name}" in public/kit/hdri/`);
  };
  const gltf: AssetLoader["gltf"] = async (path) => {
    let p = gltfCache.get(path);
    if (!p) {
      p = new GLTFLoader().loadAsync(url(path)).then((g) => { stats.gltf++; return g; });
      p.catch(() => gltfCache.delete(path));
      gltfCache.set(path, p);
    }
    const g = await p;
    return skeletonClone(g.scene) as THREE.Group;
  };
  return { tex, pbr, hdri, gltf };
};

/** the raw GLTF (animations, cameras) of a cached model: `const { animations } = await gltfRaw("kit/props/x/x.glb")` */
export const gltfRaw = async (path: string) => {
  if (!gltfCache.has(path)) await makeAssets().gltf(path);
  return gltfCache.get(path)!;
};
/** clone a PBR set's textures with a new repeat (shared GPU images): repeat = surface size (m) / tileM */
export const pbrRepeat = (p: PbrSet, rep: [number, number]): PbrSet => {
  const c = (t: THREE.Texture) => { const n = t.clone(); n.repeat.set(rep[0], rep[1]); n.needsUpdate = true; return n; };
  const out: PbrSet = { map: c(p.map), normalMap: c(p.normalMap), tileM: p.tileM };
  if (p.arm) out.arm = c(p.arm);
  if (p.disp) out.disp = c(p.disp);
  return out;
};

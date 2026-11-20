// REAL-WORLD KIT render pipeline: <KitFilm film={FILM} quality=... overlay=... /> (and KitComposition for a Root).
// Per Remotion frame: find the shot, build its set lazily (cached; least-recently-used sets are disposed beyond the
// quality's cap), apply the shot's light rig (HDRI sky + IBL, sun, fog, haze, grade), fit the sun shadow box to the
// shot, bake the bounce probe, then render N sub-frames (the pilot's accumulation: shutter motion blur, thin-lens DOF,
// Halton AA, PCSS soft sun shadows, N8AO, ray-marched shafts) and on the average bloom -> AgX -> calm grade.
// The R3F `shadows` bug (R3F re-applies Canvas props on every Remotion frame; without a shadows prop it switched the
// shadow maps off after the first frame of each tab) is fixed twice over: the Canvas gets shadows="percentage" + flat,
// and the renderer state is forced at the top of every frame render.
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Composition, cancelRender, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import type { Built, CamState, Film, KitCtx, LightRigState, Practical, PracticalSpec, Quality, RigSpec, ShotDef, V3 } from "./ctx";
import { patchShadowChunk, seedAll, KIT_SEED, KIT_TAPS, AccumPass, CopyFromPass, KitGrade } from "./shaders";
import { makeAssets } from "./assets";
import { resolveRig, sunDirOf, fillRigState, scanSky, pmremOf, practical as makePractical, envTexture } from "./rigs";
import { makeGI, bakeProbe, setGroundBounce, probeBounce, type GI } from "./gi";
import { camSpeedStats } from "./camera";
import { LAYER_MAIN_ONLY } from "./screen";

patchShadowChunk();

// ================================================================ quality presets
export type QualitySpec = {
  mb: number; shadow: number; cardShadow: number;
  ao: { samples: number; denoise: number; radius: number } | null;
  shafts: number; taps: [number, number]; giCube: number; maxSets: number; bg4k: boolean;
};
export const QUALITY: Record<Quality, QualitySpec> = {
  draft:   { mb: 1, shadow: 2048, cardShadow: 1024, ao: { samples: 6, denoise: 4, radius: 6 }, shafts: 12, taps: [8, 12], giCube: 16, maxSets: 2, bg4k: false },
  preview: { mb: 1, shadow: 2048, cardShadow: 2048, ao: { samples: 8, denoise: 4, radius: 6 }, shafts: 20, taps: [12, 20], giCube: 32, maxSets: 2, bg4k: false },
  final4:  { mb: 4, shadow: 4096, cardShadow: 4096, ao: { samples: 12, denoise: 6, radius: 8 }, shafts: 28, taps: [16, 24], giCube: 64, maxSets: 2, bg4k: true },
  final:   { mb: 8, shadow: 4096, cardShadow: 4096, ao: { samples: 16, denoise: 8, radius: 8 }, shafts: 32, taps: [16, 32], giCube: 64, maxSets: 2, bg4k: true },
};
/** the light budget per set: practicals that are real scene lights (ctx.practical with light !== false). Measured on
 *  the GTX 1660 Ti (NOTES "Light budget"); going over only warns. */
export const LIGHT_BUDGET = { total: 8, rect: 4, shadowed: 2 };
/** Remotion render scale per quality (kit_render.mjs uses it): draft / preview at 540x960 */
export const QUALITY_SCALE: Record<Quality, number> = { draft: 0.5, preview: 0.5, final4: 1, final: 1 };

/** inputProps.kit (all optional) */
export type KitProps = { quality?: Quality; mb?: number; ao?: boolean; vol?: boolean; gi?: boolean; fnum?: number; shutter?: number;
  dbg?: string; log?: number; prof?: boolean; exposure?: number; cardLight?: "map" | "scene" | "off"; rig?: string;
  /** look experiments from the command line: rig values merged over EVERY shot's resolved rig, e.g.
   *  --props '{"rigOpts":{"exposure":1.2,"skyLevel":0.25}}' (find the numbers, then write them into the set's
   *  Built.hints.rigOpts or the shot's rigOpts) */
  rigOpts?: Partial<RigSpec>;
  /** debug: false skips the pre-update shader compile (the old order: a set whose first update renders the scene then
   *  compiles every program one by one on the main thread) */
  pre?: boolean };
const readProps = (): KitProps => ((getInputProps() as { kit?: KitProps }).kit ?? {});

// ================================================================ frame info for overlays
export type KitFrameInfo = { frame: number; t: number; shot: ShotDef; shotIndex: number; local: number; quality: Quality };
const KitFrameCtx = createContext<KitFrameInfo | null>(null);
/** inside anything rendered by KitFilm's `overlay`: the current frame / shot */
export const useKitFrame = () => useContext(KitFrameCtx);
/** index of the shot covering `frame` (clamped to the film) */
export const shotIndexAt = (film: Film, frame: number) => {
  const S = film.shots; let lo = 0, hi = S.length - 1;
  if (frame <= S[0].from) return 0;
  if (frame >= S[hi].to) return hi;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m].from <= frame) lo = m; else hi = m - 1; }
  return lo;
};

// ================================================================ helpers for set builders
/** a mesh that must cast into the SUN shadow map but not into the CARD light's map (a character's shadow proxy).
 *  Give it its own geometry (the draw range is switched off during the card-map pass). */
export const excludeFromCardShadow = (mesh: THREE.Mesh, ctx: Pick<KitCtx, "sunCard">) => {
  const g = mesh.geometry;
  let keep: { start: number; count: number } | null = null;
  mesh.onBeforeShadow = (_r, _s, _c, sc) => { if (ctx.sunCard && sc === ctx.sunCard.shadow.camera) { keep = { ...g.drawRange }; g.setDrawRange(0, 0); } };
  mesh.onAfterShadow = () => { if (keep) { g.setDrawRange(keep.start, keep.count); keep = null; } };
  return mesh;
};

const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const hashStr = (s: string) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
/** lens focal length (mm) for a vertical FOV, calibrated on the pilot (72 deg = 25 mm) */
export const lensMM = (fovDeg: number) => (25 * Math.tan((36 * Math.PI) / 180)) / Math.tan((fovDeg * Math.PI) / 360);

// ================================================================ runtime (one per render tab)
type SetEntry = {
  id: string; scene: THREE.Scene; built: Built; ctx: KitCtx; updates: ((t: number, cam: THREE.Camera) => void)[];
  practicals: Practical[]; lastUsed: number; buildMs: number; shadowedPracticals: number; compiled: Set<string>;
  frameHooks: ((t: number, f: number) => void)[];
  /** practicals that are real scene lights, per kind (the light budget) + one-time warning flags */
  nLights: { point: number; spot: number; rect: number }; warned: Set<string>;
};
/** the card-map hook: an invisible first-drawn mesh whose onBeforeRender renders the card light's shadow map inside the
 *  main render (three's shadow pass needs a live render state; CARDS uses the same trick for its private light) */
const HOOK_GEO = (() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3)); return g; })();
const HOOK_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
type ShotState = { idx: number; rig: RigSpec; rigKey: string; center: THREE.Vector3; ext: number; probe: V3 | null };

class KitRuntime {
  gl: THREE.WebGLRenderer; film: Film; quality: Quality; q: QualitySpec; on: KitProps; w: number; h: number;
  cam = new THREE.PerspectiveCamera(72, 9 / 16, 0.05, 2500);
  sun: THREE.DirectionalLight; sunCard: THREE.DirectionalLight | null;
  cardMode: "map" | "scene" | "off"; cardPending = false; frameMs = 0;
  gi: GI = makeGI();
  assets = makeAssets();
  rig: LightRigState;
  windT = { value: 0 };
  sets = new Map<string, SetEntry>();
  building = new Map<string, Promise<SetEntry>>();
  cur: ShotState | null = null; curSet: SetEntry | null = null;
  A: EffectComposer; B: EffectComposer; rp: RenderPass; n8: N8AOPostPass | null; acc: AccumPass; accRT: THREE.WebGLRenderTarget;
  bloom: BloomEffect; grade: KitGrade; copy!: CopyFromPass;
  tick = 0; profDone = false;
  /** output frames rendered since the current shot was activated (the mid-shot recompile watch) */
  shotFrames = 0;

  constructor(gl: THREE.WebGLRenderer, film: Film, quality: Quality, on: KitProps) {
    this.gl = gl; this.film = film; this.quality = quality; this.q = { ...QUALITY[quality] }; this.on = on;
    if (on.mb) this.q.mb = Math.max(1, Math.round(on.mb));
    const sz = gl.getDrawingBufferSize(new THREE.Vector2()); this.w = sz.x; this.h = sz.y;
    this.assets = makeAssets(gl);
    KIT_TAPS.value.set(this.q.taps[0], this.q.taps[1]);
    const mkSun = (size: number, intensity: number) => {
      const s = new THREE.DirectionalLight(0xffffff, intensity);
      s.castShadow = true; s.shadow.mapSize.set(size, size);
      s.shadow.bias = -0.00025; s.shadow.normalBias = 0.015;
      return s;
    };
    this.sun = mkSun(this.q.shadow, 7.2); this.sun.name = "kit-sun";
    this.cardMode = on.cardLight ?? film.cardLight ?? "off";       // default off since 2026-11-19 21:00 (NOTES "Card light")
    this.sunCard = this.cardMode === "off" ? null : mkSun(this.q.cardShadow, 0);
    if (this.sunCard) { this.sunCard.name = "kit-sun-card"; this.sunCard.shadow.autoUpdate = false; }   // once per output frame (sub-frame 0)
    this.rig = fillRigState({ name: "", sunDir: [0, 1, 0], sunColor: new THREE.Color(), sunIntensity: 0, exposure: 1, hazeDensity: 0 }, resolveRig("golden"), null);
    // passes
    this.cam.layers.set(0); this.cam.layers.enable(LAYER_MAIN_ONLY);
    this.A = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    this.A.autoRenderToScreen = false;
    const dummy = new THREE.Scene();
    this.rp = new RenderPass(dummy, this.cam);
    this.A.addPass(this.rp);
    this.n8 = null;
    if (this.q.ao && on.ao !== false) {
      const n8 = new N8AOPostPass(dummy, this.cam, this.w, this.h);
      Object.assign(n8.configuration, { aoRadius: 0.9, distanceFalloff: 0.6, intensity: 2.2, aoSamples: this.q.ao.samples, denoiseSamples: this.q.ao.denoise,
        denoiseRadius: this.q.ao.radius, halfRes: true, gammaCorrection: false, screenSpaceRadius: false });
      this.A.addPass(n8); this.n8 = n8;
    }
    this.accRT = new THREE.WebGLRenderTarget(this.w, this.h, { type: THREE.HalfFloatType, depthBuffer: false });
    this.acc = new AccumPass(this.accRT);
    this.acc.vol = on.vol !== false;
    this.A.addPass(this.acc);
    this.A.setSize(this.w, this.h, false);
    this.B = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    this.copy = new CopyFromPass(this.accRT.texture);
    this.B.addPass(this.copy);
    this.bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.42, luminanceThreshold: 1.05, luminanceSmoothing: 0.35, mipmapBlur: true, radius: 0.72, levels: 7 });
    this.grade = new KitGrade();
    this.B.addPass(new EffectPass(this.cam, this.bloom, new ToneMappingEffect({ mode: ToneMappingMode.AGX }), this.grade));
    this.B.setSize(this.w, this.h, false);
  }

  forceRenderer() {
    const gl = this.gl;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.shadowMap.autoUpdate = true;
    gl.toneMapping = THREE.NoToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace;
  }

  // ---------------------------------------------------------------- sets
  async ensureSet(id: string): Promise<SetEntry> {
    const have = this.sets.get(id);
    if (have) return have;
    const pending = this.building.get(id);
    if (pending) return pending;
    const p = this.buildSet(id);
    this.building.set(id, p);
    try { return await p; } finally { this.building.delete(id); }
  }
  async buildSet(id: string): Promise<SetEntry> {
    const builder = this.film.sets[id];
    if (!builder) throw new Error(`kit: film "${this.film.slug}" has no set "${id}"`);
    // memory: dispose least-recently-used sets beyond the cap, or all idle sets when the JS heap is over 1.1 GB (never
    // the current one; Chrome's performance.memory)
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;
    if (heap > 1.1e9) for (const s of [...this.sets.values()]) if (s !== this.curSet) this.disposeSet(s);
    while (this.sets.size >= this.q.maxSets) {
      const victim = [...this.sets.values()].filter((s) => s !== this.curSet).sort((a, b) => a.lastUsed - b.lastUsed)[0];
      if (!victim) break;
      this.disposeSet(victim);
    }
    const t0 = performance.now();
    const scene = new THREE.Scene(); scene.name = `set:${id}`;
    const updates: SetEntry["updates"] = [], practicals: Practical[] = [];
    const entry = { id, scene, updates, practicals, lastUsed: 0, buildMs: 0, shadowedPracticals: 0, compiled: new Set<string>(), frameHooks: [],
      nLights: { point: 0, spot: 0, rect: 0 }, warned: new Set<string>() } as unknown as SetEntry;
    const ctx: KitCtx = {
      gl: this.gl, scene, quality: this.quality, assets: this.assets, sun: this.sun, rig: this.rig, seed: 1, windT: this.windT,
      onUpdate: (fn) => { updates.push(fn); },
      sunCard: this.sunCard, size: { w: this.w, h: this.h }, fps: 30, setId: id,
      practical: (spec: PracticalSpec) => {
        let s = spec;
        if (s.light === false && s.shadow) s = { ...s, shadow: false };                 // a glow-only fixture casts nothing
        if (s.shadow && entry.shadowedPracticals >= LIGHT_BUDGET.shadowed) { console.warn(`kit: set "${id}": more than 2 shadowed practicals, shadow off for this one`); s = { ...s, shadow: false }; }
        if (s.shadow) entry.shadowedPracticals++;
        const pr = makePractical(this.rig, s, this.quality);
        practicals.push(pr);
        // the light budget (NOTES "Light budget"): every scene light is unrolled into every lit shader of the set
        if (s.light !== false) {
          const n = entry.nLights; n[s.kind]++;
          const over = n.rect > LIGHT_BUDGET.rect ? "rect" : n.point + n.spot + n.rect > LIGHT_BUDGET.total ? "total" : "";
          if (over && !entry.warned.has("budget")) {
            entry.warned.add("budget");
            console.warn(`kit: set "${id}" is over the light budget (${over}: ${n.rect} rect, ${n.spot} spot, ${n.point} point; budget ${LIGHT_BUDGET.total} lights, ${LIGHT_BUDGET.rect} rect). ` +
              `Every extra light is compiled into every material (slow start of every render tab) and shaded on every pixel: light a row of fixtures with ONE long rect practical and make the fixtures { light: false } (glow only).`);
          }
        }
        return pr;
      },
      onFrame: (fn) => { entry.frameHooks.push(fn); },
      renderAt: (tS, cam, target, opts) => this.renderAt(entry, tS, cam, target, opts),
    };
    if (this.cardMode === "map" && this.sunCard) {
      const hook = new THREE.Mesh(HOOK_GEO, HOOK_MAT);
      hook.name = "kit-card-map-hook"; hook.frustumCulled = false; hook.renderOrder = -1e9; hook.castShadow = false; hook.receiveShadow = false;
      hook.layers.enableAll();
      hook.onBeforeRender = (r, sc, camera) => {
        if (!this.cardPending || camera !== this.cam || !this.sunCard) return;
        this.cardPending = false; this.sunCard.shadow.needsUpdate = true;
        r.shadowMap.render([this.sunCard], sc as THREE.Scene, camera);
      };
      scene.add(hook);
    }
    entry.ctx = ctx;
    const built = await builder(ctx);
    entry.built = built;
    scene.add(built.object);
    const nSeeded = seedAll(scene);
    entry.buildMs = performance.now() - t0;
    console.warn(`kit set "${id}" built in ${entry.buildMs.toFixed(0)} ms (${nSeeded} materials seeded)`);
    this.sets.set(id, entry);
    return entry;
  }
  disposeSet(s: SetEntry) {
    console.warn(`kit: disposing set "${s.id}" (memory cap ${this.q.maxSets})`);
    try { s.built.dispose?.(); } catch (e) { console.error(e); }
    s.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const mt of mats) {
        for (const v of Object.values(mt)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
        mt.dispose();
      }
    });
    this.sets.delete(s.id);
    this.gi.cache.clear();
  }

  // ---------------------------------------------------------------- shots
  shadowFit(shot: ShotDef, built: Built) {
    const ext = shot.shadow?.ext ?? built.hints?.shadowExt ?? 25;
    let c: THREE.Vector3;
    const given = shot.shadow?.center ?? built.hints?.shadowCenter;
    if (given) c = new THREE.Vector3(...given);
    else {
      c = new THREE.Vector3();
      const n = 7;
      for (let i = 0; i < n; i++) {
        const s = shot.cam((shot.from + ((shot.to - 1 - shot.from) * i) / (n - 1)) / 30);
        const f = new THREE.Vector3(s.look[0] - s.pos[0], 0, s.look[2] - s.pos[2]);
        if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
        f.normalize();
        c.add(new THREE.Vector3(s.pos[0], 0, s.pos[2]).addScaledVector(f, ext * 0.42));
      }
      c.multiplyScalar(1 / n);
    }
    return { c, ext };
  }
  probeFor(shot: ShotDef, built: Built): V3 | null {
    if (shot.probe === false) return null;
    if (shot.probe) return shot.probe;
    if (built.hints?.probe) return built.hints.probe;
    const acc = [0, 0, 0], n = 5;
    for (let i = 0; i < n; i++) {
      const s = shot.cam((shot.from + ((shot.to - 1 - shot.from) * i) / (n - 1)) / 30);
      const d = [s.look[0] - s.pos[0], s.look[1] - s.pos[1], s.look[2] - s.pos[2]], L = Math.hypot(d[0], d[1], d[2]) || 1, k = Math.min(L, 8) / L;
      acc[0] += s.pos[0] + d[0] * k; acc[1] += s.pos[1] + d[1] * k; acc[2] += s.pos[2] + d[2] * k;
    }
    const p: V3 = [acc[0] / n, Math.max(1.2, acc[1] / n), acc[2] / n];
    return [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2, Math.round(p[2] * 2) / 2];
  }
  placeSun(L: THREE.Vector3, c: THREE.Vector3, ext: number, diamDeg: number, s: THREE.DirectionalLight) {
    const dist = Math.max(48, ext * 1.9);
    const cam = s.shadow.camera;
    cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext; cam.near = 0.5; cam.far = dist * 2;
    cam.updateProjectionMatrix();
    const tex = s.shadow.mapSize.x / (2 * ext);
    s.shadow.radius = 50 + (cam.far - cam.near) * ((diamDeg * Math.PI) / 180) * tex;
    s.target.position.copy(c); s.position.copy(c).addScaledVector(L, dist);
    s.target.updateMatrixWorld(); s.updateMatrixWorld();
  }
  /** make shot `idx` current: set, rig, sky, sun box, warm-up shadow render, bounce probe */
  async activate(idx: number) {
    const shot = this.film.shots[idx];
    const set = await this.ensureSet(shot.set);
    // the rig, adapted by the SET (Built.hints: its ground albedo, its rigOpts), then the shot's rigOpts, then the
    // command line (kit.rigOpts, look experiments)
    const hints = set.built.hints, setOpts: Partial<RigSpec> = { ...(hints?.groundAlbedo ? { groundAlbedo: hints.groundAlbedo } : {}), ...(hints?.rigOpts ?? {}) };
    const rig: RigSpec = { ...resolveRig(this.on.rig ?? shot.rig, this.film.rigs, this.on.rig ? undefined : shot.rigOpts, setOpts), ...(this.on.rigOpts ?? {}) };
    const rigKey = JSON.stringify(rig);
    const { c, ext } = this.shadowFit(shot, set.built);
    const probe = this.probeFor(shot, set.built);
    const scene = set.scene;
    // ---- sky / IBL (the IBL may come from another HDRI or a procedural environment: rig.env) ----
    const skyTex = await this.assets.hdri(rig.hdri, rig.envRes ?? "2k");
    const sky = scanSky(skyTex, rig.clampEnv);
    const env = rig.env ? (rig.env.startsWith("proc:") ? envTexture(rig.env) : await this.assets.hdri(rig.env, rig.envRes ?? "2k")) : skyTex;
    const envInfo = env === skyTex ? sky : scanSky(env);
    let bg: THREE.Texture = skyTex;
    if (rig.showSky !== false && this.q.bg4k && rig.hdriRes === "4k") {
      try { const t4 = await this.assets.hdri(rig.hdri, "4k"); scanSky(t4, rig.clampBg ?? sky.median * 100); bg = t4; } catch { /* 2k is fine */ }
    }
    // a DAYLIGHT rig whose IBL was swapped (a set's hints.rigOpts.env: an enclosed car / cab) keeps the drawn sky's haze
    fillRigState(this.rig, rig, envInfo, env !== skyTex && !rig.night && !rig.interior && rig.showSky !== false ? sky : null);
    const L = new THREE.Vector3(...sunDirOf(rig));
    const myAz = Math.atan2(L.z, L.x), rotY = myAz - sky.sunAz + ((rig.hdriRotDeg ?? 0) * Math.PI) / 180;
    scene.environment = pmremOf(this.gl, env);
    scene.background = rig.showSky === false ? (this.rig.fogColor ?? new THREE.Color(0.5, 0.55, 0.6)).clone() : bg;
    scene.backgroundRotation.set(0, rotY, 0); scene.environmentRotation.set(0, rotY, 0);
    scene.environmentIntensity = this.rig.envIntensity ?? 1;
    // the drawn sky is normalised by ITS OWN level (when the IBL comes from rig.env, envIntensity belongs to the env)
    scene.backgroundIntensity = (rig.skyLevel / Math.max(sky.meanSky, 1e-4)) * (rig.bgK ?? 1);
    if (rig.fog > 0) {
      if (scene.fog instanceof THREE.FogExp2) { scene.fog.color.copy(this.rig.fogColor!); scene.fog.density = rig.fog; }
      else scene.fog = new THREE.FogExp2(this.rig.fogColor!.getHex(), rig.fog);
      if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(this.rig.fogColor!);
    } else scene.fog = null;
    // ---- the sun + the card light (same direction) into this set's scene ----
    this.sun.color.copy(this.rig.sunColor); this.sun.intensity = Math.max(0, rig.sunIntensity);
    this.sun.visible = rig.sunIntensity > 0;          // no sun (underground): no sun shadow pass, no sun lookups
    this.placeSun(L, c, ext, rig.sunDiamDeg ?? 0.62, this.sun);
    if (this.sunCard) this.placeSun(L, c, ext, Math.min(rig.sunDiamDeg ?? 0.62, 0.45), this.sunCard);
    // fixed order: sun first, (scene mode) card light second (directionalShadowMap[0] / [1]). Map mode: the card light
    // is NOT in the scene (the hook mesh renders its map once per output frame)
    for (const o of [this.sun, this.sun.target, this.gi.probe, this.gi.hemi, ...(this.sunCard ? [this.sunCard, this.sunCard.target] : [])]) scene.remove(o);
    scene.add(this.sun, this.sun.target, this.gi.probe, this.gi.hemi);
    if (this.cardMode === "scene" && this.sunCard) scene.add(this.sunCard, this.sunCard.target);
    scene.children.sort((a, b) => (a === this.sun ? -2 : a === this.sunCard ? -1 : 0) - (b === this.sun ? -2 : b === this.sunCard ? -1 : 0));
    // ---- grade / bloom ----
    this.grade.set({ sat: rig.sat ?? 1.9, shadowSat: rig.shadowSat ?? 1.35, contrast: rig.contrast ?? 0.24, vig: rig.vig ?? 0.2, grain: rig.grain ?? 0.012,
      expo: rig.gradeExpo ?? 1.2, hiTint: rig.hiTint ?? [1.012, 1, 0.975], loTint: rig.loTint ?? [0.985, 1, 1.02] });
    this.copy.setWarmth(rig.warmth ?? 0);
    this.bloom.intensity = rig.bloom ?? 0.42;
    this.bloom.luminanceMaterial.threshold = rig.bloomThreshold ?? 1.05;
    // ---- passes see this scene ----
    this.rp.mainScene = scene;
    if (this.n8) this.n8.scene = scene;
    this.curSet = set; set.lastUsed = ++this.tick;
    this.cur = { idx, rig, rigKey, center: c, ext, probe };
    // ---- warm-up at the shot start: compile EVERY material of the set for this rig (also those outside the first
    // view: otherwise the GI cube or a later pan compiles them, 6 s measured), then one plain render so the shadow
    // maps exist before the shafts / probe read them ----
    this.forceRenderer();
    this.placeCam(shot.cam(shot.from / 30), 0, 0, 0, 0);
    const fresh = !set.compiled.has(rigKey), tc = performance.now();
    // (1) PRE-COMPILE, before the first update: many sets render the scene inside their first update (a cube capture for
    // local reflections, CARDS' fill probes). A render before the programs exist compiles them ONE BY ONE on the main
    // thread (the page is blocked; NYC's station: > 243 s); compileAsync builds them in parallel off the main thread.
    const pre = fresh && this.on.pre !== false ? await this.compileSet(scene) : null;
    const tu = performance.now();
    this.runUpdates(set, shot.from / 30);
    scene.updateMatrixWorld();
    const updMs = performance.now() - tu;
    if (fresh) {
      // (2) again after the updates: whatever they added or switched (new objects, another light count)
      const post = await this.compileSet(scene);
      set.compiled.add(rigKey);
      const nl = this.countLights(scene);
      console.warn(`kit compile for set "${set.id}" / rig "${rig.name}": ${(performance.now() - tc).toFixed(0)} ms` +
        ` (pre ${pre ? pre.ms.toFixed(0) : "off"} + first updates ${updMs.toFixed(0)} + post ${post.ms.toFixed(0)}; ${(pre?.added ?? 0) + post.added} programs, ${this.gl.info.programs?.length ?? 0} live;` +
        ` lights: ${nl.dir} dir, ${nl.spot} spot, ${nl.point} point, ${nl.rect} rect, ${nl.shadowed} shadowed)`);
      if (pre && post.added > Math.max(8, pre.added * 0.5)) console.warn(`kit: set "${set.id}": its first update changed the shaders of ${post.added} materials (compiled twice). ` +
        `Usual cause: a light, or a group that holds a light, starts with .visible = false (the light count changes). Keep lights visible; dim with lamp.set(0).`);
    }
    this.shotFrames = 0;
    this.cardOnce();
    const tw = performance.now(), pw = this.gl.info.programs?.length ?? 0;
    this.gl.setRenderTarget(this.accRT); this.gl.render(scene, this.cam); this.gl.setRenderTarget(null);
    if (fresh) {
      // the first real draw of every program (the shadow depth programs are built here too). Read one pixel back so the
      // time is real (gl.finish returns early on ANGLE)
      const px = new Uint8Array(4), c = this.gl.getContext(); c.readPixels(0, 0, 1, 1, c.RGBA, c.UNSIGNED_BYTE, px);
      console.warn(`kit warm-up render for set "${set.id}": ${(performance.now() - tw).toFixed(0)} ms (${(this.gl.info.programs?.length ?? 0) - pw} more programs)`);
    }
    // ---- bounce ----
    const giK = rig.gi ?? 1;
    const useProbe = this.q.giCube > 0 && probe && this.on.gi !== false && giK > 0;
    if (useProbe) {
      try {
        const ms = await bakeProbe(this.gl, scene, this.gi, `${set.id}|${rigKey}|${probe!.join(",")}|${this.q.giCube}`, probe!, this.q.giCube);
        this.gi.probe.intensity = giK; setGroundBounce(this.gi, rig, this.rig, 0);
        probeBounce(this.gi, giK, this.rig.bounce!);
        if (ms) console.warn(`kit GI probe for shot "${shot.id}" at [${probe!.join(", ")}]: ${ms.toFixed(0)} ms`);
      } catch (e) {
        console.error("kit GI probe failed, ground bounce only", e);
        this.gi.probe.intensity = 0; setGroundBounce(this.gi, rig, this.rig, this.on.gi === false ? 0 : giK);
      }
    } else {
      this.gi.probe.intensity = 0; setGroundBounce(this.gi, rig, this.rig, this.on.gi === false ? 0 : giK);
    }
  }
  /** compile every material of the set for the current light state, in parallel (KHR_parallel_shader_compile), into the
   *  accumulation target: programs for render targets are the LINEAR-output variants (compiling with the screen bound
   *  builds sRGB variants nobody uses; measured: the GI cube then still compiled 1.6-2 s) */
  async compileSet(scene: THREE.Scene) {
    const t0 = performance.now(), p0 = this.gl.info.programs?.length ?? 0;
    this.gl.setRenderTarget(this.accRT);
    try { await this.gl.compileAsync(scene, this.cam); } catch (e) { console.warn("kit compileAsync failed (compiling lazily)", e); }
    this.gl.setRenderTarget(null);
    return { ms: performance.now() - t0, added: (this.gl.info.programs?.length ?? 0) - p0 };
  }
  /** the lights three will unroll into every lit shader of this scene (visible ones only, like the renderer) */
  countLights(scene: THREE.Scene) {
    const n = { dir: 0, spot: 0, point: 0, rect: 0, shadowed: 0 };
    scene.traverseVisible((o) => {
      const l = o as THREE.Light & { isDirectionalLight?: boolean; isSpotLight?: boolean; isPointLight?: boolean; isRectAreaLight?: boolean };
      if (!l.isLight) return;
      if (l.isDirectionalLight) n.dir++; else if (l.isSpotLight) n.spot++; else if (l.isPointLight) n.point++; else if (l.isRectAreaLight) n.rect++; else return;
      if (l.castShadow) n.shadowed++;
    });
    return n;
  }
  /** once per output frame: a practical hidden by .visible = false (on itself or any parent) changes the light count,
   *  and every material of the set compiles a new program (a stall of seconds to minutes). Warn once per set. */
  checkPracticals(set: SetEntry) {
    if (set.warned.has("hidden")) return;
    for (const p of set.practicals) {
      if (!p.light.parent) continue;                                   // a glow-only fixture (light: false)
      let o: THREE.Object3D | null = p.light;
      while (o && o.visible) o = o.parent;
      if (o) {
        set.warned.add("hidden");
        console.warn(`kit: set "${set.id}": a practical is hidden (.visible = false on "${o.name || o.type}"). A light that appears / disappears makes every ` +
          `material compile a new shader (a stall). Keep the lamp and its parents visible and dim it with lamp.set(0); hide the fixture MESH instead.`);
        return;
      }
    }
  }
  runUpdates(set: SetEntry, t: number, cam: THREE.Camera = this.cam) {
    this.windT.value = t + 3.0;
    set.built.update?.(t, cam);
    for (const fn of set.updates) fn(t, cam);
    for (const p of set.practicals) p.update(t);
  }
  /** the card light's map: rendered with the next main render (scene mode: needsUpdate; map mode: the hook) */
  cardOnce() {
    if (!this.sunCard) return;
    if (this.cardMode === "scene") this.sunCard.shadow.needsUpdate = true; else this.cardPending = true;
  }
  /** ctx.renderAt: this set at scene time tS from `cam` into `target` (screens, replays) */
  renderAt(set: SetEntry, tS: number, cam: THREE.Camera, target: THREE.WebGLRenderTarget, opts?: { hide?: THREE.Object3D[]; clear?: THREE.Color }) {
    const gl = this.gl;
    this.runUpdates(set, tS, cam);
    const hid = (opts?.hide ?? []).filter((o) => o.visible);
    for (const o of hid) o.visible = false;
    set.scene.updateMatrixWorld();
    const keepRT = gl.getRenderTarget(), keepC = gl.getClearColor(new THREE.Color()), keepA = gl.getClearAlpha();
    gl.setRenderTarget(target); gl.setClearColor(opts?.clear ?? new THREE.Color(0, 0, 0), 1);
    gl.render(set.scene, cam);
    gl.setRenderTarget(keepRT); gl.setClearColor(keepC, keepA);
    for (const o of hid) o.visible = true;
  }
  placeCam(c: CamState, ox: number, oy: number, jx: number, jy: number) {
    const cam = this.cam;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); if (c.roll) cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.aspect = this.w / this.h; cam.near = 0.05; cam.far = 2500; cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    if (ox || oy || jx || jy) {
      const R = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), U = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      cam.position.addScaledVector(R, ox).addScaledVector(U, oy);
      cam.updateMatrixWorld();
      const F = Math.max(0.05, c.focus ?? Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]));
      const e = cam.projectionMatrix.elements;
      e[8] -= (e[0] * ox) / F + (2 * jx) / this.w;
      e[9] -= (e[5] * oy) / F + (2 * jy) / this.h;
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    }
  }

  /** prepare output frame f (async: set build, rig, probe) */
  async prepare(f: number) {
    const idx = shotIndexAt(this.film, f);
    if (!this.cur || this.cur.idx !== idx) await this.activate(idx);
  }
  /** render output frame f (sync; after prepare) */
  render(f: number) {
    const shot = this.film.shots[this.cur!.idx], set = this.curSet!, rig = this.cur!.rig;
    this.forceRenderer();
    set.lastUsed = ++this.tick;
    const N = this.q.mb, shutter = this.on.shutter ?? shot.shutter ?? 0.5;
    const sunCol = this.rig.sunColor.clone().multiplyScalar(this.sun.intensity);
    const steps = this.q.shafts;
    const progs0 = this.gl.info.programs?.length ?? 0, tr0 = performance.now();
    this.checkPracticals(set);
    // once-per-frame hooks (screens: they render the set at their own time / camera first)
    if (set.frameHooks.length) { const th = performance.now(); for (const fn of set.frameHooks) fn(f / 30, f); this.frameMs = performance.now() - th; }
    this.acc.first = true; this.acc.weight = (this.on.exposure ?? rig.exposure) / N;
    for (let i = 0; i < N; i++) {
      const u = N === 1 ? 0.5 : (i + 0.5) / N;
      const t = (f + (N === 1 ? 0 : shutter * (u - 0.5))) / 30;
      const c = shot.cam(t);
      let ox = 0, oy = 0, jx = 0, jy = 0;
      if (N > 1) {
        const fnum = this.on.fnum ?? c.fnum ?? 4;
        const apR = (lensMM(c.fov) / fnum / 2) / 1000;
        const r = Math.sqrt((i + 0.5) / N) * apR, a = i * 2.39996 + f * 0.7;
        ox = r * Math.cos(a); oy = r * Math.sin(a);
        jx = halton(i + 1 + (f % 7) * N, 2) - 0.5; jy = halton(i + 1 + (f % 7) * N, 3) - 0.5;
      }
      this.placeCam(c, ox, oy, jx, jy);
      KIT_SEED.value = (i * 7 + f * 3) % 61;
      this.runUpdates(set, t);
      set.scene.updateMatrixWorld();
      this.sun.shadow.updateMatrices(this.sun);
      if (i === 0) this.cardOnce();
      this.acc.setVolume(this.sun, this.cam, sunCol, rig.haze, KIT_SEED.value, steps);
      this.A.render(1 / 30);
    }
    this.grade.u("seed").value = (f * 13.17) % 101;
    this.B.render(1 / 30);
    // the recompile watch: after a shot's first frame (depth / post / screen programs appear there) no new program should
    // be needed. New ones mid-shot = a stall; the usual cause is a light count that changed (a light or its parent hidden)
    const added = (this.gl.info.programs?.length ?? 0) - progs0;
    if (added > 0 && this.shotFrames > 0) console.warn(`kit-recompile frame ${f} (shot ${shot.id}, set "${set.id}"): ${added} new shader programs, ${(performance.now() - tr0).toFixed(0)} ms. ` +
      `Something changed mid-shot: a light (or a group holding one) switched .visible, an object with a new material appeared, or material.needsUpdate was set.`);
    this.shotFrames++;
  }

  /** per-module cost (ms, gl.finish-timed) at the current frame: logged once per tab when inputProps.kit.prof */
  profile(f: number) {
    const gl = this.gl, ctx = gl.getContext();
    // a REAL sync: gl.finish() returns early on ANGLE / D3D11 (CARDS' finding); reading one pixel back cannot
    const px = new Uint8Array(4);
    const sync = () => { gl.setRenderTarget(null); ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px); };
    const time = (fn: () => void, n = 3) => { fn(); sync(); const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); sync(); return (performance.now() - t0) / n; };
    const set = this.curSet!, shot = this.film.shots[this.cur!.idx], rig = this.cur!.rig;
    const sunCol = this.rig.sunColor.clone().multiplyScalar(this.sun.intensity);
    const sub = () => { this.acc.first = true; this.acc.weight = 1; this.acc.setVolume(this.sun, this.cam, sunCol, rig.haze, 1, this.q.shafts); this.A.render(1 / 30); };
    this.placeCam(shot.cam(f / 30), 0, 0, 0, 0);
    const full = time(sub);
    this.sun.shadow.autoUpdate = false; const noSun = time(sub); this.sun.shadow.autoUpdate = true;
    const n8on = this.n8?.enabled ?? false; if (this.n8) this.n8.enabled = false; const noAO = time(sub); if (this.n8) this.n8.enabled = n8on;
    const vol = this.acc.vol; this.acc.vol = false; const noVol = time(sub); this.acc.vol = vol;
    this.sun.shadow.autoUpdate = false;
    const scene = time(() => { gl.setRenderTarget(this.accRT); gl.render(set.scene, this.cam); gl.setRenderTarget(null); });
    this.sun.shadow.autoUpdate = true;
    const card = this.sunCard ? time(() => { this.cardOnce(); this.sun.shadow.autoUpdate = false; gl.setRenderTarget(this.accRT); gl.render(set.scene, this.cam); gl.setRenderTarget(null); this.sun.shadow.autoUpdate = true; }) - scene : 0;
    const post = time(() => this.B.render(1 / 30));
    const upd = (() => { const t0 = performance.now(); for (let i = 0; i < 3; i++) this.runUpdates(set, f / 30 + i * 0.01); return (performance.now() - t0) / 3; })();
    const res = { frame: f, shot: shot.id, frameHooks_ms: +this.frameMs.toFixed(1), cardLight: this.cardMode, subframe_ms: +full.toFixed(1), set: set.id, w: this.w, h: this.h, quality: this.quality, sunShadow_ms: +(full - noSun).toFixed(1),
      cardShadowOnce_ms: +card.toFixed(1), ao_ms: +(full - noAO).toFixed(1), shafts_ms: +(full - noVol).toFixed(1), mainPass_ms: +scene.toFixed(1), post_ms: +post.toFixed(1),
      updates_cpu_ms: +upd.toFixed(1), giProbe_ms: +this.gi.lastMs.toFixed(0), setBuild_ms: +set.buildMs.toFixed(0), mb: this.q.mb };
    console.warn("kit-prof " + JSON.stringify(res));
  }
}

// ================================================================ React side
const Inner: React.FC<{ film: Film; quality: Quality; on: KitProps; frame: number }> = ({ film, quality, on, frame }) => {
  const { gl } = useThree();
  const rtRef = useRef<KitRuntime | null>(null);
  const pend = useRef<{ f: number; h: number } | null>(null);
  const [rt, setRt] = useState<KitRuntime | null>(null);
  useEffect(() => {
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace;
    const dbg = gl.getContext().getExtension("WEBGL_debug_renderer_info");
    if (dbg) console.warn("kit GPU:", gl.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    const r = new KitRuntime(gl, film, quality, on);
    rtRef.current = r; setRt(r);
  }, [gl, film, quality, on]);
  useLayoutEffect(() => {
    if (!rt) return;
    const h = delayRender(`kit frame ${frame}`, { timeoutInMilliseconds: 290000 });
    let dead = false;
    rt.prepare(frame).then(() => { if (!dead) pend.current = { f: frame, h }; else continueRender(h); }).catch((e) => { console.error("kit prepare failed", e); cancelRender(e); });
    return () => { dead = true; if (pend.current && pend.current.h === h) { pend.current = null; continueRender(h); } };
  }, [rt, frame]);
  useFrame(() => {
    const p = pend.current, r = rtRef.current;
    if (!p || !r) return;
    pend.current = null;
    try {
      const t0 = performance.now();
      r.render(p.f);
      gl.getContext().finish();
      const ms = performance.now() - t0;
      const every = on.log ?? 1;
      if (every > 0 && p.f % every === 0) console.warn(`kit-ms ${p.f} ${ms.toFixed(0)} ${film.shots[r.cur!.idx].id} mb${r.q.mb}`);
      if (on.prof && !r.profDone) { r.profDone = true; r.profile(p.f); r.render(p.f); gl.getContext().finish(); }
    } catch (e) { console.error("kit render failed", e); cancelRender(e as Error); return; }
    continueRender(p.h);
  }, 1);
  return null;
};

export type KitFilmProps = { film: Film; quality?: Quality; overlay?: (f: KitFrameInfo) => React.ReactNode; background?: string };
/** the whole film: one ThreeCanvas (the kit pipeline) + React DOM overlays above it */
export const KitFilm: React.FC<KitFilmProps> = ({ film, quality = "preview", overlay, background = "#9fb8d6" }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const on = useMemo(readProps, []);
  const q: Quality = on.quality ?? quality;
  const idx = shotIndexAt(film, frame), shot = film.shots[idx];
  const info: KitFrameInfo = { frame, t: frame / 30, shot, shotIndex: idx, local: frame - shot.from, quality: q };
  return (
    <AbsoluteFill style={{ background }}>
      {/* dpr = the page's devicePixelRatio = the Remotion render scale (R3F's default [1, 2] clamp would render a 0.5-scale
          preview at full size and downscale it) */}
      <ThreeCanvas width={width} height={height} flat shadows="percentage" dpr={typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1}
        gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ fov: 72, near: 0.05, far: 2500 }}>
        <Inner film={film} quality={q} on={on} frame={frame} />
      </ThreeCanvas>
      {overlay ? <KitFrameCtx.Provider value={info}><AbsoluteFill style={{ pointerEvents: "none" }}>{overlay(info)}</AbsoluteFill></KitFrameCtx.Provider> : null}
    </AbsoluteFill>
  );
};

// ================================================================ composition + shot summary (read by kit_render.mjs)
export type KitShotInfo = { id: string; from: number; to: number; set: string; rig: string; sig: string;
  cam: { median: number; p90: number; fast: number; still: number } };
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
/** the per-shot summary kit_render.mjs hashes: id / frames / set / rig + a signature of every sampled camera frame and the
 *  resolved rig, + the camera speed stats (look_metrics formula) for WORKFLOW's validator */
export const summarizeFilm = (film: Film): KitShotInfo[] => film.shots.map((s) => {
  const cams: number[] = [];
  for (let f = s.from; f < s.to; f++) {
    for (const k of [-0.25, 0, 0.25]) {
      const c = s.cam((f + k) / 30);
      cams.push(...c.pos.map(r5), ...c.look.map(r5), r5(c.fov), r5(c.roll ?? 0), r5(c.focus ?? -1), r5(c.fnum ?? -1));
    }
  }
  const rig = resolveRig(s.rig, film.rigs, s.rigOpts);
  const sig = hashStr(JSON.stringify({ id: s.id, from: s.from, to: s.to, set: s.set, rig, shadow: s.shadow ?? null, shutter: s.shutter ?? null, probe: s.probe ?? null, cams }));
  const st = camSpeedStats(s.cam, s.from, s.to);
  return { id: s.id, from: s.from, to: s.to, set: s.set, rig: s.rig, sig, cam: { median: +st.median.toFixed(3), p90: +st.p90.toFixed(3), fast: +st.fastShare.toFixed(3), still: +st.stillShare.toFixed(3) } };
});
/** validate a film's shot list (contiguous, sorted, covering [0, total), known sets) */
export const checkFilm = (film: Film) => {
  const errs: string[] = [];
  let at = 0;
  for (const s of film.shots) {
    if (s.from !== at) errs.push(`shot ${s.id}: starts at ${s.from}, expected ${at}`);
    if (s.to <= s.from) errs.push(`shot ${s.id}: empty`);
    if (!film.sets[s.set]) errs.push(`shot ${s.id}: unknown set ${s.set}`);
    at = s.to;
  }
  if (at !== film.total) errs.push(`shots end at ${at}, film.total is ${film.total}`);
  return errs;
};

/** a Remotion <Composition> for a kit film (1080x1920 @ 30). Its default props carry `kitShots` (see summarizeFilm). */
export const KitComposition: React.FC<{ id: string; film: Film; quality?: Quality; overlay?: (f: KitFrameInfo) => React.ReactNode }> = ({ id, film, quality = "preview", overlay }) => {
  const Comp = useMemo(() => {
    const C: React.FC<Record<string, unknown>> = () => <KitFilm film={film} quality={quality} overlay={overlay} />;
    C.displayName = `KitFilm(${film.slug})`;
    return C;
  }, [film, quality, overlay]);
  const kitShots = useMemo(() => {
    const errs = checkFilm(film);
    if (errs.length) console.error(`kit film "${film.slug}": ` + errs.join("; "));
    return summarizeFilm(film);
  }, [film]);
  return <Composition id={id} component={Comp} durationInFrames={film.total} fps={30} width={1080} height={1920} defaultProps={{ kitShots, kitSlug: film.slug }} />;
};

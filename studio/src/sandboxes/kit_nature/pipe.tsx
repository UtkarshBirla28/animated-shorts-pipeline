// kit_nature sandbox pipeline: a copy of the look pilot's (sandboxes/lookpilot/LookPilot.tsx) N-sub-frame accumulation
// pipeline (thin-lens DOF + Halton AA + shutter motion blur -> N8AO -> shafts -> accumulate; bloom -> AgX -> grade), using
// CORE's shaders (KIT_SEED, AccumPass, CopyFromPass, KitGrade) and asset loader, until CORE's <KitFilm> is proven.
// inputProps { kn: { scene: "a" | "b", mb, fnum, ao, vol, probe: true (log GPU ms per module), off: "trees,grass" } }
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction, type Pass } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { KIT_SEED, AccumPass, CopyFromPass, KitGrade, seedAll } from "../../kit/core/shaders";
import { makeAssets } from "../../kit/core/assets";
import type { KitCtx, CamState } from "../../kit/core/ctx";

export type KnProps = { scene?: string; mb?: number; fnum?: number; ao?: boolean; vol?: boolean; probe?: boolean; off?: string; expo?: number; dens?: number; shutter?: number; cam?: string };
export type KWorld = {
  ctx: KitCtx; update: (t: number, cam: THREE.Camera) => void; cam: (t: number) => CamState; focus: (t: number) => number;
  modules: Record<string, THREE.Object3D[]>; haze: number;
};
const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

export const makeCtx = (gl: THREE.WebGLRenderer): KitCtx => {
  const ups: ((t: number, c: THREE.Camera) => void)[] = [];
  const ctx: KitCtx = {
    gl, scene: new THREE.Scene(), quality: "final", assets: makeAssets(gl), sun: null, sunCard: null, seed: 1, windT: { value: 3 },
    rig: { name: "golden", sunDir: [0, 1, 0], sunColor: new THREE.Color(1, 0.86, 0.69), sunIntensity: 7.2, exposure: 1.2, hazeDensity: 0.0012 },
    onUpdate: (fn) => ups.push(fn),
    size: { w: gl.getDrawingBufferSize(new THREE.Vector2()).x, h: gl.getDrawingBufferSize(new THREE.Vector2()).y },
  };
  (ctx as KitCtx & { _ups: typeof ups })._ups = ups;
  return ctx;
};
export const runUpdates = (ctx: KitCtx, t: number, cam: THREE.Camera) => { for (const f of (ctx as KitCtx & { _ups: ((t: number, c: THREE.Camera) => void)[] })._ups) f(t, cam); };

type Pipe = { W: KWorld; cam: THREE.PerspectiveCamera; A: EffectComposer; B: EffectComposer; acc: AccumPass; accRT: THREE.WebGLRenderTarget; grade: KitGrade; w: number; h: number };
const makePipe = (gl: THREE.WebGLRenderer, W: KWorld, w: number, h: number, on: KnProps): Pipe => {
  const scene = W.ctx.scene;
  const cam = new THREE.PerspectiveCamera(72, w / h, 0.05, 2500);
  const A = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 }); A.autoRenderToScreen = false;
  A.addPass(new RenderPass(scene, cam));
  const n8 = new N8AOPostPass(scene, cam, w, h);
  Object.assign(n8.configuration, { aoRadius: 0.9, distanceFalloff: 0.6, intensity: 2.2, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 8, halfRes: true, gammaCorrection: false, screenSpaceRadius: false });
  if (on.ao !== false) A.addPass(n8 as unknown as Pass);   // (core n8ao.d.ts: optional setDepthTexture clashes with Pass)
  const accRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  const acc = new AccumPass(accRT); acc.vol = on.vol !== false; A.addPass(acc); A.setSize(w, h, false);
  const B = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  B.addPass(new CopyFromPass(accRT.texture));
  const bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.42, luminanceThreshold: 1.05, luminanceSmoothing: 0.35, mipmapBlur: true, radius: 0.72, levels: 7 });
  const grade = new KitGrade();
  B.addPass(new EffectPass(cam, bloom, new ToneMappingEffect({ mode: ToneMappingMode.AGX }), grade)); B.setSize(w, h, false);
  const c0 = W.cam(0); cam.position.set(...c0.pos); cam.lookAt(...c0.look); cam.updateProjectionMatrix(); W.update(0, cam);
  scene.updateMatrixWorld(); gl.setRenderTarget(accRT); gl.render(scene, cam); gl.setRenderTarget(null);
  return { W, cam, A, B, acc, accRT, grade, w, h };
};

const tmpR = new THREE.Vector3(), tmpU = new THREE.Vector3();
const subFrame = (P: Pipe, f: number, i: number, N: number, on: KnProps) => {
  const shutter = on.shutter ?? 0.5, fnum = on.fnum ?? 4, apR = (25 / fnum / 2) / 1000;
  const u = N === 1 ? 0.5 : (i + 0.5) / N, t = (f + (N === 1 ? 0 : shutter * (u - 0.5))) / 30;
  const c = P.W.cam(t), cam = P.cam;
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll ?? 0);
  cam.fov = c.fov; cam.aspect = P.w / P.h; cam.updateProjectionMatrix();
  const F = P.W.focus(t);
  let ox = 0, oy = 0, jx = 0, jy = 0;
  if (N > 1) {
    const r = Math.sqrt((i + 0.5) / N) * apR, a = i * 2.39996 + f * 0.7;
    ox = r * Math.cos(a); oy = r * Math.sin(a);
    jx = halton(i + 1 + (f % 7) * N, 2) - 0.5; jy = halton(i + 1 + (f % 7) * N, 3) - 0.5;
  }
  cam.updateMatrixWorld();
  tmpR.setFromMatrixColumn(cam.matrixWorld, 0); tmpU.setFromMatrixColumn(cam.matrixWorld, 1);
  cam.position.addScaledVector(tmpR, ox).addScaledVector(tmpU, oy); cam.updateMatrixWorld();
  const e = cam.projectionMatrix.elements;
  e[8] -= (e[0] * ox) / F + (2 * jx) / P.w; e[9] -= (e[5] * oy) / F + (2 * jy) / P.h;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  KIT_SEED.value = (i * 7 + f * 3) % 61;
  P.W.ctx.windT.value = t + 3;
  P.W.update(t, cam);
  P.W.ctx.scene.updateMatrixWorld();
  const sun = P.W.ctx.sun!;
  sun.shadow.updateMatrices(sun);
  P.acc.setVolume(sun, cam, sun.color.clone().multiplyScalar(sun.intensity), on.dens ?? P.W.haze, KIT_SEED.value, 32);
  P.A.render(1 / 30);
};
const renderFrame = (P: Pipe, gl: THREE.WebGLRenderer, f: number, on: KnProps) => {
  gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping;
  const N = Math.max(1, Math.round(on.mb ?? 1));
  P.acc.first = true; P.acc.weight = 1 / N;
  for (let i = 0; i < N; i++) subFrame(P, f, i, N, on);
  P.grade.u("seed").value = f * 13.17 % 101; P.grade.u("expo").value = on.expo ?? 1.2;
  P.B.render(1 / 30);
};
/** GPU ms per sub-frame for each module: full pipeline A with everything vs. with that module hidden (gl.finish timed) */
const probe = (P: Pipe, gl: THREE.WebGLRenderer, f: number, on: KnProps) => {
  // a 1-pixel readPixels forces the GPU to finish (gl.finish alone does not block under ANGLE)
  const px = new Float32Array(4), ctxGL = gl.getContext() as WebGL2RenderingContext;
  const sync = () => { gl.setRenderTarget(P.accRT); ctxGL.readPixels(0, 0, 1, 1, ctxGL.RGBA, ctxGL.FLOAT, px); gl.setRenderTarget(null); };
  const time = (reps: number) => { sync(); const t0 = performance.now(); for (let r = 0; r < reps; r++) { P.acc.first = true; P.acc.weight = 1; subFrame(P, f, 0, 1, on); } sync(); return (performance.now() - t0) / reps; };
  time(2);
  // min of 3 interleaved rounds (the GPU is shared with another session: take the least-disturbed sample)
  const mods = Object.entries(P.W.modules), best: Record<string, number> = { all: 1e9 };
  for (let round = 0; round < 3; round++) {
    best.all = Math.min(best.all, time(4));
    for (const [name, objs] of mods) {
      const vis = objs.map((o) => o.visible); objs.forEach((o) => (o.visible = false));
      best[name] = Math.min(best[name] ?? 1e9, time(4)); objs.forEach((o, k) => (o.visible = vis[k]));
    }
  }
  const out: string[] = [`all ${best.all.toFixed(1)}`, ...mods.map(([n]) => `${n} ${Math.max(0, best.all - best[n]).toFixed(1)}`)];
  console.warn(`kn probe f${f} ${P.w}x${P.h} ms/sub-frame: ${out.join(" | ")}`);
};

export const KnInner: React.FC<{ frame: number; on: KnProps; build: (ctx: KitCtx, on: KnProps) => Promise<KWorld> }> = ({ frame, on, build }) => {
  const { gl } = useThree();
  const [W, setW] = useState<KWorld | null>(null);
  const [h0] = useState(() => delayRender("kit_nature world", { timeoutInMilliseconds: 280000 }));
  useEffect(() => {
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace;
    const t0 = performance.now();
    build(makeCtx(gl), on).then((w) => {
      for (const name of (on.off ?? "").split(",").filter(Boolean)) (w.modules[name] ?? []).forEach((o) => (o.visible = false));
      seedAll(w.ctx.scene);
      console.warn(`kn world built in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
      setW(w); continueRender(h0);
    }).catch((e) => { console.error("kit_nature build failed", e); throw e; });
  }, [gl, h0, on, build]);
  const pipe = useMemo(() => { if (!W) return null; const sz = gl.getDrawingBufferSize(new THREE.Vector2()); return makePipe(gl, W, sz.x, sz.y, on); }, [W, gl, on]);
  const pend = useRef<number | null>(null);
  useLayoutEffect(() => { if (!pipe) return; pend.current = delayRender(`kit_nature frame ${frame}`, { timeoutInMilliseconds: 280000 }); }, [frame, pipe]);
  useFrame(() => {
    if (!pipe || pend.current === null) return;
    if (on.probe) probe(pipe, gl, frame, on);
    const t0 = performance.now();
    renderFrame(pipe, gl, frame, on); gl.getContext().finish();
    console.warn(`kn f${frame} ${(performance.now() - t0).toFixed(0)} ms (mb ${on.mb ?? 1}, ${pipe.w}x${pipe.h})`);
    const hh = pend.current; pend.current = null; continueRender(hh);
  }, 1);
  return null;
};

export const KnComp: React.FC<{ build: (ctx: KitCtx, on: KnProps) => Promise<KWorld> }> = ({ build }) => {
  const frame = useCurrentFrame();
  const on = useMemo(() => ((getInputProps() as { kn?: KnProps }).kn ?? {}), []);
  return (
    <AbsoluteFill style={{ background: "#9fb8d6" }}>
      <ThreeCanvas width={1080} height={1920} gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ fov: 72, near: 0.05, far: 2500 }} flat shadows="percentage">
        <KnInner frame={frame} on={on} build={build} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

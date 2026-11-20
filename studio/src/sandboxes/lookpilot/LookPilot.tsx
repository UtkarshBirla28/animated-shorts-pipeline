// LOOK PILOT, three.js route (2026-11-19): one 5-s 1080x1920 test shot toward a game-engine-lit look, in our own pipeline.
// Per output frame: N sub-frames inside a 180-degree shutter, each with its own lens position (thin-lens DOF), sub-pixel
// jitter (AA), noise seed and scene time (camera + character + foliage motion blur), rendered HDR -> N8AO -> volumetric
// sun shafts -> accumulated; then bloom -> AgX -> calm grade on the average. inputProps: { mb: sub-frames (default 1),
// fnum: aperture (default 4), ao: false = no N8AO, vol: false = no shafts, dbg: "nocard" }.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { buildWorld, type World } from "./world";
import { camAt, focusAt, FRAMES, LENS_MM } from "./shot";
import { patchShadowChunk, LP_SEED, VolumeEffect, AccumPass, CopyFromPass, LookGrade } from "./shaders";

export const LOOKPILOT_FRAMES = FRAMES;
type Props = { leaf?: string; vis?: number; top?: number; mb?: number; fnum?: number; ao?: boolean; vol?: boolean; shutter?: number; expo?: number; dens?: number };
patchShadowChunk();

const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

type Pipe = {
  world: World; cam: THREE.PerspectiveCamera; A: EffectComposer; B: EffectComposer; acc: AccumPass; accRT: THREE.WebGLRenderTarget;
  vol: VolumeEffect; n8: N8AOPostPass; grade: LookGrade; w: number; h: number;
};
const makePipe = (gl: THREE.WebGLRenderer, world: World, w: number, h: number, on: Props): Pipe => {
  const cam = new THREE.PerspectiveCamera(72, w / h, 0.05, 2500);
  cam.layers.set(0);
  const A = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  A.autoRenderToScreen = false;
  A.addPass(new RenderPass(world.scene, cam));
  const n8 = new N8AOPostPass(world.scene, cam, w, h);
  Object.assign(n8.configuration, { aoRadius: 0.9, distanceFalloff: 0.6, intensity: 2.2, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 8, halfRes: true, gammaCorrection: false, screenSpaceRadius: false });
  if (on.ao !== false) A.addPass(n8);
  const vol = new VolumeEffect();   // (kept for reference; the shafts are now computed inside AccumPass)
  const accRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  const acc = new AccumPass(accRT);
  acc.vol = on.vol !== false;
  A.addPass(acc);
  A.setSize(w, h, false);
  const B = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  B.addPass(new CopyFromPass(accRT.texture));
  const bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.42, luminanceThreshold: 1.05, luminanceSmoothing: 0.35, mipmapBlur: true, radius: 0.72, levels: 7 });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  const grade = new LookGrade();
  B.addPass(new EffectPass(cam, bloom, tone, grade));
  B.setSize(w, h, false);
  // warm-up: one plain render creates the shadow maps (the shafts and motes read them on the very first sub-frame)
  const c0 = camAt(0); cam.position.set(...c0.pos); cam.lookAt(...c0.look); cam.updateProjectionMatrix(); world.update(0, cam);
  world.scene.updateMatrixWorld(); gl.setRenderTarget(accRT); gl.render(world.scene, cam); gl.setRenderTarget(null);
  return { world, cam, A, B, acc, accRT, vol, n8, grade, w, h };
};

const tmpR = new THREE.Vector3(), tmpU = new THREE.Vector3();
/** render output frame f: N jittered sub-frames averaged in linear HDR, then the post on the average */
const renderFrame = (P: Pipe, gl: THREE.WebGLRenderer, f: number, on: Props) => {
  // R3F re-applies its Canvas props on every Remotion frame (it had switched the shadow maps OFF after the first frame
  // of each tab): force the shadow setup the pilot needs on every frame
  gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping;
  const N = Math.max(1, Math.round(on.mb ?? 1)), shutter = on.shutter ?? 0.5, fnum = on.fnum ?? 4;
  const apR = (LENS_MM / fnum / 2) / 1000;            // aperture radius in metres (thin lens)
  P.acc.first = true; P.acc.weight = 1 / N;
  for (let i = 0; i < N; i++) {
    const u = N === 1 ? 0.5 : (i + 0.5) / N;
    const t = (f + (N === 1 ? 0 : shutter * (u - 0.5))) / 30;
    const c = camAt(t), cam = P.cam;
    if (on.top) { const z = on.top; c.pos = [0.2, 3.7, z]; c.look = [0.2, 0, z - 0.001]; c.fov = 112; c.roll = 0; }  // debug: the light on the ground from under the canopy
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.aspect = P.w / P.h; cam.updateProjectionMatrix();
    // lens sample (Vogel disk, rotated per frame) + sub-pixel jitter (Halton 2,3)
    const F = focusAt(t);
    let ox = 0, oy = 0, jx = 0, jy = 0;
    if (N > 1) {
      const r = Math.sqrt((i + 0.5) / N) * apR, a = i * 2.39996 + f * 0.7;
      ox = r * Math.cos(a); oy = r * Math.sin(a);
      jx = halton(i + 1 + (f % 7) * N, 2) - 0.5; jy = halton(i + 1 + (f % 7) * N, 3) - 0.5;
    }
    cam.updateMatrixWorld();
    tmpR.setFromMatrixColumn(cam.matrixWorld, 0); tmpU.setFromMatrixColumn(cam.matrixWorld, 1);
    cam.position.addScaledVector(tmpR, ox).addScaledVector(tmpU, oy);
    cam.updateMatrixWorld();
    const e = cam.projectionMatrix.elements;
    e[8] -= (e[0] * ox) / F + (2 * jx) / P.w;
    e[9] -= (e[5] * oy) / F + (2 * jy) / P.h;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    LP_SEED.value = (i * 7 + f * 3) % 61;
    P.world.update(t, cam);
    P.world.motes.U.pxScale.value = P.h * cam.projectionMatrix.elements[5] * 0.5;
    // the sun shadow matrices are updated inside the render; the shafts read last sub-frame's matrix for sub-frame 0
    P.world.scene.updateMatrixWorld();
    P.world.sun.shadow.updateMatrices(P.world.sun);
    P.acc.setVolume(P.world.sun, cam, P.world.sunCol.clone().multiplyScalar(P.world.sun.intensity), on.dens ?? 0.0012, LP_SEED.value);
    P.A.render(1 / 30);
  }
  P.grade.u("seed").value = f * 13.17 % 101;
  P.grade.u("expo").value = on.expo ?? 1.2;
  P.B.render(1 / 30);
};

const Inner: React.FC<{ frame: number; on: Props }> = ({ frame, on }) => {
  const { gl } = useThree();
  const [world, setWorld] = useState<World | null>(null);
  const [h0] = useState(() => delayRender("lookpilot world", { timeoutInMilliseconds: 280000 }));
  useEffect(() => {
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace;
    const dbg = gl.getContext().getExtension("WEBGL_debug_renderer_info");
    if (dbg) console.warn("lookpilot GPU:", gl.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    buildWorld(gl, on.vis ?? 0, on.leaf ?? "twig").then((w) => { setWorld(w); continueRender(h0); }).catch((e) => { console.error("lookpilot build failed", e); throw e; });
  }, [gl, h0, on]);
  const pipe = useMemo(() => {
    if (!world) return null;
    const sz = gl.getDrawingBufferSize(new THREE.Vector2());
    return makePipe(gl, world, sz.x, sz.y, on);
  }, [world, gl, on]);
  const pend = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!pipe) return;
    pend.current = delayRender(`lookpilot frame ${frame}`, { timeoutInMilliseconds: 280000 });
  }, [frame, pipe]);
  useFrame(() => {
    if (!pipe || pend.current === null) return;
    const t0 = performance.now();
    renderFrame(pipe, gl, frame, on);
    gl.getContext().finish();
    if (frame % 10 === 0) console.warn(`lookpilot f${frame} ${(performance.now() - t0).toFixed(0)} ms (mb ${on.mb ?? 1})`);
    const hh = pend.current; pend.current = null; continueRender(hh);
  }, 1);
  return null;
};

export const LookPilot: React.FC = () => {
  const frame = useCurrentFrame();
  const on = useMemo(() => ((getInputProps() as { lp?: Props }).lp ?? {}), []);
  return (
    <AbsoluteFill style={{ background: "#9fb8d6" }}>
      <ThreeCanvas width={1080} height={1920} gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ fov: 72, near: 0.05, far: 2500 }} flat shadows="percentage">
        <Inner frame={frame} on={on} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

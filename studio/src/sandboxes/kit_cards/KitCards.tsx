// KIT CARDS sandbox (owner CARDS, 2026-11-19): proves kit/cards inside a COPY of the look pilot's pipeline (CORE's
// pipeline did not exist yet). Per output frame: N sub-frames (motion blur + thin-lens DOF + AA), each HDR -> N8AO ->
// sun shafts -> accumulated; bloom -> AgX -> the pilot's calm grade on the average.
// inputProps kc: { st: "a".."f" | "walk" | "pilot" | "crowd", mb (sub-frames), dbg (card debug view), meas (log costs),
//                  nocards (baseline cost), fnum, expo, dens, flat (form 0: the "flat card" comparison) }
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction, type Pass } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { patchShadowChunk, LP_SEED, AccumPass, CopyFromPass, LookGrade, WIND_T } from "../lookpilot/shaders";
import { camAt as pilotCam, charPos as pilotChar, charMetres as pilotMetres, focusAt as pilotFocus } from "../lookpilot/shot";
import type { KitCtx, Built, V3, CamState } from "../../kit/core/ctx";
import { CardLight } from "../../kit/cards/cardlight";
import { castCard, phoneWalkPose, holdPose, crowdPoseAt, castDraw, poseKey, PEOPLE, castHeights } from "../../kit/cards/adapters";
import type { CardBuilt } from "../../kit/cards/card";
import { crowd } from "../../kit/cards/crowd";
import * as PPL from "../../videos/clown/cast_people";
import * as CROWD from "../../videos/clown/cast_crowd";
import { buildPath, pathSunDir } from "./world_path";
import { buildRoom, buildNight, ROOM_SUN } from "./sets";

export const KITCARDS_FRAMES = 150;
type Props = { freeze?: number; novis?: number; bz?: number; top?: [number, number]; st?: string; mb?: number; dbg?: number; meas?: number; nocards?: number; fnum?: number; expo?: number; dens?: number; flat?: number; shutter?: number };
patchShadowChunk();
const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

// ---------------------------------------------------------------- the test shots
type Stage = {
  scene: THREE.Scene; sun: THREE.DirectionalLight | null; worldUpdate: (t: number, cam: THREE.PerspectiveCamera) => void;
  cam: (t: number) => CamState; dens: number; expo: number; sunColI: THREE.Color | null; motes?: { U: { pxScale: { value: number } } };
  built: Built[]; cards: CardBuilt[]; ctx: KitCtx; updaters: ((t: number, cam: THREE.Camera) => void)[];
};
const look = (pos: V3, at: V3, fov = 60, focus?: number): CamState => ({ pos, look: at, fov, roll: 0, focus: focus ?? Math.hypot(at[0] - pos[0], at[1] - pos[1], at[2] - pos[2]) });
const mkCtx = (gl: THREE.WebGLRenderer, scene: THREE.Scene, sun: THREE.DirectionalLight | null, updaters: Stage["updaters"]): KitCtx => ({
  gl, scene, quality: "final", sun, seed: 1, windT: WIND_T,
  rig: { name: "sandbox", sunDir: [0, 1, 0], sunColor: new THREE.Color(1, 1, 1), sunIntensity: sun?.intensity ?? 0, exposure: 1, hazeDensity: 0.0012 },
  assets: { tex: () => Promise.reject(new Error("no loader in the cards sandbox")), pbr: () => Promise.reject(new Error("-")), hdri: () => Promise.reject(new Error("-")), gltf: () => Promise.reject(new Error("-")) },
  onUpdate: (fn) => { updaters.push(fn); },
});
const standingGuy = (seed = 5, extra: Partial<PPL.Pose> = {}) => (t: number) => {
  const f = t * 30, ch = PPL.phoneChat(f, seed);
  return { ...holdPose(t, seed, 0.8), expr: ch.laughing ? "laughBig" : "bright", mouth: ch.mouth, nod: ch.nod, seed: 1, handK: 1.05,
    armR: PPL.phoneArm(PPL.C.phoneRed), armL: PPL.talkHand(f, seed, ch.talking), ...extra } as PPL.Pose;
};

/** a sparse, low leafy branch (alpha leaf cards with gaps) between the sun and a point: crisp leaf flecks on a face.
 *  Static (no wind in its depth pass); test-set dressing only (NATURE owns real foliage). */
const dappleBranch = (at: V3, sun: THREE.Vector3, dist = 3.0, seed = 3) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d")!;
  g.fillStyle = "#4f7a2e"; g.beginPath(); g.moveTo(64, 4); g.bezierCurveTo(118, 34, 108, 100, 64, 124); g.bezierCurveTo(20, 100, 10, 34, 64, 4); g.fill();
  g.strokeStyle = "#35561c"; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 120); g.stroke();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  const n = 420, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.11), mat, n);
  let s = seed; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const c = new THREE.Vector3(...at).addScaledVector(sun, dist), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  // a few twigs: leaves clump along 5 short twigs, so the gaps between clumps are real holes
  const twigs = Array.from({ length: 7 }, () => new THREE.Vector3((R() - 0.5) * 1.5, (R() - 0.5) * 0.9, (R() - 0.5) * 1.5));
  for (let i = 0; i < n; i++) {
    const tw = twigs[i % twigs.length], k = R();
    const p = c.clone().add(tw).add(new THREE.Vector3((R() - 0.5) * 0.42 + k * 0.3, (R() - 0.5) * 0.22, (R() - 0.5) * 0.42));
    q.setFromEuler(e.set(R() * 6.28, R() * 6.28, R() * 6.28)); m4.compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 + 0.6 * R())); im.setMatrixAt(i, m4);
  }
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  return im;
};

const buildStage = async (gl: THREE.WebGLRenderer, on: Props): Promise<Stage> => {
  const st = on.st ?? "a", updaters: Stage["updaters"] = [], built: Built[] = [], cards: CardBuilt[] = [];
  const lookO = on.flat ? { form: 0, rim: 0, floorK: 0, inkK: 0, shadeSat: 0 } : undefined;
  let scene: THREE.Scene, sun: THREE.DirectionalLight | null, worldUpdate: Stage["worldUpdate"], cam: Stage["cam"], dens = on.dens ?? 0.0012, expo = on.expo ?? 1.2;
  let sunColI: THREE.Color | null = null, motes: Stage["motes"];
  const addCard = async (c: Promise<CardBuilt>) => { const b = await c; built.push(b); cards.push(b); scene.add(b.object); return b; };
  if (st === "d" || st === "e") {
    const W = st === "d" ? await buildRoom(gl) : await buildNight(gl);
    scene = W.scene; sun = W.sun; worldUpdate = (t) => W.update(t); dens = on.dens ?? W.hazeDens; expo = on.expo ?? W.expo; sunColI = W.sunColI;
    const ctx = mkCtx(gl, scene, sun, updaters);
    if (st === "d") {
      // indoors: he stands in the window's sun patch (bars across him), the warm lamp on his right
      const P: V3 = [-1.25, 0, -1.55];
      cam = () => look([-2.55, 1.2, -0.35], [-1.0, 1.0, -1.75], 58);
      if (!on.nocards) await addCard(castCard(ctx, { who: "phoneGuy", pos: () => P, yaw: () => Math.atan2(-2.55 - P[0], -0.35 - P[2]) + 0.3, pose: standingGuy(5), look: lookO, dbg: on.dbg }));
      void ROOM_SUN;
    } else {
      const P: V3 = [0.35, 0, -1.75];
      cam = () => look([-1.55, 1.05, 2.6], [0.55, 1.35, -1.6], 62);
      if (!on.nocards) await addCard(castCard(ctx, { who: "phoneGuy", pos: () => P, yaw: () => Math.atan2(-0.75 - P[0], 2.15 - P[2]) + 0.2, pose: standingGuy(7), look: lookO, dbg: on.dbg }));
    }
    return { scene, sun, worldUpdate, cam, dens, expo, sunColI, built, cards, ctx, updaters };
  }
  // ---- the campus path (a copy of the pilot's set) with the sun where each still needs it
  const sunFor: Record<string, [number, number]> = { a: [48, 28], b: [48, 28], vscan: [48, 28], c: [48, 28], f: [48, 28], walk: [48, 28], pilot: [48, 28], crowd: [48, 28] };
  const [az, el] = sunFor[st] ?? [48, 28];
  const W = await buildPath(gl, { sunAz: az, sunEl: el, fog: st === "c" ? 0.0125 : undefined, bg4k: st === "pilot" });
  scene = W.scene; sun = W.sun; worldUpdate = W.update; motes = W.motes;
  sunColI = W.sunCol.clone().multiplyScalar(W.sun.intensity);
  if (st === "c") dens = on.dens ?? 0.0034;
  const ctx = mkCtx(gl, scene, sun, updaters);
  void pathSunDir;
  if (st === "walk" || st === "pilot") {
    // the pilot's own shot: camera, path, acting; only the card is the kit's
    cam = (t) => { const c = pilotCam(t); return { pos: c.pos, look: c.look, fov: c.fov, roll: c.roll, focus: pilotFocus(t) }; };
    if (!on.nocards) await addCard(castCard(ctx, { who: "phoneGuy", pos: pilotChar, pose: (t) => phoneWalkPose(t, pilotMetres(t), 5), look: lookO, dbg: on.dbg, ...(on.freeze ? { key: () => "frozen" } : {}) }));
  } else if (st === "vscan") {
    // debug: 7 cards along the path (z -2.2 .. -5.2) painted by their sun visibility, seen from the lawn side
    cam = () => look([4.6, 1.25, -3.7], [0.3, 1.0, -3.7], 70);
    for (let i = 0; i < 7; i++) { const P: V3 = [0.3, 0, -2.2 - 0.5 * i]; await addCard(castCard(ctx, { who: "phoneGuy", pos: () => P, px: 600, pose: standingGuy(5), dbg: 1, shadow: false })); }
  } else if (st === "f") {
    // on the lawn right of the path, in the pilot's sun patch, seen from the reverse angle (front light): blades hide his shoes
    const P: V3 = [2.6, 0, -1.0];
    cam = () => look([3.05, 0.52, -4.4], [2.6, 0.74, -1.0], 56);
    if (!on.nocards) await addCard(castCard(ctx, { who: "phoneGuy", pos: () => P, yaw: () => Math.atan2(3.05 - P[0], -4.4 - P[2]) - 0.25, pose: standingGuy(9), onGrass: true, look: lookO, dbg: on.dbg }));
  } else {
    // a: the reverse angle on the pilot's sun patch (the low sun behind the lens, screen-right: front light)
    // b: closer, at the patch's leafy edge (dapple across the face); c: the pilot's own direction, backlit, thick haze
    const P: V3 = st === "b" ? [0.3, 0, on.bz ?? -1.6] : st === "c" ? [0.25, 0, -1.2] : [0.3, 0, -1.2];
    const C: V3 = st === "b" ? [0.62, 1.32, P[2] - 2.35] : st === "c" ? [-0.1, 0.85, 2.0] : [0.95, 0.98, -4.9];
    const A: V3 = st === "b" ? [0.32, 1.22, P[2]] : st === "c" ? [0.2, 1.05, -1.2] : [0.3, 0.98, -1.2];
    cam = () => look(C, A, st === "b" ? 44 : 60);
    if (st === "b") scene.add(dappleBranch([P[0] + 0.05, 1.08, P[2]], new THREE.Vector3(...pathSunDir(az, el)), 2.6));
    if (!on.nocards) await addCard(castCard(ctx, { who: "phoneGuy", pos: () => P, yaw: () => Math.atan2(C[0] - P[0], C[2] - P[2]) + 0.15, pose: standingGuy(st === "b" ? 11 : 5), look: lookO, dbg: on.dbg }));
    if (st === "a" || st === "crowd") {
      // a background crowd on the path and the cross path (atlas LOD: one draw call, no proxies)
      const ids = CROWD.CROWD_IDS.filter((i) => i !== "cyclist" && i !== "skater");
      const members = Array.from({ length: st === "crowd" ? 40 : 14 }, (_, i) => {
        const id = ids[i % ids.length], v = CROWD.crowdSpeed(id), lane = (i % 3) - 1, z0 = -9 - (i * 2.3) % 24, dir = i % 2 ? 1 : -1;
        const zz = st === "a" ? 4 + (i * 2.9) % 22 : z0;
        const pos = (t: number): V3 => i % 4 === 3 && st !== "a" ? [-11 + ((i * 3.7 + v * t * dir + 40) % 22), 0, -12.2 + 0.5 * lane] : [0.55 * lane + 0.1 * Math.sin(t + i), 0, zz + dir * v * t];
        return { pos, canvasM: 2.16, draw: castDraw((p, P: CROWD.CrowdPose) => CROWD.drawCrowd(p, id, P), (t, info) => crowdPoseAt(id, t, info, v * t, 100 + i)),
          key: (t: number, info: import("../../kit/cards/card").CardDrawInfo) => poseKey(crowdPoseAt(id, t, info, v * t, 100 + i)) };
      });
      const cr = await crowd(ctx, { members, cellPx: 240 });
      built.push(cr); scene.add(cr.object);
    }
  }
  return { scene, sun, worldUpdate, cam, dens, expo, sunColI, motes, built, cards, ctx, updaters };
};

// ---------------------------------------------------------------- pipeline (the pilot's, generalised)
type Pipe = { S: Stage; cam: THREE.PerspectiveCamera; A: EffectComposer; B: EffectComposer; acc: AccumPass; accRT: THREE.WebGLRenderTarget; grade: LookGrade; w: number; h: number };
const makePipe = (gl: THREE.WebGLRenderer, S: Stage, w: number, h: number): Pipe => {
  const cam = new THREE.PerspectiveCamera(60, w / h, 0.05, 2500);
  const A = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  A.autoRenderToScreen = false;
  A.addPass(new RenderPass(S.scene, cam));
  const n8 = new N8AOPostPass(S.scene, cam, w, h);
  Object.assign(n8.configuration, { aoRadius: 0.9, distanceFalloff: 0.6, intensity: 2.2, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 8, halfRes: true, gammaCorrection: false, screenSpaceRadius: false });
  A.addPass(n8 as unknown as Pass);
  const accRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  const acc = new AccumPass(accRT);
  acc.vol = !!S.sun && !!S.sunColI;
  A.addPass(acc); A.setSize(w, h, false);
  const B = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  B.addPass(new CopyFromPass(accRT.texture));
  const bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.42, luminanceThreshold: 1.05, luminanceSmoothing: 0.35, mipmapBlur: true, radius: 0.72, levels: 7 });
  const grade = new LookGrade();
  B.addPass(new EffectPass(cam, bloom, new ToneMappingEffect({ mode: ToneMappingMode.AGX }), grade));
  B.setSize(w, h, false);
  // warm-up render: creates the shadow maps
  const c0 = S.cam(0); cam.position.set(...c0.pos); cam.lookAt(...c0.look); cam.updateProjectionMatrix();
  S.worldUpdate(0, cam); S.scene.updateMatrixWorld(); gl.setRenderTarget(accRT); gl.render(S.scene, cam); gl.setRenderTarget(null);
  return { S, cam, A, B, acc, accRT, grade, w, h };
};
const tmpR = new THREE.Vector3(), tmpU = new THREE.Vector3();
// GPU timer queries (EXT_disjoint_timer_query_webgl2): results come back on a LATER frame (multi-frame renders only)
type Q = { q: WebGLQuery; f: number };
const pendingQ: Q[] = [];
const gpuDone: Record<number, number[]> = {};
const pollQ = (X: WebGL2RenderingContext) => {
  for (let k = pendingQ.length - 1; k >= 0; k--) {
    const { q, f } = pendingQ[k];
    if (X.getQueryParameter(q, X.QUERY_RESULT_AVAILABLE)) { (gpuDone[f] ??= []).push(X.getQueryParameter(q, X.QUERY_RESULT) / 1e6); X.deleteQuery(q); pendingQ.splice(k, 1); }
  }
  for (const k of Object.keys(gpuDone)) { const a = gpuDone[+k]; console.warn(`kitcards GPU f${k}: ${a.length} sub-frames, mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2)} ms (min ${Math.min(...a).toFixed(2)})`); delete gpuDone[+k]; }
};
const renderFrame = (P: Pipe, gl: THREE.WebGLRenderer, f: number, on: Props) => {
  gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping;
  const N = Math.max(1, Math.round(on.mb ?? 1)), shutter = on.shutter ?? 0.5, fnum = on.fnum ?? 4, S = P.S;
  const meas = !!on.meas, cl = CardLight.of(S.ctx);
  cl.measure = false; cl.skipVis = !!on.novis;
  const X = gl.getContext() as WebGL2RenderingContext, ext = meas ? X.getExtension("EXT_disjoint_timer_query_webgl2") : null;
  if (ext) pollQ(X);
  P.acc.first = true; P.acc.weight = 1 / N;
  const tm = { sub: 0, upd: 0, vis: 0, draw: 0 };
  for (let i = 0; i < N; i++) {
    const t0 = meas ? (gl.getContext().finish(), performance.now()) : 0;
    const u = N === 1 ? 0.5 : (i + 0.5) / N;
    const t = (f + (N === 1 ? 0 : shutter * (u - 0.5))) / 30;
    const c = on.top ? look([on.top[0], 4.4, on.top[1]], [on.top[0], 0, on.top[1] - 0.001], 112) : S.cam(t), cam = P.cam;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll ?? 0);
    cam.fov = c.fov; cam.aspect = P.w / P.h; cam.updateProjectionMatrix();
    const F = c.focus ?? 3, apR = (25 / fnum / 2) / 1000;
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
    e[8] -= (e[0] * ox) / F + (2 * jx) / P.w; e[9] -= (e[5] * oy) / F + (2 * jy) / P.h;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    LP_SEED.value = (i * 7 + f * 3) % 61;
    S.worldUpdate(t, cam);
    if (S.motes) S.motes.U.pxScale.value = P.h * cam.projectionMatrix.elements[5] * 0.5;
    const tu = meas ? (gl.getContext().finish(), performance.now()) : 0;
    for (const b of S.built) b.update?.(t, cam);
    for (const fn of S.updaters) fn(t, cam);
    if (meas && (i > 0 || N === 1)) { gl.getContext().finish(); tm.upd += performance.now() - tu; tm.draw += S.cards.reduce((a, k) => a + k.stats.drawMs, 0); }
    S.scene.updateMatrixWorld();
    if (S.sun && S.sunColI) { S.sun.shadow.updateMatrices(S.sun); P.acc.setVolume(S.sun, cam, S.sunColI, S.dens, LP_SEED.value); }
    const q = ext && (i > 0 || N === 1) ? X.createQuery() : null;
    if (q && ext) X.beginQuery(ext.TIME_ELAPSED_EXT, q);
    P.A.render(1 / 30);
    if (q && ext) { X.endQuery(ext.TIME_ELAPSED_EXT); pendingQ.push({ q, f }); }
    if (meas && (i > 0 || N === 1)) { gl.getContext().finish(); tm.sub += performance.now() - t0; tm.vis += cl.costVisMs; }
  }
  P.grade.u("seed").value = f * 13.17 % 101;
  P.grade.u("expo").value = S.expo;
  P.B.render(1 / 30);
  const nW = N === 1 ? 1 : N - 1;
  if (meas) console.warn(`kitcards ${on.st} f${f} mb${N} ${P.w}x${P.h} (warm sub-frames ${nW}): sub-frame ${(tm.sub / nW).toFixed(1)} ms | card updates ${(tm.upd / nW).toFixed(1)} ms (vis pass ${(tm.vis / nW).toFixed(2)} ms, canvas draw+blur ${(tm.draw / nW).toFixed(2)} ms) | probes ${cl.probeCount} (${cl.costProbeMs.toFixed(0)} ms total) | proxies ${S.cards.map((k) => k.stats.proxies).join(",")} | probe L0 ${S.cards[0] ? S.cards[0].U.uSH.value[0].toArray().map((v) => (v * 0.2821).toFixed(3)).join("/") : "-"}`);
};

const Inner: React.FC<{ frame: number; on: Props }> = ({ frame, on }) => {
  const { gl } = useThree();
  const [S, setS] = useState<Stage | null>(null);
  const [h0] = useState(() => delayRender("kitcards build", { timeoutInMilliseconds: 280000 }));
  useEffect(() => {
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFShadowMap; gl.toneMapping = THREE.NoToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace;
    const t0 = performance.now();
    buildStage(gl, on).then((s) => { console.warn(`kitcards build ${on.st} ${(performance.now() - t0).toFixed(0)} ms; cast heights ${JSON.stringify(castHeights())}`); setS(s); continueRender(h0); })
      .catch((e) => { console.error("kitcards build failed", e); throw e; });
  }, [gl, h0, on]);
  const pipe = useMemo(() => { if (!S) return null; const sz = gl.getDrawingBufferSize(new THREE.Vector2()); return makePipe(gl, S, sz.x, sz.y); }, [S, gl]);
  const pend = useRef<number | null>(null);
  useLayoutEffect(() => { if (!pipe) return; pend.current = delayRender(`kitcards frame ${frame}`, { timeoutInMilliseconds: 280000 }); }, [frame, pipe]);
  useFrame(() => {
    if (!pipe || pend.current === null) return;
    const t0 = performance.now();
    renderFrame(pipe, gl, frame, on);
    gl.getContext().finish();
    console.warn(`kitcards f${frame} total ${(performance.now() - t0).toFixed(0)} ms (mb ${on.mb ?? 1})`);
    const hh = pend.current; pend.current = null; continueRender(hh);
  }, 1);
  return null;
};

export const KitCards: React.FC = () => {
  const frame = useCurrentFrame();
  const on = useMemo(() => ((getInputProps() as { kc?: Props }).kc ?? {}), []);
  return (
    <AbsoluteFill style={{ background: "#9fb8d6" }}>
      <ThreeCanvas width={1080} height={1920} gl={{ antialias: false, stencil: false, depth: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ fov: 60, near: 0.05, far: 2500 }} flat shadows="percentage">
        <Inner frame={frame} on={on} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
void PEOPLE;

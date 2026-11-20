// SET 'ny_station' of 'pointing' (NYC owner): the New York underground platform for s10 (the train glides in, the
// conductor drops his window), s12 (he points at the zebra board, the doors open, riders step off) and s13 (the next
// stop: no board, the doors stay shut, a rider taps her watch behind the door glass). Reusable parts: kit/subway/
// (station.ts, train.ts, life.ts, tex.ts, mats.ts; see its NOTES.md). Pure function of t. Light: the nightPractical rig
// + warm 3200 K strips (rect practicals) + 2 shadowed key spots + the train's window spill + one failing tube.
import * as THREE from "three";
import { NY_PAL } from "../v4/look";   // LOOK v2
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { nyStation } from "../../../kit/subway/station";
import { nyTrain, CAR } from "../../../kit/subway/train";
import { stutter, drips, lampMotes, ratCard } from "../../../kit/subway/life";
import { LocalEnv } from "../../../kit/subway/mats";
import { debris } from "../../../kit/fx/debris";
// cast.ts is imported LAZILY: its timing module reads shots.ts at load, and shots.ts -> cams.ts -> this set is a cycle
// (a static import throws "Cannot access SHOT_TABLE before initialization")
type CastMod = typeof import("../cast");
import { WIN_ny_station as WIN } from "./ny_station.cams";

const ease = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
/** shot-local seconds (null when t is not in that shot) */
const inShot = (id: string, t: number) => { const w = WIN[id]; return w && t >= w[0] - 1e-6 && t < w[1] + 1e-6 ? t - w[0] : null; };
const shotDur = (id: string) => { const w = WIN[id]; return w ? w[1] - w[0] : 2; };

/** the train's state per shot: x of the conductor's window, doors (0..1), window drop (0..1) */
export const trainState = (t: number) => {
  let u = inShot("s10", t);
  if (u !== null) {
    // decelerates in from screen left (-x) and stops 0.45 s before the cut; on "York" he drops the window
    const uStop = Math.max(0.6, shotDur("s10") - 0.5), v0 = 6.5, a = v0 / uStop, r = Math.max(0, uStop - u);
    return { x: -0.5 * a * r * r, doors: 0, win: ease((u - uStop - 0.02) / 0.3), lean: ease((u - uStop - 0.15) / 0.35), moving: r > 0 };
  }
  u = inShot("s12", t);
  if (u !== null) { const d = shotDur("s12"); return { x: 0, doors: ease((u - (d - 1.35)) / 0.9), win: 1, lean: 1, moving: false }; }
  u = inShot("s13", t);
  if (u !== null) return { x: 0, doors: 0, win: 1, lean: 1, moving: false };
  return { x: 0, doors: 0, win: 1, lean: 1, moving: false };
};

export const build_ny_station = async (ctx: KitCtx): Promise<Built> => {
  const g = new THREE.Group(); g.name = "set:ny_station";
  const t0 = performance.now();
  const { castMember, crowdNY }: CastMod = await import("../cast");
  const lens = { points: [[-2.9, 2.7], [-1.4, 2.8], [-3.2, 1.9], [-2.0, 1.1], [-0.6, 1.45], [-1.95, 3.34]] as [number, number][] };
  const st = await nyStation(ctx, { focus: [-14, 10], board: { x: 0, z: 0.95, y: 2.35 }, lens, lumens: 2000, kelvin: 3200 });
  g.add(st.object);
  // LOOK v2 (2026-11-20, look director): text-free posters in strong colours on the back wall (z 5.6, between the
  // column bays), so a wide has colour at eye height. Remove this block to restore the old station.
  {
    const posterTex = (seed: number) => {
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const c = cv.getContext("2d")!;
      const BG = ["#c8263c", "#1d3f8a", "#f07a1a", "#5b2fa8", "#0f7a5c", "#d23f8f"], PAL = ["#f4f1ea", "#2bb37a", "#1f8fd6", "#e8452c", "#ffd23a", "#11a3a3"];
      c.fillStyle = BG[seed % BG.length]; c.fillRect(0, 0, 256, 360);
      let r = seed * 7919 + 104729; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
      for (let i = 0; i < 4; i++) { c.fillStyle = PAL[(seed + i) % PAL.length]; const x = rnd() * 256, y = rnd() * 250, d = 50 + rnd() * 100; if (i % 2) { c.beginPath(); c.arc(x, y, d / 2, 0, 7); c.fill(); } else c.fillRect(x - d / 2, y - d / 3, d, d * 0.66); }
      c.fillStyle = "rgba(255,255,255,0.9)"; c.fillRect(22, 286, 160, 16); c.fillRect(22, 312, 110, 11);
      c.strokeStyle = "#111111"; c.lineWidth = 12; c.strokeRect(6, 6, 244, 348);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    for (let k = -4; k <= 4; k++) { const x = k * 4.57; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshStandardMaterial({ map: posterTex(k + 5), roughness: 0.45 }));
      m.position.set(x, 1.35, 5.6 - 0.015); m.rotation.y = Math.PI; m.receiveShadow = true; m.name = "nyPoster" + k; g.add(m); }
  }
  const train = await nyTrain(ctx, { cars: 4, condCar: 1, z: -0.12 - CAR.HW, y: 0.0, selfLit: NY_PAL.trainSelfLit, nearCars: 1 });   // LOOK v2: selfLit 0.5 -> NY_PAL (a warmly lit train)
  g.add(train.object);
  // the window spill: two rect lights riding with the train (one per car around the conductor), facing the platform
  const spill: { p: ReturnType<NonNullable<KitCtx["practical"]>>; dx: number }[] = [];
  if (ctx.practical) for (const dx of [3.6, -4.2]) {
    const p = ctx.practical({ kind: "rect", pos: [0, 1.32, 0], target: [0, 1.32, 4], size: [3.2, 0.85], kelvin: 3800, lumens: 1200, bulb: false, seed: 9 });
    train.object.add(p.object); p.object.position.set(dx, 0, CAR.HW + 0.02 - 0); spill.push({ p, dx });
  }
  // the local reflection capture for the stainless train (+ gloss paint / glass): the station from the platform edge
  const env = new LocalEnv(ctx.gl, new THREE.Vector3(0, 1.45, 1.0), ctx.quality === "draft" ? 64 : 128);
  env.apply(...train.envMats, ...st.envMats);

  // ---------------- people (CAST): the conductor in his cab window + NY riders
  const noCapture: THREE.Object3D[] = [train.object];
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const zOut = -0.12 + 0.06, zIn = -0.12 - 0.32;
  const cond = await castMember(ctx, "ny_conductor", {
    pos: (t) => { const s = trainState(t); return [s.x + 0.02, 0, zIn + (zOut - zIn) * s.lean]; },
    yaw: () => 0,
    aim: (t) => (inShot("s12", t) !== null ? [0, 2.35, 0.95] : inShot("s13", t) !== null ? [0.2, 3.0, 1.2] : null),
    cutY: 975 - Math.round(1.0 / 0.00216), px: 1300, name: "ny_conductor",
  });
  g.add(cond.object); noCapture.push(cond.object); if (cond.update) ups.push(cond.update);
  // riders: two waiting on the platform (s10), one stepping off + two on the platform (s12), the watch tapper + one
  // more inside behind the shut door glass (s13). Door of the conductor's car on the platform side: world x = +1.69.
  const dx = -CAR.condX + CAR.doors[0];   // = 1.69: the conductor's own car's door nearest his window (world x)
  const leave = (t: number): V3 => {
    const u = inShot("s12", t), d = shotDur("s12");
    const k = u === null ? 0 : ease((u - (d - 0.75)) / 1.4);
    return [dx + 0.1 + 1.6 * k, 0, -0.9 + 2.6 * k];
  };
  let riders: Built | null = null;
  try {
    riders = await crowdNY(ctx, [
      { id: "nyRiderA", pos: [-4.4, 0, 1.05], seed: 3 },
      { id: "nyRiderB", pos: [-7.6, 0, 1.7], seed: 5 },
      { id: "nyLeaver", pos: leave, seed: 7 },
      { id: "watchTapper", pos: [dx + 0.12, 0, -0.62], seed: 9 },
      { id: "nyRiderC", pos: [dx - 0.42, 0, -0.85], seed: 11 },
    ]);
    g.add(riders.object); noCapture.push(riders.object);
  } catch (e) { console.warn("ny_station: crowdNY failed", e); }

  // ---------------- life: the rat (s10), paper in the piston wind, drips, lamp-lit dust, the failing tube, the board swing
  const rat = await ratCard(ctx, {
    path: (t) => { const u = inShot("s10", t) ?? -1; const k = Math.max(0, Math.min(1, (u - 0.15) / 0.95));
      const x = -2.1 + 3.3 * k, drop = Math.max(0, (u - 1.1) / 0.25); return [x, -0.45 * Math.min(1, drop * drop), 0.32 - 0.4 * Math.min(1, drop)]; },
    heading: () => 0, on: (t) => { const u = inShot("s10", t); return u !== null && u > 0.1 && u < 1.45; }, speed: 3.4,
  });
  g.add(rat.object); noCapture.push(rat.object);
  const paper = await debris(ctx, "paper", { box: [[-6.5, 0, 0.75], [3.5, 0.1, 3.2]], count: 3, groundY: 0.002, seed: 4 });
  g.add(paper.object); noCapture.push(paper.object);
  const drip = drips(ctx, [{ at: [2.6, st.CY - 0.01, 3.0], floorY: 0.0, period: 1.7, phase: 0.3 }, { at: [-2.285 + 0.25, st.CY - 0.01, 1.75 + 0.55], floorY: 0, period: 2.3, phase: 1.1 }]);
  g.add(drip.object); noCapture.push(drip.object);
  const motes = lampMotes(ctx, { box: [[-9, 0.2, -0.1], [7, 3.2, 5.2]], lamps: st.lampPos, count: 400, radius: 1.5, seed: 12, size: 0.006, gain: 0.9 });
  g.add(motes.object); noCapture.push(motes.object); motes.object.visible = false;   // LOOK v2: no floating specks (V4_STRUCTURE rule 3)

  const buildMs = performance.now() - t0;
  console.warn(`ny_station built in ${buildMs.toFixed(0)} ms`);
  return {
    object: g,
    hints: { shadowCenter: [0, 0, 0], shadowExt: 34, probe: [0, 1.6, 1.9], groundAlbedo: [0.3, 0.28, 0.26], rigOpts: { sat: 1.85, shadowSat: 1.5, contrast: 0.34, exposure: 3.3, warmth: 0.25 } },   // LOOK v2: rigOpts (more colour + punch under undergroundWarm)
    update: (t, cam) => {
      const s = trainState(t);
      train.place(s.x);
      train.cond.setWindow(s.win);
      for (const c of train.cars) { c.setDoors(s.doors); c.setIndicator(s.doors > 0.05 ? 1 : 0); }
      // the board: gone at the next stop (s13); a few mm of swing in the draught
      if (st.board) {
        st.board.visible = inShot("s13", t) === null;
        st.board.rotation.x = 0.004 * Math.sin(t * 2.1) + 0.0025 * Math.sin(t * 3.7 + 1);
        st.board.rotation.z = 0.002 * Math.sin(t * 1.3 + 0.5);
      }
      if (st.flicker) st.flicker.set(stutter(t, 3));
      rat.object.visible = rat.on(t);
      // the env capture: once, with every lamp lit and the people / train hidden (t-independent)
      if (!env.done) { for (const p of st.lamps) p.update(t); st.flicker?.set(1); st.flicker?.update(t); env.capture(ctx.scene, noCapture); if (st.flicker) st.flicker.set(stutter(t, 3)); }
      for (const u of ups) u(t, cam);
      riders?.update?.(t, cam);
      if (rat.object.visible) rat.update?.(t, cam);
      paper.update?.(t, cam); drip.update?.(t, cam); motes.update?.(t, cam);
      void spill;
    },
    dispose: () => env.dispose(),
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_ny_station, MARKS_ny_station } from "./ny_station.cams";

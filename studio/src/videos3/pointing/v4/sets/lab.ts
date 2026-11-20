// v4 SET ENTRY 'lab' (owner LAB; briefs/v3/pointing/V4_STRUCTURE.md). The v4 lab is a NEW room (the v3 jars set stays
// in ../../sets/lab.ts for the v3 film). Built FIRST: THE HOOK (script v4 lines 1-3 + the last line).
//
// THE HOOK PICTURE (frame 0, must read in a quarter second on a phone): a big signal lamp fills the top of the frame; under
// it a young woman sits at ONE big button, finger ready, eyes wide; the lamp turns green on "green"; seven flashes on the
// seven "Go"s, faster and faster, a bright press each time, the camera pushing in; the 7th is RED and her hand comes down
// anyway; half a second of stillness; she freezes staring up at the red lamp; a big red X. The last shot of the film is
// frame 0's picture with her arm already up, pointing at the lamp, mouth open (it runs into frame 0).
// Life behind her: other volunteers at their button boards (blinking lamps, presses), a researcher walking across in
// depth, a ticking wall clock, plants stirring at the sunny windows.
//
// WORLD LAYOUT (metres; the hook lens looks toward -Z): the room x -6..6, z -7..3, h 3.2; windows in the LEFT wall (x = -6,
// the low sun comes in through them: shot rig interiorWarm, sunAz 95 / sunEl 25). HER: on a stool at (0.3, 0, -0.95)
// facing +Z, her desk in front of her, THE BUTTON on it; THE LAMP hangs from a boom above-front of her, its lens facing
// the lens. Two rows of volunteers behind her (z -3.2, -5.4), the researcher's walk at z -4.3.
// COLOURS: plain strong colours in PAL until LOOK's v4/look.ts exists (LOOK owns materials, colours, light; LAB owns
// layout, props, staging, cameras). Times: lab_plan.ts (the v4 clock's words; a plan of the locked hook until then).
import * as THREE from "three";
import type { Built, KitCtx, V3, CamState } from "../../../../kit/core/ctx";
import { room } from "../../../../kit/surfaces/interior";
import { prop } from "../../../../kit/props/catalog";
import { workTable, taskBoard, ceilingPanel, wallClock, pbr, mesh, rboxG, cylG, latheG, at, merge, canvas, contactBlob, type LampState, type C3 } from "../../../../kit/home";
import type { Beat, Resolver } from "../../cast/moves";
import { HOOK, lampAt, buttonAt, xAt, fr, lineByText } from "./lab_plan";
import { glideRest, easeGlide, type ShotCam, type View } from "../camkit";
import { SHOT_PLAN } from "../shot_plan";
import { tokOf } from "../timeline";

/** the palette until LOOK's v4/look.ts (strong colours, never beige or grey) */
export const PAL = {
  wall: [0.2, 0.74, 0.78] as C3, floor: [0.36, 0.5, 0.95] as C3,
  lampHousing: [1.0, 0.66, 0.04] as C3, visor: [0.05, 0.05, 0.06] as C3,
  buttonBase: [0.08, 0.28, 0.9] as C3, buttonCap: [0.96, 0.96, 0.92] as C3, buttonGlow: [0.35, 0.95, 1.0] as C3,
  heroDesk: [0.98, 0.42, 0.14] as C3,
  desks: [[0.15, 0.62, 0.42], [0.86, 0.24, 0.5], [0.42, 0.3, 0.86], [0.98, 0.7, 0.1], [0.1, 0.62, 0.86], [0.92, 0.42, 0.2]] as C3[],
  xRed: "#e8202a",
};
export const LAB4 = {
  room: { x0: -6, z0: -7, w: 12, d: 10, h: 3.2 },
  her: [0.3, 0, -0.95] as V3, seat: 0.47,
  desk: { at: [0.3, 0, -0.42] as V3, w: 1.05, d: 0.6, h: 0.74 },
  button: [0.08, 0.92, -0.52] as V3, console: { at: [0.1, 0.74, -0.5] as V3, w: 0.5, h: 0.18, d: 0.34 },
  lamp: [0.02, 1.86, -0.62] as V3, pole: [-0.62, 0, -1.3] as V3,
  rows: [{ z: -3.2, xs: [-3.4, -1.7, 2.2] }, { z: -5.4, xs: [-2.6, 1.0, 3.2] }],
  walkZ: -4.3,
};
const lampRGB: Record<number, [number, number, number]> = { 0: [0.08, 0.08, 0.07], 1: [1.0, 0.07, 0.04], 2: [0.12, 1.0, 0.32] };

/** the big signal lamp: a candy housing, a black visor, a big convex lens (local: lens faces +z) */
const signalHead = (ctx: KitCtx) => {
  const g = new THREE.Group(); g.name = "signalHead";
  const housing = pbr({ color: PAL.lampHousing, rough: 0.32, peel: 0.6, tile: 0.08, clearcoat: 0.6, ccRough: 0.15 });
  const black = pbr({ color: PAL.visor, rough: 0.5, peel: 0.3 });
  const chrome = pbr({ color: [0.85, 0.85, 0.84], rough: 0.14, metal: 1, peel: 0 });
  g.add(mesh(rboxG(-0.25, -0.25, -0.16, 0.25, 0.25, 0.06, 0.045, 3), housing, true, "lampBox"));
  g.add(mesh(at(cylG(0.205, 0.205, 0.02, 64), 0, 0, 0.066, Math.PI / 2), black, true, "lensSeat"));
  g.add(mesh(at(new THREE.TorusGeometry(0.19, 0.013, 10, 64), 0, 0, 0.078), chrome, true, "lensRing"));
  // the visor: a half tube over the top of the lens, sticking out toward the lens
  const vis = new THREE.CylinderGeometry(0.215, 0.215, 0.2, 48, 1, true, Math.PI / 2, Math.PI);   // the TOP half (after the turn) vis.rotateX(Math.PI / 2); vis.translate(0, 0, 0.17);
  const vm = pbr({ color: PAL.visor, rough: 0.5, peel: 0.3 }); vm.side = THREE.DoubleSide;
  g.add(mesh(vis, vm, true, "visor"));
  // the yoke: two side plates + a bolt each side
  for (const s of [-1, 1]) g.add(mesh(rboxG(s * 0.25 - 0.012, -0.05, -0.12, s * 0.25 + 0.012, 0.32, 0.0, 0.005), black, true, "yoke"));
  g.add(mesh(rboxG(-0.262, 0.3, -0.12, 0.262, 0.34, 0.0, 0.006), black, true, "yokeTop"));
  // the lens: a shallow dome, emissive in the state's colour
  const lensM = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.18, metalness: 0, emissive: new THREE.Color(0, 0, 0), emissiveIntensity: 1 });
  lensM.customProgramCacheKey = () => "lab4:lens";
  const lens = new THREE.Mesh(latheG([[0.001, 0.035], [0.08, 0.03], [0.15, 0.016], [0.188, 0.0]], 48), lensM); lens.rotation.x = Math.PI / 2; lens.position.z = 0.072; lens.name = "lens"; g.add(lens);
  // a soft halo in front of the lens (additive), so the colour blooms at phone size
  const { cv, g: c } = canvas(256, 256); const gr = c.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.35, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  const haloT = new THREE.CanvasTexture(cv);
  const haloM = new THREE.MeshBasicMaterial({ map: haloT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x000000, toneMapped: false });
  haloM.customProgramCacheKey = () => "lab4:halo";
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), haloM); halo.position.z = 0.12; halo.renderOrder = 8; g.add(halo);
  const light = ctx.practical ? ctx.practical({ kind: "point", pos: [0, 0, 0], color: 0x20ff50, lumens: 700, shadow: false, bulb: false, range: 4.5 }) : null;
  if (light) { light.object.position.set(0, -0.05, 0.35); g.add(light.object); light.light.position.set(0, 0, 0); }
  const set = (state: 0 | 1 | 2, flash: number) => {
    // dark = an unlit green glass (it still reads as a signal lamp in frame 0)
    const c3 = lampRGB[state], k = state ? 2.2 + 2.6 * flash : 0;
    if (state) lensM.emissive.setRGB(c3[0], c3[1], c3[2]).multiplyScalar(k); else lensM.emissive.setRGB(0.01, 0.05, 0.02);
    if (state) lensM.color.setRGB(0.5, 0.5, 0.5); else lensM.color.setRGB(0.06, 0.2, 0.1);
    haloM.color.setRGB(c3[0], c3[1], c3[2]).multiplyScalar(state ? 0.35 + 0.7 * flash : 0);
    if (light) { (light.light as THREE.PointLight).color.setRGB(c3[0], c3[1], c3[2]); light.set(state ? 0.75 + 0.5 * flash : 0); }
  };
  return { object: g, set };
};

/** THE BUTTON: a blue base, a chrome collar, a big mushroom cap that sinks and lights on a press (local: base on y = 0) */
const bigButton = () => {
  const g = new THREE.Group(); g.name = "bigButton";
  g.add(mesh(rboxG(-0.13, 0, -0.1, 0.13, 0.085, 0.1, 0.02, 3), pbr({ color: PAL.buttonBase, rough: 0.3, peel: 0.5, clearcoat: 0.5, ccRough: 0.2 }), true, "buttonBase"));
  g.add(contactBlob(0.34, 0.26, 0.6));
  g.add(mesh(latheG([[0.001, 0.085], [0.07, 0.085], [0.07, 0.1], [0.062, 0.106], [0.001, 0.106]], 48), pbr({ color: [0.85, 0.85, 0.84], rough: 0.15, metal: 1, peel: 0 }), true, "collar"));
  const capM = new THREE.MeshStandardMaterial({ color: new THREE.Color(...PAL.buttonCap), roughness: 0.22, emissive: new THREE.Color(0, 0, 0) }); capM.customProgramCacheKey = () => "lab4:cap";
  const cap = new THREE.Mesh(latheG([[0.001, 0.1], [0.075, 0.1], [0.077, 0.115], [0.07, 0.13], [0.045, 0.142], [0.001, 0.146]], 48), capM); cap.castShadow = true; cap.name = "buttonCap"; g.add(cap);
  return { object: g, set: (k: number) => { cap.position.y = -0.011 * Math.min(1, k * 1.4); capM.emissive.setRGB(...PAL.buttonGlow).multiplyScalar(1.8 * k); } };
};

/** the big red X (a canvas sign that pops; billboards to the lens) */
const redX = () => {
  const { cv, g: c } = canvas(512, 512); c.clearRect(0, 0, 512, 512); c.lineCap = "round";
  for (const [w, col] of [[150, "#3a0306"], [104, PAL.xRed]] as [number, string][]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(110, 110); c.lineTo(402, 402); c.moveTo(402, 110); c.lineTo(110, 402); c.stroke(); }
  c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 18; c.beginPath(); c.moveTo(128, 104); c.lineTo(250, 226); c.moveTo(384, 104); c.lineTo(300, 188); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }); m.customProgramCacheKey = () => "lab4:x";
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), m); q.renderOrder = 9; q.name = "redX"; return q;
};

const inSpan = (t: number, s: [number, number]) => t >= s[0] && t < s[1];
const AWAY: V3 = [0, -40, 0];

export const build = async (ctx: KitCtx): Promise<Built> => {
  const tb0 = performance.now();
  const g = new THREE.Group(); g.name = "set:lab4";
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const add = (b: { object: THREE.Object3D; update?: (t: number, cam: THREE.Camera) => void }) => { g.add(b.object); if (b.update) ups.push(b.update); return b; };
  const R = LAB4.room, H = HOOK;

  // ---------------------------------------------------------------- the room: windows in the left wall (the sun), a door
  const Rm = await room(ctx, { origin: [R.x0, 0, R.z0], w: R.w, d: R.d, h: R.h, thick: 0.25, seed: 41,
    floor: "vinyl_speckled", floorOpts: { tint: PAL.floor, value: 0.7, sat: 1.4, rough: 0.5, wear: { polish: 0.7, centre: 0.3, chips: 0.04 }, dirt: { edge: 0.3, joints: 0.1, grime: 0.04 } },
    wall: "plaster", wallTint: PAL.wall, wallOpts: { value: 1.55, sat: 1.25, ao: 0.4, cavity: 0.3, macro: { amount: 0.006 }, dirt: { bottom: 0.08, heightM: 0.2, baseY: 0, grime: 0.005, edge: 0 } },
    windows: [2.0, 5.2, 8.4].map((a) => ({ wall: "left" as const, at: a, w: 1.9, h: 1.85, sill: 0.85, curtains: false as const })),
    doors: [{ wall: "back", at: 10.2, w: 0.95, h: 2.1, color: [0.95, 0.35, 0.2] }],
    radiator: false, bounce: 0.06, trimColor: [0.96, 0.96, 0.94],
    lens: { points: [[0.3, 2.1], [0.3, -0.9], [0, -4]] } });
  add(Rm);
  // outside the windows: a lawn and a row of far trees' colour (the rig's sky above)
  { const fg = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), pbr({ color: [0.3, 0.55, 0.2], rough: 0.95, peel: 0 })); fg.rotation.x = -Math.PI / 2; fg.position.set(R.x0 - 100.3, -0.3, 0); g.add(fg); }
  for (const [x, z] of [[-2.5, -1.5], [2.5, -1.5], [-2.5, -6.0], [2.5, -6.0]]) { const cp = ceilingPanel(ctx, [x, R.h, z], { lumens: 650, kelvin: 4800 }); g.add(cp.object); if (cp.lamp) g.add(cp.lamp.object); }

  // ---------------------------------------------------------------- HER station: desk, stool, THE BUTTON, THE LAMP on its boom
  const D = LAB4.desk;
  const desk = await workTable(ctx, { w: D.w, d: D.d, h: D.h, plain: PAL.heroDesk, rough: 0.35, seed: 5 }); desk.object.position.set(...D.at); g.add(desk.object);
  { const C = LAB4.console; g.add(mesh(rboxG(C.at[0] - C.w / 2, C.at[1], C.at[2] - C.d / 2, C.at[0] + C.w / 2, C.at[1] + C.h, C.at[2] + C.d / 2, 0.025, 3), pbr({ color: [0.98, 0.84, 0.12], rough: 0.35, peel: 0.6, clearcoat: 0.4, ccRough: 0.2 }), true, "buttonConsole")); }
  const btn = bigButton(); btn.object.position.set(...LAB4.button); g.add(btn.object);
  try { g.add((await prop(ctx, "stool_wood", { pos: [LAB4.her[0] + 0.02, 0, LAB4.her[2] - 0.05], rotY: 0.3, scale: LAB4.seat / 0.437 })).object); } catch (e) { console.warn("lab4: stool missing", e); }
  const head = signalHead(ctx); head.object.position.set(...LAB4.lamp); g.add(head.object);
  { // the stand: a weighted foot, a tall pole, a boom over her, a short drop to the yoke
    const P = LAB4.pole, L = LAB4.lamp, steel = pbr({ color: [0.2, 0.2, 0.22], rough: 0.4, peel: 0.4 }), top = L[1] + 0.42;
    g.add(mesh(at(cylG(0.2, 0.22, 0.04, 40), P[0], 0.02, P[2]), steel, true, "standFoot"));
    g.add(mesh(at(cylG(0.026, 0.026, top, 20), P[0], top / 2, P[2]), steel, true, "standPole"));
    const bz = mesh(cylG(0.02, 0.02, Math.abs(L[2] - P[2]), 16), steel, true, "boomZ"); bz.rotation.x = Math.PI / 2; bz.position.set(P[0], top, (P[2] + L[2]) / 2); g.add(bz);
    const bx = mesh(cylG(0.02, 0.02, Math.abs(L[0] - P[0]) + 0.04, 16), steel, true, "boomX"); bx.rotation.z = Math.PI / 2; bx.position.set((P[0] + L[0]) / 2, top, L[2]); g.add(bx);
    g.add(mesh(at(cylG(0.016, 0.016, top - L[1] - 0.33, 12), L[0], (top + L[1] + 0.33) / 2, L[2] - 0.06), steel, true, "drop"));
    g.add(contactBlob(0.6, 0.6, 0.5)); g.children[g.children.length - 1].position.set(P[0], 0.0015, P[2]);
  }
  const lampV: V3 = [LAB4.lamp[0], LAB4.lamp[1] - 0.02, LAB4.lamp[2] + 0.08], btnV: V3 = [LAB4.button[0], LAB4.button[1] + 0.14, LAB4.button[2]];
  ups.push((t) => { const L = inSpan(t, H.loop) ? { state: 0 as const, flash: 0 } : lampAt(t); head.set(L.state, L.flash); btn.set(inSpan(t, H.loop) ? 0 : buttonAt(t)); });
  const X = redX(); g.add(X);
  // the X sits at her focus distance (sharp), upper right of the frame beside the lamp, square to the lens, on top
  (X.material as THREE.MeshBasicMaterial).depthTest = false;
  const xf = new THREE.Vector3(), xr = new THREE.Vector3(), xu = new THREE.Vector3();
  ups.push((t, cam) => { const k = inSpan(t, H.B) ? xAt(t) : 0; X.visible = k > 0.001; if (!X.visible) return;
    const d = 2.1, pc = cam as THREE.PerspectiveCamera, th = Math.tan(((pc.fov ?? 48) * Math.PI) / 360), tw = th * (pc.aspect ?? 0.5625);
    cam.matrixWorld.extractBasis(xr, xu, xf); xf.negate();
    X.position.copy(cam.position).addScaledVector(xf, d).addScaledVector(xr, 0.5 * tw * d).addScaledVector(xu, 0.38 * th * d);
    X.quaternion.copy(cam.quaternion); X.scale.setScalar(Math.max(1e-3, k) * th * d * 0.62); });

  // ---------------------------------------------------------------- the rows behind her: desks, boards that blink, people
  const boards: { board: ReturnType<typeof taskBoard>; seed: number }[] = [];
  let k = 0;
  for (const row of LAB4.rows) for (const x of row.xs) {
    const col = PAL.desks[k % PAL.desks.length], seed = 7 + k * 13;
    const tb = await workTable(ctx, { w: 0.95, d: 0.55, h: 0.74, plain: col, rough: 0.4, seed: 11 + k }); tb.object.position.set(x, 0, row.z + 0.45); g.add(tb.object);
    const per = 0.55 + 0.17 * (k % 4), off = (k * 0.37) % 1;
    const lampF = (t: number): LampState => { const n = Math.floor(t / per + off); return ((n * 7 + seed) % 5 === 0 ? 0 : [2, 3, 2, 1, 2][(n + seed) % 5]) as LampState; };
    const pressF = (i: number, t: number) => { const ph = (t / per + off) % 1; return i === 1 && ph > 0.55 && ph < 0.75 ? Math.sin(((ph - 0.55) / 0.2) * Math.PI) : 0; };
    const board = taskBoard(ctx, { lamp: lampF, press: pressF, light: false });
    board.object.position.set(x, 0.74, row.z + 0.38); board.object.rotation.y = Math.PI; g.add(board.object); boards.push({ board, seed });
    ups.push((t) => board.update(t));
    try { g.add((await prop(ctx, "stool_wood", { pos: [x + 0.02, 0, row.z - 0.04], rotY: 0.2 * k, scale: 0.47 / 0.437 })).object); } catch { /* the stool is optional */ }
    k++;
  }
  // the back wall: a big ticking clock, plants at the windows
  add(await wallClock(ctx, { pos: [0.6, 2.35, R.z0 + 0.012], yaw: 0, radius: 0.34, rim: [0.85, 0.12, 0.12], time0: 14 * 3600 + 12 * 60 }));
  const plants: THREE.Object3D[] = [];
  for (const [name, pos, sc] of [["potted_tall", [R.x0 + 0.5, 0, -0.4], 1.1], ["potted_tall", [R.x0 + 0.5, 0, -6.6], 1.2], ["potted_tall", [R.x0 + R.w - 0.6, 0, -6.4], 1.15], ["potted", [3.2, 0, -1.4], 0.8]] as [string, V3, number][]) {
    try { const p = (await prop(ctx, name, { pos, scale: sc, contact: 0.4 })).object; g.add(p); plants.push(p); } catch (e) { console.warn("lab4: plant missing", name, e); }
  }
  ups.push((t) => plants.forEach((p, i) => { const gust = 0.6 + 0.4 * Math.sin(t * 0.9 + i * 1.7); p.rotation.z = gust * (0.022 * Math.sin(t * 1.7 + i * 2.1) + 0.01 * Math.sin(t * 4.3 + i)); p.rotation.x = gust * 0.015 * Math.sin(t * 2.3 + 2 + i); }));

  // ---------------------------------------------------------------- PEOPLE (CAST's cards; numeric cues on the hook clock)
  try {
    const [{ castCardOf }, MV] = await Promise.all([import("../../cast/member"), import("../../cast/moves")]);
    const NOW: Resolver = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: (f) => f + 600 };
    const g7 = fr(H.go[6]), endB = fr(H.B[1]), L0 = fr(H.loop[0]), L1 = fr(H.loop[1]);
    // HER: finger ready, eyes wide on the lamp; a press on each Go; on the red her hand comes down anyway and STAYS;
    // half a second later she freezes, staring up at the red lamp. The loop shot: her arm up at the lamp, mouth open.
    const beats: Beat[] = [
      { who: "volunteer", m: "face", at: 0, until: fr(H.go[0]) - 4, expr: "bright", browUp: 5, still: true },
      { who: "volunteer", m: "face", at: fr(H.go[0]) - 4, until: g7, expr: "bright", browUp: 3, still: true },
      ...H.go.slice(0, 6).map((t): Beat => ({ who: "volunteer", m: "press", at: fr(t) - 2, until: fr(t) + 3, per: 5 })),
      { who: "volunteer", m: "point", at: g7 - 2, until: endB + 4, still: true, noGaze: true },
      { who: "volunteer", m: "stun", at: g7 + 15, until: endB + 4, lens: false, hands: false, take: 0.3 },
      { who: "volunteer", m: "point", at: L0 - 2, until: L1 + 4, still: true, noGaze: true },
      { who: "volunteer", m: "face", at: L0 - 2, until: L1 + 4, expr: "brightO", mouth: "O", still: true },
      { who: "volunteer", m: "look", at: 0, until: L1 + 4, to: "look" },
    ];
    const timed = MV.timeBeats(beats, NOW);
    const her = await castCardOf(ctx, "volunteer", { pos: () => LAB4.her, yaw: () => 0, seated: LAB4.seat,
      aim: (t) => (inSpan(t, H.loop) ? lampV : btnV), look: () => lampV, name: "lab4_her" }, (e) => MV.actBeats("volunteer", timed, e));
    add(her);
    // the rows: seated volunteers who press at their own boards (each its own rhythm), one who leans to look
    const WHO = ["suitA", "studentA", "officeRead", "salaryRead", "studentB", "suitB"] as const;
    let i = 0;
    for (const row of LAB4.rows) for (const x of row.xs) {
      const who = WHO[i % WHO.length], per = 6 + (i % 3) * 2, bz = row.z + 0.38;
      const bb: Beat[] = [{ who: who as never, m: "press", at: 0, until: 100000, per }];
      const tt = MV.timeBeats(bb, NOW), bV: V3 = [x, 0.86, bz];
      try { const c = await castCardOf(ctx, who as never, { pos: () => [x, 0, row.z - 0.1], yaw: () => 0, seated: 0.47, aim: () => bV, look: () => [x - 0.05, 0.95, bz], name: `lab4_row_${i}` }, (e) => MV.actBeats(who as never, tt, e)); add(c); } catch (err) { console.warn("lab4: row card", who, err); }
      i++;
    }
    // the researcher: walks across behind the first row, clipboard in hand (CAST: a clipboard prop when it has one)
    const wb: Beat[] = [{ who: "researcher", m: "walk", at: 6, until: 100000 }];
    const wt = MV.timeBeats(wb, NOW);
    const walker = await castCardOf(ctx, "researcher", { pos: (t) => [4.6 - MV.walkedM(t * 30, 6, 100000), 0, LAB4.walkZ], yaw: () => -Math.PI / 2, name: "lab4_researcher" }, (e) => MV.actBeats("researcher", wt, e));
    add(walker);
  } catch (e) { console.warn("lab4: CAST not available", e); }
  void AWAY;

  console.warn(`kit set "lab4" (LAB v4) built in ${(performance.now() - tb0).toFixed(0)} ms; hook clock: ${H.source}, go ${H.go.map((x) => x.toFixed(2)).join(" ")}`);
  return {
    object: g,
    hints: { shadowCenter: [0, 0, -2.5], shadowExt: 7.5, probe: [0.3, 1.4, 0.5], groundAlbedo: [0.4, 0.5, 0.8],
      rigOpts: { exposure: 1.35, haze: 0.0004, bloom: 0.4, bloomThreshold: 1.2, env: "proc:dayRoom", skyLevel: 0.11, gi: 1.0, contrast: 0.33, sat: 1.7, vig: 0.14, sunKelvin: 3800 } },
    update: (t, cam) => { Rm.update?.(t, cam); for (const u of ups) u(t, cam); },
  };
};

// ================================================================ CAMERAS
/** THE HOOK'S LENSES. A0 = FRAME 0 (the lamp fills the top, her at the button under it), A1 = the end of the push-in (on
 *  the red), B = the cut-in on her frozen face with the red lamp above. The loop shot = A0, held. */
export const HOOK_VIEWS: Record<"A0" | "A1" | "B0" | "B1", View> = {
  A0: { pos: [0.38, 1.62, 2.5], look: [0.14, 1.2, -0.7], fov: 42, fnum: 5.6 },
  A1: { pos: [0.34, 1.62, 1.95], look: [0.14, 1.24, -0.7], fov: 43, fnum: 5.6 },
  B0: { pos: [0.7, 1.62, 1.25], look: [0.22, 1.28, -0.8], fov: 48, fnum: 5.6 },
  B1: { pos: [0.66, 1.62, 1.15], look: [0.22, 1.28, -0.8], fov: 48, fnum: 5.6 },
};
const still = (v: View): ShotCam => () => () => ({ pos: v.pos, look: v.look, fov: v.fov, fnum: v.fnum ?? 8, focus: Math.hypot(v.look[0] - v.pos[0], v.look[1] - v.pos[1], v.look[2] - v.pos[2]) });
/** shot A: still on frame 0 until the run starts, one push-in through the Go run, then rest on the red */
export const camHookA: ShotCam = (from, to) => {
  const a = HOOK_VIEWS.A0, b = HOOK_VIEWS.A1, t0 = HOOK.go[0] - 0.3, t1 = HOOK.go[6]; void from; void to;
  const L = (x: number, y: number, u: number) => x + (y - x) * u;
  return (t: number): CamState => {
    const u = easeGlide((t - t0) / (t1 - t0)), pos: V3 = [L(a.pos[0], b.pos[0], u), L(a.pos[1], b.pos[1], u), L(a.pos[2], b.pos[2], u)], look: V3 = [L(a.look[0], b.look[0], u), L(a.look[1], b.look[1], u), L(a.look[2], b.look[2], u)];
    return { pos, look, fov: L(a.fov, b.fov, u), fnum: b.fnum ?? 8, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) };
  };
};
export const camHookB: ShotCam = glideRest(HOOK_VIEWS.B0, HOOK_VIEWS.B1, 30);
export const camLoop: ShotCam = still(HOOK_VIEWS.A0);

/** the film's camera table for this set: each lab shot of the v4 plan gets its lens by the LINE it plays (the script's
 *  numbering may change, its words will not); shots not staged yet fall back to the director's default view */
const roleOf = (start: string) => {
  const line = start.startsWith("line:") ? start.slice(5) : tokOf(start.slice(5))?.line;
  if (!line) return null;
  if (line === lineByText("tap your foot") || line === lineByText("go. go")) return camHookA;
  if (line === lineByText("did you tap")) return camHookB;
  if (line === lineByText("now try again")) return camLoop;
  return null;
};
export const CAMS: Record<string, ShotCam> = Object.fromEntries(SHOT_PLAN.filter((p) => p.set === "lab").map((p) => [p.id, roleOf(p.start)] as const).filter((x): x is [string, ShotCam] => !!x[1]));

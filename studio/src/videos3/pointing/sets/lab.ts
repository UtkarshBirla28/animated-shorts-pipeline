// SET 'lab' of 'pointing' (owner LAB, second build 2026-11-19 night, script v3): ONE picture, used twice.
// Two big glass jars on a sunlit white table (square to the lens at the end of each shot's arc): the EYE jar (just
// looking) and the POINTING HAND +
// SPEECH BUBBLE jar (pointing and saying it out loud). A pictogram plate over each jar, a plain TRIES bar in the plinth
// under each jar (the same number of tries on both sides), the volunteer soft behind them at a box with one lamp and
// three buttons. Six red "mistake" balls drop into the EYE jar, one into the other. No words, no digits, no researcher.
// Layout, frame plan, cameras and the RE-TIMING table: lab.cams.ts (LAB, LAB_CUES, labPlan).
// Light: rig interiorWarm (the shot table gives sunAz 95 / sunEl 25 = the low sun through the big window in the -X
// wall). The stage is turned 52 deg, so from the square view the sun is a three-quarter backlight from the left: the
// glass glows at its edges, the balls get a rim, long shadows + the jars' caustics run toward the lens across the
// table. Two ceiling LED
// panels (rect practicals) fill the fronts. hints.rigOpts take the haze / bloom of the stock interior rig down (the
// first drafts were hazy and washed).
// THE BALLS: a real little rigid-body simulation per jar (kit/home ballSim), baked at build time, a pure function of t;
// the release times are solved so that each ball's FIRST tink lands on its cue (kit/home dropsForImpacts).
// Life: balls fall, bounce, clack into the pile; the bars fill; the lamp blinks; she presses / points, ear, snaps; her
// speech bubble pops; two plants stir; the lens arcs round the jars.
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../../../kit/core/ctx";
import { room } from "../../../kit/surfaces/interior";
import { addDecals } from "../../../kit/surfaces/decals";
import { prop } from "../../../kit/props/catalog";
import { wallClock } from "../../../kit/home/clock";   // LOOK v2
import * as kfx from "../../../kit/fx";
import { workTable, taskBoard, cable, redBalls, ceilingPanel, wainscot, conduit, whiteboard, jarStation, glassShadow, dropsForImpacts, drawPictogram, boxEnv,
  pbr, mesh, rboxG, canvas, type LampState, type BallDrop, type C3 } from "../../../kit/home";
import type { Beat, Resolver } from "../cast/moves";
import { LAB, S2W, labPlan, type LabPlan } from "./lab.cams";

/** the lab's resolved events (film seconds), filled at build time: SOUND reads the tinks from the page log ("lab plan") */
export const LAB_SCHEDULE: { plan: LabPlan | null; eyeDrops: number[]; fingerDrop: number; tinks: number[]; rest: number[] } = { plan: null, eyeDrops: [], fingerDrop: 0, tinks: [], rest: [] };

const sst = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
/** the pop curve (scale 0 -> 1.12 -> 1 in ~8 f), the cast's own */
const popK = (f: number, f0: number) => { const q = (f - f0) / 8; return q <= 0 ? 0 : q < 1 ? 1.12 * Math.sin((q * Math.PI) / 2) : 1 + 0.12 * Math.exp(-(q - 1) * 3) * Math.cos((q - 1) * 6); };

/** what the glass and the glossy balls REFLECT: this room from the jars' place (world axes; radiance scene-linear) */
const labEnv = (ctx: KitCtx) => {
  const R = LAB.room, W = LAB.window, W2 = LAB.window2, eyeY = 1.0, ex = LAB.origin[0], ez = LAB.origin[2];
  const T = LAB.table, cy = Math.cos(LAB.yaw), sy = Math.sin(LAB.yaw), tan = Math.tan((25 * Math.PI) / 180);
  const wall: C3 = [0.34, 0.4, 0.36], dado: C3 = [0.17, 0.22, 0.19];
  return boxEnv(ctx, { key: "lab:" + JSON.stringify([LAB.origin, LAB.yaw, R, W]), size: 1024,
    xn: ex - R.x0, xp: R.x0 + R.w - ex, zn: ez - R.z0, zp: R.z0 + R.d - ez, up: R.h - eyeY, down: eyeY,
    shade: (face, p) => {
      const y = p[1] + eyeY, wz = p[2] + ez, wx = p[0] + ex;
      if (face === "-x") {
        if (wz > W.z0 && wz < W.z1 && y > W.sill && y < W.sill + W.h) {
          const u = (wz - W.z0) / (W.z1 - W.z0), v = (y - W.sill) / W.h, fw = 0.06;
          const bar = wz - W.z0 < fw || W.z1 - wz < fw || y - W.sill < fw || W.sill + W.h - y < fw || Math.abs(u - 0.5) * (W.z1 - W.z0) < 0.03 || Math.abs(v - 0.55) * W.h < 0.025;
          if (bar) return [0.5, 0.5, 0.48];
          return v < 0.12 ? [1.6, 2.3, 1.2] : [8.5 + 4 * v, 9.2 + 4 * v, 9.6 + 5 * v];        // the garden under the horizon, then the sky
        }
        return y < 0.9 ? dado : wall;
      }
      if (face === "+y") {
        for (const [px, pz] of PANELS) if (Math.abs(wx - px) < 0.3 && Math.abs(wz - pz) < 0.6) return [7.5, 7.3, 6.9];
        return [0.62, 0.62, 0.6];
      }
      if (face === "-y") {
        // the jar stands on the sunlit table: what it sees below is the table top (0.2 m under the eye), not the floor
        const k = 0.22 / eyeY, dx = p[0] * k, dz = p[2] * k, sx = dx * cy - dz * sy, sz = dx * sy + dz * cy;
        if (Math.abs(sx) < T.w / 2 && sz > T.zc - T.d / 2 && sz < T.zc + T.d / 2) return [1.9, 1.8, 1.62];
        const lit = wz + 0.087 * (wx - R.x0) > W.z0 && wz + 0.087 * (wx - R.x0) < W.z1 && (wx - R.x0) * tan > W.sill && (wx - R.x0) * tan < W.sill + W.h;
        return lit ? [1.25, 1.2, 1.05] : [0.3, 0.31, 0.29];
      }
      if (face === "+x") return wz > -2.9 && wz < -1.1 && y > 1.05 && y < 2.0 ? [1.25, 1.25, 1.2] : y < 0.9 ? [0.26, 0.32, 0.28] : [0.5, 0.56, 0.52];   // the whiteboard
      if (face === "+z" && wx > W2.x0 && wx < W2.x1 && y > W.sill && y < W.sill + W.h) {
        const u = (wx - W2.x0) / (W2.x1 - W2.x0), v = (y - W.sill) / W.h, fw = 0.06;
        if (wx - W2.x0 < fw || W2.x1 - wx < fw || y - W.sill < fw || W.sill + W.h - y < fw || Math.abs(u - 0.5) * (W2.x1 - W2.x0) < 0.03 || Math.abs(v - 0.55) * W.h < 0.025) return [0.45, 0.45, 0.43];
        return v < 0.1 ? [1.4, 1.9, 1.1] : [6.5 + 3 * v, 7.2 + 3 * v, 7.8 + 4 * v];
      }
      return y < 0.9 ? dado : [0.42, 0.48, 0.44];
    } });
};
/** the two ceiling LED panels (world x, z): one over the lens side of the table (it lights the FRONTS of the plates,
 *  the balls and the plinths), one over the volunteer */
const PANELS: [number, number][] = [[S2W(0.1, 0, 1.15)[0], S2W(0.1, 0, 1.15)[2]], [S2W(LAB.volunteer.x, 0, LAB.volunteer.z + 0.9)[0], S2W(LAB.volunteer.x, 0, LAB.volunteer.z + 0.9)[2]]];

/** the volunteer's speech bubble: a white comic bubble with the pointing-hand pictogram (pops on the snap).
 *  tail "left" = down-left to her mouth (the bubble beside her, at her right as the lens sees her); "down" = straight
 *  down to her head (the bubble over her head at the hold) */
const bubbleTex = (tail: "left" | "down") => {
  const { cv, g: c } = canvas(512, 512); c.clearRect(0, 0, 512, 512);
  c.lineJoin = "round"; c.fillStyle = "#fbfbf8"; c.strokeStyle = "#2c1e2a"; c.lineWidth = 26;
  const ex = tail === "left" ? 290 : 256, ey = tail === "left" ? 256 : 222, ox = tail === "left" ? 78 : 44, oy = tail === "left" ? -42 : -76;
  const T: number[][] = tail === "left" ? [[116, 262], [6, 318], [110, 352]] : [[214, 380], [244, 500], [300, 384]];
  c.beginPath(); c.moveTo(T[0][0], T[0][1]); c.lineTo(T[1][0], T[1][1]); c.lineTo(T[2][0], T[2][1]); c.closePath(); c.stroke(); c.fill();
  c.beginPath(); c.ellipse(ex, ey, 204, 176, 0, 0, Math.PI * 2); c.stroke(); c.fill();
  c.beginPath(); c.moveTo(T[0][0] + (tail === "left" ? 4 : 6), T[0][1] + (tail === "left" ? 8 : -8)); c.lineTo(T[1][0] + (tail === "left" ? 16 : 0), T[1][1] - (tail === "left" ? 2 : 18)); c.lineTo(T[2][0] + (tail === "left" ? 4 : -6), T[2][1] - 8); c.closePath(); c.fill();
  drawPictogram(c, "hand", ox, oy, 0.82, "#1d141b", "#fbfbf8");                    // the hand of the jar's pictogram
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

export const build_lab = async (ctx: KitCtx): Promise<Built> => {
  const tb0 = performance.now();
  const g = new THREE.Group(); g.name = "set:lab";
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const add = <B extends { object: THREE.Object3D; update?: (t: number, cam: THREE.Camera) => void }>(b: B, to: THREE.Object3D = g) => { to.add(b.object); if (b.update) ups.push(b.update); return b; };
  const R = LAB.room, WN = LAB.window, T = LAB.table, J = LAB.jar, PL = LAB.plinth;
  const P = labPlan(); LAB_SCHEDULE.plan = P;
  const lens = S2W(-0.3, 0, 1.25), VOL = LAB.volunteer;

  // ---------------------------------------------------------------- the room: pale sage walls, white trim, speckled vinyl
  const Rm = await room(ctx, {
    origin: [R.x0, 0, R.z0], w: R.w, d: R.d, h: R.h, thick: 0.25, seed: 16,
    floor: "vinyl_speckled", floorOpts: { tint: [0.4, 0.55, 0.95], value: 0.66, sat: 1.5,   /* LOOK v2: was tint [0.8, 0.82, 0.78], value 1.08, sat 0.45 */ rough: 0.55, wear: { polish: 0.7, centre: 0.35, chips: 0.05 }, dirt: { edge: 0.3, joints: 0.1, grime: 0.04 } },
    wall: "plaster", wallTint: [0.2, 0.74, 0.78], wallOpts: { value: 1.6, sat: 1.3,   /* LOOK v2: a teal wall (was sage [0.75, 0.92, 0.76] = olive on screen; a warm white read tan) */ ao: 0.4, cavity: 0.35, macro: { amount: 0.006 }, dirt: { bottom: 0.1, heightM: 0.22, baseY: 0, grime: 0.006, edge: 0 } },
    windows: [{ wall: "left", at: R.z0 + R.d - (WN.z0 + WN.z1) / 2, w: WN.z1 - WN.z0, h: WN.h, sill: WN.sill, curtains: false },
      { wall: "front", at: R.x0 + R.w - (LAB.window2.x0 + LAB.window2.x1) / 2, w: LAB.window2.x1 - LAB.window2.x0, h: WN.h, sill: WN.sill, curtains: false }],
    doors: [{ wall: "front", at: 1.2, w: 0.9, h: 2.1, color: [0.9, 0.9, 0.87] }],
    radiator: true, bounce: 0.05, trimColor: [0.94, 0.94, 0.91],
    lens: { points: [[lens[0], lens[2]], [LAB.origin[0], LAB.origin[2]], [S2W(VOL.x, 0, VOL.z)[0], S2W(VOL.x, 0, VOL.z)[2]]] },
  });
  g.add(Rm.object);
  addDecals(Rm.mats.floor, [
    { type: "wear", at: [LAB.origin[0] + 0.5, LAB.origin[2] + 0.6], size: [1.6, 1.0], opacity: 0.45 },             // where people stand at the table
    { type: "wear", at: [S2W(LAB.volunteer.x, 0, LAB.volunteer.z - 0.2)[0], S2W(LAB.volunteer.x, 0, LAB.volunteer.z - 0.2)[2]], size: [0.9, 0.9], opacity: 0.5 },                 // the stool's scuffs
    { type: "stain", at: [-1.2, 0.9], size: [0.3, 0.18], opacity: 0.25, rot: 0.6 },
    { type: "crack", at: [0.4, -0.1], size: [6.0, 0.006], opacity: 0.5 },                                           // a welded seam between two vinyl sheets
  ]);
  // the dado on the two walls the lens sees (the window wall beyond the window, the back wall), + conduit and a socket
  { const d1 = wainscot({ len: WN.z0 - 0.1 - R.z0, seed: 3 }); d1.position.set(R.x0, 0, WN.z0 - 0.1); d1.rotation.y = Math.PI / 2; g.add(d1);       // local x runs toward -Z
    const d2 = wainscot({ len: R.w, seed: 4 }); d2.position.set(R.x0, 0, R.z0); g.add(d2);
    const c1 = conduit([[0.35, 0.9], [0.35, 2.55], [2.2, 2.55]], { box: [0.35, 1.16] }); c1.position.set(R.x0, 0, R.z0 + 0.0); g.add(c1); }
  { const wb = whiteboard({ w: 1.8, h: 0.95 }); wb.position.set(R.x0 + R.w - 0.004, 1.52, -2.0); wb.rotation.y = -Math.PI / 2; g.add(wb); }
  // LOOK v2 (2026-11-20, look director): COLOUR IN THE ROOM. Text-free posters in strong colours on the back wall, a big
  // red wall clock, stacks of coloured storage bins under them. Remove this block to restore the old room.
  {
    const posterTex = (seed: number) => {
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const c = cv.getContext("2d")!;
      const BG = ["#1d3f8a", "#c8263c", "#0f7a5c", "#5b2fa8"], PAL = ["#f07a1a", "#2bb37a", "#1f8fd6", "#e8452c", "#d23f8f", "#f4f1ea", "#11a3a3"];
      c.fillStyle = BG[seed % BG.length]; c.fillRect(0, 0, 256, 360);
      let r = seed * 9301 + 49297; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
      for (let i = 0; i < 5; i++) { c.fillStyle = PAL[(seed + i) % PAL.length]; const x = rnd() * 256, y = rnd() * 260, d = 40 + rnd() * 90; if (i % 2) { c.beginPath(); c.arc(x, y, d / 2, 0, 7); c.fill(); } else c.fillRect(x - d / 2, y - d / 3, d, d * 0.66); }
      c.fillStyle = "rgba(255,255,255,0.85)"; c.fillRect(24, 290, 150, 14); c.fillRect(24, 314, 100, 10);   // abstract "lines", no text
      c.strokeStyle = "#ffffff"; c.lineWidth = 10; c.strokeRect(5, 5, 246, 350);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const xs = [-1.9, -0.95, 1.55, 2.5];
    xs.forEach((x, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), new THREE.MeshStandardMaterial({ map: posterTex(i + 1), roughness: 0.55 }));
      m.position.set(x, 1.72, R.z0 + 0.012); m.receiveShadow = true; m.name = "labPoster" + i; g.add(m); });
    add(await wallClock(ctx, { pos: [0.3, 2.35, R.z0 + 0.006], yaw: 0, radius: 0.32, rim: [0.8, 0.12, 0.1] }));
    const BINS = ["#e8452c", "#1f8fd6", "#2bb37a", "#f07a1a", "#6a4fd0", "#d23f8f"];
    BINS.forEach((col, i) => { const bx = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.42 }));
      bx.position.set(-1.35 + (i % 3) * 0.55 + (i >= 3 ? 1.95 : 0), 0.18 + (i % 2) * 0.36, R.z0 + 0.28); bx.castShadow = bx.receiveShadow = true; g.add(bx); });
  }
  // a roller-blind housing at the window head (the blind is up)
  g.add(mesh(rboxG(R.x0 + 0.02, WN.sill + WN.h + 0.01, WN.z0 - 0.05, R.x0 + 0.11, WN.sill + WN.h + 0.1, WN.z1 + 0.05, 0.01), pbr({ color: [0.92, 0.92, 0.9], rough: 0.45, peel: 0.3 }), true, "blindHousing"));

  // ---------------------------------------------------------------- the stage: table, the two stations, the balls
  const stage = new THREE.Group(); stage.name = "labStage"; stage.position.set(...LAB.origin); stage.rotation.y = LAB.yaw; g.add(stage);
  const env = labEnv(ctx);
  const tab = await workTable(ctx, { w: T.w, d: T.d, h: T.h, plain: [0.16, 0.42, 0.72], rough: 0.4 }); tab.object.position.set(0, 0, T.zc); stage.add(tab.object);   // LOOK v2: a blue laminate top (was plain [0.7, 0.665, 0.59]: the bare peach table)
  const ty = T.h, ex = -J.gap / 2, fx = J.gap / 2;
  const eye = jarStation(ctx, { icon: "eye", jar: { r: J.r, h: J.h }, w: PL.w, h: PL.h, d: PL.d, env, seed: 1, rodSide: -1 });
  const fin = jarStation(ctx, { icon: "finger", jar: { r: J.r, h: J.h }, w: PL.w, h: PL.h, d: PL.d, env, seed: 2, rodSide: 1 });
  eye.object.position.set(ex, ty, 0); fin.object.position.set(fx, ty, 0); fin.object.rotation.y = -0.012; stage.add(eye.object, fin.object);
  for (const x of [ex, fx]) add(glassShadow(ctx, { at: [x, 0], y: ty, baseY: ty + PL.h, r: J.r, h: J.h, parentYaw: LAB.yaw, skip: 0.2, mul: false }), stage);   // the jars cast their own soft shadow now (jars.ts ditherDepth): only the caustic lines are drawn
  // each plinth's lead: out of its back, across the table, over the far edge
  for (const x of [ex, fx]) stage.add(cable([[x + 0.05, ty + 0.02, -PL.d / 2 + 0.002], [x + 0.055, ty + 0.006, -PL.d / 2 - 0.035], [x + 0.03, ty + 0.005, -0.2], [x * 0.5, ty + 0.005, T.zc - T.d / 2 + 0.02], [x * 0.45, ty - 0.02, T.zc - T.d / 2 - 0.012], [x * 0.45, ty - 0.3, T.zc - T.d / 2 - 0.02]], 0.0028));
  // THE BALLS (stage coordinates). The pile is a zigzag column: a 7.2 cm ball in a 13.3 cm jar can only sit left, right,
  // left... so all six stay visible and countable. Each ball is released over the ball before it, a little toward its
  // own side: it lands, bounces, and drops into its pocket.
  // pile: a ball that has landed is HELD by the wall and the balls under it, so each later ball clacks, hops 2-3 cm and
  // rolls into its pocket in about 0.4 s (without it the one-pass solver swallowed every bounce on the pile)
  const r = LAB.ballR, top = ty + PL.h + J.h + 0.5, simO = { r, e: 0.42, eBall: 0.45, mu: 0.35, rimGuard: 3 * r, pile: { w: 0.12, e: 0.45 } };
  const eyeJ = eye.jarSpace([ex, ty, 0]), finJ = fin.jarSpace([fx, ty, 0]), lim = eyeJ.innerR - r;
  const ts = performance.now();
  const E = dropsForImpacts(eyeJ, P.eyeImpacts, (k, t): BallDrop => {
    const side = k % 2 ? 1 : -1, x = k === 0 ? -0.02 : -side * lim + side * 0.016;
    return { t, from: [ex + x, top, 0.0015 * (((k * 7) % 3) - 1)], v: [k === 0 ? -0.02 : 0, 0, 0] };
  }, { ...simO, tEnd: P.eyeImpacts[5] + 4 });
  const F = dropsForImpacts(finJ, [P.fingerImpact], (_k, t): BallDrop => ({ t, from: [fx - 0.012, top, 0.004], v: [0.03, 0, -0.01] }), { ...simO, tEnd: P.fingerImpact + 4 });
  add(redBalls(ctx, [{ tracks: E.tracks, drops: E.drops }, { tracks: F.tracks, drops: F.drops }], { r, env, envK: 0.32, color: [0.58, 0.01, 0.014] }), stage);
  LAB_SCHEDULE.eyeDrops = E.drops.map((d) => +d.t.toFixed(3)); LAB_SCHEDULE.fingerDrop = +F.drops[0].t.toFixed(3);
  LAB_SCHEDULE.tinks = [...E.tracks, ...F.tracks].map((tr) => +tr.firstImpact.toFixed(3));
  LAB_SCHEDULE.rest = [...E.tracks, ...F.tracks].map((tr) => { let s = tr.t0; const n = tr.n - 1; for (let i = 0; i < tr.n; i++) if (Math.hypot(tr.pos[i * 3] - tr.pos[n * 3], tr.pos[i * 3 + 1] - tr.pos[n * 3 + 1], tr.pos[i * 3 + 2] - tr.pos[n * 3 + 2]) > 0.002) s = tr.t0 + i / tr.hz; return +s.toFixed(2); });
  console.warn(`lab plan ${JSON.stringify({ source: P.source, A: [+P.tA.toFixed(2), +(P.tA + P.durA).toFixed(2)], B: [+P.tB.toFixed(2), +(P.tB + P.durB).toFixed(2)], tinks: LAB_SCHEDULE.tinks, releases: [...LAB_SCHEDULE.eyeDrops, LAB_SCHEDULE.fingerDrop], settled: LAB_SCHEDULE.rest,
    presses: [+P.presses[0].toFixed(2), +P.presses[P.presses.length - 1].toFixed(2), P.presses.length], fillB: P.fillB.map((x) => +x.toFixed(2)), call: [+P.callName.toFixed(2), +P.callStatus.toFixed(2)], simMs: Math.round(performance.now() - ts), err: +Math.max(E.err, F.err).toFixed(4) })}`);

  // ---------------------------------------------------------------- the TRIES bars + the box's lamp and buttons (pure in t)
  const N = P.presses.length;
  const eyeBar = (t: number) => { let k = 0; for (const p of P.presses) k += sst(p - 0.02, p + 0.06, t); return k / N; };
  const finBar = (t: number) => { let k = 0; for (let i = 0; i < N; i++) { const p = P.fillB[0] + ((P.fillB[1] - P.fillB[0]) * i) / (N - 1); k += sst(p - 0.02, p + 0.06, t); } return k / N; };
  ups.push((t) => { eye.setBar(eyeBar(t)); fin.setBar(finBar(t)); });
  // the lamp: one colour per trial; in use B it holds one colour while she points at it and calls it out
  const COLS: LampState[] = [1, 3, 2, 3, 1, 2, 2, 1, 3, 1, 2, 3, 3, 2, 1, 2, 3, 1];
  const trials: { t0: number; t1: number; c: LampState; btn: number }[] = [];
  // use A: the lamp shows the next colour as soon as she has pressed (a fast run: it never rests)
  P.presses.forEach((p, k) => trials.push({ t0: k ? P.presses[k - 1] + 0.035 : P.tA - 0.4, t1: p + 0.03, c: COLS[k % COLS.length], btn: [0, 2, 1, 2, 0, 1, 1, 0, 2][k % 9] }));
  // use B: a few quick trials, then ONE colour held while she points at it, calls it out and presses; then on
  const pressB = P.callStatus + 0.3, stepsB = Array.from({ length: N }, (_, i) => P.fillB[0] + ((P.fillB[1] - P.fillB[0]) * i) / (N - 1));
  let last = P.tB - 0.4;
  // the held colour goes in FIRST (lampAt takes the first match): no later trial may light the lamp before her press
  trials.push({ t0: P.callName - 0.28, t1: pressB + 0.03, c: 2, btn: 1 });
  for (const [i, p] of stepsB.entries()) { if (p > P.callName - 0.3 && p < pressB + 0.25) continue; const c = COLS[(i + 5) % COLS.length]; trials.push({ t0: Math.max(last, p - 0.4, p > pressB ? pressB + 0.06 : -1e9), t1: p + 0.03, c, btn: c - 1 }); last = p + 0.035; }
  // after her last press the lamp goes OUT (a lit lamp behind the EYE jar's rim read as a light on that jar at the hold)
  const lampAt = (t: number): LampState => { for (const tr of trials) if (t >= tr.t0 && t < tr.t1) return tr.c; return 0; };
  const pressAt = (i: number, t: number) => { let k = 0; for (const tr of trials) if (tr.btn === i) { const d = t - (tr.t1 - 0.03); if (d > -0.05 && d < 0.14) k = Math.max(k, d < 0 ? (d + 0.05) / 0.05 : 1 - d / 0.14); } return k; };

  // ---------------------------------------------------------------- the volunteer's corner: desk, box, stool, her, the bubble
  const DK = LAB.desk, vx = VOL.x, dz = VOL.z + DK.dz, bz = VOL.z + LAB.box.dz;
  const desk = await workTable(ctx, { w: DK.w, d: DK.d, h: DK.h, plain: [0.74, 0.74, 0.72], seed: 3 }); desk.object.position.set(vx, 0, dz); stage.add(desk.object);
  // the lamp stands on its own post at her LEFT as the lens sees her (board-local +x = stage -x: the board faces her):
  // she points SIDEWAYS at it, an arm the lens can read, toward the middle of the frame (s19 brings her in from the right)
  const board = taskBoard(ctx, { lamp: lampAt, press: pressAt, mast: { x: 0.3, z: -0.04, h: 0.46 } });
  board.object.position.set(vx, DK.h, bz); board.object.rotation.y = Math.PI; stage.add(board.object); ups.push((t) => board.update(t));
  stage.updateMatrixWorld(true);
  const lampW = board.object.localToWorld(new THREE.Vector3(...board.lampLocal)), btnW = board.object.localToWorld(new THREE.Vector3(0, 0.1, 0.055));
  const lampV: V3 = [lampW.x, lampW.y, lampW.z], btnV: V3 = [btnW.x, btnW.y + 0.02, btnW.z];
  { const gl = board.gland; stage.add(cable([[vx - gl[0], DK.h + gl[1], bz - gl[2]], [vx - gl[0] - 0.05, DK.h + 0.006, bz + 0.2], [vx - 0.42, DK.h + 0.006, dz + DK.d / 2 - 0.03], [vx - 0.47, DK.h - 0.02, dz + DK.d / 2 + 0.012], [vx - 0.47, 0.3, dz + DK.d / 2 + 0.02], [vx - 0.5, 0.01, dz + DK.d / 2 + 0.1]])); }
  const VP = S2W(vx, 0, VOL.z);
  try { g.add((await prop(ctx, "stool_wood", { pos: S2W(vx + 0.02, 0, VOL.z - 0.04), rotY: 0.4, scale: VOL.seat / 0.437 })).object); } catch (e) { console.warn("lab: stool prop missing", e); }
  try {
    // CAST, loaded lazily (module-cycle rule). Her acting is keyed to THIS set's plan (frames), on the cast's own moves.
    const [{ castCardOf }, MV] = await Promise.all([import("../cast/member"), import("../cast/moves")]);
    const fr = (t: number) => Math.round(t * 30), per = Math.max(3, ((P.presses[N - 1] - P.presses[0]) / (N - 1)) * 30);
    const beats: Beat[] = [
      // use A: she only LOOKS and presses, a fast run
      { who: "volunteer", m: "press", at: P.presses[0] * 30 - per / 2, until: P.presses[N - 1] * 30 + per / 2, per },
      { who: "volunteer", m: "face", at: fr(P.tA) - 20, until: fr(P.tA + P.durA) + 20, expr: "focusB" },
      // use B: she POINTS at the lamp and SAYS it (arm out on the name, hand by the ear, snap), presses, a proud nod on the one ball
      { who: "volunteer", m: "call", name: fr(P.callName), status: fr(P.callStatus), style: "plain", until: fr(P.fingerImpact) + 6 },
      { who: "volunteer", m: "face", at: fr(P.callName) - 8, until: fr(P.callStatus) + 14, expr: "brightO", mouth: "vA" },
      { who: "volunteer", m: "nod", at: fr(P.fingerImpact) + 3, amt: 1.3 },
      { who: "volunteer", m: "face", at: fr(P.callStatus) + 14, until: fr(P.tB + P.durB) + 90, expr: "proudB" },
    ];
    const NOW: Resolver = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: (f) => f + 120 };
    const timed = MV.timeBeats(beats, NOW);
    const vol = await castCardOf(ctx, "volunteer", { pos: () => VP, yaw: () => LAB.yaw, seated: VOL.seat,
      aim: (t) => (t < P.tB - 0.2 ? btnV : lampV), look: (t) => (t < P.tB - 0.2 ? (Math.floor(t * 2.2) % 3 ? lampV : btnV) : lampV) }, (e) => MV.actBeats("volunteer", timed, e));
    add(vol);
  } catch (e) { console.warn("lab: CAST not available, no volunteer", e); }
  { // her speech bubble: pops beside her mouth on the snap (she is seen through the FINGER jar then, the bubble in the
    // clear air at her right), and as the single ball lands it floats up to sit over her head, between the two plates
    // two faces of one bubble: the tail toward her mouth beside her, the tail down to her head over her (cross-faded
    // while it floats up)
    const mk = (tail: "left" | "down") => { const m = new THREE.MeshBasicMaterial({ map: bubbleTex(tail), transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(0.86, 0.86, 0.84) }); m.customProgramCacheKey = () => "lab:bubble"; return m; };
    const mL = mk("left"), mD = mk("down");
    const q = new THREE.Group(); q.name = "callBubble"; stage.add(q);
    for (const m of [mL, mD]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), m); b.renderOrder = m === mL ? 3 : 3.1; q.add(b); }
    // beside her mouth at her RIGHT (on the snap that is the clear air right of the FINGER jar's rod: the s19 lens comes
    // round from the right) -> over her head, on the stage axis (the middle of the gap between the two plates at the
    // hold). The float goes LEFT first (under the FINGER plate, behind clear glass), then UP into the gap, so the
    // bubble never passes behind a plate
    const p0: V3 = [vx + 0.3, 1.3, VOL.z + 0.12], p1: V3 = [0.0, 1.55, VOL.z + 0.12];
    ups.push((t) => {
      const k = popK(t * 30, P.callStatus * 30 - 1), rx = sst(P.fingerImpact - 0.45, P.fingerImpact + 0.15, t), ry = sst(P.fingerImpact - 0.1, P.fingerImpact + 0.45, t), bob = 0.012 * Math.sin(t * 2.6);
      q.scale.setScalar(Math.max(1e-4, k * (1 - 0.1 * ry))); q.position.set(p0[0] + (p1[0] - p0[0]) * rx, p0[1] + (p1[1] - p0[1]) * ry + bob, p0[2]); q.rotation.z = (0.06 - 0.03 * Math.sin(t * 2.1)) * (1 - ry) + 0.02 * Math.sin(t * 2.1) * ry;
      const f = sst(0.35, 0.75, ry); mL.opacity = 1 - f; mD.opacity = f; mL.visible = f < 0.999; mD.visible = f > 0.001;
    });
  }

  // ---------------------------------------------------------------- light: two ceiling panels; life: plants, dust
  for (const [x, z] of PANELS) { const cp = ceilingPanel(ctx, [x, R.h, z], { lumens: 650, kelvin: 4500 }); g.add(cp.object); if (cp.lamp) g.add(cp.lamp.object); }
  const plants: THREE.Object3D[] = [], potM = pbr({ color: [0.86, 0.87, 0.85], rough: 0.3, peel: 0.4, tile: 0.2, clearcoat: 0.5, ccRough: 0.2 });
  for (const [name, pos, sc] of [["potted_tall", [R.x0 + 0.42, 0, WN.z0 - 0.42], 1.05], ["potted_tall", [R.x0 + 0.5, 0, R.z0 + 0.5], 1.15], ["potted", [R.x0 - 0.06, WN.sill, WN.z0 + 0.5], 0.42]] as [string, V3, number][]) {
    try { const p = (await prop(ctx, name, { pos, scale: sc, contact: 0.4 })).object; p.traverse((q) => { const m = q as THREE.Mesh; if (m.isMesh && /_pot/i.test(m.name)) m.material = potM; }); g.add(p); plants.push(p); } catch (e) { console.warn("lab: plant prop missing", name, e); }
  }
  // a draught from the open window: the plants stir (gusts every few seconds, a quick flutter on top)
  ups.push((t) => plants.forEach((p, i) => { const gust = 0.6 + 0.4 * Math.sin(t * 0.9 + i * 1.7); p.rotation.z = gust * (0.026 * Math.sin(t * 1.7 + i * 2.1) + 0.012 * Math.sin(t * 4.3 + i)); p.rotation.x = gust * 0.018 * Math.sin(t * 2.3 + 2 + i); }));
  // Block 14 (life): DUST in the sun beam (motes are lit by the sun's shadow map, so only the beam shows them; at f/4.5
  // the lens blur no longer turns a speck into a ring of 8 dots). (A steaming tea cup on her desk was tried and dropped:
  // at the hold its steam sat inside the FINGER jar like smoke)
  { const cs = [[-0.8, 0.85, -1.8], [0.8, 0.85, -1.8], [-0.8, 0.85, 0.6], [0.8, 0.85, 0.6]].map(([x, y, z]) => S2W(x, y, z));
    const lo: V3 = [Math.min(...cs.map((c) => c[0])), 0.85, Math.min(...cs.map((c) => c[2]))], hi: V3 = [Math.max(...cs.map((c) => c[0])), 1.7, Math.max(...cs.map((c) => c[2]))];
    const dust = kfx.motes(ctx, { box: [lo, hi], count: 160, seed: 17 }); g.add(dust.object); dust.object.visible = false; if (dust.update) ups.push(dust.update); }   // LOOK v2: count 650 -> 160 (sharp specks read as snow or lens dirt)

  // outside the window: the rig's sky + a far lawn
  { const fg = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), pbr({ color: [0.36, 0.42, 0.28], rough: 0.95, peel: 0 })); fg.rotation.x = -Math.PI / 2; fg.position.set(R.x0 - 100.3, -0.3, 0); g.add(fg); }
  console.warn(`kit set "lab" (LAB) built in ${(performance.now() - tb0).toFixed(0)} ms`);
  return {
    object: g,
    hints: { shadowCenter: [-0.5, 0, 0.3], shadowExt: 3.6, probe: S2W(0, 1.3, 0.5), groundAlbedo: [0.52, 0.5, 0.46],
      // the stock interior rig is tuned for a dim room (exposure 2.4, haze 0.0028, bloom 0.5): on a sunlit white table
      // that washes the picture out. A bright, clean daylight lab: less exposure, hardly any haze, a tighter bloom, a
      // stronger neutral room fill for the fronts
      // Block 14 (the gate read the lab GREY, chroma 15): a late-afternoon GOLDEN sun (3300 K under the 4500 K white
      // balance), the warm room IBL, a warm table + bounce, a little more saturation and a warm highlight tint
      rigOpts: { exposure: 1.35,   /* LOOK v2: 1.04 -> 1.35 (the room read dark and dull) */ haze: 0.0004, bloom: 0.32, bloomThreshold: 1.3, env: "proc:dayRoom", skyLevel: 0.11, gi: 1.0, contrast: 0.33, sat: 1.62, vig: 0.16,
        sunKelvin: 3600, hiTint: [1.02, 1.0, 0.96], loTint: [0.96, 1.0, 1.05] } },
    update: (t, cam) => { Rm.update?.(t, cam); for (const u of ups) u(t, cam); },
  };
};
// this set's cameras travel with the set (kit_render hashes per set; see cams.ts): keep this line
export { CAMS_lab, MARKS_lab } from "./lab.cams";

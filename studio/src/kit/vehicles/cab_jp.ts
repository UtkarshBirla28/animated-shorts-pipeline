// kit/vehicles (TRAIN owner): K-P2, the driver's cab of the Tokyo commuter EMU (desk on the LEFT, as on JR East
// E231 / E233 / E235 cars). Car-local frame, FLOOR at y = 0, the nose at z' = 0, the partition at z' = D.cabDepth.
// Lit by its OWN environment map (mats.ts cabEnv: the bright windscreen band ahead, side windows, a dim cream ceiling).
// Parts: the charcoal desk (extruded side profile: a hooded instrument binnacle whose face leans 55 deg toward the
// driver, a worktop, an apron, a knee recess) with a black instrument plate; on the plate: the round analog
// SPEEDOMETER 0-120 km/h (white backlit face, black ticks + digits, orange needle, chrome bezel, glass) between two
// small LCDs (abstract bars only, stepping), a twin-needle brake gauge, the round amber DOOR-CLOSED PILOT LAMP (a 6 cm
// lens with a door icon, chrome bezel, a finger-worn ring round it; lit while all doors are closed), rows of small square push
// buttons; on the worktop: the silver POCKET WATCH lying in its holder (the second hand ticks), the T-handle
// one-handle master controller (left hand; a glove-polished edge in front of it), a reverser key; on the hood: the
// timetable card holder (the blank card faces the driver); the swivel seat on a raised platform with a ribbed rubber
// mat (scuffed under the heels) and a foot bar; the radio handset on the pillar by the crew door with a coiled cord;
// the right-hand cabinet with a switch panel, an extinguisher and the rolled signal flags; lined side walls round the
// sliding crew window and the crew door; the lined front wall with deep windscreen reveals, pillars, the emergency
// door's inner panel; the ceiling with a lamp, a vent and a speaker grille; the roller SUN BLIND part down on the
// driver's pane; and the cream PARTITION wall with two windows + a door (gaskets, screws, a kick plate, palm / nose
// smudges and the boy's breath fog on the window behind the driver). No text anywhere (digits on the dials).
import * as THREE from "three";
import type { Built, KitCtx, V3 } from "../core/ctx";
import { D, FACE } from "./dims";
import { parts, rbox, box, cyl, ring, disc, quad, quadN, arcWall, tube, extrude, meshes, dirtKey, gridHoles, sstep, put } from "./geo";
import { vmat, glass, lamp, canvasTex, screenMat, smudgeMap, cabEnv, carEnv, PAL } from "./mats";

export type CabJPOpts = {
  /** speedometer reading (km/h) at t */
  speed?: (t: number) => number;
  /** door-closed pilot lamp 0..1 at t (trainJP passes the true door order by default: lit once every car-side lamp is out) */
  pilot?: (t: number) => number;
  /** the boy's breath fog on his partition window, 0..1 at t; `fogWindow` = which window carries his palm / nose
   *  prints + the fog (default "right": script v3 puts the boy at the right-hand window; "left" = behind the driver) */
  fog?: (t: number) => number;
  fogWindow?: "left" | "right";
  /** brake cylinder / main reservoir needles (0..1 of the scale) */
  brake?: (t: number) => [number, number];
  /** master controller lever angle at t (rad; + = toward the driver = power, - = brake; default 0.3) */
  lever?: (t: number) => number;
  /** sun blind drop 0..1 on the driver's pane (default 0.12: a strip at the top; it must not hide a signal ahead) */
  blind?: number;
  /** add a small RECT practical for the instrument glow (default false: the dials are emissive + the cab env) */
  lights?: boolean;
  /** false at t = the PARTITION wall (both faces, windows, door, its fittings) is hidden: a cut-away for a lens just
   *  behind the driver in the car (the v4 film's v20). Default: always shown */
  partition?: (t: number) => boolean;
  /** false at t = the driver's seat BACK + headrest hidden (a lens in the car behind him: v4's v21 sees his arm) */
  seatBack?: (t: number) => boolean;
  /** false = no chrome handrails under the partition windows (car side): v4's v21, the kid's thin ink arm ran along one */
  passengerRails?: boolean;
  /** false = no radio handset (+ cord) on the pillar by the crew window (v4 v20 / v21: next to his glove it read as a phone) */
  handset?: boolean;
  /** colour overrides (sRGB hex) for the partition's PASSENGER face + the cab door panel (a film's look) */
  carFace?: string; doorPanel?: string;
  /** the crew window [z0, z1] (default [0.55, 1.30], two sashes); a custom one is ONE clear pane (trainJP crewWindow) */
  crewWindow?: [number, number] | [number, number, number];
};

// the instrument plate: the binnacle face from its bottom edge (u = 0: y 0.82, z 0.64, nearest the driver) up to the
// hood (u = 1: y 1.04, z 0.47). Its normal looks up-back at the driver's eyes.
const PANEL = { y0: 0.82, z0: 0.64, y1: 1.04, z1: 0.47 };
const PL = Math.hypot(PANEL.y1 - PANEL.y0, PANEL.z0 - PANEL.z1), PNY = (PANEL.z0 - PANEL.z1) / PL, PNZ = (PANEL.y1 - PANEL.y0) / PL;
const panelAt = (x: number, u: number, lift = 0): V3 => [x, PANEL.y0 + (PANEL.y1 - PANEL.y0) * u + PNY * lift, PANEL.z0 + (PANEL.z1 - PANEL.z0) * u + PNZ * lift];
const PANEL_ROT = -Math.atan2(PANEL.z0 - PANEL.z1, PANEL.y1 - PANEL.y0);   // rotation about X: local +Z -> the plate normal, local +Y -> up the plate
const LIFT = 0.014;                                                        // instruments sit on the black plate (8 mm bevel + 4 mm plate)

/** where things are (car-local, floor y = 0): the marks the film's cameras + the cast use */
export const CAB = {
  driverSeat: [-0.83, 0.12, 1.5] as V3,     // seat platform point under the driver
  driverHead: [-0.83, 1.36, 1.42] as V3,
  speedo: panelAt(-0.83, 0.5, LIFT),
  pilotLamp: panelAt(-0.415, 0.7, LIFT),
  watch: [-0.52, 0.83, 0.84] as V3,
  controller: [-1.14, 0.95, 0.86] as V3,    // the T grip
  /** the unit normal of the instrument plate (toward the driver) */
  panelNormal: [0, PNY, PNZ] as V3,
  partitionZ: D.cabDepth,
  /** the partition windows (L = behind the driver, R = the right-hand one where the boy stands, car side). Sill at
   *  0.80 m (a little lower than on a real car): a six-year-old's whole face shows over it, and so does the top of the
   *  75 cm suitcase when it bumps the wall under him */
  windowL: { x0: -1.3, x1: -0.44, y0: 0.8, y1: 1.86 },
  windowR: { x0: 0.44, x1: 1.3, y0: 0.55, y1: 1.86 },
  door: { x0: -0.36, x1: 0.3 },
  windscreenY: [FACE.wy0, FACE.wy1] as [number, number],
  /** the driver's windscreen pane (x range) */
  driverPane: FACE.panes[0],
};

const dialTex = () => canvasTex(512, 512, (g) => {
  const c = 256; g.fillStyle = "#101214"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#f4f3ee"; g.beginPath(); g.arc(c, c, 246, 0, Math.PI * 2); g.fill();
  const a0 = (-225 * Math.PI) / 180, span = (270 * Math.PI) / 180;
  for (let v = 0; v <= 120; v += 2) {
    const a = a0 + (v / 120) * span, major = v % 10 === 0, mid = v % 5 === 0;
    const r1 = 232, r0 = major ? 196 : mid ? 210 : 220;
    g.strokeStyle = "#16181a"; g.lineWidth = major ? 7 : mid ? 4 : 2.2;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
    if (major && v % 20 === 0) { g.fillStyle = "#16181a"; g.font = "bold 44px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(v), c + Math.cos(a) * 156, c + Math.sin(a) * 156); }
  }
  // a thin orange band at the limit zone, the hub
  g.strokeStyle = "#e8792a"; g.lineWidth = 8; g.beginPath(); g.arc(c, c, 238, a0 + span * (100 / 120), a0 + span); g.stroke();
  g.fillStyle = "#26292c"; g.beginPath(); g.arc(c, c, 26, 0, Math.PI * 2); g.fill();
});
const gaugeTex = () => canvasTex(256, 256, (g) => {
  const c = 128; g.fillStyle = "#101214"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#f2f1ec"; g.beginPath(); g.arc(c, c, 124, 0, Math.PI * 2); g.fill();
  const a0 = (-225 * Math.PI) / 180, span = (270 * Math.PI) / 180;
  for (let i = 0; i <= 20; i++) { const a = a0 + (i / 20) * span, m = i % 5 === 0; g.strokeStyle = "#1a1a1a"; g.lineWidth = m ? 4 : 2; g.beginPath(); g.moveTo(c + Math.cos(a) * (m ? 96 : 106), c + Math.sin(a) * (m ? 96 : 106)); g.lineTo(c + Math.cos(a) * 116, c + Math.sin(a) * 116); g.stroke(); if (m) { g.fillStyle = "#1a1a1a"; g.font = "bold 22px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i / 2), c + Math.cos(a) * 76, c + Math.sin(a) * 76); } }
});
const lcdTex = (v: number) => canvasTex(256, 180, (g) => {
  g.fillStyle = "#06121a"; g.fillRect(0, 0, 256, 180);
  g.fillStyle = "#1b3a4c"; g.fillRect(0, 0, 256, 24); g.fillRect(0, 156, 256, 24);
  for (let i = 0; i < 8; i++) { const h = 20 + ((i * 37 + v * 53) % 90); g.fillStyle = i === (v * 3) % 8 ? "#f2c21a" : "#3fc27a"; g.fillRect(16 + i * 29, 146 - h, 20, h); }
  for (let i = 0; i < 6; i++) { g.fillStyle = (i + v) % 3 === 0 ? "#5ab4e8" : "#2a5670"; g.fillRect(14 + i * 40, 4, 32, 14); }
  g.strokeStyle = "#5ab4e8"; g.lineWidth = 2; g.strokeRect(10, 30, 236, 120);
});
const watchTex = () => canvasTex(256, 256, (g) => {
  const c = 128; g.fillStyle = "#f6f4ee"; g.beginPath(); g.arc(c, c, 124, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, m = i % 5 === 0; g.strokeStyle = "#202020"; g.lineWidth = m ? 5 : 1.5; g.beginPath(); g.moveTo(c + Math.sin(a) * (m ? 98 : 108), c - Math.cos(a) * (m ? 98 : 108)); g.lineTo(c + Math.sin(a) * 116, c - Math.cos(a) * 116); g.stroke(); }
  g.fillStyle = "#202020"; g.font = "bold 34px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (const [n, a] of [[12, 0], [3, 90], [6, 180], [9, 270]] as const) { const r = (a * Math.PI) / 180; g.fillText(String(n), c + Math.sin(r) * 74, c - Math.cos(r) * 74); }
  g.beginPath(); g.arc(c, c + 46, 20, 0, Math.PI * 2); g.lineWidth = 1.5; g.stroke();   // the small seconds sub-dial ring
});
const pilotTex = () => canvasTex(256, 256, (g) => {
  const grd = g.createRadialGradient(128, 112, 8, 128, 128, 128); grd.addColorStop(0, "#ffcf70"); grd.addColorStop(0.6, "#ee9a28"); grd.addColorStop(1, "#a85a0c");
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  // the DOOR pictogram (two leaves with their windows, closed): pale, so it reads on the dark lens and glows on the lit one
  g.strokeStyle = "#fff3d2"; g.lineWidth = 13; g.lineJoin = "round"; g.strokeRect(74, 56, 108, 144); g.beginPath(); g.moveTo(128, 56); g.lineTo(128, 200); g.stroke();
  g.lineWidth = 7; g.strokeRect(90, 76, 24, 52); g.strokeRect(142, 76, 24, 52);
});

export const cabJP = async (ctx: KitCtx, o: CabJPOpts = {}): Promise<Built & { marks: typeof CAB }> => {
  const Z = D.cabDepth, X = D.innerHW, zB = FACE.zB, zi = FACE.zB - 0.07, fw = D.hw - FACE.rc;
  const env = cabEnv(ctx, 1), E = { envMap: env, env: 1 };
  const breath = smudgeMap(77, { prints: [[0.68, 0.18, 1.0], [0.45, 0.12, 0.8], [0.8, 0.3, 0.7], [0.12, 0.9, 0.5]], fog: [0.6, 0.14, 1.0], dust: 0.08 });
  const M: Record<string, THREE.Material> = {
    desk: vmat("cab-desk", { color: PAL.deskGrey, rough: 0.5, map: "satin", tile: 0.12, normalScale: 0.035, dirtColor: "#22201e", dirtRough: 0.75, ...E }),
    deskWorn: vmat("cab-desk-worn", { color: "#6a6d70", rough: 0.3, map: "brush", tile: 0.08, normalScale: 0.2, metal: 0.4, useDirt: false, ...E }),
    panel: vmat("cab-panel", { color: "#17181a", rough: 0.6, map: "satin", tile: 0.1, normalScale: 0.3, dirtColor: "#2c2b29", ...E }),
    // LOOK v2 (2026-11-20, look director): a warm floor, mint lining, a sky-blue ceiling, a red driver seat (were
    // floor #3a3c3f, lining #d6d2c6, ceil #e6e3db, seat #2c3340: a grey-cream box)
    floor: vmat("cab-floor", { color: "#8a4f2c", rough: 0.75, map: "ribs", tile: 0.06, normalScale: 0.5, dirtColor: "#6a675f", dirtRough: 0.6, ...E }),
    cream: vmat("cab-cream", { color: PAL.cream, rough: 0.5, map: "satin", tile: 0.25, normalScale: 0.05, dirtColor: "#8b8272", dirtRough: 0.65, ...E }),
    // the partition's PASSENGER face stands in the car: it takes the car's environment, not the cab's
    creamCar: vmat("cab-cream-carside", { color: PAL.laminate, rough: 0.5, map: "satin", tile: 0.25, normalScale: 0.05, dirtColor: "#8a8478", dirtRough: 0.6, envMap: carEnv(ctx, 1, 0), env: 1 }),
    // the cab door's panel is seen mostly from the car: the car's environment too (a shade creamier than the wall)
    creamDoor: vmat("cab-door-panel", { color: PAL.cream, rough: 0.5, map: "satin", tile: 0.25, normalScale: 0.05, dirtColor: "#8b8272", dirtRough: 0.65, envMap: carEnv(ctx, 1, 0), env: 0.8 }),
    lining: vmat("cab-lining", { color: "#62c2a6", rough: 0.55, map: "satin", tile: 0.3, normalScale: 0.04, dirtColor: "#7f7868", ...E }),
    ceil: vmat("cab-ceil", { color: "#86b9e6", rough: 0.6, map: "satin", tile: 0.3, normalScale: 0.04, useDirt: false, envMap: env, env: 1.9 }),
    chrome: vmat("cab-chrome", { color: PAL.chrome, rough: 0.14, metal: 1, map: "brush", tile: 0.05, normalScale: 0.05, useDirt: false, ...E }),
    steel: vmat("cab-steel", { color: "#9fa3a7", rough: 0.42, metal: 1, map: "brush", tile: 0.15, normalScale: 0.12, dirtColor: "#3a3835", ...E }),
    black: vmat("cab-black", { color: "#121314", rough: 0.45, map: "peel", tile: 0.08, normalScale: 0.25, dirtColor: "#3a3832", ...E }),
    rubber: vmat("cab-rubber", { color: "#0d0d0e", rough: 0.75, map: "peel", tile: 0.08, normalScale: 0.3, useDirt: false, ...E }),
    mat: vmat("cab-mat", { color: "#242527", rough: 0.8, map: "ribs", tile: 0.05, normalScale: 0.7, dirtColor: "#77746c", dirtRough: 0.6, ...E }),
    seat: vmat("cab-seat", { color: "#b8322a", rough: 0.9, map: "weave", tile: 0.04, normalScale: 0.7, dirtColor: "#4a5564", dirtRough: 0.6, ...E }),
    red: vmat("cab-red", { color: "#c42a20", rough: 0.35, useDirt: false, ...E }),
    flagR: vmat("cab-flagR", { color: "#c8302a", rough: 0.85, map: "weave", tile: 0.02, useDirt: false, ...E }),
    flagG: vmat("cab-flagG", { color: "#2c8a4a", rough: 0.85, map: "weave", tile: 0.02, useDirt: false, ...E }),
    btnG: vmat("cab-btnG", { color: "#2fae5c", rough: 0.3, emissive: "#2fae5c", emissiveIntensity: 0.3, useDirt: false, ...E }),
    btnY: vmat("cab-btnY", { color: "#e8c22a", rough: 0.3, emissive: "#e8c22a", emissiveIntensity: 0.25, useDirt: false, ...E }),
    btnW: vmat("cab-btnW", { color: "#e9e9e4", rough: 0.3, useDirt: false, ...E }),
    btnR: vmat("cab-btnR", { color: "#c8281f", rough: 0.3, useDirt: false, ...E }),
    card: vmat("cab-card", { color: "#f3f1ea", rough: 0.85, useDirt: false, ...E }),
    glassP: glass("partition-kid", { tint: 0x0a0c0d, opacity: 0.07, smudge: breath, ...E }),
    glass: glass("cab-glass", { tint: 0x0a0c0d, opacity: 0.06, smudge: smudgeMap(78, { dust: 0.06 }), ...E }),
    glassG: glass("cab-gauge-glass", { tint: 0x080808, opacity: 0.05, rough: 0.02, ...E }),
    blind: glass("cab-blind", { tint: 0x14211c, opacity: 0.75, rough: 0.6, ...E }),
  };
  if (o.carFace) (M.creamCar as THREE.MeshStandardMaterial).color.set(o.carFace);
  if (o.doorPanel) (M.creamDoor as THREE.MeshStandardMaterial).color.set(o.doorPanel);
  const P = parts();
  // ---- floor: a ribbed rubber floor + the driver's raised platform + a mat in front of the seat + a foot bar
  quadN(P, "floor", [-X, 0, zi], [X, 0, zi], [X, 0, Z], [-X, 0, Z], [0, 1, 0]);
  rbox(P, "panel", -X, 0.0, 0.98, -0.25, 0.12, Z - 0.05, 0.012);
  rbox(P, "steel", -0.262, 0.0, 0.98, -0.25, 0.124, Z - 0.05, 0.004);                 // the platform's stainless nosing
  rbox(P, "mat", -1.22, 0.12, 1.02, -0.42, 0.128, 1.44, 0.004);
  dirtKey(P, "mat", (x, _y, z) => Math.max(0, 1 - Math.hypot((x + 0.83) / 0.2, (z - 1.14) / 0.16)) * 0.85 + 0.12);
  dirtKey(P, "floor", (x, _y, z) => 0.12 + 0.3 * sstep(0.5, 1.3, Math.abs(x)) + 0.25 * Math.max(0, 1 - Math.hypot((x - 0.1) / 0.5, (z - 1.6) / 0.45)));
  cyl(P, "steel", [-1.1, 0.24, 0.83], [-0.5, 0.24, 0.83], 0.016, 10);
  for (const x of [-1.08, -0.52]) cyl(P, "steel", [x, 0.24, 0.83], [x, 0.3, 0.76], 0.012, 8);
  // ---- the desk (extruded side profile along x from -0.28 to -1.38)
  const prof: [number, number][] = [[0.14, 0.0], [0.14, PANEL.y1], [PANEL.z1, PANEL.y1], [PANEL.z0, PANEL.y0], [1.0, 0.79], [1.02, 0.775], [1.02, 0.62], [0.8, 0.5], [0.8, 0.0]];
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)); m.setPosition(-0.28, 0, 0);
  extrude(P, "desk", prof, 1.1, m, 0.008);
  // the hood's lip over the plate, the black instrument plate, the worktop's worn front edge, seams + screws
  rbox(P, "desk", -1.39, PANEL.y1 - 0.004, PANEL.z1 - 0.03, -0.27, PANEL.y1 + 0.018, PANEL.z1 + 0.035, 0.008, 2);
  { const g = new THREE.BoxGeometry(1.06, PL - 0.03, 0.004); g.rotateX(PANEL_ROT); g.translate(...panelAt(-0.83, 0.5, 0.01)); put(P, "panel", g); }
  rbox(P, "deskWorn", -1.37, 0.778, 0.99, -0.29, 0.8, 1.034, 0.012);
  for (const x of [-1.34, -0.32]) for (const u of [0.1, 0.9]) cyl(P, "chrome", panelAt(x, u, 0.011), panelAt(x, u, 0.0135), 0.0045, 8);
  for (const x of [-1.34, -0.32]) for (const z of [0.2, 0.42]) cyl(P, "chrome", [x, PANEL.y1 + 0.008, z], [x, PANEL.y1 + 0.011, z], 0.005, 10);
  // the desk's aisle-side face: a service door (seams, a flush handle), a vent grille, a kick strip
  box(P, "rubber", -0.2715, 0.06, 0.5, -0.27, 0.74, 0.503); box(P, "rubber", -0.2715, 0.06, 0.2, -0.27, 0.74, 0.203); box(P, "rubber", -0.2715, 0.74, 0.2, -0.27, 0.743, 0.503); box(P, "rubber", -0.2715, 0.06, 0.2, -0.27, 0.063, 0.503);
  rbox(P, "steel", -0.275, 0.42, 0.44, -0.268, 0.5, 0.47, 0.003);
  for (let i = 0; i < 7; i++) box(P, "rubber", -0.2718, 0.3 + i * 0.022, 0.56, -0.27, 0.31 + i * 0.022, 0.74);
  rbox(P, "steel", -0.274, 0.0, 0.16, -0.268, 0.05, 0.78, 0.002);
  // ---- the right-hand cabinet: a switch panel on its sloped top, an extinguisher, the rolled flags in a clip
  rbox(P, "desk", 0.22, 0.0, 0.14, X, 0.88, 0.74, 0.02, 3);
  rbox(P, "deskWorn", 0.24, 0.872, 0.68, X - 0.02, 0.888, 0.75, 0.01);
  rbox(P, "panel", 0.3, 0.878, 0.22, 1.0, 0.884, 0.62, 0.004);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) {
    const x = 0.36 + i * 0.085, z = 0.3 + r * 0.11;
    if (r === 0) { cyl(P, "chrome", [x, 0.884, z], [x, 0.888, z], 0.012, 10); cyl(P, "chrome", [x, 0.888, z], [x + 0.004, 0.912, z + ((i * 7) % 3 === 0 ? 0.012 : -0.012)], 0.004, 6); }   // toggle switches
    else rbox(P, ["btnW", "btnG", "btnW", "btnY", "btnW", "btnR", "btnW"][(i + r) % 7], x - 0.015, 0.884, z - 0.015, x + 0.015, 0.895, z + 0.015, 0.004);
  }
  // (a film's wide crew pane: no red extinguisher / red flag behind the driver's glove: v4 v20 side-on)
  if (!o.crewWindow) cyl(P, "red", [1.22, 0.88, 0.6], [1.22, 1.28, 0.6], 0.06, 18); cyl(P, "black", [1.22, 1.28, 0.6], [1.22, 1.34, 0.6], 0.025, 10); tube(P, "black", [[1.22, 1.33, 0.6], [1.16, 1.36, 0.6], [1.12, 1.26, 0.62], [1.14, 1.1, 0.64]], 0.008, 6);
  rbox(P, "steel", 1.14, 1.0, 0.57, 1.3, 1.03, 0.63, 0.004);
  if (!o.crewWindow) cyl(P, "flagR", [1.08, 0.88, 0.3], [1.17, 1.33, 0.25], 0.018, 10); cyl(P, "flagG", [1.12, 0.88, 0.32], [1.22, 1.31, 0.28], 0.018, 10);
  rbox(P, "steel", 1.04, 1.02, 0.22, 1.28, 1.045, 0.36, 0.006);
  // ---- side walls (inner linings) with the crew window + door openings, from the corner posts back to the partition
  for (const s of [1, -1]) {
    const x = s * X, In: V3 = [-s, 0, 0];
    const cw = o.crewWindow ?? [0.55, 1.3];
    const sill = cw[2] ?? 0.98;   // (a film may lower the crew window's sill: v4 v20, the glove mid-pane)
    const holes = [{ u0: cw[0], u1: cw[1], y0: sill, y1: 1.86 }, { u0: 1.42, u1: 2.02, y0: 0.0, y1: 1.88 }];
    gridHoles(zB, Z, 0.0, 2.22, holes, (u0, y0, u1, y1) => quadN(P, "lining", [x, y0, u0], [x, y0, u1], [x, y1, u1], [x, y1, u0], In));
    // the inner corner (lined) between the side lining and the front wall
    arcWall(P, "lining", s * fw, zB, X - fw, s > 0 ? 0 : Math.PI, s > 0 ? -Math.PI / 2 : Math.PI * 1.5, 0, 2.22, 8, true);
    // the crew window frame (sliding sash) and its glass, the crew door's inner panel with a window
    const xa = Math.min(x, s * D.hw), xb = Math.max(x, s * D.hw);
    if (!o.crewWindow) {
      rbox(P, "black", xa, 0.96, 0.53, xb, 0.99, 1.32, 0.006); rbox(P, "black", xa, 1.85, 0.53, xb, 1.88, 1.32, 0.006);
      rbox(P, "black", xa, 0.98, 0.53, xb, 1.86, 0.56, 0.006); rbox(P, "black", xa, 0.98, 1.29, xb, 1.86, 1.32, 0.006); rbox(P, "black", xa, 0.98, 0.9, xb, 1.86, 0.93, 0.006);
      quad(P, "glass", [s * (D.hw - 0.035), 0.98, 0.56], [s * (D.hw - 0.035), 0.98, 0.9], [s * (D.hw - 0.035), 1.86, 0.9], [s * (D.hw - 0.035), 1.86, 0.56]);
      quad(P, "glass", [s * (D.hw - 0.045), 0.98, 0.93], [s * (D.hw - 0.045), 0.98, 1.29], [s * (D.hw - 0.045), 1.86, 1.29], [s * (D.hw - 0.045), 1.86, 0.93]);
    } else {
      // ONE big clear pane in a thin black frame (no sash bar): nothing crosses the driver's arm
      rbox(P, "black", xa, sill - 0.02, cw[0] - 0.02, xb, sill + 0.01, cw[1] + 0.02, 0.006); rbox(P, "black", xa, 1.85, cw[0] - 0.02, xb, 1.88, cw[1] + 0.02, 0.006);
      rbox(P, "black", xa, sill, cw[0] - 0.02, xb, 1.86, cw[0] + 0.01, 0.006); rbox(P, "black", xa, sill, cw[1] - 0.01, xb, 1.86, cw[1] + 0.02, 0.006);
    }
    if (!o.crewWindow) rbox(P, "steel", s > 0 ? X - 0.03 : -X + 0.0, 1.3, 0.905, s > 0 ? X - 0.0 : -X + 0.03, 1.42, 0.925, 0.004);            // the sash latch
    const xd = s * (X - 0.01);
    gridHoles(1.42, 2.02, 0.0, 1.88, [{ u0: 1.54, u1: 1.9, y0: 1.0, y1: 1.76 }], (u0, y0, u1, y1) => quadN(P, "lining", [xd, y0, u0], [xd, y0, u1], [xd, y1, u1], [xd, y1, u0], In));
    rbox(P, "steel", s > 0 ? X - 0.06 : -X + 0.02, 0.98, 1.9, s > 0 ? X - 0.02 : -X + 0.06, 1.0, 1.98, 0.006);
    rbox(P, "steel", s > 0 ? X - 0.03 : -X + 0.008, 0.0, 1.43, s > 0 ? X - 0.008 : -X + 0.03, 0.2, 2.01, 0.004);            // the door's kick plate
    rbox(P, "rubber", xa, 0.0, 1.4, xb, 1.9, 1.43, 0.004); rbox(P, "rubber", xa, 0.0, 2.01, xb, 1.9, 2.04, 0.004); rbox(P, "rubber", xa, 1.88, 1.4, xb, 1.91, 2.04, 0.004);
    // a grab rail above the crew door
    cyl(P, "chrome", [s * (X - 0.05), 1.98, 1.45], [s * (X - 0.05), 1.98, 2.0], 0.012, 10);
    for (const z of [1.47, 1.98]) cyl(P, "chrome", [s * X, 1.98, z], [s * (X - 0.05), 1.98, z], 0.009, 8);
  }
  // ---- the front wall inside: lining round the three panes, deep reveals (the wall is 7 cm thick), the door panel
  const wy0 = FACE.wy0, wy1 = FACE.wy1, zg = FACE.zF + 0.012;
  gridHoles(-fw, fw, 0, 2.22, FACE.panes.map(([a, b]) => ({ u0: a, u1: b, y0: wy0, y1: wy1 })), (u0, y0, u1, y1) => quadN(P, "lining", [u0, y0, zi], [u1, y0, zi], [u1, y1, zi], [u0, y1, zi], [0, 0, 1]));
  for (const [a, b] of FACE.panes) {
    box(P, "black", a, wy0 - 0.02, zg, b, wy0, zi + 0.004); box(P, "black", a, wy1, zg, b, wy1 + 0.02, zi + 0.004);
    box(P, "black", a - 0.02, wy0 - 0.02, zg, a, wy1 + 0.02, zi + 0.004); box(P, "black", b, wy0 - 0.02, zg, b + 0.02, wy1 + 0.02, zi + 0.004);
  }
  for (const x of [FACE.door.x0, FACE.door.x1]) box(P, "rubber", x - 0.003, 0.02, zi, x + 0.003, 2.1, zi + 0.0015);
  rbox(P, "steel", FACE.door.x1 - 0.12, 0.98, zi, FACE.door.x1 - 0.04, 1.02, zi + 0.04, 0.008); rbox(P, "steel", -0.28, 0.0, zi, 0.28, 0.18, zi + 0.004, 0.002);
  rbox(P, "lining", -X, 2.1, zi, X, 2.22, zi + 0.06, 0.02);
  // sun blind: a roller box over the driver's pane + the dark perforated sheet part down, inside the reveal
  const [bx0, bx1] = FACE.panes[0], drop = o.blind ?? 0.12, by = wy1 - drop * (wy1 - wy0);
  rbox(P, "black", bx0 - 0.02, wy1 - 0.01, zi - 0.02, bx1 + 0.02, wy1 + 0.045, zi + 0.04, 0.015);
  quad(P, "blind", [bx0 + 0.01, by, zi - 0.012], [bx1 - 0.01, by, zi - 0.012], [bx1 - 0.01, wy1, zi - 0.012], [bx0 + 0.01, wy1, zi - 0.012]);
  rbox(P, "black", bx0 + 0.005, by - 0.018, zi - 0.022, bx1 - 0.005, by, zi - 0.002, 0.006);
  // ---- ceiling: a lamp (off by day), a vent, a speaker grille
  quadN(P, "ceil", [-X, 2.22, Z], [-X, 2.22, zi], [X, 2.22, zi], [X, 2.22, Z], [0, -1, 0]);
  rbox(P, "ceil", -0.5, 2.17, 0.8, 0.5, 2.22, 1.5, 0.02, 3); rbox(P, "btnW", -0.42, 2.165, 0.86, 0.42, 2.172, 1.44, 0.01);
  for (let i = 0; i < 9; i++) rbox(P, "black", -1.2, 2.205, 0.4 + i * 0.03, -0.9, 2.215, 0.415 + i * 0.03, 0.002, 1);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) cyl(P, "black", [0.7 + i * 0.03, 2.2, 1.6 + j * 0.03], [0.7 + i * 0.03, 2.215, 1.6 + j * 0.03], 0.007, 6);
  // ---- the radio handset in its cradle on the pillar between the crew window and the crew door, with a coiled cord
  if (o.handset ?? true) { rbox(P, "black", -X, 1.15, 1.325, -X + 0.03, 1.42, 1.395, 0.008);
  rbox(P, "black", -X + 0.025, 1.17, 1.335, -X + 0.07, 1.4, 1.385, 0.02, 3); }
  const coil: V3[] = []; for (let i = 0; i <= 80; i++) { const a = i * 0.7; coil.push([-X + 0.05 + Math.cos(a) * 0.012, 1.17 - i * 0.0045, 1.36 + Math.sin(a) * 0.012]); }
  if (o.handset ?? true) tube(P, "black", coil, 0.0025, 5, true, 240);
  // ---- the driver's seat on its pedestal: a foot ring, a dished cushion, a curved back, a headrest
  cyl(P, "steel", [-0.83, 0.12, 1.5], [-0.83, 0.5, 1.5], 0.04, 14); disc(P, "black", [-0.83, 0.14, 1.5], [0, 1, 0], 0.22, 0.03, 20);
  ring(P, "steel", [-0.83, 0.3, 1.5], [0, 1, 0], 0.2, 0.012, 24, 6); for (const a of [0.6, 2.2, 4.2]) cyl(P, "steel", [-0.83, 0.3, 1.5], [-0.83 + Math.cos(a) * 0.2, 0.3, 1.5 + Math.sin(a) * 0.2], 0.008, 6);
  rbox(P, "black", -1.06, 0.47, 1.28, -0.6, 0.52, 1.72, 0.02);
  rbox(P, "seat", -1.08, 0.5, 1.26, -0.58, 0.62, 1.74, 0.045, 3);
  const SBk = parts();   // the seat BACK + headrest: their own mesh (CabJPOpts.seatBack hides them: v21 sees the driver from behind)
  for (const [yy, zz, tt, ww] of [[0.72, 1.775, 0.09, 0.46], [0.9, 1.795, 0.1, 0.48], [1.08, 1.81, 0.09, 0.46]] as const) rbox(SBk, "seat", -0.83 - ww / 2, yy - 0.1, zz - tt / 2, -0.83 + ww / 2, yy + 0.1, zz + tt / 2, 0.04, 3);
  rbox(SBk, "seat", -0.97, 1.24, 1.8, -0.69, 1.42, 1.885, 0.045, 3);
  for (const x of [-0.9, -0.76]) cyl(SBk, "steel", [x, 1.16, 1.83], [x, 1.26, 1.84], 0.008, 6);
  rbox(P, "black", -0.58, 0.7, 1.38, -0.53, 0.74, 1.7, 0.015); cyl(P, "steel", [-0.555, 0.56, 1.66], [-0.555, 0.7, 1.66], 0.012, 8);
  const PP = parts();   // the partition: its own mesh (CabJPOpts.partition hides it)
  // ---- the partition wall: two faces + reveals, windows, door
  const Lw = CAB.windowL, Rw = CAB.windowR, Dd = CAB.door, T = 0.05, fogW = o.fogWindow === "left" ? Lw : Rw;
  const pHoles = [{ u0: Lw.x0, u1: Lw.x1, y0: Lw.y0, y1: Lw.y1 }, { u0: Rw.x0, u1: Rw.x1, y0: Rw.y0, y1: Rw.y1 }, { u0: Dd.x0, u1: Dd.x1, y0: 0, y1: 1.92 }];
  for (const [z, dir] of [[Z - T, -1], [Z, 1]] as const) gridHoles(-X, X, 0, 2.34, pHoles, (u0, y0, u1, y1) => quadN(PP, dir > 0 ? "creamCar" : "cream", [u0, y0, z], [u1, y0, z], [u1, y1, z], [u0, y1, z], [0, 0, dir]));
  for (const h of pHoles) {
    box(PP, "cream", h.u0, h.y1, Z - T, h.u1, h.y1 + 0.01, Z); box(PP, "cream", h.u0 - 0.01, h.y0, Z - T, h.u0, h.y1, Z); box(PP, "cream", h.u1, h.y0, Z - T, h.u1 + 0.01, h.y1, Z);
    if (h.y0 > 0) box(PP, "cream", h.u0, h.y0 - 0.01, Z - T, h.u1, h.y0, Z);
  }
  for (const w of [Lw, Rw]) {
    const g = 0.018;
    quad(PP, w === fogW ? "glassP" : "glass", [w.x0, w.y0, Z - T / 2], [w.x1, w.y0, Z - T / 2], [w.x1, w.y1, Z - T / 2], [w.x0, w.y1, Z - T / 2]);
    for (const z of [Z - T - 0.004, Z - 0.006]) { rbox(PP, "rubber", w.x0, w.y0, z, w.x1, w.y0 + g, z + 0.01, 0.004); rbox(PP, "rubber", w.x0, w.y1 - g, z, w.x1, w.y1, z + 0.01, 0.004); rbox(PP, "rubber", w.x0, w.y0, z, w.x0 + g, w.y1, z + 0.01, 0.004); rbox(PP, "rubber", w.x1 - g, w.y0, z, w.x1, w.y1, z + 0.01, 0.004); }
    // the roll-up blind box above (rolled up), passenger side
    rbox(PP, "creamCar", w.x0 - 0.02, w.y1 + 0.02, Z - 0.002, w.x1 + 0.02, w.y1 + 0.08, Z + 0.05, 0.012);
  }
  // the cab door (closed): a panel with a window, a lever handle each side
  gridHoles(Dd.x0 + 0.01, Dd.x1 - 0.01, 0.01, 1.91, [{ u0: Dd.x0 + 0.1, u1: Dd.x1 - 0.1, y0: 1.02, y1: 1.78 }], (u0, y0, u1, y1) => { rbox(PP, "creamDoor", u0, y0, Z - T * 0.8, u1, y1, Z - T * 0.2, 0.003); });
  quad(PP, "glass", [Dd.x0 + 0.1, 1.02, Z - T / 2], [Dd.x1 - 0.1, 1.02, Z - T / 2], [Dd.x1 - 0.1, 1.78, Z - T / 2], [Dd.x0 + 0.1, 1.78, Z - T / 2]);
  for (const z of [Z - T * 0.82, Z - T * 0.2]) { rbox(PP, "rubber", Dd.x0 + 0.085, 1.005, z, Dd.x1 - 0.085, 1.02, z + 0.006, 0.003); rbox(PP, "rubber", Dd.x0 + 0.085, 1.78, z, Dd.x1 - 0.085, 1.795, z + 0.006, 0.003); rbox(PP, "rubber", Dd.x0 + 0.085, 1.02, z, Dd.x0 + 0.1, 1.78, z + 0.006, 0.003); rbox(PP, "rubber", Dd.x1 - 0.1, 1.02, z, Dd.x1 - 0.085, 1.78, z + 0.006, 0.003); }
  for (const z of [Z + 0.03, Z - T - 0.03]) { rbox(PP, "steel", Dd.x1 - 0.1, 0.98, z - 0.012, Dd.x1 - 0.08, 1.02, z + 0.012, 0.006); rbox(PP, "steel", Dd.x1 - 0.22, 0.99, z - 0.01, Dd.x1 - 0.08, 1.01, z + 0.01, 0.006); }
  rbox(PP, "rubber", Dd.x0 - 0.012, 0, Z - T, Dd.x0, 1.93, Z, 0.003); rbox(PP, "rubber", Dd.x1, 0, Z - T, Dd.x1 + 0.012, 1.93, Z, 0.003);
  // passenger side: a stainless kick plate, screws along the panel seams, a handrail under the right window
  rbox(PP, "steel", -X, 0.0, Z, X, 0.22, Z + 0.006, 0.003);
  for (const xs of [-1.38, -0.42, 0.37, 1.37]) for (let y = 0.3; y < 2.1; y += 0.25) cyl(PP, "chrome", [xs, y, Z], [xs, y, Z + 0.004], 0.0045, 8);
  box(PP, "rubber", -0.43, 0.22, Z, -0.428, 2.2, Z + 0.002); box(PP, "rubber", 0.365, 0.22, Z, 0.367, 2.2, Z + 0.002);
  if (o.passengerRails ?? true) for (const [xa, xb, yh] of [[0.5, 1.25, Rw.y0 - 0.08], [-1.25, -0.5, Lw.y0 - 0.08]]) { cyl(PP, "chrome", [xa, yh, Z + 0.06], [xb, yh, Z + 0.06], 0.013, 10); for (const x of [xa + 0.02, xb - 0.02]) cyl(PP, "chrome", [x, yh, Z], [x, yh, Z + 0.06], 0.01, 8); }
  // cab side of the partition: a coat hook, a clipboard with a blank sheet, a red emergency-stop box
  // (all clear of the three panes: the hook over the door, the clipboard on the door's lower panel, the box low right)
  cyl(PP, "chrome", [0.37, 1.98, Z - T], [0.37, 1.99, Z - T - 0.05], 0.007, 8);
  rbox(PP, "black", -0.16, 0.42, Z - T - 0.022, 0.1, 0.8, Z - T - 0.01, 0.006); rbox(PP, "card", -0.145, 0.43, Z - T - 0.025, 0.085, 0.75, Z - T - 0.022, 0.002); rbox(PP, "steel", -0.085, 0.75, Z - T - 0.032, 0.025, 0.79, Z - T - 0.022, 0.004);
  rbox(PP, "red", 0.95, 0.28, Z - T - 0.05, 1.1, 0.46, Z - T, 0.01); cyl(PP, "black", [1.025, 0.37, Z - T - 0.05], [1.025, 0.37, Z - T - 0.07], 0.025, 12);
  // grime: the partition at child height (passenger side) + the corners, the desk round the controller
  for (const Q of [P, PP]) {
    dirtKey(Q, "cream", (_x, y) => sstep(0.25, 0.0, y) * 0.3);
    dirtKey(Q, "creamDoor", (_x, y) => sstep(0.3, 0.0, y) * 0.3 + sstep(0.85, 1.0, y) * sstep(1.2, 1.05, y) * 0.12);
    dirtKey(Q, "creamCar", (x, y) => sstep(1.3, 0.9, y) * sstep(0.4, 0.95, y) * 0.16 * (x > 0.4 ? 1.4 : 0.6) + sstep(0.25, 0.0, y) * 0.25);
  }
  dirtKey(P, "desk", (x, y, z) => Math.max(0, 1 - Math.hypot((x + 1.14) / 0.16, (z - 0.86) / 0.12)) * 0.35 * sstep(0.7, 0.78, y) + sstep(0.45, 0.2, y) * 0.3);
  dirtKey(P, "lining", (_x, y) => sstep(0.35, 0.0, y) * 0.3);

  // ---- instrument cluster (local plate frame: face +Z, +Y up the plate), as its own groups on the plate
  const cluster = new THREE.Group(); cluster.name = "cab-cluster";
  const onPanel = (x: number, u: number, grp: THREE.Object3D, lift = LIFT) => { grp.position.set(...panelAt(x, u, lift)); grp.rotation.x = PANEL_ROT; cluster.add(grp); return grp; };
  const lit = lamp("cab-backlight", "#ffe6c2", "#a9a49a", 1.2);
  const speedoG = new THREE.Group();
  { const Q = parts(); cyl(Q, "panel", [0, 0, -0.02], [0, 0, 0.005], 0.104, 40); ring(Q, "chrome", [0, 0, 0.012], [0, 0, 1], 0.094, 0.0085, 48, 10); speedoG.add(meshes(Q, M, { name: "speedo-body" })); }
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.088, 64), screenMat("speedo-face", dialTex(), 0.55, 0.4)); face.position.z = 0.006; speedoG.add(face);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.084, 0.088, 64), lit); glow.position.z = 0.0065; speedoG.add(glow);
  const needleM = vmat("cab-needle", { color: "#ff7a1c", rough: 0.35, emissive: "#ff5a0c", emissiveIntensity: 0.9, useDirt: false });
  const needle = new THREE.Group(); needle.position.z = 0.0105; speedoG.add(needle);
  { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([-0.004, -0.016, 0, 0.004, -0.016, 0, 0.001, 0.076, 0, -0.004, -0.016, 0, 0.001, 0.076, 0, -0.001, 0.076, 0], 3)); g.computeVertexNormals(); needle.add(new THREE.Mesh(g, needleM)); }
  { const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 20), M.black); hub.rotation.x = Math.PI / 2; hub.position.z = 0.0125; speedoG.add(hub); }
  const sg = new THREE.Mesh(new THREE.CircleGeometry(0.092, 48), M.glassG); sg.position.z = 0.017; speedoG.add(sg);
  onPanel(-0.83, 0.5, speedoG);
  // brake gauge (two needles)
  const brakeG = new THREE.Group();
  { const Q = parts(); cyl(Q, "panel", [0, 0, -0.02], [0, 0, 0.004], 0.062, 32); ring(Q, "chrome", [0, 0, 0.01], [0, 0, 1], 0.056, 0.006, 40, 8); brakeG.add(meshes(Q, M)); }
  const bface = new THREE.Mesh(new THREE.CircleGeometry(0.052, 48), screenMat("brake-face", gaugeTex(), 0.5, 0.4)); bface.position.z = 0.005; brakeG.add(bface);
  const bN = [0xd02a20, 0x1a1a1a].map((c) => { const gN = new THREE.Group(); gN.position.z = 0.008 + (c === 0xd02a20 ? 0.001 : 0); const g = new THREE.PlaneGeometry(0.0035, 0.046); g.translate(0, 0.019, 0); gN.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: 0.25 }))); brakeG.add(gN); return gN; });
  const bg2 = new THREE.Mesh(new THREE.CircleGeometry(0.055, 40), M.glassG); bg2.position.z = 0.013; brakeG.add(bg2);
  onPanel(-1.28, 0.5, brakeG);
  // two LCDs (abstract bars, three frames that step)
  const lcdTexs = [0, 1, 2].map(lcdTex);
  const lcdMats = [screenMat("lcdA", lcdTexs[0], 1.1), screenMat("lcdB", lcdTexs[1], 1.1)];
  for (const [x, mi] of [[-1.075, 0], [-0.59, 1]] as const) {
    const g = new THREE.Group(); const Q = parts(); rbox(Q, "panel", -0.1, -0.075, -0.012, 0.1, 0.075, 0.012, 0.008, 2); rbox(Q, "black", -0.092, -0.066, 0.011, 0.092, 0.066, 0.014, 0.003); g.add(meshes(Q, M));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.12), lcdMats[mi]); s.position.z = 0.0146; g.add(s);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.008), M.btnW); b.position.set(-0.06 + i * 0.04, -0.086, 0.004); g.add(b); }
    onPanel(x, 0.54, g);
  }
  // the door-closed pilot lamp: chrome bezel, amber lens with a door icon, a finger-worn ring round it
  const pil = new THREE.Group();
  { const Q = parts(); cyl(Q, "black", [0, 0, -0.01], [0, 0, 0.006], 0.043, 32); ring(Q, "chrome", [0, 0, 0.011], [0, 0, 1], 0.036, 0.0062, 40, 8); ring(Q, "deskWorn", [0, 0, 0.0005], [0, 0, 1], 0.06, 0.011, 40, 4); pil.add(meshes(Q, M)); }
  const ptex = pilotTex();
  const pilotM = new THREE.MeshStandardMaterial({ color: "#6a3a08", map: ptex, roughness: 0.15, emissive: "#ffffff", emissiveMap: ptex, emissiveIntensity: 0 });
  // a sphere's own UVs wrap the icon round the pole (it never read): project the cap's UVs flat, the icon upright on the panel
  const lensG = new THREE.SphereGeometry(0.031, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.6);
  { const P = lensG.attributes.position, U = lensG.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, 0.5 + P.getX(i) / 0.062, 0.5 - P.getZ(i) / 0.062); U.needsUpdate = true; }
  const lens = new THREE.Mesh(lensG, pilotM); lens.rotation.x = Math.PI / 2; lens.position.z = 0.004; lens.scale.set(1, 0.3, 1); pil.add(lens);
  // THE DOOR ICON as its own decal on the lens (the lens map alone never showed it at phone size, dark or lit): pale
  // lines, unlit, over the dome's apex; it reads on the dark lens (s21: "the dark door lamp") and on the lit one
  const iconTex = canvasTex(128, 128, (g) => {
    g.strokeStyle = "#ffffff"; g.lineJoin = "round"; g.lineWidth = 9; g.strokeRect(30, 18, 68, 92); g.beginPath(); g.moveTo(64, 18); g.lineTo(64, 110); g.stroke();
    g.lineWidth = 6; g.strokeRect(40, 30, 16, 32); g.strokeRect(72, 30, 16, 32);
  });
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.036), new THREE.MeshBasicMaterial({ color: "#efe2c2", map: iconTex, transparent: true, depthWrite: false, fog: false }));
  icon.position.z = 0.0145; pil.add(icon);
  onPanel(-0.415, 0.7, pil);
  // button rows (abstract colours, no labels): under the pilot lamp and beside the brake gauge
  for (const [x0, u, cols] of [[-0.415, 0.26, 3], [-1.28, 0.16, 3]] as const) for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.012), [M.btnG, M.btnW, M.btnY, M.btnW, M.btnR, M.btnG][i]);
    const g = new THREE.Group(); b.position.set(((i % cols) - 1) * 0.032, Math.floor(i / cols) * -0.034 + 0.017, 0.004); g.add(b); onPanel(x0, u, g);
  }
  // the worktop: the pocket watch in its holder (tilted to the driver), a reverser key
  const watchG = new THREE.Group();
  { const Q = parts(); rbox(Q, "black", -0.05, -0.055, -0.03, 0.05, 0.055, 0.004, 0.012, 3); ring(Q, "chrome", [0, 0, 0.004], [0, 0, 1], 0.033, 0.0065, 40, 8); cyl(Q, "chrome", [0, 0, -0.004], [0, 0, 0.004], 0.034, 32); cyl(Q, "chrome", [0, 0.037, 0.002], [0, 0.046, 0.002], 0.0055, 10); ring(Q, "chrome", [0, 0.054, 0.002], [0, 0, 1], 0.009, 0.0018, 20, 6); watchG.add(meshes(Q, M)); }
  const wface = new THREE.Mesh(new THREE.CircleGeometry(0.03, 48), vmat("cab-watchface", { color: "#ffffff", rough: 0.35, albedo: watchTex(), useDirt: false, emissive: "#fff6e6", emissiveIntensity: 0.08, ...E })); wface.position.z = 0.0045; watchG.add(wface);
  const hand = (len: number, w: number, z: number, col: string) => { const gg = new THREE.Group(); gg.position.z = z; const g = new THREE.PlaneGeometry(w, len); g.translate(0, len / 2 - 0.002, 0); gg.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 }))); watchG.add(gg); return gg; };
  const hH = hand(0.016, 0.0026, 0.005, "#1a1a1a"), hM = hand(0.024, 0.0018, 0.0053, "#1a1a1a"), hS = new THREE.Group(); hS.position.set(0, -0.0115, 0.0056);
  { const g = new THREE.PlaneGeometry(0.0008, 0.009); g.translate(0, 0.0037, 0); hS.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#b0261c", roughness: 0.4 }))); watchG.add(hS); }
  const wg = new THREE.Mesh(new THREE.CircleGeometry(0.031, 40), M.glassG); wg.position.z = 0.0075; watchG.add(wg);
  watchG.position.set(CAB.watch[0], CAB.watch[1], CAB.watch[2]); watchG.rotation.x = -1.0; cluster.add(watchG);
  { const Q = parts(); cyl(Q, "chrome", [-0.34, 0.805, 0.9], [-0.34, 0.815, 0.9], 0.02, 16); rbox(Q, "black", -0.346, 0.815, 0.885, -0.334, 0.847, 0.915, 0.004); cluster.add(meshes(Q, M)); }
  // the timetable card holder on the hood (the blank card faces the driver)
  const cardG = new THREE.Group();
  { const Q = parts(); rbox(Q, "black", -0.07, -0.05, -0.008, 0.07, 0.05, 0.0, 0.006); rbox(Q, "steel", -0.065, 0.035, 0.0, 0.065, 0.045, 0.004, 0.002); rbox(Q, "card", -0.062, -0.044, 0.0, 0.062, 0.034, 0.002, 0.001); rbox(Q, "black", -0.03, -0.075, -0.012, 0.03, -0.045, -0.004, 0.004); cardG.add(meshes(Q, M)); }
  cardG.position.set(-0.42, PANEL.y1 + 0.085, 0.36); cardG.rotation.x = -0.45; cluster.add(cardG);
  // the T-handle one-handle master controller (left hand): quadrant plate, slot, stem, T grip
  const ctl = new THREE.Group();
  { const Q = parts(); rbox(Q, "panel", -0.075, 0.0, -0.12, 0.075, 0.014, 0.12, 0.01); rbox(Q, "black", -0.012, 0.013, -0.1, 0.012, 0.016, 0.1, 0.004); for (let i = 0; i < 9; i++) rbox(Q, "btnW", 0.03, 0.0135, -0.09 + i * 0.0225 - 0.002, 0.05, 0.0145, -0.09 + i * 0.0225 + 0.002, 0.0005, 1); ctl.add(meshes(Q, M)); }
  const lever = new THREE.Group(); lever.position.y = 0.014; ctl.add(lever);
  { const Q = parts(); cyl(Q, "chrome", [0, 0, 0], [0, 0.13, 0], 0.01, 12); cyl(Q, "black", [-0.08, 0.14, 0], [0.08, 0.14, 0], 0.017, 16); disc(Q, "chrome", [-0.083, 0.14, 0], [1, 0, 0], 0.017, 0.004, 16); disc(Q, "chrome", [0.083, 0.14, 0], [1, 0, 0], 0.017, 0.004, 16); lever.add(meshes(Q, M)); }
  ctl.position.set(CAB.controller[0], 0.812, CAB.controller[2] - 0.045); cluster.add(ctl);

  const root = new THREE.Group(); root.name = "cabJP";
  const partitionG = meshes(PP, M, { name: "cab-partition", noCast: ["glassP", "glass", "blind", "glassG"] });
  const seatBackG = meshes(SBk, M, { name: "cab-seatback" });
  root.add(meshes(P, M, { name: "cab-shell", noCast: ["glassP", "glass", "blind", "glassG"] }), partitionG, seatBackG, cluster);
  if (o.lights && ctx.practical) {
    const L = ctx.practical({ kind: "rect", pos: panelAt(-0.83, 0.5, 0.05), target: [-0.83, 1.3, 1.5], size: [0.75, 0.16], kelvin: 4000, lumens: 40, bulb: false });
    root.add(L.object);
  }
  const speed = o.speed ?? (() => 80), pilot = o.pilot ?? (() => 1), fog = o.fog ?? (() => 0), brake = o.brake ?? (() => [0.0, 0.55] as [number, number]), leverA = o.lever ?? (() => 0.3);
  const D2R = Math.PI / 180;
  const update = (t: number) => {
    partitionG.visible = o.partition ? o.partition(t) : true;
    seatBackG.visible = o.seatBack ? o.seatBack(t) : true;
    const v = Math.max(0, Math.min(120, speed(t)));
    needle.rotation.z = (135 - (v / 120) * 270) * D2R;          // 0 km/h at lower-left (135 deg from up), clockwise
    const [b1, b2] = brake(t); bN[0].rotation.z = (135 - b1 * 270) * D2R; bN[1].rotation.z = (135 - b2 * 270) * D2R;
    const pk = Math.max(0, Math.min(1, pilot(t)));
    pilotM.emissiveIntensity = 3.0 * pk; pilotM.color.set(pk > 0.5 ? "#c87a20" : "#8a6a48");   // dark: a pale door icon on a dull amber lens (it must read OFF, icon visible)
    lcdMats[0].map = lcdMats[0].emissiveMap = lcdTexs[Math.floor(t / 0.9) % 3];
    lcdMats[1].map = lcdMats[1].emissiveMap = lcdTexs[(Math.floor(t / 1.3) + 1) % 3];
    lit.userData.set(1);
    lever.rotation.x = leverA(t);
    (M.glassP as THREE.MeshStandardMaterial).userData.U.uFog.value = fog(t);
    // the pocket watch: a real clock running from 17:42:10 at t = 0, the seconds hand ticks once a second
    const secs = 17 * 3600 + 42 * 60 + 10 + Math.floor(t);
    hS.rotation.z = -((secs % 60) / 60) * Math.PI * 2;
    hM.rotation.z = -(((secs / 60) % 60) / 60) * Math.PI * 2;
    hH.rotation.z = -(((secs / 3600) % 12) / 12) * Math.PI * 2;
  };
  update(0);
  return { object: root, update, marks: CAB };
};

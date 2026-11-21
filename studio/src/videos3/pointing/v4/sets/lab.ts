// v4 SET ENTRY 'lab' (owner LAB; briefs/v3/pointing/V4_STRUCTURE.md). The v4 lab is a NEW set (the v3 jars set stays in
// ../../sets/lab.ts for the v3 film). Built FIRST: THE OPENING (v01-v05) + the loop (last shot) + her point (line 11).
//
// FRAME 0 (must read in a quarter second on a phone): a BIG SIGNAL LAMP across the top (a dark two-lens signal head,
// green lens left, red lens right as in Japan, deep hoods over the lenses, on an orange backplate, hung from the
// ceiling); under it the young woman, centred, at ONE big round red push button (a dome in a white ring on a navy base);
// her face, the lamp and the button all above 64 % of the height. Under that, the desk's plain navy front: the caption
// band sits on it. Behind her, the partition of the test booth: the wall clock (left), a row of small blinking lamps
// (left), the observation window (right) with the researcher behind the glass writing in his notebook.
//
// WORLD LAYOUT (metres; the opening's lens looks toward -Z, from z ~ 2.4): the BOOTH x -2.6..3.6, z -3.6..3.0, h 3.0,
// sunny windows in its left wall (sun: hints.rigOpts sunAz 95 / sunEl 25). HER: seated at (0.3, 0, -0.95) facing +Z;
// the desk in front of her (top 0.82, front z -0.25); THE BUTTON at (0.02, 0.82, -0.45); THE LAMP centre (0.3, 1.9,
// -0.55). The control room behind the partition: x 0.2..3.4, z -6.2..-3.85.
// COLOURS + LIGHT: LOOK's v4/look.ts (LAB4_PAL / LAB4_SURF / LAB4_LIGHT / LAB4_LENS / LAB4_RIG / labWash; LAB_PAL for the
// shared hexes). LAB owns layout, props, staging, cameras.
// TIMES: lab_plan.ts (EV of the v4 clock + the shots by role). PEOPLE: CAST (BEATS_V4 rows of `lab_woman`, cued on R_V4).
import * as THREE from "three";
import type { Built, KitCtx, V3, CamState } from "../../../../kit/core/ctx";
import { room } from "../../../../kit/surfaces/interior";
import { prop } from "../../../../kit/props/catalog";
import { workTable, ceilingPanel, wallClock, pbr, mesh, rboxG, cylG, latheG, at, canvas, contactBlob, type C3 } from "../../../../kit/home";
import type { Beat } from "../../cast/moves";
import { LAB_PAL, LAB4_RIG, LAB4_PAL, LAB4_SURF, LAB4_LIGHT, LAB4_LENS, LAB4_KEY, LAB4_ROOM, labWash, labPanelK } from "../look";
import { buildHall, HX, miniSignal, miniButton } from "./lab_hall";
import { HOOK, ROLE, OPENING_END, lampAt, buttonAt, buttonDipAt, xAt, stripAt, inRole, spanOf, fr, type Role } from "./lab_plan";
import { S, TOTAL, EV } from "../timeline";
import { GO_PRESS, RED_DOWN } from "../../cast/beats_v4";   // CAST 05:50: the dome dips exactly with her finger
import { glideRest, pushRest, slideRest, type ShotCam, type View } from "../camkit";

/** an sRGB hex as the linear [r, g, b] the kit's pbr() takes */
const lin = (hex: string): C3 => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

export const LAB4 = {
  booth: { x0: -2.6, z0: -3.6, w: 6.2, d: 6.6, h: 3.0 },
  // LEAD DECISION 18:20 (her point at the RED lens): she sits a little RIGHT, the lamp hangs up and to her LEFT (the red
  // lens 48 deg above her screen-left shoulder: her right arm points up-left at it, side-on, nothing behind the arm);
  // frame 0 = the same layout (lamp up-left, face right, button in front of her: a diagonal)
  // V5 (lead 23:00, OPENING_AUDIT_v5): the opening RECOMPOSED as a LOW THREE-QUARTER view from her front-left that fills
  // 9:16: the big button large in front (the viewer's button), her head + shoulders right behind it, the signal head
  // standing UPRIGHT and tall beside her (upper left: an upright head fits beside her in a portrait frame, a wide one
  // could not: lab5/s5.mjs), and the room running back behind her to the right (a high sunny window with sky and
  // clouds, the clock, a second volunteer at her board, the researcher walking in). Projections: scratchpad lab5/lay.mjs.
  her: [0.33, 0, -0.95] as V3, seat: 0.47,
  desk: { at: [0.05, 0, -0.385] as V3, w: 1.7, d: 1.07, h: 0.7 },   // FIX R2: a deep console (front edge z +0.15): frame 0's blue front under 12 %   // h 0.70 (lead 23:45: the GO! pulses in the caption band must never cover the dome or her eyes: a lower desk opens the gap)   // front at z -0.36, just in front of the button: no empty desk top in front of it (r12 f0); a console front down to the floor
  button: [-0.15, 0.7, -0.66] as V3, buttonScale: 1.3,
  lamp: [-0.22, 1.55, -1.12] as V3, lampScale: 0.8,   // CAST 01:50: z -1.12: every part of the head (hood tips, halo) sits just BEHIND her card plane (z -0.95), so her pointing hand is drawn in front of the housing (v18 / v36); -1.3 lost the lit lens in v02-v04 (r18)
  /** the high window in the back wall (world x centre, width, sill, height): sky above her head in frame 0 */
  win: { x: 2.35, w: 1.7, sill: 1.65, h: 0.95 },
  /** the researcher walks in from the right (z of his path; x from -> to) on the frame-0 shot and out again on the loop */
  researcher: { z: -2.25, x0: 1.3, x1: 1.3 },   // r16 f0: at x 1.5 he touched the right edge   // r14: a walk-in from off the right edge never reached the frame in v01: he stands at the right of her head, writing (x0 = x1: no walk)
  /** the second volunteer at her own little board, back right */
  station: [2.3, 0, -2.9] as V3,
  clock: [1.35, 2.3, -3.59] as V3,
  strip: { x0: 1.65, x1: 3.05, y: 2.78, z: -3.585, n: 7 },
};

// ================================================================ props
/** THE SIGNAL HEAD: a dark housing with two big lenses (green left, red right), deep hoods, an orange backplate with a
 *  white rim; local: the lenses face +z, centre at 0 */
const signalHead = () => {
  const g = new THREE.Group(); g.name = "signalHead";
  const housing = pbr({ color: lin(LAB_PAL.lampHousing), rough: 0.38, peel: 0.5, tile: 0.08, clearcoat: 0.5, ccRough: 0.2 });
  const visor = pbr({ color: lin(LAB_PAL.lampVisor), rough: 0.5, peel: 0.3 }); visor.side = THREE.DoubleSide;
  const plate = pbr({ color: lin(LAB_PAL.boardFrame), rough: 0.35, peel: 0.5, clearcoat: 0.6, ccRough: 0.15 });
  const rim = pbr({ color: lin(LAB_PAL.trim), rough: 0.3, peel: 0.3 });
  const chrome = pbr({ color: [0.85, 0.85, 0.84], rough: 0.14, metal: 1, peel: 0 });
  // V5: UPRIGHT (green lens on top, red below); the plate and housing are the old ones turned on end
  const W = 0.42, H = 0.84;
  g.add(mesh(rboxG(-0.28, -0.5, -0.2, 0.28, 0.5, -0.165, 0.06, 3), rim, true, "plateRim"));
  g.add(mesh(rboxG(-0.25, -0.47, -0.17, 0.25, 0.47, -0.15, 0.05, 3), plate, true, "backplate"));
  g.add(mesh(rboxG(-W / 2, -H / 2, -0.16, W / 2, H / 2, 0.06, 0.07, 4), housing, true, "lampBox"));
  const lenses: { m: THREE.MeshPhysicalMaterial; halo: THREE.MeshBasicMaterial; k: number }[] = [];
  for (const [k, y] of [[0, 0.205], [1, -0.205]] as [number, number][]) { const x = 0;
    // the lens glass: a clear-coated tinted glass (a rim highlight from the room even when it is OFF); the seat disc is the
    // same glass (LOOK: the seat IS the lens on screen)
    const m = new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(0, 0, 0), emissiveIntensity: 1, side: THREE.DoubleSide });   // DoubleSide: the latheG dome faces inward
    m.customProgramCacheKey = () => "lab4:lens"; m.envMapIntensity = LAB4_LENS.envK; m.roughness = LAB4_LENS.rough;   // LOOK (3): less of the room mirrored in the glass
    g.add(mesh(at(cylG(0.172, 0.172, 0.02, 64), x, y, 0.066, Math.PI / 2), m, true, "lensSeat"));
    g.add(mesh(at(new THREE.TorusGeometry(0.158, 0.012, 10, 64), x, y, 0.078), chrome, true, "lensRing"));
    // the hood: the TOP half of a tube, sticking out toward the lens
    const vis = new THREE.CylinderGeometry(0.18, 0.18, 0.09, 48, 1, true, Math.PI / 2, Math.PI); vis.rotateX(Math.PI / 2); vis.translate(x, y, 0.11);   // V5: a short visor lip (the long hood hid half the lens from the 3/4 lenses)
    void vis; void visor;   // AUDIT R1 #17: the hood (a half tube) made a torn step across the lens ring: no hood
    const lens = new THREE.Mesh(latheG([[0.001, 0.034], [0.07, 0.03], [0.125, 0.016], [0.155, 0.0]], 48), m); lens.rotation.x = Math.PI / 2; lens.position.set(x, y, 0.072); lens.name = "lens"; g.add(lens);
    // a soft additive halo in front of the lens: the colour blooms at phone size
    const { cv, g: c } = canvas(256, 256); const gr = c.createRadialGradient(128, 128, 18, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.35, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
    const haloM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x000000, toneMapped: false });
    haloM.customProgramCacheKey = () => "lab4:halo";
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), haloM); halo.position.set(x, y, 0.1); g.add(halo);   // AUDIT R1 #3: no forced draw order (it drew over her face), smaller
    lenses.push({ m, halo: haloM, k }); void LAB4_PAL;
  }
  // two hanging rods to the ceiling
  const steel = pbr({ color: [0.16, 0.17, 0.2], rough: 0.4, peel: 0.3 });
  for (const s of [-1, 1]) g.add(mesh(at(cylG(0.014, 0.014, 2.4, 12), s * 0.14, 0.5 + 1.2, -0.08), steel, true, "rod"));
  /** state 0 none, 2 green, 1 red; flash 0..1 */
  /** state 0 none, 2 green, 1 red; flash 0..1. OFF = LOOK's tinted glass with NO emission (frame 0 reads as a signal that
   *  is off; nothing glows before "green"; the red lens lights for the first time on the red). Values: LAB4_LENS */
  // LIT_K: LOOK's lit values x 0.45: at full strength the lit lens burnt to a white-pink disc on the draft renders (v04 / v05)
  const LIT_K = 0.45;
  const set = (state: 0 | 1 | 2, flash: number, idle = false) => lenses.forEach((L, k) => {
    const on = (state === 2 && k === 0) || (state === 1 && k === 1), Z = LAB4_LENS, lit = Z.lit[k];
    if (on) { L.m.emissive.setRGB(...lit).multiplyScalar((k ? 0.3 : LIT_K) * (Z.onK[k] + Z.flashK * flash));   /* red 0.3: its centre still burnt pink at 0.45 (r8 f180 / f235) */ L.m.color.setRGB(...lit).multiplyScalar(0.3); if (k === 1) { L.m.emissive.multiplyScalar(Z.redK); L.m.color.setRGB(...Z.redBody); } } else {   /* LOOK (3b): the lit red lens deep red, not salmon */ L.m.emissive.setRGB(...lit).multiplyScalar(idle ? LAB4_KEY.idle : 0); L.m.color.setRGB(...Z.off[k]).multiplyScalar(0.4); }   // LOOK v5: a faint own-colour glow at frame 0 / the loop only   // IDLE: each lens glows dim in its own colour (reads as a signal at frame 0)
    L.halo.color.setRGB(...lit).multiplyScalar(on ? Z.haloK + Z.haloFlash * flash : 0);
  });
  return { object: g, set };
};

/** THE BUTTON: a navy drum, a white ring, a big glossy red dome that sinks and glows on a press (local: base on y = 0) */
const bigButton = () => {
  const g = new THREE.Group(); g.name = "bigButton";
  g.add(mesh(latheG([[0.001, 0], [0.19, 0], [0.19, 0.075], [0.175, 0.09], [0.001, 0.09]], 64), pbr({ color: LAB4_PAL.buttonBase, rough: 0.3, peel: 0.5, clearcoat: 0.6, ccRough: 0.15 }), true, "buttonBase"));
  g.add(contactBlob(0.5, 0.5, 0.6));
  g.add(mesh(latheG([[0.11, 0.09], [0.16, 0.09], [0.158, 0.105], [0.11, 0.108]], 64), pbr({ color: lin(LAB_PAL.buttonRing), rough: 0.25, peel: 0.2, clearcoat: 0.6 }), true, "ring"));
  const capM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...LAB4_PAL.buttonCap), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(0, 0, 0) });
  capM.customProgramCacheKey = () => "lab4:cap";
  const cap = new THREE.Mesh(latheG([[0.001, 0.09], [0.13, 0.09], [0.132, 0.11], [0.12, 0.135], [0.09, 0.155], [0.05, 0.166], [0.001, 0.17]], 64), capM);
  cap.castShadow = true; cap.name = "buttonCap"; g.add(cap);
  const glowC: C3 = [0.9, 0.05, 0.02];   // the lit cap stays RED (a warm glow turned it cream = her skin: her hand vanished on it)
  // V5 (lead + DIRECTOR audit): the dome visibly DIPS on every touch (~30 % of its height): `dip` 0..1 from lab_plan buttonDipAt
  return { object: g, set: (k: number, dip = 0, idle = 0) => { const d = Math.max(0, Math.min(1, dip)), sq = 1 - 0.18 * d; cap.scale.set(1 + 0.06 * d, sq, 1 + 0.06 * d); cap.position.y = 0.09 * (1 - sq) - 0.012 * d; capM.emissive.setRGB(...glowC).multiplyScalar(Math.max(0.7 * k, idle, 1.3 * d)); } };   // FIX R2: squash 18 % + a contact flash
};

/** the big red X (a canvas sign that pops; square to the lens) */
const redX = () => {
  const { cv, g: c } = canvas(512, 512); c.clearRect(0, 0, 512, 512); c.lineCap = "round";
  for (const [w, col] of [[150, "#3a0306"], [104, "#e8202a"]] as [number, string][]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(110, 110); c.lineTo(402, 402); c.moveTo(402, 110); c.lineTo(110, 402); c.stroke(); }
  c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 18; c.beginPath(); c.moveTo(128, 104); c.lineTo(250, 226); c.moveTo(384, 104); c.lineTo(300, 188); c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }); m.customProgramCacheKey = () => "lab4:x";
  const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); q.renderOrder = 9; q.name = "redX"; return q;
};

/** the row of small lamps on the partition: a navy strip with n round lamps (each its own material: one program) */
const lampStrip = (n: number, len: number) => {
  const g = new THREE.Group(); g.name = "lampStrip";
  g.add(mesh(rboxG(-0.06, -0.09, -0.02, len + 0.06, 0.09, 0.03, 0.02, 2), pbr({ color: lin(LAB_PAL.boardFrame), rough: 0.35, peel: 0.4 }), true, "stripBack"));
  const COL: Record<number, [number, number, number]> = { 0: [0.05, 0.05, 0.06], 1: lin(LAB_PAL.lampRed), 2: lin(LAB_PAL.lampGreen), 3: lin(LAB_PAL.candy[1]), 4: lin(LAB_PAL.candy[3]) };
  const mats: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, emissive: new THREE.Color(0, 0, 0) }); m.customProgramCacheKey = () => "lab4:mini";
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); s.rotation.x = Math.PI / 2; s.position.set((i * len) / (n - 1), 0, 0.03); g.add(s); mats.push(m);
  }
  return { object: g, update: (t: number) => mats.forEach((m, i) => { const st = stripAt(i, t); m.emissive.setRGB(...COL[st]).multiplyScalar(st === 1 ? 1.1 : st ? 2.2 : 0); m.color.setRGB(...(st ? [0.4, 0.4, 0.4] as C3 : COL[0])); }) };
};

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: C3, name: string, rough = 0.6) => mesh(rboxG(x0, y0, z0, x1, y1, z1, 0.01, 2), pbr({ color: col, rough, peel: 0.3 }), true, name);

export const build = async (ctx: KitCtx): Promise<Built> => {
  const tb0 = performance.now();
  const g = new THREE.Group(); g.name = "set:lab4";
  const ups: ((t: number, cam: THREE.Camera) => void)[] = [];
  const add = (b: { object: THREE.Object3D; update?: (t: number, cam: THREE.Camera) => void }) => { g.add(b.object); if (b.update) ups.push(b.update); return b; };
  const B = LAB4.booth, W4 = LAB4.win;
  let skyK = 0.85;   // the sky backdrop's brightness (follows the lamp state: see the lamp update)
  void LAB4_ROOM;

  // ---------------------------------------------------------------- the booth: sunny windows left, the observation window in the partition
  const Rm = await room(ctx, { origin: [B.x0, 0, B.z0], w: B.w, d: B.d, h: B.h, thick: 0.25, seed: 41,
    floor: "vinyl_speckled", floorOpts: { tint: LAB4_PAL.floor, ...LAB4_SURF.floorOpts },
    wall: "plaster", wallTint: LAB4_PAL.wall, wallOpts: { ...LAB4_SURF.wallOpts },
    windows: [
      ...[1.6, 4.6].map((a) => ({ wall: "left" as const, at: a, w: 1.7, h: 1.7, sill: 0.85, curtains: false as const })),
      { wall: "back" as const, at: W4.x - B.x0, w: W4.w, h: W4.h, sill: W4.sill, curtains: false as const },   // V5: the high window with sky (frame 0: above her head)
    ],
    radiator: false, bounce: LAB4_SURF.bounce, trimColor: LAB4_SURF.trim,
    lens: { points: [[0.3, 2.4], [0.3, 1.2], [0.6, 0.4]] } });
  add(Rm);
  { const fg = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), pbr({ color: [0.3, 0.55, 0.2], rough: 0.95, peel: 0 })); fg.rotation.x = -Math.PI / 2; fg.position.set(B.x0 - 100.3, -0.3, 0); g.add(fg); }
  const panels = [[0.3, B.h, -1.6], [0.3, B.h, 1.2]].map(([x, y, z]) => { const cp = ceilingPanel(ctx, [x, y, z], { lumens: LAB4_LIGHT.ceilingLumens, kelvin: LAB4_LIGHT.ceilingKelvin }); g.add(cp.object); if (cp.lamp) g.add(cp.lamp.object); return cp; });
  // LOOK (1): the panels' diffuser glow follows their dimmer (else it stays a white streak in the red)
  const diffs = panels.map((cp) => { let m: THREE.MeshBasicMaterial | null = null; cp.object.traverse((o) => { const mm = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if (!m && mm && (mm as THREE.Material).type === "MeshBasicMaterial") m = mm; }); return m ? { m: m as THREE.MeshBasicMaterial, c: (m as THREE.MeshBasicMaterial).color.clone() } : null; });

  // ---------------------------------------------------------------- V5: the SKY outside the high back window (a painted backdrop:
  // sky, sunny clouds, green hills, round trees) + three clouds drifting across it (life in every booth shot that sees it)
  { const bw = 7.0, bh = 3.4, bx = W4.x, by = W4.sill + W4.h / 2 + 0.4, bz = B.z0 - 1.6;
    const { cv, g: c } = canvas(1024, 512);
    const sky = c.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, "#2f9cf0"); sky.addColorStop(0.6, "#8fd3ff"); sky.addColorStop(1, "#d6f1ff"); c.fillStyle = sky; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = "#4cb84a"; c.beginPath(); c.moveTo(0, 512); c.lineTo(0, 400); for (let x = 0; x <= 1024; x += 32) c.lineTo(x, 392 - 30 * Math.sin(x / 140) - 14 * Math.sin(x / 47)); c.lineTo(1024, 512); c.fill();
    c.fillStyle = "#2f9a3e"; c.beginPath(); c.moveTo(0, 512); c.lineTo(0, 440); for (let x = 0; x <= 1024; x += 32) c.lineTo(x, 438 - 22 * Math.sin(x / 90 + 1.3)); c.lineTo(1024, 512); c.fill();
    for (const [x, y, r] of [[120, 400, 34], [190, 410, 26], [610, 392, 40], [690, 404, 30], [900, 398, 36]] as number[][]) { c.fillStyle = "#6b4226"; c.fillRect(x - 5, y, 10, 40); c.fillStyle = "#1f7f35"; c.beginPath(); c.arc(x, y - r * 0.4, r, 0, Math.PI * 2); c.fill(); c.fillStyle = "#3aa64a"; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.6, r * 0.55, 0, Math.PI * 2); c.fill(); }
    const T = new THREE.CanvasTexture(cv); T.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: T, color: new THREE.Color(0.85, 0.85, 0.85) }); m.customProgramCacheKey = () => "lab4:sky";
    const q = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), m); q.position.set(bx, by, bz); q.name = "skyBackdrop"; g.add(q);
    // the clouds: soft white puffs on their own planes just in front of the backdrop, drifting left to right
    const cc = canvas(256, 128); { const k = cc.g; k.fillStyle = "#ffffff"; for (const [x, y, r] of [[70, 80, 40], [120, 62, 50], [175, 78, 38], [140, 92, 34]] as number[][]) { k.beginPath(); k.arc(x, y, r, 0, Math.PI * 2); k.fill(); } }
    const CT = new THREE.CanvasTexture(cc.cv); CT.colorSpace = THREE.SRGBColorSpace;
    const cm = new THREE.MeshBasicMaterial({ map: CT, transparent: true, depthWrite: false, color: new THREE.Color(0.95, 0.95, 0.95) }); cm.customProgramCacheKey = () => "lab4:cloud";
    const clouds = [[0, 0.75, 1.3], [2.6, 0.45, 1.0], [4.9, 0.95, 1.5]].map(([x0, y, sc]) => { const k = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * sc, 0.6 * sc), cm); k.position.set(bx, by + y - 0.2, bz + 0.05); g.add(k); return { k, x0 }; });
    // the sky dims with the room (LOOK v5: a bright window behind her in the red read as a hole); skyK is set per lamp state below
    ups.push((t) => { for (const C of clouds) C.k.position.x = bx - bw / 2 + ((C.x0 + t * ((bw * 2) / (TOTAL / 30))) % bw);   /* FIX R1: 2 laps per film: loop-exact */ const st = lampAt(t).state; skyK = st === 1 ? 0.12 : st === 2 ? 0.5 : 0.85; m.color.setScalar(skyK); cm.color.setScalar(skyK * 1.1); });
  }

  // ---------------------------------------------------------------- HER station: the desk with a plain navy front, THE BUTTON, THE LAMP
  const D = LAB4.desk;
  const desk = await workTable(ctx, { w: D.w, d: D.d, h: D.h, plain: LAB4_PAL.heroDesk, rough: 0.35, seed: 5 }); desk.object.position.set(...D.at); g.add(desk.object);
  { const x0 = D.at[0] - D.w / 2 + 0.02, x1 = D.at[0] + D.w / 2 - 0.02, zf = D.at[2] + D.d / 2 - 0.02, y0 = 0.06, y1 = D.h - 0.03;   // V5: the panel runs down to the floor (a console)
    g.add(box(x0, y0, zf - 0.03, x1, y1, zf, lin(LAB_PAL.candy[3]), "deskFront", 0.4));
    // a framed panel: a white line inset 4 cm, a white kick strip at the foot (the caption sits on the plain field)
    for (const [a, b, c, d] of [[x0 + 0.04, y1 - 0.055, x1 - 0.04, y1 - 0.04], [x0 + 0.04, y0 + 0.04, x1 - 0.04, y0 + 0.055], [x0 + 0.04, y0 + 0.04, x0 + 0.055, y1 - 0.04], [x1 - 0.055, y0 + 0.04, x1 - 0.04, y1 - 0.04]])
      g.add(box(a, b, zf, c, d, zf + 0.006, lin(LAB_PAL.trim), "deskFrontLine", 0.4));
    g.add(box(x0, y0 - 0.03, zf - 0.03, x1, y0, zf + 0.004, lin(LAB_PAL.boardFrame), "deskFrontFoot", 0.4));
    // the panel detail: a bold orange band across the field, under the caption band (the same desk in every shot)
    g.add(box(x0 + 0.055, y0 + 0.075, zf, x1 - 0.055, y0 + 0.125, zf + 0.007, LAB4_PAL.heroDesk, "deskFrontBand", 0.4));
    // V5: a row of small indicator lamps across the console front (blinking: something alive under the caption band)
    void lampStrip; }   // AUDIT R1 #14/#15: the console bulb strip is gone (green belongs to the signal lamp alone)
  // FIX R2 (v03: the empty desk under the dome): a notebook + a stopwatch on the console's left front
  { const nb = new THREE.Group(); nb.add(box(-0.13, 0, -0.17, 0.13, 0.025, 0.17, lin("#1e5bd6"), "notebook", 0.5)); nb.add(box(-0.12, 0.025, -0.16, 0.12, 0.028, 0.16, lin("#fbfaf6"), "nbPage", 0.6));
    nb.position.set(-0.55, LAB4.desk.h, -0.05); nb.rotation.y = 0.5; g.add(nb);
    const sw = mesh(at(cylG(0.055, 0.055, 0.025, 24), 0, 0.012, 0), pbr({ color: lin("#ffd23a"), rough: 0.3, peel: 0.2, clearcoat: 0.6 }), true, "stopwatch"); sw.position.set(-0.3, LAB4.desk.h, 0.05); g.add(sw);
    const swF = mesh(at(cylG(0.045, 0.045, 0.004, 24), 0, 0.026, 0), pbr({ color: lin("#fbfaf6"), rough: 0.4, peel: 0.1 }), true, "stopwatchFace"); swF.position.copy(sw.position); g.add(swF); }
  // FIX R2 (no flat empty bottom third): desk dressing on the deep console's front half: a clipboard with a sheet + a pencil
  { const cb = new THREE.Group(); cb.add(box(-0.17, 0, -0.23, 0.17, 0.012, 0.23, lin("#7a5232"), "clipboard", 0.5)); cb.add(box(-0.15, 0.012, -0.2, 0.15, 0.016, 0.21, lin("#fbfaf6"), "clipSheet", 0.6));
    for (let j = 0; j < 6; j++) cb.add(box(-0.12, 0.016, -0.12 + j * 0.05, 0.12 - (j % 3) * 0.04, 0.0175, -0.11 + j * 0.05, lin("#1e2c5c"), "clipLine", 0.6));
    cb.add(box(-0.06, 0.012, -0.25, 0.06, 0.03, -0.21, lin("#b8b8bc"), "clipClamp", 0.3)); cb.position.set(0.42, LAB4.desk.h, -0.02); cb.rotation.y = -0.35; g.add(cb);
    const pen = mesh(at(cylG(0.007, 0.007, 0.16, 8), 0, 0, 0, 0, 0, Math.PI / 2), pbr({ color: lin("#ffd23a"), rough: 0.4, peel: 0.2 }), true, "pencil"); pen.position.set(0.1, LAB4.desk.h + 0.008, 0.02); pen.rotation.y = 0.6; g.add(pen); }
  const btn = bigButton(); btn.object.position.set(...LAB4.button); btn.object.scale.setScalar(LAB4.buttonScale); g.add(btn.object);
  try { g.add((await prop(ctx, "stool_wood", { pos: [LAB4.her[0] + 0.02, 0, LAB4.her[2] - 0.05], rotY: 0.3, scale: LAB4.seat / 0.437 })).object); } catch (e) { console.warn("lab4: stool missing", e); }
  const head = signalHead(); head.object.position.set(...LAB4.lamp); head.object.scale.setScalar(LAB4.lampScale); g.add(head.object);
  // AUDIT R1 #2: a visible mount: the signal head stands on a dark post down to the floor (it read as a floating traffic light)
  { const top = LAB4.lamp[1] - 0.47 * LAB4.lampScale; g.add(mesh(at(cylG(0.035, 0.045, top, 14), LAB4.lamp[0], top / 2, LAB4.lamp[2] - 0.13 * LAB4.lampScale), pbr({ color: [0.12, 0.13, 0.15], rough: 0.4, peel: 0.3 }), true, "signalPost")); }
  const LS = LAB4.lampScale, lampV: V3 = [LAB4.lamp[0], LAB4.lamp[1] - 0.02, LAB4.lamp[2] + 0.1], btnV: V3 = [LAB4.button[0], LAB4.button[1] + 0.17 * LAB4.buttonScale, LAB4.button[2]];
  // V5: the head stands upright: green on top, red below
  const loopAim: V3 = [LAB4.lamp[0] + 0.46, LAB4.lamp[1] + 0.16, LAB4.lamp[2] + 0.4];   /* beside the lit GREEN lens, in clear air in front of the housing */   // FIX R2 (v36): right of the housing edge and 0.38 m in front of it
  const redLamp: V3 = [LAB4.lamp[0], LAB4.lamp[1] - 0.205 * LS, LAB4.lamp[2] + 0.1], greenLamp: V3 = [LAB4.lamp[0], LAB4.lamp[1] + 0.205 * LS, LAB4.lamp[2] + 0.1];
  // LOOK's room wash (two lights: near the lens + high in the room), following the lamp
  const wash = labWash(ctx, lampV, lampAt);
  add(wash);
  ups.push((t) => {
    const L = lampAt(t); head.set(L.state, L.flash, false);   /* AUDIT R1 #12/#13: the lamp must read clearly OFF in frame 0 / v36a / v36 (the idle glow read half-lit) */ btn.set(buttonAt(t), domeDip(t), L.state === 0 && (t < HOOK.green || t >= OPENING_END()) ? LAB4_KEY.capGlow : 0);   // the idle glow: frame 0 + the loop only (never a red glint inside the Go run)
    // the red FLOODS the room: the white ceiling panels drop while the red holds in the opening
    { const pk = labPanelK(L.state); for (const p of panels) p.lamp?.set(pk); for (const d of diffs) d?.m.color.copy(d.c).multiplyScalar(pk); }   // LOOK v5: the booth's white light per lamp state (the red = a true alarm red)

  });

  // ---------------------------------------------------------------- the partition's life: the clock, the lamp strip
  { // FIX R1 (the loop seam): the second hand makes exactly one lap per film, so the last frame flows into frame 0
    const ck = await wallClock(ctx, { pos: LAB4.clock, yaw: 0, radius: 0.22, rim: LAB_PAL.clockRim, time0: 9 * 3600 + 41 * 60 }), LF = TOTAL / 30;
    add({ object: ck.object, update: (t: number, cam: THREE.Camera) => ck.update?.(((t % LF) + LF) % LF * (60 / LF), cam) }); }
  // AUDIT R1: the wall bulb strip is gone too (it blinked green: "which green light?")
  // a plant in the left corner (stirs in the draught of the open window)
  const plants: THREE.Object3D[] = [];
  for (const [name, pos, sc] of [["potted_tall", [3.2, 0, B.z0 + 0.45], 1.1], ["potted_tall", [B.x0 + 0.45, 0, B.z0 + 0.45], 1.1]] as [string, V3, number][]) {
    try { const p = (await prop(ctx, name, { pos, scale: sc, contact: 0.4 })).object; g.add(p); plants.push(p); } catch (e) { console.warn("lab4: plant missing", name, e); }
  }
  // LOOP SEAM (director 05:00): every cycle in the booth is a whole number of laps per film (TOTAL), so f TOTAL = f 0
  const LP = TOTAL / 30, w = (n: number) => (2 * Math.PI * n) / LP;   // n laps per film
  ups.push((t) => plants.forEach((p, i) => { const gust = 0.6 + 0.4 * Math.sin(t * w(10) + i * 1.7); p.rotation.z = gust * (0.022 * Math.sin(t * w(19) + i * 2.1) + 0.01 * Math.sin(t * w(47) + i)); }));

  // ---------------------------------------------------------------- V5: a second volunteer at her own little board, back right (depth)
  const ST = LAB4.station, stSig = miniSignal(1.12), stBtn = miniButton();
  if (false) { const col = lin(LAB_PAL.candy[2]); g.add(box(ST[0] - 0.39, 0.69, ST[2] - 0.21, ST[0] + 0.39, 0.72, ST[2] + 0.21, col, "st2Top")); g.add(box(ST[0] - 0.37, 0.2, ST[2] + 0.18, ST[0] + 0.37, 0.69, ST[2] + 0.2, col, "st2Front"));
    stBtn.object.position.set(ST[0] - 0.14, 0.72, ST[2] + 0.04); g.add(stBtn.object); stSig.object.position.set(ST[0] + 0.5, 0, ST[2] - 0.44); g.add(stSig.object);
    try { g.add((await prop(ctx, "stool_wood", { pos: [ST[0] + 0.02, 0, ST[2] - 0.57], rotY: 0.4, scale: 0.47 / 0.437 })).object); } catch { /* optional */ } }
  // her own little lamp blinks green now and then; she taps on some of the blinks
  const st2Taps: number[] = []; for (let t = 0.9; t < 80; t += 1.9 + ((t * 7) % 0.9)) st2Taps.push(t);
  ups.push((t) => { const tl = ((t % LP) + LP) % LP;   /* loop-exact: the taps repeat with the film */ const on = st2Taps.some((a) => tl >= a - 0.12 && tl < a + 0.2); stSig.set(on ? 2 : 0); stBtn.set(st2Taps.some((a) => tl >= a + 0.03 && tl < a + 0.16) ? 1 : 0); });

  // ---------------------------------------------------------------- the big red X (pops on "She" in the frozen shot)
  const X = redX(); g.add(X);
  const xf = new THREE.Vector3(), xr = new THREE.Vector3(), xu = new THREE.Vector3();
  ups.push((t, cam) => { const k = 0 * (inRole(t, "frozen") ? xAt(t) : 0); X.visible = k > 0.001; if (!X.visible) return;   /* DIRECTOR 05:30: his own drawn X replaces this 3D one in v05 */
    const d = 1.2, pc = cam as THREE.PerspectiveCamera, th = Math.tan(((pc.fov ?? 40) * Math.PI) / 360), tw = th * (pc.aspect ?? 0.5625);
    cam.matrixWorld.extractBasis(xr, xu, xf); xf.negate();
    // frame place: x 16 %, y 42 % from the top (beside her face, clear of it and of the ponytail); 26 % of the frame width
    X.position.copy(cam.position).addScaledVector(xf, d).addScaledVector(xr, -0.72 * tw * d).addScaledVector(xu, -0.12 * th * d);   /* AUDIT R1 #4/#5: frame x 14 %, y 56 %: beside the button on its empty side, never over her hand */
    X.quaternion.copy(cam.quaternion); X.scale.setScalar(Math.max(1e-3, k) * tw * d * 0.6); });
  // ---------------------------------------------------------------- the big green TICK (line 11: pops on "wait" in her point shot)
  const TK = (() => { const { cv, g: c } = canvas(512, 512); c.lineCap = "round"; c.lineJoin = "round";
    for (const [w, col] of [[150, "#05361a"], [104, "#22c55e"]] as [number, string][]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(100, 270); c.lineTo(210, 390); c.lineTo(420, 130); c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }); m.customProgramCacheKey = () => "lab4:x";
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); q.renderOrder = 9; q.name = "greenTick"; return q; })();
  g.add(TK);
  const tickAt = (() => { let s = NaN; try { s = S("wait#1"); } catch { /* the word may be cut */ } return Number.isFinite(s) ? s : spanOf("herPoint")[0] + 1.6; })();
  ups.push((t, cam) => { const q = (t - tickAt) / 0.2, k = !inRole(t, "herPoint") || q <= 0 ? 0 : q < 1 ? 1.18 * Math.sin((q * Math.PI) / 2) : 1 + 0.18 * Math.exp(-(q - 1) * 3) * Math.cos((q - 1) * 7);
    TK.visible = k > 0.001; if (!TK.visible) return;
    const d = 1.2, pc = cam as THREE.PerspectiveCamera, th = Math.tan(((pc.fov ?? 40) * Math.PI) / 360), tw = th * (pc.aspect ?? 0.5625);
    cam.matrixWorld.extractBasis(xr, xu, xf); xf.negate();
    // frame place: x 82 %, y 46 % (right of her face, clear of the point at the frame's left)
    TK.position.copy(cam.position).addScaledVector(xf, d).addScaledVector(xr, 0.6 * tw * d).addScaledVector(xu, 0.56 * th * d);   /* V5: frame x 80 %, y 22 %: above-right of her head (over the sky window), clear of the arm */
    TK.quaternion.copy(cam.quaternion); TK.scale.setScalar(Math.max(1e-3, k) * tw * d * 0.56); });

  // ---------------------------------------------------------------- the 1994 HALL (lines 4-9), 40 m along +X
  await buildHall(ctx, g, ups);

  // ---------------------------------------------------------------- PEOPLE (CAST's cards + CAST's v4 beats on the v4 clock)
  try {
    const [{ castCardOf }, MV, { BEATS_V4 }, { R_V4 }] = await Promise.all([import("../../cast/member"), import("../../cast/moves"), import("../../cast/beats_v4"), import("../resolver")]);
    // HER: CAST's rows (hover / tap on each Go / down on the red / frozen stare / the point in line 11 and the loop)
    const timed = MV.timeBeats(BEATS_V4.filter((b) => b.who === "lab_woman"), R_V4);
    const loopPointAt = (() => { try { const v = S("point#6"); return Number.isFinite(v) ? v : spanOf("loop")[0] + 0.8; } catch { return spanOf("loop")[0] + 0.8; } })();
    const points = (t: number) => inRole(t, "herPoint") || inRole(t, "loop"), inLoop = (t: number) => inRole(t, "loop"); void inLoop;   // loopA ("Now try again") = finger ready under the dark lamp
    // V5: she turns a little toward the 3/4 lens (yaw -0.3) so her face reads in frame 0
    add(await castCardOf(ctx, "lab_woman", { pos: () => LAB4.her, yaw: () => -0.3, seated: LAB4.seat,
      aim: (t) => (points(t) && !(inLoop(t) && (t < loopPointAt - 0.25 || (Number.isFinite(EV.loopTail) && t >= EV.loopTail))) ? (inLoop(t) ? loopAim : redLamp) : btnV),   /* FIX R2: in v36 the finger stops in clear air in front of + beside the lens */   /* CAST 05:50: the loop tail: back to the button */   /* FIX R1: in v36 the hand stays at the button until the word "point" (arm-out share) */   /* the loop points at the lamp like line 11 (the upright head's green lens on top made the arm vertical) */ look: (t) => (points(t) && !(inLoop(t) && Number.isFinite(EV.loopTail) && t >= EV.loopTail) ? redLamp : lampV), name: "lab4_her" }, (e) => MV.actBeats("lab_woman", timed, e)));
    const NOW = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: (f: number) => f + 600 };
    // FIX R1 (BLOCKER, v36): a card standing BEHIND her card showed through her head (a flickering white patch): the researcher
    // is out of the booth for good, and nobody stands behind her in the frame-0 family of lenses (v01, v18, v36a, v36)
    const boothHidden = (_t: number) => true;
    const herHead: V3 = [LAB4.her[0], 1.22, LAB4.her[2]];
    // V5: THE RESEARCHER WALKS IN from the right on frame 0's shot (notebook + pen), stops behind her right shoulder and
    // writes (small nods = pen strokes); his head snaps up to the lamp on the red; on the loop shot he walks out again,
    // so the film's last frame is its first (he is off the frame's right edge on both)
    const RS = LAB4.researcher, run = RS.x0 - RS.x1, W1: [number, number] = [0, 38];
    const [la, lb] = spanOf("loop"), W2: [number, number] | null = Number.isFinite(lb) ? [fr(lb) - 40, fr(lb) - 2] : null;
    void la;
    const nods: Beat[] = []; for (let f = 6; f < 2400; f += 17 + ((f * 7) % 11)) nods.push({ who: "researcher_v4", m: "nod", at: f, amt: 0.35 });
    const walks: Beat[] = [{ who: "researcher_v4", m: "walk", at: 0, until: 100000 } as Beat];   // the pacing below (the walk-in / walk-out of W1 / W2 is retired)
    void W2;
    const rb = MV.timeBeats([...nods, ...walks, { who: "researcher_v4", m: "alive", at: 0, until: 100000, amp: 0.8 } as Beat], NOW);
    const rx = (t: number) => { const f = t * 30; let x = RS.x0 - Math.min(run, MV.walkedM(f, W1[0], W1[1]));
      if (W2) x += Math.min(run, MV.walkedM(f, W2[0], W2[1])); return x; };
    const walkingOut = (t: number) => run > 0.01 && !!W2 && t * 30 >= W2[0] && t * 30 <= W2[1] + 1, walkingIn = (t: number) => run > 0.01 && t * 30 <= W1[1] + 1;
    const notebook = (t: number): V3 => [rx(t) - 0.35, 1.0, RS.z + 0.2];
    // V5 (lead 01:20: life BEHIND her): he paces slowly toward the back wall and back (behind her right shoulder), 14 times
    // over the film so the last frame matches the first (the loop); legs from a walk beat over the whole film
    const PER = TOTAL / 30 / 14, pz = (t: number) => RS.z - 0.45 + 0.45 * Math.cos((2 * Math.PI * t) / PER), away = (t: number) => Math.sin((2 * Math.PI * t) / PER) > 0;
    add(await castCardOf(ctx, "researcher_v4", { pos: (t) => (boothHidden(t) ? [rx(t), -50, pz(t)] : [rx(t), 0, pz(t)]),   /* hidden in v04 (edge-on at the left edge, r20) and v03 (the lamp housing hid his head: director 02:11) */ yaw: (t) => (walkingIn(t) ? -Math.PI / 2 : walkingOut(t) ? Math.PI / 2 : away(t) ? Math.PI - 0.5 : -0.5),
      look: (t) => (inRole(t, "frozen") && t >= HOOK.x - 0.35 ? herHead : t >= HOOK.red && t < HOOK.redBeatEnd + 1.2 ? redLamp : notebook(t)),   // v05: he turns to look at HER
      act: (_t, P) => ({ ...P, hold: [{ k: "notebook", side: -1 }, { k: "pen", side: 1 }] }), name: "lab4_researcher" }, (e) => MV.actBeats("researcher_v4", rb, e)));
    // V5: the second volunteer (back right) at her little board: waiting, alive, a tap on some of her own blinks
    { const seat: V3 = [ST[0], 0, ST[2] - 0.52], b2: V3 = [ST[0] - 0.14, 0.8, ST[2] + 0.04], l2: V3 = [ST[0] + 0.5, 1.12, ST[2] - 0.4];
      const vb: Beat[] = [{ who: "lab_d", m: "hover", at: 0, until: 100000 } as Beat, { who: "lab_d", m: "alive", at: 0, until: 100000, amp: 0.9 } as Beat,
        ...st2Taps.filter((_, i) => i % 2 === 0).map((a) => ({ who: "lab_d", m: "tap", at: Math.round(a * 30) } as Beat))];
      const vt = MV.timeBeats(vb, NOW);
      const vol2Hidden = (t: number) => inRole(t, "red") || inRole(t, "goRun") || inRole(t, "frame0") || inRole(t, "loop") || inRole(t, "loopA") || inRole(t, "herPoint") || inRole(t, "green") || inRole(t, "frozen");   /* GATES R2: her face turned into the caption band at v05's right edge (20 f) */ /* FIX R1: never behind her head (card sorting) */   // CAST 01:50: in v04 she sat by the hero's hand; 03:25: out of the Go run too (the GO! pulse covered her face)
      add(await castCardOf(ctx, "lab_d", { pos: (t) => (vol2Hidden(t) ? [seat[0], -50, seat[2]] as V3 : seat), yaw: () => -0.35, seated: 0.47, aim: () => b2, look: (t) => (inRole(t, "frozen") && t >= HOOK.x - 0.2 ? herHead : l2), name: "lab4_vol2" }   /* v05: she turns her head to look at the hero */, (e) => MV.actBeats("lab_d", vt, e))); }
  } catch (e) { console.warn("lab4: CAST not available", e); }

  console.warn(`kit set "lab4" (LAB v4) built in ${(performance.now() - tb0).toFixed(0)} ms; roles ${JSON.stringify(ROLE)}; go ${HOOK.go.map((x) => x.toFixed(2)).join(" ")}`);
  return {
    object: g,
    hints: { shadowCenter: [0.3, 0, -1.5], shadowExt: 5.5, probe: [0.3, 1.4, 0.5], groundAlbedo: [0.4, 0.5, 0.8],
      rigOpts: { ...LAB4_RIG } },   // LOOK's rig (re-tuned 17:00: exposure 1.55, the low sun on her face); the hall shares it
    update: (t, cam) => { Rm.update?.(t, cam); for (const u of ups) u(t, cam); },
  };
};

/** CAST 05:50: the dome's dip follows her finger exactly: GO_PRESS [lag, travel, hold, up] frames after each Go; on the red
 *  RED_DOWN { start, travel } frames after the red, then held down to the end of the opening */
const domeDip = (t: number): number => {
  if (t >= OPENING_END()) return 0;
  const f = t * 30, fr0 = HOOK.red * 30 + RED_DOWN.start;
  if (f >= fr0) return Math.min(1, (f - fr0) / Math.max(1, RED_DOWN.travel));
  let k = 0;
  HOOK.go.slice(0, 6).forEach((g, n) => { const P = GO_PRESS[n]; if (!P) return; const [lag, travel, hold, up] = P, s0 = Math.round(g * 30) + lag;
    const d = f - s0; if (d < 0) return;
    const v = d < travel ? d / travel : d < travel + hold ? 1 : d < travel + hold + up ? 1 - (d - travel - hold) / up : 0; k = Math.max(k, v); });
  return k;
};
void buttonDipAt;

// ================================================================ CAMERAS (one glide, then the director's rest)
/** THE OPENING'S LENSES (checked with a pinhole projection against the 64 % line, then on draft stills) */
export const VIEWS: Record<string, View> = {
  // V5 (lead 23:00): the LOW THREE-QUARTER opening (lab5/lay.mjs projections; frame x %, y % from the top). fnum 2.8: the
  // room behind her goes soft at final quality (depth). Caption band y 65.6-75 %: her eyes, her hand and the dome's top stay above it.
  /** FRAME 0: the upright lamp 6-40 % x / 4-44 % y (upper left), her head 50-82 % x / 32-49 % y, the button 20-62 % x with
   *  its dome top at 51 %; behind her: the high sky window (58-99 % x, 8-28 % y), the clock, the second volunteer, the
   *  researcher walking in from the right */
  A0: { pos: [0.0, 1.5, 1.2], look: [0.15, 0.9, -1.0], fov: 58, fnum: 2.8 },   // FIX R2 (DIRECTOR hook spec): lamp 35 % of the width, whole; head ~0.24; dome centre y ~0.58; blue front ~13 % (deep desk)
  /** v02 the cut-in on "green": closer and higher on the lamp's side: the lamp 59 % of the height (9-50 % x), her face
   *  24 % (63-92 % x, 40-64 % y): a clearly bigger picture than frame 0 */
  G0: { pos: [-0.75, 1.05, -0.6], look: [0.08, 1.4, -1.1], fov: 88, fnum: 2.8 },   // FIX R2: v02 a LOW wide insert from the lamp side, looking UP: the lamp big upper left (whole), her face lower right looking up
  G9: { pos: [-0.8, 1.4, 1.0], look: [-0.08, 1.18, -1.0], fov: 56, fnum: 2.8 },   // the old v02 cut-in, kept for v36a
  /** v03 the Go run: from frame 0's side (button, hand, face, lamp) pushing in to the lamp + her eyes (head 28 %; both
   *  lenses and her whole head stay inside: s6.mjs R1) */
  R0: { pos: [-0.9, 1.1, 0.6], look: [0.0, 1.1, -0.9], fov: 64, fnum: 2.8 },   // FIX R2: v03 three-quarter SIDE view from her right: dome ~0.42 of the width, lamp upper left, face between
  R1: { pos: [-0.77, 1.1, 0.39], look: [-0.02, 1.12, -0.9], fov: 64, fnum: 2.8 },   // the accelerating dolly's end (~1.16x; more cuts the lamp)
  /** v04 the RED: TIGHTER than the end of the Go run, low, looking up: the red lens huge on the left (3-41 % x), her face
   *  31 % (57-97 % x, 27-57 % y), her hand down on the dome (dome top 55 %) */
  D0: { pos: [0.7, 1.3, 0.6], look: [0.2, 1.1, -1.0], fov: 58, fnum: 2.8 },   // FIX R2: v04 from her LEFT front (angle change ~80 deg, head ~0.33): red lens, face, hand
  /** v05 "Did you tap? She did.": its own picture: close on her frozen face (29 %, 39-93 % x), the big red X beside her
   *  face over her hand on the button (frame left) */
  F0: { pos: [-0.6, 1.35, 1.2], look: [0.2, 0.9, -1.0], fov: 50, fnum: 2.8 },   // FIX R2: v05 front-left, higher (the desk top, not its blue front, under the dome)
  F1: { pos: [-0.88, 1.55, 0.95], look: [0.12, 0.98, -1.0], fov: 50, fnum: 2.8 },
  /** her point (line 11): frame 0's place, the lens sliding 0.33 m along her (a short glide) */
  P0: { pos: [0.8, 1.3, 1.45], look: [0.02, 1.28, -1.0], fov: 50, fnum: 2.8 },   // FIX R1: from her right front: the arm crosses the plain apricot wall to the lit red lens (hand + lamp one glance)
  P1: { pos: [0.66, 1.3, 1.3], look: [0.02, 1.28, -1.0], fov: 50, fnum: 2.8 },
};
const V = VIEWS;
/** a held lens (the director's rest covers the whole shot) */
const held = (v: View): ShotCam => () => () => ({ pos: v.pos, look: v.look, fov: v.fov, fnum: v.fnum ?? 8, focus: Math.hypot(v.look[0] - v.pos[0], v.look[1] - v.pos[1], v.look[2] - v.pos[2]) });
/** the loop: the last shot GLIDES BACK INTO frame 0's lens (0.35 m pull) and rests on it: the cut to frame 0 is a match */
const loopIn: View = (() => { const d = V.A0.look.map((x, i) => x - V.A0.pos[i]), l = Math.hypot(...d); return { ...V.A0, pos: V.A0.pos.map((x, i) => x - (d[i] / l) * 0.6) as V3 }; })();   // V5: 0.6 m back along the lens, glides INTO frame 0
const ROLE_CAMS: Partial<Record<Role, ShotCam>> = {
  frame0: pushRest(V.A0, 0.25, 0),   // FIX R2: a slow push (~1.1x), never still
  green: pushRest(V.G0, 0.12),
  goRun: (from, to) => { const a = V.R0, b = V.R1, t0 = from / 30, t1 = to / 30; return (t: number) => { const u0 = Math.max(0, Math.min(1, (t - t0) / Math.max(1e-3, t1 - t0))), u = u0 * u0;   /* FIX R2: ONE accelerating dolly (ease-in only, no rest) */
    const L3 = (p: V3, q: V3): V3 => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u], pos = L3(a.pos, b.pos), look = L3(a.look, b.look); return { pos, look, fov: a.fov + (b.fov - a.fov) * u, fnum: b.fnum ?? 8, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) }; }; },
  red: pushRest(V.D0, 0.15, 0),
  frozen: pushRest(V.F0, 0.12, 0),
  herPoint: glideRest(V.P0, V.P1, 20),
  // the loop: if the plan splits the last line (v36 -> two shots) the FIRST part = v02's cut-in (lamp dark, finger ready), the LAST
  // part glides back into frame 0's lens (when one shot holds both roles the FIRST listed role wins: loop before loopA, watched before five)
  loop: glideRest(loopIn, V.A0, 20),
  loopA: pushRest({ pos: [0.75, 1.35, 0.9], look: [0.15, 1.12, -1.0], fov: 54, fnum: 2.8 }, 0.15, 0),   // FIX R2: "Now try again." from her LEFT front: her ponytail shows (she read as a boy); a slow push
  // ---- the 1994 hall (lab_hall.ts, x = HX). V5 (lead 22:50: a head at most 1/4 of the height, NEVER cut by an edge; rows of
  // whole people): every lens checked with lab5/hc2.mjs at its first frame AND after the director's drift. The wides stand
  // at the front wall, centred on the aisle (all 24 heads whole, 7-10 %); the shots about ONE row (v10 / v10b row 1, v12 /
  // v13 / v14 row 2, v15 / v16 the bored one in row 1) hide the other column (lab_hall rowG) and look down that column from
  // high in front (12 whole heads, staggered); v07 looks at the side wall (the researcher at the switch, no rows).
  wide1994: glideRest({ pos: [HX, 1.95, 5.9], look: [HX, 1.0, -5], fov: 56 }, { pos: [HX, 1.85, 5.5], look: [HX, 1.0, -5.5], fov: 54 }, 15),   // FIX R2: lower (no ceiling void; the new ceiling panels), the two rows + 1994 board
  switch: pushRest({ pos: [HX - 0.6, 1.5, 5.4], look: [HX - 3.55, 1.05, 3.55], fov: 46 }, 0.3, 15),   // the researcher whole (head ~20 %), the switch, the clock over it
  counter: glideRest({ pos: [HX + 2.6, 2.95, -5.6], look: [HX + 2.6, 2.35, -10.4], fov: 54 }, { pos: [HX + 2.6, 2.8, -6.2], look: [HX + 2.6, 2.4, -10.4], fov: 54 }, 0),   // AUDIT R1 #18: the counter big and WHOLE; GATES R2 (f373-377 frozen): the push never stops
  redRoom: held({ pos: [HX + 3.2, 3.3, 4.8], look: [HX + 0.8, 1.1, -5.0], fov: 60 }),   // lead 07:00: v09 "then red.": the red hall WITH the counter's 101 (right of the 1994 board)
  watched: pushRest({ pos: [HX + 2.4, 1.4, 1.2], look: [HX, 1.1, -2.4], fov: 68 }, 0.4, 0),   // FIX R2 RE-STAGE: a low three-quarter medium along row 1: four faces, hands over the buttons, red lamps on top; slow push
  five: held({ pos: [HX + 4.3, 2.8, -0.4], look: [HX - 0.2, 0.9, -3.82], fov: 50 }),   // the five across from the side-front, high (the row moved to z -3.3, out of the red wash)
  card: held({ pos: [HX + 2.6, 3.5, 5.4], look: [HX + 1.5, 0.6, -1.0], fov: 50 }),   // row 2 alone + the researcher with the card (card 47-60 % y, above the caption band); boards whole
  wave: pushRest({ pos: [HX - 1.8, 1.9, -3.4], look: [HX + 1.8, 1.5, -6.6], fov: 54 }, 0.25),   // FIX R2 RE-STAGE: close along the row from its left front: people fill it; the arms rise to the HIGH lamps
  notOne: slideRest({ pos: [HX + 2.8, 1.9, -3.6], look: [HX + 0.2, 1.65, -6.6], fov: 54 }, 0.3),   // FIX R2 RE-STAGE: front three-quarter, close: raised arms at the red lamps, clean buttons, 0 OF 12 big + straight
  bored: pushRest({ pos: [HX - 2.1, 1.9, 3.2], look: [HX - 0.95, 0.9, 0.3], fov: 44 }, 0.2, 15),   // FIX R2: his face (~0.22) + HIS red lamp in his eyeline beside it; the button above the band
  tapper: slideRest({ pos: [HX - 1.7, 1.75, 1.95], look: [HX - 1.0, 0.92, 0.4], fov: 54 }, 0.08, 10),   // FIX R2 RE-STAGE: from above-front: the hand BIG on the dome, his red lamp up right, his face soft above
};
/** the film's camera table: shot id -> camera, by ROLE (the shot plan's ids may change; the words will not) */
export const CAMS: Record<string, ShotCam> = (() => { const o: Record<string, ShotCam> = {}; for (const [r, c] of Object.entries(ROLE_CAMS) as [Role, ShotCam][]) { const id = ROLE[r]; if (id && !o[id]) o[id] = c; } return o; })();   // first listed role wins
export type { CamState };
void fr;

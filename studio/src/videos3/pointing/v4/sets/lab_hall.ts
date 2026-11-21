// LAB v4: THE 1994 HALL (owner LAB), built by sets/lab.ts next to the opening's booth, 40 m along +X (its own room; the
// booth's lenses never see it). Script lines 4-9: "In 1994, a railway lab in Japan set a trap like this. A hundred
// lights. Then, red. Twelve people just watched. Five pressed anyway. Twelve others got one extra rule: point at the light
// and say it. Not one pressed. After a hundred times, your hand stops waiting for your brain."
// THE PICTURE: two rows of twelve volunteers at little desks, each with ONE red push button and ONE little signal lamp on
// a post at their left (so a point at it is a side-on arm); on the back wall a big "1994" board, a red-LED counter
// (runs up to 97, then 98, 99, 100 on "hundred", 101 on the red) and a clock; at the end of each row a score stand
// ("5 OF 12" on "Five", "0 OF 12" on "Not"); at the front right the BIG SWITCH with the researcher. The red floods the
// hall (LOOK's signalWash) from "red" to the end of the five; again for "Not one pressed" and the bored volunteer.
// Every time is a word (timeline S) or a shot found by role (lab_plan): nothing is a typed frame.
import * as THREE from "three";
import type { KitCtx, V3 } from "../../../../kit/core/ctx";
import { room } from "../../../../kit/surfaces/interior";
import { prop } from "../../../../kit/props/catalog";
import { ceilingPanel, wallClock, pbr, mesh, rboxG, cylG, latheG, at, canvas, contactBlob, drawPictogram, type C3 } from "../../../../kit/home";
import type { Beat } from "../../cast/moves";
import { LAB_PAL, LAB4_PAL, LAB4_SURF, HALL_LOOK, HALL_RED, redRoomDim, signalWash } from "../look";
import { S } from "../timeline";
import { inRole, spanOf, fr } from "./lab_plan";

const lin = (hex: string): C3 => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const tryS = (k: string, fb = NaN) => { try { const v = S(k); return Number.isFinite(v) ? v : fb; } catch { return fb; } };

export const HX = 40;
// LAYOUT (portrait!): the two "rows" run AWAY from the lens like an exam hall: row 1 = the left column (x HX - 1.1), row 2
// = the right column (x HX + 1.1), 12 stations each from z 1.5 back to z -8.95; everyone faces +Z (the lens); the aisle
// between them. The back wall (z -10.4) carries the 1994 board, the counter and the clock, centred over the aisle.
export const HALL = {
  room: { x0: HX - 4.6, z0: -10.4, w: 9.2, d: 16.6, h: 4.0 },   // V5: a taller hall (4 m): the row lenses look down the column from 3.3-3.55 m
  /** the two rows: column x; 12 stations 0.95 m apart along -z */
  // V5 (lead: no head cut by an edge): the columns closer (+-0.95) and starting further back (0.6, 0.86 m apart): the
  // wides from the front wall hold all 24 heads whole (lab5/hc2.mjs)
  cols: [HX - 0.95, HX + 0.95], zs: Array.from({ length: 12 }, (_, i) => 0.6 - 0.86 * i),
  desk: { w: 0.78, d: 0.42, h: 0.72 },
  /** the five who press anyway (row 1 station indices) and the bored volunteer (row 1, the front desk) */
  five: [1, 3, 5, 7, 9], bored: 0,
  /** the year is not spoken any more: the 1994 board is BIG, centred over the aisle (readable from v06's first frame) */
  board1994: [HX - 1.0, 2.18, -10.38] as V3, counter: [HX + 2.6, 2.5, -10.37] as V3, clock: [HX - 4.58, 2.3, -6.0] as V3,
  /** ONE score board on the back wall under the counter: "5 OF 12" from "Five", "0 OF 12" from "Not" (one board: two boards across
   *  the wall were always cut by some lens) */
  score: [[HX + 2.6, 1.72, -10.37]] as V3[],
  // V5: the researcher stands BEHIND the switch (wall side) facing the lens; the v07 lens looks at the side wall (no rows in it)
  switch: [HX - 3.6, 0, 3.6] as V3, researcherAtSwitch: [HX - 4.15, 0, 3.55] as V3, clock2: [HX - 4.58, 2.45, 3.0] as V3,
  researcherAtRow2: [HX + 2.55, 0, 1.15] as V3,   // the switch: well in front of the rows (a volunteer's hand sat on his head in v07)
};
/** a station's world points: the button top, the lamp lens, the seat */
export const station = (r: number, i: number) => {
  // staggered: every other desk 0.14 m left / right, so the heads down a column never stack on one another (CAST 19:05)
  const x = HALL.cols[r] + (i % 2 ? 0.14 : -0.14), z = HALL.zs[i], h = HALL.desk.h;
  // the lamp stands on a floor post BESIDE the person (their left, screen right), at shoulder height: the point at it is a
  // side-on arm in the front lenses (a lamp on the desk in front of them made the arm come at the lens)
  return { x, z, button: [x - 0.14, h + 0.075, z + 0.04] as V3, lamp: [x + 0.3, 1.95, z - 0.05] as V3, seat: [x, 0, z - 0.52] as V3 };   // FIX R2: the lamp HIGH (1.95 m) at the left-front: arms rise into clear air
};

/** V5 (lead: "Five press anyway" as a ROW ACROSS the frame): in the v10b shot the FIVE who press sit side by side in one
 *  row across the hall (0.82 m apart, desks at z -4.5), the rest of row 1 and all of row 2 hidden: five whole people, five
 *  X's above their heads, countable. (A row of 12, or even 6, across a 9:16 frame cannot keep heads apart at more than
 *  ~7 % of the height: lab5/diag.mjs.) Returns the offset of a station from its column place at time t. */
export const FIVE_ROW = { z: -3.3, dx: 0.95, x0: HX - 0.95 };
/** lead 07:00 (v10b "Five press anyway."): the five hands come down ONE AFTER ANOTHER, far to near (k = 0..4 = the order of
 *  HALL.five, left to right in the v10b lens): press k starts lead + k * gap frames after "five" and lands travel frames later;
 *  its button dips over the travel, its X pops and the board counts on the landing */
export const FIVE_PRESS = { lead: 3, gap: 6, travel: 4 };   // fix4: at z -4.5 the red wash at z -5.5 burnt the centre face white
/** V5 (lead 02:30: no stacked columns): the shots about one row place a few of its stations IN A ROW ACROSS the hall and
 *  look along it from the side (a three-quarter view: the heads step across the frame, each clear of the next, heads
 *  ~16-19 %; lab5/rowsearch.mjs): v10 = six of row 1, v10b = the five who press, v13 / v14 = six of row 2; the rest of
 *  that row is hidden for the shot and the boards say twelve. */
export const ROW_SHOTS = { watched: { r: 0, z: -2.0, dx: 0.85, x0: HX - 0.2, n: 4 }, watched2: { r: 1, z: -3.2, dx: 0.75, x0: HX - 0.6, n: 0 }, r2b: { r: 1, z: -6.0, dx: 0.95, x0: HX - 0.125, n: 5 }, r2: { r: 1, z: -6.0, dx: 0.95, x0: HX + 1.6, n: 6 } };
/** the offset of station (r, i) from its column place at time t; null = hidden in this shot */
const layoutOff = (r: number, i: number, t: number): V3 | null => {
  const s = station(r, i);
  if (inRole(t, "five") && r === 0) { const k = HALL.five.indexOf(i); return k < 0 ? null : [FIVE_ROW.x0 + (k - 2) * FIVE_ROW.dx - s.x, 0, FIVE_ROW.z - s.z]; }
  const L = inRole(t, "watched") ? (r === 0 ? ROW_SHOTS.watched : ROW_SHOTS.watched2) : inRole(t, "wave") && r === 1 ? ROW_SHOTS.r2 : inRole(t, "notOne") && r === 1 ? ROW_SHOTS.r2b : null;
  if (!L) return [0, 0, 0];
  return i >= L.n ? null : [L.x0 + (i - (L.n - 1) / 2) * L.dx - s.x, 0, L.z - s.z];
};
const addV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** the bored volunteer's own lamp in v15 / v16: at his eye level, beside his head */
const boredLamp = (st: { x: number; z: number }): V3 => [st.x + 0.45, 1.35, st.z - 0.3];

// ---------------------------------------------------------------- the hall's clock (words + roles)
const W = () => ({
  red: (() => { const r = tryS("red#1"); return Number.isFinite(r) ? Math.floor(r * 30 + 1e-6) / 30 - 1e-3 : spanOf("redRoom")[0]; })(),   /* r2: snapped to its frame (the cut frame of v09 was still blue) */   /* LOOK audit: the hall turns red exactly WITH the word "red" (the 101st light), never before */ hundred: tryS("hundred#1"), five: tryS("five#1"), anyway: tryS("anyway#1"), point: tryS("point#1"), not: tryS("not#1"), hand: tryS("hand#1"), brain: tryS("brain#1"),
  trap: tryS("trap#1"),
});
const endOf = (...rs: Parameters<typeof spanOf>[0][]) => Math.max(...rs.map((r) => spanOf(r)[1]).filter(Number.isFinite), -1);
const startOf = (...rs: Parameters<typeof spanOf>[0][]) => Math.min(...rs.map((r) => spanOf(r)[0]).filter(Number.isFinite), 1e9);
/** the press of the five's k-th: start / landing time (s) */
const fiveStart = (k: number) => W().five + (FIVE_PRESS.lead + k * FIVE_PRESS.gap) / 30, fiveLand = (k: number) => fiveStart(k) + FIVE_PRESS.travel / 30;
/** a station lamp: 0 dark, 1 red, 2 green */
export const hallLampAt = (r: number, i: number, t: number): 0 | 1 | 2 => {
  const w = W();
  if (inRole(t, "bored") || inRole(t, "tapper")) return r === 0 && i === HALL.bored ? 1 : 0;   // FIX R2: only HIS lamp, red
  const blink = (Math.floor(t * 2.6 + i * 0.41 + r * 0.7) % 3) !== 0 ? 1 : 0;   // FIX R1 life: each red lamp blinks in its own rhythm
  if (t >= w.red && t < endOf("redRoom", "watched", "five")) { void blink; return 1; }   // lead 07:00: from "red." to "anyway" every lamp holds a steady red (a held breath; it breathes in the update)
  if (inRole(t, "notOne")) return r === 1 ? 1 : 0;
  if (inRole(t, "wave") || inRole(t, "card")) return r === 1 ? 2 : 0;
  if (inRole(t, "counter")) { for (const c of [w.hundred - 0.7, w.hundred - 0.35, w.hundred]) if (t >= c && t < c + 0.24) return 2; return 0; }
  // before the trap: idle green blinks along the rows (each station its own rhythm)
  const per = 0.5 + 0.13 * ((i * 5 + r * 3) % 4), n = Math.floor(t / per + i * 0.31 + r * 0.5);
  return (n + i + r) % 3 === 0 ? 2 : 0;
};
/** the counter's number at t */
const counterAt = (t: number) => {
  const w = W(), a = startOf("wide1994", "switch", "counter"), b = w.hundred - 0.7;
  if (t >= w.red) return 101;
  if (t >= Math.max(w.hundred, startOf("counter") + 0.8)) return 100; void b; const ca = startOf("counter");
  if (Number.isFinite(ca) && inRole(t, "counter")) { if (t >= ca + 0.4) return 99; if (t >= ca) return 98; }
  void a; return 97;   // FIX R2: 98 on the cut to v08, 99 half way, 100 on "hundred"   // AUDIT R1 #18: no running counter in the wide: 97 until 98, 99, 100
};

// ---------------------------------------------------------------- props
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: C3, name: string, rough = 0.5) => mesh(rboxG(x0, y0, z0, x1, y1, z1, 0.012, 2), pbr({ color: col, rough, peel: 0.4, clearcoat: 0.3, ccRough: 0.25 }), true, name);
/** a text / picture panel on a canvas: draw(c, w, h) whenever `key` changes */
const sign = (w: number, h: number, px: number, draw: (c: CanvasRenderingContext2D, W: number, H: number, key: string) => void) => {
  const { cv, g: c } = canvas(Math.round(px * (w / h)), px); const T = new THREE.CanvasTexture(cv); T.colorSpace = THREE.SRGBColorSpace; T.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: T, roughness: 0.45, emissive: new THREE.Color(1, 1, 1), emissiveMap: T, emissiveIntensity: 0.25 }); m.customProgramCacheKey = () => "lab4:sign";
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); let last = "";
  return { object: q, set: (key: string) => { if (key === last) return; last = key; draw(c, cv.width, cv.height, key); T.needsUpdate = true; } };
};
const font = (px: number) => `900 ${px}px "Arial Black", "Arial", sans-serif`;
/** the little station signal: a dark box with ONE round lens and a hood, on a post (local: the post's foot at 0, lens +z) */
export const miniSignal = (h: number) => {
  const g = new THREE.Group(); const dark = pbr({ color: lin(LAB_PAL.lampHousing), rough: 0.4, peel: 0.4 });
  g.add(mesh(at(cylG(0.045, 0.05, 0.02, 24), 0, 0.01, 0), dark, true, "foot"));
  g.add(mesh(at(cylG(0.011, 0.011, h - 0.08, 10), 0, (h - 0.08) / 2, 0), dark, true, "post"));
  g.add(mesh(rboxG(-0.075, h - 0.08, -0.06, 0.075, h + 0.08, 0.035, 0.02, 2), dark, true, "head"));
  const lm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.15, emissive: new THREE.Color(0, 0, 0), side: THREE.DoubleSide }); lm.customProgramCacheKey = () => "lab4:mini"; lm.toneMapped = false;   /* lead 07:00: the lit lens stays a saturated red / green (tone mapping turned it cream-white) */   // DoubleSide: latheG domes face inward (the lens was culled away)
  const lens = new THREE.Mesh(latheG([[0.001, 0.02], [0.04, 0.015], [0.066, 0]], 24), lm); lens.rotation.x = Math.PI / 2; lens.position.set(0, h, 0.04); g.add(lens);   // no hood: from the lenses above the desks a hood hid the lit lens (r7 f620 / f660)
  const G = lin(LAB_PAL.lampGreen), R = lin(LAB_PAL.lampRed);
  return { object: g, set: (s: 0 | 1 | 2, k = 1) => { if (s === 0) { lm.emissive.setRGB(0.02, 0.06, 0.03); lm.color.setRGB(0.05, 0.12, 0.07); } else { lm.emissive.setRGB(...(s === 1 ? R : G)).multiplyScalar(0.95 * k); lm.color.setRGB(...(s === 1 ? R : G)).multiplyScalar(0.3); /* AUDIT R1 #21/#23: saturated, no blown-out bulb */ } } };
};
/** a small push button: a navy drum, a white ring, a red dome (local: base on y = 0) */
export const miniButton = () => {
  const g = new THREE.Group();
  g.add(mesh(latheG([[0.001, 0], [0.085, 0], [0.085, 0.04], [0.078, 0.048], [0.001, 0.048]], 32), pbr({ color: lin(LAB_PAL.buttonBase), rough: 0.3, peel: 0.4 }), true, "drum"));
  g.add(mesh(latheG([[0.05, 0.048], [0.072, 0.048], [0.07, 0.056], [0.05, 0.058]], 32), pbr({ color: lin(LAB_PAL.buttonRing), rough: 0.3, peel: 0.2 }), true, "ring"));
  const cm = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(LAB_PAL.button), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(0, 0, 0) }); cm.customProgramCacheKey = () => "lab4:minicap";
  const cap = new THREE.Mesh(latheG([[0.001, 0.048], [0.058, 0.048], [0.056, 0.062], [0.04, 0.074], [0.001, 0.078]], 32), cm); g.add(cap);
  g.add(contactBlob(0.24, 0.24, 0.5));
  return { object: g, set: (k: number) => { cap.position.y = -0.022 * k; cm.emissive.setRGB(1.0, 0.25, 0.1).multiplyScalar(1.6 * k); } };
};
/** the big red X billboard (pops); square to the lens */
const xMat = () => {
  const { cv, g: c } = canvas(256, 256); c.lineCap = "round";
  for (const [w, col] of [[76, "#3a0306"], [52, "#e8202a"]] as [number, string][]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(56, 56); c.lineTo(200, 200); c.moveTo(200, 56); c.lineTo(56, 200); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }); m.customProgramCacheKey = () => "lab4:x"; return m;
};
const popK = (t: number, t0: number) => { const q = (t - t0) / 0.2; return q <= 0 ? 0 : q < 1 ? 1.18 * Math.sin((q * Math.PI) / 2) : 1 + 0.18 * Math.exp(-(q - 1) * 3) * Math.cos((q - 1) * 7); };

export const buildHall = async (ctx: KitCtx, g: THREE.Group, ups: ((t: number, cam: THREE.Camera) => void)[]) => {
  const Rm = HALL.room;
  const hall = await room(ctx, { origin: [Rm.x0, 0, Rm.z0], w: Rm.w, d: Rm.d, h: Rm.h, thick: 0.25, seed: 43,
    floor: "vinyl_speckled", floorOpts: { tint: LAB4_PAL.floor, ...LAB4_SURF.floorOpts },
    wall: "plaster", wallTint: LAB4_PAL.wall, wallOpts: { ...LAB4_SURF.wallOpts },
    // V5 (lead): the window at 3.0 sat right behind the researcher at the switch (v07 washed out): two windows now
    windows: [6.6, 10.2].map((a) => ({ wall: "left" as const, at: a, w: 1.8, h: 1.8, sill: 0.9, curtains: false as const })),
    doors: [],
    radiator: false, bounce: LAB4_SURF.bounce * 0.5, trimColor: LAB4_SURF.trim, lens: { points: [[HX, 4], [HX, 1], [HX, -3]] } });
  g.add(hall.object); ups.push((t, cam) => hall.update?.(t, cam));
  { const fg = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), pbr({ color: [0.3, 0.55, 0.2], rough: 0.95, peel: 0 })); fg.rotation.x = -Math.PI / 2; fg.position.set(Rm.x0 - 100.3, -0.3, 0); g.add(fg); }
  // a coloured ceiling (sky blue, under the kit's white plaster): the wide looks down the hall show a lot of ceiling, and a
  // grey one broke the "beige / grey under 15 %" rule (r7 f290 / f380). Colour for LOOK to tune.
  const ceilM = pbr({ color: HALL_LOOK.ceiling, rough: 0.8, peel: 0.2 });
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(Rm.w, Rm.d), ceilM); c.rotation.x = Math.PI / 2; c.position.set(Rm.x0 + Rm.w / 2, Rm.h - 0.006, Rm.z0 + Rm.d / 2); c.name = "hallCeiling"; g.add(c); }
  // LOOK 18:35: under the red flood the sky-blue ceiling + blue floor read PINK-MAGENTA. During the hall's red states the
  // ceiling and the floor switch to a warm neutral (red light on neutral = the booth's alarm red); the floor is also
  // deeper than the booth's (the hall read flat and washed out: the people and the boards must pop)
  const ceilBase = ceilM.color.clone(), ceilRed = new THREE.Color(...HALL_RED.ceiling);   // LOOK's HALL RED v2 (deep alarm red, not salmon)
  const floorU = (hall.mats.floor as unknown as { userData?: { surf?: { U?: { sCol?: { value: THREE.Vector4 } } } } }).userData?.surf?.U?.sCol;
  const floorBase = floorU ? floorU.value.clone().multiplyScalar(0.62) : null, floorRed = new THREE.Vector4(...HALL_RED.floor, floorU ? floorU.value.w : 0.25);
  if (floorU && floorBase) { floorBase.w = floorU.value.w; floorU.value.copy(floorBase); }
  // ONE long light strip over the aisle (the light budget: 4 rect lights per set)
  for (const [x, z] of [[-2.4, 3.2], [2.4, 3.2], [-2.4, -1.4], [2.4, -1.4], [-2.4, -6.0], [2.4, -6.0]]) { const pm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.58, 1.5) })); pm.position.set(HX + x, Rm.h - 0.03, z); pm.name = "ceilPanel"; g.add(pm); }   // FIX R2 (v06): ceiling light panels
  const panels = [[0, -2.6]].map(([x, z]) => { const cp = ceilingPanel(ctx, [HX + x, Rm.h - 0.012, z], { lumens: HALL_LOOK.panelLumens * 0.7, kelvin: 4800, w: 0.5, d: 11 }); g.add(cp.object); if (cp.lamp) g.add(cp.lamp.object); return cp; });

  // ---------------------------------------------------------------- AUDIT R1 #20: DRESS THE HALL (it read bare and flat): a teal
  // wainscot round the walls, text-free posters, equipment racks with small amber / blue lamps (never green), yellow floor tape
  { const X0 = Rm.x0, X1 = Rm.x0 + Rm.w, Z0 = Rm.z0, Z1 = Rm.z0 + Rm.d, wc = lin("#0f6e6a"), cap = lin("#f4f1ea");
    for (const [a0, b0, a1, b1] of [[X0 + 0.01, Z0, X0 + 0.04, Z1], [X1 - 0.04, Z0, X1 - 0.01, Z1], [X0, Z0 + 0.01, X1, Z0 + 0.04]] as number[][]) {
      g.add(box(a0, 0, b0, a1, 1.0, b1, wc, "wainscot", 0.5)); g.add(box(a0 - 0.005, 1.0, b0 - 0.005, a1 + 0.005, 1.05, b1 + 0.005, cap, "wainscotCap", 0.4)); }
    const pcols = ["#e8202a", "#2fa7ff", "#ffd23a", "#f08a1f", "#c8263c", "#5b2fa8"];
    const poster = (k: number) => sign(0.9, 1.2, 256, (c, Wd, Ht) => { c.fillStyle = "#fbfaf6"; c.fillRect(0, 0, Wd, Ht); c.fillStyle = pcols[k % 6]; c.fillRect(14, 14, Wd - 28, Ht * 0.55);
      c.fillStyle = "#fbfaf6"; c.beginPath(); c.arc(Wd / 2, Ht * 0.32, Wd * 0.2, 0, Math.PI * 2); c.fill(); c.fillStyle = "#1e2c5c"; for (let j = 0; j < 4; j++) c.fillRect(24, Ht * 0.66 + j * 22, Wd * (0.8 - 0.12 * j) - 24, 10); });
    [[-7.2, 1], [-1.6, 1], [2.0, 1], [-5.0, -1], [-1.0, -1]].forEach(([z, sd], k) => { const pp = poster(k); pp.set("p"); pp.object.position.set(sd > 0 ? X0 + 0.05 : X1 - 0.05, 1.9, z); pp.object.rotation.y = sd > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(pp.object); });
    for (const z of [-7.8, -3.0]) { g.add(box(X1 - 0.5, 0, z - 0.32, X1 - 0.08, 1.85, z + 0.32, lin("#1e2c5c"), "rack", 0.4));
      for (let j = 0; j < 5; j++) { g.add(box(X1 - 0.52, 0.3 + j * 0.3, z - 0.26, X1 - 0.5, 0.52 + j * 0.3, z + 0.26, lin("#2b3f7a"), "rackUnit", 0.3));
        const lm2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(j % 2 ? "#ffb000" : "#2fa7ff"), emissive: new THREE.Color(j % 2 ? "#ffb000" : "#2fa7ff"), emissiveIntensity: 0.8 }); lm2.customProgramCacheKey = () => "lab4:rackLed";
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 6), lm2); led.position.set(X1 - 0.53, 0.45 + j * 0.3, z - 0.18); g.add(led);
        ups.push((t) => { lm2.emissiveIntensity = 0.2 + 0.8 * ((Math.floor(t * (1.3 + 0.37 * j) + j) % 2)); }); } }
    for (const xx of [HX - 0.4, HX + 0.4]) g.add(box(xx - 0.03, 0, Z0 + 0.5, xx + 0.03, 0.004, Z1 - 0.6, lin("#ffd23a"), "floorTape", 0.6)); }

  // ---------------------------------------------------------------- the stations
  const deskCols = [LAB_PAL.candy[1], LAB_PAL.candy[2], LAB_PAL.candy[3], LAB_PAL.candy[4], LAB_PAL.candy[5], LAB_PAL.candy[0]];
  const lamps: { r: number; i: number; s: ReturnType<typeof miniSignal> }[] = [], buttons: { r: number; i: number; b: ReturnType<typeof miniButton> }[] = [];
  const D = HALL.desk;
  // V5 (lead: rows of whole people, never a head cut by an edge): each column is its own group; the shots about ONE row
  // (v10 / v10b row 1, v13 / v14 row 2) hide the other column, so a diagonal lens from that row's outer side shows the
  // twelve as one clean row of separate heads (with both columns no lens separates the heads: lab/search2.mjs)
  const rowG = [new THREE.Group(), new THREE.Group()]; rowG.forEach((q, r) => { q.name = `hallRow${r + 1}`; g.add(q); });
  ups.push((t) => { rowG[0].visible = !(inRole(t, "wave") || inRole(t, "notOne") || inRole(t, "card")); rowG[1].visible = !(inRole(t, "five") || inRole(t, "bored") || inRole(t, "tapper")); });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) {
    const st = station(r, i), col = lin(deskCols[(i + r * 3) % deskCols.length]), g = new THREE.Group(); rowG[r].add(g);
    { const sg = g, rr = r, ii = i; ups.push((t) => { const o = layoutOff(rr, ii, t); sg.visible = o !== null; sg.position.set(...(o ?? ([0, 0, 0] as V3))); }); }
    g.add(box(st.x - D.w / 2, D.h - 0.03, st.z - D.d / 2, st.x + D.w / 2, D.h, st.z + D.d / 2, col, "hallDeskTop"));
    g.add(box(st.x - D.w / 2 + 0.02, 0.2, st.z + D.d / 2 - 0.03, st.x + D.w / 2 - 0.02, D.h - 0.03, st.z + D.d / 2 - 0.01, col, "hallDeskFront"));
    for (const sx of [-1, 1]) g.add(box(st.x + sx * (D.w / 2 - 0.04) - 0.02, 0, st.z - D.d / 2 + 0.03, st.x + sx * (D.w / 2 - 0.04) + 0.02, D.h - 0.03, st.z - D.d / 2 + 0.07, [0.85, 0.85, 0.86], "hallDeskLeg"));
    const b = miniButton(); b.object.position.set(st.button[0], D.h, st.button[2]); g.add(b.object); buttons.push({ r, i, b });
    const s = miniSignal(1.95); s.object.position.set(st.lamp[0], 0, st.lamp[2] - 0.036); g.add(s.object); lamps.push({ r, i, s });
    if (r === 0 && i === HALL.bored) { const so = s.object, a = st.lamp, b = boredLamp(st);   // v15 / v16: HIS red lamp at his eye level, beside his head (in his eyeline)
      ups.push((t) => { const on = inRole(t, "bored") || inRole(t, "tapper"); so.position.set(on ? b[0] : a[0], 0, (on ? b[2] : a[2]) - 0.036); so.scale.set(1, on ? b[1] / 1.95 : 1, 1); }); }
    if (false) { const so = s.object, sx = st.lamp[0], sz = st.lamp[2] - 0.036, fx = st.x + 0.12, fz = st.z + 0.8;
      ups.push((t) => { const fr2 = inRole(t, "wave") || inRole(t, "notOne"); so.position.set(fr2 ? fx : sx, 0, fr2 ? fz : sz); so.scale.set(1, fr2 ? 1.42 : 1, 1); }); }   // AUDIT R1 #8: the lens at ~1.6 m, 0.8 m ahead
    try { g.add((await prop(ctx, "stool_wood", { pos: [st.seat[0] + 0.02, 0, st.seat[2] - 0.05], rotY: 0.2 * i, scale: 0.47 / 0.437 })).object); } catch { /* optional */ }
  }
  ups.push((t) => { const w = W(), red = t >= w.red && t < endOf("redRoom", "watched", "five"); for (const L of lamps) L.s.set(hallLampAt(L.r, L.i, t), red ? 0.8 + 0.2 * Math.sin(t * 3.1 + L.i * 1.3 + L.r * 0.7) : 1); });

  // ---------------------------------------------------------------- the back wall: 1994, the counter, the clock; the score stands
  const b94 = sign(3.6, 1.45, 512, (c, Wd, Ht) => {
    c.fillStyle = "#0f5a44"; c.fillRect(0, 0, Wd, Ht); c.strokeStyle = "#f4f1ea"; c.lineWidth = 18; c.strokeRect(20, 20, Wd - 40, Ht - 40);
    c.fillStyle = "#ffd23a"; c.font = font(330); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("1994", Wd / 2, Ht / 2 + 22);
  }); b94.set("1994"); b94.object.position.set(...HALL.board1994); g.add(b94.object);
  const b94f = box(HALL.board1994[0] - 1.9, HALL.board1994[1] - 0.8, -10.4, HALL.board1994[0] + 1.9, HALL.board1994[1] + 0.8, -10.39, lin(LAB_PAL.boardFrame), "b94frame"); g.add(b94f);
  ups.push((t) => { const v = !inRole(t, "wave") && !inRole(t, "five") && !inRole(t, "watched") && !inRole(t, "bored") && !inRole(t, "tapper"); b94.object.visible = v; b94f.visible = v; });   // v10b: its own big 5 OF 12 board replaces the wall boards   // V5: never a cut board: the wave lens would cut it at the left edge
  const ctr = sign(1.9, 0.75, 256, (c, Wd, Ht, k) => {
    c.fillStyle = "#14161c"; c.fillRect(0, 0, Wd, Ht); c.font = font(200); c.textAlign = "right"; c.textBaseline = "middle";   // AUDIT R1 #6: no ghost "888"
    c.fillStyle = k === "101" ? "#ff2a1f" : "#ff9a1f"; c.fillText(k, Wd - 40, Ht / 2 + 10);
  });
  { const lm3 = Array.from({ length: 9 }, (_, j) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffb000"), emissive: new THREE.Color("#ffb000"), emissiveIntensity: 0.6 }); m.customProgramCacheKey = () => "lab4:ctrLed"; const q = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), m); q.position.set(HALL.counter[0] - 0.8 + j * 0.2, HALL.counter[1] - 0.75, HALL.counter[2] + 0.04); g.add(q); return m; });
    ups.push((t) => lm3.forEach((m, j) => { m.emissiveIntensity = (Math.floor(t * 8) + j) % 3 === 0 ? 1.6 : 0.25; })); }   // FIX R2 (v08): a chaser of small amber lamps under the counter
  ctr.object.position.set(...HALL.counter); g.add(ctr.object); (ctr.object.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
  const ctrF = box(HALL.counter[0] - 1.04, HALL.counter[1] - 0.47, -10.4, HALL.counter[0] + 1.04, HALL.counter[1] + 0.47, -10.38, lin(LAB_PAL.candy[4]), "ctrFrame"); g.add(ctrF);
  ups.push((t) => { const n = counterAt(t), ca = startOf("counter"), w = W(), tc = n === 100 ? Math.max(w.hundred, ca + 0.8) : n === 99 ? ca + 0.4 : n === 98 ? ca : NaN, q = (t - tc) / 0.12;
    ctr.object.scale.y = Number.isFinite(q) && q >= 0 && q < 1 ? Math.max(0.08, Math.abs(Math.cos(Math.PI * q))) : 1;   /* FIX R2: a flip-card turn on each new number */ ctr.set(String(n)); (ctr.object.material as THREE.MeshStandardMaterial).emissiveIntensity = (t >= W().red && Math.floor(t * 2.4) % 2 ? 0.45 : 1.4) * (1 + 0.06 * Math.sin(t * 41));   /* GATES R2: a digit flicker: never a frozen frame */ });   // lead 07:00: the 101 blinks
  const clk = await wallClock(ctx, { pos: HALL.clock, yaw: Math.PI / 2, radius: 0.3, rim: LAB_PAL.clockRim, time0: 10 * 3600 + 5 * 60 }); g.add(clk.object); if (clk.update) ups.push(clk.update);
  { const c2 = await wallClock(ctx, { pos: HALL.clock2, yaw: Math.PI / 2, radius: 0.26, rim: LAB_PAL.clockRim, time0: 10 * 3600 + 5 * 60 }); g.add(c2.object); if (c2.update) ups.push(c2.update); }   // V5: the clock over the switch (v07)
  const scores = HALL.score.map((p, r) => {
    const sg = sign(1.5, 0.75, 256, (c, Wd, Ht, k) => {
      c.fillStyle = "#fbfaf6"; c.fillRect(0, 0, Wd, Ht); c.strokeStyle = "#1e2c5c"; c.lineWidth = 14; c.strokeRect(7, 7, Wd - 14, Ht - 14);
      c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = k.startsWith("5") ? "#e8202a" : k.startsWith("0") ? "#13a052" : "#9aa3b5"; c.font = font(118); c.fillText(k, Wd / 2, Ht / 2 + 6);
    });
    sg.object.position.set(p[0], p[1], p[2]); g.add(sg.object);
    return { sg, r };
  });
  ups.push((t) => { const w = W(); const on = t >= (Number.isFinite(w.anyway) ? w.anyway : w.five); scores[0].sg.set(t >= w.not ? "0 OF 12" : on ? "5 OF 12" : " "); });   // AUDIT R1 #6/#32: blank (hidden) until "anyway": the faint "?" read as a 7 // the board flips on "anyway"

  // ---------------------------------------------------------------- THE BIG SWITCH (a knife switch on a red cabinet): flips on "trap"
  const SW = HALL.switch, lever = new THREE.Group(), swG = new THREE.Group(); swG.name = "bigSwitch"; g.add(swG);
  // the switch exists only where it plays (the wide, the flip, the counter): elsewhere it stood in the foreground of other lenses
  ups.push((t) => { swG.visible = inRole(t, "wide1994") || inRole(t, "switch") || inRole(t, "counter"); });
  // a waist-high red cabinet; the lever swings SIDEWAYS in the lens's plane (from leaning left to leaning right, toward him)
  // V5 (lead: "set a trap like this": the switch must be BIG, bright, readable): a chest-high red cabinet with a yellow and
  // black hazard panel facing the lens, a fat yellow handle, a red lamp on top that lights on "trap"
  swG.add(box(SW[0] - 0.3, 0, SW[2] - 0.26, SW[0] + 0.3, 0.7, SW[2] + 0.26, lin(LAB_PAL.candy[0]), "switchCab"));   // r24: at 0.86 the handle crossed his face
  swG.add(box(SW[0] - 0.12, 0.7, SW[2] - 0.22, SW[0] + 0.12, 0.76, SW[2] + 0.22, [0.1, 0.1, 0.12], "switchBase"));
  { const hz = sign(0.46, 0.62, 256, (c, Wd, Ht) => { c.fillStyle = "#ffd23a"; c.fillRect(0, 0, Wd, Ht); c.fillStyle = "#14161c"; for (let k = -6; k < 12; k++) { c.beginPath(); c.moveTo(k * 40, 0); c.lineTo(k * 40 + 20, 0); c.lineTo(k * 40 + 20 + Ht, Ht); c.lineTo(k * 40 + Ht, Ht); c.fill(); } c.fillStyle = "#e8202a"; c.beginPath(); c.arc(Wd / 2, Ht / 2, Wd * 0.22, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#fbfaf6"; c.lineWidth = 10; c.stroke(); });
    hz.set("hz"); hz.object.position.set(SW[0] + 0.305, 0.36, SW[2]); hz.object.rotation.y = Math.PI / 2; swG.add(hz.object); }
  const trapLampM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.5, 0.05, 0.04), roughness: 0.2, emissive: new THREE.Color(0, 0, 0) }); trapLampM.customProgramCacheKey = () => "lab4:trapLamp";
  { const tl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), trapLampM); tl.position.set(SW[0], 0.76, SW[2] - 0.17); swG.add(tl); }
  ups.push((t) => { const w = W(), on = Number.isFinite(w.trap) && t >= w.trap; trapLampM.emissive.setRGB(1.0, 0.08, 0.04).multiplyScalar(on ? 2.4 + 0.6 * Math.sin(t * 12) : 0); });
  lever.position.set(SW[0], 0.78, SW[2]); swG.add(lever);   // the handle stays at his waist / chest (0.9-1.0 m), well under his chin
  const chrome = pbr({ color: [0.85, 0.85, 0.84], rough: 0.15, metal: 1, peel: 0 });
  for (const s of [-1, 1]) lever.add(mesh(rboxG(-0.012, 0, s * 0.12 - 0.012, 0.012, 0.34, s * 0.12 + 0.012, 0.004), chrome, true, "blade"));
  lever.add(mesh(at(cylG(0.05, 0.05, 0.38, 16), 0, 0.36, 0, Math.PI / 2, 0, 0), pbr({ color: lin("#ffd23a"), rough: 0.3, peel: 0.2, clearcoat: 0.6 }), true, "handle"));
  ups.push((t) => { const w = W(), q = Math.max(0, Math.min(1, (t - (w.trap - 0.05)) / 0.1)); lever.rotation.x = -0.6 + (Number.isFinite(w.trap) ? q : 0) * 1.2; });   // V5: swings in the y-z plane (left-right in the v07 lens)
  const handleAt = (t: number): V3 => { const a = lever.rotation.x; void t; return [SW[0], 0.78 + 0.36 * Math.cos(a), SW[2] + 0.36 * Math.sin(a)]; };
  // V5 (lead: v07 was the palest frame): a big teal pinboard with coloured pictogram sheets on the wall behind him
  { const pb = sign(2.6, 1.7, 512, (c, Wd, Ht) => { c.fillStyle = "#0f7a6c"; c.fillRect(0, 0, Wd, Ht); c.strokeStyle = "#f4f1ea"; c.lineWidth = 16; c.strokeRect(8, 8, Wd - 16, Ht - 16);
      const cols = ["#ffd23a", "#e8202a", "#2fa7ff", "#f08a1f", "#13a052", "#c8263c"]; for (let k = 0; k < 6; k++) { const x = 60 + (k % 3) * 250, y = 50 + Math.floor(k / 3) * 220; c.fillStyle = "#fbfaf6"; c.fillRect(x, y, 200, 170); c.fillStyle = cols[k]; c.beginPath(); c.arc(x + 100, y + 85, 55, 0, Math.PI * 2); c.fill(); } });
    pb.set("pb"); pb.object.position.set(HX - 4.585, 1.65, 3.2); pb.object.rotation.y = Math.PI / 2; g.add(pb.object); ups.push((t) => { pb.object.visible = inRole(t, "switch"); }); }

  // ---------------------------------------------------------------- the card with the pointing hand (the extra rule), held up by the researcher
  const card = sign(0.84, 0.63, 256, (c, Wd, Ht) => {
    c.fillStyle = "#fbfaf6"; c.fillRect(0, 0, Wd, Ht); c.strokeStyle = "#13a052"; c.lineWidth = 16; c.strokeRect(8, 8, Wd - 16, Ht - 16);
    drawPictogram(c, "finger", Wd * 0.14, Ht * 0.06, (Ht * 0.86) / 512, "#1e2c5c", "#fbfaf6");
  }); card.set("card"); g.add(card.object);
  // the card stands on its own little easel post beside him (CAST's "holding up" put his hand at his mouth): he points at it, side-on
  const cardAt = (): V3 => { const p = HALL.researcherAtRow2; return [p[0] - 0.3, 1.32, p[2] + 0.25]; };   // CAST 06:10: he HOLDS the card up in front of him (hands on its edges), no pole
  const easel = mesh(at(cylG(0.018, 0.018, 1.1, 10), 0, 0.55, 0), pbr({ color: lin(LAB_PAL.boardFrame), rough: 0.4, peel: 0.2 }), true, "cardPost"); g.add(easel);
  ups.push((t) => { const on = inRole(t, "card"); card.object.visible = on; easel.visible = false;   /* CAST 05:50: he holds the card up in his hand: no pole */ if (on) { const c = cardAt(); card.object.position.set(...c); card.object.rotation.y = 0.15; easel.position.set(c[0], 0, c[2] - 0.02); } });

  // ---------------------------------------------------------------- the red flood of the hall + the five X's
  const redHall = (t: number) => { const w = W(); return (t >= w.red && t < endOf("redRoom", "watched", "five")) || inRole(t, "notOne") || inRole(t, "bored") || inRole(t, "tapper"); };
  // TWO red lights over the aisle (front + back half): the whole hall turns red, not only the ceiling
  const washes = [[HX, HALL_LOOK.washY, 2.0], [HX, HALL_LOOK.washY, -5.5]].map((pos) => signalWash(ctx, { pos: pos as V3, kind: "point", range: 12, lumens: 26000,
    colorAt: (t) => (redHall(t) ? LAB_PAL.lampRed : null),
    // LOOK's HALL RED v2: with the white light dimmed the washes run at HALL_RED.washGain; LIFE (V5): an alarm pulse (~0.8 / s)
    gainAt: (t) => (inRole(t, "bored") || inRole(t, "tapper") ? 0.35 : HALL_RED.washGain) * (1 + 0.28 * Math.sin(t * 5.2)) }));
  for (const wash of washes) g.add(wash.object);
  const dim = redRoomDim(ctx);   // LOOK: the IBL fill + the sun drop while the hall is red (put back after)
  ups.push((t, cam) => {
    for (const wash of washes) wash.update?.(t, cam);
    const red = redHall(t) && !inRole(t, "bored") && !inRole(t, "tapper");
    dim(red ? 1 : 0);
    for (const p of panels) { p.lamp?.set(red ? HALL_RED.panelK : 1); p.object.visible = !inRole(t, "wide1994"); }   // FIX R2 (v06): the long strip read as a white trapezoid on a blue void
    ceilM.color.copy(red ? ceilRed : ceilBase);
    if (floorU && floorBase) floorU.value.copy(red ? floorRed : floorBase);
  });
  const xm = xMat(), xs = HALL.five.map((i, k) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), xm); q.renderOrder = 9; g.add(q); return { q, i, k }; });
  const tmpQ = new THREE.Quaternion();
  ups.push((t, cam) => { const w = W(), end = endOf("watched", "five"); for (const X of xs) { void w; const k = t < end ? popK(t, fiveLand(X.k)) : 0; X.q.visible = k > 0.001; if (!X.q.visible) continue;
    const st = station(0, X.i), o = layoutOff(0, X.i, t) ?? ([0, 0, 0] as V3); X.q.position.set(st.seat[0] + o[0], 1.82, st.seat[2] + o[2]);   /* V5 (director: the X's sat ON faces): each X ABOVE its own head, drawn on top */ cam.getWorldQuaternion(tmpQ); X.q.quaternion.copy(tmpQ); X.q.scale.setScalar(0.52 * k); } });
  // V5 (director: "5 OF 12" was tiny / not in the v10b lens): a score stand beside row 1, in the v10b lens only, readable in a quarter second
  { const sb = sign(1.4, 0.66, 256, (c, Wd, Ht, k) => { c.fillStyle = "#fbfaf6"; c.fillRect(0, 0, Wd, Ht); c.strokeStyle = "#1e2c5c"; c.lineWidth = 14; c.strokeRect(7, 7, Wd - 14, Ht - 14); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = /^[1-9]/.test(k) ? "#e8202a" : k.startsWith("0") ? "#13a052" : "#9aa3b5"; c.font = font(112); c.fillText(k, Wd / 2, Ht / 2 + 6); });
    // the stand board: v10b "5 OF 12" above the middle of the five, v14 "0 OF 12" above the far end of row 2's six; turned to each side lens
    const S5: V3 = [FIVE_ROW.x0, 2.75, FIVE_ROW.z - 1.1], S0: V3 = [HX - 0.4, 2.45, -7.2]; sb.object.position.set(...S5); g.add(sb.object);
    const post = mesh(at(cylG(0.02, 0.02, S5[1] - 0.22, 10), S5[0], (S5[1] - 0.22) / 2, S5[2] - 0.02), pbr({ color: lin(LAB_PAL.boardFrame), rough: 0.4, peel: 0.2 }), true, "score5Post"); g.add(post);
    const CAM = new THREE.Vector3(); ups.push((_t, cam) => { cam.getWorldPosition(CAM); });
    ups.push((t) => { sb.object.scale.setScalar(1); const five = inRole(t, "five"), not = inRole(t, "notOne"), on = five || not, w = W(); sb.object.visible = on; post.visible = on; const row2 = inRole(t, "wave") || not || inRole(t, "card"), scoreOn = t >= (Number.isFinite(w.anyway) ? w.anyway : w.five); ctr.object.visible = !five && !row2; ctrF.visible = !five && !row2; for (const S of scores) S.sg.object.visible = !five && !row2 && scoreOn;   /* AUDIT R1: the score board is hidden (not a blank white panel) until "anyway"; v12 drops the wall boards (cut by its edge) */   /* the back-wall boards fell across the edges of the side lenses (r25) */
      if (five) { sb.object.position.set(...S5); sb.object.rotation.y = 1.04; post.position.set(S5[0], (S5[1] - 0.22) / 2, S5[2] - 0.02); const nX = Number.isFinite(w.five) ? [0, 1, 2, 3, 4].filter((k) => t >= fiveLand(k)).length : 0; sb.set(nX > 0 ? `${nX} OF 12` : " "); sb.object.visible = nX > 0; post.visible = nX > 0; }   /* r2: no blank white panel before the first press */   /* FIX R1: blank, then counting 1..5 with the X pops (it showed "7 OF 12") */
      else if (not) { sb.object.position.set(...S0); sb.object.rotation.y = Math.atan2(CAM.x - S0[0], CAM.z - S0[2]); sb.object.scale.setScalar(1.8); post.position.set(S0[0], (S0[1] - 0.22) / 2, S0[2]); sb.set("0 OF 12"); } }); }

  // ---------------------------------------------------------------- PEOPLE: 24 volunteers + the researcher (CAST's cards; staging cues on words)
  try {
    const [{ castCardOf }, MV] = await Promise.all([import("../../cast/member"), import("../../cast/moves")]);
    const NOW = { word: () => NaN, wordEnd: () => NaN, shot: () => null, shotEnd: (f: number) => f + 600 };
    const w = W(), F = (s: number) => (Number.isFinite(s) ? fr(s) : 99999), END = 99999;
    const WHO = ["lab_a", "lab_b", "lab_c", "lab_d"] as const;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) {
      const st = station(r, i), who = WHO[(i * 3 + r) % 4], five = r === 0 && HALL.five.includes(i), bored = r === 0 && i === HALL.bored;
      const bb: Beat[] = [];
      const ready = [{ m: "hover", at: 0, until: END }, { m: "face", at: 0, until: END, expr: (i + r) % 3 ? "focusB" : "blank", still: true },
        // LIFE (V5): every volunteer breathes, shifts and tilts while waiting (each card its own phase); smaller in the red freeze
        { m: "alive", at: 0, until: F(w.red), amp: 0.7 }, { m: "alive", at: F(w.red) + 8, until: r === 1 ? F(w.point) : END, amp: 0.35 }];
      if (r === 1) bb.push({ m: "alive", at: F(w.point), until: END, amp: 0.8 } as Beat, { m: "face", at: F(w.red), until: F(w.point), expr: "stare", browUp: 4, still: true } as Beat);   // lead 07:00: v13 more life; row 2 stares in the red (v10)
      bb.push(...(ready as Beat[]));
      // the counter: everyone taps on 98, 99, 100
      for (const c of [w.hundred - 0.7, w.hundred - 0.35, w.hundred]) bb.push({ m: "tap", at: F(c) } as Beat);
      if (r === 0) {
        bb.push({ m: "face", at: F(w.red), until: END, expr: "stare", browUp: 4, still: true } as Beat);
        if (five) { const f0 = F(w.five) + FIVE_PRESS.lead + FIVE_PRESS.gap * HALL.five.indexOf(i); bb.push({ m: "down", at: f0, until: END, travel: FIVE_PRESS.travel } as Beat, { m: "face", at: f0 + FIVE_PRESS.travel, until: END, expr: "stare", browUp: 9, mouth: "O", still: true } as Beat); }
        if (bored) { // the bored tapper: blank stare at the red lamp, the hand taps by itself on "hand", again, then the face catches up on "brain"
          const b0 = startOf("bored", "tapper");
          bb.push({ m: "face", at: F(b0), until: END, expr: "blank", still: true } as Beat, { m: "tap", at: F(w.hand) } as Beat, { m: "tap", at: F(w.hand) + 12 } as Beat,
            { m: "face", at: F(w.brain), until: END, expr: "stare", browUp: 8, mouth: "O", still: true } as Beat);
        }
      } else {
        // the wave: one after another they point at their lamp (side-on, the left arm) and call it; held through "Not one"
        const p0 = F(w.point) + 3 * i;
        // each point holds 20 f and drops (the wave travels front to back); on "Not" all twelve point at the red together
        const sayF = F(tryS("say#1", w.point + 1.0)) + 3 * i;
        bb.push({ m: "point", at: p0, until: F(w.not), still: true, left: true, noGaze: true } as Beat, { m: "face", at: p0, until: sayF, expr: "focusB", still: true } as Beat, { m: "face", at: sayF, until: F(w.not), expr: "brightO", mouth: "O", still: true } as Beat,   // FIX R2: arms held out; mouths open in a wave on "say it"
          { m: "point", at: F(w.not), until: END, still: true, left: true, noGaze: true } as Beat, { m: "face", at: F(w.not), until: END, expr: "stare", browUp: 3, still: true } as Beat);   // mouths shut under the narration
      }
      const tt = MV.timeBeats(bb.map((b) => ({ ...b, who })) as Beat[], NOW);
      const points = (t: number) => r === 1 && t >= w.point;
      const lampAim = (t: number): V3 => (r === 0 && i === HALL.bored && (inRole(t, "bored") || inRole(t, "tapper")) ? boredLamp(st) : st.lamp);   // FIX R2: one placement (his own lamp at eye level in v15 / v16)   // AUDIT R1 #8: forward and UP to the lamp on its post
      try {
        const off = (t: number) => layoutOff(r, i, t) ?? ([0, 0, 0] as V3);
        const c = await castCardOf(ctx, who as never, { pos: (t) => addV(st.seat, off(t)), yaw: () => 0, seated: 0.47, aim: (t) => addV(points(t) ? lampAim(t) : st.button, off(t)), look: (t) => addV((t < w.red ? Math.sin(t * (0.8 + 0.13 * (i % 5)) + i * 1.9 + r) > 0.55 : inRole(t, "watched") && Math.sin(t * (2.3 + 0.31 * (i % 4)) + i * 2.7 + r * 1.3) > 0.8) ? st.button
          : r === 1 && i > 0 && inRole(t, "wave") && t < (F(w.point) + 3 * i) / 30 ? [lampAim(t)[0] - ROW_SHOTS.r2.dx, lampAim(t)[1], lampAim(t)[2]] : lampAim(t), off(t))   /* lead 07:00: v10 eyes dart to the button (the temptation); v13 each turns to the neighbour who points first */   /* FIX R1 life: while waiting, each glances down at the button now and then */, name: `hall_${r}_${i}` }, (e) => MV.actBeats(who as never, tt, e));
        rowG[r].add(c.object); if (c.update) ups.push(c.update);
        { const co = c.object; ups.push((t) => { co.visible = layoutOff(r, i, t) !== null; }); }
      } catch (err) { console.warn("lab hall: card", who, err); }
    }
    // the researcher: at the switch (flips it on "trap", grinning), later at the end of row 2 holding up the card
    const atRow2 = (t: number) => inRole(t, "card"), atSwitch = (t: number) => inRole(t, "switch") || inRole(t, "wide1994");
    const rb: Beat[] = [
      { who: "researcher_v4", m: "point", at: F(w.trap) - 6, until: F(w.trap) + 9, reach: true, still: true } as Beat,   // 15 f: the flip itself (arm-out share)
      { who: "researcher_v4", m: "face", at: 0, until: END, expr: "brightGrin", still: true } as Beat,
      { who: "researcher_v4", m: "hold", at: F(startOf("card")), until: F(spanOf("card")[1]) } as Beat,   // CAST 06:10: both hands on the card edges (restL / restR)
    ];
    const rt = MV.timeBeats(rb, NOW);
    const cardHand = (sd: number) => (t: number): V3 | null => (inRole(t, "card") ? [cardAt()[0] + sd * 0.4, cardAt()[1] - 0.06, cardAt()[2] + 0.02] : null);
    const R = await castCardOf(ctx, "researcher_v4", { restL: cardHand(1), restR: cardHand(-1), pos: (t) => (atRow2(t) ? HALL.researcherAtRow2 : atSwitch(t) ? HALL.researcherAtSwitch : ([HX + 3.9, 0, -8.8] as V3)), yaw: (t) => (atRow2(t) ? -1.15 : atSwitch(t) ? Math.PI / 2 : -Math.PI / 2),
      aim: (t) => (inRole(t, "card") ? [cardAt()[0] + 0.3, cardAt()[1] - 0.05, cardAt()[2]] : handleAt(t)), look: (t) => (atRow2(t) ? [HX + 1.1, 1.2, -1.0] : [HX + 1.1, 1.3, -1.0]), name: "hall_researcher" }, (e) => MV.actBeats("researcher_v4", rt, e));
    g.add(R.object); if (R.update) ups.push(R.update);
  } catch (e) { console.warn("lab hall: CAST not available", e); }
  // the buttons sink with the presses (the five + the bored tapper; the counter taps)
  ups.push((t) => { const w = W(); for (const B of buttons) { let k = 0;
    if (B.r === 0 && HALL.five.includes(B.i) && t < endOf("watched", "five")) k = Math.max(0, Math.min(1, ((t - fiveStart(HALL.five.indexOf(B.i))) * 30) / FIVE_PRESS.travel));   // lead 07:00: one after another
    for (const c of [w.hundred - 0.7, w.hundred - 0.35, w.hundred, w.hand, w.hand + 0.4]) if (t >= c + 0.03 && t < c + 0.16 && (c < w.red || (B.r === 0 && B.i === HALL.bored))) k = 1;
    B.b.set(k); } });
};

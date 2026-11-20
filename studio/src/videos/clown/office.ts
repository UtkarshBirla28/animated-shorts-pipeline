// HYMAN'S OFFICE (owner LOOK, v2): the warm interior of shots S2-S5 ("Psychologist Ira Hyman needed a distraction ...",
// the door, the student, the unicycle, the clown suit). One corner of a campus office, 1 km south of the square
// (plan.ts OFFICE: every anchor, the key light, the door's yaw function, suggested lenses).
//  - the WEST wall: a tall sash window; the afternoon sun (plan.ts OFFICE_KEY) rakes in through it, so the walls cast real
//    shadows and the only sunlight in the room is the window's patch (window-bar shadows, leaf dapples from a branch
//    outside that sways); three soft warm light SHEETS (the shafts) and dust motes hang in its path; a view of sunlit,
//    backlit trees and a lawn outside; sage curtains, a radiator, a plant on the sill
//  - the BACK wall: a full bookshelf (the sun reaches its lower shelves), a brain poster, the WHITEBOARD ("DISTRACTION?"
//    + a juggling bear and a marching band, both crossed out), a ticking wall clock, the DOOR (honey wood, frosted
//    "PSYCHOLOGY" glass) that swings open into the room, a coat rack; a cool corridor behind the door
//  - the room: slate-blue wainscot under warm cream plaster, honey floorboards, a rug, the desk (books, a steaming mug,
//    papers, a brass lamp, a pen cup, an apple), a filing cabinet, posters, a waste bin with crumpled ideas round it
// Pose is a pure function of (shot, frame): the door (officeDoorYaw), curtains, leaves (inside and out), the shafts'
// breathing, motes, the mug's steam, the clock, a bird outside. Plain words only, no logos, no real names or marks.
import * as THREE from "three";
import type { SetCtx } from "./ctx";
import type { Kit } from "./build";
import { boxGeo, prop } from "./build";
import type { Lighting, SetModule } from "./sets";
import { OFFICE, officeDoorYaw, OFFICE_KEY, type V3 } from "./plan";
import { Batch, C, TM, faceMesh, buildInk, M, NOINK, TAU, hash, clamp01, sm, V, contact, tx, G, R, rgba, shadeHex, jit, speck, rrect, font, Motes,
  glareTex, wispTex, cylY, vs, vph, VF, P3, setVF } from "./setkit";
import { rep, planksHD, birdTex, grassHD, parkWood } from "./paint";
import { twoTone } from "./shade";
import { Foliage } from "./foliage";
import * as SP from "./square_paint";

export { OFFICE, officeDoorYaw };
const O = OFFICE.base;
const L0 = (p: V3): V3 => [p[0] - O[0], p[1] - O[1], p[2] - O[2]];
const wp = (x: number, y: number, z: number): P3 => [O[0] + x, O[1] + y, O[2] + z];
// room (local metres): the inner faces of the walls
const X0 = -3.0, X1 = 3.5, Z0 = -2.7, Z1 = 3.4, H = 2.95, WT = 0.22;
const WZ0 = -2.05, WZ1 = -0.05, WY0 = 0.8, WY1 = 2.55;          // the window opening (west wall)
const DX0 = 1.8, DX1 = 2.75, DH = 2.12;                           // the door opening (back wall)
const CZ = -4.9;                                                  // the corridor's far wall
const MARK = '"Segoe Print", "Ink Free", "Comic Sans MS", cursive';
const BOLD = '"Arial Black", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// ======================================================================================================= painters
const blot = (g: G, x: number, y: number, rad: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};
const wrapB = (S: number, x: number, y: number, rad: number, col: string, a: number) => {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) if (x + ox > -rad && x + ox < S + rad && y + oy > -rad && y + oy < S + rad) blot(g0, x + ox, y + oy, rad, col, a);
};
let g0: G;
/** warm cream plaster (1024 = 2 m): soft trowel clouds, fine speck, a few faint vertical brush marks */
const plasterTex = (key: string, base: string) => tx("ofPlaster_" + key, 1024, 1024, (g, r) => {
  g0 = g; g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) { const d = r() < 0.5; wrapB(1024, r() * 1024, r() * 1024, 60 + 160 * r(), d ? shadeHex(base, -0.22) : "#fff8ea", d ? 0.07 : 0.09); }
  for (let i = 0; i < 160; i++) { const x = r() * 1024, y = r() * 1024; g.strokeStyle = rgba(shadeHex(base, -0.2), 0.05); g.lineWidth = 6 + 10 * r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 * (r() - 0.5), y + 60 + 90 * r()); g.stroke(); }
  speck(g, r, 1024, 1024, 5000, [shadeHex(base, -0.3), "#fffaf0"], 1, 2.2, 0.14);
});
/** slate-blue painted panelling, 1024 = 1 m x 1 m (one raised panel per metre; the box is 0.8 m tall: canvas rows
 *  205..1024 show), cream-white beading, soft scuffs at the foot */
const wainscotTex = () => tx("ofWainscot2", 1024, 1024, (g, r) => {
  const f = "#4b5f77";   /* p3 (audit p2 minor 4): darker, so Hyman's tweed separates */
  g.fillStyle = shadeHex(f, -0.04); g.fillRect(0, 0, 1024, 1024);
  const x = 90, y = 300, w = 844, h = 640, b = 34;
  g.fillStyle = shadeHex(f, 0.1); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - b, y + b); g.lineTo(x + b, y + b); g.lineTo(x + b, y + h - b); g.lineTo(x, y + h); g.closePath(); g.fill();
  g.fillStyle = shadeHex(f, -0.12); g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.lineTo(x + b, y + h - b); g.lineTo(x + w - b, y + h - b); g.lineTo(x + w - b, y + b); g.closePath(); g.fill();
  g.fillStyle = f; g.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
  g.strokeStyle = "rgba(232,226,210,0.55)"; g.lineWidth = 6; g.strokeRect(x - 10, y - 10, w + 20, h + 20);
  g.strokeStyle = "rgba(24,30,46,0.45)"; g.lineWidth = 3; g.strokeRect(x - 4, y - 4, w + 8, h + 8);
  for (let i = 0; i < 26; i++) blot(g, r() * 1024, 900 + 120 * r(), 30 + 50 * r(), "#2a2a36", 0.08);
  speck(g, r, 1024, 1024, 3000, ["#3a4a5e", "#9aaabc"], 1, 2, 0.14);
});
/** the rug (1024 x 768 = 3.2 x 2.4 m): an oxblood field, a navy border with an ochre line, a soft medallion, wear */
const rugTex = () => tx("ofRug", 1024, 768, (g, r) => {
  g.fillStyle = "#2c3a5c"; g.fillRect(0, 0, 1024, 768);
  g.fillStyle = "#c79a52"; g.fillRect(38, 38, 948, 692);
  g.fillStyle = "#86353a"; g.fillRect(52, 52, 920, 664);
  for (let k = 0; k < 40; k++) { const x = 60 + k * 23.5; g.fillStyle = k % 2 ? "#d8b878" : "#3a4c74"; g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 11, 8); g.lineTo(x + 22, 20); g.lineTo(x + 11, 32); g.fill(); g.beginPath(); g.moveTo(x, 748); g.lineTo(x + 11, 736); g.lineTo(x + 22, 748); g.lineTo(x + 11, 760); g.fill(); }
  g.save(); g.translate(512, 384); for (let k = 0; k < 3; k++) { g.fillStyle = ["#2c3a5c", "#c79a52", "#9a4244"][k]; g.beginPath(); g.ellipse(0, 0, 240 - 60 * k, 150 - 38 * k, 0, 0, TAU); g.fill(); }
  for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); g.fillStyle = "#d8b878"; g.beginPath(); g.ellipse(170, 0, 26, 12, 0, 0, TAU); g.fill(); } g.restore();
  for (const [x, y] of [[150, 150], [874, 150], [150, 618], [874, 618]]) { g.fillStyle = "#c79a52"; g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 40, y); g.lineTo(x, y + 40); g.lineTo(x - 40, y); g.fill(); }
  for (let i = 0; i < 30; i++) blot(g, 200 + 600 * r(), 150 + 450 * r(), 40 + 80 * r(), "#f0d8c0", 0.07);
  speck(g, r, 1024, 768, 9000, ["#5a2028", "#e8c890", "#1c2440"], 1, 2.4, 0.18);
});
/** a book spine / cover colour with a pale label band and two foil bands (128 x 512) */
const bookTex = (col: string, v: number) => tx(`ofBook_${col}_${v}`, 128, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 128, 512);
  g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, 18, 512); g.fillStyle = "rgba(0,0,0,0.14)"; g.fillRect(110, 0, 18, 512);
  const fo = v % 3 === 0 ? "#e2c070" : v % 3 === 1 ? "#f0e6d0" : "#1e1a20";
  for (const y of [40, 470]) { g.fillStyle = fo; g.fillRect(8, y, 112, 8 + 6 * (v % 2)); }
  if (v % 2 === 0) { g.fillStyle = "#efe4cc"; g.fillRect(20, 150 + 30 * r(), 88, 130); g.fillStyle = "rgba(40,30,30,0.55)"; for (let k = 0; k < 3; k++) g.fillRect(32, 180 + 30 * k + 20 * r(), 64 - 20 * r(), 8); }
  else { g.fillStyle = fo; for (let k = 0; k < 4; k++) g.fillRect(40, 170 + 40 * k, 48 - 12 * r(), 10); }
  speck(g, r, 128, 512, 300, ["#000000", "#ffffff"], 1, 2, 0.1);
});
/** THE WHITEBOARD (2048 x 1178 = 2.0 x 1.15 m): "DISTRACTION?" in blue marker; a juggling bear on a ball and a little
 *  marching band, each crossed out with a red X, with their captions (5 words in all); ghosts of old writing; a sticky
 *  note under a magnet */
export const boardTex = () => tx("ofBoard5", 2048, 1178, (g, r) => {
  const W = 2048, Hh = 1178;
  const gr = g.createLinearGradient(0, 0, W, Hh); gr.addColorStop(0, "#fdfdfa"); gr.addColorStop(0.55, "#f3f4f0"); gr.addColorStop(1, "#e9ebe8");
  g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.lineCap = "round"; g.lineJoin = "round";
  // ghosts of erased writing + eraser swipes
  for (let i = 0; i < 16; i++) { g.strokeStyle = rgba(r() < 0.5 ? "#5a74a8" : "#8a8a8a", 0.05 + 0.04 * r()); g.lineWidth = 6 + 8 * r(); g.beginPath();
    let x = 120 + 1800 * r(), y = 120 + 950 * r(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += 40 + 50 * r(); y += 30 * (r() - 0.5); g.quadraticCurveTo(x - 20, y - 40 * r(), x, y); } g.stroke(); }
  for (let i = 0; i < 6; i++) { g.save(); g.translate(200 + 1600 * r(), 200 + 800 * r()); g.rotate((r() - 0.5) * 0.6); const e = g.createLinearGradient(0, -60, 0, 60); e.addColorStop(0, "rgba(255,255,255,0)"); e.addColorStop(0.5, "rgba(255,255,255,0.55)"); e.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = e; g.fillRect(-180, -60, 360, 120); g.restore(); }
  const marker = (col: string, w: number) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; };
  const fit = (s: string, px: number, maxW: number) => { let p = px; font(g, p, MARK, "bold"); while (g.measureText(s).width > maxW && p > 20) { p -= 4; font(g, p, MARK, "bold"); } return p; };
  // the title, a little uphill, with an underline swoosh
  g.save(); g.translate(W / 2 - 60, 262); g.rotate(-0.022); fit("DISTRACTION?", 250, 1560); g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.lineWidth = 7; g.strokeStyle = "#1a3f92"; g.strokeText("DISTRACTION?", 0, 0); g.fillStyle = "#1f4cab"; g.fillText("DISTRACTION?", 0, 0); g.restore();
  marker("#1f4cab", 14); g.beginPath(); g.moveTo(330, 330); g.bezierCurveTo(760, 300, 1220, 318, 1600, 290); g.stroke();
  // LEFT: the juggling bear on a circus ball
  { const cx = 560, cy = 690; marker("#3e2414", 18);
    g.beginPath(); g.arc(cx, cy - 150, 72, 0, TAU); g.stroke();                                           // head
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 56, cy - 208, 26, 0, TAU); g.stroke(); }     // ears
    g.beginPath(); g.ellipse(cx, cy - 122, 30, 21, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cy - 132, 8, 0, TAU); g.fill();   // muzzle, nose
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 26, cy - 170, 7, 0, TAU); g.fill(); }        // eyes
    g.beginPath(); g.ellipse(cx, cy + 20, 88, 108, 0, 0, TAU); g.stroke();                               // body
    g.beginPath(); g.moveTo(cx - 70, cy - 40); g.quadraticCurveTo(cx - 150, cy - 90, cx - 150, cy - 190); g.stroke();   // arms up
    g.beginPath(); g.moveTo(cx + 70, cy - 40); g.quadraticCurveTo(cx + 150, cy - 90, cx + 150, cy - 190); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 40, cy + 116); g.lineTo(cx + s * 48, cy + 170); g.stroke(); }
    marker("#3e2414", 15); g.beginPath(); g.arc(cx, cy + 236, 70, 0, TAU); g.stroke();                    // the ball, with a star
    g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 14 : 34; g.lineTo(cx + Math.cos(a) * rr, cy + 236 + Math.sin(a) * rr); } g.closePath(); g.stroke();
    const balls: [number, number, string][] = [[cx - 175, cy - 285, "#d8402a"], [cx, cy - 365, "#2a8a4a"], [cx + 175, cy - 285, "#e08a1a"]];
    marker("#7a7a7a", 6); g.setLineDash([14, 18]); g.beginPath(); g.moveTo(cx - 150, cy - 210); g.quadraticCurveTo(cx - 190, cy - 380, cx, cy - 400); g.quadraticCurveTo(cx + 190, cy - 380, cx + 150, cy - 210); g.stroke(); g.setLineDash([]);
    for (const [x, y, c] of balls) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill(); marker("#3a2a22", 6); g.stroke(); }
    const lp = fit("JUGGLING BEAR?", 104, 860); g.fillStyle = "#24222e"; g.textAlign = "center"; g.fillText("JUGGLING BEAR?", cx, 1098); void lp;
    marker("rgba(214,40,36,0.93)", 30); g.beginPath(); g.moveTo(cx - 260, cy - 420); g.lineTo(cx + 255, cy + 330); g.moveTo(cx + 250, cy - 415); g.lineTo(cx - 250, cy + 325); g.stroke(); }
  // RIGHT: a marching band (a drummer in a tall plumed hat + a trumpeter), notes in the air
  { const cx = 1490, cy = 700;
    const fig = (x: number, y: number, s: number) => { marker("#283a8a", 14);
      g.beginPath(); g.arc(x, y - 120 * s, 46 * s, 0, TAU); g.stroke();                                   // head
      g.strokeRect(x - 40 * s, y - 290 * s, 80 * s, 120 * s);                                            // the shako
      g.beginPath(); g.moveTo(x, y - 290 * s); g.quadraticCurveTo(x + 30 * s, y - 360 * s, x - 6 * s, y - 380 * s); g.stroke();   // plume
      g.beginPath(); g.moveTo(x, y - 74 * s); g.lineTo(x, y + 90 * s); g.stroke();                       // body
      g.beginPath(); g.moveTo(x, y + 90 * s); g.lineTo(x - 50 * s, y + 200 * s); g.moveTo(x, y + 90 * s); g.lineTo(x + 46 * s, y + 160 * s); g.lineTo(x + 60 * s, y + 210 * s); g.stroke(); };   // a marching step
    fig(cx - 190, cy, 1); fig(cx + 170, cy, 0.95);
    marker("#283a8a", 12); g.beginPath(); g.ellipse(cx - 190, cy + 30, 92, 70, 0, 0, TAU); g.stroke();   // the big drum
    g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(cx - 270 + k * 40, cy - 30); g.lineTo(cx - 250 + k * 40, cy + 92); } g.stroke();
    g.beginPath(); g.moveTo(cx - 130, cy - 40); g.lineTo(cx - 60, cy - 120); g.moveTo(cx - 250, cy - 40); g.lineTo(cx - 320, cy - 110); g.stroke();   // sticks
    g.beginPath(); g.moveTo(cx + 210, cy - 116); g.lineTo(cx + 330, cy - 136); g.stroke();                // trumpet
    g.beginPath(); g.moveTo(cx + 330, cy - 136); g.lineTo(cx + 372, cy - 176); g.lineTo(cx + 384, cy - 98); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(cx + 170, cy - 30); g.lineTo(cx + 250, cy - 120); g.stroke();
    marker("#283a8a", 9); for (const [x, y, s] of [[cx + 50, cy - 380, 1], [cx + 330, cy - 330, 0.8], [cx - 20, cy - 290, 0.7]] as number[][]) {
      g.beginPath(); g.ellipse(x, y, 22 * s, 16 * s, -0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 20 * s, y - 4 * s); g.lineTo(x + 20 * s, y - 92 * s); g.quadraticCurveTo(x + 50 * s, y - 70 * s, x + 48 * s, y - 40 * s); g.stroke(); }
    fit("MARCHING BAND?", 104, 860); g.fillStyle = "#24222e"; g.textAlign = "center"; g.fillText("MARCHING BAND?", cx, 1098);
    marker("rgba(214,40,36,0.93)", 30); g.beginPath(); g.moveTo(cx - 330, cy - 420); g.lineTo(cx + 330, cy + 300); g.moveTo(cx + 330, cy - 420); g.lineTo(cx - 330, cy + 300); g.stroke(); }
  // a yellow sticky note under a red magnet, top right (blank: the words stay on the board)
  g.save(); g.translate(1938, 104); g.rotate(0.06); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(-58, -50, 124, 124); g.fillStyle = "#f6dc6a"; g.fillRect(-64, -58, 124, 124);
  g.fillStyle = "rgba(150,110,20,0.4)"; for (let k = 0; k < 3; k++) g.fillRect(-46, -22 + 26 * k, 80 - 18 * k, 7); g.restore();
  g.fillStyle = "#c8302a"; g.beginPath(); g.arc(1934, 62, 24, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(1926, 54, 8, 0, TAU); g.fill();
  speck(g, r, W, Hh, 900, ["#9aa0a8"], 1, 2, 0.08);
}, true);
/** the honey-wood door leaf (512 x 1144 = 0.93 x 2.08 m): two raised lower panels, a frosted glass light with gold
 *  "PSYCHOLOGY" lettering, a brass kick plate */
const doorTex = () => tx("ofDoor2", 512, 1144, (g, r) => {
  const wood = "#a8743e";
  g.fillStyle = wood; g.fillRect(0, 0, 512, 1144);
  for (let i = 0; i < 160; i++) { const x = r() * 512; g.strokeStyle = rgba("#4a2a12", 0.06 + 0.1 * r()); g.lineWidth = 1 + 2 * r(); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 14 * (r() - 0.5), 380, x + 14 * (r() - 0.5), 760, x + 8 * (r() - 0.5), 1144); g.stroke(); }
  const pnl = (x: number, y: number, w: number, h: number) => { const b = 18;
    g.fillStyle = shadeHex(wood, 0.08); g.fillRect(x, y, w, b); g.fillRect(x, y, b, h); g.fillStyle = shadeHex(wood, -0.12); g.fillRect(x, y + h - b, w, b); g.fillRect(x + w - b, y, b, h);
    g.fillStyle = shadeHex(wood, 0.02); g.fillRect(x + b, y + b, w - 2 * b, h - 2 * b); g.strokeStyle = "rgba(40,20,8,0.5)"; g.lineWidth = 3; g.strokeRect(x, y, w, h); };
  pnl(60, 640, 392, 190); pnl(60, 860, 392, 190);
  // the frosted light
  { const x = 60, y = 70, w = 392, h = 520; g.fillStyle = shadeHex(wood, -0.14); g.fillRect(x - 14, y - 14, w + 28, h + 28);
    const fr = g.createLinearGradient(0, y, 0, y + h); fr.addColorStop(0, "#e9efe9"); fr.addColorStop(1, "#cfd8d2"); g.fillStyle = fr; g.fillRect(x, y, w, h);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + 0.2 * r()})`; g.fillRect(x + r() * w, y + r() * h, 2, 2); }
    g.fillStyle = "rgba(255,255,255,0.35)"; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x + 120, y); g.rotate(0.35); g.fillRect(-30, -80, 50, 800); g.fillRect(50, -80, 14, 800); g.restore();
    g.textAlign = "center"; font(g, 52, SERIF, "bold"); g.lineWidth = 6; g.strokeStyle = "#2a1c14"; g.strokeText("PSYCHOLOGY", 256, y + 150); g.fillStyle = "#d8aa48"; g.fillText("PSYCHOLOGY", 256, y + 150);
    g.fillStyle = "#d8aa48"; g.fillRect(140, y + 176, 232, 5); }
  g.fillStyle = "#c9a34e"; g.fillRect(20, 1080, 472, 52); g.fillStyle = "rgba(255,240,190,0.4)"; g.fillRect(20, 1080, 472, 8);
  g.strokeStyle = "rgba(30,16,6,0.55)"; g.lineWidth = 4; g.strokeRect(2, 2, 508, 1140);
}, true);
/** the view out of the window (2048 x 1024 = 34 x 17 m, seen from 9 m): a hazy warm afternoon (the sun is out there,
 *  so the trees are BACKLIT: glowing rims, cool shade toward us), a sunny lawn with long shadows, a path, a far building */
const viewTex = () => tx("ofView2", 2048, 1024, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, "#8ab4e0"); sky.addColorStop(0.55, "#d6dcd8"); sky.addColorStop(1, "#f6e2bc");
  g.fillStyle = sky; g.fillRect(0, 0, 2048, 1024);
  blot(g, 1240, 120, 520, "#fff2d0", 0.55); blot(g, 1240, 120, 180, "#fffaf0", 0.6);                    // the sun's glow (behind the trees)
  for (let i = 0; i < 5; i++) { const x = 200 + 1600 * r(), y = 120 + 160 * r(); for (let k = 0; k < 5; k++) blot(g, x + (k - 2) * 60, y - 14 * Math.sin(k), 70, "#ffffff", 0.22); }
  // a far campus building (muted brick, pale windows) and a far tree line
  g.fillStyle = "#c79a86"; g.fillRect(1500, 430, 420, 170); g.fillStyle = "#b08676"; g.fillRect(1490, 418, 440, 18);
  for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(240,236,224,0.7)"; g.fillRect(1520 + k * 58, 460, 30, 46); g.fillRect(1520 + k * 58, 530, 30, 46); }
  for (let x = -40; x < 2100; x += 30 + 40 * r()) { const h = 60 + 60 * r(); g.fillStyle = r() < 0.5 ? "#7f9c84" : "#8aa88c"; g.beginPath(); g.ellipse(x, 600 - h * 0.4, 50 + 30 * r(), h, 0, 0, TAU); g.fill(); }
  // the lawn: warm sunny green, mown stripes, long cool shadows toward us
  const lawn = g.createLinearGradient(0, 590, 0, 1024); lawn.addColorStop(0, "#a9c27a"); lawn.addColorStop(1, "#7fa85e"); g.fillStyle = lawn; g.fillRect(0, 590, 2048, 434);
  for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? "rgba(255,250,200,0.07)" : "rgba(40,80,40,0.05)"; g.beginPath(); g.moveTo(-200 + k * 300, 1024); g.lineTo(-40 + k * 300, 1024); g.lineTo(700 + k * 160, 600); g.lineTo(620 + k * 160, 600); g.fill(); }
  g.fillStyle = "#ecdcbc"; g.beginPath(); g.moveTo(860, 1024); g.lineTo(1100, 1024); g.lineTo(1290, 600); g.lineTo(1250, 600); g.fill();   // a path
  // three big backlit trees: trunk, a cool-green crown with a glowing warm rim, a long shadow toward us
  for (const [x, s] of [[360, 1.25], [1000, 0.95], [1760, 1.1]] as number[][]) {
    g.fillStyle = "rgba(60,96,60,0.35)"; g.beginPath(); g.moveTo(x - 60 * s, 700); g.lineTo(x + 60 * s, 700); g.lineTo(x + 160 * s, 1024); g.lineTo(x - 180 * s, 1024); g.fill();
    g.fillStyle = "#5a4436"; g.fillRect(x - 16 * s, 470 - 40 * s, 32 * s, 250 + 40 * s);
    for (let k = 0; k < 12; k++) { const a = r() * TAU, d = 120 * s * Math.sqrt(r()), cx = x + Math.cos(a) * d * 1.2, cy = 330 - 40 * s + Math.sin(a) * d * 0.8, rr = (70 + 50 * r()) * s;
      g.fillStyle = "#4f7a52"; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); }
    for (let k = 0; k < 16; k++) { const a = -Math.PI * (0.15 + 0.7 * r()), d = 180 * s, cx = x + Math.cos(a) * d * 1.15, cy = 330 - 40 * s + Math.sin(a) * d * 0.75;
      blot(g, cx, cy, 70 * s, "#f6e6a0", 0.5); }
    for (let k = 0; k < 220; k++) { const a = r() * TAU, d = 210 * s * Math.sqrt(r()), cx = x + Math.cos(a) * d * 1.1, cy = 330 - 40 * s + Math.sin(a) * d * 0.75, l = Math.sin(a) < -0.2;
      g.fillStyle = l ? "rgba(220,236,150,0.55)" : "rgba(40,80,50,0.45)"; g.beginPath(); g.ellipse(cx, cy, 10, 6, a, 0, TAU); g.fill(); } }
  // a lamp post and a bench far off, two tiny figures sitting on the lawn
  g.fillStyle = "#3a4a46"; g.fillRect(1366, 520, 6, 120); g.beginPath(); g.arc(1369, 516, 10, 0, TAU); g.fill();
  g.fillStyle = "#8a6a4a"; g.fillRect(1180, 640, 90, 10); g.fillRect(1186, 650, 6, 18); g.fillRect(1258, 650, 6, 18);
  for (const [x, c] of [[640, "#c8503a"], [676, "#3a6aa8"]] as [number, string][]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, 742, 12, 18, 0, 0, TAU); g.fill(); g.fillStyle = "#f0e4d6"; g.beginPath(); g.arc(x, 716, 9, 0, TAU); g.fill(); }
  speck(g, r, 2048, 1024, 6000, ["#ffffff", "#3a5a3a"], 1, 2.4, 0.08);
});
/** sage curtain fabric (512 x 1024): soft vertical folds, a woven speck, a darker hem */
const curtainTex = () => tx("ofCurtain", 512, 1024, (g, r) => {
  g.fillStyle = "#8fa27c"; g.fillRect(0, 0, 512, 1024);
  for (let x = 0; x < 512; x++) { const k = 0.5 + 0.5 * Math.sin((x / 512) * TAU * 3.5); g.fillStyle = `rgba(${k > 0.5 ? "255,250,230" : "30,50,30"},${0.1 * Math.abs(k - 0.5) * 2})`; g.fillRect(x, 0, 1, 1024); }
  speck(g, r, 512, 1024, 9000, ["#5a6e4c", "#c8d6b0"], 1, 2, 0.16);
  g.fillStyle = "#6e8460"; g.fillRect(0, 960, 512, 64); g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(0, 960, 512, 5);
}, true);
/** posters + frames on the walls (alpha off: each is a framed board) */
const posterTex = (k: number) => tx("ofPoster" + k, 512, 720, (g, r) => {
  g.fillStyle = "#3a2a22"; g.fillRect(0, 0, 512, 720);
  const x = 22, y = 22, w = 468, h = 676;
  if (k === 0) {   // a perception poster: an impossible triangle and a Necker cube on cream
    g.fillStyle = "#efe6d2"; g.fillRect(x, y, w, h);
    g.lineJoin = "round"; g.lineWidth = 10;
    const tri = (cx: number, cy: number, s: number) => { const pts = [0, 1, 2].map((i) => [cx + s * Math.cos(-Math.PI / 2 + (i * TAU) / 3), cy + s * Math.sin(-Math.PI / 2 + (i * TAU) / 3)]);
      const cols = ["#c8503a", "#3a6a9a", "#e0a640"];
      for (let i = 0; i < 3; i++) { const a = pts[i], b = pts[(i + 1) % 3], c = pts[(i + 2) % 3]; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0] + (c[0] - b[0]) * 0.28, b[1] + (c[1] - b[1]) * 0.28); g.lineTo(a[0] + (c[0] - a[0]) * 0.18, a[1] + (c[1] - a[1]) * 0.18); g.closePath(); g.fill(); g.strokeStyle = "#2a1c24"; g.stroke(); } };
    tri(256, 250, 150);
    g.strokeStyle = "#2a3a5a"; g.lineWidth = 8; g.strokeRect(150, 430, 150, 150); g.strokeRect(210, 380, 150, 150); for (const [a, b] of [[[150, 430], [210, 380]], [[300, 430], [360, 380]], [[150, 580], [210, 530]], [[300, 580], [360, 530]]] as number[][][]) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    font(g, 46, BOLD); g.fillStyle = "#2a1c24"; g.textAlign = "center"; g.fillText("PERCEPTION", 256, 662);
  } else if (k === 1) {   // a brain diagram: coloured lobes on navy
    g.fillStyle = "#24345a"; g.fillRect(x, y, w, h);
    const lobes: [number, number, number, number, string][] = [[200, 300, 120, 90, "#e88a7a"], [320, 280, 100, 100, "#e8c070"], [330, 400, 90, 70, "#86b8d8"], [210, 410, 110, 70, "#a0d08a"], [360, 470, 60, 40, "#d8a0d0"]];
    for (const [cx, cy, rx, ry, c] of lobes) { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0.2, 0, TAU); g.fill(); }
    g.strokeStyle = "rgba(40,20,30,0.45)"; g.lineWidth = 5; for (let i = 0; i < 18; i++) { const cx = 180 + 200 * r(), cy = 240 + 220 * r(); g.beginPath(); g.arc(cx, cy, 20 + 20 * r(), r() * 3, r() * 3 + 2); g.stroke(); }
    g.fillStyle = "#d8a0b0"; g.fillRect(330, 470, 26, 90);
    g.fillStyle = "#f0e6d0"; for (let i = 0; i < 5; i++) { g.fillRect(60, 560 + 22 * i, 160 + 120 * r(), 8); }
    font(g, 48, BOLD); g.textAlign = "center"; g.fillText("THE BRAIN", 256, 120);
  } else if (k === 2) {   // a framed certificate (no words: a seal, ribbon, script lines)
    g.fillStyle = "#c9a35a"; g.fillRect(x - 6, y - 6, w + 12, h + 12); g.fillStyle = "#f6f0de"; g.fillRect(x + 20, y + 20, w - 40, h - 40);
    g.strokeStyle = "#b8944a"; g.lineWidth = 6; g.strokeRect(x + 40, y + 40, w - 80, h - 80);
    g.fillStyle = "#5a4a3a"; for (let i = 0; i < 6; i++) g.fillRect(110, 200 + 50 * i, 292 - (i % 3) * 40, 9);
    g.fillStyle = "#b83a2e"; g.beginPath(); g.arc(256, 560, 48, 0, TAU); g.fill(); g.fillStyle = "#e0b850"; g.beginPath(); g.arc(256, 560, 30, 0, TAU); g.fill();
  } else {   // a cork board with pinned notes, a photo, a flyer
    g.fillStyle = "#c69a66"; g.fillRect(x, y, w, h); speck(g, r, 512, 720, 5000, ["#8a6036", "#e8c08a"], 1, 3, 0.3);
    const notes: [number, number, number, number, string][] = [[60, 70, 150, 130, "#f6e27a"], [250, 60, 200, 150, "#ffffff"], [70, 260, 180, 200, "#a8d0e8"], [280, 260, 170, 130, "#f4b8b0"], [120, 500, 260, 150, "#ffffff"]];
    notes.forEach(([nx, ny, nw, nh, c], i) => { g.save(); g.translate(nx + nw / 2, ny + nh / 2); g.rotate((r() - 0.5) * 0.12); g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(-nw / 2 + 5, -nh / 2 + 6, nw, nh); g.fillStyle = c; g.fillRect(-nw / 2, -nh / 2, nw, nh);
      g.fillStyle = "rgba(40,40,60,0.45)"; for (let k2 = 0; k2 < 4; k2++) g.fillRect(-nw / 2 + 14, -nh / 2 + 24 + k2 * 22, nw - 28 - 30 * r(), 6);
      if (i === 2) { g.fillStyle = "#6a8ab0"; g.fillRect(-nw / 2 + 12, -nh / 2 + 12, nw - 24, nh * 0.55); g.fillStyle = "#f0e0c8"; g.beginPath(); g.arc(-10, -nh / 2 + 50, 22, 0, TAU); g.fill(); }
      g.fillStyle = ["#d8402a", "#2a6ad8", "#2a9a4a"][i % 3]; g.beginPath(); g.arc(0, -nh / 2 + 8, 9, 0, TAU); g.fill(); g.restore(); });
  }
  g.strokeStyle = "rgba(20,10,8,0.6)"; g.lineWidth = 4; g.strokeRect(x, y, w, h);
}, true);
/** the corridor's far wall seen through the door (1024 x 768 = 4.2 x 3.1 m): cool pale green paint, a door across with
 *  a number plate, a noticeboard of flyers, a skirting, a fire extinguisher */
const corridorTex = () => tx("ofCorr", 1024, 768, (g, r) => {
  g.fillStyle = "#c9d2c4"; g.fillRect(0, 0, 1024, 768);
  g.fillStyle = "#8a9a8c"; g.fillRect(0, 720, 1024, 48);
  g.fillStyle = "#6a7e9a"; g.fillRect(560, 230, 230, 490); g.fillStyle = "#e8e2d4"; g.fillRect(548, 220, 254, 12); g.fillRect(548, 220, 12, 500); g.fillRect(790, 220, 12, 500);
  g.fillStyle = "#c9a34e"; g.beginPath(); g.arc(760, 480, 10, 0, TAU); g.fill(); g.fillStyle = "#f0ece0"; g.fillRect(640, 280, 70, 34);
  g.fillStyle = "#b8905e"; g.fillRect(130, 230, 330, 230); g.strokeStyle = "#5a4030"; g.lineWidth = 8; g.strokeRect(130, 230, 330, 230);
  const fl = ["#f6e27a", "#ffffff", "#f4b8b0", "#a8d0e8", "#c8e6a8", "#ffffff"];
  for (let i = 0; i < 6; i++) { const x = 150 + (i % 3) * 100 + 10 * r(), y = 248 + Math.floor(i / 3) * 102 + 6 * r(); g.fillStyle = fl[i]; g.fillRect(x, y, 84, 88); g.fillStyle = "rgba(40,40,60,0.4)"; for (let k = 0; k < 3; k++) g.fillRect(x + 10, y + 16 + 20 * k, 60, 6); }
  g.fillStyle = "#c8302a"; g.fillRect(900, 520, 34, 90); g.fillStyle = "#2a2a2a"; g.fillRect(906, 506, 22, 16);
  for (let i = 0; i < 20; i++) blot(g, r() * 1024, r() * 700, 60 + 90 * r(), r() < 0.5 ? "#a8b4a6" : "#e6ece0", 0.12);
}, true);
/** the wall clock's dial (512): cream, a brass ring, plain ticks */
const dialTex = () => tx("ofDial", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#8a6a34"; g.beginPath(); g.arc(256, 256, 254, 0, TAU); g.fill(); g.fillStyle = "#d8b060"; g.beginPath(); g.arc(256, 256, 236, 0, TAU); g.fill();
  g.fillStyle = "#f8f2e2"; g.beginPath(); g.arc(256, 256, 214, 0, TAU); g.fill(); blot(g, 200, 190, 220, "#ffffff", 0.4);
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU, big = k % 5 === 0, r0 = big ? 160 : 190; g.strokeStyle = "#2a2230"; g.lineWidth = big ? 14 : 4;
    g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 204, 256 - Math.cos(a) * 204); g.stroke(); }
  speck(g, r, 512, 512, 300, ["#a89878"], 1, 2, 0.12);
}, true);
/** a striped scarf (128 x 512) */
const scarfTex = () => tx("ofScarf", 128, 512, (g) => { for (let k = 0; k < 16; k++) { g.fillStyle = ["#8a2e34", "#efe2c8", "#2c3a5c", "#efe2c8"][k % 4]; g.fillRect(0, k * 32, 128, 32); } }, true);
/** a big glossy fiddle-leaf (256 x 256, alpha) */
const leafTex = () => tx("ofLeaf", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineJoin = "round";
  g.fillStyle = "#4f8a46"; g.strokeStyle = "#22301e"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(128, 246); g.bezierCurveTo(30, 200, 20, 60, 128, 12); g.bezierCurveTo(236, 60, 226, 200, 128, 246); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(200,236,140,0.4)"; g.beginPath(); g.moveTo(128, 236); g.bezierCurveTo(60, 190, 50, 80, 128, 24); g.closePath(); g.fill();
  g.strokeStyle = "rgba(220,240,180,0.6)"; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 240); g.lineTo(128, 30); g.stroke();
  for (let k = 0; k < 5; k++) { const y = 200 - k * 34; g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(90, y - 20, 70, y - 30); g.moveTo(128, y); g.quadraticCurveTo(166, y - 20, 186, y - 30); g.stroke(); }
}, true);
/** a long soft sun beam (u = 0 at the window -> 1 deep in the room): a quick fade-in, a slow fade-out, feathered sides */
const beamTex = () => tx("ofBeam", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2, a = Math.min(1, u * 12) * (1 - u) ** 0.75 * (1 - v ** 2.4) ** 1.4;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * clamp01(a));
  }
  g.putImageData(im, 0, 0);
}, true);
/** soft woven fabric / felt (256): a base colour with a fine speck and faint weave */
const fabricTex = (col: string) => tx("ofFabric_" + col, 256, 256, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) { g.fillStyle = rgba(shadeHex(col, y % 8 ? 0.04 : -0.04), 0.5); g.fillRect(0, y, 256, 2); }
  speck(g, r, 256, 256, 2500, [shadeHex(col, -0.2), shadeHex(col, 0.15)], 1, 2, 0.2);
});
/** a little globe (512 x 256 equirect): ocean blue, ochre-green continents */
const globeTex = () => tx("ofGlobe", 512, 256, (g, r) => {
  g.fillStyle = "#5a8ab8"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 9; i++) { const x = r() * 512, y = 50 + 150 * r(); g.fillStyle = r() < 0.5 ? "#c8b070" : "#8ab070"; g.beginPath();
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, rr = 20 + 40 * r(); g.lineTo(x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 2; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(0, k * 42.6); g.lineTo(512, k * 42.6); g.stroke(); }
});
/** corridor lino (512 = 2 m): cool green-grey squares, speckled */
const linoTex = () => tx("ofLino", 512, 512, (g, r) => {
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { g.fillStyle = (i + k) % 2 ? "#a8b2a4" : "#bcc4b6"; g.fillRect(i * 128, k * 128, 128, 128); }
  speck(g, r, 512, 512, 5000, ["#6a7468", "#e8ece0"], 1, 2.4, 0.2);
});

// ======================================================================================================= the set
type Swing = { m: THREE.Object3D; base: THREE.Euler; a: [number, number, number]; w: number; ph: number };

export class OfficeSet implements SetModule {
  readonly sets = ["office" as const];
  readonly group = new THREE.Group();
  private door = new THREE.Group();
  private swings: Swing[] = [];
  private shafts: THREE.MeshBasicMaterial[] = [];
  private motes!: Motes;
  private steam: THREE.Mesh[] = [];
  private hands: THREE.Mesh[] = [];
  private bird!: THREE.Sprite;
  /* p3 polish: loose papers that lift when the door swings in, the clock's pendulum, a desk fan, the tree outside */
  private loose: { m: THREE.Mesh; p: P3; ry: number; k: number }[] = [];
  private pend = new THREE.Group(); private fan = new THREE.Group(); private fanHead = new THREE.Group();
  private fol!: Foliage;

  constructor(kit: Kit) {
    const S = this.group, cb = new Batch(), fb = new Batch();
    const tb = (mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0, cast = true, bottom = false) =>
      (cast ? cb : fb).add(boxGeo(V(O[0] + x0, O[1] + y0, O[2] + z0), V(O[0] + x1, O[1] + y1, O[2] + z1), tile, bottom), mat);
    const bx = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, cast = true) =>
      (cast ? cb : fb).add(new THREE.BoxGeometry(w, h, d), mat, M(O[0] + x, O[1] + y, O[2] + z, ry, [1, 1, 1], rx, rz));
    const geo = (g: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: V3 = [1, 1, 1], cast = true) =>
      (cast ? cb : fb).add(g, mat, M(O[0] + x, O[1] + y, O[2] + z, ry, s, rx, rz));
    const seg = (mat: THREE.Material, a: P3, b: P3, r: number, sides = 8) => {
      const A = V(O[0] + a[0], O[1] + a[1], O[2] + a[2]), B = V(O[0] + b[0], O[1] + b[1], O[2] + b[2]), d = B.clone().sub(A), L = d.length();
      cb.add(new THREE.CylinderGeometry(r, r, L, sides), mat, new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
    };
    const face = (tex: THREE.Texture, w: number, h: number, p: P3, ry: number, k = 0.92, warm: [number, number, number] = [1, 0.97, 0.92]) => {
      const m = faceMesh(tex, w, h); (m.material as THREE.MeshBasicMaterial).color.setRGB(k * warm[0], k * warm[1], k * warm[2]);
      m.position.set(...p); m.rotation.y = ry; S.add(m); return m; };
    const plaster = TM("ofPlasterW", () => plasterTex("w", "#ecd8b6")), ceilM = TM("ofPlasterC", () => plasterTex("c", "#f1e6d2"));
    const wain = TM("ofWain", wainscotTex), trim = C("#f0e6d0"), woodD = C("#7a4a2c");
    const honey = TM("ofHoney", () => rep(parkWood("#b9844c", false), 1, 1)), brass = C("#c9a14e"), steel = C("#9aa2ac"), dark = C("#2a2630");
    const fab = (col: string, side: THREE.Side = THREE.FrontSide) => TM("ofFab" + col + side, () => fabricTex(col), { side });

    // ---------------- floor, rug, ceiling ----------------
    fb.add(new THREE.PlaneGeometry(X1 - X0 + 2 * WT, Z1 - Z0 + 2 * WT).rotateX(-Math.PI / 2), TM("ofFloor", () => rep(planksHD(), 3.6, 3.4), { color: "#d6ae88" }),
      M(O[0] + (X0 + X1) / 2, O[1], O[2] + (Z0 + Z1) / 2));
    fb.add(new THREE.PlaneGeometry(3.2, 2.4).rotateX(-Math.PI / 2), TM("ofRugM", rugTex), M(O[0] + 0.15, O[1] + 0.008, O[2] - 0.95));
    tb(ceilM, X0 - WT, H, Z0 - WT, X1 + WT, H + 0.14, Z1 + WT, 2, true, true);
    // ---------------- the walls (they CAST: the sun enters only through the window) ----------------
    // west (the window wall)
    tb(plaster, X0 - WT, 0, Z0 - WT, X0, H, WZ0, 2); tb(plaster, X0 - WT, 0, WZ1, X0, H, Z1 + WT, 2);
    tb(plaster, X0 - WT, 0, WZ0, X0, WY0, WZ1, 2); tb(plaster, X0 - WT, WY1, WZ0, X0, H, WZ1, 2);
    // back (the door wall), east, front
    tb(plaster, X0 - WT, 0, Z0 - WT, DX0, H, Z0, 2); tb(plaster, DX1, 0, Z0 - WT, X1 + WT, H, Z0, 2); tb(plaster, DX0, DH, Z0 - WT, DX1, H, Z0, 2);
    tb(plaster, X1, 0, Z0, X1 + WT, H, Z1, 2); tb(plaster, X0, 0, Z1, X1, H, Z1 + WT, 2);
    // wainscot (slate panels to 0.95 m), skirting, dado rail, cornice on the room faces
    const runs: [string, number, number][] = [["W", Z0, WZ0], ["W", WZ1, Z1], ["B", X0, DX0], ["B", DX1, X1], ["E", Z0, Z1], ["F", X0, X1]];
    for (const [w, a, b] of runs) {
      const L = b - a; if (L < 0.05) continue;
      if (w === "W") { tb(wain, X0, 0.12, a, X0 + 0.022, 0.93, b, 1); tb(trim, X0, 0, a, X0 + 0.03, 0.12, b); tb(trim, X0, 0.92, a, X0 + 0.045, 0.97, b); tb(trim, X0, H - 0.1, a, X0 + 0.07, H, b); }
      if (w === "E") { tb(wain, X1 - 0.022, 0.12, a, X1, 0.93, b, 1); tb(trim, X1 - 0.03, 0, a, X1, 0.12, b); tb(trim, X1 - 0.045, 0.92, a, X1, 0.97, b); tb(trim, X1 - 0.07, H - 0.1, a, X1, H, b); }
      if (w === "B") { tb(wain, a, 0.12, Z0, b, 0.93, Z0 + 0.022, 1); tb(trim, a, 0, Z0, b, 0.12, Z0 + 0.03); tb(trim, a, 0.92, Z0, b, 0.97, Z0 + 0.045); tb(trim, a, H - 0.1, Z0, b, H, Z0 + 0.07); }
      if (w === "F") { tb(wain, a, 0.12, Z1 - 0.022, b, 0.93, Z1, 1); tb(trim, a, 0, Z1 - 0.03, b, 0.12, Z1); tb(trim, a, H - 0.1, Z1 - 0.07, b, H, Z1); }
    }
    // under the window the wainscot runs on (the sill sits on it)
    tb(wain, X0, 0.12, WZ0, X0 + 0.022, 0.84, WZ1, 1); tb(trim, X0, 0, WZ0, X0 + 0.03, 0.12, WZ1);

    // ---------------- THE WINDOW (west) ----------------
    { const xm = X0 - WT * 0.55, frame = C("#f4ecdc");
      tb(trim, X0 - 0.01, WY0 - 0.06, WZ0 - 0.1, X0 + 0.2, WY0, WZ1 + 0.1);                                  // the inner sill
      for (const [z0, z1] of [[WZ0 - 0.1, WZ0], [WZ1, WZ1 + 0.1]]) tb(trim, X0, WY0, z0, X0 + 0.03, WY1 + 0.1, z1);   // architrave
      tb(trim, X0, WY1, WZ0 - 0.1, X0 + 0.03, WY1 + 0.1, WZ1 + 0.1);
      // the sashes: outer frame, a meeting rail, two glazing bars each way (they cast the window-bar shadows)
      tb(frame, xm - 0.03, WY0, WZ0, xm + 0.03, WY0 + 0.07, WZ1); tb(frame, xm - 0.03, WY1 - 0.07, WZ0, xm + 0.03, WY1, WZ1);
      tb(frame, xm - 0.03, WY0, WZ0, xm + 0.03, WY1, WZ0 + 0.07); tb(frame, xm - 0.03, WY0, WZ1 - 0.07, xm + 0.03, WY1, WZ1);
      tb(frame, xm - 0.035, (WY0 + WY1) / 2 - 0.035, WZ0, xm + 0.035, (WY0 + WY1) / 2 + 0.035, WZ1);
      for (const k of [1, 2]) { const z = WZ0 + ((WZ1 - WZ0) * k) / 3; tb(frame, xm - 0.02, WY0, z - 0.018, xm + 0.02, WY1, z + 0.018); }
      for (const y of [WY0 + (WY1 - WY0) * 0.25, WY0 + (WY1 - WY0) * 0.75]) tb(frame, xm - 0.02, y - 0.016, WZ0, xm + 0.02, y + 0.016, WZ1);
      // glass: a faint glare sheet (never casts, never inked)
      { const gm = new THREE.Mesh(new THREE.PlaneGeometry(WZ1 - WZ0, WY1 - WY0), new THREE.MeshBasicMaterial({ map: glareTex(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1, 0.95, 0.85) }));
        gm.position.set(...wp(xm + 0.04, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2)); gm.rotation.y = Math.PI / 2; gm.layers.set(NOINK); S.add(gm); }
      // the curtain rod + two sage curtains (they sway a little: pose)
      seg(brass, [X0 + 0.14, WY1 + 0.22, WZ0 - 0.55], [X0 + 0.14, WY1 + 0.22, WZ1 + 0.55], 0.016);
      for (const [zc, s] of [[WZ0 - 0.3, -1], [WZ1 + 0.3, 1]] as number[][]) {
        const cg = new THREE.PlaneGeometry(0.62, 2.3, 10, 14).translate(0, -1.15, 0), p = cg.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < p.count; k++) { const u = p.getX(k), v = -p.getY(k) / 2.3; p.setZ(k, 0.05 * Math.sin(u * 22 + s) * (0.5 + 0.5 * v) + 0.03 * Math.sin(u * 9)); p.setX(k, u * (1 - 0.16 * v * (s > 0 ? 1 : 1))); }
        cg.computeVertexNormals();
        const m = new THREE.Mesh(cg, TM("ofCurtainM", curtainTex, { side: THREE.DoubleSide }));
        m.position.set(...wp(X0 + 0.16, WY1 + 0.2, zc)); m.rotation.set(0, Math.PI / 2, 0); m.castShadow = true; m.receiveShadow = true; S.add(m);
        this.swings.push({ m, base: m.rotation.clone(), a: [0.022, 0, 0.012], w: 0.35, ph: s }); }
      // the radiator under the window (cream, ribbed) and things on the sill: a cactus in a pot, two books
      for (let k = 0; k < 16; k++) { const z = -1.72 + k * 0.085; bx(trim, 0.08, 0.56, 0.05, X0 + 0.12, 0.42, z); }
      tb(trim, X0 + 0.07, 0.68, -1.76, X0 + 0.17, 0.72, -0.36); tb(steel, X0 + 0.1, 0.16, -1.76, X0 + 0.14, 0.19, -0.36);
      geo(cylY(0.07, 0.11, 14, false, 0.085), C("#c0623e"), X0 + 0.1, WY0, -0.4); geo(new THREE.CapsuleGeometry(0.035, 0.1, 4, 10), C("#5f8a4e"), X0 + 0.1, WY0 + 0.18, -0.4);
      bx(C("#8a3b32"), 0.17, 0.04, 0.24, X0 + 0.1, WY0 + 0.02, -1.7, 0.1); bx(C("#2f4468"), 0.15, 0.035, 0.22, X0 + 0.1, WY0 + 0.058, -1.68, -0.15);
      // outside: the view card (unlit, the bright afternoon), a lawn, two real trees, a branch whose leaves shade the sun
      { const v = new THREE.Mesh(new THREE.PlaneGeometry(34, 17), new THREE.MeshBasicMaterial({ map: viewTex(), fog: false, color: new THREE.Color(1.02, 1.0, 0.97) }));
        v.position.set(...wp(X0 - 9.5, 3.4, -1.0)); v.rotation.y = Math.PI / 2; v.layers.set(NOINK); S.add(v);
        fb.add(new THREE.PlaneGeometry(9.4, 30).rotateX(-Math.PI / 2), TM("ofLawn", () => rep(grassHD(), 4, 12), { color: "#a6c487" }), M(O[0] + X0 - WT - 4.7, O[1] - 0.6, O[2] - 1));
        void prop; void kit;   /* (no 3D trees outside: a lit Kenney crown filled the window with flat lime; the painted view is backlit) */
        for (let i = 0; i < 5; i++) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), TM("ofSpray" + (i % 3), () => SP.leafSprayTex(i % 3), { side: THREE.DoubleSide, alphaTest: 0.4 }));
          m.position.set(...wp(X0 - 0.75 - 0.25 * hash(i * 3.1), 2.45 + 0.38 * hash(i * 1.7), -1.95 + i * 0.52)); m.rotation.set(0.2 * (hash(i) - 0.5), Math.PI / 2 + 0.4 * (hash(i * 2) - 0.5), Math.PI * (0.55 + 0.4 * hash(i * 5)));
          m.castShadow = true; m.receiveShadow = true; m.layers.set(NOINK); S.add(m); this.swings.push({ m, base: m.rotation.clone(), a: [0.05, 0.04, 0.09], w: 0.55 + 0.2 * hash(i), ph: i * 1.3 }); } }
    }

    // ---------------- THE BOOKSHELF (back wall, left; the sun reaches its lower shelves) ----------------
    { const x0 = -2.88, x1 = -1.68, d = 0.34, h = 2.2, zf = Z0 + d, cw = TM("ofShelfWood", () => rep(parkWood("#9a6a40", true), 1, 1));
      tb(cw, x0, 0, Z0 + 0.01, x0 + 0.04, h, zf); tb(cw, x1 - 0.04, 0, Z0 + 0.01, x1, h, zf); tb(cw, x0, h - 0.04, Z0 + 0.01, x1, h, zf + 0.02); tb(woodD, x0 + 0.04, 0, Z0 + 0.01, x1 - 0.04, 2.16, Z0 + 0.03);
      tb(cw, x0, 0, zf - 0.04, x1, 0.1, zf);
      const levels = [0.1, 0.52, 0.94, 1.36, 1.78];
      const cols = ["#8a3b32", "#2f4468", "#3e5e46", "#c08a3a", "#e6d8bc", "#5c6e80", "#5e3a52", "#a8552e", "#d8c8a0", "#3a3a4a"];
      levels.forEach((y, li) => {
        if (li) tb(cw, x0 + 0.04, y - 0.03, Z0 + 0.03, x1 - 0.04, y, zf);
        let x = x0 + 0.06; const top = (levels[li + 1] ?? 2.16) - 0.03;
        while (x < x1 - 0.08) {
          const hh = Math.min(top - y - 0.02, 0.22 + 0.13 * hash(x * 91 + li)), w = 0.026 + 0.04 * hash(x * 37 + li * 3), dd = 0.17 + 0.07 * hash(x * 13);
          const k = Math.floor(hash(x * 51 + li * 7) * cols.length), lean = hash(x * 7 + li) < 0.08 ? 0.22 : 0;
          if (hash(x * 3 + li * 11) < 0.07) { x += 0.08; continue; }                         // a gap
          if (li === 2 && x > x0 + 0.5 && x < x0 + 0.78) { x += 0.05; continue; }               // room for the brain model
          bx(TM("ofBk" + k + (li % 2), () => bookTex(cols[k], k + li)), w, hh, dd, x + w / 2, y + hh / 2, zf - dd / 2 - 0.01, 0, 0, -lean);
          x += w + 0.003 + (lean ? 0.05 : 0);
        }
      });
      // a lying stack, a brain model, a globe on top, a little framed photo, a trailing plant
      for (let k = 0; k < 3; k++) bx(TM("ofBkS" + k, () => bookTex(cols[(k * 3) % 10], k)), 0.24 - 0.02 * k, 0.04, 0.18, x1 - 0.2, 1.36 + 0.02 + 0.042 * k, zf - 0.12, 0.1 * k);
      { const bc = x0 + 0.64, by = 0.94 + 0.13, bz = zf - 0.15, pink = C("#e7a7a2"); geo(new THREE.SphereGeometry(0.11, 18, 12), pink, bc, by, bz, 0, 0, 0, [1.25, 0.85, 1]); geo(new THREE.SphereGeometry(0.06, 14, 10), C("#d8908c"), bc + 0.08, by - 0.05, bz, 0, 0, 0, [1, 0.7, 1]);
        geo(cylY(0.05, 0.04, 14), woodD, bc, 0.94, bz); }
      { const gx = x0 + 0.35, gy = h + 0.02; geo(cylY(0.06, 0.03, 14), woodD, gx, gy, zf - 0.15); seg(brass, [gx, gy + 0.03, zf - 0.15], [gx, gy + 0.18, zf - 0.15], 0.008);
        geo(new THREE.SphereGeometry(0.13, 22, 14), TM("ofGlobeM", globeTex), gx, gy + 0.3, zf - 0.15, 0.5, 0.4); }
      geo(cylY(0.07, 0.12, 14, false, 0.06), C("#c0623e"), x1 - 0.18, 1.78, zf - 0.14);
      for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.42), TM("ofTrail", leafTex, { side: THREE.DoubleSide, alphaTest: 0.4 }));
        m.position.set(...wp(x1 - 0.18 + 0.1 * (hash(k) - 0.5), 1.78 + 0.05 - 0.15 * k, zf - 0.04)); m.rotation.set(0, 0.3 * (hash(k * 3) - 0.5), Math.PI + 0.4 * (hash(k * 7) - 0.5)); m.castShadow = true; S.add(m);
        this.swings.push({ m, base: m.rotation.clone(), a: [0.02, 0.02, 0.05], w: 0.3, ph: k }); }
      contact(S, wp((x0 + x1) / 2, 0.012, Z0 + 0.2), 1.5, 0.6, 0.45); }

    // ---------------- the back wall: brain poster, THE WHITEBOARD, the clock, a light switch, a photo ----------------
    face(posterTex(1), 0.56, 0.79, wp(-1.2, 1.72, Z0 + 0.012), 0, 0.86);
    { const b = L0(OFFICE.board.c), w = OFFICE.board.w, h = OFFICE.board.h, fr = C("#b9bec6");
      tb(fr, b[0] - w / 2 - 0.035, b[1] - h / 2 - 0.035, Z0, b[0] + w / 2 + 0.035, b[1] + h / 2 + 0.035, Z0 + 0.02);
      /* the board is LIT (the window light falls across it like the wall) with an emissive floor so it stays white in the shade */
      { const bt = boardTex(), bmat = new THREE.MeshLambertMaterial({ map: bt, color: new THREE.Color(0.66, 0.65, 0.64), emissive: new THREE.Color(0.34, 0.33, 0.32), emissiveMap: bt });
        const bm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), twoTone(bmat)); bm.position.set(...wp(b[0], b[1], Z0 + 0.026)); bm.receiveShadow = true; bm.layers.set(NOINK); S.add(bm); }
      for (const [x0, x1, y0, y1] of [[-w / 2 - 0.035, w / 2 + 0.035, h / 2, h / 2 + 0.035], [-w / 2 - 0.035, w / 2 + 0.035, -h / 2 - 0.035, -h / 2], [-w / 2 - 0.035, -w / 2, -h / 2, h / 2], [w / 2, w / 2 + 0.035, -h / 2, h / 2]])
        tb(fr, b[0] + x0, b[1] + y0, Z0, b[0] + x1, b[1] + y1, Z0 + 0.034);
      tb(fr, b[0] - 0.75, b[1] - h / 2 - 0.07, Z0, b[0] + 0.75, b[1] - h / 2 - 0.04, Z0 + 0.075);                  // the marker tray
      tb(fr, b[0] - 0.75, b[1] - h / 2 - 0.07, Z0 + 0.065, b[0] + 0.75, b[1] - h / 2 - 0.03, Z0 + 0.075);
      ([["#1f4cab", -0.4], ["#d23a2e", -0.28], ["#222222", -0.17]] as [string, number][]).forEach(([c, dx], i) => geo(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10).rotateZ(Math.PI / 2), C(c), b[0] + dx, b[1] - h / 2 - 0.028, Z0 + 0.045, 0.1 * i));
      bx(C("#3a3a40"), 0.13, 0.03, 0.05, b[0] + 0.3, b[1] - h / 2 - 0.022, Z0 + 0.045); bx(C("#c8a070"), 0.13, 0.015, 0.05, b[0] + 0.3, b[1] - h / 2 - 0.0, Z0 + 0.045);
      contact(S, wp(b[0], 0.012, Z0 + 0.15), 2.2, 0.5, 0.25);
      // the wall clock above the board: brass rim, dial, three hands (pose: it ticks)
      const cy = 2.5, r0 = 0.19;
      geo(new THREE.CylinderGeometry(r0 + 0.02, r0 + 0.02, 0.05, 32).rotateX(Math.PI / 2), C("#8a6a34"), b[0], cy, Z0 + 0.025);
      { const f = faceMesh(dialTex(), 2 * r0 + 0.04, 2 * r0 + 0.04, true); (f.material as THREE.MeshBasicMaterial).color.setRGB(0.92, 0.88, 0.82); f.position.set(...wp(b[0], cy, Z0 + 0.052)); f.layers.set(NOINK); S.add(f); }
      for (const [len, wid, col] of [[0.1, 0.022, "#241c2c"], [0.15, 0.014, "#241c2c"], [0.16, 0.005, "#c8302a"]] as [number, number, string][]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.004).translate(0, len / 2 - 0.025, 0), new THREE.MeshBasicMaterial({ color: col })); m.position.set(...wp(b[0], cy, Z0 + 0.056 + 0.003 * this.hands.length)); m.layers.set(NOINK); S.add(m); this.hands.push(m); }
      // a small framed photo + a light switch between the board and the door
      face(posterTex(2), 0.22, 0.3, wp(1.55, 1.6, Z0 + 0.012), 0, 0.85); bx(trim, 0.08, 0.12, 0.012, 1.58, 1.18, Z0 + 0.006); }
    // the waste bin by the board, crumpled paper ideas in and round it
    { const wx = -0.95, wz = -2.38, paper = C("#f2efe6");
      geo(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 18, 1, true).translate(0, 0.17, 0), TM("ofBin", () => rep(SP.steelTex(), 2, 1), { color: "#5c6a7a", side: THREE.DoubleSide }), wx, 0, wz);
      geo(new THREE.CircleGeometry(0.12, 18).rotateX(-Math.PI / 2), dark, wx, 0.01, wz);
      const balls: [number, number, number][] = [[0.02, 0.3, 0.01], [-0.05, 0.31, -0.04], [0.06, 0.33, 0.04], [0.3, 0.05, 0.12], [-0.28, 0.05, 0.2], [0.12, 0.05, 0.34], [0.5, 0.05, -0.02]];
      balls.forEach(([dx, y, dz], i) => { const g2 = new THREE.IcosahedronGeometry(0.055, 1), p2 = g2.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < p2.count; k++) { const q = 1 + 0.28 * (hash(Math.round(p2.getX(k) * 977 + p2.getY(k) * 613 + p2.getZ(k) * 331 + i * 17)) - 0.5); p2.setXYZ(k, p2.getX(k) * q, p2.getY(k) * q * 0.86, p2.getZ(k) * q); }
        g2.computeVertexNormals(); geo(g2, paper, wx + dx, y, wz + dz, i, i * 0.7, i * 1.3); });
      contact(S, wp(wx, 0.012, wz), 0.45, 0.45, 0.4); }

    // ---------------- THE DOOR (pivots on its right jamb, opens into the room) + its frame ----------------
    { const hz = L0(OFFICE.door.hinge)[2];
      tb(trim, DX0 - 0.09, 0, Z0, DX0, DH + 0.09, Z0 + 0.03); tb(trim, DX1, 0, Z0, DX1 + 0.09, DH + 0.09, Z0 + 0.03); tb(trim, DX0 - 0.09, DH, Z0, DX1 + 0.09, DH + 0.09, Z0 + 0.03);
      tb(trim, DX0, 0, Z0 - WT, DX0 + 0.025, DH, Z0); tb(trim, DX1 - 0.025, 0, Z0 - WT, DX1, DH, Z0); tb(trim, DX0, DH - 0.025, Z0 - WT, DX1, DH, Z0);
      const lw = DX1 - DX0 - 0.03, lh = DH - 0.03, dt = 0.045, leaf = new THREE.Group(), dm = TM("ofDoorM", doorTex);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, dt).translate(-lw / 2, lh / 2 + 0.01, 0), dm); slab.castShadow = true; slab.receiveShadow = true; leaf.add(slab);
      const kb = brass as THREE.MeshLambertMaterial;
      for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), kb); k.position.set(-lw + 0.08, 1.0, s * (dt / 2 + 0.035)); leaf.add(k);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 8).rotateX(Math.PI / 2), kb); st.position.set(-lw + 0.08, 1.0, s * (dt / 2 + 0.017)); leaf.add(st);
        const pl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.006), kb); pl.position.set(-lw + 0.08, 0.98, s * (dt / 2 + 0.003)); leaf.add(pl); }
      for (const y of [0.25, 1.05, 1.85]) { const hg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, dt + 0.01), kb); hg.position.set(-0.005, y, 0); leaf.add(hg); }
      this.door.position.set(...wp(DX1 - 0.012, 0, hz - dt / 2)); this.door.add(leaf); S.add(this.door);
      // the corridor beyond: lino, cool walls, a ceiling, the far wall painting; a cool ceiling panel light
      const cool = C("#d3dacd");
      fb.add(new THREE.PlaneGeometry(4.0, -CZ + Z0 - WT + 0.02).rotateX(-Math.PI / 2), TM("ofLinoM", () => rep(linoTex(), 2, 2)), M(O[0] + 2.3, O[1] + 0.002, O[2] + (Z0 - WT + CZ) / 2));
      tb(cool, 0.2, 0, CZ, 0.3, H, Z0 - WT); tb(cool, 4.3, 0, CZ, 4.4, H, Z0 - WT); tb(cool, 0.2, H - 0.05, CZ, 4.4, H + 0.1, Z0 - WT, 0, true, true);
      face(corridorTex(), 4.1, 3.1, wp(2.3, 1.55, CZ + 0.012), 0, 0.82, [0.95, 1, 1]);
      { const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.55, 1.6) })); lp.position.set(...wp(2.3, H - 0.06, -3.9)); lp.layers.set(NOINK); S.add(lp); } }

    // ---------------- the coat rack (right of the door): a coat, a scarf, a hat, an umbrella ----------------
    { const cx = 3.12, cz = -2.28, pole = C("#5a3a24");
      seg(pole, [cx, 0.05, cz], [cx, 1.82, cz], 0.022, 10); geo(new THREE.SphereGeometry(0.035, 12, 8), pole, cx, 1.85, cz);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.3; seg(pole, [cx, 0.3, cz], [cx + 0.3 * Math.cos(a), 0.02, cz + 0.3 * Math.sin(a)], 0.016); }
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.5; seg(pole, [cx, 1.66, cz], [cx + 0.14 * Math.cos(a), 1.74, cz + 0.14 * Math.sin(a)], 0.01); }
      // the coat: a soft camel shape hanging off a hook
      { const g = new THREE.CylinderGeometry(0.12, 0.26, 1.05, 14, 6, true), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setX(i, p.getX(i) * (1 + 0.08 * Math.sin(a * 5))); p.setZ(i, p.getZ(i) * 0.55); }
        g.computeVertexNormals(); geo(g, fab("#b38a5c", THREE.DoubleSide), cx - 0.12, 1.12, cz + 0.08, -0.6); }
      { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.95), TM("ofScarfM", scarfTex, { side: THREE.DoubleSide })); m.position.set(...wp(cx + 0.06, 1.25, cz + 0.12)); m.rotation.set(0, -0.8, 0.05); m.castShadow = true; S.add(m);
        this.swings.push({ m, base: m.rotation.clone(), a: [0.015, 0, 0.02], w: 0.4, ph: 2 }); }
      geo(cylY(0.13, 0.012, 20), C("#5a4a3a"), cx + 0.1, 1.76, cz - 0.04, 0, 0.1); geo(cylY(0.075, 0.09, 16, false, 0.085), C("#5a4a3a"), cx + 0.1, 1.77, cz - 0.04, 0, 0.1); geo(cylY(0.077, 0.02, 16), C("#2a2430"), cx + 0.1, 1.79, cz - 0.04, 0, 0.1);
      seg(C("#2c3a5c"), [cx - 0.28, 0.02, cz + 0.12], [cx - 0.2, 0.86, cz + 0.02], 0.035); seg(dark, [cx - 0.2, 0.86, cz + 0.02], [cx - 0.19, 0.95, cz + 0.01], 0.012);
      contact(S, wp(cx, 0.012, cz), 0.7, 0.7, 0.4); }

    // ---------------- the east wall: filing cabinet (a plant, folders, a radio), posters, cork board ----------------
    { const fx0 = X1 - 0.5, z0 = -1.55, z1 = -0.95, cab = C("#7d8a86");
      tb(cab, fx0, 0, z0, X1, 1.3, z1); for (let k = 0; k < 3; k++) { const y = 0.12 + k * 0.4; tb(C("#8e9b96"), fx0 - 0.015, y, z0 + 0.03, fx0, y + 0.36, z1 - 0.03); bx(steel, 0.02, 0.025, 0.18, fx0 - 0.03, y + 0.28, (z0 + z1) / 2); bx(C("#f0ece0"), 0.004, 0.05, 0.09, fx0 - 0.017, y + 0.2, (z0 + z1) / 2); }
      geo(cylY(0.1, 0.16, 16, false, 0.08), C("#e6d8bc"), fx0 + 0.25, 1.3, z0 + 0.15);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.34), TM("ofTrail", leafTex, { side: THREE.DoubleSide, alphaTest: 0.4 }));
        m.position.set(...wp(fx0 + 0.25 + 0.08 * Math.cos(a), 1.5, z0 + 0.15 + 0.08 * Math.sin(a))); m.rotation.set(0.9 * Math.sin(a), -a, 0.9 * Math.cos(a), "YXZ"); m.castShadow = true; S.add(m);
        this.swings.push({ m, base: m.rotation.clone(), a: [0.03, 0.02, 0.03], w: 0.32, ph: k * 0.9 }); }
      for (let k = 0; k < 4; k++) bx(C(["#d8a040", "#3a6aa8", "#c8503a", "#4a8a5a"][k]), 0.26, 0.02, 0.34, fx0 + 0.22, 1.31 + 0.02 * k, z1 - 0.2, 0.05 * k);
      bx(C("#8a3b32"), 0.12, 0.09, 0.2, fx0 + 0.22, 1.43, z1 - 0.2); geo(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12).rotateZ(Math.PI / 2), C("#e8dcc0"), fx0 + 0.155, 1.44, z1 - 0.25);
      contact(S, wp((fx0 + X1) / 2, 0.012, (z0 + z1) / 2), 0.7, 0.8, 0.45);
      face(posterTex(0), 0.62, 0.87, wp(X1 - 0.012, 1.7, -0.1), -Math.PI / 2, 0.86);
      face(posterTex(2), 0.36, 0.5, wp(X1 - 0.012, 1.75, 0.65), -Math.PI / 2, 0.85);
      face(posterTex(3), 0.9, 1.26, wp(X1 - 0.012, 1.62, 1.65), -Math.PI / 2, 0.86); }

    // ---------------- THE DESK (front right) ----------------
    { const dc = L0(OFFICE.desk.c), w = OFFICE.desk.w, d = OFFICE.desk.d, top = OFFICE.desk.top, xa = dc[0] - w / 2, xb = dc[0] + w / 2, za = dc[2] - d / 2, zb = dc[2] + d / 2;
      tb(honey, xa - 0.02, top - 0.04, za - 0.02, xb + 0.02, top, zb + 0.02);
      for (const [p0, p1] of [[xa, xa + 0.44], [xb - 0.44, xb]]) { tb(honey, p0, 0, za + 0.02, p1, top - 0.04, zb); for (let k = 0; k < 3; k++) { const y = 0.06 + k * 0.23; tb(C("#a8743e"), p0 + 0.02, y, za + 0.005, p1 - 0.02, y + 0.2, za + 0.02); bx(brass, 0.1, 0.018, 0.02, (p0 + p1) / 2, y + 0.15, za - 0.004); } }
      tb(honey, xa + 0.44, 0.3, za + 0.04, xb - 0.44, top - 0.04, za + 0.06);
      const t = top;
      // papers (fanned), a notepad, three books, the mug, the lamp, a pen cup, an apple, a photo frame
      for (let k = 0; k < 4; k++) bx(C(k % 2 ? "#f4efe2" : "#fbf8ef"), 0.21, 0.003, 0.297, dc[0] - 0.15 + 0.03 * k, t + 0.002 + 0.002 * k, dc[2] - 0.02, 0.25 - 0.18 * k);
      bx(C("#f6dc6a"), 0.15, 0.012, 0.2, dc[0] + 0.15, t + 0.006, dc[2] + 0.16, -0.3);
      for (let k = 0; k < 3; k++) bx(TM("ofBkD" + k, () => bookTex(["#2f4468", "#8a3b32", "#3e5e46"][k], k + 3)), 0.24 - 0.02 * k, 0.05, 0.17 - 0.01 * k, xa + 0.2, t + 0.025 + 0.05 * k, dc[2] - 0.1, 0.12 * (k - 1));
      { const mx = dc[0] + 0.33, mz = dc[2] + 0.1, mug = C("#c8503a");
        geo(cylY(0.045, 0.1, 18, true, 0.042), mug, mx, t, mz); geo(new THREE.CircleGeometry(0.04, 16).rotateX(-Math.PI / 2), C("#5a3420"), mx, t + 0.085, mz);
        geo(new THREE.TorusGeometry(0.028, 0.009, 8, 16), mug, mx + 0.05, t + 0.05, mz, 0.3);
        for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.28), new THREE.MeshBasicMaterial({ map: wispTex(), transparent: true, depthWrite: false, opacity: 0.5, color: new THREE.Color(1.1, 1.05, 1.0) }));
          s.position.set(...wp(mx, t + 0.22, mz)); s.layers.set(NOINK); s.renderOrder = 6; S.add(s); this.steam.push(s); } }
      { const lx = xb - 0.22, lz = dc[2] - 0.12;                                                   // the brass banker's lamp, on (a warm bulb)
        geo(cylY(0.09, 0.025, 20), brass, lx, t, lz); seg(brass, [lx, t + 0.02, lz], [lx - 0.02, t + 0.36, lz], 0.012); seg(brass, [lx - 0.02, t + 0.36, lz], [lx - 0.17, t + 0.4, lz + 0.03], 0.01);
        geo(new THREE.ConeGeometry(0.11, 0.12, 20, 1, true), fab("#3a5e48", THREE.DoubleSide), lx - 0.2, t + 0.36, lz + 0.03);
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.2) })); bl.position.set(...wp(lx - 0.2, t + 0.33, lz + 0.03)); bl.layers.set(NOINK); S.add(bl); }
      geo(cylY(0.035, 0.1, 14, true), C("#2c3a5c"), xa + 0.5, t, dc[2] + 0.22); for (let k = 0; k < 4; k++) seg(C(["#e0a640", "#c8302a", "#2a2a2a", "#3a7a4a"][k]), [xa + 0.5 + 0.012 * (k - 1.5), t + 0.05, dc[2] + 0.22], [xa + 0.5 + 0.03 * (k - 1.5), t + 0.2, dc[2] + 0.22 + 0.01 * k], 0.005);
      geo(new THREE.SphereGeometry(0.04, 14, 10), C("#c8302a"), dc[0] - 0.42, t + 0.04, dc[2] + 0.2); seg(C("#5a3a24"), [dc[0] - 0.42, t + 0.075, dc[2] + 0.2], [dc[0] - 0.41, t + 0.1, dc[2] + 0.2], 0.004);
      bx(woodD, 0.16, 0.12, 0.012, dc[0] + 0.05, t + 0.06, zb - 0.1, 0.4, -0.15);
      // the chair behind it (leather, swivel)
      { const chx = dc[0] + 0.1, chz = zb + 0.42, lea = C("#7a3e26"); geo(cylY(0.03, 0.4, 10), steel, chx, 0.06, chz);
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; seg(steel, [chx, 0.07, chz], [chx + 0.3 * Math.cos(a), 0.04, chz + 0.3 * Math.sin(a)], 0.018); }
        bx(lea, 0.52, 0.09, 0.5, chx, 0.48, chz); bx(lea, 0.5, 0.62, 0.09, chx, 0.84, chz + 0.25, 0, -0.1); }
      contact(S, wp(dc[0], 0.012, dc[2]), w + 0.4, d + 0.4, 0.45); }

    // ---------------- the plant (front left) and a reading chair ----------------
    { const px = -2.45, pz = 0.55; geo(cylY(0.17, 0.36, 20, false, 0.21), C("#c0623e"), px, 0, pz); geo(new THREE.CircleGeometry(0.19, 18).rotateX(-Math.PI / 2), C("#4a3424"), px, 0.33, pz);
      seg(C("#5a4030"), [px, 0.33, pz], [px + 0.04, 1.55, pz - 0.03], 0.025);
      for (let k = 0; k < 13; k++) { const y = 0.75 + 0.07 * k, a = k * 2.4, m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.32), TM("ofFig", leafTex, { side: THREE.DoubleSide, alphaTest: 0.4 }));
        m.position.set(...wp(px + 0.17 * Math.cos(a), y, pz + 0.17 * Math.sin(a))); m.rotation.set(0.5, -a + Math.PI / 2, 0.25 * Math.sin(a * 1.3), "YXZ"); m.castShadow = true; m.receiveShadow = true; S.add(m);
        this.swings.push({ m, base: m.rotation.clone(), a: [0.03, 0.03, 0.03], w: 0.28 + 0.05 * hash(k), ph: k * 0.7 }); }
      contact(S, wp(px, 0.012, pz), 0.6, 0.6, 0.5); }
    // the pendant lamp over the rug (off: daylight)
    { const lx = 0.15, lz = -0.6; seg(dark, [lx, H, lz], [lx, 2.45, lz], 0.006, 6); geo(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 24, 1, true), fab("#efe2c8", THREE.DoubleSide), lx, 2.36, lz); }

    // ---------------- light: three warm SHEETS of sun from the window panes + dust motes in them ----------------
    { const d = V(-OFFICE_KEY[0], -OFFICE_KEY[1], -OFFICE_KEY[2]).normalize(), Lb = 7.4;
      for (const [zk, k, w0] of [[-1.78, 0.8, 1], [-1.4, 0.6, 1], [-1.05, 1, 1], [-0.7, 0.65, 1], [-0.32, 0.85, 1]] as number[][]) {
        const A = V(...wp(X0 - 0.1, WY0 + 0.05, zk)), B = V(...wp(X0 - 0.1, WY1 - 0.05, zk)), Cc = B.clone().addScaledVector(d, Lb), D = A.clone().addScaledVector(d, Lb);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([A, D, Cc, A, Cc, B].flatMap((p) => [p.x, p.y, p.z]), 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
        const m = new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, color: new THREE.Color(1.0, 0.8, 0.52), opacity: 0.1 * k * w0 });
        const sh = new THREE.Mesh(g, m); sh.layers.set(NOINK); sh.renderOrder = 7; sh.frustumCulled = false; S.add(sh); this.shafts.push(m); }
      this.motes = new Motes(S, 110, 17, O, [-2.6, 0.3, -2.6], [1.6, 2.3, -0.3], new THREE.Color(1.0, 0.86, 0.6), 0.014, 0.12, 0.015); }
    // a bird that crosses the window view now and then
    this.bird = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex(0), transparent: true, depthWrite: false, fog: false })); this.bird.layers.set(NOINK); this.bird.scale.set(0.5, 0.25, 1); S.add(this.bird);

    face(posterTex(3), 0.62, 0.44, wp((DX0 + DX1) / 2, 2.56, Z0 + 0.012), 0, 0.84);   /* p3 (audit polish 4): a pin board on the bare plaster above the door */
    // ---------------- p3: more life ----------------
    { const dc = L0(OFFICE.desk.c), t = OFFICE.desk.top, paper = C("#fbf8ef");
      /* loose sheets: three on the desk, one on the cabinet, two pinned notes by the door (they lift in the door's draught) */
      const spots: [number, number, number, number][] = [[dc[0] - 0.42, t + 0.012, dc[2] - 0.22, 0.5], [dc[0] + 0.02, t + 0.016, dc[2] - 0.24, -0.3], [dc[0] - 0.5, t + 0.012, dc[2] + 0.05, 1.2], [X1 - 0.3, 1.39, -1.2, 0.2]];
      spots.forEach(([x, y, z, ry], k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297).rotateX(-Math.PI / 2).translate(0, 0, 0.1485), paper as THREE.Material); m.position.set(...wp(x, y, z)); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; S.add(m); this.loose.push({ m, p: [x, y, z], ry, k }); });
      /* the wall clock's pendulum (a brass rod and bob under the dial) */
      const b0 = L0(OFFICE.board.c)[0]; this.pend.position.set(...wp(b0, 2.5 - 0.2, Z0 + 0.03));
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.13, 0.006).translate(0, -0.065, 0), brass as THREE.Material), bob = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16).rotateX(Math.PI / 2).translate(0, -0.14, 0), brass as THREE.Material);
      this.pend.add(rod, bob); S.add(this.pend);
      /* a little desk fan on the desk's left end: it turns its head slowly, the blades are a soft blur */
      this.fan.position.set(...wp(dc[0] - 0.62, t, dc[2] + 0.24)); const st = steel as THREE.Material;
      this.fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 16).translate(0, 0.01, 0), st), new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8).translate(0, 0.1, 0), st));
      this.fanHead.position.set(0, 0.2, 0);
      this.fanHead.add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 6, 24), st), new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10).rotateX(Math.PI / 2).translate(0, 0, -0.03), st));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.078, 24), new THREE.MeshBasicMaterial({ map: SP.jetTex(), color: new THREE.Color(0.75, 0.8, 0.88), transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide })); disc.layers.set(NOINK); disc.name = "blades"; this.fanHead.add(disc);
      for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.07).translate(0, 0.04, 0.002), new THREE.MeshBasicMaterial({ color: "#5c6a7a", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); bl.rotation.z = (k / 3) * TAU; bl.layers.set(NOINK); bl.name = "blade"; this.fanHead.add(bl); }
      this.fan.add(this.fanHead); this.fan.rotation.y = -0.9; S.add(this.fan);
      /* the tree outside the window: leaf-cluster boughs between the glass and the painted view; they sway in the gusts */
      this.fol = new Foliage(S);
      this.fol.dress(wp(X0 - 2.2, 2.9, -1.9), [1.3, 1.1, 1.5], { n: 46, size: [0.7, 1.05], seed: 301, groups: 2, amp: 0.05, guard: false, cast: false, hemi: [1, -0.1, 0], tone: -0.1, swap: false });
      this.fol.dress(wp(X0 - 2.6, 2.2, 0.4), [1.2, 0.9, 1.2], { n: 36, size: [0.7, 1.0], seed: 302, groups: 2, amp: 0.05, guard: false, cast: false, hemi: [1, 0, 0], tone: -0.16, swap: false }); }
    buildInk(cb, S, 1, true); buildInk(fb, S, 1, false);
  }

  pose(ctx: SetCtx, L: Lighting) {
    setVF(ctx.vf);
    const f = ctx.f, t = VF / 30;
    // the door
    this.door.rotation.y = officeDoorYaw(f);
    // p3: the door's draught lifts the loose sheets (a quick flap that settles in ~1.5 s), the pendulum, the fan, the tree
    { const td = f - OFFICE.door.openF;
      for (const q of this.loose) { const u = Number.isFinite(td) ? td - 5 - 3 * q.k : -1, e = u > 0 ? Math.exp(-u / 16) * (1 - Math.exp(-u / 2.5)) : 0, w = e * Math.sin(u * 0.55 + q.k), idle = 0.012 * (0.5 + 0.5 * Math.sin(vph(0.8) + q.k * 2));
        q.m.rotation.set(-(0.55 * e + 0.5 * Math.max(0, w) * 0.6 + idle), q.ry + 0.2 * w, 0.12 * w, "YXZ"); q.m.position.set(...wp(q.p[0] - 0.05 * e, q.p[1] + 0.02 * e, q.p[2] + 0.03 * e)); }
      this.pend.rotation.z = 0.3 * Math.sin((VF / 30) * Math.PI * 2 * 0.9);
      this.fanHead.rotation.y = 0.7 * Math.sin(vph(0.55)); for (const c of this.fanHead.children) if (c.name === "blade") c.rotation.z += 0;
      this.fanHead.children.forEach((c, i) => { if (c.name === "blade") c.rotation.z = (i / 3) * TAU + VF * 2.3; if (c.name === "blades") c.rotation.z = VF * 1.1; });
      this.fol.pose(VF); }
    // curtains, leaves inside and out, the scarf: slow small sways (whole cycles on the loop clock)
    for (const s of this.swings) { const p = vph(s.w) + s.ph;
      s.m.rotation.set(s.base.x + s.a[0] * Math.sin(p), s.base.y + s.a[1] * Math.sin(p * 0.7 + 1), s.base.z + s.a[2] * Math.sin(p * 1.3 + 2), s.base.order); }
    // the shafts breathe (a thin cloud drifting over the sun, never off)
    const br = 0.86 + 0.1 * vs(0.21, 0.4) + 0.04 * vs(0.53, 1.1);
    this.shafts.forEach((m, i) => { m.opacity = [0.13, 0.08, 0.16, 0.09, 0.13][i] * br; });
    this.motes.pose(t, 3);
    // the mug's steam: three wisps rising and fading in turn, turned to the lens
    const camPos = ctx.cam.position;
    const dc = L0(OFFICE.desk.c);
    this.steam.forEach((s, i) => { const u = (((t * 0.55 + i / 3) % 1) + 1) % 1;
      s.position.set(...wp(dc[0] + 0.33 + 0.02 * Math.sin(t * 1.7 + i * 2), OFFICE.desk.top + 0.14 + 0.2 * u, dc[2] + 0.1));
      s.lookAt(camPos.x, s.position.y, camPos.z); (s.material as THREE.MeshBasicMaterial).opacity = 0.42 * sm(u / 0.2) * (1 - sm((u - 0.6) / 0.4)); s.scale.set(0.8 + 0.6 * u, 0.7 + 0.5 * u, 1); });
    // the clock: 3:41 and running; the second hand ticks once a second with a little bounce
    { const sec = Math.floor(t), kick = t - sec, k2 = kick - 1 / 6, s = sec - 1 + Math.min(1, kick * 6) + (k2 > 0 ? 0.05 * Math.exp(-k2 * 14) * Math.sin(k2 * 40) : 0), min = 41 + t / 60;
      this.hands[0].rotation.z = -((3 + min / 60) / 12) * TAU; this.hands[1].rotation.z = -(min / 60) * TAU; this.hands[2].rotation.z = -(((s % 60) + 60) % 60 / 60) * TAU; }
    // a bird crosses the view (every ~7 s, alternate ways)
    { const P = 210, n = Math.floor(VF / P), u = (VF - n * P) / 70, dir = n % 2 ? 1 : -1, fl = Math.floor(VF / 3) % 3;
      this.bird.visible = u < 1;
      const tex = birdTex(fl); const bm = this.bird.material as THREE.SpriteMaterial; if (bm.map !== tex) { bm.map = tex; bm.needsUpdate = true; }
      this.bird.position.set(...wp(X0 - 4.5 - 2 * hash(n), 3.1 + 0.6 * hash(n * 3) + 0.15 * Math.sin(u * 9), -1 + dir * (-6 + 12 * clamp01(u)))); }
    // light pools: the sun patch's warm bounce, a soft room fill, the desk lamp, the corridor's cool light
    L.pool(wp(-0.2, 0.25, -1.7), [0.13, 0.085, 0.045], 4.0);
    L.pool(wp(0.6, 1.7, 0.4), [0.045, 0.032, 0.024], 6.5);
    L.pool(wp(OFFICE.desk.c[0] - O[0] + 0.5, OFFICE.desk.top + 0.33, OFFICE.desk.c[2] - O[2] - 0.09), [0.4, 0.26, 0.11], 1.3);
    L.pool(wp(2.3, 2.4, -3.8), [0.15, 0.17, 0.19], 3.4);
    void rrect; void jit; void TAU;
  }
}

// TRADING ROOM painters (owner TRADING): every hand-painted canvas of the Mizuho trading room, 2005 (carpet tiles,
// ceiling grid, light panels, plaster, laminate, fabric, the window view of Tokyo towers in three parallax layers for
// the morning and the evening, the venetian blinds, the 2005 LCD screens, the LED ticker, clocks, boards, the bill's
// props: certificates, ghost certificates, cash envelopes, the trucks' stripe, the receipt).
import * as THREE from "three";
import { tx, G, R, TAU, jit, shadeHex, rgba, font, ctext, rrect, speck, mottle, grain, hash } from "./setkit";

const SANS = 'Arial, "Helvetica Neue", sans-serif';
const BLACK = '"Arial Black", Arial, sans-serif';
const MONO = '"Lucida Console", "Courier New", monospace';
const NARROW = 'Impact, "Arial Narrow", "Arial Black", sans-serif';

// ---------------------------------------------------------------------------------------------------------- shell
/** grey-blue carpet tiles (0.5 m, quarter-turned pile), 2 m tile */
export const carpetTex = () => tx("trCarpet", 1024, 1024, (g, r) => {
  const T = 256;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x = i * T, y = j * T, hor = (i + j) % 2 === 0;
    g.fillStyle = jit(r, hor ? "#3f7f78" : "#478a80", 0.035, 3); g.fillRect(x, y, T, T);   // fix2: teal-green tiles
    for (let k = 0; k < 90; k++) {
      g.strokeStyle = rgba(r() < 0.5 ? "#2f665f" : "#69a79c", 0.16); g.lineWidth = 1 + r() * 1.6; g.beginPath();
      if (hor) { const yy = y + r() * T; g.moveTo(x, yy); g.lineTo(x + T, yy + (r() - 0.5) * 5); } else { const xx = x + r() * T; g.moveTo(xx, y); g.lineTo(xx + (r() - 0.5) * 5, y + T); }
      g.stroke();
    }
  }
  speck(g, r, 1024, 1024, 16000, ["#2c5f58", "#7fb4a8", "#3a746c", "#7c7a60", "#28544e"], 1, 3, 0.42);
  mottle(g, r, 1024, 1024, 90, ["#28544e", "#74aea2"], 30, 120, 0.06);
  g.fillStyle = "rgba(30,36,50,0.35)"; for (let k = 0; k <= 4; k++) { g.fillRect(k * T - 1, 0, 2, 1024); g.fillRect(0, k * T - 1, 1024, 2); }
});
/** suspended ceiling: 0.6 m mineral tiles in a T-bar grid (1.2 m tile) */
export const ceilTex = () => tx("trCeil", 512, 512, (g, r) => {
  g.fillStyle = "#e2e3df"; g.fillRect(0, 0, 512, 512);
  speck(g, r, 512, 512, 5000, ["#b8bab4", "#c9cac4", "#a8aaa4"], 1, 2.6, 0.5);
  for (let i = 0; i < 260; i++) { g.strokeStyle = "rgba(150,152,146,0.35)"; g.lineWidth = 1; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 14); g.stroke(); }
  for (const k of [0, 256]) { g.fillStyle = "#f2f2ee"; g.fillRect(k, 0, 10, 512); g.fillRect(0, k, 512, 10); g.fillStyle = "rgba(90,92,96,0.35)"; g.fillRect(k + 10, 0, 3, 512); g.fillRect(0, k + 10, 512, 3); }
});
/** a 0.6 x 1.2 m fluorescent troffer: prismatic diffuser, aluminium frame (unlit, glows) */
export const trofferTex = () => tx("trTroffer", 256, 512, (g) => {
  g.fillStyle = "#c8ccd0"; g.fillRect(0, 0, 256, 512);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "#e8eef2"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, "#e8eef2");
  g.fillStyle = gr; g.fillRect(14, 14, 228, 484);
  g.strokeStyle = "rgba(170,190,205,0.35)"; g.lineWidth = 1;
  for (let k = -512; k < 512; k += 12) { g.beginPath(); g.moveTo(14 + k, 14); g.lineTo(14 + k + 484, 498); g.stroke(); g.beginPath(); g.moveTo(242 - k, 14); g.lineTo(242 - k - 484, 498); g.stroke(); }
  g.fillStyle = "rgba(160,170,180,0.5)"; g.fillRect(126, 14, 4, 484);
  g.strokeStyle = "#9aa0a6"; g.lineWidth = 6; g.strokeRect(10, 10, 236, 492);
}, true);
/** pale office plaster (2 m tile) */
export const plasterTex = (key: string, base: string) => tx(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  mottle(g, r, 512, 512, 180, [shadeHex(base, 0.04), shadeHex(base, -0.05)], 20, 80, 0.12);
  speck(g, r, 512, 512, 1500, [shadeHex(base, -0.12), shadeHex(base, 0.07)], 1, 2.4, 0.22);
});
/** the window wall's low spandrel: an HVAC grille cabinet under the glass (1 m x 0.9 m) */
export const sillTex = () => tx("trSill", 512, 460, (g, r) => {
  g.fillStyle = "#8a929c"; g.fillRect(0, 0, 512, 460);
  g.fillStyle = "#6e7680"; g.fillRect(0, 0, 512, 46);
  for (let y = 70; y < 420; y += 14) { g.fillStyle = "#59616b"; g.fillRect(30, y, 452, 6); g.fillStyle = "rgba(220,226,232,0.35)"; g.fillRect(30, y + 6, 452, 2); }
  g.strokeStyle = "#4e565f"; g.lineWidth = 4; g.strokeRect(28, 66, 456, 360); g.fillStyle = "#3e444c"; g.fillRect(0, 440, 512, 20);
  speck(g, r, 512, 460, 600, ["#5a626c", "#b0b8c0"], 1, 2, 0.25);
});
/** light grey laminate desk top (1 m tile) */
export const deskTex = () => tx("trDesk", 512, 512, (g, r) => {
  g.fillStyle = "#cf9f62"; g.fillRect(0, 0, 512, 512);   // fix2: warm honey wood
  mottle(g, r, 512, 512, 120, ["#bd8a4c", "#e0b67c"], 20, 70, 0.16);
  for (let y = 0; y < 512; y += 5) { g.strokeStyle = rgba(r() < 0.5 ? "#a8743a" : "#e8c48e", 0.14 + 0.1 * r()); g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(0, y + r() * 3); g.bezierCurveTo(170, y + (r() - 0.5) * 9, 340, y + (r() - 0.5) * 9, 512, y + r() * 3); g.stroke(); }
  speck(g, r, 512, 512, 1500, ["#a06c34", "#ecd0a0"], 1, 2, 0.22);
  for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(110,70,30,0.14)"; g.lineWidth = 1; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + 30 + r() * 80, y + (r() - 0.5) * 8); g.stroke(); }
});
/** blue-grey partition fabric (0.5 m tile) */
export const fabricTex = (key = "trFabric", base = "#5f6e86") => tx(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) { g.fillStyle = rgba(shadeHex(base, r() < 0.5 ? -0.05 : 0.04), 0.5); g.fillRect(0, y, 256, 1); }
  for (let x = 0; x < 256; x += 3) { g.fillStyle = rgba(shadeHex(base, -0.04), 0.3); g.fillRect(x, 0, 1, 256); }
  speck(g, r, 256, 256, 1200, [shadeHex(base, -0.1), shadeHex(base, 0.1)], 1, 2, 0.35);
});
/** chair fabric: charcoal weave */
export const chairTex = () => fabricTex("trChairF", "#33373f");
/** keyboard top: a grid of pale keys */
export const keyboardTex = () => tx("trKeys", 256, 96, (g, r) => {
  g.fillStyle = "#2e3138"; g.fillRect(0, 0, 256, 96);
  for (let row = 0; row < 5; row++) for (let k = 0; k < 15; k++) { const x = 6 + k * 13.4 + (row % 2) * 4, y = 8 + row * 16; if (x > 200) continue; g.fillStyle = jit(r, "#cfcdc4", 0.05); rrect(g, x, y, 11, 13, 2); g.fill(); }
  for (let row = 0; row < 5; row++) for (let k = 0; k < 4; k++) { g.fillStyle = "#c6c4bb"; rrect(g, 210 + k * 11, 8 + row * 16, 9, 13, 2); g.fill(); }
  g.fillStyle = "#cfcdc4"; rrect(g, 60, 72, 100, 13, 2); g.fill();
}, true);
/** stacked paper seen from the side (edges) */
export const paperSideTex = () => tx("trPaperSide", 128, 128, (g, r) => {
  g.fillStyle = "#f2efe6"; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) { g.fillStyle = rgba(r() < 0.3 ? "#c9c2b0" : "#ddd8cc", 0.8); g.fillRect(0, y, 128, 1); }
});
/** a printed page (top of a paper stack): lines of type, a table */
export const pageTex = (k: number) => tx("trPage" + k, 128, 160, (g, r) => {
  g.fillStyle = "#f6f4ee"; g.fillRect(0, 0, 128, 160);
  g.fillStyle = "rgba(40,50,80,0.75)"; g.fillRect(12, 12, 60 + r() * 30, 7);
  for (let y = 30; y < 150; y += 8) { g.fillStyle = "rgba(60,64,80,0.5)"; g.fillRect(12, y, 50 + r() * 54, 3); if (k % 2 && y > 80) { g.fillStyle = "rgba(160,40,40,0.5)"; g.fillRect(96, y, 18, 3); } }
}, true);
export const binderTex = (k: number) => {
  const pal = ["#c8322a", "#ecba2c", "#2c4a8a", "#d8502a", "#f2ca3c", "#2a7a4a"];   // fix2: red and yellow lead
  return tx("trBinder" + k, 64, 256, (g, r) => {
    g.fillStyle = pal[k % pal.length]; g.fillRect(0, 0, 64, 256);
    speck(g, r, 64, 256, 200, ["#000000", "#ffffff"], 1, 2, 0.08);
    g.fillStyle = "#f2efe6"; g.fillRect(10, 40, 44, 80); g.fillStyle = "rgba(40,40,60,0.6)"; for (let y = 52; y < 110; y += 12) g.fillRect(16, y, 32, 4);
    g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.arc(32, 200, 9, 0, TAU); g.fill();
  }, true);
};
/** a white wall with a whiteboard: a hand-drawn chart and a short note in marker */
export const whiteboardTex = () => tx("trWhiteboard", 1024, 512, (g, r) => {
  g.fillStyle = "#f4f6f6"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,130,150,${0.03 + 0.03 * r()})`; g.lineWidth = 20 + r() * 40; g.beginPath(); const x = r() * 1024, y = r() * 512; g.moveTo(x, y); g.lineTo(x + 140, y + (r() - 0.5) * 30); g.stroke(); }
  g.strokeStyle = "#1e3c8a"; g.lineWidth = 6; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 420); g.lineTo(560, 420); g.stroke();
  g.strokeStyle = "#c42a2a"; g.lineWidth = 7; g.beginPath(); g.moveTo(90, 360);
  for (let k = 1; k <= 12; k++) g.lineTo(90 + k * 38, 360 - k * 22 + (r() - 0.5) * 50); g.stroke();
  g.fillStyle = "#1e3c8a"; font(g, 60, BLACK); g.textAlign = "left"; g.fillText("IPO 12/8", 620, 140);
  g.fillStyle = "#1e3c8a"; font(g, 44, SANS, "bold"); g.fillText("J-COM", 620, 220);
  g.strokeStyle = "#1e3c8a"; g.lineWidth = 5; for (let y = 270; y < 420; y += 40) { g.beginPath(); g.moveTo(620, y); g.lineTo(820 + r() * 140, y + (r() - 0.5) * 6); g.stroke(); }
  g.fillStyle = "#c42a2a"; font(g, 44, SANS, "bold"); g.fillText("!!", 940, 140);
}, true);
/** a cork notice board with pinned sheets */
export const noticeTex = () => tx("trNotice", 768, 512, (g, r) => {
  g.fillStyle = "#b88a58"; g.fillRect(0, 0, 768, 512);
  speck(g, r, 768, 512, 9000, ["#8a5e34", "#d2a874", "#6e4a28"], 1, 3, 0.5);
  const cols = ["#f6f4ec", "#f6eaa0", "#e8f0f6", "#f4d6d0", "#f6f4ec"];
  for (let i = 0; i < 11; i++) {
    const w = 110 + r() * 70, h = 140 + r() * 70, x = 20 + (i % 5) * 148 + r() * 20, y = 20 + Math.floor(i / 5) * 160 + r() * 30, a = (r() - 0.5) * 0.12;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(a);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h); g.fillStyle = cols[i % 5]; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = "rgba(40,50,90,0.7)"; g.fillRect(-w / 2 + 10, -h / 2 + 12, w * 0.6, 9);
    for (let y2 = -h / 2 + 32; y2 < h / 2 - 10; y2 += 11) { g.fillStyle = "rgba(60,60,70,0.45)"; g.fillRect(-w / 2 + 10, y2, (w - 20) * (0.5 + 0.5 * r()), 4); }
    g.fillStyle = ["#d23a2a", "#2a6ad2", "#2aa24a"][i % 3]; g.beginPath(); g.arc(0, -h / 2 + 6, 7, 0, TAU); g.fill();
    g.restore();
  }
  g.strokeStyle = "#7a7e84"; g.lineWidth = 16; g.strokeRect(0, 0, 768, 512);
}, true);
/** green emergency exit sign (pictogram + EXIT / 非常口) */
export const exitTex = () => tx("trExit", 512, 192, (g) => {
  g.fillStyle = "#1e9a52"; g.fillRect(0, 0, 512, 192);
  g.fillStyle = "#f4fff6"; g.fillRect(20, 20, 150, 152);
  g.fillStyle = "#1e9a52"; g.beginPath(); g.arc(110, 52, 15, 0, TAU); g.fill();
  g.strokeStyle = "#1e9a52"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(100, 72); g.lineTo(84, 118); g.lineTo(110, 150); g.moveTo(84, 118); g.lineTo(56, 146); g.moveTo(98, 84); g.lineTo(124, 104); g.moveTo(96, 82); g.lineTo(66, 94); g.stroke();
  ctext(g, "EXIT", 340, 92, 66, "#f4fff6", 300, BLACK);
  ctext(g, "非常口", 340, 160, 54, "#f4fff6", 300, '"Yu Gothic", "Meiryo", "MS Gothic", sans-serif', "bold");
}, true);
/** a plain-text department sign (navy on pale) */
export const signTex = (key: string, text: string) => tx(key, 1024, 192, (g) => {
  g.fillStyle = "#eef0f2"; g.fillRect(0, 0, 1024, 192);
  g.fillStyle = "#1e3a6e"; g.fillRect(0, 0, 1024, 18); g.fillRect(0, 174, 1024, 18);
  ctext(g, text, 512, 132, 104, "#1e3a6e", 960, SANS, "bold");
}, true);
/** a framed wall calendar (December 2005) */
export const calendarTex = () => tx("trCal", 256, 340, (g, r) => {
  g.fillStyle = "#f6f4ee"; g.fillRect(0, 0, 256, 340); g.fillStyle = "#c42a2a"; g.fillRect(0, 0, 256, 70);
  ctext(g, "12", 128, 56, 54, "#ffffff", 200, BLACK); ctext(g, "2005", 128, 100, 26, "#2a2a34", 200, SANS, "bold");
  for (let k = 0; k < 35; k++) { const x = 16 + (k % 7) * 32, y = 120 + Math.floor(k / 7) * 40; if (k >= 4 && k < 35) { g.fillStyle = k % 7 === 0 ? "#c42a2a" : "#3a3a44"; font(g, 16, SANS, "bold"); g.textAlign = "center"; g.fillText(String(k - 3), x + 12, y + 20); } if (k === 11) { g.strokeStyle = "#c42a2a"; g.lineWidth = 3; g.beginPath(); g.arc(x + 12, y + 14, 15, 0, TAU); g.stroke(); } }
  void r;
}, true);
/** a round office wall clock face: numbers, minute ticks */
export const clockTex = () => tx("trClockF", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#3a3e46"; g.beginPath(); g.arc(256, 256, 254, 0, TAU); g.fill();
  g.fillStyle = "#fbfbf6"; g.beginPath(); g.arc(256, 256, 226, 0, TAU); g.fill();
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU, r0 = k % 5 ? 206 : 190, w = k % 5 ? 3 : 9; g.strokeStyle = "#1a1c22"; g.lineWidth = w; g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 218, 256 - Math.cos(a) * 218); g.stroke(); }
  for (let h = 1; h <= 12; h++) { const a = (h / 12) * TAU; ctext(g, String(h), 256 + Math.sin(a) * 152, 256 - Math.cos(a) * 152 + 22, 64, "#1a1c22", 120, SANS, "bold"); }
}, true);

// ---------------------------------------------------------------------------------------------------------- screens
/** the 2005 LCD screen pages (vertically / horizontally periodic so they can scroll): 0 quotes, 1 line chart, 2 candles,
 *  3 order blotter, 4 news, 5 depth bars */
export const screenTex = (k: number) => tx("trScr" + k, 512, 512, (g, r) => {
  const up = "#38e070", dn = "#ff5a4a", wh = "#e8ecf0";
  if (k === 0 || k === 3) {
    g.fillStyle = k === 0 ? "#05080c" : "#d8dce4"; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 32; row++) {
      const y = row * 16; if (k === 3 && row % 2) { g.fillStyle = "#c4cad6"; g.fillRect(0, y, 512, 16); }
      font(g, 13, MONO, "bold"); g.textAlign = "left";
      const code = String(1000 + Math.floor(r() * 8999)), px = (100 + Math.floor(r() * 9000)).toLocaleString("en-US"), ch = Math.floor(r() * 90) - 40;
      g.fillStyle = k === 0 ? "#9ab4d4" : "#1e2a4a"; g.fillText(code, 8, y + 13);
      g.fillStyle = k === 0 ? wh : "#1e2a4a"; g.fillText(px, 70, y + 13);
      g.fillStyle = ch >= 0 ? (k === 0 ? up : "#1a7a3a") : (k === 0 ? dn : "#b02a1a"); g.fillText((ch >= 0 ? "+" : "") + ch, 170, y + 13);
      g.fillStyle = k === 0 ? "#6a7a90" : "#3a4660"; g.fillText(String(Math.floor(r() * 99999)), 240, y + 13);
      if (k === 0) { g.fillStyle = ch >= 0 ? "rgba(56,224,112,0.5)" : "rgba(255,90,74,0.5)"; g.fillRect(330, y + 4, Math.abs(ch) * 3, 8); }
      else { g.fillStyle = "#1e2a4a"; g.fillText(r() < 0.5 ? "BUY" : "SELL", 330, y + 13); g.fillText(String(Math.floor(r() * 500) * 10), 400, y + 13); }
    }
  } else if (k === 1 || k === 2) {
    g.fillStyle = k === 1 ? "#0a1430" : "#06070a"; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(120,150,200,0.18)"; g.lineWidth = 1; for (let x = 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
    const f = (x: number) => 256 + 70 * Math.sin((x / 512) * TAU * 2 + 0.6) + 40 * Math.sin((x / 512) * TAU * 5 + 1.3) + 18 * Math.sin((x / 512) * TAU * 13);
    if (k === 1) {
      g.strokeStyle = "#ffd24a"; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= 512; x += 4) g.lineTo(x, f(x)); g.stroke();
      g.strokeStyle = "#4ad2ff"; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 512; x += 4) g.lineTo(x, 330 + 0.5 * (f(x) - 256) * Math.cos((x / 512) * TAU)); g.stroke();
      g.fillStyle = "rgba(74,210,255,0.35)"; for (let x = 0; x < 512; x += 8) { const h = 10 + 30 * (0.5 + 0.5 * Math.sin((x / 512) * TAU * 7)); g.fillRect(x, 512 - h, 6, h); }
    } else {
      for (let x = 4; x < 512; x += 16) { const o = f(x), c = f(x + 12), hi = Math.min(o, c) - 6 - r() * 14, lo = Math.max(o, c) + 6 + r() * 14, upc = c < o;
        g.strokeStyle = upc ? up : dn; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5, hi); g.lineTo(x + 5, lo); g.stroke(); g.fillStyle = upc ? up : dn; g.fillRect(x, Math.min(o, c), 10, Math.max(3, Math.abs(c - o))); }
    }
  } else if (k === 4) {
    g.fillStyle = "#0c1a3a"; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row++) { const y = row * 32; g.fillStyle = "#ffd24a"; g.fillRect(8, y + 8, 40, 8); g.fillStyle = "rgba(230,236,245,0.8)"; g.fillRect(56, y + 8, 160 + r() * 280, 8); g.fillStyle = "rgba(230,236,245,0.45)"; g.fillRect(56, y + 20, 100 + r() * 200, 5); }
  } else {
    g.fillStyle = "#070a10"; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 32; row++) { const y = row * 16, a = 20 + r() * 200, b = 20 + r() * 200; g.fillStyle = "rgba(70,140,255,0.8)"; g.fillRect(250 - a, y + 3, a, 10); g.fillStyle = "rgba(255,90,74,0.8)"; g.fillRect(262, y + 3, b, 10); g.fillStyle = wh; g.fillRect(252, y + 5, 8, 6); }
  }
  // the window chrome of a 2005 terminal: a title bar (scrolls with the page, reads as many windows)
  g.fillStyle = k === 3 ? "#2a4a8a" : "rgba(40,70,130,0.9)"; g.fillRect(0, 0, 512, 10);
});

// ---------------------------------------------------------------------------------------------------------- LED ticker
/** a dot-matrix LED strip (amber / green / red) that scrolls; eve = the evening time */
export const LED_TEXT = (eve: boolean) => [
  [eve ? "2005.12.08  18:40" : "2005.12.08  09:27", "#ffb02a"], ["   USD/JPY 120.35 ", "#ffb02a"], ["▲0.12", "#3aff6a"],
  ["   INDEX 15,421 ", "#ffb02a"], ["▲120", "#3aff6a"], ["   BOND 10Y 1.52% ", "#ffb02a"], ["▼0.01", "#ff4a3a"],
  ["   GOLD 548.2 ", "#ffb02a"], ["▲3.1", "#3aff6a"], ["   OIL 59.80 ", "#ffb02a"], ["▼0.42", "#ff4a3a"], ["   ", "#ffb02a"],
] as [string, string][];
export const ledTex = (eve: boolean) => tx("trLed" + (eve ? "E" : "M"), 2048, 64, (g) => {
  g.fillStyle = "#0c0806"; g.fillRect(0, 0, 2048, 64);
  const lo = document.createElement("canvas"); lo.width = 512; lo.height = 16; const l = lo.getContext("2d")!;
  l.fillStyle = "#000"; l.fillRect(0, 0, 512, 16); l.font = 'bold 13px "Lucida Console", "Courier New", monospace'; l.textBaseline = "alphabetic";
  let x = 4; for (const [s, c] of LED_TEXT(eve)) { l.fillStyle = c; l.fillText(s, x, 13); x += l.measureText(s).width; }
  const d = l.getImageData(0, 0, 512, 16).data;
  for (let y = 0; y < 16; y++) for (let i = 0; i < 512; i++) {
    const p = (y * 512 + i) * 4, on = d[p] + d[p + 1] + d[p + 2] > 160;
    g.fillStyle = on ? `rgb(${d[p]},${d[p + 1]},${d[p + 2]})` : "#2a1a12"; g.beginPath(); g.arc(i * 4 + 2, y * 4 + 2, on ? 1.8 : 1.1, 0, TAU); g.fill();
  }
});

// ---------------------------------------------------------------------------------------------------------- window view
export type Tower = { x: number; w: number; top: number; col: string; kind: number; ant: boolean };
/** deterministic tower layouts per layer (metres in the layer plane: x across, top = height above the layer's y0) */
export const towers = (seed: number, x0: number, x1: number, n: number, h0: number, h1: number, w0: number, w1: number): Tower[] => {
  const out: Tower[] = []; let x = x0, i = 0;
  while (x < x1 && i < n) {
    const w = w0 + hash(seed + i * 3.1) * (w1 - w0), top = h0 + hash(seed + i * 7.7) * (h1 - h0);
    out.push({ x: x + w / 2, w, top, col: ["#a8aeb6", "#b8b6ae", "#949cab", "#c4c2ba", "#8a93a2", "#cfccc2"][Math.floor(hash(seed + i * 1.3) * 6)], kind: Math.floor(hash(seed + i * 5.9) * 4), ant: hash(seed + i * 9.1) < 0.35 });
    x += w + (hash(seed + i * 2.3) < 0.45 ? 2.5 + hash(seed + i) * 7 : 0.4); i++;
  }
  return out;
};
export type Layer = { key: string; z: number; w: number; h: number; y0: number; px: number; seed: number; n: number; hh: [number, number]; ww: [number, number]; haze: number };
/** the three parallax layers behind the window wall (z in set-local metres; y0 = the layer's bottom edge) */
export const LAYERS: Layer[] = [
  { key: "near", z: -20, w: 80, h: 36, y0: -16, px: 48, seed: 11, n: 18, hh: [11, 24], ww: [7, 16], haze: 0.08 },
  { key: "mid", z: -55, w: 170, h: 70, y0: -36, px: 13, seed: 37, n: 40, hh: [28, 52], ww: [8, 20], haze: 0.3 },
  { key: "far", z: -140, w: 420, h: 150, y0: -80, px: 5, seed: 71, n: 70, hh: [62, 96], ww: [10, 30], haze: 0.55 },
];
export const layerTowers = (L: Layer) => towers(L.seed, -L.w / 2, L.w / 2, L.n * 2, L.hh[0], L.hh[1], L.ww[0], L.ww[1]);
/** paint one tower layer (alpha outside the towers): eve = backlit dusk (warm windows, rim on the left edges) */
export const layerTex = (L: Layer, eve: boolean) => {
  const W = Math.min(4096, Math.round(L.w * L.px)), H = Math.round((W * L.h) / L.w);
  return tx(`trView_${L.key}_${eve ? "E" : "M"}`, W, H, (g, r) => {
    g.clearRect(0, 0, W, H);
    const s = W / L.w, X = (x: number) => (x + L.w / 2) * s, Y = (y: number) => H - y * s;
    const hazeC = eve ? "#e8a98c" : "#c4d2e4";
    for (const t of layerTowers(L)) {
      const x0 = X(t.x - t.w / 2), x1 = X(t.x + t.w / 2), y1 = Y(t.top), bw = x1 - x0, hz = L.haze;
      // stone / panel colour, the shaded side face (am: the right 30 %; eve: everything but a warm rim on the left)
      let stone = eve ? shadeHex(jit(r, "#5a5672", 0.08), 0.03 * t.kind / 3) : jit(r, t.col, 0.05);
      if (!eve) stone = shadeHex(stone, L.key === "near" ? 0.04 : 0);
      const lit = mixHex(stone, hazeC, hz), side = mixHex(shadeHex(stone, eve ? -0.06 : -0.2), hazeC, hz), xs = x0 + bw * 0.7;
      const glassA = eve ? "#2c2a46" : "#5a7ca8", glassB = eve ? "#e89a70" : "#c8dcf2";
      const face = (xa: number, xb: number, col: string, dark: number) => {
        const w = xb - xa; if (w < 1) return;
        if (t.kind === 2) { // curtain wall: reflective glass with a sky gradient and a thin mullion grid
          const gr = g.createLinearGradient(0, y1, 0, H); gr.addColorStop(0, mixHex(shadeHex(glassB, -dark), hazeC, hz)); gr.addColorStop(0.5, mixHex(shadeHex(glassA, -dark), hazeC, hz)); gr.addColorStop(1, mixHex(shadeHex(glassA, -dark - 0.05), hazeC, hz));
          g.fillStyle = gr; g.fillRect(xa, y1, w, H - y1);
          g.fillStyle = rgba(eve ? "#1a1830" : "#e8eef6", 0.35 - hz * 0.3); for (let x = xa; x < xb; x += 1.5 * s) g.fillRect(x, y1, Math.max(1, 0.12 * s), H - y1); for (let y = y1; y < H; y += 3.6 * s) g.fillRect(xa, y, w, Math.max(1, 0.18 * s));
        } else {
          g.fillStyle = col; g.fillRect(xa, y1, w, H - y1);
          const fl = 3.6 * s;
          for (let y = y1 + fl * 0.35; y < H; y += fl) {
            if (t.kind === 1) { g.fillStyle = mixHex(shadeHex(glassA, -0.12 - dark), hazeC, hz); g.fillRect(xa + w * 0.04, y, w * 0.92, fl * 0.48); }
            const bay = (t.kind === 3 ? 1.2 : 1.8) * s;
            for (let x = xa + bay * 0.3; x < xb - bay * 0.5; x += bay) {
              const on = r() < (eve ? 0.45 : 0.06), ww = t.kind === 3 ? bay * 0.45 : bay * 0.62, wh = t.kind === 1 ? fl * 0.48 : fl * 0.52;
              if (on) g.fillStyle = eve ? rgba(r() < 0.6 ? "#ffd890" : "#fff2c8", 0.95 - hz * 0.4) : rgba("#f2f8ff", 0.9 - hz * 0.5);
              else if (t.kind === 1) continue;
              else g.fillStyle = mixHex(shadeHex(r() < 0.3 ? glassB : glassA, -0.08 - dark), hazeC, hz);
              g.fillRect(x, y, ww, wh);
            }
          }
          if (t.kind === 3) { g.fillStyle = rgba(shadeHex(col, 0.1), 0.6); for (let x = xa; x < xb; x += 1.2 * s) g.fillRect(x, y1, Math.max(1, 0.25 * s), H - y1); }
        }
      };
      face(x0, xs, lit, 0); face(xs, x1, side, eve ? 0.04 : 0.14);
      g.fillStyle = rgba(eve ? "#100c1c" : "#1c2232", 0.25); g.fillRect(xs, y1, Math.max(1, 0.15 * s), H - y1);
      // the roof: a parapet, a machine room, sometimes a red / white antenna
      g.fillStyle = mixHex(shadeHex(stone, -0.1), hazeC, hz); g.fillRect(x0, y1 - 0.6 * s, bw, 0.6 * s);
      if (t.kind !== 2) { g.fillStyle = mixHex(shadeHex(stone, -0.04), hazeC, hz); g.fillRect(x0 + bw * (0.2 + 0.3 * hash(t.x)), y1 - 2.6 * s, bw * 0.3, 2.0 * s); }
      if (t.ant) { const ax = x0 + bw * 0.5; for (let k = 0; k < 6; k++) { g.fillStyle = mixHex(k % 2 ? "#f2f2ee" : "#d2402e", hazeC, hz); g.fillRect(ax - Math.max(1, 0.18 * s), y1 - 0.6 * s - (k + 1) * 1.4 * s, Math.max(2, 0.36 * s), 1.4 * s); } }
      // the sun: eve = a warm rim on the left edge; am = a soft highlight down the lit face's right edge
      if (eve) { const gr = g.createLinearGradient(x0, 0, x0 + bw * 0.2, 0); gr.addColorStop(0, rgba("#ffb070", 0.8 - hz * 0.4)); gr.addColorStop(1, rgba("#ffb070", 0)); g.fillStyle = gr; g.fillRect(x0, y1, bw * 0.2, H - y1); }
      else { g.fillStyle = rgba("#ffffff", 0.12); g.fillRect(x0, y1, bw * 0.7, Math.max(2, 1.2 * s)); }
    }
    // atmospheric depth: haze toward the bottom (the city floor far below)
    const gr = g.createLinearGradient(0, H * 0.62, 0, H); gr.addColorStop(0, rgba(hazeC, 0)); gr.addColorStop(1, rgba(hazeC, 0.5 + L.haze * 0.3));
    g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
    speck(g, r, W, H, Math.round(W * H / 400), ["#000000", "#ffffff"], 1, 2, 0.03);
  }, true);
};
export const mixHex = (a: string, b: string, k: number) => { const A = new THREE.Color(a), B = new THREE.Color(b); return "#" + A.lerp(B, k).getHexString(); };
/** the sky behind the towers (opaque): am = pale winter blue with soft cloud; eve = orange-pink dusk with the low sun glow */
export const skyTex = (eve: boolean) => tx("trSky" + (eve ? "E" : "M"), 1024, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  if (eve) { gr.addColorStop(0, "#6a6ea8"); gr.addColorStop(0.35, "#c88aa0"); gr.addColorStop(0.62, "#f6a878"); gr.addColorStop(0.8, "#ffc890"); gr.addColorStop(1, "#ffd8a8"); }
  else { gr.addColorStop(0, "#6e98d4"); gr.addColorStop(0.4, "#98b8e2"); gr.addColorStop(0.75, "#c6d6ea"); gr.addColorStop(1, "#dce4ee"); }
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  if (eve) { const sg = g.createRadialGradient(300, 400, 0, 300, 400, 300); sg.addColorStop(0, "rgba(255,240,200,1)"); sg.addColorStop(0.12, "rgba(255,214,150,0.9)"); sg.addColorStop(1, "rgba(255,170,110,0)"); g.fillStyle = sg; g.fillRect(0, 0, 1024, 512); }
  for (let i = 0; i < 26; i++) { const x = r() * 1024, y = 60 + r() * 260, w = 90 + r() * 200, h = 10 + r() * 20; g.fillStyle = eve ? rgba(r() < 0.5 ? "#ffd0a8" : "#a87aa0", 0.3) : rgba(r() < 0.6 ? "#f4f8ff" : "#b4c4dc", 0.35); g.beginPath(); g.ellipse(x, y, w, h, 0, 0, TAU); g.fill(); }
}, true);

// ---------------------------------------------------------------------------------------------------------- blinds / light
/** venetian blind slats (alpha gaps between the slats; u across, one slat pitch per v unit) */
export const blindTex = (open: number) => tx("trBlind" + Math.round(open * 100), 64, 64, (g) => {
  g.clearRect(0, 0, 64, 64);
  const h = Math.round(64 * (1 - open)), y0 = (64 - h) / 2, gr = g.createLinearGradient(0, y0, 0, y0 + h);
  gr.addColorStop(0, "#f2f0e8"); gr.addColorStop(0.6, "#d6d4cc"); gr.addColorStop(1, "#b2b0a8");
  g.fillStyle = gr; g.fillRect(0, y0, 64, h);
}, false);
/** the blind stack at the top of a raised blind */
export const blindStackTex = () => tx("trBlindStack", 64, 64, (g) => {
  g.fillStyle = "#cfcdc4"; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = "#a8a69e"; g.fillRect(0, y, 64, 1); g.fillStyle = "#ecebe4"; g.fillRect(0, y + 1, 64, 1); }
}, false);
/** a soft dust-beam (u along the beam) */
export const beamTex = () => tx("trBeam", 256, 64, (g) => {
  const im = g.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = x / 255, v = Math.abs(y / 63 - 0.5) * 2, a = Math.min(1, u * 6) * (1 - u) ** 1.2 * (1 - v * v) ** 1.4;
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
  }
  g.putImageData(im, 0, 0);
}, true);

// ---------------------------------------------------------------------------------------------------------- the bill (shot 12)
/** a share certificate (front): cream with a guilloche border, a seal */
export const certTex = () => tx("trCert", 256, 360, (g, r) => {
  g.fillStyle = "#f4ead0"; g.fillRect(0, 0, 256, 360);
  g.strokeStyle = "#7a5a2a"; g.lineWidth = 6; g.strokeRect(10, 10, 236, 340);
  g.strokeStyle = "rgba(122,90,42,0.5)"; g.lineWidth = 1.5; for (let k = 0; k < 40; k++) { g.beginPath(); g.ellipse(128, 180, 100 - k * 0.8, 150 - k * 1.1, 0, 0, TAU); g.stroke(); if (k > 4) break; }
  ctext(g, "SHARE", 128, 90, 40, "#5a3e1a", 200, '"Times New Roman", Georgia, serif', "bold");
  for (let y = 130; y < 260; y += 18) { g.fillStyle = "rgba(90,62,26,0.45)"; g.fillRect(40, y, 176 * (0.6 + 0.4 * r()), 5); }
  g.fillStyle = "#c43a2a"; g.beginPath(); g.arc(190, 300, 24, 0, TAU); g.fill();
}, true);
/** the stack of certificates seen from the side (paper edges + a red paper band) */
export const certSideTex = () => tx("trCertSide", 128, 128, (g, r) => {
  g.fillStyle = "#efe2c0"; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) { g.fillStyle = rgba(r() < 0.3 ? "#c4b088" : "#dccca4", 0.85); g.fillRect(0, y, 128, 1); }
  g.fillStyle = "#c43a2a"; g.fillRect(52, 0, 24, 128);
});
/** a GHOST certificate: cream at ~35 %, a dashed outline, a faint SHARE */
export const ghostTex = () => tx("trGhost", 256, 360, (g) => {
  g.clearRect(0, 0, 256, 360);
  // fix2 (audit 5): a cool blue-white sheet with a CYAN edge glow, so the ghosts pop off the orange evening wall
  g.fillStyle = "rgba(110,225,255,0.62)"; rrect(g, 8, 8, 240, 344, 10); g.fill();   // fix4 (4): a stronger, more saturated cyan
  g.strokeStyle = "rgba(20,200,255,0.92)"; g.lineWidth = 18; rrect(g, 10, 10, 236, 340, 10); g.stroke();
  g.setLineDash([22, 14]); g.strokeStyle = "rgba(235,252,255,0.98)"; g.lineWidth = 7; rrect(g, 8, 8, 240, 344, 10); g.stroke(); g.setLineDash([]);
  ctext(g, "SHARE", 128, 96, 40, "rgba(255,255,255,0.95)", 200, '"Times New Roman", Georgia, serif', "bold");
  g.strokeStyle = "rgba(255,250,230,0.4)"; g.lineWidth = 5; for (let y = 140; y < 260; y += 22) { g.beginPath(); g.moveTo(44, y); g.lineTo(212, y); g.stroke(); }
  g.setLineDash([10, 8]); g.strokeStyle = "rgba(255,250,230,0.5)"; g.lineWidth = 4; g.beginPath(); g.arc(190, 300, 24, 0, TAU); g.stroke(); g.setLineDash([]);
}, true);
/** fix2: the buy-back trucks' placard (two words, red on white) */
export const boughtTex = () => tx("trBought", 360, 240, (g) => {
  g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 360, 240);
  g.strokeStyle = "#b02018"; g.lineWidth = 12; g.strokeRect(8, 8, 344, 224);
  ctext(g, "BOUGHT", 180, 112, 84, "#b02018", 310, BLACK);
  ctext(g, "BACK", 180, 204, 84, "#b02018", 310, BLACK);
}, true);
/** a brown cash envelope (kraft paper, flap, a yen stamp) */
export const envelopeTex = () => tx("trEnvelope", 256, 160, (g, r) => {
  g.fillStyle = "#b47a44"; g.fillRect(0, 0, 256, 160);
  speck(g, r, 256, 160, 900, ["#8a5a2e", "#d09a62"], 1, 2.5, 0.4);
  g.strokeStyle = "rgba(90,52,20,0.7)"; g.lineWidth = 4; g.beginPath(); g.moveTo(4, 6); g.lineTo(128, 86); g.lineTo(252, 6); g.stroke();
  g.strokeStyle = "rgba(90,52,20,0.9)"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 154);
  g.fillStyle = "#f2e6c8"; g.beginPath(); g.arc(196, 118, 26, 0, TAU); g.fill(); ctext(g, "¥", 196, 133, 40, "#a8281e", 50, BLACK);
}, true);
/** the trucks' cargo box side: white with one plain blue stripe */
export const truckSideTex = () => tx("trTruckSide", 256, 128, (g, r) => {
  g.fillStyle = "#f4f4f0"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#2a62c8"; g.fillRect(0, 70, 256, 22);
  speck(g, r, 256, 128, 300, ["#c8c8c4"], 1, 2, 0.25);
  g.strokeStyle = "rgba(120,120,130,0.6)"; g.lineWidth = 3; g.strokeRect(2, 2, 252, 124);
}, true);
/** the receipt: the repeating body (line items) + the end piece with the TOTAL. Paper 0.75 m wide; the text's up = the
 *  lead end (printed first) */
export const RECEIPT_W = 0.75, RECEIPT_TILE = 1.5, RECEIPT_END = 1.5;
export const receiptBodyTex = () => tx("trRcptBody", 512, 1024, (g, r) => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 512, 1024);
  speck(g, r, 512, 1024, 1500, ["#d8d4c4"], 1, 2, 0.3);
  for (let row = 0; row < 16; row++) {
    const y = row * 64 + 40; font(g, 26, MONO, "bold"); g.textAlign = "left"; g.fillStyle = "#3a3e52";
    g.fillText("BUYBACK", 28, y); g.textAlign = "right"; g.fillText("¥" + (Math.floor(r() * 900 + 100)) + "," + String(Math.floor(r() * 999)).padStart(3, "0") + ",000", 484, y);
    g.fillStyle = "rgba(58,62,82,0.45)"; for (let x = 170; x < 300; x += 12) g.fillRect(x, y - 6, 5, 4);
  }
});
/** centred text squeezed horizontally to fit maxW (keeps the cap height: a condensed receipt face) */
const sqText = (g: G, s: string, x: number, y: number, px: number, col: string, maxW: number) => {
  font(g, px, NARROW); const w = g.measureText(s).width, k = Math.min(1, maxW / w);
  g.save(); g.translate(x, y); g.scale(k, 1); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(s, 0, 0); g.restore();
};
export const receiptEndTex = () => tx("trRcptEnd", 512, 1024, (g, r) => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 512, 1024);
  speck(g, r, 512, 1024, 1500, ["#d8d4c4"], 1, 2, 0.3);
  // top: two more line items (continuing the body), a double rule, then the TOTAL (the end of the paper = the bottom)
  for (let row = 0; row < 3; row++) { const y = row * 64 + 40; font(g, 26, MONO, "bold"); g.textAlign = "left"; g.fillStyle = "#3a3e52"; g.fillText("BUYBACK", 28, y); g.textAlign = "right"; g.fillText("¥" + (Math.floor(r() * 900 + 100)) + ",000,000", 484, y); }
  g.fillStyle = "#3a3e52"; g.fillRect(20, 214, 472, 6); g.fillRect(20, 228, 472, 6);
  ctext(g, "TOTAL:", 256, 400, 150, "#1c2030", 470, NARROW);
  ctext(g, "~¥40,000,000,000", 256, 560, 112, "#b0201a", 486, NARROW);
  g.fillStyle = "#3a3e52"; g.fillRect(20, 620, 472, 6);
  ctext(g, "THANK YOU", 256, 700, 34, "#6a6e82", 300, MONO, "bold");
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 960, 512, 64);   // a clean tail (the clamped last rows stretch over the blank margin)
}, true);

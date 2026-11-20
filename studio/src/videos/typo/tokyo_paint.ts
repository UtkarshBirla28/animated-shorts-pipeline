// TOKYO painters (owner TOKYO): hand-painted canvas textures for the 2005 Tokyo street and the exchange lobby. Plain
// fonts and plain words only (no logos, no brands). Every texture goes through setkit `tx` (cached, seeded by key).
import * as THREE from "three";
import { tx, rng, fnv, G, R, TAU, jit, rgba, shadeHex, speck, mottle, rrect, font, ctext } from "./setkit";

const SANS = 'Arial, "Helvetica Neue", sans-serif';
const BOLD = '"Arial Black", Arial, sans-serif';
const JP = '"Meiryo", "Yu Gothic", "MS Gothic", sans-serif';
const blot = (g: G, x: number, y: number, rad: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};

// ===================================================== STREET =====================================================
/** interlocking concrete pavers (1024 px = 2.4 m): grey + a few terracotta, herringbone-ish, soft joints */
export const paverTex = () => tx("tkPaver", 1024, 1024, (g, r) => {
  g.fillStyle = "#8c8780"; g.fillRect(0, 0, 1024, 1024);
  const bw = 85.33, bh = 42.67;
  for (let row = 0; row < 24; row++) for (let c = -1; c < 13; c++) {
    const x = c * bw + (row % 2 ? bw / 2 : 0), y = row * bh, k = r();
    g.fillStyle = k < 0.06 ? jit(r, "#a88a7a", 0.05) : k < 0.2 ? jit(r, "#9e9a94", 0.05) : jit(r, "#b6b1a8", 0.04);
    g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(x + 2, y + 2, bw - 4, 3);
  }
  speck(g, r, 1024, 1024, 9000, ["#5a5650", "#e8e4dc"], 1, 2.4, 0.18);
  for (let i = 0; i < 18; i++) blot(g, r() * 1024, r() * 1024, 30 + 60 * r(), "#4a4640", 0.12);
  for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(60,58,60,0.45)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + 4 * r(), 3 + 3 * r(), r() * 3, 0, TAU); g.fill(); }
});
/** yellow tactile paving (Japanese guide blocks): 1024 x 256 = 1.2 m x 0.3 m, raised bars */
export const tactileTex = () => tx("tkTactile", 1024, 256, (g, r) => {
  g.fillStyle = "#d8b02a"; g.fillRect(0, 0, 1024, 256);
  for (let b = 0; b < 4; b++) { g.fillStyle = "rgba(90,60,10,0.35)"; g.fillRect(b * 256, 0, 3, 256); }
  for (let b = 0; b < 4; b++) for (let k = 0; k < 4; k++) {
    const x = b * 256 + 40, y = 30 + k * 56; g.fillStyle = "rgba(120,80,10,0.45)"; rrect(g, x + 3, y + 5, 180, 26, 12); g.fill();
    g.fillStyle = "#ecc63e"; rrect(g, x, y, 180, 26, 12); g.fill(); g.fillStyle = "rgba(255,250,220,0.5)"; g.fillRect(x + 10, y + 4, 160, 4);
  }
  speck(g, r, 1024, 256, 1600, ["#7a5a10", "#fff2c0"], 1, 2, 0.2);
});
/** worn white road paint (zebra bars, lane dashes): a little grit + wear */
export const paintTex = () => tx("tkRoadPaint", 256, 256, (g, r) => {
  g.fillStyle = "#e9e6dc"; g.fillRect(0, 0, 256, 256);
  speck(g, r, 256, 256, 1500, ["#8a8884", "#6a6a6e"], 1, 3, 0.35);
  for (let i = 0; i < 6; i++) blot(g, r() * 256, r() * 256, 20 + 30 * r(), "#77767a", 0.3);
});
/** cherry bark: dark grey-brown with horizontal lenticel bands (u around the trunk, v along it, 512 px = 1 m) */
export const barkTex = () => tx("tkBark", 512, 512, (g, r) => {
  g.fillStyle = "#4a3a36"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) blot(g, r() * 512, r() * 512, 30 + 50 * r(), r() < 0.5 ? "#2c2220" : "#6a5852", 0.25);
  for (let i = 0; i < 70; i++) { const y = r() * 512, x = r() * 512, w = 30 + 60 * r(); g.fillStyle = "rgba(160,140,130,0.45)"; g.fillRect(x, y, w, 2.5); g.fillStyle = "rgba(30,20,20,0.5)"; g.fillRect(x, y + 2.5, w, 2); }
  for (let i = 0; i < 18; i++) { let x = r() * 512, y = 0; g.strokeStyle = "rgba(24,16,16,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); while (y < 512) { y += 20 + 30 * r(); x += (r() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); }
  speck(g, r, 512, 512, 3000, ["#2a1e1c", "#8a7a70"], 1, 2.5, 0.25);
});
/** 2005 office tower facade tile: 4 bays x 4 floors = 12.8 x 12.8 m. style 0 grey tile + punched windows, 1 beige
 *  ribbon windows, 2 dark curtain wall, 3 white tile + vertical fins. Some windows lit (fluorescent / warm). */
export const officeTex = (style: number) => tx("tkOffice" + style, 1024, 1024, (g, r) => {
  const W = 1024, bay = W / 4, fl = W / 4;
  const wall = ["#a9a9a6", "#cbbd9f", "#5e6a78", "#d9d6cc"][style];
  g.fillStyle = wall; g.fillRect(0, 0, W, W);
  if (style !== 2) { for (let y = 0; y < W; y += 12) { g.fillStyle = rgba("#3a3a3a", 0.08); g.fillRect(0, y, W, 1.5); } for (let x = 0; x < W; x += 24) { g.fillStyle = rgba("#3a3a3a", 0.05); g.fillRect(x, 0, 1.5, W); } }
  for (let i = 0; i < 40; i++) blot(g, r() * W, r() * W, 40 + 90 * r(), r() < 0.5 ? "#4a4846" : "#ffffff", 0.06);
  const glass = (x: number, y: number, w: number, h: number) => {
    const lit = r(), gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
    if (lit < 0.22) { gr.addColorStop(0, "#f2f0dc"); gr.addColorStop(1, "#d8dcc8"); }
    else if (lit < 0.3) { gr.addColorStop(0, "#f6d8a0"); gr.addColorStop(1, "#e2b878"); }
    else { gr.addColorStop(0, "#9fb6cc"); gr.addColorStop(0.5, "#5f7690"); gr.addColorStop(1, "#3c4c62"); }
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (lit >= 0.3 && r() < 0.6) { const bl = h * (0.15 + 0.55 * r()); g.fillStyle = "#d8d6cc"; g.fillRect(x, y, w, bl); g.fillStyle = "rgba(90,90,90,0.3)"; for (let k = y + 4; k < y + bl; k += 6) g.fillRect(x, k, w, 1.2); }
    if (lit < 0.3) { g.fillStyle = "rgba(255,255,255,0.35)"; for (let k = 0; k < 3; k++) g.fillRect(x + 6, y + 6 + k * (h / 3.2), w - 12, 3); }
    g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(x + w * 0.55, y); g.lineTo(x + w * 0.8, y); g.lineTo(x + w * 0.3, y + h); g.lineTo(x + w * 0.05, y + h); g.closePath(); g.fill();
  };
  for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
    const x0 = b * bay, y0 = f * fl;
    if (style === 0) { for (const k of [0, 1]) { const x = x0 + 22 + k * 118, y = y0 + 70; glass(x, y, 96, 130); g.fillStyle = "#e4e2dc"; g.fillRect(x - 5, y + 130, 106, 8); g.strokeStyle = "rgba(40,40,44,0.6)"; g.lineWidth = 3; g.strokeRect(x, y, 96, 130); } }
    else if (style === 1) { glass(x0, y0 + 96, bay, 120); g.fillStyle = "rgba(60,50,40,0.5)"; g.fillRect(x0, y0 + 216, bay, 4); g.fillStyle = "#3a3c40"; g.fillRect(x0 + bay / 2 - 2, y0 + 96, 4, 120); g.fillRect(x0, y0 + 96, 4, 120); }
    else if (style === 2) { glass(x0 + 4, y0 + 8, bay - 8, fl - 60); g.fillStyle = "#3a4452"; g.fillRect(x0 + 4, y0 + fl - 52, bay - 8, 44); g.fillStyle = "#2a323e"; g.fillRect(x0, y0, 6, fl); g.fillRect(x0, y0 + fl - 54, bay, 5); }
    else { glass(x0 + 30, y0 + 40, bay - 60, fl - 70); g.fillStyle = shadeHex(wall, -0.12); g.fillRect(x0 + bay - 14, y0, 14, fl); g.fillStyle = "#f4f2ec"; g.fillRect(x0 + bay - 22, y0, 8, fl); }
  }
  speck(g, r, W, W, 5000, ["#3a3a3a", "#ffffff"], 1, 2.5, 0.12);
  for (let i = 0; i < 8; i++) { const x = r() * W; g.fillStyle = rgba("#2a2a2a", 0.08); g.fillRect(x, 0, 6 + 8 * r(), W); }
});
/** the exchange's upper stone facade (1024 x 1024 = 9 x 9 m): beige granite, deep vertical window strips */
export const exchangeTex = () => tx("tkExchange", 1024, 1024, (g, r) => {
  g.fillStyle = "#cdbfa4"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 85) for (let x = (y / 85) % 2 ? 0 : 85; x < 1024; x += 170) { g.fillStyle = jit(r, "#cdbfa4", 0.05); g.fillRect(x + 2, y + 2, 166, 81); }
  for (let y = 0; y < 1024; y += 85) { g.fillStyle = "rgba(90,74,56,0.35)"; g.fillRect(0, y, 1024, 2); }
  speck(g, r, 1024, 1024, 14000, ["#8a7a64", "#f2ead8", "#6a5e50"], 1, 2.2, 0.22);
  for (let c = 0; c < 3; c++) { const x = 70 + c * 341; // window strips (one per 3 m bay)
    g.fillStyle = "#6e6250"; g.fillRect(x - 10, 0, 220, 1024);
    for (let f = 0; f < 3; f++) { const y = f * 341 + 40, gr = g.createLinearGradient(x, y, x + 120, y + 260);
      const lit = r() < 0.25; gr.addColorStop(0, lit ? "#f0ecd6" : "#a8bed2"); gr.addColorStop(0.6, lit ? "#dcd8c0" : "#5a708a"); gr.addColorStop(1, lit ? "#c8c4b0" : "#3c4a5e");
      g.fillStyle = gr; g.fillRect(x, y, 200, 262);
      g.fillStyle = "#4a4236"; g.fillRect(x + 98, y, 5, 262); g.fillRect(x, y + 130, 200, 5);
      g.fillStyle = "rgba(255,255,255,0.2)"; g.beginPath(); g.moveTo(x + 120, y); g.lineTo(x + 170, y); g.lineTo(x + 60, y + 262); g.lineTo(x + 10, y + 262); g.closePath(); g.fill();
      g.fillStyle = "#b5a68c"; g.fillRect(x - 10, y + 262, 220, 40); g.fillStyle = "rgba(60,50,40,0.4)"; g.fillRect(x - 10, y + 300, 220, 4); }
  }
});
/** big granite blocks for the podium (1024 = 4 m) */
export const graniteTex = (key = "tkGranite", base = "#b8ab94") => tx(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 256) for (let x = (y / 256) % 2 ? -256 : 0; x < 1024; x += 512) { g.fillStyle = jit(r, base, 0.05); g.fillRect(x + 3, y + 3, 506, 250); }
  speck(g, r, 1024, 1024, 26000, ["#6e6250", "#f4eee0", "#4a4238", "#9a8c78"], 1, 2.4, 0.3);
  for (let y = 0; y < 1024; y += 256) { g.fillStyle = "rgba(70,60,48,0.5)"; g.fillRect(0, y, 1024, 3); for (let x = (y / 256) % 2 ? 256 : 0; x < 1024; x += 512) g.fillRect(x, y, 3, 256); }
  for (let i = 0; i < 20; i++) blot(g, r() * 1024, r() * 1024, 60 + 100 * r(), "#5a4e40", 0.08);
});
/** the glass entrance (4 x 3.6 m): four glass doors, a warm lobby glow beyond, steel frames, reflections */
export const doorsTex = () => tx("tkDoors", 1024, 920, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 920); gr.addColorStop(0, "#c8b48a"); gr.addColorStop(0.5, "#e8d6a8"); gr.addColorStop(1, "#a08a68");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 920);
  // the lobby beyond: a green ticker glow, ceiling lights, a far wall
  g.fillStyle = "rgba(60,150,90,0.55)"; rrect(g, 380, 330, 300, 330, 60); g.fill();
  g.fillStyle = "rgba(120,240,150,0.7)"; for (let k = 0; k < 6; k++) g.fillRect(400, 360 + k * 46, 260, 8);
  for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(255,250,230,0.85)"; g.fillRect(40 + k * 150, 70, 90, 10); }
  g.fillStyle = "rgba(80,64,48,0.5)"; g.fillRect(0, 760, 1024, 160);
  for (let k = 0; k < 9; k++) { const x = 60 + k * 110 + r() * 30, h = 150 + 40 * r(); g.fillStyle = "rgba(40,36,44,0.6)"; rrect(g, x, 770 - h, 34, h, 14); g.fill(); g.beginPath(); g.arc(x + 17, 760 - h - 6, 15, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(255,255,255,0.22)"; for (let k = 0; k < 5; k++) { const x = k * 230 + 40; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x - 90, 920); g.lineTo(x - 160, 920); g.closePath(); g.fill(); }
  g.fillStyle = "#3c4048"; for (const x of [0, 252, 506, 760, 1014]) g.fillRect(x, 0, 12, 920);
  g.fillRect(0, 0, 1024, 18); g.fillRect(0, 900, 1024, 20); g.fillRect(0, 210, 1024, 12);
  g.fillStyle = "#c8ccd4"; for (const x of [228, 278, 736, 786]) g.fillRect(x, 420, 8, 220);
});
/** "TOKYO STOCK / EXCHANGE" in plain bronze letters (alpha, two lines for the vertical frame) for the fascia */
export const signTex = () => tx("tkSign2", 1600, 640, (g) => {
  g.clearRect(0, 0, 1600, 640);
  g.textAlign = "center"; g.textBaseline = "middle";
  const line = (s: string, y: number) => {
    let px = 250; font(g, px, SANS, "bold"); while (g.measureText(s).width > 1540 && px > 40) { px -= 4; font(g, px, SANS, "bold"); }
    g.fillStyle = "rgba(20,12,6,0.6)"; g.fillText(s, 808, y + 8);
    const gr = g.createLinearGradient(0, y - 100, 0, y + 100); gr.addColorStop(0, "#f2d898"); gr.addColorStop(0.45, "#c8a060"); gr.addColorStop(1, "#7a5a30");
    g.fillStyle = gr; g.fillText(s, 800, y);
  };
  line("TOKYO STOCK", 170); line("EXCHANGE", 470);
}, true);
/** soft vertical glass highlights (transparent; for the drum's outer glass, additive) */
export const glassStreakTex = () => tx("tkGlassStreak", 1024, 64, (g) => {
  g.clearRect(0, 0, 1024, 64);
  for (const [x, w, a] of [[90, 40, 0.5], [150, 10, 0.4], [420, 60, 0.32], [500, 12, 0.3], [760, 30, 0.45], [800, 8, 0.35]] as const) {
    const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - w, 0, 2 * w, 64);
  }
}, false);
/** the amber LED date board (dot matrix) */
export const ledTex = (text: string) => tx("tkLed_" + text, 1536, 288, (g) => {
  g.fillStyle = "#14100e"; g.fillRect(0, 0, 1536, 288);
  const c = document.createElement("canvas"); c.width = 192; c.height = 36; const h = c.getContext("2d")!;
  h.fillStyle = "#000"; h.fillRect(0, 0, 192, 36); h.fillStyle = "#fff"; h.font = `bold 30px ${SANS}`; h.textAlign = "center"; h.textBaseline = "middle"; h.fillText(text, 96, 19);
  const d = h.getImageData(0, 0, 192, 36).data;
  for (let y = 0; y < 36; y++) for (let x = 0; x < 192; x++) {
    const on = d[(y * 192 + x) * 4] > 110;
    g.fillStyle = on ? "#ffb23a" : "#2e2018"; g.beginPath(); g.arc(x * 8 + 4, y * 8 + 4, on ? 3.4 : 2.4, 0, TAU); g.fill();
  }
}, true);
/** a rooftop sign: plain generic words on a lit panel */
export const roofSignTex = (text: string, bg: string, fg: string, jp = false) => tx("tkRoofSign_" + text, 1024, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256); g.strokeStyle = shadeHex(bg, -0.2); g.lineWidth = 14; g.strokeRect(7, 7, 1010, 242);
  ctext(g, text, 512, jp ? 190 : 175, jp ? 170 : 140, fg, 940, jp ? JP : BOLD);
}, true);
/** a drinks vending machine front (0.9 x 1.8 m): rows of drinks (plain colours), price buttons, the dispenser slot */
export const vendTex = (i: number) => tx("tkVend" + i, 512, 1024, (g, r) => {
  const body = ["#e8ecf0", "#c8302c", "#2e5aa8"][i % 3];
  g.fillStyle = body; g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "#f6f8fa"; rrect(g, 30, 40, 452, 560, 14); g.fill();
  const cols = ["#d23a2e", "#2f6fc0", "#e8b828", "#3a9a4a", "#f2f2f2", "#7a4a2a", "#e86a9a", "#1a1a1a"];
  for (let row = 0; row < 4; row++) for (let k = 0; k < 6; k++) {
    const x = 50 + k * 72, y = 60 + row * 135, c = cols[Math.floor(r() * cols.length)], tall = r() < 0.5;
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + 4, y + 16, 54, 100);
    g.fillStyle = c; if (tall) { rrect(g, x + 14, y + 6, 30, 98, 8); g.fill(); g.fillRect(x + 22, y, 14, 10); } else { rrect(g, x + 8, y + 26, 42, 78, 6); g.fill(); }
    g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(x + (tall ? 18 : 12), y + 34, 5, 50);
    g.fillStyle = "#fff"; g.fillRect(x + 6, y + 112, 46, 14); g.fillStyle = "#222"; g.font = `bold 11px ${SANS}`; g.textAlign = "center"; g.fillText(r() < 0.5 ? "120" : "150", x + 29, y + 124);
    g.fillStyle = "#3a8ae0"; g.beginPath(); g.arc(x + 29, y + 132, 0, 0, TAU); g.fill();
  }
  g.fillStyle = shadeHex(body, -0.15); g.fillRect(0, 620, 512, 404);
  g.fillStyle = "#1e2228"; rrect(g, 60, 820, 300, 120, 10); g.fill(); g.fillStyle = "#3a3e46"; rrect(g, 70, 830, 280, 40, 6); g.fill();
  g.fillStyle = "#2a2e34"; rrect(g, 390, 660, 80, 220, 8); g.fill(); g.fillStyle = "#e84a2a"; g.fillRect(410, 690, 40, 20); g.fillStyle = "#c8ccd2"; g.fillRect(418, 740, 24, 50);
  g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(300, 40); g.lineTo(400, 40); g.lineTo(140, 600); g.lineTo(40, 600); g.closePath(); g.fill();
  speck(g, r, 512, 1024, 1500, ["#444", "#fff"], 1, 2, 0.12);
});
/** the taxi's roof lamp face */
export const taxiLampTex = () => tx("tkTaxiLamp", 256, 128, (g) => {
  g.fillStyle = "#f4e6b8"; rrect(g, 0, 0, 256, 128, 30); g.fill(); g.strokeStyle = "#8a6a2a"; g.lineWidth = 8; rrect(g, 4, 4, 248, 120, 28); g.stroke();
  ctext(g, "TAXI", 128, 92, 70, "#3a2a10", 220, BOLD);
}, true);
/** far skyline haze (transparent): 2005 towers, a few antennae, faint window grids */
export const skylineTex = (seed: number) => tx("tkSkyline" + seed, 2048, 512, (g, r) => {
  g.clearRect(0, 0, 2048, 512);
  const layer = (col: string, win: string, h0: number, h1: number, w0: number, w1: number) => {
    let x = -10;
    while (x < 2048) { const w = w0 + (w1 - w0) * r(), h = h0 + (h1 - h0) * r() ** 1.6, y = 512 - h;
      g.fillStyle = col; g.fillRect(x, y, w, h);
      if (r() < 0.3) { g.fillRect(x + w * 0.2, y - 18, w * 0.6, 18); if (r() < 0.5) g.fillRect(x + w / 2 - 1.5, y - 60, 3, 44); }
      g.fillStyle = win; for (let wy = y + 8; wy < 506; wy += 9) g.fillRect(x + 3, wy, w - 6, 2.5);
      x += w + (r() < 0.25 ? 6 + 18 * r() : 1); }
  };
  layer("#c4ccd8", "rgba(255,255,255,0.22)", 120, 470, 30, 90);
  layer("#a9b3c4", "rgba(240,246,255,0.2)", 70, 330, 40, 110);
  layer("#8e98ac", "rgba(230,236,250,0.18)", 40, 200, 50, 130);
}, true);
/** a manhole cover (Japanese cast iron with a plain radial pattern) */
export const manholeTex = () => tx("tkManhole", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256); g.fillStyle = "#3e3c3a"; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.fill();
  g.strokeStyle = "#6a6660"; g.lineWidth = 6; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(128, 128, 30 + k * 26, 0, TAU); g.stroke(); }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; g.beginPath(); g.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30); g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.stroke(); }
  speck(g, r, 256, 256, 800, ["#222", "#8a8680"], 1, 3, 0.3);
}, true);

/** the pedestrian signal head (two windows: a red standing man on top, a blue-green walking man below) */
export const pedSigTex = (walk: boolean) => tx("tkPedSig" + (walk ? "W" : "S"), 256, 512, (g) => {
  g.fillStyle = "#2a2c30"; g.fillRect(0, 0, 256, 512);
  for (const [y, on, col] of [[20, !walk, "#ff3a2a"], [266, walk, "#2adca0"]] as const) {
    g.fillStyle = "#121316"; rrect(g, 16, y, 224, 226, 16); g.fill();
    const c = on ? col : shadeHex(col, -0.38); g.fillStyle = c; g.strokeStyle = c; g.lineCap = "round"; g.lineWidth = 22;
    const cx = 128, cy = y + 113; g.beginPath(); g.arc(cx, cy - 66, 18, 0, TAU); g.fill();
    if (y === 20) { g.beginPath(); g.moveTo(cx, cy - 40); g.lineTo(cx, cy + 20); g.moveTo(cx - 12, cy + 20); g.lineTo(cx - 14, cy + 80); g.moveTo(cx + 12, cy + 20); g.lineTo(cx + 14, cy + 80); g.moveTo(cx - 4, cy - 34); g.lineTo(cx - 30, cy + 14); g.moveTo(cx + 4, cy - 34); g.lineTo(cx + 30, cy + 14); g.stroke(); }
    else { g.beginPath(); g.moveTo(cx + 4, cy - 40); g.lineTo(cx - 4, cy + 16); g.lineTo(cx - 34, cy + 78); g.moveTo(cx - 4, cy + 16); g.lineTo(cx + 26, cy + 44); g.lineTo(cx + 22, cy + 82); g.moveTo(cx + 2, cy - 30); g.lineTo(cx + 36, cy - 4); g.moveTo(cx + 2, cy - 30); g.lineTo(cx - 32, cy - 6); g.stroke(); }
    if (on) { g.fillStyle = rgba(col, 0.18); rrect(g, 16, y, 224, 226, 16); g.fill(); }
  }
}, true);

// ===================================================== LOBBY =====================================================
/** polished stone floor (1024 = 2.4 m: 2 x 2 tiles of 1.2 m), cream with soft grey veins and a sheen */
export const floorTex = () => tx("tkFloor", 1024, 1024, (g, r) => {
  for (let i = 0; i < 4; i++) { const x = (i % 2) * 512, y = Math.floor(i / 2) * 512; g.fillStyle = jit(r, i % 3 ? "#e2dccf" : "#d6cfc0", 0.03); g.fillRect(x, y, 512, 512);
    for (let k = 0; k < 5; k++) { g.strokeStyle = `rgba(120,112,104,${0.12 + 0.1 * r()})`; g.lineWidth = 1 + 2 * r(); g.beginPath(); let vx = x + r() * 512, vy = y; g.moveTo(vx, vy); while (vy < y + 512) { vy += 30 + 40 * r(); vx += (r() - 0.5) * 80; g.lineTo(Math.max(x, Math.min(x + 512, vx)), Math.min(y + 512, vy)); } g.stroke(); } }
  speck(g, r, 1024, 1024, 8000, ["#9a9286", "#ffffff"], 1, 2, 0.14);
  for (const p of [0, 512]) { g.fillStyle = "rgba(110,100,92,0.55)"; g.fillRect(p, 0, 3, 1024); g.fillRect(0, p, 1024, 3); }
  for (let i = 0; i < 8; i++) blot(g, r() * 1024, r() * 1024, 80 + 120 * r(), "#ffffff", 0.08);
});
/** travertine wall panels (1024 = 3 m: 2 x 3 panels) */
export const travTex = () => tx("tkTrav", 1024, 1024, (g, r) => {
  g.fillStyle = "#d9cdb6"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 6; k++) { const x = (k % 2) * 512, y = Math.floor(k / 2) * 341; g.fillStyle = jit(r, "#d9cdb6", 0.04); g.fillRect(x + 3, y + 3, 506, 335); }
  for (let i = 0; i < 400; i++) { const y = r() * 1024; g.fillStyle = `rgba(150,128,100,${0.08 + 0.12 * r()})`; g.fillRect(r() * 1024, y, 20 + 80 * r(), 2 + 2 * r()); }
  speck(g, r, 1024, 1024, 6000, ["#8a7a60", "#fff6e6"], 1, 2, 0.18);
  g.fillStyle = "rgba(90,78,60,0.5)"; g.fillRect(511, 0, 3, 1024); for (const y of [0, 341, 682]) g.fillRect(0, y, 1024, 3);
});
/** the tall glass front wall seen from inside: a bright December street beyond (painted towers + sky), steel grid */
export const curtainTex = () => tx("tkCurtain", 2048, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#9cc4ec"); gr.addColorStop(0.55, "#d6e6f4"); gr.addColorStop(1, "#e8ecee");
  g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  let x = 0; while (x < 2048) { const w = 120 + 200 * r(), h = 300 + 500 * r(); g.fillStyle = jit(r, r() < 0.5 ? "#c6c8cc" : "#d6cdb8", 0.06); g.fillRect(x, 1024 - h, w, h);
    g.fillStyle = "rgba(90,110,140,0.35)"; for (let wy = 1024 - h + 20; wy < 1000; wy += 30) for (let wx = x + 10; wx < x + w - 14; wx += 26) g.fillRect(wx, wy, 14, 16); x += w + 10 + 30 * r(); }
  g.fillStyle = "rgba(240,246,255,0.35)"; g.fillRect(0, 0, 2048, 1024);
  g.fillStyle = "#5a626e"; for (let k = 0; k <= 16; k++) g.fillRect(k * 128 - 5, 0, 10, 1024); for (let k = 0; k <= 8; k++) g.fillRect(0, k * 128 - 4, 2048, 8);
  g.fillStyle = "rgba(255,255,255,0.25)"; for (let k = 0; k < 6; k++) { const x0 = k * 380 + 50; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 90, 0); g.lineTo(x0 - 160, 1024); g.lineTo(x0 - 250, 1024); g.closePath(); g.fill(); }
});
/** acoustic ceiling tiles (1024 = 2.4 m: 4 x 4 tiles of 0.6 m) with a grid */
export const tileTex = () => tx("tkTile", 512, 512, (g, r) => {
  g.fillStyle = "#e8e6e0"; g.fillRect(0, 0, 512, 512);
  speck(g, r, 512, 512, 7000, ["#a8a49c", "#ffffff"], 1, 2, 0.25);
  g.fillStyle = "#b8b4ac"; for (let k = 0; k <= 4; k++) { g.fillRect(k * 128 - 3, 0, 6, 512); g.fillRect(0, k * 128 - 3, 512, 6); }
});
/** one loose ceiling tile (both faces) */
export const tileOneTex = () => tx("tkTileOne", 128, 128, (g, r) => {
  g.fillStyle = "#e8e6e0"; g.fillRect(0, 0, 128, 128); speck(g, r, 128, 128, 900, ["#a8a49c", "#ffffff"], 1, 2, 0.3);
  g.strokeStyle = "#a8a49c"; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122);
});
/** the skylight grid (bright panels) */
export const skylightTex = () => tx("tkSky", 512, 512, (g) => {
  g.fillStyle = "#f4f8fc"; g.fillRect(0, 0, 512, 512);
  const gr = g.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, "#dbe8f6"); gr.addColorStop(1, "#ffffff"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#7a828e"; for (let k = 0; k <= 4; k++) { g.fillRect(k * 128 - 5, 0, 10, 512); g.fillRect(0, k * 128 - 5, 512, 10); }
});

// ---- the ticker drum ----
const CODES = (r: R) => String(1300 + Math.floor(r() * 8600));
/** one scrolling ticker band (4096 x 256 = 8.8 m x 0.55 m): codes + prices + arrows, green up / red down, white names */
export const tickerTex = (i: number, red = false) => tx(`tkTicker${i}${red ? "R" : ""}`, 4096, 256, (g) => {
  const r = rng(fnv("tkTickerSeed" + i));
  g.fillStyle = "#081410"; g.fillRect(0, 0, 4096, 256);
  for (let y = 4; y < 256; y += 8) { g.fillStyle = "rgba(40,80,60,0.18)"; g.fillRect(0, y, 4096, 2); }
  let x = 30; font(g, 150, BOLD); g.textBaseline = "middle"; g.textAlign = "left";
  while (x < 3900) {
    const up = r() < 0.58, code = i === 2 && x < 200 ? "J-COM" : CODES(r), px = (Math.floor(r() * 900) + 100) * 10, d = (Math.floor(r() * 90) + 1) * 10;
    const cU = red ? "#ff4a3a" : "#46ff7a", cD = "#ff4a3a", cW = red ? "#ffc0b0" : "#e8fff0";
    g.fillStyle = cW; g.fillText(code, x, 134); x += g.measureText(code).width + 40;
    const p = px.toLocaleString("en-US"); g.fillStyle = up ? cU : cD; g.fillText(p, x, 134); x += g.measureText(p).width + 26;
    g.beginPath(); if (up) { g.moveTo(x, 180); g.lineTo(x + 50, 70); g.lineTo(x + 100, 180); } else { g.moveTo(x, 80); g.lineTo(x + 50, 190); g.lineTo(x + 100, 80); } g.closePath(); g.fill(); x += 130;
    const s = (up ? "+" : "-") + d.toLocaleString("en-US"); g.fillText(s, x, 134); x += g.measureText(s).width + 120;
  }
}, false);
/** the drum's middle quote board (4096 x 1024 = 8.8 x 2.2 m): a grid of quote cells */
export const quoteTex = (red = false) => tx("tkQuote" + (red ? "R" : ""), 4096, 1024, (g) => {
  const r = rng(fnv("tkQuoteSeed"));
  g.fillStyle = "#06100c"; g.fillRect(0, 0, 4096, 1024);
  font(g, 96, BOLD); g.textBaseline = "middle"; g.textAlign = "left";
  for (let row = 0; row < 4; row++) for (let c = 0; c < 8; c++) {
    const x = c * 512 + 16, y = row * 256 + 12, up = r() < 0.55;
    g.fillStyle = "#0c1e18"; g.fillRect(x, y, 480, 232); g.strokeStyle = "#1e3a30"; g.lineWidth = 4; g.strokeRect(x, y, 480, 232);
    g.fillStyle = red ? "#ffc8b8" : "#e8fff0"; g.fillText(CODES(r), x + 24, y + 64);
    g.fillStyle = up && !red ? "#46ff7a" : "#ff4a3a"; const p = ((Math.floor(r() * 900) + 100) * 10).toLocaleString("en-US"); g.fillText(p, x + 24, y + 172);
    g.beginPath(); const ax = x + 400, ay = y + 64; if (up && !red) { g.moveTo(ax - 34, ay + 30); g.lineTo(ax, ay - 30); g.lineTo(ax + 34, ay + 30); } else { g.moveTo(ax - 34, ay - 30); g.lineTo(ax, ay + 30); g.lineTo(ax + 34, ay - 30); } g.closePath(); g.fill();
  }
});

// ---- boards (readable, plain) ----
/** a lobby board: dark navy face, a thin gold rule, 1-2 lines of plain caps */
export const boardTex = (key: string, lines: { t: string; px: number; c: string }[], w: number, h: number, bg = "#14203a", rule = "#d8b25a") => tx("tkBoard_" + key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,0.08)"); gr.addColorStop(1, "rgba(0,0,0,0.18)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = rule; g.lineWidth = Math.max(4, h * 0.02); g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
  const tot = lines.reduce((s, l) => s + l.px * 1.12, 0); let y = (h - tot) / 2;
  for (const l of lines) { y += l.px * 1.12; ctext(g, l.t, w / 2, y - l.px * 0.16, l.px, l.c, w * 0.88, BOLD); }
}, true);
/** the museum plaque: brushed brass, engraved dark letters */
/** fix2 (audit 2): n = the number on it (the plaque COUNTS UP to 14,500 in shot 4; the steps use a half-size canvas) */
export const plaqueTex = (n = 14500) => tx("tkPlaque3" + (n === 14500 ? "" : "_" + n), n === 14500 ? 1024 : 512, n === 14500 ? 620 : 310, (g, r) => {
  if (n !== 14500) g.scale(0.5, 0.5);
  const gr = g.createLinearGradient(0, 0, 1024, 620); gr.addColorStop(0, "#e2c27a"); gr.addColorStop(0.5, "#c8a050"); gr.addColorStop(1, "#a07a34");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 620);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,240,200,${0.05 + 0.08 * r()})`; g.fillRect(0, r() * 620, 1024, 1); }
  g.strokeStyle = "#6a4a1a"; g.lineWidth = 12; g.strokeRect(20, 20, 984, 580);
  ctext(g, "ONLY", 512, 180, 140, "#2a1a08", 900, BOLD);
  ctext(g, n.toLocaleString("en-US"), 512, 360, 170, "#2a1a08", 900, BOLD);
  ctext(g, "SHARES", 512, 530, 140, "#2a1a08", 900, BOLD);
}, true);
/** the green / cream share-certificate face (top of a stack) */
export const certTopTex = () => tx("tkCertTop", 512, 360, (g, r) => {
  g.fillStyle = "#f2ead2"; g.fillRect(0, 0, 512, 360);
  g.strokeStyle = "#2f7a4a"; g.lineWidth = 18; g.strokeRect(14, 14, 484, 332); g.lineWidth = 3; g.strokeRect(36, 36, 440, 288);
  g.strokeStyle = "rgba(47,122,74,0.4)"; g.lineWidth = 1.5; for (let k = 0; k < 40; k++) { g.beginPath(); for (let x = 40; x < 472; x += 4) g.lineTo(x, 180 + Math.sin(x * 0.05 + k * 0.4) * (60 + k)); g.stroke(); }
  g.fillStyle = "#2f7a4a"; g.beginPath(); g.arc(256, 180, 46, 0, TAU); g.fill(); g.fillStyle = "#f2ead2"; g.beginPath(); g.arc(256, 180, 34, 0, TAU); g.fill();
  ctext(g, "SHARE CERTIFICATE", 256, 86, 34, "#1e4a2e", 380, SANS, "bold");
  ctext(g, "1 SHARE", 256, 290, 30, "#1e4a2e", 300, SANS, "bold");
  speck(g, r, 512, 360, 600, ["#8a7a5a"], 1, 2, 0.15);
});
/** the stack's sides: many cream sheet edges with green edge stripes */
export const certSideTex = () => tx("tkCertSide", 256, 512, (g, r) => {
  g.fillStyle = "#efe6cc"; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 3) { g.fillStyle = r() < 0.5 ? "rgba(120,100,70,0.22)" : "rgba(255,255,245,0.5)"; g.fillRect(0, y, 256, 1); }
  for (let y = 0; y < 512; y += 9) { g.fillStyle = `rgba(47,122,74,${0.25 + 0.2 * r()})`; g.fillRect(0, y + r() * 3, 256, 1.6); }
  g.fillStyle = "rgba(47,122,74,0.85)"; g.fillRect(0, 0, 256, 10); g.fillRect(0, 502, 256, 10);
  g.fillStyle = "#2f7a4a"; g.fillRect(96, 0, 64, 512); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(100, 0, 6, 512); g.fillStyle = "rgba(10,40,20,0.4)"; g.fillRect(154, 0, 6, 512);
});
/** green EXIT sign: 出口 + a running figure (generic) */
export const exitTex = () => tx("tkExit", 512, 192, (g) => {
  g.fillStyle = "#1f9a4a"; g.fillRect(0, 0, 512, 192); g.fillStyle = "#f4fff4"; g.fillRect(20, 20, 150, 152);
  g.fillStyle = "#1f9a4a"; g.beginPath(); g.arc(110, 52, 16, 0, TAU); g.fill(); g.lineWidth = 16; g.strokeStyle = "#1f9a4a"; g.lineCap = "round";
  g.beginPath(); g.moveTo(100, 76); g.lineTo(80, 120); g.lineTo(52, 150); g.moveTo(80, 120); g.lineTo(120, 140); g.lineTo(118, 166); g.moveTo(96, 84); g.lineTo(130, 104); g.moveTo(96, 84); g.lineTo(62, 96); g.stroke();
  ctext(g, "出口", 340, 132, 110, "#f4fff4", 300, JP, "bold");
}, true);
/** dark museum wall (deep blue-grey felt with a soft vignette) */
export const feltTex = () => tx("tkFelt", 512, 512, (g, r) => {
  g.fillStyle = "#2a3048"; g.fillRect(0, 0, 512, 512); mottle(g, r, 512, 512, 120, ["#1e2438", "#343c58"], 20, 70, 0.2); speck(g, r, 512, 512, 3000, ["#141828", "#4a5270"], 1, 2, 0.2);
});
/** red velvet rope */
export const velvetTex = () => tx("tkVelvet", 256, 64, (g, r) => {
  g.fillStyle = "#8a1422"; g.fillRect(0, 0, 256, 64); for (let x = -64; x < 256; x += 14) { g.strokeStyle = "rgba(255,120,130,0.25)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 64); g.stroke(); }
  speck(g, r, 256, 64, 300, ["#3a0408"], 1, 2, 0.3);
});
/** the soft spotlight cone (u around, v from the lamp (top) down): additive, fades down and at the rim */
export const coneTex = () => tx("tkCone", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const v = y / 255, u = x / 255, edge = Math.sin(Math.PI * u) ** 0.6, a = (0.25 + 0.75 * (1 - v)) * edge * Math.min(1, v * 6 + 0.2);
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
  }
  g.putImageData(im, 0, 0);
}, true);
/** a soft dust puff (ceiling break) */
export const dustTex = () => tx("tkDust", 128, 128, (g, r) => {
  g.clearRect(0, 0, 128, 128);
  for (let k = 0; k < 7; k++) { const x = 40 + 48 * r(), y = 40 + 48 * r(), rad = 18 + 22 * r(); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
}, true);
/** cartoon "ding" arcs (three curved strokes each side), for the bell */
export const dingTex = () => tx("tkDing", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256); g.lineCap = "round";
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const r0 = 70 + k * 46; g.strokeStyle = "rgba(42,26,38,0.9)"; g.lineWidth = 16; g.beginPath(); g.arc(256, 128, r0, s < 0 ? Math.PI - 0.5 : -0.5, s < 0 ? Math.PI + 0.5 : 0.5); g.stroke();
    g.strokeStyle = "#ffe08a"; g.lineWidth = 9; g.beginPath(); g.arc(256, 128, r0, s < 0 ? Math.PI - 0.5 : -0.5, s < 0 ? Math.PI + 0.5 : 0.5); g.stroke();
  }
}, true);
/** the stage's red carpet disc */
export const carpetTex = () => tx("tkCarpet", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512); g.fillStyle = "#a8222e"; g.beginPath(); g.arc(256, 256, 252, 0, TAU); g.fill();
  g.strokeStyle = "#d8b25a"; g.lineWidth = 12; g.beginPath(); g.arc(256, 256, 232, 0, TAU); g.stroke();
  speck(g, r, 512, 512, 4000, ["#6a0e18", "#d84a56"], 1, 2, 0.25);
  g.globalCompositeOperation = "destination-in"; g.beginPath(); g.arc(256, 256, 252, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over";
}, true);
/** the live J-Com chart panel, redrawn per frame (pure function of its inputs) */
export class ChartPanel {
  canvas: HTMLCanvasElement; g: G; tex: THREE.CanvasTexture; private key = "";
  constructor(public w = 1024, public h = 640) {
    this.canvas = document.createElement("canvas"); this.canvas.width = w; this.canvas.height = h; this.g = this.canvas.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
  }
  /** pts: price samples 0..1 (1 = top) along x 0..1 (drawn up to `upto`); floorK: FLOOR bar glow; red: 0..1 */
  draw(pts: number[], upto: number, floorK: number, red: number, title: string, label: string) {
    const key = `${pts.length}|${upto.toFixed(3)}|${floorK.toFixed(2)}|${red.toFixed(2)}|${title}|${label}|${pts.map((p) => p.toFixed(3)).join(",")}`;
    if (key === this.key) return; this.key = key;
    const { g, w, h } = this; const mix = (a: string, b: string, k: number) => { const A = new THREE.Color(a), B = new THREE.Color(b); return "#" + A.lerp(B, k).getHexString(); };
    g.fillStyle = mix("#061410", "#1e0608", red); g.fillRect(0, 0, w, h);
    g.strokeStyle = mix("#163a2a", "#4a1616", red); g.lineWidth = 2; for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo((k * w) / 8, 120); g.lineTo((k * w) / 8, h - 40); g.stroke(); } for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(40, 140 + k * 100); g.lineTo(w - 40, 140 + k * 100); g.stroke(); }
    ctext(g, title, w / 2, 96, 84, mix("#e8fff0", "#ffe0d8", red), w - 80, BOLD);
    // the FLOOR bar
    const fy = h - 96;
    if (floorK >= 0) { g.fillStyle = `rgba(255,${Math.round(60 - 20 * Math.min(1, floorK))},50,${0.8 + 0.2 * Math.min(1, floorK)})`; g.fillRect(40, fy, w - 80, 34);
      if (floorK > 0) { g.fillStyle = `rgba(255,90,70,${0.35 * Math.min(1, floorK)})`; g.fillRect(40, fy - 16, w - 80, 66); }
      ctext(g, label, 160, fy + 30, 42, "#fff4f0", 220, BOLD); }
    // the price line
    const X = (t: number) => 50 + t * (w - 100), Y = (p: number) => fy - 6 - p * (fy - 160);
    const n = pts.length - 1, last = Math.min(n, upto * n);
    g.lineJoin = "round"; g.lineCap = "round";
    for (const [lw, col, a] of [[24, mix("#46ff78", "#ff4632", red), 0.28], [9, mix("#5aff8a", "#ff5a46", red), 1]] as const) {
      g.strokeStyle = col; g.lineWidth = lw; g.globalAlpha = a; g.beginPath(); g.moveTo(X(0), Y(pts[0]));
      for (let i = 1; i <= Math.floor(last); i++) g.lineTo(X(i / n), Y(pts[i]));
      const fl = Math.floor(last), fr = last - fl; if (fl < n && fr > 0) g.lineTo(X((fl + fr) / n), Y(pts[fl] + (pts[fl + 1] - pts[fl]) * fr));
      g.stroke(); g.globalAlpha = 1; }
    const fl = Math.floor(last), fr = last - fl, py = fl < n ? pts[fl] + (pts[fl + 1] - pts[fl]) * fr : pts[n];
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(X(last / n), Y(py), 12, 0, TAU); g.fill();
    this.tex.needsUpdate = true;
  }
}
void SANS;

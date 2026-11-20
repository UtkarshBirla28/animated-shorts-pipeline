// HOMES PAINTERS (owner HOMES): the hand-painted canvas textures of the cut-open building (shot 10). Every key is
// prefixed "hm" (the tx / material caches are shared by all set modules). No logos, no brand names.
import { tx, TAU, speck, mottle, grain, rrect, ctext, jit, shadeHex, rgba, font } from "./setkit";

const INK = "#2a1a26";

/** beige mosaic facade tiles (512 px = 1 x 1 m) */
export const tileTex = (key = "hmTile", base = "#dccbae") => tx(key, 512, 512, (g, r) => {
  g.fillStyle = shadeHex(base, -0.1); g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 22) for (let x = (y / 22) % 2 ? -22 : 0; x < 512; x += 45) {
    g.fillStyle = jit(r, base, 0.05, 3); g.fillRect(x + 2, y + 2, 41, 18);
    g.fillStyle = "rgba(255,250,235,0.22)"; g.fillRect(x + 2, y + 2, 41, 3);
  }
  mottle(g, r, 512, 512, 30, ["#8a7a68", "#f2e6d0"], 30, 90, 0.06);
  for (let i = 0; i < 9; i++) { const x = r() * 512; const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(90,74,70,0)"); gr.addColorStop(1, "rgba(90,74,70,0.1)"); g.fillStyle = gr; g.fillRect(x, 0, 6 + r() * 12, 512); }
});
/** the CUT: concrete section (warm grey, aggregate specks, diagonal hatch) - 256 px = 0.5 m */
export const sectionTex = () => tx("hmSection", 256, 256, (g, r) => {
  g.fillStyle = "#a59c94"; g.fillRect(0, 0, 256, 256);
  mottle(g, r, 256, 256, 40, ["#8c847e", "#bab2a8"], 8, 26, 0.3);
  speck(g, r, 256, 256, 500, ["#6a625e", "#d6cec4", "#7e7068"], 1, 4, 0.5);
  g.strokeStyle = "rgba(60,44,52,0.45)"; g.lineWidth = 3;
  for (let k = -256; k < 512; k += 32) { g.beginPath(); g.moveTo(k, 256); g.lineTo(k + 256, 0); g.stroke(); }
});
/** plaster (walls / ceilings) */
export const plasterTex = (key: string, base: string, s = 512) => tx(key, s, s, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  mottle(g, r, s, s, 160, [shadeHex(base, 0.04), shadeHex(base, -0.05)], 20, 70, 0.12);
  speck(g, r, s, s, 1200, [shadeHex(base, -0.12), shadeHex(base, 0.08)], 1, 2.5, 0.25);
});
/** office carpet tiles (512 px = 2 m: 4 x 4 tiles of 50 cm, alternating pile direction) */
export const carpetTex = () => tx("hmCarpet", 512, 512, (g, r) => {
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const c = (i + j) % 2 ? "#6f7684" : "#646b79"; g.fillStyle = c; g.fillRect(i * 128, j * 128, 128, 128);
    g.strokeStyle = rgba("#3e4450", 0.12); g.lineWidth = 1.5;
    for (let k = 0; k < 128; k += 6) { g.beginPath(); if ((i + j) % 2) { g.moveTo(i * 128 + k, j * 128); g.lineTo(i * 128 + k, j * 128 + 128); } else { g.moveTo(i * 128, j * 128 + k); g.lineTo(i * 128 + 128, j * 128 + k); } g.stroke(); }
  }
  speck(g, r, 512, 512, 4000, ["#4a505c", "#8a92a0"], 1, 2.5, 0.35);
  g.strokeStyle = "rgba(40,44,52,0.35)"; g.lineWidth = 2; for (let k = 0; k <= 512; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});
/** cubicle partition fabric (blue-grey) */
export const fabricTex = (key = "hmFabric", base = "#7d8796") => tx(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  speck(g, r, 256, 256, 3000, [shadeHex(base, -0.08), shadeHex(base, 0.07)], 1, 2, 0.5);
  mottle(g, r, 256, 256, 20, [shadeHex(base, -0.05)], 20, 60, 0.15);
});
/** light oak flooring planks (512 px = 2 m) */
export const flooringTex = (key = "hmFloor", base = "#c99a62") => tx(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    let x = -r() * 200;
    while (x < 512) { const w = 140 + r() * 160; g.fillStyle = jit(r, base, 0.06, 3); g.fillRect(x + 1, y + 1, w - 2, 30); grain(g, r, x, y, w, 32, 6, "#5a3418", true, 0.06, 0.16); g.fillStyle = "rgba(60,30,14,0.4)"; g.fillRect(x + w - 1, y, 2, 32); x += w; }
    g.fillStyle = "rgba(60,30,14,0.35)"; g.fillRect(0, y, 512, 2);
  }
});
/** a whole tatami room floor (6 mats in a 4 x 3.5 m room; 1024 x 896): straw weave, dark green borders */
export const tatamiTex = () => tx("hmTatami", 1024, 896, (g, r) => {
  g.fillStyle = "#b8b070"; g.fillRect(0, 0, 1024, 896);
  // mats: [x, y, w, h] in px (256 px = 1 m), along x / along y
  const S = 256, mats: [number, number, number, number, boolean][] = [
    [0, 0, 2, 1, true], [2, 0, 2, 1, true], [0, 1, 1, 2, false], [1, 1, 2, 1, true], [1, 2, 2, 1, true], [3, 1, 1, 2, false], [0, 3, 2, 0.5, true], [2, 3, 2, 0.5, true],
  ];
  for (const [mx, my, mw, mh, horiz] of mats) {
    const x = mx * S, y = my * S, w = mw * S, h = mh * S;
    g.fillStyle = jit(r, "#c4bb7c", 0.05, 4); g.fillRect(x, y, w, h);
    g.strokeStyle = "rgba(120,110,50,0.35)"; g.lineWidth = 1.5;
    if (horiz) for (let k = y + 3; k < y + h; k += 5) { g.beginPath(); g.moveTo(x, k); g.lineTo(x + w, k); g.stroke(); }
    else for (let k = x + 3; k < x + w; k += 5) { g.beginPath(); g.moveTo(k, y); g.lineTo(k, y + h); g.stroke(); }
    g.fillStyle = "#2f4a36"; if (horiz) { g.fillRect(x, y, w, 9); g.fillRect(x, y + h - 9, w, 9); } else { g.fillRect(x, y, 9, h); g.fillRect(x + w - 9, y, 9, h); }
    g.strokeStyle = "rgba(40,30,20,0.45)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  speck(g, r, 1024, 896, 2500, ["#8a8048", "#e0d8a0"], 1, 2.5, 0.25);
});
/** sand-plaster (juraku) wall of the Japanese room, warm ochre */
export const jurakuTex = () => tx("hmJuraku", 512, 512, (g, r) => {
  g.fillStyle = "#d9c08e"; g.fillRect(0, 0, 512, 512);
  speck(g, r, 512, 512, 9000, ["#b89a66", "#ecd8aa", "#a88a5a"], 1, 2.5, 0.45);
  mottle(g, r, 512, 512, 60, ["#c8ac78", "#e6d2a2"], 30, 80, 0.15);
});
/** kotatsu quilt: rust-red with a cream kasuri (cross) pattern + a dark hem */
export const quiltTex = () => tx("hmQuilt", 512, 256, (g, r) => {
  g.fillStyle = "#a8423a"; g.fillRect(0, 0, 512, 256);
  for (let y = 16; y < 256; y += 40) for (let x = (y / 40) % 2 ? 30 : 10; x < 512; x += 44) {
    g.fillStyle = "rgba(250,232,200,0.75)"; g.fillRect(x, y + 6, 18, 5); g.fillRect(x + 6.5, y, 5, 18);
  }
  mottle(g, r, 512, 256, 60, ["#8a2e2a", "#c05a48"], 10, 40, 0.18);
  g.fillStyle = "#4a2230"; g.fillRect(0, 236, 512, 20);
  speck(g, r, 512, 256, 800, ["#5a1a1a"], 1, 2, 0.25);
});
export const zabutonTex = () => tx("hmZabuton", 256, 256, (g, r) => {
  g.fillStyle = "#3a4e86"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(230,220,200,0.6)"; g.lineWidth = 4; for (let k = -256; k < 512; k += 36) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); }
  mottle(g, r, 256, 256, 30, ["#2a3a6a"], 10, 40, 0.25);
  g.fillStyle = "#e8dcc0"; g.beginPath(); g.arc(128, 128, 10, 0, TAU); g.fill();
});
/** shelves of colourful spines (manga / books): `pal` colours; 512 x 640 */
export const spinesTex = (key: string, pal: string[], bg = "#3a2418", shelves = 5) => tx(key, 512, 640, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 640);
  const sh = 640 / shelves;
  for (let s = 0; s < shelves; s++) {
    const y1 = s * sh + sh - 16; let x = 8;
    while (x < 504) {
      const w = 10 + r() * 12, h = sh * (0.62 + r() * 0.22), c = jit(r, pal[Math.floor(r() * pal.length) % pal.length], 0.12);
      g.fillStyle = c; g.fillRect(x, y1 - h, w, h);
      g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(x + 2, y1 - h + 6, w - 4, 4); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + 2, y1 - 14, w - 4, 6);
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + w - 2, y1 - h, 2, h); x += w + 1;
    }
    g.fillStyle = shadeHex(bg, 0.08); g.fillRect(0, y1, 512, 16); g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(0, y1 + 14, 512, 3);
  }
});
/** a day city seen through a back window (1024 x 768): soft sky, hazy towers with window grids, a few rooftops */
export const viewTex = (key: string, seed: number, night = false) => tx(key, 1024, 768, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 768);
  if (night) { sky.addColorStop(0, "#2a3a6a"); sky.addColorStop(1, "#c88a7a"); } else { sky.addColorStop(0, "#8cbbe8"); sky.addColorStop(0.7, "#cfe2f2"); sky.addColorStop(1, "#f2e6d4"); }
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 768);
  for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(150 + ((i * 337 + seed * 91) % 800), 90 + i * 40, 110, 26, 0, 0, TAU); g.fill(); }
  for (const [lay, col, y0] of [[0, "#a8b8cc", 260], [1, "#8a98ae", 380], [2, "#6e7a8e", 470]] as [number, string, number][]) {
    let x = -20 - r() * 40;
    while (x < 1040) {
      const w = 70 + r() * 120, top = y0 + r() * 120 - lay * 10, c = jit(r, col, 0.06);
      g.fillStyle = c; g.fillRect(x, top, w, 768 - top);
      g.fillStyle = rgba(night ? "#ffd890" : "#e8f0f8", night ? 0.7 : 0.45);
      for (let yy = top + 12; yy < 760; yy += 18) for (let xx = x + 8; xx < x + w - 10; xx += 14) if (r() < (night ? 0.4 : 0.8)) g.fillRect(xx, yy, 8, 9);
      g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x, top, 5, 768 - top);
      x += w + 6 + r() * 20;
    }
  }
  // a rooftop water tank + antenna on the nearest roof
  g.fillStyle = "#5a6474"; g.fillRect(140, 560, 220, 208); g.fillStyle = "#7a8494"; g.fillRect(180, 520, 90, 40); g.fillRect(222, 470, 4, 50);
  const haze = g.createLinearGradient(0, 300, 0, 768); haze.addColorStop(0, "rgba(240,236,228,0)"); haze.addColorStop(1, "rgba(240,236,228,0.35)"); g.fillStyle = haze; g.fillRect(0, 0, 1024, 768);
  speck(g, r, 1024, 768, 1500, ["#ffffff", "#203040"], 1, 2, 0.05);
}, true);
/** a far hazy skyline (behind the building, above the roof): 2048 x 512, alpha above the tops */
export const skylineTex = () => tx("hmSkyline", 2048, 512, (g, r) => {
  g.clearRect(0, 0, 2048, 512);
  for (const [col, y0, a] of [["#b4c4da", 120, 0.85], ["#98a8c0", 220, 1]] as [string, number, number][]) {
    let x = 0;
    while (x < 2048) {
      const w = 60 + r() * 150, top = y0 + r() * 160; g.globalAlpha = a; g.fillStyle = jit(r, col, 0.05); g.fillRect(x, top, w, 512 - top);
      g.fillStyle = "rgba(235,242,250,0.4)"; for (let yy = top + 10; yy < 500; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12) if (r() < 0.6) g.fillRect(xx, yy, 6, 7);
      if (r() < 0.3) { g.fillStyle = jit(r, col, 0.05); g.fillRect(x + w * 0.4, top - 30, 4, 30); }
      x += w + 2 + r() * 10;
    }
  }
  g.globalAlpha = 1;
}, true);
/** a neighbour's facade (grey office block): window bands (1024 x 1024, 1 tile = 8 x 8 m) */
export const neighbourTex = (key: string, base: string, glass: string) => tx(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let y = 40; y < 1024; y += 128) {
    g.fillStyle = shadeHex(glass, -0.05); g.fillRect(0, y, 1024, 64);
    for (let x = 0; x < 1024; x += 64) { g.fillStyle = jit(r, glass, 0.12); g.fillRect(x + 3, y + 3, 58, 58); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 6, y + 6, 18, 52); }
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y + 64, 1024, 6);
  }
  speck(g, r, 1024, 1024, 3000, [shadeHex(base, -0.12)], 1, 3, 0.3);
});
/** a closed facade cell (4.6 x 2.8 m; 1024 x 624): tiles, an aluminium sliding window with curtains; `lit` = a warm
 *  lamp behind the curtains */
export const cellTex = (key: string, curtain: string, lit: boolean) => tx(key, 1024, 624, (g, r) => {
  const tile = "#dccbae";
  g.fillStyle = shadeHex(tile, -0.1); g.fillRect(0, 0, 1024, 624);
  for (let y = 0; y < 624; y += 11) for (let x = (y / 11) % 2 ? -11 : 0; x < 1024; x += 22) { g.fillStyle = jit(r, tile, 0.05, 3); g.fillRect(x + 1, y + 1, 20, 9); }
  const wx = 200, wy = 120, ww = 620, wh = 300;
  g.fillStyle = "#c8ccd0"; g.fillRect(wx - 14, wy - 14, ww + 28, wh + 28);
  const gl = g.createLinearGradient(0, wy, 0, wy + wh); gl.addColorStop(0, lit ? "#f6d8a0" : "#8aa2bc"); gl.addColorStop(1, lit ? "#e0a868" : "#6a7e98"); g.fillStyle = gl; g.fillRect(wx, wy, ww, wh);
  for (let k = 0; k < 2; k++) { const cx = k ? wx + ww - 200 : wx; g.fillStyle = curtain; g.fillRect(cx, wy, 200, wh); for (let x = 0; x < 200; x += 18) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(cx + x, wy, 6, wh); } }
  g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.moveTo(wx + 260, wy); g.lineTo(wx + 330, wy); g.lineTo(wx + 230, wy + wh); g.lineTo(wx + 160, wy + wh); g.fill();
  g.fillStyle = "#b0b4b8"; g.fillRect(wx + ww / 2 - 6, wy, 12, wh); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(wx - 14, wy - 14, ww + 28, wh + 28);
  // the AC pipe running down the wall
  g.fillStyle = "#ece8de"; g.fillRect(930, 0, 18, 624); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(944, 0, 4, 624);
  speck(g, r, 1024, 624, 1500, ["#6a5a50"], 1, 3, 0.12);
});
/** frosted balcony panel with a metal top rail (512 x 160) */
export const balconyTex = () => tx("hmBalcony", 512, 160, (g, r) => {
  g.fillStyle = "#c8d4dc"; g.fillRect(0, 0, 512, 160);
  mottle(g, r, 512, 160, 30, ["#e2eaf0", "#b0bec8"], 20, 50, 0.3);
  g.fillStyle = "#8a9098"; g.fillRect(0, 0, 512, 14); for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 8, 160);
  g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(0, 2, 512, 3);
});
/** a calendar page: "12" December 2005 (no words), a 7 x 5 date grid */
export const calendarTex = () => tx("hmCal", 256, 340, (g) => {
  g.fillStyle = "#f8f4ea"; g.fillRect(0, 0, 256, 340);
  g.fillStyle = "#c83a2a"; g.fillRect(0, 0, 256, 90); ctext(g, "12", 128, 76, 70, "#fff8ec", 200);
  g.fillStyle = "#3a3040"; font(g, 18);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) { const d = j * 7 + i - 3; if (d < 1 || d > 31) continue; g.fillStyle = i === 0 ? "#c83a2a" : "#3a3040"; g.textAlign = "center"; g.fillText(String(d), 22 + i * 35, 130 + j * 44); if (d === 8) { g.strokeStyle = "#c83a2a"; g.lineWidth = 3; g.beginPath(); g.arc(22 + i * 35, 124 + j * 44, 15, 0, TAU); g.stroke(); } }
}, true);
/** a framed family photo (painted, generic: two smiling figures under a cherry tree) */
export const photoTex = () => tx("hmPhoto", 256, 200, (g) => {
  g.fillStyle = "#3a2418"; g.fillRect(0, 0, 256, 200); g.fillStyle = "#f2e8d8"; g.fillRect(14, 14, 228, 172);
  const sk = g.createLinearGradient(0, 24, 0, 176); sk.addColorStop(0, "#a8cce8"); sk.addColorStop(1, "#e8f0e0"); g.fillStyle = sk; g.fillRect(24, 24, 208, 152);
  g.fillStyle = "#f2b8c8"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(40 + (i * 37) % 90, 40 + (i * 23) % 50, 16, 0, TAU); g.fill(); }
  g.fillStyle = "#6a4a3a"; g.fillRect(70, 70, 10, 100);
  g.fillStyle = "#8ab07a"; g.fillRect(24, 150, 208, 26);
  for (const [x, c, h] of [[140, "#3a5a8a", 70], [186, "#c85a5a", 60]] as [number, string, number][]) {
    g.fillStyle = c; rrect(g, x - 18, 176 - h, 36, h, 10); g.fill(); g.fillStyle = "#f6d8bc"; g.beginPath(); g.arc(x, 176 - h - 14, 15, 0, TAU); g.fill();
    g.fillStyle = "#2a1a1a"; g.beginPath(); g.arc(x, 176 - h - 20, 15, Math.PI, TAU); g.fill();
    g.strokeStyle = "#2a1a1a"; g.lineWidth = 2; g.beginPath(); g.arc(x, 176 - h - 12, 6, 0.3, Math.PI - 0.3); g.stroke();
  }
}, true);
export const clockTex = (key = "hmClock", rim = "#c9a14a") => tx(key, 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = rim; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
  g.fillStyle = "#f6f0e0"; g.beginPath(); g.arc(128, 128, 108, 0, TAU); g.fill();
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU, l = k % 5 ? 8 : 20, w = k % 5 ? 2 : 6; g.strokeStyle = "#2a2030"; g.lineWidth = w; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * (100 - l), 128 - Math.cos(a) * (100 - l)); g.stroke(); }
}, true);
/** a vending machine front (no brands): rows of drink cans / bottles, a lit panel, the coin slot */
export const vendTex = () => tx("hmVend", 384, 768, (g, r) => {
  g.fillStyle = "#e8eef4"; g.fillRect(0, 0, 384, 768);
  g.fillStyle = "#f8fbff"; g.fillRect(24, 30, 336, 420);
  const pal = ["#c83a2a", "#2a6ab0", "#3a9a5a", "#e8b030", "#8a4ab0", "#f2f2f2", "#2a2a2a", "#e86a2a"];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 7; i++) { const x = 36 + i * 46, y = 50 + j * 100, c = pal[Math.floor(r() * pal.length)]; g.fillStyle = c; rrect(g, x, y, 36, 70, 8); g.fill(); g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(x + 6, y + 8, 6, 54); g.fillStyle = "#2a2a30"; g.fillRect(x + 4, y + 80, 28, 8); g.fillStyle = "#3aa0e0"; g.fillRect(x + 10, y + 81, 14, 6); }
  }
  g.fillStyle = "#2a3040"; g.fillRect(24, 480, 336, 40); g.fillStyle = "#1a1a20"; g.fillRect(60, 640, 260, 80); g.fillStyle = "#c8ccd4"; g.fillRect(290, 520, 50, 90);
  g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(3, 3, 378, 762);
}, true);
/** the internet cafe's vertical sign on the pillar (plain words) */
export const cafeSignTex = () => tx("hmCafeSign", 160, 640, (g) => {
  g.fillStyle = "#1a1830"; rrect(g, 4, 4, 152, 632, 16); g.fill(); g.strokeStyle = "#ff5ac8"; g.lineWidth = 8; rrect(g, 12, 12, 136, 616, 12); g.stroke();
  g.textAlign = "center"; font(g, 64); g.fillStyle = "#7ff0ff";
  ["N", "E", "T"].forEach((c, i) => g.fillText(c, 80, 96 + i * 76));
  g.fillStyle = "#ffe066"; ["C", "A", "F", "E"].forEach((c, i) => g.fillText(c, 80, 340 + i * 72));
  font(g, 34); g.fillStyle = "#ffffff"; g.fillText("24H", 80, 612);
}, true);
/** a cup noodle (plain: cream cup, red bands, a lid flap) */
export const noodleTex = () => tx("hmNoodle", 256, 128, (g, r) => {
  g.fillStyle = "#f6efe0"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#d83a2a"; g.fillRect(0, 0, 256, 26); g.fillRect(0, 98, 256, 30);
  g.fillStyle = "#f2c02a"; for (let x = 10; x < 256; x += 60) { g.beginPath(); g.arc(x + 20, 62, 16, 0, TAU); g.fill(); }
  speck(g, r, 256, 128, 200, ["#c8b8a0"], 1, 2, 0.3);
});
/** a generic poster for the cafe wall (a cartoon rocket over stars, no words) */
export const posterTex = () => tx("hmPoster", 256, 360, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, "#2a1a5a"); gr.addColorStop(1, "#c83a8a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,220,0.8)"; g.fillRect(r() * 256, r() * 360, 3, 3); }
  g.fillStyle = "#f2f2f2"; g.beginPath(); g.ellipse(128, 170, 34, 90, 0.3, 0, TAU); g.fill(); g.fillStyle = "#e84a3a"; g.beginPath(); g.arc(150, 104, 16, 0, TAU); g.fill();
  g.fillStyle = "#ffb030"; g.beginPath(); g.moveTo(90, 250); g.lineTo(110, 300); g.lineTo(70, 280); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 352);
}, true);
/** the blinds: horizontal slats tint (used on the office window slats) */
export const slatTex = () => tx("hmSlat", 64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "#f2eee4"); gr.addColorStop(1, "#c8c2b4"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
/** stripes of a folded futon (cream + indigo ticking) */
export const futonTex = () => tx("hmFuton", 256, 256, (g) => {
  g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#5a6a9a"; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 8, 256);
  g.fillStyle = "rgba(0,0,0,0.08)"; for (let y = 0; y < 256; y += 64) g.fillRect(0, y, 256, 4);
});
/** generic paper with typed lines */
export const paperTex = () => tx("hmPaper", 128, 160, (g, r) => {
  g.fillStyle = "#f8f6ee"; g.fillRect(0, 0, 128, 160); g.fillStyle = "rgba(40,40,60,0.45)";
  for (let y = 16; y < 150; y += 10) g.fillRect(12, y, 60 + r() * 50, 3);
}, true);
export const fridgeTex = () => tx("hmFridge", 256, 384, (g) => {
  g.fillStyle = "#eef0ee"; g.fillRect(0, 0, 256, 384); g.fillStyle = "#c8cccc"; g.fillRect(0, 120, 256, 6); g.fillRect(220, 30, 12, 70); g.fillRect(220, 150, 12, 110);
  for (const [x, y, c] of [[40, 40, "#e84a3a"], [90, 60, "#3a8ae0"], [60, 180, "#f2c02a"]] as [number, number, string][]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); }
  g.fillStyle = "#fffdf0"; g.fillRect(100, 170, 70, 90); g.fillStyle = "rgba(40,40,60,0.5)"; for (let y = 184; y < 250; y += 12) g.fillRect(108, y, 50, 3);
}, true);
/** a hanging garment silhouette (alpha): 0 hoodie, 1 shirt, 2 jacket, 3 t-shirt; 256 x 384 */
export const garmentTex = (kind: number, col: string) => tx(`hmGarment${kind}${col}`, 256, 384, (g, r) => {
  g.clearRect(0, 0, 256, 384);
  const sl = kind === 3 ? 150 : 330, body = kind === 2 ? 360 : 340;
  g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 6; g.lineJoin = "round";
  g.beginPath(); g.moveTo(96, 24); g.lineTo(160, 24); g.lineTo(226, 60); g.lineTo(250, sl); g.lineTo(212, sl + 6); g.lineTo(200, 110); g.lineTo(204, body); g.lineTo(52, body); g.lineTo(56, 110); g.lineTo(44, sl + 6); g.lineTo(6, sl); g.lineTo(30, 60); g.closePath(); g.fill(); g.stroke();
  mottle(g, r, 256, 384, 20, [shadeHex(col, -0.06), shadeHex(col, 0.05)], 10, 30, 0.25);
  g.strokeStyle = rgba(INK, 0.5); g.lineWidth = 3;
  if (kind === 0) { g.fillStyle = shadeHex(col, -0.12); g.beginPath(); g.ellipse(128, 34, 46, 26, 0, 0, Math.PI); g.fill(); g.strokeStyle = "#f2f0ea"; g.beginPath(); g.moveTo(112, 50); g.lineTo(110, 120); g.moveTo(144, 50); g.lineTo(146, 120); g.stroke(); g.strokeStyle = rgba(INK, 0.5); g.strokeRect(80, 220, 96, 60); }
  if (kind === 1) { g.beginPath(); g.moveTo(128, 30); g.lineTo(128, body); g.stroke(); for (let y = 70; y < body; y += 46) { g.fillStyle = "#e8e4dc"; g.beginPath(); g.arc(136, y, 4, 0, TAU); g.fill(); } g.beginPath(); g.moveTo(100, 24); g.lineTo(128, 60); g.lineTo(156, 24); g.stroke(); }
  if (kind === 2) { g.beginPath(); g.moveTo(128, 60); g.lineTo(128, body); g.moveTo(96, 24); g.lineTo(120, 120); g.moveTo(160, 24); g.lineTo(136, 120); g.stroke(); }
  if (kind === 3) { g.fillStyle = "#f2d24a"; g.beginPath(); g.arc(128, 150, 30, 0, TAU); g.fill(); }
  g.fillStyle = "#9aa0a8"; g.fillRect(126, 0, 4, 26);
}, true);
/** a framed print of a snowy mountain under a red sun (generic, painted) */
export const printTex = () => tx("hmPrint", 384, 256, (g, r) => {
  g.fillStyle = "#2a1a14"; g.fillRect(0, 0, 384, 256); g.fillStyle = "#f4ecd8"; g.fillRect(14, 14, 356, 228);
  const sk = g.createLinearGradient(0, 30, 0, 230); sk.addColorStop(0, "#9cc8e8"); sk.addColorStop(1, "#f2e8d0"); g.fillStyle = sk; g.fillRect(30, 30, 324, 196);
  g.fillStyle = "#d8402a"; g.beginPath(); g.arc(290, 80, 26, 0, TAU); g.fill();
  g.fillStyle = "#4a6a9a"; g.beginPath(); g.moveTo(40, 226); g.lineTo(190, 70); g.lineTo(344, 226); g.fill();
  g.fillStyle = "#f8f8f4"; g.beginPath(); g.moveTo(150, 112); g.lineTo(190, 70); g.lineTo(232, 114); g.lineTo(212, 106); g.lineTo(198, 118); g.lineTo(182, 104); g.lineTo(166, 116); g.fill();
  speck(g, r, 384, 256, 600, ["#000000", "#ffffff"], 1, 2, 0.05);
}, true);

// HOMES SCREENS (owner HOMES): the PC screens of shot 10 - the big green BUY button (idle / pressed / done), the mouse
// cursor, the scrolling stock charts and the 27-year-old's profit counter (a live canvas, redrawn only when its text
// changes). Plain words only ("J-COM" as plain text).
import * as THREE from "three";
import { tx, TAU, rrect, ctext, font } from "./setkit";

/** the BUY screen (aspect a = w / h): 0 idle, 1 pressed, 2 done (a check badge) */
export const buyTex = (key: string, a: number, state: 0 | 1 | 2) => tx(`${key}_buy${state}`, 640, Math.round(640 / a), (g) => {
  const W = 640, H = Math.round(640 / a);
  g.fillStyle = "#e6eef6"; g.fillRect(0, 0, W, H);
  // title bar: plain "J-COM" + a red down arrow
  const tb = H * 0.13;
  g.fillStyle = "#1d3f8a"; g.fillRect(0, 0, W, tb);
  font(g, tb * 0.62); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#ffffff"; g.fillText("J-COM", W * 0.04, tb * 0.54);
  g.fillStyle = "#ff4a3a"; g.beginPath(); g.moveTo(W * 0.86, tb * 0.25); g.lineTo(W * 0.94, tb * 0.25); g.lineTo(W * 0.9, tb * 0.8); g.closePath(); g.fill();
  // the price strip: a red line crashing to the floor
  const y0 = tb + H * 0.03, y1 = H * 0.3;
  g.fillStyle = "#ffffff"; g.fillRect(W * 0.04, y0, W * 0.92, y1 - y0);
  g.strokeStyle = "rgba(60,80,120,0.25)"; g.lineWidth = 1; for (let k = 1; k < 4; k++) { const y = y0 + ((y1 - y0) * k) / 4; g.beginPath(); g.moveTo(W * 0.04, y); g.lineTo(W * 0.96, y); g.stroke(); }
  g.strokeStyle = "#e0302a"; g.lineWidth = 5; g.lineJoin = "round"; g.beginPath();
  const pts = [[0.05, 0.15], [0.2, 0.2], [0.32, 0.12], [0.42, 0.3], [0.5, 0.62], [0.58, 0.9], [0.95, 0.9]];
  pts.forEach(([u, v], i) => { const x = W * u, y = y0 + (y1 - y0) * v; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
  g.fillStyle = "rgba(224,48,42,0.25)"; g.fillRect(W * 0.04, y0 + (y1 - y0) * 0.9, W * 0.92, 4);
  // the BUY button
  const bx = W * 0.06, bw = W * 0.88, by = H * 0.35 + (state === 1 ? H * 0.02 : 0), bh = H * 0.58, r = bh * 0.2;
  g.fillStyle = "rgba(20,40,30,0.35)"; rrect(g, bx + 6, H * 0.35 + 10, bw, bh, r); g.fill();
  const gr = g.createLinearGradient(0, by, 0, by + bh);
  if (state === 1) { gr.addColorStop(0, "#22983e"); gr.addColorStop(1, "#11702a"); } else { gr.addColorStop(0, "#4ee06a"); gr.addColorStop(1, "#1f9e3c"); }
  g.fillStyle = gr; rrect(g, bx, by, bw, bh, r); g.fill();
  if (state !== 1) { g.fillStyle = "rgba(255,255,255,0.28)"; rrect(g, bx + 10, by + 8, bw - 20, bh * 0.36, r * 0.8); g.fill(); }
  else { g.strokeStyle = "rgba(0,40,10,0.45)"; g.lineWidth = 10; rrect(g, bx + 5, by + 5, bw - 10, bh - 10, r); g.stroke(); }
  g.strokeStyle = "#0e5a22"; g.lineWidth = 6; rrect(g, bx, by, bw, bh, r); g.stroke();
  g.textBaseline = "alphabetic";
  const px = bh * (state === 1 ? 0.7 : 0.74);
  ctext(g, "BUY", W / 2 + 4, by + bh * 0.5 + px * 0.37 + 5, px, "rgba(0,50,10,0.45)", bw * 0.9);
  ctext(g, "BUY", W / 2, by + bh * 0.5 + px * 0.37, px, "#ffffff", bw * 0.9);
  if (state === 2) {
    const cx = bx + bw - bh * 0.18, cy = by + bh * 0.2, rr = bh * 0.2;
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); g.strokeStyle = "#0e5a22"; g.lineWidth = 5; g.stroke();
    g.strokeStyle = "#1f9e3c"; g.lineWidth = rr * 0.32; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - rr * 0.5, cy); g.lineTo(cx - rr * 0.1, cy + rr * 0.42); g.lineTo(cx + rr * 0.55, cy - rr * 0.4); g.stroke(); g.lineCap = "butt";
  }
  // a faint scanline / glass sheen
  g.fillStyle = "rgba(0,0,0,0.035)"; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
}, true);
/** the mouse cursor (white arrow, dark outline) */
export const cursorTex = () => tx("hmCursor", 64, 64, (g) => {
  g.clearRect(0, 0, 64, 64);
  g.beginPath(); g.moveTo(8, 4); g.lineTo(8, 52); g.lineTo(20, 41); g.lineTo(29, 60); g.lineTo(37, 56); g.lineTo(28, 38); g.lineTo(44, 38); g.closePath();
  g.fillStyle = "#ffffff"; g.fill(); g.strokeStyle = "#101018"; g.lineWidth = 4; g.lineJoin = "round"; g.stroke();
}, true);
/** a scrolling candlestick chart (wraps in x): dark navy, grid, green / red candles, a moving-average line */
export const chartTex = (key: string, seed: number, up: boolean) => tx(key, 1024, 512, (g, r) => {
  g.fillStyle = "#0c1626"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "rgba(90,130,180,0.22)"; g.lineWidth = 2;
  for (let x = 0; x < 1024; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 64; y < 512; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  let v = 260 + seed * 10; const n = 40, ma: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = 12 + i * 25.6, drift = Math.sin((i / n) * TAU) * 3 + (up ? -1.2 : 0.4), o = v, c = v + drift * 4 + (r() - 0.5) * 50;
    const hi = Math.min(o, c) - 8 - r() * 22, lo = Math.max(o, c) + 8 + r() * 22, green = c < o;
    g.strokeStyle = green ? "#3ee06a" : "#ff4a4a"; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 7, hi); g.lineTo(x + 7, lo); g.stroke();
    g.fillStyle = green ? "#3ee06a" : "#ff4a4a"; g.fillRect(x, Math.min(o, c), 14, Math.max(4, Math.abs(c - o)));
    v = Math.max(90, Math.min(400, c)); ma.push(v);
  }
  // keep the seam continuous: fade the last candles toward the first value
  g.strokeStyle = "#ffd25a"; g.lineWidth = 4; g.beginPath(); ma.forEach((y, i) => { const x = 19 + i * 25.6; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
  // volume bars
  for (let i = 0; i < n; i++) { g.fillStyle = "rgba(110,150,210,0.45)"; const h = 10 + r() * 50; g.fillRect(12 + i * 25.6, 512 - h, 14, h); }
});
/** the profit counter: a live canvas texture redrawn when its text changes */
export class Counter {
  cv = document.createElement("canvas"); tex: THREE.CanvasTexture; private last = "";
  constructor(public w = 1024, public h = 576) {
    this.cv.width = w; this.cv.height = h; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
  draw(value: string, landed: number, spin: number) {
    const key = `${value}|${landed.toFixed(2)}|${spin > 0 ? 1 : 0}`;
    if (key === this.last) return;
    this.last = key;
    const g = this.cv.getContext("2d")!, W = this.w, H = this.h;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0e1c30"); bg.addColorStop(1, "#08111e"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(90,130,180,0.18)"; g.lineWidth = 2; for (let x = 0; x < W; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    // header: a small plain label + a status dot
    g.fillStyle = "#16304e"; g.fillRect(0, 0, W, H * 0.16);
    font(g, H * 0.1); g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#9fd8ff"; g.fillText("PROFIT", W * 0.04, H * 0.085);
    g.fillStyle = landed > 0.5 ? "#3ee06a" : "#ffd25a"; g.beginPath(); g.arc(W * 0.94, H * 0.08, H * 0.035, 0, TAU); g.fill();
    // the rising line under the number
    g.strokeStyle = "rgba(62,224,106,0.55)"; g.lineWidth = 6; g.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = W * (0.03 + 0.94 * u), y = H * (0.93 - 0.18 * Math.pow(u, 2.2) * (0.3 + 0.7 * Math.min(1, spin + landed)) - 0.015 * Math.sin(i * 1.7)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    // the big number (condensed bold), green when it lands
    const col = landed > 0 ? `rgb(${Math.round(255 - 193 * landed)},${Math.round(255 - 31 * landed)},${Math.round(255 - 149 * landed)})` : "#ffffff";
    let px = H * 0.46; const fam = 'Impact, "Arial Narrow", "Arial Black", sans-serif';
    g.font = `${px}px ${fam}`; while (g.measureText(value).width > W * 0.94 && px > 20) { px -= 4; g.font = `${px}px ${fam}`; }
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    if (landed > 0) { g.shadowColor = "rgba(62,224,106,0.85)"; g.shadowBlur = 30 * landed; }
    g.fillStyle = "rgba(0,0,0,0.5)"; g.fillText(value, W / 2 + 5, H * 0.66 + 5);
    g.fillStyle = col; g.fillText(value, W / 2, H * 0.66);
    g.shadowBlur = 0; g.shadowColor = "transparent";
    this.tex.needsUpdate = true;
  }
}
/** a four-point glint star (additive) */
export const glintTex = () => tx("hmGlint", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  for (const [w, l] of [[10, 62], [4, 40]] as number[][]) for (let k = 0; k < (w > 5 ? 2 : 4); k++) {
    g.save(); g.translate(64, 64); g.rotate((k * Math.PI) / (w > 5 ? 2 : 2) + (w > 5 ? 0 : Math.PI / 4));
    const gr = g.createLinearGradient(0, -l, 0, l); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -l); g.lineTo(w / 2, 0); g.lineTo(0, l); g.lineTo(-w / 2, 0); g.closePath(); g.fill(); g.restore();
  }
  const c = g.createRadialGradient(64, 64, 0, 64, 64, 22); c.addColorStop(0, "rgba(255,255,255,1)"); c.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = c; g.fillRect(0, 0, 128, 128);
}, true);
/** a press ring (additive, expands on the click) */
export const ringTex = () => tx("hmRing", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 30, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.7, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}, true);

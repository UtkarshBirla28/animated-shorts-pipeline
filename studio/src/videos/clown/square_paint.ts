// SQUARE painters (owner WORLD): hand-painted canvas textures for the campus square. Plain fonts and plain words only
// (no logos, no real marks; the bills are our own cartoon "ONE" notes, not copies of real currency). Every texture goes
// through setkit `tx` (cached, seeded by its key). Palette: brick reds, greens, blues, cream, teal (the clown's purple
// and yellow belong to him alone).
import * as THREE from "three";
import { tx, G, TAU, jit, rgba, shadeHex, speck, rrect, font, ctext } from "./setkit";

const BOLD = '"Arial Black", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const blot = (g: G, x: number, y: number, rad: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};
/** draw at every wrapped copy (seamless tiles) */
const wrap = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) if (x + ox > -rad && x + ox < S + rad && y + oy > -rad && y + oy < S + rad) fn(x + ox, y + oy);
};
const aniso = (t: THREE.Texture, n = 16) => { if (t.anisotropy !== n) { t.anisotropy = n; t.needsUpdate = true; } return t; };
/* LOOK v2: redder (albedo hue 5-10 deg, ~11 deg on screen under the warm sun) and ~25 % less saturated than cut 1
 * (["#b8664f" .. "#a75846"], hue ~13, S ~.57): the clown's orange hair (24 deg) and yellow (46 deg) no longer share the
 * ground's hue, and the brick stops out-shouting the cast */
const BRICKS = ["#a86a60", "#a0625a", "#b0746a", "#9c605a", "#b27a6e", "#a66c62", "#b67e72", "#9a5c56"];
const JOINT = "#bc9c88";   /* the joints: 40 % of the way from the old sand (#d2b996) to the brick, so the grid stops buzzing */

// ===================================================== GROUND =====================================================
/** herringbone red-brick paving, 2048 px = 6 m (a brick 0.3 x 0.15 m): 90-degree herringbone (period 4 short units, so
 *  the tile is seamless), sandy joints, a few dark burnt bricks, pale worn ones, chips and moss in the joints */
export const herringTex = () => aniso(tx("sqHerring5", 2048, 2048, (g, r) => {
  const S = 2048, W = S / 40, J = 3.2;
  g.fillStyle = JOINT; g.fillRect(0, 0, S, S);
  const brick = (x: number, y: number, w: number, h: number) => {
    const k = r(), col = k < 0.035 ? jit(r, "#8a5250", 0.05) : k < 0.1 ? jit(r, "#c09c8a", 0.04) : jit(r, BRICKS[Math.floor(r() * BRICKS.length)], 0.035, 2);
    const a = r(), b = r(), c = r();
    wrap(S, x, y, 3 * W, (X, Y) => {
      g.fillStyle = col; rrect(g, X + J / 2, Y + J / 2, w - J, h - J, 3); g.fill();
      g.fillStyle = "rgba(255,232,215,0.07)"; g.fillRect(X + J, Y + J / 2 + 1, w - 2 * J, 3);
      g.fillStyle = "rgba(60,22,24,0.08)"; g.fillRect(X + J, Y + h - J / 2 - 4, w - 2 * J, 3);
      if (a < 0.3) blot(g, X + w * b, Y + h * c, 10 + 14 * a, a < 0.15 ? "#5a3030" : "#d8aca0", 0.22);
    });
  };
  for (let m = -1; m < 11; m++) for (let k = -2; k < 42; k++) {
    brick((k + 4 * m) * W, k * W, 2 * W, W);
    brick((k + 2 + 4 * m) * W, (k - 1) * W, W, 2 * W);
  }
  speck(g, r, S, S, 22000, ["#5a3030", "#e8cab8", "#8a5048"], 1, 2.6, 0.16);
  for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, rad = 60 + 160 * r(), d = r() < 0.6; wrap(S, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#4a2a2a" : "#ecd4c4", d ? 0.13 : 0.1)); }
  for (let i = 0; i < 260; i++) { const x = Math.round(r() * 40) * W, y = r() * S, l = 20 + 60 * r(), v = r() < 0.5; g.fillStyle = "rgba(86,120,60,0.35)"; g.fillRect(v ? x - 2 : y, v ? y : x - 2, v ? 4 : l, v ? l : 4); }
  for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(50,24,20,0.5)"; g.beginPath(); g.ellipse(r() * S, r() * S, 3 + 5 * r(), 2 + 3 * r(), r() * 3, 0, TAU); g.fill(); }
}));
/** the walkway's paving: stretcher-bond bricks ALONG the path (u across 2.2 m = 1024 px, v along 2.2 m, seamless in v),
 *  a shade more orange than the plaza, with a cream stone soldier course on both edges */
export const pathTex = () => aniso(tx("sqPath5", 1024, 1024, (g, r) => {
  const S = 1024, bw = S / 14, bl = S / 7, E = 58;
  g.fillStyle = "#b8a08e"; g.fillRect(0, 0, S, S);
  for (let c = 0; c < 14; c++) for (let k = -1; k < 8; k++) {
    const x = c * bw, y = k * bl + (c % 2 ? bl / 2 : 0);
    const col = jit(r, r() < 0.1 ? "#d4bca6" : ["#c4a690", "#bc9e8a", "#cbae98", "#b69886"][Math.floor(r() * 4)], 0.04, 2);
    for (const oy of [0, S, -S]) { g.fillStyle = col; rrect(g, x + 2, y + oy + 2, bw - 4, bl - 4, 3); g.fill(); g.fillStyle = "rgba(255,236,210,0.13)"; g.fillRect(x + 4, y + oy + 3, 3, bl - 8); }
  }
  for (const x0 of [0, S - E]) { g.fillStyle = "#b8a08e"; g.fillRect(x0, 0, E, S); for (let k = 0; k < 6; k++) {
    const y = k * (S / 6); g.fillStyle = jit(r, "#e8dabc", 0.04, 3); rrect(g, x0 + 4, y + 3, E - 8, S / 6 - 6, 5); g.fill();
    g.fillStyle = "rgba(255,255,240,0.35)"; g.fillRect(x0 + 8, y + 6, E - 16, 4); g.fillStyle = "rgba(90,70,50,0.22)"; g.fillRect(x0 + 8, y + S / 6 - 10, E - 16, 4); } }
  speck(g, r, S, S, 7000, ["#5a2c22", "#f4e0c0"], 1, 2.4, 0.16);
  for (let i = 0; i < 16; i++) { const x = r() * S, y = r() * S, rad = 50 + 90 * r(), d = r() < 0.5; wrap(S, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#4a2a22" : "#f6dcba", 0.09)); }
}));
/** the pale stone ring the clown rides on (unwrapped: u round the ring, v across it; 2048 x 256): radial setts */
export const ringTex = () => aniso(tx("sqRing", 2048, 256, (g, r) => {
  g.fillStyle = "#b9a888"; g.fillRect(0, 0, 2048, 256);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 48; i++) {
    const w = 2048 / 48, x = i * w + (row % 2 ? w / 2 : 0), y = 14 + row * 76;
    for (const ox of [0, -2048]) { g.fillStyle = jit(r, "#e4d5b6", 0.06, 3); rrect(g, x + ox + 3, y + 3, w - 6, 70, 6); g.fill(); g.fillStyle = "rgba(255,255,244,0.3)"; g.fillRect(x + ox + 7, y + 6, w - 14, 4); }
  }
  g.fillStyle = "#a8573c"; g.fillRect(0, 0, 2048, 12); g.fillRect(0, 244, 2048, 12);
  speck(g, r, 2048, 256, 5000, ["#6a5a44", "#fff6e0"], 1, 2.4, 0.2);
  for (let i = 0; i < 30; i++) blot(g, r() * 2048, r() * 256, 30 + 60 * r(), "#5a4a3a", 0.12);
  // the unicycle's wear line: a faint dark track round the middle
  const gr = g.createLinearGradient(0, 96, 0, 160); gr.addColorStop(0, "rgba(70,50,40,0)"); gr.addColorStop(0.5, "rgba(70,50,40,0.22)"); gr.addColorStop(1, "rgba(70,50,40,0)");
  g.fillStyle = gr; g.fillRect(0, 96, 2048, 64);
}));
/** the big wear map multiplied over the whole plaza (2048 px = the plaza, white = no change): darker drifts in the
 *  corners and along the walls, paler worn lanes where people walk, rain stains round the drains */
export const wearTex = () => tx("sqWear2", 1024, 2048, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 2048);
  for (let i = 0; i < 70; i++) blot(g, r() * 1024, r() * 2048, 80 + 240 * r(), r() < 0.55 ? "#c8aea8" : "#e2d0c6", 0.42);
  for (let i = 0; i < 26; i++) blot(g, r() * 1024, r() * 2048, 30 + 70 * r(), "#b09690", 0.36);
  for (const x of [0, 1024]) { const gr = g.createLinearGradient(x, 0, x ? 1024 - 130 : 130, 0); gr.addColorStop(0, "rgba(170,140,136,0.6)"); gr.addColorStop(1, "rgba(170,140,136,0)"); g.fillStyle = gr; g.fillRect(x ? 894 : 0, 0, 130, 2048); }
}, true);
/** fallen blossom on the bricks (alpha, 1024 px = 5 m): pale pink petals, a few in little drifts */
export const petalsTex = (seed: number) => tx("sqPetals" + seed, 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  const petal = (x: number, y: number, s: number) => {
    g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = "rgba(120,60,80,0.28)"; g.beginPath(); g.ellipse(1.5, 2, s, s * 0.62, 0, 0, TAU); g.fill();
    g.fillStyle = ["#ffd9e4", "#fbc4d4", "#fff0f3", "#f7b3c8"][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(0, 0, s, s * 0.62, 0, 0, TAU); g.fill(); g.restore();
  };
  for (let i = 0; i < 9; i++) { const cx = 120 + r() * 784, cy = 120 + r() * 784, n = 14 + Math.floor(r() * 26); for (let k = 0; k < n; k++) { const a = r() * TAU, d = r() * r() * 110; petal(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 5 + 4 * r()); } }
  for (let i = 0; i < 110; i++) petal(30 + r() * 964, 30 + r() * 964, 5 + 4 * r());
}, true);

// ===================================================== BUILDINGS =====================================================
/** wall brick, running bond (1024 px = 3.2 m: cartoon-big bricks), deeper and browner than the plaza so the buildings
 *  sit back; pale mortar, soot under the ledges, a few glazed dark headers */
export const wallTex = (key = "sqWall2", cols = ["#9c5a50", "#90524a", "#a66258", "#884c46", "#a25e54"], mortar = "#cdb8a4") => aniso(tx(key, 1024, 1024, (g, r) => {
  const S = 1024, bw = S / 8, bh = S / 16;
  g.fillStyle = mortar; g.fillRect(0, 0, S, S);
  for (let row = 0; row < 16; row++) for (let i = -1; i < 9; i++) {
    const x = i * bw + (row % 2 ? bw / 2 : 0), y = row * bh, col = r() < 0.06 ? jit(r, "#5e3836", 0.08) : jit(r, cols[Math.floor(r() * cols.length)], 0.06, 3);
    for (const ox of [0, S, -S]) { g.fillStyle = col; rrect(g, x + ox + 2.5, y + 2.5, bw - 5, bh - 5, 3); g.fill(); g.fillStyle = "rgba(255,230,215,0.1)"; g.fillRect(x + ox + 5, y + 3, bw - 10, 3); g.fillStyle = "rgba(50,18,20,0.12)"; g.fillRect(x + ox + 5, y + bh - 7, bw - 10, 3); }
  }
  speck(g, r, S, S, 9000, ["#4a241c", "#f0d0b0"], 1, 2.4, 0.2);
  for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S, rad = 60 + 130 * r(), d = r() < 0.6; wrap(S, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#3e2420" : "#f4d8b8", 0.12)); }
}));
/** a tall window (512 x 1024, mapped once per window): deep teal-blue glass that mirrors the sky and a cloud, a darker
 *  room behind (a lamp, book spines or a blind per variant), a sweeping glare, cream mullions */
export const windowTex = (v: number, cols = 2, rows = 4) => tx(`sqWindow${v}_${cols}_${rows}`, 512, 1024, (g, r) => {
  const W = 512, H = 1024;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#2c5f96"); gr.addColorStop(0.45, "#4f8fc2"); gr.addColorStop(0.8, "#8fc2e2"); gr.addColorStop(1, "#b8dcef");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // the room: a dark lower zone with something in it
  const room = g.createLinearGradient(0, H * 0.35, 0, H); room.addColorStop(0, "rgba(18,34,60,0)"); room.addColorStop(1, "rgba(18,34,60,0.55)"); g.fillStyle = room; g.fillRect(0, 0, W, H);
  if (v % 3 === 0) { for (let k = 0; k < 3; k++) { const y = 420 + k * 150; g.fillStyle = "rgba(30,24,30,0.5)"; g.fillRect(40, y + 96, W - 80, 10); for (let x = 50; x < W - 60; ) { const w = 12 + 16 * r(); g.fillStyle = rgba(["#c8553f", "#3f7fa8", "#e2c890", "#4a9a78", "#d8dce4"][Math.floor(r() * 5)], 0.55); g.fillRect(x, y + 96 - 60 - 24 * r(), w, 86); x += w + 3; } } }
  else if (v % 3 === 1) { g.fillStyle = "rgba(255,226,160,0.5)"; g.beginPath(); g.moveTo(190, 520); g.lineTo(320, 520); g.lineTo(350, 620); g.lineTo(160, 620); g.closePath(); g.fill(); blot(g, 256, 600, 220, "#ffe0a0", 0.3); g.fillStyle = "rgba(30,24,30,0.5)"; g.fillRect(250, 620, 12, 260); }
  else { for (let y = 60; y < 520; y += 34) { g.fillStyle = "rgba(240,236,220,0.5)"; g.fillRect(24, y, W - 48, 22); g.fillStyle = "rgba(20,30,50,0.25)"; g.fillRect(24, y + 22, W - 48, 5); } }
  // the mirrored cloud + glare
  for (const [cx, cy, s] of [[150 + 180 * r(), 170 + 120 * r(), 1], [330, 300 + 80 * r(), 0.6]] as number[][]) for (let k = 0; k < 6; k++) blot(g, cx + (k - 2.5) * 46 * s, cy - 18 * s * Math.sin(k * 1.1), 70 * s, "#ffffff", 0.34);
  g.save(); g.translate(W * (0.3 + 0.3 * r()), 0); g.rotate(0.36); const gl = g.createLinearGradient(-70, 0, 70, 0); gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,255,255,0.34)"); gl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gl; g.fillRect(-70, -200, 140, 1500); g.fillRect(110, -200, 26, 1500); g.restore();
  // frame + mullions (cream, a dark inner line: the ink pass cannot draw inside a texture)
  g.strokeStyle = "#efe6d0"; g.lineWidth = 22; g.strokeRect(11, 11, W - 22, H - 22);
  g.lineWidth = 12; for (let c = 1; c < cols; c++) { g.beginPath(); g.moveTo((c * W) / cols, 0); g.lineTo((c * W) / cols, H); g.stroke(); }
  for (let k = 1; k < rows; k++) { g.beginPath(); g.moveTo(0, (k * H) / rows); g.lineTo(W, (k * H) / rows); g.stroke(); }
  g.strokeStyle = "rgba(42,28,52,0.75)"; g.lineWidth = 3; g.strokeRect(23, 23, W - 46, H - 46);
}, true);
/** cream stone / concrete for sills, bands, piers' caps, the low wall (1024 px = 2 m) */
export const creamTex = (key = "sqCream", base = "#e6dac0") => tx(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) { const x = r() * 1024, y = r() * 1024, rad = 30 + 110 * r(), d = r() < 0.55; wrap(1024, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#8a7a64" : "#fffaf0", 0.1)); }
  speck(g, r, 1024, 1024, 12000, ["#7a6a58", "#fffdf4"], 1, 2.2, 0.16);
  g.strokeStyle = "rgba(90,74,60,0.35)"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, k * 256 + 2); g.lineTo(1024, k * 256 + 2); g.stroke(); for (let i = 0; i < 2; i++) { const x = ((k % 2) * 256 + i * 512 + 128) % 1024; g.beginPath(); g.moveTo(x, k * 256); g.lineTo(x, k * 256 + 256); g.stroke(); } }
});
/** a double door with glass and a transom (512 x 640) */
export const doorTex = () => tx("sqDoor2", 512, 640, (g, r) => {
  g.fillStyle = "#3e5674"; g.fillRect(0, 0, 512, 640);
  for (const x of [22, 266]) { const gr = g.createLinearGradient(0, 110, 0, 600); gr.addColorStop(0, "#3a6f9a"); gr.addColorStop(1, "#a8d0e4"); g.fillStyle = gr; rrect(g, x + 26, 150, 172, 300, 8); g.fill(); g.fillStyle = "rgba(255,255,255,0.3)"; g.save(); g.beginPath(); g.rect(x + 26, 150, 172, 300); g.clip(); g.translate(x + 90, 150); g.rotate(0.4); g.fillRect(-20, -100, 40, 600); g.restore();
    g.strokeStyle = "rgba(30,24,44,0.7)"; g.lineWidth = 4; g.strokeRect(x, 110, 224, 520); g.fillStyle = "#e8d8a0"; g.fillRect(x === 22 ? x + 200 : x + 12, 370, 12, 70); }
  const tr = g.createLinearGradient(0, 16, 0, 96); tr.addColorStop(0, "#2c5f96"); tr.addColorStop(1, "#7ab2d8"); g.fillStyle = tr; g.fillRect(22, 16, 468, 80); g.strokeStyle = "#efe6d0"; g.lineWidth = 8; g.strokeRect(22, 16, 468, 80);
  speck(g, r, 512, 640, 600, ["#1a2a40"], 1, 2, 0.2);
}, true);
/** plain carved-stone lettering on a cream band (alpha off: the band is the board) */
export const signTex = (text: string, w = 1536, h = 256, bg = "#e9dfc6", fg = "#3a3050") => tx(`sqSign_${text}_${bg}`, w, h, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  speck(g, r, w, h, 1800, ["#8a7a64", "#fffdf4"], 1, 2.2, 0.16);
  g.strokeStyle = rgba(fg, 0.55); g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
  ctext(g, text, w / 2 + 3, h * 0.72 + 3, h * 0.62, "rgba(255,255,255,0.6)", w - 90, SERIF, "bold");
  ctext(g, text, w / 2, h * 0.72, h * 0.62, fg, w - 90, SERIF, "bold");
}, true);
/** the clock dial (512): cream enamel, plain ticks, twelve bold marks; the hands are meshes */
export const clockTex = () => tx("sqClock", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#2f6a74"; g.beginPath(); g.arc(256, 256, 254, 0, TAU); g.fill();
  g.fillStyle = "#f6efdc"; g.beginPath(); g.arc(256, 256, 226, 0, TAU); g.fill();
  blot(g, 190, 180, 260, "#ffffff", 0.5); blot(g, 330, 350, 240, "#c8b890", 0.25);
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU, big = k % 5 === 0, r0 = big ? 168 : 200, w = big ? (k % 15 === 0 ? 20 : 13) : 4;
    g.strokeStyle = "#2a2440"; g.lineWidth = w; g.lineCap = "butt"; g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 214, 256 - Math.cos(a) * 214); g.stroke(); }
  g.strokeStyle = "#2a2440"; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 226, 0, TAU); g.stroke();
  speck(g, r, 512, 512, 500, ["#a89878"], 1, 2, 0.12);
}, true);

/** the cube's paint (512 px = 1 m): deep cobalt enamel, soft brushed light, a few scuffs and rivets at the seams */
export const steelTex = () => tx("sqSteel2", 512, 512, (g, r) => {
  g.fillStyle = "#1e3576"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 36; i++) { const x = r() * 512, y = r() * 512, rad = 50 + 110 * r(), d = r() < 0.5; wrap(512, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#12265a" : "#3c5cae", 0.22)); }
  for (let i = 0; i < 60; i++) { const y = r() * 512; g.fillStyle = `rgba(160,190,255,${0.03 + 0.05 * r()})`; g.fillRect(0, y, 512, 1 + 2 * r()); }
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = "rgba(190,210,255,0.3)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + 40 * r(), y + (r() - 0.5) * 16); g.stroke(); }
  speck(g, r, 512, 512, 1600, ["#0e1e4a", "#8fb0f0"], 1, 2, 0.14);
});

// ===================================================== THE TREE =====================================================
/** bark for the tree by the path (512 px = 1 m round the trunk, v along it): warm grey-brown plates, furrows */
export const barkTex = () => tx("sqBark", 512, 512, (g, r) => {
  g.fillStyle = "#7a5a46"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, rad = 30 + 50 * r(), d = r() < 0.5; wrap(512, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#4e3628" : "#a4846a", 0.3)); }
  for (let i = 0; i < 26; i++) { let x = r() * 512, y = -20; const w = 3 + 4 * r(); g.strokeStyle = "rgba(44,28,24,0.6)"; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); while (y < 540) { y += 26 + 40 * r(); x += (r() - 0.5) * 22; g.lineTo(x, y); } g.stroke();
    g.strokeStyle = "rgba(214,184,150,0.3)"; g.lineWidth = 1.6; g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512; g.fillStyle = "rgba(150,170,110,0.3)"; g.beginPath(); g.ellipse(x, y, 6 + 10 * r(), 4 + 6 * r(), r() * 3, 0, TAU); g.fill(); }
  speck(g, r, 512, 512, 3000, ["#3a261e", "#b8a084"], 1, 2.5, 0.22);
});
/** a canopy lobe's paint (256 round x 128 pole to pole, like build.ts leafHD): fresh spring green, a lighter crown,
 *  leaf dabs with a dark underside so the big masses read as foliage even without ink */
export const leafMassTex = (i: number) => tx("sqLeafMass2_" + i, 512, 256, (g, r) => {
  const base = ["#7cc24a", "#6db442", "#8bcd55", "#62aa46"][i % 4];
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, shadeHex(base, 0.09)); gr.addColorStop(0.45, base); gr.addColorStop(1, shadeHex(base, -0.1));
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  // clumps first (soft darker pockets between them), then the leaves on top
  for (let k = 0; k < 26; k++) { const x = r() * 512, y = r() * 256, rad = 26 + 30 * r(); for (const ox of [-512, 0, 512]) blot(g, x + ox, y, rad, "#2f7a3c", 0.3); }
  for (let k = 0; k < 420; k++) {
    const x = r() * 512, y = 6 + r() * 244, s = 6 + 7 * r(), a = r() * TAU, light = y < 120 ? r() < 0.72 : r() < 0.34;
    for (const ox of [-512, 0, 512]) { g.save(); g.translate(x + ox, y); g.rotate(a);
      g.fillStyle = light ? "rgba(206,242,128,0.62)" : "rgba(40,104,50,0.5)"; g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.66, s, 0); g.quadraticCurveTo(0, s * 0.66, -s, 0); g.fill();
      g.strokeStyle = light ? "rgba(60,120,50,0.35)" : "rgba(190,236,130,0.25)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore(); }
  }
});
/** a spray of leaves on a twig (alpha, 512): for the cards along the money branch (they must hold up in the close-up) */
export const leafSprayTex = (v: number) => tx("sqLeafSpray" + v, 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512); g.lineCap = "round"; g.lineJoin = "round";
  const twig: [number, number][] = [[256, 500], [250 + 30 * (r() - 0.5), 380], [262 + 40 * (r() - 0.5), 250], [250 + 60 * (r() - 0.5), 120]];
  g.strokeStyle = "#5c4030"; g.lineWidth = 9; g.beginPath(); g.moveTo(...twig[0]); g.bezierCurveTo(...twig[1], ...twig[2], ...twig[3]); g.stroke();
  const leaf = (x: number, y: number, ang: number, s: number) => {
    const col = ["#86cc50", "#74bd46", "#98d85e", "#6ab248"][Math.floor(r() * 4)];
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = col; g.strokeStyle = "#2a1c34"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 0.3, -s * 0.42, s * 0.8, -s * 0.36, s, 0); g.bezierCurveTo(s * 0.8, s * 0.36, s * 0.3, s * 0.42, 0, 0); g.closePath(); g.stroke(); g.fill();
    g.fillStyle = "rgba(226,250,150,0.5)"; g.beginPath(); g.moveTo(s * 0.1, -2); g.bezierCurveTo(s * 0.35, -s * 0.3, s * 0.75, -s * 0.26, s * 0.92, -2); g.closePath(); g.fill();
    g.strokeStyle = "rgba(40,96,44,0.7)"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(2, 0); g.lineTo(s * 0.94, 0); g.stroke(); g.restore();
  };
  for (let k = 0; k < 9; k++) { const t = 0.12 + (0.88 * k) / 8, y = 500 - t * 380, x = 256 + 26 * Math.sin(t * 3 + v), side = k % 2 ? 1 : -1;
    leaf(x, y, (side > 0 ? -0.5 : Math.PI + 0.5) + (r() - 0.5) * 0.5, 110 + 50 * r() - 40 * t); }
  leaf(252, 122, -Math.PI / 2 + (r() - 0.5) * 0.4, 120);
}, true);
/** hedge / shrub paint (tileable 1024 = 2.5 m): dense dark-green leaf dabs with bright tips */
export const hedgeTex = () => tx("sqHedge2", 1024, 1024, (g, r) => {
  g.fillStyle = "#47804c"; g.fillRect(0, 0, 1024, 1024);   /* p3: calmer (was #3f8a44) */
  for (let i = 0; i < 60; i++) { const x = r() * 1024, y = r() * 1024, rad = 60 + 120 * r(), d = r() < 0.6; wrap(1024, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#255c34" : "#5fae4c", 0.3)); }
  for (let k = 0; k < 1700; k++) { const x = r() * 1024, y = r() * 1024, s = 10 + 10 * r(), a = r() * TAU, l = r();
    wrap(1024, x, y, 24, (X, Y) => { g.save(); g.translate(X, Y); g.rotate(a); g.fillStyle = l < 0.3 ? "rgba(150,214,96,0.75)" : l < 0.65 ? "rgba(74,150,70,0.8)" : "rgba(30,84,48,0.8)";
      g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.6, s, 0); g.quadraticCurveTo(0, s * 0.6, -s, 0); g.fill(); g.restore(); }); }
});
/** cherry blossom mass (for the lobes of the blossom trees): pale pink, deeper folds, white tips */
export const blossomTex = () => tx("sqBlossom2", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fbe8ec"); gr.addColorStop(0.5, "#f2ccd6"); gr.addColorStop(1, "#dca8b8");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 420; k++) { const x = r() * 512, y = r() * 256, s = 4 + 6 * r(); for (const ox of [-512, 0, 512]) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.6)" : "rgba(214,110,150,0.4)"; g.beginPath(); g.arc(x + ox, y, s, 0, TAU); g.fill(); } }
});

// ===================================================== THE MONEY =====================================================
/** OUR cartoon one-dollar note (1120 x 500 = 0.56 x 0.25 m): pale green field, a white border, engraved rings, a big
 *  "1" in each corner and "ONE" across the middle oval. Not a copy of real currency (no portrait, seals or serials).
 *  back = the other face ("ONE" in a wreath). */
export const billTex = (back: boolean) => tx("sqBill" + (back ? "B" : "F"), 1120, 500, (g, r) => {
  const W = 1120, H = 500, G1 = "#bfe6b4", G2 = "#3f8f5a", G3 = "#2c6e48";
  g.fillStyle = "#fbfdf6"; g.fillRect(0, 0, W, H);
  g.fillStyle = G1; rrect(g, 34, 34, W - 68, H - 68, 10); g.fill();
  for (let i = 0; i < 46; i++) { g.strokeStyle = rgba(G2, 0.16); g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, H / 2, 60 + i * 11, 30 + i * 5.2, 0, 0, TAU); g.stroke(); }
  g.save(); g.beginPath(); g.rect(34, 34, W - 68, H - 68); g.clip(); for (let x = 40; x < W; x += 14) { g.strokeStyle = rgba(G2, 0.1); g.lineWidth = 2; g.beginPath(); g.moveTo(x, 34); g.lineTo(x - 60, H - 34); g.stroke(); } g.restore();
  g.strokeStyle = G3; g.lineWidth = 7; rrect(g, 34, 34, W - 68, H - 68, 10); g.stroke(); g.lineWidth = 3; rrect(g, 52, 52, W - 104, H - 104, 6); g.stroke();
  g.fillStyle = "#e8f7e0"; g.strokeStyle = G3; g.lineWidth = 7; g.beginPath(); g.ellipse(W / 2, H / 2, back ? 300 : 190, back ? 150 : 172, 0, 0, TAU); g.fill(); g.stroke();
  if (back) { for (let k = 0; k < 26; k++) { const a = (k / 26) * TAU; g.save(); g.translate(W / 2 + Math.cos(a) * 262, H / 2 + Math.sin(a) * 124); g.rotate(a + 1.2); g.fillStyle = G2; g.beginPath(); g.ellipse(0, 0, 20, 8, 0, 0, TAU); g.fill(); g.restore(); }
    ctext(g, "ONE", W / 2, H / 2 + 62, 176, G3, 480, SERIF, "bold"); }
  else { ctext(g, "1", W / 2, H / 2 + 92, 260, G3, 260, SERIF, "bold"); ctext(g, "ONE", 262, H / 2 + 28, 78, G3, 190, SERIF, "bold"); ctext(g, "ONE", W - 262, H / 2 + 28, 78, G3, 190, SERIF, "bold"); }
  for (const [x, y] of [[112, 132], [W - 112, 132], [112, H - 78], [W - 112, H - 78]]) { g.fillStyle = "#e8f7e0"; g.strokeStyle = G3; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 26, 44, 0, TAU); g.fill(); g.stroke(); ctext(g, "1", x, y, 76, G3, 80, SERIF, "bold"); }
  // a soft crease down the middle + paper fibres
  const cr = g.createLinearGradient(W / 2 - 30, 0, W / 2 + 30, 0); cr.addColorStop(0, "rgba(40,90,60,0)"); cr.addColorStop(0.5, "rgba(40,90,60,0.14)"); cr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = cr; g.fillRect(W / 2 - 30, 0, 60, H);
  speck(g, r, W, H, 1200, ["#2c6e48", "#ffffff"], 1, 2.2, 0.12);
}, true);
/** the tiny note taped to a bill (256 x 200): a white card with an ink edge, two written lines, a strip of tape */
export const noteTex = (v: number) => tx("sqNote2_" + v, 256, 200, (g, r) => {
  g.clearRect(0, 0, 256, 200);
  g.fillStyle = "#fffef6"; rrect(g, 14, 36, 228, 150, 8); g.fill(); g.strokeStyle = "#2a1c34"; g.lineWidth = 9; rrect(g, 14, 36, 228, 150, 8); g.stroke();
  for (let k = 0; k < 2; k++) { g.strokeStyle = "#3a4a8a"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); let x = 44; g.moveTo(x, 90 + k * 46); while (x < 196 - k * 54) { x += 22 + 10 * r(); g.lineTo(x, 90 + k * 46 + (r() - 0.5) * 12); } g.stroke(); }
  g.save(); g.translate(128, 34); g.rotate(-0.1 + 0.1 * v); g.fillStyle = "#ecd98a"; g.fillRect(-52, -22, 104, 40); g.strokeStyle = "rgba(90,70,20,0.7)"; g.lineWidth = 4; g.strokeRect(-52, -22, 104, 40); g.restore();
}, true);
/** the reveal's thin arrow (512 x 256, alpha): a hand-drawn gold arrow with an ink edge, pointing LEFT */
export const arrowTex = () => tx("sqArrow", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(480, 60); g.bezierCurveTo(380, 30, 220, 60, 70, 150); g.moveTo(150, 70); g.lineTo(66, 152); g.lineTo(180, 176); };
  g.strokeStyle = "#2a1c34"; g.lineWidth = 30; path(); g.stroke(); g.strokeStyle = "#ffcf3a"; g.lineWidth = 17; path(); g.stroke(); g.strokeStyle = "#fff3b8"; g.lineWidth = 5; path(); g.stroke();
}, true);
/** the soft gold halo behind a bill for the reveal (rounded-rect glow, alpha) */
export const haloTex = () => tx("sqBillHalo2", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256);
  for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(255,214,90,${0.035 + 0.02 * k})`; g.lineWidth = 60 - k * 4; rrect(g, 84, 56, 344, 144, 20); g.stroke(); }
  g.strokeStyle = "rgba(255,244,190,1)"; g.lineWidth = 12; rrect(g, 84, 56, 344, 144, 14); g.stroke();
}, true);

// ===================================================== FURNITURE + LIFE =====================================================
/** a hanging banner (256 x 768): a plain colour, a cream band, a simple sun-burst flower (no marks, no words) */
export const bannerTex = (col: string, v: number) => tx("sqBanner" + col + v, 256, 768, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 768); gr.addColorStop(0, shadeHex(col, 0.05)); gr.addColorStop(1, shadeHex(col, -0.07)); g.fillStyle = gr; g.fillRect(0, 0, 256, 768);
  for (let x = 0; x < 256; x++) { const s = Math.sin((x / 256) * TAU * 2.5); g.fillStyle = s > 0 ? `rgba(255,255,240,${0.09 * s})` : `rgba(10,20,50,${-0.12 * s})`; g.fillRect(x, 0, 1, 768); }
  g.fillStyle = "#f3e9d0"; g.fillRect(0, 96, 256, 26); g.fillRect(0, 640, 256, 26); g.fillRect(0, 0, 256, 34);
  const cx = 128, cy = 380; g.fillStyle = "#f3e9d0";
  if (v % 2 === 0) { for (let k = 0; k < 10; k++) { g.save(); g.translate(cx, cy); g.rotate((k / 10) * TAU); g.beginPath(); g.ellipse(0, -62, 18, 46, 0, 0, TAU); g.fill(); g.restore(); } g.fillStyle = shadeHex(col, -0.12); g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.fill(); }
  else { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx, cy - 110 + k * 80); g.lineTo(cx + 84, cy - 40 + k * 80); g.lineTo(cx + 84, cy - 10 + k * 80); g.lineTo(cx, cy - 80 + k * 80); g.lineTo(cx - 84, cy - 10 + k * 80); g.lineTo(cx - 84, cy - 40 + k * 80); g.closePath(); g.fill(); } }
  speck(g, r, 256, 768, 900, ["#ffffff", "#102040"], 1, 2, 0.08);
}, true);
/** the study table's sign: plain black capitals on white card with a blue rule (0.9 x 0.36 m at 1536 x 614) */
export const studySignTex = () => tx("sqStudySign", 1536, 614, (g, r) => {
  g.fillStyle = "#fffdf6"; g.fillRect(0, 0, 1536, 614); g.strokeStyle = "#2a1c34"; g.lineWidth = 16; g.strokeRect(8, 8, 1520, 598);
  g.fillStyle = "#2f7fb0"; g.fillRect(40, 44, 1456, 34); g.fillRect(40, 536, 1456, 34);
  ctext(g, "PSYCH STUDY", 768, 408, 250, "#241a30", 1400, BOLD);
  speck(g, r, 1536, 614, 700, ["#b8b0a0"], 1, 2.4, 0.14);
}, true);
/** the tablecloth front of the folding table (plain teal with a cream hem) */
export const clothTex = () => tx("sqCloth2", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#34507e"); gr.addColorStop(1, "#283e64"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 64) { const sh = g.createLinearGradient(x, 0, x + 64, 0); sh.addColorStop(0, "rgba(0,30,40,0.16)"); sh.addColorStop(0.5, "rgba(255,255,255,0.08)"); sh.addColorStop(1, "rgba(0,30,40,0.16)"); g.fillStyle = sh; g.fillRect(x, 0, 64, 256); }
  g.fillStyle = "#f3e9d0"; g.fillRect(0, 226, 512, 16); speck(g, r, 512, 256, 500, ["#ffffff"], 1, 2, 0.08);
});
/** a far student as a simple painted figure (alpha, 128 x 256): pose 0 standing, 1 walking, 2 sitting; nobody holds
 *  anything near an ear (the count rule) */
export const studentTex = (v: number, pose: number) => tx(`sqStudent${v}_${pose}`, 128, 256, (g) => {
  g.clearRect(0, 0, 128, 256); g.lineJoin = "round"; g.lineCap = "round";
  const shirt = ["#3f8fc4", "#e2734a", "#4aa878", "#e8e2d0", "#c2543e", "#2f7f88"][v % 6], pants = ["#34405a", "#5a4a3e", "#2e3a4e"][v % 3], hair = ["#2a1c1c", "#6a4424", "#c89a4a", "#1c1418"][v % 4];
  const ink = "#2a1c34"; g.strokeStyle = ink; g.lineWidth = 5;
  const sit = pose === 2, hy = sit ? 96 : 44, by = hy + 34;
  // legs
  g.fillStyle = pants;
  if (sit) { g.beginPath(); g.rect(40, by + 62, 62, 22); g.fill(); g.stroke(); g.beginPath(); g.rect(84, by + 62, 20, 62); g.fill(); g.stroke(); }
  else { const sw = pose === 1 ? 14 : 3; g.beginPath(); g.moveTo(50, by + 70); g.lineTo(50 - sw, 246); g.lineTo(64 - sw, 246); g.lineTo(66, by + 70); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(62, by + 70); g.lineTo(64 + sw, 246); g.lineTo(78 + sw, 246); g.lineTo(80, by + 70); g.closePath(); g.fill(); g.stroke(); }
  // body + arms down
  g.fillStyle = shirt; rrect(g, 40, by, 48, 78, 14); g.fill(); g.stroke();
  g.strokeStyle = ink; g.lineWidth = 15; g.beginPath(); g.moveTo(42, by + 14); g.lineTo(pose === 1 ? 30 : 36, by + 60); g.moveTo(86, by + 14); g.lineTo(pose === 1 ? 98 : 92, by + 60); g.stroke();
  g.strokeStyle = shirt; g.lineWidth = 8; g.beginPath(); g.moveTo(42, by + 14); g.lineTo(pose === 1 ? 30 : 36, by + 58); g.moveTo(86, by + 14); g.lineTo(pose === 1 ? 98 : 92, by + 58); g.stroke();
  // bean head
  g.strokeStyle = ink; g.lineWidth = 5; g.fillStyle = "#f8f3ee"; g.beginPath(); g.ellipse(64, hy, 30, 34, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = hair; g.beginPath(); g.ellipse(64, hy - 14, 31, 22, 0, Math.PI, TAU); g.fill(); g.stroke();
  g.fillStyle = ink; g.beginPath(); g.arc(54, hy + 4, 3.5, 0, TAU); g.arc(74, hy + 4, 3.5, 0, TAU); g.fill();
}, true);
/** the channel's crow, perched (256): a black bird with a blue sheen, a pale eye ring, a stout beak */
export const crowTex = () => tx("sqCrow", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineJoin = "round"; g.strokeStyle = "#16121e"; g.lineWidth = 6;
  g.fillStyle = "#231d2e"; g.beginPath(); g.ellipse(132, 150, 62, 44, -0.35, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(176, 170); g.lineTo(246, 214); g.lineTo(196, 196); g.lineTo(226, 232); g.lineTo(160, 192); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#3b4a78"; g.beginPath(); g.ellipse(146, 150, 42, 22, -0.3, 0, TAU); g.fill();
  g.fillStyle = "#231d2e"; g.beginPath(); g.arc(88, 96, 34, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#3a3440"; g.beginPath(); g.moveTo(60, 88); g.lineTo(14, 104); g.lineTo(62, 112); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#f4f0e4"; g.beginPath(); g.arc(80, 90, 9, 0, TAU); g.fill(); g.fillStyle = "#16121e"; g.beginPath(); g.arc(78, 90, 4.5, 0, TAU); g.fill();
  g.strokeStyle = "#3a3440"; g.lineWidth = 6; g.beginPath(); g.moveTo(118, 190); g.lineTo(114, 232); g.moveTo(142, 192); g.lineTo(144, 232); g.stroke();
}, true);
/** fountain water: a falling jet (64 x 256, alpha; scrolls in v), the basin's rippled surface (512, tileable) */
export const jetTex = () => tx("sqJet", 64, 256, (g, r) => {
  g.clearRect(0, 0, 64, 256);
  for (let i = 0; i < 46; i++) { const x = 8 + r() * 48, y = r() * 256, l = 30 + 70 * r(); for (const oy of [-256, 0, 256]) { const gr = g.createLinearGradient(0, y + oy, 0, y + oy + l); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(240,250,255,${0.5 + 0.4 * r()})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x, y + oy, 2 + 4 * r(), l); } }
  const m = g.createLinearGradient(0, 0, 64, 0); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.3, "rgba(0,0,0,1)"); m.addColorStop(0.7, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "destination-in"; g.fillStyle = m; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = "source-over";
});
export const poolTex = () => tx("sqPool", 512, 512, (g, r) => {
  g.fillStyle = "#3f9fb8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512, rad = 40 + 80 * r(); wrap(512, x, y, rad, (X, Y) => blot(g, X, Y, rad, r() < 0.5 ? "#2c7f9c" : "#7fd0e0", 0.3)); }
  for (let i = 0; i < 90; i++) { const x = r() * 512, y = r() * 512, w = 20 + 50 * r(); wrap(512, x, y, 60, (X, Y) => { g.strokeStyle = "rgba(240,252,255,0.6)"; g.lineWidth = 2.5; g.lineCap = "round"; g.beginPath(); g.moveTo(X - w / 2, Y); g.quadraticCurveTo(X, Y - 7, X + w / 2, Y); g.stroke(); }); }
});
/** the far view over the low wall (4096 x 512, alpha top): a pale bay, a far shore of low blue hills, hazy */
export const bayTex = () => tx("sqBay", 4096, 512, (g, r) => {
  g.clearRect(0, 0, 4096, 512);
  const hill = (base: number, amp: number, col: string, seed: number, fir: boolean) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 512);
    for (let x = 0; x <= 4096; x += 8) { const y = base - amp * (0.5 + 0.5 * Math.sin(x * 0.0021 + seed)) * (0.6 + 0.4 * Math.sin(x * 0.0057 + seed * 2.3)) - (fir ? 5 * Math.abs(Math.sin(x * 0.11 + seed)) : 0); g.lineTo(x, y); }
    g.lineTo(4096, 512); g.closePath(); g.fill();
  };
  hill(300, 70, "#a9c4e2", 1.3, false); hill(322, 56, "#8fb2d6", 4.1, false); hill(346, 40, "#6f9cc0", 2.2, true);
  const w = g.createLinearGradient(0, 352, 0, 512); w.addColorStop(0, "#bfe0f2"); w.addColorStop(1, "#79b6dc"); g.fillStyle = w; g.fillRect(0, 352, 4096, 160);
  for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(r() * 4096, 360 + r() * 150, 20 + 60 * r(), 2); }
  for (let i = 0; i < 5; i++) { const x = 300 + r() * 3500, y = 392 + r() * 60; g.fillStyle = "#fbfbf4"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y - 30); g.lineTo(x + 20, y); g.closePath(); g.fill(); g.fillStyle = "#3a5a8a"; g.fillRect(x - 6, y, 32, 4); }
}, true);
/** an evergreen hill (2048 x 1024, alpha): three ridges of firs, each a tone lighter and bluer with distance. seed 0
 *  rises from NOTHING at its left end (the open sky behind the bills must stay clean), seed 1 runs full width. */
export const firHillTex = (seed: number) => tx("sqFirHill" + seed, 2048, 1024, (g, r) => {
  g.clearRect(0, 0, 2048, 1024);
  const env = (x: number) => { if (seed) return 1; const u = Math.max(0, Math.min(1, (x / 2048 - 0.02) / 0.4)); return u * u * (3 - 2 * u); };
  const ridge = (peak: number, col: string, dark: string, ph: number, th: number) => {
    const Y = (x: number) => 1024 - 1024 * peak * env(x) * (0.62 + 0.3 * Math.sin((x / 2048) * Math.PI * 1.15 + ph) + 0.08 * Math.sin(x * 0.011 + ph * 3));
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 1024); for (let x = 0; x <= 2048; x += 6) g.lineTo(x, Y(x)); g.lineTo(2048, 1024); g.closePath(); g.fill();
    for (let x = -10; x < 2060; x += th * (0.5 + r())) { if (env(x) < 0.03) continue; const y = Y(x) + 8, h = th * (2.2 + 1.6 * r()) * Math.min(1, env(x) * 3); g.fillStyle = r() < 0.5 ? col : dark; g.beginPath(); g.moveTo(x - th * 0.55, y + 6); g.lineTo(x, y - h); g.lineTo(x + th * 0.55, y + 6); g.closePath(); g.fill(); }
    for (let i = 0; i < 600; i++) { const x = r() * 2048, y0 = Y(x); if (y0 > 1000) continue; const y = y0 + 20 + r() * (1024 - y0), h = th * (1.6 + r()); g.fillStyle = rgba(r() < 0.5 ? dark : "#ffffff", r() < 0.5 ? 0.3 : 0.05); g.beginPath(); g.moveTo(x - th * 0.5, y); g.lineTo(x, y - h); g.lineTo(x + th * 0.5, y); g.closePath(); g.fill(); }
  };
  ridge(0.86, "#7fa9b8", "#6f9aac", 0.5, 12); ridge(0.66, "#559082", "#458074", 1.3 + 0.3 * seed, 18); ridge(0.44, "#3f7f5c", "#2e6a4a", 0.2, 26);
}, true);
/** soft round blob for flat shadows on the ground (alpha) */
export const shadowTex = () => tx("sqShadow", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(40,30,70,0.9)"); gr.addColorStop(0.6, "rgba(40,30,70,0.5)"); gr.addColorStop(1, "rgba(40,30,70,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
}, true);
void font;

// ===================================================== LOOK v2 (2026-11-17) =====================================================
/** a calm mown lawn (1024 = 9 m): a muted spring green (screen C* ~40-45, never the flat lime of cut 1), mow stripes,
 *  clumps, clover, a scatter of daisies and a few fallen leaves */
export const lawnTex = () => aniso(tx("sqLawn3", 1024, 1024, (g, r) => {
  g.fillStyle = "#6a8c50"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "rgba(236,240,190,0.03)" : "rgba(20,48,24,0.025)"; g.fillRect(k * 128, 0, 128, 1024); }   /* p3: barely-there stripes (the crane read them as a chequer) */
  for (let i = 0; i < 70; i++) { const x = r() * 1024, y = r() * 1024, rad = 40 + 120 * r(), d = r() < 0.55; wrap(1024, x, y, rad, (X, Y) => blot(g, X, Y, rad, d ? "#3e6236" : "#a4b878", 0.16)); }
  for (let i = 0; i < 9000; i++) { const x = r() * 1024, y = r() * 1024, l = 5 + 7 * r(), a = -Math.PI / 2 + (r() - 0.5) * 0.7, c = r();
    g.strokeStyle = c < 0.4 ? "rgba(46,84,40,0.45)" : c < 0.8 ? "rgba(132,164,92,0.45)" : "rgba(186,204,136,0.4)"; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 1024; for (let k = 0; k < 8; k++) { const a = r() * TAU, d = 14 * r(); g.fillStyle = "rgba(52,92,44,0.5)";
    for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(x + Math.cos(a) * d + 3 * Math.cos(q * 2.1), y + Math.sin(a) * d + 3 * Math.sin(q * 2.1), 3, 0, TAU); g.fill(); } } }
  for (let i = 0; i < 160; i++) { const x = r() * 1024, y = r() * 1024; g.fillStyle = "rgba(250,248,236,0.9)"; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + 3.2 * Math.cos(k), y + 3.2 * Math.sin(k), 2.4, 1.3, k, 0, TAU); g.fill(); }
    g.fillStyle = "#e8c040"; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  for (let i = 0; i < 26; i++) { g.save(); g.translate(r() * 1024, r() * 1024); g.rotate(r() * TAU); g.fillStyle = ["#a86a3a", "#c8963e", "#8a5a34"][i % 3]; g.beginPath(); g.ellipse(0, 0, 7, 3.5, 0, 0, TAU); g.fill(); g.restore(); }
}));
/** cool slate setts (1024 = 2 m) for the disc under the sculpture: blue-grey stones, so the clown's orange hair and
 *  yellow suit separate from what is right behind his lap */
export const slateTex = () => aniso(tx("sqSlate", 1024, 1024, (g, r) => {
  g.fillStyle = "#4e5462"; g.fillRect(0, 0, 1024, 1024);
  const n = 8, s = 1024 / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { g.fillStyle = jit(r, ["#6e7686", "#667080", "#76808e", "#626a7a"][Math.floor(r() * 4)], 0.06, 4); rrect(g, i * s + 4, k * s + 4, s - 8, s - 8, 10); g.fill();
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(i * s + 10, k * s + 8, s - 20, 4); }
  speck(g, r, 1024, 1024, 8000, ["#3a3e48", "#a8b0bc"], 1, 2.4, 0.16);
}));
/** a sidewalk A-frame chalkboard face (768 x 1024 = 0.6 x 0.8 m): a green-black slate in a painted wood frame, chalk
 *  capitals ("PSYCH STUDY", "2 MINUTES": 3 words), a chalk phone with a "?" */
export const aframeTex = () => tx("sqAFrame", 768, 1024, (g, r) => {
  g.fillStyle = "#8a5a36"; g.fillRect(0, 0, 768, 1024);
  g.fillStyle = "#2b3532"; g.fillRect(44, 44, 680, 936);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + 0.05 * r()})`; g.fillRect(44 + r() * 680, 44 + r() * 936, 3 + 9 * r(), 1 + 2 * r()); }
  for (let i = 0; i < 6; i++) blot(g, 100 + 560 * r(), 100 + 800 * r(), 80 + 80 * r(), "#c8d4cc", 0.06);
  g.textAlign = "center"; g.lineJoin = "round";
  const chalk = (t: string, y: number, px0: number, col = "#f4f1e6") => { let px = px0; font(g, px, BOLD); while (g.measureText(t).width > 620 && px > 30) { px -= 6; font(g, px, BOLD); } g.fillStyle = col; g.fillText(t, 384, y);
    g.fillStyle = "rgba(43,53,50,0.35)"; for (let k = 0; k < 40; k++) g.fillRect(84 + 600 * r(), y - px * 0.8 * r(), 2 + 4 * r(), 2); };
  chalk("PSYCH", 210, 150); chalk("STUDY", 370, 150);
  g.strokeStyle = "#f2d36a"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(140, 450); g.lineTo(628, 450); g.stroke();
  chalk("2 MINUTES", 580, 92, "#9ed8e8");
  g.strokeStyle = "#f4f1e6"; g.lineWidth = 10; rrect(g, 300, 650, 120, 200, 22); g.stroke(); g.beginPath(); g.arc(360, 820, 10, 0, TAU); g.stroke();
  font(g, 170, BOLD); g.fillStyle = "#f2b0c0"; g.textAlign = "center"; g.fillText("?", 520, 820);
  g.strokeStyle = "rgba(30,16,8,0.6)"; g.lineWidth = 6; g.strokeRect(3, 3, 762, 1018);
}, true);
/** the campus map board (1536 x 1024 = 1.2 x 0.8 m): a navy header "CAMPUS MAP", a painted plan, a red dot */
export const mapTex = () => tx("sqMap", 1536, 1024, (g, r) => {
  g.fillStyle = "#f2ead6"; g.fillRect(0, 0, 1536, 1024);
  g.fillStyle = "#2c3e66"; g.fillRect(0, 0, 1536, 190); ctext(g, "CAMPUS MAP", 768, 140, 120, "#f6f0e0", 1400, BOLD);
  g.fillStyle = "#b8cc94"; g.fillRect(70, 250, 1396, 700);
  g.fillStyle = "#d8c2a8"; g.beginPath(); g.moveTo(560, 950); g.lineTo(700, 250); g.lineTo(860, 250); g.lineTo(760, 950); g.fill(); g.fillRect(70, 560, 1396, 90);
  g.fillStyle = "#c89480"; g.fillRect(820, 300, 520, 200); g.fillRect(1180, 520, 220, 380); g.fillRect(150, 300, 300, 180);
  g.fillStyle = "#8aa4c8"; g.beginPath(); g.ellipse(300, 780, 150, 90, 0, 0, TAU); g.fill();
  g.fillStyle = "#3a5a8a"; g.beginPath(); g.arc(760, 600, 46, 0, TAU); g.fill();
  for (const [x, y] of [[600, 400], [480, 700], [1000, 780], [980, 620], [200, 560]]) { g.fillStyle = "#5e8c4a"; g.beginPath(); g.arc(x, y, 36, 0, TAU); g.fill(); }
  g.fillStyle = "#d83a2e"; g.beginPath(); g.arc(640, 840, 30, 0, TAU); g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.stroke();
  g.strokeStyle = "rgba(40,30,40,0.5)"; g.lineWidth = 4; g.strokeRect(70, 250, 1396, 700);
  speck(g, r, 1536, 1024, 1500, ["#8a7a64", "#ffffff"], 1, 2.4, 0.12);
}, true);
/** the coffee cart's sign (1024 x 384 = 0.8 x 0.3 m): "FREE COFFEE" on cream with a steaming cup */
export const coffeeSignTex = () => tx("sqCoffee", 1024, 384, (g, r) => {
  g.fillStyle = "#f4ead2"; g.fillRect(0, 0, 1024, 384); g.strokeStyle = "#7a3e24"; g.lineWidth = 18; g.strokeRect(9, 9, 1006, 366);
  ctext(g, "FREE COFFEE", 600, 236, 150, "#5a2c1a", 760, BOLD);
  g.fillStyle = "#c8503a"; rrect(g, 70, 150, 120, 140, 18); g.fill(); g.strokeStyle = "#c8503a"; g.lineWidth = 14; g.beginPath(); g.arc(196, 210, 30, -1.2, 1.2); g.stroke();
  g.strokeStyle = "rgba(90,60,50,0.7)"; g.lineWidth = 8; for (const x of [105, 150]) { g.beginPath(); g.moveTo(x, 130); g.bezierCurveTo(x - 20, 100, x + 20, 80, x, 50); g.stroke(); }
  speck(g, r, 1024, 384, 600, ["#a08870"], 1, 2, 0.12);
}, true);
/** flyers for the notice pillar (512 x 720): big plain words, simple shapes (no logos) */
export const flyerTex = (k: number) => tx("sqFlyer" + k, 512, 720, (g, r) => {
  const P = [["#f6dc6a", "#2a2440", "BAND", "NIGHT"], ["#a8d0e8", "#203a5a", "BOOK", "SALE"], ["#f4b8b0", "#5a1e28", "YOGA", "ON THE LAWN"], ["#c8e6a8", "#24402a", "LOST", "CAT"], ["#ffffff", "#2a2440", "CHESS", "CLUB"], ["#e8c8f0", "#3a2050", "OPEN", "MIC"]][k % 6];
  g.fillStyle = P[0]; g.fillRect(0, 0, 512, 720);
  ctext(g, P[2], 256, 170, 140, P[1], 460, BOLD); ctext(g, P[3], 256, 290, 90, P[1], 460, BOLD);
  g.fillStyle = P[1];
  if (k % 3 === 0) { g.beginPath(); g.arc(256, 470, 100, 0, TAU); g.fill(); g.fillStyle = P[0]; g.beginPath(); g.arc(256, 470, 50, 0, TAU); g.fill(); }
  else if (k % 3 === 1) { for (let i = 0; i < 4; i++) g.fillRect(110 + i * 75, 390, 55, 170 - 30 * i); }
  else { g.beginPath(); g.moveTo(256, 370); g.lineTo(366, 570); g.lineTo(146, 570); g.closePath(); g.fill(); }
  g.fillStyle = rgba(P[1], 0.6); for (let i = 0; i < 3; i++) g.fillRect(100, 610 + i * 26, 312 - 60 * i, 10);
  for (let i = 0; i < 6; i++) { g.fillStyle = rgba(P[1], 0.8); g.fillRect(20 + i * 82, 690, 6, 30); }
  speck(g, r, 512, 720, 500, ["#000000", "#ffffff"], 1, 2, 0.06);
}, true);
/** a chalkboard face (768 x 1056) in a painted wood frame; draw(g, ch) adds the writing, ch(text, y, px, colour) =
 *  centred chalk capitals that shrink to fit */
export const boardFace = (key: string, draw: (g: G, ch: (t: string, y: number, px: number, col: string) => void) => void) => tx(key, 768, 1056, (g, r) => {
  g.fillStyle = "#8a5a36"; g.fillRect(0, 0, 768, 1056);
  g.fillStyle = "#283230"; g.fillRect(40, 40, 688, 976);
  for (let i = 0; i < 1000; i++) { g.fillStyle = `rgba(255,255,255,${0.015 + 0.04 * r()})`; g.fillRect(40 + r() * 688, 40 + r() * 976, 3 + 9 * r(), 1 + 2 * r()); }
  for (let i = 0; i < 6; i++) blot(g, 100 + 560 * r(), 100 + 850 * r(), 80 + 80 * r(), "#c8d4cc", 0.05);
  const ch = (t: string, y: number, px0: number, col: string) => { let px = px0; font(g, px, BOLD); while (g.measureText(t).width > 640 && px > 30) { px -= 6; font(g, px, BOLD); }
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = col; g.fillText(t, 384, y);
    g.fillStyle = "rgba(40,50,48,0.3)"; for (let k = 0; k < 50; k++) g.fillRect(64 + 640 * r(), y - px * 0.75 * r(), 2 + 4 * r(), 2); };
  draw(g, ch);
  g.strokeStyle = "rgba(30,16,8,0.6)"; g.lineWidth = 6; g.strokeRect(3, 3, 762, 1050);
}, true);
/** the coffee cart's body (512 x 256): maroon and cream awning stripes over a cream panel with a maroon base */
export const cartTex = () => tx("sqCart", 512, 256, (g, r) => {
  g.fillStyle = "#efe4cc"; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#efe4cc" : "#8a3040"; g.fillRect(k * 64, 0, 64, 60); }
  g.fillStyle = "#8a3040"; g.fillRect(0, 200, 512, 56); g.fillStyle = "#d8b060"; g.fillRect(0, 194, 512, 6);
  speck(g, r, 512, 256, 900, ["#7a6a58", "#ffffff"], 1, 2, 0.12);
});
/** the cart's umbrella (512 x 256, wraps round the cone): maroon / cream gores, a scalloped hem */
export const umbrellaTex = () => tx("sqUmb", 512, 256, (g) => {
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#efe4cc" : "#8a3040"; g.fillRect(k * 64, 0, 64, 256); }
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, 512, 40);
}, true);
/** S12's clipboard page (768 x 1024 = 0.22 x 0.29 m): "ON A CALL", four phone-person doodles (each with a phone at the
 *  ear), and by state: 1 = the first ticked, 2-3 = crosses on the next ones, 4 = all four marked + "1 in 4" big in red */
export const clipPageTex = (state: number) => tx("sqClipPage" + state, 768, 1024, (g, r) => {
  g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, 768, 1024);
  g.strokeStyle = "rgba(120,140,190,0.35)"; g.lineWidth = 3; for (let y = 120; y < 1000; y += 52) { g.beginPath(); g.moveTo(30, y); g.lineTo(738, y); g.stroke(); }
  g.strokeStyle = "rgba(220,80,80,0.4)"; g.beginPath(); g.moveTo(88, 0); g.lineTo(88, 1024); g.stroke();
  ctext(g, "ON A CALL", 384, 110, 84, "#2a2440", 640, BOLD);
  const cols = ["#e8382f", "#3a7ad8", "#ffb81a", "#2a9a5a"], P: [number, number][] = [[230, 300], [540, 300], [230, 600], [540, 600]];
  P.forEach(([x, y], i) => { g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#2a2440"; g.lineWidth = 10;
    g.beginPath(); g.arc(x, y - 70, 40, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y + 70); g.moveTo(x, y + 70); g.lineTo(x - 30, y + 140); g.moveTo(x, y + 70); g.lineTo(x + 30, y + 140);
    g.moveTo(x, y); g.lineTo(x - 40, y + 40); g.moveTo(x, y); g.lineTo(x + 34, y - 40); g.stroke();
    g.fillStyle = cols[i]; rrect(g, x + 26, y - 104, 24, 46, 6); g.fill(); g.stroke(); });
  const tick = (x: number, y: number) => { g.strokeStyle = "#1f8a3a"; g.lineWidth = 26; g.beginPath(); g.moveTo(x - 70, y + 10); g.lineTo(x - 20, y + 70); g.lineTo(x + 90, y - 90); g.stroke(); };
  const cross = (x: number, y: number) => { g.strokeStyle = "#d8302a"; g.lineWidth = 24; g.beginPath(); g.moveTo(x - 85, y - 120); g.lineTo(x + 85, y + 150); g.moveTo(x + 85, y - 120); g.lineTo(x - 85, y + 150); g.stroke(); };
  if (state >= 1) tick(P[0][0], P[0][1]);
  if (state >= 2) cross(P[1][0], P[1][1]);
  if (state >= 3) cross(P[2][0], P[2][1]);
  if (state >= 4) { cross(P[3][0], P[3][1]); g.save(); g.translate(384, 940); g.rotate(-0.04); font(g, 150, BOLD); g.textAlign = "center"; g.lineWidth = 12; g.strokeStyle = "#fbf8ef"; g.strokeText("1 in 4", 0, 0); g.fillStyle = "#d8302a"; g.fillText("1 in 4", 0, 0); g.restore(); }
  speck(g, r, 768, 1024, 500, ["#b8b0a0"], 1, 2, 0.1);
}, true);
/** leaf litter on the bricks (alpha, 1024 = 3 m): fallen leaves (ochre, rust, a few green), a twig, a bottle cap, gum
 *  spots; laid as flat decals across the plaza for ground detail under the low lenses */
export const litterTex = (seed: number) => tx("sqLitter" + seed, 1024, 1024, (g, r) => {
  g.clearRect(0, 0, 1024, 1024);
  const leaf = (x: number, y: number, s: number, col: string) => { g.save(); g.translate(x, y); g.rotate(r() * TAU);
    g.fillStyle = "rgba(50,30,40,0.3)"; g.beginPath(); g.ellipse(3, 4, s, s * 0.5, 0, 0, TAU); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.62, s, 0); g.quadraticCurveTo(0, s * 0.62, -s, 0); g.fill();
    g.strokeStyle = "rgba(60,30,20,0.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s * 1.15, 0); g.stroke(); g.restore(); };
  const cols = ["#c8963e", "#b8642e", "#d8b04a", "#8a5a34", "#7a9a48", "#c87a3a"];
  for (let c = 0; c < 4; c++) { const cx = 150 + 724 * r(), cy = 150 + 724 * r(), n = 6 + Math.floor(10 * r()); for (let k = 0; k < n; k++) leaf(cx + (r() - 0.5) * 220, cy + (r() - 0.5) * 160, 14 + 12 * r(), cols[Math.floor(r() * cols.length)]); }
  for (let k = 0; k < 14; k++) leaf(40 + 944 * r(), 40 + 944 * r(), 12 + 12 * r(), cols[Math.floor(r() * cols.length)]);
  g.strokeStyle = "#5a3e2c"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); const tx0 = 200 + 600 * r(), ty0 = 200 + 600 * r(); g.moveTo(tx0, ty0); g.quadraticCurveTo(tx0 + 40, ty0 - 30, tx0 + 110, ty0 - 10); g.stroke();
  if (seed % 2 === 0) { g.fillStyle = "#c8302a"; g.beginPath(); g.arc(300 + 400 * r(), 300 + 400 * r(), 9, 0, TAU); g.fill(); }
  for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(90,70,80,0.35)"; g.beginPath(); g.arc(r() * 1024, r() * 1024, 4 + 4 * r(), 0, TAU); g.fill(); }
}, true);
/** a strip of pennant bunting (1024 x 128, alpha): 8 pennants in navy, cream, rose and gold, a cord along the top */
export const buntingTex = () => tx("sqBunting", 1024, 128, (g) => {
  g.clearRect(0, 0, 1024, 128); const C = ["#2f4f86", "#f2e8d0", "#d8707a", "#e0b04a"];
  for (let i = 0; i < 8; i++) { const x = i * 128; g.fillStyle = C[i % 4]; g.beginPath(); g.moveTo(x + 10, 10); g.lineTo(x + 118, 10); g.lineTo(x + 64, 120); g.closePath(); g.fill();
    g.strokeStyle = "#2a1c34"; g.lineWidth = 5; g.stroke(); }
  g.fillStyle = "#2a1c34"; g.fillRect(0, 6, 1024, 6);
}, true);

// HALL + COURT painters (owner HALL): hand-painted canvas textures for the community-hall notice board (shot 11, the
// pivot's warm chalky colour world) and the Tokyo courtroom (shot 13). Detail lives here, not in the geometry.
import { tx, G, R, TAU, jit, shadeHex, rgba, speck, mottle, grain, panel, ctext, rrect, font } from "./setkit";

const HAND = '"Comic Sans MS", "Segoe Print", "Chalkboard SE", sans-serif';
const BLOCK = '"Arial Black", Arial, sans-serif';

/** a hand-written scribble line (fake writing) */
const scrib = (g: G, r: R, x: number, y: number, w: number, col: string, lw = 2) => {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y);
  for (let k = 0; k < w; k += 5) g.lineTo(x + k, y + Math.sin(k * 0.55 + r() * 2) * 2.4 + (r() - 0.5) * 1.5);
  g.stroke();
};

// ======================================================================================================== HALL
/** honey planks (1024 px = 2 m): long boards, soft grain, warm chalky highlights */
export const hlFloorTex = () => tx("hlFloor", 1024, 1024, (g, r) => {
  const base = "#d6a467";
  g.fillStyle = shadeHex(base, -0.12); g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 85.33) {
    let x = -Math.floor(r() * 300);
    while (x < 1024) {
      const L = 260 + r() * 300, col = jit(r, base, 0.1, 5);
      for (const ox of [0, -1024, 1024]) {
        if (x + ox > 1024 || x + ox + L < 0) continue;
        g.fillStyle = col; g.fillRect(x + ox, y, L, 85.33);
        grain(g, r, x + ox, y, L, 85.33, 9, "#6a3a18", true, 0.05, 0.13);
        g.fillStyle = "rgba(255,240,210,0.13)"; g.fillRect(x + ox, y + 3, L, 6);
        g.fillStyle = "rgba(80,40,18,0.5)"; g.fillRect(x + ox, y, 3, 85.33);
      }
      x += L;
    }
    g.fillStyle = "rgba(80,40,18,0.45)"; g.fillRect(0, y, 1024, 3);
  }
  mottle(g, r, 1024, 1024, 60, ["#f6d8a8", "#a8743e"], 40, 120, 0.05);
});
/** chalky cream plaster */
export const hlPlasterTex = (key = "hlPlaster", base = "#f2e3c6") => tx(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  mottle(g, r, 512, 512, 180, [shadeHex(base, 0.035), shadeHex(base, -0.045), "#f6d8c8"], 20, 80, 0.12);
  speck(g, r, 512, 512, 1400, [shadeHex(base, -0.12), shadeHex(base, 0.06)], 1, 2.5, 0.22);
});
/** pastel mint tongue-and-groove wainscot (512 px = 1 m wide, 1 m tall), a chalk-painted look */
export const hlWainTex = () => tx("hlWain", 512, 512, (g, r) => {
  const base = "#a9d2bf";
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) {
    g.fillStyle = jit(r, base, 0.035, 3); g.fillRect(x + 2, 0, 60, 512);
    g.fillStyle = "rgba(40,70,60,0.35)"; g.fillRect(x, 0, 3, 512); g.fillStyle = "rgba(255,255,240,0.25)"; g.fillRect(x + 3, 0, 3, 512);
  }
  speck(g, r, 512, 512, 900, ["#ffffff", "#5a8a78"], 1, 3, 0.18);
  g.fillStyle = "rgba(30,50,40,0.25)"; g.fillRect(0, 490, 512, 22);
});
/** honey wood (frames, beams, tables): grain along u */
export const hlWoodTex = (key = "hlWood", base = "#c98f52") => tx(key, 512, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 5; i++) { g.fillStyle = rgba(shadeHex(base, (r() - 0.5) * 0.08), 0.5); g.fillRect(0, r() * 256, 512, 20 + r() * 50); }
  grain(g, r, 0, 0, 512, 256, 40, "#4a2410", true, 0.07, 0.18);
});

/** THE GIANT CORK BOARD (6.0 x 3.4 m = 2400 x 1360 px, 400 px/m): cork + dozens of community notes, flyers, pins and
 *  strings. The SELLING! note spot and the CANCEL button spot stay clear cork (the story props land there). */
export const CORK = { w: 6.0, h: 3.4, px: 400 };
export const hlCorkTex = () => tx("hlCork3", 2400, 1360, (g, r) => {
  const W = 2400, H = 1360, base = "#c8925a";
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  mottle(g, r, W, H, 500, ["#b47e48", "#d8a46a", "#a8703c"], 10, 60, 0.18);
  speck(g, r, W, H, 60000, ["#7a4a24", "#e6b880", "#9a6232", "#f0c890"], 1, 4, 0.5);
  // old pin holes + faded rectangles where notes used to be
  speck(g, r, W, H, 900, ["#4a2a14"], 2, 3, 0.6);
  for (let i = 0; i < 26; i++) { g.fillStyle = "rgba(240,210,160,0.13)"; g.fillRect(r() * W, r() * H, 120 + r() * 160, 140 + r() * 160); }
  // clear zones (board px): the note at (-0.6, 2.6) and the button at (1.7, 2.2) + its tag
  const toPx = (x: number, y: number): [number, number] => [(x + 3) * 400, (4.0 - y) * 400];
  const [nx, ny] = toPx(-0.6, 2.6), [bx, by] = toPx(1.7, 2.2);
  const clear = (x: number, y: number, w: number, h: number) => !(x + w > nx - 190 && x < nx + 190 && y + h > ny - 230 && y < ny + 290) && !(x + w > bx - 190 && x < bx + 300 && y + h > by - 180 && y < by + 230);
  const pal = ["#fdf6e2", "#fbe7a1", "#f8c9c8", "#c7e5d6", "#cfe0f4", "#f6d2a8", "#e3d4f0", "#ffffff"];
  const titles = ["BAKE SALE", "LOST CAT", "YOGA 7PM", "PIANO", "BIKE 4 SALE", "CHOIR", "GARDEN CLUB", "ROOM", "TUTOR", "FLEA MARKET", "LOST KEYS", "DANCE", "BOOK SWAP", "KARAOKE", "PUPPIES", "SOUP DAY", "CLEAN-UP", "BINGO"];
  const pin = (x: number, y: number, c: string) => {
    g.fillStyle = "rgba(40,20,10,0.35)"; g.beginPath(); g.ellipse(x + 5, y + 7, 11, 8, 0, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(x - 3.5, y - 3.5, 4, 0, TAU); g.fill();
    g.strokeStyle = "rgba(40,20,20,0.7)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.stroke();
  };
  const pins = ["#e8473c", "#3a8ad8", "#f2c230", "#3aa86a", "#e86aa8", "#7a5ad0"];
  const placed: [number, number, number, number][] = [];
  let tries = 0, n = 0;
  while (n < 70 && tries < 1400) {
    tries++;
    const w = 130 + r() * 170, h = 150 + r() * 190, x = 30 + r() * (W - w - 60), y = 30 + r() * (H - h - 60);
    if (!clear(x, y, w, h)) continue;
    let ov = 0; for (const p of placed) { const ix = Math.max(0, Math.min(x + w, p[0] + p[2]) - Math.max(x, p[0])), iy = Math.max(0, Math.min(y + h, p[1] + p[3]) - Math.max(y, p[1])); ov += ix * iy; }
    if (ov > w * h * 0.28) continue;
    placed.push([x, y, w, h]); n++;
    const a = (r() - 0.5) * 0.14, col = pal[Math.floor(r() * pal.length)], kind = Math.floor(r() * 5);
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(a);
    g.fillStyle = "rgba(60,30,10,0.32)"; g.fillRect(-w / 2 + 7, -h / 2 + 9, w, h);
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "rgba(60,40,30,0.55)"; g.lineWidth = 2.5; g.strokeRect(-w / 2, -h / 2, w, h);
    const ink = ["#2a3a6a", "#3a2a2a", "#a83228", "#2a5a3a"][Math.floor(r() * 4)];
    // no big titles just below the CANCEL button: the shot-11 close framing puts the caption band there
    const inBand = (ty: number) => Math.abs(x + w / 2 - bx) < 560 && ty > by + 140 && ty < by + 560;
    if (kind <= 1) {   // a flyer: title + scribbles (+ a doodle)
      const t1 = titles[Math.floor(r() * titles.length)];
      if (!inBand(y + 44)) ctext(g, t1, 0, -h / 2 + 44, 34, ink, w - 22, BLOCK);
      if (r() < 0.6) { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(0, -h / 2 + 92, 26, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-12, -h / 2 + 86); g.lineTo(-6, -h / 2 + 86); g.moveTo(6, -h / 2 + 86); g.lineTo(12, -h / 2 + 86); g.moveTo(-10, -h / 2 + 100); g.quadraticCurveTo(0, -h / 2 + 108, 10, -h / 2 + 100); g.stroke(); }
      for (let yy = -h / 2 + 136; yy < h / 2 - 20; yy += 18) scrib(g, r, -w / 2 + 16, yy, w - 32 - r() * 40, rgba(ink, 0.7));
    } else if (kind === 2) {   // a tear-off flyer whose tabs are partly gone
      const t2 = titles[Math.floor(r() * titles.length)];
      if (!inBand(y + 40)) ctext(g, t2, 0, -h / 2 + 40, 30, ink, w - 22, BLOCK);
      for (let yy = -h / 2 + 64; yy < h / 2 - 80; yy += 16) scrib(g, r, -w / 2 + 14, yy, w - 28 - r() * 30, rgba(ink, 0.65));
      const nt = 6, tw = w / nt;
      g.clearRect(-w / 2 - 1, h / 2 - 66, w + 2, 70); g.fillStyle = base; g.fillRect(-w / 2 - 1, h / 2 - 66, w + 2, 70);
      for (let k = 0; k < nt; k++) if (r() < 0.5) { g.fillStyle = col; g.fillRect(-w / 2 + k * tw + 1, h / 2 - 66, tw - 2, 66); g.strokeStyle = rgba(ink, 0.6); g.lineWidth = 1.5; g.strokeRect(-w / 2 + k * tw + 1, h / 2 - 66, tw - 2, 66); scrib(g, r, -w / 2 + k * tw + tw / 2 - 2, h / 2 - 60, 1, ink); }
    } else if (kind === 3) {   // a little photo / drawing
      g.fillStyle = "#ffffff"; g.fillRect(-w / 2 + 12, -h / 2 + 12, w - 24, h * 0.6);
      const sky = g.createLinearGradient(0, -h / 2, 0, -h / 2 + h * 0.6); sky.addColorStop(0, "#9ccbe8"); sky.addColorStop(1, "#e8f2e0");
      g.fillStyle = sky; g.fillRect(-w / 2 + 18, -h / 2 + 18, w - 36, h * 0.6 - 12);
      g.fillStyle = "#7ab868"; g.beginPath(); g.moveTo(-w / 2 + 18, -h / 2 + h * 0.6 + 6); g.quadraticCurveTo(0, -h / 2 + h * 0.3, w / 2 - 18, -h / 2 + h * 0.6 + 6); g.fill();
      for (let yy = -h / 2 + h * 0.6 + 34; yy < h / 2 - 16; yy += 16) scrib(g, r, -w / 2 + 16, yy, w - 32, rgba(ink, 0.6));
    } else {   // a lined index card
      g.strokeStyle = "rgba(90,140,200,0.5)"; g.lineWidth = 1.5; for (let yy = -h / 2 + 40; yy < h / 2; yy += 20) { g.beginPath(); g.moveTo(-w / 2, yy); g.lineTo(w / 2, yy); g.stroke(); }
      g.strokeStyle = "rgba(220,80,80,0.6)"; g.beginPath(); g.moveTo(-w / 2, -h / 2 + 30); g.lineTo(w / 2, -h / 2 + 30); g.stroke();
      for (let yy = -h / 2 + 37; yy < h / 2 - 10; yy += 20) scrib(g, r, -w / 2 + 12, yy, w - 24 - r() * 50, rgba(ink, 0.75));
    }
    g.restore();
    if (r() < 0.25) { g.save(); g.translate(x + w / 2, y + 4); g.rotate((r() - 0.5) * 0.5); g.fillStyle = "rgba(250,240,200,0.75)"; g.fillRect(-36, -12, 72, 24); g.restore(); }
    else pin(x + w / 2 + (r() - 0.5) * 20, y + 16, pins[Math.floor(r() * pins.length)]);
    if (r() < 0.3) pin(x + 14, y + h - 14, pins[Math.floor(r() * pins.length)]);
  }
  // strings between some pins (community "map" and the bunting string)
  g.lineWidth = 3; g.strokeStyle = "rgba(200,60,60,0.75)";
  for (let k = 0; k < 6; k++) { const a = placed[Math.floor(r() * placed.length)], b = placed[Math.floor(r() * placed.length)]; if (!a || !b) continue; const ax = a[0] + a[2] / 2, ay = a[1] + 16, bx2 = b[0] + b[2] / 2, by2 = b[1] + 16; if (Math.hypot(bx2 - ax, by2 - ay) > 700) continue; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx2) / 2, (ay + by2) / 2 + 40, bx2, by2); g.stroke(); }
  // a soft vignette toward the frame (dust + shade at the edges)
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(70,30,10,0.22)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
});

/** the hero note "SELLING!" (body only: 0.66 x 0.8 m = 528 x 640 px): butter paper, marker headline, a doodled share
 *  certificate, a dashed tear line along the bottom */
export const sellingTex = () => tx("hlSelling2", 528, 640, (g, r) => {
  g.fillStyle = "#fff3b0"; g.fillRect(0, 0, 528, 640);
  speck(g, r, 528, 640, 900, ["#e8d28a", "#ffffff"], 1, 3, 0.35);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 5; g.strokeRect(3, 3, 522, 634);
  // headline: thick red marker caps with a dark outline (~0.17 m caps)
  g.save(); g.translate(264, 205); g.rotate(-0.05);
  font(g, 142, BLOCK); let p = 142; while (g.measureText("SELLING!").width > 490 && p > 40) { p -= 4; font(g, p, BLOCK); }
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
  g.strokeStyle = "#2a1414"; g.lineWidth = 16; g.strokeText("SELLING!", 0, 0);
  g.fillStyle = "#e23a2c"; g.fillText("SELLING!", 0, 0);
  g.restore();
  g.strokeStyle = "#e23a2c"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(60, 240); g.quadraticCurveTo(264, 262, 470, 236); g.stroke();
  // a doodled share certificate (no words) + an arrow
  g.save(); g.translate(264, 420); g.rotate(0.04);
  g.fillStyle = "#fdfbf2"; g.fillRect(-150, -95, 300, 190); g.strokeStyle = "#2a3a6a"; g.lineWidth = 6; g.strokeRect(-150, -95, 300, 190); g.lineWidth = 3; g.strokeRect(-134, -79, 268, 158);
  for (let yy = -40; yy < 50; yy += 22) scrib(g, r, -110, yy, 220 - (yy > 20 ? 90 : 0), "#2a3a6a", 3);
  g.fillStyle = "#e2a83a"; g.beginPath(); g.arc(96, 46, 26, 0, TAU); g.fill(); g.strokeStyle = "#8a5a1a"; g.lineWidth = 3; g.stroke();
  g.restore();
  g.fillStyle = "#3a2a20"; g.fillRect(0, 630, 528, 10);
  g.setLineDash([12, 9]); g.strokeStyle = "#3a2a20"; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 620); g.lineTo(518, 620); g.stroke(); g.setLineDash([]);
}, true);
/** one tear-off tab (0.0825 x 0.22 m = 66 x 176 px): butter paper, a sideways scribble "phone number" */
export const tabTex = () => tx("hlTab", 66, 176, (g, r) => {
  g.fillStyle = "#fff3b0"; g.fillRect(0, 0, 66, 176);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 4; g.strokeRect(2, 0, 62, 174);
  g.save(); g.translate(33, 160); g.rotate(-Math.PI / 2);
  font(g, 26, BLOCK); g.fillStyle = "#e23a2c"; g.textAlign = "left"; g.fillText("SELL", 0, 9);
  g.restore();
  g.strokeStyle = "#2a3a6a"; g.lineWidth = 3; g.beginPath(); for (let y = 12; y < 84; y += 4) g.lineTo(40 + Math.sin(y * 0.7) * 3 + (r() - 0.5) * 2, y); g.stroke();
}, true);
/** the CANCEL plate (0.62 x 0.62 m = 496 px): cream enamel, 4 screws, a black-on-yellow label strip "CANCEL" */
export const BTN = { plate: 0.62, dome: 0.19 };
export const btnPlateTex = () => tx("hlBtnPlate", 496, 496, (g, r) => {
  g.fillStyle = "#f4ead6"; rrect(g, 0, 0, 496, 496, 40); g.fill();
  speck(g, r, 496, 496, 500, ["#d8c8a8", "#ffffff"], 1, 3, 0.3);
  g.strokeStyle = "#2a2028"; g.lineWidth = 8; rrect(g, 4, 4, 488, 488, 38); g.stroke();
  g.strokeStyle = "rgba(60,40,40,0.35)"; g.lineWidth = 3; rrect(g, 22, 22, 452, 452, 26); g.stroke();
  // the dark bezel ring round the dome (the dome sits at the plate centre, a little high)
  g.fillStyle = "#3a3038"; g.beginPath(); g.arc(248, 200, 176, 0, TAU); g.fill(); g.fillStyle = "#6a5a62"; g.beginPath(); g.arc(248, 200, 160, 0, TAU); g.fill();
  // label strip (caps ~0.085 m)
  g.fillStyle = "#f6c21e"; rrect(g, 56, 384, 384, 82, 12); g.fill(); g.strokeStyle = "#2a2028"; g.lineWidth = 5; rrect(g, 56, 384, 384, 82, 12); g.stroke();
  ctext(g, "CANCEL", 248, 450, 70, "#1e1820", 350, BLOCK);
  for (const [x, y] of [[48, 48], [448, 48], [48, 448], [448, 448]]) { g.fillStyle = "#b8b0a8"; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.strokeStyle = "#3a3038"; g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(x - 8, y - 4); g.lineTo(x + 8, y + 4); g.stroke(); }
}, true);
/** the crack on the red dome (an alpha decal): a dark zigzag with a lighter chipped edge and a black gap at its end */
export const crackDecalTex = () => tx("hlCrack", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const P: [number, number][] = [[40, 30], [78, 70], [66, 98], [110, 128], [100, 150], [142, 176], [170, 222]];
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = "rgba(255,170,150,0.9)"; g.lineWidth = 14; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x + 3, y + 3) : g.moveTo(x + 3, y + 3))); g.stroke();
  g.strokeStyle = "#1a0c10"; g.lineWidth = 8; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(66, 98); g.lineTo(40, 120); g.moveTo(110, 128); g.lineTo(138, 112); g.stroke();
  g.fillStyle = "#12080a"; g.beginPath(); g.ellipse(112, 136, 26, 15, 0.6, 0, TAU); g.fill();
}, true);
/** the manila BUG tag (0.34 x 0.18 m = 408 x 216 px): a reinforced hole, caps ~0.105 m */
export const bugTagTex = () => tx("hlBugTag", 408, 216, (g, r) => {
  g.fillStyle = "#f2d9a0"; g.beginPath(); g.moveTo(60, 0); g.lineTo(408, 0); g.lineTo(408, 216); g.lineTo(60, 216); g.lineTo(0, 150); g.lineTo(0, 66); g.closePath(); g.fill();
  speck(g, r, 408, 216, 500, ["#c8a868", "#fff2cc"], 1, 3, 0.35);
  g.strokeStyle = "#2a1c14"; g.lineWidth = 7; g.stroke();
  g.fillStyle = "#c8a060"; g.beginPath(); g.arc(46, 108, 22, 0, TAU); g.fill(); g.fillStyle = "#3a2a1a"; g.beginPath(); g.arc(46, 108, 10, 0, TAU); g.fill();
  g.save(); g.translate(236, 160); g.rotate(-0.03);
  font(g, 150, BLOCK); g.textAlign = "center"; g.lineJoin = "round"; g.strokeStyle = "#2a1414"; g.lineWidth = 10; g.strokeText("BUG", 0, 0); g.fillStyle = "#d8302a"; g.fillText("BUG", 0, 0);
  g.restore();
}, true);
/** a wall-clock face */
export const clockFaceTex = (key: string, rim: string) => tx(key, 256, 256, (g) => {
  g.fillStyle = rim; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
  g.fillStyle = "#fbf6e8"; g.beginPath(); g.arc(128, 128, 108, 0, TAU); g.fill();
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU, l = k % 5 ? 8 : 20, w = k % 5 ? 2 : 6; g.strokeStyle = "#2a2030"; g.lineWidth = w; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * (100 - l), 128 - Math.cos(a) * (100 - l)); g.stroke(); }
}, true);
/** paper lantern skin: horizontal ribs on a pastel paper (lit from inside: CE emissive) */
export const lanternTex = (key: string, base: string) => tx(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  mottle(g, r, 256, 256, 30, ["#ffffff", shadeHex(base, -0.06)], 10, 40, 0.18);
  for (let y = 8; y < 256; y += 21) { g.fillStyle = rgba(shadeHex(base, -0.25), 0.55); g.fillRect(0, y, 256, 3); }
});
/** a tall window's light on the floor / wall: 2 x 4 panes with soft edges (additive, white) */
export const panePatchTex = () => tx("hlPanePatch", 256, 512, (g) => {
  g.clearRect(0, 0, 256, 512);
  g.filter = "blur(6px)";
  g.fillStyle = "rgba(255,255,255,0.95)";
  for (let cx = 0; cx < 2; cx++) for (let ry = 0; ry < 4; ry++) g.fillRect(18 + cx * 116, 18 + ry * 122, 104, 110);
  g.filter = "none";
}, true);
/** a folding chair's seat / back (pastel steel, a little scuffed) */
export const chairTex = (key: string, base: string) => tx(key, 128, 128, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); speck(g, r, 128, 128, 200, ["#ffffff", shadeHex(base, -0.2)], 1, 3, 0.25);
  g.strokeStyle = rgba(shadeHex(base, -0.3), 0.6); g.lineWidth = 3; g.strokeRect(4, 4, 120, 120);
});
/** a hall poster on the plaster (left of the board): "SUMMER FESTIVAL" style, generic */
export const hallPosterTex = () => tx("hlPoster", 360, 520, (g, r) => {
  g.fillStyle = "#f8c9b8"; g.fillRect(0, 0, 360, 520);
  g.fillStyle = "#fbe7a1"; g.beginPath(); g.arc(180, 200, 120, 0, TAU); g.fill();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.strokeStyle = "#f2a63a"; g.lineWidth = 10; g.beginPath(); g.moveTo(180 + Math.cos(a) * 135, 200 + Math.sin(a) * 135); g.lineTo(180 + Math.cos(a) * 165, 200 + Math.sin(a) * 165); g.stroke(); }
  ctext(g, "FESTIVAL", 180, 410, 56, "#c8402a", 320, BLOCK);
  for (let y = 440; y < 500; y += 18) scrib(g, r, 60, y, 240, "#7a3a2a", 3);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 6; g.strokeRect(3, 3, 354, 514);
});

// ======================================================================================================== COURT
/** blond wood panelling: 1.2 m modules (512 x 1024 px = 1.2 x 2.4 m), a stile + rail frame and two raised panels */
export const ctPanelTex = () => tx("ctPanel", 512, 1024, (g, r) => {
  const base = "#cf9a5c";
  g.fillStyle = shadeHex(base, -0.04); g.fillRect(0, 0, 512, 1024); grain(g, r, 0, 0, 512, 1024, 120, "#6a4420", false, 0.05, 0.12);
  panel(g, r, 44, 50, 424, 300, shadeHex(base, 0.03), 18, false);
  panel(g, r, 44, 400, 424, 574, shadeHex(base, 0.02), 18, false);
  g.fillStyle = "rgba(80,50,20,0.35)"; g.fillRect(0, 0, 4, 1024); g.fillStyle = "rgba(255,240,210,0.2)"; g.fillRect(4, 0, 4, 1024);
});
/** a plain blond panel field (behind the judges: emblem-free), vertical boards */
export const ctBoardsTex = () => tx("ctBoards", 512, 512, (g, r) => {
  const base = "#d2a062";
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 128) { g.fillStyle = jit(r, base, 0.03, 3); g.fillRect(x + 2, 0, 124, 512); grain(g, r, x + 2, 0, 124, 512, 22, "#6a4420", false, 0.05, 0.12); g.fillStyle = "rgba(90,60,30,0.4)"; g.fillRect(x, 0, 2, 512); }
});
/** pale plaster (court) */
export const ctPlasterTex = () => hlPlasterTex("ctPlaster", "#ece6da");
/** the well's carpet: muted sage-grey, fine weave specks */
export const ctCarpetTex = () => tx("ctCarpet", 512, 512, (g, r) => {
  const base = "#9fae9f";
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  speck(g, r, 512, 512, 14000, ["#8a9a8c", "#b4c2b2", "#7e8e82"], 1, 3, 0.45);
  mottle(g, r, 512, 512, 40, ["#aebcae", "#8e9c90"], 30, 90, 0.08);
});
/** blond wood floor planks (court) */
export const ctFloorTex = () => tx("ctFloor", 1024, 1024, (g, r) => {
  const base = "#b9864c";
  g.fillStyle = shadeHex(base, -0.1); g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 64) {
    let x = -Math.floor(r() * 300);
    while (x < 1024) { const L = 200 + r() * 260, col = jit(r, base, 0.07, 4); for (const ox of [0, -1024, 1024]) { if (x + ox > 1024 || x + ox + L < 0) continue; g.fillStyle = col; g.fillRect(x + ox, y, L, 64); grain(g, r, x + ox, y, L, 64, 6, "#6a4420", true, 0.04, 0.1); g.fillStyle = "rgba(90,60,30,0.4)"; g.fillRect(x + ox, y, 2, 64); } x += L; }
    g.fillStyle = "rgba(90,60,30,0.35)"; g.fillRect(0, y, 1024, 2);
  }
});
/** the bench front (6.0 x 1.0 m = 1536 x 256 px): blond wood with long plain raised panels */
export const ctBenchTex = () => tx("ctBench", 1536, 256, (g, r) => {
  const base = "#b97c40";
  g.fillStyle = shadeHex(base, -0.05); g.fillRect(0, 0, 1536, 256); grain(g, r, 0, 0, 1536, 256, 60, "#6a4420", true, 0.05, 0.12);
  for (let k = 0; k < 5; k++) panel(g, r, 22 + k * 302, 30, 286, 196, shadeHex(base, 0.03), 14, true);
});
/** high window: pale daylight sky through frosted glass + muntins (one image per window) */
export const ctWindowTex = () => tx("ctWindow", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#cfe2f2"); gr.addColorStop(1, "#f2f4ee");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  mottle(g, r, 512, 256, 40, ["#ffffff", "#dfeaf2"], 20, 60, 0.3);
  g.fillStyle = "#e9e2d2"; for (let x = 0; x <= 512; x += 128) g.fillRect(x - 6, 0, 12, 256); g.fillRect(0, 122, 512, 12); g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10);
});
/** a calendar year page (0.9 x 0.82 m of the 1.16 m board below the hanger strip = 450 x 410 px): big numerals + a
 *  12-month mini grid */
export const calPageTex = (year: number) => tx("ctCal" + year, 450, 410, (g, r) => {
  g.fillStyle = "#fdfbf4"; g.fillRect(0, 0, 450, 410);
  g.fillStyle = "#c8352a"; g.fillRect(0, 0, 450, 26);
  ctext(g, String(year), 225, 196, 178, "#1e1a22", 420, BLOCK);
  for (let m = 0; m < 12; m++) {
    const cx = 22 + (m % 6) * 70, cy = 228 + Math.floor(m / 6) * 88;
    g.fillStyle = m === 0 || m === 6 ? "#c8352a" : "#5a5560"; g.fillRect(cx, cy, 56, 8);
    for (let d = 0; d < 30; d++) { g.fillStyle = d % 7 === 6 ? "rgba(200,53,42,0.7)" : "rgba(60,55,70,0.55)"; g.fillRect(cx + (d % 7) * 8, cy + 14 + Math.floor(d / 7) * 12, 5, 5); }
  }
  g.strokeStyle = "rgba(60,50,60,0.4)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 447, 407);
  speck(g, r, 450, 410, 200, ["#d8d0c0"], 1, 2, 0.3);
}, true);
/** the calendar's backing board + hanger strip (0.9 x 1.16 m): a dark spiral binding at the top */
export const calBackTex = () => tx("ctCalBack", 450, 580, (g) => {
  g.fillStyle = "#f0ebe0"; g.fillRect(0, 0, 450, 580);
  g.fillStyle = "#3a3440"; g.fillRect(0, 0, 450, 40);
  for (let x = 20; x < 440; x += 22) { g.fillStyle = "#d8d4cc"; g.fillRect(x, 26, 8, 30); }
  // the hanger strip's small plain caption under the binding: the month grid of the bottom page edge is drawn by the pages
  g.fillStyle = "#c8352a"; g.fillRect(0, 548, 450, 32);
}, true);
/** the receipt strip (0.16 m wide; 128 x 2048 px = 3.2 m): register lines, yen amounts as dots + digits, a TOTAL band */
/** fix4 (5): the torn slice of the receipt handed to the exchange's lawyer (0.44 x 0.5 m): a torn top edge, register
 *  lines, a red band with the verdict in three words */
export const sliceTex = () => tx("ctSlice2", 440, 500, (g, r) => {
  g.fillStyle = "#d9d4c4"; g.fillRect(0, 0, 440, 500); g.fillStyle = "#fbfaf4"; g.beginPath(); g.moveTo(0, 500); g.lineTo(0, 22);
  for (let x = 0; x <= 440; x += 22) g.lineTo(x, 8 + ((x / 22) % 2 ? 20 : 0) + r() * 6);
  g.lineTo(440, 500); g.closePath(); g.fill();
  for (let y = 60; y < 150; y += 26) { g.fillStyle = "rgba(50,50,70,0.5)"; g.fillRect(30, y, 150 + r() * 120, 9); g.fillRect(340, y, 70, 9); }
  g.fillStyle = "#c8352a"; g.fillRect(0, 176, 440, 250);
  ctext(g, "EXCHANGE", 220, 262, 78, "#ffffff", 410, BLOCK); ctext(g, "PAYS PART", 220, 372, 78, "#ffe9a8", 410, BLOCK);
  g.fillStyle = "#1e1a22"; g.fillRect(24, 446, 392, 8); g.fillRect(24, 468, 250, 8);
});
export const receiptTex = () => tx("ctReceipt", 128, 2048, (g, r) => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 128, 2048);
  for (let y = 24; y < 2048; y += 22) {
    const w = 30 + r() * 40; g.fillStyle = "rgba(50,50,70,0.55)"; g.fillRect(10, y, w, 5);
    font(g, 13, "Consolas, monospace", "bold"); g.fillStyle = "rgba(40,40,60,0.75)"; g.textAlign = "right"; g.fillText(String(Math.floor(r() * 90000 + 10000)), 120, y + 7);
  }
  for (let y = 300; y < 2048; y += 460) { g.fillStyle = "#fbfaf4"; g.fillRect(0, y, 128, 40); g.fillStyle = "#1e1a22"; g.fillRect(6, y + 6, 116, 4); ctext(g, "TOTAL", 64, y + 34, 22, "#c8352a", 116, BLOCK); }
  g.fillStyle = "rgba(180,170,150,0.35)"; g.fillRect(0, 0, 3, 2048); g.fillRect(125, 0, 3, 2048);
});
/** the evidence tag (0.2 x 0.11 m = 320 x 176 px) */
export const evidTagTex = () => tx("ctEvidTag", 320, 176, (g, r) => {
  g.fillStyle = "#fbf4dc"; g.beginPath(); g.moveTo(44, 0); g.lineTo(320, 0); g.lineTo(320, 176); g.lineTo(44, 176); g.lineTo(0, 124); g.lineTo(0, 52); g.closePath(); g.fill();
  speck(g, r, 320, 176, 300, ["#d8c8a0"], 1, 2, 0.3);
  g.strokeStyle = "#2a2028"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#c8352a"; g.fillRect(60, 14, 246, 50);
  ctext(g, "EVIDENCE", 183, 54, 40, "#fbf4dc", 236, BLOCK);
  ctext(g, "No. 1", 183, 128, 54, "#1e1a22", 236, BLOCK);
  g.fillStyle = "#3a2a1a"; g.beginPath(); g.arc(30, 88, 9, 0, TAU); g.fill();
}, true);
/** leather (judges' tall chairs) */
export const ctLeatherTex = () => tx("ctLeather", 256, 256, (g, r) => {
  const base = "#5a3a2e";
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); mottle(g, r, 256, 256, 40, [shadeHex(base, 0.06), shadeHex(base, -0.05)], 10, 40, 0.4);
  for (let y = 40; y < 256; y += 70) for (let x = 40; x < 256; x += 70) { g.fillStyle = "rgba(255,230,200,0.1)"; g.beginPath(); g.arc(x - 5, y - 5, 18, 0, TAU); g.fill(); g.fillStyle = "#2a1a14"; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
});
/** papers on a table (a stack seen from above) */
export const papersTex = () => tx("ctPapers", 256, 320, (g, r) => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 256, 320);
  for (let y = 30; y < 300; y += 16) scrib(g, r, 24, y, 200 - r() * 60, "rgba(50,50,70,0.55)", 2);
  g.strokeStyle = "rgba(60,60,70,0.4)"; g.lineWidth = 2; g.strokeRect(1, 1, 254, 318);
});
